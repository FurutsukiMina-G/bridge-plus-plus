import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const entries=JSON.parse((await readFile('docs/bridge-provenance.json','utf8')).replace(/^\uFEFF/,''));let checked=0;const changed=[];
for(const source of entries)for(const file of source.files){const data=await readFile(join(source.source,file.path));const hash=createHash('sha256').update(data).digest('hex').toUpperCase();checked++;if(hash!==file.sha256)changed.push(join(source.source,file.path));}
console.log(JSON.stringify({checked,originalsUnchanged:changed.length===0,changed},null,2));if(changed.length)process.exitCode=1;
