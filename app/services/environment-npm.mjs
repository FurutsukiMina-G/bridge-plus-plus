import {access,readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,dirname,resolve,delimiter} from 'node:path';
import {homedir} from 'node:os';
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {httpsUrl} from './environment-utils.mjs';
import {withIdleResponse} from './download-stream.mjs';
export async function findNpmCli({root=resolve(import.meta.dirname,'../..'),resources=process.resourcesPath,node=process.execPath}={}){
 const roots=[join(root,'node_modules/npm'),join(root,'assets/runtime/npm'),resources&&join(resources,'runtime/npm'),join(dirname(node),'node_modules/npm'),...String(process.env.PATH??'').split(delimiter).filter(Boolean).map(path=>join(path,'node_modules/npm')),join(homedir(),'scoop/apps/nvm/current/nodejs/nodejs/node_modules/npm')].filter(Boolean);
 for(const directory of roots)try{const meta=JSON.parse(await readFile(join(directory,'package.json'),'utf8')),cli=join(directory,'bin/npm-cli.js');if(meta.name==='npm'){await access(cli);return {directory,cli,version:meta.version};}}catch{}return null;
}
// npm resolves/extracts dependencies locally; every remote byte goes through
// Electron net.fetch, including redirected tarballs, so the system proxy works.
export async function npmRegistryProxy({registry,fetchImpl,signal,onProgress=()=>{},idleTimeoutMs=60000,qoderRuntime=false}){
 const origin=httpsUrl(registry).origin,token=randomBytes(24).toString('hex'),active=new Set();let received=0;
 const rewrite=(value,base)=>{if(Array.isArray(value))return value.map(v=>rewrite(v,base));if(value&&typeof value==='object'){const result={...value};if(result.dist?.tarball){const target=httpsUrl(result.dist.tarball).href;result.dist={...result.dist,tarball:base+'tarball/'+encodeURIComponent(target)};}for(const key of Object.keys(result))if(key!=='dist')result[key]=rewrite(result[key],base);return result;}return value;};
 const server=createServer((req,res)=>{const controller=new AbortController();active.add(controller);const downloadSignal=signal?AbortSignal.any([signal,controller.signal]):controller.signal;res.on('close',()=>{if(!res.writableEnded)controller.abort();});void(async()=>{if(req.method!=='GET'||req.headers.origin!==undefined||!/^127\.0\.0\.1:\d+$/.test(req.headers.host??'')||!req.url?.startsWith('/'+token+'/')){res.writeHead(403);res.end();return;}const path=req.url.slice(token.length+2);const tar=path.startsWith('tarball/'),target=tar?httpsUrl(decodeURIComponent(path.slice(8))).href:origin+'/'+path;
   // Tarball destinations are supplied by registry metadata, not renderer IPC.
   if(tar&&!knownTarballs.has(target)){res.writeHead(403);res.end();return;}
   const worker=path.startsWith('qoder-runtime/');if(worker&&(!qoderRuntime||!/^qoder-runtime\/releases\/1\.1\.64\/qoderclicn-worker-runtime-(?:win32|darwin|linux)-(?:x64|arm64)\.tgz(?:\.sha256)?$/.test(path))){res.writeHead(403);res.end();return;}
   const remote=worker?'https://static.qoder.com.cn/qoder-cli-cn/'+path.slice('qoder-runtime/'.length):target;
   const bytes=await withIdleResponse(fetchImpl,remote,{signal:downloadSignal,idleTimeoutMs},async(_response,chunks)=>{const buffers=[];let size=0;for await(const chunk of chunks){size+=chunk.length;if(size>(tar||worker?150*1024*1024:16*1024*1024))throw new Error('下载内容超过允许大小');buffers.push(Buffer.from(chunk));received+=chunk.length;onProgress(received,null);}return Buffer.concat(buffers);});
   if(tar||worker){res.setHeader('content-type','application/octet-stream');res.end(bytes);}else{const data=JSON.parse(bytes.toString('utf8'));const collect=value=>{if(value&&typeof value==='object'){if(value.dist?.tarball)knownTarballs.add(httpsUrl(value.dist.tarball).href);for(const v of Object.values(value))if(v&&typeof v==='object')collect(v);}};collect(data);res.setHeader('content-type','application/json');res.end(JSON.stringify(rewrite(data,base)));}
 })().catch(()=>{if(!res.headersSent)res.writeHead(502);res.end();}).finally(()=>active.delete(controller));});const knownTarballs=new Set();await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});const base='http://127.0.0.1:'+server.address().port+'/'+token+'/';return {base,allowTarball(target){knownTarballs.add(httpsUrl(target).href);},async close(){for(const controller of active)controller.abort();server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
export async function installPackageNpm({directory,package:packageName,version,registry,node,npm,fetchImpl,execute,signal,onProgress,scripts=false,qoderRuntime=false,lock}){
 const locked=lock?JSON.parse(await readFile(lock,'utf8')):null,dependencies=locked?.packages?.['']?.dependencies;if(locked&&dependencies?.[packageName]!==version)throw new Error('组件锁定文件与需要的包版本不一致');
 if(!/^(@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/.test(packageName)||!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version))throw new Error('无效的受管 npm 包或版本');
 await mkdir(directory,{recursive:true});const userRc=join(directory,'user.npmrc'),globalRc=join(directory,'global.npmrc');await writeFile(userRc,'',{mode:0o600});await writeFile(globalRc,'',{mode:0o600});await writeFile(join(directory,'package.json'),JSON.stringify({private:true,...locked?{dependencies}:{}}));await writeFile(join(directory,'.npmrc'),'');
 const proxy=await npmRegistryProxy({registry,fetchImpl,signal,onProgress,qoderRuntime});
 // Qoder's official postinstall downloads its Worker outside the registry. Its
 // supported mirror override routes that archive and checksum through net.fetch too.
 const systemRoot=process.env.SystemRoot??process.env.WINDIR??'C:\\Windows';
 const env={...node.env,PATH:[dirname(node.command),...(process.platform==='win32'?[join(systemRoot,'System32'),systemRoot]:String(process.env.PATH??'').split(delimiter))].join(delimiter),HTTP_PROXY:'',HTTPS_PROXY:'',ALL_PROXY:'',http_proxy:'',https_proxy:'',all_proxy:'',NO_PROXY:'127.0.0.1,localhost',npm_config_proxy:'',npm_config_https_proxy:'',npm_config_ignore_scripts:scripts?'false':'true',npm_config_offline:'false',QODER_SKIP_DOWNLOAD:undefined,QODER_SKIP_CHECKSUM:undefined,QODER_WORKER_RUNTIME_URL:undefined,QODER_CLI_VERSION:undefined,QODER_CLI_PLATFORM:undefined,QODER_INSTALL_BUNDLED_CLI:undefined,QODER_CLI_MIRROR:qoderRuntime?proxy.base+'qoder-runtime':undefined};
 try{
  if(locked){const origin=httpsUrl(registry).origin,rewriteUrl=value=>{const source=httpsUrl(value).href,url=new URL(source),mirror=url.origin==='https://registry.npmjs.org'?origin+url.pathname+url.search+url.hash:source;proxy.allowTarball(mirror);return proxy.base+'tarball/'+encodeURIComponent(mirror);},rewrite=value=>{if(Array.isArray(value))return value.map(rewrite);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='resolved'&&typeof item==='string'?rewriteUrl(item):rewrite(item)]));return value;};await writeFile(join(directory,'package-lock.json'),JSON.stringify(rewrite(locked)));
   const result=await execute(node.command,[...node.args,npm.cli,'ci','--prefix',directory,'--registry',proxy.base,'--userconfig',userRc,'--globalconfig',globalRc,'--cache',join(directory,'.npm-cache'),'--noproxy=127.0.0.1,localhost','--ignore-scripts','--engine-strict','--no-audit','--no-fund','--fetch-timeout=0'],{cwd:directory,signal,timeoutMs:0,env:{...env,npm_config_ignore_scripts:'true'}});if(result.code!==0||!qoderRuntime)return result;
   return await execute(node.command,[...node.args,npm.cli,'rebuild',packageName,'--prefix',directory,'--registry',proxy.base,'--userconfig',userRc,'--globalconfig',globalRc,'--cache',join(directory,'.npm-cache'),'--noproxy=127.0.0.1,localhost','--ignore-scripts=false','--foreground-scripts','--engine-strict','--no-audit','--no-fund'],{cwd:directory,signal,timeoutMs:0,env:{...env,npm_config_ignore_scripts:'false'}});
  }
  return await execute(node.command,[...node.args,npm.cli,'install','--prefix',directory,'--registry',proxy.base,'--userconfig',userRc,'--globalconfig',globalRc,'--cache',join(directory,'.npm-cache'),'--noproxy=127.0.0.1,localhost',scripts?'--ignore-scripts=false':'--ignore-scripts',...(scripts?['--foreground-scripts']:['--omit=optional']),'--engine-strict','--no-audit','--no-fund','--no-save','--no-package-lock','--fetch-timeout=0',`${packageName}@${version}`],{cwd:directory,signal,timeoutMs:0,env});
 }finally{await proxy.close();}
}
export function installKimiNpm(options){return installPackageNpm({...options,package:'@moonshot-ai/kimi-code',scripts:false});}
