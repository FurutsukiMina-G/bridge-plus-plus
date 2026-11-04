import {createHash} from 'node:crypto';
import type {ContentBlock} from '@qodercn-ai/qodercn-agent-sdk';
export function imageSource(part:unknown):ContentBlock|null {
  const p=part as {type?:string;image_url?:{url?:string}};
  if(p?.type!=='image_url')return null;
  const m=/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(p.image_url?.url??'');
  if(!m||m[2]!.length>11184812||m[2]!.length%4)throw new Error('Only bounded inline base64 images are supported');
  return {type:'image',source:{type:'base64',media_type:m[1],data:m[2]}} as ContentBlock;
}
export function imageMarker(part:unknown){const image=imageSource(part);return image?`[Attached image sha256=${createHash('sha256').update(JSON.stringify(image)).digest('hex')}]`:null;}
export function sdkMediaPrompt(text:string,messages:Array<{role:string;content?:unknown}>):string|ContentBlock[]{const images=messages.flatMap(m=>m.role==='user'&&Array.isArray(m.content)?m.content.flatMap(p=>{const image=imageSource(p);return image?[image]:[];}):[]);return images.length?[{type:'text',text},...images]:text;}
