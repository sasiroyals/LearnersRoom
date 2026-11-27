/* 04-tracer.js: Python runner: loads Skulpt, rewrites unsupported syntax, and records a snapshot of every line (frames, objects, output). */
const SK_URLS = ['https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js','https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js'];
const EXAMPLES = {
  py: [
    {id:'alias', t:'Two names, one list', c:"a = [1, 2]\nb = a\nb.append(3)\nprint(a)\n"},
    {id:'total', t:'Running total', c:"numbers = [4, 1, 5]\ntotal = 0\nfor n in numbers:\n    total = total + n\nprint(total)\n"},
    {id:'filter', t:'Filter', c:"values = [3, 1, 4]\nkept = []\nfor v in values:\n    if v > 2:\n        kept.append(v)\nprint(kept)\n"},
    {id:'func', t:'Function call', c:"def add(x, y):\n    s = x + y\n    return s\n\nresult = add(2, 5)\nprint(result)\n"},
    {id:'copy', t:'Shallow copy', c:"a = [[1, 2], [3]]\nb = a.copy()\nb[0].append(9)\nb.append([7])\nprint(a)\nprint(b)\n"},
    {id:'dict', t:'Counting with a dict', c:"words = ['hi', 'yo', 'hi']\ncounts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\nprint(counts)\n"},
    {id:'class', t:'Objects and methods', c:"class Counter:\n    def __init__(self):\n        self.count = 0\n\n    def tick(self):\n        self.count = self.count + 1\n\nc = Counter()\nc.tick()\nc.tick()\nprint(c.count)\n"},
    {id:'input', t:'Using input()', c:"name = input('Name? ')\ntimes = int(input('How many? '))\nfor i in range(times):\n    print('Hi', name)\n", inp:'Sam, 2'}
  ],
  java: [
    {id:'alias', t:'Two variables, one list', c:"import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> a = new ArrayList<>(List.of(1, 2));\n        List<Integer> b = a;\n        b.add(3);\n        System.out.println(a);\n    }\n}\n"},
    {id:'total', t:'Running total', c:"public class Main {\n    public static void main(String[] args) {\n        int[] numbers = {4, 1, 5};\n        int total = 0;\n        for (int n : numbers) {\n            total = total + n;\n        }\n        System.out.println(total);\n    }\n}\n"}
  ]
};
const pr = { trace:null, i:0, editing:true, sel:{py:null, java:null}, code:{}, busy:false, loaded:null, lib:'problems', watching:false, results:null };
let mode = 'lesson';

function loadSkulpt(){
  if(window.Sk && Sk.builtinFiles) return Promise.resolve();
  if(pr.loaded) return pr.loaded;
  const one = src => new Promise((res, rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('Could not load the Python runner. Check your connection and try again.')); document.head.appendChild(s); });
  pr.loaded = one(SK_URLS[0]).then(()=>one(SK_URLS[1])).catch(e=>{ pr.loaded=null; throw e; });
  return pr.loaded;
}

/* ---------- tracing ---------- */
const SHIMS = /*@SHIMS@*/null;
const PRIM = new Set(['int','float','str','bool','NoneType','complex','lng']);
function reprOf(v){ try{ const r = Sk.misceval.objectRepr(v); return typeof r==='string' ? r : (r && r.v) || String(r); }catch(e){ return '?'; } }
function short(s, n=22){ return s.length>n ? s.slice(0,n-1)+'…' : s; }

