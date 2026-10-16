// The Loomi hi-res sweep in the real app (workstream hires-loomi): Loomi as the
// chosen Mallow on the Hushfold home, at 390x844, 360x780 and 320x568, at the
// default and the largest text size (and reduced motion at 320 x largest).
//   node tools/hires/lab/loomi-sweep.cjs <out dir> [label]
// Serve the repo root first (python3 -m http.server 8000 --bind 127.0.0.1).
// Run once with Loomi off HIRES_VERIFIED ("before") and once on ("after"):
// the shots are named the same, and <out>/report.json holds the numbers:
//   art        the rig's art (naturalWidth 1024 = high-res, 363 = old drawing)
//   stages     every emotion stage on MallowTouch, the concerned one also mid-squeeze
//              and after a tap (it never grins: mouthSmile <= .3, mouthOpen <= .1)
//   tiers      MallowTouch tiers gl / tri / strip (no crop: the drawn body fits its rect)
//   panel      the side panel switcher; mallows: the Mallows scene (cards);
//              v3-card: Loomi's V3 ritual card
//   hscroll    any horizontal page scroll (must be 0)
//   frames     rAF frame times on the home stage under 4x CPU throttling
const { createRequire } = require('module');
const fs = require('fs');
const path = require('path');
const req = createRequire((process.env.PLAYWRIGHT_DIR || '/opt/node-tools/node_modules') + '/');
const { chromium } = req('playwright');
const BASE = process.env.APP_BASE || 'http://127.0.0.1:8000/hushmallow/index.html';
const OUT = process.argv[2] || 'loomi-sweep';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
fs.mkdirSync(OUT, { recursive: true });

const VIEWS = [[390, 844], [360, 780], [320, 568]];
const runs = [];
for (const [w, h] of VIEWS) for (const ts of [1, 1.25]) runs.push({ w, h, ts, rm: false });
runs.push({ w: 320, h: 568, ts: 1.25, rm: true });

const wait = (p, ms) => p.waitForTimeout(ms);

