import {test} from 'node:test';
import assert from 'node:assert/strict';
import {foldRuns,foldSummary,toolStatus,MIN_FOLD} from '../app/ui/tool-groups.js';
import {argsOf,toolSummary} from '../app/ui/activity.js';

const call=(name,args,done=true)=>({start:{name,data:{sessionUpdate:'tool_call',title:name,kind:name==='Read'?'read':'search',content:[{type:'content',content:{type:'text',text:JSON.stringify(args)}}]}},outputs:[],end:done?{data:{status:'completed'}}:null});
const tool=(id,t)=>({key:`tool:${id}`,html:()=>id,work:{tool:t}});
const thinking=id=>({key:`thinking:${id}`,html:()=>id,work:{thinking:true}});
const text=id=>({key:`text:${id}`,html:id});
const read=path=>call('Read',{path});

test('a short run stays as plain rows',()=>{
  const blocks=Array.from({length:MIN_FOLD-1},(_,i)=>tool(i,read('a')));
  assert.deepEqual(foldRuns(blocks),blocks);
});

test('thinking between calls folds with them, but thinking alone is no reason to fold',()=>{
  const blocks=[thinking('t0'),tool(1,read('a')),thinking('t1'),tool(2,read('b')),tool(3,read('c')),thinking('t2')];
  const out=foldRuns(blocks);
  assert.equal(out.length,1);
  assert.equal(out[0].fold.length,blocks.length);
  const quiet=[thinking('a'),thinking('b'),thinking('c'),tool(1,read('a'))];
  assert.deepEqual(foldRuns(quiet),quiet);
});

test('the answer and anything else that is not work splits a run and stays visible',()=>{
  const run=n=>Array.from({length:3},(_,i)=>tool(`${n}${i}`,read('a')));
  const out=foldRuns([...run('a'),text('answer'),...run('b'),text('end')]);
  assert.deepEqual(out.map(b=>b.fold?'fold':b.key),['fold','text:answer','fold','text:end']);
});

test('granted approvals fold with the calls they allowed; a pending one ends the run',()=>{
  const granted=id=>({key:`approval:${id}`,html:()=>id,work:{approval:true}}),pending=id=>({key:`approval:${id}`,html:id});
  const reviewed=id=>({key:`note:${id}`,html:()=>id,work:{review:true}});
  const blocks=[tool(1,call('Bash',{command:'npm test'})),granted('g1'),thinking('t'),tool(2,read('a')),granted('g2'),tool(3,read('b')),reviewed('r1'),pending('p1'),tool(4,read('c'))];
  const out=foldRuns(blocks);
  assert.deepEqual(out.map(b=>b.fold?`fold:${b.fold.length}`:b.key),['fold:7','approval:p1','tool:4']);
  assert.equal(foldSummary(out[0].fold,false).detail,'读取文件 2 · 搜索代码 1 · 思考 1 段 · 已授权 3 次');
  // Approvals and thinking alone never make a fold.
  const quiet=[granted('a'),granted('b'),thinking('c'),tool(1,read('a')),tool(2,read('b'))];
  assert.deepEqual(foldRuns(quiet),quiet);
});

test('a finished run says what it did, most frequent first',()=>{
  const run=[tool(1,read('a')),tool(2,call('Grep',{pattern:'x'})),tool(3,read('b')),thinking('t')];
  assert.deepEqual(foldSummary(run,false),{status:'done',title:'3 次工具调用',detail:'读取文件 2 · 搜索代码 1 · 思考 1 段'});
});

test('a failure is the first thing the row shows, and marks the run',()=>{
  const bad={...read('a'),end:{data:{status:'failed'}}};
  const summary=foldSummary([tool(1,read('a')),tool(2,bad),tool(3,read('b'))],false);
  assert.equal(summary.status,'failed');
  assert.match(summary.detail,/^1 个失败 · /);
});

test('while a call runs the row says what it is doing; a stopped turn leaves it marked stopped',()=>{
  const run=[tool(1,read('a')),tool(2,read('b')),tool(3,call('Read',{path:'app/x.mjs'},false))];
  assert.deepEqual(foldSummary(run,true),{status:'running',title:'3 次工具调用',detail:'正在读取文件 · app/x.mjs'});
  assert.equal(foldSummary(run,false).status,'stopped');
  assert.equal(toolStatus(run[2].work.tool,true),'running');
});

test('Kimi tool arguments are read from the call, not from what it returned',()=>{
  const start=read('app/main.mjs').start;
  assert.deepEqual(argsOf(start.data),{path:'app/main.mjs'});
  assert.equal(toolSummary(start),'app/main.mjs');
  const output={sessionUpdate:'tool_call_update',content:[{type:'content',content:{type:'text',text:'{"not":"arguments"}'}}]};
  assert.equal(argsOf(output).not,undefined);
  assert.equal(toolSummary(call('Grep',{pattern:'foo',path:'app'}).start),'foo · app');
  assert.equal(toolSummary(call('Glob',{pattern:'**/*.mjs'}).start),'**/*.mjs');
});
