import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,toolRequest,resultRequest,waitFor} from './hold-fake.mjs';
import {nativeEligible,matchResults} from '../src/hold-lane.mjs';
const calls=(...paths)=>paths.map((path,i)=>({id:'c'+i,name:'mcp__host__Read',input:{path}}));
async function begin(f,r=toolRequest(),hooks){const pending=f.infer(r,hooks);await waitFor(()=>f.sessions.some(s=>s.prompts.length));return {pending,s:f.sessions.find(s=>s.prompts.length)};}
test('multi-step suspended calls preserve arguments and result IDs, with local replay omitting usage',async t=>{
 const f=await fixture(t),r=toolRequest(),{pending,s}=await begin(f,r);
 const special='中文 " \\ $false '+ '长'.repeat(10000),h=await s.toolStep(calls(special,'b'),{early:true});
 const first=await pending;assert.equal(JSON.parse(first.reply.calls[0].arguments).path,special);
 let done=false;h[0].then(()=>done=true);await new Promise(r=>setImmediate(r));assert.equal(done,false);
 const next=resultRequest(r,first.reply,['A','B']);next.messages.splice(-2,2,...next.messages.slice(-2).reverse());
 const p2=f.infer(next);assert.deepEqual((await Promise.all(h)).map(x=>x.content[0].text),['A','B']);
 const h2=await s.toolStep([{id:'c-next',name:'mcp__host__Read',input:{path:'dependent'}}]);const second=await p2;
 const thirdRequest=resultRequest(next,second.reply,['C']),p3=f.infer(thirdRequest);assert.equal((await h2[0]).content[0].text,'C');
 s.final('done');const third=await p3;assert.equal(third.reply.content,'done');assert.equal(s.prompts.length,1);
 const replay=await f.infer(thirdRequest);assert.equal(replay.report.client_usage,null);assert.equal(replay.report.local_response_replay,true);assert.equal(replay.report.model_requests,0);
});
test('read-only annotations permit parallel entry and writes enter serially',async t=>{
 const tools=[{name:'Read',parameters:{type:'object'},annotations:{readOnlyHint:true}},{name:'Write',parameters:{type:'object'}}];
 const f=await fixture(t),r=toolRequest(tools),{pending,s}=await begin(f,r);
 assert.deepEqual(s.listed.map(t=>t.annotations.readOnlyHint),[true,false]);
 assert.equal((await s.options.canUseTool('mcp__host__Write',{})).behavior,'allow');assert.equal((await s.options.canUseTool('Bash',{})).behavior,'deny');
 const batch=[{id:'w1',name:'Write',input:{a:1}},{id:'w2',name:'Write',input:{a:2}}];
 const h=await s.toolStep(batch,{serial:true});const first=await pending;assert.equal(s.handlers.length,1);
 const p=f.infer(resultRequest(r,first.reply,['one','two']));assert.equal((await h[0]).content[0].text,'one');await waitFor(()=>s.handlers.length===2);assert.equal((await s.handlers[1]).content[0].text,'two');s.final('ok');await p;
});
test('missing result receives the Qoder error receipt',async t=>{
 const f=await fixture(t),r=toolRequest(),{pending,s}=await begin(f,r),h=await s.toolStep(calls('a','b')),first=await pending;
 const p=f.infer(resultRequest(r,first.reply,['A']));assert.equal((await h[1]).isError,true);assert.equal((await h[1]).content[0].text,'The host returned no result for this call.');s.final('done');await p;
});
test('oversized result and trailing message stop after changed-ID post hooks and follow with exact full text',async t=>{
 const f=await fixture(t,{nativeResultCharLimit:20}),r=toolRequest(),{pending,s}=await begin(f,r),batch=calls('a','b'),h=await s.toolStep(batch),first=await pending;
 const text='完整 " \\ '.repeat(30),next=resultRequest(r,first.reply,[text,'small'],[{role:'user',content:'continue please'}]),p=f.infer(next);
 assert.match((await h[0]).content[0].text,/complete output follows/);await h[1];assert.equal((await s.post(batch)).continue,false);s.result();
 await waitFor(()=>s.prompts.length===2);assert.ok(s.prompts[1].message.content.includes(text));assert.match(s.prompts[1].message.content,/continue please/);
 s.final('done');const second=await p;assert.equal(second.report.native.handoff_stop,true);assert.equal(second.report.native.oversized_results,1);
});
test('late follow-up is queued without a concurrent V2 send',async t=>{
 const f=await fixture(t,{nativeResultCharLimit:20}),r=toolRequest(),{pending,s}=await begin(f,r),h=await s.toolStep(calls('a')),first=await pending;
 const next=resultRequest(r,first.reply,['x'.repeat(60)]),p=f.infer(next);await h[0];
 const h2=await s.toolStep([{id:'later',name:'Read',input:{path:'b'}}]);const second=await p;assert.equal(second.reply.calls[0].id,'later');assert.equal(s.prompts.length,1);
 const p3=f.infer(resultRequest(next,second.reply,['ok']));await h2[0];s.result();await waitFor(()=>s.prompts.length===2);s.final('done');await p3;
});
test('invalid arguments correct locally and stop at the invalid round cap',async t=>{
 const f=await fixture(t,{nativeInvalidRounds:2}),{pending,s}=await begin(f);
 for(let i=0;i<2;i++){const h=await s.toolStep([{id:'bad'+i,name:'Read',input:{}}]);assert.equal((await h[0]).isError,true);}
 const failed=await pending;assert.equal(failed.reply,null);assert.equal(failed.report.stage,'native_invalid_calls');assert.equal(failed.report.native.invalid_calls,2);assert.equal(f.lane.stats().busy,0);
});
test('an invalid round can recover to a valid native call without another send',async t=>{
 const f=await fixture(t),r=toolRequest(),{pending,s}=await begin(f,r);await (await s.toolStep([{id:'bad',name:'Read',input:{}}]))[0];
 const h=await s.toolStep(calls('ok')),first=await pending;assert.equal(first.reply.kind,'tool_calls');assert.equal(s.prompts.length,1);
 const p=f.infer(resultRequest(r,first.reply,['ok']));await h[0];s.final('done');assert.equal((await p).reply.content,'done');
});
test('required text-only answer is held and corrected, then native calling succeeds',async t=>{
 const f=await fixture(t),r={...toolRequest(),tool_choice:'required'},shown=[],{pending,s}=await begin(f,r,{onText:x=>shown.push(x)});
 s.final('just words');await waitFor(()=>s.prompts.length===2);assert.deepEqual(shown,[]);const h=await s.toolStep(calls('a')),first=await pending;
 const p=f.infer({...resultRequest(r,first.reply,['ok']),tool_choice:'auto'});await h[0];s.final('done');await p;
});
test('pinned function rejects a different function through its handler',async t=>{
 const f=await fixture(t),r={...toolRequest([{name:'Read',parameters:{type:'object'}},{name:'Write',parameters:{type:'object'}}]),tool_choice:{type:'function',function:{name:'Read'}}},{pending,s}=await begin(f,r);
 const bad=await s.toolStep([{id:'bad',name:'Write',input:{}}]);assert.match((await bad[0]).content[0].text,/requires exactly the function Read/);
 await s.toolStep(calls('a'));assert.equal((await pending).reply.calls[0].name,'Read');
});
test('parallel_tool_calls false trims later calls without losing the first',async t=>{
 const f=await fixture(t),r={...toolRequest(),parallel_tool_calls:false},{pending,s}=await begin(f,r),h=await s.toolStep(calls('a','b')),first=await pending;
 assert.equal(first.reply.calls.length,1);assert.equal((await h[1]).isError,true);assert.equal(first.report.native.parallel_trimmed,1);
});
test('tool table changes rebuild and report tool names; history rewrites rebuild separately',async t=>{
 const f=await fixture(t),r=toolRequest(),{pending,s}=await begin(f,r);s.final('one');await pending;
 const changed={...r,tools:[...r.tools,{type:'function',function:{name:'Write',parameters:{type:'object'}}}]};const p=f.infer(changed);await waitFor(()=>f.sessions[1]?.prompts.length);f.sessions[1].final('two');const second=await p;
 assert.equal(s.closed,1);assert.equal(second.report.native.rebuild_reason,'tools_changed');assert.deepEqual(second.report.native.tools_changed,{added:['Write'],removed:[],changed:[]});
 const p3=f.infer({...changed,messages:[{role:'user',content:'compacted'}]});await waitFor(()=>f.sessions[2]?.prompts.length);f.sessions[2].final('three');assert.equal((await p3).report.native.rebuild_reason,'history_rewritten');
});
test('interrupt retains the slot identity and next request rebuilds after cancellation',async t=>{
 const f=await fixture(t),r=toolRequest(),c=new AbortController(),{pending,s}=await begin(f,r,{signal:c.signal});c.abort(new DOMException('stop','AbortError'));
 const cancelled=await pending;assert.equal(cancelled.reply,null);assert.equal(s.interrupts,1);assert.equal(f.lane.stats().sessions,1);assert.equal(f.lane.stats().busy,0);
 const p=f.infer(r);await waitFor(()=>f.sessions[1]?.prompts.length);f.sessions[1].final('restarted');assert.equal((await p).report.native.rebuild_reason,'retry_after_cancel');
});
test('handler abort signal resolves promptly without relying on a tool timeout',async t=>{
 const f=await fixture(t),r=toolRequest(),{pending,s}=await begin(f,r),h=await s.toolStep(calls('a'));await pending;s.controllers[0].abort();assert.equal((await h[0]).isError,true);
});
test('awaiting TTL frees capacity and reports expired on the next keyed request',async t=>{
 const f=await fixture(t,{maxSessions:1}),r=toolRequest(),{pending,s}=await begin(f,r);await s.toolStep(calls('a'));const first=await pending;
 await assert.rejects(f.infer({...r,prompt_cache_key:'other'}),e=>e.code==='sessions_busy'&&e.details.awaiting===1);
 first.record.touched=Date.now()-600001;f.lane.sweepIdle();assert.equal(s.closed,1);
 const p=f.infer(resultRequest(r,first.reply,['late']));await waitFor(()=>f.sessions[1]?.prompts.length);f.sessions[1].final('done');assert.equal((await p).report.native.rebuild_reason,'expired');
});
test('idle slots are evicted before live awaiting slots',async t=>{
 const f=await fixture(t,{maxSessions:2}),r=toolRequest(),{pending,s}=await begin(f,r);await s.toolStep(calls('a'));await pending;
 const b={...r,prompt_cache_key:'idle'},p=f.infer(b);await waitFor(()=>f.sessions[1]?.prompts.length);f.sessions[1].final('idle');await p;
 const c=f.infer({...r,prompt_cache_key:'new'});await waitFor(()=>f.sessions[2]?.prompts.length);assert.equal(s.closed,0);assert.equal(f.sessions[1].closed,1);f.sessions[2].final('new');await c;
});
test('idle timeout interrupts and releases busy status',async t=>{
 const f=await fixture(t,{idleTimeoutMs:30}),{pending,s}=await begin(f);const failed=await pending;assert.equal(failed.report.stage,'upstream_stalled');assert.equal(s.interrupts,1);assert.equal(f.lane.stats().busy,0);
});
test('warm session matches model, options and tools; ready hits and mismatch reasons are reported',async t=>{
 const f=await fixture(t,{prewarmMs:5000,nativeWarmLimit:1}),r=toolRequest(),{pending,s}=await begin(f,r);s.final('one');assert.equal((await pending).report.native.warm_miss_reason,'no_warm_entry');
 await waitFor(()=>f.lane.stats().warm_ready===1);const warm=f.sessions[1],p=f.infer({...r,prompt_cache_key:'warm-hit'});await waitFor(()=>warm.prompts.length);warm.final('two');assert.equal((await p).report.native.warm_start,true);
 await waitFor(()=>f.lane.stats().warm_ready===1);const miss=f.infer({...r,max_tokens:500,prompt_cache_key:'warm-miss'});await waitFor(()=>f.sessions.some(x=>x.options.env.CODEBUDDY_CODE_MAX_OUTPUT_TOKENS==='500'&&x.prompts.length));
 f.sessions.find(x=>x.options.env.CODEBUDDY_CODE_MAX_OUTPUT_TOKENS==='500'&&x.prompts.length).final('three');assert.equal((await miss).report.native.warm_miss_reason,'output_limit_mismatch');
});
test('warm not-ready claim is not counted as a hit',async t=>{
 let release;const gate=new Promise(r=>release=r);const f=await fixture(t,{prewarmMs:5000},(s,i)=>{if(i===1)s.connectGate=gate;});
 const r=toolRequest(),{pending,s}=await begin(f,r);s.final('one');await pending;await waitFor(()=>f.sessions.length===2);
 const p=f.infer({...r,prompt_cache_key:'pending'});await waitFor(()=>f.lane.stats().warm_pending===0);release();await waitFor(()=>f.sessions[1].prompts.length);f.sessions[1].final('two');const done=await p;
 assert.equal(done.report.native.warm_start,false);assert.equal(done.report.native.warm_miss_reason,'not_ready');
});
test('usage uses latest prompt and cache subsets with summed outputs across correction responses',async t=>{
 const f=await fixture(t),r={...toolRequest(),tool_choice:'required'},{pending,s}=await begin(f,r);
 s.final('no call',{usage:{input_tokens:150,output_tokens:9,cache_read_input_tokens:100,cache_creation_input_tokens:50}});await waitFor(()=>s.prompts.length===2);
 await s.toolStep(calls('a'),{usage:{input_tokens:250,output_tokens:11,cache_read_input_tokens:170,cache_creation_input_tokens:80}});const result=await pending;
 assert.equal(result.report.client_usage.prompt_tokens,250);assert.equal(result.report.client_usage.completion_tokens,20);assert.equal(result.report.client_usage.prompt_tokens_details.cached_tokens,170);assert.equal(result.report.client_usage.cache_creation_input_tokens,80);assert.equal(result.report.requests.length,2);assert.equal(result.report.prompt_tokens_all_responses,400);
});
test('eligibility routes structured and tool-less requests to the retained paths',()=>{
 const r=toolRequest();assert.equal(nativeEligible(r,{toolMode:'native'}),true);for(const override of [{tools:[]},{tool_choice:'none'},{response_format:{type:'json_object'}}])assert.equal(nativeEligible({...r,...override},{toolMode:'native'}),false);
 assert.equal(matchResults({hostCalls:['a']},[{role:'tool',tool_call_id:'unknown',content:'x'}]),null);
});

