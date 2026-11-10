import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Gateway} from '../app/services/gateway.mjs';
import {normalizeWorkbuddy,variantFor} from '../app/core/catalog.mjs';

const raw={id:'fixture',name:'Fixture',contextWindow:200000,reasoning:{supportedEfforts:['low']}};
const select=model=>({modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'});
const chatTools=[{type:'function',function:{name:'PowerShell',description:'Run a command',parameters:{type:'object',properties:{}}}}];
const anthropicTools=[{name:'Read',description:'Read a file',input_schema:{type:'object',properties:{}}}];
async function fixture(t,runtimeId,sessionId){
  await mkdir('.runtime/tests',{recursive:true});
  const root=await mkdtemp(resolve('.runtime/tests/aux-usage-')),model=normalizeWorkbuddy(raw),selection=select(model),variant=variantFor(model,selection);
  const gateway=new Gateway({root},{get:()=>model},{command:process.execPath,args:[],env:{}},{workerScript:resolve('tests/fixtures/usage-worker.mjs')});
  t.after(()=>gateway.close());
  const events=[];gateway.onUsage=(_id,event)=>{events.push(event);};
  const endpoint=await gateway.register(model,variant,selection,runtimeId,sessionId);
  return {endpoint,events,variant};
}

test('chat route marks only requests without tool declarations as auxiliary usage',async t=>{
  const f=await fixture(t,'codex','session-chat');
  const post=extra=>fetch(f.endpoint.baseURL+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+f.endpoint.key,'content-type':'application/json'},body:JSON.stringify({model:f.variant.id,stream:true,messages:[{role:'user',content:'agent turn'}],...extra})}).then(response=>response.text());
  await post({tools:chatTools});await post({});
  const usage=f.events.filter(event=>event.type==='usage'&&event.scope==='request');
  assert.equal(usage.length,2);
  assert.equal(usage[0].data.auxiliary,undefined);
  assert.equal(usage[1].data.auxiliary,true);
  assert.equal(usage[1].data.prompt_tokens,30);
});

test('claude route marks only Anthropic requests without tools as auxiliary usage',async t=>{
  const f=await fixture(t,'claude','session-claude');
  const post=extra=>fetch(f.endpoint.baseURL+'/messages',{method:'POST',headers:{authorization:'Bearer '+f.endpoint.key,'content-type':'application/json'},body:JSON.stringify({model:f.variant.id,max_tokens:64,stream:true,messages:[{role:'user',content:'agent turn'}],...extra})}).then(response=>response.text());
  await post({tools:anthropicTools});await post({});
  const usage=f.events.filter(event=>event.type==='usage'&&event.scope==='request');
  assert.equal(usage.length,2);
  assert.equal(usage[0].data.auxiliary,undefined);
  assert.equal(usage[1].data.auxiliary,true);
});
