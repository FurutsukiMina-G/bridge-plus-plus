import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {launch,RpcProcess,stopProcess,JsonLines} from '../core/process.mjs';
import {normalizeQoder,normalizeWorkbuddy,normalizeQoderAccount,normalizeWorkbuddyAccount} from '../core/catalog.mjs';
import {WorkerLog} from './worker-log.mjs';
import {providerEnvironmentPatch} from './provider-environment.mjs';
import {componentRequired,SOURCE_DEFINITIONS} from './source-packages.mjs';
import {failureText} from './failure-details.mjs';
import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {removeManaged} from './environment-utils.mjs';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const BRIDGES={qoder:join(ROOT,'bridges/qoderbridge'),workbuddy:join(ROOT,'bridges/workbuddy-bridge')};

// Name-level diff of a refreshed catalog. There is no baseline for the first
// fill of an empty directory, and unchanged directories stay silent.
export function catalogDiff(previous,next){
  const names=list=>(Array.isArray(list)?list:[]).map(model=>typeof model?.name==='string'&&model.name?model.name:model?.id).filter(name=>typeof name==='string'&&name);
  const before=names(previous),after=names(next);
  if(!before.length)return null;
  const added=[...new Set(after.filter(name=>!before.includes(name)))],removed=[...new Set(before.filter(name=>!after.includes(name)))];
  return added.length||removed.length?{added,removed}:null;
}
// A WorkBuddy balance read is usually the first outbound connection of its worker process. With a cold
// resolver cache the name lookup of the billing host can exceed undici's fixed 10 s connect window and
// the request surfaces as the opaque "fetch failed"; a repeat attempt moments later succeeds. Classify
// that family here so the worker can retry transient failures and the stored account row carries a
// Chinese reason instead of the raw Node text.
const ACCOUNT_NETWORK_CODE=/^(?:UND_ERR_[A-Z_]+|ERR_SSL[A-Z0-9_]*|ECONN[A-Z]*|ENOTFOUND|EAI_[A-Z]+|EHOSTUNREACH|ENET[A-Z]+|ETIMEDOUT|EPROTO|CERT_[A-Z_]+|[A-Z_]*CERT[A-Z_]*|SELF_SIGNED[A-Z_]*|UNABLE_TO_[A-Z_]+|DEPTH_ZERO[A-Z_]*)$/;
const ACCOUNT_TRANSIENT=new Set(['UND_ERR_CONNECT_TIMEOUT','UND_ERR_SOCKET','ECONNABORTED','ECONNREFUSED','ECONNRESET','ENETDOWN','ENETUNREACH','ENOTFOUND','EHOSTUNREACH','EAI_AGAIN','EAI_FAIL','ETIMEDOUT']);
function accountNetworkCodes(error){const codes=[];for(let e=error,depth=0;e&&depth<5;e=e.cause,depth++)if(typeof e.code==='string'&&e.code&&ACCOUNT_NETWORK_CODE.test(e.code)&&!codes.includes(e.code))codes.push(e.code);return codes;}
export function isTransientAccountNetworkError(error){return accountNetworkCodes(error).some(code=>ACCOUNT_TRANSIENT.has(code));}
export function accountNetworkReason(code){
  if(/^(?:UND_ERR_CONNECT_TIMEOUT|ETIMEDOUT)$/.test(code))return '连接超时';
  if(code==='ECONNREFUSED')return '连接被拒绝';
  if(/^(?:ECONNRESET|ECONNABORTED|UND_ERR_SOCKET)$/.test(code))return '连接被中断';
  if(/^(?:ENOTFOUND|EAI_AGAIN|EAI_FAIL)$/.test(code))return '域名解析失败';
  if(/^(?:EHOSTUNREACH|ENETUNREACH|ENETDOWN)$/.test(code))return '本机网络不可达';
  if(/^(?:UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT)$/.test(code))return '服务器响应超时';
  if(/CERT|ISSUER|SELF_SIGNED|ALTNAME|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER/i.test(code))return '证书校验失败';
  if(/^(?:ERR_SSL|EPROTO)/.test(code))return 'TLS 握手失败';
  return '网络异常';
}
export function workbuddyAccountError(error){
  const codes=accountNetworkCodes(error);
  if(!codes.length&&String(error?.message??'').toLowerCase()!=='fetch failed')return failureText(error)||'积分查询失败';
  const code=codes.find(value=>ACCOUNT_TRANSIENT.has(value))??codes[0]??'UND_ERR_NETWORK';
  return `无法连接 WorkBuddy 积分接口：${accountNetworkReason(code)}（${code}）`;
}

