import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatRequest} from '../src/compat.js';
import {QoderPool} from '../src/pool.js';
import {prunedConversationPrefix,prefixIssue} from '../src/routing.js';
import type {Config} from '../src/client.js';
const call=(id:string)=>({role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name:'read',arguments:'{}'}}]});
const messages=[{role:'system',content:'Synthetic system'},{role:'user',content:'Synthetic task'},call('a'),{role:'tool',tool_call_id:'a',content:'PRIVATE_OLD_A'},
  {role:'assistant',content:'Synthetic progress'},call('b'),{role:'tool',tool_call_id:'b',content:'PRIVATE_OLD_B'}];
const request=(scoped=true)=>ChatRequest.parse({model:'qoder-deepseek-flash',prompt_cache_key:'synthetic-client',...scoped?{bridge_scope:'synthetic-app'}:{},messages});
function fixture(ratio:number|null=0.3,config:Partial<Config>={}){
  const prompts:string[]=[],records:any[]=[];
  const pool=new QoderPool({auth:'cli',timeout:5000,system:'Synthetic system',strategy:'permission',context:200000,...config});
  const internals=pool as any;internals.primeNext=()=>Promise.resolve();internals.open=async()=>{
    const events:any[]=[];const record:any={id:'synthetic-'+records.length,messages:[],policyCalls:[],busy:0,touched:Date.now(),locked:Promise.resolve(),lastCredits:null,lastPromptTokens:null,model:'dfmodel',toolSignature:null,retryHint:null,controller:new AbortController(),closed:false,warm:{close(){record.closed=true;}},queue:{close(){},push(item:any){
      prompts.push(item.message.content);record.policyCalls.push({purpose:'primary',model:'dfmodel',context_window:200000,reasoning_effort:'low'});
      events.push({type:'assistant',uuid:'synthetic-'+prompts.length,message:{id:'response-'+prompts.length,content:[{type:'text',text:'{"kind":"final","content":"Synthetic complete answer"}'}]}},
        {type:'result',subtype:'success',is_error:false,usage:ratio===null?{}:{input_tokens:Math.floor(ratio*200000),output_tokens:5,context_usage_ratio:ratio}});
    }},q:{next:async()=>({done:false,value:events.shift()})}};records.push(record);return record;
  };
  return {pool,prompts,records};
}
for(const scoped of [false,true])test(`whole tool-result deletion reuses native context and sends only the new suffix, scoped=${scoped}`,async()=>{
  const {pool,prompts,records}=fixture();try{
    const first=request(scoped);await pool.infer(first);const next={...first,messages:[...first.messages.filter((_,i)=>i!==3),{role:'assistant' as const,content:'Synthetic complete answer'},{role:'user' as const,content:'NEW_SUFFIX'}]};
    const result=await pool.infer(next);assert.equal(records.length,1);assert.equal(result.report.reused_session,true);assert.equal(result.report.history_mode,'delta');assert.equal(result.report.sent_message_count,2);
    assert.equal(result.report.context_reset,null);assert.equal(result.report.pruned_history_reuse?.removed_message_count,1);assert.deepEqual(result.report.pruned_history_reuse?.removed_roles,{tool:1});
    assert.match(prompts[1]!,/NEW_SUFFIX/);assert.doesNotMatch(prompts[1]!,/PRIVATE_OLD|Synthetic task/);
    const again={...next,messages:[...next.messages.filter(m=>m.role!=='tool'),{role:'user' as const,content:'THIRD_SUFFIX'}]};await pool.infer(again);assert.equal(records.length,1);assert.match(prompts[2]!,/THIRD_SUFFIX/);assert.doesNotMatch(prompts[2]!,/PRIVATE_OLD|NEW_SUFFIX/);
  }finally{pool.closeAll();}
});
for(const [ratio,threshold,reason]of [[0.6,0.6,'context_usage_high'],[0.8,0.6,'context_usage_high'],[null,0.6,'context_usage_unknown'],[0.2,0,'disabled']] as const)test(`pruned history resets when native occupancy is unsafe: ${ratio}/${threshold}`,async()=>{
  const {pool,records}=fixture(ratio,{prunedHistoryReuseRatio:threshold});try{
    const first=request();await pool.infer(first);const result=await pool.infer({...first,messages:[...first.messages.filter((_,i)=>i!==3),{role:'user',content:'NEW_SUFFIX'}]});
    assert.equal(records.length,2);assert.equal(result.report.reused_session,false);assert.equal(result.report.history_mode,'full');assert.equal(result.report.context_reset?.first_changed_index,3);assert.equal(result.report.context_reset?.removed_message_count,1);assert.deepEqual(result.report.context_reset?.removed_roles,{tool:1});assert.equal(result.report.context_reset?.prune_reuse_rejected,reason);assert.doesNotMatch(JSON.stringify(result.report.context_reset),/PRIVATE|sha256/);
  }finally{pool.closeAll();}
});
test('assistant/user/system changes and summaries reset; changed or reordered old tool results cannot be appended as new data',async()=>{
  for(const index of [0,1,4]){const {pool,records}=fixture();try{const first=request();await pool.infer(first);const result=await pool.infer({...first,messages:[...first.messages.filter((_,i)=>i!==index),{role:'user',content:'NEW_SUFFIX'}]});assert.equal(records.length,2);assert.equal(result.report.context_reset?.first_changed_index,index);assert.equal(result.report.context_reset?.removed_roles[first.messages[index]!.role],1);}finally{pool.closeAll();}}
  const first=request();assert.equal(prunedConversationPrefix(first.messages,[...first.messages.filter((_,i)=>i!==3),{role:'tool',tool_call_id:'a',content:'CHANGED'}]),null);
  const reordered=[...first.messages];[reordered[3],reordered[6]]=[reordered[6]!,reordered[3]!];assert.equal(prunedConversationPrefix(first.messages,[...reordered,{role:'user',content:'NEW'}]),null);
  const summary=ChatRequest.parse({...first,messages:[{role:'system',content:'Synthetic system'},{role:'user',content:'Synthetic full summary'}]});const reset=prefixIssue(first.messages,summary.messages);assert.equal(reset?.reason,'history_shortened');assert.equal(reset?.removed_roles.tool,2);
  for(const value of [-1,1.1,NaN])assert.throws(()=>fixture(0.3,{prunedHistoryReuseRatio:value}));
});
test('history or occupancy changed while waiting for a native session lock falls back to a fresh full-history session',async()=>{
  const {pool,prompts,records}=fixture();try{
    const base=request(false);await pool.infer(base);
    const branchA=ChatRequest.parse({...base,messages:[...base.messages,{role:'assistant',content:'Branch A prior'},{role:'user',content:'BRANCH_A_ONLY'}]});
    const branchB=ChatRequest.parse({...base,messages:[...base.messages,{role:'assistant',content:'Branch B prior'},{role:'user',content:'BRANCH_B_FULL'}]});
    const [resA,resB]=await Promise.all([pool.infer(branchA),pool.infer(branchB)]);
    assert.equal(records.length,2);assert.equal(resA.record.id,'synthetic-0');assert.equal(resB.record.id,'synthetic-1');
    assert.equal(resA.report.reused_session,true);assert.equal(resA.report.history_mode,'delta');
    assert.equal(resB.report.reused_session,false);assert.equal(resB.report.history_mode,'full');assert.equal(resB.report.sent_message_count,branchB.messages.length);
    assert.equal(resB.report.context_reset?.reason,'history_changed_while_waiting');assert.equal(resB.report.context_reset?.first_changed_index,base.messages.length);
    assert.equal(resB.report.context_reset?.removed_message_count,2);assert.deepEqual(resB.report.context_reset?.removed_roles,{assistant:1,user:1});
    assert.doesNotMatch(JSON.stringify(resB.report.context_reset),/PRIVATE|BRANCH_|sha256/);
    assert.match(prompts[2]!,/Synthetic task/);assert.match(prompts[2]!,/BRANCH_B_FULL/);assert.doesNotMatch(prompts[2]!,/BRANCH_A_ONLY/);
    assert.equal(records[0].busy,0);assert.equal(records[1].busy,0);assert.equal(records[0].closed,true);
  }finally{pool.closeAll();}
  const high=fixture(0.3);try{
    const base=request(true);await high.pool.infer(base);
    const pruned=ChatRequest.parse({...base,messages:[...base.messages.filter((_,i)=>i!==3),{role:'user',content:'PRUNED_WAIT_FULL'}]});
    let release!:()=>void;high.records[0].locked=new Promise<void>(r=>{release=r;});
    const pending=high.pool.infer(pruned);high.records[0].contextUsageRatio=0.85;release();
    const res=await pending;assert.equal(high.records.length,2);assert.equal(res.report.reused_session,false);assert.equal(res.report.history_mode,'full');
    assert.equal(res.report.context_reset?.reason,'history_changed_while_waiting');assert.equal(res.report.context_reset?.prune_reuse_rejected,'context_usage_high');
    assert.match(high.prompts[1]!,/Synthetic task/);assert.match(high.prompts[1]!,/PRUNED_WAIT_FULL/);assert.equal(high.records[0].busy,0);assert.equal(high.records[1].busy,0);
  }finally{high.pool.closeAll();}
});
