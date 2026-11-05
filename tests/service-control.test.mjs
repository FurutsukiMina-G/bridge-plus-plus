import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,access} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {serviceControl,netstatOwns} from '../app/service-control.mjs';
import {ModelServices} from '../app/services/model-services.mjs';
import {ModelServiceStore} from '../app/services/model-service-store.mjs';

async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/service-control-'));}
async function fixture(t){const userData=await root(),directory=join(userData,'model-services','qoder'),key='a'.repeat(64),state={kind:'bridgepp-model-service',id:'qoder',status:'running',pid:9876,instanceId:'fixture-instance',baseURL:'http://127.0.0.1:8646'};await mkdir(directory,{recursive:true});await writeFile(join(directory,'status.json'),JSON.stringify(state));await writeFile(join(directory,'service-key'),key);return {userData,directory,key,state};}
const exists=async path=>{try{await access(path);return true;}catch{return false;}};

test('legacy netstat verification stops only the matching listener and writes a resume marker',async t=>{
 const f=await fixture(t),requests=[],netstat=await readFile('tests/fixtures/windows-zh-CN/netstat-ano-tcp.txt','utf8');assert.equal(netstatOwns(netstat,8646,9876),true);assert.equal(netstatOwns(netstat,8646,1234),false);
 const execute=async(command,args)=>{assert.equal(command,'netstat.exe');return {stdout:netstat};},fetchImpl=async(url,options)=>{requests.push({url,options});if(url.includes('/_bridge/identify'))return new Response('{}',{status:404});assert.equal(url,f.state.baseURL+'/_bridge/stop');assert.equal(options.headers.authorization,'Bearer '+f.key);await writeFile(join(f.directory,'status.json'),JSON.stringify({...f.state,status:'stopped'}));return new Response('{}',{status:200});};
 assert.equal(await serviceControl(['stop-for-upgrade'],{userData:f.userData,execute,fetchImpl,pidAlive:()=>true}),0);assert.equal(requests.length,2);assert.equal(requests[0].options.headers,undefined);assert.equal(typeof JSON.parse(await readFile(join(f.directory,'resume-after-install.json'),'utf8')).at,'string');
});

test('unverified identity never receives Bearer or creates a resume marker',async t=>{
 const f=await fixture(t);const fetchImpl=async(url,options)=>{assert.equal(url.includes('/_bridge/stop'),false);return new Response(JSON.stringify({kind:'bridgepp-model-service',id:'qoder',instanceId:f.state.instanceId,pid:f.state.pid,baseURL:f.state.baseURL,proof:'0'.repeat(64)}),{status:200});};
 assert.equal(await serviceControl(['stop-for-upgrade'],{userData:f.userData,fetchImpl,execute:async()=>assert.fail('wrong proofs must not fall back'),pidAlive:()=>true}),0);assert.equal(await exists(join(f.directory,'resume-after-install.json')),false);
});

test('uninstall deletes only tasks whose real XML description matches',async t=>{
 const userData=await root(),deletes=[],qoder=await readFile('tests/fixtures/windows-zh-CN/schtasks-query-qoder.xml','utf8'),workbuddy=await readFile('tests/fixtures/windows-zh-CN/schtasks-query-workbuddy.xml','utf8');const execute=async(command,args)=>{assert.equal(command,'schtasks.exe');const name=args[args.indexOf('/TN')+1];if(args.includes('/Query'))return {stdout:name==='bridge++_qoder'?qoder:workbuddy.replace('Bridge++ model-service workbuddy','foreign')};deletes.push(name);return {stdout:''};};
 assert.equal(await serviceControl(['uninstall'],{userData,execute,fetchImpl:async()=>assert.fail('no running service'),pidAlive:()=>false}),0);assert.deepEqual(deletes,['bridge++_qoder']);
});

test('control failures are sanitized and still return zero',async t=>{
 const f=await fixture(t),netstat=await readFile('tests/fixtures/windows-zh-CN/netstat-ano-tcp.txt','utf8');const fetchImpl=async url=>{if(url.includes('/_bridge/identify'))return new Response('{}',{status:404});throw new Error('stop failed '+f.key);};assert.equal(await serviceControl(['stop-for-upgrade'],{userData:f.userData,fetchImpl,execute:async()=>({stdout:netstat}),pidAlive:()=>true}),0);const log=await readFile(join(f.userData,'service-control.log'),'utf8');assert.equal(log.includes(f.key),false);assert.match(log,/stop failed/);
});

test('service control is self contained and accepts identify proof without netstat',async t=>{
 const source=await readFile('app/service-control.mjs','utf8');for(const match of source.matchAll(/from '([^']+)'/g))assert.ok(match[1].startsWith('node:'),match[1]);const f=await fixture(t),{serviceProof}=await import('../app/services/model-service-proof.mjs');let stopped=false;const fetchImpl=async(url,options)=>{if(url.includes('/_bridge/identify')){const nonce=new URL(url).searchParams.get('nonce'),identity={nonce,id:f.state.id,instanceId:f.state.instanceId,pid:f.state.pid,baseURL:f.state.baseURL};return new Response(JSON.stringify({...identity,nonce:undefined,kind:'bridgepp-model-service',proof:serviceProof(f.key,identity)}),{status:200});}assert.equal(options.headers.authorization,'Bearer '+f.key);stopped=true;await writeFile(join(f.directory,'status.json'),JSON.stringify({...f.state,status:'stopped'}));return new Response('{}',{status:200});};assert.equal(await serviceControl(['stop-for-upgrade'],{userData:f.userData,fetchImpl,execute:async()=>assert.fail('proof must not use netstat'),pidAlive:()=>true}),0);assert.equal(stopped,true);
});

test('manager consumes installer resume markers during init',async t=>{
 const userData=await root(),store=await new ModelServiceStore(userData,'qoder',{protect:async()=>{}}).open(),marker=join(store.root,'resume-after-install.json');await writeFile(marker,JSON.stringify({at:'fixture'}));const started=[],manager=new ModelServices({userData,node:{command:process.execPath,args:[],env:{}},storeOptions:{protect:async()=>{}},pollMs:60000});manager.start=async id=>{started.push(id);};t.after(()=>manager.close());await manager.init();assert.deepEqual(started,['qoder']);assert.equal(await exists(marker),false);
});

test('uninstall delete-data removes only the injected temporary userData and returns zero',async t=>{
 const userData=await root();await writeFile(join(userData,'fixture.txt'),'fixture');const execute=async()=>{const error=new Error('missing');error.code=1;throw error;};assert.equal(await serviceControl(['uninstall','--delete-data'],{userData,execute,pidAlive:()=>false}),0);assert.equal(await exists(userData),false);assert.equal(await serviceControl(['invalid'],{userData:null}),0);
});
