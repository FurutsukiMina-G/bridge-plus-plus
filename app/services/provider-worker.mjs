import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {workbuddyEnvironment} from './provider-environment.mjs';
import {registerSourcePackage} from './source-loader.mjs';
import {failureDetails,failureText} from './failure-details.mjs';
import {isTransientAccountNetworkError,workbuddyAccountError} from './providers.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
// Same contract as the bridge's InputQueue, kept local so a packaged worker
// never depends on a bridge file that may not ship beside it.
class InputQueue{
  constructor(){this.items=[];this.ended=false;this.wake=null;}
  push(item){if(this.ended)throw new Error('Input stream is closed');this.items.push(item);this.wake?.();}
  close(){this.ended=true;this.wake?.();}
  async *[Symbol.asyncIterator](){
    for(;;){
      if(this.items.length){yield this.items.shift();continue;}
      if(this.ended)return;
      await new Promise(resolve=>{this.wake=resolve;});
      this.wake=null;
    }
  }
}
const [source,action]=process.argv.slice(2);
const dir=process.env.AWB_PROVIDER_DIR;if(!dir)throw new Error('AWB_PROVIDER_DIR required');
await mkdir(dir,{recursive:true});process.chdir(dir);
const input=[];for await(const chunk of process.stdin)input.push(Buffer.from(chunk));
const payload=JSON.parse(Buffer.concat(input).toString('utf8')||'{}');
try{
  await registerSourcePackage(source);
  if(action==='search'){const {nativeSearch}=await import('./native-search.mjs');const result=await nativeSearch(source,payload.query,{directory:dir,root});process.stdout.write(JSON.stringify({type:'result',ok:true,value:result})+'\n');}
  else{
  if(!['catalog','account'].includes(action))throw new Error('Unknown provider action');
  // Models and the account balance share one native runtime session: no second
  // process is started just to read quota.
  const qoderSession=async withModels=>{
    const client=await import(pathToFileURL(join(root,'bridges/qoderbridge/dist/src/client.js')));
    const {startup}=await import('@qodercn-ai/qodercn-agent-sdk');
    const {findQoderCli}=await import('../services/runtime-paths.mjs');
    const cli=await findQoderCli(),controller=new AbortController(),queue=new InputQueue(),timer=setTimeout(()=>controller.abort(),80000);
    let warm;
    try{
      // baseOptions resolves its cwd against this worker directory.
      await mkdir('.runtime',{recursive:true});
      const options=client.baseOptions({auth:'auto',timeout:80000,strategy:'permission',system:'Discover model capabilities. Do not infer.',cliPath:cli??undefined,sessionSettings:await readFile(join(root,'bridges/qoderbridge/config/thin-cn.json'),'utf8')},controller);
      warm=await startup({options,initializeTimeoutMs:80000});
      const q=warm.query(queue);await q.initializationResult();
      const models=withModels?await q.getAvailableModels():null;
      let usage=null,error=null;
      // A balance failure must never discard a catalog that was already listed.
      try{usage=await q.getUsageInfo()??null;}catch(e){error=failureText(e)||'积分查询失败';}
      return {models,usage,error};
    }finally{clearTimeout(timer);queue.close();warm?.close();controller.abort();}
  };
  let models=null,account=null,accountError=null;
  if(source==='qoder'){
    const result=await qoderSession(action==='catalog');
    models=result.models;account=result.usage;accountError=result.error;
  }else if(source==='workbuddy'){
    const {config}=await import(pathToFileURL(join(root,'bridges/workbuddy-bridge/src/config.mjs')));
    const {AuthManager}=await import(pathToFileURL(join(root,'bridges/workbuddy-bridge/src/auth.mjs')));
    const {F:Client}=await import(pathToFileURL(join(root,'bridges/workbuddy-bridge/vendor/workbuddy-connect-4.13.0.mjs')));
    // The first cold connection of a process to the WorkBuddy hosts can exceed undici's fixed connect
    // window; the attempt itself warms the path and a repeat succeeds. Retry only that transient family,
    // then store a Chinese reason instead of the opaque Node text.
    const withNetworkRetry=async fn=>{for(let attempt=0;;attempt++){try{return await fn();}catch(e){if(attempt<2&&isTransientAccountNetworkError(e)){await new Promise(resolve=>setTimeout(resolve,1200));continue;}throw e;}}};
    const cfg=config(workbuddyEnvironment(dir)),client=new Client();const auth=new AuthManager({...cfg,refresh:c=>client.refreshToken(c)}),credential=await withNetworkRetry(()=>auth.get());
    if(action==='catalog')models=await withNetworkRetry(()=>client.fetchModels(credential,AbortSignal.timeout(25000),{allModels:true}));
    let credits=null,checkin=null;
    try{credits=await withNetworkRetry(()=>client.fetchCredits(credential));}catch(e){accountError=workbuddyAccountError(e);}
    // Check-in is optional; a failure there leaves only that field null.
    try{checkin=await client.fetchCheckinStatus(credential);}catch{}
    account=credits||checkin?{credits,checkin}:null;
  }else throw new Error('Unknown source');
  process.stdout.write(JSON.stringify({type:'result',ok:true,value:{models,account,accountError}})+'\n');
  }
}catch(e){const details=failureDetails({...e,message:failureText(e)});process.stdout.write(JSON.stringify({type:'result',ok:false,error:details.message,details})+'\n');process.exitCode=1;}
