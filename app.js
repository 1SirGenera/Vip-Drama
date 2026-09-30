const $=s=>document.querySelector(s);
function card(x){return `<article class="card"><div class="poster" style="background:${x.poster}"><span class="tag">${x.tag}</span><span class="rating">★ ${x.rating}</span><div class="poster-title">${x.title}</div></div><div class="card-info"><div><h3>${x.title}</h3><p>${x.genre} • ${x.year}</p></div><button class="play" onclick="openTitle(${x.id})">▶</button></div></article>`}
function render(id,items){$(id).innerHTML=items.map(card).join('')}
let all=window.VIP_CONTENT.slice();
let vipClient=null;
async function loadContent(){
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return;
  vipClient=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  const {data,error}=await vipClient.from('vip_content').select('*').order('created_at',{ascending:false});
  if(!error&&Array.isArray(data)&&data.length){
    all=data.map(x=>({...x,watchUrl:x.watch_url,videoUrl:x.video_url,embedUrl:x.embed_url}));
    render('#latestGrid',all.slice(0,6)); render('#moviesGrid',all.filter(x=>x.type==='movie')); render('#seriesGrid',all.filter(x=>x.type==='series')); render('#animeGrid',all.filter(x=>x.type==='anime'));
  }
}
render('#latestGrid',all.slice(0,6)); render('#moviesGrid',all.filter(x=>x.type==='movie')); render('#seriesGrid',all.filter(x=>x.type==='series')); render('#animeGrid',all.filter(x=>x.type==='anime'));

function playerMarkup(x){
  if(x.videoUrl)return `<video class="site-video" controls autoplay playsinline preload="metadata" poster="" src="${x.videoUrl}"></video>`;
  if(x.embedUrl)return `<iframe class="site-frame" src="${x.embedUrl}" title="${x.title}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  return `<div class="player-empty"><div class="player-icon">▶</div><h3>المشاهدة داخل VIP Drama</h3><p>هذا العنوان لا يملك حالياً رابط فيديو مباشر أو تضميناً رسمياً يمكن تشغيله داخل الموقع. لن يتم تحويل المشاهد إلى موقع آخر.</p><small>أضف videoUrl أو embedUrl من لوحة الإدارة للمحتوى الذي تملك حق عرضه.</small></div>`;
}
window.openTitle=id=>{
  const x=all.find(v=>v.id===id); if(!x)return;
  $('#playerTitle').textContent=x.title;
  $('#playerMeta').textContent=`${x.genre} • ${x.year}  |  ${x.license||'الترخيص غير محدد'}`;
  $('#playerDesc').textContent=x.description||'';
  $('#playerSource').textContent=x.source?\`المصدر: ${x.source}\`:'';
  $('#playerStage').innerHTML=playerMarkup(x);
  $('#playerModal').classList.add('show');
  document.body.classList.add('player-open');
  const media=$('#playerStage .site-video'); if(media)media.focus();
};
window.closePlayer=()=>{
  const media=$('#playerStage .site-video'); if(media){media.pause();media.removeAttribute('src');media.load();}
  $('#playerStage').innerHTML='';
  $('#playerModal').classList.remove('show');
  document.body.classList.remove('player-open');
};
$('#playerClose').onclick=window.closePlayer;
$('#playerModal').addEventListener('click',e=>{if(e.target.id==='playerModal')window.closePlayer()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#playerModal').classList.contains('show'))window.closePlayer()});

const modal=$('#searchModal');$('#searchOpen').onclick=()=>{modal.classList.add('show');$('#searchInput').focus()};$('#searchClose').onclick=()=>modal.classList.remove('show');
$('#searchInput').oninput=e=>{const q=e.target.value.trim().toLowerCase();$('#searchResults').innerHTML=q?all.filter(x=>x.title.toLowerCase().includes(q)||x.genre.includes(q)).map(card).join(''):'<p class="muted">ابدأ بكتابة اسم العنوان أو النوع.</p>'};
async function setupAccountButton(){const btn=$('#accountBtn');if(!btn||!window.supabase||!window.SUPABASE_URL||window.SUPABASE_URL.includes('YOUR-PROJECT'))return;const client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});const {data:{session}}=await client.auth.getSession();updateAccountButton(btn,session);client.auth.onAuthStateChange((_event,newSession)=>updateAccountButton(btn,newSession))}
function updateAccountButton(btn,session){if(session){btn.textContent='👤 حسابي';btn.href='login.html';btn.classList.add('logged-in')}else{btn.textContent='👤 تسجيل الدخول';btn.href='login.html';btn.classList.remove('logged-in')}}
setupAccountButton();
loadContent();