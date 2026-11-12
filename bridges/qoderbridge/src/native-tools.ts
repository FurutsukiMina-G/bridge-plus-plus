import {createHash} from 'node:crypto';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {CallToolRequestSchema,ListToolsRequestSchema,type CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import type {ChatRequest} from './compat.js';
import {toolValidator,withoutTopSchema} from './tool-contract.js';

export const HOST_BINDING=Symbol('qoderbridge.hostBinding');
const validName=/^[A-Za-z0-9_-]{1,64}$/;
const reserved=new Set(['mcp_list','mcp_get','mcp_call']);
const stable=(value:unknown):unknown=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])):value;
export type HostTool={host:string;exposed:string;description:string;inputSchema:Record<string,unknown>;validate:ReturnType<typeof toolValidator>};
export type HostToolTable={signature:string;tools:HostTool[];byExposed:Map<string,HostTool>;byHost:Map<string,HostTool>};
export type CallHandler=(name:string,input:unknown,resolve:(result:CallToolResult)=>void,signal:AbortSignal)=>void;

/** `tool_choice:{type:'function',function:{name}}` pins one host function for the step. */
export function pinnedFunction(request:{tool_choice?:unknown}):string|null{
  const choice=request.tool_choice;
  if(!choice||typeof choice!=='object'||Array.isArray(choice))return null;
  const row=choice as {type?:unknown;function?:{name?:unknown}};
  return row.type==='function'&&typeof row.function?.name==='string'&&row.function.name?row.function.name:null;
}

export function hostToolTable(request:ChatRequest):HostToolTable{
  const tools:HostTool[]=[],byExposed=new Map<string,HostTool>(),byHost=new Map<string,HostTool>(),used=new Set<string>();
  for(const tool of request.tools??[]){
    const host=tool.function.name;if(byHost.has(host))throw new Error(`Duplicate tool name: ${host}`);
    const parameters=tool.function.parameters??{type:'object'};
    if(!parameters||typeof parameters!=='object'||Array.isArray(parameters))throw new Error(`Invalid native schema for tool ${host}`);
    const exposed=validName.test(host)&&!host.startsWith('mcp__host__')&&!reserved.has(host)&&!used.has(host)?host:`t_${createHash('sha256').update(host).digest('hex').slice(0,16)}`;
    if(used.has(exposed))throw new Error(`Native tool alias collision: ${host}`);
    const inputSchema={...withoutTopSchema(parameters) as Record<string,unknown>,...(Object.hasOwn(parameters,'type')?{}:{type:'object'})};
    const row={host,exposed,description:tool.function.description??'',inputSchema,validate:toolValidator(parameters)};
    tools.push(row);byExposed.set(exposed,row);byHost.set(host,row);used.add(exposed);
  }
  const signature=JSON.stringify(stable((request.tools??[]).map(tool=>({host:tool.function.name,description:tool.function.description??'',parameters:tool.function.parameters??{type:'object'}}))));
  return{signature,tools,byExposed,byHost};
}

export function exposedToolName(table:HostToolTable,name:string){
  const exposed=name.startsWith('mcp__host__')?name.slice(11):name;
  return table.byExposed.get(exposed);
}

export class HostBinding{
  private table?:HostToolTable;
  private provided=false;
  private provideReady!:()=>void;
  private readonly providedPromise=new Promise<void>(resolve=>{this.provideReady=resolve;});
  private session?:{onHandler:CallHandler;state:string};
  provide(table:HostToolTable){if(this.provided)throw new Error('Host tool table was already provided');this.provided=true;this.table=table;this.provideReady();}
  attach(session?:{onHandler:CallHandler;state:string}){this.session=session;}
  async listTools(){
    await this.providedPromise;
    return{tools:(this.table?.tools??[]).map(tool=>({name:tool.exposed,description:tool.description,inputSchema:tool.inputSchema,annotations:{readOnlyHint:true}}))};
  }
  callTool(name:string,input:unknown,signal?:AbortSignal):Promise<CallToolResult>{
    if(!this.session||this.session.state==='closed')return Promise.resolve({content:[{type:'text',text:'Host session is not available.'}],isError:true});
    // An SDK without a per-call signal must not break the call; the session still resolves it on cancel/close.
    return new Promise(resolve=>this.session!.onHandler(name,input,resolve,signal??new AbortController().signal));
  }
  server(){
    const server=new McpServer({name:'host',version:'1.0.0'},{capabilities:{tools:{}}});
    server.server.setRequestHandler(ListToolsRequestSchema,()=>this.listTools());
    server.server.setRequestHandler(CallToolRequestSchema,(request,extra)=>this.callTool(request.params.name,request.params.arguments??{},extra.signal));
    return server;
  }
  config(names:string[]){
    const config={type:'sdk' as const,name:'host',instance:this.server(),tools:names.map(name=>({name,exposedName:name,alwaysLoad:true}))};
    Object.defineProperty(config,HOST_BINDING,{value:this,enumerable:false});
    return config;
  }
}
