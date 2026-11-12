import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,utimes,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {RuntimeLifecycle} from '../app/core/lifecycle.mjs';
import {normalizeQoder,normalizeWorkbuddy} from '../app/core/catalog.mjs';
import {AgentRules,agentRulesMethods,parseRules,selectRules,normalizeRule,stripRuleComments,parseDetectedRules,writeRulesFile,RULE_DETECTOR_PROMPT} from '../app/services/agent-rules.mjs';
import {workbenchSnapshot} from '../app/services/workbench-snapshot.mjs';

const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:value=>resolve(value)};};
async function fixture(t,options={}){await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/agent-rules-')),store=await new Store(root).open();store.state.sessions.push({id:'s1',title:'规则来源'});store.state.catalog=listed();const rules=new AgentRules(store,options);t.after(async()=>{await rules.close();await store.close();});return {root,store,rules};}
async function drained(rules){while(rules.jobs.size)await Promise.all([...rules.jobs.values()].map(j=>j.promise));}
// The DeepSeek Flash the detector picks on each source, and catalog neighbours it must never pick: an older Flash, a Pro, a Qwen.
const models=[normalizeQoder({value:'dfmodel',displayName:'DeepSeek-Flash',supportsToolCall:true}),normalizeWorkbuddy({id:'deepseek-v4.1-flash',name:'DeepSeek-V4.1-Flash',supportsToolCall:true})];
const others=[normalizeWorkbuddy({id:'deepseek-v4-flash',name:'Deepseek-V4-Flash',supportsToolCall:true}),normalizeWorkbuddy({id:'deepseek-v4-pro',name:'DeepSeek-V4-Pro',supportsToolCall:true}),normalizeQoder({value:'qfmodel',displayName:'Qwen3.8-Flash',supportsToolCall:true})];
const listed=()=>Object.fromEntries(['qoder','workbuddy'].map(source=>[source,{status:'ready',models:[...others,...models].filter(m=>m.source===source)}]));
const providers={get:key=>[...models,...others].find(m=>m.key===key)};
const FLASH={workbuddy:'workbuddy:deepseek-v4.1-flash',qoder:'qoder:dfmodel'};
const gateway={register:async(model,variant)=>({baseURL:'http://127.0.0.1:1/'+model.source,key:'fixture',model:variant.id})};
const response=text=>({ok:true,json:async()=>({choices:[{message:{content:text}}]})});

test('rule parser removes all comments, preserves metadata, deduplicates normalized text and gives handwritten rules stable IDs',()=>{
  const text='<!--\n- 隐藏规则\n-->\n- 回复用中文 <!-- id:r_1 at:2026-11-12T08:00:00Z session:s1 auto -->\n- 回复用中文\n- ＡＢＣ  def <!-- secret -->\n- abc def\n';
  const items=parseRules(text);assert.equal(items.length,2);assert.deepEqual(items[0],{id:'r_1',text:'回复用中文',at:'2026-11-12T08:00:00Z',sessionId:'s1',auto:true});
  assert.equal(items[1].id,parseRules('- ABC def')[0].id);assert.equal(normalizeRule('ＡＢＣ   DEF'),'abc def');assert.equal(stripRuleComments('a<!-- hidden -->b'),'ab');assert.equal(selectRules(items).text.includes('<!--'),false);
});
test('injection caps 50 rules and 8 KiB by dropping oldest automatic entries first',()=>{
  const items=Array.from({length:52},(_,i)=>({id:'r_'+i,text:'规则'+i,auto:i<51,at:new Date(i*1000).toISOString()})),view=selectRules(items);
  assert.equal(view.overflow,true);assert.equal(view.items.length,50);assert.equal(view.items.some(r=>r.id==='r_0'||r.id==='r_1'),false);assert.equal(view.items.at(-1).auto,false);
  const big=selectRules(Array.from({length:40},(_,i)=>({id:''+i,text:'中'.repeat(120)+i,auto:true,at:new Date(i*1000).toISOString()})));assert.ok(Buffer.byteLength(big.text)<=8192);assert.ok(big.overflow);
  assert.equal(selectRules([{id:'manual',text:'中'.repeat(4000),auto:false}]).text,'');
});
test('all service instances share the write lock; concurrent auto/manual adds do not lose data or duplicate rules',async t=>{
  const {rules,store}=await fixture(t),other=new AgentRules(store);
  await Promise.all(Array.from({length:20},(_,i)=>(i%2?rules:other).append('长期要求'+(i%10),{auto:i%2===0,sessionId:'s1'})));
  assert.equal((await rules.read()).items.length,10);assert.equal((await rules.read()).items.filter(r=>r.auto).length,5);
  const events=await store.events('s1');assert.equal(events.filter(e=>e.source==='long-term-rule').length,5);
});
test('IPC contract supports save/add/delete/undo/auto, metadata and original-session notices',async t=>{
  const {rules,store}=await fixture(t),methods=agentRulesMethods(()=>rules),changes=[];store.on('event',e=>{if(e.type==='rules-change')changes.push(e);});
  const row=await rules.append('以后回复用中文',{auto:true,sessionId:'s1'});
  const view=await methods['rules:get']();assert.deepEqual(Object.keys(view).sort(),['path','text','items','injected','overflow','autoRecord','detector','updatedAt'].sort());assert.equal(view.autoRecord,true);assert.equal(view.items[0].sessionTitle,'规则来源');
  const saved=await methods['rules:save']({text:view.text});assert.equal(saved.items[0].id,row.id);assert.ok(saved.text.includes('session:s1 auto'));
  const added=await methods['rules:add']({text:'每次先运行测试'});assert.equal(added.items.length,2);assert.equal(added.items[1].auto,false);
  await methods['rules:delete']({id:added.items[1].id});assert.equal((await rules.read()).items.length,1);
  await methods['rules:undo']({id:row.id});const events=await store.events('s1');assert.ok(events.some(e=>e.undone&&e.ruleId===row.id&&e.text==='已撤销长期要求：以后回复用中文'));
  assert.equal((await methods['rules:auto']({enabled:false})).autoRecord,false);assert.equal(store.state.preferences.autoRecordRules,false);assert.ok(changes.length>=5);
});
test('detector prompt and JSON validation enforce conservative long-term extraction limits',()=>{
  for(const phrase of ['长期/以后/每次/一律/默认/不要再/记住/从现在起','always/never/from now on/remember','一次性要求','具体指示','拿不准就不记','≤120','最多 3','用户的语言'])assert.ok(RULE_DETECTOR_PROMPT.includes(phrase));
  assert.deepEqual(parseDetectedRules('{"rules":[{"text":" 用中文 "}]}'),['用中文']);
  for(const text of ['no','```json\n{"rules":[]}\n```','null','{}','{"rules":[{"text":" "}]}','{"rules":[{"text":2}]}',JSON.stringify({rules:[{text:'中'.repeat(121)}]}),JSON.stringify({rules:[{text:'a\nb'}]}),JSON.stringify({rules:Array(4).fill({text:'abc'})})])assert.throws(()=>parseDetectedRules(text));
});
test('detector uses the exact primary model with auxiliary headers, existing rules and deduplication',async t=>{
  const calls=[],{rules,store}=await fixture(t,{providers,gateway,fetchImpl:async(url,options)=>{calls.push({url,...options});return response('{"rules":[{"text":"回复用中文"},{"text":"每次先检查测试"}]}');}});
  await rules.append('回复用中文');rules.observe(store.session('s1'),'记住，以后每次先检查测试');await drained(rules);
  assert.equal(calls.length,1);assert.ok(calls[0].url.endsWith('/workbuddy/chat/completions'),'a session without a source model asks WorkBuddy first');assert.equal(calls[0].headers['x-bridge-auxiliary'],'1');assert.equal(calls[0].headers['x-bridge-effort'],'none,low,minimal,medium');
  const body=JSON.parse(calls[0].body);assert.equal(body.max_tokens,400);assert.equal(body.stream,false);assert.equal(body.model.includes(Buffer.from('deepseek-v4.1-flash').toString('base64url')),true);assert.deepEqual(JSON.parse(body.messages[1].content).existingRules,['回复用中文']);assert.equal((await rules.read()).items.length,2);
  assert.equal((await store.events('s1')).filter(e=>e.source==='long-term-rule').length,1);
});
test('detector skips opted-out, attachment-only, slash, short and globally disabled messages without a request',async t=>{
  let count=0;const {rules,store}=await fixture(t,{providers,gateway,fetchImpl:async()=>{count++;return response('{"rules":[]}');}}),s=store.session('s1');
  for(const text of ['', '  ', '/remember hello', 'a b c'])rules.observe(s,text);s.recordRules=false;rules.observe(s,'以后回复用中文');delete s.recordRules;await rules.auto(false);rules.observe(s,'记住以后用中文');await drained(rules);assert.equal(count,0);assert.equal(rules.stats.skipped,6);
});
test('detector falls back to the other source\'s DeepSeek Flash, and counts unavailability, malformed JSON and timeouts',async t=>{
  const calls=[],{rules,store}=await fixture(t,{providers,gateway,fetchImpl:async url=>{calls.push(url);if(url.includes('/workbuddy/'))throw new Error('unavailable');return response('{"rules":[{"text":"回复用中文"}]}');}});
  rules.observe(store.session('s1'),'记住以后回复用中文');await drained(rules);assert.equal(calls.length,2);assert.ok(calls[1].includes('/qoder/'));assert.equal((await rules.read()).items.length,1);
  rules.providers={get:()=>null};rules.observe(store.session('s1'),'以后每次先运行检查');await drained(rules);assert.equal(rules.stats.skipped,1);
  rules.providers=providers;rules.fetchImpl=async()=>response('invalid');rules.observe(store.session('s1'),'以后每次先运行检查');await drained(rules);assert.equal(rules.stats.failed,1);
  rules.timeoutMs=15;rules.fetchImpl=async(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));rules.observe(store.session('s1'),'以后每次先运行检查');await drained(rules);assert.equal(rules.stats.failed,2);
});
test('detector runs one request per session and retains only the latest pending message without blocking admission',async t=>{
  const gate=deferred(),seen=[],{rules,store}=await fixture(t,{providers,gateway,fetchImpl:async(_url,options)=>{seen.push(JSON.parse(JSON.parse(options.body).messages[1].content).message);if(seen.length===1)await gate.promise;return response('{"rules":[]}');}}),s=store.session('s1');
  rules.observe(s,'以后要求第一条');await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));assert.equal(seen.length,1);
  rules.observe(s,'以后要求第二条');rules.observe(s,'以后要求第三条');assert.equal(seen.length,1);gate.resolve();await drained(rules);assert.deepEqual(seen,['以后要求第一条','以后要求第三条']);
});
test('auxiliary usage is routed to its source session independently of a running native turn',async t=>{
  const {rules,store}=await fixture(t);rules.auxiliary.set('rules-s1','s1');assert.equal(await rules.acceptUsage('rules-s1',{type:'usage',data:{prompt_tokens:3}}),true);assert.equal(await rules.acceptUsage('other',{type:'usage'}),false);
  const [event]=await store.events('s1');assert.equal(event.data.auxiliary,true);assert.equal(event.auxiliary,true);assert.equal(event.data.prompt_tokens,3);
});
test('classifier timeout and shutdown also bound a transport or gateway that ignores abort',async t=>{
  const never=new Promise(()=>{}),{rules,store}=await fixture(t,{providers,gateway:{register:()=>never},timeoutMs:15});
  rules.observe(store.session('s1'),'记住以后使用中文');await drained(rules);assert.equal(rules.stats.failed,1);
  rules.gateway=gateway;rules.fetchImpl=()=>never;rules.timeoutMs=30000;rules.observe(store.session('s1'),'记住以后使用中文');await new Promise(r=>setImmediate(r));await rules.close();assert.equal(rules.jobs.size,0);
});
test('session admission journals before classification; steer and dequeued sends are observed and never gain another prefix',async t=>{
  const {store}=await fixture(t);store.state.projects.push({id:'p',path:store.root});const sent=[],steers=[],observed=[];
  class Fake extends RuntimeLifecycle {async prompt(text){sent.push(text);this.running=true;}async steer(text){steers.push(text);return {delivered:true};}async close(){this.running=false;this.closed=true;}}
  const sessions=new Sessions(store,providers,{...gateway},[{id:'codex',installed:true}],{constructors:{codex:Fake}});t.after(()=>sessions.close());
  sessions.agentRules.detect=async(session,text)=>{const events=await store.events(session.id);assert.ok(events.some(e=>e.type==='user'&&e.text.includes(text)));observed.push(text);};
  const s=await sessions.create({runtimeId:'codex',projectId:'p',selection:{modelKey:models[0].key,identity:models[0].identity}});
  await sessions.prompt(s.id,'初始任务原文');await drained(sessions.agentRules);
  await sessions.prompt(s.id,'以后回复请用中文',[],{delivery:'steer'});await drained(sessions.agentRules);assert.deepEqual(steers,['以后回复请用中文']);
  await sessions.prompt(s.id,'以后每次先运行检查',[],{delivery:'queue'});assert.equal(observed.length,2);
  await sessions.adapters.get(s.id).emit({type:'turn-end',status:'completed'});
  for(let n=0;n<100&&sent.length<2;n++)await new Promise(r=>setTimeout(r,5));assert.equal(sent[1],'以后每次先运行检查');await drained(sessions.agentRules);assert.deepEqual(observed,['初始任务原文','以后回复请用中文','以后每次先运行检查']);
});
test('all fallback runtimes prefix only the first user turn and journal the exact original; recordRules:false persists',async t=>{
  for(const runtimeId of ['codex','dsh','kimi','antigravity','future']){
    const {store,rules}=await fixture(t);store.state.projects.push({id:'p',path:store.root});const sent=[];
    class Fake extends RuntimeLifecycle {async prompt(text){sent.push(text);this.running=true;}async close(){this.closed=true;}}
    const sessions=new Sessions(store,providers,{...gateway},[{id:runtimeId,installed:true}],{constructors:{[runtimeId]:Fake}});t.after(()=>sessions.close());await rules.append('回复用中文');
    const selection=runtimeId==='dsh'?{modelKey:models[0].key,identity:models[0].identity}:{modelKey:'native'};
    const s=await sessions.create({runtimeId,projectId:'p',selection,recordRules:false});assert.equal(s.recordRules,false);
    await sessions.prompt(s.id,'第一条任务原文');assert.ok(sent[0].startsWith('<bridge-long-term-requirements>'));assert.ok(s.rulesVersion);assert.equal((await store.events(s.id))[0].text,'第一条任务原文');
    await sessions.adapters.get(s.id).emit({type:'turn-end',status:'completed'});await sessions.prompt(s.id,'第二条任务原文');assert.equal(sent[1],'第二条任务原文');await sessions.cancel(s.id);
  }
});
test('empty rules add no prefix; existing native threads never gain a prefix',async t=>{
  const {store,rules}=await fixture(t);store.state.projects.push({id:'p',path:store.root});const sent=[];class Fake extends RuntimeLifecycle {async prompt(text){sent.push(text);}async close(){this.closed=true;}}
  const sessions=new Sessions(store,null,null,[{id:'codex',installed:true}],{constructors:{codex:Fake}});t.after(()=>sessions.close());const s=await sessions.create({runtimeId:'codex',projectId:'p',selection:{modelKey:'native'},recordRules:false});await sessions.prompt(s.id,'第一条任务原文');assert.equal(sent[0],'第一条任务原文');await sessions.cancel(s.id);await rules.append('回复用中文');s.nativeId='old';await sessions.prompt(s.id,'继续原生线程');assert.equal(sent[1],'继续原生线程');
});
test('snapshot includes rule count, preference and update time without exposing detector dependencies',async t=>{
  const {store,rules}=await fixture(t);await rules.append('回复用中文');const value=await workbenchSnapshot({store,sourceComponents:{snapshot:()=>[]},modelServices:{snapshot:async()=>[]},environments:{snapshot:()=>[],onboarding:()=>null,runtimeViews:()=>[]},runtimes:[],attachmentCapabilityService:{snapshotSessions:async s=>s},boot:{state:()=>null},appVersion:'test'});
  assert.equal(value.rules.count,1);assert.equal(value.rules.autoRecord,true);assert.equal(typeof value.rules.updatedAt,'string');
});

