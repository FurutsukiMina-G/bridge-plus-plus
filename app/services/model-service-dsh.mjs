import {randomUUID} from 'node:crypto';
import {dshEfforts} from './dsh-host.mjs';
import {pruneServiceBackups} from './model-service-backups.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const value=row=>{const result={...row?.section,...row?.user};if(row?.section?.providers||row?.user?.providers)result.providers={...row?.section?.providers,...row?.user?.providers};return result;};
function reasoning(efforts){if(!efforts.some(e=>!['none','off'].includes(e)))return false;const result=dshEfforts(efforts);if(result.off&&!['none','off'].includes(result.off)){const slot=['minimal','low','medium','high','xhigh','max'].find(key=>!Object.hasOwn(result,key));if(!slot)throw new Error('DSH 无法表示此模型的全部思考档位');result[slot]=result.off;delete result.off;}return result;}
function replacement(oldId,oldProvider,models,source){
  const old=oldProvider?.models?.find(m=>m.id===oldId),suffix=/(?:^|-)(\d+)([mk])$/i.exec(oldId),context=old?.contextWindow??(suffix?Number(suffix[1])*(suffix[2].toLowerCase()==='m'?1000000:1000):null);
  const candidates=models.filter(m=>context==null||m.context_window===context),aliases={};
  if(source==='qoder'){aliases['deepseek-flash']='dfmodel';aliases['deepseek-pro']='dmodel';aliases['kimi-k3.1-pro']='kmodel_latest';}
  const stripped=oldId.replace(/^(?:qoder|workbuddy)-/,'').replace(/-\d+[mk]$/i,''),upstream=old?.upstream?.id??old?.upstreamId??aliases[stripped];
  const exact=candidates.find(m=>upstream&&m.upstream.id===upstream)||candidates.find(m=>m.id===oldId.replace(/^(?:qoder|workbuddy)-/,''));
  return {model:exact??models[0],matched:!!exact};
}
export async function connectServiceDsh({store,models,baseURL,key,rpc,replace=[]}){
  const def=store.definition,allowedOld=def.id==='qoder'?'qoderbridge':'workbuddybridge';
  if(!Array.isArray(replace)||replace.some(id=>id!==allowedOld)||new Set(replace).size!==replace.length)throw new Error('replace 只允许本来源对应的旧 bridge provider');
  if(!models.length)throw new Error('模型服务目录为空，请先刷新模型');
  if(models.some(m=>!Number.isSafeInteger(m.context_window)||m.context_window<=0))throw new Error('目录含未声明上下文窗口的模型，无法如实注册 DSH；请刷新并核实目录');
  const described=await rpc('settings/describe'),llm=described.namespaces?.find(n=>n.ns==='llm-pi-ai'),defaults=described.namespaces?.find(n=>['agent-default-model','dsh-agent-default-model'].includes(n.ns));
  if(described.writable!==true||!llm)throw new Error('DSH 桌面 RPC 设置不可写，未修改 provider');
  if(replace.length&&!defaults)throw new Error('无法核实 DSH 默认模型，未替换旧 provider');
  const previous=value(llm).providers??{},oldDefault=value(defaults),priorConnection=await store.read('dsh-owner.json')??await store.read('dsh.json'),existing=previous[def.providerId],url=baseURL+'/dsh/v1';
  if(existing&&(existing.api!=='openai-completions'||existing.apiKeyEnv!==def.credential||existing.displayName!==def.name||![url,priorConnection?.baseURL].includes(existing.baseURL)))throw new Error('DSH 已有同名但不属于本服务的 provider，未覆盖');
  if(Object.entries(previous).some(([id,p])=>id!==def.providerId&&p.apiKeyEnv===def.credential))throw new Error('本服务凭据引用已被其他 DSH provider 使用，未覆盖');
  for(const id of replace){const p=previous[id];if(p&&p.apiKeyEnv!==(def.id==='qoder'?'QODERBRIDGE_LOCAL_KEY':'WORKBUDDYBRIDGE_LOCAL_KEY'))throw new Error('替换目标不是已核实的旧 bridge provider');}
  const configured=models.map(m=>({id:m.id,name:m.name,contextWindow:m.context_window,maxTokens:m.max_tokens,input:m.input_modalities,reasoningEfforts:reasoning(m.reasoning_efforts)}));
  const provider={displayName:def.name,apiKeyEnv:def.credential,api:'openai-completions',baseURL:url,compat:{supportsDeveloperRole:false,supportsReasoningEffort:true,supportsUsageInStreaming:true,maxTokensField:'max_tokens',supportsLongCacheRetention:true},cacheRetention:'long',models:configured};
  const backup=`dsh-before-${Date.now()}-${randomUUID()}.json`;await store.write(backup,{providerId:def.providerId,provider:existing??null,oldProviders:Object.fromEntries(replace.map(id=>[id,previous[id]??null])),defaultNamespace:defaults?.ns??null,defaultModel:oldDefault,revisions:{llm:llm.revision,default:defaults?.revision}});await pruneServiceBackups(store,'dsh');
  const changes=[];let defaultMigration=null;
  try{
  await rpc('credentials/set',{ref:def.credential,value:key});
  changes.push('更新本服务凭据引用');
  await rpc('settings/mutate',{ns:'llm-pi-ai',expectedRevision:llm.revision,ops:[{op:'set',path:['providers',def.providerId],value:provider}]});
  changes.push(`注册 ${def.providerId}（${models.length} 个模型）`);
  const catalog=await rpc('session/modelCatalog'),group=catalog.groups?.find(g=>g.id===def.providerId);
  if(!group||!models.every(m=>group.models?.some(x=>x.id===m.id)))throw new Error('DSH 新 provider 的模型目录未核对成功；旧 provider 未删除，已保存备份 '+backup);
  changes.push('核对新 provider 模型目录');
  if(replace.length){
    const current=await rpc('settings/describe'),currentLlm=current.namespaces?.find(n=>n.ns==='llm-pi-ai'),currentDefault=current.namespaces?.find(n=>n.ns===defaults.ns);
    if(!current.writable||!currentLlm||!currentDefault||replace.some(id=>!same(value(currentLlm).providers?.[id],previous[id]))||!same(value(currentDefault),oldDefault))throw new Error('DSH 设置已并发变化；新 provider 已注册，未删除旧 provider。备份 '+backup);
    if(replace.includes(oldDefault.provider)){
      const selected=replacement(oldDefault.model,previous[oldDefault.provider],models,def.source);defaultMigration={from:{provider:oldDefault.provider,model:oldDefault.model},to:{provider:def.providerId,model:selected.model.id},matched:selected.matched,reasoningEffort:oldDefault.reasoningEffort??null};
      await rpc('settings/mutate',{ns:defaults.ns,expectedRevision:currentDefault.revision,ops:[{op:'set',path:['provider'],value:def.providerId},{op:'set',path:['model'],value:selected.model.id}]});changes.push('迁移默认模型（保留原思考档位）');
    }
    const removals=replace.filter(id=>previous[id]).map(id=>({op:'unset',path:['providers',id]}));if(removals.length)await rpc('settings/mutate',{ns:'llm-pi-ai',expectedRevision:currentLlm.revision,ops:removals});changes.push(...replace.filter(id=>previous[id]).map(id=>'删除 '+id));
  }
  const connectedAt=new Date().toISOString();await store.write('dsh-owner.json',{providerId:def.providerId,baseURL:url});await store.write('dsh.json',{providerId:def.providerId,baseURL:url,connectedAt});
  return {providerId:def.providerId,requestedProviderId:def.name,displayName:def.name,idAdjusted:true,idReason:'DSH 的凭据记录 provider 标识要求小写安全段，使用安全 provider id，显示名保持原名。',connectedAt,applied:'hot-reload',backup,changes,defaultMigration};
  }catch(error){
    const rollbackErrors=[],clean=value=>String(value?.message??value??'RPC 失败').replaceAll(key,'[redacted]'),attempt=async(label,operation)=>{try{await operation();}catch(failure){rollbackErrors.push(label+'：'+clean(failure));}};let current=null;
    await attempt('读取当前设置',async()=>{current=await rpc('settings/describe');});const currentLlm=current?.namespaces?.find(n=>n.ns==='llm-pi-ai');
    if(currentLlm){const rows=[{id:def.providerId,value:existing??null},...replace.map(id=>({id,value:previous[id]??null}))];await attempt('恢复 provider',()=>rpc('settings/mutate',{ns:'llm-pi-ai',expectedRevision:currentLlm.revision,ops:rows.map(row=>({op:row.value===null?'unset':'set',path:['providers',row.id],...row.value===null?{}:{value:row.value}}))}));}
    if(defaultMigration&&defaults){const currentDefault=current?.namespaces?.find(n=>n.ns===defaults.ns);if(currentDefault)await attempt('恢复默认模型',()=>rpc('settings/mutate',{ns:defaults.ns,expectedRevision:currentDefault.revision,ops:[{op:'set',path:['provider'],value:oldDefault.provider},{op:'set',path:['model'],value:oldDefault.model}]}));}
    if(!existing)await attempt('删除新增凭据引用',()=>rpc('credentials/unset',{ref:def.credential}));
    throw new Error(`DSH 接入未完整完成：${clean(error)}；已完成：${changes.join('、')||'无设置修改'}；${rollbackErrors.length?'以下项目未能回滚：'+rollbackErrors.join('；'):'已回滚到原设置'}。备份：${backup}`);
  }
}

