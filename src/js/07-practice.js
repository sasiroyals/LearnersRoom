/* 07-practice.js: Practice mode: editor, examples and the step debugger panel. */
/* ---------- panels ---------- */
function renderPracticeCode(){
  const T = pr.trace, v = $('#pr-view');
  if(!T) return;
  const cur = T.steps[pr.i];
  /* For function problems the site adds an example call after "# example". Show it apart, so it is not mistaken for the student's code. */
  const p = curProblem(), exAt = p && !isOutProb(p) ? T.src.lastIndexOf('# example') : -1;
  v.innerHTML = `<pre class="code">` + (pr.pre ? `<div class="demo-head">Example 1's input, set by the site. Not part of your answer.</div>` : '') + T.src.map((t,k)=>{
    if(k===exAt) return `<div class="demo-head">Added by the site to try your function on example 1. Not part of your answer.</div>`;
    const here = cur.line === k+1;
    const cls = (here ? (cur.error ? ' err' : ' active') : '') + ((exAt>=0 && k>exAt) || k<pr.pre ? ' demo' : '');
    return `<div class="ln${cls}"${here?' aria-current="true"':''}><span class="n">${k+1}</span><span class="here">${here?(cur.error?'!':'▶'):''}</span><span>${hl(t)||' '}</span></div>`;
  }).join('') + `</pre>`;
  const a = v.querySelector('.ln.active, .ln.err'); if(a) a.scrollIntoView({block:'nearest'});
}
function renderDbg(){
  const T = pr.trace, box = $('#pr-dbg');
  const cur = T.steps[pr.i], n = T.steps.length;
  const ex = explainStep(T, pr.i);
  let h = `<div class="meta"><span>Step ${pr.i+1} of ${n}</span><span class="phase">${cur.frames.length>1 ? 'inside '+esc(cur.frames[cur.frames.length-1].name) : 'top level'}</span></div>`;
  const noStart = cur.error && n===1;
  h += `<h2 class="step-title">${noStart ? 'Python could not run this code' : pr.i===0 ? 'Ready to run' : 'Line '+ex.ran+' ran'}</h2>`;
  if(pr.i>0) h += `<div class="nextline" style="border-style:solid">${code$(ex.ranTxt)}</div>`;
  if(!noStart) h += `<ul class="happen">` + ex.items.filter(it=>it.k!=='err').map(it=>`<li class="k-${it.k}"><span>${it.h}</span></li>`).join('') + `</ul>`;
  const todo = unfinishedFns(T.src.join('\n'));
  if(todo.length && !cur.error) h += `<div class="errbox warn"><b>Not written yet.</b> ${esc(todo[0])}() still has only pass inside, so it gives back None. Write its body, then step through again.</div>`;
  if(cur.error){ const help = explainError(cur.errorType, cur.error, T.src.join('\n')); h += `<div class="errbox"><b>${esc(cur.errorType||'Error')}</b> on line ${cur.line}. ${help ? esc(help) : 'Read the highlighted line: the error happened while Python was running it.'}</div>`; }
  else if(cur.done) h += `<div class="nextline"><b>Finished.</b> The program reached the end. Step back to review any line, or edit the code and run it again.</div>`;
  else h += `<div class="nextline"><b>Next:</b> line ${cur.line} ${code$(T.src[cur.line-1]||'')}</div>`;
  h += `<input type="range" class="scrub" id="pr-scrub" min="0" max="${n-1}" value="${pr.i}" aria-label="Jump to step">`;
  const atEnd = pr.i >= n-1;
  h += `<div class="dctl">
    <button class="btn" id="pr-back" ${pr.i===0?'disabled':''} title="Back one step (←)">← Back</button>
    <button class="btn primary" id="pr-step" ${atEnd?'disabled':''} title="Next step (→)">Step →</button>
    <button class="btn" id="pr-over" ${atEnd?'disabled':''} title="Run the whole line, including any function it calls">Step over</button>
    <button class="btn" id="pr-out-btn" ${atEnd || cur.frames.length<2?'disabled':''} title="Finish the current function">Step out</button>
    <button class="btn" id="pr-end" ${atEnd?'disabled':''}>Run to end</button>
  </div>`;
  box.innerHTML = h;
  box.querySelector('#pr-back').onclick = ()=>prGo(pr.i-1);
  box.querySelector('#pr-step').onclick = ()=>prGo(pr.i+1);
  box.querySelector('#pr-over').onclick = ()=>{ const d = cur.frames.length; let j = pr.i+1; while(j < n-1 && T.steps[j].frames.length > d) j++; prGo(j); };
  box.querySelector('#pr-out-btn').onclick = ()=>{ const d = cur.frames.length; let j = pr.i+1; while(j < n-1 && T.steps[j].frames.length >= d) j++; prGo(j); };
  box.querySelector('#pr-end').onclick = ()=>prGo(n-1);
  box.querySelector('#pr-scrub').oninput = e=>prGo(+e.target.value, true);
}
function renderOut(){
  const T = pr.trace, o = $('#pr-out');
  if(!T){ o.textContent=''; $('#pr-outcount').textContent=''; return; }
  const cur = T.steps[pr.i], prev = T.steps[pr.i-1];
  const old = prev ? prev.out : '';
  const same = cur.out.startsWith(old);
  o.innerHTML = same ? esc(old) + (cur.out.length>old.length ? `<span class="new">${esc(cur.out.slice(old.length))}</span>` : '') : esc(cur.out);
  if(cur.error) o.innerHTML += `\n<span style="color:var(--bad)">${esc(cur.error)}</span>`;
  o.scrollTop = o.scrollHeight;
}
function prGo(i, fromScrub){
  if(!pr.trace) return;
  pr.i = Math.max(0, Math.min(pr.trace.steps.length-1, i));
  renderPracticeCode(); renderMem(); renderOut();
  if(fromScrub){ const keep = document.activeElement && document.activeElement.id==='pr-scrub'; renderDbg(); if(keep){ const s=$('#pr-scrub'); s && s.focus(); } }
  else { renderDbg(); }
}
/* ---------- practice: problems (one per lesson sub-topic), lesson code, examples ----------
   Views of #practice:
     list   the problem set, grouped by level and topic
     solve  a problem: Description / Hints / Solution on the left, the editor and test results on the right
     debug  stepping through code (the student's or the solution) with the memory view
     play   the free editor: blank, examples and lesson code */
