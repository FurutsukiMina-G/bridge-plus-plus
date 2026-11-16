import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeSession,fixture,toolRequest,resultRequest,waitFor} from './hold-fake.mjs';
import {fullPrompt} from '../src/hold-prompt.mjs';

const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const call=(id,path=id)=>({id,name:'mcp__host__Read',input:{path}});
// The production hold-runtime owns serialization. Fail if it sends concurrently;
// like WorkBuddy, this fake records PostToolUse stop requests but keeps running.
class NonStoppingSession extends FakeSession {
  async send(prompt){assert.equal(this.active,false,'send waits for the preceding result');this.active=true;await super.send(prompt);this.onPrompt?.(prompt.message.content);}
  async *stream(){try{yield* super.stream();}finally{this.active=false;}}
  async post(calls){const result=await super.post(calls);if(result.continue===false)this.ignoredStops=(this.ignoredStops??0)+1;return result;}
}
async function begin(t,cfg={}){
  const f=await fixture(t,cfg,s=>{s.active=false;},NonStoppingSession),request=toolRequest(),pending=f.infer(request);
  await waitFor(()=>f.sessions[0]?.prompts.length===1);
  return {f,request,pending,s:f.sessions[0]};
}
async function nextUser(f,s,request,completed,text='new user instruction'){
  s.onPrompt=prompt=>s.final(`answer to: ${prompt}`);
  const next={...request,messages:[...request.messages,{role:'assistant',content:completed.reply.content},{role:'user',content:text}]};
  const result=await f.infer(next);
  assert.equal(result.report.native.window,'continue');
  assert.equal(result.reply.content,`answer to: ${text}`);
  assert.equal(s.prompts.at(-1).message.content,text,'the complete preceding reply is removed from delta replay');
  assert.equal(result.record.queuedTurns,0);
  assert.equal(result.record.inbox.items.length,0);
  return result;
}

test('A: trailing interruption folds into the last host call in call order without a background turn',async t=>{
  const {f,request,pending,s}=await begin(t),batch=[call('one'),call('two')],handlers=await s.toolStep(batch),first=await pending;
  const results=resultRequest(request,first.reply,['first result','second result'],[{role:'user',content:'angles must be 60,90,120'}]);
  results.messages.splice(-3,2,...results.messages.slice(-3,-1).reverse());
  const shown=[],p=f.infer(results,{onText:text=>shown.push(text)});
  assert.equal((await handlers[0]).content[0].text,'first result');
  assert.equal((await handlers[1]).content[0].text,'second result\n\n[The host added these messages after the function results]\nangles must be 60,90,120');
  assert.deepEqual(await s.post(batch),{});
  const secondHandlers=await s.toolStep([call('three')]),second=await p;
  assert.equal(second.report.native.trailing_messages,1);assert.equal(second.report.native.trailing_folded,1);
  assert.equal(second.report.native.handoff_stop,false);
  const finalRequest=resultRequest(results,second.reply,['third result']),finalPending=f.infer(finalRequest);
  await secondHandlers[0];s.final('all corrected');const final=await finalPending;
  assert.equal(final.reply.content,'all corrected');assert.equal(final.record.queuedTurns,0);
  assert.equal(s.prompts.length,1);assert.equal(final.record.inbox.items.length,0);
  await nextUser(f,s,finalRequest,final);assert.equal(s.prompts.length,2);
  assert.equal(f.lane.stats().late_followups,0);
});

for(const shape of ['image_url','image'])test(`A/B screenshot: ${shape} is delivered with the empty tool result, never as a user turn`,async t=>{
  const {f,request,pending,s}=await begin(t),batch=[call('read')],handlers=await s.toolStep(batch),first=await pending;
  const image=shape==='image_url'?{type:'image_url',image_url:{url:`data:image/png;base64,${png}`}}:{type:'image',source:{type:'base64',media_type:'image/png',data:png}};
  const results=resultRequest(request,first.reply,[''],[{role:'user',content:[image]}]),p=f.infer(results);
  assert.deepEqual((await handlers[0]).content.filter(x=>x.type==='image'),[{type:'image',mimeType:'image/png',data:png}]);
  assert.equal((await handlers[0]).content[0].text,'','a picture split off its own tool result is not announced as a host message');
  assert.deepEqual(await s.post(batch),{});s.final('image processed');const done=await p;
  assert.equal(done.report.native.tool_images,1);assert.equal(done.report.native.tool_images_dropped,0);
  assert.equal(done.report.native.trailing_folded,1);assert.equal(done.record.queuedTurns,0);assert.equal(s.prompts.length,1);
  await nextUser(f,s,results,done);assert.equal(s.prompts.length,2);
  assert.ok(s.prompts.every(p=>!JSON.stringify(p).includes(png)));
});

