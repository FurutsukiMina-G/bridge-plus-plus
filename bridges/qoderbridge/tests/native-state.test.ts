import test from 'node:test';
import assert from 'node:assert/strict';
import {QoderPool} from '../src/pool.js';
import {nativeConfig,toolRequest,resultRequest,FakeRuntime,fakeStarter,waitFor} from './native-fake.js';

const twoTools=[{name:'Read',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']}},{name:'Write',parameters:{type:'object',properties:{text:{type:'string'}},required:['text']}}];
async function started(pool:QoderPool,request:ReturnType<typeof toolRequest>,runtimes:FakeRuntime[],hooks:Parameters<QoderPool['infer']>[1]={}){
  const pending=pool.infer(request,hooks);await waitFor(()=>runtimes.some(r=>r.prompts.length>0));return{pending};
}

test('parallel native calls keep exact arguments, suspend handlers, resume with results and replay locally',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));const request=toolRequest(twoTools);
  try{
    const{pending:firstPending}=await started(pool,request,runtimes);const runtime=runtimes[0]!;
    const special='quote " slash \\ 中文 $false <｜｜DSML｜｜>'+ '长'.repeat(80);
    const handlers=await runtime.toolStep([{id:'call_real_1',name:'Read',input:{path:special}},{id:'call_real_2',name:'mcp__host__Write',input:{text:special}}]);
    const first=await firstPending;assert.equal(first.reply.kind,'tool_calls');
    assert.deepEqual(first.reply.calls.map((c:any)=>c.id),['call_real_1','call_real_2']);
    assert.deepEqual(first.reply.calls.map((c:any)=>c.name),['Read','Write']);
    assert.deepEqual(JSON.parse(first.reply.calls[0].arguments),{path:special});assert.deepEqual(JSON.parse(first.reply.calls[1].arguments),{text:special});
    let settled=0;void handlers[0]!.then(()=>{settled++;});await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,0);
    const next=resultRequest(request,first.reply,['one','[tool error] two']);const secondPending=pool.infer(next);
    const results=await Promise.all(handlers);assert.equal(results[0]!.content[0].text,'one');assert.equal(results[1]!.isError,true);
    runtime.final('finished',['fin','ished']);const second=await secondPending;assert.deepEqual(second.reply,{kind:'final',content:'finished',finish:'stop'});
    assert.equal(runtime.prompts.length,1,'normal host results use MCP, not another user message');
    const replay=await pool.infer(next);assert.equal(replay.report.stage,'native_replay');assert.equal(replay.report.model_requests,0);assert.equal(runtime.prompts.length,1);
    assert.equal(pool.stats().native.replays,1);
  }finally{pool.closeAll();}
});

test('serial handler entry still binds by name and input',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));const request=toolRequest(twoTools);
  try{
    const{pending}=await started(pool,request,runtimes);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'s1',name:'Read',input:{path:'a'}},{id:'s2',name:'Read',input:{path:'b'}}],{serial:true});
    assert.equal(handlers.length,1);const first=await pending;const secondPending=pool.infer(resultRequest(request,first.reply,['A','B']));
    const firstResult=await handlers[0]!;assert.equal(firstResult.content[0].text,'A');
    await waitFor(()=>runtime.handlers.length===2);const secondResult=await runtime.handlers[1]!;assert.equal(secondResult.content[0]?.type,'text');assert.equal(secondResult.content[0]?.type==='text'?secondResult.content[0].text:null,'B');
    runtime.final('ok');await secondPending;
  }finally{pool.closeAll();}
});

test('oversized results return receipts, stop after the last PostToolUse and push full output',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeResultCharLimit:20}),fakeStarter(runtimes));const request=toolRequest();
  try{
    const{pending}=await started(pool,request,runtimes);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'large',name:'Read',input:{path:'x'}}]);const first=await pending;
    const text='完整输出 " \\ '.repeat(20);const secondPending=pool.infer(resultRequest(request,first.reply,[text]));
    const handlerResult=await handlers[0]!;assert.match(handlerResult.content[0].text,/complete output follows/);
    const post=await runtime.post();assert.equal(post.continue,false);runtime.result();
    await waitFor(()=>runtime.prompts.length===2);const follow=runtime.prompts[1]!.message.content;
    assert.equal(typeof follow,'string');assert.ok(follow.includes(text));assert.ok(follow.includes('Read (large)'));
    runtime.final('done');const second=await secondPending;assert.equal(second.reply.kind,'final');
    assert.equal(second.report.native.oversized_results,1);assert.equal(second.report.native.handoff_stop,true);assert.equal(pool.stats().native.handoff_stops,1);
  }finally{pool.closeAll();}
});

