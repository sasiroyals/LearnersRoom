/* 10-boot.js: Language switching and start-up. */
/* ---------------- language ---------------- */
function firstLesson(lg){ const B = BUILT[lg]; const t = CURRICULUM[lg].find(t=>B[t.n] && B[t.n].length); return t ? B[t.n][0] : 'alias'; }
$('#brand-home').onclick = ()=>{ goHome(); const hm = $('#home'); if(hm) hm.scrollTop = 0; window.scrollTo(0,0); };
function setLang(lg, animate=true){
  lang = lg; store.set('cs.lang', lg);
  document.querySelectorAll('.tab[data-lang]').forEach(t=>{ t.setAttribute('aria-selected', t.dataset.lang===lg); t.tabIndex = t.dataset.lang===lg?0:-1; });
  renderOutline();
  if(mode==='home'){ renderHome(); return; }
  if(typeof mode!=='undefined' && mode==='practice') renderPractice();
  else if(lessonId!=='alias'){ if(lg==='py') renderTL(); else openLesson('alias'); }
  else render(animate);
}
document.querySelectorAll('.tab[data-lang]').forEach(t=> t.onclick = ()=> setLang(t.dataset.lang));
document.querySelectorAll('[data-pick]').forEach(b=> b.onclick = ()=>{ $('#chooser').hidden = true; setLang(b.dataset.pick); if(lang==='py') openLesson(firstLesson('py')); const bn = $('#b-next'); bn && bn.focus(); });

if(lang!=='py' && lang!=='java') lang = 'py';
setLang(lang, false);
setMode('home');
setView(0,false);
let wasNarrow = matchMedia('(max-width:760px)').matches;
window.addEventListener('resize', ()=>{ const v=$('#views'); v.scrollLeft = viewIdx*v.clientWidth; const n = matchMedia('(max-width:760px)').matches; if(n!==wasNarrow){ wasNarrow=n; render(false); } });
