import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {launch,RpcProcess} from '../core/process.mjs';
const quote=value=>JSON.stringify(value);
export function kimiEvent(message){
  const {type,payload:p={}}=message;
  if(type==='ContentPart'){if(p.type==='text')return {type:'text',text:p.text??''};if(['think','thinking'].includes(p.type))return {type:'thinking',text:p.think??p.text??p.thinking??''};}
  if(type==='ToolCall')return {type:'tool-start',toolId:p.id,name:p.function?.name??p.name,data:p};
  if(type==='ToolCallPart')return {type:'tool-output',toolId:p.id,text:p.function?.arguments??p.arguments??'',data:p};
  if(type==='ToolResult')return {type:'tool-end',toolId:p.tool_call_id,name:'result',data:p};
  if(type==='StatusUpdate')return {type:'usage',data:p};
  if(type==='TurnEnd')return {type:'turn-end',status:'completed'};
  if(type==='StepInterrupted')return {type:'notice',text:'Kimi 当前步骤已中断',data:p};
  if(type==='SubagentEvent')return {type:'subagent',data:p};
  return {type:'native-event',name:type,data:p};
}
export function kimiConfig({model,variant,endpoint,selection}){
  const thinking=model.reasoning.length?['thinking']:[];
  return `default_model = "workbench"\n\n[providers.workbench]\ntype = "openai_legacy"\nbase_url = ${quote(endpoint.baseURL)}\napi_key = ${quote(endpoint.key)}\n\n[models.workbench]\nprovider = "workbench"\nmodel = ${quote(variant.id)}\nmax_context_size = ${selection.contextBudget??selection.contextTokens??model.contextMaximum??32768}\ncapabilities = ${JSON.stringify(thinking)}\n`;
}
export class KimiAdapter {
  constructor(options){Object.assign(this,options);this.requests=new Map();}
  async start(){const args=['--wire','--work-dir',this.project.path];if(this.endpoint){await mkdir(this.dir,{recursive:true});const path=join(this.dir,'kimi.toml');await writeFile(path,kimiConfig(this),{mode:0o600});args.push('--config-file',path,'--model','workbench');}else if(this.session.selection.nativeModel)args.push('--model',this.session.selection.nativeModel);
    if(this.session.nativeId)args.push('--session',this.session.nativeId);else{await this.saveNative(this.session.id);args.push('--session',this.session.id);}
    this.rpc=new RpcProcess(launch(this.runtime.executable,args,{cwd:this.project.path}),{jsonrpc:true});this.rpc.on('message',m=>void this.message(m));this.rpc.on('closed',e=>{if(this.running){this.running=false;this.emit({type:'error',text:e.message});this.emit({type:'turn-end',status:'failed'});}});
    const handshake=await this.rpc.request('initialize',{protocol_version:'1.10',client:{name:'AgentWorkbench',version:'0.1.0'},capabilities:{supports_question:true,supports_plan_mode:true}});await this.emit({type:'notice',text:`Kimi Wire ${handshake.protocol_version} 已连接，原生工具保持启用。`});
  }
  async message(message){if(message.method==='event'){const event=kimiEvent(message.params);if(event.type==='turn-end')this.running=false;await this.emit(event);return;}
    if(message.method==='request'&&message.id!==undefined){const {type,payload}=message.params??{},id=`kimi:${message.id}`;if(type==='ApprovalRequest'){this.requests.set(id,{message,payload});await this.emit({type:'approval',approvalId:id,name:payload.sender,data:payload,choices:['approve','reject']});}else if(type==='QuestionRequest'){this.requests.set(id,{message,payload});await this.emit({type:'question',approvalId:id,data:payload});}else{this.rpc.reject(message.id,'Unsupported client operation; use native Kimi UI');await this.emit({type:'notice',text:'此原生交互需要在 Kimi 原生窗口中完成。'});}}
  }
  async prompt(text){if(!this.rpc)await this.start();this.running=true;void this.rpc.request('prompt',{user_input:text},0).then(async result=>{if(this.running){this.running=false;await this.emit({type:'turn-end',status:result?.status==='interrupted'?'interrupted':'completed'});}},async e=>{this.running=false;await this.emit({type:'error',text:e.message});await this.emit({type:'turn-end',status:'failed'});});}
  async approve(id,choice,answer){const entry=this.requests.get(id);if(!entry)throw new Error('Approval is no longer pending');const {message,payload}=entry;this.rpc.respond(message.id,message.params.type==='QuestionRequest'?{request_id:payload.id,answers:answer??{}}:{request_id:payload.id,response:choice==='approve'?'approve':'reject'});this.requests.delete(id);}
  async cancel(){await this.rpc?.request('cancel',{});}
  async close(){this.running=false;await this.rpc?.close();}
}
