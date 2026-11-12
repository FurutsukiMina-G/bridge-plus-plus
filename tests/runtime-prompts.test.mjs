import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {bridgePromptConfig,runtimeProfile} from '../app/services/runtime-prompts.mjs';
import {SdkTransport,sdkOptions} from '../bridges/workbuddy-bridge/src/sdk-transport.mjs';
import {Gateway} from '../app/services/gateway.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {Store} from '../app/core/store.mjs';
import {normalizeWorkbuddy,normalizeAntigravity,variantFor} from '../app/core/catalog.mjs';
import {ResponseProjection} from '../app/services/responses.mjs';
import {holdFixture,collectHold,hostResults} from './fixtures/workbuddy-hold.mjs';

const credential={accessToken:'local-fixture',uid:'fixture',domain:'www.workbuddy.cn'};
const names={dsh:'DeepSeek Harness',kimi:'Kimi Code',codex:'Codex CLI'};
async function directory(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/runtime-prompts-'));}

test('each runtime selects its own system contract and preserves provider-specific encodings',()=>{
  for(const [runtimeId,name]of Object.entries(names)){
    const prompts=bridgePromptConfig(runtimeId);
    for(const text of [prompts.qoder.system,...Object.values(prompts.qoder.decisionContract),...Object.values(prompts.workbuddy.hostPrompts)]){
      assert.doesNotMatch(text,/Honor parallel_tool_calls=false|Return at most one host tool call|at most one|parallel_tool_calls:false|bounded model turns|one tool call at a time/i);
      assert.match(text,/Request independent operations/);
      assert.ok(text.includes(name));
      for(const other of Object.values(names).filter(n=>n!==name))assert.ok(!text.includes(other),`${runtimeId} leaked ${other}`);
    }
    assert.doesNotMatch(prompts.qoder.system,/"kind":"tool_call"/);
    assert.match(prompts.qoder.decisionContract.full,/"kind":"tool_call"/);
    assert.match(prompts.workbuddy.hostPrompts.decision,/"action":"tool_calls"/);
    assert.match(prompts.workbuddy.hostPrompts.native,/mcp__host__/);
    assert.match(prompts.workbuddy.hostPrompts.native,/Multiple independent calls in one response cost nothing extra/);
    assert.equal(prompts.qoder.fullToolDetails,true);
    for(const native of [true,false]){
      const options=sdkOptions({cliPath:process.execPath,...prompts.workbuddy},credential,{model:'fixture',max_tokens:128,tools:[{type:'function',function:{name:'read'}}]},'.',new AbortController(),()=>{},()=>{},{native});
      assert.equal(options.systemPrompt,prompts.workbuddy.hostPrompts[native?'native':'decision']);
      assert.deepEqual(options.tools,[]);assert.equal(options.fallbackModel,undefined);
    }
  }
  assert.match(bridgePromptConfig('codex').qoder.system,/arguments.input/);
  // Codex declares no apply_patch tool for gateway model ids, and its .bat shim truncates multi-line patches on Windows.
  for(const text of [bridgePromptConfig('codex').qoder.system,...Object.values(bridgePromptConfig('codex').workbuddy.hostPrompts)])assert.match(text,/declares no apply_patch function, apply_patch is unavailable/);
  // That sentence belongs to Codex only: no other runtime prompts the model to avoid apply_patch.
  for(const id of ['dsh','kimi','claude']){
    const prompts=bridgePromptConfig(id);
    for(const text of [prompts.qoder.system,...Object.values(prompts.qoder.decisionContract),...Object.values(prompts.workbuddy.hostPrompts)])assert.doesNotMatch(text,/declares no apply_patch function, apply_patch is unavailable/);
  }
  const claude=bridgePromptConfig('claude');assert.equal(runtimeProfile('claude').name,'Claude Code');
  for(const text of [claude.qoder.system,claude.qoder.decisionContract.full,...Object.values(claude.workbuddy.hostPrompts)]){
    assert.match(text,/Read, Edit, Write, Glob, Grep, PowerShell, Agent, Skill, ToolSearch and AskUserQuestion/);assert.match(text,/there is no Bash tool/i);assert.match(text,/ToolSearch/);assert.match(text,/DeferredToolPlaceholder/);assert.match(text,/Preserve every tool_use id/);
  }
  assert.ok(runtimeProfile('antigravity').nativeOnly);
  for(const id of [undefined,'unknown','__proto__','antigravity'])assert.throws(()=>bridgePromptConfig(id));
});

test('all selected WorkBuddy hosts return complete replay and JSON batches and reject explicit serial batch violations',async t=>{
  const calls=[{name:'Read',arguments:{path:'a'}},{name:'Read',arguments:{path:'b'}}];
  for(const runtimeId of Object.keys(names))for(const native of [false,true]){
    const seen=[],config=bridgePromptConfig(runtimeId).workbuddy;
    const transport=new SdkTransport({runtime:await directory(),cliPath:process.execPath,toolMode:native?'replay':'json',decisionRetries:0,...config},{get:async()=>credential},{run:async function*({prompt}){
      seen.push(prompt);
      yield {type:'system',subtype:'init',model:'fixture',session_id:'batch-session',mcp_servers:native?[{name:'host',status:'connected'}]:[]};
      yield {type:'assistant',message:{model:'fixture',content:native?calls.map((c,i)=>({type:'tool_use',id:'call_'+i,name:'mcp__host__'+c.name,input:c.arguments})):[{type:'text',text:JSON.stringify({action:'tool_calls',calls})}]}};
      yield {type:'result',subtype:'success',is_error:false};
    }});
    t.after(()=>transport.close());
    const body={model:'fixture',max_tokens:128,messages:[{role:'user',content:'Read both files'}],tools:[{type:'function',function:{name:'Read',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']}}}]};
    const wire=await (await transport.chat(body,new AbortController().signal)).text();
    const events=wire.split('\n\n').filter(s=>s.startsWith('data: {')).map(s=>JSON.parse(s.slice(6)));
    assert.deepEqual(events.flatMap(e=>e.choices??[]).flatMap(c=>c.delta?.tool_calls??[]).map(c=>JSON.parse(c.function.arguments)),calls.map(c=>c.arguments));
    if(runtimeId==='codex'){
      const projection=new ResponseProjection('fixture',()=>{});for(const event of events)projection.accept(event);
      const response=projection.finish();assert.deepEqual(response.output.filter(item=>item.type==='function_call').map(item=>JSON.parse(item.arguments)),calls.map(c=>c.arguments));
    }
    assert.doesNotMatch(seen[0],/Return at most one host tool call|at most one|parallel_tool_calls:false|bounded model turns/i);
    const serial=await (await transport.chat({...body,parallel_tool_calls:false},new AbortController().signal)).text();
    assert.match(serial,/invalid_decision/);assert.doesNotMatch(serial,/\[DONE\]/);
    assert.match(seen.at(-1),/This request sets parallel_tool_calls:false\. Return at most one host tool call\./);
  }
});

test('WorkBuddy runtime-specific system survives replay and JSON format corrections',async t=>{
  for(const native of [false,true]){
    const seen=[],runtime=await directory(),config=bridgePromptConfig(native?'kimi':'codex').workbuddy;
    const transport=new SdkTransport({runtime,cliPath:process.execPath,toolMode:native?'replay':'json',decisionRetries:1,...config},{get:async()=>credential},{run:async function*({options,prompt}){
      seen.push({system:options.systemPrompt,prompt});
      yield {type:'system',subtype:'init',model:'fixture',session_id:'fixture-session',mcp_servers:native?[{name:'host',status:'connected'}]:[]};
      const text=seen.length===1?'BAD FORMAT':native?'Complete fixture answer.':'{"action":"final","content":"Complete fixture answer."}';
      // Native correction is triggered by protocol markup, not arbitrary plain text.
      const output=native&&seen.length===1?'<tool_call>invalid</tool_call>':text;
      yield {type:'assistant',message:{model:'fixture',content:[{type:'text',text:output}]}};
      yield {type:'result',subtype:'success',is_error:false,result:output};
    }});
    t.after(()=>transport.close());
    const wire=await (await transport.chat({model:'fixture',max_tokens:128,messages:[{role:'user',content:'Bounded fixture task'}],tools:[{type:'function',function:{name:'read',parameters:{type:'object'}}}]},new AbortController().signal)).text();
    assert.match(wire,/Complete fixture answer/);assert.match(wire,/\[DONE\]/);assert.equal(seen.length,2);
    for(const entry of seen)assert.equal(entry.system,config.hostPrompts[native?'native':'decision']);
    assert.doesNotMatch(seen[1].prompt,/DeepSeek Harness|pending Harness/);
  }
});

test('default WorkBuddy hold preserves each host batch and enforces serial requests before dispatch',async t=>{
  const calls=[{id:'hold-a',name:'mcp__host__Read',input:{path:'a'}},{id:'hold-b',name:'mcp__host__Read',input:{path:'b'}}];
  for(const runtimeId of [...Object.keys(names),'claude']){
    const config=bridgePromptConfig(runtimeId).workbuddy;
    const fixture=await holdFixture(t,config,session=>session.toolStep(calls));
    const body={model:'fixture',max_tokens:128,prompt_cache_key:'batch',messages:[{role:'user',content:'Read both files'}],tools:[{type:'function',function:{name:'Read',parameters:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false}}}]};
    const first=await collectHold(await fixture.chat(body),body.tools),message=first.result.choices[0].message;
    assert.equal(first.metrics.mode,'hold');assert.equal(first.result.choices[0].finish_reason,'tool_calls');
    assert.equal(first.metrics.native.model_responses,1);assert.equal(first.metrics.native.host_calls,2);assert.ok(first.metrics.requests[0].tool_input_chars>0);
    assert.deepEqual(message.tool_calls.map(call=>[call.id,call.function.name,JSON.parse(call.function.arguments)]),calls.map(call=>[call.id,'Read',call.input]));
    assert.equal(fixture.sessions.length,1);const session=fixture.sessions[0];
    assert.deepEqual(session.nativeTrace.filter(event=>event.kind==='message_delta').map(event=>event.stop),['tool_use','end_turn']);
    assert.ok(session.options.systemPrompt.startsWith(config.hostPrompts.native+'\n\n'));
    assert.equal(session.options.fallbackModel,undefined);assert.equal(session.options.model,'fixture');
    assert.doesNotMatch(session.prompts[0],/at most one|parallel_tool_calls:false/i);
    if(runtimeId==='codex'){
      const projection=new ResponseProjection('fixture',()=>{});for(const event of first.events)projection.accept(event);
      assert.deepEqual(projection.finish().output.filter(item=>item.type==='function_call').map(item=>JSON.parse(item.arguments)),calls.map(call=>call.input));
    }
    const final=await collectHold(await fixture.chat(hostResults(body,message)),body.tools);
    assert.equal(final.result.choices[0].message.content,'Complete fixture answer.');assert.equal(final.result.choices[0].finish_reason,'stop');
    assert.deepEqual(session.handlerResults.map(result=>result.content[0].text),['host-result-0','host-result-1']);
    assert.equal(fixture.sessions.length,1);assert.equal(session.prompts.length,1,'Host results must resume held MCP calls, not replay the conversation');

    // Emit the same violating two-call model response. The hold lane must expose
    // only the first call and reject the other locally, without host side effects.
    const serialBody={...body,prompt_cache_key:'serial',parallel_tool_calls:false};
    const serial=await collectHold(await fixture.chat(serialBody),body.tools),serialMessage=serial.result.choices[0].message;
    assert.deepEqual(serialMessage.tool_calls,[message.tool_calls[0]]);assert.equal(serial.result.choices[0].finish_reason,'tool_calls');
    assert.equal(serial.metrics.native.parallel_trimmed,1);assert.equal(fixture.sessions.length,2);
    const serialSession=fixture.sessions[1];assert.match(serialSession.prompts[0],/Call at most one host function per reply\./);
    const serialFinal=await collectHold(await fixture.chat(hostResults(serialBody,serialMessage)),body.tools);
    assert.equal(serialFinal.result.choices[0].finish_reason,'stop');assert.equal(serialSession.prompts.length,1);
    assert.equal(serialSession.handlerResults[0].content[0].text,'host-result-0');
    assert.equal(serialSession.handlerResults[1].isError,true);
    assert.equal(serialSession.handlerResults[1].content[0].text,'Only one function call per step is allowed here. Repeat this call in a later step after you have the previous result.');
  }
});

test('default WorkBuddy hold preserves the runtime system through native protocol correction',async t=>{
  const config=bridgePromptConfig('kimi').workbuddy;
  const fixture=await holdFixture(t,config,(session,_prompt,turn)=>session.final(turn===1?'<tool_call>invalid</tool_call>':'Complete fixture answer.'));
  const body={model:'fixture',max_tokens:128,messages:[{role:'user',content:'Bounded fixture task'}],tools:[{type:'function',function:{name:'read',parameters:{type:'object'}}}]};
  const result=await collectHold(await fixture.chat(body),body.tools);
  assert.equal(result.metrics.mode,'hold');assert.equal(result.result.choices[0].message.content,'Complete fixture answer.');
  assert.equal(result.result.choices[0].finish_reason,'stop');assert.doesNotMatch(result.wire,/<tool_call>/);
  assert.equal(fixture.sessions.length,1);const session=fixture.sessions[0];assert.equal(session.prompts.length,2);
  assert.equal(session.options.resume,undefined);assert.equal(session.options.model,'fixture');
  assert.ok(session.options.systemPrompt.startsWith(config.hostPrompts.native+'\n\n'));
  assert.match(session.prompts[1],/native function calling/);assert.doesNotMatch(session.prompts[1],/DeepSeek Harness|pending Harness/);
});

test('gateway binds identical models to separate runtime workers and keeps Responses on that route',async t=>{
  const root=await directory(),model=normalizeWorkbuddy({id:'fixture',name:'Fixture',contextWindow:200000,reasoning:{supportedEfforts:['low']}});
  const selection={modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'},variant=variantFor(model,selection);
  const gateway=new Gateway({root},{get:()=>model},{command:process.execPath,args:[],env:{}},{workerScript:resolve('tests/fixtures/gateway-worker.mjs')});t.after(()=>gateway.close());
  const request=(endpoint,path,body)=>fetch(endpoint.baseURL+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+endpoint.key,'content-type':'application/json'},...body?{body:JSON.stringify(body)}:{}});
  const endpoints=await Promise.all(Object.keys(names).map(id=>gateway.register(model,variant,selection,id)));
  const responses=await Promise.all(endpoints.map(endpoint=>request(endpoint,'/chat/completions',{model:variant.id,messages:[{role:'user',content:'fixture'}],runtimeId:'dsh',bridge_runtime:'dsh'}).then(r=>r.json())));
  assert.equal(new Set(responses.map(r=>r.pid)).size,3);assert.deepEqual(responses.map(r=>r.runtimeId),Object.keys(names));
  for(const [index,id]of Object.keys(names).entries())assert.equal(responses[index].system,bridgePromptConfig(id).qoder.system);
  assert.equal(gateway.children.size,3);assert.equal(gateway.catalog('workbuddy','codex').models.length,1);
  await assert.rejects(gateway.register(model,variant,selection,'antigravity'),/原生提示词/);
  await assert.rejects(gateway.register(model,variant,selection),/运行环境/);
  const old=await fetch(gateway.base+'/workbuddy/v1/models',{headers:{authorization:'Bearer '+gateway.key}});assert.equal(old.status,404);
  // A Responses conversion must re-enter Codex, never the former DSH/default route.
  const originalFetch=globalThis.fetch;let internalPath;
  globalThis.fetch=(url,options)=>{
    if(String(url)===endpoints[2].baseURL+'/chat/completions'){
      internalPath=new URL(url).pathname;
      return Promise.resolve(new Response('data: '+JSON.stringify({choices:[{delta:{content:'fixture'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}}));
    }
    return originalFetch(url,options);
  };
  try{const result=await request(endpoints[2],'/responses',{model:variant.id,input:'fixture'});assert.equal(result.status,200);assert.equal((await result.json()).status,'completed');assert.equal(internalPath,'/codex/workbuddy/v1/chat/completions');}finally{globalThis.fetch=originalFetch;}
});

test('session selection forwards the frontend runtime and Gemini bypasses the gateway',async t=>{
  const root=await directory(),store=await new Store(root).open(),calls=[],instances=[];
  const model=normalizeWorkbuddy({id:'fixture',name:'Fixture',contextWindow:200000,reasoning:{supportedEfforts:['low']}}),gemini=normalizeAntigravity({id:'gemini-3.8-flash-low',name:'Gemini 3.8 Flash'});
  const providers={get:key=>key===gemini.key?gemini:model};
  class Fake {constructor(options){Object.assign(this,options);instances.push(this);}async close(){this.closed=true;}}
  const runtimes=['dsh','kimi','codex','antigravity'].map(id=>({id,name:id,installed:true}));
  const sessions=new Sessions(store,providers,{register:async(...args)=>{calls.push(args);return {baseURL:'fixture'};}},runtimes,{constructors:Object.fromEntries(runtimes.map(r=>[r.id,Fake]))});
  t.after(async()=>{await sessions.close();await store.close();});
  await store.mutate(s=>{s.projects=[{id:'project',path:root,name:'Fixture'}];});
  for(const runtimeId of ['dsh','kimi','codex']){
    const session=await sessions.create({projectId:'project',runtimeId,selection:{modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'}});await sessions.adapter(session);
    assert.equal(calls.at(-1)[3],runtimeId);
  }
  const session=await sessions.create({projectId:'project',runtimeId:'antigravity',selection:{modelKey:gemini.key,identity:gemini.identity}});await sessions.adapter(session);
  assert.equal(calls.length,3);assert.equal(instances.at(-1).endpoint,undefined);assert.equal(instances.at(-1).session.selection.nativeModel,gemini.id);
});
