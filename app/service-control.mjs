import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,appendFile,mkdir,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const systemExec=promisify(execFile),services={qoder:'bridge++_qoder',workbuddy:'Bridge++_WorkBuddy'};
const output=value=>{if(typeof value==='string')return value.charCodeAt(0)===0xfeff?value.slice(1):value;if(!value)return '';const text=value[0]===255&&value[1]===254?value.toString('utf16le'):value.toString('utf8');return text.charCodeAt(0)===0xfeff?text.slice(1):text;};
const readJson=async file=>{try{return JSON.parse(await readFile(file,'utf8'));}catch{return null;}};
const alive=pid=>{if(!Number.isSafeInteger(pid)||pid<=0)return false;try{process.kill(pid,0);return true;}catch{return false;}};
const proof=(key,row)=>createHmac('sha256',key).update(JSON.stringify(['bridgepp-identify-v1',row.nonce,row.id,row.instanceId,row.pid,row.baseURL])).digest('hex');
const equal=(actual,expected)=>typeof actual==='string'&&/^[a-f0-9]{64}$/.test(actual)&&timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'));
const sanitized=error=>String(error?.message??error??'未知错误').replace(/[a-f0-9]{64}/gi,'[redacted]').replace(/[\r\n]+/g,' ').slice(0,2000);

export function netstatOwns(text,port,pid){for(const line of String(text).split(/[\r\n]+/g)){const columns=line.trim().split(/\s+/);if(columns.length>=5&&columns[0].toUpperCase()==='TCP'&&columns[1]===`127.0.0.1:${port}`&&columns[2]==='0.0.0.0:0'&&Number(columns.at(-1))===pid)return true;}return false;}

async function identified(state,key,fetchImpl){const nonce=randomBytes(32).toString('hex');try{const response=await fetchImpl(state.baseURL+'/_bridge/identify?nonce='+nonce,{signal:AbortSignal.timeout(1500),redirect:'error'});if(![200,403,404].includes(response.status))return false;if(response.status!==200)return null;const row=await response.json(),identity={nonce,id:state.id,instanceId:state.instanceId,pid:state.pid,baseURL:state.baseURL};return row.kind==='bridgepp-model-service'&&row.id===identity.id&&row.instanceId===identity.instanceId&&row.pid===identity.pid&&row.baseURL===identity.baseURL&&equal(row.proof,proof(key,identity));}catch{return null;}}

async function verified(state,key,{execute,fetchImpl}){const current=await identified(state,key,fetchImpl);if(current===true)return true;if(current===false)return false;try{const {stdout}=await execute('netstat.exe',['-ano','-p','TCP'],{windowsHide:true,timeout:10000,maxBuffer:1024*1024,encoding:'buffer'});const port=new URL(state.baseURL).port;return netstatOwns(output(stdout),port,state.pid);}catch{return false;}}

async function stopOne(id,userData,options){const root=join(userData,'model-services',id),state=await readJson(join(root,'status.json'));if(!state?.baseURL||!['running','starting'].includes(state.status)||!options.pidAlive(state.pid))return {stopped:false,skipped:true};const key=(await readFile(join(root,'service-key'),'utf8')).trim();if(!/^[a-f0-9]{64}$/.test(key)||!await verified(state,key,options))return {stopped:false,skipped:true};
 const response=await options.fetchImpl(state.baseURL+'/_bridge/stop',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000),redirect:'error'});if(!response.ok)throw new Error('模型服务停止请求失败');const deadline=options.now()+options.timeoutMs;for(;;){const current=await readJson(join(root,'status.json'));if(current?.status==='stopped'||!options.pidAlive(state.pid))return {stopped:true};if(options.now()>=deadline)return {stopped:false};await options.delay(100);}}

async function removeTask(id,{execute}){try{const {stdout}=await execute('schtasks.exe',['/Query','/TN',services[id],'/XML'],{windowsHide:true,timeout:15000,maxBuffer:1024*1024,encoding:'buffer'});if(!output(stdout).includes(`Bridge++ model-service ${id}`))return;await execute('schtasks.exe',['/Delete','/TN',services[id],'/F'],{windowsHide:true,timeout:15000});}catch(error){if(error.code===1)return;throw error;}}

export async function serviceControl(args,{userData=process.env.AWB_DATA_DIR||(process.env.APPDATA?join(process.env.APPDATA,'AgentWorkbench'):null),execute=systemExec,fetchImpl=fetch,pidAlive=alive,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,timeoutMs=8000}={}){const options={execute,fetchImpl,pidAlive,delay,now,timeoutMs},log=async error=>{if(!userData)return;try{await mkdir(userData,{recursive:true});await appendFile(join(userData,'service-control.log'),JSON.stringify({at:new Date().toISOString(),error:sanitized(error)})+'\n',{mode:0o600});}catch{}};
 if(!userData)return 0;const [command,flag]=args;if(!['stop-for-upgrade','uninstall'].includes(command)||flag&&flag!=='--delete-data'){await log(new Error('无效服务控制参数'));return 0;}
 for(const id of Object.keys(services)){try{const stopped=await stopOne(id,userData,options);if(command==='stop-for-upgrade'&&stopped.stopped)await writeFile(join(userData,'model-services',id,'resume-after-install.json'),JSON.stringify({at:new Date().toISOString()}),{mode:0o600});if(command==='uninstall')await removeTask(id,options);}catch(error){await log(error);}}
 if(command==='uninstall'&&flag==='--delete-data')try{await rm(userData,{recursive:true,force:true});}catch(error){await log(error);}return 0;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))try{process.exitCode=await serviceControl(process.argv.slice(2));}catch{process.exitCode=0;}
