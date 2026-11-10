import {access,readdir,readFile,stat,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,dirname,resolve,delimiter,relative,isAbsolute} from 'node:path';
import {homedir} from 'node:os';
import {locateSourcePackage} from './source-packages.mjs';
const home=homedir();
async function boundedIo(promise,timeout=1500){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('filesystem timeout')),timeout);})]);}finally{clearTimeout(timer);}}
async function first(paths){for(const path of paths.filter(Boolean))try{await boundedIo(access(path));return path;}catch{}return null;}
async function inPath(names){return first((process.env.PATH??'').split(delimiter).flatMap(p=>names.map(n=>join(p,n))));}
async function list(path){try{return await boundedIo(readdir(path,{withFileTypes:true}));}catch{return [];}}
export function compareRuntimeVersions(a,b){
  // SemVer precedence: build metadata is ignored; numeric prerelease IDs sort
  // before nonnumeric IDs, and text IDs use ASCII order (not locale collation).
  // Retain numeric tuple support for legacy Windows file versions such as x.y.z.0.
  const parse=v=>/^(\d+(?:\.\d+)*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(v),x=parse(a),y=parse(b);
  if(!x||!y)return a.localeCompare(b,undefined,{numeric:true});
  const order=(p,q)=>p<q?-1:p>q?1:0,p=x[1].split('.').map(BigInt),q=y[1].split('.').map(BigInt);
  for(let i=0;i<Math.max(p.length,q.length);i++){const n=order(p[i]??0n,q[i]??0n);if(n)return n;}
  if(!x[2]||!y[2])return x[2]?-1:y[2]?1:0;
  const left=x[2].split('.'),right=y[2].split('.');
  for(let i=0;i<Math.min(left.length,right.length);i++){const u=left[i],v=right[i],un=/^\d+$/.test(u),vn=/^\d+$/.test(v),n=un&&vn?order(BigInt(u),BigInt(v)):un!==vn?un?-1:1:order(u,v);if(n)return n;}
  return order(left.length,right.length);
}
export async function findQoderCli(options={}){
  const component=await locateSourcePackage('qoder',{packageDir:process.env.AWB_SOURCE_PACKAGE_DIR,...options}),sdk=component&&join(component.directory,'dist/_bundled');
  const candidates=[sdk&&join(sdk,'qoderclicn.exe'),join(home,'.qoder-cli/bin/qodercn.exe'),join(home,'.local/bin/qodercn.exe')];
  const versions=join(home,'.qoder-cli/versions');for(const entry of (await list(versions)).sort((a,b)=>compareRuntimeVersions(b.name,a.name)))candidates.push(join(versions,entry.name,'qoderclicn.exe'),join(versions,entry.name,'qodercn.exe'));
  return await first(candidates)??await inPath(['qodercn.exe','qoderclicn.exe']);
}
export async function findManagedCodex(roots=[join(process.env.LOCALAPPDATA??join(home,'AppData/Local'),'OpenAI/Codex/bin'),join(home,'AppData/Local/OpenAI/Codex/bin')]){
  const candidates=[];
  for(const root of [...new Set(roots)])for(const entry of await list(root))if(entry.isDirectory()){
    const directory=join(root,entry.name),executable=join(directory,'codex.exe');
    try{if((await stat(executable)).isFile())candidates.push({executable,installedAt:(await stat(directory)).mtimeMs});}catch{}
  }
  candidates.sort((a,b)=>b.installedAt-a.installedAt||a.executable.localeCompare(b.executable));return candidates[0]?.executable??null;
}
export async function findCodex(){
  const packages=[join(dirname(process.execPath),'node_modules/@openai/codex'),join(home,'scoop/apps/nvm/current/nodejs/nodejs/node_modules/@openai/codex'),join(process.env.APPDATA??'','npm/node_modules/@openai/codex')];
  const candidates=packages.map(p=>join(p,'node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe'));
  return await findManagedCodex()??await inPath(['codex.exe'])??await first(candidates);
}
export function shouldRefreshCodex(preferences,runtime,current){return !preferences.codex?.executable&&current!==runtime?.executable;}
export async function findManagedKimi(userData,{verify}={}){
  if(!userData)return null;const root=join(userData,'environments/kimi-code');const dirs=(await list(root)).filter(e=>e.isDirectory()&&/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(e.name)).sort((a,b)=>compareRuntimeVersions(b.name,a.name));
  for(const entry of dirs)try{
    const dir=join(root,entry.name),receiptPath=join(dir,'bridgepp-install.json'),receipt=JSON.parse(await readFile(receiptPath,'utf8')),executable=join(dir,'node_modules/@moonshot-ai/kimi-code/dist/main.mjs'),packagePath=join(dir,'node_modules/@moonshot-ai/kimi-code/package.json'),pkg=JSON.parse(await readFile(packagePath,'utf8'));
    if(receipt.verified!==true||receipt.version!==entry.name||pkg.version!==entry.name||pkg.name!=='@moonshot-ai/kimi-code')continue;
    const [mainInfo,packageInfo]=await Promise.all([stat(executable),stat(packagePath)]),verifiedFiles={main:{size:mainInfo.size,mtimeMs:mainInfo.mtimeMs},package:{size:packageInfo.size,mtimeMs:packageInfo.mtimeMs}},cached=receipt.verifiedFiles;
    if(verify&&JSON.stringify(cached)!==JSON.stringify(verifiedFiles)){
      const result=await verify(executable,entry.name),ok=result===true||result?.ok===true,warning=typeof result==='object'?result.warning??null:null;
      if(!ok)return {executable:null,version:null,warning:warning??'托管 Kimi 校验未通过，已改用内置版本'};
      if(!warning)await writeFile(receiptPath,JSON.stringify({...receipt,verifiedFiles}),{mode:0o600}).catch(()=>{});
      return {executable,version:entry.name,warning};
    }
    return {executable,version:entry.name,warning:null};
  }catch{}return null;
}
const claudePlatform=arch=>`@anthropic-ai/claude-code-win32-${arch==='arm64'?'arm64':'x64'}`;
export function claudeExecutable(directory,arch=process.arch){return join(directory,'node_modules',claudePlatform(arch),'claude.exe');}
async function claudePackage(executable,arch=process.arch){
  if(typeof executable!=='string'||!executable)return null;const platformDir=dirname(executable),wrapperPath=join(platformDir,'../claude-code/package.json'),platformPath=join(platformDir,'package.json');
  try{const [wrapper,platform,info]=await Promise.all([readFile(wrapperPath,'utf8').then(JSON.parse),readFile(platformPath,'utf8').then(JSON.parse),stat(executable)]),name=claudePlatform(arch);if(!info.isFile()||wrapper.name!=='@anthropic-ai/claude-code'||platform.name!==name||wrapper.version!==platform.version)return null;return {executable,version:wrapper.version,wrapperPath,platformPath};}catch{return null;}
}
export async function findManagedClaude(userData,{verify,arch=process.arch}={}){
  if(!userData)return null;const root=join(userData,'environments/claude-code'),dirs=(await list(root)).filter(e=>e.isDirectory()&&/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(e.name)).sort((a,b)=>compareRuntimeVersions(b.name,a.name));
  for(const entry of dirs)try{
    const dir=join(root,entry.name),receiptPath=join(dir,'bridgepp-install.json'),receipt=JSON.parse(await readFile(receiptPath,'utf8')),executable=claudeExecutable(dir,arch),found=await claudePackage(executable,arch);
    if(receipt.verified!==true||receipt.version!==entry.name||!found||found.version!==entry.name)continue;
    const [mainInfo,packageInfo,platformInfo]=await Promise.all([stat(executable),stat(found.wrapperPath),stat(found.platformPath)]),verifiedFiles={main:{size:mainInfo.size,mtimeMs:mainInfo.mtimeMs},package:{size:packageInfo.size,mtimeMs:packageInfo.mtimeMs},platform:{size:platformInfo.size,mtimeMs:platformInfo.mtimeMs}},cached=receipt.verifiedFiles;
    if(verify&&JSON.stringify(cached)!==JSON.stringify(verifiedFiles)){
      const result=await verify(executable,entry.name),ok=result===true||result?.ok===true,warning=typeof result==='object'?result.warning??null:null;
      if(!ok)return {executable:null,version:null,warning:warning??'托管 Claude Code 校验未通过，已停用此版本'};
      if(!warning)await writeFile(receiptPath,JSON.stringify({...receipt,verifiedFiles}),{mode:0o600}).catch(()=>{});
      return {executable,version:entry.name,warning};
    }
    return {executable,version:entry.name,warning:null};
  }catch{}return null;
}
export function hideQaRuntimes(runtimes,env=process.env,{isPackaged=false}={}){if(isPackaged)return runtimes;const hidden=new Set(String(env.AWB_HIDE_RUNTIMES??'').split(',').map(s=>s.trim()));return runtimes.map(r=>hidden.has(r.id)?{...r,executable:null,desktop:null,installed:false,status:'missing',reason:'源码测试模拟：此环境未安装'}:r);}
const descriptions=[
  {id:'dsh',name:'DeepSeek Harness',short:'DSH',protocol:'native-web',mode:'integrated',tools:'完整原生工具 / Skills / MCP / 子代理',description:'原生 Harness 会话与完整界面'},
  {id:'kimi',name:'Kimi Code',short:'Kimi',protocol:'acp',mode:'integrated',tools:'完整原生工具 / Skills / MCP / 子代理',description:'ACP 双向会话与原生审批'},
  {id:'codex',name:'Codex CLI',short:'Codex',protocol:'exec-json / app-server',mode:'integrated',tools:'完整原生工具 / Skills / MCP / 子代理',description:'原生 exec JSONL；第三方模型使用 app-server'},
  {id:'claude',name:'Claude Code',short:'CC',protocol:'stream-json',mode:'integrated',tools:'完整原生工具 / Skills / MCP / 子代理',description:'私有配置、非登录；使用 Qoder CN / WorkBuddy 模型'},
  {id:'antigravity',name:'Antigravity',short:'AG',protocol:'stream-json',mode:'native',tools:'完整原生工具 / Skills / MCP / 子代理',description:'独立 Gemini 模型源 · 原生 CLI / 桌面'}
];
export function runtimePlaceholders(){return descriptions.map(r=>({...r,executable:null,desktop:null,installed:false,status:'checking',reason:'正在检测运行环境，请稍候',kind:'system',version:null,warning:null}));}
export async function discoverRuntimes(preferences={},options={}){
  const programs=join(process.env.LOCALAPPDATA??join(home,'AppData/Local'),'Programs');
  const dsh=await first([preferences.dsh?.executable,...(options.dshRegistry??[]).filter(r=>typeof r.location==='string').map(r=>r.location&&join(r.location.replace(/^"|"$/g,''),'DeepSeek Harness.exe')),join(process.env.SystemDrive??'C:','DSH/DeepSeek Harness/DeepSeek Harness.exe'),join(programs,'DeepSeek Harness/DeepSeek Harness.exe')]);
  const codex=await first([preferences.codex?.executable])??await findCodex();
  const managed=await findManagedKimi(options.userData,{verify:options.verifyManagedKimi});
  const preferred=preferences.kimi?.executable,rel=options.userData&&typeof preferred==='string'?relative(join(options.userData,'environments/kimi-code'),preferred):null,managedPreference=rel!==null&&!isAbsolute(rel)&&!rel.split(/[\\/]/).includes('..');
  const kimi=await first([managedPreference?managed?.executable:preferred,managed?.executable,resolve(import.meta.dirname,'../../node_modules/@moonshot-ai/kimi-code/dist/main.mjs'),resolve(import.meta.dirname,'../../.runtime/kimi-code/node_modules/@moonshot-ai/kimi-code/dist/main.mjs'),join(home,'.local/bin/kimi.exe'),join(home,'.cargo/bin/kimi.exe')])??await inPath(['kimi.exe','kimi']);
  const managedClaude=await findManagedClaude(options.userData,{verify:options.verifyManagedClaude}),claudePreference=preferences.claude?.executable,claudeRel=options.userData&&typeof claudePreference==='string'?relative(join(options.userData,'environments/claude-code'),claudePreference):null,claudeManagedPreference=claudeRel!==null&&!isAbsolute(claudeRel)&&!claudeRel.split(/[\\/]/).includes('..'),customClaude=claudeManagedPreference?null:await claudePackage(claudePreference),claude=customClaude??(managedClaude?.executable?managedClaude:null);
  const agy=await first([preferences.antigravity?.executable,join(home,'.antigravity/antigravity.exe'),join(home,'.local/bin/agy.exe')])??await inPath(['agy.exe','antigravity.exe']);
  const agyDesktop=await first([preferences.antigravity?.desktop,join(programs,'antigravity/Antigravity.exe')]);
  const paths={dsh,kimi,codex,claude:claude?.executable??null,antigravity:agy};
  return hideQaRuntimes(descriptions.map(r=>{const executable=paths[r.id],desktop=r.id==='dsh'?dsh:r.id==='antigravity'?agyDesktop:null;return {...r,executable,desktop,installed:r.id==='antigravity'?!!(agy||agyDesktop):!!executable,mode:r.id==='antigravity'&&agy?'integrated':r.mode};}).map(r=>({...r,status:r.installed?'ready':'missing',reason:r.installed?null:'尚未安装，请到设置 → 开发环境安装或配置',kind:r.id==='claude'?'managed':r.id==='kimi'?(managed?.executable&&r.executable===managed.executable?'managed':r.executable?.includes('node_modules/@moonshot-ai')||r.executable?.includes('node_modules\\@moonshot-ai')?'bundled':'system'):'system',version:r.id==='claude'?claude?.version??null:r.id==='kimi'&&managed?.executable&&r.executable===managed.executable?managed.version:null,warning:r.id==='claude'?managedClaude?.warning??null:r.id==='kimi'?managed?.warning??null:null})),options.env??process.env,{isPackaged:options.isPackaged});
}
export function nativeNode(){
  if(process.versions.electron){const bundled=join(process.resourcesPath,'runtime/node.exe');if(existsSync(bundled))return {command:bundled,args:[],env:{}};const dev=resolve(import.meta.dirname,'../../assets/runtime/node.exe');if(existsSync(dev))return {command:dev,args:[],env:{}};return {command:process.execPath,args:[],env:{ELECTRON_RUN_AS_NODE:'1'}};}
  return {command:process.execPath,args:[],env:{}};
}
