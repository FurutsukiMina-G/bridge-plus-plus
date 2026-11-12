import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {normalizeQoder,normalizeWorkbuddy,normalizeAntigravity,normalizeQoderAccount,normalizeWorkbuddyAccount} from '../app/core/catalog.mjs';
import {ProviderService} from '../app/services/providers.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {Store} from '../app/core/store.mjs';
import {RuntimeLifecycle} from '../app/core/lifecycle.mjs';

// Shapes below are copied from the R2 live catalog (Qoder 1.0.50 / WorkBuddy 0.3.286).
const at='2026-11-11T12:00:00.000Z';
const offPeak={rule_id:'idle_time_model_credit_discount',active:false,discount_factor:0.4,before_promotion_price_factor:0.5,window_start:'22:00',window_end:'08:00',timezone:'Asia/Shanghai',badge:{zh:'错峰 4 折',en:'40% off'},description:{zh:'22:00–08:00 错峰 4 折',en:'40% off 22:00–08:00'}};
const qoderModel=(overrides={})=>normalizeQoder({value:'qmodel_38max',displayName:'Qwen3.8-Max',isEnabled:true,priceFactor:0.5,originalPriceFactor:0.5,promotion:offPeak,context_config:{long:{token_count:1000000}},...overrides},at);

test('Qoder idle-time promotion keeps its window, timezone, factor and localized badge',()=>{
  const model=qoderModel();
  assert.equal(model.pricing.base,0.5);
  assert.equal(model.pricing.original,null,'an equal originalPriceFactor is not a discount');
  assert.equal(model.pricing.free,false);
  assert.equal(model.pricing.limited,false);
  assert.deepEqual(model.pricing.windows,[{start:'22:00',end:'08:00',timezone:'Asia/Shanghai',factor:0.4,label:'错峰 4 折'}]);
  assert.equal(model.pricing.badge,'22:00–08:00 错峰 4 折');
  assert.equal(model.pricing.unit,'credits');
  assert.equal(model.pricing.fetchedAt,at);
  assert.equal(model.pricing.peak,null);
  // The live snapshot and the raw payload stay out of the derived pricing.
  assert.ok(!('active' in model.pricing)&&!('active' in model.pricing.windows[0]));
  assert.equal(model.raw.promotion.active,false,'raw is preserved verbatim');
});

test('Qoder free flags follow isFree, a zero factor and the limited-time tag',()=>{
  const flash=qoderModel({value:'qfmodel',displayName:'Qwen3.8-Flash',isFree:true,priceFactor:0.1,tags:['limited_time_free'],promotion:{...offPeak,badge:{zh:'限时免费'}}});
  assert.equal(flash.pricing.free,true);
  assert.equal(flash.pricing.limited,true);
  assert.equal(flash.pricing.windows.length,1);
  assert.equal(qoderModel({priceFactor:0}).pricing.free,true,'priceFactor 0 is free');
  assert.equal(qoderModel({isFree:false,priceFactor:0.8}).pricing.free,false);
  assert.equal(qoderModel({isFree:undefined,priceFactor:0.1}).pricing.free,false,'undefined isFree is not free');
});

test('Qoder keeps a real original price and reports a missing factor as null',()=>{
  assert.equal(qoderModel({priceFactor:0.5,originalPriceFactor:0.8}).pricing.original,0.8);
  assert.equal(qoderModel({priceFactor:0.5,originalPriceFactor:null}).pricing.original,null);
  const missing=qoderModel({value:'gmodel',displayName:'GLM-5.3',priceFactor:undefined,promotion:undefined});
  assert.equal(missing.pricing.base,null,'a missing factor is never defaulted to 1');
  assert.equal(missing.pricing.original,null);
  assert.equal(missing.pricing.free,false);
  assert.deepEqual(missing.pricing.windows,[]);
  assert.equal(missing.pricing.badge,null);
});

test('Qoder drops promotions that are not idle-time, or lack a timezone or factor',()=>{
  assert.deepEqual(qoderModel({promotion:{...offPeak,rule_id:'launch_discount'}}).pricing.windows,[]);
  assert.deepEqual(qoderModel({promotion:{...offPeak,timezone:undefined}}).pricing.windows,[],'no timezone → whole window dropped');
  assert.deepEqual(qoderModel({promotion:{...offPeak,discount_factor:undefined}}).pricing.windows,[]);
  const noBadge=qoderModel({promotion:{...offPeak,badge:undefined,description:{en:'Off-peak 40%'}}});
  assert.equal(noBadge.pricing.windows[0].label,null);
  assert.equal(noBadge.pricing.badge,'Off-peak 40%','English is the last localized fallback');
});

test('Qoder DeepSeek tariffs carry the published peak calendar; other models do not',()=>{
  for(const id of ['dfmodel','dmodel']){
    const peak=qoderModel({value:id,displayName:id}).pricing.peak;
    assert.deepEqual(peak,{timezone:'Asia/Shanghai',days:[1,2,3,4,5],ranges:[['09:00','12:00'],['14:00','18:00']],factor:2,label:'高峰',note:'按 DeepSeek 官方价折算积分：工作日 9:00–12:00、14:00–18:00 为高峰（×2），其余时段和法定节假日为低峰。这里只按星期和时段判断，节假日和调休以实际计费为准'});
  }
  assert.equal(qoderModel({value:'gmodel',displayName:'GLM-5.3'}).pricing.peak,null);
  assert.equal(qoderModel({value:'kmodel_latest'}).pricing.peak,null);
});

