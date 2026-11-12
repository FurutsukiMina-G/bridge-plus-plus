import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {SdkTransport} from '../src/sdk-transport.mjs';
import {ContextPool} from '../src/context.mjs';
import {config} from '../src/config.mjs';
const credential={uid:'test',domain:'test.invalid',accessToken:'synthetic'},body={model:'test',messages:[{role:'user',content:'test'}],max_tokens:100};
test('replay SDK iterator ignoring cancellation cannot retain a busy lease',async t=>{
 const runtime=await mkdtemp(join(tmpdir(),'wb-abort-'));let started;
 const ready=new Promise(r=>started=r),transport=new SdkTransport({runtime,cliPath:process.execPath,toolMode:'replay'},{get:async()=>credential},{run:()=>({[Symbol.asyncIterator](){return this;},next(){started();return new Promise(()=>{});},return(){return Promise.resolve({done:true});},cleanup(){}})});
 t.after(async()=>{await transport.close();await rm(runtime,{recursive:true,force:true});});
 const c=new AbortController(),response=await transport.chat(body,c.signal),pending=response.text();await ready;c.abort(new DOMException('stop','AbortError'));await pending;
 assert.equal(transport.pool.stats().busy,0);assert.equal(transport.pool.stats().locks,0);assert.equal(transport.pool.stats().sessions,1);
 const record=[...transport.pool.records.values()][0];assert.equal(record.cancelled,true);
});
test('a prompt construction exception after acquire releases both busy state and lock',async t=>{
 const runtime=await mkdtemp(join(tmpdir(),'wb-prompt-')),transport=new SdkTransport({runtime,toolMode:'json'},{get:async()=>credential},{run:()=>{throw new Error('runtime must not start');}});
 t.after(async()=>{await transport.close();await rm(runtime,{recursive:true,force:true});});
 const original=transport.pool.acquire.bind(transport.pool);transport.pool.acquire=async(...args)=>{const lease=await original(...args);lease.messages=[{role:'user',content:[{type:'image_url',image_url:{url:'https://invalid.example/no-download'}}]}];return lease;};
 await assert.rejects(transport.chat(body,new AbortController().signal));assert.equal(transport.pool.stats().busy,0);assert.equal(transport.pool.stats().locks,0);
});
test('idle scoped root records remain eligible when all non-root candidates are absent',async t=>{
 const runtime=await mkdtemp(join(tmpdir(),'wb-slot-')),pool=new ContextPool({runtime,maxSessions:1});t.after(async()=>{await pool.close();await rm(runtime,{recursive:true,force:true});});
 const first=await pool.acquire({...body,bridge_scope:'one'},credential,new AbortController().signal);first.release();
 const second=await pool.acquire({...body,bridge_scope:'two'},credential,new AbortController().signal);assert.notEqual(second.record.id,first.record.id);second.release();
});
test('configuration accepts all three modes and defaults to 24 slots for concurrent conversations',()=>{
 const env={LOCALAPPDATA:'D:/synthetic-does-not-exist',APPDATA:'D:/synthetic-does-not-exist',WORKBUDDY_AUTH_FILE:'synthetic-never-read'};
 for(const mode of ['native','replay','json'])assert.equal(config({...env,WORKBUDDY_TOOL_MODE:mode}).toolMode,mode);
 assert.equal(config(env).maxSessions,24);assert.equal(config({...env,WORKBUDDY_MAX_SESSIONS:'9'}).maxSessions,9);
});
