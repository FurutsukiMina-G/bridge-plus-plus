import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {inspectEnvironments} from '../app/services/environment-discovery.mjs';
import {findManagedKimi,shouldRefreshCodex} from '../app/services/runtime-paths.mjs';
import {Environments} from '../app/services/environments.mjs';
import {Store} from '../app/core/store.mjs';
import {DAY_MS,NPM_REGISTRIES} from '../app/services/environment-utils.mjs';

async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/environment-startup-'));}
const rows=()=>['dsh','kimi','codex','claude','antigravity'].map(id=>({id,name:id,status:id==='kimi'?'ready':'missing',installed:id==='kimi',executable:id==='kimi'?'bundled.mjs':null,kind:id==='kimi'?'bundled':'system',version:id==='kimi'?'2.3.1':null,warning:null}));
async function storeAt(userData){return new Store(join(userData,'workspace')).open();}
async function managedFixture(userData){const dir=join(userData,'environments/kimi-code/3.2.1'),pkg=join(dir,'node_modules/@moonshot-ai/kimi-code');await mkdir(join(pkg,'dist'),{recursive:true});const executable=join(pkg,'dist/main.mjs'),packagePath=join(pkg,'package.json'),receiptPath=join(dir,'bridgepp-install.json');await writeFile(executable,'// first');await writeFile(packagePath,JSON.stringify({name:'@moonshot-ai/kimi-code',version:'3.2.1'}));await writeFile(receiptPath,JSON.stringify({verified:true,version:'3.2.1'}));return {executable,packagePath,receiptPath};}

test('Codex --version runs before PowerShell metadata and failure alone triggers the fallback',async()=>{
 const runtime={id:'codex',name:'Codex',installed:true,status:'ready',executable:'fixture-codex.exe'},calls=[];
 const detected=await inspectEnvironments({}, {discover:async()=>[runtime],execute:async(command,args)=>{calls.push(['native',command,args]);return {code:0,stdout:'codex-cli 1.2.3'};},fileVersion:async()=>{calls.push(['powershell']);return '9.9.9';}});
 assert.equal(detected[0].version,'1.2.3');assert.deepEqual(calls,[['native','fixture-codex.exe',['--version']]]);
 const fallback=await inspectEnvironments({}, {discover:async()=>[runtime],execute:async()=>({code:1,stdout:''}),fileVersion:async()=>{calls.push(['fallback']);return '1.2.4';}});assert.equal(fallback[0].version,'1.2.4');assert.ok(calls.some(call=>call[0]==='fallback'));
});

test('managed Kimi verification has a 20 second timeout and distinct timeout/failure warnings',async()=>{
 let verify;const calls=[];await inspectEnvironments({}, {discover:async(_preferences,options)=>{verify=options.verifyManagedKimi;return [];},execute:async(...args)=>{calls.push(args);throw Object.assign(new Error('fixture timeout'),{code:'ETIMEDOUT'});}});
 const timeout=await verify('fixture-main.mjs','3.2.1');assert.equal(timeout.ok,true);assert.equal(timeout.warning,'托管 Kimi 校验超时，本次未能核实');assert.equal(calls[0][2].timeoutMs,20000);
 const failed=await inspectEnvironments({}, {discover:async(_preferences,options)=>{verify=options.verifyManagedKimi;return [];},execute:async()=>({code:7,stdout:''})}).then(()=>verify('fixture-main.mjs','3.2.1'));assert.equal(failed.ok,false);assert.match(failed.warning,/已改用内置版本：进程退出码 7/);
 const mismatch=await inspectEnvironments({}, {discover:async(_preferences,options)=>{verify=options.verifyManagedKimi;return [];},execute:async()=>({code:0,stdout:'Kimi Code 3.2.0'})}).then(()=>verify('fixture-main.mjs','3.2.1'));assert.equal(mismatch.ok,false);assert.match(mismatch.warning,/版本不一致/);
});

test('managed Kimi verifiedFiles skips unchanged probes, revalidates changes, and preserves timeout/failure semantics',async()=>{
 const userData=await root(),fixture=await managedFixture(userData);let probes=0;
 const first=await findManagedKimi(userData,{verify:async()=>{probes++;return {ok:true,warning:null};}});assert.equal(first.executable,fixture.executable);assert.equal(probes,1);const receipt=JSON.parse(await readFile(fixture.receiptPath,'utf8'));assert.equal(receipt.verifiedFiles.main.size,(await readFile(fixture.executable)).length);
 await findManagedKimi(userData,{verify:async()=>assert.fail('unchanged managed files must not launch a process')});assert.equal(probes,1);
 await writeFile(fixture.executable,'// changed and longer');const timeout=await findManagedKimi(userData,{verify:async()=>{probes++;return {ok:true,warning:'托管 Kimi 校验超时，本次未能核实'};}});assert.equal(timeout.executable,fixture.executable);assert.match(timeout.warning,/超时/);assert.deepEqual(JSON.parse(await readFile(fixture.receiptPath,'utf8')).verifiedFiles,receipt.verifiedFiles);
 await writeFile(fixture.executable,'// another change');const failed=await findManagedKimi(userData,{verify:async()=>{probes++;return {ok:false,warning:'托管 Kimi 校验未通过，已改用内置版本：fixture'};}});assert.equal(failed.executable,null);assert.match(failed.warning,/已改用内置版本/);assert.equal(probes,3);
});

