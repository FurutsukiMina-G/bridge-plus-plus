import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const file=join(path,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(mjs|cjs|js)$/.test(file)&&!file.endsWith('build.js'))execFileSync(process.execPath,['--check',file],{stdio:'inherit',windowsHide:true});}}
await walk('app');await walk('scripts');console.log('JavaScript syntax checks passed.');
