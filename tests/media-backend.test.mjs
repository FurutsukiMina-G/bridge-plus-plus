import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,symlink,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {MediaService,detectMedia,inside,redactMedia} from '../app/services/media.mjs';
import {mediaCapabilities,deniedMediaCapabilities,MEDIA_LIMITS,MAX_ATTACHMENTS_PER_TURN,MAX_ATTACHMENT_BYTES_PER_TURN} from '../app/services/media-capabilities.mjs';
import {historyText,textHistory} from '../app/services/history-content.mjs';
import {responseToChat} from '../app/services/responses.mjs';
import {CodexAdapter} from '../app/runtimes/codex.mjs';
import {KimiAcpAdapter} from '../app/runtimes/kimi-acp.mjs';
import {DshAdapter} from '../app/runtimes/dsh.mjs';
import {AntigravityAdapter} from '../app/runtimes/antigravity.mjs';
import {RuntimeLifecycle} from '../app/core/lifecycle.mjs';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3cAAAAASUVORK5CYII=','base64');
const data=png.toString('base64'),url='data:image/png;base64,'+data,part={type:'image_url',image_url:{url}};
async function fixture(t){await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/media-')),project=join(root,'project'),outside=join(root,'outside');await mkdir(project);await mkdir(outside);const store=await new Store(join(root,'userdata')).open();await store.mutate(s=>{s.projects=[{id:'p',path:project}];s.sessions=[{id:'session',projectId:'p',runtimeId:'codex',selection:{modelKey:'native'},status:'idle'}];});const media=await new MediaService(store).init();t.after(()=>store.close());return {root,project,outside,store,media,session:store.session('session')};}
test('capability matrix requires both observed runtime and exact declared source/native modality',()=>{
 for(const runtimeId of ['codex','kimi','dsh','antigravity'])for(const source of ['qoder','workbuddy','antigravity'])for(const images of [true,false,null]){
   const runtime={id:runtimeId,name:runtimeId,media:{image:runtimeId!=='antigravity',audio:runtimeId==='codex'}},c=mediaCapabilities(runtime,{modelKey:source+':m'},{source,images,...source==='antigravity'?{boundRuntime:'antigravity'}:{}});
   assert.equal(c.image.allowed,images===true&&runtimeId!=='antigravity'&&source!=='antigravity');assert.equal(c.audio.allowed,false);assert.equal(c.video.allowed,false);for(const kind of Object.keys(MEDIA_LIMITS)){const v=c[kind];assert.equal(v.maxBytes,runtimeId==='antigravity'?Math.min(MEDIA_LIMITS[kind],16*1024*1024):MEDIA_LIMITS[kind]);assert.ok(v.mimes.length);if(!v.allowed)assert.ok(v.reason);}assert.deepEqual(c.turn,{maxCount:MAX_ATTACHMENTS_PER_TURN,maxTotalBytes:runtimeId==='antigravity'?16*1024*1024:MAX_ATTACHMENT_BYTES_PER_TURN});
 }
 assert.equal(mediaCapabilities({media:{image:true}},{modelKey:'native'},null,{inputModalities:['text','image']}).image.allowed,true);
 assert.equal(mediaCapabilities({media:{image:true}},{modelKey:'native'},null,null).image.allowed,false);
 assert.deepEqual(deniedMediaCapabilities('fixture').turn,{maxCount:MAX_ATTACHMENTS_PER_TURN,maxTotalBytes:MAX_ATTACHMENT_BYTES_PER_TURN});
});
test('staging validates name, extension, magic, kind size and project; discard revokes URL',async t=>{
 const f=await fixture(t),stage=(name,bytes=png)=>f.media.stage({projectId:'p',name,data:bytes});
 const a=await stage('图片.PNG');assert.equal(a.kind,'image');assert.equal(a.size,png.length);assert.match(a.url,/^bridge-media:\/\/media\/[a-f0-9-]+$/);assert.equal('path' in a,false);
 for(const name of ['../x.png','..\\x.png','C:\\x.png','x/ok.png','.','..','bad.png.','bad.png ','bad\u0001.png','bad\u007f.png'])await assert.rejects(stage(name),/文件名|穿越/);
 for(const name of ['截图..png','a..b.png','标签:截图.png']){const accepted=await stage(name);assert.equal(accepted.name,name);assert.match(f.media.entries.get(accepted.id).path,/[a-f0-9-]{36}\.png$/);await f.media.discard(accepted.id);}
 await assert.rejects(stage('x.jpg'),/文件头/);await assert.rejects(stage('x.svg'),/扩展名/);await assert.rejects(stage('x.png',Buffer.from('fake')),/文件头/);
 const big=Buffer.alloc(MEDIA_LIMITS.image+1);png.copy(big);await assert.rejects(stage('big.png',big),/上限/);
 await assert.rejects(f.media.stage({projectId:'missing',name:'x.png',data:png}),/Project/);
 await f.media.discard(a.id);assert.equal((await f.media.response(new Request(a.url))).status,404);
});
test('local protocol serves bounded ranges and HEAD; rejects traversal, unknown IDs, nonmedia and junction escape',async t=>{
 const f=await fixture(t),a=await f.media.stage({projectId:'p',name:'x.png',data:png});
 const request=(range,method='GET')=>f.media.response(new Request(a.url,{method,headers:range?{range}:{}}));
 let r=await request('bytes=2-8');assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),`bytes 2-8/${png.length}`);assert.equal(r.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await r.arrayBuffer()),png.subarray(2,9));
 r=await request('bytes=-5');assert.deepEqual(Buffer.from(await r.arrayBuffer()),png.subarray(-5));r=await request('bytes=8-');assert.equal((await r.arrayBuffer()).byteLength,png.length-8);
 for(const range of ['bytes=9999-','bytes=7-2','bytes=0-2,5-9','bytes=-0','bytes=-','bytes=999999999999999999999999-'])assert.equal((await request(range)).status,416,range);
 r=await request(null,'HEAD');assert.equal(r.status,200);assert.equal(await r.text(),'');assert.equal(r.headers.get('content-length'),String(png.length));assert.equal((await request(null,'POST')).status,405);
 assert.equal((await f.media.response(new Request('bridge-media://media/../../secret'))).status,404);
 await writeFile(join(f.project,'good.png'),png);await writeFile(join(f.project,'secret.txt'),'secret');await writeFile(join(f.outside,'outside.png'),png);
 assert.ok((await f.media.resolve('session','good.png')).url);assert.equal(await f.media.resolve('session','secret.txt'),null);assert.equal(await f.media.resolve('session','../outside/outside.png'),null);assert.equal(await f.media.resolve('session','https://example.com/x.png'),null);
 assert.equal(await f.media.resolve('session','sub/%2e%2e/good.png'),null);
 await symlink(f.outside,join(f.project,'escape'),'junction');assert.equal(await f.media.resolve('session','escape/outside.png'),null);assert.equal(inside(f.project,f.project+'-sibling/x.png'),false);
 const entry=f.media.entries.get(a.id);await writeFile(entry.path,'not media');assert.equal((await request()).status,404);
});
test('claim enforces capability, ownership, count and one-use IDs; restart retains durable session media',async t=>{
 const f=await fixture(t),a=await f.media.stage({projectId:'p',name:'x.PNG',data:png}),deny={image:{allowed:false,reason:'上游未声明'}};
 await assert.rejects(f.media.claim(f.session,[a.id],deny),/未声明/);await assert.rejects(f.media.claim(f.session,[a.id,a.id],{image:{allowed:true}}),/列表/);
 await assert.rejects(f.media.claim(f.session,[a.id],{image:{allowed:true,mimes:['image/jpeg']}}),/MIME/);assert.equal(f.media.entries.get(a.id).sessionId,undefined);
 const rows=await f.media.claim(f.session,[a.id],{image:{allowed:true}});assert.equal(rows[0].sessionId,'session');assert.equal(inside(f.project,rows[0].path),false);await f.media.discard(a.id);assert.equal((await f.media.response(new Request(a.url,{method:'HEAD'}))).status,200);
 await assert.rejects(f.media.claim(f.session,[a.id],{image:{allowed:true}}),/已发送/);await f.store.mutate(()=>{f.session.mediaAttachments=[f.media.public(rows[0])];});
 const reopened=await new MediaService(f.store).init();assert.equal((await reopened.response(new Request(a.url,{method:'HEAD'}))).status,200);
});
test('audio/video output files use typed protocol streams and video Range; image containers cannot masquerade as MP4',async t=>{
 const f=await fixture(t),wav=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WAVEfmt '),Buffer.alloc(24)]),mp4=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(20)]);
 for(const [bytes,mime,name]of [[wav,'audio/wav','sound.wav'],[mp4,'video/mp4','clip.mp4']]){const a=await f.media.importOutput(f.session,{data:bytes.toString('base64'),mime,name,origin:{runtimeId:'fixture'}}),response=await f.media.response(new Request(a.url,{headers:{range:'bytes=4-11'}}));assert.equal(response.status,206);assert.equal(response.headers.get('content-type'),mime);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(4,12));}
 assert.throws(()=>detectMedia('wrong.mp4',Buffer.concat([Buffer.alloc(4),Buffer.from('ftypavif'),Buffer.alloc(16)])),/文件头/);
 assert.throws(()=>detectMedia('wrong.mp3',Buffer.from([255,241,80,128,0,0,0])),/文件头/);
});
test('gateway preserves actual inline image content for declared images and explicitly omits others without fetching',()=>{
 assert.equal(textHistory([{role:'user',content:[{type:'text',text:'look'},part]}],true).messages[0].content[1].image_url.url,url);
 const omitted=textHistory([{role:'user',content:[part,{type:'audio',data:'audio'}]}],false);assert.equal(omitted.omitted.length,2);assert.match(omitted.messages[0].content,/NOT inspected/);
 const chat=responseToChat({model:'fixture',input:[{role:'user',content:[{type:'input_image',image_url:url}]}]},{images:true});assert.equal(chat.messages[0].content[0].image_url.url,url);
 assert.throws(()=>historyText([{type:'input_image',image_url:'http://127.0.0.1/secret'}],()=>{},true),/仅接受/);
 assert.throws(()=>historyText([{type:'input_image',image_url:'file:///C:/secret.png'}],()=>{},true),/仅接受/);
 assert.throws(()=>historyText([{type:'input_image',image_url:'data:image/jpeg;base64,'+data}],()=>{},true),/文件头/);
});
test('all runtime prompt payloads preserve supported media and unsupported inputs fail before launch',async t=>{
 const f=await fixture(t),path=join(f.project,'x.png');await writeFile(path,png);const a={kind:'image',mime:'image/png',name:'x.png',path},calls=[],emit=async()=>{},common={session:{selection:{}},project:{path:f.project},emit};
 const codex=new CodexAdapter(common);codex.ready=true;codex.threadId='thread';codex.rpc={request:async(method,params)=>{calls.push({method,params});return {turn:{id:'turn'}};}};await codex.prompt('',[a]);assert.deepEqual(calls.pop().params.input,[{type:'localImage',path}]);
 const kimi=new KimiAcpAdapter(common);kimi.ready=true;kimi.nativeId='native';kimi.promptCapabilities={image:true};kimi.rpc={request:async(method,params)=>{calls.push({method,params});return {stopReason:'end_turn'};}};await kimi.prompt('',[a]);assert.deepEqual(calls.pop().params.prompt,[{type:'image',mimeType:'image/png',data}]);kimi.promptCapabilities={image:false};await assert.rejects(kimi.prompt('',[a]),/握手/);
 const dsh=new DshAdapter({...common,host:{rpc:async(method,params)=>calls.push({method,params})}});dsh.ready=true;dsh.nativeId='native';dsh.stopStream=()=>{};await dsh.prompt('',[a]);assert.deepEqual(calls.pop().params.request.content,[{type:'image',mediaType:'image/png',data,name:'x.png'}]);
 const agy=new AntigravityAdapter({...common,runtime:{executable:'never-launch'},launchProcess:()=>{throw new Error('must not launch');}});await assert.rejects(agy.prompt('',[a]),/本会话媒体目录/);
});
test('runtime generated-image projections emit media bytes only to the media sink',async()=>{
 const events=[],common={session:{selection:{}},emit:async e=>events.push(e)};
 const codex=new CodexAdapter(common);await codex.message({method:'item/completed',params:{item:{type:'imageGeneration',id:'image',result:data}}});assert.equal(events[0].type,'media-output');assert.equal(events[0].data,data);assert.equal(redactMedia(events[1]).data.result,'[media omitted from journal]');
 const kimi=new KimiAcpAdapter(common);await kimi.message({method:'session/update',params:{update:{sessionUpdate:'agent_message_chunk',content:{type:'audio',mimeType:'audio/wav',data:'UklGRg=='}}}});assert.equal(events.at(-1).mime,'audio/wav');
 const dsh=new DshAdapter({...common,host:{}});dsh.running=true;await dsh.handleEvent({type:'assistant/message',seq:1,data:{message:{content:[{type:'image',mediaType:'image/png',data}]}}});assert.equal(events.at(-1).origin.runtimeId,'dsh');
 dsh.nativeId='native';let request;dsh.host.rpc=async(method,args)=>{request={method,args};return {attachment:{mediaType:'image/png'},data};};await dsh.handleEvent({type:'assistant/message',seq:2,data:{message:{content:[{type:'image',attachment:{attachmentId:'sha256:synthetic',bytes:68}}]}}});assert.deepEqual(request,{method:'session/attachment',args:{request:{sessionId:'native',attachmentId:'sha256:synthetic'}}});assert.equal(events.at(-1).data,data);
 const agy=new AntigravityAdapter(common),turn={reported:false,streamed:false};await agy.message({type:'assistant',message:{content:[{type:'image',source:{type:'base64',media_type:'image/png',data}}]}},turn);assert.equal(events.at(-1).origin.runtimeId,'antigravity');
});
test('sessions persist attachment-only users and generated media, sanitize raw base64 and remove failed sends',async t=>{
 const f=await fixture(t);let adapter,fail=false;
 class Fake extends RuntimeLifecycle {constructor(o){super(o);adapter=this;}async prompt(text,files){this.files=files;if(fail)throw new Error('synthetic send failure');}async close(){this.closed=true;}}
 const sessions=new Sessions(f.store,null,null,[{id:'codex',installed:true}],{constructors:{codex:Fake},media:f.media,capabilities:async()=>({image:{allowed:true}})});t.after(()=>sessions.close());
 const a=await f.media.stage({projectId:'p',name:'x.png',data:png});await sessions.prompt('session','',[a.id]);assert.equal(adapter.files.length,1);
 await adapter.emit({type:'media-output',mime:'image/png',data,origin:{runtimeId:'codex',itemId:'image'}});await adapter.emit({type:'tool-end',data:{type:'imageGeneration',result:data}});await adapter.emit({type:'text',text:'已生成图片。'});await adapter.emit({type:'turn-end',status:'completed'});
 let events=await f.store.events('session');assert.equal(events[0].attachments[0].id,a.id);const output=events.find(e=>e.type==='media');assert.equal(output.id,f.session.mediaAttachments[1].id);assert.equal((await f.media.response(new Request(output.url,{method:'HEAD'}))).status,200);assert.equal(JSON.stringify(events).includes(data),false);
 fail=true;const b=await f.media.stage({projectId:'p',name:'fail.png',data:png});await assert.rejects(sessions.prompt('session','',[b.id]),/send failure/);assert.equal(f.media.entries.has(b.id),false);assert.equal(f.session.mediaAttachments.some(e=>e.id===b.id),false);
 const c=await f.media.stage({projectId:'p',name:'bad.png',data:png});await assert.rejects(sessions.prompt('missing','',[c.id]),/Session/);assert.equal(f.media.entries.has(c.id),true);assert.equal((await f.media.response(new Request(c.url,{method:'HEAD'}))).status,200);
 const discarded=(await f.store.events('session')).filter(e=>e.type==='attachments-discarded');assert.deepEqual(discarded.map(e=>e.attachmentIds),[[b.id]]);
 assert.equal(redactMedia({type:'image',data}).data,'[media omitted from journal]');
 await assert.rejects(f.media.importOutput(f.session,{data,mime:'video/mp4'}),/文件头/);await assert.rejects(f.media.importOutput(f.session,{path:join(f.outside,'outside.png')}),/超出/);
});
for(const mode of ['count','total','capability','text'])test(`pre-claim ${mode} validation retains staged files and the same IDs can be resent`,async t=>{
 const f=await fixture(t);let allowed=mode!=='capability',adapter;
 class Fake extends RuntimeLifecycle {constructor(o){super(o);adapter=this;}async prompt(_text,files){this.files=files;}async close(){}}
 const sessions=new Sessions(f.store,null,null,[{id:'codex',installed:true}],{constructors:{codex:Fake},media:f.media,capabilities:async()=>({image:{allowed,reason:'fixture capability denied'}})});t.after(()=>sessions.close());
 const files=[],count=mode==='count'?MAX_ATTACHMENTS_PER_TURN+1:mode==='total'?2:1;
 const bytes=mode==='total'?Buffer.alloc(MAX_ATTACHMENT_BYTES_PER_TURN/2+1):png;if(mode==='total')png.copy(bytes);
 for(let i=0;i<count;i++)files.push(await f.media.stage({projectId:'p',name:`fixture-${i}.png`,data:bytes}));
 const ids=files.map(a=>a.id),message=mode==='count'?/最多/:mode==='total'?/总大小/:mode==='capability'?/capability denied/:/有效开发任务/;
 await assert.rejects(sessions.prompt('session',mode==='text'?null:'',ids),message);
 for(const a of files){const entry=f.media.entries.get(a.id);assert.equal(entry.sessionId,undefined);assert.equal(entry.root,f.media.staging);assert.equal((await stat(entry.path)).size,a.size);}
 assert.equal((await f.store.events('session')).some(e=>e.type==='attachments-discarded'),false);assert.equal(adapter,undefined);
 if(['count','total'].includes(mode))await f.media.discard(ids.pop());allowed=true;
 await sessions.prompt('session','',ids);assert.deepEqual(adapter.files.map(a=>a.id),ids);await adapter.emit({type:'text',text:'已完成图片检查。'});await adapter.emit({type:'turn-end',status:'completed'});assert.equal(f.session.status,'completed');
});
test('claim filesystem failure preserves files before the first move, but partial moves clean the batch and publish discarded IDs',async t=>{
 const f=await fixture(t),sessions=new Sessions(f.store,null,null,[{id:'codex',installed:true}],{media:f.media,capabilities:async()=>({image:{allowed:true}})});t.after(()=>sessions.close());
 const a=await f.media.stage({projectId:'p',name:'first.png',data:png}),b=await f.media.stage({projectId:'p',name:'second.png',data:png}),inspect=f.media.inspect.bind(f.media);
 f.media.inspect=async()=>{throw new Error('synthetic disk inspection failure');};await assert.rejects(sessions.prompt('session','',[a.id,b.id]),/disk inspection/);assert.equal(f.media.entries.get(a.id).sessionId,undefined);assert.equal(f.media.entries.get(b.id).sessionId,undefined);assert.equal((await f.store.events('session')).some(e=>e.type==='attachments-discarded'),false);
 const paths=[f.media.entries.get(a.id).path,f.media.entries.get(b.id).path];let inspections=0;f.media.inspect=async(...args)=>{if(++inspections===2)throw new Error('synthetic partial move failure');return inspect(...args);};
 await assert.rejects(sessions.prompt('session','',[a.id,b.id]),/partial move/);assert.equal(f.media.entries.has(a.id),false);assert.equal(f.media.entries.has(b.id),false);for(const path of paths)await assert.rejects(stat(path),{code:'ENOENT'});
 const discarded=(await f.store.events('session')).filter(e=>e.type==='attachments-discarded');assert.deepEqual(discarded.map(e=>e.attachmentIds),[[a.id,b.id]]);
});
test('generated media without text is a native result and never triggers paid semantic continuation',async t=>{
 const f=await fixture(t);let adapter,prompts=0;
 class Fake extends RuntimeLifecycle {constructor(o){super(o);adapter=this;this.endpoint={};}async prompt(){prompts++;}async close(){}}
 const sessions=new Sessions(f.store,null,null,[{id:'codex',installed:true}],{constructors:{codex:Fake},media:f.media});t.after(()=>sessions.close());await sessions.prompt('session','请生成图片并保存文件');await adapter.emit({type:'media-output',data,mime:'image/png',origin:{runtimeId:'codex'}});await adapter.emit({type:'turn-end',status:'completed'});assert.equal(f.session.status,'completed');assert.equal(prompts,1);
});
