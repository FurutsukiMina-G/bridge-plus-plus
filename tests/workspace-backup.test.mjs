import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,unlink,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Store} from '../app/core/store.mjs';
async function fixture(t){await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/workspace-backup-')),store=await new Store(root).open();t.after(()=>store.close());await store.mutate(s=>{s.projects=[{id:'p',path:root}];s.sessions=[{id:'s',projectId:'p',runtimeId:'kimi',nativeId:'native-existing',status:'running',selection:{modelKey:'qoder:fixture',identity:'fixed',reasoning:'high',contextTokens:1000000,contextBudget:786432}}];});await store.event('s',{type:'user',text:'Synthetic original task'});await store.save();return {root,store};}
for(const failure of ['missing','invalid','empty'])test(`workspace ${failure} index recovers a validated backup and preserves native identity and journal`,async t=>{
  const f=await fixture(t),file=join(f.root,'workspace.json'),journal=await readFile(join(f.root,'sessions/s.jsonl'),'utf8');await f.store.close();
  if(failure==='missing')await unlink(file);else await writeFile(file,failure==='invalid'?'{broken':JSON.stringify({version:1,projects:[],sessions:[]}));
  const recovered=await new Store(f.root).open();t.after(()=>recovered.close());assert.equal(recovered.session('s').nativeId,'native-existing');assert.equal(recovered.session('s').status,'interrupted');assert.equal(recovered.session('s').selection.contextBudget,786432);assert.equal(recovered.recovery.source,'backup');assert.equal(await readFile(join(f.root,'sessions/s.jsonl'),'utf8'),journal);
  if(failure!=='missing')assert.ok((await readdir(f.root)).some(n=>n.startsWith('workspace.displaced-')));
});
test('an orphan journal without a valid backup is never silently initialized as empty',async()=>{
  const root=await mkdtemp(resolve('.runtime/tests/workspace-backup-'));await mkdir(join(root,'sessions'));await writeFile(join(root,'sessions/old.jsonl'),'{}\n');await writeFile(join(root,'workspace.json'),JSON.stringify({version:1,projects:[],sessions:[]}));const before=await readFile(join(root,'workspace.json'),'utf8');await assert.rejects(new Store(root).open(),/索引/);assert.equal(await readFile(join(root,'workspace.json'),'utf8'),before);
});
test('accidental empty saves cannot erase a populated index or its prior backup',async t=>{
  const f=await fixture(t),file=join(f.root,'workspace.json'),before=await readFile(file,'utf8');f.store.state.sessions=[];await assert.rejects(f.store.save(),/Refusing/);assert.equal(await readFile(file,'utf8'),before);assert.equal(JSON.parse(await readFile(join(f.root,'workspace.backup.json'),'utf8')).sessions[0].nativeId,'native-existing');
});
test('concurrent metadata snapshots keep the latest validated state in both copies',async t=>{
  const f=await fixture(t);const saves=[];for(let n=1;n<=4;n++){f.store.state.sessions[0].title='version-'+n;saves.push(f.store.save());}await Promise.all(saves);assert.equal(JSON.parse(await readFile(join(f.root,'workspace.json'),'utf8')).sessions[0].title,'version-4');assert.equal(JSON.parse(await readFile(join(f.root,'workspace.backup.json'),'utf8')).sessions[0].title,'version-4');
});
test('the first newly saved native identity survives even before the next metadata update',async t=>{
  const f=await fixture(t);await f.store.mutate(s=>{s.sessions[0].nativeId='native-latest';});await f.store.close();await writeFile(join(f.root,'workspace.json'),'{broken');const recovered=await new Store(f.root).open();t.after(()=>recovered.close());assert.equal(recovered.session('s').nativeId,'native-latest');
});
test('a populated backup can recover an empty index even before a conversation has messages',async t=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/workspace-backup-'));const store=await new Store(root).open();await store.mutate(s=>{s.sessions=[{id:'fresh-session',nativeId:'native-created',status:'idle'}];});await store.close();await writeFile(join(root,'workspace.json'),JSON.stringify({version:1,projects:[],sessions:[]}));const recovered=await new Store(root).open();t.after(()=>recovered.close());assert.equal(recovered.session('fresh-session').nativeId,'native-created');
});
