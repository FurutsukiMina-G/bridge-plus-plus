import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {SdkTransport} from '../src/sdk-transport.mjs';
import {Completion,sseEvents} from '../src/protocol.mjs';
import {FORWARDED,NATIVE_INSTRUCTIONS,hostServer,nativeInput,nativeSupported} from '../src/native.mjs';
import {NATIVE_BATCH_RULES} from '../src/native-batching.mjs';
import {DECISION_INSTRUCTIONS,decisionInput} from '../src/decision.mjs';
const model='deepseek-v4.1-flash';
const credential={uid:'fixture',domain:'www.workbuddy.cn',accessToken:'fake-token',refreshToken:'fake-refresh'};
const tools=[
  {type:'function',function:{name:'read',description:'Read a file',parameters:{type:'object',properties:{file_path:{type:'string'},limit:{type:'integer'}},required:['file_path'],additionalProperties:false}}},
  {type:'function',function:{name:'write',parameters:{type:'object',properties:{file_path:{type:'string'},content:{type:'string'}},required:['file_path','content'],additionalProperties:false}}},
];
const body={model,prompt_cache_key:'native-a',messages:[{role:'system',content:'host rules'},{role:'user',content:'task'}],tools,max_tokens:2048,reasoning_effort:'low'};
const usage={input_tokens:5000,output_tokens:20,cache_read_input_tokens:4000,cache_creation_input_tokens:0};
const zero={input_tokens:0,output_tokens:0};
const promptText=async prompt=>typeof prompt==='string'?prompt:(await prompt[Symbol.asyncIterator]().next()).value?.message?.content;
/** The message sequence the official runtime produced in real native probes. */
async function* turn({text='',calls=[],id='native-session',servers=[{name:'host',status:'connected'}],stop='end_turn',streamed=false,thinkingOnly=false,raw=false}){
  yield {type:'system',subtype:'init',model,session_id:id,mcp_servers:servers,tools:servers.length?tools.map(t=>'mcp__host__'+t.function.name):[]};
  if(thinkingOnly){
    yield {type:'stream_event',event:{type:'content_block_delta',index:0,delta:{type:'thinking_delta',thinking:'synthetic private reasoning'}}};
    yield {type:'stream_event',event:{type:'message_delta',delta:{stop_reason:stop},usage}};
    yield {type:'assistant',message:{model,content:[{type:'thinking',thinking:'synthetic private reasoning'}],usage,stop_reason:stop}};
    yield {type:'assistant',message:{content:[{type:'text',text:'Max turns (1) exceeded'}]}};
    throw new Error('Max turns (1) exceeded');
  }
  if(streamed){
    // Recorded parallel shape: every call reuses block index 2 and only the first reaches an assistant message.
    yield {type:'stream_event',event:{type:'message_start',message:{model,usage:zero}}};
    yield {type:'stream_event',event:{type:'content_block_start',index:0,content_block:{type:'thinking',thinking:''}}};
    yield {type:'stream_event',event:{type:'content_block_delta',index:0,delta:{type:'thinking_delta',thinking:'plan'}}};
    for(const c of calls){
      yield {type:'stream_event',event:{type:'content_block_start',index:2,content_block:{type:'tool_use',id:c.id,name:'mcp__host__'+c.name,input:{}}}};
      const json=JSON.stringify(c.input);yield {type:'stream_event',event:{type:'content_block_delta',index:2,delta:{type:'input_json_delta',partial_json:''}}};
      for(let at=0;at<json.length;at+=3)yield {type:'stream_event',event:{type:'content_block_delta',index:2,delta:{type:'input_json_delta',partial_json:json.slice(at,at+3)}}};
    }
    yield {type:'stream_event',event:{type:'content_block_stop',index:2}};
    yield {type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'tool_use'},usage:{input_tokens:3933,output_tokens:96,cache_read_input_tokens:2944,cache_creation_input_tokens:989}}};
    yield {type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'end_turn'},usage:{input_tokens:3933,output_tokens:96,cache_read_input_tokens:2944,cache_creation_input_tokens:0}}};
    yield {type:'stream_event',event:{type:'message_stop'}};
    yield {type:'assistant',message:{model,content:[{type:'thinking',thinking:'plan'}],usage:zero}};
    yield {type:'assistant',message:{model,content:[{type:'tool_use',id:calls[0].id,name:'mcp__host__'+calls[0].name,input:calls[0].input}],stop_reason:'tool_use',usage:zero}};
    yield {type:'system',subtype:'init',model,session_id:id,mcp_servers:servers};
    yield {type:'assistant',message:{content:[{type:'text',text:'Max turns (1) exceeded'}],usage:zero}};
    throw Object.assign(new Error('Max turns (1) exceeded'),{subtype:'error_during_execution'});
  }
  for(let at=0;at<text.length;at+=7)yield {type:'stream_event',event:{type:'content_block_delta',index:0,delta:{type:'text_delta',text:text.slice(at,at+7)}}};
  if(stop==='max_tokens')yield {type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'max_tokens'}}};
  if(text)yield {type:'assistant',uuid:'text',message:{model,content:[{type:'text',text}],usage:zero}};
  if(!calls.length){yield {type:'result',subtype:'success',is_error:false,result:text,session_id:id,usage};return;}
  yield {type:'assistant',uuid:'calls',message:{model,content:calls.map(c=>({type:'tool_use',id:c.id,name:raw||c.name.startsWith('mcp__')||c.name==='Read'?c.name:'mcp__host__'+c.name,input:c.input})),stop_reason:stop==='max_tokens'?'max_tokens':'tool_use',usage}};
  yield {type:'system',subtype:'init',model,session_id:id,mcp_servers:servers};
  yield {type:'assistant',uuid:'stop',message:{content:[{type:'text',text:'Max turns (1) exceeded'}],usage:zero}};
  throw Object.assign(new Error('Max turns (1) exceeded'),{subtype:'error_during_execution'});
}
async function fixture(t,steps,cfg={}){
  const runtime=await mkdtemp(join(tmpdir(),'wb-native-'));const seen=[];
  const run=async function*(input){const index=seen.length;seen.push({options:input.options,prompt:await promptText(input.prompt)});yield* turn(typeof steps==='function'?steps(index,seen[index]):steps[index]);};
  const transport=new SdkTransport({runtime,cliPath:process.execPath,toolMode:'native',...cfg},{get:async()=>credential},{run});
  t.after(async()=>{await transport.close();await rm(runtime,{recursive:true,force:true});});return {transport,seen};
}
async function collect(transport,request=body){
  const response=await transport.chat(request,new AbortController().signal);const completion=new Completion(model);let raw='';const contents=[];
  for await(const frame of sseEvents(response.body)){raw+=frame+'\n';if(frame.startsWith('{')&&JSON.parse(frame).error)return {raw,contents,metrics:response.bridgeMetrics};
    const chunk=completion.accept(frame,model);for(const c of chunk?.choices??[])if(c.delta?.content)contents.push(c.delta.content);}
  completion.validate(request.tools);return {result:completion.result(),raw,contents,metrics:response.bridgeMetrics};
}
test('the host server declares the exact host schemas natively and never executes a call',async()=>{
  assert.equal(nativeSupported(tools),true);assert.equal(nativeSupported([{type:'function',function:{name:'x'.repeat(54),parameters:{type:'object'}}}]),true);
  assert.equal(nativeSupported([{type:'function',function:{name:'arr',parameters:{type:'array'}}}]),false);
  const server=hostServer(tools).instance,[a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);
  const client=new Client({name:'test',version:'1.0.0'});await client.connect(b);
  const listed=(await client.listTools()).tools;assert.deepEqual(listed.map(t=>t.name),['read','write']);assert.deepEqual(listed[0].inputSchema,tools[0].function.parameters);
  const called=await client.callTool({name:'write',arguments:{file_path:'x',content:'y'}});assert.equal(called.isError,true);assert.equal(called.content[0].text,FORWARDED);
  await client.close();
});
test('native host calls keep runtime IDs, validate schemas and deliver the held preamble once',async t=>{
  const {transport,seen}=await fixture(t,[{text:'我先读取两个文件。',calls:[{id:'call_00_A',name:'read',input:{file_path:'a.ts'}},{id:'call_00_B',name:'read',input:{file_path:'b.ts',limit:20}}]}]);
  const {result,contents,metrics}=await collect(transport);const message=result.choices[0].message;
  assert.deepEqual(message.tool_calls.map(c=>[c.id,c.function.name,JSON.parse(c.function.arguments)]),[['call_00_A','read',{file_path:'a.ts'}],['call_00_B','read',{file_path:'b.ts',limit:20}]]);
  assert.equal(message.content,'我先读取两个文件。');assert.deepEqual(contents,['我先读取两个文件。']);assert.equal(result.choices[0].finish_reason,'tool_calls');
  assert.equal(seen.length,1);assert.equal(metrics.toolMode,'native');assert.equal(transport.metrics.hostCalls,2);assert.equal(result.usage.bridge_decision_format,'native');
  const options=seen[0].options;assert.equal(options.mcpServers.host.type,'sdk');assert.match(options.systemPrompt.append,/mcp__host__/);
  assert.equal((await options.hooks.PreToolUse[0].hooks[0]({})).hookSpecificOutput.permissionDecisionReason,FORWARDED);
  for(const text of [options.systemPrompt.append,NATIVE_INSTRUCTIONS,FORWARDED,NATIVE_BATCH_RULES,seen[0].prompt,nativeInput(body),DECISION_INSTRUCTIONS,decisionInput(body)])
    assert.doesNotMatch(text,/at most one|parallel_tool_calls:false|bounded model/i);
  assert.match(NATIVE_BATCH_RULES,/Multiple independent calls in one response cost nothing extra/);
  assert.match(seen[0].prompt,/Multiple independent calls in one response cost nothing extra/);
  for(const text of [nativeInput({...body,parallel_tool_calls:false}),decisionInput({...body,parallel_tool_calls:false})])
    assert.match(text,/This request sets parallel_tool_calls:false\. Return at most one host tool call\./);
  assert.ok(!seen[0].prompt.includes('"tools"'));assert.ok(!seen[0].prompt.includes('host-decision-v1'));
});
test('parallel host calls are assembled from the stream when only the first reaches a message',async t=>{
  const {transport}=await fixture(t,[{streamed:true,calls:[{id:'call_00_P',name:'read',input:{file_path:'a.txt'}},{id:'call_01_Q',name:'write',input:{file_path:'b.txt',content:'中文 "q"'}}]}]);
  const {result,metrics}=await collect(transport);const calls=result.choices[0].message.tool_calls;
  assert.deepEqual(calls.map(c=>[c.id,c.function.name,JSON.parse(c.function.arguments)]),[['call_00_P','read',{file_path:'a.txt'}],['call_01_Q','write',{file_path:'b.txt',content:'中文 "q"'}]]);
  assert.equal(result.usage.prompt_tokens,3933);assert.equal(result.usage.completion_tokens,96);assert.equal(result.usage.cache_creation_input_tokens,989);assert.equal(metrics.attempts.length,1);
});
test('a streamed call whose arguments never complete is corrected, not forwarded',async t=>{
  let index=0;const {transport,seen}=await fixture(t,()=>index++===0?{streamed:true,calls:[{id:'call_00_R',name:'read',input:{file_path:'a.txt'}}]}:{calls:[{id:'call_00_S',name:'read',input:{file_path:'a.txt'}}]});
  // Drop the closing brace of the streamed arguments; the assistant message never carries this call.
  const original=transport.run;transport.run=async function*(input){for await(const m of original(input)){
    if(m.event?.delta?.partial_json?.endsWith('}'))continue;if(m.type==='assistant'&&m.message.content.some(b=>b.id==='call_00_R'))continue;yield m;}};
  const {result,metrics}=await collect(transport);
  assert.equal(seen.length,2);assert.equal(metrics.attempts[0].errorCode,'invalid_tool_arguments');assert.equal(result.choices[0].message.tool_calls[0].id,'call_00_S');
});
test('native continuation echoes every host-received call before its results under the runtime IDs',async t=>{
  const {transport,seen}=await fixture(t,[{calls:[{id:'call_00_A',name:'read',input:{file_path:'a.ts'}}]},{text:'a.ts 共 3 行，已检查完毕。'}]);
  const first=await collect(transport);const call=first.result.choices[0].message;
  const second=await collect(transport,{...body,messages:[...body.messages,call,{role:'tool',tool_call_id:'call_00_A',content:'HOST_RESULT'}]});
  assert.equal(second.result.choices[0].message.content,'a.ts 共 3 行，已检查完毕。');assert.equal(seen[1].options.resume,'native-session');
  const input=JSON.parse(seen[1].prompt.split('\n')[0]);assert.equal(input.history,'new-messages-only');
  assert.deepEqual(input.messages,[{role:'assistant',host_received_calls:[{id:'call_00_A',name:'read',received_input:{file_path:'a.ts'}}],content:input.messages[0].content},{role:'tool',tool_call_id:'call_00_A',content:'HOST_RESULT'}]);
  assert.match(input.messages[0].content,/all calls.*actually received and executed.*Max turns \(1\) exceeded.*not a limit on you.*results below correspond.*by ID.*resend them now/i);
  assert.ok(!seen[1].prompt.includes('prior_decision_calls'));assert.ok(!seen[1].prompt.includes('host rules'));assert.equal(second.metrics.historyMode,'delta');
  assert.deepEqual(second.metrics.nativeEcho,{calls:1,characters:JSON.stringify(input.messages[0]).length,truncated:false});
});
test('native parallel echo preserves call order and the result IDs that follow it',async t=>{
  const calls=[{id:'call_00_P',name:'read',input:{file_path:'a.ts'}},{id:'call_01_Q',name:'write',input:{file_path:'b.ts',content:'B'}}];
  const {transport,seen}=await fixture(t,[{calls},{text:'两个结果均已收到。'}]);const first=await collect(transport),message=first.result.choices[0].message;
  await collect(transport,{...body,messages:[...body.messages,message,{role:'tool',tool_call_id:'call_00_P',content:'RESULT_A'},{role:'tool',tool_call_id:'call_01_Q',content:'RESULT_B'}]});
  const input=JSON.parse(seen[1].prompt.split('\n')[0]);
  assert.deepEqual(input.messages[0].host_received_calls,[{id:'call_00_P',name:'read',received_input:{file_path:'a.ts'}},{id:'call_01_Q',name:'write',received_input:{file_path:'b.ts',content:'B'}}]);
  assert.deepEqual(input.messages.slice(1).map(m=>[m.tool_call_id,m.content]),[['call_00_P','RESULT_A'],['call_01_Q','RESULT_B']]);
});
test('native echo truncates long string values and reduces later calls at the total limit',async t=>{
  const calls=Array.from({length:6},(_,i)=>({id:`call_long_${i}`,name:'write',input:{file_path:String(i)+'p'.repeat(700),content:String(i)+'x'.repeat(1400)}}));
  const {transport,seen}=await fixture(t,[{calls},{text:'长参数回显检查完毕。'}]);const first=await collect(transport),message=first.result.choices[0].message;
  const results=calls.map(call=>({role:'tool',tool_call_id:call.id,content:'OK'}));
  const second=await collect(transport,{...body,messages:[...body.messages,message,...results]});
  const echo=JSON.parse(seen[1].prompt.split('\n')[0]).messages[0],received=echo.host_received_calls;
  assert.equal(received.length,6);assert.equal(received[0].received_input.content,('0'+'x'.repeat(1400)).slice(0,600)+'…(shortened here; the host received all 1401 characters)');
  assert.match(received[0].received_input.file_path,/the host received all 701 characters/);assert.deepEqual(received.at(-1),{id:'call_long_5',name:'write'});
  assert.ok(JSON.stringify(echo).length<=6000);assert.deepEqual(second.metrics.nativeEcho,{calls:6,characters:JSON.stringify(echo).length,truncated:true});
});
test('new, replayed and reset native requests do not add an echo',async t=>{
  const {transport,seen}=await fixture(t,[{calls:[{id:'call_00_A',name:'read',input:{file_path:'a.ts'}}]},{text:'继续完成。'},{text:'新会话完成。'}]);
  const first=await collect(transport),message=first.result.choices[0].message;
  assert.equal(JSON.parse(seen[0].prompt.split('\n')[0]).history,'full');assert.ok(!seen[0].prompt.includes('host_received_calls'));
  const replay=await collect(transport);assert.equal(seen.length,1);assert.equal(replay.metrics.localReplay,true);assert.deepEqual(replay.metrics.nativeEcho,{calls:0,characters:0,truncated:false});
  const continuation={...body,messages:[...body.messages,message,{role:'tool',tool_call_id:'call_00_A',content:'HOST_RESULT'}]};
  await collect(transport,continuation);assert.ok(seen[1].prompt.includes('host_received_calls'));
  const reset=await collect(transport,{...continuation,messages:[{role:'system',content:'changed host rules'},...continuation.messages.slice(1)]});
  const input=JSON.parse(seen[2].prompt.split('\n')[0]);assert.equal(input.history,'full');assert.ok(!seen[2].prompt.includes('host_received_calls'));
  assert.equal(seen[2].options.resume,undefined);assert.equal(reset.metrics.context_reset.first_changed_index,0);assert.deepEqual(reset.metrics.nativeEcho,{calls:0,characters:0,truncated:false});
});
test('both native prompts explain the Max turns handoff marker and per-message call echo',async()=>{
  const {bridgePromptConfig}=await import('../../../app/services/runtime-prompts.mjs');
  for(const prompt of [NATIVE_INSTRUCTIONS,bridgePromptConfig('kimi').workbuddy.hostPrompts.native])
    assert.match(prompt,/Max turns \(1\) exceeded.*handoff marker, not a limit on you; each host message lists the calls the host actually received\./i);
});
test('plain final text streams progressively without a JSON envelope',async t=>{
  const text='已完成：修改了 3 个文件。\n\n- `a.ts`：修复换行\n- `b.ts`：补测试\n\n全部测试通过。';
  const {transport}=await fixture(t,[{text}]);const {result,contents}=await collect(transport);
  assert.equal(result.choices[0].message.content,text);assert.ok(contents.length>2);assert.equal(contents.join(''),text);assert.equal(result.choices[0].finish_reason,'stop');
});
test('an announcement that calls nothing is never shown and is corrected once',async t=>{
  const {transport,seen}=await fixture(t,[{text:"I'll read the config file first."},{calls:[{id:'call_00_C',name:'read',input:{file_path:'config.ts'}}]}]);
  const {result,raw,metrics}=await collect(transport);
  assert.equal(seen.length,2);assert.match(seen[1].prompt,/announcing your next action/);assert.equal(seen[1].options.resume,'native-session');
  assert.equal(result.choices[0].message.tool_calls[0].id,'call_00_C');assert.ok(!raw.includes("I'll read the config"));assert.equal(result.choices[0].message.content,null);
  assert.equal(metrics.attempts[0].errorCode,'unfinished_turn');
});
test('a repeated announcement is delivered as the answer instead of failing the task',async t=>{
  const {transport,seen}=await fixture(t,[{text:'我先检查一下。'},{text:'我先检查一下配置。'}]);
  const {result}=await collect(transport);assert.equal(seen.length,2);assert.equal(result.choices[0].message.content,'我先检查一下配置。');
});
test('printed DSML becomes validated host calls, is never streamed, and is acknowledged next turn',async t=>{
  const dsml='<｜｜DSML｜｜ calls>\n<｜｜DSML｜｜ invoke name="read">\n<｜｜DSML｜｜ parameter name="file_path" string="true">a.ts</｜｜DSML｜｜ parameter>\n</｜｜DSML｜｜ invoke>\n</｜｜DSML｜｜ calls>';
  const {transport,seen}=await fixture(t,[{text:'先读取 a.ts。\n'+dsml},{text:'读取完毕，内容正常。'}]);
  const first=await collect(transport);const message=first.result.choices[0].message;
  assert.equal(JSON.parse(message.tool_calls[0].function.arguments).file_path,'a.ts');assert.ok(!first.raw.includes('｜｜DSML'));assert.equal(message.content.trim(),'先读取 a.ts。');
  assert.equal(first.result.usage.bridge_decision_format,'native-text');
  await collect(transport,{...body,messages:[...body.messages,message,{role:'tool',tool_call_id:message.tool_calls[0].id,content:'R'}]});
  // Text calls retain the JSON acknowledgement instead of using the native host-received echo.
  const input=JSON.parse(seen[1].prompt.split('\n')[0]);assert.ok(input.messages[0].prior_decision_calls||input.messages[0].tool_calls);assert.equal(input.messages[0].host_received_calls,undefined);
  assert.equal(seen[1].prompt.split(message.tool_calls[0].id).length-1,2);
});
test('undecodable printed markup is corrected and only the prose before it is shown',async t=>{
  const {transport,seen}=await fixture(t,[{text:'Here is the plan for this change.\n<｜｜DSML｜｜ invoke name="read">'},{text:'Done: nothing else to change.'}]);
  const {result,raw}=await collect(transport);
  assert.equal(seen.length,2);assert.ok(!raw.includes('｜｜DSML'));assert.match(seen[1].prompt,/protocol markup as text/);
  assert.equal(result.choices[0].message.content,'Here is the plan for this change.\n\n\nDone: nothing else to change.');
});
test('fenced and inline markup examples remain part of an answer',async t=>{
  const text='格式示例如下：\n```xml\n<｜｜DSML｜｜ invoke name="read">\n```\n行内写法 `<invoke name="x">` 也只是示例。';
  const {transport,seen}=await fixture(t,[{text}]);const {result}=await collect(transport);
  assert.equal(seen.length,1);assert.equal(result.choices[0].message.content,text);
});
test('printed host arguments are held back and corrected into a native call',async t=>{
  const {transport,seen}=await fixture(t,[{text:'{"file_path":"a.ts","content":"x"}'},{calls:[{id:'call_00_W',name:'write',input:{file_path:'a.ts',content:'x'}}]}]);
  const {result,contents}=await collect(transport);
  assert.equal(seen.length,2);assert.deepEqual(contents,[]);assert.equal(result.choices[0].message.tool_calls[0].function.name,'write');
});

