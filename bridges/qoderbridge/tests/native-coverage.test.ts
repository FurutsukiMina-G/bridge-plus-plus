import test from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import type {Server} from 'node:http';
import {QoderPool} from '../src/pool.js';
import {createBridgeServer} from '../src/server.js';
import {nativeSkipReason,nativeEligible} from '../src/native-lane.js';
import {ChatRequest} from '../src/compat.js';
import {finalAnswer,answerInstructions} from '../src/final-answer.js';
import {nativeConfig,toolRequest,resultRequest,fakeStarter,waitFor,FakeRuntime} from './native-fake.js';

const twoTools=[
  {name:'Read',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']}},
  {name:'Write',parameters:{type:'object',properties:{text:{type:'string'}},required:['text']}},
];
const raw=(overrides:Record<string,unknown>={})=>({model:'qoder-deepseek-flash',
  messages:[{role:'user',content:'Inspect the file'}],
  tools:[{type:'function',function:twoTools[0]}],tool_choice:'auto' as const,...overrides});
const parse=(overrides:Record<string,unknown>={})=>ChatRequest.parse(raw(overrides));
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));

test('native_skip_reason names exactly one real condition per tool-carrying request',()=>{
  const config=nativeConfig();
  assert.equal(nativeSkipReason(parse(),{...config,toolMode:'json'}),'tool_mode_json');
  assert.equal(nativeSkipReason(parse({tools:undefined}),config),'no_tools');
  assert.equal(nativeSkipReason(parse({tool_choice:'none'}),config),'tool_choice_none');
  assert.equal(nativeSkipReason(parse({response_format:{type:'json_object'}}),config),'response_format');
  assert.equal(nativeSkipReason(parse({tool_choice:'always'}),config),'invalid_tool_choice');
  assert.equal(nativeSkipReason(parse({tools:[{type:'function',function:{name:'Read',parameters:{type:'array'}}}]}),config),'non_object_schema');
  assert.equal(nativeSkipReason(parse({tools:[{type:'function',function:twoTools[0]},{type:'function',function:twoTools[0]}]}),config),'invalid_tool_table');
  assert.equal(nativeSkipReason(parse({messages:[{role:'user',content:[{type:'input_audio',input_audio:{data:'AA==',format:'wav'}}]}]}),config),'unsupported_content');
  // The two choices this task moved into the native lane are no longer skip reasons.
  assert.equal(nativeSkipReason(parse({tool_choice:'required'}),config),null);
  assert.equal(nativeSkipReason(parse({tool_choice:{type:'function',function:{name:'Read'}}}),config),null);
  assert.equal(nativeEligible(parse({tool_choice:'required'}),config),true);
  assert.equal(nativeEligible(parse({tool_choice:'none'}),config),false);
});

test('tool_choice:required stays native and corrects a step that only spoke',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request={...toolRequest(),tool_choice:'required' as const};
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    assert.match(String(runtime.prompts[0]!.message.content),/requires at least one native host function call/i);
    runtime.final('I will read the file next.');
    await waitFor(()=>runtime.prompts.length===2);
    assert.match(String(runtime.prompts[1]!.message.content),/The host requires a function call in this step\. Call one of the host functions now\./);
    const handlers=await runtime.toolStep([{id:'req_call',name:'Read',input:{path:'a'}}]);
    const first=await pending;
    assert.equal(first.reply.kind,'tool_calls');assert.deepEqual(first.reply.calls.map((c:any)=>c.id),['req_call']);
    assert.equal(first.report.native.invalid_calls,1);
    // The host relaxes the contract once it wants an answer; a tool result window is a new request.
    const secondPending=pool.infer({...resultRequest(request,first.reply,['content']),tool_choice:'auto' as const});
    assert.equal((await handlers[0]!).content[0].text,'content');
    runtime.final('Done.');const second=await secondPending;assert.equal(second.reply.content,'Done.');
  }finally{pool.closeAll();}
});

