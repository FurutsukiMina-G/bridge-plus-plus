import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatRequest } from '../src/compat.js';
import { routeConversation } from '../src/routing.js';

test('one app scope routes independent main and subagent histories without overwriting them',()=>{
  const main=ChatRequest.parse({model:'x',messages:[{role:'system',content:'main'},{role:'user',content:'same task'}]}),sub=ChatRequest.parse({model:'x',messages:[{role:'system',content:'subagent'},{role:'user',content:'same task'}]});
  const sessions=new Map([['a',{messages:main.messages,bridgeScope:'app-a',clientKey:'client'}],['b',{messages:sub.messages,bridgeScope:'app-a',clientKey:'client'}]]);
  assert.equal(routeConversation({...main,bridge_scope:'app-a',prompt_cache_key:'client',messages:[...main.messages,{role:'user',content:'continue main'}]},sessions,new Map(),new Map()),'a');
  assert.equal(routeConversation({...sub,bridge_scope:'app-a',prompt_cache_key:'client',messages:[...sub.messages,{role:'user',content:'continue sub'}]},sessions,new Map(),new Map()),'b');
  assert.equal(routeConversation({...main,bridge_scope:'app-b',prompt_cache_key:'client'},sessions,new Map(),new Map()),undefined);
  assert.equal(routeConversation({...main,messages:[...main.messages,{role:'tool',tool_call_id:'shared',content:'result'}]},sessions,new Map(),new Map([['shared','a']])),undefined);
});

test('app keys resume pure-text turns and isolate identical opening messages',()=>{
  const messages=ChatRequest.parse({model:'x',messages:[{role:'user',content:'Same initial question'}]}).messages;
  const sessions=new Map([['sdk-a',{messages}],['sdk-b',{messages}]]),clients=new Map([['app-a','sdk-a'],['app-b','sdk-b']]);
  const next=ChatRequest.parse({model:'x',messages:[...messages,{role:'assistant',content:'Answer'},{role:'user',content:'Next question'}]});
  assert.equal(routeConversation({...next,prompt_cache_key:'app-a'},sessions,clients,new Map()),'sdk-a');
  assert.equal(routeConversation({...next,prompt_cache_key:'app-b'},sessions,clients,new Map()),'sdk-b');
  assert.equal(routeConversation(next,sessions,clients,new Map()),undefined);
});

test('explicit Harness keys prevent two sessions with identical tool IDs from sharing Qoder history', () => {
  const base = [{ role: 'user', content: 'read sentinel' }];
  const sessions = new Map([['qoder-a', { messages: ChatRequest.parse({ model: 'x', messages: base }).messages }]]);
  const byClient = new Map([['harness-a', 'qoder-a']]);
  const byTool = new Map([['call_shared', 'qoder-a']]);
  const next = [{ role: 'assistant', content: null, tool_calls: [{ id: 'call_shared', type: 'function', function: { name: 'read', arguments: '{}' } }] },
    { role: 'tool', tool_call_id: 'call_shared', content: 'result' }];
  const requestA = ChatRequest.parse({ model: 'x', prompt_cache_key: 'harness-a', messages: [...base, ...next] });
  const requestB = ChatRequest.parse({ model: 'x', prompt_cache_key: 'harness-b', messages: [...base, ...next] });
  assert.equal(routeConversation(requestA, sessions, byClient, byTool), 'qoder-a');
  assert.equal(routeConversation(requestB, sessions, byClient, byTool), undefined);
  const branched = ChatRequest.parse({ model: 'x', prompt_cache_key: 'harness-a',
    messages: [{ role: 'user', content: 'different branch' }, ...next] });
  assert.equal(routeConversation(branched, sessions, byClient, byTool), undefined);
  const legacy = ChatRequest.parse({ model: 'x', messages: [...base, ...next] });
  assert.equal(routeConversation(legacy, sessions, byClient, byTool), 'qoder-a');
});
