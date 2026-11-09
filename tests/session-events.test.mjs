import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {coalesceSessionEvents} from '../app/services/session-events.mjs';
import {displayEvents} from '../app/ui/view-state.js';
const chunk=(type,text,id,extra={})=>({type,text,id,at:'2026-11-09T00:00:00.000Z',turnId:'turn',attemptId:'attempt',...extra});
test('historical chunks merge by all renderer identity fields and retain first metadata without mutating input',()=>{
  for(const type of ['thinking','text','tool-output']){
    const events=[chunk(type,'first','first'),chunk(type,' second','second',{at:'2026-11-09T00:00:01.000Z'})],original=structuredClone(events),result=coalesceSessionEvents(events);
    assert.equal(result.length,1);assert.equal(result[0].text,'first second');assert.equal(result[0].id,'first');assert.equal(result[0].at,events[0].at);assert.deepEqual(events,original);assert.deepEqual(displayEvents(result),displayEvents(events));
    for(const field of ['turnId','attemptId','itemId','toolId'])assert.equal(coalesceSessionEvents([events[0],{...events[1],[field]:'different'}]).length,2);
  }
  assert.equal(coalesceSessionEvents([chunk('thinking','a','a'),chunk('text','b','b')]).length,2);
  assert.equal(coalesceSessionEvents([chunk('thinking','a','a'),chunk('thinking',null,'b')]).length,2);
});
test('replacement, tool boundaries, native records and other events preserve the existing display projection',()=>{
  const events=[chunk('thinking','a','a'),chunk('thinking','b','b'),{type:'native-event',name:'synthetic-marker'},chunk('thinking','c','c'),
    {type:'content-replace',channel:'thinking',attemptId:'attempt',text:'replacement',id:'replace',at:'later'},
    {type:'tool-start',toolId:'call'},chunk('tool-output','x','x',{toolId:'call'}),chunk('tool-output','y','y',{toolId:'call'}),{type:'tool-end',toolId:'call'},
    {type:'user',text:'synthetic'},chunk('text','done','done'),chunk('text','!','last'),{type:'turn-end',status:'completed'}];
  const result=coalesceSessionEvents(events);assert.deepEqual(displayEvents(result),displayEvents(events));assert.ok(result.includes(events[2]));assert.deepEqual(result.filter(e=>e.type==='tool-start'||e.type==='tool-end'),events.filter(e=>e.type==='tool-start'||e.type==='tool-end'));
});
test('legacy JSONL is byte-for-byte unchanged when its IPC projection is compacted',async()=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/session-events-')),store=await new Store(root).open();
  try{await store.mutate(s=>{s.sessions=[{id:'synthetic',status:'completed'}];});const file=join(root,'sessions/synthetic.jsonl'),raw=[chunk('thinking','a','a'),chunk('thinking','b','b'),{type:'turn-end',status:'completed'}].map(e=>JSON.stringify(e)+'\n').join('');await writeFile(file,raw);
    const result=coalesceSessionEvents(await store.events('synthetic'));assert.equal(result.length,2);assert.equal(result[0].text,'ab');assert.equal(await readFile(file,'utf8'),raw);
  }finally{await store.close();await rm(root,{recursive:true,force:true});}
});
test('a synthetic 76155-event session with 74851 thinking chunks records compaction and serialization timings',t=>{
  const events=[];let n=0;
  const push=(type,text,attempt)=>events.push({type,text,id:(n++).toString(16).padStart(36,'0'),at:'2026-11-09T00:00:00.000Z',sessionId:'synthetic-session-0000000000000000000',turnId:'synthetic-turn-0000000000000000000000',attemptId:String(attempt).padStart(36,'0')});
  for(let attempt=0;attempt<100;attempt++){
    for(let i=0;i<748+(attempt<51?1:0);i++)push('thinking','合成思考片段。',attempt);
    for(let i=0;i<13+(attempt<4?1:0);i++)push(i%2?'text':'tool-output','合成输出。',attempt);
  }
  assert.equal(events.length,76155);assert.equal(events.filter(e=>e.type==='thinking').length,74851);
  const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)],rawTimes=[],compactTimes=[],projectionTimes=[];let rawBytes,compactBytes,compacted;
  coalesceSessionEvents(events.slice(0,100));
  for(let i=0;i<3;i++){
    let start=performance.now();const raw=JSON.stringify(events);JSON.parse(raw);rawTimes.push(performance.now()-start);rawBytes=Buffer.byteLength(raw);
    start=performance.now();compacted=coalesceSessionEvents(events);projectionTimes.push(performance.now()-start);const wire=JSON.stringify(compacted);JSON.parse(wire);compactTimes.push(performance.now()-start);compactBytes=Buffer.byteLength(wire);
  }
  assert.equal(compacted.length,1404);assert.deepEqual(displayEvents(compacted),displayEvents(events));
  t.diagnostic(JSON.stringify({eventsBefore:events.length,eventsAfter:compacted.length,bytesBefore:rawBytes,bytesAfter:compactBytes,mergeMedianMs:median(projectionTimes),rawJsonRoundtripMedianMs:median(rawTimes),mergeAndJsonRoundtripMedianMs:median(compactTimes)}));
});
