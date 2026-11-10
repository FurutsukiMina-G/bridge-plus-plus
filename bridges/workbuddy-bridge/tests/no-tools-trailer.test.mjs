import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeInput} from '../src/native.mjs';
import {decisionInput} from '../src/decision.mjs';
const messages=[{role:'system',content:'Synthetic reviewer'},{role:'user',content:'Synthetic change to review'}];
const tools=[{type:'function',function:{name:'read',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']}}}];
const formats=[{type:'json_object'},{type:'json_schema',json_schema:{name:'synthetic_audit',schema:{type:'object'}}}];
const NEUTRAL='Reply exactly as the conversation above instructs.';
const ANSWER_JSON='Return the final answer as the JSON document requested by response_format, without a bridge action envelope.';
const ANSWER_TEXT='Answer in plain text when the task is complete or you need the user.';
const CALL='Call host functions natively for every action the task still needs. ';
// A host-side reviewer reads the closing line as the message it must judge, so a request that
// declares no tools must not claim that host functions are unavailable.
const NO_HOST_NOTE=/Host functions|unavailable/i;
test('a request that declares no tools closes with a neutral line only',()=>{
  const requests=[{messages},{messages,tools:[]},{messages,tools:[],tool_choice:'auto'},{messages,tool_choice:'none'}];
  for(const request of requests)for(const delta of [false,true]){
    const input=nativeInput(request,{delta});
    for(const banned of [NO_HOST_NOTE,/plain text/i])assert.doesNotMatch(input,banned,input);
    const prefix=delta?'Continue the same host task with the new messages above. ':'END OF HOST INPUT. ';
    assert.ok(input.endsWith(prefix+NEUTRAL),input);
  }
});
test('a request that declares no tools keeps the response_format JSON instruction',()=>{
  for(const response_format of formats)for(const delta of [false,true]){
    const input=nativeInput({messages,response_format},{delta});
    for(const banned of [NO_HOST_NOTE,/plain text/i])assert.doesNotMatch(input,banned,input);
    assert.ok(input.endsWith((delta?'Continue the same host task with the new messages above. ':'END OF HOST INPUT. ')+ANSWER_JSON),input);
  }
});
test('declared tools keep the existing trailer text',()=>{
  const declared={messages,tools};
  const write=' Never write calls, arguments or markup as text.';
  const structured={messages,tools,response_format:formats[0]};
  assert.ok(nativeInput(declared,{batching:false}).endsWith('END OF HOST INPUT. '+CALL+ANSWER_TEXT+write));
  assert.ok(nativeInput(declared,{batching:false,delta:true}).endsWith('Continue the same host task with the new messages above. '+CALL+ANSWER_TEXT+write));
  assert.ok(nativeInput(declared,{batching:false}).includes('END OF HOST INPUT. '+CALL+ANSWER_TEXT+write));
  const disabled={...declared,tool_choice:'none'};
  assert.ok(nativeInput(disabled,{batching:false}).endsWith('END OF HOST INPUT. Host functions are unavailable for this step. '+ANSWER_TEXT));
  assert.ok(nativeInput({...disabled,response_format:formats[0]},{batching:false}).endsWith('END OF HOST INPUT. Host functions are unavailable for this step. '+ANSWER_JSON));
  // An ordinary structured answer request keeps its own JSON sentence.
  assert.ok(nativeInput(structured,{batching:false}).endsWith('END OF HOST INPUT. '+CALL+ANSWER_JSON+write));
  // A pinned function is still named (by its native alias, unchanged by this task).
  assert.ok(nativeInput({messages,tools,tool_choice:{type:'function',function:{name:'read'}}},{batching:false}).endsWith('END OF HOST INPUT. Call the host function read natively now.'));
});
test('the JSON decision path names no host functions for a toolless request',()=>{
  for(const request of [{messages},{messages,response_format:formats[0]},{messages,tool_choice:'none'}])assert.doesNotMatch(decisionInput(request),NO_HOST_NOTE);
});
