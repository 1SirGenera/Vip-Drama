(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;').split("'").join('&#39;');
function run(){
  const main=$('#home'); if(!main||document.querySelector('#vipDiscovery')) return;
  const latest=$('#latest'); if(!latest) return;
  const hub=document.createElement('section');
  hub.id='vipDiscovery'; hub.className='section vip-discovery';
  hub.innerHTML='<div class="discovery-shell">'+
    '<div class="discovery-top"><div><span class="eyebrow">VIP DISCOVERY</span><h2>اكتشف مكتبتك بطريقة أذكى</h2><p class="muted">بحث سريع، ترتيب، فلاتر، ومشاهدة عشوائية — مع الحفاظ على كل أقسام VIP Drama الحالية.</p></div>'+
    '<button id="randomPick" class="btn primary" type="button">🎲 اختر لي شيئًا</button></div>'+
    '<div class="discovery-stats" id="discoveryStats"></div>'+
    '<div class="discovery-controls"><input id="smartSearch" type="search" placeholder="ابحث باسم العمل أو النوع أو السنة..." aria-label="بحث ذكي"><select id="smartType"><option value="all">كل الأنواع</option><option value="movie">أفلام</option><option value="series">مسلسلات</option><option value="anime">أنمي ورسوم</option></select><select id="smartSort"><option value="new">الأحدث أولاً</option><option value="old">الأقدم أولاً</option><option value="rating">الأعلى تقييماً</option><option value="views">الأكثر مشاهدة</option><option value="az">أبجدياً</option></select><button id="clearDiscovery" class="btn ghost" type="button">مسح</button></div>'+
    '<div id="discoveryResults" class="grid discovery-grid"></div>'+
    '<p id="discoveryEmpty" class="muted discovery-empty" hidden>لا توجد نتائج مطابقة. جرّب كلمة أخرى أو امسح الفلاتر.</p></div>';
  main.insertBefore(hub,latest);
  const stats=$('#discoveryStats');
  const getItems=()=>Array.isArray(window.VIP_CONTENT)?window.VIP_CONTENT.slice():[];
  function drawStats(){
    const a=getItems(), movies=a.filter(x=>String(x.type).toLowerCase()==='movie').length, series=a.filter(x=>String(x.type).toLowerCase()==='series').length, anime=a.filter(x=>String(x.type).toLowerCase()==='anime').length;
    stats.innerHTML=[['🎬',movies,'أفلام'],['📺',series,'مسلسلات'],['✨',anime,'أنمي ورسوم'],['📚',a.length,'إجمالي الأعمال']].map(v=>'<div class="discovery-stat"><b>'+v[0]+'</b><strong>'+v[1]+'</strong><span>'+v[2]+'</span></div>').join('');
  }
  function card(x){
    const article=document.createElement('article');article.className='card discovery-card';article.dataset.id=String(Number(x.id||0));
    const poster=document.createElement('button');poster.type='button';poster.className='poster discovery-poster';poster.setAttribute('aria-label','عرض '+(x.title||'بدون عنوان'));poster.onclick=()=>window.showDetails&&window.showDetails(Number(x.id||0));
    if(x.poster){const img=document.createElement('img');img.className='poster-image';img.loading='lazy';img.src=x.poster;img.alt=x.title||'';img.onerror=()=>img.remove();poster.appendChild(img)}
    const shade=document.createElement('span');shade.className='poster-shade';poster.appendChild(shade);
    const tag=document.createElement('span');tag.className='tag';tag.textContent=x.tag||'VIP';poster.appendChild(tag);
    const rating=document.createElement('span');rating.className='rating';rating.textContent='★ '+(x.rating||'—');poster.appendChild(rating);
    const pt=document.createElement('span');pt.className='poster-title';pt.textContent=x.title||'بدون عنوان';poster.appendChild(pt);article.appendChild(poster);
    const info=document.createElement('div');info.className='card-info';const wrap=document.createElement('div');const h=document.createElement('h3');h.textContent=x.title||'بدون عنوان';const p=document.createElement('p');p.textContent=(x.year||'')+(x.genre?' • '+x.genre:'');wrap.append(h,p);
    const play=document.createElement('button');play.type='button';play.className='play';play.textContent='▶';play.setAttribute('aria-label','مشاهدة');play.onclick=()=>window.showDetails&&window.showDetails(Number(x.id||0));info.append(wrap,play);article.appendChild(info);return article;
  }
  function render(){
    const q=($('#smartSearch').value||'').trim().toLowerCase(), type=$('#smartType').value, sort=$('#smartSort').value;
    let a=getItems().filter(x=>(type==='all'||String(x.type).toLowerCase()===type)&&(!q||[x.title,x.genre,x.tag,x.year,x.origin_country,x.collection].join(' ').toLowerCase().includes(q)));
    a.sort((x,y)=>sort==='old'?Number(x.year||0)-Number(y.year||0):sort==='rating'?Number(y.rating||0)-Number(x.rating||0):sort==='views'?Number(y.view_count||0)-Number(x.view_count||0):sort==='az'?String(x.title||'').localeCompare(String(y.title||''),'ar'):Number(y.year||0)-Number(x.year||0));
    $('#discoveryResults').innerHTML=a.slice(0,24).map(card).join('');
    $('#discoveryEmpty').hidden=a.length>0;
  }
  ['smartSearch','smartType','smartSort'].forEach(id=>$('#'+id).addEventListener('input',render));
  $('#clearDiscovery').onclick=()=>{$('#smartSearch').value='';$('#smartType').value='all';$('#smartSort').value='new';render();};
  $('#randomPick').onclick=()=>{const a=getItems();if(!a.length)return;const x=a[Math.floor(Math.random()*a.length)];if(typeof window.showDetails==='function')window.showDetails(x.id);};
  drawStats(); render();
  const oldRender=window.renderAll;
  if(typeof oldRender==='function') window.renderAll=new Proxy(oldRender,{apply(t,th,args){const r=Reflect.apply(t,th,args);drawStats();render();return r;}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();