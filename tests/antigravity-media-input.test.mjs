import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {mkdir,mkdtemp,writeFile,symlink} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {AntigravityAdapter,antigravityEvent} from '../app/runtimes/antigravity.mjs';
const fake=()=>Object.assign(new EventEmitter(),{stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),exitCode:null,pid:undefined});
async function fixture(t){
 await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/agy-media-')),mediaDir=join(root,'media/sessions/session');await mkdir(mediaDir,{recursive:true});
 const files=[{kind:'image',mime:'image/png',name:'原始图片.png',path:join(mediaDir,'random-image.png')},{kind:'audio',mime:'audio/wav',name:'录音.wav',path:join(mediaDir,'random-audio.wav')},{kind:'video',mime:'video/mp4',name:'视频.mp4',path:join(mediaDir,'random-video.mp4')}];for(const a of files)await writeFile(a.path,'fixture');
 const events=[],calls=[],children=[],a=new AntigravityAdapter({session:{id:'session',selection:{nativeModel:'gemini-3.8-flash-low'}},permissionMode:'readonly',runtime:{executable:'fixture'},project:{path:root},mediaDir,emit:async e=>events.push(e),saveNative:async()=>{},launchProcess:(_c,args)=>{calls.push(args);const c=fake();children.push(c);return c;}});t.after(()=>a.close());
 const feed=async messages=>{children.at(-1).stdout.write(messages.map(m=>JSON.stringify(m)).join('\n')+'\n');await a.active.queue;};
 return {a,root,mediaDir,files,events,calls,children,feed};
}
const tool=(file,{name='read_file',state='DONE',index=1,error}={})=>({event:'step_update',step_update:{step_type:'tool',state,step_index:index,tool_name:name,tool_info:{parameters:{Path:file.path},...error?{error:{message:error}}:{}}}});
const result={event:'result',result:{status:'SUCCESS',response:'保留模型回答'}};
test('agy only adds the current session media directory for attachment rounds and checks reads case-insensitively',{timeout:15000},async t=>{
 const f=await fixture(t);await f.a.prompt('看看附件',f.files);const args=f.calls[0];assert.equal(args.filter(x=>x==='--add-dir').length,1);assert.equal(args[args.indexOf('--add-dir')+1],f.mediaDir);assert.equal(args.includes(dirname(f.mediaDir)),false);assert.equal(args.includes('看看附件'),false);
 const input=JSON.parse(f.children[0].stdin.read().toString());assert.ok(input.message.content.endsWith('看看附件'));for(const file of f.files)assert.ok(input.message.content.includes(file.name));
 await f.feed([...f.files.map((file,index)=>tool({...file,path:file.path.replaceAll('\\','/').toUpperCase()},{index,name:index===1?'view_file':'read_file'})),result]);assert.equal(f.events.at(-1).status,'completed');assert.equal(f.events.some(e=>e.type==='error'),false);
 await f.a.prompt('纯文字');assert.equal(f.calls[1].includes('--add-dir'),false);assert.equal(JSON.parse(f.children[1].stdin.read().toString()).message.content,'纯文字');await f.feed([result]);assert.equal(f.events.at(-1).status,'completed');
});
for(const mode of ['none','wrong-path','active-only','wrong-tool','error','denied','partial'])test(`agy ${mode} media reads name missing attachments and fail despite SUCCESS`,async t=>{
 const f=await fixture(t);await f.a.prompt('',f.files);const messages=[];
 if(mode==='wrong-path')messages.push(tool({...f.files[0],path:join(f.root,'random-image.png')}));
 if(mode==='active-only')messages.push(tool(f.files[0],{state:'ACTIVE'}));
 if(mode==='wrong-tool')messages.push(tool(f.files[0],{name:'write_file'}));
 if(['error','denied'].includes(mode))messages.push(tool(f.files[0],{state:mode==='error'?'DONE':'ERROR',error:mode==='denied'?'permission check failed for read_file: user denied permission':'read failed'}));
 if(mode==='partial')messages.push(tool(f.files[0]));
 await f.feed([...messages,result]);assert.equal(f.events.at(-1).status,'failed');const error=f.events.find(e=>e.code==='attachment_not_read');assert.ok(error);assert.ok(error.text.includes(f.files[1].name));assert.ok(error.text.includes(f.files[2].name));assert.equal(error.text.includes(f.files[0].name),mode!=='partial');assert.ok(f.events.some(e=>e.type==='text'&&e.text==='保留模型回答'));
});
test('agy prevents lexical traversal, relative paths and junction escape before process launch',async t=>{
 const f=await fixture(t),outside=join(f.root,'outside');await mkdir(outside);await writeFile(join(outside,'secret.png'),'fixture');
 await assert.rejects(f.a.prompt('outside',[{...f.files[0],path:join(outside,'secret.png')}]),/超出/);
 await assert.rejects(f.a.prompt('relative',[{...f.files[0],path:'relative.png'}]),/绝对路径/);
 await symlink(outside,join(f.mediaDir,'escape'),'junction');await assert.rejects(f.a.prompt('symlink',[{...f.files[0],path:join(f.mediaDir,'escape/secret.png')}]),/超出/);assert.equal(f.calls.length,0);
});
test('agy exposes error_message/checkpoint, deduplicates step updates and fails attachment rounds after read success',async t=>{
 const f=await fixture(t);await f.a.prompt('描述视频',[f.files[2]]);const error={event:'step_update',step_update:{step_type:'error_message',state:'DONE',step_index:2}},checkpoint={event:'step_update',step_update:{step_type:'checkpoint',state:'DONE',step_index:3}};
 assert.equal(antigravityEvent(error).text,'Antigravity 上游返回了错误步骤，未提供详情');assert.equal(antigravityEvent({event:'step_update',step_update:{step_type:'error_message',message:'',text:''}}).text,'Antigravity 上游返回了错误步骤，未提供详情');assert.equal(antigravityEvent(checkpoint).text,'Antigravity 压缩了对话上下文');
 await f.feed([tool(f.files[2]),error,error,checkpoint,checkpoint,result]);assert.equal(f.events.filter(e=>e.code==='upstream_error_step').length,1);assert.equal(f.events.filter(e=>e.code==='context_checkpoint').length,1);assert.ok(f.events.some(e=>e.code==='attachment_upstream_error'&&e.text.includes('附件过大')));assert.equal(f.events.at(-1).status,'failed');assert.ok(f.events.some(e=>e.type==='text'));
});
test('agy preserves quota errors and a checkpoint alone does not fail a fully read attachment round',async t=>{
 const f=await fixture(t);await f.a.prompt('quota',[f.files[0]]);await f.feed([{event:'step_update',step_update:{step_type:'error_message',step_index:1}},{event:'result',result:{status:'ERROR',error:'Individual quota reached. Resets in 46h50m',response:''}}]);assert.equal(f.events.at(-1).status,'failed');assert.ok(f.events.some(e=>e.type==='error'&&e.text==='Individual quota reached. Resets in 46h50m'));
 await f.a.prompt('new turn',[f.files[0]]);await f.feed([tool(f.files[0]),{event:'step_update',step_update:{step_type:'checkpoint',step_index:2}},result]);assert.equal(f.events.at(-1).status,'completed');
});
