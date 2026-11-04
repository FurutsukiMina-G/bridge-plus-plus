import {test} from 'node:test';
import assert from 'node:assert/strict';
import {F as Client} from '../bridges/workbuddy-bridge/vendor/workbuddy-connect-4.13.0.mjs';
test('Workbench requests the complete WorkBuddy catalog while legacy CLI-roster behavior stays compatible',async t=>{
  const response={code:0,data:{models:[{id:'cli-model',name:'CLI',maxInputTokens:200000,maxOutputTokens:8000,supportsToolCall:true},{id:'desktop-model',name:'Desktop model',maxInputTokens:1000000,maxOutputTokens:32000,supportsToolCall:true},{id:'disabled',name:'Disabled',disabled:true,maxInputTokens:200000,maxOutputTokens:8000}],agents:[{name:'cli',models:['cli-model']}]}};
  t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify(response),{headers:{'content-type':'application/json'}}));
  const client=new Client(),credential={domain:'codebuddy.cn',uid:'fixture',accessToken:'fixture'};
  assert.deepEqual((await client.fetchModels(credential)).map(m=>m.id),['cli-model']);
  assert.deepEqual((await client.fetchModels(credential,undefined,{allModels:true})).map(m=>m.id),['cli-model','desktop-model']);
});
