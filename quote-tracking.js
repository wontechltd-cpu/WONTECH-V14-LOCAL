const $=id=>document.getElementById(id);
const unitOptions=['SET','EA','LOT','식','M','KG','ROL','본','SHEET','NA'];
const defaultState={items:[],contacts:[],output:{orientation:'landscape',density:'normal'},columnWidths:[]};
let state=structuredClone(defaultState);
let activeTab='progress';
let saveTimer=null;

const uid=()=>crypto.randomUUID();
const pad=n=>String(n).padStart(2,'0');
const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const esc=(v='')=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const xmlEsc=(v='')=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number=v=>Number(String(v??0).replaceAll(',','').replace(/[^0-9.-]/g,''))||0;
const money=v=>Math.round(number(v)).toLocaleString('ko-KR');
const tabLabel={progress:'진행 견적',bid:'입찰 유 리스트',cxl:'CXL 리스트',contacts:'담당자 편집'};

function blankItem(){
  return {id:uid(),title:'',unit:'SET',qty:1,quoteUnitPrice:0,bidUnitPrice:0,company:'',department:'',contact:'',contactId:'',contactEmail:'',submittedDate:todayKey(),bidDate:'',bidStatus:'무',note:'',attachments:[],createdAt:new Date().toISOString()};
}

function normalizeItem(item){
  return {...blankItem(),...item,id:item.id||uid(),attachments:Array.isArray(item.attachments)?item.attachments:[]};
}

function normalizeContact(contact){
  return {id:contact.id||uid(),company:contact.company||'',department:contact.department||'',contact:contact.contact||'',email:contact.email||''};
}

function queueSave(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>wontech.set('quoteTracking',state),180);
}

async function saveNow(){
  clearTimeout(saveTimer);
  await wontech.set('quoteTracking',state);
}

function filteredItems(){
  if(activeTab==='bid')return state.items.filter(x=>x.bidStatus==='유');
  if(activeTab==='cxl')return state.items.filter(x=>x.bidStatus==='CXL');
  return state.items.filter(x=>x.bidStatus!=='유'&&x.bidStatus!=='CXL');
}

function optionList(values,current,emptyLabel='선택'){
  const unique=[...new Set(values.filter(Boolean))];
  if(current&&!unique.includes(current))unique.unshift(current);
  return `<option value="">${esc(emptyLabel)}</option>`+unique.map(v=>`<option value="${esc(v)}"${v===current?' selected':''}>${esc(v)}</option>`).join('');
}

function contactValues(field,item){
  let contacts=state.contacts;
  if(field!=='company'&&item.company)contacts=contacts.filter(x=>x.company===item.company);
  if(field==='contact'&&item.department)contacts=contacts.filter(x=>x.department===item.department);
  return contacts.map(x=>x[field]);
}

function contactOptionList(item){
  const selected=state.contacts.find(x=>x.id===item.contactId)||state.contacts.find(x=>x.contact===item.contact&&x.company===item.company&&x.department===item.department);
  if(selected&&!item.contactId)item.contactId=selected.id;
  const options=state.contacts.map(contact=>{
    const label=`${contact.contact} / ${contact.company} / ${contact.department}`;
    return `<option value="${esc(contact.id)}"${contact.id===item.contactId?' selected':''}>${esc(label)}</option>`;
  }).join('');
  return `<option value="">담당자 선택</option>${options}`;
}

function attachmentHtml(item){
  const files=item.attachments.map(file=>`<div class="stored-file" data-file-id="${esc(file.id)}"><span class="file-name" title="${esc(file.name)}">${esc(file.name)}</span><div class="file-actions"><button data-action="open-file">열기</button><button class="replace" data-action="replace-file">교체</button><button class="remove-file" data-action="remove-file">삭제</button></div></div>`).join('');
  return `<div class="file-drop" data-record-id="${esc(item.id)}">${files}<button class="attach-button" data-action="attach-file">${item.attachments.length?'＋ 추가':'파일 첨부'}</button><button class="row-delete" data-action="delete-row">견적 삭제</button></div>`;
}

