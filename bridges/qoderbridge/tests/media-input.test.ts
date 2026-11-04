import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sdkMediaPrompt} from '../src/media-input.js';
import {conversationPrompt,conversationMessages} from '../src/compat.js';
const data='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3cAAAAASUVORK5CYII=',part={type:'image_url',image_url:{url:'data:image/png;base64,'+data}};
test('Qoder SDK input carries actual images separately from complete role-aware text and stable history markers',()=>{
 const messages=[{role:'user' as const,content:[{type:'text',text:'look'},part]}],text=conversationPrompt({model:'fixture',messages});
 assert.equal(text.includes(data),false);assert.match(text,/sha256=/);const input=sdkMediaPrompt(text,messages);assert.ok(Array.isArray(input));assert.deepEqual(input[1],{type:'image',source:{type:'base64',media_type:'image/png',data}});
 const changed=conversationMessages([{role:'user',content:[{...part,image_url:{url:'data:image/png;base64,YWJjZA=='}}]}]);assert.notDeepEqual(changed,conversationMessages(messages));
 assert.throws(()=>sdkMediaPrompt('x',[{role:'user',content:[{type:'image_url',image_url:{url:'file:///C:/secret.png'}}]}]),/inline/);
 assert.equal(sdkMediaPrompt('plain',[{role:'user',content:'plain'}]),'plain');
});
