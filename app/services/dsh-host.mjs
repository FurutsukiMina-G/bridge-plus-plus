import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import WebSocket from 'ws';
import {launch,stopProcess} from '../core/process.mjs';
import {externalAsarHasFile} from '../core/external-asar.mjs';
import {failureText} from './failure-details.mjs';
import {DshProfileFiles} from './dsh-profile-files.mjs';
const autoReviewBundle='@deepseek-ai/dsh-experimental-auto-review';
export async function ensureDshProfile(home,{hasAutoReview=false}={}){
 const dir=join(home,'profiles/web'),file=join(dir,'package.json');await mkdir(dir,{recursive:true});let pkg,created=false;
 try{pkg=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw new Error('DSH 私有 profile 的 package.json 无法读取，未启动 Host');created=true;pkg={name:'dsh-profile-web',private:true,dependencies:{},dsh:{profile:{bundles:['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app']}}};}
 const bundles=pkg.dsh?.profile?.bundles??[];if(!Array.isArray(bundles))throw new Error('DSH 私有 profile 的 bundles 格式无效，未启动 Host');
 if(hasAutoReview&&!bundles.includes(autoReviewBundle)){pkg.dsh={...pkg.dsh,profile:{...pkg.dsh?.profile,bundles:[...bundles,autoReviewBundle]}};created=true;}
 if(created)await writeFile(file,JSON.stringify(pkg,null,2)+'\n',{mode:0o600});
 for(const name of ['cordis.yml','cordis.patch.yml'])try{await writeFile(join(dir,name),'[]\n',{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}
}
export async function configureDshSearch(home,{baseURL,key}){
 if(typeof home!=='string'||!isAbsolute(home))throw new Error('必须显式指定 DSH 私有 Host 目录');
 const endpoint=new URL(baseURL);if(endpoint.protocol!=='http:'||endpoint.hostname!=='127.0.0.1'||!endpoint.port||endpoint.pathname!=='/search/anthropic/v1'||endpoint.search||endpoint.hash||endpoint.username||endpoint.password||typeof key!=='string'||!key)throw new Error('无效的私有搜索网关');
 const files=new DshProfileFiles({home,profile:'web',namespaces:{'web-search-deepseek':'@deepseek-ai/dsh-web-search-deepseek'}}),state=await files.rpc('settings/describe'),row=state.namespaces[0];
 const ops=[];for(const [name,value]of Object.entries({baseURL,apiKeyEnv:'BRIDGEPP_SEARCH_KEY'}))if(row.user[name]!==value)ops.push({op:'set',path:[name],value});if(Object.hasOwn(row.user,'apiKey'))ops.push({op:'unset',path:['apiKey']});
 if(ops.length)await files.rpc('settings/mutate',{ns:row.ns,expectedRevision:row.revision,ops});await files.rpc('credentials/set',{ref:'BRIDGEPP_SEARCH_KEY',value:key});
}
export function dshEfforts(efforts){const supported=['off','minimal','low','medium','high','xhigh','max'];const result={};for(const effort of efforts){const key=effort==='none'?'off':supported.includes(effort)?effort:supported.find(k=>!(k==='off'&&efforts.includes('none'))&&!Object.hasOwn(result,k)&&!efforts.includes(k));if(!key)throw new Error('DSH cannot represent every native effort for this model');result[key]=effort;}return result;}
export class DshHost extends EventEmitter {
  constructor(store,runtime,{gateway}={}){super();this.store=store;this.runtime=runtime;this.gateway=gateway;this.settingsQueue=Promise.resolve();this.closed=false;}
  async configureSearch(){if(this.gateway)await configureDshSearch(join(this.store.root,'engines/dsh'),await this.gateway.searchEndpoint());}
  async ready(){if(this.closed)throw new Error('DSH Host 已关闭');if(this.flight)return this.flight;this.flight=this.start().catch(async e=>{await stopProcess(this.child);this.origin=null;this.flight=null;throw e;});return this.flight;}
  async start(){
    if(!this.runtime.executable)throw new Error('DeepSeek Harness 未安装，请在运行环境设置中选择程序');
    const root=dirname(this.runtime.executable),entry=join(root,'resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-desktop-host/lib/cli.js');
    const home=join(this.store.root,'engines/dsh');await ensureDshProfile(home,{hasAutoReview:await externalAsarHasFile(join(root,'resources/app.asar'),`dsh/node_modules/${autoReviewBundle}/package.json`)});
    await this.configureSearch();
    this.child=launch(this.runtime.executable,['--expose-internals',entry,'--profile','web','--no-open','--host','127.0.0.1','--port','0'],{cwd:home,env:{ELECTRON_RUN_AS_NODE:'1',DSH_HOME:home,...this.gateway?{BRIDGEPP_SEARCH_KEY:undefined,DEEPSEEK_SEARCH_BASE_URL:undefined}:{}}});
    let logs='';const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('DSH 原生 Host 启动超时')),90000);const receive=b=>{logs=(logs+b.toString()).slice(-30000);const match=/dsh web: (http:\/\/127\.0\.0\.1:\d+)\/?\?token=([A-Za-z0-9_-]+)/.exec(logs);if(match){clearTimeout(timer);resolve({origin:match[1],token:match[2]});}};this.child.stdout.on('data',receive);this.child.stderr.on('data',receive);this.child.on('error',e=>{clearTimeout(timer);reject(e);});this.child.once('exit',code=>{clearTimeout(timer);this.flight=null;const error=new Error(`DSH Host 已退出（退出码 ${code}）：${failureText(logs,30000,[this.token]).slice(-1400)}`);this.emit('closed',error);reject(error);});});
    if(this.closed)throw new Error('DSH Host 已关闭');this.origin=result.origin;this.token=result.token;
    const login=await fetch(`${this.origin}/?token=${this.token}`,{redirect:'manual',signal:AbortSignal.timeout(10000)});this.cookie=login.headers.get('set-cookie')?.split(';')[0];if(login.status!==303||!this.cookie)throw new Error('DSH 原生 Host 认证失败');
    return this;
  }
  async rpc(method,args={}){await this.ready();const result=await fetch(`${this.origin}/api/${method}`,{method:'POST',headers:{cookie:this.cookie,origin:this.origin,'content-type':'application/json'},body:JSON.stringify({type:'client-request',rpcId:randomUUID(),method,payload:{args}}),redirect:'error',signal:AbortSignal.timeout(30000)});const body=await result.json();if(!result.ok||!body.result?.ok)throw Object.assign(new Error(`${method}: ${body.result?.error?.message??`HTTP ${result.status}`}`),{rpcRejected:body.result?.ok===false});return body.result.value;}
  configure(model,variant,endpoint,sessionId){const task=this.settingsQueue.then(()=>this.configureOne(model,variant,endpoint,sessionId));this.settingsQueue=task.catch(()=>{});return task;}
  async configureOne(model,variant,endpoint,sessionId){
    await this.configureSearch();
    const ns=await this.rpc('settings/describe');const row=ns.namespaces.find(e=>e.ns==='llm-pi-ai');if(!row||!ns.writable)throw new Error('DSH 当前版本未开放模型设置，请使用原生窗口');
    if(typeof sessionId!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(sessionId))throw new Error('Invalid DSH application session');
    const id=`agentworkbench-${model.source}-${sessionId}`,apiKeyEnv=`AWB_${model.source.toUpperCase()}_KEY`;
    await this.rpc('credentials/set',{ref:apiKeyEnv,value:endpoint.key});
    const configured={id:variant.id,name:model.name,contextWindow:variant.contextWindow??32768,maxTokens:variant.maxTokens,input:['text',...(model.images===true?['image']:[])],reasoningEfforts:dshEfforts(variant.efforts)};
    const provider={displayName:`Bridge++ · ${model.source}`,apiKeyEnv,api:'openai-completions',baseURL:endpoint.baseURL,compat:{supportsDeveloperRole:false,supportsUsageInStreaming:true,maxTokensField:'max_tokens',supportsReasoningEffort:true},models:[configured]};
    await this.rpc('settings/mutate',{ns:'llm-pi-ai',expectedRevision:row.revision,ops:[{op:'set',path:['providers',id],value:provider}]});return id;
  }
  nativeUrl(sessionId){if(!this.origin)throw new Error('DSH Host 未运行');return `${this.origin}/?token=${this.token}${sessionId?`&sessionId=${encodeURIComponent(sessionId)}`:''}`;}
  async followApprovals(sessionId,onApproval,onResolved,onError){
    await this.ready();const socket=new WebSocket(this.origin.replace('http:','ws:')+'/api/remote.mux',{headers:{cookie:this.cookie},origin:this.origin,maxPayload:1024*1024}),streamId=randomUUID();let clientId,active=true;const pending=new Map();
    const stop=()=>{active=false;pending.clear();socket.close();};
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{stop();reject(new Error('DSH approval stream timed out'));},10000);
      socket.on('open',()=>socket.send(JSON.stringify({type:'open',streamId,endpoint:'$events',payload:{args:{}}})));
      socket.on('message',bytes=>{void(async()=>{const m=JSON.parse(bytes.toString());if(m.streamId!==streamId)return;if(m.type==='error')throw new Error(m.error?.message??'DSH approval stream failed');if(m.type!=='item')return;const f=m.value;
        if(f.type==='ready'){clientId=f.clientId;clearTimeout(timer);resolve();return;}
        if(f.type==='cancel'){const id=`dsh:remote:${f.eventId}`;if(pending.delete(id))await onResolved(id);return;}
        if(f.type!=='waterfall')return;
        if(f.event!=='approval/request'||f.agentId!==sessionId){await this.rpc('$events/result',{clientId,eventId:f.eventId,outcome:{kind:'next'}});return;}
        const id=`dsh:remote:${f.eventId}`;pending.set(id,f.eventId);await onApproval({type:'approval',approvalId:id,name:f.request.toolName,data:f.request,choices:['approve','reject']});
      })().catch(error=>{clearTimeout(timer);if(!clientId){stop();reject(error);}else if(active)onError(error);});});
      socket.on('error',error=>{clearTimeout(timer);if(!clientId)reject(error);else if(active)onError(error);});socket.on('close',()=>{clearTimeout(timer);pending.clear();if(!clientId)reject(new Error('DSH approval stream closed'));else if(active)onError(new Error('DSH approval stream closed'));});
    });
    return {stop,approve:async(id,choice)=>{const eventId=pending.get(id);if(!active||!eventId)throw new Error('DSH 授权已过期');if(!['approve','reject'].includes(choice))throw new Error('DSH 仅支持允许一次或拒绝');await this.rpc('$events/result',{clientId,eventId,outcome:{kind:'result',value:choice==='approve'?'allowed-once':'rejected'}});pending.delete(id);}};
  }
  async follow(sessionId,onFrame,onError){
    await this.ready();const socket=new WebSocket(this.origin.replace('http:','ws:')+'/api/remote.mux',{headers:{cookie:this.cookie},origin:this.origin,maxPayload:8*1024*1024});const streamId=randomUUID();let chain=Promise.resolve(),active=true;
    const stop=()=>{active=false;if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'cancel',streamId}));socket.close();};
    await new Promise((resolve,reject)=>{let opened=false;const timer=setTimeout(()=>{stop();reject(new Error('DSH stream handshake timed out'));},10000);
      socket.on('open',()=>{socket.send(JSON.stringify({type:'open',streamId,endpoint:'session/follow',payload:{args:{request:{address:{kind:'session',sessionId},maxMessages:120,assistantStream:true}}}}));});
      socket.on('message',bytes=>{let m;try{m=JSON.parse(bytes.toString());}catch{return;}if(m.streamId!==streamId)return;if(m.type==='item'){if(!opened){opened=true;clearTimeout(timer);resolve();}chain=chain.then(()=>onFrame(m.value)).catch(onError);}else if(m.type==='error'){const error=new Error(m.error?.message??'DSH native stream failed');if(!opened){clearTimeout(timer);reject(error);}else onError(error);}});
      socket.on('error',error=>{clearTimeout(timer);if(!opened)reject(error);else if(active)onError(error);});socket.on('close',()=>{clearTimeout(timer);if(!opened)reject(new Error('DSH stream closed before initialization'));else if(active)onError(new Error('DSH native stream closed'));});
    });return stop;
  }
  async close(){this.closed=true;await stopProcess(this.child);this.origin=null;this.flight=null;}
}
