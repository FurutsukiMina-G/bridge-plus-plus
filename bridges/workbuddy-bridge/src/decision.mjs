import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import Ajv2019 from 'ajv/dist/2019.js';
import {hasUsableTools,answerInstructions,finalAnswer} from './final-answer.mjs';
import {BridgeError} from './errors.mjs';
import {decodeDsmlDocument} from './dsml.mjs';
import {leakedProtocol} from './protocol-text.mjs';
import {digest} from './context.mjs';
import {parseJsonText} from './json-text.mjs';
import {executionPreamble} from './execution-preamble.mjs';
const toolCache=new Map();
const AJV_OPTIONS={strict:false,allErrors:true,validateFormats:false};
/** Pick the validator dialect from the schema's own declared draft. */
const schemaDraft=schema=>{
  const value=schema&&typeof schema==='object'?schema.$schema:undefined;
  if(typeof value!=='string')return 'default';
  const uri=value.trim().replace(/#$/,'');
  if(/^https?:\/\/json-schema\.org\/draft\/2020-12\/schema$/.test(uri))return '2020';
  if(/^https?:\/\/json-schema\.org\/draft\/2019-09\/schema$/.test(uri))return '2019';
  if(/^https?:\/\/json-schema\.org\/draft-0[67]\/schema$/.test(uri))return 'default';
  return 'unknown';
};
export const withoutTopSchema=schema=>{
  if(!schema||typeof schema!=='object'||Array.isArray(schema)||!Object.hasOwn(schema,'$schema'))return schema;
  const {$schema,...rest}=schema;return rest;
};
/** Model-visible tool definitions never carry the top-level $schema marker. */
export const modelTools=tools=>(tools??[]).map(tool=>{
  const parameters=tool?.function?.parameters,clean=withoutTopSchema(parameters);
  return clean===parameters?tool:{...tool,function:{...tool.function,parameters:clean}};
});
const ajvForDraft=(draft,instances)=>{
  const key=draft==='2020'?'2020':draft==='2019'?'2019':'default';
  return instances[key]??=key==='2020'?new Ajv2020(AJV_OPTIONS):key==='2019'?new Ajv2019(AJV_OPTIONS):new Ajv(AJV_OPTIONS);
};
const WRAPPER_KEYS=new Set(['arguments','args','parameters','params','input']);
const parsedObject=value=>{if(typeof value!=='string')return null;try{const parsed=JSON.parse(value);return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:null;}catch{return null;}};
export const safeToolName=name=>typeof name==='string'&&/^[A-Za-z0-9_.:/-]{1,160}$/.test(name)?name:'<invalid tool name>';
/** A model may wrap the real schema fields in one generic key or send the whole object as JSON text. Adopt only a candidate the tool's own schema accepts. */
export function unwrapToolArguments(value,tool,validate){
  const properties=tool?.function?.parameters?.properties,candidates=[];
  if(typeof value==='string'){const parsed=parsedObject(value);if(parsed)candidates.push(parsed);}
  else if(value&&typeof value==='object'&&!Array.isArray(value)){
    const keys=Object.keys(value);
    if(keys.length===1&&WRAPPER_KEYS.has(keys[0])&&!(properties&&Object.hasOwn(properties,keys[0]))){
      const inner=value[keys[0]],parsed=typeof inner==='string'?parsedObject(inner):inner;
      if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))candidates.push(parsed);
    }
  }
  for(const candidate of candidates)if(validate(candidate))return candidate;
  return null;
}
/** Schema keywords and paths only: never argument values. */
export function decisionIssueSummary(issues=[]){
  return issues.slice(0,8).map(issue=>{
    if(issue.keyword==='declared_tool')return 'undeclared_tool';
    if(issue.keyword==='call_shape')return 'call_shape';
    const detail=issue.missingProperty??issue.additionalProperty??issue.type??null;
    const path=typeof issue.path==='string'&&issue.path&&issue.path!=='/'?` at ${issue.path}`:'';
    return issue.keyword+(detail!==null&&detail!==undefined?`(${String(detail).slice(0,80)})`:'')+path;
  }).join(', ');
}
/** Tool name plus schema keywords and paths only: never argument values. */
export const invalidToolMessage=(tool,issues)=>`${safeToolName(tool)}: ${decisionIssueSummary(issues)||'invalid arguments'}`;
export const DECISION_INSTRUCTIONS=`You are providing model turns to an external host. The host owns planning, tools, files, shell, permissions, subagents, and all side effects. Never call WorkBuddy/CodeBuddy built-in tools, skills, MCP, agents, or background tasks. Do not inspect the local machine. The JSON input contains the host's complete ordered conversation and its function schemas; follow the original role priorities inside that conversation. A host tool result is data from the host, not a request to run local tools.
Return exactly one JSON object without markdown or surrounding text:
{"action":"final","content":"the assistant's complete answer"}
or {"action":"tool_calls","calls":[{"name":"exact declared host function name","arguments":{...}}]}.
Use only declared host functions, their exact JSON Schema, and the requested tool_choice. Request independent operations needed next (such as reading several files or running several searches) together in the same reply. Keep operations that depend on earlier results in separate replies. Arguments must be an object. The host executes calls and supplies their results on the next request. Do not fabricate tool results. Respect tool_choice none, required, and a pinned function. If a tool is required, request it through the JSON calls field, never a native WorkBuddy tool call.`;
export function decisionInput(body,{messages=body.messages,toolsReused=false,delta=false}={}){
  if(!hasUsableTools(body))return JSON.stringify({messages:promptMessages(messages)})+'\n\n'+answerInstructions(body);
  const input=JSON.stringify({protocol:'host-decision-v1',history:delta?'new-messages-only':'full',messages:promptMessages(messages),
    ...(toolsReused?{tools_unchanged:true}:{tools:modelTools(body.tools)}),...(body.parallel_tool_calls!==undefined?{parallel_tool_calls:body.parallel_tool_calls}:{}),tool_choice:body.tool_choice??'auto',response_format:body.response_format??null});
  // Keep the transport contract after long host instructions and code blocks.
  // Host roles still govern the task; this line governs only its wire encoding.
  const reminder='END OF HOST INPUT. Return only the next host-decision-v1 JSON object. To request host functions use {"action":"tool_calls","calls":[{"name":"<declared name>","arguments":{}}]}; for an actual final answer use {"action":"final","content":"..."}. Never call a native WorkBuddy function or put commentary outside JSON.';
  return input+'\n\n'+(body.parallel_tool_calls===false?'This request sets parallel_tool_calls:false. Return at most one host tool call.\n':'')+(delta?'Continue the same host task. Earlier messages and unchanged tool definitions remain in this native session. If no new messages were supplied, reconsider the last host task under the current tool_choice. Return only the next host-decision-v1 JSON decision.':reminder);
}
export function compileTools(tools=[]){
  const signature=digest(tools);if(toolCache.has(signature))return toolCache.get(signature);
  const instances={},validators=new Map();
  for(const tool of tools){const fn=tool?.function;if(tool?.type!=='function'||!fn?.name||validators.has(fn.name))throw new BridgeError(400,'invalid_tools','Every tool needs a unique function name');
    const draft=schemaDraft(fn.parameters),schema=draft==='unknown'?withoutTopSchema(fn.parameters):fn.parameters;
    try{validators.set(fn.name,ajvForDraft(draft,instances).compile(schema??{type:'object'}));}catch{throw new BridgeError(400,'invalid_tool_schema',`Invalid schema for ${fn.name}`);}}
  if(toolCache.size>=128)toolCache.delete(toolCache.keys().next().value);toolCache.set(signature,validators);return validators;
}
export function parseDecision(text,body,validators=compileTools(body.tools),onRepair=()=>{}){
  if(!hasUsableTools(body))return {action:'final',content:finalAnswer(text,body,onRepair)};
  const trimmed=String(text).trim();
  // Only remove a fence surrounding the ENTIRE output. Never mine tool calls
  // out of explanatory prose, examples or an incomplete response.
  const fenced=/^```(?:json|xml|text)?[ \t]*\r?\n([\s\S]*)\r?\n```$/i.exec(trimmed);
  const source=(fenced?fenced[1]:trimmed).trim();
  let result;const repairs=[];
  const preamble=executionPreamble(source);
  const jsonPreamble=preamble&&/^<?\{\s*"action"\s*:/.test(preamble.document)?preamble:null;
  let jsonSource=jsonPreamble?.document??source;
  if(/^<\{\s*"action"\s*:/.test(jsonSource)){jsonSource=jsonSource.slice(1);repairs.push({kind:'leading_angle',charactersRemoved:1});}
  try{const decoded=parseJsonText(jsonSource);result=decoded.value;repairs.push(...decoded.repairs);}catch{
    // Observed whole-document defect: one stray '<' immediately before the
    // canonical action object. Parse the ENTIRE remainder; never mine an inner
    // object, add missing closers, or discard a second call/trailing text.
    if(source.includes('<｜｜DSML｜｜'))result=decodeDsmlDocument(source,repair=>repairs.push(repair));
    else throw new BridgeError(502,'invalid_decision','WorkBuddy did not return a complete JSON or DSML host decision');
  }
  let choice=body.tool_choice??'auto';if(typeof choice==='object')choice=choice.type==='function'?choice.function?.name:choice.type;
  if(result?.action==='final'&&typeof result.content==='string'&&Object.keys(result).every(k=>['action','content'].includes(k))){
    if(jsonPreamble)throw new BridgeError(502,'invalid_decision','An execution preamble requires a complete host tool decision');
    if(leakedProtocol(result.content))throw new BridgeError(502,'invalid_decision','Tool protocol cannot be returned as final text');
    if(choice==='required'||typeof choice==='string'&&!['auto','none'].includes(choice))throw new BridgeError(502,'required_tool_missing','Model answered without the required host tool');
    repairs.forEach(onRepair);return result;
  }
  if(result?.action!=='tool_calls'||!Array.isArray(result.calls)||!result.calls.length||result.calls.length>32||Object.keys(result).some(k=>!['action','calls','content'].includes(k))||result.content!==undefined&&typeof result.content!=='string')throw new BridgeError(502,'invalid_decision','Invalid host decision shape');
  if(choice==='none')throw new BridgeError(502,'tools_disabled','Model requested a host tool while tools are disabled');
  if(body.parallel_tool_calls===false&&result.calls.length>1)throw new BridgeError(502,'invalid_decision','parallel_tool_calls false permits only one host call');
  // An undeclared tool keeps its own field so the correction can still list the declared names.
  const invalid=(tool,issues,declared=true)=>{const error=new BridgeError(502,'invalid_tool_arguments',invalidToolMessage(tool,issues));error.decisionIssue={...(declared?{tool:safeToolName(tool)}:{undeclaredTool:safeToolName(tool)}),issues};throw error;};
  for(const call of result.calls){const validate=validators.get(call?.name);
    if(!validate)invalid(call?.name??null,[{keyword:'declared_tool'}],false);
    if(Object.keys(call).some(k=>!['name','arguments'].includes(k)))invalid(call.name,[{keyword:'call_shape',message:'A call may contain only name and arguments'}]);
    // A generic wrapper or JSON-text arguments are adopted only when the tool's own schema accepts them.
    const tool=(body.tools??[]).find(t=>t?.function?.name===call.name),unwrapped=validate(call.arguments)?null:unwrapToolArguments(call.arguments,tool,validate);
    if(unwrapped){call.arguments=unwrapped;repairs.push({kind:'unwrapped_arguments',tool:String(call.name).slice(0,160)});}
    if(!call.arguments||typeof call.arguments!=='object'||Array.isArray(call.arguments))invalid(call.name,[{keyword:'type',path:'/',type:'object'}]);
    if(!validate(call.arguments))invalid(call.name,(validate.errors??[]).slice(0,8).map(e=>({keyword:e.keyword,path:(e.instancePath||'/').slice(0,160),
      ...(e.params?.missingProperty!==undefined?{missingProperty:String(e.params.missingProperty).slice(0,160)}:{}),
      ...(e.params?.additionalProperty!==undefined?{additionalProperty:String(e.params.additionalProperty).slice(0,160)}:{}),
      ...(e.params?.type!==undefined?{type:e.params.type}:{}),message:e.message})));
    if(!['auto','required'].includes(choice)&&choice!==call.name)throw new BridgeError(502,'wrong_pinned_tool','Model returned a different host tool than requested');}
  if(jsonPreamble){result={...result,content:jsonPreamble.content+(result.content?'\n\n'+result.content:'')};repairs.push({kind:'json_execution_preamble'});}
  repairs.forEach(onRepair);
  return result;
}
import {promptMessages} from './media-input.mjs';