const GFG = {
  basics:'https://www.geeksforgeeks.org/python-basics-coding-practice-problems/',
  strings:'https://www.geeksforgeeks.org/python/python-string-exercise/',
  lists:'https://www.geeksforgeeks.org/python/python-list-exercise/',
  dicts:'https://www.geeksforgeeks.org/python/python-dictionary-exercise/',
  functions:'https://www.geeksforgeeks.org/python/python-functions-coding-practice-problems/',
  data:'https://www.geeksforgeeks.org/python/python-data-structures-practice-problems-1/',
  oop:'https://www.geeksforgeeks.org/python/python-oops-exercise-questions/',
  all:'https://www.geeksforgeeks.org/python-exercises-practice-questions-and-solutions/'
};
const GFG_TOPIC = {'00':'basics','01':'basics','02':'basics','03':'strings','04':'basics','05':'lists','06':'basics','07':'dicts','08':'functions','09':'functions','10':'data','11':'data',
  '12':'oop','13':'oop','14':'oop','15':'oop','16':'oop','21':'oop','25':'data','26':'data','27':'data','28':'data'};
const gfgFor = n => GFG[GFG_TOPIC[n] || 'all'];
/* More problems on the same idea: a site search, so the link keeps working when GeeksforGeeks moves pages. */
const gfgSearch = q => 'https://www.google.com/search?q=' + encodeURIComponent('site:geeksforgeeks.org ' + q);
const ALL_PROBLEMS = [], PROB_BY_ID = {}, PROB_BY_LESSON = {};
inTopicOrder(PROBLEMS).forEach((ps, k)=> ps.forEach(p=>{ const q = Object.assign({topic:Object.keys(PROBLEMS).sort()[k]}, p); ALL_PROBLEMS.push(q); PROB_BY_ID[p.id] = q; PROB_BY_LESSON[p.lesson] = q; }));
const probLessonTitle = id => id==='alias' ? 'Why did both lists change?' : TL_LESSONS[id] ? TL_LESSONS[id].title : id;
const solvedKey = id => 'cs.solved.py.' + id;
const isSolved = id => store.get(solvedKey(id)) === '1';
const draftKey = id => 'cs.draft.py.' + id;
const isOutProb = p => p && p.kind==='output';
const normOut = t => String(t||'').split('\n').map(l=>l.replace(/\s+$/,'')).join('\n').replace(/^\n+|\n+$/g,'');
function problemCount(n){ return (PROBLEMS[n] || []).length; }
function solvedCount(n){ return (PROBLEMS[n] || []).filter(p=>isSolved(p.id)).length; }
Object.assign(pr, {view:'list', tab:'desc', hints:{}, solShown:new Set(), filter:{level:'all', status:'all'}, pre:0});

function curSel(){ return pr.sel[lang]; }
function curProblem(){ const s = curSel(); return pr.view!=='play' && s && s.kind==='problem' ? PROB_BY_ID[s.id] : null; }
function setView(v){ pr.view = v; const el = $('#practice'); ['list','solve','debug','play'].forEach(k=> el.classList.toggle('view-'+k, k===v)); }

