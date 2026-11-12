import {once} from 'node:events';
import {cacheUsage} from './usage-view.mjs';
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
/** One auxiliary-request rule for every route (OpenAI chat, Anthropic messages, Codex
 * Responses), so a side request (title, review, compaction) is marked the same way:
 * an explicit `x-bridge-auxiliary` from a client that knows its own intent wins; without
 * that header a request is auxiliary when it declares no tools at all, or forbids tool
 * calls with `tool_choice:'none'`. `tools_count` is the tool count the *gateway client*
 * declared, kept across the Responses→chat hop by `x-bridge-tool-count` so a converted
 * request cannot silently drop the tools the client actually sent. */
export function requestKind(body,headers={}){
  const fromHeader=Number(headers['x-bridge-tool-count']);
  const declared=Array.isArray(body?.tools)?body.tools.length:0;
  const toolsCount=Number.isSafeInteger(fromHeader)&&fromHeader>=0?fromHeader:declared;
  const choice=body?.tool_choice;
  const forbidden=choice==='none'||(choice!==null&&typeof choice==='object'&&choice.type==='none');
  const stated=headers['x-bridge-auxiliary'];
  return {auxiliary:stated===undefined?declared===0||forbidden:stated==='1',toolsCount};
}
/** Observe provider usage once; publish it before terminal frames can end a native turn. */
export async function relayCompletion(upstream,res,{signal,includeUsage,auxiliary=null,toolsCount=null,model,contextWindow,onUsage=async()=>{},onNotice=async()=>{},onFailure=async()=>{},onSuccess=async()=>{},sanitizeError=value=>value,started=performance.now()}){
  let usage=null,extra=null,firstToken=null,published=false,failurePublished=false,limited=false,limitPublished=false;const toolIndices=new Set();
  const failure=async frame=>{if(frame?.error){frame.error=sanitizeError(frame.error);if(!failurePublished){failurePublished=true;await onFailure(frame.error);}}};
  const observe=frame=>{
    if(frame.usage)usage=frame.usage;if(frame.bridge_usage)extra=frame.bridge_usage;
    for(const c of frame.choices??[]){if(c.finish_reason==='length')limited=true;const d=c.delta??{};if(firstToken===null&&(d.content||d.reasoning_content||d.tool_calls?.length))firstToken=performance.now()-started;}
  };
  const publish=async()=>{
    if(limited&&!limitPublished){limitPublished=true;await onNotice({type:'native-event',source:'gateway',name:'gateway/output-limit',data:{reason:'max_output_tokens'}});}
    if(published||!usage&&!extra?.accounting)return;published=true;
    await onUsage({type:'usage',scope:'request',source:'gateway',data:{model,prompt_tokens:number(usage?.prompt_tokens),completion_tokens:number(usage?.completion_tokens),reasoning_tokens:number(usage?.completion_tokens_details?.reasoning_tokens),...cacheUsage(usage??{},extra),context_window:contextWindow??null,first_token_ms:firstToken,duration_ms:performance.now()-started,...(typeof auxiliary==='boolean'?{auxiliary}:{}),...(Number.isSafeInteger(toolsCount)?{tools_count:toolsCount}:{}),...(extra?.accounting?{usage_accounting:extra.accounting}:{}),...(Number.isInteger(extra?.correction_calls)?{correction_calls:extra.correction_calls}:{})}});
  };
  const write=async text=>{signal.throwIfAborted();if(!res.write(text))await once(res,'drain',{signal});};
  if(!String(upstream.headers.get('content-type')).includes('text/event-stream')){
    const text=await upstream.text();let frame;try{frame=JSON.parse(text);}catch{}if(frame){observe(frame);delete frame.bridge_usage;await failure(frame);}if(!upstream.ok&&!failurePublished)await failure({error:{message:text.slice(0,1200)}});await publish();if(upstream.ok&&!failurePublished)await onSuccess();res.end(frame?JSON.stringify(frame):text);return;
  }
  let buffer='',pending=[],done=false;const decoder=new TextDecoder();
  const block=async raw=>{
    const data=raw.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
    if(!data){await write(raw+'\n\n');return;}
    if(data==='[DONE]'){done=true;await publish();if(!failurePublished)await onSuccess();for(const text of pending)await write(text);pending=[];await write('data: [DONE]\n\n');return;}
    const frame=JSON.parse(data);observe(frame);if(frame.error){await publish();await failure(frame);}
    for(const c of frame.choices??[])if(c.delta?.bridge_status){await onNotice({type:'notice',source:'gateway',text:String(c.delta.bridge_status)});delete c.delta.bridge_status;}
    for(const c of frame.choices??[]){const d=c.delta??{};if(d.bridge_event?.name==='llm/retry-started'){await onNotice({type:'native-event',source:'gateway',name:d.bridge_event.name,data:d.bridge_event.data});delete d.bridge_event;}for(const call of d.tool_calls??[]){const key=call.index??call.id;if(call.function?.name&&!toolIndices.has(key)){toolIndices.add(key);await onNotice({type:'native-event',source:'gateway',name:'gateway/tool-call',data:{name:call.function.name}});}}}
    delete frame.bridge_usage;
    if(!includeUsage)delete frame.usage;
    if(!includeUsage&&!frame.error&&Array.isArray(frame.choices)&&!frame.choices.length)return;
    const text='data: '+JSON.stringify(frame)+'\n\n';
    if(pending.length||(frame.choices??[]).some(c=>c.finish_reason))pending.push(text);else await write(text);
  };
  for await(const bytes of upstream.body){buffer+=decoder.decode(bytes,{stream:true});if(buffer.length>8*1024*1024)throw new Error('Oversize provider SSE frame');let match;while((match=/\r?\n\r?\n/.exec(buffer))){const raw=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);await block(raw);}}
  buffer+=decoder.decode();if(buffer.trim())await block(buffer);
  if(!done){await publish();if(!failurePublished)throw new Error('Provider stream ended without [DONE]; terminal frames were not delivered');}
  res.end();
}
