import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {MediaService} from '../app/services/media.mjs';
import {RuntimeLifecycle} from '../app/core/lifecycle.mjs';
import {normalizeWorkbuddy} from '../app/core/catalog.mjs';
import {interjectCapability,queuedBatch} from '../app/services/session-input.mjs';
import {DshAdapter} from '../app/runtimes/dsh.mjs';
import {CodexAppServerAdapter} from '../app/runtimes/codex.mjs';
const wait=async fn=>{for(let i=0;i<400;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw new Error('Synthetic state timeout');};
const image=Buffer.from([137,80,78,71,13,10,26,10]);
const capabilities={image:{allowed:true,mimes:['image/png']},turn:{maxCount:8,maxTotalBytes:12*1024*1024}};
async function fixture(t,runtimeId='kimi'){
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/session-input-')),store=await new Store(root).open();
  await store.mutate(s=>{s.projects=[{id:'p',path:root}];});const instances=[];
  class Fake extends RuntimeLifecycle{
    constructor(o){super(o);this.sent=[];instances.push(this);}async prompt(text,attachments){this.running=true;this.sent.push({text,attachments});if(this.promptGate)await this.promptGate;}
    async steer(text,attachments,id){this.steered={text,attachments,id};if(this.steerGate)await this.steerGate;if(this.steerError)throw this.steerError;return {delivered:true};}
    async close(){this.closed=true;this.running=false;}
  }
  const model=normalizeWorkbuddy({id:'synthetic-flash',name:'Synthetic Flash',contextWindow:200000,reasoning:{supportedEfforts:['low']}}),gateway={register:async()=>({key:'synthetic'})};
  const media=await new MediaService(store).init(),manager=new Sessions(store,{get:()=>model},gateway,[{id:runtimeId,installed:true}],{constructors:{[runtimeId]:Fake},media,capabilities:async()=>capabilities});
  const session=await manager.create({projectId:'p',runtimeId,selection:{modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'}});
  manager.dsh={close:async()=>{}};
  t.after(async()=>{await manager.close();await store.close();await rm(root,{recursive:true,force:true});});
  const end=async(status='completed')=>{const a=instances.at(-1);a.running=false;await a.emit({type:'text',text:'Synthetic report completed.'});await a.emit({type:'turn-end',status});};
  return {store,root,manager,media,session,instances,end};
}
test('capabilities distinguish all native runtimes',()=>{
  for(const runtimeId of ['dsh','codex','kimi','antigravity'])for(const native of [true,false]){
    const c=interjectCapability({runtimeId,selection:{modelKey:native?'native':'workbuddy:synthetic'}});
    assert.equal(c.steer,runtimeId==='dsh'||runtimeId==='codex'&&!native);assert.equal(c.reason===null,c.steer);
  }
});
test('concurrent queue messages merge and run once after completion before automatic continuation',async t=>{
  const f=await fixture(t);assert.deepEqual(await f.manager.prompt(f.session.id,'inspect synthetic files'),{delivery:'turn'});
  const results=await Promise.all(['first queued','second queued'].map(text=>f.manager.prompt(f.session.id,text,[],{delivery:'queue'})));
  assert.equal(new Set(results.map(r=>r.id)).size,2);assert.equal(f.session.queue.length,2);
  const a=f.instances[0];await a.emit({type:'plan',data:{entries:[{status:'pending',content:'Synthetic open task'}]}});await f.end();
  await wait(()=>a.sent.length===2);assert.equal(a.sent[1].text,'first queued\n\nsecond queued');await wait(()=>!f.session.queue.length);
  const users=(await f.store.events(f.session.id)).filter(e=>e.type==='user');assert.deepEqual(users.at(-1).fromQueue,results.map(r=>r.id));assert.equal(users.length,2);await f.end();
  const ended=(await f.store.events(f.session.id)).filter(e=>e.type==='turn-end');assert.equal(ended[0].status,'paused');assert.equal(ended[0].reason.code,'unfinished_task');assert.equal(ended[0].reason.pending,1);assert.equal(ended[1].status,'completed');
});
test('a genuinely completed task still records completed before sending its queue',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'inspect synthetic files');await f.manager.prompt(f.session.id,'next task',[],{delivery:'queue'});await f.end();
  await wait(()=>f.instances[0].sent.length===2&&!f.session.queue.length);assert.equal((await f.store.events(f.session.id)).find(e=>e.type==='turn-end').status,'completed');await f.end();
});
test('queued messages cannot hide a native error behind a completed event',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'inspect synthetic files');await f.manager.prompt(f.session.id,'held',[],{delivery:'queue'});await f.instances[0].emit({type:'error',text:'Synthetic native failure'});await f.end();
  assert.equal(f.session.status,'failed');assert.equal(f.session.queue.length,1);assert.equal(f.instances[0].sent.length,1);
});
for(const status of ['failed','interrupted'])test(`${status} retains queue without automatic dispatch and allows dequeue`,async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'synthetic task');const q=await f.manager.prompt(f.session.id,'held',[],{delivery:'queue'});await f.end(status);
  assert.equal(f.session.queue.length,1);assert.equal(f.instances[0].sent.length,1);
  assert.ok((await f.store.events(f.session.id)).some(e=>e.source==='queue'&&e.text==='本轮未完成，排队的 1 条消息没有发送。'));
  assert.deepEqual(await f.manager.dequeue(f.session.id,q.id),{text:'held',attachments:[]});assert.equal(f.session.queue.length,0);
});
test('queue attachments stay staged, resist discard and survive store/media restart',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'synthetic task');const a=await f.media.stage({projectId:'p',name:'synthetic.png',data:image});
  const q=await f.manager.prompt(f.session.id,'held',[a.id],{delivery:'queue'});await f.media.discard(a.id);assert.ok(f.media.entries.has(a.id));assert.equal(f.media.entries.get(a.id).sessionId,undefined);
  await f.end('interrupted');const second=await new Store(f.root).open();const media=await new MediaService(second).init();
  try{assert.equal(second.session(f.session.id).queue[0].id,q.id);assert.equal(media.entries.get(a.id).sessionId,undefined);assert.equal((await media.entry(a.url)).id,a.id);}finally{await second.close();}
  const back=await f.manager.dequeue(f.session.id,q.id);assert.deepEqual(back.attachments,[a]);await f.media.discard(a.id);assert.equal(f.media.entries.has(a.id),false);
});
test('sending queue entries cannot be dequeued and attachment batches respect per-turn limits',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'synthetic task');const a=f.instances[0];let release;a.promptGate=new Promise(r=>{release=r;});
  const q=await f.manager.prompt(f.session.id,'held',[],{delivery:'queue'});await f.end();await wait(()=>a.sent.length===2);
  await assert.rejects(f.manager.dequeue(f.session.id,q.id),/正在发送/);release();await wait(()=>!f.session.queue.length);await f.end();
  const row=i=>({id:String(i),text:'x',attachments:Array.from({length:5},()=>({size:1}))});
  assert.equal(queuedBatch({runtimeId:'kimi',queue:[row(1),row(2)]},capabilities).length,1);
});
test('unsupported steer rejects; starting steer becomes queue; Codex steer failures return to queue',async t=>{
  const kimi=await fixture(t);await kimi.manager.prompt(kimi.session.id,'synthetic task');await assert.rejects(kimi.manager.prompt(kimi.session.id,'steer',[],{delivery:'steer'}),/Kimi ACP/);
  const f=await fixture(t,'codex');await f.manager.prompt(f.session.id,'synthetic task');const a=f.instances[0];a.running=false;
  const q=await f.manager.prompt(f.session.id,'before start',[],{delivery:'steer'});assert.equal(q.delivery,'queue');assert.ok(q.note);a.running=true;
  const imageAttachment=await f.media.stage({projectId:'p',name:'synthetic.png',data:image});
  const accepted=await f.manager.prompt(f.session.id,'steered',[imageAttachment.id],{delivery:'steer'});assert.equal(accepted.delivery,'steer');assert.equal(a.steered.attachments[0].sessionId,f.session.id);
  a.steerError=new Error('Synthetic turn mismatch');const failed=await f.manager.prompt(f.session.id,'late',[],{delivery:'steer'});assert.equal(failed.delivery,'queue');
  assert.ok((await f.store.events(f.session.id)).some(e=>e.type==='steer-state'&&e.state==='failed'));await f.end('interrupted');
});
test('DSH steer uses exact RPC identity, observes splice and captures native carry without a second prompt',async()=>{
  const calls=[],events=[];const adapter=new DshAdapter({host:{on(){},rpc:async(...args)=>{calls.push(args);return {accepted:true};}},session:{},emit:async e=>events.push(e)});adapter.nativeId='synthetic-native';adapter.running=true;
  await adapter.steer('synthetic steering',[],'synthetic-steer');assert.equal(calls[0][0],'session/prompt');assert.equal(calls[0][1].request.mode,'steer');assert.equal(calls[0][1].request.requestId,'synthetic-steer');
  await adapter.handleEvent({seq:1,type:'agent/inbox/spliced',data:{target:'next-step',inserted:[{id:'inbox-1',source:{rpcId:'synthetic-steer'}}]}});
  assert.ok(events.some(e=>e.state==='delivered'));
  await adapter.handleEvent({seq:2,type:'turn/end',data:{reason:{kind:'completed'}}});assert.equal(adapter.running,true);assert.deepEqual(events.at(-1).nativeCarry,['synthetic-steer']);assert.ok(events.some(e=>e.state==='carried'));
  await adapter.handleEvent({seq:3,type:'user/message',data:{source:{rpcId:'synthetic-steer'}}});assert.ok(events.some(e=>e.type==='steer-consumed'));
  await adapter.handleEvent({seq:4,type:'turn/end',data:{reason:{kind:'completed'}}});assert.equal(adapter.running,false);assert.equal(calls.length,1);
});
test('Codex steer requires expected active turn and never starts another turn',async()=>{
  const calls=[],adapter=new CodexAppServerAdapter({rpc:{request:async(...args)=>calls.push(args)}});adapter.running=true;adapter.threadId='thread';adapter.turnId='turn';
  assert.deepEqual(await adapter.steer('synthetic',[],'input-id'),{delivered:true});assert.deepEqual(calls,[['turn/steer',{threadId:'thread',expectedTurnId:'turn',input:[{type:'text',text:'synthetic',text_elements:[]}],clientUserMessageId:'input-id'}]]);
  adapter.turnId=null;await assert.rejects(adapter.steer('late'),/结束/);
});
test('paused completion drains queue, and a dispatch lost after native submission is retained without repeating it',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'synthetic task');const a=f.instances[0],q=await f.manager.prompt(f.session.id,'held',[],{delivery:'queue'});
  a.prompt=async()=>{throw new Error('Synthetic connection lost after submission');};await f.end('paused');
  await wait(()=>f.session.status==='failed'&&!f.manager.draining.has(f.session.id));assert.equal(f.session.queue[0].id,q.id);assert.ok(f.session.queueDispatch.ids.includes(q.id));
  await assert.rejects(f.manager.dequeue(f.session.id,q.id),/原生接收状态尚未确认/);
  const reopened=await new Store(f.root).open();try{assert.equal(reopened.session(f.session.id).queue[0].id,q.id);assert.ok(reopened.session(f.session.id).queueDispatch);}finally{await reopened.close();}
});
test('Codex RPC transport ambiguity never becomes an automatic duplicate queue entry',async()=>{
  const a=new CodexAppServerAdapter({rpc:{request:async()=>{throw new Error('Synthetic transport lost');}}});a.running=true;a.threadId='thread';a.turnId='turn';
  await assert.rejects(a.steer('synthetic'),error=>error.nativeAdmissionUnknown===true);
  a.rpc.request=async()=>{throw Object.assign(new Error('Synthetic rejected turn'),{rpcRejected:true});};await assert.rejects(a.steer('synthetic'),error=>!error.nativeAdmissionUnknown);
});
test('queued attachments split into ordered native turns at the per-turn count limit',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'synthetic task');const images=[];
  for(let i=0;i<10;i++)images.push(await f.media.stage({projectId:'p',name:`synthetic-${i}.png`,data:image}));
  const first=await f.manager.prompt(f.session.id,'batch one',images.slice(0,5).map(a=>a.id),{delivery:'queue'}),second=await f.manager.prompt(f.session.id,'batch two',images.slice(5).map(a=>a.id),{delivery:'queue'}),a=f.instances[0];
  await f.end();await wait(()=>a.sent.length===2&&f.session.queue.length===1);assert.deepEqual(a.sent[1].attachments.map(a=>a.id),images.slice(0,5).map(a=>a.id));
  await f.end();await wait(()=>a.sent.length===3&&!f.session.queue.length);assert.deepEqual(a.sent[2].attachments.map(a=>a.id),images.slice(5).map(a=>a.id));await f.end();
  assert.deepEqual((await f.store.events(f.session.id)).filter(e=>e.fromQueue).map(e=>e.fromQueue),[[first.id],[second.id]]);
});
test('a DSH native carried turn remains part of its original task and does not redispatch the message',async t=>{
  const f=await fixture(t,'dsh');await f.manager.prompt(f.session.id,'synthetic task');const a=f.instances[0],id=f.manager.runs.get(f.session.id).id;
  await a.emit({type:'turn-end',status:'completed',nativeCarry:['synthetic-steer']});assert.equal(f.manager.runs.get(f.session.id).id,id);assert.equal(f.session.status,'running');assert.equal(a.sent.length,1);
  await f.end();assert.equal(f.session.status,'completed');assert.equal(a.sent.length,1);assert.equal((await f.store.events(f.session.id)).filter(e=>e.type==='turn-end').length,1);
});