/* ----- the problem set ----- */
function renderList(){
  const box = $('#pr-list');
  if(lang==='java'){
    box.innerHTML = `<div class="pset-in"><h1>Problems</h1><p class="pset-sub">Java problems arrive with the Java runner. Switch to Python to practice now, or use the <button type="button" class="link-btn inline" id="pset-blank">blank editor</button> to read and edit Java.</p></div>`;
    $('#pset-blank').onclick = ()=> $('#pr-blank').click();
    return;
  }
  const F = pr.filter, total = ALL_PROBLEMS.length, done = ALL_PROBLEMS.filter(p=>isSolved(p.id)).length;
  let h = `<div class="pset-in"><div class="pset-top"><div><h1>Problems</h1><p class="pset-sub">One problem for every lesson. Read it, try it, open a hint when you are stuck, and step through the solution line by line to see how it works.</p></div>
    <div class="pset-prog"><span><b>${done}</b> of ${total} solved</span><span class="bar"><i style="width:${total ? done/total*100 : 0}%"></i></span></div></div>
    <div class="pset-filters" role="group" aria-label="Filter problems">` +
    ['all','Easy','Medium','Hard'].map(l=>`<button type="button" class="chip" data-flevel="${l}" aria-pressed="${F.level===l}">${l==='all' ? 'All levels' : l}</button>`).join('') + `<span class="sep" aria-hidden="true"></span>` +
    [['all','All'],['todo','Not solved'],['done','Solved']].map(([k,l])=>`<button type="button" class="chip" data-fstatus="${k}" aria-pressed="${F.status===k}">${l}</button>`).join('') + `</div>`;
  let lastLevel = '', shown = 0;
  CURRICULUM.py.forEach(t=>{
    const ps = (PROBLEMS[t.n] || []).map(p=>PROB_BY_ID[p.id]).filter(p=> (F.level==='all' || p.level===F.level) && (F.status==='all' || (F.status==='done')===isSolved(p.id)));
    if(!ps.length) return;
    shown += ps.length;
    if(t.level!==lastLevel){ lastLevel = t.level; h += `<h2 class="pset-level">${esc(t.level)}</h2>`; }
    const sc = solvedCount(t.n), all = problemCount(t.n);
    h += `<section class="pset-topic"><div class="pset-th"><span class="tnum">${t.n}</span><h3>${esc(t.t)}</h3><span class="lib-cnt${sc===all?' full':''}">${sc}/${all}</span><a class="gfg" href="${gfgFor(t.n)}" target="_blank" rel="noopener">GeeksforGeeks exercises ↗</a></div><ol class="pset-rows">` +
      ps.map(p=>{ const ok = isSolved(p.id); return `<li><button type="button" class="pset-row" data-prob="${p.id}"><span class="st${ok?' ok':''}" aria-label="${ok?'Solved':'Not solved'}">${ok?'✓':''}</span><span class="pt">${esc(p.title)}</span><span class="ps">${esc(probLessonTitle(p.lesson))}</span><span class="lvl lvl-${p.level.toLowerCase()}">${p.level}</span></button></li>`; }).join('') + `</ol></section>`;
  });
  if(!shown) h += `<p class="pset-empty">No problems match these filters.</p>`;
  box.innerHTML = h + `</div>`;
  box.querySelectorAll('[data-flevel]').forEach(b=> b.onclick = ()=>{ pr.filter.level = b.dataset.flevel; renderList(); });
  box.querySelectorAll('[data-fstatus]').forEach(b=> b.onclick = ()=>{ pr.filter.status = b.dataset.fstatus; renderList(); });
  box.querySelectorAll('[data-prob]').forEach(b=> b.onclick = ()=> openProblem(b.dataset.prob));
}

