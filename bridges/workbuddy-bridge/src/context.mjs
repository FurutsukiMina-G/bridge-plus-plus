import {createHash,randomUUID} from 'node:crypto';
import {mkdir,rm,readdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {BridgeError} from './errors.mjs';
import {imageSource} from './media-input.mjs';
import {pruningThreshold,pruningAllowed,toolPrunedPrefix,historyReset} from './history-pruning.mjs';

export function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,stable(value[k])]));
  return value;
}
export const digest=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
export function evictionCandidate(records,scope){
  const rows=[...records],roots=new Set(),seen=new Set();
  for(const r of rows)if(r.bridgeScope!==undefined&&!seen.has(r.scope)){seen.add(r.scope);roots.add(r);}
  return rows.filter(r=>!r.busy&&!roots.has(r)).sort((a,b)=>Number(b.scope===scope)-Number(a.scope===scope)||a.touched-b.touched)[0];
}
// A host may tag stored message blocks with <acp tokens="..." type="text">m00001</acp> on later turns.
// Only that exact bookkeeping form at the start of a message is ignored; ordinary text is untouched.
export const stripAcp=text=>String(text).replace(/^(?:<acp\b[^>]*>m\d+<\/acp>\r?\n?)+/,'');
const historyDigest=m=>digest(typeof m?.content==='string'?{...m,content:stripAcp(m.content)}:m);
const historyEntry=m=>({key:historyDigest(m),role:m.role,...m.tool_call_id?{toolId:m.tool_call_id}:{},callIds:(m.tool_calls??[]).flatMap(c=>typeof c?.id==='string'?[c.id]:[])});
export function textContent(content){
  if(content==null)return '';
  if(typeof content==='string')return content;
  if(Array.isArray(content)&&content.some(p=>p?.type==='image_url')){for(const p of content)if(!imageSource(p)&&!(p?.type==='text'&&typeof p.text==='string'))throw new BridgeError(400,'unsupported_content','Unsupported media content');return content;}
  if(Array.isArray(content)&&content.every(p=>p?.type==='text'&&typeof p.text==='string'))return content.map(p=>p.text).join('\n');
  throw new BridgeError(400,'unsupported_content','Only text message content is supported');
}
export function semanticMessages(messages){return messages.map(m=>({role:m.role,content:textContent(m.content),
  ...(m.name!==undefined?{name:m.name}:{}),...(m.tool_call_id!==undefined?{tool_call_id:m.tool_call_id}:{}),
  ...(m.tool_calls!==undefined?{tool_calls:Array.isArray(m.tool_calls)?m.tool_calls.map(call=>{
    const args=call?.function?.arguments;if(typeof args!=='string')return call;
    try{return {...call,function:{...call.function,arguments:JSON.stringify(stable(JSON.parse(args)))}};}catch{return call;}
  }):m.tool_calls}:{}),
}));}
export async function abortable(promise,signal){
  signal.throwIfAborted();let abort;
  try{return await Promise.race([promise,new Promise((_,reject)=>{abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});})]);}
  finally{signal.removeEventListener('abort',abort);}
}
/** Resume transcripts, never authenticated idle processes. Store hashes of host history. */
export class ContextPool {
  constructor(cfg){pruningThreshold(cfg.prunedHistoryReuseRatio);this.cfg=cfg;this.records=new Map();this.clients=new Map();this.tools=new Map();this.locks=new Map();this.pendingCleanup=new Set();this.closed=false;
    this.cleanup=this.sweepOrphans();this.timer=setInterval(()=>{void this.sweep();void this.sweepOrphans();},60000);this.timer.unref();}
  async sweepOrphans(){
    const parent=join(this.cfg.runtime,'sdk');const entries=await readdir(parent,{withFileTypes:true}).catch(()=>[]);
    for(const entry of entries){
      if(!entry.isDirectory()||!/^[-0-9a-f]{36}$/.test(entry.name)||this.records.has(entry.name))continue;
      const dir=join(parent,entry.name);let owner;try{owner=JSON.parse(await readFile(join(dir,'.bridge-owner.json'),'utf8'));}catch{continue;}
      if(!Number.isSafeInteger(owner.pid)||owner.pid<=0)continue;
      try{process.kill(owner.pid,0);}catch(error){if(error.code==='ESRCH')await this.remove({id:entry.name,dir});}
    }
  }
  stats(){return {sessions:this.records.size,locks:this.locks.size,mode:'sdk-resume',idleMs:this.cfg.sessionIdleMs??3600000,maxSessions:this.cfg.maxSessions??8};}
  async remove(record){
    this.records.delete(record.id);for(const map of [this.clients,this.tools])for(const [k,v]of map)if(v===record.id)map.delete(k);
    this.onRemove?.(record);
    const parent=resolve(this.cfg.runtime,'sdk'),inside=relative(parent,resolve(record.dir));
    if(!inside||inside.startsWith('..')||isAbsolute(inside))return;
    const clean=()=>rm(record.dir,{recursive:true,force:true}).catch(()=>{});
    await clean();const timer=setTimeout(()=>{this.pendingCleanup.delete(timer);void clean();},10000);timer.unref();this.pendingCleanup.add(timer);
  }
  async sweep(){for(const r of this.records.values())if(!r.busy&&Date.now()-r.touched>(this.cfg.sessionIdleMs??3600000))await this.remove(r);}
  async acquire(body,credential,signal,{mode='json'}={}){
    await this.cleanup;
    if(this.closed)throw new BridgeError(503,'shutting_down','Context pool closed');
    // Native and JSON transcripts record host calls differently, so they never share a session.
    const scoped=typeof body.bridge_scope==='string';
    const scope=digest({model:body.model,publicModel:body.bridge_public_model,nativeContextWindow:body.bridge_native_context_window,...scoped?{bridgeScope:body.bridge_scope}:{effort:body.reasoning_effort,max:body.max_tokens},uid:credential.uid,domain:credential.domain,...(mode==='json'?{}:{mode})});
    const messages=semanticMessages(body.messages),entries=messages.map(historyEntry),hashes=entries.map(e=>e.key),requestHash=digest({...body,messages,stream:undefined,stream_options:undefined});
    const threshold=pruningThreshold(this.cfg.prunedHistoryReuseRatio);
    const prunedMatch=r=>r.historyEntries&&toolPrunedPrefix(r.historyEntries,entries);
    const canPrune=r=>pruningAllowed(r.contextUsageRatio,threshold)&&prunedMatch(r);
    const resetFor=r=>{
      const reset=historyReset(r.historyEntries??r.history.map(key=>({key,role:'unknown'})),entries),pruned=prunedMatch(r);
      return reset?{...reset,...pruned?{prune_reuse_rejected:threshold===0?'disabled':r.contextUsageRatio==null?'context_usage_unknown':'context_usage_high',context_usage_ratio:r.contextUsageRatio??null,threshold}:{}}:null;
    };
    const client=!scoped&&body.prompt_cache_key?scope+':'+digest(body.prompt_cache_key):null;
    let owner=client?this.clients.get(client):undefined;
    if(!client&&!scoped)for(const m of [...messages].reverse()){
      const ids=[m.tool_call_id,...(m.tool_calls??[]).map(c=>c.id)].filter(Boolean);
      owner=ids.map(id=>this.tools.get(scope+':'+id)).find(Boolean);if(owner)break;
    }
    let diagnosticReset=null;
    if(scoped){
      const related=[...this.records.values()].filter(r=>r.scope===scope&&r.clientKey===body.prompt_cache_key&&!r.busy&&Date.now()-r.touched<(this.cfg.sessionIdleMs??3600000));
      const candidates=related.filter(r=>
        (r.requestHash===requestHash||r.history.length&&r.history.length<=hashes.length&&r.history.every((h,i)=>h===hashes[i]))&&Date.now()-r.touched<(this.cfg.sessionIdleMs??3600000)).sort((a,b)=>b.history.length-a.history.length);
      owner=candidates.length>1&&candidates[0].history.length===candidates[1].history.length?undefined:candidates[0]?.id;
      if(!candidates.length){const pruned=related.filter(canPrune);if(pruned.length===1)owner=pruned[0].id;}
      if(!owner){const scored=related.map(record=>({record,at:resetFor(record)?.first_changed_index??record.history.length})).sort((a,b)=>b.at-a.at);
        if(scored.length===1||scored[0]?.at>0&&scored[0]?.at!==scored[1]?.at)diagnosticReset=resetFor(scored[0].record);
      }
    }
    const lockKey=client??this.records.get(owner)?.lockKey??randomUUID();const prior=this.locks.get(lockKey)??Promise.resolve();let unlock;
    const gate=new Promise(r=>{unlock=r;});const tail=prior.then(()=>gate);this.locks.set(lockKey,tail);
    let owns=false,record=scoped?this.records.get(owner):undefined;
    if(record)record.busy=true; // reserve before yielding, so parallel branches get separate lanes
    const release=()=>{if(record){record.busy=false;record.touched=Date.now();}unlock();if(this.locks.get(lockKey)===tail)this.locks.delete(lockKey);};
    try{
      await abortable(prior,signal);owns=true;signal.throwIfAborted();
      if(this.closed)throw new BridgeError(503,'shutting_down','Context pool closed');
      if(client)owner=this.clients.get(client);
      record=this.records.get(owner);let reset=diagnosticReset,pruned=null;
      if(record){
        const same=record.requestHash===requestHash;
        const prefix=record.history.length<=hashes.length&&record.history.every((h,i)=>h===hashes[i]);
        if(!same&&!prefix)pruned=canPrune(record);
        if(record.scope!==scope||(!same&&!prefix&&!pruned)||Date.now()-record.touched>(this.cfg.sessionIdleMs??3600000)){
          reset=resetFor(record);
          await this.remove(record);record=null;
        }else if(!record.sessionId&&!same){await this.remove(record);record=null;reset={reason:'sdk_session_id_unavailable'};}
      }
      if(!record){
        await this.sweep();
        while(this.records.size>=(this.cfg.maxSessions??8)){
          const idle=evictionCandidate(this.records.values(),scope);
          if(!idle)throw new BridgeError(429,'sessions_busy','All context slots are active');await this.remove(idle);
        }
        const id=randomUUID();record={id,scope,bridgeScope:body.bridge_scope,lockKey,clientKey:body.prompt_cache_key,dir:join(this.cfg.runtime,'sdk',id),sessionId:null,history:[],toolSignature:null,touched:Date.now(),busy:true};
        this.records.set(id,record);
        try{await mkdir(record.dir,{recursive:true});await writeFile(join(record.dir,'.bridge-owner.json'),JSON.stringify({pid:process.pid}),{mode:0o600});}
        catch(error){await this.remove(record);throw error;}
        if(client)this.clients.set(client,id);
      }
      record.busy=true;
      const replay=record.requestHash===requestHash&&record.response&&Date.now()-record.completedAt<(this.cfg.replayMs??120000);
      const reused=!!record.sessionId&&!replay;
      // Native transcripts can omit calls or rewrite their IDs, so echo the exact batch the host received.
      const delta=reused?messages.slice(pruned?pruned.delta_start:record.history.length):messages;
      let echo=null,echoCharactersAvoided=0,nativeEcho={calls:0,characters:0,truncated:false};
      if(reused&&record.echo==='native'&&record.message?.tool_calls?.length){
        let truncated=false;
        const shorten=value=>{
          if(typeof value==='string'&&value.length>600){truncated=true;return `${value.slice(0,600)}…(shortened here; the host received all ${value.length} characters)`;}
          if(Array.isArray(value))return value.map(shorten);
          if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,shorten(item)]));
          return value;
        };
        // The bridge serialized these arguments itself; a parse failure still must not fail the request.
        const args=text=>{try{return shorten(JSON.parse(text));}catch{return shorten(String(text));}};
        const calls=record.message.tool_calls.map(c=>({id:c.id,name:c.function.name,received_input:args(c.function.arguments)}));
        const content='These are all calls from your preceding reply that the host actually received and executed. The runtime transcript may show only some of them, with different IDs, followed by Max turns (1) exceeded; that is only a host-handoff marker, not a limit on you. The tool results below correspond to these calls by ID. received_input is the host\'s receipt of each call, not the call format: write arguments directly as the tool schema\'s fields, never inside a wrapper key. If you intended more calls that are absent here, the host did not receive them; resend them now if needed, keeping independent calls in the same reply.';
        const render=detailed=>({role:'assistant',host_received_calls:calls.map((call,index)=>index<detailed?call:{id:call.id,name:call.name}),content});
        let detailed=calls.length;echo=render(detailed);
        while(JSON.stringify(echo).length>6000&&detailed>0){truncated=true;echo=render(--detailed);}
        nativeEcho={calls:calls.length,characters:JSON.stringify(echo).length,truncated};
      }else if(reused&&record.echo!==false&&record.message?.tool_calls?.length){
        echo={role:'assistant',prior_decision_calls:record.message.tool_calls.map(c=>({id:c.id,name:c.function.name,arguments_sha256:digest(c.function.arguments)})),content:'Host assigned these IDs to your preceding validated decision; arguments are unchanged. Only the following tool results describe execution.'};
        echoCharactersAvoided=JSON.stringify(record.message).length;
        if(JSON.stringify(echo).length<echoCharactersAvoided)echoCharactersAvoided-=JSON.stringify(echo).length;
        else{echo=record.message;echoCharactersAvoided=0;}
      }
      const toolSignature=digest(body.tools??[]),toolsReused=reused&&record.toolSignature===toolSignature;
      return {record,messages:echo?[echo,...delta]:delta,replay:replay?record.response:null,reused,toolsReused,
        metrics:{historyMode:reused?'delta':'full',sentMessageCount:delta.length,toolsReused,echoCharactersAvoided,nativeEcho,reset:reset?{...reset,firstChangedIndex:reset.first_changed_index,previousMessages:reset.previous_message_count,currentMessages:reset.current_message_count}:null,context_reset:reset,
          pruned_history_reuse:pruned?{removed_message_count:pruned.removed_message_count,removed_roles:pruned.removed_roles,context_usage_ratio:record.contextUsageRatio,threshold,native_retains_pruned_results:true}:null,localReplay:!!replay},
        commit:(response,message,{echo=true}={})=>{
          record.requestHash=requestHash;record.response=response;record.message=message;record.completedAt=Date.now();record.toolSignature=toolSignature;record.echo=echo;
          const assistant=historyEntry(semanticMessages([message])[0]);record.history=[...hashes,assistant.key];record.historyEntries=[...entries,assistant];
          for(const c of message.tool_calls??[])this.tools.set(scope+':'+c.id,record.id);
        },release,discard:()=>this.remove(record)};
    }catch(e){if(owns)release();else void prior.then(release);throw e;}
  }
  async close(){this.closed=true;clearInterval(this.timer);for(const r of [...this.records.values()])if(!r.busy)await this.remove(r);}
}