/* rewrite class-body annotations (x: int = 0) into plain attributes the dataclass shim can read; keeps line numbers */
function prepCode(code){
  let n = 0; const stack = []; // [indent, isClass]
  return code.split('\n').map(l=>{
    if(!l.trim() || /^\s*#/.test(l)) return l;
    const ind = l.match(/^\s*/)[0].length;
    while(stack.length && stack[stack.length-1][0] >= ind) stack.pop();
    const inClass = stack.length && stack[stack.length-1][1];
    if(/:\s*(#.*)?$/.test(l)) stack.push([ind, /^\s*class\s/.test(l)]);
    if(!inClass) return l;
    const m = l.match(/^(\s+)([A-Za-z_]\w*)\s*:\s*([A-Za-z_][\w\[\], .|]*?)\s*(?:=\s*(.+))?$/);
    if(!m || /^(else|try|finally|except|elif|if|for|while|with|def|class|return|lambda)$/.test(m[2])) return l;
    n++; return `${m[1]}_dc_${String(n).padStart(3,'0')}_${m[2]} = ${m[4]!==undefined ? m[4] : "'__DC_MISSING__'"}`;
  }).join('\n');
}
async function tracePy(code, inputs){
  await loadSkulpt();
  const src = code.split('\n');
  const sigs = {}, imported = new Set();
  src.forEach(l=>{ const m = l.match(/^\s*from\s+\S+\s+import\s+(.+)$/); if(m) m[1].split(',').forEach(x=>imported.add(x.trim().split(/\s+as\s+/).pop())); const m2 = l.match(/^\s*import\s+(.+)$/); if(m2) m2[1].split(',').forEach(x=>imported.add(x.trim().split(/\s+as\s+/).pop())); });
  src.forEach(l=>{ const m = l.match(/^\s*def\s+(\w+)\s*\(([^)]*)\)/); if(m) sigs[m[1]] = m[1]+'('+m[2].replace(/\bself\b,?\s*/,'')+')'; });
  const ids = new Map(), kindN = {};
  const idOf = (v, fixed) => { if(!ids.has(v)){ const k = v.tp$name; kindN[k]=(kindN[k]||0)+1; ids.set(v,{id:ids.size+1, label: fixed || (k+' #'+kindN[k])}); } return ids.get(v); };
  const isUserClass = v => v instanceof Sk.builtin.type && v.prototype && Object.prototype.hasOwnProperty.call(v.prototype,'__module__') && v.prototype.__module__ && v.prototype.__module__.v === '__main__';
  const SHOW_DUNDER = new Set(['__init__','__str__','__repr__','__eq__','__add__','__len__','__lt__','__hash__','__iter__','__next__','__call__','__getitem__','__new__']);
  const steps = []; let out = ''; const inq = inputs.slice();
  const isInstance = v => v && v.$d instanceof Sk.builtin.dict && !(v instanceof Sk.builtin.module) && !(v instanceof Sk.builtin.type) && !(v instanceof Sk.builtin.func);
  function val(v, heap){
    if(v === undefined || v === null) return null;
    const tn = v.tp$name;
    if(PRIM.has(tn)) return {p:short(reprOf(v),28), t:tn};
    if(v instanceof Sk.builtin.func) return {p:'function '+(sigs[v.$name]||((v.$name||'?')+'()')), fn:1};
    if(isUserClass(v)){
      const nm = v.prototype.tp$name, info = idOf(v, 'class '+nm);
      if(!heap[info.id]){
        const o = heap[info.id] = {id:info.id, label:info.label, kind:'class', name:nm, entries:[]};
        Object.keys(v.prototype).forEach(k=>{
          if(k.startsWith('tp$') || k.startsWith('sk$') || k[0]==='$' || k==='__module__' || k==='__doc__' || k==='__dict__' || k==='__weakref__' || k==='__abstractmethods__') return;
          if(k.startsWith('__') && !SHOW_DUNDER.has(k)) return;
          const x = v.prototype[k];
          if(x instanceof Sk.builtin.func) o.entries.push([k+'()', {p:x.__isabstractmethod__ || (x.$d && x.$d.mp$lookup && x.$d.mp$lookup(new Sk.builtin.str('__isabstractmethod__'))) ? 'abstract' : 'method', fn:1}]);
          else if(x && x.tp$name==='property') o.entries.push([k, {p:'property', fn:1}]);
          else if(x && (x.tp$name==='classmethod' || x.tp$name==='staticmethod')) o.entries.push([k+'()', {p:x.tp$name, fn:1}]);
          else { const vv = val(x, heap); if(vv) o.entries.push([k, vv]); }
        });
        const baseT = v.prototype.tp$base;
        if(baseT && isUserClass(baseT)) o.base = val(baseT, heap);
      }
      return {r:info.id};
    }
    if(v instanceof Sk.builtin.type) return {p:'class '+(v.prototype && v.prototype.tp$name || reprOf(v)), fn:1};
    if(v instanceof Sk.builtin.module) return null;
    if(tn==='list'||tn==='tuple'||tn==='dict'||tn==='set'||isInstance(v)){
      const info = idOf(v);
      if(!heap[info.id]){
        const o = heap[info.id] = {id:info.id, label:info.label, kind: isInstance(v) && !(tn in {list:1,tuple:1,dict:1,set:1}) ? 'obj' : tn};
        if(tn==='list'||tn==='tuple') o.items = v.v.map(x=>val(x,heap));
        else if(tn==='set') o.items = Sk.misceval.arrayFromIterable(v).map(x=>val(x,heap));
        else if(tn==='dict') o.entries = v.$items().map(([k,x])=>[short(reprOf(k),14), val(x,heap)]);
        else { o.label = tn+' #'+kindN[tn]; o.cname = tn; o.entries = v.$d.$items().map(([k,x])=>[String(k.v), val(x,heap)]).filter(e=>e[1]); const ct = v.ob$type; if(ct && isUserClass(ct)) o.cls = val(ct, heap); }
      }
      return {r:info.id};
    }
    if(tn==='builtin_function_or_method' || tn==='method') return null;
    return {p:short(reprOf(v),28), t:tn};
  }
  function frameName(line){
    for(let l=line-1; l>=0; l--){ const m = src[l] && src[l].match(/^(\s*)def\s+(\w+)/); if(m && (src[line-1]||'').search(/\S/) > m[1].length){
      for(let c=l-1; c>=0; c--){ const cm = src[c] && src[c].match(/^(\s*)class\s+(\w+)/); if(cm && cm[1].length < m[1].length) return cm[2]+'.'+m[2]; if(src[c] && src[c].trim() && src[c].search(/\S/) < m[1].length && !cm) break; }
      return m[2]; } }
    return 'function';
  }
  function snap(chain, extra){
    const heap = {}, frames = [];
    chain.forEach((x, k)=>{
      if(k===0){
        const vars = [];
        Object.keys(x.$gbl||{}).forEach(n=>{ if(n.startsWith('__') || imported.has(n)) return; const vv = val(x.$gbl[n], heap); if(vv) vars.push([n.replace(/_\$rw\$$/,''), vv]); });
        frames.push({name:'Global frame', vars, line:x.$lineno});
      } else {
        const vars = [];
        Object.keys(x.$tmps||{}).forEach(n=>{ if(n[0]==='$') return; const raw = x.$tmps[n]; if(raw===undefined) return; const vv = val(raw, heap); if(vv) vars.push([n.replace(/_\$rw\$$/,''), vv]); });
        const nm = frameName(x.$lineno);
        frames.push({name:nm+'()', fn:nm, vars, line:x.$lineno});
      }
    });
    return Object.assign({frames, heap, out, line: chain.length ? chain[chain.length-1].$lineno : null}, extra||{});
  }
  Sk.configure({
    output: t=>{ out += t; },
    read: f=>{ if(SHIMS[f]) return SHIMS[f]; if(Sk.builtinFiles && Sk.builtinFiles.files[f]!==undefined) return Sk.builtinFiles.files[f]; throw new Error('Module not found: '+f); },
    __future__: Sk.python3, debugging: true, breakpoints: ()=>true,
    inputfun: p=>{ const v = inq.length ? inq.shift() : ''; out += (p||'') + v + '\n'; return v; },
    inputfunTakesPrompt: true
  });
  if(!Sk.__origOpen) Sk.__origOpen = Sk.builtins.open;
  Sk.builtins.open = Sk.__origOpen;
  if(/\bopen\(/.test(code)){
    try{
      try{ Sk.sysmodules.mp$del_subscript(new Sk.builtin.str('memfs')); }catch(e){}
      await Sk.misceval.asyncToPromise(()=>Sk.importModule('memfs', false, true), {'Sk.debug': s=>new Promise(r=>r(s.resume()))});
      const mf = Sk.sysmodules.mp$subscript(new Sk.builtin.str('memfs'));
      Sk.builtins.open = mf.$d.open;
    }catch(e){ console.warn('memfs', e); }
  }
  let lastChain = [], limitHit = false;
  try{
    await Sk.misceval.asyncToPromise(()=>Sk.importMainWithBody('<stdin>', false, prepCode(code), true), {
      'Sk.debug': s=>{
        const chain = []; let c = s; let foreign = false;
        while(c){ if(c.$lineno!==undefined){ if(c.$filename && !/^<stdin>/.test(c.$filename)) foreign = true; else chain.push(c); } c = c.child; }
        if(foreign || !chain.length) return new Promise(res=>res(s.resume()));
        lastChain = chain;
        steps.push(snap(chain));
        if(steps.length >= 600){ limitHit = true; return Promise.reject(new Error('STEP_LIMIT')); }
        return new Promise(res=>res(s.resume()));
      }
    });
    const main = Sk.sysmodules.mp$subscript(new Sk.builtin.str('__main__'));
    steps.push(snap([{ $gbl: main.$d, $lineno: null }], {done:true, line:null}));
  }catch(e){
    if(limitHit){ steps.push(Object.assign(snap(lastChain), {error:'Stopped after 600 steps. A loop may never end, or the program is long. Try smaller input.', line: steps[steps.length-1].line})); }
    else {
      let msg = e && e.toString ? e.toString() : String(e), line = null;
      if(e && e.traceback && e.traceback.length){ const tb = e.traceback.filter(t=>!t.filename || /^<stdin>/.test(t.filename)); line = (tb.length ? tb[tb.length-1] : e.traceback[e.traceback.length-1]).lineno; }
      msg = msg.replace(/ on line \d+$/, '');
      const base = steps.length ? steps[steps.length-1] : {frames:[], heap:{}, out:''};
      steps.push(Object.assign({}, base, {out, error: msg, line: line || base.line, errorType: e && e.tp$name}));
    }
  }
  return {steps, src};
}

/* Run code once at full speed (no tracing), for checking practice problems.
   Returns {out, error, errorType, line}. A time limit stops endless loops. */
async function runPy(code){
  await loadSkulpt();
  let out = '';
  Sk.configure({
    output: t=>{ out += t; },
    read: f=>{ if(SHIMS[f]) return SHIMS[f]; if(Sk.builtinFiles && Sk.builtinFiles.files[f]!==undefined) return Sk.builtinFiles.files[f]; throw new Error('Module not found: '+f); },
    __future__: Sk.python3, debugging: false, execLimit: 4000, yieldLimit: 200,
    inputfun: ()=>'', inputfunTakesPrompt: true
  });
  if(!Sk.__origOpen) Sk.__origOpen = Sk.builtins.open;
  Sk.builtins.open = Sk.__origOpen;
  if(/\bopen\(/.test(code)){
    try{
      try{ Sk.sysmodules.mp$del_subscript(new Sk.builtin.str('memfs')); }catch(e){}
      await Sk.misceval.asyncToPromise(()=>Sk.importModule('memfs', false, true));
      Sk.builtins.open = Sk.sysmodules.mp$subscript(new Sk.builtin.str('memfs')).$d.open;
    }catch(e){ console.warn('memfs', e); }
  }
  try{
    await Sk.misceval.asyncToPromise(()=>Sk.importMainWithBody('<stdin>', false, prepCode(code), true));
    return {out};
  }catch(e){
    let line = null;
    if(e && e.traceback && e.traceback.length){ const tb = e.traceback.filter(t=>!t.filename || /^<stdin>/.test(t.filename)); if(tb.length) line = tb[tb.length-1].lineno; }
    const tp = e && e.tp$name;
    const msg = tp==='TimeLimitError' ? 'Took too long. A loop may never end.' : String(e && e.toString ? e.toString() : e).replace(/ on line \d+$/, '');
    return {out, error: msg, errorType: tp || 'Error', line};
  }
}

/* Plain-English help for the errors students hit most. Returns text, or '' when there is none.
   `code` is the program that ran, used to spot a function whose body is still `pass`. */
function unfinishedFns(code){
  const out = [], lines = String(code||'').split('\n');
  for(let i=0;i<lines.length;i++){
    const m = lines[i].match(/^(\s*)def\s+(\w+)\s*\(/); if(!m) continue;
    const ind = m[1].length, body = [];
    for(let j=i+1;j<lines.length;j++){
      const t = lines[j]; if(!t.trim() || /^\s*#/.test(t)) continue;
      if(t.match(/^\s*/)[0].length <= ind) break;
      body.push(t.trim());
    }
    if(body.length && body.every(b=>b==='pass' || /^("""|''')/.test(b))) out.push(m[2]);
  }
  return out;
}
function explainError(type, msg, code){
  msg = String(msg||''); type = type || (msg.match(/^(\w+):/)||[])[1] || '';
  const none = /NoneType/.test(msg), todo = unfinishedFns(code);
  if(todo.length && (none || /^None$/.test(msg))) return `Your function ${todo[0]}() still has only pass inside, so it gives back None. Replace pass with your own code and finish with a return line.`;
  if(none) return 'A value here is None. That usually means a function finished without a return line, so it gave back None. Check that every path through the function ends with return.';
  if(type==='NameError'){ const n = (msg.match(/name '(\w+)'/)||[])[1]; return `Python does not know the name ${n||'used here'} yet. Check the spelling (capital letters count), and make sure it gets a value on an earlier line.`; }
  if(type==='IndentationError' || /indent/i.test(msg)) return 'The spaces at the start of a line do not line up. Lines inside a def, if, for or while need 4 more spaces than the line that opens the block, and lines in the same block need the same spaces.';
  if(type==='SyntaxError') return 'Python could not read this line. Look for a missing colon at the end of if, for, while or def, a bracket or quote that is never closed, or = where you meant ==.';
  if(type==='ZeroDivisionError') return 'The program divided by zero. Check the number after / or % before dividing, for example with an if.';
  if(type==='IndexError') return 'The program asked for a position that does not exist. A list with n items has positions 0 to n - 1, so check the loop range and empty lists.';
  if(type==='KeyError') return 'That key is not in the dictionary. Check with "if key in d" first, or use d.get(key, default).';
  if(type==='AttributeError') return 'That object has no attribute or method with this name. Check the spelling and what type the value really is.';
  if(type==='RecursionError' || /recursion/i.test(msg)) return 'A function kept calling itself and never stopped. Make sure there is a base case that returns without calling the function again.';
  if(type==='ValueError' && /int\(\)|float\(\)/.test(msg)) return 'int() and float() can only turn text that looks like a number into a number. Check the text you passed in.';
  if(type==='TypeError'){
    if(/positional argument|takes \d|missing \d|argument/.test(msg)) return 'The function was called with a different number of values than its def line accepts. Compare the call with the names in the brackets after def.';
    if(/concatenate|unsupported operand|can only/.test(msg)) return 'Two values of different types were combined, such as text and a number. Convert one first with str(), int() or float().';
    if(/not subscriptable/.test(msg)) return 'Square brackets [ ] only work on lists, strings, tuples and dictionaries. This value is not one of those.';
    if(/not iterable/.test(msg)) return 'A for loop or unpacking needs a list, string, range or similar. This value cannot be looped over.';
    if(/not callable/.test(msg)) return 'Something that is not a function was called with ( ). A name may have been reused for a value.';
  }
  if(type==='TimeLimitError' || /too long|600 steps/.test(msg)) return 'A loop may never end. Check that the loop condition eventually becomes False, for example that a counter changes each time.';
  return '';
}
