import {readdir,realpath,stat,open} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {join,relative,isAbsolute,resolve} from 'node:path';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {JsonLines} from '../core/process.mjs';
import {decodeMediaData} from './media.mjs';
import {MEDIA_LIMITS} from './media-capabilities.mjs';
const inside=(root,path)=>{const r=relative(root,path);return !isAbsolute(r)&&!r.split(/[\\/]/).includes('..');};
const threadId=id=>/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id??'');
function imageMime(bytes){
  if(bytes.length>MEDIA_LIMITS.image)throw new Error('生成图片超过大小上限');
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6)))return 'image/gif';
  if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'image/webp';
  throw new Error('生成图片字节不是已支持的图片格式');
}
// exec omits image-generation items from JSONL. Recover completed Extension
// items (observed 2026-11-03) and the legacy ResponseItem from the owned tail.
export class CodexRolloutMedia {
  constructor(home=process.env.CODEX_HOME??join(homedir(),'.codex')){this.home=resolve(home);this.root=join(this.home,'sessions');this.emitted=new Set();this.notices=new Set();}
  async file(id){
    if(!threadId(id))return null;
    let root;try{root=await realpath(this.root);}catch(error){if(error.code==='ENOENT')return null;throw error;}
    const entries=await readdir(root,{recursive:true,withFileTypes:true});
    const found=entries.filter(e=>e.isFile()&&e.name.endsWith('-'+id+'.jsonl'));
    if(found.length!==1)return null;
    const path=await realpath(join(found[0].parentPath,found[0].name));
    if(!inside(root,path))throw new Error('原生媒体日志路径超出 Codex 会话目录');
    return {path,size:(await stat(path)).size};
  }
  async checkpoint(id){return {id,file:id?await this.file(id):null};}
  async savedImage(id,savedPath){
    const generated=join(this.home,'generated_images'),root=join(generated,id);
    if(!threadId(id)||typeof savedPath!=='string'||!isAbsolute(savedPath)||!inside(root,resolve(savedPath)))throw new Error('生成图片路径不属于本线程的 generated_images 目录');
    const [homeReal,generatedReal,rootReal,path]=await Promise.all([realpath(this.home),realpath(generated),realpath(root),realpath(savedPath)]);
    // Neither the generated_images root nor the thread directory may redirect
    // to another location/thread. A child junction must also stay in this root.
    if(relative(join(homeReal,'generated_images'),generatedReal)!==''||relative(join(generatedReal,id),rootReal)!==''||!inside(rootReal,path))throw new Error('生成图片 realpath 超出本线程目录或目录发生重定向');
    const handle=await open(path,'r');
    try{
      const info=await handle.stat();if(!info.isFile()||info.size>MEDIA_LIMITS.image)throw new Error('生成图片文件类型无效或超过大小上限');
      const bytes=Buffer.alloc(info.size+1);let length=0;
      while(length<bytes.length){const result=await handle.read(bytes,length,bytes.length-length,length);if(!result.bytesRead)break;length+=result.bytesRead;}
      if(length!==info.size)throw new Error('生成图片文件在读取时发生变化');
      return bytes.subarray(0,length);
    }finally{await handle.close();}
  }
  async project(id,item,emit){
    const key=id+':'+(typeof item.id==='string'&&item.id?item.id:createHash('sha256').update(JSON.stringify(item)).digest('hex'));
    const notice=async reason=>{
      const text=`Codex 生成图片未导入${item.id?'（'+String(item.id).slice(0,200)+'）':''}：${reason}`;
      if(this.notices.has(key+':'+text))return;this.notices.add(key+':'+text);
      await emit({type:'notice',source:'native-media',code:'image_generation_unavailable',text});
    };
    if(item.status!=='completed'||item.failure!=null){
      const failure=typeof item.failure==='string'?item.failure:item.failure?.message??item.failure?.type;
      await notice(failure?String(failure).slice(0,500):item.failure!=null?'原生记录包含生成失败信息，未提供详情':`原生生成状态为 ${String(item.status??'unknown').slice(0,80)}`);return;
    }
    if(this.emitted.has(key))return;
    let bytes,mime;
    try{
      if(typeof item.result==='string'&&item.result){
        if(item.result.length>Math.ceil(MEDIA_LIMITS.image*4/3)+4)throw new Error('生成图片超过大小上限');
        bytes=decodeMediaData(item.result);
      }else if(item.savedPath)bytes=await this.savedImage(id,item.savedPath);
      else throw new Error('原生记录未提供图片数据或可用文件');
      mime=imageMime(bytes);
    }catch(error){await notice(error.message);return;}
    await emit({type:'media-output',mime,data:bytes.toString('base64'),origin:{runtimeId:'codex',itemId:item.id,tool:'imageGeneration'}});
    this.emitted.add(key);
  }
  async read(id,checkpoint,emit){
    if(checkpoint.id&&checkpoint.id!==id)return;
    const file=await this.file(id);if(!file)return;
    if(checkpoint.id&&!checkpoint.file)return; // Missing old log must not replay history later.
    if(checkpoint.file&&checkpoint.file.path!==file.path)throw new Error('原生线程日志路径发生变化，未重放图片');
    const start=checkpoint.file?.size??0;
    if(start>file.size||file.size-start>64*1024*1024)throw new Error('原生媒体日志本轮范围无效或超过读取上限');
    if(start===file.size)return;
    const lines=new JsonLines(16*1024*1024),images=[];let fault;
    lines.on('message',m=>{
      const p=m?.payload;
      if(m?.type==='event_msg'&&p?.type==='item_completed'&&p.thread_id===id&&p.item?.type==='Extension'&&p.item.kind==='image_gen.generation')images.push(p.item);
      else if(m?.type==='response_item'&&p?.type==='image_generation_call')images.push(p);
    });
    lines.on('fault',e=>{fault=e;});
    for await(const chunk of createReadStream(file.path,{start}))lines.push(chunk);lines.end();if(fault)throw fault;
    for(const image of images)await this.project(id,image,emit);
  }
}
