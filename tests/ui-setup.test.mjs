import {test} from 'node:test';
import assert from 'node:assert/strict';
import {usable,unusableReason,permissionWarning,environmentCardHtml,serviceCardHtml,serviceModelsHtml,onboardingHtml,sourceCardHtml,sourceState} from '../app/ui/setup.js';

const dsh={id:'dsh',name:'DeepSeek Harness',protocol:'native-web',description:'原生 Harness',tools:'工具',installed:true};
const kimi={id:'kimi',name:'Kimi Code',protocol:'acp',description:'ACP',tools:'工具',installed:true};
const codex={id:'codex',name:'Codex CLI',protocol:'exec',description:'exec',tools:'工具',installed:false};

test('the backend status decides whether an environment can be picked',()=>{
  assert.equal(usable(dsh),true);
  assert.equal(usable(codex),false);
  assert.equal(usable({...dsh,status:'needs-setup'}),false,'installed but not set up is not usable');
  assert.equal(usable({...codex,status:'ready'}),true);
  assert.equal(usable(undefined),false);
  assert.equal(unusableReason(codex),'Codex CLI 尚未安装');
  assert.equal(unusableReason({...dsh,status:'needs-setup',reason:'请先登录'}),'请先登录');
});

test('only the DSH modes without a sandbox ask before switching',()=>{
  assert.match(permissionWarning('dsh','auto').title,/完全权限/);
  assert.match(permissionWarning('dsh','auto-review').text,/没有沙箱/);
  for(const mode of ['ask','readonly',null])assert.equal(permissionWarning('dsh',mode),null);
  // Codex keeps its workspace sandbox in "auto", so it is not the same risk.
  assert.equal(permissionWarning('codex','auto'),null);
});

test('a missing environment offers install but never "use for a new session"',()=>{
  const html=environmentCardHtml({...codex,status:'missing'},{actions:{install:true,check:true},page:'https://example.invalid/codex'});
  assert.match(html,/data-env-install="codex"/);
  assert.match(html,/需要能访问 OpenAI 的网络与账号/);
  assert.doesNotMatch(html,/data-use-runtime/);
  const ready=environmentCardHtml({...kimi,status:'ready'},{installed:{version:'2.3.1',kind:'bundled'},latest:{version:'2.4.0'},updateAvailable:true,actions:{update:true,check:true}},{permissions:'<div class="perm-block"></div>',canOpenNative:true});
  assert.match(ready,/data-use-runtime="kimi"/);
  assert.match(ready,/可更新到 2\.4\.0/);
  assert.match(ready,/随 Bridge\+\+ 附带/);
  assert.match(ready,/data-env-update="kimi"/);
  assert.match(ready,/perm-block/);
});

test('an update is offered once a newer version is known, or always when only the official updater can tell',()=>{
  const agy={id:'antigravity',name:'Antigravity',protocol:'stream-json',description:'agy',tools:'工具',installed:true,status:'ready'};
  assert.match(environmentCardHtml(agy,{updateAvailable:null,actions:{update:true,check:false}}),/data-env-update="antigravity"[^>]*>.*运行官方更新/);
  const kimiReady={...kimi,status:'ready'};
  assert.doesNotMatch(environmentCardHtml(kimiReady,{updateAvailable:null,actions:{update:true,check:true}}),/data-env-update/,'Kimi checks first');
  assert.doesNotMatch(environmentCardHtml(kimiReady,{updateAvailable:false,latest:{version:'2.3.1'},installed:{version:'2.3.1'},actions:{update:true,check:true}}),/data-env-update/);
  assert.match(environmentCardHtml(kimiReady,{updateAvailable:true,latest:{version:'2.4.0'},installed:{version:'2.3.1'},actions:{update:true,check:true}}),/更新到 2\.4\.0/);
});

test('install jobs show progress, hide other actions and escape messages',()=>{
  const job=state=>environmentCardHtml({...dsh,status:'missing'},{actions:{install:true,cancel:true,check:true},job:{action:'install',state,received:5*1024*1024,total:20*1024*1024,message:'<退出码 2>'}});
  const downloading=job('downloading');
  assert.match(downloading,/正在下载 25%/);
  assert.match(downloading,/data-env-cancel="dsh"/);
  assert.doesNotMatch(downloading,/data-env-install/);
  assert.match(job('failed'),/安装失败：&lt;退出码 2&gt;/);
});

