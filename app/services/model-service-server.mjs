import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {Gateway,gatewayAuthorized} from './gateway.mjs';
import {ProviderService} from './providers.mjs';
import {serviceCatalog,SERVICE_PROFILES} from './model-service-catalog.mjs';
import {servicePortOwner} from './model-service-system.mjs';
import {failureDetails,failureText} from './failure-details.mjs';
const alive=pid=>{try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}};
export class ModelServiceServer extends Gateway {
  static async open(store,node,options={}){
    const state={catalog:{[store.definition.id]:await store.read('catalog.json',{status:'idle',models:[]})}},providerStore={root:store.root,state,mutate:async fn=>{fn(state);await store.write('catalog.json',state.catalog[store.definition.id]);}};
    const providers=options.providers??new ProviderService(providerStore,node,{components:options.components}),server=new ModelServiceServer(store,providers,node,options);server.providerStore=providerStore;await server.loadModels(state.catalog[store.definition.id].models??[],false);server.modelInfo.refreshedAt=state.catalog[store.definition.id].checkedAt??null;const previous=await store.read('status.json');if(previous?.requests)server.requestStats=previous.requests;return server;
  }
  constructor(store,providers,node,{workerScript,listenPort=store.settings.port,portOwner=servicePortOwner,onStop=()=>{},installation=null,refreshMs=15*60*1000}={}){
    super({root:store.root},providers,node,{workerScript,service:{...store.definition,defaultProfile:store.settings.defaultProfile},port:listenPort,key:store.key});Object.assign(this,{serviceStore:store,portOwner,onStop,installation,refreshMs});this.instanceId=randomUUID();this.internalKey=randomBytes(32).toString('hex');this.inflight=new Map();this.records=new Set();this.requestStats={total:0,failed:0,lastAt:null,lastError:null};this.modelInfo={count:0,refreshedAt:null,error:null};this.status='starting';this.error=null;
    this.requestContext=(_id,req)=>req.bridgeRequestId;
    this.onFailure=(_id,error,id)=>{const ctx=this.inflight.get(id);if(ctx){ctx.failed=true;ctx.error=failureDetails(error,undefined,[this.key]);}};
    this.onLocalFailure=(req,error,status)=>{const ctx=this.inflight.get(req.bridgeRequestId);if(ctx&&!ctx.error&&(error?.message||error?.code)){ctx.failed=true;ctx.error=failureDetails({...error,code:error.code??'request_rejected'},status,[this.key]);}};
    this.onUsage=(_id,event,id)=>{const ctx=this.inflight.get(id);if(!ctx)return;if(event.type==='error')ctx.failed=true;if(event.type==='usage')ctx.usage=Object.fromEntries(Object.entries(event.data??{}).filter(([key,value])=>['prompt_tokens','completion_tokens','reasoning_tokens','cached_tokens','cache_read_tokens','cache_write_tokens','duration_ms'].includes(key)&&typeof value==='number'&&Number.isFinite(value)));};
  }
  async loadModels(models,persist=true){const registry=await this.serviceStore.read('ids.json',{}),rows=serviceCatalog(models,this.service.source,registry),signature=items=>JSON.stringify(items.map(({model,variant})=>({id:variant.id,identity:model.identity,images:model.images,efforts:model.reasoning,defaultEffort:model.defaultReasoning,context:variant.contextWindow,maxTokens:variant.maxTokens})).sort((a,b)=>a.id.localeCompare(b.id))),changed=this.rows&&signature(this.rows)!==signature(rows);if(persist)await this.serviceStore.write('ids.json',registry);this.registry=registry;this.variants.clear();for(const runtimeId of SERVICE_PROFILES){for(const row of rows)this.variants.set(`${runtimeId}/${this.service.source}/${row.variant.id}`,{...structuredClone(row),runtimeId});const scope=`${runtimeId}/${this.service.source}`;this.revisions.set(scope,(this.revisions.get(scope)??0)+1);}if(changed)this.workers.retire();this.modelInfo.count=rows.length;this.rows=rows;}
  async publish(){await this.serviceStore.write('status.json',{kind:'bridgepp-model-service',id:this.service.id,name:this.service.name,instanceId:this.instanceId,pid:process.pid,startedAt:this.startedAt??null,baseURL:this.base??null,port:this.server?.address()?.port??this.port,status:this.status,error:this.error,portOwner:this.owner??null,models:this.modelInfo,requests:this.requestStats,installation:this.installation});}
  async run(){
    const lock=join(this.serviceStore.root,'instance.lock');
    for(let n=0;n<2;n++)try{await writeFile(lock,JSON.stringify({pid:process.pid,instanceId:this.instanceId}),{flag:'wx',mode:0o600});this.ownsLock=true;break;}catch(error){if(error.code!=='EEXIST')throw error;let old;try{old=JSON.parse(await readFile(lock,'utf8'));}catch{throw new Error('服务实例锁无效，未覆盖');}if(Number.isInteger(old.pid)&&alive(old.pid))return {duplicate:true};await rm(lock);}
    if(!this.ownsLock)return {duplicate:true};
    try{await super.start();}catch(error){if(error.code==='EADDRINUSE'){this.owner=await this.portOwner(this.port).catch(()=>null);this.error={code:'EADDRINUSE',message:'端口已被占用；未终止或修改占用进程。'};this.status='error';await this.publish();await this.releaseLock();return {duplicate:true,occupied:true};}await this.releaseLock();throw error;}
    await this.serviceStore.write('ids.json',this.registry);this.startedAt=new Date().toISOString();this.status=this.rows.length?'running':'starting';await this.publish();this.timer=setInterval(()=>{void this.refresh().catch(()=>{});},this.refreshMs);this.timer.unref();if(!this.rows.length)void this.refresh().catch(()=>{});return {running:true};
  }
  refresh(){if(this.refreshing)return this.refreshing;this.refreshing=(async()=>{try{const models=await this.providers.refresh(this.service.source);await this.loadModels(models);this.modelInfo={count:this.rows.length,refreshedAt:new Date().toISOString(),error:null};this.status='running';this.error=null;}catch(error){this.modelInfo.error=failureText(error)||'模型目录刷新失败，请检查该来源的原生登录与网络';this.error={code:'CATALOG_REFRESH_FAILED',message:this.modelInfo.error};if(!this.rows.length)this.status='error';throw new Error(this.modelInfo.error);}finally{await this.publish();}})().finally(()=>{this.refreshing=null;});return this.refreshing;}
  async route(req,res){
    const send=(status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
    if((req.url??'').startsWith('/_bridge/')){
      if(!gatewayAuthorized(req,this.key)){send(403,{error:{message:'Local Bearer key required'}});return;}
      if(req.url==='/_bridge/health'&&req.method==='GET'){send(200,await this.serviceStore.read('status.json'));return;}
      if(req.method!=='POST'){send(405,{});return;}
      if(req.url==='/_bridge/refresh'){req.resume();try{await this.refresh();send(200,{ok:true});}catch(error){send(502,{error:{message:error.message}});}return;}
      if(req.url==='/_bridge/configure'){let text='';for await(const chunk of req){text+=chunk;if(text.length>4096){send(413,{});return;}}try{const body=JSON.parse(text);await this.serviceStore.configure({defaultProfile:body.defaultProfile});this.service.defaultProfile=this.serviceStore.settings.defaultProfile;send(200,{ok:true});}catch{send(400,{error:{message:'无效客户端配置'}});}return;}
      if(req.url==='/_bridge/stop'){req.resume();send(200,{ok:true});setTimeout(()=>{void this.shutdown().then(()=>this.onStop());},50);return;}
      send(404,{});return;
    }
    const parent=req.headers['x-bridge-internal']===this.internalKey?req.headers['x-bridge-parent']:null;
    const counted=/\/(chat\/completions|responses)$/.test(req.url??'')&&!this.inflight.has(parent);
    req.bridgeRequestId=this.inflight.has(parent)?parent:randomUUID();
    if(counted){const ctx={started:performance.now(),usage:null,failed:false};this.inflight.set(req.bridgeRequestId,ctx);let recorded=false;const record=()=>{if(recorded)return;recorded=true;const task=(async()=>{const cancelled=!res.writableFinished&&!ctx.error,failed=!cancelled&&(ctx.failed||res.statusCode>=400),at=new Date().toISOString(),error=cancelled?{code:'CLIENT_DISCONNECTED',message:'客户端在响应完成前断开'}:ctx.error??{code:'REQUEST_FAILED',message:`模型请求失败（HTTP ${res.statusCode} 或流式错误）`};this.requestStats.total++;if(failed)this.requestStats.failed++;this.requestStats.lastAt=at;if(failed)this.requestStats.lastError={code:error.code,...error.upstream_status||res.statusCode>=400?{status:error.upstream_status??res.statusCode}:{},message:error.message,model:req.bridgeModel??null,...error.request_id?{requestId:error.request_id}:{},...error.reset_at?{resetAt:error.reset_at}:{},at};await this.serviceStore.requestLog({id:req.bridgeRequestId,model:req.bridgeModel??null,status:cancelled?'cancelled':failed?'failed':'completed',httpStatus:res.statusCode,durationMs:performance.now()-ctx.started,usage:ctx.usage,errorCode:failed||cancelled?error.code:null,errorMessage:failed||cancelled?failureText(error.message,300,[this.key]):null});this.inflight.delete(req.bridgeRequestId);await this.publish();})();this.records.add(task);void task.finally(()=>this.records.delete(task)).catch(()=>{});};res.once('finish',record);res.once('close',record);}
    return super.route(req,res);
  }
  async releaseLock(){if(!this.ownsLock)return;const file=join(this.serviceStore.root,'instance.lock');const lock=JSON.parse(await readFile(file,'utf8').catch(()=>'{}'));if(lock.instanceId===this.instanceId)await rm(file,{force:true});this.ownsLock=false;}
  async shutdown(){if(this.shuttingDown)return this.shuttingDown;this.shuttingDown=(async()=>{clearInterval(this.timer);await this.providers.close?.();await super.close();await this.refreshing?.catch(()=>{});await Promise.allSettled([...this.records]);this.status='stopped';await this.publish();await this.releaseLock();})();return this.shuttingDown;}
}
