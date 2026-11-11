import test from 'node:test';
import assert from 'node:assert/strict';
import {QoderPool} from '../src/pool.js';
import {nativeConfig,toolRequest,resultRequest,fakeStarter,waitFor,FakeRuntime} from './native-fake.js';

test('M1: a compacted request carrying a waiting session tool id closes it; an unrelated keyless conversation does not',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request:any={...toolRequest(),prompt_cache_key:undefined,bridge_scope:'m1-scope',messages:[{role:'user',content:'Conversation A'}]};
  try{
    const pendingA=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtimeA=runtimes[0]!;
    const handlers=await runtimeA.toolStep([{id:'m1_call',name:'Read',input:{path:'a'}}]);
    const firstA=await pendingA;assert.equal(firstA.reply.kind,'tool_calls');

    // Another conversation in the same scope, without A's call ids, is not a replacement.
    const unrelated:any={...request,messages:[{role:'user',content:'An unrelated conversation'}]};
    const pendingB=pool.infer(unrelated);await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    runtimes[1]!.final('B done');const secondB=await pendingB;assert.equal(secondB.reply.content,'B done');
    assert.equal(runtimeA.closed,0,'an unrelated keyless conversation must not close the waiting session');
    assert.equal(pool.stats().native.awaiting,1);

    // The host compacted A's history, but still delivers a result for A's current step.
    const compacted:any={...request,messages:[{role:'user',content:'[compacted] summary'},{role:'tool',tool_call_id:'m1_call',content:'compacted result'}]};
    const pendingC=pool.infer(compacted);await waitFor(()=>runtimes.length===3&&runtimes[2]!.prompts.length===1);
    assert.equal(runtimeA.closed,1,'the waiting runtime is closed once its results arrive in a rewritten history');
    const resolved=await handlers[0]!;assert.equal(resolved.isError,true);assert.equal(resolved.content[0]!.text,'Host session is not available.');
    runtimes[2]!.final('C done');const third=await pendingC;
    assert.equal(third.report.native.rebuild_reason,'history_mismatch');
    assert.equal(third.report.native.window,'new');
    assert.equal(pool.stats().native.awaiting,0);
  }finally{pool.closeAll();}
});

test('M2: a hung interrupt() is bounded by the 5s cap instead of the 30s SDK control timeout',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request={...toolRequest(),prompt_cache_key:'cancel-hang'};
  // AbortSignal.timeout() is unref'd, so a bare test process would drain before the cap fires.
  const keepalive=setInterval(()=>{},1000);
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    runtime.hangInterrupt();
    const controller=new AbortController();const at=Date.now();controller.abort(new Error('client gone'));
    const completed=await pending;const elapsed=Date.now()-at;
    assert.equal(completed.reply,null);
    assert.equal(completed.report.stage,'cancelled_or_timeout');
    assert.ok(['idle','closed'].includes(completed.record.state),'the session must not stay awaiting or running');
    assert.equal(pool.stats().native.awaiting,0);
    assert.equal(runtime.interrupts,1);
    assert.ok(elapsed>=4500,`cancellation waited for the bounded interrupt (${elapsed} ms)`);
    assert.ok(elapsed<15000,`cancellation is capped by 5s interrupt + 5s drain, not the 30s SDK timeout (${elapsed} ms)`);
  }finally{clearInterval(keepalive);pool.closeAll();}
});

