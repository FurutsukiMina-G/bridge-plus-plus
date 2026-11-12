import {existsSync} from 'node:fs';
import {mkdir,readFile,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {launch,JsonLines,stopProcess} from '../core/process.mjs';
import {RuntimeLifecycle} from '../core/lifecycle.mjs';
import {failureText,failureValue,runtimeReason} from '../services/failure-details.mjs';
import {createClaudeReviewer} from './claude-review.mjs';
import {CLAUDE_AUTO_REVIEW_NATIVES} from '../services/runtime-permissions.mjs';
import {rulesDocument,writeRulesFile} from '../services/agent-rules.mjs';

const PERMISSIONS={readonly:'plan',ask:'default','auto-review':'acceptEdits',auto:'bypassPermissions'};
const MODEL_ENV=['ANTHROPIC_MODEL','ANTHROPIC_DEFAULT_OPUS_MODEL','ANTHROPIC_DEFAULT_SONNET_MODEL','ANTHROPIC_DEFAULT_HAIKU_MODEL','ANTHROPIC_SMALL_FAST_MODEL','CLAUDE_CODE_SUBAGENT_MODEL'];
const cleanStderr=value=>String(value??'').split(/\r?\n/).filter(line=>line&&!line.includes('[claude-code:unrecognized_model]')).join('\n').slice(-6000);
// The probed runtime catalog wins: older CLIs call the ask mode "default".
export function claudePermissionNative(mode,runtime){
  if(mode==null)return null;
  const modes=runtime?.permissions?.modes??[],native=modes.find(row=>row.id===mode)?.native?.mode;
  // auto-review prefers native acceptEdits and falls back like ask on older CLIs.
  const fallback=mode==='auto-review'?CLAUDE_AUTO_REVIEW_NATIVES.find(name=>modes.some(row=>(row.native?.mode??row.id)===name))??PERMISSIONS[mode]:PERMISSIONS[mode];
  const value=native??fallback;
  if(!value)throw new Error('未知 Claude Code 权限模式');return value;
}
const oneLine=(value,limit)=>{let text='';try{text=typeof value==='string'?value:JSON.stringify(value??{});}catch{text='';}const line=String(text).replace(/\s+/g,' ').trim();return line.length>limit?line.slice(0,limit)+'…':line;};
const reviewTarget=request=>{
  const input=request.input??{},tool=request.tool_name??'';
  if(tool==='Bash'||tool==='PowerShell')return oneLine(input.command??input.script??'',80);
  return oneLine(input.file_path??input.path??input.notebook_path??input,80);
};
async function hasNativeRecord(configDir,id){
  const root=join(configDir,'projects');let entries;
  try{entries=await readdir(root,{withFileTypes:true});}catch{return false;}
  for(const entry of entries){if(!entry.isDirectory())continue;try{await stat(join(root,entry.name,`${id}.jsonl`));return true;}catch{}}
  return false;
}

// Claude Code reads these besides the prefixed ones; inherited values change its behaviour.
export const CLAUDE_DROPPED_ENV=['API_TIMEOUT_MS','API_FORCE_IDLE_TIMEOUT','AWS_BEARER_TOKEN_BEDROCK','BASH_DEFAULT_TIMEOUT_MS','BASH_MAX_TIMEOUT_MS','BASH_MAX_OUTPUT_LENGTH','CLOUD_ML_REGION','IS_DEMO','IS_SANDBOX','MAX_THINKING_TOKENS','MAX_MCP_OUTPUT_TOKENS','MAX_STRUCTURED_OUTPUT_RETRIES','SLASH_COMMAND_TOOL_CHAR_BUDGET','USE_API_CONTEXT_MANAGEMENT','USE_BUILTIN_RIPGREP','USE_LOCAL_OAUTH','USE_STAGING_OAUTH','USER_TYPE','FORCE_AUTOUPDATE_PLUGINS','FORCE_CODE_TERMINAL','FORCE_PROMPT_CACHING_5M','ENABLE_BETA_TRACING_DETAILED','ENABLE_CLAUDEAI_MCP_SERVERS','ENABLE_ENHANCED_TELEMETRY_BETA','ENABLE_MCP_LARGE_OUTPUT_FILES','ENABLE_PROMPT_CACHING_1H','ENABLE_PROMPT_CACHING_1H_BEDROCK','ENABLE_TOOL_SEARCH','DISABLE_AUTOUPDATER','DISABLE_AUTO_COMPACT','DISABLE_BRIEF_MODE_STOP_HOOK','DISABLE_BUG_COMMAND','DISABLE_COMPACT','DISABLE_COST_WARNINGS','DISABLE_DOCTOR_COMMAND','DISABLE_ERROR_REPORTING','DISABLE_EXTRA_USAGE_COMMAND','DISABLE_FEEDBACK_COMMAND','DISABLE_GROWTHBOOK','DISABLE_INSTALLATION_CHECKS','DISABLE_INSTALL_GITHUB_APP_COMMAND','DISABLE_INTERLEAVED_THINKING','DISABLE_LOGIN_COMMAND','DISABLE_LOGOUT_COMMAND','DISABLE_MICROCOMPACT','DISABLE_TELEMETRY','DISABLE_UPDATES','DISABLE_UPGRADE_COMMAND'];
const CLAUDE_DROPPED_NAMES=new Set(CLAUDE_DROPPED_ENV),CLAUDE_DROPPED_PREFIXES=['VERTEX_REGION_','DISABLE_PROMPT_CACHING'];
const claudeDropped=key=>{const upper=key.toUpperCase();return CLAUDE_DROPPED_NAMES.has(upper)||CLAUDE_DROPPED_PREFIXES.some(prefix=>upper.startsWith(prefix))||/^(ANTHROPIC_|CLAUDE|MCP_|OTEL_)/i.test(key);};

export function claudeLaunchSettings(options){
  const {session,variant,endpoint,permissionMode,configDir,resume}=options,selection=options.selection??session.selection??{},model=options.model??{};
  const env={...process.env};for(const key of Object.keys(env))if(claudeDropped(key))delete env[key];
  Object.assign(env,{CLAUDE_CONFIG_DIR:configDir,ANTHROPIC_BASE_URL:String(endpoint.baseURL).replace(/\/v1\/?$/,''),ANTHROPIC_AUTH_TOKEN:endpoint.key,CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1',DISABLE_TELEMETRY:'1',DISABLE_ERROR_REPORTING:'1',DISABLE_AUTOUPDATER:'1',DISABLE_LOGIN_COMMAND:'1',CLAUDE_CODE_DISABLE_LAUNCHER_SIGN_IN:'1',CLAUDE_CODE_ATTRIBUTION_HEADER:'0',CLAUDE_CODE_DISABLE_BACKGROUND_TASKS:'1',CLAUDE_CODE_DISABLE_CRON:'1'});
  // Loopback must never go through a user proxy: the gateway is always local.
  const mergeNoProxy=value=>{const items=String(value??'').split(',').map(item=>item.trim()).filter(Boolean);for(const item of ['127.0.0.1','localhost','::1'])if(!items.includes(item))items.push(item);return items.join(',');};
  env.NO_PROXY=mergeNoProxy(env.NO_PROXY??env.no_proxy);env.no_proxy=env.NO_PROXY;
  for(const key of MODEL_ENV)env[key]=variant.id;
  // The upstream window and the local auto-compact budget are separate: never shrink the budget.
  const upstream=selection.contextTokens??variant.contextWindow??model.defaultContextTokens??model.contextMaximum??model.contextTokens,compact=selection.contextBudget??upstream;
  if(Number.isFinite(upstream)&&upstream>0)env.CLAUDE_CODE_MAX_CONTEXT_TOKENS=String(upstream);
  if(Number.isFinite(compact)&&compact>0)env.CLAUDE_CODE_AUTO_COMPACT_WINDOW=String(compact);
  const output=model.maxOutputTokens??variant.maxOutputTokens;if(Number.isFinite(output)&&output>0)env.CLAUDE_CODE_MAX_OUTPUT_TOKENS=String(output);
  // Only the controlled values belong in flag settings, never the inherited process environment.
  const controlled={CLAUDE_CONFIG_DIR:env.CLAUDE_CONFIG_DIR,ANTHROPIC_BASE_URL:env.ANTHROPIC_BASE_URL,...Object.fromEntries(MODEL_ENV.map(key=>[key,variant.id])),...(env.CLAUDE_CODE_MAX_CONTEXT_TOKENS?{CLAUDE_CODE_MAX_CONTEXT_TOKENS:env.CLAUDE_CODE_MAX_CONTEXT_TOKENS}:{}),...(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW?{CLAUDE_CODE_AUTO_COMPACT_WINDOW:env.CLAUDE_CODE_AUTO_COMPACT_WINDOW}:{}),...(env.CLAUDE_CODE_MAX_OUTPUT_TOKENS?{CLAUDE_CODE_MAX_OUTPUT_TOKENS:env.CLAUDE_CODE_MAX_OUTPUT_TOKENS}:{}),CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:'1',DISABLE_TELEMETRY:'1',DISABLE_ERROR_REPORTING:'1',DISABLE_AUTOUPDATER:'1',DISABLE_LOGIN_COMMAND:'1',CLAUDE_CODE_DISABLE_LAUNCHER_SIGN_IN:'1',CLAUDE_CODE_ATTRIBUTION_HEADER:'0',CLAUDE_CODE_DISABLE_BACKGROUND_TASKS:'1',CLAUDE_CODE_DISABLE_CRON:'1',NO_PROXY:env.NO_PROXY,no_proxy:env.no_proxy,CLAUDE_CODE_USE_BEDROCK:'0',CLAUDE_CODE_USE_VERTEX:'0',CLAUDE_CODE_USE_FOUNDRY:'0'};
  const args=['-p','--input-format','stream-json','--output-format','stream-json','--verbose','--include-partial-messages','--permission-prompt-tool','stdio','--model',variant.id,'--disallowedTools','ScheduleWakeup'];
  if(resume&&session.nativeId)args.push('--resume',session.nativeId);else args.push('--session-id',session.id);
  if(permissionMode!=null){const mode=claudePermissionNative(permissionMode,options.runtime);args.push('--permission-mode',mode);if(mode==='bypassPermissions')args.push('--allow-dangerously-skip-permissions');}
  // A tool executor keeps no memory of its own between sessions: the model would otherwise spend requests
  // (and permission prompts outside the project) writing memory files into Bridge++'s private config.
  args.push('--settings',JSON.stringify({skipWebFetchPreflight:true,autoMemoryEnabled:false,model:variant.id,env:controlled}));
  return {args,env};
}

async function claudeContent(text,attachments){
  if(typeof text!=='string')throw new Error('无效的 Claude Code 文本输入');
  const content=[...(text?[{type:'text',text}]:[])];
  for(const attachment of attachments){
    if(attachment.kind!=='image'||typeof attachment.mime!=='string'||!attachment.mime.startsWith('image/'))throw new Error('Claude Code 仅支持图片附件，不支持音频、视频或其他文件类型');
    content.push({type:'image',source:{type:'base64',media_type:attachment.mime,data:(await readFile(attachment.path)).toString('base64')}});
  }
  return content;
}

export class ClaudeAdapter extends RuntimeLifecycle {
  constructor(options){
    super(options);this.requests=new Map();this.pending=new Map();this.steers=new Map();this.subagentTools=new Map();this.reviews=new Map();this.controlSeq=0;this.stderr='';this.cancelled=false;this.roundText='';this.lastUserRequest='';
    // One reviewer per session: the same gateway endpoint and model name Claude Code itself uses.
    this.reviewer=options.reviewer??(this.endpoint?.baseURL&&this.variant?.id?createClaudeReviewer({endpoint:this.endpoint,model:this.variant.id,fetch:options.reviewFetch,now:options.reviewNow,timeoutMs:options.reviewTimeoutMs}):null);
  }
  async start(){
    this.checkOpen();const credentials=join(this.configDir,'.credentials.json');if(existsSync(credentials))throw new Error(`Bridge++ 的 Claude Code 私有配置目录里出现了登录凭据文件，Bridge++ 保持非登录态；请删除 ${credentials} 后重试`);
    await mkdir(this.configDir,{recursive:true});
    const rules=await this.agentRules?.injection();await writeRulesFile(join(this.configDir,'CLAUDE.md'),rulesDocument(rules?.text??''));
    if(rules?.version)await this.saveNative(this.session.nativeId,{rulesVersion:rules.version});
    const resume=!!this.session.nativeId&&await hasNativeRecord(this.configDir,this.session.id);
    if(this.session.nativeId&&!resume)await this.emit({type:'notice',text:'没有找到 Claude Code 原生会话记录，已用同一 ID 新开原生会话（之前的原生上下文不可用）。'});
    const {args,env}=claudeLaunchSettings({...this,resume});
    this.checkOpen();this.child=(this.launchProcess??launch)(this.runtime.executable,args,{cwd:this.project.path,env,exactEnv:true});
    const lines=new JsonLines(72*1024*1024);this.child.stdout.on('data',data=>lines.push(data));this.child.stdout.on('end',()=>lines.end());
    lines.on('message',message=>{void this.enqueue(()=>this.closed?undefined:this.message(message));});lines.on('text',text=>{void this.enqueue(()=>this.closed?undefined:this.emit({type:'notice',text}));});lines.on('fault',error=>{void this.enqueue(async()=>{if(!this.closed&&this.running){this.running=false;await this.emit({type:'error',text:error.message});await this.emit({type:'turn-end',status:'failed',reason:runtimeReason(error)});}});});
    this.child.stderr.setEncoding?.('utf8');this.child.stderr.on('data',data=>{this.stderr=(this.stderr+String(data)).slice(-16000);});
    const failed=error=>{void this.enqueue(()=>this.processFailed(error));};this.child.on('error',failed);this.child.stdin.on('error',failed);this.child.on('close',(code,signal)=>{void this.enqueue(()=>this.processClosed(code,signal));});
    let initialized;try{initialized=await this.control('initialize',{},60000);}catch(error){await stopProcess(this.child);throw error;}if(initialized.account?.tokenSource!=='ANTHROPIC_AUTH_TOKEN'){await this.close();throw new Error('Claude Code 未使用 Bridge++ 网关凭据，已停止');}
    if(!this.session.nativeId)await this.saveNative(this.session.id);
    this.checkOpen();
  }
  send(message){this.checkOpen();if(!this.child||this.child.stdin.destroyed)throw new Error('Claude Code 原生连接已关闭');this.child.stdin.write(JSON.stringify(message)+'\n');}
  control(subtype,fields={},timeoutMs=60000){
    const requestId=`bridge_${++this.controlSeq}`;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(requestId);reject(new Error(`Claude Code 原生控制请求超时：${subtype}`));},timeoutMs);this.pending.set(requestId,{resolve,reject,timer,subtype});try{this.send({type:'control_request',request_id:requestId,request:{subtype,...fields}});}catch(error){clearTimeout(timer);this.pending.delete(requestId);reject(error);}});
  }
  async processFailed(error){if(this.closed)return;this.rejectControls(error);if(this.running){this.running=false;await this.emit({type:'error',text:error.message});await this.emit({type:'turn-end',status:'failed',reason:runtimeReason(error)});}}
  async processClosed(code,signal){
    const error=new Error(`Claude Code 原生进程已退出（退出码 ${code??'未知'}${signal?'，信号 '+signal:''}）`);this.rejectControls(error);this.ready=false;if(this.closed||!this.running)return;this.running=false;
    const stderr=cleanStderr(this.stderr),reason=runtimeReason(`${error.message}${stderr?'；stderr：'+failureText(stderr,1200):''}`);await this.emit({type:'error',text:reason.message,data:{code,signal}});await this.emit({type:'turn-end',status:'failed',reason});
  }
  rejectControls(error){for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(error);}this.pending.clear();}
  async message(m){
    if(m.type==='control_response'){
      const response=m.response??{},pending=this.pending.get(response.request_id);if(!pending)return;this.pending.delete(response.request_id);clearTimeout(pending.timer);if(response.subtype==='error')pending.reject(new Error(failureText(response.error)||`Claude Code 原生控制请求失败：${pending.subtype}`));else pending.resolve(response.response??{});return;
    }
    if(m.type==='control_request'){await this.controlRequest(m);return;}
    if(m.type==='command_lifecycle'){await this.commandLifecycle(m);return;}
    if(m.type==='stream_event'){
      // Subagent deltas would create thousands of rows: only the parent summaries matter.
      if(m.parent_tool_use_id)return;const delta=m.event?.delta;if(!['text_delta','thinking_delta'].includes(delta?.type))return;if(delta.type==='text_delta'&&delta.text)this.roundText=(this.roundText+delta.text).slice(-4000);await this.emit({type:delta.type==='text_delta'?'text':'thinking',text:delta.type==='text_delta'?delta.text??'':delta.thinking??''});return;
    }
    if(m.type==='assistant'){
      const parent=m.parent_tool_use_id;for(const part of m.message?.content??[]){
        if(part.type==='tool_use'){
          if(parent){this.subagentTools.set(part.id,part.name);await this.emit({type:'tool-output',toolId:parent,text:`子代理 → ${part.name} ${oneLine(part.input,120)}\n`});}
          else await this.emit({type:'tool-start',toolId:part.id,name:part.name,data:part});
        }else if(parent&&part.type==='text'&&part.text)await this.emit({type:'tool-output',toolId:parent,text:`${String(part.text).replace(/\s+$/,'').slice(0,2000)}\n`});
      }return;
    }
    if(m.type==='user'){
      const parent=m.parent_tool_use_id;for(const part of m.message?.content??[])if(part.type==='tool_result'){
        if(parent){if(part.is_error)await this.emit({type:'tool-output',toolId:parent,text:`子代理 ← ${this.subagentTools.get(part.tool_use_id)??part.tool_use_id} 出错\n`});}
        else await this.emit({type:'tool-end',toolId:part.tool_use_id,data:{content:part.content,is_error:part.is_error}});
      }return;
    }
    if(m.type==='system'){
      if(m.subtype==='init'){
        if(!this.connected){this.connected=true;await this.emit({type:'notice',text:`Claude Code ${m.claude_code_version??''} 已连接（私有配置、非登录）。`});return;}
        if(!this.running){void this.control('interrupt',{cancel_queued:true},10000).catch(()=>{});await this.emit({type:'notice',text:'Claude Code 自行开始了新的一轮，Bridge++ 已停止它。'});return;}
      }
      if(['task_started','task_notification'].includes(m.subtype)&&m.tool_use_id){await this.emit({type:'tool-output',toolId:m.tool_use_id,name:m.subtype,data:m});return;}
      if(m.subtype==='thinking_tokens')return;
      await this.emit({type:'native-event',name:m.subtype??'system',data:m});return;
    }
    if(m.type==='result'){await this.result(m);return;}
    await this.emit({type:'native-event',name:m.type??'event',data:m});
  }
  async result(m){
    const success=m.subtype==='success',carry=[...this.steers.values()].filter(row=>row.state==='pending'||row.state==='queued');
    if(carry.length&&!this.cancelled){
      if(!success){
        const why=m.subtype==='error_max_turns'?'已达到本轮最大轮次':m.subtype==='error_during_execution'?'本轮已中断':failureText(runtimeReason(m.error??m.result??m.subtype,'').message)||'未提供具体原因';
        await this.emit({type:'notice',text:`Claude Code 本轮未成功结束（${why}）；排队的插话由 Claude Code 带到下一轮继续。`});
      }
      for(const row of carry){row.state='carried';await this.emit({type:'steer-state',steerId:row.id,state:'carried',reason:'由 Claude Code 原生队列带到下一轮'});}
      return;
    }
    this.running=false;this.cancelled=false;const interrupted=['error_during_execution','error_max_turns'].includes(m.subtype);if(m.subtype==='error_max_turns')await this.emit({type:'notice',text:'Claude Code 已达到本轮最大轮次，任务已中断。'});
    const status=success?'completed':interrupted?'interrupted':'failed',reason=success?undefined:m.subtype==='error_during_execution'?{kind:'cancelled',message:'Claude Code 本轮已中断。'}:runtimeReason(m.error??m.result??m.subtype,'Claude Code 本轮未成功结束，未提供具体原因。');await this.emit({type:'turn-end',status,data:failureValue(m),...reason?{reason}:{}});
  }
  async commandLifecycle(m){
    const row=this.steers.get(m.command_uuid);if(!row||row.state==='retracted')return;if(m.state==='queued'){row.state='queued';clearTimeout(row.timer);row.resolve({});return;}
    if(m.state==='started'){clearTimeout(row.timer);this.steers.delete(row.id);await this.emit({type:'steer-state',steerId:row.id,state:'delivered'});await this.emit({type:'steer-consumed',steerId:row.id});return;}
    if(m.state==='completed'&&row.state!=='queued'){clearTimeout(row.timer);this.steers.delete(row.id);}
  }
  async controlRequest(m){
    const request=m.request??{};
    if(request.subtype==='can_use_tool'&&!this.running){this.toolResponse(m.request_id,{behavior:'deny',message:'Bridge++ 当前没有进行中的任务，已拒绝'});await this.emit({type:'notice',text:'Claude Code 在没有进行中的任务时请求授权，Bridge++ 已拒绝。'});return;}
    if(request.subtype!=='can_use_tool'){this.send({type:'control_response',response:{subtype:'error',request_id:m.request_id,error:'Bridge++ 不支持此原生交互'}});await this.emit({type:'notice',text:`Bridge++ 不支持 Claude Code 原生交互 ${request.subtype??'未知'}。`});return;}
    if(this.permissionMode==='readonly'){this.toolResponse(m.request_id,{behavior:'deny',message:'只读模式已拒绝 Claude Code 工具请求'});await this.emit({type:'error',source:'native-permission',code:'permission_denied',text:'只读模式已拒绝 Claude Code 工具请求',data:request});return;}
    const id=`claude:${randomUUID()}`;this.requests.set(id,m);
    if(request.tool_name==='AskUserQuestion'){await this.emit({type:'question',approvalId:id,data:request.input});return;}
    const choices=request.permission_suggestions?.length?['approve','approve-session','reject']:['approve','reject'];
    if(this.permissionMode==='auto-review'&&this.reviewer){await this.reviewRequest(id,m,request,choices);return;}
    await this.emit({type:'approval',approvalId:id,name:request.display_name??request.tool_name,data:request,choices});
  }
  // The reviewer sees what the user would: the tool input, this round's request and the agent's latest words.
  reviewContext(request){return {project:this.project?.path??'',cwd:request?.cwd??this.project?.path??'',userRequest:(this.lastUserRequest??'').slice(-2000),agentText:(this.roundText??'').slice(-800)};}
  async reviewRequest(id,m,request,choices){
    const entry={id,message:m,request,choices,controller:new AbortController(),settled:false};this.reviews.set(m.request_id,entry);
    let verdict;
    try{verdict=await this.reviewer.review(request,this.reviewContext(request),entry.controller.signal);}
    catch(error){
      if(entry.settled)return;
      if(entry.controller.signal.aborted){this.cancelReview(entry);return;}
      verdict={decision:'ask',risk:'medium',reason:`自动审查暂时不可用：${oneLine(error?.message??error??'未知原因',200)}`};
    }finally{this.reviews.delete(m.request_id);}
    if(entry.settled)return;
    // A cancelled round must not leave the native request unanswered, even if a
    // slow reviewer ignored the abort and returned a verdict anyway.
    if(entry.controller.signal.aborted){this.cancelReview(entry);return;}
    if(this.requests.get(id)!==m||this.permissionMode!=='auto-review')return;
    if(verdict.decision==='allow'){
      this.requests.delete(id);this.toolResponse(m.request_id,{behavior:'allow',updatedInput:request.input??{}});
      await this.emit({type:'notice',source:'auto-review',text:`自动审查已允许：${request.tool_name??''} · ${reviewTarget(request)} — ${verdict.reason}`});return;
    }
    if(verdict.decision==='deny'){
      this.requests.delete(id);this.toolResponse(m.request_id,{behavior:'deny',message:`Bridge++ 自动审查拒绝了这个操作：${verdict.reason}。如果确实需要，请先向用户说明理由，由用户决定。`});
      await this.emit({type:'notice',source:'auto-review',text:`自动审查已拒绝：${request.tool_name??''} · ${reviewTarget(request)} — ${verdict.reason}`});return;
    }
    await this.emit({type:'approval',approvalId:id,name:request.display_name??request.tool_name,data:{...request,review:{decision:verdict.decision,risk:verdict.risk,reason:verdict.reason}},choices});
  }
  cancelReview(entry){
    entry.settled=true;if(this.requests.get(entry.id)!==entry.message)return;this.requests.delete(entry.id);
    try{this.toolResponse(entry.message.request_id,{behavior:'deny',message:'Bridge++ 已取消自动审查'});}catch{}
  }
  async settleReviews(mode){
    if(mode==='auto-review')return;
    for(const entry of [...this.reviews.values()]){
      if(this.requests.get(entry.id)!==entry.message){entry.settled=true;continue;}
      entry.settled=true;entry.controller.abort(new Error('权限模式已切换'));const {id,message,request,choices}=entry;
      if(mode==='auto'){
        this.requests.delete(id);this.toolResponse(message.request_id,{behavior:'allow',updatedInput:request.input??{}});
        await this.emit({type:'notice',source:'auto-review',text:`已切换为一键授权，自动审查中的 ${request.tool_name??'工具'} 请求已直接放行。`});
      }else if(mode==='readonly'){
        this.requests.delete(id);this.toolResponse(message.request_id,{behavior:'deny',message:'只读模式已拒绝 Claude Code 工具请求'});
        await this.emit({type:'error',source:'native-permission',code:'permission_denied',text:'只读模式已拒绝 Claude Code 工具请求',data:request});
      }else{
        await this.emit({type:'approval',approvalId:id,name:request.display_name??request.tool_name,data:request,choices});
      }
    }
  }
  toolResponse(requestId,response){this.send({type:'control_response',response:{subtype:'success',request_id:requestId,response}});}
  async approve(id,choice,answer){
    const message=this.requests.get(id);if(!message)throw new Error('授权已过期');const request=message.request??{};
    if(choice==='reject'){this.toolResponse(message.request_id,{behavior:'deny',message:request.tool_name==='AskUserQuestion'?'用户没有回答':'用户已拒绝'});this.requests.delete(id);return;}
    if(request.tool_name==='AskUserQuestion'){
      if(choice!=='approve')throw new Error('Claude Code 提问只支持回答或拒绝');const input=request.input??{};this.toolResponse(message.request_id,{behavior:'allow',updatedInput:{...input,answers:answer?.answers??{},...(answer?.annotations?{annotations:answer.annotations}:{})}});this.requests.delete(id);return;
    }
    if(!['approve','approve-session'].includes(choice))throw new Error('未知 Claude Code 授权选择');if(choice==='approve-session'&&!request.permission_suggestions?.length)throw new Error('此工具没有会话级授权建议');
    this.toolResponse(message.request_id,{behavior:'allow',updatedInput:request.input??{},...(choice==='approve-session'?{updatedPermissions:request.permission_suggestions.map(item=>({...item,destination:'session'}))}:{})});this.requests.delete(id);
  }
  async prompt(text,attachments=[]){await this.ensureStarted();this.checkOpen();if(this.running)throw new Error('Claude Code 当前仍在执行');const content=await claudeContent(text,attachments);this.cancelled=false;this.running=true;this.lastUserRequest=typeof text==='string'?text.slice(-2000):'';this.roundText='';this.send({type:'user',session_id:'',message:{role:'user',content},parent_tool_use_id:null,uuid:randomUUID()});}
  async steer(text,attachments=[],id=randomUUID()){
    this.checkOpen();if(!this.running)throw new Error('原生轮次尚未开始或已经结束');this.lastUserRequest=typeof text==='string'?text.slice(-2000):'';const content=await claudeContent(text,attachments);this.checkOpen();if(!this.running)throw new Error('原生轮次尚未开始或已经结束');
    const admitted=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{const error=new Error('等待 Claude Code 确认插话超时');error.nativeAdmissionUnknown=true;reject(error);},5000);this.steers.set(id,{id,state:'pending',resolve,reject,timer});});
    try{this.send({type:'user',session_id:'',message:{role:'user',content},parent_tool_use_id:null,uuid:id});}catch(error){const row=this.steers.get(id);if(row){clearTimeout(row.timer);this.steers.delete(id);}throw error;}return admitted;
  }
  async cancel(){this.checkOpen();if(!this.running)return;this.cancelled=true;for(const entry of [...this.reviews.values()])entry.controller.abort(new Error('用户已中止这一轮'));await this.control('interrupt',{cancel_queued:true});}
  async retractSteers(){
    const rows=[...this.steers.values()].filter(row=>['pending','queued','carried'].includes(row.state));if(!rows.length)return [];
    const removed=[];for(const row of rows){clearTimeout(row.timer);row.state='retracted';row.resolve?.({});removed.push(row.id);}
    if(!this.closed&&this.child&&!this.child.stdin.destroyed)for(const id of removed)await this.control('cancel_async_message',{message_uuid:id},3000).catch(()=>{});
    for(const id of removed)this.steers.delete(id);
    return removed;
  }
  async setPermissionMode(mode){const native=claudePermissionNative(mode,this.runtime);if(!native)throw new Error('未知 Claude Code 权限模式');await this.ensureStarted();await this.control('set_permission_mode',{mode:native});this.permissionMode=mode;await this.settleReviews(mode);}
  async close(){
    if(this.closing)return this.closing;this.closed=true;this.running=false;this.ready=false;for(const entry of this.reviews.values()){entry.settled=true;entry.controller.abort(new Error('Claude Code 原生连接已关闭'));}this.reviews.clear();this.requests.clear();this.rejectControls(new Error('Claude Code 原生连接已关闭'));for(const row of this.steers.values()){clearTimeout(row.timer);row.reject(new Error('Claude Code 原生连接已关闭'));}this.steers.clear();
    this.closing=(async()=>{const child=this.child;if(!child)return;if(child.exitCode!==null||child.signalCode)return;try{child.stdin.end();}catch{}await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);child.off('close',finish);resolve();};const timer=setTimeout(finish,3000);child.once('close',finish);});if(child.exitCode===null&&!child.signalCode)await stopProcess(child);})();return this.closing;
  }
}
