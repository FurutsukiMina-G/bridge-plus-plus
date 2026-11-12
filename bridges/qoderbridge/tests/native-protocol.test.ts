import test from 'node:test';
import assert from 'node:assert/strict';
import {QoderPool} from '../src/pool.js';
import {NativeProtocolGate,scanNativeProtocol,isToolProtocolText,isLeakedFinalProtocol,mayStartToolProtocol} from '../src/protocol-text.js';
import {nativeConfig,toolRequest,resultRequest,FakeRuntime,fakeStarter,waitFor} from './native-fake.js';

const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
async function begin(t:{after(fn:()=>void):unknown},choice:'auto'|'required'='auto'){
  const runtimes:FakeRuntime[]=[],pool=new QoderPool(nativeConfig(),fakeStarter(runtimes));t.after(()=>pool.closeAll());
  const request={...toolRequest(),tool_choice:choice},shown:string[]=[],pending=pool.infer(request,{onText:text=>shown.push(text)});
  await waitFor(()=>runtimes[0]?.prompts.length===1);return {pool,request,shown,pending,runtime:runtimes[0]!};
}
async function streamText(runtime:FakeRuntime,text:string,parts=[...text],onPart=()=>{}){
  assert.equal(parts.join(''),text);const id=`response-${++runtime.response}`;
  runtime.emit({type:'stream_event',event:{type:'message_start',message:{id}}});
  for(const part of parts){runtime.emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text:part}}});await tick();onPart();}
  return ()=>{
    runtime.emit({type:'assistant',uuid:id,message:{id,content:[{type:'text',text}]}});
    runtime.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'end_turn'}}});runtime.result();
  };
}

const protocols=[
  '<tool_call>bad</tool_call>','<function_call>bad</function_call>','<function_calls>bad</function_calls>',
  '<tool_calls>[]</tool_calls>','<invoke name="Read">bad</invoke>','<parameter name="path">bad</parameter>',
  '<system_call>bad</system_call>','<custom_tool_call>bad</custom_tool_call>','<TOOL_CALL>bad</TOOL_CALL>',
  '</tool_call>','</function_call>','</invoke>','</parameter>','<name  = Read>','<name\n = Read>',
  '{"kind":"tool_call","name":"Read","arguments":{}}','{\n "ki\\u006ed"\n : "tool_calls", "calls": []}',
  '{"action":"tool_calls","calls":[]}','{"action":"final","content":"wrapped"}',
  '{"tool_calls":[]}','{"calls":[]}','"tool_calls"  :  []','"calls" : []',
  '<｜｜DSML｜｜ invoke name="Read">','</｜DSML｜invoke>','｜｜DS｜｜invoke>','｜DS｜invoke>',
  '｜DSML｜invoke>','｟DSML｠invoke>','<｟DSML｠invoke>',
  '<｜｜dsml｜｜ invoke>','｜Ds｜invoke>','<｟dsml｠invoke>','<invoke',
];
for(const text of protocols)test(`native protocol fragments are privately corrected: ${text.slice(0,60)}`,async t=>{
  const {runtime,shown,pending}=await begin(t),finish=await streamText(runtime,text,[...text],()=>assert.deepEqual(shown,[]));
  finish();await waitFor(()=>runtime.prompts.length===2);assert.deepEqual(shown,[]);
  runtime.final('Corrected answer.');const result=await pending;
  assert.equal(result.reply.content,'Corrected answer.');assert.equal(shown.join(''),'Corrected answer.');assert.equal(runtime.prompts.length,2);
});

const ordinary=[
  '1 < 2 and <b>ordinary HTML</b>.','<tool_callback>ordinary element</tool_callback>',
  'The <tool_call> element is explained in this sentence.',
  'The DSML form is <｜｜DSML｜｜invoke name="Read"> in prose, not a call.',
  '`<tool_call>example</tool_call>` is inline code.',
  'An inline DSML example: `<｜｜DSML｜｜ invoke name="Read">`.',
  '``<tool_call>example `quoted`</tool_call>`` uses two backticks.',
  '```xml\n<tool_call>example</tool_call>\n```',
  '```xml\n<invoke name="Read">example</invoke>\n```',
  '~~~xml\n<function_call>example</function_call>\n~~~',
  '```json\n{"kind":"tool_call","name":"Read","arguments":{}}\n```',
  '```xml\n<｜DSML｜invoke>\n```','{"theme":"dark"}',
];
for(const text of ordinary)test(`native descriptive text streams unchanged without correction: ${text.slice(0,60)}`,async t=>{
  const {runtime,shown,pending}=await begin(t),finish=await streamText(runtime,text);
  assert.equal(shown.join(''),text,'Safe examples must stream before the result');finish();
  const result=await pending;assert.equal(result.reply.kind,'final');assert.equal(result.reply.content,text);
  assert.equal(shown.join(''),text);assert.equal(runtime.prompts.length,1);
});

