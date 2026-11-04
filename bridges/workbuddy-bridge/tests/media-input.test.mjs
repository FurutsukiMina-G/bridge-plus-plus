import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {SdkTransport} from '../src/sdk-transport.mjs';
import {prepareRequest} from '../src/protocol.mjs';
import {sdkMediaPrompt,mediaText} from '../src/media-input.mjs';
const data='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3cAAAAASUVORK5CYII=',part={type:'image_url',image_url:{url:'data:image/png;base64,'+data}};
test('WorkBuddy SDK receives actual image content blocks via async user input, keeps role ordering markers and no base64 in text',async t=>{
 await mkdir('.runtime/tests',{recursive:true});const runtime=await mkdtemp(resolve('.runtime/tests/media-wb-'));let received;
 const transport=new SdkTransport({runtime,cliPath:process.execPath,toolMode:'json'},{get:async()=>({accessToken:'synthetic',uid:'synthetic',domain:'fixture'})},{run:async function*({prompt}){assert.equal(typeof prompt[Symbol.asyncIterator],'function');for await(const message of prompt){received=message.message.content;break;}yield {type:'system',subtype:'init',model:'fixture',session_id:'synthetic',mcp_servers:[]};yield {type:'assistant',message:{model:'fixture',content:[{type:'text',text:'{"action":"final","content":"fixture complete"}'}]}};yield {type:'result',subtype:'success',is_error:false,result:'{"action":"final","content":"fixture complete"}',usage:{input_tokens:2,output_tokens:2}};}});t.after(()=>transport.close());
 const response=await transport.chat({model:'fixture',messages:[{role:'system',content:'system'},{role:'user',content:[{type:'text',text:'look'},part]}],max_tokens:100},new AbortController().signal);assert.match(await response.text(),/fixture complete/);assert.equal(received[1].type,'image');assert.deepEqual(received[1].source,{type:'base64',media_type:'image/png',data});assert.equal(received[0].text.includes(data),false);assert.match(received[0].text,/sha256=/);
});
test('WorkBuddy rejects undeclared models, non-user image parts and remote URLs without starting SDK',()=>{
 const info={id:'fixture',supportsImages:true,publicModels:[{id:'fixture',maxTokens:100,reasoningEfforts:{}}]},body={model:'fixture',messages:[{role:'user',content:[part]}]};
 assert.equal(prepareRequest(body,info).upstream.messages[0].content[0].image_url.url,part.image_url.url);
 assert.throws(()=>prepareRequest(body,{...info,supportsImages:false}),/declared/);assert.throws(()=>prepareRequest({...body,messages:[{role:'assistant',content:[part]}]},info),/user messages/);
 assert.throws(()=>sdkMediaPrompt('text',[{role:'user',content:[{type:'image_url',image_url:{url:'https://example.com/x.png'}}]}]),/inline/);assert.equal(mediaText([part]).includes(data),false);
});
