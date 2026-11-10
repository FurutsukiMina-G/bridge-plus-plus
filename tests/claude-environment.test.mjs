import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,access,readdir,rm} from 'node:fs/promises';
import {join,resolve,dirname,basename} from 'node:path';
import {findManagedClaude,discoverRuntimes,runtimePlaceholders,claudeExecutable} from '../app/services/runtime-paths.mjs';
import {installClaudeNpm,installKimiNpm} from '../app/services/environment-npm.mjs';
import {Environments} from '../app/services/environments.mjs';
import {Store} from '../app/core/store.mjs';
import {claudePermissionModes,permissionCatalog,withRuntimePermissions,CLAUDE_PERMISSION_MODES} from '../app/services/runtime-permissions.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {ClaudeAdapter} from '../app/runtimes/claude.mjs';
import {normalizeQoder,normalizeWorkbuddy,normalizeAntigravity} from '../app/core/catalog.mjs';
import {interjectCapability} from '../app/services/session-input.mjs';
import {inspectRuntimeMedia,mediaCapabilities} from '../app/services/media-capabilities.mjs';
import {RuntimeCache} from '../app/services/runtime-cache.mjs';

async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/claude-environment-'));}
async function claudePackage(dir,version='2.1.319',{receipt=true}={}){
 const wrapper=join(dir,'node_modules/@anthropic-ai/claude-code'),platform=dirname(claudeExecutable(dir)),executable=claudeExecutable(dir);await mkdir(wrapper,{recursive:true});await mkdir(platform,{recursive:true});
 await writeFile(join(wrapper,'package.json'),JSON.stringify({name:'@anthropic-ai/claude-code',version}));await writeFile(join(platform,'package.json'),JSON.stringify({name:'@anthropic-ai/'+basename(platform),version}));await writeFile(executable,'synthetic native executable');
 if(receipt)await writeFile(join(dir,'bridgepp-install.json'),JSON.stringify({verified:true,version}));return executable;
}
async function managerFixture(t,{version='2.1.319',stdout='2.1.319 (Claude Code)',installer}={}){
 const userData=await root(),store=await new Store(join(userData,'workspace')).open(),manager=new Environments({store,userData,node:{command:'synthetic-node',args:[],env:{}},inspect:async()=>runtimePlaceholders().map(r=>({...r,status:'missing',reason:null})),npmFinder:async()=>({cli:'synthetic-npm'}),registry:async()=>[],fetchImpl:async()=>new Response(JSON.stringify({name:'@anthropic-ai/claude-code',version})),claudeInstaller:installer??(async({directory})=>{await claudePackage(directory,version,{receipt:false});return {code:0};}),execute:async()=>({code:0,stdout})});await manager.init();t.after(async()=>{await manager.close();await store.close();});return {manager,store,userData};
}

test('Claude discovery accepts only the managed native platform package and validates manual paths',async()=>{
 const userData=await root(),managed=join(userData,'environments/claude-code/2.1.319'),executable=await claudePackage(managed);assert.equal((await findManagedClaude(userData,{verify:async()=>true})).executable,executable);
 const detected=await discoverRuntimes({claude:{executable}},{userData,env:{AWB_HIDE_RUNTIMES:'dsh,kimi,codex,antigravity'}}),row=detected.find(r=>r.id==='claude');assert.equal(row.kind,'managed');assert.equal(row.version,'2.1.319');assert.equal(row.installed,true);
 const platformPackage=join(dirname(executable),'package.json'),platform=JSON.parse(await readFile(platformPackage,'utf8'));await writeFile(platformPackage,JSON.stringify({...platform,version:'2.1.318'}));assert.equal(await findManagedClaude(userData),null);
 const manual=await root(),manualExecutable=await claudePackage(join(manual,'package'),'2.1.319',{receipt:false}),manualRow=(await discoverRuntimes({claude:{executable:manualExecutable}},{userData:join(manual,'empty'),env:{AWB_HIDE_RUNTIMES:'dsh,kimi,codex,antigravity'}})).find(r=>r.id==='claude');assert.equal(manualRow.executable,manualExecutable);assert.equal(manualRow.kind,'managed');
 const pathDir=join(manual,'path');await mkdir(pathDir);await writeFile(join(pathDir,'claude.exe'),'not a package');const pathRow=(await discoverRuntimes({},{userData:join(manual,'empty'),env:{PATH:pathDir,AWB_HIDE_RUNTIMES:'dsh,kimi,codex,antigravity'}})).find(r=>r.id==='claude');assert.equal(pathRow.installed,false);assert.equal(pathRow.executable,null);
 const invalidRow=(await discoverRuntimes({claude:{executable:join(pathDir,'claude.exe')}},{userData:join(manual,'empty'),env:{AWB_HIDE_RUNTIMES:'dsh,kimi,codex,antigravity'}})).find(r=>r.id==='claude');assert.equal(invalidRow.installed,false);
});

