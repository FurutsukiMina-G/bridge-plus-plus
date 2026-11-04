import {mkdir,appendFile,stat,rename,rm} from 'node:fs/promises';
import {dirname} from 'node:path';
import {StringDecoder} from 'node:string_decoder';
export const redactWorkerText=text=>String(text).replace(/Bearer\s+[^\s"']+|sk-[\w-]+/gi,'[redacted]').replace(/((?:access[_-]?token|refresh[_-]?token|api[_-]?key|authorization|password)["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi,'$1[redacted]').replace(/([?&]token=)[^&\s]+/gi,'$1[redacted]');
/** One current and one rotated log; line buffering keeps split credentials redactable. */
export class WorkerLog {
  constructor(file,{maxBytes=512*1024}={}){Object.assign(this,{file,maxBytes});this.decoder=new StringDecoder('utf8');this.buffer='';this.queue=Promise.resolve();}
  write(chunk){this.buffer+=Buffer.isBuffer(chunk)?this.decoder.write(chunk):chunk;let at;while((at=this.buffer.indexOf('\n'))>=0){this.line(this.buffer.slice(0,at));this.buffer=this.buffer.slice(at+1);}if(this.buffer.length>65536){this.line(this.buffer);this.buffer='';}}
  line(text){const value=redactWorkerText(text)+'\n';this.queue=this.queue.then(async()=>{await mkdir(dirname(this.file),{recursive:true});const size=await stat(this.file).then(s=>s.size,()=>0);if(size+Buffer.byteLength(value)>this.maxBytes){await rm(this.file+'.1',{force:true});await rename(this.file,this.file+'.1').catch(e=>{if(e.code!=='ENOENT')throw e;});}await appendFile(this.file,value.slice(-this.maxBytes));}).catch(()=>{});}
  async close(){this.buffer+=this.decoder.end();if(this.buffer){this.line(this.buffer);this.buffer='';}await this.queue;}
}