export async function disconnectServiceDsh({store,rpc}){const def=store.definition,record=await store.read('dsh-owner.json')??await store.read('dsh.json');if(!record)return {target:'dsh',changed:false,backup:null,message:'尚未接入'};const described=await rpc('settings/describe'),llm=described.namespaces?.find(n=>n.ns==='llm-pi-ai'),defaults=described.namespaces?.find(n=>['agent-default-model','dsh-agent-default-model'].includes(n.ns)),oldDefault=value(defaults);if(oldDefault.provider===def.providerId)throw new Error('DSH 的默认模型正在使用这个接口，请先在 DSH 里换一个默认模型');if(described.writable!==true||!llm)throw new Error('DSH 桌面 RPC 设置不可写，未断开 provider');const existing=value(llm).providers?.[def.providerId];if(existing&&(existing.api!=='openai-completions'||existing.apiKeyEnv!==def.credential||existing.displayName!==def.name||existing.baseURL!==record.baseURL))throw new Error('DSH 同名 provider 不属于本服务，未断开');const backup=`dsh-before-${Date.now()}-${randomUUID()}.json`;await store.write(backup,{providerId:def.providerId,provider:existing??null,defaultNamespace:defaults?.ns??null,defaultModel:oldDefault,revisions:{llm:llm.revision,default:defaults?.revision}});await pruneServiceBackups(store,'dsh');if(existing)await rpc('settings/mutate',{ns:'llm-pi-ai',expectedRevision:llm.revision,ops:[{op:'unset',path:['providers',def.providerId]}]});await rpc('credentials/unset',{ref:def.credential});await store.write('dsh-owner.json',null);await store.write('dsh.json',null);return {target:'dsh',changed:true,backup,message:'已断开 DSH 接入并删除本服务凭据引用'};}
