import {createServer} from 'node:http';
import {bridgePromptConfig} from '../../app/services/runtime-prompts.mjs';
const runtimeId=process.argv[3],prompts=bridgePromptConfig(runtimeId);
let input='';for await(const data of process.stdin)input+=data;let models=JSON.parse(input).models;const key='local-fixture-key';
process.on('message',message=>{if(message.type==='catalog'){models=message.models;process.send({type:'catalog-updated',requestId:message.requestId});}});
const server=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  const body=JSON.parse(raw),exists=models.some(m=>m.variant.id===body.model);
  if(!exists){res.writeHead(404);res.end();return;}
  process.send({type:'request-start',model:body.model});
  const timer=setTimeout(()=>{
    if(body.stream){res.writeHead(200,{'content-type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{delta:{content:body.prompt_cache_key??'fixture'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');}
    else{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({pid:process.pid,model:body.model,effort:body.reasoning_effort,runtimeId,system:prompts.qoder.system,cacheKey:body.prompt_cache_key,bridgeEnvKeys:Object.keys(process.env).filter(key=>/^(WORKBUDDY_|QODERBRIDGE_)/i.test(key))}));}
  },body.delayMs??0);
  res.on('close',()=>clearTimeout(timer));
});
server.listen(0,'127.0.0.1',()=>process.stdout.write(JSON.stringify({type:'ready',url:'http://127.0.0.1:'+server.address().port,key})+'\n'));
process.on('disconnect',()=>{server.closeAllConnections();server.close();});
