import {fileURLToPath} from 'node:url';
import {dirname, resolve, join} from 'node:path';
import {homedir} from 'node:os';
import {existsSync} from 'node:fs';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function config(env=process.env) {
  const candidates=[env.LOCALAPPDATA&&join(env.LOCALAPPDATA,'CodeBuddyExtension/Data/Public/auth/workbuddy-desktop.info'),join(homedir(),'AppData/Local/CodeBuddyExtension/Data/Public/auth/workbuddy-desktop.info'),env.APPDATA&&join(env.APPDATA,'CodeBuddyExtension/Data/Public/auth/workbuddy-desktop.info')].filter(Boolean);
  const number=(key, fallback,min,max)=>{const n=Number(env[key]??fallback);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error(`Invalid ${key}`);return n;};
  const toolMode=env.WORKBUDDY_TOOL_MODE??'native';if(!['native','replay','json'].includes(toolMode))throw new Error('Invalid WORKBUDDY_TOOL_MODE');
  const prunedHistoryReuseRatio=Number(env.WORKBUDDY_PRUNED_HISTORY_REUSE_RATIO??0.6);if(!Number.isFinite(prunedHistoryReuseRatio)||prunedHistoryReuseRatio<0||prunedHistoryReuseRatio>1)throw new Error('Invalid WORKBUDDY_PRUNED_HISTORY_REUSE_RATIO');
  return {version:'0.3.2',toolMode,prunedHistoryReuseRatio,root:ROOT,runtime:resolve(env.WORKBUDDY_RUNTIME_DIR??join(ROOT,'.runtime')),reports:resolve(env.WORKBUDDY_REPORTS_DIR??join(ROOT,'reports')),cliPath:env.WORKBUDDY_CLI,
    authFile:env.WORKBUDDY_AUTH_FILE??candidates.find(existsSync)??candidates[0],
    upstreamModel:env.WORKBUDDY_MODEL??'deepseek-v4.1-flash',
    port:number('WORKBUDDY_PORT',8647,1024,65535),timeoutMs:number('WORKBUDDY_TIMEOUT_MS',1200000,1000,1800000),
    // Silence while the model request is in flight; the total deadline stays the hard cap.
    idleTimeoutMs:number('WORKBUDDY_IDLE_TIMEOUT_MS',180000,10000,1800000),
    concurrency:number('WORKBUDDY_CONCURRENCY',3,1,16),queueLimit:32,bodyLimit:32*1024*1024,heartbeatMs:10000,
    maxSessions:number('WORKBUDDY_MAX_SESSIONS',24,1,64),sessionIdleMs:number('WORKBUDDY_SESSION_IDLE_MS',3600000,60000,86400000),
    nativeResultCharLimit:number('WORKBUDDY_NATIVE_RESULT_CHAR_LIMIT',40000,1,49999),nativeMaxTurns:number('WORKBUDDY_NATIVE_MAX_TURNS',100000,2,1000000),nativeInvalidRounds:number('WORKBUDDY_NATIVE_INVALID_ROUNDS',3,1,10),nativeWarmLimit:number('WORKBUDDY_NATIVE_WARM_LIMIT',1,0,1),
    replayMs:number('WORKBUDDY_REPLAY_MS',120000,0,600000),decisionRetries:number('WORKBUDDY_DECISION_RETRIES',2,0,2),
    prewarmMs:number('WORKBUDDY_PREWARM_MS',120000,0,600000),maxWarm:number('WORKBUDDY_MAX_WARM',4,0,16),maxBlankWarm:number('WORKBUDDY_MAX_BLANK_WARM',1,0,1)};
}
