import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {DshAdapter} from '../app/runtimes/dsh.mjs';
import {ensureDshProfile} from '../app/services/dsh-host.mjs';
import {externalAsarHasFile} from '../app/core/external-asar.mjs';
import {DSH_PERMISSION_PRESETS,permissionCatalog,validatePermissionMode,runtimePermissionView,saveRuntimePermission} from '../app/services/runtime-permissions.mjs';
const bundle='@deepseek-ai/dsh-experimental-auto-review';
async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/dsh-permissions-'));}
test('DSH exposes four native presets with exact labels and durable ask default',async()=>{
 const runtime={id:'dsh'},catalog=permissionCatalog(runtime);assert.equal(catalog.default,'ask');assert.equal(catalog.current,'ask');assert.deepEqual(catalog.modes.map(m=>[m.id,m.label,m.native.preset]),[['readonly','仅可查看','read-only'],['ask','工作区内修改','workspace-write'],['auto-review','自动审查','auto'],['auto','完全权限','danger-full-access']]);
 const store={state:{preferences:{runtimes:{}}},mutate:async fn=>fn(store.state)};
 for(const id of Object.keys(DSH_PERMISSION_PRESETS)){assert.equal(validatePermissionMode(runtime,id),id);await saveRuntimePermission(store,[runtime],'dsh',id);assert.equal(runtimePermissionView(runtime,store.state.preferences.runtimes.dsh).permissions.current,id);}
});
function adapter(mode,{command='success',current=DSH_PERMISSION_PRESETS[mode],resume=false}={}){
 const calls=[],events=[],host={ready:async()=>{},configure:async()=> 'provider',rpc:async(method,args)=>{calls.push({method,args});if(method==='session/create')return {sessionId:'native'};if(method==='commands/execute')return {result:{kind:command,text:'fixture result'}};if(method==='session/list')return {items:[{sessionId:'native',projections:{asOfSeq:10,values:{permissions:{currentValue:current}}}}]};return {};},follow:async()=>()=>{}};
 const a=new DshAdapter({host,permissionMode:mode,session:{title:'test',nativeId:resume?'native':null,selection:{}},model:{},variant:{id:'model',efforts:[]},endpoint:{},project:{path:'fixture'},saveNative:async()=>{},emit:async e=>events.push(e)});return {a,calls,events};
}
for(const [mode,preset]of Object.entries(DSH_PERMISSION_PRESETS))test(`DSH applies ${mode} before events on new and resumed sessions`,async()=>{
 for(const resume of [false,true]){const {a,calls}=adapter(mode,{resume});await a.start();const call=calls.find(c=>c.method==='commands/execute');assert.deepEqual(call.args,{agentId:'native',line:'/permission '+preset,submittedAttachments:[]});assert.ok(calls.findIndex(c=>c.method==='session/selectModel')<calls.indexOf(call));await a.close();}
});
test('DSH null inherits, unavailable command/mismatched preset fail before prompt, missing projection is explicit',async()=>{
 const inherited=adapter(null);await inherited.a.start();assert.equal(inherited.calls.some(c=>c.method==='commands/execute'),false);
 for(const options of [{command:'error'},{current:'danger-full-access'}]){const f=adapter('readonly',options);await assert.rejects(f.a.prompt('never sent'),/仅可查看.*已停止本轮/);assert.equal(f.calls.some(c=>c.method==='session/prompt'),false);}
 const f=adapter('auto-review',{current:null});await f.a.start();assert.ok(f.events.some(e=>e.type==='notice'&&/未能核实/.test(e.text)));
});
test('DSH private profile creates three bundles, preserves existing config, and does not add unsupported auto review',async()=>{
 const home=await root(),dir=join(home,'profiles/web'),file=join(dir,'package.json');await ensureDshProfile(home,{hasAutoReview:true});const pkg=JSON.parse(await readFile(file,'utf8'));assert.equal(pkg.name,'dsh-profile-web');assert.equal(pkg.private,true);assert.deepEqual(pkg.dependencies,{});assert.deepEqual(pkg.dsh.profile.bundles,['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app',bundle]);assert.equal(await readFile(join(dir,'cordis.yml'),'utf8'),'[]\n');
 const existing={custom:'keep',dsh:{other:'keep',profile:{another:42,bundles:['existing']}}};await writeFile(file,JSON.stringify(existing));await writeFile(join(dir,'cordis.patch.yml'),'# keep\n[]\n');await ensureDshProfile(home,{hasAutoReview:true});assert.deepEqual(JSON.parse(await readFile(file,'utf8')),{...existing,dsh:{...existing.dsh,profile:{...existing.dsh.profile,bundles:['existing',bundle]}}});const bytes=await readFile(file);await ensureDshProfile(home,{hasAutoReview:true});assert.deepEqual(await readFile(file),bytes);assert.equal(await readFile(join(dir,'cordis.patch.yml'),'utf8'),'# keep\n[]\n');
 const oldHome=await root();await ensureDshProfile(oldHome,{hasAutoReview:false});assert.equal(JSON.parse(await readFile(join(oldHome,'profiles/web/package.json'),'utf8')).dsh.profile.bundles.includes(bundle),false);
});
test('DSH package existence checks read the external ASAR index through original-fs in Electron',async()=>{
 const tree=Buffer.from(JSON.stringify({files:{dsh:{files:{node_modules:{files:{'@deepseek-ai':{files:{'dsh-experimental-auto-review':{files:{'package.json':{size:2,offset:'0'}}}}}}}}}}})),header=Buffer.alloc(16);header.writeUInt32LE(tree.length,12);const archive=Buffer.concat([header,tree]);let closed=false;
 const originalFs={promises:{open:async path=>{assert.equal(path,'fixture.asar');return {read:async(buffer,offset,length,position)=>({bytesRead:archive.copy(buffer,offset,position,position+length)}),close:async()=>{closed=true;}};}}};
 const options={electronVersion:'fixture',loadOriginalFs:async()=>originalFs,nodeOpen:()=>assert.fail('Electron patched fs must not read external archive')};assert.equal(await externalAsarHasFile('fixture.asar',`dsh/node_modules/${bundle}/package.json`,options),true);assert.equal(closed,true);assert.equal(await externalAsarHasFile('fixture.asar','dsh/node_modules/missing/package.json',options),false);
});
