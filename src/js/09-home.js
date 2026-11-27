/* 09-home.js: Keyboard shortcuts and the home page. */
document.addEventListener('keydown', e=>{
  if(mode==='home' || mode==='auth') return;
  if(mode==='practice'){
    if(e.target.closest && e.target.closest('textarea, input')) return;
    if(!pr.trace || e.altKey||e.ctrlKey||e.metaKey) return;
    if(e.key==='ArrowRight'){ e.preventDefault(); prGo(pr.i+1); } else if(e.key==='ArrowLeft'){ e.preventDefault(); prGo(pr.i-1); }
    return;
  }
  if(e.target.closest && e.target.closest('#views, #vtabs, input, textarea, select')) return;
  if(e.altKey||e.ctrlKey||e.metaKey) return;
  if(lessonId!=='alias'){
    if(!tl.trace) return;
    if(e.key==='ArrowRight'){ e.preventDefault(); tlNext(); } else if(e.key==='ArrowLeft'){ e.preventDefault(); tlGo(tl.k-1); } else if(e.key==='r'||e.key==='R') renderTL();
    return;
  }
  if(e.key==='ArrowRight'){ e.preventDefault(); next(); }
  else if(e.key==='ArrowLeft'){ e.preventDefault(); back(); }
  else if(e.key==='r'||e.key==='R'){ replay(); }
  else if(e.key==='p'||e.key==='P'){ togglePause(); }
});

