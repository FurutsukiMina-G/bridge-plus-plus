export const SERVICE_DEFINITIONS=Object.freeze({qoder:{id:'qoder',source:'qoder',name:'bridge++_qoder',sourceName:'Qoder CN',port:8646,credential:'BRIDGEPP_QODER_KEY',providerId:'bridgepp_qoder'},workbuddy:{id:'workbuddy',source:'workbuddy',name:'Bridge++_WorkBuddy',sourceName:'WorkBuddy',port:8647,credential:'BRIDGEPP_WORKBUDDY_KEY',providerId:'bridgepp_workbuddy'}});
export const SERVICE_PROFILES=['dsh','kimi','codex'];
export function serviceDefinition(id){if(!Object.hasOwn(SERVICE_DEFINITIONS,id))throw new Error('未知模型源服务');return SERVICE_DEFINITIONS[id];}
export function validateServiceSettings(value){if(!Number.isInteger(value.port)||value.port<1024||value.port>65535)throw new Error('端口必须介于 1024 与 65535');if(!SERVICE_PROFILES.includes(value.defaultProfile))throw new Error('请选择 DSH、Kimi 或 Codex 客户端配置');if(value.autostart!==undefined&&typeof value.autostart!=='boolean')throw new Error('无效开机启动设置');return value;}
const slug=name=>String(name).normalize('NFKC').toLowerCase().replace(/[^a-z0-9.]+/g,'-').replace(/^-+|-+$/g,'');
const windowSuffix=n=>n%1000000===0?`${n/1000000}m`:n%1000===0?`${n/1000}k`:String(n);
const windowLabel=n=>n%1000000===0?`${n/1000000}M`:n%1000===0?`${n/1000}K`:String(n);
export function serviceCatalog(models,source,registry={}){
  const active=models.filter(m=>m.source===source&&m.enabled!==false&&m.tools!==false).sort((a,b)=>a.id.localeCompare(b.id));
  const rows=active.flatMap(model=>{const contexts=[...new Set(model.contexts.map(c=>c.tokens))];return (contexts.length?contexts:[model.contextMaximum??null]).map(context=>({model,context,key:JSON.stringify([source,model.id,context])}));});
  const candidates=rows.map(row=>({row,id:source==='workbuddy'?row.model.id:(slug(row.model.name)||row.model.id)+(row.context?'-'+windowSuffix(row.context):'')}));
  const used=new Set(Object.values(registry));
  for(const {row,id}of candidates){
    if(registry[row.key])continue;
    const collides=candidates.filter(x=>x.id===id).length>1;
    let chosen=!collides&&!used.has(id)?id:row.model.id+(source==='qoder'&&row.context?'-'+windowSuffix(row.context):'');
    if(used.has(chosen)){let n=2;while(used.has(chosen+'-'+n))n++;chosen+='-'+n;}
    registry[row.key]=chosen;used.add(chosen);
  }
  return rows.map(({model,context,key})=>({model,variant:{id:registry[key],upstreamId:model.id,identity:model.identity,name:model.name+(context&&rows.some(row=>row.model===model&&row.context!==context)?` (${windowLabel(context)})`:''),contextWindow:context,maxTokens:model.maxOutputTokens??32000,efforts:model.reasoning,modelKey:model.key},selection:{modelKey:model.key,identity:model.identity,contextTokens:context,contextBudget:null}}));
}
export function publicServiceModel({model,variant},owner){return {id:variant.id,object:'model',owned_by:owner,name:variant.name,context_window:variant.contextWindow,max_tokens:variant.maxTokens,reasoning_efforts:model.reasoning,default_reasoning_effort:model.defaultReasoning??null,input_modalities:['text',...(model.images===true?['image']:[])],upstream:{source:model.source,id:model.id,name:model.name}};}
