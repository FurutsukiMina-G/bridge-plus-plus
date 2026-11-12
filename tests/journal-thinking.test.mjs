import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {isThinkingTicker} from '../app/services/session-events.mjs';
import {dshEvent} from '../app/runtimes/dsh.mjs';
import {codexEvent} from '../app/runtimes/codex.mjs';
import {kimiAcpEvent} from '../app/runtimes/kimi-acp.mjs';
import {antigravityEvent} from '../app/runtimes/antigravity.mjs';

async function fixture(t,options){await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/journal-thinking-')),store=await new Store(root,options).open();await store.mutate(s=>{s.sessions=[{id:'synthetic-session',status:'running'}];});t.after(async()=>{await store.close();await rm(root,{recursive:true,force:true});});return {root,store,file:join(root,'sessions/synthetic-session.jsonl'),event:e=>store.event('synthetic-session',e),rows:async()=>{await store.flush();return (await readFile(join(root,'sessions/synthetic-session.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));}};}

// Each runtime projects its own native payload into {type:'native-event',name,data};
// these are the per-token thinking counters in the shape every adapter produces.
let sequence=0;
const claudeTick=(delta,cumulative,burst='user-message-1')=>({type:'native-event',name:'thinking_tokens',data:{type:'system',subtype:'thinking_tokens',estimated_tokens:cumulative,estimated_tokens_delta:delta,session_id:'native-session',user_message_uuid:burst,uuid:'tick-'+(++sequence)}});
const runtimeTickers=[
  ['Claude Code stream-json',claudeTick(5,5)],
  ['DSH session event',dshEvent({seq:11,type:'assistant/thinkingTokens',data:{estimated_tokens:6,estimated_tokens_delta:1}})],
  ['Codex app-server notification',codexEvent({method:'item/thinkingTokenCount',params:{thinking_tokens:7,itemId:'rs-1'}})],
  ['Kimi ACP session update',kimiAcpEvent({sessionUpdate:'thinking_tokens',tokens:8})],
  ['Antigravity stream message',antigravityEvent({type:'thinking_tokens',tokens:9})],
];
const ordinaryEvents=[
  ['DSH thinking text',dshEvent({seq:12,type:'assistant/thinking',data:{text:'synthetic reasoning'}})],
  ['DSH assistant stream chunk',dshEvent({seq:13,type:'assistant/stream',data:{chunk:{type:'usage',usage:{prompt_tokens:1}}}})],
  ['Codex item lifecycle',codexEvent({method:'item/started',params:{item:{type:'agentMessage',id:'i-1'}}})],
  ['Kimi thought chunk',kimiAcpEvent({sessionUpdate:'agent_thought_chunk',content:{type:'text',text:'synthetic'}})],
  ['gateway request marker',{type:'native-event',source:'gateway',name:'gateway/request-completed'}],
  ['gateway tool marker',{type:'native-event',source:'gateway',name:'gateway/tool-call',data:{name:'Read'}}],
  ['usage record',{type:'usage',source:'gateway',data:{model:'synthetic',prompt_tokens:10,thinking_tokens:3}}],
];

test('every runtime keeps its per-token thinking counter out of the journal and the live feed',async t=>{
  const f=await fixture(t),live=[];f.store.on('event',e=>live.push(e));
  for(const [label,event]of runtimeTickers){
    assert.equal(isThinkingTicker(event),true,label);
    await f.event({type:'thinking',text:'a',attemptId:'attempt-1',turnId:'turn-1'});
    assert.equal(await f.event(event),null,label+' is not persisted');
    await f.event({type:'thinking',text:'b',attemptId:'attempt-1',turnId:'turn-1'});
  }
  const rows=await f.rows();
  // Dropped before the stream buffer, so the chunks around a tick still merge into one row.
  assert.deepEqual(rows.map(row=>row.type),['thinking']);assert.equal(rows[0].text,'ab'.repeat(runtimeTickers.length));
  assert.deepEqual(live.map(e=>e.type),['thinking','thinking','thinking','thinking','thinking','thinking','thinking','thinking','thinking','thinking']);
});
test('counters that are not thinking ticks are still journalled unchanged',async t=>{
  const f=await fixture(t);
  for(const [label,event]of ordinaryEvents){assert.equal(isThinkingTicker(event),false,label);await f.event(event);}
  const rows=await f.rows();
  // The Kimi thought chunk is ordinary streaming text, so it lands as one thinking row.
  assert.deepEqual(rows.map(row=>row.type==='native-event'?'native:'+row.name:row.type),['native:assistant/thinking','native:assistant/stream','native:item/started','thinking','native:gateway/request-completed','native:gateway/tool-call','usage']);
  assert.deepEqual(rows.at(-1).data,{model:'synthetic',prompt_tokens:10,thinking_tokens:3},'a native usage record keeps its own fields');
});
test('five thousand ticks write no rows and leave one estimate on the turn usage record',async t=>{
  const f=await fixture(t);let cumulative=0;
  for(let index=0;index<5000;index++){cumulative+=7;await f.event(claudeTick(7,cumulative));}
  await f.event({type:'usage',source:'gateway',data:{model:'synthetic',prompt_tokens:10,auxiliary:false,tools_count:2}});
  await f.event({type:'turn-end',status:'completed'});
  const rows=await f.rows();
  assert.deepEqual(rows.map(row=>row.type),['usage','turn-end']);
  assert.equal(rows[0].data.thinking_token_estimate,35000);
  assert.ok((await readFile(f.file)).length<1200,'journal stays tiny: '+(await readFile(f.file)).length);
});
test('separate thinking bursts add up for the turn and the next turn starts from zero',async t=>{
  const f=await fixture(t);
  await f.event(claudeTick(3,3,'message-a'));await f.event(claudeTick(4,7,'message-a'));await f.event(claudeTick(5,5,'message-b'));
  await f.event({type:'usage',source:'gateway',data:{model:'synthetic',prompt_tokens:10}});
  await f.event({type:'turn-end',status:'completed'});
  await f.event({type:'usage',source:'gateway',data:{model:'synthetic',prompt_tokens:11}});
  const rows=await f.rows();
  assert.deepEqual(rows.map(row=>row.type),['usage','turn-end','usage']);
  assert.equal(rows[0].data.thinking_token_estimate,12,'the turn total covers both messages');
  assert.equal('thinking_token_estimate' in rows[2].data,false,'a turn without ticks claims no estimate');
});
test('a turn that ends without a usage record does not leak its estimate into the next turn',async t=>{
  const f=await fixture(t);
  await f.event(claudeTick(9,9));await f.event({type:'turn-end',status:'interrupted'});
  await f.event({type:'usage',source:'gateway',data:{model:'synthetic',prompt_tokens:10}});
  const rows=await f.rows();assert.equal(rows.length,2);assert.equal('thinking_token_estimate' in rows[1].data,false);
});
test('an estimate the runtime already reported is kept, and an unknown session still fails',async t=>{
  const f=await fixture(t);
  await f.event(claudeTick(4,4));
  await f.event({type:'usage',source:'native',data:{model:'synthetic',thinking_token_estimate:3}});
  const rows=await f.rows();assert.equal(rows[0].data.thinking_token_estimate,3);
  await assert.rejects(()=>f.store.event('missing-session',claudeTick(1,1)),/Session not found/);
  assert.equal(f.store.thinkingTotals.has('missing-session'),false);
});
