// Event shape/order transcribed from R3 out/1-1794389351718.json (14292–16839 ms).
// IDs, inputs and replies are synthetic. Token counters retain the R3 metadata;
// no model response text or authentication material is copied into this fixture.
import assert from 'node:assert/strict';
export const TRACE_SOURCE='R3/out/1-1794389351718.json';
const zero={input_tokens:0,output_tokens:0,cache_read_input_tokens:0,cache_creation_input_tokens:0};
const measured={input_tokens:4663,output_tokens:119,cache_read_input_tokens:3328,cache_creation_input_tokens:1335};
const errorResult=()=>({content:[{type:'text',text:'Synthetic session closed.'}],isError:true});
function record(session,entry){(session.nativeTrace??=[]).push(entry);}
function emit(session,message){record(session,{kind:message.type==='stream_event'?message.event.type:message.type,...(message.event?.delta?.stop_reason?{stop:message.event.delta.stop_reason}:{})});session.emit(message);}
function hookInput(session,event,name,input,id){return {hook_event_name:event,session_id:'synthetic-session',transcript_path:'synthetic-unused',cwd:'synthetic-unused',permission_mode:'default',tool_use_id:id,tool_name:name,tool_input:input};}
async function pre(session,call,id){
  record(session,{kind:'PreToolUse',id,name:call.name});
  const result=await session.options.hooks.PreToolUse[0].hooks[0](hookInput(session,'PreToolUse',call.name,call.input,id));
  assert.equal(result.hookSpecificOutput.permissionDecision,'allow');return result;
}

export async function traceToolStep(session,calls,{streamIds=calls.map(c=>c.id),assistantOrder=calls,serial,usage=measured,beforeAssistant=async()=>{}}={}){
  const turn=++session.response,model=session.options.model,streamId=`stream-turn-${turn}`;
  emit(session,{type:'stream_event',event:{type:'message_start',message:{id:streamId,model,usage:zero}}});
  for(const [index,call]of calls.entries())emit(session,{type:'stream_event',event:{type:'content_block_start',content_block:{type:'tool_use',id:streamIds[index],name:call.name}}});
  emit(session,{type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'tool_use'},usage}});
  emit(session,{type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'end_turn'},usage:{...usage,cache_creation_input_tokens:0}}});
  for(const [index,call]of calls.entries())await pre(session,call,streamIds[index]);
  emit(session,{type:'assistant',uuid:`empty-${turn}`,message:{id:`assistant-empty-${turn}`,model,content:[],usage:zero}});
  for(const [index,call]of assistantOrder.entries()){
    await beforeAssistant(index);
    emit(session,{type:'assistant',uuid:`part-${turn}-${index}`,message:{id:`assistant-part-${turn}-${index}`,model,content:[{type:'tool_use',...call}],usage:index===assistantOrder.length-1?usage:zero}});
  }
  const runtimeIds=calls.map((_,index)=>`00000000-0000-4000-8000-${String(turn*100+index).padStart(12,'0')}`);
  for(const [index,call]of calls.entries())await pre(session,call,runtimeIds[index]);
  session.handlers??=[];session.controllers??=[];session.tracePosts??=[];
  const entered=[],run=(call,index)=>{
    if(session.closed)return Promise.resolve(errorResult());
    const controller=new AbortController();session.controllers.push(controller);
    record(session,{kind:'handler-enter',name:call.name,input:call.input});
    const raw=session.binding.callTool(call.name,call.input,controller.signal);session.handlers.push(raw);entered.push(raw);
    return raw.then(async result=>{
      record(session,{kind:'handler-leave',name:call.name});
      const hook={...hookInput(session,'PostToolUse',call.name,call.input,runtimeIds[index]),tool_response:result};
      record(session,{kind:'PostToolUse',id:runtimeIds[index],name:call.name});
      const post=await session.options.hooks.PostToolUse[0].hooks[0](hook);session.tracePosts.push(post);return result;
    });
  };
  const readOnly=call=>session.listed?.find(tool=>tool.name===call.name.replace(/^mcp__host__/,''))?.annotations?.readOnlyHint===true;
  const sequential=serial??!calls.every(readOnly),tasks=[];let previous;
  for(const [index,call]of calls.entries()){
    const task=sequential&&previous?previous.then(()=>run(call,index)):run(call,index);tasks.push(task);previous=task;
  }
  session.traceStepFinished=Promise.all(tasks);void session.traceStepFinished.catch(()=>{});
  return entered;
}

export function traceFinal(session,text,{usage={input_tokens:4818,output_tokens:99,cache_read_input_tokens:4544,cache_creation_input_tokens:274},stop='end_turn',bare=false,deltas=[...text]}={}){
  const turn=++session.response,model=session.options.model,id=`stream-final-${turn}`;
  emit(session,{type:'stream_event',event:{type:'message_start',message:{id,model,usage:zero}}});
  if(!bare)for(const part of deltas)emit(session,{type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text:part}}});
  emit(session,{type:'stream_event',event:{type:'message_delta',delta:{stop_reason:stop},usage:{...usage,cache_creation_input_tokens:0}}});
  emit(session,{type:'assistant',uuid:`final-empty-${turn}`,message:{id:`assistant-final-empty-${turn}`,model,content:[],usage:zero}});
  emit(session,{type:'assistant',uuid:`final-text-${turn}`,message:{id:`assistant-final-text-${turn}`,model,content:[{type:'text',text}],usage}});
  session.result?.();
  if(!session.result)emit(session,{type:'result',subtype:'success',is_error:false});
}
