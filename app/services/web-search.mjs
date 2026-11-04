import {randomUUID} from 'node:crypto';
import {failureDetails,failureText} from './failure-details.mjs';
export function searchQuery(body){
 const message=Array.isArray(body?.messages)?body.messages.findLast(m=>m?.role==='user'):null;
 const content=message?.content,text=typeof content==='string'?content:Array.isArray(content)?content.filter(c=>c?.type==='text'&&typeof c.text==='string').map(c=>c.text).join('\n'):'';
 const query=text.replace(/^\s*Perform a web search for the query:\s*/,'').trim();
 if(!query||query.length>5000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(query))throw Object.assign(new Error('请输入不超过 5000 字的有效搜索查询'),{code:'invalid_search_query',status:400});return query;
}
export function searchPrompt(query){return `Use the WebSearch tool exactly once to search for: ${JSON.stringify(query)}. Do not answer from memory. After the tool returns, reply only with the word done.`;}
export function toolResultText(value){
 if(Array.isArray(value)){const text=value.slice(0,100).map(v=>typeof v==='string'?v:v?.type==='text'?v.text??'':'').join('\n');return text.length>512*1024?'':text;}
 if(typeof value!=='string')return '';if(value.length>512*1024)return '';
 if(value.trimStart().startsWith('['))try{const parsed=JSON.parse(value);if(Array.isArray(parsed))return toolResultText(parsed);}catch{}return value;
}
function safeResult(row,secrets=[]){
 if(!row||typeof row.url!=='string'||row.url.length>4096)return null;let url;try{url=new URL(row.url);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||secrets.some(s=>s&&(url.href.includes(s)||url.href.includes(encodeURIComponent(s)))))return null;for(const key of [...url.searchParams.keys()])if(/^(?:key|api[_-]?key|token|access[_-]?token|authorization|cookie|password|secret|signature)$/i.test(key))url.searchParams.delete(key);}catch{return null;}
 const result={url:url.href,title:failureText(row.title??url.hostname,300,secrets)};const snippet=failureText(row.snippet,2000,secrets);if(snippet)result.snippet=snippet;if(typeof row.page_age==='string')result.page_age=failureText(row.page_age,100,secrets);return result;
}
export function cleanSearchResults(rows,secrets=[]){
 if(!Array.isArray(rows))return [];const seen=new Set(),results=[];for(const row of rows.slice(0,100)){const result=safeResult(row,secrets);if(result&&!seen.has(result.url)){seen.add(result.url);results.push(result);}}return results;
}
export function parseQoderSearch(value){
 const text=toolResultText(value),match=/(?:^|\n)\s*Links:\s*/i.exec(text);if(!match)return [];const start=match.index+match[0].length;if(text[start]!=='[')return [];
 let depth=0,quoted=false,escaped=false;for(let i=start;i<text.length;i++){const c=text[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='[')depth++;else if(c===']'&&--depth===0){try{return cleanSearchResults(JSON.parse(text.slice(start,i+1)));}catch{return [];}}}return [];
}
export function parseWorkbuddySearch(value){
 const text=toolResultText(value);if(text.length>512*1024)return [];const lines=text.split(/\r?\n/),rows=[];let current;
 for(const line of lines){const heading=/^\s*##\s+\d+\.\s+\[(.+)\]\((https?:\/\/\S+)\)\s*$/.exec(line);if(heading){current={title:heading[1],url:heading[2],snippet:''};rows.push(current);}else if(/^\s*#{1,6}\s/.test(line))current=null;else if(current)current.snippet+=line+'\n';}
 return cleanSearchResults(rows.map(row=>({...row,snippet:row.snippet.trim()})));
}
export function anthropicSearchResponse(query,{source,results}){
 const rows=cleanSearchResults(results),citations=rows.filter(r=>r.snippet).map(r=>({type:'web_search_result_location',url:r.url,title:r.title,cited_text:r.snippet}));
 return {id:'msg_'+randomUUID().replaceAll('-',''),type:'message',role:'assistant',model:'bridgepp-native-search',source,content:[{type:'web_search_tool_result',tool_use_id:'search_'+randomUUID(),content:rows.map(({url,title,page_age})=>({type:'web_search_result',url,title,...page_age?{page_age}:{}}))},...citations.length?[{type:'text',text:citations.map(c=>c.cited_text).join('\n\n'),citations}]:[]],stop_reason:'end_turn',stop_sequence:null};
}
const abortable=async(promise,signal)=>{signal.throwIfAborted();let listener;const interrupted=new Promise((_,reject)=>{listener=()=>reject(signal.reason);signal.addEventListener('abort',listener,{once:true});});try{return await Promise.race([promise,interrupted]);}finally{signal.removeEventListener('abort',listener);}};
export class WebSearch {
 constructor(providers,{timeoutMs=120000,attemptMs=60000,limit=2}={}){Object.assign(this,{providers,timeoutMs,attemptMs,limit});this.active=0;}
 async search(query,{preferred='qoder',signal}={}){
  if(this.active>=this.limit)throw Object.assign(new Error('联网搜索并发已满，请稍后重试'),{code:'search_busy',status:503});this.active++;
  const deadline=AbortSignal.timeout(this.timeoutMs),overall=signal?AbortSignal.any([signal,deadline]):deadline,failures=[];
  try{for(const source of preferred==='workbuddy'?['workbuddy','qoder']:['qoder','workbuddy']){
   if(signal?.aborted)throw signal.reason;
   try{const attempt=AbortSignal.any([overall,AbortSignal.timeout(this.attemptMs)]);attempt.throwIfAborted();const value=await abortable(Promise.resolve().then(()=>{attempt.throwIfAborted();return this.providers.runWorker(source,'search',{query},this.attemptMs,{signal:attempt});}),attempt);return {source,results:cleanSearchResults(value?.results)};}
   catch(error){if(signal?.aborted)throw signal.reason;const detail=failureDetails({code:error?.code??'search_source_failed',message:error?.name==='TimeoutError'?'原生搜索超时':error?.message,upstream_status:error?.upstream_status,reset_at:error?.reset_at,request_id:error?.request_id});failures.push({provider:source,...detail});}
  }
  throw Object.assign(new Error(failures.map(f=>(f.provider==='qoder'?'Qoder CN':'WorkBuddy')+'：'+failureText(f.message,500)).join('；')),{code:'web_search_failed',status:502,failures});
  }finally{this.active--;}
 }
}