function rowHtml(item,index){
  const quoteAmount=number(item.qty)*number(item.quoteUnitPrice);
  const bidAmount=number(item.qty)*number(item.bidUnitPrice);
  return `<tr data-id="${esc(item.id)}">
    <td class="center">${index+1}</td>
    <td><input class="quote-title" data-field="title" value="${esc(item.title)}" placeholder="견적 제목"></td>
    <td><select data-field="unit">${unitOptions.map(v=>`<option${v===item.unit?' selected':''}>${v}</option>`).join('')}</select></td>
    <td><input type="number" min="0" step="1" data-field="qty" value="${number(item.qty)}"></td>
    <td><input class="money-input" data-field="quoteUnitPrice" value="${money(item.quoteUnitPrice)}" inputmode="numeric"></td>
    <td><span class="amount">${money(quoteAmount)}</span></td>
    <td><input class="money-input" data-field="bidUnitPrice" value="${money(item.bidUnitPrice)}" inputmode="numeric"></td>
    <td><span class="amount">${money(bidAmount)}</span></td>
    <td><select data-field="company">${optionList(contactValues('company',item),item.company,'요청회사')}</select></td>
    <td><select data-field="department">${optionList(contactValues('department',item),item.department,'부서')}</select></td>
    <td><select data-field="contactId" title="담당자를 선택하면 요청회사와 부서가 자동 입력됩니다.">${contactOptionList(item)}</select></td>
    <td><input type="date" data-field="submittedDate" value="${esc(item.submittedDate)}"></td>
    <td><input type="date" data-field="bidDate" value="${esc(item.bidDate)}"></td>
    <td><select data-field="bidStatus"><option${item.bidStatus==='무'?' selected':''}>무</option><option${item.bidStatus==='유'?' selected':''}>유</option><option${item.bidStatus==='CXL'?' selected':''}>CXL</option></select></td>
    <td><input data-field="note" value="${esc(item.note)}" placeholder="비고"></td>
    <td>${attachmentHtml(item)}</td>
  </tr>`;
}

function renderTracking(){
  const items=filteredItems();
  $('trackingBody').innerHTML=items.length?items.map(rowHtml).join(''):`<tr><td colspan="16" class="tracking-empty">${tabLabel[activeTab]}에 등록된 견적이 없습니다.</td></tr>`;
  $('trackingCount').textContent=`${tabLabel[activeTab]} ${items.length}건`;
  requestAnimationFrame(fitTrackingTable);
}

function renderContacts(){
  $('contactBody').innerHTML=state.contacts.length?state.contacts.map(x=>`<tr data-id="${esc(x.id)}"><td>${esc(x.company)}</td><td>${esc(x.department)}</td><td>${esc(x.contact)}</td><td>${esc(x.email)}</td><td><button class="delbtn" data-action="delete-contact">×</button></td></tr>`).join(''):'<tr><td colspan="5" class="tracking-empty">등록된 담당자가 없습니다.</td></tr>';
  $('trackingCount').textContent=`담당자 ${state.contacts.length}명`;
}

