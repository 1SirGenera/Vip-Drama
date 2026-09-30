const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const normalizeType=value=>{
  const t=String(value||'').trim().toLowerCase();
  if(['movie','movies','film','films','فيلم','أفلام'].includes(t))return 'movie';
  if(['series','serie','tv','show','shows','مسلسل','مسلسلات'].includes(t))return 'series';
  if(['anime','animation','cartoon','أنمي','انمي','رسوم متحركة'].includes(t))return 'anime';
  return '';
};
const normalizeUrl=v=>String(v||'').trim();
function card(x){
  return '<article class="card"><div class="poster" style="background:'+esc(x.poster||'linear-gradient(145deg,#171326,#111827)')+'"><span class="tag">'+esc(x.tag||'جديد')+'</span><span class="rating">★ '+esc(x.rating??0)+'</span><div class="poster-title">'+esc(x.title)+'</div></div><div class="card-info"><div><h3>'+esc(x.title)+'</h3><p>'+esc(x.genre||'')+' • '+esc(x.year||'')+'</p><span class="view-count">👁 '+Number(x.view_count||0).toLocaleString('ar-SA')+' مشاهدة</span></div><button class="play" onclick="openTitle('+Number(x.id)+')">▶</button></div></article>';
}
function render(id,items){const el=$(id);if(el)el.innerHTML=items.map(card).join('')||'<p class="muted">لا يوجد محتوى في هذا القسم حالياً.</p>';}

let all=Array.isArray(window.VIP_CONTENT)?window.VIP_CONTENT.slice():[];
let vipClient=null;

function mergeContent(dbRows){
  const localByTitle=new Map(all.map(x=>[String(x.title||'').trim().toLowerCase(),x]));
  const merged=(dbRows||[]).map(row=>{
    const key=String(row.title||'').trim().toLowerCase();
    const base=localByTitle.get(key)||{};
    return {
      ...base,...row,
      id:row.id??base.id,
      type:normalizeType(row.type)||normalizeType(base.type)||'movie',
      watchUrl:normalizeUrl(base.watchUrl)||normalizeUrl(row.watch_url)||normalizeUrl(row.watchUrl),
      videoUrl:normalizeUrl(base.videoUrl)||normalizeUrl(row.video_url)||normalizeUrl(row.videoUrl),
      embedUrl:normalizeUrl(base.embedUrl)||normalizeUrl(row.embed_url)||normalizeUrl(row.embedUrl),
      poster:base.poster||row.poster||'linear-gradient(145deg,#171326,#111827)',
      description:base.description||row.description||'',
      license:base.license||row.license||'',
      source:base.source||row.source||''
    };
  });
  const dbTitles=new Set(merged.map(x=>String(x.title||'').trim().toLowerCase()));
  const localOnly=all.filter(x=>!dbTitles.has(String(x.title||'').trim().toLowerCase()));
  return [...merged,...localOnly];
}

function renderAll(){
  all=all.map(x=>({...x,type:normalizeType(x.type)||'movie'}));
  render('#latestGrid',all.slice(0,6));
  render('#moviesGrid',all.filter(x=>x.type==='movie'));
  render('#seriesGrid',all.filter(x=>x.type==='series'));
  render('#animeGrid',all.filter(x=>x.type==='anime'));
}

async function loadContent(){
  renderAll();
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return;
  try{
    vipClient=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
    const {data,error}=await vipClient.from('vip_content').select('*').order('created_at',{ascending:false});
    if(!error&&Array.isArray(data)&&data.length){all=mergeContent(data);renderAll();}
  }catch(_){/* keep local catalog working if Supabase is unavailable */}
}

