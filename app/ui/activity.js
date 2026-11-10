/* What each session's current turn is doing right now, derived from its live event stream. */

/** Kimi's ACP tool calls carry their arguments as JSON text in the first content block. */
function acpArgs(data){
  const text=data?.sessionUpdate==='tool_call_update'?null:data?.content?.[0]?.content?.text;
  if(typeof text!=='string')return null;
  try{const value=JSON.parse(text);return value&&typeof value==='object'?value:null;}catch{return null;}
}
export function argsOf(data){
  // Antigravity reports its tool calls as {name, parameters:{Path, CommandLine, …}}.
  let value=data?.arguments??data?.rawInput??data?.input??data?.parameters??data?.item??acpArgs(data)??data;
  if(typeof value==='string'){try{value=JSON.parse(value);}catch{return{text:value};}}
  return value&&typeof value==='object'?value:{};
}
export function toolSummary(event){
  const d=event?.data??{},v=Object.fromEntries(Object.entries(argsOf(d)).map(([k,x])=>[k.toLowerCase(),x]));
  const command=Array.isArray(v.command)?v.command.join(' '):v.command??v.commandline;
  // A search reads best as what it looks for, then where.
  const text=x=>typeof x==='string'&&x.trim(),wanted=[v.pattern,v.query].find(text),place=[v.path,v.searchpath,v.directorypath].find(text);
  const first=[command,wanted&&place?`${wanted} · ${place}`:null,v.file_path,v.path,v.absolutepath,v.targetfile,v.directorypath,v.searchpath,v.pattern,v.query,Array.isArray(v.queries)?v.queries.join(', '):null,v.url,v.skill,v.description,v.prompt,v.text,Array.isArray(v.questions)?v.questions[0]?.question:null,d.title,d.tool_name].find(x=>typeof x==='string'&&x.trim());
  if(first)return first.replace(/\s+/g,' ').slice(0,160);
  if(Array.isArray(v.changes))return v.changes.map(c=>c.path).filter(Boolean).join(', ').slice(0,160);
  if(Array.isArray(d.locations))return d.locations.map(l=>l.path).filter(Boolean).join(', ').slice(0,160);
  return'';
}

/** Tool names differ per runtime (Codex item types, DSH/Antigravity tool names, Kimi titles); order matters. */
const TOOL_KINDS=[
  // Claude Code's own tools whose names the generic patterns below would misread.
  [/^toolsearch$/i,'加载工具','正在加载工具定义'],
  [/^skill$/i,'使用技能','正在使用技能'],
  [/^askuserquestion$/i,'提问','正在等你回答'],
  [/^(enter|exit)planmode$/i,'计划模式','正在切换计划模式'],
  [/^(enter|exit)worktree$/i,'切换工作树','正在切换工作树'],
  [/^(taskstop|sendmessage|listagents)$/i,'子代理','正在管理子代理'],
  [/^(cron(create|delete|list)|schedulewakeup)$/i,'定时任务','正在设置定时任务'],
  [/^workflow$/i,'工作流','正在运行工作流'],
  [/^reportfindings$/i,'提交结论','正在提交审查结论'],
  [/mcp/i,'MCP 工具','正在调用 MCP 工具'],
  [/web_?search|search_?web/i,'联网搜索','正在联网搜索'],
  [/fetch|url|browser|http|web/i,'读取网页','正在读取网页'],
  [/agent|collab|delegate|spawn|^task$/i,'子代理','子代理正在工作'],
  [/todo|plan/i,'更新计划','正在更新计划'],
  [/^think/i,'思考中','正在思考'],
  [/image/i,'生成图片','正在生成图片'],
  [/edit|write|patch|filechange|replace|create|delete|remove|move|rename|apply|insert/i,'修改文件','正在修改文件'],
  [/command|shell|bash|exec|terminal|powershell|^run|script/i,'运行命令','正在运行命令'],
  [/list_?dir|^ls$|tree/i,'浏览目录','正在浏览目录'],
  [/read|view|^cat$|open/i,'读取文件','正在读取文件'],
  [/grep|glob|search|find|^rg$/i,'搜索代码','正在搜索代码']
];
/** ACP tool kinds that don't match the name patterns directly. */
const ACP_ALIAS={search:'grep',execute:'exec'};
const clip=(text,max=80)=>{const s=String(text??'').replace(/\s+/g,' ').trim();return s.length>max?s.slice(0,max-1)+'…':s;};

