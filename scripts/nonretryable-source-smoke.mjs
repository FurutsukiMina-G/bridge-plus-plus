// Actual Kimi client receives an owned source's terminal SSE error. No model runs.
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const appRoot=resolve(process.env.AWB_PACKAGE_ROOT??'.'),load=p=>import(pathToFileURL(join(appRoot,p)));
const [{Store},{normalizeQoder},{Gateway},{Sessions},{discoverRuntimes}]=await Promise.all([load('app/core/store.mjs'),load('app/core/catalog.mjs'),load('app/services/gateway.mjs'),load('app/services/sessions.mjs'),load('app/services/runtime-paths.mjs')]);
const out=resolve('.runtime/nonretryable-source'),dir=join(out,randomUUID());await mkdir(dir,{recursive:true});let calls=0;const events=[];
const source=createServer(async(req,res)=>{for await(const _ of req){}calls++;res.writeHead(200,{'content-type':'text/event-stream','x-should-retry':'false'});res.end('data: '+JSON.stringify({error:{code:'bridge_request_timeout',message:'Local fixture deadline reached',automatic_retry:false}})+'\n\n');});await new Promise(r=>source.listen(0,'127.0.0.1',r));
const store=await new Store(join(dir,'workspace')).open();await store.mutate(s=>{s.projects=[{id:'p',path:dir}];});const model=normalizeQoder({value:'local-fixture',displayName:'Local terminal error fixture',context_config:{native:{token_count:200000}},thinking_config:{enabled:{efforts:{low:{}}}}});
const gateway=new Gateway(store,{get:()=>model},{command:process.execPath,args:[],env:{}});gateway.ensureWorker=async()=>({url:'http://127.0.0.1:'+source.address().port,key:'fixture'});
const runtime=(await discoverRuntimes()).find(r=>r.id==='kimi'),manager=new Sessions(store,{get:()=>model},gateway,[runtime]),session=await manager.create({projectId:'p',runtimeId:'kimi',selection:{modelKey:model.key,identity:model.identity,reasoning:'low',contextTokens:200000}});
let resolveTurn,rejectTurn;const terminal=new Promise((r,j)=>{resolveTurn=r;rejectTurn=j;}),timer=setTimeout(()=>rejectTurn(new Error('Non-retryable source verification timeout')),15000);store.on('event',e=>{events.push(e);if(e.type==='turn-end')resolveTurn(e);});
let result;try{await manager.prompt(session.id,'Read the local fixture and return its contents.');const end=await terminal;await manager.runs.get(session.id)?.finishing;await new Promise(r=>setTimeout(r,750));result={passed:end.status==='failed'&&calls===1&&events.some(e=>e.type==='error'&&e.code==='bridge_request_timeout'),status:end.status,sourceRequests:calls,nativeToolsExecuted:events.filter(e=>e.type==='tool-start').length};}catch(e){result={passed:false,error:e.message,sourceRequests:calls};}
finally{clearTimeout(timer);await manager.close();await gateway.close();await store.close();source.closeAllConnections();await new Promise(r=>source.close(r));}
await writeFile(join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
