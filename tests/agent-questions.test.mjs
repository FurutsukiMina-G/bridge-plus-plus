import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {WebSocketServer} from 'ws';
import {DshHost,dshQuestionAnswers,dshQuestionRejection} from '../app/services/dsh-host.mjs';
import {DshAdapter} from '../app/runtimes/dsh.mjs';
import {KimiAcpAdapter,kimiElicitationQuestions,kimiElicitationResult} from '../app/runtimes/kimi-acp.mjs';
import {CodexAppServerAdapter,codexUserInputQuestions,codexUserInputResult,codexApprovalResult} from '../app/runtimes/codex.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(predicate,timeout=3000){const start=Date.now();while(Date.now()-start<timeout){const value=predicate();if(value)return value;await sleep(10);}throw new Error('waitFor timed out');}
const EXPIRED=/\u8fc7\u671f/;

test('dshQuestionAnswers maps items by id with skips, custom answers and invalid labels',()=>{
  const questions=[{id:'q1',question:'Pick',options:[{label:'A'},{label:'B'}],multiSelect:true},{id:'q2',question:'Free',options:[{label:'X'}]}];
  assert.deepEqual(dshQuestionAnswers(questions,{items:[{id:'q1',question:'Pick',selected:['A','zzz']},{id:'q2',question:'Free',selected:[],custom:'note'}]}),[{id:'q1',selected:['A'],custom:'zzz'},{id:'q2',selected:[],custom:'note'}]);
  assert.deepEqual(dshQuestionAnswers(questions,{items:[{id:'q1',selected:[],skipped:true}]}),[{id:'q1',selected:[]},{id:'q2',selected:[]}]);
  assert.deepEqual(dshQuestionRejection(),{kind:'rejected',error:{name:'UserQuestionError',code:'ASK_CANCELLED',message:'the user cancelled ask_user_question'}});
});

