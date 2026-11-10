/* Questions an agent asks the user mid-turn, and the answers sent back.
 *
 * Every adapter reports a question event whose data.questions has this shape:
 *   {question, header?, detail?, options?:[{label, description?}], multiSelect?, id?,
 *    allowCustom? (false: the runtime takes only its own options), secret? (hide what is typed)}
 * Claude Code's AskUserQuestion and DSH's ask_user_question already look like this; the Kimi and
 * Codex adapters convert theirs. Anything else is answered as raw JSON in the old dialog. */

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const questionOptions=q=>Array.isArray(q?.options)?q.options:[];

/** The questions when all of them can be shown as a form, otherwise null. */
export function structuredQuestions(data){
  const qs=Array.isArray(data?.questions)?data.questions:null;
  const ok=q=>typeof q?.question==='string'&&q.question.trim()
    &&(q.options==null||Array.isArray(q.options)&&q.options.every(o=>typeof o?.label==='string'))
    // Options only, but none to pick from: there would be nothing to answer with.
    &&(q.allowCustom!==false||questionOptions(q).length>0);
  return qs?.length&&qs.every(ok)?qs:null;
}

export function questionFormHtml(qs){
  const note=qs.length>1?'<p class="q-note">可以只回答其中一部分；没回答的问题会告诉 Agent 你跳过了。</p>':'';
  return`<div class="q-form">${note}${qs.map((q,i)=>{
    const options=questionOptions(q);
    const other=!options.length?'你的回答':q.multiSelect?'另外补充（可选）':'其他答案（填写后代替上面的选项）';
    const input=q.allowCustom===false?'':`<input class="q-other" type="${q.secret===true?'password':'text'}" data-q-other="${i}" placeholder="${other}" maxlength="2000" autocomplete="off">`;
    const detail=typeof q.detail==='string'&&q.detail.trim()?`<p class="q-detail">${esc(q.detail)}</p>`:'';
    const picks=options.map((o,j)=>`<label class="q-option"><input type="${q.multiSelect?'checkbox':'radio'}" name="q${i}" value="${j}"><span class="q-option-text"><b>${esc(o.label)}</b>${o.description?`<span class="muted">${esc(o.description)}</span>`:''}</span></label>`).join('');
    return`<fieldset class="q-field"><legend>${q.header?`<span class="q-tag">${esc(q.header)}</span>`:''}<span class="q-text">${esc(q.question)}</span>${q.multiSelect&&options.length?'<span class="muted">可多选</span>':''}</legend>${detail}${picks}${input}</fieldset>`;
  }).join('')}</div>`;
}

/**
 * Two views of the same answers, so each adapter can use its native shape without re-parsing:
 *   answers  {"<question text>": "<answer>"} for each answered question (Claude Code's AskUserQuestion;
 *            a multi-select joins its labels with ", ");
 *   items    every question in order: {id?, question, selected:[labels], custom?}, a skipped one as
 *            {…, selected:[], skipped:true} (DSH and Codex answer by id, one entry per question).
 * `read(i)` returns what the form holds for question i: {picked:[option indexes], other:"typed text"}.
 */
export function buildAnswers(qs,read){
  const answers={},items=[];
  qs.forEach((q,i)=>{
    const options=questionOptions(q),{picked=[],other:typed=''}=read(i)??{};
    let labels=[...new Set(picked)].map(j=>options[j]?.label).filter(label=>typeof label==='string');
    if(!q.multiSelect)labels=labels.slice(0,1);
    const other=q.allowCustom===false?'':String(typed??'').trim();
    // A single-choice question's own answer replaces the options; a multi-select adds to them.
    const selected=q.multiSelect||!other?labels:[],chosen=[...selected,...other?[other]:[]];
    const base={...typeof q.id==='string'?{id:q.id}:{},question:q.question};
    if(!chosen.length){items.push({...base,selected:[],skipped:true});return;}
    answers[q.question]=chosen.join(', ');
    items.push({...base,selected,...other?{custom:other}:{}});
  });
  return{answers,items};
}
