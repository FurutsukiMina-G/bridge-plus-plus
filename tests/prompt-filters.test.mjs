import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {stripBillingHeader} from '../app/services/prompt-filters.mjs';
import {Gateway} from '../app/services/gateway.mjs';
import {normalizeWorkbuddy,variantFor} from '../app/core/catalog.mjs';

test('billing header filter handles strings, parts, roles and preserves untouched input',()=>{
  const input=[
    {role:'system',content:'first\n  X-ANTHROPIC-BILLING-HEADER: cc_version=one;\nlast'},
    {role:'developer',content:[{type:'text',text:'x-anthropic-billing-header: cc_version=two;'},{type:'text',text:'keep'},{type:'image_url',image_url:{url:'fixture'}}]},
    {role:'user',content:'x-anthropic-billing-header: user content'},
    {role:'assistant',content:[{type:'text',text:'x-anthropic-billing-header: assistant content'}]},
    {role:'system',content:'only this line'},
  ];
  const snapshot=structuredClone(input),filtered=stripBillingHeader(input);
  assert.notEqual(filtered,input);assert.deepEqual(input,snapshot);
  assert.equal(filtered[0].content,'first\nlast');
  assert.deepEqual(filtered[1].content,[{type:'text',text:'keep'},input[1].content[2]]);
  assert.equal(filtered[2],input[2]);assert.equal(filtered[3],input[3]);assert.equal(filtered[4],input[4]);
  assert.equal(stripBillingHeader(filtered),filtered);
  assert.deepEqual(stripBillingHeader([{role:'system',content:'x-anthropic-billing-header: only'}]),[]);
  assert.deepEqual(stripBillingHeader([{role:'developer',content:[{type:'text',text:'before\nx-anthropic-billing-header: middle\nafter'}]}]),[{role:'developer',content:[{type:'text',text:'before\nafter'}]}]);
});

test('gateway strips billing lines after history conversion before the worker request',async t=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/prompt-filters-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const model=normalizeWorkbuddy({id:'fixture',name:'Fixture',contextWindow:200000,reasoning:{supportedEfforts:['low']}}),selection={modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'},variant=variantFor(model,selection);
  const gateway=new Gateway({root},{get:()=>model},{command:process.execPath,args:[],env:{}},{workerScript:resolve('tests/fixtures/gateway-worker.mjs')});t.after(()=>gateway.close());
  const endpoint=await gateway.register(model,variant,selection,'dsh'),originalFetch=globalThis.fetch;let forwarded;
  globalThis.fetch=(url,options)=>{
    if(!String(url).startsWith(gateway.base)&&String(url).endsWith('/v1/chat/completions')){
      forwarded=JSON.parse(options.body);return Promise.resolve(new Response(JSON.stringify({choices:[{message:{content:'ok'},finish_reason:'stop'}]}),{headers:{'content-type':'application/json'}}));
    }
    return originalFetch(url,options);
  };t.after(()=>{globalThis.fetch=originalFetch;});
  const response=await fetch(endpoint.baseURL+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+endpoint.key,'content-type':'application/json'},body:JSON.stringify({model:variant.id,messages:[{role:'system',content:[{type:'text',text:'before\nx-anthropic-billing-header: cc_version=fixture;\nafter'}]},{role:'user',content:'x-anthropic-billing-header: retain user text'}]})});
  assert.equal(response.status,200);assert.equal(forwarded.messages[0].content,'before\nafter');assert.equal(forwarded.messages[1].content,'x-anthropic-billing-header: retain user text');assert.equal(gateway.billingHeaderFilterCount,1);
});

test('chat completions still drop usage the client never requested',async t=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/prompt-filters-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const model=normalizeWorkbuddy({id:'fixture',name:'Fixture',contextWindow:200000,reasoning:{supportedEfforts:['low']}}),selection={modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'},variant=variantFor(model,selection);
  const gateway=new Gateway({root},{get:()=>model},{command:process.execPath,args:[],env:{}},{workerScript:resolve('tests/fixtures/gateway-worker.mjs')});t.after(()=>gateway.close());
  const endpoint=await gateway.register(model,variant,selection,'dsh'),originalFetch=globalThis.fetch;let forwarded;
  globalThis.fetch=(url,options)=>{
    if(!String(url).startsWith(gateway.base)&&String(url).endsWith('/v1/chat/completions')){
      forwarded=JSON.parse(options.body);
      return Promise.resolve(new Response('data: '+JSON.stringify({choices:[{delta:{content:'ok'}}]})+'\\n\\ndata: '+JSON.stringify({choices:[],usage:{prompt_tokens:7,completion_tokens:1}})+'\\n\\ndata: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}]})+'\\n\\ndata: [DONE]\\n\\n',{headers:{'content-type':'text/event-stream'}}));
    }
    return originalFetch(url,options);
  };
  t.after(()=>{globalThis.fetch=originalFetch;});
  const response=await fetch(endpoint.baseURL+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+endpoint.key,'content-type':'application/json'},body:JSON.stringify({model:variant.id,stream:true,messages:[{role:'user',content:'hi'}]})});
  assert.equal(response.status,200);assert.equal(forwarded.stream_options.include_usage,true);assert.doesNotMatch(await response.text(),/"usage"/);
});
