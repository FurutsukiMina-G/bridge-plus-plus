import test from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import type {Server} from 'node:http';
import {QoderPool} from '../src/pool.js';
import {createBridgeServer} from '../src/server.js';
import {HostBinding,hostToolTable} from '../src/native-tools.js';
import {nativeConfig,toolRequest,resultRequest,fakeStarter,waitFor,FakeRuntime} from './native-fake.js';

const twoTools=[
  {name:'Read',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']}},
  {name:'Write',parameters:{type:'object',properties:{text:{type:'string'}},required:['text']}},
];
async function fixture(runtimes:FakeRuntime[]){
  const server=await createBridgeServer(nativeConfig(),{port:0,key:'native-test',prewarm:false,telemetry:false,startRuntime:fakeStarter(runtimes,runtime=>{runtime.models[0]!.context_config.full.token_count=1000000;})});
  const port=(server.address() as AddressInfo).port,base=`http://127.0.0.1:${port}`;
  return{server,base};
}
async function post(base:string,body:unknown){
  return await fetch(`${base}/v1/chat/completions`,{method:'POST',headers:{authorization:'Bearer native-test','content-type':'application/json'},body:JSON.stringify(body)});
}
async function close(server:Server){await new Promise<void>(resolve=>server.close(()=>resolve()));}
async function sse(response:Response){
  const text=await response.text();
  const events=text.split('\n\n').flatMap(chunk=>chunk.startsWith('data: ')&&chunk!=='data: [DONE]'?[JSON.parse(chunk.slice(6))]:[]);
  return{text,events};
}
const contentOf=(events:any[])=>events.flatMap(event=>event.choices??[]).map((choice:any)=>choice.delta?.content??'').join('');
const callsOf=(events:any[])=>events.flatMap(event=>event.choices??[]).flatMap((choice:any)=>choice.delta?.tool_calls??[])
  .map((call:any)=>({id:call.id,name:call.function?.name,arguments:call.function?.arguments}));
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));

test('a handler that overtakes message_delta waits for its own step and result',async()=>{
  const runtimes:FakeRuntime[]=[];const{server,base}=await fixture(runtimes);
  const request={...toolRequest(),prompt_cache_key:'early-handler'};
  try{
    const pending=post(base,request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.earlyToolStep([{id:'early_1',name:'Read',input:{path:'a'}}]);
    let settled=0;void handlers[0]!.then(()=>{settled++;});await tick();assert.equal(settled,0,'the handler must not see Unknown call before its step exists');
    const first=await(await pending).json();const message=first.choices[0].message;
    assert.deepEqual(message.tool_calls.map((call:any)=>call.id),['early_1']);
    const next={...request,messages:[...request.messages,message,{role:'tool',tool_call_id:'early_1',content:'early result'}]};
    const secondPending=post(base,next);
    const result=await handlers[0]!;assert.equal(result.isError,undefined);assert.equal(result.content[0].text,'early result');
    runtime.final('done');const second=await(await secondPending).json();assert.equal(second.choices[0].message.content,'done');
  }finally{await close(server);}
});

test('a second-step handler entering before its stream binds to the second call',async()=>{
  const runtimes:FakeRuntime[]=[];const{server,base}=await fixture(runtimes);
  const request={...toolRequest(),prompt_cache_key:'early-second-step'};
  try{
    const firstPending=post(base,request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const firstHandlers=await runtime.toolStep([{id:'step1_call',name:'Read',input:{path:'one'}}]);
    const first=await(await firstPending).json();const firstMessage=first.choices[0].message;
    const secondPending=post(base,{...request,messages:[...request.messages,firstMessage,{role:'tool',tool_call_id:'step1_call',content:'one'}]});
    const firstResult=await firstHandlers[0]!;assert.equal(firstResult.content[0].text,'one');
    const secondHandlers=await runtime.earlyToolStep([{id:'step2_call',name:'Read',input:{path:'two'}}],{beforeStream:true});
    let settled=0;void secondHandlers[0]!.then(()=>{settled++;});await tick();assert.equal(settled,0,'the second handler must not be bound to the first step');
    const second=await(await secondPending).json();const secondMessage=second.choices[0].message;
    assert.deepEqual(secondMessage.tool_calls.map((call:any)=>call.id),['step2_call']);
    const thirdPending=post(base,{...request,messages:[...request.messages,firstMessage,{role:'tool',tool_call_id:'step1_call',content:'one'},secondMessage,{role:'tool',tool_call_id:'step2_call',content:'two'}]});
    const secondResult=await secondHandlers[0]!;assert.equal(secondResult.content[0].text,'two');
    runtime.final('finished');const third=await(await thirdPending).json();assert.equal(third.choices[0].message.content,'finished');
  }finally{await close(server);}
});

test('a late handler in an all-invalid step gets the schema error, not the next same-name call',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request={...toolRequest(),prompt_cache_key:'late-invalid'};
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.lateToolStep([{id:'late_bad',name:'Read',input:{}}]);
    const late=await handlers[0]!;assert.equal(late.isError,true);
    assert.match(late.content[0].text,/Arguments do not match the function schema/);
    const nextHandlers=await runtime.toolStep([{id:'next_same_name',name:'Read',input:{path:'ok'}}]);
    const first=await pending;assert.equal(first.reply.kind,'tool_calls');assert.deepEqual(first.reply.calls.map((call:any)=>call.id),['next_same_name']);
    const secondPending=pool.infer(resultRequest(request,first.reply,['next result']));
    assert.equal((await nextHandlers[0]!).content[0].text,'next result');
    runtime.final('done');const second=await secondPending;assert.equal(second.reply.content,'done');
  }finally{pool.closeAll();}
});

