import {launch,JsonLines,stopProcess} from '../core/process.mjs';
import {codexExecPermissionArgs} from '../services/runtime-permissions.mjs';
import {CodexRolloutMedia} from '../services/codex-rollout-media.mjs';
import {failureText,failureValue,runtimeReason} from '../services/failure-details.mjs';

export function codexExecArgs({session,project,permissionMode=session.permissionMode,runtime},attachments=[]){
  if(session.selection.modelKey!=='native')throw new Error('exec 仅用于原生 Codex 选择');
  const args=['exec','--skip-git-repo-check','-C',project.path,...codexExecPermissionArgs(permissionMode,runtime)];
  // resume does not accept -C/-s/--approve-for-me: these belong to exec.
  if(session.nativeId)args.push('resume',session.nativeId);
  args.push('--json');
  if(session.selection.nativeModel)args.push('-m',session.selection.nativeModel);
  if(session.selection.reasoning)args.push('-c',`model_reasoning_effort=${JSON.stringify(session.selection.reasoning)}`);
  for(const a of attachments){if(a.kind!=='image'||typeof a.path!=='string'||!a.path)throw new Error('Codex exec 仅核实支持本地图片附件');args.push('-i',a.path);}
  args.push('-');return args;
}

export function codexExecEvent(m){
  if(m.type==='thread.started')return {type:'native-session',nativeId:m.thread_id};
  if(m.type==='turn.completed')return {type:'turn-end',status:'completed',data:m.usage};
  if(m.type==='turn.failed')return {type:'turn-end',status:'failed',data:failureValue(m.error),reason:runtimeReason(m.error,'Codex exec 本轮失败，未返回具体原因。')};
  if(m.type==='error'){const text=failureText(m.message??m.error?.message??'Codex exec error');return {type:/^Reconnecting\.{3}/.test(text)?'notice':'error',text,data:failureValue(m)};}
  if(['item.started','item.updated','item.completed'].includes(m.type)){
    const i=m.item??{},done=m.type==='item.completed';
    if(i.type==='error')return {type:'notice',source:'native-warning',text:i.message??'Codex exec item error',data:i};
    if(i.type==='agent_message'||i.type==='reasoning')return {type:done?(i.type==='reasoning'?'thinking':'text'):'native-event',text:i.text??'',itemId:i.id,name:m.type,data:done?undefined:i};
    if(i.type==='todo_list')return {type:'plan',data:{plan:(i.items??[]).map(x=>({step:x.text,status:x.completed?'completed':'pending'}))}};
    if(['command_execution','file_change','mcp_tool_call','collab_tool_call','web_search','image_generation','imageGeneration'].includes(i.type))return {type:done?'tool-end':'tool-start',toolId:i.id,name:i.type,data:i};
  }
  return {type:'native-event',name:m.type??'event',data:m};
}

