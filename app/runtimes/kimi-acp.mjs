import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {launch,RpcProcess} from '../core/process.mjs';
import {nativeNode} from '../services/runtime-paths.mjs';
import {parse,stringify} from 'smol-toml';
import {existsSync} from 'node:fs';
import {RuntimeLifecycle} from '../core/lifecycle.mjs';
import {randomUUID} from 'node:crypto';
import {KIMI_PERMISSION_IDS} from '../services/runtime-permissions.mjs';
import {runtimeReason,failureText,failureValue} from '../services/failure-details.mjs';
export function mergeKimiConfig(base,overlay,originalHome){const result={...base,...overlay,providers:{...base.providers,...overlay.providers},models:{...base.models,...overlay.models},thinking:{...base.thinking,...overlay.thinking}};if(base.default_permission_mode)result.default_permission_mode=base.default_permission_mode;for(const [field,folder]of [['extra_skill_dirs','skills'],['extra_agent_dirs','agents']]){const path=join(originalHome,folder);result[field]=[...new Set([...(base[field]??[]),...(existsSync(path)?[path]:[])])];}return result;}
export function kimiAcpConfig({model,variant,endpoint,session}){
  const q=JSON.stringify,selection=session.selection;
  return `default_model = "workbench"\ndefault_permission_mode = "manual"\nauto_session_title = false\n\n[providers.workbench]\ntype = "openai"\nbase_url = ${q(endpoint.baseURL)}\napi_key_env = "AWB_GATEWAY_KEY"\n\n[models.workbench]\nprovider = "workbench"\nmodel = ${q(variant.id)}\ndisplay_name = ${q(model.name)}\nmax_context_size = ${selection.contextBudget??selection.contextTokens??model.defaultContextTokens??model.contextMaximum??32768}\nmax_output_size = ${model.maxOutputTokens??32000}\ncapabilities = ${q(['tool_use',...(model.images===true?['image_in']:[]),...(model.reasoning.some(e=>e!=='none')?['thinking']:[])])}\nsupport_efforts = ${q(model.reasoning.filter(e=>e!=='none'))}\n${selection.reasoning&&selection.reasoning!=='none'?`default_effort = ${q(selection.reasoning)}\n`:''}\n[thinking]\nenabled = ${(selection.reasoning??model.defaultReasoning)!=='none'&&model.reasoning.some(e=>e!=='none')}\n${selection.reasoning&&selection.reasoning!=='none'?`effort = ${q(selection.reasoning)}\n`:''}`;
}
export function kimiAcpEvent(update){
  switch(update.sessionUpdate){
    case 'agent_message_chunk':return ['image','audio'].includes(update.content?.type)?{type:'media-output',mime:update.content.mimeType,data:update.content.data,origin:{runtimeId:'kimi'}}:{type:'text',text:update.content?.text??''};
    case 'agent_thought_chunk':return {type:'thinking',text:update.content?.text??''};
    case 'tool_call':return {type:'tool-start',toolId:update.toolCallId,name:update.title??update.kind,data:update};
    case 'tool_call_update':return {type:['completed','failed'].includes(update.status)?'tool-end':'tool-output',toolId:update.toolCallId,name:update.title,data:update};
    case 'plan':return {type:'plan',data:update};
    default:return {type:'native-event',name:update.sessionUpdate,data:update};
  }
}
export function kimiPermissionChoices(options=[]){const kinds={allow_once:'approve',allow_always:'approve-session',reject_once:'reject',reject_always:'reject-session'};return options.map(o=>kinds[o.kind]).filter(Boolean);}
export function kimiStopStatus(reason){return ['cancelled','max_tokens','max_turn_requests'].includes(reason)?'interrupted':reason==='end_turn'?'completed':'failed';}
export function kimiStopReason(result={}){
 if(result.stopReason==='end_turn'&&!result.error)return undefined;
 if(result.stopReason==='cancelled')return {kind:'cancelled',message:'Kimi 原生任务已取消。'};
 return runtimeReason(result.error??`Kimi 本轮结束原因：${failureText(result.stopReason)||'未提供 stopReason'}。`);
}
export class KimiAcpAdapter extends RuntimeLifecycle {
  constructor(options){super(options);this.requests=new Map();this.nativeTurn=0;}
  async start(){
    const env={};if(this.endpoint){const home=join(this.dir,'kimi-home');await mkdir(home,{recursive:true});const original=process.env.KIMI_CODE_HOME??join(homedir(),'.kimi-code');let base={};try{base=parse(await readFile(join(original,'config.toml'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw new Error('原生 Kimi 配置不可读取，请先在原生程序中修复。');}await writeFile(join(home,'config.toml'),stringify(mergeKimiConfig(base,parse(kimiAcpConfig(this)),original)),{mode:0o600});env.KIMI_CODE_HOME=home;env.AWB_GATEWAY_KEY=this.endpoint.key;
      // Preserve the user's explicit MCP configuration in the private home when present.
      for(const file of ['mcp.json'])try{await writeFile(join(home,file),await readFile(join(original,file)),{mode:0o600});}catch(e){if(e.code!=='ENOENT')throw e;}
    }
    this.checkOpen();let command=this.runtime.executable,args=['acp'];if(/\.[cm]?js$/i.test(command)){const node=nativeNode();args=[...node.args,command,...args];command=node.command;Object.assign(env,node.env);}
    this.rpc=new RpcProcess((this.launchProcess??launch)(command,args,{cwd:this.project.path,env}),{jsonrpc:true,timeoutMs:180000,maxEventBytes:72*1024*1024});this.rpc.on('message',m=>{void this.enqueue(()=>this.closed?undefined:this.message(m));});this.rpc.on('closed',e=>{void this.enqueue(async()=>{if(!this.closed&&this.running){this.running=false;await this.emit({type:'error',text:e.message});await this.emit({type:'turn-end',status:'failed'});}});});
    const result=await this.rpc.request('initialize',{protocolVersion:1,clientInfo:{name:'agent-workbench',title:'Bridge++',version:'0.1.13'},clientCapabilities:{}});
    this.promptCapabilities=result.agentCapabilities?.promptCapabilities??{};
    this.checkOpen();await this.emit({type:'notice',text:`${result.agentInfo?.name??'Kimi Code'} ${result.agentInfo?.version??''} · ACP 已连接。`});
    const created=await this.rpc.request(this.session.nativeId?'session/resume':'session/new',{cwd:this.project.path,mcpServers:[],...(this.session.nativeId?{sessionId:this.session.nativeId}:{})});this.nativeId=created.sessionId??this.session.nativeId;await this.saveNative(this.nativeId);
    if(this.permissionMode!=null){
      const modeId=KIMI_PERMISSION_IDS[this.permissionMode];
      if(!modeId||!created.modes?.availableModes?.some(m=>m.id===modeId))throw new Error('当前 Kimi 原生会话未返回所选授权模式，已停止，未发送任务。');
      await this.rpc.request('session/set_mode',{sessionId:this.nativeId,modeId});
    }
    this.checkOpen();if(!this.endpoint&&this.session.selection.nativeModel)await this.rpc.request('session/set_config_option',{sessionId:this.nativeId,configId:'model',value:this.session.selection.nativeModel});this.checkOpen();this.ready=true;
  }
  async message(m){if(m.method==='session/update'){if(!this.loading)await this.emit(kimiAcpEvent(m.params.update));return;}
    // JSON-RPC IDs restart with the native process; persisted approval IDs cannot.
    if(m.id!==undefined&&m.method==='session/request_permission'){
      if(this.permissionMode==='readonly'){const reject=m.params?.options?.find(o=>o.kind==='reject_once');this.rpc.respond(m.id,{outcome:reject?{outcome:'selected',optionId:reject.optionId}:{outcome:'cancelled'}});await this.emit({type:'error',source:'native-permission',code:'permission_denied',text:'只读规划模式已拒绝 Kimi 原生工具执行请求；本轮不自动续作。'});return;}
      const id=`kimi:${randomUUID()}`;this.requests.set(id,m);await this.emit({type:'approval',approvalId:id,name:m.params?.toolCall?.title??'Kimi 工具操作',data:m.params,choices:kimiPermissionChoices(m.params.options)});return;
    }
    if(m.id!==undefined&&m.method){this.rpc.reject(m.id,'Use the native Kimi interface for this operation');await this.emit({type:'notice',text:`原生交互 ${m.method} 可在完整工具界面中处理。`});}
  }
  async prompt(text,attachments=[]){await this.ensureStarted();this.checkOpen();const prompt=[...(text?[{type:'text',text}]:[]),...await Promise.all(attachments.map(async a=>{if(!['image','audio'].includes(a.kind)||this.promptCapabilities?.[a.kind]!==true)throw new Error('Kimi ACP 握手未声明此附件能力');return {type:a.kind,mimeType:a.mime,data:(await readFile(a.path)).toString('base64')};}))];this.running=true;const nativeTurn=++this.nativeTurn;void this.rpc.request('session/prompt',{sessionId:this.nativeId,prompt},0).then(result=>this.enqueue(async()=>{if(this.closed||nativeTurn!==this.nativeTurn)return;this.running=false;this.requests.clear();const reason=kimiStopReason(result);if(['max_tokens','max_turn_requests','refusal'].includes(result.stopReason))await this.emit({type:'notice',text:reason.message});await this.emit({type:'turn-end',status:result.error?'failed':kimiStopStatus(result.stopReason),retainAdapter:['max_tokens','max_turn_requests'].includes(result.stopReason),data:failureValue(result),...reason?{reason}:{},nativeTurn});}),e=>this.enqueue(async()=>{if(this.closed||!this.running||nativeTurn!==this.nativeTurn)return;this.running=false;const reason=runtimeReason(e);await this.emit({type:'error',text:reason.message});await this.emit({type:'turn-end',status:'failed',reason,nativeTurn});}));}
  async approve(id,choice){const m=this.requests.get(id);if(!m)throw new Error('授权已过期');const kinds={approve:'allow_once','approve-session':'allow_always',reject:'reject_once','reject-session':'reject_always'},chosen=(m.params.options??[]).find(o=>o.kind===kinds[choice]);if(!chosen)throw new Error('此操作未提供所选授权范围，请在 Kimi 原生窗口中处理');this.rpc.respond(m.id,{outcome:{outcome:'selected',optionId:chosen.optionId}});this.requests.delete(id);}
  async cancel(){this.rpc?.notify('session/cancel',{sessionId:this.nativeId});}
  async close(){this.closed=true;this.running=false;this.ready=false;this.requests.clear();await this.rpc?.close();}
}
