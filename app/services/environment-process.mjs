import {launch,stopProcess} from '../core/process.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {quotePowerShell} from './native-launch.mjs';
const execute=promisify(execFile);
export async function environmentProcess(command,args,{signal,timeoutMs=15000,interactive=false,cwd,env,onChild}={}){
 signal?.throwIfAborted();const child=launch(command,args,{cwd,env,windowsHide:!interactive,...interactive?{stdio:'ignore',detached:true}:{}});onChild?.(child);if(interactive)child.unref();let stdout='',stderr='',timedOut=false;
 child.stdout?.on('data',data=>stdout=(stdout+data).slice(-32768));child.stderr?.on('data',data=>stderr=(stderr+data).slice(-32768));
 const cancel=()=>{void stopProcess(child);},timer=timeoutMs?setTimeout(()=>{timedOut=true;cancel();},timeoutMs):null;signal?.addEventListener('abort',cancel,{once:true});
 try{const result=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,terminationSignal)=>resolve({code,terminationSignal}));});if(signal?.aborted)throw new DOMException('已取消','AbortError');if(timedOut)throw Object.assign(new Error('环境进程检测超时'),{code:'ETIMEDOUT',stderr,stdout});return {...result,stdout,stderr};}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
export async function dshUninstallRegistry({run=execute}={}){
 if(process.platform!=='win32')return [];
 const script="$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);$paths=@('HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*');$rows=@(Get-ItemProperty -Path $paths -ErrorAction SilentlyContinue|Where-Object {$_.DisplayName -like '*DeepSeek Harness*'}|ForEach-Object {@{location=$_.InstallLocation;version=$_.DisplayVersion;page=$_.URLInfoAbout}});ConvertTo-Json -InputObject $rows -Compress";
 const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:8000,maxBuffer:256*1024});const rows=JSON.parse(stdout.replace(/^\uFEFF/,''));return Array.isArray(rows)?rows:[];
}
export async function executableVersion(path,{run=execute}={}){if(process.platform!=='win32')return null;const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);$v=(Get-Item -LiteralPath ${quotePowerShell(path)}).VersionInfo;if($v.ProductVersion){$v.ProductVersion}else{$v.FileVersion}`],{windowsHide:true,timeout:8000,maxBuffer:8192});return stdout.trim()||null;}
export async function dshRunning({run=execute}={}){if(process.platform!=='win32')return false;const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);$p=@(Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue);if($p.Count -gt 0){'true'}else{'false'}"],{windowsHide:true,timeout:8000,maxBuffer:8192});return stdout.trim()==='true';}
