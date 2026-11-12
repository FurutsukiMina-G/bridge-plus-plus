// Explicit opt-in: real local Codex, synthetic Responses only; no Bridge++ process.
import {mkdir,mkdtemp,readFile,writeFile,readdir,cp,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {parse,stringify} from 'smol-toml';
import {codexHome,codexBridgeHome,prepareCodexHome,gatewayCodexConfig,CODEX_GATEWAY_PLUGINS} from '../app/services/codex-config.mjs';
import {findCodex} from '../app/services/runtime-paths.mjs';
import {launch,RpcProcess} from '../app/core/process.mjs';

await mkdir('.runtime/tests',{recursive:true});
const root=await mkdtemp(resolve('.runtime/tests/codex-home-offline-')),home=codexBridgeHome(root),cwd=join(root,'project');await mkdir(home,{recursive:true});await mkdir(cwd);
const sourceHome=codexHome();
if(process.env.BPP_OFFLINE_COPY==='1')await prepareCodexHome(root,{sourceHome,rulesText:'- 离线测试规则'});
const config=process.env.BPP_OFFLINE_COPY==='1'?parse(await readFile(join(home,'config.toml'),'utf8')):gatewayCodexConfig(parse(await readFile(join(sourceHome,'config.toml'),'utf8')),home);
// Offline fixture never follows user marketplace paths or node_repl's user home.
for(const [name,value]of Object.entries(config.marketplaces??{}))value.source=name==='openai-bundled'?join(home,'.tmp/bundled-marketplaces',name):join(root,'profile/.cache/codex-runtimes/codex-primary-runtime/plugins',name);
if(config.mcp_servers?.node_repl?.env)config.mcp_servers.node_repl.env.CODEX_HOME=home;
if(process.env.BPP_OFFLINE_SOURCE==='1'){
  for(const [scope,value]of Object.entries(config.marketplaces??{})){
    const plugins=[];
    for(const key of CODEX_GATEWAY_PLUGINS.filter(k=>k.endsWith('@'+scope))){const name=key.split('@')[0],base=join(sourceHome,'plugins/cache',scope,name),versions=await readdir(base),version=versions.at(-1);await cp(join(base,version),join(value.source,'plugins',name),{recursive:true,filter:async path=>!(await lstat(path)).isSymbolicLink()});plugins.push({name,source:{source:'local',path:'./plugins/'+name},policy:{installation:'AVAILABLE',authentication:'ON_INSTALL'},category:'Productivity'});}
    await mkdir(join(value.source,'.agents/plugins'),{recursive:true});await writeFile(join(value.source,'.agents/plugins/marketplace.json'),JSON.stringify({name:scope,plugins}));
  }
}
await writeFile(join(home,'config.toml'),stringify(config));
let count=0,tools=[],commandOutput=null,commandSent=false,firstInput='';
const server=createServer(async(req,res)=>{try{
  if(req.method!=='POST'||!req.url?.endsWith('/responses')){res.writeHead(404);res.end();return;}
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks));count++;
  if(count>4)throw new Error('Unexpected repeated request');
  tools=body.tools??[];if(count===1)firstInput=JSON.stringify(body.input);
  const flat=tools.flatMap(t=>t.type==='namespace'?(t.tools??[]).map(x=>({...x,namespace:t.name})):t);
  const command=flat.find(t=>['exec_command','shell_command','shell'].includes(t.name));
  const results=(body.input??[]).filter(i=>i.type==='function_call_output');if(results.length)commandOutput=results.at(-1).output;
  const output=command&&!commandSent?(commandSent=true,[{type:'function_call',id:'fc_offline',call_id:'call_offline',name:command.name,arguments:JSON.stringify(command.name==='exec_command'?{cmd:'cmd /c echo ok',yield_time_ms:1000,max_output_tokens:1000}:command.name==='shell_command'?{command:'cmd /c echo ok',timeout_ms:10000}:{command:['cmd','/c','echo','ok'],timeout_ms:10000})}]):[{type:'message',id:'msg_offline',role:'assistant',status:'completed',content:[{type:'output_text',text:'offline complete',annotations:[]}]}];
  res.writeHead(200,{'content-type':'text/event-stream'});const send=value=>res.write(`data: ${JSON.stringify(value)}\n\n`),response={id:'resp_'+count,object:'response',created_at:1,model:body.model,status:'completed',output,usage:{input_tokens:1,output_tokens:1,total_tokens:2}};
  send({type:'response.created',response:{...response,status:'in_progress',output:[]}});
  for(const [output_index,item]of output.entries()){send({type:'response.output_item.added',output_index,item});send({type:'response.output_item.done',output_index,item});}
  send({type:'response.completed',response});res.end();
}catch(error){res.writeHead(500);res.end(JSON.stringify({error:{message:error.message}}));}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const endpoint=`http://127.0.0.1:${server.address().port}/v1`,exe=process.env.AWB_CODEX_EXE||await findCodex(),args=['app-server','--listen','stdio://','-c','model_provider="offline"','-c','model="offline-fixture"','-c','model_providers.offline.name="Offline"','-c',`model_providers.offline.base_url=${JSON.stringify(endpoint)}`,'-c','model_providers.offline.wire_api="responses"','-c','model_providers.offline.requires_openai_auth=false','-c','model_providers.offline.supports_websockets=false','-c','approval_policy="never"','-c','sandbox_mode="workspace-write"','-c','windows.sandbox="unelevated"','-c','check_for_update_on_startup=false'];
const allowed=['PATH','SystemRoot','WINDIR','COMSPEC','PATHEXT','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','PROGRAMFILES','PROGRAMFILES(X86)'];const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>allowed.includes(k.toUpperCase())));env.CODEX_HOME=home;
env.USERPROFILE=join(root,'profile');await mkdir(env.USERPROFILE,{recursive:true});
const child=launch(exe,args,{cwd,env,exactEnv:true}),rpc=new RpcProcess(child,{timeoutMs:60000,maxEventBytes:16*1024*1024});let ended,approvalCount=0,completion;
rpc.on('message',message=>{if(message.id!==undefined){approvalCount++;rpc.reject(message.id,'Offline test forbids interactive requests');}if(message.method==='turn/completed'){completion=message.params?.turn;ended?.();}});
let skills=[],mcp=null,error=null;
try{
  await rpc.request('initialize',{clientInfo:{name:'bridge_offline_test',version:'1'},capabilities:{experimentalApi:false}});rpc.notify('initialized');
  skills=await rpc.request('skills/list',{cwds:[cwd],forceReload:true}).catch(e=>({error:e.message}));
  mcp=await rpc.request('mcpServerStatus/list',{}).catch(e=>({error:e.message}));
  const thread=await rpc.request('thread/start',{cwd,model:'offline-fixture',modelProvider:'offline',approvalPolicy:'never',sandbox:'workspace-write'});
  const done=new Promise(r=>{ended=r;}),timer=setTimeout(()=>ended(),60000);
  try{await rpc.request('turn/start',{threadId:thread.thread.id,input:[{type:'text',text:'offline fixture',text_elements:[]}]});await done;}finally{clearTimeout(timer);}
}catch(e){error=e.message;}finally{await rpc.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
const pluginIds=skills.data?.flatMap(row=>row.skills.map(s=>s.pluginId))??[],checks={documentPlugins:CODEX_GATEWAY_PLUGINS.every(key=>pluginIds.includes(key)),nodeRepl:mcp.data?.some(row=>row.name==='node_repl'&&row.tools?.js)??false,forbiddenAbsent:!JSON.stringify(tools).match(/mcp__codex_apps__|computer.use|unified.computer.use|browser/i),rulesInRequest:firstInput.includes('离线测试规则'),commandSucceeded:typeof commandOutput==='string'&&/Exit code: 0/i.test(commandOutput)&&/\bok\b/.test(commandOutput),noInteractiveRequests:approvalCount===0};
const summary={root,exe,copyCache:process.env.BPP_OFFLINE_COPY==='1',preparedByProduction:process.env.BPP_OFFLINE_COPY==='1',checks,requestCount:count,skills,mcp,tools:tools.map(t=>t.type==='namespace'?{name:t.name,tools:t.tools?.map(x=>x.name)}:{type:t.type,name:t.name}),firstInputContains: Object.fromEntries(CODEX_GATEWAY_PLUGINS.map(key=>[key,firstInput.includes(key.split('@')[0])])),commandSent,commandOutput,approvalCount,completion,error,stderr:rpc.stderr.slice(-2000)};
await writeFile(join(root,'result.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({...summary,skills:skills.data?.flatMap(row=>row.skills.map(s=>({name:s.name,pluginId:s.pluginId})))??skills,mcp:mcp.data?.map(row=>({name:row.name,tools:Object.keys(row.tools??{}),toolsError:row.toolsError}))??mcp,completion:completion?.status},null,2));
if(error||completion?.status!=='completed'||Object.values(checks).some(value=>!value))process.exitCode=1;