test('tiny XML fragments do not escape while they might still form a protocol header',async t=>{
  const {runtime,shown,pending}=await begin(t),text='<tool_call>bad</tool_call>';
  const finish=await streamText(runtime,text,['<','t','oo','l','_','c','a','ll','>','bad','</','tool_call','>'],()=>assert.deepEqual(shown,[]));
  finish();await waitFor(()=>runtime.prompts.length===2);runtime.final('Done.');await pending;assert.equal(shown.join(''),'Done.');
});

for(const text of protocols)test(`a protocol on a later line is corrected after safe prose: ${text.slice(0,55)}`,async t=>{
  const {runtime,shown,pending}=await begin(t),prefix='Safe introduction.\n',finish=await streamText(runtime,prefix+text);
  assert.equal(shown.join(''),prefix);finish();await waitFor(()=>runtime.prompts.length===2);
  runtime.final('Corrected answer.');const result=await pending;
  assert.equal(result.reply.content,'Corrected answer.');assert.equal(shown.join(''),prefix+'Corrected answer.');
});

test('native protocol correction exhaustion keeps the existing error and publishes no rejected text',async t=>{
  const {runtime,shown,pending,pool}=await begin(t);
  (await streamText(runtime,'<invoke name="Read">bad</invoke>'))();await waitFor(()=>runtime.prompts.length===2);
  (await streamText(runtime,'</tool_call>'))();const result=await pending;
  assert.equal(result.reply,null);assert.equal(result.report.stage,'native_protocol_text');assert.deepEqual(shown,[]);
  assert.equal(runtime.prompts.length,2);assert.equal(runtime.closed,1);assert.equal(pool.stats().native.sessions,0);
});

for(const choice of ['auto','required'] as const)test(`accepted ${choice} native calls never replay accompanying protocol text`,async t=>{
  const {pool,request,runtime,shown,pending}=await begin(t,choice);
  const handlers=await runtime.toolStep([{id:'real-call',name:'Read',input:{path:'a'}}],{text:'<tool_call>duplicate</tool_call>'});
  const first=await pending;assert.equal(first.reply.kind,'tool_calls');assert.equal(first.reply.content,'');assert.deepEqual(shown,[]);
  assert.deepEqual(first.reply.calls,[{id:'real-call',name:'Read',arguments:'{"path":"a"}'}]);
  const replay=await pool.infer(request);assert.equal(replay.reply.content,'');assert.equal(replay.report.client_usage,null);
  const next=pool.infer({...resultRequest(request,first.reply,['host result']),tool_choice:'auto'});
  assert.equal((await handlers[0]!).content[0].text,'host result');runtime.final('Done.');assert.equal((await next).reply.content,'Done.');
});

test('all DSML bar widths share native line anchoring and code masking',()=>{
  for(const name of ['DSML','DS','dsml','ds'])for(const left of [1,2])for(const right of [1,2])for(const wrapper of ['','<','</','/']){
    const text=wrapper+'｜'.repeat(left)+name+'｜'.repeat(right)+'invoke>';
    assert.equal(scanNativeProtocol(text,{final:true}).leak,0,text);
    assert.equal(scanNativeProtocol('Safe prose.\n  '+text,{final:true}).leak,14,text);
    assert.equal(scanNativeProtocol('`'+text+'`',{final:true}).leak,-1,text);
    assert.equal(scanNativeProtocol('```xml\n'+text+'\n```',{final:true}).leak,-1,text);
  }
});

test('native-only code-block handling leaves the JSON protocol predicates unchanged',()=>{
  const example='```xml\n<tool_call>example</tool_call>\n```';
  assert.equal(isToolProtocolText(example),true);assert.equal(scanNativeProtocol(example,{final:true}).leak,-1);
  assert.equal(isLeakedFinalProtocol('```xml\n<system_call><name=Read></system_call>\n```'),true);
  assert.equal(mayStartToolProtocol('```'),true);
});

test('the native incremental gate keeps long prose streaming with a bounded scan window',()=>{
  const paragraph='Plain prose with a < comparison and Unicode 中文 😀.\n';
  for(const text of [paragraph.repeat(4000),'Ordinary unbroken prose 中文 😀. '.repeat(7000)]){
    let shown='';const gate=new NativeProtocolGate(part=>{shown+=part;}),started=performance.now();
    for(let at=0;at<text.length;at+=8)gate.push(text.slice(at,at+8));gate.pump(true);
    assert.equal(shown,text);assert.ok(performance.now()-started<2000);
  }
});
