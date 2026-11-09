import {mediaTurnLimits} from './media-capabilities.mjs';
export function interjectCapability(session){
  if(session.runtimeId==='dsh'||session.runtimeId==='codex'&&session.selection?.modelKey!=='native')return {steer:true,reason:null};
  return {steer:false,reason:session.runtimeId==='kimi'?'Kimi ACP 未提供受支持的插话接口，消息可排队到本轮结束后发送。':session.runtimeId==='codex'?'原生 Codex exec 是一次性进程，消息可排队到本轮结束后发送。':'Antigravity 是一次性进程，消息可排队到本轮结束后发送。'};
}
export function queuedBatch(session,capabilities){
  const limits=mediaTurnLimits(session.runtimeId),count=Math.min(limits.maxCount,capabilities?.turn?.maxCount??Infinity),bytes=Math.min(limits.maxTotalBytes,capabilities?.turn?.maxTotalBytes??Infinity);
  const rows=[];let size=0,attachments=0,chars=0;
  for(const row of session.queue??[]){
    const added=(row.attachments??[]).reduce((n,a)=>n+a.size,0);
    if(rows.length&&(attachments+row.attachments.length>count||size+added>bytes||chars+row.text.length+2>500000))break;
    rows.push(row);size+=added;attachments+=row.attachments.length;chars+=row.text.length+2;
  }
  return rows;
}
