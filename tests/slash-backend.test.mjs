import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {RuntimeLifecycle} from '../app/core/lifecycle.mjs';
import {launch} from '../app/core/process.mjs';
import {normalizeWorkbuddy} from '../app/core/catalog.mjs';
import {ClaudeAdapter} from '../app/runtimes/claude.mjs';
import {KimiAcpAdapter} from '../app/runtimes/kimi-acp.mjs';
import {CodexAdapter,CodexAppServerAdapter} from '../app/runtimes/codex.mjs';
import {DshAdapter} from '../app/runtimes/dsh.mjs';
import {AntigravityAdapter,antigravityInput} from '../app/runtimes/antigravity.mjs';
import {commandView,commandConflict} from '../app/services/slash-commands.mjs';

const peer=resolve('tests/fixtures/slash-native.mjs'),model=normalizeWorkbuddy({id:'offline-fixture',name:'Offline fixture',supportsToolCall:true});
const until=async fn=>{for(let n=0;n<1000;n++){if(fn())return;await new Promise(r=>setTimeout(r,5));}throw new Error('offline peer timed out');};
async function fixture(t,runtimeId,{native=false,constructors,commandTimeoutMs=15000}={}){
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/slash-')),store=await new Store(root).open(),events=[],calls=[];
  store.on('event',e=>events.push(e));await store.mutate(s=>{s.projects=[{id:'p',path:root}];});
  const host={ready:async()=>{},configure:async()=> 'fixture-provider',follow:async(id,frame)=>{host.frame=frame;return ()=>{};},followApprovals:async()=>({stop(){}}),rpc:async(method,args)=>{
    calls.push({method,args});if(method==='session/create')return {sessionId:'dsh-native'};if(method==='session/list')return {items:[]};
    if(method==='commands/list')return [{name:'goal',description:'Goal'},{name:'plan',description:'Plan',input:{hint:'[off|message]'}},{name:'compact',description:'Compact'},{name:'feedback',description:'Feedback'},{name:'permission'},{name:'export'}];
    if(method==='commands/execute')return {result:{kind:args.line.includes('fail')?'error':'success',text:'DSH command result'}};
    if(method==='session/prompt')queueMicrotask(()=>void host.frame({type:'event',event:{seq:++host.seq,type:'assistant/message',data:{content:[{type:'text',text:JSON.stringify(args)}]}}}).then(()=>host.frame({type:'event',event:{seq:++host.seq,type:'turn/end',data:{reason:'completed'}}})));
    return {};
  },seq:0};
  const base={claude:ClaudeAdapter,kimi:KimiAcpAdapter,codex:CodexAdapter,dsh:DshAdapter,antigravity:AntigravityAdapter};
  const instances=[];
  class Adapter extends (base[runtimeId]??RuntimeLifecycle){constructor(options){super({...options,dir:root,configDir:join(root,'claude-private'),host,rolloutMedia:{checkpoint:async()=>null,read:async()=>{}},codexHomeOptions:{sourceHome:join(root,'empty-home')},launchProcess:(_command,_args,settings)=>launch(process.execPath,runtimeId==='codex'&&native?[resolve('tests/fixtures/codex-exec-native.mjs')]:[peer,runtimeId],settings)});instances.push(this);}}
  const manager=new Sessions(store,{get:key=>{assert.equal(key,model.key);return model;}},{register:async()=>({baseURL:'http://127.0.0.1:1',key:'offline'})},[{id:runtimeId,installed:true,executable:runtimeId==='kimi'?peer:process.execPath}],{constructors:constructors??{[runtimeId]:Adapter},commandTimeoutMs});
  const session=await manager.create({projectId:'p',runtimeId,selection:native||runtimeId==='kimi'?{modelKey:'native'}:{modelKey:model.key,identity:model.identity},recordRules:false});
  t.after(async()=>{await manager.close();await store.close();});return {root,store,events,calls,host,manager,session,instances};
}
async function turn(f,text){const result=await f.manager.prompt(f.session.id,text);await until(()=>!f.manager.runs.has(f.session.id));return result;}

