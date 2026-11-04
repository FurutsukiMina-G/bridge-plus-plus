// Real Kimi ACP + actual copied Qoder HTTP protocol, with a deterministic SDK stub.
// No upstream inference, no user project, no deployment or task delegation.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createBridgeServer} from '../bridges/qoderbridge/dist/src/server.js';
import {registerBridgeModels} from '../bridges/qoderbridge/dist/src/model.js';
import {bridgePromptConfig} from '../app/services/runtime-prompts.mjs';
import {Store} from '../app/core/store.mjs';
import {normalizeQoder,variantFor} from '../app/core/catalog.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {Gateway} from '../app/services/gateway.mjs';
import {discoverRuntimes} from '../app/services/runtime-paths.mjs';
const root=resolve('.runtime/progress-guard-smoke');await mkdir(root,{recursive:true});
const runtime=(await discoverRuntimes()).find(r=>r.id==='kimi'),results=[];
for(const mode of ['recover','exhaust']){
  const dir=join(root,mode,randomUUID());await mkdir(dir,{recursive:true});const marker='FIXTURE_READ_'+randomUUID();await writeFile(join(dir,'sentinel.txt'),marker);
  let calls=0,hostTools;const events=[],models=[];
  const infer=async(config,prompt,_gate,onText)=>{
    models.push(config.model);calls++;
    const match=/Tools \(JSON schemas\): (\[[^\n]*\])\n/.exec(prompt);if(match)hostTools=JSON.parse(match[1]);
    let response='I will first read the fixture file, then inspect the result and report my findings.';
    if(mode==='recover'&&calls>1){
      if(prompt.includes(marker))response=JSON.stringify({kind:'final',content:marker});
      else{
        assert.ok(hostTools,'Full native tool definitions are required');
        const tool=hostTools.find(t=>/^(Read|read|read_file)$/i.test(t.name));assert.ok(tool,'Kimi must offer its native reader');
        const props=tool.parameters?.properties??{},args={};for(const field of ['path','file_path','filePath','absolute_path'])if(Object.hasOwn(props,field))args[field]=join(dir,'sentinel.txt');assert.ok(Object.keys(args).length);
        response=JSON.stringify({kind:'tool_call',name:tool.name,arguments:args});
      }
    }
    for(const char of response)onText?.(char);
    return {response,error:null,stage:'inference',result:'success',stream_stop_reasons:['end_turn'],model_requests:1,normalized_usage:{prompt_tokens:100,completion_tokens:10,total_tokens:110}};
  };
  const model=normalizeQoder({value:'local-fixture',displayName:'Local deterministic protocol fixture',context_config:{native:{token_count:200000}},thinking_config:{enabled:{efforts:{low:{}}}}});
  const selection={modelKey:model.key,identity:model.identity,reasoning:'low',contextTokens:200000},variant=variantFor(model,selection);
  registerBridgeModels([{id:variant.id,runtimeId:model.id,name:model.name,contextWindow:200000,maxTokens:32000,efforts:['low']}]);
  const server=await createBridgeServer({auth:'cli',timeout:30000,strategy:'permission',...bridgePromptConfig('kimi').qoder,decisionRetries:1},{port:0,key:'fixture',infer,prewarm:false,reportDir:join(dir,'reports')});
  let resolveTurn,rejectTurn;const outcome=new Promise((r,j)=>{resolveTurn=r;rejectTurn=j;}),timer=setTimeout(()=>rejectTurn(new Error('Local ACP verification timeout')),60000);
  const store=await new Store(join(dir,'workspace')).open(),providers={get:()=>model};await store.mutate(s=>{s.projects=[{id:'fixture',path:dir,name:'Fixture'}];});
  const gateway=new Gateway(store,providers,{command:process.execPath,args:[],env:{}});
  // Inject only the SDK transport. Exercise the real gateway, session lifecycle and native runtime.
  gateway.ensureWorker=async()=>({url:'http://127.0.0.1:'+server.address().port,key:'fixture'});
  const manager=new Sessions(store,providers,gateway,[runtime]),session=await manager.create({projectId:'fixture',runtimeId:'kimi',selection});
  store.on('event',e=>{events.push(e);if(e.type==='approval')void manager.approve(session.id,e.approvalId,'approve').catch(rejectTurn);if(e.type==='turn-end')resolveTurn(e);});
  try{
    await manager.prompt(session.id,'Read only sentinel.txt using your native file reader, then return its exact contents. Do not write files, run shell commands, inspect other paths, or delegate.');
    const end=await outcome,text=events.filter(e=>e.type==='text').map(e=>e.text).join(''),tools=events.filter(e=>e.type==='tool-start');
    const passed=mode==='recover'?end.status==='completed'&&text.includes(marker)&&tools.length>0&&calls===3:end.status==='failed'&&tools.length===0&&calls===2;
    results.push({mode,passed,status:end.status,fixedSdkResponses:calls,modelUnchanged:new Set(models).size===1,nativeToolCalls:tools.length,eventTypes:[...new Set(events.map(e=>e.type))],errors:events.filter(e=>e.type==='error').map(e=>e.text)});
  }catch(error){results.push({mode,passed:false,error:error.message,fixedSdkResponses:calls,eventTypes:[...new Set(events.map(e=>e.type))]});}
  finally{clearTimeout(timer);await manager.close();await gateway.close();await store.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
await writeFile(join(root,'result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;
