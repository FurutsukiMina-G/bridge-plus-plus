// Match appendDisplayEvent's chunk identity without depending on renderer code.
const chunks=new Set(['thinking','text','tool-output']);
const identity=['type','turnId','itemId','toolId','attemptId'];
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
