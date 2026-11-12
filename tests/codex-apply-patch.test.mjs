import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {CodexAppServerAdapter,codexLaunchSettings} from '../app/runtimes/codex.mjs';
import {launch} from '../app/core/process.mjs';
import {codexBaseInstructionsFromRequest,codexCatalogUnsupported,codexModelCatalogEntry,codexWorkspaceRoot,markCodexCatalogUnsupported,readCodexBaseInstructions,recordCodexBaseInstructions,recordCodexBaseInstructionsForSession,recordCodexRuntime,writeCodexModelCatalog} from '../app/services/codex-config.mjs';

const VERSION='codex-cli 0.167.0-alpha.3.2',NEXT='codex-cli 0.168.0';
const BASE='You are a coding agent running in the Codex CLI.\nUse apply_patch to edit files.';
const peer=resolve('tests/fixtures/permission-native.mjs');
async function workspace(t){
  await mkdir(resolve('.runtime/tests'),{recursive:true});
  const root=await mkdtemp(resolve('.runtime/tests/codex-catalog-'));
  t.after(()=>{});
  return root;
}

test('the fallback base instructions are recorded once per Codex version, without the conversation',async t=>{
  const root=await workspace(t),sessionId='session-record';
  recordCodexRuntime(sessionId,VERSION);
  const body={input:[{role:'developer',content:[{type:'input_text',text:BASE}]},{role:'user',content:[{type:'input_text',text:'private task text'}]}]};
  const file=await recordCodexBaseInstructionsForSession(root,sessionId,body);
  assert.equal(file,join(root,'engines','codex','base-instructions-0.167.0-alpha.3.2.txt'));
  assert.equal(await readFile(file,'utf8'),BASE);
  const second=await recordCodexBaseInstructionsForSession(root,sessionId,{input:[{role:'developer',content:[{type:'input_text',text:'different text'}]}]});
  assert.equal(second,file);
  assert.equal(await readFile(file,'utf8'),BASE,'the text recorded first for a version is kept');
  assert.equal((await readFile(file,'utf8')).includes('private task text'),false);
  assert.equal(await readCodexBaseInstructions(root,NEXT),null);
  assert.equal(await recordCodexBaseInstructionsForSession(root,'unknown-session',body),null,'no known Codex version means no recording');
  assert.equal(codexBaseInstructionsFromRequest({instructions:'system text',input:[]}),'system text');
});

test('the catalog entry declares apply_patch and leaves every other field to Codex defaults',async t=>{
  const root=await workspace(t),dir=join(root,'sessions','catalog-session');
  const file=await writeCodexModelCatalog(dir,{slug:'awb-model',displayName:'Bridge Model',baseInstructions:BASE});
  const entry=JSON.parse(await readFile(file,'utf8')).models[0];
  assert.equal(entry.slug,'awb-model');
  assert.equal(entry.base_instructions,BASE);
  assert.equal(entry.apply_patch_tool_type,'freeform');
  assert.deepEqual(entry.truncation_policy,{mode:'tokens',limit:10000});
  assert.deepEqual(entry.supported_reasoning_levels.map(level=>level.effort),['low','medium','high','xhigh']);
  assert.deepEqual({shell:entry.shell_type,visibility:entry.visibility,api:entry.supported_in_api,priority:entry.priority,verbosity:entry.support_verbosity},{shell:'unified_exec',visibility:'list',api:true,priority:13,verbosity:true});
  assert.deepEqual({summary:entry.default_reasoning_summary,search:entry.web_search_tool_type,modalities:entry.input_modalities,imageOriginal:entry.supports_image_detail_original,percent:entry.effective_context_window_percent,lite:entry.use_responses_lite},{summary:'auto',search:'text',modalities:['text','image'],imageOriginal:false,percent:95,lite:false},'remaining values equal the fallback metadata resolution');
  assert.equal('context_window' in entry,false,'fields the fallback leaves unset stay omitted');
  assert.equal(codexModelCatalogEntry({slug:'x',baseInstructions:'y'}).display_name,'x');
  assert.equal(codexWorkspaceRoot(dir),root);
});