test('command metadata filters conflicts, hidden/terminal names and aliases, preserves kinds and sorts',()=>{
  const raw=[{name:'usage',aliases:['cost','model']},{name:'heapdump'},{name:'agents'},{name:'auto-mode-setup'},{name:'__remote-workflow'},{name:'workflow-launch-exec'},{name:'doctor',aliases:['checkup']},{name:'clear',aliases:['reset','new']},{name:'config'},{name:'code-review',argumentHint:'[level]',aliases:['review']}];
  for(const name of ['model','effort','fast','exit','output-style','color','focus','rename','reload-plugins','list-agents','autocompact'])raw.push({name});
  const view=commandView('claude',model.key,raw,{skills:['code-review'],terminal:['doctor']});
  assert.deepEqual(view.commands,[{name:'code-review',description:'',hint:'[level]',aliases:['review'],kind:'skill'},{name:'usage',description:'',hint:'',aliases:['cost'],kind:'command'}]);
  for(const name of ['model','new','reset','settings','name','peers','permissions'])assert.match(commandConflict('claude',model.key,name),/Bridge\+\+/);
});

for(const runtimeId of ['claude','kimi','dsh'])test(`${runtimeId}: handshake-only discovery, durable runtime cache, event, exact slash prompt/RPC and ordinary unknown`,async t=>{
  const f=await fixture(t,runtimeId);assert.deepEqual(f.manager.runtimeCommands(runtimeId,f.session.selection.modelKey).commands,[]);
  const view=await f.manager.commands(f.session.id);assert.equal(view.source,'native');assert.equal(view.stale,false);assert.ok(view.commands.length);assert.equal(f.events.some(e=>e.type==='user'),false);assert.equal(f.calls.some(e=>e.method==='session/prompt'),false);
  assert.deepEqual(f.manager.runtimeCommands(runtimeId,f.session.selection.modelKey),view);assert.ok(f.events.some(e=>e.type==='commands'&&e.sessionId===f.session.id&&e.runtimeId===runtimeId));
  const reopened=await new Store(f.root).open(),restored=new Sessions(reopened,null,null,[{id:runtimeId,installed:true}]);assert.deepEqual(restored.runtimeCommands(runtimeId,f.session.selection.modelKey),view);await restored.close();await reopened.close();
  await f.manager.agentRules.append('回复用中文');const text=runtimeId==='claude'?'/ctx':runtimeId==='kimi'?'/status':'/反馈 hello';await turn(f,text);assert.equal(f.session.rulesVersion,undefined);
  if(runtimeId==='dsh'){assert.deepEqual(f.calls.find(c=>c.method==='commands/list').args,{agentId:'dsh-native'});assert.deepEqual(f.calls.find(c=>c.method==='commands/execute').args,{agentId:'dsh-native',line:text,submittedAttachments:[]});assert.equal(f.calls.some(c=>c.method==='session/prompt'),false);assert.ok(f.events.some(e=>e.type==='notice'&&e.data?.kind==='success'));}
  else{const response=f.events.filter(e=>e.type==='text').at(-1).text;assert.equal(runtimeId==='kimi'?JSON.parse(response)[0].text:response,text);}
  await turn(f,'普通消息');assert.ok(f.session.rulesVersion);const last=f.events.filter(e=>e.type==='text').at(-1)?.text;
  const sent=runtimeId==='kimi'?JSON.parse(last)[0].text:runtimeId==='dsh'?f.calls.filter(c=>c.method==='session/prompt').at(-1).args.request.content[0].text:last;
  if(runtimeId!=='claude')assert.match(sent,/^<bridge-long-term-requirements>/);
  await turn(f,'/unknown keep this');const unknown=f.events.filter(e=>e.type==='text').at(-1).text;assert.equal(runtimeId==='kimi'?JSON.parse(unknown)[0].text:runtimeId==='dsh'?JSON.parse(unknown).request.content[0].text:unknown,'/unknown keep this');
  const before=f.calls.length;for(const conflict of runtimeId==='dsh'?['/permission auto','/权限 auto','/export','/导出']:['/model x','/new','/settings'])await assert.rejects(f.manager.prompt(f.session.id,conflict),/Bridge\+\+/);assert.equal(f.calls.length,before);
});

