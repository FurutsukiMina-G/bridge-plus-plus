import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {launch} from '../app/core/process.mjs';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {MediaService} from '../app/services/media.mjs';
import {mediaCapabilities} from '../app/services/media-capabilities.mjs';
import {normalizeAntigravity} from '../app/core/catalog.mjs';
import {AntigravityAdapter} from '../app/runtimes/antigravity.mjs';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3cAAAAASUVORK5CYII=','base64');
async function fixture(t){
 await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/agy-integration-')),project=join(root,'project');await mkdir(project);const store=await new Store(join(root,'userdata')).open();await store.mutate(s=>{s.projects=[{id:'p',path:project}];s.sessions=[{id:'s',projectId:'p',runtimeId:'antigravity',selection:{modelKey:'native',nativeModel:'gemini-3.8-flash-low'},status:'idle'}];});
 const media=await new MediaService(store).init(),model=normalizeAntigravity({id:'gemini-3.8-flash-low'}),runtime={id:'antigravity',installed:true,executable:process.execPath,media:{image:true,audio:true,video:true}},caps=mediaCapabilities(runtime,{modelKey:model.key},model);
 t.after(()=>store.close());return {root,project,store,media,runtime,caps,session:store.session('s')};
}
test('real local agy peer sees only the claimed session directory, reads all modalities and the journal retains the original user text',{timeout:15000},async t=>{
 const f=await fixture(t);let adapter;class Peer extends AntigravityAdapter {constructor(options){super({...options,launchProcess:(_c,args,opts)=>launch(process.execPath,[resolve('tests/fixtures/antigravity-media-native.mjs'),...args],opts)});adapter=this;}}
 const sessions=new Sessions(f.store,null,null,[f.runtime],{media:f.media,capabilities:async()=>f.caps,constructors:{antigravity:Peer}});t.after(()=>sessions.close());
 const staged=[];for(const [name,data]of [['原图.png',png],['录音.wav',Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WAVEfmt '),Buffer.alloc(24)])],['视频.mp4',Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(20)])]])staged.push(await f.media.stage({projectId:'p',name,data}));
 let end;const ended=new Promise(r=>{end=r;});f.store.on('event',e=>{if(e.type==='turn-end')end(e);});await sessions.prompt('s','用户原文',staged.map(a=>a.id));const run=sessions.runs.get('s');assert.equal((await ended).status,'completed');await adapter.active.queue;await run.events;
 const events=await f.store.events('s'),user=events.find(e=>e.type==='user');assert.equal(user.text,'用户原文');assert.equal(user.attachments.length,3);assert.equal(JSON.stringify(user).includes('view_file'),false);assert.equal(JSON.stringify(user).includes('Windows绝对路径'),false);assert.equal(f.session.nativeId,'native-agy-fixture');assert.equal(f.session.status,'completed');
 const reply=JSON.parse(events.find(e=>e.type==='text').text);assert.equal(reply.files.length,3);assert.equal(reply.args[reply.args.indexOf('--add-dir')+1],join(f.store.root,'media/sessions/s'));for(const file of reply.files)assert.equal(file.Windows绝对路径.startsWith(join(f.store.root,'media/sessions/s')+'\\'),true);
});
function video(size){const bytes=Buffer.alloc(size);Buffer.from([0,0,0,24]).copy(bytes);Buffer.from('ftypisom').copy(bytes,4);return bytes;}
test('claim accepts a 16 MiB agy video, rejects single/combined excess and GIF before moving staged files',{timeout:15000},async t=>{
 const f=await fixture(t),limit=16*1024*1024;
 const exact=await f.media.stage({projectId:'p',name:'exact.mp4',data:video(limit)}),claimed=await f.media.claim(f.session,[exact.id],f.caps);assert.equal(claimed[0].size,limit);await f.media.rollback(claimed);
 const large=await f.media.stage({projectId:'p',name:'too-large.mp4',data:video(limit+1)});await assert.rejects(f.media.claim(f.session,[large.id],f.caps),/单文件大小上限/);assert.equal(f.media.entries.get(large.id).sessionId,undefined);
 const a=await f.media.stage({projectId:'p',name:'a.mp4',data:video(limit/2)}),b=await f.media.stage({projectId:'p',name:'b.mp4',data:video(limit/2+1)});await assert.rejects(f.media.claim(f.session,[a.id,b.id],f.caps),/总大小超过 16 MiB/);assert.equal(f.media.entries.get(a.id).sessionId,undefined);assert.equal(f.media.entries.get(b.id).sessionId,undefined);
 const gif=await f.media.stage({projectId:'p',name:'still.gif',data:Buffer.from('GIF89afixture')});await assert.rejects(f.media.claim(f.session,[gif.id],f.caps),/MIME/);assert.equal(f.media.entries.get(gif.id).sessionId,undefined);
 f.session.runtimeId='codex';await assert.rejects(f.media.claim(f.session,[exact.id],f.caps),/不存在/);
 const old=await f.media.stage({projectId:'p',name:'old-limit.mp4',data:video(13*1024*1024)});await assert.rejects(f.media.claim(f.session,[old.id],{video:{allowed:true}}),/总大小超过 12 MiB/);
});
