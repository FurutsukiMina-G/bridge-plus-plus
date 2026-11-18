import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {config} from '../src/config.mjs';
import {SdkTransport} from '../src/sdk-transport.mjs';
import {Completion,sseEvents} from '../src/protocol.mjs';
import {credential,FakeSession,model,toolRequest} from './hold-fake.mjs';

const request={model,bridge_scope:'app',max_tokens:1000,messages:[{role:'user',content:'Synthetic first request'}]};
const oneShot=content=>({...request,messages:[{role:'user',content}]});
const continued=(body,text)=>({...body,messages:[...body.messages,{role:'assistant',content:'OK'},{role:'user',content:text}]});
async function until(check){
  const deadline=performance.now()+5000;
  while(!check()&&performance.now()<deadline)await new Promise(resolve=>setImmediate(resolve));
  assert.ok(check(),'waiting for fake runtime');
}
async function ready(transport){
  await until(()=>transport.blank.size>0);
  await Promise.all([...transport.blank.entries.values()].map(entry=>entry.handle.ready));
}
async function fixture(t,overrides={}){
  const runtime=await mkdtemp(join(tmpdir(),'wb-blank-policy-')),runs=[],sessions=[];
  const run=({options,prompt})=>{
    const row={options,warm:typeof prompt!=='string',closed:0},session_id='synthetic-'+runs.length;
    runs.push(row);
    const query=(async function*(){
      row.prompt=typeof prompt==='string'?prompt:(await prompt[Symbol.asyncIterator]().next()).value?.message.content;
      yield {type:'system',subtype:'init',model,session_id,mcp_servers:[]};
      yield {type:'assistant',message:{model,content:[{type:'text',text:'OK'}]}};
      yield {type:'result',subtype:'success',is_error:false,session_id};
    })();
    return Object.assign(query,{connect:async()=>{},cleanup:()=>{row.closed++;}});
  };
  const transport=new SdkTransport({...config({}),runtime,cliPath:process.execPath,...overrides},{get:async()=>credential},{run,
    createSession:options=>{const session=new FakeSession(options);sessions.push(session);return session;}});
  t.after(async()=>{await transport.close();await rm(runtime,{recursive:true,force:true});});
  const chat=async body=>{
    const response=await transport.chat(body,new AbortController().signal),completion=new Completion(model);
    for await(const frame of sseEvents(response.body))completion.accept(frame,model);
    completion.validate(body.tools);return response.bridgeMetrics;
  };
  return {transport,runs,sessions,chat};
}

test('WorkBuddy blank defaults are ten minutes and one slot, with configurable timings and cap',()=>{
  const defaults=config({});
  assert.equal(defaults.prewarmMs,600000);assert.equal(defaults.blankWarmDemandMs,600000);
  assert.equal(defaults.maxBlankWarm,1);assert.equal(defaults.resumePrewarmMs,120000);
  const configured=config({WORKBUDDY_PREWARM_MS:'100',WORKBUDDY_WARM_DEMAND_MS:'250',WORKBUDDY_MAX_BLANK_WARM:'2'});
  assert.equal(configured.prewarmMs,100);assert.equal(configured.resumePrewarmMs,100);
  assert.equal(configured.blankWarmDemandMs,250);assert.equal(configured.maxBlankWarm,2);
});

test('WorkBuddy consumes and replaces blanks for distinct one-shots, then stops refilling during resumed turns',async t=>{
  const f=await fixture(t);
  t.mock.timers.enable({apis:['Date','setTimeout']});
  assert.equal(f.runs.length,0);
  await f.chat(request);await ready(f.transport);
  const second=oneShot('Isolated second request');
  assert.equal((await f.chat(second)).warmStart,true);
  await ready(f.transport);
  assert.equal(f.runs.filter(row=>row.warm).length,2);
  assert.equal(f.runs[1].options.resume,undefined);
  assert.match(f.runs[1].prompt,/Isolated second request/);
  assert.doesNotMatch(f.runs[1].prompt,/Synthetic first request/);
  // A local replay never creates another runtime or moves the demand timestamp.
  assert.equal((await f.chat(second)).localReplay,true);
  let body=second;
  for(let minute=2;minute<=14;minute+=2){
    t.mock.timers.tick(120000);
    body=continued(body,`Next ${minute}`);
    const turn=await f.chat(body);
    assert.equal(turn.historyMode,'delta');
    assert.equal(f.transport.blank.size,minute<10?1:0);
    assert.equal(f.runs.filter(row=>row.warm).length,2);
  }
  assert.ok(f.runs[2].closed>0);
});

test('WorkBuddy only replenishes an expired replay blank inside the real demand window',async t=>{
  const f=await fixture(t,{prewarmMs:100,blankWarmDemandMs:200});
  t.mock.timers.enable({apis:['Date','setTimeout']});
  await f.chat(request);await ready(f.transport);
  t.mock.timers.tick(100);await ready(f.transport);
  assert.equal(f.runs.length,3);assert.ok(f.runs[1].closed);
  t.mock.timers.tick(100);await Promise.resolve();
  assert.equal(f.runs.length,3);assert.ok(f.runs[2].closed);assert.equal(f.transport.blank.size,0);
});

test('WorkBuddy can reserve two compatible blanks by startup options when configured',async t=>{
  const f=await fixture(t,{maxBlankWarm:2}),other={...oneShot('Different effort'),reasoning_effort:'high'};
  await f.chat(request);await ready(f.transport);
  await f.chat(other);await until(()=>f.transport.blank.size===2);await ready(f.transport);
  const hit=await f.chat({...oneShot('Reuse the high-effort blank'),reasoning_effort:'high'});
  assert.equal(hit.warmStart,true);
  await until(()=>f.transport.blank.size===2);
  assert.equal(f.transport.blank.stats.used,1);
});

test('WorkBuddy hold continuations do not extend the blank demand window',async t=>{
  const f=await fixture(t);
  t.mock.timers.enable({apis:['Date','setTimeout']});
  let body=toolRequest();
  for(let minute=0;minute<=12;minute+=2){
    if(minute)t.mock.timers.tick(120000);
    const turn=f.chat(body);
    await until(()=>f.sessions[0]?.prompts.length===minute/2+1);
    f.sessions[0].final('OK');
    assert.equal((await turn).native.window,minute?'continue':'new');
    if(!minute)await until(()=>f.transport.hold.stats().warm_ready===1);
    assert.equal(f.sessions.length,2);
    assert.equal(f.transport.hold.stats().warm_ready,minute<10?1:0);
    body=continued(body,`Next ${minute}`);
  }
  assert.equal(f.sessions[1].closed,1);
  assert.equal(f.sessions[0].closed,0);
});

test('WorkBuddy lets one-shots claim spare capacity from hold without disturbing the active session',async t=>{
  const f=await fixture(t),main=toolRequest();
  const first=f.chat(main);await until(()=>f.sessions[0]?.prompts.length===1);f.sessions[0].final('OK');await first;
  await until(()=>f.transport.hold.stats().warm_ready===1);
  await f.chat(request);await ready(f.transport);
  assert.equal(f.transport.hold.stats().warm_ready,0);
  assert.equal(f.transport.blank.size,1);
  assert.equal((await f.chat(oneShot('Auxiliary after hold'))).warmStart,true);
  await ready(f.transport);
  const next=f.chat(continued(main,'Host follow-up'));
  await until(()=>f.sessions[0]?.prompts.length===2);f.sessions[0].final('OK');
  assert.equal((await next).native.window,'continue');
  assert.equal(f.transport.hold.stats().warm_pending,0);assert.equal(f.sessions[1].closed,1);
});
