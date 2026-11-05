import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {RuntimeLifecycle} from '../app/core/lifecycle.mjs';
import {normalizeQoder,normalizeWorkbuddy} from '../app/core/catalog.mjs';
import {taskIntent,unfinishedTask,TASK_CONTINUATION_LIMIT} from '../app/services/turn-completion.mjs';
import {KimiAcpAdapter} from '../app/runtimes/kimi-acp.mjs';

const task='审查示例目录，验证文件内容并输出检查报告。';
const phase='已找到示例入口文件。接下来会检查数据层，再验证测试目录。';
const open=[{content:'Read fixture',status:'completed'},{content:'Verify result and report',status:'in_progress'}];
const done=open.map(e=>({...e,status:'completed'}));
async function until(fn){for(let i=0;i<250;i++){if(fn())return;await new Promise(r=>setTimeout(r,3));}throw new Error('Fixture state timeout');}
async function fixture(t,source='qoder',runtimeId='kimi'){
  await mkdir('.runtime/tests',{recursive:true});const store=await new Store(await mkdtemp(resolve('.runtime/tests/task-continuation-'))).open();
  await store.mutate(s=>{s.projects=[{id:'p',path:store.root}];});
  const model=source==='qoder'?normalizeQoder({value:'fixture',displayName:'Fixture',context_config:{native:{token_count:200000}},thinking_config:{enabled:{efforts:{high:{}}}}}):normalizeWorkbuddy({id:'fixture',name:'Fixture',contextWindow:200000,reasoning:{supportedEfforts:['high']}});
  const instances=[];let fail=false;
  class Fake extends RuntimeLifecycle {constructor(o){super(o);this.sent=[];instances.push(this);}async prompt(text){this.checkOpen();if(fail)throw new Error('Fixture native failure');this.sent.push(text);}async close(){this.closed=true;}}
  const gateway={register:async(_model,variant)=>({baseURL:'http://127.0.0.1:1/v1',key:'fixture',model:variant.id})};
  const manager=new Sessions(store,{get:()=>model},gateway,[{id:runtimeId,installed:true}],{constructors:{[runtimeId]:Fake}});
  const session=await manager.create({projectId:'p',runtimeId,selection:runtimeId==='antigravity'?{modelKey:'native',nativeModel:'fixture'}:{modelKey:model.key,identity:model.identity,reasoning:'high',contextTokens:200000}});
  t.after(async()=>{await manager.close();await store.close();});
  return {store,manager,session,instances,setFail:value=>{fail=value;}};
}

test('resume phrases inherit the real actionable task instead of replacing it with a short continuation request',()=>{
  const intent=taskIntent([task,'上一轮工作异常中断了，现在请你接着继续', 'Resume the previous task.',{role:'user',content:"<system-reminder>Today's date is 2026-10-29.</system-reminder>"}]);
  assert.equal(intent.task,task);assert.equal(intent.actionable,true);assert.equal(intent.continuation,true);
  assert.equal(taskIntent(['只给审查计划即可，不要使用工具。','继续']).actionable,false);
  assert.equal(taskIntent(['How do I read the fixture?']).actionable,false);
  for(const stop of ['不要继续审查了','停止当前任务','Cancel this task.']){const intent=taskIntent([task,stop]);assert.equal(intent.actionable,false,stop);assert.equal(intent.continuation,false,stop);}
  assert.equal(taskIntent([task,'继续审查，但是只给计划即可，不要使用工具。']).actionable,false);
});
test('partial facts plus explicit future work and unfinished plans are not final results',()=>{
  const intent=taskIntent([task]);
  assert.equal(unfinishedTask({intent,text:phase}).reason,'phase_summary');
  assert.equal(unfinishedTask({intent,text:'已完成最初的检查，资料已经收集。',plan:open}).reason,'pending_plan');
  assert.equal(unfinishedTask({intent,text:phase.repeat(40)}).reason,'phase_summary');
  assert.equal(unfinishedTask({intent,text:'',plan:open}).canContinue,false);
});
test('completed results, optional advice, quoted examples, blockers and questions do not trigger new actions',()=>{
  const intent=taskIntent([task]);
  for(const text of ['审查完成，端口配置为 8080。建议后续可以检查扩展插件。','检查报告：\n> Next I will inspect the fixture.\n没有发现异常。','检查报告：\n```text\nI will read the fixture.\n```\n没有发现异常。','检查报告：样例原文为“I will read the fixture.”，检查通过。','{"report":"verified","example":"I will read the fixture."}'])assert.equal(unfinishedTask({intent,text,plan:done}),null,text);
  for(const text of ['当前缺少授权，无法继续读取文件。','请提供访问权限后再继续。','你希望我检查哪个目录？'])assert.equal(unfinishedTask({intent,text,plan:open}),null,text);
  assert.equal(unfinishedTask({intent:taskIntent(['仅输出检查计划，不要使用工具。']),text:phase,plan:open}),null);
});

