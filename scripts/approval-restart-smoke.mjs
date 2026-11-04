// Real Kimi ACP/Bash with fixed local SDK responses. Writes only two files under
// its isolated fixture directory. Never uses user projects, accounts or remote inference.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const appRoot=resolve(process.env.AWB_PACKAGE_ROOT??'.'),load=p=>import(pathToFileURL(join(appRoot,p)));
const [{createBridgeServer},{registerBridgeModels},{bridgePromptConfig},{Store},{normalizeQoder,variantFor},{Sessions},{Gateway},{discoverRuntimes}]=await Promise.all([
  load('bridges/qoderbridge/dist/src/server.js'),load('bridges/qoderbridge/dist/src/model.js'),load('app/services/runtime-prompts.mjs'),load('app/core/store.mjs'),load('app/core/catalog.mjs'),load('app/services/sessions.mjs'),load('app/services/gateway.mjs'),load('app/services/runtime-paths.mjs'),
]);
const baseline=process.env.AWB_BASELINE==='1',choice=process.env.AWB_APPROVAL_CHOICE??'approve';assert.ok(['approve','reject'].includes(choice));
const root=resolve('.runtime/approval-restart-smoke'+(baseline?'-baseline':'')+'/'+choice),dir=join(root,randomUUID());await mkdir(dir,{recursive:true});
// A fresh original home prevents an existing native allow-always rule bypassing this fixture.
const original=join(dir,'original-home');await mkdir(original);await writeFile(join(original,'config.toml'),'default_permission_mode = "manual"\n');process.env.KIMI_CODE_HOME=original;
const exists=async file=>{try{await access(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const files=[join(dir,'approval-1.txt'),join(dir,'approval-2.txt')],markers=[randomUUID(),randomUUID()],events=[],approvalIds=[],rawIds=[],nativeIds=new Set();let phase=0,calls=0,step=0,resolveSignal,rejectSignal,hidden=false;
const model=normalizeQoder({value:'local-fixture',displayName:'Fixed local approval fixture',context_config:{native:{token_count:200000}},thinking_config:{enabled:{efforts:{low:{}}}}}),selection={modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'},variant=variantFor(model,selection);
registerBridgeModels([{id:variant.id,runtimeId:model.id,name:model.name,contextWindow:200000,maxTokens:32000,efforts:['low']}]);
const infer=async(_config,prompt,_gate,onText)=>{
  calls++;step++;assert.ok(step<=2,'Unexpected native/model retry');let decision;
  if(step===1){
    const match=/Tools \(JSON schemas\): (\[[^\n]*\])\n/.exec(prompt);assert.ok(match);const tools=JSON.parse(match[1]),tool=tools.find(t=>t.name==='Bash');assert.ok(tool);
    const cwd=dir.replaceAll('\\','/').replaceAll("'","'\\''"),file=`approval-${phase+1}.txt`;
    const args={command:`cd '${cwd}' && printf '%s\\n' '${markers[phase]}' > '${file}' && cat '${file}'`};if(tool.parameters.properties.description)args.description='Print a local permission test marker';
    decision={kind:'tool_call',name:tool.name,arguments:args};
  }else{
    const allowed=phase===0||choice==='approve';assert.equal(await exists(files[phase]),allowed);
    if(allowed){assert.equal((await readFile(files[phase],'utf8')).trim(),markers[phase]);assert.ok(prompt.includes(markers[phase]));}
    decision={kind:'final',content:allowed?`Local fixture verified: ${markers[phase]}`:'无法继续执行命令，授权已被拒绝。'};
  }
  const response=JSON.stringify(decision);for(const c of response)onText?.(c);return {response,error:null,stage:'inference',result:'success',stream_stop_reasons:['end_turn'],model_requests:1,normalized_usage:{prompt_tokens:100,completion_tokens:10,total_tokens:110}};
};
const server=await createBridgeServer({auth:'cli',timeout:30000,strategy:'permission',...bridgePromptConfig('kimi').qoder,decisionRetries:1},{port:0,key:'fixture',infer,prewarm:false,reportDir:join(dir,'reports')});
const store=await new Store(join(dir,'workspace')).open(),providers={get:()=>model};await store.mutate(s=>{s.projects=[{id:'p',path:dir,name:'Local approval fixture'}];});
const runtime=(await discoverRuntimes()).find(r=>r.id==='kimi'),gateway=new Gateway(store,providers,{command:process.execPath,args:[],env:{}});gateway.ensureWorker=async()=>({url:'http://127.0.0.1:'+server.address().port,key:'fixture'});
const manager=new Sessions(store,providers,gateway,[runtime]),session=await manager.create({projectId:'p',runtimeId:'kimi',selection});
store.on('change',()=>{if(session.nativeId)nativeIds.add(session.nativeId);});
store.on('event',e=>{events.push(e);if(e.type==='approval')void(async()=>{
  const request=manager.adapters.get(session.id).requests.get(e.approvalId);rawIds.push(request.id);approvalIds.push(e.approvalId);
  const history=await store.events(session.id),resolved=new Map(history.filter(x=>x.type==='approval-resolved').map(x=>[x.approvalId,x.choice]));
  if(phase===1&&resolved.has(e.approvalId)){hidden=true;assert.equal(await exists(files[1]),false);resolveSignal({hidden:true});return;}
  assert.equal(resolved.has(e.approvalId),false);assert.equal(await exists(files[phase]),false,'Commands may not run before this permission is answered');
  await manager.approve(session.id,e.approvalId,phase===0?'approve':choice);
})().catch(e=>rejectSignal(e));if(e.type==='turn-end')resolveSignal({end:e});});
let result;
try{
  for(phase=0;phase<2;phase++){
    step=0;const signal=new Promise((r,j)=>{resolveSignal=r;rejectSignal=j;}),timer=setTimeout(()=>rejectSignal(new Error('Local approval verification timeout')),45000);
    try{await manager.prompt(session.id,`Run the native Bash tool to write and print the local fixture marker for check ${phase+1}, then report the result. Do not access other files, run other commands or delegate.`);const outcome=await signal;
      if(outcome.hidden){assert.equal(session.status,'waiting');await manager.cancel(session.id);break;}
      assert.equal(outcome.end.status,'completed');await manager.runs.get(session.id)?.finishing;
    }finally{clearTimeout(timer);}
    if(phase===0){const adapter=manager.adapters.get(session.id);manager.adapters.delete(session.id);await adapter.close();}
  }
  assert.equal(rawIds.length,2);assert.equal(rawIds[0],rawIds[1],'Fixture must actually reuse a native RPC ID after restart');assert.equal(nativeIds.size,1);
  const passed=baseline?hidden&&approvalIds[0]===approvalIds[1]:!hidden&&approvalIds[0]!==approvalIds[1]&&(await exists(files[1]))===(choice==='approve');
  result={passed,baseline,choice,nativeRpcIds:rawIds,appApprovalIdsUnique:approvalIds[0]!==approvalIds[1],hiddenApprovalReproduced:hidden,sameNativeSession:nativeIds.size===1,firstCommandExecuted:await exists(files[0]),secondCommandExecuted:await exists(files[1]),fixedSdkResponses:calls,status:session.status};
}catch(e){result={passed:false,baseline,choice,error:e.message,fixedSdkResponses:calls};}
finally{await manager.close();await gateway.close();await store.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
await writeFile(join(root,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
