import {test} from 'node:test';
import assert from 'node:assert/strict';
import {antigravityInput} from '../app/runtimes/antigravity.mjs';
import {normalizeAntigravity} from '../app/core/catalog.mjs';
import {applyAntigravityMediaEvidence} from '../app/services/antigravity-source.mjs';
import {mediaCapabilities,antigravityTransportMedia,deniedMediaCapabilities} from '../app/services/media-capabilities.mjs';
test('agy input keeps text unchanged and uses absolute-path view_file instructions for media with an empty-text fallback',()=>{
 assert.deepEqual(antigravityInput('看 @D:/images/x.png'),{event:'user',message:{content:'看 @D:/images/x.png'}});
 const files=[{kind:'image',mime:'image/png',name:'用户原名.png',path:'D:\\data\\media\\sessions\\one\\uuid.png'},{kind:'audio',mime:'audio/wav',name:'声音.wav',path:'D:\\data\\media\\sessions\\one\\uuid.wav'}];
 const input=antigravityInput('原文',files);for(const a of files){assert.ok(input.message.content.includes(a.name));assert.ok(input.message.content.includes(a.mime));assert.ok(input.message.content.includes(a.kind));assert.ok(input.message.content.includes('Windows绝对路径：'+a.path));}
 assert.match(input.message.content,/先直接用 view_file/);assert.match(input.message.content,/不要运行任何命令、不要列目录、不要复制或修改这些文件/);assert.ok(input.message.content.endsWith('原文'));assert.match(antigravityInput('',files).message.content,/用户没有输入文字，请根据附件内容作答/);
 for(const value of [null,[],{type:'image'}])assert.throws(()=>antigravityInput(value),/无效/);
 assert.throws(()=>antigravityInput('look',[{...files[0],path:'relative.png'}]),/无效/);assert.throws(()=>antigravityInput('look',[{...files[0],mime:'image/gif'}]),/无效/);
});
test('Gemini catalog annotates official inputs plus user live evidence, retains identity/raw and excludes GIF',async()=>{
 for(const id of ['gemini-3.8-flash-low','gemini-4-argon-low']){
  const raw={id,name:id,extra:'preserved'},model=normalizeAntigravity(raw);assert.equal(model.images,true);assert.equal(model.audio,true);assert.equal(model.video,true);assert.match(model.modalitySource,/官方.*2026-11-03.*实测/);assert.equal(model.inputMimeTypes.includes('image/gif'),false);assert.deepEqual(model.raw,raw);
  const cached={...model,images:null,audio:null,video:null,inputMimeTypes:null,modalitySource:undefined},identity=cached.identity;let saves=0;const store={state:{catalog:{antigravity:{models:[cached]}}},mutate:async fn=>{saves++;fn();}};
  await applyAntigravityMediaEvidence(store);assert.equal(cached.identity,identity);assert.equal(cached.images,true);assert.deepEqual(cached.raw,raw);assert.equal(saves,1);await applyAntigravityMediaEvidence(store);assert.equal(saves,1);
 }
 assert.equal(normalizeAntigravity({id:'not-gemini'}),null);
});
test('agy capabilities require --add-dir evidence, cap audio/video and the whole turn at 16 MiB and keep other runtimes at 12 MiB',()=>{
 const media=antigravityTransportMedia('  --add-dir  Add a directory to the workspace'),model=normalizeAntigravity({id:'gemini-fixture'}),selection={modelKey:model.key};
 assert.equal(media.image,true);assert.equal(media.audio,true);assert.equal(media.video,true);assert.match(media.source,/实测/);
 let caps=mediaCapabilities({id:'antigravity',media},selection,model);assert.equal(caps.image.maxBytes,8*1024*1024);assert.equal(caps.audio.maxBytes,16*1024*1024);assert.equal(caps.video.maxBytes,16*1024*1024);assert.equal(caps.turn.maxTotalBytes,16*1024*1024);assert.deepEqual(caps.image.mimes,['image/png','image/jpeg','image/webp']);assert.deepEqual(caps.audio.mimes,['audio/wav','audio/mpeg','audio/ogg','audio/flac']);assert.deepEqual(caps.video.mimes,['video/mp4','video/webm']);for(const kind of ['image','audio','video'])assert.equal(caps[kind].allowed,true);
 const denied=antigravityTransportMedia('--add-directory fake');for(const kind of ['image','audio','video'])assert.equal(denied[kind],false);assert.match(denied.reason,/--add-dir/);caps=mediaCapabilities({id:'antigravity',media:denied},selection,model);for(const kind of ['image','audio','video'])assert.equal(caps[kind].allowed,false);
 caps=mediaCapabilities({id:'antigravity',media},{modelKey:'native',nativeModel:'gemini-3.8-flash-low'});for(const kind of ['image','audio','video'])assert.equal(caps[kind].allowed,true);
 caps=mediaCapabilities({id:'antigravity',media},{modelKey:'native'});for(const kind of ['image','audio','video'])assert.equal(caps[kind].allowed,false);
 assert.equal(deniedMediaCapabilities('fixture','antigravity').turn.maxTotalBytes,16*1024*1024);assert.equal(mediaCapabilities({id:'codex'},{}).turn.maxTotalBytes,12*1024*1024);
});
