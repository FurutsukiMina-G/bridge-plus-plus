import test from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import type {Server} from 'node:http';
import {QoderPool} from '../src/pool.js';
import {createBridgeServer} from '../src/server.js';
import {nativeConfig,toolRequest,resultRequest,fakeStarter,waitFor,FakeRuntime} from './native-fake.js';

const png=(data='A'.repeat(8))=>`data:image/png;base64,${data}`;
async function close(server:Server){await new Promise<void>(resolve=>server.close(()=>resolve()));}
async function sse(response:Response){
  const text=await response.text();
  const events=text.split('\n\n').flatMap(chunk=>chunk.startsWith('data: ')&&chunk!=='data: [DONE]'?[JSON.parse(chunk.slice(6))]:[]);
  return{text,events};
}

test('the first request max_tokens starts the native runtime, and a later change is reported, not rebuilt',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request={...toolRequest(),prompt_cache_key:'gap-limit',max_tokens:400};
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    assert.equal(runtime.options.extraArgs['max-output-tokens'],'400');
    const handlers=await runtime.toolStep([{id:'limit_call',name:'Read',input:{path:'a'}}]);
    const first=await pending;
    assert.equal(first.report.native.max_tokens_mismatch,false);
    const secondPending=pool.infer({...resultRequest(request,first.reply,['ok']),max_tokens:800});
    assert.equal((await handlers[0]!).content[0]!.text,'ok');
    runtime.final('done');const second=await secondPending;
    assert.equal(second.reply.content,'done');
    assert.equal(second.report.native.max_tokens_mismatch,true,'a changed limit is reported on the reused session');
    assert.equal(runtimes.length,1,'the runtime is not rebuilt for a different max_tokens');
    assert.equal(second.report.native.rebuild_reason,null);
  }finally{pool.closeAll();}
});

test('a warm runtime is claimed only for the output limit it was started with',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeWarmLimit:1}),fakeStarter(runtimes));
  try{
    const firstPending=pool.infer({...toolRequest(),prompt_cache_key:'warm-limit-a',max_tokens:400});
    await waitFor(()=>runtimes[0]?.prompts.length===1);runtimes[0]!.final('first done');
    const first=await firstPending;assert.equal(first.report.native.warm_start,false);
    await waitFor(()=>pool.stats().native.warm_ready===1);
    const warmRuntime=runtimes.at(-1)!;
    assert.equal(warmRuntime.options.extraArgs['max-output-tokens'],'400','the warm runtime starts with the last requested limit');

    const limitOf=(runtime:FakeRuntime)=>runtime.options.extraArgs?.['max-output-tokens'];
    const secondPending=pool.infer({...toolRequest(),prompt_cache_key:'warm-limit-b',max_tokens:900});
    const serving=()=>runtimes.find(row=>row!==warmRuntime&&row.prompts.length===1&&limitOf(row)==='900');
    await waitFor(()=>Boolean(serving()),'the runtime started for the 900 limit');
    const secondRuntime=serving()!;
    assert.notEqual(secondRuntime,warmRuntime);
    assert.equal(warmRuntime.closed,1,'the mismatched warm runtime is dropped, not handed over');
    secondRuntime.final('second done');const second=await secondPending;
    assert.equal(second.report.native.warm_start,false);
    assert.equal(second.report.native.warm_miss_reason,'output_limit_mismatch');

    await waitFor(()=>pool.stats().native.warm_ready===1);
    const warmThird=()=>runtimes.find(row=>row!==secondRuntime&&row.prompts.length===0&&limitOf(row)==='900');
    await waitFor(()=>Boolean(warmThird()),'a warm runtime for the 900 limit');
    const claimed=warmThird()!;
    const thirdPending=pool.infer({...toolRequest(),prompt_cache_key:'warm-limit-c',max_tokens:900});
    await waitFor(()=>claimed.prompts.length===1);
    claimed.final('third done');const third=await thirdPending;
    assert.equal(third.report.native.warm_start,true,'the same limit is served by the warm runtime');
    assert.equal(third.report.native.warm_miss_reason,null);
  }finally{pool.closeAll();}
});

