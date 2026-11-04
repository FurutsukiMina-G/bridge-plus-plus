import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'node:http';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {ModelServices} from '../app/services/model-services.mjs';

async function fixture(t){
 await mkdir('.runtime/tests',{recursive:true});const userData=await mkdtemp(resolve('.runtime/tests/service-performance-')),states=new Map(),owners=new Map(),calls={owner:0,health:0,control:0},entry=resolve('tests/fixtures/model-service-process.mjs');let trusted=true,alive=true;
 const manager=await new ModelServices({userData,node:{command:process.execPath,args:[],env:{}},pollMs:60000,storeOptions:{protect:async()=>{}},pidAlive:()=>alive,portOwner:async port=>{calls.owner++;await delay(200);return trusted?owners.get(port):{pid:99999,command:'foreign'};},launchProcess:()=>assert.fail('performance test must not launch children'),tasks:{query:()=>assert.fail('snapshot must not query tasks'),run:()=>assert.fail('must not run tasks')},runtimeFor:async()=>({version:'0.166.0'}),clientConnector:async()=>({connectedAt:'fixture'})}).init();t.after(()=>manager.close());
 for(const [index,id]of ['qoder','workbuddy'].entries()){
  const store=manager.store(id),server=createServer(async(req,res)=>{res.setHeader('content-type','application/json');if(req.headers.authorization!=='Bearer '+store.key){res.writeHead(403);res.end('{}');return;}if(req.url==='/_bridge/health'){calls.health++;res.end(JSON.stringify(states.get(id)));}else if(req.url==='/v1/models')res.end(JSON.stringify({data:[{id:'fixture',context_window:200000}]}));else{calls.control++;res.end('{}');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));const port=server.address().port;
  await store.configure({port});const state={id,kind:'bridgepp-model-service',status:'running',pid:40000+index,instanceId:'fixture-'+id,baseURL:'http://127.0.0.1:'+port,installation:{entry},models:{count:1},requests:{total:0}};states.set(id,state);await store.write('status.json',state);owners.set(port,{pid:state.pid,command:[process.execPath,entry,'--id',id,'--user-data',userData].map(v=>'"'+v+'"').join(' ')});
 }
 return {manager,calls,states,owners,setTrusted:value=>{trusted=value;},setAlive:value=>{alive=value;},async change(id,patch){const state={...states.get(id),...patch};states.set(id,state);await manager.store(id).write('status.json',state);owners.get(Number(new URL(state.baseURL).port)).pid=state.pid;}};
}
test('cold and warm snapshots never invoke slow portOwner/tasks; two live fixture services take milliseconds',async t=>{
 const f=await fixture(t),cold=performance.now();await f.manager.snapshot();assert.ok(performance.now()-cold<500);assert.equal(f.calls.owner,0);
 await f.manager.refreshOwnership();assert.equal(f.calls.owner,2);const samples=[];for(let n=0;n<5;n++){const start=performance.now(),view=await f.manager.snapshot();samples.push(performance.now()-start);assert.ok(view.every(row=>row.status==='running'));}assert.equal(f.calls.owner,2);assert.ok(Math.max(...samples)<500);t.diagnostic('two-service snapshot ms: '+samples.map(n=>n.toFixed(2)).join(' / '));
 const healthBefore=f.calls.health;await Promise.all(Array.from({length:20},()=>f.manager.snapshot()));assert.equal(f.calls.health,healthBefore);assert.equal(f.calls.owner,2);
});
test('steady polling reuses identity and task caches; only a new pid/instance triggers background verification',async t=>{
 const f=await fixture(t);await f.manager.refreshOwnership();await f.manager.changed();const baseline={...f.calls};for(let n=0;n<5;n++)await f.manager.changed();assert.equal(f.calls.owner,baseline.owner);assert.equal(f.calls.health,baseline.health);
 await f.change('qoder',{pid:50001,instanceId:'replacement'});const health=f.calls.health;await f.manager.snapshot();assert.equal(f.calls.owner,baseline.owner);assert.equal(f.calls.health,health);await f.manager.changed();assert.equal(f.calls.owner,baseline.owner+1);assert.equal((await f.manager.snapshot())[0].pid,50001);
});
test('control/connect/restart/key reverify ownership and never send credentials to a replaced listener',async t=>{
 const f=await fixture(t);await f.manager.refreshOwnership();await f.manager.snapshot();f.setTrusted(false);const before={...f.calls},key=f.manager.store('qoder').key;
 await assert.rejects(f.manager.control('qoder','/_bridge/refresh'),/无法核实/);await assert.rejects(f.manager.connect('qoder','codex'),/核实/);await assert.rejects(f.manager.restart('qoder'),/归属/);await assert.rejects(f.manager.key('qoder','regenerate'),/归属/);assert.ok(f.calls.owner>=before.owner+4);assert.equal(f.calls.health,before.health);assert.equal(f.calls.control,0);assert.equal(f.manager.store('qoder').key,key);
});
test('an observed dead pid revokes cached ownership without a process query or health request',async t=>{const f=await fixture(t);await f.manager.refreshOwnership();await f.manager.snapshot();const before={...f.calls};f.setAlive(false);await f.manager.snapshot();assert.equal(f.calls.owner,before.owner);assert.equal(f.calls.health,before.health);assert.equal(f.manager.ownership.size,0);});
