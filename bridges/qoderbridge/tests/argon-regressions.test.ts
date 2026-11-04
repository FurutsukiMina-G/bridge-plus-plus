import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatRequest} from '../src/compat.js';
import {routeConversation,evictionCandidate} from '../src/routing.js';
import {recoverDecision} from '../src/decision-recovery.js';
import {QoderPool} from '../src/pool.js';
const request=ChatRequest.parse({model:'fixture',bridge_scope:'app',messages:[{role:'user',content:'read project'}]});
test('equal scoped retries reach success/failure replay lanes without choosing busy or ambiguous branches',()=>{
  const root={messages:request.messages,bridgeScope:'app',busy:0};
  assert.equal(routeConversation(request,new Map([['root',root]]),new Map(),new Map()),'root');
  assert.equal(routeConversation(request,new Map([['root',{...root,busy:1}]]),new Map(),new Map()),undefined);
  assert.equal(routeConversation(request,new Map([['a',root],['b',{...root}]]),new Map(),new Map()),undefined);
  assert.equal(routeConversation(request,new Map([['failed',{...root,messages:[],replayMessages:request.messages}]]),new Map(),new Map()),'failed');
});
test('idle application roots survive repeated child admissions and capacity refuses to evict only roots',()=>{
  const a={bridgeScope:'a',messages:[1],touched:0,busy:0},b={bridgeScope:'b',messages:[2],touched:1,busy:0};
  const child={bridgeScope:'a',messages:[3],touched:100,busy:0};
  assert.equal(evictionCandidate([a,b,child],'a'),child);assert.equal(evictionCandidate([a,b],'a'),undefined);assert.equal(evictionCandidate([a,{...child,busy:1}],'a'),undefined);
});
test('a truncated final retains decoded text but cut tools, pinned calls and context overflow never become final decisions',async()=>{
  const run=(response:string,extra:object={},req=request)=>recoverDecision({request:req,prompt:'fixture',invoke:async()=>({response,error:null,stage:'inference',stream_stop_reasons:['max_tokens'],...extra})});
  const kept=await run('{"kind":"final","content":"partial\\n中文\\uD83D');assert.deepEqual(kept.decision,{kind:'final',content:'partial\n中文'});assert.equal(kept.turn.finish_reason,'length');assert.equal(kept.recovery.attempts,1);
  assert.equal((await run('{"kind":"tool_call","name":"write","arguments":{"content":"half')).decision,null);
  assert.equal((await run('{"kind":"final","content":"half',{}, {...request,tool_choice:'required'})).decision,null);
  assert.equal((await run('{"kind":"final","content":"half',{stream_stop_reasons:['model_context_window_exceeded']})).decision,null);
});
function injectedPool(outputs:string[],retries=1){
  let calls=0;const events:unknown[]=[];
  const record={id:'r',messages:[],touched:Date.now(),locked:Promise.resolve(),lastCredits:null,model:'fixture',busy:0,toolSignature:null,retryHint:null,policyCalls:[],closed:false,controller:new AbortController(),warm:{close(){}},
    queue:{close(){},push(){const text=outputs[calls++]??outputs.at(-1);events.push({type:'assistant',message:{model:'fixture',content:[{type:'text',text}]}},{type:'result',subtype:'success',is_error:false,usage:{},modelUsage:{}});}},q:{async next(){return {done:false,value:events.shift()};}}};
  const pool=new QoderPool({auth:'cli',timeout:30000,strategy:'permission',system:'fixture',decisionRetries:retries});
  Object.assign(pool,{nextWarm:Promise.resolve(record),primeNext:()=>Promise.resolve(record)});return {pool,record,calls:()=>calls};
}
test('scoped successful and exhausted first-request HTTP replays make zero extra model calls',async()=>{
  for(const outputs of [['{"kind":"final","content":"done"}'],['invalid']]){
    const f=injectedPool(outputs);try{const first=await f.pool.infer(request),used=f.calls(),second=await f.pool.infer(request);assert.equal(f.calls(),used);assert.equal(second.report.local_response_replay,true);assert.deepEqual(second.decision,first.decision);}finally{f.pool.closeAll();}
  }
});
test('cancellation keeps SDK context only after interrupt reaches a verified terminal boundary',async()=>{
  const f=injectedPool(['{"kind":"final","content":"continued"}']);let interrupt=false,resolveNext:(value:unknown)=>void=()=>{};
  const next=f.record.q.next.bind(f.record.q);Object.assign(f.record.q,{next:()=>interrupt?next():new Promise(resolve=>{resolveNext=resolve;}),interrupt:async()=>{interrupt=true;resolveNext({done:false,value:{type:'result',subtype:'success',is_error:false}});}});
  // First queue push represents an in-flight turn; drain must consume its own
  // terminal, without leaving it for the next prompt or billing another call.
  const push=f.record.queue.push.bind(f.record.queue);f.record.queue.push=()=>{};
  const controller=new AbortController(),running=f.pool.infer(request,{signal:controller.signal});await new Promise(r=>setTimeout(r,15));controller.abort();await running;
  assert.equal(f.record.closed,false);assert.deepEqual(f.record.messages,request.messages);
  f.record.queue.push=push;const continued=await f.pool.infer({...request,messages:[...request.messages,{role:'user',content:'continue'}]});assert.equal(continued.report.history_mode,'delta');assert.equal(f.calls(),1);f.pool.closeAll();
});
