export const DEFAULT_PRUNED_HISTORY_REUSE_RATIO=0.6;
export function pruningThreshold(value=DEFAULT_PRUNED_HISTORY_REUSE_RATIO){
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1)throw new Error('prunedHistoryReuseRatio must be a number between 0 and 1');return value;
}
export const pruningAllowed=(ratio,threshold)=>threshold>0&&typeof ratio==='number'&&Number.isFinite(ratio)&&ratio>=0&&ratio<threshold;
export function toolPrunedPrefix(before,after){
  let cursor=0,removed=0;
  for(const entry of before){if(entry.key===after[cursor]?.key){cursor++;continue;}if(entry.role!=='tool')return null;removed++;}
  if(!removed||cursor===after.length)return null;
  const oldResults=new Set(before.filter(m=>m.role==='tool').map(m=>m.toolId).filter(Boolean));
  const declared=new Set([...before,...after.slice(cursor)].flatMap(m=>m.callIds??[]));
  if(after.slice(cursor).some(m=>m.role==='tool'&&(!m.toolId||oldResults.has(m.toolId)||!declared.has(m.toolId))))return null;
  return {delta_start:cursor,removed_message_count:removed,removed_roles:{tool:removed}};
}
export function historyReset(before,after){
  let at=0;while(at<Math.min(before.length,after.length)&&before[at].key===after[at].key)at++;
  if(at===before.length)return null;
  const available=new Map();for(const entry of after)available.set(entry.key,(available.get(entry.key)??0)+1);
  const roles={};let removed=0;
  for(const entry of before){const count=available.get(entry.key)??0;if(count)available.set(entry.key,count-1);else{roles[entry.role]=(roles[entry.role]??0)+1;removed++;}}
  return {reason:after.length<before.length?'history_shortened':'history_rewritten',first_changed_index:at,
    previous_message_count:before.length,current_message_count:after.length,previous_role:before[at]?.role??null,current_role:after[at]?.role??null,
    removed_message_count:removed,removed_roles:roles};
}
