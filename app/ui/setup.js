import {icon,logo} from './icons.js';
import {fileSize} from './attachments.js';
import {resetText,upstreamText} from './upstream.js';

/* Development environments (DSH, Kimi Code, Codex, Antigravity), the model-source interfaces
 * Bridge++ offers to other agents (bridge++_qoder, Bridge++_WorkBuddy) and the first-run guide.
 * The backend owns detection, downloads, services and keys; these helpers only render what the
 * snapshot reports and never guess a status the backend did not give. */

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const tiles={dsh:'DS',kimi:'Ki',codex:'Cx',antigravity:'AG',claude:'CC'};
const tile=r=>`<span class="rt-tile rt-${esc(r?.id??'none')}">${esc(tiles[r?.id]??'?')}</span>`;

/** A runtime the workbench may use: the backend's status when it reports one, otherwise whether it was found. */
export const usable=r=>!!r&&(r.status?r.status==='ready':!!r.installed);
// DSH's two modes without a sandbox. DSH confirms them in its own window, so Bridge++ does too.
const permissionWarnings={dsh:{
  auto:{title:'确认启用完全权限？',text:'这一档没有沙箱，也不再询问：Agent 可以直接改文件、运行外部命令，包括敏感操作。只在你信任当前任务时使用。',confirm:'启用完全权限'},
  'auto-review':{title:'确认启用自动审查？',text:'这一档没有沙箱。每次工具调用前由当前模型审查，审查拒绝的调用再由你决定。这是 DSH 的实验功能，可能误放行或误拒绝，也会多消耗 token。',confirm:'启用自动审查'},
},claude:{
  // Native bypassPermissions: Claude Code has no OS sandbox of its own on Windows.
  auto:{title:'确认跳过所有权限询问？',text:'这一档对应 Claude Code 原生的 bypassPermissions：不再询问，Agent 可以直接改文件、运行任何命令，包括删除和联网操作。Claude Code 在 Windows 上没有沙箱。只在你信任当前任务时使用。',confirm:'跳过所有询问'},
}};
export const permissionWarning=(runtimeId,mode)=>permissionWarnings[runtimeId]?.[mode]??null;
export const statusOf=r=>r?.status??(r?.installed?'ready':'missing');
const statusNames={ready:'可用',missing:'未安装','needs-setup':'需要设置',error:'检测失败',checking:'正在检测'};
/** Why a runtime cannot be used, in the user's words. Until detection ends, what the last run saw says nothing about now. */
export function unusableReason(r){
  if(!r)return'未选择运行环境';
  if(r.checking&&!usable(r))return'正在检测这个运行环境';
  if(r.reason)return r.reason;
  return{missing:`${r.name} 尚未安装`,'needs-setup':`${r.name} 还需要完成设置`,error:`${r.name} 检测失败`}[statusOf(r)]??'';
}
// Codex and Antigravity sign in to services that some networks cannot reach; say so where it matters.
const networkNotes={codex:'需要能访问 OpenAI 的网络与账号',antigravity:'需要能访问 Google 的网络与账号',claude:'由 Bridge++ 从 npm 仓库下载安装（约 345 MB），不需要 Anthropic 账号'};
/** Runtimes Bridge++ runs only as a tool executor, without a native window to open. */
const executorOnly=new Set(['claude']);
// Claude Code: what keeps it apart from the Claude desktop app and from Anthropic, shown on its card.
const isolationNotes={claude:'独立的配置目录，不登录、不带任何 Anthropic 凭据；只连 Bridge++ 本地网关，用 Qoder CN / WorkBuddy 模型。不读写本机 Claude 桌面版的数据。'};
const kindNames={managed:'由 Bridge++ 管理',bundled:'随 Bridge++ 附带',system:'系统安装'};
const jobVerbs={install:'安装',update:'更新'};
const ago=date=>{
  const s=(Date.now()-Date.parse(date))/1000;
  if(!(s>=0))return'';
  if(s<60)return'刚刚';if(s<3600)return`${Math.floor(s/60)} 分钟前`;if(s<86400)return`${Math.floor(s/3600)} 小时前`;
  return`${Math.floor(s/86400)} 天前`;
};
const running=job=>!!job&&['downloading','verifying','installing'].includes(job.state);

