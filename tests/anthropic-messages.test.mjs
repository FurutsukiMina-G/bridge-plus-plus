import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {anthropicToChat,anthropicFromChat,AnthropicProjection,anthropicError,anthropicErrorType,anthropicStopReason} from '../app/services/anthropic-messages.mjs';
import {spawn} from 'node:child_process';
import {Gateway} from '../app/services/gateway.mjs';
import {normalizeWorkbuddy,variantFor} from '../app/core/catalog.mjs';

const png={type:'image',source:{type:'base64',media_type:'image/png',data:'iVBORw0KGgo='}};
const parseEvents=text=>text.split('\n\n').filter(Boolean).map(raw=>({event:/^event: (.+)$/m.exec(raw)?.[1],data:JSON.parse(/^data: (.+)$/m.exec(raw)[1])}));

test('Anthropic requests convert every content block without leaking sampling or cache controls',()=>{
  const body={model:'fixture',stream:true,max_tokens:321,stop_sequences:['END'],temperature:0.2,top_p:0.5,top_k:4,thinking:{type:'adaptive'},context_management:{},output_config:{},metadata:{},system:[{type:'text',text:'x-anthropic-billing-header: cc_version=fixture'},{type:'text',text:'System rules',cache_control:{type:'ephemeral'}}],messages:[
    {role:'user',content:[{type:'text',text:'Look'},png,{type:'document',source:{type:'base64',data:'AA=='}},{type:'unknown_block',value:1}]},
    {role:'system',content:[{type:'text',text:'Mid-conversation environment'}]},
    {role:'assistant',content:[{type:'thinking',thinking:'secret'},{type:'redacted_thinking',data:'encrypted'},{type:'text',text:'Working'},{type:'tool_use',id:'call_1',name:'Read',input:{path:'a',cache_control:{type:'ephemeral'}}},{type:'server_tool_use',id:'srv_1',name:'web_search',input:{query:'bridge news'}},{type:'web_search_tool_result',tool_use_id:'srv_1',content:[{type:'web_search_result',title:'Result title',url:'https://example.test/'}]}]},
    {role:'user',content:[{type:'tool_result',tool_use_id:'call_1',is_error:true,content:[{type:'text',text:'Failed'},{type:'tool_reference',tool_name:'Read'},png]},{type:'text',text:'Continue'}]},
  ],tools:[{name:'Read',description:'Read file',input_schema:{$schema:'https://json-schema.org/draft/2020-12/schema',type:'object',properties:{path:{type:'string',cache_control:{type:'ephemeral'}}},cache_control:{type:'ephemeral'}}},{name:'DeferredToolPlaceholder',defer_loading:true,input_schema:{}},{type:'web_search_20260201',name:'web_search'},{type:'code_execution_20260101',name:'code_execution'}],tool_choice:{type:'auto',disable_parallel_tool_use:true}};
  const chat=anthropicToChat(body,{images:true});
  assert.equal(chat.messages[0].content,'System rules');
  assert.equal(chat.messages[1].role,'user');assert.equal(chat.messages[1].content[0].text,'Look');assert.equal(chat.messages[1].content[1].type,'image_url');assert.match(chat.messages[1].content[2].text,/omitted document/);assert.match(chat.messages[1].content[3].text,/omitted unknown_block/);
  assert.deepEqual(chat.messages[2],{role:'system',content:'Mid-conversation environment'});
  assert.equal(chat.messages[3].role,'assistant');assert.doesNotMatch(chat.messages[3].content,/secret|encrypted/);assert.match(chat.messages[3].content,/bridge news/);assert.match(chat.messages[3].content,/Result title\nhttps:\/\/example.test\//);
  assert.deepEqual(chat.messages[3].tool_calls,[{id:'call_1',type:'function',function:{name:'Read',arguments:'{"path":"a"}'}}]);
  assert.deepEqual(chat.messages[4],{role:'tool',tool_call_id:'call_1',content:'[tool error] Failed\nTool definition loaded: Read (now available in the tools list).'});
  assert.equal(chat.messages[5].role,'user');assert.equal(chat.messages[5].content[0].type,'image_url');assert.equal(chat.messages[5].content.at(-1).text,'Continue');
  assert.equal(chat.tools.length,1);assert.equal(chat.tools[0].function.name,'Read');assert.equal(chat.tools[0].function.parameters.$schema,undefined);assert.doesNotMatch(JSON.stringify(chat),/\$schema|cache_control|temperature|top_p|top_k|thinking|context_management|output_config|metadata|DeferredToolPlaceholder|code_execution/);
  assert.equal(chat.max_tokens,321);assert.deepEqual(chat.stop,['END']);assert.equal(chat.stream,true);assert.equal(chat.parallel_tool_calls,false);assert.deepEqual(chat.tool_choice,'auto');
  assert.deepEqual(new Set(chat.bridge_omitted_media),new Set(['document','unknown_block']));
});

test('text-only conversion retains image omissions and tool result ordering',()=>{
  const chat=anthropicToChat({model:'fixture',messages:[{role:'user',content:[png,{type:'tool_result',tool_use_id:'a',content:['one',png]},{type:'tool_result',tool_use_id:'b',content:'two'},{type:'text',text:'after'}]}]});
  assert.equal(chat.messages[0].role,'tool');assert.match(chat.messages[0].content,/one\n\[Bridge\+\+ omitted image/);
  assert.deepEqual(chat.messages[1],{role:'tool',tool_call_id:'b',content:'two'});
  assert.equal(chat.messages[2].role,'user');assert.match(chat.messages[2].content,/omitted image/);assert.match(chat.messages[2].content,/after/);assert.ok(chat.bridge_omitted_media.includes('image'));
  for(const [choice,expected]of [['auto','auto'],['none','none'],[{type:'any'},'required'],[{type:'tool',name:'Read'},{type:'function',function:{name:'Read'}}]])assert.deepEqual(anthropicToChat({model:'fixture',messages:[],tool_choice:choice}).tool_choice,expected);
  assert.equal(anthropicToChat({model:'fixture',messages:[],disable_parallel_tool_use:true}).parallel_tool_calls,false);
});

test('chat completions responses project reasoning, text, tools, usage and stop reasons',()=>{
  const message=anthropicFromChat({model:'fixture'},{choices:[{message:{reasoning_content:'Think',content:'Answer',tool_calls:[{id:'call_1',type:'function',function:{name:'Read',arguments:'{"path":"a"}'}}]},finish_reason:'tool_calls'}],usage:{prompt_tokens:11,completion_tokens:7,prompt_tokens_details:{cached_tokens:5}}});
  assert.equal(message.type,'message');assert.equal(message.role,'assistant');assert.equal(message.stop_reason,'tool_use');
  assert.deepEqual(message.content,[{type:'thinking',thinking:'Think',signature:'bridgepp-thinking-signature'},{type:'text',text:'Answer'},{type:'tool_use',id:'call_1',name:'Read',input:{path:'a'}}]);
  assert.deepEqual(message.usage,{input_tokens:6,output_tokens:7,cache_read_input_tokens:5,cache_creation_input_tokens:0});
  for(const [reason,expected]of [['stop','end_turn'],['tool_calls','tool_use'],['length','max_tokens'],['content_filter','refusal'],[undefined,'end_turn']])assert.equal(anthropicStopReason(reason),expected);
  assert.equal(anthropicStopReason(undefined,true),'tool_use');
});

test('streaming projection joins multiple tool indices and signs reasoning',()=>{
  const events=[],projection=new AnthropicProjection('fixture',event=>events.push(event));
  const accept=(delta,finish_reason=null,usage)=>projection.accept({...usage?{usage}:{},choices:[{delta,finish_reason}]});
  accept({reasoning_content:'A'},null,{prompt_tokens:20});accept({reasoning_content:'B'});accept({content:'Text'});
  accept({tool_calls:[{index:0,id:'a',type:'function',function:{name:'Read',arguments:'{"path":'}}]});
  accept({tool_calls:[{index:1,id:'b',type:'function',function:{name:'Glob',arguments:'{"pattern":'}}]});
  accept({tool_calls:[{index:0,function:{arguments:'"a"}'}},{index:1,function:{arguments:'"*.js"}'}}]});accept({},'tool_calls',{prompt_tokens:20,completion_tokens:9});
  const message=projection.finish();
  assert.equal(events[0].type,'message_start');assert.equal(events[0].message.usage.input_tokens,20);
  assert.deepEqual(message.content.map(block=>block.type),['thinking','text','tool_use','tool_use']);
  assert.equal(message.content[0].thinking,'AB');assert.equal(message.content[0].signature,'bridgepp-thinking-signature');
  assert.deepEqual(message.content.slice(2).map(block=>block.input),[{path:'a'},{pattern:'*.js'}]);
  assert.deepEqual(events.filter(e=>e.type==='content_block_start').map(e=>e.index),[0,1,2,3]);
  assert.ok(events.some(e=>e.delta?.type==='signature_delta'));assert.equal(events.at(-1).type,'message_stop');assert.equal(events.at(-2).usage.output_tokens,9);
});

test('system keeps every rule line and only drops the billing header lines',()=>{
  const header='x-anthropic-billing-header: cc_version=fixture; cc_entrypoint=sdk-cli;';
  assert.deepEqual(anthropicToChat({model:'fixture',system:header+'\nYou are Claude Code.',messages:[]}).messages,[{role:'system',content:'You are Claude Code.'}]);
  assert.deepEqual(anthropicToChat({model:'fixture',system:[{type:'text',text:header+'\nFirst rules'},{type:'text',text:header},{type:'text',text:'Second block rules'}],messages:[]}).messages,[{role:'system',content:'First rules\nSecond block rules'}]);
  assert.deepEqual(anthropicToChat({model:'fixture',system:[{type:'text',text:header},{type:'text',text:'Second block rules'}],messages:[]}).messages,[{role:'system',content:'Second block rules'}]);
  assert.deepEqual(anthropicToChat({model:'fixture',system:header,messages:[{role:'user',content:'hi'}]}).messages,[{role:'user',content:'hi'}]);
});

test('multiple tool results stay adjacent and images follow the last tool message',()=>{
  const chat=anthropicToChat({model:'fixture',messages:[{role:'user',content:[{type:'tool_result',tool_use_id:'a',content:[{type:'text',text:'one'},png]},{type:'tool_result',tool_use_id:'b',content:'two'},{type:'text',text:'after'}]}]},{images:true});
  assert.deepEqual(chat.messages.map(message=>message.role),['tool','tool','user']);
  assert.deepEqual(chat.messages.slice(0,2).map(message=>message.tool_call_id),['a','b']);
  assert.deepEqual(chat.messages[2].content.map(part=>part.type),['image_url','text']);
  assert.equal(chat.messages[2].content.at(-1).text,'after');
});

test('streaming keeps one open block, numbers blocks in order and flushes tools last',()=>{
  const events=[],projection=new AnthropicProjection('fixture',event=>events.push(event));
  const accept=(delta,finish_reason=null)=>projection.accept({choices:[{delta,finish_reason}]});
  accept({content:'Before'});
  accept({tool_calls:[{index:0,id:'a',type:'function',function:{name:'Read',arguments:'{"path":'}}]});
  accept({tool_calls:[{index:1,id:'b',type:'function',function:{name:'Glob',arguments:'{"pattern":'}}]});
  accept({tool_calls:[{index:0,function:{arguments:'"a"}'}},{index:1,function:{arguments:'"*.js"}'}}]});
  accept({content:'After'},'tool_calls');
  const message=projection.finish(),open=new Set();let next=0;
  for(const event of events){
    if(event.type==='content_block_start'){assert.equal(open.size,0,'a block was still open before index '+event.index);assert.equal(event.index,next++);open.add(event.index);}
    else if(event.type==='content_block_delta')assert.ok(open.has(event.index),'delta for closed block '+event.index);
    else if(event.type==='content_block_stop')assert.ok(open.delete(event.index));
  }
  assert.equal(open.size,0);assert.equal(next,3);
  assert.deepEqual(events.filter(event=>event.delta?.type==='input_json_delta').map(event=>event.delta.partial_json),['{"path":"a"}','{"pattern":"*.js"}']);
  assert.deepEqual(message.content.map(block=>block.type),['text','tool_use','tool_use']);
  assert.deepEqual(message.content.slice(1).map(block=>block.input),[{path:'a'},{pattern:'*.js'}]);
  assert.equal(message.stop_reason,'tool_use');
});

test('Anthropic error mapping preserves upstream details and reset time',()=>{
  for(const [status,type]of [[400,'invalid_request_error'],[401,'authentication_error'],[403,'permission_error'],[404,'not_found_error'],[413,'request_too_large'],[429,'rate_limit_error'],[503,'overloaded_error'],[529,'overloaded_error'],[500,'api_error']])assert.equal(anthropicErrorType(status),type);
  const error=anthropicError(429,{message:'quota exhausted',reset_at:'2026-11-10T01:02:03Z'});assert.equal(error.type,'error');assert.match(error.error.message,/quota exhausted/);assert.match(error.error.message,/2026-11-10T01:02:03Z/);
});

test('Gateway Claude route handles auth, model validation, both response modes, search and token counting',async t=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/anthropic-messages-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const model=normalizeWorkbuddy({id:'fixture',name:'Fixture',contextWindow:200000,reasoning:{supportedEfforts:['low']}}),selection={modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'},variant=variantFor(model,selection);
  const gateway=new Gateway({root},{get:()=>model},{command:process.execPath,args:[],env:{}},{workerScript:resolve('tests/fixtures/gateway-worker.mjs')});t.after(()=>gateway.close());
  const endpoint=await gateway.register(model,variant,selection,'claude','session'),originalFetch=globalThis.fetch,captured=[];let mode='nonstream';
  globalThis.fetch=(url,options)=>{
    if(String(url)===endpoint.baseURL+'/chat/completions'){
      const body=JSON.parse(options.body);captured.push(body);
      if(mode==='429')return Promise.resolve(new Response(JSON.stringify({error:{code:'rate_limit',message:'quota exhausted',reset_at:'2026-11-10T01:02:03Z'}}),{status:429,headers:{'content-type':'application/json'}}));
      if(mode==='stream')return Promise.resolve(new Response('data: '+JSON.stringify({choices:[{delta:{reasoning_content:'Think'}}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{content:'Streamed'},finish_reason:'stop'}],usage:{prompt_tokens:9,completion_tokens:2,prompt_tokens_details:{cached_tokens:4}}})+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}}));
      return Promise.resolve(new Response(JSON.stringify({choices:[{message:{content:'Complete'},finish_reason:'stop'}],usage:{prompt_tokens:4,completion_tokens:2}}),{headers:{'content-type':'application/json'}}));
    }
    return originalFetch(url,options);
  };t.after(()=>{globalThis.fetch=originalFetch;});
  const request=(path,body,key=endpoint.key)=>fetch(endpoint.baseURL+path,{method:body===undefined?'GET':'POST',headers:{...key?{authorization:'Bearer '+key}:{},'content-type':'application/json'},...body===undefined?{}:{body:JSON.stringify(body)}});
  const base={model:variant.id,max_tokens:32,messages:[{role:'user',content:'Hello'}]};
  const unauthorized=await request('/messages',base,null);assert.equal(unauthorized.status,403);assert.equal((await unauthorized.json()).error.type,'permission_error');
  const mismatch=await request('/messages',{...base,model:'other'});assert.equal(mismatch.status,409);assert.equal((await mismatch.json()).type,'error');
  const models=await request('/models?beta=true');assert.equal(models.status,200);assert.deepEqual((await models.json()).data.map(row=>row.id),[variant.id]);
  const countedBody={...base,system:'1234'},counted=await request('/messages/count_tokens?beta=true',countedBody);assert.equal(counted.status,200);assert.deepEqual(await counted.json(),{input_tokens:Math.ceil(JSON.stringify(countedBody).length/4)});
  const complete=await request('/messages?beta=true',{...base,system:[{type:'text',text:'x-anthropic-billing-header: fixture'},{type:'text',text:'Rules'}],temperature:0});assert.equal(complete.status,200);assert.equal(complete.headers.get('x-should-retry'),'false');
  const completeJson=await complete.json();assert.equal(completeJson.content[0].text,'Complete');assert.equal(completeJson.stop_reason,'end_turn');assert.equal(captured[0].messages[0].content,'Rules');assert.equal(captured[0].temperature,undefined);
  mode='stream';const streamed=await request('/messages?beta=true',{...base,stream:true});assert.equal(streamed.status,200);assert.match(streamed.headers.get('content-type'),/text\/event-stream/);const events=parseEvents(await streamed.text());
  assert.deepEqual(events.slice(0,2).map(e=>e.event),['message_start','content_block_start']);assert.ok(events.some(e=>e.data.delta?.type==='thinking_delta'));assert.ok(events.some(e=>e.data.delta?.type==='text_delta'));assert.equal(events.at(-1).event,'message_stop');
  assert.deepEqual(events[0].data.message.usage,{input_tokens:0,output_tokens:0,cache_read_input_tokens:0,cache_creation_input_tokens:0});
  assert.deepEqual(events.find(e=>e.event==='message_delta').data.usage,{input_tokens:5,output_tokens:2,cache_read_input_tokens:4,cache_creation_input_tokens:0});
  assert.equal(captured.at(-1).stream_options?.include_usage,true);
  globalThis.fetch=(url,options)=>String(url)===endpoint.baseURL+'/chat/completions'?Promise.resolve(new Response('data: '+JSON.stringify({choices:[{delta:{content:'Partial'}}]})+'\n\ndata: '+JSON.stringify({error:{message:'stream quota exhausted',upstream_status:429,reset_at:'2026-11-10T01:02:03Z'}})+'\n\n',{headers:{'content-type':'text/event-stream'}})):originalFetch(url,options);
  const streamFailure=await request('/messages',{...base,stream:true}),failureEvents=parseEvents(await streamFailure.text());assert.equal(streamFailure.status,200);assert.equal(failureEvents.at(-1).event,'error');assert.equal(failureEvents.at(-1).data.error.type,'rate_limit_error');assert.match(failureEvents.at(-1).data.error.message,/stream quota exhausted/);
  globalThis.fetch=(url,options)=>{
    if(String(url)===endpoint.baseURL+'/chat/completions')return Promise.resolve(new Response(JSON.stringify({error:{code:'rate_limit',message:'quota exhausted',reset_at:'2026-11-10T01:02:03Z'}}),{status:429,headers:{'content-type':'application/json'}}));
    return originalFetch(url,options);
  };
  const limited=await request('/messages',base);assert.equal(limited.status,429);assert.equal(limited.headers.get('x-should-retry'),'false');const limitedJson=await limited.json();assert.equal(limitedJson.error.type,'rate_limit_error');assert.match(limitedJson.error.message,/quota exhausted/);assert.match(limitedJson.error.message,/2026-11-10T01:02:03Z/);
  gateway.search.search=async(query,{preferred})=>{assert.equal(query,'Bridge++ gateway');assert.equal(preferred,'workbuddy');return {source:'workbuddy',results:[{title:'Gateway result',url:'https://example.test/search',snippet:'Snippet'}]};};
  const searchBody={...base,messages:[{role:'user',content:'Perform a web search for the query: Bridge++ gateway'}],tools:[{type:'web_search_20260201',name:'web_search'}]};
  const searched=await request('/messages',searchBody),searchJson=await searched.json();assert.equal(searched.status,200);assert.equal(searchJson.content[0].type,'server_tool_use');assert.equal(searchJson.content[0].id,searchJson.content[1].tool_use_id);assert.deepEqual(searchJson.content[0].input,{query:'Bridge++ gateway'});assert.equal(searchJson.usage.server_tool_use.web_search_requests,1);
  const searchedStream=await request('/messages',{...searchBody,stream:true}),searchEvents=parseEvents(await searchedStream.text());assert.ok(searchEvents.some(e=>e.data.content_block?.type==='server_tool_use'));assert.ok(searchEvents.some(e=>e.data.content_block?.type==='web_search_tool_result'));assert.equal(searchEvents.at(-1).event,'message_stop');
  const searchText=searchEvents.find(e=>e.event==='content_block_start'&&e.data.content_block?.type==='text');assert.ok(Array.isArray(searchText?.data.content_block.citations)&&searchText.data.content_block.citations.length,'streamed search text block must carry citations');
});