test('Claude npm install keeps optional native dependencies and disables scripts without changing Kimi',async()=>{
 for(const claude of [true,false]){const directory=await root(),calls=[],install=claude?installClaudeNpm:installKimiNpm;await install({directory,version:'2.1.319',registry:'https://fixture.invalid',node:{command:'synthetic-node',args:[],env:{}},npm:{cli:'synthetic-npm'},fetchImpl:async()=>assert.fail('fake executor must not download'),execute:async(_command,args,options)=>{calls.push({args,options});return {code:0};}});const {args,options}=calls[0];assert.ok(args.includes('--ignore-scripts'));assert.equal(options.env.npm_config_ignore_scripts,'true');assert.equal(args.includes('--omit=optional'),!claude);assert.equal(args.at(-1),claude?'@anthropic-ai/claude-code@2.1.319':'@moonshot-ai/kimi-code@2.1.319');}
});

test('Claude managed install verifies native version and a failed update preserves the old version and writes diagnostics',async t=>{
 const good=await managerFixture(t),actions=good.manager.snapshot().find(r=>r.id==='claude').actions;assert.equal(actions.install,true);assert.equal(actions.check,true);await good.manager.install('claude');await good.manager.jobs.get('claude').promise;const chosen=good.store.state.preferences.runtimes.claude.executable;assert.equal(chosen,claudeExecutable(join(good.userData,'environments/claude-code/2.1.319')));assert.equal((await findManagedClaude(good.userData,{verify:async()=>true})).executable,chosen);
 const bad=await managerFixture(t,{stdout:'2.1.318 (Claude Code)'}),oldDir=join(bad.userData,'environments/claude-code/2.1.318'),oldExecutable=await claudePackage(oldDir,'2.1.318');await bad.store.mutate(s=>{s.preferences.runtimes.claude={executable:oldExecutable};});await bad.manager.install('claude','update');await assert.rejects(bad.manager.jobs.get('claude').promise,/--version 验证失败/);assert.equal(bad.store.state.preferences.runtimes.claude.executable,oldExecutable);await access(oldExecutable);await assert.rejects(access(claudeExecutable(join(bad.userData,'environments/claude-code/2.1.319'))));assert.match(await readFile(join(bad.userData,'environments/logs/claude-install.log'),'utf8'),/--version 验证失败/);assert.deepEqual((await readdir(join(bad.userData,'environments/claude-code'))).sort(),['2.1.318']);
});

test('Claude permission evidence comes from help, then errors, and successful probes are cached',async()=>{
 const help='  --permission-mode <mode>  choices: default, acceptEdits, auto, bypassPermissions, dontAsk, plan';assert.deepEqual(claudePermissionModes(help),['default','acceptEdits','auto','bypassPermissions','dontAsk','plan']);const full=permissionCatalog({id:'claude'},{modes:claudePermissionModes(help)});assert.deepEqual(full.modes.map(m=>[m.id,m.native.mode]),Object.entries(CLAUDE_PERMISSION_MODES));assert.equal(full.default,null);assert.equal(full.inherited,true);
 const partial=claudePermissionModes('--permission-mode <mode>  set permission mode','error: allowed values are default and plan');assert.deepEqual(partial,['default','plan']);assert.deepEqual(permissionCatalog({id:'claude'},{modes:partial}).modes.map(m=>m.id),['ask','readonly']);assert.deepEqual(permissionCatalog({id:'claude'},{modes:['default']}).modes.map(m=>m.id),['ask']);
 const dir=await root(),executable=join(dir,'claude.exe');await writeFile(executable,'synthetic');const runtime={id:'claude',status:'ready',executable};let probes=0;const probe=async()=>{probes++;return {modes:['default','auto','bypassPermissions','plan'],source:'synthetic --help'};};const first=await withRuntimePermissions([runtime],{},probe),second=await withRuntimePermissions([runtime],{},async()=>assert.fail('cached probe must not rerun'));assert.equal(probes,1);assert.deepEqual(first[0].permissions.modes.map(m=>m.id),['ask','auto-review','auto','readonly']);assert.equal(second[0].permissions.observed.source,'synthetic --help');
});

