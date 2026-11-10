import {createServer} from 'node:http';
// Minimal owned worker: answers every chat completion with fixed usage so usage events are observable.
let input='';for await(const data of process.stdin)input+=data;let models=JSON.parse(input).models;
const key='local-fixture-key',usage={prompt_tokens:30,completion_tokens:4,total_tokens:34};
const server=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  const body=JSON.parse(raw);
  if(!models.some(m=>m.variant.id===body.model)){res.writeHead(404);res.end();return;}
  if(body.stream){
    res.writeHead(200,{'content-type':'text/event-stream'});
    res.end('data: '+JSON.stringify({choices:[{delta:{content:'ok'}}],usage})+'\n\n'
      +'data: '+JSON.stringify({choices:[{delta:{},finish_reason:'stop'}],usage})+'\n\ndata: [DONE]\n\n');
    return;
  }
  res.writeHead(200,{'content-type':'application/json'});
  res.end(JSON.stringify({id:'fixture',object:'chat.completion',model:body.model,choices:[{index:0,message:{role:'assistant',content:'ok'},finish_reason:'stop'}],usage}));
});
server.listen(0,'127.0.0.1',()=>process.stdout.write(JSON.stringify({type:'ready',url:'http://127.0.0.1:'+server.address().port,key})+'\n'));
process.on('disconnect',()=>{server.closeAllConnections();server.close();});