test('pretty-printed host arguments never stream and are corrected into a native call',async t=>{
  const text='{\n  "file_path": "a.ts",\n  "content": "fixture"\n}';
  const {transport,seen}=await fixture(t,[{text},{calls:[{id:'call_pretty',name:'write',input:{file_path:'a.ts',content:'fixture'}}]}]);
  const {result,contents,metrics}=await collect(transport);
  assert.equal(seen.length,2);assert.deepEqual(contents,[]);assert.equal(result.choices[0].message.tool_calls[0].id,'call_pretty');
  assert.equal(metrics.attempts[0].errorCode,'invalid_decision');
});

test('unfenced documentation cannot become an executable legacy call',async t=>{
  for(const document of [JSON.stringify({action:'tool_calls',calls:[{name:'write',arguments:{file_path:'example.txt',content:'fixture'}}]}),
    '<｜｜DSML｜｜ calls>\n<｜｜DSML｜｜ invoke name="write">\n<｜｜DSML｜｜ parameter name="file_path" string="true">example.txt</｜｜DSML｜｜ parameter>\n<｜｜DSML｜｜ parameter name="content" string="true">fixture</｜｜DSML｜｜ parameter>\n</｜｜DSML｜｜ invoke>\n</｜｜DSML｜｜ calls>']){
    const {transport,seen}=await fixture(t,[{text:'下面是调用示例，请勿执行：\n'+document},{text:'该示例仅用于说明格式。'}]);
    const {result,raw,metrics}=await collect(transport);
    assert.equal(seen.length,2);assert.equal(result.choices[0].finish_reason,'stop');assert.equal(result.choices[0].message.tool_calls,undefined);
    assert.equal(metrics.attempts[0].errorCode,'invalid_decision');assert.ok(!raw.includes('example.txt'));assert.equal(transport.metrics.hostCalls,0);
  }
});

