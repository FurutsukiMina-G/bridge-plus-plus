import {nativeModels} from './native-models.mjs';
import {normalizeAntigravity} from '../core/catalog.mjs';
import {antigravityModelMedia} from '../core/antigravity-media.mjs';

// Upgrade cached capability annotations without changing selection identity or
// fetching a model catalog. Raw upstream metadata and session nativeId survive.
export async function applyAntigravityMediaEvidence(store){
  const models=Array.isArray(store.state.catalog.antigravity?.models)?store.state.catalog.antigravity.models:[],updates=models.filter(m=>m?.source==='antigravity'&&/^gemini[-.]/i.test(m.id??'')).map(model=>({model,media:antigravityModelMedia()}));
  if(updates.some(({model,media})=>Object.entries(media).some(([key,value])=>JSON.stringify(model[key])!==JSON.stringify(value))))await store.mutate(()=>{for(const {model,media}of updates)Object.assign(model,media);});
}

export async function refreshAntigravitySource(store,runtime,cwd){
  const previous=store.state.catalog.antigravity;
  await store.mutate(s=>{s.catalog.antigravity={status:'loading',checkedAt:new Date().toISOString(),models:previous?.models??[]};});
  try{
    const models=(await nativeModels(runtime,cwd)).map(normalizeAntigravity).filter(Boolean);
    if(!models.length)throw new Error('Antigravity 未返回可用 Gemini 模型');
    await store.mutate(s=>{s.catalog.antigravity={status:'ready',checkedAt:new Date().toISOString(),models};});return models;
  }catch(error){await store.mutate(s=>{s.catalog.antigravity={status:'error',checkedAt:new Date().toISOString(),models:previous?.models??[],error:error.message};});throw error;}
}
