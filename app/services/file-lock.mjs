import {open,readFile,rm} from 'node:fs/promises';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const alive=pid=>{try{process.kill(pid,0);return true;}catch(error){return error.code!=='ESRCH';}};
export async function withFileLock(lock,action,{pidAlive=alive,lockTimeoutMs=0,timeoutMessage='等待文件锁超时'}={}){
 const started=Date.now();let handle;
 for(let n=0;;n++){
  try{handle=await open(lock,'wx',0o600);await handle.writeFile(`${process.pid}\n`);break;}catch(error){
   if(error.code!=='EEXIST')throw error;
   const pid=Number((await readFile(lock,'utf8').catch(()=>'')).trim());
   if(Number.isSafeInteger(pid)&&pid>0&&!pidAlive(pid)){await rm(lock,{force:true});continue;}
   if(Date.now()-started>=lockTimeoutMs)throw new Error(timeoutMessage);await delay(Math.min(200,25*2**n));
  }
 }
 try{return await action();}finally{await handle.close();await rm(lock,{force:true});}
}