test('legacy execution preambles still decode as whole documents',async t=>{
  const text='先读取 a.ts。\n'+JSON.stringify({action:'tool_calls',calls:[{name:'read',arguments:{file_path:'a.ts'}}]});
  const {transport,seen}=await fixture(t,[{text}]);const {result}=await collect(transport);
  assert.equal(seen.length,1);assert.equal(result.choices[0].message.content.trim(),'先读取 a.ts。');
  assert.equal(result.choices[0].message.tool_calls[0].function.name,'read');
});

test('explicit JSON response formats preserve business fields and protocol examples exactly',async t=>{
  const documents=[JSON.stringify({action:'final',content:'business-json'}),
    JSON.stringify({action:'tool_calls',calls:[{name:'write',arguments:{file_path:'example.txt',content:'fixture'}}]}),
    '{\n  "file_path": "example.txt",\n  "content": "<｜｜DSML｜｜ calls>"\n}'];
  for(const type of ['json_object','json_schema'])for(const text of documents){
    const {transport,seen}=await fixture(t,[{text}]);
    const {result,contents}=await collect(transport,{...body,response_format:{type,...(type==='json_schema'?{json_schema:{name:'answer',schema:{type:'object'}}}:{})}});
    assert.equal(seen.length,1);assert.equal(result.choices[0].message.content,text);assert.equal(contents.join(''),text);assert.ok(contents.length>=1);
    assert.equal(result.choices[0].finish_reason,'stop');assert.equal(result.choices[0].message.tool_calls,undefined);
    assert.deepEqual(JSON.parse(result.choices[0].message.content),JSON.parse(text));assert.match(seen[0].prompt,/JSON document requested by response_format/);
  }
});

