// Parity tables for the Phase 3 shared-engine edits (SHARED.md L9 and L11).
//
// Both were recorded from the Phase 2 code BEFORE the edits and are asserted
// by tests/phase3-shared.test.mjs, so the edits provably change nothing:
//   personality  `_styled` / `respond()` for every profile × style × gesture over 50 seeds
//   comfort      sanitize / itemKey / favourites / offers for a seeded corpus of
//                Phase 2 (pre-hushbeat) stored profiles
// Only short digests are stored. Re-record ONLY for an intended change:
//   node hushmallow/sensory-lab/tests/lib/parity.mjs --write
//   node hushmallow/sensory-lab/tests/lib/parity.mjs           (check)

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Personality, PROFILES, profileFor } from '../../core/personality.js';
import { ComfortDNA, sanitize, itemKey, POCKET_MODES, COMFORTS } from '../../core/comfort-dna.js';
import { MemoryComfortStore } from '../../adapters/comfort-store.js';
import { MATERIAL_IDS } from '../../core/materials.js';
import { MALLOW_IDS } from '../../../src/mallows/registry.js';
import { REALM_IDS } from '../../../src/world/realm.js';
import { rng } from '../../core/math.js';

export const FIXTURES = {
  personality: fileURLToPath(new URL('./parity-personality.json', import.meta.url)),
  comfort: fileURLToPath(new URL('./parity-comfort.json', import.meta.url)),
};

/** Canonical text: sorted keys; own undefined keys and ±Infinity kept distinct (deepStrictEqual-grade). */
export function canon(v) {
  if (v === undefined) return 'u';
  if (typeof v === 'number') return Number.isFinite(v) ? JSON.stringify(v) : String(v);
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
}
export const digest = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

// ------------------------------------------------------------ personality --
export const STYLES = ['gentle', 'balanced', 'playful'];
export const SEEDS = 50;
export const IDS = [...Object.keys(PROFILES), 'unknown'];   // 'unknown' = BASE only

// The same scripted session for every seed: picks, tickle, dizzy, groove, holds, strokes, drags, squeezes.
const SCRIPT = [
  ...Array.from({ length: 12 }, (_, i) => ['tap', { streak: i + 1 }]),
  ['tap', { streak: 5, steady: true, interval: 420 }],
  ['doubletap', {}], ['doubletap', {}], ['doubletap', {}], ['doubletap', {}],
  ['holdstart', {}], ['holding', { dur: 1000 }], ['holding', { dur: 5000 }], ['holding', { dur: 6000 }], ['holdend', {}],
  ['strokestart', {}], ['stroke', { speed: 300 }], ['stroke', { speed: 320 }], ['stroke', { speed: 1200 }], ['strokeend', {}],
  ['dragstart', {}], ['dragend', {}], ['dragend', { fling: true }], ['dragend', { converted: true }],
  ['squeezestart', {}], ['squeezeend', { peak: 0.2 }], ['squeezeend', { peak: 0.5 }], ['squeezeend', { amount: -0.6 }],
  ['bogus', {}],
];

/** { 'id|style|gesture': digest of every response to that gesture over 50 seeds, plus '…|rest' and '…|_styled' }. */
export function personalityTable() {
  const out = {};
  for (const id of IDS) {
    for (const style of STYLES) {
      const acc = {};
      for (let seed = 1; seed <= SEEDS; seed++) {
        const p = new Personality(id, { seed, style });
        for (const [g, d] of SCRIPT) (acc[g] ||= []).push(canon(p.respond(g, { ...d })));
        (acc.rest ||= []).push(canon(p.restExpression()) + canon(p.history) + canon(p.mood));
      }
      // _styled on every authored response directly (independent of picks and mood)
      const prof = profileFor(id), styled = [], p = new Personality(id, { style });
      for (const k of Object.keys(prof).sort()) {
        for (const r of [prof[k]].flat()) if (r && typeof r === 'object' && 'i' in r) styled.push(k + canon(p._styled({ ...r })));
      }
      acc._styled = styled;
      for (const [g, list] of Object.entries(acc)) out[`${id}|${style}|${g}`] = digest(list.join('\n'));
    }
  }
  return out;
}

// ---------------------------------------------------------------- comfort --
export const PROFILES_N = 120;