/* ----- one problem: Description / Hints / Solution ----- */
const exIn = (p, t)=> isOutProb(p) ? (t.before ? t.before.trim() : '(no input)') : (t.setup ? t.setup.trim() + '\n' : '') + t.call;
const exOut = (p, t)=> isOutProb(p) ? t.output.replace(/\n$/,'') : t.expect;
const codeBlock = src => `<pre class="code sol-code">` + src.replace(/\s+$/,'').split('\n').map((t,k)=>`<div class="ln"><span class="n">${k+1}</span><span>${hl(t)||' '}</span></div>`).join('') + `</pre>`;
function renderDesc(){
  const p = curProblem(), box = $('#pr-desc'); if(!p) return;
  const t = CURRICULUM.py.find(x=>x.n===p.topic), i = ALL_PROBLEMS.indexOf(p), nHints = pr.hints[p.id] || 0;
  let h = `<div class="desc-nav"><button type="button" class="link-btn" id="pd-list">← All problems</button><span class="spacer"></span>
    <button type="button" class="ghost sm" id="pd-prev" ${i<=0?'disabled':''} aria-label="Previous problem" title="Previous problem">‹</button>
    <button type="button" class="ghost sm" id="pd-next" ${i>=ALL_PROBLEMS.length-1?'disabled':''} aria-label="Next problem" title="Next problem">›</button></div>
    <div class="desc-tabs" role="tablist" aria-label="Problem">` +
    [['desc','Description'],['hints','Hints'],['sol','Solution']].map(([k,l])=>`<button type="button" role="tab" data-dtab="${k}" aria-selected="${pr.tab===k}">${l}</button>`).join('') + `</div><div class="desc-body">`;
  if(pr.tab==='desc'){
    h += `<h1 class="desc-title">${i+1}. ${esc(p.title)}</h1>
      <div class="prob-meta"><span class="lvl lvl-${p.level.toLowerCase()}">${p.level}</span><span>${esc(p.topic+' '+(t?t.t:''))}</span>${isSolved(p.id)?'<span class="solved-pill">✓ Solved</span>':''}</div>
      <div class="desc-story">${p.story.split(/\n\n+/).map(x=>`<p>${esc(x)}</p>`).join('')}</div>` +
      p.tests.slice(0,2).map((x,k)=>`<div class="ex"><div class="ex-h">Example ${k+1}</div><div class="ex-k">Input</div><pre>${esc(exIn(p,x))}</pre><div class="ex-k">${isOutProb(p) ? 'Prints' : 'Returns'}</div><pre>${esc(exOut(p,x))}</pre></div>`).join('') +
      (p.tests.length>2 ? `<p class="desc-note">Submit also checks ${p.tests.length===3 ? '1 more test that is' : (p.tests.length-2)+' more tests that are'} not shown here.</p>` : '') +
      (isOutProb(p) && p.tests[0].before ? `<p class="desc-note">The site sets the input names before your code runs, so do not set them yourself.</p>` : '') +
      `<div class="desc-links"><button type="button" class="link-btn inline" id="pd-lesson">Review the lesson: ${esc(probLessonTitle(p.lesson))}</button>
      <a class="gfg" href="${gfgSearch(p.gfg)}" target="_blank" rel="noopener">More problems like this on GeeksforGeeks ↗</a></div>`;
  } else if(pr.tab==='hints'){
    h += `<h2 class="desc-h">Hints</h2><p class="desc-note">Open one hint at a time, and try again after each one.</p><ol class="hints">` +
      p.hints.slice(0, nHints).map((x,k)=>`<li><b>Hint ${k+1}</b><p>${esc(x)}</p></li>`).join('') + `</ol>` +
      (nHints < p.hints.length ? `<button type="button" class="btn" id="pd-hint">${nHints ? 'Show the next hint' : 'Show hint 1'}</button>`
        : `<p class="desc-note">That is every hint. Still stuck? The Solution tab explains the idea and lets you step through it.</p>`);
  } else if(!pr.solShown.has(p.id)){
    h += `<div class="sol-gate"><h2 class="desc-h">Solution</h2><p>Give it a real try first: you learn the most from the attempt, even a wrong one. When you are ready, open the solution and step through it one line at a time.</p><button type="button" class="btn primary" id="pd-showsol">Show the solution</button></div>`;
  } else {
    h += `<h2 class="desc-h">The idea</h2><p class="desc-approach">${esc(p.approach)}</p><h2 class="desc-h">Code</h2>${codeBlock(p.solution)}
      <div class="sol-actions"><button type="button" class="btn primary" id="pd-debugsol">Step through the solution</button><button type="button" class="btn" id="pd-copysol">Copy into my editor</button></div>`;
  }
  box.innerHTML = h + `</div>`;
  box.querySelector('#pd-list').onclick = ()=>{ setView('list'); renderList(); };
  box.querySelector('#pd-prev').onclick = ()=> openProblem(ALL_PROBLEMS[i-1].id);
  box.querySelector('#pd-next').onclick = ()=> openProblem(ALL_PROBLEMS[i+1].id);
  box.querySelectorAll('[data-dtab]').forEach(b=> b.onclick = ()=>{ pr.tab = b.dataset.dtab; renderDesc(); });
  const on = (id, f)=>{ const b = box.querySelector(id); if(b) b.onclick = f; };
  on('#pd-lesson', ()=> goLesson(p.lesson));
  on('#pd-hint', ()=>{ pr.hints[p.id] = nHints + 1; renderDesc(); });
  on('#pd-showsol', ()=>{ pr.solShown.add(p.id); renderDesc(); });
  on('#pd-debugsol', ()=> prStart(false, true));
  on('#pd-copysol', ()=>{ $('#pr-code').value = p.solution; $('#pr-code').dispatchEvent(new Event('input')); pr.results = null; renderConsole(); $('#pr-code').focus(); });
}

