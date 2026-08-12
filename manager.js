const params=new URLSearchParams(location.search);
const type=params.get('type')==='order'?'order':'quote';
const kind=type==='order'?'발주':'견적';
const title=document.getElementById('title');
const panelTitle=document.getElementById('panelTitle');
const newDoc=document.getElementById('newDoc');
const newEnglishDoc=document.getElementById('newEnglishDoc');

title.textContent=kind+'관리';
panelTitle.textContent=kind+' 이력관리';
newDoc.textContent='＋ '+kind+'작성';
newEnglishDoc.hidden=type!=='quote';

function formatMoney(value,currency='KRW'){
  const amount=Number(value||0).toLocaleString(currency==='USD'?'en-US':'ko-KR');
  return currency==='USD'?'$ '+amount:amount+' 원';
}

async function refresh(){
  document.getElementById('logo').src=await wontech.getLogo();
  const docs=await wontech.listDocuments(type);
  const body=document.getElementById('body');
  body.innerHTML='';
  if(!docs.length){
    body.innerHTML='<tr><td colspan="7" style="text-align:center;color:#7c8792;padding:35px">저장된 '+kind+' 이력이 없습니다.</td></tr>';
    return;
  }
  docs.forEach(documentRecord=>{
    const tr=document.createElement('tr');
    const english=documentRecord.language==='en'||documentRecord.payload?.docLanguage==='en';
    const currency=documentRecord.currency||documentRecord.payload?.currency||'KRW';
    tr.innerHTML=`<td>${documentRecord.date||''}</td><td>${documentRecord.item||''}</td><td>${documentRecord.client||''}</td><td>${documentRecord.contact||''}</td><td class="right">${formatMoney(documentRecord.total,currency)}</td><td><button class="open">열기${english?' (EN)':''}</button></td><td><button class="delbtn">×</button></td>`;
    tr.querySelector('.open').onclick=()=>wontech.open('editor',{type,docId:documentRecord.id,language:english?'en':'ko'});
    tr.querySelector('.delbtn').onclick=async()=>{
      if(confirm('이 '+kind+' 이력을 삭제할까요?')){
        await wontech.deleteDocument(documentRecord.id);
        refresh();
      }
    };
    body.append(tr);
  });
}

newDoc.onclick=()=>wontech.open('editor',{type,language:'ko'});
newEnglishDoc.onclick=()=>wontech.open('editor',{type:'quote',language:'en'});
document.getElementById('refresh').onclick=refresh;
setInterval(refresh,2500);
refresh();