test('an interface card reflects its state, port owner and revealed key',()=>{
  const base={id:'qoder',name:'bridge++_qoder',source:'qoder',sourceName:'Qoder CN',port:8646,baseURL:'http://127.0.0.1:8646/v1',defaultProfile:'dsh',keyPreview:'bpp_…a1b2',models:{count:30},autostart:{enabled:true,valid:false,issue:'任务指向旧版本'}};
  const stopped=serviceCardHtml({...base,status:'stopped',portOwner:{pid:11608,name:'node.exe',command:'node dist/src/main.js serve --port 8646'}});
  assert.match(stopped,/端口被占用/);
  assert.match(stopped,/node\.exe（pid 11608）/);
  assert.match(stopped,/data-svc-action="qoder\|start"/);
  assert.match(stopped,/data-svc-connect="qoder\|dsh" disabled/);
  assert.match(stopped,/任务指向旧版本/);
  const running=serviceCardHtml({...base,status:'running',pid:42,dsh:{providerId:'bridgepp_qoder'}},{key:'secret-key-value'});
  assert.match(running,/data-svc-action="qoder\|stop"/);
  assert.doesNotMatch(running,/data-svc-connect="qoder\|dsh" disabled/);
  assert.match(running,/secret-key-value/);
  assert.match(running,/已接入 DeepSeek Harness · provider/);
  assert.doesNotMatch(serviceCardHtml({...base,status:'running'}),/secret-key-value/);
});

test('the connect button shows it is working and cannot be pressed twice',()=>{
  const card=view=>serviceCardHtml({id:'qoder',name:'bridge++_qoder',source:'qoder',status:'running',port:8646},view);
  assert.match(card({connecting:true}),/data-svc-connect="qoder\|dsh" disabled/);
  assert.match(card({connecting:true}),/接入中…/);
  assert.doesNotMatch(card({}),/接入中…/);
});

test('the agent picked at the top is the one the bottom button registers into',()=>{
  const profiles=[{id:'dsh',name:'DSH',baseURL:'http://127.0.0.1:8646/dsh/v1'},{id:'kimi',name:'Kimi Code',baseURL:'http://127.0.0.1:8646/kimi/v1'},{id:'codex',name:'Codex',baseURL:'http://127.0.0.1:8646/codex/v1'}];
  const card=target=>serviceCardHtml({id:'qoder',name:'bridge++_qoder',source:'qoder',status:'running',port:8646,baseURL:'http://127.0.0.1:8646/v1',profiles,defaultProfile:target});
  const kimi=card('kimi');
  assert.match(kimi,/<option value="kimi" selected>Kimi Code<\/option>/);
  assert.match(kimi,/data-svc-connect="qoder\|kimi"/);
  assert.match(kimi,/接入 Kimi Code<\/button>/);
  assert.match(kimi,/http:\/\/127\.0\.0\.1:8646\/kimi\/v1/,'the address is the picked agent\'s own path');
  assert.match(card('codex'),/接入 Codex CLI<\/button>/);
  assert.match(card('dsh'),/接入 DeepSeek Harness<\/button>/);
  const both=serviceCardHtml({id:'qoder',name:'bridge++_qoder',source:'qoder',status:'running',profiles,defaultProfile:'dsh',connections:{dsh:{providerId:'bridgepp_qoder'},kimi:null,codex:{profile:'bridgepp-qoder'}}});
  assert.match(both,/已接入 DeepSeek Harness · provider/);
  assert.match(both,/已接入 Codex CLI · <span class="mono">codex --profile bridgepp-qoder/);
  assert.doesNotMatch(both,/已接入 Kimi Code/);
  const pending=serviceCardHtml({id:'qoder',name:'bridge++_qoder',source:'qoder',status:'running',profiles,defaultProfile:'codex',connections:{codex:{providerId:'bridgepp_qoder',profile:'bridgepp-qoder',requiredEnv:'BRIDGEPP_QODER_KEY'},kimi:{path:'C:\\Users\\User\\.kimi-code\\config.toml'}}});
  assert.match(pending,/差一步接入 Codex CLI.*BRIDGEPP_QODER_KEY/);
  assert.match(pending,/已接入 Kimi Code · <span class="mono" title="C:\\Users\\User\\.kimi-code\\config.toml">.kimi-code\/config.toml/);
});

