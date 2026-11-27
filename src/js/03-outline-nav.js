/* 03-outline-nav.js: Course outline, trophies, step dots and lesson navigation. */
/* ---------------- outline ---------------- */
function trophyKey(lg, id){ return 'cs.trophy.'+lg+'.'+((id && id!=='alias') ? id : LESSON_ID); }
function hasTrophy(lg, id){ return store.get(trophyKey(lg, id))==='1'; }
const ALL_LESSONS = { get py(){ return [].concat(...Object.values(BUILT.py)); }, get java(){ return [].concat(...Object.values(BUILT.java)); } };
function lessonTitle(id){ return id==='alias' ? 'Why did both lists change?' : TL_LESSONS[id].title; }
const openTopics = {py:new Set(), java:new Set()};
function renderOutline(){
  const C = CURRICULUM[lang], B = BUILT[lang], curT = topicOf(lang, lessonId);
  if(curT) openTopics[lang].add(curT);
  let h = `<h3>${esc(L[lang].name)} course</h3>`, lvl = null;
  C.forEach(t=>{
    if(t.level!==lvl){ lvl = t.level; const nT = C.filter(x=>x.level===lvl); const nb = nT.reduce((c,x)=>c+(B[x.n]||[]).length,0);
      h += `<div class="level"><span>${esc(lvl.replace(/^Level \d+: /,''))}</span><span class="lvl-n">${nb ? nb+' built' : 'planned'}</span></div>`; }
    const built = (B[t.n]||[]).map(id=>({lesson:id, title:lessonTitle(id)}));
    const subs = built.concat(t.subs.slice(built.length));
    const total = subs.length, done = built.filter(s=>hasTrophy(lang, s.lesson)).length;
    const open = openTopics[lang].has(t.n);
    h += `<div class="topic${built.length?'':' later'}"><button class="topic-btn" aria-expanded="${open}" data-topic="${t.n}"><span class="tnum">${t.n}</span><span>${esc(t.t)}</span><span class="tcount" title="${done} of ${total} complete${built.length?'':', not built yet'}">${built.length ? done+'/'+total : '·'}</span></button>`;
    h += `<ul class="subs"${open?'':' hidden'}>` + subs.map(s=> s.lesson
      ? `<li><button class="sub${s.lesson===lessonId?' active':''}${hasTrophy(lang, s.lesson)?' done':''}"${s.lesson===lessonId?' aria-current="page"':''} data-lesson="${s.lesson}">${esc(s.title)}</button></li>`
      : `<li><button class="sub" disabled>${esc(s)}<span class="soon">planned</span></button></li>`).join('') + `</ul></div>`;
  });
  $('#outline').innerHTML = h;
  $('#outline').querySelectorAll('.topic-btn').forEach(b=> b.onclick = ()=>{ const ul=b.nextElementSibling; ul.hidden=!ul.hidden; b.setAttribute('aria-expanded', !ul.hidden); openTopics[lang][ul.hidden?'delete':'add'](b.dataset.topic); });
  $('#outline').querySelectorAll('[data-lesson]').forEach(ls=> ls.onclick = ()=>{ openLesson(ls.dataset.lesson); if(innerWidth<=980) setOutline(false); });
  const ct = C.find(t=>t.n===curT);
  $('#crumbs').textContent = `${L[lang].name} › ${ct ? ct.n+' '+ct.t : ''}`;
  $('#trophy-count').textContent = ['py','java'].reduce((c,lg)=>c + ALL_LESSONS[lg].filter(id=>hasTrophy(lg,id)).length, 0);
}
function setOutline(open){ $('#main').classList.toggle('no-outline', !open); $('#toggle-outline').setAttribute('aria-expanded', open); }
$('#toggle-outline').onclick = ()=> setOutline($('#main').classList.contains('no-outline'));
$('#scrim').onclick = ()=> setOutline(false);
if(innerWidth<=980) setOutline(false);

/* ---------------- dots ---------------- */
function renderDots(){
  $('#dots').innerHTML = STEPS.map((s,i)=>`<button class="dot${i<step?' seen':''}${i===step?' now':''}${i>0&&STEPS[i-1].phase!==s.phase?' gap':''}" aria-label="Step ${i+1}: ${esc(pick(s.title))}" ${i>maxSeen?'disabled':''} data-i="${i}"></button>`).join('');
  $('#dots').querySelectorAll('.dot').forEach(d=> d.onclick = ()=> go(+d.dataset.i));
}
let maxSeen = 0;

/* ---------------- navigation ---------------- */
function render(animate){
  const s = renderScene();
  renderExplain(); renderCode(); renderDots();
  if(animate) playScene(s); else stopAnims();
}
function go(i, animate=true){ step = Math.max(0, Math.min(STEPS.length-1, i)); maxSeen = Math.max(maxSeen, step); render(animate); }
function next(){
  if(!canAdvance()) return;
  if(step === STEPS.length-1){ finish(); return; }
  go(step+1, true);
}
function back(){ if(step>0) go(step-1, false); }
function replay(){ if(paused) togglePause(); render(true); }
function togglePause(){
  paused = !paused;
  running.forEach(a=>{ try{ paused ? a.pause() : a.play(); }catch(e){} });
  $('#canvas').classList.toggle('paused', paused);
  const b = $('#b-pause'); if(b){ b.innerHTML = paused?ICON.play:ICON.pause; b.setAttribute('aria-label', (paused?'Resume':'Pause')+' animation'); }
}
function finish(){ finishLesson('alias'); }
function finishLesson(id){
  const had = hasTrophy(lang, id);
  if(!had){ store.set(trophyKey(lang, id),'1'); if(typeof Auth!=='undefined') Auth.save(); }
  toast(had ? 'Lesson complete. You already have this trophy, so no new one this time.' : 'Trophy earned: ' + lessonTitle(id) + ' (' + L[lang].name + ')');
  renderOutline();
}
function openLesson(id){
  if(!ALL_LESSONS[lang].includes(id)) id = 'alias';
  store.set('cs.last.'+lang, id);
  if(id==='alias'){ lessonId = 'alias'; $('#tl').hidden = true; $('#canvas').hidden = false; $('.lesson-title').textContent = lessonTitle('alias'); renderOutline(); go(0); }
  else { stopAnims(); renderOutline(); openTL(id).then(renderOutline); }
}
let tt; function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(tt); tt=setTimeout(()=>t.hidden=true, 3600); }
