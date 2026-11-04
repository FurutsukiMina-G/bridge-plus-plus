import {readFile,mkdtemp,rm,stat} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readExternalAsar} from '../core/external-asar.mjs';
import {normalizeAntigravity} from '../core/catalog.mjs';
import {ANTIGRAVITY_INPUT_MIMES,ANTIGRAVITY_TRANSPORT_SOURCE} from '../core/antigravity-media.mjs';
const exec=promisify(execFile),cache=new Map();
export const MEDIA_LIMITS={image:8*1024*1024,audio:50*1024*1024,video:100*1024*1024};
export const MAX_ATTACHMENTS_PER_TURN=8;
export const MAX_ATTACHMENT_BYTES_PER_TURN=12*1024*1024;
export const ANTIGRAVITY_MAX_ATTACHMENT_BYTES=16*1024*1024;
export const mediaTurnLimits=runtimeId=>({maxCount:MAX_ATTACHMENTS_PER_TURN,maxTotalBytes:runtimeId==='antigravity'?ANTIGRAVITY_MAX_ATTACHMENT_BYTES:MAX_ATTACHMENT_BYTES_PER_TURN});
export const mediaSizeLimit=(kind,runtimeId)=>Math.min(MEDIA_LIMITS[kind],runtimeId==='antigravity'?ANTIGRAVITY_MAX_ATTACHMENT_BYTES:Infinity);
export const MEDIA_MIMES={image:['image/png','image/jpeg','image/gif','image/webp'],audio:['audio/wav','audio/mpeg','audio/ogg','audio/flac'],video:['video/mp4','video/webm']};
export function deniedMediaCapabilities(reason,runtimeId){return {...Object.fromEntries(Object.keys(MEDIA_LIMITS).map(kind=>[kind,{allowed:false,maxBytes:mediaSizeLimit(kind,runtimeId),mimes:runtimeId==='antigravity'?ANTIGRAVITY_INPUT_MIMES[kind]:MEDIA_MIMES[kind],reason}])),turn:mediaTurnLimits(runtimeId)};}
export function mediaCapabilities(runtime,selection,model,nativeModel){
  if(model&&(model.boundRuntime&&runtime?.id!==model.boundRuntime||runtime?.id==='antigravity'&&model.source!=='antigravity'))return deniedMediaCapabilities('此模型来源与所选运行环境不兼容，请重新选择模型',runtime?.id);
  if(runtime?.id==='antigravity'&&selection?.modelKey==='native'&&!selection.nativeModel)return deniedMediaCapabilities('无法确认 Antigravity 原生当前模型是否为 Gemini，请在模型菜单里选择 Antigravity · Gemini 来源的模型，或填写原生 Gemini 模型 ID 后再添加附件',runtime.id);
  if(runtime?.id==='antigravity'&&selection?.modelKey==='native'&&typeof selection.nativeModel==='string')model=normalizeAntigravity({id:selection.nativeModel});
  return {...Object.fromEntries(['image','audio','video'].map(kind=>{
    const upstream=runtime?.id==='antigravity'&&model?.source==='antigravity'?model[kind==='image'?'images':kind]===true:selection?.modelKey==='native'?nativeModel?.inputModalities?.includes(kind):kind==='image'?model?.images===true:false;
    const transport=(runtime?.id==='codex'&&selection?.modelKey==='native'?runtime?.media?.nativeExec:runtime?.media)?.[kind]===true;
    const formats=runtime?.id==='antigravity'?ANTIGRAVITY_INPUT_MIMES[kind]:MEDIA_MIMES[kind];
    const mimes=Array.isArray(model?.inputMimeTypes)?formats.filter(mime=>model.inputMimeTypes.includes(mime)):formats;
    const reason=!upstream?(selection?.modelKey==='native'?`原生模型目录未声明支持${{image:'图片',audio:'音频',video:'视频'}[kind]}`:kind==='image'?(model?.images===false?'上游目录明确不支持图片':'上游目录未声明支持图片'):`上游目录未声明支持${kind==='audio'?'音频':'视频'}`):!transport?runtime?.media?.reason??`${runtime?.name??'此运行环境'} 的传输协议未核实支持${kind}`:!mimes.length?'模型声明的 MIME 与已核实传输格式没有交集':null;
    return [kind,{allowed:!!(upstream&&transport&&mimes.length),maxBytes:mediaSizeLimit(kind,runtime?.id),mimes,...reason?{reason}:{}}];
  })),turn:mediaTurnLimits(runtime?.id)};
}
export function antigravityTransportMedia(help){const supported=/(?:^|\s)--add-dir(?:\s|$)/m.test(help);return {image:supported,audio:supported,video:supported,source:ANTIGRAVITY_TRANSPORT_SOURCE,...supported?{}:{reason:'已安装 agy 帮助未提供 --add-dir，不能安全开放会话媒体目录；图片/音频/视频输入均停用。'}};}
export async function inspectRuntimeMedia(runtime,{readArchive=readExternalAsar}={}){
  if(runtime.status&&runtime.status!=='ready')return {image:false,audio:false,video:false,reason:runtime.reason??'环境尚未就绪'};
  if(!runtime.executable)return {reason:'运行程序未安装'};
  const info=await stat(runtime.executable),key=JSON.stringify([runtime.id,runtime.executable,info.size,info.mtimeMs]);
  if(cache.has(key))return cache.get(key);
  const flight=(async()=>{
    if(runtime.id==='codex'){
      const root=await mkdtemp(join(tmpdir(),'bridgepp-media-'));
      try{
        await exec(runtime.executable,['app-server','generate-json-schema','--out',root],{windowsHide:true,timeout:20000});
        const schema=JSON.parse(await readFile(join(root,'v2/TurnStartParams.json'),'utf8'));
        const types=schema.definitions?.UserInput?.oneOf?.flatMap(x=>x.properties?.type?.enum??[])??[];
        const version=(await exec(runtime.executable,['--version'],{windowsHide:true,timeout:10000})).stdout.trim();
        const help=(await exec(runtime.executable,['exec','--help'],{windowsHide:true,timeout:10000})).stdout,resume=(await exec(runtime.executable,['exec','resume','--help'],{windowsHide:true,timeout:10000})).stdout;
        return {image:types.includes('localImage'),audio:types.includes('localAudio'),video:false,version,source:'app-server generate-json-schema',nativeExec:{image:/--image/.test(help)&&/--image/.test(resume),audio:false,video:false,source:'installed exec/resume --help'}};
      }finally{await rm(root,{recursive:true,force:true});}
    }
    if(runtime.id==='kimi'&&/\.[cm]?js$/i.test(runtime.executable)){
      const pkg=JSON.parse(await readFile(join(dirname(runtime.executable),'../package.json'),'utf8')),s=await readFile(runtime.executable,'utf8');
      const block=/async initialize\(params\)\s*\{[\s\S]{0,1800}?promptCapabilities:\s*\{([^}]+)\}/.exec(s);
      if(pkg.name==='@moonshot-ai/kimi-code'&&block)return {image:/image:\s*true/.test(block[1]),audio:/audio:\s*true/.test(block[1]),video:false,version:pkg.version,source:'installed ACP initialize implementation'};
    }
    if(runtime.id==='dsh'){
      const s=await readArchive(join(dirname(runtime.executable),'resources/app.asar'));
      const image=s.includes("readonly type: 'image'; readonly mediaType: ImageMediaType; readonly data: string;")&&s.includes('SessionPromptRequest');
      return {image,audio:false,video:false,source:'installed Host PromptContentPart declaration',reason:'DSH Host 未声明此媒体类型的提示词传输'};
    }
    if(runtime.id==='antigravity'){
      const {stdout,stderr}=await exec(runtime.executable,['--help'],{windowsHide:true,timeout:10000,maxBuffer:2*1024*1024});
      return antigravityTransportMedia(stdout+stderr);
    }
    return {image:false,audio:false,video:false,reason:'此运行环境未核实媒体输入传输'};
  })().catch(error=>({image:false,audio:false,video:false,reason:'运行环境媒体能力检测失败：'+error.message}));
  cache.set(key,flight);return flight;
}
export async function withRuntimeMedia(runtimes){return Promise.all(runtimes.map(async r=>({...r,media:await inspectRuntimeMedia(r).catch(error=>({reason:error.message}))})));}
