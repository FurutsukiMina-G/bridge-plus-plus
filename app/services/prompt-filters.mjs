const billingLine=/^[ \t]*x-anthropic-billing-header:[^\r\n]*(?:\r\n|\n|\r)?/gim;
const clean=text=>text.replace(billingLine,'');
export const stripBillingLines=clean;
export function stripBillingHeader(messages){
  let changed=false;const result=[];
  for(const message of messages){
    if(!['system','developer'].includes(message?.role)){result.push(message);continue;}
    if(typeof message.content==='string'){
      const content=clean(message.content);if(content===message.content){result.push(message);continue;}
      changed=true;if(content)result.push({...message,content});continue;
    }
    if(!Array.isArray(message.content)){result.push(message);continue;}
    let hit=false;const content=[];
    for(const part of message.content){
      if(part?.type!=='text'||typeof part.text!=='string'){content.push(part);continue;}
      const text=clean(part.text);if(text===part.text){content.push(part);continue;}
      hit=true;if(text)content.push({...part,text});
    }
    if(!hit){result.push(message);continue;}changed=true;if(content.length)result.push({...message,content});
  }
  return changed?result:messages;
}
