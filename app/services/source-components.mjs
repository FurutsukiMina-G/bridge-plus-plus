import {EventEmitter} from 'node:events';
import {mkdir,readFile,writeFile,rename,access} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {findNpmCli,installPackageNpm} from './environment-npm.mjs';
import {environmentProcess} from './environment-process.mjs';
import {environmentStderr} from './environment-diagnostics.mjs';
import {NPM_REGISTRIES,removeManaged} from './environment-utils.mjs';
import {nativeNode} from './runtime-paths.mjs';
import {SOURCE_DEFINITIONS,SOURCE_ROOT,sourceDefinition,sourceInstallDirectory,inspectSourcePackage,locateSourcePackage,componentRequired,packagedSources} from './source-packages.mjs';
const terminal=new Set(['done','failed','cancelled']);
export function sourceComponentMethods(manager,openExternal){return {
 'source:install':({id})=>manager().install(id),
 'source:cancel':({id})=>manager().cancel(id),
 'source:openPage':async({id})=>{await openExternal(manager().page(id));return true;}
};}
export class SourceComponents extends EventEmitter {
 constructor({userData,node=nativeNode(),root=SOURCE_ROOT,isPackaged=packagedSources(root),fetchImpl,execute=environmentProcess,installer=installPackageNpm,npmFinder=findNpmCli,now=Date.now,onInstalled=async()=>{}}={}){super();Object.assign(this,{userData,node,root,isPackaged,fetchImpl,execute,installer,npmFinder,now,onInstalled});this.states=new Map();this.jobs=new Map();this.closed=false;}
 async resolve(id){sourceDefinition(id);return locateSourcePackage(id,{userData:this.userData,root:this.root,isPackaged:this.isPackaged});}
 async scan(){for(const row of SOURCE_DEFINITIONS){if(this.jobs.has(row.id)&&!terminal.has(this.jobs.get(row.id).state))continue;try{const info=await this.resolve(row.id);this.states.set(row.id,{status:info?'ready':'missing',installedVersion:info?.version??null,error:null});}catch(error){this.states.set(row.id,{status:'error',installedVersion:null,error:environmentStderr(error.message)});}}return this.snapshot();}
 async init(){await this.scan();return this;}
 publicJob(job){return {action:'install',state:job.state,received:job.received,total:job.total,message:job.message};}
 snapshot(){return SOURCE_DEFINITIONS.map(({entry,...row})=>({...row,...this.states.get(row.id)??{status:'missing',installedVersion:null,error:null},job:this.jobs.has(row.id)?this.publicJob(this.jobs.get(row.id)):null}));}
 emitJob(job,state,message,received=job.received,total=job.total){if(this.closed)return;const changed=job.reportedState!==state,now=this.now();Object.assign(job,{state,message,received,total});if(changed||job.lastProgressAt===undefined||now-job.lastProgressAt>=250){job.lastProgressAt=now;this.emit('event',{type:'source-job',id:job.id,...this.publicJob(job)});}if(changed){job.reportedState=state;this.emit('change');}}
 async environment(id){const info=await this.resolve(id);if(!info)throw componentRequired(id);return {AWB_SOURCE_PACKAGE_DIR:info.directory,AWB_PACKAGED:this.isPackaged?'1':'0'};}
 async install(id){sourceDefinition(id);if(this.closed)throw new Error('模型源组件管理器已关闭');const old=this.jobs.get(id);if(old&&!terminal.has(old.state))throw new Error('这个模型源组件已有安装任务，请等待或取消');
  const job={id,state:'downloading',received:0,total:null,message:'正在准备下载模型源组件',controller:new AbortController(),cancelable:true};this.jobs.set(id,job);this.states.set(id,{...this.states.get(id),status:'installing',error:null});this.emitJob(job,job.state,job.message);
  job.promise=Promise.resolve().then(()=>this.installOne(job)).then(async info=>{this.states.set(id,{status:'ready',installedVersion:info.version,error:null});this.emitJob(job,'done','模型源组件已安装并验证');if(!this.closed)await Promise.resolve().then(()=>this.onInstalled(id)).catch(()=>{});return true;}).catch(error=>{const cancelled=job.controller.signal.aborted,message=cancelled?'已取消':environmentStderr(error.message)||'模型源组件安装失败';this.states.set(id,{status:cancelled?'missing':'error',installedVersion:null,error:cancelled?null:message});this.emitJob(job,cancelled?'cancelled':'failed',message);throw error;}).finally(()=>{job.cancelable=false;});job.promise.catch(()=>{});return {id,...this.publicJob(job)};
 }
 async verify(directory,id,signal){const row=sourceDefinition(id),info=await inspectSourcePackage(join(directory,'node_modules',row.package),id);const script=`await import(${JSON.stringify(pathToFileURL(info.entry).href)});process.stdout.write('bridgepp-source-import-ok');`;
  const result=await this.execute(this.node.command,[...this.node.args,'--input-type=module','-e',script],{cwd:directory,signal,timeoutMs:20000,env:{...this.node.env,AWB_SOURCE_PACKAGE_DIR:info.directory}});if(result.code!==0||!result.stdout?.includes('bridgepp-source-import-ok'))throw new Error(`${row.name} 组件入口加载失败：${environmentStderr(result.stderr)||'子进程未返回验证结果'}`);return info;
 }
 async installOne(job){
  const row=sourceDefinition(job.id),signal=job.controller.signal,root=resolve(this.userData,'sources',row.id),final=sourceInstallDirectory(this.userData,row.id);await mkdir(root,{recursive:true});
  try{const receipt=JSON.parse(await readFile(join(final,'bridgepp-source.json'),'utf8'));if(receipt.verified&&receipt.package===row.package&&receipt.version===row.version){const info=await this.verify(final,row.id,signal);signal.throwIfAborted();return info;}}catch(error){if(signal.aborted)throw error;}
  const npm=await this.npmFinder({root:this.root,node:this.node.command});if(!npm)throw new Error('未找到捆绑 npm 运行时，请更新 Bridge++ 安装包');let lastError;
  for(const registry of NPM_REGISTRIES){signal.throwIfAborted();const staging=join(root,'.'+row.version+'-'+randomUUID()),backup=join(root,'.replaced-'+randomUUID());await mkdir(staging);let displaced=false,activated=false;
   try{
    this.emitJob(job,'downloading',`正在从 ${new URL(registry).host} 下载 ${row.name} 组件及官方运行时`,0,null);
    const result=await this.installer({directory:staging,package:row.package,version:row.version,registry,node:this.node,npm,fetchImpl:this.fetchImpl,execute:this.execute,signal,scripts:true,qoderRuntime:row.id==='qoder',lock:resolve(this.root,row.lock),onProgress:(received,total)=>this.emitJob(job,'downloading',`正在下载 ${row.name} 组件及官方运行时`,received,total)});
    if(result.code!==0)throw new Error(`npm 退出码 ${result.code}：${environmentStderr(result.stderr||result.stdout)}`);
    this.emitJob(job,'verifying',`正在验证 ${row.name} 版本、完整性和入口加载`);await this.verify(staging,row.id,signal);signal.throwIfAborted();
    await writeFile(join(staging,'bridgepp-source.json'),JSON.stringify({verified:true,package:row.package,version:row.version}),{mode:0o600});signal.throwIfAborted();job.cancelable=false;this.emitJob(job,'installing','校验通过，正在启用组件');
    try{await access(final);await rename(final,backup);displaced=true;}catch(error){if(error.code!=='ENOENT')throw error;}
    await rename(staging,final);activated=true;return {version:row.version,directory:join(final,'node_modules',row.package)};
   }catch(error){if(displaced&&!activated)await rename(backup,final);job.cancelable=true;if(signal.aborted)throw error;lastError=error;}
   finally{await removeManaged(root,staging).catch(()=>{});if(activated&&displaced)await removeManaged(root,backup).catch(()=>{});}
  }
  throw new Error(`${row.name} 组件安装失败${row.id==='qoder'?'（包含官方 Worker 安装脚本的下载与校验）':''}；镜像和 npm 仓库均未成功：${environmentStderr(lastError?.stderr||lastError?.message).slice(-1000)}`);
 }
 async cancel(id){sourceDefinition(id);const job=this.jobs.get(id);if(!job||terminal.has(job.state))return false;if(!job.cancelable){await job.promise.catch(()=>{});return false;}job.controller.abort();await job.promise.catch(()=>{});return true;}
 page(id){return sourceDefinition(id).page;}
 async close(){this.closed=true;for(const job of this.jobs.values())if(!terminal.has(job.state)&&job.cancelable)job.controller.abort();await Promise.allSettled([...this.jobs.values()].map(job=>job.promise));}
}