/* ----- the free editor's library: quick examples and every lesson's code ----- */
const libOpen = new Set();
function renderLib(){
  const C = CURRICULUM[lang], sel = curSel() || {};
  let h = `<div class="lib-topic"><div class="lib-sub">Quick examples</div><ul>` + EXAMPLES[lang].map(e=>`<li><button class="lib-item${sel.kind==='example' && sel.id===e.id?' active':''}" data-ex="${e.id}"><span class="lib-t">${esc(e.t)}</span></button></li>`).join('') + `</ul></div>`;
  C.forEach(t=>{
    const ids = (BUILT[lang][t.n] || []).filter(id=>id!=='alias' && TL_LESSONS[id]); if(!ids.length) return;
    const open = libOpen.has('L'+t.n);
    h += `<div class="lib-topic"><button class="lib-tbtn" data-ltopic="L${t.n}" aria-expanded="${open}"><span class="tnum">${t.n}</span><span>${esc(t.t)}</span><span class="lib-cnt">${ids.length}</span></button><ul${open?'':' hidden'}>` +
      ids.map(id=>`<li><button class="lib-item${sel.kind==='lesson' && sel.id===id?' active':''}" data-les="${id}"><span class="lib-t">${esc(TL_LESSONS[id].title)}</span></button></li>`).join('') + `</ul></div>`;
  });
  $('#lib-list').innerHTML = h;
  $('#lib-list').querySelectorAll('[data-ltopic]').forEach(b=> b.onclick = ()=>{ const k = b.dataset.ltopic; libOpen.has(k) ? libOpen.delete(k) : libOpen.add(k); renderLib(); });
  $('#lib-list').querySelectorAll('[data-les]').forEach(b=> b.onclick = ()=>{ prOpenCode(TL_LESSONS[b.dataset.les].code, 'Lesson: ' + TL_LESSONS[b.dataset.les].title, {kind:'lesson', id:b.dataset.les}, true); closeLibIfNarrow(); });
  $('#lib-list').querySelectorAll('[data-ex]').forEach(b=> b.onclick = ()=>{ const e = EXAMPLES[lang].find(x=>x.id===b.dataset.ex); $('#pr-input').value = e.inp || ''; prOpenCode(e.c, e.t, {kind:'example', id:e.id}, true); closeLibIfNarrow(); });
}
function setLibOpen(open){ $('#practice').classList.toggle('lib-open', open); $('#lib-toggle').setAttribute('aria-expanded', open); }
function closeLibIfNarrow(){ if(innerWidth <= 1440) setLibOpen(false); }
$('#lib-toggle').onclick = ()=> setLibOpen(!$('#practice').classList.contains('lib-open'));
$('#lib-scrim').onclick = ()=> setLibOpen(false);
$('#lib-problems').onclick = ()=>{ setLibOpen(false); pr.view = 'list'; renderPractice(); };

/* Open any code in the free editor (from a lesson, an example, or the blank button). */
function prOpenCode(code, title, sel, stay){
  pr.sel[lang] = sel || {kind:'lesson', id:null, title};
  if(sel) pr.sel[lang].title = title;
  pr.code[lang] = code;
  pr.view = 'play';
  if(stay && mode==='practice') renderPractice(); else setMode('practice');
}
function openProblem(id){
  const p = PROB_BY_ID[id]; if(!p) return;
  if(lang!=='py') setLang('py');
  pr.sel.py = {kind:'problem', id, title:p.title};
  pr.code.py = store.get(draftKey(id)) || p.starter;
  pr.results = null; pr.watching = false; pr.tab = 'desc'; pr.view = 'solve';
  if(mode==='practice') renderPractice(); else setMode('practice');
  $('#practice').scrollTop = 0; scrollTo(0, 0);
  const d = $('#pr-desc .desc-body'); if(d) d.scrollTop = 0;
}
function openTopicProblems(n){ const ps = PROBLEMS[n] || []; if(!ps.length) return; const p = ps.find(x=>!isSolved(x.id)) || ps[0]; openProblem(p.id); }

