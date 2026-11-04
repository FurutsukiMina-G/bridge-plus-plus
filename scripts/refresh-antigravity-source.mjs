import {Store} from '../app/core/store.mjs';
import {discoverRuntimes} from '../app/services/runtime-paths.mjs';
import {refreshAntigravitySource} from '../app/services/antigravity-source.mjs';
import {resolve} from 'node:path';
const store=await new Store(resolve('.runtime/probe')).open(),runtime=(await discoverRuntimes()).find(r=>r.id==='antigravity');
const models=await refreshAntigravitySource(store,runtime,store.root);
console.log(JSON.stringify({source:'antigravity',execution:'native-antigravity-only',bridge:false,models:models.map(m=>({id:m.id,name:m.name,boundRuntime:m.boundRuntime}))},null,2));
