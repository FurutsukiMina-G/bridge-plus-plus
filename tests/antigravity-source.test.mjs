import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {normalizeAntigravity} from '../app/core/catalog.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {AntigravityAdapter} from '../app/runtimes/antigravity.mjs';

test('Antigravity Gemini source keeps native model identity and does not invent context settings',()=>{
  const model=normalizeAntigravity({id:'gemini-3.8-flash-low',name:'Gemini 3.8 Flash (Low)'});
  assert.equal(model.source,'antigravity');assert.equal(model.boundRuntime,'antigravity');assert.deepEqual(model.contexts,[]);assert.equal(model.contextMaximum,null);
  assert.equal(normalizeAntigravity({id:'claude-example',name:'Another native model'}),null);
});

test('Gemini is bound to Antigravity and its adapter never registers a bridge',async()=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/antigravity-')),store=await new Store(root).open();
  const model=normalizeAntigravity({id:'gemini-3.8-flash-low',name:'Gemini 3.8 Flash (Low)'});
  await store.mutate(s=>{s.projects=[{id:'project',path:root,name:'Test'}];s.catalog.antigravity={status:'ready',models:[model]};});
  const gateway={register(){throw new Error('Gemini must never enter the bridge gateway');}},providers={get:key=>{assert.equal(key,model.key);return model;}};
  const sessions=new Sessions(store,providers,gateway,['dsh','kimi','codex','antigravity'].map(id=>({id,name:id,installed:true,executable:'unused'})));
  const selection={modelKey:model.key,identity:model.identity,contextTokens:null};
  for(const runtimeId of ['dsh','kimi','codex'])await assert.rejects(sessions.create({projectId:'project',runtimeId,selection}),/仅由 Antigravity/);
  const session=await sessions.create({projectId:'project',runtimeId:'antigravity',selection});assert.equal(session.selection.nativeModel,model.id);
  const adapter=await sessions.adapter(session);assert.ok(adapter instanceof AntigravityAdapter);assert.equal(adapter.endpoint,undefined);await sessions.close();
});
