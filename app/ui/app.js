import {marked} from 'marked';
import DOMPurify from 'dompurify';
import {WorkspaceViews,appendDisplayEvent,displayEvents} from './view-state.js';
import {icon,logo} from './icons.js';
import {SessionMetrics} from './metrics.js';
import {ActivityTracker,argsOf,toolSummary,gatewayNotice} from './activity.js';
import {PendingAttachments,KINDS,allowedKinds,capabilityKey,fileSize,formatsText,kindName,kindOf,markBroken,markerHtml,mediaCardHtml,mediaUrl,refusal,replaceMarkers,trayHtml,userMediaHtml} from './attachments.js';
import {cjkEmphasis} from './markdown-cjk.js';
import {foldRuns,foldSummary,toolStatus} from './tool-groups.js';
import {limitNotice,sameUpstream,stopLabel,stopNote,turnExtras,upstreamHtml} from './upstream.js';
import {mathExtension,replaceMath} from './math.js';
import {fileLinks,toolFilePath,webLink} from './file-links.js';
import {usable,unusableReason,permissionWarning,environmentCardHtml,servicesPageHtml,serviceCardsHtml,serviceModelsHtml,onboardingHtml,sourceCardHtml} from './setup.js';
import {budgetCheck,compactTokens,formatTokens,parseTokens} from './tokens.js';

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const labels={idle:'准备就绪',starting:'正在连接',running:'运行中',waiting:'等待授权',completed:'已完成',failed:'运行失败',interrupted:'已中断',paused:'已暂停'};
const sourceNames={qoder:'Qoder CN',workbuddy:'WorkBuddy',antigravity:'Antigravity · Gemini'};
const tiles={dsh:'DS',kimi:'Ki',codex:'Cx',antigravity:'AG'};
const choiceLabels={approve:'允许这次','approve-session':'本会话始终允许',reject:'拒绝','reject-session':'本会话始终拒绝'};
const resolvedLabels={approve:'已允许','approve-session':'已允许（本会话）',reject:'已拒绝','reject-session':'已拒绝（本会话）',expired:'已过期'};
const busyStates=['running','starting','waiting'];
const state={snapshot:null,projectId:null,sessionId:null,events:[],draft:'',historyLoading:null,
  runtimeId:'dsh',modelKey:null,reasoning:'',contextTokens:null,contextBudget:null,nativeModel:'',
  tree:new Map(),expanded:new Set(),file:null,dirty:false,git:null,diffPath:null,diff:'',terminalText:'',terminalBusy:false,
  settings:null,catalogSearch:'',catalogSource:'all',sessionSearch:'',menuSearch:'',params:null,delivery:'steer'};
const ui=loadUi(),views=new WorkspaceViews(),metrics=new SessionMetrics(),activity=new ActivityTracker(),stopping=new Set(),nativeCatalog=new Map(),showAll=new Set();
const markdownCache=new Map(),blockSource=new WeakMap();
const pending=new PendingAttachments(),capCache=new Map(),capLoading=new Set(),mediaLookup=new Map(),mediaResolving=new Set();
// Per interface card on Settings › 对外接口: a revealed key, whether the model list is open and its rows.
const serviceViews=new Map(),serviceView=id=>{if(!serviceViews.has(id))serviceViews.set(id,{});return serviceViews.get(id);};
let guideOpen=false,guideShown=false;
let toastTimer,chatTimer,refreshTimer,tickTimer,sessionEpoch=0,fileEpoch=0,rightEpoch=0,reportedDirty=false,submitting=false,menu=null,lastBusy=false,dragging=null,mediaGen=0,dropDepth=0;
// Images in assistant markdown become markers; local files are resolved through the backend.
marked.use({renderer:{image(token){return markerHtml(token.href,token.text);}}});
// **加粗（括号）**紧跟中文 renders as bold, as Chinese readers expect.
marked.use(cjkEmphasis);marked.use(mathExtension);marked.use(fileLinks);

function loadUi(){
  const fallback={left:true,right:true,rightTab:'changes',rightWidth:400,collapsed:[],runtimeId:null};
  try{return{...fallback,...JSON.parse(localStorage.getItem('bridgepp.ui')??'{}')};}catch{return fallback;}
}
function saveUi(){try{localStorage.setItem('bridgepp.ui',JSON.stringify(ui));}catch{}}
async function call(method,args={}){
  const result=await window.workbench.call(method,args);
  if(!result.ok)throw new Error(result.error);
  return result.value;
}
function toast(text,error=false){
  clearTimeout(toastTimer);
  const el=$('#toast');
  el.innerHTML=`${icon(error?'alert':'check')}<span>${esc(text)}</span>`;
  el.className=`toast${error?' error':''}`;
  // Long messages say what to do next, so they stay up long enough to read.
  toastTimer=setTimeout(()=>el.classList.add('hidden'),error?7000:Math.max(3600,text.length*110));
}
async function action(fn){try{return await fn();}catch(e){toast(e.message,true);}}
function bind(selector,event,fn){const el=$(selector);if(el)el.addEventListener(event,fn);}

/* ---------- in-place DOM updates ---------- */
const fragment=html=>{const t=document.createElement('template');t.innerHTML=html;return t.content;};
/** Bring a rendered node in line with a freshly built one without recreating it, so entrance animations, scroll positions, selections and open details survive streaming. */
function morph(from,to){
  if(from.nodeType!==to.nodeType||from.nodeName!==to.nodeName){from.replaceWith(to);return to;}
  if(from.nodeType!==Node.ELEMENT_NODE){if(from.nodeValue!==to.nodeValue)from.nodeValue=to.nodeValue;return from;}
  const settled=from.classList.contains('settled');
  for(const {name} of [...from.attributes])if(!to.hasAttribute(name)&&name!=='open')from.removeAttribute(name);
  for(const {name,value} of [...to.attributes])if(from.getAttribute(name)!==value)from.setAttribute(name,value);
  if(settled)from.classList.add('settled');
  const old=[...from.childNodes],next=[...to.childNodes];
  next.forEach((node,i)=>{if(i<old.length)morph(old[i],node);else from.appendChild(node);});
  for(const node of old.slice(next.length))node.remove();
  return from;
}
function patchHtml(el,html){const shell=el.cloneNode(false);shell.append(fragment(html));morph(el,shell);}
/** Keyed update: unchanged blocks are left alone and changed ones morphed, so only genuinely new blocks play the entrance animation. */
function patchBlocks(container,blocks,quiet){
  const current=new Map();
  for(const el of [...container.children]){if(el.dataset.key&&!current.has(el.dataset.key))current.set(el.dataset.key,el);else el.remove();}
  const wanted=new Set(blocks.map(([key])=>key));
  for(const [key,el] of current)if(!wanted.has(key)){el.remove();current.delete(key);}
  blocks.forEach(([key,html],index)=>{
    let el=current.get(key);
    if(!el){el=fragment(html).firstElementChild;el.dataset.key=key;if(quiet)el.classList.add('settled');}
    else if(blockSource.get(el)!==html){
      const next=fragment(html).firstElementChild;next.dataset.key=key;
      const kept=morph(el,next);
      if(kept!==el){kept.classList.add('settled');el=kept;}
    }
    blockSource.set(el,html);
    const at=container.children[index];
    if(at!==el){if(el.isConnected)el.classList.add('settled');container.insertBefore(el,at??null);}
  });
}
/** Re-renders recreate spinners and status pulses; pin every looping animation to one clock so they never visibly restart. */
new MutationObserver(()=>{for(const a of document.getAnimations())if(a.startTime!==0&&a.effect?.getTiming().iterations===Infinity)a.startTime=0;}).observe(document.body,{childList:true,subtree:true});

const models=()=>Object.values(state.snapshot?.catalog??{}).flatMap(c=>c.models??[]);
const project=()=>state.snapshot?.projects.find(p=>p.id===state.projectId);
const session=()=>state.snapshot?.sessions.find(s=>s.id===state.sessionId);
const runtime=id=>state.snapshot?.runtimes.find(r=>r.id===id);
const currentModel=()=>models().find(m=>m.key===state.modelKey);
const modelOf=selection=>selection?.modelKey&&selection.modelKey!=='native'?models().find(m=>m.key===selection.modelKey):null;
const busy=s=>!!s&&busyStates.includes(s.status);
/** What a busy session is doing right now (thinking, writing, which tool, waiting on you…). */
const activityOf=s=>activity.describe(s.id,s.status,{runtime:runtime(s.runtimeId)?.name,stopping:stopping.has(s.id)});
const compact=compactTokens;
const pct=n=>n==null?'—':`${Math.round(n*100)}%`;
const clock=date=>new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit'}).format(new Date(date));
const pretty=data=>{try{return typeof data==='string'?data:JSON.stringify(data,null,2);}catch{return String(data);}};
const clip=(text,max=20000)=>text.length>max?`${text.slice(0,max)}\n… 已截断 ${(text.length-max).toLocaleString()} 字符`:text;
const tile=r=>`<span class="rt-tile rt-${esc(r?.id??'none')}">${esc(tiles[r?.id]??'?')}</span>`;
const effortName=e=>e==='none'?'关闭':e;
function ago(date){
  const s=(Date.now()-Date.parse(date))/1000;
  if(!(s>=0))return'';
  if(s<60)return'刚刚';
  if(s<3600)return`${Math.floor(s/60)} 分钟`;
  if(s<86400)return`${Math.floor(s/3600)} 小时`;
  if(s<86400*7)return`${Math.floor(s/86400)} 天`;
  return new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric'}).format(new Date(date));
}
const since=date=>{const text=ago(date);return text==='刚刚'||!text||text.includes('/')?text:`${text}前`;};
function elapsed(from){
  const s=Math.max(0,Math.floor((Date.now()-Date.parse(from))/1000));
  return s<60?`${s} 秒`:`${Math.floor(s/60)} 分 ${String(s%60).padStart(2,'0')} 秒`;
}
function greeting(){
  const h=new Date().getHours();
  return h<5?'夜深了':h<11?'早上好':h<13?'中午好':h<18?'下午好':'晚上好';
}

/* ---------- selection: environment first, then model ---------- */
function compatible(runtimeId,model){
  if(!model)return runtimeId!=='dsh';
  if(!model.enabled||model.tools===false)return false;
  if(model.boundRuntime)return runtimeId===model.boundRuntime;
  return runtimeId==='antigravity'?model.source==='antigravity':model.source!=='antigravity';
}
function preferredModel(runtimeId){
  const list=models().filter(m=>compatible(runtimeId,m));
  return list.find(m=>/deepseek.*flash/i.test(m.name))??list[0];
}
/** Last model used with this environment, then a saved pairing for it, then a sensible default. */
function fallbackModel(runtimeId){
  const remembered=ui.models?.[runtimeId],usable=key=>{const m=models().find(x=>x.key===key);return!!m&&compatible(runtimeId,m);};
  if(remembered==='native'&&runtimeId!=='dsh')return'native';
  if(usable(remembered))return remembered;
  const paired=Object.entries(state.snapshot?.preferences.modelDefaults??{}).find(([key,v])=>v?.runtimeId===runtimeId&&usable(key));
  if(paired)return paired[0];
  if(runtimeId==='kimi'||runtimeId==='codex')return'native';
  return preferredModel(runtimeId)?.key??(runtimeId==='dsh'?null:'native');
}
const defaultContext=model=>model?.contexts.length?(model.contexts.some(c=>c.tokens===model.defaultContextTokens)?model.defaultContextTokens:model.contexts[0].tokens):null;
function validBudget(model,budget,context){
  return Number.isSafeInteger(budget)&&budget>=4096&&!!model?.contextMaximum&&budget<=model.contextMaximum&&!(model.source==='qoder'&&context&&budget>context);
}
/** The largest budget a selection allows: Qoder compacts inside the window it was given, others inside the model's maximum. */
const budgetMax=(model,context)=>model?.source==='qoder'&&context?context:model?.contextMaximum??null;
function selectModel(key){
  state.modelKey=key;
  if(key){ui.models={...ui.models,[state.runtimeId]:key};saveUi();}
  const model=currentModel(),saved=state.snapshot?.preferences.modelDefaults??{};
  if(key==='native'){
    const defaults=saved['native:'+state.runtimeId]??(saved.native?.runtimeId===state.runtimeId?saved.native:null);
    Object.assign(state,{reasoning:defaults?.reasoning??'',contextTokens:null,contextBudget:null,nativeModel:defaults?.nativeModel??''});
    return;
  }
  const defaults=saved[key];
  state.reasoning=model?.reasoning.includes(defaults?.reasoning)?defaults.reasoning:'';
  state.contextTokens=model?.contexts.some(c=>c.tokens===defaults?.contextTokens)?defaults.contextTokens:defaultContext(model);
  state.contextBudget=validBudget(model,defaults?.contextBudget,state.contextTokens)?defaults.contextBudget:null;
  state.nativeModel=model?.boundRuntime?model.id:'';
}
/** Switch the new-session environment; one that is missing or not set up is never selected. */
function selectRuntime(runtimeId){
  if(!usable(runtime(runtimeId))){toast(unusableReason(runtime(runtimeId))||'这个运行环境暂时不能使用',true);return false;}
  state.runtimeId=runtimeId;ui.runtimeId=runtimeId;saveUi();
  const current=state.modelKey;
  if(current==='native'&&runtimeId!=='dsh'&&(ui.models?.[runtimeId]??(runtimeId==='antigravity'?null:'native'))==='native'){selectModel('native');return true;}
  if(current&&current!=='native'&&compatible(runtimeId,currentModel())){ui.models={...ui.models,[runtimeId]:current};saveUi();return true;}
  const key=fallbackModel(runtimeId);
  if(key)selectModel(key);else state.modelKey=null;
  return true;
}
function modelLabel(selection,model){
  if(!selection?.modelKey)return'<span class="ml-name">选择模型</span>';
  if(selection.modelKey==='native')return`<span class="ml-name">原生模型</span><span class="ml-meta">${esc(selection.nativeModel||'当前默认')}${selection.reasoning?` · ${esc(effortName(selection.reasoning))}`:''}</span>`;
  if(!model)return`<span class="ml-name">${esc(selection.modelKey.split(':').slice(1).join(':'))}</span><span class="ml-meta">目录中不可用</span>`;
  const parts=[];
  if(model.source!=='antigravity'){
    parts.push(selection.reasoning?effortName(selection.reasoning):'默认思考');
    const ctx=selection.contextTokens??null;
    if(ctx)parts.push(compact(ctx));
    if(selection.contextBudget)parts.push(`预算 ${compact(selection.contextBudget)}`);
  }else parts.push('原生执行');
  return`<span class="ml-name">${esc(sourceName(model))}</span><span class="ml-meta">${esc(parts.join(' · '))}</span>`;
}
/** The chip may be narrow; its tooltip spells everything out. */
function modelTitle(selection,model,locked){
  const lead=locked?'查看或调整此会话的参数':'选择模型、思考强度与上下文窗口';
  if(!model||selection?.modelKey==='native')return lead;
  const rows=[`${sourceNames[model.source]} · ${model.name}（${model.id}）`,`思考强度：${selection.reasoning?effortName(selection.reasoning):'默认'}`];
  if(selection.contextTokens)rows.push(`上下文窗口：${compact(selection.contextTokens)}（${selection.contextTokens.toLocaleString()} tokens）`);
  rows.push(`本地压缩预算：${selection.contextBudget?`${compact(selection.contextBudget)}（${selection.contextBudget.toLocaleString()} tokens）`:'不设置'}`);
  return`${rows.join('\n')}\n${lead}`;
}
// The backend checks a catalog model by its identity, so a new conversation has to send it too.
const composerSelection=()=>({modelKey:state.modelKey,identity:state.modelKey==='native'?undefined:currentModel()?.identity,reasoning:state.reasoning,contextTokens:state.contextTokens,contextBudget:state.contextBudget,nativeModel:state.nativeModel});

/* ---------- workspace state ---------- */
function reportDirty(){
  const dirty=views.anyDirty(state);
  if(dirty!==reportedDirty){reportedDirty=dirty;void call('editor:dirty',{dirty}).catch(()=>{});}
}
const stashDraft=()=>views.saveDraft(state);
function activateProject(id){
  if(state.projectId!==id){fileEpoch++;state.diffPath=null;state.diff='';}
  views.activate(state,id);
  reportDirty();
}
function applyTheme(){
  const pref=state.snapshot?.preferences.theme??'dark';
  const dark=pref==='system'?matchMedia('(prefers-color-scheme: dark)').matches:pref!=='light';
  document.documentElement.dataset.theme=dark?'dark':'light';
}
function applyLayout(){
  const app=$('#app');
  app.classList.toggle('left-collapsed',!ui.left);
  app.classList.toggle('right-collapsed',!ui.right);
  const room=innerWidth-(ui.left?272:0)-520;
  app.style.setProperty('--right-w',`${Math.max(300,Math.min(ui.rightWidth,room))}px`);
}
async function snapshot(){
  state.snapshot=await call('snapshot');
  if(!state.projectId||!project())activateProject(state.snapshot.projects[0]?.id??null);
  if(state.sessionId&&!session()){state.sessionId=null;state.events=[];metrics.clear();}
  if(!state.modelKey){
    const remembered=runtime(ui.runtimeId);
    state.runtimeId=usable(remembered)?remembered.id:state.snapshot.runtimes.find(usable)?.id??'dsh';
    const key=fallbackModel(state.runtimeId);
    if(key)selectModel(key);
  }else if(!session()&&!usable(runtime(state.runtimeId))){
    // The environment went away (uninstalled, or re-detected as not set up): move to one that works.
    const next=state.snapshot.runtimes.find(usable);
    if(next)selectRuntime(next.id);
  }
  applyTheme();
}

/* ---------- sidebar ---------- */
function renderSidebarFrame(){
  $('#sidebar').innerHTML=`<div class="sidebar-top"><div class="brand">${logo(22)}<span>Bridge<b>++</b></span></div><button class="icon-btn" id="collapse-left" title="收起侧栏 (Ctrl+B)">${icon('panelLeft')}</button></div>
    <button class="new-session" id="new-session"><span class="ns-icon">${icon('plus')}</span><span>新建会话</span><kbd>Ctrl N</kbd></button>
    <label class="sidebar-search">${icon('search')}<input id="session-search" placeholder="搜索会话" autocomplete="off" spellcheck="false"></label>
    <div class="section-head"><span>工作文件夹</span><button class="icon-btn sm" id="add-project" title="打开文件夹">${icon('folderPlus')}</button></div>
    <nav id="folders" class="folders"></nav>
    <div class="sidebar-bottom"><button class="settings-entry" id="open-settings" title="设置 (Ctrl+,)">${icon('settings')}<span>设置</span></button><span class="version" id="app-version"></span></div>`;
  bind('#session-search','input',e=>{state.sessionSearch=e.target.value;renderFolders();});
}
function sessionRow(s){
  return`<button class="session-row${s.id===state.sessionId?' active':''}" data-session="${s.id}" title="${esc(s.title)}${s.lastFailure?.message?`\n上一轮中断：${esc(s.lastFailure.message)}`:''}">
    <span class="dot ${esc(s.status)}"></span><span class="session-title">${esc(s.title)}</span>
    <span class="session-meta">${esc(runtime(s.runtimeId)?.short??s.runtimeId)} · ${busy(s)?`<span class="session-activity" data-activity="${s.id}">${esc(activityOf(s).short)}</span>`:ago(s.updatedAt)}</span>
    <span class="row-action" data-archive="${s.id}" title="归档">${icon('archive')}</span></button>`;
}
function renderFolders(){
  const snap=state.snapshot,query=state.sessionSearch.trim().toLowerCase(),el=$('#folders');
  if(!snap||!el)return;
  $('#app-version').textContent=`v${snap.app.version}`;
  if(!snap.projects.length){
    el.innerHTML=`<div class="folders-empty">${icon('folder')}<p>打开一个本机文件夹，会话会按文件夹整理在这里。</p><button class="btn sm" id="empty-add-project">${icon('folderPlus')}打开文件夹</button></div>`;
    return;
  }
  el.innerHTML=snap.projects.map(p=>{
    const rows=snap.sessions.filter(s=>!s.archived&&s.projectId===p.id&&(!query||s.title.toLowerCase().includes(query))).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
    if(query&&!rows.length)return'';
    const collapsed=!query&&ui.collapsed.includes(p.id),live=rows.filter(busy).length,limit=showAll.has(p.id)||query?rows.length:12;
    return`<div class="folder${collapsed?' collapsed':''}${p.id===state.projectId?' current':''}">
      <div class="folder-head" data-folder="${p.id}" title="${esc(p.path)}">${icon('chevronDown','chev')}${icon('folder','folder-icon')}<span class="folder-name">${esc(p.name)}</span>${live?`<span class="live-count" title="${live} 个会话正在运行">${live}</span>`:''}
        <span class="folder-actions"><button class="icon-btn xs" data-new-in="${p.id}" title="在此文件夹新建会话">${icon('plus')}</button><button class="icon-btn xs" data-reveal="${p.id}" title="在资源管理器中打开">${icon('external')}</button></span></div>
      <div class="folder-sessions">${rows.length?rows.slice(0,limit).map(sessionRow).join('')+(rows.length>limit?`<button class="show-more" data-show-all="${p.id}">显示全部 ${rows.length} 个会话</button>`:''):'<div class="folder-empty">还没有会话</div>'}</div></div>`;
  }).join('')||'<div class="folders-empty"><p>没有匹配的会话</p></div>';
}

