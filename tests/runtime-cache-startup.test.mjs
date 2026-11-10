import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {RuntimeCache,RUNTIME_CACHE_SCHEMA} from '../app/services/runtime-cache.mjs';
import {hydrateRuntimePermissionCache,withRuntimePermissions} from '../app/services/runtime-permissions.mjs';
import {hydrateRuntimeMediaCache,inspectRuntimeMedia} from '../app/services/media-capabilities.mjs';
import {BootState} from '../app/services/boot-state.mjs';
import {workbenchSnapshot} from '../app/services/workbench-snapshot.mjs';
import {Environments} from '../app/services/environments.mjs';
import {runtimePlaceholders} from '../app/services/runtime-paths.mjs';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {AttachmentCapabilities,NativeMediaCatalog} from '../app/services/attachment-capabilities.mjs';

async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/runtime-cache-startup-'));}

test('runtime cache persists successful probes, hydrates both memory caches, and invalidates version/schema',async()=>{
 const userData=await root(),executable=join(userData,'fixture-runtime.mjs');await writeFile(executable,'fixture');const info=await stat(executable),key=JSON.stringify(['kimi',executable,info.size,info.mtimeMs]),runtime={id:'kimi',name:'Kimi',status:'ready',installed:true,executable};
 const permissions={version:'3.2.1',modes:{currentModeId:null,availableModes:[]}},media={image:true,audio:false,video:false,source:'fixture'};hydrateRuntimePermissionCache({[key]:permissions});hydrateRuntimeMediaCache({[key]:media});
 const cache=new RuntimeCache({userData,appVersion:'0.1.18',now:()=>Date.parse('2026-11-05T00:00:00Z')});await cache.save([{...runtime,permissions,media}]);const saved=JSON.parse(await readFile(join(userData,'runtime-cache.json'),'utf8'));assert.equal(saved.schema,RUNTIME_CACHE_SCHEMA);assert.equal(saved.appVersion,'0.1.18');assert.deepEqual(saved.probes[key],{permissions,media});assert.equal(saved.runtimes[0].media.image,true);assert.ok((await readdir(userData)).every(name=>name==='runtime-cache.json'||!name.endsWith('.tmp')));
 const loaded=new RuntimeCache({userData,appVersion:'0.1.18'});assert.equal((await loaded.load()).length,1);const withPermissions=await withRuntimePermissions([runtime],{},async()=>assert.fail('hydrated permission probe must not rerun'));assert.equal(withPermissions[0].permissions.observed.version,'3.2.1');assert.equal((await inspectRuntimeMedia(runtime)).source,'fixture');
 const stale=new RuntimeCache({userData,appVersion:'0.1.17'});assert.deepEqual(await stale.load(),[]);let probes=0;await withRuntimePermissions([runtime],{},async()=>{probes++;return permissions;});assert.equal(probes,1);
 await writeFile(join(userData,'runtime-cache.json'),JSON.stringify({schema:2,appVersion:'0.1.18',runtimes:[runtime],probes:{}}));assert.deepEqual(await loaded.load(),[]);
});

test('failed probe results are not persisted as durable capabilities',async()=>{
 const userData=await root(),key='fixture-key';hydrateRuntimePermissionCache({[key]:{unavailable:true,error:'fixture failed'}});hydrateRuntimeMediaCache({[key]:{image:false,audio:false,video:false,reason:'运行环境媒体能力检测失败：fixture'}});const cache=new RuntimeCache({userData,appVersion:'0.1.18'});await cache.save([]);const saved=JSON.parse(await readFile(join(userData,'runtime-cache.json'),'utf8'));assert.deepEqual(saved.probes,{});
});

test('BootState waits for selected phases, resolves completed waits immediately, and never rejects',async()=>{
 const boot=new BootState();assert.deepEqual(boot.state(),{environments:'checking',services:'checking'});let finished=false;const waiting=boot.ready('environments','services').then(()=>{finished=true;});await new Promise(resolve=>setImmediate(resolve));assert.equal(finished,false);boot.done('environments');await new Promise(resolve=>setImmediate(resolve));assert.equal(finished,false);boot.done('services');await waiting;assert.equal(finished,true);assert.deepEqual(boot.state(),{environments:'ready',services:'ready'});await boot.ready('environments','services');boot.done('services');await boot.ready('unknown-phase');
});

test('workbench snapshot is safe before startup with placeholders or cached runtime rows',async t=>{
 const cached=runtimePlaceholders().map(row=>({...row,status:'ready',installed:true,executable:'cached-'+row.id}));
 for(const cachedRows of [[],cached]){const userData=await root(),store=await new Store(join(userData,'workspace')).open();await store.mutate(state=>{state.sessions=[{id:'session',runtimeId:'kimi',selection:{modelKey:'native'},status:'idle',archived:false,mediaAttachments:[]}];});const environments=new Environments({store,userData,runtimeCache:{load:async()=>cachedRows,save:async()=>{}}}),runtimes=await environments.restore(),sessions=new Sessions(store,{},null,runtimes,{runtimeReady:id=>environments.busyReason(id)??environments.checkingReason(id)}),attachmentCapabilityService=new AttachmentCapabilities({runtimes:()=>runtimes,sessions:()=>sessions,providers:()=>({}),cwd:()=>store.root,catalog:new NativeMediaCatalog()}),boot=new BootState();t.after(async()=>{await sessions.close();await store.close();});
  const snapshot=await workbenchSnapshot({store,sourceComponents:{snapshot:()=>[]},modelServices:{snapshot:async()=>[]},environments,runtimes,attachmentCapabilityService,boot,appVersion:'0.1.18'});assert.deepEqual(snapshot.startup,{environments:'checking',services:'checking'});assert.equal(snapshot.runtimes.length,5);assert.equal(snapshot.environments.length,5);assert.ok(snapshot.environments.every(row=>row.checking&&Object.values(row.actions).every(value=>value===false)));assert.equal(snapshot.runtimes[1].status,cachedRows.length?'ready':'checking');assert.equal(snapshot.sessions[0].attachments.image.allowed,false);assert.match(snapshot.sessions[0].attachments.image.reason,/正在检测运行环境/);assert.ok(snapshot.sessions[0].permissions);assert.equal(snapshot.app.version,'0.1.18');
 }
});
