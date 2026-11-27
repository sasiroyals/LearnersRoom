// Runs every practice problem in a real browser (Skulpt, as students use it) and checks that:
//   1. the solution passes all of its tests,
//   2. the starter code does not,
//   3. the solution can be stepped through on example 1 without an error.
// Output problems compare what the whole program prints.
//
// Set SKULPT_DIR to a folder holding skulpt.min.js and skulpt-stdlib.js to run offline.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8')
    .replace('async function prRunTests(kind){', 'window.__p = {get pr(){ return pr; }, openProblem, tracePy, debugProgram, PROBLEMS, run: () => prRunTests("submit")};\nasync function prRunTests(kind){');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (process.env.SKULPT_DIR) {
    await page.route(/cdn\.jsdelivr\.net\/npm\/skulpt@1\.2\.0\/dist\/(.*)/, r =>
      r.fulfill({ path: path.join(process.env.SKULPT_DIR, r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  }
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.setContent(html);
  const report = await page.evaluate(async () => {
    const P = window.__p, bad = [];
    let n = 0;
    const set = c => { const t = document.querySelector('#pr-code'); t.value = c; t.dispatchEvent(new Event('input')); };
    for (const list of Object.values(P.PROBLEMS)) for (const pb of list) {
      n++;
      P.openProblem(pb.id);
      set(pb.solution); await P.run();
      const sol = P.pr.results;
      if (sol.pass !== sol.total) bad.push(`${pb.id}: solution passes ${sol.pass}/${sol.total}: ${sol.items.filter(x => !x.ok).map(x => x.error || x.got).join(' | ')}`);
      set(pb.starter); await P.run();
      if (P.pr.results.pass === P.pr.results.total) bad.push(`${pb.id}: starter already passes`);
      const tr = await P.tracePy(P.debugProgram(pb, pb.solution).src, []);
      const last = tr.steps[tr.steps.length - 1];
      if (last.error) bad.push(`${pb.id}: stepping the solution fails: ${last.error}`);
    }
    return { n, bad };
  });
  await browser.close();
  report.bad.forEach(b => console.log('FAIL ' + b));
  errors.forEach(e => console.log('PAGE ERROR ' + e));
  console.log(`${report.n} problems checked, ${report.bad.length} failed`);
  process.exit(report.bad.length || errors.length ? 1 : 0);
})();
