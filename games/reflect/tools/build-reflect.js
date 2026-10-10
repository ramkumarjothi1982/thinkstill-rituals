#!/usr/bin/env node
/* Build ThinkStill Reflect.
 *   node games/reflect/tools/build-reflect.js [--framer] [--artifact] [--harness] [--ref <git sha>]
 * Outputs (games/reflect/dist/):
 *   reflect.js            browser bundle (IIFE: window.ThinkStillReflect.mount)
 *   dev-server.js         Node room server + static server for local / two-device testing
 *   worker.js             Cloudflare Worker + Durable Object (rooms) for production
 *   dev/index.html        dev page (served by dev-server.js)
 *   framer/ThinkStillReflect.tsx   Framer code component with the bundle embedded (--framer)
 *   artifact/             claude.ai artifact page + Bubble art (--artifact)
 *   dev/{render,film,ride,occlusion}.html   visual and sightline test harnesses (--harness)
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const esbuild = require(require.resolve('esbuild', { paths: [process.env.NODE_PATH || '', '/opt/npm-tools/node_modules', __dirname] }));

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '../..');
const DIST = path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const TARGET = ['es2020', 'safari15', 'chrome90', 'firefox90'];

function write(rel, data) { const p = path.join(DIST, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); return p; }

async function bundle() {
  const r = await esbuild.build({ entryPoints: [path.join(ROOT, 'src/entry.ts')], bundle: true, format: 'iife', target: TARGET, minify: !has('--no-minify'), write: false, legalComments: 'none', charset: 'utf8' });
  return r.outputFiles[0].text;
}
async function node(entry, out, platform = 'node', format = 'cjs') {
  await esbuild.build({ entryPoints: [path.join(ROOT, entry)], bundle: true, platform, format, target: platform === 'node' ? 'node18' : 'es2022', external: ['ws', 'cloudflare:*'], outfile: path.join(DIST, out), logLevel: 'warning' });
}

const DEV_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>ThinkStill Reflect — dev</title>
<style>html,body{margin:0;height:100%;background:#0f0d1f;overscroll-behavior:none}#app{position:fixed;inset:0}</style>
</head><body><div id="app"></div>
<script src="reflect.js"></script>
<script>
  const q = new URLSearchParams(location.search);
  const server = q.get('server') || ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  window.__mount = ThinkStillReflect.mount(document.getElementById('app'), {
    roomServer: server, assetBase: q.get('img') || '/img/', room: q.get('reflectRoom') || undefined,
    autostart: q.get('autostart') || null, theme: q.get('theme') || 'system', sound: q.get('sound') !== '0',
    reducedMotion: q.get('rm') || 'system'
  });
</script></body></html>`;

async function main() {
  fs.mkdirSync(DIST, { recursive: true });
  const js = await bundle();
  write('reflect.js', js);
  write('dev/reflect.js', js);
  write('dev/index.html', DEV_HTML);
  await node('src/server/dev-server.ts', 'dev-server.js');
  await node('src/server/worker.ts', 'worker.js', 'neutral', 'esm');
  const kb = (n) => (n / 1024).toFixed(1) + ' KB';
  console.log('reflect.js', kb(Buffer.byteLength(js)), 'sha', crypto.createHash('sha256').update(js).digest('hex').slice(0, 10));
  if (has('--framer')) require('./framer-reflect.js').build(js, DIST, args);
  if (has('--artifact')) {
    require('./artifact-reflect.js').build(js, DIST, REPO, args);
    // local stand-in for the artifact runtime, so the live-room path can be tested with two pages in one browser
    const frag = fs.readFileSync(path.join(DIST, 'artifact/index.html'), 'utf8');
    write('dev/artifact.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n<script src="mock-room.js"></script>\n' + frag + '\n</body></html>');
    fs.copyFileSync(path.join(ROOT, 'tests/mock-room.js'), path.join(DIST, 'dev/mock-room.js'));
  }
  if (has('--harness')) {
    // test pages served by the dev server: world / film / ride renders and the Group Think Glitch sightline test
    const page = (name) => `<!doctype html><meta charset=utf-8><title>${name}</title>\n<style>body{margin:0;background:#111;color:#ccc;font:11px monospace}#grid{display:grid;gap:4px;padding:4px}figure{margin:0}figcaption{padding:2px}</style>\n<div id=grid></div><script src="${name}.js"></script>\n`;
    for (const [name, entry] of [['render', 'tests/render-world.ts'], ['film', 'tests/render-film.ts'], ['ride', 'tests/render-ride.ts'], ['occlusion', 'tests/occlusion.ts']]) {
      await esbuild.build({ entryPoints: [path.join(ROOT, entry)], bundle: true, format: 'iife', target: 'es2019', outfile: path.join(DIST, 'dev', name + '.js'), logLevel: 'warning' });
      write('dev/' + name + '.html', page(name));
    }
    console.log('harness: render, film, ride, occlusion');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
