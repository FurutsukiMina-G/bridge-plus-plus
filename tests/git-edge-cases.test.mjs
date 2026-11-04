import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm,rmdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {git,gitStatus,gitDiff,gitStage,gitCommit,contained} from '../app/core/projects.mjs';
test('Git previews initial/untracked files, stages deleted directories and treats filename brackets literally',async()=>{
  await mkdir('.runtime/tests',{recursive:true});const root=await mkdtemp(resolve('.runtime/tests/git-edges-'));await git(root,['init','-b','main']);await git(root,['config','user.name','Test']);await git(root,['config','user.email','test@example.invalid']);
  await mkdir(join(root,'nested'));await writeFile(join(root,'nested/file.txt'),'initial\n');assert.match(await gitDiff(root,'nested/file.txt'),/\+initial/);await gitStage(root,['nested/file.txt']);assert.match(await gitDiff(root,'nested/file.txt'),/\+initial/);await gitCommit(root,'base');
  await rm(join(root,'nested/file.txt'));await rmdir(join(root,'nested'));assert.match(await gitDiff(root,'nested/file.txt'),/-initial/);await gitStage(root,['nested/file.txt']);assert.equal((await gitStatus(root)).files[0].status,'D ');
  await writeFile(join(root,'[a].txt'),'literal');await writeFile(join(root,'a.txt'),'separate');await gitStage(root,['[a].txt']);assert.equal((await gitStatus(root)).files.find(f=>f.path==='a.txt').status,'??');
  await assert.rejects(contained(root,'.GIT/config',{create:true}),/Git internals/);
});
