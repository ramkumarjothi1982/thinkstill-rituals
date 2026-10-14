// Canonical JSON and hashing. Specs, fingerprints and ledger lines are hashed
// and compared byte for byte, so object key order must never matter: every
// hash in the planner goes through canonical() (keys sorted at every depth,
// no whitespace, no undefined).

import crypto from 'node:crypto';

/** Canonical JSON: sorted keys at every depth, arrays in order, no whitespace. */
export function canonical(value) {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) if (v[k] !== undefined) out[k] = sortDeep(v[k]);
    return out;
  }
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`non-finite number in canonical JSON: ${v}`);
  return v;
}

/** sha256 hex of a string or Buffer. */
export const sha256Hex = (data) => crypto.createHash('sha256').update(data).digest('hex');

/** 'sha256:<hex>' of the canonical JSON of value. */
export const hashOf = (value) => `sha256:${sha256Hex(canonical(value))}`;

/** Pretty, stable JSON for files people read (sorted keys would scramble specs, so key order is the writer's). */
export const pretty = (value) => `${JSON.stringify(value, null, 2)}\n`;
