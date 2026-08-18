const $=id=>document.getElementById(id);
const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number=value=>Math.max(0,Number(String(value??0).replaceAll(',','').replace(/[^0-9.-]/g,''))||0);
const money=value=>Math.round(number(value)).toLocaleString('ko-KR');

let inventory={items:[],purchases:[],issues:[]};
let saveTimer=null;
let purchaseItemId='';
let issueItemId='';
let historyItemId='';

function nextInventoryNumber(){
  const maximum=inventory.items.reduce((max,item)=>Math.max(max,Number(String(item.number||'').match(/(\d+)$/)?.[1]||0)),0);
  return `WT-INV-${String(maximum+1).padStart(4,'0')}`;
}

function blankItem(){return{id:uid(),number:nextInventoryNumber(),photo:null,name:'',spec:'',buyPrice:0,sellPrice:0,stockQty:0,purchaseQty:0,issueQty:0,note:'',createdAt:new Date().toISOString()};}
function normalizeItem(item){return{...blankItem(),...item,id:item.id||uid(),number:item.number||nextInventoryNumber(),photo:item.photo?.path?item.photo:null,buyPrice:number(item.buyPrice),sellPrice:number(item.sellPrice),stockQty:number(item.stockQty),purchaseQty:number(item.purchaseQty),issueQty:number(item.issueQty)};}
function normalizePurchase(purchase){return{id:purchase.id||uid(),itemId:purchase.itemId||'',itemNumber:purchase.itemNumber||'',itemName:purchase.itemName||'',date:purchase.date||todayKey(),quantity:number(purchase.quantity),supplier:purchase.supplier||'',note:purchase.note||'',afterStock:number(purchase.afterStock),createdAt:purchase.createdAt||new Date().toISOString()};}
function normalizeIssue(issue){return{id:issue.id||uid(),itemId:issue.itemId||'',itemNumber:issue.itemNumber||'',itemName:issue.itemName||'',date:issue.date||todayKey(),quantity:number(issue.quantity),destination:issue.destination||'',reason:issue.reason||'',afterStock:number(issue.afterStock),createdAt:issue.createdAt||new Date().toISOString()};}

function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>wontech.set('inventoryData',inventory),180);}
async function saveNow(){clearTimeout(saveTimer);await wontech.set('inventoryData',inventory);}
function showNote(message){const note=$('inventoryNote');note.textContent=message;note.classList.add('show');clearTimeout(showNote.timer);showNote.timer=setTimeout(()=>note.classList.remove('show'),2200);}

function photoCell(item){
  return `<div class="product-photo-cell"><div class="product-photo-preview" data-photo-id="${esc(item.id)}" title="사진 파일을 이곳으로 끌어놓을 수 있습니다">${item.photo?'사진 불러오는 중':'사진 끌어놓기'}</div><div class="product-photo-actions"><button type="button" data-action="pick-photo">첨부</button><button type="button" class="remove-photo" data-action="remove-photo" ${item.photo?'':'disabled'}>삭제</button></div></div>`;
}

function rowHtml(item){
  return `<tr data-id="${esc(item.id)}"><td><input class="record-number" data-field="number" value="${esc(item.number)}"></td><td>${photoCell(item)}</td><td><input data-field="name" value="${esc(item.name)}" placeholder="품명"></td><td><input data-field="spec" value="${esc(item.spec)}" placeholder="규격"></td><td><input class="money-input" data-field="buyPrice" value="${money(item.buyPrice)}" inputmode="numeric"></td><td><input class="money-input" data-field="sellPrice" value="${money(item.sellPrice)}" inputmode="numeric"></td><td><input class="stock-input" type="number" min="0" step="1" data-field="stockQty" value="${number(item.stockQty)}"></td><td><span class="cumulative">누적 ${number(item.purchaseQty)}</span><button type="button" class="purchase-open-button" data-action="purchase">매입 등록</button></td><td><span class="cumulative">누적 ${number(item.issueQty)}</span><button type="button" class="issue-open-button" data-action="issue" ${item.stockQty>0?'':'disabled'}>불출 등록</button></td><td><textarea data-field="note" placeholder="비고">${esc(item.note)}</textarea></td><td><div class="row-actions"><button type="button" class="history-button" data-action="history">이력</button><button type="button" class="delete-row" data-action="delete">삭제</button></div></td></tr>`;
}

