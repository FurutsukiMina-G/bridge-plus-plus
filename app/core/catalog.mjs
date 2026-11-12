import {createHash} from 'node:crypto';
import {antigravityModelMedia} from './antigravity-media.mjs';
const positive=value=>Number.isSafeInteger(value)&&value>0;
const unique=values=>[...new Set(values)];
export const modelKey=(source,id)=>`${source}:${id}`;
export function fingerprint(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,20);}
// Pricing is lifted from what the source declares. Nothing is inferred: a missing
// factor is null, never 1. Free means a declared zero factor, which is all Qoder's
// own model picker shows: its `isFree` flag only steers the client's side queries and
// stays set on models that bill (Qwen3.8-Flash carries it at ×0.1, drawn from the
// account's Qwen credits), so it never makes a model free here.
const amount=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const localizedText=value=>{for(const key of ['zh','cn_zh','en'])if(typeof value?.[key]==='string'&&value[key].trim())return value[key].trim();return null;};
const OFF_PEAK_RULE='idle_time_model_credit_discount';
// bills via DeepSeek's published CNY list price for exactly these two models.
const DEEPSEEK_TARIFF_MODELS=new Set(['dfmodel','dmodel']);
const peakPricing=()=>({timezone:'Asia/Shanghai',days:[1,2,3,4,5],ranges:[['09:00','12:00'],['14:00','18:00']],factor:2,label:'高峰',note:'按 DeepSeek 官方价折算积分：工作日 9:00–12:00、14:00–18:00 为高峰（×2），其余时段和法定节假日为低峰。这里只按星期和时段判断，节假日和调休以实际计费为准'});
export function qoderPricing(raw,fetchedAt){
  const base=amount(raw?.priceFactor),original=amount(raw?.originalPriceFactor),promotion=raw?.promotion&&typeof raw.promotion==='object'?raw.promotion:null,windows=[];
  // Only the idle-time rule drives a window; promotion.active is a snapshot and is never stored.
  if(promotion?.rule_id===OFF_PEAK_RULE){
    const factor=amount(promotion.discount_factor);
    if(factor!==null&&typeof promotion.window_start==='string'&&promotion.window_start&&typeof promotion.window_end==='string'&&promotion.window_end&&typeof promotion.timezone==='string'&&promotion.timezone)windows.push({start:promotion.window_start,end:promotion.window_end,timezone:promotion.timezone,factor,label:localizedText(promotion.badge)});
  }
  // An original price only means something next to a declared current price.
  return {base,original:base!==null&&original!==null&&original!==base?original:null,free:base===0,
    limited:Array.isArray(raw?.tags)&&raw.tags.includes('limited_time_free'),windows,
    peak:DEEPSEEK_TARIFF_MODELS.has(raw?.value)?peakPricing():null,badge:promotion?localizedText(promotion.description):null,unit:'credits',fetchedAt};
}
export function workbuddyPricing(raw,fetchedAt){
  const base=amount(raw?.creditMultiplier);
  return {base,original:null,free:base===0,limited:false,windows:[],peak:null,badge:null,unit:'credits',fetchedAt};
}
const millisIso=value=>typeof value==='number'&&Number.isFinite(value)&&value>0?new Date(value).toISOString():null;
// Only the fields below leave the source's usage payload; account identifiers never do.
export function normalizeQoderAccount(usage,fetchedAt){
  if(!usage||typeof usage!=='object')return null;
  const parts=[];let balance=0,found=false;
  for(const [label,quota] of [['套餐',usage.userQuota],['加量包',usage.addOnQuota]]){
    if(!quota||typeof quota!=='object')continue;
    found=true;const remaining=amount(quota.remaining)??0;balance+=remaining;
    parts.push({label,remaining,total:amount(quota.total),expiresAt:millisIso(quota.expiresAt??usage.expiresAt)});
  }
  return {balance:found?balance:null,unit:'积分',parts,exceeded:typeof usage.isQuotaExceeded==='boolean'?usage.isQuotaExceeded:null,checkin:null,fetchedAt,error:null};
}
export function normalizeWorkbuddyAccount(source,fetchedAt){
  if(!source||typeof source!=='object')return null;
  const credits=source.credits&&typeof source.credits==='object'?source.credits:null,checkin=source.checkin&&typeof source.checkin==='object'?source.checkin:null;
  if(!credits&&!checkin)return null;
  const parts=Array.isArray(credits?.packages)?credits.packages.filter(p=>p&&typeof p==='object').map(p=>({label:typeof p.packageName==='string'&&p.packageName?p.packageName:'积分包',remaining:amount(p.remain)??0,total:amount(p.size),expiresAt:millisIso(p.expiresAtMs)})):[];
  return {balance:amount(credits?.total),unit:'积分',parts,exceeded:null,
    checkin:checkin?{today:checkin.todayCheckedIn===true,daily:amount(checkin.dailyCredit),streak:amount(checkin.streakDays)}:null,fetchedAt,error:null};
}
export function normalizeQoder(raw,fetchedAt=new Date().toISOString()){
  if(typeof raw.value!=='string'||!raw.value)return null;
  const contexts=Object.entries(raw.context_config??{}).filter(([,c])=>positive(c?.token_count)).map(([id,c])=>({id,label:c.display_name??c.label??id,tokens:c.token_count,kind:'native'}));
  const enabled=raw.thinking_config?.enabled,efforts=Object.keys(enabled?.efforts??{});
  const disabled=raw.thinking_config?.disabled;
  const reasoning=unique([...efforts,...(disabled?['none']:[])]);
  return {key:modelKey('qoder',raw.value),source:'qoder',id:raw.value,name:raw.displayName??raw.value,enabled:raw.isEnabled!==false,
    contexts,defaultContextTokens:contexts.find(c=>raw.context_config[c.id]?.is_default)?.tokens??raw.defaultContextWindow??contexts[0]?.tokens??null,contextMaximum:contexts.length?Math.max(...contexts.map(c=>c.tokens)):null,reasoning,defaultReasoning:raw.defaultEffort??Object.entries(enabled?.efforts??{}).find(([,v])=>v?.is_default)?.[0]??null,maxOutputTokens:positive(raw.maxOutputTokens)?raw.maxOutputTokens:null,
    tools:typeof raw.supportsToolCall==='boolean'?raw.supportsToolCall:null,images:typeof raw.supportsImages==='boolean'?raw.supportsImages:typeof raw.isVl==='boolean'?raw.isVl:null,
    pricing:qoderPricing(raw,fetchedAt),identity:fingerprint({id:raw.value,name:raw.displayName}),raw};
}
export function normalizeWorkbuddy(raw,fetchedAt=new Date().toISOString()){
  if(typeof raw.id!=='string'||!raw.id)return null;
  const native=positive(raw.contextWindow)?raw.contextWindow:null;
  const reasoning=unique([...(raw.reasoning?.supportedEfforts??[]),...(raw.reasoning?.canDisableThinking?['none']:[])]);
  return {key:modelKey('workbuddy',raw.id),source:'workbuddy',id:raw.id,name:raw.name??raw.id,enabled:true,
    contexts:native?[{id:'native',label:'上游窗口',tokens:native,kind:'native'}]:[],contextMaximum:native,reasoning,defaultReasoning:raw.reasoning?.defaultEffort??null,
    maxOutputTokens:positive(raw.maxTokens)?raw.maxTokens:null,tools:raw.supportsToolCall??null,images:raw.supportsImages??null,
    pricing:workbuddyPricing(raw,fetchedAt),identity:fingerprint({id:raw.id,name:raw.name}),raw};
}
export function normalizeAntigravity(raw){
  if(typeof raw.id!=='string'||!/^gemini[-.]/i.test(raw.id))return null;
  return {key:modelKey('antigravity',raw.id),source:'antigravity',id:raw.id,name:raw.name??raw.id,enabled:true,boundRuntime:'antigravity',
    contexts:[],contextMaximum:null,reasoning:[],defaultReasoning:null,maxOutputTokens:null,tools:null,...antigravityModelMedia(),
    pricing:null,identity:fingerprint({id:raw.id,name:raw.name}),raw};
}
export function validateSelection(model,selection){
  if(!model?.enabled)throw new Error('模型不在当前可用目录中，请刷新模型源');
  if(selection.identity!==model.identity)throw new Error('上游模型身份已变化，请重新选择模型');
  if(selection.reasoning&&!model.reasoning.includes(selection.reasoning))throw new Error('此模型源未声明支持该思考强度');
  const context=selection.contextTokens??model.defaultContextTokens??model.contextMaximum??null;
  if(context!==null&&(!positive(context)||!model.contexts.some(c=>c.tokens===context)))throw new Error('请选择来源实际支持的上下文窗口');
  const budget=selection.contextBudget??null;
  if(budget!==null&&(!positive(budget)||!model.contextMaximum||budget>model.contextMaximum||budget<4096))throw new Error('本地上下文预算必须介于 4096 与上游窗口之间');
  if(model.source==='qoder'&&budget!==null&&context!==null&&budget>context)throw new Error('本地预算不能超过选定的上游窗口');
  return {...selection,contextTokens:context,contextBudget:budget};
}
export function publicVariants(model){
  // Only native model identity and context select an SDK pool. Effort and local budgets are per session.
  const contexts=model.contexts.length?unique(model.contexts.map(c=>c.tokens)):[null];
  return contexts.map(context=>({id:`awb-${Buffer.from(model.id).toString('base64url')}${context?`-${context}`:''}`,upstreamId:model.id,identity:model.identity,name:model.name,contextWindow:context??model.contextMaximum,maxTokens:model.maxOutputTokens??32000,efforts:model.reasoning,modelKey:model.key}));
}
export function variantFor(model,selection){const variant=publicVariants(model).find(v=>v.contextWindow===(selection.contextTokens??model.defaultContextTokens??model.contextMaximum))??publicVariants(model)[0];if(!variant)throw new Error('No gateway model variant');return {...variant,id:`${variant.id}-i${model.identity.slice(0,10)}`};}
