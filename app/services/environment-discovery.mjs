import {readFile} from 'node:fs/promises';
import {join,dirname,resolve,delimiter} from 'node:path';
import {discoverRuntimes,nativeNode} from './runtime-paths.mjs';
import {dshUninstallRegistry,executableVersion,environmentProcess} from './environment-process.mjs';
import {publicPage,versionText,yaml,DSH_FEED} from './environment-utils.mjs';
import {openExternalAsar,statExternalAsar} from '../core/external-asar.mjs';
const externalArchive={open:openExternalAsar,stat:statExternalAsar};
const safeJson=async path=>{try{return JSON.parse(await readFile(path,'utf8'));}catch{return null;}};
async function asarPackage(path,archive){let file;try{file=await archive.open(path);const header=Buffer.alloc(16);await file.read(header,0,16,0);const size=header.readUInt32LE(12),offset=8+header.readUInt32LE(4);if(size>16*1024*1024)return null;const bytes=Buffer.alloc(size);await file.read(bytes,0,size,16);const tree=JSON.parse(bytes.toString()),item=tree.files?.['package.json'];if(!item||item.size>256*1024||!Number.isInteger(Number(item.offset)))return null;const content=Buffer.alloc(item.size);await file.read(content,0,item.size,offset+Number(item.offset));return JSON.parse(content.toString());}catch{return null;}finally{await file?.close();}}
export async function packageMetadata(runtime,{archive=externalArchive}={}){
  if(runtime.id==='kimi'&&runtime.executable&&/\.[cm]?js$/i.test(runtime.executable))return safeJson(join(dirname(runtime.executable),'../package.json'));
  const dir=runtime.desktop?dirname(runtime.desktop):runtime.executable?dirname(runtime.executable):null;if(!dir)return null;
  const packed=runtime.id==='dsh'?await asarPackage(join(dir,'resources/app.asar'),archive):null;
  const installed=packed??await safeJson(join(dir,'resources/app/package.json'))??await safeJson(join(dir,'package.json'))??(runtime.id==='dsh'?null:await asarPackage(join(dir,'resources/app.asar'),archive));if(installed)return installed;
  if(runtime.id==='codex')for(const path of String(process.env.PATH??'').split(delimiter).filter(Boolean))try{const pkg=await safeJson(join(path,'node_modules/@openai/codex/package.json'));if(pkg?.name==='@openai/codex')return pkg;}catch{}return null;
}
export async function inspectEnvironments(preferences,{userData,node=nativeNode(),discover=discoverRuntimes,registryRows=[],fileVersion=executableVersion,execute=environmentProcess,archive=externalArchive,env=process.env,isPackaged=false}={}){
  const rows=Array.isArray(registryRows)?registryRows:[];
  const verifyManagedKimi=async(path,version)=>{let result;try{result=await execute(node.command,[...node.args,path,'--version'],{timeoutMs:20000,env:node.env});}catch(error){if(error.code==='ETIMEDOUT')return {ok:true,warning:'托管 Kimi 校验超时，本次未能核实'};return {ok:false,warning:'托管 Kimi 校验未通过，已改用内置版本：'+(error.message??'进程启动失败')};}if(result.code!==0)return {ok:false,warning:`托管 Kimi 校验未通过，已改用内置版本：进程退出码 ${result.code}`};const actual=versionText(result.stdout);return actual===version?{ok:true,warning:null}:{ok:false,warning:`托管 Kimi 校验未通过，已改用内置版本：版本不一致（期望 ${version}，实际 ${actual??'未知'}）`};};
  let runtimes;try{runtimes=await discover(preferences,{userData,dshRegistry:rows,verifyManagedKimi,env,isPackaged});}catch{runtimes=['dsh','kimi','codex','antigravity'].map(id=>({id,name:{dsh:'DeepSeek Harness',kimi:'Kimi Code',codex:'Codex',antigravity:'Antigravity'}[id],installed:false,status:'error',reason:'环境路径检测失败，请在设置 → 开发环境重新检测',executable:null,warning:null}));}
  return Promise.all(runtimes.map(async r=>{
    if(r.status==='missing'||r.status==='error'||!r.installed)return {...r,status:r.status??'missing',version:null,page:null,feed:r.id==='dsh'?{url:DSH_FEED,channel:'nightly'}:null};
    try{
      const pkg=await packageMetadata(r,{archive});let version=r.version??pkg?.version??null,page=publicPage(pkg?.homepage),feed=null;
      if(r.id==='dsh'){
        const registered=rows.find(row=>typeof row.location==='string'&&resolve(row.location.replace(/^"|"$/g,''))===resolve(dirname(r.executable)));
        version=(typeof pkg?.version==='string'&&pkg.version?pkg.version:null)??versionText(await fileVersion(r.executable).catch(()=>null))??r.version??registered?.version??null;
        page??=publicPage(registered?.page);
        try{const config=yaml(await readFile(join(dirname(r.executable),'resources/app-update.yml'),'utf8'));feed=typeof config?.url==='string'?{url:config.url,channel:config.channel??'nightly'}:{error:'安装包的 app-update.yml 未提供可用更新源'};}catch(error){feed=error.code==='ENOENT'?{url:DSH_FEED,channel:'nightly'}:{error:'安装包的 app-update.yml 无法解析'};}
        try{if(!(await archive.stat(join(dirname(r.executable),'resources/app.asar'))).isFile())throw Object.assign(new Error('archive is not a file'),{code:'ENOENT'});}catch(error){return {...r,status:error.code==='ENOENT'?'needs-setup':'error',reason:error.code==='ENOENT'?'DSH 安装不完整，缺少 resources/app.asar；请重新安装或配置完整安装目录中的程序':'DSH 归档文件无法读取，请检查权限后重新检测',version,page,feed};}
      }
      if(r.id==='codex'){let native=null;try{const result=await execute(r.executable,['--version'],{timeoutMs:8000});if(result.code===0)native=versionText(result.stdout);}catch{}version=native??versionText(await fileVersion(r.executable).catch(()=>null));}
      if(r.id==='antigravity'){if(r.executable)try{const result=await execute(r.executable,['--version'],{timeoutMs:8000});if(result.code===0)version=versionText(result.stdout)??version;}catch{}version??=versionText(await fileVersion(r.executable??r.desktop).catch(()=>null));/* Publisher URL observed in the installed agy 1.4.12 binary. */page??=r.executable?'https://antigravity.google.com':null;if(!r.executable)return {...r,status:'needs-setup',reason:'仅找到 Antigravity 桌面版，工作台需要 agy CLI；请在设置 → 开发环境配置 CLI',version,page,feed};}
      return {...r,status:'ready',reason:r.reason??null,kind:r.kind??'system',version,page,feed};
    }catch{return {...r,status:'error',reason:'环境版本或安装信息检测失败，请在设置 → 开发环境重新检测',version:null,page:null,feed:null};}
  }));
}
