import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createServer,request as httpRequest} from 'node:http';
import {normalizeQoder,normalizeWorkbuddy} from '../app/core/catalog.mjs';
import {ModelServiceStore} from '../app/services/model-service-store.mjs';
import {ModelServiceServer} from '../app/services/model-service-server.mjs';
import {serviceCatalog,publicServiceModel} from '../app/services/model-service-catalog.mjs';
import {clientFragment} from '../app/services/model-service-connect.mjs';
import {serviceDefinition} from '../app/services/model-service-catalog.mjs';
import {parse} from 'smol-toml';
const node={command:process.execPath,args:[],env:{}},workerScript=resolve('tests/fixtures/model-service-worker.mjs');
const qoder=(id,name,images=true)=>normalizeQoder({value:id,displayName:name,supportsImages:images,supportsToolCall:true,context_config:{million:{token_count:1000000},small:{token_count:200000}},thinking_config:{enabled:{efforts:{low:{},high:{},max:{}}}},defaultEffort:'high'});
const modelSet=()=>[qoder('dfmodel','DeepSeek-Flash'),qoder('text','Text model',false),{...qoder('disabled','Disabled'),enabled:false},{...qoder('no-tools','No tools'),tools:false}];
async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/model-service-'));}
async function fixture(t,id='qoder'){
 const userData=await root(),models=id==='qoder'?modelSet():[normalizeWorkbuddy({id:'native-wb',name:'WorkBuddy Fixture',contextWindow:200000,maxTokens:9000,supportsImages:true,supportsToolCall:true,reasoning:{supportedEfforts:['low','high'],defaultEffort:'low'}})];
 const store=await new ModelServiceStore(userData,id,{protect:async()=>{}}).open();await store.write('catalog.json',{status:'ready',models,checkedAt:'fixture'});const providers={get:key=>models.find(m=>m.key===key),refresh:async()=>models,close:async()=>{}};
 const server=await ModelServiceServer.open(store,node,{providers,workerScript,listenPort:0});await server.run();t.after(()=>server.shutdown());const request=(path,body,headers={})=>fetch(server.base+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+store.key,'content-type':'application/json',...headers},...body?{body:JSON.stringify(body)}:{}});return {userData,store,server,models,providers,request};
}
test('service aliases are readable, collision-safe, stable across name/identity changes and omit disabled/non-tool models',()=>{
 const registry={},models=modelSet(),first=serviceCatalog(models,'qoder',registry);assert.deepEqual(first.map(m=>m.variant.id),['deepseek-flash-1m','deepseek-flash-200k','text-model-1m','text-model-200k']);const changed=models.map(m=>m.id==='dfmodel'?{...m,name:'Renamed',identity:'changed'}:m);assert.deepEqual(serviceCatalog(changed,'qoder',registry).map(m=>m.variant.id),first.map(m=>m.variant.id));
 const colliding=serviceCatalog([qoder('one','Same name'),qoder('two','Same name')],'qoder',{});assert.equal(new Set(colliding.map(m=>m.variant.id)).size,4);assert.ok(colliding.every(m=>/^(one|two)-/.test(m.variant.id)));
});
test('multi-window public names include their context while IDs, raw upstream names and single-window names remain stable',()=>{
 const multi=qoder('dfmodel','DeepSeek-Flash'),single={...qoder('only','Single'),contexts:[{tokens:400000}]},rows=serviceCatalog([multi,single],'qoder',{}),models=rows.map(row=>publicServiceModel(row,'bridge++_qoder'));
 assert.equal(models.find(m=>m.id==='deepseek-flash-1m').name,'DeepSeek-Flash (1M)');assert.equal(models.find(m=>m.id==='deepseek-flash-200k').name,'DeepSeek-Flash (200K)');assert.equal(models.find(m=>m.id==='single-400k').name,'Single');assert.equal(models[0].upstream.name,'DeepSeek-Flash');assert.equal(new Set(models.map(m=>m.name)).size,3);
 const fragment=clientFragment({target:'kimi',definition:serviceDefinition('qoder'),models,baseURL:'http://127.0.0.1:8646',key:'fixture'}),config=parse(fragment.text);assert.equal(config.models['bridgepp_qoder/deepseek-flash-200k'].display_name,'DeepSeek-Flash (200K)');
});
test('standalone model catalogs expose the exact service metadata and honor request effort/default/profile scopes',{timeout:20000},async t=>{
 const f=await fixture(t),list=await (await f.request('/v1/models')).json(),m=list.data.find(m=>m.id==='deepseek-flash-200k');assert.equal(m.owned_by,'bridge++_qoder');assert.equal(m.object,'model');assert.equal(m.context_window,200000);assert.deepEqual(m.reasoning_efforts,['low','high','max']);assert.equal(m.default_reasoning_effort,'high');assert.deepEqual(m.input_modalities,['text','image']);assert.deepEqual(m.upstream,{source:'qoder',id:'dfmodel',name:'DeepSeek-Flash'});
 const body={model:m.id,messages:[{role:'user',content:'prompt-private-fixture'}],prompt_cache_key:'client-conversation',tools:[{type:'function',function:{name:'host_tool',parameters:{type:'object'}}}],tool_choice:'auto'};
 const first=await (await f.request('/v1/chat/completions',body)).json();assert.equal(first.observed.effort,'high');assert.equal(first.observed.profile,'dsh');assert.equal(first.observed.cacheKey,'client-conversation');assert.equal(first.observed.scope,undefined);assert.equal(first.choices[0].message.tool_calls[0].function.name,'host_tool');
 const profiles=await Promise.all(['kimi','codex'].map(async profile=>(await (await f.request('/'+profile+'/v1/chat/completions',{...body,reasoning_effort:'low'})).json()).observed));assert.deepEqual(profiles.map(p=>p.profile),['kimi','codex']);assert.ok(profiles.every(p=>p.effort==='low'));assert.equal(new Set([first.observed.pid,...profiles.map(p=>p.pid)]).size,3);
 const bad=await f.request('/v1/chat/completions',{...body,reasoning_effort:'ultra'});assert.equal(bad.status,400);assert.match((await bad.json()).error.message,/low, high, max/);
});
test('external Chat/Responses preserve image bytes; remote URLs are rejected even for text-only models',{timeout:20000},async t=>{
 const f=await fixture(t),png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3cAAAAASUVORK5CYII=',url='data:image/png;base64,'+png,part={type:'image_url',image_url:{url}},body={model:'deepseek-flash-200k',messages:[{role:'user',content:[part]}]};
 const reply=await (await f.request('/v1/chat/completions',body)).json();assert.equal(reply.observed.messages[0].content[0].image_url.url,url);
 const omitted=await (await f.request('/v1/chat/completions',{...body,model:'text-model-200k'})).json();assert.match(omitted.observed.messages[0].content,/NOT inspected/);
 for(const model of ['deepseek-flash-200k','text-model-200k']){const response=await f.request('/v1/chat/completions',{model,messages:[{role:'user',content:[{type:'image_url',image_url:{url:'http://127.0.0.1:1/private.png'}}]}]});assert.equal(response.status,400);assert.match((await response.json()).error.message,/Bridge\+\+ 不代取/);}
 const converted=await f.request('/codex/v1/responses',{model:'deepseek-flash-200k',input:[{role:'user',content:[{type:'input_image',image_url:url}]}]});assert.equal(converted.status,200);assert.equal((await converted.json()).status,'completed');
});
test('loopback auth rejects missing/incorrect keys, any Origin including empty and foreign Host',async t=>{
 const f=await fixture(t);for(const headers of [{authorization:''},{authorization:'Bearer wrong'},{origin:'https://other.invalid'},{origin:''},{host:'evil.invalid'}]){const status=await new Promise((resolve,reject)=>{const req=httpRequest(f.server.base+'/v1/models',{headers:{authorization:'Bearer '+f.store.key,...headers}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(status,403);}assert.equal((await f.request('/antigravity/v1/models')).status,404);
});
test('stream usage is opt-in, logs contain only metadata, and Responses count as one external request',{timeout:20000},async t=>{
 const f=await fixture(t),body={model:'deepseek-flash-200k',messages:[{role:'user',content:'prompt-private-fixture'}],stream:true};const a=await (await f.request('/v1/chat/completions',body)).text(),b=await (await f.request('/v1/chat/completions',{...body,stream_options:{include_usage:true}})).text();assert.equal(a.includes('"usage"'),false);assert.equal(b.includes('"usage"'),true);assert.match(a,/\[DONE\]/);
 await (await f.request('/v1/responses',{model:body.model,input:'prompt-private-fixture'})).json();for(let n=0;n<100&&f.server.inflight.size;n++)await new Promise(r=>setTimeout(r,10));await f.store.queue;assert.equal(f.server.requestStats.total,3);const log=await readFile(join(f.store.root,'requests.jsonl'),'utf8');assert.equal(log.includes('prompt-private-fixture'),false);assert.equal(log.includes('reply-private-fixture'),false);assert.equal(log.includes(f.store.key),false);assert.equal(log.trim().split('\n').length,3);assert.equal((await readdir(join(f.store.root,'providers/qoder/dsh')).catch(()=>[])).includes('worker.log'),false);
});
test('a busy port is reported with its owner without stopping that listener',async t=>{
 const userData=await root(),store=await new ModelServiceStore(userData,'qoder',{protect:async()=>{}}).open();await store.write('catalog.json',{models:modelSet()});const occupied=createServer((_q,r)=>r.end('unrelated'));await new Promise(r=>occupied.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>occupied.close(r)));
 const port=occupied.address().port,server=await ModelServiceServer.open(store,node,{providers:{get:()=>{},close:async()=>{}},listenPort:port,portOwner:async()=>({pid:123,name:'other.exe',command:'fixture-owner'})});t.after(()=>server.shutdown());assert.equal((await server.run()).occupied,true);const state=await store.read('status.json');assert.equal(state.error.code,'EADDRINUSE');assert.equal(state.portOwner.pid,123);assert.equal(await (await fetch('http://127.0.0.1:'+port)).text(),'unrelated');
});
test('services persist independent keys and IDs through restart; regeneration changes only that service',async t=>{
 const f=await fixture(t),key=f.store.key,ids=f.server.rows.map(r=>r.variant.id);await f.server.shutdown();const store=await new ModelServiceStore(f.userData,'qoder',{protect:async()=>{}}).open();assert.equal(store.key,key);const restarted=await ModelServiceServer.open(store,node,{providers:f.providers,workerScript,listenPort:0});t.after(()=>restarted.shutdown());await restarted.run();assert.deepEqual(restarted.rows.map(r=>r.variant.id),ids);
 const wb=await new ModelServiceStore(f.userData,'workbuddy',{protect:async()=>{}}).open(),other=wb.key;await restarted.shutdown();await store.regenerate();assert.notEqual(store.key,key);assert.equal((await new ModelServiceStore(f.userData,'workbuddy',{protect:async()=>{}}).open()).key,other);
 assert.equal((await readdir(f.userData)).includes('workspace.json'),false);
});
test('WorkBuddy exposes upstream IDs and its own owner name without requiring any native harness installation',async t=>{
 const f=await fixture(t,'workbuddy'),models=await (await f.request('/v1/models')).json();assert.equal(models.data[0].id,'native-wb');assert.equal(models.data[0].owned_by,'Bridge++_WorkBuddy');const response=await (await f.request('/kimi/v1/chat/completions',{model:'native-wb',messages:[{role:'user',content:'fixture'}]})).json();assert.equal(response.observed.source,'workbuddy');assert.equal(response.observed.profile,'kimi');assert.equal(response.observed.effort,'low');
});
test('an empty standalone catalog bootstraps through the injected provider and duplicate instances leave the live owner state intact',async t=>{
 const userData=await root(),store=await new ModelServiceStore(userData,'qoder',{protect:async()=>{}}).open(),models=modelSet();let refreshed=0;const providers={get:key=>models.find(m=>m.key===key),refresh:async()=>{refreshed++;return models;},close:async()=>{}};const first=await ModelServiceServer.open(store,node,{providers,workerScript,listenPort:0});t.after(()=>first.shutdown());await first.run();await first.refreshing;assert.equal(refreshed,1);assert.equal(first.modelInfo.count,4);const original=await store.read('status.json');
 const duplicateStore=await new ModelServiceStore(userData,'qoder',{protect:async()=>{}}).open(),duplicate=await ModelServiceServer.open(duplicateStore,node,{providers,listenPort:first.server.address().port});assert.equal((await duplicate.run()).duplicate,true);assert.equal((await store.read('status.json')).instanceId,original.instanceId);assert.equal((await fetch(first.base+'/v1/models',{headers:{authorization:'Bearer '+store.key}})).status,200);
});
test('catalog identity refresh preserves public aliases, retires workers after active requests and gives new requests a fresh model pool',{timeout:20000},async t=>{
 const f=await fixture(t),worker=await f.server.ensureWorker('qoder','dsh'),started=new Promise(r=>worker.child.once('message',r)),body={model:'deepseek-flash-200k',messages:[{role:'user',content:'fixture'}]};const pending=f.request('/v1/chat/completions',{...body,delayMs:200}).then(r=>r.json());await started;
 f.models[0]={...f.models[0],name:'Renamed source model',identity:'refreshed-identity'};await f.server.refresh();const current=await (await f.request('/v1/chat/completions',body)).json(),previous=await pending;assert.notEqual(current.observed.pid,previous.observed.pid);assert.equal(current.model,previous.model);assert.equal(previous.choices[0].message.content,'reply-private-fixture');assert.equal(current.choices[0].message.content,'reply-private-fixture');
});
test('concurrent first-time service stores agree on one persistent key without partial files',async()=>{
 const userData=await root(),stores=await Promise.all(Array.from({length:4},()=>new ModelServiceStore(userData,'qoder',{protect:async()=>{}}).open()));assert.equal(new Set(stores.map(s=>s.key)).size,1);assert.ok(stores.every(s=>s.key.length===64));assert.equal((await readdir(stores[0].root)).some(name=>name.endsWith('.tmp')),false);
});