function playerMarkup(x){
  const video=normalizeUrl(x.videoUrl);
  const embed=normalizeUrl(x.embedUrl);
  if(video)return '<div class="vip-player"><video id="vipVideo" class="site-video" playsinline preload="metadata" src="'+esc(video)+'"><p>المتصفح لا يدعم تشغيل الفيديو.</p></video><div class="vip-controls"><button type="button" data-act="play" title="تشغيل/إيقاف">▶</button><button type="button" data-act="back" title="رجوع 10 ثوانٍ">↶ 10</button><button type="button" data-act="forward" title="تقديم 10 ثوانٍ">10 ↷</button><button type="button" data-act="mute" title="كتم الصوت">🔊</button><input data-act="volume" class="vip-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="مستوى الصوت"><button type="button" data-act="zoomout" title="تصغير">−</button><span data-zoom>100%</span><button type="button" data-act="zoomin" title="تكبير">+</button><button type="button" data-act="fullscreen" title="ملء الشاشة">⛶</button></div></div>';
  if(embed)return '<iframe class="site-frame" src="'+esc(embed)+'" title="'+esc(x.title)+'" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  return '<div class="player-empty"><div class="player-icon">▶</div><h3>المشاهدة داخل VIP Drama</h3><p>لا يوجد حالياً رابط فيديو مباشر أو تضمين رسمي صالح لهذا العنوان.</p><small>من لوحة الإدارة أضف رابط MP4/WebM مباشر أو رابط Embed رسمي للمحتوى الذي تملك حق عرضه.</small></div>';
}
function blenderEmbedFromUrl(url){
  const m=String(url||'').match(/video\.blender\.org\/(?:static\/webseed|download\/videos)\/([0-9a-f-]{36})-[0-9]+\.mp4/i);
  return m?'https://video.blender.org/videos/embed/'+m[1]:'';
}
function fallbackToEmbed(v){
  const url=v?.currentSrc||v?.src||'';
  const embed=blenderEmbedFromUrl(url);
  if(!embed)return false;
  const stage=$('#playerStage');
  stage.innerHTML='<iframe class="site-frame" src="'+esc(embed)+'" title="مشغل الفيديو الرسمي" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  return true;
}
function setupVipPlayer(){
  const wrap=$('#playerStage .vip-player'),v=$('#vipVideo');if(!wrap||!v)return;
  let zoom=1;
  const play=wrap.querySelector('[data-act="play"]'),mute=wrap.querySelector('[data-act="mute"]'),vol=wrap.querySelector('[data-act="volume"]'),z=wrap.querySelector('[data-zoom]');
  const setPlay=()=>{play.textContent=v.paused?'▶':'❚❚';};
  play.onclick=()=>{if(v.paused)v.play().catch(()=>{});else v.pause();};
  v.addEventListener('play',setPlay);v.addEventListener('pause',setPlay);setPlay();
  wrap.querySelector('[data-act="back"]').onclick=()=>{v.currentTime=Math.max(0,v.currentTime-10)};
  wrap.querySelector('[data-act="forward"]').onclick=()=>{v.currentTime=Math.min(v.duration||Infinity,v.currentTime+10)};
  mute.onclick=()=>{v.muted=!v.muted;mute.textContent=v.muted?'🔇':'🔊';};
  vol.oninput=()=>{v.volume=Number(vol.value);v.muted=v.volume===0;mute.textContent=v.muted?'🔇':'🔊';};
  const applyZoom=()=>{v.style.transform='scale('+zoom+')';z.textContent=Math.round(zoom*100)+'%';};
  wrap.querySelector('[data-act="zoomout"]').onclick=()=>{zoom=Math.max(.8,Math.round((zoom-.1)*10)/10);applyZoom();};
  wrap.querySelector('[data-act="zoomin"]').onclick=()=>{zoom=Math.min(1.5,Math.round((zoom+.1)*10)/10);applyZoom();};
  wrap.querySelector('[data-act="fullscreen"]').onclick=()=>{const target=wrap;if(document.fullscreenElement)document.exitFullscreen?.();else target.requestFullscreen?.();};
  applyZoom();
  const preferred=v.canPlayType('video/mp4');
  if(!preferred && blenderEmbedFromUrl(v.currentSrc||v.src)) fallbackToEmbed(v);
  v.addEventListener('error',()=>{fallbackToEmbed(v);},{once:true});
}

