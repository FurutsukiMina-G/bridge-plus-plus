import test from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import type {Server} from 'node:http';
import {createBridgeServer} from '../src/server.js';
import {nativeConfig,toolRequest,fakeStarter,waitFor,FakeRuntime} from './native-fake.js';

async function fixture(runtimes:FakeRuntime[]){
  const server=await createBridgeServer(nativeConfig(),{port:0,key:'native-test',prewarm:false,telemetry:false,startRuntime:fakeStarter(runtimes,runtime=>{runtime.models[0]!.context_config.full.token_count=1000000;})});
  const port=(server.address() as AddressInfo).port,base=`http://127.0.0.1:${port}`;
  return{server,base};
}
async function post(base:string,body:unknown){
  return await fetch(`${base}/v1/chat/completions`,{method:'POST',headers:{authorization:'Bearer native-test','content-type':'application/json'},body:JSON.stringify(body)});
}
async function close(server:Server){await new Promise<void>(resolve=>server.close(()=>resolve()));}

test('native HTTP preserves tool IDs, names, arguments, results and final responses without JSON recovery',async()=>{
  const runtimes:FakeRuntime[]=[];const{server,base}=await fixture(runtimes);const request=toolRequest();
  try{
    const health=await(await fetch(`${base}/health`)).json();
    assert.equal(health.capabilities.toolMode,'native');assert.equal(health.capabilities.nativeTools.resultCharLimit,40000);
    const firstPending=post(base,request);await waitFor(()=>runtimes[0]?.prompts.length===1);const runtime=runtimes[0]!;
    const handlers=await runtime.toolStep([{id:'call_http',name:'mcp__host__Read',input:{path:'a"\\b'}}]);
    const firstResponse=await firstPending;assert.equal(firstResponse.status,200);const first=await firstResponse.json();
    const message=first.choices[0].message;assert.equal(message.content,null);
    assert.deepEqual(message.tool_calls,[{id:'call_http',type:'function',function:{name:'Read',arguments:'{"path":"a\\"\\\\b"}'}}]);
    assert.equal(first.choices[0].finish_reason,'tool_calls');
    const next={...request,messages:[...request.messages,message,{role:'tool',tool_call_id:'call_http',content:'host result'}]};
    const secondPending=post(base,next);const handler=await handlers[0]!;assert.equal(handler.content[0].text,'host result');
    runtime.final('finished');const secondResponse=await secondPending;assert.equal(secondResponse.status,200);const second=await secondResponse.json();
    assert.equal(second.choices[0].message.content,'finished');assert.equal(second.choices[0].finish_reason,'stop');
    assert.equal(runtime.prompts.length,1,'tool results returned through MCP rather than a replayed prompt');
  }finally{await close(server);}
});

test('native streaming emits direct text deltas and final usage without a JSON projector',async()=>{
  const runtimes:FakeRuntime[]=[];const{server,base}=await fixture(runtimes);
  try{
    const pending=post(base,{...toolRequest(),stream:true,stream_options:{include_usage:true}});
    await waitFor(()=>runtimes[0]?.prompts.length===1);runtimes[0]!.final('Hello',{deltas:['Hel','lo'],ratio:0.2,credits:0.2,total:0.2});
    const response=await pending;assert.equal(response.status,200);assert.match(response.headers.get('content-type')??'',/text\/event-stream/);
    const text=await response.text();const events=text.split('\n\n').flatMap(chunk=>chunk.startsWith('data: ')&&chunk!=='data: [DONE]'?[JSON.parse(chunk.slice(6))]:[]);
    const content=events.filter(event=>event.choices?.[0]?.delta?.content).map(event=>event.choices[0].delta.content);
    assert.deepEqual(content,['Hel','lo']);assert.equal(events.some(event=>event.choices?.[0]?.delta?.content?.includes('"kind"')),false);
    assert.equal(events.find(event=>event.choices?.[0]?.finish_reason)?.choices[0].finish_reason,'stop');
    const usage=events.find(event=>event.usage)?.usage;assert.equal(usage.prompt_tokens,200000);assert.equal(usage.completion_tokens,2);
    assert.match(text,/data: \[DONE\]/);
  }finally{await close(server);}
});
