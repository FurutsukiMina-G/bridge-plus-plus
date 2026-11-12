import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {join,resolve} from 'node:path';
import {inflateRawSync} from 'node:zlib';
import {Store} from '../app/core/store.mjs';
import {feedbackMethods,sessionIdHash} from '../app/services/feedback-export.mjs';

function unzip(buffer){
  let end=-1;
  for(let index=buffer.length-22;index>=0;index--)if(buffer.readUInt32LE(index)===0x06054b50){end=index;break;}
  assert.notEqual(end,-1,'missing end of central directory');
  const count=buffer.readUInt16LE(end+10),offset=buffer.readUInt32LE(end+16),files={};
  let position=offset;
  for(let index=0;index<count;index++){
    assert.equal(buffer.readUInt32LE(position),0x02014b50);
    const flags=buffer.readUInt16LE(position+8),method=buffer.readUInt16LE(position+10),crc=buffer.readUInt32LE(position+16),
      packedSize=buffer.readUInt32LE(position+20),size=buffer.readUInt32LE(position+24),nameLength=buffer.readUInt16LE(position+28),
      extraLength=buffer.readUInt16LE(position+30),commentLength=buffer.readUInt16LE(position+32),localOffset=buffer.readUInt32LE(position+42),
      name=buffer.subarray(position+46,position+46+nameLength).toString('utf8');
    assert.equal(buffer.readUInt32LE(localOffset),0x04034b50);
    assert.equal(buffer.readUInt16LE(localOffset+6),flags);
    assert.equal(buffer.readUInt16LE(localOffset+8),method);
    const localName=buffer.readUInt16LE(localOffset+26),localExtra=buffer.readUInt16LE(localOffset+28),
      start=localOffset+30+localName+localExtra,packed=buffer.subarray(start,start+packedSize),data=method===8?inflateRawSync(packed):packed;
    assert.equal(data.length,size);
    files[name]={data,flags,method,crc};
    position+=46+nameLength+extraLength+commentLength;
  }
  return files;
}

const SESSION_ID='11111111-1111-4111-8111-111111111111';
const at=seconds=>new Date(Date.UTC(2026,10,11,0,0,seconds)).toISOString();
const textFile=files=>name=>files[name]?.data.toString('utf8')??'';

async function writeJournal(workspace,events){
  await writeFile(join(workspace,'sessions',SESSION_ID+'.jsonl'),events.map(event=>JSON.stringify({...event,sessionId:SESSION_ID,id:'synthetic-'+Math.random().toString(36).slice(2)})).join('\n')+'\n');
}

async function fixture(t,{events=[],reports=[],maxBytes,secrets=[],title='合成会话',sessionPatch={}}={}){
  await mkdir('.runtime/tests',{recursive:true});
  const dir=await mkdtemp(resolve('.runtime/tests/feedback-export-')),project=join(dir,'项目'),workspace=join(dir,'workspace');
  await mkdir(project,{recursive:true});
  const store=await new Store(workspace).open(),session={
    id:SESSION_ID,projectId:'p',runtimeId:'codex',title,status:'completed',createdAt:at(0),updatedAt:at(30),
    selection:{modelKey:'qoder:demo',identity:'identity-demo',reasoning:'high',contextTokens:128000,contextBudget:64000},
    permissionMode:'default',...sessionPatch
  };
  await store.mutate(state=>{state.projects.push({id:'p',name:'项目',path:project});state.sessions.push(session);});
  await writeJournal(workspace,events);
  if(reports.length){
    const dirname=join(workspace,'providers','qoder','codex','reports');await mkdir(dirname,{recursive:true});
    await writeFile(join(dirname,'requests.ndjson'),reports.map(row=>JSON.stringify(row)).join('\n')+'\n');
  }
  const calls=[],dialog={canceled:false,filePath:join(dir,'导出反馈.zip'),calls:[],showSaveDialog:async(...args)=>{dialog.calls.push(args);return {canceled:dialog.canceled,filePath:dialog.canceled?undefined:dialog.filePath};}},
    shell={showItemInFolder:path=>calls.push(path)};
  const methods=feedbackMethods(()=>store,{
    app:{getVersion:()=> '0.1.22',isPackaged:false,getLocale:()=> 'zh-CN',getPath:()=>join(dir,'Downloads')},dialog,shell,
    runtimes:[{id:'codex',status:'ready',installed:{version:'0.140.0'}}],
    sources:[{id:'qoder',name:'Qoder CN',status:'ready',installedVersion:'1.0.50'}],
    services:[{id:'qoder',name:'Qoder CN',status:'running',port:8646,keyPreview:'must-not-leak',key:'service-secret'}],
    modelInfo:()=>({source:'qoder',name:'Demo 模型'}),projectPath:()=>project,dataDir:()=>dir,
    homeDir:'C:\\Users\\TestUser',secrets:()=>secrets,now:()=>new Date('2026-11-11T09:05:00+08:00'),maxBytes
  });
  t.after(()=>store.close());
  return {dir,project,workspace,store,methods,dialog,shell,calls};
}

