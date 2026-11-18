import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,rm,utimes,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareProviderCompileCache} from '../app/services/provider-compile-cache.mjs';

test('managed bytecode cache prunes old files and version generations',async t=>{
  const root=await mkdtemp(join(tmpdir(),'bridge-compile-cache-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const old=await prepareProviderCompileCache(root,'v1');
  const preserved=join(root,'provider-compile-cache','manual');
  await mkdir(preserved);
  await writeFile(join(preserved,'note'),'keep');
  const current=await prepareProviderCompileCache(root,'v2');
  assert.notEqual(current,old);
  await assert.rejects(readFile(join(old,'file')),{code:'ENOENT'});
  await assert.rejects(utimes(old,0,0),{code:'ENOENT'});
  const node=join(current,'v8-version');
  await mkdir(node);
  const a=join(node,'old'),b=join(node,'new');
  await writeFile(a,'old');await utimes(a,1000,1000);
  await writeFile(b,'new');
  assert.equal(await prepareProviderCompileCache(root,'v2',{limit:3}),current);
  await assert.rejects(readFile(a),{code:'ENOENT'});
  assert.equal(await readFile(b,'utf8'),'new');
  assert.equal(await readFile(join(preserved,'note'),'utf8'),'keep');
});