test('DSH question frames become question events with answers, reject, cancel and error isolation',async t=>{
  const requests=[],server=createServer(async(req,res)=>{let raw='';for await(const b of req)raw+=b;requests.push({url:req.url,...JSON.parse(raw)});res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({result:{ok:true,value:{}}}));});
  const wss=new WebSocketServer({server});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const host=new DshHost({},{});host.origin='http://127.0.0.1:'+server.address().port;host.cookie='synthetic=1';host.ready=async()=>host;
  let peer,streamId,throwOnQuestion=false;
  wss.on('connection',socket=>{peer=socket;socket.on('message',bytes=>{const m=JSON.parse(bytes);streamId=m.streamId;socket.send(JSON.stringify({type:'item',streamId,value:{type:'ready',clientId:'client',host:{home:'fixture'}}}));});});
  const events=[],streamErrors=[];
  const adapter=new DshAdapter({host,permissionMode:'auto-review',session:{selection:{}},emit:async e=>{events.push(e);if(e.type==='question'&&throwOnQuestion){throwOnQuestion=false;throw new Error('boom');}}});
  adapter.ready=true;adapter.running=true;
  const stream=await host.followApprovals('native',e=>adapter.emit(e),(id,choice)=>adapter.emit({type:'approval-resolved',approvalId:id,...choice?{choice}:{}}),e=>streamErrors.push(e));
  adapter.approvalStream=stream;
  t.after(async()=>{stream.stop();for(const c of wss.clients)c.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));});
  const send=value=>peer.send(JSON.stringify({type:'item',streamId,value}));
  const questions=[{id:'q1',question:'Pick',options:[{label:'A'},{label:'B'}],multiSelect:true},{id:'q2',question:'Free',options:[{label:'X'}]}];
  send({type:'waterfall',event:'user-questions/request',eventId:'e1',agentId:'native',request:{questions}});
  const event=await waitFor(()=>events.find(e=>e.type==='question'&&e.approvalId==='dsh:question:e1'));
  assert.equal(event.name,'ask_user_question');assert.deepEqual(event.data,{questions});assert.equal(event.choices,undefined);
  await adapter.approve('dsh:question:e1','approve',{items:[{id:'q1',question:'Pick',selected:['A','zzz']},{id:'q2',question:'Free',selected:[],custom:'note'}]});
  const call1=await waitFor(()=>requests.find(r=>r.method==='$events/result'&&r.payload.args.eventId==='e1'));
  assert.equal(call1.url,'/api/$events/result');
  assert.deepEqual(call1.payload.args,{clientId:'client',eventId:'e1',outcome:{kind:'result',value:{answers:[{id:'q1',selected:['A'],custom:'zzz'},{id:'q2',selected:[],custom:'note'}]}}});
  await assert.rejects(adapter.approve('dsh:question:e1','approve'),EXPIRED);
  send({type:'waterfall',event:'user-questions/request',eventId:'e2',agentId:'native',request:{questions}});
  await waitFor(()=>events.some(e=>e.type==='question'&&e.approvalId==='dsh:question:e2'));
  await adapter.approve('dsh:question:e2','reject');
  const call2=await waitFor(()=>requests.find(r=>r.method==='$events/result'&&r.payload.args.eventId==='e2'));
  assert.deepEqual(call2.payload.args.outcome,dshQuestionRejection());
  send({type:'waterfall',event:'user-questions/request',eventId:'e3',agentId:'native',request:{questions}});
  await waitFor(()=>events.some(e=>e.type==='question'&&e.approvalId==='dsh:question:e3'));
  send({type:'cancel',eventId:'e3'});
  await waitFor(()=>events.find(e=>e.type==='approval-resolved'&&e.approvalId==='dsh:question:e3'&&e.choice==='expired'));
  await assert.rejects(adapter.approve('dsh:question:e3','approve'),EXPIRED);
  throwOnQuestion=true;
  send({type:'waterfall',event:'user-questions/request',eventId:'e4',agentId:'native',request:{questions}});
  const call4=await waitFor(()=>requests.find(r=>r.payload.args.eventId==='e4'));
  assert.equal(call4.payload.args.outcome.kind,'rejected');
  send({type:'waterfall',event:'approval/request',eventId:'e5',agentId:'native',request:{toolName:'shell',reason:'tool write'}});
  await waitFor(()=>events.find(e=>e.type==='approval'&&e.approvalId==='dsh:remote:e5'));
  await adapter.approve('dsh:remote:e5','approve');
  const call5=await waitFor(()=>requests.find(r=>r.method==='$events/result'&&r.payload.args.eventId==='e5'));
  assert.deepEqual(call5.payload.args.outcome,{kind:'result',value:'allowed-once'});
  send({type:'waterfall',event:'user-questions/request',eventId:'e6',agentId:'other-agent',request:{questions}});
  const call6=await waitFor(()=>requests.find(r=>r.payload.args.eventId==='e6'));
  assert.deepEqual(call6.payload.args.outcome,{kind:'next'});
  send({type:'waterfall',event:'user-questions/request',eventId:'e7',agentId:'native',request:{questions}});
  await waitFor(()=>events.some(e=>e.type==='question'&&e.approvalId==='dsh:question:e7'));
  await adapter.approve('dsh:question:e7','approve',{answers:[{id:'q1',selected:['A']}]});
  const call7=await waitFor(()=>requests.find(r=>r.payload.args.eventId==='e7'));
  // The raw-JSON dialog answers with the native array itself, without items.
  assert.deepEqual(call7.payload.args.outcome,{kind:'result',value:{answers:[{id:'q1',selected:['A']}]}});
  assert.equal(streamErrors.length,0);
});

function kimiFixture(permissionMode='default'){
  const events=[],responses=[];
  const adapter=new KimiAcpAdapter({permissionMode,session:{selection:{}},emit:async e=>events.push(e)});
  adapter.rpc={respond:(id,result)=>responses.push({id,result}),reject:(id,message)=>responses.push({id,rejected:message})};
  return {adapter,events,responses};
}

test('Kimi elicitation/create surfaces as a question event and answers convert to accept content',async()=>{
  const {adapter,events,responses}=kimiFixture();
  const params={message:'Pick one\nPick many',requestedSchema:{properties:{
    q0:{type:'string',title:'Single',oneOf:[{const:'A',description:'first'},{const:'B'}]},
    q1:{type:'array',items:{anyOf:[{const:'a'},{const:'b'}]}}
  }}};
  await adapter.message({id:7,method:'elicitation/create',params});
  const event=events.at(-1);
  assert.equal(event.type,'question');assert.equal(event.name,'ask_user_question');
  assert.deepEqual(event.data.questions,[
    {id:'q0',question:'Pick one',header:'Single',options:[{label:'A',description:'first'},{label:'B'}],multiSelect:false,allowCustom:false},
    {id:'q1',question:'Pick many',options:[{label:'a'},{label:'b'}],multiSelect:true,allowCustom:false}
  ]);
  await adapter.approve(event.approvalId,'approve',{items:[{id:'q0',selected:['A']},{id:'q1',selected:['b','a']}]});
  assert.deepEqual(responses,[{id:7,result:{action:'accept',content:{q0:'A',q1:['b','a']}}}]);
  await assert.rejects(adapter.approve(event.approvalId,'approve'),EXPIRED);
});

