export function failureText(value,limit=1200,secrets=[]){
 let text=value;for(let depth=0;depth<5&&typeof text!=='string';depth++)text=typeof text==='number'?String(text):text?.message??text?.text??text?.error??text?.cause??text?.reason??text?.kind??'';if(typeof text!=='string')text='';
 for(const secret of secrets)if(typeof secret==='string'&&secret)text=text.replaceAll(secret,'[redacted]');
 return text.replace(/\b(?:cookie|set-cookie)\b["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\r\n]*)/gi,'[redacted]')
  .replace(/Bearer\s+[^\s,;"']+|\bsk-[\w-]+/gi,'[redacted]')
  .replace(/\b(?:access[_-]?token|refresh[_-]?token|api[_-]?key|token|authorization|password|secret)["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;"'}]+)/gi,'[redacted]')
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').slice(0,limit);
}
export function failureDetails(error={},status,secrets=[]){
 const message=failureText(error.upstream_message??error.message??error.text,1200,secrets)||'上游请求失败，未提供具体原因';
 const result={code:failureText(error.code??'upstream_failure',100,secrets),message};
 const upstreamStatus=error.upstream_status??(status>=400?status:undefined);
 if(Number.isInteger(upstreamStatus)&&upstreamStatus>=100&&upstreamStatus<=599)result.upstream_status=upstreamStatus;
 if(typeof error.reset_at==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(error.reset_at)&&!Number.isNaN(Date.parse(error.reset_at)))result.reset_at=error.reset_at;
 if(typeof error.request_id==='string')result.request_id=failureText(error.request_id,200,secrets);
 if(error.automatic_retry===false)result.automatic_retry=false;
 return result;
}
export function runtimeReason(value,fallback='原生后端未完成本轮任务，未提供具体原因。'){
 const message=failureText(value)||fallback;
 return {kind:'runtime',...(value?.code?{code:failureText(value.code,100)}:{}),message};
}
export function failureValue(value,secrets=[]){
 if(typeof value==='string')return failureText(value,1200,secrets);if(Array.isArray(value))return value.map(item=>failureValue(item,secrets));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,/^(?:authorization|cookie|set-cookie|api[_-]?key|access[_-]?token|refresh[_-]?token|token|password|secret)$/i.test(key)?'[redacted]':failureValue(item,secrets)]));
 return value;
}