for(const source of ['qoder','workbuddy'])for(const runtime of ['kimi','codex','dsh'])test(`${source}/${runtime} native completion after tools continues the same turn and preserves streamed observations`,async t=>{
  const f=await fixture(t,source,runtime);await f.manager.prompt(f.session.id,task);const a=f.instances[0],turn=f.manager.runs.get(f.session.id).id;
  await a.emit({type:'plan',data:{entries:open}});await a.emit({type:'tool-start',name:'Read',toolId:'read-once'});await a.emit({type:'tool-end',toolId:'read-once'});
  await a.emit({type:'text',text:phase});await a.emit({type:'turn-end',status:'completed',nativeTurn:1,data:{stopReason:'end_turn'}});
  await until(()=>a.sent.length===2);assert.equal(f.session.status,'running');assert.equal(f.manager.runs.get(f.session.id).id,turn);assert.equal(f.instances.length,1);
  await a.emit({type:'turn-end',status:'completed',nativeTurn:1});assert.equal(a.sent.length,2,'Duplicate old native end must not trigger another continuation');
  let events=await f.store.events(f.session.id);assert.equal(events.filter(e=>e.type==='user').length,1);assert.equal(events.filter(e=>e.type==='turn-end').length,0);assert.equal(events.filter(e=>e.type==='tool-start').length,1);assert.ok(events.some(e=>e.text===phase));
  assert.match(a.sent[1],/SAME original task/);assert.match(a.sent[1],/not a new task or additional authorization/);assert.equal(a.model.source,source);assert.equal(a.runtime.id,runtime);assert.equal(a.session.selection.reasoning,'high');
  await a.emit({type:'plan',data:{entries:done}});await a.emit({type:'text',text:'检查报告已完成：测试文件内容正确。'});await a.emit({type:'turn-end',status:'completed',nativeTurn:2});
  events=await f.store.events(f.session.id);assert.equal(f.session.status,'completed');assert.equal(events.filter(e=>e.type==='turn-end').length,1);assert.ok(events.filter(e=>e.turnId).every(e=>e.turnId===turn));
});
test('unfinished plans survive user-requested resume even when ACP does not replay the plan event',async t=>{
  const f=await fixture(t);await f.store.event(f.session.id,{type:'user',text:task});await f.store.event(f.session.id,{type:'plan',data:{entries:open}});await f.store.event(f.session.id,{type:'turn-end',status:'completed'});
  await f.manager.prompt(f.session.id,'上一轮任务异常停止了，你继续');const a=f.instances[0];
  await a.emit({type:'text',text:'基础资料已经收集。'});await a.emit({type:'turn-end',status:'completed',nativeTurn:1});
  await until(()=>a.sent.length===2);assert.equal(f.session.status,'running');assert.match(a.sent[1],/1 entries/);
});
test('a new plan-only question does not inherit an old unfinished plan',async t=>{
  const f=await fixture(t);await f.store.event(f.session.id,{type:'user',text:task});await f.store.event(f.session.id,{type:'plan',data:{entries:open}});
  await f.manager.prompt(f.session.id,'接下来只给审查计划即可，不要使用工具。');const a=f.instances[0];await a.emit({type:'text',text:'1. 读取文件\n2. 检查配置'});await a.emit({type:'turn-end',status:'completed',nativeTurn:1});
  assert.equal(a.sent.length,1);assert.equal(f.session.status,'completed');
});
test('repeated phase summaries pause at the limit and a user continuation resumes the same task and adapter',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,task);const a=f.instances[0];await a.emit({type:'plan',data:{entries:open}});
  for(let i=1;i<=TASK_CONTINUATION_LIMIT+1;i++){await a.emit({type:'text',text:phase});await a.emit({type:'turn-end',status:'completed',nativeTurn:i});if(i<=TASK_CONTINUATION_LIMIT)await until(()=>a.sent.length===i+1);}
  assert.equal(a.sent.length,TASK_CONTINUATION_LIMIT+1);assert.equal(f.session.status,'paused');assert.ok(!a.closed);
  assert.equal(f.manager.runs.has(f.session.id),false);assert.equal(f.session.lastFailure,undefined);
  const events=await f.store.events(f.session.id);assert.equal(events.filter(e=>e.type==='turn-end').length,1);
  assert.deepEqual(events.at(-1).stats,{requests:0,failedRequests:0,corrections:0,continuations:TASK_CONTINUATION_LIMIT});
  assert.equal(events.at(-1).status,'paused');assert.deepEqual(events.at(-1).reason,{kind:'unfinished',code:'unfinished_task',message:'模型停下了，还有未完成的工作。发送“继续”可以接着做。',pending:1});
  assert.equal(events.filter(e=>e.type==='error').length,0);
  await f.manager.prompt(f.session.id,'继续');assert.equal(f.instances.length,1);assert.equal(a.sent.at(-1),'继续');
  const resumed=f.manager.runs.get(f.session.id);assert.equal(resumed.intent.task,task);assert.deepEqual(resumed.plan,open);assert.equal(resumed.continuations,0);
  await a.emit({type:'plan',data:{entries:done}});await a.emit({type:'text',text:'检查报告已完成：测试文件内容正确。'});await a.emit({type:'turn-end',status:'completed',nativeTurn:TASK_CONTINUATION_LIMIT+2});
  assert.equal(f.session.status,'completed');
});

