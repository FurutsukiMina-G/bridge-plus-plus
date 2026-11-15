import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,toolRequest,waitFor} from './hold-fake.mjs';

// 1×1 PNG. In 0.1.23-r1 any picture in the conversation made the hold lane send a bare content array, which the
// official runtime silently drops (init model "unknown"), reported to the user as "selected a different model".
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

test('a picture in the conversation reaches the hold runtime inside one full user message',async t=>{
  const f=await fixture(t),request={...toolRequest(),messages:[{role:'user',content:[{type:'text',text:'What color is this?'},{type:'image_url',image_url:{url:png}}]}]};
  const pending=f.infer(request);
  await waitFor(()=>f.sessions[0]?.prompts.length===1||f.sessions[0]?.dropped);
  const session=f.sessions[0];
  assert.equal(session.dropped,undefined,'the runtime kept the prompt');
  const content=session.prompts[0].message.content;
  assert.ok(Array.isArray(content)&&content.some(block=>block.type==='image'),'the image block is part of the prompt');
  session.final('Red');
  assert.equal((await pending).reply.content,'Red');
});

test('a prompt the runtime never received is reported as not delivered, not as another model',async t=>{
  const f=await fixture(t,{},session=>{session.send=async()=>{session.dropped=1;session.emit({type:'system',subtype:'init',model:'unknown',tools:[],mcp_servers:[]});session.emit({type:'result',subtype:'success',is_error:false,result:''});};});
  // The lane reports a failed attempt in its report; the transport turns that into the upstream error the user sees.
  const result=await f.infer(toolRequest());
  assert.equal(result.reply,null);
  assert.match(result.report.error,/not delivered/);assert.doesNotMatch(result.report.error,/different model/);
});
