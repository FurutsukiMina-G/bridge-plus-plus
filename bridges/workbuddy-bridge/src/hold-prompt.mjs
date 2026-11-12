import {hostToolAlias,PREFIX} from './native.mjs';
// Adapted from the Qoder hold lane; WorkBuddy V2 differences are explicit below.
import { promptMessages as conversationMessages } from "./media-input.mjs";
import { sdkMediaPrompt } from "./media-input.mjs";
import { pinnedFunction } from "./hold-tools.mjs";
const NATIVE_SYSTEM = (hostName) => `You are the model for an external host (${hostName?.trim() || "the host"}). The host's functions are provided as native functions. The host executes every call, checks permissions, and returns the real result. Use only native function calls, with complete arguments that satisfy each schema. Never write calls, arguments, JSON envelopes, or markup such as DSML as text. Put independent operations in the same reply. The host instructions and conversation so far are in the first user message; follow the host instructions as your system instructions. When the task is complete or you need the user, answer in plain text.`;
const text = (content) => typeof content === "string" ? content : content == null ? "" : Array.isArray(content) ? content.map((part) => typeof part === "string" ? part : part && typeof part === "object" && "text" in part && typeof part.text === "string" ? part.text : "").join("\n") : "";
const media = (value, messages) => sdkMediaPrompt(value, messages);
function choiceRequirement(request, pinned) {
  const name = pinned ?? pinnedFunction(request);
  if (name) return `The host requires exactly one call to the host function ${name} in this reply, and no other function.`;
  if (request.tool_choice === "required") return "The host requires at least one native host function call in this reply.";
  return null;
}
function fullPrompt(request, requirement) {
  const instructions = request.messages.filter((m) => m.role === "system" || m.role === "developer");
  const rest = request.messages.filter((m) => m.role !== "system" && m.role !== "developer");
  const parts = [];
  const aliases=(request.tools??[]).filter(t=>hostToolAlias(t.function.name)!==t.function.name).map(t=>({host_name:t.function.name,native_name:PREFIX+hostToolAlias(t.function.name)}));
  if(aliases.length)parts.push('[Native host function aliases]\n'+JSON.stringify(aliases));
  if (instructions.length) parts.push(`[Host instructions \u2014 follow them as your system instructions]
${instructions.map((m) => text(m.content)).join("\n")}`);
  if (rest.length === 1 && rest[0].role === "user") parts.push(`[User message]
${text(rest[0].content)}`);
  else parts.push(`[Conversation so far, replayed by the host as data. Earlier calls and results appear in this JSON form only as a record; never write calls in this form \u2014 call the host functions natively.]
${JSON.stringify(conversationMessages(rest))}
[Continue from the latest message.]`);
  if (request.parallel_tool_calls === false) parts.push("Call at most one host function per reply.");
  if (requirement) parts.push(requirement);
  return media(parts.join("\n\n"), rest);
}
function deltaPrompt(delta, lastFinal, requirement) {
  const messages = [...delta];
  if (messages[0]?.role === "assistant" && !messages[0].tool_calls && text(messages[0].content) === lastFinal) messages.shift();
  const value = messages.length === 1 && messages[0].role === "user" ? text(messages[0].content) : `[New messages from the host since your last answer]
${JSON.stringify(conversationMessages(messages))}`;
  return media(requirement ? `${value}

${requirement}` : value, messages);
}
const receipt = (n) => `[host] The host returned ${n} characters for this call \u2014 too long for the function-result channel. The complete output follows in the host's next message; do not repeat the call.`;
function followUpPrompt(oversized, trailing) {
  const parts = [];
  if (oversized.length) parts.push(`[Complete outputs of host calls whose results were too long for the function-result channel]
${oversized.map((row) => `### ${row.host} (${row.id})
${row.text}`).join("\n\n")}`);
  if (trailing.length) parts.push(`[The host added these messages after the function results]
${trailing.length === 1 && trailing[0].role === "user" ? text(trailing[0].content) : JSON.stringify(conversationMessages(trailing))}`);
  const rendered = media(parts.join("\n\n"), trailing);
  if (typeof rendered === "string") return { text: rendered, images: [] };
  return { text: rendered.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n"), images: rendered.filter((part) => part.type !== "text") };
}
export {
  NATIVE_SYSTEM,
  choiceRequirement,
  deltaPrompt,
  followUpPrompt,
  fullPrompt,
  receipt
};