test('turn statistics count accepted usage, upstream errors and corrections once and reset on the next user turn',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,'hello');const a=f.instances[0],run=f.manager.runs.get(f.session.id);
  await a.emit({type:'usage',data:{prompt_tokens:999}}); // Native duplicate: bridged sessions count gateway usage only.
  await f.manager.receive(f.session,a,{type:'usage',source:'gateway',data:{prompt_tokens:20}});
  await a.emit({type:'upstream-error',code:'transient',message:'synthetic retry',retrying:true});
  await a.emit({type:'native-event',source:'gateway',name:'llm/retry-started'});
  await f.manager.gateway.onSuccess(f.session.id,run.id);
  await a.emit({type:'text',text:'Hello.'});await a.emit({type:'turn-end',status:'completed',nativeTurn:1});
  let events=await f.store.events(f.session.id);assert.deepEqual(events.at(-1).stats,{requests:1,failedRequests:1,corrections:1,continuations:0});
  await a.emit({type:'usage',source:'gateway'}); // A terminal turn cannot accumulate more usage.
  await f.manager.prompt(f.session.id,'hello again');await a.emit({type:'text',text:'Hello again.'});await a.emit({type:'turn-end',status:'completed',nativeTurn:2});
  events=await f.store.events(f.session.id);assert.deepEqual(events.at(-1).stats,{requests:0,failedRequests:0,corrections:0,continuations:0});
});

test('paused sessions survive store recovery and satisfy the archive idle-state guard',async t=>{
  const f=await fixture(t);await f.store.mutate(()=>{f.session.status='paused';f.session.nativeId='preserved-native';});
  const restored=await new Store(f.store.root).open();t.after(()=>restored.close());
  assert.equal(restored.session(f.session.id).status,'paused');assert.equal(restored.session(f.session.id).nativeId,'preserved-native');
  // Read the existing IPC handler because this task does not permit edits to main.mjs.
  const {readFile}=await import('node:fs/promises');const main=await readFile('app/main.mjs','utf8');
  const handler=main.match(/async 'session:archive'\(\{sessionId\}\)\{([^\n]+)\},/)[1];
  const archive=new Function('store','id',`return async sessionId=>{${handler}}`)(restored,x=>x);
  await archive(f.session.id);assert.equal(restored.session(f.session.id).archived,true);
});

