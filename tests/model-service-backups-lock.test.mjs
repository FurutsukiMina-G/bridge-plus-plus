import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {ModelServiceStore} from '../app/services/model-service-store.mjs';
import {connectServiceClient,clientConfigPath} from '../app/services/model-service-connect.mjs';
import {pruneServiceBackups} from '../app/services/model-service-backups.mjs';
import {withFileLock} from '../app/services/file-lock.mjs';
import {DshProfileFiles} from '../app/services/dsh-profile-files.mjs';
import {ServiceTasks} from '../app/services/model-service-system.mjs';

async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/service-backups-lock-'));}

test('client and DSH backup pruning keeps only the newest five files',async()=>{
 const home=await root(),store=await new ModelServiceStore(home,'qoder',{protect:async()=>{}}).open(),models=[{id:'fixture',name:'Fixture',context_window:64000,input_modalities:['text'],reasoning_efforts:[]}];let latest;
 for(let n=0;n<7;n++)latest=await connectServiceClient({store,target:'codex',models,baseURL:'http://127.0.0.1:'+(9000+n),key:store.key,home,env:{},runtime:{executable:'fixture',version:'0.133.0'},verifyBearer:async()=>true});const backups=(await readdir(store.root)).filter(name=>name.startsWith('codex-before-'));assert.equal(backups.length,5);assert.ok(backups.includes(latest.backup));assert.equal((await readFile(clientConfigPath('codex',{home,env:{}}),'utf8')).includes('9006'),true);
 for(let n=0;n<7;n++)await writeFile(join(store.root,`dsh-before-${n}.json`),'{}');await pruneServiceBackups(store,'dsh');assert.equal((await readdir(store.root)).filter(name=>name.startsWith('dsh-before-')).length,5);
});

test('file locks record the pid, take over dead owners and reject live owners',async()=>{
 const dir=await root(),lock=join(dir,'config.bridgepp.lock');await writeFile(lock,'999999\n');const value=await withFileLock(lock,async()=>{assert.equal(await readFile(lock,'utf8'),process.pid+'\n');return 'acquired';},{pidAlive:()=>false});assert.equal(value,'acquired');await assert.rejects(readFile(lock),{code:'ENOENT'});
 await writeFile(lock,'12345\n');await assert.rejects(withFileLock(lock,async()=>assert.fail('live lock must not run'),{pidAlive:()=>true,timeoutMessage:'fixture busy'}),/fixture busy/);assert.equal(await readFile(lock,'utf8'),'12345\n');
});

test('DSH credentials/unset removes only the requested reference',async()=>{
 const home=await root();await mkdir(join(home,'profiles/desktop'),{recursive:true});await writeFile(join(home,'profiles/desktop/cordis.patch.yml'),'[]\n');await writeFile(join(home,'.credentials.yaml'),'version: 1\nrefs:\n  FIRST: first-fixture\n  SECOND: second-fixture\n');const files=new DshProfileFiles({home});await files.rpc('credentials/unset',{ref:'FIRST'});const text=await readFile(join(home,'.credentials.yaml'),'utf8');assert.equal(text.includes('FIRST'),false);assert.ok(text.includes('SECOND: second-fixture'));await files.rpc('credentials/unset',{ref:'FIRST'});
});

test('ServiceTasks treats every exit code 1 as a missing task and preserves other failures',async()=>{const tasks=new ServiceTasks({execute:async()=>{throw Object.assign(new Error('localized arbitrary failure'),{code:1,stderr:'unrecognized text'});}});assert.equal(await tasks.query('qoder'),null);const failed=new ServiceTasks({execute:async()=>{throw Object.assign(new Error('denied'),{code:2});}});await assert.rejects(failed.query('qoder'),/无法查询/);});
