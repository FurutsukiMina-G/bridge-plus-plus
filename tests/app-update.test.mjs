import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readdir,stat,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {AppUpdates,compareVersions,localDay} from '../app/services/app-update.mjs';
import {catalogDiff} from '../app/services/providers.mjs';

const NOW=new Date('2026-11-11T09:30:00'),hex=bytes=>createHash('sha256').update(bytes).digest('hex');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function makeStore(){await mkdir('.runtime/tests',{recursive:true});return new Store(await mkdtemp(resolve('.runtime/tests/app-update-'))).open();}
function json(value){return new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});}
function installer(bytes){return new Response(bytes,{status:200,headers:{'content-length':String(bytes.length)}});}
function assetFor(version,bytes,overrides={}){
  const {url,...rest}=overrides;
  return {name:`Bridge++-Setup-${version}.exe`,size:bytes.length,browser_download_url:url??`https://github.com/FurutsukiMina-G/bridge-plus-plus/releases/download/v${version}/Bridge++-Setup-${version}.exe`,digest:'sha256:'+hex(bytes),...rest};
}
function release(version,asset){return {tag_name:'v'+version,name:'Bridge++ '+version,published_at:'2026-11-01T00:00:00Z',html_url:'https://github.com/FurutsukiMina-G/bridge-plus-plus/releases/tag/v'+version,body:'更新说明',draft:false,prerelease:false,assets:asset?[asset]:[]};}
function updater(store,{fetch,isPackaged=false,spawn=()=>{throw new Error('unexpected spawn');},sessionsRunning=()=>false,checkTimeoutMs=2000,now=()=>NOW}={}){
  return new AppUpdates({store,userData:store.root,currentVersion:'0.1.22',fetch,spawn,now,isPackaged,sessionsRunning,checkTimeoutMs});
}

test('release versions compare by three numeric segments and local days are calendar dates',()=>{
  assert.equal(compareVersions('0.1.23','0.1.22'),1);
  assert.equal(compareVersions('0.1.22','0.1.22'),0);
  assert.equal(compareVersions('0.2.0','0.10.0'),-1);
  assert.equal(compareVersions('v0.1.23','0.1.22'),0);
  assert.equal(localDay(NOW),'2026-11-11');
});

test('a revision -rN sorts after its release and before the next one; other suffixes stay unreadable',()=>{
  assert.equal(compareVersions('0.1.23-r1','0.1.23'),1);
  assert.equal(compareVersions('0.1.23','0.1.23-r1'),-1);
  assert.equal(compareVersions('0.1.23-r2','0.1.23-r1'),1);
  assert.equal(compareVersions('0.1.23-r1','0.1.23-r1'),0);
  assert.equal(compareVersions('0.1.24','0.1.23-r9'),1);
  assert.equal(compareVersions('0.1.23-r10','0.1.23-r9'),1,'numeric, not text');
  for(const odd of ['0.1.23-beta','0.1.23-r','0.1.23r1','0.1.23-r1.1'])assert.equal(compareVersions(odd,'0.1.22'),0,odd);
});

test('an -rN release with its installer is offered over the release it revises',async()=>{
  const store=await makeStore(),bytes=Uint8Array.of(4,5,6),asset=assetFor('0.1.23-r1',bytes);
  const view=await new AppUpdates({store,userData:store.root,currentVersion:'0.1.23',fetch:async()=>json(release('0.1.23-r1',asset)),spawn:()=>{throw new Error('unexpected spawn');},now:()=>NOW,isPackaged:false,sessionsRunning:()=>false,checkTimeoutMs:2000}).check({manual:true});
  assert.equal(view.status,'available');assert.equal(view.latest.version,'0.1.23-r1');assert.equal(view.latest.tag,'v0.1.23-r1');assert.equal(view.latest.asset.name,'Bridge++-Setup-0.1.23-r1.exe');
  const store2=await makeStore();
  const same=await new AppUpdates({store:store2,userData:store2.root,currentVersion:'0.1.23-r1',fetch:async()=>json(release('0.1.23-r1',asset)),spawn:()=>{throw new Error('unexpected spawn');},now:()=>NOW,isPackaged:false,sessionsRunning:()=>false,checkTimeoutMs:2000}).check({manual:true});
  assert.equal(same.status,'latest');
});

