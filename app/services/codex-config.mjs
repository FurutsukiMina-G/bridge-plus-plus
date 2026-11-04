import {readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {parse} from 'smol-toml';

export const codexHome=()=>process.env.CODEX_HOME??join(homedir(),'.codex');

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