const basicEvents=[
  {type:'user',text:'请检查 secret-user-text',at:at(1),turnId:'turn-1'},
  {type:'text',text:'secret-assistant-text',at:at(2),turnId:'turn-1'},
  {type:'thinking',text:'secret-thinking-text',at:at(3),turnId:'turn-1'},
  {type:'native-event',name:'native/stream',data:{delta:'secret-native-text',messages:[{content:'secret-native-message'}]},at:at(3),turnId:'turn-1'},
  {type:'tool-start',toolId:'call-1',name:'read_file',data:{arguments:{path:'secret-tool-args.txt'}},at:at(4),turnId:'turn-1'},
  {type:'tool-output',toolId:'call-1',text:'secret-tool-output',at:at(5),turnId:'turn-1'},
  {type:'tool-end',toolId:'call-1',name:'read_file',data:{is_error:false,content:'secret-tool-end-output'},at:at(6),turnId:'turn-1'},
  {type:'turn-end',status:'completed',stats:{requests:1},at:at(7),turnId:'turn-1'}
];

test('default export keeps structure only and zip names are UTF-8',async t=>{
  const f=await fixture(t,{events:basicEvents}),preview=await f.methods['feedback:preview']({sessionId:SESSION_ID});
  assert.deepEqual(Object.keys(preview).sort(),['bytes','corrections','errors','files','truncated','turns']);
  assert.equal(preview.turns,1);assert.equal(preview.truncated,false);assert.ok(preview.bytes>0);
  assert.deepEqual(preview.files.map(file=>file.name),['说明.txt','feedback.json','events.jsonl','bridge-reports.jsonl']);
  const exported=await f.methods['feedback:export']({sessionId:SESSION_ID}),files=unzip(await readFile(exported.path)),text=textFile(files);
  assert.equal(files['说明.txt'].flags&0x0800,0x0800);assert.equal(files['events.jsonl'].flags&0x0800,0x0800);
  const events=text('events.jsonl'),feedback=JSON.parse(text('feedback.json'));
  for(const secret of ['secret-user-text','secret-assistant-text','secret-thinking-text','secret-native-text','secret-native-message','secret-tool-args','secret-tool-output','secret-tool-end-output'])assert.equal(events.includes(secret),false,secret);
  assert.match(events,/"type":"user".*"chars":/);assert.match(events,/"type":"tool-start".*"name":"read_file"/);assert.match(events,/"type":"tool-end".*"durationMs":2000.*"isError":false/);
  assert.equal(feedback.options.includeConversation,false);assert.equal(Object.hasOwn(feedback.session,'title'),false);assert.equal(files['conversation.md'],undefined);
  assert.equal(text('说明.txt').includes('未包含对话内容'),true);
});