test('response_format text keeps the native call guard enabled',async t=>{
  const {transport,seen}=await fixture(t,[{text:'{\n"file_path":"a.ts"\n}'},{calls:[{id:'call_text',name:'read',input:{file_path:'a.ts'}}]}]);
  const {result,contents}=await collect(transport,{...body,response_format:{type:'text'}});
  assert.equal(seen.length,2);assert.deepEqual(contents,[]);assert.equal(result.choices[0].message.tool_calls[0].id,'call_text');
});

test('native call prefixes require a successful terminal result or the exact expected runtime stop',async t=>{
  const failures=[
    {error:new Error('Transport closed before terminal response'),code:'upstream_failure'},
    {error:new Error('HTTP 400 code 11128 unapproved channel'),code:'workbuddy_11128'},
    {code:'sdk_incomplete'},
    {messageStop:true,code:'sdk_incomplete'},
    {result:{type:'result',subtype:'error_during_execution',is_error:true,errors:['unapproved channel 11128']},code:'workbuddy_11128'},
    {result:{type:'result',subtype:'error_during_execution',is_error:true,errors:['Transport closed']},code:'sdk_incomplete'},
    {error:Object.assign(new Error('Max turns (1) exceeded'),{errors:['Max turns (1) exceeded','Transport closed']}),code:'upstream_failure'},
    {error:new Error('Max turns (2) exceeded'),code:'upstream_failure'},
  ];
  for(const failure of failures){
    const {transport}=await fixture(t,[]);
    transport.run=async function*(){
      yield {type:'system',subtype:'init',model,session_id:'incomplete-session',mcp_servers:[{name:'host',status:'connected'}]};
      yield {type:'stream_event',event:{type:'message_start',message:{model,usage}}};
      yield {type:'stream_event',event:{type:'content_block_start',index:2,content_block:{type:'tool_use',id:'first_of_batch',name:'mcp__host__read',input:{}}}};
      yield {type:'stream_event',event:{type:'content_block_delta',index:2,delta:{type:'input_json_delta',partial_json:'{"file_path":"a.ts"}'}}};
      yield {type:'stream_event',event:{type:'content_block_stop',index:2}};
      if(failure.messageStop)yield {type:'stream_event',event:{type:'message_stop'}};
      if(failure.result)yield failure.result;
      if(failure.error)throw failure.error;
    };
    const {raw,metrics}=await collect(transport);
    assert.match(raw,new RegExp('"code":"'+failure.code+'"'));assert.ok(!raw.includes('[DONE]'));assert.ok(!raw.includes('"tool_calls":['));
    assert.equal(transport.metrics.started,1);assert.equal(transport.metrics.hostCalls,0);assert.equal(transport.warm.stats.started,0);
    assert.equal(metrics.knownUsage.prompt_tokens,5000);assert.equal(metrics.knownUsage.prompt_tokens_details.cached_tokens,4000);
  }
});

