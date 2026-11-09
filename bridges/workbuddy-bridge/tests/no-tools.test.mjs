import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDecision,decisionInput} from '../src/decision.mjs';
import {nativeDecision,nativeCorrection} from '../src/native.mjs';
import {correctionInput} from '../src/recovery.mjs';
import {SdkTransport} from '../src/sdk-transport.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const body={messages:[{role:'system',content:'Synthetic classifier'},{role:'user',content:'Synthetic operation'}],response_format:{type:'json_object'}};
const text='{"risk":"low","decision":"allow"}';
test('JSON and native modes accept direct audit JSON and legacy envelopes with tools disabled',()=>{
  for(const request of [body,{...body,tool_choice:'none',tools:[{type:'function',function:{name:'read'}}]}]){
    assert.deepEqual(parseDecision(text,request),{action:'final',content:text});
    assert.equal(parseDecision(JSON.stringify({action:'final',content:text}),request).content,text);
    assert.equal(nativeDecision({calls:[],text},request).content,text);
    assert.doesNotMatch(decisionInput(request),/tool_calls|action/);
    for(const correction of [correctionInput,nativeCorrection])assert.doesNotMatch(correction(request,{code:'invalid_decision'}).prompt,/tool_calls|mcp__host__|read\/search/);
  }
  assert.equal(parseDecision('  Plain text  ',{messages:[]}).content,'  Plain text  ');
  assert.throws(()=>parseDecision(text,{...body,response_format:{type:'json_schema',json_schema:{schema:{type:'object',required:['missing']}}}}));
});
for(const toolMode of ['native','json'])test(`${toolMode} audit transport buffers schema-invalid streamed JSON and corrects with answer-only instructions`,async t=>{
  const runtime=await mkdtemp(join(tmpdir(),'wb-audit-')),seen=[];
  const request={...body,model:'synthetic-flash',max_tokens:128,response_format:{type:'json_schema',json_schema:{name:'synthetic_audit',schema:{type:'object',required:['risk','decision']}}}};
  const transport=new SdkTransport({runtime,cliPath:process.execPath,toolMode,decisionRetries:1},{get:async()=>({accessToken:'synthetic',uid:'synthetic',domain:'synthetic'})},{run:async function*({prompt,options}){
    seen.push({prompt,options});const output=seen.length===1?'{"wrong":true}':text;
    yield {type:'system',subtype:'init',model:request.model,session_id:'synthetic-session',mcp_servers:[]};
    yield {type:'stream_event',event:{type:'content_block_start',index:0,content_block:{type:'text',text:''}}};
    yield {type:'stream_event',event:{type:'content_block_delta',index:0,delta:{type:'text_delta',text:output}}};
    yield {type:'stream_event',event:{type:'content_block_stop',index:0}};
    yield {type:'assistant',message:{model:request.model,content:[{type:'text',text:output}]}};
    yield {type:'result',subtype:'success',is_error:false,result:output};
  }});
  t.after(async()=>{await transport.close();await rm(runtime,{recursive:true,force:true});});
  const response=await transport.chat(request,new AbortController().signal),wire=await response.text();assert.equal(seen.length,2);assert.doesNotMatch(wire,/wrong/);assert.match(wire,/allow/);assert.match(wire,/\[DONE\]/);
  assert.doesNotMatch(seen[1].prompt,/tool_calls|mcp__host__|declared tool/);assert.doesNotMatch(seen[0].options.systemPrompt,/action.*final/);
});
