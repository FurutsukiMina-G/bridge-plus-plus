import { mkdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { startup, type Query, type SDKUserMessage } from '@qodercn-ai/qodercn-agent-sdk';
import { baseOptions, isolateSession, type Config } from './client.js';
import { InputQueue } from './queue.js';
import { selectModel } from './model.js';
import { Telemetry, safeError } from './telemetry.js';
import { type ChatRequest, type Decision, type DecisionRepair, conversationPrompt, conversationMessages, parseDecision, toolDefinitions } from './compat.js';
import { hasConversationPrefix, routeConversation, prefixIssue,evictionCandidate,prunedConversationPrefix } from './routing.js';
import {pruningThreshold,pruningAllowed} from './history-pruning.js';
import { abortable } from './async.js';
import { prefixCacheEstimate, withCachedTokens, ZERO_USAGE, type OpenAIUsage } from './usage.js';
import {recoverDecision,decisionRetryLimit,decisionCorrectionPrompt,type RecoveryTrace} from './decision-recovery.js';
import { cacheFromCredits, sharedTierCalendar } from './billing.js';
import {sdkMediaPrompt} from './media-input.js';
import {IsolationCache} from './isolation-cache.js';
import {startupTransport,runtimeMemory,DISABLED_RUNTIME_MEMORY,type StartupAttempt} from './startup-phases.js';
import {hasUsableTools} from './final-answer.js';

export type InferHooks = { signal?: AbortSignal; onText?: (text: string) => void;
  onCorrection?: (retry:number,error:string)=>void;
  onThinking?: (text: string) => void; validateDecision?: (decision: Decision) => void;
  prepareDecisionRetry?: () => boolean;
  /** Bridge status during upstream silence (SDK API retries); not model output. */
  onStatus?: (text: string) => void;
  /** Client-picked effort the model offers; overrides the configured default for this request. */
  reasoningEffort?: string };

type Warm = Awaited<ReturnType<typeof startup>>;
type RecordSession = {
  id: string; warm: Warm; q: Query; queue: InputQueue<SDKUserMessage>; controller: AbortController;
  bridgeScope?:string;clientKey?:string;
  messages: ChatRequest['messages']; replayMessages?:ChatRequest['messages']; touched: number; locked: Promise<void>;
  lastCredits: number | null; model: string; busy: number; toolSignature: string | null;
  retryHint: string | null; retryMessageHash: string | null;
  closed: boolean; lastSuccessHash: string | null; lastDecision: Decision | null; sdkSessionId: string | null;
  policyCalls: Array<{ purpose: string; model: string; context_window: number | null; reasoning_effort: string | null }>;
  /** Prompt tokens of this Qoder session's latest completed model request: the next request's exact prefix. */
  lastPromptTokens: number | null;
  contextUsageRatio?:number|null;
  startupPhases?:{attempts:StartupAttempt[];total_ms:number;isolation_cache:{enabled:boolean;hit:boolean;status:string;cli_version:string|null;declared_cli_version:string|null}};
  nativeReleased?:boolean;
  lastFailedDecision: {hash:string;response:string;error:string;recovery:RecoveryTrace} | null;
  lastCompletionId: string | null;
  lastFinishReason?: 'length';
  /** Read by resolveModel before each upstream call; set only for a single bridge-initiated retry. */
  policy: { reasoning: string | null };
};
/** Bridge-initiated retries (format corrections, reasoning-guard retries) step down from max effort. */
const RETRY_REASONING = 'high';
export const DEFAULT_REASONING_GUARD_TOKENS = 24_000;
const MAX_SESSIONS = 8;
const IDLE_MS = 60 * 60_000;
const SWEEP_MS = 60_000;
export class QoderPool {
  private sessions = new Map<string, RecordSession>();
  private byToolId = new Map<string, string>();
  private byClientSession = new Map<string, string>();
  private nextWarm: Promise<RecordSession> | null = null;
  private warmTimer?: ReturnType<typeof setTimeout>;
  private extraWarm:Promise<RecordSession>[]=[];
  private warmReady=new Map<Promise<RecordSession>,RecordSession>();
  private warmTimers=new Map<Promise<RecordSession>,ReturnType<typeof setTimeout>>();
  private warmTarget=1;
  private lastDemand=Date.now();
  private openingControllers=new Set<AbortController>();
  private cacheReady?:Promise<IsolationCache|null>;
  private cacheInfo={enabled:false,hit:false,status:'disabled',cli_version:null as string|null,declared_cli_version:null as string|null};
  private closed = false;
  private openingByClient = new Map<string, Promise<RecordSession>>();
  private pendingSlots=0;
  private prewarmError: string | null = null;
  private recoveredRequests = 0;
  private exhaustedRequests = 0;
  private reasoningGuardTrips = 0;
  private disabledPlugins = new Set<string>();
  private disabledSkills = new Set<string>();
  // Idle SDK runtimes are otherwise released only when another session is opened.
  private sweeper = setInterval(() => this.sweepIdle(), SWEEP_MS);
  constructor(readonly config: Config, private readonly startRuntime: typeof startup = startup) {
    this.sweeper.unref();
    if(!Number.isSafeInteger(config.blankWarmLimit??2)||(config.blankWarmLimit??2)<0||(config.blankWarmLimit??2)>4||!Number.isSafeInteger(config.blankWarmTtlMs??120000)||(config.blankWarmTtlMs??120000)<1){clearInterval(this.sweeper);throw new Error('Invalid Qoder blank runtime limit or TTL');}
    try{pruningThreshold(config.prunedHistoryReuseRatio);}catch(error){clearInterval(this.sweeper);throw error;}
    try { decisionRetryLimit(config.decisionRetries); }
    catch(error) { clearInterval(this.sweeper); throw error; }
    if (config.sessionIdleMs !== undefined && (!Number.isSafeInteger(config.sessionIdleMs) || config.sessionIdleMs < 60_000)) {
      clearInterval(this.sweeper);
      throw new Error('sessionIdleMs must be an integer >=60000');
    }
    const guard = config.reasoningGuardTokens;
    if (guard !== undefined && (!Number.isSafeInteger(guard) || (guard !== 0 && guard < 1024))) {
      clearInterval(this.sweeper);
      throw new Error('reasoningGuardTokens must be 0 (disabled) or an integer >=1024');
    }
  }
  private dropWarm(pending:Promise<RecordSession>){
    clearTimeout(this.warmTimers.get(pending));this.warmTimers.delete(pending);this.warmReady.delete(pending);
    if(this.nextWarm===pending)this.nextWarm=this.extraWarm.shift()??null;else this.extraWarm=this.extraWarm.filter(p=>p!==pending);
  }
  private newWarm():Promise<RecordSession>{
    const pending=this.open();
    void pending.then(record => { this.prewarmError = null;
      if(this.closed){this.close(record);return;}
      if(this.nextWarm!==pending&&!this.extraWarm.includes(pending))return;
      this.warmReady.set(pending,record);const timer=setTimeout(()=>{this.dropWarm(pending);this.close(record);},this.config.blankWarmTtlMs??120000);timer.unref();this.warmTimers.set(pending,timer);
    }, error => {
      this.dropWarm(pending);
      this.prewarmError = safeError(error);
      process.stderr.write(`[bridge] Prewarm failed: ${this.prewarmError}\n`);
    });
    return pending;
  }
  private primeNext():Promise<RecordSession>{if(this.nextWarm)return this.nextWarm;return this.nextWarm=this.newWarm();}
  private replenish(){
    if(this.closed||Date.now()-this.lastDemand>(this.config.blankWarmTtlMs??120000)||!(this.config.blankWarmLimit??2))return;
    void this.primeNext();
    while(1+this.extraWarm.length<Math.min(this.warmTarget,this.config.blankWarmLimit??2))this.extraWarm.push(this.newWarm());
  }
  prewarm() {this.lastDemand=Date.now();if(!(this.config.blankWarmLimit??2))return Promise.resolve();return this.primeNext().then(() => {});}
  private oneShot(request:ChatRequest){return !hasUsableTools(request)&&!request.prompt_cache_key&&request.messages.length===2&&request.messages[0]?.role==='system'&&request.messages[1]?.role==='user'&&request.messages.every(m=>typeof m.content==='string');}
  private async cache(){
    if(!this.config.isolationCacheDir)return null;
    this.cacheReady??=IsolationCache.open(this.config.isolationCacheDir,this.config.sessionSettings??'{}',this.config.cliPath,this.config.isolationRuntimeIdentity).then(cache=>{
      cache.plugins.forEach(id=>this.disabledPlugins.add(id));cache.skills.forEach(id=>this.disabledSkills.add(id));this.cacheInfo={enabled:true,hit:cache.hit,status:'ready',cli_version:cache.observedCliVersion,declared_cli_version:cache.declaredCliVersion};return cache;
    }).catch(()=>{this.cacheInfo={enabled:true,hit:false,status:'unavailable',cli_version:null,declared_cli_version:null};return null;});return this.cacheReady;
  }
  private async open(): Promise<RecordSession> {
    const openingAt=performance.now(),attempts:StartupAttempt[]=[];
    await mkdir('.runtime', { recursive: true });
    const cache=await this.cache();
    if(this.closed)throw new Error('Qoder pool closed during startup');
    for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    this.openingControllers.add(controller);
    const queue = new InputQueue<SDKUserMessage>();
    let warm: Warm | undefined;
    const policyCalls: RecordSession['policyCalls'] = [];
    const policy: RecordSession['policy'] = { reasoning: null };
    const phase:StartupAttempt={attempt:attempt+1,transport_kind:'unobserved',transport_initialize_ms:null,sdk_startup_ms:0,sdk_initialize_ms:null,initialization_result_ms:0,isolate_ms:0,get_available_models_ms:0,total_ms:0,isolation_retry:false,memory:{...DISABLED_RUNTIME_MEMORY}};
    attempts.push(phase);const phaseAt=performance.now();
    try {
      const options = baseOptions(this.config, controller);
      const raw: unknown = this.config.sessionSettings;
      let settings: Record<string, unknown>;
      try { settings = typeof raw === 'string' ? JSON.parse(raw) : structuredClone(raw ?? {}); }
      catch { throw new Error('Qoder sessionSettings JSON 无法解析'); }
      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new Error('Qoder sessionSettings 必须是 JSON 对象');
      for (const field of ['enabledPlugins', 'skillOverrides']) {
        const value = settings[field];
        if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) throw new Error(`Qoder sessionSettings.${field} 必须是对象`);
      }
      settings = { ...settings, enabledPlugins: { ...settings.enabledPlugins as object, ...Object.fromEntries([...this.disabledPlugins].map(id => [id, false])) },
        skillOverrides: { ...settings.skillOverrides as object, ...Object.fromEntries([...this.disabledSkills].map(name => [name, 'off'])) } };
      options.settings = JSON.stringify(settings);
      const appliedPlugins=new Set(this.disabledPlugins),appliedSkills=new Set(this.disabledSkills),pid=startupTransport(options,phase);
      options.resolveModel = context => {
        const selected = selectModel(context.availableModels,
          policy.reasoning ? { ...this.config, reasoning: policy.reasoning } : this.config);
        policyCalls.push({ purpose: context.purpose, model: selected.model,
          context_window: selected.parameters?.contextWindow ?? null,
          reasoning_effort: selected.parameters?.reasoningEffort ?? null });
        return selected;
      };
      let mark=performance.now();try{warm = await this.startRuntime({ options, initializeTimeoutMs: this.config.timeout });}finally{phase.sdk_startup_ms=performance.now()-mark;phase.sdk_initialize_ms=phase.transport_initialize_ms===null?null:Math.max(0,phase.sdk_startup_ms-phase.transport_initialize_ms);}
      controller.signal.throwIfAborted();
      const q = warm.query(queue);
      mark=performance.now();const init=await q.initializationResult();phase.initialization_result_ms=performance.now()-mark;
      mark=performance.now();const isolation = await isolateSession(q,init);phase.isolate_ms=performance.now()-mark;
      const plugins = isolation.remaining_plugins, skills = (isolation.context_skills.items??[]).map(item => item.name);
      const observedPlugins=[...new Set([...isolation.initial_plugins,...plugins])],observedSkills=[...new Set([...isolation.initial_skills,...skills])];
      const discovered = observedPlugins.some(id => !appliedPlugins.has(id)) || observedSkills.some(name => !appliedSkills.has(name));
      for (const id of observedPlugins) this.disabledPlugins.add(id);
      for (const name of observedSkills) this.disabledSkills.add(name);
      if(discovered&&cache)await cache.remember([...this.disabledPlugins],[...this.disabledSkills]).catch(()=>{this.cacheInfo.status='write_failed';});
      if (isolation.error || plugins.length || isolation.context_skills.count || discovered) {
        if (attempt === 0 && discovered) {phase.isolation_retry=true; queue.close(); warm.close(); controller.abort(); continue; }
        throw new Error(`Thin session isolation failed: Qoder 里有无法关闭的插件或技能；plugins=${JSON.stringify(plugins)}; skills=${JSON.stringify(skills)}${isolation.error ? '；插件隔离操作返回错误' : ''}`);
      }
      controller.signal.throwIfAborted();mark=performance.now();const selected = selectModel(await q.getAvailableModels(), this.config);phase.get_available_models_ms=performance.now()-mark;
      phase.memory=await runtimeMemory(pid());phase.total_ms=performance.now()-phaseAt;
      return { id: randomUUID(), warm, q, queue, controller, messages: [],
        startupPhases:{attempts,total_ms:performance.now()-openingAt,isolation_cache:{...this.cacheInfo}},
        touched: Date.now(), locked: Promise.resolve(), lastCredits: null, model: selected.model, busy: 0,
        toolSignature: null, retryHint: null, retryMessageHash: null, policyCalls,
        closed: false, lastSuccessHash: null, lastDecision: null, sdkSessionId: null, lastPromptTokens: null,
        lastFailedDecision:null,lastCompletionId:null, policy };
    } catch (error) { queue.close(); warm?.close(); controller.abort(); throw error; }
    finally{phase.total_ms=performance.now()-phaseAt;this.openingControllers.delete(controller);}
    }
    throw new Error('Thin session isolation failed: Qoder 隔离重试已用尽');
  }
  private close(record: RecordSession) {
    if (record.closed) return;
    record.closed = true;
    this.sessions.delete(record.id);
    for (const [id, owner] of this.byToolId) if (owner === record.id) this.byToolId.delete(id);
    for (const [id, owner] of this.byClientSession) if (owner === record.id) this.byClientSession.delete(id);
    record.queue.close(); record.warm.close(); record.controller.abort();
  }
  private sweepIdle() {
    for (const record of this.sessions.values()) if (!record.busy && Date.now() - record.touched > (record.nativeReleased ? 120_000 : this.config.sessionIdleMs ?? IDLE_MS)) this.close(record);
    // A failed startup prewarm (e.g. network not ready at logon) retries until the runtime is reachable.
    if (this.prewarmError && !this.nextWarm) this.replenish();
  }
  private sweep(scope?:string) {
    this.sweepIdle();
    const active=[...this.sessions.values()].filter(r=>!r.nativeReleased);
    if (active.length+this.pendingSlots < MAX_SESSIONS) return;
    for(const r of this.sessions.values())if(r.nativeReleased&&!r.busy)this.close(r);
    const oldest = evictionCandidate([...this.sessions.values()].filter(r=>!r.nativeReleased),scope);
    if (oldest) this.close(oldest);
    else throw new Error('All QoderBridge conversation slots are active');
  }
  private matching(request: ChatRequest,hash:string): RecordSession | undefined {
    const eligible=new Map([...this.sessions].filter(([,r])=>!r.nativeReleased||r.lastSuccessHash===hash&&Boolean(r.lastDecision)&&Date.now()-r.touched<120_000||r.lastFailedDecision?.hash===hash));
    const id = routeConversation(request, eligible, this.byClientSession, this.byToolId);
    if(id)return this.sessions.get(id);
    const candidates=this.related(request).filter(record=>!record.busy&&pruningAllowed(record.contextUsageRatio,pruningThreshold(this.config.prunedHistoryReuseRatio))&&prunedConversationPrefix(record.messages,request.messages));
    return candidates.length===1?candidates[0]:undefined;
  }
  private related(request:ChatRequest):RecordSession[]{
    if(typeof request.bridge_scope==='string')return [...this.sessions.values()].filter(r=>!r.nativeReleased&&r.bridgeScope===request.bridge_scope&&r.clientKey===request.prompt_cache_key&&!r.busy);
    if(request.prompt_cache_key){const prior=this.sessions.get(this.byClientSession.get(request.prompt_cache_key)??'');return prior&&!prior.nativeReleased&&prior.bridgeScope===undefined?[prior]:[];}
    const owners=new Set(request.messages.flatMap(m=>[m.tool_call_id,...(m.tool_calls??[]).flatMap(c=>c&&typeof c==='object'&&'id' in c&&typeof c.id==='string'?[c.id]:[])]).flatMap(id=>id?[this.byToolId.get(id)]:[]));
    return [...this.sessions.values()].filter(r=>!r.nativeReleased&&r.bridgeScope===undefined&&owners.has(r.id));
  }
  private resetPrior(request:ChatRequest){
    const related=this.related(request);if(related.length===1)return related[0];
    const scored=related.map(record=>({record,at:prefixIssue(record.messages,request.messages)?.first_changed_index??record.messages.length})).sort((a,b)=>b.at-a.at);
    return scored[0]&&scored[0].at>0&&scored[0].at!==scored[1]?.at?scored[0].record:undefined;
  }
  private async acquire(request: ChatRequest, hash: string, resetFrom?: RecordSession) {
    const key = request.bridge_scope?undefined:request.prompt_cache_key;
    if(!resetFrom){
      const existing = this.matching(request,hash);
      if (existing) return { record: existing, reused: true };
      // Concurrent identical first prompts may be different subagents. Never deduplicate openings by content.
      const opening = key ? this.openingByClient.get(key) : undefined;
      if (opening) return { record: await opening, reused: true };
    }
    const prior=resetFrom??(this.oneShot(request)?undefined:this.resetPrior(request));
    const issue=prior?prefixIssue(prior.messages,request.messages):null,pruned=prior&&prunedConversationPrefix(prior.messages,request.messages),threshold=pruningThreshold(this.config.prunedHistoryReuseRatio);
    const contextReset=issue?{...issue,...resetFrom?{reason:'history_changed_while_waiting'}:{},...pruned?{prune_reuse_rejected:threshold===0?'disabled':prior?.contextUsageRatio==null?'context_usage_unknown':'context_usage_high',context_usage_ratio:prior?.contextUsageRatio??null,threshold}:{}}:null;
    const created = this.acquireNew(request);
    if (key) this.openingByClient.set(key, created);
    try { return { record: await created, reused: false, contextReset }; }
    finally { if (key && this.openingByClient.get(key) === created) this.openingByClient.delete(key); }
  }
  private async acquireNew(request: ChatRequest) {
    this.sweep(request.bridge_scope);
    this.pendingSlots++;
    try{
    const pending = this.nextWarm,ready=!!pending&&this.warmReady.has(pending);
    clearTimeout(this.warmTimer);
    // Refill immediately, including while the claimed runtime is still initializing.
    if(pending){this.dropWarm(pending);this.replenish();}const waitAt=performance.now();
    const record = pending ? await pending : await this.open();
    (record as RecordSession&{startupWaitMs?:number;warmStart?:boolean}).startupWaitMs=performance.now()-waitAt;
    (record as RecordSession&{warmStart?:boolean}).warmStart=ready;
    this.sessions.set(record.id, record);
    if(typeof request.bridge_scope==='string'){record.bridgeScope=request.bridge_scope;record.clientKey=request.prompt_cache_key;}
    const key = request.prompt_cache_key;
    if (key&&!request.bridge_scope) {
      const superseded = this.sessions.get(this.byClientSession.get(key) ?? '');
      this.byClientSession.set(key, record.id);
      // A client key routes only to its newest session, so a replaced branch (rollback, compaction) is unreachable.
      if (superseded && superseded !== record && !superseded.busy) this.close(superseded);
    }
    this.replenish();
    return record;
    }finally{this.pendingSlots--;}
  }
  bindTool(id: string, record: RecordSession) { this.byToolId.set(id, record.id); }
  stats() { return { sessions: [...this.sessions.values()].filter(row => !row.nativeReleased).length, busy: [...this.sessions.values()].filter(row => row.busy > 0).length,
    opening: this.openingByClient.size, prewarmed: this.nextWarm !== null, prewarm_error: this.prewarmError,
    blank_runtimes:{target:Math.min(this.warmTarget,this.config.blankWarmLimit??2),limit:this.config.blankWarmLimit??2,ready:this.warmReady.size,pending:Number(!!this.nextWarm)+this.extraWarm.length-this.warmReady.size,ttl_ms:this.config.blankWarmTtlMs??120000},
    decision_recovery:{max_correction_calls:decisionRetryLimit(this.config.decisionRetries),
      recovered_requests:this.recoveredRequests,exhausted_requests:this.exhaustedRequests},
    reasoning_guard:{max_reasoning_tokens:this.guardTokens(),trips:this.reasoningGuardTrips},
    billing_calendar_overrides:sharedTierCalendar.learnedDates() }; }
  private guardTokens() { return this.config.reasoningGuardTokens ?? DEFAULT_REASONING_GUARD_TOKENS; }
  async infer(request: ChatRequest, hooks: InferHooks = {}) {
    const start = performance.now();
    this.lastDemand=Date.now();if(this.oneShot(request))this.warmTarget=Math.min(2,this.config.blankWarmLimit??2);
    const requestHash = createHash('sha256').update(JSON.stringify({ model: request.model,
      messages: conversationMessages(request.messages), tools: request.tools, choice: request.tool_choice,
      temperature: request.temperature, max_tokens: request.max_tokens,response_format:request.response_format,parallel_tool_calls:request.parallel_tool_calls,
      max_completion_tokens: request.max_completion_tokens, reasoning: hooks.reasoningEffort ?? null })).digest('hex');
    const signal = AbortSignal.any([AbortSignal.timeout(this.config.timeout), ...(hooks.signal ? [hooks.signal] : [])]);
    const acquireWithSignal = async (resetFrom?: RecordSession) => {
      const acquiring = this.acquire(request, requestHash, resetFrom);
      try { return await abortable(acquiring, signal); }
      catch (error) { void acquiring.then(value => { if (!value.reused) this.close(value.record); }, () => {}); throw error; }
    };
    let acquired = await acquireWithSignal();
    let { record, reused } = acquired;
    let unlock!: () => void, previous = record.locked, ownsTurn = false, locked = false;
    const lock = (target: RecordSession) => {
      record = target; record.busy++; previous = record.locked;
      record.locked = new Promise<void>(resolve => { unlock = resolve; });
      ownsTurn = false; locked = true;
    };
    const release = () => {
      if (!locked) return;
      locked = false; record.busy--;
      if (ownsTurn && this.oneShot(request) && !record.nativeReleased) {
        record.nativeReleased = true; record.queue.close(); record.warm.close(); record.controller.abort();
      }
      if (ownsTurn) unlock(); else void previous.then(unlock, unlock);
    };
    lock(record);
    // Interrupt and drain a native terminal before reusing a cancelled lane.
    // Aborting the SDK controller destroys all history, so that is a fallback
    // only when the runtime cannot establish a clean boundary promptly.
    let interruption:Promise<void>|undefined;
    const abort = () => {
      if(typeof record.q.interrupt!=='function'){this.close(record);return;}
      interruption??=record.q.interrupt().then(()=>{},()=>{});
    };
    try {
      await abortable(previous, signal);
      ownsTurn = true;
      signal.throwIfAborted();
      if (record.closed) throw new Error('Qoder session closed before this queued request');
      // An exhausted identical request must not restart another paid retry loop
      // just because an HTTP client retries the same body. A changed request
      // (including an explicit new user message) can start a new decision.
      if(record.lastFailedDecision?.hash===requestHash){
        const failed=record.lastFailedDecision;
        const localRecovery={...failed.recovery,correctionCalls:0,attempts:0,evidence:[],knownCreditsSubtotal:0,unknownCreditAttempts:0,
          knownModelRequestsSubtotal:0,unknownModelRequestAttempts:0};
        return {record,decision:null,decisionError:failed.error,response:failed.response,completionId:undefined,
          recovery:localRecovery,report:{...new Telemetry().snapshot(),response:failed.response,
            error:null as string|null,stage:'local_rejected_replay',model:record.model,
            context_reset:null,pruned_history_reuse:null,startup_phases:null,warm_start:false,startup_wait_ms:0,
            session_id:record.sdkSessionId,reused_session:true,startup_ms:0,prompt_chars:0,
            available_tool_definition_chars:0,sent_tool_definition_chars:0,tool_definitions_reused:true,
            tool_detail_mode:'reused',history_mode:'delta',sent_message_count:0,model_policy_calls:[],
            client_session_key_present:Boolean(request.prompt_cache_key),client_session_key_hash:request.prompt_cache_key?createHash('sha256').update(request.prompt_cache_key).digest('hex').slice(0,12):null,
            credits_delta:0,total_session_credits:record.lastCredits,model_requests:0,
            local_response_replay:true,normalized_usage_source:'local_replay',client_usage:{...ZERO_USAGE} as OpenAIUsage|null,
            client_cache_usage:'omitted',cache_estimate_tokens:null as number|null,cache_estimate_ratio:null as number|null,
            decision_recovery:localRecovery,
          }};
      }
      if (record.lastSuccessHash === requestHash && record.lastDecision && Date.now() - record.touched < 120_000) {
        hooks.validateDecision?.(record.lastDecision);
        return { record, decision: record.lastDecision, decisionError: null, response: JSON.stringify(record.lastDecision),
          completionId:record.lastCompletionId??undefined,
          report: { ...new Telemetry().snapshot(), finish_reason:record.lastFinishReason, session_id: record.sdkSessionId, model: record.model,
            context_reset:null,pruned_history_reuse:null,startup_phases:null,warm_start:false,startup_wait_ms:0,
            response: JSON.stringify(record.lastDecision), error: null as string | null, stage: 'local_replay',
            reused_session: true, startup_ms: 0, prompt_chars: 0, available_tool_definition_chars: 0,
            sent_tool_definition_chars: 0, tool_definitions_reused: true, tool_detail_mode: 'reused',
            client_session_key_present: Boolean(request.prompt_cache_key),
            client_session_key_hash: request.prompt_cache_key ? createHash('sha256').update(request.prompt_cache_key).digest('hex').slice(0, 12) : null,
            model_policy_calls: [], history_mode: 'delta', sent_message_count: 0,
            credits_delta: 0, total_session_credits: record.lastCredits, model_requests: 0, local_response_replay: true,
            // No model call ran, so zero is the exact usage of this replay.
            normalized_usage_source: 'local_replay', client_usage: { ...ZERO_USAGE } as OpenAIUsage | null,
            client_cache_usage: 'omitted', cache_estimate_tokens: null as number | null,
            cache_estimate_ratio: null as number | null } };
      }
      const exactPrefix = reused && !record.nativeReleased && hasConversationPrefix(record.messages, request.messages);
      const pruned=reused&&!record.nativeReleased&&!exactPrefix&&pruningAllowed(record.contextUsageRatio,pruningThreshold(this.config.prunedHistoryReuseRatio))?prunedConversationPrefix(record.messages,request.messages):null;
      if(reused&&!exactPrefix&&!pruned){
        const prior=record.nativeReleased?undefined:record;release();if(!prior)this.close(record);
        acquired=await acquireWithSignal(prior);
        ({record,reused}=acquired);lock(record);
        await abortable(previous,signal);ownsTurn=true;signal.throwIfAborted();
        if(record.closed)throw new Error('Qoder session closed before this queued request');
      }
      record.lastFailedDecision=null;
      const prefix = exactPrefix||!!pruned;
      const delta = prefix ? request.messages.slice(pruned?pruned.delta_start:record.messages.length) : request.messages;
      const pruning=pruned?{removed_message_count:pruned.removed_message_count,removed_roles:pruned.removed_roles,context_usage_ratio:record.contextUsageRatio,threshold:pruningThreshold(this.config.prunedHistoryReuseRatio),native_retains_pruned_results:true}:null;
      const toolSignature = JSON.stringify(request.tools ?? []);
      const omitUnchangedTools = reused && record.toolSignature === toolSignature;
      if (record.retryMessageHash !== requestHash) { record.retryHint = null; record.retryMessageHash = null; }
      let optimization:{contract_reused:boolean;echo_characters_avoided:number}|undefined;
      const prompt = `${record.retryHint ? `${record.retryHint}\n` : ''}${conversationPrompt({ ...request, messages: delta }, {
        decisionContract:this.config.decisionContract,
        fullToolDetails:this.config.fullToolDetails,
        omitUnchangedTools, historyMode: prefix ? 'delta' : 'full', priorDecision: prefix ? record.lastDecision ?? undefined : undefined,
        onOptimization:value=>{optimization=value},
      })}`;
      signal.addEventListener('abort', abort, { once: true });
      const attemptReports:Array<Record<string,unknown>>=[];
      const recovered=await recoverDecision({request,prompt,retries:this.config.decisionRetries,signal,
        guardDecision:this.config.guardDecision,
        onCorrection:hooks.onCorrection,
        prepareRetry:hooks.prepareDecisionRetry,validateDecision:hooks.validateDecision,
        invoke:async(attemptPrompt,attempt,correctionSchemaCharacters)=>{
          const telemetry = new Telemetry();
          const policyStart = record.policyCalls.length;
          const attemptAt = new Date();
          let inferenceError: string | null = null;
          let inFlight:ReturnType<Query['next']>|null=null;
          const guard = this.guardTokens();
          let guardTripped = false;
          // Corrections and guard retries need a valid next step, not another maximal deliberation.
          const chosen = hooks.reasoningEffort ?? this.config.reasoning;
          const reasoning = attempt > 0 && chosen === 'max' ? RETRY_REASONING : hooks.reasoningEffort ?? null;
          const policy = record.policy ??= { reasoning: null };
          policy.reasoning = reasoning;
          const onThinking = (text: string) => {
            hooks.onThinking?.(text);
            // Long reasoning with no output is the max_tokens/error_max_turns failure mode; stop it early.
            if (guard && !guardTripped && telemetry.textDeltaCount === 0 && telemetry.thinkingDeltaCount >= guard) {
              guardTripped = true; this.reasoningGuardTrips++;
              void record.q.interrupt().catch(() => {});
            }
          };
          try {
            signal.throwIfAborted();
            record.queue.push({ type: 'user', parent_tool_use_id: null, message: { role: 'user', content: sdkMediaPrompt(attemptPrompt,delta) } });
            while (true) {
              inFlight=record.q.next();const step = await abortable(inFlight, signal);inFlight=null;
              if (step.done) throw new Error('Qoder stream closed');
              telemetry.observe(step.value, hooks.onText, onThinking, hooks.onStatus);
              if (step.value.type === 'result') break;
            }
            const failed = telemetry.result?.subtype !== 'success' || telemetry.result.is_error;
            // An interrupted runaway turn leaves the SDK session usable; the recovery loop owns the retry.
            if (failed && !guardTripped) throw new Error(`Qoder result: ${telemetry.result?.subtype ?? 'missing'}`);
          } catch (error) {
            inferenceError = safeError(error);
            telemetry.captureException(error);
            let drained=false;
            if(signal.aborted&&!record.closed){
              abort();const drainSignal=AbortSignal.timeout(5000);
              try{
                await abortable(interruption!,drainSignal);
                let step=await abortable(inFlight??record.q.next(),drainSignal);
                for(let count=0;count<10000&&!step.done;count++){
                  if(step.value.type==='result'){drained=true;break;}
                  step=await abortable(record.q.next(),drainSignal);
                }
              }catch{/* An unverified SDK state must not be resumed. */}
            }
            if(drained){
              record.messages=request.messages;record.toolSignature=toolSignature;
              record.lastSuccessHash=null;record.lastDecision=null;record.lastFailedDecision=null;record.replayMessages=undefined;record.lastPromptTokens=null;
            }else this.close(record);
          } finally { policy.reasoning = null; }
          const reasoningGuardStopped = guardTripped && !inferenceError &&
            (telemetry.result?.subtype !== 'success' || telemetry.result.is_error);
          record.touched = Date.now();
          const turnPolicies = record.policyCalls.slice(policyStart);
          const windows = new Set(turnPolicies.map(call => call.context_window));
          const report = telemetry.snapshot(windows.size === 1 ? [...windows][0]! : null);
          if(report.cli_version&&this.cacheReady){this.cacheInfo.cli_version=report.cli_version;if(record.startupPhases)record.startupPhases.isolation_cache.cli_version=report.cli_version;const cache=await this.cacheReady;if(cache&&cache.observedCliVersion!==report.cli_version)await cache.remember([...this.disabledPlugins],[...this.disabledSkills],report.cli_version).catch(()=>{this.cacheInfo.status='write_failed';});}
          const ratio=report.context_usage_ratio??(report.context_window&&report.normalized_usage&&report.normalized_usage.prompt_tokens>0?report.normalized_usage.prompt_tokens/report.context_window:null);
          const occupancy=typeof ratio==='number'&&report.context_window&&report.normalized_usage?ratio+report.normalized_usage.completion_tokens/report.context_window:ratio;
          record.contextUsageRatio=!inferenceError&&typeof occupancy==='number'&&Number.isFinite(occupancy)&&occupancy>=0?occupancy:null;
          const measured = report.normalized_usage_source === 'qoder_context_ratio+stream_token_deltas' ? report.normalized_usage : null;
          const previousPrompt = record.lastPromptTokens;
          const cacheEstimate = measured ? prefixCacheEstimate(measured.prompt_tokens, previousPrompt) : null;
          record.sdkSessionId = report.session_id ?? record.sdkSessionId;
          // A cumulative total below the last one (seen after interrupted turns) cannot be differenced.
          const total = report.total_session_credits;
          const regressed = total !== null && record.lastCredits !== null && total < record.lastCredits;
          const deltaCredits = regressed ? null : total === null ? report.credits : total - (record.lastCredits ?? 0);
          if (total !== null && !regressed) record.lastCredits = total;
          else if (total === null && report.credits !== null) record.lastCredits = (record.lastCredits ?? 0) + report.credits;
          const billedCredits = report.stream_original_credits ?? (report.stream_billable !== false ? deltaCredits : null);
          const billing = measured && typeof billedCredits === 'number'
            ? cacheFromCredits({ model: record.model, promptTokens: measured.prompt_tokens,
              outputTokens: measured.completion_tokens, credits: billedCredits, at: attemptAt, prefixHint: previousPrompt }) : null;
          const cacheMode = this.config.cacheUsage ?? 'none';
          const clientCached = cacheMode === 'billing' ? billing?.cachedTokens ?? cacheEstimate
            : cacheMode === 'estimate' ? cacheEstimate : null;
          const clientUsage = measured && clientCached !== null ? withCachedTokens(measured, clientCached) : report.normalized_usage;
          // The Qoder session appends every completed request, including one whose decision is later rejected.
          if (!inferenceError && measured) record.lastPromptTokens = measured.prompt_tokens;
          else if (!inferenceError && !reasoningGuardStopped) record.lastPromptTokens = report.normalized_usage?.prompt_tokens ?? null;
          const attemptReport={...report,response:telemetry.text,error:inferenceError,
            stage:signal.aborted?'cancelled_or_timeout':reasoningGuardStopped?'reasoning_guard':'inference',
            requested_reasoning:reasoning??this.config.reasoning??null,
            reasoning_guard:guardTripped?{limit:guard,reasoning_tokens:telemetry.thinkingDeltaCount,stopped:reasoningGuardStopped}:null,
            reasoning_guard_stopped:reasoningGuardStopped,
            streamed_output_tokens:telemetry.textDeltaCount+telemetry.thinkingDeltaCount,
            streamed_reasoning_tokens:telemetry.thinkingDeltaCount,
            cache_billing:billing,billing_tier:billing?.tier??null,
            model:record.model,reused_session:attempt>0||reused,
            startup_ms:attempt>0||reused?0:performance.now()-start-report.wall_ms,
            prompt_chars:attemptPrompt.length,available_tool_definition_chars:toolSignature.length,
            sent_tool_definition_chars:attempt>0?correctionSchemaCharacters:omitUnchangedTools?0:JSON.stringify(toolDefinitions(request)).length,
            tool_detail_mode:attempt>0?'correction_subset':omitUnchangedTools?'reused':'compact',tool_definitions_reused:omitUnchangedTools,
            client_session_key_present:Boolean(request.prompt_cache_key),
            client_session_key_hash:request.prompt_cache_key?createHash('sha256').update(request.prompt_cache_key).digest('hex').slice(0,12):null,
            model_policy_calls:turnPolicies,decision_repairs:[] as DecisionRepair[],
            history_mode:prefix?'delta':'full',sent_message_count:attempt>0?0:delta.length,
            credits_delta:deltaCredits,credits_delta_source:report.total_session_credits!==null?'cumulative_delta':report.request_credits_source,
            local_response_replay:false,client_usage:clientUsage,cache_estimate_tokens:cacheEstimate,
            cache_estimate_ratio:cacheEstimate!==null&&measured&&measured.prompt_tokens>0?cacheEstimate/measured.prompt_tokens:null,
            client_cache_usage:!clientUsage?.prompt_tokens_details?'omitted':!measured?'reported'
              :cacheMode==='billing'&&billing?'credits_inverse':'session_prefix_estimate'};
          attemptReports.push(attemptReport);
          return attemptReport;
      }});
      const {decision,decisionError,recovery}=recovered;
      const turn=recovered.turn;
      if(recovery.outcome==='recovered')this.recoveredRequests++;
      // An identical HTTP retry of these outcomes would repeat the same paid loop; a changed request may continue.
      if(['exhausted','repeated_invalid_decision','reasoning_budget'].includes(recovery.outcome)){
        this.exhaustedRequests++;
        record.lastFailedDecision={hash:requestHash,response:turn.response,error:decisionError!,recovery};
        record.replayMessages=request.messages;
      }
      if (decision) {
        record.replayMessages=undefined;
        record.messages = request.messages;
        record.toolSignature = toolSignature;
        record.retryHint = null;
        record.retryMessageHash = null;
        record.lastSuccessHash = requestHash;
        record.lastDecision = decision;
        record.lastFinishReason=turn.finish_reason;
        record.lastCompletionId=randomUUID();
      } else if (!turn.error) {
        record.retryHint = `The preceding model decision was rejected. ${decisionCorrectionPrompt(request,decisionError!,turn.response)}`;
        record.retryMessageHash = requestHash;
      }
      return {record,decision,decisionError,response:turn.response,recovery,completionId:record.lastCompletionId??undefined,report:{...turn,reused_session:reused,
        startup_phases:reused?null:record.startupPhases??null,warm_start:!reused&&(record as RecordSession&{warmStart?:boolean}).warmStart===true,startup_wait_ms:reused?0:(record as RecordSession&{startupWaitMs?:number}).startupWaitMs??0,
        context_reset:'contextReset' in acquired?acquired.contextReset:null,pruned_history_reuse:pruning,prompt_optimization:optimization,
        history_mode:prefix?'delta':'full',sent_message_count:delta.length,
        wall_ms:performance.now()-start,
        credits_delta_source:recovery.attempts>1?'sum_of_decision_attempts':turn.credits_delta_source,
        sent_tool_definition_chars:attemptReports.reduce((n,r)=>n+(r.sent_tool_definition_chars as number),0),
        model_policy_calls:attemptReports.flatMap(r=>r.model_policy_calls as unknown[]),
        assistant_messages:attemptReports.reduce((n,r)=>n+(r.assistant_messages as number),0),
        requests:attemptReports.flatMap(r=>r.requests as unknown[]),
        api_retries:attemptReports.reduce((n,r)=>n+(r.api_retries as number),0),
        api_retry_details:attemptReports.flatMap(r=>r.api_retry_details as unknown[]),
        api_error_categories:attemptReports.flatMap(r=>r.api_error_categories as string[]),
        stream_stop_reasons:[...new Set(attemptReports.flatMap(r=>r.stream_stop_reasons as string[]))],
        sdk_errors:attemptReports.flatMap(r=>r.sdk_errors as string[]),
        model_queue_statuses:attemptReports.flatMap(r=>r.model_queue_statuses as unknown[]),
        stream_usage_snapshots:attemptReports.flatMap(r=>r.stream_usage_snapshots as unknown[]),
        stream_token_counts:attemptReports.flatMap(r=>r.stream_token_counts as unknown[]),
        text_delta_count:attemptReports.reduce((n,r)=>n+(r.text_delta_count as number),0),
        thinking_delta_count:attemptReports.reduce((n,r)=>n+(r.thinking_delta_count as number),0),
        thinking_chars:attemptReports.reduce((n,r)=>n+(r.thinking_chars as number),0),
        ttft_ms:attemptReports[0]!.ttft_ms as number|null,
        first_event_ms:attemptReports[0]!.first_event_ms as number|null,
        decision_recovery:recovery}};
    } finally {
      signal.removeEventListener('abort', abort);
      release();
    }
  }
  closeAll() {
    this.closed=true;clearTimeout(this.warmTimer);
    clearInterval(this.sweeper);
    for(const controller of this.openingControllers)controller.abort();this.openingControllers.clear();
    for(const timer of this.warmTimers.values())clearTimeout(timer);this.warmTimers.clear();this.warmReady.clear();
    for (const record of this.sessions.values()) this.close(record);
    this.nextWarm?.then(record => this.close(record)).catch(() => {});
    for(const pending of this.extraWarm)void pending.then(record=>this.close(record)).catch(()=>{});this.extraWarm=[];
    this.nextWarm = null;
  }
}
