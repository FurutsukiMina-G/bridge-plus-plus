import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {BridgeWorkers} from '../app/services/bridge-workers.mjs';
import {createServer} from 'node:http';
import {Provider as WorkBuddyProvider} from '../bridges/workbuddy-bridge/src/provider.mjs';
import {createBridge as createWorkBuddyBridge} from '../bridges/workbuddy-bridge/src/server.mjs';
import {Environments} from '../app/services/environments.mjs';
import {inspectEnvironments,hydrateRuntimeVersionCache} from '../app/services/environment-discovery.mjs';
import {RuntimeCache} from '../app/services/runtime-cache.mjs';
import {ModelServiceStore} from '../app/services/model-service-store.mjs';
import {ModelServiceServer} from '../app/services/model-service-server.mjs';
import {normalizeQoder} from '../app/core/catalog.mjs';
import {usageForDisplay} from '../app/services/usage-view.mjs';
import {
  DEFAULT_STARTUP_PREFERENCES,
  STARTUP_PRESETS,
  COLD_ADAPTER_IDLE_MS,
  WARM_ADAPTER_IDLE_MS,
  COLD_WORKER_IDLE_MS,
  normalizeStartupPreferences,
  mergeStartupPreferences,
  runtimeIdlePolicy,
  workerIdleMsFor,
  workerBridgeEnv,
  workerConfigKey
} from '../app/services/startup-preferences.mjs';
import {startupPageHtml,activeStartupPreset,startupPatchFromPath} from '../app/ui/startup.js';

async function root(prefix='startup-prefs-'){
  await mkdir('.runtime/tests',{recursive:true});
  return mkdtemp(resolve('.runtime/tests/'+prefix));
}

test('startup preferences normalize to cold defaults, support presets/partial merges, and reject invalid fields',()=>{
  const empty=normalizeStartupPreferences(undefined);
  assert.deepEqual(empty,DEFAULT_STARTUP_PREFERENCES);
  assert.equal(activeStartupPreset(empty),'cold');

  const warm=mergeStartupPreferences(empty,{preset:'warm'});
  assert.deepEqual(warm,STARTUP_PRESETS.warm);
  assert.equal(activeStartupPreset(warm),'warm');

  const custom=mergeStartupPreferences(empty,{keepWarmRuntimes:{dsh:true},prewarmSources:{qoder:true}});
  assert.equal(custom.keepWarmRuntimes.dsh,true);
  assert.equal(custom.keepWarmRuntimes.claude,false);
  assert.equal(custom.prewarmSources.qoder,true);
  assert.equal(activeStartupPreset(custom),null);

  assert.throws(()=>mergeStartupPreferences(empty,{unknown:true}),/未知启动配置项/);
  assert.throws(()=>mergeStartupPreferences(empty,{preset:'turbo'}),/未知启动预设/);
  assert.throws(()=>mergeStartupPreferences(empty,{keepWarmRuntimes:{dsh:'yes'}}),/无效的配置项/);
  assert.throws(()=>mergeStartupPreferences(empty,{keepWarmWorkers:{antigravity:true}}),/无效的配置项/);

  assert.equal(runtimeIdlePolicy(empty,'dsh').idleMs,COLD_ADAPTER_IDLE_MS);
  assert.equal(runtimeIdlePolicy(warm,'dsh').idleMs,WARM_ADAPTER_IDLE_MS);
  assert.equal(workerIdleMsFor(empty,'qoder'),COLD_WORKER_IDLE_MS);
  assert.equal(workerIdleMsFor(warm,'qoder'),0);

  const coldEnv=workerBridgeEnv(empty,'qoder',{});
  assert.equal(coldEnv.QODER_BLANK_WARM_LIMIT,'0');
  assert.equal(coldEnv.QODER_NATIVE_WARM_LIMIT,'0');
  assert.equal(coldEnv.QODER_SESSION_IDLE_MS,'600000');

  const wbColdEnv=workerBridgeEnv(empty,'workbuddy',{});
  assert.equal(wbColdEnv.WORKBUDDY_PREWARM_MS,'0');
  assert.equal(wbColdEnv.WORKBUDDY_MAX_WARM,'0');
  assert.equal(wbColdEnv.WORKBUDDY_SESSION_IDLE_MS,'600000');

  // Explicit operator env overrides stay respected.
  assert.equal(workerBridgeEnv(empty,'qoder',{QODER_BLANK_WARM_LIMIT:'2'}).QODER_BLANK_WARM_LIMIT,undefined);
  assert.notEqual(workerConfigKey(empty,'qoder'),workerConfigKey(warm,'qoder'));
});