async function hydratePhotos(){
  await Promise.all(inventory.items.map(async item=>{
    if(!item.photo?.path)return;
    const box=document.querySelector(`[data-photo-id="${CSS.escape(item.id)}"]`);if(!box)return;
    const data=await wontech.readManagedImage(item.photo.path);if(!box.isConnected)return;
    if(data){const image=document.createElement('img');image.alt=`${item.name||item.number} 제품 사진`;image.src=data;box.replaceChildren(image)}else box.textContent='사진 끌어놓기';
  }));
}

function updateSummary(){
  $('inventoryItemCount').textContent=inventory.items.length;
  $('inventoryStockTotal').textContent=inventory.items.reduce((sum,item)=>sum+number(item.stockQty),0).toLocaleString('ko-KR');
  $('inventoryPurchaseTotal').textContent=inventory.items.reduce((sum,item)=>sum+number(item.purchaseQty),0).toLocaleString('ko-KR');
  $('inventoryIssueTotal').textContent=inventory.items.reduce((sum,item)=>sum+number(item.issueQty),0).toLocaleString('ko-KR');
}
function renderList(){
  $('inventoryBody').innerHTML=inventory.items.length?inventory.items.map(rowHtml).join(''):'<tr><td colspan="11" class="operations-empty">등록된 재고 품목이 없습니다. 상단의 ‘품목 추가’를 눌러 시작하세요.</td></tr>';
  updateSummary();
  hydratePhotos();
}

function historyRows(){
  const purchases=inventory.purchases.map(entry=>({...entry,type:'매입',partner:entry.supplier,detail:entry.note}));
  const issues=inventory.issues.map(entry=>({...entry,type:'불출',partner:entry.destination,detail:entry.reason}));
  const combined=[...purchases,...issues],rows=historyItemId?combined.filter(entry=>entry.itemId===historyItemId):combined;
  return rows.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||'').localeCompare(a.createdAt||''));
}
function renderHistory(){
  const item=inventory.items.find(entry=>entry.id===historyItemId);
  $('inventoryHistoryTitle').textContent=item?`${item.number} · ${item.name||'품명 미입력'} 입출고 이력`:'전체 입출고 이력';
  const rows=historyRows();$('inventoryHistoryCount').textContent=`${rows.length}건`;
  $('inventoryHistoryBody').innerHTML=rows.length?rows.map(entry=>`<tr><td><span class="transaction-badge ${entry.type==='매입'?'transaction-purchase':'transaction-issue'}">${entry.type}</span></td><td>${esc(entry.date)}</td><td>${esc(entry.itemNumber)}</td><td>${esc(entry.itemName)}</td><td>${number(entry.quantity)}</td><td>${esc(entry.partner)}</td><td>${esc(entry.detail)}</td><td>${number(entry.afterStock)}</td></tr>`).join(''):'<tr><td colspan="8" class="operations-empty">저장된 입출고 이력이 없습니다.</td></tr>';
}

function showView(view){
  const history=view==='history';
  $('inventoryListView').hidden=history;$('inventoryHistoryView').hidden=!history;
  $('inventoryListTab').classList.toggle('active',!history);$('inventoryHistoryTab').classList.toggle('active',history);
  $('addInventory').hidden=history;
  if(history)renderHistory();else renderList();
}
function findItem(target){const row=target.closest('tr[data-id]');return row?inventory.items.find(item=>item.id===row.dataset.id):null;}