test('WorkBuddy pricing distinguishes a zero multiplier from a missing one',()=>{
  const free=normalizeWorkbuddy({id:'hy4free',name:'Hy4',creditMultiplier:0},at);
  assert.equal(free.pricing.base,0);assert.equal(free.pricing.free,true);
  const paid=normalizeWorkbuddy({id:'deepseek-v4.1-flash',name:'DeepSeek-V4.1-Flash',creditMultiplier:0.11},at);
  assert.equal(paid.pricing.base,0.11);assert.equal(paid.pricing.free,false);
  const missing=normalizeWorkbuddy({id:'x',name:'X'},at);
  assert.equal(missing.pricing.base,null);assert.equal(missing.pricing.free,false);
  for(const model of [free,paid,missing]){assert.equal(model.pricing.original,null);assert.deepEqual(model.pricing.windows,[]);assert.equal(model.pricing.peak,null);assert.equal(model.pricing.badge,null);assert.equal(model.pricing.unit,'credits');assert.equal(model.pricing.fetchedAt,at);}
});

test('Antigravity models declare no pricing',()=>{
  assert.equal(normalizeAntigravity({id:'gemini-3-pro',name:'Gemini 3 Pro'}).pricing,null);
});

test('Qoder account keeps only quota numbers and adds the parts together',()=>{
  const usage={userId:'account-identity',upgradeUrl:'https://example/upgrade',userType:'personal_professional',expiresAt:1795104000000,isQuotaExceeded:false,totalUsagePercentage:71,
    userQuota:{total:2000,used:2000,remaining:0},addOnQuota:{total:2900,used:2107,remaining:793}};
  const account=normalizeQoderAccount(usage,at);
  assert.equal(account.balance,793,'a used plan quota must not hide the add-on balance');
  assert.equal(account.unit,'积分');assert.equal(account.exceeded,false);assert.equal(account.checkin,null);assert.equal(account.fetchedAt,at);assert.equal(account.error,null);
  assert.deepEqual(account.parts.map(p=>[p.label,p.remaining,p.total]),[['套餐',0,2000],['加量包',793,2900]]);
  assert.equal(account.parts[0].expiresAt,new Date(1795104000000).toISOString());
  for(const key of ['userId','upgradeUrl','userType'])assert.ok(!JSON.stringify(account).includes(key));
});

test('Qoder account handles an add-on-only payload and a payload with no quota at all',()=>{
  const addOn=normalizeQoderAccount({addOnQuota:{total:100,used:40,remaining:60},isQuotaExceeded:true},at);
  assert.equal(addOn.balance,60);assert.deepEqual(addOn.parts.map(p=>p.label),['加量包']);assert.equal(addOn.exceeded,true);
  const empty=normalizeQoderAccount({userId:'x'},at);
  assert.equal(empty.balance,null);assert.deepEqual(empty.parts,[]);assert.equal(empty.exceeded,null);
  assert.equal(normalizeQoderAccount(null,at),null);
});

test('WorkBuddy account keeps package names, expiry and check-in without identity fields',()=>{
  const account=normalizeWorkbuddyAccount({credits:{total:5154.740001,uin:'account-identity',nearestExpiryMs:1796918980000,packages:[
    {packageName:'Buddy AI个人标准版',remain:1954.740001,size:2000,expiresAtMs:1796918980000},
    {packageName:'Codebuddy版本赠送包',remain:2000,size:2000,expiresAtMs:1796918980000}]},
    checkin:{todayCheckedIn:true,dailyCredit:100,streakDays:22,claimButtonText:'立即领取'}},at);
  assert.equal(account.balance,5154.740001);assert.equal(account.unit,'积分');assert.equal(account.exceeded,null);assert.equal(account.fetchedAt,at);
  assert.deepEqual(account.parts,[
    {label:'Buddy AI个人标准版',remaining:1954.740001,total:2000,expiresAt:new Date(1796918980000).toISOString()},
    {label:'Codebuddy版本赠送包',remaining:2000,total:2000,expiresAt:new Date(1796918980000).toISOString()}]);
  assert.deepEqual(account.checkin,{today:true,daily:100,streak:22});
  for(const key of ['uin','nearestExpiryMs','claimButtonText'])assert.ok(!JSON.stringify(account).includes(key));
  const onlyCheckin=normalizeWorkbuddyAccount({checkin:{todayCheckedIn:false,dailyCredit:100,streakDays:2}},at);
  assert.equal(onlyCheckin.balance,null);assert.deepEqual(onlyCheckin.parts,[]);assert.deepEqual(onlyCheckin.checkin,{today:false,daily:100,streak:2});
  assert.equal(normalizeWorkbuddyAccount(null,at),null);
});