test('startup settings HTML renders all presets and cold/prewarm toggles cleanly',()=>{
  const html=startupPageHtml(DEFAULT_STARTUP_PREFERENCES);
  assert.match(html,/启动与资源/);
  assert.match(html,/data-startup-preset="cold"/);
  assert.match(html,/data-startup-preset="balanced"/);
  assert.match(html,/data-startup-preset="warm"/);
  for(const path of [
    'checkEnvironmentsOnStart',
    'refreshCatalogOnStart.qoder',
    'refreshCatalogOnStart.workbuddy',
    'refreshCatalogOnStart.antigravity',
    'refreshCatalogOnStart.services',
    'backgroundUpdateChecks.environments',
    'backgroundUpdateChecks.app',
    'keepWarmRuntimes.dsh',
    'keepWarmRuntimes.claude',
    'keepWarmRuntimes.codex',
    'keepWarmRuntimes.kimi',
    'keepWarmWorkers.qoder',
    'keepWarmWorkers.workbuddy',
    'prewarmSources.qoder',
    'prewarmSources.workbuddy'
  ])assert.ok(html.includes(`data-startup-toggle="${path}"`),`missing toggle ${path}`);
  assert.deepEqual(startupPatchFromPath('checkEnvironmentsOnStart',true),{checkEnvironmentsOnStart:true});
  assert.deepEqual(startupPatchFromPath('keepWarmRuntimes.dsh',true),{keepWarmRuntimes:{dsh:true}});
});

test('stream IPC uses a history watermark across published, pending and later batches',async t=>{
  const store=await new Store(await root('ipc-journal-'),{publishStreamMs:32}).open();
  t.after(()=>store.close());
  await store.mutate(state=>state.sessions.push({id:'s1'},{id:'s2'}));
  t.mock.timers.enable({apis:['setTimeout']});
  const sent=[];store.on('event',event=>sent.push(event));
  const text=value=>store.event('s1',{type:'text',turnId:'t1',text:value});
  const tick=async ms=>{t.mock.timers.tick(ms);await store.queue;};
  assert.deepEqual(await store.events('s1',{display:true}),{events:[],liveSeq:0});
  await text('Hel');await text('lo');await tick(32);
  await text(' ');await tick(32);
  await text('world');
  assert.deepEqual(sent.map(event=>[event.liveSeq,event.text]),[[1,'Hello'],[2,' ']]);
  const loading=store.events('s1',{display:true});
  const later=text('!');
  const history=await loading;await later;
  assert.equal(history.liveSeq,3);
  assert.deepEqual(history.events.map(event=>event.text),['Hello world']);
  const file=join(store.root,'sessions','s1.jsonl');
  const firstRows=(await readFile(file,'utf8')).trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(firstRows.length,1);
  assert.equal(firstRows[0].text,'Hello world');
  assert.equal(Object.hasOwn(firstRows[0],'liveSeq'),false);
  await store.event('s2',{type:'notice',text:'other session'});
  await store.event('s1',{type:'tool-output',turnId:'t1',toolId:'tool',stream:'stdout',offset:0,text:'a'});
  await store.event('s1',{type:'tool-output',turnId:'t1',toolId:'tool',stream:'stderr',offset:1,text:'b'});
  await store.event('s1',{type:'usage',data:{prompt_tokens:5,cached_tokens:6}});
  const sessionEvents=sent.filter(event=>event.sessionId==='s1');
  assert.deepEqual(sessionEvents.map(event=>event.liveSeq),[1,2,3,4,5,6,7]);
  assert.equal(sent.find(event=>event.sessionId==='s2').liveSeq,1);
  const merged=[...history.events,...sessionEvents.filter(event=>event.liveSeq>history.liveSeq)];
  assert.equal(merged.filter(event=>event.type==='text').map(event=>event.text).join(''),'Hello world!');
  assert.deepEqual(merged.slice(2,4).map(({text,stream,offset})=>[text,stream,offset]),[['a','stdout',0],['b','stderr',1]]);
  const usage=usageForDisplay(merged.at(-1),'qoder');
  assert.equal(usage.liveSeq,7);
  assert.equal(usage.data.cached_tokens,null);
  const final=await store.events('s1',{display:true});
  assert.equal(final.liveSeq,7);
  assert.equal(final.events[0].text,'Hello world!');
  assert.ok((await store.events('s1')).every(event=>!Object.hasOwn(event,'liveSeq')));
});

