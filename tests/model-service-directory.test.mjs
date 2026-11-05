import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {currentUserSid,directoryProtected,ensureServiceDirectoryProtected} from '../app/services/model-service-system.mjs';
const user='S-1-5-21-100-200-300-1001',system='(A;OICI;FA;;;SY)',grant=`(A;OICI;FA;;;${user})`;
test('directoryProtected accepts only the two required protected full-control ACEs',()=>{
 const valid=`D:PAI${grant}${system}`;assert.equal(directoryProtected(valid,user),true);assert.equal(directoryProtected(`D:PAI${system}${grant}`,user),true);assert.equal(directoryProtected(`D:PAI${grant}${system}(A;OICI;FA;;;S-1-1-0)`,user),false);assert.equal(directoryProtected(`D:PAI${grant}`,user),false);assert.equal(directoryProtected(`D:PAI(A;OICI;RX;;;${user})${system}`,user),false);assert.equal(directoryProtected(`D:AI${grant}${system}`,user),false);assert.equal(directoryProtected(`D:PAI(A;OICI;FA;;;S-1-5-21-999)${system}`,user),false);assert.equal(directoryProtected(`D:PAI${grant}${grant}`,user),false);
});
test('ensureServiceDirectoryProtected decodes UTF-16LE with or without BOM and skips repair for a compliant DACL',async t=>{
 for(const bom of [false,true])await t.test(bom?'BOM':'no BOM',async()=>{
  const calls=[],repairs=[];const execute=async(command,args)=>{calls.push(command);assert.equal(command,'icacls.exe');await writeFile(args[2],Buffer.from((bom?'\uFEFF':'')+`fixture\r\nD:PAI${grant}${system}\r\n`,'utf16le'));return {stdout:''};};
  await ensureServiceDirectoryProtected('D:\\fixture',{execute,account:user,protect:async(...args)=>repairs.push(args)});assert.deepEqual(calls,['icacls.exe']);assert.equal(repairs.length,0);
 });
});
test('ensureServiceDirectoryProtected repairs noncompliant or unreadable DACLs and propagates repair failure',async t=>{
 for(const scenario of ['noncompliant','icacls-failure','repair-failure'])await t.test(scenario,async()=>{
  let repairs=0;const execute=async(command,args)=>{if(scenario==='icacls-failure')throw new Error('fixture icacls failure');await writeFile(args[2],Buffer.from(`fixture\nD:PAI${grant}${system}(A;OICI;FA;;;S-1-1-0)\n`,'utf16le'));return {stdout:''};};
  const protect=async()=>{repairs++;if(scenario==='repair-failure')throw new Error('fixture repair failure');};
  const task=ensureServiceDirectoryProtected('D:\\fixture',{execute,account:user,protect});if(scenario==='repair-failure')await assert.rejects(task,/fixture repair failure/);else await task;assert.equal(repairs,1);
 });
});
test('currentUserSid caches the native query per executor',async()=>{
 let calls=0;const execute=async()=>{calls++;return {stdout:Buffer.from(`"fixture","${user}"`,'utf8')};};assert.equal(await currentUserSid(execute),user);assert.equal(await currentUserSid(execute),user);assert.equal(calls,1);
});
