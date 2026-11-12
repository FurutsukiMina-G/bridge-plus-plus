/** Recognize generated call envelopes, not XML examples embedded in ordinary explanations. */
export function isToolProtocolText(text: string): boolean {
  const source = text.trim().replace(/^```(?:xml|json|text)?\s*\n([\s\S]*?)\n```$/i, '$1').trimStart();
  return /^(?:<\/?(?:system_call|function_calls?|tool_calls?|custom_tool_call)\b|<name\s*=|<\/?(?:｜｜(?:DSML|DS)｜｜|｟DSML｠))/i.test(source) ||
    /(?:^|\n)[\t ]*<system_call\b[^>]*>\s*<name\s*=/i.test(source);
}

/** The observed unsupported envelope has no legitimate final-text decoding path. */
export function isLeakedFinalProtocol(text: string): boolean {
  const source=text.trim().replace(/^```(?:xml|json|text)?\s*\n([\s\S]*?)\n```$/i,'$1').trimStart();
  return /^<system_call\b[^>]*>\s*<name\s*=/i.test(source);
}

/** A streamed final may start with a split protocol tag; wait until it can be ruled out. */
export function mayStartToolProtocol(text: string): boolean {
  const start = text.trimStart().toLowerCase();
  if (!start) return true;
  return ['<system_call', '</system_call', '<function_call', '<tool_call', '<custom_tool_call', '<name',
    '<｜｜', '</｜｜', '<｟', '</｟', '```'].some(tag => tag.startsWith(start) || start.startsWith(tag));
}

// Native-only classification. The three legacy exports above are also used by
// the JSON decision path and intentionally keep their existing contracts.
const NATIVE_XML=/^<\/?(?:system_call|function_calls?|tool_calls?|custom_tool_call|invoke|parameter)\b/i;
const NATIVE_DSML=/^<?\/?(?:｜{1,2}(?:DSML|DS)｜{1,2}|｟DSML｠)/i;
const NATIVE_TAGS=['system_call','function_call','tool_call','custom_tool_call','invoke','parameter'];
const NATIVE_STARTS=[...NATIVE_TAGS.flatMap(name=>['<'+name,'</'+name]),'<name','"tool_calls"','"calls"',
  ...['DSML','DS'].flatMap(name=>[1,2].flatMap(left=>[1,2].flatMap(right=>{
    const marker='｜'.repeat(left)+name+'｜'.repeat(right);return [marker,'<'+marker,'</'+marker,'/'+marker];
  }))), '｟DSML｠','<｟DSML｠','</｟DSML｠'];
type NativeLine={at:number;line:string;code:boolean;fenced:boolean};
export type NativeProtocolScan={leak:number;pending:number;settled:{offset:number;fenced:boolean}};
function nativeLines(text:string,fenced:boolean):NativeLine[]{
  let at=0;return text.split('\n').map(line=>{
    const fence=/^[ \t]*(?:```|~~~)/.test(line),row={at,line,code:fenced||fence,fenced};
    if(fence)fenced=!fenced;at+=line.length+1;return row;
  });
}
/** Preserve offsets while masking complete or still-arriving inline code. */
function nativeMask({line,code}:NativeLine):string{
  if(code)return ' '.repeat(line.length);
  let plain='',at=0;
  while(at<line.length){
    const start=line.indexOf('`',at);if(start<0)return plain+line.slice(at);
    plain+=line.slice(at,start);let end=start;while(line[end]==='`')end++;
    const width=end-start;let close=end;
    for(;;){const next=line.indexOf('`',close);if(next<0){close=line.length;break;}
      let tail=next;while(line[tail]==='`')tail++;
      if(tail-next===width){close=tail;break;}close=tail;
    }
    plain+=' '.repeat(close-start);at=close;
  }
  return plain;
}
function nativeJsonHead(source:string,start:number):boolean|null{
  let rest=source.slice(start+1).trimStart();if(!rest)return null;
  if(!rest.startsWith('"'))return false;
  const token=/^"(?:[^"\\\r\n]|\\.)*"/.exec(rest);
  if(!token)return /[\r\n]/.test(rest)?false:null;
  let key:string;try{key=JSON.parse(token[0]) as string;}catch{return false;}
  rest=rest.slice(token[0].length).trimStart();if(!rest)return null;
  if(!rest.startsWith(':'))return false;rest=rest.slice(1).trimStart();
  if(key==='kind')return true;
  if(key==='action'){
    const values=['"tool_calls"','"final"'];
    if(values.some(value=>rest.startsWith(value)))return true;
    return values.some(value=>value.startsWith(rest))?null:false;
  }
  if(key==='tool_calls'||key==='calls')return rest?rest.startsWith('['):null;
  return false;
}

/** Native calls are recognized at visible line starts outside inline/fenced
 * code. A code block is explanatory text even when it is the entire response.
 * Pending JSON heads retain their first line across arbitrary stream splits. */
