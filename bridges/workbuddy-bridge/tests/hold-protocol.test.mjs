import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,toolRequest,resultRequest,waitFor,model} from './hold-fake.mjs';
import {scanHoldProtocol} from '../src/protocol-text.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function begin(t){
  const f=await fixture(t),shown=[],pending=f.infer(toolRequest(),{onText:text=>shown.push(text)});
  await waitFor(()=>f.sessions[0]?.prompts.length===1);
  return {...f,shown,pending,session:f.sessions[0]};
}
async function streamText(session,text,parts=[...text],onPart=()=>{}){
  assert.equal(parts.join(''),text);const id=session.start();
  for(const part of parts){session.emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text:part}}});await tick();onPart();}
  return ()=>{
    session.emit({type:'assistant',uuid:id,message:{id,model,content:[{type:'text',text}]}});
    session.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'end_turn'}}});session.result();
  };
}

test('hold runtime inherits the memory switches from sdkOptions',async t=>{
  const {session,pending}=await begin(t);
  assert.equal(session.options.env.CODEBUDDY_DISABLE_AUTO_MEMORY,'1');
  assert.equal(session.options.env.CODEBUDDY_CODE_DISABLE_AUTO_MEMORY,'1');
  for(const key of ['CODEBUDDY_MEMORY_ENABLED','CODEBUDDY_TYPED_MEMORY_ENABLED','CODEBUDDY_TEAM_MEMORY_ENABLED'])assert.equal(session.options.env[key],'0',key);
  assert.equal(session.options.env.WORKBUDDY_BRIDGE_HOLD,'1');
  assert.equal(session.options.env.CODEBUDDY_PRE_MESSAGE_COMPACT,'0');
  assert.equal(session.options.env.CODEBUDDY_AUTOCOMPACT_PCT_OVERRIDE,'100');
  assert.deepEqual(JSON.parse(session.options.extraArgs.settings),{autoCompactEnabled:false});
  session.final('Complete answer.');assert.equal((await pending).reply.content,'Complete answer.');
});

test('tiny XML protocol fragments stay private before and throughout correction',async t=>{
  const {session,shown,pending}=await begin(t),bad='<tool_call>invalid</tool_call>';
  const finish=await streamText(session,bad,['<','t','oo','l','_','c','a','ll','>','invalid','</','tool_call','>'],()=>assert.deepEqual(shown,[]));
  finish();await waitFor(()=>session.prompts.length===2);assert.deepEqual(shown,[]);
  session.final('Complete answer.');assert.equal((await pending).reply.content,'Complete answer.');assert.equal(shown.join(''),'Complete answer.');
});

const protocols=[
  '<function_call>{}</function_call>','<function_calls>{}</function_calls>','<tool_calls>[]</tool_calls>',
  '</tool_call>','<TOOL_CALL>{}</TOOL_CALL>','<invoke name="Read">x</invoke>',
  '<parameter name="path">x</parameter>','<name = Read>','<system_call>bad</system_call>','<custom_tool_call>bad</custom_tool_call>',
  '{"kind":"tool_calls","calls":[]}','{\n "action"\n : "tool_calls", "calls": []}',
  '{"action":"final","content":"wrapped"}','{"tool_calls":[]}','{"calls":[]}',
  '"tool_calls"  :  []','"calls" : []',
  '<｜｜DSML｜｜ invoke name="Read">','</｜DSML｜invoke>','｜｜DS｜｜invoke>','｜DSML｜invoke>',
  '｟DSML｠invoke>','<｟DSML｠invoke>',
];
for(const text of protocols)test(`hold corrects protocol fragments without publishing them: ${text.slice(0,55)}`,async t=>{
  const {session,shown,pending}=await begin(t),finish=await streamText(session,text,[...text],()=>assert.deepEqual(shown,[]));
  finish();await waitFor(()=>session.prompts.length===2);assert.deepEqual(shown,[]);
  session.final('Corrected answer.');assert.equal((await pending).reply.content,'Corrected answer.');assert.equal(shown.join(''),'Corrected answer.');
});