test('a successful native terminal result confirms the complete call batch',async t=>{
  const {transport}=await fixture(t,[{calls:[{id:'call_success',name:'read',input:{file_path:'a.ts'}}]}]);
  const original=transport.run;
  transport.run=async function*(input){
    try{yield* original(input);}catch(error){
      assert.match(error.message,/^Max turns/);yield {type:'result',subtype:'success',is_error:false,usage};
    }
  };
  const {result}=await collect(transport);assert.equal(result.choices[0].message.tool_calls[0].id,'call_success');
});
test('schema-invalid native arguments get a native correction with the validation detail',async t=>{
  const {transport,seen}=await fixture(t,[{calls:[{id:'call_00_X',name:'write',input:{file_path:'a.ts'}}]},{calls:[{id:'call_00_Y',name:'write',input:{file_path:'a.ts',content:'ok'}}]}]);
  const {result,metrics}=await collect(transport);
  assert.equal(seen.length,2);assert.match(seen[1].prompt,/missingProperty/);assert.match(seen[1].prompt,/content/);assert.equal(result.choices[0].message.tool_calls[0].id,'call_00_Y');
  assert.equal(metrics.attempts[0].errorCode,'invalid_tool_arguments');assert.deepEqual(metrics.attempts[0].correction.tools,['write']);
});
test('a host call cut by the output budget is never forwarded',async t=>{
  const {transport}=await fixture(t,[{calls:[{id:'call_00_T',name:'write',input:{file_path:'a.ts',content:'partial'}}],stop:'max_tokens'}]);
  const {raw}=await collect(transport);assert.match(raw,/output_budget/);assert.ok(!raw.includes('"tool_calls":['));
});
test('built-in tools, foreign servers and a disconnected host server fail closed',async t=>{
  for(const [step,code] of [[{calls:[{id:'r',name:'Read',input:{file_path:'x'}}]},'native_tool_blocked'],[{text:'x',servers:[{name:'host',status:'connected'},{name:'other',status:'connected'}]},'isolation_failed'],[{text:'x',servers:[{name:'host',status:'failed'}]},'native_tools_unavailable']]){
    const {transport}=await fixture(t,[step]);const {raw}=await collect(transport);assert.match(raw,new RegExp(code));assert.ok(!raw.includes('[DONE]'));
  }
});
test('tool_choice none declares no host functions and answers in text',async t=>{
  const {transport,seen}=await fixture(t,[{text:'Plain answer.',servers:[]}]);
  const {result}=await collect(transport,{...body,tool_choice:'none'});
  assert.deepEqual(seen[0].options.mcpServers,{});assert.equal(result.choices[0].message.content,'Plain answer.');
});