test('the stream journal flushes at the byte cap and record timeout independently of live batches',async t=>{
  const store=await new Store(await root('ipc-journal-limits-'),{publishStreamMs:32,streamFlushMs:1000,streamFlushBytes:5}).open();
  t.after(()=>store.close());
  await store.mutate(state=>state.sessions.push({id:'s1'}));
  t.mock.timers.enable({apis:['setTimeout']});
  const tick=async ms=>{t.mock.timers.tick(ms);await store.queue;};
  const file=join(store.root,'sessions','s1.jsonl');
  const disk=async()=> (await readFile(file,'utf8')).trim().split('\n').map(line=>JSON.parse(line).text);
  await store.event('s1',{type:'text',text:'ab'});await tick(32);
  await store.event('s1',{type:'text',text:'cde'});await tick(32);
  assert.deepEqual(await disk(),['abcde']);
  await store.event('s1',{type:'thinking',text:'why'});await tick(32);
  await tick(999);assert.deepEqual(await disk(),['abcde']);
  await tick(1);assert.deepEqual(await disk(),['abcde','why']);
  await store.event('s1',{type:'tool-output',toolId:'tool',stream:'stdout',text:'out'});
  await store.event('s1',{type:'tool-output',toolId:'tool',stream:'stderr',text:'err'});
  assert.deepEqual(await disk(),['abcde','why','out']);
  await store.event('s1',{type:'tool-end',toolId:'tool'});
  assert.deepEqual(await disk(),['abcde','why','out','err',undefined]);
});

test('startup persistence follows changed defaults and retains only explicit choices or a selected preset',async()=>{
  const dir=await root('startup-version-'),file=join(dir,'workspace.json');
  await writeFile(file,JSON.stringify({version:1,projects:[],sessions:[],preferences:{startup:{backgroundUpdateChecks:{environments:false}}}}));
  let store=await new Store(dir).open();
  assert.equal(store.snapshot().preferences.startup.backgroundUpdateChecks.environments,true);
  assert.equal(Object.hasOwn(JSON.parse(await readFile(file,'utf8')).preferences,'startup'),false);
  await store.mutate(s=>s.preferences.startup=mergeStartupPreferences(s.preferences.startup,{backgroundUpdateChecks:{environments:false}},{explicit:true}));
  assert.deepEqual(JSON.parse(await readFile(file,'utf8')).preferences.startup,{version:1,backgroundUpdateChecks:{environments:false}});
  await store.close();
  store=await new Store(dir).open();
  assert.equal(store.snapshot().preferences.startup.backgroundUpdateChecks.environments,false);
  assert.equal(store.snapshot().preferences.startup.backgroundUpdateChecks.app,true);
  await store.mutate(s=>s.preferences.startup=mergeStartupPreferences(s.preferences.startup,{preset:'balanced'},{explicit:true}));
  assert.deepEqual(store.snapshot().preferences.startup,STARTUP_PRESETS.balanced);
  await store.close();
});

