import test from 'node:test';
import assert from 'node:assert/strict';
import { QoderPool } from '../src/pool.js';
import { ChatRequest } from '../src/compat.js';
import type { Config } from '../src/client.js';

test('a rejected model decision keeps the Harness message pending for the next retry', async () => {
  const config: Config = { auth: 'cli', timeout: 30000, strategy: 'permission', system: 'test',decisionRetries:0 };
  const request = ChatRequest.parse({ model: 'qoder-deepseek-flash', prompt_cache_key: 'session-test',
    messages: [{ role: 'user', content: 'Read the fixture' }],
    tools: [{ type: 'function', function: { name: 'read_file', parameters: {
      type: 'object', properties: { path: { type: 'string' } }, required: ['path'],
      additionalProperties: false,
    } } }],
  });
  const prompts: string[] = [];
  const outputs = ['{"kind":"tool_call","name":"read_file","arguments":',
    '{"kind":"tool_call","name":"read_file","arguments":{"path":"fixture.txt"}}'];
  let turn = 0; let phase = 0;
  const q = { next: async () => {
    if (phase++ % 2 === 0) return { done: false, value: { type: 'assistant', uuid: `a${turn}`,
      message: { id: `m${turn}`, model: 'dfmodel', content: [{ type: 'text', text: outputs[turn] }],
        usage: { input_tokens: 0, output_tokens: 0, credits: 0.1 } } } };
    turn++;
    return { done: false, value: { type: 'result', subtype: 'success', is_error: false,
      total_credits: turn * 0.1, modelUsage: {}, usage: {}, duration_ms: 20, duration_api_ms: 15 } };
  } };
  const record = { id: 'qoder-session-test', q, queue: { push: (item: { message: { content: string } }) =>
    prompts.push(item.message.content) }, messages: [], touched: Date.now(), locked: Promise.resolve(),
    lastCredits: null, model: 'dfmodel', busy: 0, toolSignature: null, retryHint: null,
    policyCalls: [], warm: { close() {} }, controller: new AbortController() };
  const pool = new QoderPool(config);
  const injected = pool as unknown as { nextWarm: Promise<typeof record>; primeNext: () => Promise<typeof record> };
  injected.nextWarm = Promise.resolve(record);
  injected.primeNext = () => Promise.resolve(record);

  const failed = await pool.infer(request);
  assert.ok(failed.decisionError);
  assert.equal(failed.report.credits_delta, 0.1);
  assert.equal(record.messages.length, 0);
  const recovered = await pool.infer(request);
  assert.deepEqual(recovered.decision, { kind: 'tool_call', name: 'read_file',
    arguments: { path: 'fixture.txt' } });
  assert.equal(recovered.report.sent_message_count, 1);
  assert.match(prompts[1]!, /Read the fixture/);
  assert.match(prompts[1]!, /preceding model decision was rejected/);
  assert.equal(record.messages.length, 1);
});

test('review lanes send only the next user delta and yield capacity before main lanes',async()=>{
  const pool=new QoderPool({auth:'cli',timeout:3000,strategy:'permission',system:'fixture',decisionRetries:0,blankWarmLimit:0,nativeWarmLimit:0});
  const reply='{"decision":"allow","risk":"low","reason":"fixture"}',prompts:string[]=[];
  let opens=0;
  const fake=pool as unknown as {open:()=>Promise<unknown>};
  fake.open=async()=>{
    const id=String(++opens);let phase=0;
    return {id,queue:{push:(item:{message:{content:string}})=>prompts.push(item.message.content),close(){}},
      q:{next:async()=>phase++%2===0?{done:false,value:{type:'assistant',message:{id:`m${id}-${phase}`,model:'dfmodel',content:[{type:'text',text:reply}],usage:{input_tokens:0,output_tokens:0,credits:0.1}}}}:
        {done:false,value:{type:'result',subtype:'success',is_error:false,total_credits:phase*0.1,modelUsage:{},usage:{},duration_ms:20,duration_api_ms:15}}},
      messages:[],touched:Date.now(),locked:Promise.resolve(),lastCredits:null,model:'dfmodel',busy:0,
      toolSignature:null,policyCalls:[],warm:{close(){}},controller:new AbortController()};
  };
  const reviewKey=(value:string)=>'review:'+value.repeat(64);
  const first=(scope:string,key:string,text:string)=>ChatRequest.parse({model:'qoder-deepseek-flash',bridge_scope:scope,prompt_cache_key:key,messages:[{role:'system',content:'fixture'},{role:'user',content:text}]});
  try{
    for(let i=0;i<4;i++){
      await pool.infer(first('scope'+i,'main','main '+i));
      await pool.infer(first('scope'+i,reviewKey(String(i)),'review '+i));
    }
    assert.equal(opens,8);
    const recent=first('scope3',reviewKey('3'),'review 3');
    const next=await pool.infer({...recent,messages:[...recent.messages,{role:'assistant',content:reply},{role:'user',content:'new review'}]});
    assert.equal(next.report.history_mode,'delta');assert.equal(next.report.sent_message_count,1);assert.equal(opens,8);
    assert.match(prompts.at(-1)!,/new review/);assert.doesNotMatch(prompts.at(-1)!,/review 3|decision/);
    await pool.infer(first('scope0','subagent','subagent'));
    assert.equal(opens,9);
    for(let i=0;i<4;i++){
      const main=first('scope'+i,'main','main '+i);
      const continued=await pool.infer({...main,messages:[...main.messages,{role:'assistant',content:reply},{role:'user',content:'continue main '+i}]});
      assert.equal(continued.report.history_mode,'delta');
    }
    assert.equal(opens,9);
    await pool.infer(first('scope3',reviewKey('4'),'rotated review'));
    assert.equal(pool.stats().sessions,8);
  }finally{pool.closeAll();}
});
