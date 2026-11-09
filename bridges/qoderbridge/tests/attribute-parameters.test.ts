import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatRequest,parseDecision,type DecisionRepair} from '../src/compat.js';
import {recoverDecision,decisionCorrectionPrompt} from '../src/decision-recovery.js';
const request=ChatRequest.parse({model:'qoder-deepseek-flash',messages:[{role:'user',content:'Synthetic fixture'}],tools:[
  {type:'function',function:{name:'read',parameters:{type:'object',properties:{file_path:{type:'string'},offset:{type:'integer',minimum:1},limit:{type:'integer',minimum:1}},required:['file_path'],additionalProperties:false}}},
  {type:'function',function:{name:'grep',parameters:{type:'object',properties:{pattern:{type:'string'},path:{type:'string'}},required:['pattern','path'],additionalProperties:false}}}]});
const root=(s:string)=>`<｜｜DSML｜｜ calls>${s}</｜｜DSML｜｜ calls>`;
const invoke=(name:string,s:string,closed=true)=>`<｜｜DSML｜｜ invoke name="${name}">${s}${closed?'</｜｜DSML｜｜ invoke>':''}`;
const attr=(s:string)=>`<｜｜DSML｜｜ ${s}｜｜DSML｜｜>`;
const field=(name:string,value:string)=>`<｜｜DSML｜｜ parameter name="${name}" string="true">${value}</｜｜DSML｜｜ parameter>`;
const path='D:\\synthetic folder\\中文.ts';
test('attribute parameters preserve literal paths and complete independent batches without a correction',async()=>{
  const source=root(invoke('read',attr(`file_path="${path}"`))+invoke('read',attr('file_path="D:\\synthetic folder\\b.ts"')));let calls=0;
  const result=await recoverDecision({request,prompt:'Synthetic prompt',invoke:async()=>{calls++;return {response:source,error:null,stage:'inference'};}});
  assert.equal(calls,1);assert.equal(result.recovery.correctionCalls,0);assert.equal(result.decision?.kind,'tool_calls');if(result.decision?.kind==='tool_calls')assert.equal(result.decision.calls[0]!.arguments.file_path,path);
  assert.ok(result.turn.decision_repairs?.some(r=>r.kind==='attribute_parameter'));
});
test('multiple attributes, numeric values and unclosed invokes use only explicit next-call/root boundaries',()=>{
  const source=root(invoke('read',attr(`file_path="${path}"`),false)+invoke('read',attr('file_path="D:\\synthetic folder\\b.ts"｜｜DSML｜｜ offset="1" limit="60"'),false)+invoke('grep',attr('pattern="foo|bar"｜｜DSML｜｜ path="D:\\synthetic folder\\src"'),false));
  const repairs:DecisionRepair[]=[],d=parseDecision(source,request,r=>repairs.push(r));assert.equal(d.kind,'tool_calls');if(d.kind==='tool_calls'){assert.equal(d.calls.length,3);assert.deepEqual(d.calls[1]!.arguments,{file_path:'D:\\synthetic folder\\b.ts',offset:1,limit:60});assert.equal(d.calls[2]!.arguments.pattern,'foo|bar');}
  assert.equal(repairs.filter(r=>r.kind==='implicit_invoke_close').length,3);assert.throws(()=>parseDecision(source,{...request,parallel_tool_calls:false}),/only one/);
});
test('standard and attribute fields can agree but conflicting duplicate values fail the whole batch',()=>{
  const source=root(invoke('read',field('file_path',path)+attr(`file_path="${path}"`)));assert.equal(parseDecision(source,request).kind,'tool_call');
  for(const body of [field('file_path',path)+attr('file_path="other"'),attr(`file_path="${path}"`)+field('file_path','other')])assert.throws(()=>parseDecision(root(invoke('read',body)),request),/Duplicate/);
});
test('unknown attributes, unpaired/interior quotes, invalid numbers and incomplete wrappers remain rejected',()=>{
  const good=root(invoke('read',attr(`file_path="${path}"`)));
  for(const source of [good.replace('file_path=','unknown='),good.replace('name="read"','name="unknown"'),good.replace(path,path+'"quote'),good.replace(`"${path}"`,`"${path}`),good.replace('</｜｜DSML｜｜ calls>',''),good+'extra',root(invoke('read',attr(`file_path="${path}" offset="NaN"`))),root(invoke('read',attr(`file_path="${path}" limit="1.5"`))),root(invoke('read',field('file_path',path)+attr('unknown="x"')))]){
    const repairs:DecisionRepair[]=[];assert.throws(()=>parseDecision(source,request,r=>repairs.push(r)));assert.deepEqual(repairs,[]);
  }
  assert.throws(()=>parseDecision(good,{...request,tool_choice:'none'}));
});
test('correction explains the same declared tool/field standard headers without copying values or changing the JSON retry contract',()=>{
  const source=root(invoke('read',attr(`file_path="${path}" offset="wrong"`))),prompt=decisionCorrectionPrompt(request,'Synthetic invalid number',source);
  assert.match(prompt,/parameter name=\\"file_path\\" string=\\"true\\"/);assert.match(prompt,/parameter name=\\"offset\\" string=\\"false\\"/);assert.match(prompt,/for THIS retry return the required JSON kind decision/);assert.doesNotMatch(prompt,/synthetic folder/);
});