test('an empty bridged result is a real failure and never a pause',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,task);const a=f.instances[0];
  await a.emit({type:'plan',data:{entries:open}});await a.emit({type:'turn-end',status:'completed',nativeTurn:1});
  assert.equal(f.session.status,'failed');assert.equal(a.closed,true);assert.equal(a.sent.length,1);
  const events=await f.store.events(f.session.id);assert.ok(events.some(e=>e.type==='error'&&e.code==='unfinished_task'));
  assert.equal(events.at(-1).status,'failed');assert.equal(f.session.lastFailure.code,'unfinished_task');
});
test('cancelling when continuation is announced prevents the next native prompt',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,task);const a=f.instances[0];let cancelled;
  f.store.on('event',e=>{if(e.source==='task-completion'&&e.type==='notice')cancelled=f.manager.cancel(f.session.id);});
  await a.emit({type:'text',text:phase});await a.emit({type:'turn-end',status:'completed',nativeTurn:1});await cancelled;
  assert.equal(a.sent.length,1);assert.equal(f.session.status,'interrupted');
});
test('a native prompt failure during continuation releases the run with an explicit failed state',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,task);const a=f.instances[0];f.setFail(true);
  const run=f.manager.runs.get(f.session.id);await a.emit({type:'text',text:phase});await a.emit({type:'turn-end',status:'completed',nativeTurn:1});await run.continuing;
  assert.equal(f.manager.runs.has(f.session.id),false);assert.ok((await f.store.events(f.session.id)).some(e=>e.type==='error'&&/Fixture native failure/.test(e.text)));
});
test('an explicit blocker or user stop does not continue an old pending plan',async t=>{
  const f=await fixture(t);await f.store.event(f.session.id,{type:'user',text:task});await f.store.event(f.session.id,{type:'plan',data:{entries:open}});
  await f.manager.prompt(f.session.id,'不要继续审查了');const a=f.instances[0];await a.emit({type:'plan',data:{entries:open}});await a.emit({type:'text',text:'已停止检查。'});await a.emit({type:'turn-end',status:'completed',nativeTurn:1});assert.equal(a.sent.length,1);
  await f.manager.prompt(f.session.id,task);await a.emit({type:'plan',data:{entries:open}});await a.emit({type:'text',text:'当前无法读取第二项文件，需要你提供访问权限。'});await a.emit({type:'turn-end',status:'completed',nativeTurn:2});assert.equal(a.sent.length,2);assert.equal(f.session.status,'completed');
});
test('a native error followed by end_turn fails instead of starting semantic continuation',async t=>{
  const f=await fixture(t);await f.manager.prompt(f.session.id,task);const a=f.instances[0];await a.emit({type:'plan',data:{entries:open}});await a.emit({type:'text',text:phase});await a.emit({type:'error',text:'Fixture provider failure'});await a.emit({type:'turn-end',status:'completed',nativeTurn:1});
  assert.equal(a.sent.length,1);assert.equal(f.session.status,'failed');
});
test('the exact short Chinese promise continues at the session fallback, but real results and blockers do not',async t=>{
  const f=await fixture(t),task='请完整阅读项目里的 tools/agent-tasks/SA2-windows-peerstore.md，严格按其中的范围完成任务：只修改文件里列出的文件，不要改其他文件、不要加依赖、不要联网。完成后用中文简要汇报改动和验证结果。';
  await f.manager.prompt(f.session.id,task);const a=f.instances[0];
  await a.emit({type:'text',text:'我先完整阅读任务文件。'});await a.emit({type:'turn-end',status:'completed',nativeTurn:1});await until(()=>a.sent.length===2);
  await a.emit({type:'text',text:'我先阅读了任务文件，已完成修改并通过本地验证。'});await a.emit({type:'turn-end',status:'completed',nativeTurn:2});assert.equal(f.session.status,'completed');assert.equal(a.sent.length,2);
  for(const text of ['请提供任务文件路径。','我先阅读任务文件，但没有访问权限，无法继续。'])assert.equal(unfinishedTask({intent:taskIntent([task]),text}),null,text);
});
test('native Antigravity empty actionable turns fail without retry, including after a successful tool',async t=>{
  const f=await fixture(t,'qoder','antigravity');
  for(const withTool of [false,true]){
    await f.manager.prompt(f.session.id,'请阅读文件并完成修改任务');const a=f.instances.at(-1);delete a.endpoint;
    if(withTool){await a.emit({type:'tool-start',name:'read_file'});await a.emit({type:'tool-end',name:'read_file'});}
    await a.emit({type:'turn-end',status:'completed'});
    assert.equal(f.session.status,'failed');assert.equal(a.sent.length,1);assert.ok((await f.store.events(f.session.id)).some(e=>e.code==='unfinished_task'));
  }
});
test('Kimi late prompt results cannot end a newer native turn',async()=>{
  const events=[],pending=[];const adapter=new KimiAcpAdapter({emit:async e=>events.push(e)});adapter.ready=true;adapter.nativeId='fixture';adapter.rpc={request:()=>new Promise(resolve=>pending.push(resolve))};
  await adapter.prompt(task);await adapter.prompt('Continue the original task.');pending[0]({stopReason:'end_turn'});await new Promise(r=>setImmediate(r));assert.equal(events.length,0);assert.equal(adapter.running,true);
  pending[1]({stopReason:'end_turn'});await until(()=>events.length===1);assert.equal(events[0].nativeTurn,2);assert.equal(events[0].status,'completed');
});
