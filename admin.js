const $=s=>document.querySelector(s);
let items=[],client=null,rightsRequests=[],adminRole='';
const fields=['title','type','year','genre','rating','tag','description','videoUrl','embedUrl','watchUrl','license','source','licenseUrl','rightsHolder','territories','originCountry','collection','poster'];
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
async function init(){
 if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return fail('إعداد Supabase غير متوفر.');
 client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
 const {data:{session}}=await client.auth.getSession();
 if(!session)return fail('يجب تسجيل الدخول أولاً للوصول إلى لوحة الإدارة.');
 const {data:admin,error}=await client.from('vip_admins').select('user_id,role').eq('user_id',session.user.id).maybeSingle();
 if(error)return fail('تعذر التحقق من صلاحيات المدير: '+error.message);
 if(!admin)return fail('هذا الحساب ليس مديراً.');
 adminRole=admin.role||'admin';
 applyRoleUi();
 await load();
 if(can('rights')) await loadRightsRequests();
 if(adminRole==='owner') await loadRoles();
}
function can(area){
  const map={
    content:['owner','admin','editor'],
    series:['owner','admin','editor'],
    rights:['owner','admin','moderator'],
    roles:['owner']
  };
  return (map[area]||[]).includes(adminRole);
}
function roleName(role){return ({owner:'مالك المشروع',admin:'مدير',editor:'محرر محتوى',moderator:'مراجع حقوق',analyst:'محلل إحصائيات'})[role]||role||'—';}
function applyRoleUi(){
  document.body.dataset.adminRole=adminRole;
  const badge=$('#adminRoleBadge');if(badge)badge.textContent='رتبتك: '+roleName(adminRole);
  const editor=$('#contentEditor'),series=$('#seriesManager'),rights=$('#rightsManager'),roles=$('#rolesManager');
  if(editor)editor.classList.toggle('hidden',!can('content'));
  if(series)series.classList.toggle('hidden',!can('series'));
  if(rights)rights.classList.toggle('hidden',!can('rights'));
  if(roles)roles.classList.toggle('hidden',!can('roles'));
}
async function loadRoles(){
  const box=$('#roleRows'); if(!box||adminRole!=='owner')return;
  const {data,error}=await client.rpc('admin_list_roles');
  if(error){box.innerHTML='<tr><td colspan="4">'+esc(error.message)+'</td></tr>';return;}
  box.innerHTML=(data||[]).map(x=>'<tr><td>'+esc(x.email||'—')+'</td><td>'+esc(roleName(x.role))+'</td><td><code>'+esc(x.user_id)+'</code></td><td><button class="btn small danger" onclick="removeAdminRole(\''+esc(x.user_id)+'\')">إزالة</button></td></tr>').join('')||'<tr><td colspan="4" class="muted">لا يوجد مديرون.</td></tr>';
}
async function setAdminRole(){
  const email=$('#roleEmail')?.value.trim(),role=$('#roleSelect')?.value;
  if(!email)return alert('اكتب بريد الحساب أولاً.');
  const {error}=await client.rpc('admin_set_role',{p_email:email,p_role:role});
  if(error)return alert('تعذر حفظ الرتبة: '+error.message);
  $('#roleEmail').value='';await loadRoles();alert('تم حفظ الرتبة.');
}
window.removeAdminRole=async id=>{
  if(!confirm('هل تريد إزالة صلاحيات هذا الحساب؟'))return;
  const {error}=await client.rpc('admin_remove_role',{p_user_id:id});
  if(error)return alert('تعذر إزالة الرتبة: '+error.message);
  await loadRoles();
};
async function load(){
 const {data,error}=await client.from('vip_content').select('*').order('created_at',{ascending:false});
 if(error)return fail('تعذر تحميل المحتوى: '+error.message);
 items=(data||[]).map(x=>({...x,watchUrl:x.watch_url,videoUrl:x.video_url,embedUrl:x.embed_url,licenseUrl:x.license_url,rightsHolder:x.rights_holder,territories:x.territories,originCountry:x.origin_country,collection:x.collection,published:x.published!==false}));
 refresh();
}
async function loadRightsRequests(){
  if(!can('rights'))return;
  const {data,error}=await client.from('vip_rights_requests').select('*').order('created_at',{ascending:false});
  if(error){const r=$('#rightsRows');if(r)r.innerHTML='<tr><td colspan="7">'+esc(error.message)+'</td></tr>';return;}
  rightsRequests=data||[];
  renderRightsRequests();
}
function rightsTypeName(t){return ({movie:'فيلم',series:'مسلسل',anime:'أنمي / رسوم',theater:'مسرحية',other:'أخرى'})[t]||t||'—';}
function rightsStatusName(s){return ({pending:'قيد المراجعة',needs_proof:'يحتاج إثبات',verified:'تم التحقق',rejected:'مرفوض'})[s]||s||'—';}
function renderRightsRequests(){
  const r=$('#rightsRows'); if(!r)return;
  r.innerHTML=rightsRequests.map(x=>{
    const proof=x.license_url||x.source_url;
    const cls=x.rights_status==='verified'?'live':'draft';
    const publishBtn=x.rights_status==='verified' ? '<button class="btn small primary" onclick="moveRightsToLibrary('+Number(x.id)+')">إلى المكتبة</button>' : '';
    const requester=x.requester_name||(x.requester_email?x.requester_email:'—');
    return '<tr><td><strong>'+esc(x.title)+'</strong></td><td>'+rightsTypeName(x.content_type)+'</td><td>'+esc(x.collection==='Yemeni Series'?'🇾🇪 مسلسلات يمنية':x.collection==='Yemeni Theater'?'🇾🇪 مسرحيات يمنية':x.collection||'—')+'</td><td><span class="status-pill '+cls+'">'+esc(rightsStatusName(x.rights_status))+'</span></td><td>'+esc(requester)+(x.requester_email&&x.requester_name?'<br><small>'+esc(x.requester_email)+'</small>':'')+'</td><td>'+esc(x.rights_holder||'—')+'</td><td>'+(proof?'<a href="'+esc(proof)+'" target="_blank" rel="noopener">فتح</a>':'—')+'</td><td><div class="actions">'+publishBtn+'<button class="btn small ghost" onclick="editRightsRequest('+Number(x.id)+')">تعديل</button><button class="btn small danger" onclick="removeRightsRequest('+Number(x.id)+')">حذف</button></div></td></tr>';
  }).join('')||'<tr><td colspan="7" class="muted">لا توجد طلبات حقوق حالياً.</td></tr>';
}
function resetRightsForm(){
  $('#rightsRequestId').value='';$('#rightsTitle').value='';$('#rightsType').value='series';$('#rightsYear').value='';$('#rightsOriginCountry').value='';$('#rightsCollection').value='';$('#rightsStatus').value='pending';$('#rightsHolder').value='';$('#rightsTerritories').value='Worldwide';$('#rightsSourceUrl').value='';$('#rightsLicenseUrl').value='';$('#rightsNotes').value='';$('#rightsSave').textContent='إضافة طلب';$('#rightsCancel').classList.add('hidden');
}
function setRightsForm(x){
  $('#rightsRequestId').value=x?.id||'';$('#rightsTitle').value=x?.title||'';$('#rightsType').value=x?.content_type||'series';$('#rightsYear').value=x?.production_year??'';$('#rightsOriginCountry').value=x?.origin_country||'';$('#rightsCollection').value=x?.collection||'';$('#rightsStatus').value=x?.rights_status||'pending';$('#rightsHolder').value=x?.rights_holder||'';$('#rightsTerritories').value=x?.territories||'Worldwide';$('#rightsSourceUrl').value=x?.source_url||'';$('#rightsLicenseUrl').value=x?.license_url||'';$('#rightsNotes').value=x?.notes||'';$('#rightsSave').textContent='حفظ التعديلات';$('#rightsCancel').classList.remove('hidden');document.querySelector('#rightsManager')?.scrollIntoView({behavior:'smooth'});
}
window.editRightsRequest=id=>{const x=rightsRequests.find(v=>Number(v.id)===Number(id));if(x)setRightsForm(x)};
window.moveRightsToLibrary=async id=>{
  const x=rightsRequests.find(v=>Number(v.id)===Number(id));
  if(!x||x.rights_status!=='verified')return alert('يجب التحقق من الحقوق أولاً.');
  if(!x.license_url&&!x.source_url)return alert('أضف رابط الترخيص أو مصدر الحقوق أولاً.');
  const type=x.content_type==='theater'?'series':x.content_type==='other'?'movie':x.content_type;
  const payload={
    title:x.title,type,year:x.production_year||null,genre:'',rating:0,tag:'موثق',
    description:x.notes||'',video_url:null,embed_url:null,watch_url:x.source_url||x.license_url,
    license:x.license_url?'Licensed / Verified':'Source Verified',source:x.rights_holder||x.source_url||null,
    origin_country:x.origin_country||null,collection:x.collection||null,license_url:x.license_url||x.source_url||null,
    rights_holder:x.rights_holder||null,territories:x.territories||'Worldwide',published:false,
    poster:'linear-gradient(145deg,#312e81,#db2777)'
  };
  const result=await client.from('vip_content').insert(payload).select('id').single();
  if(result.error)return alert('تعذر نقل الطلب إلى المكتبة: '+result.error.message);
  alert('تم إنشاء العنوان في المكتبة كمسودة. أضف رابط الفيديو/Embed الرسمي ثم انشره.');
  await load();
  await loadRightsRequests();
};
window.removeRightsRequest=async id=>{if(!confirm('هل تريد حذف طلب الحقوق نهائياً؟'))return;const {error}=await client.from('vip_rights_requests').delete().eq('id',id);if(error)return alert('تعذر حذف الطلب: '+error.message);resetRightsForm();await loadRightsRequests()};
$('#rightsCancel').onclick=resetRightsForm;
$('#rightsForm').onsubmit=async e=>{
  e.preventDefault();
  const id=Number($('#rightsRequestId').value||0);
  const status=$('#rightsStatus').value;
  const payload={title:$('#rightsTitle').value.trim(),content_type:$('#rightsType').value,production_year:Number($('#rightsYear').value)||null,origin_country:$('#rightsOriginCountry').value.trim()||null,collection:$('#rightsCollection').value||null,rights_status:status,rights_holder:$('#rightsHolder').value.trim()||null,source_url:$('#rightsSourceUrl').value.trim()||null,license_url:$('#rightsLicenseUrl').value.trim()||null,territories:$('#rightsTerritories').value.trim()||'Worldwide',notes:$('#rightsNotes').value.trim()||null,updated_at:new Date().toISOString()};
  if(status==='verified'&&!payload.license_url&&!payload.source_url)return alert('لا يمكن وضع الحالة "تم التحقق" بدون رابط مصدر أو إثبات حقوق.');
  const result=id?await client.from('vip_rights_requests').update(payload).eq('id',id):await client.from('vip_rights_requests').insert({...payload,requested_by:(await client.auth.getUser()).data.user?.id||null});
  if(result.error)return alert('تعذر حفظ طلب الحقوق: '+result.error.message);
  resetRightsForm();await loadRightsRequests();
};

