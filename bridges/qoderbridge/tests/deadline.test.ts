import test from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createBridgeServer} from '../src/server.js';
import {qoderRequestTimeout,qoderUpstreamIdleTimeout} from '../src/timeouts.js';
import {fakeStarter,FakeRuntime,nativeConfig,toolRequest} from './native-fake.js';

test('Qoder generation has a 20 minute default and a bounded override',t=>{
  const prior=process.env.QODER_TIMEOUT_MS;
  t.after(()=>{if(prior===undefined)delete process.env.QODER_TIMEOUT_MS;else process.env.QODER_TIMEOUT_MS=prior;});
  delete process.env.QODER_TIMEOUT_MS;
  assert.equal(qoderRequestTimeout(),1200000);
  process.env.QODER_TIMEOUT_MS='1500000';
  assert.equal(qoderRequestTimeout(),1500000);
  assert.equal(qoderRequestTimeout('1800000'),1800000);
  for(const invalid of ['','0','600.5','1800001','invalid'])assert.throws(()=>qoderRequestTimeout(invalid),/QODER_TIMEOUT_MS/);
  assert.equal(qoderUpstreamIdleTimeout(180000),180000);
});

test('Qoder HTTP generation streams active thinking past the former five minute deadline',async t=>{
  const runtimes:FakeRuntime[]=[];
  const {model:_model,...config}=nativeConfig({timeout:qoderRequestTimeout(),idleTimeoutMs:180000});
  const server=await createBridgeServer(config,{key:'deadline-fixture',port:0,prewarm:false,telemetry:false,
    startRuntime:fakeStarter(runtimes,runtime=>{runtime.models[0]!.context_config.full.token_count=1000000;})});
  t.after(()=>new Promise<void>(resolve=>{server.closeAllConnections();server.close(()=>resolve());}));
  t.mock.timers.enable({apis:['setTimeout','Date']});
  const started=Date.now();
  const response=await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/chat/completions`,{
    method:'POST',headers:{authorization:'Bearer deadline-fixture','content-type':'application/json'},
    body:JSON.stringify({...toolRequest(),stream:true})
  });
  assert.equal(response.status,200);
  const reader=response.body!.getReader(), decoder=new TextDecoder();
  let raw='';
  async function readUntil(marker:string){
    while(!raw.includes(marker)){
      const part=await reader.read();
      assert.equal(part.done,false,raw);
      raw+=decoder.decode(part.value,{stream:true});
    }
  }
  await readUntil('"role":"assistant"');
  const waitingUntil=performance.now()+6000;
  while(!runtimes[0]?.prompts.length&&performance.now()<waitingUntil)await new Promise<void>(resolve=>setImmediate(resolve));
  assert.equal(runtimes[0]?.prompts.length,1);
  for(let i=1;i<=6;i++){
    t.mock.timers.tick(60000);
    runtimes[0]!.emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'thinking_delta',thinking:`pulse-${i}`}}});
    await readUntil(`"reasoning_content":"pulse-${i}"`);
  }
  assert.equal(Date.now()-started,360000);
  runtimes[0]!.final('finished after six minutes');
  await readUntil('[DONE]');
  assert.match(raw,/finished after six minutes/);
  assert.doesNotMatch(raw,/bridge_request_timeout|upstream_stalled/);
});
