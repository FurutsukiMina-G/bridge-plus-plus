import {isDeepStrictEqual} from 'node:util';
import type {ChatRequest,Decision,DecisionRepair} from './compat.js';

/** Decode only a whole calls document. Quoted attribute values are literal bytes;
 * backslashes are never XML/JSON escapes in string attributes. */
export function attributeDsmlDecision(source:string,request:ChatRequest,repairs:DecisionRepair[]):Decision|null{
  const root=/^<｜｜DSML｜｜\s*(calls|tool_calls)>/.exec(source);if(!root)return null;
  let at=root[0].length,detected=false;
  type Field={name:string;raw:string;flag?:string;attribute?:boolean};
  const local:DecisionRepair[]=[],calls:Array<{name:string;fields:Field[]}>=[];
  const decode=(call:{name:string;fields:Field[]})=>{
    const provided=request.tools?.filter(t=>t.function.name===call.name)??[],schema=provided.length===1?provided[0]!.function.parameters as {properties?:Record<string,{type?:unknown}>}|undefined:undefined;
    if(provided.length!==1)throw new Error('Attribute DSML contains an undeclared tool');
    const args:Record<string,unknown>={};
    for(const field of call.fields){
      if(field.attribute&&(!schema?.properties||!Object.hasOwn(schema.properties,field.name)))throw new Error('Attribute DSML contains an undeclared parameter');
      const string=field.attribute?schema?.properties?.[field.name]?.type==='string':field.flag==='true'||field.flag===undefined&&schema?.properties?.[field.name]?.type==='string';
      let value:unknown;if(string)value=field.raw;else{try{value=JSON.parse(field.raw.trim());}catch{throw new Error('Attribute DSML non-string parameter is not valid JSON');}}
      if(Object.hasOwn(args,field.name)){if(!isDeepStrictEqual(args[field.name],value))throw new Error(`Duplicate DSML parameter: ${field.name}`);local.push({kind:'identical_parameter',tool:call.name,parameter:field.name});}
      else Object.defineProperty(args,field.name,{value,enumerable:true,writable:true,configurable:true});
      if(field.attribute)local.push({kind:'attribute_parameter',tool:call.name,parameter:field.name});
    }
    return {name:call.name,arguments:args};
  };
  const space=()=>{const start=at;while(at<source.length&&/\s/.test(source[at]!))at++;return at>start;};
  const closeRoot=new RegExp(`^<\\/｜｜DSML｜｜\\s*${root[1]}>`);
  try{
    while(true){
      space();const end=closeRoot.exec(source.slice(at));
      if(end){at+=end[0].length;space();if(at!==source.length||!calls.length)throw new Error('Attribute DSML has extra or empty call data');if(!detected)return null;const decoded=calls.map(decode);repairs.push(...local);return decoded.length===1?{kind:'tool_call',...decoded[0]!}:{kind:'tool_calls',calls:decoded};}
      const invoke=/^<｜｜DSML｜｜\s*invoke\s+name="([^"<>\r\n]+)"\s*>/.exec(source.slice(at));
      if(!invoke)throw new Error('Attribute DSML invocation opener is missing');at+=invoke[0].length;
      const name=invoke[1]!,fields:Field[]=[];
      while(true){
        space();const tail=source.slice(at),close=/^<\/｜｜DSML｜｜\s*invoke\s*>/.exec(tail);
        if(close){at+=close[0].length;break;}
        if(/^<｜｜DSML｜｜\s*invoke\s+name="/.test(tail)||closeRoot.test(tail)){
          if(!fields.length)throw new Error('Attribute DSML invocation is empty');
          local.push({kind:'implicit_invoke_close',tool:name,parameter:'invoke'});break;
        }
        const parameter=/^<｜｜DSML｜｜\s*parameter\s+name="([^"<>]+)"(?:\s+string="(true|false)")?\s*>/.exec(tail);
        if(parameter){
          at+=parameter[0].length;const end=/<\/｜｜DSML｜｜\s*parameter\s*>/.exec(source.slice(at));if(!end)throw new Error('Attribute DSML standard parameter is incomplete');
          fields.push({name:parameter[1]!,raw:source.slice(at,at+end.index),flag:parameter[2]});at+=end.index+end[0].length;continue;
        }
        const marker=/^<｜｜DSML｜｜\s+(?=[^\s=<>"｜]+\s*=)/.exec(tail);
        if(!marker)throw new Error('Attribute DSML parameter boundary is invalid');
        // Legacy shorthand name/parameter markers are a different complete grammar.
        if(!tail.includes('｜｜DSML｜｜>'))throw new Error('Attribute DSML closing marker is missing');
        detected=true;at+=marker[0].length;
        while(true){
          space();const field=/^([^\s=<>"｜]+)\s*=\s*"/.exec(source.slice(at));if(!field)throw new Error('Attribute DSML parameter name/quote is missing');
          at+=field[0].length;const end=source.indexOf('"',at);if(end<0)throw new Error('Attribute DSML value quote is incomplete');
          const raw=source.slice(at,end);at=end+1;fields.push({name:field[1]!,raw,attribute:true});
          const spaced=space();
          if(source.startsWith('｜｜DSML｜｜',at)){at+='｜｜DSML｜｜'.length;space();if(source[at]==='>'){at++;break;}}
          else if(!spaced)throw new Error('Attribute DSML has ambiguous quoted value or separator');
        }
      }
      calls.push({name,fields});
    }
  }catch(error){if(detected)throw error;return null;}
}
