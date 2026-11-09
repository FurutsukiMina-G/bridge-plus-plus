import {toolValidator} from './tool-contract.js';
import type {ChatRequest} from './compat.js';
import {isToolProtocolText} from './protocol-text.js';

export const hasUsableTools = (request: ChatRequest) => !!request.tools?.length && request.tool_choice !== 'none';
export function answerInstructions(request: ChatRequest) {
  return 'Return the requested final answer directly, preserving the original conversation role priorities. Do not add a bridge envelope. ' +
    (request.response_format ? `Return a complete JSON document matching response_format: ${JSON.stringify(request.response_format)}.` : 'Plain text is permitted.') + '\n';
}
export function finalAnswer(text: string, request: ChatRequest): string {
  if(request.tool_choice==='required'||request.tool_choice&&typeof request.tool_choice==='object')throw new Error('tool_choice requires a tool call');
  let value: unknown;
  try { value = JSON.parse(text); } catch { /* Plain text is allowed unless JSON was requested. */ }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    if (object.kind === 'final' && typeof object.content === 'string' && Object.keys(object).every(k => ['kind','content'].includes(k))) text = object.content;
    else if (['tool_call','tool_calls'].includes(String(object.kind))) throw new Error('tool_choice forbids tool calls');
  }
  const format = request.response_format as {type?:string;json_schema?:{schema?:object|boolean}} | undefined;
  if (['json_object','json_schema'].includes(format?.type ?? '')) {
    const document = JSON.parse(text);
    if (format?.type === 'json_object' && (!document || typeof document !== 'object' || Array.isArray(document))) throw new Error('response_format requires a JSON object');
    if (format?.type === 'json_schema' && format.json_schema?.schema !== undefined && !toolValidator(format.json_schema.schema)(document)) throw new Error('Answer violates response_format json_schema');
  }
  else if(isToolProtocolText(text)||/｜{1,2}(?:DSML|DS)｜｜/.test(text)||/^\s*<\/?(?:tool_call|custom_tool_call)\b/.test(text)||/^\s*\{\s*"(?:tool_calls|kind)"\s*:/.test(text))throw new Error('tool_choice forbids tool calls');
  return text;
}
