(function(){
  const text=value=>String(value??'');
  const xml=value=>text(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const dateLabel=()=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const cellValue=cell=>cell&&typeof cell==='object'?(cell.text??''):cell;

  function element(tag,className,value){
    const node=document.createElement(tag);if(className)node.className=className;if(value!==undefined)node.textContent=text(value);return node;
  }

  async function buildReport(config){
    const sheet=element('section','operations-export-sheet');
    const head=element('header','operations-export-head');
    const logo=document.createElement('img');logo.alt='WONTECH';logo.src=config.logoSrc||'';head.appendChild(logo);
    const heading=element('div','operations-export-title');heading.append(element('strong','',config.title),element('span','',config.subtitle||'WONTECH 업무관리'));head.appendChild(heading);
    const spacer=element('div');spacer.style.width='205px';head.appendChild(spacer);sheet.appendChild(head);
    const meta=element('div','operations-export-meta');meta.append(element('span','',config.meta||'전체 자료'),element('span','',`출력일 ${dateLabel()}`));sheet.appendChild(meta);
    if(config.summary?.length){const summary=element('div','operations-export-summary');config.summary.forEach(value=>summary.appendChild(element('span','',value)));sheet.appendChild(summary);}
    const table=element('table','operations-export-table'),colgroup=document.createElement('colgroup');
    config.columns.forEach(column=>{const col=document.createElement('col');if(column.width)col.style.width=column.width;colgroup.appendChild(col)});table.appendChild(colgroup);
    const thead=document.createElement('thead'),headRow=document.createElement('tr');config.columns.forEach(column=>headRow.appendChild(element('th','',column.label)));thead.appendChild(headRow);table.appendChild(thead);
    const tbody=document.createElement('tbody');
    if(!config.rows.length){const tr=document.createElement('tr'),td=element('td','operations-export-empty','해당 조건에 저장할 자료가 없습니다.');td.colSpan=config.columns.length;tr.appendChild(td);tbody.appendChild(tr);}
    for(const row of config.rows){
      const tr=document.createElement('tr');
      row.forEach((raw,index)=>{
        const cell=raw&&typeof raw==='object'?raw:{text:raw},td=document.createElement('td');
        const align=cell.align||config.columns[index]?.align;if(align)td.classList.add(`align-${align}`);
        if(cell.image){const box=element('div','operations-export-photo'),img=document.createElement('img');img.alt=cell.text||'제품 사진';img.src=cell.image;box.appendChild(img);td.appendChild(box)}else td.textContent=text(cell.text??'');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);sheet.appendChild(table);document.body.appendChild(sheet);
    await Promise.all(Array.from(sheet.querySelectorAll('img')).map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.onload=resolve;image.onerror=resolve})));if(document.fonts?.ready)await document.fonts.ready;
    return sheet;
  }

  async function capture(config){
    if(typeof html2canvas!=='function')throw Error('JPG/PDF 저장 기능을 불러오지 못했습니다.');
    let sheet;document.body.classList.add('operations-exporting');
    try{sheet=await buildReport(config);return await html2canvas(sheet,{scale:1.35,backgroundColor:'#ffffff',useCORS:true,logging:false,width:sheet.scrollWidth,height:sheet.scrollHeight,windowWidth:sheet.scrollWidth,windowHeight:sheet.scrollHeight});}
    finally{sheet?.remove();document.body.classList.remove('operations-exporting');}
  }

  function excelHtml(config){
    const headers=config.columns.map(column=>`<th>${xml(column.label)}</th>`).join('');
    const rows=config.rows.map(row=>`<tr>${row.map(cell=>`<td>${xml(cellValue(cell))}</td>`).join('')}</tr>`).join('');
    const summary=(config.summary||[]).map(value=>`<span style="margin-right:18px"><b>${xml(value)}</b></span>`).join('');
    return `<html><head><meta charset="utf-8"><style>body{font-family:Arial,'Malgun Gothic',sans-serif}h1{text-align:center;color:#173f63}table{border-collapse:collapse;width:100%}th,td{border:1px solid #9aa9b3;padding:6px;text-align:center}th{background:#1f4b73;color:white}</style></head><body><h1>${xml(config.title)}</h1><p>${xml(config.meta||'전체 자료')} · 출력일 ${xml(dateLabel())}</p><p>${summary}</p><table><tr>${headers}</tr>${rows}</table></body></html>`;
  }

  async function saveExcel(config){
    const bytes=Array.from(new TextEncoder().encode('\ufeff'+excelHtml(config)));
    return wontech.saveBytes(bytes,`${config.fileName}.xls`);
  }

  async function saveJpg(config){
    const canvas=await capture(config);
    return wontech.saveImage(canvas.toDataURL('image/jpeg',.95),config.fileName);
  }

  async function savePdf(config){
    if(!window.jspdf)throw Error('PDF 저장 기능을 불러오지 못했습니다.');
    const canvas=await capture(config),{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
    const margin=6,pageWidth=297,pageHeight=210,contentWidth=pageWidth-margin*2,contentHeight=pageHeight-margin*2;
    const slicePixelHeight=Math.max(1,Math.floor(canvas.width*contentHeight/contentWidth));
    let offset=0,page=0;
    while(offset<canvas.height){
      const height=Math.min(slicePixelHeight,canvas.height-offset),slice=document.createElement('canvas');slice.width=canvas.width;slice.height=height;
      slice.getContext('2d').drawImage(canvas,0,offset,canvas.width,height,0,0,canvas.width,height);
      if(page++)pdf.addPage('a4','landscape');
      const imageHeight=height*contentWidth/canvas.width;pdf.addImage(slice.toDataURL('image/jpeg',.96),'JPEG',margin,margin,contentWidth,imageHeight,undefined,'FAST');offset+=height;
    }
    const bytes=Array.from(new Uint8Array(pdf.output('arraybuffer')));return wontech.saveBytes(bytes,`${config.fileName}.pdf`);
  }

  window.WontechOperationsOutput={saveExcel,saveJpg,savePdf};
})();