test('superseded output options rebuild while preserving unrelated keyless conversations in a shared scope',async t=>{
 const f=await fixture(t),a={...toolRequest(),bridge_scope:'shared',prompt_cache_key:undefined},b={...a,messages:[{role:'user',content:'unrelated'}]};
 const {pending,s}=await begin(f,a);await s.toolStep(calls('a'));const first=await pending;
 const pb=f.infer(b);await waitFor(()=>f.sessions[1]?.prompts.length);f.sessions[1].final('B');await pb;assert.equal(s.closed,0);
 const p=f.infer({...resultRequest(a,first.reply,['ok']),reasoning_effort:'high'});await waitFor(()=>f.sessions[2]?.prompts.length);f.sessions[2].final('A');assert.equal((await p).report.native.rebuild_reason,'superseded');
});
test('busy duplicate requests single-flight and cancelling a waiter leaves the owner intact',async t=>{
 const f=await fixture(t),r=toolRequest(),{pending,s}=await begin(f,r),c=new AbortController();const waiter=f.infer(r,{signal:c.signal});c.abort(new DOMException('waiter stopped','AbortError'));await assert.rejects(waiter);
 s.final('owner');await pending;assert.equal(f.sessions.length,1);assert.equal((await f.infer(r)).report.local_response_replay,true);assert.equal(f.lane.stats().busy,0);
});
test('cold startup cancellation closes the connecting process without sending any prompt',async t=>{
 const gate=new Promise(()=>{}),f=await fixture(t,{},s=>s.connectGate=gate),c=new AbortController(),p=f.infer(toolRequest(),{signal:c.signal});await waitFor(()=>f.sessions.length===1);c.abort(new DOMException('stop','AbortError'));
 await assert.rejects(p);assert.equal(f.sessions[0].closed,1);assert.equal(f.sessions[0].prompts.length,0);assert.equal(f.lane.stats().sessions,0);
});
test('warm table and model-option mismatches report separate reasons',async t=>{
 const f=await fixture(t,{prewarmMs:5000}),r=toolRequest(),{pending,s}=await begin(f,r);s.final('one');await pending;await waitFor(()=>f.lane.stats().warm_ready===1);
 const p=f.infer({...r,reasoning_effort:'high',prompt_cache_key:'options'});await waitFor(()=>f.sessions.some(x=>x.options.effort==='high'&&x.prompts.length));f.sessions.find(x=>x.options.effort==='high'&&x.prompts.length).final('two');assert.equal((await p).report.native.warm_miss_reason,'runtime_options_mismatch');
 await waitFor(()=>f.lane.stats().warm_ready===1);const changed={...r,prompt_cache_key:'table',tools:[...r.tools,{type:'function',function:{name:'Extra',parameters:{type:'object'}}}]},p2=f.infer(changed);
 await waitFor(()=>f.sessions.some(x=>x.listed?.length===2&&x.prompts.length));f.sessions.find(x=>x.listed?.length===2&&x.prompts.length).final('three');assert.equal((await p2).report.native.warm_miss_reason,'tool_table_mismatch');
});
test('expired and failed warm entries are reported before a safe cold start',async t=>{
 const f=await fixture(t,{prewarmMs:30}),r=toolRequest(),{pending,s}=await begin(f,r);s.final('one');await pending;await waitFor(()=>f.lane.stats().warm_ready===0&&f.sessions.length===2);
 const p=f.infer({...r,prompt_cache_key:'expired-warm'});await waitFor(()=>f.sessions[2]?.prompts.length);f.sessions[2].final('two');assert.equal((await p).report.native.warm_miss_reason,'expired');
 const g=await fixture(t,{prewarmMs:5000},(s,i)=>{if(i===1)s.connectGate=Promise.reject(new Error('synthetic warm startup failure'));});
 const start=await begin(g,r);g.lane.config.nativeWarmLimit=0;start.s.final('one');await start.pending;await waitFor(()=>g.lane.warmFailure!==null);
 const p2=g.infer({...r,prompt_cache_key:'failed-warm'});await waitFor(()=>g.sessions[2]?.prompts.length);g.sessions[2].final('cold');assert.equal((await p2).report.native.warm_miss_reason,'warm_start_failed');
});

