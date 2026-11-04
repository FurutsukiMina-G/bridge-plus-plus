import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Gateway} from '../app/services/gateway.mjs';
import {normalizeWorkbuddy,variantFor} from '../app/core/catalog.mjs';
test('actual gateway HTTP Chat and Responses preserve declared image pixels and omit undeclared media',async t=>{
 const received=[],upstream=createServer(async(req,res)=>{let raw='';for await(const b of req)raw+=b;const body=JSON.parse(raw);received.push(body);res.writeHead(200,{'content-type':'text/event-stream'});res.end('data: '+JSON.stringify({choices:[{index:0,delta:{content:'synthetic response'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');});await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const models=[true,false].map((supportsImages,i)=>normalizeWorkbuddy({id:'fixture-'+i,name:'Fixture '+i,contextWindow:200000,maxTokens:8000,supportsImages,reasoning:{supportedEfforts:['low']}}));
 const gateway=new Gateway({root:process.cwd()},{get:key=>models.find(m=>m.key===key)},{command:process.execPath,args:[],env:{}});gateway.ensureWorker=async()=>({url:'http://127.0.0.1:'+upstream.address().port,key:'synthetic'});t.after(async()=>{await gateway.close();upstream.closeAllConnections();await new Promise(r=>upstream.close(r));});
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3cAAAAASUVORK5CYII=';
 for(const model of models){const selection={modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'},variant=variantFor(model,selection),endpoint=await gateway.register(model,variant,selection,'codex');
   for(const route of ['chat/completions','responses']){
     const body=route==='responses'?{model:variant.id,input:[{role:'user',content:[{type:'input_image',image_url:image}]}]}:{model:variant.id,messages:[{role:'user',content:[{type:'image_url',image_url:{url:image}}]}],stream:true};
     const r=await fetch(endpoint.baseURL+'/'+route,{method:'POST',headers:{authorization:'Bearer '+endpoint.key,'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200);await r.text();const content=received.at(-1).messages[0].content;
     if(model.images===true)assert.equal(content[0].image_url.url,image);else {assert.equal(typeof content,'string');assert.match(content,/NOT inspected/);assert.equal(content.includes(image),false);}
   }
 }
});
