const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const normalizeType=value=>{const t=String(value||'').trim().toLowerCase();if(['movie','movies','film','films','فيلم','أفلام'].includes(t))return'movie';if(['series','serie','tv','show','shows','مسلسل','مسلسلات'].includes(t))return'series';if(['anime','animation','cartoon','أنمي','انمي','رسوم متحركة'].includes(t))return'anime';return''};
const normalizeUrl=v=>String(v||'').trim();
function posterMarkup(x){
  const p=normalizeUrl(x.poster);
  return p&&/^https?:\/\//i.test(p)?'<img class="poster-image" src="'+esc(p)+'" alt="'+esc(x.title||'')+'" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">':'';
}
function card(x){
  return '<article class="card"><div class="poster" style="background:'+esc(x.poster&&/^https?:\/\//i.test(String(x.poster))?'linear-gradient(145deg,#171326,#111827)':(x.poster||'linear-gradient(145deg,#171326,#111827)'))+'">'+posterMarkup(x)+'<div class="poster-shade"></div><span class="tag">'+esc(x.tag||'جديد')+'</span><span class="rating">★ '+esc(x.rating??0)+'</span><div class="poster-title">'+esc(x.title)+'</div></div><div class="card-info"><div><h3>'+esc(x.title)+'</h3><p>'+esc(x.genre||'')+' • '+esc(x.year||'')+'</p><span class="view-count">👁 '+Number(x.view_count||0).toLocaleString('ar-SA')+' مشاهدة</span></div><button class="play" onclick="openTitle('+Number(x.id)+')" aria-label="تشغيل '+esc(x.title)+'">▶</button></div></article>';
}
function render(id,items){const el=$(id);if(el)el.innerHTML=items.map(card).join('')||'<p class="muted">لا يوجد محتوى في هذا القسم حالياً.</p>';}
let all=Array.isArray(window.VIP_CONTENT)?window.VIP_CONTENT.slice():[];
let vipClient=null;
function mergeContent(dbRows){
  const localByTitle=new Map(all.map(x=>[String(x.title||'').trim().toLowerCase(),x]));
  const merged=(dbRows||[]).map(row=>{
    const base=localByTitle.get(String(row.title||'').trim().toLowerCase())||{};
    const titleKey=String(row.title||'').trim().toLowerCase();
    const localEmbed=normalizeUrl(base.embedUrl);
    const isBlender=localEmbed.includes('video.blender.org/videos/embed/');
    return {...base,...row,
      id:row.id??base.id,
      type:normalizeType(row.type)||normalizeType(base.type)||'movie',
      videoUrl:isBlender?'':normalizeUrl(row.video_url)||normalizeUrl(row.videoUrl)||normalizeUrl(base.videoUrl),
      embedUrl:isBlender?localEmbed:normalizeUrl(row.embed_url)||normalizeUrl(row.embedUrl)||localEmbed,
      watchUrl:normalizeUrl(row.watch_url)||normalizeUrl(row.watchUrl)||normalizeUrl(base.watchUrl),
      poster:(/^https?:\/\//i.test(normalizeUrl(base.poster))?normalizeUrl(base.poster):normalizeUrl(row.poster)||base.poster||'linear-gradient(145deg,#171326,#111827)'),
      description:row.description||base.description||'',
      license:row.license||base.license||'',
      source:row.source||base.source||''
    };
  });
  const dbTitles=new Set(merged.map(x=>String(x.title||'').trim().toLowerCase()));
  return [...merged,...all.filter(x=>!dbTitles.has(String(x.title||'').trim().toLowerCase()))];
}
function renderAll(){all=all.map(x=>({...x,type:normalizeType(x.type)||'movie'}));render('#latestGrid',all.slice(0,6));render('#moviesGrid',all.filter(x=>x.type==='movie'));render('#seriesGrid',all.filter(x=>x.type==='series'));render('#animeGrid',all.filter(x=>x.type==='anime'))}
async function loadContent(){
  renderAll();
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return;
  try{
    vipClient=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
    const {data,error}=await vipClient.from('vip_content').select('*').order('created_at',{ascending:false});
    if(!error&&Array.isArray(data)&&data.length){all=mergeContent(data);renderAll();}
  }catch(_){}
}
function mediaType(url){const u=String(url||'').toLowerCase().split('?')[0];if(u.endsWith('.webm'))return'video/webm';if(u.endsWith('.ogv')||u.endsWith('.ogg'))return'video/ogg';if(u.endsWith('.mp4'))return'video/mp4';return''}
function withEmbedOptions(url){
  const u=normalizeUrl(url);if(!u)return'';
  if(!u.includes('video.blender.org/videos/embed/'))return u;
  return u;
}
function playerMarkup(x){
  const video=normalizeUrl(x.videoUrl),embed=withEmbedOptions(x.embedUrl),poster=normalizeUrl(x.poster);
  if(embed){
    return '<div class="vip-player embed-player"><iframe class="site-frame" src="'+esc(embed)+'" title="'+esc(x.title)+'" loading="eager" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
  }
  if(video){
    const type=mediaType(video);
    return '<div class="vip-player"><video id="vipVideo" class="site-video" controls playsinline preload="metadata" poster="'+esc(poster)+'"><source src="'+esc(video)+'"'+(type?' type="'+esc(type)+'"':'')+'><p>المتصفح لا يدعم تشغيل الفيديو.</p></video></div>';
  }
  return '<div class="player-empty"><div class="player-icon">▶</div><h3>المشاهدة داخل VIP Drama</h3><p>لا يوجد مصدر تشغيل صالح لهذا العنوان حالياً.</p><small>أضف MP4/WebM مباشر أو Embed رسمي من لوحة الإدارة.</small></div>';
}
function setupVipPlayer(x){
  const v=$('#vipVideo');if(!v)return;
  const resumeKey='vip-resume-'+x.id;
  v.addEventListener('loadedmetadata',()=>{
    const saved=Number(localStorage.getItem(resumeKey)||0);
    if(saved>10&&saved<v.duration-5){try{v.currentTime=saved}catch(_){}}
  });
  v.addEventListener('timeupdate',()=>{if(v.currentTime>10&&!v.ended)localStorage.setItem(resumeKey,String(Math.floor(v.currentTime)))});
  v.addEventListener('ended',()=>localStorage.removeItem(resumeKey));
  v.addEventListener('error',()=>{$('#playerStage').innerHTML='<div class="player-empty"><div class="player-icon">!</div><h3>تعذر تشغيل الفيديو</h3><p>تعذر تحميل مصدر الفيديو الحالي.</p><small>جرّب تحديث الصفحة أو استخدم مصدراً آخر من لوحة الإدارة.</small></div>'},{once:true});
}
async function recordView(x){
  if(!vipClient||!x?.id)return;
  const key='vip-view-'+x.id,now=Date.now(),last=Number(localStorage.getItem(key)||0);
  if(last&&now-last<86400000)return;
  try{
    const {data,error}=await vipClient.rpc('record_view',{p_content_id:x.id});
    if(!error){localStorage.setItem(key,String(now));const updated=all.find(v=>Number(v.id)===Number(x.id));if(updated)updated.view_count=Number(data||0);renderAll();const meta=$('#playerMeta');if(meta)meta.textContent=(x.genre||'')+' • '+(x.year||'')+'  |  '+(x.license||'الترخيص غير المحدد')+'  |  👁 '+Number(data||0).toLocaleString('ar-SA')+' مشاهدة'}
  }catch(_){}
}
window.openTitle=id=>{
  const x=all.find(v=>Number(v.id)===Number(id));if(!x)return;
  $('#playerTitle').textContent=x.title||'';
  $('#playerMeta').textContent=(x.genre||'')+' • '+(x.year||'')+'  |  '+(x.license||'الترخيص غير المحدد')+'  |  👁 '+Number(x.view_count||0).toLocaleString('ar-SA')+' مشاهدة';
  $('#playerDesc').textContent=x.description||'';
  $('#playerSource').textContent=x.source?'المصدر: '+x.source:'';
  $('#playerStage').innerHTML=playerMarkup(x);$('#playerModal').classList.add('show');document.body.classList.add('player-open');
  setupVipPlayer(x);recordView(x);
};
window.closePlayer=()=>{
  const media=$('#playerStage .site-video');if(media){media.pause();media.removeAttribute('src');media.load();}
  $('#playerStage').innerHTML='';$('#playerModal').classList.remove('show');document.body.classList.remove('player-open');
};
const playerClose=$('#playerClose'),playerModal=$('#playerModal');
if(playerClose)playerClose.onclick=window.closePlayer;
if(playerModal)playerModal.addEventListener('click',e=>{if(e.target===playerModal)window.closePlayer()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&playerModal?.classList.contains('show'))window.closePlayer()});
const modal=$('#searchModal');
if(modal){
  $('#searchOpen').onclick=()=>{modal.classList.add('show');$('#searchInput').focus()};
  $('#searchClose').onclick=()=>modal.classList.remove('show');
  $('#searchInput').oninput=e=>{const q=e.target.value.trim().toLowerCase();$('#searchResults').innerHTML=q?all.filter(x=>String(x.title||'').toLowerCase().includes(q)||String(x.genre||'').toLowerCase().includes(q)).map(card).join(''):'<p class="muted">ابدأ بكتابة اسم العنوان أو النوع.</p>'};
}
async function setupAccountButton(){
  const btn=$('#accountBtn');if(!btn||!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return;
  try{const client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});const {data:{session}}=await client.auth.getSession();updateAccountButton(btn,session);client.auth.onAuthStateChange((_event,newSession)=>updateAccountButton(btn,newSession))}catch(_){}
}
function updateAccountButton(btn,session){btn.textContent=session?'👤 حسابي':'👤 تسجيل الدخول';btn.href='login.html';btn.classList.toggle('logged-in',!!session)}
renderAll();setupAccountButton();loadContent();