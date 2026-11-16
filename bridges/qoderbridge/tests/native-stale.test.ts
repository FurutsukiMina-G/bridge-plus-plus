import test from 'node:test';
import assert from 'node:assert/strict';
import {QoderPool} from '../src/pool.js';
import {nativeConfig,toolRequest,fakeStarter,waitFor,FakeRuntime} from './native-fake.js';

test('D: stale inbox output before a native continuation closes the runtime and replays the full host history',async()=>{
  const runtimes:FakeRuntime[]=[],pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));
  try{
    const request=toolRequest(),p=pool.infer(request);
    await waitFor(()=>runtimes[0]?.prompts.length===1);runtimes[0]!.final('old answer');const first=await p;
    first.record.inbox.push({type:'assistant',message:{content:[{type:'text',text:'STALE OUTPUT'}]}} as any);
    const next={...request,messages:[...request.messages,{role:'assistant' as const,content:'old answer'},{role:'user' as const,content:'latest instruction'}]},shown:string[]=[];
    const pending=pool.infer(next,{onText:text=>shown.push(text)});
    await waitFor(()=>runtimes[1]?.prompts.length===1);assert.equal(runtimes[0]!.closed,1);
    assert.match(runtimes[1]!.prompts[0].message.content,/Conversation so far/);
    assert.match(runtimes[1]!.prompts[0].message.content,/latest instruction/);
    runtimes[1]!.final('latest answer');const done=await pending;
    assert.equal(done.report.native.window,'new');assert.equal(done.report.native.rebuild_reason,'stale_runtime_output');
    assert.equal(done.reply.content,'latest answer');assert.equal(shown.join(''),'latest answer');
    assert.equal(pool.stats().native.stale_rebuilds,1);
  }finally{pool.closeAll();}
});
