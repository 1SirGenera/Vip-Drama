const $=s=>document.querySelector(s);
let items=[],client=null;
const fields=['title','type','year','genre','rating','tag','description','videoUrl','embedUrl','watchUrl','license','source','licenseUrl','rightsHolder','territories','published','poster'];
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
async function init(){
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return fail('إعداد Supabase غير متوفر.');
  client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  const {data:{session}}=await client.auth.getSession();
  if(!session)return fail('يجب تسجيل الدخول أولاً للوصول إلى لوحة الإدارة.');
  const {data:admin,error}=await client.from('vip_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
  if(error)return fail('تعذر التحقق من صلاحيات المدير: '+error.message);
  if(!admin)return fail('هذا الحساب ليس مديراً.');
  await load();
}
async function load(){
  const {data,error}=await client.from('vip_content').select('*').order('created_at',{ascending:false});
  if(error)return fail('تعذر تحميل المحتوى: '+error.message);
  items=(data||[]).map(x=>({...x,watchUrl:x.watch_url,videoUrl:x.video_url,embedUrl:x.embed_url,licenseUrl:x.license_url,rightsHolder:x.rights_holder,territories:x.territories,published:x.published !== false}));
  refresh();
}
function typeName(t){return t==='movie'?'فيلم':t==='series'?'مسلسل':'أنمي / رسوم';}
function refresh(){
  $('#count').textContent=items.length;
  $('#movies').textContent=items.filter(x=>x.type==='movie').length;
  $('#others').textContent=items.filter(x=>x.type!=='movie').length;
  $('#views').textContent=items.reduce((sum,x)=>sum+Number(x.view_count||0),0).toLocaleString('ar-SA');
  $('#rows').innerHTML=items.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+typeName(x.type)+'</td><td>'+esc(x.year||'')+'</td><td>👁 '+Number(x.view_count||0).toLocaleString('ar-SA')+'</td><td><div class="actions"><button class="btn small ghost" onclick="editItem('+Number(x.id)+')">تعديل</button><button class="btn small danger" onclick="removeItem('+Number(x.id)+')">حذف</button></div></td></tr>').join('')||'<tr><td colspan="5" class="muted">لا توجد عناوين في قاعدة البيانات.</td></tr>';
}
function fail(msg){const rows=$('#rows');if(rows)rows.innerHTML='<tr><td colspan="5">'+esc(msg)+'</td></tr>';const n=document.querySelector('.notice');if(n)n.textContent=msg;}
function setForm(x){
  $('#itemId').value=x?.id||'';
  fields.forEach(k=>{const el=$('#'+k);if(el)el.value=x?.[k]??'';});
  $('#formTitle').textContent=x?'تعديل عنوان':'إضافة عنوان';
  $('#saveBtn').textContent=x?'حفظ التعديلات':'إضافة';
  $('#cancelEdit').classList.toggle('hidden',!x);
  $('#authorized').checked=false;
  window.scrollTo({top:0,behavior:'smooth'});
}
window.editItem=id=>{const x=items.find(v=>Number(v.id)===Number(id));if(x)setForm(x);};
window.removeItem=async id=>{
  if(!confirm('هل تريد حذف هذا العنوان نهائياً؟'))return;
  const {error}=await client.from('vip_content').delete().eq('id',id);
  if(error)return alert('تعذر الحذف: '+error.message);
  if(Number($('#itemId').value)===Number(id))setForm(null);
  await load();
};
$('#cancelEdit').onclick=()=>setForm(null);
$('#form').onsubmit=async e=>{
  e.preventDefault();
  const payload={title:$('#title').value.trim(),type:$('#type').value,year:Number($('#year').value)||null,genre:$('#genre').value.trim(),rating:Number($('#rating').value)||0,tag:$('#tag').value.trim()||'جديد',description:$('#description').value.trim(),video_url:$('#videoUrl').value.trim()||null,embed_url:$('#embedUrl').value.trim()||null,watch_url:$('#watchUrl').value.trim()||null,license:$('#license').value.trim()||null,source:$('#source').value.trim()||null,license_url:$('#licenseUrl').value.trim()||null,rights_holder:$('#rightsHolder').value.trim()||null,territories:$('#territories').value.trim()||'Worldwide',published:$('#published').checked,poster:$('#poster').value.trim()||'linear-gradient(145deg,#312e81,#db2777)'};
  const id=Number($('#itemId').value||0);
  const result=id?await client.from('vip_content').update(payload).eq('id',id):await client.from('vip_content').insert(payload);
  if(result.error)return alert('تعذر حفظ البيانات: '+result.error.message);
  setForm(null);await load();
};
init();