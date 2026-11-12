// Adapted from the Qoder hold lane; WorkBuddy V2 differences are explicit below.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { compileTools, withoutTopSchema } from "./decision.mjs";
import { hostToolAlias } from "./native.mjs";
const toolValidator = (parameters) => compileTools([{ type: "function", function: { name: "tool", parameters } }]).get("tool");
const HOST_BINDING = Symbol("workbuddybridge.hostBinding");
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)])) : value;
function pinnedFunction(request) {
  const choice = request.tool_choice;
  if (!choice || typeof choice !== "object" || Array.isArray(choice)) return null;
  const row = choice;
  return row.type === "function" && typeof row.function?.name === "string" && row.function.name ? row.function.name : null;
}
function hostToolTable(request) {
  const tools = [], byExposed = new Map(), byHost = new Map(), used = new Set();
  for (const tool of request.tools ?? []) {
    const host = tool.function.name;
    if (byHost.has(host)) throw new Error(`Duplicate tool name: ${host}`);
    const parameters = tool.function.parameters ?? { type: "object" };
    if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) throw new Error(`Invalid native schema for tool ${host}`);
    const exposed = hostToolAlias(host);
    if (used.has(exposed)) throw new Error(`Native tool alias collision: ${host}`);
    const inputSchema = { ...withoutTopSchema(parameters), ...Object.hasOwn(parameters, "type") ? {} : { type: "object" } };
    const row = { host, exposed, description: tool.function.description ?? "", inputSchema, validate: toolValidator(parameters), readOnlyHint: (tool.annotations ?? tool.function.annotations)?.readOnlyHint === true };
    tools.push(row);
    byExposed.set(exposed, row);
    byHost.set(host, row);
    used.add(exposed);
  }
  const signature = JSON.stringify(stable((request.tools ?? []).map((tool) => ({ host: tool.function.name, description: tool.function.description ?? "", parameters: tool.function.parameters ?? { type: "object" }, readOnlyHint: (tool.annotations ?? tool.function.annotations)?.readOnlyHint === true }))));
  return { signature, tools, byExposed, byHost };
}
function exposedToolName(table, name) {
  const exposed = name.startsWith("mcp__host__") ? name.slice(11) : name;
  return table.byExposed.get(exposed);
}
class HostBinding {
  table;
  provided = false;
  provideReady;
  providedPromise = new Promise((resolve) => {
    this.provideReady = resolve;
  });
  session;
  provide(table) {
    if (this.provided) throw new Error("Host tool table was already provided");
    this.provided = true;
    this.table = table;
    this.provideReady();
  }
  attach(session) {
    this.session = session;
  }
  async listTools() {
    await this.providedPromise;
    return { tools: (this.table?.tools ?? []).map((tool) => ({ name: tool.exposed, description: tool.description, inputSchema: tool.inputSchema, annotations: { readOnlyHint: tool.readOnlyHint } })) };
  }
  callTool(name, input, signal) {
    const tool=this.table?.byExposed.get(name.replace(/^mcp__host__/,''));
    if(input&&typeof input==='object'&&!tool?.inputSchema?.properties?.__toolCallId){const {__toolCallId,...rest}=input;input=rest;}
    if (!this.session || this.session.state === "closed") return Promise.resolve({ content: [{ type: "text", text: "Host session is not available." }], isError: true });
    return new Promise((resolve) => this.session.onHandler(name, input, resolve, signal ?? new AbortController().signal));
  }
  server() {
    const server = new McpServer({ name: "host", version: "1.0.0" }, { capabilities: { tools: {} } });
    server.server.setRequestHandler(ListToolsRequestSchema, () => this.listTools());
    server.server.setRequestHandler(CallToolRequestSchema, (request, extra) => this.callTool(request.params.name, request.params.arguments ?? {}, extra.signal));
    return server;
  }
  config(names) {
    const config = { type: "sdk", name: "host", instance: this.server() };
    Object.defineProperty(config, HOST_BINDING, { value: this, enumerable: false });
    return config;
  }
}
export {
  HOST_BINDING,
  HostBinding,
  exposedToolName,
  hostToolTable,
  pinnedFunction
};
