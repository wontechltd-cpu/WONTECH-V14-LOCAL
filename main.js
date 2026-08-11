const {app,BrowserWindow,ipcMain,dialog,shell}=require('electron');
const path=require('path');
const fs=require('fs');
const crypto=require('crypto');

const windows=new Map();
const iconPath=path.join(__dirname,'assets','WontechQuote.ico');
let storePath;

// V14.0.0과 동일한 데이터 폴더를 사용해 기존 업무메모·견적·발주 자료를 그대로 이어갑니다.
app.setPath('userData',path.join(app.getPath('appData'),'wontech-v14-local'));

function defaults(){return {memoData:{tasksByDate:{},rollLastDate:null},checklist:[],documents:[],quoteTracking:{items:[],contacts:[],output:{orientation:'landscape',density:'normal'},columnWidths:[]},outputDirectory:'',logoData:null};}
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
function createMain(){const win=createNamed('main','index.html',{width:1180,height:900,minWidth:760,minHeight:650,alwaysOnTop:false});win.maximize();return win;}
function openManager(type){
  const name=type==='order'?'order-manager':'quote-manager';
  const existing=windows.get(name);if(existing&&!existing.isDestroyed()){existing.focus();return;}
  const win=new BrowserWindow(windowOpts({width:1050,height:720}));
  windows.set(name,win);win.on('closed',()=>windows.delete(name));win.loadFile('manager.html',{query:{type}});win.maximize();
}

const editorIntegration=`
(async()=>{
  if(!window.wontech)return;
  const params=new URLSearchParams(location.search);
  const requested=params.get('type')==='order'?'order':'quote';
  let currentDocId=params.get('docId')||'';

  async function saveToManager(){
    const t=typeof totals==='function'?totals():{g:0};
    if(!currentDocId)currentDocId=(crypto.randomUUID?crypto.randomUUID():String(Date.now()));
    const rec={
      id:currentDocId,
      type:document.getElementById('docType')?.value||requested,
      date:document.getElementById('date')?.value||'',
      item:document.getElementById('item')?.value||'',
      client:document.getElementById('client')?.value||'',
      contact:document.getElementById('contact')?.value||'',
      total:t.g||0,
      payload:typeof payload==='function'?payload():null,
      updatedAt:new Date().toISOString()
    };
    await window.wontech.saveDocument(rec);
    return rec;
  }

  try{
    const logo=await window.wontech.getLogo();
    if(logo)document.querySelectorAll('.logo img').forEach(img=>img.src=logo);
    if(currentDocId){
      const rec=await window.wontech.getDocument(currentDocId);
      if(rec&&rec.payload&&typeof apply==='function')apply(rec.payload);
      if(typeof setDocType==='function')setDocType((rec&&rec.type)||requested);
    }else if(typeof setDocType==='function')setDocType(requested);
  }catch(e){console.error('V14 editor init',e);if(typeof setDocType==='function')setDocType(requested);}

  window.saveHistory=async function(){
    try{
      await saveToManager();
      if(typeof toast==='function')toast((document.getElementById('docType')?.value==='order'?'발주':'견적')+' 이력관리에 저장했습니다.');
      return true;
    }catch(e){alert('이력관리 저장 중 문제가 발생했습니다.\\n'+e.message);return false;}
  };

  const originalNewQuote=window.newQuote;
  window.newQuote=function(){
    const mode=document.getElementById('docType')?.value||requested;
    const created=typeof originalNewQuote==='function'?originalNewQuote():true;
    if(created===false)return false;
    currentDocId='';
    if(typeof setDocType==='function')setDocType(mode);
    document.querySelectorAll('.sheet input,.sheet textarea,.sheet select,.sheet button').forEach(control=>{control.disabled=false;control.readOnly=false;});
    requestAnimationFrame(()=>document.getElementById('client')?.focus());
    return true;
  };

  const actions=document.querySelector('.actions');
  if(actions){
    const loadLabel=actions.querySelector('.file-button');
    const historyButton=document.createElement('button');
    historyButton.id='saveHistoryButton';historyButton.type='button';historyButton.textContent='이력 저장';
    historyButton.onclick=()=>window.saveHistory();
    actions.insertBefore(historyButton,loadLabel||null);

    const folderButton=document.createElement('button');
    folderButton.id='outputFolderButton';folderButton.type='button';folderButton.textContent='저장 위치';
    folderButton.onclick=async()=>{
      const selected=await window.wontech.chooseOutputDirectory();
      if(selected&&typeof toast==='function')toast('파일 저장 위치를 '+selected+' 폴더로 설정했습니다.');
    };
    actions.insertBefore(folderButton,loadLabel||null);
    actions.querySelectorAll('button').forEach(button=>{
      button.classList.remove('primary');
      button.addEventListener('click',()=>{button.classList.add('action-active');setTimeout(()=>button.classList.remove('action-active'),550);});
    });
  }

  const editorStyle=document.createElement('style');
  editorStyle.textContent='.actions button.action-active{background:#173d67!important;border-color:#173d67!important;color:#fff!important;box-shadow:0 3px 9px rgba(23,61,103,.28)}body:not(.export-mode){zoom:var(--editor-scale,1)}';
  document.head.appendChild(editorStyle);
  const fitEditor=()=>{const scale=Math.min(1,window.innerWidth/1450,window.innerHeight/940);document.documentElement.style.setProperty('--editor-scale',String(Math.max(.4,scale)));};
  window.addEventListener('resize',fitEditor);fitEditor();

  window.download=async function(content,name,type){
    try{
      const blob=content instanceof Blob?content:new Blob([content],{type:(type||'application/octet-stream')+';charset=utf-8'});
      const bytes=Array.from(new Uint8Array(await blob.arrayBuffer()));
      const ok=await window.wontech.saveBytes(bytes,name);
      if(ok&&typeof toast==='function')toast('선택한 폴더에 '+name+' 파일을 저장했습니다.');
    }catch(e){alert('파일 저장 중 문제가 발생했습니다.\\n'+e.message);}
  };

  window.saveOutputBlob=async function(blob,name){
    try{
      const bytes=Array.from(new Uint8Array(await blob.arrayBuffer()));
      const ok=await window.wontech.saveBytes(bytes,name);
      if(ok&&typeof toast==='function')toast('선택한 폴더에 '+name+' 파일을 저장했습니다.');
    }catch(e){alert('파일 저장 중 문제가 발생했습니다.\\n'+e.message);}
  };

  window.printDocument=async function(){
    try{
      const r=await window.wontech.print();
      if(r&&!r.success&&r.reason)alert('인쇄를 시작하지 못했습니다.\\n'+r.reason);
    }catch(e){alert('인쇄 중 문제가 발생했습니다.\\n'+e.message);}
  };
})();
`;

