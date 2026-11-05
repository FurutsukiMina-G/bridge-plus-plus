import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {quotePowerShell} from '../app/services/native-launch.mjs';

const execute=promisify(execFile);
test('PowerShell preserves ASCII and curly single quotes without evaluating command separators',{skip:process.platform!=='win32'},async()=>{
 const input="ascii'‘’‚‛;calc;";const script=`[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);Write-Output ${quotePowerShell(input)}`;const {stdout}=await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:10000});assert.equal(stdout.trim(),input);
});
