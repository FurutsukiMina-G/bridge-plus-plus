import {join} from 'node:path';
/** Remove standalone bridge overrides when launching our owned workers. Undefined unsets inherited keys. */
export function providerEnvironmentPatch(env=process.env){
  return Object.fromEntries(Object.keys(env).filter(key=>/^(?:WORKBUDDY_|QODERBRIDGE_|QODER_BRIDGE_)/i.test(key)||/^QODERCNCLI_PATH$/i.test(key)).map(key=>[key,undefined]));
}
/** Only OS login locations and this application's private directories configure the copied bridge. */
export function workbuddyEnvironment(runtime,env=process.env){
  return {LOCALAPPDATA:env.LOCALAPPDATA,APPDATA:env.APPDATA,WORKBUDDY_RUNTIME_DIR:runtime,WORKBUDDY_REPORTS_DIR:join(runtime,'reports')};
}
