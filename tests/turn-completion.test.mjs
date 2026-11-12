import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tsImport} from 'tsx/esm/api';
import {guardDecision,canStreamFinal,isProgressOnlyFinal} from '../app/services/turn-completion.mjs';
import {bridgePromptConfig} from '../app/services/runtime-prompts.mjs';
import {SdkTransport} from '../bridges/workbuddy-bridge/src/sdk-transport.mjs';
import {relayCompletion} from '../app/services/gateway-usage.mjs';
import {dshEvent} from '../app/runtimes/dsh.mjs';
import {holdFixture,collectHold,hostResults} from './fixtures/workbuddy-hold.mjs';
const {createBridgeServer,PUBLIC_MODEL}=await tsImport('../bridges/qoderbridge/src/server.ts',import.meta.url);
const tools=[{type:'function',function:{name:'Read',parameters:{type:'object',properties:{path:{type:'string'}},required:['path'],additionalProperties:false}}}];
const request={model:PUBLIC_MODEL,messages:[{role:'user',content:'审查示例项目，读取必要文件，然后给出实际检查结果。'}],tools};
// Synthetic fixture, not a saved model response or a user's private task.
const announcement='我会先读取示例文件，再检查测试，随后整理审查结果。';
const call={kind:'tool_call',name:'Read',arguments:{path:'fixture.txt'}};
const usage={prompt_tokens:100,completion_tokens:12,total_tokens:112};
async function directory(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/turn-guard-'));}
async function qoder(t,outputs){
  const dir=await directory(),seen=[];
  const infer=async(config,prompt,_gate,onText)=>{const response=outputs[Math.min(seen.length,outputs.length-1)];seen.push({model:config.model,prompt});for(const char of response)onText?.(char);return {response,error:null,stage:'inference',result:'success',stream_stop_reasons:['end_turn'],model_requests:1,normalized_usage:usage,client_usage:usage};};
  const server=await createBridgeServer({auth:'cli',timeout:5000,strategy:'permission',...bridgePromptConfig('kimi').qoder,decisionRetries:1},{port:0,key:'fixture',infer,prewarm:false,reportDir:dir});
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
  const send=body=>fetch('http://127.0.0.1:'+server.address().port+'/v1/chat/completions',{method:'POST',headers:{authorization:'Bearer fixture','content-type':'application/json'},body:JSON.stringify({...request,...body})});
  return {seen,send,dir};
}
test('short promises are guarded while actual answers, questions and plan-only requests remain valid',()=>{
  assert.equal(isProgressOnlyFinal(announcement,request),true);
  assert.equal(isProgressOnlyFinal(announcement,{...request,messages:[...request.messages,{role:'user',content:"<system-reminder>\nToday's date is 2026-10-28. Use the current date.\n</system-reminder>"}]}),true);
  assert.throws(()=>guardDecision({kind:'final',content:announcement},request),/Progress-only/);
  for(const text of ['已检查完示例，发现两个明确问题。','我先读取了示例配置，端口是 8080。','我会读取它，请提供需要检查的路径。','你需要我检查哪个目录？','1. 读取文件\n2. 检查测试'])assert.equal(isProgressOnlyFinal(text,request),false);
  assert.equal(isProgressOnlyFinal(announcement,{...request,messages:[{role:'user',content:'审查项目前，只需要给出一个计划，不要使用工具。'}]}),false);
  assert.equal(isProgressOnlyFinal(announcement,{...request,tool_choice:'none'}),false);
  assert.equal(isProgressOnlyFinal(announcement,{...request,tools:[]}),false);
  assert.equal(canStreamFinal('我'),false);assert.equal(canStreamFinal(announcement),false);assert.equal(canStreamFinal('检查结果：这里存在一个错误。'),true);
  for(const text of ['接下来，我会读取示例文件。','Sure, I will inspect the fixture.','I’ll read the fixture.'])for(let i=1;i<=text.length;i++)assert.equal(canStreamFinal(text.slice(0,i)),false,text.slice(0,i));
  assert.equal(isProgressOnlyFinal('I will explain how to read a file.',{...request,messages:[{role:'user',content:'How do I read a file?'}]}),false);
});
const peerstoreTask='请完整阅读项目里的 tools/agent-tasks/SA2-windows-peerstore.md，严格按其中的范围完成任务：只修改文件里列出的文件，不要改其他文件、不要加依赖、不要联网。完成后用中文简要汇报改动和验证结果。';
test('the exact Chinese read/edit task and short first-action replies enter the existing guard',()=>{
  const req={...request,messages:[{role:'user',content:peerstoreTask}]};
  for(const text of ['我先完整阅读任务文件。','我来阅读任务文件。','让我阅读任务文件。','首先阅读任务文件。']){
    assert.equal(isProgressOnlyFinal(text,req),true,text);
    assert.throws(()=>guardDecision({kind:'final',content:text},req),{code:'unfinished_turn'});
    for(let i=1;i<=text.length;i++)assert.equal(canStreamFinal(text.slice(0,i)),false,text.slice(0,i));
  }
  for(const text of ['我先阅读了任务文件，已完成修改，验证结果如下：检查通过。','请提供任务文件路径后再继续。','我先阅读任务文件，但没有访问权限，无法继续。','我来阅读任务文件，需要你先确认范围。','你希望修改哪些文件？'])assert.equal(isProgressOnlyFinal(text,req),false,text);
  assert.equal(isProgressOnlyFinal('我先阅读任务文件。',{...req,messages:[{role:'user',content:'请解释如何阅读和修改文件。'}]}),false);
});
test('the exact Chinese task recovers once at the Qoder HTTP boundary',async t=>{
  const fixture=await qoder(t,['我先完整阅读任务文件。',JSON.stringify(call)]);
  const response=await fixture.send({messages:[{role:'user',content:peerstoreTask}],stream:true}),wire=await response.text();
  assert.equal(fixture.seen.length,2);assert.match(wire,/"finish_reason":"tool_calls"/);assert.doesNotMatch(wire,/我先完整阅读任务文件/);
});
for(const canonical of [false,true])test(`Qoder ${canonical?'JSON':'plain-text'} progress answer is privately corrected into a validated tool call`,async t=>{
  const fixture=await qoder(t,[canonical?JSON.stringify({kind:'final',content:announcement}):announcement,JSON.stringify(call)]);
  const result=await fixture.send({stream:true,stream_options:{include_usage:true}}),wire=await result.text();assert.equal(result.status,200);assert.equal(fixture.seen.length,2);assert.equal(fixture.seen[0].model,fixture.seen[1].model);
  assert.doesNotMatch(wire,new RegExp(announcement));assert.match(wire,/"finish_reason":"tool_calls"/);assert.doesNotMatch(wire,/"finish_reason":"stop"/);assert.match(wire,/llm\/retry-started/);
  const report=JSON.parse((await readFile(join(fixture.dir,'bridge.ndjson'),'utf8')).trim());assert.equal(report.decision_recovery.correctionCalls,1);assert.equal(report.decision_recovery.outcome,'recovered');
});
test('Qoder repeated announcements exhaust once and never produce a successful final',async t=>{
  const fixture=await qoder(t,[announcement]),result=await fixture.send({stream:true}),wire=await result.text();assert.equal(fixture.seen.length,2);assert.match(wire,/"code":"unfinished_turn"/);assert.doesNotMatch(wire,/"finish_reason":"stop"|data: \[DONE\]/);assert.doesNotMatch(wire,new RegExp(announcement));
});
test('Qoder planning-only answer does not force an action',async t=>{
  const fixture=await qoder(t,[announcement]),result=await fixture.send({messages:[{role:'user',content:'审查前只给计划即可，不要使用工具。'}]});assert.equal(result.status,200);assert.equal((await result.json()).choices[0].message.content,announcement);assert.equal(fixture.seen.length,1);
});
for(const native of [false,true])for(const recover of [false,true])test(`WorkBuddy ${native?'replay':'JSON'} progress ${recover?'recovers into a validated host call':'cannot fall back to completed'}`,async t=>{
  const runtime=await directory(),seen=[];
  const transport=new SdkTransport({runtime,cliPath:process.execPath,decisionRetries:1,toolMode:native?'replay':'json',...bridgePromptConfig('kimi').workbuddy},{get:async()=>({accessToken:'fixture',uid:'fixture',domain:'www.workbuddy.cn'})},{run:async function*({options}){
    seen.push(options);yield {type:'system',subtype:'init',model:'fixture',session_id:'same-fixture',mcp_servers:native?[{name:'host',status:'connected'}]:[]};
    const next=recover&&seen.length===2;
    const text=next?(native?'':JSON.stringify({action:'tool_calls',calls:[{name:'Read',arguments:{path:'fixture.txt'}}]})):native?announcement:JSON.stringify({action:'final',content:announcement});
    for(const char of text)yield {type:'stream_event',event:{type:'content_block_delta',index:0,delta:{type:'text_delta',text:char}}};
    yield {type:'assistant',message:{model:'fixture',content:next&&native?[{type:'tool_use',id:'fixture-call',name:'mcp__host__Read',input:{path:'fixture.txt'}}]:[{type:'text',text}]}};yield {type:'result',subtype:'success',is_error:false,result:text,usage:{input_tokens:100,output_tokens:12}};
  }});t.after(()=>transport.close());
  const body={...request,model:'fixture',max_tokens:1000},wire=await (await transport.chat(body,new AbortController().signal)).text();assert.equal(seen.length,2);assert.equal(seen[1].resume,'same-fixture');
  assert.doesNotMatch(wire,/"finish_reason":"stop"/);assert.doesNotMatch(wire,new RegExp(announcement));
  if(recover){assert.match(wire,/"finish_reason":"tool_calls"/);assert.match(wire,/data: \[DONE\]/);}
  else{assert.match(wire,/unfinished_turn/);assert.doesNotMatch(wire,/data: \[DONE\]/);await (await transport.chat(body,new AbortController().signal)).text();assert.equal(seen.length,2,'Identical failed HTTP replay must not invoke the SDK again');}
});
for(const recover of [false,true])test(`WorkBuddy default hold progress ${recover?'recovers into a validated host call':'cannot fall back to completed'}`,async t=>{
  const config=bridgePromptConfig('kimi').workbuddy;
  const fixture=await holdFixture(t,config,(session,_prompt,turn)=>{
    if(recover&&turn===2)return session.toolStep([{id:'held-progress-call',name:'mcp__host__Read',input:{path:'fixture.txt'}}]);
    session.final(announcement);
  },{nativeInvalidRounds:2});
  const body={...request,model:'fixture',max_tokens:1000},response=await fixture.chat(body);
  if(recover){
    const first=await collectHold(response,tools),message=first.result.choices[0].message;
    assert.equal(first.result.choices[0].finish_reason,'tool_calls');assert.equal(first.metrics.native.invalid_calls,1);
    assert.deepEqual(message.tool_calls,[{id:'held-progress-call',type:'function',function:{name:'Read',arguments:'{"path":"fixture.txt"}'}}]);
    assert.doesNotMatch(first.wire,new RegExp(announcement));assert.doesNotMatch(first.wire,/"finish_reason":"stop"/);
    const final=await collectHold(await fixture.chat(hostResults(body,message)),tools);
    assert.equal(final.result.choices[0].message.content,'Complete fixture answer.');assert.equal(final.result.choices[0].finish_reason,'stop');
    assert.deepEqual(fixture.sessions[0].handlerResults.map(result=>result.content[0].text),['host-result-0']);
  }else{
    const wire=await response.text();assert.match(wire,/"code":"unfinished_turn"/);
    assert.doesNotMatch(wire,/"finish_reason":"stop"|data: \[DONE\]/);assert.doesNotMatch(wire,new RegExp(announcement));
    assert.equal(response.bridgeMetrics.native.invalid_calls,2);
  }
  assert.equal(fixture.sessions.length,1);const session=fixture.sessions[0];
  assert.equal(session.prompts.length,2,'Correction must stay in the same V2 session; tool results must not add another send');
  assert.equal(session.options.resume,undefined);assert.equal(session.options.model,'fixture');
  assert.ok(session.options.systemPrompt.startsWith(config.hostPrompts.native+'\n\n'));
  assert.match(session.prompts[1],/only announced the next action/);
});

test('backend status events identify tool preparation, retries and native DSH plans',async()=>{
  const frames=[{choices:[{delta:{bridge_event:{name:'llm/retry-started',data:{retry:1}}},finish_reason:null}]},{choices:[{delta:{tool_calls:[{index:0,id:'a',function:{name:'Read',arguments:'{'}}]},finish_reason:null}]},{choices:[{delta:{tool_calls:[{index:0,function:{arguments:'}'}}]},finish_reason:'tool_calls'}]}];
  const response=new Response(frames.map(x=>'data: '+JSON.stringify(x)+'\n\n').join('')+'data: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}}),events=[],output=[];
  await relayCompletion(response,{write:s=>{output.push(s);return true;},end(){}},{signal:new AbortController().signal,onNotice:async e=>events.push(e)});
  assert.equal(events.filter(e=>e.name==='gateway/tool-call').length,1);assert.equal(events[0].name,'llm/retry-started');assert.doesNotMatch(output.join(''),/bridge_event/);
  assert.equal(dshEvent({type:'approval/asked',data:{toolName:'write'}}).name,'write');
  const todos=[{content:'Inspect fixture',status:'in_progress'},{content:'Report findings',status:'pending'}],plan=dshEvent({type:'todo/write',data:{todos}});
  assert.equal(plan.type,'plan');assert.deepEqual(plan.data.entries,todos);assert.deepEqual(plan.data.todos,todos);
});

test('gateway reports structured failures for JSON and incomplete SSE without delivering a successful terminal',async()=>{
  for(const stream of [false,true]){
    const error={code:'unfinished_turn',message:'Fixture decision failed'},failures=[],output=[];
    const response=new Response(stream?'data: '+JSON.stringify({error})+'\n\n':JSON.stringify({error}),{status:stream?200:502,headers:{'content-type':stream?'text/event-stream':'application/json'}});
    const result=relayCompletion(response,{write:s=>{output.push(s);return true;},end:s=>output.push(s)},{signal:new AbortController().signal,onFailure:async e=>failures.push(e)});
    await result;
    assert.deepEqual(failures,[error]);assert.doesNotMatch(output.join(''),/finish_reason|\[DONE\]/);
  }
});
