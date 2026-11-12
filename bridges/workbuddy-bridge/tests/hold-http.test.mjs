import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,toolRequest,resultRequest,waitFor,model} from './hold-fake.mjs';
import {Completion,sseEvents} from '../src/protocol.mjs';
import {createBridge} from '../src/server.mjs';
async function collect(response,tools){const c=new Completion(model),events=[];for await(const event of sseEvents(response.body)){events.push(event);c.accept(event,model);}c.validate(tools);return {result:c.result(),events};}
test('transport SSE spans host tool windows and local replay never emits usage',async t=>{
 const f=await fixture(t),r=toolRequest(),response=await f.transport.chat(r,new AbortController().signal),firstPending=collect(response,r.tools);
 await waitFor(()=>f.sessions[0]?.prompts.length);const s=f.sessions[0],h=await s.toolStep([{id:'http',name:'mcp__host__Read',input:{path:'a'}}]),first=await firstPending;
 assert.equal(first.result.usage.prompt_tokens,100);assert.equal(response.bridgeMetrics.mode,'hold');assert.equal(response.bridgeMetrics.harness_tool_count,1);
 const next={...r,messages:[...r.messages,first.result.choices[0].message,{role:'tool',tool_call_id:'http',content:'exact result'}]};
 const p=collect(await f.transport.chat(next,new AbortController().signal),r.tools);assert.equal((await h[0]).content[0].text,'exact result');s.final('done',{bare:true});assert.equal((await p).result.choices[0].message.content,'done');
 const replayResponse=await f.transport.chat(next,new AbortController().signal),replay=await collect(replayResponse,r.tools);
 assert.equal(replay.result.usage,null);assert.equal(replay.events.some(e=>e.includes('"usage":{')),false);assert.equal(replayResponse.bridgeMetrics.client_usage,null);assert.equal(s.prompts.length,1);
 assert.equal(s.controlInitialized,true);assert.equal(s.options.maxTurns,100000);assert.equal(s.options.persistSession,false);assert.equal(s.options.env.WORKBUDDY_BRIDGE_HOLD,'1');
 assert.equal(s.options.mcpServers.host.tools,undefined,'unsupported exposedName/alwaysLoad are not promised');
});
test('loopback server returns held calls and reports tool count, definition size and per-response usage',async t=>{
 const f=await fixture(t),rows=[],info={id:model,name:'Synthetic Flash',supportsToolCall:true,contextWindow:1000000,maxTokens:128000,reasoning:{supportedEfforts:['low','high','max']}};
 const bridge=createBridge({cfg:{concurrency:2,queueLimit:2,bodyLimit:100000,timeoutMs:5000,heartbeatMs:100},provider:{model:info,ready:async()=>info,chat:(...a)=>f.transport.chat(...a),status:()=>({})},key:'test',log:async r=>rows.push(r)});
 await new Promise(r=>bridge.server.listen(0,'127.0.0.1',r));t.after(()=>bridge.close());
 const r=toolRequest(),p=fetch('http://127.0.0.1:'+bridge.server.address().port+'/v1/chat/completions',{method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:JSON.stringify({...r,model:'workbuddy-deepseek-flash'})});
 await waitFor(()=>f.sessions[0]?.prompts.length);f.sessions[0].final('ok');const response=await p,body=await response.json();assert.equal(response.status,200,JSON.stringify(body));assert.equal(body.choices[0].message.content,'ok');
 await waitFor(()=>rows.length===1);assert.equal(rows[0].mode,'hold');assert.equal(rows[0].harness_tool_count,1);assert.ok(rows[0].available_tool_definition_chars>0);assert.ok(rows[0].sent_tool_definition_chars>0);assert.equal(rows[0].context.requests[0].input_tokens,200);
});
test('native transport fails closed when an upstream response changes model identity',async t=>{
 const f=await fixture(t),r=toolRequest(),p=f.transport.chat(r,new AbortController().signal).then(r=>r.text());await waitFor(()=>f.sessions[0]?.prompts.length);
 f.sessions[0].emit({type:'assistant',message:{id:'bad',model:'other-model',content:[]}});const wire=await p;assert.match(wire,/model_mismatch/);assert.doesNotMatch(wire,/\[DONE\]/);assert.equal(f.lane.stats().busy,0);
});