async function one(browser, R) {
  const tag = `${R.w}x${R.h}-t${R.ts}${R.rm ? '-rm' : ''}`;
  const ctx = await browser.newContext({ viewport: { width: R.w, height: R.h }, deviceScaleFactor: 2, reducedMotion: R.rm ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([ts, rm]) => {
    try { localStorage.setItem('hm2:prefs', JSON.stringify({ seenIntro: true, mallow: 'loomi', textScale: ts, motion: rm ? 'reduced' : 'system' })); } catch {}
  }, [R.ts, R.rm]);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(BASE);
  await p.waitForFunction(() => window.__hushfold?.touch?.ready, null, { timeout: 60000 });
  await wait(p, 2500);
  const rep = { tag, errs };
  const shot = (n) => p.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
  const face = () => p.evaluate(() => { const v = window.__hushfold.touch.rig.val; return { smile: +v.mouthSmile.toFixed(3), open: +v.mouthOpen.toFixed(3), eyeOpen: +v.eyeOpen.toFixed(3) }; });
  rep.art = await p.evaluate(() => { const t = window.__hushfold.touch; return { id: t.id, natural: t.rig.assets.original.naturalWidth, hires: !!t.rig.mallow.hires, tier: t.tier }; });
  rep.hscroll = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await shot('home');                                                     // talking: Loomi's hello in the subtitles
  const full = R.w === 390 && R.ts === 1 && !R.rm;
  const every = full || (R.w === 320 && R.ts === 1.25 && !R.rm);       // every stage here too
  rep.stages = {};
  const STAGES = every ? ['neutral', 'curious', 'listening', 'concerned', 'playful', 'surprised', 'comforting', 'transforming', 'celebrating', 'resting'] : ['concerned'];
  for (const s of STAGES) {
    await p.evaluate((s) => window.__hushfold.touch.setStage(s), s);
    await wait(p, 1400);
    rep.stages[s] = await face();
    await shot(`stage-${s}`);
  }
  // the concerned Mallow under touch: mid-squeeze and after a tap, never a grin
  await p.evaluate(() => window.__hushfold.touch.setStage('concerned'));
  await wait(p, 1200);
  const box = await p.evaluate(() => { const r = window.__hushfold.touch.bodyRect(); return { x: r.cx, y: r.cy }; });
  await p.mouse.move(box.x, box.y); await p.mouse.down(); await wait(p, 900);
  rep.concernedSqueeze = await face();
  await shot('concerned-squeeze');
  await p.mouse.up(); await wait(p, 250);
  rep.concernedAfter = await face();
  await p.mouse.click(box.x, box.y); await wait(p, 350);
  rep.concernedTap = await face();
  await p.evaluate(() => window.__hushfold.touch.setStage('neutral'));
  await wait(p, 900);
  if (full) {
    rep.tiers = {};
    for (const q of ['gl', 'tri', 'strip']) {
      await p.evaluate((q) => window.__hushfold.touch.setQuality(q), q);
      await wait(p, 1200);
      rep.tiers[q] = await p.evaluate(() => { const t = window.__hushfold.touch, r = t.bodyRect(); return { tier: t.tier, rect: [r.left, r.top, r.width, r.height].map((v) => Math.round(v)) }; });
      await shot(`tier-${q}`);
    }
    await p.evaluate(() => window.__hushfold.touch.setQuality('auto'));
    await wait(p, 800);
  }
  // the switcher in the side panel
  await p.click('[data-hf="panel-handle"]');
  await wait(p, 1200);
  rep.panelHscroll = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await shot('panel');
  if (full) {
    // frame times on the home stage, 4x CPU throttling, while Loomi talks and changes stage
    await p.keyboard.press('Escape'); await wait(p, 600);
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    rep.frames = await p.evaluate(async () => {
      const t = window.__hushfold.touch, d = [];
      let last = performance.now();
      const stages = ['concerned', 'celebrating', 'neutral', 'surprised'];
      let i = 0;
      const iv = setInterval(() => t.setStage(stages[i++ % stages.length]), 900);
      await new Promise((res) => { const end = last + 4000; const f = (n) => { d.push(n - last); last = n; if (n < end) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      clearInterval(iv);
      d.shift(); d.sort((a, b) => a - b);
      const q = (x) => +d[Math.min(d.length - 1, Math.floor(d.length * x))].toFixed(1);
      return { n: d.length, mean: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1), p50: q(0.5), p95: q(0.95), max: q(1) };
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  // the Mallows scene: every Mallow's card picture
  await p.evaluate(() => { window.__hush.go('mallows'); }).catch(() => {});
  await p.waitForLoadState('load');
  await wait(p, 1500);
  rep.mallowsHscroll = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  rep.loomiCard = await p.evaluate(() => { const i = [...document.images].find((im) => /loomi/.test(im.src)); return i ? { src: i.src.split('/assets/')[1], natural: i.naturalWidth, shown: Math.round(i.getBoundingClientRect().width) } : null; });
  await shot('mallows');
  if (full) {
    // the V3 ritual's Mallow cards (painted from m.file): Loomi's card
    const card = await p.evaluate(async () => {
      const { mallowCards } = await import(new URL('src/v3/mallow-cards.js', location.href).href);
      const it = (await mallowCards()).find((c) => c.mallow === 'loomi');
      return it ? it.img.toDataURL('image/png') : null;
    });
    if (card) fs.writeFileSync(path.join(OUT, `${tag}-v3-card.png`), Buffer.from(card.split(',')[1], 'base64'));
    rep.v3Card = !!card;
  }
  await ctx.close();
  return rep;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = [];
  try {
    for (const R of runs) {
      if (ONLY && !ONLY.includes(`${R.w}x${R.h}`)) continue;
      const r = await one(browser, R);
      out.push(r);
      console.log(JSON.stringify(r));
    }
  } finally { await browser.close(); }
  // ONLY=... re-runs some views: keep the other views' rows
  const file = path.join(OUT, 'report.json');
  let prev = [];
  try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  const tags = new Set(out.map((r) => r.tag));
  fs.writeFileSync(file, JSON.stringify([...prev.filter((r) => !tags.has(r.tag)), ...out], null, 1));
})().catch((e) => { console.error(String(e && e.stack || e)); process.exit(1); });
