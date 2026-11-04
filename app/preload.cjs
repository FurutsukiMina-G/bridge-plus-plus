const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('workbench',Object.freeze({
  call:(method,args={})=>ipcRenderer.invoke('workbench:call',method,args),
  onEvent:callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on('workbench:event',listener);return()=>ipcRenderer.removeListener('workbench:event',listener);},
  onChange:callback=>{const listener=()=>callback();ipcRenderer.on('workbench:change',listener);return()=>ipcRenderer.removeListener('workbench:change',listener);}
}));
