// Load buildPlanV2 from the frozen audio/soundtrack-v2.mjs without running it.
//
// That module ends with an unconditional `main(buildPlanV2)` (it is a CLI),
// so importing it would start a render. Instead we read it as text, drop
// that one statement, point its relative import at the real soundtrack.mjs,
// and import the result from a data: URL. The frozen file is never written,
// and every line that defines the plan is executed exactly as shipped.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { studioPath } from '../../render/lib/paths.mjs';

const SRC = studioPath('audio', 'soundtrack-v2.mjs');
const MAIN_CALL = "main(buildPlanV2).catch((e) => { console.error('[soundtrack-v2]', e); process.exit(1); });";
const IMPORT = "from './soundtrack.mjs';";

let cached;
export async function loadBuildPlanV2() {
  if (cached) return cached;
  const src = fs.readFileSync(SRC, 'utf8');
  if (src.split(MAIN_CALL).length !== 2 || src.split(IMPORT).length !== 2) {
    throw new Error('audio/soundtrack-v2.mjs no longer has the expected shape (it is frozen: check the hash-lock)');
  }
  const patched = src
    .replace(MAIN_CALL, '/* main() call removed by tools/golden/plan-v2.mjs */')
    .replace(IMPORT, `from ${JSON.stringify(pathToFileURL(studioPath('audio', 'soundtrack.mjs')).href)};`);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(patched).toString('base64')}`);
  cached = mod.buildPlanV2;
  return cached;
}

/** buildPlanV2's event list for a cue log { video, title, fps, duration, cues, curves }. */
export async function planV2(log) {
  return (await loadBuildPlanV2())(log);
}
