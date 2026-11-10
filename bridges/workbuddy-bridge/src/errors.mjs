import {redactSecrets} from './rejection-evidence.mjs';
export function upstreamDetails(text){
 let message=redactSecrets(text).split(/\r?\n/)[0].trim();const details={};
 const status=/^(?:HTTP\s*)?([45]\d{2})\b/i.exec(message);if(status)details.upstream_status=Number(status[1]);
 const reset=/将在\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+UTC([+-])(\d{1,2})(?::(\d{2}))?\s*重置/.exec(message);
 if(reset){const iso=`${reset[1]}T${reset[2]}${reset[3]}${reset[4].padStart(2,'0')}:${reset[5]??'00'}`,local=`${reset[1]}T${reset[2]}`;if(Number(reset[4])<=14&&Number(reset[5]??0)<60&&!Number.isNaN(Date.parse(iso))&&!Number.isNaN(Date.parse(local+'Z'))&&new Date(local+'Z').toISOString().startsWith(local))details.reset_at=iso;}
 const id=/\s*[（(]([A-Za-z0-9_.:,;\/ -]*[0-9-][A-Za-z0-9_.:,;\/ -]*)[）)]\s*$/.exec(message);
 if(id){details.request_id=id[1];message=message.slice(0,id.index).trim();}
 return {...details,message:message.slice(0,300)};
}
export class BridgeError extends Error {
  constructor(status,code,message,details={}){super(message);this.status=status;this.code=code;this.details=details;}
}
export function publicError(error,{diagnostic}={}){
  const details=upstreamDetails(diagnostic??error?.message??''),limited=details.upstream_status===429;
  const inherited={},extra=error?.details??{};
  if(Number.isInteger(extra.upstream_status)&&extra.upstream_status>=100&&extra.upstream_status<=599)inherited.upstream_status=extra.upstream_status;
  if(typeof extra.reset_at==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(extra.reset_at)&&!Number.isNaN(Date.parse(extra.reset_at)))inherited.reset_at=extra.reset_at;
  if(typeof extra.request_id==='string')inherited.request_id=redactSecrets(extra.request_id).slice(0,200);
  if(extra.automatic_retry===false)inherited.automatic_retry=false;
  if(error instanceof BridgeError||limited)return {status:limited?429:error.status,body:{error:{type:'bridge_error',code:limited?'upstream_rate_limited':error.code,...inherited,...details,
    ...(limited||['sessions_busy','invalid_decision','invalid_tool_arguments','native_tool_blocked','required_tool_missing','tools_disabled','wrong_pinned_tool','ambiguous_decision','unfinished_turn','missing_native_output','output_budget'].includes(error.code)?{automatic_retry:false}:{})}}};
  if(error?.name==='TimeoutError')return publicError(new BridgeError(504,'timeout',details.message||'WorkBuddy request deadline exceeded'));
  if(error?.name==='AbortError')return publicError(new BridgeError(499,'cancelled',details.message||'Request cancelled'));
  return publicError(new BridgeError(502,'upstream_failure',details.message||'WorkBuddy 上游请求失败，未提供具体原因',details));
}
