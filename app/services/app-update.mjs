import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,open,readdir,rename,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {withIdleResponse} from './download-stream.mjs';

const VERSION=/^(\d+)\.(\d+)\.(\d+)$/;
const SETUP=/^Bridge\+\+-Setup-(\d+\.\d+\.\d+)\.exe$/;
const DIGEST=/^sha256:([a-f0-9]{64})$/i;

function parts(value){const match=VERSION.exec(typeof value==='string'?value:'');return match?[Number(match[1]),Number(match[2]),Number(match[3])]:null;}

export function compareVersions(a,b){
  const left=parts(a),right=parts(b);
  if(!left||!right)return 0;
  for(let index=0;index<3;index++)if(left[index]!==right[index])return left[index]>right[index]?1:-1;
  return 0;
}

const pad=value=>String(value).padStart(2,'0');
export function localDay(date){return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;}

// Only GitHub-hosted installer links are followed; a look-alike host is treated
// as if the release carried no usable installer.
function githubUrl(value){
  if(typeof value!=='string')return false;
  let url;try{url=new URL(value);}catch{return false;}
  return url.protocol==='https:'&&!url.username&&!url.password&&(url.hostname==='github.com'||url.hostname.endsWith('.githubusercontent.com'));
}

const releaseUrl=repo=>`https://api.github.com/repos/${repo}/releases/latest`;

function sha256File(file){
  return new Promise((resolve,reject)=>{
    const hash=createHash('sha256'),stream=createReadStream(file);
    stream.on('error',reject);stream.on('data',chunk=>hash.update(chunk));
    stream.on('end',()=>resolve(hash.digest('hex')));
  });
}

const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const shortText=(error,length=160)=>{const text=String(error?.message??error??'').replace(/\s+/g,' ').trim();return (text||'下载失败，未提供具体原因').slice(0,length);};

