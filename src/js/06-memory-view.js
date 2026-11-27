/* 06-memory-view.js: Draws frames, objects, classes and arrows as SVG. */
/* ---------- memory view ---------- */
function reach(snapS){
  const level = {}; let q = [];
  snapS.frames.forEach(f=>f.vars.forEach(([,v])=>{ if(v && v.r && level[v.r]===undefined){ level[v.r]=1; q.push(v.r); } }));
  while(q.length){ const nq = []; q.forEach(id=>{ const o = snapS.heap[id]; const kids = (o.items||[]).concat((o.entries||[]).map(e=>e[1]), o.cls ? [o.cls] : [], o.base ? [o.base] : []); kids.forEach(k=>{ if(k && k.r && level[k.r]===undefined){ level[k.r]=level[id]+1; nq.push(k.r); } }); }); q = nq; }
  return Object.keys(level).map(Number).sort((a,b)=>a-b).map(id=>Object.assign({lvl:level[id]}, snapS.heap[id]));
}
function renderMem(){ if(pr.trace) renderMemInto($('#pr-canvas'), pr.trace, pr.i); }
function renderMemInto(cv, T, idx){
  const cur = T.steps[idx], prev = T.steps[idx-1];
  const cellPos = {}, objBase = {}, varPos = {};
  const stacked = cv.clientWidth > 0 && cv.clientWidth < 560;
  const FX=14, FW=stacked?300:240, ROW=36, CW=50, CHH=40, PER=6;
  let OX = 320;
  let h = '', y = 14, frameEnds = [];
  const anchors = {}; const links = [];
  const pvMap = {}; if(prev) prev.frames.forEach((f,d)=>f.vars.forEach(([n,v])=>pvMap[d+':'+n] = v.r!==undefined ? 'r'+v.r : 'p'+v.p));
  cur.frames.forEach((f, d)=>{
    const top = d === cur.frames.length-1 && cur.frames.length>1;
    const H = 34 + Math.max(1,f.vars.length)*ROW + 8;
    const isNew = prev && d >= prev.frames.length;
    h += `<g class="${isNew?'pnew':''}"><rect class="frame-box${top?' top':''}" x="${FX}" y="${y}" width="${FW}" height="${H}" rx="10"/><text class="frame-title" x="${FX+12}" y="${y+21}">${esc(f.name)}</text>`;
    if(d>0) h += `<text class="frame-sub" x="${FX+FW-12}" y="${y+21}" text-anchor="end">local names</text>`;
    if(!f.vars.length) h += `<text class="frame-sub" x="${FX+12}" y="${y+50}">no names yet</text>`;
    f.vars.forEach(([n, v], k)=>{
      const ry = y + 34 + k*ROW;
      const key = d+':'+n, now = v.r!==undefined ? 'r'+v.r : 'p'+v.p;
      const chg = prev && pvMap[key] !== now;
      h += `<text class="vname" x="${FX+14}" y="${ry+21}">${esc(n)}</text>`;
      varPos[n] = {x:FX+108, y:ry+4, w:FW-122, h:ROW-8};
      h += `<rect class="vcell${chg?' chg pchg':''}" x="${FX+108}" y="${ry+4}" width="${FW-122}" height="${ROW-8}" rx="6"/>`;
      if(v.r!==undefined){ h += `<circle class="refdot" cx="${FX+FW-26}" cy="${ry+ROW/2}" r="5"/>`; links.push({x:FX+FW-26, y:ry+ROW/2, to:v.r, chg}); }
      else h += `<text class="vtext${v.fn?' fn':''}" x="${FX+116}" y="${ry+22}">${esc(short(v.p, v.fn?24:18))}</text>`;
    });
    h += `</g>`;
    y += H + 14;
  });
  let leftH = y;
  if(stacked) OX = FX + 10;
  // objects
  const objs = reach(cur);
  const colY = {}, colX = {1:OX}; const widthOf = o => o.items ? Math.max(2, Math.min(PER, o.items.length))*(CW+4) : 220;
  const maxLvl = objs.reduce((m,o)=>Math.max(m,o.lvl),1);
  for(let l=2; l<=maxLvl; l++){ const prevW = objs.filter(o=>o.lvl===l-1).reduce((m,o)=>Math.max(m, widthOf(o)), 100); colX[l] = stacked ? OX : colX[l-1] + prevW + 70; }
  let oy = 14, maxOy = 14;
  const nonCls = objs.filter(o=>o.kind!=='class');
  const classX = stacked ? OX : Math.max(OX, ...nonCls.map(o=>colX[o.lvl] + widthOf(o) + 100));
  objs.sort((a,b)=>(a.kind==='class') - (b.kind==='class') || a.id - b.id);
  const objR = {};
  const fmtCell = (x)=> x ? (x.p!==undefined ? short(x.p,6) : '') : '';
  objs.forEach(o=>{
    const isCls = o.kind==='class';
    const OX = isCls ? classX : colX[o.lvl]; oy = stacked ? (colY.all || leftH + 24) : isCls ? (colY.cls || 14) : (colY[o.lvl] || 14);
    const isNew = prev && !prev.heap[o.id];
    const pobj = prev && prev.heap[o.id];
    let g = '', H;
    if(o.items){
      const n = o.items.length, rows = Math.max(1, Math.ceil(n/PER)), T0 = 40;
      H = T0 + rows*(CHH+20);
      objBase[o.id] = {OX, y0: oy+T0, n};
      g += `<text class="obj-label" x="${OX}" y="${oy+12}">${esc(o.label)}</text>`;
      if(!n) g += `<rect class="obox" x="${OX}" y="${oy+T0}" width="${CW*2}" height="${CHH}" rx="8"/><text class="oidx" x="${OX+CW}" y="${oy+T0+CHH/2+4}">empty</text>`;
      o.items.forEach((x,k)=>{
        const cx = OX + (k%PER)*(CW+4), cy = oy + T0 + Math.floor(k/PER)*(CHH+20);
        const px = pobj && pobj.items ? pobj.items[k] : undefined;
        const chg = prev && (!px || (px.p!==x.p) || (px.r!==x.r));
        (cellPos[o.id] = cellPos[o.id] || {})[k] = {x:cx, y:cy};
        g += `<rect class="ocell${chg && !isNew?' chg pchg':''}${!px && pobj && !isNew ? ' pnew' : ''}" x="${cx}" y="${cy}" width="${CW}" height="${CHH}" rx="7"/>`;
        if(x && x.r!==undefined){ g += `<circle class="refdot" cx="${cx+CW/2}" cy="${cy+CHH/2}" r="5"/>`; links.push({x:cx+CW/2, y:cy+CHH/2, to:x.r, inner:true}); }
        else g += `<text class="otext" x="${cx+CW/2}" y="${cy+CHH/2}">${esc(fmtCell(x))}</text>`;
        if(o.kind!=='set') g += `<text class="oidx" x="${cx+CW/2}" y="${cy+CHH+13}">[${k}]</text>`;
      });
      anchors[o.id] = stacked ? {x:OX+CW/2, y:oy+T0-6, top:true} : {x:OX-6, y:oy+T0+CHH/2};
    } else {
      g += `<text class="obj-label${isCls?' cls':''}" x="${OX}" y="${oy+12}">${esc(o.label)}</text>`;
      const ents = o.entries||[]; const RH = 32, W = 220;
      H = 20 + Math.max(1,ents.length)*RH + 6;
      g += `<rect class="obox${isCls?' clsbox':''}" x="${OX}" y="${oy+20}" width="${W}" height="${Math.max(1,ents.length)*RH}" rx="8"/>`;
      objR[o.id] = {x:OX, y:oy+20+14};
      if(o.cls && !stacked) links.push({x:OX+W, y:oy+30, to:o.cls.r, lab:'instance of'});
      if(o.base) links.push({x:OX, y:oy+20+Math.max(1,ents.length)*RH-10, to:o.base.r, lab:'inherits from', same:true});
      if(!ents.length) g += `<text class="oidx" x="${OX+W/2}" y="${oy+40}">empty</text>`;
      ents.forEach(([k,x],r)=>{
        const ry = oy+20+r*RH;
        const pe = pobj && pobj.entries ? pobj.entries.find(e=>e[0]===k) : null;
        const chg = prev && !isNew && (!pe || pe[1].p!==x.p || pe[1].r!==x.r);
        g += `<text class="okey" x="${OX+12}" y="${ry+21}">${esc(short(k,12))}</text>`;
        g += `<rect class="ocell${chg?' chg pchg':''}" x="${OX+108}" y="${ry+4}" width="${W-116}" height="${RH-8}" rx="6"/>`;
        if(x.r!==undefined){ g += `<circle class="refdot" cx="${OX+W-22}" cy="${ry+RH/2}" r="5"/>`; links.push({x:OX+W-22, y:ry+RH/2, to:x.r, inner:true}); }
        else g += `<text class="vtext${x.fn?' fn':''}" x="${OX+114}" y="${ry+21}">${esc(short(x.p,x.fn?16:12))}</text>`;
      });
      anchors[o.id] = stacked ? {x:OX+40, y:oy+18, top:true} : {x:OX-6, y:oy+36};
    }
    h += `<g class="${isNew?'pnew':''}">${g}</g>`;
    if(isCls) colY.cls = oy + H + 30; else colY[o.lvl] = oy + H + 22;
    colY.all = oy + H + 22; maxOy = Math.max(maxOy, oy + H + 22);
  });
  oy = maxOy;
  const W = stacked ? Math.max(FX+FW+20, ...objs.map(o=>colX[o.lvl] + widthOf(o) + 20)) : Math.max(720, ...objs.map(o=>(o.kind==='class' ? classX : colX[o.lvl]) + widthOf(o) + 20));
  // arrows
  let arrows = '';
  links.forEach(L=>{
    const a = anchors[L.to]; if(!a) return;
    let d;
    if(L.lab){
      const R2 = L.same ? objR[L.to] : null;
      if(R2){ d = `M${L.x},${L.y} C${L.x-50},${L.y} ${R2.x-50},${R2.y} ${R2.x-4},${R2.y}`; arrows += `<path class="pconn rel" d="${d}" marker-end="url(#pah)"/><text class="rel-t" x="${L.x-44}" y="${(L.y+R2.y)/2}" text-anchor="end">${L.lab}</text>`; return; }
      const k = Math.max(40,(a.x-L.x)*.5); d = `M${L.x},${L.y} C${L.x+k},${L.y} ${a.x-k},${a.y} ${a.x},${a.y}`;
      arrows += `<path class="pconn rel" d="${d}" marker-end="url(#pah)"/><text class="rel-t" x="${(L.x+a.x)/2}" y="${(L.y+a.y)/2-6}" text-anchor="middle">${L.lab}</text>`; return;
    }
    if(a.top){ d = `M${L.x},${L.y} C${L.x+70},${L.y} ${a.x},${a.y-70} ${a.x},${a.y}`; }
    else if(L.inner){ const k = Math.max(30,(a.x-L.x)*.45); d = `M${L.x},${L.y} C${L.x+k},${L.y} ${a.x-k},${a.y} ${a.x},${a.y}`; }
    else { const k = Math.max(40,(a.x-L.x)*.5); d = `M${L.x},${L.y} C${L.x+k},${L.y} ${a.x-k},${a.y} ${a.x},${a.y}`; }
    arrows += `<path class="pconn${L.chg?' new':''}" d="${d}" marker-end="url(#pah)"/>`;
  });
  // focus: index reads, slices, and out-of-range lookups on the line that just ran
  const lineTxt = ((cur.error ? T.src[(cur.line||1)-1] : (prev && prev.line ? T.src[prev.line-1] : '')) || '').replace(/#.*$/,'');
  const lookup = name => { for(let d=cur.frames.length-1; d>=0; d--){ const e = cur.frames[d].vars.find(([n])=>n===name); if(e) return e[1]; } return null; };
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  let over = '', travel = null, mm; const travels = [];
  const sliceRe = /(\w+)\[(-?\d*):(-?\d*)\]/g;
  while((mm = sliceRe.exec(lineTxt))){
    const v = lookup(mm[1]); if(!v || v.r===undefined || !objBase[v.r] || !cellPos[v.r]) continue;
    const B = objBase[v.r], n = B.n; let a = mm[2]==='' ? 0 : +mm[2], b = mm[3]==='' ? n : +mm[3];
    if(a<0) a+=n; if(b<0) b+=n; a = clamp(a,0,n); b = clamp(b,0,n);
    for(let k=a; k<b && k<n; k++){ const c = cellPos[v.r][k]; if(c) over += `<rect class="focus" x="${c.x-3}" y="${c.y-3}" width="${CW+6}" height="${CHH+6}" rx="9"/>`; }
    const barX = k => B.OX + k*(CW+4) - 2;
    const sm = lineTxt.match(/^\s*(\w+)\s*=\s*\w+\[[^\]]*\]\s*$/);
    const tv = sm && lookup(sm[1]);
    if(tv && tv.r!==undefined && tv.r!==v.r && cellPos[tv.r]){ let j = 0; for(let k=a; k<b && k<n; k++, j++){ const c = cellPos[v.r][k], t = cellPos[tv.r][j]; if(c && t) travels.push({from:{x:c.x+CW/2,y:c.y+CHH/2}, to:{x:t.x+CW/2,y:t.y+CHH/2}, text:(cur.heap[v.r].items[k]||{}).p||'', delay:j*350}); } }
    if(n <= PER){
      over += `<line class="bound" x1="${barX(a)}" y1="${B.y0-14}" x2="${barX(a)}" y2="${B.y0+CHH+18}"/><text class="bound-t" x="${barX(a)+4}" y="${B.y0-6}">start ${a}</text>`;
      over += `<line class="bound end" x1="${barX(b)}" y1="${B.y0-14}" x2="${barX(b)}" y2="${B.y0+CHH+18}"/><text class="bound-t end" x="${barX(b)}" y="${B.y0+CHH+32}" text-anchor="middle">stop ${b} (left out)</text>`;
    }
  }
  const idxRe = /(\w+)\[(-?\d+)\]/g;
  while((mm = idxRe.exec(lineTxt))){
    const v = lookup(mm[1]); if(!v || v.r===undefined || !objBase[v.r]) continue;
    const B = objBase[v.r], n = B.n, k0 = +mm[2], k = k0<0 ? k0+n : k0;
    if(k>=0 && k<n && cellPos[v.r] && cellPos[v.r][k]){
      const c = cellPos[v.r][k];
      over += `<rect class="focus" x="${c.x-3}" y="${c.y-3}" width="${CW+6}" height="${CHH+6}" rx="9"/><path class="pointer" d="M${c.x+CW/2-7},${c.y-22} L${c.x+CW/2+7},${c.y-22} L${c.x+CW/2},${c.y-10} Z"/><text class="bound-t" x="${c.x+CW/2+11}" y="${c.y-12}">${esc(mm[1]+'['+mm[2]+']')}</text>`;
      const am = lineTxt.match(new RegExp('^\\s*(\\w+)\\s*=\\s*'+mm[1]+'\\['+mm[2].replace('-','\\-')+'\\]\\s*$'));
      if(am && varPos[am[1]]) travel = {from:{x:c.x+CW/2, y:c.y+CHH/2}, to:{x:varPos[am[1]].x+40, y:varPos[am[1]].y+varPos[am[1]].h/2}, text: (cur.heap[v.r].items[k]||{}).p || ''};
    } else if(n < PER*2){
      const gx = B.OX + (k>=n ? k : n)*(CW+4), gy = B.y0;
      if(k>=n && k < PER) over += `<rect class="ghost" x="${gx}" y="${gy}" width="${CW}" height="${CHH}" rx="7"/><text class="ghost-t" x="${gx+CW/2}" y="${gy+CHH/2+4}" text-anchor="middle">?</text><text class="bound-t end" x="${gx+CW/2}" y="${gy+CHH+14}" text-anchor="middle">no [${k}]</text>`;
    }
  }
  const H = Math.max(leftH, oy, 240);
  cv.innerHTML = `<svg style="min-width:${Math.round(W*0.72)}px" viewBox="0 0 ${W} ${H}" role="img" aria-label="Names and objects at this step"><defs><marker id="pah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M0,0 L10,5 L0,10 z"/></marker></defs>${arrows}${h}${over}</svg>`;
  if(travel) travels.push(travel);
  if(!RM) travels.forEach(tr=>{
    const svg = cv.querySelector('svg'), ns = 'http://www.w3.org/2000/svg', g = document.createElementNS(ns,'g');
    const w = Math.max(34, 12 + tr.text.length*9);
    g.setAttribute('class','chip-fly');
    g.innerHTML = `<rect x="${tr.from.x-w/2}" y="${tr.from.y-15}" width="${w}" height="30" rx="7"/><text x="${tr.from.x}" y="${tr.from.y}">${esc(tr.text)}</text>`;
    svg.appendChild(g);
    const dx = tr.to.x - tr.from.x, dy = tr.to.y - tr.from.y;
    const an = g.animate([{transform:'translate(0,0)',opacity:0},{transform:'translate(0,0)',opacity:1,offset:.15},{transform:`translate(${dx}px,${dy}px)`,opacity:1,offset:.85},{transform:`translate(${dx}px,${dy}px)`,opacity:0}],{duration:1100,delay:tr.delay||0,easing:'cubic-bezier(.3,.7,.2,1)',fill:'both'});
    an.onfinish = ()=>g.remove();
  });
}
