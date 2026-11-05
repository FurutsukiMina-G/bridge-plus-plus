import {realpath,lstat,stat,open} from 'node:fs/promises';
import {isAbsolute,relative,resolve,join,basename,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {contained,readProjectFile} from '../core/projects.mjs';
const outside=()=>({inside:false,exists:false,kind:null,relative:null,absolute:null,size:null,preview:null,openable:false});
const images=new Set(['.png','.jpg','.jpeg','.gif','.webp','.bmp','.svg']);
const openable=new Set(['.txt','.md','.markdown','.log','.csv','.tsv','.json','.jsonc','.yaml','.yml','.toml','.ini','.cfg','.conf','.xml','.html','.htm','.ts','.tsx','.jsx','.css','.scss','.less','.c','.h','.cpp','.hpp','.cc','.java','.kt','.go','.rs','.cs','.swift','.sql','.vue','.svelte','.png','.jpg','.jpeg','.gif','.webp','.bmp','.ico','.tif','.tiff','.svg','.avif','.heic','.mp3','.wav','.flac','.ogg','.m4a','.aac','.mp4','.webm','.mkv','.mov','.avi','.pdf','.docx','.xlsx','.pptx','.odt','.ods','.odp','.rtf','.epub','.zip','.7z','.rar','.tar','.gz']);
const extensionOf=path=>extname(basename(path).replace(/[ .]+$/,'')).toLowerCase();
async function projectLink(root,path){
 if(typeof path!=='string'||!path||path.length>4096||path.includes('\0'))throw new Error('无效项目路径');const base=await realpath(root),rel=isAbsolute(path)?relative(base,resolve(path))||'.':path;
 const target=await contained(base,rel,{create:true,missingParents:true});
 // realpath cannot resolve dangling links. Do not treat one as a missing file
 // inside the project merely because its nearest existing parent is inside.
 let current=base;for(const part of relative(base,resolve(base,rel)).split(/[\\/]/).filter(Boolean)){current=join(current,part);let info;try{info=await lstat(current);}catch(error){if(error.code==='ENOENT')break;throw error;}if(info.isSymbolicLink())await realpath(current);}
 return {base,target,relative:relative(base,target).replaceAll('\\','/')||'.'};
}
export async function locateProjectFile(root,path){
 let link;try{link=await projectLink(root,path);}catch{return outside();}let info;try{info=await stat(link.target);}catch(error){if(error.code==='ENOENT')return {inside:true,exists:false,kind:null,relative:link.relative,absolute:link.target,size:null,preview:null,openable:false};throw new Error('无法读取项目内文件信息');}
 const kind=info.isFile()?'file':info.isDirectory()?'directory':null,extension=extensionOf(link.target);let preview=null;
 if(kind==='file'){if(images.has(extension))preview='image';else if(extension==='.pdf')preview='pdf';else if(info.size<=2*1024*1024)try{await readProjectFile(link.base,link.relative);preview='text';}catch{}}
 return {inside:true,exists:true,kind,relative:link.relative,absolute:link.target,size:info.size,preview,openable:kind==='directory'||kind==='file'&&openable.has(extension)};
}
async function required(root,path){const value=await locateProjectFile(root,path);if(!value.inside)throw new Error('文件路径不在项目内，已拒绝操作');if(!value.exists)throw new Error('项目内文件不存在');if(!['file','directory'].includes(value.kind))throw new Error('此项目路径不是普通文件或目录');return value;}
/** Links come from model output: only a plain web address may reach the browser. */
export function webUrl(value){
 if(typeof value!=='string'||!value||value.length>8192)throw new Error('无效链接');let url;try{url=new URL(value);}catch{throw new Error('无效链接');}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('只能打开 http 或 https 链接');return url.href;
}
export function fileOperationMethods(store,{shell,createWindow}={}){
 const root=projectId=>{if(typeof projectId!=='string'||!projectId)throw new Error('请选择有效项目');return store().project(projectId).path;};
 return {
  'link:open':async({url})=>{await shell.openExternal(webUrl(url));return true;},
  'file:locate':({projectId,path})=>locateProjectFile(root(projectId),path),
  'file:reveal':async({projectId,path})=>{const file=await required(root(projectId),path);shell.showItemInFolder(file.absolute);return true;},
  'file:open':async({projectId,path})=>{const file=await required(root(projectId),path),extension=extensionOf(file.absolute);if(file.kind==='file'&&!file.openable)throw new Error(`安全限制：不能用默认应用打开 ${extension||'没有扩展名的'} 文件，可以在资源管理器中查看`);const error=await shell.openPath(file.absolute);if(error)throw new Error('默认应用打开失败：'+error);return true;},
  'file:previewPdf':async({projectId,path})=>{
   const file=await required(root(projectId),path);if(file.kind!=='file'||extname(file.absolute).toLowerCase()!=='.pdf')throw new Error('此预览只接受项目内的 PDF 文件');const handle=await open(file.absolute,'r');try{const header=Buffer.alloc(5);await handle.read(header,0,5,0);if(header.toString()!=='%PDF-')throw new Error('文件头不是有效的 PDF，已拒绝预览');}finally{await handle.close();}
   const window=createWindow({title:basename(file.absolute),width:1000,height:800,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,plugins:true,webviewTag:false}}),url=pathToFileURL(file.absolute).href;
   window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(event,target)=>{if(target!==url)event.preventDefault();});window.webContents.on('will-attach-webview',event=>event.preventDefault());
   try{await window.loadFile(file.absolute);}catch(error){window.destroy();throw new Error('PDF 预览失败：'+error.message);}return true;
  }
 };
}