export function scanNativeProtocol(text:string,{fenced=false,final=false}:{fenced?:boolean;final?:boolean}={}):NativeProtocolScan{
  const rows=nativeLines(text,fenced),last=rows.at(-1)!,masked=rows.map(nativeMask),plain=masked.join('\n');
  let leak=-1,pending=-1,settled={offset:last.at,fenced:last.fenced};
  const mark=(at:number)=>{if(leak<0||at<leak)leak=at;};
  const wait=(at:number)=>{if(pending<0||at<pending)pending=at;};
  const retain=(at:number)=>{for(let i=rows.length-1;i>=0;i--){const row=rows[i]!;if(row.at<=at){if(row.at<settled.offset)settled={offset:row.at,fenced:row.fenced};break;}}};
  masked.forEach((line,index)=>{
    const head=line.trimStart(),at=rows[index]!.at+line.length-head.length;
    if(NATIVE_XML.test(head)){
      // <tool_call can still become the ordinary element <tool_callback>.
      if(!final&&index===rows.length-1&&/^<\/?(?:system_call|function_calls?|tool_calls?|custom_tool_call|invoke|parameter)$/i.test(head))wait(at);
      else mark(at);
    }
    if(NATIVE_DSML.test(head)||/^"(?:tool_calls|calls)"\s*:\s*\[/i.test(head))mark(at);
  });
  for(const match of plain.matchAll(/^[ \t]*\{/gm)){
    const at=match.index!+match[0].length-1,state=nativeJsonHead(plain,at);
    if(state===true)mark(at);else if(state===null){wait(at);retain(at);}
  }
  // The name alias can carry whitespace, including a newline, before '='.
  for(const match of plain.matchAll(/^[ \t]*<name(?=\s|=|$)/gim)){
    const at=match.index!+match[0].indexOf('<'),rest=plain.slice(at+5);
    if(/^\s*=/.test(rest))mark(at);else if(!rest.trim()){wait(at);retain(at);}
  }
  const head=masked.at(-1)!.trimStart(),at=last.at+masked.at(-1)!.length-head.length;
  if(!head||NATIVE_STARTS.some(prefix=>prefix.toLowerCase().startsWith(head.toLowerCase()))||/^"(?:tool_calls|calls)"[ \t]*(?::[ \t]*)?$/i.test(head))wait(at);
  return {leak,pending,settled};
}

class NativeChunks{
  private list:string[]=[];private first=0;start=0;end=0;
  push(text:string){this.list.push(text);this.end+=text.length;}
  slice(from:number,to:number):string{
    const pieces:string[]=[];let at=this.end;
    // Newly emitted text is at the tail; never walk every earlier chunk again.
    for(let i=this.list.length-1;i>=this.first&&at>from;i--){
      const part=this.list[i]!,start=at-part.length;
      if(start<to)pieces.push(part.slice(Math.max(0,from-start),Math.min(part.length,to-start)));at=start;
    }return pieces.reverse().join('');
  }
  drop(to:number){
    while(this.first<this.list.length&&this.start+this.list[this.first]!.length<=to){this.start+=this.list[this.first]!.length;this.first++;}
    if(this.first<this.list.length&&this.start<to){this.list[this.first]=this.list[this.first]!.slice(to-this.start);this.start=to;}
    if(this.first>64&&this.first*2>this.list.length){this.list=this.list.slice(this.first);this.first=0;}
  }
  text(){const text=this.list.slice(this.first).join('');this.list=[text];this.first=0;return text;}
}

/** Incremental native-only gate: settled lines are forgotten, plain open lines
 * use a fast path, and possible/confirmed protocol text is never released. */
export class NativeProtocolGate{
  private parts:string[]=[];private length=0;private window=new NativeChunks();private base=0;private fenced=false;
  private line=0;private lineHead:string|null=null;
  emitted=0;blocked=false;
  constructor(private readonly send:(text:string)=>void,readonly enabled=true){}
  get text(){if(this.parts.length>1)this.parts=[this.parts.join('')];return this.parts[0]??'';}
  get emittedText(){return this.text.slice(0,this.emitted);}
  push(text:string){
    if(!text)return;const start=this.length;this.parts.push(text);this.length+=text.length;
    if(!this.enabled||this.blocked)return;this.window.push(text);
    const breakAt=text.lastIndexOf('\n');if(breakAt>=0){this.line=start+breakAt+1;this.lineHead=null;}
    if(this.lineHead===null){const from=Math.max(0,this.line-start),at=text.slice(from).search(/\S/);if(at>=0)this.lineHead=text[from+at]!;}
    this.pump();
  }
  pump(final=false){
    if(!this.enabled||this.blocked)return;
    const scan=this.line===this.base&&this.lineHead!==null&&!('`~{<"｜/｟'.includes(this.lineHead))
      ?{leak:-1,pending:-1,settled:{offset:0,fenced:this.fenced}}
      :scanNativeProtocol(this.window.text(),{fenced:this.fenced,final});
    if(scan.leak>=0){this.release(this.base+scan.leak);this.blocked=true;this.window=new NativeChunks();return;}
    this.release(final||scan.pending<0?this.length:this.base+scan.pending);
    const settled=this.base+scan.settled.offset;
    if(settled<=this.emitted&&settled>this.base){this.window.drop(settled);this.base=settled;this.fenced=scan.settled.fenced;}
  }
  private release(end:number){
    if(end<=this.emitted)return;
    if(/[\uD800-\uDBFF]/.test(this.window.slice(end-1,end)))end--;
    const text=this.window.slice(this.emitted,end);if(text){this.send(text);this.emitted=end;}
  }
}