async function inventoryReportConfig(includeImages=false){
  const history=!$('inventoryHistoryView').hidden,logoSrc=$('inventoryLogo').src;
  if(history){
    const item=inventory.items.find(entry=>entry.id===historyItemId),rows=historyRows();
    return{
      title:'재고 입출고 이력',subtitle:'WONTECH INVENTORY TRANSACTION HISTORY',logoSrc,
      meta:item?`${item.number} · ${item.name||'품명 미입력'}`:'전체 품목',
      summary:[`이력 ${rows.length.toLocaleString('ko-KR')}건`,`매입 ${rows.filter(row=>row.type==='매입').reduce((sum,row)=>sum+number(row.quantity),0).toLocaleString('ko-KR')}`,`불출 ${rows.filter(row=>row.type==='불출').reduce((sum,row)=>sum+number(row.quantity),0).toLocaleString('ko-KR')}`],
      fileName:`WONTECH_재고입출고이력_${todayKey()}`,
      columns:[{label:'구분',width:'8%'},{label:'날짜',width:'11%'},{label:'고유번호',width:'14%'},{label:'품명',width:'16%'},{label:'수량',width:'8%'},{label:'매입처/사용처',width:'16%'},{label:'메모/불출 사유',width:'18%'},{label:'처리 후 재고',width:'9%'}],
      rows:rows.map(entry=>[entry.type,entry.date,entry.itemNumber,entry.itemName,number(entry.quantity),entry.partner,entry.detail,number(entry.afterStock)])
    };
  }
  const photoMap=new Map();
  if(includeImages)await Promise.all(inventory.items.map(async item=>{if(item.photo?.path)photoMap.set(item.id,await wontech.readManagedImage(item.photo.path))}));
  return{
    title:'재고관리 현황',subtitle:'WONTECH INVENTORY MANAGEMENT',logoSrc,meta:'전체 재고 목록',
    summary:[`등록 ${inventory.items.length.toLocaleString('ko-KR')}품목`,`총 재고 ${inventory.items.reduce((sum,item)=>sum+number(item.stockQty),0).toLocaleString('ko-KR')}`,`누적 매입 ${inventory.items.reduce((sum,item)=>sum+number(item.purchaseQty),0).toLocaleString('ko-KR')}`,`누적 불출 ${inventory.items.reduce((sum,item)=>sum+number(item.issueQty),0).toLocaleString('ko-KR')}`],
    fileName:`WONTECH_재고현황_${todayKey()}`,
    columns:[{label:'고유번호',width:'9%'},{label:'제품사진',width:'8%'},{label:'품명',width:'15%'},{label:'규격',width:'11%'},{label:'매입단가',width:'10%',align:'right'},{label:'판매단가',width:'10%',align:'right'},{label:'재고수량',width:'8%'},{label:'매입수량',width:'8%'},{label:'불출수량',width:'8%'},{label:'비고',width:'13%',align:'left'}],
    rows:inventory.items.map(item=>[
      item.number,{text:item.photo?'첨부됨':'없음',image:photoMap.get(item.id)||''},item.name,item.spec,
      {text:money(item.buyPrice),align:'right'},{text:money(item.sellPrice),align:'right'},number(item.stockQty),number(item.purchaseQty),number(item.issueQty),{text:item.note,align:'left'}
    ])
  };
}

async function exportInventory(format){
  const output=window.WontechOperationsOutput;if(!output){alert('저장 기능을 불러오지 못했습니다.');return;}
  try{
    showNote(`${format.toUpperCase()} 가로 문서를 만드는 중입니다.`);await saveNow();
    const config=await inventoryReportConfig(format!=='excel'),saved=await output[`save${format[0].toUpperCase()+format.slice(1)}`](config);
    if(saved!==false)showNote(`${format.toUpperCase()} 파일을 저장했습니다.`);
  }catch(error){console.error(error);alert(`${format.toUpperCase()} 저장 중 문제가 발생했습니다.\n${error.message}`);}
}
async function printInventory(){
  const output=window.WontechOperationsOutput;if(!output?.print){alert('프린트 기능을 불러오지 못했습니다.');return;}
  try{
    showNote('A4 가로 인쇄 문서를 준비하고 있습니다.');await saveNow();const config=await inventoryReportConfig(true),result=await output.print(config);
    if(result&&!result.success&&result.reason)alert(`프린트 오류: ${result.reason}`);else showNote('프린트 창을 열었습니다.');
  }catch(error){console.error(error);alert(`프린트 중 문제가 발생했습니다.\n${error.message}`);}
}