test('trailing user text and image are held for the follow-up SDK content blocks',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));const request=toolRequest();
  try{
    const{pending}=await started(pool,request,runtimes);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'c1',name:'Read',input:{path:'x'}}]);const first=await pending;
    const next=resultRequest(request,first.reply,['ok']);next.messages.push({role:'user',content:[{type:'text',text:'new image'},{type:'image_url',image_url:{url:'data:image/png;base64,AA=='}}]});
    const secondPending=pool.infer(next);await handlers[0]!;await runtime.post();runtime.result();await waitFor(()=>runtime.prompts.length===2);
    const content=runtime.prompts[1]!.message.content;assert.ok(Array.isArray(content));assert.ok(content.some((p:any)=>p.type==='image'));assert.ok(content.some((p:any)=>p.type==='text'&&p.text.includes('new image')));
    runtime.final('seen');assert.equal((await secondPending).reply.content,'seen');
  }finally{pool.closeAll();}
});

test('tool changes and rewritten history rebuild; idle reasoning changes reuse the runtime',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));const request=toolRequest();
  try{
    let{pending}=await started(pool,request,runtimes);runtimes[0]!.final('one');await pending;
    const continued={...request,messages:[...request.messages,{role:'assistant' as const,content:'one'},{role:'user' as const,content:'next'}]};
    pending=pool.infer(continued,{reasoningEffort:'high'});await waitFor(()=>runtimes[0]!.prompts.length===2);assert.equal(runtimes.length,1);
    runtimes[0]!.final('two');const reused=await pending;assert.equal(reused.report.reused_session,true);
    assert.equal(runtimes[0]!.options.resolveModel({purpose:'main',availableModels:runtimes[0]!.models}).parameters.reasoningEffort,undefined,'policy is reset after the turn');
    assert.ok(runtimes[0]!.q && reused.record.runtime.policyCalls.some((p:any)=>p.reasoning_effort==='high'));
    const changed=toolRequest([{name:'Other'}]);const changedPending=pool.infer(changed);await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    assert.equal(runtimes[0]!.closed,1);runtimes[1]!.final('other');const rebuilt=await changedPending;assert.equal(rebuilt.report.native.window,'new');
    const rewritten=toolRequest();rewritten.messages=[{role:'user',content:'compacted history'}];const rewritePending=pool.infer(rewritten);
    await waitFor(()=>runtimes.length===3&&runtimes[2]!.prompts.length===1);runtimes[2]!.final('compact');await rewritePending;
    assert.ok(pool.stats().native.rebuilds>=2);
  }finally{pool.closeAll();}
});

test('changing reasoning while awaiting host results rebuilds before resolving old handlers',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));const request=toolRequest();
  try{
    const{pending}=await started(pool,request,runtimes);const old=runtimes[0]!;const handlers=await old.toolStep([{id:'old',name:'Read',input:{path:'x'}}]);const first=await pending;
    const next=resultRequest(request,first.reply,['ignored']);const secondPending=pool.infer(next,{reasoningEffort:'high'});
    await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);assert.equal((await handlers[0]!).isError,true);assert.equal(old.closed,1);
    runtimes[1]!.final('new');const second=await secondPending;assert.equal(second.reply.content,'new');assert.equal(second.report.native.rebuild_reason,'superseded');
  }finally{pool.closeAll();}
});

test('invalid arguments are resolved locally and repeated invalid rounds fail in the decision stage',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeInvalidRounds:3}),fakeStarter(runtimes));const request=toolRequest();
  try{
    const{pending}=await started(pool,request,runtimes);const runtime=runtimes[0]!;
    for(let round=0;round<3;round++){
      const handlers=await runtime.toolStep([{id:`bad${round}`,name:'Read',input:{}}]);const result=await handlers[0]!;
      assert.equal(result.isError,true);assert.match(result.content[0].text,/Arguments do not match/);
    }
    const completed=await pending;assert.equal(completed.reply,null);assert.equal(completed.report.stage,'native_invalid_calls');assert.equal(completed.report.native.invalid_calls,3);
  }finally{pool.closeAll();}
});