function typeName(t){return t==='movie'?'فيلم':t==='series'?'مسلسل':'أنمي / رسوم';}
function filteredItems(){
 const q=($('#tableSearch')?.value||'').trim().toLowerCase(),status=$('#statusFilter')?.value||'all',type=$('#typeFilter')?.value||'all';
 return items.filter(x=>{const hay=[x.title,x.genre,x.tag,x.rightsHolder,x.source].join(' ').toLowerCase();return(!q||hay.includes(q))&&(status==='all'||(status==='published'?x.published:!x.published))&&(type==='all'||x.type===type)});
}
function refresh(){
  $('#count').textContent=items.length;
  $('#publishedCount').textContent=items.filter(x=>x.published).length;
  $('#draftCount').textContent=items.filter(x=>!x.published).length;
  $('#views').textContent=items.reduce((s,x)=>s+Number(x.view_count||0),0).toLocaleString('ar-SA');
  const rows=filteredItems();
  const el=$('#rows');
  if(!el)return;
  el.innerHTML='';
  if(!rows.length){
    el.innerHTML='<tr><td colspan="8" class="muted">لا توجد نتائج مطابقة.</td></tr>';
    return;
  }
  rows.forEach(x=>{
    const tr=document.createElement('tr');
    const rights=Boolean(x.license&&x.rightsHolder);
    const collection=x.collection==='Yemeni Series'?'🇾🇪 مسلسلات يمنية':x.collection==='Yemeni Theater'?'🇾🇪 مسرحيات يمنية':x.collection||'—';
    tr.innerHTML='<td><strong>'+esc(x.title)+'</strong></td>'+
      '<td>'+esc(typeName(x.type))+'</td>'+
      '<td>'+esc(x.year||'')+'</td>'+
      '<td>'+esc(collection)+'</td>'+
      '<td><span class="status-pill '+(x.published?'live':'draft')+'">'+(x.published?'● منشور':'● مسودة')+'</span></td>'+
      '<td><span class="'+(rights?'rights-ok':'rights-warn')+'">'+(rights?'✓ موثقة':'⚠ ناقصة')+'</span></td>'+
      '<td>👁 '+Number(x.view_count||0).toLocaleString('ar-SA')+'</td>'+
      '<td><div class="actions">'+
        '<button class="btn small ghost" onclick="editItem('+Number(x.id)+')">تعديل</button>'+
        '<button class="btn small danger" onclick="removeItem('+Number(x.id)+')">حذف</button>'+
      '</div></td>';
    el.appendChild(tr);
  });
}
function fail(msg){const rows=$('#rows');if(rows)rows.innerHTML='<tr><td colspan="7">'+esc(msg)+'</td></tr>';const n=document.querySelector('.notice');if(n)n.textContent=msg;}
function setForm(x){$('#itemId').value=x?.id||'';fields.forEach(k=>{const el=$('#'+k);if(el)el.value=x?.[k]??''});$('#published').checked=x?.published!==false;$('#formTitle').textContent=x?'تعديل عنوان':'إضافة عنوان';$('#saveBtn').textContent=x?'حفظ التعديلات':'إضافة';$('#cancelEdit').classList.toggle('hidden',!x);$('#authorized').checked=false;window.scrollTo({top:0,behavior:'smooth'});}
window.editItem=id=>{const x=items.find(v=>Number(v.id)===Number(id));if(x)setForm(x)};
window.removeItem=async id=>{if(!confirm('هل تريد حذف هذا العنوان نهائياً؟'))return;const {error}=await client.from('vip_content').delete().eq('id',id);if(error)return alert('تعذر الحذف: '+error.message);if(Number($('#itemId').value)===Number(id))setForm(null);await load()};
$('#cancelEdit').onclick=()=>setForm(null);$('#tableSearch').oninput=refresh;$('#statusFilter').onchange=refresh;$('#typeFilter').onchange=refresh;
$('#form').onsubmit=async e=>{e.preventDefault();const payload={title:$('#title').value.trim(),type:$('#type').value,year:Number($('#year').value)||null,genre:$('#genre').value.trim(),rating:Number($('#rating').value)||0,tag:$('#tag').value.trim()||'جديد',description:$('#description').value.trim(),video_url:$('#videoUrl').value.trim()||null,embed_url:$('#embedUrl').value.trim()||null,watch_url:$('#watchUrl').value.trim()||null,license:$('#license').value.trim()||null,source:$('#source').value.trim()||null,origin_country:$('#originCountry').value.trim()||null,collection:$('#collection').value||null,license_url:$('#licenseUrl').value.trim()||null,rights_holder:$('#rightsHolder').value.trim()||null,territories:$('#territories').value.trim()||'Worldwide',published:$('#published').checked,poster:$('#poster').value.trim()||'linear-gradient(145deg,#312e81,#db2777)'};if(!payload.license||!payload.rights_holder||!payload.license_url){if(!confirm('بيانات الحقوق غير مكتملة. هل تريد الحفظ كمسودة؟'))return;payload.published=false;$('#published').checked=false}const id=Number($('#itemId').value||0);const result=id?await client.from('vip_content').update(payload).eq('id',id):await client.from('vip_content').insert(payload);if(result.error)return alert('تعذر حفظ البيانات: '+result.error.message);setForm(null);await load()};