class FakeProvider extends ProviderService {
  constructor(store,respond,node={command:process.execPath,args:[],env:{}}){super(store,node);this.respond=respond;this.calls=[];}
  async runWorker(source,action){this.calls.push({source,action});await new Promise(r=>setTimeout(r,5));return this.respond(source,action);}
}
async function providerFixture(t,respond){
  await mkdir('.runtime/tests',{recursive:true});
  const store=await new Store(await mkdtemp(resolve('.runtime/tests/provider-account-'))).open();
  const service=new FakeProvider(store,respond);t.after(async()=>{await service.close();await store.close();});
  return {store,service};
}
const qoderUsage={userQuota:{total:10,used:1,remaining:9},addOnQuota:null,isQuotaExceeded:false};

test('provider:account caches for five minutes, merges concurrent reads and honours force',async t=>{
  const {service}=await providerFixture(t,()=>({models:null,account:qoderUsage,accountError:null}));
  const first=await service.account('qoder');
  assert.equal(first.balance,9);assert.equal(service.calls.length,1);
  await service.account('qoder');
  assert.equal(service.calls.length,1,'a fresh cached account is returned without a worker');
  await service.account('qoder',{force:true});
  assert.equal(service.calls.length,2);
  const [left,right]=await Promise.all([service.account('qoder',{force:true}),service.account('qoder',{force:true})]);
  assert.equal(service.calls.length,3,'a second concurrent caller shares the running worker');
  assert.deepEqual(left,right);
});

test('a failed account read keeps the previous numbers and records the reason',async t=>{
  const {store,service}=await providerFixture(t,(source,action)=>action==='account'?{models:null,account:null,accountError:'积分查询失败：网络不可用'}:{models:null,account:null,accountError:null});
  await store.mutate(s=>{s.catalog={qoder:{status:'ready',models:[],account:{balance:42,unit:'积分',parts:[],exceeded:null,checkin:null,fetchedAt:new Date(0).toISOString(),error:null}}};});
  const account=await service.account('qoder',{force:true});
  assert.equal(account.balance,42,'the last known balance survives a failure');
  assert.match(account.error,/网络不可用/);
});

async function sessionFixture(t,account){
  await mkdir('.runtime/tests',{recursive:true});
  const store=await new Store(await mkdtemp(resolve('.runtime/tests/account-turn-'))).open();
  await store.mutate(s=>{s.projects=[{id:'p',path:store.root}];s.catalog={qoder:{status:'ready',models:[],...(account?{account}:{})}};});
  const model=normalizeQoder({value:'dfmodel',displayName:'DeepSeek-Flash',context_config:{long:{token_count:200000,is_default:true}},thinking_config:{enabled:{efforts:{low:{}}}}});
  let accountCalls=0;const instances=[];
  class Fake extends RuntimeLifecycle{constructor(options){super(options);instances.push(this);}async prompt(){}async close(){this.closed=true;}}
  const providers={get:()=>model,account:async source=>{accountCalls++;return store.state.catalog[source]?.account??null;}};
  const gateway={register:async(_model,variant)=>({baseURL:'http://127.0.0.1:1/v1',key:'fixture',model:variant.id})};
  const manager=new Sessions(store,providers,gateway,[{id:'codex',installed:true}],{constructors:{codex:Fake}});
  const selection={modelKey:model.key,identity:model.identity,contextTokens:200000,reasoning:'low'};
  const session=await manager.create({projectId:'p',runtimeId:'codex',selection});
  t.after(async()=>{await manager.close();await store.close();});
  return {store,manager,session,selection,instances,calls:()=>accountCalls};
}
async function until(fn){for(let i=0;i<300;i++){if(fn())return;await new Promise(r=>setTimeout(r,3));}throw new Error('Fixture state timeout');}
const accountAt=fetchedAt=>({balance:5,unit:'积分',parts:[],exceeded:null,checkin:null,fetchedAt,error:null});

test('a finished turn does not re-read a balance that is still fresh',async t=>{
  const f=await sessionFixture(t,accountAt(new Date().toISOString()));
  await f.manager.prompt(f.session.id,'hello');
  await f.instances[0].emit({type:'text',text:'Done.'});await f.instances[0].emit({type:'turn-end',status:'completed',nativeTurn:1});
  await until(()=>f.session.status==='completed');
  assert.equal(f.calls(),0);
});

test('a finished turn refreshes a stale balance unless the same source is still running',async t=>{
  const f=await sessionFixture(t,accountAt(new Date(0).toISOString()));
  const second=await f.manager.create({projectId:'p',runtimeId:'codex',selection:f.selection});
  f.manager.runs.set(second.id,{terminal:false});
  f.manager.scheduleAccountRefresh(f.session);await new Promise(r=>setTimeout(r,10));
  assert.equal(f.calls(),0,'a live turn on the same source owns the runtime');
  f.manager.runs.delete(second.id);
  await f.manager.prompt(f.session.id,'hello');
  await f.instances[0].emit({type:'text',text:'Done.'});await f.instances[0].emit({type:'turn-end',status:'completed',nativeTurn:1});
  await until(()=>f.session.status==='completed');
  assert.equal(f.calls(),1);
});
