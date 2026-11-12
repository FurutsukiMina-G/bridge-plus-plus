import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {config} from '../../bridges/workbuddy-bridge/src/config.mjs';
import {SdkTransport} from '../../bridges/workbuddy-bridge/src/sdk-transport.mjs';
import {HOST_BINDING} from '../../bridges/workbuddy-bridge/src/hold-tools.mjs';
import {Completion,sseEvents} from '../../bridges/workbuddy-bridge/src/protocol.mjs';
import {traceToolStep,traceFinal} from '../../bridges/workbuddy-bridge/tests/hold-real-trace.mjs';

// This double emits model events and invokes the real in-process MCP binding.
// It deliberately does not enforce schema, tool choice, batching or completion:
// those decisions must be made by the production bridge under test.
class HoldSession {
  constructor(options,onSend){Object.assign(this,{options,onSend,events:[],prompts:[],controllers:[],handlerResults:[],response:0,closed:false});this.binding=options.mcpServers.host[HOST_BINDING];}
  async connect(){this.listed=(await this.binding.listTools()).tools;}
  async getAvailableModes(){return [];}
  emit(message){this.events.push({session_id:'hold-fixture',...message});this.wake?.();}
  fail(error){this.events.push(error);this.wake?.();}
  async send(prompt){
    assert.equal(this.closed,false);this.prompts.push(prompt);
    this.emit({type:'system',subtype:'init',model:this.options.model,mcp_servers:[{name:'host',status:'connected'}]});
    await this.onSend(this,prompt,this.prompts.length);
  }
  async *stream(){for(;;){
    if(this.events.length){const message=this.events.shift();if(message instanceof Error)throw message;yield message;if(message.type==='result')return;}
    else if(this.closed)return;
    else await new Promise(resolve=>{this.wake=resolve;});
  }}
  final(text){
    // Empty/split assistant messages deliberately use IDs unlike message_start.
    traceFinal(this,text);
  }
  async toolStep(calls){
    await traceToolStep(this,calls);
    this.finishedHandlers=this.traceStepFinished.then(results=>{this.handlerResults=results;this.final('Complete fixture answer.');}).catch(error=>this.fail(error));
  }
  async interrupt(){for(const controller of this.controllers)controller.abort();this.emit({type:'result',subtype:'success',is_error:false});}
  close(){this.closed=true;for(const controller of this.controllers)controller.abort();this.wake?.();}
}

export async function holdFixture(t,hostConfig,onSend,overrides={}){
  await mkdir('.runtime/tests',{recursive:true});const runtime=await mkdtemp(resolve('.runtime/tests/workbuddy-hold-')),sessions=[];
  // Read the actual default mode without inspecting any login candidate.
  const defaults=config({WORKBUDDY_AUTH_FILE:'synthetic-never-read'});assert.equal(defaults.toolMode,'native');
  const transport=new SdkTransport({...defaults,...hostConfig,runtime,cliPath:process.execPath,prewarmMs:0,timeoutMs:5000,...overrides},
    {get:async()=>({accessToken:'synthetic-fixture',uid:'fixture',domain:'test.invalid'})},
    {run:()=>assert.fail('Default hold must not fall back to the replay query'),createSession:options=>{const session=new HoldSession(options,onSend);sessions.push(session);return session;}});
  t.after(()=>transport.close());
  return {transport,sessions,chat:body=>transport.chat(body,new AbortController().signal)};
}

export async function collectHold(response,tools){
  const completion=new Completion('fixture'),events=[];let wire='';
  for await(const data of sseEvents(response.body)){
    wire+=`data: ${data}\n\n`;
    if(data!=='[DONE]')events.push(JSON.parse(data));
    completion.accept(data,'fixture');
  }
  completion.validate(tools);return {wire,events,result:completion.result(),metrics:response.bridgeMetrics};
}
export function hostResults(body,message){return {...body,messages:[...body.messages,message,...message.tool_calls.map((call,index)=>({role:'tool',tool_call_id:call.id,content:`host-result-${index}`}))]};}
