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
    const base=localByTitle.get(String(row.title||'').trim().toLowerCase())||{};
    return {...base,...row,
      id:row.id??base.id,
      type:normalizeType(row.type)||normalizeType(base.type)||'movie',
      watchUrl:normalizeUrl(row.watch_url)||normalizeUrl(row.watchUrl)||normalizeUrl(base.watchUrl),
      videoUrl:normalizeUrl(row.video_url)||normalizeUrl(row.videoUrl)||normalizeUrl(base.videoUrl),
      embedUrl:normalizeUrl(row.embed_url)||normalizeUrl(row.embedUrl)||normalizeUrl(base.embedUrl),
      poster:normalizeUrl(row.poster)||base.poster||'linear-gradient(145deg,#171326,#111827)',
      description:row.description||base.description||'',
      license:row.license||base.license||'',
      source:row.source||base.source||''
    };
  });
  const dbTitles=new Set(merged.map(x=>String(x.title||'').trim().toLowerCase()));
  return [...merged,...all.filter(x=>!dbTitles.has(String(x.title||'').trim().toLowerCase()))];
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
  }catch(_){}
}
function mediaType(url){
  const u=String(url||'').toLowerCase().split('?')[0];
  if(u.endsWith('.webm'))return 'video/webm';
  if(u.endsWith('.ogv')||u.endsWith('.ogg'))return 'video/ogg';
  if(u.endsWith('.mp4')||u.includes('video.blender.org/download/videos/')||u.includes('video.blender.org/static/webseed/'))return 'video/mp4';
  return '';
}
function blenderEmbedFromUrl(url){
  const m=String(url||'').match(/video\.blender\.org\/(?:static\/webseed|download\/videos)\/([0-9a-f-]{36})(?:-[0-9]+)?\.mp4/i);
  return m?'https://video.blender.org/videos/embed/'+m[1]:'';
}
function formatTime(sec){
  if(!Number.isFinite(sec)||sec<0)return '00:00';
  const s=Math.floor(sec),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60;
  return (h?h.toString().padStart(2,'0')+':':'')+m.toString().padStart(2,'0')+':'+r.toString().padStart(2,'0');
}
function playerMarkup(x){
  const video=normalizeUrl(x.videoUrl),embed=normalizeUrl(x.embedUrl);
  if(video){
    const type=mediaType(video);
    return '<div class="vip-player"><video id="vipVideo" class="site-video" playsinline preload="metadata"'+(type?' type="'+esc(type)+'"':'')+'><source src="'+esc(video)+'"'+(type?' type="'+esc(type)+'"':'')+'><p>المتصفح لا يدعم تشغيل الفيديو.</p></video><div class="vip-controls"><button type="button" data-act="play">▶</button><button type="button" data-act="back">↶ 10</button><button type="button" data-act="forward">10 ↷</button><input data-act="progress" class="vip-progress" type="range" min="0" max="1000" value="0" aria-label="التقدم"><span data-time>00:00 / 00:00</span><button type="button" data-act="mute">🔊</button><input data-act="volume" class="vip-volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="مستوى الصوت"><select data-act="speed" class="vip-speed" aria-label="السرعة"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select><button type="button" data-act="zoomout">−</button><span data-zoom>100%</span><button type="button" data-act="zoomin">+</button><button type="button" data-act="fullscreen">⛶</button></div></div>';
  }
  if(embed)return '<iframe class="site-frame" src="'+esc(embed)+'" title="'+esc(x.title)+'" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  return '<div class="player-empty"><div class="player-icon">▶</div><h3>المشاهدة داخل VIP Drama</h3><p>لا يوجد مصدر تشغيل صالح لهذا العنوان حالياً.</p><small>أضف MP4/WebM مباشر أو Embed رسمي من لوحة الإدارة.</small></div>';
}
function fallbackToEmbed(v){
  const embed=blenderEmbedFromUrl(v?.querySelector('source')?.src||v?.currentSrc||v?.src||'');
  if(!embed)return false;
  const stage=$('#playerStage');
  stage.innerHTML='<iframe class="site-frame" src="'+esc(embed)+'" title="مشغل الفيديو الرسمي" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  return true;
}
function setupVipPlayer(x){
  const wrap=$('#playerStage .vip-player'),v=$('#vipVideo');if(!wrap||!v)return;
  let zoom=1;
  const play=wrap.querySelector('[data-act="play"]'),mute=wrap.querySelector('[data-act="mute"]'),vol=wrap.querySelector('[data-act="volume"]'),progress=wrap.querySelector('[data-act="progress"]'),time=wrap.querySelector('[data-time]'),speed=wrap.querySelector('[data-act="speed"]'),z=wrap.querySelector('[data-zoom]');
  const resumeKey='vip-resume-'+x.id;
  const setPlay=()=>play.textContent=v.paused?'▶':'❚❚';
  const sync=()=>{const d=v.duration||0;progress.value=d?Math.round((v.currentTime/d)*1000):0;time.textContent=formatTime(v.currentTime)+' / '+formatTime(d);};
  play.onclick=()=>v.paused?v.play().catch(()=>{}):v.pause();
  wrap.querySelector('[data-act="back"]').onclick=()=>v.currentTime=Math.max(0,v.currentTime-10);
  wrap.querySelector('[data-act="forward"]').onclick=()=>v.currentTime=Math.min(v.duration||Infinity,v.currentTime+10);
  mute.onclick=()=>{v.muted=!v.muted;mute.textContent=v.muted?'🔇':'🔊';};
  vol.oninput=()=>{v.volume=Number(vol.value);v.muted=v.volume===0;mute.textContent=v.muted?'🔇':'🔊';};
  progress.oninput=()=>{if(v.duration)v.currentTime=(Number(progress.value)/1000)*v.duration;};
  speed.onchange=()=>{v.playbackRate=Number(speed.value);};
  const applyZoom=()=>{v.style.transform='scale('+zoom+')';z.textContent=Math.round(zoom*100)+'%';};
  wrap.querySelector('[data-act="zoomout"]').onclick=()=>{zoom=Math.max(.8,Math.round((zoom-.1)*10)/10);applyZoom();};
  wrap.querySelector('[data-act="zoomin"]').onclick=()=>{zoom=Math.min(1.6,Math.round((zoom+.1)*10)/10);applyZoom();};
  wrap.querySelector('[data-act="fullscreen"]').onclick=()=>document.fullscreenElement?document.exitFullscreen?.():wrap.requestFullscreen?.();
  v.addEventListener('loadedmetadata',()=>{
    const saved=Number(localStorage.getItem(resumeKey)||0);
    if(saved>10&&saved<v.duration-5){try{v.currentTime=saved;}catch(_){}}
    sync();
  });
  v.addEventListener('timeupdate',()=>{
    sync();
    if(v.currentTime>10&&!v.ended)localStorage.setItem(resumeKey,String(Math.floor(v.currentTime)));
  });
  v.addEventListener('play',setPlay);v.addEventListener('pause',setPlay);
  v.addEventListener('ended',()=>localStorage.removeItem(resumeKey));
  const src=v.querySelector('source')?.src||'',type=v.querySelector('source')?.type||mediaType(src);
  if(v.canPlayType(type||'video/mp4')==='')fallbackToEmbed(v);
  v.addEventListener('error',()=>{
    if(!fallbackToEmbed(v)){
      $('#playerStage').innerHTML='<div class="player-empty"><div class="player-icon">!</div><h3>تعذر تشغيل الفيديو</h3><p>تعذر تحميل مصدر الفيديو الحالي.</p><small>جرّب رابطاً آخر من لوحة الإدارة.</small></div>';
    }
  },{once:true});
  applyZoom();setPlay();sync();
}
async function recordView(x){
  if(!vipClient||!x?.id)return;
  const key='vip-view-'+x.id,now=Date.now(),last=Number(localStorage.getItem(key)||0);
  if(last&&now-last<86400000)return;
  try{
    const {data,error}=await vipClient.rpc('record_view',{p_content_id:x.id});
    if(!error){
      localStorage.setItem(key,String(now));
      const updated=all.find(v=>Number(v.id)===Number(x.id));if(updated)updated.view_count=Number(data||0);
      renderAll();
      const meta=$('#playerMeta');if(meta)meta.textContent=(x.genre||'')+' • '+(x.year||'')+'  |  '+(x.license||'الترخيص غير المحدد')+'  |  👁 '+Number(data||0).toLocaleString('ar-SA')+' مشاهدة';
    }
  }catch(_){}
}
window.openTitle=id=>{
  const x=all.find(v=>Number(v.id)===Number(id));if(!x)return;
  $('#playerTitle').textContent=x.title||'';
  $('#playerMeta').textContent=(x.genre||'')+' • '+(x.year||'')+'  |  '+(x.license||'الترخيص غير المحدد')+'  |  👁 '+Number(x.view_count||0).toLocaleString('ar-SA')+' مشاهدة';
  $('#playerDesc').textContent=x.description||'';
  $('#playerSource').textContent=x.source?'المصدر: '+x.source:'';
  $('#playerStage').innerHTML=playerMarkup(x);$('#playerModal').classList.add('show');document.body.classList.add('player-open');
  setupVipPlayer(x);const media=$('#playerStage .site-video');if(media)media.play().catch(()=>{});recordView(x);
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
  $('#searchInput').oninput=e=>{
    const q=e.target.value.trim().toLowerCase();
    $('#searchResults').innerHTML=q?all.filter(x=>String(x.title||'').toLowerCase().includes(q)||String(x.genre||'').toLowerCase().includes(q)).map(card).join(''):'<p class="muted">ابدأ بكتابة اسم العنوان أو النوع.</p>';
  };
}
async function setupAccountButton(){
  const btn=$('#accountBtn');if(!btn||!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return;
  try{
    const client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
    const {data:{session}}=await client.auth.getSession();updateAccountButton(btn,session);
    client.auth.onAuthStateChange((_event,newSession)=>updateAccountButton(btn,newSession));
  }catch(_){}
}
function updateAccountButton(btn,session){btn.textContent=session?'👤 حسابي':'👤 تسجيل الدخول';btn.href='login.html';btn.classList.toggle('logged-in',!!session);}
renderAll();setupAccountButton();loadContent();