import {mkdir,readFile,writeFile,rename,open,rm,truncate,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {isThinkingTicker,foldThinkingTicker} from '../services/session-events.mjs';

const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
// Persisted update bookkeeping is descriptive only: malformed or outdated rows
// fall back to "nothing known" instead of failing the whole workspace.
function updateState(value){
  const source=object(value)?value:{},version=value=>typeof value==='string'&&/^\d+\.\d+\.\d+$/.test(value)?value:null;
  const latest=object(source.latest)&&version(source.latest.version)?{
    version:version(source.latest.version),
    tag:typeof source.latest.tag==='string'?source.latest.tag:'v'+source.latest.version,
    name:typeof source.latest.name==='string'?source.latest.name:null,
    publishedAt:typeof source.latest.publishedAt==='string'?source.latest.publishedAt:null,
    url:typeof source.latest.url==='string'?source.latest.url:null,
    notes:typeof source.latest.notes==='string'?source.latest.notes:null,
    asset:object(source.latest.asset)&&typeof source.latest.asset.url==='string'?{
      name:typeof source.latest.asset.name==='string'?source.latest.asset.name:null,
      size:Number.isSafeInteger(source.latest.asset.size)&&source.latest.asset.size>0?source.latest.asset.size:null,
      url:source.latest.asset.url,
      digest:/^sha256:[a-f0-9]{64}$/i.test(source.latest.asset.digest??'')?String(source.latest.asset.digest).toLowerCase():null
    }:null
  }:null;
  const downloaded=object(source.downloaded)&&version(source.downloaded.version)&&typeof source.downloaded.file==='string'&&source.downloaded.file?{
    version:version(source.downloaded.version),file:source.downloaded.file,
    sha256:/^[a-f0-9]{64}$/.test(source.downloaded.sha256??'')?source.downloaded.sha256:null
  }:null;
  return {lastCheckDay:typeof source.lastCheckDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(source.lastCheckDay)?source.lastCheckDay:null,checkedAt:typeof source.checkedAt==='string'?source.checkedAt:null,latest,downloaded};
}
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id);
function workspaceState(text){
  const value=JSON.parse(text.replace(/^\uFEFF/,''));
  if(value.version!==1||!Array.isArray(value.projects)||!Array.isArray(value.sessions)||value.sessions.some(s=>!validId(s?.id)))throw new Error('Unsupported workspace state');
  return value;
}
export class Store extends EventEmitter {
  constructor(root,{streamFlushMs=1000,streamFlushBytes=4096}={}){
    super();this.root=root;this.file=join(root,'workspace.json');this.backupFile=join(root,'workspace.backup.json');this.persisted=null;this.recovery=null;this.queue=Promise.resolve();this.handles=new Map();this.closed=false;
    this.contexts=new Map();this.state={version:1,projects:[],sessions:[],catalog:{},preferences:{modelDefaults:{},runtimes:{},theme:'dark',autoDownloadUpdates:false},updates:{lastCheckDay:null,checkedAt:null,latest:null,downloaded:null}};
    this.streamBuffers=new Map();this.streamFlushMs=streamFlushMs;this.streamFlushBytes=streamFlushBytes;this.thinkingTotals=new Map();
  }
  async open(){
    await mkdir(join(this.root,'sessions'),{recursive:true});
    let raw=null,value=null,failure=null;
    try{raw=await readFile(this.file,'utf8');value=workspaceState(raw);}catch(error){failure=error;}
    const journals=(await readdir(join(this.root,'sessions'))).filter(name=>name.endsWith('.jsonl'));
    const emptyIndex=value?.sessions.length===0,emptyWithHistory=emptyIndex&&journals.length>0;
    if(failure||emptyIndex){
      let backupRaw=null,backup=null,backupError=null;
      try{backupRaw=await readFile(this.backupFile,'utf8');backup=workspaceState(backupRaw);}catch(error){backupError=error;}
      if(backup&&(failure?(!journals.length||backup.sessions.length>0):backup.sessions.length>0)){
        if(raw!==null)await writeFile(join(this.root,'workspace.displaced-'+randomUUID()+'.json'),raw,{flag:'wx',mode:0o600});
        value=backup;raw=backupRaw;this.recovery={source:'backup',reason:emptyIndex?'empty_index_with_backup':failure?.code==='ENOENT'?'missing_index':'invalid_index'};
      }else if(emptyWithHistory||failure&&(journals.length||failure.code!=='ENOENT'||backupError?.code!=='ENOENT')){
        const detail=emptyWithHistory?`会话索引为空，但原始会话日志仍存在；未覆盖数据。索引路径：${this.file}。`:failure?.code==='ENOENT'?`会话索引缺失：${this.file}；原始会话日志或备份仍需保留。`:`会话索引 ${this.file} 已损坏或无法解析，原文件保留在该路径，未覆盖数据。`;
        throw new Error(detail+`请从备份 ${this.backupFile} 恢复索引；操作前请先复制现有文件。`);
      }
    }
    if(value){this.state=value;this.persisted=raw;}
    this.state.catalog=object(this.state.catalog)?this.state.catalog:{};
    this.state.preferences=object(this.state.preferences)?this.state.preferences:{};
    this.state.preferences.modelDefaults=object(this.state.preferences.modelDefaults)?this.state.preferences.modelDefaults:{};
    this.state.preferences.runtimes=object(this.state.preferences.runtimes)?this.state.preferences.runtimes:{};
    this.state.preferences.autoDownloadUpdates=this.state.preferences.autoDownloadUpdates===true;
    this.state.updates=updateState(this.state.updates);
    for(const session of this.state.sessions)if(['running','waiting','starting','stopping'].includes(session.status))session.status='interrupted';
    for(const catalog of Object.values(this.state.catalog))if(catalog?.status==='loading'){catalog.status='error';catalog.error='上次目录查询已中断，请刷新。';}
    await this.save();return this;
  }
  enqueue(task){if(this.closed)return Promise.reject(new Error('Workspace store closed'));const next=this.queue.then(task);this.queue=next.catch(()=>{});return next;}
  snapshot(){return structuredClone(this.state);}
  save(){
    const content=JSON.stringify(this.state,null,2);
    return this.enqueue(async()=>{
      const next=workspaceState(content);
      if(this.persisted!==null){
        if(!next.sessions.length&&workspaceState(this.persisted).sessions.length)throw new Error('Refusing to replace a populated session index with an empty workspace');
      }
      // Both files hold the latest validated metadata, including a just-created
      // native session ID. Never roll back that ID to a prior null value.
      await this.writeSnapshot(this.backupFile,content);
      await this.writeSnapshot(this.file,content);this.persisted=content;
    });
  }
  async writeSnapshot(file,content){
    const temp=file+'.'+randomUUID()+'.tmp';
    try{
      await writeFile(temp,content,{flag:'wx',mode:0o600});
      for(let attempt=0;;attempt++)try{await rename(temp,file);break;}catch(error){
        if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=3)throw error;
        await new Promise(resolve=>setTimeout(resolve,25*2**attempt));
      }
    }finally{await rm(temp,{force:true}).catch(()=>{});}
  }
  async mutate(fn){const result=fn(this.state);await this.save();this.emit('change');return result;}
  project(id){const project=this.state.projects.find(p=>p.id===id);if(!project)throw new Error('Project not found');return project;}
  session(id){if(!validId(id))throw new Error('Session not found');const session=this.state.sessions.find(s=>s.id===id);if(!session)throw new Error('Session not found');return session;}
  async journal(id){
    const existing=this.handles.get(id);if(existing){this.handles.delete(id);this.handles.set(id,existing);return existing;}
    // Called only within the store queue: reads, recovery and appends cannot race.
    const file=join(this.root,'sessions',id+'.jsonl');let handle=await open(file,'a+',0o600);
    try{
      const bytes=await readFile(file);
      if(bytes.length&&bytes.at(-1)!==10){
        const last=bytes.lastIndexOf(10),tail=bytes.subarray(last+1);
        let valid=true;try{JSON.parse(tail.toString('utf8'));}catch{valid=false;}
        if(valid)await handle.write('\n');
        else{
          await writeFile(file+'.partial-'+randomUUID(),tail,{mode:0o600});
          await handle.close();await truncate(file,last+1);handle=await open(file,'a+',0o600);
        }
      }
      if(this.handles.size>=16){const [key,least]=this.handles.entries().next().value;await least.close();this.handles.delete(key);}
      this.handles.set(id,handle);return handle;
    }catch(error){await handle.close();throw error;}
  }
  async event(sessionId,event){
    this.session(sessionId);
    // Per-batch thinking counters are folded into one estimate instead of a row each.
    // Checked before the stream buffer so the drop never splits adjacent text chunks.
    if(isThinkingTicker(event)){
      const total=foldThinkingTicker(this.thinkingTotals.get(sessionId),event);
      this.thinkingTotals.set(sessionId,total);return null;
    }
    const value={...event,id:event.type==='media'&&validId(event.id)?event.id:randomUUID(),at:new Date().toISOString(),sessionId};
    if(value.type==='usage'&&object(value.data)&&value.data.thinking_token_estimate===undefined){
      const total=this.thinkingTotals.get(sessionId);
      if(total&&total.total>0)value.data={...value.data,thinking_token_estimate:total.total};
    }
    // The estimate belongs to the turn that produced it; the next turn starts from zero.
    if(value.type==='turn-end')this.thinkingTotals.delete(sessionId);
    await this.enqueue(async()=>{
      // Merge only plain text chunks; a native payload (data) keeps one record per event.
      const stream=(['thinking','text'].includes(value.type)||value.type==='tool-output'&&value.data===undefined)&&typeof value.text==='string',prior=this.streamBuffers.get(sessionId);
      const same=stream&&prior&&['type','attemptId','turnId','itemId','toolId'].every(key=>prior.value[key]===value[key]);
      if(prior&&!same)await this.flushStream(sessionId);
      if(!stream){await this.writeEvent(sessionId,value);return;}
      const current=this.streamBuffers.get(sessionId);
      if(current){current.parts.push(value.text);current.bytes+=Buffer.byteLength(value.text);}
      else{
        const timer=setTimeout(()=>{void this.enqueue(()=>this.flushStream(sessionId)).catch(error=>this.emit('event',{type:'error',source:'journal',sessionId,id:randomUUID(),at:new Date().toISOString(),text:'会话记录无法保存：'+error.message}));},this.streamFlushMs);timer.unref();
        this.streamBuffers.set(sessionId,{value,parts:[value.text],bytes:Buffer.byteLength(value.text),timer});
      }
      if(this.streamBuffers.get(sessionId).bytes>=this.streamFlushBytes)await this.flushStream(sessionId);
    });
    this.emit('event',value);return value;
  }
  async writeEvent(sessionId,value){
    const handle=await this.journal(sessionId);await handle.write(JSON.stringify(value)+'\n');const context=this.contexts.get(sessionId);if(context){if(value.type==='user')context.users.push(value.text);if(value.type==='plan')context.plan=value.data;}
  }
  async flushStream(sessionId){
    const buffer=this.streamBuffers.get(sessionId);if(!buffer)return;
    clearTimeout(buffer.timer);await this.writeEvent(sessionId,{...buffer.value,text:buffer.parts.join('')});this.streamBuffers.delete(sessionId);
  }
  flush(){return this.enqueue(async()=>{for(const id of this.streamBuffers.keys())await this.flushStream(id);});}
  events(id){
    this.session(id);
    return this.enqueue(async()=>{await this.flushStream(id);await this.journal(id);return (await readFile(join(this.root,'sessions',id+'.jsonl'),'utf8')).split('\n').filter(Boolean).map(line=>JSON.parse(line));});
  }
  taskContext(id){
    this.session(id);
    return this.enqueue(async()=>{
      await this.flushStream(id);
      if(!this.contexts.has(id)){
        await this.journal(id);const context={users:[],plan:null};
        const lines=createInterface({input:createReadStream(join(this.root,'sessions',id+'.jsonl'),{encoding:'utf8'}),crlfDelay:Infinity});
        for await(const line of lines)if(line){const event=JSON.parse(line);if(event.type==='user')context.users.push(event.text);if(event.type==='plan')context.plan=event.data;}
        this.contexts.set(id,context);
      }
      return structuredClone(this.contexts.get(id));
    });
  }
  async close(){if(this.closed)return;await this.flush();await this.queue;this.closed=true;await Promise.all([...this.handles.values()].map(async handle=>{try{await handle.sync();}finally{await handle.close();}}));this.handles.clear();}
}