test('A: folded images share the existing per-call count and byte limits and preserve JSON message formatting',async t=>{
  const {f,request,pending,s}=await begin(t),handlers=await s.toolStep([call('read')]),first=await pending;
  const image={type:'image_url',image_url:{url:`data:image/png;base64,${png}`}};
  const huge={type:'image',source:{type:'base64',media_type:'image/png',data:'AAAA'.repeat(1747627)}};
  const results=resultRequest(request,first.reply,[Array(8).fill(image)],[{role:'user',content:[image,huge,{type:'image_url',image_url:{url:'https://test.invalid/p.png'}}]},{role:'developer',content:'keep the interruption'}]);
  const p=f.infer(results),result=await handlers[0];
  assert.equal(result.content.filter(p=>p.type==='image').length,8);
  assert.match(result.content[0].text,/more than 8 images/);assert.match(result.content[0].text,/over 5 MiB/);
  assert.match(result.content[0].text,/does not download images/);assert.match(result.content[0].text,/"role":"developer","content":"keep the interruption"/);
  s.final('done');const done=await p;
  assert.equal(done.report.native.tool_images,8);assert.equal(done.report.native.tool_images_dropped,2);
  assert.equal(done.report.native.trailing_folded,2);assert.equal(done.report.native.oversized_results,0);
});

test('B: ignored oversized stop drains the queued follow-up, joins all streamed text and leaves the next user current',async t=>{
  const {f,request,pending,s}=await begin(t,{nativeResultCharLimit:20}),batch=[call('read')],handlers=await s.toolStep(batch),first=await pending;
  const results=resultRequest(request,first.reply,['large output '.repeat(10)],[{role:'user',content:'fold this into the receipt'}]),p=f.infer(results);
  const receipt=await handlers[0];assert.match(receipt.content[0].text,/complete output follows/);assert.match(receipt.content[0].text,/fold this into the receipt/);
  assert.equal((await s.post(batch)).continue,false);assert.equal(s.ignoredStops,1);
  const nextHandlers=await s.toolStep([call('next')]),second=await p;
  assert.equal(second.report.native.oversized_results,1);assert.equal(second.report.native.trailing_folded,1);
  assert.equal(s.prompts.length,1);assert.equal(second.record.queuedTurns,2);
  const nextResults=resultRequest(results,second.reply,['ok']),shown=[];
  let returned=false;const donePending=f.infer(nextResults,{onText:text=>shown.push(text)}).then(value=>{returned=true;return value;});
  await nextHandlers[0];s.final('first runtime turn');
  await waitFor(()=>s.prompts.length===2);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(returned,false,'the first runtime result must not end this host window');
  assert.match(s.prompts[1].message.content,/large output/);assert.doesNotMatch(s.prompts[1].message.content,/fold this/);
  s.final('follow-up runtime turn');const done=await donePending;
  assert.equal(done.reply.content,'first runtime turn\n\nfollow-up runtime turn');
  assert.equal(done.reply.content,shown.join(''));assert.equal(done.record.lastFinalText,shown.join(''));
  assert.equal(done.record.queuedTurns,0);assert.equal(done.record.inbox.items.length,0);
  assert.equal(f.lane.stats().queued_turn_continuations,1);
  await nextUser(f,s,nextResults,done);assert.equal(s.prompts.length,3);
});

