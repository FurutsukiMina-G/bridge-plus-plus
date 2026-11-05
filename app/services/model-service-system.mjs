import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {chmod,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {serviceDefinition} from './model-service-catalog.mjs';
import {redactSecrets} from './redact-secrets.mjs';
import {quotePowerShell} from './native-launch.mjs';
export const systemExec=promisify(execFile);
const outputText=value=>{if(typeof value==='string')return value.replace(/^\uFEFF/,'');if(!value)return '';if(value[0]===255&&value[1]===254)return value.toString('utf16le').replace(/^\uFEFF/,'');const text=value.toString('utf8');return text.includes('\uFFFD')?new TextDecoder('gb18030').decode(value):text;};
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
// schtasks may emit literal quotes. Decode once so entity-like folder names stay literal.
const unxml=value=>value.replace(/&(?:quot|apos|amp|lt|gt|#\d+|#x[0-9a-fA-F]+);/g,entity=>{const named={'&quot;':'"','&apos;':"'",'&amp;':'&','&lt;':'<','&gt;':'>'};if(Object.hasOwn(named,entity))return named[entity];const hex=entity.startsWith('&#x'),code=Number.parseInt(entity.slice(hex?3:2,-1),hex?16:10);return Number.isInteger(code)&&code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):entity;});
export const quoteWindowsArg=value=>'"'+String(value).replace(/(\\*)"/g,'$1$1\\"').replace(/(\\+)$/,'$1$1')+'"';
export function hiddenLauncher(spec,{wait=true}={}){const command=[spec.command,...spec.args].map(quoteWindowsArg).join(' '),prefix='Option Explicit\r\nDim shell, code'+(wait?', failures, started':'')+'\r\nSet shell = CreateObject("WScript.Shell")\r\n'+Object.entries(spec.env??{}).map(([k,v])=>`shell.Environment("PROCESS")("${k.replaceAll('"','""')}") = "${String(v).replaceAll('"','""')}"\r\n`).join('')+`shell.CurrentDirectory = "${spec.cwd.replaceAll('"','""')}"\r\n`;if(!wait)return prefix+`code = shell.Run("${command.replaceAll('"','""')}", 0, False)\r\nWScript.Quit code\r\n`;return prefix+`failures = 0\r\nDo\r\nstarted = Now\r\ncode = shell.Run("${command.replaceAll('"','""')}", 0, True)\r\nIf code = 0 Then Exit Do\r\nIf DateDiff("n", started, Now) >= 10 Then failures = 0\r\nfailures = failures + 1\r\nIf failures >= 5 Then Exit Do\r\nWScript.Sleep 60000\r\nLoop\r\nWScript.Quit code\r\n`;}
export async function protectServiceDirectory(path,{execute=systemExec,platform=process.platform}={}){
  if(platform!=='win32'){await chmod(path,0o700);return;}
  // Read and modify only Access (DACL); a new descriptor can also write SACL,
  // which requires SeSecurityPrivilege even when the caller owns the directory.
  const script=`$ErrorActionPreference='Stop';$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User;$item=Get-Item -LiteralPath ${quotePowerShell(path)};$acl=$item.GetAccessControl([Security.AccessControl.AccessControlSections]::Access);$acl.SetAccessRuleProtection($true,$false);foreach($rule in @($acl.GetAccessRules($true,$false,[Security.Principal.SecurityIdentifier]))){[void]$acl.RemoveAccessRuleSpecific($rule)};foreach($identity in @($sid,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){$rule=[Security.AccessControl.FileSystemAccessRule]::new($identity,'FullControl','ContainerInherit,ObjectInherit','None','Allow');[void]$acl.AddAccessRule($rule)};$item.SetAccessControl($acl)`;
  await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:15000});
}
const accountQueries=new WeakMap();
export function currentUserSid(execute=systemExec){
  if(!accountQueries.has(execute)){const task=(async()=>{const {stdout}=await execute('whoami.exe',['/user','/fo','csv','/nh'],{windowsHide:true,timeout:10000,encoding:'buffer'});const sid=outputText(stdout).match(/S-\d+(?:-\d+)+/)?.[0];if(!sid)throw new Error('无法核实当前用户 SID');return sid;})();accountQueries.set(execute,task);task.catch(()=>{if(accountQueries.get(execute)===task)accountQueries.delete(execute);});}
  return accountQueries.get(execute);
}
export function directoryProtected(sddl,userSid){
  const match=/^D:([A-Z]*)(.*)$/.exec(String(sddl??'').trim());if(!match||!match[1].includes('P')||!userSid)return false;
  const aces=match[2].match(/\([^)]*\)/g)??[];if(aces.join('')!==match[2]||aces.length!==2)return false;
  const sids=aces.map(ace=>/^\(A;OICI;FA;;;([^)]+)\)$/.exec(ace)?.[1]);if(sids.some(sid=>!sid))return false;
  return sids.filter(sid=>sid===userSid).length===1&&sids.filter(sid=>sid==='SY'||sid==='S-1-5-18').length===1;
}
export async function ensureServiceDirectoryProtected(path,{execute=systemExec,platform=process.platform,account=()=>currentUserSid(execute),protect=protectServiceDirectory}={}){
  if(platform!=='win32'){return protect(path,{execute,platform});}
  const file=join(tmpdir(),`bridgepp-acl-${randomUUID()}.tmp`);let protectedDirectory=false;
  try{await execute('icacls.exe',[path,'/save',file],{windowsHide:true,timeout:10000});const raw=await readFile(file);const text=raw.toString('utf16le').replace(/^\uFEFF/,'');const sddl=text.split(/\r?\n/)[1]?.trim();protectedDirectory=directoryProtected(sddl,typeof account==='function'?await account():account);}catch{}finally{await rm(file,{force:true}).catch(()=>{});}
  if(!protectedDirectory)await protect(path,{execute,platform});
}
export function serviceError(error,key){
  const message=redactSecrets(String(error?.message??error??'未知启动错误'),key?[key]:[]).replace(/\b[a-f0-9]{64}\b/gi,'[redacted]').replace(/[\r\n\x00-\x1f]+/g,' ').slice(0,2000);
  return {code:/^[A-Z][A-Z0-9_]{0,79}$/.test(error?.code??'')?error.code:'STARTUP_FAILED',message};
}
export async function servicePortOwner(port,{execute=systemExec}={}){
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('无效端口');
  const script=`$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);$c=@(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue);$ids=@($c|Select-Object -ExpandProperty OwningProcess -Unique);if($ids.Count -ne 1){'null'}else{$p=Get-CimInstance Win32_Process -Filter ('ProcessId='+[int]$ids[0]);@{pid=[int]$p.ProcessId;name=[string]$p.Name;executable=[string]$p.ExecutablePath;command=[string]$p.CommandLine}|ConvertTo-Json -Compress}`;
  const {stdout}=await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:15000,maxBuffer:32768});const owner=JSON.parse(stdout.replace(/^\uFEFF/,''));
  if(!owner)return null;return {...owner,command:redactSecrets(String(owner.command??'')).slice(0,700)};
}
// A one-shot task did not rerun after exit code 1 in the 0.1.17 live check;
// RestartOnFailure therefore stays out of the XML and the VBS owns bounded retries.
export function scheduledServiceXml(id,{launcher,account}){const definition=serviceDefinition(id);return `<?xml version="1.0" encoding="UTF-16"?><Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><RegistrationInfo><Description>Bridge++ model-service ${id}</Description></RegistrationInfo><Triggers><LogonTrigger><Enabled>true</Enabled><UserId>${xml(account)}</UserId></LogonTrigger></Triggers><Principals><Principal id="Author"><UserId>${xml(account)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><StartWhenAvailable>true</StartWhenAvailable><Hidden>true</Hidden><ExecutionTimeLimit>PT0S</ExecutionTimeLimit></Settings><Actions Context="Author"><Exec><Command>wscript.exe</Command><Arguments>${xml(quoteWindowsArg(launcher))}</Arguments></Exec></Actions></Task>`;}
export class ServiceTasks {
  constructor({execute=systemExec,account=()=>currentUserSid(execute)}={}){Object.assign(this,{execute,account});}
  async query(id){const def=serviceDefinition(id);try{return outputText((await this.execute('schtasks.exe',['/Query','/TN',def.name,'/XML'],{windowsHide:true,timeout:15000,maxBuffer:1024*1024,encoding:'buffer'})).stdout);}catch(error){if(error.code===1)return null;throw new Error('无法查询当前用户的 Bridge++ 计划任务');}}
  matches(text,id,launcher){const settings=/<Settings>([\s\S]*?)<\/Settings>/.exec(text??'')?.[1]??'',args=/<Arguments>([\s\S]*?)<\/Arguments>/.exec(text??'')?.[1];return !!text&&text.includes(`Bridge++ model-service ${id}`)&&args!==undefined&&unxml(args)===quoteWindowsArg(launcher)&&/<Command>(?:[^<]*[\\/])?wscript\.exe<\/Command>/i.test(text)&&!/<Enabled>false<\/Enabled>/.test(settings);}
  async install(id,file){await this.execute('schtasks.exe',['/Create','/TN',serviceDefinition(id).name,'/XML',file,'/F'],{windowsHide:true,timeout:20000});}
  async run(id){await this.execute('schtasks.exe',['/Run','/TN',serviceDefinition(id).name],{windowsHide:true,timeout:15000});}
  async remove(id){const previous=await this.query(id);if(!previous)return;if(!previous.includes(`Bridge++ model-service ${id}`))throw new Error('同名计划任务不属于 Bridge++，未修改');await this.execute('schtasks.exe',['/Delete','/TN',serviceDefinition(id).name,'/F'],{windowsHide:true,timeout:15000});}
}
