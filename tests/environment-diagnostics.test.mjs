import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {environmentStderr,kimiInstallFailure} from '../app/services/environment-diagnostics.mjs';
test('environment diagnostics redact credentials, signed URLs, ANSI and controls before retaining only the stderr tail',()=>{
 const text='head '.repeat(1000)+'\x1b[31m_authToken="fixture-auth" Cookie: fixture-cookie api_key=fixture-key password="fixture password" Bearer fixture-bearer https://user:fixture-pass@fixture.invalid/archive?sig=fixture-sig\x1b[0m\nEND npm double-loading config';const result=environmentStderr(text);for(const secret of ['fixture-auth','fixture-cookie','fixture-key','fixture password','fixture-bearer','fixture-pass','fixture-sig'])assert.equal(result.includes(secret),false);assert.ok(result.length<=1600);assert.match(result,/END npm double-loading config$/);assert.equal(/[\x00-\x1f]/.test(result),false);
});
test('environment install log resets at its byte limit and never records raw stderr',async()=>{
 await mkdir('.runtime/tests',{recursive:true});const dir=await mkdtemp(resolve('.runtime/tests/environment-diagnostic-')),logs=join(dir,'environments/logs'),file=join(logs,'kimi-install.log');await mkdir(logs,{recursive:true});await writeFile(file,'old'.repeat(23000));const error=await kimiInstallFailure(dir,1,'npm ERR fixture failure token=fixture-private');const text=await readFile(file,'utf8');assert.match(error.message,/fixture failure/);assert.match(text,/fixture failure/);assert.equal(text.includes('fixture-private'),false);assert.ok((await stat(file)).size<=64*1024);
});