async function recordView(x){
  if(!vipClient||!x?.id)return;
  const key='vip-view-'+x.id,now=Date.now(),last=Number(localStorage.getItem(key)||0);
  if(last&&now-last<86400000)return;
  try{
    const {data,error}=await vipClient.rpc('record_view',{p_content_id:x.id});
    if(!error){
      localStorage.setItem(key,String(now));
      const updated=all.find(v=>Number(v.id)===Number(x.id));
      if(updated)updated.view_count=Number(data||0);
      renderAll();
      const meta=$('#playerMeta');
      if(meta)meta.textContent=(x.genre||'')+' • '+(x.year||'')+'  |  '+(x.license||'الترخيص غير المحدد')+'  |  👁 '+Number(data||0).toLocaleString('ar-SA')+' مشاهدة';
    }
  }catch(_){}
}

window.openTitle=id=>{
  const x=all.find(v=>Number(v.id)===Number(id));if(!x)return;
  $('#playerTitle').textContent=x.title||'';
  $('#playerMeta').textContent=(x.genre||'')+' • '+(x.year||'')+'  |  '+(x.license||'الترخيص غير المحدد')+'  |  👁 '+Number(x.view_count||0).toLocaleString('ar-SA')+' مشاهدة';
  $('#playerDesc').textContent=x.description||'';
  $('#playerSource').textContent=x.source?'المصدر: '+x.source:'';
  $('#playerStage').innerHTML=playerMarkup(x);
  $('#playerModal').classList.add('show');
  document.body.classList.add('player-open');
  setupVipPlayer();
  const media=$('#playerStage .site-video');
  if(media){
    media.addEventListener('error',()=>{const stage=$('#playerStage');stage.innerHTML='<div class="player-empty"><div class="player-icon">!</div><h3>تعذر تشغيل الفيديو</h3><p>الرابط المباشر لم يعد متاحاً أو لا يدعم التشغيل من المتصفح.</p><small>يمكن للمدير استبداله من لوحة الإدارة برابط MP4/WebM صالح.</small></div>';},{once:true});
    media.play().catch(()=>{});
  }
  recordView(x);
};
window.closePlayer=()=>{
  const media=$('#playerStage .site-video');
  if(media){media.pause();media.removeAttribute('src');media.load();}
  $('#playerStage').innerHTML='';
  $('#playerModal').classList.remove('show');
  document.body.classList.remove('player-open');
};

const playerClose=$('#playerClose'),playerModal=$('#playerModal');
if(playerClose)playerClose.onclick=window.closePlayer;
if(playerModal)playerModal.addEventListener('click',e=>{if(e.target===playerModal)window.closePlayer()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&playerModal?.classList.contains('show'))window.closePlayer()});

const modal=$('#searchModal');
if(modal){
  $('#searchOpen').onclick=()=>{modal.classList.add('show');$('#searchInput').focus()};
  $('#searchClose').onclick=()=>modal.classList.remove('show');
  $('#searchInput').oninput=e=>{
    const q=e.target.value.trim().toLowerCase();
    $('#searchResults').innerHTML=q?all.filter(x=>String(x.title||'').toLowerCase().includes(q)||String(x.genre||'').toLowerCase().includes(q)).map(card).join(''):'<p class="muted">ابدأ بكتابة اسم العنوان أو النوع.</p>';
  };
}

async function setupAccountButton(){
  const btn=$('#accountBtn');
  if(!btn||!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return;
  try{
    const client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
    const {data:{session}}=await client.auth.getSession();
    updateAccountButton(btn,session);
    client.auth.onAuthStateChange((_event,newSession)=>updateAccountButton(btn,newSession));
  }catch(_){}
}
function updateAccountButton(btn,session){
  btn.textContent=session?'👤 حسابي':'👤 تسجيل الدخول';
  btn.href='login.html';
  btn.classList.toggle('logged-in',!!session);
}

renderAll();
setupAccountButton();
loadContent();
