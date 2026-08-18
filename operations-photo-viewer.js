(function(){
  const viewer=document.createElement('dialog');viewer.className='operations-photo-viewer';viewer.setAttribute('aria-label','제품 사진 확대 보기');
  viewer.innerHTML='<div class="photo-viewer-panel"><button type="button" class="photo-viewer-close" aria-label="사진 확대창 닫기">×</button><img class="photo-viewer-image" alt="확대 제품 사진"><div class="photo-viewer-caption">제품 사진 3배 확대</div></div>';
  document.body.appendChild(viewer);
  const image=viewer.querySelector('.photo-viewer-image'),close=()=>viewer.open&&viewer.close();
  viewer.querySelector('.photo-viewer-close').onclick=close;
  viewer.addEventListener('click',event=>{if(event.target===viewer)close();});
  document.addEventListener('click',event=>{
    const source=event.target.closest('.product-photo-preview img');if(!source)return;
    image.src=source.src;image.alt=source.alt||'확대 제품 사진';viewer.showModal();
  });
})();
