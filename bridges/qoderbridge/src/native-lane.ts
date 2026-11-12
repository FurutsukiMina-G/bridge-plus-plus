import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {ContentBlock,Query,SDKMessage,SDKUserMessage} from '@qodercn-ai/qodercn-agent-sdk';
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import type {ChatRequest} from './compat.js';
import type {Config} from './client.js';
import type {InputQueue} from './queue.js';
import {abortable} from './async.js';
import {hasConversationPrefix} from './routing.js';
import {safeError} from './telemetry.js';
import {ZERO_USAGE} from './usage.js';
import {HostBinding,exposedToolName,hostToolTable,pinnedFunction,type HostToolTable,type HostTool} from './native-tools.js';
import {NATIVE_SYSTEM,choiceRequirement,deltaPrompt,followUpPrompt,fullPrompt,receipt} from './native-prompt.js';
import {NativeUsage} from './native-usage.js';
import {NativeProtocolGate,scanNativeProtocol} from './protocol-text.js';
type Warm= {close():void};
export type NativeRuntime={id:string;warm:Warm;q:Query;queue:InputQueue<SDKUserMessage>;controller:AbortController;
  policy:{reasoning:string|null};policyCalls:Array<{purpose:string;model:string;context_window:number|null;reasoning_effort:string|null}>;
  model:string;startupPhases?:unknown;closed:boolean};
type ToolImage={type:'image';mimeType:string;data:string};
type Result={text:string;isError:boolean;images?:ToolImage[];dropped?:number};
type Call={id:string;exposed:string;host:string;input:Record<string,unknown>;valid:boolean;error?:string};
type Handler={name:string;input:unknown;resolve:(result:CallToolResult)=>void;boundId?:string;done?:boolean};
type Step={responseId:string;calls:Call[];hostCalls:string[];text:string;results:Map<string,Result>;handlers:Handler[];postToolUse:number;posted:Set<string>;
  stopAfter:boolean;followUp:{text:string;images:ContentBlock[]}|null;rejected?:string};
export type NativeReply={kind:'tool_calls';calls:Array<{id:string;name:string;arguments:string}>;content:string}|{kind:'final';content:string;finish:'stop'|'length'};
type Session={id:string;runtime:NativeRuntime;binding:HostBinding;inbox:Inbox;table:HostToolTable;signature:string;bridgeScope?:string;clientKey?:string;
  reasoning:string|null;hostMessages:ChatRequest['messages'];state:'idle'|'awaiting'|'running'|'closed';step:Step|null;lastReply:NativeReply|null;
  lastFinalText:string|null;pendingHandlers:Handler[];busy:number;locked:Promise<void>;touched:number;sdkSessionId:string|null;lastCredits:number|null;
  contextUsageRatio:number|null;lastPromptTokens:number|null;rebuildReason?:string;toolsChanged?:{added:string[];removed:string[];changed:string[]};closed:boolean;onHandler:import('./native-tools.js').CallHandler;
  /** This request's tool_choice contract, re-applied per request. */
  pinned:string|null;requiresCall:boolean;parallelOff:boolean;
  /** Warm accounting of the window that opened this session. */
  warmHitNotReady:boolean;warmMissReason:string|null;
  /** `${bridge_scope}|${prompt_cache_key}` when the request identifies its conversation. */
  lane:string|undefined;
  /** Per-request counters reported on the row that observed them. */
  windowStats:{parallel_trimmed:number;ambiguous_binding:number;tool_images:number;tool_images_dropped:number};
  /** Output token limit this runtime was started with; a later request may ask for another one. */
  maxTokens:number|undefined};
type WarmEntry={binding:HostBinding;signature:string;maxTokens:number|undefined;table:HostToolTable;pending:Promise<NativeRuntime>;ready:boolean;timer:ReturnType<typeof setTimeout>};
type Hooks={signal?:AbortSignal;onText?:(text:string)=>void;onThinking?:(text:string)=>void;onStatus?:(text:string)=>void;reasoningEffort?:string};

class Inbox{
  private items:SDKMessage[]=[];private wake?:()=>void;private ended=false;
  push(message:SDKMessage){if(this.ended)return;this.items.push(message);this.wake?.();}
  close(){this.ended=true;this.wake?.();}
  async next(signal:AbortSignal):Promise<SDKMessage>{
    for(;;){if(this.items.length)return this.items.shift()!;if(this.ended)throw new Error('Qoder stream closed');
      await abortable(new Promise<void>(resolve=>{this.wake=resolve;}),signal);this.wake=undefined;}
  }
}
class WindowError extends Error{constructor(message:string,readonly stage:string){super(message);}}
const textContent=(content:unknown):string=>{if(typeof content==='string')return content;if(content==null)return '';
  if(Array.isArray(content))return content.map(part=>typeof part==='string'?part:part&&typeof part==='object'&&'text'in part&&typeof part.text==='string'?part.text:'').join('\n');
  return String(content);};
