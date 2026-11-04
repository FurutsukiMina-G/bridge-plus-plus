import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {readProjectFile,writeProjectFile,tree} from '../app/core/projects.mjs';
test('competing editor saves detect a stale revision and large directories do not silently lose files',async()=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/editor-race-'));await writeFile(join(root,'same.txt'),'base');const file=await readProjectFile(root,'same.txt');
  const writes=await Promise.allSettled(['first','second'].map(text=>writeProjectFile(root,{...file,text})));assert.equal(writes.filter(x=>x.status==='fulfilled').length,1);assert.match(writes.find(x=>x.status==='rejected').reason.message,/changed outside/);assert.equal(await readFile(join(root,'same.txt'),'utf8'),writes.find(x=>x.status==='fulfilled').value.text);
  for(let n=0;n<405;n++)await writeFile(join(root,`entry-${n}.txt`),'');assert.equal((await tree(root)).length,406);
});
