import {readdir,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';

export async function pruneServiceBackups(store,target,{keep=5}={}){
 const rows=[];for(const entry of await readdir(store.root,{withFileTypes:true}))if(entry.isFile()&&entry.name.startsWith(target+'-before-')&&/\.(?:json|toml)$/.test(entry.name)){const file=join(store.root,entry.name),info=await stat(file);rows.push({file,mtimeMs:info.mtimeMs});}
 rows.sort((a,b)=>b.mtimeMs-a.mtimeMs||b.file.localeCompare(a.file));await Promise.all(rows.slice(keep).map(row=>rm(row.file,{force:true})));
}
