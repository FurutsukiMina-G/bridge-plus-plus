import {icon} from './icons.js';

/* 设置 › 长期要求, and the transcript line for a requirement Bridge++ recorded on its own.
   The view comes from rules:get: {path,text,items:[{id,text,at,sessionId,sessionTitle,auto}],injected,overflow,
   autoRecord,detector:{model:'session'|<model key>,fallback,available},updatedAt}. Pure functions: no DOM, no state. */

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const MODEL_NAMES={'qoder:qfmodel':'Q-Qwen3.8-Flash','workbuddy:hy4free':'W-Hy4'};
const SOURCE_NAMES={qoder:'Qoder',workbuddy:'WorkBuddy'};
export const modelName=key=>MODEL_NAMES[key]??String(key??'').split(':').pop();
const sourceOf=key=>SOURCE_NAMES[String(key??'').split(':')[0]]??String(key??'').split(':')[0];

/** "11 月 12 日 16:05" in local time; empty when the stamp is missing or invalid. */
export function ruleTime(iso){
  const d=new Date(iso);if(Number.isNaN(d.getTime()))return'';
  return`${d.getMonth()+1} 月 ${d.getDate()} 日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/** Which model judges each message. Default: the session's own model, as a light auxiliary request. */
function detectorNote(view){
  const d=view.detector??{},fallback=d.fallback?`${modelName(d.fallback)}（${sourceOf(d.fallback)}）`:'Q-Qwen3.8-Flash';
  const who=!d.model||d.model==='session'
    ?`你发的每条消息由这个会话正在用的模型顺带判断（辅助请求、调低思考强度），消息不会发给别的模型源；会话用原生模型（不经过 Bridge++ 模型源）时改用 ${esc(fallback)}。`
    :`你发的每条消息由 ${esc(modelName(d.model))} 判断，会发给 ${esc(sourceOf(d.model))}；它不可用时改用 ${esc(fallback)}。`;
  return`${who}有长期要求就直接记下，并在对话里提示，可以撤销；都不可用时跳过，不影响任务。${d.available===false?' <b class="warn-text">现在没有可用的识别模型。</b>':''}`;
}
/** models: [{key,name,group}] of the Bridge++ model sources, for the detector picker. */
function detectorPicker(view,models=[]){
  const current=view.detector?.model??'session',known=models.some(m=>m.key===current);
  const groups=[...new Set(models.map(m=>m.group))];
  const options=groups.map(g=>`<optgroup label="${esc(g)}">${models.filter(m=>m.group===g).map(m=>`<option value="${esc(m.key)}"${m.key===current?' selected':''}>${esc(m.name)}</option>`).join('')}</optgroup>`).join('');
  return`<label class="rules-detector"><span>识别用的模型</span><select data-rules-detector><option value="session"${current==='session'?' selected':''}>跟随会话当前模型（默认）</option>${!known&&current!=='session'?`<option value="${esc(current)}" selected>${esc(modelName(current))}（现在不可用）</option>`:''}${options}</select></label>`;
}

function itemHtml(item,view){
  const injected=!Array.isArray(view.injected)||view.injected.includes(item.id);
  const origin=item.auto?'自动记录':'手动添加',time=ruleTime(item.at);
  const from=item.sessionId?`<button class="link-btn" data-rule-session="${esc(item.sessionId)}" title="打开来源会话">${esc(item.sessionTitle||'来源会话')}</button>`:'';
  return`<li class="rule-item${injected?'':' dropped'}" data-rule-id="${esc(item.id)}">
    <div class="rule-text">${esc(item.text)}</div>
    <div class="rule-meta"><span>${origin}</span>${time?`<span>${esc(time)}</span>`:''}${from?`<span>来自 ${from}</span>`:''}${injected?'':`<span class="rule-tag" title="超过 50 条或 8 KB 的部分暂不交给模型，删掉一些旧的就会恢复">未注入</span>`}</div>
    <button class="icon-btn sm" data-rule-delete="${esc(item.id)}" title="删除这条">${icon('close')}</button>
  </li>`;
}

/** The whole settings page. `editing` shows the full-text editor with `draft` (the file text) instead of the list. */
export function rulesPageHtml(view,{editing=false,draft=null,loading=false,error=null,models=[]}={}){
  const head=`<div class="settings-head"><h1>长期要求</h1><p>你在工作中提出的长期要求记在 Bridge++ 自己的 AGENTS.md 里，所有环境和模型都能看到：Codex（模型源的模型）和 Claude Code 放进它们的全局指令，其他环境在每个新会话的第一条消息前附上。改动对之后新开的会话生效。</p></div>`;
  if(!view)return head+(error?`<div class="note warn">${icon('alert')}<span>读取失败：${esc(error)}</span></div>`:`<div class="rules-loading"><span class="spinner"></span><span>正在读取…</span></div>`);
  const items=Array.isArray(view.items)?view.items:[];
  const auto=`<label class="update-auto rules-auto"><input type="checkbox" data-rules-auto ${view.autoRecord?'checked':''}><span><b>自动记录长期要求</b><small>${detectorNote(view)}</small></span></label>${view.autoRecord?detectorPicker(view,models):''}`;
  if(editing)return`${head}${auto}
    <div class="rules-editor"><div class="rules-editor-head"><b>编辑全文</b><small>以“- ”开头的每一行是一条要求；行尾的注释记录来源，可以删。</small></div>
    <textarea id="rules-text" spellcheck="false">${esc(draft??view.text??'')}</textarea>
    <div class="rules-editor-actions"><button class="btn" data-rules="cancel-edit">取消</button><button class="btn primary" data-rules="save-text"${loading?' disabled':''}>${loading?'<span class="spinner"></span>':''}保存</button></div></div>`;
  const list=items.length?`<ul class="rule-list">${items.map(item=>itemHtml(item,view)).join('')}</ul>`:`<div class="rules-empty">${icon('list')}<span>还没有长期要求。你在对话里说“以后都…”“每次…”“记住…”这类话时，会自动记到这里；也可以在下面直接添加。</span></div>`;
  const overflow=view.overflow?`<div class="note warn">${icon('alert')}<span>要求太多（超过 50 条或 8 KB），最早的自动记录暂时没有交给模型。</span></div>`:'';
  return`${head}${auto}
    <h2>当前要求${items.length?`<span class="muted"> · ${items.length} 条</span>`:''}</h2>${overflow}${list}
    <div class="rule-add"><input id="rule-add-text" placeholder="添加一条要求，例如：回复用中文；改代码前先说明方案" maxlength="300" autocomplete="off"><button class="btn" data-rules="add">${icon('plus')}添加</button></div>
    <div class="rules-footer"><button class="btn sm" data-rules="edit">${icon('edit')}编辑全文</button><span class="muted mono" title="${esc(view.path)}">${esc(view.path??'')}</span>${view.path?`<button class="link-btn" data-copy-text="${esc(view.path)}">复制路径</button>`:''}</div>`;
}

/** Transcript line for a requirement recorded from the user's message. `undone` comes from a later undo event. */
export function ruleNoticeHtml(e,undone=false){
  const text=e.rule?.text??String(e.text??'').replace(/^已记为长期要求：/,'');
  return`<div class="event-note notice rule-note${undone?' undone':''}">${icon('bulb')}<span>${undone?'已撤销长期要求：':'已记为长期要求：'}${esc(text)}</span>${undone||!e.ruleId?'':`<button class="link-btn" data-rule-undo="${esc(e.ruleId)}">撤销</button>`}<button class="link-btn" data-open-rules>查看全部</button></div>`;
}
