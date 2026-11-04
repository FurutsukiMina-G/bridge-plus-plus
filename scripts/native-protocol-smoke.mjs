import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {discoverRuntimes} from '../app/services/runtime-paths.mjs';
import {KimiAcpAdapter} from '../app/runtimes/kimi-acp.mjs';
import {CodexAdapter} from '../app/runtimes/codex.mjs';
const root=resolve('.runtime/native-protocol');await mkdir(root,{recursive:true});const runtimes=await discoverRuntimes();const results=[];
for(const [id,Adapter]of [['kimi',KimiAcpAdapter],['codex',CodexAdapter]]){
  const runtime=runtimes.find(r=>r.id===id),dir=join(root,id);await mkdir(dir,{recursive:true});let nativeId;const events=[];
  const options={runtime,dir,project:{path:root},session:{id:`native-${id}`,selection:{modelKey:'bridge',reasoning:'low',contextTokens:200000}},model:{name:'Local protocol contract fixture',contextMaximum:200000,maxOutputTokens:8000,reasoning:['low','high','max'],id:'local-fixture'},variant:{id:'local-fixture'},endpoint:{baseURL:'http://127.0.0.1:1/v1',key:'local-fixture-key'},emit:async e=>events.push(e),saveNative:async id=>{nativeId=id;}};
  // No prompt is sent, and the dummy loopback model endpoint cannot make any inference.
  const adapter=new Adapter(options);try{await adapter.start();results.push({runtime:id,protocolReady:true,nativeId:!!nativeId,events:events.map(e=>({type:e.type,text:e.text}))});}catch(e){results.push({runtime:id,protocolReady:false,error:e.message});process.exitCode=1;}finally{await adapter.close();}
}
await writeFile(join(root,'result.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
