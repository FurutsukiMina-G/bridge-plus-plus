import test from 'node:test';
import assert from 'node:assert/strict';
import {QoderPool} from '../src/pool.js';
import {HOST_BINDING} from '../src/native-tools.js';
import {nativeConfig,toolRequest,fakeStarter,waitFor,FakeRuntime} from './native-fake.js';

test('native startup registers only host tools, hooks and permissions, and retries a short tool list',async()=>{
  const runtimes:FakeRuntime[]=[];
  const pool=new QoderPool(nativeConfig(),fakeStarter(runtimes,runtime=>{if(runtimes.length===1)runtime.initToolCount=0;}));
  try{
    const pending=pool.infer(toolRequest());
    await waitFor(()=>runtimes.length===2&&runtimes[1]!.prompts.length===1);
    assert.equal(runtimes[0]!.closed,1);
    const options=runtimes[1]!.options;
    assert.equal(options.mcpServers.host[HOST_BINDING],runtimes[1]!.binding);
    assert.equal(options.mcpServers.host.type,'sdk');
    assert.deepEqual(options.mcpServers.host.tools,[{name:'Read',exposedName:'Read',alwaysLoad:true}]);
    assert.equal(options.env.MCP_TIMEOUT,undefined,'tools/list is always answered at startup');
    assert.equal(options.env.QODERCN_CLI_MAX_MCP_OUTPUT_TOKENS,'1000000');
    assert.deepEqual(await options.canUseTool('Read',{path:'x'}),{behavior:'allow',updatedInput:{path:'x'}});
    assert.equal((await options.canUseTool('Bash',{})).behavior,'deny');
    assert.equal(options.hooks.PreToolUse[0].hooks.length,1);
    assert.equal(options.hooks.PostToolUse[0].hooks.length,1);
    runtimes[1]!.final('ready');
    const completed=await pending;
    assert.equal(completed.reply.content,'ready');
    assert.equal(completed.report.native.tools_registered,1);
  }finally{pool.closeAll();}
});

test('a matching native warm runtime is claimed without opening a replacement',async()=>{
  const runtimes:FakeRuntime[]=[];
  const pool=new QoderPool(nativeConfig({nativeWarmLimit:1,blankWarmTtlMs:1000}),fakeStarter(runtimes));
  try{
    const firstPending=pool.infer(toolRequest());
    await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('one');await firstPending;
    await waitFor(()=>runtimes.length===2);
    // The warm runtime starts with the latest table, so it becomes fully ready before any claim.
    await waitFor(()=>pool.stats().native.warm_ready===1);assert.equal(runtimes[1]!.listed?.length,1);
    const secondRequest={...toolRequest(),prompt_cache_key:'second-native',messages:[{role:'user' as const,content:'A separate conversation'}]};
    const secondPending=pool.infer(secondRequest);
    // Receiving the claimed runtime's prompt can precede asynchronous refill.
    // Wait for both events; keep the exact runtime-count and no-extra-prompt assertions.
    await waitFor(()=>runtimes[1]?.prompts.length===1&&runtimes.length===3);
    assert.equal(runtimes.length,3);assert.equal(runtimes[2]!.prompts.length,0,'only the replenished warm runtime is new');
    runtimes[1]!.final('two');const second=await secondPending;
    assert.equal(second.reply.content,'two');
    assert.equal(second.record.runtime.q,runtimes[1]!.q);
    assert.equal(second.report.native.window,'new');
  }finally{pool.closeAll();}
});

test('an unclaimed native warm runtime expires at the blank TTL',async()=>{
  const runtimes:FakeRuntime[]=[];
  const pool=new QoderPool(nativeConfig({nativeWarmLimit:1,blankWarmTtlMs:20}),fakeStarter(runtimes));
  try{
    const pending=pool.infer(toolRequest());
    await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('one');await pending;
    await waitFor(()=>runtimes.length===2);
    await waitFor(()=>runtimes[1]!.closed>0);
    assert.equal(pool.stats().native.warm_pending,0);
  }finally{pool.closeAll();}
});

test('native idle sweeping protects busy sessions and closes expired idle sessions',async()=>{
  const runtimes:FakeRuntime[]=[];
  const pool=new QoderPool(nativeConfig({sessionIdleMs:60000}),fakeStarter(runtimes));
  try{
    const pending=pool.infer(toolRequest());
    await waitFor(()=>runtimes[0]?.prompts.length===1);
    runtimes[0]!.final('one');const completed=await pending;
    completed.record.touched=Date.now()-61000;completed.record.busy=1;
    (pool as unknown as{sweepIdle():void}).sweepIdle();
    assert.equal(runtimes[0]!.closed,0);
    completed.record.busy=0;(pool as unknown as{sweepIdle():void}).sweepIdle();
    assert.equal(runtimes[0]!.closed,1);
    assert.equal(pool.stats().native.sessions,0);
  }finally{pool.closeAll();}
});
