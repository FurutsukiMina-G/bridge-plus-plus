import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatRequest,parseDecision,conversationPrompt,completion,chunks} from '../src/compat.js';

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

test('batch call headers repair both observed separators without touching argument strings',()=>{
  const calls=[{name:'Read',arguments:args},{name:'Read',arguments:{path:'second',note:malformed}}];
  const goodBatch={kind:'tool_calls' as const,calls};
  const raw=JSON.stringify(goodBatch).replace('"name":"Read"','"name="Read"').replace('},{"name":"Read"','},{"name=" :"" type="string"  ,"Read"');
  const repairs:unknown[]=[];
  assert.deepEqual(parseDecision(raw,request,r=>repairs.push(r)),goodBatch);
  assert.equal(repairs.length,2);
  for(const source of [raw,JSON.stringify(goodBatch)]){
    const repairs: {kind:string}[]=[];
    assert.deepEqual(parseDecision(source.slice(0,-1),request,r=>repairs.push(r)),goodBatch);
    assert.equal(repairs.at(-1)?.kind,'missing_decision_close');
    for(const invalid of [source.slice(0,-2),source.slice(0,-3),source+' trailing',source.replace('"path":"second"','"path":12'),source.replace('"path":"second"','"unexpected":"second"'),source.replace('"path":"second"','"path":"cut')]){
      const rejected:unknown[]=[];assert.throws(()=>parseDecision(invalid,request,r=>rejected.push(r)));assert.deepEqual(rejected,[]);
    }
    assert.throws(()=>parseDecision(source,{...request,parallel_tool_calls:false}),/only one/);
  }
});

test('batch repair rejects a damaged member even when its arguments contain a complete decision',()=>{
  const inner=JSON.stringify(good);
  for(const name of ['"name="Read"','"name=" :"" type="string" ,"Read"']){
    const first=`{${name},"arguments":${JSON.stringify(args)}}`;
    for(const broken of ['{"name="Unknown","arguments":{"path":"b"}}','{"name="Read","arguments":'+JSON.stringify({path:inner})+',"extra":true}','{"name="Read","arguments":']){
      const repairs:unknown[]=[];
      assert.throws(()=>parseDecision(`{"kind":"tool_calls","calls":[${first},${broken}]}`,request,r=>repairs.push(r)));
      assert.deepEqual(repairs,[]);
    }
  }
});

test('Qoder request limits are conditional and multiple calls survive host completion and SSE',()=>{
  assert.doesNotMatch(conversationPrompt(request),/Return at most one host tool call/);
  assert.match(conversationPrompt({...request,parallel_tool_calls:false}),/Return at most one host tool call/);
  const decision={kind:'tool_calls' as const,calls:[{name:'Read',arguments:args},{name:'Read',arguments:{path:'second'}}]};
  for(const host of ['Kimi Code','DeepSeek Harness','Codex CLI']){
    const prompt=conversationPrompt(request,{decisionContract:{full:host,continuation:host}});
    assert.match(prompt,new RegExp(host));
    const parsed=parseDecision(JSON.stringify(decision),request),result=completion(request,parsed);
    assert.deepEqual(result.choices[0]!.message.tool_calls?.map(c=>JSON.parse(c.function.arguments)),decision.calls.map(c=>c.arguments));
    assert.equal(chunks(result).filter((e:any)=>e.choices[0].delta.tool_calls).length,2);
  }
});