test('the model list shows ids, windows, efforts and image input',()=>{
  assert.match(serviceModelsHtml(undefined),/正在读取模型/);
  assert.match(serviceModelsHtml([]),/还没有可用模型/);
  const html=serviceModelsHtml([{id:'deepseek-flash-200k',name:'DeepSeek-Flash',context_window:200000,reasoning_efforts:['high','max','none'],default_reasoning_effort:'max',input_modalities:['text','image']}]);
  assert.match(html,/data-copy-text="deepseek-flash-200k"/);
  assert.match(html,/200K/);
  assert.match(html,/effort-tag default">max/);
  assert.match(html,/关闭/);
  assert.match(html,/支持图片输入/);
  assert.doesNotMatch(serviceModelsHtml([{id:'auto',input_modalities:['text']}]),/支持图片输入/);
});

const qoderComponent={id:'qoder',name:'Qoder CN',package:'@qodercn-ai/qodercn-agent-sdk',version:'1.0.50',status:'missing',installedVersion:null,job:null,error:null,page:'https://qoder.cn/',signIn:'需要 Qoder CN 账号。'};
const qoderCatalog={status:'needs-component',models:[]};

test('a source needs its component first, then a sign-in',()=>{
  assert.equal(sourceState(qoderCatalog,qoderComponent).key,'component');
  assert.equal(sourceState(qoderCatalog,{...qoderComponent,job:{state:'downloading'}}).key,'working');
  const installed={...qoderComponent,status:'ready'};
  assert.equal(sourceState({status:'error',error:'请先登录'},installed).key,'error');
  assert.equal(sourceState({status:'ready',models:[]},installed).key,'ready');
  assert.equal(sourceState({status:'loading'},installed).key,'loading');
  assert.equal(sourceState(undefined,installed).key,'idle');
  assert.equal(sourceState({status:'ready'},undefined).key,'ready','Antigravity has no component');
  assert.equal(sourceState(qoderCatalog,undefined).key,'component');
});

test('a source card offers the download, shows progress, then the usual refresh',()=>{
  const missing=sourceCardHtml('qoder','说明',qoderCatalog,qoderComponent);
  assert.match(missing,/需要下载组件/);
  assert.match(missing,/data-source-install="qoder"/);
  assert.match(missing,/data-source-page="qoder"/);
  assert.match(missing,/@qodercn-ai\/qodercn-agent-sdk 1\.0\.50/);
  assert.match(missing,/需要 Qoder CN 账号/);
  assert.doesNotMatch(missing,/data-refresh-source/);
  const working=sourceCardHtml('qoder','说明',qoderCatalog,{...qoderComponent,status:'installing',job:{action:'install',state:'downloading',received:50,total:100}});
  assert.match(working,/data-source-cancel="qoder"/);
  assert.match(working,/正在下载 50%/);
  const ready=sourceCardHtml('qoder','说明',{status:'ready',models:[{enabled:true},{enabled:false}]},{...qoderComponent,status:'ready',installedVersion:'1.0.50'});
  assert.match(ready,/已连接/);
  assert.match(ready,/<b>1<\/b> 个可用模型/);
  assert.match(ready,/data-refresh-source="qoder"/);
  assert.doesNotMatch(ready,/data-source-install/);
  const signedOut=sourceCardHtml('qoder','说明',{status:'error',error:'<登录已过期>',models:[]},{...qoderComponent,status:'ready'});
  assert.match(signedOut,/&lt;登录已过期&gt;/);
  assert.match(signedOut,/data-source-page="qoder"/);
  const gemini=sourceCardHtml('antigravity','说明',{status:'ready',models:[]},undefined);
  assert.doesNotMatch(gemini,/source-package/);
  assert.match(gemini,/Antigravity · Gemini/);
});

test('the guide walks a new user through each source',()=>{
  const base={runtimes:[dsh],environments:[],projects:[],catalog:{qoder:qoderCatalog,workbuddy:{status:'error',error:'未登录',models:[]}},sourceComponents:[qoderComponent,{...qoderComponent,id:'workbuddy',status:'ready',page:'https://www.workbuddy.cn/'}]};
  const html=onboardingHtml(base);
  assert.match(html,/data-source-install="qoder"/);
  assert.match(html,/需要 Qoder CN 账号/);
  assert.match(html,/未登录/);
  assert.match(html,/data-refresh-source="workbuddy"/);
  assert.match(html,/data-source-page="workbuddy"/);
  assert.match(html,/Bridge\+\+ 不附带也不保管/);
  const downloading=onboardingHtml({...base,sourceComponents:[{...qoderComponent,status:'installing',job:{state:'downloading',received:1,total:4}}]});
  assert.match(downloading,/25%/);
  const failed=onboardingHtml({...base,sourceComponents:[{...qoderComponent,job:{state:'failed',message:'npm 不可达'}}]});
  assert.match(failed,/npm 不可达/);
});

test('the guide only lets you start once an environment is usable',()=>{
  const snap=runtimes=>({runtimes,environments:[{id:'dsh',actions:{install:true}}],catalog:{qoder:{status:'ready',models:[{enabled:true},{enabled:false}]}},projects:[]});
  const none=onboardingHtml(snap([{...dsh,installed:false},{...codex}]));
  assert.match(none,/id="guide-done" class="btn primary" disabled/);
  assert.match(none,/data-env-install="dsh"/);
  assert.match(none,/推荐/);
  assert.match(none,/已连接 · 1 个可用模型/);
  assert.match(none,/guide-add-project/);
  const some=onboardingHtml(snap([dsh,codex]));
  assert.doesNotMatch(some,/id="guide-done" class="btn primary" disabled/);
  assert.match(some,/1 个可用/);
});
