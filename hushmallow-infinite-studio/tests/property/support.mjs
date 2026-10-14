// Shared fixtures for the planner tests (tests/unit/planner-*.test.mjs and
// tests/property/*.test.mjs). Nothing here writes outside WORK/tmp, and no
// test ever touches the real ledger/: commands get --ledger <temp dir>.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkWorkTemp } from '../../render/lib/paths.mjs';
import { loadLibrary } from '../../planner/library.mjs';
import { loadPolicy } from '../../planner/policy.mjs';
import { loadCapabilities, openCapabilities, makeCapabilities } from '../../planner/capabilities.mjs';
import { emptyLedger } from '../../planner/ledger.mjs';

export const HM = fileURLToPath(new URL('../../cli/hm.mjs', import.meta.url));
export const lib = loadLibrary();
export const policy = loadPolicy();

/** Inputs with the committed capabilities (today: Noomi + the T01 moves). */
export const realCtx = () => ({ lib, policy, caps: loadCapabilities(lib), ledger: emptyLedger() });
/** Inputs with everything in the library enabled (what-if; tests only). */
export const openCtx = (opts) => ({ lib, policy, caps: openCapabilities(lib, opts), ledger: emptyLedger() });
/** Capabilities from a raw object, validated against the library. */
export const capsFrom = (raw) => makeCapabilities(raw, { sha256: 'test', lib });

/** A fresh temp dir under WORK/tmp; remove it with done(). */
export function temp(prefix = 'planner-') {
  const dir = mkWorkTemp(prefix);
  return { dir, done: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

/** Run `node cli/hm.mjs args...` → { status, stdout, stderr }. */
export function hm(args, { env = {}, cwd } = {}) {
  const r = spawnSync(process.execPath, [HM, ...args], { encoding: 'utf8', env: { ...process.env, ...env }, cwd, maxBuffer: 64 << 20 });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, out: r.stdout + r.stderr };
}

/** The visible slots of the reference spec (planned by hm plan --seed 42, production, 2026-11-03). */
export const REFERENCE = Object.freeze({
  template: 'T01-brain-at-2am', mallow: 'noomi', realm: 'moonmilk-cove', tod: 'late-night', weather: 'clear', dressing: [], duration: 15,
  seed: 1959558267, gag: { id: 'G-JOLT', intensity: 0.83 }, metaphor: 'M-ORBIT', turn: 'TURN-SQUEEZE', ritual: 'R-BREATH', loop: 'LP-RETURN', camera: 'C-DRIFT-IN',
  copy: {
    hook: ['TRYING TO SLEEP BUT MY', 'BRAIN HAS OTHER PLANS'],
    lines: ['What I said at lunch.', 'Should I explain?', 'Time to replay it again.'],
    end: { kind: 'resolution', text: ['Not every thought', 'needs an answer tonight.'] },
    nameWord: null,
  },
});
export const REFERENCE_FINGERPRINT = 'sha256:fdde38f3e7a133c724839009dc56245241dbb6880aaf502e5edca7eea6baf94a';

const day = (s) => Math.floor(Date.parse(`${s}T00:00:00Z`) / 86400000);

/**
 * An independent re-statement of the posting rules (story-library
 * variationRules), written without planner/schedule.mjs, to cross-check a
 * planned production sequence. → list of violations (strings).
 */
export function independentPostingCheck(specs, { unlocked }) {
  const out = [];
  const bad = (i, msg) => out.push(`#${i} ${specs[i].id}: ${msg}`);
  const fam = (s) => lib.template(s.template).feeling;
  const n = unlocked.length;
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i], d = day(s.plannedFor), prev = specs[i - 1];
    if (prev) {
      if (prev.template === s.template) bad(i, 'template repeats back to back');
      if (prev.ritual === s.ritual) bad(i, 'ritual repeats back to back');
      if (prev.gag.id === s.gag.id) bad(i, 'gag repeats back to back');
      if (n >= 2 && prev.mallow === s.mallow) bad(i, 'Mallow repeats back to back');
    }
    if (i >= 6) {
      const w = specs.slice(i - 6, i + 1);
      if (new Set(w.map((x) => fam(x).family)).size < 4) bad(i, 'fewer than 4 feeling families in 7 posts');
      if (w.filter((x) => fam(x).valence !== 'difficult').length < 2) bad(i, 'fewer than 2 positive/mixed in 7 posts');
    }
    if (i >= 9 && n >= 2) {
      const w = specs.slice(i - 9, i + 1).map((x) => x.mallow);
      for (const m of unlocked) if (!w.includes(m)) bad(i, `${m} missing from 10 consecutive posts`);
      for (const m of unlocked) if (w.filter((x) => x === m).length > Math.max(3, Math.ceil(10 / n))) bad(i, `${m} more than allowed in 10 posts`);
    }
    const week = specs.slice(0, i + 1).filter((x) => d - day(x.plannedFor) < 7);
    const tmax = s.template === 'T01-brain-at-2am' ? 1 : 2;
    if (week.filter((x) => x.template === s.template).length > tmax) bad(i, `${s.template} more than ${tmax} times in 7 days`);
    const earlier = specs.slice(0, i);
    for (const e of earlier) {
      const ago = d - day(e.plannedFor);
      if (ago < 90 && e.copy.hook.join(' ') === s.copy.hook.join(' ')) bad(i, `hook reused after ${ago} days`);
      if (ago < 7 && e.copy.end.kind === 'resolution' && s.copy.end.kind === 'resolution' && e.copy.end.text.join(' ') === s.copy.end.text.join(' ')) bad(i, `resolution reused after ${ago} days`);
      if (e.fingerprint === s.fingerprint) bad(i, 'fingerprint repeats');
    }
    for (const l of s.copy.lines) {
      const uses = specs.slice(0, i + 1).filter((x) => d - day(x.plannedFor) < 30 && x.copy.lines.includes(l)).length;
      if (uses > 3) bad(i, `line "${l}" used ${uses} times in 30 days`);
    }
    if (i >= 2 && [specs[i - 2], specs[i - 1], s].every((x) => x.copy.end.kind === 'closer')) bad(i, '3 brand closers in a row');
  }
  return out;
}

export { fs, path };
