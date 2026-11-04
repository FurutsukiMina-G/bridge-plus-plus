import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createServer} from 'node:http';
import {normalizeWorkbuddy,variantFor} from '../app/core/catalog.mjs';
import {Gateway} from '../app/services/gateway.mjs';
import {ModelServiceStore} from '../app/services/model-service-store.mjs';
import {ModelServiceServer} from '../app/services/model-service-server.mjs';
const model=normalizeWorkbuddy({id:'followup-model',name:'Followup Fixture',contextWindow:200000,maxTokens:8000,supportsToolCall:true,reasoning:{supportedEfforts:['low']}});
const providers={get:()=>model,close:async()=>{}};
async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/service-followup-'));}
async function workerFixture(t){
 const received=[],state={stall:false};
 const server=createServer(async(req,res)=>{let text='';for await(const chunk of req)text+=chunk;const body=JSON.parse(text);received.push(body);
  if(body.stream){res.writeHead(200,{'content-type':'text/event-stream'});res.write('data: '+JSON.stringify({choices:[{delta:{content:'fixture reply'},finish_reason:null}]})+'\n\n');if(!state.stall)res.end('data: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');}
  else{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({choices:[{message:{role:'assistant',content:'fixture reply'},finish_reason:'stop'}]}));}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 return {received,state,worker:{url:'http://127.0.0.1:'+server.address().port,key:'fake-followup-worker-key',active:0}};
}
async function fixture(t,defaultProfile='dsh'){
 const store=await new ModelServiceStore(await root(),'workbuddy',{protect:async()=>{}}).open();await store.configure({defaultProfile});await store.write('catalog.json',{models:[model]});const server=await ModelServiceServer.open(store,{}, {providers,listenPort:0});await server.run();t.after(()=>server.shutdown());const worker=await workerFixture(t);server.ensureWorker=async()=>worker.worker;
 const modelId=server.rows[0].variant.id;
 const request=(path,body,options={})=>fetch(server.base+path,{...options,method:'POST',headers:{authorization:'Bearer '+store.key,'content-type':'application/json',...options.headers},body:typeof body==='string'?body:JSON.stringify(body)});
 const records=async()=>{for(let n=0;server.inflight.size&&n<300;n++)await new Promise(r=>setTimeout(r,10));assert.equal(server.inflight.size,0);await Promise.all([...server.records]);return (await readFile(join(store.root,'requests.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);};
 return {store,server,modelId,request,records,...worker};
}
function body(modelId,route='chat/completions'){return route==='responses'?{model:modelId,input:'synthetic task'}:{model:modelId,messages:[{role:'user',content:'synthetic task'}]};}
test('private DSH gateway drops only numeric temperature zero, including the session-bound and Responses paths',async t=>{
 const gateway=new Gateway({root:await root()},providers,{}),worker=await workerFixture(t);gateway.ensureWorker=async()=>worker.worker;t.after(()=>gateway.close());const selection={modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'},variant=variantFor(model,selection);
 for(const profile of ['dsh','kimi','codex']){
  const endpoint=await gateway.register(model,variant,selection,profile,'private-fixture-session');
  for(const route of ['chat/completions','responses'])for(const sampling of [{temperature:0},{temperature:0.7},{temperature:'0'},{temperature:0,top_p:0.5},{top_p:0},{frequency_penalty:0},{presence_penalty:0}]){
   const before=worker.received.length,response=await fetch(endpoint.baseURL+'/'+route,{method:'POST',headers:{authorization:'Bearer '+endpoint.key,'content-type':'application/json'},body:JSON.stringify({...body(variant.id,route),...sampling})});const text=await response.text(),allowed=profile==='dsh'&&typeof sampling.temperature==='number'&&sampling.temperature===0&&Object.keys(sampling).length===1;
   assert.equal(response.status,allowed?200:400,profile+'/'+route+' '+JSON.stringify(sampling));assert.equal(worker.received.length,before+(allowed?1:0));if(allowed)assert.equal(Object.hasOwn(worker.received.at(-1),'temperature'),false);else assert.match(text,/unsupported_parameter/);
  }
 }
});
for(const defaultProfile of ['dsh','kimi','codex'])test(`external DSH sampling exception follows explicit route or ${defaultProfile} default and never forwards temperature`,async t=>{
 const f=await fixture(t,defaultProfile);
 for(const prefix of ['/dsh/v1','/kimi/v1','/codex/v1','/v1'])for(const route of ['chat/completions','responses'])for(const temperature of [0,0.7]){
  const before=f.received.length,response=await f.request(prefix+'/'+route,{...body(f.modelId,route),temperature}),allowed=temperature===0&&(prefix==='/dsh/v1'||prefix==='/v1'&&defaultProfile==='dsh');await response.text();assert.equal(response.status,allowed?200:400,prefix+'/'+route);assert.equal(f.received.length,before+(allowed?1:0));if(allowed)assert.equal(Object.hasOwn(f.received.at(-1),'temperature'),false);
 }
 const response=await f.request('/dsh/v1/chat/completions',{...body(f.modelId),temperature:0,top_p:0.9});assert.equal(response.status,400);assert.match((await response.json()).error.message,/top_p/);await f.records();
});
test('local rejections persist the response error message/code, including JSON, model, sampling and Responses conversion errors',async t=>{
 const f=await fixture(t),cases=[
  ['/v1/chat/completions',{...body(f.modelId),temperature:0.7},400,'unsupported_parameter'],
  ['/v1/chat/completions',{...body(f.modelId),model:'private-unknown-model'},404,'request_rejected'],
  ['/v1/chat/completions','{invalid synthetic-private-body',400,'request_rejected'],
  ['/v1/chat/completions',['synthetic-private-body'],400,'request_rejected'],
  ['/v1/chat/completions',{...body(f.modelId),reasoning_effort:'unsupported'},400,'unsupported_effort'],
  ['/v1/responses',{model:f.modelId,input:42},400,'request_rejected'],
  ['/v1/responses',{model:f.modelId,input:'synthetic-private-body',previous_response_id:'synthetic-private-id'},400,'request_rejected'],
 ];
 for(const [path,input,status,code]of cases){const response=await f.request(path,input),error=(await response.json()).error;assert.equal(response.status,status);const rows=await f.records(),row=rows.at(-1),last=(await f.store.read('status.json')).requests.lastError;assert.equal(row.status,'failed');assert.equal(row.errorCode,code);assert.equal(row.errorMessage,error.message.slice(0,300));assert.equal(last.code,code);assert.equal(last.message,error.message);assert.equal(last.status,status);}
 assert.equal(f.server.requestStats.total,cases.length);assert.equal(f.server.requestStats.failed,cases.length);assert.equal(f.received.length,0);const logs=JSON.stringify(await f.records());assert.doesNotMatch(logs,/synthetic-private-body|synthetic-private-id|private-unknown-model/);
});
test('an internal Chat rejection keeps its actual reason on the parent Responses request without double-counting',async t=>{
 const f=await fixture(t);let lookups=0;f.server.providers={...providers,get:()=>{if(++lookups>1)throw new Error('模型目录已变化，请重新选择');return model;}};const response=await f.request('/codex/v1/responses',{model:f.modelId,input:'synthetic task'});const error=(await response.json()).error;assert.equal(response.status,409);assert.equal(error.message,'模型目录已变化，请重新选择');const rows=await f.records();assert.equal(rows.length,1);assert.equal(rows[0].errorMessage,error.message);assert.equal(rows[0].errorCode,'request_rejected');assert.equal(f.server.requestStats.total,1);assert.equal(f.server.requestStats.lastError.message,error.message);
});
test('authentication rejections record only static information and never include request body or supplied credentials',async t=>{
 const f=await fixture(t);for(const headers of [{authorization:'Bearer synthetic-private-auth'},{origin:'https://synthetic-private-origin.invalid'}]){const response=await f.request('/v1/chat/completions',{model:'synthetic-private-model',messages:[{role:'user',content:'synthetic-private-body'}]}, {headers});assert.equal(response.status,403);await response.text();await f.records();}
 const rows=await f.records();assert.ok(rows.every(row=>row.errorCode==='authentication_failed'&&row.errorMessage==='模型服务鉴权失败'));assert.equal(f.received.length,0);const stored=JSON.stringify({rows,last:f.server.requestStats.lastError});assert.doesNotMatch(stored,/synthetic-private-/);assert.equal(stored.includes(f.store.key),false);
});
test('a gateway startup exception records its redacted reason without needing an upstream response',async t=>{
 const f=await fixture(t);f.server.ensureWorker=async()=>{throw new Error('synthetic worker unavailable api_key="private fake key" '+f.store.key);};const response=await f.request('/v1/chat/completions',body(f.modelId)),error=(await response.json()).error;assert.equal(response.status,502);const rows=await f.records();assert.equal(rows[0].errorCode,'gateway_error');assert.equal(rows[0].errorMessage,error.message);assert.match(f.server.requestStats.lastError.message,/synthetic worker unavailable/);assert.doesNotMatch(JSON.stringify(rows),/private fake key/);assert.equal(JSON.stringify(rows).includes(f.store.key),false);
});
for(const scenario of ['new-cancellation','prior-error-cancellation','known-failure'])test(`client disconnect keeps the correct statistics and reason (${scenario})`,async t=>{
 const knownFailure=scenario==='known-failure',f=await fixture(t);if(scenario==='prior-error-cancellation'){const rejected=await f.request('/v1/chat/completions',{...body(f.modelId),temperature:0.7});await rejected.text();await f.records();}
 const prior=structuredClone(f.server.requestStats),controller=new AbortController();f.state.stall=true;const response=await f.request('/v1/chat/completions',{...body(f.modelId),stream:true},{signal:controller.signal});const reader=response.body.getReader();await reader.read();
 if(knownFailure){const id=[...f.server.inflight.keys()][0];f.server.onFailure(null,{code:'upstream_rate_limited',message:'synthetic upstream limit',upstream_status:429,automatic_retry:false},id);}
 controller.abort();await reader.cancel().catch(()=>{});const rows=await f.records(),row=rows.at(-1),stats=(await f.store.read('status.json')).requests;assert.equal(stats.total,prior.total+1);
 if(knownFailure){assert.equal(row.status,'failed');assert.equal(row.errorCode,'upstream_rate_limited');assert.equal(stats.failed,prior.failed+1);assert.equal(stats.lastError.message,'synthetic upstream limit');}
 else{assert.equal(row.status,'cancelled');assert.equal(row.errorCode,'CLIENT_DISCONNECTED');assert.equal(row.errorMessage,'客户端在响应完成前断开');assert.equal(stats.failed,prior.failed);assert.deepEqual(stats.lastError,prior.lastError);}
});
