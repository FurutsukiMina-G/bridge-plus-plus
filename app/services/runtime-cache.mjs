import {mkdir,readFile,rename,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {hydrateRuntimePermissionCache,successfulPermissionProbes} from './runtime-permissions.mjs';
import {hydrateRuntimeMediaCache,successfulMediaProbes} from './media-capabilities.mjs';

export const RUNTIME_CACHE_SCHEMA=1;
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
export class RuntimeCache {
  constructor({userData,appVersion,now=Date.now,log=error=>console.error('写入运行环境缓存失败：'+error.message)}={}){Object.assign(this,{userData,appVersion,now,log});this.file=join(userData,'runtime-cache.json');}
  async load(){
    let data=null;try{data=JSON.parse(await readFile(this.file,'utf8'));}catch{}
    if(data?.schema!==RUNTIME_CACHE_SCHEMA||data?.appVersion!==this.appVersion){hydrateRuntimePermissionCache();hydrateRuntimeMediaCache();return [];}
    const probes=object(data.probes),permissions={},media={};
    for(const [key,value]of Object.entries(probes)){if(value?.permissions&&typeof value.permissions==='object')permissions[key]=value.permissions;if(value?.media&&typeof value.media==='object')media[key]=value.media;}
    hydrateRuntimePermissionCache(permissions);hydrateRuntimeMediaCache(media);return Array.isArray(data.runtimes)?data.runtimes:[];
  }
  async save(runtimes){
    const temporary=this.file+'.'+randomUUID()+'.tmp';
    try{
      const probes={};
      for(const [key,value]of successfulPermissionProbes())probes[key]={...probes[key],permissions:value};
      for(const [key,value]of successfulMediaProbes())probes[key]={...probes[key],media:value};
      const data={schema:RUNTIME_CACHE_SCHEMA,appVersion:this.appVersion,savedAt:new Date(this.now()).toISOString(),runtimes,probes};
      await mkdir(this.userData,{recursive:true});await writeFile(temporary,JSON.stringify(data),{mode:0o600});await rename(temporary,this.file);
    }catch(error){await rm(temporary,{force:true}).catch(()=>{});this.log(error);}
  }
}
