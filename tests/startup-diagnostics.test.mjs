import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {Store} from '../app/core/store.mjs';

async function root(){await mkdir('.runtime/tests',{recursive:true});const dir=await mkdtemp(resolve('.runtime/tests/startup-diagnostics-'));await mkdir(join(dir,'sessions'));return dir;}
const paths=dir=>({file:join(dir,'workspace.json'),backup:join(dir,'workspace.backup.json')});

test('workspace diagnostics distinguish missing, corrupt and empty indexes and name both recovery paths',async()=>{
 const missing=await root();await writeFile(join(missing,'sessions/old.jsonl'),'{}\n');{const {file,backup}=paths(missing);await assert.rejects(new Store(missing).open(),error=>{assert.match(error.message,/索引缺失/);assert.ok(error.message.includes(file)&&error.message.includes(backup));return true;});}
 const corrupt=await root(),corruptPaths=paths(corrupt);await writeFile(corruptPaths.file,'not json');await assert.rejects(new Store(corrupt).open(),error=>{assert.match(error.message,/已损坏/);assert.ok(error.message.includes(corruptPaths.file)&&error.message.includes(corruptPaths.backup));return true;});assert.equal(await readFile(corruptPaths.file,'utf8'),'not json');
 const empty=await root(),emptyPaths=paths(empty);await writeFile(emptyPaths.file,JSON.stringify({version:1,projects:[],sessions:[]}));await writeFile(join(empty,'sessions/old.jsonl'),'{}\n');await assert.rejects(new Store(empty).open(),error=>{assert.match(error.message,/索引为空/);assert.ok(error.message.includes(emptyPaths.file)&&error.message.includes(emptyPaths.backup));return true;});
});

test('fatal startup path shows the error and log location',async()=>{const main=await readFile('app/main.mjs','utf8');assert.match(main,/dialog\.showErrorBox\('Bridge\+\+ 无法启动'/);assert.match(main,/详细日志：/);});
