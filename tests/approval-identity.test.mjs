import {test} from 'node:test';
import assert from 'node:assert/strict';
import {KimiAcpAdapter} from '../app/runtimes/kimi-acp.mjs';
import {CodexAdapter} from '../app/runtimes/codex.mjs';
import {ActivityTracker} from '../app/ui/activity.js';

const options=[{kind:'allow_once',optionId:'once'},{kind:'allow_always',optionId:'session'},{kind:'reject_once',optionId:'reject'}];
const permission=(id=0,sessionId='child-fixture')=>({id,method:'session/request_permission',params:{sessionId,options,toolCall:{title:'Bash',toolCallId:'fixture-tool'}}});
function adapter(Adapter){const events=[],responses=[];const value=new Adapter({emit:async e=>events.push(e)});value.rpc={respond:(id,result)=>responses.push({id,result})};return {value,events,responses};}

for(const [name,Adapter,message,choice]of [
  ['Kimi',KimiAcpAdapter,permission(),'approve'],
  ['Codex approval',CodexAdapter,{id:0,method:'item/commandExecution/requestApproval',params:{command:['fixture']}},'approve'],
  ['Codex question',CodexAdapter,{id:0,method:'item/tool/requestUserInput',params:{questions:[]}},'approve'],
])test(`${name} RPC ID reuse after native restart cannot hide or resolve a new request`,async()=>{
  const first=adapter(Adapter),second=adapter(Adapter);await first.value.message(message);const old=first.events[0];await first.value.approve(old.approvalId,choice,{});
  await second.value.message(structuredClone(message));const current=second.events[0];
  assert.notEqual(current.approvalId,old.approvalId);assert.equal(new Map([[old.approvalId,'approve']]).has(current.approvalId),false);
  await assert.rejects(second.value.approve(old.approvalId,choice,{}),/过期|pending/);assert.equal(second.responses.length,0,'A stale click must not approve the new native request');
  await second.value.approve(current.approvalId,choice,{});assert.equal(second.responses.length,1);assert.equal(second.responses[0].id,0,'Wire correlation still uses the original native RPC ID');
  const tracker=new ActivityTracker();tracker.replay('s',[old,{type:'approval-resolved',approvalId:old.approvalId,choice:'approve'},current]);assert.equal(tracker.describe('s','waiting').kind,current.type);
});
test('parallel and nested Kimi permissions keep their choices and original reply destinations',async()=>{
  const f=adapter(KimiAcpAdapter);await f.value.message(permission(0,'child-a'));await f.value.message(permission('request-b','child-b'));
  const [a,b]=f.events;assert.notEqual(a.approvalId,b.approvalId);assert.equal(a.data.sessionId,'child-a');assert.equal(b.data.sessionId,'child-b');assert.deepEqual(a.choices,['approve','approve-session','reject']);
  await f.value.approve(b.approvalId,'reject');assert.equal(f.responses[0].id,'request-b');assert.equal(f.responses[0].result.outcome.optionId,'reject');assert.equal(f.value.requests.has(a.approvalId),true);
  await f.value.approve(a.approvalId,'approve-session');assert.equal(f.responses[1].id,0);assert.equal(f.responses[1].result.outcome.optionId,'session');assert.equal(f.value.requests.size,0);
});
test('rejected permissions do not become session-wide allowances and cannot be answered twice',async()=>{
  const f=adapter(KimiAcpAdapter);await f.value.message(permission());const id=f.events[0].approvalId;await f.value.approve(id,'reject');assert.equal(f.responses[0].result.outcome.optionId,'reject');
  await assert.rejects(f.value.approve(id,'approve'),/过期/);assert.equal(f.responses.length,1);
});