async function applyInventoryPhoto(item,selected){
  if(!selected)return false;if(item.photo?.path)await wontech.removeManagedImage(item.photo.path);
  const{dataUrl,...photo}=selected;item.photo=photo;await saveNow();renderList();showNote('제품 사진을 첨부했습니다.');return true;
}

function openPurchase(item){
  purchaseItemId=item.id;$('purchaseDialogTitle').textContent=`재고 매입 등록 · ${item.number} · ${item.name||'품명 미입력'}`;
  $('purchaseDate').value=todayKey();$('purchaseQuantity').value=1;$('purchaseSupplier').value='';$('purchaseNote').value='';$('purchaseMessage').textContent=`현재 재고 ${item.stockQty}개 · 누적 매입 ${item.purchaseQty}개`;
  $('purchaseDialog').showModal();setTimeout(()=>$('purchaseQuantity').focus(),30);
}

function openIssue(item){
  issueItemId=item.id;$('issueDialogTitle').textContent=`재고 불출 등록 · ${item.number} · ${item.name||'품명 미입력'}`;
  $('issueDate').value=todayKey();$('issueQuantity').value=1;$('issueQuantity').max=item.stockQty;$('issueDestination').value='';$('issueReason').value='';$('issueMessage').textContent=`현재 재고 ${item.stockQty}개`;
  $('issueDialog').showModal();setTimeout(()=>$('issueQuantity').focus(),30);
}

$('inventoryBody').addEventListener('input',event=>{
  const field=event.target.dataset.field,item=findItem(event.target);if(!field||!item)return;
  item[field]=['buyPrice','sellPrice','stockQty'].includes(field)?number(event.target.value):event.target.value;
  if(field==='stockQty'){const issueButton=event.target.closest('tr')?.querySelector('[data-action="issue"]');if(issueButton)issueButton.disabled=item.stockQty<=0;updateSummary();}
  queueSave();
});
$('inventoryBody').addEventListener('dragover',event=>{const box=event.target.closest('.product-photo-preview');if(!box)return;event.preventDefault();event.dataTransfer.dropEffect='copy';box.classList.add('drag-over');});
$('inventoryBody').addEventListener('dragleave',event=>{const box=event.target.closest('.product-photo-preview');if(box)box.classList.remove('drag-over');});
$('inventoryBody').addEventListener('drop',async event=>{
  const box=event.target.closest('.product-photo-preview');if(!box)return;event.preventDefault();box.classList.remove('drag-over');
  const item=inventory.items.find(entry=>entry.id===box.dataset.photoId),file=event.dataTransfer.files?.[0];if(!item||!file)return;
  const filePath=wontech.pathForFile(file),selected=await wontech.archiveManagedImage('inventory',item.id,filePath);
  if(!selected){showNote('JPG, PNG, WEBP, BMP 사진 파일만 끌어놓을 수 있습니다.');return;}await applyInventoryPhoto(item,selected);
});
$('inventoryBody').addEventListener('focusout',event=>{if(event.target.classList.contains('money-input'))event.target.value=money(event.target.value);});
$('inventoryBody').addEventListener('focusin',event=>{if(event.target.classList.contains('money-input'))event.target.value=String(number(event.target.value)||'');});
$('inventoryBody').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;const item=findItem(button);if(!item)return;
  const action=button.dataset.action;
  if(action==='pick-photo'){
    const selected=await wontech.pickManagedImage('inventory',item.id);if(!selected)return;
    await applyInventoryPhoto(item,selected);
  }else if(action==='remove-photo'){
    if(!item.photo||!confirm('이 제품 사진을 삭제할까요?'))return;
    await wontech.removeManagedImage(item.photo.path);item.photo=null;await saveNow();renderList();showNote('제품 사진을 삭제했습니다.');
  }else if(action==='purchase')openPurchase(item);
  else if(action==='issue')openIssue(item);
  else if(action==='history'){historyItemId=item.id;showView('history');}
  else if(action==='delete'){
    if(!confirm(`${item.number} ${item.name||'품목'}을 재고 목록에서 삭제할까요?\n기존 불출 이력은 보존됩니다.`))return;
    if(item.photo?.path)await wontech.removeManagedImage(item.photo.path);
    inventory.items=inventory.items.filter(entry=>entry.id!==item.id);await saveNow();renderList();showNote('재고 품목을 삭제했습니다.');
  }
});

