/* Token counts as people type them: 900K, 1M, 0.75M, 90万, 786432, 786,432.
 * K and M are decimal (1K = 1,000 tokens). That is how the model sources size their windows:
 * Qoder's "1M" option is token_count 1000000, and WorkBuddy reports windows such as 164000 and
 * 960000. Read as 1,024-based, a "1M" budget would be 1,048,576 tokens, larger than the real
 * 1M window. */

const UNITS={k:1e3,m:1e6,'万':1e4};

/** The integer token count in `raw`, null when it is empty, NaN when it is not a count. */
export function parseTokens(raw){
  const text=String(raw??'').trim().replace(/\s*tokens?$/i,'').replace(/[\s,，_]/g,'');
  if(!text)return null;
  const match=/^(\d+(?:\.\d+)?|\.\d+)([kKmM万])?$/.exec(text);
  if(!match)return NaN;
  const value=Number(match[1])*(match[2]?UNITS[match[2].toLowerCase()]:1);
  return Number.isFinite(value)?Math.round(value):NaN;
}

/** How a count goes back into an input: exact, so reading it again gives the same number. */
export function formatTokens(n){
  if(!Number.isSafeInteger(n)||n<0)return'';
  if(n>=1e6&&n%1e3===0)return`${n/1e6}M`;
  if(n>=1e3&&n%1e3===0)return`${n/1e3}K`;
  return String(n);
}

/** Short label for chips and tags; rounds, so it is for reading only. */
export function compactTokens(n){
  if(n==null||!Number.isFinite(n))return'—';
  if(n>=1e6)return`${+(n/1e6).toFixed(2)}M`;
  if(n>=1e3)return`${+(n/1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

/** Explains a budget entry: what it will be, or why it cannot be used. */
export function budgetCheck(raw,{min=4096,max}={}){
  const value=parseTokens(raw);
  if(value===null)return{ok:true,value:null,text:`留空则不设置；可以写 200K、0.5M 这样的数，范围 ${min.toLocaleString()}–${compactTokens(max)}`};
  if(Number.isNaN(value))return{ok:false,value,text:'没看懂这个数，可以写 900K、1M、0.75M 或 786432'};
  if(value<min)return{ok:false,value,text:`至少 ${min.toLocaleString()} tokens`};
  if(max&&value>max)return{ok:false,value,text:`不能超过上下文窗口 ${compactTokens(max)}（${max.toLocaleString()} tokens）`};
  return{ok:true,value,text:`= ${value.toLocaleString()} tokens`};
}
