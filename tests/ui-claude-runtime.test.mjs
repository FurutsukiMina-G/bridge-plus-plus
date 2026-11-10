import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toolActivity,toolSummary} from '../app/ui/activity.js';
import {toolFailed,toolStatus} from '../app/ui/tool-groups.js';
import {permissionWarning,environmentCardHtml} from '../app/ui/setup.js';

// Claude Code reports a tool call as the Anthropic tool_use block and its result as the tool_result block.
const use=(name,input)=>({name,data:{type:'tool_use',id:'toolu_1',name,input}});

test('Claude Code tool names read as what the tool is doing',()=>{
  const short=(name,input={})=>toolActivity(use(name,input)).short;
  assert.equal(short('PowerShell',{command:'npm test'}),'运行命令');
  assert.equal(short('Read',{file_path:'a.txt'}),'读取文件');
  for(const name of ['Edit','Write','NotebookEdit'])assert.equal(short(name,{file_path:'a.txt'}),'修改文件',name);
  for(const name of ['Glob','Grep'])assert.equal(short(name,{pattern:'x'}),'搜索代码',name);
  assert.equal(short('Agent',{description:'look around',prompt:'…'}),'子代理');
  assert.equal(short('WebFetch',{url:'https://example.com/'}),'读取网页');
  assert.equal(short('WebSearch',{query:'x'}),'联网搜索');
  // Names the generic patterns would misread: "ToolSearch" is not a code search, "Skill"/"AskUserQuestion" are not unknown tools.
  assert.equal(short('ToolSearch',{query:'select:WebFetch'}),'加载工具');
  assert.equal(short('Skill',{skill:'verify'}),'使用技能');
  assert.equal(short('AskUserQuestion',{questions:[{question:'Q?'}]}),'提问');
  assert.equal(short('ExitPlanMode',{plan:'1. …'}),'计划模式');
  assert.equal(short('TaskStop',{task_id:'t'}),'子代理');
  assert.equal(short('ScheduleWakeup',{delaySeconds:60}),'定时任务');
  assert.equal(short('mcp__files__read',{}),'MCP 工具');
});

test('a Claude Code tool row is summarised by its command, file, skill or first question',()=>{
  assert.equal(toolSummary(use('PowerShell',{command:'git status',description:'Show status'})),'git status');
  assert.equal(toolSummary(use('Write',{file_path:'D:\\p\\a.txt',content:'x'})),'D:\\p\\a.txt');
  assert.equal(toolSummary(use('Skill',{skill:'verify'})),'verify');
  assert.equal(toolSummary(use('AskUserQuestion',{questions:[{question:'默认值设多少？',options:[]}]})),'默认值设多少？');
});

test('a tool_result with is_error marks the call as failed',()=>{
  assert.equal(toolFailed({data:{tool_use_id:'toolu_1',content:'No such tool available: Bash',is_error:true}}),true);
  assert.equal(toolFailed({data:{tool_use_id:'toolu_1',content:'ok',is_error:false}}),false);
  assert.equal(toolStatus({end:{data:{content:'boom',is_error:true}}},true),'failed');
  assert.equal(toolStatus({end:{data:{content:'fine'}}},true),'done');
});

test('skipping every permission prompt in Claude Code asks first; the other modes do not',()=>{
  const warning=permissionWarning('claude','auto');
  assert.ok(warning?.title&&warning.text.includes('bypassPermissions')&&warning.confirm);
  for(const mode of ['ask','auto-review','readonly',null])assert.equal(permissionWarning('claude',mode),null,String(mode));
});

test('the Claude Code card says how it is kept apart and offers no native program',()=>{
  const claude={id:'claude',name:'Claude Code',protocol:'stream-json',description:'私有配置、非登录',tools:'工具',installed:true,status:'ready',executable:'C:\\env\\claude.exe'};
  const ready=environmentCardHtml(claude,{actions:{update:true,check:true}},{canOpenNative:true});
  assert.match(ready,/不登录/);assert.match(ready,/不读写本机 Claude 桌面版的数据/);
  assert.doesNotMatch(ready,/data-open-runtime/,'Claude Code runs only as a tool executor');
  assert.match(ready,/data-use-runtime="claude"/);
  // Another environment keeps its native-program button.
  const kimi={id:'kimi',name:'Kimi Code',protocol:'acp',description:'ACP',tools:'工具',installed:true,status:'ready',executable:'C:\\env\\kimi.mjs'};
  assert.match(environmentCardHtml(kimi,{actions:{}},{canOpenNative:true}),/data-open-runtime="kimi"/);
  // Not installed yet: the card says where it comes from and that no Anthropic account is needed.
  const missing=environmentCardHtml({...claude,installed:false,status:'missing',executable:null},{actions:{install:true}},{});
  assert.match(missing,/data-env-install="claude"/);assert.match(missing,/不需要 Anthropic 账号/);
});