$('purchaseForm').addEventListener('submit',async event=>{
  event.preventDefault();const item=inventory.items.find(entry=>entry.id===purchaseItemId);if(!item)return;
  const quantity=number($('purchaseQuantity').value),date=$('purchaseDate').value,supplier=$('purchaseSupplier').value.trim(),note=$('purchaseNote').value.trim();
  if(!date||!Number.isInteger(quantity)||quantity<1){$('purchaseMessage').textContent='매입 날짜와 수량을 정확히 입력해 주세요.';return;}
  item.stockQty=number(item.stockQty)+quantity;item.purchaseQty=number(item.purchaseQty)+quantity;
  inventory.purchases.push({id:uid(),itemId:item.id,itemNumber:item.number,itemName:item.name,date,quantity,supplier,note,afterStock:item.stockQty,createdAt:new Date().toISOString()});
  await saveNow();$('purchaseDialog').close();renderList();showNote(`${item.name||item.number} ${quantity}개를 매입하고 재고를 증가했습니다.`);
});

$('issueForm').addEventListener('submit',async event=>{
  event.preventDefault();const item=inventory.items.find(entry=>entry.id===issueItemId);if(!item)return;
  const quantity=number($('issueQuantity').value),date=$('issueDate').value,destination=$('issueDestination').value.trim(),reason=$('issueReason').value.trim();
  if(!date||!destination||!reason||!Number.isInteger(quantity)||quantity<1){$('issueMessage').textContent='날짜·수량·사용처·불출 사유를 모두 정확히 입력해 주세요.';return;}
  if(quantity>item.stockQty){$('issueMessage').textContent=`불출수량이 현재 재고 ${item.stockQty}개보다 많습니다.`;return;}
  item.stockQty-=quantity;item.issueQty=number(item.issueQty)+quantity;
  inventory.issues.push({id:uid(),itemId:item.id,itemNumber:item.number,itemName:item.name,date,quantity,destination,reason,afterStock:item.stockQty,createdAt:new Date().toISOString()});
  await saveNow();$('issueDialog').close();renderList();showNote(`${item.name||item.number} ${quantity}개를 불출하고 재고를 차감했습니다.`);
});

$('addInventory').onclick=async()=>{const item=blankItem();inventory.items.push(item);await saveNow();showView('list');setTimeout(()=>document.querySelector(`tr[data-id="${CSS.escape(item.id)}"] [data-field="name"]`)?.focus(),30);};
$('inventoryListTab').onclick=()=>{historyItemId='';showView('list');};
$('inventoryHistoryTab').onclick=()=>{historyItemId='';showView('history');};
$('inventoryExcel').onclick=()=>exportInventory('excel');
$('inventoryJpg').onclick=()=>exportInventory('jpg');
$('inventoryPdf').onclick=()=>exportInventory('pdf');
$('inventoryPrint').onclick=printInventory;
$('cancelPurchase').onclick=()=>$('purchaseDialog').close();
$('cancelIssue').onclick=()=>$('issueDialog').close();
$('closeInventory').onclick=()=>wontech.close();

async function init(){
  $('inventoryLogo').src=await wontech.getLogo();
  const saved=await wontech.get('inventoryData');
  inventory={items:Array.isArray(saved?.items)?saved.items.map(normalizeItem):[],purchases:Array.isArray(saved?.purchases)?saved.purchases.map(normalizePurchase):[],issues:Array.isArray(saved?.issues)?saved.issues.map(normalizeIssue):[]};
  renderList();
}
init().catch(error=>{console.error(error);alert(`재고관리를 시작하지 못했습니다.\n${error.message}`);});
