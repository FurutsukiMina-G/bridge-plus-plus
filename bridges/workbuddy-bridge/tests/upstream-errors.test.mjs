import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {publicError} from '../src/errors.mjs';
import {SdkTransport} from '../src/sdk-transport.mjs';
import {createBridge} from '../src/server.mjs';
import {PUBLIC_MODEL} from '../src/protocol.mjs';
const message='429 您的使用量已超出频率限制，将在 2026-11-05 00:06:15 UTC+8 重置，您也可以切换其他模型继续使用。 (request-123,trace-456)';
test('WorkBuddy rate limit parses status/reset/request IDs and redacts all credential forms',()=>{
 const p=publicError(new Error(message+'\nCookie: private-cookie'));assert.equal(p.status,429);assert.equal(p.body.error.code,'upstream_rate_limited');assert.equal(p.body.error.upstream_status,429);assert.equal(p.body.error.reset_at,'2026-11-05T00:06:15+08:00');assert.equal(p.body.error.request_id,'request-123,trace-456');assert.equal(p.body.error.automatic_retry,false);assert.equal(p.body.error.message,message.replace(/ \(.*\)$/,''));
 for(const secret of ['Bearer fake-bearer','api_key="fake key"','cookie=fake-cookie','token=fake-token','sk-fake-api']){const raw=JSON.stringify(publicError(new Error('upstream failed '+secret)));assert.doesNotMatch(raw,/fake-bearer|fake key|fake-cookie|fake-token|sk-fake-api/);assert.doesNotMatch(raw,/see token-free/);}
 assert.equal(publicError(new Error('503 unavailable')).body.error.reset_at,undefined);assert.equal(publicError(new Error('broken reset UTC+8')).body.error.upstream_status,undefined);
 assert.equal(publicError(new Error('429 将在 2026-02-30 00:06:15 UTC+8 重置')).body.error.reset_at,undefined);assert.equal(publicError(new Error('429 limited (req-123, trace-456)')).body.error.request_id,'req-123, trace-456');
});
test('WorkBuddy SDK and HTTP/SSE preserve a single nonretryable rate limit without paid retry',async t=>{
 const runtime=await mkdtemp(join(tmpdir(),'wb-upstream-errors-'));t.after(()=>rm(runtime,{recursive:true,force:true}));const info={id:'deepseek-v4.1-flash',name:'DeepSeek Flash',supportsToolCall:true,contextWindow:1000000,maxTokens:32000};let calls=0;
 const transport=new SdkTransport({runtime,cliPath:process.execPath},{get:async()=>({accessToken:'fake-access',refreshToken:'fake-refresh',uid:'fake',domain:'www.workbuddy.cn'})},{run:async function*(){calls++;yield {type:'system',subtype:'init',model:info.id};throw new Error(message+'\nfake-access fake-refresh');}});
 const provider={model:info,ready:async()=>info,chat:(...args)=>transport.chat(...args),status:()=>({}),close:()=>transport.close?.()};
 const bridge=createBridge({cfg:{concurrency:1,queueLimit:3,timeoutMs:5000,heartbeatMs:100,bodyLimit:100000},provider,key:'fake-local-key',instanceId:'fixture',log:async()=>{}});await new Promise(r=>bridge.server.listen(0,'127.0.0.1',r));t.after(()=>bridge.close());
 for(const stream of [false,true]){
  const response=await fetch(`http://127.0.0.1:${bridge.server.address().port}/v1/chat/completions`,{method:'POST',headers:{authorization:'Bearer fake-local-key','content-type':'application/json'},body:JSON.stringify({model:PUBLIC_MODEL,messages:[{role:'user',content:'fixture'}],stream})});const raw=await response.text();const e=stream?JSON.parse(raw.split('\n').find(line=>line.startsWith('data: {"error":')).slice(6)).error:JSON.parse(raw).error;
  assert.equal(response.status,stream?200:429);assert.equal(e.code,'upstream_rate_limited');assert.equal(e.automatic_retry,false);assert.equal(e.upstream_status,429);assert.equal(e.reset_at,'2026-11-05T00:06:15+08:00');assert.equal(e.request_id,'request-123,trace-456');assert.equal(e.message,message.replace(/ \(.*\)$/,''));assert.doesNotMatch(raw,/fake-access|fake-refresh|\[DONE\]/);
 }
 assert.equal(calls,2);
});
