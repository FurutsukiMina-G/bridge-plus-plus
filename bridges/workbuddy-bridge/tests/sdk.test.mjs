import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SdkTransport,sdkOptions,LEAN_RUNTIME_ENV} from '../src/sdk-transport.mjs';
const model='deepseek-v4.1-flash';const credential={accessToken:'fake-access',refreshToken:'fake-refresh',uid:'fake',domain:'www.workbuddy.cn'};
async function fixture(t,run){const runtime=await mkdtemp(join(tmpdir(),'wb-sdk-'));t.after(()=>rm(runtime,{recursive:true,force:true}));return new SdkTransport({runtime,cliPath:process.execPath},{get:async()=>credential},{run});}
const body={model,messages:[{role:'system',content:'You are an AI agent powered by DeepSeek Harness.'},{role:'user',content:'test'}],max_tokens:100,reasoning_effort:'low'};
test('SDK enables every lean runtime switch by default and preserves existing environment settings',t=>{
  const previous=process.env.WORKBUDDY_FULL_RUNTIME;delete process.env.WORKBUDDY_FULL_RUNTIME;
  t.after(()=>{if(previous===undefined)delete process.env.WORKBUDDY_FULL_RUNTIME;else process.env.WORKBUDDY_FULL_RUNTIME=previous;});
  const options=sdkOptions({cliPath:process.execPath},credential,body,tmpdir(),new AbortController(),()=>{});
  for(const key of Object.keys(LEAN_RUNTIME_ENV))assert.equal(options.env[key],'1',key);
  assert.equal(options.env.CODEBUDDY_AUTH_TOKEN,credential.accessToken);assert.equal(options.env.CODEBUDDY_BASE_URL,'https://copilot.tencent.com/v2');
  assert.equal(options.env.ACC_USER_ID,credential.uid);assert.equal(options.env.CODEBUDDY_CUSTOM_HEADERS,`X-Domain: ${credential.domain}`);
  assert.equal(options.env.CODEBUDDY_CODE_DISABLE_BACKGROUND_TASKS,'1');assert.equal(options.env.CODEBUDDY_DISABLE_AUTO_MEMORY,'1');
  assert.equal(options.env.CODEBUDDY_DISABLE_CRON,'1');assert.equal(options.env.DISABLE_TELEMETRY,'1');
  // Agent memory appends "# Persistent Agent Memory" with <CODEBUDDY_CONFIG_DIR>/projects/<escaped cwd>.
  assert.equal(options.env.CODEBUDDY_CODE_DISABLE_AUTO_MEMORY,'1');assert.equal(options.env.CODEBUDDY_MEMORY_ENABLED,'0');
  assert.equal(options.env.CODEBUDDY_TYPED_MEMORY_ENABLED,'0');assert.equal(options.env.CODEBUDDY_TEAM_MEMORY_ENABLED,'0');
  // The runtime also compacts its own history and then prints its transcript path.
  assert.equal(options.env.CODEBUDDY_PRE_MESSAGE_COMPACT,'0');
  assert.equal(options.env.CODEBUDDY_AUTOCOMPACT_PCT_OVERRIDE,'100');assert.equal(options.env.CODEBUDDY_AUTO_COMPACT_WINDOW,'1000000');
  assert.deepEqual(JSON.parse(options.extraArgs.settings),{autoCompactEnabled:false});
  assert.equal(options.env.CODEBUDDY_CODE_MAX_OUTPUT_TOKENS,'100');
});
test('WORKBUDDY_FULL_RUNTIME=1 omits only the lean runtime switches',t=>{
  const keys=['WORKBUDDY_FULL_RUNTIME',...Object.keys(LEAN_RUNTIME_ENV)],saved=new Map(keys.map(key=>[key,process.env[key]]));
  t.after(()=>{for(const [key,value] of saved){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
  for(const key of Object.keys(LEAN_RUNTIME_ENV))delete process.env[key];process.env.WORKBUDDY_FULL_RUNTIME='1';
  const options=sdkOptions({cliPath:process.execPath},credential,body,tmpdir(),new AbortController(),()=>{});
  for(const key of Object.keys(LEAN_RUNTIME_ENV))assert.equal(Object.hasOwn(options.env,key),false,key);
  assert.equal(options.env.CODEBUDDY_CODE_DISABLE_BACKGROUND_TASKS,'1');assert.equal(options.env.CODEBUDDY_DISABLE_AUTO_MEMORY,'1');
  assert.equal(options.env.CODEBUDDY_DISABLE_CRON,'1');assert.equal(options.env.DISABLE_TELEMETRY,'1');
  // Memory isolation is not a lean-only switch: the flag must never re-enable it.
  assert.equal(options.env.CODEBUDDY_CODE_DISABLE_AUTO_MEMORY,'1');assert.equal(options.env.CODEBUDDY_MEMORY_ENABLED,'0');
  assert.equal(options.env.CODEBUDDY_TYPED_MEMORY_ENABLED,'0');assert.equal(options.env.CODEBUDDY_TEAM_MEMORY_ENABLED,'0');
  // Nor may it re-enable the runtime's own compaction.
  assert.equal(options.env.CODEBUDDY_PRE_MESSAGE_COMPACT,'0');
  assert.equal(options.env.CODEBUDDY_AUTOCOMPACT_PCT_OVERRIDE,'100');assert.equal(options.env.CODEBUDDY_AUTO_COMPACT_WINDOW,'1000000');
  assert.deepEqual(JSON.parse(options.extraArgs.settings),{autoCompactEnabled:false});
});
test('SDK keeps host system in input data, uses exact model, retains official system and denies local tools',async t=>{let options,prompt;const transport=await fixture(t,async function*(p){({options,prompt}=p);yield {type:'system',subtype:'init',model,mcp_servers:[]};yield {type:'assistant',message:{model,content:[{type:'text',text:'{"action":"final","content":"ok"}'}]}};yield {type:'result',subtype:'success',is_error:false,result:'{"action":"final","content":"ok"}',usage:{input_tokens:50,output_tokens:2},modelUsage:{[model]:{}}};});const r=await transport.chat(body,new AbortController().signal);const text=await r.text();assert.match(text,/'__never__'|"content":"ok"/);assert.match(prompt,/DeepSeek Harness/);assert.equal(typeof options.systemPrompt,'string');assert.match(options.systemPrompt,/final answer directly/);assert.deepEqual(options.tools,[]);assert.deepEqual(options.settingSources,[]);assert.equal(options.fallbackModel,undefined);assert.equal(options.env.CODEBUDDY_CODE_DISABLE_AUTO_MEMORY,'1');const stop=await options.hooks.PreToolUse[0].hooks[0]({});assert.equal(stop.continue,false);assert.equal((await options.canUseTool('Read',{})).behavior,'deny');});
test('11128 thrown by official SDK is reported once, without switching model or blindly retrying',async t=>{let calls=0;const transport=await fixture(t,async function*(){calls++;throw new Error('HTTP 400 code 11128 Illegal API invocation from an unapproved channel');});const text=await (await transport.chat(body,new AbortController().signal)).text();assert.match(text,/workbuddy_11128/);assert.ok(!text.includes('[DONE]'));assert.equal(calls,1);assert.equal(transport.metrics.lastFailure.code,'workbuddy_11128');});
test('native tool output, plugin contamination and model fallback fail closed',async t=>{for(const bad of [{type:'system',subtype:'init',model:'glm-5.3'},{type:'system',subtype:'init',model,plugins:[{name:'unexpected'}]},{type:'stream_event',event:{type:'content_block_start',content_block:{type:'tool_use',name:'Read'}}}]){const transport=await fixture(t,async function*(){yield bad;});const text=await (await transport.chat(body,new AbortController().signal)).text();assert.match(text,/model_mismatch|isolation_failed|native_tool_blocked/);assert.ok(!text.includes('[DONE]'));}});
const readTools=[{type:'function',function:{name:'read',parameters:{type:'object',properties:{file_path:{type:'string'}},required:['file_path'],additionalProperties:false}}}];
const dsmlCall=path=>`<｜｜DSML｜｜ invoke name="read"><｜｜DSML｜｜ parameter name="file_path" string="true">${path}</｜｜DSML｜｜ parameter></｜｜DSML｜｜ invoke>`;
test('real failure shape crosses the SDK transport as two calls after one inference, without local execution',async t=>{
  const dsml="I'll start by reading the reference files.\n\n"+'<｜｜DSML｜｜ calls>'+dsmlCall('fixture/first.ts')+dsmlCall('fixture/second.ts')+'</｜｜DSML｜｜ calls>';let requests=0;
  const transport=await fixture(t,async function*(){requests++;yield {type:'system',subtype:'init',model};yield {type:'assistant',message:{model,content:[{type:'text',text:dsml}]}};yield {type:'result',subtype:'success',is_error:false,result:dsml,usage:{input_tokens:7892,output_tokens:134}};});
  const wire=await (await transport.chat({...body,tools:readTools},new AbortController().signal)).text();
  const chunks=wire.split('\n\n').filter(s=>s.startsWith('data: {')).map(s=>JSON.parse(s.slice(6)));
  const calls=chunks.flatMap(c=>c.choices??[]).flatMap(c=>c.delta?.tool_calls??[]);
  assert.equal(calls.length,2);assert.equal(new Set(calls.map(c=>c.id)).size,2);assert.equal(JSON.parse(calls[1].function.arguments).file_path,'fixture/second.ts');
  assert.equal(requests,1);assert.equal(transport.metrics.decodedDsml,1);assert.equal(transport.metrics.deniedTools,0);assert.match(wire,/\[DONE\]/);
  assert.ok(chunks.some(c=>c.choices?.[0]?.delta?.content==="I'll start by reading the reference files."));
});
test('invalid second DSML call dispatches nothing; reported usage and private redacted evidence survive failure',async t=>{
  const dsml="I'll start by reading the reference files.\n\n"+'<｜｜DSML｜｜ calls>'+dsmlCall('fixture/first.ts')+'<｜｜DSML｜｜ invoke name="read"></｜｜DSML｜｜ invoke></｜｜DSML｜｜ calls>';
  const transport=await fixture(t,async function*(){yield {type:'system',subtype:'init',model};yield {type:'assistant',message:{model,content:[{type:'text',text:dsml}]}};yield {type:'result',subtype:'success',is_error:false,result:dsml,usage:{input_tokens:7892,output_tokens:134}};});
  const wire=await (await transport.chat({...body,tools:readTools},new AbortController().signal,{requestId:'local-regression'})).text();
  assert.match(wire,/invalid_tool_arguments/);assert.match(wire,/"prompt_tokens":7892/);assert.ok(!wire.includes('"tool_calls":['));assert.ok(!wire.includes('[DONE]'));
  assert.ok(!wire.includes("I'll start by reading"));
  const file=transport.metrics.lastFailure.evidenceFile;const evidence=JSON.parse(await readFile(file,'utf8'));assert.equal(evidence.requestId,'local-regression');assert.equal(evidence.result,dsml);assert.ok(!JSON.stringify(evidence).includes(credential.accessToken));
});
