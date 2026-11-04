import {createServer} from 'node:http';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {discoverRuntimes} from '../app/services/runtime-paths.mjs';
import {CodexAdapter} from '../app/runtimes/codex.mjs';
import {KimiAcpAdapter} from '../app/runtimes/kimi-acp.mjs';
import {responsesRoute} from '../app/services/responses.mjs';
import {Gateway} from '../app/services/gateway.mjs';
import {normalizeWorkbuddy,variantFor} from '../app/core/catalog.mjs';
const useGateway=process.env.AWB_MOCK_GATEWAY==='1';const root=resolve(useGateway?'.runtime/native-agent-gateway-mock':'.runtime/native-agent-mock');await mkdir(root,{recursive:true});const marker=`LOCAL_FIXTURE_${randomUUID()}`;await writeFile(join(root,'sentinel.txt'),marker);
const runtimes=await discoverRuntimes();const results=[];
for(const [id,Adapter]of [['kimi',KimiAcpAdapter],['codex',CodexAdapter]]){
  let calls=0,names=[],toolUsed=null,seenOutput=false,lastRequest=null;const events=[];const encode=new TextEncoder();
  const completion=body=>{
    calls++;lastRequest=body;names=(body.tools??[]).map(t=>({type:t.type,name:t.name??t.function?.name}));
    const messages=body.messages??[],toolResult=messages.filter(m=>m.role==='tool').at(-1);seenOutput=!!toolResult&&JSON.stringify(toolResult).includes(marker);
    let delta,finish;if(toolResult){delta={role:'assistant',content:seenOutput?marker:'Tool result did not contain expected marker'};finish='stop';}else{
      const tool=(body.tools??[]).find(t=>/^(Read|read|read_file)$/i.test(t.function?.name??t.name))??(body.tools??[]).find(t=>/exec_command|shell_command|run_shell_command|Bash/.test(t.function?.name??t.name));
      if(!tool)throw new Error('No native file or shell tool was offered');const name=tool.function?.name??tool.name;toolUsed=name;const schema=tool.function?.parameters??tool.parameters??{},props=schema.properties??{};
      const args={};for(const key of Object.keys(props)){if(['path','file_path','filePath','absolute_path'].includes(key))args[key]=join(root,'sentinel.txt');}
      if(/exec_command|shell_command/.test(name)){args.cmd="Get-Content -LiteralPath 'sentinel.txt'";args.workdir=root;}else if(name==='Bash'){args.command='cat sentinel.txt';}else if(!Object.keys(args).length){args.path=join(root,'sentinel.txt');}
      delta={role:'assistant',tool_calls:[{index:0,id:'fixture-tool',type:'function',function:{name,arguments:JSON.stringify(args)}}]};finish='tool_calls';
    }
    return new Response(new ReadableStream({start(c){c.enqueue(encode.encode(`data: ${JSON.stringify({id:'fixture',object:'chat.completion.chunk',model:'local-fixture',choices:[{index:0,delta,finish_reason:null}]})}\n\n`));c.enqueue(encode.encode(`data: ${JSON.stringify({id:'fixture',object:'chat.completion.chunk',model:'local-fixture',choices:[{index:0,delta:{},finish_reason:finish}],usage:{prompt_tokens:20,completion_tokens:10,total_tokens:30}})}\n\ndata: [DONE]\n\n`));c.close();}}),{headers:{'content-type':'text/event-stream'}});
  };
  const server=createServer(async(req,res)=>{try{let data='';for await(const chunk of req)data+=chunk;const body=JSON.parse(data||'{}');if(req.url.endsWith('/responses')){await responsesRoute(body,res,async chat=>completion(chat),new AbortController().signal);return;}if(req.url.endsWith('/chat/completions')){const result=completion(body);res.writeHead(200,{'content-type':'text/event-stream'});for await(const chunk of result.body)res.write(chunk);res.end();return;}res.writeHead(404);res.end();}catch(e){res.writeHead(500);res.end(JSON.stringify({error:{message:e.message}}));}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const dir=join(root,id);await mkdir(dir,{recursive:true});let resolveTurn,rejectTurn;const completed=new Promise((r,j)=>{resolveTurn=r;rejectTurn=j;});const timer=setTimeout(()=>rejectTurn(new Error('Native deterministic tool loop timed out')),60000);
  let gateway,endpoint={baseURL:`http://127.0.0.1:${server.address().port}/v1`,key:'fixture'},variant={id:'local-fixture'};
  const model=normalizeWorkbuddy({id:'local-fixture',name:'Deterministic local fixture',contextWindow:200000,maxTokens:8000,reasoning:{supportedEfforts:['low','high','max']},mockBaseURL:endpoint.baseURL});
  if(useGateway){gateway=new Gateway({root:dir},{get:()=>model},{command:process.execPath,args:[],env:{}},{workerScript:resolve('tests/fixtures/gateway-proxy.mjs')});const selected={modelKey:model.key,identity:model.identity,reasoning:'low',contextTokens:200000};variant=variantFor(model,selected);endpoint=await gateway.register(model,variant,selected,id,`fixture-${id}`);gateway.onUsage=async(_id,event)=>events.push(event);}
  const adapter=new Adapter({runtime:runtimes.find(r=>r.id===id),dir,project:{path:root},session:{id:`fixture-${id}`,selection:{modelKey:'fixture',reasoning:'low',contextTokens:200000}},model,variant,endpoint,emit:async e=>{events.push(e);if(e.type==='approval')await adapter.approve(e.approvalId,'approve');if(e.type==='turn-end')resolveTurn(e);},saveNative:async id=>{}});
  try{await adapter.prompt('Use the native file read or shell tool to read sentinel.txt and then return its contents. This is a deterministic local transport test.');const result=await completed;results.push({runtime:id,passed:result.status==='completed'&&seenOutput&&events.some(e=>e.type==='text'&&e.text?.includes(marker)),toolUsed,modelCalls:calls,eventTypes:[...new Set(events.map(e=>e.type))],errors:events.filter(e=>e.type==='error').map(e=>e.text),result:result.data,tools:names});}catch(e){results.push({runtime:id,passed:false,error:e.message,modelCalls:calls,eventTypes:[...new Set(events.map(e=>e.type))],errors:events.filter(e=>e.type==='error').map(e=>e.text),tools:names});}
  finally{clearTimeout(timer);await adapter.close();await gateway?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
await writeFile(join(root,'result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;
