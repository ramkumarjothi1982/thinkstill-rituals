// Engine behaviour on the small fixture directions (engine/dev/fixtures), each
// rendered in a fraction of a second at render scale 0.25:
//   R4   no texture bleed between directions in one page: content-hashed keys
//        and dispose(); the legacy key-only cache bleeds (sensitivity check);
//        a v2 singleton module cannot be set up twice in one page
//   R18  a NaN from subframes() falls back to 16 sub-frames with a logged error
//   R3   the runtime is chosen from meta.runtime ('v3' is routed to the composer
//        runtime, not installed before WP-03)
//   W, H and render scale are parameters; the DRAFT mark touches only its corner

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { EngineSession, topDownSha256, outputSize } from '../../render/worker.mjs';

const P = (direction, extra = {}) => ({ direction, width: 1080, height: 1920, scale: 0.25, seed: 20261013, ...extra });

let session;
async function withSession(fn) {
  return withHeavyLock({ mode: 'shared', label: 'test:parity engine fixtures' }, async () => {
    session ??= await EngineSession.start();
    return fn(session);
  });
}
test.after(async () => { await session?.close(); });

/** Render frame i of the page's current direction and return { hash, rgba (bottom-up), n, errors }. */
async function frame(s, page, info, i) {
  let rgba = null;
  const sink = s.server.addSink((_, buf) => { rgba = buf; }, { bytes: info.width * info.height * 4 });
  try {
    const r = await page.evaluate((i) => window.__engine.render(i), i);
    await page.evaluate((u) => window.__engine.readback(u), sink.url(i));
    await page.evaluate(() => window.__engine.flush());
    return { hash: topDownSha256(rgba, info.width, info.height), rgba, n: r.n, errors: r.errors };
  } finally { sink.close(); }
}

async function cold(s, p, i = 0) {
  const { page, info } = await s.openPage(p);
  try { return { ...(await frame(s, page, info, i)), info }; } finally { await page.close(); }
}

test('R4: two directions in one page show no texture bleed (content-hashed keys, dispose); the legacy cache does bleed', { timeout: 300000 }, async () => {
  await withSession(async (s) => {
    const a = await cold(s, P('dev/text-a')), b = await cold(s, P('dev/text-b'));
    assert.notEqual(a.hash, b.hash, 'the fixtures differ only by the text under texture key b0');
    for (const dispose of [true, false]) {
      const { page, info } = await s.openPage(P('dev/text-a'));
      await frame(s, page, info, 0);
      await page.evaluate((d) => window.__engine.load('dev/text-b', { dispose: d }), dispose);
      const b2 = await frame(s, page, info, 0);
      await page.close();
      assert.equal(b2.hash, b.hash, `second direction in the same page (dispose: ${dispose}) renders exactly like a fresh page`);
    }
    // sensitivity: stage2's cache keyed by 'b0' alone, without dispose, shows the FIRST video's text
    const { page, info } = await s.openPage(P('dev/text-a', { textKeys: 'legacy' }));
    await frame(s, page, info, 0);
    await page.evaluate(() => window.__engine.load('dev/text-b', { dispose: false }));
    const bleed = await frame(s, page, info, 0);
    await page.close();
    assert.notEqual(bleed.hash, b.hash, 'the legacy cache must bleed, or this test proves nothing');
  });
});

test('R4: a v2 module (a singleton) cannot be set up twice in one page; dispose() frees GL objects', { timeout: 300000 }, async () => {
  await withSession(async (s) => {
    const { page } = await s.openPage(P('dev/text-a'));
    try {
      await assert.rejects(page.evaluate(() => window.__engine.load('dev/text-a')), /already set up in this page.*reload the page/);
      const freed = await page.evaluate(() => {
        const r = window.__engine.stage.renderer, gl = window.__engine.stage.gl;
        const tex = [r.artTex, r.faceTex, ...r.texCache.values()];
        window.__engine.dispose();
        return { deleted: tex.every((t) => !gl.isTexture(t)), cache: r.texCache.size, mallow: r.artTex === null };
      });
      assert.deepEqual(freed, { deleted: true, cache: 0, mallow: true });
    } finally { await page.close(); }
  });
});

test('R18: a NaN from subframes() renders with 16 sub-frames and a logged error, never a black frame', { timeout: 300000 }, async () => {
  await withSession(async (s) => {
    const { page, info } = await s.openPage(P('dev/nan'));
    try {
      const f0 = await frame(s, page, info, 0), f1 = await frame(s, page, info, 1);
      assert.equal(f0.n, 1);
      assert.deepEqual(f0.errors, []);
      assert.equal(f1.n, 16);
      assert.equal(f1.errors.length, 1);
      assert.equal(f1.errors[0].kind, 'subframes');
      assert.match(f1.errors[0].message, /returned NaN; using 16/);
      let lit = 0;
      for (let k = 0; k < f1.rgba.length; k += 4) lit += f1.rgba[k] + f1.rgba[k + 1] + f1.rgba[k + 2];
      assert.ok(lit / (f1.rgba.length / 4) > 10, 'the frame is rendered, not black');
      const dry = await page.evaluate(() => window.__engine.dryRun(3));
      assert.deepEqual(dry.subframes, [1, 16, 16]);
      assert.equal(dry.errors.length, 2, 'the dry run reports them too');
    } finally { await page.close(); }
  });
});

test('R3: the runtime comes from meta.runtime: a v3 direction is routed to the composer runtime (not installed before WP-03)', { timeout: 300000 }, async () => {
  await withSession(async (s) => {
    await assert.rejects(s.openPage(P('dev/v3-probe')), /runtime 'v3' \(composer direction\.json\) is not installed yet/);
    const ok = await cold(s, P('dev/text-a'));
    assert.equal(ok.info.runtime, 'v2');
  });
});

test('design size and render scale are parameters; the DRAFT mark changes only its corner', { timeout: 300000 }, async () => {
  await withSession(async (s) => {
    const q = await cold(s, P('dev/text-a'));
    const h = await cold(s, P('dev/text-a', { scale: 0.5 }));
    assert.deepEqual([q.info.width, q.info.height, h.info.width, h.info.height], [270, 480, 540, 960]);
    assert.deepEqual(outputSize({ width: 1080, height: 1920, scale: 0.5 }), { width: 540, height: 960 });
    assert.deepEqual(q.info.design, [1080, 1920]);
    const m = await cold(s, P('dev/text-a', { mark: 'DRAFT' }));
    assert.notEqual(m.hash, q.hash);
    const { width: w, height: hh } = q.info;
    let x1 = -1, y1 = -1, x0 = w, y0 = hh;
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
      const o = ((hh - 1 - y) * w + x) * 4;               // bottom-up rows
      if (m.rgba[o] !== q.rgba[o] || m.rgba[o + 1] !== q.rgba[o + 1] || m.rgba[o + 2] !== q.rgba[o + 2]) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    assert.ok(x0 >= 0 && y0 >= 0 && x1 < w * 0.5 && y1 < hh * 0.1, `mark confined to the top-left corner: [${x0},${y0}]-[${x1},${y1}] of ${w}x${hh}`);
  });
});
