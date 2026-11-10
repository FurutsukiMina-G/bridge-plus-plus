import {createServer} from 'node:http';
import {randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {ROOT} from './providers.mjs';
import {join} from 'node:path';
import {responsesRoute} from './responses.mjs';
import {anthropicError,anthropicMessagesRoute,writeAnthropicMessage} from './anthropic-messages.mjs';
import {once} from 'node:events';
import {BridgeWorkers} from './bridge-workers.mjs';
import {validateSelection} from '../core/catalog.mjs';
import {bridgePromptConfig} from './runtime-prompts.mjs';
import {assertSamplingSupported} from './request-settings.mjs';
import {relayCompletion} from './gateway-usage.mjs';
import {textHistory,historyText} from './history-content.mjs';
import {stripBillingHeader} from './prompt-filters.mjs';
import {publicServiceModel} from './model-service-catalog.mjs';
import {failureDetails,failureText,failureValue} from './failure-details.mjs';
import {WebSearch,searchQuery,anthropicSearchResponse} from './web-search.mjs';
const equal=(a,b)=>{const x=Buffer.from(a??''),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
export const gatewayAuthorized=(req,key)=>equal(req.headers.authorization,`Bearer ${key}`)&&req.headers.origin===undefined&&/^127\.0\.0\.1:\d+$/.test(req.headers.host??'');

export class Gateway {
  constructor(store,providers,node,{workerScript=join(ROOT,'app/services/gateway-worker.mjs'),service=null,port=0,key=randomBytes(32).toString('hex'),searchOptions}={}){Object.assign(this,{store,providers,node,service,port,key});this.search=new WebSearch(providers,searchOptions);this.variants=new Map();this.bindings=new Map();this.revisions=new Map();this.closed=false;this.controllers=new Set();this.workers=new BridgeWorkers({node,script:workerScript,cwd:ROOT,dataRoot:store.root,metadataOnly:!!service,components:providers.components,catalog:(source,runtimeId)=>this.catalog(source,runtimeId)});this.children=this.workers.entries;}
  async start(){if(this.closed)throw new Error('Gateway closed');if(this.starting)return this.starting;this.starting=(async()=>{this.server=createServer((req,res)=>{void this.route(req,res).catch(error=>{if(res.destroyed||res.writableEnded)return;const body={error:{code:'gateway_error',message:failureText(error,1200,[this.key])||'模型服务请求失败'}};this.onLocalFailure?.(req,body.error,502);if(!res.headersSent){res.writeHead(502,{'content-type':'application/json'});res.end(JSON.stringify(body));}else{if(String(res.getHeader('content-type')).includes('text/event-stream'))res.write(`data: ${JSON.stringify(body)}\n\n`);res.end();}});});await new Promise((resolve,reject)=>{this.server.once('error',reject);this.server.listen(this.port,'127.0.0.1',resolve);});this.base=`http://127.0.0.1:${this.server.address().port}`;})().catch(error=>{this.starting=null;throw error;});return this.starting;}
  catalog(source,runtimeId){const scope=`${runtimeId}/${source}`;return {models:[...this.variants.values()].filter(x=>x.model.source===source&&x.runtimeId===runtimeId),revision:this.revisions.get(scope)??0};}
  async register(model,variant,selection,runtimeId,sessionId){if(this.closed)throw new Error('Gateway closed');if(!['qoder','workbuddy'].includes(model.source))throw new Error('This source must use its native runtime');bridgePromptConfig(runtimeId);if(sessionId!==undefined&&(typeof sessionId!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(sessionId)))throw new Error('Invalid gateway session');const scope=`${runtimeId}/${model.source}`,key=`${scope}/${variant.id}`,value=structuredClone({model,variant,selection,runtimeId});if(JSON.stringify(this.variants.get(key))!==JSON.stringify(value)){this.variants.set(key,value);this.revisions.set(scope,(this.revisions.get(scope)??0)+1);}if(sessionId)this.bindings.set(`${scope}/${sessionId}`,{variantKey:key,...structuredClone(value)});await this.start();return {baseURL:`${this.base}/${scope}${sessionId?`/session/${sessionId}`:''}/v1`,key:this.key,model:variant.id};}
  async ensureWorker(source,runtimeId){bridgePromptConfig(runtimeId);const worker=await this.workers.ensure(source,runtimeId);await this.workers.sync(source,runtimeId,worker);return worker;}
  async searchEndpoint(){if(this.service)throw new Error('对外模型服务不提供搜索接口');await this.start();return {baseURL:this.base+'/search/anthropic/v1',key:this.key};}
  async searchRoute(req,res,send){
    if(req.method!=='POST'){send(405,{error:{code:'method_not_allowed',message:'搜索接口只接受 POST'}});return;}
    if(req.headers['x-api-key']!==undefined&&!equal(req.headers['x-api-key'],this.key)){send(403,{error:{code:'authentication_failed',message:'搜索接口鉴权失败'}});return;}
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>128*1024){send(413,{error:{message:'搜索请求超过大小上限'}});return;}chunks.push(chunk);}let body,query;
    try{body=JSON.parse(Buffer.concat(chunks));query=searchQuery(body);}catch(error){send(400,{error:{code:'invalid_search_query',message:error instanceof SyntaxError?'搜索请求必须是有效 JSON':failureText(error)}});return;}
    const controller=new AbortController(),abort=()=>{if(!res.writableEnded)controller.abort(new Error('搜索客户端已断开'));};this.controllers.add(controller);res.once('close',abort);
    try{const result=await this.search.search(query,{preferred:this.lastDshSource,signal:controller.signal});send(200,failureValue(anthropicSearchResponse(query,result),[this.key]));}
    catch(error){if(!res.destroyed){const details=failureDetails({code:error.code??'web_search_failed',message:error.message,automatic_retry:false},error.status??502,[this.key]);send(error.status??502,{error:details,...error.failures?{failures:failureValue(error.failures,[this.key])}:{}});}}
    finally{res.removeListener('close',abort);controller.abort();this.controllers.delete(controller);}
  }
  async claudeRoute(req,res,match){
    const send=(status,value)=>{if(status>=400&&value?.error)this.onLocalFailure?.(req,failureValue(value.error,[this.key]),status);if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));}};
    const fail=(status,error)=>send(status,anthropicError(status,error,[this.key]));
    if(!gatewayAuthorized(req,this.key)){fail(403,{message:'模型服务鉴权失败'});return;}
    if(!match){fail(404,{message:'Claude Code 模型服务接口不存在'});return;}
    const [,source,sessionId,route]=match,binding=this.bindings.get(`claude/${source}/${sessionId}`);
    if(!binding){fail(404,{message:'Unknown application session'});return;}
    if(route==='models'){
      if(req.method!=='GET'){fail(405,{message:'此模型接口不支持该 HTTP 方法'});return;}
      const v=binding.variant;send(200,{object:'list',data:[{id:v.id,object:'model',owned_by:source,context_window:binding.selection.contextBudget??v.contextWindow,reasoning_efforts:v.efforts}]});return;
    }
    if(req.method!=='POST'){fail(405,{message:'此模型接口不支持该 HTTP 方法'});return;}
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>32*1024*1024){fail(413,{message:'Request exceeds 32 MiB'});return;}chunks.push(chunk);}
    const raw=Buffer.concat(chunks).toString('utf8');let body;try{body=JSON.parse(raw);}catch{fail(400,{message:'请求必须是有效 JSON'});return;}
    if(!body||typeof body!=='object'||Array.isArray(body)){fail(400,{message:'请求必须是 JSON 对象'});return;}
    // Claude Code side requests (titles, review, compaction) declare no tools.
    const auxiliary=!(Array.isArray(body.tools)&&body.tools.length);
    if(body.model!==binding.variant.id){fail(409,{message:'此会话未选择该模型或参数'});return;}
    if(route==='messages/count_tokens'){send(200,{input_tokens:Math.ceil(raw.length/4)});return;}
    const controller=new AbortController(),abort=()=>{if(!res.writableEnded)controller.abort();};res.once('close',abort);this.controllers.add(controller);
    try{
      if((body.tools??[]).some(tool=>/^web_search_/.test(tool?.type??''))){
        const query=searchQuery(body),result=await this.search.search(query,{preferred:source,signal:controller.signal}),message=anthropicSearchResponse(query,result);
        const searchBlock=message.content.find(block=>block.type==='web_search_tool_result');
        message.model=body.model;message.content=[{type:'server_tool_use',id:searchBlock.tool_use_id,name:'web_search',input:{query}},...message.content];
        message.usage={input_tokens:0,output_tokens:0,server_tool_use:{web_search_requests:1}};
        writeAnthropicMessage(res,failureValue(message,[this.key]),body.stream===true);return;
      }
      await anthropicMessagesRoute(body,res,(chat,signal)=>fetch(`${this.base}/claude/${source}/session/${sessionId}/v1/chat/completions`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${this.key}`,'x-bridge-auxiliary':auxiliary?'1':'0'},body:JSON.stringify(chat),signal}),controller.signal,{images:binding.model.images===true,secrets:[this.key],onFailure:(error,status)=>this.onLocalFailure?.(req,failureValue(error,[this.key]),status)});
    }catch(error){if(!res.destroyed)fail(error.status??502,error);}
    finally{res.removeListener('close',abort);controller.abort();this.controllers.delete(controller);}
  }
  async route(req,res){
    res.setHeader('x-should-retry','false');
    if(!this.service&&(req.url??'').startsWith('/claude/')&&!(req.url??'').endsWith('/v1/chat/completions')){
      const path=new URL(req.url??'/', 'http://127.0.0.1').pathname;
      return this.claudeRoute(req,res,/^\/claude\/(qoder|workbuddy)\/session\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,127})\/v1\/(messages(?:\/count_tokens)?|models)$/.exec(path));
    }
    const send=(status,value)=>{if(status>=400&&value?.error){value={...value,error:failureValue(value.error,[this.key])};this.onLocalFailure?.(req,value.error,status);}res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
    if(!gatewayAuthorized(req,this.key)){send(403,{error:{code:'authentication_failed',message:'模型服务鉴权失败'}});return;}
    if(req.url==='/search/anthropic/v1/messages'&&!this.service)return this.searchRoute(req,res,send);
    const external=this.service&&/^\/(?:(dsh|kimi|codex)\/)?v1\/(models|chat\/completions|responses)$/.exec(req.url??'');
    const match=this.service?(external?[external[0],external[1]??this.service.defaultProfile,this.service.source,undefined,external[2]]:null):/^\/(dsh|kimi|codex|claude)\/(qoder|workbuddy)(?:\/session\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,127}))?\/v1\/(models|chat\/completions|responses)$/.exec(req.url??'');if(!match){send(404,{error:{code:'route_not_found',message:'模型服务接口不存在'}});return;}
    const [,runtimeId,source,sessionId,route]=match;const routeBase=this.service?`${this.base}/${runtimeId}/v1`:`${this.base}/${runtimeId}/${source}${sessionId?`/session/${sessionId}`:''}/v1`;
    const binding=sessionId?this.bindings.get(`${runtimeId}/${source}/${sessionId}`):null;
    if(sessionId&&!binding){send(404,{error:{message:'Unknown application session'}});return;}
    if(route==='models'&&req.method==='GET'){const rows=this.catalog(source,runtimeId).models.filter(v=>!binding||`${runtimeId}/${source}/${v.variant.id}`===binding.variantKey);send(200,{object:'list',data:this.service?rows.map(row=>publicServiceModel(row,this.service.name)):rows.map(({variant:v})=>({id:v.id,object:'model',owned_by:source,context_window:binding?.selection.contextBudget??v.contextWindow,reasoning_efforts:v.efforts}))});return;}
    if(!['chat/completions','responses'].includes(route)||req.method!=='POST'){send(405,{error:{code:'method_not_allowed',message:'此模型接口不支持该 HTTP 方法'}});return;}
    let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>32*1024*1024){send(413,{error:{message:'Request exceeds 32 MiB'}});return;}chunks.push(chunk);}let body;try{body=JSON.parse(Buffer.concat(chunks));}catch{send(400,{error:{message:'Invalid JSON'}});return;}
    if(!body||typeof body!=='object'||Array.isArray(body)){send(400,{error:{message:'JSON object required'}});return;}
    // Only requests that declare tools are real agent turns; side requests carry none.
    const auxiliary=req.headers['x-bridge-auxiliary']!==undefined?req.headers['x-bridge-auxiliary']==='1':!(Array.isArray(body.tools)&&body.tools.length);
    // DSH auto-review unconditionally sends temperature:0. Drop that field so
    // reviewers use source defaults; sampling overrides still cannot be forwarded.
    if(runtimeId==='dsh'&&body.temperature===0)delete body.temperature;
    try{assertSamplingSupported(body);}catch(error){send(400,{error:{message:error.message,code:'unsupported_parameter'}});return;}
    let selected=binding??this.variants.get(`${runtimeId}/${source}/${body.model}`);if(!selected){send(404,{error:{message:'Select an exact discovered model for this runtime'}});return;}
    if(this.service){
      req.bridgeModel=selected.variant.id;
      const effort=body.reasoning_effort??selected.model.defaultReasoning;
      if(effort!=null&&(typeof effort!=='string'||!selected.model.reasoning.includes(effort))){send(400,{error:{message:'不支持此 reasoning_effort；可选值：'+(selected.model.reasoning.join(', ')||'无（请省略）'),code:'unsupported_effort'}});return;}
      selected={...selected,selection:{...selected.selection,reasoning:effort??null}};
      try{const inspect=value=>{if(Array.isArray(value)){for(const part of value)inspect(part);}else if(value&&typeof value==='object'){if(['input_image','image_url','image'].includes(value.type))historyText([value],()=>{},true);else{inspect(value.content);inspect(value.input);}}};inspect(body.messages??body.input);}catch{send(400,{error:{code:'unsupported_content',message:'图片只接受有效的内联 data URL，并遵守媒体大小上限；Bridge++ 不代取远程图片或本地路径。'}});return;}
    }
    if(binding!==null&&binding.variantKey!==`${runtimeId}/${source}/${body.model}`){send(409,{error:{message:'此会话未选择该模型或参数'}});return;}
    try{validateSelection(this.providers.get(selected.model.key),selected.selection);}catch(error){send(409,{error:{message:error.message}});return;}
    if(res.destroyed)return;
    const turnId=this.requestContext?.(sessionId,req),started=performance.now();
    if(route==='chat/completions'){
      let history;try{history=textHistory(body.messages,selected.model.images===true);}catch(error){send(400,{error:{message:error.message,code:'unsupported_content'}});return;}
      body.messages=history.messages;
      const filtered=stripBillingHeader(body.messages);
      if(filtered!==body.messages){body.messages=filtered;this.billingHeaderFilterCount=(this.billingHeaderFilterCount??0)+1;}
      const omitted=[...new Set([...history.omitted,...(Array.isArray(body.bridge_omitted_media)?body.bridge_omitted_media.filter(t=>typeof t==='string'&&t.length<40):[])])];delete body.bridge_omitted_media;
      if(omitted.length)await this.onUsage?.(sessionId,{type:'notice',source:'gateway',code:'media_omitted',text:'历史记录含媒体内容，当前 bridge 文本通道已保留明确的省略标记；模型没有读取媒体：'+omitted.join(', ')},turnId);
    }
    const controller=new AbortController(),abort=()=>{if(!res.writableEnded)controller.abort();};res.once('close',abort);this.controllers.add(controller);
    let leasedWorker;
    try{
    if(route==='responses'){await responsesRoute(body,res,(chat,signal)=>fetch(`${routeBase}/chat/completions`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${this.key}`,...this.service?{'x-bridge-internal':this.internalKey,'x-bridge-parent':req.bridgeRequestId}:{}},body:JSON.stringify(chat),signal}),controller.signal,{images:selected.model.images===true,onFailure:(error,status)=>this.onLocalFailure?.(req,failureValue(error,[this.key]),status)});return;}
    // An application scope owns several independent conversations (main, subagents, compaction).
    // A client key identifies a conversation only within that scope; absent keys use scoped prefix routing.
    if(sessionId){body.bridge_scope=createHash('sha256').update(`${runtimeId}/${source}/${sessionId}`).digest('hex');if(body.prompt_cache_key)body.prompt_cache_key=createHash('sha256').update(body.bridge_scope+':'+body.prompt_cache_key).digest('hex');}else delete body.bridge_scope;
    // The user's chosen source controls effort, even if a client SDK omits or rewrites it.
    if(selected.selection.reasoning)body.reasoning_effort=selected.selection.reasoning;else delete body.reasoning_effort;
    const includeUsage=body.stream_options?.include_usage===true;
    if(body.stream)body.stream_options={...body.stream_options,include_usage:true};
    const worker=await this.ensureWorker(source,runtimeId);this.workers.retain(worker);leasedWorker=worker;controller.signal.throwIfAborted();
    try{validateSelection(this.providers.get(selected.model.key),selected.selection);}catch(error){send(409,{error:{message:error.message}});return;}
    if(runtimeId==='dsh')this.lastDshSource=source;
    const upstream=await fetch(worker.url+'/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${worker.key}`},body:JSON.stringify(body),signal:controller.signal,redirect:'error'});res.writeHead(upstream.status,{'content-type':upstream.headers.get('content-type')??'application/json','cache-control':'no-store'});
    await relayCompletion(upstream,res,{signal:controller.signal,includeUsage,auxiliary,model:body.model,contextWindow:selected.selection.contextBudget??selected.variant.contextWindow,started,sanitizeError:error=>failureValue(error,[this.key,worker.key]),onUsage:event=>this.onUsage?.(sessionId,event,turnId),onNotice:event=>this.onUsage?.(sessionId,event,turnId),onSuccess:()=>this.onSuccess?.(sessionId,turnId),onFailure:async raw=>{
      const error=failureDetails(raw,upstream.status,[this.key,worker.key]);
      await this.onFailure?.(sessionId,error,turnId);
      await this.onUsage?.(sessionId,{type:'upstream-error',source:'gateway',provider:source,model:selected.model.name??selected.variant.name??body.model,code:error.code,message:error.message,...error.upstream_status?{status:error.upstream_status}:{},...error.reset_at?{resetAt:error.reset_at}:{},...error.request_id?{requestId:error.request_id}:{},retrying:error.automatic_retry!==false},turnId);
      // Native clients may retry SSE errors and Kimi ACP maps provider failure to end_turn.
      // An exhausted decision or a source explicitly forbidding automatic retry is
      // terminal. SDK retries inside the source have already used their own budget.
      if(error.automatic_retry===false||['unfinished_turn','model_decision_recovery_exhausted','model_decision_error'].includes(error.code))return this.onUsage?.(sessionId,{type:'error',source:'gateway',fatal:true,code:error.code,text:error.message},turnId);
    }});
    }finally{this.workers.release(leasedWorker);controller.abort();this.controllers.delete(controller);res.removeListener('close',abort);}
  }
  async close(){this.closed=true;for(const controller of this.controllers)controller.abort();await this.workers.close();await this.starting?.catch(()=>{});if(this.server){this.server.closeAllConnections();await new Promise(resolve=>this.server.close(resolve));this.server=null;}}
}
