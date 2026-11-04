import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
/** PID existence is insufficient after restart. Query only a fixed numeric PID,
 * using process creation time and image path; never terminate a recovered PID. */
export async function processIdentity(pid){
  if(!Number.isSafeInteger(pid)||pid<=0)throw new Error('Invalid process identity');
  if(process.platform!=='win32')throw new Error('Process identity lookup is unavailable on this platform');
  const script=`$ErrorActionPreference='Stop'; $p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if($null -eq $p){'null'}else{@{pid=$p.Id;started=$p.StartTime.ToUniversalTime().ToString('o');executable=$p.Path}|ConvertTo-Json -Compress}`;
  const {stdout}=await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:10000,maxBuffer:16384});
  const value=JSON.parse(stdout.replace(/^\uFEFF/,''));
  if(value!==null&&(!value.started||!value.executable||value.pid!==pid))throw new Error('Native process identity could not be verified');
  return value;
}
export const sameProcess=(a,b)=>!!a&&!!b&&a.pid===b.pid&&a.started===b.started&&a.executable?.toLowerCase()===b.executable?.toLowerCase();
