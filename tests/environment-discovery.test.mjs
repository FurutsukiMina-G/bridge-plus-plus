import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import * as fs from 'node:fs';
import {join,resolve} from 'node:path';
import {openExternalAsar,statExternalAsar} from '../app/core/external-asar.mjs';
import {inspectEnvironments} from '../app/services/environment-discovery.mjs';
import {compareRuntimeVersions} from '../app/services/runtime-paths.mjs';
import {Environments} from '../app/services/environments.mjs';

async function root(){await mkdir('.runtime/tests',{recursive:true});const dir=await mkdtemp(resolve('.runtime/tests/environment-discovery-'));await mkdir(join(dir,'resources'));return dir;}
function archiveBytes(pkg){const content=Buffer.from(JSON.stringify(pkg)),tree=Buffer.from(JSON.stringify({files:{'package.json':{size:content.length,offset:'0'}}})),header=Buffer.alloc(16+tree.length+(4-tree.length%4)%4);header.writeUInt32LE(4,0);header.writeUInt32LE(header.length-8,4);header.writeUInt32LE(header.length-12,8);header.writeUInt32LE(tree.length,12);tree.copy(header,16);return Buffer.concat([header,content]);}
const runtime=(dir,id='dsh')=>({id,name:id,installed:true,status:'ready',executable:join(dir,id==='dsh'?'DeepSeek Harness.exe':'agy.exe'),kind:'system'});
const discovery=row=>({discover:async()=>[row],execute:async()=>assert.fail('unexpected process')});

test('Electron environment discovery uses original-fs for archive reads and file checks, retains rc version and enables DSH',async()=>{
 const dir=await root(),archive=join(dir,'resources/app.asar'),calls=[];await writeFile(archive,archiveBytes({version:'0.2.1-rc.4',homepage:'https://fixture.invalid/dsh'}));
 // Stale loose metadata and Windows' fourth version component must not win.
 await writeFile(join(dir,'package.json'),JSON.stringify({version:'0.2.1.0'}));
 const original={open(path,flags,callback){calls.push(['open',path]);fs.open(path,flags,callback);},read:fs.read,close:fs.close,stat(path,callback){calls.push(['stat',path]);fs.stat(path,callback);}},rejectPatched=async()=>assert.fail('Electron patched fs must not inspect external asar'),options={electronVersion:'fixture-electron',loadOriginalFs:async()=>({default:original})};
 const detected=await inspectEnvironments({}, {...discovery({...runtime(dir),version:'0.2.1.0'}),fileVersion:async()=>assert.fail('valid package version must avoid PE query'),archive:{open:path=>openExternalAsar(path,{...options,nodeOpen:rejectPatched}),stat:path=>statExternalAsar(path,{...options,nodeStat:rejectPatched})}});
 assert.equal(detected[0].status,'ready');assert.equal(detected[0].version,'0.2.1-rc.4');assert.equal(detected[0].page,'https://fixture.invalid/dsh');assert.deepEqual(calls,[['open',archive],['stat',archive]]);
 const manager=new Environments({store:{state:{preferences:{environments:{dsh:{latest:{version:'0.2.1-rc.5'}}}}}}});manager.runtimes=detected;assert.equal(manager.snapshot()[0].updateAvailable,true);
});
test('DSH archive package failure falls back to executable version then observed registry version',async()=>{
 const dir=await root();await writeFile(join(dir,'resources/app.asar'),'invalid fixture package');
 const exe=await inspectEnvironments({}, {...discovery(runtime(dir)),fileVersion:async()=> '0.2.1.0'});assert.equal(exe[0].status,'ready');assert.equal(exe[0].version,'0.2.1.0');
 const registry=await inspectEnvironments({}, {...discovery(runtime(dir)),fileVersion:async()=>null,registryRows:[{location:dir,version:'0.2.1-rc.3'}]});assert.equal(registry[0].version,'0.2.1-rc.3');
});
test('a truly absent/non-file DSH archive remains needs-setup, and permission failures are not reported as missing',async()=>{
 const dir=await root(),options={...discovery(runtime(dir)),fileVersion:async()=>null};assert.equal((await inspectEnvironments({},options))[0].status,'needs-setup');await mkdir(join(dir,'resources/app.asar'));assert.equal((await inspectEnvironments({},options))[0].status,'needs-setup');
 const inaccessible=await inspectEnvironments({}, {...options,archive:{open:async()=>{throw new Error('fixture');},stat:async()=>{throw Object.assign(new Error('fixture denied'),{code:'EACCES'});}}});assert.equal(inaccessible[0].status,'error');assert.match(inaccessible[0].reason,/权限/);
});
test('version comparisons follow SemVer prerelease precedence, ASCII/numeric identifiers, and ignore build metadata',()=>{
 const sequence=['1.0.0-alpha','1.0.0-alpha.1','1.0.0-alpha.beta','1.0.0-beta','1.0.0-beta.2','1.0.0-beta.11','1.0.0-rc.1','1.0.0'];for(let i=1;i<sequence.length;i++){assert.ok(compareRuntimeVersions(sequence[i-1],sequence[i])<0);assert.ok(compareRuntimeVersions(sequence[i],sequence[i-1])>0);}
 assert.ok(compareRuntimeVersions('0.2.1-rc.4','0.2.1-rc.5')<0);assert.ok(compareRuntimeVersions('1.0.0-alpha.9','1.0.0-alpha.10')<0);assert.ok(compareRuntimeVersions('1.0.0-Z','1.0.0-a')<0);assert.ok(compareRuntimeVersions('1.0.0-9','1.0.0-alpha')<0);assert.equal(compareRuntimeVersions('1.0.0+one','1.0.0+two'),0);assert.equal(compareRuntimeVersions('0.2.1.0','0.2.1'),0);assert.ok(compareRuntimeVersions('0.2.1-rc.4+old','0.2.1-rc.5+new')<0);
});
test('agy --version is bounded, parsed, and preferred over stale metadata without invoking updater',async()=>{
 const dir=await root(),calls=[];const detected=await inspectEnvironments({}, {...discovery({...runtime(dir,'antigravity'),version:'1.0.0'}),fileVersion:async()=>assert.fail('CLI result should win'),execute:async(command,args,options)=>{calls.push({command,args,options});return {code:0,stdout:'1.4.12\r\n'};}});
 assert.equal(detected[0].status,'ready');assert.equal(detected[0].version,'1.4.12');assert.deepEqual(calls,[{command:join(dir,'agy.exe'),args:['--version'],options:{timeoutMs:8000}}]);
});
test('agy timeout/nonzero exit degrades quietly and can fall back to executable metadata',async()=>{
 const dir=await root(),options=discovery(runtime(dir,'antigravity'));
 const timeout=await inspectEnvironments({}, {...options,fileVersion:async()=>null,execute:async()=>{throw new Error('fixture timeout');}});assert.equal(timeout[0].status,'ready');assert.equal(timeout[0].version,null);
 const nonzero=await inspectEnvironments({}, {...options,fileVersion:async()=> '1.4.11',execute:async()=>({code:1,stdout:'1.4.99'})});assert.equal(nonzero[0].version,'1.4.11');
 const desktop=await inspectEnvironments({}, {...discovery({...runtime(dir,'antigravity'),executable:null,desktop:join(dir,'Antigravity.exe')}),fileVersion:async()=>null});assert.equal(desktop[0].status,'needs-setup');
});
