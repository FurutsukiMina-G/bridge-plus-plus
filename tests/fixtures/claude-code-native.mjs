import {createInterface} from 'node:readline';
const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
const textOf=m=>(m.message?.content??[]).filter(p=>p.type==='text').map(p=>p.text).join('\n');
const stream=(text,thinking)=>{send({type:'stream_event',event:{type:'content_block_delta',delta:{type:'thinking_delta',thinking}}});send({type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text}}});};
const result=(subtype='success')=>send({type:'result',subtype,is_error:subtype!=='success',result:subtype==='success'?'fixture done':'fixture interrupted',modelUsage:{'fixture-model':{contextWindow:900000}}});
let toolApproved=false,slow=false,steering=false,limit=false;
send({type:'system',subtype:'init',session_id:'fixture-native',claude_code_version:'fixture-1'});
createInterface({input:process.stdin}).on('line',line=>{
  const m=JSON.parse(line);
  if(m.type==='control_request'&&m.request.subtype==='initialize'){send({type:'control_response',response:{subtype:'success',request_id:m.request_id,response:{account:{tokenSource:'ANTHROPIC_AUTH_TOKEN'},claude_code_version:'fixture-1'}}});return;}
  if(m.type==='control_request'&&m.request.subtype==='interrupt'){send({type:'control_response',response:{subtype:'success',request_id:m.request_id,response:{still_queued:0}}});send({type:'system',subtype:'interrupt_ack',cancel_queued:!!m.request.cancel_queued});if(slow){slow=false;result('error_during_execution');}return;}
  if(m.type==='control_request'&&m.request.subtype==='cancel_async_message'){send({type:'system',subtype:'cancel_ack',cancelled:[m.request.message_uuid]});send({type:'control_response',response:{subtype:'success',request_id:m.request_id,response:{cancelled:[m.request.message_uuid]}}});return;}
  if(m.type==='control_request'&&m.request.subtype==='set_permission_mode'){send({type:'control_response',response:{subtype:'success',request_id:m.request_id,response:{mode:m.request.mode}}});return;}
  if(m.type==='control_response'){
    const response=m.response?.response;if(response?.behavior==='deny')send({type:'system',subtype:'deny_ack',message:response.message});if(response?.behavior==='allow'&&toolApproved){send({type:'user',message:{role:'user',content:[{type:'tool_result',tool_use_id:'tool-fixture',content:'fixture tool output',is_error:false}]}});result();}return;
  }
  if(m.type!=='user')return;const text=textOf(m);
  if(limit){limit=false;send({type:'command_lifecycle',command_uuid:m.uuid,state:'queued'});result('error_max_turns');return;}
  if(steering){steering=false;send({type:'command_lifecycle',command_uuid:m.uuid,state:'queued'});setTimeout(()=>{send({type:'command_lifecycle',command_uuid:m.uuid,state:'started'});send({type:'command_lifecycle',command_uuid:m.uuid,state:'completed'});result();},20);return;}
  if(text.includes('tool')){stream('fixture text','fixture thinking');send({type:'assistant',message:{role:'assistant',content:[{type:'text',text:'fixture text'},{type:'tool_use',id:'tool-fixture',name:'Write',input:{file_path:'fixture.txt'}}]}});send({type:'system',subtype:'task_started',tool_use_id:'tool-fixture',status:'running'});toolApproved=true;send({type:'control_request',request_id:'permission-fixture',request:{subtype:'can_use_tool',tool_name:'Write',display_name:'Write fixture',input:{file_path:'fixture.txt'},permission_suggestions:[{type:'setMode',mode:'acceptEdits',destination:'projectSettings'}],tool_use_id:'tool-fixture'}});return;}
  if(text.includes('ghost')){result();setTimeout(()=>{send({type:'system',subtype:'init',session_id:'fixture-native',claude_code_version:'fixture-1'});send({type:'control_request',request_id:'ghost-permission',request:{subtype:'can_use_tool',tool_name:'Write',display_name:'Ghost write',input:{file_path:'ghost.txt'},tool_use_id:'ghost-tool'}});},40);return;}
  if(text.includes('slow')){slow=true;return;}
  if(text.includes('limit')){limit=true;return;}
  if(text.includes('steer')){steering=true;return;}
  stream('plain reply','plain thinking');result();
});
