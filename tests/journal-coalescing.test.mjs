import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Store} from '../app/core/store.mjs';
async function fixture(t,options){await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/journal-chunks-')),store=await new Store(root,options).open();await store.mutate(s=>{s.sessions=[{id:'synthetic-session',status:'running'}];});t.after(async()=>{await store.close();await rm(root,{recursive:true,force:true});});return {root,store,file:join(root,'sessions/synthetic-session.jsonl'),event:e=>store.event('synthetic-session',e)};}
test('front-end chunks stay unchanged while adjacent journal chunks merge by attempt and turn',async t=>{
  const f=await fixture(t),live=[];f.store.on('event',e=>live.push(e));
  for(const text of ['synthetic ','thinking ','🙂'])await f.event({type:'thinking',text,attemptId:'a',turnId:'t'});
  assert.equal(live.length,3);assert.equal(new Set(live.map(e=>e.id)).size,3);
  const rows=await f.store.events('synthetic-session');assert.equal(rows.length,1);assert.equal(rows[0].text,'synthetic thinking 🙂');assert.equal(rows[0].id,live[0].id);assert.equal(rows[0].at,live[0].at);
});
test('type, attempt, item and turn boundaries flush in original order and errors end the final block',async t=>{
  const f=await fixture(t);
  for(const e of [{type:'thinking',text:'a',attemptId:'1',turnId:'t'},{type:'text',text:'b',attemptId:'1',turnId:'t'},{type:'text',text:'c',attemptId:'2',turnId:'t'},{type:'text',text:'d',attemptId:'2',turnId:'u'},{type:'text',text:'e',attemptId:'2',turnId:'u',itemId:'next'},{type:'error',text:'synthetic runtime failure'},{type:'turn-end',status:'failed'}])await f.event(e);
  const rows=(await readFile(f.file,'utf8')).trim().split('\n').map(JSON.parse);assert.deepEqual(rows.map(e=>e.text??e.status),['a','b','c','d','e','synthetic runtime failure','failed']);
});
test('one-second idle bound, byte bound and orderly abnormal shutdown flush pending data',async t=>{
  const f=await fixture(t,{streamFlushMs:30,streamFlushBytes:16});await f.event({type:'thinking',text:'中'.repeat(6),attemptId:'1'});
  assert.equal((await readFile(f.file,'utf8')).trim().split('\n').length,1);
  await f.event({type:'text',text:'timer'});await new Promise(r=>setTimeout(r,80));assert.match(await readFile(f.file,'utf8'),/timer/);
  await f.event({type:'thinking',text:'close-on-failure'});await f.store.close();assert.match(await readFile(f.file,'utf8'),/close-on-failure/);
  const reopened=await new Store(f.root).open();try{assert.equal(reopened.session('synthetic-session').status,'interrupted');assert.equal((await reopened.events('synthetic-session')).length,3);}finally{await reopened.close();}
});
test('ten thousand text-only tool output chunks merge into few rows with identical text',async t=>{
  const f=await fixture(t,{streamFlushMs:60000,streamFlushBytes:4096}),live=[],parts=[];
  f.store.on('event',e=>live.push(e));
  for(let i=0;i<10000;i++){const text='chunk-'+String(i).padStart(5,'0');parts.push(text);await f.event({type:'tool-output',text,toolId:'call-one',attemptId:'a',turnId:'t'});}
  assert.equal(live.length,10000);assert.equal(new Set(live.map(e=>e.id)).size,10000);
  const rows=await f.store.events('synthetic-session');
  assert.ok(rows.length<200,'merged rows: '+rows.length);assert.ok(rows.every(row=>row.type==='tool-output'&&row.toolId==='call-one'));
  assert.equal(rows.map(row=>row.text).join(''),parts.join(''));assert.equal(rows[0].id,live[0].id);
});
test('alternating output of two tools flushes in arrival order and never mixes tools',async t=>{
  const f=await fixture(t,{streamFlushMs:60000,streamFlushBytes:1e6}),sent=[];
  for(const round of [0,1,2])for(const toolId of ['call-a','call-b']){const text=round+':'+toolId;sent.push([toolId,text]);await f.event({type:'tool-output',text,toolId});}
  const rows=await f.store.events('synthetic-session');assert.deepEqual(rows.map(row=>[row.toolId,row.text]),sent);
});
test('tool output carrying native data keeps one record per chunk',async t=>{
  const f=await fixture(t,{streamFlushMs:60000,streamFlushBytes:1e6});
  for(const text of ['native-a','native-b','native-c'])await f.event({type:'tool-output',text,toolId:'call-native',data:{update:text}});
  const rows=await f.store.events('synthetic-session');
  assert.deepEqual(rows.map(row=>row.text),['native-a','native-b','native-c']);assert.deepEqual(rows.map(row=>row.data.update),['native-a','native-b','native-c']);
});
test('buffered tool output lands before a following tool-end and other event types',async t=>{
  const f=await fixture(t,{streamFlushMs:60000,streamFlushBytes:1e6});
  await f.event({type:'tool-start',toolId:'call-z'});
  for(const text of ['out-a','out-b'])await f.event({type:'tool-output',text,toolId:'call-z'});
  await f.event({type:'tool-end',toolId:'call-z',status:'completed'});
  const rows=(await readFile(f.file,'utf8')).trim().split('\n').map(line=>JSON.parse(line));
  assert.deepEqual(rows.map(row=>row.type==='tool-output'?row.text:row.type),['tool-start','out-aout-b','tool-end']);
});