test('a thinking-only Max turns stop gets one correction in the same SDK session and counts both attempts',async t=>{
  const {transport,seen}=await fixture(t,[{thinkingOnly:true},{calls:[{id:'call_recovered',name:'read',input:{file_path:'a.ts'}}]}]);
  const run=transport.run;transport.run=async function*(input){
    if(!seen.length){await input.options.canUseTool('mcp__host__read',{});await input.options.hooks.PreToolUse[0].hooks[0]({tool_name:'mcp__host__read'});}
    yield* run(input);
  };
  const {result,raw,metrics}=await collect(transport);
  assert.equal(seen.length,2);assert.equal(seen[1].options.resume,'native-session');assert.equal(seen[1].options.model,model);
  assert.match(seen[1].prompt,/上一条没有给出工具调用或答复，请给出下一步/);
  assert.equal(result.choices[0].message.tool_calls[0].id,'call_recovered');assert.doesNotMatch(raw,/Max turns/);
  assert.equal(metrics.attempts[0].errorCode,'missing_native_output');
  assert.deepEqual(metrics.attempts[0].observation,{thinkingCharacters:27,textCharacters:0,toolArgumentCharacters:0,stopReasons:['end_turn'],deniedToolCount:2,deniedTools:['mcp__host__read']});
  assert.doesNotMatch(JSON.stringify(metrics.attempts[0].observation),/synthetic private/);
  assert.equal(result.usage.prompt_tokens,5000);assert.equal(result.usage.bridge_usage_attempts,2);assert.equal(result.bridge_usage.correction_calls,1);
  assert.equal(result.bridge_usage.accounting.attempts,2);assert.equal(result.bridge_usage.accounting.known_prompt_tokens,10000);
});

