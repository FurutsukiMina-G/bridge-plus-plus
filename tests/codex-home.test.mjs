import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,stat,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {parse,stringify} from 'smol-toml';
import {gatewayCodexConfig,prepareCodexHome,codexSessionHome,codexBridgeHome,CODEX_GATEWAY_PLUGINS} from '../app/services/codex-config.mjs';
import {CodexAppServerAdapter,CodexAdapter,codexLaunchSettings} from '../app/runtimes/codex.mjs';
import {CodexExecAdapter} from '../app/runtimes/codex-exec.mjs';
import {ClaudeAdapter} from '../app/runtimes/claude.mjs';
import {AgentRules,rulesDocument} from '../app/services/agent-rules.mjs';
import {Store} from '../app/core/store.mjs';
import {launch} from '../app/core/process.mjs';

async function fixture(){await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/codex-home-')),sourceHome=join(root,'source');await mkdir(sourceHome);return {root,sourceHome};}
test('isolated config keeps exactly the approved tables and raw node_repl env, forcing unelevated',()=>{
  const node={command:'node',args:['mcp'],env:{CODEX_HOME:'fixture',CUSTOM:'value'}},config={windows:{sandbox:'elevated',other:1},notify:['secret-program'],model:'private',features:{apps:true},mcp_servers:{node_repl:node,private:{command:'x'}},marketplaces:{'openai-bundled':{source_type:'local',source:'fixture'},'openai-primary-runtime':{source_type:'local',source:'runtime'},'other':{source:'excluded'}},plugins:Object.fromEntries([...CODEX_GATEWAY_PLUGINS,'computer-use@openai-bundled','unified-computer-use@openai-bundled','browser@openai-bundled','codex-app-tools@openai-bundled'].map(key=>[key,{enabled:true}]))};
  const result=gatewayCodexConfig(config);assert.deepEqual(Object.keys(result),['windows','marketplaces','plugins','mcp_servers']);assert.deepEqual(result.windows,{sandbox:'unelevated'});assert.deepEqual(Object.keys(result.plugins),CODEX_GATEWAY_PLUGINS);assert.deepEqual(result.mcp_servers,{node_repl:node});assert.equal(Object.keys(result.marketplaces).length,2);assert.notEqual(result.mcp_servers.node_repl,node);
  assert.equal(gatewayCodexConfig({plugins:{}}).plugins,undefined);assert.deepEqual(gatewayCodexConfig(),{windows:{sandbox:'unelevated'}});
});
test('home preparation reads only config and allowed plugin trees, overwrites stale settings and incrementally syncs six plugins',async()=>{
  const {root,sourceHome}=await fixture(),config={windows:{sandbox:'elevated'},plugins:{},marketplaces:{'openai-bundled':{source_type:'local',source:'forbidden-user-tmp'}}};
  for(const key of CODEX_GATEWAY_PLUGINS){config.plugins[key]={enabled:true};const [name,scope]=key.split('@'),dir=join(sourceHome,'plugins/cache',scope,name,'1/skills');await mkdir(dir,{recursive:true});await writeFile(join(dir,'SKILL.md'),name);}
  await writeFile(join(sourceHome,'config.toml'),stringify(config));const reads=[];
  const first=await prepareCodexHome(root,{sourceHome,read:async(path,...args)=>{reads.push(path);return readFile(path,...args);},rulesText:'- 回复用中文'}),home=first.home;
  assert.deepEqual(reads,[join(sourceHome,'config.toml')]);assert.equal(first.notice,null);assert.equal(await readFile(join(home,'AGENTS.md'),'utf8'),rulesDocument('- 回复用中文'));assert.ok((await readFile(join(home,'AGENTS.md'),'utf8')).startsWith('# Bridge++ 长期要求\n'));
  const generated=parse(await readFile(join(home,'config.toml'),'utf8'));assert.equal(generated.windows.sandbox,'unelevated');assert.equal(generated.marketplaces['openai-bundled'].source,join(home,'.tmp/bundled-marketplaces/openai-bundled'));
  const skill=join(home,'plugins/cache/openai-bundled/visualize/1/skills/SKILL.md'),before=(await stat(skill)).mtimeMs;await writeFile(join(home,'config.toml'),'notify=["stale"]');await prepareCodexHome(root,{sourceHome});assert.equal((await stat(skill)).mtimeMs,before);await assert.rejects(readFile(join(home,'AGENTS.md')),e=>e.code==='ENOENT');assert.equal((await readFile(join(home,'config.toml'),'utf8')).includes('notify'),false);
  assert.deepEqual((await readdir(join(home,'plugins/cache/openai-bundled'))),['visualize']);
});
test('missing or invalid source config degrades to windows only with a notice and no other reads',async()=>{
  for(const text of [null,'invalid = [']){const {root,sourceHome}=await fixture();if(text!==null)await writeFile(join(sourceHome,'config.toml'),text);const result=await prepareCodexHome(root,{sourceHome});assert.ok(result.notice);assert.deepEqual(JSON.parse(JSON.stringify(parse(await readFile(join(result.home,'config.toml'),'utf8')))),{windows:{sandbox:'unelevated'}});}
});
test('home selection separates new/marked/legacy/native sessions and leaves native exec unchanged',()=>{
  const root=resolve('.runtime/tests/home-selection'),gateway={selection:{modelKey:'qoder:fixture'}};
  assert.equal(codexSessionHome(gateway,root),codexBridgeHome(root));assert.equal(codexSessionHome({...gateway,nativeId:'old'},root),null);assert.equal(codexSessionHome({...gateway,nativeId:'old',nativeHome:'bridge'},root),codexBridgeHome(root));assert.equal(codexSessionHome({selection:{modelKey:'native'},nativeHome:'bridge'},root),null);
  assert.ok(new CodexAdapter({session:{selection:{modelKey:'native'}}}) instanceof CodexExecAdapter);
  const options={session:gateway,endpoint:{baseURL:'fixture',key:'fixture'},variant:{id:'model'},model:{}};assert.equal(codexLaunchSettings(options).env.CODEX_HOME,undefined);assert.equal(codexLaunchSettings({...options,nativeHome:codexBridgeHome(root)}).env.CODEX_HOME,codexBridgeHome(root));assert.ok(codexLaunchSettings({...options,nativeHome:codexBridgeHome(root)}).args.includes('windows.sandbox="unelevated"'));
});
test('actual adapter launches with selected home and persists home with native ID; legacy resume prepares nothing',async t=>{
  const {root,sourceHome}=await fixture(),store=await new Store(root).open(),rules=new AgentRules(store);t.after(()=>store.close());await rules.append('回复用中文');
  for(const mode of ['new','marked','legacy']){
    const session={id:mode,selection:{modelKey:'qoder:fixture'},...(mode==='new'?{}:{nativeId:'old'}),...(mode==='marked'?{nativeHome:'bridge'}:{})};let settings,metadata;
    const adapter=new CodexAppServerAdapter({session,dir:join(root,'sessions',mode),project:{path:root},runtime:{executable:process.execPath},model:{},variant:{id:'fixture'},endpoint:{baseURL:'http://127.0.0.1:1',key:'fixture'},agentRules:rules,codexHomeOptions:{sourceHome},emit:async()=>{},saveNative:async(id,fields)=>{metadata={id,...fields};},launchProcess:(_command,args,options)=>{settings=options;return launch(process.execPath,[resolve('tests/fixtures/permission-native.mjs'),...args],options);}});t.after(()=>adapter.close());await adapter.start();
    if(mode==='legacy'){assert.equal(settings.env.CODEX_HOME,undefined);assert.equal(metadata.nativeHome,undefined);assert.equal(adapter.rolloutMedia.home,resolve(process.env.CODEX_HOME??join(process.env.USERPROFILE,'.codex')));}
    else{assert.equal(settings.env.CODEX_HOME,codexBridgeHome(root));assert.equal(metadata.nativeHome,'bridge');assert.ok(metadata.rulesVersion);assert.equal(adapter.rolloutMedia.home,codexBridgeHome(root));assert.equal(await readFile(join(codexBridgeHome(root),'AGENTS.md'),'utf8'),rulesDocument('- 回复用中文'));}
    await adapter.close();
  }
});
test('Claude startup writes and deletes managed CLAUDE.md from the shared rule snapshot',async t=>{
  const {root}=await fixture(),store=await new Store(root).open(),rules=new AgentRules(store),configDir=join(root,'engines/claude-code/config');t.after(()=>store.close());
  const row=await rules.append('回复用中文');
  async function start(){const session={id:'claude-fixture',selection:{modelKey:'qoder:fixture'}},adapter=new ClaudeAdapter({session,configDir,runtime:{executable:process.execPath},project:{path:root},variant:{id:'fixture'},endpoint:{baseURL:'http://127.0.0.1:1',key:'fixture'},agentRules:rules,emit:async()=>{},saveNative:async(id,fields)=>Object.assign(session,{nativeId:id},fields)});t.after(()=>adapter.close());adapter.control=async()=>({account:{tokenSource:'ANTHROPIC_AUTH_TOKEN'}});adapter.launchProcess=()=>{throw new Error('stop after managed file preparation');};await assert.rejects(adapter.start(),/stop after/);return session;}
  const session=await start();assert.equal(await readFile(join(configDir,'CLAUDE.md'),'utf8'),rulesDocument('- 回复用中文'));assert.ok(session.rulesVersion);await rules.remove(row.id);await start();await assert.rejects(readFile(join(configDir,'CLAUDE.md')),e=>e.code==='ENOENT');
});