/* ---------------- home page ---------------- */
const BOOKS = {
  py: [['Python Crash Course','Eric Matthes, 3rd ed.','Sets the order of the beginner topics.','#E4572E'],['Learning Python','Mark Lutz','The deep reference used to check each lesson.','#2E86AB'],['Fluent Python','Luciano Ramalho, 2nd ed.','Names, mutability, copying and advanced topics.','#6C4AB6']],
  java: [['Head First Java','Sierra, Bates and Gee, 3rd ed.','Sets the order of the beginner topics.','#F29E4C'],['Core Java, Volume I','Cay Horstmann','The deep reference used to check each lesson.','#1B998B'],['Effective Java','Joshua Bloch, 3rd ed.','The why behind equality, immutability and design.','#C2185B']]
};
const LEVEL_SUB = {Beginner:'Values, strings, conditions, loops and your first functions.', Intermediate:'Functions in depth, data structures and files.', 'Intermediate, the OOP core':'Classes, encapsulation, inheritance, polymorphism and abstraction.', Professional:'Closures, generators, decorators, advanced OOP and design.'};
function countUp(el, to){
  if(RM || !('IntersectionObserver' in window)){ el.textContent = to; return; }
  el.textContent = '0';
  const io = new IntersectionObserver(es=>{ if(!es.some(e=>e.isIntersecting)) return; io.disconnect();
    const t0 = performance.now(), D = 1100;
    const tick = t=>{ const k = Math.min(1,(t-t0)/D), e = 1-Math.pow(1-k,3); el.textContent = Math.round(to*e); if(k<1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick); });
  io.observe(el);
}
function renderHome(){
  const C = CURRICULUM[lang], B = BUILT[lang];
  const nLessons = ALL_LESSONS[lang].length;
  const nTopics = C.filter(t=>(B[t.n]||[]).length).length;
  const nPred = 3 + (lang==='py' ? Object.values(TL_LESSONS).reduce((n,l)=>n + (l.predict ? 1 : 0) + (l.variants||[]).length + (l.check ? 1 : 0), 0) : 0);
  const nProb = lang==='py' ? Object.values(PROBLEMS).reduce((c,ps)=>c+ps.length,0) : 0;
  const nSolved = lang==='py' ? Object.values(PROBLEMS).flat().filter(p=>isSolved(p.id)).length : 0;
  const won = ALL_LESSONS[lang].filter(id=>hasTrophy(lang,id)).length;
  const hc = $('#hero-count'); if(hc) hc.textContent = ALL_LESSONS.py.length;
  const stats = Auth.user ? [[won,'trophies earned'],[nSolved,'problems solved'],[nLessons,L[lang].name+' lessons'],[nProb,'practice problems']]
                          : [[nLessons,L[lang].name+' lessons'],[nTopics,'topics'],[nProb,'practice problems'],[nPred,'predictions to make']];
  $('#home-stats').innerHTML = stats.map(([n,t])=>`<div class="stat"><b data-n="${n}">${n}</b><span>${esc(t)}</span></div>`).join('');
  $('#home-stats').querySelectorAll('b[data-n]').forEach(b=> countUp(b, +b.dataset.n));
  $('#home-lang').textContent = `${nLessons} ${L[lang].name} lessons across ${C.length} topics. Pick any topic to start, or switch language with the tabs at the top.`;
  const levels = [...new Set(C.map(t=>t.level))];
  $('#home-levels').innerHTML = levels.map((lv,i)=>{
    const ts = C.filter(t=>t.level===lv);
    const name = lv.replace(/^Level \d+: /,'');
    const ids = ts.flatMap(t=>B[t.n]||[]); const done = ids.filter(id=>hasTrophy(lang,id)).length;
    const pct = ids.length ? Math.round(100*done/ids.length) : 0;
    return `<div class="level-card"><div class="lv-top"><div class="lv-ring" style="--p:${pct}"><span>${pct}%</span></div><div><div class="lv-step">Level ${i+1}</div><h3>${esc(name)}</h3><p class="lv-sub">${esc(LEVEL_SUB[name]||'')}</p></div></div><div class="lv-list">` + ts.map(t=>{
      const built = B[t.n] || []; const d = built.filter(id=>hasTrophy(lang,id)).length;
      const total = Math.max(built.length, t.subs.length);
      const np = lang==='py' ? problemCount(t.n) : 0, ns = np ? solvedCount(t.n) : 0;
      return `<div class="ht-row"><button class="ht" data-topic="${t.n}" ${built.length?'':'disabled'}><span class="htn">${t.n}</span><span>${esc(t.t)}</span><span class="htc${built.length && d===built.length?' full':''}">${built.length ? d+'/'+total : 'soon'}</span></button>${np ? `<button class="ht-prac${ns===np?' full':''}" data-prac="${t.n}" title="Practice problems: ${ns} of ${np} solved" aria-label="Practice ${esc(t.t)}: ${ns} of ${np} solved">${ns===np?'✓':''}Practice</button>` : ''}</div>`;
    }).join('') + `</div></div>`;
  }).join('');
  $('#home-levels').querySelectorAll('[data-prac]').forEach(b=> b.onclick = ()=> openTopicProblems(b.dataset.prac));
  $('#home-levels').querySelectorAll('.ht[data-topic]:not([disabled])').forEach(b=> b.onclick = ()=>{ const B2 = BUILT[lang][b.dataset.topic]; const next = B2.find(id=>!hasTrophy(lang,id)) || B2[0]; goLesson(next); });
  $('#home-books').innerHTML = ['py','java'].map(lg=>`<div class="book-card"><h3><span class="lang-badge">${lg==='py'?'.py':'.java'}</span>${esc(L[lg].name)}</h3>` + BOOKS[lg].map(([t,a,w,c])=>`<div class="book-row"><div class="spine" style="background:${c}">${esc(t[0])}</div><div><b>${esc(t)}</b><span class="by">${esc(a)}</span><p>${esc(w)}</p></div></div>`).join('') + `</div>`).join('');
  const last = store.get('cs.last.'+lang), cont = $('#home-continue');
  if(last && ALL_LESSONS[lang].includes(last)){ cont.hidden = false; cont.textContent = 'Continue where you left off: ' + lessonTitle(last) + ' →'; cont.onclick = ()=> goLesson(last); }
  else cont.hidden = true;
}
function goLesson(id){ setMode('lesson'); openLesson(id); }
function goHome(){ setMode('home'); }
$('#home-py').onclick = ()=>{ if(lang!=='py') setLang('py'); goLesson(firstLesson('py')); };
$('#home-java').onclick = ()=>{ if(lang!=='java') setLang('java'); goLesson(firstLesson('java')); };
$('#home-try').onclick = ()=> goLesson(firstLesson(lang));
document.querySelectorAll('[data-foot]').forEach(b=> b.onclick = ()=>{ const f = b.dataset.foot; if(f==='practice'){ setMode('practice'); return; } if(lang!==f) setLang(f); goLesson(firstLesson(f)); });