test('an upstream output limit is reported as finish_reason length on the wire',async()=>{
  const runtimes:FakeRuntime[]=[];const config=nativeConfig();
  const server=await createBridgeServer(config,{port:0,key:'native-test',prewarm:false,telemetry:false,startRuntime:fakeStarter(runtimes,runtime=>{runtime.models[0]!.context_config.full.token_count=1000000;})});
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try{
    const request={...toolRequest(),prompt_cache_key:'gap-length',max_tokens:400,stream:true};
    const response=await fetch(`${base}/v1/chat/completions`,{method:'POST',headers:{authorization:'Bearer native-test','content-type':'application/json'},body:JSON.stringify(request)});
    await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('partial answer',{stop:'max_tokens'});
    const {events}=await sse(response);
    const finishes=events.flatMap(event=>event.choices??[]).map((choice:any)=>choice.finish_reason).filter(Boolean);
    assert.deepEqual(finishes,['length']);
  }finally{await close(server);}
});

test('a data URL image in a tool result reaches the model as MCP image content and its text stays',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeResultCharLimit:20}),fakeStarter(runtimes));
  const request={...toolRequest(),prompt_cache_key:'gap-image'};
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'image_call',name:'Read',input:{path:'shot.png'}}]);
    const first=await pending;
    const text='x'.repeat(19),data='A'.repeat(100);
    const secondPending=pool.infer(resultRequest(request,first.reply,[[{type:'text',text},{type:'image_url',image_url:{url:png(data)}}]]));
    const resolved=await handlers[0]!;
    assert.equal(resolved.isError,undefined);
    assert.deepEqual(resolved.content[0],{type:'text',text});
    assert.deepEqual(resolved.content[1],{type:'image',mimeType:'image/png',data});
    runtime.final('done');const second=await secondPending;
    assert.equal(second.report.native.tool_images,1);
    assert.equal(second.report.native.tool_images_dropped,0);
    assert.equal(second.report.native.oversized_results,0,'image bytes do not count toward the text receipt limit');
  }finally{pool.closeAll();}
});

test('an image is still forwarded when its text goes over the receipt limit',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig({nativeResultCharLimit:20}),fakeStarter(runtimes));
  const request={...toolRequest(),prompt_cache_key:'gap-image-receipt'};
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'receipt_image',name:'Read',input:{path:'long.png'}}]);
    const first=await pending;
    const secondPending=pool.infer(resultRequest(request,first.reply,[[{type:'text',text:'T'.repeat(60)},{type:'image_url',image_url:{url:png()}}]]));
    const resolved=await handlers[0]!;
    assert.match(resolved.content[0]!.text,/complete output follows/);
    assert.deepEqual(resolved.content[1],{type:'image',mimeType:'image/png',data:'A'.repeat(8)});
    runtime.result();await waitFor(()=>runtime.prompts.length===2);
    runtime.final('done');const second=await secondPending;
    assert.equal(second.report.native.oversized_results,1);
    assert.equal(second.report.native.tool_images,1,'the image still reaches the model alongside the receipt');
  }finally{pool.closeAll();}
});

test('remote, oversized and extra images become text and are counted as dropped',async()=>{
  const runtimes:FakeRuntime[]=[];const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  const request={...toolRequest(),prompt_cache_key:'gap-image-drop'};
  const big=png('A'.repeat(6_990_508));
  const many=Array.from({length:9},()=>({type:'image_url',image_url:{url:png()}}));
  try{
    const pending=pool.infer(request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([
      {id:'remote_image',name:'Read',input:{path:'remote'}},
      {id:'big_image',name:'Read',input:{path:'big'}},
      {id:'many_images',name:'Read',input:{path:'many'}},
    ]);
    const first=await pending;
    const secondPending=pool.infer(resultRequest(request,first.reply,[
      [{type:'text',text:'links'},{type:'image_url',image_url:{url:'https://example.com/a.png'}}],
      [{type:'image_url',image_url:{url:big}}],
      many,
    ]));
    const [remote,oversized,overCount]=await Promise.all(handlers.map(row=>row));
    assert.deepEqual(remote.content.map((part:any)=>part.type),['text']);
    assert.match(remote.content[0].text,/remote URL/);
    assert.deepEqual(oversized.content.map((part:any)=>part.type),['text']);
    assert.match(oversized.content[0].text,/over 5 MiB/);
    assert.equal(overCount.content.filter((part:any)=>part.type==='image').length,8);
    assert.match(overCount.content[0].text,/more than 8 images/);
    runtime.final('done');const second=await secondPending;
    assert.equal(second.report.native.tool_images,8);
    assert.equal(second.report.native.tool_images_dropped,2,'one oversized image and the ninth image');
  }finally{pool.closeAll();}
});
