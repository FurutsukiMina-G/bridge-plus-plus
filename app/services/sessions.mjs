import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {variantFor,validateSelection} from '../core/catalog.mjs';
import {CancelledError} from '../core/lifecycle.mjs';
import {DshHost} from './dsh-host.mjs';
import {DshAdapter} from '../runtimes/dsh.mjs';
import {KimiAcpAdapter} from '../runtimes/kimi-acp.mjs';
import {CodexAdapter} from '../runtimes/codex.mjs';
import {AntigravityAdapter} from '../runtimes/antigravity.mjs';
import {ClaudeAdapter} from '../runtimes/claude.mjs';
import {taskIntent,planEntries,unfinishedTask,taskContinuationPrompt,TASK_CONTINUATION_LIMIT} from './turn-completion.mjs';
import {processIdentity,sameProcess} from './process-identity.mjs';
import {validatePermissionMode,migratePermissionMode,sessionPermissionView} from './runtime-permissions.mjs';
import {redactMedia,MediaClaimError} from './media.mjs';
import {assertRuntimeReady} from './runtime-availability.mjs';
import {failureText,failureValue,runtimeReason} from './failure-details.mjs';
import {interjectCapability,queuedBatch} from './session-input.mjs';

const defaults={dsh:DshAdapter,kimi:KimiAcpAdapter,codex:CodexAdapter,claude:ClaudeAdapter,antigravity:AntigravityAdapter};
export class Sessions {
  constructor(store,providers,gateway,runtimes,{constructors=defaults,identifyProcess=processIdentity,media,capabilities,runtimeReady,now=Date.now,adapterIdleMs=600000,adapterMaxIdle=4,adapterSweepMs=60000}={}){
    this.media=media;this.capabilities=capabilities;this.runtimeReady=runtimeReady;this.now=now;this.adapterIdleMs=adapterIdleMs;this.adapterMaxIdle=adapterMaxIdle;
    this.inputLocks=new Map();this.sendingQueue=new Set();this.draining=new Set();
    Object.assign(this,{store,providers,gateway,runtimes,constructors,identifyProcess});this.adapters=new Map();this.adapterUsed=new Map();this.runs=new Map();this.rebinding=new Set();this.permissionChanging=new Set();this.external=new Map();this.closed=false;this.adapterTimer=setInterval(()=>{void this.recycleAdapters().catch(()=>{});},adapterSweepMs);this.adapterTimer.unref();
    for(const session of store.state?.sessions??[])if(Number.isSafeInteger(session.nativeClientPid)&&session.nativeClientPid>0){try{process.kill(session.nativeClientPid,0);this.external.set(session.id,{restoredPid:session.nativeClientPid});}catch(error){if(error.code!=='ESRCH')this.external.set(session.id,{restoredPid:session.nativeClientPid});}}
    if(gateway){gateway.requestContext=id=>this.runs.get(id)?.id;gateway.onUsage=(id,event,turnId)=>{const run=this.runs.get(id);if(!run||run.id!==turnId)return Promise.resolve();return this.receive(this.store.session(id),run.adapter,event);};gateway.onSuccess=(id,turnId)=>gateway.onUsage(id,{type:'native-event',source:'gateway',name:'gateway/request-completed'},turnId);}
  }
  touchAdapter(id){if(this.adapters.has(id))this.adapterUsed.set(id,this.now());}
  async recycleAdapters(){if(this.closed)return;const candidates=[];for(const [id,adapter]of this.adapters){const session=this.store.session(id),run=this.runs.get(id);if(session.runtimeId==='dsh'||session.runtimeId==='codex'&&session.selection.modelKey==='native'||run||this.external.has(id)||run?.approvals.size||adapter.requests?.size)continue;candidates.push({id,adapter,used:this.adapterUsed.get(id)??0});}candidates.sort((a,b)=>a.used-b.used);const remove=new Set(candidates.filter(row=>this.now()-row.used>this.adapterIdleMs).map(row=>row.id));for(const row of candidates){if(candidates.length-remove.size<=this.adapterMaxIdle)break;remove.add(row.id);}for(const row of candidates)if(remove.has(row.id)&&this.adapters.get(row.id)===row.adapter){this.adapters.delete(row.id);this.adapterUsed.delete(row.id);await row.adapter.close().catch(()=>{});}}
  ensureReady(runtimeId){return assertRuntimeReady(this.runtimes.find(r=>r.id===runtimeId),this.runtimeReady?.(runtimeId));}
  validate(runtimeId,selection){
    if(!selection||typeof selection.modelKey!=='string')throw new Error('请选择模型');
    if(runtimeId==='claude'&&selection.modelKey==='native')throw new Error('Claude Code 在 Bridge++ 里只使用 Qoder CN / WorkBuddy 模型，不使用 Claude 模型');
    if(selection.modelKey==='native')return {...selection};
    const model=this.providers.get(selection.modelKey);
    if(runtimeId==='claude'&&!['qoder','workbuddy'].includes(model.source))throw new Error('Claude Code 在 Bridge++ 里只使用 Qoder CN / WorkBuddy 模型，不使用 Claude 模型');
    if(model.boundRuntime&&runtimeId!==model.boundRuntime)throw new Error('Antigravity 来源的 Gemini 仅由 Antigravity 执行，请选择 Antigravity 后端');
    if(runtimeId==='antigravity'&&model.source!=='antigravity')throw new Error('Antigravity 使用其独立 Gemini 模型源，请选择该来源或原生模型');
    const selected=validateSelection(model,selection);
    if(model.tools===false)throw new Error('此模型源明确不支持工具调用，无法用于 agent 会话');
    return model.source==='antigravity'?{...selected,nativeModel:model.id,modelSource:'antigravity'}:selected;
  }
  async create({projectId,runtimeId,selection,title}){
    if(this.closed)throw new Error('工作区正在关闭');this.store.project(projectId);
    const runtime=this.runtimes.find(r=>r.id===runtimeId);if(!runtime)throw new Error('请选择开发工具环境');
    this.ensureReady(runtimeId);
    selection=this.validate(runtimeId,selection);
    const preference=this.store.state.preferences.runtimes[runtimeId]??{};
    const saved=runtimeId==='codex'&&selection.modelKey==='native'&&Object.hasOwn(preference,'nativePermissionMode')?preference.nativePermissionMode:preference.permissionMode;
    const resolved=migratePermissionMode(runtime,selection,saved??runtime.permissions?.default??null);
    const permissionMode=validatePermissionMode(runtime,resolved.mode,selection);
    const session={id:randomUUID(),projectId,runtimeId,selection,permissionMode,title:typeof title==='string'&&title.trim()?title.trim().slice(0,100):'新会话',status:'idle',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),nativeId:null};
    if(resolved.migration)session.permissionMigration=resolved.migration;
    await this.store.mutate(s=>{s.sessions.unshift(session);});return session;
  }
  async adapter(session,run){
    this.ensureReady(session.runtimeId);
    session.selection=this.validate(session.runtimeId,session.selection);
    if(run?.cancelled||this.closed)throw new CancelledError();
    const cached=this.adapters.get(session.id);if(cached&&!cached.closed&&!cached.rpc?.closedError){this.touchAdapter(session.id);return cached;}
    if(cached){this.adapters.delete(session.id);await cached.close().catch(()=>{});}
    const runtime=this.runtimes.find(r=>r.id===session.runtimeId);if(!runtime?.installed)throw new Error('Native runtime is unavailable');
    const project=this.store.project(session.projectId),dir=join(this.store.root,'sessions',session.id);await mkdir(dir,{recursive:true});
    let model,variant,endpoint;
    if(session.selection.modelKey!=='native'){
      model=this.providers.get(session.selection.modelKey);
      if(model.source!=='antigravity'){variant=variantFor(model,session.selection);endpoint=await this.gateway.register(model,variant,session.selection,session.runtimeId,session.id);}
    }
    if(run?.cancelled||this.closed)throw new CancelledError();
    let adapter;
    const emit=event=>this.receive(session,adapter,event);
    const saveNative=async nativeId=>{await this.store.mutate(()=>{session.nativeId=nativeId;});};
    const resolved=migratePermissionMode(runtime,session.selection,session.permissionMode),permissionMode=validatePermissionMode(runtime,resolved.mode,session.selection);
    if(resolved.migration){await this.store.mutate(()=>{session.permissionMode=permissionMode;session.permissionMigration=resolved.migration;});await this.store.event(session.id,{type:'notice',source:'permissions',text:resolved.migration.reason});}
    const options={runtime,project,session,dir,mediaDir:join(this.store.root,'media/sessions',session.id),model,variant,endpoint,selection:session.selection,permissionMode,emit,saveNative};
    if(session.runtimeId==='claude')options.configDir=join(this.store.root,'engines/claude-code/config');
    if(session.runtimeId==='dsh'){
      if(!model)throw new Error('DSH 统一会话需选择 Qoder CN 或 WorkBuddy 模型；原生模型可在完整界面使用。');
      this.dsh??=new DshHost(this.store,runtime,{gateway:this.gateway});options.host=this.dsh;
    }
    adapter=new this.constructors[session.runtimeId](options);this.adapters.set(session.id,adapter);this.touchAdapter(session.id);return adapter;
  }
  receive(session,adapter,event){
    if(event.type==='usage'&&adapter?.endpoint&&event.source!=='gateway')return Promise.resolve();
    const run=this.runs.get(session.id);
    if(!run||run.terminal||run.adapter!==adapter||this.adapters.get(session.id)!==adapter)return Promise.resolve();
    const task=run.events.then(async()=>{
      if(run.terminal||run.cancelled)return;
      if(run.fromQueue&&!run.queueDispatched&&['thinking','text','tool-start','usage','plan','approval','question','turn-end'].includes(event.type)){
        run.queueDispatched=true;await this.store.mutate(()=>{session.queue=(session.queue??[]).filter(row=>!run.fromQueue.includes(row.id));delete session.queueDispatch;});
      }
      if(event.type==='steer-consumed'){
        await this.store.mutate(()=>{session.pendingSteers=(session.pendingSteers??[]).filter(row=>row.id!==event.steerId);});return;
      }
      if(event.type==='steer-state'){
        const row=session.pendingSteers?.find(row=>row.id===event.steerId);
        if(row&&event.state==='failed')await this.returnSteer(session,row,event.reason);
        else if(row)await this.store.mutate(()=>{row.state=event.state;});
      }
      if(event.type==='media-output'){
        if(!this.media)return;
        try{const attachment=await this.media.importOutput(session,event);await this.store.mutate(()=>{session.mediaAttachments??=[];session.mediaAttachments.push(attachment);});await this.store.event(session.id,{...attachment,type:'media',turnId:run.id});run.hasMedia=true;}
        catch(error){await this.store.event(session.id,{type:'notice',turnId:run.id,text:'输出媒体未保存：'+error.message});}
        return;
      }
      event=redactMedia(event);
      if(event.type==='usage')run.stats.requests++;
      if(event.type==='upstream-error')run.stats.failedRequests++;
      if(event.name==='llm/retry-started')run.stats.corrections++;
      if(event.type==='error'||event.type==='turn-end'&&event.status!=='completed')event=failureValue(event,[adapter?.endpoint?.key]);
      if(event.type==='upstream-error')run.upstreamFailure={kind:'upstream',code:event.code,message:failureText(event.message),...(event.resetAt?{resetAt:event.resetAt}:{}),source:event.provider==='workbuddy'?'WorkBuddy':'Qoder'};
      if(event.source==='gateway'&&event.name==='gateway/request-completed')run.upstreamFailure=null;
      if(event.type==='error'){event={...event,text:failureText(event.text)};if(event.data?.willRetry!==true)run.runtimeFailure=runtimeReason(event.text);}
      if(event.type==='turn-end'){
        if(event.nativeTurn!==undefined){if(run.endedNativeTurns.has(event.nativeTurn))return;run.endedNativeTurns.add(event.nativeTurn);}
        await this.endNative(session,run,event);return;
      }
      if(event.type==='tool-start')run.tailText='';
      if(event.type==='text')run.tailText=(run.tailText+(event.text??'')).slice(-50000);
      if(event.type==='content-replace'&&event.channel==='text')run.tailText=String(event.text??'').slice(-50000);
      if(event.type==='plan')run.plan=planEntries(event.data);
      if(event.source==='gateway'&&event.name==='gateway/output-limit'){
        run.outputLimited=true;
        await this.store.event(session.id,{type:'notice',source:'output-limit',turnId:run.id,text:'模型到达单次输出上限，已保留生成内容；本轮不标记完成，也不自动重试，可手动继续。'});
      }
      if(run.outputLimited&&session.runtimeId==='codex'&&event.type==='error'&&/^Incomplete response returned, reason: max_output_tokens[.\s]*$/.test(event.text??''))event={...event,type:'notice',source:'output-limit'};
      if(event.type==='error'&&event.data?.willRetry!==true)run.hasError=true;
      if(event.type==='approval'||event.type==='question'){
        run.approvals.add(event.approvalId);await this.store.mutate(()=>{session.status='waiting';});
      }else if(event.type==='approval-resolved'&&event.approvalId){
        run.approvals.delete(event.approvalId);await this.store.mutate(()=>{session.status=run.approvals.size?'waiting':'running';});
      }
      await this.store.event(session.id,{...event,turnId:run.id});
      if(event.type==='error'&&event.source==='gateway'&&event.fatal===true)await this.finish(session,run,'failed');
    });
    run.events=task.catch(()=>{});return task;
  }
  async endNative(session,run,event){
    const limited=run.outputLimited&&!run.hasError&&['completed','failed'].includes(event.status);
    const status=limited?'interrupted':event.status??'failed';
    if(limited)event={...event,retainAdapter:true};
    if(status==='completed'&&event.nativeCarry?.length){
      run.tailText='';run.plan=[];
      await this.store.event(session.id,{type:'notice',source:'queue',turnId:run.id,text:'DSH 已接管尚未使用的插话，将在原生下一轮继续；仍归入当前任务，Bridge++ 不会重复发送。'});return;
    }
    // Every native runtime must deliver a result. Only bridged runtimes may use
    // semantic continuation; a denied native operation must never be retried.
    if(status==='completed'){
      if(run.upstreamFailure){await this.store.event(session.id,{type:'error',source:'task-completion',code:'unfinished_task',turnId:run.id,text:run.upstreamFailure.message});await this.finish(session,run,'failed',event);return;}
      if(run.hasError){await this.finish(session,run,'failed',event);return;}
      const issue=unfinishedTask({intent:run.intent,text:run.tailText|| (run.hasMedia?'Generated media artifact returned.':''),plan:run.plan});
      if(issue){
        if(session.queue?.length){
          await this.finish(session,run,'paused',{...event,reason:{kind:'unfinished',code:'unfinished_task',message:'模型停下了，还有未完成的工作；先发送用户排队的消息。',pending:issue.pending}});return;
        }
        if(issue.canContinue&&run.adapter.endpoint&&session.runtimeId!=='antigravity'&&run.continuations<TASK_CONTINUATION_LIMIT&&!run.approvals.size){
          const attempt=++run.continuations;run.tailText='';
          await this.store.event(session.id,{type:'notice',source:'task-completion',turnId:run.id,text:`原生回复仍是阶段性进展${issue.pending?`，还有 ${issue.pending} 项计划未完成`:''}，继续原任务（${attempt}/${TASK_CONTINUATION_LIMIT}）。`,data:{reason:issue.reason,attempt,limit:TASK_CONTINUATION_LIMIT}});
          await this.store.mutate(()=>{session.status='running';});
          // Do not await a new native prompt from inside its old event callback.
          // Each adapter retains its native session, selected model and approvals.
          run.continuing=Promise.resolve().then(async()=>{
            if(run.terminal||run.cancelled||this.closed||this.runs.get(session.id)!==run)return;
            await run.adapter.prompt(taskContinuationPrompt(attempt,issue));
          }).catch(async error=>{
            if(run.terminal||run.cancelled)return;
            await this.receive(session,run.adapter,{type:'error',source:'task-completion',text:'续作原生任务失败：'+error.message});
            await this.receive(session,run.adapter,{type:'turn-end',status:'failed'});
          });
          return;
        }
        if(issue.canContinue){
          await this.finish(session,run,'paused',{...event,reason:{kind:'unfinished',code:'unfinished_task',message:'模型停下了，还有未完成的工作。发送“继续”可以接着做。',pending:issue.pending}});return;
        }
        await this.store.event(session.id,{type:'error',source:'task-completion',code:'unfinished_task',turnId:run.id,text:issue.reason==='missing_result'?'原生后端结束时没有返回任务结果，本轮未完成。':'原生后端仍有未完成工作，有界续作已停止；本轮未标记为完成。'});
        await this.finish(session,run,'failed',{...event,reason:{kind:'unfinished',code:'unfinished_task',message:issue.reason==='missing_result'?'原生后端结束时没有返回任务结果，本轮未完成。':'原生后端仍有未完成工作，有界续作已停止。'}});return;
      }
    }
    await this.finish(session,run,status,event);
  }
  finish(session,run,status,event={}){
    if(run.finishing)return run.finishing;run.terminal=true;
    run.finishing=(async()=>{
    try{
    if(!['completed','paused'].includes(status)&&run.adapter?.retractSteers){
      const removed=await run.adapter.retractSteers().catch(()=>[]);
      for(const id of removed){const row=session.pendingSteers?.find(row=>row.id===id);if(row){await this.returnSteer(session,row);await this.store.event(session.id,{type:'steer-state',steerId:id,state:'failed',reason:'本轮未完成，插话已撤回到 Bridge++ 队列。',turnId:run.id});}}
    }
    let reason;
    if(status!=='completed'){
      reason=run.cancelled?{kind:'cancelled',message:'用户已停止本轮任务。'}:run.upstreamFailure??event.reason??run.runtimeFailure??(run.outputLimited?{kind:'unfinished',code:'output_limit',message:'模型到达单次输出上限，本轮未完成。'}:runtimeReason(null));
      reason={...reason,kind:['upstream','cancelled','runtime','unfinished'].includes(reason?.kind)?reason.kind:'runtime',message:failureText(reason.message??reason)||'原生后端未完成本轮任务，未提供具体原因。',...(reason.code?{code:failureText(reason.code,100)}:{})};
    }
    for(const approvalId of run.approvals)await this.store.event(session.id,{type:'approval-resolved',approvalId,choice:'expired',turnId:run.id});run.approvals.clear();
    await this.store.event(session.id,{...event,type:'turn-end',status,...reason?{reason}:{},turnId:run.id,stats:{...run.stats,continuations:run.continuations}});
    await this.store.mutate(()=>{session.status=status;session.updatedAt=new Date().toISOString();if(reason&&status!=='paused')session.lastFailure={kind:reason.kind,...reason.code?{code:reason.code}:{},message:reason.message,...reason.resetAt?{resetAt:reason.resetAt}:{},...reason.source?{source:reason.source}:{},at:session.updatedAt};else delete session.lastFailure;});
    }catch(error){
      status='failed';session.status=status;
      this.store.emit('event',{type:'error',sessionId:session.id,turnId:run.id,id:randomUUID(),at:new Date().toISOString(),text:'会话记录无法保存：'+error.message});throw error;
    }finally{
    if(this.runs.get(session.id)===run)this.runs.delete(session.id);
    if(['completed','paused'].includes(status))this.touchAdapter(session.id);if(!['completed','paused'].includes(status)&&!(status==='interrupted'&&event.retainAdapter===true)&&this.adapters.get(session.id)===run.adapter){this.adapters.delete(session.id);this.adapterUsed.delete(session.id);void run.adapter?.close().catch(()=>{});}
    // A queued selection is applied before any queued message starts the next turn.
    if(session.selectionNext){
      const queued={...session.selectionNext};delete queued.requestedAt;await this.store.mutate(()=>{delete session.selectionNext;});
      try{await this.applyRebind(session,this.validate(session.runtimeId,queued));await this.store.event(session.id,{type:'notice',source:'session',text:'已应用排队的新参数。'});}
      catch(error){await this.store.event(session.id,{type:'notice',source:'session',text:'排队的新参数没有应用：'+failureText(error)});}
    }
    if(session.queue?.length){
      if(['completed','paused'].includes(status)&&!this.closed)this.scheduleQueue(session.id);
      else await this.store.event(session.id,{type:'notice',source:'queue',text:`本轮未完成，排队的 ${session.queue.length} 条消息没有发送。`});
    }
    }
    })();return run.finishing;
  }
  inputLock(id,task){const next=(this.inputLocks.get(id)??Promise.resolve()).catch(()=>{}).then(task);this.inputLocks.set(id,next);void next.finally(()=>{if(this.inputLocks.get(id)===next)this.inputLocks.delete(id);}).catch(()=>{});return next;}
  async queueInput(session,text,attachmentIds,{note,attachments}={}){
    if(!attachments&&attachmentIds.length){if(!this.media||!this.capabilities)throw new Error('媒体服务不可用');attachments=this.media.validateClaim(session,attachmentIds,await this.capabilities(session.runtimeId,session.selection)).map(a=>this.media.public(a));}
    const row={id:randomUUID(),text,attachments:attachments??[],at:new Date().toISOString()};
    await this.store.mutate(()=>{session.queue??=[];session.queue.push(row);});
    if(!this.runs.has(session.id)&&['completed','paused'].includes(session.status))this.scheduleQueue(session.id);
    return {delivery:'queue',id:row.id,...note?{note}:{}};
  }
  async dequeue(id,queueId){return this.inputLock(id,async()=>{
    const session=this.store.session(id),row=session.queue?.find(row=>row.id===queueId);
    if(!row)throw new Error('排队消息不存在或已经发送');if(this.sendingQueue.has(queueId))throw new Error('此消息正在发送，无法取回');
    if(session.queueDispatch?.ids?.includes(queueId))throw new Error('上次发送的原生接收状态尚未确认，消息已保留；请先核对原生会话，不能重复发送。');
    await this.store.mutate(()=>{session.queue=session.queue.filter(row=>row.id!==queueId);});return {text:row.text,attachments:row.attachments};
  });}
  scheduleQueue(id){
    if(this.draining.has(id))return;this.draining.add(id);
    void Promise.resolve().then(()=>this.inputLocks.get(id)).then(async()=>{
      const session=this.store.session(id);if(this.closed||this.runs.has(id)||session.queueDispatch||!['completed','paused'].includes(session.status)||!session.queue?.length)return;
      const capabilities=await this.capabilities?.(session.runtimeId,session.selection),rows=queuedBatch(session,capabilities);
      // Reserve before the first asynchronous dispatch so dequeue cannot race a claim.
      for(const row of rows)this.sendingQueue.add(row.id);
      try{await this.prompt(id,rows.map(row=>row.text).join('\n\n'),rows.flatMap(row=>row.attachments.map(a=>a.id)),{fromQueue:rows.map(row=>row.id)});}
      catch(error){if(!this.runs.has(id))await this.store.mutate(()=>{session.status='failed';});await this.store.event(id,{type:'notice',source:'queue',text:'排队消息发送失败，已保留尚未送出的消息：'+failureText(error)});}
      finally{for(const row of rows)this.sendingQueue.delete(row.id);}
    }).catch(error=>{this.store.emit('event',{type:'notice',source:'queue',sessionId:id,text:'排队消息未发送：'+failureText(error)});}).finally(()=>{this.draining.delete(id);const s=this.store.session(id);if(!this.runs.has(id)&&!s.queueDispatch&&s.queue?.length&&['completed','paused'].includes(s.status)&&!this.closed)this.scheduleQueue(id);});
  }
  async returnSteer(session,row,reason){
    const attachments=(row.attachments??[]).map(a=>this.media?.entries.get(a.id)).filter(Boolean);
    if(attachments.length)await this.media.restage(attachments);
    await this.store.mutate(()=>{session.pendingSteers=(session.pendingSteers??[]).filter(r=>r.id!==row.id);session.mediaAttachments=(session.mediaAttachments??[]).filter(a=>!attachments.some(e=>e.id===a.id));session.queue??=[];if(!session.queue.some(r=>r.id===row.id))session.queue.push({id:row.id,text:row.text,attachments:row.attachments,at:row.at});});
  }
  async interject(session,text,ids,delivery){return this.inputLock(session.id,async()=>{
    if(this.closed)throw new Error('工作区正在关闭');
    if(session.archived||this.nativeBusy(session.id)||this.rebinding.has(session.id)||this.permissionChanging.has(session.id))throw new Error('会话已归档、正在更新设置或被原生窗口占用，请稍后发送');
    const run=this.runs.get(session.id),capability=interjectCapability(session);
    if(delivery==='steer'&&!capability.steer)throw new Error(capability.reason);
    if(delivery==='queue'||!run||run.terminal||!run.adapter?.running||!run.adapter?.steer||session.status==='starting')return this.queueInput(session,text,ids,{note:delivery==='steer'?'原生轮次尚未开始或已经结束，消息已改为排队。':undefined});
    let attachments=[];if(ids.length){if(!this.media||!this.capabilities)throw new Error('媒体服务不可用');attachments=await this.media.claim(session,ids,await this.capabilities(session.runtimeId,session.selection));}
    const row={id:randomUUID(),text,attachments:attachments.map(a=>this.media.public(a)),at:new Date().toISOString(),turnId:run.id,state:'pending'};
    try{
      await this.store.mutate(()=>{session.pendingSteers??=[];session.pendingSteers.push(row);session.mediaAttachments??=[];session.mediaAttachments.push(...row.attachments);});
      await this.store.event(session.id,{type:'user',text,attachments:row.attachments,delivery:'steer',steerId:row.id,turnId:run.id});
      if(run.terminal||run.cancelled||!run.adapter.running)throw new Error('原生轮次已经结束，插话未发送');
      const result=await run.adapter.steer(text,attachments,row.id);
      if(result?.delivered){await this.store.event(session.id,{type:'steer-state',steerId:row.id,state:'delivered',turnId:run.id});await this.store.mutate(()=>{session.pendingSteers=session.pendingSteers.filter(r=>r.id!==row.id);});}
      return {delivery:'steer',id:row.id};
    }catch(error){
      // A transport failure after admission is ambiguous; DSH retains the RPC identity for reconciliation.
      if(error.nativeAdmissionUnknown){await this.store.event(session.id,{type:'notice',source:'queue',turnId:run.id,text:'插话送达状态暂未确认，已保留原生请求标识，未重复发送：'+failureText(error)});return {delivery:'steer',id:row.id,note:'原生接收状态待确认，消息已保留。'};}
      await this.returnSteer(session,row,error.message);await this.store.event(session.id,{type:'steer-state',steerId:row.id,state:'failed',reason:failureText(error),turnId:run.id});return {delivery:'queue',id:row.id,note:'插话未送达，消息已转回队列。'};
    }
  });}
  async prompt(id,text,attachmentIds=[],{delivery,fromQueue}={}){
    if(!Array.isArray(attachmentIds)||attachmentIds.some(id=>typeof id!=='string'))throw new Error('无效附件 id 列表');
    if(this.closed)throw new Error('工作区正在关闭');const session=this.store.session(id);this.ensureReady(session.runtimeId);
    if(typeof text!=='string'||!text.trim()&&!attachmentIds?.length||text.length>500000)throw new Error('请输入有效开发任务或添加附件');
    if(this.external.get(id)?.restoredPid)await this.refreshNative(id);
    if(delivery!==undefined&&!['steer','queue'].includes(delivery))throw new Error('无效的消息送达方式');
    if(this.nativeBusy(id))throw new Error('此会话正在原生窗口中使用，请先退出原生客户端再继续');
    if(this.rebinding.has(id))throw new Error('正在确认模型更新，请稍候');
    if(this.permissionChanging.has(id))throw new Error('正在更新授权模式，请稍候');
    if(session.archived)throw new Error('已归档会话不能发送消息，请先恢复会话');
    this.validate(session.runtimeId,session.selection);
    if(this.runs.has(id)){
      if(!delivery)throw new Error('当前会话仍在运行，请选择插话或排队');
      return this.interject(session,text,attachmentIds,delivery);
    }
    let prepared;const run={id:randomUUID(),cancelled:false,terminal:false,adapter:null,events:Promise.resolve(),approvals:new Set(),prepared:new Promise(resolve=>{prepared=resolve;}),intent:null,plan:[],tailText:'',hasError:false,continuations:0,stats:{requests:0,failedRequests:0,corrections:0},endedNativeTurns:new Set()};
    run.fromQueue=fromQueue;this.runs.set(id,run);
    let attachments=[];
    try{
      if(attachmentIds.length){if(!this.media||!this.capabilities)throw new Error('媒体服务不可用');attachments=await this.media.claim(session,attachmentIds,await this.capabilities(session.runtimeId,session.selection),{queueIds:fromQueue??[]});}
      if(Object.hasOwn(session,'permissionModeNext')){
        const resolved=migratePermissionMode(this.runtimes.find(r=>r.id===session.runtimeId),session.selection,session.permissionModeNext),mode=resolved.mode;
        validatePermissionMode(this.runtimes.find(r=>r.id===session.runtimeId),mode,session.selection);
        const adapter=this.adapters.get(id);this.adapters.delete(id);await adapter?.close();
        await this.store.mutate(()=>{session.permissionMode=mode;delete session.permissionModeNext;if(resolved.migration)session.permissionMigration=resolved.migration;});
        if(resolved.migration)await this.store.event(session.id,{type:'notice',source:'permissions',text:resolved.migration.reason});
      }
      const history=await this.store.taskContext(id);
      run.intent=taskIntent([...history.users,text]);
      if(run.intent.continuation)run.plan=planEntries(history.plan);
      await this.store.mutate(()=>{session.status='starting';session.updatedAt=new Date().toISOString();if(session.title==='新会话')session.title=text.trim().slice(0,45)||attachments[0]?.name||'新会话';session.mediaAttachments??=[];session.mediaAttachments.push(...attachments.map(a=>this.media.public(a)));});
      await this.store.event(id,{type:'user',text,attachments:attachments.map(a=>this.media.public(a)),...(fromQueue?{fromQueue}:{}),turnId:run.id});
      prepared();
      if(run.cancelled)throw new CancelledError();
      run.adapter=await this.adapter(session,run);
      if(run.cancelled)throw new CancelledError();
      await this.store.mutate(()=>{session.status='running';});
      if(run.cancelled)throw new CancelledError();
      if(fromQueue){await this.store.mutate(()=>{session.queueDispatch={ids:fromQueue,turnId:run.id,at:new Date().toISOString()};});run.submitted=true;}
      await run.adapter.prompt(text,attachments);
      if(fromQueue&&!run.queueDispatched){run.queueDispatched=true;await this.store.mutate(()=>{session.queue=(session.queue??[]).filter(row=>!fromQueue.includes(row.id));delete session.queueDispatch;});}
      return {delivery:'turn'};
    }catch(error){
      const uncertain=fromQueue&&run.submitted&&!run.queueDispatched&&!error.rpcRejected;
      if(fromQueue&&!uncertain)await this.store.mutate(()=>{delete session.queueDispatch;});
      if(uncertain)await this.store.event(id,{type:'notice',source:'queue',turnId:run.id,text:'原生发送结果尚未确认，排队消息及附件已保留，未自动重复发送；请先核对原生会话。'});
      const discardedIds=run.queueDispatched||uncertain?[]:attachments.length?attachments.map(a=>a.id):error instanceof MediaClaimError?error.discardedAttachmentIds:[];
      if(discardedIds.length){if(attachments.length){if(fromQueue)await this.media.restage(attachments);else await this.media.rollback(attachments);}await this.store.mutate(()=>{session.mediaAttachments=(session.mediaAttachments??[]).filter(a=>!discardedIds.includes(a.id));});if(!fromQueue)await this.store.event(id,{type:'attachments-discarded',attachmentIds:discardedIds,turnId:run.id});}
      if(!run.terminal){try{if(!run.cancelled)await this.store.event(id,{type:'error',text:failureText(error),turnId:run.id});}finally{await this.finish(session,run,run.cancelled?'interrupted':'failed',{reason:runtimeReason(error)});}}
      if(!run.cancelled)throw error;
    }finally{prepared();
    }
  }
  async approve(id,approvalId,choice,answer){
    const session=this.store.session(id),run=this.runs.get(id);
    if(!run||run.cancelled||run.terminal||!run.approvals.has(approvalId))throw new Error('授权已结束或已过期');
    await run.adapter.approve(approvalId,choice,answer);
    if(run.terminal||run.cancelled)return;
    if(!run.approvals.has(approvalId))return;
    run.approvals.delete(approvalId);await this.store.event(id,{type:'approval-resolved',approvalId,choice,turnId:run.id});
    if(!run.terminal)await this.store.mutate(()=>{session.status=run.approvals.size?'waiting':'running';});
  }
  async cancel(id){
    const session=this.store.session(id),run=this.runs.get(id);if(!run||run.terminal)return;
    run.cancelled=true;
    if(run.adapter){
      const removed=await run.adapter.retractSteers?.().catch(()=>[])??[];
      for(const steerId of removed){const row=session.pendingSteers?.find(row=>row.id===steerId);if(row){await this.returnSteer(session,row);await this.store.event(id,{type:'steer-state',steerId,state:'failed',reason:'任务已停止，插话已撤回到 Bridge++ 队列。',turnId:run.id});}}
      this.adapters.delete(id);await run.adapter.close().catch(()=>{});
    }
    await run.prepared;await run.events;await this.finish(session,run,'interrupted');
  }
  async rename(id,title){if(typeof title!=='string'||!title.trim()||title.length>100)throw new Error('请输入 1–100 字标题');await this.store.mutate(()=>{this.store.session(id).title=title.trim();});}
  async setPermission(id,value){
    if(this.closed)throw new Error('工作区正在关闭');
    const session=this.store.session(id),runtime=this.runtimes.find(r=>r.id===session.runtimeId),mode=validatePermissionMode(runtime,value,session.selection);
    if(this.permissionChanging.has(id)||this.rebinding.has(id)||this.nativeBusy(id))throw new Error('请等待设置完成或退出原生窗口后再修改授权模式');
    const run=this.runs.get(id);
    if(run?.approvals.size||session.status==='waiting'||this.adapters.get(id)?.requests?.size)throw new Error('当前存在待处理授权或提问，请先处理或停止任务，再修改授权模式');
    this.permissionChanging.add(id);
    try{
      const adapter=this.adapters.get(id),hot=adapter?.ready&&typeof adapter.setPermissionMode==='function';
      if(hot){
        await adapter.setPermissionMode(mode);await this.store.mutate(()=>{session.permissionMode=mode;delete session.permissionModeNext;});
      }else if(run){
        await this.store.mutate(()=>{session.permissionModeNext=mode;});
      }else{
        this.adapters.delete(id);await adapter?.close();
        await this.store.mutate(()=>{session.permissionMode=mode;delete session.permissionModeNext;});
      }
      await this.store.event(id,{type:'notice',source:'permissions',text:hot?`授权模式已在当前 ${runtime.name??'原生'} 原生会话中生效。`:run?'授权模式已保存，将从下一轮用户任务生效；本轮及其有界续作保留当前权限。':'授权模式已保存，将在下一轮原生启动时应用。'});
      return session;
    }finally{this.permissionChanging.delete(id);}
  }
  selectionIssue(session){try{this.validate(session.runtimeId,session.selection);return null;}catch(error){return error.message;}}
  permissionView(session){return sessionPermissionView(this.runtimes.find(r=>r.id===session.runtimeId)??{id:session.runtimeId},session);}
  async updateRuntimes(next){
    await Promise.all([...this.external.keys()].map(id=>this.refreshNative(id)));
    const changed=new Set(next.filter(r=>this.runtimes.find(old=>old.id===r.id)?.executable!==r.executable).map(r=>r.id));
    for(const id of new Set([...this.runs.keys(),...this.external.keys()]))if((this.runs.has(id)||this.nativeBusy(id))&&changed.has(this.store.session(id).runtimeId))throw new Error('运行环境路径已变化，请先停止任务或退出原生客户端，再重新检测');
    for(const [id,adapter]of this.adapters)if(changed.has(this.store.session(id).runtimeId)){this.adapters.delete(id);await adapter.close();}
    if(changed.has('dsh')){await this.dsh?.close();this.dsh=null;}this.runtimes=next;
  }
  nativeBusy(id){const owner=this.external.get(id);if(!owner)return false;if(owner.restoredPid)try{process.kill(owner.restoredPid,0);}catch(error){if(error.code==='ESRCH'){this.external.delete(id);this.store.session(id).nativeClientPid=null;this.store.session(id).nativeClientIdentity=null;void this.store.save().catch(()=>{});return false;}}return true;}
  async refreshNative(id){
    const owner=this.external.get(id);if(!owner?.restoredPid)return;
    let current;try{current=await this.identifyProcess(owner.restoredPid);}catch{throw new Error('无法核实原生窗口的进程身份；请先退出对应原生客户端，再继续此会话。');}
    if(this.external.get(id)!==owner)return;
    const session=this.store.session(id),prior=session.nativeClientIdentity;
    if(!current||prior&&!sameProcess(prior,current)||!prior&&!/[\\/](?:powershell|pwsh)\.exe$/i.test(current.executable)){
      this.external.delete(id);await this.store.mutate(()=>{session.nativeClientPid=null;session.nativeClientIdentity=null;});
    }
  }
  claimNative(id,{observeRunning=false}={}){this.store.session(id);if(this.runs.has(id)&&!observeRunning||this.rebinding.has(id)||this.permissionChanging.has(id)||this.nativeBusy(id))throw new Error('此会话正在使用，请先停止任务或退出原生客户端');const claim={};this.external.set(id,claim);return claim;}
  async trackNative(id,claim,child){
    claim.child=child;const release=()=>{if(this.external.get(id)===claim){this.external.delete(id);void this.store.mutate(()=>{const s=this.store.session(id);s.nativeClientPid=null;s.nativeClientIdentity=null;}).catch(()=>{});}};
    child.once('error',release);child.once('close',release);
    let identity=null;if(Number.isSafeInteger(child.pid))try{identity=await this.identifyProcess(child.pid);}catch{/* The live child handle remains the ownership proof until exit. */}
    if(this.external.get(id)===claim)await this.store.mutate(()=>{const s=this.store.session(id);s.nativeClientPid=child.pid??null;s.nativeClientIdentity=identity;});
    return release;
  }
  async rebind(id,selection){
    if(this.closed)throw new Error('工作区正在关闭');const session=this.store.session(id);
    this.ensureReady(session.runtimeId);
    if(this.external.get(id)?.restoredPid)await this.refreshNative(id);
    if(this.rebinding.has(id)||this.permissionChanging.has(id)||this.nativeBusy(id))throw new Error('请先停止当前任务或退出原生客户端，再确认模型更新');
    if(selection?.modelKey!==session.selection.modelKey||session.selection.modelKey==='native'&&(selection.nativeModel!==session.selection.nativeModel||!['codex','antigravity'].includes(session.runtimeId)))throw new Error('这里只能重新确认同一来源、同一模型 ID；更换模型或环境请新建会话');
    const selected=this.validate(session.runtimeId,selection);
    // A running turn keeps its request parameters; the validated selection waits
    // for finish() to apply it exactly like an idle reconfirmation.
    if(this.runs.has(id)||['running','starting','waiting'].includes(session.status)){
      await this.store.mutate(()=>{session.selectionNext={...selected,requestedAt:new Date().toISOString()};});
      await this.store.event(id,{type:'notice',source:'session',text:'新参数已排队，本轮结束后自动应用；应用前可以随时取消。'});
      return {queued:true};
    }
    return this.applyRebind(session,selected);
  }
  async cancelRebind(id){
    const session=this.store.session(id);
    if(!session.selectionNext)return false;
    await this.store.mutate(()=>{delete session.selectionNext;});
    await this.store.event(id,{type:'notice',source:'session',text:'已取消排队的参数修改。'});
    return true;
  }
  async applyRebind(session,selected){
    const id=session.id;this.rebinding.add(id);
    try{
      const prior=session.selection,adapter=this.adapters.get(id);
      const hot=adapter&&!adapter.closed&&['codex','antigravity'].includes(session.runtimeId)&&prior.reasoning!==selected.reasoning&&['identity','contextTokens','contextBudget','nativeModel'].every(key=>prior[key]===selected[key]);
      if(!hot){this.adapters.delete(id);await adapter?.close();}
      await this.store.mutate(()=>{session.selection=selected;session.updatedAt=new Date().toISOString();});
      if(hot&&adapter.endpoint){const model=this.providers.get(selected.modelKey);await this.gateway.register(model,variantFor(model,selected),selected,session.runtimeId,id);}
      await this.store.event(id,{type:'notice',text:'已重新确认当前模型目录与参数，保留原生会话和已有记录。'});
      if(prior.contextTokens!==selected.contextTokens)await this.store.event(id,{type:'notice',text:'上游上下文窗口已改变；下次请求可能需要在新模型窗口重新发送完整历史，不代表已命中上游缓存。'});
      return {...session,queued:false};
    }finally{this.rebinding.delete(id);}
  }
  async close(){
    this.closed=true;clearInterval(this.adapterTimer);this.adapterTimer=null;await Promise.all([...this.runs.keys()].map(id=>this.cancel(id).catch(()=>{})));
    await Promise.allSettled([...this.inputLocks.values()]);
    await Promise.all([...this.adapters.values()].map(a=>a.close().catch(()=>{})));this.adapters.clear();this.adapterUsed.clear();await this.dsh?.close();
  }
}
