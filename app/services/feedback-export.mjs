import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,rename,rm,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import os from 'node:os';
import {redactSecrets} from './redact-secrets.mjs';
import {coalesceSessionEvents} from './session-events.mjs';
import {writeZip} from './zip-writer.mjs';

export const MAX_ZIP_BYTES=20*1024*1024;
const MAX_REPORT_ROWS=20000;
const SAFE_TOOL=2000;
const CONTENT_FIELDS=new Set(['prompt','prompts','messages','message','content','text','arguments','argument','input','output','response','body','headers','authorization','cookie','set-cookie','password','secret','api_key','apiKey','key','token','credential','credentials','private_key','access_token','refresh_token','tool_input','tool_output','tool_arguments','request_body','response_body','request','payload','args','url','tools','skills','plugins','tool_definitions','content_types','client_session_key_hash','client_session_key','tool_calls','toolCalls','tool_call','toolCall','function_call','functionCall','function_call_arguments','tool_arguments','toolArguments','requestPayload','request_payload','responsePayload','response_payload','delta','chunk','choices','completion','reasoning','reasoning_content','params','parameters','tool_params','toolParams','raw','raw_request','raw_response','requestText','responseText']);
const SESSION_FIELDS=new Set(['session_id','sessionId','native_id','nativeId','native_session_id','nativeSessionId']);
const ERROR_OBJECT_FIELDS=new Set(['error','failure','upstream_failure','upstreamFailure','sdk_errors','lastError','validationError','upstreamError','details']);
const NATIVE_DIAGNOSTIC_FIELDS=new Set(['native','retry','retries','retrying','attempt','attempts','correction_calls','corrections','decision_repairs','decision_recovery','tool_mode','toolMode','context_reset','rebuild_reason','rebuildReason','billing_header_filtered','protocol_residue','filtered','dropped','duplicate','suppressed','code','status','reason','error','upstream_error','resumed','session_reset','request_id']);

const sha256=value=>createHash('sha256').update(String(value??'')).digest('hex');
export const sessionIdHash=id=>sha256(id).slice(0,12);
const iso=value=>{
  if(value instanceof Date)return Number.isNaN(value.getTime())?null:value.toISOString();
  const at=typeof value==='string'||typeof value==='number'?Date.parse(value):NaN;
  return Number.isNaN(at)?null:new Date(at).toISOString();
};
const clip=(value,limit=2000)=>{const text=String(value??'');return text.length>limit?text.slice(0,limit):text;};
const textOf=value=>typeof value==='string'?value:value==null?'':typeof value==='number'||typeof value==='boolean'?String(value):value.message??value.text??value.error??value.reason??'';
const jsonText=(value,limit=SAFE_TOOL)=>{
  if(value==null)return '';
  if(typeof value==='string')return clip(value,limit);
  try{return clip(JSON.stringify(value),limit);}catch{return clip(String(value),limit);}
};
const numeric=value=>typeof value==='number'&&Number.isFinite(value)?value:typeof value==='string'&&value.trim()&&Number.isFinite(Number(value))?Number(value):null;
const countBy=rows=>rows.reduce((out,row)=>{out[row.kind]=(out[row.kind]??0)+1;return out;},{});
const normalizeKind=value=>typeof value==='string'&&value.trim()?value.trim():'unknown';

function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function pathForms(value){
  if(typeof value!=='string'||value.length<4)return [];
  return [...new Set([value,value.replaceAll('\\','/'),value.replaceAll('/','\\')])].sort((a,b)=>b.length-a.length);
}
function createRedactor({secrets=[],projectPath,dataDir,homeDir}={}){
  const known=[...new Set(secrets.filter(value=>typeof value==='string'&&value.length>=4))];
  const paths=[
    ...pathForms(projectPath).map(value=>({value,replacement:'<项目>'})),
    ...pathForms(dataDir).map(value=>({value,replacement:'<数据目录>'}))
  ];
  const exact=[...new Set([homeDir,...pathForms(homeDir)].filter(value=>typeof value==='string'&&value.length>=4))];
  return text=>{
    let value=redactSecrets(text,known);
    for(const entry of paths)value=value.replace(new RegExp(escapeRegExp(entry.value),'gi'),entry.replacement);
    for(const home of exact)value=value.replace(new RegExp(escapeRegExp(home),'gi'),'%USERPROFILE%');
    value=value.replace(/(?:[A-Za-z]:[\\/]+Users[\\/]+)[^\\/\s"'<>]+/gi,'%USERPROFILE%');
    value=value.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[email]');
    value=value.replace(/(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g,'[phone]');
    return value;
  };
}
function deepRedact(value,redact){
  if(typeof value==='string')return redact(value);
  if(Array.isArray(value))return value.map(item=>deepRedact(item,redact));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,deepRedact(item,redact)]));
  return value;
}

function dropReportField(key,errorContext){
  if(SESSION_FIELDS.has(key))return true;
  if(CONTENT_FIELDS.has(key))return !(errorContext&&key==='message');
  if(/^(?:prompt|response|message|content|text|argument|input|output|request|payload|body|header|choice|completion|reasoning|param|tool|function|raw)s?(?:[_-](?:chars|characters|sha256|hash|text|content|body|json|data|payload))+$/i.test(key))return true;
  if(/^(?:full[_-]?prompt|input[_-]?text|output[_-]?text|input[_-]?content|output[_-]?content|tool[_-]?input|tool[_-]?output|tool[_-]?params?|request[_-]?body|response[_-]?body|reasoning[_-]?content)(?:chars|characters|sha256|hash|text|content|body|json|payload)?$/i.test(key))return true;
  if(/^(?:prompt|message|content|text|argument|input|output|response|request|payload|completion|reasoning|params?|tool|function|raw)(?:Chars|Characters|Sha256|Hash|Text|Content|Body|Json|Data|Payload)$/i.test(key))return true;
  return false;
}
function sanitizeDiagnostic(value,{errorContext=false,depth=0}={}){
  if(value==null||typeof value==='number'||typeof value==='boolean')return value;
  if(typeof value==='string')return clip(value,4000);
  if(depth>7)return undefined;
  if(Array.isArray(value))return value.slice(0,200).map(item=>sanitizeDiagnostic(item,{errorContext,depth:depth+1})).filter(item=>item!==undefined);
  if(typeof value!=='object')return clip(String(value),4000);
  const out={};
  for(const [key,item]of Object.entries(value)){
    if(dropReportField(key,errorContext))continue;
    const childError=errorContext||ERROR_OBJECT_FIELDS.has(key)||/Error$/.test(key)&&/^(?:error|lastError|validationError|upstreamError|sdk_error)/i.test(key);
    const clean=sanitizeDiagnostic(item,{errorContext:childError,depth:depth+1});
    if(clean!==undefined)out[key]=clean;
  }
  return out;
}

