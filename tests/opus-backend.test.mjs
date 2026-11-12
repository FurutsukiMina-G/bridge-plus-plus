import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {EventEmitter} from 'node:events';
import {ContextPool} from '../bridges/workbuddy-bridge/src/context.mjs';
import {normalizeQoder,validateSelection,variantFor} from '../app/core/catalog.mjs';
import {CatalogVerifier} from '../app/services/catalog-verifier.mjs';
import {relayCompletion} from '../app/services/gateway-usage.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {Store} from '../app/core/store.mjs';
import {codexApprovalResult} from '../app/runtimes/codex.mjs';
import {KimiAcpAdapter,kimiPermissionChoices,kimiStopStatus,kimiAcpConfig} from '../app/runtimes/kimi-acp.mjs';
import {compareRuntimeVersions} from '../app/services/runtime-paths.mjs';
import {dshEfforts} from '../app/services/dsh-host.mjs';
import {WorkerLog} from '../app/services/worker-log.mjs';
async function directory(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/opus-'));}

test('scoped WorkBuddy main/subagent lanes survive interleaving and parameter changes',async t=>{
  const pool=new ContextPool({runtime:await directory(),maxSessions:8});t.after(()=>pool.close());const credential={uid:'fixture',domain:'fixture'},signal=new AbortController().signal;
  const request=(kind,scope='app-a')=>({bridge_scope:scope,prompt_cache_key:'same-native-thread',model:'fixture',max_tokens:100,reasoning_effort:'low',messages:[{role:'system',content:kind},{role:'user',content:'question'}]});
  const first=await pool.acquire(request('main'),credential,signal);const id=first.record.id;first.record.sessionId='main-sdk';first.commit({}, {role:'assistant',content:'main answer'});first.release();
  const sub=await pool.acquire(request('subagent'),credential,signal);sub.record.sessionId='sub-sdk';sub.commit({}, {role:'assistant',content:'sub answer'});sub.release();
  const next=await pool.acquire({...request('main'),max_tokens:500,reasoning_effort:'max',messages:[...request('main').messages,{role:'assistant',content:'main answer'},{role:'user',content:'continue'}]},credential,signal);
  assert.equal(next.record.id,id);assert.equal(next.reused,true);assert.equal(next.metrics.historyMode,'delta');assert.equal(next.messages.length,1);next.release();
  const other=await pool.acquire(request('main','app-b'),credential,signal);assert.notEqual(other.record.id,id);other.release();
  const a=await pool.acquire(request('parallel-a'),credential,signal);
  const b=await Promise.race([pool.acquire(request('parallel-b'),credential,signal),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Parallel lane serialized')),1500))]);
  assert.notEqual(a.record.id,b.record.id);a.release();b.release();assert.ok(pool.records.has(id));
});

test('source default window wins; effort and local budget do not change native pool identity',()=>{
  const model=normalizeQoder({value:'fixture',displayName:'Fixture',context_config:{large:{token_count:1000000},normal:{token_count:200000,is_default:true}},thinking_config:{enabled:{efforts:{low:{},max:{}}}}});
  const chosen=validateSelection(model,{identity:model.identity});assert.equal(chosen.contextTokens,200000);
  const first=variantFor(model,{...chosen,reasoning:'low'}),next=variantFor(model,{...chosen,reasoning:'max',contextBudget:8000});assert.equal(first.id,next.id);assert.equal(next.contextWindow,200000);
  const config=kimiAcpConfig({model:{name:'No thinking model',reasoning:[],defaultContextTokens:200000,contextMaximum:1000000},variant:{id:'fixture'},endpoint:{baseURL:'http://127.0.0.1:1/v1'},session:{selection:{}}});assert.match(config,/max_context_size = 200000/);assert.match(config,/enabled = false/);assert.doesNotMatch(config,/"thinking"/);
});

test('new branches evict idle application roots but never evict busy lanes',async t=>{
  const pool=new ContextPool({runtime:await directory(),maxSessions:2});t.after(()=>pool.close());const credential={uid:'fixture',domain:'fixture'},signal=new AbortController().signal;
  let branch=0;const open=scope=>pool.acquire({model:'fixture',bridge_scope:scope,messages:[{role:'user',content:`branch-${++branch}`}]},credential,signal);
  const a=await open('app-a');a.record.sessionId='a';a.commit({}, {role:'assistant',content:'answer'});a.release();
  const b=await open('app-b');b.record.sessionId='b';b.commit({}, {role:'assistant',content:'answer'});b.release();
  // Idle roots are preferred over rejecting useful work; same-scope eviction
  // still preserves the other application's idle root when possible.
  const nextA=await open('app-a');t.after(()=>nextA.release());
  assert.equal(pool.records.size,2);assert.ok(!pool.records.has(a.record.id));assert.ok(pool.records.has(b.record.id));assert.ok(pool.records.has(nextA.record.id));
  const nextB=await open('app-b');t.after(()=>nextB.release());
  assert.equal(pool.records.size,2);assert.ok(!pool.records.has(b.record.id));assert.ok(pool.records.has(nextA.record.id));assert.ok(pool.records.has(nextB.record.id));
  await assert.rejects(open('app-c'),error=>error.code==='sessions_busy'&&error.details.busy===2&&error.details.awaiting===0&&error.details.idle===0);
  assert.deepEqual([...pool.records.keys()],[nextA.record.id,nextB.record.id]);
  nextA.release();nextB.release();
});

test('gateway usage is emitted once before terminal delivery and estimates remain separate',async()=>{
  const frames=[{choices:[{delta:{content:'中文'},finish_reason:null}]},{choices:[{delta:{},finish_reason:'stop'}]},{choices:[],usage:{prompt_tokens:100,completion_tokens:20},bridge_usage:{cached_tokens:80,cache_status:'estimated'}}];
  const raw=frames.map(f=>'data: '+JSON.stringify(f)+'\n\n').join('')+'data: [DONE]\n\n',bytes=Buffer.from(raw);
  const upstream=new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=5)c.enqueue(bytes.subarray(i,i+5));c.close();}}),{headers:{'content-type':'text/event-stream'}});
  const events=[],output=[];const response={write:text=>{if(text.includes('"finish_reason":"stop"'))assert.equal(events.length,1);output.push(text);return true;},end(){}};
  await relayCompletion(upstream,response,{signal:new AbortController().signal,includeUsage:false,model:'fixture',contextWindow:200000,onUsage:async event=>{await new Promise(r=>setTimeout(r,5));events.push(event);}});
  assert.equal(events.length,1);assert.equal(events[0].data.cached_tokens,80);assert.equal(events[0].data.cache_status,'estimated');assert.equal(events[0].data.context_window,200000);assert.match(output.join(''),/中文/);assert.doesNotMatch(output.join(''),/"usage"|bridge_usage|cached_tokens/);
});

