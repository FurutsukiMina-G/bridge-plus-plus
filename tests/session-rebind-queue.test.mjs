import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {RuntimeLifecycle} from '../app/core/lifecycle.mjs';
import {normalizeWorkbuddy} from '../app/core/catalog.mjs';

const raw={id:'fixture',name:'Fixture',contextWindow:200000,reasoning:{supportedEfforts:['low','high']}};
const select=model=>({modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'});
async function until(fn){for(let i=0;i<250;i++){if(fn())return;await new Promise(r=>setTimeout(r,3));}throw new Error('Fixture state timeout');}
async function fixture(t){
  await mkdir('.runtime/tests',{recursive:true});const store=await new Store(await mkdtemp(resolve('.runtime/tests/session-rebind-'))).open();
  await store.mutate(s=>{s.projects=[{id:'p',path:store.root}];});
  const model=normalizeWorkbuddy(raw),instances=[];let failing=false;
  class Fake extends RuntimeLifecycle{
    constructor(options){super(options);this.sent=[];instances.push(this);}
    async prompt(text,attachments){this.checkOpen();this.sent.push({text,reasoning:this.session.selection.reasoning,contextBudget:this.session.selection.contextBudget??null});}
    async close(){this.closed=true;}
  }
  const gateway={register:async(_model,variant)=>({baseURL:'http://127.0.0.1:1/v1',key:'fixture',model:variant.id})};
  const providers={get:()=>{if(failing)throw new Error('模型目录已更新');return model;}};
  const manager=new Sessions(store,providers,gateway,[{id:'codex',installed:true}],{constructors:{codex:Fake}});
  const session=await manager.create({projectId:'p',runtimeId:'codex',selection:select(model)});
  t.after(async()=>{await manager.close();await store.close();});
  return {store,manager,session,model,instances,setFailing:value=>{failing=value;}};
}

test('a busy session queues the validated parameters and applies them when the turn ends',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'hello');const adapter=f.instances[0],before={...f.session.selection};
  assert.deepEqual(await f.manager.rebind(f.session.id,{...f.session.selection,reasoning:'high'}),{queued:true});
  assert.deepEqual(f.session.selection,before);assert.equal(f.session.selectionNext.reasoning,'high');assert.ok(f.session.selectionNext.requestedAt);
  assert.ok((await f.store.events(f.session.id)).some(e=>e.type==='notice'&&e.source==='session'&&/新参数已排队/.test(e.text??'')));
  await adapter.emit({type:'text',text:'Hello.'});await adapter.emit({type:'turn-end',status:'completed',nativeTurn:1});
  assert.equal(f.session.status,'completed');assert.equal(f.session.selection.reasoning,'high');assert.equal(f.session.selectionNext,undefined);
  assert.ok((await f.store.events(f.session.id)).some(e=>e.type==='notice'&&e.source==='session'&&e.text==='已应用排队的新参数。'));
});

test('queued parameters can be cancelled before the turn ends',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'hello');const adapter=f.instances[0],before={...f.session.selection};
  await f.manager.rebind(f.session.id,{...f.session.selection,reasoning:'high'});
  assert.equal(await f.manager.cancelRebind(f.session.id),true);assert.equal(f.session.selectionNext,undefined);
  assert.equal(await f.manager.cancelRebind(f.session.id),false);
  await adapter.emit({type:'text',text:'Hello.'});await adapter.emit({type:'turn-end',status:'completed',nativeTurn:1});
  assert.deepEqual(f.session.selection,before);
  const events=await f.store.events(f.session.id);
  assert.ok(events.some(e=>e.text==='已取消排队的参数修改。'));assert.ok(!events.some(e=>e.text==='已应用排队的新参数。'));
});

test('a newer queued rebind replaces the older one and only it is applied',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'hello');const adapter=f.instances[0];
  await f.manager.rebind(f.session.id,{...f.session.selection,reasoning:'high'});
  await f.manager.rebind(f.session.id,{...f.session.selection,contextBudget:100000});
  assert.equal(f.session.selectionNext.reasoning,'low');assert.equal(f.session.selectionNext.contextBudget,100000);
  await adapter.emit({type:'text',text:'Hello.'});await adapter.emit({type:'turn-end',status:'completed',nativeTurn:1});
  assert.equal(f.session.selection.reasoning,'low');assert.equal(f.session.selection.contextBudget,100000);assert.equal(f.session.selectionNext,undefined);
});

test('a queued rebind that no longer validates keeps the old parameters and explains why',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'hello');const adapter=f.instances[0],before={...f.session.selection};
  await f.manager.rebind(f.session.id,{...f.session.selection,reasoning:'high'});f.setFailing(true);
  await adapter.emit({type:'text',text:'Hello.'});await adapter.emit({type:'turn-end',status:'completed',nativeTurn:1});
  assert.deepEqual(f.session.selection,before);assert.equal(f.session.selectionNext,undefined);
  assert.ok((await f.store.events(f.session.id)).some(e=>e.type==='notice'&&e.source==='session'&&/^排队的新参数没有应用：/.test(e.text??'')));
});

test('a queued message starts only after the queued parameters are applied',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'hello');const adapter=f.instances[0];
  await f.manager.prompt(f.session.id,'next question',[],{delivery:'queue'});
  await f.manager.rebind(f.session.id,{...f.session.selection,reasoning:'high'});
  await adapter.emit({type:'text',text:'Hello.'});await adapter.emit({type:'turn-end',status:'completed',nativeTurn:1});
  await until(()=>adapter.sent.length===2);
  assert.equal(adapter.sent[1].text,'next question');assert.equal(adapter.sent[1].reasoning,'high');assert.equal(f.session.queue.length,0);
});

test('an idle rebind still applies immediately and reports that nothing was queued',async t=>{
  const f=await fixture(t);
  const result=await f.manager.rebind(f.session.id,{...f.session.selection,reasoning:'high'});
  assert.equal(result.queued,false);assert.equal(result.id,f.session.id);
  assert.equal(f.session.selection.reasoning,'high');assert.equal(f.session.selectionNext,undefined);
});
