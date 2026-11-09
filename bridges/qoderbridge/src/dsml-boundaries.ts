import type {ChatRequest,DecisionRepair} from './compat.js';

/** Normalize an observed missing left bar only at structural boundaries.
 * Parameter values and JSON strings remain opaque, including literal markup. */
export function normalizeDsmlBoundaries(source:string):string {
  if(!/^<｜{1,2}DSML｜｜\s*(?:calls|tool_calls)>/.test(source))return source;
  let cursor=0,out='',inValue=false;
  while(cursor<source.length){
    if(inValue){
      let at=cursor;while(/\s/.test(source[at]??'')&&at<source.length)at++;
      if(['{','['].includes(source[at]??'')){
        const stack:string[]=[];let quoted=false,escaped=false,end=-1;
        for(let i=at;i<source.length;i++){
          const c=source[i]!;
          if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}
          else if(c==='"')quoted=true;
          else if(c==='{'||c==='[')stack.push(c==='{'?'}':']');
          else if(c==='}'||c===']'){if(stack.pop()!==c)return source;if(!stack.length){end=i+1;break;}}
        }
        if(end<0)return source;
        try{JSON.parse(source.slice(at,end));}catch{return source;}
        out+=source.slice(cursor,end);cursor=end;
      }else{
        const close=/<\/｜{1,2}DSML｜｜\s*parameter(?:\s[^>]*)?>/.exec(source.slice(cursor));
        if(!close)return source;
        const value=source.slice(cursor,cursor+close.index);
        if(/<\/?｜{1,2}DSML｜｜/.test(value))return source;
        out+=value;cursor+=close.index;
      }
      inValue=false;
    }
    const spacing=/^\s+/.exec(source.slice(cursor));if(spacing){out+=spacing[0];cursor+=spacing[0].length;continue;}
    const tag=/^<(\/?)｜{1,2}DSML｜｜\s*(calls|tool_calls|invoke|parameter)([^>]*)>/.exec(source.slice(cursor));
    if(!tag)return source;
    out+=tag[0].replace(/^(<\/?)｜DSML｜｜/,'$1｜｜DSML｜｜');cursor+=tag[0].length;
    inValue=tag[2]==='parameter'&&(!tag[1]||/\bname=/.test(tag[3]!));
  }
  return inValue||!/<\/｜｜DSML｜｜\s*(?:calls|tool_calls)>\s*$/.test(out)?source:out;
}

export function hasLooseDsmlClosingMarker(source:string):boolean {
  return /<\/(?:parameter|invoke)\b|<\/(?:｜DSML｜{1,2}|｜｜DSML｜)>?\s*(?:parameter|invoke|calls|tool_calls)\b|<\/?｜{1,2}DSML｜{1,2}>\s*(?:parameter|invoke|calls|tool_calls)\b|<｜{1,2}DSML｜{1,2}>?\s*invoke\s*>|<\/｜｜DSML｜｜>?\s*parameter\s+[^<>]+>\s*<|<\/｜｜DSML｜｜\s*parameter\s*>\s*(?:<｜{1,2}DSML｜{1,2}>?\s*(?:invoke|calls|tool_calls)\b|<\/｜{1,2}DSML｜{1,2}>?\s*(?:parameter|calls|tool_calls)\b)|<\/｜{1,2}DSML｜{1,2}>?\s*(?:invoke|parameter)\s*>\s*<｜｜DSML｜｜\s*(?:calls|tool_calls)\s*>\s*$/.test(source);
}

