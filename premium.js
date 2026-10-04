(()=>{
'use strict';
const esc=s=>String(s??'').split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;').split("'").join('&#39;');
const getItems=()=>Array.isArray(window.VIP_CONTENT)?window.VIP_CONTENT.filter(x=>x&&x.published!==false):[];
function makeCard(x){
  const id=Number(x.id||0), title=esc(x.title||'بدون عنوان');
  const article=document.createElement('article'); article.className='premium-card';
  const poster=document.createElement('button'); poster.type='button'; poster.className='premium-poster'; poster.setAttribute('aria-label','عرض '+title);
  poster.onclick=()=>window.showDetails&&window.showDetails(id);
  if(x.poster){const img=document.createElement('img');img.loading='lazy';img.src=x.poster;img.alt=x.title||'';img.onerror=()=>img.remove();poster.appendChild(img)}
  else {const f=document.createElement('span');f.className='premium-fallback';f.textContent='VIP';poster.appendChild(f)}
  const overlay=document.createElement('span');overlay.className='premium-overlay';poster.appendChild(overlay);
  const badge=document.createElement('span');badge.className='premium-badge';badge.textContent=x.tag||'VIP';poster.appendChild(badge);
  article.appendChild(poster);
  const body=document.createElement('div');body.className='premium-card-body';
  const info=document.createElement('div'), h=document.createElement('h3'), p=document.createElement('p');
  h.textContent=x.title||'بدون عنوان';p.textContent=(x.year||'')+(x.genre?' • '+x.genre:'');info.append(h,p);
  const play=document.createElement('button');play.type='button';play.className='premium-play';play.textContent='▶';play.setAttribute('aria-label','مشاهدة '+title);play.onclick=()=>window.showDetails&&window.showDetails(id);
  body.append(info,play);article.appendChild(body);return article;
}
function run(){
  const main=document.querySelector('#home'), latest=document.querySelector('#latest');
  if(!main||!latest||document.querySelector('#vipPremium')) return;
  const section=document.createElement('section');section.id='vipPremium';section.className='section vip-premium';
  section.innerHTML='<div class="premium-spotlight" id="premiumSpotlight"></div><div class="premium-rail-section"><div class="section-head"><div><span class="eyebrow">TOP WATCHED</span><h2>الأكثر مشاهدة</h2></div><span class="premium-live-dot">● يتجدد تلقائياً</span></div><div class="premium-rail" id="topWatched"></div></div>';
  main.insertBefore(section,latest);
  function draw(){
    const a=getItems(); if(!a.length){section.hidden=true;return} section.hidden=false;
    const sorted=a.slice().sort((x,y)=>Number(y.view_count||0)-Number(x.view_count||0)), featured=sorted[0]||a[0];
    const spot=document.querySelector('#premiumSpotlight');
    spot.innerHTML='<div class="spotlight-copy"><span class="eyebrow">VIP SPOTLIGHT</span><h2></h2><p></p><div class="spotlight-meta"></div><button class="btn primary" type="button">▶ شاهد التفاصيل</button></div><div class="spotlight-art"></div>';
    spot.querySelector('h2').textContent=featured.title||'اختيار VIP';
    spot.querySelector('p').textContent=featured.description||'اكتشف عملاً مميزاً من مكتبة VIP Drama.';
    spot.querySelector('.spotlight-meta').textContent=(featured.year||'')+(featured.genre?' • '+featured.genre:'')+(featured.rating?' • ★ '+featured.rating:'');
    spot.querySelector('.btn').onclick=()=>window.showDetails&&window.showDetails(Number(featured.id||0));
    const art=spot.querySelector('.spotlight-art');
    if(featured.poster){const img=document.createElement('img');img.loading='lazy';img.src=featured.poster;img.alt='';art.appendChild(img)}else{const span=document.createElement('span');span.innerHTML='VIP<br>DRAMA';art.appendChild(span)}
    const rail=document.querySelector('#topWatched');rail.replaceChildren(...sorted.slice(0,8).map(makeCard));
  }
  draw();
  const old=window.renderAll;
  if(typeof old==='function') window.renderAll=new Proxy(old,{apply(t,th,args){const result=Reflect.apply(t,th,args);draw();return result;}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();