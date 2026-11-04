const visible=new Set(['user','text','thinking','tool-start','tool-end','tool-output','subagent','plan','diff','approval','approval-resolved','question','error','notice','usage','turn-end','media','attachments-discarded','upstream-error']);
export function appendDisplayEvent(events,event){
  if(event.type==='content-replace'){
    const indices=[];events.forEach((item,index)=>{if(item.type===event.channel&&item.attemptId===event.attemptId&&event.attemptId)indices.push(index);});
    if(indices.length){events[indices[0]]={...event,type:event.channel,id:events[indices[0]].id??event.id};for(const index of indices.slice(1).reverse())events.splice(index,1);return;}
    event={...event,type:event.channel};
  }
  if(!visible.has(event.type))return;
  const last=events.at(-1);
  if(['text','thinking','tool-output'].includes(event.type)&&last?.type===event.type&&last.turnId===event.turnId&&last.itemId===event.itemId&&last.toolId===event.toolId&&last.attemptId===event.attemptId&&typeof event.text==='string'&&typeof last.text==='string')last.text+=event.text;
  else events.push({...event});
}
export function displayEvents(events){const result=[];for(const event of events)appendDisplayEvent(result,event);return result;}
export class WorkspaceViews {
  constructor(){this.projects=new Map();this.terminals=new Map();this.drafts=new Map();}
  draftKey(state){return (state.projectId??'none')+':'+(state.sessionId??'draft');}
  saveDraft(state){this.drafts.set(this.draftKey(state),state.draft);}
  loadDraft(state){state.draft=this.drafts.get(this.draftKey(state))??'';}
  stash(state){if(state.projectId)this.projects.set(state.projectId,{file:state.file,dirty:state.dirty,tree:state.tree,expanded:state.expanded,git:state.git});}
  activate(state,projectId){
    if(state.projectId!==projectId){this.stash(state);state.projectId=projectId;Object.assign(state,this.projects.get(projectId)??{file:null,dirty:false,tree:new Map(),expanded:new Set(),git:null});}
    const terminal=this.terminal(projectId);state.terminalText=terminal.text;state.terminalBusy=terminal.running;
  }
  saved(state,projectId,file){const view=this.projects.get(projectId);if(view?.file?.path===file.path){view.file=file;view.dirty=false;}if(state.projectId===projectId&&state.file?.path===file.path){state.file=file;state.dirty=false;}}
  anyDirty(state){return state.dirty||[...this.projects.entries()].some(([id,view])=>id!==state.projectId&&view.dirty);}
  terminal(projectId){if(!this.terminals.has(projectId))this.terminals.set(projectId,{text:'',running:false});return this.terminals.get(projectId);}
  terminalEvent(event){const value=this.terminal(event.projectId);value.revision=(value.revision??0)+1;if(event.type==='terminal')value.text=(value.text+event.text).slice(-2*1024*1024);else if(event.type==='terminal-exit'){value.running=false;value.text+='\n[退出代码 '+event.code+']\n';}else if(event.type==='terminal-start')value.running=true;return value;}
}
