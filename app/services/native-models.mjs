import {launch,stopProcess} from '../core/process.mjs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {codexHome,readCodexDefaultModel} from './codex-config.mjs';
export async function readCodexModelCache({home=codexHome(),read=readFile}={}){
  let cache;try{cache=JSON.parse(await read(join(home,'models_cache.json'),'utf8'));}catch(error){throw new Error('无法读取官方 Codex models_cache.json（'+error.code+'）；请先用自己的原生 Codex 客户端登录并刷新模型，再刷新此目录。不会启动其他身份的目录请求。');}
  if(!cache||!Array.isArray(cache.models)||!cache.models.length)throw new Error('官方 Codex 模型缓存为空或格式未知；请在原生客户端刷新模型目录');
  const seen=new Set(),models=[];
  for(const raw of cache.models){
    if(typeof raw?.slug!=='string'||!raw.slug||seen.has(raw.slug))continue;seen.add(raw.slug);
    models.push({id:raw.slug,name:raw.display_name??raw.slug,hidden:raw.visibility==='list'?false:raw.visibility==='hide'?true:null,isDefault:null,reasoning:(Array.isArray(raw.supported_reasoning_levels)?raw.supported_reasoning_levels:[]).map(x=>typeof x==='string'?x:x?.effort).filter(x=>typeof x==='string'),defaultReasoning:raw.default_reasoning_level??null,...Array.isArray(raw.input_modalities)?{inputModalities:raw.input_modalities.filter(x=>typeof x==='string')}:{},catalogSource:'official-models-cache',cacheFetchedAt:cache.fetched_at??null,runtimeVersion:cache.client_version??null,raw});
  }
  if(!models.length)throw new Error('官方 Codex 模型缓存没有有效模型标识');return models;
}
export async function nativeModels(runtime,cwd,codexOptions={}){
  if(runtime?.status&&runtime.status!=='ready')throw new Error((runtime.reason??'运行环境尚未就绪')+'；请到设置 → 开发环境处理');
  if(!runtime?.executable)throw new Error('原生 CLI 未安装，请先在运行环境设置中配置程序路径');
  if(runtime.id==='codex'){
    const [models,current]=await Promise.all([readCodexModelCache(codexOptions),readCodexDefaultModel(codexOptions)]);
    return models.map(m=>({...m,...m.id===current.modelId?{isDefault:true}:{},runtimeExecutable:runtime.executable}));
  }
  if(runtime.id==='antigravity')return new Promise((resolve,reject)=>{const child=launch(runtime.executable,['models'],{cwd});child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');let out='',error='';const timer=setTimeout(()=>{void stopProcess(child);reject(new Error('Antigravity 模型目录读取超时'));},30000);child.stdout.on('data',b=>{out+=b;});child.stderr.on('data',b=>{error=(error+b).slice(-3000);});child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);if(code!==0){reject(new Error('无法读取 Antigravity 模型，请在原生程序中完成登录。'));return;}const models=out.split(/\r?\n/).map(line=>/^([a-z][\w.-]+)\s+(.+)$/.exec(line)).filter(Boolean).map(m=>({id:m[1],name:m[2].trim(),reasoning:[]}));if(!models.length){reject(new Error('Antigravity 未返回可用模型'));return;}resolve(models);});});
  throw new Error('此后端的原生模型目录请在其完整工具界面中查看');
}
