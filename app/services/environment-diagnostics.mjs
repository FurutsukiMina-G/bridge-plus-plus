import {mkdir,appendFile,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {redactWorkerText} from './worker-log.mjs';

export function environmentStderr(text){
 const value=String(text??'').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'')
  .replace(/https?:\/\/[^\s<>"']+/gi,value=>{try{const url=new URL(value);url.username='';url.password='';if(url.search)url.search='?[redacted]';url.hash='';return url.href;}catch{return '[redacted URL]';}})
  .replace(/((?:_authToken|_auth|cookie|set-cookie|secret|token|key|authorization|api[-_]?key|password)["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;"'}]+)/gi,'$1[redacted]');
 return redactWorkerText(value).replace(/\b[a-f0-9]{48,64}\b/gi,'[redacted]').replace(/[\x00-\x1f\x7f]+/g,' ').trim().slice(-1600);
}
export async function kimiInstallFailure(userData,code,stderr){
 const details=environmentStderr(stderr),message=`Kimi 依赖安装程序退出码：${typeof code==='number'?code:'未知'}；${details||'npm 未返回诊断输出'}；当前内置/旧受管版本未切换`,dir=join(userData,'environments/logs'),file=join(dir,'kimi-install.log'),line=JSON.stringify({at:new Date().toISOString(),code:typeof code==='number'?code:null,message})+'\n';
 try{await mkdir(dir,{recursive:true,mode:0o700});const size=await stat(file).then(info=>info.size,()=>0);if(size+Buffer.byteLength(line)>64*1024)await writeFile(file,line,{mode:0o600});else await appendFile(file,line,{mode:0o600});}catch{return new Error(message+'；诊断日志无法写入');}
 return new Error(message);
}
