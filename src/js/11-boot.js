/* 11-boot.js: Language switching and start-up. */
/* ---------------- language ---------------- */
/* The lesson to open when none is chosen: the last one used, else the first. */
function pickLesson(lg){ const last = store.get('cs.last.'+lg); return last && ALL_LESSONS[lg].includes(last) ? last : firstLesson(lg); }
function firstLesson(lg){ const B = BUILT[lg]; const t = CURRICULUM[lg].find(t=>B[t.n] && B[t.n].length); return t ? B[t.n][0] : 'alias'; }
$('#brand-home').onclick = ()=>{ goHome(); const hm = $('#home'); if(hm) hm.scrollTop = 0; window.scrollTo(0,0); };
function setLang(lg, animate=true){
  lang = lg; store.set('cs.lang', lg);
  document.querySelectorAll('.tab[data-lang]').forEach(t=>{ t.setAttribute('aria-selected', t.dataset.lang===lg); t.tabIndex = t.dataset.lang===lg?0:-1; });
  renderOutline();
  if(mode==='home'){ renderHome(); return; }
  if(mode==='auth') return;
  if(typeof mode!=='undefined' && mode==='practice') renderPractice();
  else if(lessonOpened && lessonId!=='alias' && ALL_LESSONS[lg].includes(lessonId)) renderTL();
  else if(lessonOpened){ const pk = pickLesson(lg); if(pk==='alias' && lessonId==='alias') render(animate); else openLesson(pk); }
  else render(animate);
}
document.querySelectorAll('.tab[data-lang]').forEach(t=> t.onclick = ()=> setLang(t.dataset.lang));

if(lang!=='py' && lang!=='java') lang = 'py';
setLang(lang, false);
setMode('home');
renderAcct();
Auth.init();
{ const m = location.hash.match(/^#\/(login|signup)$/); if(m) openAuth(m[1]); }
setView(0,false);
let wasNarrow = matchMedia('(max-width:760px)').matches;
window.addEventListener('resize', ()=>{ const v=$('#views'); v.scrollLeft = viewIdx*v.clientWidth; const n = matchMedia('(max-width:760px)').matches; if(n!==wasNarrow){ wasNarrow=n; render(false); } });
