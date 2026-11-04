/* Links in answers that point at local files, and the file a tool call worked on. */
const attr=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

/** A local path and optional line, or null for web links and anchors. A one-letter "scheme" is a drive. */
export function parseFileLink(href){
  let text=String(href??'').trim();
  if(!text||text.startsWith('#'))return null;
  const scheme=/^[a-z][a-z0-9+-]+:/i.exec(text);
  if(/^file:/i.test(text))text=text.replace(/^file:\/*/i,'');
  // "README:12" is a file and a line, not a scheme.
  else if(scheme&&!/^\d+(?::\d+)?$/.test(text.slice(scheme[0].length)))return null;
  try{text=decodeURIComponent(text);}catch{}
  const fragment=/#L?(\d+)(?:[-,]L?\d+)?$/i.exec(text);
  if(fragment)text=text.slice(0,fragment.index);
  const suffix=fragment?null:/:(\d+)(?::\d+)?$/.exec(text);
  if(suffix)text=text.slice(0,suffix.index);
  if(!text)return null;
  const line=Number((fragment??suffix)?.[1]);
  return{path:text,line:line>0?line:null};
}

/** A web address a click may hand to the browser. Anything else, or one hiding a login in the URL, is not opened. */
export function webLink(href){
  try{const url=new URL(String(href??''));return['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}
}

export const fileLinks={renderer:{
  link(token){
    const web=webLink(token.href);
    if(web)return`<a href="${attr(web)}" title="${attr(token.title||web)}">${this.parser.parseInline(token.tokens)}</a>`;
    const file=parseFileLink(token.href);
    if(!file)return false;
    return`<a class="file-link" href="#" data-link-path="${attr(file.path)}"${file.line?` data-link-line="${file.line}"`:''} title="${attr(file.path)}">${this.parser.parseInline(token.tokens)}</a>`;
  }
}};

/** The file a tool call worked on, whatever the runtime calls the argument. */
export function toolFilePath(args){
  const value=Object.entries(args??{}).find(([key])=>/^(?:file_?path|path|absolute_?path|target_?file)$/i.test(key))?.[1];
  return typeof value==='string'&&value.trim()?value:null;
}
