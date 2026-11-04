import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {launch,RpcProcess,stopProcess,JsonLines} from '../core/process.mjs';
import {normalizeQoder,normalizeWorkbuddy} from '../core/catalog.mjs';
import {WorkerLog} from './worker-log.mjs';
import {providerEnvironmentPatch} from './provider-environment.mjs';
import {componentRequired,SOURCE_DEFINITIONS} from './source-packages.mjs';
import {failureText} from './failure-details.mjs';
import {randomUUID} from 'node:crypto';
import {removeManaged} from './environment-utils.mjs';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const BRIDGES={qoder:join(ROOT,'bridges/qoderbridge'),workbuddy:join(ROOT,'bridges/workbuddy-bridge')};

export class ProviderService {
  constructor(store,node,{components=null,workerScript=join(ROOT,'app/services/provider-worker.mjs'),cwd=ROOT}={}){this.store=store;this.node=node;Object.assign(this,{components,workerScript,cwd});this.workers=new Map();this.refreshing=new Map();this.searchActive=0;this.searchWaiting=[];this.closed=false;}
  searchSlot(signal){
    signal?.throwIfAborted();return new Promise((resolve,reject)=>{const entry={cancel:error=>{this.searchWaiting=this.searchWaiting.filter(item=>item!==entry);signal?.removeEventListener('abort',abort);reject(error);},take:()=>{signal?.removeEventListener('abort',abort);if(this.closed||signal?.aborted){reject(signal?.reason??new Error('模型来源已关闭'));return;}this.searchActive++;let released=false;resolve(()=>{if(released)return;released=true;this.searchActive--;this.searchWaiting.shift()?.take();});}},abort=()=>entry.cancel(signal.reason);if(this.searchActive<2)entry.take();else{this.searchWaiting.push(entry);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();}});
  }
  async init(){if(this.components)for(const {id}of SOURCE_DEFINITIONS)await this.componentReady(id);return this;}
  async componentReady(source){if(!this.components)return true;try{await this.components.environment(source);return true;}catch{await this.store.mutate(s=>{s.catalog[source]={status:'needs-component',models:[],error:componentRequired(source).message,checkedAt:new Date().toISOString()};});return false;}}
  refresh(source){if(this.closed)return Promise.reject(new Error('Model source service closed'));if(!['qoder','workbuddy'].includes(source))return Promise.reject(new Error('Unknown model source'));if(this.refreshing.has(source))return this.refreshing.get(source);const task=this.refreshOne(source).finally(()=>{if(this.refreshing.get(source)===task)this.refreshing.delete(source);});this.refreshing.set(source,task);return task;}
  async refreshOne(source){
    if(!await this.componentReady(source))return [];
    const entry={status:'loading',checkedAt:new Date().toISOString(),models:this.store.state.catalog[source]?.models??[]};await this.store.mutate(s=>{s.catalog[source]=entry;});
    const dir=join(this.store.root,'providers',source);await mkdir(dir,{recursive:true});
    try{
      const result=await this.runWorker(source,'catalog',{},90000);const normalize=source==='qoder'?normalizeQoder:normalizeWorkbuddy;
      const models=result.models.map(normalize).filter(Boolean);if(!models.length)throw new Error('模型源返回了空目录');
      await this.store.mutate(s=>{s.catalog[source]={status:'ready',checkedAt:new Date().toISOString(),models};});return models;
    }catch(e){const error=new Error(failureText(e)||'模型来源刷新失败，未提供具体原因');await this.store.mutate(s=>{s.catalog[source]={...entry,status:'error',error:error.message};});throw error;}
  }
  async runWorker(source,action,payload={},timeout=90000,{signal}={}){if(this.closed)throw new Error('Model source service closed');if(!['qoder','workbuddy'].includes(source)||!['catalog','search'].includes(action))throw new Error('未知模型来源操作');signal?.throwIfAborted();const componentEnv=this.components?await this.components.environment(source):{AWB_SOURCE_PACKAGE_DIR:undefined};signal?.throwIfAborted();const release=action==='search'?await this.searchSlot(signal):()=>{};let owned=false;try{signal?.throwIfAborted();if(this.closed)throw new Error('模型来源已关闭');return await new Promise((resolve,reject)=>{
    const dir=action==='search'?join(this.store.root,'providers',source,'search',randomUUID()):join(this.store.root,'providers',source),child=launch(this.node.command,[...this.node.args,this.workerScript,source,action],{cwd:this.cwd,env:{...this.node.env,...providerEnvironmentPatch(),...componentEnv,AWB_PROVIDER_DIR:dir}});owned=true;this.workers.set(child.pid,child);
    let result,settled=false;const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);},abort=()=>{void stopProcess(child);finish(signal.reason??new Error('搜索已取消'));};
    const timer=setTimeout(()=>{void stopProcess(child);finish(new Error(action==='search'?'原生搜索超时':'模型目录查询超时，请检查登录和网络'));},timeout);
    const lines=new JsonLines();child.stdout.on('data',b=>lines.push(b));child.stdout.on('end',()=>lines.end());lines.on('message',m=>{if(m.type==='result')result=m;});lines.on('fault',e=>{void stopProcess(child);finish(e);});child.stdin.on('error',e=>finish(e));
    const log=action==='search'?{write(){},async close(){}}:new WorkerLog(join(dir,'catalog-worker.log'));child.stderr.on('data',b=>log.write(b));child.stderr.on('end',()=>{void log.close();});child.stdin.end(JSON.stringify(payload));
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    child.on('error',e=>{this.workers.delete(child.pid);finish(e);});child.on('close',async()=>{this.workers.delete(child.pid);if(action==='search')await removeManaged(join(this.store.root,'providers',source,'search'),dir).catch(()=>{});release();result?.ok?finish(null,result.value):finish(Object.assign(new Error(result?.error??'模型源进程退出，未返回可用结果'),result?.details??{}));});
  });}finally{if(!owned)release();}}
  get(key){for(const c of Object.values(this.store.state.catalog))for(const m of c.models??[])if(m.key===key)return m;throw new Error('请先刷新模型源并选择模型');}
  async close(){this.closed=true;for(const entry of [...this.searchWaiting])entry.cancel(new Error('模型来源已关闭'));await Promise.all([...this.workers.values()].map(stopProcess));await Promise.allSettled([...this.refreshing.values()]);}
}
