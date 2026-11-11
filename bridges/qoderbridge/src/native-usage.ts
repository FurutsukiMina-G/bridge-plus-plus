import type {SDKMessage} from '@qodercn-ai/qodercn-agent-sdk';
import {prefixCacheEstimate,withCachedTokens,type OpenAIUsage} from './usage.js';
import type {Config} from './client.js';

type Row={id:string|null;credits:number|null;original_credits:number|null;billable:boolean|null;context_usage_ratio:number|null;
  text_deltas:number;text_chars:number;thinking_deltas:number;thinking_chars:number;input_json_deltas:number;input_json_chars:number;
  input_json_max_delta_chars:number;tool_input_chars:number;stop_reason:string|null;context_window:number|null};
export class NativeUsage{
  readonly rows:Row[]=[];private current?:Row;
  totalCredits:number|null=null;apiErrors:string[]=[];sdkErrors:string[]=[];sdkErrorCode:string|number|null=null;sessionId:string|null=null;
  observe(message:SDKMessage,contextWindow:number|null){
    this.sessionId=message.session_id??this.sessionId;
    if(message.type==='assistant'&&message.isApiErrorMessage)this.apiErrors.push(typeof message.error==='string'?message.error:'unknown');
    if(message.type==='result'){this.totalCredits=message.total_credits??this.totalCredits;this.sdkErrors='errors'in message?message.errors.map(String):[];this.sdkErrorCode=message.error_code??null;}
    if(message.type!=='stream_event')return;
    const event=message.event as {type:string;message?:{id?:string};usage?:Record<string,unknown>;delta?:{type?:string;text?:string;thinking?:string;partial_json?:string;stop_reason?:string}};
    if(event.type==='message_start'){
      this.current={id:event.message?.id??null,credits:null,original_credits:null,billable:null,context_usage_ratio:null,text_deltas:0,text_chars:0,
        thinking_deltas:0,thinking_chars:0,input_json_deltas:0,input_json_chars:0,input_json_max_delta_chars:0,tool_input_chars:0,stop_reason:null,context_window:contextWindow};
      this.rows.push(this.current);
    }
    const row=this.current;if(!row)return;
    const delta=event.delta;
    if(event.type==='content_block_delta'&&delta?.type==='text_delta'){row.text_deltas++;row.text_chars+=delta.text?.length??0;}
    if(event.type==='content_block_delta'&&delta?.type==='thinking_delta'){row.thinking_deltas++;row.thinking_chars+=delta.thinking?.length??0;}
    if(event.type==='content_block_delta'&&delta?.type==='input_json_delta'){
      const chars=delta.partial_json?.length??0;row.input_json_deltas++;row.input_json_chars+=chars;row.input_json_max_delta_chars=Math.max(row.input_json_max_delta_chars,chars);
    }
    if(event.type==='message_delta'){
      row.stop_reason=delta?.stop_reason??row.stop_reason;
      if(typeof event.usage?.credits==='number')row.credits=event.usage.credits;
      if(typeof event.usage?.original_credits==='number')row.original_credits=event.usage.original_credits;
      if(typeof event.usage?.billable==='boolean')row.billable=event.usage.billable;
      if(typeof event.usage?.context_usage_ratio==='number')row.context_usage_ratio=event.usage.context_usage_ratio;
    }
  }
  toolInput(id:string,chars:number){const row=this.rows.find(row=>row.id===id);if(row)row.tool_input_chars+=chars;}
  snapshot(config:Config,previousPrompt:number|null){
    // Clients read prompt_tokens as the current context (the ring takes the latest request): report the last response's
    // prompt plus every response's output, as the JSON path does for corrections. The per-response prompts stay in `rows`.
    const rows=this.rows,last=rows.at(-1),known=(row:Row)=>typeof row.context_usage_ratio==='number'&&row.context_usage_ratio>0&&row.context_usage_ratio<=1&&typeof row.context_window==='number';
    const promptKnown=!!last&&known(last),prompt=promptKnown?Math.round(last!.context_usage_ratio!*last!.context_window!):null;
    const promptSum=rows.length&&rows.every(known)?rows.reduce((n,row)=>n+Math.round(row.context_usage_ratio!*row.context_window!),0):null;
    let output=0,reasoning=0,estimated=false;
    for(const row of rows){
      const reliable=row.input_json_deltas>0&&row.input_json_max_delta_chars<=256&&
        (row.input_json_deltas<32||row.input_json_chars/row.input_json_deltas<=12);
      const tool=reliable?row.input_json_deltas:Math.ceil(row.tool_input_chars/3);
      if(!reliable&&row.tool_input_chars)estimated=true;
      output+=row.text_deltas+row.thinking_deltas+tool;reasoning+=row.thinking_deltas;
    }
    const usage:OpenAIUsage|null=rows.length&&prompt!==null?{prompt_tokens:prompt,completion_tokens:output,total_tokens:prompt+output,
      completion_tokens_details:{reasoning_tokens:reasoning}}:null;
    const estimate=usage?prefixCacheEstimate(prompt!,previousPrompt):null;
    const cached=config.cacheUsage==='estimate'||config.cacheUsage==='billing'?estimate:null;
    const clientUsage=usage&&cached!==null?withCachedTokens(usage,cached):usage;
    const sum=(key:'credits'|'original_credits')=>rows.length&&rows.every(row=>typeof row[key]==='number')?rows.reduce((n,row)=>n+row[key]!,0):null;
    return{rows,prompt_tokens_known:promptKnown,prompt_tokens_all_responses:promptSum,client_usage:clientUsage,cache_estimate_tokens:estimate,
      cache_estimate_ratio:estimate!==null&&prompt?estimate/prompt:null,client_cache_usage:clientUsage?.prompt_tokens_details?'session_prefix_estimate':'omitted',
      credits:sum('credits'),original_credits:sum('original_credits'),billable:rows.some(row=>row.billable===false)?false:rows.some(row=>row.billable===true)?true:null,
      usage_source:`native_context_ratio+stream_deltas${estimated?'+tool_input_estimate':''}`,model_requests:rows.length,
      reasoning_tokens:reasoning,streamed_output_tokens:rows.reduce((n,row)=>n+row.text_deltas+row.thinking_deltas,0)};
  }
}