if(process.env.AWB_CLAUDE_EXE){
test('Claude Code CLI completes a gateway tool round-trip',async t=>{
  await mkdir('.runtime/tests',{recursive:true});
  const root=await mkdtemp(resolve('.runtime/tests/claude-cli-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const model=normalizeWorkbuddy({id:'fixture-cli',name:'Fixture CLI',contextWindow:200000,reasoning:{supportedEfforts:['low']}}),selection={modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'},variant=variantFor(model,selection);
  const gateway=new Gateway({root},{get:()=>model},{command:process.execPath,args:[],env:{}},{workerScript:resolve('tests/fixtures/gateway-worker.mjs')});
  t.after(()=>gateway.close());
  const endpoint=await gateway.register(model,variant,selection,'claude','session');
  const config=join(root,'config'),work=join(root,'work');
  await mkdir(config,{recursive:true});await mkdir(work,{recursive:true});
  const target=join(work,'target.txt');writeFileSync(target,'gateway tool round-trip ok');
  const originalFetch=globalThis.fetch,upstreams=[];
  globalThis.fetch=(url,options)=>{
    const href=String(url);
    if(!href.startsWith(gateway.base)&&href.endsWith('/v1/chat/completions')){
      const body=JSON.parse(options.body);upstreams.push(body);
      const hasResult=body.messages.some(message=>message.role==='tool');
      if(body.stream){
        const opening=hasResult?{choices:[{delta:{content:'Tool result received.'}}]}:{choices:[{delta:{tool_calls:[{index:0,id:'call_read_1',type:'function',function:{name:'Read',arguments:JSON.stringify({file_path:target})}}]}}]};
        return Promise.resolve(new Response('data: '+JSON.stringify(opening)+'\n\n'+'data: '+JSON.stringify({choices:[{delta:{},finish_reason:hasResult?'stop':'tool_calls'}],usage:{prompt_tokens:9,completion_tokens:3}})+'\n\n'+'data: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}}));
      }
      const message=hasResult?{content:'Tool result received.',finish_reason:'stop'}:{content:null,tool_calls:[{id:'call_read_1',type:'function',function:{name:'Read',arguments:JSON.stringify({file_path:target})}}],finish_reason:'tool_calls'};
      return Promise.resolve(new Response(JSON.stringify({choices:[{message}],usage:{prompt_tokens:9,completion_tokens:3}}),{headers:{'content-type':'application/json'}}));
    }
    return originalFetch(url,options);
  };
  t.after(()=>{globalThis.fetch=originalFetch;});
  const env={...process.env};
  for(const key of Object.keys(env))if(/^(ANTHROPIC_|CLAUDE|MCP_|OTEL_)/i.test(key))delete env[key];
  const gatewayBase=endpoint.baseURL.slice(0,-3),modelEnv={ANTHROPIC_MODEL:variant.id,ANTHROPIC_DEFAULT_OPUS_MODEL:variant.id,ANTHROPIC_DEFAULT_SONNET_MODEL:variant.id,ANTHROPIC_DEFAULT_HAIKU_MODEL:variant.id,ANTHROPIC_SMALL_FAST_MODEL:variant.id,CLAUDE_CODE_SUBAGENT_MODEL:variant.id};
  Object.assign(env,{CLAUDE_CONFIG_DIR:config,ANTHROPIC_BASE_URL:gatewayBase,ANTHROPIC_AUTH_TOKEN:endpoint.key,...modelEnv,CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1',DISABLE_TELEMETRY:'1',DISABLE_ERROR_REPORTING:'1',DISABLE_AUTOUPDATER:'1',DISABLE_LOGIN_COMMAND:'1',CLAUDE_CODE_DISABLE_LAUNCHER_SIGN_IN:'1'});
  const settings=JSON.stringify({skipWebFetchPreflight:true,model:variant.id,env:{ANTHROPIC_BASE_URL:gatewayBase,...modelEnv,CLAUDE_CODE_USE_BEDROCK:'0',CLAUDE_CODE_USE_VERTEX:'0',CLAUDE_CODE_USE_FOUNDRY:'0',CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1',DISABLE_TELEMETRY:'1',DISABLE_ERROR_REPORTING:'1',DISABLE_AUTOUPDATER:'1'}});
  const child=spawn(process.env.AWB_CLAUDE_EXE,['-p','--input-format','stream-json','--output-format','stream-json','--verbose','--include-partial-messages','--permission-prompt-tool','stdio','--permission-mode','default','--settings',settings],{cwd:work,env,stdio:['pipe','pipe','pipe']});
  let stderr='',stdoutBuffer='';
  child.stderr.setEncoding('utf8');child.stderr.on('data',data=>{stderr+=data;});
  const events=[];
  const send=value=>child.stdin.write(JSON.stringify(value)+'\n');
  child.stdout.setEncoding('utf8');
  child.stdout.on('data',chunk=>{
    stdoutBuffer+=chunk;let index;
    while((index=stdoutBuffer.indexOf('\n'))>=0){
      const line=stdoutBuffer.slice(0,index).trim();stdoutBuffer=stdoutBuffer.slice(index+1);
      if(!line)continue;
      let message;try{message=JSON.parse(line);}catch{continue;}
      events.push(message);
      if(message.type==='control_request'&&message.request?.subtype==='can_use_tool')send({type:'control_response',response:{subtype:'success',request_id:message.request_id,response:{behavior:'allow',updatedInput:message.request.input}}});
    }
  });
  const exited=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('claude.exe timed out; stderr: '+stderr.slice(-2000))),180000);
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('exit',()=>{clearTimeout(timer);resolve();});
  });
  try{
    send({type:'control_request',request_id:'init_1',request:{subtype:'initialize'}});
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('claude.exe did not initialize; stderr: '+stderr.slice(-2000))),60000);const poll=setInterval(()=>{if(events.some(message=>message.type==='control_response'&&message.response?.request_id==='init_1')){clearInterval(poll);clearTimeout(timer);resolve();}},50);});
    send({type:'user',session_id:'',message:{role:'user',content:[{type:'text',text:'Read target.txt and finish.'}]},parent_tool_use_id:null});
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('claude.exe did not finish; stderr: '+stderr.slice(-2000))),180000);const poll=setInterval(()=>{if(events.some(message=>message.type==='result')){clearInterval(poll);clearTimeout(timer);resolve();}},100);});
    child.stdin.end();
    await exited;
  }finally{
    if(child.exitCode===null&&!child.killed)child.kill();
  }
  assert.ok(upstreams.length>=2,'expected at least two upstream rounds, got '+upstreams.length);
  assert.ok(!JSON.stringify(upstreams[0].messages).toLowerCase().includes('x-anthropic-billing-header'),'billing header must be stripped before the upstream');
  assert.ok(!JSON.stringify(upstreams[0].tools??[]).includes('$schema'),'$schema must be stripped from forwarded tool parameters');
  const toolMessage=upstreams.at(-1).messages.find(message=>message.role==='tool');
  assert.equal(toolMessage?.tool_call_id,'call_read_1');
  assert.match(String(toolMessage?.content),/gateway tool round-trip ok/);
  assert.ok(events.some(message=>message.type==='assistant'&&message.message?.content?.some(block=>block.type==='tool_use'&&block.name==='Read')),'CLI must receive the gateway tool_use');
  const result=events.find(message=>message.type==='result');
  assert.equal(result?.subtype,'success');
  assert.notEqual(result?.is_error,true);
});
}