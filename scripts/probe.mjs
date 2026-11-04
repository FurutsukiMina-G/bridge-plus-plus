import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Store} from '../app/core/store.mjs';
import {ProviderService} from '../app/services/providers.mjs';
import {nativeNode,discoverRuntimes} from '../app/services/runtime-paths.mjs';
import {DshHost} from '../app/services/dsh-host.mjs';
const root=resolve('.runtime/probe');await mkdir(root,{recursive:true});const store=await new Store(root).open();const providers=new ProviderService(store,nativeNode());const names=process.argv.slice(2);const runtimes=await discoverRuntimes();
console.log(JSON.stringify({runtimes:runtimes.map(({id,installed,executable})=>({id,installed,executable}))},null,2));
try{for(const name of ['qoder','workbuddy'])if(names.includes(name)){try{const models=await providers.refresh(name);console.log(JSON.stringify({source:name,count:models.length,models:models.map(m=>({id:m.id,name:m.name,enabled:m.enabled,context:m.contexts,reasoning:m.reasoning,tools:m.tools}))},null,2));}catch(e){console.log(JSON.stringify({source:name,error:e.message}));process.exitCode=1;}}
  if(names.includes('dsh')){const host=new DshHost(store,runtimes.find(r=>r.id==='dsh'));try{await host.ready();const [catalog,settings]=await Promise.all([host.rpc('session/modelCatalog'),host.rpc('settings/describe')]);console.log(JSON.stringify({dsh:{ready:true,groups:catalog.groups?.map(g=>({id:g.id,count:g.models?.length})),writable:settings.writable,namespaces:settings.namespaces?.map(n=>n.ns)}}));}finally{await host.close();}}
}finally{await providers.close();await store.close();}
