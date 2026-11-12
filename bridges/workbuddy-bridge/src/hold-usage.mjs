import {DecisionOutput} from './decision-output.mjs';
import {normalizedUsage,requestUsage,usageAccounting} from './usage.mjs';
/** Per-response official tokens: Result.usage is cumulative across the session. */
export class NativeUsage {
  rows=[];byId=new Map();current=null;apiErrors=[];
  observe(message,_contextWindow,responseId){
    if(message.isReplay)return;
    if(message.type==='assistant'&&message.isApiErrorMessage){this.apiErrors.push(message.error??'unknown');return;}
    const event=message.event;
    const rawId=event?.type==='message_start'?event.message?.id:message.type==='assistant'?message.message?.id:null;
    const id=responseId??rawId;
    if(id){
      let row=this.byId.get(id);
      if(!row){row={id,output:new DecisionOutput(),stop_reason:null,stop_reasons:[],upstream_message_ids:[],tool_input_chars:0};this.rows.push(row);this.byId.set(id,row);}
      this.current=row;
    }
    if(!this.current&&(message.type==='assistant'||message.type==='stream_event')){
      this.current={id:null,output:new DecisionOutput(),stop_reason:null,stop_reasons:[],upstream_message_ids:[],tool_input_chars:0};this.rows.push(this.current);
    }
    if(message.type==='result')return; // never attach a cumulative subtotal to one response
    const row=this.current;if(!row)return;
    if(rawId&&!row.upstream_message_ids.includes(rawId))row.upstream_message_ids.push(rawId);
    // DecisionOutput must also see one response ID so empty/split assistant
    // snapshots cannot create extra usage attempts or double-count their prompt.
    row.output.observe(message.type==='assistant'?{...message,message:{...message.message,id:row.id}}:message);
    const reason=event?.delta?.stop_reason??message.message?.stop_reason;
    if(reason){row.stop_reasons.push(reason);if(row.stop_reason!=='tool_use'||reason==='tool_use')row.stop_reason=reason;}
  }
  toolInput(id,chars){const row=this.byId.get(id);if(row)row.tool_input_chars+=chars;}
  snapshot(){
    const rows=this.rows.map(({output,...row})=>{
      const raw=output.usage(null,{resumed:true});
      return {...row,input_tokens:raw?.input_tokens??null,output_tokens:raw?.output_tokens??null,
        cache_read_input_tokens:raw?.cache_read_input_tokens??null,cache_creation_input_tokens:raw?.cache_creation_input_tokens??null,
        usage:normalizedUsage({usage:raw}),context_usage_ratio:null};
    });
    const items=rows.map(row=>row.usage),usage=requestUsage(items);
    return {rows,client_usage:usage,client_cache_usage:usage?.prompt_tokens_details?'reported':'omitted',
      usage_source:usage?'workbuddy-official-sdk':'unavailable',credits:null,reasoning_tokens:null,
      cache_estimate_tokens:null,cache_estimate_ratio:null,prompt_tokens_all_responses:items.length&&items.every(Boolean)?items.reduce((n,u)=>n+u.prompt_tokens,0):null,
      accounting:usageAccounting(items)};
  }
}