function render(){
  document.querySelectorAll('.tracking-tabs button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===activeTab));
  const contacts=activeTab==='contacts';
  $('trackingView').hidden=contacts;
  $('contactView').hidden=!contacts;
  $('trackingFooter').hidden=contacts;
  if(contacts)renderContacts();else renderTracking();
}

function findItem(target){
  const row=target.closest('tr[data-id]');
  return row?state.items.find(x=>x.id===row.dataset.id):null;
}

function updateField(target){
  const item=findItem(target),field=target.dataset.field;
  if(!item||!field)return null;
  if(field==='contactId'){
    const selected=state.contacts.find(x=>x.id===target.value);
    item.contactId=target.value;
    item.contact=selected?.contact||'';
    item.company=selected?.company||'';
    item.department=selected?.department||'';
    item.contactEmail=selected?.email||'';
    queueSave();
    return {item,field};
  }
  if(['qty','quoteUnitPrice','bidUnitPrice'].includes(field))item[field]=number(target.value);
  else item[field]=target.value;
  if(field==='company'){
    const related=state.contacts.filter(x=>x.company===item.company);
    if(!related.some(x=>x.department===item.department))item.department='';
    if(!related.some(x=>x.contact===item.contact)){item.contact='';item.contactId='';item.contactEmail='';}
  }
  if(field==='department'){
    const related=state.contacts.filter(x=>x.company===item.company&&x.department===item.department);
    if(!related.some(x=>x.contact===item.contact)){item.contact='';item.contactId='';item.contactEmail='';}
  }
  queueSave();
  return {item,field};
}

async function addFiles(item,files,replacingId=''){
  if(!files.length)return;
  if(replacingId){
    const at=item.attachments.findIndex(x=>x.id===replacingId);
    if(at>=0)item.attachments.splice(at,1,files[0]);
    if(files.length>1)item.attachments.push(...files.slice(1));
  }else item.attachments.push(...files);
  await saveNow();
  renderTracking();
  showNote(`${files.length}개 파일을 안전하게 보관했습니다.`);
}

async function chooseFiles(item,replacingId=''){
  const files=await wontech.pickAttachments(item.id);
  await addFiles(item,files,replacingId);
}

function showNote(text){
  const note=$('trackingNote');note.textContent=text;note.classList.add('show');
  setTimeout(()=>note.classList.remove('show'),1900);
}

$('trackingBody').addEventListener('input',event=>{
  const result=updateField(event.target);
  if(result&&['qty','quoteUnitPrice','bidUnitPrice'].includes(result.field)){
    const row=event.target.closest('tr');
    const amounts=row.querySelectorAll('.amount');
    amounts[0].textContent=money(number(result.item.qty)*number(result.item.quoteUnitPrice));
    amounts[1].textContent=money(number(result.item.qty)*number(result.item.bidUnitPrice));
  }
});

$('trackingBody').addEventListener('focusin',event=>{
  if(event.target.classList.contains('money-input'))event.target.value=number(event.target.value)||'';
});

$('trackingBody').addEventListener('focusout',event=>{
  if(event.target.classList.contains('money-input'))event.target.value=money(event.target.value);
});

$('trackingBody').addEventListener('change',async event=>{
  const result=updateField(event.target);
  if(!result)return;
  await saveNow();
  if(['bidStatus','company','department','contactId'].includes(result.field))renderTracking();
});

$('trackingBody').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');
  if(!button)return;
  const item=findItem(button);if(!item)return;
  const action=button.dataset.action;
  const fileBox=button.closest('[data-file-id]');
  const file=fileBox?item.attachments.find(x=>x.id===fileBox.dataset.fileId):null;
  if(action==='attach-file')await chooseFiles(item);
  if(action==='replace-file'&&file)await chooseFiles(item,file.id);
  if(action==='open-file'&&file){const error=await wontech.openAttachment(file.path);if(error)alert(error);}
  if(action==='remove-file'&&file&&confirm(`첨부 목록에서 '${file.name}' 파일을 삭제할까요?`)){
    item.attachments=item.attachments.filter(x=>x.id!==file.id);await saveNow();renderTracking();
  }
  if(action==='delete-row'&&confirm('이 견적 관리 항목을 삭제할까요?')){
    state.items=state.items.filter(x=>x.id!==item.id);await saveNow();renderTracking();
  }
});

['dragenter','dragover'].forEach(type=>$('trackingBody').addEventListener(type,event=>{
  const zone=event.target.closest('.file-drop');if(!zone)return;event.preventDefault();zone.classList.add('dragging');
}));
['dragleave','drop'].forEach(type=>$('trackingBody').addEventListener(type,event=>{
  const zone=event.target.closest('.file-drop');if(!zone)return;event.preventDefault();zone.classList.remove('dragging');
}));
$('trackingBody').addEventListener('drop',async event=>{
  const zone=event.target.closest('.file-drop');if(!zone)return;
  const item=state.items.find(x=>x.id===zone.dataset.recordId);if(!item)return;
  const paths=Array.from(event.dataTransfer.files||[]).map(file=>{try{return wontech.pathForFile(file)}catch{return ''}}).filter(Boolean);
  if(!paths.length){showNote('끌어다 놓은 파일 경로를 확인하지 못했습니다. 첨부 버튼을 이용해 주세요.');return;}
  const files=await wontech.archiveAttachments(item.id,paths);await addFiles(item,files);
});

