import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {RuntimeLifecycle} from '../app/core/lifecycle.mjs';
import {CodexAdapter,codexLaunchSettings,codexPermissionResultMatches} from '../app/runtimes/codex.mjs';
import {KimiAcpAdapter} from '../app/runtimes/kimi-acp.mjs';
import {permissionCatalog,runtimePermissionView,validatePermissionMode,saveRuntimePermission,codexPermissionSettings,antigravityPermissionArgs} from '../app/services/runtime-permissions.mjs';

const runtime={id:'codex',installed:true,executable:'fixture',permissions:permissionCatalog({id:'codex'},{workspace:true,readonly:true,approvals:true,autoReview:true,exec:{workspace:true,readonly:true,autoReview:true}})};
async function fixture(t){
  await mkdir('.runtime/tests',{recursive:true});const store=await new Store(await mkdtemp(resolve('.runtime/tests/permissions-'))).open();
  await store.mutate(s=>{s.projects=[{id:'p',path:store.root}];});const instances=[];
  class Fake extends RuntimeLifecycle{constructor(options){super(options);this.sent=[];instances.push(this);}async prompt(text){this.sent.push(text);}async close(){this.closed=true;}async approve(){}}
  const manager=new Sessions(store,null,null,[runtime],{constructors:{codex:Fake}});
  const create=()=>manager.create({projectId:'p',runtimeId:'codex',selection:{modelKey:'native'}});
  t.after(async()=>{await manager.close();await store.close();});return {store,manager,instances,create};
}
test('permission catalogs expose only observed modes and preserve an unknown inherited default',()=>{
  assert.deepEqual(permissionCatalog({id:'codex'}).modes,[]);
  assert.equal(runtime.permissions.default,null);assert.equal(runtime.permissions.current,null);
  assert.deepEqual(permissionCatalog({id:'dsh'}).modes.map(x=>x.id),['readonly','ask','auto-review','auto']);
  assert.equal(permissionCatalog({id:'codex'},{workspace:true,readonly:true,approvals:true}).modes.some(x=>x.id==='auto-review'),false);
  const kimi=permissionCatalog({id:'kimi'},{modes:{availableModes:[{id:'default'},{id:'plan'},{id:'unrecognized-new-mode'}]}});
  assert.deepEqual(kimi.modes.map(x=>x.id),['ask','readonly']);
  const ag=permissionCatalog({id:'antigravity'},{sandbox:true,auto:true,edits:true,plan:true,skip:true});
  assert.deepEqual(ag.modes.map(x=>x.id),['auto-review','auto','readonly']);assert.equal(ag.default,null);
  assert.throws(()=>validatePermissionMode({id:'kimi',permissions:kimi},'auto'),/未核实支持/);
  for(const value of [undefined,'bad',{},false])assert.throws(()=>validatePermissionMode(runtime,value));
  const view=runtimePermissionView(runtime,{permissionMode:'removed'});assert.equal(view.permissions.current,'removed');assert.match(view.permissions.issue,/重新选择/);
});
test('runtime preference is durable, only new sessions inherit it, null restores the legacy default',async t=>{
  const f=await fixture(t),old=await f.create();assert.equal(old.permissionMode,null);
  let result=await saveRuntimePermission(f.store,[runtime],'codex','readonly');assert.equal(result[0].permissions.current,'readonly');
  const next=await f.create();assert.equal(next.permissionMode,'readonly');assert.equal(old.permissionMode,null);
  const saved=JSON.parse(await readFile(join(f.store.root,'workspace.json'),'utf8'));assert.equal(saved.preferences.runtimes.codex.permissionMode,'readonly');
  await assert.rejects(saveRuntimePermission(f.store,[runtime],'codex','unsupported'));assert.equal(f.store.state.preferences.runtimes.codex.permissionMode,'readonly');
  await saveRuntimePermission(f.store,[runtime],'codex',null);assert.equal((await f.create()).permissionMode,null);
});
test('active permission changes wait for the next user turn; continuation retains current permissions and native ID',async t=>{
  const f=await fixture(t),s=await f.create();await f.manager.setPermission(s.id,'auto');s.nativeId='same-native';
  await f.manager.prompt(s.id,'Read fixture');const a=f.instances[0];
  await f.manager.setPermission(s.id,'readonly');assert.equal(s.permissionMode,'auto');assert.equal(s.permissionModeNext,'readonly');assert.equal(a.permissionMode,'auto');
  await a.emit({type:'text',text:'Read completed.'});await a.emit({type:'turn-end',status:'completed'});
  await f.manager.prompt(s.id,'Read again');assert.equal(s.permissionMode,'readonly');assert.equal(Object.hasOwn(s,'permissionModeNext'),false);assert.equal(a.closed,true);assert.equal(f.instances[1].permissionMode,'readonly');assert.equal(s.nativeId,'same-native');
});
test('pending approvals and questions block permission switching without consuming the request or changing durable state',async t=>{
  const f=await fixture(t),s=await f.create();await f.manager.prompt(s.id,'Read fixture');const a=f.instances[0];
  for(const type of ['approval','question']){
    await a.emit({type,approvalId:type});await assert.rejects(f.manager.setPermission(s.id,'auto'),/待处理授权或提问/);
    assert.equal(s.permissionMode,null);assert.equal(f.manager.runs.get(s.id).approvals.has(type),true);
    await f.manager.approve(s.id,type,'reject');
  }
  await f.manager.setPermission(s.id,'auto');assert.equal(s.permissionModeNext,'auto');
});
test('idle changes discard cached native process while preserving identity; native handoffs block mutation',async t=>{
  const f=await fixture(t),s=await f.create();await f.manager.prompt(s.id,'hello');const a=f.instances[0];await a.emit({type:'text',text:'Hello'});await a.emit({type:'turn-end',status:'completed'});
  s.nativeId='native';await f.manager.setPermission(s.id,'readonly');assert.equal(a.closed,true);assert.equal(s.nativeId,'native');
  f.manager.claimNative(s.id);await assert.rejects(f.manager.setPermission(s.id,'auto'),/原生窗口/);f.manager.external.delete(s.id);
});
test('unsupported persisted modes stop before a task can reach the native process',async t=>{
  const f=await fixture(t),s=await f.create();s.permissionMode='removed';await assert.rejects(f.manager.prompt(s.id,'Read fixture'),/未核实支持/);assert.equal(f.instances.length,0);assert.equal(s.status,'failed');
});
test('legacy native ask migrates durably to readonly with a notice and an independent native preference',async t=>{
  const f=await fixture(t);await saveRuntimePermission(f.store,[runtime],'codex','ask');const s=await f.create();assert.equal(s.permissionMode,'readonly');assert.equal(s.permissionMigration.from,'ask');assert.equal(f.manager.permissionView(s).current,'readonly');
  s.permissionMode='ask';s.nativeId='preserve-native';await f.manager.prompt(s.id,'Read fixture');assert.equal(f.instances[0].permissionMode,'readonly');assert.equal(s.nativeId,'preserve-native');assert.equal(s.permissionMode,'readonly');assert.ok((await f.store.events(s.id)).some(e=>e.source==='permissions'&&e.text.includes('只读')));
  await assert.rejects(f.manager.setPermission(s.id,'ask'),/未核实支持/);
  await saveRuntimePermission(f.store,[runtime],'codex',null,{modelKey:'native'});assert.equal(f.store.state.preferences.runtimes.codex.permissionMode,'ask');assert.equal((await f.create()).permissionMode,null);
  const view=runtimePermissionView(runtime,f.store.state.preferences.runtimes.codex);assert.equal(view.permissions.bySelection.native.current,null);assert.equal(view.permissions.bySelection.gateway.current,'ask');
});
test('native launch mappings retain native sandboxes and leave inherited launches untouched',()=>{
  const session={selection:{nativeModel:'fixture'}};
  assert.equal(codexLaunchSettings({session}).args.some(x=>/approval_policy|sandbox_mode|approvals_reviewer/.test(x)),false);
  const settings=codexLaunchSettings({session,permissionMode:'auto-review',runtime});assert.ok(settings.args.includes('approvals_reviewer="auto_review"'));assert.ok(settings.args.includes('sandbox_mode="workspace-write"'));
  assert.deepEqual(codexPermissionSettings('readonly'),{approvalPolicy:'never',sandbox:'read-only',approvalsReviewer:'user'});
  assert.deepEqual(antigravityPermissionArgs(null),['--mode','accept-edits','--sandbox']);assert.throws(()=>antigravityPermissionArgs('ask'));
  for(const mode of ['auto','auto-review','readonly']){const args=antigravityPermissionArgs(mode);assert.ok(args.includes('--sandbox'));assert.equal(args.includes('--dangerously-skip-permissions'),mode==='auto');}
});
test('readonly rejects native escalation requests directly while questions still reach the user',async()=>{
  const events=[],replies=[];const a=new CodexAdapter({permissionMode:'readonly',emit:async e=>events.push(e)});a.rpc={respond:(...x)=>replies.push(x)};
  await a.message({id:1,method:'item/permissions/requestApproval',params:{permissions:{fileSystem:{write:['outside']}}}});
  assert.deepEqual(replies[0],[1,{permissions:{},scope:'turn'}]);assert.equal(a.requests.size,0);assert.equal(events[0].code,'permission_denied');
  await a.message({id:2,method:'item/tool/requestUserInput',params:{questions:[]}});assert.equal(events.at(-1).type,'question');
  const k=new KimiAcpAdapter({permissionMode:'readonly',emit:async e=>events.push(e)});k.rpc={respond:(...x)=>replies.push(x)};
  await k.message({id:3,method:'session/request_permission',params:{options:[{kind:'allow_once',optionId:'yes'},{kind:'reject_once',optionId:'no'}]}});
  assert.deepEqual(replies.at(-1),[3,{outcome:{outcome:'selected',optionId:'no'}}]);assert.equal(k.requests.size,0);
});
test('Codex validates the actual camelCase native sandbox policy rather than the CLI config spelling',()=>{
  assert.equal(codexPermissionResultMatches('auto',{approvalPolicy:'never',sandbox:{type:'workspaceWrite'}}),true);
  assert.equal(codexPermissionResultMatches('readonly',{approvalPolicy:'never',sandbox:{type:'readOnly'}}),true);
  assert.equal(codexPermissionResultMatches('readonly',{approvalPolicy:'never',sandbox:{type:'dangerFullAccess'}}),false);
  assert.equal(codexPermissionResultMatches('auto-review',{approvalPolicy:'on-request',sandbox:{type:'workspaceWrite'},approvalsReviewer:'user'},{autoReview:true}),false);
});
