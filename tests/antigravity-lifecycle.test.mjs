import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {AntigravityAdapter} from '../app/runtimes/antigravity.mjs';
const fake=()=>Object.assign(new EventEmitter(),{stdin:new PassThrough(),stdout:new PassThrough(),stderr:new PassThrough(),exitCode:null,pid:undefined});
test('Antigravity long prompts use stdin; result is serialized before process close and next-turn callbacks are isolated',async()=>{
  const children=[],events=[],calls=[];const session={selection:{nativeModel:'verified-fixture'}};
  const adapter=new AntigravityAdapter({session,runtime:{executable:'fixture'},project:{path:'.'},launchProcess:(_command,args)=>{calls.push(args);const c=fake();children.push(c);return c;},saveNative:async id=>{await new Promise(r=>setTimeout(r,5));session.nativeId=id;},emit:async event=>events.push(event)});
  const prompt='x'.repeat(50000);await adapter.prompt(prompt);assert.equal(calls[0].includes(prompt),false);assert.equal(JSON.parse(children[0].stdin.read().toString()).message.content,prompt);
  assert.equal(calls[0][calls[0].indexOf('--mode')+1],'accept-edits');assert.ok(calls[0].includes('--sandbox'));assert.equal(calls[0].includes('--dangerously-skip-permissions'),false);
  children[0].stdout.write(JSON.stringify({event:'result',result:{status:'SUCCESS',conversation_id:'native-one',response:'first'}})+'\n');children[0].emit('close',0);await adapter.active.queue;
  assert.equal(events.filter(e=>e.type==='turn-end').length,1);assert.equal(events.at(-1).status,'completed');await adapter.prompt('second');children[0].emit('close',1);
  children[1].stdout.write(JSON.stringify({type:'assistant',message:{content:[{type:'text',text:'second'}]}})+'\n'+JSON.stringify({type:'result',result:'second',is_error:false})+'\n');await adapter.active.queue;
  assert.deepEqual(events.filter(e=>e.type==='text').map(e=>e.text),['first','second']);assert.equal(events.filter(e=>e.type==='turn-end').length,2);await adapter.close();
});
test('native permission TOOL_ERROR is terminally failed and names the denied command even with SUCCESS result',async()=>{
  const events=[],children=[],calls=[];
  const a=new AntigravityAdapter({session:{selection:{}},permissionMode:'auto',runtime:{executable:'fixture'},project:{path:'.'},launchProcess:(_c,args)=>{calls.push(args);const c=fake();children.push(c);return c;},emit:async e=>events.push(e)});
  await a.prompt('fixture');assert.ok(calls[0].includes('--sandbox'));assert.ok(calls[0].includes('--dangerously-skip-permissions'));
  const tool={step_type:'tool',step_index:2,tool_name:'run_command',state:'ERROR',tool_info:{parameters:{CommandLine:'dir fixture'},error:{type:'TOOL_ERROR',message:'permission check failed for unsandboxed: user denied permission to run command'}}};
  children[0].stdout.write(JSON.stringify({event:'step_update',step_update:tool})+'\n'+JSON.stringify({event:'step_update',step_update:tool})+'\n'+JSON.stringify({event:'result',result:{status:'SUCCESS',response:''}})+'\n');await a.active.queue;
  assert.equal(events.filter(e=>e.code==='permission_denied').length,1);assert.match(events.find(e=>e.code==='permission_denied').text,/dir fixture/);assert.equal(events.at(-1).status,'failed');assert.equal(events.filter(e=>e.type==='tool-end').length,2);await a.close();
});
test('write_file native denial names the denied path, fails the turn, and never bypasses the native decision',async()=>{
  const events=[],c=fake(),calls=[];
  const a=new AntigravityAdapter({session:{selection:{}},runtime:{executable:'fixture'},project:{path:'.'},launchProcess:(_c,args)=>{calls.push(args);return c;},emit:async e=>events.push(e)});
  await a.prompt('edit fixture');
  c.stdout.write(JSON.stringify({event:'step_update',step_update:{step_type:'tool',state:'ERROR',step_index:4,tool_name:'write_file',tool_info:{parameters:{Path:'fixture/shortcuts.xml'},error:{type:'TOOL_ERROR',message:'user denied permission for write_file'}}}})+'\n'+JSON.stringify({event:'result',result:{status:'SUCCESS',response:''}})+'\n');await a.active.queue;
  assert.match(events.find(e=>e.code==='permission_denied').text,/fixture\/shortcuts.xml/);assert.equal(events.at(-1).status,'failed');assert.equal(calls.length,1);assert.equal(calls[0].includes('--dangerously-skip-permissions'),false);await a.close();
});