function eventAt(event){return iso(event?.at);}
function eventTurnId(event){return typeof event?.turnId==='string'?event.turnId:null;}
function eventText(event){return textOf(event?.text??event?.message??event?.reason?.message??event?.error?.message??event?.data?.message);}
function eventErrorCode(event){
  return event?.code??event?.reason?.code??event?.data?.code??event?.data?.error?.code??event?.error?.code??null;
}
function eventMessage(event){
  return textOf(event?.message??event?.text??event?.reason?.message??event?.error?.message??event?.data?.message??event?.data?.error?.message);
}
function eventStatus(event){
  const value=event?.status??event?.upstream_status??event?.reason?.status??event?.error?.upstream_status;
  return Number.isInteger(value)&&value>=100&&value<=599?value:null;
}
function eventReset(event){return event?.resetAt??event?.reset_at??event?.reason?.resetAt??event?.reason?.reset_at??null;}

function makeTurns(events){
  const order=[],map=new Map(),users=[];
  for(const event of events){
    const turnId=eventTurnId(event);
    if(event?.type==='user'){
      if(turnId&&map.has(turnId))users.push({turnId,at:eventAt(event),number:map.get(turnId)});
      else{
        const number=order.length+1;
        if(turnId){map.set(turnId,number);order.push(turnId);}
        users.push({turnId,at:eventAt(event),number,...turnId?{}:{fallback:number}});
      }
    }else if(turnId&&!map.has(turnId)){map.set(turnId,order.length+1);order.push(turnId);}
  }
  const atToTurn=at=>{
    const time=Date.parse(at??'');
    if(Number.isNaN(time))return null;let found=null;
    for(const user of users){const start=Date.parse(user.at??'');if(Number.isNaN(start)||start>time)break;found=user.number??null;}
    return found;
  };
  const turnFor=(event,fallback=null)=>eventTurnId(event)?map.get(eventTurnId(event))??atToTurn(eventAt(event))??fallback:atToTurn(eventAt(event))??fallback;
  const ended=users.length?0:events.filter(event=>event?.type==='turn-end').length;
  return {turns:Math.max(order.length,new Set(users.map(user=>user.number)).size,ended),map,atToTurn,turnFor,users};
}

function classifyError({type,source='',code='',message='',status=null,reasonKind=null}={}){
  const text=`${code} ${message}`;
  if(reasonKind==='cancelled'||/\b(?:cancelled|canceled|aborted|abort|interrupted)\b|用户(?:已)?(?:取消|停止)|已停止(?:本轮|任务)|取消导致/i.test(text))return 'cancelled';
  if(status===429||/\b429\b|rate[_\s-]?limit|too many requests|quota|usage_limit|频率限制|限流|请求过于频繁|使用量已超出|额度/i.test(text))return 'rate_limit';
  if(status===408||status===504||/\btimeout\b|\btimed out\b|etimedout|超时/i.test(text))return 'timeout';
  if(type==='upstream-error'||/upstream|provider|上游/i.test(`${source} ${text}`))return 'upstream';
  if(type==='bridge'||/gateway|bridge|journal|store|存储|会话记录/i.test(`${source} ${text}`))return 'bridge';
  return 'runtime';
}

function errorRow(event,turn,kind,{cancelled=false}={}){
  const code=clip(eventErrorCode(event)??(kind==='cancelled'?'cancelled':event?.type==='upstream-error'?'upstream_error':event?.type==='turn-end'?`turn_${event.status??'failed'}`:'runtime_error'),100);
  const message=clip(eventMessage(event)||(cancelled?'用户已停止本轮任务。':'运行时没有提供具体原因。'),2000);
  const row={turn,at:eventAt(event)??new Date(0).toISOString(),kind,code,message};
  const status=eventStatus(event);if(status!==null)row.upstreamStatus=status;
  const requestId=event?.requestId??event?.request_id??event?.reason?.requestId??event?.data?.request_id;
  if(typeof requestId==='string'&&requestId)row.requestId=clip(requestId,200);
  const reset=eventReset(event);if(kind==='rate_limit'&&typeof reset==='string'&&reset)row.resetAt=clip(reset,200);
  return row;
}

