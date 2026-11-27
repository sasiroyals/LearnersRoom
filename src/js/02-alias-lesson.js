/* 02-alias-lesson.js: The hand-built lesson: scene drawing, animation, explanation panel, code views and view tabs. */
/* ---------------- state ---------------- */
let lang = store.get('cs.lang');
let step = 0;
const answers = {};
let running = [], paused = false, timers = [], logOpen = false;
let viewIdx = 0;

/* ---------------- scene rendering ---------------- */
function tileSVG(listId, i, v, x, y, cw){
  const w = cw-10, h = CH;
  return `<g class="tile at" id="tile-${listId}-${i}"><rect class="tdepth" x="${x+3}" y="${y+4}" width="${w}" height="${h}" rx="8"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/><text x="${x+w/2}" y="${y+h/2}">${v}</text></g>`;
}
function listSVG(l, s){
  const n = l.values.length, W = n*l.cw + 14;
  let g = `<g class="list" id="list-${l.id}"><g class="frame at"><rect class="slab-depth" x="${l.x-7+6}" y="${l.y-7+7}" width="${W}" height="${CH+14}" rx="11"/><rect class="slab" x="${l.x-7}" y="${l.y-7}" width="${W}" height="${CH+14}" rx="11"/><text class="list-label" x="${l.x-4}" y="${l.y-16}">${esc(l.label)}</text>`;
  for(let i=0;i<n;i++) g += `<text class="idx" x="${l.x+i*l.cw+(l.cw-10)/2}" y="${l.y+CH+28}">[${i}]</text>`;
  if(s.newSlot && s.newSlot.list===l.id){ const i=s.newSlot.i; g+=`<rect class="cell-ghost" id="ghost-${l.id}-${i}" x="${l.x+i*l.cw}" y="${l.y}" width="${l.cw-10}" height="${CH}" rx="8"/>`; }
  g += `</g>`;
  l.values.forEach((v,i)=>{ g += tileSVG(l.id,i,v,l.x+i*l.cw,l.y,l.cw); });
  return g + `</g>`;
}
function connPath(nm, l){
  const sx = nm.x+34, sy = nm.y, ex = l.x-12, ey = l.y+CH/2;
  const k = Math.max(50,(ex-sx)*.5);
  return `M${sx},${sy} C${sx+k},${sy} ${ex-k},${ey} ${ex},${ey}`;
}
function renderScene(){
  const s = sceneFor(STEPS[step].key, lang), svg = $('#scene');
  const lists = {}; s.lists.forEach(l=>lists[l.id]=l);
  let h = `<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>`;
  if(s.zones){
    h += `<text class="zone" x="${NX-34}" y="110">${esc(L[lang].names)}</text><text class="zone" x="${LX-7}" y="110">${esc(L[lang].objects)}</text>`;
  }
  if(s.hint) h += `<text class="hint" x="400" y="290">${esc(s.hint)}</text>`;
  if(s.divider) h += `<line class="divider" x1="400" y1="80" x2="400" y2="530"/>`;
  s.caps.forEach(c=>{ h += `<text class="cap" x="${c.x}" y="${c.y}">${esc(c.t)}</text><text class="capsub" x="${c.x}" y="${c.y+20}">${esc(c.sub)}</text>`; });
  const half = x => x < 400 ? 'half-l' : 'half-r';
  const groups = {};
  const put = (x, str) => { const k = s.divider ? half(x) : 'main'; (groups[k] = groups[k] || []).push(str); };
  s.names.forEach(nm=>{
    const l = lists[nm.target]; if(!l) return;
    const lit = s.lit.includes(nm.id);
    const key = nm.key || nm.id;
    put(nm.x, `<path class="conn${lit?' lit':''}" id="conn-${key}" d="${connPath(nm,l)}" marker-end="url(#ah)"/>` + (lit && !RM ? `<path class="flow" d="${connPath(nm,l)}"/>` : ''));
  });
  s.lists.forEach(l=> put(l.x, listSVG(l,s)));
  s.names.forEach(nm=>{
    const lit = s.lit.includes(nm.id), key = nm.key || nm.id;
    put(nm.x, `<g class="tag at${lit?' lit':''}" id="tag-${key}"><rect x="${nm.x-34}" y="${nm.y-22}" width="68" height="44" rx="22"/><text x="${nm.x}" y="${nm.y+1}">${nm.id}</text></g>`);
  });
  const cons = s.consoles || (s.console ? [s.console] : []);
  cons.forEach(c=>{
    put(c.x, `<g class="console"><rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="10"/><text class="clabel" x="${c.x+14}" y="${c.y+20}">${esc(c.label)}</text><text class="ctext${c.q?' q':''}" id="ctext" x="${c.x+14}" y="${c.y+46}">${esc(c.text || '')}</text></g>`);
  });
  Object.keys(groups).forEach(k=>{ h += `<g class="${k} at">${groups[k].join('')}</g>`; });
  const narrow = matchMedia('(max-width:760px)').matches;
  svg.setAttribute('viewBox', narrow && !s.divider ? '55 85 700 445' : '0 70 800 470');
  svg.innerHTML = `<desc id="scene-desc">${esc(describe(s))}</desc>` + h;
  renderOverlay(s);
  return s;
}
function describe(s){
  if(s.hint) return s.hint;
  const parts = s.lists.map(l=>`${l.label} holds [${l.values.join(', ')}]`);
  const refs = s.names.map(n=>`${n.id} points to ${(s.lists.find(l=>l.id===n.target)||{}).label}`);
  return parts.concat(refs).join('. ') + '.';
}
function renderOverlay(s){
  const st = STEPS[step], o = $('#overlay');
  let h = '';
  if(st.line >= 0){
    const ln = displayLine(st.line);
    h += `<span class="op"><b>Line ${ln}</b>${esc(L[lang].code[st.mode][st.line].trim())}</span>`;
  }
  if(s.zones && s.names.length){
    const nw = s.names.length===1 ? L[lang].nameWord : L[lang].nameWords;
    const lw = s.lists.length===1 ? 'list' : 'lists';
    h += `<span class="count"><strong>${s.names.length}</strong> ${nw} · <strong>${s.lists.length}</strong> ${lw}</span>`;
  }
  o.innerHTML = h;
}

