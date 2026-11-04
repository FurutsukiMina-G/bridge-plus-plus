import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Environments} from '../app/services/environments.mjs';
test('download progress emits at most every 250ms while state transitions immediately emit change and terminal progress',async()=>{
 let now=0;const manager=new Environments({now:()=>now}),events=[],changes=[];manager.on('event',event=>events.push({at:now,...event}));manager.on('change',()=>changes.push(now));
 const job=manager.startJob('kimi','update',async job=>{for(let i=1;i<=1000;i++){now=i;manager.emitJob(job,'downloading','fixture progress',i,1000);}manager.emitJob(job,'verifying','fixture verify');manager.emitJob(job,'installing','fixture install');});await job.promise;
 assert.equal(changes.length,4);assert.deepEqual(events.filter(e=>e.state==='downloading').map(e=>e.at),[0,250,500,750,1000]);assert.deepEqual(events.slice(-3).map(e=>e.state),['verifying','installing','done']);assert.equal(events.at(-1).received,1000);assert.equal(job.cancelable,false);await manager.close();
});
test('failed and cancelled terminal states each trigger one final change, without a second completion change',async()=>{
 for(const cancel of [false,true]){const manager=new Environments(),events=[],changes=[];manager.on('event',e=>events.push(e));manager.on('change',()=>changes.push(true));const job=manager.startJob('dsh','install',async job=>{if(cancel)job.controller.abort();throw new Error('fixture failure');});await assert.rejects(job.promise);assert.equal(changes.length,2);assert.equal(events.at(-1).state,cancel?'cancelled':'failed');await manager.close();}
});
