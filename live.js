(()=>{'use strict';
const qs=s=>document.querySelector(s);
let client=null,channels=[],matches=[],selected=null;
const stateName=s=>({scheduled:'قادمة',live:'مباشر',halftime:'استراحة',finished:'انتهت',postponed:'مؤجلة'}[s]||s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function categoryName(x){return({general:'عام',news:'أخبار',sports:'رياضة',entertainment:'ترفيه',kids:'أطفال',religious:'ديني',other:'أخرى'}[x]||'أخرى')}
function channelCard(x){
 const b=document.createElement('button');b.type='button';b.className='live-channel'+(selected&&selected.id===x.id?' active':'');b.onclick=()=>selectChannel(x.id);
 const logo=document.createElement('img');logo.className='live-logo';logo.alt='';logo.src=x.logo_url||'';logo.onerror=()=>{logo.remove();const s=document.createElement('span');s.className='live-logo';s.textContent='TV';b.prepend(s)};
 const info=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=x.name;small.textContent=categoryName(x.category)+(x.language?' • '+x.language:'');info.append(strong,small);
 const st=document.createElement('span');st.className='live-status '+(x.is_live?'':'off');st.textContent=x.is_live?'LIVE':'متاح';b.append(logo,info,st);return b;
}
function setPlayer(x){
 const p=qs('#livePlayer');p.replaceChildren();
 if(!x){p.innerHTML='<div class="live-empty">اختر قناة من القائمة لبدء المشاهدة.</div>';qs('#selectedChannel').textContent='لا توجد قناة محددة';return}
 qs('#selectedChannel').textContent=x.name;
 if(x.embed_url){const f=document.createElement('iframe');f.src=x.embed_url;f.title=x.name;f.allow='autoplay; fullscreen; picture-in-picture';f.allowFullscreen=true;p.appendChild(f)}
 else if(x.stream_url){const v=document.createElement('video');v.controls=true.playsInline=true.autoplay=true.src=x.stream_url;p.appendChild(v)}
 else p.innerHTML='<div class="live-empty">هذه القناة منشورة بدون رابط تشغيل حالياً.</div>';
}
function selectChannel(id){selected=channels.find(x=>Number(x.id)===Number(id))||null;setPlayer(selected);drawChannels()}
function statBar(a,b){const total=Math.max(1,Number(a||0)+Number(b||0));return '<div class="stat-line"><b>'+Number(a||0)+'%</b><div><span style="width:'+Math.min(100,Number(a||0)/total*100)+'%"></span></div><b>'+Number(b||0)+'%</b></div>'}
function matchCard(x){
 const c=document.createElement('article');c.className='match-card';
 const home=Number(x.home_score||0),away=Number(x.away_score||0);
 c.innerHTML='<div class="match-head"><span>'+esc(x.league||'مباراة')+'</span><span class="match-state '+(x.status==='live'?'live':'')+'">'+stateName(x.status)+(x.status==='live'&&x.minute!=null?' • '+Number(x.minute)+'′':'')+'</span></div><div class="match-teams"><div><img class="team-logo" src="'+esc(x.home_logo||'')+'" alt=""><div class="team-name">'+esc(x.home_team)+'</div></div><div><div class="score">'+home+' - '+away+'</div><div class="match-meta">'+esc(x.venue||'')+'</div></div><div><img class="team-logo" src="'+esc(x.away_logo||'')+'" alt=""><div class="team-name">'+esc(x.away_team)+'</div></div></div>'+statBar(x.possession_home,x.possession_away)+'<div class="match-meta">تسديدات '+Number(x.shots_home||0)+' / '+Number(x.shots_away||0)+' • على المرمى '+Number(x.shots_on_target_home||0)+' / '+Number(x.shots_on_target_away||0)+' • ركنيات '+Number(x.corners_home||0)+' / '+Number(x.corners_away||0)+'</div>';
 c.onclick=()=>openMatch(x);return c;
}
function openMatch(x){const p=qs('#livePlayer');if(x.embed_url||x.stream_url){setPlayer({id:'m'+x.id,name:x.home_team+' × '+x.away_team,embed_url:x.embed_url,stream_url:x.stream_url});}window.scrollTo({top:0,behavior:'smooth'})}
function drawChannels(){const el=qs('#channelList');el.replaceChildren(...channels.map(channelCard));if(!selected&&channels[0])selectChannel(channels[0].id)}
function drawMatches(){const el=qs('#matchGrid');el.replaceChildren(...matches.map(matchCard));qs('#matchCount').textContent=String(matches.length)}
async function load(){
 if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY){qs('#liveMessage').textContent='إعداد Supabase غير متوفر.';return}
 client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
 const [c,m]=await Promise.all([client.from('vip_live_channels').select('*').eq('published',true).order('sort_order').order('name'),client.from('vip_live_matches').select('*').eq('published',true).order('start_time',{ascending:true})]);
 if(c.error||m.error){qs('#liveMessage').textContent='تعذر تحميل مركز البث حالياً.';return}
 channels=c.data||[];matches=m.data||[];drawChannels();drawMatches();
}
load();
})();