function reportError(row){
  const candidates=[row?.error,row?.failure,row?.upstream_failure,row?.upstreamError,row?.lastError,...(Array.isArray(row?.sdk_errors)?row.sdk_errors:[])];
  for(const value of candidates){
    if(typeof value==='string'&&value)return {message:value};
    if(value&&typeof value==='object'){
      const message=textOf(value.message??value.error??value.text??value.reason);
      if(message||value.code)return {message,code:value.code??row?.errorCode,status:value.status??value.upstream_status??row?.status,resetAt:value.reset_at??value.resetAt};
    }
  }
  const outcome=String(row?.result??row?.outcome??'').toLowerCase();
  if(['failed','error','cancelled','canceled'].includes(outcome))return {message:row?.terminal_reason??row?.errorCode??'桥请求失败',code:row?.errorCode??(`report_${outcome}`)};
  return null;
}
function collectErrors(events,reports,turnCtx){
  const errors=[],cancellations=[],seen=new Set(),requestTurns=new Map();
  const push=(row,list)=>{
    const key=`${row.turn}|${row.kind}|${row.code}|${row.message}`;
    if(seen.has(key))return;seen.add(key);list.push(row);
  };
  for(const event of events){
    const requestId=event?.requestId??event?.request_id??event?.data?.request_id;
    if(typeof requestId==='string')requestTurns.set(requestId,turnCtx.turnFor(event));
    const turn=turnCtx.turnFor(event);
    if(event?.type==='upstream-error'){
      const kind=classifyError({type:'upstream-error',source:event.source??'gateway',code:event.code,message:event.message??event.text,status:event.status});
      push(errorRow(event,turn,kind),kind==='cancelled'?cancellations:errors);
    }else if(event?.type==='error'){
      const kind=classifyError({type:'error',source:event.source,code:eventErrorCode(event),message:eventMessage(event),status:eventStatus(event),reasonKind:event.reason?.kind});
      push(errorRow(event,turn,kind),kind==='cancelled'?cancellations:errors);
    }else if(event?.type==='turn-end'&&event.status!=='completed'){
      const kind=classifyError({type:'turn-end',source:event.reason?.source,code:event.reason?.code,message:event.reason?.message,reasonKind:event.reason?.kind});
      if(kind==='cancelled')push(errorRow({...event,message:event.reason?.message,code:event.reason?.code??'cancelled'},turn,'cancelled',{cancelled:true}),cancellations);
      else push(errorRow({...event,message:event.reason?.message??event.text,code:event.reason?.code??`turn_${event.status??'failed'}`},turn,kind),errors);
    }else if(event?.type==='result'&&event.status==='failed'){
      const kind=classifyError({type:'result',source:'native',code:event.data?.code,message:event.text??event.data?.error});
      push(errorRow({...event,code:event.data?.code??'native_result_failed'},turn,kind),kind==='cancelled'?cancellations:errors);
    }
  }
  for(const row of reports){
    const found=reportError(row);if(!found)continue;
    const requestId=row?.requestId??row?.request_id??row?.bridge_request_id,turn=requestTurns.get(requestId)??(row?.at?turnCtx.atToTurn(row.at):null),
      at=iso(row?.at)??new Date(0).toISOString(),code=found.code??row?.errorCode??'bridge_report_error',message=found.message??'桥请求报告了失败',
      status=found.status??row?.status??null,kind=classifyError({type:'bridge',source:row?.source,code,message,status});
    push(errorRow({type:'bridge',at,code,message,status,requestId,resetAt:found.resetAt??row?.reset_at},turn,kind),kind==='cancelled'?cancellations:errors);
  }
  return {errors,cancellations};
}

function approvalName(event){return event?.name??event?.data?.toolName??event?.data?.tool_name??event?.data?.tool??event?.data?.title??null;}
function noticeCorrection(event){
  const source=String(event?.source??''),text=String(event?.text??event?.message??'');
  if(source==='task-completion'||/继续原任务|续作|阶段性进展/.test(text))return ['late_followup',clip(text,500)||'原生轮次结束后自动跟进未完成任务'];
  if(source==='native-context'||/压缩(?:了)?(?:对话)?上下文|上下文压缩|context[_\s-]?compact|context[_\s-]?reset/i.test(text))return ['context_compaction',clip(text,500)||'上下文已压缩'];
  if(/无效工具|非法工具|工具调用.{0,20}(?:恢复|修复)|invalid tool|tool.{0,20}(?:recover|repair)|decision[_\s-]?repair/i.test(text))return ['tool_recovery',clip(text,500)];
  if(/重建|rebuild/i.test(text))return ['runtime_rebuild',clip(text,500)];
  if(/重试|retry/i.test(text))return ['retry',clip(text,500)];
  if(/JSON\s*路径|回退.{0,20}JSON|json[_\s-]?fallback|fallback.{0,20}json/i.test(text))return ['json_fallback',clip(text,500)];
  if(/协议.{0,10}(?:残留|过滤|剥离)|残留.{0,10}(?:协议|标记)|billing.{0,20}header|strip.{0,20}billing/i.test(text))return ['protocol_filter',clip(text,500)];
  if(/重新确认当前模型|新参数已排队|排队的新参数|已应用排队的新参数|已取消排队的参数/.test(text))return ['rebind',clip(text,500)];
  return null;
}
function rebuildReason(event){
  const values=[event?.data?.native?.rebuild_reason,event?.data?.native?.rebuildReason,event?.data?.rebuild_reason,event?.data?.rebuildReason,event?.native?.rebuild_reason,event?.rebuild_reason];
  const value=values.find(item=>typeof item==='string'&&item.trim());
  return value?clip(value,500):null;
}

