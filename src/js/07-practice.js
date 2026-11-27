/* 07-practice.js: Practice mode: editor, examples and the step debugger panel. */
/* ---------- panels ---------- */
function renderPracticeCode(){
  const T = pr.trace, v = $('#pr-view');
  if(!T) return;
  const cur = T.steps[pr.i];
  v.innerHTML = `<pre class="code">` + T.src.map((t,k)=>{
    const here = cur.line === k+1;
    const cls = here ? (cur.error ? ' err' : ' active') : '';
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
/* ---------- practice sources: problems, lesson code, examples ---------- */
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
const GFG_TOPIC = {'01':'basics','02':'basics','03':'strings','04':'basics','05':'lists','06':'basics','07':'dicts','08':'functions','09':'functions','10':'data','11':'data',
  '12':'oop','13':'oop','14':'oop','15':'oop','16':'oop','21':'oop'};
const gfgFor = n => GFG[GFG_TOPIC[n] || 'all'];
const ALL_PROBLEMS = [].concat(...inTopicOrder(PROBLEMS));
const PROB_BY_ID = {}; Object.entries(PROBLEMS).forEach(([n, ps])=> ps.forEach(p=>{ PROB_BY_ID[p.id] = Object.assign({topic:n}, p); }));
const solvedKey = id => 'cs.solved.py.' + id;
const isSolved = id => store.get(solvedKey(id)) === '1';
const draftKey = id => 'cs.draft.py.' + id;
const isOutProb = p => p && p.kind==='output';
const normOut = t => String(t||'').split('\n').map(l=>l.replace(/\s+$/,'')).join('\n').replace(/^\n+|\n+$/g,'');
/* Function problems in topics before 08 use def before it is taught: label them so beginners start with the others. */
const needsDef = p => !isOutProb(p) && +p.topic < 8;
function problemCount(n){ return (PROBLEMS[n] || []).length; }
function solvedCount(n){ return (PROBLEMS[n] || []).filter(p=>isSolved(p.id)).length; }
const libOpen = new Set();

function curSel(){ return pr.sel[lang]; }
function curProblem(){ const s = curSel(); return s && s.kind==='problem' ? PROB_BY_ID[s.id] : null; }

function renderLib(){
  const java = lang==='java';
  ['problems','lessons'].forEach(k=> $('#lib-'+k).setAttribute('aria-selected', pr.lib===k));
  const C = CURRICULUM[lang], sel = curSel() || {};
  let h = '';
  if(pr.lib==='problems'){
    if(java){ h = `<p class="lib-empty">Java problems arrive with the Java runner. Switch to Python to practice now.</p>`; $('#lib-sum').textContent = ''; }
    else {
      const total = Object.values(PROBLEMS).reduce((c,ps)=>c+ps.length,0), done = Object.values(PROBLEMS).flat().filter(p=>isSolved(p.id)).length;
      $('#lib-sum').innerHTML = `<b>${done}</b> of ${total} solved`;
      if(sel.kind==='problem') libOpen.add(PROB_BY_ID[sel.id].topic);
      if(!libOpen.size && C[0]) libOpen.add(C[0].n);
      C.forEach(t=>{
        const ps = PROBLEMS[t.n] || []; if(!ps.length) return;
        const open = libOpen.has(t.n), sc = solvedCount(t.n);
        h += `<div class="lib-topic"><button class="lib-tbtn" data-ltopic="${t.n}" aria-expanded="${open}"><span class="tnum">${t.n}</span><span>${esc(t.t)}</span><span class="lib-cnt${sc===ps.length?' full':''}">${sc}/${ps.length}</span></button><ul${open?'':' hidden'}>` +
          ps.map(p=>`<li><button class="lib-item${sel.kind==='problem' && sel.id===p.id?' active':''}" data-prob="${p.id}"><span class="lvl lvl-${p.level.toLowerCase()}">${p.level}</span><span class="lib-t">${esc(p.title)}</span>${needsDef(p)?'<span class="lib-def" title="Uses def from topic 08">def</span>':''}${isSolved(p.id)?'<span class="tick" aria-label="solved">✓</span>':''}</button></li>`).join('') +
          `<li><a class="gfg" href="${gfgFor(t.n)}" target="_blank" rel="noopener">More on GeeksforGeeks ↗</a></li></ul></div>`;
      });
    }
  } else {
    $('#lib-sum').textContent = 'Open any lesson\'s code and change it.';
    h += `<div class="lib-topic"><div class="lib-sub">Quick examples</div><ul>` + EXAMPLES[lang].map(e=>`<li><button class="lib-item${sel.kind==='example' && sel.id===e.id?' active':''}" data-ex="${e.id}"><span class="lib-t">${esc(e.t)}</span></button></li>`).join('') + `</ul></div>`;
    C.forEach(t=>{
      const ids = (BUILT[lang][t.n] || []).filter(id=>id!=='alias' && TL_LESSONS[id]); if(!ids.length) return;
      const open = libOpen.has('L'+t.n);
      h += `<div class="lib-topic"><button class="lib-tbtn" data-ltopic="L${t.n}" aria-expanded="${open}"><span class="tnum">${t.n}</span><span>${esc(t.t)}</span><span class="lib-cnt">${ids.length}</span></button><ul${open?'':' hidden'}>` +
        ids.map(id=>`<li><button class="lib-item${sel.kind==='lesson' && sel.id===id?' active':''}" data-les="${id}"><span class="lib-t">${esc(TL_LESSONS[id].title)}</span></button></li>`).join('') + `</ul></div>`;
    });
  }
  $('#lib-list').innerHTML = h;
  $('#lib-list').querySelectorAll('[data-ltopic]').forEach(b=> b.onclick = ()=>{ const k = b.dataset.ltopic; libOpen.has(k) ? libOpen.delete(k) : libOpen.add(k); renderLib(); });
  $('#lib-list').querySelectorAll('[data-prob]').forEach(b=> b.onclick = ()=>{ openProblem(b.dataset.prob); closeLibIfNarrow(); });
  $('#lib-list').querySelectorAll('[data-les]').forEach(b=> b.onclick = ()=>{ prOpenCode(TL_LESSONS[b.dataset.les].code, 'Lesson: ' + TL_LESSONS[b.dataset.les].title, {kind:'lesson', id:b.dataset.les}, true); closeLibIfNarrow(); });
  $('#lib-list').querySelectorAll('[data-ex]').forEach(b=> b.onclick = ()=>{ const e = EXAMPLES[lang].find(x=>x.id===b.dataset.ex); $('#pr-input').value = e.inp || ''; prOpenCode(e.c, e.t, {kind:'example', id:e.id}, true); closeLibIfNarrow(); });
}
function setLibOpen(open){ document.querySelector('.practice').classList.toggle('lib-open', open); $('#lib-toggle').setAttribute('aria-expanded', open); }
function closeLibIfNarrow(){ if(innerWidth <= 1440) setLibOpen(false); }
$('#lib-toggle').onclick = ()=> setLibOpen(!document.querySelector('.practice').classList.contains('lib-open'));
$('#lib-scrim').onclick = ()=> setLibOpen(false);
document.querySelectorAll('[data-lib]').forEach(b=> b.onclick = ()=>{ pr.lib = b.dataset.lib; renderLib(); });

/* Open any code in the editor (from a lesson, an example, or the blank button). */
function prOpenCode(code, title, sel, stay){
  pr.sel[lang] = sel || {kind:'lesson', id:null, title};
  if(sel) pr.sel[lang].title = title;
  pr.code[lang] = code;
  if(sel && sel.kind==='lesson') pr.lib = 'lessons';
  if(stay && mode==='practice') renderPractice(); else setMode('practice');
}
function openProblem(id){
  const p = PROB_BY_ID[id]; if(!p) return;
  if(lang!=='py') setLang('py');
  pr.sel.py = {kind:'problem', id, title:p.title};
  pr.code.py = store.get(draftKey(id)) || p.starter;
  pr.lib = 'problems'; pr.results = null; pr.watching = false;
  libOpen.add(p.topic);
  if(mode==='practice') renderPractice(); else setMode('practice');
}
function openTopicProblems(n){ const ps = PROBLEMS[n] || []; if(!ps.length) return; const p = ps.find(x=>!isSolved(x.id) && !needsDef(Object.assign({topic:n}, x))) || ps.find(x=>!isSolved(x.id)) || ps[0]; openProblem(p.id); }

function renderProblemCard(){
  const p = curProblem(), box = $('#pr-prob');
  if(!p){ box.hidden = true; box.innerHTML = ''; return; }
  const t = CURRICULUM.py.find(x=>x.n===p.topic);
  const ex = isOutProb(p) ? [] : p.tests.filter(x=>!x.setup).slice(0,2);
  box.hidden = false;
  box.innerHTML = `<div class="prob-meta"><span class="lvl lvl-${p.level.toLowerCase()}">${p.level}</span><span>${esc(p.topic+' '+(t?t.t:''))}</span>${isSolved(p.id)?'<span class="solved-pill">✓ Solved</span>':''}</div>
    <p class="prob-story">${esc(p.story)}</p>
    ${ex.length ? `<div class="prob-ex">${ex.map(x=>`<code>${esc(x.call)}</code><span>→</span><code>${esc(x.expect)}</code>`).join('')}</div>` : ''}
    ${isOutProb(p) ? `<div class="prob-want"><span>Your program should print</span><pre>${esc(p.tests[0].output)}</pre></div>` : ''}
    ${needsDef(p) ? `<p class="prob-note">This one uses <code>def</code>, which is taught in topic 08 Functions. Try the other problems in this topic first.</p>` : ''}
    <details class="prob-hint"><summary>Show a hint</summary><p>${esc(p.hint)}</p></details>`;
}

function setEditing(on){
  pr.editing = on;
  $('#pr-edit').hidden = !on; $('#pr-view').hidden = on;
  $('#pr-edit-btn').hidden = on; $('#pr-debug').hidden = !on; $('#pr-run').hidden = !on;
  const prob = !!curProblem();
  $('#pr-test').hidden = !on || !prob; $('#pr-test').textContent = isOutProb(curProblem()) ? 'Check my answer' : 'Run tests'; $('#pr-reset').hidden = !on || !prob; $('#pr-sol').hidden = !on || !prob;
  $('#pr-solbar').hidden = !pr.watching || on;
  if(on){ pr.watching = false; pr.trace = null; $('#pr-solbar').hidden = true; $('#pr-canvas').innerHTML = `<div class="pv-empty">Press <b>Step through</b> to watch your program run one line at a time. Each name appears on the left, each object on the right, and an arrow shows which object a name refers to.</div>`; renderSideIdle(); }
}
function renderSideIdle(){
  const p = curProblem(), box = $('#pr-dbg');
  if(p){
    const R = pr.results;
    const out = isOutProb(p);
    let h = `<div class="meta"><span>${!R ? (out ? 'Not checked yet' : 'Not run yet') : out ? (R.pass===R.total ? 'Correct' : 'Not right yet') : R.pass===R.total ? 'All tests pass' : R.pass+' of '+R.total+' test'+(R.total>1?'s':'')+' pass'}</span></div><h2 class="step-title">${out ? 'Your answer' : 'Tests'}</h2>`;
    h += `<ul class="tests">` + p.tests.map((t,i)=>{
      const r = R && R.items[i];
      const st = !r ? 'idle' : r.ok ? 'ok' : 'bad';
      if(isOutProb(p)) return `<li class="t-${st}"><span class="t-ico">${st==='ok'?'✓':st==='bad'?'✗':'○'}</span><div>The output should be<pre class="t-setup">${esc(t.output)}</pre>${r && !r.ok ? `<div class="t-got">${r.error ? esc(r.error) : 'Your program printed<pre class="t-setup">'+esc(r.got || '(nothing)')+'</pre>'}</div>${r.help ? `<div class="t-help">${esc(r.help)}</div>` : ''}` : ''}</div></li>`;
      return `<li class="t-${st}"><span class="t-ico">${st==='ok'?'✓':st==='bad'?'✗':'○'}</span><div>${t.setup ? `<pre class="t-setup">${esc(t.setup.trim())}</pre>` : ''}<code>${esc(t.call)}</code> should give <code>${esc(t.expect)}</code>${r && !r.ok ? `<div class="t-got">${r.error ? esc(r.error) : 'got <code>'+esc(r.got)+'</code>'}</div>${r.help ? `<div class="t-help">${esc(r.help)}</div>` : ''}` : ''}</div></li>`;
    }).join('') + `</ul>`;
    if(R && R.pass===R.total) h += `<div class="win-box"><b>Solved!</b> Press <b>Step through</b> to watch your code run line by line, or pick the next problem.</div><button class="btn primary" id="pr-next">Next problem →</button>`;
    else if(isOutProb(p)) h += `<p class="dbg-tip">Change the code, then press <b>Check my answer</b>. <b>Step through</b> runs it one line at a time so you can see what each line does.</p>`;
    else h += `<p class="dbg-tip">Write your code, then press <b>Run tests</b>. <b>Step through</b> runs your code on the example below it, one line at a time.</p><pre class="t-setup">${esc(p.demo.trim())}</pre>`;
    box.innerHTML = h;
    const nx = $('#pr-next'); if(nx) nx.onclick = ()=>{ const all = ALL_PROBLEMS; const i = all.findIndex(x=>x.id===p.id); const nxt = all.slice(i+1).find(x=>!isSolved(x.id)) || all[(i+1)%all.length]; openProblem(nxt.id); };
  } else {
    box.innerHTML = `<div class="meta"><span>Editing</span></div><h2 class="step-title">What is happening</h2><p style="margin:0;color:var(--muted)">Press <b>Step through</b>. This panel will explain every line as it runs: which names changed, which objects were created or changed, and which way each condition went.</p>`;
  }
}
function codeToRun(){
  const p = curProblem(), code = $('#pr-code').value;
  return p && !isOutProb(p) ? code.replace(/\s*$/,'\n') + '\n# example\n' + p.demo : code;
}
async function prStart(runAll, src){
  if(pr.busy) return;
  if(lang==='java'){ return; }
  pr.busy = true; $('#pr-status').textContent = window.Sk ? 'Running…' : 'Loading the Python runner…';
  const inputs = $('#pr-input').value.split(',').map(s=>s.trim()).filter(s=>s.length);
  try{
    const watching = !!src;
    const t = await tracePy(src || codeToRun(), inputs);
    setEditing(false); pr.trace = t; pr.watching = watching;
    $('#pr-solbar').hidden = !watching;
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
async function prRunTests(){
  const p = curProblem(); if(!p || pr.busy) return;
  pr.busy = true; const btn = $('#pr-test'); btn.disabled = true;
  $('#pr-status').textContent = window.Sk ? 'Running tests…' : 'Loading the Python runner…';
  const code = $('#pr-code').value.replace(/\s*$/,'\n');
  const items = [];
  try{
    if(isOutProb(p)) for(const t of p.tests){
      const r = await runPy((t.before || '') + code);
      const got = normOut(r.out), want = normOut(t.output);
      if(r.error) items.push({ok:false, error:r.errorType + ': ' + r.error.replace(/^\w+:\s*/,''), help: explainError(r.errorType, r.error, code)});
      else items.push({ok: got===want, got, help: got===want ? '' : outputHelp(got, want)});
    }
    else for(const t of p.tests){
      const r = await runPy(code + '\n' + (t.setup || '') + '\nprint("@@R" + repr(' + t.call + '))\n');
      const m = (r.out || '').match(/@@R(.*)\n?$/);
      if(r.error) items.push({ok:false, error:r.errorType + ': ' + r.error.replace(/^\w+:\s*/,''), help: explainError(r.errorType, r.error, code)});
      else if(!m) items.push({ok:false, error:'No result came back.'});
      else items.push({ok: m[1]===t.expect, got: m[1], help: m[1]!==t.expect ? wrongResultHelp(m[1], t.expect, code) : ''});
    }
  }catch(e){ $('#pr-status').textContent = e.message || String(e); }
  const pass = items.filter(x=>x.ok).length;
  pr.results = {items, pass, total:p.tests.length};
  const wasSolved = isSolved(p.id);
  if(pass===p.tests.length && items.length===p.tests.length){ store.set(solvedKey(p.id), '1'); if(!wasSolved){ toast('Solved: ' + p.title); if(typeof Auth!=='undefined' && Auth.save) Auth.save(); } }
  $('#pr-status').textContent = '';
  btn.disabled = false; pr.busy = false;
  renderProblemCard(); renderSideIdle(); renderLib();
}
function gutter(){ const n = $('#pr-code').value.split('\n').length; $('#pr-gutter').textContent = Array.from({length:n},(_,i)=>i+1).join('\n'); }
function renderPractice(){
  const java = lang==='java';
  if(!pr.sel[lang]){ if(!java && Object.keys(PROBLEMS).length){ const first = ALL_PROBLEMS[0]; pr.sel.py = {kind:'problem', id:first.id, title:first.title}; pr.code.py = store.get(draftKey(first.id)) || first.starter; } else { const e = EXAMPLES[lang][0]; pr.sel[lang] = {kind:'example', id:e.id, title:e.t}; pr.code[lang] = e.c; } }
  if(java && pr.lib==='problems') pr.lib = 'lessons';
  const sel = pr.sel[lang];
  $('#pr-title').textContent = sel.title || (L[lang].name + ' practice');
  $('#pr-code').value = pr.code[lang] != null ? pr.code[lang] : '';
  renderProblemCard(); renderLib();
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
  if(e.key==='Enter' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); curProblem() ? prRunTests() : prStart(false); }
});
$('#pr-debug').onclick = ()=>prStart(false);
$('#pr-run').onclick = ()=>prStart(true);
$('#pr-test').onclick = prRunTests;
$('#pr-edit-btn').onclick = ()=>{ setEditing(true); $('#pr-code').focus(); };
$('#pr-solback').onclick = ()=>{ setEditing(true); $('#pr-code').focus(); };
$('#pr-sol').onclick = ()=>{ const p = curProblem(); if(p) prStart(false, isOutProb(p) ? p.solution : p.solution.replace(/\s*$/,'\n') + '\n# example\n' + p.demo); };
$('#pr-reset').onclick = ()=>{ const p = curProblem(); if(!p) return; pr.code.py = p.starter; store.set(draftKey(p.id), p.starter); pr.results = null; renderPractice(); };
$('#pr-blank').onclick = ()=>{ prOpenCode('', 'Blank editor', {kind:'blank', id:null}, true); closeLibIfNarrow(); $('#pr-code').focus(); };

function setMode(m){
  mode = m;
  document.querySelectorAll('.modes .tab').forEach(t=>{ t.setAttribute('aria-selected', t.dataset.mode===m); t.tabIndex = t.dataset.mode===m?0:-1; });
  $('#main').hidden = m!=='lesson'; $('#practice').hidden = m!=='practice'; $('#home').hidden = m!=='home'; $('#auth').hidden = m!=='auth';
  $('#toggle-outline').hidden = m!=='lesson';
  document.body.dataset.mode = m;
  if(m!=='auth' && /^#\/(login|signup)$/.test(location.hash)) history.replaceState(null,'',location.pathname + location.search);
  if(m==='home'){ stopAnims(); renderHome(); return; }
  if(m==='auth'){ stopAnims(); return; }
  if(m==='practice'){ stopAnims(); renderPractice(); loadSkulpt().catch(()=>{}); }
  else if(!lessonOpened || !ALL_LESSONS[lang].includes(lessonId)) openLesson(pickLesson(lang));
  else if(lessonId==='alias') render(false); else renderTL();
}
document.querySelectorAll('.modes .tab').forEach(t=> t.onclick = ()=>setMode(t.dataset.mode));