function openEditor(type='quote',docId=''){
  const name='editor-'+(docId||Date.now());
  const win=new BrowserWindow(windowOpts({width:1450,height:940,minWidth:620,minHeight:520}));
  windows.set(name,win);win.on('closed',()=>windows.delete(name));
  win.loadFile('WontechQuote.html',{query:{type,docId}});
  win.maximize();
  win.webContents.once('did-finish-load',()=>{
    win.webContents.executeJavaScript(editorIntegration).catch(err=>console.error('editor integration',err));
  });
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
  else if(kind==='quote-manager')openManager('quote');
  else if(kind==='order-manager')openManager('order');
  else if(kind==='quote-tracking'){const win=createNamed('quote-tracking','quote-tracking.html',{width:1500,height:850,minWidth:540,minHeight:480});win.maximize();}
  else if(kind==='editor')openEditor(arg?.type||'quote',arg?.docId||'');
  return true;
});
ipcMain.handle('window:top',(event,value)=>{const w=BrowserWindow.fromWebContents(event.sender);w.setAlwaysOnTop(!!value);return w.isAlwaysOnTop();});
ipcMain.handle('window:close',event=>{const w=BrowserWindow.fromWebContents(event.sender);if(w&&!w.isDestroyed())w.close();return true;});
ipcMain.handle('external:open',(_,url)=>shell.openExternal(url));

function archiveAttachments(recordId,sourcePaths=[]){
  const safeId=String(recordId||'unassigned').replace(/[^a-zA-Z0-9_-]/g,'_');
  const targetDir=path.join(app.getPath('userData'),'wontech-v14-attachments',safeId);
  fs.mkdirSync(targetDir,{recursive:true});
  const saved=[];
  sourcePaths.forEach((source,index)=>{
    try{
      if(!source||!fs.existsSync(source)||!fs.statSync(source).isFile())return;
      const original=path.basename(source);
      const token=`${Date.now()}-${index}-${crypto.randomBytes(3).toString('hex')}`;
      const target=path.join(targetDir,`${token}-${original}`);
      fs.copyFileSync(source,target);
      const stat=fs.statSync(target);
      saved.push({id:crypto.randomUUID(),name:original,path:target,size:stat.size,addedAt:new Date().toISOString()});
    }catch(err){console.error('attachment archive',err);}
  });
  return saved;
}