function collectCorrections(events,reports,{turnCtx,includeConversation=false}={}){
  const rows=[],seen=new Set(),approvals=new Map(),requestTurns=new Map(),steerSeen=new Set();
  const push=(kind,at,turn,detail)=>{
    const time=iso(at)??null,key=`${kind}|${turn??''}|${time??''}|${String(detail??'')}`;
    if(seen.has(key))return;seen.add(key);rows.push({turn,at:time??new Date(0).toISOString(),kind,detail:clip(detail??'',1000)});
  };
  let errorSinceUser=false;
  for(let index=0;index<events.length;index++){
    const event=events[index],turn=turnCtx.turnFor(event),time=eventAt(event);
    if(event?.type==='approval'&&event.approvalId)approvals.set(event.approvalId,approvalName(event)??'工具');
    if(event?.type==='user'){
      if(errorSinceUser)push('follow_up_message',time,turn,includeConversation?`报错后的下一条用户消息：${eventText(event)}`:'报错后的下一条用户消息');
      errorSinceUser=false;
      if(event.delivery==='steer'&&event.steerId){steerSeen.add(event.steerId);push('steer',time,turn,'运行中插话已送达');}
    }
    if(event?.type==='error'||event?.type==='upstream-error')errorSinceUser=true;
    if(event?.type==='turn-end'&&event.status!=='completed'&&event.reason?.kind!=='cancelled')errorSinceUser=true;
    if(event?.type==='steer-state'&&['delivered','carried'].includes(event.state)&&!steerSeen.has(event.steerId)){steerSeen.add(event.steerId);push('steer',time,turn,event.state==='carried'?'运行中插话由原生队列带入下一轮':'运行中插话已送达');}
    if(event?.type==='approval-resolved'&&/^reject/.test(String(event.choice??'')))push('approval_denied',time,turn,`拒绝了工具授权：${approvals.get(event.approvalId)??'未知工具'}`);
    if(event?.type==='turn-end'&&event.reason?.kind==='cancelled')push('stop',time,turn,'用户中途停止了本轮任务');
    if(event?.type==='turn-end'&&numeric(event.stats?.continuations)>0)push('late_followup',time,turn,`自动跟进未完成任务 ${numeric(event.stats.continuations)} 次`);
    if(event?.type==='notice'){
      const found=noticeCorrection(event);if(found)push(found[0],time,turn,found[1]);
    }
    if(event?.type==='native-event'){
      const name=String(event.name??'').toLowerCase(),data=event.data??{},rebuild=rebuildReason(event);
      if(name.includes('llm/retry-started'))push('retry',time,turn,'模型请求已自动重试');
      else if(rebuild||name.includes('rebuild')||/重建/i.test(name))push('runtime_rebuild',time,turn,rebuild??'原生运行环境已重建');
      else if(/retry|重试/.test(name))push('retry',time,turn,'模型请求已自动重试');
      else if(/compact|context[_-]?reset|压缩/.test(name))push('context_compaction',time,turn,'上下文已压缩');
      else if(/invalid[_-]?tool|repair|recover|decision[_-]?repair/.test(name)||data.decision_repairs?.length||data.correction_calls>0)push('tool_recovery',time,turn,'无效模型决策或工具调用已恢复');
      else if(/json[_-]?fallback|fallback[_-]?json/.test(name)||data.tool_mode==='json')push('json_fallback',time,turn,'回退到 JSON 工具调用路径');
      else if(/filter|strip|residue|replay|billing/.test(name)||data.billing_header_filtered)push('protocol_filter',time,turn,'过滤了协议残留或计费头');
      if(data?.correction_calls>0)push('tool_recovery',time,turn,`模型决策自动纠正 ${data.correction_calls} 次`);
    }
    if(event?.type==='usage'&&numeric(event.data?.correction_calls)>0)push('tool_recovery',time,turn,`模型决策自动纠正 ${numeric(event.data.correction_calls)} 次`);
    const requestId=event?.requestId??event?.request_id??event?.data?.request_id;if(typeof requestId==='string')requestTurns.set(requestId,turn);
  }
  for(const row of reports){
    const requestId=row?.requestId??row?.request_id??row?.bridge_request_id,
      turn=row?.at?turnCtx.atToTurn(row.at):(typeof requestId==='string'?requestTurns.get(requestId)??null:null),at=iso(row?.at);
    if(numeric(row?.api_retries)>0)push('retry',at,turn,`桥自动重试 ${numeric(row.api_retries)} 次`);
    if(Array.isArray(row?.api_retry_details)&&row.api_retry_details.length)push('retry',at,turn,`桥自动重试 ${row.api_retry_details.length} 次`);
    if(Array.isArray(row?.decision_repairs)&&row.decision_repairs.length)push('tool_recovery',at,turn,`无效工具调用恢复 ${row.decision_repairs.length} 次`);
    if(numeric(row?.decision_recovery?.correctionCalls)>0)push('tool_recovery',at,turn,`模型决策自动纠正 ${numeric(row.decision_recovery.correctionCalls)} 次`);
    if(rebuildReason(row))push('runtime_rebuild',at,turn,rebuildReason(row));
    if(row?.context_reset)push('context_compaction',at,turn,'原生上下文已重置');
    if(numeric(row?.continuations)>0)push('late_followup',at,turn,`自动跟进未完成任务 ${numeric(row.continuations)} 次`);
    const mode=row?.tool_mode??row?.toolMode??row?.context?.toolMode??row?.history_mode??row?.historyMode??row?.model_decision_format;
    if(String(mode??'').toLowerCase()==='json')push('json_fallback',at,turn,'使用 JSON 工具调用路径');
    if(row?.local_response_replay||row?.prompt_optimization?.billing_header_filtered||numeric(row?.billing_header_filtered)>0||Array.isArray(row?.stream_token_counts)&&row.stream_token_counts.some(count=>numeric(count?.foreignDeltas)>0))push('protocol_filter',at,turn,'过滤了协议残留或计费头');
  }
  return rows;
}

function usageValues(data){
  const source=data?.usage??data?.tokenUsage??data?.token_usage??data??{};
  const prompt=numeric(source.prompt_tokens??source.input_tokens??source.inputTokens??source.promptTokens??source.prompt);
  const completion=numeric(source.completion_tokens??source.output_tokens??source.outputTokens??source.completionTokens??source.output);
  const reasoning=numeric(source.reasoning_tokens??source.completion_tokens_details?.reasoning_tokens??source.reasoningTokens);
  const cached=numeric(source.cached_tokens??source.prompt_tokens_details?.cached_tokens??source.cache_read_input_tokens??source.cacheReadInputTokens);
  const total=numeric(source.total_tokens??source.totalTokens)??(prompt!==null&&completion!==null?prompt+completion:null);
  if([prompt,completion,reasoning,cached,total].every(value=>value===null))return null;
  return {prompt_tokens:prompt??0,completion_tokens:completion??0,total_tokens:total??0,reasoning_tokens:reasoning??0,cached_tokens:cached??0};
}
function collectUsage(events,reports){
  let requests=0,rows=0;
  const total={prompt_tokens:0,completion_tokens:0,total_tokens:0,reasoning_tokens:0,cached_tokens:0};
  for(const event of events)if(event?.type==='usage'){
    const usage=usageValues(event.data??event);if(!usage)continue;
    requests++;for(const key of Object.keys(total))total[key]+=usage[key];
  }
  if(!requests)for(const row of reports){
    const usage=usageValues(row);if(!usage)continue;
    rows++;for(const key of Object.keys(total))total[key]+=usage[key];
  }
  return {requests:requests||rows,usage:total};
}

