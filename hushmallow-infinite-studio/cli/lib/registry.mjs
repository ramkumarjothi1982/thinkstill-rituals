// Command registry for `hm`: one file per command in cli/commands/, so work
// packages add commands by adding files, never by editing a shared switch.
//
// File name → command path:  lib.validate.mjs → `hm lib validate`
//                             bench.mjs        → `hm bench`
//                             bench.realm.mjs  → `hm bench realm`  (longest match wins)
// A group with no file of its own (`hm lib`) prints its subcommands.
//
// Each command module exports (and does no work at import time; import
// heavy dependencies inside run()):
//   export const summary = 'one line for `hm help`';      required
//   export const usage   = 'hm lib validate [--quiet]';  optional, shown by `hm help <cmd>`
//   export async function run(args, ctx) { … }           required; returns an exit code (default 0)
// ctx = { name, paths, heavy: { withHeavyLock, acquireHeavy }, log }

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const NAME_RE = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*\.mjs$/;

/** Discover command files (sorted). → [{ name: 'lib validate', parts: ['lib','validate'], file }] */
export function discover(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.mjs'))
    .sort()
    .map((f) => {
      if (!NAME_RE.test(f)) throw new Error(`cli/commands/${f}: command files are lower-case words joined by dots, e.g. lib.validate.mjs`);
      const parts = f.slice(0, -4).split('.');
      return { name: parts.join(' '), parts, file: path.join(dir, f) };
    });
}

/** Import a command module and check its contract. */
export async function load(entry) {
  const mod = await import(pathToFileURL(entry.file).href);
  if (typeof mod.run !== 'function') throw new Error(`${path.basename(entry.file)} must export async function run(args, ctx)`);
  if (typeof mod.summary !== 'string' || !mod.summary.trim()) throw new Error(`${path.basename(entry.file)} must export a one-line summary`);
  return { ...entry, run: mod.run, summary: mod.summary.trim(), usage: mod.usage || `hm ${entry.name}` };
}

/**
 * Resolve argv against the discovered commands.
 * → { entry, args } for the longest command whose words prefix argv,
 *   or { group: 'lib', members } when argv names only a group,
 *   or { unknown: word } when nothing matches.
 */
export function resolve(entries, argv) {
  const words = [];
  for (const a of argv) { if (a.startsWith('-')) break; words.push(a); }
  let best = null;
  for (const e of entries) {
    if (e.parts.length <= words.length && e.parts.every((p, i) => p === words[i])) {
      if (!best || e.parts.length > best.parts.length) best = e;
    }
  }
  if (best) return { entry: best, args: argv.slice(best.parts.length) };
  for (let n = words.length; n >= 1; n--) {
    const prefix = words.slice(0, n);
    const members = entries.filter((e) => e.parts.length > n && prefix.every((p, i) => p === e.parts[i]));
    if (members.length) return { group: prefix.join(' '), members };
  }
  return { unknown: words[0] ?? argv[0] };
}

/** Closest command names by edit distance, for "did you mean". */
export function suggest(entries, word, max = 3) {
  const dist = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  };
  return [...new Set(entries.map((e) => e.parts[0]))]
    .map((n) => [n, dist(word || '', n)])
    .filter(([, k]) => k <= 3)
    .sort((x, y) => x[1] - y[1])
    .slice(0, max)
    .map(([n]) => n);
}
