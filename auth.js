const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

function showAuthMessage(message, type="info") {
  const el = document.querySelector("#authMessage");
  if (!el) return;
  el.textContent = message;
  el.className = "auth-message " + type;
}

function setBusy(form, busy) {
  form.querySelectorAll("button").forEach(b => b.disabled = busy);
}

function getAuthRedirectUrl() {
  const base = String(window.VIP_SITE_URL || window.location.origin).replace(/\/$/, "");
  return `${base}/login.html?verified=1`;
}

async function registerUser(email, password, name) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: getAuthRedirectUrl()
    }
  });
  if (error) throw error;
  return data;
}

async function loginUser(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function resendConfirmation(email) {
  const { data, error } = await supabaseClient.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: getAuthRedirectUrl() }
  });
  if (error) throw error;
  return data;
}

async function logoutUser() {
  const { error } = await supabaseClient.auth.signOut({ scope: "local" });
  if (error) throw error;
}

async function bootAuthPage() {
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");
  const loginBox = document.querySelector("#loginBox");
  const registerBox = document.querySelector("#registerBox");
  const switchRegister = document.querySelector("#switchRegister");
  const switchLogin = document.querySelector("#switchLogin");
  const logoutBtn = document.querySelector("#logoutBtn");
  const resendBtn = document.querySelector("#resendConfirmation");
  const verified = new URLSearchParams(location.search).get("verified");
  const accountBox = document.querySelector("#accountBox");
  const accountEmail = document.querySelector("#accountEmail");

  const configured = !window.SUPABASE_URL.includes("YOUR-PROJECT") && !window.SUPABASE_PUBLISHABLE_KEY.includes("YOUR-PUBLISHABLE");
  if (!configured) showAuthMessage("أضف بيانات Supabase في ملف supabase-config.js أولاً.", "error");

  if (verified === "1") showAuthMessage("تم تأكيد بريدك الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول.", "success");
  const authError = new URLSearchParams(location.hash.slice(1)).get("error_description");
  if (authError) showAuthMessage(decodeURIComponent(authError.replace(/\+/g, " ")), "error");

  resendBtn?.addEventListener("click", async () => {
    const email = document.querySelector("#resendEmail")?.value.trim();
    if (!email) { showAuthMessage("اكتب بريدك الإلكتروني أولاً.", "error"); return; }
    setBusy(resendBtn.form || document, true);
    try { await resendConfirmation(email); showAuthMessage("تم إرسال رابط تأكيد جديد إلى بريدك الإلكتروني.", "success"); }
    catch (err) { showAuthMessage(err.message || "تعذر إرسال رابط التأكيد.", "error"); }
    finally { setBusy(resendBtn.form || document, false); }
  });

  switchRegister?.addEventListener("click", e => { e.preventDefault(); loginBox.hidden=true; registerBox.hidden=false; showAuthMessage(""); });
  switchLogin?.addEventListener("click", e => { e.preventDefault(); registerBox.hidden=true; loginBox.hidden=false; showAuthMessage(""); });

  loginForm?.addEventListener("submit", async e => {
    e.preventDefault(); if (!configured) return;
    setBusy(loginForm,true); showAuthMessage("جارٍ تسجيل الدخول...");
    try { await loginUser(loginForm.email.value.trim(), loginForm.password.value); location.href="index.html"; }
    catch(err) { showAuthMessage(err.message || "تعذر تسجيل الدخول.", "error"); }
    finally { setBusy(loginForm,false); }
  });

  registerForm?.addEventListener("submit", async e => {
    e.preventDefault(); if (!configured) return;
    const password=registerForm.password.value;
    if(password.length < 6){ showAuthMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل.", "error"); return; }
    setBusy(registerForm,true); showAuthMessage("جارٍ إنشاء الحساب...");
    try {
      const data=await registerUser(registerForm.email.value.trim(), password, registerForm.name.value.trim());
      if(data.session) location.href="index.html";
      else showAuthMessage("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيل الحساب.", "success");
    } catch(err) { showAuthMessage(err.message || "تعذر إنشاء الحساب.", "error"); }
    finally { setBusy(registerForm,false); }
  });

  logoutBtn?.addEventListener("click", async () => { try { await logoutUser(); location.reload(); } catch(err) { showAuthMessage(err.message, "error"); } });

  if (configured) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      loginBox && (loginBox.hidden=true); registerBox && (registerBox.hidden=true); accountBox && (accountBox.hidden=false);
      if(accountEmail) accountEmail.textContent=session.user.email;
    }
  }
}

window.VIP_AUTH = { client: supabaseClient, registerUser, loginUser, resendConfirmation, logoutUser };
document.addEventListener("DOMContentLoaded", bootAuthPage);
