// V3 completion sweep (dev only): plays rituals to the end in a real browser.
//   node hushmallow/tools/v3-sweep.cjs [--from HM-0001] [--to HM-1000] [--only GE-07] [--workers 3] [--speed 3] [--drag] [--photos N] [--mallows 0] [--out report.json]
// Needs the repo served on :8000. Each ritual runs with a random photo count
// (0–6; 0 means the seven Mallow cards stand in) and is finished with the Tap instead button (or, with --drag, with the
// gestures its ghost hints show). Writes a JSON report and prints a summary.
const { createRequire } = require('module');
const req = createRequire('/opt/node-tools/node_modules/');
const { chromium } = req('playwright');
const fs = require('fs');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(`--${k}`);
(async () => {
  const cat = await import(require('path').resolve(__dirname, '../src/v3/data/catalog.js'));
  const built = (await import(require('path').resolve(__dirname, '../src/v3/engines/index.js'))).BUILT;
  const from = Number(arg('from', 'HM-0001').slice(3)), to = Number(arg('to', 'HM-1000').slice(3)), only = arg('only', null);
  const rows = cat.INDEX.filter((r) => { const n = Number(r[0].slice(3)); const eid = cat.ENGINES[r[2]].id; return n >= from && n <= to && (only ? only.split(',').includes(eid) : built.has(eid)); });
  const workers = Number(arg('workers', 3)), speed = Number(arg('speed', 3)), drag = has('drag'), out = arg('out', '/tmp/claude-0/v3-sweep.json');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const results = [];
  let next = 0;
  async function one(row) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const photos = arg('photos', null) != null ? Number(arg('photos')) : Math.floor(Math.random() * 7);
    const t0 = Date.now();
    let phase = 'load', p = 0;
    try {
      await page.goto(`http://localhost:8000/hushmallow/index.html?v3=${row[0]}&photos=${photos}${arg('mallows', null) === '0' ? '&mallows=0' : ''}&speed=${speed}&text=${encodeURIComponent('Everything at work went wrong today and I feel it in my chest')}`);
      await page.waitForFunction(() => globalThis.__hm3 && __hm3.phase === 'play', null, { timeout: 20000 });
      while (Date.now() - t0 < 180000) {
        ({ phase, p } = await page.evaluate(() => ({ phase: __hm3.phase, p: __hm3.progress })));
        if (phase === 'end' || phase === 'closed') break;
        if (phase === 'finale') { await page.waitForTimeout(300); continue; }
        if (drag) {
          const h = await page.evaluate(() => __hm3.hint());
          const path = h?.path || (h?.from ? Array.from({ length: 12 }, (_, i) => [h.from.x + (h.to.x - h.from.x) * i / 11, h.from.y + (h.to.y - h.from.y) * i / 11]) : null);
          if (path) { await page.mouse.move(path[0][0], path[0][1]); await page.mouse.down(); for (const [x, y] of path.slice(1)) await page.mouse.move(x, y, { steps: 2 }); await page.mouse.up(); }
          else if (h?.tap) await page.mouse.click(h.tap.x, h.tap.y);
          else await page.click('.v3-tap');
        } else await page.click('.v3-tap', { timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(drag ? 120 : 160);
      }
    } catch (e) { errors.push('runner: ' + e.message.split('\n')[0]); }
    await page.close();
    return { code: row[0], engine: cat.ENGINES[row[2]].id, law: cat.LAWS[row[3]].n, photos, ok: phase === 'end' && !errors.length, phase, p, seconds: (Date.now() - t0) / 1000, errors: errors.slice(0, 4) };
  }
  async function worker() { while (next < rows.length) { const r = rows[next++]; const res = await one(r); results.push(res); process.stdout.write(`${res.ok ? '.' : 'F'}`); if (!res.ok) process.stdout.write(`[${res.code} ${res.phase} ${res.errors[0] || ''}]`); } }
  await Promise.all(Array.from({ length: workers }, worker));
  await browser.close();
  results.sort((a, b) => a.code.localeCompare(b.code));
  fs.writeFileSync(out, JSON.stringify(results, null, 1));
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} rituals played to the end${drag ? ' (gestures)' : ' (Tap instead)'}. Report: ${out}`);
  for (const b of bad.slice(0, 40)) console.log('FAIL', b.code, b.engine, `law ${b.law}`, b.phase, b.p.toFixed(2), b.errors.join(' | '));
})();
