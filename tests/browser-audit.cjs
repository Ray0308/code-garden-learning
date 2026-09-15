// Local application integration tests. Requires Playwright and Edge (or PW_CHANNEL).
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const solutions = require('./solutions.cjs');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname.replace(/\/$/, '/index.html'));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: true });
  let cases = 0;
  try {
    for (const language of ['python', 'java', 'php', 'javascript']) {
      const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(language => {
        localStorage.setItem('code-dungeon-language-mode', language);
        const realTimeout = window.setTimeout;
        window.setTimeout = (fn, ms, ...args) => realTimeout(fn, ms === 480 ? 0 : ms, ...args);
      }, language);
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      assert.equal(await page.locator('#titleLanguageModeSelect option').count(), 4);
      assert.equal(await page.locator('[data-test-floor]').count(), 48);
      for (let floor = 0; floor < 48; floor++) {
        const source = await page.evaluate(({ floor, solutions }) => {
          const code = floor < 24 ? solutions[floor] : levels[floor].solution;
          return floor < 24 && activeLanguage !== 'python' ? window.CODE_GARDEN_VARIANT_TOOLS.fromPython(code, activeLanguage) : code;
        }, { floor, solutions });
        for (const mode of ['all', 'step']) {
          await page.evaluate(floor => startAdventure(floor, true), floor);
          await page.locator('#lessonStart').click();
          if (mode === 'all') {
            const refs = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-reference]')].map(el => [el.dataset.reference, { hidden: el.hidden, code: el.dataset.insert, ruby: el.querySelectorAll('rt').length }])));
            if ([0, 6, 8].includes(floor)) assert.ok(refs.turnLeft.hidden && refs.turnRight.hidden, `${language}/${floor}: unused turns hidden`);
            if (floor >= 16 && floor <= 23) assert.match(refs.input.code, /\bmob\b/, `${language}/${floor}: input uses mob`);
            if (floor >= 24 && floor <= 26) assert.ok(refs.input.hidden, `${language}/${floor}: no unused input`);
            if (floor >= 24 && floor <= 29) {
              const name = ['score','name','ready','number','total','items'][floor - 24];
              assert.ok(refs.variables.code.includes(name), `${language}/${floor}: variable name`);
            }
            if (floor === 23) assert.match(refs.for.code, /move\(\)/, `${language}: loop reference has a body`);
            assert.ok(Object.values(refs).filter(ref => !ref.hidden).every(ref => ref.ruby > 0), `${language}/${floor}: visible references have furigana`);
          }
          await page.locator('#codeEditor').fill(source);
          if (mode === 'all') {
            await page.locator('#runBtn').click();
            await page.waitForFunction(() => !running);
          } else {
            // Uses the same handler as the one-step button; bounded to avoid hangs.
            await page.evaluate(async () => {
              for (let i = 0; i < 200; i++) {
                await runStep();
                if (state.cleared || failCard.classList.contains('show')) break;
              }
            });
          }
          const result = await page.evaluate(() => ({ cleared: state.cleared, output: output.textContent, failure: failCard.classList.contains('show') }));
          assert.ok(result.cleared && !result.failure, `${language}/${floor}/${mode}: ${JSON.stringify(result)}`);
          cases++;
        }
      }
      // Exhaust every enemy/ally combination through the real runtime, not a duplicate simulator.
      for (let floor = 18; floor <= 23; floor++) for (let mask = 0; mask < 8; mask++) {
        const result = await page.evaluate(async ({ floor, mask, solutions }) => {
          startAdventure(floor, true);
          const code = solutions[floor];
          editor.value = activeLanguage === 'python' ? code : window.CODE_GARDEN_VARIANT_TOOLS.fromPython(code, activeLanguage);
          let i = 0;
          const random = Math.random;
          Math.random = () => (mask & (1 << i++)) ? .75 : .25;
          try { await runAll(); } finally { Math.random = random; }
          return { cleared: state.cleared, output: output.textContent };
        }, { floor, mask, solutions });
        assert.ok(result.cleared, `${language}/${floor}/random ${mask}: ${result.output}`);
        cases++;
      }
      assert.deepEqual(errors, [], `${language}: uncaught browser errors`);
      // Reload actually resumes the language-specific progress saved by the runtime.
      await page.reload();
      assert.equal(await page.evaluate(() => loadProgress().cleared.length), 48);
      await page.evaluate(() => continueAdventure());
      assert.equal(await page.evaluate(() => currentFloor), 24);
      await page.close();
      console.log(`${language}: 48 floors in all/step modes and 48 random combinations passed`);
    }
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    for (const malformed of ['null', '{}', '{"cleared":7}', '{"cleared":[-1,999,"0"],"lastFloor":"bad"}']) {
      await page.evaluate(value => localStorage.setItem(progressKey(), value), malformed);
      await page.reload();
      assert.deepEqual(await page.evaluate(() => loadProgress().cleared), []);
    }
    for (const [width, height] of [[1920,1080], [1366,768], [1024,600], [800,600], [390,844], [844,390]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => startAdventure(23, true));
      await page.locator('#lessonStart').click();
      const box = await page.locator('#runBtn').boundingBox();
      assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `${width}x${height}: run button outside viewport ${JSON.stringify(box)}`);
      await page.locator('#runBtn').click({ trial: true });
    }
    console.log(`Browser integration: ${cases} execution cases, 6 viewport clickability checks passed.`);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
