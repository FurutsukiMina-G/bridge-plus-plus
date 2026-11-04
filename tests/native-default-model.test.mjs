import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {join,resolve,basename} from 'node:path';
import {readCodexDefaultModel} from '../app/services/codex-config.mjs';
import {nativeModels} from '../app/services/native-models.mjs';
import {AttachmentCapabilities,NativeMediaCatalog} from '../app/services/attachment-capabilities.mjs';
import {mediaCapabilities} from '../app/services/media-capabilities.mjs';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {MediaService} from '../app/services/media.mjs';
import {CodexExecAdapter} from '../app/runtimes/codex-exec.mjs';
import {launch} from '../app/core/process.mjs';
const runtime={id:'codex',installed:true,executable:process.execPath,media:{image:true,audio:true,nativeExec:{image:true,audio:false,video:false}}};
const selection=()=>({modelKey:'native',nativeModel:''});
const cache={models:[{slug:'fixture-text',visibility:'list',input_modalities:['text']},{slug:'fixture-vision',visibility:'list',input_modalities:['text','image','audio']},{slug:'fixture-unknown',visibility:'list'}]};
async function fixture(config){
 await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/native-default-')),home=join(root,'codex-home');await mkdir(home);if(config!==undefined)await writeFile(join(home,'config.toml'),config);await writeFile(join(home,'models_cache.json'),JSON.stringify(cache));
 let catalogReads=0,configReads=0;const catalog=new NativeMediaCatalog({read:async(r,cwd)=>{catalogReads++;return nativeModels(r,cwd,{home});}});
 const capabilities=new AttachmentCapabilities({runtimes:()=>[runtime],sessions:()=>({validate:(_id,value)=>value,selectionIssue:()=>null}),providers:()=>({get:()=>assert.fail('native selection must not query a provider')}),cwd:()=>root,catalog,codexDefault:async()=>{configReads++;return readCodexDefaultModel({home});}});
 return {root,home,catalog,capabilities,counts:()=>({catalogReads,configReads})};
}
for(const [name,config,modelId,reason]of [
 ['top-level model','model = "fixture-vision"\n','fixture-vision',null],
 ['active profile','model = "fixture-text"\nprofile = "vision"\n[profiles.vision]\nmodel = "fixture-vision"\n','fixture-vision',null],
 ['no model','approval_policy = "never"\n',null,'config.toml 没有设置 model'],
 ['missing file',undefined,null,'config.toml 不存在'],
 ['invalid TOML','model = "fixture-vision"\ninvalid = "fixture-private-value',null,'config.toml 解析失败'],
 ['profile missing model','model = "fixture-vision"\nprofile = "empty"\n[profiles.empty]\nother = true\n',null,'config.toml 当前 profile 没有设置 model']
])test(`Codex current default resolves ${name} without persisting it in selection`,async()=>{
 const f=await fixture(config),resolved=await readCodexDefaultModel({home:f.home});assert.deepEqual(resolved,{modelId,reason});const selected=selection(),before=structuredClone(selected),caps=await f.capabilities.forSelection('codex',selected);assert.deepEqual(selected,before);assert.equal(caps.image.allowed,modelId!==null);assert.equal(caps.audio.allowed,false);assert.equal(caps.video.allowed,false);
 if(reason){assert.match(caps.image.reason,/无法确定原生 Codex 当前使用的模型/);assert.ok(caps.image.reason.includes(reason));assert.match(caps.image.reason,/请在模型菜单里选定原生模型 ID 后再添加附件/);assert.equal(caps.image.reason.includes('fixture-private-value'),false);assert.equal(f.counts().catalogReads,0);}
});
test('Codex config changes are read on every capability lookup even with a retained catalog cache',async()=>{
 const f=await fixture('model = "fixture-vision"\n'),selected=selection();assert.equal((await f.capabilities.forSelection('codex',selected)).image.allowed,true);
 await writeFile(join(f.home,'config.toml'),'model = "fixture-text"\n');assert.equal((await f.capabilities.forSelection('codex',selected)).image.allowed,false);
 await writeFile(join(f.home,'config.toml'),'model = "fixture-unknown"\n');assert.equal((await f.capabilities.forSelection('codex',selected)).image.allowed,false);
 await writeFile(join(f.home,'config.toml'),'model = "not-in-cache"\n');assert.equal((await f.capabilities.forSelection('codex',selected)).image.allowed,false);
 assert.deepEqual(f.counts(),{configReads:4,catalogReads:1});assert.equal(selected.nativeModel,'');
});
test('native Codex catalog marks only the freshly resolved default and retains unknown default flags on other rows',async()=>{
 const f=await fixture('model = "fixture-vision"\n');let models=await f.catalog.get(runtime,f.root,{refresh:true});assert.equal(models[0].isDefault,null);assert.equal(models[1].isDefault,true);assert.equal(models[2].isDefault,null);
 await writeFile(join(f.home,'config.toml'),'profile = "plain"\n[profiles.plain]\nmodel = "fixture-text"\n');models=await f.catalog.get(runtime,f.root,{refresh:true});assert.equal(models[0].isDefault,true);assert.equal(models[1].isDefault,null);
 await writeFile(join(f.home,'config.toml'),'other = true\n');models=await f.catalog.get(runtime,f.root,{refresh:true});assert.ok(models.every(m=>m.isDefault===null));
});
test('Codex default resolution honors fixture CODEX_HOME and reads only config and model cache files',async t=>{
 const f=await fixture('model = "fixture-vision"\n'),previous=process.env.CODEX_HOME;process.env.CODEX_HOME=f.home;t.after(()=>{if(previous===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=previous;});
 assert.equal((await readCodexDefaultModel()).modelId,'fixture-vision');assert.equal((await nativeModels(runtime,f.root)).find(m=>m.isDefault).id,'fixture-vision');
 const paths=[];await nativeModels(runtime,f.root,{home:f.home,read:async(path,encoding)=>{paths.push(basename(path));return readFile(path,encoding);}});assert.deepEqual(paths.sort(),['config.toml','models_cache.json']);
 const denied=await readCodexDefaultModel({read:async()=>{throw Object.assign(new Error('fixture-private-value'),{code:'EACCES'});}});assert.deepEqual(denied,{modelId:null,reason:'config.toml 无法读取'});
});
test('explicit native Codex model bypasses default parsing and still requires verified exec transport',async()=>{
 const f=await fixture();f.capabilities.codexDefault=async()=>assert.fail('explicit selection must not read config');assert.equal((await f.capabilities.forSelection('codex',{modelKey:'native',nativeModel:'fixture-vision'})).image.allowed,true);
 f.capabilities.runtimes=()=>[{...runtime,media:{nativeExec:{image:false}}}];assert.equal((await f.capabilities.forSelection('codex',{modelKey:'native',nativeModel:'fixture-vision'})).image.allowed,false);
});
test('Antigravity current default remains unknown with actionable Gemini selection guidance',()=>{
 for(const nativeModel of ['',undefined]){const caps=mediaCapabilities({id:'antigravity',media:{image:true,audio:true,video:true}},{modelKey:'native',nativeModel});for(const kind of ['image','audio','video']){assert.equal(caps[kind].allowed,false);assert.equal(caps[kind].reason,'无法确认 Antigravity 原生当前模型是否为 Gemini，请在模型菜单里选择 Antigravity · Gemini 来源的模型，或填写原生 Gemini 模型 ID 后再添加附件');}}
});
test('current-default Codex sends an attachment through the shared capability/claim path without pinning -m',{timeout:15000},async t=>{
 const f=await fixture('model = "fixture-vision"\n'),project=join(f.root,'project');await mkdir(project);const store=await new Store(join(f.root,'userdata')).open();await store.mutate(s=>{s.projects=[{id:'p',path:project}];});const media=await new MediaService(store).init();let adapter;const calls=[];
 class Peer extends CodexExecAdapter {constructor(options){super({...options,rolloutMedia:{checkpoint:async()=>({id:null,file:null}),read:async()=>{}},launchProcess:(_command,args,opts)=>{calls.push(args);return launch(process.execPath,[resolve('tests/fixtures/codex-exec-native.mjs'),...args],opts);}});adapter=this;}}
 const sessions=new Sessions(store,null,null,[runtime],{media,constructors:{codex:Peer},capabilities:(id,value)=>f.capabilities.forSelection(id,value)});f.capabilities.sessions=()=>sessions;t.after(async()=>{await sessions.close();await store.close();});
 const session=await sessions.create({projectId:'p',runtimeId:'codex',selection:selection()}),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3cAAAAASUVORK5CYII=','base64'),staged=await media.stage({projectId:'p',name:'image.png',data:png});
 assert.equal((await f.capabilities.forSelection('codex',session.selection)).image.allowed,true);let end;const ended=new Promise(r=>{end=r;});store.on('event',e=>{if(e.type==='turn-end')end(e);});await sessions.prompt(session.id,'描述附件',[staged.id]);assert.equal((await ended).status,'completed');await adapter.active.queue;
 assert.equal(session.selection.nativeModel,'');assert.equal(calls.length,1);assert.equal(calls[0].includes('-m'),false);assert.ok(calls[0].includes('-i'));const user=(await store.events(session.id)).find(e=>e.type==='user');assert.equal(user.attachments[0].id,staged.id);assert.equal(user.text,'描述附件');
 const later=await media.stage({projectId:'p',name:'later.png',data:png});await writeFile(join(f.home,'config.toml'),'model = "fixture-text"\n');await assert.rejects(sessions.prompt(session.id,'再次描述',[later.id]),/未声明支持图片/);assert.equal(calls.length,1);assert.equal(media.entries.get(later.id).sessionId,undefined);assert.equal(session.selection.nativeModel,'');assert.equal(f.counts().catalogReads,1);
});
