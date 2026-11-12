import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatRequest} from '../src/compat.js';
import {nativeEligible,matchResults} from '../src/native-lane.js';
import {HostBinding,exposedToolName,hostToolTable} from '../src/native-tools.js';
import {NativeUsage} from '../src/native-usage.js';
import type {Config} from '../src/client.js';

const config:Config={auth:'cli',timeout:5000,strategy:'permission',system:'test',toolMode:'native',blankWarmLimit:0};
const tool=(name='Read',parameters:unknown={type:'object',properties:{path:{type:'string'}},required:['path']})=>({type:'function' as const,function:{name,description:`Run ${name}`,parameters}});
const request=(overrides:Record<string,unknown>={})=>ChatRequest.parse({model:'qoder-deepseek-flash',messages:[{role:'user',content:'read it'}],tools:[tool()],...overrides});

test('native eligibility is fail-closed and the pool default remains JSON',()=>{
  assert.equal(nativeEligible(request(),config),true);
  assert.equal(nativeEligible(request(),{...config,toolMode:undefined}),false);
  assert.equal(nativeEligible(request({tools:[]}),config),false);
  assert.equal(nativeEligible(request({tool_choice:'none'}),config),false);
  // required and a pinned function are native now; the prompt carries the per-step requirement.
  assert.equal(nativeEligible(request({tool_choice:'required'}),config),true);
  assert.equal(nativeEligible(request({tool_choice:{type:'function',function:{name:'Read'}}}),config),true);
  assert.equal(nativeEligible(request({response_format:{type:'json_object'}}),config),false);
  assert.equal(nativeEligible(request({tools:[tool('Bad',[])]}),config),false);
  assert.equal(nativeEligible(request({tools:[tool('Bad',{type:'array'})]}),config),false);
  assert.equal(nativeEligible(request({tool_choice:'auto'}),config),true);
});

test('host tool names, aliases, schemas and stable signatures round trip',()=>{
  const names=['Read','x'.repeat(65),'bad name','mcp_call','mcp__host__Read','t_'+('0'.repeat(16))];
  const table=hostToolTable(request({tools:names.map(name=>tool(name,{properties:{b:{type:'number'},a:{type:'string'}}}))}));
  assert.equal(table.tools[0]!.exposed,'Read');
  for(const row of table.tools.slice(1,5))assert.match(row.exposed,/^t_[a-f0-9]{16}$/);
  for(const row of table.tools)assert.equal(exposedToolName(table,row.exposed)?.host,row.host);
  assert.equal(exposedToolName(table,'mcp__host__Read')?.host,'Read');
  assert.ok(table.tools.every(row=>row.inputSchema.type==='object'&&!Object.hasOwn(row.inputSchema,'$schema')));
  const a=hostToolTable(request({tools:[tool('Read',{$schema:'https://json-schema.org/draft/2020-12/schema',type:'object',properties:{a:{type:'string'},b:{type:'number'}}})]}));
  const b=hostToolTable(request({tools:[tool('Read',{properties:{b:{type:'number'},a:{type:'string'}},type:'object',$schema:'https://json-schema.org/draft/2020-12/schema'})]}));
  assert.equal(a.signature,b.signature);
  assert.throws(()=>hostToolTable(request({tools:[tool(),tool()]})),/Duplicate tool name/);
});

test('HostBinding holds tools/list until its single table is provided',async()=>{
  const binding=new HostBinding();let listed=false;
  const pending=binding.listTools().then(value=>{listed=true;return value;});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(listed,false);
  binding.provide(hostToolTable(request()));const result=await pending;
  assert.equal(result.tools[0]!.name,'Read');assert.equal(result.tools[0]!.annotations.readOnlyHint,true);
  assert.throws(()=>binding.provide(hostToolTable(request())),/already provided/);
  const unavailable=await binding.callTool('Read',{},new AbortController().signal);
  assert.equal(unavailable.isError,true);
  const registered=binding.config(['Read']);
  assert.deepEqual(registered.tools,[{name:'Read',exposedName:'Read',alwaysLoad:true}]);
});

