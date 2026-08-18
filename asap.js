const $=id=>document.getElementById(id);
const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number=value=>Math.max(0,Number(String(value??0).replaceAll(',','').replace(/[^0-9.-]/g,''))||0);
const money=value=>Math.round(number(value)).toLocaleString('ko-KR');

let asap={items:[]};
let activeTab='pending';
let filters={company:'',manager:''};
let saveTimer=null;
function blankItem(){return{id:uid(),photo:null,content:'',company:'',manager:'',requestDate:todayKey(),processDate:'',requestAmount:0,confirmedAmount:0,status:'미처리',method:'',note:'',createdAt:new Date().toISOString()};}
function normalizeItem(item){return{...blankItem(),...item,id:item.id||uid(),photo:item.photo?.path?item.photo:null,requestAmount:number(item.requestAmount),confirmedAmount:number(item.confirmedAmount),status:item.status==='완료'?'완료':'미처리'};}
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>wontech.set('asapData',asap),180);}
async function saveNow(){clearTimeout(saveTimer);await wontech.set('asapData',asap);}
function showNote(message){const note=$('asapNote');note.textContent=message;note.classList.add('show');clearTimeout(showNote.timer);showNote.timer=setTimeout(()=>note.classList.remove('show'),2200);}
function photoCell(item){return `<div class="product-photo-cell"><div class="product-photo-preview" data-photo-id="${esc(item.id)}" title="사진 파일을 이곳으로 끌어놓을 수 있습니다">${item.photo?'사진 불러오는 중':'사진 끌어놓기'}</div><div class="product-photo-actions"><button type="button" data-action="pick-photo">첨부</button><button type="button" class="remove-photo" data-action="remove-photo" ${item.photo?'':'disabled'}>삭제</button></div></div>`;}
function rowHtml(item){
  return `<tr data-id="${esc(item.id)}" class="${item.status==='완료'?'asap-completed':''}"><td>${photoCell(item)}</td><td><textarea data-field="content" placeholder="ASAP 내용">${esc(item.content)}</textarea></td><td><input data-field="company" value="${esc(item.company)}" placeholder="요청회사"></td><td><input data-field="manager" value="${esc(item.manager)}" placeholder="담당자"></td><td><input type="date" data-field="requestDate" value="${esc(item.requestDate)}"></td><td><input type="date" data-field="processDate" value="${esc(item.processDate)}"></td><td><input class="money-input" data-field="requestAmount" value="${money(item.requestAmount)}" inputmode="numeric"></td><td><input class="money-input" data-field="confirmedAmount" value="${money(item.confirmedAmount)}" inputmode="numeric"></td><td><select class="${item.status==='완료'?'status-complete':'status-pending'}" data-field="status"><option value="미처리" ${item.status==='미처리'?'selected':''}>미처리</option><option value="완료" ${item.status==='완료'?'selected':''}>완료</option></select></td><td><textarea data-field="method" placeholder="처리방법">${esc(item.method)}</textarea></td><td><textarea data-field="note" placeholder="비고">${esc(item.note)}</textarea></td><td><div class="row-actions"><button type="button" class="delete-row" data-action="delete">삭제</button></div></td></tr>`;
}
async function hydratePhotos(){
  await Promise.all(asap.items.map(async item=>{
    if(!item.photo?.path)return;const box=document.querySelector(`[data-photo-id="${CSS.escape(item.id)}"]`);if(!box)return;
    const data=await wontech.readManagedImage(item.photo.path);if(!box.isConnected)return;
    if(data){const image=document.createElement('img');image.alt='ASAP 제품 사진';image.src=data;box.replaceChildren(image)}else box.textContent='사진 끌어놓기';
  }));
}
function visibleItems(){
  return asap.items.filter(item=>{
    const statusMatches=activeTab==='all'||(activeTab==='completed'?item.status==='완료':item.status==='미처리');
    return statusMatches&&(!filters.company||item.company===filters.company)&&(!filters.manager||item.manager===filters.manager);
  }).sort((a,b)=>activeTab==='completed'?(b.processDate||'').localeCompare(a.processDate||''):(b.requestDate||'').localeCompare(a.requestDate||''));
}
function setSelectOptions(select,placeholder,values,current){
  select.innerHTML=`<option value="">${esc(placeholder)}</option>`+values.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
  select.value=values.includes(current)?current:'';return select.value;
}
function updateFilterOptions(){
  const companies=[...new Set(asap.items.map(item=>item.company.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  filters.company=setSelectOptions($('asapCompanyFilter'),'전체 회사',companies,filters.company);
  const managers=[...new Set(asap.items.filter(item=>!filters.company||item.company===filters.company).map(item=>item.manager.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  filters.manager=setSelectOptions($('asapManagerFilter'),'전체 담당자',managers,filters.manager);
}
function render(){
  updateFilterOptions();
  const items=visibleItems();$('asapBody').innerHTML=items.length?items.map(rowHtml).join(''):'<tr><td colspan="12" class="operations-empty">해당 목록에 등록된 ASAP 항목이 없습니다.</td></tr>';
  const pending=asap.items.filter(item=>item.status==='미처리').length,completed=asap.items.length-pending;
  $('asapAllCount').textContent=asap.items.length;$('asapPendingCount').textContent=pending;$('asapCompletedCount').textContent=completed;
  $('asapAllTab').classList.toggle('active',activeTab==='all');
  $('asapPendingTab').classList.toggle('active',activeTab==='pending');$('asapCompletedTab').classList.toggle('active',activeTab==='completed');
  $('asapStatusFilter').value=activeTab;$('asapFilteredCount').textContent=`검색결과 ${items.length.toLocaleString('ko-KR')}건`;
  hydratePhotos();
}

async function asapReportConfig(includeImages=false){
  const items=visibleItems(),photoMap=new Map();
  if(includeImages)await Promise.all(items.map(async item=>{if(item.photo?.path)photoMap.set(item.id,await wontech.readManagedImage(item.photo.path))}));
  const statusLabel={all:'전체',pending:'미처리',completed:'완료'}[activeTab],conditions=[`처리상태: ${statusLabel}`];
  if(filters.company)conditions.push(`요청회사: ${filters.company}`);if(filters.manager)conditions.push(`담당자: ${filters.manager}`);
  return{
    title:'ASAP 관리 현황',subtitle:'WONTECH ASAP MANAGEMENT',logoSrc:$('asapLogo').src,meta:conditions.join(' · '),
    summary:[`검색결과 ${items.length.toLocaleString('ko-KR')}건`,`요청금액 ${money(items.reduce((sum,item)=>sum+number(item.requestAmount),0))}원`,`확정금액 ${money(items.reduce((sum,item)=>sum+number(item.confirmedAmount),0))}원`],
    fileName:`WONTECH_ASAP_${statusLabel}_${todayKey()}`,
    columns:[{label:'제품사진',width:'7%'},{label:'ASAP내용',width:'17%',align:'left'},{label:'요청회사',width:'10%'},{label:'담당자',width:'8%'},{label:'요청일',width:'8%'},{label:'처리일',width:'8%'},{label:'요청금액',width:'9%',align:'right'},{label:'확정금액',width:'9%',align:'right'},{label:'결재처리',width:'7%'},{label:'처리방법',width:'9%',align:'left'},{label:'비고',width:'8%',align:'left'}],
    rows:items.map(item=>[
      {text:item.photo?'첨부됨':'없음',image:photoMap.get(item.id)||''},{text:item.content,align:'left'},item.company,item.manager,item.requestDate,item.processDate,
      {text:money(item.requestAmount),align:'right'},{text:money(item.confirmedAmount),align:'right'},item.status,{text:item.method,align:'left'},{text:item.note,align:'left'}
    ])
  };
}

async function exportAsap(format){
  const output=window.WontechOperationsOutput;if(!output){alert('저장 기능을 불러오지 못했습니다.');return;}
  try{
    showNote(`${format.toUpperCase()} 가로 문서를 만드는 중입니다.`);await saveNow();
    const config=await asapReportConfig(format!=='excel'),saved=await output[`save${format[0].toUpperCase()+format.slice(1)}`](config);
    if(saved!==false)showNote(`${format.toUpperCase()} 파일을 저장했습니다.`);
  }catch(error){console.error(error);alert(`${format.toUpperCase()} 저장 중 문제가 발생했습니다.\n${error.message}`);}
}
async function printAsap(){
  const output=window.WontechOperationsOutput;if(!output?.print){alert('프린트 기능을 불러오지 못했습니다.');return;}
  try{
    showNote('A4 가로 인쇄 문서를 준비하고 있습니다.');await saveNow();const config=await asapReportConfig(true),result=await output.print(config);
    if(result&&!result.success&&result.reason)alert(`프린트 오류: ${result.reason}`);else showNote('프린트 창을 열었습니다.');
  }catch(error){console.error(error);alert(`프린트 중 문제가 발생했습니다.\n${error.message}`);}
}
async function applyAsapPhoto(item,selected){
  if(!selected)return false;if(item.photo?.path)await wontech.removeManagedImage(item.photo.path);
  const{dataUrl,...photo}=selected;item.photo=photo;await saveNow();render();showNote('제품 사진을 첨부했습니다.');return true;
}
function findItem(target){const row=target.closest('tr[data-id]');return row?asap.items.find(item=>item.id===row.dataset.id):null;}
$('asapBody').addEventListener('input',event=>{
  const field=event.target.dataset.field,item=findItem(event.target);if(!field||!item||field==='status')return;
  item[field]=['requestAmount','confirmedAmount'].includes(field)?number(event.target.value):event.target.value;queueSave();
});
$('asapBody').addEventListener('focusout',event=>{
  if(event.target.classList.contains('money-input'))event.target.value=money(event.target.value);
  if(['company','manager'].includes(event.target.dataset.field))updateFilterOptions();
});
$('asapBody').addEventListener('focusin',event=>{if(event.target.classList.contains('money-input'))event.target.value=String(number(event.target.value)||'');});
$('asapBody').addEventListener('dragover',event=>{const box=event.target.closest('.product-photo-preview');if(!box)return;event.preventDefault();event.dataTransfer.dropEffect='copy';box.classList.add('drag-over');});
$('asapBody').addEventListener('dragleave',event=>{const box=event.target.closest('.product-photo-preview');if(box)box.classList.remove('drag-over');});
$('asapBody').addEventListener('drop',async event=>{
  const box=event.target.closest('.product-photo-preview');if(!box)return;event.preventDefault();box.classList.remove('drag-over');
  const item=asap.items.find(entry=>entry.id===box.dataset.photoId),file=event.dataTransfer.files?.[0];if(!item||!file)return;
  if(file.size>25*1024*1024){showNote('사진은 25MB 이하 파일만 첨부할 수 있습니다.');return;}
  const bytes=new Uint8Array(await file.arrayBuffer()),selected=await wontech.archiveManagedImageBytes('asap',item.id,file.name,bytes);
  if(!selected){showNote('JPG, PNG, WEBP, BMP 사진 파일만 끌어놓을 수 있습니다.');return;}await applyAsapPhoto(item,selected);
});
$('asapBody').addEventListener('change',async event=>{
  const field=event.target.dataset.field,item=findItem(event.target);if(!field||!item)return;
  if(field==='status'){
    item.status=event.target.value==='완료'?'완료':'미처리';if(item.status==='완료'&&!item.processDate)item.processDate=todayKey();
    await saveNow();showNote(item.status==='완료'?'완료 목록으로 이동했습니다.':'미처리 목록으로 되돌렸습니다.');render();
  }else{item[field]=['requestAmount','confirmedAmount'].includes(field)?number(event.target.value):event.target.value;queueSave();}
});
$('asapBody').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;const item=findItem(button);if(!item)return;
  if(button.dataset.action==='pick-photo'){
    const selected=await wontech.pickManagedImage('asap',item.id);if(!selected)return;
    await applyAsapPhoto(item,selected);
  }else if(button.dataset.action==='remove-photo'){
    if(!item.photo||!confirm('이 제품 사진을 삭제할까요?'))return;
    await wontech.removeManagedImage(item.photo.path);item.photo=null;await saveNow();render();showNote('제품 사진을 삭제했습니다.');
  }else if(button.dataset.action==='delete'){
    if(!confirm('이 ASAP 항목을 삭제할까요?'))return;
    if(item.photo?.path)await wontech.removeManagedImage(item.photo.path);
    asap.items=asap.items.filter(entry=>entry.id!==item.id);await saveNow();render();showNote('ASAP 항목을 삭제했습니다.');
  }
});
$('addAsap').onclick=async()=>{const item=blankItem();asap.items.unshift(item);activeTab='pending';filters={company:'',manager:''};await saveNow();render();setTimeout(()=>document.querySelector(`tr[data-id="${CSS.escape(item.id)}"] [data-field="content"]`)?.focus(),30);};
$('asapAllTab').onclick=()=>{activeTab='all';render();};
$('asapPendingTab').onclick=()=>{activeTab='pending';render();};
$('asapCompletedTab').onclick=()=>{activeTab='completed';render();};
$('asapCompanyFilter').onchange=event=>{filters.company=event.target.value;filters.manager='';render();};
$('asapManagerFilter').onchange=event=>{filters.manager=event.target.value;render();};
$('asapStatusFilter').onchange=event=>{activeTab=['all','pending','completed'].includes(event.target.value)?event.target.value:'all';render();};
$('resetAsapFilters').onclick=()=>{filters={company:'',manager:''};activeTab='all';render();};
$('asapExcel').onclick=()=>exportAsap('excel');
$('asapJpg').onclick=()=>exportAsap('jpg');
$('asapPdf').onclick=()=>exportAsap('pdf');
$('asapPrint').onclick=printAsap;
$('closeAsap').onclick=()=>wontech.close();
async function init(){
  $('asapLogo').src=await wontech.getLogo();const saved=await wontech.get('asapData');asap={items:Array.isArray(saved?.items)?saved.items.map(normalizeItem):[]};render();
}
init().catch(error=>{console.error(error);alert(`ASAP관리를 시작하지 못했습니다.\n${error.message}`);});
