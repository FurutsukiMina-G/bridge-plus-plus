import type { ChatRequest } from './compat.js';
import {conversationMessages} from './compat.js';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {historyReset,toolPrunedPrefix,type HistoryEntry} from './history-pruning.js';
const stable=(value:unknown):unknown=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])):value;
export function historyEntries(messages:ChatRequest['messages']):HistoryEntry[]{return conversationMessages(messages).map(m=>({
  key:createHash('sha256').update(JSON.stringify(stable(m))).digest('hex'),role:m.role,...m.tool_call_id?{toolId:m.tool_call_id}:{},
  callIds:(m.tool_calls??[]).flatMap(c=>c&&typeof c==='object'&&'id' in c&&typeof c.id==='string'?[c.id]:[]),
}));}
export function prunedConversationPrefix(previous:ChatRequest['messages'],current:ChatRequest['messages']){return toolPrunedPrefix(historyEntries(previous),historyEntries(current));}

export function hasConversationPrefix(previous: ChatRequest['messages'], current: ChatRequest['messages']) {
  return current.length >= previous.length &&
    isDeepStrictEqual(conversationMessages(current.slice(0, previous.length)),conversationMessages(previous));
}

/** Counts and roles only: do not copy user text into reset diagnostics. */
export function prefixIssue(previous: ChatRequest['messages'], current: ChatRequest['messages']) {
  return historyReset(historyEntries(previous),historyEntries(current));
}

export function routeConversation(
  request: ChatRequest,
  sessions: Map<string, { messages: ChatRequest['messages'];replayMessages?:ChatRequest['messages'];bridgeScope?:string;clientKey?:string;busy?:number }>,
  byClientSession: Map<string, string>,
  byToolId: Map<string, string>,
): string | undefined {
  if(typeof request.bridge_scope==='string'){
    const candidates=[...sessions].filter(([,r])=>r.bridgeScope===request.bridge_scope&&r.clientKey===request.prompt_cache_key&&!r.busy&&
      (r.messages.length>0&&request.messages.length>=r.messages.length&&hasConversationPrefix(r.messages,request.messages)||
       r.replayMessages?.length===request.messages.length&&hasConversationPrefix(r.replayMessages,request.messages)))
      .sort((a,b)=>b[1].messages.length-a[1].messages.length);
    // Equal prefixes without an explicit lane identity are ambiguous. Start a fresh lane.
    if(candidates.length>1&&candidates[0]![1].messages.length===candidates[1]![1].messages.length)return undefined;
    return candidates[0]?.[0];
  }
  const compatible = (id: string | undefined) => {
    const record = id && sessions.get(id);
    return record && record.bridgeScope===request.bridge_scope && hasConversationPrefix(record.messages, request.messages) ? id : undefined;
  };
  if (request.prompt_cache_key) return compatible(byClientSession.get(request.prompt_cache_key));
  for (const message of [...request.messages].reverse()) {
    const ids = [message.tool_call_id, ...((message.tool_calls ?? []) as Array<{ id?: string }>).map(call => call.id)];
    for (const id of ids) if (id) {
      const owner = compatible(byToolId.get(id));
      if (owner) return owner;
    }
  }
  return undefined;
}

/** The first lane of each application scope is reserved. Refuse admission rather
 * than evict another application's root or an active parent waiting on children. */
export function evictionCandidate<T extends {bridgeScope?:string;busy:number;touched:number;messages:unknown[]}>(records:Iterable<T>,scope?:string){
  const rows=[...records],roots=new Set<T>(),seen=new Set<string>();
  for(const row of rows)if(row.bridgeScope!==undefined&&!seen.has(row.bridgeScope)){seen.add(row.bridgeScope);roots.add(row);}
  return rows.filter(row=>!row.busy&&!roots.has(row)).sort((a,b)=>
    Number(scope!==undefined&&b.bridgeScope===scope)-Number(scope!==undefined&&a.bridgeScope===scope)||a.touched-b.touched)[0];
}