test('repeated empty native stops fail clearly after one correction and identical HTTP retries are free replays',async t=>{
  const {transport,seen}=await fixture(t,[{thinkingOnly:true},{thinkingOnly:true}],{decisionRetries:8});
  const {raw,metrics}=await collect(transport);
  assert.equal(seen.length,2);assert.match(raw,/模型这一步没有给出工具调用或答复/);assert.match(raw,/"automatic_retry":false/);assert.doesNotMatch(raw,/Max turns|\[DONE\]/);
  assert.equal(metrics.attempts.length,2);assert.equal(metrics.knownUsage.prompt_tokens,5000);assert.equal(metrics.knownUsage.bridge_usage_attempts,2);
  assert.deepEqual(metrics.attempts[0].observation.deniedTools,[]);assert.equal(metrics.attempts[0].observation.deniedToolCount,0);
  const event=raw.split('\n').filter(s=>s.startsWith('{')).map(s=>JSON.parse(s)).find(e=>e.bridge_usage);
  assert.equal(event.bridge_usage.correction_calls,1);assert.equal(event.bridge_usage.accounting.attempts,2);
  const replay=await collect(transport);assert.equal(seen.length,2);assert.match(replay.raw,/local-rejection-replay/);
});

test('thinking without calls cannot hide transport, authentication, mixed-stop or unexpected turn-limit errors',async t=>{
  const failures=[new Error('Transport closed'),new Error('HTTP 401 authentication rejected'),new Error('Max turns (2) exceeded'),Object.assign(new Error('Max turns (1) exceeded'),{errors:['Max turns (1) exceeded','Transport closed']})];
  for(const failure of failures){
    const {transport,seen}=await fixture(t,[{thinkingOnly:true}]);const run=transport.run;
    transport.run=async function*(input){try{yield* run(input);}catch{throw failure;}};
    const {raw}=await collect(transport);assert.equal(seen.length,1);assert.doesNotMatch(raw,/missing_native_output|llm\/retry-started|\[DONE\]/);
  }
});

test('empty native recovery honors zero retries and refuses output-budget stops',async t=>{
  for(const [cfg,step,code] of [[{decisionRetries:0},{thinkingOnly:true},'missing_native_output'],[{}, {thinkingOnly:true,stop:'max_tokens'},'output_budget']]){
    const {transport,seen}=await fixture(t,[step],cfg);const {raw}=await collect(transport);
    assert.equal(seen.length,1);assert.match(raw,new RegExp(code));assert.doesNotMatch(raw,/Max turns|\[DONE\]/);
  }
});

