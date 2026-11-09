import {nativeModels} from './native-models.mjs';
import {interjectCapability} from './session-input.mjs';
import {mediaCapabilities,deniedMediaCapabilities} from './media-capabilities.mjs';
import {readCodexDefaultModel} from './codex-config.mjs';

// One slot per runtime, retained during invalidation so even a refresh cannot
// start a second native process while the previous catalog read is in flight.
export class NativeMediaCatalog {
  constructor({read=nativeModels,now=Date.now,retryMs=60000}={}){Object.assign(this,{read,now,retryMs});this.entries=new Map();}
  invalidate(runtimeId){for(const [id,e]of this.entries)if(runtimeId===undefined||id===runtimeId){e.revision++;e.value=null;e.error=null;e.retryAt=0;}}
  async get(runtime,cwd,{refresh=false}={}){
    let e=this.entries.get(runtime.id);
    if(!e){e={executable:runtime.executable,revision:0,value:null,error:null,retryAt:0,flight:null};this.entries.set(runtime.id,e);}
    if(e.executable!==runtime.executable){this.invalidate(runtime.id);e.executable=runtime.executable;}
    if(refresh)this.invalidate(runtime.id);
    for(;;){
      if(e.executable!==runtime.executable)throw new Error('运行环境已变化，请刷新后重试');
      if(e.flight){try{await e.flight;}catch{}continue;}
      if(e.value)return e.value;
      if(e.error&&this.now()<e.retryAt)throw e.error;
      const revision=e.revision;
      const flight=Promise.resolve().then(()=>this.read(runtime,cwd)).then(models=>{if(!Array.isArray(models))throw new Error('原生模型目录无效');if(e.revision===revision){e.value=models;e.error=null;}}).catch(error=>{if(e.revision===revision){e.error=error;e.retryAt=this.now()+this.retryMs;}}).finally(()=>{if(e.flight===flight)e.flight=null;});
      e.flight=flight;
    }
  }
}

export class AttachmentCapabilities {
  constructor({runtimes,sessions,providers,cwd,catalog=new NativeMediaCatalog(),codexDefault=readCodexDefaultModel}){Object.assign(this,{runtimes,sessions,providers,cwd,catalog,codexDefault});}
  async forSelection(runtimeId,selection){
    const runtime=this.runtimes().find(r=>r.id===runtimeId);if(!runtime)throw new Error('未知运行环境');let validated,nativeModel;
    const busy=this.sessions().runtimeReady?.(runtimeId);if(busy||runtime.status&&runtime.status!=='ready')return deniedMediaCapabilities(busy??runtime.reason??'环境尚未就绪，请到设置 → 开发环境处理',runtimeId);
    try{validated=this.sessions().validate(runtimeId,selection);}catch(error){return deniedMediaCapabilities(error.message,runtimeId);}
    if(validated.modelKey==='native'&&runtimeId==='codex'){
      let modelId=validated.nativeModel;
      if(!modelId){
        const current=await this.codexDefault();modelId=current.modelId;
        if(!modelId)return deniedMediaCapabilities(`无法确定原生 Codex 当前使用的模型（${current.reason}），请在模型菜单里选定原生模型 ID 后再添加附件`,runtimeId);
      }
      try{nativeModel=(await this.catalog.get(runtime,this.cwd())).find(m=>m.id===modelId);}
      catch(error){return deniedMediaCapabilities('原生模型目录能力读取失败：'+error.message,runtimeId);}
    }
    return mediaCapabilities(runtime,validated,validated.modelKey==='native'?null:this.providers().get(validated.modelKey),nativeModel);
  }
  async snapshotSessions(sessions){return Promise.all(sessions.map(async s=>{
    let attachments=null;
    if(!s.archived)try{attachments=await this.forSelection(s.runtimeId,s.selection);}catch(error){attachments=deniedMediaCapabilities(error.message,s.runtimeId);}
    return {...s,queue:s.queue??[],interject:interjectCapability(s),attachments,mediaAttachments:s.mediaAttachments??[],permissionMode:s.permissionMode??null,permissions:this.sessions().permissionView?.(s)??null,selectionIssue:this.sessions().selectionIssue(s)};
  }));}
}
