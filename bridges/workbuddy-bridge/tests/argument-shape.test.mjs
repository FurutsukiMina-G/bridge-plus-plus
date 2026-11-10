import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseDecision,compileTools,unwrapToolArguments,decisionIssueSummary} from '../src/decision.mjs';
import {nativeDecision} from '../src/native.mjs';
import {DecisionOutput} from '../src/decision-output.mjs';
import {rejectedEvidence,decisionErrorEvidence} from '../src/rejection-evidence.mjs';
const tools=[
  {type:'function',function:{name:'read',parameters:{type:'object',properties:{file_path:{type:'string'}},required:['file_path'],additionalProperties:false}}},
  {type:'function',function:{name:'write',parameters:{type:'object',properties:{file_path:{type:'string'},content:{type:'string'}},required:['file_path','content'],additionalProperties:false}}},
  {type:'function',function:{name:'open',parameters:{type:'object',properties:{input:{type:'string'}},required:['input'],additionalProperties:false}}},
];
const body={model:'deepseek-v4.1-flash',messages:[{role:'user',content:'synthetic'}],tools};
const decide=(calls)=>JSON.stringify({action:'tool_calls',calls});
const failure=run=>{try{run();return null;}catch(error){return error;}};
test('the four observed argument wrappings are adopted only when the tool schema accepts them',()=>{
  const validators=compileTools(tools),validate=validators.get('read'),tool=tools[0];
  for(const value of [{arguments:{file_path:'a.ts'}},{args:{file_path:'a.ts'}},{parameters:{file_path:'a.ts'}},{params:{file_path:'a.ts'}},{input:{file_path:'a.ts'}},{input:'{"file_path":"a.ts"}'},'{"file_path":"a.ts"}'])
    assert.deepEqual(unwrapToolArguments(value,tool,validate),{file_path:'a.ts'},JSON.stringify(value));
  // A candidate that fails this tool's own schema is never adopted.
  assert.equal(unwrapToolArguments({parameters:{file_path:'a.ts'}},tools[1],validators.get('write')),null);
  assert.equal(unwrapToolArguments({arguments:{file_path:'a.ts'}},tools[2],validators.get('open')),null);
  // A key the tool declares itself is real data, not a wrapper.
  assert.equal(unwrapToolArguments({input:{file_path:'a.ts'}},tools[2],validators.get('open')),null);
  assert.equal(unwrapToolArguments('not json',tool,validate),null);
});
test('the JSON decision path adopts a wrapped object as a local repair, not a correction',()=>{
  const repairs=[],decision=parseDecision(decide([{name:'read',arguments:{arguments:{file_path:'a.ts'}}}]),body,compileTools(tools),repair=>repairs.push(repair));
  assert.deepEqual(decision.calls,[{name:'read',arguments:{file_path:'a.ts'}}]);
  assert.deepEqual(repairs,[{kind:'unwrapped_arguments',tool:'read'}]);
  const text=parseDecision(decide([{name:'read',arguments:'{"file_path":"b.ts"}'}]),body,compileTools(tools));
  assert.deepEqual(text.calls,[{name:'read',arguments:{file_path:'b.ts'}}]);
});
test('the native path adopts wrapped arguments and reports the same repair',()=>{
  const decision=nativeDecision({calls:[{id:'c1',name:'mcp__host__read',input:{input:{file_path:'a.ts'}}},{id:'c2',name:'mcp__host__write',input:'{"file_path":"b.ts","content":"B"}'}],text:''},body,compileTools(tools));
  assert.deepEqual(decision.calls,[{id:'c1',name:'read',arguments:{file_path:'a.ts'}},{id:'c2',name:'write',arguments:{file_path:'b.ts',content:'B'}}]);
  assert.deepEqual(decision.repairs,[{kind:'unwrapped_arguments',tool:'read'},{kind:'unwrapped_arguments',tool:'write'}]);
  assert.equal(decision.action,'tool_calls');
});
test('a wrapper the schema rejects still fails with keywords only and no argument values',()=>{
  const error=failure(()=>parseDecision(decide([{name:'write',arguments:{arguments:{file_path:'PRIVATE_VALUE'}}}]),body,compileTools(tools)));
  assert.equal(error.code,'invalid_tool_arguments');assert.equal(error.decisionIssue.tool,'write');
  assert.match(error.message,/^write: /);assert.match(error.message,/required\(content\)/);
  assert.ok(!error.message.includes('PRIVATE_VALUE'));assert.ok(!error.message.includes('a.ts'));
  assert.doesNotMatch(JSON.stringify(error.decisionIssue.issues),/PRIVATE_VALUE/);
  const native=failure(()=>nativeDecision({calls:[{id:'c1',name:'mcp__host__write',input:{parameters:{file_path:'PRIVATE_VALUE'}}}],text:''},body,compileTools(tools)));
  assert.equal(native.code,'invalid_tool_arguments');assert.match(native.message,/^Model returned an undeclared host tool or arguments that fail its JSON Schema: write: /);
  assert.ok(!native.message.includes('PRIVATE_VALUE'));
});
test('an undeclared tool is reported by the name the model actually called',()=>{
  const error=failure(()=>parseDecision(decide([{name:'Read',arguments:{file_path:'x'}}]),body,compileTools(tools)));
  assert.equal(error.code,'invalid_tool_arguments');assert.equal(error.decisionIssue.undeclaredTool,'Read');assert.match(error.message,/^Read: undeclared_tool$/);
  // Native mode names the offending call and asks for a correction instead of failing the turn.
  const native=failure(()=>nativeDecision({calls:[{id:'c1',name:'Read',input:{file_path:'x'}}],text:''},body,compileTools(tools)));
  assert.equal(native.code,'native_tool_blocked');assert.equal(native.decisionIssue.tool,'Read');
  assert.match(native.message,/^Model called "Read", which is not a host function/);
  const nameless=failure(()=>nativeDecision({calls:[{id:'c1',name:'bad name!',input:{}}],text:''},body,compileTools(tools)));
  assert.equal(nameless.decisionIssue.tool,'<invalid tool name>');
  const unnamed=failure(()=>parseDecision(decide([{name:'bad name!',arguments:{}}]),body,compileTools(tools)));
  assert.equal(unnamed.decisionIssue.undeclaredTool,'<invalid tool name>');
});
test('issue summaries name schema keywords and paths without values',()=>{
  assert.equal(decisionIssueSummary([{keyword:'additionalProperties',additionalProperty:'arguments'},{keyword:'required',missingProperty:'cmd'},{keyword:'declared_tool'},{keyword:'type',path:'/',type:'object'}]),'additionalProperties(arguments), required(cmd), undeclared_tool, type(object)');
  assert.equal(decisionIssueSummary([]),'');
});
test('rejection and error evidence carry the tool name and keywords, never argument values',async t=>{
  const runtime=await mkdtemp(join(tmpdir(),'wb-shape-'));t.after(()=>rm(runtime,{recursive:true,force:true}));
  const credential={accessToken:'PRIVATE_ACCESS_FIXTURE'},output=new DecisionOutput();
  output.observe({type:'result',result:'synthetic'});output.observe({type:'assistant',message:{content:[{type:'text',text:'PRIVATE_ARGUMENT_VALUE'}]}});
  const issue={tool:'write',issues:'required(content), additionalProperties(arguments)'};
  const first=JSON.parse(await readFile(await rejectedEvidence({runtime},{requestId:'shape',model:'deepseek-v4.1-flash',attempt:1,errorCode:'invalid_tool_arguments',output,credential,issue}),'utf8'));
  assert.deepEqual(first.issue,issue);assert.ok(!JSON.stringify(first.issue).includes('PRIVATE_ARGUMENT_VALUE'));
  const second=JSON.parse(await readFile(await decisionErrorEvidence({runtime},{requestId:'shape',model:'deepseek-v4.1-flash',errorCode:'invalid_tool_arguments',output,credential,issue}),'utf8'));
  assert.equal(second.issue.tool,'write');assert.match(second.issue.issues,/required\(content\)/);
});