test('M3: an identical retry after cancelling a tool-result turn rebuilds instead of pushing an empty prompt',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request={...toolRequest(),prompt_cache_key:'retry-after-cancel'};
  try{
    const firstPending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'m3_call',name:'Read',input:{path:'a'}}]);
    const first=await firstPending;
    const next=resultRequest(request,first.reply,['first result']);
    const controller=new AbortController();const active=pool.infer(next,{signal:controller.signal});
    await waitFor(()=>pool.stats().native.awaiting===0);
    controller.abort(new Error('disconnect'));
    const cancelled=await active;
    assert.equal(cancelled.record.state,'idle');
    assert.equal(cancelled.record.lastReply,null,'a cancelled window leaves no reply to replay');
    assert.equal((await handlers[0]!).content[0]!.text,'first result');

    const retryPending=pool.infer(next);
    await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    assert.equal(runtime.closed,1);
    assert.equal(runtime.prompts.length,1,'the retry must not push an empty continuation to the old runtime');
    const pushed=runtimes[1]!.prompts[0]!.message.content;
    assert.equal(typeof pushed,'string');
    assert.ok(pushed.includes('[Conversation so far'),'the replacement session receives the full history');
    assert.ok(pushed.includes('first result'));
    runtimes[1]!.final('retried');const retry=await retryPending;
    assert.equal(retry.report.native.rebuild_reason,'retry_after_cancel');
    assert.equal(retry.report.native.window,'new');
  }finally{pool.closeAll();}
});

test('M4: an upstream API error is recorded and retried; only a failing result fails the window',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  try{
    const okPending=pool.infer({...toolRequest(),prompt_cache_key:'api-error-retry'});
    await waitFor(()=>runtimes[0]?.prompts.length===1);const okRuntime=runtimes[0]!;
    okRuntime.apiError('rate_limit');okRuntime.apiRetry();okRuntime.final('recovered');
    const ok=await okPending;
    assert.equal(ok.reply.content,'recovered');assert.equal(ok.report.stage,'native');
    assert.ok(ok.report.api_error_categories.includes('rate_limit'));

    const failedPending=pool.infer({...toolRequest(),prompt_cache_key:'api-error-fails'});
    await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);const failedRuntime=runtimes[1]!;
    failedRuntime.apiError('rate_limit');failedRuntime.apiRetry();failedRuntime.failedResult('error_during_execution');
    const failed=await failedPending;
    assert.equal(failed.reply,null);assert.equal(failed.report.result,'error_during_execution');
    assert.match(String(failed.report.error),/Qoder result: error_during_execution/);
    assert.equal(failed.report.stage,'native');
    assert.ok(failed.report.api_error_categories.includes('rate_limit'));
  }finally{pool.closeAll();}
});

test('M6: a context_usage_ratio of 0 or above 1 reports client usage as null',async()=>{
  const runtimes:FakeRuntime[]=[];
  const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes,runtime=>{runtime.models[0]!.context_config.full.token_count=1000;}));
  try{
    const zeroPending=pool.infer({...toolRequest(),prompt_cache_key:'ratio-zero'});
    await waitFor(()=>runtimes[0]?.prompts.length===1);runtimes[0]!.final('zero',{ratio:0});
    const zero=await zeroPending;
    assert.equal(zero.report.client_usage,null,'ratio 0 is unknown, not an empty prompt');
    assert.equal(zero.report.normalized_usage,null);
    assert.equal(zero.report.prompt_tokens_all_responses,null);

    const highPending=pool.infer({...toolRequest(),prompt_cache_key:'ratio-high'});
    await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);runtimes[1]!.final('high',{ratio:1.2});
    const high=await highPending;
    assert.equal(high.report.client_usage,null,'a ratio above the context window is unknown');
    assert.equal(high.report.normalized_usage,null);
    assert.equal(high.report.requests[0].context_usage_ratio,1.2,'the raw ratio stays in the per-response rows');
    assert.equal(high.report.usage_source,'native_context_ratio+stream_deltas');
  }finally{pool.closeAll();}
});

test('L1a: a failing result in a stop-after window fails the request without a follow-up',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeResultCharLimit:20}),fakeStarter(runtimes));
  const request=toolRequest();
  try{
    const firstPending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'l1a_call',name:'Read',input:{path:'a'}}]);
    const first=await firstPending;
    const secondPending=pool.infer(resultRequest(request,first.reply,['X'.repeat(60)]));
    assert.match((await handlers[0]!).content[0]!.text,/complete output follows/);
    runtime.failedResult('error_during_execution');
    const second=await secondPending;
    assert.equal(second.reply,null);
    assert.match(String(second.report.error),/Qoder result: error_during_execution/);
    assert.equal(second.report.stage,'native');
    assert.equal(second.report.native.oversized_results,1);
    assert.equal(second.report.native.handoff_stop,false);
    assert.equal(runtime.prompts.length,1,'a failing stopped turn must not push the held follow-up');
    assert.equal(pool.stats().native.late_followups,0);
  }finally{pool.closeAll();}
});