test('Claude sessions reject native and Antigravity models, pass private configDir, and hot-swap permissions',async t=>{
 const dir=await root(),store=await new Store(join(dir,'workspace')).open();await store.mutate(s=>{s.projects=[{id:'p',path:dir}];});const workbuddy=normalizeWorkbuddy({id:'synthetic-flash',name:'Synthetic',contextWindow:200000,reasoning:{supportedEfforts:['low']}}),qoder=normalizeQoder({value:'synthetic-qoder',displayName:'Synthetic Qoder',context_config:{native:{token_count:200000,is_default:true}},thinking_config:{enabled:{efforts:{low:{}}}}}),antigravity=normalizeAntigravity({id:'gemini-3.0-flash'}),models=[workbuddy,qoder,antigravity],selection=model=>({modelKey:model.key,identity:model.identity,contextTokens:model.defaultContextTokens??model.contextMaximum,reasoning:model.defaultReasoning}),runtime={id:'claude',name:'Claude Code',installed:true,status:'ready',executable:'synthetic-claude.exe',permissions:permissionCatalog({id:'claude'},{modes:['default','auto','bypassPermissions','plan']})},manager=new Sessions(store,{get:key=>models.find(m=>m.key===key)},{register:async()=>({baseURL:'http://127.0.0.1/synthetic/v1',key:'synthetic'})},[runtime]);t.after(async()=>{await manager.close();await store.close();});
 await assert.rejects(manager.create({projectId:'p',runtimeId:'claude',selection:{modelKey:'native'}}),/只使用 Qoder CN \/ WorkBuddy/);await assert.rejects(manager.create({projectId:'p',runtimeId:'claude',selection:selection(antigravity)}),/只使用 Qoder CN \/ WorkBuddy/);assert.equal(manager.validate('claude',selection(qoder)).modelKey,qoder.key);
 const session=await manager.create({projectId:'p',runtimeId:'claude',selection:selection(workbuddy)}),adapter=await manager.adapter(session);assert.ok(adapter instanceof ClaudeAdapter);assert.equal(adapter.configDir,join(store.root,'engines/claude-code/config'));adapter.ready=true;let changed;adapter.setPermissionMode=async mode=>{changed=mode;};await manager.setPermission(session.id,'auto');assert.equal(changed,'auto');assert.equal(session.permissionMode,'auto');assert.equal(adapter.closed,false);
});

test('Claude supports steering and image-only transport intersected with upstream declarations',async()=>{
 assert.deepEqual(interjectCapability({runtimeId:'claude',selection:{modelKey:'workbuddy:synthetic'}}),{steer:true,reason:null});const dir=await root(),executable=join(dir,'claude.exe');await writeFile(executable,'synthetic');const runtime={id:'claude',name:'Claude Code',status:'ready',executable,media:await inspectRuntimeMedia({id:'claude',status:'ready',executable})};assert.equal(runtime.media.image,true);assert.equal(runtime.media.audio,false);assert.equal(runtime.media.video,false);const selection={modelKey:'workbuddy:synthetic'},caps=mediaCapabilities(runtime,selection,{source:'workbuddy',images:true});assert.equal(caps.image.allowed,true);assert.equal(caps.audio.allowed,false);assert.equal(caps.video.allowed,false);assert.equal(mediaCapabilities(runtime,selection,{source:'workbuddy',images:false}).image.allowed,false);
});

test('Claude native window is always refused and startup placeholders/cache include the runtime',async()=>{
 const main=await readFile('app/main.mjs','utf8');assert.match(main,/if\(runtimeId==='claude'\)throw new Error\('Claude Code 在 Bridge\+\+ 里只作为工具执行器运行，不提供原生界面。'\)/);assert.ok(runtimePlaceholders().some(r=>r.id==='claude'&&r.protocol==='stream-json'));const userData=await root(),cache=new RuntimeCache({userData,appVersion:'synthetic'}),rows=runtimePlaceholders().map(r=>({...r,checking:undefined}));await cache.save(rows);const loaded=await cache.load();assert.ok(loaded.some(r=>r.id==='claude'));
});
