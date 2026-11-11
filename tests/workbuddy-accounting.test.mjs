import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {SdkTransport} from '../bridges/workbuddy-bridge/src/sdk-transport.mjs';
import {createBridge} from '../bridges/workbuddy-bridge/src/server.mjs';
import {usageAccounting} from '../bridges/workbuddy-bridge/src/usage.mjs';
import {relayCompletion} from '../app/services/gateway-usage.mjs';

for(const stream of [false,true])for(const mode of ['recovered','failed','unknown','unreported'])test(`WorkBuddy ${mode} usage reaches the gateway once with coverage and correction count (${stream?'SSE':'JSON'})`,async t=>{
  await mkdir('.runtime/tests',{recursive:true});const runtime=await mkdtemp(resolve('.runtime/tests/wb-accounting-'));
  const model='fixture',info={id:model,contextWindow:200000,maxTokens:128000,reasoning:{supportedEfforts:['low']}},seen=[];
  const transport=new SdkTransport({runtime,cliPath:process.execPath,toolMode:'native',decisionRetries:1},{get:async()=>({accessToken:'synthetic',uid:'fixture',domain:'www.workbuddy.cn'})},{run:async function*({options}){
    seen.push(options);
    yield {type:'system',subtype:'init',model,session_id:'accounting-fixture',mcp_servers:[]};
    if(mode==='unknown'&&seen.length===2)throw new Error('Synthetic transport disconnect');
    const usage=mode==='unreported'?undefined:{input_tokens:100,output_tokens:10,cache_read_input_tokens:80};
    yield {type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'end_turn'},usage}};
    if(mode==='recovered'&&seen.length===2){yield {type:'assistant',message:{model,content:[{type:'text',text:'Complete fixture answer.'}],usage}};yield {type:'result',subtype:'success',is_error:false};return;}
    yield {type:'stream_event',event:{type:'content_block_delta',index:0,delta:{type:'thinking_delta',thinking:'synthetic reasoning'}}};
    throw new Error('Max turns (1) exceeded');
  }});
  const bridge=createBridge({cfg:{concurrency:1,queueLimit:1,timeoutMs:5000,heartbeatMs:1000,bodyLimit:100000},provider:{model:info,ready:async()=>info,chat:(...args)=>transport.chat(...args),status:()=>({}),close:()=>transport.close()},key:'synthetic-local-key',instanceId:'fixture',log:async()=>{}});
  await new Promise(r=>bridge.server.listen(0,'127.0.0.1',r));t.after(()=>bridge.close());
  const response=await fetch(`http://127.0.0.1:${bridge.server.address().port}/v1/chat/completions`,{method:'POST',headers:{authorization:'Bearer synthetic-local-key','content-type':'application/json'},body:JSON.stringify({model:'workbuddy-deepseek-flash-200k',messages:[{role:'user',content:'fixture'}],stream})});
  const usage=[],notices=[],failures=[],wire=[];
  await relayCompletion(response,{write:s=>{wire.push(s);return true;},end:s=>{if(s)wire.push(s);}},{signal:new AbortController().signal,includeUsage:true,onUsage:async e=>usage.push(e),onNotice:async e=>notices.push(e),onFailure:async e=>failures.push(e)});
  assert.equal(seen.length,2);assert.equal(seen[1].resume,'accounting-fixture');assert.equal(usage.length,1);
  const data=usage[0].data,accounting=data.usage_accounting;
  assert.equal(data.correction_calls,1);assert.equal(accounting.attempts,2);assert.equal(accounting.reasoning_tokens,null);assert.equal(accounting.unknown_reasoning_attempts,2);
  if(mode==='unreported'){
    assert.equal(data.prompt_tokens,null);assert.equal(data.completion_tokens,null);assert.equal(accounting.prompt_tokens,null);assert.equal(accounting.known_prompt_tokens,0);assert.equal(accounting.unknown_prompt_attempts,2);
  }else if(mode==='unknown'){
    assert.equal(accounting.prompt_tokens,null);assert.equal(accounting.known_prompt_tokens,100);assert.equal(accounting.unknown_prompt_attempts,1);
    assert.equal(data.prompt_tokens,100);
  }else{assert.equal(accounting.prompt_tokens,200);assert.equal(accounting.unknown_prompt_attempts,0);assert.equal(data.prompt_tokens,100);assert.equal(data.completion_tokens,20);}
  if(mode==='recovered'){assert.equal(failures.length,0);assert.match(wire.join(''),/Complete fixture answer/);}
  else{assert.equal(failures.length,1);assert.doesNotMatch(wire.join(''),/Max turns|\[DONE\]/);}
  if(stream)assert.equal(notices.filter(e=>e.name==='llm/retry-started').length,1);
});

test('all unknown and local replay accounting keep distinct coverage',()=>{
  assert.deepEqual(usageAccounting([null]),{attempts:1,sources:[],prompt_tokens:null,known_prompt_tokens:0,unknown_prompt_attempts:1,completion_tokens:null,known_completion_tokens:0,unknown_completion_attempts:1,reasoning_tokens:null,known_reasoning_tokens:0,unknown_reasoning_attempts:1});
  const replay=usageAccounting([]);assert.equal(replay.attempts,0);assert.equal(replay.prompt_tokens,0);
});
