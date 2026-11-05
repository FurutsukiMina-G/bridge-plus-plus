import {mkdir,readFile,writeFile,rename,rm,appendFile,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {serviceDefinition,validateServiceSettings} from './model-service-catalog.mjs';
import {ensureServiceDirectoryProtected} from './model-service-system.mjs';
async function replaceFile(tmp,file){for(let n=0;;n++)try{await rename(tmp,file);return;}catch(error){if(n>=5||!['EPERM','EBUSY','EACCES'].includes(error.code))throw error;await new Promise(r=>setTimeout(r,25*2**n));}}
export class ModelServiceStore {
  constructor(userData,id,{protect=ensureServiceDirectoryProtected}={}){this.definition=serviceDefinition(id);this.root=resolve(userData,'model-services',id);this.protect=protect;this.queue=Promise.resolve();}
  async open(){await mkdir(this.root,{recursive:true});await this.protect(this.root);this.settings=validateServiceSettings(await this.read('settings.json',{port:this.definition.port,defaultProfile:'dsh',autostart:false}));await this.initialize('settings.json',this.settings);this.key=await this.secret();return this;}
  async read(name,fallback=null){for(let n=0;;n++)try{return JSON.parse(await readFile(join(this.root,name),'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;if(!(error instanceof SyntaxError)||n>=4)throw new Error(`模型服务文件 ${name} 无法读取`);await new Promise(r=>setTimeout(r,25*2**n));}}
  async installIfMissing(name,text){try{await writeFile(join(this.root,name),text,{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}}
  async initialize(name,value){await this.installIfMissing(name,JSON.stringify(value,null,2));}
  async write(name,value){const task=this.queue.then(async()=>{const file=join(this.root,name),tmp=file+'.'+randomUUID()+'.tmp';try{await writeFile(tmp,JSON.stringify(value,null,2),{mode:0o600,flag:'wx'});await replaceFile(tmp,file);}finally{await rm(tmp,{force:true}).catch(()=>{});}});this.queue=task.catch(()=>{});return task;}
  async secret(){const file=join(this.root,'service-key');await this.installIfMissing('service-key',randomBytes(32).toString('hex')+'\n');for(let n=0;;n++){let key;try{key=(await readFile(file,'utf8')).trim();}catch{throw new Error('无法读取有效的本服务密钥');}if(/^[a-f0-9]{64}$/.test(key))return key;if(n>=4)throw new Error('本服务密钥文件无效，未使用空密钥');await new Promise(r=>setTimeout(r,25*2**n));}}
  async regenerate(){const key=randomBytes(32).toString('hex'),file=join(this.root,'service-key'),tmp=file+'.'+randomUUID()+'.tmp';try{await writeFile(tmp,key+'\n',{flag:'wx',mode:0o600});await replaceFile(tmp,file);}finally{await rm(tmp,{force:true}).catch(()=>{});}this.key=key;await this.write('dsh.json',null);for(const target of ['kimi','codex'])await this.write('connection-'+target+'.json',null);return key;}
  async configure(patch){const previous=this.settings.port;this.settings=validateServiceSettings({...this.settings,...patch});await this.write('settings.json',this.settings);if(this.settings.port!==previous){await this.write('dsh.json',null);for(const target of ['kimi','codex'])await this.write('connection-'+target+'.json',null);}}
  async requestLog(row){const task=this.queue.then(async()=>{const file=join(this.root,'requests.jsonl'),info=await stat(file).catch(()=>null);if(info?.size>1024*1024){await rm(file+'.1',{force:true});await rename(file,file+'.1');}await appendFile(file,JSON.stringify(row)+'\n',{mode:0o600});});this.queue=task.catch(()=>{});return task;}
}
