// Content hashing for hash-locks: single files, whole directory trees, and
// manifests in the standard `sha256sum` format ("<hex>  <path>\n", sorted),
// so every lock can also be checked by hand with `sha256sum -c`.
//
// A manifest's own sha256 is the "tree hash" recorded in provenance: one
// value that changes if any file is added, removed, renamed or edited.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** sha256 of a file's bytes (streams in 4 MB chunks so large MP4s stay cheap on memory). */
export function hashFile(file) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.allocUnsafe(4 << 20);
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  } finally {
    fs.closeSync(fd);
  }
  return h.digest('hex');
}

/**
 * Every regular file under `dir`, as POSIX paths relative to `base` (default:
 * dir itself), sorted. `.git` entries are skipped; symlinks are reported as
 * files of their own (we hash the link target's content).
 */
export function listFiles(dir, { base = dir, skip = (rel) => /(^|\/)\.git(\/|$)/.test(rel) } = {}) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const abs = path.join(d, e.name);
      const rel = path.relative(base, abs).split(path.sep).join('/');
      if (skip(rel)) continue;
      if (e.isDirectory()) walk(abs);
      else out.push(rel);
    }
  };
  walk(dir);
  return out.sort();
}

/** { relPath: sha256 } for the given relative paths under `base`. */
export function hashFiles(base, rels) {
  return Object.fromEntries(rels.map((r) => [r, hashFile(path.join(base, r))]));
}

/** Serialise { relPath: sha256 } as a sorted sha256sum manifest. */
export function formatManifest(map) {
  return Object.keys(map).sort().map((k) => `${map[k]}  ${k}\n`).join('');
}

/** Parse a sha256sum manifest into { relPath: sha256 }. Blank lines are ignored; anything else malformed throws. */
export function parseManifest(text) {
  const map = {};
  for (const [n, line] of text.split('\n').entries()) {
    if (!line.trim()) continue;
    const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
    if (!m) throw new Error(`manifest line ${n + 1} is not "<sha256>  <path>": ${line}`);
    map[m[2]] = m[1];
  }
  return map;
}

/**
 * Compare a recorded manifest with the current state of `base`.
 * `current` = { rel: sha256 } of what exists now (caller decides the file set).
 * → { ok, changed: [rel], missing: [rel], added: [rel] }
 */
export function diffManifest(recorded, current) {
  const changed = [], missing = [], added = [];
  for (const [rel, h] of Object.entries(recorded)) {
    if (!(rel in current)) missing.push(rel);
    else if (current[rel] !== h) changed.push(rel);
  }
  for (const rel of Object.keys(current)) if (!(rel in recorded)) added.push(rel);
  return { ok: !changed.length && !missing.length && !added.length, changed, missing, added };
}

/** Human-readable one-paragraph summary of a diffManifest() result. */
export function describeDiff({ changed, missing, added }, limit = 12) {
  const part = (label, xs) => (xs.length ? `${label} (${xs.length}): ${xs.slice(0, limit).join(', ')}${xs.length > limit ? ', …' : ''}` : null);
  return [part('changed', changed), part('missing', missing), part('added', added)].filter(Boolean).join('; ') || 'no differences';
}