function toolPayload(event,kind){
  const data=event?.data??{};
  if(kind==='arguments')return data.arguments??data.args??data.input??data.tool_input??data.parameters??data.params??data.function?.arguments??data.command??data.item?.command??event.arguments??event.input??null;
  if(kind==='output')return event?.text??data.output??data.result??data.content??data.aggregated_output??data.tool_result??data?.tool_result?.content??null;
  return null;
}
function payloadText(value,limit=SAFE_TOOL){
  if(value==null)return '';
  if(typeof value==='string')return clip(value,limit);
  if(Array.isArray(value))return clip(value.map(item=>typeof item==='string'?item:item?.text??item?.content??jsonText(item,limit)).join('\n'),limit);
  if(typeof value==='object'&&typeof value.text==='string')return clip(value.text,limit);
  return jsonText(value,limit);
}

function filteredEvent(event,ctx){
  const type=event?.type;
  if(!type||type==='text'||type==='thinking'||type==='native-session'||type==='assistant-message'||type==='result')return null;
  const turn=ctx.turnFor(event),at=eventAt(event),base={type,at,turn};
  if(type==='user'){
    const text=eventText(event);
    return {type:'user',at,turn,chars:text.length};
  }
  if(type==='tool-start'){
    const toolId=event.toolId??event.data?.id??event.data?.toolId??null,name=event.name??event.data?.name??event.data?.toolName??event.data?.title??null,args=toolPayload(event,'arguments');
    return {type:'tool-start',at,turn,toolId,name,...(ctx.includeTools&&args!=null?{arguments:payloadText(args)}:{})};
  }
  if(type==='tool-output'){
    const toolId=event.toolId??event.data?.id??event.data?.toolId??null,text=payloadText(toolPayload(event,'output'));
    return {type:'tool-output',at,turn,toolId,chars:text.length,...(ctx.includeTools?{output:clip(text,SAFE_TOOL)}:{})};
  }
  if(type==='tool-end'){
    const toolId=event.toolId??event.data?.id??event.data?.toolId??null,start=ctx.toolStarts.get(toolId),end=Date.parse(at??''),started=Date.parse(start?.at??''),durationMs=Number.isNaN(end)||Number.isNaN(started)?null:Math.max(0,end-started),
      isError=event.data?.is_error===true||event.isError===true||String(event.data?.status??event.status??'').toLowerCase()==='error',output=payloadText(toolPayload(event,'output'));
    return {type:'tool-end',at,turn,toolId,name:event.name??start?.name??event.data?.name??null,durationMs,isError,...(ctx.includeTools?{output:clip(output,SAFE_TOOL)}:{})};
  }
  if(type==='approval')return {type:'approval',at,turn,name:approvalName(event)??null};
  if(type==='approval-resolved')return {type:'approval-resolved',at,turn,name:ctx.approvals.get(event.approvalId)??null,choice:event.choice??null};
  if(type==='question')return {type:'question',at,turn,count:Array.isArray(event.data?.questions)?event.data.questions.length:null};
  if(type==='error'||type==='upstream-error'){
    const row={type,at,turn,source:event.source??null,code:eventErrorCode(event),message:clip(eventMessage(event),2000)};
    const status=eventStatus(event);if(status!==null)row.upstreamStatus=status;
    const reset=eventReset(event);if(reset)row.resetAt=reset;
    if(event.requestId)row.requestId=event.requestId;
    if(typeof event.retrying==='boolean')row.retrying=event.retrying;
    return row;
  }
  if(type==='notice'){
    const found=noticeCorrection(event),source=String(event.source??''),message=String(event.text??event.message??'');
    if(!found&&!event.code&&!['gateway','native-context','output-limit','task-completion','queue','journal','native-upstream','native-permission'].includes(source)&&!/错误|失败|异常|超时|重试|error|failed|timeout|retry/i.test(message))return null;
    return {type:'notice',at,turn,source:source||null,code:event.code??null,text:clip(message,2000)};
  }
  if(type==='native-event'){
    const diagnostic=event.data&&typeof event.data==='object'?Object.fromEntries(Object.entries(event.data).filter(([key])=>NATIVE_DIAGNOSTIC_FIELDS.has(key))):{},clean=sanitizeDiagnostic(diagnostic);
    return {type:'native-event',at,turn,source:event.source??null,name:event.name??null,...(clean&&typeof clean==='object'&&Object.keys(clean).length?{data:clean}:{})};
  }
  if(type==='usage'){
    const clean=sanitizeDiagnostic(event.data??{});
    return {type:'usage',at,turn,scope:event.scope??null,source:event.source??null,data:clean};
  }
  if(type==='turn-end')return {type:'turn-end',at,turn,status:event.status??null,reason:event.reason?sanitizeDiagnostic(event.reason,{errorContext:true}):null,stats:sanitizeDiagnostic(event.stats??{})};
  if(type==='steer-state')return {type:'steer-state',at,turn,state:event.state??null,reason:clip(event.reason??'',500)};
  if(type==='steer-consumed')return {type:'steer-consumed',at,turn};
  if(type==='subagent')return {type:'subagent',at,turn,status:event.data?.status??null,name:event.data?.name??null};
  if(type==='media'||type==='media-output')return {type,at,turn,mime:event.mime??null,origin:event.origin?{runtimeId:event.origin.runtimeId??null,tool:event.origin.tool??null}:null};
  if(type==='plan'){
    const entries=event.data?.entries??event.data?.plan??event.data?.todos;const list=Array.isArray(entries)?entries:[];
    return {type:'plan',at,turn,completed:list.filter(entry=>['completed','done'].includes(String(entry?.status??'').toLowerCase())).length,pending:list.filter(entry=>!['completed','done','cancelled','canceled','blocked'].includes(String(entry?.status??'').toLowerCase())).length};
  }
  if(type==='diff'||type==='content-replace')return {type,at,turn,channel:event.channel??null,chars:String(event.text??'').length};
  if(type==='attachments-discarded')return {type,at,turn,count:Array.isArray(event.attachmentIds)?event.attachmentIds.length:null};
  return base;
}

