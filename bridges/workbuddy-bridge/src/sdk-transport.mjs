import sdk from '@tencent-ai/agent-sdk';
const {query,unstable_v2_createSession}=sdk;
import {HoldLane,nativeEligible} from './hold-lane.mjs';
import {openHoldRuntime} from './hold-runtime.mjs';
import {hasUsableTools,answerInstructions} from './final-answer.mjs';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {DECISION_INSTRUCTIONS,decisionInput,compileTools,safeToolName,decisionIssueSummary} from './decision.mjs';
import {DecisionOutput} from './decision-output.mjs';
import {BridgeError,publicError} from './errors.mjs';
import {runtimePath} from './contain.mjs';
import {ContextPool,digest,abortable} from './context.mjs';
import {FinalTextProjector} from './streaming.mjs';
import {normalizedUsage,requestUsage,replayUsage,addSdkUsage,usageAccounting} from './usage.mjs';
import {correctionInput} from './recovery.mjs';
import {rejectedEvidence,decisionErrorEvidence,redactSecrets} from './rejection-evidence.mjs';
import {HOST,PREFIX,FORWARDED,NATIVE_INSTRUCTIONS,nativeSupported,hostTools,hostServer,nativeInput,nativeCorrection,nativeDecision,NativeTextGate,structuredResponse} from './native.mjs';
import {WarmRuntimes,promptQueue,userMessage} from './warm.mjs';
import {sdkMediaPrompt} from './media-input.mjs';
export {normalizedUsage} from './usage.mjs';
// Explicit denies complement tools:[] on WorkBuddy builds that still enumerate
// their entire tool registry in the init event. The hook covers newly added tools.
const DENIED_TOOLS=['Agent','Read','Write','Edit','Bash','Glob','Grep','PowerShell','EnterPlanMode','ExitPlanMode','TaskCreate','TaskGet','TaskUpdate','TaskList','WebFetch','WebSearch','TaskStop','TaskOutput','Skill','AskUserQuestion','StructuredOutput','ToolSearch','DeferExecuteTool','SendMessage','TeamCreate','TeamDelete','ImageGen','LibraryUpload','VideoGen','AudioTranscribe','A2AGetAgentCard','A2ASendMessage','A2AGetTask','A2ACancelTask','ListMcpResources','ReadMcpResource','MessageColleague','SpeakInChannel','ChannelTasks','CreateColleague','CreateChannel','ListColleagues'];
const RETRYABLE=['invalid_decision','invalid_tool_arguments','native_tool_blocked','required_tool_missing','tools_disabled','wrong_pinned_tool','ambiguous_decision','unfinished_turn','missing_native_output'];
const WARM_DELAY_MS=25,WARM_READY_MS=20000;
// Avoid per-session 60–70 MB marketplace downloads, file logs and prompt traces, plus unused startup work.
export const LEAN_RUNTIME_ENV=Object.freeze({
  CODEBUDDY_DISABLE_PLUGIN_INSTALLS:'1',CODEBUDDY_SKIP_BUILTIN_MARKETPLACE:'1',CODEBUDDY_DISABLE_FILE_LOGS:'1',
  CODEBUDDY_DISABLE_SHELL_SNAPSHOT:'1',CODEBUDDY_DISABLE_TRACE_COLLECTOR:'1',CODEBUDDY_CODE_DISABLE_FILE_CHECKPOINTING:'1',
  CODEBUDDY_DISABLE_BUILTIN_SUBAGENTS:'1',CODEBUDDY_DISABLE_GIT_PROMPT_CONTEXT:'1',CODEBUDDY_DISABLE_SYSTEM_INFO_GIT:'1',
  CODEBUDDY_GIT_REPO_SCAN_DISABLED:'1',CODEBUDDY_DISABLE_IDE:'1',CODEBUDDY_DISABLE_WORKFLOWS:'1',
  CODEBUDDY_DISABLE_HOT_RELOAD:'1',CODEBUDDY_DISABLE_INPROCESS_TEAMMATES:'1',CODEBUDDY_TEAM_IDLE_DETECTION_DISABLED:'1',
  CODEBUDDY_MEMORY_EXTRACTION_DISABLED:'1',CODEBUDDY_MEMORY_RELEVANCE_DISABLED:'1'
});
// The runtime's own message once a denied host call has used the single permitted turn.
const RUNTIME_STOP=/^Max turns \(1\) exceeded\.?$/i;
// The SDK throws ExecutionError before yielding an error result. Every reported reason
// must be the expected stop; a second transport/auth error must never be swallowed.
const expectedCallStop=error=>RUNTIME_STOP.test(String(error?.message??'').trim())&&
  (error.errors===undefined||Array.isArray(error.errors)&&error.errors.length>0&&error.errors.every(e=>RUNTIME_STOP.test(String(e).trim())));
