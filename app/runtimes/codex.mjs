import {launch,RpcProcess} from '../core/process.mjs';
import {RuntimeLifecycle} from '../core/lifecycle.mjs';
import {randomUUID} from 'node:crypto';
import {codexPermissionSettings} from '../services/runtime-permissions.mjs';
import {recordCodexRuntime,readCodexBaseInstructions,writeCodexModelCatalog,markCodexCatalogUnsupported,codexCatalogUnsupported,codexVersionNumber,codexWorkspaceRoot} from '../services/codex-config.mjs';
import {CodexExecAdapter} from './codex-exec.mjs';
import {runtimeReason,failureText,failureValue} from '../services/failure-details.mjs';

export function codexLaunchSettings({endpoint,variant,model,session,permissionMode=session?.permissionMode,runtime,catalogPath}){
  const selection=session.selection,args=[],env={};
  const config=endpoint?{model_provider:'agentworkbench',model:variant.id,'model_providers.agentworkbench.name':'Bridge++','model_providers.agentworkbench.base_url':endpoint.baseURL,'model_providers.agentworkbench.env_key':'AWB_GATEWAY_KEY','model_providers.agentworkbench.wire_api':'responses','model_providers.agentworkbench.requires_openai_auth':false,'model_providers.agentworkbench.supports_websockets':false,model_context_window:selection.contextBudget??selection.contextTokens??model.defaultContextTokens??model.contextMaximum}:{model:selection.nativeModel};
  if(selection.reasoning)config.model_reasoning_effort=selection.reasoning;
  if(permissionMode!=null){const p=codexPermissionSettings(permissionMode);config.approval_policy=p.approvalPolicy;config.sandbox_mode=p.sandbox;if(runtime?.permissions?.observed?.autoReview)config.approvals_reviewer=p.approvalsReviewer;}
  for(const [key,value]of Object.entries(config))if(value!==null&&value!==undefined&&value!=='')args.push('-c',`${key}=${JSON.stringify(value)}`);
  if(endpoint&&catalogPath)args.push('-c',`model_catalog_json=${JSON.stringify(catalogPath)}`);
  if(endpoint)env.AWB_GATEWAY_KEY=endpoint.key;
  return {args,env};
}

export function codexUserInputQuestions(params={}){
  const questions=Array.isArray(params.questions)?params.questions:[];
  return questions.map(question=>{
    const options=Array.isArray(question.options)?question.options.map(option=>({label:option?.label,...option?.description?{description:option.description}:{}})).filter(option=>typeof option.label==='string'):undefined;
    // A question without options is free text: it must accept a typed answer.
    return {id:question.id,question:question.question,...question.header?{header:question.header}:{},...(options?.length?{options}:{}),allowCustom:question.isOther===true||!options?.length,...question.isSecret?{secret:true}:{}};
  });
}
export function codexUserInputResult(params,choice,answer={}){
  const questions=Array.isArray(params?.questions)?params.questions:[],items=Array.isArray(answer?.items)?answer.items:[],answers={};
  if(choice!=='approve'&&choice!=='approve-session')return {answers};
  // The raw-JSON dialog sends the native answers object itself, without items: pass it through.
  if(!items.length&&answer&&typeof answer==='object'&&!Array.isArray(answer)){
    const native=answer.answers;
    if(native&&typeof native==='object'&&!Array.isArray(native))return {answers:native};
    if(native===undefined)return {answers:answer};
  }
  for(const [index,question] of questions.entries()){
    const labels=(question.options??[]).map(option=>option?.label).filter(label=>typeof label==='string');
    const item=items.find(row=>(row.id??row.question)===(question.id??question.question))??items[index];
    const selected=Array.isArray(item?.selected)?item.selected.filter(label=>labels.includes(label)):[],custom=typeof item?.custom==='string'&&item.custom!==''?[item.custom]:[];
    answers[question.id??question.question??String(index)]={answers:[...selected,...custom]};
  }
  return {answers};
}
export function codexApprovalResult(message,choice,answer){
  const approved=choice==='approve'||choice==='approve-session';
  if(['item/tool/requestUserInput','tool/requestUserInput'].includes(message.method))return codexUserInputResult(message.params,choice,answer);
  if(message.method==='item/permissions/requestApproval')return {permissions:approved?structuredClone(message.params?.permissions??{}):{},scope:choice==='approve-session'?'session':'turn'};
  if(['item/commandExecution/requestApproval','item/fileChange/requestApproval'].includes(message.method))return {decision:choice==='approve-session'?'acceptForSession':approved?'accept':'decline'};
  throw new Error('此审批类型需在原生 Codex 界面处理');
}
export function codexPermissionResultMatches(mode,result,{autoReview=false}={}){
  if(mode==null)return true;
  const p=codexPermissionSettings(mode),type=p.sandbox==='read-only'?'readOnly':'workspaceWrite';
  return result.approvalPolicy===p.approvalPolicy&&result.sandbox?.type===type&&(!autoReview||result.approvalsReviewer===p.approvalsReviewer);
}