const sessionModel=normalizeQoder({value:'session-model',displayName:'Session model',supportsToolCall:true,context_config:{small:{token_count:8192,is_default:true},large:{token_count:32768}},thinking_config:{enabled:{efforts:{high:{is_default:true}}}}});
const fixedModel=normalizeWorkbuddy({id:'fixed-model',name:'Fixed model',supportsToolCall:true,contextWindow:65536});
const detectorProviders={get:key=>[sessionModel,fixedModel,...models,...others].find(model=>model.key===key)};
async function detectorFixture(t,options={}){
  const registrations=[],requests=[],f=await fixture(t,{providers:detectorProviders,gateway:{register:async(model,variant,selection)=>{registrations.push({model,variant,selection});return {baseURL:'http://127.0.0.1:1/'+model.id,key:'fixture'};}},fetchImpl:async(url,options)=>{requests.push({url,...options});return response('{"rules":[]}');},...options});
  return {...f,registrations,requests};
}
test('detector defaults to the newest DeepSeek Flash on the session\'s own source, WorkBuddy first for native sessions',async t=>{
  const {rules,store,registrations}=await detectorFixture(t),session=store.session('s1');
  assert.deepEqual((await rules.read()).detector,{model:'deepseek',deepseek:FLASH,available:true});
  for(const [selection,expected] of [[{modelKey:sessionModel.key,identity:sessionModel.identity,contextTokens:32768},FLASH.qoder],[{modelKey:fixedModel.key,identity:fixedModel.identity},FLASH.workbuddy],[{modelKey:'native'},FLASH.workbuddy],[{modelKey:'antigravity:gemini-fixture'},FLASH.workbuddy]]){
    registrations.length=0;session.selection=selection;rules.observe(session,'记住以后用中文回复');await drained(rules);assert.deepEqual(registrations.map(row=>row.model.key),[expected]);
  }
  assert.notEqual(registrations[0].selection.contextTokens,32768,'a different model never borrows the session window');
  // The session source's DeepSeek Flash fails: the other source's answers.
  registrations.length=0;session.selection={modelKey:sessionModel.key,identity:sessionModel.identity};rules.fetchImpl=async url=>{if(url.includes('/dfmodel/'))throw new Error('unavailable');return response('{"rules":[]}');};
  rules.observe(session,'以后每次检查测试');await drained(rules);assert.deepEqual(registrations.map(row=>row.model.key),[FLASH.qoder,FLASH.workbuddy]);
  // A newer DeepSeek Flash listed upstream takes over by itself; one that is not usable is passed over.
  const newer=normalizeWorkbuddy({id:'deepseek-v4.2-flash',name:'DeepSeek-V4.2-Flash',supportsToolCall:true});store.state.catalog.workbuddy.models.push(newer);
  assert.equal((await rules.read()).detector.deepseek.workbuddy,FLASH.workbuddy,'not usable until the source resolves it');
  rules.providers={get:key=>[newer,...models,...others].find(model=>model.key===key)};assert.equal((await rules.read()).detector.deepseek.workbuddy,'workbuddy:deepseek-v4.2-flash');
});
test('following the session model uses its context window without inheriting reasoning or local budget',async t=>{
  const {rules,store,registrations,requests}=await detectorFixture(t),session=store.session('s1');await rules.detector('session');
  session.selection={modelKey:sessionModel.key,identity:sessionModel.identity,contextTokens:32768,contextBudget:4096,reasoning:'high'};
  assert.deepEqual((await rules.read()).detector,{model:'session',deepseek:FLASH,available:true});
  rules.observe(session,'记住以后用中文回复');await drained(rules);assert.equal(registrations.length,1);assert.equal(registrations[0].model.key,sessionModel.key);assert.equal(registrations[0].selection.contextTokens,32768);assert.equal(registrations[0].selection.contextBudget,null);assert.equal(registrations[0].selection.reasoning,undefined);assert.equal(requests[0].headers['x-bridge-auxiliary'],'1');assert.equal(requests[0].headers['x-bridge-effort'],'none,low,minimal,medium');
  session.selection={modelKey:fixedModel.key,identity:fixedModel.identity};rules.observe(session,'以后每次先检查测试');await drained(rules);assert.equal(registrations[1].model.key,fixedModel.key);
});
test('following the session: native, Antigravity and unusable session models fall back to DeepSeek Flash',async t=>{
  const {rules,store,registrations}=await detectorFixture(t),session=store.session('s1');await rules.detector('session');
  for(const [selection,expected] of [[{modelKey:'native'},FLASH.workbuddy],[{modelKey:'antigravity:gemini-fixture'},FLASH.workbuddy],[{modelKey:'qoder:missing'},FLASH.qoder],[{modelKey:sessionModel.key,identity:'changed-upstream-identity'},FLASH.qoder]]){session.selection=selection;rules.observe(session,'记住以后用中文回复');await drained(rules);assert.equal(registrations.at(-1).model.key,expected);}
  rules.fetchImpl=async url=>{if(url.includes('/dfmodel/'))throw new Error('unavailable');return response('{"rules":[]}');};rules.observe(session,'以后每次检查测试');await drained(rules);assert.equal(registrations.at(-1).model.key,FLASH.workbuddy);
  rules.providers={get:()=>null};rules.observe(session,'以后每次检查测试');await drained(rules);assert.equal(rules.stats.skipped,1);assert.equal((await rules.read()).detector.available,false);
});
test('failed session-model requests fall back and duplicate model keys are attempted only once',async t=>{
  const {rules,store,registrations}=await detectorFixture(t),session=store.session('s1');await rules.detector('session');session.selection={modelKey:sessionModel.key,identity:sessionModel.identity};
  rules.fetchImpl=async url=>{if(url.includes('/session-model/'))throw new Error('unavailable');return response('{"rules":[]}');};rules.observe(session,'记住以后用中文回复');await drained(rules);assert.deepEqual(registrations.map(row=>row.model.key),[sessionModel.key,FLASH.qoder]);
  registrations.length=0;session.selection={modelKey:FLASH.qoder,identity:models[0].identity};rules.fetchImpl=async url=>{if(url.includes('/dfmodel/'))throw new Error('unavailable');return response('{"rules":[]}');};rules.observe(session,'记住以后用中文回复');await drained(rules);assert.deepEqual(registrations.map(row=>row.model.key),[FLASH.qoder,FLASH.workbuddy]);
});
test('fixed detector model overrides the session selection and uses defaults, with ordered fallback on errors or missing models',async t=>{
  const {rules,store,registrations}=await detectorFixture(t),session=store.session('s1'),methods=agentRulesMethods(()=>rules);session.selection={modelKey:sessionModel.key,identity:sessionModel.identity,contextTokens:32768};
  const view=await methods['rules:detector']({model:fixedModel.key});assert.deepEqual(view.detector,{model:fixedModel.key,deepseek:FLASH,available:true});rules.observe(session,'记住以后用中文回复');await drained(rules);assert.equal(registrations[0].model.key,fixedModel.key);assert.equal(registrations[0].selection.contextTokens,65536);
  registrations.length=0;rules.fetchImpl=async url=>{if(url.includes('/fixed-model/')||url.includes('/dfmodel/'))throw new Error('unavailable');return response('{"rules":[]}');};rules.observe(session,'以后每次检查测试');await drained(rules);assert.deepEqual(registrations.map(row=>row.model.key),[fixedModel.key,FLASH.qoder,FLASH.workbuddy]);
  registrations.length=0;rules.providers=providers;rules.fetchImpl=async()=>response('{"rules":[]}');rules.observe(session,'以后每次检查测试');await drained(rules);assert.equal(registrations[0].model.key,FLASH.qoder);assert.equal((await rules.read()).detector.model,fixedModel.key);
});
test('detector IPC rejects unknown or non-source keys without changing the saved preference, and accepts known disabled keys',async t=>{
  const {rules,store}=await detectorFixture(t),methods=agentRulesMethods(()=>rules);await methods['rules:detector']({model:fixedModel.key});
  for(const model of ['native','antigravity:gemini-fixture','qoder:unknown','workbuddy:unknown','',null,42,{}])await assert.rejects(methods['rules:detector']({model}),/已知/);
  assert.equal(store.state.preferences.rulesDetectorModel,fixedModel.key);
  rules.providers={get:key=>key===fixedModel.key?{...fixedModel,enabled:false}:null};assert.equal((await methods['rules:detector']({model:fixedModel.key})).detector.available,false);
  assert.equal((await methods['rules:detector']({model:'session'})).detector.model,'session');
  assert.equal((await methods['rules:detector']({model:'deepseek'})).detector.model,'deepseek');assert.equal(store.state.preferences.rulesDetectorModel,'deepseek');
});
test('detector preference survives store reopen and remains live despite cached rule contents',async t=>{
  const {rules,store,root}=await detectorFixture(t);await rules.append('回复用中文');await rules.detector(fixedModel.key);await rules.close();await store.close();
  const reopened=await new Store(root).open();t.after(()=>reopened.close());const next=new AgentRules(reopened,{providers:detectorProviders});assert.equal((await next.read()).detector.model,fixedModel.key);await next.detector('session');assert.equal(JSON.parse(await readFile(join(root,'workspace.json'),'utf8')).preferences.rulesDetectorModel,'session');assert.equal((await next.read()).items.length,1);
});
test('frequent snapshots share the mtime/size cache, reload external edits and invalidate on managed writes or deletion',async t=>{
  const {store,rules}=await fixture(t),path=rules.path,stamp=new Date('2026-01-01T00:00:00Z');
  const snapshot=()=>workbenchSnapshot({store,sourceComponents:{snapshot:()=>[]},modelServices:{snapshot:async()=>[]},environments:{snapshot:()=>[],onboarding:()=>null,runtimeViews:()=>[]},runtimes:[],attachmentCapabilityService:{snapshotSessions:async s=>s},boot:{state:()=>null},appVersion:'test'});
  await writeFile(path,'- abcd\n');await utimes(path,stamp,stamp);assert.equal((await snapshot()).rules.count,1);
  // Same byte size and mtime deliberately retain the cached document across instances.
  await writeFile(path,'- a\n- b');await utimes(path,stamp,stamp);assert.equal((await snapshot()).rules.count,1);assert.equal((await new AgentRules(store).read()).items.length,1);
  await utimes(path,stamp,new Date(stamp.getTime()+1000));assert.equal((await snapshot()).rules.count,2);
  await writeRulesFile(path,'- abcd\n');await utimes(path,stamp,stamp);assert.equal((await snapshot()).rules.count,1);
  await writeRulesFile(path,'- a\n- b');await utimes(path,stamp,stamp);assert.equal((await snapshot()).rules.count,2,'writes invalidate even if mtime and size match the cached file');
  await writeFile(path,'- abcdef\n');await utimes(path,stamp,stamp);assert.equal((await snapshot()).rules.count,1,'size change reloads even with the same mtime');
  await rules.auto(false);assert.equal((await snapshot()).rules.autoRecord,false);await rm(path);assert.equal((await snapshot()).rules.count,0);await rules.save('- 新要求');assert.equal((await snapshot()).rules.count,1);
});