test('conversation and tool options include bodies, truncate tool payloads and add the title',async t=>{
  const long='x'.repeat(3000),events=[...basicEvents.slice(0,-1),{type:'tool-output',toolId:'call-1',text:long,at:at(5),turnId:'turn-1'},basicEvents.at(-1)];
  const f=await fixture(t,{events}),result=await f.methods['feedback:export']({sessionId:SESSION_ID,includeConversation:true,includeTools:true}),files=unzip(await readFile(result.path)),text=textFile(files);
  const conversation=text('conversation.md'),eventsText=text('events.jsonl'),feedback=JSON.parse(text('feedback.json'));
  assert.match(conversation,/请检查 secret-user-text/);assert.match(conversation,/secret-assistant-text/);assert.equal(conversation.includes('secret-thinking-text'),false);
  assert.match(eventsText,/secret-tool-args\.txt/);assert.match(eventsText,/secret-tool-end-output/);
  assert.equal(eventsText.includes(long),false);assert.ok(eventsText.includes('x'.repeat(2000)));assert.ok(eventsText.length<10000);
  assert.equal(feedback.session.title,'合成会话');assert.equal(feedback.options.includeTools,true);
});

test('every exported text is redacted for secrets, paths, email and phone',async t=>{
  const f=await fixture(t,{secrets:['known-secret-123'],title:'标题 sk-title-secret'});
  const project=f.project,dataDir=f.dir,userText=['Bearer bearer-secret','Authorization: Basic basic-secret','sk-abcdef123456','known-secret-123','C:\\Users\\TestUser\\private.txt',`${project}\\src\\app.js`,`${dataDir}\\workspace`,'test@example.com','13800138000',`session ${SESSION_ID}`].join('\n');
  await writeJournal(f.workspace,[{type:'user',text:userText,at:at(1),turnId:'turn-1'}]);
  const result=await f.methods['feedback:export']({sessionId:SESSION_ID,includeConversation:true,includeTools:true}),files=unzip(await readFile(result.path)),text=textFile(files),all=Object.values(files).map(file=>file.data.toString('utf8')).join('\n');
  for(const secret of ['bearer-secret','basic-secret','sk-abcdef123456','known-secret-123','C:\\Users\\TestUser','test@example.com','13800138000',SESSION_ID,'sk-title-secret'])assert.equal(all.includes(secret),false,secret);
  assert.match(text('conversation.md'),/%USERPROFILE%/);assert.match(text('conversation.md'),/<项目>/);assert.match(text('conversation.md'),/<数据目录>/);
  assert.match(text('conversation.md'),/\[email\]/);assert.match(text('conversation.md'),/\[phone\]/);assert.match(text('feedback.json'),/\[redacted\]/);
  assert.equal(text('feedback.json').includes('"keyPreview"'),false);
});

test('bridge reports keep timing, usage, error and native diagnostics but no content fields',async t=>{
  const reports=[
    {at:at(2),requestId:'req-1',model:'demo',wallMs:123,ttft_ms:10,usage:{prompt_tokens:10,completion_tokens:5},native:{rebuild_reason:'synthetic rebuild',prompt:'SECRET_NATIVE_PROMPT',messages:['SECRET_NATIVE_MESSAGE']},
      prompt:'SECRET_PROMPT',messages:[{content:'SECRET_MESSAGE'}],content:'SECRET_CONTENT',text:'SECRET_TEXT',input:'SECRET_INPUT',output:'SECRET_OUTPUT',arguments:{x:'SECRET_ARGUMENT'},response:'SECRET_RESPONSE',
      error:{code:'SYNTH',message:'SYNTHETIC_REPORT_ERROR',request_id:'req-1'},api_retries:2,decision_repairs:[{reason:'tool'}],context_reset:true,toolMode:'json',billing_header_filtered:1},
    {at:at(600),requestId:'req-outside',wallMs:99,prompt:'SECRET_OUTSIDE'},
    {requestId:'req-2',model:'demo',wallMs:44,prompt:'SECRET_NO_TIMESTAMP'}
  ];
  const events=[...basicEvents.slice(0,-1),{type:'upstream-error',source:'gateway',provider:'qoder',code:'transient',message:'temporary',requestId:'req-2',at:at(3),turnId:'turn-1'},basicEvents.at(-1)];
  const f=await fixture(t,{events,reports}),preview=await f.methods['feedback:preview']({sessionId:SESSION_ID}),result=await f.methods['feedback:export']({sessionId:SESSION_ID}),files=unzip(await readFile(result.path));
  const lines=textFile(files)('bridge-reports.jsonl').trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(lines.length,2);assert.deepEqual(lines.map(row=>row.requestId).sort(),['req-1','req-2']);
  assert.equal(lines.find(row=>row.requestId==='req-1').wallMs,123);assert.equal(lines.find(row=>row.requestId==='req-1').usage.prompt_tokens,10);
  assert.equal(lines.find(row=>row.requestId==='req-1').native.rebuild_reason,'synthetic rebuild');assert.equal(lines.find(row=>row.requestId==='req-1').error.message,'SYNTHETIC_REPORT_ERROR');
  for(const row of lines){assert.equal(JSON.stringify(row).includes('SECRET_'),false);for(const key of ['prompt','messages','content','text','input','output','arguments','response'])assert.equal(Object.hasOwn(row,key),false,key);}
  for(const kind of ['retry','tool_recovery','runtime_rebuild','context_compaction','json_fallback','protocol_filter'])assert.ok(preview.corrections.byKind[kind]>0,kind);
});