test('a pinned function is native and a different call is corrected without reaching the host',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request={...toolRequest(twoTools),tool_choice:{type:'function' as const,function:{name:'Read'}}};
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    assert.match(String(runtime.prompts[0]!.message.content),/exactly one call to the host function Read/i);
    const wrong=await runtime.toolStep([{id:'wrong_call',name:'Write',input:{text:'x'}}]);
    const rejected=await wrong[0]!;
    assert.equal(rejected.isError,true);
    assert.match(rejected.content[0].text,/The host requires exactly the function Read in this step\. Call it now\./);
    assert.equal(runtime.prompts.length,1,'a rejected call is corrected through its tool result, not a new user message');
    const handlers=await runtime.toolStep([{id:'right_call',name:'Read',input:{path:'a'}}]);
    const first=await pending;
    assert.deepEqual(first.reply.calls.map((c:any)=>c.id),['right_call']);
    const secondPending=pool.infer({...resultRequest(request,first.reply,['ok']),tool_choice:'auto' as const});
    assert.equal((await handlers[0]!).content[0].text,'ok');
    runtime.final('Done.');await secondPending;
  }finally{pool.closeAll();}
});

test('repeated misses of a required call fail with the invalid-round stage',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeInvalidRounds:1}),fakeStarter(runtimes));
  try{
    const pending=pool.infer({...toolRequest(),tool_choice:'required' as const});
    await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('Just words, no call.');
    const completed=await pending;
    assert.equal(completed.reply,null);
    assert.equal(completed.report.stage,'native_invalid_calls');
    assert.match(String(completed.report.error),/missed the required host function/);
    assert.equal(pool.stats().native.sessions,0);
  }finally{pool.closeAll();}
});

test('parallel_tool_calls:false hands over the first call and fails the rest fast',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request={...toolRequest(twoTools),parallel_tool_calls:false};
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    assert.match(String(runtime.prompts[0]!.message.content),/at most one host function per reply/i);
    const handlers=await runtime.toolStep([{id:'p1',name:'Read',input:{path:'a'}},{id:'p2',name:'Write',input:{text:'b'}}]);
    const first=await pending;
    assert.deepEqual(first.reply.calls.map((c:any)=>c.id),['p1']);
    assert.equal(first.report.native.parallel_trimmed,1);
    const trimmed=await handlers[1]!;
    assert.equal(trimmed.isError,true);
    assert.equal(trimmed.content[0].text,'Only one function call per step is allowed here. Repeat this call in a later step after you have the previous result.');
    const secondPending=pool.infer({...resultRequest(request,first.reply,['one']),tool_choice:'auto' as const});
    assert.equal((await handlers[0]!).content[0].text,'one');
    runtime.final('finished');await secondPending;
  }finally{pool.closeAll();}
});

test('an idle upstream returns 504 upstream_stalled and the next request rebuilds',async()=>{
  const runtimes:FakeRuntime[]=[];
  // `serve` rejects an explicit --model; the config here must not pin one.
  const {model:_pinned,...served}=nativeConfig({idleTimeoutMs:1000});
  const server:Server=await createBridgeServer(served,{port:0,key:'native-test',prewarm:false,telemetry:false,
    startRuntime:fakeStarter(runtimes,runtime=>{runtime.models[0]!.context_config.full.token_count=1000000;})});
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post=(body:unknown)=>fetch(`${base}/v1/chat/completions`,{method:'POST',headers:{authorization:'Bearer native-test','content-type':'application/json'},body:JSON.stringify(body)});
  const request=toolRequest();
  try{
    const stalled=post(request);
    await waitFor(()=>runtimes[0]?.prompts.length===1);
    const response=await stalled;
    assert.equal(response.status,504);
    const body=await response.json() as any;
    assert.equal(body.error.code,'upstream_stalled');
    assert.match(String(body.error.message),/upstream_stalled/);
    // The runtime is interrupted, not leaked: an identical retry rebuilds and completes.
    const retry=post(request);
    await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    runtimes[1]!.final('after stall');
    const retried=await retry;assert.equal(retried.status,200);
    assert.equal((await retried.json() as any).choices[0].message.content,'after stall');
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('an awaiting lane expires on its own TTL and the next request reports expired',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({awaitingIdleMs:60000}),fakeStarter(runtimes));
  const request=toolRequest();
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);
    await runtimes[0]!.toolStep([{id:'ttl_call',name:'Read',input:{path:'a'}}]);
    const first=await pending;
    const record=first.record;record.touched=Date.now()-61000;
    (pool as unknown as{sweepIdle():void}).sweepIdle();
    assert.equal(runtimes[0]!.closed,1,'the awaiting lane releases its runtime');
    assert.equal(pool.stats().native.awaiting_expired,1);
    const next=pool.infer(resultRequest(request,first.reply,['late']));
    await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    runtimes[1]!.final('after expiry');const second=await next;
    assert.equal(second.report.native.rebuild_reason,'expired');
    assert.equal(second.reply.content,'after expiry');
  }finally{pool.closeAll();}
});

