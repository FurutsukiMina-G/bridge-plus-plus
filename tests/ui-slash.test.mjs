import {test} from 'node:test';
import assert from 'node:assert/strict';
import {slashQuery,matchCommands,completeSlash,slashMenuHtml} from '../app/ui/slash.js';

const commands=[
  {name:'compact',description:'Compact the conversation context',hint:'<instructions>',aliases:[],kind:'command'},
  {name:'code-review',description:'Review the current changes',hint:'[low|high]',aliases:['review'],kind:'skill'},
  {name:'context',description:'Show <context> usage',hint:'',aliases:[],kind:'command'},
  {name:'usage',description:'Show session token usage',hint:'',aliases:['cost','stats'],kind:'command'},
];

test('the menu opens only while the caret is inside a leading command word',()=>{
  assert.deepEqual(slashQuery('/co',3),{query:'co',end:3});
  assert.deepEqual(slashQuery('/compact keep tests',4),{query:'com',end:8});
  assert.equal(slashQuery('/compact keep',10),null,'caret in the arguments');
  assert.equal(slashQuery(' /compact',3),null,'a leading space is not a command');
  assert.equal(slashQuery('hello /x',8),null);
  assert.equal(slashQuery('/',0),null,'caret before the slash');
  assert.deepEqual(slashQuery('/'),{query:'',end:1});
});

test('matching ranks name prefix, then alias prefix, then contained name or description',()=>{
  assert.deepEqual(matchCommands(commands,'co').map(c=>c.name),['compact','code-review','context','usage'],'usage by its alias cost');
  assert.deepEqual(matchCommands(commands,'rev').map(c=>c.name),['code-review'],'alias review');
  assert.deepEqual(matchCommands(commands,'cost').map(c=>c.name),['usage']);
  assert.deepEqual(matchCommands(commands,'token').map(c=>c.name),['usage'],'description');
  assert.deepEqual(matchCommands(commands,'th').map(c=>c.name),[],'two letters never match prose');
  assert.equal(matchCommands(commands,'').length,4);
  assert.deepEqual(matchCommands(null,'x'),[]);
});

test('completing keeps the arguments and puts the caret after the command',()=>{
  assert.deepEqual(completeSlash('/co',`compact`),{text:'/compact ',caret:9});
  assert.deepEqual(completeSlash('/rev  main branch','code-review'),{text:'/code-review main branch',caret:13});
});

test('menu rows, notes and empty states are escaped and keyboard-ready',()=>{
  const view={runtimeId:'claude',runtimeName:'Claude Code',source:'native',commands,note:null,stale:false};
  const html=slashMenuHtml(view,{items:matchCommands(commands,'co'),active:1,query:'co'});
  assert.match(html,/Claude Code 的命令/);
  assert.match(html,/data-slash-index="1" role="option" aria-selected="true"/);
  assert.match(html,/<span class="slash-tag">技能<\/span>/);
  assert.match(html,/Show &lt;context&gt; usage/);assert.doesNotMatch(html,/<context>/);
  assert.match(slashMenuHtml({...view,source:'none',commands:[],note:'Antigravity 会自己展开 /命令和技能，但不提供命令列表'}),/Antigravity 会自己展开/);
  assert.match(slashMenuHtml({...view,commands:[],stale:true},{items:[]}),/还没有读到命令列表/);
  assert.match(slashMenuHtml(view,{items:[],query:'zz'}),/没有以 \/zz 开头的命令/);
  assert.match(slashMenuHtml(null,{loading:true}),/正在读取命令/);
  assert.match(slashMenuHtml(view,{error:'超时 <x>'}),/读取命令失败：超时 &lt;x&gt;/);
});
