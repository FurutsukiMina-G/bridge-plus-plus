import test from 'node:test';
import assert from 'node:assert/strict';
import {npmRegistryProxy} from '../app/services/environment-npm.mjs';
const tarball='https://mirror.synthetic.invalid/kimi-code-3.2.1.tgz';
test('tarball first bytes reach npm before the upstream download completes',async t=>{
  let release;const gate=new Promise(r=>{release=r;});let finished=false;
  const proxy=await npmRegistryProxy({registry:'https://registry.synthetic.invalid',fetchImpl:async()=>new Response(new ReadableStream({async start(c){c.enqueue(new TextEncoder().encode('first'));await gate;c.enqueue(new TextEncoder().encode('last'));finished=true;c.close();}}))});t.after(async()=>{release();await proxy.close();});proxy.allowTarball(tarball);
  const response=await fetch(proxy.base+'tarball/'+encodeURIComponent(tarball)),reader=response.body.getReader();const first=await reader.read();assert.equal(new TextDecoder().decode(first.value),'first');assert.equal(finished,false);
  release();let rest='';for(;;){const r=await reader.read();if(r.done)break;rest+=new TextDecoder().decode(r.value);}assert.equal(rest,'last');assert.equal(finished,true);
});
test('a stalled partial tarball terminates the response and records a Chinese filename/mirror timeout',async t=>{
  const proxy=await npmRegistryProxy({registry:'https://registry.synthetic.invalid',idleTimeoutMs:40,fetchImpl:async()=>new Response(new ReadableStream({start(c){c.enqueue(Uint8Array.of(65));},pull(){return new Promise(()=>{});}}))});t.after(()=>proxy.close());proxy.allowTarball(tarball);
  const response=await fetch(proxy.base+'tarball/'+encodeURIComponent(tarball));assert.equal(response.status,200);await assert.rejects(response.arrayBuffer());
  assert.match(proxy.lastFailure(),/kimi-code-3\.2\.1\.tgz/);assert.match(proxy.lastFailure(),/mirror\.synthetic\.invalid.*超时/);assert.doesNotMatch(proxy.lastFailure(),/127\.0\.0\.1/);
});
test('declared oversized tarballs are rejected before streaming and unlisted destinations remain blocked',async t=>{
  let calls=0;const proxy=await npmRegistryProxy({registry:'https://registry.synthetic.invalid',fetchImpl:async()=>{calls++;return new Response('synthetic',{headers:{'content-length':String(150*1024*1024+1)}});}});t.after(()=>proxy.close());proxy.allowTarball(tarball);
  const response=await fetch(proxy.base+'tarball/'+encodeURIComponent(tarball));assert.equal(response.status,502);assert.match(await response.text(),/超过允许大小/);
  assert.equal((await fetch(proxy.base+'tarball/'+encodeURIComponent('https://unlisted.synthetic.invalid/x'))).status,403);assert.equal(calls,1);
});