/* ---------- top bar ---------- */
function renderTopbar(){
  const s=session(),p=project();
  const left=ui.left?'':`<button class="icon-btn" id="toggle-left" title="展开侧栏 (Ctrl+B)">${icon('panelLeft')}</button><span class="topbar-brand">${logo(18)}</span>`;
  const crumb=p?`<span class="crumb" title="${esc(p.path)}">${icon('folder')}${esc(p.name)}</span>`:'';
  const title=s?`<span class="crumb-sep">/</span><button class="title-btn" id="rename-session" title="重命名会话">${esc(s.title)}</button>`:p?'<span class="crumb-sep">/</span><span class="title-muted">新会话</span>':'<span class="title-muted">Bridge++</span>';
  const actions=s?`<button class="ghost-btn" id="native-session" title="在原生完整界面中继续">${icon('external')}<span>原生界面</span></button><button class="icon-btn" id="session-more" title="更多">${icon('more')}</button>`:'';
  const right=ui.right?'':`<button class="icon-btn" id="toggle-right" title="展开右侧面板 (Ctrl+Alt+B)">${icon('panelRight')}</button>`;
  $('#topbar').innerHTML=`<div class="topbar-left">${left}${crumb}${title}</div><div class="topbar-right">${actions}${right}</div>`;
}

/* ---------- main view and composer ---------- */
function renderView(){
  const s=session(),view=$('#view');
  if(s){
    view.className='view chat-view';
    view.innerHTML='<div class="scroller" id="scroller"><div class="transcript" id="chat"></div></div><div class="composer-dock"><div class="composer-slot"></div></div>';
  }else{
    view.className='view welcome-view';
    const hasProjects=!!state.snapshot.projects.length;
    view.innerHTML=`<div class="welcome"><div class="welcome-mark">${logo(40)}</div><h1>${greeting()}，今天想构建什么？</h1><div class="composer-slot"></div>
      <div class="welcome-hints">${hasProjects?'':`<button class="hint-chip primary" data-quick="project">${icon('folderPlus')}打开文件夹</button>`}<button class="hint-chip" data-quick="sources">${icon('layers')}模型源</button><button class="hint-chip" data-quick="runtimes">${icon('cpu')}运行环境</button>${hasProjects?`<button class="hint-chip" data-quick="project">${icon('folderPlus')}打开其他文件夹</button>`:''}</div></div>`;
  }
  mountComposer();
  if(s)renderChat(true);
}
function autosize(el){el.style.height='auto';el.style.height=`${Math.min(el.scrollHeight,Math.round(innerHeight*0.4))}px`;}
function mountComposer(){
  const slot=$('.composer-slot');
  if(!slot)return;
  slot.innerHTML=`<div class="composer${session()?'':' centered'}"><div id="composer-banner"></div><div class="queue-strip" id="queue-strip" hidden></div><div class="composer-box"><div class="attach-tray" id="attach-tray" hidden></div><textarea id="prompt" rows="1" aria-label="任务" spellcheck="false"></textarea><div class="composer-row" id="composer-controls"></div><div class="drop-hint" id="drop-hint" hidden></div></div><div class="composer-footer" id="composer-footer"></div></div>`;
  const prompt=$('#prompt');
  prompt.value=state.draft;
  prompt.addEventListener('input',e=>{state.draft=e.target.value;stashDraft();autosize(e.target);syncDraftMark();});
  prompt.addEventListener('compositionstart',e=>{e.target.dataset.composing='true';});
  prompt.addEventListener('compositionend',e=>{e.target.dataset.composing='false';state.draft=e.target.value;stashDraft();});
  prompt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();void submit();}});
  prompt.addEventListener('paste',e=>{
    const files=[...(e.clipboardData?.files??[])];
    if(!files.length)return;
    // A copied screenshot arrives as a file; keep any text that came along with it.
    e.preventDefault();
    const text=e.clipboardData.getData('text/plain');
    if(text){prompt.setRangeText(text,prompt.selectionStart,prompt.selectionEnd,'end');prompt.dispatchEvent(new Event('input'));}
    void addFiles(files);
  });
  renderComposerControls();renderBanner();renderFooter();renderTray();
  requestAnimationFrame(()=>autosize(prompt));
}
/** While a turn runs, the send button and the 插话/排队 choice show only once there is something to send. */
function syncDraftMark(){
  const box=$('.composer-box');
  if(box)box.classList.toggle('has-draft',!!state.draft.trim()||pending.list(attachKey()).some(x=>x.status!=='error'));
}
/** How a message typed during a run goes out: into the running turn when the runtime can take it, otherwise after it. */
function deliveryFor(s){return s?.interject?.steer===true&&state.delivery!=='queue'?'steer':'queue';}
function sendTitle(s){
  if(!busy(s))return'发送 (Enter)';
  return deliveryFor(s)==='steer'?'插话 (Enter)：模型下一步就能看到':`排队 (Enter)：本轮结束后自动发送${s?.interject?.steer===false&&s.interject.reason?`。${s.interject.reason}`:''}`;
}
/* ---------- messages waiting for the running turn to end ---------- */
function renderQueue(){
  const el=$('#queue-strip'),s=session();
  if(!el)return;
  const items=s?.queue??[];
  el.hidden=!items.length;
  if(!items.length){el.innerHTML='';return;}
  const running=busy(s);
  // A dispatch whose native receipt was never confirmed stays put until someone checks the native session.
  const held=new Set(s.queueDispatch?.ids??[]),onHold=items.some(q=>held.has(q.id));
  const head=running?`排队 ${items.length} 条 · 本轮结束后自动发送`:onHold?'上次发送后没收到原生确认，消息先保留，不会自动重发':`有 ${items.length} 条排队消息没有发出（上一轮没有正常结束）`;
  const actions=q=>held.has(q.id)?`<span class="queue-held" title="请在原生界面确认这条消息是否已经发出，再决定是否重发">待核对</span>`:`<button class="icon-btn xs" data-queue-edit="${esc(q.id)}" title="取回到输入框修改">${icon('edit')}</button><button class="icon-btn xs" data-queue-remove="${esc(q.id)}" title="删除这条">${icon('close')}</button>`;
  patchHtml(el,`<div class="queue-head">${icon(onHold&&!running?'alert':'clock')}<span>${esc(head)}</span>${running||onHold?'':`<button class="btn sm primary" data-queue-send="all">${icon('arrowUp')}现在发送</button>`}</div>${items.map(q=>`<div class="queue-item"><span class="queue-text" title="${esc(q.text)}">${esc(q.text||`${q.attachments?.length??0} 个附件`)}</span>${q.attachments?.length?`<span class="queue-att" title="${esc(q.attachments.map(a=>a.name).join('、'))}">${icon('paperclip')}${q.attachments.length}</span>`:''}${actions(q)}</div>`).join('')}`);
}
/** Takes a queued message back; its attachments are still staged, so they return to the tray as they were. */
async function dequeue(s,queueId){
  const item=await call('session:dequeue',{sessionId:s.id,queueId});
  await snapshot();renderQueue();
  return item??{text:'',attachments:[]};
}
async function editQueued(queueId){
  const s=session();if(!s)return;
  const item=await dequeue(s,queueId),key=attachKey();
  if(item.text)state.draft=state.draft.trim()?`${state.draft.replace(/\s+$/,'')}\n${item.text}`:item.text;
  for(const a of item.attachments??[])pending.add(key,{status:'ready',name:a.name,kind:a.kind,size:a.size,attachment:a});
  stashDraft();
  const prompt=$('#prompt');
  if(prompt){prompt.value=state.draft;autosize(prompt);prompt.focus();}
  renderTray();syncDraftMark();
}
async function removeQueued(queueId){
  const s=session();if(!s)return;
  const item=await dequeue(s,queueId);
  for(const a of item.attachments??[])void call('attachment:discard',{id:a.id}).catch(()=>{});
  toast('已删除这条排队消息');
}
/** After a failed or stopped turn, nothing in the queue goes out on its own: this sends it as one message. */
async function sendQueuedNow(){
  const s=session();if(!s?.queue?.length)return;
  const items=[];
  for(const q of [...s.queue])items.push(await dequeue(s,q.id));
  const text=items.map(x=>x.text).filter(Boolean).join('\n\n'),attachments=items.flatMap(x=>x.attachments??[]);
  const now=session(),delivery=busy(now)?'queue':undefined;
  try{await call('session:prompt',{sessionId:s.id,text,...(attachments.length?{attachments:attachments.map(a=>a.id)}:{}),...(delivery?{delivery}:{})});}
  catch(error){
    // Nothing is lost: what could not go out comes back to the draft.
    const key=attachKey();
    state.draft=[state.draft.trim(),text].filter(Boolean).join('\n');
    for(const a of attachments)pending.add(key,{status:'ready',name:a.name,kind:a.kind,size:a.size,attachment:a});
    const prompt=$('#prompt');if(prompt){prompt.value=state.draft;autosize(prompt);}
    renderTray();syncDraftMark();throw error;
  }
  await snapshot();renderComposerControls();renderFooter();
}
/* ---------- attachments (images, video, audio) ---------- */
const attachKey=()=>views.draftKey(state);
/** What the current runtime and model accept: a backend answer, undefined while it is asked, null when the backend has no attachment support. */
function attachCaps(){
  const s=session();
  if(s&&s.attachments!==undefined)return s.attachments;
  const runtimeId=s?s.runtimeId:state.runtimeId,selection=s?s.selection:composerSelection();
  if(!runtimeId||!selection?.modelKey)return Object.fromEntries(KINDS.map(k=>[k,{allowed:false,reason:'请先选择模型'}]));
  const key=capabilityKey(runtimeId,selection);
  if(capCache.has(key))return capCache.get(key);
  if(!capLoading.has(key)){
    capLoading.add(key);
    call('attachment:capabilities',{runtimeId,selection}).catch(()=>null).then(caps=>{capLoading.delete(key);capCache.set(key,caps??null);renderComposerControls();});
  }
  return undefined;
}
function attachButtonHtml(){
  if(!project())return'';
  const caps=attachCaps(),kinds=allowedKinds(caps);
  if(caps===null)return'';
  const tip=kinds.length?`添加${kinds.map(kindName).join('、')}（也可以拖进来或粘贴）`:refusal(caps);
  return`<button class="chip-btn attach-btn${kinds.length?'':' unavailable'}" id="attach-btn" title="${esc(tip)}" aria-label="${esc(tip)}">${icon('paperclip')}</button>`;
}
function renderTray(){
  const el=$('#attach-tray');
  if(!el)return;
  const items=pending.list(attachKey());
  el.hidden=!items.length;
  patchHtml(el,trayHtml(items));
  syncDraftMark();
}
/** Stage dropped or pasted files: the backend checks the bytes and keeps them under a random id. */
async function addFiles(files){
  if(!project()){toast('请先打开一个工作文件夹',true);return;}
  const caps=attachCaps(),key=attachKey(),projectId=state.projectId;
  if(!caps){toast(refusal(caps),true);return;}
  const refused=[],jobs=[],allowed=allowedKinds(caps),turn=caps.turn??{};
  // Per-turn limits count what is already in the draft (failed items do not go out).
  const queued=pending.list(key).filter(x=>x.status!=='error');
  let count=queued.length,total=queued.reduce((n,x)=>n+(x.attachment?.size??x.size??0),0);
  for(const file of files){
    const kind=kindOf(file.name,caps),rule=kind?caps[kind]:null;
    if(!kind)refused.push(`${file.name}：不支持这种格式${allowed.length?`（可以添加 ${formatsText(caps,allowed)}）`:''}`);
    else if(!rule?.allowed)refused.push(`${file.name}：${refusal(caps,kind)}`);
    else if(rule.maxBytes&&file.size>rule.maxBytes)refused.push(`${file.name}：超过单个${kindName(kind)}上限 ${fileSize(rule.maxBytes)}`);
    else if(turn.maxCount&&count+1>turn.maxCount)refused.push(`${file.name}：每次最多发送 ${turn.maxCount} 个附件`);
    else if(turn.maxTotalBytes&&total+file.size>turn.maxTotalBytes)refused.push(`${file.name}：这一次的附件合计会超过 ${fileSize(turn.maxTotalBytes)}`);
    else{
      count++;total+=file.size;
      jobs.push(stageFile(key,projectId,pending.add(key,{status:'staging',name:file.name,kind,size:file.size}),file));
    }
  }
  if(refused.length)toast(refused.length>1?`${refused.length} 个文件没有添加：${refused.join('；')}`:refused[0],true);
  renderTray();
  await Promise.all(jobs);
}
async function stageFile(key,projectId,item,file){
  let attachment=null,error=null;
  try{attachment=await call('attachment:stage',{projectId,name:file.name,data:new Uint8Array(await file.arrayBuffer())});}catch(e){error=e.message;}
  // Removed while it was being staged: the backend copy is not wanted any more.
  if(!pending.list(key).some(x=>x.localId===item.localId)){if(attachment)void call('attachment:discard',{id:attachment.id}).catch(()=>{});return;}
  pending.update(key,item.localId,attachment?{status:'ready',attachment}:{status:'error',error});
  if(attachKey()===key)renderTray();
}
async function pickFiles(){
  const caps=attachCaps(),kinds=allowedKinds(caps);
  if(!kinds.length){toast(refusal(caps),true);return;}
  const key=attachKey(),turn=caps.turn??{};
  const picked=await call('attachment:pick',{projectId:state.projectId,kinds});
  const queued=pending.list(key).filter(x=>x.status!=='error'),refused=[];
  let count=queued.length,total=queued.reduce((n,x)=>n+(x.attachment?.size??x.size??0),0);
  for(const attachment of picked??[]){
    // The picker stages first; anything over this turn's limits goes straight back.
    const over=turn.maxCount&&count+1>turn.maxCount?`每次最多发送 ${turn.maxCount} 个附件`:turn.maxTotalBytes&&total+attachment.size>turn.maxTotalBytes?`这一次的附件合计会超过 ${fileSize(turn.maxTotalBytes)}`:null;
    if(over){refused.push(`${attachment.name}：${over}`);void call('attachment:discard',{id:attachment.id}).catch(()=>{});continue;}
    count++;total+=attachment.size;
    pending.add(key,{status:'ready',name:attachment.name,kind:attachment.kind,size:attachment.size,attachment});
  }
  if(refused.length)toast(refused.length>1?`${refused.length} 个文件没有添加：${refused.join('；')}`:refused[0],true);
  renderTray();
  $('#prompt')?.focus();
}
/** After a failed send the backend may clean attachments it had already taken: they cannot be resent. */
const discardedAttachments=new Set();
function markDiscarded(ids){
  for(const id of ids)discardedAttachments.add(id);
  let changed=false;
  for(const [key,list] of pending.byDraft)for(const item of list)
    if(item.status!=='error'&&discardedAttachments.has(item.attachment?.id)){pending.update(key,item.localId,{status:'error',error:'发送失败，附件已清理，请移除后重新添加'});changed=true;}
  if(changed)renderTray();
}
function removeAttachment(localId){
  const item=pending.remove(attachKey(),localId);
  if(item?.attachment?.id)void call('attachment:discard',{id:item.attachment.id}).catch(()=>{});
  renderTray();
}
/* Dropping files anywhere on the conversation view adds them to the draft. */
const carriesFiles=e=>[...(e.dataTransfer?.types??[])].includes('Files');
function showDropHint(on){
  const hint=$('#drop-hint'),box=$('.composer-box');
  if(!hint||!box)return;
  box.classList.toggle('dropping',on);
  if(!on){hint.hidden=true;return;}
  const caps=attachCaps(),kinds=allowedKinds(caps);
  hint.className=`drop-hint${kinds.length?'':' refused'}`;
  hint.innerHTML=kinds.length?`${icon('paperclip')}<span>松开即可添加${esc(kinds.map(kindName).join('、'))}</span>`:`${icon('alert')}<span>${esc(refusal(caps))}</span>`;
  hint.hidden=false;
}
function renderComposerControls(){
  const el=$('#composer-controls'),prompt=$('#prompt');
  if(!el)return;
  const s=session(),p=project(),running=busy(s),env=runtime(s?s.runtimeId:state.runtimeId);
  const steer=running&&deliveryFor(s)==='steer';
  prompt.placeholder=!p?'先打开一个工作文件夹，再开始…':s?(running?(steer?'补充或纠正要求，Enter 插话，模型下一步就能看到…':'Enter 排队，本轮结束后自动发送…'):'继续这个任务…'):'描述要完成的任务，Agent 会在所选文件夹中工作…';
  const selection=s?s.selection:composerSelection(),model=s?modelOf(s.selection):currentModel();
  const folder=s?'':`<button class="chip-btn" id="folder-chip" data-value="${esc(p?.id??'')}" title="${esc(p?.path??'选择工作文件夹')}">${icon('folder')}<span class="chip-text">${esc(p?.name??'选择文件夹')}</span>${icon('chevronDown','caret')}</button>`;
  const envOk=!!s||usable(env);
  const envChip=`<button class="chip-btn${s?' locked':''}${envOk?'':' unavailable'}" id="env-chip" data-value="${esc(env?.id??'')}" title="${s?'会话创建后不能更换运行环境':envOk?'先选择运行环境':esc(unusableReason(env))}">${tile(env)}<span class="chip-text">${esc(env?.name??'选择环境')}</span>${icon(s?'lock':'chevronDown','caret')}</button>`;
  const modelChip=`<button class="chip-btn model-chip" id="model-chip" data-value="${esc(selection.modelKey??'')}" title="${esc(modelTitle(selection,model,!!s))}">${icon('layers')}<span class="chip-text">${modelLabel(selection,model)}</span>${icon('chevronDown','caret')}</button>`;
  const permChip=permissionChipHtml(s,env);
  const waiting=!running&&!!env?.checking;
  // While a turn runs: stop is always there; send (with 插话/排队 when the runtime can take messages mid-turn) appears once something is typed.
  const choice=running&&s.interject?.steer===true?`<div class="delivery-seg" role="radiogroup" aria-label="运行中发送方式"><button role="radio" aria-checked="${steer}" class="${steer?'on':''}" data-delivery="steer" title="插进正在运行的这一轮，模型下一步就能看到">插话</button><button role="radio" aria-checked="${!steer}" class="${steer?'':'on'}" data-delivery="queue" title="等这一轮结束后再发送">排队</button></div>`:'';
  const actions=running
    ?`<div class="run-actions">${choice}<button class="send stop" id="stop-run" title="停止本轮" aria-label="停止本轮">${icon('stop')}</button><button class="send run-send" id="send" title="${esc(sendTitle(s))}" aria-label="${steer?'插话':'排队'}">${icon('arrowUp')}</button></div>`
    :`<button class="send" id="send" title="${waiting?'正在检测运行环境，稍等几秒':'发送 (Enter)'}" aria-label="发送" ${p&&envOk&&!waiting?'':'disabled'}>${icon('arrowUp')}</button>`;
  el.innerHTML=`<div class="composer-left">${attachButtonHtml()}${folder}${envChip}<span class="chip-sep">${icon('chevronRight')}</span>${modelChip}${permChip}</div>${actions}`;
  $('.composer-box')?.classList.toggle('running',running);
  syncDraftMark();renderQueue();
  if(menu&&!$('#popover').classList.contains('hidden'))placeMenu();
}
/* ---------- permission modes (native approval policy per runtime and session) ---------- */
const permissionIcons={ask:'shield','auto-review':'shieldCheck',auto:'zap',readonly:'lock'};
const permissionScopes={'exec-json':'原生模型','app-server':'第三方模型'};
/** The catalogue that applies: a session's own, or for a new session the runtime's — Codex
 * keeps one for native models (exec, no per-call questions) and one for gateway models. */
