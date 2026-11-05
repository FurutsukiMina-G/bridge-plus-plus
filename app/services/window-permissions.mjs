export function allowMainWindowFullscreen({permission,requestingUrl,isMainWindow,entryUrl}){return permission==='fullscreen'&&isMainWindow===true&&requestingUrl===entryUrl;}
