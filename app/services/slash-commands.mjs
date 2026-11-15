// Public command metadata only: provider credentials and native payloads stay in the runtime.
const names=value=>Array.isArray(value)?value.filter(v=>typeof v==='string').map(v=>v.replace(/^\//,'')):[];
const groups=[['model effort fast','模型菜单'],['clear reset new','新建会话'],['exit quit logout','关闭会话或窗口'],['config settings output-style color focus theme','设置'],['permission permissions approve setup-default-sandbox','权限菜单'],['rename name title','会话重命名'],['reload-plugins','开发环境设置'],['list-agents peers','当前执行环境的完整界面'],['autocompact','模型菜单中的上下文预算']];
const conflicts=new Map(groups.flatMap(([words,feature])=>words.split(' ').map(name=>[name,`请使用 Bridge++ 的${feature}。`])));
// system/init arrives only after the first prompt; these terminal commands were
// observed in the R3a probe and must already be hidden in the handshake menu.
const hiddenClaude=new Set(['heapdump','agents','auto-mode-setup','__remote-workflow','workflow-launch-exec','doctor','color','focus','reload-plugins']);
const kimiSkills=new Set(['check-kimi-code-docs','import-from-cc-codex','mcp-config','sub-skill','sub-skill.consolidate','sub-skill.review','update-config','write-goal']);
const dshAliases={goal:['目标'],plan:['计划'],feedback:['反馈'],compact:['压缩'],permission:['权限'],export:['导出']};
export const commandKey=(runtimeId,modelKey)=>runtimeId==='codex'?`codex:${modelKey==='native'?'exec':'app-server'}`:runtimeId;
export function slashInput(text){const match=typeof text==='string'&&/^\/([^\s]+)(?:\s+([\s\S]*))?$/.exec(text);return match?{name:match[1],args:(match[2]??'').trim()}:null;}
export function commandConflict(runtimeId,modelKey,name,raw=[]){
  if(runtimeId==='codex'&&modelKey==='native')return null;
  if(runtimeId==='dsh'&&['export','导出'].includes(name))return 'DSH 命令导出尚未接入 Bridge++，请使用反馈导出功能。';
  if(runtimeId==='dsh'&&name==='权限')name='permission';
  if(runtimeId==='kimi'&&['update-config','mcp-config'].includes(name))return '请使用 Bridge++ 的开发环境设置或当前执行环境的完整界面。';
  const direct=conflicts.get(name);if(direct)return direct;
  const canonical=raw.find(row=>names(row.aliases).includes(name));return canonical?commandConflict(runtimeId,modelKey,canonical.name):null;
}
export function commandView(runtimeId,modelKey,raw=[],{skills=[],terminal=[]}={}){
  const base={runtimeId,source:'native',commands:[],note:null,stale:false};
  if(runtimeId==='codex'&&modelKey==='native')return {...base,source:'none',note:'原生模型的 Codex 不支持斜杠命令，/ 开头的文字会原样发给模型'};
  if(runtimeId==='antigravity')return {...base,source:'none',note:'Antigravity 会自己展开 /命令和技能，但不提供命令列表'};
  if(runtimeId==='codex'){base.source='curated';raw=[{name:'compact',description:'压缩上下文'},{name:'review',description:'审查当前改动',hint:'[base <分支> | commit <sha> | 审查要求]'},{name:'goal',description:'设定或查看长期目标',hint:'[目标 | clear]'}];}
  const skillNames=new Set(names(skills)),hidden=new Set(runtimeId==='claude'?[...hiddenClaude,...names(terminal)]:[]),seen=new Set();
  for(const row of Array.isArray(raw)?raw:[]){
    if(typeof row?.name!=='string')continue;const name=row.name.replace(/^\//,'');
    if(!name||/\s/.test(name)||seen.has(name)||hidden.has(name)||commandConflict(runtimeId,modelKey,name))continue;
    seen.add(name);base.commands.push({name,description:typeof row.description==='string'?row.description:'',hint:typeof (row.hint??row.argumentHint??row.input?.hint)==='string'?(row.hint??row.argumentHint??row.input.hint):'',aliases:[...new Set([...names(row.aliases),...(runtimeId==='dsh'?dshAliases[name]??[]:[])])].filter(alias=>!hidden.has(alias)&&!commandConflict(runtimeId,modelKey,alias,raw)),kind:row.kind==='skill'||skillNames.has(name)||runtimeId==='kimi'&&(name.startsWith('skill:')||kimiSkills.has(name))?'skill':'command'});
  }
  base.commands.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);return base;
}
export const findCommand=(view,name)=>view?.commands?.find(row=>row.name===name||row.aliases.includes(name));
