import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {Gateway} from '../app/services/gateway.mjs';
import {Sessions} from '../app/services/sessions.mjs';
import {ProviderService} from '../app/services/providers.mjs';
import {nativeNode,discoverRuntimes} from '../app/services/runtime-paths.mjs';
const root=resolve('.runtime/audit-dsh-protocol');await mkdir(root,{recursive:true});
const store=await new Store(root).open(),catalog=JSON.parse(await readFile(resolve('.runtime/probe/workspace.json'),'utf8')).catalog;
await store.mutate(s=>{s.catalog=catalog;s.projects=[{id:'fixture-project',path:root,name:'Protocol only'}];});
const model=catalog.workbuddy.models.find(m=>m.id==='deepseek-v4.1-flash');assert.ok(model);
const providers=new ProviderService(store,nativeNode()),gateway=new Gateway(store,providers,nativeNode()),sessions=new Sessions(store,providers,gateway,await discoverRuntimes());
const endpoints=[];
try{
  for(let i=0;i<2;i++){
    const session=await sessions.create({projectId:'fixture-project',runtimeId:'dsh',title:'Native protocol only',selection:{modelKey:model.key,identity:model.identity,reasoning:'low',contextTokens:model.contextMaximum}});
    const adapter=await sessions.adapter(session);await adapter.ensureStarted();endpoints.push({sessionId:session.id,url:adapter.endpoint.baseURL,nativeReady:!!adapter.nativeId});
  }
  const settings=await sessions.dsh.rpc('settings/describe'),values=settings.namespaces.find(n=>n.ns==='llm-pi-ai').user.providers;
  for(const row of endpoints)assert.equal(values['agentworkbench-workbuddy-'+row.sessionId].baseURL,row.url);
  assert.notEqual(endpoints[0].url,endpoints[1].url);assert.equal(gateway.children.size,0,'No model inference worker may start');
  await writeFile(join(root,'result.json'),JSON.stringify({passed:true,sessions:2,distinctEndpoints:true,nativeReady:endpoints.every(e=>e.nativeReady),inferenceWorkers:0},null,2));
  console.log('DSH protocol: two native sessions keep distinct provider endpoints; zero inference workers.');
}finally{await sessions.close();await gateway.close();await providers.close();await store.close();}
