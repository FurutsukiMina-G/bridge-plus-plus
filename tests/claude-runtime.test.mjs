import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {ClaudeAdapter,claudeLaunchSettings} from '../app/runtimes/claude.mjs';
import {launch} from '../app/core/process.mjs';

const endpoint={baseURL:'http://127.0.0.1:8646/claude/qoder/session/synthetic/v1',key:'synthetic-gateway-key',model:'synthetic-model'};
const options=()=>({runtime:{executable:'claude.exe'},project:{path:resolve('.')},session:{id:randomUUID(),selection:{contextBudget:900000}},model:{maxOutputTokens:64000},variant:{id:'synthetic-model'},endpoint,selection:{contextBudget:900000},permissionMode:'ask',configDir:'D:\\synthetic\\claude-config'});
const waitFor=async(fn,timeout=7000)=>{const end=Date.now()+timeout;for(;;){const value=fn();if(value)return value;if(Date.now()>end)throw new Error('Timed out waiting for synthetic Claude event');await new Promise(r=>setTimeout(r,10));}};
const controlAdapter=(permissionMode='ask',running=true)=>{const events=[],writes=[];const adapter=new ClaudeAdapter({permissionMode,emit:async e=>events.push(e)});adapter.running=running;adapter.child={stdin:{destroyed:false,write:line=>writes.push(JSON.parse(line))}};return {adapter,events,writes};};
// Windows env names are case-insensitive; assert on the effective value.
const envOf=(map,key)=>map[Object.keys(map).find(name=>name.toUpperCase()===key.toUpperCase())??key];

