#!/usr/bin/env node
// Copy the code the Edge Function shares with the rest of Hushmates next to it, so a
// Supabase deploy (which bundles only what is under supabase/functions) carries the very
// same screening, wording and Mallow library as the app and the tests.
//
// supabase/functions/_shared/deps.js is the one list: every shared module it imports from
// ./vendor/… is copied from its source (and everything that module imports, followed), byte
// for byte, keeping the folder layout so relative imports still work:
//   vendor/hushmates-lab/core/…  ←  hushmates-lab/core/…
//   vendor/src/ultra/…           ←  src/ultra/… (the main app's Reframe engine, read-only)
//
//   node tools/sync-edge.mjs           write the copies (and remove stale ones)
//   node tools/sync-edge.mjs --check   exit 1 if any copy differs from its source (the tests run this)

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { LAB_ROOT } from '../server/app-files.mjs';

export const SHARED = join(LAB_ROOT, 'supabase', 'functions', '_shared');
export const VENDOR = join(SHARED, 'vendor');
const HUSHMALLOW = resolve(LAB_ROOT, '..');
const NOTE = 'These files are copies made by tools/sync-edge.mjs. Change the originals, then run it.\n';

const importsOf = (code) => [...code.matchAll(/\b(?:import|export)\s*(?:[^'"`;]*?\sfrom\s*)?['"](\.[^'"]+)['"]/g)].map((m) => m[1]);

/** vendor path → source path, for everything deps.js needs. */
export function plan() {
  const want = new Map();
  const queue = importsOf(readFileSync(join(SHARED, 'deps.js'), 'utf8'))
    .map((spec) => resolve(SHARED, spec))
    .filter((p) => p.startsWith(VENDOR + sep));
  while (queue.length) {
    const target = queue.shift();
    if (want.has(target)) continue;
    const source = join(HUSHMALLOW, relative(VENDOR, target));
    if (!source.startsWith(HUSHMALLOW + sep) || !existsSync(source)) throw new Error(`${relative(LAB_ROOT, target)}: no source at ${source}`);
    want.set(target, source);
    for (const spec of importsOf(readFileSync(source, 'utf8'))) queue.push(resolve(dirname(target), spec));
  }
  return want;
}

function existing(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) existing(p, out); else out.push(p);
  }
  return out;
}

/** → { changed: [paths], stale: [paths] } (relative to the lab folder) */
export function sync({ check = false } = {}) {
  const want = plan();
  const changed = [];
  for (const [target, source] of want) {
    const bytes = readFileSync(source);
    if (existsSync(target) && readFileSync(target).equals(bytes)) continue;
    changed.push(relative(LAB_ROOT, target));
    if (!check) { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes); }
  }
  const readme = join(VENDOR, 'README.md');
  const stale = existing(VENDOR).filter((p) => p !== readme && !want.has(p)).map((p) => relative(LAB_ROOT, p));
  if (!check) {
    for (const p of stale) rmSync(join(LAB_ROOT, p));
    if (!existsSync(readme) || readFileSync(readme, 'utf8') !== NOTE) writeFileSync(readme, NOTE);
  }
  return { changed, stale, files: [...want.keys()].map((p) => relative(LAB_ROOT, p)) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const r = sync({ check });
  if (check && (r.changed.length || r.stale.length)) {
    console.error('The Edge Function’s copies are out of date. Run: node tools/sync-edge.mjs');
    for (const p of [...r.changed, ...r.stale]) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(check ? `The Edge Function’s ${r.files.length} shared files match their sources.` : `Copied ${r.changed.length} of ${r.files.length} shared files; removed ${r.stale.length} stale.`);
}