test('Sessions cold-start policy recycles idle adapters and shuts down DshHost when idle and no native window is open',async()=>{
  const specs=[['c1','claude','qoder:df'],['d1','dsh','qoder:df'],['k1','kimi','native']];
  const state=specs.map(([id,runtimeId,modelKey])=>({id,runtimeId,selection:{modelKey}}));
  const store={root:await root('sessions-cold-'),state:{sessions:state},session:id=>state.find(row=>row.id===id)};
  let now=10_000,dshNative=false,policy=normalizeStartupPreferences(DEFAULT_STARTUP_PREFERENCES),dshClosed=0;
  const closed=[];
  const sessions=new Sessions(store,{},null,[],{
    now:()=>now,
    adapterSweepMs:600_000,
    startupPolicy:()=>policy,
    dshNativeOpen:()=>dshNative
  });
  try{
    sessions.dsh={close:async()=>{dshClosed++;}};
    for(const [id]of specs){
      sessions.adapters.set(id,{close:async()=>{closed.push(id);}});
      sessions.touchAdapter(id);
    }
    // Before five minutes idle: nothing closed yet.
    now+=20_000;
    await sessions.recycleAdapters();
    assert.deepEqual(closed,[]);
    assert.equal(dshClosed,0);
    // Past five minutes idle with DSH native window open: adapters close, but DshHost stays alive for native window.
    dshNative=true;
    now+=COLD_ADAPTER_IDLE_MS;
    await sessions.recycleAdapters();
    assert.deepEqual(closed.sort(),['c1','d1','k1']);
    assert.equal(dshClosed,0);
    assert.ok(sessions.dsh);
    // Once native window closes and idle threshold passes, DshHost exits cleanly.
    dshNative=false;
    await sessions.recycleAdapters();
    assert.equal(dshClosed,1);
    assert.equal(sessions.dsh,null);

    sessions.dsh={close:async()=>{dshClosed++;}};
    const release=sessions.claimDshWindow();
    now+=COLD_ADAPTER_IDLE_MS+1;
    await sessions.recycleAdapters();
    assert.equal(dshClosed,1);
    release();release();
    now+=COLD_ADAPTER_IDLE_MS+1;
    await sessions.recycleAdapters();
    assert.equal(dshClosed,2);

    // When keepWarmRuntimes.dsh is enabled, DSH stays warm past the cold threshold.
    policy=mergeStartupPreferences(policy,{keepWarmRuntimes:{dsh:true}});
    sessions.dsh={close:async()=>{dshClosed++;}};
    sessions.adapters.set('d1',{close:async()=>{closed.push('d1-warm');}});
    sessions.touchAdapter('d1');
    now+=COLD_ADAPTER_IDLE_MS+1;
    await sessions.recycleAdapters();
    assert.equal(sessions.adapters.has('d1'),true);
    assert.equal(dshClosed,2);
  }finally{await sessions.close();}
});

test('idle adapter and worker guards include session input, queued selection and external windows',async()=>{
  const session={id:'s1',runtimeId:'kimi',selection:{modelKey:'workbuddy:fixture'}};
  const store={root:await root('busy-adapter-'),state:{sessions:[session]},session:()=>session};
  const sessions=new Sessions(store,{},null,[],{now:()=>COLD_ADAPTER_IDLE_MS+1,startupPolicy:()=>DEFAULT_STARTUP_PREFERENCES});
  let closes=0;
  sessions.adapters.set('s1',{close:async()=>{closes++;}});
  try{
    for(const [field,value]of [['status','waiting'],['queue',[{id:'queued'}]],['selectionNext',{modelKey:'pending'}]]){
      session[field]=value;
      await sessions.recycleAdapters();
      assert.equal(closes,0);
      assert.equal(sessions.isWorkerBusy('workbuddy','kimi'),true);
      delete session[field];
    }
    sessions.external.set('s1',{});
    await sessions.recycleAdapters();
    assert.equal(closes,0);
    assert.equal(sessions.isWorkerBusy('workbuddy','kimi'),true);
    sessions.external.clear();
    await sessions.recycleAdapters();
    assert.equal(closes,1);
    assert.equal(sessions.isWorkerBusy('workbuddy','kimi'),false);
  }finally{await sessions.close();}
});

