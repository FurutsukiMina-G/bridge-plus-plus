import assert from 'node:assert/strict';
import type {FakeRuntime} from './native-fake.js';

export type TraceCall={id:string;name:string;input:Record<string,unknown>};
/** WorkBuddy R3 event ordering, applied as a synthetic future Qoder variant.
 * No real Qoder failure, provider response text or credentials are claimed. */
export class NativeTrace{
  readonly events:Array<{kind:string;id?:string;stop?:string}>=[];
  readonly posts:any[]=[];
  finished:Promise<any[]>=Promise.resolve([]);
  constructor(readonly runtime:FakeRuntime){}
  private emit(message:any){this.events.push({kind:message.type==='stream_event'?message.event.type:message.type,stop:message.event?.delta?.stop_reason});this.runtime.emit(message);}
  private start(){const id=`trace-stream-${++this.runtime.response}`;
    this.runtime.options.resolveModel?.({purpose:'main',availableModels:this.runtime.models});
    this.emit({type:'stream_event',event:{type:'message_start',message:{id}}});return id;}
  async step(calls:TraceCall[],{streamIds=calls.map(c=>c.id),assistantOrder=calls,beforeAssistant=async(_index:number)=>{},serial=false}:{streamIds?:string[];assistantOrder?:TraceCall[];beforeAssistant?:(index:number)=>Promise<void>;serial?:boolean}={}){
    const id=this.start(),turn=this.runtime.response,pre=this.runtime.options.hooks.PreToolUse[0].hooks[0];
    for(const [index,call]of calls.entries())this.emit({type:'stream_event',event:{type:'content_block_start',content_block:{type:'tool_use',id:streamIds[index],name:call.name}}});
    const usage={credits:0.1,original_credits:0.1,billable:true,context_usage_ratio:0.1};
    this.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'tool_use'},usage}});
    this.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'end_turn'},usage}});
    for(const [index,call]of calls.entries()){
      this.events.push({kind:'PreToolUse',id:streamIds[index]});
      assert.equal((await pre({tool_name:call.name,tool_use_id:streamIds[index],tool_input:call.input})).hookSpecificOutput.permissionDecision,'allow');
    }
    this.emit({type:'assistant',uuid:`empty-${turn}`,message:{id:`trace-assistant-empty-${turn}`,content:[]}});
    for(const [index,call]of assistantOrder.entries()){
      await beforeAssistant(index);
      this.emit({type:'assistant',uuid:`part-${turn}-${index}`,message:{id:`trace-assistant-${turn}-${index}`,content:[{type:'tool_use',...call}]}});
    }
    const runtimeIds=calls.map((_,index)=>`00000000-0000-4000-8000-${String(turn*100+index).padStart(12,'0')}`);
    for(const [index,call]of calls.entries()){
      this.events.push({kind:'PreToolUse',id:runtimeIds[index]});
      assert.equal((await pre({tool_name:call.name,tool_use_id:runtimeIds[index],tool_input:call.input})).hookSpecificOutput.permissionDecision,'allow');
    }
    const entered:Promise<any>[]=[],tasks:Promise<any>[]=[];
    const enter=(call:TraceCall,index:number)=>{
      this.events.push({kind:'handler-enter'});
      const pending=this.runtime.binding.callTool(call.name,call.input,new AbortController().signal);entered.push(pending);this.runtime.handlers.push(pending);
      return pending.then(async result=>{
        this.events.push({kind:'handler-leave'});this.events.push({kind:'PostToolUse',id:runtimeIds[index]});
        this.posts.push(await this.runtime.options.hooks.PostToolUse[0].hooks[0]({tool_name:call.name,tool_use_id:runtimeIds[index],tool_input:call.input,tool_response:result}));return result;
      });
    };
    let previous:Promise<any>|undefined;
    for(const [index,call]of calls.entries()){const task=serial&&previous?previous.then(()=>enter(call,index)):enter(call,index);tasks.push(task);previous=task;}
    this.finished=Promise.all(tasks);void this.finished.catch(()=>{});return {id,entered};
  }
  final(text:string){const id=this.start(),turn=this.runtime.response;
    for(const part of text)this.emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text:part}}});
    this.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'end_turn'},usage:{credits:0.2,context_usage_ratio:0.2}}});
    this.emit({type:'assistant',uuid:`final-empty-${turn}`,message:{id:`trace-final-empty-${turn}`,content:[]}});
    this.emit({type:'assistant',uuid:`final-${turn}`,message:{id:`trace-final-${turn}`,content:[{type:'text',text}]}});this.runtime.result();return id;
  }
}
