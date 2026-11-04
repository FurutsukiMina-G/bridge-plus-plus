import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {discoverRuntimes} from '../app/services/runtime-paths.mjs';
import {nativeModels} from '../app/services/native-models.mjs';
const runtime=(await discoverRuntimes()).find(r=>r.id==='codex'),models=await nativeModels(runtime,resolve('.'));
const result={runtime:runtime.executable,count:models.length,visible:models.filter(m=>!m.hidden).length,hidden:models.filter(m=>m.hidden).length,models};
await mkdir('.runtime',{recursive:true});await writeFile('.runtime/codex-native-models.json',JSON.stringify(result,null,2));console.log(JSON.stringify({runtime:result.runtime,count:result.count,visible:result.visible,hidden:result.hidden,ids:models.map(m=>m.id)},null,2));
