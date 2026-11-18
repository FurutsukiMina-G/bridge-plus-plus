import {createHash} from 'node:crypto';
import {mkdir,readdir,rm,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const maxBytes=128*1024*1024;
const generationName=/^[a-f0-9]{16}$/;

async function cacheFiles(directory){
  const entries=await readdir(directory,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    const path=join(directory,entry.name);
    if(entry.isDirectory())files.push(...await cacheFiles(path).catch(()=>[]));
    else if(entry.isFile()){
      const info=await stat(path).catch(()=>null);
      if(info)files.push({path,size:info.size,mtime:info.mtimeMs});
    }
  }
  return files;
}

export async function prepareProviderCompileCache(userData,version,{limit=maxBytes}={}){
  const root=resolve(userData,'provider-compile-cache');
  const generation=createHash('sha256').update(version).digest('hex').slice(0,16);
  const directory=join(root,generation);
  await mkdir(directory,{recursive:true});
  for(const entry of await readdir(root,{withFileTypes:true})){
    if(entry.isDirectory()&&generationName.test(entry.name)&&entry.name!==generation)
      await rm(join(root,entry.name),{recursive:true,force:true}).catch(()=>{});
  }
  const files=await cacheFiles(directory);
  let total=files.reduce((sum,file)=>sum+file.size,0);
  for(const file of files.sort((a,b)=>a.mtime-b.mtime)){
    if(total<=limit)break;
    await rm(file.path,{force:true}).then(()=>{total-=file.size;},()=>{});
  }
  return directory;
}