test('errors and corrections cover every required category, with cancellation kept separate',async t=>{
  const events=[
    {type:'user',text:'第一轮',at:at(1),turnId:'turn-1'},
    {type:'error',source:'gateway',code:'gateway_crash',text:'桥网关崩溃',at:at(2),turnId:'turn-1'},
    {type:'upstream-error',source:'gateway',code:'rate_limited',message:'频率限制',status:429,resetAt:'2026-11-11T01:00:00Z',at:at(3),turnId:'turn-1'},
    {type:'turn-end',status:'failed',reason:{kind:'upstream',code:'rate_limited',message:'频率限制'},at:at(4),turnId:'turn-1'},
    {type:'user',text:'第二轮',at:at(5),turnId:'turn-2'},
    {type:'error',source:'native-upstream',code:'upstream_bad',text:'上游返回错误',at:at(6),turnId:'turn-2'},
    {type:'error',source:'runtime',code:'ETIMEDOUT',text:'request timeout',at:at(7),turnId:'turn-2'},
    {type:'error',source:'native-permission',code:'permission_denied',text:'权限拒绝',at:at(8),turnId:'turn-2'},
    {type:'turn-end',status:'failed',reason:{kind:'runtime',message:'权限拒绝'},at:at(9),turnId:'turn-2'},
    {type:'user',text:'第三轮',at:at(10),turnId:'turn-3'},
    {type:'notice',source:'task-completion',text:'继续原任务（1/2）',at:at(11),turnId:'turn-3'},
    {type:'native-event',name:'llm/retry-started',at:at(12),turnId:'turn-3'},
    {type:'native-event',name:'tool/invalid-call-recovered',at:at(13),turnId:'turn-3'},
    {type:'native-event',name:'runtime/rebuild',data:{native:{rebuild_reason:'协议重建'}},at:at(14),turnId:'turn-3'},
    {type:'native-event',name:'gateway/protocol-filter',at:at(15),turnId:'turn-3'},
    {type:'native-event',name:'gateway/json-fallback',at:at(16),turnId:'turn-3'},
    {type:'notice',source:'native-context',text:'上下文已压缩',at:at(17),turnId:'turn-3'},
    {type:'steer-state',state:'delivered',at:at(18),turnId:'turn-3'},
    {type:'approval',approvalId:'a1',name:'Bash',at:at(19),turnId:'turn-3'},
    {type:'approval-resolved',approvalId:'a1',choice:'reject',at:at(20),turnId:'turn-3'},
    {type:'notice',source:'session',text:'已重新确认当前模型目录与参数。',at:at(21),turnId:'turn-3'},
    {type:'turn-end',status:'interrupted',reason:{kind:'cancelled',message:'用户已停止本轮任务。'},at:at(22),turnId:'turn-3'}
  ];
  const f=await fixture(t,{events}),preview=await f.methods['feedback:preview']({sessionId:SESSION_ID});
  for(const kind of ['upstream','bridge','runtime','rate_limit','timeout'])assert.ok(preview.errors.byKind[kind]>0,kind);
  for(const kind of ['retry','tool_recovery','runtime_rebuild','late_followup','protocol_filter','json_fallback','context_compaction','stop','steer','approval_denied','follow_up_message','rebind'])assert.ok(preview.corrections.byKind[kind]>0,kind);
  assert.equal(preview.errors.byKind.cancelled,undefined);
  const result=await f.methods['feedback:export']({sessionId:SESSION_ID}),feedback=JSON.parse(textFile(unzip(await readFile(result.path)))('feedback.json')),rate=feedback.errors.find(error=>error.kind==='rate_limit');
  assert.equal(feedback.cancellations.length,1);assert.equal(feedback.summary.cancelled,1);assert.equal(feedback.errors.some(error=>error.kind==='cancelled'),false);
  assert.equal(rate.resetAt,'2026-11-11T01:00:00Z');assert.equal(rate.upstreamStatus,429);
});

