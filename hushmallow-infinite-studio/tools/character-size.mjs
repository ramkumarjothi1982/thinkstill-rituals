// How large the characters are on screen, frame by frame (objective input for the creative review).
//
//   node tools/character-size.mjs <direction> [out.json]
//
// Loads a dream2 direction (no rendering) and, at every frame, projects each visible Mallow's body
// (silhouette top and base, left and right) to screen pixels of the 1080 × 1920 frame. Reports, per
// second and overall: the tallest companion, the median companion height, Noomi's height, and the
// share of frames in which at least one companion is ≥ 400 px tall (about a third of a phone's width).
import fs from 'node:fs';
import { chromium } from 'playwright';
import { startServer } from '../render/serve.mjs';

const [, , dir = 'feel-something-v3', out] = process.argv;
const server = await startServer(0);
const { port } = server.address();
const browser = await chromium.launch({ args: ['--use-angle=vulkan', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  await page.goto(`http://127.0.0.1:${port}/hushmallow-infinite-studio/dream2/index.html?direction=${dir}&scale=0.25&preview=1`);
  await page.evaluate(() => window.__dream.ready);
  const rows = await page.evaluate(() => {
    const st = window.__dream.stage, v = st.video, fps = v.meta.fps, n = Math.round(v.meta.duration * fps), res = [];
    for (let i = 0; i < n; i++) {
      const S = v.state(i / fps, { center: false, stage: st });
      const r = { t: i / fps, m: {} };
      for (const m of S.mallows) {
        if ((m.fade ?? 1) < 0.5) continue;
        const s = m.sil;
        const top = m.project(s.cx, s.top), base = m.project(s.cx, s.baseY), L = m.project(s.x0, (s.top + s.baseY) / 2), R = m.project(s.x1, (s.top + s.baseY) / 2);
        const h = base.y - top.y, w = R.x - L.x;
        const onScreen = Math.max(0, Math.min(1080, R.x) - Math.max(0, L.x)) * Math.max(0, Math.min(1920, base.y) - Math.max(0, top.y)) / Math.max(1, w * h);
        r.m[m.id] = { h: Math.round(h), w: Math.round(w), cx: Math.round((L.x + R.x) / 2), visible: +onScreen.toFixed(2) };
      }
      res.push(r);
    }
    return res;
  });
  const comp = (r) => Object.entries(r.m).filter(([id, x]) => id !== 'noomi' && x.visible > 0.5).map(([, x]) => x.h);
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const perSecond = [];
  for (let s = 0; s < 20; s++) {
    const R = rows.filter((r) => r.t >= s && r.t < s + 1);
    const all = R.flatMap(comp);
    perSecond.push({ s, companionsVisible: Math.round(R.reduce((a, r) => a + comp(r).length, 0) / R.length * 10) / 10, tallestCompanion: all.length ? Math.max(...all) : 0, medianCompanion: med(all), noomi: med(R.map((r) => r.m.noomi?.h || 0)) });
  }
  const allC = rows.flatMap(comp);
  const summary = {
    direction: dir,
    medianCompanionPx: med(allC), p90CompanionPx: [...allC].sort((a, b) => a - b)[Math.floor(allC.length * 0.9)] || 0,
    framesWithACompanionOver400px: Math.round(rows.filter((r) => comp(r).some((h) => h >= 400)).length / rows.length * 100) + '%',
    medianNoomiPx: med(rows.map((r) => r.m.noomi?.h || 0)), maxNoomiPx: Math.max(...rows.map((r) => r.m.noomi?.h || 0)),
  };
  const res = { summary, perSecond };
  if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
  console.log(JSON.stringify(summary));
  console.log(perSecond.map((p) => `${p.s}s: ${p.companionsVisible} visible, tallest ${p.tallestCompanion}, median ${p.medianCompanion}, noomi ${p.noomi}`).join('\n'));
} finally { await browser.close(); server.close(); }
