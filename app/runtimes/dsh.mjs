import {randomUUID} from 'node:crypto';
import {dshEfforts} from '../services/dsh-host.mjs';
import {RuntimeLifecycle} from '../core/lifecycle.mjs';
import {readFile} from 'node:fs/promises';
import {DSH_PERMISSION_PRESETS,permissionCatalog} from '../services/runtime-permissions.mjs';
import {runtimeReason,failureText} from '../services/failure-details.mjs';
export function reconcileDshContent(type,full,streamed,attemptId){if(full===streamed)return null;if(full.startsWith(streamed))return {type,text:full.slice(streamed.length),attemptId};return {type:'content-replace',channel:type,text:full,attemptId};}
export function dshEvent(event){const d=event.data??{};
  if(event.type==='assistant/message'){const message=d.message??d;return {type:'assistant-message',content:message.content??[],data:message};}
  if(event.type==='tool/call')return {type:'tool-start',name:d.name??d.call?.name??d.toolCall?.name,toolId:d.callId??d.id??d.call?.id,data:d};
  if(event.type==='tool/result')return {type:'tool-end',toolId:d.id??d.message?.toolCallId,data:d};
  if(event.type==='approval/asked')return {type:'approval',approvalId:`dsh:${d.id??d.requestId??event.seq}`,name:d.toolName??d.tool??'DSH approval',data:d,choices:['native']};
  if(event.type==='approval/decided')return {type:'approval-resolved',approvalId:d.id||d.requestId||d.approvalId?`dsh:${d.id??d.requestId??d.approvalId}`:undefined,data:d};
  if(event.type==='turn/end'){const kind=d.reason?.kind??d.reason??d.cause?.kind??d.cause,cancelled=['cancelled','aborted','interrupted'].includes(kind),message=[...new Set([failureText(d.reason),failureText(d.cause)].filter(Boolean))].join('；');return {type:'turn-end',status:kind==='completed'?'completed':cancelled?'interrupted':'failed',...kind==='completed'?{}:{reason:cancelled?{kind:'cancelled',message:message||'DSH 本轮已取消。'}:runtimeReason({message,code:d.reason?.code??d.cause?.code},'DSH 本轮未成功结束，未返回具体原因。')}};}
  if(event.type==='step/end'&&d.usage)return {type:'usage',data:d.usage};
  if(event.type==='workspace/changes')return {type:'diff',data:d};
  if(event.type==='todo/write')return {type:'plan',data:{...d,entries:Array.isArray(d.todos)?d.todos:[]}};
  return {type:'native-event',name:event.type,data:d};
}
export class DshAdapter extends RuntimeLifecycle {
  constructor(options){super(options);this.lastSeq=-1;this.onHostClosed=error=>{this.ready=false;this.stopStream?.();this.stopStream=null;this.approvalStream?.stop();this.approvalStream=null;void this.enqueue(async()=>{if(!this.closed&&this.running){this.running=false;const reason=runtimeReason(error,'DSH 原生后端已退出，请重试以恢复会话。');await this.emit({type:'error',text:reason.message});await this.emit({type:'turn-end',status:'failed',reason});}});};this.host.on?.('closed',this.onHostClosed);}
  async start(){this.checkOpen();await this.host.ready();this.checkOpen();const provider=await this.host.configure(this.model,{...this.variant,contextWindow:this.session.selection.contextBudget??this.variant.contextWindow},this.endpoint,this.session.id);this.checkOpen();
    if(!this.session.nativeId){const result=await this.host.rpc('session/create',{request:{cwd:this.project.path}});await this.saveNative(result.sessionId);this.nativeId=result.sessionId;}else this.nativeId=this.session.nativeId;
    this.checkOpen();const effort=this.session.selection.reasoning?Object.entries(dshEfforts(this.variant.efforts)).find(([,v])=>v===this.session.selection.reasoning)?.[0]:null;
    await this.host.rpc('session/selectModel',{request:{sessionId:this.nativeId,provider,model:this.variant.id,...effort?{reasoningEffort:effort}:{}}});
    if(this.permissionMode!=null){
      const preset=DSH_PERMISSION_PRESETS[this.permissionMode],label=permissionCatalog({id:'dsh'}).modes.find(m=>m.id===this.permissionMode)?.label??String(this.permissionMode);
      try{
        if(!preset)throw new Error('未知权限预设');
        const result=await this.host.rpc('commands/execute',{agentId:this.nativeId,line:'/permission '+preset,submittedAttachments:[]});
        if(result?.result?.kind!=='success')throw new Error(failureText(result?.result?.text)||'原生命令未成功');
        const sessions=await this.host.rpc('session/list',{_request:{}}),current=sessions.items?.find(s=>s.sessionId===this.nativeId)?.projections?.values?.permissions?.currentValue;
        if(current!=null&&current!==preset)throw new Error('原生返回的权限预设与所选不一致');
        if(current==null)await this.emit({type:'notice',source:'permissions',text:`DSH 已执行“${label}”切换，但未返回当前权限字段，未能核实。`});
      }catch(error){throw new Error(`无法应用 DSH“${label}”权限模式，已停止本轮，未发送任务：${failureText(error)}`);}
    }
    this.checkOpen();await this.host.rpc('session/rename',{request:{sessionId:this.nativeId,title:this.session.title}});this.checkOpen();
    // On resume skip events already in the durable local journal rather than replaying history into the current turn.
    const list=await this.host.rpc('session/list',{_request:{}});const item=list.items?.find(s=>s.sessionId===this.nativeId);this.lastSeq=item?.projections?.asOfSeq??-1;
    try{this.stopStream=await this.host.follow(this.nativeId,frame=>this.enqueue(()=>this.closed?undefined:this.frame(frame)),async error=>{this.stopStream?.();this.stopStream=null;if(!this.running||this.closed)return;await this.emit({type:'notice',text:'原生实时连接中断，正在从已保存事件继续同步。'});this.poll();});}catch{this.checkOpen();await this.emit({type:'notice',text:'当前 DSH 实时接口不可用，已使用原生事件同步；完整界面可实时查看。'});}if(this.closed){this.stopStream?.();this.stopStream=null;}this.checkOpen();this.ready=true;
  }
  async content(text,attachments=[]){return [...(text?[{type:'text',text}]:[]),...await Promise.all(attachments.map(async a=>{if(a.kind!=='image')throw new Error('DSH 未核实支持此附件');return {type:'image',mediaType:a.mime,data:(await readFile(a.path)).toString('base64'),name:a.name};}))];}
  async steer(text,attachments=[],requestId=randomUUID()){
    this.checkOpen();if(!this.running)throw new Error('DSH 原生轮次已经结束');
    const content=await this.content(text,attachments);this.steers??=new Map();this.steers.set(requestId,{requestId,itemId:null});
    try{await this.host.rpc('session/prompt',{request:{sessionId:this.nativeId,requestId,mode:'steer',clientTimeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,content}});}
    catch(error){if(!this.steers.has(requestId)||this.steers.get(requestId)?.itemId)return {};if(error.rpcRejected){this.steers.delete(requestId);throw error;}error.nativeAdmissionUnknown=true;throw error;}
    return {};
  }
  async prompt(text,attachments=[]){await this.ensureStarted();this.checkOpen();
    this.steers??=new Map((this.session.pendingSteers??[]).map(row=>[row.id,{requestId:row.id,itemId:null}]));
    if(!this.approvalStream&&this.host.followApprovals){try{this.approvalStream=await this.host.followApprovals(this.nativeId,event=>this.enqueue(()=>this.emit(event)),(id,choice)=>this.enqueue(()=>this.emit({type:'approval-resolved',approvalId:id,...choice?{choice}:{}})),error=>this.enqueue(async()=>{this.approvalStream?.stop();this.approvalStream=null;await this.emit({type:'notice',text:'DSH 审批连接中断，请在完整工具界面处理：'+error.message});}));}catch(error){await this.emit({type:'notice',text:'DSH 审批接口不可用，请在完整工具界面处理：'+error.message});}this.checkOpen();}
    const content=await this.content(text,attachments);
    this.running=true;await this.host.rpc('session/prompt',{request:{sessionId:this.nativeId,requestId:randomUUID(),mode:'queue',clientTimeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,content}});if(!this.stopStream)this.poll();}
  async frame(value){if(value.type==='snapshot')return;if(value.type==='event'){await this.handleEvent(value.event);return;}if(value.type==='assistant-stream'){const frame=value.frame;if(frame.type==='start'){this.currentAttemptId=frame.attemptId??randomUUID();this.streamedText='';this.streamedThinking='';return;}if(frame.type==='chunk'){const chunk=frame.chunk??{};let text=chunk.delta??chunk.text??'';if(typeof text!=='string')text=text.text??'';if(['text-delta','text_delta','text'].includes(chunk.type)&&text){this.streamedText=(this.streamedText??'')+text;await this.emit({type:'text',text,attemptId:this.currentAttemptId});}else if(['thinking-delta','reasoning-delta','thinking_delta','thinking','reasoning'].includes(chunk.type)&&text){this.streamedThinking=(this.streamedThinking??'')+text;await this.emit({type:'thinking',text,attemptId:this.currentAttemptId});}else await this.emit({type:'native-event',name:'assistant-stream',data:frame});}}}
  async handleEvent(event){
    if(event.seq<=this.lastSeq)return;this.lastSeq=event.seq;if(!this.running)return;
    if(event.type==='agent/inbox/spliced')for(const item of event.data?.inserted??[]){
      const id=item.source?.rpcId,row=this.steers?.get(id);if(!row)continue;row.itemId=item.id;
      await this.emit({type:'steer-state',steerId:id,state:event.data.target==='next-turn'?'carried':'delivered',...(event.data.target==='next-turn'?{reason:'由 DSH 原生 inbox 携带到下一轮，Bridge++ 不重复发送。'}:{})});
    }
    if(event.type==='user/message'){
      const id=event.data?.source?.rpcId;if(this.steers?.has(id)){this.steers.delete(id);await this.emit({type:'steer-consumed',steerId:id});}
    }
    const projected=dshEvent(event);
    if(projected.type==='approval'&&this.approvalStream)return;
    if(projected.type==='assistant-message'){
      for(const p of projected.content)if(p.type==='image'){
        try{
          if(p.attachment){
            if(!Number.isFinite(p.attachment.bytes)||p.attachment.bytes<0||p.attachment.bytes>8*1024*1024)throw new Error('DSH 图片引用超过本地大小上限');
            const value=await this.host.rpc('session/attachment',{request:{sessionId:this.nativeId,attachmentId:p.attachment.attachmentId}});
            await this.emit({type:'media-output',mime:value.attachment.mediaType,data:value.data,origin:{runtimeId:'dsh',itemId:String(event.seq)}});
          }else if(p.data)await this.emit({type:'media-output',mime:p.mediaType,data:p.data,name:p.name,origin:{runtimeId:'dsh',itemId:String(event.seq)}});
        }catch(error){await this.emit({type:'notice',text:'DSH 输出图片无法读取：'+error.message});}
      }
      for(const type of ['text','thinking']){
        const full=projected.content.filter(p=>type==='text'?p.type==='text':['thinking','reasoning'].includes(p.type)).map(p=>p.text??p.thinking??'').join('');
        const update=reconcileDshContent(type,full,type==='text'?this.streamedText??'':this.streamedThinking??'',this.currentAttemptId);
        if(update)await this.emit(update);
      }
      this.streamedText='';this.streamedThinking='';if(projected.data.usage)await this.emit({type:'usage',data:projected.data.usage});
    }else{
      if(projected.type==='turn-end'){
        if(projected.status==='completed'&&this.steers?.size){
          projected.nativeCarry=[...this.steers.keys()];
          for(const id of this.steers.keys())await this.emit({type:'steer-state',steerId:id,state:'carried',reason:'本轮结束前尚未使用，由 DSH 原生 inbox 在下一轮接续；Bridge++ 不重复发送。'});
        }else this.running=false;
      }
      await this.emit(projected);
    }
  }
  poll(){clearTimeout(this.timer);if(!this.running)return;this.timer=setTimeout(()=>{void this.read().catch(async e=>{this.running=false;await this.emit({type:'error',text:e.message});await this.emit({type:'turn-end',status:'failed'});});},900);}
  async read(){if(!this.running)return;const list=await this.host.rpc('session/list',{_request:{}});const row=list.items?.find(s=>s.sessionId===this.nativeId);if(!row)throw new Error('Native DSH session disappeared');const seq=row.projections?.asOfSeq??-1;if(seq>this.lastSeq){
      const pages=[];let beforeSeq;do{const page=await this.host.rpc('session/page',{request:{address:{kind:'session',sessionId:this.nativeId},throughSeq:seq,maxMessages:120,...beforeSeq!==undefined?{beforeSeq}:{}}});pages.unshift(page.records??[]);const first=(page.records??[])[0],event=first?.event??first;if(!page.hasMore||!event||event.seq<=this.lastSeq)break;beforeSeq=event.seq;}while(pages.length<100);
      for(const record of pages.flat())await this.handleEvent(record.event??record);
    }this.poll();}
  async approve(id,choice,answer){if(!this.approvalStream)throw new Error('DSH 审批实时连接不可用，请在完整工具界面处理');await this.approvalStream.approve(id,choice,answer);await this.emit({type:'approval-resolved',approvalId:id,choice});}
  async cancel(){await this.host.rpc('session/cancel',{request:{sessionId:this.nativeId}});}
  async retractSteers(){
    if(!this.steers?.size)return [];
    await this.cancel();const removed=[];
    const list=await this.host.rpc('session/list',{_request:{}}),inbox=list.items?.find(s=>s.sessionId===this.nativeId)?.projections?.values?.inbox;
    for(const [id,row]of this.steers){
      const pending=[...(inbox?.['next-step']??[]),...(inbox?.['next-turn']??[])].find(m=>m.source?.rpcId===id);
      const itemId=pending?.id??row.itemId;if(!itemId)continue;
      try{await this.host.rpc('session/updateQueue',{request:{sessionId:this.nativeId,itemId,action:{kind:'remove'}}});this.steers.delete(id);removed.push(id);}catch{/* Already consumed or not confirmed: never resend an ambiguous admission. */}
    }
    return removed;
  }
  async close(){this.closed=true;clearTimeout(this.timer);this.stopStream?.();this.stopStream=null;this.approvalStream?.stop();this.approvalStream=null;this.host.off?.('closed',this.onHostClosed);const running=this.running;this.running=false;this.ready=false;if(running&&this.nativeId&&this.host.origin)await this.cancel().catch(()=>{});}
}