test('the package truncates oldest events when it exceeds the size limit',async t=>{
  const events=[];
  for(let index=0;index<80;index++)events.push({type:'user',text:`${index}-${randomBytes(600).toString('hex')}`,at:at(index),turnId:`turn-${index}`});
  const f=await fixture(t,{events,maxBytes:6000}),preview=await f.methods['feedback:preview']({sessionId:SESSION_ID,includeConversation:true});
  assert.equal(preview.truncated,true);assert.ok(preview.bytes<=6000,`bytes=${preview.bytes}`);assert.ok(preview.turns<80);
  const result=await f.methods['feedback:export']({sessionId:SESSION_ID,includeConversation:true}),files=unzip(await readFile(result.path)),feedback=JSON.parse(textFile(files)('feedback.json'));
  assert.equal(feedback.truncated,true);assert.ok(files['events.jsonl'].data.length>0);assert.ok(files['events.jsonl'].data.length<events.length*1000);
});

test('export uses the save dialog and reveal only accepts the latest exported path',async t=>{
  const f=await fixture(t,{events:basicEvents,title:'合成'});
  assert.equal(await f.methods['feedback:reveal']({path:'C:\\other.zip'}).then(()=>true,()=>false),false);
  f.dialog.canceled=true;assert.equal(await f.methods['feedback:export']({sessionId:SESSION_ID}),null);f.dialog.canceled=false;
  const exported=await f.methods['feedback:export']({sessionId:SESSION_ID,note:'问'.repeat(5000)}),saveOptions=f.dialog.calls.at(-1)[1];
  assert.equal(exported.path,f.dialog.filePath);assert.ok(exported.bytes>0);assert.equal((await readFile(exported.path)).length,exported.bytes);
  assert.equal(saveOptions.title,'导出反馈');assert.equal(resolve(saveOptions.defaultPath).startsWith(resolve(f.dir,'Downloads')),true);assert.match(saveOptions.defaultPath,/Bridge\+\+-反馈-\d{8}-\d{4}-[0-9a-f]{6}\.zip$/);
  const files=unzip(await readFile(exported.path)),feedback=JSON.parse(textFile(files)('feedback.json'));
  assert.equal([...feedback.note].length,4000);
  assert.equal(await f.methods['feedback:reveal']({path:exported.path}),true);assert.deepEqual(f.calls,[exported.path]);
  await assert.rejects(f.methods['feedback:reveal']({path:join(f.dir,'other.zip')}),/最近一次/);
  const second=join(f.dir,'第二份反馈.zip');f.dialog.filePath=second;await f.methods['feedback:export']({sessionId:SESSION_ID});
  await assert.rejects(f.methods['feedback:reveal']({path:exported.path}),/最近一次/);
  assert.equal(sessionIdHash(SESSION_ID).length,12);
});
