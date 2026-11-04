// Real Kimi/Codex processes, fixed local SSE responses; no remote inference.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const appRoot=resolve(process.env.AWB_PACKAGE_ROOT??'.'),load=p=>import(pathToFileURL(join(appRoot,p)));
const [{Store},{Gateway},{Sessions},{normalizeQoder},{discoverRuntimes}]=await Promise.all([load('app/core/store.mjs'),load('app/services/gateway.mjs'),load('app/services/sessions.mjs'),load('app/core/catalog.mjs'),load('app/services/runtime-paths.mjs')]);
const root=resolve('.runtime/output-limit-smoke'),runtimes=await discoverRuntimes(),results=[];await mkdir(root,{recursive:true});
for(const runtimeId of ['kimi','codex']){
  const dir=join(root,runtimeId+'-'+randomUUID());await mkdir(dir,{recursive:true});
  let phase=0,calls=0,firstCalls=0;const events=[];
  const source=createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);calls++;if(!phase)firstCalls++;
    res.writeHead(200,{'content-type':'text/event-stream','x-should-retry':'false'});
    if(firstCalls>1&&!phase){res.end('data: '+JSON.stringify({error:{code:'fixture_duplicate',message:'No repeat after source length terminal',automatic_retry:false}})+'\n\n');return;}
    const chunk={id:'local-fixture',model:body.model,object:'chat.completion.chunk',choices:[{index:0,delta:{role:'assistant',content:phase?'Complete fixture answer.':'Partial fixture paragraph.'},finish_reason:phase?'stop':'length'}],usage:{prompt_tokens:50,completion_tokens:5,total_tokens:55}};
    res.end('data: '+JSON.stringify(chunk)+'\n\ndata: [DONE]\n\n');
  });await new Promise(r=>source.listen(0,'127.0.0.1',r));
  const store=await new Store(join(dir,'workspace')).open();await store.mutate(s=>s.projects.push({id:'p',path:dir}));
  const model=normalizeQoder({value:'local-fixture',displayName:'Local output-limit fixture',context_config:{native:{token_count:200000}},thinking_config:{enabled:{efforts:{low:{}}}}}),providers={get:()=>model};
  const gateway=new Gateway(store,providers,{command:process.execPath,args:[],env:{}});gateway.ensureWorker=async()=>({url:'http://127.0.0.1:'+source.address().port,key:'local'});
  const manager=new Sessions(store,providers,gateway,runtimes),session=await manager.create({projectId:'p',runtimeId,selection:{modelKey:model.key,identity:model.identity,reasoning:'low',contextTokens:200000}});
  store.on('event',e=>events.push(e));
  const turn=async prompt=>{
    let timer,handler;const ended=new Promise((resolve,reject)=>{handler=e=>{if(e.sessionId===session.id&&e.type==='turn-end')resolve(e);};store.on('event',handler);timer=setTimeout(()=>reject(new Error('Native output-limit smoke timeout')),25000);});
    try{await manager.prompt(session.id,prompt);return await ended;}finally{clearTimeout(timer);store.off('event',handler);}
  };
  try{
    const first=await turn('Reply with a short fixture paragraph.');await new Promise(r=>setTimeout(r,250));
    const adapter=manager.adapters.get(session.id),nativeId=session.nativeId;
    assert.equal(first.status,'interrupted');assert.equal(firstCalls,1);assert.ok(adapter&&!adapter.closed);
    phase=1;const second=await turn('Continue the same answer.');
    assert.equal(second.status,'completed');assert.equal(session.nativeId,nativeId);assert.equal(manager.adapters.get(session.id),adapter);assert.equal(calls,2);
    results.push({runtime:runtimeId,passed:true,firstStatus:first.status,secondStatus:second.status,sourceRequests:calls,nativeIdentityPreserved:true});
  }catch(error){results.push({runtime:runtimeId,passed:false,error:error.message,sourceRequests:calls,firstRequests:firstCalls,status:session.status,events:events.filter(e=>['error','turn-end','notice'].includes(e.type)).map(e=>({type:e.type,status:e.status,text:e.text}))});}
  finally{await manager.close();await gateway.close();await store.close();source.closeAllConnections();await new Promise(r=>source.close(r));}
}
await writeFile(join(root,'result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;
