import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {childEnvironment} from '../core/process.mjs';

const exec=promisify(execFile),cache=new Map();
const labels={ask:'每次询问','auto-review':'自动审查',auto:'一键授权',readonly:'只读'};
const mode=(id,description,native)=>({id,label:labels[id],description,native});
export const KIMI_PERMISSION_IDS={ask:'default','auto-review':'auto',auto:'yolo',readonly:'plan'};
export const DSH_PERMISSION_PRESETS={readonly:'read-only',ask:'workspace-write','auto-review':'auto',auto:'danger-full-access'};
export function codexPermissionSettings(mode){
  if(mode==null)return {};
  if(!Object.hasOwn(labels,mode))throw new Error('无效的 Codex 授权模式');
  return {approvalPolicy:mode==='auto'||mode==='readonly'?'never':'on-request',sandbox:mode==='readonly'?'read-only':'workspace-write',approvalsReviewer:mode==='auto-review'?'auto_review':'user'};
}
export function codexExecPermissionArgs(mode,runtime){
  if(mode==null)return [];
  if(mode==='readonly')return ['-s','read-only','-c','approval_policy="never"'];
  if(mode==='auto')return ['-s','workspace-write','-c','approval_policy="never"'];
  if(mode==='auto-review'&&runtime?.permissions?.observed?.exec?.autoReview)return ['--approve-for-me'];
  throw new Error('原生 Codex exec 未核实支持此授权模式；不支持每次询问，请重新选择');
}
export function selectionPermissionCatalog(runtime,selection){
  const catalog=runtime.permissions??permissionCatalog(runtime);
  return runtime.id==='codex'&&selection?.modelKey==='native'?catalog.bySelection?.native??{...catalog,modes:[],description:'尚未检测 Codex exec 授权能力'}:catalog;
}
export function migratePermissionMode(runtime,selection,value){
  if(runtime.id==='codex'&&selection?.modelKey==='native'&&value==='ask')return {mode:'readonly',migration:{from:'ask',to:'readonly',reason:'原生 Codex 已改用 exec，不支持交互询问；旧的 ask 安全迁移为只读，请按需重新选择授权模式。'}};
  return {mode:value??null,migration:null};
}
export function sessionPermissionView(runtime,session){
  const catalog=selectionPermissionCatalog(runtime,session.selection),resolved=migratePermissionMode(runtime,session.selection,session.permissionMode);
  return {...catalog,current:resolved.mode,inherited:resolved.mode===null,issue:resolved.mode!==null&&!catalog.modes.some(m=>m.id===resolved.mode)?'当前模式未核实支持，请重新选择。':null,migration:resolved.migration??session.permissionMigration??null};
}
export function antigravityPermissionArgs(mode){
  // 0.1.12 explicitly changes the old print default: native accept-edits must
  // allow workspace editing without disabling command review or the sandbox.
  if(mode==null)return ['--mode','accept-edits','--sandbox'];
  if(mode==='auto-review')return ['--mode','auto','--sandbox'];
  if(mode==='auto')return ['--mode','accept-edits','--dangerously-skip-permissions','--sandbox'];
  if(mode==='readonly')return ['--mode','plan','--sandbox'];
  throw new Error('此 Antigravity print 协议不支持 Bridge++ 询问卡片');
}
export function permissionCatalog(runtime,evidence={}){
  const modes=[];
  if(runtime.id==='dsh'){
    const names={readonly:'仅可查看',ask:'工作区内修改','auto-review':'自动审查',auto:'完全权限'},descriptions={readonly:'仅读取文件与分析，不修改代码',ask:'允许编辑工作区文件，其他操作先询问','auto-review':'无沙箱运行，调用前由模型审查',auto:'自动执行，无需反复确认'};
    for(const [id,preset]of Object.entries(DSH_PERMISSION_PRESETS))modes.push({id,label:names[id],description:descriptions[id],native:{preset}});
  }
  if(runtime.id==='codex'&&evidence.workspace&&evidence.approvals){
    modes.push(mode('ask','approval_policy=on-request + sandbox=workspace-write；原生发出的审批在 Bridge++ 中询问。',codexPermissionSettings('ask')));
    if(evidence.autoReview)modes.push(mode('auto-review','原生 approvalsReviewer=auto_review + on-request + workspace-write；由 Codex 原生审查机制决定。',codexPermissionSettings('auto-review')));
    modes.push(mode('auto','approval_policy=never + sandbox=workspace-write；工作区内自动执行，沙箱外请求仍由原生拒绝。',codexPermissionSettings('auto')));
    if(evidence.readonly)modes.push(mode('readonly','approval_policy=never + sandbox=read-only；不授予写入或沙箱升级权限。',codexPermissionSettings('readonly')));
  }
  if(runtime.id==='kimi')for(const [id,native]of Object.entries(KIMI_PERMISSION_IDS))if(evidence.modes?.availableModes?.some(m=>m.id===native)){
    const descriptions={ask:'ACP session/set_mode=default；原生审批在 Bridge++ 中询问。','auto-review':'ACP session/set_mode=auto；原生自动允许安全操作，其余审批在 Bridge++ 中询问。',auto:'ACP session/set_mode=yolo；原生自动允许操作，沿用原生工具边界，不新增操作系统沙箱。',readonly:'ACP session/set_mode=plan；原生只读规划，禁止工具执行。'};
    modes.push(mode(id,descriptions[id],{modeId:native}));
  }
  if(runtime.id==='antigravity'&&evidence.sandbox){
    if(evidence.auto)modes.push(mode('auto-review','原生 --mode auto --sandbox；由原生 auto 模式决定操作，拒绝后停止，不伪造授权卡片。',{args:antigravityPermissionArgs('auto-review')}));
    if(evidence.skip&&evidence.edits)modes.push(mode('auto','原生 --mode accept-edits --dangerously-skip-permissions --sandbox；自动回答原生权限，保留原生终端沙箱限制。',{args:antigravityPermissionArgs('auto')}));
    if(evidence.plan)modes.push(mode('readonly','原生 --mode plan --sandbox；只读规划，保留原生终端沙箱限制。',{args:antigravityPermissionArgs('readonly')}));
  }
  // null means the documented runtime default. Codex/Kimi preserve inheritance;
  // Antigravity uses the explicitly requested 0.1.12 safe-edit default instead.
  const catalog={modes,current:runtime.id==='dsh'?'ask':null,default:runtime.id==='dsh'?'ask':null,inherited:!['dsh','antigravity'].includes(runtime.id),description:runtime.id==='dsh'?'沿用原生审批':runtime.id==='antigravity'?'Bridge++ 默认：--mode accept-edits --sandbox；允许工作区文件编辑，命令仍由原生权限检查决定，print 模式需询问的操作可能被拒绝。':'沿用原生默认设置；未显式选择时不传授权覆盖参数。',...(runtime.id==='antigravity'&&evidence.edits&&evidence.sandbox?{defaultNative:{args:antigravityPermissionArgs(null)}}:{}),observed:evidence};
  if(runtime.id==='codex'){
    const native=[];
    if(evidence.exec?.workspace)native.push(mode('auto','exec -s workspace-write + approval_policy=never；保留原生沙箱。',{args:['-s','workspace-write','-c','approval_policy="never"']}));
    if(evidence.exec?.autoReview)native.push(mode('auto-review','exec --approve-for-me；原生自动审查，workspace-write 沙箱。',{args:['--approve-for-me']}));
    if(evidence.exec?.readonly)native.push(mode('readonly','exec -s read-only + approval_policy=never；不授予写入权限。',{args:['-s','read-only','-c','approval_policy="never"']}));
    catalog.bySelection={native:{modes:native,current:null,default:null,inherited:true,description:'继承用户 Codex 配置；exec 无交互审批。旧 ask 迁移为只读。',protocol:'exec-json'},gateway:{...catalog,protocol:'app-server'}};
  }
  return catalog;
}
export function validatePermissionMode(runtime,value,selection){
  if(!runtime)throw new Error('未知运行环境');
  if(value===null){if(runtime.id==='antigravity'&&runtime.permissions&&!runtime.permissions.defaultNative)throw new Error('尚未核实 Antigravity 默认安全编辑参数，请重新检测原生运行环境');return null;}
  if(typeof value!=='string'||!selectionPermissionCatalog(runtime,selection).modes?.some(m=>m.id===value))throw new Error('该原生运行环境未核实支持此授权模式，请重新检测或选择已支持的模式');
  return value;
}
export function runtimePermissionView(runtime,preference={}){
  const permissions=runtime.permissions??permissionCatalog(runtime);
  const current=Object.hasOwn(preference,'permissionMode')?preference.permissionMode:permissions.default;
  const issue=current!==null&&!permissions.modes.some(m=>m.id===current)?'已保存模式在当前原生版本未核实支持；开始下一轮前请重新选择。':null;
  const result={...runtime,permissions:{...permissions,current,inherited:current===null&&runtime.id!=='antigravity',issue}};
  if(permissions.bySelection){
    const native=migratePermissionMode(runtime,{modelKey:'native'},Object.hasOwn(preference,'nativePermissionMode')?preference.nativePermissionMode:current);
    result.permissions.bySelection={native:{...permissions.bySelection.native,current:native.mode,migration:native.migration,inherited:native.mode===null,issue:native.mode!==null&&!permissions.bySelection.native.modes.some(m=>m.id===native.mode)?'已保存原生 exec 模式未核实支持，请重新选择。':null},gateway:{...permissions.bySelection.gateway,current,issue}};
  }
  return result;
}
export async function saveRuntimePermission(store,runtimes,runtimeId,value,selection){
  const runtime=runtimes.find(r=>r.id===runtimeId),selected=validatePermissionMode(runtime,value,selection),key=runtimeId==='codex'&&selection?.modelKey==='native'?'nativePermissionMode':'permissionMode';
  await store.mutate(s=>{s.preferences.runtimes[runtimeId]={...s.preferences.runtimes[runtimeId],[key]:selected};});
  return runtimes.map(r=>runtimePermissionView(r,store.state.preferences.runtimes[r.id]));
}