/* ---------------- animation ---------------- */
function stopAnims(){ running.forEach(a=>{ try{a.cancel();}catch(e){} }); running=[]; timers.forEach(clearTimeout); timers=[]; document.querySelectorAll('.chip-fly').forEach(n=>n.remove()); }
function anim(el, frames, opt){
  if(!el || !el.animate) return null;
  const o = Object.assign({fill:'backwards', easing:'cubic-bezier(.3,.7,.2,1)'}, opt);
  if(RM){ o.duration = 1; o.delay = 0; }
  const a = el.animate(frames, o); running.push(a); if(paused) a.pause(); return a;
}
function bbox(el){ try{ return el.getBBox(); }catch(e){ return {x:0,y:0,width:0,height:0}; } }
function playScene(s){
  stopAnims();
  const svg = $('#scene');
  s.anims.forEach(a=>{
    if(a.k==='fade'){
      svg.querySelectorAll(a.sel).forEach(el=> anim(el,[{opacity:0,transform:'scale(.94)'},{opacity:1,transform:'none'}],{duration:420,delay:a.d}));
    } else if(a.k==='tiles'){
      svg.querySelectorAll(`[id^="tile-${a.list}-"]`).forEach((el,i)=> anim(el,[{opacity:0,transform:'translateY(-18px)'},{opacity:1,transform:'none'}],{duration:380,delay:a.d+i*140}));
    } else if(a.k==='draw'){
      const p = svg.querySelector('#conn-'+a.id); if(!p) return;
      const len = p.getTotalLength ? p.getTotalLength() : 300;
      anim(p,[{strokeDasharray:len+' '+len,strokeDashoffset:len, opacity:1},{strokeDasharray:len+' '+len,strokeDashoffset:0, opacity:1}],{duration:520,delay:a.d,easing:'ease-out'});
    } else if(a.k==='ghost'){
      const g = svg.querySelector(`#ghost-${a.list}-${a.i}`);
      anim(g,[{opacity:0},{opacity:1}],{duration:300,delay:a.d});
    } else if(a.k==='hideTiles'){
      /* handled by travel's backwards fill */
    } else if(a.k==='travel'){
      const t = svg.querySelector(`#tile-${a.list}-${a.i}`); if(!t) return;
      const tb = bbox(t.querySelector('rect:not(.tdepth)'));
      let sx, sy;
      if(a.from){ const f = bbox(svg.querySelector('#'+a.from)); sx = f.x + f.width/2; sy = f.y + f.height/2; }
      else { const f = bbox(svg.querySelector(`#tile-${a.fromList}-${a.i} rect:not(.tdepth)`)); sx = f.x + f.width/2; sy = f.y + f.height/2; }
      const dx = sx - (tb.x+tb.width/2), dy = sy - (tb.y+tb.height/2);
      anim(t,[{transform:`translate(${dx}px,${dy}px) scale(.7)`,opacity:.0,offset:0},{transform:`translate(${dx}px,${dy}px) scale(.8)`,opacity:1,offset:.15},{transform:'none',opacity:1}],{duration:a.dur||800,delay:a.d});
      if(a.fromList){ const src = svg.querySelector(`#tile-${a.fromList}-${a.i}`); anim(src,[{transform:'none'},{transform:'scale(1.12)'},{transform:'none'}],{duration:400,delay:a.d-50,fill:'none'}); }
    } else if(a.k==='chip'){
      const l = s.lists.find(x=>x.id===a.list), c = s.console;
      const ns = 'http://www.w3.org/2000/svg', g = document.createElementNS(ns,'g');
      g.setAttribute('class','chip-fly');
      const w = 18 + a.text.length*10.5, x0 = l.x + 10, y0 = l.y + 10;
      g.innerHTML = `<rect x="${x0}" y="${y0}" width="${w}" height="34" rx="8"/><text x="${x0+w/2}" y="${y0+17}">${esc(a.text)}</text>`;
      svg.appendChild(g);
      const dx = (c.x+10) - x0, dy = (c.y+24) - y0;
      const an = anim(g,[{transform:'translate(0,0)',opacity:0},{transform:'translate(0,0)',opacity:1,offset:.1},{transform:`translate(${dx}px,${dy}px)`,opacity:1,offset:.9},{transform:`translate(${dx}px,${dy}px)`,opacity:0}],{duration:a.dur,delay:a.d,fill:'both'});
      if(an) an.onfinish = ()=>g.remove(); else g.remove();
    } else if(a.k==='ctext'){
      anim(svg.querySelector('#ctext'),[{opacity:0},{opacity:1}],{duration:300,delay:a.d});
    }
  });
}