const ids=['call_1','call_2'];
const assistant=(content:string|null,calls=ids)=>({role:'assistant' as const,content,tool_calls:calls.map(id=>({id,type:'function' as const,function:{name:'Read',arguments:'{}'}}))});
const result=(id:string,text:string)=>({role:'tool' as const,tool_call_id:id,content:text});

test('matchResults accepts host echoes, split/interleaved results and trailing messages',()=>{
  const matched=matchResults({hostCalls:ids},[assistant(null,['call_1']),result('call_1','one'),assistant(null,['call_2']),result('call_2','[tool error] two'),{role:'user',content:'next'}]);
  assert.equal(matched?.results.get('call_1')?.text,'one');assert.equal(matched?.results.get('call_2')?.isError,true);
  assert.equal(matched?.trailing[0]?.role,'user');
  const missing=matchResults({hostCalls:ids},[assistant('working'),result('call_1','one')]);
  assert.equal(missing?.results.get('call_2')?.isError,true);
  assert.equal(matchResults({hostCalls:ids},[result('call_1','a'),result('call_1','b')]),null);
  assert.equal(matchResults({hostCalls:ids},[assistant(null),{role:'user',content:'x'},result('call_1','late')]),null);
  assert.equal(matchResults({hostCalls:ids},[]),null);
});

const event=(id:string,type:string,delta:Record<string,unknown>={},usage:Record<string,unknown>={})=>({type:'stream_event',session_id:'sdk',event:type==='message_start'?{type,message:{id}}:{type,delta,usage}});

test('native usage reports the latest prompt, sums outputs and per-response credits, and counts reliable tool deltas',()=>{
  const usage=new NativeUsage();
  usage.observe(event('r1','message_start') as never,1000);
  usage.observe(event('r1','content_block_delta',{type:'text_delta',text:'A'}) as never,1000);
  usage.observe(event('r1','content_block_delta',{type:'thinking_delta',thinking:'Hmm'}) as never,1000);
  usage.observe(event('r1','content_block_delta',{type:'input_json_delta',partial_json:'{"a"'}) as never,1000);
  usage.observe(event('r1','content_block_delta',{type:'input_json_delta',partial_json:':1}'}) as never,1000);
  usage.observe(event('r1','message_delta',{stop_reason:'tool_use'},{credits:0.2,original_credits:0.3,billable:true,context_usage_ratio:0.25}) as never,1000);
  usage.toolInput('r1',7);
  usage.observe(event('r2','message_start') as never,1000);
  usage.observe(event('r2','content_block_delta',{type:'text_delta',text:'B'}) as never,1000);
  usage.observe(event('r2','message_delta',{stop_reason:'stop'},{credits:0.4,original_credits:0.5,billable:true,context_usage_ratio:0.5}) as never,1000);
  const snapshot=usage.snapshot({...config,cacheUsage:'estimate'},null);
  // prompt_tokens is the latest response's prompt (the current context); every response's output is counted.
  assert.deepEqual(snapshot.client_usage,{prompt_tokens:500,completion_tokens:5,total_tokens:505,completion_tokens_details:{reasoning_tokens:1},prompt_tokens_details:{cached_tokens:0}});
  assert.equal(snapshot.prompt_tokens_all_responses,750);
  assert.ok(Math.abs(snapshot.credits!-0.6)<1e-12);assert.equal(snapshot.model_requests,2);
  assert.equal(usage.rows[0]!.stop_reason,'tool_use');
});

test('native usage keeps unknown prompt tokens unknown and marks estimated tool input',()=>{
  const usage=new NativeUsage();usage.observe(event('r1','message_start') as never,1000);
  usage.observe(event('r1','message_delta',{stop_reason:'tool_use'},{credits:0.2}) as never,1000);
  usage.toolInput('r1',10);const snapshot=usage.snapshot(config,null);
  assert.equal(snapshot.client_usage,null);assert.equal(snapshot.prompt_tokens_known,false);
  assert.equal(snapshot.credits,0.2);assert.match(snapshot.usage_source,/tool_input_estimate/);
});