test('Claude changed lists and terminal/skill metadata update outside a run; compact/local output completes',async t=>{
  const f=await fixture(t,'claude');await f.manager.commands(f.session.id);await turn(f,'/compact');assert.equal(f.session.status,'completed');assert.ok(f.events.some(e=>e.type==='notice'&&/压缩/.test(e.text)));
  const adapter=f.instances[0];assert.equal((await f.manager.commands(f.session.id)).commands.some(c=>c.name==='doctor'),false);assert.equal((await f.manager.commands(f.session.id)).commands.find(c=>c.name==='code-review').kind,'skill');
  const count=f.events.filter(e=>e.type==='commands').length;await adapter.message({type:'system',subtype:'commands_changed',commands:[{name:'new-skill',aliases:['ns'],argumentHint:'<input>'}]});assert.equal(f.events.filter(e=>e.type==='commands').length,count+1);assert.equal(f.manager.runtimeCommands('claude',model.key).commands[0].name,'new-skill');
  await adapter.message({type:'system',subtype:'local_command_output',content:'local stdout'});
});

test('Kimi commands arriving after turn end are cached without a journal or active run',async t=>{
  const f=await fixture(t,'kimi');await f.manager.commands(f.session.id);await turn(f,'/status');const adapter=f.instances[0],before=f.events.length;
  await adapter.message({method:'session/update',params:{update:{sessionUpdate:'available_commands_update',availableCommands:[{name:'skill:late',input:{hint:'<args>'}}]}}});
  const view=f.manager.runtimeCommands('kimi','native');assert.deepEqual(view.commands,[{name:'skill:late',description:'',hint:'<args>',aliases:[],kind:'skill'}]);assert.ok(f.events.slice(before).some(e=>e.type==='commands'));
});

test('DSH command errors stay notices; plan/goal follow activity retains the same run',async t=>{
  const f=await fixture(t,'dsh');await f.manager.commands(f.session.id);await turn(f,'/feedback fail');assert.equal(f.session.status,'failed');assert.ok(f.events.some(e=>e.type==='notice'&&e.data?.kind==='error'));assert.equal(f.events.some(e=>e.type==='text'),false);
  for(const text of ['/plan implement','/goal implement']){await f.manager.prompt(f.session.id,text);assert.equal(f.manager.runs.has(f.session.id),true);await f.host.frame({type:'event',event:{seq:++f.host.seq,type:'assistant/message',data:{content:[{type:'text',text:'native work completed'}]}}});await f.host.frame({type:'event',event:{seq:++f.host.seq,type:'turn/end',data:{reason:'completed'}}});assert.equal(f.session.status,'completed');}
  assert.equal(f.calls.some(c=>c.method==='session/prompt'),false);
});

test('Codex app-server curated commands map compact/review/goal RPC and never send slash as turn input',async t=>{
  const f=await fixture(t,'codex');assert.equal(f.manager.runtimeCommands('codex',model.key).stale,true);const view=await f.manager.commands(f.session.id);assert.equal(view.source,'curated');assert.deepEqual(view.commands.map(c=>c.name),['compact','goal','review']);assert.equal(f.instances.length,0);
  for(const [text,target]of [['/review',{type:'uncommittedChanges'}],['/review base main',{type:'baseBranch',branch:'main'}],['/review commit abc title words',{type:'commit',sha:'abc',title:'title words'}],['/review focus on tests',{type:'custom',instructions:'focus on tests'}]]){
    const before=f.events.length;await turn(f,text);const responses=f.events.slice(before).filter(e=>e.type==='text');assert.equal(responses.length,1);const observed=JSON.parse(responses[0].text);assert.equal(observed.method,'review/start');assert.deepEqual(observed.target,target);assert.equal(observed.delivery,'inline');
  }
  await turn(f,'/compact');assert.equal(f.session.status,'completed');assert.equal(f.events.filter(e=>e.type==='notice'&&/Codex 已压缩/.test(e.text)).length,1);
  await turn(f,'/goal objective');await turn(f,'/goal');assert.ok(f.events.some(e=>e.type==='notice'&&e.text.includes('objective')));await turn(f,'/goal clear');await turn(f,'/goal');assert.ok(f.events.some(e=>e.type==='notice'&&e.text==='当前没有长期目标。'));
  await turn(f,'/unknown');const ordinary=JSON.parse(f.events.filter(e=>e.type==='text').at(-1).text);assert.equal(ordinary.method,'turn/start');assert.equal(ordinary.input[0].text,'/unknown');
});

