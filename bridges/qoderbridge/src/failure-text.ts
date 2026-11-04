export function redactFailure(value: unknown): string {
 let text=value instanceof Error?value.message:String(value??'');
 for(const name of ['QODERCN_PERSONAL_ACCESS_TOKEN','QODER_PERSONAL_ACCESS_TOKEN']){const secret=process.env[name];if(secret)text=text.replaceAll(secret,'[redacted]');}
 return text.replace(/\b(?:cookie|set-cookie)\b["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\r\n]*)/gi,'[redacted]')
  .replace(/Bearer\s+[^\s,;"']+/gi,'Bearer [redacted]').replace(/\bsk-[\w-]+/gi,'[redacted]')
  .replace(/\b(?:access[_-]?token|refresh[_-]?token|api[_-]?key|token|authorization|password|secret)["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;"'}]+)/gi,'[redacted]');
}
export function upstreamText(value:unknown){
 let message=(redactFailure(value).split(/\r?\n/)[0]??'').trim();
 const status=/^(?:HTTP\s*)?([45]\d{2})\b/i.exec(message);
 let reset_at:string|undefined;
 const reset=/将在\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+UTC([+-])(\d{1,2})(?::(\d{2}))?\s*重置/.exec(message);
 if(reset){const iso=`${reset[1]}T${reset[2]}${reset[3]}${reset[4]!.padStart(2,'0')}:${reset[5]??'00'}`,local=`${reset[1]}T${reset[2]}`;if(Number(reset[4])<=14&&Number(reset[5]??0)<60&&!Number.isNaN(Date.parse(iso))&&!Number.isNaN(Date.parse(local+'Z'))&&new Date(local+'Z').toISOString().startsWith(local))reset_at=iso;}
 const id=/\s*[（(]([A-Za-z0-9_.:,;\/ -]*[0-9-][A-Za-z0-9_.:,;\/ -]*)[）)]\s*$/.exec(message);
 if(id)message=message.slice(0,id.index).trim();
 return {message:message.slice(0,300),...(status?{upstream_status:Number(status[1])}:{}),...(reset_at?{reset_at}:{}),...(id?{request_id:id[1]}:{})};
}
