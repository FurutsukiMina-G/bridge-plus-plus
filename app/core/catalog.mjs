import {createHash} from 'node:crypto';
import {antigravityModelMedia} from './antigravity-media.mjs';
const positive=value=>Number.isSafeInteger(value)&&value>0;
const unique=values=>[...new Set(values)];
export const modelKey=(source,id)=>`${source}:${id}`;
export function fingerprint(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,20);}
export function normalizeQoder(raw){
  if(typeof raw.value!=='string'||!raw.value)return null;
  const contexts=Object.entries(raw.context_config??{}).filter(([,c])=>positive(c?.token_count)).map(([id,c])=>({id,label:c.display_name??c.label??id,tokens:c.token_count,kind:'native'}));
  const enabled=raw.thinking_config?.enabled,efforts=Object.keys(enabled?.efforts??{});
  const disabled=raw.thinking_config?.disabled;
  const reasoning=unique([...efforts,...(disabled?['none']:[])]);
  return {key:modelKey('qoder',raw.value),source:'qoder',id:raw.value,name:raw.displayName??raw.value,enabled:raw.isEnabled!==false,
    contexts,defaultContextTokens:contexts.find(c=>raw.context_config[c.id]?.is_default)?.tokens??raw.defaultContextWindow??contexts[0]?.tokens??null,contextMaximum:contexts.length?Math.max(...contexts.map(c=>c.tokens)):null,reasoning,defaultReasoning:raw.defaultEffort??Object.entries(enabled?.efforts??{}).find(([,v])=>v?.is_default)?.[0]??null,maxOutputTokens:positive(raw.maxOutputTokens)?raw.maxOutputTokens:null,
    tools:typeof raw.supportsToolCall==='boolean'?raw.supportsToolCall:null,images:typeof raw.supportsImages==='boolean'?raw.supportsImages:typeof raw.isVl==='boolean'?raw.isVl:null,
    identity:fingerprint({id:raw.value,name:raw.displayName}),raw};
}
export function normalizeWorkbuddy(raw){
  if(typeof raw.id!=='string'||!raw.id)return null;
  const native=positive(raw.contextWindow)?raw.contextWindow:null;
  const reasoning=unique([...(raw.reasoning?.supportedEfforts??[]),...(raw.reasoning?.canDisableThinking?['none']:[])]);
  return {key:modelKey('workbuddy',raw.id),source:'workbuddy',id:raw.id,name:raw.name??raw.id,enabled:true,
    contexts:native?[{id:'native',label:'上游窗口',tokens:native,kind:'native'}]:[],contextMaximum:native,reasoning,defaultReasoning:raw.reasoning?.defaultEffort??null,
    maxOutputTokens:positive(raw.maxTokens)?raw.maxTokens:null,tools:raw.supportsToolCall??null,images:raw.supportsImages??null,
    identity:fingerprint({id:raw.id,name:raw.name}),raw};
}
export function normalizeAntigravity(raw){
  if(typeof raw.id!=='string'||!/^gemini[-.]/i.test(raw.id))return null;
  return {key:modelKey('antigravity',raw.id),source:'antigravity',id:raw.id,name:raw.name??raw.id,enabled:true,boundRuntime:'antigravity',
    contexts:[],contextMaximum:null,reasoning:[],defaultReasoning:null,maxOutputTokens:null,tools:null,...antigravityModelMedia(),
    identity:fingerprint({id:raw.id,name:raw.name}),raw};
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
