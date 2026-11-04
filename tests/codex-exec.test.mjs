import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {launch} from '../app/core/process.mjs';
import {CodexAdapter,CodexAppServerAdapter,codexLaunchSettings} from '../app/runtimes/codex.mjs';
import {CodexExecAdapter,codexExecArgs,codexExecEvent} from '../app/runtimes/codex-exec.mjs';
import {permissionCatalog,selectionPermissionCatalog,migratePermissionMode,codexExecPermissionArgs} from '../app/services/runtime-permissions.mjs';
import {mediaCapabilities} from '../app/services/media-capabilities.mjs';
import {redactMedia} from '../app/services/media.mjs';
const runtime={id:'codex',executable:process.execPath,permissions:permissionCatalog({id:'codex'},{workspace:true,readonly:true,approvals:true,autoReview:true,exec:{workspace:true,readonly:true,autoReview:true}})};
const session=()=>({selection:{modelKey:'native',nativeModel:'gpt-6.1-sol',reasoning:'high'}});
test('native exec arguments contain only selected model, effort, directory and permission flags, with stdin and resume images',()=>{
 for(const permissionMode of [null,'auto','readonly','auto-review'])for(const nativeId of [null,'existing-native']){
  const s={...session(),nativeId},args=codexExecArgs({session:s,runtime,project:{path:'中文 project'},permissionMode},[{kind:'image',path:'中文 image.png'}]);
  assert.equal(args[0],'exec');assert.equal(args.at(-1),'-');assert.equal(args[args.indexOf('-m')+1],'gpt-6.1-sol');assert.ok(args.includes('model_reasoning_effort="high"'));assert.equal(args[args.indexOf('-i')+1],'中文 image.png');
  assert.doesNotMatch(args.join(' '),/model_provider|auth|base_url|originator|clientInfo|ignore-user-config|bypass|AWB_GATEWAY/);
  if(nativeId){assert.equal(args[args.indexOf('resume')+1],nativeId);assert.ok(args.indexOf('-C')<args.indexOf('resume'));if(args.includes('-s'))assert.ok(args.indexOf('-s')<args.indexOf('resume'));}
 }
 assert.throws(()=>codexExecPermissionArgs('ask',runtime),/不支持每次询问/);assert.throws(()=>codexExecPermissionArgs('auto-review',{permissions:{}}));
 assert.throws(()=>codexExecArgs({session:session(),project:{path:'.'}},[{kind:'audio',path:'x.wav'}]),/仅核实/);
});
test('native and gateway routes and permission catalogs remain independent',()=>{
 assert.ok(new CodexAdapter({session:session()}) instanceof CodexExecAdapter);
 assert.ok(new CodexAdapter({session:{selection:{modelKey:'workbuddy:x'}}}) instanceof CodexAppServerAdapter);
 assert.deepEqual(selectionPermissionCatalog(runtime,{modelKey:'native'}).modes.map(x=>x.id),['auto','auto-review','readonly']);
 assert.ok(selectionPermissionCatalog(runtime,{modelKey:'workbuddy:x'}).modes.some(x=>x.id==='ask'));
 assert.deepEqual(migratePermissionMode(runtime,{modelKey:'native'},'ask').mode,'readonly');assert.equal(migratePermissionMode(runtime,{modelKey:'workbuddy:x'},'ask').mode,'ask');
 const settings=codexLaunchSettings({session:{selection:{}},endpoint:{baseURL:'http://127.0.0.1:1',key:'fixture'},model:{},variant:{id:'exact'}});assert.ok(settings.args.includes('model_provider="agentworkbench"'));assert.equal(settings.env.AWB_GATEWAY_KEY,'fixture');
 const r={id:'codex',media:{image:true,audio:true,nativeExec:{image:true,audio:false}}};
 assert.equal(mediaCapabilities(r,{modelKey:'native'},null,{inputModalities:['image','audio']}).audio.allowed,false);assert.equal(mediaCapabilities(r,{modelKey:'native'},null,{inputModalities:['image','audio']}).image.allowed,true);
});
test('exec JSONL projects reasoning, commands, file changes, MCP, plans, errors and exact terminal status',()=>{
 assert.equal(codexExecEvent({type:'item.completed',item:{type:'reasoning',text:'reason'}}).type,'thinking');
 assert.equal(codexExecEvent({type:'item.completed',item:{type:'agent_message',text:'answer'}}).text,'answer');
 for(const type of ['command_execution','file_change','mcp_tool_call','collab_tool_call','web_search','image_generation']){assert.equal(codexExecEvent({type:'item.started',item:{type}}).type,'tool-start');assert.equal(codexExecEvent({type:'item.completed',item:{type}}).type,'tool-end');}
 assert.deepEqual(codexExecEvent({type:'item.updated',item:{type:'todo_list',items:[{text:'work',completed:true}]}}).data.plan,[{step:'work',status:'completed'}]);
 assert.equal(codexExecEvent({type:'turn.failed'}).status,'failed');assert.equal(codexExecEvent({type:'turn.completed'}).status,'completed');assert.equal(codexExecEvent({type:'error',message:'Reconnecting... 2/5'}).type,'notice');assert.equal(codexExecEvent({type:'item.completed',item:{type:'error',message:'denied'}}).type,'notice');
});
async function fixture(t){
 const events=[],calls=[],s=session();let end;const wait=()=>new Promise(r=>{end=r;});
 const a=new CodexAdapter({session:s,runtime,project:{path:resolve('.')},permissionMode:'readonly',saveNative:async id=>{s.nativeId=id;},emit:async e=>{events.push(e);if(e.type==='turn-end')end?.(e);},launchProcess:(_c,args,options)=>{calls.push({args,options});return launch(process.execPath,[resolve('tests/fixtures/codex-exec-native.mjs'),...args],options);}});
 t.after(()=>a.close());return {a,s,events,calls,wait};
}
test('real JSONL child sends long prompts on stdin, resumes the same ID and flushes media/usage before close',{timeout:15000},async t=>{
 const f=await fixture(t),prompt='长'.repeat(50000);let ended=f.wait();await f.a.prompt(prompt);assert.equal((await ended).status,'completed');assert.equal(f.s.nativeId,'native-exec-fixture');assert.equal(f.calls[0].args.includes(prompt),false);assert.equal(f.calls[0].options.env,undefined);assert.equal(JSON.parse(f.events.find(e=>e.type==='text').text).prompt,prompt);
 ended=f.wait();await f.a.prompt('media',[{kind:'image',path:'中文.png'}]);assert.equal((await ended).status,'completed');assert.equal(f.calls[1].args[f.calls[1].args.indexOf('resume')+1],f.s.nativeId);assert.equal(f.events.filter(e=>e.type==='turn-end').length,2);assert.equal(f.events.filter(e=>e.type==='usage').length,2);assert.equal(Buffer.from(f.events.find(e=>e.type==='media-output').data,'base64').length,5*1024*1024);assert.equal(redactMedia(f.events.find(e=>e.type==='tool-end')).data.result,'[media omitted from journal]');
});
test('exec failures and missing terminal events never count as completion',{timeout:15000},async t=>{
 for(const prompt of ['fail','fatal','incomplete']){const f=await fixture(t),ended=f.wait();await f.a.prompt(prompt);assert.equal((await ended).status,'failed');assert.ok(f.events.some(e=>e.type==='error'));}
});
for(const [prompt,reason]of [['active-writer',/这个原生线程正被另一个 Codex 进程占用/],['active-writer-fatal',/这个原生线程正被另一个 Codex 进程占用/],['thread-store-conflict',/这个原生线程正被另一个 Codex 进程占用/],['no-rollout',/原生 CLI 未找到该线程日志/],['tls',/原生连接的 TLS 证书验证失败/]])test(`exec ${prompt} stderr explains failure and preserves the selected native thread`,{timeout:15000},async t=>{
 const f=await fixture(t);f.s.nativeId='existing-native';const ended=f.wait();await f.a.prompt(prompt);assert.equal((await ended).status,'failed');
 const error=f.events.find(e=>e.type==='error'&&e.data?.code===1);assert.ok(error);assert.match(error.text,reason);assert.equal(f.s.nativeId,'existing-native');assert.equal(f.s.selection.nativeModel,'gpt-6.1-sol');assert.equal(f.calls.length,1);assert.equal(f.calls[0].args[f.calls[0].args.indexOf('resume')+1],'existing-native');
 if(prompt.startsWith('active-writer')||prompt==='thread-store-conflict'){assert.match(error.text,/通常是 Codex 桌面版正打开着它/);assert.match(error.text,/请在桌面版切到别的线程或退出桌面版后再发/);assert.match(error.text,/Bridge\+\+ 不会新建替代线程/);}
});
test('non-fatal exec item errors are notices, identical warnings appear once across completed rounds',{timeout:15000},async t=>{
 const f=await fixture(t);
 for(let n=0;n<2;n++){const ended=f.wait();await f.a.prompt('warnings');assert.equal((await ended).status,'completed');}
 const warnings=f.events.filter(e=>e.source==='native-warning');assert.equal(warnings.length,1);assert.match(warnings[0].text,/disable_response_storage/);assert.equal(warnings[0].type,'notice');assert.equal(f.events.some(e=>e.type==='error'),false);assert.equal(f.events.filter(e=>e.type==='text').length,2);
});
test('exec completion waits for natural process close and never starts the next round during rollout cleanup',{timeout:15000},async t=>{
 const f=await fixture(t),ended=f.wait();await f.a.prompt('linger');
 for(let n=0;n<200&&f.a.active.terminal!=='completed';n++)await new Promise(r=>setTimeout(r,5));
 assert.equal(f.a.active.terminal,'completed');assert.equal(f.a.active.reported,false);assert.equal(f.a.active.child.exitCode,null);assert.equal(f.a.active.child.signalCode,null);await assert.rejects(f.a.prompt('too early'),/仍在执行/);assert.equal(f.calls.length,1);
 assert.equal((await ended).status,'completed');assert.equal(f.a.active.child.exitCode,0);assert.equal(f.a.active.child.signalCode,null);
});
test('exec reads the owned native rollout before terminal completion and never leaks its raw records',{timeout:15000},async t=>{
 const events=[],calls=[],s=session();let end;const ended=new Promise(r=>{end=r;});
 const a=new CodexAdapter({session:s,runtime,project:{path:resolve('.')},permissionMode:'readonly',rolloutMedia:{checkpoint:async id=>{calls.push(['checkpoint',id]);return {id};},read:async(id,checkpoint,emit)=>{calls.push(['read',id,checkpoint]);await emit({type:'media-output',data:'fixture-image-only',origin:{runtimeId:'codex',itemId:'rollout-image'}});}},saveNative:async id=>{s.nativeId=id;},emit:async e=>{events.push(e);if(e.type==='turn-end')end(e);},launchProcess:(_c,args,options)=>launch(process.execPath,[resolve('tests/fixtures/codex-exec-native.mjs'),...args],options)});
 t.after(()=>a.close());await a.prompt('reply');assert.equal((await ended).status,'completed');assert.equal(calls[0][0],'checkpoint');assert.equal(calls[1][1],s.nativeId);assert.ok(events.findIndex(e=>e.type==='media-output')<events.findIndex(e=>e.type==='turn-end'));assert.equal(events.filter(e=>e.type==='media-output').length,1);
});
test('exec cancellation kills the owned process and preserves native identity',{timeout:15000},async t=>{
 const f=await fixture(t);await f.a.prompt('hold');for(let i=0;i<100&&!f.s.nativeId;i++)await new Promise(r=>setTimeout(r,10));assert.equal(f.s.nativeId,'native-exec-fixture');const ended=f.wait();await f.a.cancel();assert.equal((await ended).status,'interrupted');assert.equal(f.s.nativeId,'native-exec-fixture');assert.equal(f.events.filter(e=>e.type==='turn-end').length,1);assert.ok(f.a.active.child.exitCode!==null||f.a.active.child.signalCode);
});
