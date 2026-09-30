const $=s=>document.querySelector(s);
let items=[];
let client=null;
async function init(){
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY){return fail('إعداد Supabase غير متوفر.');}
  client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  const {data:{session}}=await client.auth.getSession();
  if(!session)return fail('يجب تسجيل الدخول أولاً للوصول إلى لوحة الإدارة.');
  const {data:admin,error:adminError}=await client.from('vip_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
  if(adminError)return fail('لم يتم إعداد جدول المديرين في Supabase بعد. نفّذ ملف supabase/schema.sql ثم أضف حسابك كمدير.');
  if(!admin)return fail('هذا الحساب ليس مديراً. أضف user_id الخاص بحسابك إلى جدول vip_admins من Supabase.');
  await load();
}
async function load(){
  const {data,error}=await client.from('vip_content').select('*').order('created_at',{ascending:false});
  if(error)return fail('تعذر تحميل المحتوى: '+error.message);
  items=(data||[]).map(x=>({...x,id:x.id,watchUrl:x.watch_url,videoUrl:x.video_url,embedUrl:x.embed_url}));
  refresh();
}
function refresh(){
  $('#count').textContent=items.length;
  $('#movies').textContent=items.filter(x=>x.type==='movie').length;
  $('#others').textContent=items.filter(x=>x.type!=='movie').length;
  $('#rows').innerHTML=items.map(x=>`<tr><td>${escapeHtml(x.title)}</td><td>${x.type==='movie'?'فيلم':x.type==='series'?'مسلسل':'أنمي'}</td><td>${x.year||''}</td><td><button class="btn danger" onclick="removeItem(${x.id})">حذف</button></td></tr>`).join('');
}
function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function fail(msg){$('#rows').innerHTML=`<tr><td colspan="4">${escapeHtml(msg)}</td></tr>`;const n=document.querySelector('.notice');if(n)n.textContent=msg;}
window.removeItem=async id=>{
  if(!confirm('هل تريد حذف هذا العنوان؟'))return;
  const {error}=await client.from('vip_content').delete().eq('id',id);
  if(error)return alert('تعذر الحذف: '+error.message);
  await load();
};
$('#form').onsubmit=async e=>{
  e.preventDefault();
  const payload={title:title.value.trim(),type:type.value,year:+year.value,genre:genre.value.trim(),rating:+rating.value,tag:'جديد',description:description.value.trim(),poster:'linear-gradient(145deg,#312e81,#db2777)',video_url:videoUrl.value.trim()||null,embed_url:embedUrl.value.trim()||null,license:license.value.trim()||null,source:source.value.trim()||null};
  const {error}=await client.from('vip_content').insert(payload);
  if(error)return alert('تعذر حفظ المحتوى: '+error.message);
  e.target.reset();await load();
};
init();