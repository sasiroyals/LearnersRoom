/* 10-auth.js: Log in and sign up pages, the account menu, and progress sync.
   Accounts use Amazon Cognito when COGNITO is set (src/config/cognito.json).
   Until then they fall back to accounts kept in this browser only. */
const COGNITO = /*@COGNITO@*/null;

const Auth = (()=>{
  let user = null, ready = Promise.resolve(), pendingPw = null;
  const subs = [];
  const emit = ()=> subs.forEach(f=>f(user));
  const friendly = m => { const e = new Error(m); e.friendly = m; return e; };

  /* ---- progress: trophies and last lesson, packed small enough for one Cognito attribute ---- */
  const allKeys = ()=>{
    const ks = new Set(Object.keys(mem));
    try{ for(let i=0;i<localStorage.length;i++) ks.add(localStorage.key(i)); }catch(e){}
    return [...ks];
  };
  function packProgress(){
    const t = {}, l = {};
    allKeys().forEach(k=>{
      let m = k.match(/^cs\.trophy\.(\w+)\.(.+)$/); if(m && store.get(k)==='1'){ (t[m[1]] = t[m[1]] || []).push(m[2]); return; }
      m = k.match(/^cs\.last\.(\w+)$/); if(m && store.get(k)) l[m[1]] = store.get(k);
    });
    let out = JSON.stringify({t, l});
    if(out.length > 2048) out = JSON.stringify({t});
    return out.length > 2048 ? null : out;
  }
  function unpackProgress(str){
    let p; try{ p = JSON.parse(str || '{}'); }catch(e){ return; }
    Object.entries(p.t || {}).forEach(([lg, ids])=> ids.forEach(id=> store.set(`cs.trophy.${lg}.${id}`, '1')));
    Object.entries(p.l || {}).forEach(([lg, id])=>{ if(!store.get('cs.last.'+lg)) store.set('cs.last.'+lg, id); });
  }

  /* ---- Amazon Cognito, called directly over HTTPS ---- */
  const TOK = 'lr.cognito';
  const COG_MSG = {
    NotAuthorizedException:'That email and password do not match an account.',
    UserNotFoundException:'That email and password do not match an account.',
    UsernameExistsException:'An account with that email already exists. Try logging in.',
    CodeMismatchException:'That code is not right. Check the email and try again.',
    ExpiredCodeException:'That code has expired. Press "Send a new code".',
    LimitExceededException:'Too many attempts. Please wait a few minutes and try again.',
    TooManyRequestsException:'Too many attempts. Please wait a few minutes and try again.',
    TooManyFailedAttemptsException:'Too many attempts. Please wait a few minutes and try again.'
  };
  async function cog(action, body){
    let r;
    try{
      r = await fetch(`https://cognito-idp.${COGNITO.region}.amazonaws.com/`, {method:'POST',
        headers:{'Content-Type':'application/x-amz-json-1.1','X-Amz-Target':'AWSCognitoIdentityProviderService.'+action},
        body: JSON.stringify(body)});
    }catch(e){ throw friendly('Could not reach the sign-in service. Check your connection.'); }
    const j = await r.json().catch(()=>({}));
    if(!r.ok){
      const code = String(j.__type || '').split('#').pop();
      const e = friendly(COG_MSG[code] || (code==='InvalidPasswordException' || code==='InvalidParameterException' ? String(j.message || '').replace(/^.*?:\s*/,'') : 'Something went wrong. Please try again.'));
      e.code = code; throw e;
    }
    return j;
  }
  const tokens = ()=>{ try{ return JSON.parse(store.get(TOK) || 'null'); }catch(e){ return null; } };
  const saveTokens = (res, refresh)=> store.set(TOK, JSON.stringify({access:res.AccessToken, refresh: res.RefreshToken || refresh, exp: Date.now() + (res.ExpiresIn||3600)*1000}));
  async function accessToken(){
    const t = tokens(); if(!t) return null;
    if(t.exp - Date.now() > 60000) return t.access;
    try{
      const r = await cog('InitiateAuth', {AuthFlow:'REFRESH_TOKEN_AUTH', ClientId:COGNITO.clientId, AuthParameters:{REFRESH_TOKEN:t.refresh}});
      saveTokens(r.AuthenticationResult, t.refresh); return r.AuthenticationResult.AccessToken;
    }catch(e){ store.set(TOK, ''); return null; }
  }
  async function loadUser(){
    const at = await accessToken(); if(!at){ user = null; return; }
    try{
      const r = await cog('GetUser', {AccessToken:at});
      const A = Object.fromEntries((r.UserAttributes||[]).map(x=>[x.Name, x.Value]));
      user = {uid:A.sub || r.Username, name:A.name || (A.email||'').split('@')[0], email:A.email};
      unpackProgress(A['custom:progress']);
      push();
    }catch(e){ if(e.code==='NotAuthorizedException') store.set(TOK, ''); user = null; }
  }
  async function push(){
    if(!COGNITO || !user) return;
    const v = packProgress(); if(v===null) return;
    try{ const at = await accessToken(); if(at) await cog('UpdateUserAttributes', {AccessToken:at, UserAttributes:[{Name:'custom:progress', Value:v}]}); }
    catch(e){ console.warn('Progress save failed', e); }
  }
  async function cogLogIn(email, pw){
    try{
      const r = await cog('InitiateAuth', {AuthFlow:'USER_PASSWORD_AUTH', ClientId:COGNITO.clientId, AuthParameters:{USERNAME:email, PASSWORD:pw}});
      if(!r.AuthenticationResult) throw friendly('This account needs an extra step we do not support yet.');
      saveTokens(r.AuthenticationResult); await loadUser(); emit();
      return {};
    }catch(e){
      if(e.code==='UserNotConfirmedException'){ pendingPw = pw; await cog('ResendConfirmationCode', {ClientId:COGNITO.clientId, Username:email}).catch(()=>{}); return {verify:true}; }
      throw e;
    }
  }

  /* ---- browser-only fallback ---- */
  const LS_USERS = 'lr.users', LS_SESSION = 'lr.session';
  const users = ()=>{ try{ return JSON.parse(store.get(LS_USERS) || '{}'); }catch(e){ return {}; } };
  async function hash(pw, salt){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw));
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  return {
    get user(){ return user; },
    get cloud(){ return !!COGNITO; },
    onChange(f){ subs.push(f); },
    init(){
      if(COGNITO){ ready = loadUser().then(emit); return ready; }
      const s = store.get(LS_SESSION), u = s && users()[s];
      user = u ? {uid:s, name:u.name, email:s} : null; emit(); return ready;
    },
    /* Returns {verify:true} when Cognito has emailed a code that must be entered next. */
    async signUp(name, email, pw){
      if(COGNITO){
        const r = await cog('SignUp', {ClientId:COGNITO.clientId, Username:email, Password:pw, UserAttributes:[{Name:'email', Value:email}, {Name:'name', Value:name}]});
        pendingPw = pw;
        if(r.UserConfirmed) return cogLogIn(email, pw);
        return {verify:true};
      }
      const all = users(); if(all[email]) throw friendly('An account with that email already exists. Try logging in.');
      const salt = crypto.getRandomValues(new Uint32Array(2)).join('-');
      all[email] = {name, salt, hash: await hash(pw, salt), created: Date.now()};
      store.set(LS_USERS, JSON.stringify(all)); store.set(LS_SESSION, email);
      user = {uid:email, name, email}; emit(); return {};
    },
    async verify(email, code){
      await cog('ConfirmSignUp', {ClientId:COGNITO.clientId, Username:email, ConfirmationCode:code});
      if(pendingPw){ const pw = pendingPw; pendingPw = null; return cogLogIn(email, pw); }
      return {login:true};
    },
    resend(email){ return cog('ResendConfirmationCode', {ClientId:COGNITO.clientId, Username:email}); },
    async logIn(email, pw){
      await ready;
      if(COGNITO) return cogLogIn(email, pw);
      const u = users()[email];
      if(!u || u.hash !== await hash(pw, u.salt)) throw friendly('That email and password do not match an account on this device.');
      store.set(LS_SESSION, email); user = {uid:email, name:u.name, email}; emit(); return {};
    },
    forgot(email){ return cog('ForgotPassword', {ClientId:COGNITO.clientId, Username:email}); },
    async resetPassword(email, code, pw){
      await cog('ConfirmForgotPassword', {ClientId:COGNITO.clientId, Username:email, ConfirmationCode:code, Password:pw});
      return cogLogIn(email, pw);
    },
    async logOut(){
      if(COGNITO){ await push(); const t = tokens(); store.set(TOK, ''); if(t) cog('RevokeToken', {ClientId:COGNITO.clientId, Token:t.refresh}).catch(()=>{}); }
      else store.set(LS_SESSION, '');
      user = null; emit();
    },
    save: push
  };
})();