async function inspect(runtime){
  if(runtime.id==='dsh')return {policy:'session-permission-preset',approval:'remote-events',choices:['approve','reject'],presets:DSH_PERMISSION_PRESETS,verification:'启动会话时执行并核实原生权限预设'};
  if(!runtime.executable)return {unavailable:true};
  if(runtime.id==='kimi'&&/\.[cm]?js$/i.test(runtime.executable)){
    // The bundled ACP server publishes a literal mode catalog. Inspect only the
    // known package/implementation, without evaluating code or launching a model.
    // A real session/new or resume response is checked again before any prompt.
    const pkg=JSON.parse(await readFile(join(dirname(runtime.executable),'../package.json'),'utf8'));
    const source=await readFile(runtime.executable,'utf8'),literal=/\bACP_MODES = \[([\s\S]*?)\n\s*\];/.exec(source);
    if(pkg.name==='@moonshot-ai/kimi-code'&&literal&&source.includes('async setSessionMode(params)')&&source.includes('acpModeToToggles(id)')){
      const availableModes=[...literal[1].matchAll(/\{\s*id: ("(?:[^"\\]|\\.)*"),\s*name: ("(?:[^"\\]|\\.)*"),\s*description: ("(?:[^"\\]|\\.)*")\s*\}/g)].map(m=>({id:JSON.parse(m[1]),name:JSON.parse(m[2]),description:JSON.parse(m[3])}));
      if(availableModes.length)return {version:pkg.version,source:'installed-acp-implementation',modes:{currentModeId:null,availableModes}};
    }
    return {version:pkg.version,source:'installed-acp-implementation',modes:{currentModeId:null,availableModes:[]},reason:'此版本未静态声明可识别的授权模式，沿用原生默认；会话启动后验证真实协议'};
  }
  if(runtime.id==='kimi')return {unavailable:false,source:'installed-cli',modes:{currentModeId:null,availableModes:[]},reason:'安装版本未静态发布授权目录，沿用原生默认并在会话启动后验证'};
  const root=await mkdtemp(join(tmpdir(),'bridgepp-permissions-'));
  try{
    const run=(args)=>exec(runtime.executable,args,{windowsHide:true,timeout:20000,maxBuffer:2*1024*1024,env:childEnvironment(),cwd:root});
    if(runtime.id==='antigravity'){
      const {stdout,stderr}=await run(['--help']),help=stdout+stderr;
      return {version:runtime.version??null,sandbox:/--sandbox\b/.test(help),auto:/accept-edits, auto, plan/.test(help),edits:/accept-edits/.test(help),plan:/accept-edits, auto, plan/.test(help),skip:/--dangerously-skip-permissions\b/.test(help)};
    }
    if(runtime.id==='codex'){
      await run(['app-server','generate-json-schema','--out',root]);
      const schema=JSON.parse(await readFile(join(root,'v2/ThreadStartParams.json'),'utf8'));
      const resume=JSON.parse(await readFile(join(root,'v2/ThreadResumeParams.json'),'utf8'));
      const defs=schema.definitions??{},policies=defs.AskForApproval?.oneOf?.flatMap(x=>x.enum??[])??defs.AskForApproval?.enum??[];
      const version=await run(['--version']);
      const help=(await run(['exec','--help'])).stdout,resumeHelp=(await run(['exec','resume','--help'])).stdout;
      return {version:version.stdout.trim(),workspace:defs.SandboxMode?.enum?.includes('workspace-write')&&!!resume.properties?.sandbox,readonly:defs.SandboxMode?.enum?.includes('read-only'),approvals:['on-request','never'].every(x=>policies.includes(x)),autoReview:!!schema.properties?.approvalsReviewer&&!!resume.properties?.approvalsReviewer&&defs.ApprovalsReviewer?.enum?.includes('auto_review'),exec:{workspace:/workspace-write/.test(help),readonly:/read-only/.test(help),autoReview:/--approve-for-me/.test(help)&&/automatic review/.test(help),image:/--image/.test(help)&&/--image/.test(resumeHelp),source:'installed exec/resume --help'}};
    }
    return {};
  }finally{await rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100}).catch(()=>{});}
}
export async function withRuntimePermissions(runtimes,preferences={},probe=inspect){
  return Promise.all(runtimes.map(async runtime=>{
    let evidence;
    try{
      if(runtime.status&&runtime.status!=='ready'||!runtime.executable)return runtimePermissionView({...runtime,permissions:permissionCatalog(runtime,{unavailable:true,reason:runtime.reason??'运行程序未安装'})},preferences[runtime.id]);
      const info=runtime.executable?await stat(runtime.executable):null,key=JSON.stringify([runtime.id,runtime.executable,info?.size,info?.mtimeMs]);
      let flight=cache.get(key);if(!flight){flight=probe(runtime);cache.set(key,flight);flight.catch(()=>cache.delete(key));}
      evidence=await flight;
    }catch(error){evidence={unavailable:true,error:'原生授权能力检测失败：'+error.message};}
    return runtimePermissionView({...runtime,permissions:permissionCatalog(runtime,evidence)},preferences[runtime.id]);
  }));
}
