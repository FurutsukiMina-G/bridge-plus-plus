import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ActivityTracker,toolActivity,gatewayNotice} from '../app/ui/activity.js';

const run=(events,status='running',options)=>{const a=new ActivityTracker();for(const e of events)a.feed({sessionId:'s',...e});return a.describe('s',status,options);};

test('turn activity follows the model from request to thinking, output, tools and back',()=>{
  assert.equal(run([{type:'user',text:'go'}]).long,'等待模型响应');
  assert.equal(run([{type:'user'}],'starting',{runtime:'Codex CLI'}).long,'正在连接 Codex CLI');
  assert.equal(run([{type:'user'},{type:'thinking',text:'hm'}]).long,'正在思考');
  assert.equal(run([{type:'user'},{type:'thinking',text:'hm'},{type:'text',text:'ok'}]).long,'正在输出回复');
  const tool=run([{type:'user'},{type:'text',text:'ok'},{type:'tool-start',toolId:'c1',name:'commandExecution',data:{command:'npm test'}}]);
  assert.deepEqual([tool.long,tool.detail,tool.short],['正在运行命令','npm test','运行命令']);
  assert.equal(run([{type:'user'},{type:'tool-start',toolId:'c1',name:'commandExecution'},{type:'tool-end',toolId:'c1'}]).long,'等待模型响应');
  const parallel=run([{type:'user'},{type:'tool-start',toolId:'a',name:'read',data:{arguments:'{"path":"a.js"}'}},{type:'tool-start',toolId:'b',name:'grep',data:{arguments:'{"pattern":"x"}'}}]);
  assert.deepEqual([parallel.long,parallel.detail],['正在并行运行 2 个工具','读取文件、搜索代码']);
  // A missed tool-end must not leave a stale tool once the model speaks again.
  assert.equal(run([{type:'user'},{type:'tool-start',toolId:'a',name:'read'},{type:'text',text:'done'}]).long,'正在输出回复');
  // Between turn-end and the status update the turn is over; no phase should be guessed.
  assert.equal(run([{type:'user'},{type:'text',text:'x'},{type:'turn-end',status:'completed'}]).long,'正在结束本轮');
  assert.equal(run([{type:'user'},{type:'turn-end',status:'interrupted'}],'running',{stopping:true}).long,'正在停止本轮');
  assert.equal(run([{type:'user'},{type:'turn-end'},{type:'user'}]).long,'等待模型响应');
  assert.equal(run([{type:'user'}],'running',{stopping:true}).short,'正在停止');
});

test('approvals, questions, compaction and retries override the model phase',()=>{
  const ask=run([{type:'user'},{type:'tool-start',toolId:'c',name:'Shell',data:{kind:'execute'}},{type:'approval',approvalId:'p1',name:'Shell'}],'waiting');
  assert.deepEqual([ask.long,ask.detail],['等待你授权','Shell']);
  assert.equal(run([{type:'user'},{type:'question',approvalId:'q1'}],'waiting').long,'等待你回答问题');
  assert.equal(run([{type:'user'},{type:'tool-start',toolId:'c',name:'Shell',data:{kind:'execute'}},{type:'approval',approvalId:'p1'},{type:'approval-resolved',approvalId:'p1'}]).long,'正在运行命令');
  assert.equal(run([{type:'user'},{type:'native-event',name:'compaction/start',data:{}}]).long,'正在压缩上下文');
  assert.equal(run([{type:'user'},{type:'native-event',name:'compaction/start'},{type:'native-event',name:'compaction/end'}]).long,'等待模型响应');
  assert.equal(run([{type:'user'},{type:'native-event',name:'item/started',data:{item:{type:'contextCompaction'}}}]).long,'正在压缩上下文');
  assert.equal(run([{type:'user'},{type:'native-event',name:'item/started',data:{item:{type:'reasoning'}}}]).long,'正在思考');
  const dshRetry=run([{type:'user'},{type:'native-event',name:'llm/retry',data:{retry:2,maxRetries:5,delayMs:4000,failure:{status:429}}}]);
  assert.deepEqual([dshRetry.long,dshRetry.detail],['请求失败，准备第 2 次重试（最多 5 次）','HTTP 429 · 4 秒后']);
  assert.equal(run([{type:'user'},{type:'native-event',name:'llm/retry-started',data:{retry:2}}]).long,'正在重试请求（第 2 次）');
  assert.equal(run([{type:'user'},{type:'native-event',name:'llm/retry-started',data:{retry:2}},{type:'thinking',text:'.'}]).long,'正在思考');
  assert.equal(run([{type:'user'},{type:'error',text:'stream lost',data:{willRetry:true,error:{message:'stream disconnected'}}}]).long,'连接中断，正在重试');
  const chunk=c=>({type:'native-event',name:'assistant-stream',data:{type:'chunk',chunk:{type:'tool-call-delta',...c}}});
  const writing=run([{type:'user'},{type:'text',text:'改一下'},chunk({name:'write',argumentsDelta:'{"pa'}),chunk({argumentsDelta:'th":"a"}'})]);
  assert.deepEqual([writing.long,writing.detail],['正在生成工具调用','write']);
  assert.equal(run([{type:'user'},chunk({name:'write'}),{type:'tool-start',toolId:'w',name:'write'},{type:'tool-end',toolId:'w'},chunk({argumentsDelta:'{'})]).detail,'');
  assert.equal(run([{type:'user'},{type:'native-event',name:'gateway/tool-call',data:{name:'apply_patch'}}]).detail,'apply_patch');
  const sub=run([{type:'user'},{type:'native-event',name:'tool/ptc-dispatch-start',data:{rootCallId:'r',subCallId:'x',name:'read',arguments:{path:'b.ts'}}}]);
  assert.deepEqual([sub.long,sub.detail],['正在读取文件','b.ts']);
  assert.equal(run([{type:'user'},{type:'tool-start',toolId:'r',name:'code'},{type:'native-event',name:'tool/ptc-dispatch-start',data:{rootCallId:'r',subCallId:'x',name:'read'}},{type:'tool-end',toolId:'r'}]).long,'等待模型响应');
});

