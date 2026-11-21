import {icon} from './icons.js';
import {DEFAULT_STARTUP_PREFERENCES,STARTUP_PRESETS,normalizeStartupPreferences} from '../services/startup-preferences.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

const PRESETS=[
  {id:'cold',title:'按需冷启动',badge:'默认推荐',desc:'打开最快、占用最低。除开机自启的两个对外模型服务外，其余组件用到时才启动，空闲 5～10 分钟后自动释放。'},
  {id:'balanced',title:'平衡模式',badge:null,desc:'打开时同样不刷新目录、不扫描环境；用过的运行环境保留约 10 分钟，内置网关一直常驻，适合一整天断断续续地对话。'},
  {id:'warm',title:'全部预启动',badge:null,desc:'打开时刷新全部模型目录、完整检测环境；运行环境和内置网关常驻，并预热备用运行时。首轮等待最短，占用最高。'}
];

const SECTIONS=[
  {
    title:'应用启动时自动动作',
    desc:'打开 Bridge++ 时要不要扫描运行环境、刷新模型目录、检查更新。关闭刷新后，还没有缓存的模型源第一次仍会自动拉取。',
    items:[
      {path:'checkEnvironmentsOnStart',title:'启动时完整扫描运行环境',desc:'关闭时沿用上次检测通过的结果，打开软件不逐个启动 CLI 查版本；随时可在「运行环境」重新检测。'},
      {path:'refreshCatalogOnStart.qoder',title:'启动时自动刷新 Qoder CN 模型目录',desc:'关闭时沿用上次的模型列表，打开软件不启动 Qoder 进程；需要时在「模型源」手动刷新。'},
      {path:'refreshCatalogOnStart.workbuddy',title:'启动时自动刷新 WorkBuddy 模型目录',desc:'关闭时沿用上次的模型列表，打开软件不启动 WorkBuddy 进程；需要时在「模型源」手动刷新。'},
      {path:'refreshCatalogOnStart.antigravity',title:'启动时自动刷新 Antigravity 模型目录',desc:'关闭时沿用上次的 Gemini 模型列表，打开软件不调用 agy CLI。'},
      {path:'refreshCatalogOnStart.services',title:'启动时同步刷新独立对外接口目录',desc:'关闭时打开软件不让两个对外模型服务（8646 / 8647）重新拉取目录；它们有请求时每 15 分钟自己刷新一次。'},
      {path:'backgroundUpdateChecks.environments',title:'启动时静默检查开发环境更新',desc:'每天第一次打开时检查 DSH、Kimi、Claude Code 有没有新版本；关闭后可到「运行环境」手动检查。'},
      {path:'backgroundUpdateChecks.app',title:'启动时静默检查 Bridge++ 更新',desc:'每天第一次打开时检查 Bridge++ 有没有新版本，只读一次发布信息。'}
    ]
  },
  {
    title:'运行环境进程常驻',
    desc:'关闭时，一轮结束后空闲约 5 分钟就退出进程，下次发消息自动恢复原会话；打开时保留约 10 分钟。',
    items:[
      {path:'keepWarmRuntimes.dsh',title:'DeepSeek Harness (DSH) 宿主常驻',desc:'关闭时，所有 DSH 会话和完整界面窗口都空闲约 5 分钟后退出 DSH 宿主进程，释放它占的几百 MB 内存。'},
      {path:'keepWarmRuntimes.claude',title:'Claude Code 会话进程常驻',desc:'关闭时空闲约 5 分钟后退出 Claude Code 进程，下次发消息自动恢复原会话。'},
      {path:'keepWarmRuntimes.codex',title:'Codex（第三方模型）服务常驻',desc:'关闭时空闲约 5 分钟后退出 Codex app-server 进程；原生 Codex 本来就是每轮单独启动。'},
      {path:'keepWarmRuntimes.kimi',title:'Kimi Code ACP 进程常驻',desc:'关闭时空闲约 5 分钟后退出 Kimi ACP 进程，下次发消息自动恢复原会话。'}
    ],
    note:'Antigravity CLI 每轮单独启动，这一轮结束就退出，不会常驻。'
  },
  {
    title:'内置模型源网关进程常驻',
    desc:'关闭时，没有会话用这个模型源约 10 分钟后，回收内置网关和它的模型源运行时；下次发消息再启动（Qoder 冷启动要十几秒到几十秒）。',
    items:[
      {path:'keepWarmWorkers.qoder',title:'Qoder CN 内置网关常驻',desc:'关闭时，约 10 分钟没有会话使用就回收内置 Qoder 网关和它的运行时。'},
      {path:'keepWarmWorkers.workbuddy',title:'WorkBuddy 内置网关常驻',desc:'关闭时，约 10 分钟没有会话使用就回收内置 WorkBuddy 网关和它的运行时。'}
    ],
    note:'对外接口的两个独立模型服务（8646 / 8647）不受这里影响，开着就一直常驻；开机自启在「设置 → 对外接口」里管理。'
  },
  {
    title:'模型源备用运行时预热',
    desc:'出现一次性请求（标题生成、网页摘要、子代理第一轮等）后，在后台多备一个空白运行时，下一个这类请求不用等冷启动；10 分钟内没有新的这类请求就不再补。代价是每次补充都要多初始化一个运行时。',
    items:[
      {path:'prewarmSources.qoder',title:'预热 Qoder CN 备用空白运行时',desc:'关闭时不预热空白运行时和原生工具槽，新对话现用现启动（Qoder 每次十几秒到几十秒）。改动在内置网关空闲回收或重新启动后生效。'},
      {path:'prewarmSources.workbuddy',title:'预热 WorkBuddy 备用空白运行时',desc:'关闭时不预热空白会话，新对话现用现启动（WorkBuddy 每次几秒）。改动在内置网关空闲回收或重新启动后生效。'}
    ]
  }
];