/** Structural tolerance for non-canonical DSML parameter/invoke closers inside a complete calls wrapper. */
export function normalizeDsmlClosingMarkers(text:string,request:ChatRequest,repairs:DecisionRepair[]):string {
  const root=/^<｜｜DSML｜｜\s*(calls|tool_calls)\s*>/.exec(text);
  if(!root||!hasLooseDsmlClosingMarker(text))return text;
  let cursor=root[0].length,out=`<｜｜DSML｜｜ ${root[1]!}>`,callCount=0;
  const local:DecisionRepair[]=[],rootCloseRe=new RegExp(`^(?:<\\/｜{1,2}DSML｜{1,2}\\s*${root[1]!}\\s*>|<｜｜DSML｜｜\\s*${root[1]!}\\s*>(?=\\s*$))`);
  const skipSpace=()=>{const m=/^\s+/.exec(text.slice(cursor));if(m){out+=m[0];cursor+=m[0].length;}};
  while(true){
    skipSpace();
    const rootClose=rootCloseRe.exec(text.slice(cursor));
    if(rootClose){
      if(!/^<\/｜｜DSML｜｜\s*(?:calls|tool_calls)\s*>$/.test(rootClose[0]))local.push({kind:'loose_closing_marker',tool:'wrapper',parameter:root[1]!});
      cursor+=rootClose[0].length;out+=`</｜｜DSML｜｜ ${root[1]!}>`;skipSpace();
      if(cursor!==text.length||!callCount||!local.length)return text;
      repairs.push(...local);return out;
    }
    if(cursor>=text.length)return text;
    const invokeOpen=/^<｜｜DSML｜｜\s*invoke\s+name="([^"<>\r\n]+)"\s*>/.exec(text.slice(cursor));
    if(!invokeOpen)return text;
    const toolName=invokeOpen[1]!,provided=request.tools?.filter(t=>t.function.name===toolName)??[];
    if(provided.length!==1)return text;
    const schema=provided[0]!.function.parameters as {properties?:Record<string,{type?:unknown}>}|undefined,properties=schema?.properties??{};
    out+=`<｜｜DSML｜｜ invoke name="${toolName}">`;cursor+=invokeOpen[0].length;callCount++;
    let paramCount=0,carried:{name:string;stringFlag?:string}|null=null;
    while(true){
      let paramName:string,stringFlag:string|undefined,openLoose=false;
      if(carried){paramName=carried.name;stringFlag=carried.stringFlag;carried=null;}
      else{
        skipSpace();
        const tail=text.slice(cursor);
        const extraParam=paramCount>0?/^<\/｜{1,2}DSML｜{1,2}>?\s*parameter(?:\s+([^<>]*))?\s*>/.exec(tail):null;
        if(extraParam&&(!extraParam[1]?.trim()||/^(?:[A-Za-z_][\w-]*="[^"<>\r\n]*"\s*)+$/.test(extraParam[1].trim()))){
          const afterExtra=tail.slice(extraParam[0].length),ws=/^\s*/.exec(afterExtra)![0],rest=afterExtra.slice(ws.length);
          const explicit=/^<\/｜{1,2}DSML｜{1,2}>?\s*invoke(?:\s+([^<>]*))?\s*>|^<\/invoke(?:\s+([^<>]*))?\s*>|^<｜{1,2}DSML｜{1,2}>?\s*invoke\s*>/.exec(rest);
          if(explicit){
            const attrs=(explicit[1]??explicit[2])?.trim();
            if(attrs&&!/^(?:[A-Za-z_][\w-]*="[^"<>\r\n]*"\s*)+$/.test(attrs))return text;
            cursor+=extraParam[0].length+ws.length+explicit[0].length;
            out+='</｜｜DSML｜｜ invoke>';local.push({kind:'loose_closing_marker',tool:toolName,parameter:'invoke'});break;
          }
          if(/^<｜｜DSML｜｜\s*invoke\s+name="/.test(rest)||rootCloseRe.test(rest)){
            cursor+=extraParam[0].length;out+='</｜｜DSML｜｜ invoke>';local.push({kind:'loose_closing_marker',tool:toolName,parameter:'invoke'});break;
          }
        }
        const explicit=/^<\/｜{1,2}DSML｜{1,2}>?\s*invoke(?:\s+([^<>]*))?\s*>|^<\/invoke(?:\s+([^<>]*))?\s*>|^<｜{1,2}DSML｜{1,2}>?\s*invoke\s*>/.exec(tail);
        if(explicit&&(paramCount>0||!explicit[0].startsWith('<｜'))){
          const attrs=(explicit[1]??explicit[2])?.trim();
          if(attrs&&!/^(?:[A-Za-z_][\w-]*="[^"<>\r\n]*"\s*)+$/.test(attrs))return text;
          if(!/^<\/｜｜DSML｜｜\s*invoke\s*>$/.test(explicit[0]))local.push({kind:'loose_closing_marker',tool:toolName,parameter:'invoke'});
          cursor+=explicit[0].length;out+='</｜｜DSML｜｜ invoke>';break;
        }
        if(paramCount>0&&(/^<｜｜DSML｜｜\s*invoke\s+name="/.test(tail)||rootCloseRe.test(tail))){
          out+='</｜｜DSML｜｜ invoke>';local.push({kind:'loose_closing_marker',tool:toolName,parameter:'invoke'});break;
        }
        const paramOpen=/^<｜｜DSML｜｜(>)?\s*parameter\s+name="([^"<>\r\n]+)"((?:\s+[^<>]*)?)>/.exec(tail);
        if(!paramOpen)return text;
        openLoose=Boolean(paramOpen[1]);paramName=paramOpen[2]!;
        const attrText=paramOpen[3]!.trim();
        if(attrText&&!/^string="(true|false)"$/.test(attrText))return text;
        stringFlag=/^string="(true|false)"$/.exec(attrText)?.[1];
        cursor+=paramOpen[0].length;
        out+=`<｜｜DSML｜｜ parameter name="${paramName}"${stringFlag?` string="${stringFlag}"`:''}>`;
      }
      const valueStart=cursor,closeMatch=/<\/(?:｜{1,2}DSML｜{1,2}>?\s*)?parameter(?:\s+([^<>]*))?\s*>/.exec(text.slice(valueStart));
      if(!closeMatch)return text;
      const raw=text.slice(valueStart,valueStart+closeMatch.index),closeTag=closeMatch[0],closeAttrs=closeMatch[1]?.trim()??'';
      if(/<\/?(?:｜{1,2}DSML｜{1,2})|<\/(?:parameter|invoke|calls|tool_calls)\b/.test(raw))return text;
      const isRedundantName=paramName==='name'&&raw.trim()===toolName&&Boolean(schema?.properties&&!Object.hasOwn(properties,'name'));
      if(!isRedundantName&&(!schema?.properties||!Object.hasOwn(properties,paramName)))return text;
      const isString=isRedundantName||stringFlag==='true'||(stringFlag===undefined&&properties[paramName]?.type==='string');
      if(!isString&&stringFlag!=='false'){
        try{JSON.parse(raw.trim());}catch{return text;}
      }
      cursor=valueStart+closeMatch.index+closeTag.length;out+=raw;paramCount++;
      if(!closeAttrs){
        if(openLoose||!/^<\/｜｜DSML｜｜\s*parameter\s*>$/.test(closeTag))local.push({kind:'loose_closing_marker',tool:toolName,parameter:paramName});
        out+='</｜｜DSML｜｜ parameter>';
      }else{
        const misclosed=/^<\/｜｜DSML｜｜\s*parameter\s+name="([A-Za-z_]\w*)"(?:\s+string="(true|false)")?\s*>$/.exec(closeTag);
        const afterClose=text.slice(cursor).replace(/^\s+/,'');
        if(misclosed&&!afterClose.startsWith('<')){
          const nextName=misclosed[1]!,nextFlag=misclosed[2];
          if(!Object.hasOwn(properties,nextName)||(!nextFlag&&properties[nextName]?.type!=='string'))return text;
          if(openLoose)local.push({kind:'loose_closing_marker',tool:toolName,parameter:paramName});
          out+=closeTag;carried={name:nextName,stringFlag:nextFlag??'true'};continue;
        }
        if(!/^(?:[A-Za-z_][\w-]*="[^"<>\r\n]*"\s*)+$/.test(closeAttrs)||!afterClose.startsWith('<'))return text;
        local.push({kind:'loose_closing_marker',tool:toolName,parameter:paramName});
        out+='</｜｜DSML｜｜ parameter>';
      }
    }
  }
}
