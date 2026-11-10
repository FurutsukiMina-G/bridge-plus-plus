import test from 'node:test';
import assert from 'node:assert/strict';
import {createBridge} from '../src/server.mjs';
import {PUBLIC_MODEL} from '../src/protocol.mjs';
const info={id:'deepseek-v4.1-flash',name:'DeepSeek Flash',supportsToolCall:true,contextWindow:1000000,maxTokens:128000,reasoning:{supportedEfforts:['low','high','max']}};
const frame=(delta,finish_reason=null,usage=null)=>`data: ${JSON.stringify({id:'b7',created:1,model:info.id,object:'chat.completion.chunk',choices:[{index:0,delta,finish_reason}],usage})}\n\n`;
const encoder=new TextEncoder();
async function fixture(t,chat,cfg={}){
  const records=[],bridge=createBridge({cfg:{concurrency:1,queueLimit:3,timeoutMs:2000,heartbeatMs:50,bodyLimit:100000,...cfg},
    provider:{model:info,ready:async()=>info,chat,status:()=>({})},key:'test-key',instanceId:'b7',log:async row=>records.push(row)});
  await new Promise(resolve=>bridge.server.listen(0,'127.0.0.1',resolve));t.after(()=>bridge.close());
  const request=(body={})=>fetch(`http://127.0.0.1:${bridge.server.address().port}/v1/chat/completions`,
    {method:'POST',headers:{authorization:'Bearer test-key','content-type':'application/json'},body:JSON.stringify({model:PUBLIC_MODEL,messages:[{role:'user',content:'test'}],...body})});
  return {request,records};
}
test('an upstream that stops emitting trips the idle deadline as upstream_stalled',async t=>{
  let aborted=false;
  const f=await fixture(t,async(body,signal,context)=>{
    context.onActivity();
    return new Response(new ReadableStream({start(c){c.enqueue(encoder.encode(frame({role:'assistant'})));
      signal.addEventListener('abort',()=>{aborted=true;c.close();},{once:true});}}));
  },{idleTimeoutMs:300,timeoutMs:4000});
  const response=await f.request({});
  assert.equal(response.status,504);
  const body=await response.json();
  assert.equal(body.error.code,'upstream_stalled');
  assert.match(body.error.message,/No model activity for \d+ s; the upstream stalled mid-request/);
  assert.equal(aborted,true);
  assert.equal(f.records[0].errorCode,'upstream_stalled');
  assert.equal(typeof f.records[0].lastActivityMs,'number');
});
test('the total deadline stays the hard cap even while the upstream keeps emitting',async t=>{
  const f=await fixture(t,async(body,signal,context)=>new Response(new ReadableStream({start(c){
    const tick=setInterval(()=>{context.onActivity();c.enqueue(encoder.encode(frame({content:'…'})));},60);
    signal.addEventListener('abort',()=>{clearInterval(tick);c.close();},{once:true});}})),
  {idleTimeoutMs:20000,timeoutMs:1000});
  const response=await f.request({});
  assert.equal(response.status,504);
  const body=await response.json();
  assert.equal(body.error.code,'timeout');
  assert.match(body.error.message,/^Deadline exceeded after 1 s of continuous output/);
  assert.equal(f.records[0].errorCode,'timeout');
});
test('stream deltas count as activity and hold the idle deadline open past its own window',async t=>{
  const f=await fixture(t,async(body,signal,context)=>new Response(new ReadableStream({async start(c){
    for(let i=0;i<6;i++){
      if(signal.aborted)return;
      context.onActivity();c.enqueue(encoder.encode(frame({content:'x'})));
      await new Promise(resolve=>setTimeout(resolve,60));
    }
    c.enqueue(encoder.encode(frame({},'stop',{prompt_tokens:5,completion_tokens:6,total_tokens:11})+'data: [DONE]\n\n'));c.close();}})),
  {idleTimeoutMs:200,timeoutMs:8000});
  const response=await f.request({stream:true});
  assert.equal(response.status,200);
  const text=await response.text();
  assert.match(text,/"content":"x"/);
  assert.match(text,/\[DONE\]/);
  assert.equal(f.records[0].outcome,'completed');
});
test('an upstream that never reports activity still trips the idle deadline',async t=>{
  let aborted=false;
  const f=await fixture(t,async(body,signal)=>new Response(new ReadableStream({start(c){signal.addEventListener('abort',()=>{aborted=true;c.close();},{once:true});}})),{idleTimeoutMs:300,timeoutMs:5000});
  const started=Date.now(),response=await f.request({}),elapsed=Date.now()-started,body=await response.json();
  assert.equal(response.status,504);assert.equal(body.error.code,'upstream_stalled');
  assert.ok(elapsed<2000,`the idle deadline waited ${elapsed} ms instead of the total one`);
  assert.equal(aborted,true);assert.equal(f.records[0].errorCode,'upstream_stalled');
});
test('cfg without idleTimeoutMs uses the default and a completing upstream succeeds',async t=>{
  const f=await fixture(t,async(body,signal,context)=>{context.onActivity();
    return new Response(frame({role:'assistant'})+frame({content:'ok'},'stop',{prompt_tokens:1,completion_tokens:1,total_tokens:2})+'data: [DONE]\n\n');});
  const response=await f.request({});assert.equal(response.status,200);
  const body=await response.json();assert.equal(body.choices[0].message.content,'ok');
});
