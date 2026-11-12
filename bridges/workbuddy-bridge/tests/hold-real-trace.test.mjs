import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,FakeSession,toolRequest,resultRequest,waitFor} from './hold-fake.mjs';
import {traceToolStep,traceFinal} from './hold-real-trace.mjs';
class TraceSession extends FakeSession{
  toolStep(calls,options){return traceToolStep(this,calls,options);}
  final(text,options){return traceFinal(this,text,options);}
}
const read={name:'Read',parameters:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false},annotations:{readOnlyHint:true}};
const write={name:'Write',parameters:{type:'object',properties:{path:{type:'string'},text:{type:'string'}},required:['path','text'],additionalProperties:false}};
const reads=(count=4)=>Array.from({length:count},(_,i)=>({id:`chatcmpl-tool-read-${i}`,name:'mcp__host__Read',input:{path:`synthetic-${i}.txt`}}));
async function begin(t,tools=[read],cfg={}){
  const f=await fixture(t,{idleTimeoutMs:1000,...cfg},()=>{},TraceSession),request=toolRequest(tools),pending=f.infer(request);
  await waitFor(()=>f.sessions[0]?.prompts.length===1);return {...f,request,pending,session:f.sessions[0]};
}
test('R3 ordering hands four read-only calls to the host before held handlers return',async t=>{
  const f=await begin(t),calls=reads(),handlers=await f.session.toolStep(calls),first=await f.pending;
  assert.equal(first.reply?.kind,'tool_calls',JSON.stringify(first.report));
  assert.deepEqual(first.reply.calls.map(c=>[c.id,JSON.parse(c.arguments)]),calls.map(c=>[c.id,c.input]));
  assert.equal(f.session.handlers.length,4);assert.equal(first.report.native.calls,4);assert.equal(first.report.native.host_calls,4);
  assert.equal(first.report.native.model_responses,1);assert.ok(first.report.requests[0].tool_input_chars>0);
  let resolved=0;for(const handler of handlers)void handler.then(()=>resolved++);await new Promise(r=>setImmediate(r));assert.equal(resolved,0);
  const stops=f.session.nativeTrace.filter(e=>e.kind==='message_delta').map(e=>e.stop);assert.deepEqual(stops,['tool_use','end_turn']);
  const pre=f.session.nativeTrace.filter(e=>e.kind==='PreToolUse');assert.equal(pre.length,8);assert.deepEqual(pre.slice(0,4).map(e=>e.id),calls.map(c=>c.id));assert.ok(pre.slice(4).every(e=>!calls.some(c=>c.id===e.id)));
  const next=f.infer(resultRequest(f.request,first.reply,['A','B','C','D']));assert.deepEqual((await f.session.traceStepFinished).map(r=>r.content[0].text),['A','B','C','D']);
  assert.ok(f.session.nativeTrace.filter(e=>e.kind==='PostToolUse').every(e=>e.id.startsWith('00000000-')));
  f.session.final('Done.');const final=await next;assert.equal(final.reply.content,'Done.');assert.equal(final.report.native.model_responses,1);assert.equal(f.session.prompts.length,1);
});
test('R3 ordering returns both writes while the second handler waits for the first result',async t=>{
  const f=await begin(t,[write]),calls=[{id:'write-a',name:'mcp__host__Write',input:{path:'a',text:'A'}},{id:'write-b',name:'mcp__host__Write',input:{path:'b',text:'B'}}];
  const entered=await f.session.toolStep(calls),first=await f.pending;assert.equal(first.reply?.calls.length,2,JSON.stringify(first.report));
  assert.equal(f.session.handlers.length,1);assert.equal(entered.length,1);
  const next=f.infer(resultRequest(f.request,first.reply,['first result','second result']));
  assert.equal((await entered[0]).content[0].text,'first result');await waitFor(()=>f.session.handlers.length===2);
  assert.equal((await f.session.handlers[1]).content[0].text,'second result');await f.session.traceStepFinished;
  const kinds=f.session.nativeTrace.filter(e=>['handler-enter','handler-leave'].includes(e.kind)).map(e=>e.kind);assert.deepEqual(kinds,['handler-enter','handler-leave','handler-enter','handler-leave']);
  f.session.final('Written.');assert.equal((await next).reply.content,'Written.');
});
test('R3 ordering supports another native step, result refill and final answer in one V2 session',async t=>{
  const f=await begin(t),h1=await f.session.toolStep(reads(2)),first=await f.pending,nextRequest=resultRequest(f.request,first.reply,['one','two']);
  const second=f.infer(nextRequest);await Promise.all(h1);await f.session.traceStepFinished;
  const step2=[{id:'step-two',name:'mcp__host__Read',input:{path:'dependent-on-one'}}],h2=await f.session.toolStep(step2),reply2=await second;
  assert.equal(reply2.reply.calls[0].id,'step-two');const final=f.infer(resultRequest(nextRequest,reply2.reply,['three']));assert.equal((await h2[0]).content[0].text,'three');await f.session.traceStepFinished;
  f.session.final('Complete.');const completed=await final;assert.equal(completed.reply.content,'Complete.');assert.equal(f.sessions.length,1);assert.equal(f.session.prompts.length,1);
});
test('assistant call IDs and arguments stay authoritative when stream IDs differ',async t=>{
  const f=await begin(t),calls=reads(),assistantOrder=[...calls].reverse();
  const handlers=await f.session.toolStep(calls,{streamIds:calls.map((_,i)=>'different-stream-id-'+i),assistantOrder}),first=await f.pending;
  assert.deepEqual(first.reply.calls.map(c=>c.id),assistantOrder.map(c=>c.id));
  assert.deepEqual(first.reply.calls.map(c=>JSON.parse(c.arguments)),assistantOrder.map(c=>c.input));
  assert.equal(first.report.native.model_responses,1);assert.equal(first.report.client_usage.prompt_tokens,4663);
  assert.equal(first.report.client_usage.completion_tokens,119);assert.equal(first.report.client_usage.cache_creation_input_tokens,1335);
  assert.deepEqual(first.report.requests[0].stop_reasons,['tool_use','end_turn']);assert.equal(first.report.requests[0].stop_reason,'tool_use');
  assert.equal(first.report.requests[0].upstream_message_ids.length,6);
  const nextRequest=resultRequest(f.request,first.reply,first.reply.calls.map(c=>'result for '+JSON.parse(c.arguments).path));
  nextRequest.messages.splice(-4,4,...nextRequest.messages.slice(-4).reverse());
  const next=f.infer(nextRequest);assert.deepEqual((await Promise.all(handlers)).map(r=>r.content[0].text),calls.map(c=>'result for '+c.input.path));
  await f.session.traceStepFinished;f.session.final('Done.');assert.equal((await next).reply.content,'Done.');
});
test('exact tool IDs are reserved before fallback pairing of the remaining calls',async t=>{
  const f=await begin(t),calls=reads(2),handlers=await f.session.toolStep(calls,{streamIds:[calls[1].id,'unknown-stream-id']}),first=await f.pending;
  assert.deepEqual(first.reply.calls.map(c=>c.id),[calls[1].id,calls[0].id]);
  const next=f.infer(resultRequest(f.request,first.reply,['B','A']));assert.deepEqual((await Promise.all(handlers)).map(r=>r.content[0].text),['A','B']);
  await f.session.traceStepFinished;f.session.final('Done.');await next;
});
test('the host receives no partial batch while the fourth assistant call is still missing',async t=>{
  const f=await begin(t),calls=reads();let release;const gate=new Promise(r=>release=r);let dispatched=false;
  void f.pending.then(()=>{dispatched=true;});const emitting=f.session.toolStep(calls,{beforeAssistant:async index=>{if(index===3)await gate;}});
  await waitFor(()=>f.session.nativeTrace.filter(e=>e.kind==='assistant').length===4);await new Promise(r=>setImmediate(r));
  assert.equal(dispatched,false);assert.equal(f.session.handlers.length,0);
  release();await emitting;const first=await f.pending;assert.equal(first.reply.calls.length,4);
});
test('UUID PostToolUse hooks stop an oversized handoff after the last real call',async t=>{
  const f=await begin(t,[read],{nativeResultCharLimit:20}),calls=reads(2);await f.session.toolStep(calls);const first=await f.pending;
  const output='Full synthetic output '.repeat(10),next=f.infer(resultRequest(f.request,first.reply,[output,'small']));
  const results=await f.session.traceStepFinished;assert.match(results[0].content[0].text,/complete output follows/);
  assert.equal(f.session.tracePosts.length,2);assert.equal(f.session.tracePosts[0].continue,undefined);assert.equal(f.session.tracePosts[1].continue,false);
  f.session.result();await waitFor(()=>f.session.prompts.length===2);assert.ok(f.session.prompts[1].message.content.includes(output));
  f.session.final('Done.');const completed=await next;assert.equal(completed.report.native.handoff_stop,true);assert.equal(completed.report.native.oversized_results,1);
});
test('late snapshots of the held response do not create another response in a result window',async t=>{
  const f=await begin(t);await f.session.toolStep(reads(1));const first=await f.pending;
  f.session.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'end_turn'},usage:{input_tokens:999999,output_tokens:999}}});
  f.session.emit({type:'assistant',uuid:'late-empty',message:{id:'late-assistant-id',model:f.request.model,content:[]}});
  const next=f.infer(resultRequest(f.request,first.reply,['host result']));await f.session.traceStepFinished;f.session.final('Done.');
  const completed=await next;assert.equal(completed.reply.content,'Done.');assert.equal(completed.report.native.model_responses,1);assert.equal(completed.report.client_usage.prompt_tokens,4818);
});
