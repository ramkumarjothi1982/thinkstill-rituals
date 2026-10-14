// Shared plumbing for the planner's hm commands (cli/commands/{plan,spec.*,
// approve,reject,export,lib.*}.mjs): argument parsing, loading the inputs,
// and printing. The wall clock is read here, at the CLI edge, never in the
// planner core: the core takes dates and timestamps as inputs, which is what
// keeps plans byte-reproducible.

import { parseArgs } from 'node:util';
import { loadLibrary } from './library.mjs';
import { loadPolicy } from './policy.mjs';
import { loadCapabilities, CAPABILITIES_FILE } from './capabilities.mjs';
import { loadLedger } from './ledger.mjs';

/** Options every planner command accepts. */
export const COMMON = Object.freeze({
  capabilities: { type: 'string' },
  ledger: { type: 'string' },
  json: { type: 'boolean', default: false },
});

/** util.parseArgs with the common options; throws a usage error naming the command. */
export function parse(args, options, name) {
  try {
    return parseArgs({ args, options: { ...COMMON, ...options }, allowPositionals: true, strict: true });
  } catch (e) {
    const err = new Error(`hm ${name}: ${e.message}`);
    err.usage = true;
    throw err;
  }
}

/** 'a,b' → ['a','b'] (undefined stays undefined). */
export const list = (v) => (v === undefined ? undefined : String(v).split(',').map((s) => s.trim()).filter(Boolean));

/** Library, policy, capabilities and ledger for a command. */
export function loadContext(values = {}) {
  const lib = loadLibrary();
  return {
    lib,
    policy: loadPolicy(),
    caps: loadCapabilities(lib, values.capabilities || CAPABILITIES_FILE),
    ledger: loadLedger({ dir: values.ledger }),
  };
}

/** Current time for ledger records (CLI edge only). An explicit --at wins. */
export function nowIso(at) {
  if (at) {
    if (Number.isNaN(Date.parse(at))) throw new Error(`--at: not a date/time: ${at}`);
    return new Date(Date.parse(at)).toISOString();
  }
  return new Date().toISOString();
}

/** Run a command body, turning thrown errors into a message and exit code (2 = usage). */
export async function guarded(fn) {
  try {
    return await fn();
  } catch (e) {
    console.error(e.usage ? e.message : `error: ${e.message}`);
    return e.usage ? 2 : 1;
  }
}

/** Constraint flags shared by hm plan and hm spec new. */
export const CONSTRAINT_OPTIONS = Object.freeze({
  template: { type: 'string' }, mallow: { type: 'string' }, tod: { type: 'string' }, duration: { type: 'string' },
  gag: { type: 'string' }, metaphor: { type: 'string' }, ritual: { type: 'string' }, camera: { type: 'string' },
  turn: { type: 'string' }, weather: { type: 'string' },
});

/** The constraints object from parsed flags (comma lists). */
export function constraintsFrom(values) {
  const c = {};
  for (const k of Object.keys(CONSTRAINT_OPTIONS)) if (values[k] !== undefined) c[k] = list(values[k]);
  if (c.duration) c.duration = c.duration.map(Number);
  return c;
}

/** Human summary of why a plan stopped. */
export function explainFailure(f) {
  const top = Object.entries(f.blockedBy || {}).sort((a, b) => b[1] - a[1]);
  return `stopped at spec ${f.index}${f.plannedFor ? ` (planned for ${f.plannedFor})` : ''} after ${f.attempts} attempts${f.backtracks ? ` and ${f.backtracks} backtracks` : ''}; blocked by: ` +
    (top.map(([r, n]) => `${r} x${n}`).join(', ') || 'nothing plannable');
}