/* ---------------- explanation panel ---------------- */
const ICON = {
  back:'<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  replay:'<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  pause:'<svg viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></svg>',
  play:'<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>'
};
function pick(v){ return (v && typeof v==='object' && 'py' in v) ? v[lang] : v; }
function canAdvance(){ const st = STEPS[step]; return !st.predict || answers[step] !== undefined; }
function renderExplain(){
  const st = STEPS[step], ex = $('#explain');
  const phaseLabel = st.phase===1 ? 'Run 1 · b = a' : st.phase===2 ? 'Run 2 · ' + (lang==='py'?'b = a.copy()':'new ArrayList<>(a)') : 'Recap';
  let h = `<div class="meta"><span>Step ${step+1} of ${STEPS.length}</span><span class="phase">${esc(phaseLabel)}</span></div>`;
  h += `<h2 class="step-title">${esc(pick(st.title))}</h2><div class="body">${pick(st.body).map(p=>`<p>${p}</p>`).join('')}</div>`;
  const G = GUIDE[st.key];
  if(G) h += `<div class="watch"><b>Watch</b><span>${esc(pick(G.look))}</span></div>`;
  if(st.term) h += `<div class="term">${pick(st.term)}</div>`;
  if(st.predict){
    const p = st.predict, opts = p.opts(lang), ans = answers[step];
    h += `<div class="pred">`;
    if(p.check) h += `<div class="pred-q">One more, with new code. Predict before you finish:</div><pre>${hl(L[lang].check.code)}</pre><div class="pred-q">${esc(L[lang].check.q)}</div>`;
    else h += `<div class="pred-q">${esc(pick(p.q))}</div>`;
    h += `<div class="opts" role="group">` + opts.map((o,i)=>{
      const cls = ans===undefined ? '' : (i===p.right ? ' right' : (i===ans ? ' wrong' : ''));
      return `<button class="opt${cls}" data-opt="${i}" aria-pressed="${ans===i}">${esc(o)}</button>`; }).join('') + `</div>`;
    if(ans !== undefined) h += `<div class="fb ${ans===p.right?'right':'wrong'}">${esc(pick(p.fb)[ans])}</div>`;
    h += `</div>`;
  }
  const nextLabel = pick(st.next);
  h += `<div class="controls">
    <button class="icon-btn" id="b-back" aria-label="Back one step" title="Back (←)" ${step===0?'disabled':''}>${ICON.back}</button>
    <button class="icon-btn" id="b-replay" aria-label="Replay this step" title="Replay (R)">${ICON.replay}</button>
    <button class="icon-btn" id="b-pause" aria-label="${paused?'Resume':'Pause'} animation" title="Pause (P)">${paused?ICON.play:ICON.pause}</button>
    <button class="next" id="b-next" ${canAdvance()?'':'disabled'} title="${canAdvance()?'':'Pick an answer to continue'}">${esc(nextLabel)} <span class="arrow">→</span></button>
  </div>`;
  if(!canAdvance()) h += `<div class="keys">Pick an answer to continue.</div>`;
  else h += `<div class="keys"><kbd>→</kbd> next · <kbd>←</kbd> back · <kbd>R</kbd> replay · <kbd>P</kbd> pause</div>`;
  if(step>0){
    h += `<details class="log"${logOpen?' open':''}><summary>What has happened so far (${step} step${step>1?'s':''})</summary><ol>` +
      STEPS.slice(0, step+1).map((s2,i)=>`<li class="${i===step?'cur':''}">${esc(pick(GUIDE[s2.key].sum))}</li>`).join('') + `</ol></details>`;
  }
  ex.innerHTML = h;
  const lg = ex.querySelector('.log'); if(lg) lg.addEventListener('toggle', ()=>{ logOpen = lg.open; });
  ex.querySelector('#b-back').onclick = back;
  ex.querySelector('#b-replay').onclick = replay;
  ex.querySelector('#b-pause').onclick = togglePause;
  ex.querySelector('#b-next').onclick = next;
  ex.querySelectorAll('.opt').forEach(b=> b.onclick = ()=>{ answers[step] = +b.dataset.opt; renderExplain(); const n=$('#b-next'); if(n && !n.disabled) n.focus(); });
}

