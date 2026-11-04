// Deterministic integration fixture: forward only to the test's own loopback response server.
import {createServer} from 'node:http';
let input='';for await(const chunk of process.stdin)input+=chunk;
const {models}=JSON.parse(input),target=new URL(models[0].model.raw.mockBaseURL);
if(target.protocol!=='http:'||target.hostname!=='127.0.0.1')throw new Error('Fixture must use loopback');
const server=createServer(async(req,res)=>{
  const controller=new AbortController();res.on('close',()=>controller.abort());
  try{let body='';for await(const chunk of req)body+=chunk;const upstream=await fetch(target.href+'/chat/completions',{method:'POST',headers:{'content-type':'application/json'},body,signal:controller.signal});res.writeHead(upstream.status,{'content-type':upstream.headers.get('content-type')});for await(const chunk of upstream.body)res.write(chunk);res.end();}catch(error){if(!res.destroyed)res.destroy(error);}
});
process.on('message',message=>{if(message.type==='catalog')process.send({type:'catalog-updated',requestId:message.requestId});});
process.on('disconnect',()=>{server.closeAllConnections();server.close();});
server.listen(0,'127.0.0.1',()=>process.stdout.write(JSON.stringify({type:'ready',url:'http://127.0.0.1:'+server.address().port,key:'fixture-proxy-key'})+'\n'));
