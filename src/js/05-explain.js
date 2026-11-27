/* 05-explain.js: Turns two snapshots into plain-English "What Python did" items. */
/* ---------- explanation of one step (diff prev -> cur) ---------- */
function vtxt(v, heap){ if(!v) return '?'; if(v.p!==undefined) return v.p; const o = heap[v.r]; return o ? o.label : '?'; }
function objTxt(o, heap){
  if(!o) return '?';
  const f = x => x ? (x.p!==undefined ? x.p : (heap[x.r] ? heap[x.r].label : '?')) : '?';
  if(o.items) return (o.kind==='tuple'?'(':o.kind==='set'?'{':'[') + o.items.map(f).join(', ') + (o.kind==='tuple'?(o.items.length===1?',)':')'):o.kind==='set'?'}':']');
  if(o.kind==='class') return o.label + '(' + (o.entries||[]).filter(e=>!e[1].fn).map(([k,x])=>k+'='+f(x)).join(', ') + ')';
  if(o.entries) return (o.kind==='obj' ? o.label.split(' ')[0]+'(' : '{') + o.entries.map(([k,x])=>o.kind==='obj' ? k+'='+f(x) : k+': '+f(x)).join(', ') + (o.kind==='obj' ? ')' : '}');
  return o.label;
}
function code$(s){ return '<code>'+esc(s.trim())+'</code>'; }
function explainStep(T, i){
  const src = T.src, cur = T.steps[i], prev = T.steps[i-1];
  const items = [];
  if(!prev){ return {items:[{k:'flow', h:'Nothing has run yet. Python starts at the top of the file.'}]}; }
  const pl = prev.line, ptxt = (src[pl-1]||'').trim();
  // output
  if(cur.out.length > prev.out.length){
    const added = cur.out.slice(prev.out.length).replace(/\n$/,'');
    items.push({k:'out', h:`Printed ${code$(added || ' ')} to the output.`});
  }
  // calls / returns
  const pf = prev.frames, cf = cur.frames;
  if(/^(from\s+\S+\s+)?import\b/.test(ptxt)) items.push({k:'flow', h:`Imported ${code$(ptxt.replace(/^from\s+(\S+)\s+import\s+/, '').trim())}${/^from/.test(ptxt) ? ' from the '+code$(ptxt.split(/\s+/)[1])+' module' : ''}. Imported names are ready to use, and stay hidden in the diagram.`});
  if(cf.length > pf.length){
    const f = cf[cf.length-1];
    const args = f.vars.map(([n,v])=>n+' = '+vtxt(v, cur.heap)).join(', ');
    let note = '';
    const selfv = f.vars.find(([n])=>n==='self');
    if(selfv && selfv[1].r && cur.heap[selfv[1].r] && f.fn && f.name.includes('.')){
      const objCls = cur.heap[selfv[1].r].cname, defCls = f.name.split('.')[0];
      if(objCls && defCls !== objCls) note = ` ${code$(objCls)} does not define ${code$(f.name.split('.')[1].replace('()',''))} itself, so Python used the one it inherits from ${code$(defCls)}.`;
      else if(objCls) note = ` Python found this method in ${code$(objCls)} itself.`;
    }
    items.push({k:'flow', h:`Called ${code$(f.name.replace('()',''))}. Python made a new frame for it${args ? ' with '+code$(args) : ''}.${note}`});
  } else if(cf.length < pf.length){
    const gone = pf.slice(cf.length).map(f=>f.name).reverse();
    items.push({k:'flow', h:`${gone.map(code$).join(' and then ')} finished. ${gone.length>1?'Their frames':'Its frame'} and local names are gone.`});
  }
  // name changes in shared frames (compare by frame index up to common depth)
  const depth = Math.min(pf.length, cf.length);
  for(let d=0; d<depth; d++){
    const pv = new Map(pf[d].vars), where = d===0 ? '' : ` in ${code$(cf[d].name)}`;
    cf[d].vars.forEach(([n, v])=>{
      const old = pv.get(n);
      if(v.fn && !old){ items.push({k:'name', h:`Defined ${code$(v.p.replace(/^(function|class) /,''))}. ${v.p.startsWith('class')?'Its methods are ready to use.':'Its body runs only when it is called.'}`}); return; }
      if(!old && v.r && cur.heap[v.r] && cur.heap[v.r].kind==='class'){
        const co = cur.heap[v.r], meths = co.entries.filter(e=>e[1].fn).map(e=>e[0]), attrs = co.entries.filter(e=>!e[1].fn).map(e=>e[0]+' = '+vtxt(e[1], cur.heap));
        const base = co.base && cur.heap[co.base.r] ? cur.heap[co.base.r].name : null;
        items.push({k:'name', h:`Defined ${code$('class '+co.name)}${base ? ', a subclass of '+code$(base)+'. It inherits every method it does not define itself' : ''}. ${meths.length ? 'Methods: '+code$(meths.join(', '))+'. ' : ''}${attrs.length ? 'Class attributes, shared by every object: '+code$(attrs.join(', '))+'. ' : ''}No object exists yet: a class is a blueprint.`});
        return;
      }
      if(!old){
        if(v.r){
          const other = []; cur.frames.forEach(fr=>fr.vars.forEach(([on,ov])=>{ if(ov.r===v.r && on!==n) other.push(on); }));
          const existed = prev.heap[v.r] && other.length > 0;
          if(!existed && prev.heap[v.r]){ items.push({k:'name', h:`${code$(n)}${where} now refers to ${cur.heap[v.r].label}, the ${cur.heap[v.r].kind==='obj'?'object':cur.heap[v.r].kind} that was just built: ${code$(objTxt(cur.heap[v.r], cur.heap))}.`}); return; }
          if(existed){
            items.push({k:'name', h:`${code$(n)}${where} now refers to the same ${cur.heap[v.r].kind==='obj'?'object':cur.heap[v.r].kind} as ${code$(other.join(', '))} (${cur.heap[v.r].label}). No copy was made: count the arrows into it.`});
          } else items.push({k:'name', h:`Created ${cur.heap[v.r].label} holding ${code$(objTxt(cur.heap[v.r], cur.heap))} and named it ${code$(n)}${where}.`});
        } else items.push({k:'name', nm:n, h:`Created ${code$(n)}${where} with the value ${code$(v.p)}.`});
      } else if(old.r !== v.r || old.p !== v.p){
        if(v.r && old.r) items.push({k:'name', h:`${code$(n)}${where} now refers to ${cur.heap[v.r].label} instead of ${prev.heap[old.r] ? prev.heap[old.r].label : 'its old object'}.`});
        else items.push({k:'name', r:2, nm:n, h:`${code$(n)}${where} changed from ${code$(vtxt(old, prev.heap))} to ${code$(vtxt(v, cur.heap))}.`});
      }
    });
  }
  // the return value landing in the caller
  // mutated objects
  Object.values(cur.heap).forEach(o=>{
    const po = prev.heap[o.id]; if(!po) return;
    const a = objTxt(po, prev.heap), b = objTxt(o, cur.heap);
    if(a !== b && (o.kind==='obj' || o.kind==='class') && po.entries){
      const pm = new Map(po.entries);
      o.entries.forEach(([k2,x])=>{
        const old2 = pm.get(k2);
        if(x.fn) return;
        if(!old2) items.push({k:'name', r:0, h:`${o.label} got a new attribute ${code$(k2+' = '+vtxt(x, cur.heap))}.`});
        else if(old2.p!==x.p || old2.r!==x.r) items.push({k:'name', r:0, h:`${o.kind==='class' ? 'The class attribute' : o.label+'\u2019s attribute'} ${code$(k2)} changed from ${code$(vtxt(old2, prev.heap))} to ${code$(vtxt(x, cur.heap))}.${o.kind==='class' ? ' Every object of the class sees the new value.' : ''}`});
      });
      return;
    }
    if(a !== b){
      const holders = []; cur.frames.forEach(fr=>fr.vars.forEach(([n,v])=>{ if(v.r===o.id) holders.push(n); }));
      items.push({k:'name', r:0, h:`${o.label} changed from ${code$(a)} to ${code$(b)}.` + (holders.length>1 ? ` Every name that refers to it sees the change: ${code$(holders.join(', '))}.` : '')});
    }
  });
  // control flow
  const m = ptxt.match(/^(if|elif|while)\s+(.+):$/);
  const sameFrame = cf.length === pf.length;
  if(m && sameFrame && cur.line != null){
    const ind = (src[pl-1]||'').search(/\S/);
    let body = pl; while(body < src.length && !(src[body]||'').trim()) body++;
    const bodyLine = body+1;
    const entered = cur.line === bodyLine && (src[body]||'').search(/\S/) > ind;
    if(m[1]==='while') items.push({k:'flow', h: entered ? `The loop condition ${code$(m[2])} is True, so the loop body runs again.` : `The loop condition ${code$(m[2])} is False, so the loop ends.`});
    else items.push({k:'flow', h: entered ? `The condition ${code$(m[2])} is True, so Python runs the indented block.` : `The condition ${code$(m[2])} is False, so Python skips the indented block.`});
  }
  const fm = ptxt.match(/^for\s+(.+?)\s+in\s+(.+):$/);
  if(fm && sameFrame && cur.line != null){
    const ind = (src[pl-1]||'').search(/\S/);
    const inBody = cur.line > pl && (src[cur.line-1]||'').search(/\S/) > ind;
    if(!inBody) items.push({k:'flow', h:`No items are left in ${code$(fm[2])}, so the loop ends.`});
    else { const v = cf[cf.length-1].vars.find(([n])=>n===fm[1]); items.push({k:'flow', drop: fm[1], h:`The loop takes the next item from ${code$(fm[2])}: ${code$(fm[1]+' = '+(v ? vtxt(v[1], cur.heap) : '?'))}.`}); }
  }
  if(sameFrame && cur.line != null && pl != null && !fm){
    const indentOf = l => (src[l-1]||'').search(/\S/);
    for(let h0 = pl-1; h0 >= 1; h0--){
      const hm = (src[h0-1]||'').match(/^\s*(for|while)\s+(.+):\s*$/); if(!hm) continue;
      const hi = indentOf(h0); let b1 = h0;
      for(let l = h0+1; l <= src.length; l++){ const t = src[l-1]||''; if(!t.trim()) continue; if(t.search(/\S/) <= hi) break; b1 = l; }
      if(pl > b1) continue;
      const inBody = cur.line > h0 && cur.line <= b1;
      if(hm[1]==='for'){
        const fm2 = hm[2].match(/^(.+?)\s+in\s+(.+)$/);
        if(inBody && cur.line <= pl){ const v = fm2 && cf[cf.length-1].vars.find(([n])=>n===fm2[1]); items.push({k:'flow', r:3, drop: v ? fm2[1] : null, h:`Back to the top of the loop. It takes the next item${fm2 ? ' from '+code$(fm2[2]) : ''}${v ? ': '+code$(fm2[1]+' = '+vtxt(v[1], cur.heap)) : ''}.`}); }
        else if(!inBody && cur.line !== h0) items.push({k:'flow', h:`No items are left${fm2 ? ' in '+code$(fm2[2]) : ''}, so the loop ends and Python continues after it.`});
      } else if(!inBody && cur.line !== h0) items.push({k:'flow', h:`The loop is over, so Python continues after it.`});
      break;
    }
  }
  if(/^return\b/.test(ptxt) && cf.length < pf.length){
    items.push({k:'flow', h:`${code$(ptxt)} sends a value back to the line that made the call.`});
  }
  const dropNames = items.filter(x=>x.drop).map(x=>x.drop);
  const rank = x => x.r!==undefined ? x.r : (x.k==='out' ? 0 : x.k==='flow' ? 1 : 2);
  const kept = items.filter(x=>!(x.nm && dropNames.includes(x.nm)));
  kept.sort((a,b)=>rank(a)-rank(b)); items.length = 0; items.push(...kept);
  if(cur.error) items.push({k:'err', h:`${esc(cur.error)}`});
  if(!items.length) items.push({k:'flow', h:`Line ${pl} ran: ${code$(ptxt)}. No names or objects changed.`});
  return {items, ran: pl, ranTxt: ptxt};
}
