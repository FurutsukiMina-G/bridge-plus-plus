import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runModelService} from '../app/model-service.mjs';
import {ModelServices} from '../app/services/model-services.mjs';

async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/service-version-'));}

test('standalone installation reports the app version and health reports active requests',async t=>{
 const userData=await root(),version=JSON.parse(await readFile('package.json','utf8')).version,providers={get:()=>null,refresh:async()=>[],close:async()=>{}};
 const {server}=await runModelService({id:'qoder',userData,storeOptions:{protect:async()=>{}},serverOptions:{providers,listenPort:0}});t.after(()=>server.shutdown());assert.equal(server.installation.version,version);
 const health=async()=>await(await fetch(server.base+'/_bridge/health',{headers:{authorization:'Bearer '+server.serviceStore.key}})).json();assert.equal((await health()).active,0);assert.equal((await health()).installation.version,version);server.inflight.set('fixture',{});assert.equal((await health()).active,1);server.inflight.clear();
});

test('stale idle services restart once per instance and failures remain visible without retry loops',async t=>{
 const userData=await root(),manager=await new ModelServices({userData,node:{command:process.execPath,args:[],env:{}},storeOptions:{protect:async()=>{}},pidAlive:()=>true,pollMs:60000,appVersion:'0.1.18'}).init();t.after(()=>manager.close());const store=manager.store('qoder');let health={status:'running',pid:4321,instanceId:'old-1',baseURL:'http://127.0.0.1:8646',installation:{version:'0.1.17'},active:1},restarts=0,fail=false;
 manager.probe=async()=>health;manager.restart=async id=>{restarts++;if(fail)throw new Error('restart denied Bearer synthetic-secret');health={...health,instanceId:'new-1',installation:{version:'0.1.18'}};await store.write('status.json',health);return manager.view(id);};await store.write('status.json',health);
 assert.deepEqual((await manager.view('qoder')).stale,{running:'0.1.17',current:'0.1.18'});await manager.changed();assert.equal(restarts,0);health={...health,active:0};await manager.changed();assert.equal(restarts,1);assert.equal((await manager.view('qoder')).stale,null);
 health={...health,instanceId:'old-2',installation:{version:null}};await store.write('status.json',health);fail=true;await manager.changed();await manager.changed();assert.equal(restarts,2);const view=await manager.view('qoder');assert.deepEqual(view.stale,{running:null,current:'0.1.18'});assert.equal(view.error.code,'STALE_RESTART_FAILED');assert.match(view.error.message,/自动重启失败/);assert.equal(view.error.message.includes('synthetic-secret'),false);
});
