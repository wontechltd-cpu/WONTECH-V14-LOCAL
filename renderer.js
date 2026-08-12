const $=selector=>document.querySelector(selector);
const days=$('#days');

let memo={tasksByDate:{},rollLastDate:null};
let checklist=[];
let quickLinks=[];
let visible=30;
let activeDate=null;
let logoData='';
let liveDateKey='';
let midnightTimer=null;
let daySyncRunning=false;

const pad=value=>String(value).padStart(2,'0');
const defaultQuickLinks=()=>Array.from({length:6},(_,index)=>({name:`링크${index+1}`,url:''}));

function keyFromDate(date){
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

function workDate(date=new Date()){
  return keyFromDate(new Date(date));
}

function shiftDate(key,amount){
  const date=new Date(`${key}T12:00:00`);
  date.setDate(date.getDate()+amount);
  return keyFromDate(date);
}

function label(key){
  const date=new Date(`${key}T12:00:00`);
  return `${key} ${'일월화수목금토'[date.getDay()]}요일`;
}

function tasks(key){
  return memo.tasksByDate[key]||(memo.tasksByDate[key]=[]);
}

function normalizeQuickLinks(value){
  const saved=Array.isArray(value)?value:[];
  return defaultQuickLinks().map((fallback,index)=>({
    name:String(saved[index]?.name||fallback.name).trim().slice(0,12)||fallback.name,
    url:String(saved[index]?.url||'').trim()
  }));
}

function updateChecklistCount(total=checklist.length){
  const badge=$('#checklistCount');
  if(badge)badge.textContent=String(total);
}

async function refreshChecklist(syncLocal=false){
  const latest=await wontech.get('checklist')||[];
  if(syncLocal)checklist=latest;
  updateChecklistCount(latest.length);
  return latest;
}

async function saveAll(saveChecklist=false){
  await wontech.set('memoData',memo);
  if(saveChecklist)await wontech.set('checklist',checklist);
  updateChecklistCount();
}

function rollover(){
  const today=workDate();
  let start=memo.rollLastDate||today;
  if(start>today)start=today;
  let cursor=start;
  let guard=0;
  while(cursor<today&&guard<5000){
    const next=shiftDate(cursor,1);
    const target=tasks(next);
    const seen=new Set(target.map(item=>item.origin||item.id));
    tasks(cursor)
      .filter(item=>item.status==='pending'&&item.text.trim())
      .forEach(item=>{
        const origin=item.origin||item.id;
        if(!seen.has(origin))target.push({id:crypto.randomUUID(),origin,text:item.text,status:'pending'});
      });
    cursor=next;
    guard++;
  }
  memo.rollLastDate=today;
}

function esc(value=''){
  return String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
}

function render(){
  days.innerHTML='';
  const today=workDate();
  for(let index=visible-1;index>=0;index--)days.append(makeDay(shiftDate(today,-index)));
  activeDate=activeDate||today;
  applyLogo();
  const chip=$('#currentWorkDate');
  if(chip)chip.textContent=label(today);
}

function makeDay(key){
  const section=document.createElement('section');
  section.className='sheet';
  section.dataset.date=key;
  section.innerHTML=`<div class="brand"><img class="brand-logo" alt="WONTECH"><div class="date">DATE ${label(key)}</div></div><div class="head"><div>NO</div><div>업 무 내 용</div><div>진행상황</div><div></div></div><div class="list"></div><div class="footer-actions"><button>＋ 업무 추가</button></div><div class="summary"></div>`;
  const list=section.querySelector('.list');
  const items=tasks(key);
  if(!items.length)list.innerHTML='<div class="empty">등록된 업무가 없습니다.</div>';
  items.forEach((item,index)=>list.append(row(key,item,index)));
  section.querySelector('.footer-actions button').onclick=()=>addTask(key);
  section.onclick=()=>{
    activeDate=key;
    document.querySelectorAll('.sheet').forEach(item=>item.classList.toggle('active-sheet',item.dataset.date===key));
  };
  section.querySelector('.summary').innerHTML=`<span>전체 ${items.length}</span><span class="done-c">완료 ${items.filter(item=>item.status==='done').length}</span><span class="pending-c">미처리 ${items.filter(item=>item.status==='pending').length}</span><span class="check-c">누적 체크 ${checklist.length}</span>`;
  return section;
}

function row(key,item,index){
  const element=document.createElement('div');
  element.className=`task ${item.status||''}`;
  element.innerHTML=`<div class="num">${index+1}</div><input class="text" value="${esc(item.text)}" placeholder="업무 내용을 입력하세요"><select class="status"><option value="">선택</option><option value="pending">미처리</option><option value="done">완료</option><option value="check">체크</option></select><button class="remove">×</button>`;
  const input=element.querySelector('.text');
  const select=element.querySelector('.status');
  select.value=item.status||'';
  input.oninput=async event=>{
    item.text=event.target.value;
    const linked=checklist.find(value=>value.sourceTaskId===item.id);
    if(linked)linked.text=item.text;
    await saveAll(!!linked);
  };
  select.onchange=async event=>{
    item.status=event.target.value;
    if(item.status==='check'){
      checklist=await wontech.get('checklist')||checklist;
      let linked=checklist.find(value=>value.sourceTaskId===item.id);
      if(!linked){
        linked={id:crypto.randomUUID(),sourceTaskId:item.id,date:key,text:item.text,status:'pending'};
        checklist.push(linked);
      }else{
        linked.date=key;
        linked.text=item.text;
      }
    }
    await saveAll(item.status==='check');
    render();
    go(key);
  };
  element.querySelector('.remove').onclick=async event=>{
    event.stopPropagation();
    memo.tasksByDate[key]=tasks(key).filter(value=>value.id!==item.id);
    await saveAll();
    render();
    go(key);
  };
  return element;
}

async function addTask(key=activeDate||workDate()){
  tasks(key).push({id:crypto.randomUUID(),text:'',status:''});
  await saveAll();
  render();
  go(key);
  setTimeout(()=>document.querySelector(`[data-date="${key}"] .task:last-child .text`)?.focus(),120);
}

function go(key){
  activeDate=key;
  setTimeout(()=>document.querySelector(`[data-date="${key}"]`)?.scrollIntoView({behavior:'smooth',block:'start'}),30);
}

function applyLogo(){
  document.querySelectorAll('.brand-logo').forEach(element=>element.src=logoData);
  $('#toolbarLogo').src=logoData;
}

function targetSheet(){
  return document.querySelector(`[data-date="${activeDate||workDate()}"]`)||document.querySelector(`[data-date="${workDate()}"]`);
}

async function withOutput(action){
  const sheet=targetSheet();
  if(!sheet)return;
  document.body.classList.add('output-mode');
  sheet.classList.add('output-target');
  try{
    await new Promise(resolve=>setTimeout(resolve,100));
    return await action(sheet);
  }finally{
    sheet.classList.remove('output-target');
    document.body.classList.remove('output-mode');
  }
}

function fileBase(){
  return `WONTECH_업무메모_${activeDate||workDate()}`;
}

function showNote(text){
  const note=$('#note');
  note.textContent=text;
  note.classList.add('show');
  setTimeout(()=>note.classList.remove('show'),2200);
}

function renderQuickLinks(){
  document.querySelectorAll('.quick-link').forEach((button,index)=>{
    const item=quickLinks[index]||defaultQuickLinks()[index];
    button.textContent=item.name;
    button.title=item.url?`${item.name}\n${item.url}`:`${item.name} - 링크설정에서 주소를 입력하세요`;
    button.classList.toggle('configured',!!item.url);
  });
}

function normalizeUrl(value){
  const input=String(value||'').trim();
  if(!input)return '';
  const candidate=/^https?:\/\//i.test(input)?input:`https://${input}`;
  const url=new URL(candidate);
  if(url.protocol!=='https:'&&url.protocol!=='http:')throw new Error('웹사이트 주소만 입력할 수 있습니다.');
  return url.href;
}

function fillQuickLinkRows(){
  const rows=$('#quickLinkRows');
  rows.innerHTML='';
  quickLinks.forEach((item,index)=>{
    const row=document.createElement('div');
    row.className='quick-link-row';
    row.innerHTML=`<span class="quick-link-number">${index+1}</span><input class="quick-link-name-input" maxlength="12" value="${esc(item.name)}" placeholder="버튼 이름"><input class="quick-link-url-input" value="${esc(item.url)}" placeholder="예: www.naver.com">`;
    rows.append(row);
  });
}

function openQuickLinkSettings(focusIndex=-1){
  quickLinks=normalizeQuickLinks(quickLinks);
  fillQuickLinkRows();
  const dialog=$('#quickLinkDialog');
  if(!dialog.open)dialog.showModal();
  if(focusIndex>=0)setTimeout(()=>dialog.querySelectorAll('.quick-link-name-input')[focusIndex]?.focus(),50);
}

async function saveQuickLinkSettings(){
  const rows=[...document.querySelectorAll('.quick-link-row')];
  const updated=[];
  for(let index=0;index<rows.length;index++){
    const name=rows[index].querySelector('.quick-link-name-input').value.trim()||`링크${index+1}`;
    const rawUrl=rows[index].querySelector('.quick-link-url-input').value.trim();
    try{
      updated.push({name:name.slice(0,12),url:normalizeUrl(rawUrl)});
    }catch{
      alert(`${index+1}번 링크 주소를 확인해 주세요.`);
      rows[index].querySelector('.quick-link-url-input').focus();
      return;
    }
  }
  quickLinks=updated;
  await wontech.set('quickLinks',quickLinks);
  renderQuickLinks();
  $('#quickLinkDialog').close();
  showNote('자주 쓰는 링크 6개를 저장했습니다.');
}

async function openExternal(url,name){
  try{
    const opened=await wontech.openExternal(url);
    if(!opened)showNote(`${name} 사이트 주소를 열지 못했습니다.`);
  }catch{
    showNote(`${name} 사이트 주소를 열지 못했습니다.`);
  }
}

function syncToolbarHeight(){
  const height=$('.main-toolbar')?.offsetHeight||64;
  document.documentElement.style.setProperty('--main-toolbar-height',`${height}px`);
}

function scheduleMidnightTransition(){
  if(midnightTimer)clearTimeout(midnightTimer);
  const now=new Date();
  const next=new Date(now);
  next.setHours(24,0,0,300);
  midnightTimer=setTimeout(async()=>{
    await syncCurrentDay();
    scheduleMidnightTransition();
  },Math.max(1000,next.getTime()-now.getTime()));
}

async function syncCurrentDay(){
  const today=workDate();
  if(daySyncRunning||today===liveDateKey)return;
  daySyncRunning=true;
  try{
    liveDateKey=today;
    rollover();
    await saveAll();
    activeDate=today;
    render();
    go(today);
    showNote(`${label(today)} 업무로 자동 전환되었습니다.`);
  }finally{
    daySyncRunning=false;
  }
}

async function init(){
  memo=await wontech.get('memoData')||memo;
  memo.tasksByDate=memo.tasksByDate||{};
  checklist=await wontech.get('checklist')||[];
  quickLinks=normalizeQuickLinks(await wontech.get('quickLinks'));
  logoData=await wontech.getLogo();
  liveDateKey=workDate();
  rollover();
  await saveAll();
  renderQuickLinks();
  render();
  go(liveDateKey);
  syncToolbarHeight();
  scheduleMidnightTransition();
  if('ResizeObserver' in window)new ResizeObserver(syncToolbarHeight).observe($('.main-toolbar'));
}

$('#today').onclick=()=>go(workDate());
$('#add').onclick=()=>addTask(workDate());
$('#older').onclick=()=>{
  const old=visible;
  visible+=30;
  render();
  go(shiftDate(workDate(),-old));
};
$('#checklist').onclick=()=>wontech.open('checklist');
$('#quoteManager').onclick=()=>wontech.open('quote-manager');
$('#orderManager').onclick=()=>wontech.open('order-manager');
$('#attachments').onclick=()=>wontech.open('quote-tracking');
$('#googleTranslate').onclick=()=>openExternal('https://translate.google.com/?sl=en&tl=ko&op=translate','Google번역');
$('#gptTranslate').onclick=()=>openExternal('https://chatgpt.com/','GPT번역');
$('#changeLogo').onclick=async()=>{
  const data=await wontech.pickLogo();
  if(data){
    logoData=data;
    applyLogo();
    showNote('마크를 교체했습니다. 견적/발주 창에도 적용됩니다.');
  }
};
$('#top').onchange=event=>wontech.top(event.target.checked);
$('#print').onclick=()=>withOutput(async()=>{
  const result=await wontech.print();
  if(!result?.success&&result?.reason)alert(`인쇄 오류: ${result.reason}`);
});
$('#pdf').onclick=()=>withOutput(()=>wontech.pdf(fileBase()));
$('#jpg').onclick=()=>withOutput(async sheet=>{
  const canvas=await html2canvas(sheet,{scale:2,backgroundColor:'#fff',logging:false});
  await wontech.saveImage(canvas.toDataURL('image/jpeg',.95),fileBase());
});
$('#editLinks').onclick=()=>openQuickLinkSettings();
$('#saveLinks').onclick=saveQuickLinkSettings;
$('#cancelLinks').onclick=()=>$('#quickLinkDialog').close();

document.querySelectorAll('.quick-link').forEach((button,index)=>{
  button.onclick=()=>{
    const item=quickLinks[index];
    if(!item?.url){openQuickLinkSettings(index);return;}
    openExternal(item.url,item.name);
  };
  button.oncontextmenu=event=>{
    event.preventDefault();
    openQuickLinkSettings(index);
  };
});

window.addEventListener('focus',async()=>{
  const selected=activeDate||workDate();
  await refreshChecklist(true);
  render();
  go(selected);
  await syncCurrentDay();
});
window.addEventListener('resize',syncToolbarHeight);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncCurrentDay();});
setInterval(syncCurrentDay,15000);
setInterval(()=>refreshChecklist(false),5000);

init().catch(error=>{
  console.error(error);
  alert(`업무관리 프로그램을 시작하지 못했습니다.\n${error.message}`);
});
