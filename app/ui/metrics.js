const count=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const pick=(...values)=>{for(const value of values){const n=count(value);if(n!==null)return n;}return null;};
const cjk=/[⺀-鿿가-힯豈-﫿＀-￯]/g;

/** Rough token count for live streaming display only; reported usage always wins. */
export function estimateTokens(text){
  if(typeof text!=='string'||!text)return 0;
  const wide=(text.match(cjk)??[]).length;
  return wide*0.7+(text.length-wide)/3.6;
}

function shape(v){
  if(v.input===null&&v.output===null)return null;
  const status=v.cached===null||v.cached===undefined?'not_reported':v.cacheStatus==='estimated'?'estimated':'reported';
  return{input:v.input,output:v.output,cached:status==='not_reported'?null:v.cached,reasoning:v.reasoning??null,
    window:v.window??null,cacheStatus:status,firstTokenMs:v.firstTokenMs??null,durationMs:v.durationMs??null};
}

/**
 * Normalizes the usage payloads the runtimes and the gateway emit:
 * gateway / OpenAI chat (prompt_tokens…), Codex thread token usage (last/modelContextWindow),
 * Anthropic layout (input_tokens + cache_read_input_tokens) and pi-ai layout (input/cacheRead).
 * Prompt counts returned here always include cached tokens.
 */
export function readUsage(raw){
  if(!raw||typeof raw!=='object')return null;
  if(raw.last&&typeof raw.last==='object'){
    const u=raw.last;
    return shape({input:pick(u.inputTokens,u.input_tokens),output:pick(u.outputTokens,u.output_tokens),
      cached:pick(u.cachedInputTokens,u.cached_input_tokens),reasoning:pick(u.reasoningOutputTokens,u.reasoning_output_tokens),
      window:pick(raw.modelContextWindow,raw.model_context_window)});
  }
  const u=raw.usage&&typeof raw.usage==='object'&&!('prompt_tokens' in raw)?raw.usage:raw;
  if('prompt_tokens' in u||'completion_tokens' in u)return shape({input:pick(u.prompt_tokens),output:pick(u.completion_tokens),
    cached:pick(u.cached_tokens,u.prompt_tokens_details?.cached_tokens),
    reasoning:pick(u.reasoning_tokens,u.completion_tokens_details?.reasoning_tokens),window:pick(u.context_window),
    cacheStatus:u.cache_status,firstTokenMs:pick(u.first_token_ms),durationMs:pick(u.duration_ms)});
  if('input_tokens' in u||'output_tokens' in u){
    const read=pick(u.cache_read_input_tokens),write=pick(u.cache_creation_input_tokens),base=pick(u.input_tokens);
    return shape({input:base===null?null:base+(read??0)+(write??0),output:pick(u.output_tokens),cached:read});
  }
  if('inputTokens' in u||'outputTokens' in u)return shape({input:pick(u.inputTokens),output:pick(u.outputTokens),
    cached:pick(u.cachedInputTokens,u.cacheReadInputTokens),reasoning:pick(u.reasoningOutputTokens,u.reasoningTokens)});
  if('input' in u&&'output' in u){
    const read=pick(u.cacheRead),write=pick(u.cacheWrite),base=pick(u.input);
    return shape({input:base===null?null:base+(read??0)+(write??0),output:pick(u.output),cached:read});
  }
  return null;
}

