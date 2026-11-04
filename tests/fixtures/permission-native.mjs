// Synthetic native protocol peer. No model, provider or user configuration.
import {createInterface} from 'node:readline';
const send=message=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',...message})+'\n');
let mode='default',settings;
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){
  const m=JSON.parse(line),p=m.params??{},result=value=>send({id:m.id,result:value});
  if(m.method==='initialize')result({protocolVersion:1,agentInfo:{name:'Synthetic fixture',version:'1'},...(process.env.BPP_TEST_MEDIA==='1'?{agentCapabilities:{promptCapabilities:{image:true,audio:false}}}:{})});
  else if(['thread/start','thread/resume'].includes(m.method)){
    settings={approvalPolicy:p.approvalPolicy,sandbox:{type:process.env.BPP_TEST_DOWNGRADE==='1'?'readOnly':p.sandbox==='read-only'?'readOnly':'workspaceWrite'},approvalsReviewer:p.approvalsReviewer};
    result({thread:{id:p.threadId??'fixture-native'},...settings});
  }else if(['session/new','session/resume'].includes(m.method))result({sessionId:p.sessionId??'fixture-native',modes:{currentModeId:mode,availableModes:['default','auto','yolo','plan'].filter(x=>x!==process.env.BPP_TEST_MISSING_MODE).map(id=>({id}))}});
  else if(m.method==='session/set_mode'){mode=p.modeId;result({});}
  else if(m.method==='session/prompt'){
    if(process.env.BPP_TEST_MEDIA==='1'){
      send({method:'session/update',params:{update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:JSON.stringify({prompt:p.prompt})}}}});
      const bytes=Buffer.alloc(5*1024*1024);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
      send({method:'session/update',params:{update:{sessionUpdate:'agent_message_chunk',content:{type:'image',mimeType:'image/png',data:bytes.toString('base64')}}}});
    }
    send({method:'session/update',params:{update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:JSON.stringify({mode})}}}});result({stopReason:'end_turn'});
  }else if(m.method==='turn/start'){
    if(process.env.BPP_TEST_MEDIA==='1'){
      send({method:'item/agentMessage/delta',params:{delta:JSON.stringify({input:p.input}),itemId:'media-input'}});
      const bytes=Buffer.alloc(5*1024*1024);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
      send({method:'item/completed',params:{item:{type:'imageGeneration',id:'media-output',result:bytes.toString('base64')}}});
    }
    result({turn:{id:'fixture-turn'}});send({method:'item/agentMessage/delta',params:{delta:JSON.stringify(settings),itemId:'fixture'}});send({method:'turn/completed',params:{turn:{status:'completed'}}});
  }else if(m.id!==undefined)result({});
}
