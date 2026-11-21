const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const bool=(value,fallback)=>typeof value==='boolean'?value:fallback;

export const DEFAULT_STARTUP_PREFERENCES=Object.freeze({
  refreshCatalogOnStart:Object.freeze({qoder:false,workbuddy:false,antigravity:false,services:false}),
  checkEnvironmentsOnStart:false,
  backgroundUpdateChecks:Object.freeze({app:true,environments:true}),
  keepWarmRuntimes:Object.freeze({dsh:false,claude:false,codex:false,kimi:false}),
  keepWarmWorkers:Object.freeze({qoder:false,workbuddy:false}),
  prewarmSources:Object.freeze({qoder:false,workbuddy:false})
});

export const STARTUP_PRESETS=Object.freeze({
  cold:DEFAULT_STARTUP_PREFERENCES,
  balanced:Object.freeze({
    refreshCatalogOnStart:Object.freeze({qoder:false,workbuddy:false,antigravity:false,services:false}),
    checkEnvironmentsOnStart:false,
    backgroundUpdateChecks:Object.freeze({app:true,environments:true}),
    keepWarmRuntimes:Object.freeze({dsh:true,claude:true,codex:true,kimi:true}),
    keepWarmWorkers:Object.freeze({qoder:true,workbuddy:true}),
    prewarmSources:Object.freeze({qoder:false,workbuddy:false})
  }),
  warm:Object.freeze({
    refreshCatalogOnStart:Object.freeze({qoder:true,workbuddy:true,antigravity:true,services:true}),
    checkEnvironmentsOnStart:true,
    backgroundUpdateChecks:Object.freeze({app:true,environments:true}),
    keepWarmRuntimes:Object.freeze({dsh:true,claude:true,codex:true,kimi:true}),
    keepWarmWorkers:Object.freeze({qoder:true,workbuddy:true}),
    prewarmSources:Object.freeze({qoder:true,workbuddy:true})
  })
});

export const COLD_ADAPTER_IDLE_MS=300_000;
export const WARM_ADAPTER_IDLE_MS=600_000;
export const WARM_ADAPTER_MAX_IDLE=4;
export const COLD_WORKER_IDLE_MS=600_000;
export const COLD_BRIDGE_SESSION_IDLE_MS=600_000;
export const WARM_BRIDGE_SESSION_IDLE_MS=3_600_000;

export function normalizeStartupPreferences(value){
  const raw=object(value)?value:{};
  const refresh=object(raw.refreshCatalogOnStart)?raw.refreshCatalogOnStart:{};
  const checks=object(raw.backgroundUpdateChecks)?raw.backgroundUpdateChecks:{};
  const runtimes=object(raw.keepWarmRuntimes)?raw.keepWarmRuntimes:{};
  const workers=object(raw.keepWarmWorkers)?raw.keepWarmWorkers:{};
  const prewarm=object(raw.prewarmSources)?raw.prewarmSources:{};
  return {
    refreshCatalogOnStart:{
      qoder:bool(refresh.qoder,DEFAULT_STARTUP_PREFERENCES.refreshCatalogOnStart.qoder),
      workbuddy:bool(refresh.workbuddy,DEFAULT_STARTUP_PREFERENCES.refreshCatalogOnStart.workbuddy),
      antigravity:bool(refresh.antigravity,DEFAULT_STARTUP_PREFERENCES.refreshCatalogOnStart.antigravity),
      services:bool(refresh.services,DEFAULT_STARTUP_PREFERENCES.refreshCatalogOnStart.services)
    },
    checkEnvironmentsOnStart:bool(raw.checkEnvironmentsOnStart,DEFAULT_STARTUP_PREFERENCES.checkEnvironmentsOnStart),
    backgroundUpdateChecks:{
      app:bool(checks.app,DEFAULT_STARTUP_PREFERENCES.backgroundUpdateChecks.app),
      environments:bool(checks.environments,DEFAULT_STARTUP_PREFERENCES.backgroundUpdateChecks.environments)
    },
    keepWarmRuntimes:{
      dsh:bool(runtimes.dsh,DEFAULT_STARTUP_PREFERENCES.keepWarmRuntimes.dsh),
      claude:bool(runtimes.claude,DEFAULT_STARTUP_PREFERENCES.keepWarmRuntimes.claude),
      codex:bool(runtimes.codex,DEFAULT_STARTUP_PREFERENCES.keepWarmRuntimes.codex),
      kimi:bool(runtimes.kimi,DEFAULT_STARTUP_PREFERENCES.keepWarmRuntimes.kimi)
    },
    keepWarmWorkers:{
      qoder:bool(workers.qoder,DEFAULT_STARTUP_PREFERENCES.keepWarmWorkers.qoder),
      workbuddy:bool(workers.workbuddy,DEFAULT_STARTUP_PREFERENCES.keepWarmWorkers.workbuddy)
    },
    prewarmSources:{
      qoder:bool(prewarm.qoder,DEFAULT_STARTUP_PREFERENCES.prewarmSources.qoder),
      workbuddy:bool(prewarm.workbuddy,DEFAULT_STARTUP_PREFERENCES.prewarmSources.workbuddy)
    }
  };
}