test('Claude launch settings isolate credentials, force the gateway and map every permission mode',async t=>{
  const polluted={ANTHROPIC_API_KEY:'inherited-secret',ANTHROPIC_BASE_URL:'https://api.anthropic.com',CLAUDECODE:'1',CLAUDE_CODE_OAUTH_SCOPES:'synthetic',MCP_TOKEN:'synthetic',OTEL_EXPORTER:'synthetic',CLAUDE_SYNTHETIC:'synthetic',CLAUDE_CODE_MESSAGING_SOCKET:'synthetic-socket',claude_code_session_id:'synthetic-session',USE_LOCAL_OAUTH:'1',AWS_BEARER_TOKEN_BEDROCK:'synthetic-bedrock',DISABLE_PROMPT_CACHING_SONNET:'1',ENABLE_CLAUDEAI_MCP_SERVERS:'1',USER_TYPE:'synthetic-user',VERTEX_REGION_CLAUDE_X:'synthetic-region',MAX_THINKING_TOKENS:'32768'};
  const kept={PATH:'synthetic-path-entry',JAVA_HOME:'synthetic-java-home',DISABLE_ESLINT_PLUGIN:'synthetic-eslint',HTTP_PROXY:'http://127.0.0.1:9',NO_PROXY:'synthetic.internal'};
  const saved=Object.fromEntries(Object.keys({...polluted,...kept}).map(key=>[key,process.env[key]]));
  Object.assign(process.env,polluted,kept);t.after(()=>{for(const [key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
  for(const [permissionMode,native]of [['readonly','plan'],['ask','default'],['auto-review','auto'],['auto','bypassPermissions']]){
    const base=options();base.permissionMode=permissionMode;const {args,env}=claudeLaunchSettings(base),settings=JSON.parse(args[args.indexOf('--settings')+1]);
    assert.equal(args[args.indexOf('--model')+1],'synthetic-model');assert.equal(args[args.indexOf('--session-id')+1],base.session.id);assert.equal(args.includes('--resume'),false);assert.equal(args[args.indexOf('--permission-mode')+1],native);assert.equal(args.includes('--allow-dangerously-skip-permissions'),native==='bypassPermissions');
    assert.equal(env.ANTHROPIC_BASE_URL,'http://127.0.0.1:8646/claude/qoder/session/synthetic');assert.equal(env.ANTHROPIC_AUTH_TOKEN,endpoint.key);assert.equal(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW,'900000');assert.equal(env.CLAUDE_CODE_MAX_OUTPUT_TOKENS,'64000');assert.equal(env.ANTHROPIC_API_KEY,undefined);assert.equal(env.CLAUDECODE,undefined);assert.equal(env.CLAUDE_CODE_OAUTH_SCOPES,undefined);assert.equal(env.MCP_TOKEN,undefined);assert.equal(env.OTEL_EXPORTER,undefined);assert.equal(env.CLAUDE_SYNTHETIC,undefined);for(const key of ['CLAUDE_CODE_MESSAGING_SOCKET','claude_code_session_id','ANTHROPIC_API_KEY','USE_LOCAL_OAUTH','AWS_BEARER_TOKEN_BEDROCK','DISABLE_PROMPT_CACHING_SONNET','ENABLE_CLAUDEAI_MCP_SERVERS','USER_TYPE','VERTEX_REGION_CLAUDE_X','MAX_THINKING_TOKENS'])assert.equal(envOf(env,key),undefined,key);for(const key of ['PATH','JAVA_HOME','DISABLE_ESLINT_PLUGIN','HTTP_PROXY'])assert.equal(envOf(env,key),kept[key],key);const noProxy=env.NO_PROXY.split(',');assert.equal(noProxy.includes('synthetic.internal'),true);for(const host of ['127.0.0.1','localhost','::1'])assert.equal(noProxy.includes(host),true,host);assert.equal(env.no_proxy,env.NO_PROXY);assert.equal(settings.env.NO_PROXY,env.NO_PROXY);
    for(const key of ['ANTHROPIC_MODEL','ANTHROPIC_DEFAULT_OPUS_MODEL','ANTHROPIC_DEFAULT_SONNET_MODEL','ANTHROPIC_DEFAULT_HAIKU_MODEL','ANTHROPIC_SMALL_FAST_MODEL','CLAUDE_CODE_SUBAGENT_MODEL'])assert.equal(env[key],'synthetic-model');
    assert.equal(settings.skipWebFetchPreflight,true);assert.equal(settings.model,'synthetic-model');assert.equal(env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS,'1');assert.equal(env.CLAUDE_CODE_DISABLE_CRON,'1');assert.equal(settings.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS,'1');assert.equal(settings.env.CLAUDE_CODE_DISABLE_CRON,'1');assert.equal(args[args.indexOf('--disallowedTools')+1],'ScheduleWakeup');assert.equal(settings.env.ANTHROPIC_AUTH_TOKEN,undefined);assert.equal(settings.env.ANTHROPIC_BASE_URL,env.ANTHROPIC_BASE_URL);assert.equal(settings.env.CLAUDE_CODE_USE_BEDROCK,'0');assert.equal(settings.env.CLAUDE_CODE_USE_VERTEX,'0');assert.equal(settings.env.CLAUDE_CODE_USE_FOUNDRY,'0');assert.equal(args.join(' ').includes(endpoint.key),false);
  }
  const resumed=options();resumed.session.nativeId='native-existing';resumed.resume=true;const {args}=claudeLaunchSettings(resumed);assert.equal(args[args.indexOf('--resume')+1],'native-existing');assert.equal(args.includes('--session-id'),false);
  const unspecified=options();unspecified.permissionMode=null;const plain=claudeLaunchSettings(unspecified);assert.equal(plain.args.includes('--permission-mode'),false);assert.equal(plain.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS,undefined);
  const sized=options();sized.selection={contextTokens:1000000,contextBudget:800000};const sizedSettings=claudeLaunchSettings(sized),sizedArgs=sizedSettings.args,flagSettings=JSON.parse(sizedArgs[sizedArgs.indexOf('--settings')+1]);
  assert.equal(sizedSettings.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS,'1000000');assert.equal(sizedSettings.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW,'800000');assert.equal(flagSettings.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS,'1000000');assert.equal(flagSettings.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW,'800000');
  const windowOnly=options();windowOnly.selection={contextTokens:600000};assert.equal(claudeLaunchSettings(windowOnly).env.CLAUDE_CODE_AUTO_COMPACT_WINDOW,'600000');
  const catalog={...options(),permissionMode:'ask',runtime:{permissions:{modes:[{id:'ask',native:{mode:'manual'}}]}}},catalogArgs=claudeLaunchSettings(catalog).args;assert.equal(catalogArgs[catalogArgs.indexOf('--permission-mode')+1],'manual');
});

test('Claude refuses to start when its private config contains a credentials file',async t=>{
  const root=await mkdtemp(join(tmpdir(),'bridge-claude-credentials-'));t.after(()=>rm(root,{recursive:true,force:true}));const credentials=join(root,'.credentials.json');await writeFile(credentials,'synthetic');let launched=false;
  const base=options();const adapter=new ClaudeAdapter({...base,configDir:root,saveNative:async()=>{},emit:async()=>{},launchProcess:()=>{launched=true;}});await assert.rejects(adapter.start(),error=>{assert.match(error.message,/保持非登录态/);assert.ok(error.message.includes(credentials));return true;});assert.equal(launched,false);
});

test('Claude maps streaming, tools, subagent summaries, task progress and results without duplicate text or usage',async()=>{
  const events=[],adapter=new ClaudeAdapter({emit:async e=>events.push(e)});
  await adapter.message({type:'stream_event',event:{delta:{type:'text_delta',text:'main'}}});await adapter.message({type:'stream_event',event:{delta:{type:'thinking_delta',thinking:'think'}}});await adapter.message({type:'stream_event',parent_tool_use_id:'agent-1',event:{delta:{type:'text_delta',text:'child'}}});
  await adapter.message({type:'assistant',parent_tool_use_id:'agent-1',message:{content:[{type:'text',text:'child reply'},{type:'tool_use',id:'child-tool',name:'Read',input:{file_path:'child.txt'}}]}});
  await adapter.message({type:'user',parent_tool_use_id:'agent-1',message:{content:[{type:'tool_result',tool_use_id:'child-tool',content:'failed',is_error:true}]}});
  await adapter.message({type:'assistant',message:{content:[{type:'text',text:'main'},{type:'thinking',thinking:'think'},{type:'tool_use',id:'tool-1',name:'Write',input:{file_path:'x'}}]}});await adapter.message({type:'user',message:{content:[{type:'tool_result',tool_use_id:'tool-1',content:'done',is_error:false}]}});
  await adapter.message({type:'system',subtype:'task_started',tool_use_id:'tool-1',status:'running'});await adapter.message({type:'system',subtype:'status',status:'idle'});await adapter.message({type:'result',subtype:'success',is_error:false,usage:{input_tokens:100}});
  assert.deepEqual(events.filter(e=>e.type==='text').map(e=>e.text),['main']);assert.deepEqual(events.filter(e=>e.type==='thinking').map(e=>e.text),['think']);assert.equal(events.some(e=>e.type==='subagent'),false);assert.equal(events.filter(e=>e.type==='tool-start').length,1);assert.equal(events.some(e=>e.type==='tool-end'&&e.toolId==='child-tool'),false);assert.deepEqual(events.find(e=>e.type==='tool-end').data,{content:'done',is_error:false});
  const child=events.filter(e=>e.type==='tool-output'&&e.toolId==='agent-1').map(e=>e.text);assert.deepEqual(child,['child reply\n','子代理 → Read {"file_path":"child.txt"}\n','子代理 ← Read 出错\n']);assert.equal(child.every(text=>text.endsWith('\n')),true);assert.equal(events.find(e=>e.type==='tool-output'&&e.toolId==='tool-1').name,'task_started');assert.equal(events.some(e=>e.type==='usage'),false);assert.equal(events.at(-1).status,'completed');
  for(const [subtype,status]of [['error_during_execution','interrupted'],['error_max_turns','interrupted'],['error_api','failed']]){const rows=[],a=new ClaudeAdapter({emit:async e=>rows.push(e)});await a.message({type:'result',subtype,is_error:true,result:'synthetic raw failure',error:{code:'synthetic',message:'raw'}});const end=rows.find(e=>e.type==='turn-end');assert.equal(end.status,status);assert.equal(end.data.result,'synthetic raw failure');if(status==='failed')assert.equal(end.reason.message,'raw');if(subtype==='error_max_turns')assert.ok(rows.some(e=>e.type==='notice'));}
});

test('Claude drops thinking_tokens system events so adjacent thinking deltas stay mergeable',async()=>{
  const events=[],adapter=new ClaudeAdapter({emit:async e=>events.push(e)});
  for(const token of ['甲','乙','丙']){
    await adapter.message({type:'stream_event',event:{type:'content_block_delta',index:0,delta:{type:'thinking_delta',thinking:token}}});
    await adapter.message({type:'system',subtype:'thinking_tokens',tokens:token.length,session_id:'synthetic'});
  }
  await adapter.message({type:'system',subtype:'status',status:'idle'});
  assert.deepEqual(events.filter(e=>e.type==='thinking').map(e=>e.text),['甲','乙','丙']);
  assert.equal(events.some(e=>e.type==='native-event'&&e.name==='thinking_tokens'),false);
  assert.equal(events.some(e=>e.type==='native-event'&&e.name==='status'),true);
});
test('Claude approvals allow once, rewrite session permissions, deny and reject unknown interactions',async()=>{
  for(const choice of ['approve','approve-session','reject']){
    const {adapter,events,writes}=controlAdapter(),request={subtype:'can_use_tool',tool_name:'Write',display_name:'Write synthetic',input:{file_path:'x'},permission_suggestions:[{type:'setMode',mode:'acceptEdits',destination:'projectSettings'},{type:'addRules',destination:'userSettings'}]};await adapter.message({type:'control_request',request_id:'req-1',request});const approval=events.find(e=>e.type==='approval');assert.equal(approval.name,'Write synthetic');assert.deepEqual(approval.choices,['approve','approve-session','reject']);await adapter.approve(approval.approvalId,choice);const response=writes[0].response.response;
    if(choice==='reject')assert.equal(response.behavior,'deny');else{assert.equal(response.behavior,'allow');assert.deepEqual(response.updatedInput,{file_path:'x'});if(choice==='approve-session')assert.deepEqual(response.updatedPermissions,[{type:'setMode',mode:'acceptEdits',destination:'session'},{type:'addRules',destination:'session'}]);else assert.equal(response.updatedPermissions,undefined);}
  }
  const plain=controlAdapter();await plain.adapter.message({type:'control_request',request_id:'plain',request:{subtype:'can_use_tool',tool_name:'Read',input:{}}});assert.deepEqual(plain.events[0].choices,['approve','reject']);
  const unsupported=controlAdapter();await unsupported.adapter.message({type:'control_request',request_id:'other',request:{subtype:'hook_callback'}});assert.equal(unsupported.writes[0].response.subtype,'error');assert.equal(unsupported.writes[0].response.error,'Bridge++ 不支持此原生交互');assert.ok(unsupported.events.some(e=>e.type==='notice'));
});

test('Claude readonly denies native tools and AskUserQuestion returns only answers and annotations',async()=>{
  const readonly=controlAdapter('readonly');await readonly.adapter.message({type:'control_request',request_id:'read-only',request:{subtype:'can_use_tool',tool_name:'Write',input:{}}});assert.equal(readonly.writes[0].response.response.behavior,'deny');assert.match(readonly.writes[0].response.response.message,/只读模式/);assert.equal(readonly.events[0].code,'permission_denied');assert.equal(readonly.events[0].source,'native-permission');
  const {adapter,events,writes}=controlAdapter(),input={questions:[{question:'选择什么？',header:'选择',options:[{label:'甲'}],multiSelect:false}]};await adapter.message({type:'control_request',request_id:'question',request:{subtype:'can_use_tool',tool_name:'AskUserQuestion',input}});const question=events.find(e=>e.type==='question');assert.deepEqual(question.data,input);await adapter.approve(question.approvalId,'approve',{answers:{'选择什么？':'甲'},items:[{question:'选择什么？',selected:['甲']}],annotations:{'选择什么？':{note:'synthetic'}}});const updated=writes[0].response.response.updatedInput;assert.deepEqual(updated.answers,{'选择什么？':'甲'});assert.deepEqual(updated.annotations,{'选择什么？':{note:'synthetic'}});assert.equal(updated.items,undefined);assert.deepEqual(updated.questions,input.questions);
  const rejected=controlAdapter();await rejected.adapter.message({type:'control_request',request_id:'question-2',request:{subtype:'can_use_tool',tool_name:'AskUserQuestion',input}});await rejected.adapter.approve(rejected.events[0].approvalId,'reject');assert.equal(rejected.writes[0].response.response.message,'用户没有回答');
});

test('Claude image prompts use Anthropic blocks and reject other attachment kinds',async t=>{
  const root=await mkdtemp(join(tmpdir(),'bridge-claude-image-'));t.after(()=>rm(root,{recursive:true,force:true}));const path=join(root,'image.png');await writeFile(path,Buffer.from('synthetic-image'));
  const {adapter,writes}=controlAdapter();adapter.running=false;adapter.ready=true;Object.assign(adapter,{session:{id:randomUUID(),selection:{}},runtime:{executable:'fixture'},project:{path:root},configDir:root,model:{},variant:{id:'synthetic'},endpoint,saveNative:async()=>{}});await adapter.prompt('look',[{kind:'image',mime:'image/png',path}]);const message=writes[0];assert.equal(message.type,'user');assert.equal(message.message.content[0].text,'look');assert.equal(message.message.content[1].source.data,Buffer.from('synthetic-image').toString('base64'));assert.equal(message.message.content[1].source.media_type,'image/png');await assert.rejects(adapter.steer('audio',[{kind:'audio',mime:'audio/wav',path}]),/仅支持图片附件/);
});

test('Claude steer waits for queued admission, reports delivery and carries queued input across results',async()=>{
  const {adapter,events,writes}=controlAdapter();adapter.running=true;const steering=adapter.steer('synthetic steer',[],'steer-1');await waitFor(()=>writes[0]);assert.equal(writes[0].uuid,'steer-1');await adapter.message({type:'command_lifecycle',command_uuid:'steer-1',state:'queued'});assert.deepEqual(await steering,{});await adapter.message({type:'result',subtype:'success',is_error:false});assert.equal(adapter.running,true);assert.equal(events.some(e=>e.type==='turn-end'),false);assert.equal(events.find(e=>e.type==='steer-state').state,'carried');await adapter.message({type:'command_lifecycle',command_uuid:'steer-1',state:'started'});assert.ok(events.some(e=>e.type==='steer-consumed'&&e.steerId==='steer-1'));assert.equal(events.filter(e=>e.type==='steer-state').at(-1).state,'delivered');await adapter.message({type:'result',subtype:'success',is_error:false});assert.equal(adapter.running,false);assert.equal(events.at(-1).status,'completed');
  const stopped=controlAdapter('ask',false);await assert.rejects(stopped.adapter.steer('not running'),/原生轮次尚未开始或已经结束/);
});

test('Claude carries queued steers across an errored result, retracts them and cancels the native queue',async()=>{
  const errored=controlAdapter();errored.adapter.running=true;const admission=errored.adapter.steer('queued input',[],'steer-error');await waitFor(()=>errored.writes[0]);await errored.adapter.message({type:'command_lifecycle',command_uuid:'steer-error',state:'queued'});await admission;
  await errored.adapter.message({type:'result',subtype:'error_max_turns',is_error:true});
  assert.equal(errored.adapter.running,true);assert.equal(errored.events.some(e=>e.type==='turn-end'),false);assert.deepEqual(errored.events.filter(e=>e.type==='steer-state').map(e=>e.state),['carried']);assert.ok(errored.events.some(e=>e.type==='notice'&&/最大轮次/.test(e.text)&&/排队的插话由 Claude Code 带到下一轮继续/.test(e.text)));
  await errored.adapter.message({type:'command_lifecycle',command_uuid:'steer-error',state:'started'});
  assert.ok(errored.events.some(e=>e.type==='steer-consumed'&&e.steerId==='steer-error'));assert.equal(errored.events.filter(e=>e.type==='steer-state').at(-1).state,'delivered');
  await errored.adapter.message({type:'result',subtype:'success',is_error:false});assert.equal(errored.adapter.running,false);assert.deepEqual(errored.events.filter(e=>e.type==='steer-state').map(e=>e.state),['carried','delivered']);assert.equal(errored.events.at(-1).status,'completed');
  const twice=controlAdapter();twice.adapter.running=true;const second=twice.adapter.steer('second',[],'steer-twice');await waitFor(()=>twice.writes[0]);await twice.adapter.message({type:'command_lifecycle',command_uuid:'steer-twice',state:'queued'});await second;
  await twice.adapter.message({type:'result',subtype:'success',is_error:false});assert.deepEqual(twice.events.filter(e=>e.type==='steer-state').map(e=>e.state),['carried']);
  await twice.adapter.message({type:'result',subtype:'success',is_error:false});assert.deepEqual(twice.events.filter(e=>e.type==='steer-state').map(e=>e.state),['carried']);assert.equal(twice.events.at(-1).status,'completed');
  const retracted=controlAdapter();retracted.adapter.running=true;const waiting=retracted.adapter.steer('queued',[],'steer-retract');await waitFor(()=>retracted.writes[0]);await retracted.adapter.message({type:'command_lifecycle',command_uuid:'steer-retract',state:'queued'});await waiting;
  const removal=retracted.adapter.retractSteers(),cancelRequest=await waitFor(()=>retracted.writes.find(w=>w.request?.subtype==='cancel_async_message'));
  assert.equal(cancelRequest.request.message_uuid,'steer-retract');await retracted.adapter.message({type:'control_response',response:{subtype:'success',request_id:cancelRequest.request_id,response:{cancelled:['steer-retract']}}});assert.deepEqual(await removal,['steer-retract']);assert.equal(retracted.adapter.steers.size,0);
  const interrupted=controlAdapter();interrupted.adapter.running=true;const stopping=interrupted.adapter.cancel(),interruptRequest=await waitFor(()=>interrupted.writes[0]);
  assert.deepEqual(interruptRequest.request,{subtype:'interrupt',cancel_queued:true});await interrupted.adapter.message({type:'control_response',response:{subtype:'success',request_id:interruptRequest.request_id,response:{}}});await stopping;
});

test('Claude steer admission timeout is explicitly unknown',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});const {adapter}=controlAdapter();adapter.running=true;const pending=adapter.steer('timeout',[],'steer-timeout');await Promise.resolve();t.mock.timers.tick(5000);await assert.rejects(pending,error=>error.nativeAdmissionUnknown===true);
});

test('Claude refuses native interactions that arrive without a running turn',async()=>{
  const idle=controlAdapter('ask',false);await idle.adapter.message({type:'control_request',request_id:'ghost-tool',request:{subtype:'can_use_tool',tool_name:'Write',display_name:'Ghost write',input:{file_path:'ghost'}}});
  assert.deepEqual(idle.writes[0],{type:'control_response',response:{subtype:'success',request_id:'ghost-tool',response:{behavior:'deny',message:'Bridge++ 当前没有进行中的任务，已拒绝'}}});
  assert.equal(idle.events.some(e=>e.type==='approval'),false);assert.ok(idle.events.some(e=>e.type==='notice'&&/没有进行中的任务/.test(e.text)));
  idle.adapter.connected=true;await idle.adapter.message({type:'system',subtype:'init',claude_code_version:'fixture-1'});
  const interrupt=idle.writes.find(w=>w.request?.subtype==='interrupt');assert.deepEqual(interrupt.request,{subtype:'interrupt',cancel_queued:true});assert.ok(idle.events.some(e=>e.type==='notice'&&/自行开始了新的一轮/.test(e.text)));
  await idle.adapter.message({type:'control_response',response:{subtype:'success',request_id:interrupt.request_id,response:{}}});
  const live=controlAdapter();await live.adapter.message({type:'control_request',request_id:'live-tool',request:{subtype:'can_use_tool',tool_name:'Write',display_name:'Live write',input:{file_path:'live'}}});assert.equal(live.events.filter(e=>e.type==='approval').length,1);
  live.adapter.connected=true;await live.adapter.message({type:'system',subtype:'init',claude_code_version:'fixture-1'});assert.equal(live.writes.some(w=>w.request?.subtype==='interrupt'),false);
  const carried=controlAdapter();carried.adapter.connected=true;const admission=carried.adapter.steer('queued during a long turn',[],'carry-ghost');await waitFor(()=>carried.writes[0]);
  await carried.adapter.message({type:'command_lifecycle',command_uuid:'carry-ghost',state:'queued'});await admission;
  await carried.adapter.message({type:'result',subtype:'success',is_error:false});assert.equal(carried.adapter.running,true);
  await carried.adapter.message({type:'control_request',request_id:'carried-tool',request:{subtype:'can_use_tool',tool_name:'Write',display_name:'Carried write',input:{file_path:'carried'}}});assert.equal(carried.events.filter(e=>e.type==='approval').length,1);
  await carried.adapter.message({type:'system',subtype:'init',claude_code_version:'fixture-1'});assert.equal(carried.writes.some(w=>w.request?.subtype==='interrupt'),false);
});

test('Claude unexpected exit filters model warnings and fails the active turn',async()=>{
  const events=[],adapter=new ClaudeAdapter({emit:async e=>events.push(e)});adapter.running=true;adapter.stderr='[claude-code:unrecognized_model] synthetic\nfirst synthetic error\nsecond synthetic error';await adapter.processClosed(2,null);assert.equal(events[0].type,'error');assert.doesNotMatch(events[0].text,/unrecognized_model/);assert.match(events[0].text,/second synthetic error/);assert.equal(events[1].status,'failed');assert.equal(adapter.running,false);
});

async function fakeFixture(t){
  const root=await mkdtemp(join(tmpdir(),'bridge-claude-fixture-'));t.after(()=>rm(root,{recursive:true,force:true}));const events=[],calls=[],session={id:randomUUID(),selection:{contextTokens:200000}};const adapter=new ClaudeAdapter({...options(),session,configDir:join(root,'config'),project:{path:root},runtime:{executable:process.execPath},permissionMode:'ask',saveNative:async id=>{session.nativeId=id;},emit:async e=>events.push(e),launchProcess:(_command,args,opts)=>{calls.push({args,opts});return launch(process.execPath,[resolve('tests/fixtures/claude-code-native.mjs'),...args],opts);}});t.after(()=>adapter.close());return {adapter,events,calls,session};
}

test('fake Claude CLI completes initialize, approval, interrupt, steer, permission switch and close in order',{timeout:20000},async t=>{
  const f=await fakeFixture(t);await f.adapter.prompt('tool');const approval=await waitFor(()=>f.events.find(e=>e.type==='approval'));await f.adapter.approve(approval.approvalId,'approve-session');assert.equal((await waitFor(()=>f.events.filter(e=>e.type==='turn-end')[0])).status,'completed');assert.equal(f.session.nativeId,f.session.id);assert.equal(f.calls[0].args.includes('--session-id'),true);assert.equal(f.calls[0].args.includes('--resume'),false);assert.deepEqual(f.events.filter(e=>e.type==='text').map(e=>e.text),['fixture text']);assert.ok(f.events.some(e=>e.type==='tool-end'));
  await f.adapter.prompt('slow');await f.adapter.cancel();assert.equal((await waitFor(()=>f.events.filter(e=>e.type==='turn-end')[1])).status,'interrupted');
  await f.adapter.prompt('steer');await f.adapter.steer('synthetic interjection',[],'fixture-steer');await waitFor(()=>f.events.some(e=>e.type==='steer-consumed'&&e.steerId==='fixture-steer'));assert.equal((await waitFor(()=>f.events.filter(e=>e.type==='turn-end')[2])).status,'completed');assert.deepEqual(f.events.filter(e=>e.type==='steer-state').map(e=>e.state),['delivered']);
  await f.adapter.setPermissionMode('auto-review');assert.equal(f.adapter.permissionMode,'auto-review');assert.ok(f.events.some(e=>e.type==='notice'&&e.text.includes('fixture-1')));await f.adapter.close();
});

test('fake Claude CLI keeps a queued steer across an errored result and cancels it when retracted',{timeout:20000},async t=>{
  const f=await fakeFixture(t);await f.adapter.prompt('limit');await f.adapter.steer('queued after the error',[],'fixture-limit');
  await waitFor(()=>f.events.some(e=>e.type==='steer-state'&&e.state==='carried'));
  assert.equal(f.adapter.running,true);assert.equal(f.events.some(e=>e.type==='turn-end'),false);assert.ok(f.events.some(e=>e.type==='notice'&&/排队的插话由 Claude Code 带到下一轮继续/.test(e.text)));
  assert.deepEqual(await f.adapter.retractSteers(),['fixture-limit']);assert.equal(f.adapter.steers.size,0);assert.ok(f.events.some(e=>e.type==='native-event'&&e.name==='cancel_ack'&&e.data.cancelled?.[0]==='fixture-limit'));
  await f.adapter.close();
});

test('fake Claude CLI stops a self-started round and refuses its approval request',{timeout:20000},async t=>{
  const f=await fakeFixture(t);await f.adapter.prompt('ghost');assert.equal((await waitFor(()=>f.events.find(e=>e.type==='turn-end'))).status,'completed');
  await waitFor(()=>f.events.some(e=>e.type==='notice'&&/自行开始了新的一轮/.test(e.text)));assert.equal(f.adapter.running,false);assert.equal(f.events.some(e=>e.type==='approval'),false);
  const interrupt=await waitFor(()=>f.events.find(e=>e.type==='native-event'&&e.name==='interrupt_ack'));assert.equal(interrupt.data.cancel_queued,true);
  const denied=await waitFor(()=>f.events.find(e=>e.type==='native-event'&&e.name==='deny_ack'));assert.equal(denied.data.message,'Bridge++ 当前没有进行中的任务，已拒绝');assert.ok(f.events.some(e=>e.type==='notice'&&/请求授权/.test(e.text)));
  await f.adapter.prompt('tool');const approval=await waitFor(()=>f.events.find(e=>e.type==='approval'));await f.adapter.approve(approval.approvalId,'approve');assert.equal((await waitFor(()=>f.events.filter(e=>e.type==='turn-end')[1])).status,'completed');
  await f.adapter.close();
});

test('Claude reopens a native session when its record is missing and resumes it only when found',{timeout:30000},async t=>{
  const root=await mkdtemp(join(tmpdir(),'bridge-claude-resume-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const configDir=join(root,'config'),session={id:randomUUID(),selection:{}},launched=[],events=[],saved=[];
  const child=()=>Object.assign(new EventEmitter(),{stdout:Object.assign(new EventEmitter(),{setEncoding(){}}),stderr:Object.assign(new EventEmitter(),{setEncoding(){}}),stdin:Object.assign(new EventEmitter(),{destroyed:false,write(){},end(){}}),exitCode:null,signalCode:null});
  const build=control=>{const adapter=new ClaudeAdapter({...options(),configDir,session,emit:async e=>events.push(e),saveNative:async id=>{saved.push(id);session.nativeId=id;},launchProcess:(_command,args)=>{launched.push(args);return child();}});adapter.control=control;return adapter;};
  const adapters=[];
  const start=async control=>{const adapter=build(control);adapters.push(adapter);await adapter.start();return adapter;};
  const failing=build(async()=>{throw new Error('initialize timeout')});adapters.push(failing);await assert.rejects(failing.start(),/initialize timeout/);
  assert.equal(saved.length,0);assert.ok(launched[0].includes('--session-id'));assert.equal(launched[0].includes('--resume'),false);
  await start(async()=>({account:{tokenSource:'ANTHROPIC_AUTH_TOKEN'}}));assert.ok(launched[1].includes('--session-id'));assert.equal(launched[1].includes('--resume'),false);assert.deepEqual(saved,[session.id]);
  await mkdir(join(configDir,'projects','-synthetic-project'),{recursive:true});await writeFile(join(configDir,'projects','-synthetic-project',`${session.id}.jsonl`),'{}\n');
  session.nativeId='native-existing';await start(async()=>({account:{tokenSource:'ANTHROPIC_AUTH_TOKEN'}}));assert.equal(launched[2][launched[2].indexOf('--resume')+1],'native-existing');assert.equal(launched[2].includes('--session-id'),false);assert.equal(saved.length,1);
  await rm(join(configDir,'projects'),{recursive:true,force:true});session.nativeId='native-gone';await start(async()=>({account:{tokenSource:'ANTHROPIC_AUTH_TOKEN'}}));
  assert.ok(launched[3].includes('--session-id'));assert.equal(launched[3].includes('--resume'),false);assert.ok(events.some(e=>e.type==='notice'&&/没有找到 Claude Code 原生会话记录/.test(e.text)));
  for(const adapter of adapters){if(adapter.child)adapter.child.exitCode=0;await adapter.close();}
});

const realClaude=process.env.AWB_CLAUDE_EXE;
const sseMessage=(res,model,blocks,stop='end_turn',delay=0)=>{
  const events=[{type:'message_start',message:{id:'msg_synthetic',type:'message',role:'assistant',model,content:[],stop_reason:null,stop_sequence:null,usage:{input_tokens:10,output_tokens:1,cache_read_input_tokens:0,cache_creation_input_tokens:0}}}];blocks.forEach((block,index)=>{if(block.type==='text')events.push({type:'content_block_start',index,content_block:{type:'text',text:''}},{type:'content_block_delta',index,delta:{type:'text_delta',text:block.text}},{type:'content_block_stop',index});else events.push({type:'content_block_start',index,content_block:{type:'tool_use',id:block.id,name:block.name,input:{}}},{type:'content_block_delta',index,delta:{type:'input_json_delta',partial_json:JSON.stringify(block.input)}},{type:'content_block_stop',index});});events.push({type:'message_delta',delta:{stop_reason:stop,stop_sequence:null},usage:{output_tokens:5}},{type:'message_stop'});
  res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache'});setTimeout(()=>{for(const event of events)res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);res.end();},delay);
};
async function realAnthropicMock(t){
  const requests=[],server=createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');requests.push({url:req.url,body,headers:req.headers});if(!req.url.includes('/v1/messages')){res.writeHead(404);res.end();return;}
    const messages=body.messages??[],all=JSON.stringify(messages),last=[...messages].reverse().find(m=>m.role==='user'),parts=typeof last?.content==='string'?[{type:'text',text:last.content}]:last?.content??[],text=parts.filter(p=>p.type==='text').map(p=>p.text).join('\n'),results=parts.filter(p=>p.type==='tool_result'),model=body.model??'synthetic-model';let blocks=[{type:'text',text:'synthetic final reply'}],stop='end_turn',delay=0;
    if(/PROBE_FETCH/.test(all)&&!results.some(r=>r.tool_use_id==='toolu_search')&&!results.some(r=>r.tool_use_id==='toolu_fetch')){blocks=[{type:'tool_use',id:'toolu_search',name:'ToolSearch',input:{query:'select:WebFetch',max_results:1}}];stop='tool_use';}
    else if(results.some(r=>r.tool_use_id==='toolu_search')&&!results.some(r=>r.tool_use_id==='toolu_fetch')&&/PROBE_FETCH/.test(all)){blocks=[{type:'tool_use',id:'toolu_fetch',name:'WebFetch',input:{url:'https://example.com/',prompt:'Return the synthetic page title.'}}];stop='tool_use';}
    else if(results.length)blocks=[{type:'text',text:'synthetic tool answer received'}];
    else if(/SUBAGENT_TASK/.test(all))blocks=[{type:'text',text:'synthetic subagent reply'}];
    else if(/PROBE_AGENT/.test(text)){blocks=[{type:'tool_use',id:'toolu_agent',name:'Agent',input:{description:'Synthetic subagent',prompt:'SUBAGENT_TASK: reply briefly without using tools.',subagent_type:'general-purpose'}}];stop='tool_use';}
    else if(/PROBE_QUESTION/.test(text)){blocks=[{type:'tool_use',id:'toolu_question',name:'AskUserQuestion',input:{questions:[{question:'Synthetic choice?',header:'Choice',options:[{label:'Alpha',description:'synthetic A'},{label:'Beta',description:'synthetic B'}],multiSelect:false}]}}];stop='tool_use';}
    else if(/PROBE_QUEUE/.test(text))delay=1500;
    sseMessage(res,model,blocks,stop,delay);
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections?.();server.close(resolve);}));return {requests,url:`http://127.0.0.1:${server.address().port}/bridge`};
}
async function realFixture(t,mock,{extraEnv={},autoApprove=false,malicious=false,permissionMode='ask',selection={contextBudget:900000}}={}){
  // A desktop shell exports dozens of these; the adapter must not pass them on.
  const inherited={CLAUDE_CODE_OAUTH_TOKEN:'synthetic-oauth',CLAUDE_CODE_MESSAGING_SOCKET:'synthetic-socket',ANTHROPIC_API_KEY:'synthetic-api-key'},savedEnv=Object.fromEntries(Object.keys(inherited).map(key=>[key,process.env[key]]));
  Object.assign(process.env,inherited);t.after(()=>{for(const [key,value]of Object.entries(savedEnv)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
  const root=await mkdtemp(join(tmpdir(),'bridge-claude-real-')),project=join(root,'project');await mkdir(project,{recursive:true});if(malicious){await mkdir(join(project,'.claude'),{recursive:true});await writeFile(join(project,'.claude','settings.json'),JSON.stringify({env:{ANTHROPIC_BASE_URL:'https://api.anthropic.com'}}));}
  const events=[],session={id:randomUUID(),selection};let adapter;adapter=new ClaudeAdapter({runtime:{executable:realClaude},project:{path:project},session,dir:root,mediaDir:root,model:{maxOutputTokens:32000},variant:{id:'synthetic-model'},endpoint:{baseURL:mock.url+'/v1',key:'synthetic-only',model:'synthetic-model'},selection:session.selection,permissionMode,emit:async event=>{events.push(event);if(autoApprove&&event.type==='approval')setImmediate(()=>adapter.approve(event.approvalId,'approve').catch(()=>{}));},saveNative:async id=>{session.nativeId=id;},configDir:join(root,'config'),launchProcess:(command,args,opts)=>launch(command,args,{...opts,env:{...opts.env,...extraEnv}})});t.after(()=>adapter.close());t.after(()=>rm(root,{recursive:true,force:true}));return {adapter,events,session,root};
}
async function denyProxy(t){
  const targets=[],server=createServer((req,res)=>{targets.push(req.url);res.writeHead(403);res.end('synthetic proxy denied');});server.on('connect',(req,socket)=>{targets.push(req.url);socket.on('error',()=>{});socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections?.();server.close(resolve);}));return {targets,url:`http://127.0.0.1:${server.address().port}`};
}

test('real Claude CLI returns AskUserQuestion answers, applies permission changes and reports the CLI context-window cap',{skip:!realClaude,timeout:90000},async t=>{
  const mock=await realAnthropicMock(t),f=await realFixture(t,mock,{selection:{contextTokens:1000000,contextBudget:800000}});await f.adapter.prompt('PROBE_QUESTION');const question=await waitFor(()=>f.events.find(e=>e.type==='question'),20000);await f.adapter.approve(question.approvalId,'approve',{answers:{'Synthetic choice?':'Alpha'},items:[{question:'Synthetic choice?',selected:['Alpha']}]});const end=await waitFor(()=>f.events.find(e=>e.type==='turn-end'),30000);assert.equal(end.status,'completed');assert.ok(mock.requests.length>=2);assert.match(JSON.stringify(mock.requests.at(-1).body.messages),/Synthetic choice/);assert.match(JSON.stringify(mock.requests.at(-1).body.messages),/Alpha/);assert.equal(JSON.stringify(mock.requests.at(-1).body.messages).includes('items'),false);assert.equal(mock.requests.every(request=>request.headers['x-api-key']===undefined),true);const usage=Object.values(end.data.modelUsage??{})[0];assert.equal(usage?.contextWindow,1000000);await f.adapter.setPermissionMode('auto-review');assert.equal(f.adapter.permissionMode,'auto-review');await f.adapter.close();
});

test('real Claude CLI natively carries a queued steer into the next model round',{skip:!realClaude,timeout:60000},async t=>{
  const mock=await realAnthropicMock(t),f=await realFixture(t,mock);await f.adapter.prompt('PROBE_QUEUE');await f.adapter.steer('synthetic queued follow-up',[],'real-queued-steer');const end=await waitFor(()=>f.events.find(e=>e.type==='turn-end'),30000);assert.equal(end.status,'completed');assert.equal(mock.requests.length,2);assert.ok(f.events.some(e=>e.type==='steer-state'&&e.state==='carried'));assert.ok(f.events.some(e=>e.type==='steer-consumed'&&e.steerId==='real-queued-steer'));assert.match(JSON.stringify(mock.requests[1].body.messages),/synthetic queued follow-up/);await f.adapter.close();
});

test('real Claude CLI subagent request count with progress summaries disabled and enabled',{skip:!realClaude,timeout:120000},async t=>{
  const counts=[];for(const disabled of [false,true]){const mock=await realAnthropicMock(t),extraEnv=disabled?{CLAUDE_CODE_DISABLE_AGENT_PROGRESS_SUMMARIES:'1'}:{CLAUDE_CODE_DISABLE_AGENT_PROGRESS_SUMMARIES:'0'},f=await realFixture(t,mock,{extraEnv,permissionMode:'auto-review',autoApprove:true});await f.adapter.prompt('PROBE_AGENT');const end=await waitFor(()=>f.events.find(e=>e.type==='turn-end'),45000);assert.equal(end.status,'completed');counts.push({disabled,requests:mock.requests.length});assert.ok(mock.requests.every(r=>r.body.model==='synthetic-model'));await f.adapter.close();}t.diagnostic('synthetic Agent request counts: '+JSON.stringify(counts));
});

test('real Claude CLI cannot override the gateway or reach Anthropic through project settings or WebFetch preflight',{skip:!realClaude,timeout:90000},async t=>{
  const mock=await realAnthropicMock(t),proxy=await denyProxy(t),extraEnv={HTTPS_PROXY:proxy.url,HTTP_PROXY:proxy.url,NO_PROXY:'127.0.0.1,localhost'},f=await realFixture(t,mock,{extraEnv,malicious:true,permissionMode:'ask',autoApprove:true});await f.adapter.prompt('PROBE_FETCH');const end=await waitFor(()=>f.events.find(e=>e.type==='turn-end'),45000);assert.equal(end.status,'completed');assert.ok(mock.requests.length>=3);assert.ok(f.events.some(e=>e.type==='tool-start'&&e.name==='ToolSearch'));assert.ok(f.events.some(e=>e.type==='tool-start'&&e.name==='WebFetch'));assert.ok(mock.requests.every(r=>r.body.model==='synthetic-model'));assert.equal(proxy.targets.some(target=>/anthropic\.com|claude\.ai|claude\.com/i.test(target)),false,JSON.stringify(proxy.targets));await f.adapter.close();
});