test('a matching installer asset on a GitHub host makes the release available',async()=>{
  const store=await makeStore(),bytes=Uint8Array.of(1,2,3),asset=assetFor('0.1.23',bytes);
  const updates=updater(store,{fetch:async()=>json(release('0.1.23',asset))});
  const view=await updates.check({manual:true});
  assert.equal(view.status,'available');assert.equal(view.current,'0.1.22');assert.equal(view.error,null);
  assert.equal(view.latest.version,'0.1.23');assert.equal(view.latest.tag,'v0.1.23');
  assert.equal(view.latest.notes,'更新说明');assert.deepEqual(view.latest.asset,{name:asset.name,size:3,url:asset.browser_download_url,digest:asset.digest});
  assert.equal(view.checkedAt,NOW.toISOString());assert.equal(store.state.updates.lastCheckDay,'2026-11-11');
  assert.equal(store.state.updates.latest.asset.size,3);
});

test('assets with a different version, another host, or a foreign name are ignored',async()=>{
  const store=await makeStore(),bytes=Uint8Array.of(1);
  for(const asset of [
    assetFor('0.1.20',bytes),
    assetFor('0.1.23',bytes,{url:'https://evil.example.com/Bridge++-Setup-0.1.23.exe'}),
    assetFor('0.1.23',bytes,{name:'Bridge++-Setup-0.1.23.msi'}),
    assetFor('0.1.23',bytes,{url:'http://github.com/FurutsukiMina-G/bridge-plus-plus/x.exe'})
  ]){
    const view=await updater(store,{fetch:async()=>json(release('0.1.23',asset))}).check({manual:true});
    assert.equal(view.status,'available');assert.equal(view.latest.asset,null);
  }
});

test('a newer release without an installer stays available and drafts are skipped',async()=>{
  const store=await makeStore(),bytes=Uint8Array.of(1);
  const noAsset=await updater(store,{fetch:async()=>json(release('0.1.23',null))}).check({manual:true});
  assert.equal(noAsset.status,'available');assert.equal(noAsset.latest.asset,null);
  assert.equal(noAsset.download.status,'idle');
  const draft=await updater(store,{fetch:async()=>json({...release('0.1.24',assetFor('0.1.24',bytes)),draft:true})}).check({manual:true});
  assert.equal(draft.status,'available');assert.equal(draft.latest.version,'0.1.23');
  const prerelease=await updater(store,{fetch:async()=>json({...release('0.1.25',assetFor('0.1.25',bytes)),prerelease:true})}).check({manual:true});
  assert.equal(prerelease.latest.version,'0.1.23');
  const same=await updater(store,{fetch:async()=>json(release('0.1.22',null))}).check({manual:true});
  assert.equal(same.status,'latest');assert.equal(same.latest.version,'0.1.22');
});

test('timeouts, HTTP errors, and unusable payloads report short Chinese reasons without a checked day',async()=>{
  const store=await makeStore();
  const timeout=await updater(store,{checkTimeoutMs:20,fetch:()=>new Promise(()=>{})}).check({manual:true});
  assert.equal(timeout.status,'error');assert.match(timeout.error,/无法连接 GitHub：超时/);assert.equal(store.state.updates.lastCheckDay,null);
  const offline=await updater(store,{fetch:async()=>{throw new Error('offline');}}).check({manual:true});
  assert.equal(offline.status,'error');assert.match(offline.error,/无法连接 GitHub/);assert.equal(store.state.updates.lastCheckDay,null);
  const http=await updater(store,{fetch:async()=>new Response('',{status:500})}).check({manual:true});
  assert.equal(http.status,'error');assert.match(http.error,/HTTP 500/);
  const broken=await updater(store,{fetch:async()=>new Response('not json',{status:200})}).check({manual:true});
  assert.equal(broken.status,'error');assert.match(broken.error,/无法解析/);
  const tag=await updater(store,{fetch:async()=>json({tag_name:'nightly',assets:[]})}).check({manual:true});
  assert.equal(tag.status,'error');assert.match(tag.error,/无法识别/);
  assert.equal(store.state.updates.lastCheckDay,null);
});

test('concurrent checks share one request and the daily check runs once per local day',async()=>{
  const store=await makeStore();let calls=0;
  const updates=updater(store,{isPackaged:true,fetch:async()=>{calls++;return json(release('0.1.23',null));}});
  const [first,second]=await Promise.all([updates.check({manual:true}),updates.check({manual:true})]);
  assert.equal(calls,1);assert.equal(first.status,'available');assert.equal(second.status,'available');
  assert.equal(store.state.updates.lastCheckDay,'2026-11-11');
  const skipped=await updates.checkDaily();assert.equal(calls,1);assert.equal(skipped.status,'available');
  let failures=0;
  const failing=updater(store,{isPackaged:true,now:()=>new Date('2026-11-12T08:00:00'),fetch:async()=>{failures++;throw new Error('offline');}});
  await failing.checkDaily();await failing.checkDaily();
  assert.equal(failures,2);assert.equal(store.state.updates.lastCheckDay,'2026-11-11');
  const dev=updater(store,{isPackaged:false,now:()=>new Date('2026-11-13T08:00:00'),fetch:async()=>{throw new Error('must not run');}});
  await dev.checkDaily();
});

