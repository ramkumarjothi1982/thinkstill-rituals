// Determinism of the dream2 stage: the same frames rendered in two fresh pages, in opposite
// orders, must be bit-identical (every frame is a pure function of time; no render history).
//   node tools/determinism-dream2.mjs <out.json> [scale] [direction]   (default feel-something-v2)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { startServer } from '../render/serve.mjs';

const [out, scale = '0.5', dir = 'feel-something-v2'] = process.argv.slice(2);
// v3: the tears, the hug, the arrivals, the drop, the slow blink, the brand, the loop's last frame
const FRAMES = dir === 'feel-something-v3' ? [100, 190, 262, 305, 415, 500, 598] : [37, 75, 262, 290, 452, 540, 598];
const server = await startServer(0);
const browser = await chromium.launch({ args: ['--use-angle=vulkan', '--enable-unsafe-swiftshader'] });
async function hashes(order) {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/hushmallow-infinite-studio/dream2/index.html?direction=${dir}&scale=${scale}`);
  await page.evaluate(() => window.__dream.ready);
  const h = {};
  for (const i of order) {
    const url = await page.evaluate((i) => window.__dream.renderFrame(i, { capture: 'png' }), i);
    h[i] = crypto.createHash('sha256').update(Buffer.from(url.split(',')[1], 'base64')).digest('hex').slice(0, 16);
  }
  await page.close();
  return h;
}
const a = await hashes(FRAMES), b = await hashes([...FRAMES].reverse());
const res = { direction: dir, scale: Number(scale), frames: FRAMES, identical: FRAMES.filter((i) => a[i] === b[i]).length, a, b };
res.pass = res.identical === FRAMES.length;
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify({ identical: `${res.identical}/${FRAMES.length}`, pass: res.pass }));
await browser.close(); server.close();