function permissionsFor(s,env){
  if(s)return s.permissions??env?.permissions??null;
  const p=env?.permissions;
  if(!p?.bySelection)return p??null;
  return (state.modelKey==='native'?p.bySelection.native:p.bySelection.gateway)??p;
}
/** Which Codex path a catalogue belongs to; older gateway sessions carry no protocol, so fall back to the model choice. */
function permissionScope(p,s,env){
  const named=permissionScopes[p.protocol]??(env?.id==='codex'?((s?s.selection?.modelKey:state.modelKey)==='native'?'原生模型':'第三方模型'):null);
  return named?` · ${named}`:'';
}
function permissionChoices(p){
  if(!p)return[];
  // null means "this runtime's own default"; it is a separate choice only when the
  // backend reports a null default (DSH's default is already one of its modes).
  if(p.default!=null)return [...(p.modes??[])];
  const args=p.defaultNative?.args?.length?p.defaultNative.args.join(' '):null;
  const description=args?'Bridge++ 的安全默认：可以编辑工作区文件，命令仍由原生权限决定（'+args+'）。':'沿用原生程序自己的设置，Bridge++ 不额外传授权参数。';
  return [{id:null,label:'默认',description},...(p.modes??[])];
}
function permissionLabel(p,mode){
  if(mode==null)return'默认';
  return p?.modes?.find(m=>m.id===mode)?.label??mode;
}
function sessionPermission(s){
  const next=s&&Object.hasOwn(s,'permissionModeNext')?s.permissionModeNext:undefined;
  // permissions.current already shows a safe migration (an old "ask" on native exec reads as read-only).
  return {mode:s?.permissions?(s.permissions.current??null):(s?.permissionMode??null),next};
}
function permissionChipHtml(s,env){
  const p=permissionsFor(s,env);if(!env?.installed||!p||!p.modes?.length)return'';
  const {mode,next}=s?sessionPermission(s):{mode:p.current??null,next:undefined};
  const label=permissionLabel(p,mode)+(next!==undefined?' → '+permissionLabel(p,next):'');
  const scope=permissionScope(p,s,env);
  const tip=s?'此会话的授权方式；运行中切换会在下一轮生效':`新会话的默认授权方式（${env.name}${scope}）`;
  return`<button class="chip-btn perm-chip${p.issue?' warn':''}${mode==='auto'||permissionWarning(env.id,mode)?' risky':''}" id="perm-chip" data-value="${esc(mode??'')}" title="${esc(tip)}">${icon(permissionIcons[mode]??'shield')}<span class="chip-text">${esc(label)}</span>${icon('chevronDown','caret')}</button>`;
}
function permissionMenuHtml(){
  const s=session(),env=runtime(s?s.runtimeId:state.runtimeId),p=permissionsFor(s,env);
  if(!p)return`<div class="menu-label">授权方式</div><div class="menu-static"><span class="mi-main"><span class="mi-sub">此运行环境没有可切换的授权方式。</span></span></div>`;
  const {mode,next}=s?sessionPermission(s):{mode:p.current??null,next:undefined};
  const scope=permissionScope(p,s,env);
  const head=s?`此会话 · ${esc(env.name)}${scope}${busy(s)?' · 下一轮生效':''}`:`新会话默认 · ${esc(env.name)}${scope}`;
  const items=permissionChoices(p).map(m=>{
    const id=m.id??null,selected=id===mode,queued=next!==undefined&&id===next&&id!==mode;
    return`<button class="menu-item perm-item${selected?' selected':''}" data-permission-choice="${esc(id??'__default')}">${icon(permissionIcons[id]??'shield','mi-icon')}<span class="mi-main"><span class="mi-name">${esc(m.label)}${queued?'<span class="mi-tag">下一轮</span>':''}</span><span class="mi-sub">${esc(m.description??'')}</span></span>${selected?icon('check','mi-check'):''}</button>`;
  }).join('');
  const issue=p.issue?`<div class="menu-note warn">${icon('alert')}<span>${esc(p.issue)}</span></div>`:'';
  const migrated=p.migration?.reason?`<div class="menu-note">${icon('info')}<span>${esc(p.migration.reason)}</span></div>`:'';
  const exec=p.protocol==='exec-json'?`<div class="menu-note">${icon('info')}<span>原生 Codex 按官方 CLI 的 exec 方式运行，不能逐条询问；需要更高权限的操作由原生沙箱拒绝，或交给自动审查。</span></div>`:'';
  // Measured on DSH: every tool call is reviewed by its own model request, so the request count roughly doubles.
  const review=env?.id==='dsh'&&p.modes?.some(m=>m.id==='auto-review')?`<div class="menu-note">${icon('zap')}<span>自动审查会在每次工具调用前另发一次模型请求，请求数大约翻倍，也更慢。</span></div>`:'';
  return`<div class="menu-label">授权方式 · ${head}</div>${items}${issue}${migrated}${exec}${review}<div class="menu-note">${icon('info')}<span>由原生运行环境执行：Bridge++ 只传原生参数或代你回答授权请求，不会越过原生沙箱。</span></div>`;
}
/** Applies a permission change; a mode that drops the sandbox asks first, unless it is already in effect. */
function changePermission(runtimeId,mode,current,apply){
  const warning=mode===current?null:permissionWarning(runtimeId,mode);
  if(!warning){void action(apply);return;}
  closeMenu();
  modal(warning.title,`<p class="modal-text">${esc(warning.text)}</p>`,apply,{confirm:warning.confirm,danger:true});
}
function runtimePermissionHtml(r){
  const p=r.permissions;if(!r.installed||!p)return'';
  // Codex: native models (exec) and gateway models (app-server) keep separate defaults.
  const scopes=p.bySelection?[['native',p.bySelection.native],['gateway',p.bySelection.gateway]]:[['',p]];
  return scopes.filter(([,c])=>c?.modes?.length).map(([scope,c])=>permissionBlockHtml(r,scope,c)).join('');
}
function permissionBlockHtml(r,scope,p){
  const choices=permissionChoices(p),current=p.current??null,chosen=choices.find(m=>(m.id??null)===current)??choices[0];
  const named=scope?permissionScopes[p.protocol]??(scope==='native'?'原生模型':'第三方模型'):'',title=named?` · ${named}`:'';
  const version=p.observed?.version?`<span class="perm-observed">已按本机 ${esc(String(p.observed.version))} 核实可用模式</span>`:'';
  const migrated=p.migration?.reason?`<p class="perm-desc">${esc(p.migration.reason)}</p>`:'';
  return`<div class="perm-block"><div class="perm-title">${icon('shield')}<span>授权方式</span><span class="perm-scope">· ${named?`${esc(named)} · `:''}新会话默认</span></div><div class="perm-options" role="radiogroup" aria-label="${esc(r.name)}${esc(title)} 授权方式">${choices.map(m=>{const id=m.id??null;return`<button class="perm-option${id===current?' active':''}" role="radio" aria-checked="${id===current}" data-runtime-permission="${esc(r.id)}|${esc(id??'__default')}|${esc(scope)}" title="${esc(m.description??'')}">${icon(permissionIcons[id]??'shield')}${esc(m.label)}</button>`;}).join('')}</div><p class="perm-desc">${esc(chosen?.description??p.description??'')}</p>${migrated}${version}${p.issue?`<p class="perm-issue">${icon('alert')}<span>${esc(p.issue)}</span></p>`:''}</div>`;
}
function renderBanner(){
  const el=$('#composer-banner');
  if(!el)return;
  const s=session(),notes=[];
  if(s?.selectionIssue){
    el.innerHTML=`<div class="banner warn" id="session-model-warning">${icon('alert')}<span>${esc(s.selectionIssue)}</span><span class="banner-actions"><button class="btn sm" id="refresh-session-model">刷新来源</button><button class="btn primary sm" id="rebind-session-model" ${busy(s)?'disabled':''}>重新确认模型</button></span></div>`;
    return;
  }
  if(!s&&project()){
    const env=runtime(state.runtimeId);
    if(!state.snapshot.runtimes.some(usable)&&env?.checking){
      el.innerHTML=`<div class="banner"><span class="spinner"></span><span>正在检测开发环境…</span></div>`;
      return;
    }
    if(!state.snapshot.runtimes.some(usable)){
      el.innerHTML=`<div class="banner warn">${icon('alert')}<span>还没有可用的开发环境。装好 DeepSeek Harness 或 Kimi Code 中的任意一个就能开始。</span><span class="banner-actions"><button class="btn primary sm" id="open-guide">查看引导</button></span></div>`;
      return;
    }
    if(env&&!usable(env))notes.push(env.checking?`${unusableReason(env)}…`:`${unusableReason(env)}。请换一个运行环境，或到设置 → 运行环境处理。`);
    else if(!state.modelKey)notes.push(state.runtimeId==='dsh'?'DSH 统一会话需要 Qoder CN 或 WorkBuddy 模型。请在设置 → 模型源下载组件并登录。':'请选择模型。');
    else if(state.modelKey!=='native'&&!currentModel())notes.push('所选模型不在当前目录中，请重新选择或刷新模型源。');
  }
  const limit=s&&!busy(s)?limitNotice(s.lastFailure):'';
  if(limit)notes.push(limit);
  el.innerHTML=notes.map(text=>`<div class="banner">${icon('info')}<span>${esc(text)}</span></div>`).join('');
}
function ringSvg(ratio){
  const r=8.5,c=2*Math.PI*r,level=ratio==null?'none':ratio>=0.85?'high':ratio>=0.6?'mid':'low';
  return`<svg class="ring ${level}" viewBox="0 0 22 22" aria-hidden="true"><circle class="ring-track" cx="11" cy="11" r="${r}"/>${ratio==null?'':`<circle class="ring-value" cx="11" cy="11" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c*(1-ratio)).toFixed(2)}" transform="rotate(-90 11 11)"/>`}</svg>`;
}
function selectionWindow(s){const m=modelOf(s.selection);return s.selection.contextBudget??s.selection.contextTokens??m?.contextMaximum??null;}
function turnStartedAt(){for(let i=state.events.length-1;i>=0;i--)if(state.events[i].type==='user'&&state.events[i].delivery!=='steer')return state.events[i].at;return session()?.updatedAt;}
function renderFooter(){
  const el=$('#composer-footer');
  if(!el)return;
  const s=session();
  if(!s){patchHtml(el,`<span class="footer-left">${icon('keyboard')}Enter 发送 · Shift + Enter 换行</span><span class="footer-center"></span><span class="footer-right"></span>`);return;}
  const live=busy(s),rate=metrics.rate(Date.now(),live),cache=metrics.cache(),ctx=metrics.context(selectionWindow(s));
  const rateText=rate?`${rate.estimated?'≈':''}${rate.value>=100?Math.round(rate.value):rate.value.toFixed(1)} tok/s`:'— tok/s';
  const rateTitle=rate?rate.live?'实时输出速率（按流式文字估算）':rate.estimated?'最近一次请求的输出速率（按流式文字估算）':'最近一次请求的输出速率（来源报告的 token 数）':'还没有速率数据';
  const cacheText=cache?`${cache.status==='estimated'?'≈':''}${pct(cache.ratio)}`:'未报告';
  const cacheTitle=cache?`最近一次请求命中 ${pct(cache.ratio)}，本会话累计 ${pct(cache.sessionRatio)}${cache.status==='estimated'?'（估算）':''}`:'当前运行环境或模型源没有报告缓存命中';
  const ctxTitle=ctx.used!==null?`上下文已用 ${compact(ctx.used)} / ${compact(ctx.window)} tokens`:ctx.window?`上下文窗口 ${compact(ctx.window)} tokens，还没有用量数据`:'还没有上下文数据';
  // Patched in place: the footer redraws on every stream chunk and every second, which would otherwise reset tooltips, the pulse and the ring transition.
  patchHtml(el,`<span class="footer-left"><span class="dot ${esc(s.status)}"></span><span class="footer-status">${esc(live?activityOf(s).long:labels[s.status]??s.status)}</span>${live?`<span class="footer-elapsed">· ${elapsed(turnStartedAt())}</span>`:''}</span>
    <span class="footer-center"><span class="metric" title="${esc(rateTitle)}">${icon('zap')}${rateText}</span><span class="metric-sep"></span><span class="metric" title="${esc(cacheTitle)}">${icon('database')}缓存命中 ${cacheText}</span></span>
    <span class="footer-right" title="${esc(ctxTitle)}" id="context-ring"><span class="ctx-text">${ctx.ratio!==null?pct(ctx.ratio):ctx.window?compact(ctx.window):'—'}</span>${ringSvg(ctx.ratio)}</span>`);
}
function tick(){
  const live=state.snapshot?.sessions.some(busy);
  if(live&&!tickTimer)tickTimer=setInterval(()=>{
    if(busy(session())){
      renderFooter();
      const w=$('#working-elapsed');
      if(w)w.textContent=elapsed(turnStartedAt());
    }
    for(const el of document.querySelectorAll('[data-elapsed-from]'))el.textContent=elapsed(el.dataset.elapsedFrom);
  },1000);
  else if(!live&&tickTimer){clearInterval(tickTimer);tickTimer=null;}
}

/* ---------- transcript ---------- */
function markdown(text){
  const clean=replaceMath(DOMPurify.sanitize(marked.parse(text??'',{breaks:true,gfm:true}),{FORBID_TAGS:['img','style','input','button','form','iframe'],FORBID_ATTR:['style','id']}));
  // Media is inserted after sanitising, and only with bridge-media: URLs the backend resolved.
  return clean.includes('data-md-media=')?{html:replaceMarkers(clean,lookupMedia),media:true}:{html:clean,media:false};
}
/** Only the streaming message changes between renders; reuse everyone else's parsed markdown. */
function cachedMarkdown(e){
  const hit=markdownCache.get(e.id);
  if(hit?.text===e.text&&(!hit.media||hit.gen===mediaGen))return hit.html;
  if(markdownCache.size>600)markdownCache.clear();
  const {html,media}=markdown(e.text);
  markdownCache.set(e.id,{text:e.text,html,media,gen:mediaGen});
  return html;
}
/** A local image the assistant referenced: undefined while the backend looks it up, null if it is not a project or session media file. */
function lookupMedia(href){
  const sessionId=state.sessionId,key=`${sessionId}\u0000${href}`;
  if(mediaLookup.has(key))return mediaLookup.get(key);
  if(sessionId&&!mediaResolving.has(key)){
    mediaResolving.add(key);
    call('media:resolve',{sessionId,href}).catch(()=>null).then(found=>{
      mediaResolving.delete(key);mediaLookup.set(key,found??null);mediaGen++;
      if(state.sessionId===sessionId)scheduleChat();
    });
  }
  return undefined;
}
function toolOutput(t){
  const parts=t.outputs.map(o=>typeof o.text==='string'&&o.text?o.text:'').filter(Boolean);
  if(parts.length)return parts.join('');
  const d=t.end?.data;
  if(!d)return'';
  const content=d.message?.content??d.content;
  if(Array.isArray(content)){
    const text=content.map(p=>p?.text??p?.content?.text??'').join('');
    if(text)return text;
  }
  if(typeof d.error?.message==='string')return d.error.message;
  return d.item?.aggregatedOutput??d.rawOutput??pretty(d);
}
// Codex reports item types (camelCase over app-server, snake_case from exec), Antigravity snake_case tool names; show them in words.
const toolNames={commandExecution:'运行命令',command_execution:'运行命令',fileChange:'修改文件',file_change:'修改文件',webSearch:'网络搜索',web_search:'网络搜索',mcpToolCall:'MCP 工具',mcp_tool_call:'MCP 工具',imageGeneration:'生成图片',image_generation:'生成图片',todo_list:'待办',
  read_file:'读取文件',view_file:'读取文件',run_command:'运行命令',command_status:'命令状态',send_command_input:'命令输入',list_dir:'浏览目录',find_by_name:'查找文件',grep_search:'搜索代码',write_to_file:'写入文件',replace_file_content:'修改文件',multi_replace_file_content:'修改文件',sed_file:'修改文件',search_web:'网络搜索',read_url_content:'读取网页',generate_image:'生成图片',call_mcp_tool:'MCP 工具',invoke_subagent:'子代理',browser_subagent:'浏览器子代理'};
/** A path into this session's media folder is named by attachment id; show the file name the user picked. */
function attachmentSummary(summary,names){
  const id=/[\\/]([0-9a-f-]{36})\.[a-z0-9]+$/i.exec(summary)?.[1];
  return id&&names.has(id)?`附件 · ${names.get(id)}`:summary;
}
const toolMark=status=>status==='running'?'<span class="spinner"></span>':icon(status==='failed'?'alert':status==='done'?'check':'clock','tool-status');
function toolBlock(key,t,running,names=new Map()){
  const start=t.start,end=t.end,raw=start?.name??end?.name??'工具',name=toolNames[raw]??raw;
  const status=toolStatus(t,running),summary=attachmentSummary(toolSummary(start??end),names),file=start?.data?toolFilePath(argsOf(start.data)):null;
  const input=start?.data?clip(pretty(argsOf(start.data))):'',output=clip(toolOutput(t));
  return`<details class="tool ${status}" data-expand="tool-${esc(key)}"><summary>${toolMark(status)}<span class="tool-name">${esc(name)}</span><span class="tool-summary"${file?` data-link-path="${esc(file)}"`:''}>${esc(summary===raw?'':summary)}</span>${icon('chevronRight','tool-caret')}</summary><div class="tool-body">${input&&input!=='{}'?`<div class="tool-label">输入</div><pre>${esc(input)}</pre>`:''}${output?`<div class="tool-label">输出</div><pre>${esc(output)}</pre>`:''}${!input&&!output?'<div class="tool-label">没有可显示的参数</div>':''}</div></details>`;
}
/** One row for a run of tool calls. Its rows are only built while it is open, which keeps long transcripts light. */
function foldBlock(run,running,open){
  const first=run.find(b=>b.work.tool).key.replace(/^tool:/,''),id=`tools-${first}`,{status,title,detail}=foldSummary(run,running);
  return[`tools:${first}`,`<details class="tool tool-fold ${status}" data-expand="${esc(id)}"><summary>${toolMark(status)}<span class="tool-name">${esc(title)}</span><span class="tool-summary">${esc(detail)}</span>${icon('chevronRight','tool-caret')}</summary><div class="tool-fold-body">${open.has(id)?run.map(b=>b.html()).join(''):''}</div></details>`];
}
function diffStat(text){
  let files=0,adds=0,dels=0;
  for(const line of text.split('\n')){
    if(line.startsWith('diff --git'))files++;
    else if(line.startsWith('+')&&!line.startsWith('+++'))adds++;
    else if(line.startsWith('-')&&!line.startsWith('---'))dels++;
  }
  return`${files||1} 个文件 · +${adds} −${dels}`;
}
function diffHtml(text){
  if(!text)return'<div class="pane-empty small">没有文本差异。</div>';
  return`<pre class="diff">${clip(text,300000).split('\n').map(l=>`<span class="dl${l.startsWith('diff ')||l.startsWith('+++')||l.startsWith('---')||l.startsWith('index ')?' dh':l.startsWith('+')?' da':l.startsWith('-')?' dd':l.startsWith('@@')?' dk':''}">${esc(l)||' '}</span>`).join('')}</pre>`;
}
function approvalSummary(e){
  const d=e.data??{};
  if(e.type==='question'){
    const qs=Array.isArray(d.questions)?d.questions.map(q=>q.question??q.prompt??'').filter(Boolean):[d.question??d.prompt??d.message].filter(Boolean);
    return qs.join('\n');
  }
  const v=argsOf(d.toolCall??d);
  const command=Array.isArray(d.command)?d.command.join(' '):d.command;
  return[d.toolCall?.title,command,d.reason,v.command&&(Array.isArray(v.command)?v.command.join(' '):v.command),v.file_path??v.path,d.grantRoot].find(x=>typeof x==='string'&&x.trim())??'';
}
function approvalBlock(e,resolved){
  const done=resolved.get(e.approvalId);
  if(done!==undefined)return`<div class="approval-done ${done==='reject'||done==='reject-session'?'rejected':''}">${icon(done==='expired'?'clock':done?.startsWith?.('reject')?'close':'check')}<span>${e.type==='question'?'问题':'授权'}${esc(resolvedLabels[done]??'已处理')}</span><span class="muted">${esc(e.name??'')}</span></div>`;
  const summary=approvalSummary(e),choices=e.choices?.length?e.choices:['approve','reject'];
  let buttons;
  if(choices.includes('native'))buttons='<button class="btn primary sm" data-approval-native="true">在完整工具界面处理</button>';
  else if(e.type==='question')buttons=`<button class="btn primary sm" data-question="${esc(e.approvalId)}">回答</button><button class="btn sm" data-approval-native="true">在原生界面处理</button>`;
  else buttons=choices.filter(c=>choiceLabels[c]).map(c=>`<button class="btn sm${c==='approve'?' primary':c.startsWith('reject')?' danger':''}" data-approval="${esc(e.approvalId)}" data-choice="${esc(c)}">${choiceLabels[c]}</button>`).join('');
  return`<div class="approval-card"><div class="approval-head">${icon(e.type==='question'?'info':'key')}<b>${e.type==='question'?'Agent 需要你补充信息':'Agent 请求授权'}</b>${e.name?`<span class="muted">${esc(e.name)}</span>`:''}</div>${summary?`<div class="approval-summary">${esc(summary)}</div>`:''}<details class="approval-details" data-expand="approval-${esc(e.approvalId)}"><summary>详细参数</summary><pre>${esc(clip(pretty(e.data)))}</pre></details><div class="approval-actions">${buttons}</div></div>`;
}
/** `live` is true only for the newest plan of the turn that is running now: an item stays "in
 * progress" in the record after a turn stops, but nothing is working on it any more. */
