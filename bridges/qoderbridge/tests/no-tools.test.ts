import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {AddressInfo} from 'node:net';
import {ChatRequest,parseDecision,conversationPrompt} from '../src/compat.js';
import {createBridgeServer} from '../src/server.js';
import {decisionCorrectionPrompt} from '../src/decision-recovery.js';
import type {runProbe} from '../src/client.js';
const audit='{"risk":"low","decision":"allow"}';
const request=ChatRequest.parse({model:'qoder-deepseek-flash',messages:[{role:'system',content:'Synthetic approval classifier. Return the requested JSON.'},{role:'user',content:'Classify a synthetic read operation.'}],response_format:{type:'json_object'}});
for(const stream of [false,true])test(`no-tool audit returns its JSON with no correction, stream=${stream}`,async()=>{
  const dir=await mkdtemp(join(tmpdir(),'qoder-audit-'));let calls=0;
  const infer=(async()=>{calls++;return {response:audit,error:null,stage:'inference',result:'success'};}) as unknown as typeof runProbe;
  const server=await createBridgeServer({auth:'cli',timeout:5000,strategy:'permission',system:'Synthetic system'},{port:0,key:'fixture',infer,reportDir:dir});
  try{
    const r=await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/chat/completions`,{method:'POST',headers:{authorization:'Bearer fixture','content-type':'application/json'},body:JSON.stringify({...request,stream})});
    assert.equal(r.status,200);
    if(stream){const rows=(await r.text()).split('\n\n').filter(s=>s.startsWith('data: {')).map(s=>JSON.parse(s.slice(6)));assert.equal(rows.map(r=>r.choices?.[0]?.delta?.content??'').join(''),audit);}
    else assert.equal((await r.json()).choices[0].message.content,audit);
    assert.equal(calls,1);
  }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await rm(dir,{recursive:true,force:true});}
});
test('no-tool plain answers, legacy finals, disabled tools and schema rejection',()=>{
  assert.equal(parseDecision(' plain answer ',{...request,response_format:undefined}).kind,'final');
  assert.deepEqual(parseDecision(JSON.stringify({kind:'final',content:audit}),request),{kind:'final',content:audit});
  const disabled={...request,tools:[{type:'function' as const,function:{name:'read'}}],tool_choice:'none'};
  assert.deepEqual(parseDecision(audit,disabled),{kind:'final',content:audit});
  assert.throws(()=>parseDecision('{"kind":"tool_call","name":"read","arguments":{}}',disabled));
  assert.throws(()=>parseDecision(audit,{...request,response_format:{type:'json_schema',json_schema:{schema:{type:'object',required:['missing']}}}}));
  assert.doesNotMatch(conversationPrompt(disabled),/kind|tool_call/);
  assert.doesNotMatch(decisionCorrectionPrompt(request,'schema error',audit),/tool_call|read\/search|kind=/);
});
