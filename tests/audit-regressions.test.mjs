import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile,utimes,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Store} from '../app/core/store.mjs';
import {Gateway} from '../app/services/gateway.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {ProviderService} from '../app/services/providers.mjs';
import {normalizeWorkbuddy,variantFor} from '../app/core/catalog.mjs';
import {ContextPool} from '../bridges/workbuddy-bridge/src/context.mjs';
import {DshHost} from '../app/services/dsh-host.mjs';
import {writeNativeLauncher,cleanupNativeLaunchers} from '../app/services/native-launch.mjs';
import {responseToChat} from '../app/services/responses.mjs';
const runFile=promisify(execFile);
async function directory(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/audit-'));}
const raw={id:'fixture',name:'Original name',contextWindow:200000,reasoning:{supportedEfforts:['low','high']}};
const select=model=>({modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'});

test('pure-text app sessions get stable distinct bridge keys including Responses conversion',async t=>{
  const model=normalizeWorkbuddy(raw),root=await directory(),selection=select(model),variant=variantFor(model,selection);
  const gateway=new Gateway({root},{get:()=>model},{command:process.execPath,args:[],env:{}},{workerScript:resolve('tests/fixtures/gateway-worker.mjs')});t.after(()=>gateway.close());
  const [a,b]=await Promise.all(['session-a','session-b'].map(id=>gateway.register(model,variant,selection,'codex',id)));
  const request=(endpoint,path,body)=>fetch(endpoint.baseURL+path,{method:'POST',headers:{authorization:'Bearer '+endpoint.key,'content-type':'application/json'},body:JSON.stringify(body)});
  const body={model:variant.id,prompt_cache_key:'same-client-key',messages:[{role:'user',content:'Identical text'}]};
  const [first,other]=await Promise.all([request(a,'/chat/completions',body).then(r=>r.json()),request(b,'/chat/completions',body).then(r=>r.json())]);
  const next=await (await request(a,'/chat/completions',body)).json();
  assert.match(first.cacheKey,/^[0-9a-f]{64}$/);assert.equal(first.cacheKey,next.cacheKey);assert.notEqual(first.cacheKey,other.cacheKey);
  const response=await request(a,'/responses',{model:variant.id,prompt_cache_key:body.prompt_cache_key,input:'Pure text continuation'});assert.equal(response.status,200);
  assert.equal((await response.json()).output[0].content[0].text,first.cacheKey);
  const high=variantFor(model,{...selection,reasoning:'high'});await gateway.register(model,high,{...selection,reasoning:'high'},'codex','session-b');
  assert.equal((await (await request(a,'/chat/completions',body)).json()).effort,'low');
  assert.equal((await (await request(b,'/chat/completions',body)).json()).effort,'high');
  for(const path of ['/responses','/chat/completions']){const result=await request(a,path,{...body,input:'text',temperature:0.2});assert.equal(result.status,400);assert.match((await result.json()).error.message,/temperature/);}
});

test('stable text-only keys reuse WorkBuddy SDK context without merging identical conversations',async t=>{
  const runtime=await directory(),pool=new ContextPool({runtime,maxSessions:2});t.after(()=>pool.close());
  const credential={uid:'fixture',domain:'fixture'},signal=new AbortController().signal;
  const message={role:'user',content:'Same first question'},answer={role:'assistant',content:'First answer'};
  const body={model:'fixture',messages:[message],prompt_cache_key:'app-session-a',max_tokens:100};
  const first=await pool.acquire(body,credential,signal);first.record.sessionId='sdk-a';first.commit({},answer);const firstId=first.record.id;first.release();
  const independent=await pool.acquire({...body,prompt_cache_key:'app-session-b'},credential,signal);assert.notEqual(independent.record.id,firstId);independent.record.sessionId='sdk-b';independent.commit({},answer);independent.release();
  const next=await pool.acquire({...body,messages:[message,answer,{role:'user',content:'Second question'}]},credential,signal);
  assert.equal(next.record.id,firstId);assert.equal(next.reused,true);assert.equal(next.metrics.historyMode,'delta');assert.equal(next.messages.length,1);assert.equal(pool.records.size,2);next.release();
});

test('explicit same-model reconfirmation preserves native identity and journal; invalid requests stay out',async t=>{
  const root=await directory(),store=await new Store(root).open();let model=normalizeWorkbuddy(raw);const instances=[],gatewayCalls=[];
  class Fake {constructor(options){Object.assign(this,options);instances.push(this);}async close(){this.closed=true;}}
  const manager=new Sessions(store,{get:()=>model},{register:async(...args)=>{gatewayCalls.push(args);return {baseURL:'fixture'};}},[{id:'codex',installed:true}],{constructors:{codex:Fake}});
  t.after(async()=>{await manager.close();await store.close();});await store.mutate(s=>{s.projects=[{id:'p',path:root}];});
  const session=await manager.create({projectId:'p',runtimeId:'codex',selection:select(model)});session.nativeId='native-existing';await store.event(session.id,{type:'user',text:'Saved history'});await manager.adapter(session);
  assert.equal(gatewayCalls[0][4],session.id);
  model=normalizeWorkbuddy({...raw,name:'Updated name'});assert.match(manager.selectionIssue(session),/身份/);
  await assert.rejects(manager.prompt(session.id,'Must not be recorded'),/身份/);assert.equal((await store.events(session.id)).length,1);
  await assert.rejects(manager.rebind(session.id,{...select(model),modelKey:'workbuddy:other'}),/同一模型/);
  manager.runs.set(session.id,{});await assert.rejects(manager.rebind(session.id,select(model)),/停止/);manager.runs.delete(session.id);
  await manager.rebind(session.id,select(model));assert.equal(instances[0].closed,true);assert.equal(session.nativeId,'native-existing');assert.equal(session.runtimeId,'codex');assert.equal(manager.selectionIssue(session),null);
  assert.equal((await store.events(session.id))[0].text,'Saved history');await manager.adapter(session);assert.equal(instances.length,2);assert.equal(instances[1].session.nativeId,'native-existing');
});

test('reconfirmation reserves the session while disposing its old adapter',async t=>{
  const root=await directory(),store=await new Store(root).open(),model=normalizeWorkbuddy(raw);let release;
  const manager=new Sessions(store,{get:()=>model},null,[{id:'codex',installed:true}]);t.after(async()=>{release?.();await manager.close();await store.close();});await store.mutate(s=>{s.projects=[{id:'p',path:root}];});
  const session=await manager.create({projectId:'p',runtimeId:'codex',selection:select(model)});
  manager.adapters.set(session.id,{close:()=>new Promise(r=>{release=r;})});const pending=manager.rebind(session.id,select(model));
  await assert.rejects(manager.prompt(session.id,'racing submit'),/确认模型/);release();await pending;
});

test('DSH providers preserve each session endpoint instead of overwriting another session',async()=>{
  const host=new DshHost({},{}),providers={},model=normalizeWorkbuddy(raw),variant=variantFor(model,select(model));let revision=0;
  host.rpc=async(method,args)=>{if(method==='settings/describe')return {writable:true,namespaces:[{ns:'llm-pi-ai',revision,user:{providers}}]};if(method==='settings/mutate'){assert.equal(args.expectedRevision,revision++);providers[args.ops[0].path[1]]=args.ops[0].value;}};
  const [a,b]=await Promise.all(['a','b'].map(id=>host.configure(model,variant,{baseURL:'http://127.0.0.1:1/dsh/workbuddy/session/'+id+'/v1',key:'fixture'},id)));
  assert.notEqual(a,b);assert.match(providers[a].baseURL,/session\/a/);assert.match(providers[b].baseURL,/session\/b/);
});

test('unsupported sampling is rejected instead of silently discarded; cache keys survive Responses',()=>{
  for(const key of ['temperature','top_p','frequency_penalty','presence_penalty'])assert.throws(()=>responseToChat({input:'test',[key]:0}),new RegExp(key));
  const chat=responseToChat({input:'test',temperature:null,prompt_cache_key:'client-session'});assert.equal(chat.prompt_cache_key,'client-session');
});

test('native launcher removes its own secret-bearing file and handles Unicode paths',async()=>{
  const root=await directory(),path=join(root,'中文项目');await mkdir(path);const output=join(path,'result.txt');
  const file=await writeNativeLauncher(root,{projectPath:path,setup:"$env:AWB_TEST_LAUNCH='fixture-value'\n",executable:process.execPath,args:['-e',"require('fs').writeFileSync('result.txt',process.env.AWB_TEST_LAUNCH)"]});
  await runFile('powershell.exe',['-NoProfile','-NonInteractive','-File',file],{windowsHide:true,timeout:15000});
  assert.equal(await readFile(output,'utf8'),'fixture-value');await assert.rejects(access(file));
  const stale=join(root,'native-launch','11111111-1111-4111-8111-111111111111.ps1'),keep=join(root,'native-launch','notes.ps1');await writeFile(stale,'old fixture');await writeFile(keep,'user fixture');await utimes(stale,new Date(0),new Date(0));
  assert.equal(await cleanupNativeLaunchers(root),1);await access(keep);
});

test('catalog connection errors retain old models; window changes alone do not change identity',async t=>{
  const original=normalizeWorkbuddy(raw),updated=normalizeWorkbuddy({...raw,contextWindow:400000});assert.equal(original.identity,updated.identity);
  const root=await directory(),store=await new Store(root).open();t.after(()=>store.close());await store.mutate(s=>{s.catalog.workbuddy={status:'ready',models:[original]};});
  const providers=new ProviderService(store,{});providers.runWorker=async()=>{throw new Error('Fixture offline');};await assert.rejects(providers.refresh('workbuddy'),/offline/);assert.equal(store.state.catalog.workbuddy.models[0].identity,original.identity);assert.equal(store.state.catalog.workbuddy.status,'error');
});
