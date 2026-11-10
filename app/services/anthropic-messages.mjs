import {randomUUID,createHash} from 'node:crypto';
import {historyText} from './history-content.mjs';
import {failureDetails} from './failure-details.mjs';
import {sse} from './responses.mjs';
import {stripBillingLines} from './prompt-filters.mjs';

const id=prefix=>prefix+randomUUID().replaceAll('-','');
const historyTypes=new Set(['text','input_text','output_text','input_image','image_url','image','input_audio','audio','input_video','video_url','video','input_file','file','document']);
const stripCacheControl=value=>Array.isArray(value)?value.map(stripCacheControl):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>key!=='cache_control').map(([key,item])=>[key,stripCacheControl(item)])):value;
function chatToolParameters(schema){
  const parameters=stripCacheControl(schema??{type:'object',properties:{}});
  if(parameters&&typeof parameters==='object'&&!Array.isArray(parameters))delete parameters.$schema;
  return parameters;
}
function omission(part,omitted){
  const type=typeof part?.type==='string'?part.type:'unknown';omitted.add(type);
  const hash=createHash('sha256').update(JSON.stringify(part)).digest('hex');
  return `[Bridge++ omitted ${type}: this bridge transport accepts text only; media was NOT inspected. sha256=${hash}]`;
}
function normalContent(content,images,omitted){
  if(content==null)return '';
  if(typeof content==='string')return content;
  if(!Array.isArray(content))throw new Error('Message content must be text or content parts');
  const parts=content.map(part=>historyTypes.has(part?.type)?part:{type:'text',text:omission(part,omitted)});
  return historyText(parts,type=>omitted.add(type),images);
}
function mergeContent(left,right){
  if(!left)return right;if(!right)return left;
  const parts=value=>Array.isArray(value)?value:[{type:'text',text:value}];
  if(typeof left==='string'&&typeof right==='string')return left+'\n'+right;
  return [...parts(left),...parts(right)];
}
function appendUser(messages,content){
  if(content===''||Array.isArray(content)&&!content.length)return;
  const last=messages.at(-1);if(last?.role==='user')last.content=mergeContent(last.content,content);else messages.push({role:'user',content});
}
function toolResultContent(content,images,omitted){
  if(typeof content==='string'||content==null)return {text:content??'',images:[]};
  if(!Array.isArray(content))return {text:JSON.stringify(stripCacheControl(content)),images:[]};
  const text=[],pictures=[];
  for(const part of content){
    if(typeof part==='string'){text.push(part);continue;}
    if(part?.type==='text'&&typeof part.text==='string'){text.push(part.text);continue;}
    if(part?.type==='tool_reference'&&typeof part.tool_name==='string'){text.push(`Tool definition loaded: ${part.tool_name} (now available in the tools list).`);continue;}
    if(part?.type==='image'){
      if(images){const converted=historyText([part],type=>omitted.add(type),true);pictures.push(...converted);}
      else text.push(historyText([part],type=>omitted.add(type),false));
      continue;
    }
    if(historyTypes.has(part?.type)){text.push(historyText([part],type=>omitted.add(type),false));continue;}
    text.push(JSON.stringify(stripCacheControl(part)));
  }
  return {text:text.join('\n'),images:pictures};
}
function nativeOperation(part){
  if(part.type==='server_tool_use')return `[server_tool_use ${part.name??''}]\n${JSON.stringify(stripCacheControl(part.input??{}))}`;
  const rows=Array.isArray(part.content)?part.content:[];
  const lines=rows.map(row=>[row?.title,row?.url].filter(Boolean).join('\n')).filter(Boolean);
  return '[web_search_tool_result]'+(lines.length?'\n'+lines.join('\n'):'');
}
function toolChoice(value){
  if(value==null)return undefined;
  const type=typeof value==='string'?value:value.type;
  if(type==='auto'||type==='none')return type;
  if(type==='any')return 'required';
  if(type==='tool')return {type:'function',function:{name:value.name}};
  throw new Error('Unsupported Anthropic tool_choice');
}
function systemContent(system,omitted){
  const parts=typeof system==='string'?[{type:'text',text:system}]:system;
  if(!Array.isArray(parts))throw new Error('Anthropic system 必须是字符串或文本块数组');
  const kept=[];
  for(const part of parts){
    if(part?.type!=='text'||typeof part.text!=='string'){kept.push(part);continue;}
    const text=stripBillingLines(part.text);if(text)kept.push(text===part.text?part:{...part,text});
  }
  return kept.length?normalContent(kept,false,omitted):'';
}
export function anthropicToChat(body,{images=false}={}){
  if(!body||typeof body!=='object'||!Array.isArray(body.messages))throw new Error('Anthropic messages 必须是非空数组');
  const omitted=new Set(),messages=[];
  if(body.system){
    const content=systemContent(body.system,omitted);
    if(content)messages.push({role:'system',content});
  }
  for(const message of body.messages){
    const content=message?.content,blocks=typeof content==='string'||content==null?[{type:'text',text:content??''}]:content;
    if(!Array.isArray(blocks))throw new Error('Message content must be text or content parts');
    if(message.role==='system'){messages.push({role:'system',content:normalContent(blocks,false,omitted)});continue;}
    if(message.role==='user'){
      if(blocks.some(part=>part?.type==='tool_result')){
        const pictures=[];
        for(const part of blocks.filter(part=>part?.type==='tool_result')){
          if(typeof part.tool_use_id!=='string'||!part.tool_use_id)throw new Error('tool_result 缺少 tool_use_id');
          const result=toolResultContent(part.content,images,omitted);
          messages.push({role:'tool',tool_call_id:part.tool_use_id,content:(part.is_error===true?'[tool error] ':'')+result.text});
          if(result.images.length)pictures.push(...result.images);
        }
        const rest=blocks.filter(part=>part?.type!=='tool_result');
        if(pictures.length)appendUser(messages,pictures);
        if(rest.length)appendUser(messages,normalContent(rest,images,omitted));
      }else appendUser(messages,normalContent(blocks,images,omitted));
      continue;
    }
    if(message.role==='assistant'){
      const text=[],calls=[];
      for(const part of blocks){
        if(part?.type==='text'&&typeof part.text==='string')text.push(part.text);
        else if(part?.type==='tool_use')calls.push({id:part.id,type:'function',function:{name:part.name,arguments:JSON.stringify(stripCacheControl(part.input??{}))}});
        else if(['thinking','redacted_thinking'].includes(part?.type))continue;
        else if(['server_tool_use','web_search_tool_result'].includes(part?.type))text.push(nativeOperation(part));
        else if(part?.type!=='text')text.push(omission(part,omitted));
      }
      messages.push({role:'assistant',content:text.length?text.join('\n'):null,...calls.length?{tool_calls:calls}:{}});continue;
    }
    throw new Error('Unsupported Anthropic message role: '+String(message?.role));
  }
  const tools=(body.tools??[]).filter(tool=>tool?.defer_loading!==true&&(!tool.type||tool.type==='custom')).map(tool=>({type:'function',function:{name:tool.name,description:tool.description??'',parameters:chatToolParameters(tool.input_schema)}}));
  const choice=toolChoice(body.tool_choice),parallel=body.disable_parallel_tool_use===true||body.tool_choice?.disable_parallel_tool_use===true;
  return {model:body.model,messages,...body.stream!==undefined?{stream:body.stream}:{},...body.stream===true?{stream_options:{include_usage:true}}:{},...body.max_tokens!==undefined?{max_tokens:body.max_tokens}:{},...body.stop_sequences!==undefined?{stop:body.stop_sequences}:{},...tools.length?{tools}:{},...choice!==undefined?{tool_choice:choice}:{},...parallel?{parallel_tool_calls:false}:{},...omitted.size?{bridge_omitted_media:[...omitted]}:{}};
}

