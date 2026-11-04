import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Gateway} from '../app/services/gateway.mjs';
import {normalizeWorkbuddy,variantFor} from '../app/core/catalog.mjs';
test('concurrent registration yields valid endpoints; new model settings preserve active worker requests',async t=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/gateway-'));
  const model=normalizeWorkbuddy({id:'fixture',name:'Fixture',contextWindow:200000,maxTokens:8000,reasoning:{supportedEfforts:['low','max']}});
  const gateway=new Gateway({root},{get:()=>model},{command:process.execPath,args:[],env:{}},{workerScript:resolve('tests/fixtures/gateway-worker.mjs')});t.after(()=>gateway.close());
  const selection=effort=>({identity:model.identity,contextTokens:200000,reasoning:effort});
  const low=variantFor(model,selection('low')),max=variantFor(model,selection('max'));
  const endpoints=await Promise.all([gateway.register(model,low,selection('low'),'dsh'),gateway.register(model,low,selection('low'),'dsh')]);assert.equal(endpoints[0].baseURL,endpoints[1].baseURL);assert.match(endpoints[0].baseURL,/^http:\/\/127\.0\.0\.1:\d+\/dsh\/workbuddy\/v1$/);
  const worker=await gateway.ensureWorker('workbuddy','dsh');const started=new Promise(resolve=>worker.child.once('message',resolve));
  const request=body=>fetch(endpoints[0].baseURL+'/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+endpoints[0].key},body:JSON.stringify(body)}).then(async r=>{assert.equal(r.status,200);return r.json();});
  const pending=request({model:low.id,messages:[{role:'user',content:'fixture'}],delayMs:120});await started;
  await gateway.register(model,max,selection('max'),'dsh');const next=await request({model:max.id,messages:[{role:'user',content:'fixture'}]});const first=await pending;
  assert.equal(first.pid,next.pid);assert.equal(first.effort,'low');assert.equal(next.effort,'max');assert.equal(gateway.children.size,1);
});
