import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {launch,JsonLines,stopProcess} from '../core/process.mjs';
import {WorkerLog} from './worker-log.mjs';
import {providerEnvironmentPatch} from './provider-environment.mjs';

/** A persistent worker per source/runtime isolates prompts, SDK sessions and replay caches. */
export class BridgeWorkers {
  constructor({node,script,cwd,dataRoot,catalog,metadataOnly=false,components=null}){Object.assign(this,{node,script,cwd,dataRoot,catalog,metadataOnly,components});this.entries=new Map();this.retired=new Set();this.closed=false;}
  async ensure(source,runtimeId){
    if(this.closed)throw new Error('Bridge workers are closed');
    const componentEnv=this.components?await this.components.environment(source):{AWB_SOURCE_PACKAGE_DIR:undefined};
    const scope=`${runtimeId}/${source}`,previous=this.entries.get(scope);if(previous)return previous.ready;
    const config=this.catalog(source,runtimeId),child=launch(this.node.command,[...this.node.args,this.script,source,runtimeId],{cwd:this.cwd,stdio:['pipe','pipe','pipe','ipc'],env:{...this.node.env,...providerEnvironmentPatch(),...componentEnv,AWB_METADATA_ONLY:this.metadataOnly?'1':'0',AWB_PROVIDER_DIR:join(this.dataRoot,'providers',source,runtimeId,...this.metadataOnly?[randomUUID()]:[])}});
    const entry={child,revision:config.revision,pending:new Map(),failed:null,syncing:null,active:0};this.entries.set(scope,entry);
    const log=this.metadataOnly?{write(){},async close(){}}:new WorkerLog(join(this.dataRoot,'providers',source,runtimeId,'worker.log'));
    const lines=new JsonLines();child.stdout.on('data',b=>lines.push(b));child.stdout.on('end',()=>lines.end());child.stderr.on('data',b=>log.write(b));child.stderr.on('end',()=>{void log.close();});
    entry.ready=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>entry.fail(new Error('Model source startup timeout')),90000);
      entry.fail=error=>{
        if(entry.failed)return;entry.failed=error;clearTimeout(timer);reject(error);
        for(const p of entry.pending.values()){clearTimeout(p.timer);p.reject(error);}entry.pending.clear();
        if(this.entries.get(scope)===entry)this.entries.delete(scope);
        entry.stopping=stopProcess(child);
        void entry.stopping.then(()=>this.retired.delete(entry));
      };
      lines.on('message',message=>{
        if(message?.type==='ready')try{
          const url=new URL(message.url);
          if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash||typeof message.key!=='string'||!message.key||/[\r\n]/.test(message.key))throw new Error('Invalid owned worker endpoint');
          clearTimeout(timer);entry.url=url.origin;entry.key=message.key;resolve(entry);
        }catch(error){entry.fail(error);}
        else if(message?.type==='error')entry.fail(new Error(message.error??'Bridge initialization failed'));
      });
      lines.on('fault',entry.fail);child.once('error',entry.fail);child.stdin.on('error',entry.fail);
      child.once('close',()=>entry.fail(new Error('Model source process exited')));
      child.on('message',message=>{const pending=entry.pending.get(message?.requestId);if(!pending)return;clearTimeout(pending.timer);entry.pending.delete(message.requestId);message.type==='catalog-updated'?pending.resolve():pending.reject(new Error(message.error??'Catalog update failed'));});
    });
    child.stdin.end(JSON.stringify(config));return entry.ready;
  }
  async sync(source,runtimeId,entry){
    if(entry.failed)throw entry.failed;if(entry.syncing)return entry.syncing;
    const task=(async()=>{
      while(entry.revision!==this.catalog(source,runtimeId).revision){
        const config=this.catalog(source,runtimeId),requestId=randomUUID();
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>{entry.pending.delete(requestId);reject(new Error('Bridge catalog update timed out'));},30000);
          entry.pending.set(requestId,{resolve,reject,timer});
          try{entry.child.send({type:'catalog',requestId,...config},error=>{if(error)entry.fail(error);});}catch(error){entry.fail(error);}
        });entry.revision=config.revision;
      }
    })();entry.syncing=task;
    try{await task;}finally{if(entry.syncing===task)entry.syncing=null;}
  }
  retain(entry){if(entry.failed)throw entry.failed;entry.active++;}
  release(entry){if(!entry)return;entry.active--;if(entry.retired&&entry.active===0)entry.fail(new Error('Model catalog identity updated'));}
  retire(){for(const [scope,entry]of this.entries){this.entries.delete(scope);entry.retired=true;this.retired.add(entry);if(entry.active===0)entry.fail(new Error('Model catalog identity updated'));}}
  async close(){this.closed=true;const entries=[...new Set([...this.entries.values(),...this.retired])];for(const entry of entries)entry.fail(new Error('Bridge workers closed'));await Promise.all(entries.map(entry=>entry.stopping));this.entries.clear();this.retired.clear();}
}