test('L1b: a runtime that ignored the stop receives the held follow-up once on the next step',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeResultCharLimit:20}),fakeStarter(runtimes));
  const request=toolRequest();const full='Y'.repeat(60);
  try{
    const firstPending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const firstHandlers=await runtime.toolStep([{id:'l1b_call',name:'Read',input:{path:'a'}}]);
    const first=await firstPending;
    const secondRequest=resultRequest(request,first.reply,[full]);
    const secondPending=pool.infer(secondRequest);
    assert.match((await firstHandlers[0]!).content[0]!.text,/complete output follows/);
    // No PostToolUse call: the runtime goes straight to the next model response.
    const lateHandlers=await runtime.toolStep([{id:'l1b_late',name:'Read',input:{path:'b'}}]);
    const second=await secondPending;
    assert.equal(second.reply.kind,'tool_calls');assert.equal(second.reply.calls[0].id,'l1b_late');
    assert.equal(runtime.prompts.length,2,'the follow-up is pushed exactly once');
    const follow=runtime.prompts[1]!.message.content;
    assert.equal(typeof follow,'string');
    assert.ok(follow.includes('[Complete outputs'),'the model receives the held result as a user message');
    assert.ok(follow.includes(full));assert.ok(follow.includes('Read (l1b_call)'));
    assert.equal(pool.stats().native.late_followups,1);

    const thirdPending=pool.infer(resultRequest(secondRequest,second.reply,['late ok']));
    assert.equal((await lateHandlers[0]!).content[0]!.text,'late ok');
    runtime.final('finished');const third=await thirdPending;assert.equal(third.reply.content,'finished');
  }finally{pool.closeAll();}
});

test('L3: prose that mentions DSML is a normal answer; a marker-prefixed answer is gated and corrected once',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  try{
    const streamed:string[]=[];
    const prosePending=pool.infer({...toolRequest(),prompt_cache_key:'dsml-prose'},{onText:text=>streamed.push(text)});
    await waitFor(()=>runtimes[0]?.prompts.length===1);const proseRuntime=runtimes[0]!;
    const proseText='The DSML form is <｜｜DSML｜｜invoke name="Read"> in prose, not a call.';
    proseRuntime.final(proseText);
    const prose=await prosePending;
    assert.deepEqual(prose.reply,{kind:'final',content:proseText,finish:'stop'});
    assert.equal(streamed.join(''),proseText);
    assert.equal(proseRuntime.prompts.length,1,'prose that mentions the marker must not be corrected');

    const gated:string[]=[];
    const markerPending=pool.infer({...toolRequest(),prompt_cache_key:'dsml-marker'},{onText:text=>gated.push(text)});
    await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);const markerRuntime=runtimes[1]!;
    markerRuntime.final('｜｜DSML｜｜invoke name="Read"><path>a</path></function_calls>');
    await waitFor(()=>markerRuntime.prompts.length===2);
    assert.deepEqual(gated,[],'a marker-prefixed answer must not stream before it is classified');
    assert.match(String(markerRuntime.prompts[1]!.message.content),/native function calling/);
    markerRuntime.final('The file was read.');
    const marker=await markerPending;
    assert.equal(marker.reply.content,'The file was read.');
    assert.equal(gated.join(''),'The file was read.','only the corrected answer reaches the client');
  }finally{pool.closeAll();}
});

test('L7: native-only traffic refreshes the pool demand timestamp',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const internals=pool as unknown as {lastDemand:number};
  try{
    const stale=Date.now()-600000;internals.lastDemand=stale;
    const pending=pool.infer({...toolRequest(),prompt_cache_key:'native-demand'});
    await waitFor(()=>runtimes[0]?.prompts.length===1);runtimes[0]!.final('ok');await pending;
    assert.ok(internals.lastDemand>stale,'native traffic counts as demand so blank JSON runtimes refill');
    assert.ok(Date.now()-internals.lastDemand<5000);
  }finally{pool.closeAll();}
});

