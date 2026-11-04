import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,stat,utimes} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {ServiceTasks,scheduledServiceXml,hiddenLauncher,quoteWindowsArg} from '../app/services/model-service-system.mjs';
import {ModelServices} from '../app/services/model-services.mjs';
import {ModelServiceStore} from '../app/services/model-service-store.mjs';
import {serviceDefinition} from '../app/services/model-service-catalog.mjs';
const xmlText=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
// schtasks keeps ordinary quotes in element text; ampersands still need XML escaping.
const windowsTask=(id,launcher)=>`<Task xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><RegistrationInfo><Description>Bridge++ model-service ${id}</Description></RegistrationInfo><Settings><Enabled>true</Enabled></Settings><Actions><Exec><Command>wscript.exe</Command><Arguments>${xmlText(quoteWindowsArg(launcher))}</Arguments></Exec></Actions></Task>`;
test('task matching compares decoded Arguments exactly for Windows plain quotes and generated escaped quotes',()=>{
 const tasks=new ServiceTasks({execute:()=>assert.fail('matching must not execute anything')}),launcher="D:\\Fixture 中文 & user's folder\\launch-hidden.vbs",plain=windowsTask('qoder',launcher),escaped=scheduledServiceXml('qoder',{launcher,account:'S-1-5-21-1'});
 for(const text of [plain,escaped,escaped.replaceAll('&quot;','&#34;'),escaped.replaceAll('&quot;','&#x22;')]){assert.equal(tasks.matches(text,'qoder',launcher),true);assert.equal(tasks.matches(text,'qoder',launcher.replace('launch-hidden','other')),false);assert.equal(tasks.matches(text.replace('wscript.exe','cmd.exe'),'qoder',launcher),false);assert.equal(tasks.matches(text.replace('<Settings>','<Settings><Enabled>false</Enabled>'),'qoder',launcher),false);}
 assert.equal(tasks.matches(plain.replace('<Command>wscript.exe</Command>','<Command>C:\\Windows\\System32\\wscript.exe</Command>'),'qoder',launcher),true);
 for(const args of [quoteWindowsArg(launcher)+' --extra','prefix '+quoteWindowsArg(launcher),quoteWindowsArg(launcher+'.other'),launcher]){const text=plain.replace(/<Arguments>[\s\S]*?<\/Arguments>/,`<Arguments>${xmlText(args)}</Arguments>`);assert.equal(tasks.matches(text,'qoder',launcher),false);}
 const elsewhere=plain.replace(/<Arguments>[\s\S]*?<\/Arguments>/,'<Arguments>"D:\\different.vbs"</Arguments>')+`<Note>${xmlText(quoteWindowsArg(launcher))}</Note>`;assert.equal(tasks.matches(elsewhere,'qoder',launcher),false);assert.equal(tasks.matches(null,'qoder',launcher),false);
});
test('XML decoding is one pass, preserving literal entity-like folder names',()=>{
 const tasks=new ServiceTasks(),launcher='D:\\literal &quot; and &#34; folder\\launch-hidden.vbs';assert.equal(tasks.matches(scheduledServiceXml('qoder',{launcher,account:'fixture'}),'qoder',launcher),true);assert.equal(tasks.matches(windowsTask('qoder',launcher),'qoder',launcher),true);
});
async function fixture(t,{changed=false}={}){
 await mkdir('.runtime/tests',{recursive:true});const userData=await mkdtemp(resolve(".runtime/tests/reconcile 中文 & user'-")),node={command:process.execPath,args:[],env:{}},installed=new Map(),calls=[];
 const tasks=new ServiceTasks({account:async()=>'S-1-5-21-1',execute:async(command,args)=>{assert.equal(command,'schtasks.exe');const name=args[args.indexOf('/TN')+1],id=['qoder','workbuddy'].find(id=>serviceDefinition(id).name===name);assert.ok(id,'unexpected task name');if(args.includes('/Query'))return {stdout:Buffer.from('\uFEFF'+installed.get(id),'utf16le')};if(args.includes('/Create')){calls.push(['install',id]);installed.set(id,await readFile(args[args.indexOf('/XML')+1],'utf16le'));return {stdout:''};}assert.fail('unexpected scheduler operation');}});
 const manager=new ModelServices({userData,node,tasks,storeOptions:{protect:async()=>{}},portOwner:async()=>null,launchProcess:()=>assert.fail('must not launch a real service'),launchDetached:()=>assert.fail('must not launch WSH'),pollMs:60000});manager.stopOne=async id=>{calls.push(['stop',id]);};manager.startOne=async id=>{calls.push(['start',id]);};t.after(()=>manager.close());const files=[];
 for(const id of ['qoder','workbuddy']){const store=await new ModelServiceStore(userData,id,{protect:async()=>{}}).open(),launcher=join(store.root,'launch-hidden.vbs'),spec=manager.spec(id);await store.configure({autostart:true});await store.write('launch.json',changed?{...spec,command:'D:\\old-installation\\node.exe'}:spec);await writeFile(launcher,'\uFEFF'+hiddenLauncher(spec),{encoding:'utf16le',mode:0o600});installed.set(id,windowsTask(id,launcher));for(const file of [launcher,join(store.root,'launch.json')]){const date=new Date('2020-01-01T00:00:00Z');await utimes(file,date,date);files.push({path:file,bytes:await readFile(file),mtimeMs:(await stat(file)).mtimeMs});}}
 return {manager,calls,files};
}
test('GUI initialization and repeated reconcile leave unchanged Windows tasks and launcher files untouched',async t=>{
 const {manager,calls,files}=await fixture(t);await manager.init();for(let n=0;n<2;n++)for(const id of ['qoder','workbuddy'])await manager.reconcile(id);assert.deepEqual(calls,[]);for(const file of files){assert.deepEqual(await readFile(file.path),file.bytes);assert.equal((await stat(file.path)).mtimeMs,file.mtimeMs);}for(const id of ['qoder','workbuddy'])assert.deepEqual(manager.taskViews.get(id),{enabled:true,valid:true,issue:null});
});
test('a changed launch.json still reinstalls and restarts both services despite matching Windows task XML',async t=>{
 const {manager,calls}=await fixture(t,{changed:true});await manager.init();assert.deepEqual(calls,[['install','qoder'],['stop','qoder'],['start','qoder'],['install','workbuddy'],['stop','workbuddy'],['start','workbuddy']]);for(const id of ['qoder','workbuddy']){assert.deepEqual(await manager.store(id).read('launch.json'),manager.spec(id));await manager.reconcile(id);}assert.equal(calls.length,6,'generated escaped XML remains stable on the next reconcile');
});
