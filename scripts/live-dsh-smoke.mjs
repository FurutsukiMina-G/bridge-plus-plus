import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../app/core/store.mjs';
import {ProviderService} from '../app/services/providers.mjs';
import {Gateway} from '../app/services/gateway.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {discoverRuntimes,nativeNode} from '../app/services/runtime-paths.mjs';
const root=resolve('.runtime/live-dsh'),path=join(root,'project');await mkdir(path,{recursive:true});const marker=`AWB_NATIVE_READ_${randomUUID()}`;await writeFile(join(path,'sentinel.txt'),marker+'\n');
const saved=JSON.parse(await readFile(resolve('.runtime/probe/workspace.json'),'utf8'));const model=saved.catalog.workbuddy.models.find(m=>m.id==='deepseek-v4.1-flash');
if(!model||!/1017/.test(model.raw.descriptionZh??''))throw new Error('Permitted WorkBuddy DeepSeek Flash1017 identity is not verified');
const store=await new Store(root).open();await store.mutate(s=>{s.catalog={workbuddy:saved.catalog.workbuddy};s.projects=[{id:'smoke-project',path,name:'Bounded native read verification'}];});const node=nativeNode(),providers=new ProviderService(store,node),gateway=new Gateway(store,providers,node),sessions=new Sessions(store,providers,gateway,await discoverRuntimes());
let timer;const outcome=new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('Native read smoke timed out after 180s')),180000);store.on('event',event=>{if(['error','notice','tool-start','tool-end','turn-end'].includes(event.type))console.log(JSON.stringify({type:event.type,text:event.text,name:event.name,status:event.status}));if(event.type==='turn-end')resolve(event);});});
try{
  const session=await sessions.create({projectId:'smoke-project',runtimeId:'dsh',title:'Bounded sentinel read validation',selection:{modelKey:model.key,identity:model.identity,contextTokens:model.contextMaximum,contextBudget:200000,reasoning:'low'}});
  console.log(JSON.stringify({stage:'starting',provider:'workbuddy',modelId:model.id,versionEvidence:'1017',scope:'Read sentinel.txt only, return exact contents, then stop. No writes, shell, planning or delegation.'}));
  await sessions.prompt(session.id,'This is a bounded integration verification. Use your native file read tool to read only sentinel.txt in the current workspace. Return the exact contents only after the tool result. Do not guess. Do not write files, run shell commands, inspect any other directory, make plans, browse, or delegate. Stop after returning the contents.');
  const result=await outcome,events=await store.events(session.id);clearTimeout(timer);const text=events.filter(e=>e.type==='text').map(e=>e.text).join('');const tools=events.filter(e=>e.type==='tool-start');const passed=result.status==='completed'&&text.includes(marker)&&tools.length>0;
  await writeFile(join(root,'result.json'),JSON.stringify({passed,status:result.status,source:'workbuddy',model:model.id,versionEvidence:model.raw.descriptionZh,toolNames:tools.map(e=>e.name),markerFound:text.includes(marker),eventTypes:[...new Set(events.map(e=>e.type))]},null,2));console.log(JSON.stringify({passed,markerFound:text.includes(marker),toolCalls:tools.length}));if(!passed)process.exitCode=1;
}catch(e){console.error(JSON.stringify({passed:false,error:e.message}));process.exitCode=1;}finally{clearTimeout(timer);await sessions.close();await gateway.close();await providers.close();await store.close();}
