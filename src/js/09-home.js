/* 09-home.js: Keyboard shortcuts and the home page. */
document.addEventListener('keydown', e=>{
  if(!$('#chooser').hidden) return;
  if(mode==='home') return;
  if(mode==='practice'){
    if(e.target.closest && e.target.closest('textarea, input')) return;
    if(!pr.trace || e.altKey||e.ctrlKey||e.metaKey) return;
    if(e.key==='ArrowRight'){ e.preventDefault(); prGo(pr.i+1); } else if(e.key==='ArrowLeft'){ e.preventDefault(); prGo(pr.i-1); }
    return;
  }
  if(e.target.closest && e.target.closest('#views, #vtabs')) return;
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
  py: [['Python Crash Course','Eric Matthes, 3rd ed.','Sets the order of the beginner topics.'],['Learning Python','Mark Lutz','The deep reference used to check each lesson.'],['Fluent Python','Luciano Ramalho, 2nd ed.','Names, mutability, copying and advanced topics.']],
  java: [['Head First Java','Sierra, Bates and Gee, 3rd ed.','Sets the order of the beginner topics.'],['Core Java, Volume I','Cay Horstmann','The deep reference used to check each lesson.'],['Effective Java','Joshua Bloch, 3rd ed.','The why behind equality, immutability and design.']]
};
function renderHome(){
  const C = CURRICULUM[lang], B = BUILT[lang];
  $('#home-lang').textContent = `${L[lang].name}: ${ALL_LESSONS[lang].length} lessons ready. Switch language with the tabs above.`;
  const levels = [...new Set(C.map(t=>t.level))];
  $('#home-levels').innerHTML = levels.map(lv=>{
    const ts = C.filter(t=>t.level===lv);
    const name = lv.replace(/^Level \d+: /,'');
    const sub = {Beginner:'Values, strings, conditions, loops and functions.', Intermediate:'Functions in depth and the full OOP core.', 'Intermediate, the OOP core':'Classes, encapsulation, inheritance, polymorphism, abstraction.', Professional:'Closures, generators, advanced OOP and design.'}[name] || '';
    return `<div class="level-card"><h3>${esc(name)}</h3><p class="lv-sub">${esc(sub)}</p>` + ts.map(t=>{
      const built = B[t.n] || []; const done = built.filter(id=>hasTrophy(lang,id)).length;
      const total = Math.max(built.length, t.subs.length);
      return `<button class="ht" data-topic="${t.n}" ${built.length?'':'disabled'}><span class="htn">${t.n}</span><span>${esc(t.t)}</span><span class="htc${built.length && done===built.length?' full':''}">${built.length ? done+'/'+total : 'soon'}</span></button>`;
    }).join('') + `</div>`;
  }).join('');
  $('#home-levels').querySelectorAll('.ht[data-topic]:not([disabled])').forEach(b=> b.onclick = ()=>{ const B2 = BUILT[lang][b.dataset.topic]; const next = B2.find(id=>!hasTrophy(lang,id)) || B2[0]; goLesson(next); });
  $('#home-books').innerHTML = ['py','java'].map(lg=>`<div class="book-card"><h3>${esc(L[lg].name)}</h3><ul>` + BOOKS[lg].map(([t,a,w])=>`<li><b style="color:var(--ink)">${esc(t)}</b> (${esc(a)}). ${esc(w)}</li>`).join('') + `</ul></div>`).join('');
  const last = store.get('cs.last.'+lang), cont = $('#home-continue');
  if(last && ALL_LESSONS[lang].includes(last)){ cont.hidden = false; cont.textContent = 'Continue where you left off: ' + lessonTitle(last) + ' →'; cont.onclick = ()=> goLesson(last); }
  else cont.hidden = true;
}
function goLesson(id){ setMode('lesson'); openLesson(id); }
function goHome(){ setMode('home'); }
$('#home-py').onclick = ()=>{ if(lang!=='py') setLang('py'); goLesson(firstLesson('py')); };
$('#home-java').onclick = ()=>{ if(lang!=='java') setLang('java'); goLesson(firstLesson('java')); };