test('a keyless request in the same bridge scope opens another conversation without closing the awaiting one',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const a={...toolRequest(),prompt_cache_key:undefined,bridge_scope:'shared-floor',messages:[{role:'user' as const,content:'conversation A'}]};
  const b={...a,messages:[{role:'user' as const,content:'an unrelated conversation B'}]};
  try{
    const pendingA=pool.infer(a);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'a1',name:'Read',input:{path:'a'}}]);const firstA=await pendingA;
    const pendingB=pool.infer(b);await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    runtimes[1]!.final('B done');const secondB=await pendingB;assert.equal(secondB.reply.content,'B done');
    const pendingA2=pool.infer(resultRequest(a,firstA.reply,['A result']));
    assert.equal((await handlers[0]!).content[0].text,'A result');
    runtime.final('A done');const secondA=await pendingA2;
    assert.equal(runtime.closed,0,'the awaiting conversation must stay open');
    assert.equal(runtime.prompts.length,1,'host results do not replay a user message');
    assert.equal(runtimes.length,2,'no replacement runtime for conversation A');
    assert.equal(secondA.record.runtime.q,runtime.q);assert.equal(secondA.report.native.window,'results');
    assert.ok(!secondA.report.native.rebuild_reason,'no rebuild reason for the untouched conversation');
  }finally{pool.closeAll();}
});

test('a keyed request with rewritten history still rebuilds the old session',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request={...toolRequest(),bridge_scope:'keyed-floor',prompt_cache_key:'keyed-one'};
  try{
    const firstPending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('one');await firstPending;
    const rewritten={...request,messages:[{role:'user' as const,content:'rewritten history'}]};
    const secondPending=pool.infer(rewritten);
    await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    assert.equal(runtimes[0]!.closed,1);
    runtimes[1]!.final('two');const second=await secondPending;
    assert.equal(second.report.native.rebuild_reason,'history_mismatch');
    assert.equal(second.report.native.window,'new');
  }finally{pool.closeAll();}
});

test('a stream iterator failure ends the request as a failure without an unhandled rejection',async()=>{
  const rejections:unknown[]=[];const onRejection=(reason:unknown)=>{rejections.push(reason);};process.on('unhandledRejection',onRejection);
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request={...toolRequest(),prompt_cache_key:'stream-failure'};
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    runtime.failStream(new Error('fake stream broke'));
    const failed=await pending;
    assert.equal(failed.reply,null);assert.match(String(failed.report.error),/stream closed|fake stream broke/);
    await tick();assert.deepEqual(rejections,[]);
    const retry=pool.infer(request);await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    runtimes[1]!.final('recovered');const recovered=await retry;assert.equal(recovered.reply.content,'recovered');
    assert.equal(pool.stats().native.sessions,1);
  }finally{process.removeListener('unhandledRejection',onRejection);pool.closeAll();}
});

test('assistant text without deltas still reaches a streaming client',async()=>{
  const runtimes:FakeRuntime[]=[];const{server,base}=await fixture(runtimes);
  try{
    const pending=post(base,{...toolRequest(),prompt_cache_key:'bare-text',stream:true,stream_options:{include_usage:true}});
    await waitFor(()=>runtimes[0]?.prompts.length===1);runtimes[0]!.bareFinal('Text without deltas',{ratio:0.2,credits:0.2,total:0.2});
    const{events}=await sse(await pending);assert.equal(contentOf(events),'Text without deltas');
    assert.equal(events.find(event=>event.choices?.[0]?.finish_reason)?.choices[0].finish_reason,'stop');
  }finally{await close(server);}
});

