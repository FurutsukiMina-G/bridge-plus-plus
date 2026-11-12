// Match appendDisplayEvent's chunk identity without depending on renderer code.
const chunks=new Set(['thinking','text','tool-output']);
const identity=['type','turnId','itemId','toolId','attemptId'];
// Some runtimes report thinking progress as a counter that ticks once per token batch
// instead of one summary per turn (Claude Code's `thinking_tokens` system event started
// this). The individual rows carry no information the journal needs — 133k rows/61 MB in
// a three-day window — so the store drops them at the single point where every runtime's
// events become journal records, keeping only the running total.
const tickerShape=/thinking[_ -]?tokens?/i;
/** True for a per-batch thinking counter event from any runtime, by projected name or raw subtype. */
export function isThinkingTicker(event){
  if(event?.type!=='native-event')return false;
  return [event.name,event.data?.subtype,event.data?.type,event.data?.chunk?.type].some(tickerShape.test.bind(tickerShape));
}
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const pickNumber=(data,pattern)=>{for(const[key,value]of Object.entries(data??{}))if(pattern.test(key)){const n=number(value);if(n!==null)return n;}return null;};
/** Which thinking burst a tick belongs to. Event ids are per tick, so only message-level
 * fields may split the accumulation; unknown identity means one continuous sequence. */
export function thinkingTickerIdentity(event){
  const data=event?.data??{};
  for(const key of ['user_message_uuid','user_message_id','message_uuid','message_id','itemId','item_id','attemptId','attempt_id'])
    if(typeof data[key]==='string'&&data[key])return data[key];
  return null;
}
/** Fold one tick into the running total of its own burst: deltas add up, a reported
 * cumulative estimate wins over anything smaller. Unrecognised payloads keep the total. */
export function thinkingTickerTotal(event,current=0){
  const data=event?.data??{};
  const delta=pickNumber(data,/delta|increment/i);
  if(delta!==null)return current+delta;
  const cumulative=pickNumber(data,/tokens?$/i);
  return cumulative===null?current:Math.max(current,cumulative);
}
/** A running total per turn. One entry per session: {identity,closed,segment,total}. */
export function foldThinkingTicker(prior,event){
  const burst=thinkingTickerIdentity(event);
  const carried=prior&&prior.identity===burst?prior:{identity:burst,closed:prior?prior.closed+prior.segment:0,segment:0};
  const segment=thinkingTickerTotal(event,carried.segment);
  return {...carried,segment,total:carried.closed+segment};
}
/** Compact adjacent historical chunks for IPC, preserving the first id/at.
 * Non-chunk records remain in their original order, including invisible native events.
 * Collect fragments before joining so a very long single attempt stays linear. */
export function coalesceSessionEvents(events){
  const result=[];let current=null,parts=null;
  const flush=()=>{if(parts){current.text=parts.join('');parts=null;}current=null;};
  for(const event of events){
    if(chunks.has(event?.type)&&typeof event.text==='string'){
      if(current&&identity.every(key=>current[key]===event[key]))parts.push(event.text);
      else{flush();current={...event};parts=[event.text];result.push(current);}
    }else{flush();result.push(event);}
  }
  flush();return result;
}