test('protocol text is gated, corrected once and then fails closed',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));const request=toolRequest();const streamed:string[]=[];
  try{
    const{pending}=await started(pool,request,runtimes,{onText:text=>streamed.push(text)});const runtime=runtimes[0]!;
    runtime.final('{"kind":"tool_calls","calls":[]}');await waitFor(()=>runtime.prompts.length===2);assert.deepEqual(streamed,[]);
    assert.match(runtime.prompts[1]!.message.content,/native function calling/);runtime.final('{"kind":"tool_calls","calls":[]}');
    const completed=await pending;assert.equal(completed.report.stage,'native_protocol_text');assert.deepEqual(streamed,[]);
  }finally{pool.closeAll();}
});

test('cancellation interrupts and drains, resolves pending handlers and leaves the session reusable',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));const request=toolRequest();
  try{
    const{pending}=await started(pool,request,runtimes);const runtime=runtimes[0]!;const handlers=await runtime.toolStep([{id:'cancel',name:'Read',input:{path:'x'}}]);await pending;
    const controller=new AbortController();const next=resultRequest(request,{kind:'tool_calls',content:'',calls:[{id:'cancel',name:'Read',arguments:'{"path":"x"}'}]},['ok']);
    // Keep the next model response pending until the client disconnects.
    const active=pool.infer(next,{signal:controller.signal});await handlers[0]!;controller.abort(new Error('test disconnect'));
    const cancelled=await active;assert.equal(cancelled.report.stage,'cancelled_or_timeout');assert.equal(runtime.interrupts,1);assert.equal(pool.stats().native.awaiting,0);
    const follow={...next,messages:[...next.messages,{role:'user' as const,content:'continue'}]};const followPending=pool.infer(follow);
    await waitFor(()=>runtime.prompts.length===2);runtime.final('after cancel');assert.equal((await followPending).reply.content,'after cancel');
  }finally{pool.closeAll();}
});

test('different bridge scopes keep concurrent handlers and results isolated',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const a={...toolRequest(),prompt_cache_key:'a',bridge_scope:'scope-a'},b={...toolRequest(),prompt_cache_key:'b',bridge_scope:'scope-b'};
  try{
    const pa=pool.infer(a);await waitFor(()=>runtimes[0]?.prompts.length===1);const pb=pool.infer(b);await waitFor(()=>runtimes.length===2&&runtimes.every(r=>r.prompts.length===1));
    const ha=await runtimes[0]!.toolStep([{id:'a1',name:'Read',input:{path:'a'}}]);const hb=await runtimes[1]!.toolStep([{id:'b1',name:'Read',input:{path:'b'}}]);
    const ra=await pa,rb=await pb;const p2a=pool.infer(resultRequest(a,ra.reply,['result a'])),p2b=pool.infer(resultRequest(b,rb.reply,['result b']));
    assert.equal((await ha[0]!).content[0].text,'result a');assert.equal((await hb[0]!).content[0].text,'result b');
    runtimes[0]!.final('A');runtimes[1]!.final('B');assert.equal((await p2a).reply.content,'A');assert.equal((await p2b).reply.content,'B');
  }finally{pool.closeAll();}
});


test('mixed invalid and valid calls stop an oversized handoff after the real host hooks',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeResultCharLimit:20}),fakeStarter(runtimes));const request=toolRequest(twoTools);
  try{
    const{pending}=await started(pool,request,runtimes);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'invalid',name:'Read',input:{}},{id:'valid',name:'Write',input:{text:'x'}}]);const first=await pending;
    assert.equal(first.reply.calls.length,1);assert.equal(first.reply.calls[0].id,'valid');
    const secondPending=pool.infer(resultRequest(request,first.reply,['full output '.repeat(10)]));
    assert.equal((await handlers[0]!).isError,true);assert.match((await handlers[1]!).content[0].text,/complete output follows/);
    const post=await runtime.postToolUse();assert.equal(post.continue,false);runtime.result();
    await waitFor(()=>runtime.prompts.length===2);runtime.final('done');const second=await secondPending;
    assert.equal(second.reply.content,'done');assert.equal(second.report.native.handoff_stop,true);
    assert.equal(first.report.requests[0].tool_input_chars>0,true);
  }finally{pool.closeAll();}
});