export class CodexExecAdapter {
  constructor(options){Object.assign(this,options);this.closed=false;this.active=null;this.warnings=new Set();this.stop=options.stopNativeProcess??stopProcess;this.rollout=options.rolloutMedia??new CodexRolloutMedia();}
  async start(){if(this.closed)throw new Error('Codex exec connection closed');this.ready=true;}
  async ensureStarted(){await this.start();}
  async prompt(text,attachments=[]){
    await this.ensureStarted();if(this.active&&!this.active.reported)throw new Error('Codex 当前仍在执行');
    if(this.active)await this.stop(this.active.child);
    if(this.closed)throw new Error('Codex exec connection closed');
    const args=codexExecArgs(this,attachments);let checkpoint;
    try{checkpoint=await this.rollout.checkpoint(this.session.nativeId);}catch(error){await this.emit({type:'notice',text:'Codex 图片日志检查不可用：'+error.message});}
    if(this.closed)throw new Error('Codex exec connection closed');
    const child=(this.launchProcess??launch)(this.runtime.executable,args,{cwd:this.project.path});
    const turn={child,checkpoint,mediaIds:new Set(),queue:Promise.resolve(),reported:false,terminal:null,cancelled:false,stderr:'',hasError:false};this.active=turn;this.running=true;
    const enqueue=fn=>{turn.queue=turn.queue.then(async()=>{if(this.active===turn&&!this.closed)await fn();}).catch(async error=>{
      if(!this.closed&&!turn.reported){turn.hasError=true;await this.emit({type:'error',text:error.message}).catch(()=>{});await this.stop(child);await this.finish(turn,'failed');}
    });};
    const lines=new JsonLines(16*1024*1024);
    child.stdout.on('data',b=>lines.push(b));child.stdout.on('end',()=>lines.end());
    lines.on('message',m=>enqueue(()=>this.message(m,turn)));
    lines.on('text',text=>enqueue(()=>this.emit({type:'notice',text})));
    lines.on('fault',error=>enqueue(async()=>{throw error;}));
    child.stderr.setEncoding?.('utf8');child.stderr.on('data',s=>{turn.stderr=(turn.stderr+s).slice(-12000);});
    const failed=error=>enqueue(async()=>{throw error;});child.on('error',failed);child.stdin.on('error',failed);
    child.on('close',(code,signal)=>enqueue(async()=>{
      if(turn.reported)return;
      const status=turn.cancelled?'interrupted':code===0&&!turn.hasError&&turn.terminal==='completed'?'completed':'failed';
      if(status!=='completed')turn.reason=turn.cancelled?{kind:'cancelled',message:'Codex 本轮已取消。'}:runtimeReason(`${turn.reason?.message??'Codex exec 未成功完成本轮。'}（退出码 ${code??'未知'}${signal?'，信号 '+signal:''}）${turn.stderr?'；stderr：'+failureText(turn.stderr,12000).slice(-800):''}`);
      if(!turn.cancelled&&turn.checkpoint)try{await this.rollout.read(this.session.nativeId,turn.checkpoint,async e=>{if(!turn.mediaIds.has(e.origin?.itemId))await this.emit(e);});}catch(error){await this.emit({type:'notice',text:'Codex 生成图片读取未完成：'+error.message});}
      const writerConflict=/already has an active writer|thread-store conflict/i.test(turn.stderr);
      if(!turn.cancelled&&(!turn.terminal||code!==0)&&(!turn.hasError||writerConflict)){
        const reason=writerConflict?'这个原生线程正被另一个 Codex 进程占用（通常是 Codex 桌面版正打开着它）。请在桌面版切到别的线程或退出桌面版后再发；Bridge++ 不会新建替代线程。':/no rollout found for thread id/.test(turn.stderr)?'原生 CLI 未找到该线程日志。请在用户原生客户端检查恢复/索引，Bridge++ 不会创建替代线程。':/UnknownIssuer|stage=Tls|invalid peer certificate/.test(turn.stderr)?'原生连接的 TLS 证书验证失败。':'原生进程未返回成功终态。';
        await this.emit({type:'error',text:'Codex exec 未成功完成本轮；已保留原生会话。'+reason,data:{code,signal}});
      }
      await this.finish(turn,status);
    }));
    child.stdin.end(text);
  }
  async message(m,turn){
    if(turn.reported)return;
    const event=codexExecEvent(m);
    if(event.source==='native-warning'){
      if(this.warnings.has(event.text))return;
      this.warnings.add(event.text);
    }
    if(event.type==='native-session'){
      if(typeof event.nativeId!=='string'||!event.nativeId)throw new Error('Codex exec 未返回有效 thread id');
      if(this.session.nativeId&&this.session.nativeId!==event.nativeId)throw new Error('Codex resume 返回了不同的会话身份，已停止；不会创建替代会话。');
      await this.saveNative(event.nativeId);this.session.nativeId=event.nativeId;
    }
    const i=m.item;
    if(m.type==='item.completed'&&i?.type==='command_execution'&&i.aggregated_output)await this.emit({type:'tool-output',toolId:i.id,text:i.aggregated_output});
    if(m.type==='item.completed'&&['image_generation','imageGeneration'].includes(i?.type)){
      const origin={runtimeId:'codex',itemId:i.id,tool:'imageGeneration'};
      if(i.result){await this.emit({type:'media-output',data:i.result,mime:'image/png',origin});if(i.id)turn.mediaIds.add(i.id);}
      else if(i.saved_path??i.savedPath){await this.emit({type:'media-output',path:i.saved_path??i.savedPath,origin});if(i.id)turn.mediaIds.add(i.id);}
      else await this.emit({type:'notice',text:'Codex 图片生成事件未提供可显示的图片数据或本地路径。'});
    }
    if(event.type==='error'){turn.hasError=true;turn.reason=runtimeReason(event.text);}
    if(event.type==='turn-end'){
      turn.terminal=event.status;
      if(event.reason)turn.reason=event.reason;
      if(m.usage)await this.emit({type:'usage',data:m.usage});
      if(m.error?.message){turn.hasError=true;await this.emit({type:'error',text:failureText(m.error.message)});}
      return; // Process close is the boundary: flush all output before the next turn.
    }
    await this.emit(event);
  }
  async finish(turn,status){if(turn.reported)return;turn.reported=true;if(this.active===turn)this.running=false;await this.emit({type:'turn-end',status,...status==='completed'?{}:{reason:turn.reason??runtimeReason(null)}});}
  async approve(){throw new Error('原生 Codex exec 不支持交互审批，请为下一轮选择已核实的授权模式');}
  async cancel(){const t=this.active;if(!t||t.reported)return;t.cancelled=true;await this.stop(t.child);await t.queue;if(!this.closed&&!t.reported)await this.finish(t,'interrupted');}
  async close(){this.closed=true;this.running=false;this.ready=false;if(this.active)await this.stop(this.active.child);}
}
