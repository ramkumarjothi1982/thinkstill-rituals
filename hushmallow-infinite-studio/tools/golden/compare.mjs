// Golden data I/O and comparison, shared by the capture tool and the parity
// tests (and, from WP-03, by the composer's G-STATE gate).
//
// Numeric tolerance: |a − b| ≤ tol · max(1, |a|, |b|), i.e. absolute for
// values near or below 1 and relative for large ones (pixel coordinates go
// up to ~1900, so a pure absolute 1e-9 would demand 1e-12 relative).

import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { GOLDEN_V2 } from '../../render/lib/paths.mjs';

/** Write rows as gzip'd NDJSON (deterministic bytes for identical rows). */
export function writeNdjsonGz(file, rows) {
  const text = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(file, zlib.gzipSync(Buffer.from(text), { level: 9 }));
}

export function readNdjsonGz(file) {
  return zlib.gunzipSync(fs.readFileSync(file)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const writeJSON = (file, v, indent = 1) => fs.writeFileSync(file, JSON.stringify(v, null, indent) + '\n');

/** Load the committed v2 goldens. */
export function loadGoldenV2(dir = GOLDEN_V2) {
  const p = (f) => path.join(dir, f);
  return {
    manifest: readJSON(p('manifest.json')),
    states: readNdjsonGz(p('state.ndjson.gz')),
    mesh: readJSON(p('mesh-hashes.json')),
    subframes: readJSON(p('subframes.json')),
    cues: readJSON(p('cues.json')),
    curves: readJSON(p('curves.json')),
    plan: readJSON(p('plan-v2.json')),
  };
}

/**
 * Deep comparison with numeric tolerance. Types, array lengths and key sets
 * must match exactly. → { equal, compared, maxDelta, diffs: [{ path, a, b }] (first `max`) }
 */
export function compareDeep(a, b, { tol = 0, max = 25 } = {}) {
  const res = { equal: true, compared: 0, maxDelta: 0, diffs: [] };
  const fail = (p, x, y) => { res.equal = false; if (res.diffs.length < max) res.diffs.push({ path: p || '(root)', a: x, b: y }); };
  const walk = (x, y, p) => {
    if (typeof x === 'number' && typeof y === 'number') {
      res.compared++;
      const d = Math.abs(x - y);
      if (d > res.maxDelta) res.maxDelta = d;
      if (!(d <= tol * Math.max(1, Math.abs(x), Math.abs(y))) && !(Object.is(x, y))) fail(p, x, y);
      return;
    }
    if (Array.isArray(x) || Array.isArray(y)) {
      if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) { fail(p, summarise(x), summarise(y)); return; }
      for (let i = 0; i < x.length; i++) walk(x[i], y[i], `${p}[${i}]`);
      return;
    }
    if (x && y && typeof x === 'object' && typeof y === 'object') {
      const kx = Object.keys(x).sort(), ky = Object.keys(y).sort();
      if (kx.join('\0') !== ky.join('\0')) { fail(`${p}{keys}`, kx.join(','), ky.join(',')); return; }
      for (const k of kx) walk(x[k], y[k], p ? `${p}.${k}` : k);
      return;
    }
    if (x !== y) fail(p, x, y);
  };
  walk(a, b, '');
  return res;
}

function summarise(v) {
  return Array.isArray(v) ? `array(${v.length})` : v === null ? 'null' : typeof v;
}

/**
 * Compare two state streams (rows of { i, k, n, t, S, face }) row by row.
 * → { equal, rows, compared, maxDelta, diffs } with diff paths prefixed by "i/k".
 */
export function compareStates(golden, candidate, { tol = 1e-9, max = 25 } = {}) {
  const out = { equal: golden.length === candidate.length, rows: golden.length, compared: 0, maxDelta: 0, diffs: [] };
  if (!out.equal) out.diffs.push({ path: '(row count)', a: golden.length, b: candidate.length });
  const n = Math.min(golden.length, candidate.length);
  for (let r = 0; r < n; r++) {
    const g = golden[r], c = candidate[r];
    const res = compareDeep(g, c, { tol, max: max - out.diffs.length });
    out.compared += res.compared;
    out.maxDelta = Math.max(out.maxDelta, res.maxDelta);
    if (!res.equal) {
      out.equal = false;
      for (const d of res.diffs) if (out.diffs.length < max) out.diffs.push({ ...d, path: `${g.i}/${g.k} ${d.path}` });
    }
  }
  return out;
}

/** One-line description of a failed comparison, for assertion messages. */
export const describe = (res) => `${res.diffs.length} shown of ≥1 differences, maxDelta ${res.maxDelta}: ${res.diffs.slice(0, 5).map((d) => `${d.path}: ${JSON.stringify(d.a)} vs ${JSON.stringify(d.b)}`).join('; ')}`;
