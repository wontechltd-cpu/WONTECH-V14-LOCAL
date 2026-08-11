const {app,BrowserWindow,ipcMain,dialog,shell}=require('electron');
const path=require('path');
const fs=require('fs');

const windows=new Map();
const iconPath=path.join(__dirname,'assets','WontechQuote.ico');
let storePath;

function defaults(){return {memoData:{tasksByDate:{},rollLastDate:null},checklist:[],documents:[],logoData:null};}
function readStore(){
  try{const raw=JSON.parse(fs.readFileSync(storePath,'utf8'));return {...defaults(),...raw};}
  catch{return defaults();}
}
function writeStore(data){fs.mkdirSync(path.dirname(storePath),{recursive:true});fs.writeFileSync(storePath,JSON.stringify(data,null,2),'utf8');}
function getStore(key){return readStore()[key];}
function setStore(key,value){const d=readStore();d[key]=value;writeStore(d);return value;}
function dataUrlFromFile(file){const ext=path.extname(file).toLowerCase();const mime=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;}
function getLogo(){return getStore('logoData')||dataUrlFromFile(path.join(__dirname,'assets','wontech-logo.jpg'));}

function windowOpts(extra={}){return {width:900,height:820,minWidth:520,minHeight:500,backgroundColor:'#eef2f6',autoHideMenuBar:true,icon:iconPath,show:true,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false},...extra};}
function createNamed(name,file,extra={}){
  const existing=windows.get(name);if(existing&&!existing.isDestroyed()){existing.focus();return existing;}
  const win=new BrowserWindow(windowOpts(extra));
  windows.set(name,win);win.on('closed',()=>windows.delete(name));win.loadFile(file);return win;
}
function createMain(){return createNamed('main','index.html',{width:760,height:860,alwaysOnTop:false});}
function openManager(type){const name=type==='order'?'order-manager':'quote-manager';const existing=windows.get(name);if(existing&&!existing.isDestroyed()){existing.focus();return;}
  const win=new BrowserWindow(windowOpts({width:1050,height:720}));windows.set(name,win);win.on('closed',()=>windows.delete(name));win.loadFile('manager.html',{query:{type}});
}
function openEditor(type='quote',docId=''){
  const name='editor-'+(docId||Date.now());const win=new BrowserWindow(windowOpts({width:1450,height:940,minWidth:900,minHeight:650}));windows.set(name,win);win.on('closed',()=>windows.delete(name));
  win.loadFile('WontechQuote.html',{query:{type,docId}});
}

app.whenReady().then(()=>{storePath=path.join(app.getPath('userData'),'wontech-v14-data.json');createMain();});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createMain();});

ipcMain.handle('store:get',(_,key)=>getStore(key));
ipcMain.handle('store:set',(_,key,value)=>setStore(key,value));
ipcMain.handle('logo:get',()=>getLogo());
ipcMain.handle('logo:pick',async(event)=>{
  const owner=BrowserWindow.fromWebContents(event.sender);const r=await dialog.showOpenDialog(owner,{title:'WONTECH 마크 이미지 선택',properties:['openFile'],filters:[{name:'이미지',extensions:['png','jpg','jpeg','webp']}]});
  if(r.canceled||!r.filePaths[0])return null;const data=dataUrlFromFile(r.filePaths[0]);setStore('logoData',data);return data;
});
ipcMain.handle('window:open',(_,kind,arg)=>{
  if(kind==='checklist')createNamed('checklist','checklist.html',{width:1050,height:760});
  else if(kind==='translator')createNamed('translator','translator.html',{width:900,height:650});
  else if(kind==='quote-manager')openManager('quote');
  else if(kind==='order-manager')openManager('order');
  else if(kind==='editor')openEditor(arg?.type||'quote',arg?.docId||'');
  return true;
});
ipcMain.handle('window:top',(event,value)=>{const w=BrowserWindow.fromWebContents(event.sender);w.setAlwaysOnTop(!!value);return w.isAlwaysOnTop();});
ipcMain.handle('external:open',(_,url)=>shell.openExternal(url));

ipcMain.handle('docs:list',(_,type)=>getStore('documents').filter(x=>!type||x.type===type).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')));
ipcMain.handle('docs:get',(_,id)=>getStore('documents').find(x=>x.id===id)||null);
ipcMain.handle('docs:save',(_,doc)=>{const docs=getStore('documents');const i=docs.findIndex(x=>x.id===doc.id);if(i>=0)docs[i]=doc;else docs.push(doc);setStore('documents',docs);return doc;});
ipcMain.handle('docs:delete',(_,id)=>{setStore('documents',getStore('documents').filter(x=>x.id!==id));return true;});

ipcMain.handle('output:print',async(event)=>new Promise(resolve=>event.sender.print({silent:false,printBackground:true},(success,reason)=>resolve({success,reason}))));
ipcMain.handle('output:pdf',async(event,defaultName='WONTECH_업무메모')=>{
  const owner=BrowserWindow.fromWebContents(event.sender);const r=await dialog.showSaveDialog(owner,{defaultPath:defaultName+'.pdf',filters:[{name:'PDF',extensions:['pdf']}]});if(r.canceled)return false;
  const buf=await event.sender.printToPDF({printBackground:true,pageSize:'A4',margins:{marginType:'default'}});fs.writeFileSync(r.filePath,buf);return true;
});

ipcMain.handle('output:bytes',async(event,bytes,defaultName='WONTECH_문서')=>{
  const owner=BrowserWindow.fromWebContents(event.sender);const ext=path.extname(defaultName).replace('.','')||'dat';
  const r=await dialog.showSaveDialog(owner,{defaultPath:defaultName,filters:[{name:'파일',extensions:[ext]}]});if(r.canceled)return false;
  fs.writeFileSync(r.filePath,Buffer.from(bytes));return true;
});

ipcMain.handle('output:image',async(event,dataUrl,defaultName='WONTECH_업무메모')=>{
  const owner=BrowserWindow.fromWebContents(event.sender);const r=await dialog.showSaveDialog(owner,{defaultPath:defaultName+'.jpg',filters:[{name:'JPG',extensions:['jpg']}]});if(r.canceled)return false;
  const m=String(dataUrl).match(/^data:image\/(?:jpeg|jpg|png);base64,(.+)$/);if(!m)throw new Error('이미지 데이터 형식 오류');fs.writeFileSync(r.filePath,Buffer.from(m[1],'base64'));return true;
});