test('native replays resend the full final text and the same tool calls without usage frames',async()=>{
  const runtimes:FakeRuntime[]=[];const{server,base}=await fixture(runtimes);
  try{
    const finalRequest={...toolRequest(),prompt_cache_key:'replay-final',stream:true,stream_options:{include_usage:true}};
    const firstPending=post(base,finalRequest);await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('Replay me',{deltas:['Replay',' me'],ratio:0.2,credits:0.2,total:0.2});
    const first=await sse(await firstPending);assert.equal(contentOf(first.events),'Replay me');
    assert.equal(first.events.filter(event=>event.usage).length,1);
    const replay=await sse(await post(base,finalRequest));assert.equal(contentOf(replay.events),'Replay me');
    assert.equal(replay.events.filter(event=>event.usage).length,0,'a local replay must not report usage');
    assert.equal(runtimes[0]!.prompts.length,1);

    const toolRequestValue={...toolRequest(),prompt_cache_key:'replay-tools',stream:true,stream_options:{include_usage:true}};
    const toolPending=post(base,toolRequestValue);await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    const handlers=await runtimes[1]!.toolStep([{id:'replay_call',name:'Read',input:{path:'a'}}]);
    const toolFirst=await sse(await toolPending);const calls=callsOf(toolFirst.events);
    assert.deepEqual(calls,[{id:'replay_call',name:'Read',arguments:'{"path":"a"}'}]);
    const toolReplay=await sse(await post(base,toolRequestValue));assert.deepEqual(callsOf(toolReplay.events),calls);
    assert.equal(toolReplay.events.filter(event=>event.usage).length,0,'a tool-step replay must not report usage');
    assert.equal(runtimes[1]!.prompts.length,1);
    const message={role:'assistant' as const,content:null,tool_calls:[{id:'replay_call',type:'function' as const,function:{name:'Read',arguments:'{"path":"a"}'}}]};
    const finishPending=post(base,{...toolRequestValue,stream:false,stream_options:undefined,messages:[...toolRequestValue.messages,message,{role:'tool',tool_call_id:'replay_call',content:'done'}]});
    assert.equal((await handlers[0]!).content[0].text,'done');
    runtimes[1]!.final('after replay');const finished=await(await finishPending).json();assert.equal(finished.choices[0].message.content,'after replay');
  }finally{await close(server);}
});

test('JSON path replays also omit the usage frame',async()=>{
  const runtimes:FakeRuntime[]=[];
  // The JSON path has no host MCP server; give the fake runtime a provided empty binding.
  const startRuntime=(async({options}:any)=>{
    const binding=new HostBinding();binding.provide(hostToolTable(toolRequest([])));
    const runtime=new FakeRuntime({...options,mcpServers:{host:binding.config([])}});runtimes.push(runtime);return runtime;
  }) as any;
  const server=await createBridgeServer(nativeConfig(),{port:0,key:'native-test',prewarm:false,telemetry:false,startRuntime});
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request={model:'qoder-deepseek-flash',prompt_cache_key:'json-replay',messages:[{role:'user',content:'A plain question'}],stream:true,stream_options:{include_usage:true}};
  try{
    const pending=post(base,request);await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('JSON answer',{deltas:['JSON',' answer'],ratio:0.2,credits:0.2,total:0.2});
    const first=await sse(await pending);assert.equal(contentOf(first.events),'JSON answer');
    assert.equal(first.events.filter(event=>event.usage).length,1);
    const replay=await sse(await post(base,request));assert.equal(contentOf(replay.events),'JSON answer');
    assert.equal(replay.events.filter(event=>event.usage).length,0,'a JSON-path replay must not report usage');
    assert.equal(runtimes[0]!.prompts.length,1);
  }finally{await close(server);}
});

test('PostToolUse ignores invalid calls and stops after the second valid tool_use_id',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeResultCharLimit:20}),fakeStarter(runtimes));
  const request=toolRequest(twoTools);
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([
      {id:'invalid_call',name:'Read',input:{}},
      {id:'valid_one',name:'Write',input:{text:'one'}},
      {id:'valid_two',name:'Write',input:{text:'two'}},
    ]);
    const first=await pending;assert.deepEqual(first.reply.calls.map((call:any)=>call.id),['valid_one','valid_two']);
    const secondPending=pool.infer(resultRequest(request,first.reply,['X'.repeat(60),'small']));
    assert.equal((await handlers[0]!).isError,true);assert.match((await handlers[1]!).content[0].text,/complete output follows/);
    const invalidPost=await runtime.postToolUseId('invalid_call');assert.equal(invalidPost.continue,undefined,'an invalid call must not count');
    const firstPost=await runtime.postToolUseId('valid_one');assert.equal(firstPost.continue,undefined,'one valid call is not enough');
    const secondPost=await runtime.postToolUseId('valid_two');assert.equal(secondPost.continue,false);
    runtime.result();await waitFor(()=>runtime.prompts.length===2);
    runtime.final('done');const second=await secondPending;assert.equal(second.reply.content,'done');assert.equal(second.report.native.handoff_stop,true);
  }finally{pool.closeAll();}
});

