import {createHash} from 'node:crypto';
export function imageSource(part){
  if(part?.type!=='image_url')return null;
  const m=/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(part.image_url?.url??'');
  if(!m||m[2].length>11184812||m[2].length%4)throw new Error('Only bounded inline base64 images are supported');
  return {type:'image',source:{type:'base64',media_type:m[1],data:m[2]}};
}
export function mediaText(content){return Array.isArray(content)?content.map(p=>{const image=imageSource(p);return image?`[Attached image sha256=${createHash('sha256').update(image.source.data).digest('hex')}]`:p.text;}).join('\n'):content;}
export const promptMessages=messages=>messages.map(m=>({...m,content:mediaText(m.content)}));
export function sdkMediaPrompt(text,messages){const images=messages.flatMap(m=>m.role==='user'&&Array.isArray(m.content)?m.content.flatMap(p=>imageSource(p)?[imageSource(p)]:[]):[]);return images.length?[{type:'text',text},...images]:text;}
