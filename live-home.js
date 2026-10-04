(()=>{'use strict';
function esc(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
async function init(){
 const home=document.querySelector('#home'),latest=document.querySelector('#latest');
 if(!home||!latest||!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return;
 if(document.querySelector('#homeLiveHub'))return;
 const section=document.createElement('section');section.id='homeLiveHub';section.className='section home-live-hub';
 section.innerHTML='<div class="section-head"><div><span class="eyebrow">LIVE CENTER</span><h2>البث المباشر الآن</h2><p class="muted">قنوات ومباريات منشورة ومصرح بعرضها داخل VIP Drama.</p></div><a class="btn ghost" href="live.html">فتح مركز البث</a></div><div class="home-live-grid" id="homeLiveGrid"><div class="live-empty">جاري تحميل البث...</div></div>';
 home.insertBefore(section,latest);
 const client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
 const [cr,mr]=await Promise.all([
  client.from('vip_live_channels').select('id,name,category,logo_url,is_live').eq('published',true).order('sort_order').limit(6),
  client.from('vip_live_matches').select('id,league,home_team,away_team,status,home_score,away_score,minute,start_time').eq('published',true).order('start_time',{ascending:true}).limit(4)
 ]);
 const grid=section.querySelector('#homeLiveGrid');grid.replaceChildren();
 const channels=cr.data||[],matches=mr.data||[];
 if(cr.error&&mr.error){grid.innerHTML='<div class="live-empty">مركز البث غير متاح حالياً.</div>';return}
 channels.slice(0,3).forEach(x=>{
  const a=document.createElement('a');a.className='home-live-card';a.href='live.html';
  a.innerHTML='<span class="home-live-logo"></span><span><b></b><small></small></span><i>›</i>';
  const img=x.logo_url?document.createElement('img'):null;
  if(img){img.src=x.logo_url;img.alt='';img.onerror=()=>img.remove();a.querySelector('.home-live-logo').appendChild(img)}
  else a.querySelector('.home-live-logo').textContent='TV';
  a.querySelector('b').textContent=x.name;
  a.querySelector('small').textContent=(x.is_live?'🔴 مباشر':'متاح')+' • '+(x.category||'عام');
  grid.appendChild(a);
 });
 matches.slice(0,2).forEach(x=>{
  const a=document.createElement('a');a.className='home-live-match';a.href='live.html';
  a.innerHTML='<span class="match-chip">'+esc(x.league||'مباراة')+'</span><div><b></b><strong></strong></div><i>›</i>';
  a.querySelector('b').textContent=x.home_team+' × '+x.away_team;
  a.querySelector('strong').textContent=(x.status==='live'?'🔴 مباشر '+(x.minute!=null?x.minute+'′':''):(x.home_score??0)+' - '+(x.away_score??0));
  grid.appendChild(a);
 });
 if(!grid.children.length)grid.innerHTML='<a class="home-live-empty" href="live.html">لا توجد بثوث منشورة حالياً — افتح مركز البث لإدارة القنوات والمباريات.</a>';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();