const GROUPS={
  refreshCatalogOnStart:['qoder','workbuddy','antigravity','services'],
  backgroundUpdateChecks:['app','environments'],
  keepWarmRuntimes:['dsh','claude','codex','kimi'],
  keepWarmWorkers:['qoder','workbuddy'],
  prewarmSources:['qoder','workbuddy']
};
const TOP_KEYS=new Set(['preset','checkEnvironmentsOnStart',...Object.keys(GROUPS)]);

export const STARTUP_PREFERENCES_VERSION=1;

export function mergeStartupPreferences(current,patch,{explicit=false}={}){
  if(!object(patch))throw new Error('无效的启动与资源配置');
  for(const key of Object.keys(patch))if(!TOP_KEYS.has(key))throw new Error('未知启动配置项：'+key);
  let next=explicit?structuredClone(current??{version:STARTUP_PREFERENCES_VERSION}):normalizeStartupPreferences(current);
  if(patch.preset!==undefined){
    if(typeof patch.preset!=='string'||!Object.hasOwn(STARTUP_PRESETS,patch.preset))throw new Error('未知启动预设');
    next=normalizeStartupPreferences(STARTUP_PRESETS[patch.preset]);
    if(explicit)next.version=STARTUP_PREFERENCES_VERSION;
  }
  if(patch.checkEnvironmentsOnStart!==undefined){
    if(typeof patch.checkEnvironmentsOnStart!=='boolean')throw new Error('无效的环境检测配置');
    next.checkEnvironmentsOnStart=patch.checkEnvironmentsOnStart;
  }
  for(const [group,keys]of Object.entries(GROUPS)){
    if(patch[group]===undefined)continue;
    if(!object(patch[group]))throw new Error('无效的配置分组：'+group);
    for(const [key,val]of Object.entries(patch[group])){
      if(!keys.includes(key)||typeof val!=='boolean')throw new Error(`无效的配置项：${group}.${key}`);
      if(!object(next[group]))next[group]={};
      next[group][key]=val;
    }
  }
  return next;
}

export function runtimeIdlePolicy(preferences,runtimeId){
  const prefs=normalizeStartupPreferences(preferences);
  const keepWarm=Object.hasOwn(prefs.keepWarmRuntimes,runtimeId)?prefs.keepWarmRuntimes[runtimeId]:false;
  return keepWarm
    ?{keepWarm:true,idleMs:WARM_ADAPTER_IDLE_MS,maxIdle:WARM_ADAPTER_MAX_IDLE}
    :{keepWarm:false,idleMs:COLD_ADAPTER_IDLE_MS,maxIdle:0};
}

export function workerIdleMsFor(preferences,source){
  const prefs=normalizeStartupPreferences(preferences);
  return prefs.keepWarmWorkers[source]===true?0:COLD_WORKER_IDLE_MS;
}

export function workerBridgeEnv(preferences,source,baseEnv=process.env){
  const prefs=normalizeStartupPreferences(preferences);
  const prewarm=prefs.prewarmSources[source]===true;
  const keepWarm=prefs.keepWarmWorkers[source]===true;
  const sessionIdle=String(keepWarm?WARM_BRIDGE_SESSION_IDLE_MS:COLD_BRIDGE_SESSION_IDLE_MS);
  if(source==='qoder'){
    return {
      ...(baseEnv.QODER_BLANK_WARM_LIMIT===undefined?{QODER_BLANK_WARM_LIMIT:prewarm?'1':'0'}:{}),
      ...(baseEnv.QODER_NATIVE_WARM_LIMIT===undefined?{QODER_NATIVE_WARM_LIMIT:prewarm?'1':'0'}:{}),
      ...(baseEnv.QODER_SESSION_IDLE_MS===undefined?{QODER_SESSION_IDLE_MS:sessionIdle}:{})
    };
  }
  if(source==='workbuddy'){
    return {
      ...(baseEnv.WORKBUDDY_PREWARM_MS===undefined?{WORKBUDDY_PREWARM_MS:prewarm?'600000':'0'}:{}),
      ...(baseEnv.WORKBUDDY_MAX_BLANK_WARM===undefined?{WORKBUDDY_MAX_BLANK_WARM:prewarm?'1':'0'}:{}),
      ...(baseEnv.WORKBUDDY_NATIVE_WARM_LIMIT===undefined?{WORKBUDDY_NATIVE_WARM_LIMIT:prewarm?'1':'0'}:{}),
      ...(baseEnv.WORKBUDDY_MAX_WARM===undefined?{WORKBUDDY_MAX_WARM:prewarm?'4':'0'}:{}),
      ...(baseEnv.WORKBUDDY_SESSION_IDLE_MS===undefined?{WORKBUDDY_SESSION_IDLE_MS:sessionIdle}:{})
    };
  }
  return {};
}

export function workerConfigKey(preferences,source){
  const prefs=normalizeStartupPreferences(preferences);
  return `${source}:prewarm=${prefs.prewarmSources[source]?1:0}:keep=${prefs.keepWarmWorkers[source]?1:0}`;
}
