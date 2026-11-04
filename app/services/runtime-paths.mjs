import {access,readdir,readFile,stat} from 'node:fs/promises';
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
export async function findManagedKimi(userData,{verify}={}){
  if(!userData)return null;const root=join(userData,'environments/kimi-code');const dirs=(await list(root)).filter(e=>e.isDirectory()&&/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(e.name)).sort((a,b)=>compareRuntimeVersions(b.name,a.name));
  for(const entry of dirs)try{const dir=join(root,entry.name),receipt=JSON.parse(await readFile(join(dir,'bridgepp-install.json'),'utf8')),executable=join(dir,'node_modules/@moonshot-ai/kimi-code/dist/main.mjs'),pkg=JSON.parse(await readFile(join(dir,'node_modules/@moonshot-ai/kimi-code/package.json'),'utf8'));if(receipt.verified!==true||receipt.version!==entry.name||pkg.version!==entry.name||pkg.name!=='@moonshot-ai/kimi-code')continue;await access(executable);if(verify&&!await verify(executable,entry.name))return null;return {executable,version:entry.name};}catch{}return null;
}
export function hideQaRuntimes(runtimes,env=process.env,{isPackaged=false}={}){if(isPackaged)return runtimes;const hidden=new Set(String(env.AWB_HIDE_RUNTIMES??'').split(',').map(s=>s.trim()));return runtimes.map(r=>hidden.has(r.id)?{...r,executable:null,desktop:null,installed:false,status:'missing',reason:'源码测试模拟：此环境未安装'}:r);}
export async function discoverRuntimes(preferences={},options={}){
  const programs=join(process.env.LOCALAPPDATA??join(home,'AppData/Local'),'Programs');
  const dsh=await first([preferences.dsh?.executable,...(options.dshRegistry??[]).filter(r=>typeof r.location==='string').map(r=>r.location&&join(r.location.replace(/^"|"$/g,''),'DeepSeek Harness.exe')),join(process.env.SystemDrive??'C:','DSH/DeepSeek Harness/DeepSeek Harness.exe'),join(programs,'DeepSeek Harness/DeepSeek Harness.exe')]);
  const codex=await first([preferences.codex?.executable])??await findCodex();
  const managed=await findManagedKimi(options.userData,{verify:options.verifyManagedKimi});
  const preferred=preferences.kimi?.executable,rel=options.userData&&typeof preferred==='string'?relative(join(options.userData,'environments/kimi-code'),preferred):null,managedPreference=rel!==null&&!isAbsolute(rel)&&!rel.split(/[\\/]/).includes('..');
  const kimi=await first([managedPreference?managed?.executable:preferred,managed?.executable,resolve(import.meta.dirname,'../../node_modules/@moonshot-ai/kimi-code/dist/main.mjs'),resolve(import.meta.dirname,'../../.runtime/kimi-code/node_modules/@moonshot-ai/kimi-code/dist/main.mjs'),join(home,'.local/bin/kimi.exe'),join(home,'.cargo/bin/kimi.exe')])??await inPath(['kimi.exe','kimi']);
  const agy=await first([preferences.antigravity?.executable,join(home,'.antigravity/antigravity.exe'),join(home,'.local/bin/agy.exe')])??await inPath(['agy.exe','antigravity.exe']);
  const agyDesktop=await first([preferences.antigravity?.desktop,join(programs,'antigravity/Antigravity.exe')]);
  return hideQaRuntimes([
    {id:'dsh',name:'DeepSeek Harness',short:'DSH',protocol:'native-web',executable:dsh,desktop:dsh,installed:!!dsh,mode:'integrated',tools:'完整原生工具 / Skills / MCP / 子代理',description:'原生 Harness 会话与完整界面'},
    {id:'kimi',name:'Kimi Code',short:'Kimi',protocol:'acp',executable:kimi,installed:!!kimi,mode:'integrated',tools:'完整原生工具 / Skills / MCP / 子代理',description:'ACP 双向会话与原生审批'},
    {id:'codex',name:'Codex CLI',short:'Codex',protocol:'exec-json / app-server',executable:codex,installed:!!codex,mode:'integrated',tools:'完整原生工具 / Skills / MCP / 子代理',description:'原生 exec JSONL；第三方模型使用 app-server'},
    {id:'antigravity',name:'Antigravity',short:'AG',protocol:'stream-json',executable:agy,desktop:agyDesktop,installed:!!(agy||agyDesktop),mode:agy?'integrated':'native',tools:'完整原生工具 / Skills / MCP / 子代理',description:'独立 Gemini 模型源 · 原生 CLI / 桌面'}
  ].map(r=>({...r,status:r.installed?'ready':'missing',reason:r.installed?null:'尚未安装，请到设置 → 开发环境安装或配置',kind:r.id==='kimi'?(r.executable===managed?.executable?'managed':r.executable?.includes('node_modules/@moonshot-ai')||r.executable?.includes('node_modules\\@moonshot-ai')?'bundled':'system'):'system',version:r.id==='kimi'&&r.executable===managed?.executable?managed.version:null})),options.env??process.env,{isPackaged:options.isPackaged});
}
export function nativeNode(){
  if(process.versions.electron){const bundled=join(process.resourcesPath,'runtime/node.exe');if(existsSync(bundled))return {command:bundled,args:[],env:{}};const dev=resolve(import.meta.dirname,'../../assets/runtime/node.exe');if(existsSync(dev))return {command:dev,args:[],env:{}};return {command:process.execPath,args:[],env:{ELECTRON_RUN_AS_NODE:'1'}};}
  return {command:process.execPath,args:[],env:{}};
}
