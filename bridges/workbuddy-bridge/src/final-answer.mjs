import Ajv from 'ajv';
import {BridgeError} from './errors.mjs';
import {parseJsonText} from './json-text.mjs';
import {leakedProtocol} from './protocol-text.mjs';
export const hasUsableTools=body=>!!body.tools?.length&&body.tool_choice!=='none';
export const answerInstructions=body=>'Return the final answer directly, following the original conversation role priorities. Do not add a bridge envelope. '+(body.response_format?'Return a complete JSON document matching response_format: '+JSON.stringify(body.response_format):'Reply exactly as the conversation above instructs.');
export function finalAnswer(text,body,onRepair=()=>{}){
  if(!String(text).trim())throw new BridgeError(502,'invalid_decision','WorkBuddy returned an empty answer');
  let value,repairs=[];const trimmed=text.trim(),source=trimmed.startsWith('<{')?trimmed.slice(1):trimmed;
  if(leakedProtocol(trimmed))throw new BridgeError(502,'tools_disabled','Host tools are disabled for this answer');
  try{const decoded=parseJsonText(source);value=decoded.value;repairs=decoded.repairs;}catch{
    if(/^\s*<?\{\s*"action"\s*:/.test(trimmed))throw new BridgeError(502,'invalid_decision','Incomplete answer envelope');
  }
  if(value&&typeof value==='object'&&!Array.isArray(value)){
    if(value.action==='final'&&typeof value.content==='string'&&Object.keys(value).every(k=>['action','content'].includes(k))){
      text=value.content;if(leakedProtocol(text))throw new BridgeError(502,'invalid_decision','Tool protocol cannot be returned as final text');
      repairs.forEach(onRepair);
    }
    else if(value.action==='tool_calls')throw new BridgeError(502,'tools_disabled','This answer must not contain a bridge invocation envelope');
  }
  const format=body.response_format;
  if(['json_object','json_schema'].includes(format?.type)){
    try{
      const document=JSON.parse(text);
      if(format.type==='json_object'&&(!document||typeof document!=='object'||Array.isArray(document)))throw new Error();
      if(format.type==='json_schema'&&format.json_schema?.schema!==undefined&&!new Ajv({strict:false,validateFormats:false}).validate(format.json_schema.schema,document))throw new Error();
    }catch{throw new BridgeError(502,'invalid_decision','Answer violates response_format');}
  }
  return text;
}
