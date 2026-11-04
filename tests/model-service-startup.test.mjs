import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {mkdir,mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';
import {launch,stopProcess} from '../app/core/process.mjs';
import {ModelServices} from '../app/services/model-services.mjs';
import {protectServiceDirectory,systemExec} from '../app/services/model-service-system.mjs';
import {createServer} from 'node:http';
const runtime=resolve('.runtime/tests'),entry=resolve('app/model-service.mjs');
async function root(t){
 await mkdir(runtime,{recursive:true});const path=await mkdtemp(join(runtime,"service-startup 中文 ' "));
 t.after(async()=>{assert.ok(resolve(path).startsWith(runtime+sep));await rm(path,{recursive:true,force:true});});return path;
}
async function completion(child){
 let stderr='';child.stderr?.on('data',chunk=>stderr+=chunk);
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});return {code,stderr};
}
test('ACL command edits Access only, removes old rules and quotes literal paths',async()=>{
 const calls=[],path="D:\\fixture 中文\\user's service";
 await protectServiceDirectory(path,{platform:'win32',execute:async(...args)=>calls.push(args)});
 assert.equal(calls.length,1);const [command,args,options]=calls[0];
 assert.equal(command,'powershell.exe');assert.deepEqual(args.slice(0,3),['-NoProfile','-NonInteractive','-Command']);
 const script=args[3];assert.ok(script.includes("Get-Item -LiteralPath 'D:\\fixture 中文\\user''s service'"));
 assert.match(script,/GetAccessControl\(\[Security.AccessControl.AccessControlSections\]::Access\)/);
 assert.match(script,/SetAccessRuleProtection\(\$true,\$false\)/);assert.match(script,/RemoveAccessRuleSpecific/);
 assert.match(script,/WindowsIdentity/);assert.match(script,/S-1-5-18/);assert.match(script,/'FullControl','ContainerInherit,ObjectInherit','None','Allow'/);
 assert.match(script,/\$item\.SetAccessControl\(\$acl\)/);assert.doesNotMatch(script,/Set-Acl|New-Object Security.AccessControl.DirectorySecurity/);
 assert.equal(options.windowsHide,true);assert.equal(options.timeout,15000);
});
test('real Windows directory ACL contains only current user and SYSTEM, with inheritance removed',{skip:process.platform!=='win32'},async t=>{
 const path=await root(t),literal="'"+path.replaceAll("'","''")+"'";
 // Include an explicit unrelated grant, so removing inheritance alone cannot pass.
 await systemExec('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$ErrorActionPreference='Stop';$item=Get-Item -LiteralPath ${literal};$acl=$item.GetAccessControl('Access');$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-1-0'),'ReadAndExecute','Allow'));$item.SetAccessControl($acl)`],{windowsHide:true});
 await protectServiceDirectory(path);await protectServiceDirectory(path);
 const {stdout}=await systemExec('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$ErrorActionPreference='Stop';$acl=(Get-Item -LiteralPath ${literal}).GetAccessControl('Access');@{sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value;protected=$acl.AreAccessRulesProtected;rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])|ForEach-Object {@{sid=$_.IdentityReference.Value;rights=[string]$_.FileSystemRights;type=[string]$_.AccessControlType;inherited=$_.IsInherited;flags=[string]$_.InheritanceFlags}})}|ConvertTo-Json -Depth 4 -Compress`],{windowsHide:true});
 const acl=JSON.parse(stdout.replace(/^\uFEFF/,''));assert.equal(acl.protected,true);assert.equal(acl.rules.length,2);
 assert.deepEqual(acl.rules.map(r=>r.sid).sort(),[acl.sid,'S-1-5-18'].sort());
 for(const rule of acl.rules){assert.equal(rule.rights,'FullControl');assert.equal(rule.type,'Allow');assert.equal(rule.inherited,false);assert.match(rule.flags,/ContainerInherit/);assert.match(rule.flags,/ObjectInherit/);}
});
test('actual standalone entry persists startup error with its PID/instance and exits nonzero',{timeout:15000},async t=>{
 const userData=await root(t),serviceRoot=join(userData,'model-services/qoder');await mkdir(serviceRoot,{recursive:true});
 await writeFile(join(serviceRoot,'settings.json'),JSON.stringify({port:-1,defaultProfile:'dsh',autostart:false}));
 const child=launch(process.execPath,[entry,'--id','qoder','--user-data',userData]);t.after(()=>stopProcess(child));const result=await completion(child);
 assert.equal(result.code,1);assert.match(result.stderr,/模型服务启动失败：.*端口必须/);
 const state=JSON.parse(await readFile(join(serviceRoot,'status.json'),'utf8')),row=JSON.parse((await readFile(join(serviceRoot,'service-error.log'),'utf8')).trim());
 assert.equal(state.status,'error');assert.equal(state.pid,child.pid);assert.ok(state.instanceId);assert.equal(state.error.code,'STARTUP_FAILED');assert.match(state.error.message,/端口必须/);assert.deepEqual(row,state);
});
test('ACL/open failures are diagnosed before store initialization, secrets are redacted, and error log stays bounded',{timeout:15000},async t=>{
 const userData=await root(t),serviceRoot=join(userData,'model-services/qoder');await mkdir(serviceRoot,{recursive:true});await writeFile(join(serviceRoot,'service-error.log'),'x'.repeat(65530));
 const message='ACL denied Bearer synthetic-bearer --api-key "synthetic cli secret" api_key=synthetic-api secret="synthetic structured secret" sk-synthetic-secret '+'a'.repeat(64);
 const code=`import {runModelService} from ${JSON.stringify(new URL('../app/model-service.mjs',import.meta.url).href)};try{await runModelService({id:'qoder',userData:${JSON.stringify(userData)},storeOptions:{protect:async()=>{throw Object.assign(new Error(${JSON.stringify(message)}),{code:'EACCES'});}}});}catch{process.exitCode=1;}`;
 let previous;for(let n=0;n<2;n++){
  const child=launch(process.execPath,['--input-type=module','-e',code]);t.after(()=>stopProcess(child));assert.equal((await completion(child)).code,1);
  const state=JSON.parse(await readFile(join(serviceRoot,'status.json'),'utf8')),log=await readFile(join(serviceRoot,'service-error.log'),'utf8');
  assert.equal(state.status,'error');assert.equal(state.pid,child.pid);assert.notEqual(state.instanceId,previous);previous=state.instanceId;
  assert.equal(state.error.code,'EACCES');assert.match(state.error.message,/ACL denied/);assert.match(state.error.message,/\[redacted\]/);
  for(const secret of ['synthetic-bearer','synthetic cli secret','synthetic-api','synthetic structured secret','sk-synthetic-secret','a'.repeat(64)])assert.equal(JSON.stringify(state).includes(secret)||log.includes(secret),false);
  assert.equal(log.trim().split('\n').length,n+1);assert.ok((await stat(join(serviceRoot,'service-error.log'))).size<=65536);
 }
});
test('manager surfaces an actual entry startup error and retains it in the service view',{timeout:15000},async t=>{
 const userData=await root(t),children=[],manager=await new ModelServices({userData,platform:'linux',node:{command:process.execPath,args:[],env:{}},storeOptions:{protect:async()=>{}},portOwner:async()=>null,launchProcess:(...args)=>{const child=launch(...args);children.push(child);return child;}}).init();
 t.after(async()=>{await manager.close();await Promise.all(children.map(stopProcess));});
 await writeFile(join(manager.store('qoder').root,'catalog.json'),'{invalid-fixture');
 await assert.rejects(manager.start('qoder'),/模型服务启动失败：.*catalog\.json 无法读取/);
 const view=await manager.view('qoder');assert.equal(view.status,'error');assert.match(view.error.message,/catalog\.json 无法读取/);
});
test('manager falls back to matching child error log and rejects stale PID/instance diagnostics',async t=>{
 for(const scenario of ['current','stale-pid','stale-instance'])await t.test(scenario,async t=>{
  const userData=await root(t),child=Object.assign(new EventEmitter(),{pid:45678,exitCode:7,unref(){}}),manager=await new ModelServices({userData,platform:'linux',node:{command:process.execPath,args:[],env:{}},storeOptions:{protect:async()=>{}},portOwner:async()=>null,launchProcess:()=>child}).init();t.after(()=>manager.close());
  const store=manager.store('qoder');await store.write('status.json',{status:'stopped',pid:child.pid,instanceId:'previous-instance'});
  const row={pid:scenario==='stale-pid'?98765:child.pid,instanceId:scenario==='stale-instance'?'previous-instance':'new-instance',error:{code:'EACCES',message:'ACL specific failure Bearer synthetic-secret'}};
  await writeFile(join(store.root,'service-error.log'),'partial-line\n'+JSON.stringify(row)+'\n');
  if(scenario==='current')await assert.rejects(manager.start('qoder'),error=>{assert.match(error.message,/模型服务启动失败：ACL specific failure/);assert.equal(error.message.includes('synthetic-secret'),false);return true;});
  else await assert.rejects(manager.start('qoder'),/退出码 7.*未找到本次启动的诊断记录/);
 });
});
test('Windows manual launch uses only hidden WSH and surfaces new status/log diagnostics',async t=>{
 for(const scenario of ['status','log','wscript-code','wscript-error'])await t.test(scenario,async t=>{
  const userData=await root(t),calls=[];let manager;
  manager=await new ModelServices({userData,platform:'win32',node:{command:process.execPath,args:[],env:{}},storeOptions:{protect:async()=>{}},portOwner:async()=>null,launchProcess:()=>assert.fail('Windows must never directly spawn the service'),launchDetached:async(command,args,options)=>{
   calls.push({command,args,options});const store=manager.store('qoder'),raw=await readFile(args.at(-1));assert.deepEqual([...raw.subarray(0,2)],[255,254]);assert.match(raw.toString('utf16le'),/, 0, False/);
   if(scenario==='wscript-code')return {code:9};if(scenario==='wscript-error')throw new Error('fixture WSH unavailable');
   const row={pid:12345,instanceId:'this-launch',error:{code:'EACCES',message:'新的诊断 Bearer fake-secret'}};
   if(scenario==='status')await store.write('status.json',row);else await writeFile(join(store.root,'service-error.log'),JSON.stringify(row)+'\n',{flag:'a'});return {};
  }}).init();t.after(()=>manager.close());const store=manager.store('qoder');await store.write('status.json',{status:'stopped',instanceId:'previous'});await writeFile(join(store.root,'service-error.log'),JSON.stringify({instanceId:'older',error:{message:'旧诊断不可见'}})+'\n');
  await assert.rejects(manager.start('qoder'),error=>{assert.doesNotMatch(error.message,/fake-secret|旧诊断/);assert.match(error.message,scenario.startsWith('wscript')?/无法通过 Windows Script Host 启动模型服务/:/新的诊断/);return true;});assert.equal(calls.length,1);assert.equal(calls[0].command,'wscript.exe');assert.deepEqual(calls[0].args.slice(0,2),['//B','//Nologo']);assert.equal(calls[0].options.timeout,15000);
 });
});
test('Windows manual launch accepts only the new instance after ownership and health verification',async t=>{
 const userData=await root(t),calls=[];let state=null,manager;
 const server=createServer((_req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(state));});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const port=server.address().port;
 manager=await new ModelServices({userData,platform:'win32',node:{command:process.execPath,args:[],env:{}},storeOptions:{protect:async()=>{}},portOwner:async()=>state?{pid:process.pid,command:manager.spec('qoder').args.map(s=>'"'+s+'"').join(' ')}:null,launchProcess:()=>assert.fail('must not directly spawn service'),launchDetached:async(...args)=>{calls.push(args);state={kind:'bridgepp-model-service',id:'qoder',status:'running',pid:process.pid,instanceId:'new-manual-instance',baseURL:'http://127.0.0.1:'+port,installation:{entry},port};await manager.store('qoder').write('status.json',state);return {};}}).init();t.after(()=>manager.close());await manager.store('qoder').configure({port});await manager.store('qoder').write('status.json',{status:'stopped',instanceId:'previous'});const view=await manager.start('qoder');assert.equal(view.status,'running');assert.equal(view.pid,process.pid);assert.equal(calls.length,1);
});
