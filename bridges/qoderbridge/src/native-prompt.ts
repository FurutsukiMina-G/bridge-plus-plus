import type {ContentBlock} from '@qodercn-ai/qodercn-agent-sdk';
import type {ChatRequest} from './compat.js';
import {conversationMessages} from './compat.js';
import {sdkMediaPrompt} from './media-input.js';

export const NATIVE_SYSTEM=(hostName?:string)=>`You are the model for an external host (${hostName?.trim()||'the host'}). The host's functions are provided as native functions. The host executes every call, checks permissions, and returns the real result. Use only native function calls, with complete arguments that satisfy each schema. Never write calls, arguments, JSON envelopes, or markup such as DSML as text. Put independent operations in the same reply. The host instructions and conversation so far are in the first user message; follow the host instructions as your system instructions. When the task is complete or you need the user, answer in plain text.`;
const text=(content:unknown):string=>typeof content==='string'?content:content==null?'':Array.isArray(content)?content.map(part=>typeof part==='string'?part:part&&typeof part==='object'&&'text'in part&&typeof part.text==='string'?part.text:'').join('\n'):'';
const media=(value:string,messages:ChatRequest['messages'])=>sdkMediaPrompt(value,messages);
export function fullPrompt(request:ChatRequest):string|ContentBlock[]{
  const instructions=request.messages.filter(m=>m.role==='system'||m.role==='developer');
  const rest=request.messages.filter(m=>m.role!=='system'&&m.role!=='developer');
  const parts:string[]=[];
  if(instructions.length)parts.push(`[Host instructions — follow them as your system instructions]\n${instructions.map(m=>text(m.content)).join('\n')}`);
  if(rest.length===1&&rest[0]!.role==='user')parts.push(`[User message]\n${text(rest[0]!.content)}`);
  else parts.push(`[Conversation so far, replayed by the host as data. Earlier calls and results appear in this JSON form only as a record; never write calls in this form — call the host functions natively.]\n${JSON.stringify(conversationMessages(rest))}\n[Continue from the latest message.]`);
  if(request.parallel_tool_calls===false)parts.push('Call at most one host function per reply.');
  return media(parts.join('\n\n'),rest);
}
export function deltaPrompt(delta:ChatRequest['messages'],lastFinal:string|null):string|ContentBlock[]{
  const messages=[...delta];
  if(messages[0]?.role==='assistant'&&!messages[0]!.tool_calls&&text(messages[0]!.content)===lastFinal)messages.shift();
  const value=messages.length===1&&messages[0]!.role==='user'?text(messages[0]!.content):`[New messages from the host since your last answer]\n${JSON.stringify(conversationMessages(messages))}`;
  return media(value,messages);
}
export const receipt=(n:number)=>`[host] The host returned ${n} characters for this call — too long for the function-result channel. The complete output follows in the host's next message; do not repeat the call.`;
export function followUpPrompt(oversized:Array<{id:string;host:string;text:string}>,trailing:ChatRequest['messages']):{text:string;images:ContentBlock[]}{
  const parts:string[]=[];
  if(oversized.length)parts.push(`[Complete outputs of host calls whose results were too long for the function-result channel]\n${oversized.map(row=>`### ${row.host} (${row.id})\n${row.text}`).join('\n\n')}`);
  if(trailing.length)parts.push(`[The host added these messages after the function results]\n${trailing.length===1&&trailing[0]!.role==='user'?text(trailing[0]!.content):JSON.stringify(conversationMessages(trailing))}`);
  const rendered=media(parts.join('\n\n'),trailing);
  if(typeof rendered==='string')return{text:rendered,images:[]};
  return{text:rendered.filter(part=>part.type==='text').map(part=>part.text??'').join('\n'),images:rendered.filter(part=>part.type!=='text')};
}