function filterEvents(events,{includeConversation,includeTools,turnCtx}){
  const approvals=new Map(),toolStarts=new Map(),output=[];
  for(const event of events){
    if(event?.type==='approval'&&event.approvalId)approvals.set(event.approvalId,approvalName(event)??'工具');
    if(event?.type==='tool-start'){const toolId=event.toolId??event.data?.id??event.data?.toolId;if(toolId)toolStarts.set(toolId,{at:eventAt(event),name:event.name??event.data?.name??event.data?.toolName});}
    const row=filteredEvent(event,{includeConversation,includeTools,turnFor:turnCtx.turnFor,toolStarts,approvals});
    if(row)output.push(row);
  }
  return output;
}

function conversationMarkdown(events){
  const coalesced=coalesceSessionEvents(events),blocks=[];
  for(const event of coalesced){
    if(event?.type==='user')blocks.push({role:'用户',text:eventText(event)||'（仅附件）'});
    else if(event?.type==='text'){
      const text=String(event.text??'');if(!text)continue;
      const last=blocks.at(-1);
      if(last?.role==='助手')last.text+=text;else blocks.push({role:'助手',text});
    }else if(event?.type==='content-replace'&&event.channel==='text'){
      const text=String(event.text??''),last=blocks.at(-1);
      if(last?.role==='助手')last.text=text;else blocks.push({role:'助手',text});
    }else if(event?.type==='assistant-message'&&Array.isArray(event.content)){
      const text=event.content.filter(part=>part?.type==='text').map(part=>part.text??'').join('');
      if(text){const last=blocks.at(-1);if(last?.role==='助手')last.text=text;else blocks.push({role:'助手',text});}
    }
  }
  return ['# 会话对话','',...blocks.flatMap(block=>[`## ${block.role}`,'',block.text,''])].join('\n');
}

function instructions({generatedAt,options,truncated,reportsCount}){
  return [
    'Bridge++ 反馈包','',
    `生成时间：${generatedAt}`,'',
    '包含的文件：',
    '- feedback.json：应用版本、会话配置、错误与纠正分类、汇总统计。',
    '- events.jsonl：按时间排序的过滤后会话事件，默认只保留结构和数字。',
    `- bridge-reports.jsonl：与会话时间窗口和模型来源相符的桥请求报告 ${reportsCount} 行；已去掉提示词、消息、内容和参数类字段。`,
    ...options.includeConversation?['- conversation.md：用户消息和助手正文，不含思考过程。']:[],
    '',options.includeConversation?'已包含对话内容。':'未包含对话内容（用户消息正文和助手正文均未放入）。',options.includeTools?'已包含工具参数和输出（每项最多 2000 字）。':'未包含工具参数和输出。',
    '','脱敏：已知密钥、Bearer/Authorization、sk- 密钥、用户主目录、当前项目路径、Bridge++ 数据目录、邮箱和中国大陆手机号均已替换或移除。',
    truncated?'注意：包内记录超过 20 MB，已从最早的事件开始截断；feedback.json 中 truncated 为 true。':'',
    '','请把整个 zip 文件发给开发者。文件只保存在本机，不会自动上传。',''
  ].filter(Boolean).join('\n');
}

function reportRequestIds(events){
  const ids=new Set();
  const inspect=value=>{
    if(!value||typeof value!=='object')return;
    for(const [key,item]of Object.entries(value)){
      if(/^(?:requestId|request_id|bridge_request_id)$/.test(key)&&typeof item==='string')ids.add(item);
      else if(typeof item==='object'&&item!==null)inspect(item);
    }
  };
  for(const event of events)inspect(event);
  return ids;
}
function reportRowIds(row){
  return [row?.requestId,row?.request_id,row?.bridge_request_id].filter(value=>typeof value==='string'&&value);
}
async function readReports({workspaceRoot,source,runtimeId,events,from,to}){
  if(!source||!runtimeId)return [];
  const dir=join(workspaceRoot,'providers',source,runtimeId,'reports');
  let names;try{names=(await readdir(dir,{withFileTypes:true})).filter(entry=>entry.isFile()&&entry.name.endsWith('.ndjson')).map(entry=>entry.name);}catch{return [];}
  const requestIds=reportRequestIds(events),rows=[];
  for(const name of names){
    let text;try{text=await readFile(join(dir,name),'utf8');}catch{continue;}
    for(const line of text.split('\n')){
      if(!line.trim()||rows.length>=MAX_REPORT_ROWS)continue;
      let raw;try{raw=JSON.parse(line);}catch{continue;}
      if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
      const at=iso(raw.at??raw.timestamp??raw.startedAt??raw.time);
      const matched=reportRowIds(raw).some(id=>requestIds.has(id));
      if(at!==null&&(Date.parse(at)<from||Date.parse(at)>to))continue;
      if(at===null&&!matched)continue;
      const clean=sanitizeDiagnostic(raw);
      if(!clean||typeof clean!=='object')continue;
      clean.report=name;
      if(!clean.source)clean.source=source;
      if(!clean.runtimeId)clean.runtimeId=runtimeId;
      if(at)clean.at=at;
      rows.push(clean);
    }
  }
  return rows.sort((a,b)=>Date.parse(a.at??'')-Date.parse(b.at??'')||String(a.report).localeCompare(String(b.report)));
}

