/* Bold and italic next to Chinese, Japanese and Korean text.
 * CommonMark lets a * run close only when the character inside it is not punctuation or the
 * one outside is space or punctuation (and the mirror rule for opening), so model output like
 * **大红色（纯红）**纯色 or 这是**“重要”**的 stays literal. Following the idea of the CJK-friendly
 * emphasis proposal, a CJK character on either side of the run also satisfies that condition.
 * Only * runs are handled, and only when the relaxed rule changes something; everything else
 * goes back to marked's own tokenizer, so text without CJK renders exactly as before. */

const CJK=/[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Hangul}\p{scx=Bopomofo}　-〿︐-︟︰-﹯＀-￯]/u;
const SPACE=/\s/u,PUNCT=/[\p{P}\p{S}]/u,RUN=/\*+/g;
// marked skips a lone * inside __strong__ at the start of the text it scans for a closer.
const ORPHAN=/^[^_*]*?__[^_*]*?\*[^_*]*?(?=__)/;

const isCjk=c=>!!c&&CJK.test(c);
function charBefore(text,index){
  if(index<=0)return'';
  const low=text.charCodeAt(index-1);
  return low>=0xdc00&&low<=0xdfff&&index>1?text.slice(index-2,index):text[index-1];
}
const charAt=(text,index)=>index<text.length?String.fromCodePoint(text.codePointAt(index)):'';

/** Whether a * run between `before` and `after` ('' at either end of the text) can open (left) or close (right). */
export function flanking(before,after,{gfm=true,cjk=true}={}){
  const punct=c=>!!c&&PUNCT.test(c)&&!(gfm&&c==='~'),space=c=>!c||SPACE.test(c);
  const sb=space(before),sa=space(after),pb=punct(before),pa=punct(after),wide=cjk&&(isCjk(before)||isCjk(after));
  return{left:!sa&&(!pa||sb||pb||wide),right:!sb&&(!pb||sa||pa||wide)};
}

/** marked's emStrong for * runs with CJK-aware flanking. `fallback:false` and `cjk:false`
 * together reproduce marked's own result, which the tests use to check the scan below. */
export function emphasisTokenizer({cjk=true,fallback=true}={}){
  return function emStrong(src,maskedSrc,prevChar=''){
    if(src[0]!=='*'||this.options.pedantic)return false;
    const open=this.rules.inline.emStrongLDelim.exec(src);
    if(!open||!open[1]&&!open[2])return false;
    const gfm=!!this.options.gfm,length=/^\*+/.exec(src)[0].length;
    const strict=!open[1]||!prevChar||!!this.rules.inline.punctuation.exec(prevChar);
    if(!strict&&!(cjk&&(isCjk(prevChar)||isCjk(open[1]))))return false;
    // The masked source has code, links and escapes blanked out at the same offsets.
    const rest=maskedSrc.slice(-src.length+length),skip=ORPHAN.exec(rest)?.[0].length??0,runs=[];
    let changed=!strict;
    for(const m of rest.slice(skip).matchAll(RUN)){
      const index=skip+m.index,before=charBefore(rest,index),after=charAt(rest,index+m[0].length);
      const run={index,length:m[0].length,...flanking(before,after,{gfm,cjk})};
      if(cjk){const plain=flanking(before,after,{gfm,cjk:false});if(plain.left!==run.left||plain.right!==run.right)changed=true;}
      runs.push(run);
    }
    if(fallback&&!changed)return false;
    // From here on this is marked's own pairing: the rule of three, and an opener that follows a
    // literal * gives up at the first run that could either open or close.
    let total=length,middle=0;
    for(const run of runs){
      if(!run.left&&!run.right)continue;
      if(!run.right){total+=run.length;continue;}
      if(run.left){
        if(length%3&&!((length+run.length)%3)){middle+=run.length;continue;}
        if(prevChar==='*')break;
      }
      total-=run.length;
      if(total>0)continue;
      const used=Math.min(run.length,run.length+total+middle),raw=src.slice(0,length+run.index+used);
      if(Math.min(length,used)%2){const text=raw.slice(1,-1);return{type:'em',raw,text,tokens:this.lexer.inlineTokens(text)};}
      const text=raw.slice(2,-2);
      return{type:'strong',raw,text,tokens:this.lexer.inlineTokens(text)};
    }
  };
}

export const cjkEmphasis={tokenizer:{emStrong:emphasisTokenizer()}};