/* ---------- environments ---------- */
function jobHtml(job){
  if(!job)return'';
  const verb=jobVerbs[job.action]??'处理';
  if(job.state==='downloading'){
    const total=job.total>0?job.total:null,share=total?Math.min(1,(job.received??0)/total):null;
    return`<div class="job"><div class="job-text"><span class="spinner"></span>正在下载${share===null?'':` ${Math.round(share*100)}%`}<span class="muted">${esc([fileSize(job.received??0),total?fileSize(total):''].filter(Boolean).join(' / '))}</span></div><div class="job-bar${share===null?' unknown':''}"><i style="width:${share===null?35:Math.round(share*100)}%"></i></div></div>`;
  }
  if(job.state==='verifying')return`<div class="job"><div class="job-text"><span class="spinner"></span>正在校验下载的文件…</div><div class="job-bar unknown"><i></i></div></div>`;
  if(job.state==='installing')return`<div class="job"><div class="job-text"><span class="spinner"></span>正在${verb}${job.message?`<span class="muted">${esc(job.message)}</span>`:'，请在安装程序里完成'}</div><div class="job-bar unknown"><i></i></div></div>`;
  if(job.state==='done')return`<div class="job done">${icon('check')}<span>${verb}完成${job.message?`：${esc(job.message)}`:''}</span></div>`;
  if(job.state==='cancelled')return`<div class="job muted">${icon('close')}<span>已取消${verb}</span></div>`;
  if(job.state==='failed')return`<div class="error-box">${esc(`${verb}失败：${job.message??'未知原因'}`)}</div>`;
  return'';
}
function versionLine(env,r){
  const installed=env?.installed??(r?.version?{version:r.version}:null);
  const parts=[];
  if(installed?.version)parts.push(`<span>已安装 <b>${esc(installed.version)}</b>${installed.kind&&kindNames[installed.kind]?`<span class="muted"> · ${kindNames[installed.kind]}</span>`:''}</span>`);
  if(env?.updateAvailable&&env.latest?.version)parts.push(`<span class="update-tag">${icon('download')}可更新到 ${esc(env.latest.version)}</span>`);
  else if(env?.latest?.version&&installed?.version)parts.push(`<span class="muted">已是最新${env.latest.checkedAt?` · ${ago(env.latest.checkedAt)}检查`:''}</span>`);
  else if(env?.latest?.version)parts.push(`<span class="muted">最新 ${esc(env.latest.version)}</span>`);
  return parts.length?`<div class="env-version">${parts.join('')}</div>`:'';
}
function environmentActions(env,r,{canOpenNative}){
  const a=env?.actions??{},busy=running(env?.job),list=[];
  if(busy&&a.cancel)list.push(`<button class="btn sm" data-env-cancel="${esc(r.id)}">取消</button>`);
  if(!busy&&a.install&&statusOf(r)==='missing')list.push(`<button class="btn sm primary" data-env-install="${esc(r.id)}">${icon('download')}下载安装</button>`);
  // With an update check, offer the update once a newer version is known; without one (agy), the
  // official updater itself is the way to find out, so it is always offered.
  if(!busy&&a.update&&env?.updateAvailable===true)list.push(`<button class="btn sm primary" data-env-update="${esc(r.id)}">${icon('download')}更新${env.latest?.version?`到 ${esc(env.latest.version)}`:''}</button>`);
  else if(!busy&&a.update&&!a.check&&usable(r))list.push(`<button class="btn sm" data-env-update="${esc(r.id)}">${icon('download')}运行官方更新</button>`);
  if(!busy&&a.check)list.push(`<button class="btn sm" data-env-check="${esc(r.id)}">${icon('refresh')}检查更新</button>`);
  if(env?.page)list.push(`<button class="btn sm" data-env-page="${esc(r.id)}">${icon('external')}官方页面</button>`);
  list.push(`<button class="btn sm" data-configure-runtime="${esc(r.id)}">指定路径</button>`);
  if(usable(r))list.push(`${executorOnly.has(r.id)?'':`<button class="btn sm" data-open-runtime="${esc(r.id)}" ${canOpenNative?'':'disabled'}>${icon('external')}原生程序</button>`}<button class="link-btn" data-use-runtime="${esc(r.id)}">用于新会话</button>`);
  return`<div class="card-actions">${list.join('')}</div>`;
}
/** One card on Settings › 运行环境; `env` is the backend's environment entry, when it has one. */
export function environmentCardHtml(r,env,{permissions='',canOpenNative=false}={}){
  const status=statusOf(r),busy=running(env?.job),scanning=!!r.checking&&!busy;
  const label=busy?`正在${jobVerbs[env.job.action]??'处理'}`:scanning?statusNames.checking:statusNames[status]??status;
  const reason=status!=='ready'&&!scanning?unusableReason(r):'';
  const note=(status!=='ready'&&!scanning&&networkNotes[r.id]?`<div class="env-note">${icon('info')}<span>${networkNotes[r.id]}</span></div>`:'')+(isolationNotes[r.id]?`<div class="env-note">${icon('lock')}<span>${isolationNotes[r.id]}</span></div>`:'');
  return`<article class="runtime-card env-${esc(status)}"><div class="card-top">${tile(r)}<span class="card-status ${busy||scanning?'busy':status==='ready'?'ready':status==='missing'?'none':status==='error'?'error':'warn'}">${busy||scanning?'<span class="spinner"></span>':'<span class="status-dot"></span>'}${esc(label)}</span></div>
    <h3>${esc(r.name)}<span class="proto">${esc(r.protocol)}</span></h3><p>${esc(r.description)}</p>
    ${versionLine(env,r)}${reason?`<div class="env-reason">${icon('alert')}<span>${esc(reason)}</span></div>`:''}${r.warning?`<div class="env-reason">${icon('alert')}<span>${esc(r.warning)}</span></div>`:''}${note}${jobHtml(env?.job)}
    ${usable(r)?`<div class="features">${esc(r.tools)}</div>${permissions}`:''}
    ${r.executable||r.desktop?`<div class="runtime-path mono" title="${esc(r.executable??r.desktop)}">${esc(r.executable??r.desktop)}</div>`:''}
    ${scanning?'':environmentActions(env,r,{canOpenNative})}</article>`;
}

