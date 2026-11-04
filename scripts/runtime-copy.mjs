import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {stat,readdir,mkdir,copyFile} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
async function digest(file){const hash=createHash('sha256');for await(const bytes of createReadStream(file))hash.update(bytes);return hash.digest('hex');}
export async function sameContent(source,target){try{const [a,b]=await Promise.all([stat(source),stat(target)]);return a.isFile()&&b.isFile()&&a.size===b.size&&await digest(source)===await digest(target);}catch(error){if(error.code==='ENOENT')return false;throw error;}}
export async function copyRuntimeFile(source,target,{copy=copyFile}={}){
 if(resolve(source)===resolve(target)||await sameContent(source,target))return false;
 await mkdir(dirname(target),{recursive:true});
 try{await copy(source,target);}catch(error){if(['EBUSY','EPERM','EACCES','ETXTBSY'].includes(error.code))throw new Error(`无法更新运行时 ${target}：文件被占用或不可写，请先停止对外接口服务后重新构建。`,{cause:error});throw error;}return true;
}
export async function copyRuntimeDirectory(source,target,options){if(resolve(source)===resolve(target))return;await mkdir(target,{recursive:true});for(const entry of await readdir(source,{withFileTypes:true})){const from=join(source,entry.name),to=join(target,entry.name);if(entry.isDirectory())await copyRuntimeDirectory(from,to,options);else if(entry.isFile())await copyRuntimeFile(from,to,options);else throw new Error('运行时目录含不支持的链接：'+from);}}