export class ProviderService extends EventEmitter {
  constructor(store,node,{components=null,workerScript=join(ROOT,'app/services/provider-worker.mjs'),cwd=ROOT}={}){super();this.store=store;this.node=node;Object.assign(this,{components,workerScript,cwd});this.workers=new Map();this.refreshing=new Map();this.accounting=new Map();this.searchActive=0;this.searchWaiting=[];this.closed=false;}
  searchSlot(signal){
    signal?.throwIfAborted();return new Promise((resolve,reject)=>{const entry={cancel:error=>{this.searchWaiting=this.searchWaiting.filter(item=>item!==entry);signal?.removeEventListener('abort',abort);reject(error);},take:()=>{signal?.removeEventListener('abort',abort);if(this.closed||signal?.aborted){reject(signal?.reason??new Error('模型来源已关闭'));return;}this.searchActive++;let released=false;resolve(()=>{if(released)return;released=true;this.searchActive--;this.searchWaiting.shift()?.take();});}},abort=()=>entry.cancel(signal.reason);if(this.searchActive<2)entry.take();else{this.searchWaiting.push(entry);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();}});
  }
  async init(){if(this.components)for(const {id}of SOURCE_DEFINITIONS)await this.componentReady(id);return this;}
  async componentReady(source){if(!this.components)return true;try{await this.components.environment(source);return true;}catch{await this.store.mutate(s=>{s.catalog[source]={status:'needs-component',models:[],error:componentRequired(source).message,checkedAt:new Date().toISOString()};});return false;}}
  // A background refresh (the periodic re-read behind the balance) shows no loading
  // state and, when it fails, leaves the listed catalog and its status untouched.
  refresh(source,{background=false}={}){if(this.closed)return Promise.reject(new Error('Model source service closed'));if(!['qoder','workbuddy'].includes(source))return Promise.reject(new Error('Unknown model source'));if(this.refreshing.has(source))return this.refreshing.get(source);const task=this.refreshOne(source,{background}).finally(()=>{if(this.refreshing.get(source)===task)this.refreshing.delete(source);});this.refreshing.set(source,task);return task;}
  async refreshOne(source,{background=false}={}){
    if(!await this.componentReady(source))return [];
    const prior=this.store.state.catalog[source],entry={status:'loading',checkedAt:new Date().toISOString(),models:prior?.models??[],...(prior?.account?{account:prior.account}:{})};if(!background)await this.store.mutate(s=>{s.catalog[source]=entry;});
    const dir=join(this.store.root,'providers',source);await mkdir(dir,{recursive:true});
    try{
      const result=await this.runWorker(source,'catalog',{},90000),normalize=source==='qoder'?normalizeQoder:normalizeWorkbuddy,fetchedAt=new Date().toISOString();
      const models=result.models.map(raw=>normalize(raw,fetchedAt)).filter(Boolean);if(!models.length)throw new Error('模型源返回了空目录');
      // The same worker session already read the balance; a failure there only
      // annotates the account and never discards the listed catalog.
      const account=this.settleAccount(source,result,fetchedAt)??entry.account;
      await this.store.mutate(s=>{s.catalog[source]={status:'ready',checkedAt:new Date().toISOString(),models,...account?{account}:{}};});
      const diff=catalogDiff(entry.models,models);if(diff)this.emit('catalog-diff',{source,...diff});
      return models;
    }catch(e){const error=new Error(failureText(e)||'模型来源刷新失败，未提供具体原因');if(!background)await this.store.mutate(s=>{s.catalog[source]={...entry,status:'error',error:error.message};});throw error;}
  }
  settleAccount(source,result,fetchedAt){
    const normalized=source==='qoder'?normalizeQoderAccount(result?.account,fetchedAt):normalizeWorkbuddyAccount(result?.account,fetchedAt);
    const prior=this.store.state.catalog?.[source]?.account??null,reason=result?.accountError??null;
    if(!reason)return normalized??prior;
    // A failed read keeps the last known numbers and only records why; because the
    // stored timestamp stays old, the next non-forced read tries again.
    return {...(prior??{balance:null,unit:'积分',parts:[],exceeded:null,checkin:null,fetchedAt}),...(normalized?.checkin?{checkin:normalized.checkin}:{}),unit:'积分',error:reason};
  }
  async storeAccount(source,account){
    await this.store.mutate(s=>{s.catalog[source]={...(s.catalog[source]??{status:'ready',models:[]}),account};});
    return account;
  }
  // A cached account is reused for five minutes unless the caller forces a read.
  // Concurrent callers share one worker instead of starting a second runtime.
  account(source,{force=false}={}){
    if(this.closed)return Promise.reject(new Error('模型来源服务已关闭'));
    if(!['qoder','workbuddy'].includes(source))return Promise.reject(new Error('Unknown model source'));
    const current=this.store.state.catalog?.[source]?.account,fresh=current&&!current.error&&Date.now()-(Date.parse(current.fetchedAt||'')||0)<300000;
    if(!force&&fresh)return Promise.resolve(current);
    if(this.accounting.has(source))return this.accounting.get(source);
    const task=this.readAccount(source).finally(()=>{if(this.accounting.get(source)===task)this.accounting.delete(source);});
    this.accounting.set(source,task);return task;
  }
  // Prices, promotions and free periods change while Bridge++ runs, and the catalog
  // was otherwise only read at startup. Once a catalog is listed, every balance read
  // re-reads it too: the same worker session returns the balance anyway, so the
  // price tags are as fresh as the balance (menu opened, turn finished).
  async readAccount(source){
    const listed=this.store.state.catalog?.[source];
    if(listed?.models?.length&&['ready','error'].includes(listed.status)){
      try{await this.refresh(source,{background:true});return this.store.state.catalog?.[source]?.account??null;}
      catch{/* The listed catalog stays as it was; read the balance alone. */}
    }
    return this.queryAccount(source);
  }
  async queryAccount(source){
    if(!await this.componentReady(source))return this.store.state.catalog?.[source]?.account??null;
    const fetchedAt=new Date().toISOString();
    let result;
    try{result=await this.runWorker(source,'account',{},150000);}
    catch(e){const account=this.settleAccount(source,{accountError:source==='workbuddy'?workbuddyAccountError(e):failureText(e)||'积分查询失败'},fetchedAt);return account?this.storeAccount(source,account):null;}
    const account=this.settleAccount(source,result,fetchedAt);
    return account?this.storeAccount(source,account):null;
  }
  async runWorker(source,action,payload={},timeout=90000,{signal}={}){if(this.closed)throw new Error('Model source service closed');if(!['qoder','workbuddy'].includes(source)||!['catalog','search','account'].includes(action))throw new Error('未知模型来源操作');signal?.throwIfAborted();const componentEnv=this.components?await this.components.environment(source):{AWB_SOURCE_PACKAGE_DIR:undefined};signal?.throwIfAborted();const release=action==='search'?await this.searchSlot(signal):()=>{};let owned=false;try{signal?.throwIfAborted();if(this.closed)throw new Error('模型来源已关闭');return await new Promise((resolve,reject)=>{
    const dir=action==='search'?join(this.store.root,'providers',source,'search',randomUUID()):join(this.store.root,'providers',source),child=launch(this.node.command,[...this.node.args,this.workerScript,source,action],{cwd:this.cwd,env:{...this.node.env,...providerEnvironmentPatch(),...componentEnv,AWB_PROVIDER_DIR:dir}});owned=true;this.workers.set(child.pid,child);
    let result,settled=false;const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);},abort=()=>{void stopProcess(child);finish(signal.reason??new Error('搜索已取消'));};
    const timer=setTimeout(()=>{void stopProcess(child);finish(new Error(action==='search'?'原生搜索超时':action==='account'?'积分查询超时，请检查登录和网络':'模型目录查询超时，请检查登录和网络'));},timeout);
    const lines=new JsonLines();child.stdout.on('data',b=>lines.push(b));child.stdout.on('end',()=>lines.end());lines.on('message',m=>{if(m.type==='result')result=m;});lines.on('fault',e=>{void stopProcess(child);finish(e);});child.stdin.on('error',e=>finish(e));
    const log=action==='search'?{write(){},async close(){}}:new WorkerLog(join(dir,'catalog-worker.log'));child.stderr.on('data',b=>log.write(b));child.stderr.on('end',()=>{void log.close();});child.stdin.end(JSON.stringify(payload));
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    child.on('error',e=>{this.workers.delete(child.pid);finish(e);});child.on('close',async()=>{this.workers.delete(child.pid);if(action==='search')await removeManaged(join(this.store.root,'providers',source,'search'),dir).catch(()=>{});release();result?.ok?finish(null,result.value):finish(Object.assign(new Error(result?.error??'模型源进程退出，未返回可用结果'),result?.details??{}));});
  });}finally{if(!owned)release();}}
  get(key){for(const c of Object.values(this.store.state.catalog))for(const m of c.models??[])if(m.key===key)return m;throw new Error('请先刷新模型源并选择模型');}
  async close(){this.closed=true;for(const entry of [...this.searchWaiting])entry.cancel(new Error('模型来源已关闭'));await Promise.all([...this.workers.values()].map(stopProcess));await Promise.allSettled([...this.refreshing.values(),...this.accounting.values()]);}
}
