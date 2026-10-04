(()=>{
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const items=()=>Array.isArray(window.VIP_CONTENT)?window.VIP_CONTENT.filter(x=>x&&x.published!==false):[];
function card(x){
  const id=Number(x.id||0), title=esc(x.title||'بدون عنوان'), poster=esc(x.poster||'');
  return '<article class="premium-card"><button type="button" class="premium-poster" onclick="showDetails('+id+')" aria-label="عرض '+title+'">'+
    (poster?'<img loading="lazy" src="'+poster+'" alt="'+title+'" onerror="this.style.display=\'none\'">':'<span class="premium-fallback">VIP</span>')+
    '<span class="premium-overlay"></span><span class="premium-badge">'+esc(x.tag||'VIP')}</span></button>'+
    '<div class="premium-card-body"><div><h3>'+title+'</h3><p>'+esc(x.year||'')+(x.genre?' • '+esc(x.genre):'')+'</p></div>'+
    '<button class="premium-play" type="button" onclick="showDetails('+id+')" aria-label="مشاهدة '+title+'">▶</button></div></article>';
}
function run(){
  const main=document.querySelector('#home'), latest=document.querySelector('#latest');
  if(!main||!latest||document.querySelector('#vipPremium')) return;
  const section=document.createElement('section'); section.id='vipPremium'; section.className='section vip-premium';
  section.innerHTML='<div class="premium-spotlight" id="premiumSpotlight"></div>'+
    '<div class="premium-rail-section"><div class="section-head"><div><span class="eyebrow">TOP WATCHED</span><h2>الأكثر مشاهدة</h2></div><span class="premium-live-dot">● يتجدد تلقائياً</span></div><div class="premium-rail" id="topWatched"></div></div>';
  main.insertBefore(section,latest);
  function draw(){
    const a=items();
    if(!a.length){section.hidden=true;return}
    section.hidden=false;
    const sorted=a.slice().sort((x,y)=>Number(y.view_count||0)-Number(x.view_count||0));
    const featured=sorted[0]||a[0];
    document.querySelector('#premiumSpotlight').innerHTML='<div class="spotlight-copy"><span class="eyebrow">VIP SPOTLIGHT</span><h2>'+esc(featured.title||'اختيار VIP')+'</h2><p>'+esc(featured.description||'اكتشف عملاً مميزاً من مكتبة VIP Drama.')+'</p><div class="spotlight-meta">'+esc(featured.year||'')+(featured.genre?' • '+esc(featured.genre):'')+(featured.rating?' • ★ '+esc(featured.rating):'')+'</div><button class="btn primary" type="button" onclick="showDetails('+Number(featured.id||0)+')">▶ شاهد التفاصيل</button></div><div class="spotlight-art">'+(featured.poster?'<img loading="lazy" src="'+esc(featured.poster)+'" alt="">':'<span>VIP<br>DRAMA</span>')+'</div>';
    document.querySelector('#topWatched').innerHTML=sorted.slice(0,8).map(card).join('');
  }
  draw();
  const old=window.renderAll;
  if(typeof old==='function') window.renderAll=new Proxy(old,{apply(t,th,args){const r=Reflect.apply(t,th,args);draw();return r;}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();