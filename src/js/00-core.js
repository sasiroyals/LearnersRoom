/* 00-core.js: Shared helpers: storage with an in-memory fallback, DOM shortcuts, escaping. */
"use strict";
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const mem = {};
const store = {
  get(k){ try{ const v = localStorage.getItem(k); if(v!==null) return v; }catch(e){} return k in mem ? mem[k] : null; },
  set(k,v){ mem[k] = v; try{ localStorage.setItem(k,v); }catch(e){} }
};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