test('BridgeWorkers reclaims idle workers based on idleMs and respects canReclaim and live policy changes',async t=>{
  let now=1_000,idleMs=5_000,busy=false,cfgKey='qoder:prewarm=0:keep=0';
  const failed=[];
  let awaiting=0,replyHealth=null,healthSeen=null;
  const server=createServer(async(_req,res)=>{
    healthSeen?.();
    await replyHealth;
    res.end(JSON.stringify({active:0,queued:0,provider:{hold:{awaiting}}}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const workers=new BridgeWorkers({
    node:{command:process.execPath,args:[],env:{}},
    script:'unused.mjs',
    cwd:process.cwd(),
    dataRoot:await root('workers-idle-'),
    catalog:()=>({models:[],revision:0}),
    configKey:()=>cfgKey,
    idleMs:()=>idleMs,
    canReclaim:()=>!busy,
    sweepMs:600_000,
    now:()=>now
  });
  try{
    const makeEntry=(source,runtimeId,configKey)=>{
      const entry={source,runtimeId,active:0,syncing:null,failed:null,lastUsed:now,activity:0,configKey,key:'fixture',url:'http://127.0.0.1:'+server.address().port,stopping:Promise.resolve()};
      entry.ready=Promise.resolve(entry);
      entry.fail=error=>{if(entry.failed)return;entry.failed=error;failed.push({scope:`${runtimeId}/${source}`,reason:error.message});workers.retired.delete(entry);workers.entries.delete(runtimeId+'/'+source);};
      return entry;
    };
    const entry=makeEntry('workbuddy','claude',cfgKey);
    workers.entries.set('claude/workbuddy',entry);
    // Busy session prevents reclamation even past idleMs.
    busy=true;now+=10_000;
    await workers.sweepIdle();
    assert.equal(failed.length,0);
    assert.equal(workers.entries.has('claude/workbuddy'),true);
    // Once no longer busy and idle past idleMs, worker is reclaimed.
    busy=false;awaiting=1;
    await workers.sweepIdle();
    assert.equal(failed.length,0);
    awaiting=0;
    let unblock;
    replyHealth=new Promise(resolve=>{unblock=resolve;});
    const seen=new Promise(resolve=>{healthSeen=resolve;});
    const sweep=workers.sweepIdle();
    await seen;
    entry.ready=Promise.resolve(entry);
    assert.equal(await workers.ensure('workbuddy','claude',{retain:true}),entry);
    workers.release(entry);
    unblock();await sweep;
    assert.equal(failed.length,0);
    now+=10_000;
    await workers.sweepIdle();
    assert.equal(failed.length,1);
    assert.equal(failed[0].scope,'claude/workbuddy');
    assert.equal(workers.entries.has('claude/workbuddy'),false);
    // Changing startup policy retires idle worker with mismatched configKey immediately.
    const warmEntry=makeEntry('workbuddy','dsh',cfgKey);
    workers.entries.set('dsh/workbuddy',warmEntry);
    cfgKey='qoder:prewarm=1:keep=1';
    idleMs=0;
    workers.retain(warmEntry);
    await workers.applyPolicy();
    assert.equal(failed.length,1);
    workers.release(warmEntry);
    awaiting=1;
    await workers.applyPolicy();
    assert.equal(await workers.ensure('workbuddy','dsh'),warmEntry);
    assert.equal(failed.length,1);
    awaiting=0;
    await workers.applyPolicy();
    assert.equal(failed.length,2);
    assert.equal(failed[1].scope,'dsh/workbuddy');
    assert.equal(workers.entries.has('dsh/workbuddy'),false);
  }finally{await workers.close();}
});

test('WorkBuddy HTTP health exposes the held lane used by worker reclamation',async t=>{
  const runtime=await root('workbuddy-health-'),key='fixture';
  const cfg={runtime,concurrency:1,queueLimit:1,toolMode:'native'};
  const provider=new WorkBuddyProvider(cfg,{auth:{status:()=>({}),get:async()=>assert.fail('health must not authenticate upstream')}});
  const {hold}=provider.transport;
  const bridge=createWorkBuddyBridge({cfg,provider,key,log:async()=>{}});
  await new Promise(resolve=>bridge.server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{hold.sessions.clear();await bridge.close();});
  const url='http://127.0.0.1:'+bridge.server.address().port;
  const workers=new BridgeWorkers({idleMs:()=>1,now:()=>2});
  t.after(()=>workers.close());
  const entry={url,key,source:'workbuddy',runtimeId:'claude',configKey:'',lastUsed:0,active:0,activity:0};
  entry.fail=error=>{entry.failed=error;workers.entries.delete('claude/workbuddy');workers.retired.delete(entry);};
  workers.entries.set('claude/workbuddy',entry);
  hold.sessions.set('held',{state:'awaiting',busy:false,touched:Date.now()});
  const response=await fetch(url+'/health',{headers:{authorization:'Bearer '+key}});
  assert.equal(response.status,200);
  const health=await response.json();
  assert.equal(health.active,0);
  assert.equal(health.provider.context.awaiting,0);
  assert.equal(health.provider.hold.awaiting,1);
  await workers.sweepIdle();assert.equal(entry.failed,undefined);
  hold.sessions.clear();
  const status=provider.status.bind(provider);
  provider.status=()=>{const legacy=status();delete legacy.hold;return legacy;};
  await workers.sweepIdle();assert.equal(entry.failed,undefined);
  provider.status=status;
  await workers.sweepIdle();assert.match(entry.failed?.message??'',/reclaimed/);
});

test('ModelServiceServer skips periodic refresh while idle and refreshes once active requests arrive',async t=>{
  const userData=await root('service-idle-');
  const models=[normalizeQoder({value:'dfmodel',displayName:'DeepSeek-Flash',supportsToolCall:true})];
  const store=await new ModelServiceStore(userData,'qoder',{protect:async()=>{}}).open();
  let now=Date.parse('2026-11-21T00:00:00Z'),refreshes=0;
  await store.write('catalog.json',{status:'ready',models,checkedAt:new Date(now).toISOString()});
  const providers={get:key=>models.find(m=>m.key===key),refresh:async()=>{refreshes++;return models;},close:async()=>{}};
  const server=await ModelServiceServer.open(store,{command:process.execPath,args:[],env:{}},{
    providers,
    workerScript:resolve('tests/fixtures/model-service-worker.mjs'),
    listenPort:0,
    refreshMs:40,
    now:()=>now
  });
  await server.run();
  t.after(()=>server.shutdown());
  assert.equal(server.workers.idleMs('qoder','dsh'),0);
  assert.deepEqual(server.workers.envFor('qoder','dsh'),{});
  const emptyStore=await new ModelServiceStore(await root('service-empty-retry-'),'qoder',{protect:async()=>{}}).open();
  let emptyRefreshes=0;
  let resolveRetry;const retried=new Promise(resolve=>{resolveRetry=resolve;});
  const emptyServer=await ModelServiceServer.open(emptyStore,{command:process.execPath,args:[],env:{}},{
    providers:{refresh:async()=>{
      if(++emptyRefreshes===1)throw new Error('fixture bootstrap failure');
      resolveRetry();return models;
    }},
    listenPort:0,refreshMs:40,now:()=>now
  });
  await emptyServer.run();t.after(()=>emptyServer.shutdown());
  // Idle for several intervals: zero background catalog refreshes!
  await new Promise(r=>setTimeout(r,140));
  assert.equal(refreshes,0);
  // After an API request hits the service, periodic refresh resumes once.
  now+=1000;
  const res=await fetch(server.base+'/v1/models',{headers:{authorization:'Bearer '+store.key}});
  assert.equal(res.status,200);
  await new Promise(r=>setTimeout(r,120));
  assert.equal(refreshes,1);
  // Idle again: no second refresh.
  await new Promise(r=>setTimeout(r,120));
  assert.equal(refreshes,1);
  await Promise.race([retried,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Empty service did not retry')),2000);timer.unref();})]);
  await emptyServer.refreshing;
  assert.equal(emptyServer.lastActivityAt,0);
  assert.equal(emptyServer.modelInfo.count,1);
  assert.equal(emptyRefreshes,2);
});

test('Environments.canReuseCache verifies cached executables without spawning, and version probes cache by mtime/size',async t=>{
  const userData=await root('env-cache-'),store=await new Store(join(userData,'workspace')).open();
  t.after(()=>store.close());
  const fakeExe=join(userData,'codex.exe');
  await writeFile(fakeExe,'fake-codex-binary');
  const cached=['dsh','kimi','codex','claude','antigravity'].map(id=>({
    id,name:id,status:id==='codex'?'ready':'missing',installed:id==='codex',executable:id==='codex'?fakeExe:null
  }));
  const cache=new RuntimeCache({userData,appVersion:'0.1.25-r1'});
  let probes=0;
  const manager=new Environments({
    store,userData,runtimeCache:cache,execute:async()=>{probes++;return {code:0,stdout:'codex-cli 2.3.5'};},
    npmFinder:async()=>({cli:'fake-npm',version:'10.0.0'}),
    inspect:async()=>{throw new Error('must not scan when cache is reusable');}
  });
  await manager.saveCache(cached.map(row=>({...row,version:row.installed?'2.3.4':null})));
  const restored=await manager.restore();
  assert.equal(await manager.canReuseCache(restored),true);
  assert.equal(probes,0);
  await writeFile(fakeExe,'fake-codex-binary upgraded in place');
  assert.equal(await manager.canReuseCache(restored),true);
  assert.equal(probes,1);
  assert.equal(manager.runtimes.find(row=>row.id==='codex').version,'2.3.5');
  assert.equal(await manager.canReuseCache(),true);
  assert.equal(probes,1);
  assert.equal(manager.npm.version,'10.0.0');
  // Missing executable invalidates cache reuse.
  const broken=cached.map(r=>r.id==='codex'?{...r,executable:join(userData,'missing.exe')}:r);
  assert.equal(await manager.canReuseCache(broken),false);

  // Version probe cache skips spawning --version for unchanged files and persists in RuntimeCache.
  hydrateRuntimeVersionCache();
  let calls=0;
  const first=await inspectEnvironments({},{discover:async()=>[{id:'codex',name:'Codex',installed:true,status:'ready',executable:fakeExe}],execute:async()=>{calls++;return {code:0,stdout:'codex-cli 2.3.4'};},fileVersion:async()=>null});
  assert.equal(first[0].version,'2.3.4');assert.equal(calls,1);
  const second=await inspectEnvironments({},{discover:async()=>[{id:'codex',name:'Codex',installed:true,status:'ready',executable:fakeExe}],execute:async()=>{calls++;return {code:0,stdout:'codex-cli 2.3.4'};},fileVersion:async()=>null});
  assert.equal(second[0].version,'2.3.4');assert.equal(calls,1);
  const rc=new RuntimeCache({userData,appVersion:'0.1.25-r1'});
  await rc.save(first);
  hydrateRuntimeVersionCache();
  await rc.load();
  const third=await inspectEnvironments({},{discover:async()=>[{id:'codex',name:'Codex',installed:true,status:'ready',executable:fakeExe}],execute:async()=>{calls++;return {code:0,stdout:'codex-cli 2.3.4'};},fileVersion:async()=>null});
  assert.equal(third[0].version,'2.3.4');assert.equal(calls,1);
});
