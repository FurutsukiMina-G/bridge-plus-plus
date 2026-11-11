import {HOST_BINDING,HostBinding} from '../src/native-tools.js';
import type {Config} from '../src/client.js';

export const nativeConfig=(overrides:Partial<Config>={}):Config=>({auth:'cli',timeout:5000,strategy:'permission',system:'test',model:'dfmodel',toolMode:'native',blankWarmLimit:0,nativeWarmLimit:0,...overrides});
export const toolRequest=(tools:Array<{name:string;description?:string;parameters?:Record<string,unknown>}>=[{name:'Read',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']}}])=>({
  model:'qoder-deepseek-flash',prompt_cache_key:'native-test',messages:[{role:'user' as const,content:'Inspect the file'}],
  tools:tools.map(tool=>({type:'function' as const,function:tool})),tool_choice:'auto' as const});
export function resultRequest(request:any,reply:any,results:any[],trailing:any[]=[]){
  return{...request,messages:[...request.messages,{role:'assistant',content:reply.content||null,tool_calls:reply.calls.map((call:any)=>({id:call.id,type:'function',function:{name:call.name,arguments:call.arguments}}))},
    ...results.map((content,index)=>({role:'tool',tool_call_id:reply.calls[index].id,content})),...trailing]};
}
export async function waitFor(check:()=>boolean,message='condition'){
  // Generous under a loaded full suite; a passing check returns immediately.
  for(let n=0;n<600;n++){if(check())return;await new Promise(resolve=>setTimeout(resolve,5));}
  throw new Error(`Timed out waiting for ${message}`);
}
const model={value:'dfmodel',displayName:'DeepSeek Flash',description:'',isEnabled:true,
  context_config:{full:{token_count:1000}},thinking_config:{enabled:{efforts:{low:{},high:{},max:{}}}}};
export class FakeRuntime{
  readonly binding:HostBinding;readonly options:any;readonly prompts:any[]=[];readonly handlers:Array<Promise<any>>=[];
  readonly warm:{close:()=>void};readonly q:any;readonly models=[model];listed:any[]|undefined;closed=0;interrupts=0;initToolCount:number|undefined;
  private events:any[]=[];private wake?:()=>void;private ended=false;private queue:any;private streamError?:Error;response=0;
  constructor(options:any){this.options=options;this.binding=options.mcpServers.host[HOST_BINDING];this.warm={close:()=>{this.closed++;this.ended=true;this.wake?.();}};
    this.q={initializationResult:async()=>{const listed=await this.binding.listTools();this.listed=listed.tools;
        return{account:{userId:'fake'},skills:[],tools:Array.from({length:this.initToolCount??listed.tools.length},(_,i)=>({name:`tool-${i}`}))};},
      mcpServerStatus:async()=>[{name:'host',tools:this.listed??[]}],listPlugins:async()=>[],applyFlagSettings:async()=>{},reloadPlugins:async()=>({error_count:0}),
      getContextUsage:async()=>({skills:{count:0,items:[]}}),getAvailableModels:async()=>[model],
      next:async()=>{for(;;){if(this.streamError){const error=this.streamError;this.streamError=undefined;throw error;}if(this.events.length)return{done:false,value:this.events.shift()};if(this.ended)return{done:true,value:undefined};await new Promise<void>(resolve=>{this.wake=resolve;});this.wake=undefined;}},
      [Symbol.asyncIterator](){return this;},interrupt:async()=>{this.interrupts++;this.result();}};}
  close(){this.warm.close();}
  query(queue:any){this.queue=queue;const push=queue.push.bind(queue);queue.push=(message:any)=>{this.prompts.push(message);push(message);};return this.q;}
  emit(event:any){this.events.push({session_id:'sdk-native',...event});this.wake?.();}
  result(total=1){this.emit({type:'result',subtype:'success',is_error:false,total_credits:total,usage:{},modelUsage:{}});}
  private start(id:string){this.options.resolveModel?.({purpose:'main',availableModels:[model]});this.emit({type:'stream_event',event:{type:'message_start',message:{id}}});}
  async toolStep(calls:Array<{id:string;name:string;input:Record<string,unknown>}>,options:{text?:string;ratio?:number;credits?:number;serial?:boolean;jsonDelta?:boolean}={}):Promise<Promise<any>[]>{
    const id=`response-${++this.response}`;this.start(id);
    if(options.text)this.emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text:options.text}}});
    for(const call of calls)this.emit({type:'stream_event',event:{type:'content_block_start',content_block:{type:'tool_use',id:call.id,name:call.name}}});
    if(options.jsonDelta)for(const call of calls){const text=JSON.stringify(call.input);for(const char of text)this.emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'input_json_delta',partial_json:char}}});}
    for(const call of calls){this.emit({type:'assistant',uuid:call.id,message:{id,content:[{type:'tool_use',id:call.id,name:call.name,input:call.input}]}});
      const hook=this.options.hooks.PreToolUse[0].hooks[0];await hook({tool_name:call.name});}
    this.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'tool_use'},usage:{credits:options.credits??0.1,original_credits:options.credits??0.1,billable:true,context_usage_ratio:options.ratio??0.1}}});
    const entered:Promise<any>[]=[];const enter=(call:any)=>{const pending=this.binding.callTool(call.name,call.input,new AbortController().signal);this.handlers.push(pending);entered.push(pending);return pending;};
    if(options.serial&&calls.length>1){const first=enter(calls[0]);void first.finally(()=>{for(const call of calls.slice(1))enter(call);});}
    else for(const call of calls)enter(call);
    return entered;
  }
  async postToolUse(){const hook=this.options.hooks.PostToolUse[0].hooks[0];return await hook({});}
  async post(){return await this.postToolUse();}
  async postToolUseId(tool_use_id:string){const hook=this.options.hooks.PostToolUse[0].hooks[0];return await hook({tool_use_id});}
  /** Enter the handlers before the bridge reads the step's message_delta (and before it has a step to bind to). */
  async earlyToolStep(calls:Array<{id:string;name:string;input:Record<string,unknown>}>,options:{text?:string;ratio?:number;credits?:number;beforeStream?:boolean}={}):Promise<Promise<any>[]>{
    const id=`response-${++this.response}`;
    const enter=(call:any)=>{const pending=this.binding.callTool(call.name,call.input,new AbortController().signal);this.handlers.push(pending);return pending;};
    const entered=options.beforeStream?calls.map(enter):[];
    this.start(id);
    if(options.text)this.emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text:options.text}}});
    for(const call of calls)this.emit({type:'stream_event',event:{type:'content_block_start',content_block:{type:'tool_use',id:call.id,name:call.name}}});
    for(const call of calls){this.emit({type:'assistant',uuid:call.id,message:{id,content:[{type:'tool_use',id:call.id,name:call.name,input:call.input}]}});
      const hook=this.options.hooks.PreToolUse[0].hooks[0];await hook({tool_name:call.name});}
    if(!options.beforeStream)for(const call of calls)entered.push(enter(call));
    this.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'tool_use'},usage:{credits:options.credits??0.1,original_credits:options.credits??0.1,billable:true,context_usage_ratio:options.ratio??0.1}}});
    return entered;
  }
  /** Emit a complete tool step without entering its handlers. */
  async silentToolStep(calls:Array<{id:string;name:string;input:Record<string,unknown>}>,options:{text?:string;ratio?:number;credits?:number}={}):Promise<void>{
    const id=`response-${++this.response}`;this.start(id);
    if(options.text)this.emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text:options.text}}});
    for(const call of calls)this.emit({type:'stream_event',event:{type:'content_block_start',content_block:{type:'tool_use',id:call.id,name:call.name}}});
    for(const call of calls){this.emit({type:'assistant',uuid:call.id,message:{id,content:[{type:'tool_use',id:call.id,name:call.name,input:call.input}]}});
      const hook=this.options.hooks.PreToolUse[0].hooks[0];await hook({tool_name:call.name});}
    this.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'tool_use'},usage:{credits:options.credits??0.1,original_credits:options.credits??0.1,billable:true,context_usage_ratio:options.ratio??0.1}}});
  }
  /** Let the bridge settle the step first, then enter the handler. */
  async lateToolStep(calls:Array<{id:string;name:string;input:Record<string,unknown>}>,options:{text?:string;ratio?:number;credits?:number}={}):Promise<Promise<any>[]>{
    await this.silentToolStep(calls,options);
    await new Promise<void>(resolve=>setImmediate(resolve));
    return calls.map(call=>{const pending=this.binding.callTool(call.name,call.input,new AbortController().signal);this.handlers.push(pending);return pending;});
  }
  /** A final response whose assistant message carries text but no text_delta events. */
  bareFinal(text:string,options:{ratio?:number;credits?:number;stop?:string;total?:number}={}){
    const id=`response-${++this.response}`;this.start(id);
    this.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:options.stop??'end_turn'},usage:{credits:options.credits??0.2,original_credits:options.credits??0.2,billable:true,context_usage_ratio:options.ratio??0.2}}});
    this.emit({type:'assistant',uuid:id,message:{id,content:[{type:'text',text}]}});this.result(options.total??1);
  }
  /** Make the background q iterator reject while the session is live. */
  failStream(error:Error=new Error('Fake native stream failure')){this.streamError=error;this.wake?.();}
  final(text:string,options:{deltas?:string[];ratio?:number;credits?:number;stop?:string;total?:number}|string[]={}){
    if(Array.isArray(options))options={deltas:options};
    const id=`response-${++this.response}`;this.start(id);const deltas=options.deltas??[text];
    for(const delta of deltas)this.emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text:delta}}});
    this.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:options.stop??'end_turn'},usage:{credits:options.credits??0.2,original_credits:options.credits??0.2,billable:true,context_usage_ratio:options.ratio??0.2}}});
    this.emit({type:'assistant',uuid:id,message:{id,content:[{type:'text',text}]}});this.result(options.total??1);
  }
  /** interrupt() never settles; by default the drain still receives a result so the session can go idle. */
  hangInterrupt(drain=true){this.q.interrupt=()=>{this.interrupts++;if(drain)setTimeout(()=>this.result(),10);return new Promise<never>(()=>{});};}
  /** The SDK reports a retryable upstream error before its system/api_retry event. */
  apiError(error='rate_limit'){this.emit({type:'assistant',isApiErrorMessage:true,error,message:{id:`error-${++this.response}`,content:[]}});}
  apiRetry(attempt=1,max=3){this.emit({type:'system',subtype:'api_retry',attempt,max_retries:max,retry_delay_ms:1,error_status:429});}
  /** End the window with a failing result instead of a successful one. */
  failedResult(subtype='error_during_execution'){this.emit({type:'result',subtype,is_error:true,total_credits:1,usage:{},modelUsage:{}});}
}
export function fakeStarter(runtimes:FakeRuntime[],configure?:(runtime:FakeRuntime,index:number)=>void){
  return (async({options}:any)=>{const runtime=new FakeRuntime(options);runtimes.push(runtime);configure?.(runtime,runtimes.length-1);return runtime;}) as any;
}
