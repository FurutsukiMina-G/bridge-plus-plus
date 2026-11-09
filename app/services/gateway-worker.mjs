import {join} from 'node:path';
import {mkdir,readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {ROOT} from './providers.mjs';
import {bridgePromptConfig} from './runtime-prompts.mjs';
import {CatalogVerifier} from './catalog-verifier.mjs';
import {workbuddyEnvironment} from './provider-environment.mjs';
import {registerSourcePackage} from './source-loader.mjs';
const source=process.argv[2],runtimeId=process.argv[3],prompts=bridgePromptConfig(runtimeId),dir=process.env.AWB_PROVIDER_DIR;await mkdir(dir,{recursive:true});process.chdir(dir);
let text='';for await(const data of process.stdin)text+=data;const key=randomBytes(32).toString('hex');
let handle,registerModels;
try{
  await registerSourcePackage(source);
  const {models}=JSON.parse(text);
  if(!Array.isArray(models)||!models.length||models.some(row=>row.model?.source!==source||row.runtimeId!==runtimeId))throw new Error('Worker requires a non-empty catalog for its exact source/runtime');
  if(source==='qoder'){
    const base=join(ROOT,'bridges/qoderbridge/dist/src');const {registerBridgeModels}=await import(pathToFileURL(join(base,'model.js')));const {createBridgeServer}=await import(pathToFileURL(join(base,'server.js')));const {findQoderCli}=await import('./runtime-paths.mjs');
    registerModels=rows=>registerBridgeModels(rows.map(({model,variant})=>({id:variant.id,runtimeId:model.id,name:model.name,images:model.images===true,contextWindow:variant.contextWindow,maxTokens:variant.maxTokens,efforts:variant.efforts,expectedModelName:model.name})));registerModels(models);
    handle={server:await createBridgeServer({auth:'auto',timeout:300000,...prompts.qoder,strategy:'permission',cliPath:await findQoderCli()??undefined,isolationCacheDir:dir,sessionSettings:await readFile(join(ROOT,'bridges/qoderbridge/config/thin-cn.json'),'utf8'),cacheUsage:'none',decisionRetries:1,reasoningGuardTokens:0},{port:0,key,reportDir:join(dir,'reports'),prewarmModel:models[0].variant.id,telemetry:process.env.AWB_METADATA_ONLY!=='1'})};
  }else{
    const base=join(ROOT,'bridges/workbuddy-bridge');const {config}=await import(pathToFileURL(join(base,'src/config.mjs')));const {AuthManager}=await import(pathToFileURL(join(base,'src/auth.mjs')));const {SdkTransport}=await import(pathToFileURL(join(base,'src/sdk-transport.mjs')));const {createBridge}=await import(pathToFileURL(join(base,'src/server.mjs')));const {F:Client}=await import(pathToFileURL(join(base,'vendor/workbuddy-connect-4.13.0.mjs')));
    const cfg={...config(workbuddyEnvironment(dir)),...prompts.workbuddy,root:base,decisionRetries:1};const client=new Client(),auth=new AuthManager({...cfg,refresh:c=>client.refreshToken(c)}),transport=new SdkTransport(cfg,auth);
    const verifier=new CatalogVerifier(async()=>client.fetchModels(await auth.get(),AbortSignal.timeout(20000),{allModels:true}));
    const infos=models.map(({model,variant})=>({...model.raw,publicModels:[{...variant,reasoningEfforts:Object.fromEntries(variant.efforts.map(e=>[e,e]))}]}));
    const provider={model:infos[0],lastError:null,ready:async()=>infos[0],chat:(body,signal,context)=>transport.chat(body,signal,context),close:()=>transport.close(),status:()=>({catalog:'AgentWorkbench discovered identities',sdk:transport.metrics})};
    // Each inbound request resolves against the complete verified catalog; no provider/model fallback.
    const catalog={...infos[0],publicModels:infos.flatMap(i=>i.publicModels)};provider.ready=async({model}={})=>model?(infos.find(i=>i.publicModels.some(m=>m.id===model))??Promise.reject(new Error('Unknown model'))):catalog;
    registerModels=rows=>{verifier.invalidate();for(const {model,variant}of rows){const info={...model.raw,publicModels:[{...variant,reasoningEfforts:Object.fromEntries(variant.efforts.map(e=>[e,e]))}]};const index=infos.findIndex(i=>i.publicModels[0].id===variant.id);if(index<0)infos.push(info);else infos[index]=info;}catalog.publicModels=infos.flatMap(i=>i.publicModels);};
    provider.chat=async(body,signal,context)=>{const exact=infos.find(i=>i.publicModels.some(m=>m.id===body.bridge_public_model));if(!exact)throw new Error('Unknown WorkBuddy identity');await verifier.verify(exact.id,exact.name);signal.throwIfAborted();return transport.chat({...body,model:exact.id,bridge_native_context_window:exact.contextWindow},signal,context);};
    // The existing server reads info.id while parsing the stream. Override the alias with the request model.
    catalog.id=infos[0].id;
    handle=createBridge({cfg,provider,key,instanceId:randomUUID(),...process.env.AWB_METADATA_ONLY==='1'?{log:async()=>{}}:{}});await new Promise((resolve,reject)=>{handle.server.once('error',reject);handle.server.listen(0,'127.0.0.1',resolve);});
  }
  if(!handle.server.listening)await new Promise((resolve,reject)=>{handle.server.once('error',reject);handle.server.listen(0,'127.0.0.1',resolve);});
  process.on('message',message=>{if(message?.type!=='catalog')return;try{if(!Array.isArray(message.models)||message.models.some(row=>row.model?.source!==source||row.runtimeId!==runtimeId))throw new Error('Invalid catalog update');registerModels(message.models);process.send?.({type:'catalog-updated',requestId:message.requestId});}catch(error){process.send?.({type:'catalog-error',requestId:message.requestId,error:error.message});}});
  process.on('disconnect',()=>{void handle.close?.();handle.server.closeAllConnections();handle.server.close();});
  process.stdout.write(JSON.stringify({type:'ready',url:`http://127.0.0.1:${handle.server.address().port}`,key})+'\n');
}catch(e){process.stdout.write(JSON.stringify({type:'error',error:e.message})+'\n');process.exitCode=1;}