const ordinary=[
  '1 < 2 and <b>ordinary HTML</b>.','<tool_callback>ordinary element</tool_callback>',
  'The <tool_call> element is explained in this sentence.',
  '`<tool_call>example</tool_call>` is inline code.',
  'An inline DSML example: `<｜｜DSML｜｜ invoke name="Read">`.',
  '``<tool_call>example `quoted`</tool_call>`` uses two backticks.',
  '```xml\n<tool_call>example</tool_call>\n```',
  '~~~xml\n<function_call>example</function_call>\n~~~',
  '```json\n{"kind":"tool_calls","calls":[]}\n```',
  '```xml\n<｜DSML｜invoke>\n```',
  '{"theme":"dark"}',
];
for(const text of ordinary)test(`hold streams ordinary text and protocol examples unchanged: ${text.slice(0,55)}`,async t=>{
  const {session,shown,pending}=await begin(t),finish=await streamText(session,text);
  assert.equal(shown.join(''),text,'Safe text must stream before a terminal result');finish();
  assert.equal((await pending).reply.content,text);assert.equal(shown.join(''),text);assert.equal(session.prompts.length,1);
});

test('a later line-start protocol is held even after ordinary prose has streamed',async t=>{
  const {session,shown,pending}=await begin(t),prefix='Safe introduction.\n',finish=await streamText(session,prefix+'<invoke name="Read">bad</invoke>');
  assert.equal(shown.join(''),prefix);finish();await waitFor(()=>session.prompts.length===2);
  session.final('Corrected answer.');await pending;assert.equal(shown.join(''),prefix+'Corrected answer.');
});

test('protocol correction exhaustion returns an error without leaked text or a successful terminal',async t=>{
  const f=await fixture(t),request=toolRequest(),response=await f.transport.chat(request,new AbortController().signal),wire=response.text();
  await waitFor(()=>f.sessions[0]?.prompts.length===1);const session=f.sessions[0];
  (await streamText(session,'<tool_call>bad</tool_call>'))();await waitFor(()=>session.prompts.length===2);
  (await streamText(session,'<function_call>bad</function_call>'))();const text=await wire;
  assert.match(text,/"code":"native_protocol_text"/);assert.doesNotMatch(text,/<tool_call>|<function_call>|"finish_reason":"stop"|\[DONE\]/);
  assert.equal(session.prompts.length,2);assert.equal(session.closed,1);
});

test('hold protocol classification preserves all DSML bar-width spellings outside code',()=>{
  for(const name of ['DSML','DS'])for(const left of [1,2])for(const right of [1,2])for(const wrapper of ['','<','</','/']){
    const text=wrapper+'｜'.repeat(left)+name+'｜'.repeat(right)+'invoke>';
    assert.equal(scanHoldProtocol(text,{final:true}).leak,0,text);
    assert.equal(scanHoldProtocol('`'+text+'`',{final:true}).leak,-1,text);
  }
});

for(const choice of ['auto','required'])test(`printed markup beside an accepted ${choice} native call never enters the host reply`,async t=>{
  const f=await fixture(t),request={...toolRequest(),tool_choice:choice},shown=[],pending=f.infer(request,{onText:text=>shown.push(text)});
  await waitFor(()=>f.sessions[0]?.prompts.length===1);const session=f.sessions[0],id=session.start();
  session.emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text:'<tool_call>duplicate</tool_call>'}}});
  const call={type:'tool_use',id:'real-call',name:'mcp__host__Read',input:{path:'a'}};
  session.emit({type:'stream_event',event:{type:'content_block_start',content_block:call}});
  session.emit({type:'assistant',uuid:'native-message',message:{id,model,content:[call]}});
  session.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'tool_use'}}});
  const handler=session.binding.callTool(call.name,call.input),first=await pending;
  assert.equal(first.reply.kind,'tool_calls');assert.equal(first.reply.content,'');assert.deepEqual(shown,[]);
  assert.deepEqual(first.reply.calls,[{id:'real-call',name:'Read',arguments:'{"path":"a"}'}]);
  const next=f.infer({...resultRequest(request,first.reply,['host result']),tool_choice:'auto'});
  assert.equal((await handler).content[0].text,'host result');session.final('Done.');assert.equal((await next).reply.content,'Done.');
});
