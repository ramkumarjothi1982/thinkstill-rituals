// Screenshot a studio dev page (component tests): node tools/shot.mjs <path-under-repo> <out.png> [w] [h]
import { chromium } from 'playwright';
import { startServer } from '../render/serve.mjs';
const [, , rel, out, w = '1600', h = '1000'] = process.argv;
const server = await startServer(0);
const { port } = server.address();
const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/${rel}`);
await page.waitForFunction(() => window.__done === true, null, { timeout: 120000 });
await page.screenshot({ path: out });
await browser.close(); server.close();
console.log('wrote', out);