// Phase 2 shaped items: valid and invalid of every known kind, plus junk (never 'hushbeat').
const POOL = [
  ...POCKET_MODES.map((id) => ({ kind: 'pocket', id })), { kind: 'pocket', id: 'x' },
  ...MATERIAL_IDS.map((material, i) => ({ kind: 'softbody', material, ...(i % 2 ? { mallow: MALLOW_IDS[i % MALLOW_IDS.length] } : {}) })),
  { kind: 'softbody', material: 'lava' }, { kind: 'softbody', material: MATERIAL_IDS[0], mallow: 'nobody' },
  { kind: 'experience', id: 'touchtalk' }, { kind: 'experience', id: 'pocket-hush' }, { kind: 'experience', id: 'weather' }, { kind: 'experience', id: 'Not A Route!' },
  ...MALLOW_IDS.map((id) => ({ kind: 'mallow', id })), { kind: 'mallow', id: 'nobody' },
  { kind: 'pocket', id: 'soft-breath', extra: 1 }, { kind: 'mystery', id: 'x' }, {},
];
const JUNK = ['junk', null, 42, [], true];
const PREF_VALUES = {
  favouriteMallow: [...MALLOW_IDS, 'nobody'], responses: ['gentle', 'balanced', 'playful', 'loud'],
  animationSpeed: ['slower', 'natural', 'livelier', 'fast'], motion: ['soft', 'normal', 'bouncy', 1],
  voice: [true, false, 'yes'], touchSounds: [true, false, 0], colours: ['mallow', 'warm', 'cool', 'lavender', 'rose', 'red'],
  environment: ['auto', 'stage', ...REALM_IDS, 'moon'], comfort: [[], ['float'], ['squeeze', 'breathe'], [...COMFORTS], ['hack'], 'quiet'],
  toString: [1], evil: ['<script>'],
};

/** A seeded Phase 2 stored profile (may be old, edited or corrupted). */
export function oldProfile(seed) {
  const r = rng(seed * 7919 + 13), pick = (a) => a[Math.floor(r() * a.length)];
  const raw = { version: r() < 0.92 ? 1 : pick([2, undefined, '1']), enabled: pick([true, false, undefined, 'yes']), learn: pick([true, false, undefined]) };
  raw.prefs = {};
  for (const [k, vals] of Object.entries(PREF_VALUES)) if (r() < 0.4) raw.prefs[k] = pick(vals);
  const n = Math.floor(r() * 21);
  raw.favourites = Array.from({ length: n }, () => (r() < 0.1 ? pick(JUNK) : { ...pick(POOL) }));
  if (r() < 0.05) raw.favourites = 'not a list';
  raw.history = {};
  const hn = Math.floor(r() * 8);
  for (let i = 0; i < hn; i++) raw.history['h' + i] = { ...pick(POOL), n: r() < 0.85 ? Math.floor(r() * 9) : 'x', last: r() < 0.9 ? Math.floor(r() * 1e6) : null };
  return { raw, toggles: Array.from({ length: 4 }, () => ({ ...pick(POOL) })) };
}

/** { 'profile:<seed>': digest of sanitize, keys, toggles, favourites, suggestions and bias }. */
export async function comfortTable() {
  const out = {};
  for (let seed = 1; seed <= PROFILES_N; seed++) {
    const { raw, toggles } = oldProfile(seed), parts = [];
    const d = sanitize(raw);
    parts.push(canon(d), canon(d.favourites.map(itemKey)), canon(Object.values(d.history).map(itemKey)));
    const dna = await new ComfortDNA(new MemoryComfortStore(raw), { now: () => 1000 }).load();
    for (const it of toggles) parts.push(canon(dna.toggleFavourite(it)), canon(dna.data.favourites), canon(dna.isFavourite(it)));
    if (dna.data.learn) for (const it of toggles) dna.record(it);
    parts.push(canon(dna.favourites()), canon(dna.suggestions(3)), canon(dna.suggestions(8)), canon(dna.surpriseBias()), canon(sanitize(JSON.parse(JSON.stringify(dna.data)))));
    out[`profile:${seed}`] = digest(parts.join('\n'));
  }
  return out;
}

export const readFixture = (name) => JSON.parse(readFileSync(FIXTURES[name], 'utf8'));

/** Names of entries that differ from the recorded fixture (empty = parity). */
export const mismatches = (fixture, table) => [...new Set([...Object.keys(fixture), ...Object.keys(table)])].filter((k) => fixture[k] !== table[k]);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tables = { personality: personalityTable(), comfort: await comfortTable() };
  for (const [name, t] of Object.entries(tables)) {
    if (process.argv.includes('--write')) { writeFileSync(FIXTURES[name], JSON.stringify(t, null, 1) + '\n'); console.log(`${name}: wrote ${Object.keys(t).length} digests`); continue; }
    const bad = mismatches(readFixture(name), t);
    console.log(bad.length ? `${name}: MISMATCH ${bad.join(', ')}` : `${name}: parity ok (${Object.keys(t).length} digests)`);
    if (bad.length) process.exitCode = 1;
  }
}