/* ----- test results under the editor ----- */
function testItem(p, t, r, k){
  const st = !r ? 'idle' : r.ok ? 'ok' : 'bad', ico = st==='ok' ? '✓' : st==='bad' ? '✗' : '○';
  if(st==='ok') return `<li class="t-ok t-short"><span class="t-ico">✓</span><div class="t-name">${k<2 ? 'Example '+(k+1) : 'Test '+(k+1)}</div></li>`;
  const head = `<div class="t-name">${k<2 ? 'Example '+(k+1) : 'Test '+(k+1)}</div><div class="ex-k">Input</div><pre class="t-setup">${esc(exIn(p,t))}</pre><div class="ex-k">Expected</div><pre class="t-setup">${esc(exOut(p,t))}</pre>`;
  let got = '';
  if(r && !r.ok) got = r.error ? `<div class="t-got">${esc(r.error)}</div>` : `<div class="ex-k">Yours</div><pre class="t-setup t-yours">${esc(isOutProb(p) ? (r.got || '(nothing printed)') : r.got)}</pre>`;
  return `<li class="t-${st}"><span class="t-ico">${ico}</span><div>${head}${got}${r && r.help ? `<div class="t-help">${esc(r.help)}</div>` : ''}</div></li>`;
}
function renderConsole(){
  const p = curProblem(), box = $('#pr-console'), R = pr.results;
  if(!p || !R || !pr.editing){ box.hidden = true; box.innerHTML = ''; return; }
  const all = R.pass===R.total;
  let h = `<div class="con-head ${all?'ok':'bad'}"><b>${R.kind==='submit' ? (all ? 'Accepted' : 'Not accepted yet') : (all ? 'The examples pass' : 'Not right yet')}</b><span>${R.pass} of ${R.total} ${R.kind==='submit' ? 'tests' : 'examples'} passed</span><span class="spacer"></span><button type="button" class="link-btn" id="con-close">Hide</button></div>`;
  if(all && R.kind==='submit') h += `<div class="win-box"><b>Solved!</b> Step through your code to watch it work, or move on to the next problem.</div><button type="button" class="btn primary" id="pr-next">Next problem →</button>`;
  h += `<ul class="tests">` + R.items.map((r,j)=> testItem(p, p.tests[R.idx[j]], r, R.idx[j])).join('') + `</ul>`;
  if(all && R.kind==='run') h += `<p class="dbg-tip">Now press <b>Submit</b> to check the tests that are not shown too.</p>`;
  else if(!all) h += `<p class="dbg-tip">Press <b>Step through</b> to watch your code run on example 1 one line at a time, or open the <button type="button" class="link-btn inline" id="con-hints">Hints</button> tab.</p>`;
  box.innerHTML = h; box.hidden = false;
  box.querySelector('#con-close').onclick = ()=>{ pr.results = null; renderConsole(); };
  const nx = box.querySelector('#pr-next'); if(nx) nx.onclick = ()=>{ const i = ALL_PROBLEMS.indexOf(p); const nxt = ALL_PROBLEMS.slice(i+1).find(x=>!isSolved(x.id)) || ALL_PROBLEMS[(i+1) % ALL_PROBLEMS.length]; openProblem(nxt.id); };
  const hb = box.querySelector('#con-hints'); if(hb) hb.onclick = ()=>{ pr.tab = 'hints'; renderDesc(); };
}

function setEditing(on){
  pr.editing = on;
  const prob = !!curProblem();
  $('#pr-edit').hidden = !on; $('#pr-view').hidden = on;
  $('#pr-edit-btn').hidden = on; $('#pr-edit-btn').textContent = prob ? '← Back to the problem' : 'Edit code';
  $('#pr-debug').hidden = !on; $('#pr-run').hidden = !on || prob;
  $('#pr-test').hidden = !on || !prob; $('#pr-submit').hidden = !on || !prob; $('#pr-reset').hidden = !on || !prob;
  $('#pr-solbar').hidden = !pr.watching || on;
  if(on){
    pr.watching = false; pr.trace = null; pr.pre = 0; $('#pr-solbar').hidden = true;
    $('#pr-canvas').innerHTML = `<div class="pv-empty">Press <b>Step through</b> to watch your program run one line at a time. Each name appears on the left, each object on the right, and an arrow shows which object a name refers to.</div>`;
    if(prob){ setView('solve'); renderConsole(); } else renderSideIdle();
  }
}
function renderSideIdle(){
  $('#pr-dbg').innerHTML = `<div class="meta"><span>Editing</span></div><h2 class="step-title">What is happening</h2><p style="margin:0;color:var(--muted)">Press <b>Step through</b>. This panel will explain every line as it runs: which names changed, which objects were created or changed, and which way each condition went.</p>`;
}
/* The program the debugger runs. For a problem: the input of example 1 first, or the student's
   function followed by a call with example 1's arguments. */