test('identity verification is single-flight and bounded; an expired failed check does not trust stale data',async()=>{
  let now=1,loads=0,fail=false;const verifier=new CatalogVerifier(async()=>{loads++;await Promise.resolve();if(fail)throw new Error('offline');return [{id:'model',name:'Name'}];},{ttlMs:10,now:()=>now});
  await Promise.all(Array.from({length:5},()=>verifier.verify('model','Name')));assert.equal(loads,1);await verifier.verify('model','Name');assert.equal(loads,1);
  await assert.rejects(verifier.verify('model','Other'),/identity changed/);now=20;fail=true;await assert.rejects(verifier.verify('model','Name'),/offline/);assert.equal(loads,2);
});

test('truncated provider streams cannot release executable terminal frames',async()=>{
  const upstream=new Response('data: '+JSON.stringify({choices:[{delta:{tool_calls:[{index:0,id:'x',function:{name:'write',arguments:'{}'}}]},finish_reason:'tool_calls'}]})+'\n\n',{headers:{'content-type':'text/event-stream'}}),output=[];
  await assert.rejects(relayCompletion(upstream,{write:text=>{output.push(text);return true;},end(){}},{signal:new AbortController().signal}),/without \[DONE\]/);assert.equal(output.length,0);
});

test('gateway usage is journaled in the active run while duplicate native counts are ignored',async t=>{
  const store=await new Store(await directory()).open();await store.mutate(s=>{s.projects=[{id:'p',path:store.root}];});const gateway={},manager=new Sessions(store,{},gateway,[{id:'codex',installed:true}]);t.after(async()=>{await manager.close();await store.close();});
  const session=await manager.create({projectId:'p',runtimeId:'codex',selection:{modelKey:'native'}}),adapter={endpoint:{},close:async()=>{}};
  const run={id:'run',adapter,events:Promise.resolve(),approvals:new Set(),prepared:Promise.resolve(),continuations:0,stats:{requests:0,failedRequests:0,corrections:0}};manager.adapters.set(session.id,adapter);manager.runs.set(session.id,run);
  await manager.receive(session,adapter,{type:'usage',data:{prompt_tokens:5}});
  await gateway.onUsage(session.id,{type:'usage',source:'gateway',scope:'request',data:{prompt_tokens:10,completion_tokens:2}},gateway.requestContext(session.id));
  await gateway.onUsage(session.id,{type:'usage',source:'gateway',data:{}},'stale-run');
  const events=await store.events(session.id);assert.equal(events.length,1);assert.equal(events[0].turnId,'run');assert.equal(events[0].data.prompt_tokens,10);
});