test('Environments scans use cached registry rows by default and persist explicit registry refreshes',async t=>{
 const userData=await root(),store=await storeAt(userData);t.after(()=>store.close());await store.mutate(state=>{(state.preferences.environments??={}).dsh={registry:{rows:[{location:'cached'}],checkedAt:new Date().toISOString()}};});let queries=0;const seen=[],manager=new Environments({store,userData,inspect:async(_preferences,options)=>{seen.push(options.registryRows);return rows();},registry:async()=>{queries++;return [{location:'fresh'}];}});
 await manager.scan();assert.equal(queries,0);assert.deepEqual(seen[0],[{location:'cached'}]);await manager.scan({registry:true});assert.equal(queries,1);assert.deepEqual(seen[1],[{location:'fresh'}]);assert.deepEqual(store.state.preferences.environments.dsh.registry.rows,[{location:'fresh'}]);assert.ok(Date.parse(store.state.preferences.environments.dsh.registry.checkedAt));
});

test('startup registry refresh is background, rescans changed rows, and fresh installed DSH skips it',async t=>{
 const userData=await root(),store=await storeAt(userData);t.after(()=>store.close());let release,queries=0,refreshes=0;const gate=new Promise(resolve=>release=resolve),manager=new Environments({store,userData,npmFinder:async()=>null,inspect:async()=>rows(),registry:async()=>{queries++;await gate;return [{location:'background'}];},onRefresh:async()=>{refreshes++;}});
 await manager.init();assert.equal(queries,1);assert.equal(refreshes,0);release();await manager.registryBackground;assert.equal(refreshes,1);assert.deepEqual(store.state.preferences.environments.dsh.registry.rows,[{location:'background'}]);await manager.close();
 const fresh=await storeAt(await root());t.after(()=>fresh.close());await fresh.mutate(state=>{(state.preferences.environments??={}).dsh={registry:{rows:[],checkedAt:new Date().toISOString()}};});let unexpected=0;const installed=rows().map(row=>row.id==='dsh'?{...row,installed:true,status:'ready',executable:'fixture-dsh'}:row),managerFresh=new Environments({store:fresh,userData,npmFinder:async()=>null,inspect:async()=>installed,registry:async()=>{unexpected++;return [];}});await managerFresh.init();await managerFresh.refreshRegistry();assert.equal(unexpected,0);await managerFresh.close();
});

test('registry cache older than seven days is refreshed even when DSH is installed',async t=>{
 const userData=await root(),store=await storeAt(userData),now=Date.parse('2026-11-05T00:00:00Z');t.after(()=>store.close());await store.mutate(state=>{(state.preferences.environments??={}).dsh={registry:{rows:[],checkedAt:new Date(now-8*DAY_MS).toISOString()}};});let queries=0;const installed=rows().map(row=>row.id==='dsh'?{...row,installed:true,status:'ready',executable:'fixture-dsh'}:row),manager=new Environments({store,userData,now:()=>now,npmFinder:async()=>null,inspect:async()=>installed,registry:async()=>{queries++;return [];}});await manager.init();await manager.refreshRegistry();assert.equal(queries,1);await manager.close();
});

test('restore derives checking from manager state, disables every action, and never persists the field',async t=>{
 for(const cached of [[],rows().map(row=>({...row,checking:true}))]){const userData=await root(),store=await storeAt(userData);t.after(()=>store.close());let saved;const manager=new Environments({store,userData,runtimeCache:{load:async()=>cached,save:async rows=>{saved=rows;}}});const restored=await manager.restore();assert.equal(restored.length,5);assert.ok(restored.every(row=>row.checking===undefined));assert.equal(manager.checkingReason('kimi'),'正在检测运行环境，请稍候');for(const row of manager.snapshot()){assert.equal(row.checking,true);assert.ok(Object.values(row.actions).every(value=>value===false));}assert.equal(manager.snapshot()[0].status,cached.length?'missing':'checking');const ready=manager.finishCheck(restored);assert.ok(ready.every(row=>row.checking===undefined));assert.ok(manager.runtimeViews(ready).every(row=>row.checking===false));assert.equal(manager.checkingReason('kimi'),null);await manager.saveCache(ready);assert.ok(saved.every(row=>row.checking===undefined));}
});

