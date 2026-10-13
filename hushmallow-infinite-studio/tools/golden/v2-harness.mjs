// Node-side harness around the frozen v2 stage: opens stage2/index.html
// exactly the way render/render.mjs does for a '-v2' video (same Chromium
// flags, viewport, URL and seed), then samples state or renders frames.
// Used by tools/golden/capture-v2.mjs, tests/parity and tests/golden.

import { chromium } from 'playwright';
import { startServer } from '../../render/serve.mjs';
import { flipRows } from '../../render/lib/png.mjs';

export const VIDEO = 'my-brain-at-2am-v2';
export const SEED = '20261013';
export const FPS = 30;
export const W = 1080, H = 1920;

/** Chromium flags of the approved render (render/render.mjs openStage). */
export const LEGACY_ARGS = Object.freeze(['--disable-gpu-vsync', '--disable-frame-rate-limit', '--force-color-profile=srgb', '--font-render-hinting=none']);
/**
 * Explicit software-WebGL opt-ins for R2, measured by the golden capture
 * (qa/golden/v2/determinism.json). Measured in WP-00: '--use-angle=vulkan
 * --enable-unsafe-swiftshader' is bit-identical to the legacy flags at the same
 * speed, so WP-01 should use it. The plan's '--use-angle=swiftshader' changes
 * pixels (up to 49/255) and is ~4x slower, so it must not be used.
 */
export const FLAG_VARIANTS = Object.freeze({
  'unsafe-swiftshader': ['--enable-unsafe-swiftshader'],
  'angle-vulkan+unsafe-swiftshader (recommended)': ['--use-angle=vulkan', '--enable-unsafe-swiftshader'],
  'angle-swiftshader+unsafe-swiftshader (PHASE2-PLAN WP-01)': ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
export const RECOMMENDED_ARGS = Object.freeze([...LEGACY_ARGS, '--use-angle=vulkan', '--enable-unsafe-swiftshader']);

/** The 16 golden times (s) from PHASE2-PLAN WP-00. Frame index = t·fps (29.4 for the 0.98 s landing). */
export const GOLDEN_TIMES = Object.freeze([0, 0.2, 0.4, 0.6, 0.98, 1.1, 3.2, 4.5, 6.5, 7.0, 8.9, 9.6, 10.5, 11.9, 12.8, 14.9]);
export const frameIndex = (t) => t * FPS;          // i / FPS === t exactly for all 16 (checked by the capture)
export const goldenName = (t) => `golden-${t.toFixed(3).padStart(6, '0')}s.png`;

/** Start the static server and a browser. → { browser, server, port, close() } */
export async function launch({ args = LEGACY_ARGS } = {}) {
  const server = await startServer(0);
  const { port } = server.address();
  const browser = await chromium.launch({ args: [...args] });
  return {
    browser, server, port, args: [...args],
    async close() { try { await browser.close(); } finally { server.close(); } },
  };
}

/** Open a fresh stage page (new JS realm, new WebGL context) and wait for setup. → { page, info } */
export async function openStage(env, { probe = false, onConsole } = {}) {
  const page = await env.browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') (onConsole || console.error)(`[page] ${m.text()}`); });
  page.on('pageerror', (e) => (onConsole || console.error)(`[page] error ${e.message}`));
  await page.goto(`http://127.0.0.1:${env.port}/hushmallow-infinite-studio/stage2/index.html?video=${VIDEO}&seed=${SEED}`);
  const info = await page.evaluate(() => window.__stage.ready);
  if (probe) await page.evaluate(async () => { window.__probe = await import('/hushmallow-infinite-studio/tools/golden/v2-probe.js'); });
  return { page, info };
}

/** Render frame i through the frozen renderFrame(i, { capture: 'raw' }). → RGBA Buffer, top-down rows. */
export async function renderRaw(page, i) {
  const b64 = await page.evaluate((i) => window.__stage.renderFrame(i, { capture: 'raw' }), i);
  return flipRows(Buffer.from(b64, 'base64'), W, H);
}

/** Sample every state of frames [0, frames) in chunks (keeps CDP messages small). */
export async function sampleAllStates(page, frames, { chunk = 30, onChunk } = {}) {
  const out = [];
  for (let a = 0; a < frames; a += chunk) {
    const b = Math.min(frames, a + chunk);
    out.push(...await page.evaluate(([a, b]) => window.__probe.sampleFrames(a, b), [a, b]));
    onChunk?.(b, frames);
  }
  return out;
}

export const sampleIndices = (page, indices) => page.evaluate((ix) => window.__probe.sampleIndices(ix), indices);
export const cueLog = (page) => page.evaluate(() => window.__probe.cueLog());
export const glInfo = (page) => page.evaluate(() => window.__probe.glInfo());
