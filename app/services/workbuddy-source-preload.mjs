import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {win32} from 'node:path';
import {registerSourcePackage} from './source-loader.mjs';

const versionArgs=['-NoProfile','-NonInteractive','-WindowStyle','Hidden','-Command','$PSVersionTable.PSVersion.ToString()'];
const exact=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&expected.every((value,index)=>actual[index]===value);

export function isWorkbuddyPowerShellProbe(file,args,options){
  return typeof file==='string'&&/^(?:powershell|pwsh)(?:\.exe)?$/i.test(win32.basename(file))&&
    exact(args,versionArgs)&&options?.encoding==='utf8'&&options.timeout===10000&&options.windowsHide===true&&
    exact(options.stdio,['ignore','pipe','pipe'])&&Object.keys(options).length===4;
}

await registerSourcePackage('workbuddy');

if(process.platform==='win32'&&process.env.CODEBUDDY_USE_POWERSHELL_TOOL==='0'){
  const execFileSync=childProcess.execFileSync;
  // Some CLI callers inspect the shell edition without going through the tool's gate.
  // An empty version is handled as an unavailable shell by those same callers.
  childProcess.execFileSync=function(file,args,options){
    if(isWorkbuddyPowerShellProbe(file,args,options))return '';
    return execFileSync.apply(this,arguments);
  };
  syncBuiltinESMExports();
}