const emptyTable=():HostToolTable=>({signature:'[]',tools:[],byExposed:new Map(),byHost:new Map()});
const toolError=(text:string):CallToolResult=>({content:[{type:'text',text}],isError:true});
/** Inline images of host tool results: only bounded base64 data URLs are forwarded, never fetched. */
const TOOL_IMAGE_BYTES=5*1024*1024,TOOL_IMAGE_COUNT=8;
const imageBytes=(data:string)=>Math.floor(data.length*3/4)-(data.endsWith('==')?2:data.endsWith('=')?1:0);
function inlineImage(part:unknown):{image?:{mimeType:string;data:string};reason?:'remote'|'unsupported'}{
  const row=part as {type?:string;image_url?:{url?:string}|string;source?:{type?:string;media_type?:string;data?:string}}|null;
  const source=row?.type==='image'?row.source:null;
  const url=typeof row?.image_url==='string'?row.image_url:row?.image_url?.url;
  const raw=url??(source?.type==='base64'&&source.media_type&&source.data?`data:${source.media_type};base64,${source.data}`:null);
  const match=typeof raw==='string'?/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(raw):null;
  if(!match)return{reason:typeof raw==='string'&&/^(?:https?:)?\/\//i.test(raw)?'remote':'unsupported'};
  return{image:{mimeType:match[1]!,data:match[2]!}};
}
/** Tool content keeps its text; inline data-URL images become MCP image blocks. Remote URLs are never fetched. */
function toolResult(content:unknown):Result{
  if(!Array.isArray(content)){const text=textContent(content);return{text,isError:text.startsWith('[tool error] ')};}
  const text:string[]=[],images:ToolImage[]=[];let dropped=0;
  for(const part of content){
    if(typeof part==='string'){text.push(part);continue;}
    const type=part&&typeof part==='object'&&'type'in part?String((part as {type?:unknown}).type):'';
    if(type==='text'){const value=(part as {text?:unknown}).text;if(typeof value==='string')text.push(value);continue;}
    if(type==='image_url'||type==='image'){
      const found=inlineImage(part);
      if(!found.image){
        text.push(found.reason==='remote'
          ?'[The host returned an image from a remote URL; this bridge does not download images, so only this note is shown.]'
          :'[The host returned an image this bridge cannot inline; only base64 png/jpeg/gif/webp images are forwarded.]');
        continue;
      }
      const bytes=imageBytes(found.image.data);
      if(bytes>TOOL_IMAGE_BYTES){text.push(`[The host returned an image of about ${Math.round(bytes/1024)} KiB; images over 5 MiB are not forwarded.]`);dropped++;continue;}
      if(images.length>=TOOL_IMAGE_COUNT){text.push('[The host returned more than 8 images for this call; the extra image was not forwarded.]');dropped++;continue;}
      images.push({type:'image',mimeType:found.image.mimeType,data:found.image.data});continue;
    }
  }
  const body=text.join('\n');
  return{text:body,isError:body.startsWith('[tool error] '),...(images.length?{images}:{}),...(dropped?{dropped}:{})};
}
const PARALLEL_TRIM='Only one function call per step is allowed here. Repeat this call in a later step after you have the previous result.';
/** The correction for a step that had to call a host function and did not call the right one. */
const choiceCorrection=(pinned:string|null)=>pinned?`The host requires exactly the function ${pinned} in this step. Call it now.`:'The host requires a function call in this step. Call one of the host functions now.';
// Streaming and terminal decisions share the native-only, code-aware grammar.
const isProtocol=(text:string)=>scanNativeProtocol(text,{final:true}).leak>=0;
const contextWindow=(runtime:NativeRuntime)=>runtime.policyCalls.at(-1)?.context_window??null;

/** Every real condition in this file that keeps a tool-carrying request off the native lane. */
export const NATIVE_SKIP_REASONS=['tool_mode_json','no_tools','tool_choice_none','response_format','unsupported_content',
  'invalid_tool_choice','non_object_schema','invalid_tool_table'] as const;
export type NativeSkipReason=(typeof NATIVE_SKIP_REASONS)[number];
/** Only text and image parts survive the native prompt; any other part would be dropped silently. */
const unsupportedContent=(request:ChatRequest)=>request.messages.some(message=>Array.isArray(message.content)&&
  message.content.some(part=>part&&typeof part==='object'&&'type' in part&&typeof part.type==='string'&&!['text','image_url'].includes(part.type)));

/** Exactly one reason per request for not using the native lane; null means the request belongs there.
 *  `tool_choice:'required'` and a pinned function are native now, so they are no longer reasons. */
export function nativeSkipReason(request:ChatRequest,config:Config):NativeSkipReason|null{
  if((config.toolMode??'json')!=='native')return 'tool_mode_json';
  if(!request.tools?.length)return 'no_tools';
  if(request.tool_choice==='none')return 'tool_choice_none';
  if(request.response_format!==undefined)return 'response_format';
  const choice=request.tool_choice;
  if(choice!==undefined&&choice!=='auto'&&choice!=='required'&&pinnedFunction(request)===null)return 'invalid_tool_choice';
  if(unsupportedContent(request))return 'unsupported_content';
  try{
    for(const tool of request.tools??[]){const schema=tool.function.parameters;
      if(schema!==undefined&&(!schema||typeof schema!=='object'||Array.isArray(schema)||Object.hasOwn(schema,'type')&&(schema as {type?:unknown}).type!=='object'))return 'non_object_schema';}
    hostToolTable(request);return null;
  }catch{return 'invalid_tool_table';}
}

export function nativeEligible(request:ChatRequest,config:Config){return nativeSkipReason(request,config)===null;}

export function matchResults(step:{hostCalls:string[]},delta:ChatRequest['messages']){
  const results=new Map<string,Result>();let index=0,echo=false;
  const echoMessage=(message:ChatRequest['messages'][number])=>message.role==='assistant'&&(!message.tool_calls?.length||message.tool_calls.every(call=>{
    const id=call&&typeof call==='object'&&'id'in call?call.id:undefined;return typeof id==='string'&&step.hostCalls.includes(id);}));
  while(index<delta.length){
    const message=delta[index]!;
    if(echoMessage(message)){echo=true;index++;continue;}
    if(message.role==='tool'&&message.tool_call_id&&step.hostCalls.includes(message.tool_call_id)){
      if(results.has(message.tool_call_id))return null;
      results.set(message.tool_call_id,toolResult(message.content));index++;continue;
    }
    break;
  }
  const trailing=delta.slice(index);
  if(trailing.some(message=>message.role==='tool'||message.role==='assistant'&&message.tool_calls?.length))return null;
  if(!results.size&&!echo)return null;
  for(const id of step.hostCalls)if(!results.has(id))results.set(id,{text:'The host returned no result for this call.',isError:true});
  return{results,trailing};
}

type CompleteCall={id:string;name:string;input:Record<string,unknown>};
type Response={id:string;text:string;streamed:boolean;stop:string|null;sawToolUse:boolean;handed:boolean;announced:Array<{id:string;name:string}>;complete:Map<string,CompleteCall>;
  gate:NativeProtocolGate};
export class NativeLane{
  private sessions=new Map<string,Session>();private byToolId=new Map<string,string>();private byClient=new Map<string,string>();
  private warm:WarmEntry[]=[];private hint?:HostToolTable;private hintMaxTokens:number|undefined;private closed=false;
  private counters={rebuilds:0,replays:0,handoff_stops:0,invalid_calls:0,late_followups:0,
    awaiting_expired:0,warm_hit_not_ready:0,warm_expired:0};
  /** A warm entry expired by TTL since the last session was created; reported as the next miss reason. */
  private warmExpired=false;
  /** Conversation lanes released by the awaiting TTL, so the next request can report `expired`. */
  private expiredLanes=new Map<string,number>();
  /** Why the last warm start failed; a dropped entry would otherwise look like "no entry". */
  private warmFailure:string|null=null;
  constructor(private readonly config:Config,private readonly openRuntime:(binding:HostBinding,table:HostToolTable|undefined,names:string[],maxTokens?:number)=>Promise<NativeRuntime>,
    private readonly closeRuntime:(runtime:NativeRuntime)=>void,private readonly makeRoom:(scope?:string)=>void){}
  private limit(name:'nativeResultCharLimit'|'nativeMcpOutputTokens'|'nativeMaxTurns'|'nativeWarmLimit'|'nativeInvalidRounds'){
    // 40000 leaves room for JSON escaping below the runtime's fixed 50,000-character cut.
    const defaults={nativeResultCharLimit:40000,nativeMcpOutputTokens:1000000,nativeMaxTurns:100000,nativeWarmLimit:1,nativeInvalidRounds:3};
    return this.config[name]??defaults[name];
  }
  stats(){return{sessions:this.sessions.size,awaiting:[...this.sessions.values()].filter(s=>s.state==='awaiting').length,
    warm_ready:this.warm.filter(w=>w.ready).length,warm_pending:this.warm.filter(w=>!w.ready).length,...this.counters};}
  bindTool(id:string){const owner=this.byToolId.get(id);return owner?this.sessions.get(owner):undefined;}
  private related(request:ChatRequest){
    if(typeof request.bridge_scope==='string')return[...this.sessions.values()].filter(s=>s.bridgeScope===request.bridge_scope&&s.clientKey===request.prompt_cache_key);
    if(request.prompt_cache_key){const s=this.sessions.get(this.byClient.get(request.prompt_cache_key)??'');return s&&s.bridgeScope===undefined?[s]:[];}
    const owners=new Set(request.messages.flatMap(m=>[m.tool_call_id,...(m.tool_calls??[]).flatMap(c=>c&&typeof c==='object'&&'id'in c&&typeof c.id==='string'?[c.id]:[])]).flatMap(id=>id?[this.byToolId.get(id)]:[]));
    return[...this.sessions.values()].filter(s=>s.bridgeScope===undefined&&owners.has(s.id));
  }
  private candidate(request:ChatRequest,table:HostToolTable){
    const candidates=this.related(request).filter(s=>s.state!=='closed'&&s.signature===table.signature&&hasConversationPrefix(s.hostMessages,request.messages))
      .sort((a,b)=>b.hostMessages.length-a.hostMessages.length);
    if(candidates.length>1&&candidates[0]!.hostMessages.length===candidates[1]!.hostMessages.length)return undefined;
    return candidates[0];
  }
  private close(session:Session){
    if(session.state==='closed')return;session.state='closed';this.sessions.delete(session.id);session.binding.attach(undefined);
    for(const[id,owner]of this.byToolId)if(owner===session.id)this.byToolId.delete(id);
    for(const[key,owner]of this.byClient)if(owner===session.id)this.byClient.delete(key);
    for(const handler of[...session.pendingHandlers,...session.step?.handlers??[]])this.resolveHandler(handler,'Host session is not available.');
    session.pendingHandlers=[];session.inbox.close();this.closeRuntime(session.runtime);
  }
  closeIdleForCapacity(){
    const rows=[...this.sessions.values()].filter(s=>!s.busy).sort((a,b)=>Number(a.state==='awaiting')-Number(b.state==='awaiting')||a.touched-b.touched);
    if(rows[0]){this.close(rows[0]);return true;}return false;
  }
  sweepIdle(){
    const idle=this.config.sessionIdleMs??3600000,awaiting=this.config.awaitingIdleMs??600000;
    for(const session of this.sessions.values()){
      if(session.busy)continue;const age=Date.now()-session.touched;
      // A lane that waits on host results is held for its results, not for the much longer session idle time.
      if(session.state==='awaiting'&&age>awaiting){this.counters.awaiting_expired++;
        if(session.lane)this.expiredLanes.set(session.lane,Date.now());this.close(session);continue;}
      if(age>idle)this.close(session);
    }
    if(this.expiredLanes.size>64){const cut=Date.now()-3600000;for(const[lane,at]of this.expiredLanes)if(at<cut)this.expiredLanes.delete(lane);}
  }
  private dropWarm(entry:WarmEntry){clearTimeout(entry.timer);this.warm=this.warm.filter(row=>row!==entry);void entry.pending.then(runtime=>this.closeRuntime(runtime),()=>{});}
  closeAll(){this.closed=true;for(const session of[...this.sessions.values()])this.close(session);for(const entry of[...this.warm])this.dropWarm(entry);}
  // The SDK's initialize request times out after 120 s, so tools/list cannot be held open for a request.
  // exposedName policies need the names at startup anyway: a warm runtime starts with the latest table and serves only an identical one.
  private replenish(){
    if(this.closed||!this.hint||this.warm.length>=this.limit('nativeWarmLimit'))return;
    const hint=this.hint,maxTokens=this.hintMaxTokens,binding=new HostBinding();binding.provide(hint);
    const pending=this.openRuntime(binding,hint,hint.tools.map(t=>t.exposed),maxTokens);
    const entry:WarmEntry={binding,signature:hint.signature,maxTokens,table:hint,pending,ready:false,
      timer:setTimeout(()=>{this.warmExpired=true;this.dropWarm(entry);},this.config.blankWarmTtlMs??120000)};
    entry.timer.unref();this.warm.push(entry);
    void pending.then(()=>{entry.ready=true;},error=>{clearTimeout(entry.timer);this.warmFailure=safeError(error).slice(0,160);
      this.warm=this.warm.filter(row=>row!==entry);});
  }
  private async create(request:ChatRequest,table:HostToolTable){
    const maxTokens=request.max_tokens;
    this.makeRoom(request.bridge_scope);this.hint=table;this.hintMaxTokens=maxTokens;
    let runtime:NativeRuntime,binding:HostBinding,warmStart=false,warmHitNotReady=false,warmMissReason:string|null=null;
    // The runtime fixes its output limit at startup, so a warm runtime serves only the same limit.
    const entry=this.warm.find(row=>row.signature===table.signature&&row.maxTokens===maxTokens);
    const limitMismatch=!entry&&this.warm.some(row=>row.signature===table.signature);
    for(const other of[...this.warm])if(other!==entry)this.dropWarm(other);
    if(entry){
      // Readiness must be read when the entry is claimed: an await first would always observe `ready`.
      const ready=entry.ready;clearTimeout(entry.timer);this.warm=this.warm.filter(row=>row!==entry);binding=entry.binding;
      try{runtime=await entry.pending;warmStart=ready;warmHitNotReady=!ready;if(ready)this.warmFailure=null;else this.counters.warm_hit_not_ready++;}
      catch{binding=new HostBinding();binding.provide(table);runtime=await this.openRuntime(binding,table,table.tools.map(t=>t.exposed),maxTokens);warmMissReason='warm_start_failed';}
    }else{
      warmMissReason=limitMismatch?'output_limit_mismatch':this.warm.length>0?'tool_table_mismatch':this.warmExpired?'expired':this.warmFailure?'warm_start_failed':'no_warm_entry';
      binding=new HostBinding();binding.provide(table);runtime=await this.openRuntime(binding,table,table.tools.map(t=>t.exposed),maxTokens);
    }
    this.warmExpired=false;
    const inbox=new Inbox();let session:Session;session={id:runtime.id,runtime,binding,inbox,table,signature:table.signature,bridgeScope:request.bridge_scope,
      clientKey:request.bridge_scope?request.prompt_cache_key:undefined,reasoning:this.config.reasoning??null,hostMessages:[],state:'idle',step:null,lastReply:null,lastFinalText:null,
      pendingHandlers:[],busy:0,locked:Promise.resolve(),touched:Date.now(),sdkSessionId:null,lastCredits:null,contextUsageRatio:null,lastPromptTokens:null,closed:false,
      onHandler:(name,input,resolve,signal)=>this.onHandler(session,name,input,resolve,signal),
      pinned:null,requiresCall:false,parallelOff:false,warmHitNotReady,warmMissReason,
      lane:request.prompt_cache_key?`${request.bridge_scope??''}|${request.prompt_cache_key}`:undefined,
      windowStats:{parallel_trimmed:0,ambiguous_binding:0,tool_images:0,tool_images_dropped:0},maxTokens};
    this.sessions.set(session.id,session);if(request.prompt_cache_key&&!request.bridge_scope)this.byClient.set(request.prompt_cache_key,session.id);
    // A failed stream must close the inbox, never surface as an unhandled rejection in the worker process.
    binding.attach(session);void(async()=>{try{for await(const message of runtime.q)inbox.push(message);}catch{}finally{inbox.close();}})();
    this.replenish();return{session,warmStart,warmHitNotReady,warmMissReason};
  }
  private resolveHandler(handler:Handler,text:string,isError=true){if(handler.done)return;handler.done=true;handler.resolve(toolError(text));}
  private onHandler(session:Session,name:string,input:unknown,resolve:(result:CallToolResult)=>void,signal:AbortSignal){
    const tool=exposedToolName(session.table,name),handler:Handler={name:tool?.exposed??name.replace(/^mcp__host__/,''),input,resolve};
    const abort=()=>this.resolveHandler(handler,'Cancelled by the host');if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
    const original=handler.resolve;handler.resolve=result=>{signal.removeEventListener('abort',abort);original(result);};
    session.pendingHandlers.push(handler);this.settle(session);
  }
  /** A handler can enter before its response is parsed from the stream (the MCP call overtakes the inbox), so it
   * waits unbound until the current step has a free call for it. The runtime finishes every handler of a step
   * before the next model request, so an unbound handler never belongs to an older step. */
  private settle(session:Session){
    const step=session.step;if(!step)return;
    const free=(call:Call)=>!step.handlers.some(h=>h.boundId===call.id);
    for(const handler of[...session.pendingHandlers]){
      if(!handler.done){
        const candidates=step.calls.filter(c=>c.exposed===handler.name&&free(c));
        const exact=candidates.find(c=>isDeepStrictEqual(inputValue(handler.input),c.input));
        const call=exact??candidates[0];
        if(!call)continue;
        // The handler carries no call id (only a progress token), so equal names can only be guessed.
        if(!exact&&candidates.length>1)session.windowStats.ambiguous_binding++;
        handler.boundId=call.id;step.handlers.push(handler);
      }
      session.pendingHandlers.splice(session.pendingHandlers.indexOf(handler),1);
    }
    for(const handler of step.handlers){
      if(handler.done||!handler.boundId)continue;
      const result=step.results.get(handler.boundId);if(result){handler.done=true;handler.resolve({content:[{type:'text',text:result.text},...(result.images??[])],...(result.isError?{isError:true}:{})});}
    }
  }
  preToolUse(binding:HostBinding,input:{tool_name?:string}){
    const session=(binding as unknown as{session?:Session}).session;
    return{hookSpecificOutput:{hookEventName:'PreToolUse' as const,permissionDecision:session&&exposedToolName(session.table,input.tool_name??'')?'allow' as const:'deny' as const}};
  }
  canUseTool(binding:HostBinding,name:string,input:unknown){
    const session=(binding as unknown as{session?:Session}).session;
    return session&&exposedToolName(session.table,name)?{behavior:'allow' as const,updatedInput:input as Record<string,unknown>}:{behavior:'deny' as const,message:'Only host tools are available.'};
  }
  /** Stop the runtime turn after the step's last host call (invalid calls may or may not fire PostToolUse). */
  postToolUse(binding:HostBinding,input?:{tool_use_id?:string;tool_name?:string;tool_input?:unknown}){
    const session=(binding as unknown as{session?:Session}).session,step=session?.step;if(!step)return{};
    const id=input?.tool_use_id;
    if(typeof id==='string'&&step.calls.some(call=>call.id===id)){if(step.hostCalls.includes(id))step.posted.add(id);}
    else if(input?.tool_name){
      // Preserve the normal exact-ID path. A changed hook ID can still bind to
      // its host call by name/input; a rejected call must not count as a host post.
      const tool=exposedToolName(session!.table,input.tool_name),free=step.calls.filter(call=>call.exposed===tool?.exposed&&!step.posted.has(call.id));
      const call=free.find(call=>isDeepStrictEqual(inputValue(input.tool_input),call.input))??free.find(call=>step.hostCalls.includes(call.id));
      if(call&&step.hostCalls.includes(call.id))step.posted.add(call.id);
    }else if(typeof id!=='string')step.postToolUse++;
    if(step.stopAfter&&step.posted.size+step.postToolUse>=step.hostCalls.length)return{continue:false,stopReason:'Host handoff: the next host message carries the rest.'};return{};
  }
  private push(session:Session,content:string|ContentBlock[]){session.runtime.queue.push({type:'user',parent_tool_use_id:null,message:{role:'user',content}});}
  private finishStep(session:Session,response:Response){
    const calls:Call[]=response.announced.map(announced=>{const complete=response.complete.get(announced.id);const tool=exposedToolName(session.table,announced.name);
      const input=complete?.input??{};let valid=!!complete&&!!tool,error:string|undefined;
      if(valid&&!tool!.validate(input)){valid=false;error=(tool!.validate.errors??[]).map(e=>`${e.instancePath||'/'} ${e.message??'invalid'}`).join('; ');
        stepResultError(error);}
      return{id:announced.id,exposed:tool?.exposed??announced.name.replace(/^mcp__host__/,''),host:tool?.host??announced.name,input,valid,...(error?{error}:{})};});
    const step:Step={responseId:response.id,calls,hostCalls:[],text:response.text,results:new Map(),handlers:[],postToolUse:0,posted:new Set(),stopAfter:false,followUp:null};
    for(const call of calls)if(!call.valid){const text=`Arguments do not match the function schema: ${call.error??'unknown tool or incomplete call'}. Call it again with corrected arguments.`;step.results.set(call.id,{text,isError:true});this.counters.invalid_calls++;}
    // tool_choice is a per-step contract. A step that misses it is rejected whole: nothing reaches the host,
    // its handlers get the correction as their result, and the runtime asks the model again in this same turn.
    let accepted=calls.filter(call=>call.valid),violation=false;
    if(session.pinned){
      if(accepted.length===1&&accepted[0]!.host===session.pinned)accepted=accepted.slice(0,1);
      else{violation=true;accepted=[];
        for(const call of calls.filter(c=>c.valid))step.results.set(call.id,{text:choiceCorrection(session.pinned),isError:true});}
    }else if(session.requiresCall&&!accepted.length)violation=true;
    // parallel_tool_calls:false hands over only the first call; the rest fail fast so the model can repeat them.
    if(session.parallelOff&&accepted.length>1){
      for(const call of accepted.slice(1)){step.results.set(call.id,{text:PARALLEL_TRIM,isError:true});session.windowStats.parallel_trimmed++;}
      accepted=accepted.slice(0,1);
    }
    step.hostCalls=accepted.map(call=>call.id);
    // If the runtime went on without stopping (no PostToolUse stop), the held full outputs still reach the model, late.
    const unsent=session.step?.stopAfter?session.step.followUp:null;
    if(unsent){this.push(session,unsent.images.length?[{type:'text',text:unsent.text},...unsent.images]:unsent.text);this.counters.late_followups++;}
    session.step=step;for(const call of step.hostCalls)this.byToolId.set(call,session.id);this.settle(session);return{step,violation};
  }
  private async readWindow(session:Session,request:ChatRequest,hooks:Hooks,signal:AbortSignal,window:'new'|'results'|'continue',warmStart:boolean,oversized=0,trailing=0){
    const usage=new NativeUsage(),responses=new Map<string,Response>(),order:Response[]=[];let current:Response|undefined,last:Response|undefined;
    let invalidRounds=0,protocolCorrected=false,handoffStop=false,resultMessage:SDKMessage|undefined;
    const policyStart=session.runtime.policyCalls.length;session.state='running';
    // Silence is measured from the request or the last upstream event; SSE comments from the server are not events.
    const idleMs=idleTimeout(this.config),stall=new AbortController(),stream=AbortSignal.any([signal,stall.signal]);
    let idleTimer:ReturnType<typeof setTimeout>|undefined;
    const arm=()=>{if(idleTimer)clearTimeout(idleTimer);idleTimer=setTimeout(()=>{idleTimer=undefined;
      stall.abort(new WindowError(`Qoder produced no upstream event for ${Math.round(idleMs/1000)} s; the upstream stalled.`,'upstream_stalled'));},idleMs);};
    arm();
    const responseFor=(id:string)=>{let response=responses.get(id);if(!response){response={id,text:'',streamed:false,stop:null,sawToolUse:false,handed:false,announced:[],complete:new Map(),
        gate:new NativeProtocolGate(text=>hooks.onText?.(text),!session.requiresCall&&!session.pinned)};responses.set(id,response);order.push(response);}return response;};
    const noteStop=(response:Response,reason:string|null|undefined)=>{
      if(!reason)return;if(reason==='tool_use')response.sawToolUse=true;
      if(response.stop!=='tool_use'||reason==='tool_use')response.stop=reason;
    };
    const readyCalls=(response:Response|undefined):CompleteCall[]|null=>{
      if(!response?.sawToolUse||response.handed||!response.complete.size)return null;
      const calls=[...response.complete.values()];if(!response.announced.length)return calls;
      if(calls.length<response.announced.length)return null;
      if(calls.length>response.announced.length)throw new WindowError('Native assistant call count exceeds the calls announced by the stream.','native');
      // Reserve exact IDs before assigning the remaining complete assistant
      // calls to unmatched announcements in order. Never invent host call IDs.
      const exact=new Set(response.announced.filter(call=>response.complete.has(call.id)).map(call=>call.id));
      const unmatched=calls.filter(call=>!exact.has(call.id));
      return response.announced.map(call=>response.complete.get(call.id)??unmatched.shift()!);
    };
    const emitText=(response:Response,text:string)=>{response.text+=text;response.gate.push(text);};
    const finishText=(response:Response)=>{
      // Release required/pinned text only after the native call contract passes.
      if(!response.gate.enabled){response.gate=new NativeProtocolGate(text=>hooks.onText?.(text));response.gate.push(response.text);}
      response.gate.pump(true);return response.gate.emittedText;
    };
    try{
      for(;;){
        const message=await session.inbox.next(stream);arm();usage.observe(message,contextWindow(session.runtime));session.sdkSessionId=message.session_id??session.sdkSessionId;
        if(message.type==='system'&&message.subtype==='api_retry')hooks.onStatus?.(`[QoderBridge] Qoder upstream retry ${message.attempt}/${message.max_retries}${typeof message.error_status==='number'?` (HTTP ${message.error_status})`:''}; next attempt in ${Math.max(0,Math.round(message.retry_delay_ms/1000))}s.`);
        if(message.type==='stream_event'){
          const event=message.event as unknown as{type:string;message?:{id?:string};content_block?:{type?:string;id?:string;name?:string};delta?:{type?:string;text?:string;thinking?:string;stop_reason?:string}};
          if(event.type==='message_start')current=responseFor(event.message?.id??`response-${order.length+1}`);
          if(event.type==='content_block_start'&&event.content_block?.type==='tool_use'&&event.content_block.id){current??=responseFor(`response-${order.length+1}`);
            if(!current.announced.some(call=>call.id===event.content_block!.id))current.announced.push({id:event.content_block.id,name:event.content_block.name??''});}
          if(event.type==='content_block_delta'&&event.delta?.type==='text_delta'&&event.delta.text){current??=responseFor(`response-${order.length+1}`);current.streamed=true;emitText(current,event.delta.text);}
          if(event.type==='content_block_delta'&&event.delta?.type==='thinking_delta'&&event.delta.thinking)hooks.onThinking?.(event.delta.thinking);
          if(event.type==='message_delta'){current??=responseFor(`response-${order.length+1}`);noteStop(current,event.delta?.stop_reason);last=current;}
        }
        if(message.type==='assistant'&&!message.isApiErrorMessage){
          const id=message.message.id??message.uuid;
          // Same-ID responses keep their existing lookup. An unknown assistant
          // ID aliases the active stream response, including empty snapshots.
          const response=(id?responses.get(id):undefined)??current??responseFor(id??`response-${order.length+1}`);
          if(id&&!responses.has(id))responses.set(id,response);current=response;last=response;
          noteStop(response,message.message.stop_reason);
          // Text that arrived without deltas still goes through the gate to the client.
          const text=message.message.content.filter(part=>part.type==='text').map(part=>part.text??'').join('');if(text&&!response.streamed)emitText(response,text);
          for(const part of message.message.content)if(part.type==='tool_use'&&part.id){
            response.complete.set(part.id,{id:part.id,name:part.name??'',input:(part.input??{}) as Record<string,unknown>});}
        }
        // Like the JSON path, an API error message is telemetry: the SDK may still retry it (system/api_retry).
        // Only a failing result ends the window; NativeUsage keeps the categories for the report.
        const calls=readyCalls(current);
        if(calls){
          current!.handed=true;last=current;
          const response:Response={...current!,announced:calls.map(call=>({id:call.id,name:call.name})),complete:new Map(calls.map(call=>[call.id,call]))};
          const {step,violation}=this.finishStep(session,response);for(const call of step.calls)usage.toolInput(response.id,JSON.stringify(call.input).length);
          if(step.hostCalls.length){step.text=finishText(last!);session.state='awaiting';session.hostMessages=request.messages;
            const reply:NativeReply={kind:'tool_calls',calls:step.calls.filter(c=>step.hostCalls.includes(c.id)).map(c=>({id:c.id,name:c.host,arguments:JSON.stringify(c.input)})),content:step.text};session.lastReply=reply;
            return{reply,report:this.report(session,request,usage,resultMessage,{window,warmStart,calls:step.calls.length,hostCalls:step.hostCalls.length,invalidRounds,handoffStop,oversized,trailing,policyStart}),usage,resultMessage};
          }
          // Keep the rejected step current: its handlers may still enter and must get the schema error or correction.
          invalidRounds++;last=undefined;if(invalidRounds>=this.limit('nativeInvalidRounds'))throw new WindowError(violation?'Native steps repeatedly missed the required host function.':'Native tool arguments remained invalid.','native_invalid_calls');
        }
        if(message.type==='result'){
          resultMessage=message;current=undefined;
          if(session.step?.stopAfter){
            // Our {continue:false} ends the turn with success; any other result is a real failure.
            if(message.subtype!=='success'||message.is_error)throw new WindowError(`Qoder result: ${message.subtype}`,'native');
            const follow=session.step.followUp;session.step.stopAfter=false;session.step.followUp=null;
            if(follow)this.push(session,follow.images.length?[{type:'text',text:follow.text},...follow.images]:follow.text);handoffStop=true;this.counters.handoff_stops++;continue;}
          if(message.subtype!=='success'||message.is_error)throw new WindowError(`Qoder result: ${message.subtype}`,'native');
          if(last?.sawToolUse&&!last.handed)throw new WindowError('Native turn ended before all announced tool calls had complete assistant arguments.','native');
          const content=last?.text??'';
          if(isProtocol(content)){
            if(protocolCorrected)throw new WindowError('Native model repeatedly wrote tool protocol as text.','native_protocol_text');
            protocolCorrected=true;this.push(session,'Call the host functions through native function calling; do not write calls or markup as text. Continue the task.');
            for(const response of order)response.text='';last=undefined;continue;
          }
          // A required or pinned step that only spoke is a missed contract, not an answer: correct it in this turn.
          if((session.requiresCall||session.pinned)&&!last?.announced.length){
            invalidRounds++;if(invalidRounds>=this.limit('nativeInvalidRounds'))throw new WindowError('Native steps repeatedly missed the required host function.','native_invalid_calls');
            this.push(session,choiceCorrection(session.pinned));last=undefined;continue;
          }
          if(last)finishText(last);
          const reply:NativeReply={kind:'final',content,finish:last?.stop==='max_tokens'?'length':'stop'};session.lastReply=reply;session.lastFinalText=content;
          session.state='idle';session.hostMessages=request.messages;session.step=null;
          for(const handler of session.pendingHandlers.splice(0))this.resolveHandler(handler,'Unknown call');
          return{reply,report:this.report(session,request,usage,resultMessage,{window,warmStart,calls:0,hostCalls:0,invalidRounds,handoffStop,oversized,trailing,policyStart}),usage,resultMessage};
        }
      }
    }catch(error){throw Object.assign(error instanceof Error?error:new Error(String(error)),{usage,resultMessage,policyStart,window,warmStart,invalidRounds,handoffStop,oversized,trailing});}
    finally{if(idleTimer)clearTimeout(idleTimer);}
  }
  private report(session:Session,request:ChatRequest,usage:NativeUsage,result:SDKMessage|undefined,meta:{window:string;warmStart:boolean;calls:number;hostCalls:number;invalidRounds:number;handoffStop:boolean;oversized:number;trailing:number;policyStart:number},error?:{message:string;stage:string}){
    const total=result?.type==='result'&&typeof result.total_credits==='number'?result.total_credits:session.lastCredits;
    const measured=usage.snapshot(this.config,session.lastPromptTokens);session.lastPromptTokens=measured.client_usage?.prompt_tokens??session.lastPromptTokens;
    if(total!==null)session.lastCredits=total;const rows=measured.rows;session.contextUsageRatio=rows.at(-1)?.context_usage_ratio??session.contextUsageRatio;
    // Handlers of this step enter after its response is sent, so their counts belong to the next window.
    const windowStats=session.windowStats;session.windowStats={parallel_trimmed:0,ambiguous_binding:0,tool_images:0,tool_images_dropped:0};
    const native={session_id:session.sdkSessionId,window:meta.window,calls:meta.calls,host_calls:meta.hostCalls,invalid_calls:meta.invalidRounds,
      handoff_stop:meta.handoffStop,oversized_results:meta.oversized,trailing_messages:meta.trailing,rebuild_reason:session.rebuildReason??null,tools_changed:session.toolsChanged??null,
      warm_start:meta.warmStart,warm_hit_not_ready:session.warmHitNotReady,warm_miss_reason:session.warmMissReason,
      parallel_trimmed:windowStats.parallel_trimmed,ambiguous_binding:windowStats.ambiguous_binding,
      tool_images:windowStats.tool_images,tool_images_dropped:windowStats.tool_images_dropped,
      // The runtime's output limit is fixed at startup: a later request that asks for another one is reported, not applied.
      max_tokens_mismatch:request.max_tokens!==undefined&&request.max_tokens!==session.maxTokens,
      native_skip_reason:null,tools_registered:session.table.tools.length,model_responses:rows.length};
    return{request_id:randomUUID(),session_id:session.sdkSessionId,model:session.runtime.model,stage:error?.stage??'native',error:error?.message??null,
      response:session.lastReply?.content??'',result:result?.type==='result'?result.subtype:'incomplete',sdk_errors:result?.type==='result'&&'errors'in result?result.errors?.map(safeError)??[]:[],
      sdk_error_code:result?.type==='result'?result.error_code??null:null,api_error_categories:usage.apiErrors.map(apiErrorCategory),stream_stop_reasons:rows.flatMap(row=>row.stop_reason?[row.stop_reason]:[]),
      credits_delta:measured.credits,credits:measured.credits,total_session_credits:total,normalized_usage:measured.client_usage,normalized_usage_source:measured.usage_source,
      client_usage:measured.client_usage,client_cache_usage:measured.client_cache_usage,cache_estimate_tokens:measured.cache_estimate_tokens,
      cache_estimate_ratio:measured.cache_estimate_ratio,
      usage_source:measured.usage_source,reasoning_tokens:measured.reasoning_tokens,context_usage_ratio:session.contextUsageRatio,prompt_tokens_all_responses:measured.prompt_tokens_all_responses,
      model_requests:rows.length,model_requests_known:rows.length,model_request_count_source:'native response IDs',requests:rows,policy_calls:session.runtime.policyCalls.slice(meta.policyStart),
      model_policy_calls:session.runtime.policyCalls.slice(meta.policyStart),native,reused_session:meta.window!=='new',local_response_replay:false,
      warm_start:meta.warmStart,startup_phases:meta.window==='new'?session.runtime.startupPhases??null:null,history_mode:meta.window==='new'?'full':'delta',
      sent_message_count:meta.window==='results'?0:request.messages.length,prompt_chars:0,available_tool_definition_chars:JSON.stringify(request.tools??[]).length,
      sent_tool_definition_chars:0,tool_definitions_reused:true,tool_detail_mode:'native',wall_ms:0};
  }
  private async cancel(session:Session,request:ChatRequest){
    // Bounded like the JSON path: an unresponsive runtime must not hold the slot for the SDK's 30 s control timeout.
    let drained=false;try{await abortable(session.runtime.q.interrupt(),AbortSignal.timeout(5000));}catch{}
    try{const signal=AbortSignal.timeout(5000);for(;;){const message=await session.inbox.next(signal);if(message.type==='result'){drained=true;break;}}}catch{}
    for(const handler of[...session.pendingHandlers,...session.step?.handlers??[]])this.resolveHandler(handler,'Cancelled by the host');session.pendingHandlers=[];
    if(drained){session.state='idle';session.hostMessages=request.messages;session.step=null;session.lastReply=null;}else this.close(session);
  }
  async infer(request:ChatRequest,hooks:Hooks={}){
    const table=hostToolTable(request),reasoning=hooks.reasoningEffort??this.config.reasoning??null;
    const signal=AbortSignal.any([AbortSignal.timeout(this.config.timeout),...(hooks.signal?[hooks.signal]:[])]);let session:Session|undefined,warmStart=false,window:'new'|'results'|'continue'='new',rebuildReason:string|undefined;
    for(;;){const candidate=this.candidate(request,table);if(candidate?.busy){await abortable(candidate.locked,signal);continue;}session=candidate;break;}
    // An identical retry after a cancelled window has nothing new to send, and the runtime holds the
    // cancelled turn: rebuild from the host history instead of pushing an empty continuation.
    if(session&&!session.busy&&request.messages.length===session.hostMessages.length&&!session.lastReply){rebuildReason='retry_after_cancel';this.counters.rebuilds++;this.close(session);session=undefined;}
    if(session){const delta=request.messages.slice(session.hostMessages.length);
      if(!delta.length&&session.lastReply){this.counters.replays++;session.touched=Date.now();return{record:session,reply:session.lastReply,report:{...this.report(session,request,new NativeUsage(),undefined,{window:'continue',warmStart:false,calls:0,hostCalls:0,invalidRounds:0,handoffStop:false,oversized:0,trailing:0,policyStart:session.runtime.policyCalls.length}),stage:'native_replay',local_response_replay:true,credits_delta:0,model_requests:0,normalized_usage:null,client_usage:null,client_cache_usage:'omitted'}};}
      if(session.state==='awaiting'&&(session.reasoning!==reasoning||!matchResults(session.step!,delta))){rebuildReason=session.reasoning!==reasoning?'superseded':'history_rewritten';this.counters.rebuilds++;this.close(session);session=undefined;}
      else if(session.state==='awaiting')window='results';else window='continue';
    }
    // Without a client key, one application scope holds several conversations (main thread, subagents): a
    // non-matching request is another conversation, not a replacement, so only key-identified lanes are superseded.
    // A request that carries results for a waiting lane's calls is that conversation after the host rewrote its
    // history (compaction): the waiting runtime can never resume, so it is superseded too.
    const key=request.prompt_cache_key,resultIds=new Set(request.messages.flatMap(m=>m.role==='tool'&&m.tool_call_id?[m.tool_call_id]:[]));
    const superseded=(old:Session)=>!old.busy&&(!!key&&(request.bridge_scope?old.clientKey===key:this.byClient.get(key)===old.id)||
      old.state==='awaiting'&&!!old.step&&old.step.hostCalls.some(id=>resultIds.has(id)));
    let toolsChanged:ReturnType<typeof diffTools>|undefined;
    if(!session){for(const old of this.related(request))if(superseded(old)){
        // A different tool table, a history the host rewrote (compaction or a new prefix), or a keyed replacement.
        rebuildReason=old.signature!==table.signature?'tools_changed':!hasConversationPrefix(old.hostMessages,request.messages)?'history_rewritten':'superseded';
        if(old.signature!==table.signature)toolsChanged=diffTools(old.table,table);this.counters.rebuilds++;this.close(old);}
      // No related session at all: either a brand-new conversation or one whose waiting lane the TTL released.
      const lane=laneOf(request);
      if(!rebuildReason){rebuildReason=lane&&this.expiredLanes.has(lane)?'expired':'new_conversation';if(lane)this.expiredLanes.delete(lane);}
      const created=await this.create(request,table);session=created.session;session.rebuildReason=rebuildReason;session.toolsChanged=toolsChanged;warmStart=created.warmStart;window='new';}
    session.reasoning=reasoning;session.runtime.policy.reasoning=reasoning;
    // tool_choice and parallel_tool_calls are per-request contracts re-applied on every window of this session.
    session.pinned=pinnedFunction(request);session.requiresCall=request.tool_choice==='required';
    session.parallelOff=request.parallel_tool_calls===false;
    session.busy++;let unlock!:()=>void;session.locked=new Promise<void>(resolve=>{unlock=resolve;});
    const started=performance.now();let usage=new NativeUsage(),resultMessage:SDKMessage|undefined,meta={window,warmStart,calls:0,hostCalls:0,invalidRounds:0,handoffStop:false,oversized:0,trailing:0,policyStart:session.runtime.policyCalls.length};
    try{
      signal.throwIfAborted();let matched:ReturnType<typeof matchResults>=null;
      if(window==='new')this.push(session,fullPrompt(request,choiceRequirement(request,session.pinned)));
      else if(window==='continue')this.push(session,deltaPrompt(request.messages.slice(session.hostMessages.length),session.lastFinalText,choiceRequirement(request,session.pinned)));
      else{
        const delta=request.messages.slice(session.hostMessages.length);matched=matchResults(session.step!,delta);if(!matched)throw new WindowError('Host results do not match the pending native calls.','native');
        const step=session.step!,large:Array<{id:string;host:string;text:string}>=[];
        for(const[id,result]of matched!.results){
          // The receipt path counts characters only: image bytes never count against the text limit.
          session.windowStats.tool_images+=result.images?.length??0;session.windowStats.tool_images_dropped+=result.dropped??0;
          if(result.text.length>this.limit('nativeResultCharLimit')){const call=step.calls.find(c=>c.id===id);large.push({id,host:call?.host??id,text:result.text});
            step.results.set(id,{text:receipt(result.text.length),isError:result.isError,...(result.images?.length?{images:result.images}:{}),...(result.dropped?{dropped:result.dropped}:{})});}
          else step.results.set(id,result);
        }
        const oversized=large.length,trailing=matched!.trailing.length;if(large.length||matched!.trailing.length){step.stopAfter=true;step.followUp=followUpPrompt(large,matched!.trailing);}
        this.settle(session);meta={...meta,calls:step.calls.length,hostCalls:step.hostCalls.length,oversized,trailing};
      }
      const completed=await this.readWindow(session,request,hooks,signal,window,warmStart,meta.oversized,meta.trailing);completed.report.wall_ms=performance.now()-started;session.rebuildReason=undefined;session.toolsChanged=undefined;
      return{record:session,...completed};
    }catch(cause){
      const error=cause as Error&{stage?:string;usage?:NativeUsage;resultMessage?:SDKMessage;policyStart?:number;invalidRounds?:number;handoffStop?:boolean;oversized?:number;trailing?:number};
      usage=error.usage??usage;resultMessage=error.resultMessage??resultMessage;meta={...meta,policyStart:error.policyStart??meta.policyStart,invalidRounds:error.invalidRounds??0,handoffStop:error.handoffStop??false,oversized:error.oversized??0,trailing:error.trailing??0};
      // An idle stall was aborted by this bridge, not by the client: interrupt and drain like a cancellation.
      const stalled=error.stage==='upstream_stalled';
      if(signal.aborted||stalled)await this.cancel(session,request);else this.close(session);
      const report=this.report(session,request,usage,resultMessage,meta,{message:safeError(cause),stage:error.stage??(signal.aborted?'cancelled_or_timeout':'native')});report.wall_ms=performance.now()-started;
      return{record:session,reply:null,report};
    }finally{session.runtime.policy.reasoning=null;session.busy--;session.touched=Date.now();unlock();this.replenish();}
  }
}
function inputValue(value:unknown){return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
/** `QODER_IDLE_TIMEOUT_MS` bounds one native step's upstream silence; invalid values fall back to 180 s. */
function idleTimeout(config:Config){
  const raw=config.idleTimeoutMs??Number(process.env.QODER_IDLE_TIMEOUT_MS);
  return Number.isSafeInteger(raw)&&raw>=1000&&raw<=600000?raw:180000;
}
const laneOf=(request:{bridge_scope?:string;prompt_cache_key?:string})=>
  request.prompt_cache_key?`${request.bridge_scope??''}|${request.prompt_cache_key}`:undefined;
/** Names only (no descriptions or schemas) of the host tools that differ, for the rebuild report. */
function diffTools(before:HostToolTable,after:HostToolTable){
  const key=(tool:HostTool)=>JSON.stringify([tool.description,tool.inputSchema]),cap=(names:string[])=>names.slice(0,20);
  const old=new Map(before.tools.map(tool=>[tool.host,key(tool)])),next=new Map(after.tools.map(tool=>[tool.host,key(tool)]));
  return{added:cap([...next.keys()].filter(name=>!old.has(name))),removed:cap([...old.keys()].filter(name=>!next.has(name))),
    changed:cap([...next.keys()].filter(name=>old.has(name)&&old.get(name)!==next.get(name)))};
}
const API_ERROR_CODES=new Set(['authentication_failed','billing_error','rate_limit','invalid_request','server_error','unknown','max_output_tokens']);
function apiErrorCategory(value:unknown){return typeof value==='string'&&API_ERROR_CODES.has(value)?value:'unknown';}
function stepResultError(error:string){if(!error)throw new Error('Native schema validation failed without an error summary');}
