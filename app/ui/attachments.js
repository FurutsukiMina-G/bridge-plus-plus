import {icon} from './icons.js';

/* Images, video and audio in the composer and the transcript. The backend decides what a
 * runtime and model accept (attachment:capabilities), stages every file under its own
 * random id and serves it back only through bridge-media: URLs; this module never reads
 * paths and never fetches anything remote. */

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const KINDS=['image','video','audio'];
const kindNames={image:'图片',video:'视频',audio:'音频'};
const kindIcons={image:'image',video:'film',audio:'music'};

export const kindName=kind=>kindNames[kind]??'文件';
export const kindIcon=kind=>kindIcons[kind]??'file';
/** Anything shown in the transcript must come back from the backend's own protocol. */
export const mediaUrl=url=>typeof url==='string'&&/^bridge-media:\/\//i.test(url)?url:null;

export function fileSize(bytes){
  if(!Number.isFinite(bytes)||bytes<0)return'';
  if(bytes<1024)return`${bytes} B`;
  const units=['KB','MB','GB'];let value=bytes/1024,unit=0;
  while(value>=1024&&unit<units.length-1){value/=1024;unit++;}
  return`${value>=100?Math.round(value):+value.toFixed(1)} ${units[unit]}`;
}

/* The backend lists the MIME types it accepts per kind; the matching extensions let a file be
 * refused before upload. The backend still sniffs the bytes and has the final word. */
const mimeExtensions={'image/png':['png'],'image/jpeg':['jpg','jpeg'],'image/gif':['gif'],'image/webp':['webp'],'audio/wav':['wav'],'audio/mpeg':['mp3'],'audio/ogg':['ogg'],'audio/flac':['flac'],'video/mp4':['mp4'],'video/webm':['webm']};
const extensionOf=name=>(/\.([^.]+)$/.exec(name)?.[1]??'').toLowerCase();
const extensionsOf=(caps,kind)=>(caps?.[kind]?.mimes??[]).flatMap(m=>mimeExtensions[m]??[]);
/** The kind whose accepted formats include this file (allowed or not), or null for any other format. */
export function kindOf(name,caps){const ext=extensionOf(name);return KINDS.find(kind=>extensionsOf(caps,kind).includes(ext))??null;}
const formatLabels={jpg:'JPEG',jpeg:'JPEG',webp:'WebP',webm:'WebM'};
export function formatsText(caps,kinds){return[...new Set(kinds.flatMap(kind=>extensionsOf(caps,kind)).map(e=>formatLabels[e]??e.toUpperCase()))].join('、');}

/* Media whose file is gone (cleaned after a failed send, or removed outside Bridge++) shows a placeholder. */
const brokenUrls=new Set();
export function markBroken(url){if(!mediaUrl(url)||brokenUrls.has(url))return false;brokenUrls.add(url);return true;}

/** Which kinds the current runtime and model accept; caps is undefined while unknown. */
export function allowedKinds(caps){return caps?KINDS.filter(kind=>caps[kind]?.allowed):[];}
export function refusal(caps,kind){
  if(caps===undefined)return'正在确认当前模型支持的附件类型…';
  if(!caps)return'当前版本的后端还不支持附件';
  const entry=caps[kind];
  if(kind&&entry&&!entry.allowed)return entry.reason||`当前模型不支持${kindName(kind)}输入`;
  // Nothing is allowed: images are what people attach most, so their reason speaks for all.
  const reason=KINDS.map(k=>caps[k]?.reason).find(Boolean);
  return reason?`当前模型不接受附件：${reason}`:'当前模型不接受附件';
}
export const capabilityKey=(runtimeId,selection)=>JSON.stringify([runtimeId,selection?.modelKey??null,selection?.identity??null,selection?.nativeModel??null]);

/** Attachments waiting in a draft until the message goes out, keyed like the text drafts. */
export class PendingAttachments {
  constructor(){this.byDraft=new Map();this.seq=0;}
  list(key){return this.byDraft.get(key)??[];}
  add(key,item){const entry={localId:`att-${++this.seq}`,...item};this.byDraft.set(key,[...this.list(key),entry]);return entry;}
  update(key,localId,patch){this.byDraft.set(key,this.list(key).map(x=>x.localId===localId?{...x,...patch}:x));}
  remove(key,localId){const entry=this.list(key).find(x=>x.localId===localId);this.byDraft.set(key,this.list(key).filter(x=>x.localId!==localId));return entry;}
  take(key){const list=this.list(key);this.byDraft.delete(key);return list;}
  move(from,to){if(from===to)return;const moved=this.take(from);if(moved.length)this.byDraft.set(to,[...this.list(to),...moved]);}
}

/* ---------- composer tray ---------- */
function trayThumb(item){
  const url=mediaUrl(item.attachment?.url),kind=item.attachment?.kind??item.kind;
  if(item.status==='ready'&&kind==='image'&&url)return`<img src="${esc(url)}" alt="" draggable="false">`;
  // A paused, muted video shows its first frame as the thumbnail.
  if(item.status==='ready'&&kind==='video'&&url)return`<video class="tray-video" src="${esc(url)}" muted preload="metadata"></video>`;
  return`<span class="tray-glyph">${item.status==='staging'?'<span class="spinner"></span>':icon(item.status==='error'?'alert':kindIcon(kind))}</span>`;
}
export function trayHtml(items){
  return items.map(item=>{
    const a=item.attachment??{},name=a.name??item.name,size=fileSize(a.size??item.size);
    const sub=item.status==='staging'?'正在处理…':item.status==='error'?item.error||'无法添加':[kindName(a.kind??item.kind),size].filter(Boolean).join(' · ');
    return`<div class="tray-item ${esc(item.status)}" title="${esc(item.status==='error'?`${name}：${item.error??'无法添加'}`:name)}">${trayThumb(item)}<span class="tray-text"><span class="tray-name">${esc(name)}</span><span class="tray-sub">${esc(sub)}</span></span><button class="tray-remove" data-attach-remove="${esc(item.localId)}" title="移除" aria-label="移除 ${esc(name)}">${icon('close')}</button></div>`;
  }).join('');
}

