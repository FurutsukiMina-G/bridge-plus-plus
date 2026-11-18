import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isWorkbuddyPowerShellProbe} from '../app/services/workbuddy-source-preload.mjs';
import {LEAN_RUNTIME_ENV} from '../bridges/workbuddy-bridge/src/sdk-transport.mjs';

test('the lean WorkBuddy runtime disables the native PowerShell tool and Galileo',()=>{
  assert.equal(LEAN_RUNTIME_ENV.CODEBUDDY_USE_POWERSHELL_TOOL,'0');
  assert.equal(LEAN_RUNTIME_ENV.DISABLE_GALILEO,'1');
});

test('the preload matches the exact Windows version probe and no other call',()=>{
  const exe='C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  const args=['-NoProfile','-NonInteractive','-WindowStyle','Hidden','-Command','$PSVersionTable.PSVersion.ToString()'];
  const options={encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe'],windowsHide:true};
  assert.equal(isWorkbuddyPowerShellProbe(exe,args,options),true);
  assert.equal(isWorkbuddyPowerShellProbe('pwsh.exe',args,options),true);
  for(const call of [['arbitrary.exe',args,options],[exe,args.slice(1),options],[exe,[...args,'-Extra'],options],
    [exe,[...args.slice(0,-1),'Get-ChildItem'],options],[exe,args,{...options,timeout:500}],
    [exe,args,{...options,stdio:['ignore','pipe','ignore']}],[exe,args,{...options,cwd:'C:\\other'}]]){
    assert.equal(isWorkbuddyPowerShellProbe(...call),false);
  }
});