export function sdkOptions(cfg,credential,body,dir,controller,onDenied,onStderr=()=>{},{native=false}={}){
  const cli=runtimePath(cfg);
  if(!existsSync(cli))throw new BridgeError(503,'runtime_missing','WorkBuddy runtime missing; set WORKBUDDY_CLI to its official codebuddy-lite-wb.mjs');
  const env={...process.env,CODEBUDDY_AUTH_TOKEN:credential.accessToken,CODEBUDDY_BASE_URL:'https://copilot.tencent.com/v2',ACC_USER_ID:credential.uid,
    CODEBUDDY_CUSTOM_HEADERS:`X-Domain: ${credential.domain}`,CODEBUDDY_CONFIG_DIR:join(dir,'home'),WORKBUDDY_CONFIG_DIR:join(dir,'home'),
    CODEBUDDY_CODE_DISABLE_BACKGROUND_TASKS:'1',CODEBUDDY_DISABLE_AUTO_MEMORY:'1',CODEBUDDY_DISABLE_CRON:'1',DISABLE_TELEMETRY:'1',
    // Memory prompts are the only place the runtime writes its own session/home paths into the
    // model's context. The interceptor flag above is not the agent-memory gate: that one is
    // CODEBUDDY_CODE_DISABLE_AUTO_MEMORY (default on) and appends "# Persistent Agent Memory"
    // with <CODEBUDDY_CONFIG_DIR>/projects/<escaped cwd>. Turn every memory layer off here so
    // all runtime-start paths (chat, warm, hold) inherit it.
    CODEBUDDY_CODE_DISABLE_AUTO_MEMORY:'1',CODEBUDDY_MEMORY_ENABLED:'0',CODEBUDDY_TYPED_MEMORY_ENABLED:'0',CODEBUDDY_TEAM_MEMORY_ENABLED:'0',
    // The runtime also compacts its own history and then writes "read the full transcript at
    // <CODEBUDDY_CONFIG_DIR>/projects/<escaped cwd>/<session>.jsonl" into the model context.
    // Context is the host's job. The pre-message path is hard off here (the env value wins over
    // the product feature flag); the emergency path is forced and ignores settings, so the only
    // lever left is its trigger, held at the model's own window by threshold=100% and the
    // largest window the runtime accepts. Compaction can then only happen at a real overflow.
    // Both of those env levers only raise a threshold, so the product switch itself is also
    // turned off below (--settings autoCompactEnabled=false, on by default in the runtime).
    // Measured with .runtime/cc-work/f4/comp.mjs: control (no switches, small window) compacts
    // and injects the transcript path; this configuration does not.
    CODEBUDDY_PRE_MESSAGE_COMPACT:'0',
    CODEBUDDY_AUTOCOMPACT_PCT_OVERRIDE:'100',CODEBUDDY_AUTO_COMPACT_WINDOW:'1000000',
    ...(process.env.WORKBUDDY_FULL_RUNTIME==='1'?{}:LEAN_RUNTIME_ENV),
    CODEBUDDY_CODE_MAX_OUTPUT_TOKENS:String(body.max_tokens),CODEBUDDY_API_KEY:undefined,CODEBUDDY_API_KEY_HELPER_DISABLED:'1',
    ACC_PRODUCT_CONFIG:undefined,ACC_PRODUCT_CONFIG_V2:undefined,ACC_PRODUCT_CONFIG_V3:undefined,ACC_PRODUCT_CONFIG_PATH:undefined,WORKBUDDY_BRIDGE_ACTUAL_CLI:cli};
  // Native turns stop at the first host call; the denial text becomes that call's interim result.
  const tools=native?hostTools(body):[],denial=native?(cfg.forwardedMessage??FORWARDED):'Host-owned tools';
  return {model:body.model,cwd:dir,tools:[],disallowedTools:DENIED_TOOLS,settingSources:[],strictMcpConfig:true,
    // Only this one key: --settings is the documented CLI channel and the runtime reads it at the
    // highest priority, so no project or user settings file can re-enable compaction either.
    extraArgs:{settings:JSON.stringify({autoCompactEnabled:false})},
    mcpServers:tools.length?{[HOST]:hostServer(tools)}:{},agents:{},
    canUseTool:async name=>{onDenied(name);return {behavior:'deny',message:native?denial:'Only the external host can execute tools'};},
    hooks:{PreToolUse:[{hooks:[async input=>{onDenied(input?.tool_name);return {continue:false,stopReason:native?denial:'Only the external host executes tools',hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:denial}};}]}]},
    systemPrompt:!hasUsableTools(body)?answerInstructions(body):cfg.hostPrompts?(native?cfg.hostPrompts.native:cfg.hostPrompts.decision):{append:native?NATIVE_INSTRUCTIONS:DECISION_INSTRUCTIONS},maxTurns:1,includePartialMessages:true,persistSession:false,effort:body.reasoning_effort,...(body.bridge_thinking_disabled?{thinking:{type:'disabled'}}:{}),
    abortController:controller,pathToCodebuddyCode:join(cfg.root??resolve(import.meta.dirname,'..'),'scripts/runtime-launcher.mjs'),executable:process.execPath,env,stderr:onStderr};
}
export class SdkTransport {
  constructor(cfg,auth,{run=query,createSession}={}){
    // Injecting the old query double must never accidentally launch the real V2 SDK.
    createSession??=run===query?unstable_v2_createSession:()=>{throw new BridgeError(500,'session_factory_required','Native hold tests must inject createSession; legacy query doubles should explicitly select replay mode');};
    this.pendingSlots=0;this.slotAllocation=Promise.resolve();
    this.hold=new HoldLane(cfg,(binding)=>openHoldRuntime(cfg,binding,this.hold,createSession,(body,credential,dir,controller)=>sdkOptions(cfg,credential,body,dir,controller,()=>{})),runtime=>runtime.close(),()=>this.reserveSlot());
    this.cfg=cfg;this.auth=auth;this.run=run;this.pool=new ContextPool(cfg);this.pool.externalMakeRoom=()=>this.reserveSlot();this.failures=new Map();
    this.warm=new WarmRuntimes({ttlMs:cfg.prewarmMs??0,max:cfg.maxWarm??4});this.pool.onRemove=record=>this.warm.discard(record.id);
    this.blank=new WarmRuntimes({ttlMs:cfg.prewarmMs??0,max:cfg.maxBlankWarm??0});this.blankPending=false;
    this.metrics={started:0,completed:0,deniedTools:0,hostCalls:0,decodedDsml:0,replays:0,correctionCalls:0,recoveredRequests:0,localDecisionRepairs:0,lastFailure:null,warm:this.warm.stats,blankWarm:this.blank.stats};
  }
  async reserveSlot(){
    const previous=this.slotAllocation;let unlock;this.slotAllocation=new Promise(resolve=>{unlock=resolve;});await previous;
    try{
      while(this.pool.records.size+this.hold.sessions.size+this.pendingSlots>=(this.cfg.maxSessions??24)){
        const idle=[...this.pool.records.values()].filter(r=>!r.busy).sort((a,b)=>a.touched-b.touched)[0];
        if(idle)await this.pool.remove(idle);else if(!this.hold.closeIdleForCapacity()){
          const counts=this.hold.capacity();counts.busy+=this.pendingSlots+[...this.pool.records.values()].filter(r=>r.busy).length;
          throw new BridgeError(429,'sessions_busy',`All context slots are active (busy=${counts.busy}, awaiting=${counts.awaiting}, idle=${counts.idle})`,counts);
        }
      }
      this.pendingSlots++;let released=false;return()=>{if(!released){released=true;this.pendingSlots--;}};
    }finally{unlock();}
  }
  async close(){await this.hold.closeAll();this.closed=true;this.warm.close();this.blank.close();await this.pool.close();}
  optionsKey(body,credential,native){return {native,model:body.model,publicModel:body.bridge_public_model,nativeContextWindow:body.bridge_native_context_window,effort:body.reasoning_effort,max:body.max_tokens,tools:body.tools??[],choice:body.tool_choice,format:body.response_format,thinking:body.bridge_thinking_disabled,prompts:this.cfg.hostPrompts,token:credential.accessToken,uid:credential.uid,domain:credential.domain};}
  warmKey(record,body,credential,native){
    return digest({...this.optionsKey(body,credential,native),session:record.sessionId,dir:record.dir});
  }
  createWarm(body,credential,native,dir,sessionId=null){
    const controller=new AbortController(),input=promptQueue();let sink=()=>{},denied=()=>{};
    const options=sdkOptions(this.cfg,credential,body,dir,controller,name=>denied(name),s=>sink(s),{native});
    options.persistSession=true;if(sessionId)options.resume=sessionId;
    const q=this.run({prompt:input.iterable,options});
    const handle={dir,query:q,controller,failed:false,push:text=>input.push(userMessage(text)),setStderr:f=>{sink=f;},setDenied:f=>{denied=f;},ready:Promise.resolve().then(()=>q.connect?.())};
    handle.ready.catch(()=>{handle.failed=true;});
    handle.close=()=>{input.end();controller.abort();q.cleanup?.();handle.ready.then(()=>q.cleanup?.(),()=>q.cleanup?.());};
    return handle;
  }
  // Empty runtimes have never received a prompt or resume ID. Only fresh conversations may adopt them.
  async prewarmBlank(body,credential,native){
    if(this.closed||this.blankPending||this.blank.size||!this.blank.ttlMs||!this.blank.max||hasUsableTools(body))return;
    this.blankPending=true;const dir=join(this.cfg.runtime,'sdk',randomUUID());
    try{
      await mkdir(dir,{recursive:true});await writeFile(join(dir,'.bridge-owner.json'),JSON.stringify({pid:process.pid}),{mode:0o600});
      if(this.closed)return;
      const started=this.blank.start('blank',digest(this.optionsKey(body,credential,native)),()=>{
        const handle=this.createWarm(body,credential,native,dir),close=handle.close;
        handle.close=()=>{close();if(!handle.adopted)void handle.ready.finally(()=>rm(dir,{recursive:true,force:true})).catch(()=>{});};return handle;
      });
      if(started)return;
    }finally{this.blankPending=false;if(![...this.blank.entries.values()].some(e=>e.handle.dir===dir))await rm(dir,{recursive:true,force:true});}
  }
  /** Boot the runtime for this session's next turn while the host executes the tool calls. */
  prewarm(record,body,credential,native){
    if(!this.warm.ttlMs||!this.warm.max||!record.sessionId)return;
    const sessionId=record.sessionId;
    // Start after the finished runtime released the session, and never beside an active turn.
    setTimeout(()=>{
      if(record.busy||record.sessionId!==sessionId||this.pool.closed||this.pool.records.get(record.id)!==record)return;
      this.warm.start(record.id,this.warmKey(record,body,credential,native),()=>{
        return this.createWarm(body,credential,native,record.dir,sessionId);
      });
    },WARM_DELAY_MS).unref?.();
  }
  async takeWarm(record,body,credential,native,signal){
    const fresh=!record.sessionId&&!record.history.length;
    const owner=fresh?this.blank:this.warm;
    const handle=fresh?owner.take('blank',digest(this.optionsKey(body,credential,native))):owner.take(record.id,this.warmKey(record,body,credential,native));if(!handle)return null;
    let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Prestarted runtime did not become ready')),WARM_READY_MS);});
    try{await abortable(Promise.race([handle.ready,timeout]),signal);}
    catch(error){owner.fail(handle);if(signal.aborted)throw error;return null;}
    finally{clearTimeout(timer);}
    if(handle.failed){owner.fail(handle);return null;}
    if(fresh){await rm(record.dir,{recursive:true,force:true});record.dir=handle.dir;handle.blank=true;handle.adopted=true;}
    return handle;
  }
  chatHold(body,credential,signal,context){
    const metrics={mode:'hold',toolMode:'native',harness_tool_count:body.tools?.length??0,available_tool_definition_chars:JSON.stringify(body.tools??[]).length,sent_tool_definition_chars:0,attempts:[],knownUsage:null,warmStart:false,client_usage:null};
    const local=new AbortController(),requestSignal=AbortSignal.any([signal,local.signal]);
    const request={...body,_holdKey:digest({model:body.model,publicModel:body.bridge_public_model,context:body.bridge_native_context_window,
      effort:body.reasoning_effort,thinking:body.bridge_thinking_disabled,max:body.max_tokens,uid:credential.uid,domain:credential.domain,token:credential.accessToken,prompts:this.cfg.hostPrompts})};
    const id='chatcmpl-'+randomUUID(),created=Math.floor(Date.now()/1000),encoder=new TextEncoder();let closed=false;
    const stream=new ReadableStream({start:sink=>{
      const send=value=>{if(!closed)sink.enqueue(encoder.encode('data: '+(typeof value==='string'?value:JSON.stringify(value))+'\n\n'));};
      const chunk=(delta,finish=null,usage=null)=>({id,created,model:body.model,object:'chat.completion.chunk',choices:[{index:0,delta,finish_reason:finish}],...(usage?{usage}:{} )});
      void(async()=>{
        try{
          send(chunk({role:'assistant',content:''}));this.metrics.started++;
          let shown='';
          const completed=await this.hold.infer(request,{signal:requestSignal,runtimeContext:{body,credential},onActivity:context.onActivity,
            onUsage:snapshot=>{metrics.knownUsage=snapshot.client_usage;metrics.usageAccounting=snapshot.accounting;},
            onText:text=>{shown+=text;send(chunk({content:text}));},onThinking:text=>send(chunk({reasoning_content:text}))});
          Object.assign(metrics,completed.report,{native:completed.report.native,warmStart:completed.report.warm_start,knownUsage:completed.report.client_usage,
            localReplay:completed.report.local_response_replay,historyMode:completed.report.history_mode,lastPromptTokens:completed.report.client_usage?.prompt_tokens??null,
            usageAccounting:completed.usage?.snapshot().accounting??usageAccounting([])});
          const {reply}=completed;
          if(!reply)throw new BridgeError(completed.report.stage==='upstream_stalled'?504:completed.report.error_status??502,
            completed.report.error_code??completed.report.stage,completed.report.error??'WorkBuddy native request failed');
          if(reply.content&&!shown)send(chunk({content:reply.content}));
          if(reply.kind==='tool_calls'){
            for(const [index,call]of reply.calls.entries()){
              send(chunk({tool_calls:[{index,id:call.id,type:'function',function:{name:call.name,arguments:''}}]}));
              for(let at=0;at<call.arguments.length;){let end=Math.min(at+32768,call.arguments.length);if(/[\uD800-\uDBFF]/.test(call.arguments[end-1]??''))end--;
                send(chunk({tool_calls:[{index,function:{arguments:call.arguments.slice(at,end)}}]}));at=end;}
            }
            this.metrics.hostCalls+=reply.calls.length;
          }
          const terminal=chunk({},reply.kind==='tool_calls'?'tool_calls':reply.finish,completed.report.client_usage);if(completed.report.client_usage)terminal.bridge_usage={accounting:metrics.usageAccounting,correction_calls:completed.report.native.invalid_calls};send(terminal);send('[DONE]');this.metrics.completed++;
        }catch(error){const safe=publicError(requestSignal.aborted?requestSignal.reason:error,{diagnostic:redactSecrets(error?.message??String(error),credential)});
          if(metrics.knownUsage)send({id,created,model:body.model,object:'chat.completion.chunk',choices:[],usage:metrics.knownUsage});
          send(safe.body);this.metrics.lastFailure={code:safe.body.error.code};
        }finally{if(!closed){closed=true;sink.close();}}
      })();
    },cancel:()=>{closed=true;local.abort(new DOMException('Disconnected','AbortError'));}});
    const response=new Response(stream,{headers:{'content-type':'text/event-stream'}});response.bridgeMetrics=metrics;return response;
  }
  async chat(body,signal,context={}){
    // Compile BEFORE spawning a runtime or making a billable request.
    const validators=compileTools(body.tools);const credential=await this.auth.get();signal.throwIfAborted();
    if(nativeEligible(body,this.cfg))return this.chatHold(body,credential,signal,context);
    const native=['native','replay'].includes(this.cfg.toolMode)&&nativeSupported(body.tools),mode=native?'replay':'json';
    const failureKey=digest({body,uid:credential.uid,domain:credential.domain,mode});
    for(const [key,f]of this.failures)if(Date.now()-f.at>120000)this.failures.delete(key);
    const cachedFailure=this.failures.get(failureKey);
    if(cachedFailure){
      // Reject before touching the context pool: a local replay must not evict,
      // discard or create another lane of the waiting parent conversation.
      const response=new Response('data: '+JSON.stringify(cachedFailure.body)+'\n\n',{headers:{'content-type':'text/event-stream'}});
      response.bridgeMetrics={localReplay:true,historyMode:'replay',sentMessageCount:0,promptCharacters:0,toolMode:mode,mode,client_usage:null,client_cache_usage:'omitted',localReplayReason:'local-rejection-replay',harness_tool_count:body.tools?.length??0,available_tool_definition_chars:JSON.stringify(body.tools??[]).length,sent_tool_definition_chars:0,attempts:[]};return response;
    }
    const lease=await this.pool.acquire(body,credential,signal,{mode});const {record,metrics}=lease;
    Object.assign(metrics,{mode,toolMode:mode,harness_tool_count:body.tools?.length??0,available_tool_definition_chars:JSON.stringify(body.tools??[]).length,sent_tool_definition_chars:lease.toolsReused?0:JSON.stringify(body.tools??[]).length,attempts:[],firstTextMs:null,firstThinkingMs:null,firstModelEventMs:null,warmStart:false,runtimeReadyMs:null});
    metrics.native={mode,window:lease.replay?'continue':lease.reused?(lease.messages.some(m=>m.role==='tool')?'results':'continue'):'new',calls:0,host_calls:0,invalid_calls:0,handoff_stop:false,oversized_results:0,rebuild_reason:metrics.rebuild_reason??null,tools_changed:null,warm_start:false,warm_miss_reason:null};
    let prompt;try{prompt=native?nativeInput(body,{messages:lease.messages,delta:lease.reused,batching:this.cfg.nativeBatching!==false}):decisionInput(body,{messages:lease.messages,toolsReused:lease.toolsReused,delta:lease.reused});
    metrics.promptCharacters=prompt.length;metrics.fullPromptCharacters=(native?nativeInput(body):decisionInput(body)).length;
    metrics.charactersAvoided=Math.max(0,metrics.fullPromptCharacters-prompt.length);}catch(error){await lease.discard();lease.release();throw error;}
    if(lease.replay)Object.assign(metrics,{historyMode:'replay',sentMessageCount:0,promptCharacters:0,charactersAvoided:0});
    const controller=new AbortController();const abort=()=>controller.abort(signal.reason);signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted)abort();
    let runtimeStderr='',q;const start=performance.now();
    const id=lease.replay?.id??`chatcmpl-${randomUUID()}`,created=lease.replay?.created??Math.floor(Date.now()/1000),encoder=new TextEncoder();let closed=false;
    const stream=new ReadableStream({
      start:sink=>{
        const send=data=>{if(!closed)sink.enqueue(encoder.encode(`data: ${typeof data==='string'?data:JSON.stringify(data)}\n\n`));};
        const chunk=(delta,finish=null,usage=null)=>({id,created,model:body.model,object:'chat.completion.chunk',choices:[{index:0,delta,finish_reason:finish}],usage,...(usage?{bridge_usage:{accounting:metrics.usageAccounting??usageAccounting([]),correction_calls:metrics.correctionCalls??0}}:{})});
        void (async()=>{
          let output=new DecisionOutput(),usageRecorded=false,attemptPriorUsage=record.lastSdkUsage,attemptResumed=!!record.sessionId;const usages=[];let success=false,prewarmNext=false;
          // Reported out of band: a long tool-argument-only phase still proves the upstream is alive.
          const onActivity=typeof context.onActivity==='function'?context.onActivity:()=>{};
          const snapshotUsage=()=>{
            const current=usageRecorded?[]:[normalizedUsage({usage:output.usage(attemptPriorUsage,{resumed:attemptResumed})})];
            const usage=requestUsage([...usages,...current]);
            metrics.usageAccounting=usageAccounting([...usages,...current]);
            metrics.knownUsage=usage&&!usageRecorded?{...usage,bridge_usage_complete:false}:usage;
            return metrics.knownUsage;
          };
          try{
            send(chunk({role:'assistant',content:''}));
            const failure=this.failures.get(failureKey);
            if(failure){metrics.localReplay=true;metrics.usageAccounting=usageAccounting([]);metrics.client_usage=null;metrics.client_cache_usage='omitted';send(failure.body);success=!!record.sessionId;return;}
            if(lease.replay){
              metrics.usageAccounting=usageAccounting([]);
              signal.throwIfAborted();this.metrics.replays++;
              for(const delta of lease.replay.deltas)send(chunk(delta));
              metrics.client_usage=null;metrics.client_cache_usage='omitted';send(chunk({},lease.replay.finish));send('[DONE]');success=true;return;
            }
            let decision,source,format,projector,gate,repairs;const rejected=new Set();
            const retryLimit=this.cfg.decisionRetries??2;
            const params=new Set((body.tools??[]).flatMap(t=>Object.keys(t.function?.parameters?.properties??{})));
            // Native text already shown by a rejected attempt; later attempts append to it.
            let carried='',unfinishedCorrected=false,warmFailed=false;
            for(let attempt=0;;attempt++){
              signal.throwIfAborted();usageRecorded=false;output=new DecisionOutput();
              attemptPriorUsage=record.lastSdkUsage;attemptResumed=!!record.sessionId;
              snapshotUsage();
              let initialized=false,chars=0,thinkingCharacters=0,textCharacters=0,toolArgumentCharacters=0,assistantThinking=0,assistantText=0,hasVisibleText=false;const attemptStart=performance.now();
              const deniedTools=new Set();let deniedToolCount=0;
              const onDenied=name=>{deniedToolCount++;if(typeof name==='string')deniedTools.add(/^[\w.:-]{1,160}$/.test(name)?name:'<invalid-tool-name>');};
              const needsTool=body.tool_choice==='required'||typeof body.tool_choice==='object';
              if(native)gate=new NativeTextGate(text=>send(chunk({content:text})),{enabled:!needsTool&&!carried&&!structuredResponse(body),params,structured:structuredResponse(body),canStreamFinal:this.cfg.canStreamFinal});
              else projector=new FinalTextProjector(text=>send(chunk({content:text})),{enabled:!needsTool&&!structuredResponse(body),canStream:this.cfg.canStreamFinal});
              const stderr=s=>{runtimeStderr=(runtimeStderr+s).slice(-3000);};
              const warm=attempt===0&&!warmFailed?await this.takeWarm(record,body,credential,native,signal):null;
              this.metrics.started++;if(attempt){this.metrics.correctionCalls++;metrics.correctionCalls=(metrics.correctionCalls??0)+1;}
              let relay=null;
              if(warm){
                q=warm.query;warm.setStderr(stderr);warm.setDenied(onDenied);metrics.warmStart=true;
                relay=()=>warm.controller.abort(controller.signal.reason);controller.signal.addEventListener('abort',relay,{once:true});if(controller.signal.aborted)relay();
                warm.push(sdkMediaPrompt(prompt,lease.messages));
              }else{
                const options=sdkOptions(this.cfg,credential,body,record.dir,controller,name=>{if(!native)this.metrics.deniedTools++;onDenied(name);},stderr,{native});
                options.persistSession=true;if(record.sessionId)options.resume=record.sessionId;
                const content=sdkMediaPrompt(prompt,lease.messages);
                q=this.run({prompt:typeof content==='string'?content:{async *[Symbol.asyncIterator](){yield userMessage(content);}},options});
              }
              const calls=[],callIds=new Set(),texts=[];let stoppedAtCall=false,stoppedEmpty=false,open=null;
              const observation=()=>({thinkingCharacters:Math.max(thinkingCharacters,assistantThinking),textCharacters:Math.max(textCharacters,assistantText),toolArgumentCharacters,stopReasons:[...output.stopReasons],deniedToolCount,deniedTools:[...deniedTools]});
              // The runtime emits an assistant message only for the first host call it stops at, so
              // every call is assembled from the stream. Parallel calls may share one block index.
              const closeCall=()=>{if(!open)return;let input;try{input=open.json.trim()?JSON.parse(open.json):{};}catch{input=undefined;}
                if(!callIds.has(open.id)){callIds.add(open.id);calls.push({id:open.id,name:open.name,input});}open=null;};
              try{
                for await(const m of abortableMessages(q,controller.signal)){
                  signal.throwIfAborted();if(m.isReplay)continue;onActivity();
                  // After a denied host call the runtime reports only its own turn limit.
                  if(native&&m.type==='assistant'&&(m.message?.content??[]).every(b=>b.type==='text')&&RUNTIME_STOP.test((m.message?.content??[]).map(b=>b.text).join('').trim()))continue;
                  output.observe(m);
                  if(m.type==='assistant'||m.type==='result'||m.event?.usage||m.event?.message?.usage)snapshotUsage();
                  if(m.type==='system'&&m.subtype==='init'){
                    if(m.model!==body.model)throw new BridgeError(502,'model_mismatch','Official WorkBuddy runtime selected a different model');
                    const servers=m.mcp_servers??[],hosted=native&&hostTools(body).length>0;
                    if(m.plugins?.length||m.skills?.length||servers.some(s=>!hosted||s.name!==HOST))throw new BridgeError(502,'isolation_failed','Official runtime loaded external tools, plugins or skills');
                    if(hosted&&servers.find(s=>s.name===HOST)?.status!=='connected')throw new BridgeError(502,'native_tools_unavailable','Official runtime did not connect the host function server; set WORKBUDDY_TOOL_MODE=json to use the text protocol');
                    if(!initialized)metrics.runtimeReadyMs??=Math.round(performance.now()-attemptStart);
                    initialized=true;if(typeof m.session_id==='string')record.sessionId=m.session_id;
                  }
                  if(m.type==='assistant'){
                    if(m.message?.model!==body.model)throw new BridgeError(502,'model_mismatch','Official WorkBuddy response used a different model');
                    for(const b of m.message.content??[]){
                      if(b.type==='thinking'&&typeof b.thinking==='string')assistantThinking+=b.thinking.length;
                      if(b.type==='text'&&typeof b.text==='string'){assistantText+=b.text.length;hasVisibleText||=!!b.text.trim();}
                      if(b.type==='text'&&typeof b.text==='string')texts.push(b.text);
                      if(b.type!=='tool_use')continue;
                      if(!native)throw new BridgeError(502,'native_tool_blocked','Runtime attempted a native tool; no host action was returned');
                      // Every name is collected here; the decision layer accepts a declared host
                      // function written without its prefix and otherwise asks for one correction.
                      const known=calls.find(c=>c.id===b.id);if(known)known.input=b.input;else{callIds.add(b.id);calls.push({id:b.id,name:b.name,input:b.input});}
                    }
                  }
                  if(m.type==='result'&&typeof m.session_id==='string')record.sessionId=m.session_id;
                  if(m.type==='stream_event'){
                    const event=m.event;
                    if(event?.type==='content_block_start'&&event.content_block?.type==='tool_use'){
                      if(!native)throw new BridgeError(502,'native_tool_blocked','Runtime attempted a native tool');
                      closeCall();open={id:event.content_block.id,name:String(event.content_block.name??''),json:''};
                    }else if(open&&event?.delta?.type==='input_json_delta'){
                      const partial=event.delta.partial_json??'';open.json+=partial;toolArgumentCharacters+=partial.length;metrics.toolArgumentCharacters=toolArgumentCharacters;}
                    else if(open&&['content_block_stop','message_delta','message_stop'].includes(event?.type))closeCall();
                    if(!initialized)throw new BridgeError(502,'sdk_incomplete','SDK streamed output before verifying runtime initialization');
                    if(event?.message?.model&&event.message.model!==body.model)throw new BridgeError(502,'model_mismatch','SDK streamed a different model');
                    const delta=event?.delta;
                    const visible=delta?.type==='text_delta'?delta.text:event?.type==='content_block_start'&&event.content_block?.type==='text'?event.content_block.text:null;
                    if(delta?.type==='thinking_delta'){
                      const now=performance.now()-start;metrics.firstModelEventMs??=now;metrics.firstThinkingMs??=now;
                      thinkingCharacters+=delta.thinking.length;chars+=delta.thinking.length;send(chunk({reasoning_content:delta.thinking}));
                    }
                    if(visible){const now=performance.now()-start;metrics.firstModelEventMs??=now;metrics.firstTextMs??=now;textCharacters+=visible.length;hasVisibleText||=!!visible.trim();chars+=visible.length;if(native)gate.push(visible);else projector.push(visible);}
                    if(chars>16*1024*1024)throw new BridgeError(502,'response_too_large','Official SDK response exceeds limit');
                  }
                }
              }catch(error){
                // A prestarted runtime that failed before initializing is replaced once, cold.
                if(warm&&!initialized&&!signal.aborted&&!(error instanceof BridgeError)&&!/^\s*(?:HTTP\s*)?429\b/.test(String(error?.message??''))){(warm.blank?this.blank:this.warm).fail(warm);warmFailed=true;metrics.warmStart=false;metrics.warmFailed=true;attempt--;continue;}
                // A native host call ends with the runtime's own stop after its denial; the call is complete.
                closeCall();
                if(native&&expectedCallStop(error))metrics.nativeStop=observation();
                if(error instanceof BridgeError||signal.aborted||!native||!expectedCallStop(error))throw error;
                if(calls.length)stoppedAtCall=true;
                else if(!hasVisibleText&&!String(output.result?.result??'').trim())stoppedEmpty=true;
                else throw error;
              }finally{if(relay)controller.signal.removeEventListener('abort',relay);}
              closeCall();
              const result=output.result;
              usages.push(normalizedUsage({usage:output.usage(attemptPriorUsage,{resumed:attemptResumed})}));usageRecorded=true;
              const nativeWindow=body.bridge_native_context_window,latestUsage=usages.at(-1);
              record.contextUsageRatio=Number.isFinite(nativeWindow)&&nativeWindow>0&&latestUsage?.prompt_tokens>0?latestUsage.total_tokens/nativeWindow:null;
              snapshotUsage();
              if(result?.usage)record.lastSdkUsage=result.usage;
              else if(stoppedAtCall||stoppedEmpty)record.lastSdkUsage=addSdkUsage(attemptResumed?record.lastSdkUsage:{input_tokens:0,output_tokens:0,cache_read_input_tokens:0,cache_creation_input_tokens:0},output.usage(attemptPriorUsage,{resumed:attemptResumed}));
              metrics.attempts.push({attempt:attempt+1,wallMs:performance.now()-attemptStart,usage:usages.at(-1),usageBasis:output.usageBasis,promptCharacters:prompt.length,...(native?{observation:observation()}:{}),...(warm?{warm:true}:{})});
              const successfulResult=result?.subtype==='success'&&!result.is_error;
              const expectedNativeStop=native&&calls.length&&stoppedAtCall&&!result;
              const expectedEmptyStop=native&&stoppedEmpty&&!result;
              if(!initialized||!(successfulResult||expectedNativeStop||expectedEmptyStop)){
                const message=(result?.errors??[]).join('\n');
                if(/11128|unapproved channel|conversation id missing/i.test(message))throw new BridgeError(400,'workbuddy_11128',message);
                if(/401|authentication|12153/i.test(message))throw new BridgeError(401,'workbuddy_auth_rejected',message);
                throw new BridgeError(502,'sdk_incomplete',message||'Official WorkBuddy runtime did not return a successful terminal result');
              }
              if(result?.modelUsage&&Object.keys(result.modelUsage).some(model=>model!==body.model))throw new BridgeError(502,'model_mismatch','SDK usage reported another model');
              const text=native?gate.text||texts.join('')||String(result?.result??''):'';
              try{
                if(native){
                  if(output.stopReasons.has('model_context_window_exceeded'))throw new BridgeError(502,'output_budget','The model context window is exhausted');
                  if(stoppedEmpty){
                    if(output.isTruncated())throw new BridgeError(502,'output_budget','WorkBuddy exhausted its output budget before giving a host call or answer');
                    throw new BridgeError(502,'missing_native_output','模型这一步没有给出工具调用或答复。');
                  }
                  decision=nativeDecision({calls,text,truncated:output.isTruncated()},body,validators,{allowUnfinished:!!this.cfg.guardDecision||unfinishedCorrected});
                  repairs=decision.repairs;source='native';format=decision.textCalls?'native-text':'native';
                }else{({decision,source,format,repairs}=output.decision(body,validators));}
                try{if(decision.finishReason!=='length')this.cfg.guardDecision?.(decision,body);}catch(error){if(error.code==='unfinished_turn')throw new BridgeError(502,'unfinished_turn','模型只宣布了下一步行动，没有请求所需工具；未将本轮标为完成。');throw error;}
                if(!native)projector.finish(decision);
                metrics.attempts.at(-1).repairs=repairs;break;
              }
              catch(error){
                const fingerprint=native?digest({calls:calls.map(c=>[c.name,c.input]),text}):digest(output.candidates().map(c=>c.text));
                const lastAttempt=metrics.attempts.at(-1),calledTool=error.decisionIssue?(error.decisionIssue.tool??error.decisionIssue.undeclaredTool):undefined,
                  evidenceIssue=error.decisionIssue?{tool:safeToolName(calledTool),issues:decisionIssueSummary(error.decisionIssue.issues)}:undefined;
                lastAttempt.errorCode=error.code;
                lastAttempt.rejection={code:error.code,output:output.summary(),...(native?{nativeCalls:calls.length,textCharacters:text.length}:{}),
                  ...(evidenceIssue?{tool:evidenceIssue.tool,validationKeywords:error.decisionIssue.issues.map(i=>i.keyword)}:{})};
                lastAttempt.rejection.evidenceFile=await rejectedEvidence(this.cfg,{requestId:context.requestId??id,model:body.model,attempt:attempt+1,errorCode:error.code,output,credential,issue:evidenceIssue});
                signal.throwIfAborted();
                const shown=native?gate.emitted>0:!!projector.emitted;
                const limit=error.code==='missing_native_output'?Math.min(1,retryLimit):retryLimit;
                const retry=!(!native&&shown)&&!!record.sessionId&&attempt<limit&&!rejected.has(fingerprint)&&RETRYABLE.includes(error.code)&&(native||error.code!=='native_tool_blocked');
                // An announcement is still an answer: deliver it rather than fail when no retry remains.
                if(error.code==='unfinished_turn'&&!retry&&!this.cfg.guardDecision){decision={action:'final',content:text,repairs:[]};repairs=[];source='native';format='native';break;}
                if(!retry)throw error;
                rejected.add(fingerprint);if(error.code==='unfinished_turn')unfinishedCorrected=true;
                if(native&&shown)carried+=(carried?'\n\n':'')+gate.emittedText;
                const correction=native?nativeCorrection(body,error):correctionInput(body,error);
                send(chunk({bridge_event:{name:'llm/retry-started',data:{retry:attempt+1,maxRetries:limit,reason:error.code}}}));
                metrics.attempts.at(-1).correction={promptCharacters:correction.prompt.length,schemaCharacters:correction.schemaCharacters,tools:correction.toolNames};
                prompt=correction.prompt;
                // Retries stay in the same native transcript, model, deadline and budget.
              }
            }
            Object.assign(metrics.native,{calls:decision.calls?.length??0,host_calls:decision.calls?.length??0,invalid_calls:metrics.attempts.filter(a=>a.errorCode).length,warm_start:metrics.warmStart,handoff_stop:native&&decision.action==='tool_calls'});
            const baseUsage=requestUsage(usages);
            const usage=baseUsage?{...baseUsage,bridge_decision_source:source,bridge_decision_format:format}:null;
            if(format==='dsml'||format==='native-text')this.metrics.decodedDsml++;
            if(repairs.length){this.metrics.localDecisionRepairs+=repairs.length;metrics.localDecisionRepairs=repairs;}
            const deltas=[];const message={role:'assistant',content:decision.content??null};
            if(native){
              // Whatever the host already displays stays the prefix of the recorded message.
              const shown=carried||gate.emittedText;let content=decision.content??'';
              if(carried)content=content?carried+'\n\n'+content:carried;
              else if(!content.startsWith(shown))content=shown+(content?'\n\n'+content:'');
              const tail=content.slice(shown.length);if(tail)send(chunk({content:tail}));
              if(content)deltas.push({content});message.content=content||null;
            }else if(decision.action==='final')deltas.push({content:decision.content});
            else if(decision.content){send(chunk({content:decision.content}));deltas.push({content:decision.content});}
            let echo=native&&!decision.textCalls?'native':true;
            if(decision.action==='tool_calls'){
              const used=new Set();
              // Echo the exact dispatched batch next turn, including any host-assigned replacement IDs.
              const calls=decision.calls.map(call=>{
                let callId=native&&!decision.textCalls&&typeof call.id==='string'&&/^[A-Za-z0-9_.:-]{1,128}$/.test(call.id)&&!used.has(call.id)?call.id:null;
                if(!callId)callId=`call_${randomUUID().replaceAll('-','')}`;
                used.add(callId);return {id:callId,type:'function',function:{name:call.name,arguments:JSON.stringify(call.arguments)}};
              });
              message.tool_calls=calls;
              calls.forEach((call,index)=>{
                const args=call.function.arguments;
                if(args.length<=32768){const delta={tool_calls:[{index,...call}]};send(chunk(delta));deltas.push(delta);return;}
                const first={tool_calls:[{index,id:call.id,type:'function',function:{name:call.function.name,arguments:''}}]};send(chunk(first));deltas.push(first);
                for(let at=0;at<args.length;){let end=Math.min(args.length,at+32768);if(end<args.length&&/[\uD800-\uDBFF]/.test(args[end-1]))end--;
                  const delta={tool_calls:[{index,function:{arguments:args.slice(at,end)}}]};send(chunk(delta));deltas.push(delta);at=end;}
              });
              if(native)this.metrics.hostCalls+=calls.length;
            }
            const finish=decision.finishReason??(decision.action==='final'?'stop':'tool_calls');
            lease.commit({id,created,deltas,finish},message,{echo});
            if(metrics.attempts.length>1)this.metrics.recoveredRequests++;
            metrics.client_usage=usage;metrics.client_cache_usage=usage?.prompt_tokens_details?'reported':'omitted';metrics.lastPromptTokens=usages.at(-1)?.prompt_tokens??null;
            metrics.outputTokensPerSecond=usage&&metrics.firstModelEventMs!==null?usage.completion_tokens/Math.max(.001,(performance.now()-start-metrics.firstModelEventMs)/1000):null;
            const terminal=chunk({},finish,usage);terminal.bridge_usage={accounting:metrics.usageAccounting,correction_calls:metrics.correctionCalls??0};
            send(terminal);send('[DONE]');success=true;prewarmNext=native&&finish==='tool_calls';
            this.metrics.completed++;this.metrics.lastFailure=null;
          }catch(error){
            const rawMessage=String(error?.message??'');
            if(!(error instanceof BridgeError)&&/11128|unapproved channel|conversation id missing/i.test(rawMessage))error=new BridgeError(400,'workbuddy_11128','Official WorkBuddy runtime was rejected by channel validation (11128); no blind retry was performed');
            const redact=s=>redactSecrets(s,credential);
            const diagnostic=redact(rawMessage).split('\n')[0];
            const safe=publicError(signal.aborted?signal.reason:error,signal.aborted?{}:{diagnostic});
            const failureIssue=error?.decisionIssue?{tool:safeToolName(error.decisionIssue.tool??error.decisionIssue.undeclaredTool),issues:decisionIssueSummary(error.decisionIssue.issues)}:undefined;
            const evidenceFile=[...RETRYABLE,'output_budget'].includes(safe.body.error.code)?await decisionErrorEvidence(this.cfg,{requestId:context.requestId??id,model:body.model,errorCode:safe.body.error.code,output,credential,issue:failureIssue}):null;
            this.metrics.lastFailure={at:new Date().toISOString(),code:safe.body.error.code,diagnostic,stderr:redact(runtimeStderr).slice(-800),output:output.summary(),evidenceFile};
            if(RETRYABLE.includes(safe.body.error.code)){
              if(this.failures.size>=32)this.failures.delete(this.failures.keys().next().value);
              this.failures.set(failureKey,{at:Date.now(),body:safe.body});
            }
            if(!usageRecorded){usages.push(normalizedUsage({usage:output.usage(attemptPriorUsage,{resumed:attemptResumed})}));metrics.attempts.push({attempt:usages.length,usage:usages.at(-1),usageBasis:output.usageBasis,errorCode:safe.body.error.code});}
            const usage=requestUsage(usages);
            metrics.knownUsage=usage;
            metrics.usageAccounting=usageAccounting(usages);
            send({id,created,model:body.model,object:'chat.completion.chunk',choices:[],usage,bridge_usage:{accounting:metrics.usageAccounting,correction_calls:metrics.correctionCalls??0}});
            send(safe.body);
          }finally{
            controller.abort();signal.removeEventListener('abort',abort);
            if(!success&&signal.aborted){record.cancelled=true;record.sessionId=null;}else if(!success||!record.sessionId)await lease.discard();lease.release();
            if(!closed){closed=true;sink.close();}
            if(prewarmNext)this.prewarm(record,body,credential,native);
            if(success)void this.prewarmBlank(body,credential,native).catch(()=>{});
          }
        })();
      },
      cancel:()=>{closed=true;controller.abort();q?.cleanup?.();q?.close?.();}
    });
    const response=new Response(stream,{headers:{'content-type':'text/event-stream'}});response.bridgeMetrics=metrics;return response;
  }
}

/** An SDK iterator that ignores an abort must still release its context lease. */
async function* abortableMessages(query,signal){
  const iterator=query[Symbol.asyncIterator]();
  try{for(;;){const next=await abortable(iterator.next(),signal);if(next.done)return;yield next.value;}}
  finally{if(signal.aborted){query.cleanup?.();query.close?.();void Promise.resolve(iterator.return?.()).catch(()=>{});}}
}
