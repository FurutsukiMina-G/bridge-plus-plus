import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {workbuddyEnvironment} from './provider-environment.mjs';
import {registerSourcePackage} from './source-loader.mjs';
import {failureDetails,failureText} from './failure-details.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const [source,action]=process.argv.slice(2);
const dir=process.env.AWB_PROVIDER_DIR;if(!dir)throw new Error('AWB_PROVIDER_DIR required');
await mkdir(dir,{recursive:true});process.chdir(dir);
const input=[];for await(const chunk of process.stdin)input.push(Buffer.from(chunk));
const payload=JSON.parse(Buffer.concat(input).toString('utf8')||'{}');
try{
  await registerSourcePackage(source);
  if(action==='search'){const {nativeSearch}=await import('./native-search.mjs');const result=await nativeSearch(source,payload.query,{directory:dir,root});process.stdout.write(JSON.stringify({type:'result',ok:true,value:result})+'\n');}
  else{
  if(action!=='catalog')throw new Error('Unknown provider action');
  let models;
  if(source==='qoder'){
    const {discover}=await import(pathToFileURL(join(root,'bridges/qoderbridge/dist/src/client.js')));
    const {findQoderCli}=await import('../services/runtime-paths.mjs');
    const cli=await findQoderCli();
    const result=await discover({auth:'auto',timeout:80000,strategy:'permission',system:'Discover model capabilities. Do not infer.',cliPath:cli??undefined,sessionSettings:await readFile(join(root,'bridges/qoderbridge/config/thin-cn.json'),'utf8')});models=result.models;
  }else if(source==='workbuddy'){
    const {config}=await import(pathToFileURL(join(root,'bridges/workbuddy-bridge/src/config.mjs')));
    const {AuthManager}=await import(pathToFileURL(join(root,'bridges/workbuddy-bridge/src/auth.mjs')));
    const {F:Client}=await import(pathToFileURL(join(root,'bridges/workbuddy-bridge/vendor/workbuddy-connect-4.13.0.mjs')));
    const cfg=config(workbuddyEnvironment(dir)),client=new Client();const auth=new AuthManager({...cfg,refresh:c=>client.refreshToken(c)});models=await client.fetchModels(await auth.get(),AbortSignal.timeout(25000),{allModels:true});
  }else throw new Error('Unknown source');
  process.stdout.write(JSON.stringify({type:'result',ok:true,value:{models}})+'\n');
  }
}catch(e){const details=failureDetails({...e,message:failureText(e)});process.stdout.write(JSON.stringify({type:'result',ok:false,error:details.message,details})+'\n');process.exitCode=1;}
