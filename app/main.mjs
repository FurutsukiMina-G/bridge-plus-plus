import {app,BrowserWindow,ipcMain,dialog,shell,Menu,clipboard,nativeTheme,screen,protocol,net} from 'electron';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,dirname,basename,resolve} from 'node:path';
import {mkdir,writeFile,stat,copyFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import diagnostics from 'node:diagnostics_channel';
import {Store} from './core/store.mjs';
import {projectDirectory,tree,readProjectFile,writeProjectFile,gitStatus,gitDiff,gitStage,gitCommit,git} from './core/projects.mjs';
import {launch,stopProcess} from './core/process.mjs';
import {ProviderService} from './services/providers.mjs';
import {findCodex,nativeNode,shouldRefreshCodex} from './services/runtime-paths.mjs';
import {Gateway} from './services/gateway.mjs';
import {Sessions} from './services/sessions.mjs';
import {nativeModels} from './services/native-models.mjs';
import {refreshAntigravitySource,applyAntigravityMediaEvidence} from './services/antigravity-source.mjs';
import {Terminals} from './services/terminals.mjs';
import {codexLaunchSettings} from './runtimes/codex.mjs';
import {writeNativeLauncher,cleanupNativeLaunchers,quotePowerShell} from './services/native-launch.mjs';
import {usageForDisplay} from './services/usage-view.mjs';
import {coalesceSessionEvents} from './services/session-events.mjs';
import {withRuntimePermissions,saveRuntimePermission,antigravityPermissionArgs,validatePermissionMode} from './services/runtime-permissions.mjs';
import {MediaService,MEDIA_MIMES} from './services/media.mjs';
import {withRuntimeMedia,MAX_ATTACHMENTS_PER_TURN} from './services/media-capabilities.mjs';
import {AttachmentCapabilities,NativeMediaCatalog} from './services/attachment-capabilities.mjs';
import {ModelServices} from './services/model-services.mjs';
import {Environments} from './services/environments.mjs';
import {RuntimeCache} from './services/runtime-cache.mjs';
import {BootState} from './services/boot-state.mjs';
import {workbenchSnapshot} from './services/workbench-snapshot.mjs';
import {assertRuntimeReady} from './services/runtime-availability.mjs';
import {SourceComponents,sourceComponentMethods} from './services/source-components.mjs';
import {fileOperationMethods} from './services/file-operations.mjs';
import {allowMainWindowFullscreen} from './services/window-permissions.mjs';

const here=dirname(fileURLToPath(import.meta.url)),entry=join(here,'ui/index.html');
protocol.registerSchemesAsPrivileged([{scheme:'bridge-media',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
// Renamed to Bridge++; keep the original AgentWorkbench data directory so projects and sessions stay in place.
app.setPath('userData',process.env.AWB_DATA_DIR?resolve(process.env.AWB_DATA_DIR):join(app.getPath('appData'),'AgentWorkbench'));
app.setName('Bridge++');app.setAppUserModelId('com.furutsukimina.bridgepp');
// Startup timing, off by default. AWB_STARTUP_TIMING=1 writes <userData>/startup-timing.json:
// each awaited main() step, and every child process with the step it started in.
const timing=process.env.AWB_STARTUP_TIMING==='1'?{steps:[],processes:[],current:'electron'}:null,ms=()=>Math.round(performance.now());
const clip=value=>{const text=String(value);return text.length>220?text.slice(0,90)+' … '+text.slice(-120):text;};
if(timing)diagnostics.subscribe('child_process',({process:child})=>{const row={step:timing.current,start:ms()};timing.processes.push(row);queueMicrotask(()=>{row.command=basename(String(child.spawnfile??''));row.args=(child.spawnargs??[]).slice(1).map(clip);});child.once('error',error=>{row.error=error.code??error.message;});child.once('exit',code=>{row.ms=ms()-row.start;row.code=code;});});
async function step(name,task){if(!timing)return task();const start=ms();timing.current=name;try{return await task();}finally{timing.steps.push({step:name,start,ms:ms()-start});}}
async function writeTiming(label){if(timing)await writeFile(join(app.getPath('userData'),'startup-timing.json'),JSON.stringify({label,version:app.getVersion(),at:new Date().toISOString(),...timing},null,1)).catch(error=>console.error('写入启动计时失败：'+error.message));}
let window,store,providers,gateway,sessions,runtimes,media,modelServices,environments,sourceComponents,closing=false,dirtyEditors=false,exitCode=0;const terminals=new Terminals(),nativeWindows=new Set(),nativeMediaCatalog=new NativeMediaCatalog(),boot=new BootState();
const environmentMethods=new Set(['session:create','session:prompt','session:rebind','session:permission','runtime:refresh','runtime:permission','runtime:configure','native:models','native:open','environment:check','environment:install','environment:update','environment:configure','provider:refresh']);
const attachmentCapabilityService=new AttachmentCapabilities({runtimes:()=>runtimes,sessions:()=>sessions,providers:()=>providers,cwd:()=>store.root,catalog:nativeMediaCatalog});
const attachmentCapabilities=(runtimeId,selection)=>attachmentCapabilityService.forSelection(runtimeId,selection);
const send=(name,data)=>{if(window&&!window.isDestroyed())window.webContents.send(name,data);};
const environmentBusy=id=>sessions&&[...new Set([...sessions.runs.keys(),...sessions.external.keys()])].some(key=>store.session(key).runtimeId===id&&(sessions.runs.has(key)||sessions.nativeBusy(key)))?'该环境仍有会话或原生窗口正在使用，请先停止任务或关闭对应窗口再更新':null;
async function refreshEnvironmentRuntimes({scan=true,registry=false}={}){const detected=scan?await environments.scan({registry}):environments.runtimes,next=await withRuntimeMedia(await withRuntimePermissions(detected,store.state.preferences.runtimes));await sessions?.updateRuntimes(next);runtimes=next;nativeMediaCatalog.invalidate();return environments.runtimeViews(next);}
const chrome=theme=>(theme==='light'||theme==='system'&&!nativeTheme.shouldUseDarkColors)?{color:'#faf9f5',symbolColor:'#45433d'}:{color:'#262624',symbolColor:'#c3bfb5'};
function applyChrome(){if(!window||window.isDestroyed())return;const colors=chrome(store.state.preferences.theme);window.setBackgroundColor(colors.color);window.setTitleBarOverlay({...colors,height:44});}
function verifyCaller(event){if(event.sender!==window?.webContents||event.senderFrame!==window.webContents.mainFrame||event.senderFrame.url!==pathToFileURL(entry).href)throw new Error('Untrusted application caller');}
function id(value){if(typeof value!=='string'||value.length>200)throw new Error('Invalid identifier');return value;}
function argsObject(args){if(!args||typeof args!=='object'||Array.isArray(args)||Buffer.byteLength(JSON.stringify(args))>3*1024*1024)throw new Error('Invalid request');return args;}
const methods={
  async snapshot(){return workbenchSnapshot({store,sourceComponents,modelServices,environments,runtimes,attachmentCapabilityService,boot,appVersion:app.getVersion()});},
  ...sourceComponentMethods(()=>sourceComponents,url=>shell.openExternal(url)),
  ...fileOperationMethods(()=>store,{shell,createWindow:options=>{const preview=new BrowserWindow({...options,parent:window});nativeWindows.add(preview);preview.on('closed',()=>nativeWindows.delete(preview));return preview;}}),
  async 'environment:check'({id}){return environments.check(id);},
  async 'environment:install'({id}){return environments.install(id,'install');},
  async 'environment:update'({id}){return environments.install(id,'update');},
  async 'environment:cancel'({id}){return environments.cancel(id);},
  async 'environment:configure'({id,...patch}){return environments.configure(id,patch);},
  async 'environment:openPage'({id}){await shell.openExternal(environments.page(id));return true;},
  async 'onboarding:complete'(){return environments.completeOnboarding();},
  async 'bridgeService:configure'({id,...patch}){return modelServices.configure(id,patch);},
  async 'bridgeService:start'({id}){return modelServices.start(id);},
  async 'bridgeService:stop'({id}){return modelServices.stop(id);},
  async 'bridgeService:restart'({id}){return modelServices.restart(id);},
  async 'bridgeService:retry'({id}){return modelServices.retry(id);},
  async 'bridgeService:autostart'({id,enabled}){return modelServices.autostart(id,enabled);},
  async 'bridgeService:key'({id,action}){return modelServices.key(id,action);},
  async 'bridgeService:models'({id}){return modelServices.models(id);},
  async 'bridgeService:refreshModels'({id}){return modelServices.refreshModels(id);},
  async 'bridgeService:connect'({id,target,replace=[]}){return modelServices.connect(id,target,replace);},
  async 'bridgeService:connectDsh'({id,replace=[]}){return modelServices.connectDsh(id,replace);},
  async 'bridgeService:disconnect'({id,target}){return modelServices.disconnect(id,target);},
  async 'project:add'(){const result=await dialog.showOpenDialog(window,{title:'选择开发项目',properties:['openDirectory','createDirectory']});if(result.canceled)return null;const path=await projectDirectory(result.filePaths[0]);const existing=store.state.projects.find(p=>p.path.toLowerCase()===path.toLowerCase());if(existing)return existing;const p={id:randomUUID(),name:basename(path),path,createdAt:new Date().toISOString()};await store.mutate(s=>s.projects.push(p));return p;},
  async 'project:tree'({projectId,path=''}){return tree(store.project(id(projectId)).path,path);},
  async 'file:read'({projectId,path}){return readProjectFile(store.project(id(projectId)).path,path);},
  async 'file:write'({projectId,...file}){return writeProjectFile(store.project(id(projectId)).path,file);},
  async 'project:reveal'({projectId}){const error=await shell.openPath(store.project(id(projectId)).path);if(error)throw new Error(error);},
  async 'git:status'({projectId}){return gitStatus(store.project(id(projectId)).path);},
  async 'git:diff'({projectId,path}){return gitDiff(store.project(id(projectId)).path,path);},
  async 'git:init'({projectId}){return git(store.project(id(projectId)).path,['init','-b','main']);},
  async 'git:stage'({projectId,paths}){return gitStage(store.project(id(projectId)).path,paths);},
  async 'git:commit'({projectId,message}){return gitCommit(store.project(id(projectId)).path,message);},
  async 'provider:refresh'({source}){if(source==='antigravity')await refreshAntigravitySource(store,runtimes.find(r=>r.id==='antigravity'),store.root);else await providers.refresh(source);return true;},
  async 'runtime:refresh'(){return refreshEnvironmentRuntimes({registry:true});},
  async 'runtime:permission'({runtimeId,mode,selection}){return saveRuntimePermission(store,runtimes,id(runtimeId),mode,selection);},
  async 'native:models'({runtimeId,projectId}){if(runtimeId==='codex'&&shouldRefreshCodex(store.state.preferences.runtimes,runtimes.find(r=>r.id==='codex'),await findCodex()))await refreshEnvironmentRuntimes({registry:false});const runtime=runtimes.find(r=>r.id===runtimeId);assertRuntimeReady(runtime,environments.busyReason(runtimeId));const cwd=projectId?store.project(id(projectId)).path:store.root;return runtimeId==='codex'?nativeMediaCatalog.get(runtime,cwd,{refresh:true}):nativeModels(runtime,cwd);},
  async 'runtime:configure'({runtimeId}){if(!runtimes.some(r=>r.id===runtimeId))throw new Error('Unknown runtime');const result=await dialog.showOpenDialog(window,{title:'选择原生运行程序',filters:[{name:'可执行程序 / Node 入口',extensions:['exe','mjs','js']}],properties:['openFile']});if(result.canceled)return null;await store.mutate(s=>{s.preferences.runtimes[runtimeId]={...s.preferences.runtimes[runtimeId],executable:result.filePaths[0]};});return methods['runtime:refresh']();},
  async 'preference:theme'({theme}){if(!['system','light','dark'].includes(theme))throw new Error('Invalid theme');await store.mutate(s=>{s.preferences.theme=theme;});applyChrome();},
  async 'preference:save'({modelKey,value}){if(typeof modelKey!=='string'||!value||typeof value!=='object')throw new Error('Invalid preference');await store.mutate(s=>{s.preferences.modelDefaults[modelKey]={runtimeId:value.runtimeId,nativeModel:value.nativeModel,reasoning:value.reasoning,contextTokens:value.contextTokens,contextBudget:value.contextBudget};});},
  async 'session:create'(args){return sessions.create(args);},
  async 'session:events'({sessionId}){const key=id(sessionId),source=store.session(key).selection?.modelKey?.split(':')[0];return coalesceSessionEvents(await store.events(key)).map(e=>usageForDisplay(e,source));},
  async 'session:prompt'({sessionId,text='',attachments=[],delivery}){return sessions.prompt(id(sessionId),text,attachments,{delivery});},
  async 'session:dequeue'({sessionId,queueId}){return sessions.dequeue(id(sessionId),id(queueId));},
  async 'attachment:capabilities'({runtimeId,selection}){return attachmentCapabilities(id(runtimeId),selection);},
  async 'attachment:stage'({projectId,name,data}){return media.stage({projectId:id(projectId),name,data});},
  async 'attachment:pick'({projectId,kinds=['image']}){store.project(id(projectId));if(!Array.isArray(kinds)||!kinds.length||kinds.some(k=>!Object.hasOwn(MEDIA_MIMES,k)))throw new Error('无效媒体类型');const extensions={image:['png','jpg','jpeg','gif','webp'],audio:['wav','mp3','ogg','flac'],video:['mp4','webm']};const result=await dialog.showOpenDialog(window,{title:'选择媒体附件',properties:['openFile','multiSelections'],filters:[{name:'媒体文件',extensions:kinds.flatMap(k=>extensions[k])}]});if(result.canceled)return [];const staged=[];try{if(result.filePaths.length>MAX_ATTACHMENTS_PER_TURN)throw new Error(`最多选择 ${MAX_ATTACHMENTS_PER_TURN} 个附件`);for(const path of result.filePaths)staged.push(await media.stageFile(projectId,path,kinds));return staged;}catch(error){for(const a of staged)await media.discard(a.id);throw error;}},
  async 'attachment:discard'({id:attachmentId}){await media.discard(id(attachmentId));return true;},
  async 'media:resolve'({sessionId,href}){return media.resolve(id(sessionId),href);},
  async 'media:reveal'({url}){const e=await media.entry(url);shell.showItemInFolder(await media.checked(e.root,e.path));return true;},
  async 'media:save'({url}){const e=await media.entry(url),result=await dialog.showSaveDialog(window,{title:'保存媒体文件',defaultPath:e.name});if(result.canceled||!result.filePath)return false;await copyFile(await media.checked(e.root,e.path),result.filePath);return true;},
  async 'session:cancel'({sessionId}){await sessions.cancel(id(sessionId));},
  async 'session:rename'({sessionId,title}){await sessions.rename(id(sessionId),title);},
  async 'session:rebind'({sessionId,selection}){return sessions.rebind(id(sessionId),selection);},
  async 'session:permission'({sessionId,mode}){return sessions.setPermission(id(sessionId),mode);},
  async 'session:approve'({sessionId,approvalId,choice,answer}){if(!['approve','approve-session','reject','reject-session'].includes(choice))throw new Error('Invalid approval');await sessions.approve(id(sessionId),id(approvalId),choice,answer);},
  async 'session:archive'({sessionId}){const session=store.session(id(sessionId));if(['running','starting','waiting'].includes(session.status))throw new Error('请先停止运行中的会话');await store.mutate(()=>{session.archived=true;});},
  async 'native:open'({runtimeId,projectId,sessionId}){
    const runtime=runtimes.find(r=>r.id===runtimeId);if(!runtime?.installed)throw new Error('运行程序未安装');const project=store.project(id(projectId));const session=sessionId?store.session(id(sessionId)):null;if(session&&(session.projectId!==projectId||session.runtimeId!==runtimeId))throw new Error('Session runtime/project mismatch');
    if(session)await sessions.refreshNative(session.id);
    if(session&&sessions.runs.has(session.id)&&runtimeId!=='dsh')throw new Error('请先停止当前任务，再在完整工具界面中继续');
    if(session&&runtimeId==='codex'&&session.selection.modelKey==='native'&&!session.nativeId)throw new Error('请先在 Bridge++ 发送一轮以建立原生 Codex 线程，再打开同一会话的完整界面。也可从运行环境页面直接打开独立的原生客户端。');
    if(runtimeId==='dsh'&&(session||sessions.dsh?.origin)){
      // The window attaches to the same DSH host, including pending approvals.
      // While it is open no new prompt can start from the unified composer.
      const claim=session?sessions.claimNative(session.id,{observeRunning:true}):null;
      let w;try{
        if(session){const adapter=await sessions.adapter(session);await adapter.ensureStarted();}
        w=new BrowserWindow({title:'DeepSeek Harness · 完整工具界面',width:1250,height:860,webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false,partition:'persist:awb-dsh'}});
        nativeWindows.add(w);w.on('closed',()=>{nativeWindows.delete(w);if(session&&sessions.external.get(session.id)===claim)sessions.external.delete(session.id);});
        w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==sessions.dsh.origin)e.preventDefault();});
        await w.loadURL(sessions.dsh.nativeUrl(session?.nativeId));return;
      }catch(error){w?.destroy();if(session&&sessions.external.get(session.id)===claim)sessions.external.delete(session.id);throw error;}
    }
    // Opening a project in the desktop does not prove that an existing native
    // conversation was resumed. Session handoff uses the CLI's conversation ID.
    if(runtimeId==='antigravity'&&runtime.desktop&&!session){launch(runtime.desktop,[project.path],{cwd:project.path,stdio:'ignore',detached:true}).unref();return;}
    if(runtimeId==='dsh'){launch(runtime.executable,[],{cwd:project.path,stdio:'ignore',detached:true}).unref();return;}
    // Explicit native terminal action: keep the complete native client and its interaction model.
    const claim=session?sessions.claimNative(session.id):null;
    try{
    const quote=quotePowerShell;
    let adapter=session?sessions.adapters.get(session.id):null;
    if(session&&['codex','kimi'].includes(runtimeId)){
      adapter=await sessions.adapter(session);await adapter.ensureStarted();await adapter.close();sessions.adapters.delete(session.id);
    }
    const permissionMode=validatePermissionMode(runtime,session?.permissionMode??null);
    const args=[];if(session?.nativeId){if(runtimeId==='codex')args.push('resume',session.nativeId);if(runtimeId==='kimi')args.push('--session',session.nativeId);if(runtimeId==='antigravity')args.push('--conversation',session.nativeId);}
    if(runtimeId==='antigravity'&&session)args.push(...antigravityPermissionArgs(permissionMode));
    if(runtimeId==='antigravity'&&session){if(session.selection.nativeModel)args.push('--model',session.selection.nativeModel);if(session.selection.reasoning)args.push('--effort',session.selection.reasoning);}
    let executable=runtime.executable,setup='';if(/\.[cm]?js$/i.test(executable)){const node=nativeNode();args.unshift(executable);executable=node.command;if(node.env.ELECTRON_RUN_AS_NODE)setup="$env:ELECTRON_RUN_AS_NODE='1'\n";}
    if(runtimeId==='codex'&&adapter){const config=codexLaunchSettings(adapter);args.push(...config.args);for(const [key,value]of Object.entries(config.env))setup+=`$env:${key}=${quote(value)}\n`;}
    if(runtimeId==='kimi'&&adapter?.endpoint){setup+=`$env:KIMI_CODE_HOME=${quote(join(adapter.dir,'kimi-home'))}\n$env:AWB_GATEWAY_KEY=${quote(adapter.endpoint.key)}\n`;}
    const launchFile=await writeNativeLauncher(store.root,{projectPath:project.path,setup,executable,args});const child=launch('powershell.exe',['-NoProfile',...(session?[]:['-NoExit']),'-File',launchFile],{cwd:project.path,windowsHide:false,stdio:'ignore',detached:true});if(session)await sessions.trackNative(session.id,claim,child);child.unref();
    }catch(error){if(session&&sessions.external.get(session.id)===claim&&!claim.child)sessions.external.delete(session.id);throw error;}
  },
  async 'terminal:run'({projectId,command}){return terminals.run(store.project(id(projectId)),command);},
  async 'terminal:state'({projectId}){store.project(id(projectId));return terminals.state(projectId);},
  async 'terminal:stop'({projectId}){store.project(id(projectId));await terminals.stop(projectId);},
  async 'clipboard:write'({text}){if(typeof text!=='string'||text.length>2*1024*1024)throw new Error('Invalid text');clipboard.writeText(text);},
  async 'editor:dirty'({dirty}){if(typeof dirty!=='boolean')throw new Error('Invalid editor state');dirtyEditors=dirty;},
  async 'window:minimize'(){window.minimize();},
  async 'window:maximize'(){window.isMaximized()?window.unmaximize():window.maximize();},
  async 'window:close'(){window.close();}
};
async function main(){if(!app.requestSingleInstanceLock()){app.exit(0);return;}app.on('second-instance',()=>{if(window&&!window.isDestroyed()){window.restore();window.show();window.focus();}});await step('app.whenReady',()=>app.whenReady());Menu.setApplicationMenu(null);store=await step('Store.open',()=>new Store(join(app.getPath('userData'),'workspace')).open());await step('applyAntigravityMediaEvidence',()=>applyAntigravityMediaEvidence(store).catch(()=>{}));const userData=app.getPath('userData'),node=nativeNode();sourceComponents=new SourceComponents({userData,node,isPackaged:app.isPackaged,fetchImpl:(url,init)=>net.fetch(url,init),onInstalled:source=>providers.refresh(source)});sourceComponents.on('event',event=>send('workbench:event',event));sourceComponents.on('change',()=>send('workbench:change'));await step('sourceComponents.init',()=>sourceComponents.init());const runtimeCache=new RuntimeCache({userData,appVersion:app.getVersion()});environments=new Environments({store,userData,node,isPackaged:app.isPackaged,fetchImpl:(url,init)=>net.fetch(url,init),canUpdate:environmentBusy,runtimeCache,onRefresh:()=>refreshEnvironmentRuntimes({scan:false})});environments.on('event',event=>send('workbench:event',event));environments.on('change',()=>send('workbench:change'));runtimes=await step('environments.restore',()=>environments.restore());
  providers=await step('ProviderService.init',()=>new ProviderService(store,node,{components:sourceComponents}).init());gateway=new Gateway(store,providers,node);media=await step('MediaService.init',()=>new MediaService(store).init());protocol.handle('bridge-media',request=>media.response(request));sessions=new Sessions(store,providers,gateway,runtimes,{media,capabilities:attachmentCapabilities,runtimeReady:id=>environments.busyReason(id)??environments.checkingReason(id)});
  modelServices=new ModelServices({userData,node,components:sourceComponents,runtimeFor:id=>runtimes.find(r=>r.id===id),appVersion:app.getVersion()});modelServices.on('change',()=>send('workbench:change'));timing&&(timing.current='BrowserWindow');
  const colors=chrome(store.state.preferences.theme);
  window=new BrowserWindow({title:'Bridge++',width:1460,height:940,minWidth:1080,minHeight:720,backgroundColor:colors.color,titleBarStyle:'hidden',titleBarOverlay:{...colors,height:44},show:false,webPreferences:{preload:join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,spellcheck:false}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',e=>e.preventDefault());window.webContents.on('will-attach-webview',e=>e.preventDefault());window.webContents.session.setPermissionRequestHandler((webContents,permission,callback,details)=>callback(allowMainWindowFullscreen({permission,requestingUrl:details.requestingUrl,isMainWindow:webContents===window.webContents,entryUrl:pathToFileURL(entry).href})));
  ipcMain.handle('workbench:call',async(event,method,args)=>{try{verifyCaller(event);if(!Object.hasOwn(methods,method))throw new Error('Unknown operation');if(environmentMethods.has(method))await boot.ready('environments');else if(method.startsWith('bridgeService:'))await boot.ready('services');if(method==='attachment:stage'){if(!args||!(args.data instanceof Uint8Array)||args.data.byteLength>100*1024*1024)throw new Error('无效或超限的附件请求');argsObject({projectId:args.projectId,name:args.name});return {ok:true,value:await methods[method](args)};}return {ok:true,value:await methods[method](argsObject(args))};}catch(e){return {ok:false,error:e.message};}});
  terminals.on('event',event=>send('workbench:event',event));window.on('close',event=>{if(!closing&&!canDiscardEditors())event.preventDefault();});
  const quietQA=process.env.AWB_QA==='1'&&process.env.AWB_QA_INACTIVE==='1'&&!app.isPackaged;
  if(quietQA)window.setFocusable(false);
  const show=()=>{if(quietQA){const area=screen.getPrimaryDisplay().workArea;window.setBounds({x:area.x+Math.max(0,area.width-1100),y:area.y+Math.max(0,area.height-740),width:1100,height:740});window.showInactive();}else window.show();};
  store.on('change',()=>send('workbench:change'));nativeTheme.on('updated',applyChrome);store.on('event',e=>send('workbench:event',e.type==='usage'?usageForDisplay(e,store.session(e.sessionId).selection?.modelKey?.split(':')[0]):e));window.once('ready-to-show',()=>{timing?.steps.push({step:'ready-to-show',start:ms(),ms:0});show();});await step('window.loadFile',()=>window.loadFile(entry));show();
  if(timing){timing.current='after-window';await writeTiming('window-loaded');setTimeout(()=>void writeTiming('after-60s'),60000);}
  const environmentBoot=step('boot-environments',async()=>{try{await environments.init();await refreshEnvironmentRuntimes({scan:false});await environments.saveCache(runtimes);runtimes=environments.finishCheck(runtimes);await sessions.updateRuntimes(runtimes);}catch(error){console.error('启动环境检测失败：'+error.message);runtimes=environments.failCheck('环境检测失败，请到设置 → 开发环境重新检测');await sessions.updateRuntimes(runtimes).catch(updateError=>console.error('更新环境状态失败：'+updateError.message));}finally{boot.done('environments');send('workbench:change');}});
  const serviceBoot=step('boot-services',async()=>{try{await modelServices.init();}catch(error){console.error('启动对外接口失败：'+error.message);}finally{boot.done('services');send('workbench:change');}});
  const bootReady=Promise.allSettled([environmentBoot,serviceBoot]).then(()=>writeTiming('boot-ready'));
  void environmentBoot.then(()=>cleanupNativeLaunchers(store.root).catch(error=>console.error('清理旧启动文件失败：'+error.message)));
  if(process.env.AWB_SMOKE_PROJECT){const path=await projectDirectory(process.env.AWB_SMOKE_PROJECT);await store.mutate(s=>{if(!s.projects.some(p=>p.path===path))s.projects.push({id:randomUUID(),name:basename(path),path,createdAt:new Date().toISOString()});});}
  if(process.env.AWB_SMOKE_EXIT_MS)setTimeout(()=>app.quit(),Number(process.env.AWB_SMOKE_EXIT_MS));
  if(process.env.AWB_QA==='1'&&!app.isPackaged){await bootReady;const {run}=await import('../scripts/desktop-qa.mjs');await run({window,methods,store});app.quit();return;}
  await environmentBoot;
  if(!process.env.AWB_QA&&!process.env.AWB_SMOKE_EXIT_MS){void environments.backgroundChecks();for(const source of ['qoder','workbuddy','antigravity'])if((source==='antigravity'?runtimes.find(r=>r.id==='antigravity')?.status==='ready':sourceComponents.snapshot().find(row=>row.id===source)?.status==='ready')&&!store.state.catalog[source]?.models?.length)void methods['provider:refresh']({source}).catch(()=>{});}
}
function canDiscardEditors(){if(!dirtyEditors)return true;const choice=dialog.showMessageBoxSync(window,{type:'question',title:'未保存的文件',message:'有项目文件尚未保存。',detail:'返回编辑器保存，或放弃未保存内容并退出。',buttons:['返回编辑','放弃并退出'],defaultId:0,cancelId:0});if(choice!==1)return false;dirtyEditors=false;return true;}
app.on('window-all-closed',()=>app.quit());app.on('before-quit',e=>{if(closing)return;e.preventDefault();if(!canDiscardEditors())return;closing=true;void(async()=>{for(const service of [providers,sourceComponents,environments,modelServices,terminals,sessions,gateway,store])try{await service?.close();}catch(error){exitCode=1;console.error('关闭服务失败：'+error.message);}if(exitCode)app.exit(exitCode);else app.quit();})();});
main().catch(async e=>{exitCode=1;const log=join(app.getPath('userData'),'startup-error.log');await mkdir(app.getPath('userData'),{recursive:true});await writeFile(log,e.stack??String(e));dialog.showErrorBox('Bridge++ 无法启动',(e.message??String(e))+'\n\n详细日志：'+log);console.error(e);app.quit();});
