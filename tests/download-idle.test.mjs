import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdir,mkdtemp,readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {withIdleResponse} from '../app/services/download-stream.mjs';
import {downloadDsh} from '../app/services/environment-utils.mjs';
import {npmRegistryProxy} from '../app/services/environment-npm.mjs';
const slow=()=>new Response(new ReadableStream({async pull(controller){await delay(20);if(this.n===8){controller.close();return;}this.n=(this.n??0)+1;controller.enqueue(Uint8Array.of(65));}}));
const stalled=()=>new Response(new ReadableStream({pull(){return new Promise(()=>{});}}));
async function root(){await mkdir('.runtime/tests',{recursive:true});return mkdtemp(resolve('.runtime/tests/download-idle-'));}
test('continuous slow chunks outlive the idle interval; a stalled body or stalled headers aborts',async()=>{
 const bytes=await withIdleResponse(async()=>slow(),'https://fixture.invalid/slow',{idleTimeoutMs:100},async(_response,chunks)=>{const bytes=[];for await(const b of chunks)bytes.push(...b);return bytes;});assert.equal(bytes.length,8);
 await assert.rejects(withIdleResponse(async()=>stalled(),'https://fixture.invalid/stalled',{idleTimeoutMs:30},async(_response,chunks)=>{for await(const _b of chunks){}}),/空闲超时/);
 await assert.rejects(withIdleResponse(()=>new Promise(()=>{}),'https://fixture.invalid/headers',{idleTimeoutMs:30},()=>assert.fail('no response')),/空闲超时/);
});
test('explicit cancellation aborts a rejecting body without leaving an unhandled pending read',async()=>{const controller=new AbortController();const fetchImpl=async(_url,{signal})=>new Response(new ReadableStream({start(stream){stream.enqueue(Uint8Array.of(65));signal.addEventListener('abort',()=>stream.error(new Error('fixture body aborted')),{once:true});}}));await assert.rejects(withIdleResponse(fetchImpl,'https://fixture.invalid/cancel',{signal:controller.signal,idleTimeoutMs:100},async(_response,chunks)=>{for await(const _b of chunks)controller.abort();}),{name:'AbortError'});});
test('DSH download uses an idle deadline, verifies sustained slow data, and cleans a stalled partial file',async()=>{
 const dir=await root(),expected={size:8,sha512:createHash('sha512').update(Buffer.alloc(8,65)).digest('base64')};const file=await downloadDsh(async()=>slow(),'https://fixture.invalid/setup.exe',dir,expected,{idleTimeoutMs:100});assert.deepEqual(await readFile(file),Buffer.alloc(8,65));
 const empty=await root();await assert.rejects(downloadDsh(async()=>stalled(),'https://fixture.invalid/setup.exe',empty,expected,{idleTimeoutMs:30}),/空闲超时/);assert.deepEqual(await readdir(empty),[]);
});
test('npm proxy allows tarballs longer than the idle interval and returns 502 only when data stops',async t=>{
 const tarball='https://fixture.invalid/pkg.tgz';let stop=false;const proxy=await npmRegistryProxy({registry:'https://fixture.invalid',idleTimeoutMs:100,fetchImpl:async url=>url===tarball?(stop?stalled():slow()):new Response(JSON.stringify({dist:{tarball}}))});t.after(()=>proxy.close());const pkg=await (await fetch(proxy.base+'pkg')).json();assert.equal((await (await fetch(pkg.dist.tarball)).arrayBuffer()).byteLength,8);stop=true;assert.equal((await fetch(pkg.dist.tarball)).status,502);
});
