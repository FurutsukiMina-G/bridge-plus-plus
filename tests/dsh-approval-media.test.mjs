import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {WebSocketServer} from 'ws';
import {DshHost} from '../app/services/dsh-host.mjs';
import {DshAdapter} from '../app/runtimes/dsh.mjs';
for(const [choice,reason,expected]of [['approve','tool write','allowed-once'],['reject','tool write','rejected'],['reject','escalate sandbox to danger-full-access: fixture','rejected']])test(`DSH real synthetic Host websocket/HTTP approval ${choice}: ${reason}`,async t=>{
 const requests=[],server=createServer(async(req,res)=>{let raw='';for await(const b of req)raw+=b;requests.push({url:req.url,...JSON.parse(raw)});res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({result:{ok:true,value:{}}}));});
 const wss=new WebSocketServer({server});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const host=new DshHost({},{});host.origin='http://127.0.0.1:'+server.address().port;host.cookie='synthetic=1';host.ready=async()=>host;
 let peer,streamId,pending;const received=new Promise(r=>{pending=r;});
 wss.on('connection',socket=>{peer=socket;socket.on('message',bytes=>{const m=JSON.parse(bytes);streamId=m.streamId;assert.equal(m.endpoint,'$events');assert.deepEqual(m.payload,{args:{}});socket.send(JSON.stringify({type:'item',streamId,value:{type:'ready',clientId:'client',host:{home:'fixture'}}}));});});
 const events=[],adapter=new DshAdapter({host,permissionMode:'auto-review',session:{selection:{}},emit:async e=>{events.push(e);if(e.type==='approval')pending(e);}});adapter.ready=true;adapter.running=true;
 const stream=await host.followApprovals('native',e=>adapter.emit(e),id=>adapter.emit({type:'approval-resolved',approvalId:id}),e=>{throw e;});adapter.approvalStream=stream;
 t.after(async()=>{stream.stop();for(const client of wss.clients)client.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));});
 peer.send(JSON.stringify({type:'item',streamId,value:{type:'waterfall',event:'approval/request',eventId:'event',agentId:'native',request:{toolName:'shell',reason}}}));const event=await received;assert.deepEqual(event.choices,['approve','reject']);
 await assert.rejects(adapter.approve(event.approvalId,'approve-session'),/仅支持/);await adapter.approve(event.approvalId,choice);
 assert.equal(requests[0].url,'/api/$events/result');assert.equal(requests[0].method,'$events/result');assert.deepEqual(requests[0].payload.args,{clientId:'client',eventId:'event',outcome:{kind:'result',value:expected}});assert.equal(events.at(-1).type,'approval-resolved');await assert.rejects(adapter.approve(event.approvalId,choice),/过期/);
});
