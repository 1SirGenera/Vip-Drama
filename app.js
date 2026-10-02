const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const normalizeType=value=>{const t=String(value||'').trim().toLowerCase();if(['movie','movies','film','films','فيلم','أفلام'].includes(t))return'movie';if(['series','serie','tv','show','shows','مسلسل','مسلسلات'].includes(t))return'series';if(['anime','animation','cartoon','أنمي','انمي','رسوم متحركة'].includes(t))return'anime';return''};
const normalizeUrl=v=>String(v||'').trim();
const favKey=id=>'vip-favorite-'+id;
const resumeKey=id=>'vip-resume-'+id;
function isFavorite(id){try{return localStorage.getItem(favKey(id))==='1'}catch(_){return false}}
function posterMarkup(x){const p=normalizeUrl(x.poster);return p&&/^https?:\/\//i.test(p)?'<img class="poster-image" src="'+esc(p)+'" alt="'+esc(x.title||'')+'" loading="lazy" decoding="async" width="400" height="560" onerror="this.style.display=\'none\'">':''}
function card(x,compact=false){
  return '<article class="card '+(compact?'rail-card':'')+'" data-type="'+esc(x.type||'')+'"><button class="poster-button" onclick="showDetails('+Number(x.id)+')" aria-label="تفاصيل '+esc(x.title)+'"><div class="poster" style="background:'+esc(x.poster&&/^https?:\/\//i.test(String(x.poster))?'linear-gradient(145deg,#171326,#111827)':(x.poster||'linear-gradient(145deg,#171326,#111827)'))+'">'+posterMarkup(x)+'<div class="poster-shade"></div><span class="tag">'+esc(x.tag||'جديد')+'</span><span class="rating">★ '+esc(x.rating??0)+'</span><div class="poster-title">'+esc(x.title)+'</div></div></button><div class="card-info"><div><h3>'+esc(x.title)+'</h3><p>'+esc(x.genre||'')+' • '+esc(x.year||'')+'</p><span class="view-count">👁 '+Number(x.view_count||0).toLocaleString('ar-SA')+' مشاهدة</span></div><button class="play" onclick="openTitle('+Number(x.id)+')" aria-label="تشغيل '+esc(x.title)+'">▶</button><button class="mini-fav '+(isFavorite(x.id)?'saved':'')+'" onclick="toggleFavorite('+Number(x.id)+');event.stopPropagation()" aria-label="إضافة إلى قائمتي">'+(isFavorite(x.id)?'♥':'♡')+'</button></div></article>';
}
function render(id,items,compact=false){const el=$(id);if(el)el.innerHTML=items.map(x=>card(x,compact)).join('')||'<p class="muted">لا يوجد محتوى في هذا القسم حالياً.</p>'}
let all=Array.isArray(window.VIP_CONTENT)?window.VIP_CONTENT.slice():[];
let vipClient=null,selectedTitle=null;
function mergeContent(dbRows){
  const localByTitle=new Map(all.map(x=>[String(x.title||'').trim().toLowerCase(),x]));
  const merged=(dbRows||[]).map(row=>{
    const base=localByTitle.get(String(row.title||'').trim().toLowerCase())||{};
    const localEmbed=normalizeUrl(base.embedUrl);
    const isBlender=localEmbed.includes('video.blender.org/videos/embed/');
    return {
      ...base,
      ...row,
      id:row.id??base.id,
      type:normalizeType(row.type)||normalizeType(base.type)||'movie',
      videoUrl:isBlender?'':normalizeUrl(row.video_url)||normalizeUrl(row.videoUrl)||normalizeUrl(base.videoUrl),
      embedUrl:isBlender?localEmbed:normalizeUrl(row.embed_url)||normalizeUrl(row.embedUrl)||localEmbed,
      watchUrl:normalizeUrl(row.watch_url)||normalizeUrl(row.watchUrl)||normalizeUrl(base.watchUrl),
      poster:normalizeUrl(base.poster).startsWith('http')?normalizeUrl(base.poster):normalizeUrl(row.poster)||base.poster||'linear-gradient(145deg,#171326,#111827)',
      description:row.description||base.description||'',
      license:row.license||base.license||'',
      source:row.source||base.source||''
    };
  });
  const dbTitles=new Set(merged.map(x=>String(x.title||'').trim().toLowerCase()));
  return [...merged,...all.filter(x=>!dbTitles.has(String(x.title||'').trim().toLowerCase()))];
}
function getContinue(){return all.filter(x=>{try{return Number(localStorage.getItem(resumeKey(x.id)||0))>10}catch(_){return false}}).sort((a,b)=>Number(localStorage.getItem(resumeKey(b.id))||0)-Number(localStorage.getItem(resumeKey(a.id))||0))}
function getFavorites(){return all.filter(x=>isFavorite(x.id))}
function refreshPersonalRows(){const cont=getContinue(),favs=getFavorites();const cs=$('#continueSection'),fs=$('#favoritesSection');if(cs){cs.hidden=!cont.length;if(cont.length)render('#continueGrid',cont,true)}if(fs){fs.hidden=!favs.length;if(favs.length)render('#favoritesGrid',favs,true)}}
function renderAll(){all=all.map(x=>({...x,type:normalizeType(x.type)||'movie'}));const latest=[...all].sort((a,b)=>Number(b.year||0)-Number(a.year||0));render('#latestGrid',latest.slice(0,8));render('#moviesGrid',all.filter(x=>x.type==='movie'));render('#seriesGrid',all.filter(x=>x.type==='series'));render('#animeGrid',all.filter(x=>x.type==='anime'));refreshPersonalRows()}
async function loadContent(){renderAll();if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return;try{vipClient=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});const {data,error}=await vipClient.from('vip_content').select('*').order('created_at',{ascending:false});if(!error&&Array.isArray(data)&&data.length){all=mergeContent(data);renderAll()}}catch(_){}}
function mediaType(url){const u=String(url||'').toLowerCase().split('?')[0];if(u.endsWith('.webm'))return'video/webm';if(u.endsWith('.ogv')||u.endsWith('.ogg'))return'video/ogg';if(u.endsWith('.mp4'))return'video/mp4';return''}
function playerMarkup(x){const video=normalizeUrl(x.videoUrl),embed=normalizeUrl(x.embedUrl),poster=normalizeUrl(x.poster);if(embed)return '<div class="vip-player embed-player"><iframe class="site-frame" src="'+esc(embed)+'" title="'+esc(x.title)+'" loading="eager" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';if(video){const type=mediaType(video);return '<div class="vip-player"><video id="vipVideo" class="site-video" controls playsinline preload="metadata" poster="'+esc(poster)+'"><source src="'+esc(video)+'"'+(type?' type="'+esc(type)+'"':'')+'><p>المتصفح لا يدعم تشغيل الفيديو.</p></video></div>'}return '<div class="player-empty"><div class="player-icon">▶</div><h3>المشاهدة داخل VIP Drama</h3><p>لا يوجد مصدر تشغيل صالح لهذا العنوان حالياً.</p><small>أضف MP4/WebM مباشر أو Embed رسمي من لوحة الإدارة.</small></div>'}
function setupVipPlayer(x){const v=$('#vipVideo');if(!v)return;const key=resumeKey(x.id);v.addEventListener('loadedmetadata',()=>{const saved=Number(localStorage.getItem(key)||0);if(saved>10&&saved<v.duration-5){try{v.currentTime=saved}catch(_){}}});v.addEventListener('timeupdate',()=>{if(v.currentTime>10&&!v.ended){localStorage.setItem(key,String(Math.floor(v.currentTime)));refreshPersonalRows()}});v.addEventListener('ended',()=>{localStorage.removeItem(key);refreshPersonalRows()});v.addEventListener('error',()=>{$('#playerStage').innerHTML='<div class="player-empty"><div class="player-icon">!</div><h3>تعذر تشغيل الفيديو</h3><p>تعذر تحميل مصدر الفيديو الحالي.</p></div>'},{once:true})}
async function recordView(x){if(!vipClient||!x?.id)return;const key='vip-view-'+x.id,now=Date.now(),last=Number(localStorage.getItem(key)||0);if(last&&now-last<86400000)return;try{const {data,error}=await vipClient.rpc('record_view',{p_content_id:x.id});if(!error){localStorage.setItem(key,String(now));const updated=all.find(v=>Number(v.id)===Number(x.id));if(updated)updated.view_count=Number(data||0);renderAll();const meta=$('#playerMeta');if(meta)meta.textContent=(x.genre||'')+' • '+(x.year||'')+'  |  '+(x.license||'الترخيص غير المحدد')+'  |  👁 '+Number(data||0).toLocaleString('ar-SA')+' مشاهدة'}}catch(_){}}
window.openTitle=id=>{const x=all.find(v=>Number(v.id)===Number(id));if(!x)return;$('#playerTitle').textContent=x.title||'';$('#playerMeta').textContent=(x.genre||'')+' • '+(x.year||'')+'  |  '+(x.license||'الترخيص غير المحدد')+'  |  👁 '+Number(x.view_count||0).toLocaleString('ar-SA')+' مشاهدة';$('#playerDesc').textContent=x.description||'';$('#playerSource').textContent=x.source?'المصدر: '+x.source:'';$('#playerStage').innerHTML=playerMarkup(x);$('#playerModal').classList.add('show');document.body.classList.add('player-open');setupVipPlayer(x);recordView(x)}
window.showDetails=id=>{const x=all.find(v=>Number(v.id)===Number(id));if(!x)return;selectedTitle=x;$('#detailsTitle').textContent=x.title||'';$('#detailsMeta').textContent=(x.genre||'')+' • '+(x.year||'')+'  |  '+(x.license||'الترخيص غير المحدد');$('#detailsDesc').textContent=x.description||'لا يوجد وصف متاح لهذا العنوان.';$('#detailsSource').textContent=x.source?'المصدر: '+x.source:'';$('#detailsBackdrop').style.backgroundImage=x.poster&&/^https?:\/\//i.test(String(x.poster))?'linear-gradient(0deg,#090c15 5%,transparent 75%),url("'+x.poster+'")':(x.poster||'linear-gradient(145deg,#241348,#111827)');updateFavButton();$('#detailsModal').classList.add('show')}
function updateFavButton(){if(!selectedTitle)return;const b=$('#detailsFav'),saved=isFavorite(selectedTitle.id);b.textContent=saved?'♥ إزالة من قائمتي':'♡ قائمتي';b.classList.toggle('saved',saved)}
window.toggleFavorite=id=>{try{const k=favKey(id);if(isFavorite(id))localStorage.removeItem(k);else localStorage.setItem(k,'1')}catch(_){}updateFavButton();renderAll()}
window.closeDetails=()=>{$('#detailsModal')?.classList.remove('show');selectedTitle=null};
window.closePlayer=()=>{const media=$('#playerStage .site-video');if(media){media.pause();media.removeAttribute('src');media.load()}$('#playerStage').innerHTML='';$('#playerModal').classList.remove('show');document.body.classList.remove('player-open')};
const playerClose=$('#playerClose'),playerModal=$('#playerModal'),detailsModal=$('#detailsModal');if(playerClose)playerClose.onclick=window.closePlayer;if($('#detailsClose'))$('#detailsClose').onclick=window.closeDetails;if(detailsModal)detailsModal.addEventListener('click',e=>{if(e.target===detailsModal)window.closeDetails()});if(playerModal)playerModal.addEventListener('click',e=>{if(e.target===playerModal)window.closePlayer()});if($('#detailsPlay'))$('#detailsPlay').onclick=()=>{if(selectedTitle){const id=selectedTitle.id;window.closeDetails();setTimeout(()=>window.openTitle(id),50)}};if($('#detailsFav'))$('#detailsFav').onclick=()=>selectedTitle&&window.toggleFavorite(selectedTitle.id);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(playerModal?.classList.contains('show'))window.closePlayer();if(detailsModal?.classList.contains('show'))window.closeDetails()}});
const searchModal=$('#searchModal');if(searchModal){$('#searchOpen').onclick=()=>{searchModal.classList.add('show');$('#searchInput').focus()};$('#searchClose').onclick=()=>searchModal.classList.remove('show');$('#searchInput').oninput=e=>{const q=e.target.value.trim().toLowerCase();const results=q?all.filter(x=>(String(x.title||'')+' '+String(x.genre||'')+' '+String(x.tag||'')).toLowerCase().includes(q)):[];$('#searchResults').innerHTML=q?(results.length?'<div class="search-count">'+results.length+' نتيجة</div>'+results.map(x=>card(x,true)).join(''):'<p class="muted">لم نجد عنواناً مطابقاً.</p>'):'<p class="muted">ابدأ بكتابة اسم فيلم أو مسلسل أو نوع.</p>'}};
document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const f = btn.dataset.filter;
  const items = f === 'all'
    ? [...all].sort((x,y) => Number(y.year || 0) - Number(x.year || 0)).slice(0,8)
    : all.filter(x => x.type === f);
  render('#latestGrid', items);
}));
async function setupAccountButton(){const btn=$('#accountBtn');if(!btn||!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return;try{const client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});const {data:{session}}=await client.auth.getSession();updateAccountButton(btn,session);client.auth.onAuthStateChange((_event,newSession)=>updateAccountButton(btn,newSession))}catch(_){}}
function updateAccountButton(btn,session){btn.textContent=session?'👤 حسابي':'👤 تسجيل الدخول';btn.href='login.html';btn.classList.toggle('logged-in',!!session)}
renderAll();setupAccountButton();loadContent();