document.querySelector('.tracking-tabs').addEventListener('click',event=>{
  const button=event.target.closest('button[data-tab]');if(!button)return;activeTab=button.dataset.tab;render();
});

$('addQuote').onclick=async()=>{const item=blankItem();state.items.push(item);await saveNow();activeTab='progress';render();setTimeout(()=>$(`trackingBody`).querySelector(`tr[data-id="${item.id}"] .quote-title`)?.focus(),30)};

$('contactForm').onsubmit=async event=>{
  event.preventDefault();
  const company=$('contactCompany').value.trim(),department=$('contactDepartment').value.trim(),contact=$('contactName').value.trim(),email=$('contactEmail').value.trim();
  if(!company||!department||!contact)return;
  const existing=state.contacts.find(x=>x.company===company&&x.department===department&&x.contact===contact);
  if(existing)existing.email=email;else state.contacts.push({id:uid(),company,department,contact,email});
  event.target.reset();await saveNow();renderContacts();
};

$('contactBody').onclick=async event=>{
  const button=event.target.closest('[data-action="delete-contact"]');if(!button)return;
  const row=button.closest('tr[data-id]');if(row&&confirm('이 담당자 정보를 삭제할까요?')){state.contacts=state.contacts.filter(x=>x.id!==row.dataset.id);await saveNow();renderContacts();}
};

function activeRows(){return activeTab==='contacts'?[]:filteredItems();}
function excelXml(){
  const headers=['NO','견적제목','단위','수량','견적단가','견적금액','입찰단가','입찰금액','요청회사','부서','담당자','담당자 메일','제출일자','입찰일자','입찰유무','비고','첨부파일'];
  const rows=activeRows().map((x,i)=>[i+1,x.title,x.unit,x.qty,x.quoteUnitPrice,number(x.qty)*number(x.quoteUnitPrice),x.bidUnitPrice,number(x.qty)*number(x.bidUnitPrice),x.company,x.department,x.contact,x.contactEmail||'',x.submittedDate,x.bidDate,x.bidStatus,x.note,x.attachments.map(f=>f.name).join(', ')]);
  const cell=v=>`<Cell><Data ss:Type="${typeof v==='number'?'Number':'String'}">${xmlEsc(v)}</Data></Cell>`;
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${xmlEsc(tabLabel[activeTab])}"><Table><Row>${headers.map(cell).join('')}</Row>${rows.map(row=>`<Row>${row.map(cell).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`;
}

$('exportExcel').onclick=async()=>{
  if(activeTab==='contacts'){showNote('견적 목록 탭에서 EXCEL을 실행해 주세요.');return;}
  const bytes=Array.from(new TextEncoder().encode('\ufeff'+excelXml()));
  await wontech.saveBytes(bytes,`WONTECH_${tabLabel[activeTab]}_${todayKey()}.xls`);
};

function outputOptions(){return {landscape:state.output.orientation!=='portrait'};}
async function withOutput(fn,fitPrint=false){
  const table=$('trackingTable'),previous={zoom:table.style.zoom,width:table.style.width,minWidth:table.style.minWidth};
  document.body.classList.add('tracking-output');
  if(fitPrint)document.body.classList.add('print-fit');
  table.style.zoom='1';table.style.width='';table.style.minWidth='';
  try{await new Promise(r=>setTimeout(r,120));return await fn();}
  finally{document.body.classList.remove('print-fit');document.body.classList.remove('tracking-output');table.style.zoom=previous.zoom;table.style.width=previous.width;table.style.minWidth=previous.minWidth;fitTrackingTable();}
}

