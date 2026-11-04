import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const appRoot=resolve(process.env.AWB_PACKAGE_ROOT??'.');
const {Gateway}=await import(pathToFileURL(join(appRoot,'app/services/gateway.mjs')));
const {nativeNode}=await import(pathToFileURL(join(appRoot,'app/services/runtime-paths.mjs')));
const {variantFor,validateSelection}=await import(pathToFileURL(join(appRoot,'app/core/catalog.mjs')));

// Launch both actual copied bridge servers and update their catalogs over IPC.
// Never send a completion request: this does not invoke a model.
const root=resolve(process.env.AWB_PACKAGE_ROOT?'.runtime/gateway-catalog-smoke-packaged':'.runtime/gateway-catalog-smoke');await mkdir(root,{recursive:true});
const {catalog}=JSON.parse(await readFile(resolve('.runtime/probe/workspace.json'),'utf8'));
const models=Object.values(catalog).flatMap(c=>c.models??[]);
const gateway=new Gateway({root},{get:key=>models.find(m=>m.key===key)},nativeNode()),results=[];
try{
  for(const runtimeId of ['dsh','kimi','codex'])for(const source of ['qoder','workbuddy']){
    const model=models.find(m=>m.source===source&&m.enabled&&m.reasoning.length>1);assert.ok(model,'Catalog fixture needs multiple efforts');
    const selection=reasoning=>validateSelection(model,{modelKey:model.key,identity:model.identity,reasoning,contextTokens:model.contexts[0]?.tokens??null});
    const first=selection(model.reasoning[0]),second=selection(model.reasoning[1]),one=variantFor(model,first),two=variantFor(model,second);
    await gateway.register(model,one,first,runtimeId);const worker=await gateway.ensureWorker(source,runtimeId),pid=worker.child.pid;
    await gateway.register(model,two,second,runtimeId);const updated=await gateway.ensureWorker(source,runtimeId);assert.equal(updated.child.pid,pid);
    const response=await fetch(updated.url+'/v1/models',{headers:{authorization:'Bearer '+updated.key},signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);const list=await response.json();
    assert.ok(list.data.some(row=>row.id===one.id));assert.ok(list.data.some(row=>row.id===two.id));results.push({source,runtimeId,pid,inPlaceCatalogUpdate:true,models:list.data.length,completionRequests:0});
  }
  assert.equal(new Set(results.map(row=>row.pid)).size,6,'Every runtime/source must own a separate worker');
}finally{await gateway.close();}
await writeFile(join(root,'result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