export class AppUpdates extends EventEmitter {
  constructor({store,userData,currentVersion,fetch,spawn,now=()=>new Date(),repo='FurutsukiMina-G/bridge-plus-plus',isPackaged=false,sessionsRunning=()=>false,checkTimeoutMs=15000,idleTimeoutMs=60000}){
    super();
    Object.assign(this,{store,userData,currentVersion,fetch,spawn,now,repo,isPackaged,sessionsRunning,checkTimeoutMs,idleTimeoutMs});
    const saved=object(store.state.updates)?store.state.updates:{};
    this.checkedAt=saved.checkedAt??null;this.lastCheckDay=saved.lastCheckDay??null;
    this.latest=object(saved.latest)&&parts(saved.latest.version)?saved.latest:null;
    this.downloaded=object(saved.downloaded)&&parts(saved.downloaded.version)&&typeof saved.downloaded.file==='string'?saved.downloaded:null;
    this.status=this.latest?(compareVersions(this.latest.version,currentVersion)>0?'available':'latest'):'idle';
    this.error=null;this.pending=null;this.transfer=null;this.controller=null;this.cancelled=false;
    this.downloadState={status:'idle',version:null,received:0,total:0,error:null};
  }
  get updatesDir(){return join(this.userData,'updates');}
  date(){const value=this.now();return value instanceof Date?value:new Date(value);}
  async persist(){await this.store.mutate(s=>{s.updates={lastCheckDay:this.lastCheckDay,checkedAt:this.checkedAt,latest:this.latest,downloaded:this.downloaded};});}
  async init(){
    await mkdir(this.updatesDir,{recursive:true}).catch(()=>{});
    if(this.downloaded){
      const installed=compareVersions(this.downloaded.version,this.currentVersion)<=0;
      const size=installed?null:await stat(this.downloaded.file).then(info=>info.isFile()?info.size:null).catch(()=>null);
      if(installed||size===null)await this.forgetDownload();else this.downloadState={status:'downloaded',version:this.downloaded.version,received:size,total:size,error:null};
    }
    await this.cleanup(this.downloadState.status==='downloaded'?this.downloadState.version:null);
    return this.view();
  }
  async forgetDownload(){
    const record=this.downloaded;this.downloaded=null;
    this.downloadState={status:'idle',version:null,received:0,total:0,error:null};
    if(record?.file){await rm(record.file,{force:true}).catch(()=>{});await rm(record.file+'.part',{force:true}).catch(()=>{});}
    await this.persist().catch(()=>{});
  }
  async cleanup(keep){
    const names=await readdir(this.updatesDir).catch(()=>[]);
    for(const name of names){
      if(keep&&name===`Bridge++-Setup-${keep}.exe`)continue;
      if(SETUP.test(name)||name.endsWith('.part'))await rm(join(this.updatesDir,name),{force:true}).catch(()=>{});
    }
  }
  // Race the deadline as well as aborting fetch: injected adapters may ignore
  // AbortSignal, and a rejection left unobserved must not crash the process.
  raced(task,controller){
    const running=Promise.resolve().then(task);running.catch(()=>{});
    let abort;
    const cancelled=new Promise((_,reject)=>{abort=()=>reject(Object.assign(new Error('请求已超时'),{name:'AbortError'}));controller.signal.addEventListener('abort',abort,{once:true});});
    return Promise.race([running,cancelled]).finally(()=>controller.signal.removeEventListener('abort',abort));
  }
  check({manual=false}={}){
    if(this.pending)return this.pending;
    this.pending=this.runCheck().finally(()=>{this.pending=null;this.emit('change');});
    this.emit('change');
    return this.pending;
  }
  async runCheck(){
    // The caller awaits this check, so the deadline must keep the loop alive.
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.checkTimeoutMs);
    try{
      let response;
      try{
        response=await this.raced(()=>this.fetch(releaseUrl(this.repo),{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Bridge++/'+this.currentVersion},signal:controller.signal,redirect:'follow'}),controller);
      }catch(error){
        return this.fail(controller.signal.aborted||error?.name==='AbortError'?'无法连接 GitHub：超时':'无法连接 GitHub：网络不可用');
      }
      if(response?.status===404)return this.fail('GitHub 上还没有发布版本');
      if(!response?.ok)return this.fail('GitHub 返回 HTTP '+(response?.status??'未知'));
      let release;
      try{release=await this.raced(()=>response.json(),controller);}catch{return this.fail(controller.signal.aborted?'无法连接 GitHub：超时':'GitHub 返回了无法解析的数据');}
      return await this.acceptRelease(release);
    }finally{clearTimeout(timer);}
  }
  async fail(reason){
    this.status='error';this.error=reason;
    this.emit('change');
    return this.view();
  }
  async acceptRelease(release){
    if(!object(release))return this.fail('GitHub 返回了无法解析的数据');
    if(release.draft||release.prerelease){
      this.error=null;this.status=this.latest?(compareVersions(this.latest.version,this.currentVersion)>0?'available':'latest'):'idle';
      this.emit('change');return this.view();
    }
    const tag=String(release.tag_name??'').trim(),version=tag.replace(/^v/i,'');
    // A payload without a usable version does not count as a completed check.
    if(!parts(version))return this.fail('无法识别 GitHub 最新版本号');
    this.checkedAt=this.date().toISOString();this.lastCheckDay=localDay(this.date());
    const assets=Array.isArray(release.assets)?release.assets:[];
    const asset=assets.map(row=>{
      const match=SETUP.exec(String(row?.name??''));
      if(!match||match[1]!==version||!githubUrl(row.browser_download_url))return null;
      const digest=typeof row.digest==='string'&&DIGEST.test(row.digest)?row.digest.toLowerCase():null;
      return {name:row.name,size:Number.isSafeInteger(row.size)&&row.size>0?row.size:null,url:row.browser_download_url,digest};
    }).find(Boolean)??null;
    const notes=typeof release.body==='string'?release.body.slice(0,4000):null;
    this.latest={version,tag:tag||'v'+version,name:typeof release.name==='string'&&release.name?release.name:null,publishedAt:typeof release.published_at==='string'?release.published_at:null,url:typeof release.html_url==='string'?release.html_url:null,notes:notes||null,asset};
    this.error=null;this.status=compareVersions(version,this.currentVersion)>0?'available':'latest';
    await this.persist();this.emit('change');
    if(this.status==='available')this.maybeAutoDownload();
    return this.view();
  }
  maybeAutoDownload(){
    const asset=this.latest?.asset;
    if(this.store.state.preferences.autoDownloadUpdates!==true||!asset)return;
    if(this.downloadState.status==='downloading')return;
    if(this.downloadState.status==='downloaded'&&this.downloadState.version===this.latest.version)return;
    if(this.downloaded?.version===this.latest.version&&this.downloaded.file===this.fileFor(this.latest.version))return;
    void this.download();
  }
  async checkDaily(){
    if(!this.isPackaged)return this.view();
    if(this.lastCheckDay===localDay(this.date()))return this.view();
    try{return await this.check({manual:false});}catch{return this.view();}
  }
  fileFor(version){return join(this.updatesDir,`Bridge++-Setup-${version}.exe`);}
  download(){
    if(this.transfer)return this.transfer;
    const latest=this.latest,asset=latest?.asset;
    if(!asset||!latest)return Promise.resolve(this.view());
    if(this.downloadState.status==='downloaded'&&this.downloadState.version===latest.version)return Promise.resolve(this.view());
    this.transfer=this.runDownload(latest,asset).finally(()=>{this.transfer=null;});
    return this.transfer;
  }
  async runDownload(latest,asset){
    const file=this.fileFor(latest.version),part=file+'.part';
    const controller=new AbortController();this.controller=controller;this.cancelled=false;
    this.downloadState={status:'downloading',version:latest.version,received:0,total:asset.size??0,error:null};
    this.emit('change');
    const hash=createHash('sha256');let received=0,lastProgress=0;
    const state=this.downloadState;
    try{
      await mkdir(this.updatesDir,{recursive:true});
      await withIdleResponse(this.fetch,asset.url,{signal:controller.signal,idleTimeoutMs:this.idleTimeoutMs,headers:{'User-Agent':'Bridge++/'+this.currentVersion}},async(response,chunks)=>{
        const handle=await open(part,'w',0o600);
        try{
          for await(const chunk of chunks){
            hash.update(chunk);await handle.write(chunk);received+=chunk.byteLength;
            if(this.downloadState===state){state.received=received;if(!state.total)state.total=received;}
            const at=Date.now();
            if(at-lastProgress>=250){lastProgress=at;this.emit('progress',{version:latest.version,received,total:state.total});}
          }
        }finally{await handle.close();}
      });
      if(asset.size&&received!==asset.size)throw new Error(`下载文件大小不符：应为 ${asset.size} 字节，实际 ${received} 字节`);
      const digest=hash.digest('hex');
      if(asset.digest&&digest!==asset.digest.slice(7).toLowerCase())throw new Error('下载文件校验失败：SHA-256 不一致');
      await rm(file,{force:true});
      await rename(part,file);
      this.downloaded={version:latest.version,file,sha256:digest};
      this.downloadState={status:'downloaded',version:latest.version,received,total:received,error:null};
      this.emit('progress',{version:latest.version,received,total:received});
      await this.persist();
      await this.cleanup(latest.version);
      this.emit('change');
      return this.view();
    }catch(error){
      await rm(part,{force:true}).catch(()=>{});
      // cancel() already reset the state; never turn a cancellation into a failure.
      if(this.cancelled){this.emit('change');return this.view();}
      this.downloadState={status:'failed',version:latest.version,received,total:asset.size??received,error:shortText(error)};
      this.emit('change');
      return this.view();
    }finally{if(this.controller===controller)this.controller=null;}
  }
  async cancel(){
    this.cancelled=true;
    this.controller?.abort();
    this.downloadState={status:'idle',version:null,received:0,total:0,error:null};
    const version=this.latest?.version;
    if(version)await rm(this.fileFor(version)+'.part',{force:true}).catch(()=>{});
    this.emit('change');
    return this.view();
  }
  async install({force=false}={}){
    const record=this.downloaded;
    if(!record?.file)throw new Error('没有可安装的更新包，请先下载更新');
    const present=await stat(record.file).then(info=>info.isFile()).catch(()=>false);
    if(!present){await this.forgetDownload();throw new Error('更新安装包已不存在，请重新下载');}
    if(record.sha256){
      const actual=await sha256File(record.file).catch(()=>null);
      if(actual!==record.sha256){await this.forgetDownload();throw new Error('更新安装包校验失败，请重新下载');}
    }
    if(!force&&this.sessionsRunning())throw Object.assign(new Error('有任务正在运行，安装更新会关闭 Bridge++ 并中断这些任务'),{code:'sessions_running'});
    const child=this.spawn(record.file,[],{detached:true,stdio:'ignore',windowsHide:false});
    child?.unref?.();
    return this.view();
  }
  async setAutoDownload(enabled){
    const value=enabled===true;
    await this.store.mutate(s=>{s.preferences.autoDownloadUpdates=value;});
    this.emit('change');
    if(value)this.maybeAutoDownload();
    return this.view();
  }
  view(){
    const latest=this.latest;
    return {
      current:this.currentVersion,
      autoDownload:this.store.state.preferences.autoDownloadUpdates===true,
      checking:!!this.pending,
      checkedAt:this.checkedAt??null,
      status:this.status??'idle',
      error:this.error??null,
      latest:latest?{
        version:latest.version,tag:latest.tag??'v'+latest.version,name:latest.name??null,
        publishedAt:latest.publishedAt??null,url:latest.url??null,notes:latest.notes??null,
        asset:latest.asset?{name:latest.asset.name,size:latest.asset.size??null,url:latest.asset.url,digest:latest.asset.digest??null}:null
      }:null,
      download:{status:this.downloadState.status,version:this.downloadState.version??null,received:this.downloadState.received??0,total:this.downloadState.total??0,error:this.downloadState.error??null}
    };
  }
}
