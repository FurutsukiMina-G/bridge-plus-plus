import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {MediaService} from '../app/services/media.mjs';
import {CodexRolloutMedia} from '../app/services/codex-rollout-media.mjs';
import {CodexExecAdapter} from '../app/runtimes/codex-exec.mjs';
import {launch} from '../app/core/process.mjs';
const nativeId='00000000-0000-7000-8000-000000000001';
for(const mode of ['inline','saved'])test(`exec ${mode} Extension output becomes one durable media event even with an empty final answer`,{timeout:15000},async t=>{
 await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/codex-generated-')),project=join(root,'project'),home=join(root,'codex-home');await mkdir(project);
 const store=await new Store(join(root,'userdata')).open();await store.mutate(s=>{s.projects=[{id:'p',path:project}];});const media=await new MediaService(store).init();let adapter;
 class Peer extends CodexExecAdapter {constructor(options){super({...options,rolloutMedia:new CodexRolloutMedia(home),launchProcess:(_command,args,opts)=>launch(process.execPath,[resolve('tests/fixtures/codex-rollout-native.mjs'),home,nativeId,mode,...args],opts)});adapter=this;}}
 const sessions=new Sessions(store,null,null,[{id:'codex',installed:true,executable:process.execPath}],{media,constructors:{codex:Peer}});t.after(async()=>{await sessions.close();await store.close();});
 const session=await sessions.create({projectId:'p',runtimeId:'codex',selection:{modelKey:'native',nativeModel:'gpt-6.1-sol'}});let end;const ended=new Promise(r=>{end=r;});store.on('event',e=>{if(e.type==='turn-end')end(e);});
 await sessions.prompt(session.id,'生成图片');assert.equal((await ended).status,'completed');await adapter.active.queue;assert.equal(session.nativeId,nativeId);assert.equal(session.status,'completed');
 const events=await store.events(session.id),outputs=events.filter(e=>e.type==='media');assert.equal(outputs.length,1);assert.equal(session.mediaAttachments.length,1);assert.equal(outputs[0].origin.itemId,'exec-image-fixture');assert.equal(outputs[0].mime,'image/png');assert.ok(events.findIndex(e=>e.type==='media')<events.findIndex(e=>e.type==='turn-end'));
 const fixture=JSON.parse(await readFile(new URL('./fixtures/codex-image-extension.json',import.meta.url),'utf8')),response=await media.response(new Request(outputs[0].url));assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from(fixture.payload.item.result,'base64'));assert.equal(JSON.stringify(events).includes(fixture.payload.item.result),false);
 if(mode==='saved')await assert.rejects(media.importOutput(session,{path:join(home,'generated_images',nativeId,'generated.data')}),/超出允许目录/);
});