test('legacy PostToolUse without tool_use_id still counts calls',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeResultCharLimit:20}),fakeStarter(runtimes));
  const request=toolRequest(twoTools);
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'legacy_one',name:'Write',input:{text:'one'}},{id:'legacy_two',name:'Write',input:{text:'two'}}]);
    const first=await pending;
    const secondPending=pool.infer(resultRequest(request,first.reply,['X'.repeat(60),'small']));
    await Promise.all(handlers);
    const firstPost=await runtime.postToolUse();assert.equal(firstPost.continue,undefined);
    const secondPost=await runtime.postToolUse();assert.equal(secondPost.continue,false);
    runtime.result();await waitFor(()=>runtime.prompts.length===2);
    runtime.final('done');await secondPending;
  }finally{pool.closeAll();}
});

test('a warm native runtime answers tools/list from its hint table without MCP_TIMEOUT',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeWarmLimit:1,blankWarmTtlMs:5000}),fakeStarter(runtimes));
  try{
    const pending=pool.infer(toolRequest());await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('one');await pending;
    await waitFor(()=>runtimes.length===2);const warm=runtimes[1]!;
    const listed=await Promise.race([warm.binding.listTools(),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('tools/list waited for the request')),500))]);
    assert.equal(listed.tools.length,1);assert.equal(listed.tools[0]!.name,'Read');
    assert.equal(warm.options.env.MCP_TIMEOUT,undefined);
    await waitFor(()=>warm.listed!==undefined);assert.equal(warm.listed!.length,1);
  }finally{pool.closeAll();}
});

test('a failed warm startup falls back to a cold runtime for the request',async()=>{
  const runtimes:FakeRuntime[]=[];let rejectWarm!:(error:Error)=>void;
  const gate=new Promise<never>((_,reject)=>{rejectWarm=reject;});
  const pool=new QoderPool(nativeConfig({nativeWarmLimit:1}),fakeStarter(runtimes,(runtime,index)=>{if(index===1)runtime.q.initializationResult=()=>gate;}));
  try{
    const firstPending=pool.infer(toolRequest());await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('one');await firstPending;
    await waitFor(()=>runtimes.length===2);
    const secondRequest={...toolRequest(),prompt_cache_key:'cold-fallback',messages:[{role:'user' as const,content:'another conversation'}]};
    const secondPending=pool.infer(secondRequest);
    await tick();
    rejectWarm(new Error('warm startup failed'));
    await waitFor(()=>runtimes.length>=3&&runtimes[2]!.prompts.length===1);
    assert.equal(runtimes[1]!.closed,1);
    runtimes[2]!.final('cold');const second=await secondPending;
    assert.equal(second.reply.content,'cold');assert.equal(second.report.native.warm_start,false);
  }finally{pool.closeAll();}
});

test('a two-response window reports the latest prompt and sums output and credits',async()=>{
  const runtimes:FakeRuntime[]=[];const config=nativeConfig({nativeResultCharLimit:20,context:1000});
  const pool=new QoderPool(config,fakeStarter(runtimes,runtime=>{runtime.models[0]!.context_config.full.token_count=1000;}));
  const request={...toolRequest(),prompt_cache_key:'usage-window'};
  try{
    const firstPending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'usage_call',name:'Read',input:{path:'x'}}],{text:'first',ratio:0.1,credits:0.1});
    const first=await firstPending;
    const secondPending=pool.infer(resultRequest(request,first.reply,['Y'.repeat(60)]));
    assert.match((await handlers[0]!).content[0].text,/complete output follows/);
    runtime.final('partial output',{stop:'max_tokens',ratio:0.3,credits:0.3,total:0.3});
    runtime.final('final answer',{ratio:0.5,credits:0.5,total:0.8});
    const second=await secondPending;
    assert.equal(second.reply.content,'final answer');
    const usage=second.report.client_usage;
    assert.equal(usage.prompt_tokens,500);assert.equal(usage.completion_tokens,2);assert.equal(usage.total_tokens,502);
    assert.ok(Math.abs(second.report.credits-0.8)<1e-12);
    assert.equal(second.report.model_requests,2);assert.equal(second.report.native.model_responses,2);
    assert.equal(second.report.requests.reduce((sum:number,row:any)=>sum+Math.round(row.context_usage_ratio*row.context_window),0),800);
    const snapshot=second.usage.snapshot(config,null);
    assert.equal(snapshot.prompt_tokens_all_responses,800);assert.equal(snapshot.prompt_tokens_known,true);
  }finally{pool.closeAll();}
});
