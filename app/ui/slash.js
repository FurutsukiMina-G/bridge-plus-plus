import {icon} from './icons.js';

/* The composer's `/` menu: each execution environment's own slash commands.
   The view comes from session:commands / runtime:commands: {runtimeId, source:'native'|'curated'|'none',
   commands:[{name,description,hint,aliases,kind:'command'|'skill'}], note, stale}. Pure functions: no DOM, no state. */

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

/** The command word being typed: the text starts with `/` and the caret is still inside its first word. */
export function slashQuery(text,caret=String(text??'').length){
  const value=String(text??'');
  if(!value.startsWith('/'))return null;
  const end=value.search(/\s/),word=end<0?value.length:end;
  if(caret<1||caret>word)return null;
  return {query:value.slice(1,caret),end:word};
}

/** Commands matching what is typed: name prefix first, then alias prefix, then name or description containing it. */
export function matchCommands(commands,query,limit=60){
  const q=String(query??'').toLowerCase(),list=Array.isArray(commands)?commands:[];
  if(!q)return list.slice(0,limit);
  const rank=c=>{
    const name=String(c.name??'').toLowerCase(),aliases=(c.aliases??[]).map(a=>String(a).toLowerCase());
    if(name.startsWith(q))return 0;
    if(aliases.some(a=>a.startsWith(q)))return 1;
    if(name.includes(q))return 2;
    // Descriptions are long prose: one or two typed letters would match most of them.
    if(q.length>=3&&String(c.description??'').toLowerCase().includes(q))return 3;
    return -1;
  };
  return list.map((c,i)=>({c,r:rank(c),i})).filter(x=>x.r>=0).sort((a,b)=>a.r-b.r||a.i-b.i).slice(0,limit).map(x=>x.c);
}

/** Replaces the typed command word with the chosen one and leaves the caret after a space, keeping any arguments. */
export function completeSlash(text,name){
  const value=String(text??''),end=value.search(/\s/),rest=end<0?'':value.slice(end).replace(/^\s+/,'');
  const head=`/${name} `;
  return {text:head+rest,caret:head.length};
}

/** The menu body. `active` is the highlighted row; rows carry data-slash-index for clicks. */
export function slashMenuHtml(view,{items=[],active=0,loading=false,error=null,query=''}={}){
  const head=view?.runtimeName?`<div class="slash-head">${esc(view.runtimeName)} 的命令</div>`:'';
  if(error)return`${head}<div class="slash-note warn">${icon('alert')}<span>读取命令失败：${esc(error)}</span></div>`;
  if(loading&&!view)return`${head}<div class="slash-note"><span class="spinner"></span><span>正在读取命令…</span></div>`;
  if(view?.source==='none')return`${head}<div class="slash-note">${icon('info')}<span>${esc(view.note||'这个环境不提供命令列表')}</span></div>`;
  const stale=view?.stale?`<div class="slash-note small">${icon('info')}<span>${view.commands?.length?'这是上次读到的列表，可能不是最新的':'还没有读到命令列表：在这个环境里开过一次会话后就会有'}</span></div>`:'';
  if(!items.length)return`${head}${stale||`<div class="slash-note">${icon('info')}<span>${query?`没有以 /${esc(query)} 开头的命令；直接发送会当作普通消息`:'没有可用的命令'}</span></div>`}`;
  const rows=items.map((c,i)=>`<button class="slash-item${i===active?' active':''}" data-slash-index="${i}" role="option" aria-selected="${i===active}"><span class="slash-name">/${esc(c.name)}</span>${c.hint?`<span class="slash-hint">${esc(c.hint)}</span>`:''}${c.kind==='skill'?'<span class="slash-tag">技能</span>':''}<span class="slash-desc" title="${esc(c.description)}">${esc(c.description)}</span></button>`).join('');
  return`${head}<div class="slash-list" role="listbox">${rows}</div>${stale}<div class="slash-foot">↑↓ 选择 · Enter / Tab 填入 · Esc 关闭</div>`;
}
