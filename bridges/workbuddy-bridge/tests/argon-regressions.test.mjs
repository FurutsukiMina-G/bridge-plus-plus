import test from 'node:test';
import assert from 'node:assert/strict';
import {hostToolAlias,nativeSupported,nativeDecision,PREFIX} from '../src/native.mjs';
import {compileTools} from '../src/decision.mjs';
import {DecisionOutput} from '../src/decision-output.mjs';
import {SdkTransport} from '../src/sdk-transport.mjs';
import {digest} from '../src/context.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const tool=name=>({type:'function',function:{name,parameters:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false}}});
test('long/namespaced tools stay native and restore their original identities with full schema validation',()=>{
  for(const name of ['mcp.server.tool','long_'.repeat(30)]){
    const tools=[tool(name)],body={tools,tool_choice:{type:'function',function:{name}}};assert.equal(nativeSupported(tools),true);assert.ok(hostToolAlias(name).length<=53);
    const result=nativeDecision({calls:[{id:'c',name:PREFIX+hostToolAlias(name),input:{path:'a'}}],text:'',truncated:false},body,compileTools(tools));
    assert.equal(result.calls[0].name,name);assert.throws(()=>nativeDecision({calls:[{name:PREFIX+hostToolAlias(name),input:{}}],text:'',truncated:false},body,compileTools(tools)),/Schema/);
  }
});
test('truncated native text survives but a truncated tool call cannot dispatch even with apparently complete arguments',()=>{
  const tools=[tool('write')],body={tools},validators=compileTools(tools);
  const result=nativeDecision({calls:[],text:'partial report',truncated:true},body,validators);assert.equal(result.finishReason,'length');assert.equal(result.content,'partial report');
  assert.throws(()=>nativeDecision({calls:[{name:PREFIX+'write',input:{path:'a'}}],text:'',truncated:true},body,validators),/output budget/);
});
test('JSON output limits preserve only canonical final text, rejecting partial tools and overflow',()=>{
  const output=new DecisionOutput();output.result={result:'{"action":"final","content":"half\\n中文\\uD83D'};output.stopReasons.add('max_tokens');
  const kept=output.decision({},new Map());assert.equal(kept.decision.content,'half\n中文');assert.equal(kept.decision.finishReason,'length');
  output.result={result:'{"action":"tool_calls","calls":[{"name":"write"'};assert.throws(()=>output.decision({},new Map()),/output budget/);
  output.result={result:'{"action":"final","content":"half'};output.stopReasons.add('model_context_window_exceeded');assert.throws(()=>output.decision({},new Map()),/output budget/);
});
test('a cached rejection does not acquire, evict or discard any parent SDK lane',async()=>{
  const runtime=await mkdtemp(join(tmpdir(),'bridge-rejection-')),credential={uid:'u',domain:'d'},body={model:'m',messages:[{role:'user',content:'task'}]},transport=new SdkTransport({runtime},{get:async()=>credential},{run:()=>{throw new Error('No SDK call is allowed');}});
  try{
    transport.failures.set(digest({body,uid:'u',domain:'d',mode:'json'}),{at:Date.now(),body:{error:{code:'invalid_decision',automatic_retry:false}}});
    transport.pool.acquire=()=>{throw new Error('No pool operation is allowed');};
    const response=await transport.chat(body,new AbortController().signal);assert.match(await response.text(),/invalid_decision/);assert.equal(response.bridgeMetrics.localReplay,true);assert.equal(transport.metrics.started,0);
  }finally{await transport.close();await rm(runtime,{recursive:true,force:true});}
});