function reportCutoffAt(after,reports){
  const at=iso(after?.at);
  return at?reports.filter(row=>{const time=iso(row.at);return time===null||Date.parse(time)>=Date.parse(at);}):reports;
}

function assembleFeedback({session,events,reports,options:{includeConversation,includeTools},note,generatedAt,app,environment,runtimeVersion,modelSource,modelName,projectPath,dataDir,homeDir,secrets,truncated}){
  const turnCtx=makeTurns(events),{errors,cancellations}=collectErrors(events,reports,turnCtx),corrections=collectCorrections(events,reports,{turnCtx,includeConversation}),usage=collectUsage(events,reports),
    hash=sessionIdHash(session.id),turns=turnCtx.turns;
  const modelKey=session.selection?.modelKey??null;
  const effectiveSource=modelSource??(modelKey&&modelKey!=='native'?String(modelKey).split(':')[0]:null);
  const toolMode=effectiveSource==='qoder'?(process.env.QODER_TOOL_MODE||'native'):effectiveSource==='workbuddy'?(process.env.WORKBUDDY_TOOL_MODE||'native'):'native';
  const feedback={
    generatedAt:iso(generatedAt)??new Date().toISOString(),
    app,
    session:{
      idHash:hash,
      runtimeId:session.runtimeId??null,
      runtimeVersion:runtimeVersion??null,
      modelSource:effectiveSource,
      modelKey,
      modelName:modelName??modelKey,
      reasoning:session.selection?.reasoning??null,
      contextWindow:session.selection?.contextTokens??null,
      contextBudget:session.selection?.contextBudget??null,
      permissionMode:session.permissionMode??null,
      toolMode,
      createdAt:session.createdAt??null,
      status:session.status??null,
      turns,
      ...(includeConversation?{title:session.title??null}:{})
    },
    environment,
    note,
    options:{includeConversation,includeTools},
    summary:{turns,errors:{total:errors.length,byKind:countBy(errors)},corrections:{total:corrections.length,byKind:countBy(corrections)},cancelled:cancellations.length,requests:usage.requests,usage:usage.usage},
    errors,
    corrections,
    ...(cancellations.length?{cancellations}:{}),
    truncated:!!truncated
  };
  const redact=createRedactor({secrets:[...secrets,session.id],projectPath,dataDir,homeDir});
  const eventRows=filterEvents(events,{includeConversation,includeTools,turnCtx});
  const eventText=eventRows.length?`${eventRows.map(row=>JSON.stringify(deepRedact(row,redact))).join('\n')}\n`:'';
  const reportText=reports.length?`${reports.map(row=>JSON.stringify(deepRedact(row,redact))).join('\n')}\n`:'';
  const conversation=includeConversation?redact(conversationMarkdown(events)):'';
  const description=redact(instructions({generatedAt:feedback.generatedAt,options:{includeConversation,includeTools},truncated,reportsCount:reports.length}));
  const files=[
    {name:'说明.txt',data:description},
    {name:'feedback.json',data:JSON.stringify(deepRedact(feedback,redact),null,2)+'\n'},
    {name:'events.jsonl',data:eventText},
    {name:'bridge-reports.jsonl',data:reportText}
  ];
  if(includeConversation)files.push({name:'conversation.md',data:conversation});
  return {feedback,files,eventRows,reportCount:reports.length,errors,cancellations,corrections,turns,idHash:hash};
}

export function buildFeedbackPackage({
  session,events=[],reports=[],includeConversation=false,includeTools=false,note='',generatedAt=new Date(),app={},environment={},
  runtimeVersion=null,modelSource=null,modelName=null,projectPath=null,dataDir=null,homeDir=null,secrets=[],maxBytes=MAX_ZIP_BYTES
}={}){
  const now=generatedAt instanceof Date?generatedAt:new Date(generatedAt);
  let currentEvents=events.map((event,index)=>({event,index})).sort((a,b)=>{
    const left=Date.parse(a.event?.at??''),right=Date.parse(b.event?.at??'');
    return Number.isNaN(left)||Number.isNaN(right)?a.index-b.index:left-right||a.index-b.index;
  }).map(row=>row.event),currentReports=reports.slice(),truncated=false,last=null;
  for(let pass=0;pass<100;pass++){
    const assembled=assembleFeedback({
      session,events:currentEvents,reports:currentReports,options:{includeConversation:!!includeConversation,includeTools:!!includeTools},note:[...String(note??'')].slice(0,4000).join(''),generatedAt:now,
      app,environment,runtimeVersion,modelSource,modelName,projectPath,dataDir,homeDir,secrets,truncated
    });
    const files=assembled.files.map(file=>({name:file.name,data:Buffer.from(file.data,'utf8')})),zip=writeZip(files,{now});
    last={assembled,zip,files};
    if(zip.length<=maxBytes||(!currentEvents.length&&!currentReports.length))break;
    truncated=true;
    if(currentEvents.length){
      const drop=Math.max(1,Math.ceil(currentEvents.length*0.1)),next=currentEvents.slice(drop);currentEvents=next;
      currentReports=reportCutoffAt(next[0],currentReports);
    }else if(currentReports.length){
      const drop=Math.max(1,Math.ceil(currentReports.length*0.1));currentReports=currentReports.slice(drop);
    }
  }
  const {assembled,zip,files}=last;
  return {
    ...assembled,
    zip,
    files:files.map(file=>({name:file.name,bytes:file.data.length})),
    bytes:zip.length,
    truncated:assembled.feedback.truncated,
    preview:{
      turns:assembled.turns,
      errors:{total:assembled.errors.length,byKind:countBy(assembled.errors)},
      corrections:{total:assembled.corrections.length,byKind:countBy(assembled.corrections)},
      files:files.map(file=>({name:file.name,bytes:file.data.length})),
      bytes:zip.length,
      truncated:assembled.feedback.truncated
    },
    filename:`Bridge++-反馈-${stamp(now)}-${assembled.idHash.slice(0,6)}.zip`
  };
}