test('automatic download obeys the preference and never repeats a downloaded version',async()=>{
  const store=await makeStore(),bytes=Uint8Array.of(7,6,5,4);let downloads=0;
  const asset=assetFor('0.1.23',bytes);
  const fetchImpl=async url=>url.includes('/releases/latest')?json(release('0.1.23',asset)):(downloads++,installer(bytes));
  const updates=updater(store,{fetch:fetchImpl});
  await updates.check({manual:true});await delay(30);
  assert.equal(downloads,0);assert.equal(updates.view().download.status,'idle');
  await updates.setAutoDownload(true);await updates.download();
  assert.equal(downloads,1);assert.equal(updates.view().download.status,'downloaded');assert.equal(updates.view().autoDownload,true);
  assert.equal(store.state.preferences.autoDownloadUpdates,true);
  await updates.setAutoDownload(false);
  await updates.check({manual:true});await updates.download();
  assert.equal(downloads,1);assert.equal(updates.view().download.status,'downloaded');
  const other=await makeStore();
  const second=updater(other,{fetch:fetchImpl});await second.check({manual:true});await delay(30);
  assert.equal(downloads,1);
});

test('a check with automatic download enabled starts the transfer',async()=>{
  const store=await makeStore(),bytes=Uint8Array.of(3,3,3);let downloads=0;
  await store.mutate(s=>{s.preferences.autoDownloadUpdates=true;});
  const asset=assetFor('0.1.23',bytes);
  const updates=updater(store,{fetch:async url=>url.includes('/releases/latest')?json(release('0.1.23',asset)):(downloads++,installer(bytes))});
  await updates.check({manual:true});await updates.download();
  assert.equal(downloads,1);assert.equal(updates.view().download.status,'downloaded');
});

test('size or hash mismatches delete the partial file and report a failure',async()=>{
  for(const overrides of [{size:99},{digest:'sha256:'+'0'.repeat(64)}]){
    const store=await makeStore(),bytes=Uint8Array.of(1,2,3,4),asset=assetFor('0.1.23',bytes,overrides);
    const updates=updater(store,{fetch:async url=>url.includes('/releases/latest')?json(release('0.1.23',asset)):installer(bytes)});
    await updates.check({manual:true});
    const view=await updates.download();
    assert.equal(view.download.status,'failed');assert.match(view.download.error,/大小不符|校验失败/);
    assert.deepEqual(await readdir(join(store.root,'updates')),[]);assert.equal(store.state.updates.downloaded,null);
  }
});

test('cancelling a download aborts it, removes the partial file, and returns to idle',async()=>{
  const store=await makeStore(),bytes=Uint8Array.of(1,2,3,4,5,6),asset=assetFor('0.1.23',bytes);
  const fetchImpl=async url=>url.includes('/releases/latest')?json(release('0.1.23',asset)):new Response(new ReadableStream({async start(stream){try{stream.enqueue(bytes.subarray(0,2));await delay(60);stream.enqueue(bytes.subarray(2));stream.close();}catch{}}}),{status:200});
  const updates=updater(store,{fetch:fetchImpl});
  await updates.check({manual:true});
  const pending=updates.download();await delay(15);assert.equal(updates.view().download.status,'downloading');
  const cancelled=await updates.cancel();assert.equal(cancelled.download.status,'idle');assert.equal(cancelled.download.version,null);
  await pending;
  assert.deepEqual(await readdir(join(store.root,'updates')),[]);assert.equal(store.state.updates.downloaded,null);
});

test('a completed download keeps only the current installer and records its hash',async()=>{
  const store=await makeStore(),dir=join(store.root,'updates'),bytes=Uint8Array.of(5,5,5,5),asset=assetFor('0.1.23',bytes);
  await mkdir(dir,{recursive:true});await writeFile(join(dir,'Bridge++-Setup-0.1.20.exe'),'old');await writeFile(join(dir,'Bridge++-Setup-0.1.19.exe.part'),'partial');
  const updates=updater(store,{fetch:async url=>url.includes('/releases/latest')?json(release('0.1.23',asset)):installer(bytes)});
  await updates.check({manual:true});const view=await updates.download();
  assert.equal(view.download.status,'downloaded');assert.equal(view.download.received,4);assert.equal(view.download.total,4);
  assert.deepEqual(await readdir(dir),['Bridge++-Setup-0.1.23.exe']);
  assert.deepEqual(store.state.updates.downloaded,{version:'0.1.23',file:join(dir,'Bridge++-Setup-0.1.23.exe'),sha256:hex(bytes)});
});

