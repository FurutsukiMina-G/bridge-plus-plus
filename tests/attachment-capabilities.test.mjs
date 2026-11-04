import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AttachmentCapabilities,NativeMediaCatalog} from '../app/services/attachment-capabilities.mjs';
import {MAX_ATTACHMENTS_PER_TURN,MAX_ATTACHMENT_BYTES_PER_TURN} from '../app/services/media-capabilities.mjs';
const runtime=()=>({id:'codex',executable:'synthetic-codex',media:{image:true,audio:true,nativeExec:{image:true,audio:false}}}),selection={modelKey:'native',nativeModel:'fixture'},models=[{id:'fixture',inputModalities:['text','image']}];
function service(catalog,runtimes=()=>[runtime()]){return new AttachmentCapabilities({catalog,runtimes,sessions:()=>({validate:(_id,value)=>value,selectionIssue:()=>null}),providers:()=>({get:()=>{throw new Error('unexpected provider');}}),cwd:()=>'.'});}
const rows=[{id:'one',runtimeId:'codex',selection},{id:'two',runtimeId:'codex',selection},{id:'archived',runtimeId:'codex',selection,archived:true}];
test('repeated and concurrent snapshots share one native catalog read regardless of elapsed time; archived sessions skip capability lookup',async()=>{
 let reads=0,now=0;const catalog=new NativeMediaCatalog({now:()=>now,read:async()=>{reads++;return models;}}),capabilities=service(catalog);let lookups=0;const original=capabilities.forSelection.bind(capabilities);capabilities.forSelection=(...args)=>{lookups++;return original(...args);};
 const snapshots=await Promise.all(Array.from({length:30},()=>capabilities.snapshotSessions(rows)));assert.equal(reads,1);assert.equal(lookups,60);assert.equal(snapshots[0][2].attachments,null);
 assert.deepEqual(snapshots[0][0].attachments.turn,{maxCount:MAX_ATTACHMENTS_PER_TURN,maxTotalBytes:MAX_ATTACHMENT_BYTES_PER_TURN});
 now=24*60*60*1000;for(let i=0;i<20;i++)await capabilities.snapshotSessions(rows);assert.equal(reads,1);
 const unused=new NativeMediaCatalog({read:async()=>{throw new Error('archived-only snapshot must not read');}});assert.equal((await service(unused).snapshotSessions([rows[2]]))[0].attachments,null);assert.equal(unused.entries.size,0);
});
test('native catalog refresh, runtime refresh and executable changes invalidate successful cache without timed expiry',async()=>{
 let reads=0,current=runtime();const catalog=new NativeMediaCatalog({read:async()=>{reads++;return models;}}),capabilities=service(catalog,()=>[current]);
 await capabilities.snapshotSessions(rows);assert.equal(reads,1);
 await catalog.get(current,'.',{refresh:true});await capabilities.snapshotSessions(rows);assert.equal(reads,2);
 catalog.invalidate();await capabilities.snapshotSessions(rows);assert.equal(reads,3);
 current={...current,executable:'synthetic-codex-v2'};await capabilities.snapshotSessions(rows);assert.equal(reads,4);
});
test('native catalog failure is shared and throttled for 60 seconds; reason and turn limits remain available',async()=>{
 let reads=0,now=0;const catalog=new NativeMediaCatalog({now:()=>now,read:async()=>{if(++reads===1)throw new Error('fixture catalog unavailable');return models;}}),capabilities=service(catalog);
 const snapshots=await Promise.all(Array.from({length:30},()=>capabilities.snapshotSessions(rows)));assert.equal(reads,1);assert.equal(snapshots[0][0].attachments.image.allowed,false);assert.match(snapshots[0][0].attachments.image.reason,/fixture catalog unavailable/);assert.equal(snapshots[0][0].attachments.turn.maxCount,MAX_ATTACHMENTS_PER_TURN);
 now=59999;await capabilities.snapshotSessions(rows);assert.equal(reads,1);now=60000;assert.equal((await capabilities.snapshotSessions(rows))[0].attachments.image.allowed,true);assert.equal(reads,2);
});
test('invalidation during a native read waits for its exit and never runs two catalog readers simultaneously',async()=>{
 let reads=0,active=0,maxActive=0,release;const gate=new Promise(r=>{release=r;});
 const catalog=new NativeMediaCatalog({read:async()=>{reads++;active++;maxActive=Math.max(maxActive,active);if(reads===1)await gate;active--;return models;}}),capabilities=service(catalog);
 const first=capabilities.snapshotSessions(rows);await Promise.resolve();const refresh=catalog.get(runtime(),'.',{refresh:true}),other=capabilities.snapshotSessions(rows);release();await Promise.all([first,refresh,other]);assert.equal(reads,2);assert.equal(maxActive,1);
});
test('explicit refresh can retry a failed catalog immediately and invalid catalog payloads remain throttled',async()=>{
 let reads=0;const catalog=new NativeMediaCatalog({read:async()=>{if(++reads===1)return null;return models;}}),capabilities=service(catalog);
 assert.match((await capabilities.snapshotSessions(rows))[0].attachments.image.reason,/目录无效/);await capabilities.snapshotSessions(rows);assert.equal(reads,1);
 await catalog.get(runtime(),'.',{refresh:true});assert.equal((await capabilities.snapshotSessions(rows))[0].attachments.image.allowed,true);assert.equal(reads,2);
});
