import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Gateway} from '../app/services/gateway.mjs';
import {requestKind} from '../app/services/gateway-usage.mjs';
import {normalizeWorkbuddy,variantFor} from '../app/core/catalog.mjs';

const raw={id:'fixture',name:'Fixture',contextWindow:200000,reasoning:{supportedEfforts:['low']}};
const select=model=>({modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'});
// One declared tool is dropped by each converter, so `tools_count` can only match the
// client's own count if the route carries it across the conversion hop.
const chatTools=[{type:'function',function:{name:'Read',parameters:{type:'object',properties:{}}}}];
const chatOnly={type:'function',function:{name:'PowerShell',parameters:{type:'object',properties:{}}}};
const anthropicTools=[{name:'Read',description:'Read a file',input_schema:{type:'object',properties:{}}},{name:'Deferred',defer_loading:true,input_schema:{type:'object',properties:{}}}];
const responsesTools=[{type:'function',name:'shell',parameters:{type:'object',properties:{}}},{type:'web_search'}];

async function fixture(t,runtimeId,sessionId){
  await mkdir('.runtime/tests',{recursive:true});
  const root=await mkdtemp(resolve('.runtime/tests/aux-route-')),model=normalizeWorkbuddy(raw),selection=select(model),variant=variantFor(model,selection);
  const gateway=new Gateway({root},{get:()=>model},{command:process.execPath,args:[],env:{}},{workerScript:resolve('tests/fixtures/usage-worker.mjs')});
  t.after(()=>gateway.close());
  const events=[];gateway.onUsage=(_id,event)=>{events.push(event);};
  const endpoint=await gateway.register(model,variant,selection,runtimeId,sessionId);
  const post=async(route,body,headers={})=>{
    const response=await fetch(`${endpoint.baseURL}/${route}`,{method:'POST',headers:{authorization:`Bearer ${endpoint.key}`,'content-type':'application/json',...headers},body:JSON.stringify(body)});
    await response.text();return (events.splice(0).filter(event=>event.type==='usage'&&event.scope==='request').at(-1)?.data)??null;
  };
  return {post,variant:variant.id,events,endpoint,gateway};
}
const chat=extra=>({model:undefined,messages:[{role:'user',content:'synthetic agent turn'}],stream:true,...extra});

test('the OpenAI chat route states the declared tool count and marks side requests',async t=>{
  const f=await fixture(t,'dsh','session-chat');
  const withTools=await f.post('chat/completions',{...chat(),model:f.variant,tools:[...chatTools,chatOnly]});
  assert.deepEqual({auxiliary:withTools.auxiliary,tools_count:withTools.tools_count},{auxiliary:false,tools_count:2});
  const empty=await f.post('chat/completions',{...chat(),model:f.variant});
  assert.deepEqual({auxiliary:empty.auxiliary,tools_count:empty.tools_count},{auxiliary:true,tools_count:0});
  const forbidden=await f.post('chat/completions',{...chat(),model:f.variant,tools:[...chatTools,chatOnly],tool_choice:'none'});
  assert.deepEqual({auxiliary:forbidden.auxiliary,tools_count:forbidden.tools_count},{auxiliary:true,tools_count:2},'tool_choice:none is a request that cannot use tools');
  const stated=await f.post('chat/completions',{...chat(),model:f.variant,tools:[...chatTools,chatOnly]},{['x-bridge-auxiliary']:'1'});
  assert.deepEqual({auxiliary:stated.auxiliary,tools_count:stated.tools_count},{auxiliary:true,tools_count:2},'an explicit header wins over the tool count');
  const denied=await f.post('chat/completions',{...chat(),model:f.variant},{['x-bridge-auxiliary']:'0'});
  assert.deepEqual({auxiliary:denied.auxiliary,tools_count:denied.tools_count},{auxiliary:false,tools_count:0});
});

test('the Anthropic messages route marks side requests and keeps the client tool count',async t=>{
  const f=await fixture(t,'claude','session-messages');
  const withTools=await f.post('messages',{...chat(),model:f.variant,max_tokens:64,tools:anthropicTools});
  assert.deepEqual({auxiliary:withTools.auxiliary,tools_count:withTools.tools_count},{auxiliary:false,tools_count:2},'a deferred tool is still declared by the client');
  const empty=await f.post('messages',{...chat(),model:f.variant,max_tokens:64});
  assert.deepEqual({auxiliary:empty.auxiliary,tools_count:empty.tools_count},{auxiliary:true,tools_count:0});
  const forbidden=await f.post('messages',{...chat(),model:f.variant,max_tokens:64,tools:anthropicTools,tool_choice:{type:'none'}});
  assert.deepEqual({auxiliary:forbidden.auxiliary,tools_count:forbidden.tools_count},{auxiliary:true,tools_count:2});
  const stated=await f.post('messages',{...chat(),model:f.variant,max_tokens:64,tools:anthropicTools},{['x-bridge-auxiliary']:'1'});
  assert.deepEqual({auxiliary:stated.auxiliary,tools_count:stated.tools_count},{auxiliary:true,tools_count:2});
  const denied=await f.post('messages',{...chat(),model:f.variant,max_tokens:64},{['x-bridge-auxiliary']:'0'});
  assert.deepEqual({auxiliary:denied.auxiliary,tools_count:denied.tools_count},{auxiliary:false,tools_count:0});
});

test('the Codex responses route states its own intent instead of trusting the converted tool list',async t=>{
  const f=await fixture(t,'codex','session-responses');
  const withTools=await f.post('responses',{model:f.variant,input:'synthetic agent turn',tools:responsesTools});
  assert.deepEqual({auxiliary:withTools.auxiliary,tools_count:withTools.tools_count},{auxiliary:false,tools_count:2},'a server-only tool is still declared by the client');
  const empty=await f.post('responses',{model:f.variant,input:'synthetic agent turn'});
  assert.deepEqual({auxiliary:empty.auxiliary,tools_count:empty.tools_count},{auxiliary:true,tools_count:0});
  const forbidden=await f.post('responses',{model:f.variant,input:'synthetic agent turn',tools:responsesTools,tool_choice:'none'});
  assert.deepEqual({auxiliary:forbidden.auxiliary,tools_count:forbidden.tools_count},{auxiliary:true,tools_count:2});
  const stated=await f.post('responses',{model:f.variant,input:'synthetic agent turn',tools:responsesTools},{['x-bridge-auxiliary']:'1'});
  assert.deepEqual({auxiliary:stated.auxiliary,tools_count:stated.tools_count},{auxiliary:true,tools_count:2});
  const denied=await f.post('responses',{model:f.variant,input:'synthetic agent turn'},{['x-bridge-auxiliary']:'0'});
  assert.deepEqual({auxiliary:denied.auxiliary,tools_count:denied.tools_count},{auxiliary:false,tools_count:0});
});

test('the classification rule itself is one function for all three routes',()=>{
  for(const body of [{},undefined,null])assert.deepEqual(requestKind(body),{auxiliary:true,toolsCount:0});
  assert.deepEqual(requestKind({tools:[]}),(requestKind({})));
  assert.deepEqual(requestKind({tools:[chatOnly],tool_choice:{type:'none'}}),{auxiliary:true,toolsCount:1});
  assert.deepEqual(requestKind({tools:[chatOnly],tool_choice:'required'}),{auxiliary:false,toolsCount:1});
  assert.deepEqual(requestKind({tools:[chatOnly]},{'x-bridge-tool-count':'9'}),{auxiliary:false,toolsCount:9});
  assert.deepEqual(requestKind({tools:[chatOnly]},{'x-bridge-tool-count':'-3'}),{auxiliary:false,toolsCount:1},'a malformed count header falls back to the body');
  assert.deepEqual(requestKind({tool_choice:'none'}),{auxiliary:true,toolsCount:0});
});

test('count_tokens is reported as a character estimate, not a measurement',async t=>{
  const f=await fixture(t,'claude','session-count');
  const body={...chat(),model:f.variant,max_tokens:64,messages:[{role:'user',content:'synthetic'.repeat(40)}]};
  const response=await fetch(`${f.endpoint.baseURL}/messages/count_tokens`,{method:'POST',headers:{authorization:`Bearer ${f.endpoint.key}`,'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-bridge-count-tokens'),'estimated=characters/4');
  assert.deepEqual(await response.json(),{input_tokens:Math.ceil(JSON.stringify(body).length/4)},'the documented Anthropic response shape stays unchanged');
  assert.equal(f.gateway.countTokensEstimates,1);
});

test('an auxiliary request may ask for a lighter effort the model supports, never a heavier one',async()=>{
  const {lighterEffort}=await import('../app/services/gateway.mjs');
  assert.equal(lighterEffort('none,low',['high','max','low','none']),'none');
  assert.equal(lighterEffort('none,low',['xhigh','low','medium']),'low');
  assert.equal(lighterEffort('xhigh,max',['xhigh','max']),null);
  assert.equal(lighterEffort(undefined,['low']),null);
  assert.equal(lighterEffort('low',[]),null);
});
