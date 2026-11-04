import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {CodexAppServerAdapter as CodexAdapter} from '../app/runtimes/codex.mjs';
import {KimiAcpAdapter} from '../app/runtimes/kimi-acp.mjs';
import {permissionCatalog,KIMI_PERMISSION_IDS,codexPermissionSettings} from '../app/services/runtime-permissions.mjs';
import {launch} from '../app/core/process.mjs';
const peer=resolve('tests/fixtures/permission-native.mjs');
async function fixture(t,id,mode,env={}){
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/permission-protocol-'));
  const events=[],runtime={id,executable:id==='kimi'?peer:process.execPath,permissions:permissionCatalog({id},{workspace:true,readonly:true,approvals:true,autoReview:true})};
  const calls=[],session={id:'fixture',nativeId:'same-native',selection:{modelKey:'native'},permissionMode:mode};
  let end;const outcome=new Promise(resolve=>{end=resolve;});
  const Adapter=id==='kimi'?KimiAcpAdapter:CodexAdapter;
  const adapter=new Adapter({runtime,session,permissionMode:mode,...id==='codex'?{endpoint:{baseURL:'http://127.0.0.1:1',key:'fixture'},variant:{id:'fixture'},model:{}}:{},project:{path:root},dir:root,emit:async e=>{events.push(e);if(e.type==='turn-end')end(e);},saveNative:async id=>{session.nativeId=id;},launchProcess:(command,args,options)=>{calls.push(args);return launch(process.execPath,[peer,...(id==='kimi'?[]:args)],{...options,env:{...options.env,...env}});}});
  t.after(()=>adapter.close());return {adapter,events,outcome,session,calls};
}
for(const id of ['codex','kimi'])for(const mode of ['ask','auto-review','auto','readonly'])test(`${id}/${mode} starts a real JSON-RPC child, resumes identity and applies mode before prompting`,{timeout:15000},async t=>{
  const f=await fixture(t,id,mode);await f.adapter.prompt('Synthetic transport check');assert.equal((await f.outcome).status,'completed');assert.equal(f.session.nativeId,'same-native');
  const observed=JSON.parse(f.events.find(e=>e.type==='text').text);
  if(id==='kimi')assert.equal(observed.mode,KIMI_PERMISSION_IDS[mode]);
  else{const expected=codexPermissionSettings(mode);assert.equal(observed.approvalPolicy,expected.approvalPolicy);assert.equal(observed.approvalsReviewer,expected.approvalsReviewer);assert.equal(observed.sandbox.type,mode==='readonly'?'readOnly':'workspaceWrite');}
  assert.equal(f.calls.length,1);
});
test('a native Codex sandbox mismatch stops before any prompt or model request',{timeout:15000},async t=>{
  const f=await fixture(t,'codex','auto',{BPP_TEST_DOWNGRADE:'1'});await assert.rejects(f.adapter.prompt('Must not dispatch'),/未应用所选授权/);assert.equal(f.events.some(e=>e.type==='text'),false);
});
test('a resumed Kimi session missing the selected mode stops without fallback or prompting',{timeout:15000},async t=>{
  const f=await fixture(t,'kimi','auto',{BPP_TEST_MISSING_MODE:'yolo'});await assert.rejects(f.adapter.prompt('Must not dispatch'),/未返回所选授权模式/);assert.equal(f.events.some(e=>e.type==='text'),false);
});