test('launch settings add model_catalog_json only for a prepared catalog',()=>{
  const base={session:{selection:{reasoning:'high'}},endpoint:{baseURL:'http://127.0.0.1:1',key:'fixture'},model:{},variant:{id:'awb-model'}};
  assert.equal(codexLaunchSettings(base).args.some(arg=>arg.includes('model_catalog_json')),false);
  const catalog='D:\\data\\sessions\\s1\\model-catalog.json',args=codexLaunchSettings({...base,catalogPath:catalog}).args;
  assert.ok(args.includes(`model_catalog_json=${JSON.stringify(catalog)}`));
  assert.ok(args.includes('model_provider="agentworkbench"'));
});

function fixture(t,{root,version=VERSION,rejectCatalog=false,dirName='adapter-session'}){
  const dir=join(root,'sessions',dirName),calls=[],events=[];
  const session={id:dirName,selection:{modelKey:'workbuddy:fixture'}};
  const runtime={id:'codex',executable:process.execPath,permissions:{observed:{version}}};
  const adapter=new CodexAppServerAdapter({runtime,session,project:{path:root},dir,model:{},variant:{id:'awb-model',name:'Awb Model'},endpoint:{baseURL:'http://127.0.0.1:1',key:'fixture'},codexHomeOptions:{sourceHome:join(root,'missing-home')},permissionMode:null,emit:async event=>{events.push(event);},saveNative:async id=>{session.nativeId=id;},launchProcess:(command,args,options)=>{
    calls.push(args);
    if(rejectCatalog&&args.some(arg=>arg.startsWith('model_catalog_json=')))throw new Error('failed to parse model_catalog_json path as JSON: unknown field `apply_patch_tool_type`');
    return launch(process.execPath,[peer,...args],{...options,env:{...options.env}});
  }});
  t.after(()=>adapter.close().catch(()=>{}));
  return {adapter,calls,events,dir};
}

test('a gateway Codex session starts with the recorded catalog entry',{timeout:15000},async t=>{
  const root=await workspace(t);
  await recordCodexBaseInstructions(root,VERSION,BASE);
  const f=fixture(t,{root});
  await f.adapter.start();
  const catalog=join(f.dir,'model-catalog.json');
  assert.ok(f.calls[0].includes(`model_catalog_json=${JSON.stringify(catalog)}`));
  const entry=JSON.parse(await readFile(catalog,'utf8')).models[0];
  assert.equal(entry.slug,'awb-model');
  assert.equal(entry.apply_patch_tool_type,'freeform');
  assert.equal(entry.base_instructions,BASE);
});

test('no catalog is used before the prompt is recorded, or after a version was rejected',{timeout:15000},async t=>{
  const root=await workspace(t);
  const fresh=fixture(t,{root,dirName:'fresh-session'});
  await fresh.adapter.start();
  assert.equal(fresh.calls[0].some(arg=>arg.startsWith('model_catalog_json=')),false);
  await recordCodexBaseInstructions(root,VERSION,BASE);
  await markCodexCatalogUnsupported(root,VERSION);
  const refused=fixture(t,{root,dirName:'refused-session'});
  await refused.adapter.start();
  assert.equal(refused.calls[0].some(arg=>arg.startsWith('model_catalog_json=')),false);
});

test('a rejected catalog falls back once, remembers the version, and is retried after an upgrade',{timeout:20000},async t=>{
  const root=await workspace(t);
  await recordCodexBaseInstructions(root,VERSION,BASE);
  const f=fixture(t,{root,rejectCatalog:true});
  await f.adapter.start();
  assert.equal(f.calls.length,2);
  assert.ok(f.calls[0].includes(`model_catalog_json=${JSON.stringify(join(f.dir,'model-catalog.json'))}`));
  assert.equal(f.calls[1].some(arg=>arg.startsWith('model_catalog_json=')),false,'the session restarts without the catalog');
  assert.ok(f.events.some(event=>event.type==='notice'&&/退回/.test(event.text)),'the session carries a notice about the fallback');
  assert.equal(await codexCatalogUnsupported(root,VERSION),true);
  assert.equal(await codexCatalogUnsupported(root,NEXT),false);
  const again=fixture(t,{root,dirName:'second-session'});
  await again.adapter.start();
  assert.equal(again.calls[0].some(arg=>arg.startsWith('model_catalog_json=')),false,'the same version is not retried');
  await recordCodexBaseInstructions(root,NEXT,BASE);
  const upgraded=fixture(t,{root,version:NEXT,dirName:'upgraded-session'});
  await upgraded.adapter.start();
  assert.ok(upgraded.calls[0].includes(`model_catalog_json=${JSON.stringify(join(upgraded.dir,'model-catalog.json'))}`),'an upgrade tries again');
});