/* ---------- model-source interfaces for other agents ---------- */
const serviceStates={running:'运行中',stopped:'已停止',starting:'正在启动',error:'出错',checking:'正在核实',unavailable:'不可用',crashed:'已异常退出'};
const sourceLogos={qoder:'Q',workbuddy:'W'};
const profileNames={dsh:'DeepSeek Harness',kimi:'Kimi Code',codex:'Codex CLI'};
function serviceStatus(s){
  const busyPort=s.error?.code==='port_in_use'||!!s.portOwner;
  const pending=['starting','checking'].includes(s.status),cls=s.status==='running'?'ready':pending?'busy':['error','unavailable','crashed'].includes(s.status)||busyPort?'error':'none';
  const text=busyPort&&s.status!=='running'?'端口被占用':serviceStates[s.status]??s.status??'未知';
  return`<span class="card-status ${cls}">${pending?'<span class="spinner"></span>':'<span class="status-dot"></span>'}${esc(text)}${s.status==='running'&&s.pid?`<span class="muted"> · pid ${esc(s.pid)}</span>`:''}</span>`;
}
function copyRow(label,value,{id,mono=true,extra=''}){
  return`<div class="svc-row"><span class="svc-label">${label}</span><code class="svc-value${mono?' mono':''}" ${id?`id="${id}"`:''} title="${esc(value)}">${esc(value)}</code>${extra}</div>`;
}
/** Models a service offers, as /v1/models describes them. */
export function serviceModelsHtml(list){
  if(!Array.isArray(list))return`<div class="svc-models"><div class="table-empty"><span class="spinner"></span> 正在读取模型…</div></div>`;
  if(!list.length)return`<div class="svc-models"><div class="table-empty">这个接口还没有可用模型。请先在「模型源」里下载组件并登录。</div></div>`;
  return`<div class="svc-models table-wrap"><table class="catalog-table"><thead><tr><th>模型 / ID</th><th>窗口</th><th>思考档位</th></tr></thead><tbody>${list.map(m=>`<tr><td><div class="model-name">${esc(m.name??m.id)}${(m.input_modalities??['text']).includes('image')?`<span class="img-badge" title="支持图片输入">${icon('image')}</span>`:''}</div><button class="model-id mono copy-id" data-copy-text="${esc(m.id)}" title="复制模型 ID">${esc(m.id)}${icon('copy')}</button></td><td>${m.context_window?`<span class="ctx-tag">${esc(compactTokens(m.context_window))}</span>`:'<span class="muted">—</span>'}</td><td>${(m.reasoning_efforts??[]).length?m.reasoning_efforts.map(e=>`<span class="effort-tag${e===m.default_reasoning_effort?' default':''}">${esc(e==='none'?'关闭':e)}</span>`).join(''):'<span class="muted">默认</span>'}</td></tr>`).join('')}</tbody></table></div>`;
}
const compactTokens=n=>n>=1e6?`${+(n/1e6).toFixed(2)}M`:n>=1e3?`${+(n/1e3).toFixed(0)}K`:String(n);
/** Where an interface is registered, newest backend shape first (connections), then the older dsh field. */
function connectionsOf(s){
  const list=s.connections??{dsh:s.dsh??null};
  const file=path=>`<span class="mono" title="${esc(path)}">${esc(path.split(/[\\/]/).slice(-2).join('/'))}</span>`;
  return Object.entries(list).filter(([,c])=>c).map(([target,c])=>{
    // What the user needs to find it again: DSH's provider, Kimi's config file, the Codex profile to launch.
    const where=target==='codex'&&c.profile?`<span class="mono">codex --profile ${esc(c.profile)}</span>`:target==='kimi'&&c.path?file(c.path):c.providerId?`provider <span class="mono">${esc(c.providerId)}</span>`:c.path?file(c.path):'';
    const env=[c.requiredEnv].flat().filter(Boolean);
    return`<div class="svc-dsh${env.length?' pending':''}">${icon(env.length?'alert':'check')}<span>${env.length?'差一步接入':'已接入'} ${esc(profileNames[target]??target)}${where?` · ${where}`:''}${env.length?` · 还需要设置环境变量 <span class="mono">${esc(env.join('、'))}</span>`:c.connectedAt?` · ${ago(c.connectedAt)}`:''}</span><button class="link-btn svc-disconnect" data-svc-disconnect="${esc(s.id)}|${esc(target)}" title="从 ${esc(profileNames[target]??target)} 的配置里移除这个接口">断开</button></div>`;
  }).join('');
}
/** The last failed request, in the upstream's own words. A day-old failure says nothing about now. */
function serviceFailure(e,now=Date.now()){
  if(!e?.message||!(now-Date.parse(e.at)<864e5))return'';
  const where=[ago(e.at),e.model,Number.isInteger(e.status)?`HTTP ${e.status}`:null].filter(Boolean).join(' · '),reset=resetText(e.resetAt,now);
  return`<div class="svc-failure">${icon('alert')}<span><b>最近失败</b>${where?` · ${esc(where)}`:''}<br>${esc(upstreamText(e))}${reset?`<br>${esc(reset)}`:''}</span></div>`;
}
/** One interface card on Settings › 对外接口. `view` holds what the user opened on this card. */
export function serviceCardHtml(s,view={}){
  const id=esc(s.id),runningNow=s.status==='running',starting=s.status==='starting';
  const top=`<div class="card-top"><span class="source-logo ${esc(s.source)}">${esc(sourceLogos[s.source]??'?')}</span>${serviceStatus(s)}</div>
    <h3>${esc(s.name)}<span class="proto">${esc(s.sourceName??s.source)}</span></h3>`;
  if(s.status==='checking')return`<article class="service-card" data-service="${id}">${top}<p class="svc-pending">正在核实这个接口的状态…</p></article>`;
  // The rest of the card needs the service folder, which is exactly what failed.
  if(s.status==='unavailable')return`<article class="service-card" data-service="${id}">${top}<div class="error-box">${esc(s.error?.message??'这个接口暂时不能使用')}</div><div class="card-actions"><button class="btn sm primary" data-svc-action="${id}|retry">${icon('refresh')}重试</button></div></article>`;
  const profiles=(s.profiles?.length?s.profiles:Object.keys(profileNames).map(p=>({id:p})));
  // "接入到" picks the agent this interface is registered in; it is also the contract plain /v1 answers with.
  const target=profiles.find(p=>p.id===s.defaultProfile)??profiles[0],targetName=profileNames[target?.id]??target?.name??target?.id;
  const address=target?.baseURL??s.baseURL??'—';
  const key=view.key?`<code class="svc-value mono revealed">${esc(view.key)}</code>`:`<code class="svc-value mono">${esc(s.keyPreview??'未生成')}</code>`;
  const owner=s.portOwner?`<div class="error-box">端口 ${esc(s.port)} 已被 ${esc(s.portOwner.name??'其他程序')}（pid ${esc(s.portOwner.pid??'?')}）占用${s.portOwner.command?`：<span class="mono">${esc(s.portOwner.command)}</span>`:''}。请先停止占用它的程序，或换一个端口。</div>`:s.error?.message?`<div class="error-box">${esc(s.error.message)}</div>`:'';
  const autostart=s.autostart??{};
  const stale=s.stale?`<div class="env-note">${icon('info')}<span>现在运行的是 ${esc(s.stale.running??'旧版本')}，这个接口空闲后会自动换成 ${esc(s.stale.current)}，也可以现在重启。</span></div>`:'';
  const requests=s.requests?.total?`<span class="muted">已处理 ${esc(s.requests.total)} 个请求${s.requests.failed?`，失败 ${esc(s.requests.failed)} 个`:''}${s.requests.lastAt?` · 最近 ${ago(s.requests.lastAt)}`:''}</span>`:'<span class="muted">还没有请求</span>';
  const models=s.models??{};
  return`<article class="service-card" data-service="${id}">${top}
    <div class="svc-rows">
      <div class="svc-row"><span class="svc-label">接入到</span><select class="svc-select" data-svc-profile="${id}" title="底下的「接入」按钮登记到这个 Agent；不带前缀的 /v1 也按它的工具约定回答">${profiles.map(p=>`<option value="${esc(p.id)}" ${p.id===target?.id?'selected':''}>${esc(profileNames[p.id]??p.name??p.id)}</option>`).join('')}</select></div>
      ${copyRow('地址',address,{extra:`<button class="icon-btn xs" data-copy-text="${esc(address)}" title="复制地址">${icon('copy')}</button>`})}
      <div class="svc-row"><span class="svc-label">密钥</span>${key}<button class="icon-btn xs" data-svc-key="${id}|reveal" title="${view.key?'隐藏':'显示'}">${icon('eye')}</button><button class="icon-btn xs" data-svc-key="${id}|copy" title="复制密钥">${icon('copy')}</button><button class="icon-btn xs" data-svc-key="${id}|regenerate" title="重新生成密钥">${icon('refresh')}</button></div>
      <div class="svc-row"><span class="svc-label">端口</span><input class="svc-port" type="number" min="1024" max="65535" value="${esc(s.port??'')}" data-svc-port="${id}"><button class="btn sm" data-svc-apply-port="${id}">应用</button></div>
      <label class="svc-row svc-toggle"><span class="svc-label">开机启动</span><input type="checkbox" data-svc-autostart="${id}" ${autostart.enabled?'checked':''}><span>登录 Windows 时在后台启动</span>${autostart.enabled&&autostart.valid===false?`<span class="svc-issue">${icon('alert')}${esc(autostart.issue??'开机任务需要修复')}</span>`:''}</label>
    </div>
    ${owner}${stale}
    <div class="card-foot"><span><b>${esc(models.count??'—')}</b> 个模型${models.refreshedAt?` · ${ago(models.refreshedAt)}刷新`:''}</span>${requests}</div>
    ${models.error?`<div class="error-box">${esc(models.error)}</div>`:''}
    ${serviceFailure(s.requests?.lastError)}
    <div class="card-actions">${runningNow?`<button class="btn sm" data-svc-action="${id}|restart">${icon('refresh')}重启</button><button class="btn sm danger" data-svc-action="${id}|stop">${icon('stop')}停止</button>`:`<button class="btn sm primary" data-svc-action="${id}|start" ${starting?'disabled':''}>${icon('play')}${s.status==='crashed'?'重新启动':'启动'}</button>`}<button class="btn sm" data-svc-models="${id}">${icon('list')}${view.models?'收起模型':'查看模型'}</button><button class="btn sm" data-svc-refresh="${id}">${icon('refresh')}刷新模型</button><button class="btn sm${runningNow?' primary':''}" data-svc-connect="${id}|${esc(target?.id??'dsh')}" ${runningNow&&!view.connecting?'':'disabled'} title="${runningNow?`把这个接口登记到 ${esc(targetName)}`:'先启动接口'}">${view.connecting?`<span class="spinner"></span>接入中…`:`${icon('plug')}接入 ${esc(targetName)}`}</button></div>
    ${connectionsOf(s)}
    ${view.models?serviceModelsHtml(view.list):''}</article>`;
}
export const serviceCardsHtml=(services,views)=>services.map(s=>serviceCardHtml(s,views.get(s.id))).join('');
export function servicesPageHtml(services,views){
  const body=Array.isArray(services)?`<div class="service-grid" id="service-grid">${serviceCardsHtml(services,views)}</div>`:`<div class="note">${icon('info')}<span>当前后端还没有提供对外接口。</span></div>`;
  return`<div class="settings-head"><h1>对外接口</h1><p>把 Qoder CN 和 WorkBuddy 模型源作为 OpenAI 兼容接口提供给其他 Agent（例如 DeepSeek Harness）。接口只监听本机，关掉 Bridge++ 窗口后仍在后台运行。</p></div>${body}
    <div class="note">${icon('info')}<span>先在「接入到」选要登记的 Agent，再点底下的「接入」按钮；地址栏显示的是该 Agent 专用的路径（<span class="mono">/dsh/v1</span>、<span class="mono">/kimi/v1</span>、<span class="mono">/codex/v1</span>），不带前缀的 <span class="mono">/v1</span> 也按所选 Agent 的工具约定回答。模型 ID、思考档位和图片输入以接口的模型列表为准。地址要写 <span class="mono">127.0.0.1</span>：用 localhost 或从网页里发起的请求会被拒绝，以免网页借用本机接口。</span></div>`;
}

