import {load,JSON_SCHEMA} from 'js-yaml';
import {randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {mkdir,open,rm,realpath,stat,readFile,rename} from 'node:fs/promises';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {withIdleResponse,httpsUrl} from './download-stream.mjs';
export {httpsUrl};
export const ENVIRONMENT_IDS=['dsh','kimi','codex','claude','antigravity'];
export const DSH_FEED='https://download.deepseek.com/dsh-desk/feeds/win-x64/';
export const NPM_REGISTRIES=['https://registry.npmmirror.com','https://registry.npmjs.org'];
export const DAY_MS=24*60*60*1000;
export function environmentId(id){if(!ENVIRONMENT_IDS.includes(id))throw new Error('未知开发环境');return id;}
export function publicPage(value){try{return httpsUrl(typeof value==='string'?value:value?.url).href;}catch{return null;}}
export function versionText(value){return /\b\d+\.\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9.-]+)?/.exec(String(value))?.[0]??null;}
export function yaml(text){try{return load(text,{schema:JSON_SCHEMA});}catch{throw new Error('无法解析更新源 YAML');}}
export function parseDshFeed(text,base){
 const doc=yaml(text),file=Array.isArray(doc?.files)?doc.files.find(f=>typeof f?.url==='string'&&/\.exe(?:$|\?)/i.test(f.url)):null,path=file?.url??doc?.path,sha512=file?.sha512??doc?.sha512,size=file?.size??doc?.size;
 if(typeof doc?.version!=='string'||!versionText(doc.version)||typeof path!=='string'||!path||typeof sha512!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(sha512)||Buffer.from(sha512,'base64').length!==64||!Number.isSafeInteger(size)||size<=0||size>2*1024**3)throw new Error('DSH 更新 feed 缺少有效的版本、安装文件、sha512 或大小');
 const url=httpsUrl(new URL(path,base).href);if(!/\.exe$/i.test(url.pathname))throw new Error('DSH 更新文件不是 exe 安装程序');return {version:doc.version,url:url.href,sha512,size};
}
export function verifyDownload(bytes,expected){const digest=createHash('sha512').update(bytes).digest(),given=Buffer.from(expected.sha512,'base64');if(bytes.length!==expected.size)throw new Error('安装文件大小校验失败');if(given.length!==digest.length||!timingSafeEqual(given,digest))throw new Error('安装文件 sha512 校验失败');}
export async function request(fetchImpl,url,{signal,timeoutMs=30000,...init}={}){
 try{const response=await fetchImpl(httpsUrl(url).href,{...init,credentials:'omit',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs)});if(!response.ok)throw new Error('HTTP '+response.status);return response;}catch(error){if(signal?.aborted)throw new DOMException('已取消','AbortError');if(error.name==='TimeoutError')throw new Error('网络请求超时，请检查网络或系统代理');throw new Error('网络请求失败，请检查网络或系统代理（'+(String(error.message).match(/HTTP \d+/)?.[0]??'连接失败')+'）');}
}
export async function responseBytes(response,{limit=8*1024*1024,signal,onProgress=()=>{},total=Number(response.headers.get('content-length'))||null}={}){let size=0;const chunks=[];for await(const chunk of response.body){signal?.throwIfAborted();size+=chunk.length;if(size>limit)throw new Error('下载内容超过允许大小');chunks.push(Buffer.from(chunk));onProgress(size,total);}return Buffer.concat(chunks);}
export async function downloadDsh(fetchImpl,url,dir,expected,{signal,onProgress,idleTimeoutMs=60000}={}){
 await mkdir(dir,{recursive:true});const file=join(dir,randomUUID()+'.exe.part'),handle=await open(file,'wx',0o600);let size=0;const hash=createHash('sha512');
 try{await withIdleResponse(fetchImpl,url,{signal,idleTimeoutMs,headers:{'accept-encoding':'identity'}},async(_response,chunks)=>{for await(const chunk of chunks){size+=chunk.length;if(size>expected.size)throw new Error('安装文件大小校验失败');hash.update(chunk);await handle.writeFile(chunk);onProgress?.(size,expected.size);}});await handle.close();const digest=hash.digest(),given=Buffer.from(expected.sha512,'base64');if(size!==expected.size)throw new Error('安装文件大小校验失败');if(given.length!==digest.length||!timingSafeEqual(given,digest))throw new Error('安装文件 sha512 校验失败');const ready=file.replace(/\.part$/,'');await rename(file,ready);return ready;}catch(error){await handle.close().catch(()=>{});await rm(file,{force:true}).catch(()=>{});throw error;}
}
export const contained=(root,path)=>{const rel=relative(resolve(root),resolve(path));return rel!==''&&!isAbsolute(rel)&&!rel.split(/[\\/]/).includes('..');};
export async function removeManaged(root,path){if(!contained(root,path)||!contained(await realpath(root),await realpath(path)))throw new Error('环境临时目录超出受管范围，未删除');await rm(path,{recursive:true,force:true,maxRetries:3,retryDelay:100});}
