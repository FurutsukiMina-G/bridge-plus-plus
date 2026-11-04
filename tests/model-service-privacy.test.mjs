import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tsImport} from 'tsx/esm/api';
const {createBridgeServer,PUBLIC_MODEL}=await tsImport('../bridges/qoderbridge/src/server.ts',import.meta.url);
test('the copied Qoder HTTP pipeline disables success, task-content and error reports in metadata-only mode',{timeout:15000},async t=>{
 await mkdir('.runtime/tests',{recursive:true});const reportDir=await mkdtemp(resolve('.runtime/tests/service-private-'));
 const server=await createBridgeServer({auth:'cli',timeout:5000,strategy:'permission',decisionRetries:0},{port:0,key:'synthetic-privacy-key',prewarm:false,reportDir,telemetry:false,infer:async()=>({response:'{"kind":"final","content":"private-reply-fixture"}',error:null,stage:'inference',result:'success',model_requests:1})});t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const endpoint='http://127.0.0.1:'+server.address().port+'/v1/chat/completions',body={model:PUBLIC_MODEL,messages:[{role:'user',content:'private-prompt-fixture'}]};let response=await fetch(endpoint,{method:'POST',headers:{authorization:'Bearer synthetic-privacy-key','content-type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,200);assert.equal((await response.json()).choices[0].message.content,'private-reply-fixture');response=await fetch(endpoint,{method:'POST',headers:{authorization:'Bearer wrong','content-type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,401);assert.deepEqual(await readdir(reportDir),[]);
});
