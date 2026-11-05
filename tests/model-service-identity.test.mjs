import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {request as httpRequest} from 'node:http';
import {ModelServices} from '../app/services/model-services.mjs';
import {ModelServiceServer} from '../app/services/model-service-server.mjs';
import {serviceProof} from '../app/services/model-service-proof.mjs';
async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/service-identity-'));}
async function fixture(t){const userData=await root(),entry=resolve('tests/fixtures/model-service-process.mjs');let owners=0;const manager=await new ModelServices({userData,node:{command:process.execPath,args:[],env:{}},storeOptions:{protect:async()=>{}},pidAlive:()=>true,pollMs:60000,portOwner:async()=>{owners++;return {pid:4321,command:[process.execPath,entry,'--id','qoder','--user-data',userData].map(value=>'"'+value+'"').join(' ')};}}).init();t.after(()=>manager.close());const store=manager.store('qoder'),state={id:'qoder',kind:'bridgepp-model-service',status:'running',pid:4321,instanceId:'identity-fixture',baseURL:'http://127.0.0.1:8646',installation:{entry}};await store.write('status.json',state);return {manager,store,state,userData,owners:()=>owners};}
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
test('identify proof accepts the service key and rejects altered identities, proofs and nonces without a command-line fallback',async t=>{
 for(const scenario of ['valid','wrong-key','pid','instanceId','baseURL','nonce'])await t.test(scenario,async t=>{
  const f=await fixture(t);let requests=0;f.manager.fetchImpl=async(url,options)=>{requests++;assert.equal(options.headers?.authorization,undefined);const nonce=new URL(url).searchParams.get('nonce');assert.match(nonce,/^[a-f0-9]{64}$/);const body={kind:'bridgepp-model-service',id:'qoder',instanceId:f.state.instanceId,pid:f.state.pid,baseURL:f.state.baseURL};const proofNonce=scenario==='nonce'?'0'.repeat(64):nonce,proofKey=scenario==='wrong-key'?'0'.repeat(64):f.store.key;body.proof=serviceProof(proofKey,{nonce:proofNonce,id:'qoder',instanceId:f.state.instanceId,pid:f.state.pid,baseURL:f.state.baseURL});if(['pid','instanceId','baseURL'].includes(scenario))body[scenario]=scenario==='pid'?9999:scenario==='baseURL'?'http://127.0.0.1:9999':'changed';return json(body);};
  const result=await f.manager.verifyOwnership('qoder',{force:true});assert.equal(result.verified,scenario==='valid');assert.equal(f.manager.ownership.has('qoder'),true);assert.equal(f.owners(),0);assert.equal(requests,1);if(scenario!=='valid')await assert.rejects(f.manager.control('qoder','/_bridge/stop'),/无法核实/);
 });
});
test('legacy 403 identify responses use command-line ownership and transport failures are retried without caching',async t=>{
 const f=await fixture(t);let requests=0,legacy=true;f.manager.fetchImpl=async()=>{requests++;if(!legacy)throw new Error('fixture timeout');return json({},403);};assert.equal((await f.manager.verifyOwnership('qoder',{force:true})).verified,true);assert.equal(f.owners(),1);
 legacy=false;assert.equal((await f.manager.verifyOwnership('qoder',{force:true})).verified,false);assert.equal(f.manager.ownership.has('qoder'),false);assert.equal((await f.manager.verifyOwnership('qoder',{force:true})).verified,false);assert.equal(requests,3);assert.equal(f.owners(),1);
});
test('a real random-port service identifies itself without Bearer and enforces nonce, Origin and Host restrictions',async t=>{
 const userData=await root(),manager=await new ModelServices({userData,node:{command:process.execPath,args:[],env:{}},storeOptions:{protect:async()=>{}},pollMs:60000,portOwner:async()=>assert.fail('challenge must not use portOwner')}).init();t.after(()=>manager.close());const store=manager.store('qoder');await store.write('catalog.json',{models:[]});const providers={get:()=>null,refresh:async()=>[],close:async()=>{}};const server=await ModelServiceServer.open(store,{command:process.execPath,args:[],env:{}},{providers,listenPort:0,installation:{entry:resolve('app/model-service.mjs')}});await server.run();t.after(()=>server.shutdown());
 await store.configure({port:server.server.address().port});const nonce='a'.repeat(64),response=await fetch(server.base+'/_bridge/identify?nonce='+nonce);assert.equal(response.status,200);const body=await response.json();assert.deepEqual(Object.keys(body).sort(),['baseURL','id','instanceId','kind','pid','proof'].sort());assert.equal(body.proof,serviceProof(store.key,{nonce,id:'qoder',instanceId:server.instanceId,pid:process.pid,baseURL:server.base}));assert.equal(JSON.stringify(body).includes(store.key),false);assert.equal((await manager.verifyOwnership('qoder',{force:true})).verified,true);
 assert.equal((await fetch(server.base+'/_bridge/identify?nonce=bad')).status,400);for(const headers of [{origin:'https://foreign.invalid'},{host:'foreign.invalid'}]){const status=await new Promise((resolve,reject)=>{const req=httpRequest(server.base+'/_bridge/identify?nonce='+nonce,{headers},res=>{res.resume();resolve(res.statusCode);});req.once('error',reject);req.end();});assert.equal(status,403);}
});
test('start and stop skip portOwner when the loopback port has no listener',async t=>{
 const f=await fixture(t);f.manager.probe=async()=>null;f.manager.portBusy=async()=>false;f.manager.platform='linux';f.manager.launchProcess=()=>{throw new Error('fixture reached launch');};await assert.rejects(f.manager.startOne('qoder'),/fixture reached launch/);assert.equal(f.owners(),0);await f.manager.stopOne('qoder');assert.equal(f.owners(),0);assert.equal((await f.store.read('status.json')).status,'stopped');
});