function planBlock(e,live){
  const d=e.data??{},items=(d.entries??d.plan??[]).map(x=>({text:x.content??x.step??'',status:String(x.status??'')}));
  if(!items.length)return miscBlock(e,'list','计划');
  const doing=x=>/progress/i.test(x.status),stalled=!live&&items.some(doing);
  const mark=x=>x.status==='completed'?icon('check'):doing(x)?(live?'<span class="spinner"></span>':'<span class="plan-stalled" title="这一轮已经结束，这一项没有完成"></span>'):'<span class="plan-dot"></span>';
  return`<div class="plan-card"><div class="plan-head">${icon('list')}<span>计划</span><span class="muted">${items.filter(x=>x.status==='completed').length}/${items.length}</span>${stalled?'<span class="plan-state">未完成</span>':''}</div><ul>${items.map(x=>`<li class="${doing(x)?(live?'doing':'stalled'):x.status==='completed'?'done':''}">${mark(x)}<span>${esc(x.text)}</span></li>`).join('')}</ul></div>`;
}
const steerNotes={
  pending:['clock','插话 · 等待插入下一步'],
  delivered:['check','插话 · 已送达，模型下一步会看到'],
  carried:['chevronRight','插话 · 这一轮先结束了，已作为下一轮的输入'],
  failed:['alert','插话没有送达，已放回排队'],
};
/** A message sent mid-turn says where it went; one that waited in the queue says so too. */
function userBlock(e,discarded,steers){
  let note='';
  if(e.delivery==='steer'){
    const s=steers.get(e.steerId),key=steerNotes[s?.state]?s.state:'pending',[ico,text]=steerNotes[key];
    note=`<div class="user-note ${key}"${s?.reason?` title="${esc(s.reason)}"`:''}>${icon(ico)}<span>${esc(text)}${key==='failed'&&s?.reason?`：${esc(s.reason)}`:''}</span></div>`;
  }else if(e.fromQueue?.length)note=`<div class="user-note queued">${icon('clock')}<span>${e.fromQueue.length>1?`排队的 ${e.fromQueue.length} 条消息，合并发出`:'排队消息，上一轮结束后发出'}</span></div>`;
  return`<article class="message user-message${e.delivery==='steer'?' steer':''}">${userMediaHtml(e.attachments,discarded)}${e.text?`<div class="user-bubble">${esc(e.text)}</div>`:''}${note}<div class="user-meta">${clock(e.at)}</div></article>`;
}
function miscBlock(e,ico,label){
  return`<details class="tool" data-expand="${esc(e.id)}"><summary>${icon(ico,'tool-status')}<span class="tool-name">${label}</span><span class="tool-summary">${esc(toolSummary(e))}</span>${icon('chevronRight','tool-caret')}</summary><div class="tool-body"><pre>${esc(clip(e.text??pretty(e.data??{})))}</pre></div></details>`;
}
function diffBlock(e){
  const text=typeof e.text==='string'&&e.text?e.text:null;
  return`<details class="tool diff-event" data-expand="diff-${esc(e.turnId??e.id)}"><summary>${icon('fileDiff','tool-status')}<span class="tool-name">代码变更</span><span class="tool-summary">${esc(text?diffStat(text):'工作区变更')}</span>${icon('chevronRight','tool-caret')}</summary><div class="tool-body">${text?diffHtml(text):`<pre>${esc(clip(pretty(e.data)))}</pre>`}</div></details>`;
}
function turnEndBlock(e){
  const t=e.turnId?metrics.turn(e.turnId):null,why=['completed','paused'].includes(e.status)?'':stopLabel(e.reason),parts=[{completed:'本轮完成',interrupted:'已停止',failed:'本轮未完成',paused:'已暂停'}[e.status]??'本轮结束',...why?[why]:[],clock(e.at)];
  if(t?.input!=null)parts.push(`输入 ${compact(t.input)}`);
  if(t?.output!=null)parts.push(`输出 ${compact(t.output)}`);
  if(t?.cacheRatio!=null)parts.push(`缓存 ${t.cacheStatus==='estimated'?'≈':''}${pct(t.cacheRatio)}`);
  parts.push(...turnExtras(e.stats));
  return`<div class="turn-end ${esc(e.status)}"><span>${parts.map(esc).join(' · ')}</span></div>`;
}
/** `quiet` renders blocks that were already there (opening a session, rebuilding the view) without entrance animation. */
function renderChat(quiet=false){
  const chat=$('#chat'),scroller=$('#scroller');
  if(!chat||!scroller)return;
  const s=session(),running=busy(s),events=state.events,blocks=[],keys=new Set();
  const add=(key,html,work)=>{if(keys.has(key))key+=`#${blocks.length}`;keys.add(key);blocks.push({key,html,work});};
  const open=new Set([...chat.querySelectorAll('details[data-expand][open]')].map(el=>el.dataset.expand));
  const resolved=new Map(events.filter(e=>e.type==='approval-resolved').map(e=>[e.approvalId,e.choice]));
  const discarded=new Set(events.filter(e=>e.type==='attachments-discarded').flatMap(e=>e.attachmentIds??[]));
  const names=new Map(events.filter(e=>e.type==='user').flatMap(e=>(e.attachments??[]).map(a=>[a.id,a.name])));
  const steers=new Map(events.filter(e=>e.type==='steer-state').map(e=>[e.steerId,e]));
  // Only the newest plan of the running turn can still be in progress.
  const liveTurn=running?events.findLast(e=>e.type==='user'&&e.delivery!=='steer')?.turnId:null;
  const livePlan=liveTurn?events.findLast(e=>e.type==='plan'&&e.turnId===liveTurn)?.id:null;
  const tools=new Map(),lastDiff=new Map(),toolKey=e=>e.toolId??e.data?.callId??null;
  // The gateway and the completion check repeat the upstream's words as an error; its card already shows them.
  const upstreamSaid=new Set(events.filter(e=>e.type==='upstream-error').map(e=>`${e.turnId}\u0000${e.message}`));
  for(const e of events){
    if(toolKey(e)&&['tool-start','tool-output','tool-end'].includes(e.type)){
      const t=tools.get(toolKey(e))??{outputs:[]};
      if(e.type==='tool-start')t.start??=e;else if(e.type==='tool-end')t.end=e;else t.outputs.push(e);
      tools.set(toolKey(e),t);
    }else if(e.type==='diff')lastDiff.set(e.turnId??'none',e);
  }
  for(const e of events){
    if(e.type==='user')add(`user:${e.id}`,userBlock(e,discarded,steers));
    else if(e.type==='media')add(`media:${e.id}`,`<article class="message media-message">${mediaCardHtml(e)}</article>`);
    // Codex can close a turn with an empty final answer (e.g. after a generated image); nothing to show.
    else if(e.type==='text'){if(!e.text?.trim())continue;add(`text:${e.id}`,`<article class="message"><div class="message-content markdown">${cachedMarkdown(e)}</div><div class="message-tools"><button class="icon-btn xs copy-answer" title="复制">${icon('copy')}</button></div></article>`);}
    else if(e.type==='thinking')add(`thinking:${e.id}`,()=>`<details class="thinking" data-expand="thinking-${esc(e.id)}"><summary>${icon('bulb')}<span>思考过程</span><span class="muted">${(e.text??'').length.toLocaleString()} 字</span>${icon('chevronRight','tool-caret')}</summary><div class="thinking-body">${esc(clip(e.text??'',60000))}</div></details>`,{thinking:true});
    else if(['tool-start','tool-output','tool-end'].includes(e.type)){
      const key=toolKey(e);
      if(!key){const t={start:e.type==='tool-start'?e:null,outputs:e.type==='tool-output'?[e]:[],end:e.type==='tool-end'?e:null};add(`tool:${e.id}`,()=>toolBlock(e.id,t,running,names),{tool:t});continue;}
      const t=tools.get(key);
      if(t.rendered)continue;
      t.rendered=true;add(`tool:${key}`,()=>toolBlock(key,t,running,names),{tool:t});
    }else if(e.type==='subagent')add(`subagent:${e.id}`,miscBlock(e,'bot','子代理'));
    else if(e.type==='plan')add(`plan:${e.id}`,planBlock(e,e.id===livePlan));
    else if(e.type==='diff'){if(lastDiff.get(e.turnId??'none')===e)add(`diff:${e.turnId??e.id}`,diffBlock(e));}
    else if(e.type==='approval'||e.type==='question')add(`approval:${e.approvalId??e.id}`,approvalBlock(e,resolved));
    else if(e.type==='error'||e.type==='notice'){
      if(e.type==='error'&&upstreamSaid.has(`${e.turnId}\u0000${e.text}`))continue;
      // Bridge wait/retry lines are live status; only retries stay in the transcript, in plain words.
      const note=e.type==='notice'&&e.source==='gateway'?gatewayNotice(e.text):null;
      if(note?.transient)continue;
      // Warnings the native CLI prints about the user's own config: not actionable here, so keep them quiet.
      const quiet=e.type==='notice'&&e.source==='native-warning';
      add(`note:${e.id}`,`<div class="event-note ${e.type}${quiet?' quiet':''}"${quiet?` title="${esc(e.text)}"`:''}>${icon(e.type==='error'?'alert':'info')}<span>${esc(note?`${note.long}${note.detail?` · ${note.detail}`:''}`:e.text)}</span>${e.detail?`<details><summary>诊断详情</summary><pre>${esc(e.detail)}</pre></details>`:''}</div>`);
    }
    else if(e.type==='upstream-error'){
      const last=blocks.at(-1);
      if(sameUpstream(last?.upstream?.e,e)){last.upstream.count++;last.html=upstreamHtml(last.upstream.e,last.upstream.count);continue;}
      add(`upstream:${e.id}`,upstreamHtml(e));blocks.at(-1).upstream={e,count:1};
    }
    else if(e.type==='turn-end'){
      // The closing line names the cause; spell it out here unless an error above already did.
      const said=new Set(events.filter(x=>x.turnId===e.turnId&&['error','upstream-error'].includes(x.type)).flatMap(x=>[x.text,x.message]));
      const note=e.status==='completed'?'':stopNote(e.reason,said);
      if(note)add(`stop:${e.id}`,`<div class="event-note error">${icon('alert')}<span>${esc(note)}</span></div>`);
      add(`end:${e.id}`,turnEndBlock(e));
    }
  }
  if(state.historyLoading)add('loading','<div class="empty-chat">正在读取会话记录…</div>');
  else if(!events.length)add('empty',`<div class="empty-chat">${icon('spark')}<span>会话已准备好，发送第一个任务开始协作。</span></div>`);
  if(running){
    const now=activityOf(s);
    add('working',`<div class="working" data-state="${esc(now.kind)}"><span class="pulse"></span><span class="working-label">${esc(now.long)}</span>${now.detail?`<span class="working-detail" title="${esc(now.detail)}">${esc(now.detail)}</span>`:''}<span class="working-elapsed" id="working-elapsed">${elapsed(turnStartedAt())}</span></div>`);
  }
  const near=scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<160;
  patchBlocks(chat,foldRuns(blocks).map(b=>b.fold?foldBlock(b.fold,running,open):[b.key,b.work?b.html():b.html]),quiet);
  for(const el of chat.querySelectorAll('details[data-expand]'))el.open=open.has(el.dataset.expand);
  if(near||events.length<3)scroller.scrollTop=scroller.scrollHeight;
}
/** Keep the short status in the sidebar and tasks list current without re-rendering those lists. */
function paintActivity(id){
  const s=state.snapshot?.sessions.find(x=>x.id===id);
  if(!s||!busy(s))return;
  const text=activityOf(s).short;
  for(const el of document.querySelectorAll(`[data-activity="${CSS.escape(id)}"]`))if(el.textContent!==text)el.textContent=text;
}
function stopSession(id){
  stopping.add(id);paintActivity(id);
  if(id===state.sessionId)scheduleChat();
  void action(async()=>{
    try{await call('session:cancel',{sessionId:id});}
    catch(error){stopping.delete(id);paintActivity(id);if(id===state.sessionId)scheduleChat();throw error;}
  });
}
function scheduleChat(){
  if(chatTimer)return;
  chatTimer=setTimeout(()=>{chatTimer=null;renderChat();renderFooter();},55);
}

/* ---------- popover menus ---------- */
function openMenu(anchor,kind){
  closeMenu();
  menu={kind,anchorId:anchor.id};
  if(kind==='model'){
    state.menuSearch='';openGroups.clear();
    const s=session();
    if(s)state.params={reasoning:s.selection.reasoning??'',contextTokens:s.selection.contextTokens??null,contextBudget:s.selection.contextBudget??null};
  }
  paintMenu();
}
function closeMenu(){
  menu=null;
  const el=$('#popover');
  el.classList.add('hidden');el.innerHTML='';
}
function paintMenu(){
  if(!menu)return;
  const el=$('#popover');
  el.className=`popover ${menu.kind}-menu`;
  el.innerHTML=menu.kind==='model'?modelMenuHtml():menu.kind==='env'?envMenuHtml():menu.kind==='folder'?folderMenuHtml():menu.kind==='permission'?permissionMenuHtml():menu.kind==='file'?fileMenuHtml():menu.kind==='link'?linkMenuHtml():sessionMenuHtml();
  bind('#menu-search','input',e=>{state.menuSearch=e.target.value;const list=$('#menu-list');if(list)list.innerHTML=modelListHtml();});
  bindNativeInputs();
  if(menu.kind==='model')syncNativeChoice();
  placeMenu();
  $('#popover .menu-item.selected')?.scrollIntoView({block:'nearest'});
  $('#menu-search')?.focus();
}
function placeMenu(){
  if(!menu)return;
  const anchor=document.getElementById(menu.anchorId),el=$('#popover');
  if(!anchor&&!menu.at){closeMenu();return;}
  if(menu.at){el.style.left=`${Math.max(8,Math.min(menu.at.x,innerWidth-el.offsetWidth-8))}px`;el.style.top=`${Math.max(8,Math.min(menu.at.y,innerHeight-el.offsetHeight-8))}px`;return;}
  const a=anchor.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight,above=a.top>innerHeight/2;
  el.style.left=`${Math.max(8,Math.min(a.left,innerWidth-w-8))}px`;
  el.style.top=`${above?Math.max(8,a.top-h-8):Math.min(innerHeight-h-8,a.bottom+8)}px`;
}
/* ---------- file links: click to preview, right-click for more ---------- */
const fileTarget=node=>{
  const el=node.closest?.('[data-link-path],[data-file-path],[data-diff-file]');
  return el?{path:el.dataset.linkPath??el.dataset.filePath??el.dataset.diffFile,line:Number(el.dataset.linkLine)||null}:null;
};
const locateFile=path=>call('file:locate',{projectId:state.projectId,path});
function fileMenuHtml(){
  const f=menu.file,here=f.inside&&f.exists,name=f.path.split(/[\\/]/).filter(Boolean).pop()??f.path;
  const item=(id,glyph,label,on=true)=>`<button class="menu-item" data-file-menu="${id}" ${on?'':'disabled'}>${icon(glyph,'mi-icon')}<span class="mi-main"><span class="mi-name">${label}</span></span></button>`;
  const note=here?'':`<div class="menu-note">${icon('info')}<span>${f.inside?'这个文件已经不存在':'不在当前工作文件夹里，只能复制路径'}</span></div>`;
  return`<div class="menu-label" title="${esc(f.path)}">${esc(name)}</div>${item('preview','eye','预览',here&&!!f.preview)}${item('reveal','folder','在资源管理器中显示',here)}${item('open','external','用默认应用打开',here&&f.kind==='file'&&f.openable!==false)}${item('copy','copy','复制路径')}${note}${here&&f.kind==='file'&&f.openable===false?`<div class="menu-note">${icon('info')}<span>这类文件可能会运行程序，不能直接打开，可以在资源管理器里查看</span></div>`:''}`;
}
function linkMenuHtml(){
  const {host}=new URL(menu.url);
  return`<div class="menu-label" title="${esc(menu.url)}">${esc(host)}</div><button class="menu-item" data-link-menu="open">${icon('external','mi-icon')}<span class="mi-main"><span class="mi-name">在浏览器中打开</span></span></button><button class="menu-item" data-link-menu="copy">${icon('copy','mi-icon')}<span class="mi-main"><span class="mi-name">复制链接</span></span></button>`;
}
async function previewFile(f,line){
  if(!f.inside||!f.exists)throw new Error(f.inside?'这个文件已经不存在':'这个文件不在当前工作文件夹里');
  if(f.preview==='pdf'){await call('file:previewPdf',{projectId:state.projectId,path:f.relative});return;}
  if(f.preview==='image'){
    const found=await call('media:resolve',{sessionId:state.sessionId,href:f.absolute});
    if(!found?.url)throw new Error('这张图片不能预览');
    openLightbox(found.url,found.name??f.relative);return;
  }
  if(f.preview!=='text')throw new Error(f.openable===false?'这种文件不能在这里预览，可以右键在资源管理器中显示':'这种文件不能在这里预览，右键可以用默认应用打开');
  setRightTab('files');await openFile(f.relative,false);
  // Rough is fine: the viewer has no line numbers to aim at.
  const view=document.querySelector('#preview-pane .code-view');
  if(view&&line)view.scrollTop=(line-1)*parseFloat(getComputedStyle(view).lineHeight||'18');
}
async function fileMenuAction(id,f){
  if(id==='preview')return previewFile(f,f.line);
  if(id==='reveal')return call('file:reveal',{projectId:state.projectId,path:f.relative});
  if(id==='open')return call('file:open',{projectId:state.projectId,path:f.relative});
  await call('clipboard:write',{text:f.absolute??f.path});toast('已复制路径');
}
function folderMenuHtml(){
  return`<div class="menu-label">工作文件夹</div>${state.snapshot.projects.map(p=>`<button class="menu-item${p.id===state.projectId?' selected':''}" data-pick-folder="${p.id}">${icon('folder','mi-icon')}<span class="mi-main"><span class="mi-name">${esc(p.name)}</span><span class="mi-sub">${esc(p.path)}</span></span>${p.id===state.projectId?icon('check','mi-check'):''}</button>`).join('')}${state.snapshot.projects.length?'<div class="menu-sep"></div>':''}<button class="menu-item" id="menu-open-folder">${icon('folderPlus','mi-icon')}<span class="mi-main"><span class="mi-name">打开文件夹…</span></span></button>`;
}
function envMenuHtml(){
  const s=session();
  if(s){const r=runtime(s.runtimeId);return`<div class="menu-label">运行环境</div><div class="menu-static">${tile(r)}<span class="mi-main"><span class="mi-name">${esc(r?.name??s.runtimeId)}</span><span class="mi-sub">会话创建后不能更换运行环境。要换环境，请新建会话。</span></span>${icon('lock','mi-check')}</div>`;}
  return`<div class="menu-label">运行环境 · 先选环境，再选模型</div>${state.snapshot.runtimes.map(r=>{const ok=usable(r),current=ok&&r.id===state.runtimeId;return`<button class="menu-item env-item${current?' selected':''}" data-env="${r.id}" ${ok?'':'disabled'}>${tile(r)}<span class="mi-main"><span class="mi-name">${esc(r.name)}<span class="mi-tag">${esc(r.protocol)}</span></span><span class="mi-sub">${ok?esc(r.description):r.checking?esc(unusableReason(r)):`${esc(unusableReason(r))} · 可在设置 → 运行环境里安装或指定路径`}</span></span>${current?icon('check','mi-check'):''}</button>`;}).join('')}<div class="menu-sep"></div><button class="menu-item subtle" data-open-settings="runtimes">${icon('settings','mi-icon')}<span class="mi-main"><span class="mi-name">管理运行环境…</span></span></button>`;
}
function sessionMenuHtml(){
  const s=session();
  return`<button class="menu-item" id="menu-rename">${icon('edit','mi-icon')}<span class="mi-main"><span class="mi-name">重命名</span></span></button><button class="menu-item" id="menu-reveal">${icon('folder','mi-icon')}<span class="mi-main"><span class="mi-name">在资源管理器中打开文件夹</span></span></button><div class="menu-sep"></div><button class="menu-item danger" data-archive="${s?.id??''}" ${busy(s)?'disabled':''}>${icon('archive','mi-icon')}<span class="mi-main"><span class="mi-name">归档会话</span></span></button>`;
}
/* Two sources carry models with near-identical names (DeepSeek Flash on both), so a model is
 * always shown with its source's letter, and each source is a group that opens on demand. */
