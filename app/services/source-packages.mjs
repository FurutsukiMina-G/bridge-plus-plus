import {readFile,stat,readdir} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
export const SOURCE_DEFINITIONS=Object.freeze([
 Object.freeze({id:'qoder',name:'Qoder CN',package:'@qodercn-ai/qodercn-agent-sdk',version:'1.0.50',entry:'dist/index.js',page:'https://qoder.cn/',signIn:'需要 Qoder CN 账号。安装官方客户端或 CLI 并登录后，再回到这里重新检测。'}),
 Object.freeze({id:'workbuddy',name:'WorkBuddy',package:'@tencent-ai/agent-sdk',version:'0.3.286',entry:'lib/index.js',page:'https://www.workbuddy.cn/',signIn:'需要 WorkBuddy 账号。安装官方桌面端并登录后，再回到这里重新检测。'})
]);
export const SOURCE_ROOT=resolve(import.meta.dirname,'../..');
export function sourceDefinition(id){const row=SOURCE_DEFINITIONS.find(row=>row.id===id);if(!row)throw new Error('未知模型源组件');return row;}
export const packagedSources=(root=SOURCE_ROOT,env=process.env)=>env.AWB_PACKAGED==='1'||/(?:^|[\\/])resources[\\/]app(?:\.asar)?$/i.test(root);
export function componentRequired(id){return Object.assign(new Error(`请先在设置 › 模型源下载 ${sourceDefinition(id).name} 组件`),{code:'SOURCE_COMPONENT_REQUIRED'});}
export function sourceInstallDirectory(userData,id){const row=sourceDefinition(id);return resolve(userData,'sources',row.id,row.version);}
async function file(path){const info=await stat(path);if(!info.isFile()||!info.size)throw new Error('组件文件不完整');}
function inside(root,path){const rel=relative(root,resolve(root,path));if(!rel||isAbsolute(rel)||rel.split(/[\\/]/).includes('..'))throw new Error('组件运行时清单含无效路径');return resolve(root,path);}
export async function inspectSourcePackage(directory,id,{platform=process.platform,arch=process.arch}={}){
 const row=sourceDefinition(id),pkg=JSON.parse(await readFile(join(directory,'package.json'),'utf8'));
 if(pkg.name!==row.package||pkg.version!==row.version)throw new Error(`${row.name} 组件版本校验失败，需要 ${row.version}`);
 const entry=join(directory,row.entry);await file(entry);
 if(id==='qoder'){
  const worker=join(directory,'dist/_worker'),info=JSON.parse(await readFile(join(worker,'runtime-info.json'),'utf8'));
  if(info.version!=='1.1.64'||pkg.qoderCliVersion!=='1.1.64'||info.profile!=='platform'||info.target!==`${platform}-${arch}`||info.build?.site!=='cn'||info.build?.productName!=='qoderclicn')throw new Error('Qoder 官方 Worker 身份或平台校验失败');
  if(!['qoder-worker-runtime.obf.mjs','qoder-worker-runtime.mjs'].includes(info.entrypoint))throw new Error('Qoder 官方 Worker 入口缺失');await file(join(worker,info.entrypoint));
  if(!info.assets?.packages?.length||!info.assets?.ripgrep?.length||info.assets.nodeModulesRoot!==true)throw new Error('Qoder 官方 Worker 资源清单不完整');
  for(const asset of info.assets.packages){const meta=JSON.parse(await readFile(inside(worker,asset.path),'utf8'));if(meta.name!==asset.name||meta.version!==asset.version)throw new Error('Qoder 官方 Worker 依赖不完整');}
  for(const asset of info.assets.ripgrep)await file(inside(worker,asset));
  for(const name of ['builtin','proto','vendor','node_modules'])if(!(await readdir(join(worker,name))).length)throw new Error('Qoder 官方 Worker 目录不完整');
 }
 return {directory:resolve(directory),entry,version:pkg.version};
}
export async function locateSourcePackage(id,{userData,root=SOURCE_ROOT,isPackaged=packagedSources(root),packageDir,platform,arch}={}){
 const row=sourceDefinition(id);
 if(packageDir)return inspectSourcePackage(packageDir,id,{platform,arch});
 if(userData){const dir=sourceInstallDirectory(userData,id);try{
  const receipt=JSON.parse(await readFile(join(dir,'bridgepp-source.json'),'utf8'));if(receipt.verified!==true||receipt.package!==row.package||receipt.version!==row.version)throw new Error('组件安装尚未校验完成');
  return await inspectSourcePackage(join(dir,'node_modules',row.package),id,{platform,arch});
 }catch(error){if(error.code!=='ENOENT')throw error;}}
 if(!isPackaged)try{return await inspectSourcePackage(join(root,'node_modules',row.package),id,{platform,arch});}catch(error){if(error.code!=='ENOENT')throw error;}
 return null;
}
