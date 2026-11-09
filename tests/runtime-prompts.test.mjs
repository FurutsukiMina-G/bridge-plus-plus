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
  assert.ok(runtimeProfile('antigravity').nativeOnly);
  for(const id of [undefined,'unknown','__proto__','antigravity'])assert.throws(()=>bridgePromptConfig(id));
});

test('all selected WorkBuddy hosts return complete native and JSON batches and enforce explicit serial requests',async t=>{
  const calls=[{name:'Read',arguments:{path:'a'}},{name:'Read',arguments:{path:'b'}}];
  for(const runtimeId of Object.keys(names))for(const native of [false,true]){
    const seen=[],config=bridgePromptConfig(runtimeId).workbuddy;
    const transport=new SdkTransport({runtime:await directory(),cliPath:process.execPath,toolMode:native?'native':'json',decisionRetries:0,...config},{get:async()=>credential},{run:async function*({prompt}){
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

test('WorkBuddy runtime-specific system survives native and JSON format corrections',async t=>{
  for(const native of [false,true]){
    const seen=[],runtime=await directory(),config=bridgePromptConfig(native?'kimi':'codex').workbuddy;
    const transport=new SdkTransport({runtime,cliPath:process.execPath,toolMode:native?'native':'json',decisionRetries:1,...config},{get:async()=>credential},{run:async function*({options,prompt}){
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
