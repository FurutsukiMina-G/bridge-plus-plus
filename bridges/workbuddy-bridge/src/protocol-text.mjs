/** A direct tool envelope cannot be presented as a final answer. Prose examples remain data. */
export const leakedProtocol=text=>/^\s*(?:<\/?(?:system_call|custom_tool_call|tool_call)\b|<\/?｜｜(?:DSML|DS)｜｜\s*(?:calls|tool_calls|invoke|parameter)\b)/i.test(text);
// Tool envelopes a model may print instead of calling. DSML is unambiguous anywhere outside code;
// the other envelopes count only at a line start, so prose and fenced examples remain answers.
const DSML=/<\/?｜｜(?:DSML|DS)｜｜|｜｜DSML｜｜>|｟DSML｠/;
const LINE=/^[ \t]*(?:<\/?(?:system_call|function_calls?|tool_calls?|custom_tool_call|invoke|parameter)\b|<name\s*=|"(?:tool_calls|calls)"\s*:\s*\[)/i;
const MARKERS=['<｜｜','</｜｜','｜｜DSML','<system_call','</system_call','<function_call','<tool_call','<custom_tool_call','<invoke','<parameter','<name','"tool_calls"','"calls"'];
const PARTIAL=['<｜｜DSML｜｜','</｜｜DSML｜｜','｜｜DSML｜｜'];
// Hold mode must classify every protocol spelling before streaming any of it.
// Keep this opt-in so the legacy JSON/replay grammar retains its existing contract.
const HOLD_DSML=/<?\/?(?:｜{1,2}(?:DSML|DS)｜{1,2}|｟DSML｠)/;
const HOLD_PARTIAL=[...new Set(['DSML','DS'].flatMap(name=>[1,2].flatMap(left=>[1,2].flatMap(right=>{
  const marker='｜'.repeat(left)+name+'｜'.repeat(right);return [marker,'<'+marker,'</'+marker,'/'+marker];
}))).concat(['｟DSML｠','<｟DSML｠','</｟DSML｠']))];
const HOLD_MARKERS=[...MARKERS,...['system_call','function_call','tool_call','custom_tool_call','invoke','parameter'].map(name=>'</'+name),...HOLD_PARTIAL];
const SPACE=/\s/,KEY=/"(?:[^"\\\r\n]|\\.)*"/y,BREAK=/[\r\n]/g;
function lines(text,fenced){
  const out=[];let at=0;
  for(const line of text.split('\n')){const fence=/^[ \t]*(?:```|~~~)/.test(line);out.push({at,line,code:fenced||fence,fenced});if(fence)fenced=!fenced;at+=line.length+1;}
  return out;
}
// Keep offsets intact when ignoring examples. JSON whitespace can cross line and chunk boundaries.
const mask=({line,code})=>code?' '.repeat(line.length):line.replace(/`[^`\n]*`/g,m=>' '.repeat(m.length));
// Mask open and complete inline-code spans, including multi-backtick delimiters.
// A split closing delimiter must not expose the example while it is still arriving.
function holdMask({line,code}){
  if(code)return ' '.repeat(line.length);
  let plain='',at=0;
  while(at<line.length){
    const start=line.indexOf('`',at);if(start<0)return plain+line.slice(at);
    plain+=line.slice(at,start);let end=start;while(line[end]==='`')end++;
    const width=end-start;let close=end;
    for(;;){const next=line.indexOf('`',close);if(next<0){close=line.length;break;}
      let tail=next;while(line[tail]==='`')tail++;
      if(tail-next===width){close=tail;break;}close=tail;}
    plain+=' '.repeat(close-start);at=close;
  }
  return plain;
}
/** Decide the line-start JSON object at source[start]. state true: protocol, null: its first property is
 * still incomplete, false: ordinary JSON. `at` is just past the last character the decision read. */
function jsonHead(source,start,params,hold=false){
  const n=source.length;let i=start+1;
  const skip=()=>{while(i<n&&SPACE.test(source[i]))i++;};
  skip();if(i>=n)return {state:null};
  if(source[i]!=='"')return {state:false,at:i+1};
  KEY.lastIndex=i;const token=KEY.exec(source);
  if(!token){BREAK.lastIndex=i;const line=BREAK.exec(source);return line?{state:false,at:line.index+1}:{state:null};}
  let key;try{key=JSON.parse(token[0]);}catch{return {state:false,at:i+token[0].length};}
  i+=token[0].length;skip();if(i>=n)return {state:null};
  if(source[i]!==':')return {state:false,at:i+1};
  i++;skip();
  if(hold&&key==='kind')return {state:true,at:i};
  if(params.has(key))return {state:true,at:i};
  if(key==='action'){
    const values=['"tool_calls"','"final"'];
    if(values.some(v=>source.startsWith(v,i)))return {state:true,at:i};
    const rest=source.slice(i,i+12);return values.some(v=>v.startsWith(rest))?{state:null}:{state:false,at:i+rest.length};
  }
  if(key==='calls'||key==='tool_calls')return i<n?{state:source[i]==='[',at:i+1}:{state:null};
  return {state:false,at:i};
}
/** One pass over text that begins at a line start (inside a fence when `fenced`):
 * leak — first printed call envelope or host argument object outside code, or -1;
 * pending — where a possibly split envelope begins at the end, or -1;
 * settled — start of the first line whose classification can still change, with its fence state.
 * A completed line never changes, except a line-start JSON head not yet decided by completed lines. */
export function scanText(source,params=new Set(),{fenced=false,hold=false,holdFinal=false}={}){
  const text=String(source),all=lines(text,fenced),last=all[all.length-1],masked=all.map(hold?holdMask:mask),plain=masked.join('\n');
  let leak=-1,pending=-1,settled={offset:last.at,fenced:last.fenced};
  const mark=index=>{if(leak<0||index<leak)leak=index;};
  masked.forEach((line,k)=>{
    const at=all[k].at,dsml=(hold?HOLD_DSML:DSML).exec(line);if(dsml)mark(at+dsml.index);
    if(LINE.test(line)){
      const start=at+line.search(/\S/);
      // Before a delimiter arrives, <tool_call can still become ordinary HTML
      // such as <tool_callback>. Keep it pending rather than irreversibly blocked.
      if(hold&&!holdFinal&&/^\s*<\/?(?:system_call|function_calls?|tool_calls?|custom_tool_call|invoke|parameter)$/i.test(line))pending=pending<0?start:Math.min(pending,start);
      else mark(start);
    }
  });
  let open=false;
  for(const match of plain.matchAll(/^[ \t]*\{/gm)){
    const start=match.index+match[0].length-1,head=jsonHead(plain,start,params,hold);
    if(head.state===true)mark(start);
    else if(head.state===null&&pending<0)pending=start;
    if(!open&&start<last.at&&(head.state===null||start+head.at>last.at)){
      const line=all.findLast(l=>l.at<=start);settled={offset:line.at,fenced:line.fenced};open=true;
    }
  }
  // The open line may still become a line-start envelope or an argument object.
  const at=last.at,lastLine=masked[masked.length-1],head=lastLine.trimStart();
  if(head&&(hold?HOLD_MARKERS:MARKERS).some(m=>hold?m.toLowerCase().startsWith(head.toLowerCase()):m.startsWith(head)))pending=pending<0?at+lastLine.length-head.length:pending;
  if(hold&&(/^(?:<name[ \t]*|"(?:tool_calls|calls)"[ \t]*(?::[ \t]*)?)$/i.test(head)))pending=pending<0?at+lastLine.length-head.length:pending;
  // A DSML marker may begin anywhere: hold any suffix that can still grow into one.
  for(let i=Math.max(0,plain.length-12);i<plain.length;i++)if((hold?HOLD_PARTIAL:PARTIAL).some(p=>p.startsWith(plain.slice(i)))){pending=pending<0?i:Math.min(pending,i);break;}
  return {leak,pending,settled};
}
/** Raw-text DSML test for newly streamed characters; a hit is settled by the exact scan. */
export const hasDsml=text=>DSML.test(text);
/** First index in the stream's last characters where a split DSML marker may begin, or -1.
 * Markers hold no line break, so suffixes reaching into earlier lines never match. */
export function partialAt(tail,length){for(let i=0;i<tail.length;i++)if(PARTIAL.some(p=>p.startsWith(tail.slice(i))))return length-tail.length+i;return -1;}
/** Index of the first printed call envelope, or host argument object, outside code; -1 if none. */
export function protocolAt(text,params=new Set(),options){return scanText(text,params,options).leak;}
/** Where a possibly split envelope begins at the end of streamed text, or -1. */
export function pendingAt(text,params=new Set(),options){return scanText(text,params,options).pending;}
export const scanHoldProtocol=(text,{final=false,...options}={})=>scanText(text,new Set(),{...options,hold:true,holdFinal:final});
export const hasHoldDsml=text=>HOLD_DSML.test(text);
export function holdPartialAt(tail,length){for(let i=0;i<tail.length;i++)if(HOLD_PARTIAL.some(p=>p.startsWith(tail.slice(i))))return length-tail.length+i;return -1;}
