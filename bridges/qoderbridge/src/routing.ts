import type { ChatRequest } from './compat.js';
import {conversationMessages} from './compat.js';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

export function hasConversationPrefix(previous: ChatRequest['messages'], current: ChatRequest['messages']) {
  return current.length >= previous.length &&
    isDeepStrictEqual(conversationMessages(current.slice(0, previous.length)),conversationMessages(previous));
}

/** Counts and hashes only: diagnose history resets without retaining another copy of user text. */
export function prefixIssue(previous: ChatRequest['messages'], current: ChatRequest['messages']) {
  const before=conversationMessages(previous),after=conversationMessages(current);
  let at=0;while(at<Math.min(before.length,after.length)&&isDeepStrictEqual(before[at],after[at]))at++;
  if(at===before.length)return null;
  const stamp=(value:unknown)=>value===undefined?null:createHash('sha256').update(JSON.stringify(value)).digest('hex');
  return {reason:after.length<before.length?'history_shortened':'history_rewritten',first_changed_index:at,
    previous_message_count:before.length,current_message_count:after.length,
    previous_role:before[at]?.role??null,current_role:after[at]?.role??null,
    previous_sha256:stamp(before[at]),current_sha256:stamp(after[at])};
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