test('bridge status lines become live status instead of transcript noise',()=>{
  const wait=gatewayNotice('[QoderBridge] Still waiting for Qoder (75s without upstream output).');
  assert.deepEqual([wait.long,wait.detail,wait.transient],['等待 Qoder 上游响应','75 秒没有输出',true]);
  const retry=gatewayNotice('[QoderBridge] Qoder upstream retry 2/5 (HTTP 429); next attempt in 3s.');
  assert.deepEqual([retry.long,retry.detail],['Qoder 上游请求重试 2/5','HTTP 429 · 3 秒后重试']);
  assert.equal(gatewayNotice('something else'),null);
  assert.equal(run([{type:'user'},{type:'notice',source:'gateway',text:'[QoderBridge] Qoder upstream retry 1/3; next attempt in 2s.'}]).long,'Qoder 上游请求重试 1/3');
  assert.equal(run([{type:'user'},{type:'notice',text:'[QoderBridge] Still waiting for Qoder (60s without upstream output).'}]).long,'等待模型响应');
});

test('tool names from every runtime map to what the tool is doing',()=>{
  const kind=(name,data)=>toolActivity({name,data}).long;
  assert.equal(kind('fileChange',{changes:[{path:'a.js'}]}),'正在修改文件');
  assert.equal(kind('webSearch',{query:'electron'}),'正在联网搜索');
  assert.equal(kind('mcpToolCall',{server:'docs',tool:'lookup'}),'正在调用 MCP 工具');
  assert.equal(toolActivity({name:'mcpToolCall',data:{server:'docs',tool:'lookup'}}).detail,'docs · lookup');
  assert.equal(kind('collabAgentToolCall'),'子代理正在工作');
  assert.equal(kind('run_command'),'正在运行命令');
  assert.equal(kind('view_file'),'正在读取文件');
  assert.equal(kind('replace_file_content'),'正在修改文件');
  assert.equal(kind('grep_search'),'正在搜索代码');
  assert.equal(kind('read_url_content'),'正在读取网页');
  assert.equal(kind('list_dir'),'正在浏览目录');
  assert.equal(kind('SetTodoList'),'正在更新计划');
  assert.equal(kind('StrReplaceFile'),'正在修改文件');
  assert.equal(kind('Read file',{kind:'read'}),'正在读取文件');
  assert.equal(kind('Find usages',{kind:'search'}),'正在搜索代码');
  const unknown=toolActivity({name:'dynamicToolCall',data:{arguments:{query:'x'}}});
  assert.deepEqual([unknown.long,unknown.detail],['正在调用工具','dynamicToolCall · x']);
});

test('replaying stored events restores the status after the renderer reloads mid-turn',()=>{
  const a=new ActivityTracker();
  a.replay('s',[{type:'user'},{type:'text',text:'a'},{type:'turn-end'},{type:'user'},{type:'tool-start',toolId:'t',name:'bash',data:{command:'ls'}}]);
  assert.equal(a.describe('s','running').long,'正在运行命令');
});

test('Antigravity tool calls show their PascalCase parameters',()=>{
  const read=toolActivity({name:'read_file',data:{name:'read_file',parameters:{Path:'D:\media\a.png'}}});
  assert.deepEqual([read.long,read.detail],['正在读取文件','D:\media\a.png']);
  const cmd=toolActivity({name:'run_command',data:{name:'run_command',parameters:{CommandLine:'Get-ChildItem -File'}}});
  assert.deepEqual([cmd.long,cmd.detail],['正在运行命令','Get-ChildItem -File']);
});