test('Codex compact deduplicates legacy notifications in either completion order',async()=>{
  for(const reverse of [false,true]){
    const events=[],adapter=new CodexAppServerAdapter({emit:async e=>events.push(e)});adapter.running=true;adapter.command='compact';adapter.turnId='compact-turn';
    const legacy={method:'thread/compacted',params:{turnId:'compact-turn'}},completed={method:'turn/completed',params:{turn:{id:'compact-turn',status:'completed'}}};
    await adapter.message(reverse?completed:legacy);await adapter.message(reverse?legacy:completed);assert.equal(events.filter(e=>e.type==='notice').length,1);assert.equal(events.filter(e=>e.type==='turn-end').length,1);assert.equal(adapter.running,false);
  }
});

test('none sources distinguish Codex exec and Antigravity, with exact notes and slash attachment ordering',async t=>{
  for(const runtimeId of ['codex','antigravity']){
    const f=await fixture(t,runtimeId,{native:true});const cold=f.manager.runtimeCommands(runtimeId,'native');assert.equal(cold.source,'none');assert.equal(cold.stale,true);assert.ok(cold.note);const view=await f.manager.commands(f.session.id);assert.equal(view.stale,false);assert.equal(view.commands.length,0);assert.ok(view.note);assert.equal(f.instances.length,0);
    if(runtimeId==='codex')assert.notEqual(f.manager.runtimeCommands('codex',model.key).source,'none');
  }
  const input=antigravityInput('/skill inspect',[{path:'D:\\fixture\\image.png',name:'image.png',kind:'image',mime:'image/png'}]);assert.ok(input.message.content.startsWith('/skill inspect\n'));assert.match(input.message.content,/image.png/);
});

test('Codex exec passes unknown slash text as ordinary input; Antigravity skips rules until its next ordinary input',async t=>{
  const exec=await fixture(t,'codex',{native:true});await turn(exec,'/unknown arguments');assert.equal(JSON.parse(exec.events.find(e=>e.type==='text').text).prompt,'/unknown arguments');assert.equal(exec.manager.runtimeCommands('codex',model.key).commands.length,0);
  const agy=await fixture(t,'antigravity',{native:true});await agy.manager.agentRules.append('回复用中文');await turn(agy,'/skill arguments');assert.equal(agy.events.find(e=>e.type==='text').text,'/skill arguments');assert.equal(agy.session.rulesVersion,undefined);
  await assert.rejects(agy.manager.prompt(agy.session.id,'/model x'),/Bridge\+\+/);await turn(agy,'ordinary input');assert.match(agy.events.filter(e=>e.type==='text').at(-1).text,/^<bridge-long-term-requirements>/);assert.ok(agy.session.rulesVersion);
});

test('unknown slash input on a fresh Kimi session retains ordinary-message rules injection',async t=>{
  const f=await fixture(t,'kimi');await f.manager.agentRules.append('回复用中文');await turn(f,'/unknown arguments');const content=JSON.parse(f.events.find(e=>e.type==='text').text);assert.match(content[0].text,/^<bridge-long-term-requirements>/);assert.ok(content[0].text.endsWith('/unknown arguments'));assert.ok(f.session.rulesVersion);
});

test('list failures/timeouts return stale cache, coalesce handshakes and preserve late updates',async t=>{
  let resolveCommands,queries=0;
  class Slow extends RuntimeLifecycle{async commands(){queries++;return new Promise(resolve=>{resolveCommands=resolve;});}async close(){this.closed=true;}}
  const f=await fixture(t,'kimi',{constructors:{kimi:Slow},commandTimeoutMs:20});
  const [first,second]=await Promise.all([f.manager.commands(f.session.id),f.manager.commands(f.session.id)]);assert.equal(first.stale,true);assert.deepEqual(first.commands,[]);assert.deepEqual(second,first);assert.equal(queries,1);
  resolveCommands(commandView('kimi','native',[{name:'status'}]));await until(()=>!f.manager.commandFlights.has(f.session.id));assert.equal(f.manager.runtimeCommands('kimi','native').commands[0].name,'status');
  f.manager.adapters.get(f.session.id).commands=async()=>{throw new Error('offline');};const cached=await f.manager.commands(f.session.id);assert.equal(cached.stale,true);assert.equal(cached.commands[0].name,'status');
});

test('IPC method table and environment gating expose the exact two command endpoints',async()=>{
  const main=await readFile('app/main.mjs','utf8');for(const name of ['session:commands','runtime:commands']){assert.ok(main.includes(`async '${name}'`));assert.ok(main.match(/const environmentMethods[^\n]+/)[0].includes(`'${name}'`));}
});
