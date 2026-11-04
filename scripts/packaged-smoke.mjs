import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../app/core/store.mjs';
const root=resolve(process.env.AWB_PACKAGE_ROOT??'release/win-unpacked/resources/app'),data=resolve('.runtime/packaged-services');await mkdir(data,{recursive:true});
const {ProviderService}=await import(pathToFileURL(join(root,'app/services/providers.mjs'))),{nativeNode,discoverRuntimes}=await import(pathToFileURL(join(root,'app/services/runtime-paths.mjs'))),{KimiAcpAdapter}=await import(pathToFileURL(join(root,'app/runtimes/kimi-acp.mjs')));
const store=await new Store(data).open(),providers=new ProviderService(store,nativeNode()),results=[];
try{for(const source of ['qoder','workbuddy'])try{const models=await providers.refresh(source);results.push({source,packaged:true,catalogCount:models.length,passed:models.length>0});}catch(e){results.push({source,packaged:true,passed:false,error:e.message});}
  const runtime=(await discoverRuntimes()).find(r=>r.id==='kimi');const session={id:'packaged-kimi-protocol',selection:{contextTokens:200000,reasoning:'low'}};let nativeId;const adapter=new KimiAcpAdapter({runtime,session,project:{path:data},dir:join(data,'kimi'),model:{name:'Packaged protocol fixture',reasoning:['low'],contextMaximum:200000,maxOutputTokens:8000},variant:{id:'fixture'},endpoint:{baseURL:'http://127.0.0.1:1/v1',key:'fixture'},emit:async()=>{},saveNative:async id=>{nativeId=id;}});
  try{await adapter.start();results.push({runtime:'kimi',packaged:true,protocolReady:!!nativeId,passed:!!nativeId});}catch(e){results.push({runtime:'kimi',packaged:true,passed:false,error:e.message});}finally{await adapter.close();}
}finally{await providers.close();await store.close();}
await writeFile(join(data,'result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;