test('Kimi elicitation reject and unknown selections decline',async()=>{
  const schema={message:'Pick',requestedSchema:{properties:{q0:{type:'string',oneOf:[{const:'A'}]}}}};
  const first=kimiFixture();
  await first.adapter.message({id:8,method:'elicitation/create',params:schema});
  await first.adapter.approve(first.events.at(-1).approvalId,'reject');
  assert.deepEqual(first.responses.at(-1),{id:8,result:{action:'decline'}});
  const second=kimiFixture();
  await second.adapter.message({id:9,method:'elicitation/create',params:schema});
  await second.adapter.approve(second.events.at(-1).approvalId,'approve',{items:[{id:'q0',selected:['Z']}]});
  assert.deepEqual(second.responses.at(-1),{id:9,result:{action:'decline'}});
});

test('Kimi AskUserQuestion permission fallback becomes a question with optionId mapping',async()=>{
  const {adapter,events,responses}=kimiFixture();
  const params={toolCall:{title:'AskUserQuestion',content:[{type:'text',text:'Pick one'}]},options:[
    {optionId:'q0_opt_0',kind:'allow_once',name:'A'},
    {optionId:'q0_opt_1',kind:'allow_once',name:'B'},
    {optionId:'q0_skip',kind:'reject_once',name:'Skip'}
  ]};
  await adapter.message({id:11,method:'session/request_permission',params});
  const event=events.at(-1);
  assert.equal(event.type,'question');assert.equal(event.name,'ask_user_question');
  assert.deepEqual(event.data,{questions:[{id:'q0',question:'Pick one',options:[{label:'A'},{label:'B'}],allowCustom:false}]});
  await adapter.approve(event.approvalId,'approve',{items:[{id:'q0',selected:['B']}]});
  assert.deepEqual(responses.at(-1),{id:11,result:{outcome:{outcome:'selected',optionId:'q0_opt_1'}}});
  await adapter.message({id:12,method:'session/request_permission',params});
  await adapter.approve(events.filter(e=>e.type==='question').at(-1).approvalId,'reject');
  assert.deepEqual(responses.at(-1),{id:12,result:{outcome:{outcome:'selected',optionId:'q0_skip'}}});
  await adapter.message({id:13,method:'session/request_permission',params});
  await adapter.approve(events.filter(e=>e.type==='question').at(-1).approvalId,'approve',{items:[{id:'q0',selected:['unknown']}]});
  assert.deepEqual(responses.at(-1),{id:13,result:{outcome:{outcome:'cancelled'}}});
  await adapter.message({id:14,method:'session/request_permission',params:{toolCall:{title:'shell'},options:[{optionId:'o1',kind:'allow_once',name:'allow'},{optionId:'o2',kind:'reject_once',name:'deny'}]}});
  const approval=events.at(-1);
  assert.equal(approval.type,'approval');
  await adapter.approve(approval.approvalId,'reject');
  assert.deepEqual(responses.at(-1),{id:14,result:{outcome:{outcome:'selected',optionId:'o2'}}});
});

