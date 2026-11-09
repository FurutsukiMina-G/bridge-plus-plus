import {mkdir,readFile,writeFile,rm,rename,realpath,open,readdir} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute,extname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {MEDIA_LIMITS,MEDIA_MIMES,MAX_ATTACHMENTS_PER_TURN,mediaTurnLimits,mediaSizeLimit} from './media-capabilities.mjs';
export const MEDIA_SCHEME='bridge-media';
const formats={'.png':['image','image/png'],'.jpg':['image','image/jpeg'],'.jpeg':['image','image/jpeg'],'.gif':['image','image/gif'],'.webp':['image','image/webp'],'.wav':['audio','audio/wav'],'.mp3':['audio','audio/mpeg'],'.ogg':['audio','audio/ogg'],'.flac':['audio','audio/flac'],'.mp4':['video','video/mp4'],'.webm':['video','video/webm']};
export function inside(root,path){const r=relative(resolve(root),resolve(path));return r===''||!r.split(/[\\/]/).includes('..')&&!isAbsolute(r);}
export function detectMedia(name,bytes){
  const format=formats[extname(name).toLowerCase()];if(!format)throw new Error('不支持的媒体扩展名');
  const b=Buffer.from(bytes),ascii=(a,z)=>b.toString('ascii',a,z);let mime;
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
  else if(b[0]===255&&b[1]===216&&b[2]===255)mime='image/jpeg';
  else if(['GIF87a','GIF89a'].includes(ascii(0,6)))mime='image/gif';
  else if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')mime='image/webp';
  else if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WAVE')mime='audio/wav';
  else if(ascii(0,3)==='ID3'||b[0]===255&&(b[1]&0xe0)===0xe0&&(b[1]&6)!==0&&(b[1]&0x18)!==8)mime='audio/mpeg';
  else if(ascii(0,4)==='OggS'&&['OpusHead','vorbis','Speex','fLaC'].some(codec=>b.includes(Buffer.from(codec))))mime='audio/ogg';
  else if(ascii(0,4)==='fLaC')mime='audio/flac';
  else if(ascii(4,8)==='ftyp'&&['isom','iso2','iso3','iso4','iso5','iso6','mp41','mp42','avc1','dash','M4V ','M4VH','M4VP'].includes(ascii(8,12)))mime='video/mp4';
  else if(b.subarray(0,4).equals(Buffer.from([26,69,223,163]))&&b.includes(Buffer.from('webm')))mime='video/webm';
  if(mime!==format[1])throw new Error('媒体文件头与扩展名不符');return {kind:format[0],mime};
}
export function safeMediaName(name){if(typeof name!=='string'||!name||name.length>200||/[\\/\x00-\x1f\x7f-\x9f]/.test(name)||name==='.'||name==='..'||/[. ]$/.test(name))throw new Error('无效的附件文件名或路径穿越');return name;}
export function decodeMediaData(data){
  if(typeof data!=='string'||data.length>Math.ceil(Math.max(...Object.values(MEDIA_LIMITS))*4/3)+8||!data.length||data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(data))throw new Error('无效或超限的媒体 base64');
  return Buffer.from(data,'base64');
}
export function redactMedia(value){
  if(Array.isArray(value))return value.map(redactMedia);
  if(value&&typeof value==='object'){const media=['image','audio','video','base64','imageGeneration','image_generation','image_generation_call','input_image','input_audio','input_video','image_url'].includes(value.type);return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,(media&&['data','result','url','image_url'].includes(k)||typeof v==='string'&&v.startsWith('data:'))?'[media omitted from journal]':redactMedia(v)]));}
  return value;
}
export class MediaClaimError extends Error {
  constructor(cause,discardedAttachmentIds){super(cause.message,{cause});this.discardedAttachmentIds=discardedAttachmentIds;}
}
export class MediaService {
  constructor(store){this.store=store;this.root=join(store.root,'media');this.staging=join(this.root,'staging');this.entries=new Map();this.claims=new Set();}
  async init(){
    await mkdir(this.staging,{recursive:true});await this.checked(this.store.root,this.root);await this.checked(this.root,this.staging);
    const retained=new Set();
    for(const s of this.store.state.sessions)for(const row of s.queue??[])for(const a of row.attachments??[]){
      safeMediaName(a.name);if(!/^[a-f0-9-]{36}$/.test(a.id))throw new Error('排队附件标识无效');
      const file=a.id+extname(a.name).toLowerCase();retained.add(file);this.entries.set(a.id,{...a,projectId:s.projectId,path:join(this.staging,file),root:this.staging});
    }
    for(const name of await readdir(this.staging))if(/^[\w-]+\.[a-z0-9]+$/.test(name)&&!retained.has(name))await rm(join(this.staging,name),{force:true});
    for(const s of this.store.state.sessions){if(Array.isArray(s.attachments)){s.mediaAttachments??=s.attachments;delete s.attachments;}for(const a of s.mediaAttachments??[])this.entries.set(a.id,{...a,sessionId:s.id,path:join(this.root,'sessions',s.id,a.id+extname(a.name).toLowerCase()),root:join(this.root,'sessions',s.id)});}return this;
  }
  public(entry){const {id,kind,mime,name,size}=entry;return {id,kind,mime,name,size,url:`${MEDIA_SCHEME}://media/${id}`};}
  async checked(root,path){if(!inside(root,path))throw new Error('媒体路径超出允许目录');const [r,p]=await Promise.all([realpath(root),realpath(path)]);if(!inside(r,p))throw new Error('媒体符号链接超出允许目录');return p;}
  async inspect(path,root){if(!formats[extname(path).toLowerCase()])throw new Error('不支持的媒体扩展名');const p=await this.checked(root,path),handle=await open(p,'r');try{const info=await handle.stat();if(!info.isFile()||info.size>Math.max(...Object.values(MEDIA_LIMITS)))throw new Error('媒体文件超限或类型无效');const header=Buffer.alloc(Math.min(info.size,4096));await handle.read(header,0,header.length,0);const type=detectMedia(p,header);if(info.size>MEDIA_LIMITS[type.kind])throw new Error('媒体文件超过大小上限');return {...type,size:info.size,path:p};}finally{await handle.close();}}
  async inspectPreview(path,root){
    if(!['.bmp','.svg'].includes(extname(path).toLowerCase()))return this.inspect(path,root);
    const p=await this.checked(root,path),handle=await open(p,'r');try{const info=await handle.stat();if(!info.isFile()||!info.size||info.size>MEDIA_LIMITS.image)throw new Error('图片预览文件超限或类型无效');const header=Buffer.alloc(Math.min(info.size,4096));await handle.read(header,0,header.length,0);const bmp=extname(p).toLowerCase()==='.bmp';if(bmp?header.toString('ascii',0,2)!=='BM':!/<svg(?:\s|>)/i.test(header.toString('utf8')))throw new Error('图片预览文件头无效');return {path:p,size:info.size,kind:'image',mime:bmp?'image/bmp':'image/svg+xml',previewOnly:true};}finally{await handle.close();}
  }
  async stage({projectId,name,data}){this.store.project(projectId);safeMediaName(name);if(!(data instanceof Uint8Array))throw new Error('附件 data 必须是 Uint8Array');if(data.byteLength>Math.max(...Object.values(MEDIA_LIMITS)))throw new Error('媒体文件超过大小上限');const type=detectMedia(name,data);if(data.byteLength>MEDIA_LIMITS[type.kind])throw new Error('媒体文件超过大小上限');const id=randomUUID(),path=join(this.staging,id+extname(name).toLowerCase());await this.checked(this.root,this.staging);await writeFile(path,data,{flag:'wx',mode:0o600});const entry={id,projectId,name,...type,size:data.byteLength,path,root:this.staging};this.entries.set(id,entry);return this.public(entry);}
  async stageFile(projectId,path,kinds){const type=await this.inspect(path,resolve(path,'..'));if(kinds&&!kinds.includes(type.kind))throw new Error('所选文件类型不允许');return this.stage({projectId,name:basename(path),data:await readFile(type.path)});}
  reserved(id,allowed=[]){return this.store.state.sessions.some(s=>(s.queue??[]).some(row=>!allowed.includes(row.id)&&row.attachments?.some(a=>a.id===id)));}
  async discard(id){const e=this.entries.get(id);if(!e||e.sessionId||this.claims.has(id)||this.reserved(id))return;await this.checked(this.staging,e.path);await rm(e.path,{force:true});this.entries.delete(id);}
  validateClaim(session,ids,capabilities,allowed=[]){
    if(!Array.isArray(ids)||ids.length>MAX_ATTACHMENTS_PER_TURN||new Set(ids).size!==ids.length)throw new Error(`无效附件列表（最多 ${MAX_ATTACHMENTS_PER_TURN} 个）`);
    const sizeLimit=e=>Math.min(mediaSizeLimit(e.kind,session.runtimeId),capabilities[e.kind]?.maxBytes??Infinity);
    const rows=ids.map(id=>{const e=this.entries.get(id);if(!e||e.sessionId||e.projectId!==session.projectId||this.claims.has(id)||this.reserved(id,allowed))throw new Error('附件不存在、已发送、已排队或不属于当前项目');if(!capabilities[e.kind]?.allowed)throw new Error(capabilities[e.kind]?.reason??'当前选择不支持此附件');if(Array.isArray(capabilities[e.kind]?.mimes)&&!capabilities[e.kind].mimes.includes(e.mime))throw new Error('当前模型未声明接受此附件 MIME：'+e.mime);if(e.size>sizeLimit(e))throw new Error(`附件 ${e.name} 超过当前运行环境的单文件大小上限`);return e;});
    const totalLimit=Math.min(mediaTurnLimits(session.runtimeId).maxTotalBytes,capabilities.turn?.maxTotalBytes??Infinity);
    if(rows.reduce((n,e)=>n+e.size,0)>totalLimit)throw new Error(`单轮附件总大小超过 ${totalLimit/1024/1024} MiB`);
    return rows;
  }
  async claim(session,ids,capabilities,{queueIds=[]}={}){
    const rows=this.validateClaim(session,ids,capabilities,queueIds),sizeLimit=e=>Math.min(mediaSizeLimit(e.kind,session.runtimeId),capabilities[e.kind]?.maxBytes??Infinity);
    rows.forEach(e=>this.claims.add(e.id));const moved=[];
    try{const root=join(this.root,'sessions',session.id);await mkdir(root,{recursive:true});await this.checked(this.root,root);for(const e of rows){const info=await this.inspect(e.path,e.root);if(info.size!==e.size||info.mime!==e.mime||info.size>sizeLimit(e))throw new Error('附件文件已变化或超过当前大小上限');const path=join(root,e.id+extname(e.name).toLowerCase());await rename(e.path,path);Object.assign(e,{path,root,sessionId:session.id});moved.push(e);}return moved;}
    catch(error){if(moved.length){if(queueIds.length){await this.restage(moved);throw error;}await this.rollback(rows);throw new MediaClaimError(error,rows.map(e=>e.id));}throw error;}
    finally{rows.forEach(e=>this.claims.delete(e.id));}
  }
  async rollback(rows){for(const e of rows){await this.checked(e.root,e.path).then(path=>rm(path,{force:true})).catch(()=>{});this.entries.delete(e.id);}}
  async restage(rows){for(const e of rows){if(!e.sessionId)continue;await this.checked(e.root,e.path);const path=join(this.staging,e.id+extname(e.name).toLowerCase());await rename(e.path,path);Object.assign(e,{path,root:this.staging});delete e.sessionId;}return rows.map(e=>this.public(e));}
  async importOutput(session,{name,data,path,mime,origin}){
    let bytes;if(path){const roots=[this.store.project(session.projectId).path,join(this.root,'sessions',session.id)];path=resolve(roots[0],path);const root=roots.find(r=>inside(r,path));if(!root)throw new Error('输出媒体路径超出允许目录');const info=await this.inspect(path,root);bytes=await readFile(info.path);name??=basename(path);}else bytes=decodeMediaData(data);
    if(!name){const extension=Object.entries(formats).find(([,v])=>v[1]===mime)?.[0];if(!extension)throw new Error('输出媒体 MIME 未知');name='generated'+extension;}
    safeMediaName(name);const type=detectMedia(name,bytes);if(mime&&mime!==type.mime)throw new Error('输出媒体 MIME 与文件头不符');if(bytes.length>MEDIA_LIMITS[type.kind])throw new Error('输出媒体超过大小上限');
    const id=randomUUID(),root=join(this.root,'sessions',session.id);await mkdir(root,{recursive:true});await this.checked(this.root,root);const entry={id,name,...type,size:bytes.length,path:join(root,id+extname(name).toLowerCase()),root,sessionId:session.id};await writeFile(entry.path,bytes,{flag:'wx',mode:0o600});this.entries.set(id,entry);return {...this.public(entry),origin};
  }
  async resolve(sessionId,href){
    const s=this.store.session(sessionId);if(typeof href!=='string'||href.length>4096||/^https?:/i.test(href))return null;
    let path;try{const decoded=decodeURIComponent(href);if(decoded.split(/[\\/]/).includes('..'))return null;if(/^file:/i.test(href)){const u=new URL(href);if(u.hostname)return null;path=fileURLToPath(u);}else{if(/^[a-z][\w+.-]*:/i.test(href)&&! /^[a-z]:[\\/]/i.test(href))return null;path=resolve(this.store.project(s.projectId).path,decoded);}if(path.split(/[\\/]/).includes('..'))return null;
      const roots=[this.store.project(s.projectId).path,join(this.root,'sessions',s.id)],root=roots.find(r=>inside(r,path));if(!root)return null;const info=await this.inspectPreview(path,root),prior=[...this.entries.values()].find(e=>e.path===info.path),entry=prior??{...info,id:randomUUID(),root,name:basename(path),sessionId:s.id};this.entries.set(entry.id,entry);return this.public(entry);
    }catch{return null;}
  }
  async entry(url){if(typeof url!=='string'||!/^bridge-media:\/\/media\/[a-f0-9-]{36}$/.test(url))throw new Error('无效媒体地址');const e=this.entries.get(url.slice(url.lastIndexOf('/')+1));if(!e)throw new Error('媒体不存在');const info=await(e.previewOnly?this.inspectPreview(e.path,e.root):this.inspect(e.path,e.root));if(info.mime!==e.mime||info.size!==e.size)throw new Error('媒体文件已变化');return e;}
  async response(request){
    let handle;
    try{
      if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
      const e=await this.entry(request.url);handle=await open(await this.checked(e.root,e.path),'r');
      const {size}=await handle.stat(),headers={'content-type':e.mime,'accept-ranges':'bytes','cache-control':'no-store','x-content-type-options':'nosniff'};
      if(e.previewOnly)headers['content-security-policy']="default-src 'none'; script-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox";
      if(size!==e.size)throw new Error('媒体文件已变化');
      let start=0,end=size-1,status=200;const range=request.headers.get('range');
      if(range){
        const m=/^bytes=(\d*)-(\d*)$/.exec(range),invalid=()=>new Response(null,{status:416,headers:{...headers,'content-range':`bytes */${size}`}});
        if(!m||!m[1]&&!m[2])return invalid();
        if(!m[1])start=Math.max(0,size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}
        if(start>end||start>=size||!Number.isSafeInteger(start)||!Number.isSafeInteger(end))return invalid();
        status=206;headers['content-range']=`bytes ${start}-${end}/${size}`;
      }
      headers['content-length']=String(end-start+1);if(request.method==='HEAD')return new Response(null,{status,headers});
      const body=Readable.toWeb(handle.createReadStream({start,end,autoClose:true}));handle=null;
      return new Response(body,{status,headers});
    }catch{return new Response(null,{status:404});}finally{await handle?.close();}
  }
}
export {MEDIA_MIMES};