export function toolActivity(event){
  const d=event?.data??{},name=String(event?.name??d.name??d.tool_name??'工具');
  const probes=[d.kind&&d.kind!=='other'?ACP_ALIAS[d.kind]??d.kind:null,name,d.type].filter(x=>typeof x==='string'&&x);
  let hit=null;
  for(const probe of probes){hit=TOOL_KINDS.find(([re])=>re.test(probe));if(hit)break;}
  const summary=toolSummary(event)||(d.server&&d.tool?`${d.server} · ${d.tool}`:'');
  if(!hit)return{kind:'tool',short:'调用工具',long:'正在调用工具',detail:summary&&summary!==name?`${name} · ${summary}`:name};
  return{kind:'tool',short:hit[1],long:hit[2],detail:summary};
}

/** Status lines the bundled Qoder bridge sends while the upstream is silent or retrying. */
export function gatewayNotice(text){
  const s=String(text??'');
  let m=/Still waiting for Qoder \((\d+)s/i.exec(s);
  if(m)return{kind:'upstream',short:'等待上游',long:'等待 Qoder 上游响应',detail:`${m[1]} 秒没有输出`,transient:true};
  m=/upstream retry (\d+)\/(\d+)(?: \(HTTP (\d+)\))?; next attempt in (\d+)s/i.exec(s);
  if(m)return{kind:'retry',short:'重试中',long:`Qoder 上游请求重试 ${m[1]}/${m[2]}`,detail:[m[3]&&`HTTP ${m[3]}`,`${m[4]} 秒后重试`].filter(Boolean).join(' · ')};
  return null;
}
function failureText(f){
  if(!f||typeof f!=='object')return clip(f,60);
  const status=f.status??f.httpStatus??f.statusCode;
  return clip([Number.isInteger(status)?`HTTP ${status}`:null,f.code,f.kind,f.message].find(x=>typeof x==='string'&&x)??'',60);
}

const fresh=at=>({phase:'request',at,tools:new Map(),approvals:new Map(),note:null,compacting:false});
const STATES={
  request:{kind:'request',short:'等待响应',long:'等待模型响应',detail:''},
  thinking:{kind:'thinking',short:'思考中',long:'正在思考',detail:''},
  writing:{kind:'writing',short:'输出中',long:'正在输出回复',detail:''}
};

export class ActivityTracker {
  constructor(){this.sessions=new Map();}
  reset(id){this.sessions.delete(id);}
  /** Rebuild one session from its stored events, e.g. after the renderer reloads mid-turn. */
  replay(id,events){this.sessions.delete(id);for(const event of events)this.feed(event,id);}
  feed(event,id=event.sessionId){
    if(!id||!event)return;
    // A message added mid-turn joins the running turn; it does not start a new one.
    if(event.type==='user'&&event.delivery==='steer')return;
    if(event.type==='user'){this.sessions.set(id,fresh(event.at));return;}
    let r=this.sessions.get(id);
    if(!r){r=fresh(event.at);this.sessions.set(id,r);}
    // The session status flips a moment after turn-end; until then say so rather than guessing a phase.
    if(event.type==='turn-end'){r.ended=true;return;}
    const type=event.type==='content-replace'?event.channel:event.type,key=event.toolId??event.data?.callId??event.id;
    switch(type){
      case'thinking':case'text':
        // Harnesses send tool results back before the next model output, so earlier tools are done.
        r.phase=type==='text'?'writing':'thinking';r.note=null;r.tools.clear();break;
      case'tool-start':case'tool-output':{
        const known=r.tools.get(key);
        if(type==='tool-start'||!known)r.tools.set(key,{event:type==='tool-start'||!known?event:known.event,root:known?.root});
        r.note=null;break;
      }
      case'tool-end':
        r.tools.delete(key);
        for(const [k,t] of r.tools)if(t.root===key)r.tools.delete(k);
        if(!r.tools.size)r.phase='request';
        break;
      case'approval':case'question':r.approvals.set(event.approvalId,event);break;
      case'approval-resolved':r.approvals.delete(event.approvalId);break;
      case'subagent':r.note={kind:'subagent',short:'子代理',long:'子代理正在工作',detail:clip(event.data?.name??event.data?.description??event.data?.task??'')};break;
      case'notice':if(event.source==='gateway'){const note=gatewayNotice(event.text);if(note)r.note=note;}break;
      case'upstream-error':r.note={kind:'retry',short:'上游报错',long:event.retrying===false?'上游已中断本轮':'上游报错，等待重试',detail:clip(event.message,60)};break;
      case'error':if(event.data?.willRetry===true)r.note={kind:'retry',short:'重试中',long:'连接中断，正在重试',detail:clip(event.data?.error?.message??event.text,60)};break;
      case'native-event':this.native(r,event);break;
    }
  }
  native(r,e){
    const name=e.name??'',d=e.data??{},item=d.item??{};
    // A new model step means the previous step's tools have all returned.
    if(['step/start','request/header','request/context','turn/started'].includes(name)){r.tools.clear();r.phase='request';return;}
    if(name==='compaction/start'||name==='item/started'&&item.type==='contextCompaction'){r.compacting=true;return;}
    if(name==='compaction/end'||name==='thread/compacted'||name==='item/completed'&&item.type==='contextCompaction'){r.compacting=false;return;}
    if(name==='item/started'&&item.type==='reasoning'){r.phase='thinking';return;}
    // The model is still writing a tool call's arguments (a large edit can take a while). DSH forwards these
    // stream chunks; `gateway/tool-call` is the gateway's equivalent for Codex and Kimi (see the backend review §3.4).
    if(name==='assistant-stream'&&d.chunk?.type==='tool-call-delta'||name==='gateway/tool-call'){
      const call=d.chunk?.name??d.name;
      if(r.phase!=='tool-call')r.call=null;
      if(typeof call==='string'&&call)r.call=call;
      r.phase='tool-call';r.note=null;return;
    }
    if(name==='llm/retry'){r.note={kind:'retry',short:'重试中',long:`请求失败，准备第 ${d.retry} 次重试${d.maxRetries?`（最多 ${d.maxRetries} 次）`:''}`,detail:[failureText(d.failure),Number.isFinite(d.delayMs)?`${Math.max(1,Math.round(d.delayMs/1000))} 秒后`:null].filter(Boolean).join(' · ')};return;}
    if(name==='llm/retry-started'){r.note={kind:'retry',short:'重试中',long:`正在重试请求（第 ${d.retry} 次）`,detail:''};r.phase='request';return;}
    if(name==='tool/ptc-dispatch-start'&&d.subCallId){r.tools.set(`ptc:${d.subCallId}`,{event:{name:d.name,data:{arguments:d.arguments}},root:d.rootCallId});return;}
    if(name==='tool/ptc-dispatch'&&d.subCallId)r.tools.delete(`ptc:${d.subCallId}`);
  }
  /** One status for display: `short` for lists, `long` (+ `detail`) for the active session. */
  describe(id,status,{runtime='',stopping=false}={}){
    if(stopping)return{kind:'stopping',short:'正在停止',long:'正在停止本轮',detail:''};
    if(status==='starting')return{kind:'starting',short:'连接中',long:runtime?`正在连接 ${runtime}`:'正在连接运行环境',detail:''};
    const r=this.sessions.get(id);
    if(status==='waiting'){
      const ask=r&&[...r.approvals.values()].at(-1),d=ask?.data??{};
      if(ask?.type==='question')return{kind:'question',short:'等待回答',long:'等待你回答问题',detail:''};
      return{kind:'approval',short:'等待授权',long:'等待你授权',detail:clip(d.toolName??d.toolCall?.title??ask?.name??'')};
    }
    if(!r)return STATES.request;
    if(r.ended)return{kind:'ending',short:'收尾中',long:'正在结束本轮',detail:''};
    if(r.compacting)return{kind:'compacting',short:'压缩上下文',long:'正在压缩上下文',detail:''};
    if(r.note)return r.note;
    if(r.tools.size===1)return toolActivity([...r.tools.values()][0].event);
    if(r.tools.size>1){
      const kinds=[...new Set([...r.tools.values()].map(t=>toolActivity(t.event).short))];
      return{kind:'tool',short:`${r.tools.size} 个工具`,long:`正在并行运行 ${r.tools.size} 个工具`,detail:kinds.join('、')};
    }
    if(r.phase==='tool-call')return{kind:'tool-call',short:'准备工具',long:'正在生成工具调用',detail:r.call??''};
    return STATES[r.phase]??STATES.request;
  }
}
