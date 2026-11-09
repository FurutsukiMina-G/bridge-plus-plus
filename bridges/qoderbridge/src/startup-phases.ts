import {ProcessTransport,WorkerTransport,DEFAULT_RUNTIME_TRANSPORT,type Options,type Transport,type QueryTransportProvider} from '@qodercn-ai/qodercn-agent-sdk';
import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export type StartupAttempt={attempt:number;transport_kind:string;transport_initialize_ms:number|null;sdk_startup_ms:number;sdk_initialize_ms:null|number;initialization_result_ms:number;isolate_ms:number;get_available_models_ms:number;total_ms:number;isolation_retry:boolean;memory:{rss_bytes:number|null;private_bytes:number|null;source:string}};
export const DISABLED_RUNTIME_MEMORY={rss_bytes:null,private_bytes:null,source:'disabled'} as const;
export const startupMemoryEnabled=(env:NodeJS.ProcessEnv=process.env)=>env.QODER_BRIDGE_STARTUP_MEMORY==='1'||env.QODERBRIDGE_STARTUP_MEMORY==='1';
/** Only sample the PID returned by this runtime's public transport when explicitly enabled. Never enumerate services. */
export async function runtimeMemory(pid:number|undefined,deps:{env?:NodeJS.ProcessEnv;exec?:typeof exec;timeoutMs?:number}={}){
  if(!startupMemoryEnabled(deps.env))return {...DISABLED_RUNTIME_MEMORY};
  if(!Number.isSafeInteger(pid)||pid!<=0)return {rss_bytes:null,private_bytes:null,source:'runtime_pid_unavailable'};
  try{
    if(process.platform==='win32'){
      const run=deps.exec??exec,{stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$p=Get-Process -Id ${pid} -ErrorAction Stop;@{rss_bytes=$p.WorkingSet64;private_bytes=$p.PrivateMemorySize64}|ConvertTo-Json -Compress`],{windowsHide:true,timeout:deps.timeoutMs??500,maxBuffer:2048});
      const value=JSON.parse(String(stdout).replace(/^\uFEFF/,''));if(!Number.isSafeInteger(value.rss_bytes)||value.rss_bytes<0||!Number.isSafeInteger(value.private_bytes)||value.private_bytes<0)throw new Error('Invalid process memory');return {rss_bytes:value.rss_bytes,private_bytes:value.private_bytes,source:'owned_process_working_set'};
    }
    const text=await readFile(`/proc/${pid}/status`,'utf8'),rss=/^VmRSS:\s+(\d+)\s+kB/m.exec(text);return {rss_bytes:rss?Number(rss[1])*1024:null,private_bytes:null,source:'owned_process_proc_status'};
  }catch{return {rss_bytes:null,private_bytes:null,source:'runtime_memory_unavailable'};}
}
export function startupTransport(options:Options,phase:StartupAttempt,provider:QueryTransportProvider|undefined=options.transport){
  const selected=provider??(options.pathToQoderCLIExecutable?ProcessTransport.default:DEFAULT_RUNTIME_TRANSPORT==='worker'?WorkerTransport.default:ProcessTransport.default);
  phase.transport_kind=provider?'injected':options.pathToQoderCLIExecutable?'process':DEFAULT_RUNTIME_TRANSPORT;
  let pid:number|undefined;
  options.transport={create(launch){const transport=selected.create(launch) as Transport&{pid?:number};return {
    get pid(){return transport.pid;},
    async initialize(){const start=performance.now();try{await transport.initialize();pid=transport.pid;}finally{phase.transport_initialize_ms=performance.now()-start;}},
    write:data=>transport.write(data),readMessages:()=>transport.readMessages(),isReady:()=>transport.isReady(),endInput:()=>transport.endInput(),close:()=>transport.close(),
  };}};
  return ()=>pid;
}
