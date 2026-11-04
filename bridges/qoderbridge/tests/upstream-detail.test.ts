import test from 'node:test';
import assert from 'node:assert/strict';
import {bridgeFailure} from '../src/failures.js';
import {createBridgeServer} from '../src/server.js';
import type {AddressInfo} from 'node:net';
import type {runProbe} from '../src/client.js';
const text='429 您的使用量已超出频率限制，将在 2026-11-05 00:06:15 UTC+8 重置。 (request-123)';
test('Qoder exposes redacted upstream text and exact known reset/status without guessing',()=>{
 const e=bridgeFailure({requestId:'local-id',phase:'upstream',accepted:true,turn:{sdk_errors:[text]}});assert.equal(e.code,'upstream_rate_limited');assert.equal(e.upstream_status,429);assert.equal(e.reset_at,'2026-11-05T00:06:15+08:00');assert.equal(e.request_id,'request-123');assert.equal(e.automatic_retry,false);assert.equal(e.upstream_message,text.replace(/ \(.*\)$/,''));assert.doesNotMatch(e.message,/\(request-123\)/);
 const bad=bridgeFailure({requestId:'local-id',phase:'upstream',accepted:true,turn:{sdk_errors:['Failure api_key="private key" Bearer private-bearer\nCookie: private-cookie']}});assert.doesNotMatch(JSON.stringify(bad),/private key|private-bearer|private-cookie/);assert.equal(bad.upstream_status,undefined);assert.equal(bad.reset_at,undefined);
 const invalid=bridgeFailure({requestId:'local-id',phase:'upstream',accepted:true,turn:{sdk_errors:['429 将在 2026-02-30 00:06:15 UTC+8 重置。 (req-123, trace-456)']}});assert.equal(invalid.reset_at,undefined);assert.equal(invalid.request_id,'req-123, trace-456');
});
test('Qoder HTTP and SSE carry rate limit metadata without retry or success terminal',async()=>{
 let calls=0;const server=await createBridgeServer({auth:'cli',timeout:5000,strategy:'permission',system:'fixture'},{port:0,key:'fake-local-key',telemetry:false,infer:(async()=>{calls++;return {response:'',error:'failure',stage:'inference',sdk_errors:[text]};}) as unknown as typeof runProbe});
 try{for(const stream of [false,true]){const response=await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/chat/completions`,{method:'POST',headers:{authorization:'Bearer fake-local-key','content-type':'application/json'},body:JSON.stringify({model:'qoder-deepseek-flash',messages:[{role:'user',content:'fixture'}],stream})});const raw=await response.text();const e=stream?JSON.parse(raw.split('\n').find(line=>line.startsWith('data: {"error":'))!.slice(6)).error:JSON.parse(raw).error;assert.equal(response.status,stream?200:429);assert.equal(e.code,'upstream_rate_limited');assert.equal(e.upstream_status,429);assert.equal(e.reset_at,'2026-11-05T00:06:15+08:00');assert.equal(e.automatic_retry,false);assert.doesNotMatch(raw,/\[DONE\]|"finish_reason":"stop"/);}assert.equal(calls,2);}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
