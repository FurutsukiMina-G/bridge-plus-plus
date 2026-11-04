import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {launch} from '../app/core/process.mjs';
import {CodexAppServerAdapter as CodexAdapter} from '../app/runtimes/codex.mjs';
import {KimiAcpAdapter} from '../app/runtimes/kimi-acp.mjs';
const peer=resolve('tests/fixtures/permission-native.mjs');
for(const runtimeId of ['codex','kimi'])test(`${runtimeId} synthetic JSON-RPC child roundtrips real image prompt payload and a generated image over the old 4 MiB event limit`,{timeout:20000},async t=>{
 await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/media-native-')),path=join(root,'中文 图片.png'),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3cAAAAASUVORK5CYII=','base64');await writeFile(path,png);
 let finish;const ended=new Promise(r=>{finish=r;}),events=[],Adapter=runtimeId==='codex'?CodexAdapter:KimiAcpAdapter;
 const adapter=new Adapter({runtime:{id:runtimeId,executable:runtimeId==='kimi'?peer:process.execPath},...runtimeId==='codex'?{endpoint:{baseURL:'http://127.0.0.1:1',key:'fixture'},variant:{id:'fixture'},model:{}}:{},project:{path:root},dir:root,session:{selection:{modelKey:'native'}},emit:async e=>{events.push(e);if(e.type==='turn-end')finish(e);},saveNative:async()=>{},launchProcess:(_command,_args,options)=>launch(process.execPath,[peer],{...options,env:{...options.env,BPP_TEST_MEDIA:'1'}})});t.after(()=>adapter.close());
 await adapter.prompt('',[{kind:'image',mime:'image/png',name:'中文 图片.png',path}]);assert.equal((await ended).status,'completed');
 const observed=JSON.parse(events.find(e=>e.type==='text').text);if(runtimeId==='codex')assert.deepEqual(observed.input,[{type:'localImage',path}]);else assert.deepEqual(observed.prompt,[{type:'image',mimeType:'image/png',data:png.toString('base64')}]);
 const output=events.find(e=>e.type==='media-output');assert.equal(output.mime,'image/png');assert.equal(Buffer.from(output.data,'base64').length,5*1024*1024);assert.equal(events.some(e=>e.type==='error'),false);
});
