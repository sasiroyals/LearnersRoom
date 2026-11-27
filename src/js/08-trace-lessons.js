/* 08-trace-lessons.js: Trace-driven lessons: predictions, variants, recap, and the code / pseudocode / flowchart / decision views. */
const BUILT = { py: Object.assign({'05': LISTS_ORDER}, PY_TOPIC_LESSONS), java: {'13': ['alias']} };
function topicOf(lg, id){ const B = BUILT[lg]; return Object.keys(B).find(n=>B[n].includes(id)); }
const tl = { id:null, trace:null, k:0, answers:{}, variant:0, cache:{} };
let lessonId = 'alias';

function tlCode(){ const L0 = TL_LESSONS[tl.id], v = L0.variants[tl.variant]; return v.from ? L0.code.replace(v.from, v.to) : L0.code; }
function tlVariant(){ return TL_LESSONS[tl.id].variants[tl.variant]; }
/* map a line of the running (variant) code back to the lesson's original line number */
function tlOrigLine(ln){
  const a = TL_LESSONS[tl.id].code.split('\n'), b = tlCode().split('\n');
  if(a.length===b.length) return ln;
  const n=a.length, m=b.length, D = Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) D[i][j] = a[i]===b[j] ? D[i+1][j+1]+1 : Math.max(D[i+1][j], D[i][j+1]);
  let i=0, j=0; while(i<n && j<m){ if(a[i]===b[j]){ if(j===ln-1) return i+1; i++; j++; } else if(D[i+1][j]>=D[i][j+1]) i++; else { if(j===ln-1) return ln; j++; } }
  return ln;
}
function tlPredIdx(){
  const P = TL_LESSONS[tl.id].predict, T = tl.trace; if(!T) return -1;
  const pl = tlVariant().pline || P.line;
  return T.steps.findIndex(st=>!st.error && !st.done && tlOrigLine(st.line)===pl);
}
function tlActual(){
  const P = TL_LESSONS[tl.id].predict, T = tl.trace, v = tlVariant();
  const j = tlPredIdx(); if(j<0) return null;
  const d = T.steps[j].frames.length, ln = T.steps[j].line;
  let after = null;
  for(let i=j+1;i<T.steps.length;i++){ const st = T.steps[i]; if(st.error || st.done || (st.frames.length<=d && st.line!==ln)){ after = st; break; } }
  if(!after) return null;
  if(after.error) return 'An error';
  const opts = tlOpts(), ok = v.ok || P.ok;
  if(P.target.out){
    let before = T.steps[j].out; let txt = after.out.startsWith(before) ? after.out.slice(before.length).trim() : after.out.trim();
    if(P.target.first) txt = txt.split('\n')[0];
    const hit = opts.find(o=> o===txt || o==='Print '+txt || o==='It prints '+txt);
    return hit || ok || txt;
  }
  const val = (()=>{ for(let dd=after.frames.length-1; dd>=0; dd--){ const e = after.frames[dd].vars.find(([n])=>n===P.target.v); if(e) return e[1]; } return null; })();
  if(!val) return null;
  const txt = val.p!==undefined ? val.p : objTxt(after.heap[val.r], after.heap);
  return opts.includes(txt) ? txt : (ok || txt);
}
function tlOpts(){ const L0 = TL_LESSONS[tl.id], v = L0.variants[tl.variant]; return v.opts || L0.predict.opts; }
function tlTotal(){ return tl.trace ? tl.trace.steps.length + 1 : 1; }
async function openTL(id){
  lessonId = id; tl.id = id; tl.k = 0; tl.variant = 0; tl.answers = {};
  $('#canvas').hidden = true; $('#tl').hidden = false;
  $('.lesson-title').textContent = TL_LESSONS[id].title;
  $('#explain').innerHTML = `<div class="meta"><span>Loading the Python runner…</span></div>`;
  await tlRetrace();
}
async function tlRetrace(){
  const code = tlCode();
  try{
    tl.trace = tl.cache[code] || (tl.cache[code] = await tracePy(code, []));
  }catch(e){ $('#explain').innerHTML = `<div class="errbox">${esc(e.message||String(e))}</div>`; return; }
  tl.k = Math.min(tl.k, tlTotal()-1);
  renderTL();
}
function tlPredictHere(){ return tl.trace && tl.k < tl.trace.steps.length && tl.k === tlPredIdx(); }
function tlCanAdvance(){
  const n = tl.trace.steps.length;
  if(tl.k === n) return tl.answers['check'] !== undefined;
  if(tlPredictHere()) return tl.answers[tl.variant] !== undefined;
  return true;
}
function renderTL(){
  const L0 = TL_LESSONS[tl.id], T = tl.trace, n = T.steps.length, k = tl.k;
  const isRecap = k === n;
  const idx = Math.min(k, n-1);
  const cur = T.steps[idx];
  const ran = k>0 && !isRecap ? T.steps[k-1].line : null;
  const ranLine = cur.error ? cur.line : ran;
  // canvas
  const vbar = L0.variants.length < 2 ? '' : `<div class="tl-bar"><span class="tl-lbl">Try another input:</span>` + L0.variants.map((v,i)=>`<button class="chip" data-var="${i}" aria-pressed="${i===tl.variant}">${esc(v.label)}</button>`).join('') + `</div>`;
  let ov = '';
  if(ranLine && !isRecap) ov += `<span class="op"><b>Line ${ranLine}</b>${esc((T.src[ranLine-1]||'').trim())}</span>`;
  else if(k===0) ov += `<span class="op"><b>Ready</b>nothing has run yet</span>`;
  $('#tl-top').innerHTML = vbar + `<div class="overlay tl-ov">${ov}</div>`;
  $('#tl-top').querySelectorAll('[data-var]').forEach(b=> b.onclick = ()=>{ tl.variant = +b.dataset.var; tl.k = 1; tlRetrace(); });
  if(isRecap){ renderMemInto($('#tl-mem'), T, n-1); }
  else if(k===0){ $('#tl-mem').innerHTML = `<div class="pv-empty">Nothing has run yet. Press <b>${esc(tlNextLabel())}</b> to run line 1.</div>`; }
  else renderMemInto($('#tl-mem'), T, idx);
  const out = isRecap ? T.steps[n-1].out : cur.out, pout = k>1 && !isRecap ? T.steps[k-1].out : (isRecap ? out : '');
  const showOut = k===0 ? '' : out;
  let ohtml = esc(pout.length <= showOut.length && showOut.startsWith(pout) && !isRecap ? pout : showOut);
  if(!isRecap && showOut.length > pout.length && showOut.startsWith(pout)) ohtml += `<span class="new">${esc(showOut.slice(pout.length))}</span>`;
  if(cur.error && k>0) ohtml += `<span style="color:var(--bad)">${esc(cur.errorType||'Error')}: ${esc(cur.error.replace(/^\w+:\s*/,''))}</span>`;
  $('#tl-out').innerHTML = ohtml || '<span style="color:var(--muted)">(nothing printed yet)</span>';
  // explain
  const ex = $('#explain');
  let h = `<div class="meta"><span>Step ${k+1} of ${tlTotal()}</span><span class="phase">${tl.variant ? 'Input: '+esc(L0.variants[tl.variant].label) : 'Python · '+esc(L0.topic||'Lists')}</span></div>`;
  if(k===0){
    h += `<h2 class="step-title">Read the program</h2><div class="body"><p>${esc(L0.title)} Run this program one line at a time and watch each name and object change.</p></div>`;
    h += `<div class="watch"><b>Watch</b><span>The code on the lower right. The canvas fills in as each line runs.</span></div>`;
  } else if(isRecap){
    h += `<h2 class="step-title">What you learned</h2><div class="body"><p>${esc(L0.recap)}</p></div>`;
    const C = L0.check, a = tl.answers['check'];
    h += `<div class="pred"><div class="pred-q">One more, with new code. Predict before you finish:</div><pre>${hl(C.code)}</pre><div class="pred-q">${esc(C.q)}</div><div class="opts">` +
      C.opts.map((o,i)=>`<button class="opt${a===undefined?'':(i===C.right?' right':(i===a?' wrong':''))}" data-copt="${i}" aria-pressed="${a===i}">${esc(o)}</button>`).join('') + `</div>` +
      (a!==undefined ? `<div class="fb ${a===C.right?'right':'wrong'}">${esc(C.fb[a])}</div>` : '') + `</div>`;
  } else {
    const fr = T.steps[k-1] && T.steps[k-1].frames; const inFn = fr && fr.length>1 ? fr[fr.length-1].name : null;
    const A = L0.lines[tlOrigLine(ranLine)] || {t: inFn ? 'Line '+ranLine+', inside '+inFn : 'Line '+ranLine, b:'', look:''};
    h += `<h2 class="step-title">${esc(A.t)}</h2><div class="body"><p>${esc(A.b)}</p></div>`;
    if(A.look) h += `<div class="watch"><b>Watch</b><span>${esc(A.look)}</span></div>`;
    const exs = explainStep(T, idx);
    h += `<div class="did"><div class="did-h">What Python did</div><ul class="happen">` + exs.items.map(it=>`<li class="k-${it.k}"><span>${it.h}</span></li>`).join('') + `</ul></div>`;
  }
  if(!isRecap && tlPredictHere()){
    const P = L0.predict, opts = tlOpts(), a = tl.answers[tl.variant], actual = tlActual();
    const right = opts.indexOf(actual);
    h += `<div class="pred"><div class="pred-q">Predict: ${esc(L0.variants[tl.variant].q || P.q.replace(/insert\(0,/, (L0.variants[tl.variant].to||'insert(0,')))}</div><div class="opts">` +
      opts.map((o,i)=>`<button class="opt${a===undefined?'':(i===right?' right':(i===a?' wrong':''))}" data-opt="${i}" aria-pressed="${a===i}">${esc(o)}</button>`).join('') + `</div>`;
    if(a!==undefined){
      const ok = a===right; const chosen = opts[a]; if(actual===null || right<0) console.warn('predict mismatch', tl.id, actual);
      const msg = ok ? 'Right. Step forward to watch it happen.' : ((tl.variant===0 && P.fb[chosen]) || `Not quite. The answer is ${actual}. Step forward and watch the line run.`);
      h += `<div class="fb ${ok?'right':'wrong'}">${esc(msg)}</div>`;
    }
    h += `</div>`;
  }
  const can = tlCanAdvance();
  h += `<div class="controls">
    <button class="icon-btn" id="b-back" aria-label="Back one step" title="Back (←)" ${k===0?'disabled':''}>${ICON.back}</button>
    <button class="icon-btn" id="b-replay" aria-label="Replay this step" title="Replay (R)">${ICON.replay}</button>
    <button class="next" id="b-next" ${can?'':'disabled'}>${esc(tlNextLabel())} <span class="arrow">→</span></button>
  </div>`;
  h += can ? `<div class="keys"><kbd>→</kbd> next · <kbd>←</kbd> back · <kbd>R</kbd> replay</div>` : `<div class="keys">Pick an answer to continue.</div>`;
  if(isRecap) h += `<button class="btn" id="tl-practice" style="align-self:flex-start">Open this code in Practice →</button>`;
  ex.innerHTML = h;
  ex.querySelector('#b-back').onclick = ()=>tlGo(tl.k-1);
  ex.querySelector('#b-replay').onclick = ()=>renderTL();
  ex.querySelector('#b-next').onclick = tlNext;
  ex.querySelectorAll('[data-opt]').forEach(b=> b.onclick = ()=>{ tl.answers[tl.variant] = +b.dataset.opt; renderTL(); const nb = $('#b-next'); nb && nb.focus(); });
  ex.querySelectorAll('[data-copt]').forEach(b=> b.onclick = ()=>{ tl.answers['check'] = +b.dataset.copt; renderTL(); const nb = $('#b-next'); nb && nb.focus(); });
  const tp = ex.querySelector('#tl-practice'); if(tp) tp.onclick = ()=>{ pr.code.py = tlCode(); pr.ex.py = null; setMode('practice'); };
  // dots
  $('#dots').innerHTML = Array.from({length:tlTotal()},(_,i)=>`<button class="dot${i<k?' seen':''}${i===k?' now':''}" aria-label="Step ${i+1}" data-i="${i}"></button>`).join('');
  $('#dots').querySelectorAll('.dot').forEach(d=> d.onclick = ()=> tlGo(+d.dataset.i));
  // code views
  renderTLCode(ranLine, isRecap);
}
function tlNextLabel(){
  const T = tl.trace; if(!T) return 'Next';
  const n = T.steps.length, k = tl.k;
  if(k === n) return 'Finish lesson';
  const nxt = T.steps[k];
  if(nxt.done || nxt.error) return 'See what you learned';
  return 'Run line ' + nxt.line;
}
function tlGo(i){ if(!tl.trace) return; tl.k = Math.max(0, Math.min(tlTotal()-1, i)); renderTL(); }
function tlNext(){
  if(!tlCanAdvance()) return;
  if(tl.k === tl.trace.steps.length){ finishLesson(tl.id); return; }
  tlGo(tl.k+1);
}
function tlPseudo(L0){
  const lines = L0.code.replace(/\n$/,'').split('\n');
  if(L0.pseudo.length === lines.length) return L0.pseudo;
  const items = L0.pseudo.filter(p=>p!=='(blank)'); let k = 0;
  return lines.map(l=> l.trim() ? (items[k++] || '') : '(blank)');
}
function renderTLCode(ranLine, isRecap){
  const L0 = TL_LESSONS[tl.id], T = tl.trace, k = tl.k;
  const nextLine = !isRecap && k < T.steps.length ? T.steps[k].line : null;
  $('#v-code').innerHTML = `<pre class="code">` + T.src.filter((t,i)=>i < T.src.length-1 || t.trim()).map((t,i)=>{
    const ln = i+1, active = ln===ranLine, isNext = ln===nextLine;
    const err = active && T.steps[Math.min(k,T.steps.length-1)].error;
    return `<div class="ln${active?(err?' err':' active'):''}${isNext?' upnext':''}"${active?' aria-current="true"':''}><span class="n">${ln}</span><span>${hl(t)||' '}</span><span class="edited">${isNext?'next':''}</span></div>`;
  }).join('') + `</pre><p class="vnote">Blue: the line that just ran. Outlined: the line that runs next.</p>`;
  $('#v-pseudo').innerHTML = `<ol class="pseudo">` + tlPseudo(L0).map((t,i)=>`<li class="${ranLine && i+1===tlOrigLine(ranLine)?'active':''}">${esc(t)}</li>`).join('') + `</ol>`;
  const straight = T.steps.every((st,i)=> st.frames.length===1 && (i===0 || st.line>=T.steps[i-1].line || st.done || st.error));
  const ranSet = new Set(T.steps.map(st=>st.line)); const straightAll = straight && ranSet.size === T.steps.filter(st=>!st.done && !st.error).length && T.src.every((t,i)=> !t.trim() || ranSet.has(i+1) || (T.steps[T.steps.length-1].error));
  if(straight && straightAll){
  const lines = T.src.map((t,i)=>({t:t.trim(), n:i+1})).filter(x=>x.t);
  const H = 60 + lines.length*56 + 40;
  let f = `<svg class="diagram" viewBox="0 0 340 ${H}" role="img" aria-label="Flowchart"><defs><marker id="fa2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path class="fmark" d="M0,0 L10,5 L0,10 z"/></marker></defs>`;
  f += fbox('s',170,22,90,28,'Start',k===0,'term-n');
  lines.forEach((x,i)=>{ const y = 76 + i*56; f += `<path class="fedge" d="M170,${y-40} L170,${y-20}" marker-end="url(#fa2)"/>` + fbox('',170,y,290,36,short(x.t,38),x.n===ranLine); });
  const ye = 76 + lines.length*56;
  const ended = isRecap || (T.steps[Math.min(k,T.steps.length-1)].done && k>0);
  const stopped = T.steps[T.steps.length-1].error && (isRecap || k===T.steps.length-1);
  f += `<path class="fedge" d="M170,${ye-40} L170,${ye-20}" marker-end="url(#fa2)"/>` + fbox('e',170,ye-4,stopped?150:90,28,stopped?'Stopped by error':'End',ended||stopped,'term-n');
  $('#v-flow').innerHTML = f + `</svg><p class="vnote">This program runs straight down. There are no branches or loops${stopped?', but an error can stop it early':''}.</p>`;
  } else {
    // execution path: every line run so far, indented by call depth
    const upto = isRecap ? T.steps.length : k;
    const path = [];
    for(let i=0;i<upto;i++){ const st = T.steps[i]; if(st.done) continue; path.push({ln:st.line, d:st.frames.length-1, fn:st.frames[st.frames.length-1].name, err:!!st.error}); }
    const show = path.slice(-14), skipped = path.length - show.length;
    const rowH = 40, H = 44 + show.length*rowH + 30;
    let f = `<svg class="diagram" viewBox="0 0 340 ${H}" role="img" aria-label="Execution path: the lines run so far"><defs><marker id="fa2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path class="fmark" d="M0,0 L10,5 L0,10 z"/></marker></defs>`;
    f += fbox('s',60,20,90,26, skipped ? '… '+skipped+' earlier' : 'Start', k===0, 'term-n');
    let px = 30, py = 33;
    show.forEach((r,i)=>{
      const x = 16 + r.d*26, w = 320 - x, y = 44 + i*rowH, top = y+rowH/2-15;
      f += `<path class="fedge" d="M${px},${py} L${x+14},${top-1}" marker-end="url(#fa2)"/>`;
      const last = i===show.length-1 && !isRecap;
      const label = short(r.ln + '  ' + (T.src[r.ln-1]||'').trim(), Math.floor((w-20)/7.2) - (r.d ? Math.min(14, r.fn.length) : 0));
      f += `<g class="fnode path-n${last?' active':''}${r.err?' err-n':''}"><rect x="${x}" y="${top}" width="${w}" height="30" rx="7"/><text x="${x+10}" y="${top+15}">${esc(label)}</text>${r.d ? `<text class="fn-tag" x="${x+w-8}" y="${top+15}">${esc(short(r.fn,14))}</text>` : ''}</g>`;
      px = x + 14; py = top + 30;
    });
    $('#v-flow').innerHTML = f + `</svg><p class="vnote">The path Python has taken so far. Each box is one line it ran. Boxes move right when a function or method is called, and back left when it returns.</p>`;
  }
  $('#v-dec').innerHTML = L0.dec
    ? `<p class="vnote" style="font-size:14px;color:var(--ink)">${esc(L0.dec)}</p>`
    : `<p class="vnote" style="font-size:14px;color:var(--ink)">This lesson has no decisions: each line runs once, top to bottom.</p>${L0.topic ? '' : '<p class="vnote">The question to ask at each line is "which slot?". Read the index, count from 0 (or back from the end for a negative index), and check that the slot exists.</p>'}`;
}
