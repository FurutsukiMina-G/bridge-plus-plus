/** A prompt source the SDK can start on before the host's next turn exists. */
export function promptQueue(){
  let resolve;const next=new Promise(r=>{resolve=r;});
  return {iterable:{async *[Symbol.asyncIterator](){const message=await next;if(message)yield message;}},push:message=>resolve(message),end:()=>resolve(null)};
}
export const userMessage=text=>({type:'user',session_id:'',message:{role:'user',content:text},parent_tool_use_id:null});
/** Spare capacity shared by the hold and replay transports. Active sessions do not use this quota. */
export class BlankWarmSlots {
  #entries=new Set();
  constructor(limit){this.limit=limit;}
  reserve(closeForOneShot){
    if(this.#entries.size>=this.limit&&!closeForOneShot){
      for(const entry of this.#entries)if(entry.closeForOneShot?.())break;
    }
    if(this.#entries.size>=this.limit)return null;
    const entry={closeForOneShot};this.#entries.add(entry);
    return ()=>{this.#entries.delete(entry);};
  }
}
/** Pre-started runtimes keyed by conversation or startup options. Only an exact match can claim one. */
export class WarmRuntimes {
  constructor({ttlMs=120000,max=4}={}){this.ttlMs=ttlMs;this.max=max;this.entries=new Map();this.stats={started:0,used:0,discarded:0,expired:0};}
  get size(){return this.entries.size;}
  start(key,fingerprint,create,{readyTimeoutMs,release,onExpire}={}){
    this.discard(key);
    if(!this.ttlMs||!this.max||this.entries.size>=this.max)return false;
    let handle;try{handle=create();}catch{return false;}
    const entry={fingerprint,handle,release};
    const expire=()=>{if(this.entries.get(key)!==entry)return;this.discard(key,{expired:true});onExpire?.();};
    const arm=()=>{entry.timer=setTimeout(expire,this.ttlMs);entry.timer.unref?.();};
    this.entries.set(key,entry);this.stats.started++;
    if(readyTimeoutMs){
      const discard=()=>{if(this.entries.get(key)===entry)this.discard(key);};
      entry.timer=setTimeout(discard,readyTimeoutMs);entry.timer.unref?.();
      void handle.ready.then(()=>{if(this.entries.get(key)===entry){clearTimeout(entry.timer);arm();}},discard);
    }else arm();
    return true;
  }
  /** Hand over the runtime only if every option it was started with still applies. */
  take(key,fingerprint){
    const entry=this.entries.get(key);if(!entry)return null;
    this.remove(key,entry);
    if(entry.fingerprint!==fingerprint||entry.handle.failed){this.stats.discarded++;entry.handle.close();return null;}
    this.stats.used++;return entry.handle;
  }
  fail(handle){this.stats.used=Math.max(0,this.stats.used-1);this.stats.discarded++;handle.close();}
  remove(key,entry){this.entries.delete(key);clearTimeout(entry.timer);entry.release?.();}
  discard(key,{expired=false}={}){const entry=this.entries.get(key);if(!entry)return;this.remove(key,entry);if(expired)this.stats.expired++;else this.stats.discarded++;entry.handle.close();}
  close(){for(const key of [...this.entries.keys()])this.discard(key);}
}
