const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('wontech',{
  get:key=>ipcRenderer.invoke('store:get',key),
  set:(key,value)=>ipcRenderer.invoke('store:set',key,value),
  getLogo:()=>ipcRenderer.invoke('logo:get'),
  pickLogo:()=>ipcRenderer.invoke('logo:pick'),
  open:(kind,arg)=>ipcRenderer.invoke('window:open',kind,arg),
  top:value=>ipcRenderer.invoke('window:top',value),
  openExternal:url=>ipcRenderer.invoke('external:open',url),
  listDocuments:type=>ipcRenderer.invoke('docs:list',type),
  getDocument:id=>ipcRenderer.invoke('docs:get',id),
  saveDocument:doc=>ipcRenderer.invoke('docs:save',doc),
  deleteDocument:id=>ipcRenderer.invoke('docs:delete',id),
  print:()=>ipcRenderer.invoke('output:print'),
  pdf:name=>ipcRenderer.invoke('output:pdf',name),
  saveImage:(dataUrl,name)=>ipcRenderer.invoke('output:image',dataUrl,name),
  saveBytes:(bytes,name)=>ipcRenderer.invoke('output:bytes',bytes,name)
});
