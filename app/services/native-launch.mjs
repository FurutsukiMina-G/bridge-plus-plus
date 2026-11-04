import {mkdir,writeFile,readdir,stat,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
export const quotePowerShell=value=>"'"+String(value).replaceAll("'","''")+"'";
export async function writeNativeLauncher(root,{projectPath,setup='',executable,args=[]}){
  const dir=join(root,'native-launch');await mkdir(dir,{recursive:true});const file=join(dir,randomUUID()+'.ps1');
  // PowerShell parses the script before executing it. Remove the credential-bearing file
  // immediately, including when -NoExit keeps its terminal open after the native CLI exits.
  const source=`$ErrorActionPreference = 'Stop'\nRemove-Item -LiteralPath $PSCommandPath -Force\nSet-Location -LiteralPath ${quotePowerShell(projectPath)}\n${setup}& ${quotePowerShell(executable)} ${args.map(quotePowerShell).join(' ')}\n`;
  await writeFile(file,'\uFEFF'+source,{mode:0o600});return file;
}
export async function cleanupNativeLaunchers(root,{now=Date.now(),ageMs=86400000}={}){
  const dir=join(root,'native-launch');let removed=0;
  for(const entry of await readdir(dir,{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return [];throw error;})){
    if(!entry.isFile()||!/^[-0-9a-f]{36}\.ps1$/i.test(entry.name))continue;
    const file=join(dir,entry.name);
    try{if(now-(await stat(file)).mtimeMs>=ageMs){await rm(file);removed++;}}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  return removed;
}