ipcMain.handle('attachment:pick',async(event,recordId)=>{
  const owner=BrowserWindow.fromWebContents(event.sender);
  const r=await dialog.showOpenDialog(owner,{title:'견적 첨부파일 선택',properties:['openFile','multiSelections'],filters:[{name:'견적 관련 파일',extensions:['xlsx','xls','csv','pdf','jpg','jpeg','png','doc','docx']},{name:'모든 파일',extensions:['*']}]});
  if(r.canceled)return [];
  return archiveAttachments(recordId,r.filePaths);
});
ipcMain.handle('attachment:archive',(_,recordId,paths)=>archiveAttachments(recordId,Array.isArray(paths)?paths:[]));
ipcMain.handle('attachment:open',async(_,filePath)=>{
  if(!filePath||!fs.existsSync(filePath))return '첨부파일을 찾을 수 없습니다.';
  return shell.openPath(filePath);
});

ipcMain.handle('docs:list',(_,type)=>getStore('documents').filter(x=>!type||x.type===type).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')));
ipcMain.handle('docs:get',(_,id)=>getStore('documents').find(x=>x.id===id)||null);
ipcMain.handle('docs:save',(_,doc)=>{const docs=getStore('documents');const i=docs.findIndex(x=>x.id===doc.id);if(i>=0)docs[i]=doc;else docs.push(doc);setStore('documents',docs);return doc;});
ipcMain.handle('docs:delete',(_,id)=>{setStore('documents',getStore('documents').filter(x=>x.id!==id));return true;});

ipcMain.handle('output:directory:get',()=>getStore('outputDirectory')||'');
ipcMain.handle('output:directory:choose',async event=>{
  const owner=BrowserWindow.fromWebContents(event.sender);
  const current=getStore('outputDirectory');
  const r=await dialog.showOpenDialog(owner,{title:'WONTECH 파일 저장 위치 선택',defaultPath:current||app.getPath('documents'),properties:['openDirectory','createDirectory']});
  if(r.canceled||!r.filePaths[0])return '';
  setStore('outputDirectory',r.filePaths[0]);return r.filePaths[0];
});

function uniqueOutputPath(directory,fileName){
  fs.mkdirSync(directory,{recursive:true});
  const ext=path.extname(fileName),base=path.basename(fileName,ext);
  let target=path.join(directory,fileName),index=1;
  while(fs.existsSync(target))target=path.join(directory,`${base} (${index++})${ext}`);
  return target;
}

async function chooseOutputPath(event,fileName,filters){
  const directory=getStore('outputDirectory');
  if(directory&&fs.existsSync(directory))return uniqueOutputPath(directory,fileName);
  const owner=BrowserWindow.fromWebContents(event.sender);
  const r=await dialog.showSaveDialog(owner,{defaultPath:fileName,filters});
  return r.canceled?'':r.filePath;
}

ipcMain.handle('output:print',async(event,options={})=>new Promise(resolve=>event.sender.print({silent:false,printBackground:true,landscape:!!options.landscape},(success,reason)=>resolve({success,reason}))));
ipcMain.handle('output:pdf',async(event,defaultName='WONTECH_업무메모',options={})=>{
  const filePath=await chooseOutputPath(event,defaultName+'.pdf',[{name:'PDF',extensions:['pdf']}]);if(!filePath)return false;
  const buf=await event.sender.printToPDF({printBackground:true,landscape:!!options.landscape,pageSize:'A4',margins:{marginType:'default'}});fs.writeFileSync(filePath,buf);return true;
});
ipcMain.handle('output:bytes',async(event,bytes,defaultName='WONTECH_문서')=>{
  const ext=path.extname(defaultName).replace('.','')||'dat';
  const filePath=await chooseOutputPath(event,defaultName,[{name:'파일',extensions:[ext]}]);if(!filePath)return false;
  fs.writeFileSync(filePath,Buffer.from(bytes));return true;
});
ipcMain.handle('output:image',async(event,dataUrl,defaultName='WONTECH_업무메모')=>{
  const name=path.extname(defaultName)?defaultName:defaultName+'.jpg';
  const filePath=await chooseOutputPath(event,name,[{name:'JPG',extensions:['jpg']}]);if(!filePath)return false;
  const m=String(dataUrl).match(/^data:image\/(?:jpeg|jpg|png);base64,(.+)$/);if(!m)throw new Error('이미지 데이터 형식 오류');fs.writeFileSync(filePath,Buffer.from(m[1],'base64'));return true;
});
