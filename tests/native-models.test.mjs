import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,utimes} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {readCodexModelCache} from '../app/services/native-models.mjs';
import {findManagedCodex} from '../app/services/runtime-paths.mjs';

test('Codex catalog reads the official cache, preserves raw metadata and never starts a client',async()=>{
  const raw={slug:'native-new',display_name:'New',visibility:'list',supported_reasoning_levels:[{effort:'ultra'}],default_reasoning_level:'ultra',input_modalities:['text','image'],unknown:'preserved'};
  let file;const models=await readCodexModelCache({home:'fixture',read:async path=>{file=path;return JSON.stringify({client_version:'0.166.0',fetched_at:'observed',models:[raw,{slug:'hidden',visibility:'hide'}]});}});
  assert.match(file,/models_cache.json$/);assert.equal(models.length,2);assert.equal(models[1].hidden,true);assert.equal(models[0].isDefault,null);assert.deepEqual(models[0].reasoning,['ultra']);assert.equal(models[0].defaultReasoning,'ultra');assert.deepEqual(models[0].inputModalities,['text','image']);assert.deepEqual(models[0].raw,raw);assert.equal(models[0].catalogSource,'official-models-cache');assert.equal(models[1].inputModalities,undefined);
});
test('Codex cache missing, corrupt, empty or unknown format fails with a native-client refresh remedy',async()=>{
  await assert.rejects(readCodexModelCache({read:async()=>{throw Object.assign(new Error('fixture'),{code:'ENOENT'});}}),/原生 Codex 客户端/);
  for(const value of ['invalid','{}','{"models":[]}','{"models":[{"id":"unknown"}]}'])await assert.rejects(readCodexModelCache({read:async()=>value}),/缓存|models_cache/);
});
test('Codex runtime discovery chooses the newest complete managed installation and skips helper-only directories',async()=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/codex-install-'));
  for(const folder of ['older','current','helper'])await mkdir(join(root,folder));for(const folder of ['older','current'])await writeFile(join(root,folder,'codex.exe'),'fixture');
  await utimes(join(root,'older'),100,100);await utimes(join(root,'current'),200,200);await utimes(join(root,'helper'),300,300);
  assert.equal(await findManagedCodex([root]),join(root,'current','codex.exe'));
});
