import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rulesPageHtml,ruleNoticeHtml,ruleTime,modelName} from '../app/ui/rules.js';

const view={
  path:'C:\\Data\\workspace\\AGENTS.md',text:'# Bridge++ 长期要求\n\n- 回复用中文\n',
  items:[
    {id:'r_1',text:'回复用中文',at:'2026-11-12T08:05:00Z',sessionId:'s-1',sessionTitle:'修复 <b>登录</b>',auto:true},
    {id:'r_2',text:'改代码前先说明方案',at:null,sessionId:null,auto:false},
  ],
  injected:['r_1'],overflow:false,autoRecord:true,detector:{model:'session',fallback:'qoder:qfmodel',available:true},updatedAt:'2026-11-12T08:05:00Z'
};
const models=[{key:'qoder:qfmodel',name:'Q-Qwen3.8-Flash',group:'Qoder CN'},{key:'workbuddy:deepseek-v4.1-flash',name:'W-DeepSeek-V4.1-Flash',group:'WorkBuddy'}];

test('rules page lists items with origin, source session and the not-injected tag, escaped',()=>{
  const html=rulesPageHtml(view,{models});
  assert.match(html,/<h1>长期要求<\/h1>/);
  assert.match(html,/data-rule-id="r_1"/);assert.match(html,/自动记录/);assert.match(html,/手动添加/);
  assert.match(html,/data-rule-session="s-1"/);assert.match(html,/修复 &lt;b&gt;登录&lt;\/b&gt;/);assert.doesNotMatch(html,/<b>登录<\/b>/);
  // r_2 is not in `injected`: shown, but marked.
  assert.match(html,/data-rule-id="r_2"[\s\S]*未注入/);assert.doesNotMatch(html.split('data-rule-id="r_2"')[0],/未注入/);
  assert.match(html,/data-rule-delete="r_1"/);assert.match(html,/data-rules="add"/);assert.match(html,/data-rules="edit"/);
  assert.match(html,/data-copy-text="C:\\Data\\workspace\\AGENTS.md"/);
  assert.match(html,/2 条/);
});

test('detector defaults to the session model and lists source models; an unknown fixed model stays visible',()=>{
  const html=rulesPageHtml(view,{models});
  assert.match(html,/<option value="session" selected>跟随会话当前模型（默认）<\/option>/);
  assert.match(html,/<optgroup label="Qoder CN"><option value="qoder:qfmodel">Q-Qwen3.8-Flash<\/option>/);
  assert.match(html,/这个会话正在用的模型/);assert.match(html,/Q-Qwen3.8-Flash（Qoder）/);
  const fixed=rulesPageHtml({...view,detector:{model:'workbuddy:deepseek-v4.1-flash',fallback:'qoder:qfmodel',available:true}},{models});
  assert.match(fixed,/<option value="workbuddy:deepseek-v4.1-flash" selected>/);assert.match(fixed,/会发给 WorkBuddy/);
  const gone=rulesPageHtml({...view,detector:{model:'qoder:retired',fallback:'qoder:qfmodel',available:false}},{models});
  assert.match(gone,/<option value="qoder:retired" selected>retired（现在不可用）<\/option>/);assert.match(gone,/现在没有可用的识别模型/);
  // With auto-record off the picker is hidden.
  assert.doesNotMatch(rulesPageHtml({...view,autoRecord:false},{models}),/data-rules-detector/);
});

test('empty list, overflow, editor and loading/error states',()=>{
  assert.match(rulesPageHtml({...view,items:[],injected:[]}),/还没有长期要求/);
  assert.match(rulesPageHtml({...view,overflow:true}),/超过 50 条或 8 KB/);
  const editing=rulesPageHtml(view,{editing:true,draft:'- a <x>'});
  assert.match(editing,/<textarea id="rules-text"[^>]*>- a &lt;x&gt;<\/textarea>/);assert.match(editing,/data-rules="save-text"/);assert.doesNotMatch(editing,/data-rule-delete/);
  assert.match(rulesPageHtml(view,{editing:true,loading:true}),/data-rules="save-text" disabled/);
  assert.match(rulesPageHtml(null),/正在读取/);
  assert.match(rulesPageHtml(null,{error:'boom <x>'}),/读取失败：boom &lt;x&gt;/);
});

test('transcript notice offers undo until it is undone',()=>{
  const e={type:'notice',source:'long-term-rule',ruleId:'r_1',rule:{id:'r_1',text:'回复用<中文>'},text:'已记为长期要求：回复用<中文>'};
  const live=ruleNoticeHtml(e);
  assert.match(live,/已记为长期要求：回复用&lt;中文&gt;/);assert.match(live,/data-rule-undo="r_1"/);assert.match(live,/data-open-rules/);
  const undone=ruleNoticeHtml(e,true);
  assert.match(undone,/class="event-note notice rule-note undone"/);assert.match(undone,/已撤销长期要求/);assert.doesNotMatch(undone,/data-rule-undo/);
  // Older events without a rule object fall back to the text.
  assert.match(ruleNoticeHtml({ruleId:'r_9',text:'已记为长期要求：每次先跑测试'}),/已记为长期要求：每次先跑测试/);
});

test('helpers',()=>{
  assert.equal(ruleTime('not a date'),'');assert.match(ruleTime('2026-11-12T08:05:00Z'),/^11 月 12 日 \d\d:05$/);
  assert.equal(modelName('qoder:qfmodel'),'Q-Qwen3.8-Flash');assert.equal(modelName('workbuddy:glm-5.3'),'glm-5.3');
});
