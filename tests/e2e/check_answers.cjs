// Runs every lesson in a real browser and checks that:
//   1. the "right" option of every prediction (and every variant) matches what the code really does,
//   2. every lesson can be stepped from start to finish and awards its trophy.
//
//   npm install && npx playwright install chromium
//   node tests/e2e/check_answers.cjs
//
// Set SKULPT_DIR to a folder holding skulpt.min.js and skulpt-stdlib.js to run offline.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const page_html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8')
    .replace('function tlGo(i){', 'window.__test = {tl, TL_LESSONS, tlRetrace, tlActual, tlOpts, tlPredIdx, tlNext, tlCanAdvance, renderTL};\nfunction tlGo(i){');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (process.env.SKULPT_DIR) {
    await page.route(/cdn\.jsdelivr\.net\/npm\/skulpt@1\.2\.0\/dist\/(.*)/, r =>
      r.fulfill({ path: path.join(process.env.SKULPT_DIR, r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  }
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.setContent(page_html);
  await page.click('.modes .tab[data-mode="lesson"]');
  const report = await page.evaluate(async () => {
    const { tl, TL_LESSONS, tlRetrace, tlActual, tlOpts, tlNext, tlCanAdvance, renderTL } = window.__test;
    const bad = [], done = [];
    for (const id of Object.keys(TL_LESSONS)) {
      tl.id = id; tl.k = 0; tl.answers = {};
      for (let v = 0; v < TL_LESSONS[id].variants.length; v++) {
        tl.variant = v; await tlRetrace();
        const actual = tlActual(), opts = tlOpts();
        if (!opts.includes(actual)) bad.push(`${id} variant ${v}: the code gives ${JSON.stringify(actual)}, options are ${JSON.stringify(opts)}`);
      }
      tl.variant = 0; tl.k = 0; await tlRetrace();
      let guard = 0, finished = false;
      while (guard++ < 400) {
        if (!tlCanAdvance()) { if (tl.k === tl.trace.steps.length) tl.answers.check = 0; else tl.answers[0] = 0; renderTL(); }
        const atEnd = tl.k === tl.trace.steps.length;
        tlNext();
        if (atEnd) { finished = true; break; }
      }
      if (!finished) bad.push(`${id}: could not step to the end`); else done.push(id);
    }
    return { bad, done: done.length, trophies: document.querySelector('#trophy-count').textContent };
  });
  await browser.close();
  console.log(`${report.done} lessons stepped to the end, ${report.trophies} trophies awarded`);
  for (const b of report.bad) console.log('FAIL ' + b);
  for (const e of errors) console.log('PAGE ERROR ' + e);
  process.exit(report.bad.length || errors.length ? 1 : 0);
})();
