import {readFile,open,stat} from 'node:fs/promises';
import {promisify} from 'node:util';

async function originalFileSystem({electronVersion=process.versions.electron,loadOriginalFs=()=>import('original-fs')}={}){
  if(electronVersion)try{const module=await loadOriginalFs();return module.default??module;}catch{/* Plain Node distributions do not provide original-fs. */}
  return null;
}

// Read the archive itself as bytes/text. Electron's normal fs must remain
// enabled for concurrent reads inside Bridge++'s own packaged application.
export async function readExternalAsar(path,{electronVersion=process.versions.electron,loadOriginalFs=()=>import('original-fs'),nodeReadFile=readFile}={}){
  const originalFs=await originalFileSystem({electronVersion,loadOriginalFs});
  if(originalFs)return promisify(originalFs.readFile.bind(originalFs))(path,'utf8');
  return nodeReadFile(path,'utf8');
}

// Bounded binary reads and physical file checks must bypass Electron's asar
// virtualization too. Never disable asar support globally (process.noAsar).
export async function openExternalAsar(path,{nodeOpen=open,...options}={}){
  const originalFs=await originalFileSystem(options);
  if(!originalFs)return nodeOpen(path,'r');
  if(originalFs.promises?.open)return originalFs.promises.open(path,'r');
  const fd=await promisify(originalFs.open.bind(originalFs))(path,'r');
  return {
    read(buffer,offset,length,position){return new Promise((resolve,reject)=>originalFs.read(fd,buffer,offset,length,position,(error,bytesRead)=>error?reject(error):resolve({buffer,bytesRead})));},
    close:()=>promisify(originalFs.close.bind(originalFs))(fd)
  };
}
export async function statExternalAsar(path,{nodeStat=stat,...options}={}){
  const originalFs=await originalFileSystem(options);
  if(originalFs?.promises?.stat)return originalFs.promises.stat(path);
  return originalFs?promisify(originalFs.stat.bind(originalFs))(path):nodeStat(path);
}
export async function externalAsarHasFile(path,entry,options={}){
 let file;try{
  file=await openExternalAsar(path,options);const header=Buffer.alloc(16);if((await file.read(header,0,16,0)).bytesRead!==16)return false;
  const size=header.readUInt32LE(12);if(!size||size>16*1024*1024)return false;const bytes=Buffer.alloc(size);if((await file.read(bytes,0,size,16)).bytesRead!==size)return false;
  let node=JSON.parse(bytes.toString('utf8'));for(const name of entry.split('/'))node=node?.files?.[name];return !!node&&!node.files&&!node.link;
 }catch{return false;}finally{await file?.close();}
}
