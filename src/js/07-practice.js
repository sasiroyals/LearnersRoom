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
  h += `<h2 class="step-title">${pr.i===0 ? 'Ready to run' : 'Line '+ex.ran+' ran'}</h2>`;
  if(pr.i>0) h += `<div class="nextline" style="border-style:solid">${code$(ex.ranTxt)}</div>`;
  h += `<ul class="happen">` + ex.items.map(it=>`<li class="k-${it.k}"><span>${it.h}</span></li>`).join('') + `</ul>`;
  if(cur.error) h += `<div class="errbox"><b>${esc(cur.errorType||'Error')}</b> on line ${cur.line}. Read the highlighted line: the error happened while Python was running it.</div>`;
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
function setEditing(on){
  pr.editing = on;
  $('#pr-edit').hidden = !on; $('#pr-view').hidden = on;
  $('#pr-edit-btn').hidden = on; $('#pr-debug').hidden = !on; $('#pr-run').hidden = !on;
  if(on){ pr.trace = null; $('#pr-canvas').innerHTML = `<div class="pv-empty">Press <b>Step through</b> to run your program one line at a time. Each name appears on the left, each object on the right, and an arrow shows which object a name refers to.</div>`; $('#pr-dbg').innerHTML = `<div class="meta"><span>Editing</span></div><h2 class="step-title">What is happening</h2><p style="margin:0;color:var(--muted)">Press <b>Step through</b>. This panel will explain every line as it runs: which names changed, which objects were created or changed, and which way each condition went.</p>`; }
}
async function prStart(runAll){
  if(pr.busy) return;
  if(lang==='java'){ return; }
  pr.busy = true; $('#pr-status').textContent = window.Sk ? 'Running…' : 'Loading the Python runner…';
  const code = $('#pr-code').value; pr.code[lang] = code;
  const inputs = $('#pr-input').value.split(',').map(s=>s.trim()).filter(s=>s.length);
  try{
    pr.trace = await tracePy(code, inputs);
    setEditing(false); pr.trace = pr.trace || null;
    $('#pr-status').textContent = '';
    prGo(runAll ? pr.trace.steps.length-1 : 0);
    if(!runAll){ const s = $('#pr-step'); s && s.focus(); }
  }catch(e){
    $('#pr-status').textContent = e.message || String(e);
  }
  pr.busy = false;
}
function gutter(){ const n = $('#pr-code').value.split('\n').length; $('#pr-gutter').textContent = Array.from({length:n},(_,i)=>i+1).join('\n'); }
function renderExamples(){
  const ex = EXAMPLES[lang];
  $('#pr-examples').innerHTML = ex.map(e=>`<button class="chip" data-ex="${e.id}" aria-pressed="${pr.ex[lang]===e.id}">${esc(e.t)}</button>`).join('');
  $('#pr-examples').querySelectorAll('.chip').forEach(b=> b.onclick = ()=>{
    const e = ex.find(x=>x.id===b.dataset.ex); pr.ex[lang] = e.id;
    $('#pr-code').value = e.c; pr.code[lang] = e.c; $('#pr-input').value = e.inp || '';
    setEditing(true); gutter(); renderExamples(); $('#pr-out').textContent='';
  });
}
function renderPractice(){
  $('#pr-title').textContent = L[lang].name + ' practice';
  renderExamples();
  const ex = EXAMPLES[lang].find(x=>x.id===pr.ex[lang]) || EXAMPLES[lang][0];
  $('#pr-code').value = pr.code[lang] != null ? pr.code[lang] : ex.c;
  if(pr.code[lang]==null && ex.inp) $('#pr-input').value = ex.inp;
  gutter(); setEditing(true); $('#pr-out').textContent='';
  const java = lang==='java';
  $('#pr-debug').disabled = java; $('#pr-run').disabled = java;
  const note = document.getElementById('pr-javanote');
  if(java && !note){ const d = document.createElement('div'); d.className='java-note'; d.id='pr-javanote'; d.innerHTML = '<b>Java runner coming next.</b> You can read and edit Java here now. Running it and stepping through it line by line needs the Java runner, which is being set up.'; $('#pr-edit').before(d); }
  if(!java && note) note.remove();
}
$('#pr-code').addEventListener('input', ()=>{ gutter(); pr.code[lang] = $('#pr-code').value; });
$('#pr-code').addEventListener('scroll', ()=>{ $('#pr-gutter').scrollTop = $('#pr-code').scrollTop; });
$('#pr-code').addEventListener('keydown', e=>{
  if(e.key==='Tab'){ e.preventDefault(); const t=e.target, s=t.selectionStart; t.setRangeText('    ', s, t.selectionEnd, 'end'); gutter(); }
  if(e.key==='Enter' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); prStart(false); }
});
$('#pr-debug').onclick = ()=>prStart(false);
$('#pr-run').onclick = ()=>prStart(true);
$('#pr-edit-btn').onclick = ()=>{ setEditing(true); $('#pr-code').focus(); };

function setMode(m){
  mode = m;
  document.querySelectorAll('.modes .tab').forEach(t=>{ t.setAttribute('aria-selected', t.dataset.mode===m); t.tabIndex = t.dataset.mode===m?0:-1; });
  $('#main').hidden = m!=='lesson'; $('#practice').hidden = m!=='practice'; $('#home').hidden = m!=='home';
  $('#toggle-outline').hidden = m!=='lesson';
  if(m==='home'){ stopAnims(); renderHome(); return; }
  if(m==='practice'){ stopAnims(); renderPractice(); loadSkulpt().catch(()=>{}); }
  else if(!ALL_LESSONS[lang].includes(lessonId)) openLesson(firstLesson(lang));
  else if(lessonId==='alias') render(false); else renderTL();
}
document.querySelectorAll('.modes .tab').forEach(t=> t.onclick = ()=>setMode(t.dataset.mode));
