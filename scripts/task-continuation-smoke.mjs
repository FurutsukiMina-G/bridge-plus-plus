// Actual Kimi ACP, native TodoList/Read, copied bridge HTTP server and app Sessions.
// Only upstream SDK inference is replaced with fixed local responses. No user project/model calls.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const appRoot=resolve(process.env.AWB_PACKAGE_ROOT??'.'),load=p=>import(pathToFileURL(join(appRoot,p)));
const [{createBridgeServer},{registerBridgeModels},{bridgePromptConfig},{Store},{normalizeQoder,variantFor},{Sessions},{Gateway},{discoverRuntimes}]=await Promise.all([
  load('bridges/qoderbridge/dist/src/server.js'),load('bridges/qoderbridge/dist/src/model.js'),load('app/services/runtime-prompts.mjs'),load('app/core/store.mjs'),load('app/core/catalog.mjs'),load('app/services/sessions.mjs'),load('app/services/gateway.mjs'),load('app/services/runtime-paths.mjs'),
]);
const baseline=process.env.AWB_BASELINE==='1',root=resolve('.runtime/task-completion-smoke'+(baseline?'-baseline':''));await mkdir(root,{recursive:true});
const runtime=(await discoverRuntimes()).find(r=>r.id==='kimi'),results=[];
const modes=process.env.AWB_TASK_MODES?.split(',')??['recover','exhaust','no-plan','resume'];
assert.ok(modes.every(m=>['recover','exhaust','no-plan','resume'].includes(m)));
for(const mode of modes){
  const dir=join(root,mode,randomUUID());await mkdir(dir,{recursive:true});const first='FIRST_'+randomUUID(),second='SECOND_'+randomUUID();
  await writeFile(join(dir,'first.txt'),first);await writeFile(join(dir,'second.txt'),second);
  const plan=mode!=='no-plan',summary='示例文件的第一项内容已核实。接下来会读取第二项内容并整理检查结果。';
  let calls=0,hostTools;const models=[],events=[],policies=[],nativeIds=new Set();
  const read=name=>{const tool=hostTools.find(t=>/^read$/i.test(t.name));assert.ok(tool);const props=tool.parameters?.properties??{};const key=['path','file_path','filePath','absolute_path'].find(k=>Object.hasOwn(props,k));assert.ok(key);return {kind:'tool_call',name:tool.name,arguments:{[key]:join(dir,name)}};};
  const todo=completed=>{const tool=hostTools.find(t=>/^TodoList$/.test(t.name));assert.ok(tool);const props=tool.parameters.properties.todos.items.properties,key=Object.hasOwn(props,'title')?'title':'content',statuses=props.status.enum;
    return {kind:'tool_call',name:tool.name,arguments:{todos:['Read first fixture','Read second fixture and report'].map((title,i)=>({[key]:title,status:completed?(statuses.includes('done')?'done':'completed'):i?'pending':'in_progress'}))}};};
  const infer=async(config,prompt,_gate,onText)=>{
    models.push(config.model);policies.push(JSON.stringify({model:config.model,reasoning:config.reasoning,context:config.context}));calls++;assert.ok(calls<=10,'Unexpected native retry loop');
    const match=/Tools \(JSON schemas\): (\[[^\n]*\])\n/.exec(prompt);if(match)hostTools=JSON.parse(match[1]);assert.ok(hostTools);
    let decision;
    if(mode==='resume'&&calls===4)decision={kind:'final',content:'第一项资料已经收集。'};
    else if(mode==='resume'&&calls===5)decision=read('second.txt');
    else if(mode==='resume'&&calls===6)decision=todo(true);
    else if(plan&&calls===1)decision=todo(false);
    else if(calls===(plan?2:1))decision=read('first.txt');
    else if(calls===(plan?3:2)||mode==='exhaust')decision={kind:'final',content:summary};
    else if(calls===(plan?4:3))decision=read('second.txt');
    else if(mode!=='no-plan'&&calls===(plan?5:4))decision=todo(true);
    else{assert.ok(prompt.includes(first)&&prompt.includes(second),'Both actual read results must reach the final model request');decision={kind:'final',content:`检查报告已完成。两项文件内容：\n${first}\n${second}`};}
    const response=JSON.stringify(decision);for(const char of response)onText?.(char);
    return {response,error:null,stage:'inference',result:'success',stream_stop_reasons:['end_turn'],model_requests:1,normalized_usage:{prompt_tokens:100,completion_tokens:10,total_tokens:110}};
  };
  const model=normalizeQoder({value:'local-fixture',displayName:'Local deterministic fixture',context_config:{native:{token_count:200000}},thinking_config:{enabled:{efforts:{high:{}}}}}),selection={modelKey:model.key,identity:model.identity,reasoning:'high',contextTokens:200000},variant=variantFor(model,selection);
  registerBridgeModels([{id:variant.id,runtimeId:model.id,name:model.name,contextWindow:200000,maxTokens:32000,efforts:['high']}]);
  const server=await createBridgeServer({auth:'cli',timeout:30000,strategy:'permission',...bridgePromptConfig('kimi').qoder,decisionRetries:1},{port:0,key:'fixture',infer,prewarm:false,reportDir:join(dir,'reports')});
  const store=await new Store(join(dir,'workspace')).open(),providers={get:()=>model};await store.mutate(s=>{s.projects=[{id:'fixture',path:dir,name:'Local fixture'}];});
  let gateway,manager,session,priorReadCalls=0;
  const openManager=async legacy=>{
    const legacyRoot=resolve(process.env.AWB_BASELINE_ROOT??'release/0.1.6/win-unpacked/resources/app');
    const {Sessions:Manager}=legacy?await import(pathToFileURL(join(legacyRoot,'app/services/sessions.mjs'))):{Sessions};
    const {Gateway:Gate}=legacy?await import(pathToFileURL(join(legacyRoot,'app/services/gateway.mjs'))):{Gateway};
    gateway=new Gate(store,providers,{command:process.execPath,args:[],env:{}});gateway.ensureWorker=async()=>({url:'http://127.0.0.1:'+server.address().port,key:'fixture'});
    manager=new Manager(store,providers,gateway,[runtime]);
  };
  await openManager(mode==='resume');session=await manager.create({projectId:'fixture',runtimeId:'kimi',selection});
  store.on('change',()=>{if(session.nativeId)nativeIds.add(session.nativeId);});
  const task='Read first.txt and second.txt using native Read, verify both contents and produce the final report. Keep a truthful plan. Do not write project files, run commands, access other paths or delegate.';
  let resolveTurn,rejectTurn;const newOutcome=()=>new Promise((r,j)=>{resolveTurn=r;rejectTurn=j;});let ended=newOutcome();const timer=setTimeout(()=>rejectTurn(new Error('Local native verification timeout')),45000);
  store.on('event',e=>{events.push(e);if(e.type==='approval')void manager.approve(session.id,e.approvalId,'approve').catch(rejectTurn);if(e.type==='turn-end')resolveTurn(e);});
  try{
    if(mode==='resume'){
      // Create genuine native history with the old app, then restart the adapter
      // through the new app using exactly the saved ACP session and private home.
      await manager.prompt(session.id,task);assert.equal((await ended).status,'completed');assert.equal(calls,3);
      priorReadCalls=events.filter(e=>e.type==='tool-start'&&e.name==='Read').length;assert.equal(priorReadCalls,1);assert.ok(session.nativeId);
      await manager.close();await gateway.close();events.length=0;await openManager(false);ended=newOutcome();
    }
    await manager.prompt(session.id,mode==='resume'?'上一轮任务异常中断了，请你继续':task);
    const end=await ended,text=events.filter(e=>e.type==='text').map(e=>e.text).join(''),resumedReadCalls=events.filter(e=>e.type==='tool-start'&&e.name==='Read').length,readCalls=priorReadCalls+resumedReadCalls,continuations=events.filter(e=>e.source==='task-completion'&&e.type==='notice').length;
    const sameNativeSession=nativeIds.size===1&&events.filter(e=>e.type==='notice'&&/ACP 已连接/.test(e.text)).length===1,settingsUnchanged=new Set(policies).size===1;
    const outcome=mode==='exhaust'?end.status==='failed'&&continuations===2&&readCalls===1:end.status==='completed'&&text.includes(first)&&text.includes(second)&&readCalls===2&&continuations===1;
    const passed=outcome&&sameNativeSession&&settingsUnchanged;
    const earlyEndReproduced=end.status==='completed'&&readCalls===1&&!text.includes(second);
    results.push({mode,passed,earlyEndReproduced,status:end.status,fixedSdkResponses:calls,readCalls,...(mode==='resume'?{priorReadCalls,resumedReadCalls}:{}),continuations,modelUnchanged:new Set(models).size===1,sameNativeSession,settingsUnchanged,singleAppTurn:events.filter(e=>e.type==='user').length===1,nativePlans:events.filter(e=>e.type==='plan').map(e=>e.data.entries.map(x=>x.status)),errors:events.filter(e=>e.type==='error').map(e=>e.code??e.text)});
  }catch(e){results.push({mode,passed:false,error:e.message,fixedSdkResponses:calls,errors:events.filter(e=>e.type==='error').map(e=>e.text)});}
  finally{clearTimeout(timer);await manager.close();await gateway.close();await store.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
  console.log(JSON.stringify(results.at(-1)));
}
await writeFile(join(root,'result.json'),JSON.stringify(results,null,2));if(results.some(r=>baseline?!r.earlyEndReproduced:!r.passed))process.exitCode=1;