export function codexEvent(message){
  const p=message.params??{},method=message.method;
  if(method==='item/agentMessage/delta')return {type:'text',text:p.delta,itemId:p.itemId};
  if(method==='item/reasoning/textDelta'||method==='item/reasoning/summaryTextDelta')return {type:'thinking',text:p.delta,itemId:p.itemId};
  if(method==='item/commandExecution/outputDelta')return {type:'tool-output',text:p.delta,toolId:p.itemId};
  if(method==='item/started'||method==='item/completed'){const item=p.item??{};if(['commandExecution','fileChange','mcpToolCall','dynamicToolCall','webSearch','collabAgentToolCall','imageGeneration'].includes(item.type))return {type:method.endsWith('started')?'tool-start':'tool-end',toolId:item.id,name:item.type,data:item};}
  if(method==='thread/tokenUsage/updated')return {type:'usage',data:p.tokenUsage};
  if(method==='turn/completed')return {type:'turn-end',status:p.turn?.status==='completed'?'completed':p.turn?.status==='interrupted'?'interrupted':'failed',data:failureValue(p.turn),...p.turn?.status==='completed'?{}:{reason:runtimeReason(p.turn?.error,'Codex 原生回合未成功结束：'+failureText(p.turn?.status??'状态未知'))}};
  if(method==='error')return {type:'error',text:failureText(p.error?.message??p.message??'Codex error'),data:failureValue(p)};
  if(method==='turn/diff/updated')return {type:'diff',text:p.diff??''};
  if(method==='turn/plan/updated')return {type:'plan',data:p};
  return {type:'native-event',name:method,data:p};
}
export class CodexAppServerAdapter extends RuntimeLifecycle {
  constructor(options){super(options);this.requests=new Map();}
  async start(){
    this.checkOpen();if(!this.endpoint)throw new Error('app-server 仅用于网关 Codex 会话');
    const catalog=await this.catalogFile().catch(()=>null);
    try{await this.open(catalog);}
    catch(error){
      if(!catalog)throw error;
      const text=String(error?.message??'');
      // Only a catalog rejection may blacklist the version; an unrelated startup
      // failure must surface unchanged instead of being retried without the file.
      if(!/model_catalog|catalog/i.test(text))throw error;
      const root=codexWorkspaceRoot(this.dir),version=this.runtime?.permissions?.observed?.version;
      await markCodexCatalogUnsupported(root,version).catch(()=>{});
      await this.rpc?.close().catch(()=>{});this.rpc=null;
      await this.emit({type:'notice',source:'codex-apply-patch',text:`Codex ${codexVersionNumber(version)??'当前版本'} 拒绝了模型目录（原生 apply_patch 声明），已自动退回不带目录的启动；不会再为这个版本尝试。`}).catch(()=>{});
      await this.open(null);
    }
  }
  async catalogFile(){
    if(!this.endpoint||!this.dir)return null;
    const version=this.runtime?.permissions?.observed?.version??null;
    recordCodexRuntime(this.session?.id,version);
    const root=codexWorkspaceRoot(this.dir);
    if(!root||await codexCatalogUnsupported(root,version))return null;
    const base=await readCodexBaseInstructions(root,version);
    if(!base)return null;
    return writeCodexModelCatalog(this.dir,{slug:this.variant?.id,displayName:this.variant?.name,baseInstructions:base});
  }
  async open(catalogPath){
    this.catalogPath=catalogPath??null;
    const settings=codexLaunchSettings(this);const child=(this.launchProcess??launch)(this.runtime.executable,['app-server','--listen','stdio://',...settings.args],{cwd:this.project.path,env:settings.env});this.rpc=new RpcProcess(child,{timeoutMs:180000,maxEventBytes:16*1024*1024});this.rpc.on('message',m=>{void this.enqueue(()=>this.closed?undefined:this.message(m));});this.rpc.on('closed',e=>{void this.enqueue(async()=>{if(!this.closed&&this.running){this.running=false;await this.emit({type:'error',text:e.message});await this.emit({type:'turn-end',status:'failed'});}});});this.rpc.on('log',()=>{});
    this.checkOpen();await this.rpc.request('initialize',{clientInfo:{name:'agent_workbench',title:'Bridge++',version:'0.1.15'},capabilities:{experimentalApi:false}});this.checkOpen();this.rpc.notify('initialized');
    const permissions=codexPermissionSettings(this.permissionMode);if(!this.runtime.permissions?.observed?.autoReview)delete permissions.approvalsReviewer;
    const threadSettings={cwd:this.project.path,...permissions,...(this.endpoint?{model:this.variant.id,modelProvider:'agentworkbench'}:this.session.selection.nativeModel?{model:this.session.selection.nativeModel}:{})};
    const result=await this.rpc.request(this.session.nativeId?'thread/resume':'thread/start',this.session.nativeId?{...threadSettings,threadId:this.session.nativeId}:threadSettings);this.threadId=result.thread.id;await this.saveNative(this.threadId);
    if(!codexPermissionResultMatches(this.permissionMode,result,{autoReview:!!this.runtime.permissions?.observed?.autoReview}))throw new Error('原生 Codex 未应用所选授权/沙箱设置，已停止，未发送任务。');
    this.checkOpen();this.ready=true;
  }
  async message(message){
    const image=message.params?.item;
    if(message.method==='item/completed'&&image?.type==='imageGeneration'){
      if(image.result)await this.emit({type:'media-output',data:image.result,mime:'image/png',origin:{runtimeId:'codex',itemId:image.id,tool:'imageGeneration'}});
      else if(image.savedPath)await this.emit({type:'media-output',path:image.savedPath,origin:{runtimeId:'codex',itemId:image.id,tool:'imageGeneration'}});
      else if(image.fileId)await this.emit({type:'notice',text:'Codex 返回了图片存储标识，但未提供本地文件或内联数据，暂无法显示。'});
    }
    if(message.id!==undefined&&message.method){
      if(['item/commandExecution/requestApproval','item/fileChange/requestApproval','item/permissions/requestApproval'].includes(message.method)){
        if(this.permissionMode==='readonly'){this.rpc.respond(message.id,codexApprovalResult(message,'reject'));await this.emit({type:'error',source:'native-permission',code:'permission_denied',text:'只读模式已拒绝原生 Codex 写入/权限升级请求；本轮不自动续作。'});return;}
        const approvalId=`codex:${randomUUID()}`;this.requests.set(approvalId,message);await this.emit({type:'approval',approvalId,name:message.method,data:message.params,choices:['approve','approve-session','reject']});return;
      }
      if(['item/tool/requestUserInput','tool/requestUserInput'].includes(message.method)){const approvalId=`codex:${randomUUID()}`;this.requests.set(approvalId,message);await this.emit({type:'question',approvalId,name:'ask_user_question',data:{...message.params,questions:codexUserInputQuestions(message.params)}});return;}
      this.rpc.reject(message.id,'Open the native Codex CLI to use this client interaction');await this.emit({type:'notice',text:`原生交互 ${message.method} 请使用原生窗口。`});return;
    }
    if(message.method==='turn/started')this.turnId=message.params?.turn?.id??this.turnId;
    const event=codexEvent(message);if(event.type==='turn-end'){this.running=false;this.turnId=null;this.requests.clear();}await this.emit(event);
  }
  async prompt(text,attachments=[]){await this.ensureStarted();this.checkOpen();const input=[...(text?[{type:'text',text,text_elements:[]}]:[]),...attachments.map(a=>{if(a.kind!=='image'&&a.kind!=='audio')throw new Error('Codex 未核实支持此附件');return {type:a.kind==='image'?'localImage':'localAudio',path:a.path};})];this.running=true;this.turnId=null;try{const result=await this.rpc.request('turn/start',{threadId:this.threadId,input,...(this.session.selection.reasoning?{effort:this.session.selection.reasoning}:{})});if(this.running)this.turnId=result.turn?.id;}catch(e){this.running=false;throw e;}}
  async steer(text,attachments=[],id=randomUUID()){
    this.checkOpen();if(!this.running||!this.turnId)throw new Error('Codex 原生轮次尚未开始或已经结束');
    const input=[...(text?[{type:'text',text,text_elements:[]}]:[]),...attachments.map(a=>{if(a.kind!=='image'&&a.kind!=='audio')throw new Error('Codex 未核实支持此附件');return {type:a.kind==='image'?'localImage':'localAudio',path:a.path};})];
    try{await this.rpc.request('turn/steer',{threadId:this.threadId,expectedTurnId:this.turnId,input,clientUserMessageId:id});}
    catch(error){if(!error.rpcRejected)error.nativeAdmissionUnknown=true;throw error;}return {delivered:true};
  }
  async approve(id,choice,answer){this.checkOpen();const message=this.requests.get(id);if(!message)throw new Error('Approval is no longer pending');const result=codexApprovalResult(message,choice,answer);this.rpc.respond(message.id,result);this.requests.delete(id);}
  async cancel(){if(this.turnId)await this.rpc.request('turn/interrupt',{threadId:this.threadId,turnId:this.turnId});}
  async close(){this.closed=true;this.running=false;this.ready=false;this.requests.clear();await this.rpc?.close();}
}
export class CodexAdapter extends CodexAppServerAdapter {
  constructor(options){if(options.session?.selection?.modelKey==='native')return new CodexExecAdapter(options);super(options);}
}
