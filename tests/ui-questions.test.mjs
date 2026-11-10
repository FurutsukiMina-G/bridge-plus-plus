import {test} from 'node:test';
import assert from 'node:assert/strict';
import {structuredQuestions,questionFormHtml,buildAnswers} from '../app/ui/questions.js';

// Claude Code's AskUserQuestion input.
const claude={questions:[
  {question:'专注时长的默认值设多少？',header:'默认时长',multiSelect:false,options:[{label:'25 分钟',description:'番茄钟'},{label:'45 分钟'},{label:'60 分钟'}]},
  {question:'时长结束时要做什么？',header:'结束提醒',multiSelect:true,options:[{label:'桌宠说话'},{label:'系统通知'},{label:'自动开始休息'}]}]};
// DSH's ask_user_question request: ids, an optional detail, and a question without options.
const dsh={questions:[
  {id:'pick_question',header:'选题确认',question:'按哪道题写？',detail:'两张图是两门课的题。',options:[{label:'财政学 第2题',description:'逻辑链清晰'},{label:'社保 第5题'}]},
  {id:'extra',question:'还有其他要求吗？'}]};
const form=answers=>i=>answers[i];

test('questions with a text and optional options become a form; anything else stays raw JSON',()=>{
  assert.equal(structuredQuestions(claude),claude.questions);
  assert.equal(structuredQuestions(dsh),dsh.questions);
  assert.equal(structuredQuestions({question:'一个字符串问题'}),null);
  assert.equal(structuredQuestions({questions:[]}),null);
  assert.equal(structuredQuestions({questions:[{prompt:'no question field'}]}),null);
  assert.equal(structuredQuestions({questions:[{question:'Q',options:[{value:'no label'}]}]}),null);
  // Options only, with nothing to pick: there is no way to answer in the form.
  assert.equal(structuredQuestions({questions:[{question:'Q',allowCustom:false}]}),null);
  assert.equal(structuredQuestions(null),null);
});

test('the form shows options, a free answer unless the runtime takes none, and hides secrets',()=>{
  const html=questionFormHtml(dsh.questions);
  assert.match(html,/选题确认/);assert.match(html,/两张图是两门课的题。/);
  assert.equal((html.match(/type="radio"/g)??[]).length,2);
  assert.equal((html.match(/data-q-other=/g)??[]).length,2);
  assert.match(html,/可以只回答其中一部分/);
  const strict=questionFormHtml([{question:'选哪个分支？',options:[{label:'main'},{label:'dev'}],allowCustom:false},{question:'令牌？',secret:true}]);
  assert.doesNotMatch(strict,/data-q-other="0"/);
  assert.match(strict,/type="password" data-q-other="1"/);
  assert.match(questionFormHtml(claude.questions),/type="checkbox" name="q1"/);
  assert.doesNotMatch(questionFormHtml([claude.questions[0]]),/q-note/,'one question needs no note about skipping');
  // Text from the model is escaped.
  assert.match(questionFormHtml([{question:'<img src=x onerror=1>',options:[{label:'"a"&b'}]}]),/&lt;img src=x onerror=1&gt;.*&quot;a&quot;&amp;b/s);
});

test('answers are keyed by question text and also listed per question with ids',()=>{
  assert.deepEqual(buildAnswers(claude.questions,form([{picked:[0],other:''},{picked:[0,1],other:''}])),{
    answers:{'专注时长的默认值设多少？':'25 分钟','时长结束时要做什么？':'桌宠说话, 系统通知'},
    items:[{question:'专注时长的默认值设多少？',selected:['25 分钟']},{question:'时长结束时要做什么？',selected:['桌宠说话','系统通知']}]});
  assert.deepEqual(buildAnswers(dsh.questions,form([{picked:[0],other:''},{picked:[],other:' 宋体五号 '}])),{
    answers:{'按哪道题写？':'财政学 第2题','还有其他要求吗？':'宋体五号'},
    items:[{id:'pick_question',question:'按哪道题写？',selected:['财政学 第2题']},{id:'extra',question:'还有其他要求吗？',selected:[],custom:'宋体五号'}]});
});

test('a typed answer replaces a single choice and adds to a multi-select',()=>{
  const {answers,items}=buildAnswers(claude.questions,form([{picked:[1],other:'30 分钟'},{picked:[1],other:'震动'}]));
  assert.deepEqual(answers,{'专注时长的默认值设多少？':'30 分钟','时长结束时要做什么？':'系统通知, 震动'});
  assert.deepEqual(items,[{question:'专注时长的默认值设多少？',selected:[],custom:'30 分钟'},{question:'时长结束时要做什么？',selected:['系统通知'],custom:'震动'}]);
});

test('a skipped question stays in the list, marked, and out of the answers map',()=>{
  const {answers,items}=buildAnswers(dsh.questions,form([{picked:[1],other:''},{picked:[],other:'  '}]));
  assert.deepEqual(answers,{'按哪道题写？':'社保 第5题'});
  assert.deepEqual(items,[{id:'pick_question',question:'按哪道题写？',selected:['社保 第5题']},{id:'extra',question:'还有其他要求吗？',selected:[],skipped:true}]);
  assert.deepEqual(buildAnswers(dsh.questions,()=>undefined).answers,{});
});

test('a runtime that takes only its options never gets typed text; bad picks are dropped',()=>{
  const qs=[{id:'q0',question:'选哪个分支？',options:[{label:'main'},{label:'dev'}],allowCustom:false}];
  assert.deepEqual(buildAnswers(qs,form([{picked:[1],other:'feature/x'}])),{answers:{'选哪个分支？':'dev'},items:[{id:'q0',question:'选哪个分支？',selected:['dev']}]});
  assert.deepEqual(buildAnswers(qs,form([{picked:[],other:'feature/x'}])).items,[{id:'q0',question:'选哪个分支？',selected:[],skipped:true}]);
  // Out-of-range or repeated indexes, and two picks on a single choice.
  assert.deepEqual(buildAnswers(qs,form([{picked:[7,1,1,0],other:''}])).items,[{id:'q0',question:'选哪个分支？',selected:['dev']}]);
});
