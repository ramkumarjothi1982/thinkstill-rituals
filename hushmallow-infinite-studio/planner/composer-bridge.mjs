// The planner's single seam to the composer (WP-03). Compile runs G-SPEC in
// the planner, then, once the composer exists, composes the spec and runs
// its G-DIR and G-COST. Until composer/ exists the gates are recorded as not
// run, never as passed (planner/compile.mjs).
//
// What the planner expects of the composer (docs/SPEC.md, "Compile"); WP-03
// owns these modules and, if it settles on another shape, changes only this
// file:
//   composer/compose.js   export compose(spec, { lib })          → compiled  (sync or async)
//   composer/validate.js  export gdir(compiled, { spec, lib })    → { pass: boolean, errors: [{ rule, message }], warnings?, metrics? }
//   composer/cost.js      export gcost(compiled, { spec, lib })   → same shape (optional; without it G-COST stays not run)
//
// HM_COMPOSER_DIR points the planner at another composer directory. The
// property tests use it to drive the whole compile path through a stub
// composer (tests/property/fixtures/), which proves the wiring, not G-DIR.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { studioPath, studioRel } from '../render/lib/paths.mjs';

export const COMPOSER_DIR = studioPath('composer');
export const COMPOSER_MISSING = 'composer not built yet (WP-03): composer/compose.js and composer/validate.js do not exist, so compile runs G-SPEC only';

/** The composer directory in force: HM_COMPOSER_DIR, else <studio>/composer. */
export function composerDir() {
  return process.env.HM_COMPOSER_DIR ? path.resolve(process.env.HM_COMPOSER_DIR) : COMPOSER_DIR;
}

const loaded = new Map();

/**
 * Load the composer from dir. → { dir, compose, gdir, gcost|null }, or null
 * when compose.js or validate.js is missing. A composer that exists but does
 * not export compose() and gdir() is a hard error, never a silent skip.
 * Cached per directory for the life of the process.
 */
export function loadComposer(dir = composerDir()) {
  if (!loaded.has(dir)) loaded.set(dir, importComposer(dir));
  return loaded.get(dir);
}

async function importComposer(dir) {
  const file = (n) => path.join(dir, n);
  if (!fs.existsSync(file('compose.js')) || !fs.existsSync(file('validate.js'))) return null;
  const c = await import(pathToFileURL(file('compose.js')).href);
  const v = await import(pathToFileURL(file('validate.js')).href);
  const k = fs.existsSync(file('cost.js')) ? await import(pathToFileURL(file('cost.js')).href) : null;
  if (typeof c.compose !== 'function') throw new Error(`${file('compose.js')} must export compose(spec, { lib })`);
  if (typeof v.gdir !== 'function') throw new Error(`${file('validate.js')} must export gdir(compiled, { spec, lib })`);
  if (k && typeof k.gcost !== 'function') throw new Error(`${file('cost.js')} must export gcost(compiled, { spec, lib })`);
  return { dir, compose: c.compose, gdir: v.gdir, gcost: k ? k.gcost : null };
}

/** A gate result from the composer, checked: pass must be a boolean and errors a list. */
function gateResult(name, r, composer) {
  const where = studioRel(composer.dir) ?? composer.dir;
  if (!r || typeof r !== 'object' || typeof r.pass !== 'boolean' || !Array.isArray(r.errors ?? [])) {
    return { pass: false, status: 'ran', errors: [{ rule: `${name}:result`, message: `${name} returned no boolean pass (got ${JSON.stringify(r)?.slice(0, 80)})` }], warnings: [], composer: where };
  }
  const errors = r.errors ?? [], warnings = r.warnings ?? [];
  // a gate that reports errors has failed, whatever its pass flag says
  return { pass: r.pass && errors.length === 0, status: 'ran', warn: warnings.length > 0, errors, warnings, metrics: r.metrics ?? {}, composer: where };
}

/**
 * Compose a spec and run the composer's gates. → { 'G-DIR': gate, 'G-COST': gate }.
 * composer: from loadComposer(), or null (not built: both gates not run).
 */
export async function composerGates(spec, { lib, composer }) {
  if (!composer) {
    const notRun = { pass: null, status: 'not-run', reason: COMPOSER_MISSING };
    return { 'G-DIR': notRun, 'G-COST': { ...notRun } };
  }
  let compiled;
  try {
    compiled = await composer.compose(spec, { lib });
  } catch (e) {
    return {
      'G-DIR': { pass: false, status: 'ran', errors: [{ rule: 'compose', message: `compose() threw: ${e.message}` }], warnings: [], composer: studioRel(composer.dir) ?? composer.dir },
      'G-COST': { pass: null, status: 'not-run', reason: 'compose() failed' },
    };
  }
  const gates = { 'G-DIR': gateResult('G-DIR', await composer.gdir(compiled, { spec, lib }), composer) };
  gates['G-COST'] = composer.gcost
    ? gateResult('G-COST', await composer.gcost(compiled, { spec, lib }), composer)
    : { pass: null, status: 'not-run', reason: `no ${path.join(studioRel(composer.dir) ?? composer.dir, 'cost.js')} yet` };
  return gates;
}
