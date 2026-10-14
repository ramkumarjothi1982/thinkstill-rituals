// Shared harness of the composer parity tests: an engine page running a
// composer direction through engine/runtime/direction-runtime.js.
//
// The page is engine/index.html opened without a registry direction (the
// registry wiring of runtime v3 is the integrator's, engine/directions.js);
// the runtime is created in the page and handed to the stage, exactly the
// interface Stage.init uses for every runtime. The golden spec is composed IN
// the page, after the stage loaded Fredoka, so layout uses the real font.

import fs from 'node:fs';
import { EngineSession } from '../../render/worker.mjs';
import { studioPath } from '../../render/lib/paths.mjs';
import * as V2 from '../../tools/golden/v2-harness.mjs';

export const GOLDEN_SPEC = studioPath('specs', 'golden', 't01-v2.json');
export const goldenSpec = () => JSON.parse(fs.readFileSync(GOLDEN_SPEC, 'utf8'));
export const STUDIO_URL = '/hushmallow-infinite-studio';

/**
 * Open an engine page and set up a composer direction in it.
 * src: { spec } (composed in the page) or { direction } (a compiled one).
 * → { page, info: { meta, report, served } }
 */
export async function openComposerPage(session, src, { seed = Number(V2.SEED), probe = true } = {}) {
  const page = await session.browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/open with \?direction/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${session.base}${STUDIO_URL}/engine/index.html?seed=${seed}`);
  await page.waitForFunction(() => window.__engine && window.__engine.stage);
  const info = await page.evaluate(async ({ src, url }) => {
    const { createDirectionRuntime } = await import(`${url}/engine/runtime/direction-runtime.js`);
    const rt = createDirectionRuntime(src);
    await window.__engine.stage.init(rt);
    window.__rt = rt;
    return { meta: rt.meta, report: rt.report };
  }, { src, url: STUDIO_URL });
  if (probe) await page.evaluate(async (url) => { window.__probe = await import(`${url}/tools/golden/v2-probe.js`); }, STUDIO_URL);
  if (errors.length) throw new Error(`composer page errors: ${errors.join(' | ')}`);
  return { page, info };
}

/** The direction the page composed (JSON). */
export const pageDirection = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__rt.direction)));

export { EngineSession, V2 };
