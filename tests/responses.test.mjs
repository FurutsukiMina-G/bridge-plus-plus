import {test} from 'node:test';
import assert from 'node:assert/strict';
import {responseToChat,responseTools,ResponseProjection,sse} from '../app/services/responses.mjs';
const pngData='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',pngUrl=`data:image/png;base64,${pngData}`;
const toolCall=(id,type='function_call')=>({type,call_id:id,name:'view_image',...(type==='custom_tool_call'?{input:'logo.png'}:{arguments:'{"path":"logo.png"}'})});
const toolOutput=(id,output,type='function_call_output')=>({type,call_id:id,output});
const chatImage={type:'image_url',image_url:{url:pngUrl}};

test('Responses tool images retain text and follow the tool result when enabled',()=>{
  for(const image of [{type:'input_image',image_url:pngUrl},chatImage,{type:'image',source:{type:'base64',media_type:'image/png',data:pngData}}]){
    const result=responseToChat({input:[toolCall('c1'),toolOutput('c1',[{type:'input_text',text:'logo.png'},image,{type:'output_text',text:'loaded'}])]}, {images:true});
    assert.deepEqual(result.messages,[{role:'assistant',content:null,tool_calls:[{id:'c1',type:'function',function:{name:'view_image',arguments:'{"path":"logo.png"}'}}]},
      {role:'tool',tool_call_id:'c1',content:'logo.png\nloaded'},
      {role:'user',content:[{type:'text',text:'Images returned by tool call c1:'},chatImage]}]);
    assert.equal(result.bridge_omitted_media,undefined);
  }
});
test('Responses tool images preserve the text-only omission behavior when disabled',()=>{
  const output=[{type:'input_text',text:'logo.png'},{type:'input_image',image_url:pngUrl},chatImage,{type:'image',source:{type:'base64',media_type:'image/png',data:pngData}}];
  const input=[toolCall('c1'),toolOutput('c1',output)],result=responseToChat({input},{images:false});
  assert.deepEqual(result,responseToChat({input}));
  assert.deepEqual(result.bridge_omitted_media,['input_image','image_url','image']);
  assert.deepEqual(result.messages.map(m=>m.role),['assistant','tool']);
  assert.match(result.messages[1].content,/^logo.png\n\[Bridge\+\+ omitted input_image:.*NOT inspected\. sha256=[a-f0-9]{64}\]/);
  assert.equal((result.messages[1].content.match(/NOT inspected/g)??[]).length,3);
});
test('Responses batches images after all consecutive tool results in output order',()=>{
  const secondUrl='data:image/gif;base64,'+Buffer.from('GIF89a').toString('base64');
  const input=[toolCall('c1'),toolCall('c2'),toolOutput('c2',[{type:'text',text:'second call first'}, {type:'input_image',image_url:secondUrl}]),
    {type:'reasoning'},toolOutput('c1',[{type:'text',text:'first call second'},chatImage,chatImage])];
  const {messages}=responseToChat({input},{images:true});
  assert.deepEqual(messages.map(m=>m.role),['assistant','tool','tool','user']);
  assert.deepEqual(messages[0].tool_calls.map(c=>c.id),['c1','c2']);
  assert.deepEqual(messages.slice(1,3).map(m=>m.tool_call_id),['c2','c1']);
  assert.deepEqual(messages[3].content,[{type:'text',text:'Images returned by tool call c2:'},{type:'image_url',image_url:{url:secondUrl}},
    {type:'text',text:'Images returned by tool call c1:'},chatImage,chatImage]);
});
test('Responses image-only tool output has a nonempty note',()=>{
  const {messages}=responseToChat({input:[toolCall('c1'),toolOutput('c1',[chatImage])]},{images:true});
  assert.equal(messages[1].content,'Images returned in the next user message.');
  assert.deepEqual(messages[2].content,[{type:'text',text:'Images returned by tool call c1:'},chatImage]);
});
test('Responses custom tool output forwards images with the custom call identity',()=>{
  const {messages}=responseToChat({input:[toolCall('custom1','custom_tool_call'),toolOutput('custom1',[{type:'text',text:'custom image'},chatImage],'custom_tool_call_output')]},{images:true});
  assert.deepEqual(messages.map(m=>m.role),['assistant','tool','user']);
  assert.equal(messages[1].content,'custom image');
  assert.equal(messages[1].tool_call_id,'custom1');
  assert.deepEqual(messages[2].content,[{type:'text',text:'Images returned by tool call custom1:'},chatImage]);
});
test('Responses flushes each image batch before the next message and preserves text-only results',()=>{
  const {messages}=responseToChat({input:[toolCall('c1'),toolOutput('c1',[chatImage]),{role:'user',content:'continue'},
    toolCall('c2'),toolOutput('c2',[chatImage]),{role:'assistant',content:'done'},toolCall('c3'),toolOutput('c3','text only')]},{images:true});
  assert.deepEqual(messages.map(m=>m.role),['assistant','tool','user','user','assistant','tool','user','assistant','assistant','tool']);
  assert.equal(messages[3].content,'continue');
  assert.equal(messages[6].content[0].text,'Images returned by tool call c2:');
  assert.equal(messages.at(-1).content,'text only');
});
test('Responses tool images use exactly the user-image validation errors',()=>{
  const oversized=Buffer.alloc(8*1024*1024+1);Buffer.from(pngData,'base64').copy(oversized);
  for(const url of ['https://example.invalid/logo.png','data:image/png;base64,@@@','data:image/png;base64,a','data:image/png;base64,YQ==',
    'data:image/jpeg;base64,'+pngData,'data:image/png;base64,'+oversized.toString('base64')]){
    for(const type of ['input_image','image_url','image']){
      const part={type,image_url:url};let userError;
      assert.throws(()=>responseToChat({input:[{role:'user',content:[part]}]},{images:true}),error=>{userError=error;return true;});
      for(const outputType of ['function_call_output','custom_tool_call_output']){
        assert.throws(()=>responseToChat({input:[toolOutput('c1',[part],outputType)]},{images:true}),error=>error.constructor===userError.constructor&&error.message===userError.message);
        assert.match(responseToChat({input:[toolOutput('c1',[part],outputType)]},{images:false}).messages[0].content,/NOT inspected/);
      }
    }
  }
});
test('Responses input preserves ordered tool calls/results and explicit schemas',()=>{const input=responseToChat({model:'exact',instructions:'system',input:[{role:'user',content:[{type:'input_text',text:'read file'}]},{type:'function_call',call_id:'call1',name:'read',arguments:'{"path":"a"}'},{type:'function_call_output',call_id:'call1',output:'contents'}],tools:[{type:'function',name:'read',parameters:{type:'object',required:['path']}}]});assert.deepEqual(input.messages.map(m=>m.role),['system','user','assistant','tool']);assert.equal(input.messages[3].tool_call_id,'call1');assert.equal(input.tools[0].function.parameters.required[0],'path');assert.match(responseToChat({input:[{role:'user',content:[{type:'input_image'}]}]}).messages[0].content,/NOT inspected/);});
test('namespaced tools and custom tool text survive translation exactly',()=>{const {tools,mapping}=responseTools([{type:'namespace',name:'functions',tools:[{type:'function',name:'exec_command',parameters:{type:'object'}},{type:'custom',name:'apply_patch',format:{definition:'native grammar'}}]}]);assert.equal(tools[0].function.name,'functions__exec_command');assert.equal(mapping.functions__exec_command.namespace,'functions');const output=[],p=new ResponseProjection('x',e=>output.push(e),mapping);p.start();p.accept({choices:[{delta:{tool_calls:[{index:0,id:'c',function:{name:'functions__apply_patch',arguments:JSON.stringify({input:'*** Begin Patch\n*** End Patch'})}}]},finish_reason:'tool_calls'}]});const result=p.finish();assert.equal(result.output[0].type,'custom_tool_call');assert.equal(result.output[0].namespace,'functions');assert.equal(result.output[0].input,'*** Begin Patch\n*** End Patch');assert.equal(result.output[0]._arguments,undefined);});
test('first-party server tools retain an explicit native fallback and cannot be falsely dispatched',()=>{const {mapping}=responseTools([{type:'web_search'}]);const p=new ResponseProjection('x',()=>{},mapping);assert.throws(()=>p.accept({choices:[{delta:{tool_calls:[{index:0,id:'x',function:{name:'awb_native_web_search',arguments:'{}'}}]}}]}),/原生模型连接/);});
test('Responses stream keeps function identity, exact argument fragments, usage and terminal status',()=>{const events=[],projection=new ResponseProjection('model',e=>events.push(e));projection.start();projection.accept({choices:[{delta:{reasoning_content:'think',tool_calls:[{index:0,id:'call1',function:{name:'read',arguments:'{"path":'}}]},finish_reason:null}]});projection.accept({choices:[{delta:{tool_calls:[{index:0,function:{arguments:'"file"}'}}]},finish_reason:'tool_calls'}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}});const result=projection.finish();assert.equal(result.status,'completed');assert.equal(result.output[1].call_id,'call1');assert.equal(result.output[1].arguments,'{"path":"file"}');assert.equal(result.usage.input_tokens,10);assert.equal(events.at(-1).type,'response.completed');assert.deepEqual(events.map(e=>e.sequence_number),events.map((_,i)=>i));});
test('Responses projection never reports a truncated upstream stream as completed',()=>{const p=new ResponseProjection('x',()=>{});p.start();p.accept({choices:[{delta:{content:'partial'}}]});assert.throws(()=>p.finish(),/terminal/);const truncated=new ResponseProjection('x',()=>{});truncated.accept({choices:[{delta:{content:'partial'},finish_reason:'length'}]});assert.equal(truncated.finish().status,'incomplete');});
test('SSE parser accepts CRLF and multibyte stream fragments',async()=>{const b=Buffer.from('data: {"text":"中文"}\r\n\r\ndata: [DONE]\n\n'),stream=new ReadableStream({start(c){for(let i=0;i<b.length;i++)c.enqueue(b.subarray(i,i+1));c.close();}}),events=[];for await(const value of sse(stream))events.push(value);assert.deepEqual(events,['{"text":"中文"}','[DONE]']);});
