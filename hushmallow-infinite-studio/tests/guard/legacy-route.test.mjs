// Guard: the legacy route that renders the frozen v2 keeps working. The
// frozen files themselves are hash-locked; this checks what they depend on
// but is NOT frozen: every relative import they make resolves to a file, and
// render/serve.mjs (owned by WP-01) keeps the API render.mjs and
// soundtrack.mjs import from it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { STUDIO, REPO } from '../../render/lib/paths.mjs';

const V2_ENTRY = ['stage2/stage.js', 'videos/my-brain-at-2am-v2.js', 'audio/soundtrack-v2.mjs', 'render/render.mjs'];

/** Static import / new URL('…', import.meta.url) specifiers of a module. */
function specifiers(src) {
  const out = new Set();
  for (const m of src.matchAll(/\b(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]/g)) out.add(m[1]);
  for (const m of src.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) out.add(m[1]);
  for (const m of src.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g)) out.add(m[1]);
  return [...out];
}

test('every relative import of the v2 module graph resolves (stage2 → stage/ clock, app registry, assets)', () => {
  const seen = new Set(), missing = [];
  const visit = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const abs = path.join(STUDIO, rel);
    if (!fs.existsSync(abs)) { missing.push(rel); return; }
    if (!/\.m?js$/.test(abs)) return;
    for (const s of specifiers(fs.readFileSync(abs, 'utf8'))) {
      if (!s.startsWith('.')) continue;                    // bare: node builtins / playwright
      visit(path.relative(STUDIO, path.resolve(path.dirname(abs), s)).split(path.sep).join('/'));
    }
  };
  V2_ENTRY.forEach(visit);
  assert.deepEqual(missing, []);
  assert.ok(seen.has('../hushmallow/src/mallows/registry.js'), 'the v2 direction imports the app registry read-only');
  assert.ok(seen.has('stage/components/clock.js'), 'stage2 depends on the v1 clock (R19)');
});

test('render/serve.mjs keeps the API the frozen route imports', async () => {
  const serve = await import('../../render/serve.mjs');
  assert.equal(typeof serve.startServer, 'function');
  assert.equal(serve.REPO_ROOT, REPO);
  const server = await serve.startServer(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/hushmallow-infinite-studio/stage2/index.html`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /stage\.js/);
  } finally {
    server.close();
  }
});