$('exportJpg').onclick=()=>{
  if(activeTab==='contacts'){showNote('견적 목록 탭에서 JPG를 실행해 주세요.');return;}
  return withOutput(async()=>{
    const table=$('trackingTable');
    const canvas=await html2canvas(table,{scale:1.5,backgroundColor:'#fff',logging:false,width:table.scrollWidth,height:table.scrollHeight,windowWidth:table.scrollWidth});
    await wontech.saveImage(canvas.toDataURL('image/jpeg',.95),`WONTECH_${tabLabel[activeTab]}_${todayKey()}`);
  });
};

$('exportPdf').onclick=()=>{
  if(activeTab==='contacts'){showNote('견적 목록 탭에서 PDF를 실행해 주세요.');return;}
  return withOutput(()=>wontech.pdf(`WONTECH_${tabLabel[activeTab]}_${todayKey()}`,outputOptions()),true);
};

$('printTracking').onclick=()=>{
  if(activeTab==='contacts'){showNote('견적 목록 탭에서 인쇄를 실행해 주세요.');return;}
  return withOutput(async()=>{const result=await wontech.print(outputOptions());if(result&&!result.success&&result.reason)alert('인쇄 오류: '+result.reason);},true);
};

$('outputSettings').onclick=()=>{
  $('outputOrientation').value=state.output.orientation||'landscape';
  $('outputDensity').value=state.output.density||'normal';
  $('outputDialog').showModal();
};
$('cancelOutput').onclick=()=>$('outputDialog').close();
$('saveOutput').onclick=async()=>{
  state.output={orientation:$('outputOrientation').value,density:$('outputDensity').value};
  document.documentElement.dataset.density=state.output.density;await saveNow();$('outputDialog').close();showNote('출력 설정을 저장했습니다.');
};
$('closeTracking').onclick=()=>wontech.close();

function tableColumns(){return Array.from($('trackingTable').querySelectorAll('colgroup col'));}
function currentColumnWidths(){
  return tableColumns().map((col,index)=>Number(state.columnWidths[index])||parseInt(col.style.width,10)||90);
}
function fitTrackingTable(){
  if(document.body.classList.contains('tracking-output'))return;
  const table=$('trackingTable'),wrap=table.closest('.tracking-table-wrap'),widths=currentColumnWidths();
  widths.forEach((width,index)=>{const col=tableColumns()[index];if(col)col.style.width=`${width}px`;});
  const naturalWidth=widths.reduce((sum,width)=>sum+width,0);
  const available=Math.max(320,wrap.clientWidth-2);
  table.style.width=`${naturalWidth}px`;table.style.minWidth=`${naturalWidth}px`;
  table.style.zoom=String(Math.min(1,Math.max(.27,available/naturalWidth)));
}
function initializeColumnResize(){
  const headers=Array.from($('trackingTable').querySelectorAll('thead th'));
  const widths=currentColumnWidths();state.columnWidths=widths;
  headers.forEach((header,index)=>{
    if(index===headers.length-1)return;
    const handle=document.createElement('span');handle.className='col-resizer';handle.title='끌어서 칸 폭 조절';
    handle.addEventListener('mousedown',event=>{
      event.preventDefault();event.stopPropagation();
      const startX=event.clientX,startWidth=currentColumnWidths()[index],zoom=Number($('trackingTable').style.zoom)||1;
      const move=moveEvent=>{state.columnWidths[index]=Math.max(45,Math.round(startWidth+(moveEvent.clientX-startX)/zoom));fitTrackingTable();};
      const up=async()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);await saveNow();};
      window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
    });
    header.appendChild(handle);
  });
  window.addEventListener('resize',fitTrackingTable);
  fitTrackingTable();
}

async function init(){
  const saved=await wontech.get('quoteTracking');
  state={...structuredClone(defaultState),...(saved||{})};
  state.items=Array.isArray(state.items)?state.items.map(normalizeItem):[];
  state.contacts=Array.isArray(state.contacts)?state.contacts.map(normalizeContact):[];
  state.output={...defaultState.output,...(state.output||{})};
  state.columnWidths=Array.isArray(state.columnWidths)?state.columnWidths:[];
  document.documentElement.dataset.density=state.output.density;
  $('trackingLogo').src=await wontech.getLogo();
  render();
  initializeColumnResize();
}

init();
