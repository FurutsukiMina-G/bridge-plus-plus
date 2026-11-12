import {mkdir,readFile,writeFile,readdir,lstat,stat,copyFile,utimes,rename,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {homedir} from 'node:os';
import {basename,dirname,join} from 'node:path';
import {parse,stringify} from 'smol-toml';
import {rulesDocument,rulesLock,writeRulesFile} from './agent-rules.mjs';

export const codexHome=()=>process.env.CODEX_HOME??join(homedir(),'.codex');

export const CODEX_GATEWAY_PLUGINS=['visualize@openai-bundled',...['documents','pdf','spreadsheets','presentations','template-creator'].map(name=>name+'@openai-primary-runtime')];
export const codexBridgeHome=root=>join(root,'engines','codex','home');
export function codexSessionHome(session,root){return session?.selection?.modelKey!=='native'&&(!session?.nativeId||session.nativeHome==='bridge')?codexBridgeHome(root):null;}
export function gatewayCodexConfig(config={},home){
  const result={windows:{sandbox:'unelevated'}};
  for(const name of ['openai-bundled','openai-primary-runtime'])if(config.marketplaces?.[name]){result.marketplaces??={};result.marketplaces[name]=structuredClone(config.marketplaces[name]);}
  for(const name of CODEX_GATEWAY_PLUGINS)if(config.plugins?.[name]){result.plugins??={};result.plugins[name]=structuredClone(config.plugins[name]);}
  if(config.mcp_servers?.node_repl)result.mcp_servers={node_repl:structuredClone(config.mcp_servers.node_repl)};
  // Codex only accepts this reserved marketplace beneath the active CODEX_HOME.
  // Its installed plugin cache is sufficient; never follow the user's .tmp path.
  if(home&&result.marketplaces?.['openai-bundled']?.source_type==='local')result.marketplaces['openai-bundled'].source=join(home,'.tmp','bundled-marketplaces','openai-bundled');
  return result;
}
async function syncPluginTree(source,target){
  const info=await lstat(source);if(info.isSymbolicLink())throw new Error('不允许插件符号链接');
  try{if((await lstat(target)).isSymbolicLink())throw new Error('不允许插件目标符号链接');}catch(error){if(error.code!=='ENOENT')throw error;}
  if(info.isDirectory()){await mkdir(target,{recursive:true});for(const entry of await readdir(source))await syncPluginTree(join(source,entry),join(target,entry));}
  else if(info.isFile()){
    let current;try{current=await stat(target);}catch(error){if(error.code!=='ENOENT')throw error;}
    if(current?.isFile()&&current.size===info.size&&Math.abs(current.mtimeMs-info.mtimeMs)<1)return;
    const temp=target+'.'+randomUUID()+'.tmp';try{await copyFile(source,temp);await utimes(temp,info.atime,info.mtime);await rename(temp,target);}finally{await rm(temp,{force:true});}
  }
}
export async function prepareCodexHome(root,{sourceHome=codexHome(),read=readFile,rulesText=''}={}){
  const home=codexBridgeHome(root);let config,notice=null;
  try{config=parse(await read(join(sourceHome,'config.toml'),'utf8'));}catch{config={};notice='用户 Codex config.toml 不存在、无法读取或解析失败；隔离配置仅启用 unelevated 沙箱。';}
  await rulesLock(join(home,'config.toml'),async()=>{
    await mkdir(home,{recursive:true});
    for(const key of CODEX_GATEWAY_PLUGINS.filter(key=>config.plugins?.[key])){
      const [name,marketplace]=key.split('@'),source=join(sourceHome,'plugins','cache',marketplace,name),target=join(home,'plugins','cache',marketplace,name);
      try{await syncPluginTree(source,target);}catch{notice='部分文档插件缓存无法同步，已继续使用可用的隔离配置。';}
    }
    const file=join(home,'config.toml'),temp=file+'.'+randomUUID()+'.tmp';try{await writeFile(temp,stringify(gatewayCodexConfig(config,home)),{mode:0o600});await rename(temp,file);}finally{await rm(temp,{force:true});}
  });
  await writeRulesFile(join(home,'AGENTS.md'),rulesDocument(rulesText));
  return {home,notice};
}

// Read on every lookup: "current default" is not a pinned session selection.
// Return only the model ID and a safe explanation; never expose config content.
export async function readCodexDefaultModel({home=codexHome(),read=readFile}={}){
  let text,config;
  try{text=await read(join(home,'config.toml'),'utf8');}
  catch(error){return {modelId:null,reason:error.code==='ENOENT'?'config.toml 不存在':'config.toml 无法读取'};}
  try{config=parse(text);}
  catch{return {modelId:null,reason:'config.toml 解析失败'};}
  const profiled=Object.hasOwn(config,'profile');
  if(profiled&&(typeof config.profile!=='string'||!config.profile))return {modelId:null,reason:'config.toml 的 profile 无效'};
  const model=profiled?config.profiles?.[config.profile]?.model:config.model;
  if(typeof model!=='string'||!model.trim())return {modelId:null,reason:profiled?'config.toml 当前 profile 没有设置 model':'config.toml 没有设置 model'};
  return {modelId:model,reason:null};
}

// Codex keeps sending its built-in prompt for an unknown model, but the fallback
// model metadata does not declare apply_patch. Recording that prompt per Codex
// version lets a later session declare apply_patch through a model_catalog_json
// entry without changing a word the model reads.
const enginesDir=root=>join(root,'engines','codex'),sessionVersions=new Map();

export function codexVersionNumber(version){
  if(typeof version!=='string')return null;
  const found=/(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)/.exec(version);
  return found?found[1]:null;
}
export function recordCodexRuntime(sessionId,version){
  const id=codexVersionNumber(version);
  if(typeof sessionId==='string'&&sessionId&&id)sessionVersions.set(sessionId,id);
  return id;
}
export function codexSessionVersion(sessionId){return sessionVersions.get(sessionId)??null;}
// Session directories are <workspace>/sessions/<id>; engines lives in <workspace>.
export function codexWorkspaceRoot(sessionDir){
  if(typeof sessionDir!=='string'||!sessionDir)return null;
  const sessions=dirname(sessionDir);
  return basename(sessions)==='sessions'?dirname(sessions):null;
}
export function codexBaseInstructionsFromRequest(body){
  if(!body||typeof body!=='object')return null;
  if(typeof body.instructions==='string'&&body.instructions.trim())return body.instructions;
  const input=Array.isArray(body.input)?body.input:[];
  const first=input.find(item=>item&&typeof item==='object'&&['developer','system'].includes(item.role));
  if(!first)return null;
  const text=(Array.isArray(first.content)?first.content:[]).map(part=>typeof part?.text==='string'?part.text:'').filter(Boolean).join('\n');
  return text.trim()?text:null;
}
export async function recordCodexBaseInstructions(root,version,text){
  const id=codexVersionNumber(version);
  if(!root||!id||typeof text!=='string'||!text.trim())return null;
  await mkdir(enginesDir(root),{recursive:true});
  const file=join(enginesDir(root),`base-instructions-${id}.txt`);
  try{await writeFile(file,text,{flag:'wx',mode:0o600});}
  catch(error){if(error.code!=='EEXIST')throw error;}
  return file;
}
export async function readCodexBaseInstructions(root,version){
  const id=codexVersionNumber(version);
  if(!root||!id)return null;
  try{return await readFile(join(enginesDir(root),`base-instructions-${id}.txt`),'utf8');}
  catch{return null;}
}
export async function recordCodexBaseInstructionsForSession(root,sessionId,body){
  const version=codexSessionVersion(sessionId);
  if(!version)return null;
  const text=codexBaseInstructionsFromRequest(body);
  return text?recordCodexBaseInstructions(root,version,text):null;
}
// Keyed by Codex version: an upgrade is a new key, so the catalog is tried again.
const unsupportedFile=root=>join(enginesDir(root),'model-catalog-unsupported.json');
export async function codexCatalogUnsupported(root,version){
  const id=codexVersionNumber(version);
  if(!root||!id)return false;
  try{return JSON.parse(await readFile(unsupportedFile(root),'utf8')).versions?.[id]===true;}
  catch{return false;}
}
export async function markCodexCatalogUnsupported(root,version){
  const id=codexVersionNumber(version);
  if(!root||!id)return false;
  await mkdir(enginesDir(root),{recursive:true});
  let current={};
  try{current=JSON.parse(await readFile(unsupportedFile(root),'utf8'));}catch{}
  const versions={...(current&&typeof current==='object'?current.versions??{}:{}),[id]:true};
  await writeFile(unsupportedFile(root),JSON.stringify({...current,versions},null,1),{mode:0o600});
  return true;
}
// The entry states every value the fallback metadata for an unknown model uses,
// plus apply_patch_tool_type. Each value below was read back from
// `codex debug models` for a minimal catalog entry (the fallback resolution) and a
// real app-server request kept the base instructions byte-identical and added only
// `custom:apply_patch`. Fields the fallback leaves unset (context_window,
// max_context_window, comp_hash, tool_mode, multi_agent_version) stay omitted here.
export const CODEX_FALLBACK_REASONING_LEVELS=[{effort:'low',description:'Fast responses with lighter reasoning'},{effort:'medium',description:'Balances speed and reasoning depth for everyday tasks'},{effort:'high',description:'Greater reasoning depth for complex problems'},{effort:'xhigh',description:'Extra high reasoning depth for complex problems'}];
export function codexModelCatalogEntry({slug,displayName,baseInstructions}){
  return {slug,display_name:displayName??slug,description:'Model routed through Bridge++ to the configured model source.',base_instructions:baseInstructions,apply_patch_tool_type:'freeform',shell_type:'unified_exec',visibility:'list',supported_in_api:true,priority:13,support_verbosity:true,truncation_policy:{mode:'tokens',limit:10000},supported_reasoning_levels:structuredClone(CODEX_FALLBACK_REASONING_LEVELS),experimental_supported_tools:[],default_reasoning_summary:'auto',web_search_tool_type:'text',input_modalities:['text','image'],supports_image_detail_original:false,effective_context_window_percent:95,use_responses_lite:false};
}
export async function writeCodexModelCatalog(dir,{slug,displayName,baseInstructions}){
  if(!dir||typeof slug!=='string'||!slug||typeof baseInstructions!=='string'||!baseInstructions)throw new Error('模型目录缺少网关模型标识或基础提示词');
  await mkdir(dir,{recursive:true});
  const file=join(dir,'model-catalog.json');
  await writeFile(file,JSON.stringify({models:[codexModelCatalogEntry({slug,displayName,baseInstructions})]},null,1),{mode:0o600});
  return file;
}