/* ---------------- code + views ---------------- */
function hl(src){
  return esc(src)
    .replace(/(&quot;[^&]*&quot;)/g,'<span class="tok-str">$1</span>')
    .replace(/\b(import|public|class|static|void|new|print|return|def|for|in|if|else)\b/g,'<span class="tok-kw">$1</span>')
    .replace(/\b(\d+)\b/g,'<span class="tok-num">$1</span>');
}
function displayLine(core){ return L[lang].wrapBefore.length + core + 1; }
function renderCode(){
  const st = STEPS[step], C = L[lang];
  const mode = st.mode==='both' ? 'copy' : st.mode;
  const core = C.code[mode];
  const ind = lang==='java' ? '    ' : '';
  const rows = [];
  C.wrapBefore.forEach(t=>rows.push({t, dim:true}));
  core.forEach((t,i)=>rows.push({t:ind+t, active:i===st.line, edited: mode==='copy' && i===1}));
  C.wrapAfter.forEach(t=>rows.push({t, dim:true}));
  let h = `<pre class="code" aria-label="${esc(C.name)} code">` + rows.map((r,i)=>
    `<div class="ln${r.dim?' dim':''}${r.active?' active':''}${r.edited && st.edited===1?' flash':''}"${r.active?' aria-current="true"':''}><span class="n">${i+1}</span><span>${hl(r.t)||' '}</span>${r.edited?'<span class="edited">edited</span>':'<span></span>'}</div>`).join('') + `</pre>`;
  if(st.mode==='both') h += `<p class="vnote">Run 1 used <code>${esc(C.code.alias[1])}</code> on line ${displayLine(1)}. Run 2, shown above, used the copy.</p>`;
  h += `<div class="runlink"><span>Change a value and watch what happens.</span><button class="btn" id="to-practice">Step through this code in Practice →</button></div>`;
  $('#v-code').innerHTML = h;
  $('#to-practice').onclick = ()=>{ const src = C.wrapBefore.concat(C.code[mode].map(t=>ind+t), C.wrapAfter).join('\n') + '\n'; prOpenCode(src, 'Lesson: Why did both lists change?'); };

  const ps = C.pseudo[mode];
  $('#v-pseudo').innerHTML = `<ol class="pseudo">` + ps.map((t,i)=>`<li class="${i===st.pseudo?'active':''}">${esc(t)}</li>`).join('') + `</ol>` +
    (st.mode==='both' ? `<p class="vnote">Run 2 shown. In run 1, step 2 was: ${esc(C.pseudo.alias[1])}</p>` : '');
  $('#v-flow').innerHTML = flowSVG(mode, st.flow);
  $('#v-dec').innerHTML = decSVG();
}
function fbox(id, x, y, w, h, text, active, cls=''){
  const lines = text.split('\n');
  return `<g class="fnode ${cls}${active?' active':''}"><rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="${cls.includes('term-n')?h/2:7}"/>` +
    lines.map((t,i)=>`<text x="${x}" y="${y+(i-(lines.length-1)/2)*14}">${esc(t)}</text>`).join('') + `</g>`;
}
function fdiamond(x,y,w,h,text,active){
  return `<g class="fnode${active?' active':''}"><path d="M${x},${y-h/2} L${x+w/2},${y} L${x},${y+h/2} L${x-w/2},${y} Z"/><text x="${x}" y="${y}">${esc(text)}</text></g>`;
}
function arrow(x1,y1,x2,y2,taken){ return `<path class="fedge${taken?' taken':''}" d="M${x1},${y1} L${x2},${y2}" marker-end="url(#fa)"/>`; }
function flowSVG(mode, act){
  const A = id => act.includes(id);
  const C = L[lang];
  const isJ = lang==='java';
  const n1 = isJ ? 'a → new ArrayList [1, 2]' : 'a → new list [1, 2]';
  const n3 = isJ ? 'b.add(3)' : 'b.append(3)';
  const n4 = isJ ? 'println(a)' : 'print(a)';
  let h = `<svg class="diagram" viewBox="0 0 340 ${mode==='copy'?480:340}" role="img" aria-label="Flowchart of the program"><defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path class="fmark" d="M0,0 L10,5 L0,10 z"/></marker></defs>`;
  const cx = 170;
  h += fbox('start',cx,22,90,28,'Start',A('start'),'term-n');
  h += arrow(cx,36,cx,56) + fbox('n1',cx,76,230,36,n1,A('n1'));
  if(mode==='alias'){
    h += arrow(cx,94,cx,116) + fbox('n2',cx,136,230,36,'b → same list as a',A('n2'));
    h += arrow(cx,154,cx,176) + fbox('n3',cx,196,230,36,n3+'  (via b)',A('n3'));
    h += arrow(cx,214,cx,236) + fbox('n4',cx,256,230,36,n4+'  (via a)',A('n4'));
    h += arrow(cx,274,cx,296) + fbox('end',cx,314,90,28,'End',A('end'),'term-n');
  } else {
    h += arrow(cx,94,cx,114) + fbox('n2a',cx,132,230,32,'make new empty list',A('n2a'));
    h += arrow(cx,148,cx,168) + fdiamond(cx,198,200,56,'more values in a?',A('n2q'));
    h += `<text class="flabel${A('n2c')?' taken':''}" x="${cx+8}" y="242">yes</text>`;
    h += arrow(cx,226,cx,246,A('n2c')) + fbox('n2c',cx,264,190,34,'copy value to same index',A('n2c'));
    h += `<path class="fedge${A('n2c')?' taken':''}" d="M265,264 L305,264 L305,198 L272,198" marker-end="url(#fa)"/>`;
    h += `<text class="flabel" x="300" y="290">repeat</text>`;
    h += `<text class="flabel${A('n2b')?' taken':''}" x="38" y="190">no</text>`;
    h += `<path class="fedge${A('n2b')?' taken':''}" d="M70,198 L30,198 L30,318 L78,318" marker-end="url(#fa)"/>`;
    h += fbox('n2b',cx,318,180,30,'b → new list',A('n2b'));
    h += arrow(cx,333,cx,356) + fbox('n3',cx,374,230,32,n3+'  (via b)',A('n3'));
    h += arrow(cx,390,cx,408) + fbox('n4',cx,424,230,30,n4+'  (via a)',A('n4'));
    h += arrow(cx,439,cx,452) + fbox('end',cx,464,70,22,'End',A('end'),'term-n');
  }
  h += `</svg>`;
  const note = mode==='alias' ? 'This program runs straight down with no branches. The copy in run 2 adds a loop that moves one value per pass.' : 'The copy repeats once per value: 1 goes to index 0, then 2 goes to index 1. When no values remain, the loop exits.';
  return h + `<p class="vnote">${note}</p>`;
}
function decSVG(){
  const st = STEPS[step];
  const aliasOn = st.mode==='alias' || st.mode==='both', copyOn = st.mode==='copy' || st.mode==='both';
  const depth = st.mode==='both' ? 3 : (st.dec || 0);
  const aliasShown = step >= 5, copyShown = step >= 10;
  const tk = (side, d) => (side==='alias' ? aliasOn : copyOn) && depth >= d;
  const isJ = lang==='java';
  const q = isJ ? 'Does line 6 create a new list?' : 'Does line 2 create a new list?';
  let h = `<svg class="diagram" viewBox="0 0 340 330" role="img" aria-label="Decision tree"><defs><marker id="da" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path class="fmark" d="M0,0 L10,5 L0,10 z"/></marker></defs>`;
  h += fbox('root',170,28,300,38,q, depth===0 && st.mode!=='both');
  const col = (x, side, label, l1, l2, leaf) => {
    let g = `<path class="fedge${tk(side,1)?' taken':''}" d="M170,47 L170,58 L${x},58 L${x},66"/>`;
    g += `<text class="flabel${tk(side,1)?' taken':''}" x="${x}" y="79" text-anchor="middle">${esc(label)}</text>`;
    g += `<path class="fedge${tk(side,1)?' taken':''}" d="M${x},85 L${x},94" marker-end="url(#da)"/>`;
    g += fbox('',x,116,150,40,l1,tk(side,1)&&depth===1, tk(side,1)?'taken':'');
    g += `<path class="fedge${tk(side,2)?' taken':''}" d="M${x},136 L${x},168" marker-end="url(#da)"/>`;
    g += fbox('',x,192,150,40,l2,tk(side,2)&&depth===2, tk(side,2)?'taken':'');
    g += `<path class="fedge${tk(side,3)?' taken':''}" d="M${x},212 L${x},244" marker-end="url(#da)"/>`;
    g += fbox('',x,268,150,40,leaf,tk(side,3), tk(side,3)?'taken':'');
    return g;
  };
  const pr = isJ ? 'println(a)' : 'print(a)';
  h += col(88,'alias', isJ?'No: b = a':'No: b = a', 'one list,\ntwo '+L[lang].nameWords, 'append via b\nchanges that list'.replace('append', isJ?'add':'append'), pr+'\n→ '+(aliasShown?'[1, 2, 3]':'?'));
  h += col(252,'copy', isJ?'Yes: new ArrayList<>(a)':'Yes: a.copy()', 'two separate\nlists', (isJ?'add':'append')+' via b\nchanges list #2', pr+'\n→ '+(copyShown?'[1, 2]':'?'));
  h += `</svg>`;
  let note;
  if(st.mode==='both') note = 'Both paths, side by side. The only difference is the answer to the first question.';
  else if(depth===0) note = 'The second line of the program decides which path this run takes. It has not run yet.';
  else note = `This run takes the ${st.mode==='alias'?'left':'right'} path. ` + ((st.mode==='alias'?aliasShown:copyShown) ? 'The output is now known.' : 'The output stays hidden until you predict it.');
  return h + `<p class="vnote">${note}</p>`;
}

/* view tabs + swipe */
function setView(i, scroll=true){
  viewIdx = i;
  document.querySelectorAll('.vtab').forEach((b,j)=>{ b.setAttribute('aria-selected', j===i); b.tabIndex = j===i?0:-1; });
  if(scroll){ const v = $('#views'); v.scrollTo({left: i*v.clientWidth, behavior: RM?'auto':'smooth'}); }
}
document.querySelectorAll('.vtab').forEach(b=> b.onclick = ()=> setView(+b.dataset.v));
$('#vtabs').addEventListener('keydown', e=>{
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); e.stopPropagation(); const i=(viewIdx+(e.key==='ArrowRight'?1:3))%4; setView(i); document.querySelectorAll('.vtab')[i].focus(); }
});
let st_; $('#views').addEventListener('scroll', ()=>{ clearTimeout(st_); st_ = setTimeout(()=>{ const v=$('#views'); const i=Math.round(v.scrollLeft/Math.max(1,v.clientWidth)); if(i!==viewIdx) setView(i,false); },60); });