test('warm accounting reports a missing entry and a claimed-but-not-ready entry',async()=>{
  const runtimes:FakeRuntime[]=[];let releaseInit!:()=>void;
  const gate=new Promise<any>(resolve=>{releaseInit=()=>resolve({account:{userId:'fake'},skills:[],tools:[{name:'tool-0'}]});});
  const pool=new QoderPool(nativeConfig({nativeWarmLimit:1,blankWarmTtlMs:60000}),
    // The warm runtime lists its tools, then stalls in initialization: claimed, but not ready.
    fakeStarter(runtimes,(runtime,index)=>{if(index!==1)return;const original=runtime.q.initializationResult;
      runtime.q.initializationResult=async()=>{const value=await original();await gate;return value;};}));
  try{
    const first=pool.infer(toolRequest());
    await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('one');const cold=await first;
    assert.equal(cold.report.native.warm_miss_reason,'no_warm_entry');
    assert.equal(cold.report.native.warm_hit_not_ready,false);
    await waitFor(()=>runtimes.length===2);
    const second=pool.infer({...toolRequest(),prompt_cache_key:'warm-second',messages:[{role:'user' as const,content:'another conversation'}]});
    // The entry leaves the warm list the moment it is claimed, so readiness was read while it was false.
    await waitFor(()=>pool.stats().native.warm_pending===0);
    await tick();releaseInit();
    await waitFor(()=>runtimes[1]!.prompts.length===1);
    runtimes[1]!.final('two');const warm=await second;
    assert.equal(warm.report.native.warm_hit_not_ready,true,'the entry was claimed before it was ready');
    assert.equal(warm.report.native.warm_start,false);
    assert.equal(pool.stats().native.warm_hit_not_ready,1);
  }finally{pool.closeAll();}
});

test('rebuild reasons are new_conversation and history_rewritten',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request=toolRequest();
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('one');const first=await pending;
    assert.equal(first.report.native.rebuild_reason,'new_conversation');
    const rewritten={...request,messages:[{role:'user' as const,content:'[compacted] summary'}]};
    const secondPending=pool.infer(rewritten);
    await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    runtimes[1]!.final('two');const second=await secondPending;
    assert.equal(second.report.native.rebuild_reason,'history_rewritten');
    assert.equal(second.report.native.window,'new');
  }finally{pool.closeAll();}
});

test('a same-name fallback binding with more than one candidate is counted',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request=toolRequest();
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    await runtime.silentToolStep([{id:'amb1',name:'Read',input:{path:'a'}},{id:'amb2',name:'Read',input:{path:'b'}}]);
    const first=await pending;
    assert.equal(first.report.native.ambiguous_binding,0);
    // A handler whose input matches no announced call can only be bound by name: both calls are free.
    const stray=runtime.binding.callTool('Read',{path:'unreported'},new AbortController().signal);
    const secondPending=pool.infer(resultRequest(request,first.reply,['one','two']));
    const strayResult=await stray;const strayPart=strayResult.content[0];
    assert.equal(strayPart?.type==='text'?strayPart.text:null,'one');
    const second=await secondPending;
    assert.equal(second.report.native.ambiguous_binding,1);
    runtime.final('done');await second;
  }finally{pool.closeAll();}
});

test('the tool-less path rejects only a line-start protocol shell outside code',()=>{
  const request=ChatRequest.parse({model:'qoder-deepseek-flash',messages:[{role:'user',content:'Explain DSML'}],
    tools:[{type:'function',function:twoTools[0]}],tool_choice:'none'});
  const prose='DSML 的写法是 `｜｜DSML｜｜ param="value"`，双反引号 ``｜｜DSML｜｜`` 同样保留。';
  assert.equal(finalAnswer(prose,request),prose);
  const fenced=['下面是一个代码块：','```xml','｜｜DSML｜｜ invoke name="Read">','```'].join('\n');
  assert.equal(finalAnswer(fenced,request),fenced);
  assert.throws(()=>finalAnswer('先说明一下\n<｜｜DSML｜｜ invoke name="Read">',request),/tool_choice forbids tool calls/);
  assert.match(answerInstructions(request),/Reply exactly as the conversation above instructs\.$/m);
  assert.doesNotMatch(answerInstructions(request),/Plain text is permitted/);
});
