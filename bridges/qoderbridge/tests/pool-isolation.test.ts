import test from 'node:test';
import assert from 'node:assert/strict';
import type {startup} from '@qodercn-ai/qodercn-agent-sdk';
import {QoderPool} from '../src/pool.js';
import {bridgeFailure} from '../src/failures.js';
const config={auth:'cli' as const,timeout:3000,strategy:'permission' as const,system:'fixture'};
function fixture(stubborn=false){
 const calls:Array<{settings:Record<string,any>;signal:AbortSignal;closed:boolean;queue?:any}>=[];
 const start=(async({options}:any)=>{
  const row:{settings:Record<string,any>;signal:AbortSignal;closed:boolean;queue?:any}={settings:JSON.parse(options.settings),signal:options.abortController.signal,closed:false};calls.push(row);
  const active=stubborn||!row.settings.enabledPlugins['Presentations@qoder-marketplace']&&row.settings.enabledPlugins['Presentations@qoder-marketplace']!==false;
  const plugins=active?[{id:'Presentations@qoder-marketplace'}]:[];
  const skills=active?[{name:'Presentations:pptx',source:'plugin'}]:[];
  return {close(){row.closed=true;},query:(queue:any)=>{row.queue=queue;return {initializationResult:async()=>({skills}),listPlugins:async()=>plugins,applyFlagSettings:async()=>{},reloadPlugins:async()=>({error_count:0}),getContextUsage:async()=>({skills:{count:skills.length,items:skills}}),getAvailableModels:async()=>[{value:'dfmodel',displayName:'DeepSeek Flash'}]};}};
 }) as unknown as typeof startup;
 const pool=new QoderPool({...config,sessionSettings:JSON.stringify({custom:'keep',enabledPlugins:{original:false},skillOverrides:{original:'off'}})},start);
 const open=()=> (pool as unknown as {open():Promise<any>}).open();
 return {pool,calls,open};
}
test('pool discovers plugins and skills, closes first runtime, retries once and retains startup exclusions',async()=>{
 const f=fixture();try{const first=await f.open();assert.equal(f.calls.length,2);assert.equal(f.calls[0]!.closed,true);assert.equal(f.calls[0]!.signal.aborted,true);assert.notEqual(f.calls[0]!.signal,f.calls[1]!.signal);assert.equal((await f.calls[0]!.queue[Symbol.asyncIterator]().next()).done,true);first.queue.close();first.warm.close();first.controller.abort();
 }finally{f.pool.closeAll();}
});
test('pool retry settings preserve existing keys and later openings need no retry',async()=>{
 const f=fixture();try{const first=await f.open();const second=await f.open();assert.equal(f.calls.length,3);assert.deepEqual(f.calls[2]!.settings,{custom:'keep',enabledPlugins:{original:false,'Presentations@qoder-marketplace':false},skillOverrides:{original:'off','Presentations:pptx':'off'}});for(const row of [first,second]){row.queue.close();row.warm.close();row.controller.abort();}}finally{f.pool.closeAll();}
});
test('pool fails closed after one retry and diagnoses isolation failures',async()=>{
 const f=fixture(true);try{await assert.rejects(f.open(),error=>{const e=bridgeFailure({requestId:'fixture',phase:'upstream',accepted:true,cause:error});assert.equal(e.code,'qoder_session_isolation_failed');assert.equal(e.origin,'bridge');assert.match(e.message,/Presentations@qoder-marketplace/);return true;});assert.equal(f.calls.length,2);assert.ok(f.calls.every(r=>r.closed&&r.signal.aborted));}finally{f.pool.closeAll();}
});
test('invalid sessionSettings fail before runtime startup',async()=>{
 for(const settings of ['{broken','[]','null']){let called=false;const pool=new QoderPool({...config,sessionSettings:settings},(async()=>{called=true;}) as unknown as typeof startup);try{await assert.rejects((pool as unknown as {open():Promise<unknown>}).open());assert.equal(called,false);}finally{pool.closeAll();}}
});