function debugProgram(p, code){
  if(!p) return {src: code, pre: 0};
  const t = p.tests[0];
  if(isOutProb(p)){ const pre = (t.before || '').trim(); return pre ? {src: pre + '\n' + code, pre: pre.split('\n').length} : {src: code, pre: 0}; }
  return {src: code.replace(/\s*$/,'\n') + '\n# example\n' + (t.setup ? t.setup.replace(/\s*$/,'\n') : '') + 'print(' + t.call + ')\n', pre: 0};
}
async function prStart(runAll, solution){
  if(pr.busy || lang==='java') return;
  const p = curProblem();
  pr.busy = true; $('#pr-status').textContent = window.Sk ? 'Running…' : 'Loading the Python runner…';
  const inputs = $('#pr-input').value.split(',').map(s=>s.trim()).filter(s=>s.length);
  try{
    const prog = debugProgram(p, solution ? p.solution : $('#pr-code').value);
    const t = await tracePy(prog.src, inputs);
    setEditing(false); pr.trace = t; pr.pre = prog.pre; pr.watching = !!solution;
    if(p) setView('debug');
    $('#pr-solbar').hidden = !pr.watching;
    $('#pr-status').textContent = '';
    prGo(runAll ? pr.trace.steps.length-1 : 0);
    if(!runAll){ const s = $('#pr-step'); s && s.focus(); }
  }catch(e){
    $('#pr-status').textContent = e.message || String(e);
  }
  pr.busy = false;
}
/* Why the printed output differs, in plain words. */
function outputHelp(got, want){
  if(!got) return 'Nothing was printed. Use print(...) to show the answer.';
  const g = got.split('\n'), w = want.split('\n');
  if(g.length !== w.length) return `Your program printed ${g.length} line${g.length>1?'s':''}, but ${w.length} ${w.length>1?'are':'is'} expected. Each print(...) makes one line.`;
  const i = g.findIndex((l,k)=>l!==w[k]);
  if(g[i].toLowerCase()===w[i].toLowerCase()) return `Line ${i+1} is nearly right: check the capital letters.`;
  if(g[i].replace(/\s/g,'')===w[i].replace(/\s/g,'')) return `Line ${i+1} is nearly right: check the spaces.`;
  return `Line ${i+1} should be ${w[i]}, but your program printed ${g[i]}.`;
}
/* Why a test gave the wrong value, in plain words, when we can tell. */
function wrongResultHelp(got, expect, code){
  const todo = unfinishedFns(code);
  if(todo.length) return `${todo[0]}() still has only pass inside, so it gives back None. Replace pass with your own code.`;
  if(/\bNone\b/.test(got) && !/\bNone\b/.test(expect)) return /\bprint\(/.test(code) && !/\breturn\b/.test(code) ? 'Your function prints the answer but does not return it. Use return so the caller gets the value.' : 'Your function gave back None. Check that every path through it ends with a return line.';
  if(/^['"]/.test(expect) && !/^['"]/.test(got)) return 'The test expects text (a string). Your answer is a different type. Wrap it with str(), or return the text itself.';
  if(/^-?\d/.test(expect) && /^['"]/.test(got)) return 'The test expects a number, but your answer is text in quotes. Return the number itself, or convert with int().';
  return '';
}
/* Run: the examples only. Submit: every test; all passing marks the problem solved. */
async function prRunTests(kind){
  const p = curProblem(); if(!p || pr.busy) return;
  kind = kind || 'submit';
  pr.busy = true; const btns = [$('#pr-test'), $('#pr-submit')]; btns.forEach(b=> b.disabled = true);
  $('#pr-status').textContent = window.Sk ? (kind==='run' ? 'Running the examples…' : 'Checking every test…') : 'Loading the Python runner…';
  const code = $('#pr-code').value.replace(/\s*$/,'\n');
  const idx = p.tests.map((_,i)=>i).filter(i=> kind==='submit' || i<2);
  const items = [];
  try{
    for(const i of idx){
      const t = p.tests[i];
      if(isOutProb(p)){
        const r = await runPy((t.before ? t.before.replace(/\s*$/,'\n') : '') + code);
        const got = normOut(r.out), want = normOut(t.output);
        if(r.error) items.push({ok:false, error:r.errorType + ': ' + r.error.replace(/^\w+:\s*/,''), help: explainError(r.errorType, r.error, code)});
        else items.push({ok: got===want, got, help: got===want ? '' : outputHelp(got, want)});
      } else {
        const r = await runPy(code + '\n' + (t.setup || '') + '\nprint("@@R" + repr(' + t.call + '))\n');
        const m = (r.out || '').match(/@@R(.*)\n?$/);
        if(r.error) items.push({ok:false, error:r.errorType + ': ' + r.error.replace(/^\w+:\s*/,''), help: explainError(r.errorType, r.error, code)});
        else if(!m) items.push({ok:false, error:'No result came back.'});
        else items.push({ok: m[1]===t.expect, got: m[1], help: m[1]!==t.expect ? wrongResultHelp(m[1], t.expect, code) : ''});
      }
    }
  }catch(e){ $('#pr-status').textContent = e.message || String(e); }
  const pass = items.filter(x=>x.ok).length;
  pr.results = {kind, idx, items, pass, total: idx.length};
  const wasSolved = isSolved(p.id);
  if(kind==='submit' && pass===p.tests.length && items.length===p.tests.length){ store.set(solvedKey(p.id), '1'); if(!wasSolved){ toast('Solved: ' + p.title); if(typeof Auth!=='undefined' && Auth.save) Auth.save(); } }
  if($('#pr-status').textContent.startsWith(window.Sk ? (kind==='run' ? 'Running' : 'Checking') : 'Loading')) $('#pr-status').textContent = '';
  btns.forEach(b=> b.disabled = false); pr.busy = false;
  renderConsole(); renderDesc();
}
function gutter(){ const n = $('#pr-code').value.split('\n').length; $('#pr-gutter').textContent = Array.from({length:n},(_,i)=>i+1).join('\n'); }
function renderPractice(){
  const java = lang==='java';
  if(java && pr.view!=='play') pr.view = 'list';
  if(pr.view==='list'){ setView('list'); renderList(); return; }
  if(pr.view==='debug') pr.view = curSel() && curSel().kind==='problem' ? 'solve' : 'play';
  if(!pr.sel[lang] || (pr.view==='solve' && curSel().kind!=='problem')){ setView('list'); renderList(); return; }
  if(pr.view==='play' && curSel().kind==='problem'){ const e = EXAMPLES[lang][0]; pr.sel[lang] = {kind:'example', id:e.id, title:e.t}; pr.code[lang] = e.c; }
  setView(pr.view);
  const sel = pr.sel[lang];
  $('#pr-title').textContent = sel.title || (L[lang].name + ' practice');
  $('#pr-code').value = pr.code[lang] != null ? pr.code[lang] : '';
  if(curProblem()) renderDesc(); else renderLib();
  gutter(); setEditing(true); $('#pr-out').textContent='';
  $('#pr-debug').disabled = java; $('#pr-run').disabled = java;
  const note = document.getElementById('pr-javanote');
  if(java && !note){ const d = document.createElement('div'); d.className='java-note'; d.id='pr-javanote'; d.innerHTML = '<b>Java runner coming next.</b> You can read and edit Java here now. Running it and stepping through it line by line needs the Java runner, which is being set up.'; $('#pr-edit').before(d); }
  if(!java && note) note.remove();
}
$('#pr-code').addEventListener('input', ()=>{ gutter(); pr.code[lang] = $('#pr-code').value; const p = curProblem(); if(p){ store.set(draftKey(p.id), $('#pr-code').value); } });
$('#pr-code').addEventListener('scroll', ()=>{ $('#pr-gutter').scrollTop = $('#pr-code').scrollTop; });
$('#pr-code').addEventListener('keydown', e=>{
  if(e.key==='Tab'){ e.preventDefault(); const t=e.target, s=t.selectionStart; t.setRangeText('    ', s, t.selectionEnd, 'end'); gutter(); pr.code[lang] = t.value; }
  if(e.key==='Enter' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); curProblem() ? prRunTests('run') : prStart(false); }
});
$('#pr-debug').onclick = ()=>prStart(false);
$('#pr-run').onclick = ()=>prStart(true);
$('#pr-test').onclick = ()=>prRunTests('run');
$('#pr-submit').onclick = ()=>prRunTests('submit');
$('#pr-edit-btn').onclick = ()=>{ setEditing(true); $('#pr-code').focus(); };
$('#pr-solback').onclick = ()=>{ setEditing(true); $('#pr-code').focus(); };
$('#pr-reset').onclick = ()=>{ const p = curProblem(); if(!p) return; pr.code.py = p.starter; store.set(draftKey(p.id), p.starter); pr.results = null; renderPractice(); };
$('#pr-blank').onclick = ()=>{ if(mode!=='practice') setMode('practice'); prOpenCode('', 'Blank editor', {kind:'blank', id:null}, true); closeLibIfNarrow(); $('#pr-code').focus(); };


function setMode(m){
  mode = m;
  document.querySelectorAll('.modes .tab').forEach(t=>{ t.setAttribute('aria-selected', t.dataset.mode===m); t.tabIndex = t.dataset.mode===m?0:-1; });
  $('#main').hidden = m!=='lesson'; $('#practice').hidden = m!=='practice'; $('#home').hidden = m!=='home'; $('#auth').hidden = m!=='auth';
  document.body.dataset.mode = m;
  if(m!=='auth' && /^#\/(login|signup)$/.test(location.hash)) history.replaceState(null,'',location.pathname + location.search);
  if(m==='home'){ stopAnims(); renderHome(); return; }
  if(m==='auth'){ stopAnims(); return; }
  if(m==='practice'){ stopAnims(); renderPractice(); loadSkulpt().catch(()=>{}); }
  else if(!lessonOpened || !ALL_LESSONS[lang].includes(lessonId)) openLesson(pickLesson(lang));
  else if(lessonId==='alias') render(false); else renderTL();
}
document.querySelectorAll('.modes .tab').forEach(t=> t.onclick = ()=>{
  if(t.dataset.mode==='lesson' && mode==='lesson' && innerWidth<=980) return setOutline($('#main').classList.contains('no-outline'));
  if(t.dataset.mode==='practice' && mode==='practice'){ pr.view = 'list'; return renderPractice(); }
  setMode(t.dataset.mode);
});