test('Codex requestUserInput converts data and answers to the native shape',async()=>{
  const params={threadId:'t',turnId:'u',itemId:'i',isBlocking:true,questions:[
    {id:'q1',header:'Choice',question:'Pick?',isOther:true,options:[{label:'A',description:'first'},{label:'B',description:''}]},
    {id:'q2',header:'Secret',question:'Token?',isSecret:true}
  ]};
  const events=[],responses=[];
  const adapter=new CodexAppServerAdapter({session:{selection:{}},emit:async e=>events.push(e)});
  adapter.rpc={respond:(id,result)=>responses.push({id,result}),reject:(id,message)=>responses.push({id,rejected:message})};
  await adapter.message({id:3,method:'item/tool/requestUserInput',params});
  const event=events.at(-1);
  assert.equal(event.type,'question');assert.equal(event.name,'ask_user_question');
  assert.equal(event.data.itemId,'i');assert.equal(event.data.isBlocking,true);
  assert.deepEqual(event.data.questions,[
    {id:'q1',question:'Pick?',header:'Choice',options:[{label:'A',description:'first'},{label:'B'}],allowCustom:true},
    {id:'q2',question:'Token?',header:'Secret',allowCustom:true,secret:true}
  ]);
  const answer={items:[{id:'q1',question:'Pick?',selected:['A'],custom:'other'},{id:'q2',question:'Token?',selected:[],custom:'s3cret'}]};
  await adapter.approve(event.approvalId,'approve',answer);
  assert.deepEqual(responses,[{id:3,result:{answers:{q1:{answers:['A','other']},q2:{answers:['s3cret']}}}}]);
  await adapter.message({id:4,method:'tool/requestUserInput',params});
  const second=events.filter(e=>e.type==='question').at(-1);
  await adapter.approve(second.approvalId,'reject');
  assert.deepEqual(responses.at(-1),{id:4,result:{answers:{}}});
  assert.deepEqual(codexApprovalResult({method:'item/tool/requestUserInput',params},'approve-session',answer),{answers:{q1:{answers:['A','other']},q2:{answers:['s3cret']}}});
  assert.deepEqual(codexUserInputResult(params,'reject'),{answers:{}});
});

test('Codex free-text questions stay answerable and the raw JSON dialog passes native answers through',()=>{
  const params={questions:[{id:'f1',question:'Free?',options:null},{id:'f2',question:'Any?',isOther:false,options:[]}]};
  assert.deepEqual(codexUserInputQuestions(params),[{id:'f1',question:'Free?',allowCustom:true},{id:'f2',question:'Any?',allowCustom:true}]);
  assert.deepEqual(codexUserInputResult(params,'approve',{items:[{id:'f1',selected:[],custom:'typed'}]}),{answers:{f1:{answers:['typed']},f2:{answers:[]}}});
  assert.deepEqual(codexUserInputResult(params,'approve',{answers:{f1:{answers:['x']}}}),{answers:{f1:{answers:['x']}}});
  assert.deepEqual(codexUserInputResult(params,'approve',{f2:{answers:['y']}}),{answers:{f2:{answers:['y']}}});
});

test('Kimi elicitation offers 是/否 buttons for booleans, converts typed truth words and leaves the rest unanswered',async()=>{
  const params={message:'Name\nCount\nSteps\nFlag',requestedSchema:{properties:{q0:{type:'string'},q1:{type:'number'},q2:{type:'integer'},q3:{type:'boolean'}}}};
  const {adapter,events,responses}=kimiFixture();
  await adapter.message({id:21,method:'elicitation/create',params});
  const event=events.at(-1);assert.equal(event.type,'question');
  assert.deepEqual(event.data.questions,[
    {id:'q0',question:'Name',multiSelect:false,allowCustom:true},
    {id:'q1',question:'Count',multiSelect:false,allowCustom:true},
    {id:'q2',question:'Steps',multiSelect:false,allowCustom:true},
    {id:'q3',question:'Flag',options:[{label:'是'},{label:'否'}],multiSelect:false,allowCustom:true}
  ]);
  await adapter.approve(event.approvalId,'approve',{items:[{id:'q0',selected:[],custom:'Ada'},{id:'q1',selected:[],custom:'4.5'},{id:'q2',selected:[],custom:'3'},{id:'q3',selected:[],custom:'是'}]});
  assert.deepEqual(responses.at(-1),{id:21,result:{action:'accept',content:{q0:'Ada',q1:4.5,q2:3,q3:true}}});
  const questions=kimiElicitationQuestions(params),properties=params.requestedSchema.properties;
  assert.deepEqual(kimiElicitationResult(questions,'approve',{items:[{id:'q3',selected:['是']}]},properties),{action:'accept',content:{q3:true}});
  assert.deepEqual(kimiElicitationResult(questions,'approve',{items:[{id:'q3',selected:['否']}]},properties),{action:'accept',content:{q3:false}});
  assert.deepEqual(kimiElicitationResult(questions,'approve',{items:[{id:'q3',selected:[],custom:'否'}]},properties),{action:'accept',content:{q3:false}});
  for(const [typed,value]of[[' YES ',true],['no',false],['y',true],['N',false],['TRUE',true],['False',false],['1',true],['0',false],['对',true],['错',false]])
    assert.deepEqual(kimiElicitationResult(questions,'approve',{items:[{id:'q3',selected:[],custom:typed}]},properties),{action:'accept',content:{q3:value}});
  // An unrecognized boolean answer is treated as skipped, never forwarded to Kimi as a string.
  assert.deepEqual(kimiElicitationResult(questions,'approve',{items:[{id:'q3',selected:[],custom:'也许吧'}]},properties),{action:'decline'});
  assert.deepEqual(kimiElicitationResult(questions,'approve',{items:[{id:'q3',selected:['不是这个']}]},properties),{action:'decline'});
  assert.deepEqual(kimiElicitationResult(questions,'approve',{items:[{id:'q0',selected:[],custom:'Ada'},{id:'q3',selected:[],custom:'也许吧'}]},properties),{action:'accept',content:{q0:'Ada'}});
  assert.deepEqual(kimiElicitationResult(questions,'approve',{items:[{id:'q2',selected:[],custom:'3.5'}]},properties),{action:'decline'});
  assert.deepEqual(kimiElicitationResult(questions,'approve',{items:[{id:'q1',selected:[],custom:'abc'}]},properties),{action:'decline'});
  assert.deepEqual(kimiElicitationResult(questions,'approve',{items:[{id:'q0',selected:[],custom:'Ada'},{id:'q1',selected:[],skipped:true}]},properties),{action:'accept',content:{q0:'Ada'}});
  assert.deepEqual(kimiElicitationResult(questions,'approve',{items:[{id:'q0',selected:[],skipped:true}]},properties),{action:'decline'});
  assert.deepEqual(kimiElicitationResult(questions,'approve',{content:{q0:'Ada',q2:7}}),{action:'accept',content:{q0:'Ada',q2:7}});
  assert.deepEqual(kimiElicitationResult(questions,'approve',{content:{}}),{action:'decline'});
});

