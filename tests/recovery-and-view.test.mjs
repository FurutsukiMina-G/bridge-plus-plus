import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {WorkspaceViews,appendDisplayEvent,displayEvents} from '../app/ui/view-state.js';
import {ResponseProjection} from '../app/services/responses.mjs';
import {reconcileDshContent} from '../app/runtimes/dsh.mjs';
import {codexApprovalResult,codexLaunchSettings} from '../app/runtimes/codex.mjs';
import {KimiAcpAdapter} from '../app/runtimes/kimi-acp.mjs';

test('Kimi one-time approval cannot silently become a persistent permission',async()=>{
  const adapter=new KimiAcpAdapter({}),responses=[];adapter.rpc={respond:(...args)=>responses.push(args)};
  adapter.requests.set('approval',{id:1,params:{options:[{kind:'allow_always',optionId:'persistent'}]}});await assert.rejects(adapter.approve('approval','approve'),/授权范围/);assert.equal(responses.length,0);
  adapter.requests.get('approval').params.options.push({kind:'allow_once',optionId:'once'});await adapter.approve('approval','approve');assert.equal(responses[0][1].outcome.optionId,'once');
});

test('native Codex handoff preserves the selected bridge, context and effort without exposing auth in arguments',()=>{
  const launch=codexLaunchSettings({endpoint:{baseURL:'http://127.0.0.1:123/v1',key:'test-secret'},model:{contextMaximum:99999},variant:{id:'wb-exact-variant'},session:{selection:{reasoning:'high',contextBudget:8192}}});
  assert.ok(launch.args.includes('model_provider="agentworkbench"'));assert.ok(launch.args.includes('model="wb-exact-variant"'));assert.ok(launch.args.includes('model_context_window=8192'));assert.ok(launch.args.includes('model_reasoning_effort="high"'));assert.equal(launch.args.some(arg=>arg.includes('test-secret')),false);assert.equal(launch.env.AWB_GATEWAY_KEY,'test-secret');
});
test('journal recovery preserves committed history and backs up only an interrupted final fragment',async()=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/recovery-')),store=await new Store(root).open();
  await store.mutate(s=>{s.sessions=[{id:'session',status:'idle'}];});await writeFile(join(root,'sessions/session.jsonl'),JSON.stringify({type:'text',text:'kept'})+'\n{"type":"text","text":"partial');
  assert.equal((await store.events('session'))[0].text,'kept');await store.event('session',{type:'text',text:'after recovery'});assert.equal((await store.events('session')).length,2);assert.ok((await readdir(join(root,'sessions'))).some(name=>name.includes('.partial-')));await store.close();
});
test('stream display coalesces chunks and replaces interrupted DSH text with the committed reply',()=>{
  const events=[];for(let n=0;n<5000;n++)appendDisplayEvent(events,{type:'text',text:'x',turnId:'turn',attemptId:'attempt'});assert.equal(events.length,1);assert.equal(events[0].text.length,5000);
  appendDisplayEvent(events,{type:'content-replace',channel:'text',attemptId:'attempt',text:'corrected'});assert.equal(events[0].text,'corrected');assert.equal(displayEvents([{type:'native-event',data:{x:1}},{type:'notice',text:'visible'}]).length,1);
  assert.equal(reconcileDshContent('text','hello world','hello ','a').text,'world');assert.equal(reconcileDshContent('text','new','old','a').type,'content-replace');
});
test('switching projects preserves each editor and terminal without saving to the wrong project',()=>{
  const views=new WorkspaceViews(),state={projectId:'a',file:{path:'same.txt',projectId:'a',text:'draft'},dirty:true,tree:new Map(),expanded:new Set(),git:null};views.activate(state,'b');assert.equal(state.file,null);assert.equal(views.anyDirty(state),true);
  views.terminalEvent({projectId:'a',type:'terminal',text:'background'});views.activate(state,'a');assert.equal(state.file.text,'draft');assert.equal(state.dirty,true);assert.equal(state.terminalText,'background');
  views.activate(state,'b');state.file={path:'other.txt',projectId:'b'};views.saved(state,'a',{path:'same.txt',projectId:'a',text:'saved'});assert.equal(state.file.path,'other.txt');views.activate(state,'a');assert.equal(state.dirty,false);
});
test('Responses validates the full tool batch before publishing executable completions',()=>{
  const events=[],p=new ResponseProjection('fixture',event=>events.push(event));p.accept({choices:[{delta:{tool_calls:[{index:0,id:'a',function:{name:'first',arguments:'{}'}},{index:1,id:'b',function:{name:'second',arguments:'broken'}}]},finish_reason:'tool_calls'}]});assert.throws(()=>p.finish());assert.equal(events.some(e=>e.type==='response.output_item.done'),false);
  const usage=new ResponseProjection('fixture',()=>{});usage.accept({choices:[],usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3}});assert.equal(usage.usage.input_tokens_details,undefined);assert.equal(usage.usage.output_tokens_details,undefined);
});
test('Codex permission approval returns only the requested scope for the current turn',()=>{
  const message={method:'item/permissions/requestApproval',params:{permissions:{fileSystem:{read:['workspace']}}}};assert.deepEqual(codexApprovalResult(message,'approve'),{permissions:message.params.permissions,scope:'turn'});assert.deepEqual(codexApprovalResult(message,'reject'),{permissions:{},scope:'turn'});assert.throws(()=>codexApprovalResult({method:'unknown/requestApproval'},'approve'));
});