/** Context, cache and speed figures of one session, fed with raw journal events in order. */
export class SessionMetrics{
  constructor(){this.clear();}
  clear(){
    this.requests=[];this.cumulative=null;this.window=null;this.samples=[];this.segment=null;this.lastDeltaAt=null;
  }
  feed(event){
    const t=Date.parse(event.at??'')||Date.now();
    if(event.type==='text'||event.type==='thinking'){
      const tokens=estimateTokens(event.text);
      if(!tokens)return;
      this.segment??={first:t,last:t,tokens:0};
      this.segment.last=t;this.segment.tokens+=tokens;this.lastDeltaAt=t;
      this.samples.push({t,tokens});
      if(this.samples.length>600)this.samples.splice(0,300);
    }else if(event.type==='usage'){
      const usage=readUsage(event.data);
      if(!usage)return;
      if(event.scope==='native-session'){this.cumulative=usage;return;}
      const segment=this.segment;this.segment=null;
      let rate=null,estimated=false;
      if(usage.output&&usage.durationMs){
        const ms=usage.durationMs-(usage.firstTokenMs??0);
        if(ms>=250)rate=usage.output/(ms/1000);
      }else if(usage.output&&segment&&segment.last-segment.first>=400)rate=usage.output/((segment.last-segment.first)/1000);
      else if(segment&&segment.last-segment.first>=400){rate=segment.tokens/((segment.last-segment.first)/1000);estimated=true;}
      if(usage.window)this.window=usage.window;
      // The gateway marks tool-less requests (auto-review, titles, summaries): they carry their own small context.
      this.requests.push({...usage,at:t,turnId:event.turnId??null,rate,rateEstimated:estimated,auxiliary:event.data?.auxiliary===true});
    }else if(event.type==='native-event'&&event.name==='request/context'&&count(event.data?.contextWindow))this.window=event.data.contextWindow;
    else if(event.type==='turn-end')this.segment=null;
  }
  /** The latest request with a prompt count; `main` skips the gateway's auxiliary requests when there is any other. */
  lastRequest({main=false}={}){
    for(let i=this.requests.length-1;i>=0;i--){const r=this.requests[i];if(r.input!==null&&(!main||!r.auxiliary))return r;}
    return main?this.lastRequest():null;
  }
  context(fallbackWindow){
    // The ring follows the main conversation, not the side requests that alternate with it.
    const last=this.lastRequest({main:true}),window=last?.window??this.window??fallbackWindow??null;
    if(!last)return{used:null,window,ratio:null};
    const used=last.input+(last.output??0);
    return{used,window,ratio:window?Math.min(1,used/window):null};
  }
  cache(){
    const known=this.requests.filter(r=>r.input>0&&r.cached!==null);
    if(known.length){
      // "Latest request" means the latest main-conversation request; the session ratio still counts every request.
      const main=known.filter(r=>!r.auxiliary),last=(main.length?main:known).at(-1),input=known.reduce((n,r)=>n+r.input,0),cached=known.reduce((n,r)=>n+r.cached,0);
      return{ratio:last.cached/last.input,status:last.cacheStatus,sessionRatio:cached/input,requests:known.length};
    }
    const c=this.cumulative;
    if(c?.input>0&&c.cached!==null)return{ratio:c.cached/c.input,status:c.cacheStatus,sessionRatio:c.cached/c.input,requests:0};
    return null;
  }
  rate(now=Date.now(),live=false){
    if(live&&this.lastDeltaAt&&now-this.lastDeltaAt<4000){
      const recent=this.samples.filter(s=>now-s.t<=5000);
      if(recent.length>1){
        const span=Math.max(1000,now-recent[0].t),tokens=recent.reduce((n,s)=>n+s.tokens,0);
        return{value:tokens/(span/1000),estimated:true,live:true};
      }
    }
    // Like the ring, prefer the main conversation: a title or review request finishing last must not set the speed.
    let side=null;
    for(let i=this.requests.length-1;i>=0;i--){
      const r=this.requests[i];
      if(!r.rate)continue;
      if(!r.auxiliary)return{value:r.rate,estimated:r.rateEstimated,live:false};
      side??={value:r.rate,estimated:r.rateEstimated,live:false};
    }
    return side;
  }
  turn(turnId){
    const rows=this.requests.filter(r=>r.turnId===turnId);
    if(!rows.length)return null;
    const sum=key=>rows.every(r=>r[key]!==null)?rows.reduce((n,r)=>n+r[key],0):null;
    // Cost counts every request of the turn; the cache ratio describes the main conversation when it has any.
    const known=rows.filter(r=>r.cached!==null&&r.input>0),mainKnown=known.filter(r=>!r.auxiliary),cachedRows=mainKnown.length?mainKnown:known;
    return{requests:rows.length,input:sum('input'),output:sum('output'),
      cacheRatio:cachedRows.length?cachedRows.reduce((n,r)=>n+r.cached,0)/cachedRows.reduce((n,r)=>n+r.input,0):null,
      cacheStatus:cachedRows.some(r=>r.cacheStatus==='estimated')?'estimated':cachedRows.length?'reported':'not_reported'};
  }
}
