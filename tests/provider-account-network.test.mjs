// BPP-0.1.22 F2-1: WorkBuddy balance reads are the first cold connection of their worker process.
// A transient connect-window failure must be retried inside the worker, and a persisting failure must
// land in catalog.workbuddy.account.error as a readable Chinese reason, never as the raw "fetch failed".
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,cp} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {ProviderService,workbuddyAccountError,isTransientAccountNetworkError,accountNetworkReason} from '../app/services/providers.mjs';
import {sourcePackage,put} from './fixtures/source-package.mjs';

const connectFailure=`Object.assign(new TypeError('fetch failed'),{cause:Object.assign(new Error('Connect Timeout Error (attempted address: www.codebuddy.cn:443, timeout: 10000ms)'),{code:'UND_ERR_CONNECT_TIMEOUT'})})`;
async function fixture(t){
  await mkdir('.runtime/tests',{recursive:true});
  const dir=await mkdtemp(resolve('.runtime/tests/provider-account-')),root=join(dir,'resources/app');
  await cp(resolve('app/services'),join(root,'app/services'),{recursive:true});
  await cp(resolve('app/core'),join(root,'app/core'),{recursive:true});
  await put(join(root,'package.json'),'{"type":"module"}');
  await put(join(root,'bridges/workbuddy-bridge/src/config.mjs'),'export const config=()=>({});');
  await put(join(root,'bridges/workbuddy-bridge/src/auth.mjs'),`export class AuthManager {constructor(cfg={}){this.cfg=cfg;}async get(){if(process.env.AWB_F2_AUTH_FAIL==='1')throw ${connectFailure};return {accessToken:'synthetic-account-token',uid:'fixture',domain:process.env.AWB_F2_ACCOUNT_MODE??'transient'};}}`);
  await put(join(root,'bridges/workbuddy-bridge/vendor/workbuddy-connect-4.13.0.mjs'),`import {writeFile} from 'node:fs/promises';
export class F {constructor(){F.attempt=0;}
 async fetchModels(){return [{id:'fixture',name:'Fixture'}];}
 async fetchCredits(credential){F.attempt++;await writeFile('account-attempts',String(F.attempt));const mode=credential.domain;
  if(mode==='always'||(mode==='transient'&&F.attempt<3))throw ${connectFailure};
  if(mode==='cert')throw Object.assign(new TypeError('fetch failed'),{cause:Object.assign(new Error('unable to verify the first certificate'),{code:'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'})});
  return {total:123,packages:[{packageName:'fixture-package',remain:20,size:30}]};}
 async fetchCheckinStatus(){throw new Error('checkin fixture offline');}
 async refreshToken(){return {accessToken:'synthetic-account-token'};}}`);
  const dirs={workbuddy:(await sourcePackage(join(dir,'components','workbuddy'),'workbuddy')).directory};
  const store={root:join(dir,'private'),state:{catalog:{}},mutate:async fn=>{await fn(store.state);return store.state;}};
  const providers=new ProviderService(store,{command:process.execPath,args:[],env:{}},{components:{environment:async id=>({AWB_SOURCE_PACKAGE_DIR:dirs[id],AWB_PACKAGED:'1'})},workerScript:join(root,'app/services/provider-worker.mjs'),cwd:root});
  t.after(()=>providers.close());
  return {providers,store,dir};
}
async function account(t,vars){
  const saved=new Map(Object.entries(vars).map(([key])=>[key,process.env[key]]));
  Object.assign(process.env,vars);t.after(()=>{for(const [key,value]of saved)value===undefined?delete process.env[key]:process.env[key]=value;});
  const {providers,store}=await fixture(t);
  const value=await providers.account('workbuddy',{force:true});
  const attempts=await readFile(join(store.root,'providers','workbuddy','account-attempts'),'utf8').catch(()=>null);
  return {value,attempts};
}
test('the balance worker retries a cold connect failure and then reports the account',async t=>{
  const {value,attempts}=await account(t,{AWB_F2_ACCOUNT_MODE:'transient',AWB_F2_AUTH_FAIL:''});
  assert.equal(value.error,null);assert.equal(value.balance,123);assert.equal(attempts,'3');
});
test('a persisting connect failure becomes a Chinese account error after bounded retries',async t=>{
  const {value,attempts}=await account(t,{AWB_F2_ACCOUNT_MODE:'always',AWB_F2_AUTH_FAIL:''});
  assert.equal(value.error,'无法连接 WorkBuddy 积分接口：连接超时（UND_ERR_CONNECT_TIMEOUT）');
  assert.equal(value.balance,null);assert.equal(attempts,'3');
});
test('a certificate failure is never retried and still reads as a Chinese account error',async t=>{
  const {value,attempts}=await account(t,{AWB_F2_ACCOUNT_MODE:'cert',AWB_F2_AUTH_FAIL:''});
  assert.equal(value.error,'无法连接 WorkBuddy 积分接口：证书校验失败（UNABLE_TO_GET_ISSUER_CERT_LOCALLY）');
  assert.equal(attempts,'1');
});
test('an auth-refresh cold failure crashes the worker but settles as a Chinese account error',async t=>{
  const {value}=await account(t,{AWB_F2_AUTH_FAIL:'1'});
  assert.equal(value.error,'无法连接 WorkBuddy 积分接口：网络异常（UND_ERR_NETWORK）');
});
test('account failure classification reads causes, retries only transient codes and keeps real messages',()=>{
  assert.equal(isTransientAccountNetworkError(Object.assign(new TypeError('fetch failed'),{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}})),true);
  assert.equal(isTransientAccountNetworkError(Object.assign(new TypeError('fetch failed'),{cause:{code:'ENOTFOUND'}})),true);
  assert.equal(isTransientAccountNetworkError(Object.assign(new TypeError('fetch failed'),{cause:{code:'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'}})),false);
  assert.equal(isTransientAccountNetworkError(new Error('登录已失效，请重新登录')),false);
  assert.equal(workbuddyAccountError(Object.assign(new TypeError('fetch failed'))),'无法连接 WorkBuddy 积分接口：网络异常（UND_ERR_NETWORK）');
  assert.equal(workbuddyAccountError(Object.assign(new TypeError('fetch failed'),{cause:{code:'UND_ERR_CONNECT_TIMEOUT'},message:'fetch failed'})),'无法连接 WorkBuddy 积分接口：连接超时（UND_ERR_CONNECT_TIMEOUT）');
  assert.equal(workbuddyAccountError(new Error('登录已失效，请重新登录')),'登录已失效，请重新登录');
  assert.equal(accountNetworkReason('ECONNREFUSED'),'连接被拒绝');
  assert.equal(accountNetworkReason('EHOSTUNREACH'),'本机网络不可达');
  assert.equal(accountNetworkReason('UND_ERR_HEADERS_TIMEOUT'),'服务器响应超时');
});
