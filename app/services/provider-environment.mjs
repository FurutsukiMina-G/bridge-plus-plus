import {join} from 'node:path';
const workbuddyTiming=['WORKBUDDY_TIMEOUT_MS','WORKBUDDY_IDLE_TIMEOUT_MS','WORKBUDDY_SESSION_IDLE_MS','WORKBUDDY_PREWARM_MS',
  'WORKBUDDY_WARM_DEMAND_MS','WORKBUDDY_MAX_BLANK_WARM','WORKBUDDY_NATIVE_WARM_LIMIT','WORKBUDDY_MAX_WARM'];
/** Isolate standalone bridge settings while allowing bounded timing and prewarm settings. */
export function providerEnvironmentPatch(env=process.env){
  return Object.fromEntries(Object.keys(env).filter(key=>!workbuddyTiming.includes(key.toUpperCase())&&(/^(?:WORKBUDDY_|QODERBRIDGE_|QODER_BRIDGE_)/i.test(key)||/^QODERCNCLI_PATH$/i.test(key))).map(key=>[key,undefined]));
}
export function workbuddyEnvironment(runtime,env=process.env){
  return {LOCALAPPDATA:env.LOCALAPPDATA,APPDATA:env.APPDATA,WORKBUDDY_RUNTIME_DIR:runtime,WORKBUDDY_REPORTS_DIR:join(runtime,'reports'),
    ...Object.fromEntries(workbuddyTiming.map(key=>[key,env[key]]))};
}
