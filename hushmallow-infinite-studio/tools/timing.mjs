// Dev probe: wall-clock cost of the v2 render stages (the page's own clock is frozen for determinism).
import { chromium } from 'playwright';
import { startServer } from '../render/serve.mjs';
const server = await startServer(0);
const { port } = server.address();
const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/hushmallow-infinite-studio/stage2/index.html?video=${process.argv[2] || 'my-brain-at-2am-v2'}`);
await page.evaluate(() => window.__stage.ready);
const time = async (label, fn, n = 3) => {
  const t0 = Date.now();
  for (let i = 0; i < n; i++) await page.evaluate(fn);
  console.log(label, ((Date.now() - t0) / n).toFixed(0), 'ms');
};
await time('state()', () => { const st = window.__stage.stage; st.video.state(0.5, st); });
await time('frame + png (t=0.50)', () => { window.__stage.renderFrame(15); }, 1);
await time('frame raw (t=3.0)', () => { window.__stage.renderFrame(90, { capture: "raw" }); });
await time('frame raw (t=0.50)', () => { window.__stage.renderFrame(15, { capture: "raw" }); });
console.log('subframes per frame', await page.evaluate(() => { const st = window.__stage.stage; return [0, 10, 12, 15, 20, 29, 30, 32, 40, 100, 180, 200, 270, 280, 300].map((i) => i + ':' + st.video.subframes(i / 30, st)).join(' '); }));
await browser.close(); server.close();
