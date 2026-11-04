/* LaTeX in answers: $…$, $$…$$, \(…\) and \[…\].
   Formulas leave marked as empty placeholders and are rendered after DOMPurify, because KaTeX needs
   inline styles the sanitiser strips. KaTeX escapes its input and runs with trust off. */
import katex from 'katex';

const marker=(tex,display)=>`<span data-md-math="${encodeURIComponent(tex)}"${display?' data-display="1"':''}></span>`;
const DISPLAY=[/^\$\$([\s\S]+?)\$\$/,/^\\\[([\s\S]+?)\\\]/];
// Pandoc's rule keeps prices out: no space just inside the dollars, and no digit right after the closing one.
const INLINE=[/^\\\(([\s\S]+?)\\\)/,/^\$(?![\s$])((?:\\.|[^$\\\n])+?)(?<![\s\\])\$(?!\d)/];

export const mathExtension={extensions:[
  {
    name:'mathBlock',level:'block',
    start(src){const at=src.search(/^[ \t]*(?:\$\$|\\\[)/m);return at<0?undefined:at;},
    tokenizer(src){
      const found=/^[ \t]*(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])[ \t]*(?:\n+|$)/.exec(src);
      return found?{type:'mathBlock',raw:found[0],text:(found[1]??found[2]).trim()}:undefined;
    },
    renderer(token){return marker(token.text,true)+'\n';}
  },
  {
    name:'mathInline',level:'inline',
    start(src){const at=src.search(/(?<!\\)\$|\\[([]/);return at<0?undefined:at;},
    tokenizer(src){
      for(const [rules,display] of [[DISPLAY,true],[INLINE,false]])for(const rule of rules){
        const found=rule.exec(src);
        if(found)return{type:'mathInline',raw:found[0],text:found[1].trim(),display};
      }
    },
    renderer(token){return marker(token.text,token.display);}
  }
]};

/** Swaps placeholders for rendered formulas. A formula KaTeX cannot parse shows its source in the error colour. */
export function replaceMath(html){
  return html.replace(/<span data-md-math="([^"]*)"( data-display="1")?><\/span>/g,(_,raw,display)=>{
    let tex;try{tex=decodeURIComponent(raw);}catch{return'';}
    const rendered=katex.renderToString(tex,{displayMode:!!display,throwOnError:false,strict:'ignore',trust:false,output:'htmlAndMathml'});
    return display?`<span class="math-block">${rendered}</span>`:rendered;
  });
}
