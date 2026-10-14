// Batch folders on disk (PHASE2-PLAN file layout):
//   runs/<batch>/plan.json            the batch manifest (hm-plan/1)
//   runs/<batch>/<id>/spec.json       one variant spec (hm-variant/1)
//   runs/<batch>/<id>/compile.json    hm spec compile report (G-SPEC now; G-DIR once the composer lands)
//   runs/<batch>/<id>/final.mp4, qa/report.json   written by the render farm and QA (WP-01, WP-05)
// runs/ is git-ignored: batches are rebuilt from their specs.

import fs from 'node:fs';
import path from 'node:path';
import { studioPath, assertWritable } from '../render/lib/paths.mjs';
import { pretty } from './canonical.mjs';

export const RUNS_DIR = studioPath('runs');

/** Write a planned batch. Refuses to replace a different existing batch unless force. → dir */
export function writeBatch(dir, { specs, manifest }, { force = false } = {}) {
  const abs = assertWritable(path.resolve(dir));
  const ids = new Set(specs.map((s) => s.id));
  if (ids.size !== specs.length) throw new Error('two specs share an id; refusing to let one overwrite the other');
  const planFile = path.join(abs, 'plan.json');
  const text = pretty(manifest);
  if (fs.existsSync(planFile) && fs.readFileSync(planFile, 'utf8') !== text && !force) {
    throw new Error(`${planFile} exists with a different plan; choose another --batch/--out or pass --force`);
  }
  fs.mkdirSync(abs, { recursive: true });
  for (const s of specs) {
    const d = path.join(abs, s.id);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'spec.json'), pretty(s));
  }
  fs.writeFileSync(planFile, text);
  return abs;
}

export const readJSON = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

/**
 * Resolve a spec reference: a spec.json path, a variant directory, or a spec
 * id searched in runs/<batch>/<id>/spec.json. → { file, dir, spec }
 */
export function findSpec(ref, { runsDir = RUNS_DIR } = {}) {
  let file = null;
  if (fs.existsSync(ref)) {
    file = fs.statSync(ref).isDirectory() ? path.join(ref, 'spec.json') : ref;
    if (!fs.existsSync(file)) throw new Error(`no spec.json in ${ref}`);
  } else {
    const hits = [];
    if (fs.existsSync(runsDir)) {
      for (const b of fs.readdirSync(runsDir)) {
        const f = path.join(runsDir, b, ref, 'spec.json');
        if (fs.existsSync(f)) hits.push(f);
      }
    }
    if (!hits.length) throw new Error(`no spec "${ref}" (looked for ${path.join(runsDir, '*', ref, 'spec.json')})`);
    if (hits.length > 1) throw new Error(`spec id "${ref}" is ambiguous: ${hits.join(', ')}`);
    file = hits[0];
  }
  file = path.resolve(file);
  return { file, dir: path.dirname(file), spec: readJSON(file) };
}

/**
 * The specs of the batch a spec file belongs to (via ../plan.json), or [] for
 * a loose spec. Pass a Map as `cache` when judging many specs of one batch in
 * a single run, so the batch is read once instead of once per spec.
 */
export function batchSpecsOf(specFile, cache = null) {
  const batchDir = path.dirname(path.dirname(specFile));
  if (cache?.has(batchDir)) return cache.get(batchDir);
  const plan = path.join(batchDir, 'plan.json');
  const specs = fs.existsSync(plan)
    ? readJSON(plan).specs.map((e) => path.join(batchDir, e.id, 'spec.json')).filter((f) => fs.existsSync(f)).map(readJSON)
    : [];
  cache?.set(batchDir, specs);
  return specs;
}

/** Spec files of a batch directory (plan order), or [file] for a single spec reference. */
export function specFilesOf(ref, opts) {
  if (fs.existsSync(ref) && fs.statSync(ref).isDirectory() && fs.existsSync(path.join(ref, 'plan.json'))) {
    return readJSON(path.join(ref, 'plan.json')).specs.map((e) => path.resolve(ref, e.id, 'spec.json'));
  }
  return [findSpec(ref, opts).file];
}
