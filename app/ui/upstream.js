/* What the upstream model service actually said, and why a turn stopped. */
import {icon} from './icons.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const sources={qoder:'Qoder',workbuddy:'WorkBuddy'};
const pad=n=>String(n).padStart(2,'0');

export const rateLimited=e=>e?.status===429||/rate.?limit|quota/i.test(String(e?.code??''));
export const upstreamTitle=e=>rateLimited(e)?'上游限速':'上游报错';
/** The upstream's words without the status code they lead with, which is shown beside them. */
export const upstreamText=e=>String(e?.message??'').replace(/^(?:HTTP\s*)?\d{3}\s+/i,'');

/** When a limit lifts, in the user's clock: "00:06 重置（约 4 小时后）". */
export function resetText(at,now=Date.now()){
  const date=new Date(at),left=date.getTime()-now;
  if(!at||!Number.isFinite(left))return'';
  const today=new Date(now).toDateString()===date.toDateString();
  const clock=`${today?'':`${date.getMonth()+1} 月 ${date.getDate()} 日 `}${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if(left<=0)return`${clock} 已重置`;
  const minutes=Math.ceil(left/60000);
  return`${clock} 重置（约 ${minutes<60?`${minutes} 分钟`:`${Math.round(minutes/60)} 小时`}后）`;
}

/** Clients retry, so one cause can arrive many times in a row; it is shown once with a count. */
export const sameUpstream=(a,b)=>!!a&&!!b&&a.provider===b.provider&&a.code===b.code&&a.status===b.status&&a.message===b.message;

export function upstreamHtml(e,count=1,now=Date.now()){
  const where=[sources[e.provider]??e.provider,e.model,Number.isInteger(e.status)?`HTTP ${e.status}`:null].filter(Boolean).join(' · ');
  const reset=resetText(e.resetAt,now),diagnosis=[e.code&&`错误码：${e.code}`,e.requestId&&`请求 ID：${e.requestId}`].filter(Boolean).join('\n');
  return`<div class="upstream-card${rateLimited(e)?' limited':''}"><div class="upstream-head">${icon('alert')}<b>${upstreamTitle(e)}</b>${where?`<span class="muted">${esc(where)}</span>`:''}${count>1?`<span class="upstream-count" title="同样的错误出现了 ${count} 次">×${count}</span>`:''}</div>
    <div class="upstream-message">${esc(upstreamText(e)||'上游没有说明原因。')}</div>
    ${reset?`<div class="upstream-meta">${icon('clock')}<span>${esc(reset)}</span></div>`:''}
    ${diagnosis?`<details class="upstream-details" data-expand="upstream-${esc(e.id)}"><summary>诊断详情</summary><pre>${esc(diagnosis)}</pre></details>`:''}</div>`;
}

/** The short cause on the line that closes a turn. */
export function stopLabel(reason){
  if(!reason)return'';
  if(reason.kind==='upstream')return upstreamTitle(reason);
  return{cancelled:'你已停止',runtime:'原生进程中断',unfinished:'模型没有给出结果'}[reason.kind]??'';
}

/** The full cause, unless the transcript already says it just above; stopping it yourself needs no explaining. */
export function stopNote(reason,shown=new Set()){
  if(!reason?.message||reason.kind==='cancelled'||shown.has(reason.message))return'';
  const reset=resetText(reason.resetAt);
  return reset?`${reason.message}（${reset}）`:reason.message;
}

/** What a turn cost beyond its answer: every request here sent the whole history again. */
export function turnExtras(stats){
  const parts=[];
  if(stats?.requests)parts.push(`请求 ${stats.requests} 次`);
  if(stats?.failedRequests)parts.push(`失败 ${stats.failedRequests} 次`);
  if(stats?.corrections)parts.push(`格式纠正 ${stats.corrections} 次`);
  if(stats?.continuations)parts.push(`自动续作 ${stats.continuations} 次`);
  return parts;
}

/** Sending again during a known limit will fail too, so say so next to the composer. */
export function limitNotice(failure,now=Date.now()){
  if(failure?.kind!=='upstream'||!failure.resetAt||!(new Date(failure.resetAt).getTime()>now))return'';
  return`${failure.source?`${failure.source} `:''}限速中，${resetText(failure.resetAt,now)}。现在发送可能继续失败。`;
}