function stamp(date){
  const pad=value=>String(value).padStart(2,'0');
  return `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

async function valueOf(candidate,fallback){
  try{return typeof candidate==='function'?await candidate():candidate??fallback;}catch{return fallback;}
}
function runtimeVersionOf(rows,id){const row=Array.isArray(rows)?rows.find(item=>item?.id===id):null;return row?.installed?.version??row?.version??null;}
function publicEnvironment({runtimes=[],sources=[],services=[]}){
  return {
    runtimes:(runtimes??[]).map(row=>({id:row?.id??null,name:row?.name??null,status:row?.status??null,version:row?.installed?.version??row?.version??null,reason:clip(row?.reason??'',1000)||null})),
    sources:(sources??[]).map(row=>({id:row?.id??null,name:row?.name??null,status:row?.status??null,version:row?.installedVersion??row?.version??null,error:clip(row?.error??'',1000)||null})),
    services:(services??[]).map(row=>({id:row?.id??null,name:row?.name??null,status:row?.status??null,port:row?.port??null,error:clip(row?.error?.message??row?.error??'',1000)||null}))
  };
}

export function feedbackMethods(storeArg,{
  app,window,dialog,shell,runtimes,sources,services,modelInfo,projectPath,dataDir,homeDir,secrets,now=()=>new Date(),maxBytes=MAX_ZIP_BYTES,downloads
}={}){
  if(typeof storeArg!=='function')throw new Error('feedbackMethods needs a store provider');
  let lastExportedPath=null;
  const store=()=>storeArg();
  async function collect(sessionId,args={},date=now()){
    const workspace=store(),session=workspace.session(sessionId),events=await workspace.events(session.id);
    const [runtimeRows,sourceRows,serviceRows]=await Promise.all([valueOf(runtimes,[]),valueOf(sources,[]),valueOf(services,[])]);
    const selection=session.selection??{},modelKey=selection.modelKey??null;
    let model=null;try{model=modelKey&&modelKey!=='native'?await modelInfo?.(modelKey):null;}catch{}
    const source=selection.modelSource??model?.source??(modelKey&&modelKey!=='native'?String(modelKey).split(':')[0]:null);
    const project=projectPath?await valueOf(()=>projectPath(session),null):await valueOf(()=>workspace.project(session.projectId).path,null);
    const dataRoot=dataDir?await valueOf(dataDir,dirname(workspace.root)):dirname(workspace.root);
    let from=Infinity,to=-Infinity;
    for(const event of events){const at=Date.parse(event?.at??'');if(!Number.isNaN(at)){from=Math.min(from,at);to=Math.max(to,at);}}
    if(!Number.isFinite(from)){from=Date.parse(session.createdAt??'')||date.getTime();to=from;}
    const reports=await readReports({workspaceRoot:workspace.root,source,runtimeId:session.runtimeId,events,from:from-60000,to:to+60000});
    const appInfo={
      version:app?.getVersion?.()??null,
      packaged:app?.isPackaged??false,
      platform:process.platform,arch:process.arch,osRelease:os.release(),
      electron:process.versions.electron??null,node:process.versions.node??null,
      locale:app?.getLocale?.()??'zh-CN'
    };
    const environment=publicEnvironment({runtimes:runtimeRows,sources:sourceRows,services:serviceRows});
    const knownSecrets=await valueOf(secrets,[]);
    const result=buildFeedbackPackage({
      session,events,reports,includeConversation:args.includeConversation===true,includeTools:args.includeTools===true,note:typeof args.note==='string'?args.note:'',
      generatedAt:date,app:appInfo,environment,runtimeVersion:runtimeVersionOf(runtimeRows,session.runtimeId),modelSource:source,modelName:model?.name??selection.nativeModel??modelKey,
      projectPath:project,dataDir:dataRoot,homeDir:homeDir??os.homedir(),secrets:Array.isArray(knownSecrets)?knownSecrets:[],maxBytes
    });
    return result;
  }
  return {
    'feedback:preview':async({sessionId,includeConversation=false,includeTools=false}={})=>{
      const result=await collect(sessionId,{includeConversation,includeTools});
      return result.preview;
    },
    'feedback:export':async({sessionId,includeConversation=false,includeTools=false,note=''}={})=>{
      if(typeof dialog?.showSaveDialog!=='function')throw new Error('保存对话框不可用');
      const date=now(),result=await collect(sessionId,{includeConversation,includeTools,note},date);
      const base=downloads??app?.getPath?.('downloads')??join(os.homedir(),'Downloads');
      const choice=await dialog.showSaveDialog(window?.(),{title:'导出反馈',defaultPath:join(base,result.filename),filters:[{name:'ZIP 压缩包',extensions:['zip']}]});
      if(choice?.canceled||!choice?.filePath)return null;
      await mkdir(dirname(choice.filePath),{recursive:true});
      // Write beside the target and rename, so an interrupted export never leaves a half-written zip under the chosen name.
      const part=`${choice.filePath}.${process.pid}.part`;
      try{await writeFile(part,result.zip);await rename(part,choice.filePath);}
      catch(error){await rm(part,{force:true}).catch(()=>{});throw error;}
      lastExportedPath=choice.filePath;
      return {path:choice.filePath,bytes:result.zip.length};
    },
    'feedback:reveal':async({path}={})=>{
      if(typeof path!=='string'||!lastExportedPath||resolve(path)!==resolve(lastExportedPath))throw new Error('只能打开最近一次导出的反馈文件');
      if(typeof shell?.showItemInFolder!=='function')throw new Error('资源管理器不可用');
      shell.showItemInFolder(lastExportedPath);return true;
    }
  };
}