test('native approval scopes map exactly to confirmed Codex and ACP options',async()=>{
  assert.equal(codexApprovalResult({method:'item/commandExecution/requestApproval'},'approve-session').decision,'acceptForSession');
  assert.equal(codexApprovalResult({method:'item/permissions/requestApproval',params:{permissions:{}}},'approve-session').scope,'session');
  const options=[{kind:'allow_once',optionId:'once'},{kind:'allow_always',optionId:'session'},{kind:'reject_once',optionId:'reject'}];assert.deepEqual(kimiPermissionChoices(options),['approve','approve-session','reject']);
  const adapter=new KimiAcpAdapter({}),responses=[];adapter.rpc={respond:(id,result)=>responses.push(result)};adapter.requests.set('p',{id:1,params:{options}});await adapter.approve('p','approve-session');assert.equal(responses[0].outcome.optionId,'session');
  for(const reason of ['max_tokens','max_turn_requests'])assert.equal(kimiStopStatus(reason),'interrupted');assert.equal(kimiStopStatus('refusal'),'failed');assert.equal(kimiStopStatus('end_turn'),'completed');assert.equal(kimiStopStatus('cancelled'),'interrupted');
});

test('native ownership blocks app writes; path refresh disposes idle adapters',async t=>{
  const store=await new Store(await directory()).open();await store.mutate(s=>{s.projects=[{id:'p',path:store.root}];});const manager=new Sessions(store,{},null,[{id:'codex',executable:'old',installed:true}]);t.after(async()=>{await manager.close();await store.close();});
  const session=await manager.create({projectId:'p',runtimeId:'codex',selection:{modelKey:'native'}}),claim=manager.claimNative(session.id),child=new EventEmitter();manager.trackNative(session.id,claim,child);
  await assert.rejects(manager.prompt(session.id,'conflicting task'),/原生窗口/);await assert.rejects(manager.updateRuntimes([{id:'codex',executable:'new'}]),/退出原生/);child.emit('close',0);
  let closed=false;manager.adapters.set(session.id,{close:async()=>{closed=true;}});await manager.updateRuntimes([{id:'codex',executable:'new'}]);assert.equal(closed,true);assert.equal(manager.adapters.size,0);
  session.nativeClientPid=process.pid;const restored=new Sessions(store,{},null,[{id:'codex',installed:true}]);assert.equal(restored.nativeBusy(session.id),true);restored.external.get(session.id).restoredPid=2147483647;assert.equal(restored.nativeBusy(session.id),false);
});

test('runtime version order, effort aliases and worker logs preserve semantics',async()=>{
  assert.ok(compareRuntimeVersions('0.10.0','0.9.0')>0);assert.ok(compareRuntimeVersions('1.0.0','1.0.0-beta.2')>0);
  const efforts=dshEfforts(['ultra','none']);assert.equal(efforts.off,'none');assert.equal(Object.values(efforts).length,2);
  const file=join(await directory(),'worker.log'),log=new WorkerLog(file);log.write(Buffer.from('Authorization: Bearer split-'));log.write(Buffer.from('secret\naccess_token="another-secret"\n'));await log.close();const text=await readFile(file,'utf8');assert.doesNotMatch(text,/split-secret|another-secret/);assert.match(text,/redacted/);
});