/* ---------------- account pages ---------------- */
let authView = 'login', prevMode = 'home', authEmail = '';
const AUTH_TEXT = {
  login: {title:'Welcome back', sub:'Log in to keep learning where you left off.', btn:'Log in', side:'Pick up right where you stopped.',
          sw:'New to Learners Room? <button type="button" data-auth="signup">Create a free account</button>', show:['email','pass'], tabs:true},
  signup:{title:'Create your account', sub:'Free forever. Save your trophies and progress.', btn:'Create account', side:'Learn to see what your code does.',
          sw:'Already have an account? <button type="button" data-auth="login">Log in</button>', show:['name','email','pass','meter'], tabs:true},
  verify:{title:'Check your email', sub:'', btn:'Verify and continue', side:'One quick check and you are in.',
          sw:'Wrong email? <button type="button" data-auth="signup">Go back</button>', show:['code','resend']},
  forgot:{title:'Reset your password', sub:'Enter your email and we will send you a code.', btn:'Send reset code', side:'It happens to everyone.',
          sw:'Remembered it? <button type="button" data-auth="login">Back to log in</button>', show:['email']},
  reset: {title:'Choose a new password', sub:'', btn:'Save new password', side:'Almost there.',
          sw:'<button type="button" data-auth="forgot">Send a new code</button>', show:['code','pass','meter'], pass:'New password'}
};
function pwScore(p){ let s = 0; if(p.length>=8) s++; if(p.length>=12) s++; if(/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if(/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++; return p ? Math.max(1,s) : 0; }
function setAuthView(v){
  authView = v; const T = AUTH_TEXT[v], sh = k => T.show.includes(k);
  $('#auth-title').textContent = T.title; $('#au-submit').textContent = T.btn;
  $('#auth-sub').textContent = T.sub || (v==='verify' ? `We sent a code to ${authEmail}. Enter it below to finish creating your account.` : `We sent a code to ${authEmail}. Enter it with your new password.`);
  $('#auth-side-h').textContent = T.side; $('#auth-switch').innerHTML = T.sw;
  $('#fld-name').hidden = !sh('name'); $('#fld-email').hidden = !sh('email'); $('#fld-pass').hidden = !sh('pass');
  $('#fld-code').hidden = !sh('code'); $('#au-meter').hidden = !sh('meter'); $('#au-resend').hidden = !sh('resend');
  $('.seg').hidden = !T.tabs;
  $('#au-pass-label').textContent = T.pass || 'Password';
  $('#au-pass').autocomplete = (v==='login') ? 'current-password' : 'new-password';
  $('#au-forgot').hidden = v!=='login' || !Auth.cloud;
  ['login','signup'].forEach(k=> $('#seg-'+k).setAttribute('aria-selected', k===v));
  $('#au-err').hidden = true; $('#au-ok').hidden = true;
  if(T.show.includes('code')) $('#au-code').value = '';
  $('#auth-note').textContent = Auth.cloud ? '' : 'For now your account is saved in this browser only. Cloud accounts are coming soon.';
  $('#auth-form').querySelectorAll('[data-auth]').forEach(b=> b.onclick = ()=>{ setAuthView(b.dataset.auth); if(AUTH_TEXT[b.dataset.auth].tabs) history.replaceState(null,'','#/'+b.dataset.auth); });
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
function authOk(m){ const e = $('#au-ok'); e.textContent = m; e.hidden = false; }
$('#au-pass').addEventListener('input', renderMeter);
['#au-name','#au-email','#au-pass','#au-code'].forEach(s=> $(s).addEventListener('input', ()=>{ $('#au-err').hidden = true; }));
$('#au-eye').onclick = ()=>{ const p = $('#au-pass'), show = p.type==='password'; p.type = show ? 'text' : 'password'; $('#au-eye').textContent = show ? 'Hide' : 'Show'; $('#au-eye').setAttribute('aria-label', show ? 'Hide password' : 'Show password'); };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
async function authSubmit(){
  const v = authView, name = $('#au-name').value.trim(), email = $('#au-email').value.trim().toLowerCase(), pw = $('#au-pass').value, code = $('#au-code').value.trim();
  const needEmail = v==='login' || v==='signup' || v==='forgot';
  if(v==='signup' && !name) return authError('Please tell us your name.');
  if(needEmail && !EMAIL_RE.test(email)) return authError('Please enter a valid email address.');
  if((v==='login' || v==='signup' || v==='reset') && pw.length < 8) return authError('Your password needs at least 8 characters.');
  if((v==='verify' || v==='reset') && !/^\d{4,8}$/.test(code)) return authError('Enter the code from the email we sent you.');
  if(needEmail) authEmail = email;
  let r = {};
  if(v==='login') r = await Auth.logIn(email, pw);
  else if(v==='signup') r = await Auth.signUp(name, email, pw);
  else if(v==='verify') r = await Auth.verify(authEmail, code);
  else if(v==='forgot'){ await Auth.forgot(authEmail); setAuthView('reset'); return; }
  else if(v==='reset') r = await Auth.resetPassword(authEmail, code, pw);
  if(r.verify){ setAuthView('verify'); setTimeout(()=> $('#au-code').focus(), 30); return; }
  if(r.login){ setAuthView('login'); $('#au-email').value = authEmail; authOk('Your email is verified. Log in to continue.'); return; }
  afterAuth();
}
$('#auth-form').addEventListener('submit', async e=>{
  e.preventDefault();
  $('#au-err').hidden = true; $('#au-ok').hidden = true;
  const btn = $('#au-submit'); btn.disabled = true; btn.classList.add('busy');
  try{ await authSubmit(); }
  catch(err){ authError(err.friendly || 'Something went wrong. Please try again.'); }
  finally{ btn.disabled = false; btn.classList.remove('busy'); }
});
$('#au-forgot').onclick = ()=>{ setAuthView('forgot'); };
$('#au-resend').onclick = async ()=>{ try{ await Auth.resend(authEmail); authOk('We sent a new code to ' + authEmail + '.'); }catch(err){ authError(err.friendly); } };
function afterAuth(){
  $('#au-pass').value = ''; $('#au-code').value = ''; renderMeter();
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
    document.addEventListener('click', ()=>{ menu.hidden = true; btn.setAttribute('aria-expanded', false); }, {once:true});
    $('#acct-home').onclick = ()=> goHome();
    $('#acct-out').onclick = async ()=>{ await Auth.logOut(); toast('You are logged out.'); };
  }
  bindGo(el);
  const band = $('.cta-band'); if(band) band.hidden = !!u;
}
function bindGo(root){ root.querySelectorAll('[data-go]').forEach(b=> b.onclick = ()=> openAuth(b.dataset.go)); }
bindGo(document);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) Auth.save(); });
Auth.onChange(()=>{ renderAcct(); if(mode==='home') renderHome(); });
window.addEventListener('popstate', ()=>{
  const m = location.hash.match(/^#\/(login|signup)$/);
  if(m) openAuth(m[1]); else if(mode==='auth') setMode(prevMode==='auth' ? 'home' : prevMode);
});
