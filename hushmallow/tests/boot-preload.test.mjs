// The first screen's modules are preloaded from the published index.html (tools/site/boot-preload.mjs, run by
// tools/build-site.sh), so a phone asks for all of them at once instead of discovering them one import level at a
// time; tools/site/check.mjs fails a build whose index.html misses one, preloads anything else or preloads one twice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOT_ENTRIES, bootModules, injectPreloads, preloadLinks, preloadsIn, staticImports } from '../tools/site/boot-preload.mjs';
import { inlineSources } from '../tools/site/security-headers.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');

test('boot entries: each one is really loaded on the way to the first screen', () => {
  assert.match(read('index.html'), /<script type="module" src="src\/app\/main\.js"/, 'the page module');
  const main = read('src/app/main.js');
  const boot = main.slice(main.indexOf('async function boot()'), main.indexOf('function afterAuthBoot()'));
  assert.match(main, /\n {2}home: \(\) => import\('\.\/scenes\/hushfold\.js'\),/, 'home is the Hushfold');
  assert.match(boot, /await app\.go\('home'/, 'boot opens home');
  for (const m of ['../ui/type.js', '../engine/audio.js', '../engine/haptics.js']) assert.ok(boot.includes(`import('${m}')`), `boot() imports ${m}`);
  assert.match(read('src/app/scenes/hushfold.js'), /await import\('\.\.\/\.\.\/mallows\/touch\/mallow-touch\.js'\)/, 'the stage Mallow');
  assert.deepEqual([...BOOT_ENTRIES], ['src/app/main.js', 'src/ui/type.js', 'src/app/scenes/hushfold.js', 'src/mallows/touch/mallow-touch.js', 'src/engine/audio.js', 'src/engine/haptics.js']);
});

test('bootModules: the static import closure, entries first, each module once, never a module loaded on demand', () => {
  const mods = bootModules(root);
  assert.equal(mods[0], 'src/app/main.js');
  assert.equal(new Set(mods).size, mods.length, 'each once');
  for (const m of [...BOOT_ENTRIES, 'src/auth/boot.js', 'src/auth/public-config.js', 'src/v3/data/catalog.js', 'src/hushfold/stage.js', 'src/mallows/rig.js', 'src/mallows/touch/softbody.js']) assert.ok(mods.includes(m), m);
  // imported later (a tap, idle time, sign-in, a world), never preloaded: they would take a phone's bandwidth from the first screen
  for (const m of ['src/world/realm.js', 'src/hushfold/input-overlay.js', 'src/hushfold/side-panel.js', 'src/engine/safety.js', 'src/mallows/thought/index.js', 'src/auth/client.js', 'src/app/scenes/plans.js', 'src/hushfold/flow/director.js']) assert.ok(!mods.includes(m), m);
  assert.ok(mods.every((m) => m.startsWith('src/') && m.endsWith('.js')), 'app modules only (no vendor, no CSS)');
  // main's own graph comes before the scene's: the order the page needs them in
  assert.ok(mods.indexOf('src/auth/boot.js') < mods.indexOf('src/app/scenes/hushfold.js'));
});

test('staticImports: import / export … from and import \'…\', never import(), a comment or a string', () => {
  const src = [
    "import { a } from './a.js';",
    "import b, {\n  c,\n} from \"../b.js\";",
    "export { d } from './d.js';",
    "export * from './e.js';",
    "import './side-effect.js';",
    "// import { x } from './commented.js';",
    "/* import y from './block.js'; */",
    "const later = import('./dynamic.js');",
    "const s = \"import z from './in-a-string.js'\";",
    "export const f = () => 1;",
  ].join('\n');
  assert.deepEqual(staticImports(src).sort(), ['../b.js', './a.js', './d.js', './e.js', './side-effect.js']);
  assert.throws(() => bootModules(join(tmpdir(), 'hm-boot-no-such-folder'), ['src/none.js']), /boot module missing: src\/none\.js/);
});

test('injectPreloads: the one MallowTouch preload becomes the whole list, the rest of the page (and its CSP hashes) as it was', () => {
  const pub = read('index.html').replace(/(href|src)="src\//g, '$1="v/x1/src/').replace(/href="assets\//g, 'href="v/x1/assets/');
  const mods = bootModules(root);
  const html = injectPreloads(pub, preloadLinks(mods, 'v/x1'), 'v/x1');
  assert.deepEqual(preloadsIn(html), mods.map((m) => `v/x1/${m}`));
  assert.deepEqual(inlineSources([html]), inlineSources([pub]), 'inline code untouched: the Content-Security-Policy hashes stay');
  const strip = (s) => s.replace(/<link rel="modulepreload"[^>]*>\n?/g, '');
  assert.equal(strip(html), strip(pub), 'nothing else changes');
  assert.ok(html.indexOf('rel="modulepreload"') > html.lastIndexOf('rel="stylesheet"'), 'after the stylesheets');
  assert.ok(html.lastIndexOf('rel="modulepreload"') < html.indexOf('<script>'), 'before the inline script');
  assert.throws(() => injectPreloads(strip(pub), ['x'], 'v/x1'), /expected one/);
  assert.equal(preloadsIn('<!-- <link rel="modulepreload" href="a.js"> --><link href="b.js" rel="modulepreload">').join(), 'b.js');
});

test('the built site preloads exactly its boot graph, and check.mjs holds it to that', async () => {
  const out = mkdtempSync(join(tmpdir(), 'hm-boot-site-'));
  const bad = mkdtempSync(join(tmpdir(), 'hm-boot-bad-'));
  try {
    const env = { ...process.env };
    for (const k of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'HM_AUTH_MODE', 'CF_PAGES_BRANCH']) delete env[k];
    const log = execFileSync('bash', [`${root}tools/build-site.sh`, out, 'pre1'], { env, stdio: 'pipe' }).toString();
    const mods = bootModules(join(out, 'v/pre1'));
    assert.match(log, new RegExp(`boot preload: ${mods.length} modules preloaded`));
    assert.match(log, new RegExp(`${mods.length} boot modules preloaded`));
    assert.match(log, /check: ok/);
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    assert.deepEqual(preloadsIn(html), mods.map((m) => `v/pre1/${m}`));
    assert.deepEqual(mods, bootModules(root), 'the published graph is the source graph');
    const { checkSite } = await import('../tools/site/check.mjs');
    assert.deepEqual((await checkSite(out, 'pre1', { env })).problems, []);
    // one missing, one extra (loaded on demand), one twice: each is a problem
    cpSync(out, bad, { recursive: true });
    const broken = html.replace('<link rel="modulepreload" href="v/pre1/src/app/scenes/hushfold.js">\n', '')
      .replace('<link rel="modulepreload" href="v/pre1/src/auth/boot.js">', '<link rel="modulepreload" href="v/pre1/src/auth/boot.js">\n<link rel="modulepreload" href="v/pre1/src/world/realm.js">\n<link rel="modulepreload" href="v/pre1/src/auth/boot.js">');
    writeFileSync(join(bad, 'index.html'), broken);
    const r = await checkSite(bad, 'pre1', { env });
    assert.deepEqual(r.problems.sort(), [
      'index.html does not modulepreload v/pre1/src/app/scenes/hushfold.js (the first screen needs it: tools/site/boot-preload.mjs)',
      'index.html preloads v/pre1/src/auth/boot.js twice',
      'index.html preloads v/pre1/src/world/realm.js, which the first screen does not import statically (tools/site/boot-preload.mjs)',
    ]);
  } finally { rmSync(out, { recursive: true, force: true }); rmSync(bad, { recursive: true, force: true }); }
});
