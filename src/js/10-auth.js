/* 10-auth.js: Log in and sign up pages, the account menu, and progress sync.
   Accounts use Firebase when FIREBASE_CONFIG is set (src/config/firebase.json).
   Until then they fall back to accounts kept in this browser only. */
const FIREBASE_CONFIG = /*@FIREBASE@*/null;
const FB_VER = '10.12.2';

const Auth = (()=>{
  let user = null, fb = null, ready = null;
  const subs = [];
  const emit = ()=> subs.forEach(f=>f(user));
  const progressKeys = ()=>{
    const out = {};
    try{ for(let i=0;i<localStorage.length;i++){ const k = localStorage.key(i); if(/^cs\.(trophy|last)\./.test(k)) out[k] = localStorage.getItem(k); } }catch(e){}
    Object.keys(mem).forEach(k=>{ if(/^cs\.(trophy|last)\./.test(k)) out[k] = mem[k]; });
    return out;
  };

  /* ---- Firebase ---- */
  async function loadFirebase(){
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    const [app, auth, fs] = await Promise.all([import(base+'firebase-app.js'), import(base+'firebase-auth.js'), import(base+'firebase-firestore.js')]);
    const a = app.initializeApp(FIREBASE_CONFIG);
    fb = {auth, fs, A: auth.getAuth(a), D: fs.getFirestore(a)};
    auth.onAuthStateChanged(fb.A, async u=>{
      user = u ? {uid:u.uid, name:u.displayName || (u.email||'').split('@')[0], email:u.email, photo:u.photoURL} : null;
      if(user) await pullProgress();
      emit();
    });
  }
  async function pullProgress(){
    try{
      const ref = fb.fs.doc(fb.D, 'users', user.uid);
      const snap = await fb.fs.getDoc(ref);
      const remote = (snap.exists() && snap.data().progress) || {};
      Object.entries(remote).forEach(([k,v])=>{ if(store.get(k)===null || k.startsWith('cs.trophy.')) store.set(k, v); });
      await pushProgress();
    }catch(e){ console.warn('Progress sync failed', e); }
  }
  async function pushProgress(){
    if(!fb || !user) return;
    try{ await fb.fs.setDoc(fb.fs.doc(fb.D, 'users', user.uid), {name:user.name, progress:progressKeys(), updated:Date.now()}, {merge:true}); }
    catch(e){ console.warn('Progress save failed', e); }
  }
  const fbMsg = e => ({
    'auth/invalid-credential':'That email and password do not match an account.',
    'auth/wrong-password':'That email and password do not match an account.',
    'auth/user-not-found':'There is no account with that email yet. Try signing up.',
    'auth/email-already-in-use':'An account with that email already exists. Try logging in.',
    'auth/invalid-email':'That email address does not look right.',
    'auth/weak-password':'Please choose a password with at least 8 characters.',
    'auth/popup-closed-by-user':'The Google window was closed before signing in.',
    'auth/too-many-requests':'Too many attempts. Please wait a minute and try again.',
    'auth/network-request-failed':'Could not reach the sign-in service. Check your connection.'
  }[e && e.code] || 'Something went wrong. Please try again.');

  /* ---- browser-only fallback ---- */
  const LS_USERS = 'lr.users', LS_SESSION = 'lr.session';
  const users = ()=>{ try{ return JSON.parse(store.get(LS_USERS) || '{}'); }catch(e){ return {}; } };
  async function hash(pw, salt){
    const data = new TextEncoder().encode(salt + ':' + pw);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  const localErr = m => { const e = new Error(m); e.friendly = m; return e; };

  return {
    get user(){ return user; },
    get cloud(){ return !!FIREBASE_CONFIG; },
    onChange(f){ subs.push(f); },
    init(){
      if(FIREBASE_CONFIG){ ready = loadFirebase().catch(e=>{ console.warn('Firebase failed to load', e); }); return ready; }
      const s = store.get(LS_SESSION), u = s && users()[s];
      user = u ? {uid:s, name:u.name, email:s} : null; emit(); return Promise.resolve();
    },
    async signUp(name, email, pw){
      if(FIREBASE_CONFIG){
        await ready; if(!fb) throw localErr('Sign-in is unavailable right now. Please try again later.');
        try{
          const c = await fb.auth.createUserWithEmailAndPassword(fb.A, email, pw);
          if(name) await fb.auth.updateProfile(c.user, {displayName:name});
          user = {uid:c.user.uid, name: name || email.split('@')[0], email, photo:null};
          await pushProgress(); emit(); return;
        }catch(e){ throw localErr(fbMsg(e)); }
      }
      const all = users(); if(all[email]) throw localErr('An account with that email already exists. Try logging in.');
      const salt = crypto.getRandomValues(new Uint32Array(2)).join('-');
      all[email] = {name, salt, hash: await hash(pw, salt), created: Date.now()};
      store.set(LS_USERS, JSON.stringify(all)); store.set(LS_SESSION, email);
      user = {uid:email, name, email}; emit();
    },
    async logIn(email, pw){
      if(FIREBASE_CONFIG){
        await ready; if(!fb) throw localErr('Sign-in is unavailable right now. Please try again later.');
        try{ await fb.auth.signInWithEmailAndPassword(fb.A, email, pw); return; }catch(e){ throw localErr(fbMsg(e)); }
      }
      const u = users()[email];
      if(!u || u.hash !== await hash(pw, u.salt)) throw localErr('That email and password do not match an account on this device.');
      store.set(LS_SESSION, email); user = {uid:email, name:u.name, email}; emit();
    },
    async google(){
      await ready; if(!fb) throw localErr('Google sign-in is unavailable right now.');
      try{ await fb.auth.signInWithPopup(fb.A, new fb.auth.GoogleAuthProvider()); }catch(e){ throw localErr(fbMsg(e)); }
    },
    async reset(email){
      await ready; if(!fb) throw localErr('Password reset is unavailable right now.');
      try{ await fb.auth.sendPasswordResetEmail(fb.A, email); }catch(e){ throw localErr(fbMsg(e)); }
    },
    async logOut(){
      if(FIREBASE_CONFIG && fb){ await fb.auth.signOut(fb.A); return; }
      store.set(LS_SESSION, ''); user = null; emit();
    },
    save: pushProgress
  };
})();

/* ---------------- account pages ---------------- */
let authView = 'login', prevMode = 'home';
const AUTH_TEXT = {
  login: {title:'Welcome back', sub:'Log in to keep learning where you left off.', btn:'Log in', side:'Pick up right where you stopped.',
          sw:'New to Learners Room? <button type="button" data-auth="signup">Create a free account</button>'},
  signup:{title:'Create your account', sub:'Free forever. Save your trophies and progress.', btn:'Create account', side:'Learn to see what your code does.',
          sw:'Already have an account? <button type="button" data-auth="login">Log in</button>'}
};
function pwScore(p){ let s = 0; if(p.length>=8) s++; if(p.length>=12) s++; if(/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if(/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++; return p ? Math.max(1,s) : 0; }
function setAuthView(v){
  authView = v; const T = AUTH_TEXT[v], su = v==='signup';
  $('#auth-title').textContent = T.title; $('#auth-sub').textContent = T.sub; $('#au-submit').textContent = T.btn;
  $('#auth-side-h').textContent = T.side; $('#auth-switch').innerHTML = T.sw;
  $('#fld-name').hidden = !su; $('#au-meter').hidden = !su;
  $('#au-pass').autocomplete = su ? 'new-password' : 'current-password';
  $('#au-forgot').hidden = su || !Auth.cloud;
  ['login','signup'].forEach(k=>{ const b = $('#seg-'+k); b.setAttribute('aria-selected', k===v); });
  $('#au-err').hidden = true; $('#au-ok').hidden = true;
  $('#auth-note').textContent = Auth.cloud ? '' : 'For now your account is saved in this browser only. Cloud accounts are coming soon.';
  $('#au-google').hidden = !Auth.cloud; $('#au-or').hidden = !Auth.cloud;
  $('#auth-form').querySelectorAll('[data-auth]').forEach(b=> b.onclick = ()=>{ setAuthView(b.dataset.auth); history.replaceState(null,'','#/'+b.dataset.auth); });
  renderMeter();
}
function renderMeter(){
  const s = pwScore($('#au-pass').value), m = $('#au-meter');
  m.dataset.s = s; m.querySelector('span').textContent = ['', 'Weak', 'Fair', 'Good', 'Strong'][s];
}
function openAuth(v){
  if(mode!=='auth') prevMode = mode;
  setMode('auth'); setAuthView(v);
  if(location.hash !== '#/'+v) history.pushState(null,'','#/'+v);
  setTimeout(()=> (v==='signup' ? $('#au-name') : $('#au-email')).focus({preventScroll:true}), 30);
}
function authError(m){ const e = $('#au-err'); e.textContent = m; e.hidden = false; }
$('#au-pass').addEventListener('input', renderMeter);
['#au-name','#au-email','#au-pass'].forEach(s=> $(s).addEventListener('input', ()=>{ $('#au-err').hidden = true; }));
$('#au-eye').onclick = ()=>{ const p = $('#au-pass'), show = p.type==='password'; p.type = show ? 'text' : 'password'; $('#au-eye').textContent = show ? 'Hide' : 'Show'; $('#au-eye').setAttribute('aria-label', show ? 'Hide password' : 'Show password'); };
$('#auth-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const name = $('#au-name').value.trim(), email = $('#au-email').value.trim().toLowerCase(), pw = $('#au-pass').value;
  $('#au-err').hidden = true; $('#au-ok').hidden = true;
  if(authView==='signup' && !name) return authError('Please tell us your name.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return authError('Please enter a valid email address.');
  if(pw.length < 8) return authError('Your password needs at least 8 characters.');
  const btn = $('#au-submit'); btn.disabled = true; btn.classList.add('busy');
  try{ authView==='signup' ? await Auth.signUp(name, email, pw) : await Auth.logIn(email, pw); afterAuth(); }
  catch(err){ authError(err.friendly || 'Something went wrong. Please try again.'); }
  finally{ btn.disabled = false; btn.classList.remove('busy'); }
});
$('#au-google').onclick = async ()=>{ try{ await Auth.google(); afterAuth(); }catch(err){ authError(err.friendly); } };
$('#au-forgot').onclick = async ()=>{
  const email = $('#au-email').value.trim();
  if(!email) return authError('Type your email above, then press "Forgot password?" again.');
  try{ await Auth.reset(email); const ok = $('#au-ok'); ok.textContent = 'Check your inbox for a link to reset your password.'; ok.hidden = false; }catch(err){ authError(err.friendly); }
};
function afterAuth(){
  $('#au-pass').value = ''; renderMeter();
  history.replaceState(null,'',location.pathname + location.search);
  setMode(prevMode==='auth' ? 'home' : prevMode);
  const u = Auth.user; if(u) toast(`Signed in as ${u.name}.`);
}

/* ---------------- account menu in the header ---------------- */
function renderAcct(){
  const u = Auth.user, el = $('#acct');
  if(!u){
    el.innerHTML = `<button class="link-btn" data-go="login">Log in</button><button class="btn-primary sm" data-go="signup">Sign up</button>`;
  } else {
    const ini = (u.name||u.email||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
    el.innerHTML = `<button class="avatar" id="acct-btn" aria-haspopup="menu" aria-expanded="false" title="${esc(u.name)}">${u.photo ? `<img src="${esc(u.photo)}" alt="">` : esc(ini)}</button>
      <div class="menu" id="acct-menu" role="menu" hidden><div class="menu-who"><b>${esc(u.name)}</b><span>${esc(u.email||'')}</span></div><button role="menuitem" id="acct-home">Home</button><button role="menuitem" id="acct-out">Log out</button></div>`;
    const btn = $('#acct-btn'), menu = $('#acct-menu');
    btn.onclick = ev=>{ ev.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', !menu.hidden); };
    $('#acct-home').onclick = ()=> goHome();
    $('#acct-out').onclick = async ()=>{ await Auth.logOut(); toast('You are logged out.'); };
  }
  bindGo(el);
  const band = $('.cta-band'); if(band) band.hidden = !!u;
}
document.addEventListener('click', e=>{ const m = $('#acct-menu'); if(m && !m.hidden && !e.target.closest('#acct')){ m.hidden = true; $('#acct-btn').setAttribute('aria-expanded', false); } });
document.addEventListener('keydown', e=>{ const m = $('#acct-menu'); if(e.key==='Escape' && m && !m.hidden){ m.hidden = true; $('#acct-btn').setAttribute('aria-expanded', false); $('#acct-btn').focus(); } });
function bindGo(root){ root.querySelectorAll('[data-go]').forEach(b=> b.onclick = ()=> openAuth(b.dataset.go)); }
bindGo(document);
Auth.onChange(()=>{ renderAcct(); if(mode==='home') renderHome(); });
window.addEventListener('popstate', ()=>{
  const m = location.hash.match(/^#\/(login|signup)$/);
  if(m) openAuth(m[1]); else if(mode==='auth') setMode(prevMode==='auth' ? 'home' : prevMode);
});
