// Real native Kimi Read with a fixed SDK typo, comparing old and new bridge behavior.
// No upstream inference; only reads a random marker in an isolated local fixture.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const appRoot=resolve(process.env.AWB_PACKAGE_ROOT??'.'),load=p=>import(pathToFileURL(join(appRoot,p)));
const [{createBridgeServer},{registerBridgeModels},{bridgePromptConfig},{Store},{normalizeQoder,variantFor},{Sessions},{Gateway},{discoverRuntimes}]=await Promise.all([
  load('bridges/qoderbridge/dist/src/server.js'),load('bridges/qoderbridge/dist/src/model.js'),load('app/services/runtime-prompts.mjs'),load('app/core/store.mjs'),load('app/core/catalog.mjs'),load('app/services/sessions.mjs'),load('app/services/gateway.mjs'),load('app/services/runtime-paths.mjs'),
]);
const baseline=process.env.AWB_BASELINE==='1',out=resolve('.runtime/format-cache-smoke'+(baseline?'-baseline':'')),dir=join(out,randomUUID());await mkdir(dir,{recursive:true});
const marker=randomUUID();await writeFile(join(dir,'fixture.txt'),marker);let calls=0,tools;const events=[],policies=[];
const infer=async(config,prompt,_gate,onText)=>{
  calls++;policies.push(JSON.stringify([config.model,config.context,config.reasoning]));assert.ok(calls<=4);
  const match=/Tools \(JSON schemas\): (\[[^\n]*\])\n/.exec(prompt);if(match)tools=JSON.parse(match[1]);
  let response;
  if(prompt.includes(marker))response=JSON.stringify({kind:'final',content:'Verified local read: '+marker});
  else{const tool=tools.find(t=>t.name==='Read');assert.ok(tool);const props=tool.parameters.properties,key=['path','file_path'].find(k=>Object.hasOwn(props,k));assert.ok(key);
    response=JSON.stringify({kind:'tool_call',name:tool.name,arguments:{[key]:join(dir,'fixture.txt')}});
    if(!prompt.startsWith('BRIDGE DECISION CORRECTION.'))response=response.replace('"name":','"name=');
  }
  for(const c of response)onText?.(c);const input=90+calls*10;
  return {response,error:null,stage:'inference',result:'success',stream_stop_reasons:['end_turn'],model_requests:1,normalized_usage:{prompt_tokens:input,completion_tokens:10,total_tokens:input+10},client_usage:{prompt_tokens:input,completion_tokens:10,total_tokens:input+10},cache_estimate_tokens:input-10};
};
const model=normalizeQoder({value:'local-fixture',displayName:'Local format fixture',context_config:{native:{token_count:200000}},thinking_config:{enabled:{efforts:{high:{}}}}}),selection={modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'high'},variant=variantFor(model,selection);
registerBridgeModels([{id:variant.id,runtimeId:model.id,name:model.name,contextWindow:200000,maxTokens:32000,efforts:['high']}]);
const server=await createBridgeServer({auth:'cli',timeout:30000,strategy:'permission',...bridgePromptConfig('kimi').qoder,decisionRetries:1,cacheUsage:'none'},{port:0,key:'fixture',infer,prewarm:false,reportDir:join(dir,'reports')});
const store=await new Store(join(dir,'workspace')).open();await store.mutate(s=>{s.projects=[{id:'p',path:dir,name:'Local fixture'}];});
const providers={get:()=>model},gateway=new Gateway(store,providers,{command:process.execPath,args:[],env:{}});gateway.ensureWorker=async()=>({url:'http://127.0.0.1:'+server.address().port,key:'fixture'});
const runtime=(await discoverRuntimes()).find(r=>r.id==='kimi'),manager=new Sessions(store,providers,gateway,[runtime]),session=await manager.create({projectId:'p',runtimeId:'kimi',selection});
let resolveTurn,rejectTurn;const end=new Promise((r,j)=>{resolveTurn=r;rejectTurn=j;}),timer=setTimeout(()=>rejectTurn(new Error('Local verification timeout')),45000);
store.on('event',e=>{events.push(e);if(e.type==='approval')void manager.approve(session.id,e.approvalId,'approve').catch(rejectTurn);if(e.type==='turn-end')resolveTurn(e);});
let result;
try{await manager.prompt(session.id,'Read fixture.txt using native Read and return its exact contents. Do not run commands, edit files, access other paths or delegate.');const terminal=await end;await manager.runs.get(session.id)?.finishing;
  const usage=events.filter(e=>e.type==='usage'),retries=events.filter(e=>e.name==='llm/retry-started'),readCalls=events.filter(e=>e.type==='tool-start'&&e.name==='Read').length;
  const impossible=usage.filter(e=>e.data.cached_tokens>e.data.prompt_tokens).length,text=events.filter(e=>e.type==='text').map(e=>e.text).join('');
  const passed=terminal.status==='completed'&&text.includes(marker)&&readCalls===1&&calls===(baseline?3:2)&&retries.length===(baseline?1:0)&&(baseline?impossible===1:impossible===0&&usage.every(e=>e.data.cached_tokens===null))&&new Set(policies).size===1;
  result={passed,baseline,fixedSdkResponses:calls,formatCorrections:retries.length,readCalls,impossibleCacheRows:impossible,cacheStatuses:usage.map(e=>e.data.cache_status),sameModelAndSettings:new Set(policies).size===1,status:terminal.status};
}catch(e){result={passed:false,baseline,error:e.message,calls,errors:events.filter(e=>e.type==='error').map(e=>e.text)};}
finally{clearTimeout(timer);await manager.close();await gateway.close();await store.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
await writeFile(join(out,'result.json'),JSON.stringify(result,null,2));if(tools)await writeFile(join(out,'tools.json'),JSON.stringify(tools));console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
