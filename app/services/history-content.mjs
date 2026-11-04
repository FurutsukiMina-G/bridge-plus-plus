import {createHash} from 'node:crypto';
import {decodeMediaData,detectMedia} from './media.mjs';
const media=new Set(['input_image','image_url','image','input_audio','audio','input_video','video_url','video','input_file','file','document']);
/** Text-only transport fallback. Retain an explicit omission and a complete
 * digest; never fetch URLs, infer pixels, or claim that a media file was read. */
export function historyText(content,onOmission=()=>{},images=false){
  if(content==null)return '';
  if(typeof content==='string')return content;
  if(!Array.isArray(content))throw new Error('Message content must be text or content parts');
  const parts=content.map(part=>{
    if(['text','input_text','output_text'].includes(part?.type)&&typeof part.text==='string')return part.text;
    if(images&&['input_image','image_url','image'].includes(part?.type)){
      const url=part.image_url?.url??(typeof part.image_url==='string'?part.image_url:null)??part.url??(part.source?.type==='base64'?`data:${part.source.media_type};base64,${part.source.data}`:null);
      const match=typeof url==='string'&&/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(url);
      if(!match)throw new Error('图片透传仅接受已内联的 base64 图片；不读取远程地址或任意本地路径');
      const ext={png:'png',jpeg:'jpg',gif:'gif',webp:'webp'}[match[1].split('/')[1]],bytes=decodeMediaData(match[2]);if(bytes.length>8*1024*1024)throw new Error('图片超过 8 MiB');detectMedia('image.'+ext,bytes);
      return {type:'image_url',image_url:{url}};
    }
    if(media.has(part?.type)){
      const json=JSON.stringify(part),hash=createHash('sha256').update(json).digest('hex');onOmission(part.type);
      return `[Bridge++ omitted ${part.type}: this bridge transport accepts text only; media was NOT inspected. sha256=${hash}]`;
    }
    throw new Error('Unsupported message content part: '+String(part?.type));
  });
  return parts.some(p=>typeof p==='object')?parts.map(p=>typeof p==='string'?{type:'text',text:p}:p):parts.join('\n');
}
export function textHistory(messages,images=false){
  const omitted=new Set();if(!Array.isArray(messages))throw new Error('messages must be an array');
  const result=messages.map(message=>({...message,content:historyText(message.content,type=>omitted.add(type),images&&message.role==='user')}));
  return {messages:result,omitted:[...omitted]};
}
