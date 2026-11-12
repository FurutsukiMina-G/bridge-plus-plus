import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,readdir,open} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {Environments} from '../app/services/environments.mjs';
import {parseDshFeed,verifyDownload,downloadDsh,DAY_MS} from '../app/services/environment-utils.mjs';
import {inspectEnvironments} from '../app/services/environment-discovery.mjs';
import {hideQaRuntimes,findManagedKimi,discoverRuntimes} from '../app/services/runtime-paths.mjs';
import {withRuntimePermissions} from '../app/services/runtime-permissions.mjs';
import {withRuntimeMedia} from '../app/services/media-capabilities.mjs';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {copyRuntimeFile,copyRuntimeDirectory} from '../scripts/runtime-copy.mjs';
const bytes=Buffer.from('fixture installer'),hash=createHash('sha512').update(bytes).digest('base64');
const feed=`version: 3.2.1\nfiles:\n  - url: setup.exe\n    sha512: ${hash}\n    size: ${bytes.length}\n`;
const rows=()=>['dsh','kimi','codex','claude','antigravity'].map(id=>({id,name:id,status:id==='kimi'?'ready':'missing',installed:id==='kimi',executable:id==='kimi'?'bundled.mjs':null,kind:id==='kimi'?'bundled':'system',version:id==='kimi'?'2.3.1':null}));
async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/environment-'));}
async function fixture(t,options={}){const userData=await root(),store=await new Store(join(userData,'workspace')).open();const manager=await new Environments({store,userData,node:{command:'fixture-node',args:[],env:{}},inspect:async()=>rows(),npmFinder:async()=>({cli:'fixture-npm'}),registry:async()=>[],isDshRunning:async()=>false,execute:async()=>assert.fail('unexpected native process'),fetchImpl:async url=>new Response(url.endsWith('.yml')?feed:url.endsWith('.exe')?bytes:JSON.stringify({name:'@moonshot-ai/kimi-code',version:'3.2.1'})),...options}).init();t.after(async()=>{await manager.close();await store.close();});return {manager,store,userData};}
async function kimiPackage(dir,version='3.2.1'){const path=join(dir,'node_modules/@moonshot-ai/kimi-code');await mkdir(join(path,'dist'),{recursive:true});await writeFile(join(path,'package.json'),JSON.stringify({name:'@moonshot-ai/kimi-code',version}));await writeFile(join(path,'dist/main.mjs'),'// fixture only');return join(path,'dist/main.mjs');}
test('DSH fixture feed accepts files and legacy path; rejects invalid YAML/hash/size and tampered bytes',()=>{
 const expected=parseDshFeed(feed,'https://fixture.invalid/feed/');assert.equal(expected.url,'https://fixture.invalid/feed/setup.exe');verifyDownload(bytes,expected);
 assert.equal(parseDshFeed(`version: 3.2.1\npath: a.exe\nsha512: ${hash}\nsize: ${bytes.length}`,'https://fixture.invalid/').version,'3.2.1');
 for(const text of ['[invalid',feed.replace(hash,'bad'),feed.replace('size: '+bytes.length,'size: -1')])assert.throws(()=>parseDshFeed(text,'https://fixture.invalid/'));
 assert.throws(()=>verifyDownload(Buffer.from('x'),expected),/大小/);assert.throws(()=>verifyDownload(Buffer.alloc(bytes.length),expected),/sha512/);
});
test('DSH download hash failure and cancellation remove partial installers',async()=>{
 const dir=await root(),expected=parseDshFeed(feed,'https://fixture.invalid/');
 await assert.rejects(downloadDsh(async()=>new Response(Buffer.alloc(bytes.length)),expected.url,dir,expected),/sha512/);assert.deepEqual(await readdir(dir),[]);
 const controller=new AbortController();await assert.rejects(downloadDsh(async()=>new Response(bytes),expected.url,dir,expected,{signal:controller.signal,onProgress:()=>controller.abort()}));assert.deepEqual(await readdir(dir),[]);
});
test('download cancellation through the manager emits cancelled and never launches installer',async t=>{let now=0;const {manager,userData}=await fixture(t,{now:()=>now,fetchImpl:async url=>{if(url.endsWith('.exe')){now=300;return new Response(bytes);}return new Response(feed);}});let cancel;manager.on('event',event=>{if(event.state==='downloading'&&event.received>0&&!cancel)cancel=manager.cancel('dsh');});await manager.install('dsh');await assert.rejects(manager.jobs.get('dsh').promise);await cancel;assert.equal(manager.jobs.get('dsh').state,'cancelled');assert.deepEqual(await readdir(join(userData,'downloads')),[]);});
test('DSH running check refuses install before network; installer failures are explicit and download is cleaned',async t=>{
 const a=await fixture(t,{isDshRunning:async()=>true,fetchImpl:async()=>assert.fail('must not download')});await a.manager.install('dsh');await assert.rejects(a.manager.jobs.get('dsh').promise,/DSH 正在运行/);
 const calls=[],b=await fixture(t,{execute:async(command,args,options)=>{calls.push({command,args,options});return command==='powershell.exe'?{code:0,stdout:JSON.stringify({status:'Valid',subject:'Hangzhou DeepSeek Artificial Intelligence Co., Ltd.'})}:{code:7};}});await b.manager.install('dsh');await assert.rejects(b.manager.jobs.get('dsh').promise,/退出码：7/);assert.equal(calls.length,2);assert.deepEqual(calls[1].args,[]);assert.equal(calls[1].options.interactive,true);assert.equal(calls[1].options.timeoutMs,0);assert.deepEqual(await readdir(join(b.userData,'downloads')),[]);
});
test('DSH successful fixture install rescans, emits progress, and per-environment lock prevents duplicate work',async t=>{
 let release;const gate=new Promise(r=>release=r),events=[];let scans=0;const {manager}=await fixture(t,{inspect:async()=>{scans++;return rows();},execute:async command=>{if(command==='powershell.exe')return {code:0,stdout:JSON.stringify({status:'Valid',subject:'Hangzhou DeepSeek Artificial Intelligence Co., Ltd.'})};await gate;return {code:0};}});manager.on('event',e=>events.push(e));await manager.install('dsh');await assert.rejects(manager.install('dsh'),/已有任务/);release();await manager.jobs.get('dsh').promise;assert.ok(scans>=2);assert.ok(events.some(e=>e.state==='verifying'));assert.ok(events.some(e=>e.state==='installing'));assert.equal(events.at(-1).state,'done');assert.ok(events.every(e=>e.type==='environment-job'&&e.id==='dsh'));
});
test('Kimi verified managed version activates; failed version leaves previous choice and bundled fallback intact',async t=>{
 const good=await fixture(t,{kimiInstaller:async({directory})=>{await kimiPackage(directory);return {code:0};},execute:async()=>({code:0,stdout:'Kimi Code 3.2.1'})});await good.manager.install('kimi','update');await good.manager.jobs.get('kimi').promise;
 const chosen=good.store.state.preferences.runtimes.kimi.executable;assert.ok(chosen.startsWith(join(good.userData,'environments/kimi-code/3.2.1')));assert.equal((await findManagedKimi(good.userData,{verify:async()=>true})).executable,chosen);
 await writeFile(chosen,'// changed managed runtime');const detected=await discoverRuntimes(good.store.state.preferences.runtimes,{userData:good.userData,verifyManagedKimi:async()=>false,env:{AWB_HIDE_RUNTIMES:'codex,antigravity'}});assert.equal(detected.find(r=>r.id==='kimi').kind,'bundled');
 const bad=await fixture(t,{kimiInstaller:async({directory})=>{await kimiPackage(directory);return {code:0};},execute:async()=>({code:0,stdout:'2.3.1'})});await bad.store.mutate(s=>s.preferences.runtimes.kimi={executable:'previous-fixture.mjs'});await bad.manager.install('kimi','update');await assert.rejects(bad.manager.jobs.get('kimi').promise,/--version 验证失败/);assert.equal(bad.store.state.preferences.runtimes.kimi.executable,'previous-fixture.mjs');assert.deepEqual(await readdir(join(bad.userData,'environments/kimi-code')),[]);
});
test('missing npm disables Kimi install/update and keeps bundled runtime ready',async t=>{const {manager}=await fixture(t,{npmFinder:async()=>null});const view=manager.snapshot().find(r=>r.id==='kimi');assert.equal(view.status,'ready');assert.equal(view.actions.update,false);await manager.install('kimi');await assert.rejects(manager.jobs.get('kimi').promise,/捆绑 npm/);});
test('a Kimi activation failing during the final rename rolls the previous managed directory back instead of losing it',async t=>{
 if(process.platform!=='win32'){t.skip('the locked-rename reproduction relies on Windows sharing semantics');return;}
 const userData=await root(),store=await new Store(join(userData,'workspace')).open();
 const final=join(userData,'environments/kimi-code','3.2.1');await kimiPackage(final);await writeFile(join(final,'node_modules/@moonshot-ai/kimi-code/dist/main.mjs'),'// old managed version');
 let handle;
 const manager=await new Environments({store,userData,node:{command:'fixture-node',args:[],env:{}},inspect:async()=>rows(),npmFinder:async()=>({cli:'fixture-npm'}),registry:async()=>[],isDshRunning:async()=>false,
  execute:async(command,args)=>({code:0,stdout:String(args).includes(final)?'Kimi Code 2.9.9':'Kimi Code 3.2.1'}),
  kimiInstaller:async({directory})=>{await kimiPackage(directory);handle=await open(join(directory,'node_modules/@moonshot-ai/kimi-code/dist/main.mjs'),'r');return {code:0};},
  fetchImpl:async url=>new Response(url.endsWith('.yml')?feed:JSON.stringify({name:'@moonshot-ai/kimi-code',version:'3.2.1'}))}).init();
 t.after(async()=>{await handle?.close();await manager.close();await store.close();});
 await manager.install('kimi','update');await assert.rejects(manager.jobs.get('kimi').promise,/rename/);
 assert.equal(await readFile(join(final,'node_modules/@moonshot-ai/kimi-code/dist/main.mjs'),'utf8'),'// old managed version');
 assert.ok(store.state.preferences.runtimes.kimi?.executable===undefined||String(store.state.preferences.runtimes.kimi.executable).startsWith(final));
 const left=await readdir(join(userData,'environments/kimi-code'));assert.ok(left.includes('3.2.1'));assert.equal(left.filter(name=>name.includes('-old-')).length,0);
});
test('failed Kimi npm install reports a bounded redacted stderr tail in job events and environment service log',async t=>{
 const {manager,store,userData}=await fixture(t,{kimiInstaller:async()=>({code:1,stderr:'irrelevant head '.repeat(500)+'\napi_key="fixture-secret" Bearer fixture-bearer https://user:fixture-password@registry.invalid/p?signature=fixture-signed\nnpm ERR double-loading config as global, previously loaded as user'})});await store.mutate(s=>s.preferences.runtimes.kimi={executable:'previous.mjs'});await manager.install('kimi','update');await assert.rejects(manager.jobs.get('kimi').promise,/double-loading/);const message=manager.snapshot().find(r=>r.id==='kimi').job.message,log=await readFile(join(userData,'environments/logs/kimi-install.log'),'utf8');assert.match(message,/退出码：1/);assert.ok(message.length<2000);assert.match(log,/double-loading/);for(const secret of ['fixture-secret','fixture-bearer','fixture-password','fixture-signed']){assert.equal(message.includes(secret),false);assert.equal(log.includes(secret),false);}assert.equal(store.state.preferences.runtimes.kimi.executable,'previous.mjs');
});
test('Kimi registry fallback, silent checks and failed attempts obey the 24-hour throttle',async t=>{
 let now=Date.parse('2026-11-03T10:00:00Z'),calls=0;const {manager,store}=await fixture(t,{now:()=>now,fetchImpl:async url=>{calls++;if(url.includes('npmmirror'))throw new Error('fixture offline');if(url.includes('npmjs'))return new Response(JSON.stringify({name:'@moonshot-ai/kimi-code',version:'3.2.1'}));throw new Error('fixture offline');}});const events=[];manager.on('event',e=>events.push(e));
 await manager.backgroundChecks();await Promise.allSettled([...manager.jobs.values()].map(j=>j.promise));const first=calls;assert.equal(store.state.preferences.environments.kimi.latest.version,'3.2.1');assert.ok(store.state.preferences.environments.dsh.checkError);assert.deepEqual(events,[]);await manager.backgroundChecks();assert.equal(calls,first);now+=DAY_MS;await manager.backgroundChecks();await Promise.allSettled([...manager.jobs.values()].map(j=>j.promise));assert.ok(calls>first);
});
test('missing runtimes quietly skip startup probes; registry discovery and PE version take priority',async()=>{
 const dir=await root();await mkdir(join(dir,'resources'));await writeFile(join(dir,'resources/app.asar'),'fixture');await writeFile(join(dir,'resources/app-update.yml'),'url: https://fixture.invalid/\nchannel: nightly');const registry=[{location:dir,version:'1.0.0'}];let received;
 const runtimes=await inspectEnvironments({}, {registryRows:registry,fileVersion:async()=> '3.2.1',execute:async()=>assert.fail('missing environments must not execute'),discover:async(_p,options)=>{received=options.dshRegistry;return rows().map(r=>r.id==='dsh'?{...r,status:'ready',installed:true,executable:join(dir,'DeepSeek Harness.exe')}:r.id==='kimi'?{...r,status:'missing',installed:false,executable:null}:r);}});assert.deepEqual(received,registry);assert.equal(runtimes[0].version,'3.2.1');assert.equal(runtimes[0].feed.channel,'nightly');const missing=rows().map(r=>({...r,status:'missing',installed:false,executable:null}));assert.equal((await withRuntimeMedia(await withRuntimePermissions(missing,{}))).length,5);
});
test('one ready environment permits sessions; missing create/rebind/prompt/adapter are refused before dispatch',async t=>{
 const {store}=await fixture(t);await store.mutate(s=>s.projects=[{id:'p',path:store.root,name:'Fixture'}]);const manager=new Sessions(store,{},null,rows());t.after(()=>manager.close());
await assert.rejects(manager.create({projectId:'p',runtimeId:'codex',selection:{modelKey:'native'}}),/设置 → 开发环境/);const session=await manager.create({projectId:'p',runtimeId:'kimi',selection:{modelKey:'native'}});manager.runtimes=rows().map(r=>({...r,status:'missing',installed:false}));await assert.rejects(manager.rebind(session.id,{modelKey:'native'}),/设置 → 开发环境/);await assert.rejects(manager.prompt(session.id,'fixture'),/设置 → 开发环境/);await assert.rejects(manager.adapter(session),/设置 → 开发环境/);
});
test('hide switch works in interactive source mode, is ignored in packaged mode; onboarding persists completion',async t=>{
 const env={AWB_HIDE_RUNTIMES:'codex,antigravity'},installed=rows().map(r=>({...r,status:'ready',installed:true,executable:'fixture'}));assert.equal(hideQaRuntimes(installed,env)[2].status,'missing');assert.equal(hideQaRuntimes(installed,{...env,AWB_QA:'1'},{isPackaged:true})[2].status,'ready');assert.equal(hideQaRuntimes(installed,{})[2].status,'ready');
 const {manager,store}=await fixture(t);assert.equal(manager.onboarding().show,true);await manager.completeOnboarding();assert.equal(manager.onboarding().show,false);assert.ok(Date.parse(store.state.preferences.onboarding.completedAt));
});
test('runtime build copy skips equal hashes, detects same-size changes, and explains busy files for Node and npm',async()=>{
 const dir=await root(),source=join(dir,'source'),target=join(dir,'target');await mkdir(source);await mkdir(target);await writeFile(join(source,'node.exe'),'same');await writeFile(join(target,'node.exe'),'same');const busy=async()=>{throw Object.assign(new Error('busy'),{code:'EBUSY'});};assert.equal(await copyRuntimeFile(join(source,'node.exe'),join(target,'node.exe'),{copy:busy}),false);await writeFile(join(source,'node.exe'),'diff');await assert.rejects(copyRuntimeFile(join(source,'node.exe'),join(target,'node.exe'),{copy:busy}),/先停止对外接口/);await writeFile(join(source,'node.exe'),'same');await copyRuntimeDirectory(source,target,{copy:busy});await mkdir(join(source,'npm'));await writeFile(join(source,'npm/cli.js'),'changed');await assert.rejects(copyRuntimeDirectory(source,target,{copy:busy}),/先停止对外接口/);
});