test('startup forgets a downloaded package for the running or a missing version',async()=>{
  const store=await makeStore(),dir=join(store.root,'updates'),file=join(dir,'Bridge++-Setup-0.1.21.exe');
  await mkdir(dir,{recursive:true});await writeFile(file,new Uint8Array(8));
  await store.mutate(s=>{s.updates.downloaded={version:'0.1.21',file,sha256:null};});
  const installed=await updater(store,{fetch:async()=>{throw new Error('no network');}}).init();
  assert.equal(installed.download.status,'idle');assert.equal(store.state.updates.downloaded,null);
  await assert.rejects(stat(file));
  await store.mutate(s=>{s.updates.downloaded={version:'0.1.23',file:join(dir,'Bridge++-Setup-0.1.23.exe'),sha256:null};});
  const missing=await updater(store,{fetch:async()=>{throw new Error('no network');}}).init();
  assert.equal(missing.download.status,'idle');assert.equal(store.state.updates.downloaded,null);
});

test('install refuses while sessions run and spawns a detached installer when forced',async()=>{
  const store=await makeStore(),dir=join(store.root,'updates'),bytes=Uint8Array.of(1,2,3),file=join(dir,'Bridge++-Setup-0.1.23.exe');
  await mkdir(dir,{recursive:true});await writeFile(file,bytes);
  await store.mutate(s=>{s.updates.downloaded={version:'0.1.23',file,sha256:hex(bytes)};});
  const spawned=[];let unreferenced=0;
  const updates=updater(store,{fetch:async()=>{throw new Error('no network');},spawn:(command,args,options)=>{spawned.push({command,args,options});return {unref(){unreferenced++;}};},sessionsRunning:()=>true});
  await assert.rejects(updates.install({}),error=>error.code==='sessions_running'&&/有任务正在运行/.test(error.message));
  assert.equal(spawned.length,0);
  await assert.rejects(updater(store,{fetch:async()=>{throw new Error('no network');},sessionsRunning:()=>true,spawn:()=>{throw new Error('must not spawn');}}).install({force:false}),{code:'sessions_running'});
  await updates.install({force:true});
  assert.equal(spawned.length,1);assert.equal(spawned[0].command,file);assert.deepEqual(spawned[0].args,[]);
  assert.deepEqual(spawned[0].options,{detached:true,stdio:'ignore',windowsHide:false});assert.equal(unreferenced,1);
});

test('install rejects a missing or corrupted package',async()=>{
  const store=await makeStore(),dir=join(store.root,'updates'),file=join(dir,'Bridge++-Setup-0.1.23.exe');
  await mkdir(dir,{recursive:true});await writeFile(file,Uint8Array.of(1));
  await store.mutate(s=>{s.updates.downloaded={version:'0.1.23',file,sha256:'a'.repeat(64)};});
  const updates=updater(store,{fetch:async()=>{throw new Error('no network');}});
  await assert.rejects(updates.install({force:true}),/校验失败/);assert.equal(store.state.updates.downloaded,null);
  await assert.rejects(updater(store,{fetch:async()=>{throw new Error('no network');}}).install({force:true}),/没有可安装/);
});

test('the snapshot view exposes exactly the agreed fields',async()=>{
  const store=await makeStore(),bytes=Uint8Array.of(2),asset=assetFor('0.1.23',bytes);
  const updates=updater(store,{fetch:async url=>url.includes('/releases/latest')?json(release('0.1.23',asset)):installer(bytes)});
  const idle=updates.view();
  assert.deepEqual(Object.keys(idle).sort(),['autoDownload','checkedAt','checking','current','download','error','latest','status']);
  assert.deepEqual(Object.keys(idle.download).sort(),['error','received','status','total','version']);
  assert.equal(idle.status,'idle');assert.equal(idle.latest,null);assert.equal(idle.download.status,'idle');
  await updates.check({manual:true});
  assert.deepEqual(Object.keys(updates.view().latest).sort(),['asset','name','notes','publishedAt','tag','url','version']);
});

test('catalog diffs report additions and removals but never the first fill',()=>{
  assert.equal(catalogDiff([],[{name:'A'}]),null);
  assert.equal(catalogDiff([{name:'A'}],[{name:'A'}]),null);
  assert.deepEqual(catalogDiff([{name:'A'},{name:'B'},{name:'C'}],[{name:'A'},{id:'C'},{name:'D'}]),{added:['D'],removed:['B']});
});
