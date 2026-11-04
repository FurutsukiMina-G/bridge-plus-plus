import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,appendFile,symlink,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {CodexRolloutMedia} from '../app/services/codex-rollout-media.mjs';
const id='00000000-0000-7000-8000-000000000001',other='00000000-0000-7000-8000-000000000002';
const nativeFixture=JSON.parse(await readFile(new URL('./fixtures/codex-image-extension.json',import.meta.url),'utf8')),png=nativeFixture.payload.item.result;
const extension=(overrides={},payload={})=>JSON.stringify({...nativeFixture,payload:{...nativeFixture.payload,...payload,item:{...nativeFixture.payload.item,...overrides}}})+'\n';
const line=(itemId,status='completed')=>JSON.stringify({type:'response_item',payload:{type:'image_generation_call',id:itemId,status,result:png}})+'\n';
async function fixture(){await mkdir('.runtime/tests',{recursive:true});const home=await mkdtemp(resolve('.runtime/tests/rollout-')),day=join(home,'sessions/2026/11/03');await mkdir(day,{recursive:true});return {home,day,path:join(day,'rollout-2026-11-03T00-00-00-'+id+'.jsonl'),reader:new CodexRolloutMedia(home)};}
test('native rollout image projection reads only this thread and bytes appended after the checkpoint',async()=>{
 const f=await fixture(),events=[];await writeFile(f.path,line('old'));await writeFile(join(f.day,'rollout-'+other+'.jsonl'),line('other thread'));
 const checkpoint=await f.reader.checkpoint(id);await appendFile(f.path,line('new')+line('pending','in_progress')+JSON.stringify({type:'event_msg',payload:{type:'image_generation_call',result:'wrong envelope',status:'completed'}})+'\n');
 await f.reader.read(id,checkpoint,async e=>events.push(e));const media=events.filter(e=>e.type==='media-output');assert.equal(media.length,1);assert.equal(media[0].data,png);assert.equal(media[0].origin.itemId,'new');assert.equal(media[0].origin.runtimeId,'codex');
});
test('observed Extension completion imports one image and ignores started events, input-image copies, other threads and duplicate completions',async()=>{
 const f=await fixture(),events=[];await writeFile(f.path,extension({}, {type:'item_started'})+extension()+extension()+extension({}, {thread_id:other})+JSON.stringify({type:'response_item',payload:{type:'custom_tool_call_output',output:[{type:'input_image',image_url:'data:image/png;base64,'+png}]}})+'\n');
 const checkpoint=await f.reader.checkpoint(null);await f.reader.read(id,checkpoint,async e=>events.push(e));await f.reader.read(id,checkpoint,async e=>events.push(e));
 assert.equal(events.length,1);assert.equal(events[0].mime,'image/png');assert.equal(events[0].data,png);assert.deepEqual(events[0].origin,{runtimeId:'codex',itemId:'exec-image-fixture',tool:'imageGeneration'});assert.equal('path' in events[0],false);
});
test('input_image tool outputs alone never become generated media',async()=>{
 const f=await fixture();await writeFile(f.path,JSON.stringify({type:'response_item',payload:{type:'custom_tool_call_output',call_id:'exec-image-fixture',output:[{type:'input_image',image_url:'data:image/png;base64,'+png}]}})+'\n');await f.reader.read(id,await f.reader.checkpoint(null),async()=>assert.fail('tool input copy must not be imported'));
});
for(const overrides of [{status:'failed',failure:null},{status:'in_progress'},{status:'completed',failure:{message:'generation failed'}},{status:'completed',failure:{}},{result:'not base64'},{result:Buffer.from('not an image').toString('base64')}])test(`Extension ${JSON.stringify(overrides)} emits a notice without media`,async()=>{
 const f=await fixture(),events=[];await writeFile(f.path,extension(overrides)+extension(overrides));await f.reader.read(id,await f.reader.checkpoint(null),async e=>events.push(e));assert.equal(events.length,1);assert.equal(events[0].type,'notice');assert.equal(events[0].code,'image_generation_unavailable');assert.ok(events[0].text.length);assert.equal(JSON.stringify(events).includes(png),false);
});
test('generated MIME is sniffed from bytes even when savedPath has the wrong extension',async()=>{
 const f=await fixture(),events=[];const jpeg=Buffer.from([255,216,255,224,0,16,74,70,73,70]).toString('base64');await writeFile(f.path,extension({result:jpeg,savedPath:'C:\\wrong.png'}));await f.reader.read(id,await f.reader.checkpoint(null),async e=>events.push(e));assert.equal(events[0].mime,'image/jpeg');assert.equal(events[0].data,jpeg);
});
test('savedPath fallback reads only this thread directory, sniffs bytes and emits data instead of widening media-service roots',async()=>{
 const f=await fixture(),events=[],dir=join(f.home,'generated_images',id);await mkdir(dir,{recursive:true});const path=join(dir,'wrong-extension.txt');await writeFile(path,Buffer.from(png,'base64'));await writeFile(f.path,extension({result:null,savedPath:path}));await f.reader.read(id,await f.reader.checkpoint(null),async e=>events.push(e));assert.equal(events.length,1);assert.equal(events[0].type,'media-output');assert.equal(events[0].mime,'image/png');assert.equal(events[0].data,png);assert.equal('path' in events[0],false);
});
for(const location of ['other-thread','arbitrary','junction','thread-junction'])test(`savedPath rejects ${location} fallback`,async()=>{
 const f=await fixture(),events=[],dir=join(f.home,'generated_images',id),otherDir=join(f.home,'generated_images',other),outside=join(f.home,'outside');await mkdir(otherDir,{recursive:true});await mkdir(outside);await writeFile(join(otherDir,'x.png'),Buffer.from(png,'base64'));await writeFile(join(outside,'x.png'),Buffer.from(png,'base64'));
 let path;
 if(location==='thread-junction'){await symlink(otherDir,dir,'junction');path=join(dir,'x.png');}
 else{await mkdir(dir);if(location==='junction'){await symlink(outside,join(dir,'escape'),'junction');path=join(dir,'escape/x.png');}else path=location==='other-thread'?join(otherDir,'x.png'):join(outside,'x.png');}
 await writeFile(f.path,extension({result:'',savedPath:path}));await f.reader.read(id,await f.reader.checkpoint(null),async e=>events.push(e));assert.equal(events.length,1);assert.equal(events[0].type,'notice');assert.equal(events.some(e=>e.type==='media-output'),false);
});
test('new-thread rollout supports first-turn images but missing old checkpoints and mismatched IDs never replay history',async()=>{
 const f=await fixture(),checkpoint=await f.reader.checkpoint(null),events=[];await writeFile(f.path,line('first'));
 await f.reader.read(id,checkpoint,async e=>events.push(e));assert.equal(events.length,1);
 await f.reader.read(id,{id,file:null},async()=>assert.fail('missing old log must not replay'));
 await f.reader.read(id,{id:other,file:null},async()=>assert.fail('mismatched identity must not replay'));
 assert.equal(await f.reader.file('../../outside'),null);
});
test('rollout truncation and directory-junction escapes fail closed',async()=>{
 const f=await fixture();await writeFile(f.path,line('old'));const checkpoint=await f.reader.checkpoint(id);await writeFile(f.path,'');await assert.rejects(f.reader.read(id,checkpoint,async()=>{}),/范围无效/);
 const outside=join(f.home,'outside');await mkdir(outside);await writeFile(join(outside,'rollout-'+other+'.jsonl'),line('outside'));await symlink(outside,join(f.day,'escape'),'junction');assert.equal(await f.reader.file(other),null);
});
