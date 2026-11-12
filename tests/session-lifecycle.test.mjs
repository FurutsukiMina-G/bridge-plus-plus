import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {RuntimeLifecycle} from '../app/core/lifecycle.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function fixture(t){
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/session-life-'));const store=await new Store(root).open();
  await store.mutate(s=>{s.projects=[{id:'project',name:'Test',path:root}];});
  const instances=[],gate=deferred();let fail=false;
  class Fake extends RuntimeLifecycle {constructor(options){super(options);instances.push(this);this.sent=[];this.decisions=[];}async prompt(text){await gate.promise;this.checkOpen();if(fail)throw new Error('startup failed');this.sent.push(text);}async approve(...args){this.decisions.push(args);}async close(){this.closed=true;}}
  const manager=new Sessions(store,{get(){throw new Error('unexpected source');}},null,[{id:'codex',name:'Fixture',installed:true}],{constructors:{codex:Fake}});
  const session=await manager.create({projectId:'project',runtimeId:'codex',selection:{modelKey:'native'}});
  t.after(async()=>{gate.resolve();await manager.close();await store.close();});return {store,manager,session,instances,gate,setFail:value=>{fail=value;}};
}
async function until(fn){for(let n=0;n<200;n++){if(fn())return;await new Promise(r=>setTimeout(r,2));}throw new Error('fixture did not reach state');}
test('immediate cancellation cannot dispatch the task and keeps user/end journal ordering',async t=>{const f=await fixture(t);const run=f.manager.prompt(f.session.id,'do work');await f.manager.cancel(f.session.id);f.gate.resolve();await run;assert.equal(f.instances.length,0);assert.equal(f.session.status,'interrupted');assert.deepEqual((await f.store.events(f.session.id)).map(e=>e.type),['user','turn-end']);});
test('concurrent submit is rejected; cancelled startup and stale adapter events cannot affect a later turn',async t=>{const f=await fixture(t);const first=f.manager.prompt(f.session.id,'first');await until(()=>f.instances.length===1);await assert.rejects(f.manager.prompt(f.session.id,'duplicate'),/仍在运行/);await f.manager.cancel(f.session.id);f.gate.resolve();await first;assert.equal(f.instances[0].sent.length,0);await f.manager.prompt(f.session.id,'second');await f.instances[0].emit({type:'text',text:'stale'});await f.instances[1].emit({type:'text',text:'current'});await f.instances[1].emit({type:'turn-end',status:'completed'});assert.equal(f.session.status,'completed');const events=await f.store.events(f.session.id);assert.equal(events.filter(e=>e.type==='turn-end').length,2);assert.deepEqual(events.filter(e=>e.type==='text').map(e=>e.text),['current']);});
test('failed startup is discarded so retry creates a healthy native connection',async t=>{const f=await fixture(t);f.gate.resolve();f.setFail(true);await assert.rejects(f.manager.prompt(f.session.id,'first'),/startup failed/);f.setFail(false);await f.manager.prompt(f.session.id,'retry');assert.equal(f.instances.length,2);assert.equal(f.instances[0].closed,true);await f.instances[1].emit({type:'turn-end',status:'completed'});});

test('journal write failure releases the turn so the session can retry after storage recovers',async t=>{const f=await fixture(t);f.gate.resolve();const event=f.store.event.bind(f.store);f.store.event=async()=>{throw new Error('disk full fixture');};await assert.rejects(f.manager.prompt(f.session.id,'first'),/disk full/);assert.equal(f.manager.runs.has(f.session.id),false);assert.equal(f.session.status,'failed');f.store.event=event;await f.manager.prompt(f.session.id,'retry');await f.instances[0].emit({type:'turn-end',status:'completed'});});
test('multiple pending approvals remain waiting and every stale approval is expired on cancellation',async t=>{const f=await fixture(t);f.gate.resolve();await f.manager.prompt(f.session.id,'work');const adapter=f.instances[0];await adapter.emit({type:'approval',approvalId:'one'});await adapter.emit({type:'approval',approvalId:'two'});await f.manager.approve(f.session.id,'one','approve');assert.equal(f.session.status,'waiting');await f.manager.cancel(f.session.id);await assert.rejects(f.manager.approve(f.session.id,'two','approve'),/过期/);const events=await f.store.events(f.session.id);assert.ok(events.some(e=>e.type==='approval-resolved'&&e.approvalId==='two'&&e.choice==='expired'));assert.equal(events.filter(e=>e.type==='turn-end').length,1);});

test('exhausted gateway correction closes the runtime and ignores a later native completed event',async t=>{
  const f=await fixture(t);f.gate.resolve();await f.manager.prompt(f.session.id,'inspect fixture');const first=f.instances[0];
  await first.emit({type:'error',source:'gateway',fatal:true,code:'unfinished_turn',text:'Fixture correction exhausted'});
  await first.emit({type:'turn-end',status:'completed'});
  assert.equal(f.session.status,'failed');assert.equal(first.closed,true);assert.equal(f.manager.runs.has(f.session.id),false);
  assert.deepEqual((await f.store.events(f.session.id)).filter(e=>['error','turn-end'].includes(e.type)).map(e=>e.type==='error'?e.code:e.status),['unfinished_turn','failed']);
  await f.manager.prompt(f.session.id,'continue');await first.emit({type:'error',source:'gateway',fatal:true,text:'stale'});
  await f.instances[1].emit({type:'text',text:'Fixture inspection completed.'});await f.instances[1].emit({type:'turn-end',status:'completed'});assert.equal(f.session.status,'completed');
});

test('one settled approval journals exactly one choice row while the native decision mirror survives as data',async t=>{
  const f=await fixture(t);f.gate.resolve();await f.manager.prompt(f.session.id,'work');
  const adapter=f.instances[0];adapter.approve=async(id,choice)=>{await adapter.emit({type:'approval-resolved',approvalId:id,choice});};
  await adapter.emit({type:'approval',approvalId:'dsh:remote:e1'});
  await f.manager.approve(f.session.id,'dsh:remote:e1','approve');
  await adapter.emit({type:'native-event',name:'approval/decided',data:{id:'d1',outcome:'allowed-once'}});
  await adapter.emit({type:'text',text:'Fixture approval completed.'});await adapter.emit({type:'turn-end',status:'completed'});
  const events=await f.store.events(f.session.id);
  const settled=events.filter(e=>e.type==='approval-resolved');
  assert.equal(settled.length,1);assert.equal(settled[0].approvalId,'dsh:remote:e1');assert.equal(settled[0].choice,'approve');
  const mirror=events.find(e=>e.type==='native-event'&&e.name==='approval/decided');assert.deepEqual(mirror.data,{id:'d1',outcome:'allowed-once'});
});
