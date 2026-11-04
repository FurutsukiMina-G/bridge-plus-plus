import {readFile,writeFile,mkdir,open,rename,rm,lstat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {join,dirname,resolve} from 'node:path';
import {homedir} from 'node:os';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'smol-toml';
import {environmentProcess} from './environment-process.mjs';
import {versionText} from './environment-utils.mjs';
import {compareRuntimeVersions} from './runtime-paths.mjs';
const queues=new Map(),q=JSON.stringify;
export const keyFingerprint=key=>createHash('sha256').update(key).digest('hex');
export const clientConfigPath=(target,{env=process.env,home=homedir()}={})=>join(target==='kimi'?env.KIMI_CODE_HOME||join(home,'.kimi-code'):env.CODEX_HOME||join(home,'.codex'),'config.toml');
const toml=text=>{try{return parse(text.replace(/^\uFEFF/,''));}catch{throw new Error('现有客户端 TOML 配置无法解析，未修改；请先修复配置');}};
function catalog(models){if(!Array.isArray(models)||!models.length)throw new Error('模型服务目录为空，请先刷新模型');const ids=new Set();for(const m of models){if(typeof m.id!=='string'||!m.id||m.id.length>256||/[\x00-\x1f]/.test(m.id)||ids.has(m.id)||!Number.isSafeInteger(m.context_window)||m.context_window<=0)throw new Error('目录缺少有效模型 ID 或已核实的上下文窗口，未写入客户端配置');ids.add(m.id);}return models;}
export async function codexProfileMode(runtime,{execute=environmentProcess}={}){
 let version=versionText(runtime?.version);if(!version&&runtime?.executable)try{const result=await execute(runtime.executable,['--version'],{timeoutMs:8000});if(result.code===0)version=versionText(result.stdout);}catch{}
 if(!version)throw new Error('无法核实 Codex 版本，未选择或写入 profile 格式；请先重新检测开发环境');
 return compareRuntimeVersions(version,'0.134.0')>=0?'file':'legacy';
}
export function clientFragment({target,definition:def,models,baseURL,key,bearerSupported=false,profileMode='legacy'}){
 catalog(models);const url=new URL(baseURL);if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password||url.pathname!=='/')throw new Error('模型服务地址未核实');
 if(target==='codex'){
  const profile='bridgepp-'+def.id,model=models[0],provider=[`[model_providers.${def.providerId}]`,`name = ${q(def.name)}`,`base_url = ${q(baseURL+'/codex/v1')}`,'wire_api = "responses"','requires_openai_auth = false',bearerSupported?`experimental_bearer_token = ${q(key)}`:`env_key = ${q(def.credential)}`],selection=[`model_provider = ${q(def.providerId)}`,`model = ${q(model.id)}`,`model_context_window = ${model.context_window}`,...model.default_reasoning_effort?[`model_reasoning_effort = ${q(model.default_reasoning_effort)}`]:[]];
  return {profile,profileMode,defaultModel:model.id,providerId:def.providerId,requiredEnv:bearerSupported?null:def.credential,text:(profileMode==='file'?[...selection,'',...provider,'']:[...provider,'',`[profiles.${q(profile)}]`,...selection,'']).join('\n')};
 }
 if(target!=='kimi')throw new Error('未知接入目标');
 const lines=[`[providers.${def.providerId}]`,'type = "openai"',`base_url = ${q(baseURL+'/kimi/v1')}`,`api_key = ${q(key)}`,''];
 for(const m of models){const efforts=Array.isArray(m.reasoning_efforts)?m.reasoning_efforts:[],active=efforts.filter(e=>!['none','off'].includes(e)),off=efforts.find(e=>['none','off'].includes(e)),caps=['tool_use',...(m.input_modalities?.includes('image')?['image_in']:[]),...(active.length?['thinking',...off?[]:['always_thinking']]:[])];lines.push(`[models.${q(def.providerId+'/'+m.id)}]`,`provider = ${q(def.providerId)}`,`model = ${q(m.id)}`,`display_name = ${q(m.name??m.id)}`,`max_context_size = ${m.context_window}`,`capabilities = ${q(caps)}`);if(Number.isSafeInteger(m.max_tokens)&&m.max_tokens>0)lines.push(`max_output_size = ${m.max_tokens}`);if(active.length)lines.push(`support_efforts = ${q(active)}`);if(off)lines.push(`off_effort = ${q(off)}`);if(m.default_reasoning_effort&&efforts.includes(m.default_reasoning_effort))lines.push(`default_effort = ${q(m.default_reasoning_effort)}`);lines.push('');}
 return {providerId:def.providerId,text:lines.join('\n')};
}
const profileKeys=['model_provider','model','model_context_window','model_reasoning_effort'];
function owned(data,target,def,profileFile=false){const allowed=target==='codex'?['model_providers',...profileFile?profileKeys:['profiles']]:['providers','models'];return Object.keys(data).every(k=>allowed.includes(k))&&Object.entries(data).every(([section,entries])=>profileFile&&profileKeys.includes(section)||entries&&typeof entries==='object'&&Object.keys(entries).every(k=>section==='profiles'?k==='bridgepp-'+def.id:section==='models'?k.startsWith(def.providerId+'/'):k===def.providerId));}
function withoutOwned(data,target,def,profileFile=false){const copy=structuredClone(data);if(profileFile)for(const key of profileKeys)delete copy[key];for(const section of target==='codex'?['model_providers','profiles']:['providers','models'])if(copy[section]){for(const key of Object.keys(copy[section]))if(section==='profiles'?key==='bridgepp-'+def.id:section==='models'?key.startsWith(def.providerId+'/'):key===def.providerId)delete copy[section][key];if(!Object.keys(copy[section]).length)delete copy[section];}return copy;}
export function replaceManagedFragment(original,{target,definition:def,text,profileFile=false,remove=false}){
 const begin=`# BEGIN Bridge++ ${target} ${def.id}`,end=`# END Bridge++ ${target} ${def.id}`,newline=original.includes('\r\n')?'\r\n':'\n';
 const lines=original.split(/(?<=\n)/),starts=[],ends=[];let pos=0;for(const line of lines){const value=line.replace(/\r?\n$/,'');if(value===begin)starts.push(pos);if(value===end)ends.push({start:pos,end:pos+line.length});pos+=line.length;}
 if(starts.length>1||ends.length>1||starts.length!==ends.length||starts.length&&ends[0].start<=starts[0])throw new Error('Bridge++ 受管标记不完整或重复，未修改客户端配置');
 const previous=toml(original);let prefix=original,suffix='';
 if(starts.length){const inner=original.slice(starts[0]+begin.length,ends[0].start);if(!owned(toml(inner),target,def,profileFile))throw new Error('受管片段内含非本服务配置，未覆盖');prefix=original.slice(0,starts[0]);suffix=original.slice(ends[0].end);}
 if(remove){const next=starts.length?prefix+suffix:original;if(!isDeepStrictEqual(withoutOwned(previous,target,def),withoutOwned(toml(next),target,def)))throw new Error('移除受管片段会影响其他配置，未写入');return next;}
 const outside=toml(prefix+suffix),section=target==='codex'?'model_providers':'providers';
 if(Object.hasOwn(outside[section]??{},def.providerId)||target==='codex'&&Object.hasOwn(outside.profiles??{},'bridgepp-'+def.id)||profileFile&&profileKeys.some(key=>Object.hasOwn(outside,key))||target==='kimi'&&Object.entries(outside.models??{}).some(([id,m])=>id.startsWith(def.providerId+'/')||m.provider===def.providerId))throw new Error('已有同名但不在 Bridge++ 受管片段内的 provider、profile 或模型，未覆盖');
 const next=prefix+(prefix&&!prefix.endsWith('\n')?newline:'')+begin+newline+text.replace(/\r?\n/g,newline)+end+newline+suffix;
 if(!isDeepStrictEqual(withoutOwned(previous,target,def,profileFile),withoutOwned(toml(next),target,def,profileFile)))throw new Error('受管片段会影响其他配置，未写入');return next;
}
export async function supportsCodexBearer(executable){if(!executable)return false;const needle=Buffer.from('experimental_bearer_token');let tail=Buffer.alloc(0),size=0;try{for await(const bytes of createReadStream(executable,{signal:AbortSignal.timeout(8000)})){size+=bytes.length;if(size>300*1024*1024)return false;const chunk=Buffer.concat([tail,bytes]);if(chunk.includes(needle))return true;tail=chunk.subarray(-needle.length);}return false;}catch{return false;}}
// This integration is deliberately tied to the observed public 2.3.x Node
// implementation; reject unknown Python/binary config layouts instead of guessing.
export async function verifyKimiConfig(executable){if(!executable||!/\.mjs$/i.test(executable))throw new Error('尚未核实此 Kimi 安装的配置格式，请配置受支持的 Kimi Code Node 入口');try{if((await lstat(executable)).size>64*1024*1024)throw new Error('package too large');const options={encoding:'utf8',signal:AbortSignal.timeout(8000)},pkg=JSON.parse(await readFile(join(dirname(executable),'../package.json'),options)),source=await readFile(executable,options);if(pkg.name==='@moonshot-ai/kimi-code'&&source.includes('KIMI_CODE_HOME')&&source.includes('~/.kimi-code/config.toml')&&source.includes('ModelAliasBaseSchema')&&source.includes('apiKeyEnv:')&&source.includes('supportEfforts:'))return;}catch{}throw new Error('此 Kimi 版本未核实全局配置位置和模型字段，未写入');}
async function readConfig(file){try{const info=await lstat(file);if(!info.isFile()||info.nlink>1||info.size>4*1024*1024)throw new Error('客户端配置不是可安全编辑的普通文件');return await readFile(file,'utf8');}catch(error){if(error.code==='ENOENT')return null;throw new Error('无法安全读取客户端配置，未修改');}}
async function editConfig({store,file,target,transform}){
 await mkdir(dirname(file),{recursive:true,mode:0o700});const lock=file+'.bridgepp.lock';let handle;try{handle=await open(lock,'wx',0o600);}catch{throw new Error('客户端配置正由另一个接入任务处理，请稍后重试');}
 const tmp=file+'.bridgepp-'+randomUUID()+'.tmp';let backup=null;
 try{const before=await readConfig(file),next=transform(before);if(next!==before){backup=`${target}-before-${Date.now()}-${randomUUID()}`+(before===null?'.missing.json':'.toml');await writeFile(join(store.root,backup),before??JSON.stringify({path:file,existed:false}),{flag:'wx',mode:0o600});await writeFile(tmp,next,{flag:'wx',mode:0o600});if(await readConfig(file)!==before)throw new Error('客户端配置已并发变化，未覆盖；请重试接入');for(let n=0;;n++)try{await rename(tmp,file);break;}catch(error){if(n>=4||!['EPERM','EACCES','EBUSY'].includes(error.code))throw new Error('无法替换客户端配置；请关闭占用配置的程序后重试');await new Promise(r=>setTimeout(r,25*2**n));}}
 return {path:file,backup,changed:next!==before};
 }finally{await rm(tmp,{force:true}).catch(()=>{});await handle.close();await rm(lock,{force:true});}
}
async function writeConfig({store,file,target,fragment}){
 const definition=store.definition,profileFile=target==='codex'&&fragment.profileMode==='file',base=file;let migrationRequired=false;
 if(profileFile){
  file=join(dirname(base),fragment.profile+'.config.toml');
  const before=await readConfig(base),remaining=replaceManagedFragment(before??'',{target,definition,remove:true}),outside=toml(remaining);migrationRequired=before!==null&&remaining!==before;
  if(Object.hasOwn(outside.profiles??{},fragment.profile)||outside.profile===fragment.profile||Object.hasOwn(outside.model_providers??{},definition.providerId))throw new Error('config.toml 中有同名非受管配置，未覆盖；请自行处理冲突');
 }
 const transform=before=>replaceManagedFragment(before??'',{target,definition,text:fragment.text,profileFile});
 // Preflight both files before writing either; all writes re-check under lock.
 transform(await readConfig(file));
 const written=await editConfig({store,file,target,transform});let migration=null;
 if(migrationRequired)try{migration=await editConfig({store,file:base,target,transform:before=>before===null?null:replaceManagedFragment(before,{target,definition,remove:true})});}catch(error){throw new Error(`profile 文件已写入，但旧受管片段迁移未完成：${error.message}；profile 备份：${written.backup??'内容未变'}。请重试接入。`);}
 const message=target==='codex'?`已添加 ${profileFile?'独立 profile 文件':'旧版 Codex 兼容 profile 表'}；默认模型 ${fragment.defaultModel}；使用 codex --profile ${fragment.profile}，原生默认保持原样`:'已追加 provider 与模型；请在 Kimi 中自行选择，默认模型保持原样';
 return {path:file,providerId:fragment.providerId,...fragment.profile?{profile:fragment.profile,profileMode:fragment.profileMode,defaultModel:fragment.defaultModel}:{},backup:written.backup,migration:migration?.changed?{path:base,backup:migration.backup}:null,requiredEnv:fragment.requiredEnv??null,message:message+(fragment.requiredEnv?`；当前 Codex 未核实支持 provider 内置 token，请自行设置 ${fragment.requiredEnv}，Bridge++ 未修改系统环境变量`:'')};
}
export async function connectServiceClient({store,target,models,baseURL,key,runtime,env=process.env,home=homedir(),verifyKimi=verifyKimiConfig,verifyBearer=supportsCodexBearer,resolveProfileMode=codexProfileMode}){
 if(!['kimi','codex'].includes(target))throw new Error('未知接入目标');if(target==='kimi')await verifyKimi(runtime?.executable);const profileMode=target==='codex'?await resolveProfileMode(runtime):null,fragment=clientFragment({target,definition:store.definition,models,baseURL,key,profileMode,bearerSupported:target==='codex'&&await verifyBearer(runtime?.executable)}),file=resolve(clientConfigPath(target,{env,home})),prior=queues.get(file)??Promise.resolve();
 const work=prior.catch(()=>{}).then(()=>writeConfig({store,file,target,fragment}));queues.set(file,work);let result;try{result=await work;}finally{if(queues.get(file)===work)queues.delete(file);}
 const record={connectedAt:new Date().toISOString(),path:result.path,providerId:result.providerId,...result.profile?{profile:result.profile,profileMode:result.profileMode,defaultModel:result.defaultModel}:{},baseURL:baseURL+'/'+target+'/v1',keyFingerprint:keyFingerprint(key),...result.requiredEnv?{requiredEnv:result.requiredEnv}:{}};await store.write('connection-'+target+'.json',record);return {...result,connectedAt:record.connectedAt};
}