test('L9: a local replay refreshes the session activity time',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({sessionIdleMs:60000}),fakeStarter(runtimes));
  const request={...toolRequest(),prompt_cache_key:'replay-touch'};
  try{
    const firstPending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    await runtime.toolStep([{id:'l9_call',name:'Read',input:{path:'a'}}]);
    const first=await firstPending;
    first.record.touched=Date.now()-120000;
    const replay=await pool.infer(request);
    assert.equal(replay.report.stage,'native_replay');
    (pool as unknown as {sweepIdle():void}).sweepIdle();
    assert.equal(runtime.closed,0,'a replay must not leave the session expired');
    assert.equal(pool.stats().native.sessions,1);
  }finally{pool.closeAll();}
});

test('L10: native tool settings are validated at construction',()=>{
  for(const override of [{nativeResultCharLimit:50000},{nativeWarmLimit:3},{nativeInvalidRounds:0}]){
    assert.throws(()=>new QoderPool(nativeConfig(override),fakeStarter([])),/Invalid Qoder native tool settings/);
  }
  const legal=new QoderPool(nativeConfig({nativeResultCharLimit:10}),fakeStarter([]));
  legal.closeAll();
});

test('L13: HostBinding.callTool resolves without an SDK signal and is cancelled with the session',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request={...toolRequest(),prompt_cache_key:'no-signal'};
  try{
    const firstPending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    await runtime.toolStep([{id:'l13_call',name:'Read',input:{path:'first'}}]);
    const first=await firstPending;
    let late:any;
    assert.doesNotThrow(()=>{late=runtime.binding.callTool('Read',{path:'no-signal'});});

    const controller=new AbortController();
    const active=pool.infer(resultRequest(request,first.reply,['done']),{signal:controller.signal});
    await waitFor(()=>pool.stats().native.awaiting===0);
    controller.abort(new Error('disconnect'));
    const cancelled=await active;
    assert.equal(cancelled.reply,null);
    const resolved=await late;
    assert.equal(resolved.isError,true);
    assert.equal(resolved.content[0]!.text,'Cancelled by the host');
    assert.equal(runtime.interrupts,1);
  }finally{pool.closeAll();}
});

test('tools_changed: a changed tool table reports added and changed names only on the rebuild window',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const read={name:'Read',description:'Read a file',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']}};
  const readChanged={name:'Read',description:'Read a file (updated)',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']}};
  const write={name:'Write',parameters:{type:'object',properties:{text:{type:'string'}},required:['text']}};
  const requestA={...toolRequest([read]),prompt_cache_key:'tools-changed'};
  const baseB=toolRequest([readChanged,write]);
  const requestB={...baseB,prompt_cache_key:'tools-changed',messages:[...requestA.messages,{role:'assistant' as const,content:'one'},{role:'user' as const,content:'next'}]};
  const requestC={...requestB,messages:[...requestB.messages,{role:'assistant' as const,content:'two'},{role:'user' as const,content:'again'}]};
  try{
    const pendingA=pool.infer(requestA);await waitFor(()=>runtimes[0]?.prompts.length===1);runtimes[0]!.final('one');await pendingA;

    const pendingB=pool.infer(requestB);
    await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    assert.equal(runtimes[0]!.closed,1,'a changed table rebuilds the keyed session');
    runtimes[1]!.final('two');const second=await pendingB;
    assert.equal(second.report.native.rebuild_reason,'tools_changed');
    assert.equal(second.report.native.window,'new');
    assert.deepEqual(second.report.native.tools_changed,{added:['Write'],removed:[],changed:['Read']});

    const pendingC=pool.infer(requestC);
    await waitFor(()=>runtimes[1]!.prompts.length===2);
    runtimes[1]!.final('three');const third=await pendingC;
    assert.equal(third.report.native.window,'continue');
    assert.equal(third.report.native.tools_changed,null,'the diff belongs to the rebuild window only');
    assert.equal(third.report.reused_session,true);
  }finally{pool.closeAll();}
});
