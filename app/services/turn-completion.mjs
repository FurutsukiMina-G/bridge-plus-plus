// Wire validation catches private short promises; the session-level check also
// handles already-streamed phase summaries and the native runtime's open plan.
const ACK=/^(?:(?:好的?|可以|没问题|现在|接下来|首先|那么|ok(?:ay)?|sure|alright|now|next|first)[，,。.!！：:\s]*)*/i;
const ZH=/^(?:我(?:会|将|先|来|准备|现在|继续)|让我|先(?:来|读取|查看|检查|梳理|分析|审查))/;
const EN=/^(?:i(?:'ll|’ll| will| am going to|'m going to|’m going to)|let me|let['’]s)\b/i;
const LEADS=['我','我会','我将','我先','我来','我准备','我现在','我继续','让','让我','先','i',"i'll",'i’ll','i will','i am going to',"i'm going to",'i’m going to','let me',"let's",'let’s'];
const ACK_LEADS=['好的','可以','没问题','现在','接下来','首先','那么','ok','okay','sure','alright','now','next','first'];
const DONE=/已(?:经)?(?:完成|读取|阅读|检查|修改|编辑|创建|生成|修复|运行|确认)|(?:完成|读取|阅读|检查|修改|编辑|创建|生成|修复|运行|确认)[了过]|结果(?:是|如下)|结论|以下是|具体如下|\b(?:completed|finished|verified|fixed|implemented|here is|here are|the result is)\b/i;
const ACTION=/梳理|读取|阅读|查看|检查|审查|搜索|运行|执行|修改|编辑|修复|生成|创建|写入|实现|定位|测试|打开|调查|完成.{0,20}任务|汇报|\b(?:read|inspect|check|review|run|execute|edit|write|create|search|investigate|implement|audit|test|generate|explore|open)\b/i;
const REQUEST=/审查|检查|读取|阅读|修改|编辑|修复|实现|创建|完成.{0,30}任务|汇报|生成.{0,24}报告|开发|编写|测试|运行|查看.{0,30}(?:项目|目录|文件|代码)|\b(?:read|inspect|review|edit|write|fix|implement|create|build|test|run|audit)\b/i;
const PLAN_ONLY=/(?:只|仅)(?:需要|要|给出|提供|输出|讨论|描述|给){0,2}(?:一个|一份)?(?:计划|方案|步骤|建议|思路)|(?:计划|方案|步骤)(?:即可|就行)|不要使用工具|无需任何工具|\b(?:plan only|only a plan|do not use tools|do not take any actions)\b/i;
const ASK=/请(?:先)?(?:提供|告诉|确认|补充|选择|给出)|需要你(?:先)?(?:提供|确认|补充)|\b(?:could you|please provide|please confirm|please share)\b/i;
const head=text=>String(text??'').trim().replace(ACK,'');
const dateReminder=text=>/^\s*<system-reminder>\s*Today's date is \d{4}-\d{2}-\d{2}\.[\s\S]*<\/system-reminder>\s*$/.test(text);
const messageText=m=>typeof m==='string'?m:typeof m.content==='string'?m.content:Array.isArray(m.content)?m.content.filter(p=>p?.type==='text').map(p=>p.text??'').join('\n'):'';
const stopsTask=text=>/(?:不要|不用|不必|别|无需|不再)\s*(?:再)?\s*(?:继续|执行|操作|运行)|^(?:停止|暂停|取消)(?:当前|这个|这项|此|全部|所有)?(?:任务|工作|操作|运行|执行)?[。！!\s]*$|^\s*(?:stop|pause|cancel)(?:\s+(?:the|this|current))?(?:\s+(?:task|work|execution))?[.!\s]*$/i.test(text);
export function isTaskContinuation(text){
  const t=String(text??'').trim();
  return t.length<=240&&!stopsTask(t)&&!/(?:换个|改为|另一个|新的任务)/.test(t)&&/(?:继续|接着|接上|恢复.{0,12}(?:任务|工作)|\b(?:continue|resume|go on|carry on)\b)/i.test(t);
}
export function taskIntent(messages){
  const users=messages.filter(m=>typeof m==='string'||m.role==='user').map(messageText).filter(t=>t.trim()&&!dateReminder(t)&&!/^\[Bridge\+\+ task continuation \d+\/\d+\]\n/.test(t));
  const continuation=isTaskContinuation(users.at(-1));let index=users.length-1;
  while(index>0&&isTaskContinuation(users[index])&&!REQUEST.test(users[index]))index--;
  const task=users[index]??'';
  const actionable=REQUEST.test(task)&&!stopsTask(task)&&!PLAN_ONLY.test(task)&&!/^(?:(?:请问)?(?:如何|怎么|怎样|什么|为何|为什么)|(?:请)?(?:解释|说明|介绍|讲解)|how (?:do|does|can|to)\b|what\b|why\b)/i.test(task.trim());
  return {task,actionable,continuation};
}
export function canStreamFinal(text){
  const t=String(text??'').trim();if(!t)return false;if(t.length>600||DONE.test(t)||/```|\n\s*(?:[-*]|\d+[.)])\s/.test(t))return true;
  if(/^首先/.test(t))return false;
  if(ACK_LEADS.some(value=>value.startsWith(t.toLowerCase())))return false;
  const s=head(t);if(!s)return false;
  return !(ZH.test(s)||EN.test(s)||LEADS.some(value=>value.startsWith(s.toLowerCase())));
}
export function isProgressOnlyFinal(text,request){
  const t=String(text??'').trim();
  if(!t||t.length>600||/[?？]\s*$/.test(t)||DONE.test(t)||ASK.test(t)||taskBlocker(t)||/```|\n\s*(?:[-*]|\d+[.)])\s/.test(t))return false;
  if(!request.tools?.length||request.tool_choice==='none'||['json_object','json_schema'].includes(request.response_format?.type))return false;
  // Reminders and continuation wording do not replace the original user's intent.
  // The model still receives the complete transcript with all original constraints.
  if(!taskIntent(request.messages??[]).actionable)return false;
  const s=head(t);return ((ZH.test(s)||EN.test(s))&&ACTION.test(s))||nextAction(t);
}
export function guardDecision(decision,request){
  if((decision.kind??decision.action)!=='final'||!isProgressOnlyFinal(decision.content,request))return;
  const error=new Error('Progress-only final answer: the requested host action has not been performed. Return the immediate next declared tool call, or a complete result/question; a promise to act is not task completion.');
  error.code='unfinished_turn';throw error;
}

export const TASK_CONTINUATION_LIMIT=2;
export function planEntries(data){
  const entries=data?.entries??data?.plan??data?.todos;
  return Array.isArray(entries)?entries:[];
}
function nextAction(text){
  // Only the agent's own explicit next action; recommendations and quoted examples
  // in a finished report must not start new work.
  const prose=text.replace(/```[\s\S]*?(?:```|$)/g,'').replace(/^\s*>.*$/gm,'').replace(/`[^`\n]*`/g,'').replace(/"(?:\\.|[^"\\])*"|“[^”]*”|「[^」]*」/g,'');
  const sentences=prose.split(/[。！？!?\n]/);
  return sentences.some(s=>{
    if(/建议|可选|如果你|如需|若需|你可以|后续可以|\b(?:recommend|optional|if you|you could|you can)\b/i.test(s))return false;
    return ACTION.test(s)&&((!DONE.test(s)&&/^\s*(?:我先|我来|让我|我们先|首先|先来)[，,:：\s]*(?:完整|先|来)?/.test(s))||/(?:接下来|下一步|随后|然后|接着)[，,:：\s]*(?:我(?:们)?)?(?:会|将|要|准备|继续|先|把|再|开始)|(?:我|我们)(?:还需要|仍需|还要|接下来|下一步|将|会|准备|继续)|\b(?:i|we)(?:['’]ll| will| am going to| are going to| still need to| need to)\b/i.test(s));
  });
}
function taskBlocker(t){return /(?:无法|不能).{0,35}(?:继续|访问|读取|阅读|运行|执行|完成)|没有(?:访问|执行|写入)?权限|需要.{0,15}(?:授权|许可)|\b(?:permission denied|cannot continue|cannot access|unable to (?:continue|access|run|read)|need your permission)\b/i.test(t);}
export function unfinishedTask({intent,text='',plan=[]}){
  if(!intent?.actionable)return null;
  const t=String(text).trim(),pending=plan.filter(e=>!['completed','done','cancelled','canceled','blocked'].includes(String(e.status??'').toLowerCase()));
  const next=nextAction(t);
  // A user decision or a stated access/permission blocker ends the current turn.
  // It must not trigger attempts to bypass the native runtime's policies.
  if(ASK.test(t)||/请问|需要(?:你|您)|等(?:待)?(?:你|您)(?:的)?(?:确认|回复|授权|许可|选择)|(?:你|您).{0,25}[?？]\s*$|\b(?:would you|which .{0,30}prefer)\b/i.test(t)||(/[?？]\s*$/.test(t)&&!next))return null;
  if(taskBlocker(t))return null;
  if(!t)return {reason:'missing_result',pending:pending.length,canContinue:false};
  if(pending.length)return {reason:'pending_plan',pending:pending.length,canContinue:true};
  if(next)return {reason:'phase_summary',pending:0,canContinue:true};
  return null;
}
export function taskContinuationPrompt(attempt,issue){
  return `[Bridge++ task continuation ${attempt}/${TASK_CONTINUATION_LIMIT}]\n`+
    'The native model turn ended, but the original user task is still unfinished. '+
    (issue.pending?`${issue.pending} entries in the existing native plan remain open. `:'The last reply described a next phase rather than delivering the requested result. ')+
    'Continue the SAME original task in this SAME native session and selected model. All original user restrictions and native permission decisions remain in force; this is not a new task or additional authorization. '+
    'Previously completed tool actions already ran: use their results and do not repeat their side effects. Reconcile and update the existing plan truthfully; never mark unperformed work completed just to end the turn. '+
    'Perform the remaining permitted work with the declared native tools and produce the requested deliverable. Do not end with another announcement or phase summary. '+
    'If blocked or needing a user decision, state the blocker or ask the user and stop. Do not bypass permissions or invent observations.';
}
