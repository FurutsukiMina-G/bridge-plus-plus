// Installed Codex protocol, without a prompt, inference or durable thread.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {discoverRuntimes} from '../app/services/runtime-paths.mjs';
import {withRuntimePermissions,codexPermissionSettings} from '../app/services/runtime-permissions.mjs';
import {codexPermissionResultMatches} from '../app/runtimes/codex.mjs';
import {launch,RpcProcess} from '../app/core/process.mjs';

const root=resolve('.runtime/permissions-protocol');await mkdir(root,{recursive:true});
const runtime=(await withRuntimePermissions(await discoverRuntimes())).find(r=>r.id==='codex');
const results=[],rpc=new RpcProcess(launch(runtime.executable,['app-server','--listen','stdio://'],{cwd:root}),{timeoutMs:20000});
try{
  await rpc.request('initialize',{clientInfo:{name:'bridgepp-permission-check',title:'Local permission protocol check',version:'0.1.12'},capabilities:{experimentalApi:false}});rpc.notify('initialized');
  for(const mode of runtime.permissions.modes){
    try{
      const result=await rpc.request('thread/start',{cwd:root,ephemeral:true,...codexPermissionSettings(mode.id)});
      const observed={mode:mode.id,passed:codexPermissionResultMatches(mode.id,result,{autoReview:runtime.permissions.observed.autoReview}),ephemeral:true,approvalPolicy:result.approvalPolicy,sandbox:result.sandbox?.type,approvalsReviewer:result.approvalsReviewer};
      results.push(observed);
    }catch(error){results.push({mode:mode.id,passed:false,error:error.message});}
  }
}catch(error){results.push({passed:false,error:error.message});}finally{await rpc.close();}
await writeFile(join(root,'result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
if(!results.length||results.some(x=>!x.passed))process.exitCode=1;