test('Kimi AskUserQuestion maps any option naming and skips when nothing can be shown',async()=>{
  const {adapter,events,responses}=kimiFixture();
  const params={toolCall:{title:'AskUserQuestion',content:[{type:'text',text:'Deploy?'}]},options:[
    {optionId:'opt-a',kind:'allow_once',name:'Yes'},
    {optionId:'opt-b',kind:'allow_always',name:'Always'},
    {optionId:'skip-1',kind:'reject_once',name:'Skip'}
  ]};
  await adapter.message({id:31,method:'session/request_permission',params});
  const event=events.at(-1);
  assert.equal(event.type,'question');
  assert.deepEqual(event.data,{questions:[{id:'q0',question:'Deploy?',options:[{label:'Yes'},{label:'Always'}],allowCustom:false}]});
  await adapter.approve(event.approvalId,'approve',{items:[{id:'q0',selected:['Always']}]});
  assert.deepEqual(responses.at(-1),{id:31,result:{outcome:{outcome:'selected',optionId:'opt-b'}}});
  await adapter.message({id:32,method:'session/request_permission',params:{toolCall:{title:'AskUserQuestion'},options:[{optionId:'skip-1',kind:'reject_once',name:'Skip'}]}});
  const skipped=events.at(-1);
  assert.equal(skipped.type,'notice');assert.match(skipped.text,/按跳过处理/);
  assert.deepEqual(responses.at(-1),{id:32,result:{outcome:{outcome:'selected',optionId:'skip-1'}}});
  await adapter.message({id:33,method:'session/request_permission',params:{toolCall:{title:'AskUserQuestion',content:[]},options:[]}});
  assert.equal(events.at(-1).type,'notice');
  assert.deepEqual(responses.at(-1),{id:33,result:{outcome:{outcome:'cancelled'}}});
});

test('DSH single-choice questions replace the picked option with typed text',()=>{
  const single=[{id:'q1',question:'Pick',options:[{label:'A'},{label:'B'}]}],multi=[{id:'q1',question:'Pick',options:[{label:'A'},{label:'B'}],multiSelect:true}];
  assert.deepEqual(dshQuestionAnswers(single,{items:[{id:'q1',selected:['A'],custom:'typed'}]}),[{id:'q1',selected:[],custom:'typed'}]);
  assert.deepEqual(dshQuestionAnswers(multi,{items:[{id:'q1',selected:['A'],custom:'more'}]}),[{id:'q1',selected:['A'],custom:'more'}]);
  // The raw-JSON dialog answers with the native array itself, without items.
  assert.deepEqual(dshQuestionAnswers(single,{answers:[{id:'q1',selected:['A']}]}),[{id:'q1',selected:['A']}]);
});
