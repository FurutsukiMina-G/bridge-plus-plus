import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatRequest,parseDecision,type DecisionRepair} from '../src/compat.js';
const tool=(name:string,properties:object,required:string[])=>({type:'function' as const,function:{name,parameters:{type:'object',properties,required,additionalProperties:false}}});
const request=ChatRequest.parse({model:'qoder-deepseek-flash',messages:[{role:'user',content:'Synthetic operation'}],tools:[
  tool('read',{file_path:{type:'string'},limit:{type:'integer',minimum:1},description:{type:'string'},justification:{type:'string'}},['file_path','limit']),
  tool('check',{target:{type:'string'},enabled:{type:'boolean'}},['target','enabled'])]});
const field=(name:string,value:string,string=true)=>`<｜｜DSML｜｜ parameter name="${name}" string="${string}">${value}</｜｜DSML｜｜ parameter>`;
const invoke=(name:string,fields:string)=>`<｜｜DSML｜｜ invoke name="${name}">${fields}</｜｜DSML｜｜ invoke>`;
const root=(body:string)=>`<｜｜DSML｜｜ calls>${body}</｜｜DSML｜｜ calls>`;
const read=invoke('read',field('file_path','synthetic-a')+field('limit','3',false));
test('duplicate description, path and justification are deduplicated only when values are exactly equal',()=>{
  for(const name of ['description','file_path','justification']){
    const value='synthetic value';const source=root(invoke('read',field('file_path',name==='file_path'?value:'synthetic-a')+field('limit','3',false)+(name==='file_path'?'':field(name,value))+field(name,value)));
    const repairs:DecisionRepair[]=[];const d=parseDecision(source,request,r=>repairs.push(r));assert.equal(d.kind,'tool_call');assert.ok(repairs.some(r=>r.kind==='identical_parameter'));
    const at=source.lastIndexOf(value);assert.throws(()=>parseDecision(source.slice(0,at)+value+' changed'+source.slice(at+value.length),request));
  }
});
test('unwrapped arguments identify exactly one complete schema including numeric and boolean fields',()=>{
  const args=field('file_path','synthetic-b')+field('limit','4',false)+'</｜｜DSML｜｜ invoke>';
  const d=parseDecision(root(read+args),request);assert.equal(d.kind,'tool_calls');if(d.kind==='tool_calls')assert.deepEqual(d.calls.map(c=>c.arguments),[{file_path:'synthetic-a',limit:3},{file_path:'synthetic-b',limit:4}]);
  const ambiguous={...request,tools:[...request.tools!,tool('other_read',{file_path:{type:'string'},limit:{type:'integer'}},['file_path','limit'])]};assert.throws(()=>parseDecision(root(read+args),ambiguous),/unique/);
  assert.throws(()=>parseDecision(root(read+args.replace('>4<','>0<')),request));
  const bool=parseDecision(root(field('target','synthetic')+field('enabled','true',false)+'</｜｜DSML｜｜ invoke>'),request);assert.equal(bool.kind,'tool_call');
});
test('missing marker bars are normalized only at complete structural boundaries and preserve opaque JSON',()=>{
  const source=root(read).replaceAll('<｜｜DSML｜｜','<｜DSML｜｜').replaceAll('</｜｜DSML｜｜','</｜DSML｜｜');assert.equal(parseDecision(source,request).kind,'tool_call');
  const literal='literal <｜DSML｜｜ calls> text';const encoded=root(invoke('read',field('arguments',JSON.stringify({file_path:literal,limit:3}),false))).replace('<｜｜DSML｜｜ calls>','<｜DSML｜｜ calls>');
  const result=parseDecision(encoded,request);assert.equal(result.kind,'tool_call');if(result.kind==='tool_call')assert.equal(result.arguments.file_path,literal);
  assert.throws(()=>parseDecision(source.slice(0,-4),request));
});
test('adjacent complete JSON and DSML keep every invocation and enforce serial requests on the combined batch',()=>{
  const json=JSON.stringify({kind:'tool_call',name:'check',arguments:{target:'synthetic',enabled:true}});
  for(const source of [json+'\n'+root(read),root(read)+'\n'+json]){
    const decision=parseDecision(source,request);assert.equal(decision.kind,'tool_calls');if(decision.kind==='tool_calls')assert.equal(decision.calls.length,2);
    assert.throws(()=>parseDecision(source,{...request,parallel_tool_calls:false}),/only one/);
    assert.throws(()=>parseDecision(source+'extra',request));
  }
  assert.throws(()=>parseDecision(json.slice(0,-1)+root(read),request));
});
test('a single redundant root closer requires an otherwise complete valid tool batch',()=>{
  const json=JSON.stringify({kind:'tool_calls',calls:[{name:'read',arguments:{file_path:'synthetic',limit:2}}]});assert.equal(parseDecision(json+'}',request).kind,'tool_calls');
  for(const source of [json+'} extra',json+'}'+json,json.slice(0,-3)+'}',json.replace('"limit":2','"limit":0')+'}'])assert.throws(()=>parseDecision(source,request));
});
