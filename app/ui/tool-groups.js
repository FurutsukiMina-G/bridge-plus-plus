/* Long runs of tool calls fold into one row of the transcript. */
import {toolActivity} from './activity.js';

/** Fewer calls than this stay as plain rows: folding them would hide more than it saves. */
export const MIN_FOLD=3;

export function toolFailed(end){
  const d=end?.data??{};
  // is_error: Claude Code's tool_result block, passed through as it arrives.
  return d.isError===true||d.is_error===true||d.message?.isError===true||d.status==='failed'||d.item?.status==='failed'||(Number.isInteger(d.item?.exitCode)&&d.item.exitCode!==0)||!!d.error;
}
export const toolStatus=(t,running)=>t.end?toolFailed(t.end)?'failed':'done':running?'running':'stopped';

/**
 * Blocks marked `work` are tool calls ({tool}) or thinking ({thinking}); any other block ends a run,
 * so the answer, approvals and errors always stay in view. A run with enough tool calls becomes {fold:[…]}.
 */
export function foldRuns(blocks){
  const out=[];let run=[];
  const flush=()=>{
    if(run.filter(b=>b.work.tool).length>=MIN_FOLD)out.push({fold:run});else out.push(...run);
    run=[];
  };
  for(const block of blocks){
    if(block.work)run.push(block);
    else{flush();out.push(block);}
  }
  flush();
  return out;
}

/** The row a folded run shows: while a call is running, what it is doing; afterwards, what the run did. */
export function foldSummary(run,running){
  const tools=run.filter(b=>b.work.tool).map(b=>b.work.tool),statuses=tools.map(t=>toolStatus(t,running));
  const failed=statuses.filter(s=>s==='failed').length,live=tools.findLast((t,i)=>statuses[i]==='running');
  const status=live?'running':failed?'failed':statuses.includes('stopped')?'stopped':'done';
  const title=`${tools.length} 次工具调用`;
  if(live){
    const now=toolActivity(live.start??live.end);
    return{status,title,detail:now.detail?`${now.long} · ${now.detail}`:now.long};
  }
  const counts=new Map();
  for(const t of tools){const kind=toolActivity(t.start??t.end).short;counts.set(kind,(counts.get(kind)??0)+1);}
  const parts=[...counts].sort((a,b)=>b[1]-a[1]).map(([kind,n])=>`${kind} ${n}`);
  if(run.length>tools.length)parts.push(`思考 ${run.length-tools.length} 段`);
  if(failed)parts.unshift(`${failed} 个失败`);
  return{status,title,detail:parts.join(' · ')};
}
