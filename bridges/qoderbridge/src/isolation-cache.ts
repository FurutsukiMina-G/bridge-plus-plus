import {createHash,randomUUID} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,readFile,writeFile,rename,lstat,rm} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveQoderWorkerRuntimePath} from '@qodercn-ai/qodercn-agent-sdk';

const queues=new Map<string,Promise<void>>();
const ids=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=4096&&v.every(s=>typeof s==='string'&&s.length>0&&s.length<=512&&!/[\x00-\x1f\x7f]/.test(s));
export class IsolationCache{
  private constructor(readonly file:string,readonly identity:string,readonly declaredCliVersion:string,readonly settingsSha256:string,readonly plugins:string[],readonly skills:string[],readonly hit:boolean,public observedCliVersion:string|null){}
  static async open(directory:string,settings:string,cliPath?:string,testIdentity?:{version:string;fingerprint:string}){
    let version:string,fingerprint:string;
    if(testIdentity){version=testIdentity.version;fingerprint=testIdentity.fingerprint;}
    else{
      const sdkDir=dirname(fileURLToPath(import.meta.resolve('@qodercn-ai/qodercn-agent-sdk'))),manifest=JSON.parse(await readFile(join(sdkDir,'runtime-manifest.json'),'utf8'));
      version=String(manifest.qoderCliVersion??'unknown');
      const runtime=cliPath??resolveQoderWorkerRuntimePath(),hash=createHash('sha256');for await(const chunk of createReadStream(runtime,{highWaterMark:256*1024}))hash.update(chunk);fingerprint=hash.digest('hex');
    }
    const settingsHash=createHash('sha256').update(settings).digest('hex'),identity=createHash('sha256').update(JSON.stringify({version,fingerprint,settingsHash})).digest('hex');
    const dir=join(directory,'qoder-isolation');await mkdir(dir,{recursive:true});if((await lstat(dir)).isSymbolicLink())throw new Error('Isolation cache directory is a symbolic link');
    const file=join(dir,identity+'.json');let plugins:string[]=[],skills:string[]=[],hit=false,observed:string|null=null;
    try{const info=await lstat(file);if(info.isSymbolicLink()||info.size>1024*1024)throw new Error('Invalid isolation cache file');const data=JSON.parse(await readFile(file,'utf8'));if(data.schema!==1||data.identity!==identity||data.declared_cli_version!==version||data.settings_sha256!==settingsHash||!ids(data.plugins)||!ids(data.skills)||data.observed_cli_version!==null&&data.observed_cli_version!==undefined&&!ids([data.observed_cli_version]))throw new Error('Invalid isolation cache');plugins=data.plugins;skills=data.skills;hit=true;observed=typeof data.observed_cli_version==='string'?data.observed_cli_version:null;}catch{/* A missing/invalid cache never skips runtime verification. */}
    return new IsolationCache(file,identity,version,settingsHash,plugins,skills,hit,observed);
  }
  async remember(plugins:string[],skills:string[],observedVersion?:string){
    if(!ids(plugins)||!ids(skills)||observedVersion!==undefined&&!ids([observedVersion]))throw new Error('Invalid isolation identifiers');
    const previous=queues.get(this.file)??Promise.resolve(),next=previous.catch(()=>{}).then(async()=>{
      const p=new Set([...this.plugins,...plugins]),s=new Set([...this.skills,...skills]);
      try{const info=await lstat(this.file);if(info.isSymbolicLink())throw new Error('Isolation cache file is a symbolic link');if(info.size<=1024*1024){const old=JSON.parse(await readFile(this.file,'utf8'));if(old.schema===1&&old.identity===this.identity&&old.declared_cli_version===this.declaredCliVersion&&old.settings_sha256===this.settingsSha256&&ids(old.plugins)&&ids(old.skills)){old.plugins.forEach((id:string)=>p.add(id));old.skills.forEach((id:string)=>s.add(id));}}}catch(error){if((error as Error).message==='Isolation cache file is a symbolic link')throw error;}
      const observed=observedVersion??this.observedCliVersion;
      const temp=this.file+'.'+randomUUID()+'.tmp';try{await writeFile(temp,JSON.stringify({schema:1,identity:this.identity,declared_cli_version:this.declaredCliVersion,observed_cli_version:observed,settings_sha256:this.settingsSha256,plugins:[...p],skills:[...s]}),{flag:'wx',mode:0o600});await rename(temp,this.file);this.plugins.splice(0,this.plugins.length,...p);this.skills.splice(0,this.skills.length,...s);this.observedCliVersion=observed;}finally{await rm(temp,{force:true}).catch(()=>{});}
    });queues.set(this.file,next);try{await next;}finally{if(queues.get(this.file)===next)queues.delete(this.file);}
  }
}
