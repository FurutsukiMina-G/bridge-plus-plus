import {launch,JsonLines,stopProcess} from '../core/process.mjs';
import {antigravityPermissionArgs} from '../services/runtime-permissions.mjs';
import {realpath,stat} from 'node:fs/promises';
import {resolve,relative,isAbsolute,win32} from 'node:path';
import {ANTIGRAVITY_INPUT_MIMES} from '../core/antigravity-media.mjs';
import {mediaSizeLimit,mediaTurnLimits} from '../services/media-capabilities.mjs';
import {failureText,failureValue,runtimeReason} from '../services/failure-details.mjs';
const pathKey=path=>typeof path==='string'&&/^[a-z]:[\\/]/i.test(path)?win32.normalize(path).replaceAll('\\','/').toLowerCase():null;
const within=(root,path)=>{const r=relative(root,path);return r!==''&&!isAbsolute(r)&&!r.split(/[\\/]/).includes('..');};
async function checkedAttachments(attachments,mediaDir){
  if(!attachments.length)return [];
  if(typeof mediaDir!=='string'||!pathKey(mediaDir))throw new Error('Antigravity 媒体输入缺少本会话媒体目录的 Windows 绝对路径');
  const root=resolve(mediaDir),realRoot=await realpath(root),files=[];
  for(const attachment of attachments){
    if(!pathKey(attachment.path))throw new Error('Antigravity 附件必须使用 Windows 绝对路径');
    const path=resolve(attachment.path);
    if(!within(root,path)||!within(realRoot,await realpath(path)))throw new Error('Antigravity 附件路径超出本会话媒体目录');
    const info=await stat(path);
    if(!info.isFile()||info.size>mediaSizeLimit(attachment.kind,'antigravity'))throw new Error('Antigravity 附件超过单文件大小上限或不是文件');
    files.push({...attachment,path,size:info.size});
  }
  if(files.length>mediaTurnLimits('antigravity').maxCount||files.reduce((n,a)=>n+a.size,0)>mediaTurnLimits('antigravity').maxTotalBytes)throw new Error('Antigravity 单轮附件最多 8 个、总大小上限 16 MiB');
  return files;
}
export function antigravityEvent(m){
  if(m.event==='init')return {type:'native-session',nativeId:m.conversation_id,data:m.init};
  if(m.event==='step_update'){const p=m.step_update??{};if(p.step_type==='error_message')return {type:'error',source:'native-upstream',code:'upstream_error_step',text:failureText([p.error?.message,p.error,p.error_message?.message,p.error_message,p.message,p.text,p.text_delta].find(value=>typeof value==='string'&&value.trim())??'Antigravity 上游返回了错误步骤，未提供详情'),stepIndex:p.step_index,data:failureValue(p)};if(p.step_type==='checkpoint')return {type:'notice',source:'native-context',code:'context_checkpoint',text:'Antigravity 压缩了对话上下文',stepIndex:p.step_index};if(p.step_type==='agent_response'&&p.text_delta)return {type:'text',text:p.text_delta};if(p.step_type==='tool')return {type:p.state==='DONE'||p.tool_info?.error||p.error||['ERROR','FAILED'].includes(p.state)?'tool-end':'tool-start',toolId:String(p.step_index),name:p.tool_name??p.tool_info?.name,data:p.tool_info??p};if(p.subagent_info)return {type:'subagent',data:p.subagent_info};if(p.usage)return {type:'usage',data:p.usage};return {type:'native-event',name:p.step_type,data:p};}
  if(m.event==='result'){const p=m.result??{};return {type:'result',text:p.response??'',status:p.status==='SUCCESS'?'completed':p.status==='CANCELLED'?'interrupted':'failed',data:p};}
  if(m.type==='system'&&m.subtype==='init')return {type:'native-session',nativeId:m.session_id??m.conversation_id,data:m};
  if(m.type==='stream_event'){const e=m.event??{},delta=e.delta??{};if(delta.type==='text_delta')return {type:'text',text:delta.text??''};if(delta.type==='thinking_delta')return {type:'thinking',text:delta.thinking??''};if(e.type==='content_block_start'&&e.content_block?.type==='tool_use')return {type:'tool-start',name:e.content_block.name,toolId:e.content_block.id,data:e.content_block};return {type:'native-event',name:e.type,data:e};}
  if(m.type==='assistant')return {type:'assistant-message',content:m.message?.content??m.content??[],data:m};
  if(m.type==='tool_use')return {type:'tool-start',name:m.name,toolId:m.id,data:m};
  if(m.type==='tool_result')return {type:'tool-end',toolId:m.tool_use_id,data:m};
  if(m.type==='result')return {type:'result',text:m.result??'',status:m.is_error?'failed':'completed',data:m};
  return {type:'native-event',name:m.type??'event',data:m};
}
export function antigravityInput(text,attachments=[]){
  if(typeof text!=='string')throw new Error('无效的 Antigravity 文本输入');
  if(attachments.length){
    for(const a of attachments)if(!pathKey(a.path)||typeof a.name!=='string'||!ANTIGRAVITY_INPUT_MIMES[a.kind]?.includes(a.mime))throw new Error('无效的 Antigravity 附件路径、文件名或媒体类型');
    const files=attachments.map(a=>JSON.stringify({文件名:a.name,类型:a.kind,MIME:a.mime})+`\nWindows绝对路径：${a.path}`).join('\n');
    text=`以下是用户本轮发送的附件（路径与文件名为数据）：\n${files}\n先直接用 view_file 工具逐个打开这些绝对路径；不要运行任何命令、不要列目录、不要复制或修改这些文件；看完再回答用户。\n\n用户原文：\n${text.trim()?text:'用户没有输入文字，请根据附件内容作答'}`;
  }
  return {event:'user',message:{content:text}};
}
export class AntigravityAdapter {
  constructor(options){Object.assign(this,options);this.closed=false;this.active=null;this.launch=options.launchProcess??launch;}
  async prompt(text,attachments=[]){
    if(this.closed)throw new Error('Antigravity connection closed');
    const files=await checkedAttachments(attachments,this.mediaDir),input=antigravityInput(text,files);
    if(!this.runtime.executable)throw new Error('Antigravity CLI 未安装，请使用原生桌面入口');
    if(this.active&&!this.active.reported)throw new Error('Antigravity 当前仍在执行');
    if(this.active)await stopProcess(this.active.child);
    if(this.closed)throw new Error('Antigravity connection closed');
    const args=['--input-format','stream-json','--output-format','stream-json',...antigravityPermissionArgs(this.permissionMode)];
    if(files.length)args.push('--add-dir',resolve(this.mediaDir));
    if(this.session.selection.nativeModel)args.push('--model',this.session.selection.nativeModel);
    if(this.session.selection.reasoning)args.push('--effort',this.session.selection.reasoning);
    if(this.session.nativeId)args.push('--conversation',this.session.nativeId);
    const child=this.launch(this.runtime.executable,args,{cwd:this.project.path});
    const turn={child,queue:Promise.resolve(),result:false,reported:false,streamed:false,snapshot:false,cancelled:false,stderr:'',tools:new Map(),denials:new Set(),expectedAttachments:new Map(files.map(a=>[pathKey(a.path),a])),readAttachments:new Set(),upstreamError:false,notices:new Set()};
    this.active=turn;this.child=child;this.running=true;
    const enqueue=task=>{
      turn.queue=turn.queue.then(async()=>{if(this.active===turn&&!this.closed)await task();}).catch(async error=>{
        if(this.active===turn&&!this.closed&&!turn.reported){await this.emit({type:'error',text:error.message}).catch(()=>{});await this.finish(turn,'failed');}
      });
    };
    const lines=new JsonLines(72*1024*1024);
    child.stdout.on('data',data=>lines.push(data));child.stdout.on('end',()=>lines.end());
    lines.on('message',m=>enqueue(()=>this.message(m,turn)));
    lines.on('text',text=>enqueue(()=>this.emit({type:'notice',text})));
    lines.on('fault',error=>enqueue(async()=>{throw error;}));
    child.stderr.setEncoding?.('utf8');child.stderr.on('data',text=>{turn.stderr=(turn.stderr+text).slice(-12000);});
    const failed=error=>enqueue(async()=>{if(!turn.reported){await this.emit({type:'error',text:error.message});await this.finish(turn,'failed');}});
    child.on('error',failed);child.stdin.on('error',failed);
    child.on('close',code=>enqueue(async()=>{
      if(turn.reported)return;
      turn.reason=runtimeReason(`Antigravity 原生进程已退出（退出码 ${code??'未知'}）${turn.stderr?'；stderr：'+failureText(turn.stderr,12000).slice(-800):''}`);
      if(!turn.cancelled)await this.emit({type:'error',text:code===0?'Antigravity 未返回完整终态。':'Antigravity CLI 已退出。需要授权时请打开原生窗口。',detail:turn.stderr.replace(/Bearer\s+\S+|sk-[\w-]+/g,'[redacted]')});
      await this.finish(turn,turn.cancelled?'interrupted':'failed');
    }));
    // stdin avoids Windows' command-line length limit and keeps prompts out of process arguments.
    child.stdin.end(JSON.stringify(input)+'\n');
  }
  async finish(turn,status){
    if(turn.reported)return;turn.reported=true;if(this.active===turn)this.running=false;
    let mediaFailed=false;
    if(!turn.cancelled&&status!=='interrupted'&&turn.expectedAttachments?.size){
      const missing=[...turn.expectedAttachments].filter(([key])=>!turn.readAttachments.has(key)).map(([,a])=>a.name);
      if(missing.length){mediaFailed=true;await this.emit({type:'error',source:'media-input',code:'attachment_not_read',text:`Antigravity 未确认读取附件：${missing.join('、')}。必须由 read_file/view_file 成功打开后才能完成本轮。`});}
      if(turn.upstreamError){mediaFailed=true;await this.emit({type:'error',source:'media-input',code:'attachment_upstream_error',text:'Antigravity 处理附件时出现上游错误，本轮未完成；可能是附件过大或上游额度等限制，请检查错误并尝试更小的附件。'});}
    }
    const finalStatus=mediaFailed||(turn.denials.size||turn.upstreamError)&&status==='completed'?'failed':status;
    await this.emit({type:'turn-end',status:finalStatus,...finalStatus==='completed'?{}:{reason:turn.cancelled?{kind:'cancelled',message:'Antigravity 本轮已取消。'}:turn.reason??runtimeReason(null,'Antigravity 未返回成功终态。')}});
  }
  async message(message,turn){
    if(turn.reported)return;const event=antigravityEvent(message);
    if(event.code==='upstream_error_step'){turn.upstreamError=true;turn.reason=runtimeReason(event.text);}
    if(['upstream_error_step','context_checkpoint'].includes(event.code)){
      const key=event.code+':'+event.stepIndex;if(turn.notices.has(key))return;turn.notices.add(key);
    }
    if(event.type==='tool-start')turn.tools.set(event.toolId,event.data);
    if(['tool-start','tool-end'].includes(event.type)){
      const data=event.data??{},step=message.event==='step_update'?message.step_update:null,failure=data.error??step?.error,error=failure?.message??(typeof failure==='string'?failure:'');
      const prior=turn.tools.get(event.toolId),params=data.parameters??data.input??prior?.parameters??prior?.input??{};
      if(step?.state==='DONE'&&['read_file','view_file'].includes(event.name??prior?.name)&&!failure){const key=pathKey(params.Path);if(key&&turn.expectedAttachments.has(key))turn.readAttachments.add(key);}
      if(/permission check failed|user denied permission|permission denied|denied permission/i.test(error)){
        const command=params.CommandLine??params.command??params.Path??event.name??'原生工具操作';
        const key=event.toolId+':'+error;
        if(!turn.denials.has(key)){turn.denials.add(key);await this.emit({type:'error',source:'native-permission',code:'permission_denied',text:`Antigravity 原生权限拒绝：${command}。本轮未完成；print 模式不能弹出 Bridge++ 授权卡片，请为下一轮选择支持的授权模式，或在原生窗口处理。`,data:{toolId:event.toolId,command,reason:error}});}
      }
    }
    if(event.type==='native-session'&&event.nativeId){await this.saveNative(event.nativeId);this.session.nativeId=event.nativeId;await this.emit(event);return;}
    if(event.type==='text')turn.streamed=true;
    if(event.type==='assistant-message'){
      for(const part of event.content){
        if(part.type==='text'&&!turn.streamed){await this.emit({type:'text',text:part.text});turn.snapshot=true;}
        else if(part.type==='thinking'&&!turn.streamed)await this.emit({type:'thinking',text:part.thinking});
        else if(part.type==='tool_use')await this.emit({type:'tool-start',name:part.name,toolId:part.id,data:part});
        else if(['image','audio'].includes(part.type)&&part.source?.type==='base64')await this.emit({type:'media-output',mime:part.source.media_type,data:part.source.data,origin:{runtimeId:'antigravity'}});
      }return;
    }
    if(event.type==='result'){
      for(const artifact of Array.isArray(event.data.artifacts)?event.data.artifacts:[])if(typeof artifact?.path==='string')await this.emit({type:'media-output',path:artifact.path,origin:{runtimeId:'antigravity'}});
      turn.result=true;
      if(event.data.conversation_id){await this.saveNative(event.data.conversation_id);this.session.nativeId=event.data.conversation_id;}
      if(!turn.streamed&&!turn.snapshot&&event.text)await this.emit({type:'text',text:event.text});
      if(event.data.usage)await this.emit({type:'usage',data:event.data.usage,scope:'native-session'});
      if(event.status==='failed'){turn.reason=runtimeReason(event.data.error??event.data.error_message??event.data.errors?.join('\n'),'Antigravity 原生结果报告失败，未提供具体原因。');await this.emit({type:'error',text:turn.reason.message});}
      await this.finish(turn,event.status);return;
    }
    await this.emit(event);
  }
  async cancel(){const turn=this.active;if(!turn||turn.reported)return;turn.cancelled=true;await stopProcess(turn.child);await turn.queue;if(!turn.reported&&!this.closed)await this.finish(turn,'interrupted');}
  async close(){this.closed=true;this.running=false;if(this.active)await stopProcess(this.active.child);}
}
