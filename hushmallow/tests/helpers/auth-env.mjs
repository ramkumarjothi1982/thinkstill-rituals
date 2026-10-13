// Test helpers for the sign-in suites: a Storage double, the vendored
// supabase-js loaded into Node, the local fake of Supabase, and a client
// wired the way the browser wires it (only storage / document / window are
// doubles). No network beyond 127.0.0.1.
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** A Storage double (localStorage / sessionStorage shape). */
export function memoryStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
    keys: () => [...m.keys()],
    dump: () => Object.fromEntries(m),
  };
}

let lib = null;
/** The vendored UMD bundle, evaluated once in this Node process. */
export function supabaseLib() {
  if (!lib) {
    runInThisContext(readFileSync(`${ROOT}vendor/supabase/supabase.js`, 'utf8'), { filename: 'vendor/supabase/supabase.js' });
    lib = globalThis.supabase;
  }
  return lib;
}

/** A minimal document / window pair for createAuth's listeners. */
export function fakeDom() {
  const handlers = { doc: new Map(), win: new Map() };
  const on = (map) => (type, fn) => { if (!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); };
  const doc = { visibilityState: 'visible', addEventListener: on(handlers.doc), head: { append() {} } };
  const win = { addEventListener: on(handlers.win) };
  const fire = (target, type, ev = {}) => { for (const fn of handlers[target].get(type) || []) fn(ev); };
  return { doc, win, fire };
}

export const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
export async function until(fn, { timeout = 4000, step = 20 } = {}) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error('until: timed out');
    await tick(step);
  }
}