test('registry query failure keeps cached rows and never blocks an explicit rescan',async t=>{
 const userData=await root(),store=await storeAt(userData);t.after(()=>store.close());const registry={rows:[{location:'cached'}],checkedAt:'2026-11-01T00:00:00.000Z'};await store.mutate(state=>{(state.preferences.environments??={}).dsh={registry};});let seen;const manager=new Environments({store,userData,inspect:async(_preferences,options)=>{seen=options.registryRows;return rows();},registry:async()=>{throw Object.assign(new Error('fixture group policy/timeout'),{code:'ETIMEDOUT'});}});await manager.scan({registry:true});assert.deepEqual(seen,registry.rows);assert.deepEqual(store.state.preferences.environments.dsh.registry,registry);
});

test('update checks scan only for all-runtimes, Codex and Antigravity; silent checks never scan or query registry',async t=>{
 const userData=await root(),store=await storeAt(userData);t.after(()=>store.close());let scans=0,queries=0,updates=0;const manager=new Environments({store,userData,inspect:async()=>{scans++;return rows();},registry:async()=>{queries++;return [];},fetchImpl:async()=>assert.fail('fixture checkData is injected')});manager.checkData=async()=>{updates++;return {version:'1.0.0'};};await manager.check('kimi');await manager.check('kimi',{silent:true});assert.equal(scans,0);assert.equal(queries,0);await manager.check('codex');assert.equal(scans,1);assert.equal(queries,1);await manager.check(undefined);assert.equal(scans,2);assert.equal(queries,2);assert.equal(updates,5);
});

test('unchanged background registry rows still refresh checkedAt without another scan',async t=>{
 const userData=await root(),store=await storeAt(userData),now=Date.parse('2026-11-05T00:00:00Z');t.after(()=>store.close());await store.mutate(state=>{(state.preferences.environments??={}).dsh={registry:{rows:[],checkedAt:new Date(now-8*DAY_MS).toISOString()}};});let scans=0;const manager=new Environments({store,userData,now:()=>now,inspect:async()=>{scans++;return rows();},registry:async()=>[]});manager.runtimes=rows();await manager.refreshRegistry();assert.equal(scans,0);assert.equal(store.state.preferences.environments.dsh.registry.checkedAt,new Date(now).toISOString());
});

test('late registry refresh cannot reintroduce checking after startup completes',async t=>{
 const userData=await root(),store=await storeAt(userData);t.after(()=>store.close());const manager=new Environments({store,userData,runtimeCache:{load:async()=>rows(),save:async()=>{}}});await manager.restore();manager.finishCheck();manager.runtimes=rows();assert.ok(manager.runtimeViews().every(row=>row.checking===false));assert.equal(manager.checkingReason('kimi'),null);assert.ok(manager.snapshot().every(row=>row.checking===false));
});

test('Codex native models never refresh a user-selected path and only refresh an automatic changed path',()=>{
 const runtime={id:'codex',executable:'automatic-current'};assert.equal(shouldRefreshCodex({codex:{executable:'custom-codex'}},runtime,'automatic-other'),false);assert.equal(shouldRefreshCodex({},runtime,'automatic-current'),false);assert.equal(shouldRefreshCodex({},runtime,'automatic-other'),true);
});

test('concurrent scan requests are serialized instead of running environment detection twice',async t=>{
 const userData=await root(),store=await storeAt(userData);t.after(()=>store.close());let release,active=0,maximum=0,queries=0;const gate=new Promise(resolve=>release=resolve),manager=new Environments({store,userData,inspect:async()=>{active++;maximum=Math.max(maximum,active);await gate;active--;return rows();},registry:async()=>{queries++;return [];}});const first=manager.scan(),second=manager.scan({registry:true});await new Promise(resolve=>setImmediate(resolve));assert.equal(active,1);release();await Promise.all([first,second]);assert.equal(maximum,1);assert.equal(queries,1);
});

test('Kimi registry configuration accepts only known origins',async t=>{
 const userData=await root(),store=await storeAt(userData);t.after(()=>store.close());const manager=new Environments({store,userData});await assert.rejects(manager.configure('kimi',{registries:['https://untrusted.invalid/npm']}),/允许列表/);await manager.configure('kimi',{registries:[NPM_REGISTRIES[0]]});assert.deepEqual(store.state.preferences.environments.kimi.registries.length,1);
});

test('DSH installer signature requires Valid status and the observed official publisher',async t=>{
 const userData=await root(),store=await storeAt(userData);t.after(()=>store.close());const calls=[],manager=new Environments({store,userData,execute:async(command,args)=>{calls.push({command,args});return {code:0,stdout:JSON.stringify({status:calls.length===1?'Invalid':'Valid',subject:calls.length===1?'Untrusted':'Hangzhou DeepSeek Artificial Intelligence Co., Ltd.'})};}});await assert.rejects(manager.verifyDshInstaller('D:\\fixture‘setup.exe'),/官方有效签名/);await manager.verifyDshInstaller('D:\\fixture‘setup.exe');assert.equal(calls.length,2);assert.ok(calls.every(call=>call.command==='powershell.exe'&&call.args.at(-1).includes('Get-AuthenticodeSignature')));assert.ok(calls[0].args.at(-1).includes('‘‘'));
});