test('cold startup reservations count against fallback context capacity',async t=>{
 const c=new AbortController(),f=await fixture(t,{maxSessions:1},s=>s.connectGate=new Promise(()=>{})),r=toolRequest(),pending=f.infer(r,{signal:c.signal});await waitFor(()=>f.sessions.length===1);
 await assert.rejects(f.transport.pool.acquire({...r,tools:[],prompt_cache_key:'fallback'}, {uid:'synthetic',domain:'test.invalid'},new AbortController().signal),e=>e.code==='sessions_busy'&&e.details.busy===1);
 c.abort(new DOMException('stop','AbortError'));await assert.rejects(pending);assert.equal(f.transport.pendingSlots,0);assert.equal(f.transport.pool.stats().locks,0);
});
test('a changed per-request tool contract cannot replay an earlier final answer',async t=>{
 const f=await fixture(t),r=toolRequest(),{pending,s}=await begin(f,r);s.final('done');await pending;
 const next=f.infer({...r,tool_choice:'required'});await waitFor(()=>s.prompts.length===2);await s.toolStep(calls('required'));const result=await next;assert.equal(result.reply.kind,'tool_calls');assert.equal(result.report.local_response_replay,false);
});

test('selected runtime prompts and progress guard survive the hold transport',async t=>{
 const guardDecision=decision=>{if(decision.content==='I will inspect next')throw Object.assign(new Error('progress'),{code:'unfinished_turn'});};
 const f=await fixture(t,{hostPrompts:{native:'HOST-SPECIFIC CONTRACT'},guardDecision,canStreamFinal:text=>!text.startsWith('I will')}),r=toolRequest(),shown=[],{pending,s}=await begin(f,r,{onText:text=>shown.push(text)});
 assert.match(s.options.systemPrompt,/HOST-SPECIFIC CONTRACT/);s.final('I will inspect next');await waitFor(()=>s.prompts.length===2);assert.deepEqual(shown,[]);
 s.final('Inspection complete');assert.equal((await pending).reply.content,'Inspection complete');assert.deepEqual(shown,['Inspection complete']);
});