test('a declared host function called without its prefix is forwarded with a local repair',async t=>{
  const {transport,seen}=await fixture(t,[{raw:true,calls:[{id:'call_00_U',name:'read',input:{file_path:'a.ts'}}]}]);
  const {result,metrics}=await collect(transport);
  assert.equal(seen.length,1);assert.equal(metrics.attempts.length,1);
  assert.deepEqual(result.choices[0].message.tool_calls.map(c=>[c.id,c.function.name,JSON.parse(c.function.arguments)]),[['call_00_U','read',{file_path:'a.ts'}]]);
  assert.deepEqual(metrics.attempts[0].repairs,[{kind:'unprefixed_host_tool',tool:'read'}]);
});

test('an unprefixed host call still has to satisfy the declared schema',async t=>{
  const {transport}=await fixture(t,[{raw:true,calls:[{id:'call_00_U',name:'read',input:{file_path:5}}]}],{decisionRetries:0});
  const {raw,metrics}=await collect(transport);
  assert.match(raw,/invalid_tool_arguments/);assert.equal(metrics.attempts[0].errorCode,'invalid_tool_arguments');
  assert.match(raw,/read:/);
});

test('a runtime built-in tool name is corrected once into the declared host function',async t=>{
  const {transport,seen}=await fixture(t,[
    {raw:true,calls:[{id:'call_00_B',name:'Read',input:{file_path:'a.ts'}}]},
    {raw:true,calls:[{id:'call_00_C',name:'read',input:{file_path:'a.ts'}}]}]);
  const {result,metrics}=await collect(transport);
  assert.equal(seen.length,2);assert.equal(metrics.attempts[0].errorCode,'native_tool_blocked');
  assert.match(seen[1].prompt,/You called "Read", which is not a host function/);
  assert.match(seen[1].prompt,/the declared host functions are: mcp__host__read, mcp__host__write/);
  assert.equal(seen[1].options.resume,'native-session');
  assert.equal(result.choices[0].message.tool_calls[0].id,'call_00_C');assert.equal(metrics.attempts[1].errorCode,undefined);
});

test('a batch mixing a host call with a non-host tool is rejected whole',async t=>{
  const mixed={raw:true,calls:[{id:'call_00_M',name:'read',input:{file_path:'a.ts'}},{id:'call_01_N',name:'WebSearch',input:{query:'x'}}]};
  const {transport,seen}=await fixture(t,[mixed,mixed],{decisionRetries:1});
  const {raw,metrics}=await collect(transport);
  assert.equal(metrics.attempts.length,2);assert.match(raw,/native_tool_blocked/);assert.match(raw,/WebSearch/);
  assert.doesNotMatch(raw,/"tool_calls"/);assert.equal(seen.length,2);
});

test('an exhausted native tool correction reports the offending tool name',async t=>{
  const builtin={raw:true,calls:[{id:'call_00_B',name:'Bash',input:{command:'ls'}}]};
  const {transport,seen}=await fixture(t,[builtin,builtin],{decisionRetries:1});
  const {raw}=await collect(transport);
  assert.equal(seen.length,2);assert.match(raw,/native_tool_blocked/);assert.match(raw,/Bash/);
  assert.match(raw,/which is not a host function/);assert.match(raw,/"automatic_retry":false/);
});

test('streamed tool arguments are counted as tool-argument activity, not text',async t=>{
  const calls=[{id:'call_00_P',name:'read',input:{file_path:'a.txt'}},{id:'call_01_Q',name:'write',input:{file_path:'b.txt',content:'中文 "q"'}}];
  const {transport}=await fixture(t,[{streamed:true,calls}]);
  const {metrics}=await collect(transport);
  const expected=calls.reduce((total,call)=>total+JSON.stringify(call.input).length,0);
  assert.equal(metrics.attempts[0].observation.toolArgumentCharacters,expected);
  assert.equal(metrics.toolArgumentCharacters,expected);
});
test('native host tool definitions never carry the top-level $schema marker',async()=>{
  const draft={type:'function',function:{name:'fetch',description:'Fetch a page',parameters:{$schema:'https://json-schema.org/draft/2020-12/schema',type:'object',properties:{url:{type:'string'}},required:['url'],additionalProperties:false}}};
  const server=hostServer([...tools,draft]).instance,[a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);
  const client=new Client({name:'test',version:'1.0.0'});await client.connect(b);
  const listed=(await client.listTools()).tools;
  assert.deepEqual(listed.map(t=>t.name),['read','write','fetch']);
  assert.equal(Object.hasOwn(listed[2].inputSchema,'$schema'),false);
  assert.deepEqual(listed[2].inputSchema,{type:'object',properties:{url:{type:'string'}},required:['url'],additionalProperties:false});
  assert.equal(listed[2].description,'Fetch a page');assert.deepEqual(listed[0].inputSchema,tools[0].function.parameters);
  assert.equal(draft.function.parameters.$schema,'https://json-schema.org/draft/2020-12/schema');
  await client.close();
});
test('JSON mode fails a runtime built-in tool call immediately without a correction round',async t=>{
  const {transport,seen}=await fixture(t,[{calls:[{id:'r',name:'Read',input:{file_path:'x'}}],servers:[]}],{toolMode:'json'});
  const {raw}=await collect(transport);
  assert.equal(seen.length,1);assert.match(raw,/native_tool_blocked/);assert.ok(!raw.includes('[DONE]'));
});