const sourcePrefix={qoder:'Q-',workbuddy:'W-'};
const sourceName=m=>`${sourcePrefix[m?.source]??''}${m?.name??''}`;
const openGroups=new Set();
function modelItemHtml(m){
  return`<button class="menu-item model-item${m.key===state.modelKey?' selected':''}" data-model-key="${esc(m.key)}"><span class="mi-main"><span class="mi-name">${esc(sourceName(m))}</span><span class="mi-sub mono">${esc(m.id)}</span></span><span class="mi-tags">${m.reasoning.some(e=>e!=='none')?'<span class="mi-tag">思考</span>':''}${m.contextMaximum?`<span class="mi-tag">${compact(m.contextMaximum)}</span>`:''}</span>${m.key===state.modelKey?icon('check','mi-check'):''}</button>`;
}
function modelListHtml(){
  const env=state.runtimeId,q=state.menuSearch.trim().toLowerCase();
  const groups=['qoder','workbuddy','antigravity'].map(source=>{
    const all=models().filter(m=>m.source===source&&compatible(env,m));
    const list=all.filter(m=>!q||`${sourceName(m)} ${m.name} ${m.id}`.toLowerCase().includes(q));
    if(!list.length)return'';
    // A search shows every match; otherwise a group stays closed until it is opened.
    const open=!!q||openGroups.has(source),chosen=all.find(m=>m.key===state.modelKey);
    return`<div class="model-group${open?' open':''}"><button class="model-group-head" data-model-group="${source}" aria-expanded="${open}">${icon('chevronRight','mg-caret')}<span class="mg-name">${esc(sourceNames[source])}</span><span class="mg-count">${q?`${list.length}/${all.length}`:all.length} 个</span>${chosen&&!open?`<span class="mg-chosen" title="当前选择">${icon('check')}${esc(sourceName(chosen))}</span>`:''}</button>${open?`<div class="model-group-body">${list.map(modelItemHtml).join('')}</div>`:''}</div>`;
  }).join('');
  const native=env!=='dsh'&&(!q||'原生 native'.includes(q))?`<div class="menu-label">原生</div><button class="menu-item model-item${state.modelKey==='native'?' selected':''}" data-model-key="native"><span class="mi-main"><span class="mi-name">原生模型设置</span><span class="mi-sub">使用 ${esc(runtime(env)?.name??'')} 自己的模型与登录</span></span>${state.modelKey==='native'?icon('check','mi-check'):''}</button>`:'';
  return groups+native||`<div class="menu-empty">${models().length?'没有匹配的模型':'还没有模型目录。请到设置 → 模型源下载组件并登录。'}</div>`;
}
function effortRow(model,value){
  if(!model.reasoning.length)return`<div class="param"><span class="param-label">${icon('bulb')}思考强度</span><span class="param-inline">来源未声明档位，使用默认</span></div>`;
  return`<div class="param"><span class="param-label">${icon('bulb')}思考强度</span><div class="seg">${['',...model.reasoning].map(e=>`<button class="${value===e?'on':''}" data-effort="${esc(e)}">${e?esc(effortName(e)):`默认${model.defaultReasoning?`<small>${esc(effortName(model.defaultReasoning))}</small>`:''}`}</button>`).join('')}</div></div>`;
}
function contextRow(model,value){
  if(!model.contexts.length)return'';
  return`<div class="param"><span class="param-label">${icon('window')}上下文窗口</span><div class="seg">${[...model.contexts].sort((a,b)=>a.tokens-b.tokens).map(c=>`<button class="${value===c.tokens?'on':''}" data-context="${c.tokens}">${compact(c.tokens)}${c.tokens===model.defaultContextTokens?'<small>默认</small>':''}</button>`).join('')}</div></div>`;
}
/** Typed as 900K, 1M or 0.75M; the note beside it says the exact count or what is wrong while typing. */
function budgetRow(model,value,context){
  if(!model.contextMaximum)return'';
  const max=budgetMax(model,context),text=value?formatTokens(value):'';
  return`<div class="param"><span class="param-label">${icon('database')}本地压缩预算</span><div class="budget"><input id="budget-input" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="不设置" value="${esc(text)}" data-max="${max??''}" aria-describedby="budget-help" title="可以写 900K、1M、0.75M、90万 或具体数字；K、M 按 1000 进位，和模型源标的窗口一致"><span class="budget-help" id="budget-help">${esc(value?budgetCheck(text,{max}).text:`例如 200K、0.5M，最大 ${compact(max)}`)}</span></div></div>`;
}
function paintBudgetHelp(input){
  const help=$('#budget-help');
  if(!input||!help)return;
  const check=budgetCheck(input.value,{max:Number(input.dataset.max)||null});
  help.textContent=input.value.trim()?check.text:`例如 200K、0.5M，最大 ${compact(Number(input.dataset.max)||null)}`;
  help.classList.toggle('bad',!check.ok);input.classList.toggle('bad',!check.ok);
}
const budgetNote='预算只决定运行环境何时压缩上下文，不改变上游窗口。预算越大，每一步重发给模型的历史越多，用量也越大。';
function paramsHtml(){
  if(state.modelKey==='native')return nativeParamsHtml();
  const m=currentModel();
  if(!m)return'';
  if(m.source==='antigravity')return`<div class="param-note">${icon('info')}<span>Gemini 由 Antigravity 原生执行。思考档位已包含在模型 ID 中，上下文由原生后端管理。</span></div>`;
  return`${effortRow(m,state.reasoning)}${contextRow(m,state.contextTokens)}${budgetRow(m,state.contextBudget,state.contextTokens)}<div class="param-hint">${budgetNote}</div><div class="param-actions"><button class="btn sm" id="save-model-default">${icon('check')}记住此搭配</button></div>`;
}
function nativeEfforts(){
  const rows=nativeCatalog.get(state.runtimeId)??[],row=rows.find(r=>r.id===state.nativeModel);
  const list=row?.reasoning?.length?row.reasoning:state.runtimeId==='codex'?[]:['low','medium','high','xhigh','max'];
  return state.reasoning&&!list.includes(state.reasoning)?[...list,state.reasoning]:list;
}
function nativeChoiceHtml(){
  const rows=nativeCatalog.get(state.runtimeId)??[];
  if(!rows.length)return'';
  const group=(items,label)=>items.length?`<optgroup label="${label}">${items.map(r=>`<option value="${esc(r.id)}">${esc(r.name)} · ${esc(r.id)}${r.hidden?' · 隐藏':''}</option>`).join('')}</optgroup>`:'';
  return`<select id="native-model-choice" aria-label="完整原生模型列表"><option value="">手动填写 / 原生当前模型</option>${group(rows.filter(r=>!r.hidden),'常规模型')}${group(rows.filter(r=>r.hidden),'原生隐藏条目')}</select>`;
}
function nativeParamsHtml(){
  const rows=nativeCatalog.get(state.runtimeId)??[],canList=['codex','antigravity'].includes(state.runtimeId);
  return`<div class="param"><span class="param-label">${icon('cpu')}原生模型 ID</span><div class="native-row"><input id="native-id" placeholder="留空使用原生当前模型" value="${esc(state.nativeModel)}" autocomplete="off" spellcheck="false">${canList?`<button class="btn sm" id="load-native-models">${rows.length?'刷新目录':'读取原生目录'}</button>`:''}</div></div>
    <div id="native-choice-slot">${nativeChoiceHtml()}</div>
    <div class="param"><span class="param-label">${icon('bulb')}思考强度</span><select id="native-effort"><option value="">原生默认</option>${nativeEfforts().map(e=>`<option value="${esc(e)}" ${state.reasoning===e?'selected':''}>${esc(effortName(e))}</option>`).join('')}</select></div>
    <div class="param-hint" id="native-model-summary">${rows.length?`共 ${rows.length} 个原生模型${rows.some(r=>r.hidden)?`（含 ${rows.filter(r=>r.hidden).length} 个隐藏条目）`:''}`:'工具、技能、MCP 与权限都使用原生配置。'}</div>
    <div class="param-actions"><button class="btn sm" id="save-model-default">${icon('check')}记住此搭配</button></div>`;
}
function syncNativeChoice(){
  const choice=$('#native-model-choice');
  if(choice)choice.value=(nativeCatalog.get(state.runtimeId)??[]).some(r=>r.id===state.nativeModel)?state.nativeModel:'';
  repaintNativeEffort();renderComposerControls();
}
function repaintNativeEffort(){
  const select=$('#native-effort');
  if(!select)return;
  const efforts=nativeEfforts();
  if(!efforts.includes(state.reasoning))state.reasoning='';
  select.innerHTML=`<option value="">原生默认</option>${efforts.map(e=>`<option value="${esc(e)}">${esc(effortName(e))}</option>`).join('')}`;
  select.value=state.reasoning;
}
function sessionParamsHtml(s){
  const m=modelOf(s.selection),p=state.params;
  const native=s.selection.modelKey==='native';
  if(!m||m.source==='antigravity')return`<div class="menu-session-head">${icon('lock')}<div><b>${esc(m?.name??(native?'原生模型':s.selection.modelKey))}</b><small>${esc(native?s.selection.nativeModel||'原生当前模型':m?m.id:'不在当前模型目录中')}</small></div></div><div class="param-note">${icon('info')}<span>${m?'Gemini 由 Antigravity 原生执行，参数在原生界面中调整。':native?'原生模型会话的参数请在原生界面中调整。':'这个模型不在当前目录中。请刷新模型源，再用编辑框上方的“重新确认模型”。'}</span></div>`;
  return`<div class="menu-session-head">${icon('lock')}<div><b>${esc(m.name)}</b><small>${esc(sourceNames[m.source])} · ${esc(m.id)}</small></div></div><div class="menu-params">${effortRow(m,p.reasoning)}${contextRow(m,p.contextTokens)}${budgetRow(m,p.contextBudget,p.contextTokens)}<div class="param-hint">${budgetNote}会话创建后不能更换模型或运行环境；应用新参数会重启这个会话的运行环境，下一轮会重新发送完整上下文。</div><div class="param-actions"><button class="btn primary sm" id="apply-session-params" ${busy(s)?'disabled':''}>应用到此会话</button></div></div>`;
}
function modelMenuHtml(){
  const s=session();
  if(s)return sessionParamsHtml(s);
  return`<div class="menu-search">${icon('search')}<input id="menu-search" placeholder="搜索模型名称或 ID" autocomplete="off" spellcheck="false"></div><div class="menu-list" id="menu-list">${modelListHtml()}</div><div class="menu-params" id="menu-params">${paramsHtml()}</div>`;
}
const paramTarget=()=>session()?state.params:state;
function setBudget(raw){
  const s=session(),target=paramTarget(),m=s?modelOf(s.selection):currentModel(),check=budgetCheck(raw,{max:budgetMax(m,target.contextTokens)});
  if(!check.ok||check.value!==null&&!validBudget(m,check.value,target.contextTokens))throw new Error(`本地压缩预算：${check.ok?'超出这个模型允许的范围':check.text}`);
  target.contextBudget=check.value;
  // Show the canonical form (0.9M → 900K) once the value is taken.
  const input=$('#budget-input');
  if(input){input.value=check.value?formatTokens(check.value):'';paintBudgetHelp(input);}
  if(!s)renderComposerControls();
}
async function loadNativeModels(){
  const button=$('#load-native-models'),runtimeId=state.runtimeId,projectId=state.projectId;
  if(!button)return;
  button.disabled=true;button.textContent='读取中…';
  try{
    const rows=await call('native:models',{runtimeId,projectId});
    if(!Array.isArray(rows))throw new Error('原生后端返回了无效目录');
    nativeCatalog.set(runtimeId,rows);
    if(!state.nativeModel)state.nativeModel=(rows.find(r=>r.isDefault)??rows.find(r=>!r.hidden)??rows[0])?.id??'';
  }catch(error){
    toast(error.message,true);
  }finally{
    if(menu?.kind==='model'&&state.runtimeId===runtimeId){
      const params=$('#menu-params');
      if(params){params.innerHTML=paramsHtml();bindNativeInputs();placeMenu();}
      syncNativeChoice();
    }
  }
}
function bindNativeInputs(){
  bind('#native-id','input',e=>{state.nativeModel=e.target.value.trim();syncNativeChoice();});
  bind('#native-model-choice','change',e=>{state.nativeModel=e.target.value;const input=$('#native-id');if(input)input.value=e.target.value;repaintNativeEffort();renderComposerControls();});
  bind('#native-effort','change',e=>{state.reasoning=e.target.value;renderComposerControls();});
  bind('#budget-input','input',e=>paintBudgetHelp(e.target));
  bind('#budget-input','change',e=>void action(()=>setBudget(e.target.value)));
  bind('#budget-input','keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();e.target.blur();}});
}
function repaintParams(){
  const s=session();
  if(s){paintMenu();return;}
  const params=$('#menu-params');
  if(params){params.innerHTML=paramsHtml();bindNativeInputs();}
  const list=$('#menu-list');
  if(list)list.innerHTML=modelListHtml();
  renderComposerControls();renderBanner();placeMenu();
}

/* ---------- right panel ---------- */
function renderRightFrame(){
  $('#rightpanel').innerHTML=`<div class="rp-head"><div class="rp-tabs" id="rp-tabs"></div><button class="icon-btn" id="collapse-right" title="收起右侧面板 (Ctrl+Alt+B)">${icon('panelRight')}</button></div><div class="rp-body" id="rp-body"></div><div class="rp-resizer" id="rp-resizer" title="拖动调整宽度"></div>`;
  renderRightTabs();
}
function renderRightTabs(){
  const el=$('#rp-tabs');
  if(!el)return;
  const live=state.snapshot?.sessions.filter(s=>!s.archived&&busy(s)).length??0,changes=state.git?.files?.length??0;
  el.innerHTML=[['changes','fileDiff','变更',changes],['files','file','文件',0],['tasks','activity','任务',live]].map(([id,ico,label,n])=>`<button class="rp-tab${ui.rightTab===id?' active':''}" data-rtab="${id}">${icon(ico)}<span>${label}</span>${n?`<span class="tab-badge${id==='tasks'?' live':''}">${n}</span>`:''}</button>`).join('');
}
function renderRightBody(){
  if(!ui.right)return;
  rightEpoch++;
  if(ui.rightTab==='files')void renderFiles();
  else if(ui.rightTab==='tasks')renderTasks();
  else void renderChanges();
}
const emptyPane=(ico,text,extra='')=>`<div class="pane-empty">${icon(ico)}<span>${esc(text)}</span>${extra}</div>`;
function statusClass(status){
  const s=status.trim();
  return s==='??'?'untracked':s.includes('D')?'deleted':s.includes('A')?'added':s.includes('R')?'renamed':'modified';
}
function lastAgentDiff(){for(let i=state.events.length-1;i>=0;i--)if(state.events[i].type==='diff')return state.events[i];return null;}
function paintChanges(){
  const body=$('#rp-body'),g=state.git;
  if(!body||ui.rightTab!=='changes'||!g)return;
  const agent=lastAgentDiff(),agentOpen=!!body.querySelector('.agent-diff')?.open,message=body.querySelector('#commit-message')?.value??'',checked=new Set([...body.querySelectorAll('input[name="stage-file"]:checked')].map(x=>x.value));
  const rows=g.files.map(f=>{
    const slash=f.path.lastIndexOf('/'),dir=slash>=0?f.path.slice(0,slash+1):'',name=f.path.slice(slash+1),staged=f.status[0]!==' '&&f.status[0]!=='?';
    return`<div class="change-row${state.diffPath===f.path?' open':''}"><input type="checkbox" name="stage-file" value="${esc(f.path)}" aria-label="选择 ${esc(f.path)}"><button class="change-main" data-diff-file="${esc(f.path)}" title="${esc(f.oldPath?`${f.oldPath} → ${f.path}`:f.path)}"><span class="badge ${statusClass(f.status)}">${esc(f.status.trim()==='??'?'U':f.status.trim()[0]??'M')}</span><span class="change-path"><span class="change-name">${esc(name)}</span><span class="change-dir">${esc(dir)}</span></span>${staged?'<span class="staged">已暂存</span>':''}</button></div>${state.diffPath===f.path?`<div class="diff-box" id="diff-container">${diffHtml(state.diff)}</div>`:''}`;
  }).join('');
  body.innerHTML=`<div class="changes"><div class="pane-toolbar"><span class="pane-title">${icon('git')}${g.repository?esc(g.branch):'未初始化 Git'}</span><span class="pane-meta">${g.repository?`${g.files.length} 个文件`:''}</span><button class="icon-btn sm" id="refresh-git" title="刷新">${icon('refresh')}</button></div>
    ${agent?`<details class="agent-diff" data-expand="agent-diff"><summary>${icon('spark')}<span>本会话 Agent 报告的变更</span><span class="muted">${esc(typeof agent.text==='string'&&agent.text?diffStat(agent.text):'')}</span></summary>${typeof agent.text==='string'&&agent.text?diffHtml(agent.text):`<pre>${esc(clip(pretty(agent.data)))}</pre>`}</details>`:''}
    ${!g.repository?emptyPane('git','这个文件夹还不是 Git 仓库','<button class="btn sm" id="init-git">初始化 Git 仓库</button>'):!g.files.length?emptyPane('check','工作目录是干净的','<small>Agent 修改的文件会出现在这里。</small>'):`<div class="change-list">${rows}</div><div class="commit-box"><div class="commit-actions"><button class="btn sm" id="stage-selected">暂存所选</button><span class="muted">只提交已暂存的变更</span></div><textarea id="commit-message" rows="2" placeholder="提交说明"></textarea><button class="btn primary sm" id="commit">${icon('check')}提交到本地</button></div>`}</div>`;
  const details=body.querySelector('.agent-diff');
  if(details)details.open=agentOpen;
  const box=body.querySelector('#commit-message');
  if(box)box.value=message;
  for(const input of body.querySelectorAll('input[name="stage-file"]'))input.checked=checked.has(input.value);
}
async function renderChanges(){
  const body=$('#rp-body'),projectId=state.projectId,epoch=rightEpoch;
  if(!body)return;
  if(!project()){body.innerHTML=emptyPane('fileDiff','打开一个工作文件夹后，这里会列出文件变更。');return;}
  if(state.git)paintChanges();else body.innerHTML='<div class="pane-loading"><span class="spinner"></span>读取 Git 状态…</div>';
  try{
    const g=await call('git:status',{projectId});
    if(projectId!==state.projectId||epoch!==rightEpoch||ui.rightTab!=='changes')return;
    state.git=g;
    if(state.diffPath&&!g.files.some(f=>f.path===state.diffPath)){state.diffPath=null;state.diff='';}
    paintChanges();renderRightTabs();
  }catch(e){toast(e.message,true);}
}
async function showDiff(path){
  if(state.diffPath===path){state.diffPath=null;state.diff='';paintChanges();return;}
  const projectId=state.projectId,diff=await call('git:diff',{projectId,path});
  if(projectId!==state.projectId)return;
  state.diffPath=path;state.diff=diff;paintChanges();
}
async function loadTree(path='',projectId=state.projectId,cache=state.tree){
  cache.set(path,await call('project:tree',{projectId,path}));
}
function treeHtml(path='',depth=0){
  return(state.tree.get(path)??[]).map(f=>`<button class="tree-row d${Math.min(depth,9)}${state.file?.path===f.path?' active':''}" data-file-path="${esc(f.path)}" data-directory="${f.directory}">${f.directory?icon(state.expanded.has(f.path)?'chevronDown':'chevronRight','tree-caret'):'<span class="tree-caret"></span>'}${icon(f.directory?'folder':'file','tree-icon')}<span class="tree-name">${esc(f.name)}</span></button>${f.directory&&state.expanded.has(f.path)?treeHtml(f.path,depth+1):''}`).join('');
}
function codeHtml(text){
  const lines=text.split('\n'),max=4000;
  return`<pre class="code">${lines.slice(0,max).map((l,i)=>`<span class="cl"><span class="ln">${i+1}</span><span class="lc">${esc(l)||' '}</span></span>`).join('')}</pre>${lines.length>max?`<div class="pane-note">仅预览前 ${max} 行，共 ${lines.length.toLocaleString()} 行。进入编辑可查看全部内容。</div>`:''}`;
}
async function renderFiles(){
  const body=$('#rp-body'),projectId=state.projectId,epoch=rightEpoch;
  if(!body)return;
  if(!project()){body.innerHTML=emptyPane('file','打开一个工作文件夹后，可以在这里浏览与预览文件。');return;}
  try{
    if(!state.tree.has(''))await loadTree();
    if(projectId!==state.projectId||epoch!==rightEpoch||ui.rightTab!=='files')return;
    const f=state.file;
    body.innerHTML=`<div class="files${f?' has-file':''}"><div class="tree-pane"><div class="pane-toolbar"><span class="pane-title">${icon('folder')}${esc(project().name)}</span><button class="icon-btn sm" id="refresh-files" title="刷新">${icon('refresh')}</button></div><div id="tree" class="tree">${treeHtml()||'<div class="pane-empty small">空文件夹</div>'}</div></div>
      ${f?`<div class="preview-pane${state.dirty?' dirty':''}" id="preview-pane"><div class="pane-toolbar"><span class="pane-title mono" title="${esc(f.path)}">${icon('file')}<span class="file-path">${esc(f.path)}</span><i class="dirty-dot" title="未保存"></i></span><span class="pane-actions">${f.editing?'<button class="btn sm" id="cancel-edit">完成</button><button class="btn primary sm" id="save-file">保存</button>':`<button class="btn sm" id="reference-file" title="把文件路径加入任务草稿">引用</button><button class="btn sm" id="edit-file">${icon('edit')}编辑</button>`}<button class="icon-btn sm" id="close-file" title="关闭文件">${icon('close')}</button></span></div>${f.editing?'<textarea id="editor" class="editor" spellcheck="false" aria-label="文件编辑器"></textarea>':`<div class="code-view">${codeHtml(f.text)}</div>`}</div>`:''}</div>`;
    if(f?.editing){
      const editor=$('#editor');
      editor.value=f.text;
      editor.addEventListener('input',e=>{state.file.text=e.target.value;if(!state.dirty){state.dirty=true;$('#preview-pane')?.classList.add('dirty');}reportDirty();});
    }
  }catch(e){toast(e.message,true);}
}
async function openFile(path,directory){
  const projectId=state.projectId,cache=state.tree,expanded=state.expanded,token=++fileEpoch;
  if(directory){
    if(expanded.has(path))expanded.delete(path);
    else{await loadTree(path,projectId,cache);expanded.add(path);}
    if(projectId===state.projectId&&$('#tree'))$('#tree').innerHTML=treeHtml();
    return;
  }
  if(state.dirty)throw new Error('当前文件尚未保存，请先保存后再打开其他文件');
  const file=await call('file:read',{projectId,path});
  if(token!==fileEpoch||projectId!==state.projectId)return;
  state.file={...file,projectId,editing:false};state.dirty=false;
  reportDirty();
  if(ui.rightTab==='files')await renderFiles();
}
async function saveFile(){
  await action(async()=>{
    if(!state.file)return;
    const original=state.file,projectId=original.projectId??state.projectId,text=original.text,editing=original.editing;
    const saved=await call('file:write',{projectId,path:original.path,text,revision:original.revision});
    if(original.text!==text){original.revision=saved.revision;toast('已保存提交时的内容，之后的编辑尚未保存');}
    else{views.saved(state,projectId,{...saved,projectId,editing});toast('文件已保存');}
    reportDirty();
    if(state.projectId===projectId&&ui.rightTab==='files'&&state.file?.path===saved.path)await renderFiles();
  });
}
async function discardFile(close){
  const f=state.file;
  if(!f)return;
  const done=async()=>{
    if(close)state.file=null;
    else{const file=await call('file:read',{projectId:f.projectId??state.projectId,path:f.path});state.file={...file,projectId:f.projectId,editing:false};}
    state.dirty=false;reportDirty();await renderFiles();
  };
  if(state.dirty)modal('放弃未保存的修改？',`<p>${esc(f.path)} 有未保存的修改。放弃后会恢复为磁盘上的内容。</p>`,done,{confirm:'放弃修改',danger:true});
  else if(close)await done();
  else{f.editing=false;await renderFiles();}
}
function renderTasks(){
  const body=$('#rp-body');
  if(!body)return;
  body.innerHTML='<div class="tasks"><section class="task-section" id="tasks-live"></section><section class="task-section terminal-section" id="terminal-section"></section></div>';
  renderTasksLive();renderTerminal();
}
function renderTasksLive(){
  const el=$('#tasks-live');
  if(!el)return;
  const snap=state.snapshot,live=snap.sessions.filter(s=>!s.archived&&busy(s));
  const sources=['qoder','workbuddy','antigravity'].map(id=>{
    const c=snap.catalog[id],status=c?.status??'none';
    return`<div class="task-row"><span class="dot ${status==='ready'?'completed':status==='loading'?'running':status==='error'?'failed':'idle'}"></span><span class="task-main static"><span class="task-title">${sourceNames[id]}</span><span class="task-sub">${status==='loading'?'正在读取目录…':status==='needs-component'?'需要下载组件':status==='ready'?`${c.models.filter(m=>m.enabled).length} 个模型 · ${since(c.checkedAt)}更新`:status==='error'?esc(c.error):'尚未读取'}</span></span><button class="icon-btn sm" data-refresh-source="${id}" title="刷新目录" ${status==='loading'?'disabled':''}>${icon('refresh')}</button></div>`;
  }).join('');
  el.innerHTML=`<h4>${icon('activity')}运行中的会话<span class="count">${live.length}</span></h4>${live.length?live.map(s=>`<div class="task-row"><span class="dot ${esc(s.status)}"></span><button class="task-main" data-session="${s.id}"><span class="task-title">${esc(s.title)}</span><span class="task-sub">${esc(snap.projects.find(p=>p.id===s.projectId)?.name??'')} · ${esc(runtime(s.runtimeId)?.name??s.runtimeId)} · <span data-activity="${s.id}">${esc(activityOf(s).short)}</span> · <span data-elapsed-from="${esc(s.updatedAt)}">${elapsed(s.updatedAt)}</span></span></button><button class="icon-btn sm" data-stop-session="${s.id}" title="停止">${icon('stop')}</button></div>`).join(''):'<div class="task-empty">没有正在运行的会话</div>'}<h4>${icon('layers')}模型目录</h4>${sources}`;
}
function renderTerminal(){
  const el=$('#terminal-section');
  const t=views.terminal(state.projectId);
  state.terminalText=t.text;state.terminalBusy=t.running;
  if(!el)return;
  const p=project();
  el.innerHTML=`<h4>${icon('terminal')}终端<span class="muted">PowerShell · ${esc(p?.name??'未选择文件夹')}</span><span class="spacer"></span>${state.terminalBusy?'<button class="btn sm danger" id="stop-terminal">停止</button>':''}<button class="ghost-btn" id="clear-terminal" title="清空输出">清空</button></h4><pre class="terminal-output" id="terminal-output"></pre><form class="terminal-input" id="terminal-form"><span class="prompt-sign">❯</span><input id="terminal-command" placeholder="${p?'在当前文件夹运行命令':'先打开一个文件夹'}" autocomplete="off" spellcheck="false" ${state.terminalBusy?'disabled':''}><button class="btn sm" ${state.terminalBusy||!p?'disabled':''}>运行</button></form>`;
  const out=$('#terminal-output');
  out.textContent=state.terminalText||'';
  out.scrollTop=out.scrollHeight;
  bind('#terminal-form','submit',e=>{
    e.preventDefault();
    void action(async()=>{
      const command=$('#terminal-command').value;
      if(!command.trim())return;
      const projectId=state.projectId,terminal=views.terminal(projectId);
      terminal.text+=`❯ ${command}\n`;terminal.running=true;
      renderTerminal();
      try{await call('terminal:run',{projectId,command});}
      catch(error){terminal.running=false;if(state.projectId===projectId)renderTerminal();throw error;}
    });
  });
}

/* ---------- settings ---------- */
function openSettings(tab='general'){
  closeMenu();
  state.settings=tab;
  $('#settings').classList.remove('hidden');
  renderSettings();
}
function closeSettings(){
  state.settings=null;
  $('#settings').classList.add('hidden');
  $('#settings').innerHTML='';
}
const sourceCard=(id,desc)=>sourceCardHtml(id,desc,state.snapshot.catalog[id],state.snapshot.sourceComponents?.find(c=>c.id===id));
function catalogRows(){
  const q=state.catalogSearch.toLowerCase(),rows=models().filter(m=>(state.catalogSource==='all'||m.source===state.catalogSource)&&`${m.name} ${m.id} ${m.source}`.toLowerCase().includes(q));
  return rows.length?rows.map(m=>`<tr><td><div class="model-name">${esc(m.name)}${m.enabled?'':'<span class="muted"> · 不可用</span>'}</div><div class="model-id mono">${esc(m.id)}</div></td><td>${sourceNames[m.source]}</td><td>${m.contexts.length?m.contexts.map(c=>`<span class="ctx-tag${c.tokens===m.defaultContextTokens?' default':''}">${compact(c.tokens)}</span>`).join(''):'<span class="muted">未声明</span>'}</td><td>${m.reasoning.length?m.reasoning.map(e=>`<span class="effort-tag">${esc(effortName(e))}</span>`).join(''):'<span class="muted">默认</span>'}</td><td><button class="link-btn" data-use-model="${esc(m.key)}" ${m.enabled?'':'disabled'}>用于新会话</button></td></tr>`).join(''):'<tr><td colspan="5" class="table-empty">没有匹配的模型。刷新来源目录后，所有可用模型都会列在这里。</td></tr>';
}
function settingsBody(tab){
  const snap=state.snapshot,theme=snap.preferences.theme??'dark';
  if(tab==='sources')return`<div class="settings-head"><h1>模型源</h1><p>读取账户的真实可用目录。思考强度和上下文窗口使用来源声明的能力，未声明的保持未知。</p></div>
    <div class="source-grid" id="source-grid">${sourceCard('qoder','独立 SDK 副本，复用官方 CLI 登录态。')}${sourceCard('workbuddy','独立 bridge 副本，复用本机 WorkBuddy 登录态。')}${sourceCard('antigravity','独立 Gemini 来源，固定由 Antigravity 原生执行。')}</div>
    <div class="catalog-controls"><label class="search-field">${icon('search')}<input id="catalog-search" placeholder="搜索模型名称、ID 或来源" value="${esc(state.catalogSearch)}" autocomplete="off"></label><select id="catalog-source"><option value="all">全部来源</option>${Object.entries(sourceNames).map(([id,name])=>`<option value="${id}" ${state.catalogSource===id?'selected':''}>${name}</option>`).join('')}</select></div>
    <div class="table-wrap"><table class="catalog-table"><thead><tr><th>模型 / 上游 ID</th><th>来源</th><th>上下文窗口</th><th>思考强度</th><th></th></tr></thead><tbody id="model-rows">${catalogRows()}</tbody></table></div>
    <div class="note">${icon('info')}<span>Antigravity 来源的 Gemini 固定由 Antigravity 执行，选择后自动切换到该环境。本地压缩预算只影响运行环境何时压缩，不表示上游窗口。</span></div>`;
  if(tab==='runtimes')return`<div class="settings-head row"><div><h1>运行环境</h1><p>任务由原生 Agent 执行，工具、技能、MCP、子代理与权限都保留在各自环境里。装好任意一个就能使用 Bridge++，没装的环境不会出现在工作台的可选项里。</p></div><div class="head-actions"><button class="btn" id="open-guide">${icon('spark')}引导</button>${Array.isArray(snap.environments)?`<button class="btn" id="check-environments">${icon('download')}检查更新</button>`:''}<button class="btn" id="refresh-runtimes">${icon('refresh')}重新检测</button></div></div>
    <div class="runtime-grid" id="runtime-grid">${runtimeCards()}</div>
    <div class="note">${icon('info')}<span>「可用」表示程序已安装并通过了基本检测，不代表已登录或已实测模型。真实连接结果以会话中的事件和错误为准。</span></div>`;
  if(tab==='services')return servicesPageHtml(snap.modelServices,serviceViews);
  if(tab==='defaults'){
    const rows=Object.entries(snap.preferences.modelDefaults);
    return`<div class="settings-head"><h1>默认搭配</h1><p>在编辑框的模型菜单里点击“记住此搭配”，再次选择该模型时会自动恢复思考强度、窗口与预算。</p></div>${rows.length?`<div class="table-wrap"><table class="catalog-table"><thead><tr><th>模型</th><th>运行环境</th><th>思考</th><th>窗口</th><th>预算</th></tr></thead><tbody>${rows.map(([key,v])=>{const m=models().find(x=>x.key===key);return`<tr><td><div class="model-name">${esc(key.startsWith('native')?`原生模型 · ${v.nativeModel||'当前默认'}`:m?.name??key)}</div><div class="model-id mono">${esc(key)}</div></td><td>${esc(runtime(v.runtimeId)?.name??v.runtimeId??'—')}</td><td>${esc(v.reasoning?effortName(v.reasoning):'默认')}</td><td>${v.contextTokens?compact(v.contextTokens):'—'}</td><td>${v.contextBudget?compact(v.contextBudget):'—'}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="note">还没有保存的搭配。</div>'}`;
  }
  if(tab==='shortcuts')return`<div class="settings-head"><h1>快捷键</h1></div><dl class="kv">${[['Ctrl + N','新建会话'],['Enter','发送任务'],['Shift + Enter','换行'],['Ctrl + B','收起 / 展开左侧栏'],['Ctrl + Alt + B','收起 / 展开右侧面板'],['Ctrl + J','打开任务与终端'],['Ctrl + S','保存正在编辑的文件'],['Ctrl + ,','打开设置'],['Esc','关闭菜单或设置']].map(([k,v])=>`<dt><kbd>${k}</kbd></dt><dd>${v}</dd>`).join('')}</dl>`;
  if(tab==='about')return`<div class="settings-head about"><div class="about-mark">${logo(48)}</div><h1>Bridge++</h1><p>把你的模型源接到熟悉的原生 Agent 里，在一个工作区管理会话、变更与文件。</p></div><dl class="kv"><dt>版本</dt><dd>${esc(snap.app.version)}</dd><dt>工作区数据</dt><dd class="mono">${esc(snap.app.dataDir)}</dd><dt>工作文件夹</dt><dd>${snap.projects.length} 个</dd><dt>已保存会话</dt><dd>${snap.sessions.length} 个</dd></dl><div class="note">${icon('info')}<span>Qoder CN 和 WorkBuddy 的 bridge 内置在 Bridge++ 里；要让其他 Agent 使用这两个模型源，请到设置 → 对外接口。</span></div>`;
  return`<div class="settings-head"><h1>通用</h1><p>界面外观与工作区信息。</p></div>
    <h2>外观</h2><div class="theme-grid">${[['system','monitor','跟随系统'],['light','sun','浅色'],['dark','moon','深色']].map(([id,ico,label])=>`<button class="theme-card${theme===id?' active':''}" data-theme-choice="${id}"><span class="theme-preview ${id}"><i></i><i></i><i></i></span><span class="theme-label">${icon(ico)}${label}</span></button>`).join('')}</div>
    <h2>工作区</h2><dl class="kv"><dt>数据目录</dt><dd class="mono">${esc(snap.app.dataDir)}</dd><dt>工作文件夹</dt><dd>${snap.projects.length} 个</dd><dt>会话</dt><dd>${snap.sessions.filter(s=>!s.archived).length} 个（另有 ${snap.sessions.filter(s=>s.archived).length} 个已归档）</dd><dt>版本</dt><dd>${esc(snap.app.version)}</dd></dl>`;
}
function renderSettings(){
  const tab=state.settings,el=$('#settings');
  if(!tab||!state.snapshot)return;
  const nav=[['general','settings','通用'],['sources','layers','模型源'],['runtimes','cpu','运行环境'],['services','plug','对外接口'],['defaults','list','默认搭配'],['shortcuts','keyboard','快捷键'],['about','info','关于']];
  el.innerHTML=`<aside class="settings-nav"><div class="settings-top"><button class="icon-btn" id="close-settings" title="返回 (Esc)">${icon('arrowLeft')}</button><span>设置</span></div>${nav.map(([id,ico,label])=>`<button class="settings-tab${tab===id?' active':''}" data-settings-tab="${id}">${icon(ico)}<span>${label}</span></button>`).join('')}</aside><div class="settings-main"><div class="settings-drag"></div><div class="settings-scroll"><div class="settings-body" id="settings-body">${settingsBody(tab)}</div></div></div>`;
  bind('#catalog-search','input',e=>{state.catalogSearch=e.target.value;$('#model-rows').innerHTML=catalogRows();});
  bind('#catalog-source','change',e=>{state.catalogSource=e.target.value;$('#model-rows').innerHTML=catalogRows();});
}
function runtimeCards(){
  const envs=new Map((state.snapshot.environments??[]).map(e=>[e.id,e]));
  return state.snapshot.runtimes.map(r=>environmentCardHtml(r,envs.get(r.id),{permissions:runtimePermissionHtml(r),canOpenNative:!!project()})).join('');
}
function refreshSettingsLive(){
  if(state.settings==='sources'){
    const grid=$('#source-grid');
    if(grid)grid.innerHTML=sourceCard('qoder','独立 SDK 副本，复用官方 CLI 登录态。')+sourceCard('workbuddy','独立 bridge 副本，复用本机 WorkBuddy 登录态。')+sourceCard('antigravity','独立 Gemini 来源，固定由 Antigravity 原生执行。');
    const rows=$('#model-rows');
    if(rows)rows.innerHTML=catalogRows();
  }else if(state.settings==='runtimes'||state.settings==='services'){
    // Status, downloads and services change on their own; repaint the cards but never under a field being typed in.
    const active=document.activeElement;
    if(active?.closest?.('#settings')&&(active.tagName==='TEXTAREA'||active.tagName==='SELECT'||active.tagName==='INPUT'&&active.type!=='checkbox'))return;
    const grid=$(state.settings==='runtimes'?'#runtime-grid':'#service-grid');
    if(grid)patchHtml(grid,state.settings==='runtimes'?runtimeCards():serviceCardsHtml(state.snapshot.modelServices??[],serviceViews));
    else renderSettings();
  }else if(state.settings&&!document.activeElement?.closest('#settings'))renderSettings();
}

/* ---------- actions ---------- */
function modal(title,body,confirm,{confirm:confirmText='保存',danger=false}={}){
  const el=$('#modal');
  el.className='';guideOpen=false;
  el.innerHTML=`<h2>${esc(title)}</h2><div class="modal-body">${body}</div><div class="modal-actions"><button id="modal-cancel" class="btn">取消</button><button id="modal-confirm" class="btn ${danger?'danger-solid':'primary'}">${esc(confirmText)}</button></div>`;
  el.showModal();
  bind('#modal-cancel','click',()=>el.close());
  bind('#modal-confirm','click',()=>void action(async()=>{await confirm();el.close();}));
}
/* ---------- first-run guide ---------- */
// Shown on first launch, and whenever no environment is usable; it repaints as installs progress.
function openGuide(){
  const el=$('#modal');
  el.className='guide-modal';el.innerHTML=onboardingHtml(state.snapshot);
  if(!el.open)el.showModal();
  guideOpen=guideShown=true;
}
function paintGuide(){if(guideOpen&&$('#modal').open)patchHtml($('#modal'),onboardingHtml(state.snapshot));}
function closeGuide(){if(guideOpen&&$('#modal').open)$('#modal').close();}
$('#modal').addEventListener('close',()=>{if(guideOpen){guideOpen=false;$('#modal').className='';}});

/* ---------- model-source interfaces (Settings › 对外接口) ---------- */
async function serviceKey(id,verb){
  const view=serviceView(id),reveal=async()=>{const r=await call('bridgeService:key',{id,action:'reveal'});return typeof r==='string'?r:r?.key??null;};
  if(verb==='reveal'){view.key=view.key?null:await reveal();refreshSettingsLive();return;}
  if(verb==='copy'){const key=view.key??await reveal();if(!key)throw new Error('这个接口还没有密钥');await call('clipboard:write',{text:key});toast('密钥已复制');return;}
  modal('重新生成密钥','<p class="modal-text">旧密钥会立即失效，已经接入的客户端需要换成新密钥。接入过 DSH 的话，生成后再点一次「接入 DSH」即可。</p>',async()=>{
    await call('bridgeService:key',{id,action:'regenerate'});view.key=null;await snapshot();refreshSettingsLive();toast('已生成新密钥');
  },{confirm:'重新生成',danger:true});
}
async function toggleServiceModels(id){
  const view=serviceView(id);
  view.models=!view.models;view.list=undefined;refreshSettingsLive();
  if(!view.models)return;
  try{const r=await call('bridgeService:models',{id});view.list=Array.isArray(r)?r:r?.data??[];}
  catch(error){view.models=false;toast(error.message,true);}
  refreshSettingsLive();
}
/** Run a backend action (or none), then repaint the settings page from a fresh snapshot. */
async function serviceCall(method,args,done){
  if(method)await call(method,args);
  await snapshot();refreshSettingsLive();
  if(done)toast(done);
}

function renderAll(){
  applyLayout();renderFolders();renderTopbar();renderView();renderRightTabs();renderRightBody();
  if(state.settings)renderSettings();
}
async function submit(){
  await action(async()=>{
    if(!project())throw new Error('请先打开一个工作文件夹');
    let s=session();
    // A running session takes the message mid-turn (插话) or keeps it for after the turn (排队).
    const delivery=s&&busy(s)?deliveryFor(s):undefined;
    if(s?.selectionIssue&&!delivery)throw new Error(s.selectionIssue+'；请先刷新来源并重新确认模型');
    if(submitting)return;
    if(runtime(s?s.runtimeId:state.runtimeId)?.checking){toast('正在检测运行环境，稍等几秒再发送');return;}
    const text=state.draft.trim(),queued=pending.list(views.draftKey(state));
    if(queued.some(x=>x.status==='staging')){toast('附件还在处理，稍等一下再发送');return;}
    if(queued.some(x=>x.status==='error')){toast('有附件没能添加，请先移除它们',true);return;}
    const attachments=queued.map(x=>x.attachment.id);
    if(!text&&!attachments.length)return;
    if(!s){
      const env=runtime(state.runtimeId);
      if(!usable(env))throw new Error(`${unusableReason(env)||'运行环境不可用'}，请换一个运行环境，或到设置 → 运行环境处理`);
      if(!state.modelKey)throw new Error('请先选择模型');
    }
    const token=sessionEpoch,projectId=state.projectId,draftKey=views.draftKey(state);
    submitting=true;
    try{
      if(!s){
        const model=currentModel();
        s=await call('session:create',{projectId,runtimeId:state.runtimeId,selection:{modelKey:state.modelKey,identity:model?.identity,reasoning:state.reasoning||undefined,contextTokens:state.modelKey==='native'?null:state.contextTokens,contextBudget:state.contextBudget,nativeModel:state.nativeModel||undefined}});
        views.drafts.delete(draftKey);
        if(token===sessionEpoch&&projectId===state.projectId){
          state.sessionId=s.id;state.events=[];state.historyLoading=null;state.draft='';metrics.clear();
          await snapshot();
          if(token===sessionEpoch&&state.sessionId===s.id){renderFolders();renderTopbar();renderView();renderRightTabs();}
        }
      }
      views.drafts.delete(projectId+':'+s.id);
      // The backend moves sent attachments into the session; a failed send puts them back.
      const taken=pending.take(draftKey);
      if(state.sessionId===s.id){
        state.draft='';
        const prompt=$('#prompt');
        if(prompt){prompt.value='';autosize(prompt);}
        renderTray();
      }
      const sent=call('session:prompt',{sessionId:s.id,text,...(attachments.length?{attachments}:{}),...(delivery?{delivery}:{})});
      submitting=false;
      let result;
      try{result=await sent;}catch(error){for(const item of taken)pending.add(projectId+':'+s.id,item);markDiscarded([]);if(state.sessionId===s.id)renderTray();throw error;}
      // The backend may keep a mid-turn message for later (e.g. the turn is still connecting); say where it went.
      if(delivery==='steer'&&result?.delivery==='queue')toast(result.note||'这一刻还不能插话，已改为排队，本轮结束后发送');
      else if(delivery==='queue'&&result?.delivery==='queue')toast('已排队，本轮结束后自动发送');
      await snapshot();
      if(state.sessionId===s.id){renderComposerControls();renderFooter();}
    }catch(error){
      if(s){
        const key=projectId+':'+s.id;
        if(!views.drafts.has(key))views.drafts.set(key,text);
        if(state.sessionId===s.id&&!state.draft){
          state.draft=views.drafts.get(key);
          const prompt=$('#prompt');
          if(prompt)prompt.value=state.draft;
        }
      }
      throw error;
    }finally{submitting=false;}
  });
}
async function openSession(id){
  const token=++sessionEpoch;
  closeMenu();
  if(state.settings)closeSettings();
  stashDraft();
  const s=state.snapshot.sessions.find(x=>x.id===id);
  activateProject(s.projectId);
  state.sessionId=id;
  views.loadDraft(state);
  state.events=[];state.historyLoading={token,events:[]};
  metrics.clear();
  renderAll();
  let events;
  try{events=await call('session:events',{sessionId:id});}
  catch(error){
    if(token===sessionEpoch&&state.sessionId===id){
      const buffered=state.historyLoading?.events??[];
      state.historyLoading=null;
      for(const e of buffered)metrics.feed(e);
      state.events=displayEvents(buffered);
      renderChat(true);
    }
    throw error;
  }
  if(token!==sessionEpoch||state.sessionId!==id)return;
  const ids=new Set(events.map(e=>e.id)),all=[...events,...state.historyLoading.events.filter(e=>!ids.has(e.id))];
  state.historyLoading=null;
  for(const e of all)metrics.feed(e);
  activity.replay(id,all);
  state.events=displayEvents(all);
  renderChat(true);renderFooter();
  if(ui.rightTab==='changes')paintChanges();
}
function newSession(projectId=state.projectId){
  sessionEpoch++;
  closeMenu();
  if(state.settings)closeSettings();
  stashDraft();
  if(projectId&&projectId!==state.projectId)activateProject(projectId);
  if(projectId&&ui.collapsed.includes(projectId)){ui.collapsed=ui.collapsed.filter(x=>x!==projectId);saveUi();}
  state.sessionId=null;state.historyLoading=null;state.events=[];metrics.clear();
  views.loadDraft(state);
  renderAll();
  $('#prompt')?.focus();
}
async function addProject(){
  await action(async()=>{
    const p=await call('project:add');
    if(!p)return;
    await snapshot();
    newSession(p.id);
  });
}
async function openNative(){
  if(!project())throw new Error('请先选择工作文件夹');
  await action(()=>call('native:open',{runtimeId:session()?.runtimeId??state.runtimeId,projectId:state.projectId,sessionId:state.sessionId}));
}
function renameSession(){
  const s=session();
  if(!s)return;
  modal('重命名会话',`<input id="session-title" value="${esc(s.title)}" maxlength="100" autocomplete="off">`,async()=>{
    await call('session:rename',{sessionId:s.id,title:$('#session-title').value});
    await snapshot();renderFolders();renderTopbar();
  });
  const input=$('#session-title');
  input.focus();input.select();
}
function archiveSession(id){
  const s=state.snapshot.sessions.find(x=>x.id===id);
  if(!s)return;
  modal('归档会话',`<p>“${esc(s.title)}”会从列表中隐藏，会话记录仍保留在工作区数据目录里。</p>`,async()=>{
    await call('session:archive',{sessionId:id});
    if(state.sessionId===id){state.sessionId=null;state.events=[];metrics.clear();views.loadDraft(state);}
    await snapshot();renderAll();
  },{confirm:'归档',danger:true});
}
function openRecovery(s){
  const model=modelOf(s.selection);
  if(!model?.enabled)throw new Error('请先刷新模型源，等同一模型重新可用后再确认');
  const selected=s.selection,hasContext=model.contexts.some(c=>c.tokens===selected.contextTokens);
  modal('重新确认模型与参数',`<p>继续使用 ${esc(sourceNames[model.source])} · ${esc(model.name)}<br><span class="mono">模型 ID：${esc(model.id)}</span><br>确认后保留当前运行环境、原生会话和历史记录。</p>
    <label for="rebind-reasoning">思考强度</label><select id="rebind-reasoning"><option value="">来源默认</option>${model.reasoning.map(e=>`<option value="${esc(e)}" ${selected.reasoning===e?'selected':''}>${esc(effortName(e))}</option>`).join('')}</select>
    <label for="rebind-context">上下文窗口</label><select id="rebind-context">${model.contexts.length?'':'<option value="">原生默认</option>'}${model.contexts.map(c=>`<option value="${c.tokens}" ${(hasContext?selected.contextTokens:defaultContext(model))===c.tokens?'selected':''}>${compact(c.tokens)}${c.tokens===model.defaultContextTokens?'（默认）':''}</option>`).join('')}</select>
    <label for="rebind-budget">本地压缩预算（可留空，例如 200K、0.5M）</label><input id="rebind-budget" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="不设置" value="${esc(selected.contextBudget?formatTokens(selected.contextBudget):'')}">`,async()=>{
    const context=$('#rebind-context').value,contextTokens=context?Number(context):null,check=budgetCheck($('#rebind-budget').value,{max:budgetMax(model,contextTokens)});
    if(!check.ok)throw new Error(`本地压缩预算：${check.text}`);
    await call('session:rebind',{sessionId:s.id,selection:{...selected,identity:model.identity,reasoning:$('#rebind-reasoning').value||undefined,contextTokens,contextBudget:check.value}});
    await snapshot();
    if(state.sessionId===s.id){renderComposerControls();renderBanner();renderFooter();}
    toast('已确认模型更新，可以继续当前会话');
  },{confirm:'确认'});
}
async function applySessionParams(){
  const s=session(),m=modelOf(s?.selection),p=state.params;
  if(!s||!m)return;
  await call('session:rebind',{sessionId:s.id,selection:{...s.selection,identity:m.identity,reasoning:p.reasoning||undefined,contextTokens:p.contextTokens,contextBudget:p.contextBudget}});
  closeMenu();
  await snapshot();
  renderComposerControls();renderBanner();renderFooter();
  toast('已更新此会话的参数，下一轮生效');
}
function answerQuestion(approvalId){
  const e=state.events.find(x=>x.approvalId===approvalId&&x.type==='question'),summary=e?approvalSummary(e):'';
  modal('回答 Agent 的问题',`${summary?`<p class="question-text">${esc(summary)}</p>`:''}<p class="muted">按原生协议填写 answers 对象（JSON）。复杂交互也可以在原生界面中完成。</p><textarea id="question-answer" rows="7" placeholder="{}" spellcheck="false"></textarea>`,async()=>{
    const answer=JSON.parse($('#question-answer').value||'{}');
    await call('session:approve',{sessionId:state.sessionId,approvalId,choice:'approve',answer});
  },{confirm:'发送回答'});
}
function toggleLeft(){ui.left=!ui.left;saveUi();applyLayout();renderTopbar();}
function toggleRight(){ui.right=!ui.right;saveUi();applyLayout();renderTopbar();if(ui.right)renderRightBody();}
function setRightTab(tab){
  ui.rightTab=tab;saveUi();
  if(!ui.right){ui.right=true;applyLayout();renderTopbar();}
  renderRightTabs();renderRightBody();
}
async function saveModelDefault(){
  await call('preference:save',{modelKey:state.modelKey==='native'?'native:'+state.runtimeId:state.modelKey,value:{runtimeId:state.runtimeId,nativeModel:state.nativeModel,reasoning:state.reasoning,contextTokens:state.contextTokens,contextBudget:state.contextBudget}});
  await snapshot();
  toast('已记住此模型的参数搭配');
}

/* ---------- events ---------- */
document.addEventListener('mousedown',e=>{
  if(!menu)return;
  if(e.target.closest('#popover')||e.target.closest(`#${menu.anchorId}`))return;
  closeMenu();
});
// A folded run has no rows until it is opened; fill them in without moving the view.
document.addEventListener('toggle',e=>{
  if(!e.target.matches?.('.tool-fold')||!e.target.open||e.target.querySelector('.tool-fold-body')?.childElementCount)return;
  const scroller=$('#scroller'),top=scroller?.scrollTop;
  renderChat(true);
  if(scroller)scroller.scrollTop=top;
},true);
document.addEventListener('contextmenu',e=>{
  const link=e.target.closest?.('.markdown a:not(.file-link)'),url=link&&webLink(link.getAttribute('href'));
  if(url){e.preventDefault();closeMenu();menu={kind:'link',at:{x:e.clientX,y:e.clientY},url};paintMenu();return;}
  const target=fileTarget(e.target);
  if(!target||!state.projectId)return;
  e.preventDefault();
  const at={x:e.clientX,y:e.clientY};
  void action(async()=>{
    const info=await locateFile(target.path);
    closeMenu();menu={kind:'file',at,file:{...info,path:target.path,line:target.line}};paintMenu();
  });
});
document.addEventListener('click',e=>{
  const t=e.target;
  const hit=selector=>t.closest(selector);
  let el;
  if((el=hit('[data-archive]'))){e.stopPropagation();closeMenu();if(el.dataset.archive)archiveSession(el.dataset.archive);return;}
  if((el=hit('[data-new-in]'))){newSession(el.dataset.newIn);return;}
  if((el=hit('[data-reveal]'))){void action(()=>call('project:reveal',{projectId:el.dataset.reveal}));return;}
  if((el=hit('[data-folder]'))){
    const id=el.dataset.folder;
    ui.collapsed=ui.collapsed.includes(id)?ui.collapsed.filter(x=>x!==id):[...ui.collapsed,id];
    saveUi();renderFolders();return;
  }
  if((el=hit('[data-show-all]'))){showAll.add(el.dataset.showAll);renderFolders();return;}
  if((el=hit('[data-session]'))){void action(()=>openSession(el.dataset.session));return;}
  if((el=hit('[data-stop-session]'))){stopSession(el.dataset.stopSession);return;}
  if((el=hit('[data-rtab]'))){setRightTab(el.dataset.rtab);return;}
  if((el=hit('[data-pick-folder]'))){closeMenu();newSession(el.dataset.pickFolder);return;}
  if((el=hit('[data-env]'))){selectRuntime(el.dataset.env);closeMenu();renderComposerControls();renderBanner();return;}
  if((el=hit('[data-permission-choice]'))){
    const value=el.dataset.permissionChoice==='__default'?null:el.dataset.permissionChoice,s=session(),runtimeId=s?s.runtimeId:state.runtimeId;
    // A new session's default is saved for the chosen kind of model (native exec or gateway).
    const current=s?sessionPermission(s).mode:permissionsFor(null,runtime(runtimeId))?.current??null;
    changePermission(runtimeId,value,current,async()=>{if(s)await call('session:permission',{sessionId:s.id,mode:value});else await call('runtime:permission',{runtimeId,mode:value,selection:{modelKey:state.modelKey}});await snapshot();closeMenu();renderComposerControls();});return;
  }
  if((el=hit('[data-runtime-permission]'))){
    const [runtimeId,choice,scope]=el.dataset.runtimePermission.split('|');
    const mode=choice==='__default'?null:choice,saved=runtime(runtimeId)?.permissions,current=(scope==='native'?saved?.bySelection?.native:saved)?.current??null;
    changePermission(runtimeId,mode,current,async()=>{await call('runtime:permission',{runtimeId,mode,...(scope==='native'?{selection:{modelKey:'native'}}:{})});await snapshot();renderSettings();renderComposerControls();});return;
  }
  if((el=hit('[data-model-group]'))){
    const source=el.dataset.modelGroup;
    if(openGroups.has(source))openGroups.delete(source);else openGroups.add(source);
    const list=$('#menu-list');if(list){list.innerHTML=modelListHtml();placeMenu();}
    return;
  }
  if((el=hit('[data-model-key]'))){selectModel(el.dataset.modelKey);repaintParams();return;}
  if((el=hit('[data-effort]'))){paramTarget().reasoning=el.dataset.effort;repaintParams();return;}
  if((el=hit('[data-context]'))){
    const target=paramTarget(),value=Number(el.dataset.context),m=session()?modelOf(session().selection):currentModel();
    target.contextTokens=value;
    if(target.contextBudget&&!validBudget(m,target.contextBudget,value))target.contextBudget=null;
    repaintParams();return;
  }
  if((el=hit('[data-open-settings]'))){closeGuide();openSettings(el.dataset.openSettings);return;}
  if((el=hit('[data-source-install]'))){void action(()=>call('source:install',{id:el.dataset.sourceInstall}));return;}
  if((el=hit('[data-source-cancel]'))){void action(()=>call('source:cancel',{id:el.dataset.sourceCancel}));return;}
  if((el=hit('[data-source-page]'))){void action(()=>call('source:openPage',{id:el.dataset.sourcePage}));return;}
  if((el=hit('[data-env-install]'))){void action(()=>call('environment:install',{id:el.dataset.envInstall}));return;}
  if((el=hit('[data-env-update]'))){void action(()=>call('environment:update',{id:el.dataset.envUpdate}));return;}
  if((el=hit('[data-env-check]'))){const id=el.dataset.envCheck;void action(()=>serviceCall('environment:check',{id},'已检查更新'));return;}
  if((el=hit('[data-env-cancel]'))){void action(()=>call('environment:cancel',{id:el.dataset.envCancel}));return;}
  if((el=hit('[data-env-page]'))){void action(()=>call('environment:openPage',{id:el.dataset.envPage}));return;}
  if((el=hit('[data-svc-action]'))){const [id,verb]=el.dataset.svcAction.split('|');el.disabled=true;void action(()=>serviceCall(`bridgeService:${verb}`,{id})).finally(()=>{el.disabled=false;});return;}
  if((el=hit('[data-svc-key]'))){const [id,verb]=el.dataset.svcKey.split('|');void action(()=>serviceKey(id,verb));return;}
  if((el=hit('[data-svc-models]'))){void toggleServiceModels(el.dataset.svcModels);return;}
  if((el=hit('[data-svc-refresh]'))){
    const id=el.dataset.svcRefresh,view=serviceView(id);el.disabled=true;
    void action(async()=>{await call('bridgeService:refreshModels',{id});if(view.models){const r=await call('bridgeService:models',{id});view.list=Array.isArray(r)?r:r?.data??[];}await serviceCall(null,null,'模型列表已刷新');}).finally(()=>{el.disabled=false;});
    return;
  }
  if((el=hit('[data-svc-connect]'))){
    const [id,target]=el.dataset.svcConnect.split('|'),name={dsh:'DeepSeek Harness',kimi:'Kimi Code',codex:'Codex CLI'}[target]??target,view=serviceView(id);
    // Checking the service and writing the agent's config takes several seconds.
    view.connecting=true;refreshSettingsLive();
    void action(async()=>{
      const r=await call('bridgeService:connect',{id,target}),moved=r?.defaultMigration?.to,env=[r?.requiredEnv].flat().filter(Boolean);
      await serviceCall(null,null);
      // A key that still has to go into an environment variable is not "connected" yet: say what is left.
      if(env.length){modal(`还差一步接入 ${name}`,`<p class="modal-text">${esc(r.message??`请把本接口的密钥设为环境变量 ${env.join('、')}，再重新打开 ${name}。`)}</p>`,()=>{},{confirm:'知道了'});return;}
      const where=target==='codex'&&r?.profile?`，在 Codex 里用 codex --profile ${r.profile} 使用`:target==='kimi'&&r?.path?` · ${r.path}`:r?.providerId?` · ${r.providerId}`:'';
      // DSH watches these files itself, so nothing needs restarting whether or not it is open.
      const live=r?.applied==='hot-reload'?'。运行中的 DSH 几秒内自动加载，没开的话下次启动生效':'';
      toast(`已接入 ${name}${where}${moved?`；DSH 默认模型改为 ${moved.model}${r.defaultMigration.matched===false?'（没找到同款，用了第一个）':''}`:''}${live}`);
    }).finally(()=>{view.connecting=false;refreshSettingsLive();});
    return;
  }
  if((el=hit('[data-svc-disconnect]'))){
    const [id,target]=el.dataset.svcDisconnect.split('|'),name={dsh:'DeepSeek Harness',kimi:'Kimi Code',codex:'Codex CLI'}[target]??target;
    modal(`断开 ${name}`,`<p class="modal-text">会从 ${esc(name)} 的配置里移除这个接口和它的密钥，其他配置不变。修改前会留一份备份。</p>`,async()=>{
      const r=await call('bridgeService:disconnect',{id,target});
      await serviceCall(null,null,r?.changed===false?`${name} 里没有这个接口`:r?.message??`已断开 ${name}`);
    },{confirm:'断开',danger:true});
    return;
  }
  if((el=hit('[data-svc-apply-port]'))){
    const id=el.dataset.svcApplyPort,input=document.querySelector(`[data-svc-port="${CSS.escape(id)}"]`),port=Number(input?.value);
    void action(async()=>{if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('端口需要是 1024–65535 之间的整数');input.blur();await serviceCall('bridgeService:configure',{id,port},`端口已改为 ${port}`);});
    return;
  }
  if((el=hit('[data-copy-text]'))){const text=el.dataset.copyText;if(text)void action(async()=>{await call('clipboard:write',{text});toast('已复制');});return;}
  if((el=hit('[data-settings-tab]'))){state.settings=el.dataset.settingsTab;renderSettings();return;}
  if((el=hit('[data-theme-choice]'))){void action(async()=>{await call('preference:theme',{theme:el.dataset.themeChoice});await snapshot();renderSettings();});return;}
  if((el=hit('[data-refresh-source]'))){
    const source=el.dataset.refreshSource;
    void action(async()=>{
      const pending=call('provider:refresh',{source});
      setTimeout(()=>void snapshot().then(()=>{refreshSettingsLive();if(ui.rightTab==='tasks')renderTasksLive();}),120);
      await pending;capCache.clear();await snapshot();refreshSettingsLive();renderComposerControls();paintGuide();
      toast(`${sourceNames[source]} 目录已更新`);
    });
    return;
  }
  if((el=hit('[data-use-model]'))){
    const key=el.dataset.useModel,m=models().find(x=>x.key===key);
    if(m){
      // Keep the current environment when it can run this model; otherwise the first usable one that can.
      const target=m.boundRuntime??(compatible(state.runtimeId,m)&&usable(runtime(state.runtimeId))?state.runtimeId:state.snapshot.runtimes.find(r=>usable(r)&&compatible(r.id,m))?.id);
      if(!target||!usable(runtime(target))){toast(target?unusableReason(runtime(target)):'没有能运行这个模型的可用环境',true);return;}
      state.runtimeId=target;ui.runtimeId=target;
    }
    closeSettings();
    selectModel(key);
    newSession(state.projectId);return;
  }
  if((el=hit('[data-use-runtime]'))){if(selectRuntime(el.dataset.useRuntime)){closeSettings();newSession(state.projectId);}return;}
  if((el=hit('[data-configure-runtime]'))){void action(async()=>{await call('runtime:configure',{runtimeId:el.dataset.configureRuntime});await snapshot();renderSettings();renderComposerControls();renderBanner();});return;}
  if((el=hit('[data-open-runtime]'))){void action(()=>call('native:open',{runtimeId:el.dataset.openRuntime,projectId:state.projectId}));return;}
  if((el=hit('[data-file-path]'))){void action(()=>openFile(el.dataset.filePath,el.dataset.directory==='true'));return;}
  if((el=hit('[data-diff-file]'))){void action(()=>showDiff(el.dataset.diffFile));return;}
  if((el=hit('[data-approval]'))){void action(()=>call('session:approve',{sessionId:state.sessionId,approvalId:el.dataset.approval,choice:el.dataset.choice}));return;}
  if(hit('[data-approval-native]')){void openNative();return;}
  if((el=hit('[data-question]'))){answerQuestion(el.dataset.question);return;}
  if((el=hit('[data-quick]'))){
    const v=el.dataset.quick;
    if(v==='project')void addProject();else openSettings(v);
    return;
  }
  if((el=hit('.copy-answer'))){
    void action(async()=>{await call('clipboard:write',{text:el.closest('.message').querySelector('.message-content')?.innerText??''});toast('已复制');});
    return;
  }
  if((el=hit('[data-attach-remove]'))){removeAttachment(el.dataset.attachRemove);return;}
  if((el=hit('[data-delivery]'))){state.delivery=el.dataset.delivery==='queue'?'queue':'steer';renderComposerControls();$('#prompt')?.focus();return;}
  if((el=hit('[data-queue-edit]'))){void action(()=>editQueued(el.dataset.queueEdit));return;}
  if((el=hit('[data-queue-remove]'))){void action(()=>removeQueued(el.dataset.queueRemove));return;}
  if((el=hit('[data-queue-send]'))){el.disabled=true;void action(sendQueuedNow).finally(()=>{el.disabled=false;});return;}
  if((el=hit('[data-media-open]'))){openLightbox(el.dataset.mediaOpen,el.dataset.mediaName);return;}
  if((el=hit('[data-media-reveal]'))){void action(()=>call('media:reveal',{url:el.dataset.mediaReveal}));return;}
  if((el=hit('[data-media-save]'))){void action(async()=>{if(await call('media:save',{url:el.dataset.mediaSave}))toast('已另存');});return;}
  if(t.id==='lightbox'){$('#lightbox').close();return;}
  if((el=hit('[data-file-menu]'))){const f=menu?.file,id=el.dataset.fileMenu;closeMenu();if(f)void action(()=>fileMenuAction(id,f));return;}
  if((el=hit('.file-link'))){e.preventDefault();const line=Number(el.dataset.linkLine)||null,path=el.dataset.linkPath;void action(async()=>previewFile(await locateFile(path),line));return;}
  if((el=hit('[data-link-menu]'))){const url=menu?.url,id=el.dataset.linkMenu;closeMenu();if(url)void action(async()=>{if(id==='open')await call('link:open',{url});else{await call('clipboard:write',{text:url});toast('已复制链接');}});return;}
  if((el=hit('.markdown a'))){e.preventDefault();const url=webLink(el.getAttribute('href'));if(url)void action(()=>call('link:open',{url}));return;}
  const id=hit('button[id]')?.id;
  switch(id){
    case'new-session':newSession();break;
    case'add-project':case'empty-add-project':case'menu-open-folder':closeMenu();void addProject();break;
    case'open-settings':openSettings();break;
    case'close-settings':closeSettings();break;
    case'collapse-left':case'toggle-left':toggleLeft();break;
    case'collapse-right':case'toggle-right':toggleRight();break;
    case'folder-chip':menu?.kind==='folder'?closeMenu():openMenu(hit('#folder-chip'),'folder');break;
    case'env-chip':menu?.kind==='env'?closeMenu():openMenu(hit('#env-chip'),'env');break;
    case'model-chip':menu?.kind==='model'?closeMenu():openMenu(hit('#model-chip'),'model');break;
    case'perm-chip':menu?.kind==='permission'?closeMenu():openMenu(hit('#perm-chip'),'permission');break;
    case'session-more':menu?.kind==='session'?closeMenu():openMenu(hit('#session-more'),'session');break;
    case'menu-rename':closeMenu();renameSession();break;
    case'menu-reveal':closeMenu();void action(()=>call('project:reveal',{projectId:state.projectId}));break;
    case'rename-session':renameSession();break;
    case'native-session':void openNative();break;
    case'send':void submit();break;
    case'stop-run':{const s=session();if(s&&busy(s))stopSession(s.id);break;}
    case'attach-btn':void action(pickFiles);break;
    case'lightbox-close':$('#lightbox').close();break;
    case'save-model-default':void action(saveModelDefault);break;
    case'apply-session-params':void action(applySessionParams);break;
    case'load-native-models':void loadNativeModels();break;
    case'refresh-session-model':{const s=session();void action(async()=>{await call('provider:refresh',{source:s.selection.modelKey.split(':')[0]});await snapshot();renderComposerControls();renderBanner();});break;}
    case'rebind-session-model':void action(()=>openRecovery(session()));break;
    case'refresh-git':void renderChanges();break;
    case'init-git':void action(async()=>{await call('git:init',{projectId:state.projectId});state.git=null;await renderChanges();});break;
    case'stage-selected':void action(async()=>{
      const paths=[...document.querySelectorAll('input[name="stage-file"]:checked')].map(x=>x.value);
      await call('git:stage',{projectId:state.projectId,paths});toast('已暂存所选文件');await renderChanges();
    });break;
    case'commit':void action(async()=>{await call('git:commit',{projectId:state.projectId,message:$('#commit-message').value});toast('已创建本地提交');await renderChanges();});break;
    case'refresh-files':void action(async()=>{state.tree.clear();await loadTree();await renderFiles();});break;
    case'edit-file':if(state.file){state.file.editing=true;void renderFiles().then(()=>$('#editor')?.focus());}break;
    case'save-file':void saveFile();break;
    case'cancel-edit':void action(()=>discardFile(false));break;
    case'close-file':void action(()=>discardFile(true));break;
    case'reference-file':{
      if(!state.file)break;
      state.draft=`${state.draft}${state.draft&&!state.draft.endsWith('\n')?'\n':''}请查看文件 \`${state.file.path}\`。`;
      stashDraft();
      const prompt=$('#prompt');
      if(prompt){prompt.value=state.draft;autosize(prompt);prompt.focus();}
      toast('已把文件路径加入任务草稿');break;
    }
    case'stop-terminal':void action(()=>call('terminal:stop',{projectId:state.projectId}));break;
    case'clear-terminal':views.terminal(state.projectId).text='';renderTerminal();break;
    case'refresh-runtimes':void action(async()=>{await call('runtime:refresh');capCache.clear();await snapshot();renderSettings();renderComposerControls();renderBanner();toast('已重新检测运行环境');});break;
    case'check-environments':{const b=hit('#check-environments');b.disabled=true;void action(()=>serviceCall('environment:check',{},'已检查全部环境的更新')).finally(()=>{b.disabled=false;});break;}
    case'open-guide':openGuide();break;
    case'guide-later':closeGuide();break;
    case'guide-done':void action(async()=>{try{await call('onboarding:complete');}finally{closeGuide();}});break;
    case'guide-add-project':void addProject().then(paintGuide);break;
  }
});
document.addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if(e.key==='Escape'){
    if(menu){closeMenu();e.preventDefault();return;}
    if(state.settings&&!$('#modal').open){closeSettings();e.preventDefault();}
    return;
  }
  if(!e.ctrlKey)return;
  if(key==='n'){e.preventDefault();newSession();}
  else if(key==='b'&&e.altKey){e.preventDefault();toggleRight();}
  else if(key==='b'){e.preventDefault();toggleLeft();}
  else if(key==='j'){e.preventDefault();setRightTab('tasks');$('#terminal-command')?.focus();}
  else if(key===','){e.preventDefault();state.settings?closeSettings():openSettings();}
  else if(key==='s'&&state.file?.editing){e.preventDefault();void saveFile();}
});
window.addEventListener('resize',()=>{applyLayout();if(menu)placeMenu();});
function startResize(e){
  dragging={x:e.clientX,width:ui.rightWidth};
  $('#app').classList.add('resizing');
  e.preventDefault();
}
document.addEventListener('mousedown',e=>{if(e.target.id==='rp-resizer')startResize(e);});
// Images and videos grow the transcript after they load; stay at the bottom if the reader was there.
let chatPinned=true;
document.addEventListener('scroll',e=>{if(e.target.id==='scroller'){const s=e.target;chatPinned=s.scrollHeight-s.scrollTop-s.clientHeight<160;}},true);
for(const type of['load','loadedmetadata'])document.addEventListener(type,e=>{
  if(!chatPinned||!['IMG','VIDEO'].includes(e.target.tagName)||!e.target.closest('#chat'))return;
  const s=$('#scroller');if(s)s.scrollTop=s.scrollHeight;
},true);
// A media file that no longer loads becomes a placeholder on the next render instead of a broken icon.
document.addEventListener('error',e=>{
  const el=e.target;
  if(!['IMG','VIDEO','AUDIO'].includes(el?.tagName)||!el.closest('#chat,#attach-tray'))return;
  if(markBroken(el.getAttribute('src'))){mediaGen++;markdownCache.clear();scheduleChat();}
},true);
// Files dragged over the window go to the draft; never let a stray drop navigate the window.
document.addEventListener('dragenter',e=>{if(!carriesFiles(e))return;e.preventDefault();if(++dropDepth===1&&$('#prompt'))showDropHint(true);});
document.addEventListener('dragover',e=>{if(!carriesFiles(e))return;e.preventDefault();e.dataTransfer.dropEffect=$('#prompt')&&allowedKinds(attachCaps()).length?'copy':'none';});
document.addEventListener('dragleave',e=>{if(!carriesFiles(e))return;if(--dropDepth<=0){dropDepth=0;showDropHint(false);}});
document.addEventListener('drop',e=>{if(!carriesFiles(e))return;e.preventDefault();dropDepth=0;showDropHint(false);if($('#prompt'))void addFiles([...e.dataTransfer.files]);});
function openLightbox(url,name){
  const el=$('#lightbox'),src=mediaUrl(url);
  if(!el||!src)return;
  el.innerHTML=`<div class="lightbox-bar"><span class="lightbox-name">${esc(name??'')}</span><button class="icon-btn" data-media-reveal="${esc(src)}" title="在文件夹中显示">${icon('folder')}</button><button class="icon-btn" data-media-save="${esc(src)}" data-media-name="${esc(name??'')}" title="另存为…">${icon('download')}</button><button class="icon-btn" id="lightbox-close" title="关闭 (Esc)">${icon('close')}</button></div><img src="${esc(src)}" alt="${esc(name??'')}">`;
  el.showModal();
}
document.addEventListener('mousemove',e=>{
  if(!dragging)return;
  ui.rightWidth=Math.round(Math.max(320,Math.min(Math.min(760,innerWidth-560),dragging.width+dragging.x-e.clientX)));
  applyLayout();
});
document.addEventListener('mouseup',()=>{if(!dragging)return;dragging=null;$('#app').classList.remove('resizing');saveUi();});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.matches?.('[data-svc-profile]')){const id=t.dataset.svcProfile;t.blur();void action(()=>serviceCall('bridgeService:configure',{id,defaultProfile:t.value}));return;}
  if(t.matches?.('[data-svc-autostart]')){const id=t.dataset.svcAutostart,enabled=t.checked;void action(async()=>{try{await call('bridgeService:autostart',{id,enabled});toast(enabled?'已开启开机启动':'已关闭开机启动');}finally{await serviceCall(null,null);}});}
});