function readPath(prefs,path){
  const parts=path.split('.');
  let current=prefs;
  for(const part of parts)current=current?.[part];
  return current===true;
}

export function startupPatchFromPath(path,enabled){
  const parts=String(path??'').split('.');
  if(parts.length===1)return {[parts[0]]:enabled===true};
  if(parts.length===2)return {[parts[0]]:{[parts[1]]:enabled===true}};
  throw new Error('无效的启动配置路径');
}

export function activeStartupPreset(prefs){
  const normalized=JSON.stringify(normalizeStartupPreferences(prefs));
  for(const [id,preset]of Object.entries(STARTUP_PRESETS)){
    if(JSON.stringify(normalizeStartupPreferences(preset))===normalized)return id;
  }
  return null;
}

export function startupSectionsHtml(rawPrefs){
  const prefs=normalizeStartupPreferences(rawPrefs??DEFAULT_STARTUP_PREFERENCES);
  const preset=activeStartupPreset(prefs);
  const presetCards=PRESETS.map(row=>{
    const active=preset===row.id;
    return`<button class="startup-preset${active?' active':''}" data-startup-preset="${row.id}" aria-pressed="${active}">
      <span class="sp-head"><b>${esc(row.title)}</b>${row.badge?`<span class="sp-badge">${esc(row.badge)}</span>`:''}${active?`<span class="sp-check">${icon('check')}</span>`:''}</span>
      <span class="sp-desc">${esc(row.desc)}</span>
    </button>`;
  }).join('');
  const groups=SECTIONS.map(section=>`<section class="startup-group">
    <div class="startup-group-head"><h2>${esc(section.title)}</h2><p>${esc(section.desc)}</p></div>
    <div class="startup-list">${section.items.map(item=>{
      const checked=readPath(prefs,item.path);
      return`<label class="startup-row"><span class="startup-row-text"><b>${esc(item.title)}</b><small>${esc(item.desc)}</small></span><span class="startup-switch"><input type="checkbox" data-startup-toggle="${esc(item.path)}" ${checked?'checked':''}><span class="startup-slider" aria-hidden="true"></span></span></label>`;
    }).join('')}</div>
    ${section.note?`<div class="startup-note">${icon('info')}<span>${esc(section.note)}</span></div>`:''}
  </section>`).join('');
  return`<div class="startup-presets-head"><h2>预设模式</h2>${preset?'':'<span class="startup-custom-tag">自定义组合</span>'}</div>
    <div class="startup-presets">${presetCards}</div>${groups}`;
}

export function startupPageHtml(rawPrefs){
  return`<div class="settings-head"><h1>启动与资源</h1><p>选择哪些运行环境、模型源和后台任务提前启动，哪些用到时再启动。开关立即保存；正在运行的任务不会被打断。</p></div>
    <div id="startup-settings">${startupSectionsHtml(rawPrefs)}</div>`;
}
