import {mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {BridgeError} from './errors.mjs';
import {NATIVE_SYSTEM} from './hold-prompt.mjs';
import {abortable} from './context.mjs';
/** V2 stream() ends at each result. A single reader owns each turn; send() is serialized
 * after the previous stream drains, because the SDK discards buffered events in send(). */
export async function openHoldRuntime(cfg,binding,lane,createSession,makeOptions){
  binding.openSignal?.throwIfAborted();
  const {body,credential}=binding.context;
  const id=randomUUID(),dir=join(cfg.runtime,'hold',id),controller=new AbortController();
  binding.startupController=controller;
  await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'.bridge-owner.json'),JSON.stringify({pid:process.pid}),{mode:0o600});
  let session,cleanup=null,closed=false,tail=Promise.resolve(),wake,ended=false,failure=null;const events=[];
  const fail=error=>{failure=error;ended=true;wake?.();};
  const close=()=>{if(closed)return cleanup;closed=true;ended=true;controller.abort();session?.close();wake?.();cleanup=rm(dir,{recursive:true,force:true,maxRetries:3,retryDelay:50}).catch(()=>{});return cleanup;};
  try{
    const options=makeOptions(body,credential,dir,controller);
    Object.assign(options,{maxTurns:cfg.nativeMaxTurns??100000,persistSession:false,mcpServers:{host:binding.config()},
      systemPrompt:cfg.hostPrompts?.native?cfg.hostPrompts.native+'\n\n'+NATIVE_SYSTEM()+' This session holds native calls until the host returns their real results. Max turns handoff markers only describe historical replay; do not wait for a new user message after each call.':{append:NATIVE_SYSTEM()},
      hooks:{PreToolUse:[{hooks:[async input=>lane.preToolUse(binding,input)]}],PostToolUse:[{hooks:[async input=>lane.postToolUse(binding,input)]}]},
      canUseTool:async(name,input)=>lane.canUseTool(binding,name,input)});
    options.env={...options.env,WORKBUDDY_BRIDGE_HOLD:'1'};
    session=createSession(options);
    await abortable(Promise.resolve(session.connect()),AbortSignal.any([controller.signal,AbortSignal.timeout(20000),...(binding.openSignal?[binding.openSignal]:[])]));
    // connect() only boots the process in 0.3.286. This public, local control
    // request completes SDK initialization without sending a model prompt.
    await abortable(session.getAvailableModes(),AbortSignal.any([controller.signal,AbortSignal.timeout(20000),...(binding.openSignal?[binding.openSignal]:[])]));
    let initialized=false;
    const verify=message=>{
      if(message.isReplay)return false;
      if(message.type==='system'&&message.subtype==='init'){
        if(message.model!==body.model)throw new BridgeError(502,'model_mismatch','Official WorkBuddy runtime selected a different model');
        if(message.plugins?.length||message.skills?.length||(message.mcp_servers??[]).some(s=>s.name!=='host'))throw new BridgeError(502,'isolation_failed','Official runtime loaded external tools, plugins or skills');
        initialized=true;
        if(!(message.mcp_servers??[]).some(s=>s.name==='host'&&s.status==='connected'))throw new BridgeError(502,'native_tools_unavailable','Official runtime did not connect the host function server');
      }
      if(!initialized&&['assistant','stream_event'].includes(message.type))throw new BridgeError(502,'sdk_incomplete','SDK streamed output before verified runtime initialization');
      const model=message.type==='assistant'?message.message?.model:message.event?.message?.model;
      if(model&&model!==body.model)throw new BridgeError(502,'model_mismatch','Official WorkBuddy response used a different model');
      if(message.type==='result'&&message.modelUsage&&Object.keys(message.modelUsage).some(model=>model!==body.model))throw new BridgeError(502,'model_mismatch','SDK usage reported another model');
      if(message.type==='error')throw new BridgeError(502,'upstream_failure','Official WorkBuddy stream returned an error');
      return true;
    };
    const queue={push(message){
      tail=tail.then(async()=>{
        if(closed)return;
        await session.send(message.message.content);
        let terminal=false;
        for await(const message of session.stream()){
          if(closed)return;
          if(!verify(message))continue;
          events.push(message);wake?.();
          if(message.type==='result')terminal=true;
        }
        if(!terminal&&!closed)throw new BridgeError(502,'sdk_incomplete','WorkBuddy V2 stream closed without a result');
      }).catch(fail);
    }};
    const q={interrupt:()=>session.interrupt(),async *[Symbol.asyncIterator](){
      for(;;){if(events.length){yield events.shift();continue;}if(failure)throw failure;if(ended)return;await new Promise(resolve=>{wake=resolve;});wake=null;}
    }};
    return {id,dir,q,queue,controller,model:body.model,policy:{reasoning:null},policyCalls:[],warm:{close},close};
  }catch(error){await close();throw error;}
}
