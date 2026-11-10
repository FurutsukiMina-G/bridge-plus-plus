import {spawn,execFile} from 'node:child_process';
import {EventEmitter} from 'node:events';
import {StringDecoder} from 'node:string_decoder';
import {failureText} from '../services/failure-details.mjs';

export function childEnvironment(extra={}){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;return {...env,...extra};}
export function exactChildEnvironment(extra={}){const env={...extra};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;return env;}
export function launch(command,args=[],options={}){
  if(!command||!Array.isArray(args)||args.some(a=>typeof a!=='string'||a.includes('\0')))throw new Error('Invalid native process arguments');
  const {exactEnv=false,...spawnOptions}=options,env=exactEnv?exactChildEnvironment(options.env??{}):childEnvironment(options.env??{});
  return spawn(command,args,{windowsHide:true,shell:false,stdio:['pipe','pipe','pipe'],...spawnOptions,env});
}
export async function stopProcess(child){if(!child||!Number.isSafeInteger(child.pid)||child.exitCode!==null||child.signalCode)return;await new Promise(resolve=>{
  if(process.platform==='win32'){
    let settled=false;const done=()=>{if(settled)return;settled=true;clearTimeout(timer);resolve();};
    const timer=setTimeout(done,12000);child.once('close',done);
    execFile('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,timeout:10000},()=>{
      // Restricted Windows sessions can deny taskkill's process enumeration even
      // for our own child. Keep using the owned process handle, never a PID scan.
      if(child.exitCode===null&&!child.signalCode)try{child.kill();}catch{}
      if(child.exitCode!==null||child.signalCode)done();
    });
  }
  else{child.kill('SIGTERM');const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},1500);child.once('exit',()=>{clearTimeout(timer);resolve();});}
});}
export class JsonLines extends EventEmitter {
  constructor(maxBytes=4*1024*1024){super();this.buffer='';this.decoder=new StringDecoder('utf8');this.maxBytes=maxBytes;}
  push(data){this.buffer+=Buffer.isBuffer(data)?this.decoder.write(data):data;let index;while((index=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,index).replace(/\r$/,'');this.buffer=this.buffer.slice(index+1);this.line(line);}if(Buffer.byteLength(this.buffer)>this.maxBytes){this.buffer='';this.emit('fault',new Error(`Native event exceeds ${this.maxBytes} bytes`));}}
  line(line){if(!line.trim())return;if(Buffer.byteLength(line)>this.maxBytes){this.emit('fault',new Error('Native event exceeds size limit'));return;}let message;try{message=JSON.parse(line);}catch{this.emit('text',line);return;}this.emit('message',message);}
  end(){this.buffer+=this.decoder.end();if(this.buffer)this.line(this.buffer);this.buffer='';}
}
export class RpcProcess extends EventEmitter {
  constructor(child,{jsonrpc=false,timeoutMs=60000,maxEventBytes=4*1024*1024}={}){super();this.child=child;this.jsonrpc=jsonrpc;this.timeoutMs=timeoutMs;this.pending=new Map();this.seq=0;this.closedError=null;this.stderr='';const lines=new JsonLines(maxEventBytes);child.stdout.on('data',b=>lines.push(b));child.stdout.on('end',()=>lines.end());lines.on('message',m=>this.receive(m));lines.on('text',text=>this.emit('log',text));lines.on('fault',e=>{this.fail(e);void stopProcess(child);});child.stderr.setEncoding?.('utf8');child.stderr.on('data',b=>{this.stderr=(this.stderr+String(b)).slice(-12000);this.emit('log',String(b));});child.stdin.on('error',e=>this.fail(e));child.on('error',e=>this.fail(e));child.on('close',(code,signal)=>{this.fail(new Error(`原生进程已退出（退出码 ${code??'未知'}${signal?'，信号 '+signal:''}）${this.stderr?'；stderr：'+failureText(this.stderr,12000).slice(-800):''}`));this.emit('exit',{code,signal});});}
  receive(message){if(!message||typeof message!=='object'||Array.isArray(message))return;if(message.id!==undefined&&!message.method){const pending=this.pending.get(message.id);if(pending){clearTimeout(pending.timer);this.pending.delete(message.id);message.error?pending.reject(Object.assign(new Error(message.error.message??'Native RPC error'),{rpcRejected:true})):pending.resolve(message.result);}}else if(typeof message.method==='string')this.emit('message',message);}
  send(message){if(this.closedError)throw this.closedError;if(this.child.stdin.destroyed)throw new Error('Native connection is closed');this.child.stdin.write(JSON.stringify({...this.jsonrpc?{jsonrpc:'2.0'}:{},...message})+'\n',error=>{if(error)this.fail(error);});}
  notify(method,params={}){this.send({method,params});}
  request(method,params={},timeoutMs=this.timeoutMs){const id=++this.seq;return new Promise((resolve,reject)=>{const timer=timeoutMs?setTimeout(()=>{this.pending.delete(id);reject(new Error(`Native RPC timeout: ${method}`));},timeoutMs):null;this.pending.set(id,{resolve,reject,timer});try{this.send({id,method,params});}catch(e){this.pending.delete(id);clearTimeout(timer);reject(e);}});}
  respond(id,result){this.send({id,result});}
  reject(id,message='Unsupported client operation'){this.send({id,error:{code:-32601,message}});}
  fail(error){if(this.closedError)return;this.closedError=error;for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(error);}this.pending.clear();this.emit('closed',error);}
  close(){this.fail(new Error('Native connection closed'));return this.closing??=stopProcess(this.child);}
}