// One snapshot at a time: changes that arrive while it is in flight are folded into a single follow-up.
let refreshing=false,refreshAgain=false;
async function refreshFromBackend(){
  if(refreshing){refreshAgain=true;return;}
  refreshing=true;
  try{
    const wasChecking=state.snapshot?.startup?.environments==='checking';
    await snapshot();
    if(wasChecking&&state.snapshot.startup?.environments!=='checking'){
      capCache.clear();
      if(!guideShown&&!state.snapshot.runtimes.some(usable))openGuide();
    }
    for(const id of stopping)if(!busy(state.snapshot.sessions.find(x=>x.id===id)))stopping.delete(id);
    const s=session(),wasBusy=lastBusy;
    lastBusy=busy(s);
    renderFolders();renderTopbar();renderComposerControls();renderBanner();renderFooter();renderRightTabs();
    if(ui.rightTab==='tasks')renderTasksLive();
    if(wasBusy&&!lastBusy&&ui.right&&ui.rightTab==='changes')void renderChanges();
    if(state.settings)refreshSettingsLive();
    paintGuide();
    if(menu?.kind==='model'&&!session())repaintParams();
    if(s)scheduleChat();
    tick();
  }catch(e){toast(e.message,true);}
  finally{
    refreshing=false;
    if(refreshAgain){refreshAgain=false;clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>void refreshFromBackend(),70);}
  }
}
window.workbench.onChange(()=>{
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>void refreshFromBackend(),70);
});
window.workbench.onEvent(event=>{
  if(event.type==='source-job'){
    // Same stream as environment downloads; the catalog is refreshed by the backend once the component is ready.
    const component=state.snapshot?.sourceComponents?.find(x=>x.id===event.id);
    if(component)component.job={action:event.action,state:event.state,received:event.received,total:event.total,message:event.message};
    if(state.settings==='sources')refreshSettingsLive();
    paintGuide();
    return;
  }
  if(event.type==='environment-job'){
    // Download progress arrives faster than snapshots; patch the one environment and repaint its card.
    const env=state.snapshot?.environments?.find(x=>x.id===event.id);
    if(env)env.job={action:event.action,state:event.state,received:event.received,total:event.total,message:event.message};
    if(state.settings==='runtimes')refreshSettingsLive();
    paintGuide();
    return;
  }
  if(['terminal','terminal-start','terminal-exit'].includes(event.type)){
    const terminal=views.terminalEvent(event);
    if(event.projectId===state.projectId){
      state.terminalText=terminal.text;state.terminalBusy=terminal.running;
      const out=$('#terminal-output');
      if(event.type==='terminal'&&out){out.textContent=terminal.text;out.scrollTop=out.scrollHeight;}
      else if(event.type!=='terminal')renderTerminal();
    }
    return;
  }
  if(event.sessionId){
    // Every session's events reach the renderer, so background sessions get a precise status too.
    activity.feed(event);
    paintActivity(event.sessionId);
  }
  if(event.type==='attachments-discarded')markDiscarded(event.attachmentIds??[]);
  if(event.sessionId!==state.sessionId)return;
  if(event.type==='turn-end'){
    // An image may be written only after the text that shows it: look the misses up again.
    let retry=false;
    for(const [key,found] of mediaLookup)if(found===null&&key.startsWith(event.sessionId+'\u0000')){mediaLookup.delete(key);retry=true;}
    if(retry)mediaGen++;
  }
  if(state.historyLoading){state.historyLoading.events.push(event);return;}
  metrics.feed(event);
  appendDisplayEvent(state.events,event);
  scheduleChat();
  if(event.type==='diff'&&ui.rightTab==='changes'&&ui.right)paintChanges();
});

async function start(){
  renderSidebarFrame();renderRightFrame();applyLayout();
  await action(async()=>{
    await snapshot();
    lastBusy=busy(session());
    renderAll();tick();
    // First run means no folders and no conversations yet; people upgrading keep their workspace undisturbed.
    const firstRun=state.snapshot.onboarding?.show&&!state.snapshot.projects.length&&!state.snapshot.sessions.length;
    const scanning=state.snapshot.startup?.environments==='checking';
    if(!guideShown&&(firstRun||!scanning&&!state.snapshot.runtimes.some(usable)))openGuide();
    await Promise.all(state.snapshot.projects.map(async p=>{
      const terminal=views.terminal(p.id),revision=terminal.revision;
      const saved=await call('terminal:state',{projectId:p.id});
      if(terminal.revision===revision)Object.assign(terminal,saved);
    }));
    if(ui.rightTab==='tasks')renderTerminal();
  });
}
void start();
