// Standalone Node entry. Does not import Electron, create windows, take the GUI
// instance lock, or read/write the GUI workspace.json.
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,appendFile,stat,writeFile,readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {ModelServiceStore} from './services/model-service-store.mjs';
import {ModelServiceServer} from './services/model-service-server.mjs';
import {serviceError} from './services/model-service-system.mjs';
import {SourceComponents} from './services/source-components.mjs';
import {componentRequired,packagedSources} from './services/source-packages.mjs';
const errorLogLimit=64*1024;
async function recordStartupError(store,identity,error){
 const row={kind:'bridgepp-model-service',id:store.definition.id,...identity,status:'error',error,at:new Date().toISOString()};
 await mkdir(store.root,{recursive:true});
 // Write independently: a failed status replacement must not suppress the log.
 const results=await Promise.allSettled([store.write('status.json',row),(async()=>{
  const file=join(store.root,'service-error.log'),line=JSON.stringify(row)+'\n',size=await stat(file).then(info=>info.size,error=>{if(error.code==='ENOENT')return 0;throw error;});
  if(size+Buffer.byteLength(line)>errorLogLimit)await writeFile(file,line,{mode:0o600});else await appendFile(file,line,{mode:0o600});
 })()]);
 if(results.some(result=>result.status==='rejected'))process.stderr.write('模型服务启动诊断未能完整写入\n');
}
export async function runModelService({id,userData,node={command:process.execPath,args:[],env:process.versions.electron?{ELECTRON_RUN_AS_NODE:'1'}:{}},storeOptions,serverOptions,components,isPackaged=packagedSources()}={}){
 const store=new ModelServiceStore(userData,id,storeOptions);let server;const instanceId=randomUUID();
 try{
  await store.open();const manager=components??(!serverOptions?.providers?new SourceComponents({userData,node,isPackaged}):null);
  if(manager)try{await manager.environment(id);}catch{
   const lock=await store.read('instance.lock');if(Number.isSafeInteger(lock?.pid)&&lock.pid>0){let live=true;try{process.kill(lock.pid,0);}catch(error){live=error.code!=='ESRCH';}if(live)return {duplicate:true};}
   const error=componentRequired(id);await store.write('catalog.json',{status:'needs-component',models:[],error:error.message});await recordStartupError(store,{pid:process.pid,instanceId},serviceError(error));
   // A missing optional component is a setup state, not a crashing service.
   // Exit normally so the scheduler does not keep restarting an unusable process.
   return {needsComponent:true};
  }
  const installation={version:JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version,...serverOptions?.installation};server=await ModelServiceServer.open(store,node,{...serverOptions,installation,components:manager});const result=await server.run();
  if(result.running){for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void server.shutdown();});}else await server.providers.close?.();return {server,...result};
 }catch(error){
  const diagnostic=serviceError(error,store.key);
  if(server)await server.shutdown().catch(()=>{});
  await recordStartupError(store,{pid:process.pid,instanceId:server?.instanceId??instanceId},diagnostic).catch(()=>{process.stderr.write('模型服务启动诊断无法写入服务目录\n');});
  throw Object.assign(new Error(diagnostic.message),{code:diagnostic.code});
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),value=flag=>args[args.indexOf(flag)+1];
 try{if(!args.includes('--id')||!args.includes('--user-data'))throw new Error('服务参数缺失');await runModelService({id:value('--id'),userData:resolve(value('--user-data')),serverOptions:{installation:{entry:fileURLToPath(import.meta.url),command:process.execPath,args:process.argv.slice(1)}}});}catch(error){process.stderr.write('模型服务启动失败：'+serviceError(error).message+'\n');process.exitCode=1;}
}