/* ---------- first-run guide ---------- */
const recommended=new Set(['dsh','kimi']);
function guideEnvRow(r,env){
  const status=statusOf(r),busy=running(env?.job),a=env?.actions??{};
  let side;
  if(busy)side=`<span class="guide-state"><span class="spinner"></span>${env.job.state==='downloading'&&env.job.total?`${Math.round(100*(env.job.received??0)/env.job.total)}%`:'处理中'}</span>`;
  else if(r.checking&&status!=='ready')side='<span class="guide-state"><span class="spinner"></span>检测中</span>';
  else if(status==='ready')side=`<span class="guide-state ok">${icon('check')}${esc(env?.installed?.version?`已就绪 · ${env.installed.version}`:'已就绪')}</span>`;
  else if(a.install)side=`<button class="btn sm primary" data-env-install="${esc(r.id)}">${icon('download')}下载安装</button>`;
  else if(env?.page)side=`<button class="btn sm" data-env-page="${esc(r.id)}">${icon('external')}官方页面</button>`;
  else side=`<button class="btn sm" data-configure-runtime="${esc(r.id)}">指定路径</button>`;
  const sub=status==='ready'?r.description:busy?'':r.checking?r.description:unusableReason(r)+(networkNotes[r.id]?` · ${networkNotes[r.id]}`:'');
  return`<div class="guide-row">${tile(r)}<span class="guide-main"><span class="guide-name">${esc(r.name)}${recommended.has(r.id)?'<span class="mi-tag">推荐</span>':''}</span><span class="guide-sub">${esc(sub)}</span>${env?.job?.state==='failed'?`<span class="guide-error">${esc(env.job.message??'失败')}</span>`:''}</span>${side}</div>`;
}
const sourceTitles={qoder:'Qoder CN',workbuddy:'WorkBuddy',antigravity:'Antigravity · Gemini'};
/** What a model source still needs: its component first, then a sign-in that lets the catalog load. */
export function sourceState(catalog,component){
  if(running(component?.job))return{key:'working',label:'正在下载组件'};
  if(component?component.status!=='ready':catalog?.status==='needs-component')return{key:'component',label:'需要下载组件'};
  if(catalog?.status==='loading')return{key:'loading',label:'正在读取目录'};
  if(catalog?.status==='ready')return{key:'ready',label:'已连接'};
  if(catalog?.status==='error')return{key:'error',label:'需要处理'};
  return{key:'idle',label:'尚未读取'};
}
const sourceInstallButton=id=>`<button class="btn sm primary" data-source-install="${esc(id)}">${icon('download')}下载组件</button>`;
const sourceRefreshButton=(id,busy=false)=>`<button class="btn sm" data-refresh-source="${esc(id)}" ${busy?'disabled':''}>${icon('refresh')}${busy?'读取中':'重新检测'}</button>`;
const sourcePageButton=(id,component)=>component?.page?`<button class="btn sm" data-source-page="${esc(id)}">${icon('external')}官方页面</button>`:'';
const jobShare=job=>job?.state==='downloading'&&job.total?`${Math.round(100*(job.received??0)/job.total)}%`:'处理中';
function guideSourceRow(id,snap){
  const c=snap.catalog?.[id],component=snap.sourceComponents?.find(x=>x.id===id),now=sourceState(c,component),count=c?.models?.filter(m=>m.enabled).length??0;
  const sub={working:'',component:component?.signIn??'需要先下载这个来源的组件',loading:'正在读取目录…',ready:`已连接 · ${count} 个可用模型`,error:c?.error??component?.signIn??'需要处理',idle:'组件已就绪，还没有读取目录'}[now.key];
  const side={working:`<span class="guide-state"><span class="spinner"></span>${jobShare(component?.job)}</span>`,component:`<span class="guide-actions">${sourcePageButton(id,component)}${sourceInstallButton(id)}</span>`,loading:'<span class="guide-state"><span class="spinner"></span>读取中</span>',ready:`<span class="guide-state ok">${icon('check')}已连接</span>`,error:`<span class="guide-actions">${sourcePageButton(id,component)}${sourceRefreshButton(id)}</span>`,idle:`<span class="guide-actions">${sourceRefreshButton(id)}</span>`}[now.key];
  const failed=component?.job?.state==='failed'?component.job.message??'下载失败':component?.status==='error'?component.error:'';
  return`<div class="guide-row"><span class="source-logo ${esc(id)}">${sourceLogos[id]}</span><span class="guide-main"><span class="guide-name">${sourceTitles[id]}</span><span class="guide-sub">${esc(sub)}</span>${failed?`<span class="guide-error">${esc(failed)}</span>`:''}</span>${side}</div>`;
}
/** One card on Settings › 模型源. Antigravity has no component: it runs through its own program. */
export function sourceCardHtml(id,description,c,component){
  const now=sourceState(c,component),working=now.key==='working',loading=now.key==='loading';
  const status={ready:'ready',error:'error',component:'warn',working:'loading',loading:'loading'}[now.key]??'none';
  const count=c?.models?.filter(m=>m.enabled).length;
  const actions=working?`<button class="btn sm" data-source-cancel="${esc(id)}">${icon('close')}取消</button>`:now.key==='component'?`${sourceInstallButton(id)}${sourcePageButton(id,component)}`:`<button class="btn sm" data-refresh-source="${esc(id)}" ${loading?'disabled':''}>${icon('refresh')}${loading?'读取中':'刷新目录'}</button>${now.key==='error'?sourcePageButton(id,component):''}`;
  const detail=component?`<span class="source-package mono" title="下载到本机的组件">${esc(component.package)} ${esc(component.installedVersion??component.version)}</span>`:'';
  return`<article class="source-card"><div class="card-top"><span class="source-logo ${esc(id)}">${sourceLogos[id]??'G'}</span><span class="card-status ${status}">${working||loading?'<span class="spinner"></span>':'<span class="status-dot"></span>'}${now.label}</span></div><h3>${esc(sourceTitles[id]??id)}</h3><p>${esc(description)}</p>${now.key==='component'||now.key==='error'?`<p class="source-hint">${esc(component?.signIn??'')}</p>`:''}${detail}${component?.status==='error'&&component.error?`<div class="error-box">${esc(component.error)}</div>`:''}${c?.error&&now.key==='error'?`<div class="error-box">${esc(c.error)}</div>`:''}${jobHtml(component?.job)}<div class="card-foot"><span><b>${count??'—'}</b> 个可用模型${c?.checkedAt?` · ${ago(c.checkedAt)}`:''}</span><span class="source-actions">${actions}</span></div></article>`;
}
/** The welcome guide: at least one environment, a model source and a folder. */
export function onboardingHtml(snap){
  const envs=new Map((snap.environments??[]).map(e=>[e.id,e]));
  const ready=snap.runtimes.filter(usable).length,scanning=snap.runtimes.some(r=>r.checking);
  const order=[...snap.runtimes].sort((a,b)=>(recommended.has(b.id)?1:0)-(recommended.has(a.id)?1:0));
  const sources=['qoder','workbuddy'].map(id=>guideSourceRow(id,snap)).join('');
  const folders=snap.projects.length?`<div class="guide-row">${icon('folder','guide-icon')}<span class="guide-main"><span class="guide-name">工作文件夹</span><span class="guide-sub">已打开 ${snap.projects.length} 个</span></span><span class="guide-state ok">${icon('check')}已完成</span></div>`:`<div class="guide-row">${icon('folder','guide-icon')}<span class="guide-main"><span class="guide-name">工作文件夹</span><span class="guide-sub">Agent 只在你打开的文件夹里工作</span></span><button class="btn sm" id="guide-add-project">${icon('folderPlus')}打开文件夹</button></div>`;
  return`<div class="guide"><div class="guide-head">${logo(36)}<div><h2>欢迎使用 Bridge++</h2><p>Bridge++ 把 Qoder CN、WorkBuddy 的模型接到你熟悉的开发环境里。装好任意一个开发环境就能开始，其余的以后随时在设置里添加。模型源的组件从 npm 下载到你的电脑，账号用官方客户端登录，Bridge++ 不附带也不保管。</p></div></div>
    <h3><span class="guide-step">1</span>开发环境${ready?`<span class="guide-count">${ready} 个可用</span>`:''}</h3><div class="guide-list">${order.map(r=>guideEnvRow(r,envs.get(r.id))).join('')}</div>
    <h3><span class="guide-step">2</span>模型源</h3><div class="guide-list">${sources}</div>
    <h3><span class="guide-step">3</span>工作文件夹</h3><div class="guide-list">${folders}</div>
    <div class="modal-actions"><button id="guide-later" class="btn">稍后</button><button id="guide-done" class="btn primary" ${ready?'':'disabled'} title="${ready?'':scanning?'正在检测开发环境':'至少需要一个可用的开发环境'}">开始使用</button></div></div>`;
}