export function anthropicErrorType(status){return status===400?'invalid_request_error':status===401?'authentication_error':status===403?'permission_error':status===404?'not_found_error':status===413?'request_too_large':status===429?'rate_limit_error':[503,529].includes(status)?'overloaded_error':'api_error';}
export function anthropicError(status,error,secrets=[]){
  const detail=failureDetails(error,status,secrets),prefix=status===429?'上游请求受到频率限制：':status>=500?'上游或网关请求失败：':'请求失败：';
  return {type:'error',error:{type:anthropicErrorType(status),message:prefix+detail.message+(detail.reset_at?`；重置时间：${detail.reset_at}`:'')}};
}
const anthropicUsage=usage=>{const cached=Number.isFinite(usage?.prompt_tokens_details?.cached_tokens)?usage.prompt_tokens_details.cached_tokens:0;return {input_tokens:Math.max((usage?.prompt_tokens??0)-cached,0),output_tokens:usage?.completion_tokens??0,cache_read_input_tokens:cached,cache_creation_input_tokens:0};};
export const anthropicStopReason=(reason,tools=false)=>reason==='stop'?'end_turn':reason==='tool_calls'?'tool_use':reason==='length'?'max_tokens':reason==='content_filter'?'refusal':tools?'tool_use':'end_turn';
export class AnthropicProjection {
  constructor(model,emit=()=>{}){this.model=model;this.emit=emit;this.messageId=id('msg_');this.blocks=[];this.tools=new Map();this.active=null;this.usage=anthropicUsage();this.started=false;}
  event(type,data){this.emit({type,...data});}
  envelope(){return {id:this.messageId,type:'message',role:'assistant',model:this.model,content:this.blocks.map(block=>block.public),stop_reason:this.stopReason??null,stop_sequence:null,usage:this.usage};}
  start(usage){if(this.started)return;this.started=true;if(usage)this.usage=anthropicUsage(usage);this.event('message_start',{message:{...this.envelope(),content:[]}});}
  closeActive(){
    const active=this.active;if(!active)return;
    if(active.kind==='thinking'){active.public.signature='bridgepp-thinking-signature';this.event('content_block_delta',{index:active.index,delta:{type:'signature_delta',signature:active.public.signature}});}
    this.event('content_block_stop',{index:active.index});this.active=null;
  }
  open(kind){
    if(this.active?.kind===kind)return this.active;this.closeActive();
    const index=this.blocks.length,block=kind==='text'?{type:'text',text:''}:{type:'thinking',thinking:''};
    const active={kind,index,public:block};this.blocks.push(active);this.active=active;this.event('content_block_start',{index,content_block:{...block}});return active;
  }
  accept(chunk){
    if(chunk.error)throw Object.assign(new Error(chunk.error.message??'上游模型请求失败'),{details:chunk.error});
    this.start(chunk.usage);if(chunk.usage)this.usage=anthropicUsage(chunk.usage);
    for(const choice of chunk.choices??[]){
      const delta=choice.delta??{};
      if(delta.reasoning_content){const block=this.open('thinking');block.public.thinking+=delta.reasoning_content;this.event('content_block_delta',{index:block.index,delta:{type:'thinking_delta',thinking:delta.reasoning_content}});}
      if(delta.content){const block=this.open('text');block.public.text+=delta.content;this.event('content_block_delta',{index:block.index,delta:{type:'text_delta',text:delta.content}});}
      for(const call of delta.tool_calls??[]){
        const key=call.index??call.id;let tool=this.tools.get(key);
        if(!tool){
          if(!call.function?.name)throw new Error('上游工具调用缺少名称');
          tool={key,id:call.id??id('toolu_'),name:call.function.name,arguments:''};this.tools.set(key,tool);
        }
        tool.arguments+=call.function?.arguments??'';
      }
      if(choice.finish_reason)this.finishReason=choice.finish_reason;
    }
  }
  toolBlocks(){
    const rows=[...this.tools.values()];
    return rows.every(tool=>typeof tool.key==='number')?rows.sort((left,right)=>left.key-right.key):rows;
  }
  emitTools(){
    for(const tool of this.toolBlocks()){
      const index=this.blocks.length,block={type:'tool_use',id:tool.id,name:tool.name,input:{}};
      this.blocks.push({kind:'tool',index,public:block});
      this.event('content_block_start',{index,content_block:{...block}});
      this.event('content_block_delta',{index,delta:{type:'input_json_delta',partial_json:tool.arguments||'{}'}});
      try{block.input=JSON.parse(tool.arguments||'{}');}catch{throw new Error('上游工具调用参数不是有效 JSON');}
      this.event('content_block_stop',{index});
    }
  }
  finish(){
    this.start();this.closeActive();this.emitTools();
    this.stopReason=anthropicStopReason(this.finishReason,this.tools.size>0);
    this.event('message_delta',{delta:{stop_reason:this.stopReason,stop_sequence:null},usage:this.usage});this.event('message_stop',{});return this.envelope();
  }
}
export function anthropicFromChat(body,response){
  const choice=response.choices?.[0]??{},message=choice.message??{},projection=new AnthropicProjection(body.model);
  projection.accept({usage:response.usage,choices:[{delta:{content:message.content,reasoning_content:message.reasoning_content,tool_calls:(message.tool_calls??[]).map((call,index)=>({...call,index}))},finish_reason:choice.finish_reason}]});
  return projection.finish();
}
function sendJson(res,status,value){if(res.destroyed||res.writableEnded)return;res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));}
export function writeAnthropicMessage(res,message,streaming){
  if(!streaming){sendJson(res,200,message);return;}
  res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store'});
  const emit=(type,data={})=>{if(!res.destroyed)res.write(`event: ${type}\ndata: ${JSON.stringify({type,...data})}\n\n`);};
  emit('message_start',{message:{...message,content:[]}});
  message.content.forEach((block,index)=>{
    if(['text','thinking','tool_use','server_tool_use'].includes(block.type)){
      const initial=block.type==='text'?{type:'text',text:'',...Array.isArray(block.citations)?{citations:block.citations}:{}}:block.type==='thinking'?{type:'thinking',thinking:''}:block.type==='tool_use'||block.type==='server_tool_use'?{...block,input:{}}:block;
      emit('content_block_start',{index,content_block:initial});
      if(block.type==='text'&&block.text)emit('content_block_delta',{index,delta:{type:'text_delta',text:block.text}});
      else if(block.type==='thinking'){
        if(block.thinking)emit('content_block_delta',{index,delta:{type:'thinking_delta',thinking:block.thinking}});
        emit('content_block_delta',{index,delta:{type:'signature_delta',signature:block.signature??'bridgepp-thinking-signature'}});
      }else if(['tool_use','server_tool_use'].includes(block.type))emit('content_block_delta',{index,delta:{type:'input_json_delta',partial_json:JSON.stringify(block.input??{})}});
    }else emit('content_block_start',{index,content_block:block});
    emit('content_block_stop',{index});
  });
  emit('message_delta',{delta:{stop_reason:message.stop_reason,stop_sequence:message.stop_sequence??null},usage:message.usage??{output_tokens:0}});emit('message_stop');res.end();
}
export async function anthropicMessagesRoute(body,res,upstream,signal,options={}){
  const secrets=options.secrets??[],fail=async(status,error)=>{options.onFailure?.(error,status);if(res.headersSent){if(!res.destroyed&&!res.writableEnded){res.write(`event: error\ndata: ${JSON.stringify(anthropicError(status,error,secrets))}\n\n`);res.end();}}else sendJson(res,status,anthropicError(status,error,secrets));};
  let chat;try{chat=anthropicToChat(body,options);}catch(error){await fail(400,error);return;}
  let response;try{response=await upstream(chat,signal);}catch(error){await fail(error.status??502,error);return;}
  if(!response.ok){const text=await response.text();let error={message:text};try{error=JSON.parse(text).error??error;}catch{}await fail(response.status,error);return;}
  const streaming=body.stream===true;if(streaming)res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store'});
  const projection=new AnthropicProjection(body.model,event=>{if(streaming&&!res.destroyed)res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);});
  try{
    if(streaming){let done=false;for await(const data of sse(response.body)){if(data==='[DONE]'){done=true;break;}projection.accept(JSON.parse(data));}if(!done)throw new Error('上游流式响应缺少 [DONE]');projection.finish();res.end();}
    else{const result=await response.json(),message=anthropicFromChat(body,result);sendJson(res,200,message);}
  }catch(error){await fail(error.details?.upstream_status??error.status??502,error.details??error);}
}
