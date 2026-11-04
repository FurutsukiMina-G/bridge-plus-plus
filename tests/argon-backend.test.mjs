import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {EventEmitter} from 'node:events';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {historyText,textHistory} from '../app/services/history-content.mjs';
import {responseToChat,ResponseProjection} from '../app/services/responses.mjs';
import {normalizeWorkbuddy,variantFor} from '../app/core/catalog.mjs';
import {kimiAcpConfig} from '../app/runtimes/kimi-acp.mjs';
import {ContextPool} from '../bridges/workbuddy-bridge/src/context.mjs';
import {relayCompletion} from '../app/services/gateway-usage.mjs';
async function fixture(t){
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/argon-')),store=await new Store(root).open();
  await store.mutate(s=>{s.projects=[{id:'p',path:root}];});
  t.after(()=>store.close());return {store,root};
}
test('media history becomes a deterministic explicit omission, retaining adjacent text and exact media identity',()=>{
  const media={type:'image_url',image_url:{url:'data:image/png;base64,AAAA'}},omitted=[];
  const content=historyText([{type:'text',text:'before'},media,{type:'text',text:'after'}],t=>omitted.push(t));
  assert.match(content,/^before\n.*NOT inspected.*sha256=[a-f0-9]{64}\]\nafter$/);assert.doesNotMatch(content,/base64|AAAA/);assert.deepEqual(omitted,['image_url']);
  assert.notEqual(historyText([media]),historyText([{...media,image_url:{url:'data:image/png;base64,AAAB'}}]));
  const converted=responseToChat({input:[{role:'user',content:[{type:'input_image',image_url:'file:///never-open-this'}]},{role:'user',content:'continue'}]});
  assert.equal(textHistory(converted.messages).messages.length,2);assert.throws(()=>historyText([{type:'future_unknown',text:'essential'}]),/Unsupported/);
});
test('Responses retains readable compaction/native observations and refuses unresolved encrypted history',()=>{
  const converted=responseToChat({input:[{type:'compaction',summary:'Previous facts'},{type:'local_shell_call',status:'completed',action:{commands:['read-only']},output:'observed'},{role:'user',content:'next'}]});
  assert.match(converted.messages[0].content,/Previous facts/);assert.match(converted.messages[1].content,/observed/);assert.equal(converted.tools,undefined);
  assert.throws(()=>responseToChat({input:[{type:'compaction',encrypted_content:'opaque'}]}),/压缩/);assert.throws(()=>responseToChat({input:[{type:'item_reference',id:'old'}]}),/完整内容/);
});
test('length terminal retains partial text as incomplete and cannot expose an executable partial call',()=>{
  const events=[],p=new ResponseProjection('x',e=>events.push(e));p.start();p.accept({choices:[{delta:{content:'half a report'},finish_reason:'length'}]});const result=p.finish();
  assert.equal(result.status,'incomplete');assert.equal(result.incomplete_details.reason,'max_output_tokens');assert.equal(result.output[0].content[0].text,'half a report');assert.equal(events.at(-1).type,'response.incomplete');assert.ok(!events.some(e=>e.type==='response.completed'));
  const call=new ResponseProjection('x',()=>{});call.accept({choices:[{delta:{tool_calls:[{index:0,id:'call',function:{name:'write',arguments:'{"x":'}}]},finish_reason:'length'}]});assert.throws(()=>call.finish(),/partial tool/);
});
test('source length is published before native terminal delivery even when the source reports no usage',async()=>{
  const events=[],stream='data: '+JSON.stringify({choices:[{delta:{content:'partial'},finish_reason:'length'}]})+'\n\ndata: [DONE]\n\n';
  await relayCompletion(new Response(stream,{headers:{'content-type':'text/event-stream'}}),{write(text){if(text.includes('finish_reason'))assert.equal(events[0].name,'gateway/output-limit');return true;},end(){}},{signal:new AbortController().signal,includeUsage:false,onNotice:async e=>events.push(e)});
  assert.equal(events.length,1);
});
test('task context scans once and follows durable users/plans without parsing accumulated deltas on later prompts',async t=>{
  const {store,root}=await fixture(t);await store.mutate(s=>s.sessions.push({id:'s'}));
  await store.event('s',{type:'user',text:'inspect project'});await store.event('s',{type:'thinking',text:'unneeded'.repeat(10000)});
  assert.deepEqual(await store.taskContext('s'),{users:['inspect project'],plan:null});
  await store.event('s',{type:'plan',data:{entries:[{status:'in_progress',content:'review'}]}});await store.event('s',{type:'user',text:'continue'});
  const cached=await store.taskContext('s');assert.equal(cached.users.length,2);assert.equal(cached.plan.entries.length,1);cached.users.length=0;assert.equal((await store.taskContext('s')).users.length,2);
  await store.close();const reopened=await new Store(root).open();t.after(()=>reopened.close());assert.deepEqual(await reopened.taskContext('s'),await Promise.resolve({users:['inspect project','continue'],plan:{entries:[{status:'in_progress',content:'review'}]}}));
});
test('WorkBuddy scoped exact HTTP replay uses no additional SDK context and root survives many child branches',async t=>{
  const {root}=await fixture(t),pool=new ContextPool({runtime:root,maxSessions:3});t.after(()=>pool.close());
  const credential={uid:'u',domain:'d'},signal=new AbortController().signal,request={model:'m',bridge_scope:'scope',messages:[{role:'user',content:'main'}]};
  const rootLease=await pool.acquire(request,credential,signal);rootLease.record.sessionId='sdk-main';rootLease.commit({deltas:['cached']},{role:'assistant',content:'answer'});rootLease.release();
  const replay=await pool.acquire(request,credential,signal);assert.equal(replay.record.id,rootLease.record.id);assert.deepEqual(replay.replay.deltas,['cached']);replay.release();
  for(let i=0;i<12;i++){const child=await pool.acquire({...request,messages:[{role:'system',content:'child-'+i},{role:'user',content:'work'}]},credential,signal);child.record.sessionId='child';child.commit({},{role:'assistant',content:'done'});child.release();assert.ok(pool.records.has(rootLease.record.id));assert.ok(pool.records.size<=3);}
});
test('restored native ownership uses creation identity and never locks a session to a recycled PID',async t=>{
  const {store}=await fixture(t);const session={id:'s',nativeClientPid:process.pid,nativeClientIdentity:{pid:process.pid,started:'old',executable:'C:/Windows/powershell.exe'}};await store.mutate(s=>s.sessions.push(session));
  const manager=new Sessions(store,{},null,[],{identifyProcess:async()=>({pid:process.pid,started:'new',executable:'C:/Windows/powershell.exe'})});await manager.refreshNative('s');assert.equal(manager.nativeBusy('s'),false);assert.equal(session.nativeClientPid,null);
  session.nativeClientPid=process.pid;const blocked=new Sessions(store,{},null,[],{identifyProcess:async()=>{throw Object.assign(new Error('denied'),{code:'EPERM'});}});assert.equal(blocked.nativeBusy('s'),true);await assert.rejects(blocked.refreshNative('s'),/核实/);
});
test('a native process exiting during identity lookup cannot resurrect its stale ownership',async t=>{
  const {store}=await fixture(t);await store.mutate(s=>s.sessions.push({id:'s'}));let resolveIdentity;const manager=new Sessions(store,{},null,[],{identifyProcess:()=>new Promise(r=>{resolveIdentity=r;})});
  const child=new EventEmitter();child.pid=process.pid;const claim=manager.claimNative('s'),tracking=manager.trackNative('s',claim,child);child.emit('close');resolveIdentity({pid:process.pid,started:'now',executable:'powershell.exe'});await tracking;await store.queue;
  assert.equal(manager.nativeBusy('s'),false);assert.equal(store.session('s').nativeClientPid,null);
});
test('explicit native output limits preserve adapter and journal while the user decides whether to continue',async t=>{
  const {store}=await fixture(t);class Fake{constructor(o){Object.assign(this,o);}async prompt(){}async close(){this.closed=true;}}
  const manager=new Sessions(store,{},null,[{id:'codex',installed:true}],{constructors:{codex:Fake}});t.after(()=>manager.close());
  const session=await manager.create({projectId:'p',runtimeId:'codex',selection:{modelKey:'native'}});await manager.prompt(session.id,'task');const adapter=manager.adapters.get(session.id);
  await manager.receive(session,adapter,{type:'text',text:'retained partial'});await manager.receive(session,adapter,{type:'turn-end',status:'interrupted',retainAdapter:true});
  assert.equal(session.status,'interrupted');assert.equal(adapter.closed,undefined);await manager.prompt(session.id,'continue');assert.equal(manager.adapters.get(session.id),adapter);
});
test('reasoning-only Codex rebinding preserves the native process; changing context still restarts explicitly',async t=>{
  const {store}=await fixture(t),model=normalizeWorkbuddy({id:'m',name:'M',contextWindow:200000,maxTokens:64000,reasoning:{supportedEfforts:['low','high']}}),registrations=[];
  const manager=new Sessions(store,{get:()=>model},{register:async(...args)=>registrations.push(args)},[{id:'codex',installed:true}]);t.after(()=>manager.close());
  const session=await manager.create({projectId:'p',runtimeId:'codex',selection:{modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'}});
  const adapter={endpoint:{},close:async()=>{adapter.closed=true;}};manager.adapters.set(session.id,adapter);await manager.rebind(session.id,{...session.selection,reasoning:'high'});
  assert.equal(adapter.closed,undefined);assert.equal(registrations.at(-1)[2].reasoning,'high');assert.equal(manager.adapters.get(session.id),adapter);
  await manager.rebind(session.id,{...session.selection,contextBudget:100000});assert.equal(adapter.closed,true);
  const config=kimiAcpConfig({model,variant:variantFor(model,session.selection),endpoint:{baseURL:'http://localhost'},session});assert.match(config,/max_output_size = 64000/);
});
