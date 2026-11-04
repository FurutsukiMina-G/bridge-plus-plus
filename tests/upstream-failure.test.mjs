import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'node:http';
import {Store} from '../app/core/store.mjs';
import {normalizeWorkbuddy} from '../app/core/catalog.mjs';
import {Gateway} from '../app/services/gateway.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {RuntimeLifecycle} from '../app/core/lifecycle.mjs';
import {ModelServiceStore} from '../app/services/model-service-store.mjs';
import {ModelServiceServer} from '../app/services/model-service-server.mjs';
import {dshEvent} from '../app/runtimes/dsh.mjs';
import {codexExecEvent} from '../app/runtimes/codex-exec.mjs';
import {kimiStopReason} from '../app/runtimes/kimi-acp.mjs';
import {antigravityEvent} from '../app/runtimes/antigravity.mjs';
import {relayCompletion} from '../app/services/gateway-usage.mjs';
import {RpcProcess,launch} from '../app/core/process.mjs';
const rateError={code:'upstream_rate_limited',upstream_status:429,message:'您的使用量已超出频率限制，将在 2026-11-05 00:06:15 UTC+8 重置。',reset_at:'2026-11-05T00:06:15+08:00',request_id:'request-123',automatic_retry:false};
const model=normalizeWorkbuddy({id:'Kimi-K3.1-Pro',name:'Kimi-K3.1-Pro',contextWindow:200000,maxTokens:8000,supportsToolCall:true,reasoning:{supportedEfforts:['low']}}),providers={get:()=>model,close:async()=>{}};
async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/upstream-failure-'));}
async function upstream(t){
 const state={error:rateError};const server=createServer(async(req,res)=>{let text='';for await(const chunk of req)text+=chunk;const body=JSON.parse(text);const payload=state.error?{error:state.error}:{choices:[{message:{role:'assistant',content:'任务已完成。'},finish_reason:'stop'}],usage:{prompt_tokens:5,completion_tokens:2}};
  if(body.stream){res.writeHead(200,{'content-type':'text/event-stream'});res.end('data: '+JSON.stringify(payload)+'\n\n'+(state.error?'':'data: [DONE]\n\n'));}else{res.writeHead(state.error?429:200,{'content-type':'application/json'});res.end(JSON.stringify(payload));}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));return {state,worker:{url:'http://127.0.0.1:'+server.address().port,key:'fake-worker-key',active:0}};
}
async function sessionFixture(t,bridged=true){
 const store=await new Store(await root()).open();await store.mutate(s=>s.projects.push({id:'p',path:store.root}));const instances=[];
 class Fake extends RuntimeLifecycle{constructor(options){super(options);instances.push(this);}async prompt(){}async close(){this.closed=true;}}
 const gateway=bridged?new Gateway(store,providers,{}):null;
 const sessions=new Sessions(store,providers,gateway,[{id:'kimi',installed:true}],{constructors:{kimi:Fake}});const selection=bridged?{modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'}:{modelKey:'native'};
 const session=await sessions.create({projectId:'p',runtimeId:'kimi',selection});t.after(async()=>{await sessions.close();await gateway?.close();await store.close();});return {store,sessions,session,gateway,instances};
}
for(const stream of [false,true])for(const automaticRetry of [false,true,undefined])test(`gateway persists upstream errors and exact retrying flag (${stream?'SSE':'JSON'}, retry=${automaticRetry})`,async t=>{
 const f=await sessionFixture(t),u=await upstream(t);u.state.error={...rateError,automatic_retry:automaticRetry};f.gateway.ensureWorker=async()=>u.worker;
 await f.sessions.prompt(f.session.id,'读取文件后给我结果');const a=f.instances[0];const response=await fetch(a.endpoint.baseURL+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+a.endpoint.key,'content-type':'application/json'},body:JSON.stringify({model:a.variant.id,stream,messages:[{role:'user',content:'fixture'}]})});const wire=await response.text();assert.match(wire,/upstream_rate_limited/);assert.doesNotMatch(wire,/\[DONE\]/);
 await a.emit({type:'turn-end',status:'completed'});const events=await f.store.events(f.session.id),error=events.find(e=>e.type==='upstream-error'),end=events.find(e=>e.type==='turn-end');assert.equal(error.source,'gateway');assert.equal(error.provider,'workbuddy');assert.equal(error.model,'Kimi-K3.1-Pro');assert.equal(error.status,429);assert.equal(error.resetAt,rateError.reset_at);assert.equal(error.requestId,rateError.request_id);assert.equal(error.retrying,automaticRetry!==false);assert.equal(error.message,rateError.message);assert.equal(end.status,'failed');assert.equal(end.reason.kind,'upstream');assert.equal(end.reason.message,rateError.message);assert.equal(end.reason.source,'WorkBuddy');assert.equal(f.session.lastFailure.kind,'upstream');assert.equal(f.store.snapshot().sessions[0].lastFailure.code,rateError.code);if(automaticRetry!==false)assert.equal(events.find(e=>e.code==='unfinished_task').text,rateError.message);
 const journal=await readFile(join(f.store.root,'sessions',f.session.id+'.jsonl'),'utf8');assert.ok(journal.includes('upstream-error'));assert.ok(journal.includes(rateError.message));
 u.state.error=null;await f.sessions.prompt(f.session.id,'重试读取并返回结果');const next=f.instances.at(-1);assert.ok(f.session.lastFailure);await (await fetch(next.endpoint.baseURL+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+next.endpoint.key,'content-type':'application/json'},body:JSON.stringify({model:next.variant.id,messages:[{role:'user',content:'fixture'}]})})).text();await next.emit({type:'text',text:'文件已读取，结果是成功。'});await next.emit({type:'turn-end',status:'completed'});assert.equal(f.session.status,'completed');assert.equal(f.session.lastFailure,undefined);
});
test('a successful model request resolves a prior retryable error in the same turn',async t=>{
 const f=await sessionFixture(t);await f.sessions.prompt(f.session.id,'hello');const turn=f.sessions.runs.get(f.session.id).id;await f.gateway.onUsage(f.session.id,{type:'upstream-error',provider:'qoder',code:'transient',message:'temporary',retrying:true},turn);await f.gateway.onSuccess(f.session.id,turn);await f.instances[0].emit({type:'text',text:'Hello.'});await f.instances[0].emit({type:'turn-end',status:'completed'});assert.equal(f.session.status,'completed');assert.equal(f.session.lastFailure,undefined);
});
test('successful SSE resolves the previous error before a native client can see its terminal frames',async()=>{
 const order=[],upstream=new Response('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});await relayCompletion(upstream,{write:text=>{order.push(text);return true;},end:()=>{}},{signal:new AbortController().signal,onSuccess:async()=>order.push('success')});assert.equal(order[0],'success');assert.match(order[1],/finish_reason/);assert.match(order[2],/\[DONE\]/);
});
test('native RPC process exit includes its code and sanitized stderr tail',async()=>{
 const script="process.stdin.once('data',()=>{process.stderr.write('diagnostic Bearer fake-private-token\\n');process.exitCode=7;process.stdin.destroy();})",rpc=new RpcProcess(launch(process.execPath,['-e',script]));try{await assert.rejects(rpc.request('fixture'),error=>{assert.match(error.message,/退出码 7/);assert.match(error.message,/diagnostic/);assert.doesNotMatch(error.message,/fake-private-token/);return true;});}finally{await rpc.close();}
});
test('cancelled, runtime and unfinished turns always persist useful reasons',async t=>{
 for(const kind of ['cancelled','runtime','unfinished']){const f=await sessionFixture(t,false);await f.sessions.prompt(f.session.id,'修改代码并运行测试');const a=f.instances[0];if(kind==='cancelled')await f.sessions.cancel(f.session.id);else if(kind==='runtime'){await a.emit({type:'error',text:'原生进程退出（退出码 7）；stderr：Bearer private-secret'});await a.emit({type:'turn-end',status:'failed'});}else await a.emit({type:'turn-end',status:'completed'});const end=(await f.store.events(f.session.id)).find(e=>e.type==='turn-end');assert.equal(end.reason.kind,kind);assert.ok(end.reason.message);assert.doesNotMatch(JSON.stringify(end),/private-secret/);assert.equal(f.session.lastFailure.kind,kind);}
});
test('native DSH, Codex, Kimi and Antigravity reasons preserve known causes without credentials',()=>{
 const d=dshEvent({type:'turn/end',data:{reason:{kind:'failed'},cause:{message:'原生失败 Bearer private-bearer'}}});assert.equal(d.reason.kind,'runtime');assert.match(d.reason.message,/原生失败/);assert.doesNotMatch(JSON.stringify(d),/private-bearer/);
 assert.match(dshEvent({type:'turn/end',data:{reason:'failed',cause:'上游服务已中断'}}).reason.message,/上游服务已中断/);assert.match(dshEvent({type:'turn/end',data:{reason:{kind:'failed',error:{message:'原生嵌套错误'}}}}).reason.message,/原生嵌套错误/);
 const c=codexExecEvent({type:'turn.failed',error:{message:'native failed token=private-token',code:'native_code'}});assert.equal(c.reason.code,'native_code');assert.match(c.reason.message,/native failed/);assert.doesNotMatch(JSON.stringify(c),/private-token/);
 const k=kimiStopReason({stopReason:'max_turn_requests'});assert.match(k.message,/max_turn_requests/);assert.equal(k.kind,'runtime');assert.equal(kimiStopReason({stopReason:'cancelled'}).kind,'cancelled');
 const a=antigravityEvent({event:'step_update',step_update:{step_type:'error_message',error_message:'原生额度错误 cookie=private-cookie'}});assert.match(a.text,/原生额度错误/);assert.doesNotMatch(JSON.stringify(a),/private-cookie/);
});
for(const stream of [false,true])test(`external service records actual failure details and bounded redacted log (${stream?'SSE':'JSON'})`,async t=>{
 const store=await new ModelServiceStore(await root(),'workbuddy',{protect:async()=>{}}).open();await store.write('catalog.json',{models:[model]});const server=await ModelServiceServer.open(store,{}, {providers,listenPort:0});await server.run();t.after(()=>server.shutdown());const u=await upstream(t);u.state.error={...rateError,message:rateError.message+' api_key="fake private key" Bearer fake-bearer '+store.key};server.ensureWorker=async()=>u.worker;
 const response=await fetch(server.base+'/v1/chat/completions',{method:'POST',headers:{authorization:'Bearer '+store.key,'content-type':'application/json'},body:JSON.stringify({model:server.rows[0].variant.id,messages:[{role:'user',content:'fixture'}],stream})});const wire=await response.text();assert.doesNotMatch(wire,/fake private key|fake-bearer/);assert.equal(wire.includes(store.key),false);
 for(let n=0;n<100&&server.inflight.size;n++)await new Promise(r=>setTimeout(r,10));await Promise.all([...server.records]);const e=(await store.read('status.json')).requests.lastError;assert.equal(e.code,rateError.code);assert.equal(e.status,429);assert.equal(e.model,model.id);assert.equal(e.requestId,rateError.request_id);assert.equal(e.resetAt,rateError.reset_at);assert.ok(e.at);assert.match(e.message,/您的使用量/);const log=await readFile(join(store.root,'requests.jsonl'),'utf8'),row=JSON.parse(log.trim());assert.equal(row.errorCode,rateError.code);assert.ok(row.errorMessage.length<=300);assert.match(row.errorMessage,/您的使用量/);assert.doesNotMatch(log,/fake private key|fake-bearer/);assert.equal(log.includes(store.key),false);
});
