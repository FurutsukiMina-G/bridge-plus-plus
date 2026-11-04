import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runModelService} from '../../app/model-service.mjs';
import {ModelServiceStore} from '../../app/services/model-service-store.mjs';
import {normalizeQoder,normalizeWorkbuddy} from '../../app/core/catalog.mjs';
const args=process.argv.slice(2),get=flag=>args[args.indexOf(flag)+1],id=get('--id'),userData=get('--user-data'),models=id==='qoder'?[normalizeQoder({value:'dfmodel',displayName:'DeepSeek Flash',supportsImages:true,supportsToolCall:true,context_config:{small:{token_count:200000}},thinking_config:{enabled:{efforts:{high:{}}}},defaultEffort:'high'})]:[normalizeWorkbuddy({id:'fixture-wb',name:'Fixture',contextWindow:200000,supportsToolCall:true,supportsImages:true})];
const storeOptions={protect:async()=>{}},store=await new ModelServiceStore(userData,id,storeOptions).open();if(!await store.read('catalog.json'))await store.write('catalog.json',{models,status:'ready'});
await runModelService({id,userData,storeOptions,serverOptions:{providers:{get:key=>models.find(m=>m.key===key),refresh:async()=>models,close:async()=>{}},workerScript:resolve('tests/fixtures/model-service-worker.mjs'),installation:{entry:fileURLToPath(import.meta.url),command:process.execPath,args:process.argv.slice(1)}}});
