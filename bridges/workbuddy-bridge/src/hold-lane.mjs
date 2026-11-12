// Adapted from the Qoder hold lane; WorkBuddy V2 differences are explicit below.
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { abortable, digest, semanticMessages, stripAcp } from "./context.mjs";
const hasConversationPrefix = (before, after) => before.length <= after.length && before.every((m, i) => digest(semanticMessages([m]).map((x) => ({ ...x, content: typeof x.content === "string" ? stripAcp(x.content) : x.content }))) === digest(semanticMessages([after[i]]).map((x) => ({ ...x, content: typeof x.content === "string" ? stripAcp(x.content) : x.content }))));
import { redactSecrets } from "./rejection-evidence.mjs";
const safeError = (value) => redactSecrets(value?.message ?? String(value));
import { HostBinding, exposedToolName, hostToolTable, pinnedFunction } from "./hold-tools.mjs";
import { choiceRequirement, deltaPrompt, followUpPrompt, fullPrompt, receipt } from "./hold-prompt.mjs";
import {BridgeError} from './errors.mjs';
import { NativeUsage } from "./hold-usage.mjs";
import {scanHoldProtocol,hasHoldDsml,holdPartialAt} from './protocol-text.mjs';
import {NativeTextGate} from './native.mjs';
// Reuse the bounded incremental scan window. Both the stream and terminal
// classification use scanHoldProtocol, including its fence and inline-code mask.
class HoldTextGate extends NativeTextGate {
  quickScan(fresh){
    if(this.line!==this.base)return null;
    if(this.fenced)return {leak:-1,pending:-1,settled:this.base,fenced:true};
    if(fresh.includes('`'))this.inlineLine=this.line;
    if(this.inlineLine===this.line||this.lineHead===null||'`~{<"｜/｟'.includes(this.lineHead)||hasHoldDsml(fresh))return null;
    return {leak:-1,pending:holdPartialAt(this.tail,this.length),settled:this.base,fenced:false};
  }
  fullScan(){
    const {leak,pending,settled}=scanHoldProtocol(this.window.text(),{fenced:this.fenced});
    return {leak:leak<0?-1:this.base+leak,pending:pending<0?-1:this.base+pending,settled:this.base+settled.offset,fenced:settled.fenced};
  }
}
class Inbox {
  items = [];
  wake;
  ended = false;
  push(message) {
    if (this.ended) return;
    this.items.push(message);
    this.wake?.();
  }
  close(error) {
    if(error)this.error=error;this.ended = true;
    this.wake?.();
  }
  async next(signal) {
    for (; ; ) {
      if (this.items.length) return this.items.shift();
      if (this.ended) throw this.error??new Error("WorkBuddy stream closed");
      await abortable(new Promise((resolve) => {
        this.wake = resolve;
      }), signal);
      this.wake = void 0;
    }
  }
}
class WindowError extends Error {
  constructor(message, stage) {
    super(message);
    this.stage = stage;
  }
  stage;
}
const textContent = (content) => {
  if (typeof content === "string") return content;
  if (content == null) return "";
  if (Array.isArray(content)) return content.map((part) => typeof part === "string" ? part : part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "").join("\n");
  return String(content);
};
const emptyTable = () => ({ signature: "[]", tools: [], byExposed: new Map(), byHost: new Map() });
const toolError = (text) => ({ content: [{ type: "text", text }], isError: true });
const TOOL_IMAGE_BYTES = 5 * 1024 * 1024, TOOL_IMAGE_COUNT = 8;
const imageBytes = (data) => Math.floor(data.length * 3 / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
function inlineImage(part) {
  const row = part;
  const source = row?.type === "image" ? row.source : null;
  const url = typeof row?.image_url === "string" ? row.image_url : row?.image_url?.url;
  const raw = url ?? (source?.type === "base64" && source.media_type && source.data ? `data:${source.media_type};base64,${source.data}` : null);
  const match = typeof raw === "string" ? /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(raw) : null;
  if (!match) return { reason: typeof raw === "string" && /^(?:https?:)?\/\//i.test(raw) ? "remote" : "unsupported" };
  return { image: { mimeType: match[1], data: match[2] } };
}
function toolResult(content) {
  if (!Array.isArray(content)) {
    const text2 = textContent(content);
    return { text: text2, isError: text2.startsWith("[tool error] ") };
  }
  const text = [], images = [];
  let dropped = 0;
  for (const part of content) {
    if (typeof part === "string") {
      text.push(part);
      continue;
    }
    const type = part && typeof part === "object" && "type" in part ? String(part.type) : "";
    if (type === "text") {
      const value = part.text;
      if (typeof value === "string") text.push(value);
      continue;
    }
    if (type === "image_url" || type === "image") {
      const found = inlineImage(part);
      if (!found.image) {
        text.push(found.reason === "remote" ? "[The host returned an image from a remote URL; this bridge does not download images, so only this note is shown.]" : "[The host returned an image this bridge cannot inline; only base64 png/jpeg/gif/webp images are forwarded.]");
        continue;
      }
      const bytes = imageBytes(found.image.data);
      if (bytes > TOOL_IMAGE_BYTES) {
        text.push(`[The host returned an image of about ${Math.round(bytes / 1024)} KiB; images over 5 MiB are not forwarded.]`);
        dropped++;
        continue;
      }
      if (images.length >= TOOL_IMAGE_COUNT) {
        text.push("[The host returned more than 8 images for this call; the extra image was not forwarded.]");
        dropped++;
        continue;
      }
      images.push({ type: "image", mimeType: found.image.mimeType, data: found.image.data });
      continue;
    }
  }
  const body = text.join("\n");
  return { text: body, isError: body.startsWith("[tool error] "), ...images.length ? { images } : {}, ...dropped ? { dropped } : {} };
}
const PARALLEL_TRIM = "Only one function call per step is allowed here. Repeat this call in a later step after you have the previous result.";
const choiceCorrection = (pinned) => pinned ? `The host requires exactly the function ${pinned} in this step. Call it now.` : "The host requires a function call in this step. Call one of the host functions now.";
const isProtocol = text=>scanHoldProtocol(text,{final:true}).leak>=0;
const contextWindow = (runtime) => runtime.policyCalls.at(-1)?.context_window ?? null;
const NATIVE_SKIP_REASONS = [
  "tool_mode_json",
  "no_tools",
  "tool_choice_none",
  "response_format",
  "unsupported_content",
  "invalid_tool_choice",
  "non_object_schema",
  "invalid_tool_table"
];
const unsupportedContent = (request) => request.messages.some((message) => Array.isArray(message.content) && message.content.some((part) => part && typeof part === "object" && "type" in part && typeof part.type === "string" && !["text", "image_url"].includes(part.type)));
function nativeSkipReason(request, config) {
  if ((config.toolMode ?? "json") !== "native") return "tool_mode_json";
  if (!request.tools?.length) return "no_tools";
  if (request.tool_choice === "none") return "tool_choice_none";
  if (request.response_format !== void 0) return "response_format";
  const choice = request.tool_choice;
  if (choice !== void 0 && choice !== "auto" && choice !== "required" && pinnedFunction(request) === null) return "invalid_tool_choice";
  if (unsupportedContent(request)) return "unsupported_content";
  try {
    for (const tool of request.tools ?? []) {
      const schema = tool.function.parameters;
      if (schema !== void 0 && (!schema || typeof schema !== "object" || Array.isArray(schema) || Object.hasOwn(schema, "type") && schema.type !== "object")) return "non_object_schema";
    }
    hostToolTable(request);
    return null;
  } catch {
    return "invalid_tool_table";
  }
}
function nativeEligible(request, config) {
  return nativeSkipReason(request, config) === null;
}
function matchResults(step, delta) {
  const results = new Map();
  let index = 0, echo = false;
  const echoMessage = (message) => message.role === "assistant" && (!message.tool_calls?.length || message.tool_calls.every((call) => {
    const id = call && typeof call === "object" && "id" in call ? call.id : void 0;
    return typeof id === "string" && step.hostCalls.includes(id);
  }));
  while (index < delta.length) {
    const message = delta[index];
    if (echoMessage(message)) {
      echo = true;
      index++;
      continue;
    }
    if (message.role === "tool" && message.tool_call_id && step.hostCalls.includes(message.tool_call_id)) {
      if (results.has(message.tool_call_id)) return null;
      results.set(message.tool_call_id, toolResult(message.content));
      index++;
      continue;
    }
    break;
  }
  const trailing = delta.slice(index);
  if (trailing.some((message) => message.role === "tool" || message.role === "assistant" && message.tool_calls?.length)) return null;
  if (!results.size && !echo) return null;
  for (const id of step.hostCalls) if (!results.has(id)) results.set(id, { text: "The host returned no result for this call.", isError: true });
  return { results, trailing };
}
class HoldLane {
  constructor(config, openRuntime, closeRuntime, makeRoom = async()=>{}) {
    this.config = {...config,timeout:config.timeoutMs??1200000,nativeWarmLimit:config.prewarmMs===0?0:(config.nativeWarmLimit??1),blankWarmTtlMs:config.prewarmMs??120000};
    this.timer=setInterval(()=>this.sweepIdle(),60000);this.timer.unref();
    this.openRuntime = openRuntime;
    this.closeRuntime = closeRuntime;
    this.makeRoom = makeRoom;
  }
  config;
  openRuntime;
  closeRuntime;
  makeRoom;
  sessions = new Map();
  byToolId = new Map();
  byClient = new Map();
  warm = [];
  hint;
  hintMaxTokens;
  closed = false;
  counters = {
    rebuilds: 0,
    replays: 0,
    handoff_stops: 0,
    invalid_calls: 0,
    late_followups: 0,
    awaiting_expired: 0,
    warm_hit_not_ready: 0,
    warm_expired: 0
  };
  /** A warm entry expired by TTL since the last session was created; reported as the next miss reason. */
  warmExpired = false;
  /** Conversation lanes released by the awaiting TTL, so the next request can report `expired`. */
  expiredLanes = new Map();
  /** Why the last warm start failed; a dropped entry would otherwise look like "no entry". */
  warmFailure = null;
  limit(name) {
    const defaults = { nativeResultCharLimit: 4e4, nativeMcpOutputTokens: 1e6, nativeMaxTurns: 1e5, nativeWarmLimit: 1, nativeInvalidRounds: 3 };
    return this.config[name] ?? defaults[name];
  }
  stats() {
    return {...this.capacity(),
      sessions: this.sessions.size,
      awaiting: [...this.sessions.values()].filter((s) => s.state === "awaiting").length,
      warm_ready: this.warm.filter((w) => w.ready).length,
      warm_pending: this.warm.filter((w) => !w.ready).length,
      ...this.counters
    };
  }
  capacity() {
    const rows=[...this.sessions.values()];
    return {busy:rows.filter(s=>s.busy).length,awaiting:rows.filter(s=>!s.busy&&s.state==='awaiting').length,idle:rows.filter(s=>!s.busy&&s.state!=='awaiting').length};
  }
  bindTool(id) {
    const owner = this.byToolId.get(id);
    return owner ? this.sessions.get(owner) : void 0;
  }
  related(request) {
    if (typeof request.bridge_scope === "string") return [...this.sessions.values()].filter((s) => s.bridgeScope === request.bridge_scope && s.clientKey === request.prompt_cache_key);
    if (request.prompt_cache_key) {
      const s = this.sessions.get(this.byClient.get(request.prompt_cache_key) ?? "");
      return s && s.bridgeScope === void 0 ? [s] : [];
    }
    const owners = new Set(request.messages.flatMap((m) => [m.tool_call_id, ...(m.tool_calls ?? []).flatMap((c) => c && typeof c === "object" && "id" in c && typeof c.id === "string" ? [c.id] : [])]).flatMap((id) => id ? [this.byToolId.get(id)] : []));
    return [...this.sessions.values()].filter((s) => s.bridgeScope === void 0 && (owners.has(s.id)||!request.prompt_cache_key&&hasConversationPrefix(s.hostMessages,request.messages)));
  }
  candidate(request, table) {
    const candidates = this.related(request).filter((s) => s.state !== "closed" && s.signature === table.signature && s.runtimeKey===request._holdKey && hasConversationPrefix(s.hostMessages, request.messages)).sort((a, b) => b.hostMessages.length - a.hostMessages.length);
    if (candidates.length > 1 && candidates[0].hostMessages.length === candidates[1].hostMessages.length) return void 0;
    return candidates[0];
  }
  close(session) {
    if (session.state === "closed") return;
    session.state = "closed";
    this.sessions.delete(session.id);
    session.binding.attach(void 0);
    for (const [id, owner] of this.byToolId) if (owner === session.id) this.byToolId.delete(id);
    for (const [key, owner] of this.byClient) if (owner === session.id) this.byClient.delete(key);
    for (const handler of [...session.pendingHandlers, ...session.step?.handlers ?? []]) this.resolveHandler(handler, "Host session is not available.");
    session.pendingHandlers = [];
    session.inbox.close();
    this.disposeRuntime(session.runtime);
  }
  closeIdleForCapacity() {
    const rows = [...this.sessions.values()].filter((s) => !s.busy && (s.state!=='awaiting'||Date.now()-s.touched>(this.config.awaitingIdleMs??600000))).sort((a, b) => Number(a.state === "awaiting") - Number(b.state === "awaiting") || a.touched - b.touched);
    if (rows[0]) {
      this.close(rows[0]);
      return true;
    }
    return false;
  }
  sweepIdle() {
    const idle = this.config.sessionIdleMs ?? 36e5, awaiting = this.config.awaitingIdleMs ?? 6e5;
    for (const session of this.sessions.values()) {
      if (session.busy) continue;
      const age = Date.now() - session.touched;
      if (session.state === "awaiting" && age > awaiting) {
        this.counters.awaiting_expired++;
        if (session.lane) this.expiredLanes.set(session.lane, Date.now());
        this.close(session);
        continue;
      }
      if (age > idle) {if(session.lane)this.expiredLanes.set(session.lane,Date.now());this.close(session);}
    }
    if (this.expiredLanes.size > 64) {
      const cut = Date.now() - 36e5;
      for (const [lane, at] of this.expiredLanes) if (at < cut) this.expiredLanes.delete(lane);
    }
  }
  dropWarm(entry) {
    clearTimeout(entry.timer);
    this.warm = this.warm.filter((row) => row !== entry);
    entry.binding.startupController?.abort();
    const pending=entry.pending.then((runtime)=>this.disposeRuntime(runtime),()=>{});this.cleanupTasks.add(pending);void pending.finally(()=>this.cleanupTasks.delete(pending)).catch(()=>{});
  }
  cleanupTasks=new Set();
  disposeRuntime(runtime){
    const pending=Promise.resolve(this.closeRuntime(runtime));this.cleanupTasks.add(pending);
    void pending.finally(()=>this.cleanupTasks.delete(pending)).catch(()=>{});return pending;
  }
  async closeAll() {
    this.closed = true;clearInterval(this.timer);
    for (const session of [...this.sessions.values()]) this.close(session);
    for (const entry of [...this.warm]) this.dropWarm(entry);
    while(this.cleanupTasks.size)await Promise.allSettled([...this.cleanupTasks]);
  }
  // WorkBuddy keeps a session-level tool snapshot. Warm with the latest hinted
  // table and serve only a matching table and startup configuration.
  replenish() {
    if (this.closed || !this.hint || this.warm.length >= this.limit("nativeWarmLimit")) return;
    const hint = this.hint, maxTokens = this.hintMaxTokens, binding = new HostBinding();
    binding.provide(hint);binding.context=this.hintContext;
    const pending = this.openRuntime(binding, hint, hint.tools.map((t) => t.exposed), maxTokens);
    const entry = {
      binding,
      signature: hint.signature,runtimeKey:this.hintKey,
      maxTokens,
      table: hint,
      pending,
      ready: false,
      timer: setTimeout(() => {
        this.warmExpired = true;
        this.dropWarm(entry);
      }, this.config.blankWarmTtlMs ?? 12e4)
    };
    entry.timer.unref();
    this.warm.push(entry);
    void pending.then(() => {
      entry.ready = true;
    }, (error) => {
      clearTimeout(entry.timer);
      this.warmFailure = redactSecrets(safeError(error),binding.context?.credential).slice(0, 160);
      this.warm = this.warm.filter((row) => row !== entry);
    });
  }
  async create(request, table, context, signal) {
    const maxTokens = request.max_tokens;
    this.sweepIdle();
    const releaseSlot=await this.makeRoom(request.bridge_scope);
    try{
    while(this.sessions.size>=(this.config.maxSessions??24)){
      if(!this.closeIdleForCapacity()){const counts=this.capacity();throw new BridgeError(429,'sessions_busy',`All context slots are active (busy=${counts.busy}, awaiting=${counts.awaiting}, idle=${counts.idle})`,counts);}
    }
    this.hintContext=context;this.hintKey=request._holdKey;
    this.hint = table;
    this.hintMaxTokens = maxTokens;
    let runtime, binding, warmStart = false, warmHitNotReady = false, warmMissReason = null;
    const entry = this.warm.find((row) => row.signature === table.signature && row.maxTokens === maxTokens && row.runtimeKey===request._holdKey);
    const hadWarm=this.warm.length>0,optionMismatch=this.warm.some(row=>row.signature===table.signature&&row.runtimeKey!==request._holdKey);
    const limitMismatch = !entry && this.warm.some((row) => row.signature === table.signature&&row.maxTokens!==maxTokens);
    for (const other of [...this.warm]) if (other !== entry) this.dropWarm(other);
    if (entry) {
      const ready = entry.ready;
      clearTimeout(entry.timer);
      this.warm = this.warm.filter((row) => row !== entry);
      binding = entry.binding;
      try {
        runtime = await abortable(entry.pending,signal);
        warmStart = ready;
        warmHitNotReady = !ready;if(!ready)warmMissReason="not_ready";
        if (ready) this.warmFailure = null;
        else this.counters.warm_hit_not_ready++;
      } catch(error) {
        if(signal.aborted){void entry.pending.then(runtime=>this.disposeRuntime(runtime),()=>{});throw error;}
        binding = new HostBinding();
        binding.provide(table);binding.context=context;binding.openSignal=signal;
        runtime = await this.openRuntime(binding, table, table.tools.map((t) => t.exposed), maxTokens);
        warmMissReason = "warm_start_failed";
      }
    } else {
      warmMissReason = limitMismatch ? "output_limit_mismatch" : optionMismatch?"runtime_options_mismatch":hadWarm ? "tool_table_mismatch" : this.warmExpired ? "expired" : this.warmFailure ? "warm_start_failed" : "no_warm_entry";
      binding = new HostBinding();
      binding.provide(table);binding.context=context;binding.openSignal=signal;
      runtime = await this.openRuntime(binding, table, table.tools.map((t) => t.exposed), maxTokens);
    }
    this.warmExpired = false;
    const inbox = new Inbox();
    let session;
    session = {
      id: runtime.id,runtimeKey:request._holdKey,
      runtime,
      binding,
      inbox,
      table,
      signature: table.signature,
      bridgeScope: request.bridge_scope,
      clientKey: request.bridge_scope ? request.prompt_cache_key : void 0,
      reasoning: this.config.reasoning ?? null,
      hostMessages: [],
      state: "idle",
      step: null,
      lastReply: null,
      lastFinalText: null,
      pendingHandlers: [],
      busy: 0,
      locked: Promise.resolve(),
      touched: Date.now(),
      sdkSessionId: null,
      lastCredits: null,
      contextUsageRatio: null,
      lastPromptTokens: null,
      closed: false,
      onHandler: (name, input, resolve, signal) => this.onHandler(session, name, input, resolve, signal),
      pinned: null,
      requiresCall: false,
      parallelOff: false,
      warmHitNotReady,
      warmMissReason,
      lane: request.prompt_cache_key ? `${request.bridge_scope ?? ""}|${request.prompt_cache_key}` : void 0,
      windowStats: { parallel_trimmed: 0, ambiguous_binding: 0, tool_images: 0, tool_images_dropped: 0 },
      maxTokens
    };
    this.sessions.set(session.id, session);
    if (request.prompt_cache_key && !request.bridge_scope) this.byClient.set(request.prompt_cache_key, session.id);
    binding.attach(session);
    void (async () => {
      try {
        for await (const message of runtime.q) inbox.push(message);
      } catch(error) {
        inbox.close(error);
      } finally {
        inbox.close();
      }
    })();
    this.replenish();
    return { session, warmStart, warmHitNotReady, warmMissReason };
    }finally{releaseSlot?.();}
  }
  resolveHandler(handler, text, isError = true) {
    if (handler.done) return;
    handler.done = true;
    handler.resolve(toolError(text));
  }
  onHandler(session, name, input, resolve, signal) {
    const tool = exposedToolName(session.table, name), handler = { name: tool?.exposed ?? name.replace(/^mcp__host__/, ""), input, resolve };
    const abort = () => this.resolveHandler(handler, "Cancelled by the host");
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
    const original = handler.resolve;
    handler.resolve = (result) => {
      signal.removeEventListener("abort", abort);
      original(result);
    };
    session.pendingHandlers.push(handler);
    this.settle(session);
  }
  /** A handler can enter before its response is parsed from the stream (the MCP call overtakes the inbox), so it
   * waits unbound until the current step has a free call for it. The runtime finishes every handler of a step
   * before the next model request, so an unbound handler never belongs to an older step. */
  settle(session) {
    const step = session.step;
    if (!step) return;
    const free = (call) => !step.handlers.some((h) => h.boundId === call.id);
    for (const handler of [...session.pendingHandlers]) {
      if (!handler.done) {
        const candidates = step.calls.filter((c) => c.exposed === handler.name && free(c));
        const exact = candidates.find((c) => isDeepStrictEqual(inputValue(handler.input), c.input));
        const call = exact ?? candidates[0];
        if (!call) continue;
        if (!exact && candidates.length > 1) session.windowStats.ambiguous_binding++;
        handler.boundId = call.id;
        step.handlers.push(handler);
      }
      session.pendingHandlers.splice(session.pendingHandlers.indexOf(handler), 1);
    }
    for (const handler of step.handlers) {
      if (handler.done || !handler.boundId) continue;
      const result = step.results.get(handler.boundId);
      if (result) {
        handler.done = true;
        handler.resolve({ content: [{ type: "text", text: result.text }, ...result.images ?? []], ...result.isError ? { isError: true } : {} });
      }
    }
  }
  preToolUse(binding, input) {
    const session = binding.session;
    return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: session && exposedToolName(session.table, input.tool_name ?? "") ? "allow" : "deny" } };
  }
  canUseTool(binding, name, input) {
    const session = binding.session;
    return session && exposedToolName(session.table, name) ? { behavior: "allow", updatedInput: input } : { behavior: "deny", message: "Only host tools are available." };
  }
  /** Stop the runtime turn after the step's last host call (invalid calls may or may not fire PostToolUse). */
  postToolUse(binding, input) {
    const session = binding.session, step = session?.step;
    if (!step) return {};
    // WorkBuddy changes hook IDs after PreToolUse. Bind post hooks by name + input, then name.
    const tool=exposedToolName(session.table,input?.tool_name??'');
    const free=step.calls.filter(c=>c.exposed===tool?.exposed&&!step.posted.has(c.id));
    let args=inputValue(input?.tool_input);
    if(!tool?.inputSchema?.properties?.__toolCallId){const {__toolCallId,...rest}=args;args=rest;}
    const call=free.find(c=>isDeepStrictEqual(args,c.input))??free[0],id=call?.id;
    if (typeof id === "string") {step.posted.add(id);} else if(!input?.tool_use_id&&!input?.tool_name)step.postToolUse++;
    if (step.stopAfter && step.posted.size + step.postToolUse >= step.calls.length) return { continue: false, stopReason: "Host handoff: the next host message carries the rest." };
    return {};
  }
  push(session, content) {
    session.runtime.queue.push({ type: "user", parent_tool_use_id: null, message: { role: "user", content } });
  }
  finishStep(session, response) {
    const calls = response.announced.map((announced) => {
      const complete = response.complete.get(announced.id);
      const tool = exposedToolName(session.table, announced.name);
      const input = complete?.input ?? {};
      let valid = !!complete && !!tool && !!input && typeof input==='object' && !Array.isArray(input), error;
      if (valid && !tool.validate(input)) {
        valid = false;
        error = (tool.validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`).join("; ");
        stepResultError(error);
      }
      return { id: announced.id, exposed: tool?.exposed ?? announced.name.replace(/^mcp__host__/, ""), host: tool?.host ?? announced.name, input, valid, ...error ? { error } : {} };
    });
    const step = { responseId: response.id, calls, hostCalls: [], text: response.text, results: new Map(), handlers: [], postToolUse: 0, posted: new Set(), stopAfter: false, followUp: null };
    for (const call of calls) if (!call.valid) {
      const text = `Arguments do not match the function schema: ${call.error ?? "unknown tool or incomplete call"}. Call it again with corrected arguments.`;
      step.results.set(call.id, { text, isError: true });
      this.counters.invalid_calls++;
    }
    let accepted = calls.filter((call) => call.valid), violation = false;
    if (session.pinned) {
      if (accepted.length === 1 && accepted[0].host === session.pinned) accepted = accepted.slice(0, 1);
      else {
        violation = true;
        accepted = [];
        for (const call of calls.filter((c) => c.valid)) step.results.set(call.id, { text: choiceCorrection(session.pinned), isError: true });
      }
    } else if (session.requiresCall && !accepted.length) violation = true;
    if (session.parallelOff && accepted.length > 1) {
      for (const call of accepted.slice(1)) {
        step.results.set(call.id, { text: PARALLEL_TRIM, isError: true });
        session.windowStats.parallel_trimmed++;
      }
      accepted = accepted.slice(0, 1);
    }
    step.hostCalls = accepted.map((call) => call.id);
    const unsent = session.step?.stopAfter ? session.step.followUp : null;
    if (unsent) {
      this.push(session, unsent.images.length ? [{ type: "text", text: unsent.text }, ...unsent.images] : unsent.text);
      this.counters.late_followups++;
    }
    session.step = step;
    for (const call of step.hostCalls) this.byToolId.set(call, session.id);
    this.settle(session);
    return { step, violation };
  }
  async readWindow(session, request, hooks, signal, window, warmStart, oversized = 0, trailing = 0) {
    const usage = new NativeUsage(), order = [];
    let current, last;
    let waitingForResponseStart=window==='results';
    let invalidRounds = 0, protocolCorrected = false, handoffStop = false, resultMessage;
    const policyStart = session.runtime.policyCalls.length;
    session.state = "running";
    const idleMs = idleTimeout(this.config), stall = new AbortController(), stream = AbortSignal.any([signal, stall.signal]);
    let idleTimer;
    const arm = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleTimer = void 0;
        stall.abort(new WindowError(`WorkBuddy produced no upstream event for ${Math.round(idleMs / 1e3)} s; the upstream stalled.`, "upstream_stalled"));
      }, idleMs);
    };
    arm();
    // message_start is the model-response boundary. WorkBuddy's split assistant
    // snapshots have different message IDs, including an initial empty snapshot.
    const newResponse = () => {
      const response = { id:`response-${order.length+1}`, text:"", streamed:false, stop:null, sawToolUse:false, handed:false, announced:[], complete:new Map() };
      response.gate=new HoldTextGate(text=>hooks.onText?.(text),{enabled:!session.requiresCall&&!session.pinned,announce:false,canStreamFinal:this.config.canStreamFinal});
      order.push(response);
      return response;
    };
    const stop=(response,reason)=>{
      if(!reason)return;
      if(reason==='tool_use')response.sawToolUse=true;
      if(response.stop!=='tool_use'||reason==='tool_use')response.stop=reason;
    };
    const readyCalls=response=>{
      if(!response?.sawToolUse||response.handed||!response.complete.size)return null;
      const complete=[...response.complete.values()];
      if(!response.announced.length)return complete;
      if(complete.length<response.announced.length)return null;
      if(complete.length>response.announced.length)throw new BridgeError(502,'sdk_incomplete','Native assistant call count exceeds the calls announced by the stream');
      // Reserve exact IDs first. Only unmatched announcements use the remaining
      // full assistant calls in order; host IDs and arguments come from assistant.
      const exact=new Set(response.announced.filter(c=>response.complete.has(c.id)).map(c=>c.id));
      const unmatched=complete.filter(c=>!exact.has(c.id));
      return response.announced.map(c=>response.complete.get(c.id)??unmatched.shift());
    };
    const emitText = (response, text) => {
      response.text += text;
      response.gate.push(text);
    };
    const finishText=response=>{
      // A required/pinned window's text becomes publishable only after its call
      // contract passes. Rebuild the disabled gate with the complete text then.
      if(!response.gate.enabled){response.gate=new HoldTextGate(text=>hooks.onText?.(text),{announce:false});response.gate.push(response.text);}
      const leak=scanHoldProtocol(response.text,{final:true}).leak;
      if(leak>=0){response.gate.release(leak);response.gate.blocked=true;return response.gate.emittedText;}
      response.gate.pump(true);
      return response.gate.emittedText;
    };
    try {
      for (; ; ) {
        const message = await session.inbox.next(stream);hooks.onActivity?.();
        arm();
        session.sdkSessionId = message.session_id ?? session.sdkSessionId;
        // A host-result window can first receive the held response's late SDK
        // snapshots/bookkeeping. Only a new message_start opens a model response.
        if(waitingForResponseStart){
          if(message.type==='stream_event'&&message.event?.type==='message_start')waitingForResponseStart=false;
          else if(message.type==='stream_event'||message.type==='assistant'&&!message.isApiErrorMessage)continue;
        }
        if (message.type === "system" && message.subtype === "api_retry") hooks.onStatus?.(`[WorkBuddyBridge] WorkBuddy upstream retry ${message.attempt}/${message.max_retries}${typeof message.error_status === "number" ? ` (HTTP ${message.error_status})` : ""}; next attempt in ${Math.max(0, Math.round(message.retry_delay_ms / 1e3))}s.`);
        if (message.type === "stream_event") {
          const event = message.event;
          if (event.type === "message_start") current = newResponse();
          if (event.type === "content_block_start" && event.content_block?.type === "tool_use" && event.content_block.id) {
            current ??= newResponse();
            if (!current.announced.some((call) => call.id === event.content_block.id)) current.announced.push({ id: event.content_block.id, name: event.content_block.name ?? "" });
          }
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
            current ??= newResponse();
            current.streamed = true;
            emitText(current, event.delta.text);
          }
          if (event.type === "content_block_delta" && event.delta?.type === "thinking_delta" && event.delta.thinking) hooks.onThinking?.(event.delta.thinking);
          if (event.type === "message_delta") {
            current ??= newResponse();
            stop(current,event.delta?.stop_reason);
            last = current;
          }
        }
        if (message.type === "assistant" && !message.isApiErrorMessage) {
          const response = current ??= newResponse();
          last = response;
          stop(response,message.message.stop_reason);
          const text = message.message.content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("");
          if (text && !response.streamed) emitText(response, text);
          for (const part of message.message.content) if (part.type === "tool_use" && part.id) {
            response.complete.set(part.id, { id: part.id, name: part.name ?? "", input: part.input ?? {} });
          }
        }
        usage.observe(message,contextWindow(session.runtime),current?.id);hooks.onUsage?.(usage.snapshot());
        const calls=readyCalls(current);
        if (calls) {
          current.handed=true;last=current;
          const response={...current,announced:calls.map(c=>({id:c.id,name:c.name})),complete:new Map(calls.map(c=>[c.id,c]))};
          const { step, violation } = this.finishStep(session, response);
          for (const call of step.calls) usage.toolInput(last.id, JSON.stringify(call.input).length);
          if (step.hostCalls.length) {
            // Printed duplicate markup beside real calls is never flushed into
            // either SSE deltas or the stored/replayed host reply.
            step.text=finishText(last);
            session.state = "awaiting";
            session.hostMessages = request.messages;
            const reply = { kind: "tool_calls", calls: step.calls.filter((c) => step.hostCalls.includes(c.id)).map((c) => ({ id: c.id, name: c.host, arguments: JSON.stringify(c.input) })), content: step.text };
            session.lastReply = reply;
            return { reply, report: this.report(session, request, usage, resultMessage, { window, warmStart, calls: step.calls.length, hostCalls: step.hostCalls.length, invalidRounds, handoffStop, oversized, trailing, policyStart }), usage, resultMessage };
          }
          invalidRounds++;
          last = void 0;
          if (invalidRounds >= this.limit("nativeInvalidRounds")) throw new WindowError(violation ? "Native steps repeatedly missed the required host function." : "Native tool arguments remained invalid.", "native_invalid_calls");
        }
        if (message.type === "result") {
          resultMessage = message;
          current=undefined;
          if (session.step?.stopAfter) {
            if (message.subtype !== "success" || message.is_error) throw new WindowError(`WorkBuddy result: ${message.subtype}`, "native");
            const follow = session.step.followUp;
            session.step.stopAfter = false;
            session.step.followUp = null;
            if (follow) this.push(session, follow.images.length ? [{ type: "text", text: follow.text }, ...follow.images] : follow.text);
            handoffStop = true;
            this.counters.handoff_stops++;
            continue;
          }
          if (message.subtype !== "success" || message.is_error) throw new WindowError(`WorkBuddy result: ${message.subtype}`, "native");
          if(last?.sawToolUse&&!last.handed)throw new BridgeError(502,'sdk_incomplete','Native turn ended before all announced tool calls had complete assistant arguments');
          const content = last?.text ?? "";
          if (isProtocol(content)) {
            if (protocolCorrected) throw new WindowError("Native model repeatedly wrote tool protocol as text.", "native_protocol_text");
            protocolCorrected = true;
            this.push(session, "Call the host functions through native function calling; do not write calls or markup as text. Continue the task.");
            for (const response of order) {
              response.text = "";
            }
            last = void 0;
            continue;
          }
          if ((session.requiresCall || session.pinned) && !last?.announced.length) {
            invalidRounds++;
            if (invalidRounds >= this.limit("nativeInvalidRounds")) throw new WindowError("Native steps repeatedly missed the required host function.", "native_invalid_calls");
            this.push(session, choiceCorrection(session.pinned));
            last = void 0;
            continue;
          }
          try{this.config.guardDecision?.({action:'final',kind:'final',content},request);}catch(error){
            if(error.code!=='unfinished_turn')throw error;
            invalidRounds++;
            if(invalidRounds>=this.limit('nativeInvalidRounds'))throw new WindowError('Native model repeatedly ended with only a progress announcement.','unfinished_turn');
            this.push(session,'Your preceding turn only announced the next action. Call the required host function natively now, or provide the complete requested answer.');
            last=undefined;continue;
          }
          if(last)finishText(last);
          const reply = { kind: "final", content, finish: last?.stop === "max_tokens" ? "length" : "stop" };
          session.lastReply = reply;
          session.lastFinalText = content;
          session.state = "idle";
          session.hostMessages = request.messages;
          session.step = null;
          for (const handler of session.pendingHandlers.splice(0)) this.resolveHandler(handler, "Unknown call");
          return { reply, report: this.report(session, request, usage, resultMessage, { window, warmStart, calls: 0, hostCalls: 0, invalidRounds, handoffStop, oversized, trailing, policyStart }), usage, resultMessage };
        }
      }
    } catch (error) {
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), { usage, resultMessage, policyStart, window, warmStart, invalidRounds, handoffStop, oversized, trailing });
    } finally {
      if (idleTimer) clearTimeout(idleTimer);
    }
  }
  report(session, request, usage, result, meta, error) {
    const total = result?.type === "result" && typeof result.total_credits === "number" ? result.total_credits : session.lastCredits;
    const measured = usage.snapshot(this.config, session.lastPromptTokens);
    session.lastPromptTokens = measured.client_usage?.prompt_tokens ?? session.lastPromptTokens;
    if (total !== null) session.lastCredits = total;
    const rows = measured.rows;
    session.contextUsageRatio = rows.at(-1)?.context_usage_ratio ?? session.contextUsageRatio;
    const windowStats = session.windowStats;
    session.windowStats = { parallel_trimmed: 0, ambiguous_binding: 0, tool_images: 0, tool_images_dropped: 0 };
    const native = {mode:"hold",
      session_id: session.sdkSessionId,
      window: meta.window,
      calls: meta.calls,
      host_calls: meta.hostCalls,
      invalid_calls: meta.invalidRounds,
      handoff_stop: meta.handoffStop,
      oversized_results: meta.oversized,
      trailing_messages: meta.trailing,
      rebuild_reason: session.rebuildReason ?? null,
      tools_changed: session.toolsChanged ?? null,
      warm_start: meta.warmStart,
      warm_hit_not_ready: session.warmHitNotReady,
      warm_miss_reason: session.warmMissReason,
      parallel_trimmed: windowStats.parallel_trimmed,
      ambiguous_binding: windowStats.ambiguous_binding,
      tool_images: windowStats.tool_images,
      tool_images_dropped: windowStats.tool_images_dropped,
      // The runtime's output limit is fixed at startup: a later request that asks for another one is reported, not applied.
      max_tokens_mismatch: request.max_tokens !== void 0 && request.max_tokens !== session.maxTokens,
      native_skip_reason: null,
      tools_registered: session.table.tools.length,
      model_responses: rows.length
    };
    return {
      mode:"hold",harness_tool_count:request.tools?.length??0,slot_counts:this.capacity(),
      request_id: randomUUID(),
      session_id: session.sdkSessionId,
      model: session.runtime.model,
      stage: error?.stage ?? "native",
      error: error?.message ?? null,
      response: session.lastReply?.content ?? "",
      result: result?.type === "result" ? result.subtype : "incomplete",
      sdk_errors: result?.type === "result" && "errors" in result ? result.errors?.map(safeError) ?? [] : [],
      sdk_error_code: result?.type === "result" ? result.error_code ?? null : null,
      api_error_categories: usage.apiErrors.map(apiErrorCategory),
      stream_stop_reasons: rows.flatMap((row) => row.stop_reason ? [row.stop_reason] : []),
      credits_delta: measured.credits,
      credits: measured.credits,
      total_session_credits: total,
      normalized_usage: measured.client_usage,
      normalized_usage_source: measured.usage_source,
      client_usage: measured.client_usage,
      client_cache_usage: measured.client_cache_usage,
      cache_estimate_tokens: measured.cache_estimate_tokens,
      cache_estimate_ratio: measured.cache_estimate_ratio,
      usage_source: measured.usage_source,
      reasoning_tokens: measured.reasoning_tokens,
      context_usage_ratio: session.contextUsageRatio,
      prompt_tokens_all_responses: measured.prompt_tokens_all_responses,
      model_requests: rows.length,
      model_requests_known: rows.length,
      model_request_count_source: "native response IDs",
      requests: rows,
      policy_calls: session.runtime.policyCalls.slice(meta.policyStart),
      model_policy_calls: session.runtime.policyCalls.slice(meta.policyStart),
      native,
      reused_session: meta.window !== "new",
      local_response_replay: false,
      warm_start: meta.warmStart,
      startup_phases: meta.window === "new" ? session.runtime.startupPhases ?? null : null,
      history_mode: meta.window === "new" ? "full" : "delta",
      sent_message_count: meta.window === "results" ? 0 : request.messages.length,
      prompt_chars: 0,
      available_tool_definition_chars: JSON.stringify(request.tools ?? []).length,
      sent_tool_definition_chars: meta.window==="new"?JSON.stringify(request.tools??[]).length:0,
      tool_definitions_reused: true,
      tool_detail_mode: "native",
      wall_ms: 0
    };
  }
  async cancel(session, request) {
    // R3: interrupt drains handlers, but this V2 process cannot accept another turn.
    try{await abortable(session.runtime.q.interrupt(),AbortSignal.timeout(5000));}catch{}
    for(const handler of [...session.pendingHandlers,...session.step?.handlers??[]])this.resolveHandler(handler,'Cancelled by the host');
    session.pendingHandlers=[];session.step=null;session.lastReply=null;
    session.state='idle';session.hostMessages=request.messages;session.cancelled=true;
    this.disposeRuntime(session.runtime); // retain conversation ownership until the next request rebuilds it
  }
  allocation=Promise.resolve();
  async infer(request,hooks={}){
    this.sweepIdle();
    const previous=this.allocation;let release;
    this.allocation=new Promise(resolve=>{release=resolve;});
    try{await abortable(previous,hooks.signal??new AbortController().signal);}
    catch(error){void previous.finally(release);throw error;}
    const candidate=this.candidate(request,hostToolTable(request));
    if(candidate?.busy){release();await abortable(candidate.locked,hooks.signal??new AbortController().signal);return this.infer(request,hooks);}
    try{return await this.inferAllocated(request,{...hooks,releaseAllocation:release});}finally{release();}
  }
  async inferAllocated(request, hooks = {}) {
    const table = hostToolTable(request), reasoning = request.reasoning_effort??hooks.reasoningEffort ?? this.config.reasoning ?? null;
    const signal = AbortSignal.any([AbortSignal.timeout(this.config.timeout), ...hooks.signal ? [hooks.signal] : []]);
    let session, warmStart = false, window = "new", rebuildReason;
    for (; ; ) {
      const candidate = this.candidate(request, table);
      if (candidate?.busy) {
        await abortable(candidate.locked, signal);
        continue;
      }
      session = candidate;
      break;
    }
    if (session && !session.busy && (session.cancelled||request.messages.length === session.hostMessages.length && !session.lastReply)) {
      rebuildReason = "retry_after_cancel";
      this.counters.rebuilds++;
      this.close(session);
      session = void 0;
    }
    if (session) {
      const delta = request.messages.slice(session.hostMessages.length);
      if (!delta.length && session.lastReply && session.requestContract===digest({choice:request.tool_choice??"auto",parallel:request.parallel_tool_calls??true})) {
        this.counters.replays++;
        session.touched = Date.now();
        return { record: session, reply: session.lastReply, report: { ...this.report(session, request, new NativeUsage(), void 0, { window: "continue", warmStart: false, calls: 0, hostCalls: 0, invalidRounds: 0, handoffStop: false, oversized: 0, trailing: 0, policyStart: session.runtime.policyCalls.length }), stage: "native_replay", local_response_replay: true, credits_delta: 0, model_requests: 0, normalized_usage: null, client_usage: null, client_cache_usage: "omitted" } };
      }
      if (session.state === "awaiting" && (session.reasoning !== reasoning || !matchResults(session.step, delta))) {
        rebuildReason = session.reasoning !== reasoning ? "superseded" : "history_rewritten";
        this.counters.rebuilds++;
        this.close(session);
        session = void 0;
      } else if (session.state === "awaiting") window = "results";
      else window = "continue";
    }
    const key = request.prompt_cache_key, resultIds = new Set(request.messages.flatMap((m) => m.role === "tool" && m.tool_call_id ? [m.tool_call_id] : []));
    const superseded = (old) => !old.busy && (!!key && (request.bridge_scope ? old.clientKey === key : this.byClient.get(key) === old.id) || old.state === "awaiting" && !!old.step && old.step.hostCalls.some((id) => resultIds.has(id)));
    let toolsChanged;
    if (!session) {
      for (const old of this.related(request)) if (superseded(old)) {
        rebuildReason = old.cancelled?"retry_after_cancel":old.signature !== table.signature ? "tools_changed" : !hasConversationPrefix(old.hostMessages, request.messages) ? "history_rewritten" : "superseded";
        if (old.signature !== table.signature) toolsChanged = diffTools(old.table, table);
        this.counters.rebuilds++;
        this.close(old);
      }
      const lane = laneOf(request);
      if (!rebuildReason) {
        rebuildReason = lane && this.expiredLanes.has(lane) ? "expired" : "new_conversation";
        if (lane) this.expiredLanes.delete(lane);
      }
      const created = await this.create(request, table, hooks.runtimeContext,signal);
      session = created.session;
      session.rebuildReason = rebuildReason;
      session.toolsChanged = toolsChanged;
      warmStart = created.warmStart;
      window = "new";
    }
    session.requestContract=digest({choice:request.tool_choice??"auto",parallel:request.parallel_tool_calls??true});
    session.reasoning = reasoning;
    session.runtime.policy.reasoning = reasoning;
    session.pinned = pinnedFunction(request);
    session.requiresCall = request.tool_choice === "required";
    session.parallelOff = request.parallel_tool_calls === false;
    session.busy++;hooks.releaseAllocation?.();
    let unlock;
    session.locked = new Promise((resolve) => {
      unlock = resolve;
    });
    const started = performance.now();
    let usage = new NativeUsage(), resultMessage, meta = { window, warmStart, calls: 0, hostCalls: 0, invalidRounds: 0, handoffStop: false, oversized: 0, trailing: 0, policyStart: session.runtime.policyCalls.length };
    try {
      signal.throwIfAborted();
      let matched = null;
      if (window === "new") this.push(session, fullPrompt(request, choiceRequirement(request, session.pinned)));
      else if (window === "continue") this.push(session, deltaPrompt(request.messages.slice(session.hostMessages.length), session.lastFinalText, choiceRequirement(request, session.pinned)));
      else {
        const delta = request.messages.slice(session.hostMessages.length);
        matched = matchResults(session.step, delta);
        if (!matched) throw new WindowError("Host results do not match the pending native calls.", "native");
        const step = session.step, large = [];
        for (const [id, result] of matched.results) {
          session.windowStats.tool_images += result.images?.length ?? 0;
          session.windowStats.tool_images_dropped += result.dropped ?? 0;
          if (result.text.length > this.limit("nativeResultCharLimit")) {
            const call = step.calls.find((c) => c.id === id);
            large.push({ id, host: call?.host ?? id, text: result.text });
            step.results.set(id, { text: receipt(result.text.length), isError: result.isError, ...result.images?.length ? { images: result.images } : {}, ...result.dropped ? { dropped: result.dropped } : {} });
          } else step.results.set(id, result);
        }
        const oversized = large.length, trailing = matched.trailing.length;
        if (large.length || matched.trailing.length) {
          step.stopAfter = true;
          step.followUp = followUpPrompt(large, matched.trailing);
        }
        this.settle(session);
        meta = { ...meta, calls: step.calls.length, hostCalls: step.hostCalls.length, oversized, trailing };
      }
      const completed = await this.readWindow(session, request, hooks, signal, window, warmStart, meta.oversized, meta.trailing);
      completed.report.wall_ms = performance.now() - started;
      session.rebuildReason = void 0;
      session.toolsChanged = void 0;
      return { record: session, ...completed };
    } catch (cause) {
      const error = cause;
      usage = error.usage ?? usage;
      resultMessage = error.resultMessage ?? resultMessage;
      meta = { ...meta, policyStart: error.policyStart ?? meta.policyStart, invalidRounds: error.invalidRounds ?? 0, handoffStop: error.handoffStop ?? false, oversized: error.oversized ?? 0, trailing: error.trailing ?? 0 };
      const stalled = error.stage === "upstream_stalled";
      if (signal.aborted || stalled) await this.cancel(session, request);
      else this.close(session);
      const report = this.report(session, request, usage, resultMessage, meta, { message: redactSecrets(safeError(cause),session.binding.context?.credential), stage: error.stage ?? (signal.aborted ? "cancelled_or_timeout" : "native") });
      report.wall_ms = performance.now() - started;report.error_code=error.code??error.stage??(signal.aborted?"cancelled":"native");report.error_status=error.status??502;
      return { record: session, reply: null, report };
    } finally {
      session.runtime.policy.reasoning = null;
      session.busy--;
      session.touched = Date.now();
      unlock();
      this.replenish();
    }
  }
}
function inputValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function idleTimeout(config) {
  const raw = config.idleTimeoutMs ?? Number(process.env.WORKBUDDY_IDLE_TIMEOUT_MS);
  return Number.isSafeInteger(raw) && raw >= 1 && raw <= 1800000 ? raw : 18e4;
}
const laneOf = (request) => request.prompt_cache_key ? `${request.bridge_scope ?? ""}|${request.prompt_cache_key}` : void 0;
function diffTools(before, after) {
  const key = (tool) => JSON.stringify([tool.description, tool.inputSchema,tool.readOnlyHint]), cap = (names) => names.slice(0, 20);
  const old = new Map(before.tools.map((tool) => [tool.host, key(tool)])), next = new Map(after.tools.map((tool) => [tool.host, key(tool)]));
  return {
    added: cap([...next.keys()].filter((name) => !old.has(name))),
    removed: cap([...old.keys()].filter((name) => !next.has(name))),
    changed: cap([...next.keys()].filter((name) => old.has(name) && old.get(name) !== next.get(name)))
  };
}
const API_ERROR_CODES = new Set(["authentication_failed", "billing_error", "rate_limit", "invalid_request", "server_error", "unknown", "max_output_tokens"]);
function apiErrorCategory(value) {
  return typeof value === "string" && API_ERROR_CODES.has(value) ? value : "unknown";
}
function stepResultError(error) {
  if (!error) throw new Error("Native schema validation failed without an error summary");
}
export {
  HoldLane,
  NATIVE_SKIP_REASONS,
  matchResults,
  nativeEligible,
  nativeSkipReason
};
