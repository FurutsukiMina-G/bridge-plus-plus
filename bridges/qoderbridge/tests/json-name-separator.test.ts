import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatRequest,parseDecision} from '../src/compat.js';

const request=ChatRequest.parse({model:'qoder-deepseek-flash',messages:[{role:'user',content:'Read a synthetic fixture'}],tools:[{type:'function',function:{name:'Read',parameters:{type:'object',properties:{path:{type:'string'},max_chars:{type:'integer'},note:{type:'string'}},required:['path'],additionalProperties:false}}}]});
const args={path:'D:\\fixture\\example.txt',max_chars:12000,note:'Keep literal "name=\"Other\" and JSON {a:b} intact. 中文'};
const good={kind:'tool_call',name:'Read',arguments:args},canonical=JSON.stringify(good),malformed=canonical.replace('"name":','"name=');
test('a complete known single call with the observed name separator typo is decoded losslessly',()=>{
  const repairs:unknown[]=[];assert.deepEqual(parseDecision(malformed,request,r=>repairs.push(r)),good);
  assert.deepEqual(repairs,[{kind:'json_tool_name_separator',tool:'Read',parameter:'name'}]);
  assert.deepEqual(parseDecision('```json\n'+malformed+'\n```',request),good);
  assert.deepEqual(parseDecision(canonical,request),good);
});
test('separator normalization never invents arguments, accepts unknown tools, skips validation or drops extra calls',()=>{
  for(const source of [malformed.slice(0,-1),malformed+'\n'+canonical,malformed.replace('"Read"','"Unknown"'),malformed.replace('"max_chars":12000','"max_chars":"12000"'),malformed.replace('"path":','"unexpected":'),malformed.slice(0,-1)+',"name":"Other"}',malformed.replace('"arguments":{','"arguments":[')]){
    const repairs:unknown[]=[];assert.throws(()=>parseDecision(source,request,r=>repairs.push(r)));assert.deepEqual(repairs,[]);
  }
  assert.throws(()=>parseDecision(malformed,{...request,tool_choice:'none'}),/forbids/);
  assert.throws(()=>parseDecision(malformed,{...request,tool_choice:{type:'function',function:{name:'Other'}}}),/unselected/);
});
test('the typo inside final prose or argument data is never treated as another call',()=>{
  const content='Example only: '+malformed;
  assert.deepEqual(parseDecision(JSON.stringify({kind:'final',content}),request),{kind:'final',content});
  assert.deepEqual(parseDecision(JSON.stringify({...good,arguments:{path:'fixture',note:malformed}}),request),{...good,arguments:{path:'fixture',note:malformed}});
});
