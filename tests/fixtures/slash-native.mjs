// Offline peer: every prompt is echoed, no network or user configuration is used.
import {createInterface} from 'node:readline';
const kind=process.argv[2],send=value=>process.stdout.write(JSON.stringify(value)+'\n');let seq=0,goal=null;
const commands=[{name:'context',description:'Context',argumentHint:'[details]',aliases:['ctx']},{name:'code-review',description:'Review',aliases:['review']},{name:'compact',description:'Compact'},{name:'heapdump'},{name:'doctor',aliases:['checkup']},{name:'model'},{name:'clear',aliases:['reset','new']},{name:'config',aliases:['settings']}];
for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){
  const m=JSON.parse(line),p=m.params??{},reply=value=>send({id:m.id,result:value});
  if(kind==='antigravity'){send({event:'result',result:{status:'SUCCESS',conversation_id:'agy-native',response:m.message.content}});continue;}
  if(kind==='claude'){
    if(m.type==='control_request')send({type:'control_response',response:{subtype:'success',request_id:m.request_id,response:{account:{tokenSource:'ANTHROPIC_AUTH_TOKEN'},commands}}});
    if(m.type==='user'){
      const text=m.message.content[0].text;send({type:'system',subtype:'init',skills:['code-review'],terminal_slash_commands:['doctor']});
      if(text==='/compact')send({type:'system',subtype:'compact_boundary'});
      else send({type:'assistant',message:{model:'<synthetic>',content:[{type:'text',text}]},local_command_source:'context',local_command_run:true});
      send({type:'result',subtype:'success',num_turns:0,result:'fixture command done'});
    }continue;
  }
  if(m.method==='initialize')reply({agentInfo:{name:'Offline peer'},agentCapabilities:{promptCapabilities:{image:true}}});
  else if(['session/new','session/resume'].includes(m.method)){
    reply({sessionId:'kimi-native'});setTimeout(()=>send({method:'session/update',params:{sessionId:'kimi-native',update:{sessionUpdate:'available_commands_update',availableCommands:[{name:'status',description:'Status',input:{hint:'[detail]'}},{name:'skill:fixture',description:'Skill'},{name:'write-goal',description:'Skill'},{name:'model'},{name:'permission'}]}}}),10);
  }else if(m.method==='session/prompt'){
    send({method:'session/update',params:{update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:JSON.stringify(p.prompt)}}}});reply({stopReason:'end_turn'});
  }else if(['thread/start','thread/resume'].includes(m.method))reply({thread:{id:'codex-native'}});
  else if(m.method==='thread/compact/start'){
    reply({});const turnId='turn-'+ ++seq;send({method:'turn/started',params:{turn:{id:turnId}}});send({method:'item/completed',params:{item:{type:'contextCompaction',id:'compact-'+seq}}});send({method:'thread/compacted',params:{turnId}});send({method:'turn/completed',params:{turn:{id:turnId,status:'completed'}}});
  }else if(m.method==='review/start'||m.method==='turn/start'){
    const id='turn-'+ ++seq;reply({turn:{id}});send({method:'turn/started',params:{turn:{id}}});const text=JSON.stringify({method:m.method,...p});send({method:'item/agentMessage/delta',params:{itemId:id,delta:text}});send({method:'item/completed',params:{item:{type:'agentMessage',id,text}}});send({method:'turn/completed',params:{turn:{id,status:'completed'}}});
  }else if(m.method==='thread/goal/get')reply({goal});
  else if(m.method==='thread/goal/clear'){goal=null;reply({});}
  else if(m.method==='thread/goal/set'){goal={objective:p.objective,status:'active'};reply({goal});}
  else if(m.id!==undefined)reply({});
}
