import test from 'node:test';
import assert from 'node:assert/strict';
import {QoderPool} from '../src/pool.js';
import {nativeConfig,toolRequest,resultRequest,fakeStarter,FakeRuntime,waitFor} from './native-fake.js';
import {NativeTrace,type TraceCall} from './native-real-trace.js';

const reads=(count=4):TraceCall[]=>Array.from({length:count},(_,i)=>({id:`chatcmpl-tool-${i}`,name:'mcp__host__Read',input:{path:`synthetic-${i}.txt`}}));
async function begin(t:{after(fn:()=>void):unknown}){
  const runtimes:FakeRuntime[]=[],pool=new QoderPool(nativeConfig({idleTimeoutMs:1000}),fakeStarter(runtimes));t.after(()=>pool.closeAll());
  const request=toolRequest(),pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);
  return {pool,request,pending,runtime:runtimes[0]!,trace:new NativeTrace(runtimes[0]!)};
}
test('four readonly calls survive dual stops, empty/split assistants and message ID aliases',async t=>{
  const f=await begin(t),calls=reads(),{id,entered}=await f.trace.step(calls),first=await f.pending;
  assert.equal(first.reply?.kind,'tool_calls',JSON.stringify(first.report));
  assert.deepEqual(first.reply.calls.map((c:any)=>[c.id,JSON.parse(c.arguments)]),calls.map(c=>[c.id,c.input]));
  assert.equal(f.runtime.handlers.length,4);let settled=0;for(const handler of entered)void handler.then(()=>settled++);await new Promise(r=>setImmediate(r));assert.equal(settled,0);
  assert.equal(first.report.native.host_calls,4);assert.equal(first.report.native.model_responses,1);assert.equal(first.report.requests[0].id,id);assert.ok(first.report.requests[0].tool_input_chars>0);
  assert.equal(first.report.requests[0].stop_reason,'tool_use');assert.deepEqual(first.report.requests[0].stop_reasons,['tool_use','end_turn']);
  assert.deepEqual(f.trace.events.filter(e=>e.kind==='message_delta').map(e=>e.stop),['tool_use','end_turn']);
  assert.equal(f.trace.events.filter(e=>e.kind==='PreToolUse').length,8);
  const next=f.pool.infer(resultRequest(f.request,first.reply,['A','B','C','D']));assert.deepEqual((await f.trace.finished).map(r=>r.content[0].text),['A','B','C','D']);
  assert.ok(f.trace.events.filter(e=>e.kind==='PostToolUse').every(e=>e.id?.startsWith('00000000-')));
  f.trace.final('Done.');assert.equal((await next).reply.content,'Done.');assert.equal(f.runtime.prompts.length,1);
});
test('multiple dual-stop steps refill results and finish within the existing runtime',async t=>{
  const f=await begin(t);await f.trace.step(reads(2));const first=await f.pending,nextRequest=resultRequest(f.request,first.reply,['one','two']);
  const second=f.pool.infer(nextRequest);await f.trace.finished;
  await f.trace.step([{id:'step-two',name:'mcp__host__Read',input:{path:'dependent'}}]);const reply2=await second;assert.equal(reply2.reply.calls[0].id,'step-two');
  const final=f.pool.infer(resultRequest(nextRequest,reply2.reply,['three']));await f.trace.finished;f.trace.final('Complete.');assert.equal((await final).reply.content,'Complete.');assert.equal(f.runtime.prompts.length,1);
});
test('assistant IDs and arguments win when every announced tool ID differs',async t=>{
  const f=await begin(t),calls=reads(),assistantOrder=[...calls].reverse();await f.trace.step(calls,{streamIds:calls.map((_,i)=>`unknown-${i}`),assistantOrder});const first=await f.pending;
  assert.deepEqual(first.reply.calls.map((c:any)=>c.id),assistantOrder.map(c=>c.id));assert.deepEqual(first.reply.calls.map((c:any)=>JSON.parse(c.arguments)),assistantOrder.map(c=>c.input));
  const next=f.pool.infer(resultRequest(f.request,first.reply,first.reply.calls.map((c:any)=>'result for '+JSON.parse(c.arguments).path)));
  assert.deepEqual((await f.trace.finished).map(r=>r.content[0].text),calls.map(c=>'result for '+c.input.path));f.trace.final('Done.');await next;
});
test('exact IDs are reserved before pairing the remaining complete calls by order',async t=>{
  const f=await begin(t),calls=reads(2);await f.trace.step(calls,{streamIds:[calls[1]!.id,'unknown-id']});const first=await f.pending;
  assert.deepEqual(first.reply.calls.map((c:any)=>c.id),[calls[1]!.id,calls[0]!.id]);
  const next=f.pool.infer(resultRequest(f.request,first.reply,['B','A']));assert.deepEqual((await f.trace.finished).map(r=>r.content[0].text),['A','B']);f.trace.final('Done.');await next;
});
test('an incomplete split batch never dispatches before the last complete assistant call',async t=>{
  const f=await begin(t);let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let dispatched=false;void f.pending.then(()=>{dispatched=true;});
  const emitting=f.trace.step(reads(),{beforeAssistant:async index=>{if(index===3)await gate;}});
  await waitFor(()=>f.trace.events.filter(e=>e.kind==='assistant').length===4);await new Promise(r=>setImmediate(r));assert.equal(dispatched,false);assert.equal(f.runtime.handlers.length,0);
  release();await emitting;assert.equal((await f.pending).reply.calls.length,4);
});
test('a turn that ends with missing complete assistant calls fails closed',async t=>{
  const f=await begin(t),calls=reads();await f.trace.step(calls,{assistantOrder:calls.slice(0,3)});
  f.runtime.result();const completed=await f.pending;
  assert.equal(completed.reply,null);assert.match(completed.report.error,/all announced tool calls/);assert.equal(completed.report.native.host_calls,0);
  assert.equal(f.runtime.closed,1);assert.equal(f.pool.stats().native.sessions,0);
});
test('an overfull assistant snapshot cannot dispatch an apparently valid partial batch',async t=>{
  const f=await begin(t),id='overfull-stream',calls=reads(3);
  f.runtime.emit({type:'stream_event',event:{type:'message_start',message:{id}}});
  for(const call of calls.slice(0,2))f.runtime.emit({type:'stream_event',event:{type:'content_block_start',content_block:{type:'tool_use',id:call.id,name:call.name}}});
  f.runtime.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'tool_use'}}});
  f.runtime.emit({type:'assistant',uuid:'overfull',message:{id:'different-overfull-id',content:calls.map(call=>({type:'tool_use',...call}))}});
  const completed=await f.pending;assert.equal(completed.reply,null);assert.match(completed.report.error,/call count exceeds/);assert.equal(completed.report.native.host_calls,0);assert.equal(f.runtime.closed,1);
});
test('the existing single-stop same-ID path keeps the same host reply and client usage',async t=>{
  const old=await begin(t),variant=await begin(t),calls=reads(2);
  const handlers=await old.runtime.toolStep(calls);await variant.trace.step(calls);
  const a=await old.pending,b=await variant.pending;assert.deepEqual(a.reply,b.reply);assert.deepEqual(a.report.client_usage,b.report.client_usage);
  assert.equal(a.report.credits_delta,b.report.credits_delta);assert.equal(a.report.native.model_responses,1);assert.equal(b.report.native.model_responses,1);
  assert.equal(a.report.requests[0].id,'response-1');assert.deepEqual(a.report.requests[0].stop_reasons,['tool_use']);
  const nextA=old.pool.infer(resultRequest(old.request,a.reply,['A','B'])),nextB=variant.pool.infer(resultRequest(variant.request,b.reply,['A','B']));
  await Promise.all(handlers);await variant.trace.finished;old.runtime.final('Done.');variant.trace.final('Done.');
  assert.deepEqual((await nextA).reply,(await nextB).reply);
});
test('changed UUID post-hook IDs preserve oversized handoff without changing exact-ID hooks',async t=>{
  const runtimes:FakeRuntime[]=[],pool=new QoderPool(nativeConfig({nativeResultCharLimit:20}),fakeStarter(runtimes));t.after(()=>pool.closeAll());
  const request=toolRequest(),firstPending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!,trace=new NativeTrace(runtime);
  await trace.step(reads(2));const first=await firstPending,output='Complete synthetic output '.repeat(10),next=pool.infer(resultRequest(request,first.reply,[output,'small']));
  const results=await trace.finished;assert.match(results[0].content[0].text,/complete output follows/);assert.equal(trace.posts[0].continue,undefined);assert.equal(trace.posts[1].continue,false);
  runtime.result();await waitFor(()=>runtime.prompts.length===2);assert.ok(runtime.prompts[1].message.content.includes(output));trace.final('Done.');
  const completed=await next;assert.equal(completed.reply.content,'Done.');assert.equal(completed.report.native.handoff_stop,true);assert.equal(completed.report.native.oversized_results,1);
});
