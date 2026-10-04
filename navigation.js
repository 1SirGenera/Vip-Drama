(()=>{'use strict';
const sameOrigin=a=>a&&a.origin===location.origin&&a.pathname!==location.pathname&&a.target!=='_blank';
document.addEventListener('click',e=>{
 const a=e.target.closest('a[href]'); if(!a)return;
 if(a.id==='bottomSearch'){e.preventDefault();document.querySelector('#searchOpen')?.click();return}
 if(a.getAttribute('href')==='#')return;
 if(!sameOrigin(a))return;
 if(a.hash && a.pathname===location.pathname)return;
 if(document.startViewTransition){e.preventDefault();const url=a.href;document.startViewTransition(()=>{location.href=url})}
});
document.addEventListener('DOMContentLoaded',()=>{
 const path=location.pathname.split('/').pop()||'index.html';
 document.querySelectorAll('.bottom-nav a[href]').forEach(a=>{
   const href=a.getAttribute('href')||'';
   if((path==='index.html'||path==='')&&href==='#home')a.classList.add('active');
   if(path==='live.html'&&href==='live.html')a.classList.add('active');
   if(path==='login.html'&&href==='login.html')a.classList.add('active');
 });
});
})();