test('B: a follow-up tool reply contains all text already streamed in its window',async t=>{
  const {f,request,pending,s}=await begin(t,{nativeResultCharLimit:5}),handlers=await s.toolStep([call('a')]),first=await pending;
  const results=resultRequest(request,first.reply,['too long']),p=f.infer(results);await handlers[0];
  const h2=await s.toolStep([call('b')]),second=await p;
  const shown=[],p3=f.infer(resultRequest(results,second.reply,['ok']),{onText:text=>shown.push(text)});
  await h2[0];s.final('first turn');await waitFor(()=>s.prompts.length===2);
  await s.toolStep([call('c')]);const third=await p3;
  assert.equal(third.reply.kind,'tool_calls');assert.equal(third.reply.content,'first turn');
  assert.equal(third.reply.content,shown.join(''));assert.equal(third.record.lastFinalText,shown.join(''));
});

for(const [before,after] of [['','following answer'],['preceding answer','']])test(`B: empty turn text adds no separator (${before?'empty follow-up':'empty preceding turn'})`,async t=>{
  const {f,request,pending,s}=await begin(t,{nativeResultCharLimit:5}),handlers=await s.toolStep([call('a')]),first=await pending;
  const results=resultRequest(request,first.reply,['too long']),p=f.infer(results);await handlers[0];
  const h2=await s.toolStep([call('b')]),second=await p,shown=[];
  const p3=f.infer(resultRequest(results,second.reply,['ok']),{onText:text=>shown.push(text)});
  await h2[0];s.final(before);await waitFor(()=>s.prompts.length===2);s.final(after);
  const done=await p3;
  assert.equal(done.reply.content,before+after);assert.equal(shown.join(''),before+after);
  assert.equal(done.record.lastFinalText,before+after);assert.equal(done.record.queuedTurns,0);
});

for(const stale of ['inbox','queuedTurns'])test(`C: an idle session with stale ${stale} is closed and fully replayed`,async t=>{
  const {f,request,pending,s}=await begin(t);s.final('old answer');const first=await pending;
  if(stale==='inbox')first.record.inbox.push({type:'assistant',message:{content:[{type:'text',text:'STALE OUTPUT'}]}});
  else first.record.queuedTurns=1;
  const next={...request,messages:[...request.messages,{role:'assistant',content:'old answer'},{role:'user',content:'latest instruction'}]},p=f.infer(next);
  await waitFor(()=>f.sessions[1]?.prompts.length===1);assert.equal(s.closed,1);
  assert.match(f.sessions[1].prompts[0].message.content,/Conversation so far/);assert.match(f.sessions[1].prompts[0].message.content,/latest instruction/);
  f.sessions[1].final('latest answer');const done=await p;
  assert.equal(done.report.native.window,'new');assert.equal(done.report.native.rebuild_reason,'stale_runtime_output');
  assert.equal(done.reply.content,'latest answer');assert.equal(f.lane.stats().stale_rebuilds,1);
});

test('B: by default a 50,000-character result goes inline and the runtime MCP ceiling covers it (no receipt, no follow-up)',async t=>{
  const {f,request,pending,s}=await begin(t),batch=[call('big')],handlers=await s.toolStep(batch),first=await pending;
  assert.equal(s.options.env.MAX_MCP_OUTPUT_TOKENS,'1000000');assert.ok(4*Number(s.options.env.MAX_MCP_OUTPUT_TOKENS)>=f.lane.limit('nativeResultCharLimit'));
  const big='x'.repeat(50000)+' PAPAYA',results=resultRequest(request,first.reply,[big]),p=f.infer(results);
  assert.equal((await handlers[0]).content[0].text,big);
  assert.deepEqual(await s.post(batch),{});s.final('the word is PAPAYA');const done=await p;
  assert.equal(done.report.native.oversized_results,0);assert.equal(done.reply.content,'the word is PAPAYA');
  assert.equal(s.prompts.length,1);assert.equal(done.record.queuedTurns,0);
});

test('E: full replay explains native names while preserving the existing alias table',()=>{
  const request=toolRequest([{name:'Read',parameters:{type:'object'}},{name:'functions.shell',parameters:{type:'object'}}]);
  request.messages.push({role:'assistant',content:'earlier answer'},{role:'user',content:'continue'});
  const prompt=fullPrompt(request);
  assert.match(prompt,/host function X is called mcp__host__X/);
  assert.match(prompt,/"host_name":"functions.shell","native_name":"mcp__host__/);
  assert.match(prompt,/Conversation so far/);
});