/* ---------- transcript ---------- */
function mediaActions(url,name){
  return`<span class="media-actions"><button class="icon-btn xs" data-media-reveal="${esc(url)}" title="在文件夹中显示">${icon('folder')}</button><button class="icon-btn xs" data-media-save="${esc(url)}" data-media-name="${esc(name)}" title="另存为…">${icon('download')}</button></span>`;
}
/** One image, video or audio element; anything without a bridge-media URL becomes a plain label. */
export function mediaElement(a,{thumb=false,gone=false}={}){
  const url=mediaUrl(a?.url),name=a?.name??kindName(a?.kind);
  if(gone)return`<span class="media-missing">${icon(kindIcon(a?.kind))}<span>${esc(name)}</span><span class="muted">（发送失败，已清理）</span></span>`;
  if(!url||brokenUrls.has(url))return`<span class="media-missing">${icon('alert')}<span>${esc(name)}</span><span class="muted">（文件已不在）</span></span>`;
  if(a.kind==='image')return`<button class="media-image${thumb?' thumb':''}" data-media-open="${esc(url)}" data-media-name="${esc(name)}" title="查看大图"><img src="${esc(url)}" alt="${esc(name)}" loading="lazy" draggable="false"></button>`;
  if(a.kind==='video')return`<video class="media-video" src="${esc(url)}" controls preload="metadata"></video>`;
  if(a.kind==='audio')return`<audio class="media-audio" src="${esc(url)}" controls preload="metadata"></audio>`;
  return`<span class="media-missing">${icon('file')}<span>${esc(name)}</span></span>`;
}
/** What the user attached, above their bubble; `discarded` holds ids the backend cleaned after a failed send. */
export function userMediaHtml(list,discarded=new Set()){
  if(!Array.isArray(list)||!list.length)return'';
  const gone=list.filter(a=>discarded.has(a.id)||brokenUrls.has(a.url)),shown=list.filter(a=>!gone.includes(a));
  const images=shown.filter(a=>a.kind==='image'),others=shown.filter(a=>a.kind!=='image');
  const grid=images.length?`<div class="user-media-grid count-${Math.min(images.length,4)}">${images.map(a=>mediaElement(a,{thumb:true})).join('')}</div>`:'';
  const rest=others.map(a=>`<figure class="user-media-item">${mediaElement(a)}<figcaption>${icon(kindIcon(a.kind))}<span>${esc(a.name??kindName(a.kind))}</span><span class="muted">${esc(fileSize(a.size))}</span></figcaption></figure>`).join('');
  const missing=gone.map(a=>mediaElement(a,{gone:discarded.has(a.id)})).join('');
  return`<div class="user-media">${grid}${rest}${missing}</div>`;
}
const originNames={imageGeneration:'图片生成',image_generation:'图片生成',generate_image:'图片生成',codex:'Codex',kimi:'Kimi Code',dsh:'DSH',antigravity:'Antigravity',claude:'Claude Code'};
/** Media a runtime produced (a generated image, an audio reply…). */
export function mediaCardHtml(e){
  const url=mediaUrl(e.url),name=e.name??kindName(e.kind),raw=e.origin?.tool??e.origin?.runtimeId??'',origin=originNames[raw]??raw;
  const meta=[kindName(e.kind),fileSize(e.size),origin].filter(Boolean).join(' · ');
  return`<figure class="media-card kind-${esc(e.kind??'file')}">${mediaElement(e)}<figcaption><span class="media-name">${icon(kindIcon(e.kind))}<span>${esc(name)}</span></span><span class="muted">${esc(meta)}</span>${url?mediaActions(url,name):''}</figcaption></figure>`;
}

/* ---------- media referenced from assistant markdown ---------- */
/** marked renders every ![alt](href) as a marker that survives sanitising; local files are
 * swapped for media once the backend has resolved them, remote ones stay inert labels. */
export const markerHtml=(href,alt)=>`<span data-md-media="${esc(encodeURIComponent(href??''))}" data-md-alt="${esc(encodeURIComponent(alt??''))}"></span>`;
const MARKER=/<span data-md-media="([^"]*)" data-md-alt="([^"]*)"><\/span>/g;
export const isRemote=href=>/^(https?:)?\/\//i.test(href)||/^(data|blob|javascript):/i.test(href);
export function replaceMarkers(html,lookup){
  return html.replace(MARKER,(_,rawHref,rawAlt)=>{
    let href,alt;try{href=decodeURIComponent(rawHref);alt=decodeURIComponent(rawAlt);}catch{return'';}
    const label=alt||href;
    if(isRemote(href))return`<span class="md-media-link" title="${esc(href)}">${icon('image')}<span>${esc(label)}</span><span class="muted">（远程图片未加载）</span></span>`;
    const found=lookup(href);
    if(found===undefined)return`<span class="md-media-link loading" title="${esc(href)}"><span class="spinner"></span><span>${esc(label)}</span></span>`;
    if(!found||!mediaUrl(found.url))return`<span class="md-media-link" title="${esc(href)}">${icon('image')}<span>${esc(label)}</span><span class="muted">（找不到或不是项目内的媒体文件）</span></span>`;
    return`<span class="md-media">${mediaElement({...found,name:found.name??alt})}</span>`;
  });
}
