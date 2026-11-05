export function redactSecrets(text,secrets=[]){
 let value=String(text??'');for(const secret of secrets)if(typeof secret==='string'&&secret)value=value.replaceAll(secret,'[redacted]');
 return value
  .replace(/\b(?:cookie|set-cookie)\b["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\r\n]*)/gi,'[redacted]')
  .replace(/\b((?:authorization|x-auth-token|x-api-key)["']?\s*:\s*(?:(?:bearer|basic|token)\s+)?)(?:"[^"]*"|'[^']*'|[^\r\n,;}]+)/gi,'$1[redacted]')
  .replace(/\b(Bearer\s+)[^\s,;"']+/gi,'$1[redacted]')
  .replace(/([?&](?:token|key)=)[^&\s]+/gi,'$1[redacted]')
  .replace(/(--?(?:api[-_]?key|key|token|authorization|password|secret)(?:\s+|=))(?:"[^"]*"|'[^']*'|\S+)/gi,'$1[redacted]')
  .replace(/\b((?:access[_-]?token|refresh[_-]?token|api[_-]?key|token|secret|password)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;&"'}]+)/gi,'$1[redacted]')
  .replace(/\bsk-[\w-]+/gi,'[redacted]');
}