let seasons=[],episodes=[],selectedSeasonId=null;

function seriesItems(){
  return items.filter(x=>x.type==='series');
}
function fillSeriesSelect(){
  const el=$('#seriesSelect'); if(!el)return;
  const current=el.value;
  el.innerHTML='<option value="">اختر مسلسلًا...</option>'+seriesItems().map(x=>'<option value="'+Number(x.id)+'">'+esc(x.title)+(x.published?'':' — مسودة')+'</option>').join('');
  if(current && seriesItems().some(x=>Number(x.id)===Number(current))) el.value=current;
}
async function loadSeasons(){
  fillSeriesSelect();
  const contentId=Number($('#seriesSelect')?.value||0);
  selectedSeasonId=null;
  resetEpisodeForm();
  if(!contentId){
    $('#seasonRows').innerHTML='<tr><td colspan="4" class="muted">اختر مسلسلًا أولاً.</td></tr>';
    $('#episodeRows').innerHTML='<tr><td colspan="6" class="muted">اختر موسمًا أولاً.</td></tr>';
    $('#episodeContext').textContent='اختر موسمًا لإدارة حلقاته.';
    return;
  }
  const {data,error}=await client.from('vip_seasons').select('*').eq('content_id',contentId).order('season_number',{ascending:true});
  if(error){$('#seasonRows').innerHTML='<tr><td colspan="4">'+esc(error.message)+'</td></tr>';return;}
  seasons=data||[];
  const counts={};
  if(seasons.length){
    const ids=seasons.map(s=>s.id);
    const {data:epData}=await client.from('vip_episodes').select('id,season_id').in('season_id',ids);
    (epData||[]).forEach(e=>counts[e.season_id]=(counts[e.season_id]||0)+1);
  }
  $('#seasonRows').innerHTML=seasons.map(s=>'<tr><td>الموسم '+Number(s.season_number)+'</td><td>'+esc(s.title||('الموسم '+s.season_number))+'</td><td>'+Number(counts[s.id]||0)+'</td><td><div class="actions"><button class="btn small ghost" onclick="selectSeason('+Number(s.id)+')">الحلقات</button><button class="btn small ghost" onclick="editSeason('+Number(s.id)+')">تعديل</button><button class="btn small danger" onclick="removeSeason('+Number(s.id)+')">حذف</button></div></td></tr>').join('')||'<tr><td colspan="4" class="muted">لا توجد مواسم لهذا المسلسل.</td></tr>';
}
function resetSeasonForm(){ $('#seasonId').value='';$('#seasonNumber').value='';$('#seasonTitle').value='';$('#seasonDescription').value='';$('#seasonPoster').value='';$('#seasonSave').textContent='إضافة موسم';$('#seasonCancel').classList.add('hidden');}
function resetEpisodeForm(){selectedSeasonId=null;$('#episodeForm').classList.add('hidden');$('#episodeId').value='';$('#episodeNumber').value='';$('#episodeTitle').value='';$('#episodeDescription').value='';$('#episodeVideoUrl').value='';$('#episodeEmbedUrl').value='';$('#episodeWatchUrl').value='';$('#episodeLicense').value='';$('#episodeSource').value='';$('#episodeLicenseUrl').value='';$('#episodeRightsHolder').value='';$('#episodeTerritories').value='Worldwide';$('#episodeDuration').value='';$('#episodePoster').value='';$('#episodePublished').checked=true;$('#episodeAuthorized').checked=false;$('#episodeSave').textContent='إضافة حلقة';$('#episodeCancel').classList.add('hidden');}
async function selectSeason(id){
  selectedSeasonId=Number(id);
  const s=seasons.find(x=>Number(x.id)===selectedSeasonId);
  if(!s)return;
  $('#episodeForm').classList.remove('hidden');
  $('#episodeContext').textContent='إدارة حلقات '+(s.title||('الموسم '+s.season_number));
  resetEpisodeForm();
  selectedSeasonId=Number(id);
  $('#episodeForm').classList.remove('hidden');
  $('#episodeContext').textContent='إدارة حلقات '+(s.title||('الموسم '+s.season_number));
  await loadEpisodes();
}
async function loadEpisodes(){
  if(!selectedSeasonId)return;
  const {data,error}=await client.from('vip_episodes').select('*').eq('season_id',selectedSeasonId).order('episode_number',{ascending:true});
  if(error){$('#episodeRows').innerHTML='<tr><td colspan="6">'+esc(error.message)+'</td></tr>';return;}
  episodes=data||[];
  $('#episodeRows').innerHTML=episodes.map(x=>{const rights=x.license&&x.rights_holder&&x.license_url;return '<tr><td>'+Number(x.episode_number)+'</td><td><strong>'+esc(x.title)+'</strong></td><td><span class="status-pill '+(x.published?'live':'draft')+'">'+(x.published?'● منشورة':'● مسودة')+'</span></td><td><span class="'+(rights?'rights-ok':'rights-warn')+'">'+(rights?'✓ موثقة':'⚠ ناقصة')+'</span></td><td>👁 '+Number(x.view_count||0).toLocaleString('ar-SA')+'</td><td><div class="actions"><button class="btn small ghost" onclick="editEpisode('+Number(x.id)+')">تعديل</button><button class="btn small danger" onclick="removeEpisode('+Number(x.id)+')">حذف</button></div></td></tr>'}).join('')||'<tr><td colspan="6" class="muted">لا توجد حلقات لهذا الموسم.</td></tr>';
}
function editSeason(id){const s=seasons.find(x=>Number(x.id)===Number(id));if(!s)return;$('#seasonId').value=s.id;$('#seasonNumber').value=s.season_number;$('#seasonTitle').value=s.title||'';$('#seasonDescription').value=s.description||'';$('#seasonPoster').value=s.poster||'';$('#seasonSave').textContent='حفظ الموسم';$('#seasonCancel').classList.remove('hidden');}
async function removeSeason(id){if(!confirm('حذف الموسم سيحذف جميع حلقاته. هل تريد المتابعة؟'))return;const {error}=await client.from('vip_seasons').delete().eq('id',id);if(error)return alert('تعذر حذف الموسم: '+error.message);resetSeasonForm();await loadSeasons();}
function editEpisode(id){const x=episodes.find(v=>Number(v.id)===Number(id));if(!x)return;$('#episodeId').value=x.id;$('#episodeNumber').value=x.episode_number;$('#episodeTitle').value=x.title||'';$('#episodeDescription').value=x.description||'';$('#episodeVideoUrl').value=x.video_url||'';$('#episodeEmbedUrl').value=x.embed_url||'';$('#episodeWatchUrl').value=x.watch_url||'';$('#episodeLicense').value=x.license||'';$('#episodeSource').value=x.source||'';$('#episodeLicenseUrl').value=x.license_url||'';$('#episodeRightsHolder').value=x.rights_holder||'';$('#episodeTerritories').value=x.territories||'Worldwide';$('#episodeDuration').value=x.duration_seconds??'';$('#episodePoster').value=x.poster||'';$('#episodePublished').checked=x.published!==false;$('#episodeAuthorized').checked=false;$('#episodeSave').textContent='حفظ الحلقة';$('#episodeCancel').classList.remove('hidden');}
$('#seriesSelect').onchange=()=>{resetSeasonForm();loadSeasons()};
$('#seasonCancel').onclick=resetSeasonForm;
$('#episodeCancel').onclick=()=>{resetEpisodeForm();if(selectedSeasonId){const id=selectedSeasonId;selectedSeasonId=id;$('#episodeForm').classList.remove('hidden');loadEpisodes();}};
$('#seasonForm').onsubmit=async e=>{e.preventDefault();const contentId=Number($('#seriesSelect').value);if(!contentId)return alert('اختر مسلسلًا أولاً.');const payload={content_id:contentId,season_number:Number($('#seasonNumber').value),title:$('#seasonTitle').value.trim()||('الموسم '+Number($('#seasonNumber').value)),description:$('#seasonDescription').value.trim()||null,poster:$('#seasonPoster').value.trim()||null,updated_at:new Date().toISOString()};const id=Number($('#seasonId').value||0);const result=id?await client.from('vip_seasons').update(payload).eq('id',id):await client.from('vip_seasons').insert(payload);if(result.error)return alert('تعذر حفظ الموسم: '+result.error.message);resetSeasonForm();await loadSeasons()};
$('#episodeForm').onsubmit=async e=>{e.preventDefault();if(!selectedSeasonId)return alert('اختر موسمًا أولاً.');const payload={season_id:selectedSeasonId,episode_number:Number($('#episodeNumber').value),title:$('#episodeTitle').value.trim(),description:$('#episodeDescription').value.trim()||null,video_url:$('#episodeVideoUrl').value.trim()||null,embed_url:$('#episodeEmbedUrl').value.trim()||null,watch_url:$('#episodeWatchUrl').value.trim()||null,license:$('#episodeLicense').value.trim()||null,source:$('#episodeSource').value.trim()||null,license_url:$('#episodeLicenseUrl').value.trim()||null,rights_holder:$('#episodeRightsHolder').value.trim()||null,territories:$('#episodeTerritories').value.trim()||'Worldwide',duration_seconds:Number($('#episodeDuration').value)||null,poster:$('#episodePoster').value.trim()||null,published:$('#episodePublished').checked,updated_at:new Date().toISOString()};if(!payload.license||!payload.rights_holder||!payload.license_url){if(!confirm('بيانات حقوق الحلقة غير مكتملة. هل تريد حفظها كمسودة؟'))return;payload.published=false;$('#episodePublished').checked=false}const id=Number($('#episodeId').value||0);const result=id?await client.from('vip_episodes').update(payload).eq('id',id):await client.from('vip_episodes').insert(payload);if(result.error)return alert('تعذر حفظ الحلقة: '+result.error.message);const season=selectedSeasonId;resetEpisodeForm();selectedSeasonId=season;$('#episodeForm').classList.remove('hidden');await loadEpisodes();await loadSeasons()};
window.selectSeason=selectSeason;window.editSeason=editSeason;window.removeSeason=removeSeason;window.editEpisode=editEpisode;window.removeEpisode=async id=>{if(!confirm('هل تريد حذف الحلقة نهائياً؟'))return;const {error}=await client.from('vip_episodes').delete().eq('id',id);if(error)return alert('تعذر حذف الحلقة: '+error.message);await loadEpisodes();await loadSeasons()};
const originalLoad=load;
load=async function(){await originalLoad();await loadSeasons()};

init();