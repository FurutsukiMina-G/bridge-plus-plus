import {mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {SOURCE_ROOT} from './source-packages.mjs';
import {workbuddyEnvironment} from './provider-environment.mjs';
import {failureText,failureDetails} from './failure-details.mjs';
import {parseQoderSearch,parseWorkbuddySearch,toolResultText,cleanSearchResults,searchPrompt} from './web-search.mjs';
import {upstreamDetails} from '../../bridges/workbuddy-bridge/src/errors.mjs';
export function onlyWebSearch(base={}){
 const options={...base,tools:['WebSearch'],allowedTools:['WebSearch'],disallowedTools:[],skills:[],settingSources:[],plugins:[],mcpServers:{},hooks:{},maxTurns:3,includePartialMessages:false,persistSession:false,strictMcpConfig:true,canUseTool:async(name,input)=>name==='WebSearch'?{behavior:'allow',updatedInput:input}:{behavior:'deny',message:'此独立请求只允许 WebSearch'}};delete options.systemPrompt;return options;
}
async function prepareNativeSearch(source,{directory,controller,root=SOURCE_ROOT}){
 if(source==='qoder'){
  const sdk=await import('@qodercn-ai/qodercn-agent-sdk');const settings=await readFile(join(root,'bridges/qoderbridge/config/thin-cn.json'),'utf8');
  return {query:sdk.query,options:onlyWebSearch({auth:sdk.qodercliAuth(),cwd:join(directory,'.runtime'),abortController:controller,permissionMode:'bypassPermissions',settings,env:{...process.env}}),secrets:[process.env.QODERCN_PERSONAL_ACCESS_TOKEN,process.env.QODER_PERSONAL_ACCESS_TOKEN]};
 }
 if(source!=='workbuddy')throw new Error('未知搜索来源');
 const base=join(root,'bridges/workbuddy-bridge'),module=path=>import(pathToFileURL(join(base,path)).href),{config}=await module('src/config.mjs'),{AuthManager}=await module('src/auth.mjs'),{sdkOptions}=await module('src/sdk-transport.mjs'),{F:Client}=await module('vendor/workbuddy-connect-4.13.0.mjs'),{query}=await import('@tencent-ai/agent-sdk');
 const cfg={...config(workbuddyEnvironment(directory)),root:base,prewarmMs:0},client=new Client(),auth=new AuthManager({...cfg,refresh:c=>client.refreshToken(c)}),credential=await auth.get();
 return {query,options:onlyWebSearch(sdkOptions(cfg,credential,{model:'deepseek-v4.1-flash',max_tokens:2048,messages:[]},directory,controller,()=>{},()=>{})),secrets:[credential.accessToken,credential.refreshToken]};
}
export async function nativeSearch(source,query,{directory,prepare=prepareNativeSearch,root=SOURCE_ROOT}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(new Error('原生搜索超时')),115000);let secrets=[];
 try{await mkdir(join(directory,'.runtime'),{recursive:true});const prepared=await prepare(source,{directory,controller,root});secrets=prepared.secrets??[];const ids=new Set();
  for await(const message of prepared.query({prompt:searchPrompt(query),options:prepared.options})){
   controller.signal.throwIfAborted();
   for(const part of message.message?.content??[]){
    if(message.type==='assistant'&&part.type==='tool_use'){if(part.name!=='WebSearch')throw new Error('原生搜索尝试调用非 WebSearch 工具，已停止');ids.add(part.id);if(ids.size>1)throw new Error('原生搜索重复请求 WebSearch，已停止');}
    if(message.type==='user'&&part.type==='tool_result'&&ids.has(part.tool_use_id)){
     if(part.is_error)throw new Error(toolResultText(part.content)||'原生 WebSearch 返回错误');
     // The native tool result is the observation. No paid follow-up answer is
     // needed, and assistant prose is never treated as a search result.
     return {results:cleanSearchResults((source==='qoder'?parseQoderSearch:parseWorkbuddySearch)(part.content),secrets)};
    }
   }
   if(message.type==='result'&&(message.is_error||String(message.subtype).startsWith('error')))throw new Error((message.errors??[]).join('\n')||message.result||'原生搜索请求失败');
  }
  throw new Error('来源未返回原生 WebSearch 工具结果，未使用模型记忆代替搜索');
 }catch(error){const text=failureText(error,1200,secrets),details=failureDetails({...upstreamDetails(text),code:error?.code??'search_source_failed'});throw Object.assign(new Error(details.message),details);}
 finally{clearTimeout(timer);controller.abort();}
}
