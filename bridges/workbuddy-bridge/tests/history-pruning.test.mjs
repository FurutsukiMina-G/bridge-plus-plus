import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ContextPool} from '../src/context.mjs';
import {SdkTransport} from '../src/sdk-transport.mjs';
const credential={uid:'synthetic',domain:'synthetic',accessToken:'synthetic'};
const call=id=>({role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name:'read',arguments:'{}'}}]});
const messages=[{role:'system',content:'Synthetic system'},{role:'user',content:'Synthetic task'},call('a'),{role:'tool',tool_call_id:'a',content:'PRIVATE_OLD_A'},{role:'assistant',content:'Synthetic progress'},call('b'),{role:'tool',tool_call_id:'b',content:'PRIVATE_OLD_B'}];
const assistant={role:'assistant',content:'Synthetic answer'};
async function fixture(t,cfg={}){const runtime=await mkdtemp(join(tmpdir(),'wb-prune-')),pool=new ContextPool({runtime,...cfg});t.after(async()=>{await pool.close();await rm(runtime,{recursive:true,force:true});});return pool;}
for(const scoped of [true,false])test(`WorkBuddy pruned prefix resumes the exact native conversation, scoped=${scoped}`,async t=>{
  const pool=await fixture(t),body={model:'synthetic',prompt_cache_key:'client',...scoped?{bridge_scope:'app'}:{},messages};
  const first=await pool.acquire(body,credential,new AbortController().signal);first.record.sessionId='native';first.record.contextUsageRatio=0.3;first.commit({},assistant);first.release();
  const next=await pool.acquire({...body,messages:[...messages.filter((_,i)=>i!==3),assistant,{role:'user',content:'NEW_SUFFIX'}]},credential,new AbortController().signal);
  assert.equal(next.record.id,first.record.id);assert.equal(next.reused,true);assert.deepEqual(next.messages,[{role:'user',content:'NEW_SUFFIX'}]);assert.equal(next.metrics.context_reset,null);assert.equal(next.metrics.pruned_history_reuse.removed_message_count,1);next.release();
});
test('native pruned history reuse keeps the host-received echo before retained results',async t=>{
  const pool=await fixture(t,{prunedHistoryReuseRatio:0.6}),body={model:'synthetic',bridge_scope:'app',messages};
  const first=await pool.acquire(body,credential,new AbortController().signal);first.record.sessionId='native';first.record.contextUsageRatio=0.3;
  const nativeAssistant={role:'assistant',content:null,tool_calls:[{id:'native-c',type:'function',function:{name:'read',arguments:'{"file_path":"new.ts"}'}}]};
  first.commit({},nativeAssistant,{echo:'native'});first.release();
  const next=await pool.acquire({...body,messages:[...messages.filter((_,i)=>i!==3),nativeAssistant,{role:'tool',tool_call_id:'native-c',content:'RETAINED_RESULT'}]},credential,new AbortController().signal);
  assert.equal(next.record.id,first.record.id);assert.equal(next.reused,true);assert.ok(next.metrics.pruned_history_reuse);
  assert.deepEqual(next.messages[0].host_received_calls,[{id:'native-c',name:'read',arguments:{file_path:'new.ts'}}]);assert.equal(next.messages[1].tool_call_id,'native-c');
  assert.deepEqual(next.metrics.nativeEcho,{calls:1,characters:JSON.stringify(next.messages[0]).length,truncated:false});next.release();
});
for(const [ratio,threshold,reason]of [[0.6,0.6,'context_usage_high'],[null,0.6,'context_usage_unknown'],[0.2,0,'disabled']])test(`WorkBuddy rejects unsafe pruning ${ratio}/${threshold} with content-free reset diagnostics`,async t=>{
  const pool=await fixture(t,{prunedHistoryReuseRatio:threshold}),body={model:'synthetic',bridge_scope:'app',messages};
  const first=await pool.acquire(body,credential,new AbortController().signal);first.record.sessionId='native';first.record.contextUsageRatio=ratio;first.commit({},assistant);first.release();
  const next=await pool.acquire({...body,messages:[...messages.filter((_,i)=>i!==3),assistant,{role:'user',content:'NEW'}]},credential,new AbortController().signal);
  assert.notEqual(next.record.id,first.record.id);assert.equal(next.metrics.context_reset.first_changed_index,3);assert.deepEqual(next.metrics.context_reset.removed_roles,{tool:1});assert.equal(next.metrics.context_reset.prune_reuse_rejected,reason);assert.doesNotMatch(JSON.stringify(next.metrics.context_reset),/PRIVATE|Hash|sha256/);next.release();
});
test('non-tool removal and full compaction summaries open fresh lanes',async t=>{
  for(const index of [0,1,4]){const pool=await fixture(t),body={model:'synthetic',bridge_scope:'app',messages};const a=await pool.acquire(body,credential,new AbortController().signal);a.record.sessionId='native';a.record.contextUsageRatio=0.2;a.commit({},assistant);a.release();const b=await pool.acquire({...body,messages:[...messages.filter((_,i)=>i!==index),assistant,{role:'user',content:'NEW'}]},credential,new AbortController().signal);assert.notEqual(b.record.id,a.record.id);assert.equal(b.metrics.context_reset.removed_roles[messages[index].role],1);b.release();}
});
test('SDK transport derives occupancy from per-response native usage and the trusted catalog window',async t=>{
  const runtime=await mkdtemp(join(tmpdir(),'wb-prune-sdk-')),seen=[],transport=new SdkTransport({runtime,cliPath:process.execPath,toolMode:'json'},{get:async()=>credential},{run:async function*({prompt,options}){seen.push({prompt,options});yield {type:'system',subtype:'init',model:'synthetic',session_id:'native',mcp_servers:[]};yield {type:'assistant',message:{model:'synthetic',content:[{type:'text',text:'Synthetic answer'}],usage:{input_tokens:60000,output_tokens:20}}};yield {type:'result',subtype:'success',is_error:false};}});
  t.after(async()=>{await transport.close();await rm(runtime,{recursive:true,force:true});});const body={model:'synthetic',bridge_scope:'app',bridge_native_context_window:200000,messages,max_tokens:128};await (await transport.chat(body,new AbortController().signal)).text();
  const response=await transport.chat({...body,messages:[...messages.filter((_,i)=>i!==3),assistant,{role:'user',content:'NEW_SUFFIX'}]},new AbortController().signal);await response.text();
  assert.equal(seen[1].options.resume,'native');assert.equal(response.bridgeMetrics.pruned_history_reuse.context_usage_ratio,60020/200000);assert.doesNotMatch(seen[1].prompt,/PRIVATE_OLD/);assert.match(seen[1].prompt,/NEW_SUFFIX/);
});
test('a changed trusted native context window cannot reuse a pruned lane',async t=>{
  const pool=await fixture(t),body={model:'synthetic',bridge_scope:'app',bridge_native_context_window:200000,messages};
  const a=await pool.acquire(body,credential,new AbortController().signal);a.record.sessionId='native';a.record.contextUsageRatio=0.3;a.commit({},assistant);a.release();
  const b=await pool.acquire({...body,bridge_native_context_window:100000,messages:[...messages.filter((_,i)=>i!==3),assistant,{role:'user',content:'NEW'}]},credential,new AbortController().signal);assert.notEqual(b.record.id,a.record.id);assert.equal(b.reused,false);b.release();
});
