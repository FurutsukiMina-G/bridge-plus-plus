import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SdkTransport} from '../src/sdk-transport.mjs';
import {HOST_BINDING} from '../src/hold-tools.mjs';
import {digest} from '../src/context.mjs';
export const model='deepseek-v4.1-flash';
export const credential={uid:'synthetic',domain:'test.invalid',accessToken:'synthetic-access'};
export const toolRequest=(tools=[{name:'Read',parameters:{type:'object',properties:{path:{type:'string'}},required:['path']},annotations:{readOnlyHint:true}}])=>({model,max_tokens:1000,prompt_cache_key:'test',messages:[{role:'user',content:'Inspect the file'}],tools:tools.map(tool=>({type:'function',function:tool,annotations:tool.annotations})),tool_choice:'auto'});
export function resultRequest(request,reply,results=[],trailing=[]){return {...request,messages:[...request.messages,{role:'assistant',content:reply.content||null,tool_calls:reply.calls.map(c=>({id:c.id,type:'function',function:{name:c.name,arguments:c.arguments}}))},...results.map((content,i)=>({role:'tool',tool_call_id:reply.calls[i].id,content})),...trailing]};}
export async function waitFor(check){for(let i=0;i<600;i++){if(check())return;await new Promise(r=>setTimeout(r,5));}throw new Error('Timed out waiting for fake session');}
export class FakeSession{
 constructor(options){this.options=options;this.binding=options.mcpServers.host[HOST_BINDING];this.prompts=[];this.events=[];this.handlers=[];this.controllers=[];this.response=0;this.closed=0;this.interrupts=0;}
 async connect(){this.listed=(await this.binding.listTools()).tools;await this.connectGate;}
 async getAvailableModes(){this.controlInitialized=true;return [];}
 async send(prompt){if(this.closed)throw new Error('closed fake');this.prompts.push({message:{content:prompt}});this.emit({type:'system',subtype:'init',model:this.options.model,mcp_servers:[{name:'host',status:'connected'}]});}
 emit(message){this.events.push({session_id:'fake-session',...message});this.wake?.();}
 async *stream(){for(;;){if(this.events.length){const m=this.events.shift();if(m instanceof Error)throw m;yield m;if(m.type==='result')return;continue;}if(this.closed)return;await new Promise(r=>{this.wake=r;});}}
 close(){if(this.closed)return;this.closed++;this.wake?.();for(const c of this.controllers)c.abort();}
 async interrupt(){this.interrupts++;for(const c of this.controllers)c.abort();this.result();}
 start(usage={input_tokens:100,output_tokens:5,cache_read_input_tokens:60,cache_creation_input_tokens:40}){const id='response-'+(++this.response);this.emit({type:'stream_event',event:{type:'message_start',message:{id,model,usage}}});return id;}
 async toolStep(calls,{serial=false,early=false,usage}={}){
   const id=this.start(usage),pending=[];
   const enter=call=>{const c=new AbortController();this.controllers.push(c);const p=this.binding.callTool(call.name,call.input,c.signal);this.handlers.push(p);pending.push(p);return p;};
   if(early)for(const call of calls)enter(call);
   for(const call of calls){this.emit({type:'stream_event',event:{type:'content_block_start',content_block:{type:'tool_use',id:call.id,name:call.name}}});this.emit({type:'assistant',uuid:call.id,message:{id,model,content:[{type:'tool_use',...call}]}});await this.options.hooks.PreToolUse[0].hooks[0]({tool_name:call.name,tool_use_id:call.id,tool_input:call.input});}
   this.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:'tool_use'},usage:usage??{input_tokens:100,output_tokens:5,cache_read_input_tokens:60,cache_creation_input_tokens:40}}});
   if(!early){if(serial){let prior=Promise.resolve();for(const call of calls){const next=prior.then(()=>enter(call));prior=next;}await new Promise(r=>setImmediate(r));}else for(const call of calls)enter(call);}
   return pending;
 }
 async post(calls){let result={};for(const call of calls)result=await this.options.hooks.PostToolUse[0].hooks[0]({tool_name:call.name,tool_input:call.input,tool_use_id:'runtime-uuid-'+call.id,tool_response:{}});return result;}
 result(){this.emit({type:'result',subtype:'success',is_error:false,usage:{input_tokens:999999,output_tokens:8888}});}
 final(text,{usage={input_tokens:200,output_tokens:7,cache_read_input_tokens:100,cache_creation_input_tokens:100},stop='end_turn',bare=false}={}){
   const id=this.start(usage);if(!bare)this.emit({type:'stream_event',event:{type:'content_block_delta',delta:{type:'text_delta',text}}});
   this.emit({type:'stream_event',event:{type:'message_delta',delta:{stop_reason:stop},usage}});
   this.emit({type:'assistant',uuid:id,message:{id,model,content:[{type:'text',text}],usage,stop_reason:stop}});this.result();
 }
}
export async function fixture(t,cfg={},configure=()=>{},Session=FakeSession){
 const runtime=await mkdtemp(join(tmpdir(),'wb-hold-')),sessions=[];
 const transport=new SdkTransport({runtime,cliPath:process.execPath,toolMode:'native',prewarmMs:0,timeoutMs:5000,...cfg},{get:async()=>credential},{run:()=>{throw new Error('Replay runtime forbidden in hold test');},createSession:options=>{const s=new Session(options);sessions.push(s);configure(s,sessions.length-1);return s;}});
 t.after(async()=>{await transport.close();await rm(runtime,{recursive:true,force:true});});
 const infer=(request,hooks={})=>transport.hold.infer({...request,_holdKey:digest({model:request.model,max:request.max_tokens,effort:request.reasoning_effort})},{runtimeContext:{body:request,credential},...hooks});
 return {transport,lane:transport.hold,sessions,infer};
}
