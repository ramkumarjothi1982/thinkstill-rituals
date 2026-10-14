// Static scan of source files for forbidden APIs (SHARED.md L23).
//
// Phase 3 makes no network calls and uses no media, push or worker APIs.
// Pure comment lines (starting with //, /* or *) are skipped, so a note like
// "no setInterval here" is not a hit; code on the same line as a comment is
// still scanned. The SVG / XHTML namespace URIs (www.w3.org) are not network.
//
//   import { scanFiles, NETWORK, filesUnder } from './lib/static-scan.mjs';
//   const hits = scanFiles(files, { forbid: [...NETWORK, /\bsetInterval\b/, /navigator\.wakeLock/],
//                                   allow: { 'navigator\\.wakeLock': ['core/screen-wake.js'] } });

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const NETWORK = [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bWebSocket\b/, /\bEventSource\b/, /\bsendBeacon\b/, /\bgetUserMedia\b/,
  /\bserviceWorker\b/, /\bNotification\b/, /<audio\b/i, /\bnew\s+Audio\s*\(/, /https?:\/\/(?!www\.w3\.org\/)/];

const COMMENT = /^\s*(?:\/\/|\/\*|\*)/;
const label = (p) => (p instanceof RegExp ? p.source : String(p));
const test = (p, line) => (p instanceof RegExp ? ((p.lastIndex = 0), p.test(line)) : line.includes(p));
const norm = (f) => f.replace(/\\/g, '/');

/**
 * Hits of `forbid` patterns (RegExps, or strings matched literally) → [{ file, line, pattern }].
 * allow: { [pattern label (regex source or the literal)]: path suffix | [suffixes] } files where that pattern is fine.
 */
export function scanFiles(paths, { forbid = NETWORK, allow = {} } = {}) {
  const out = [];
  for (const file of paths) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (const p of forbid) {
      const key = [label(p), String(p)].find((k) => Object.hasOwn(allow, k));
      const ok = key === undefined ? [] : [allow[key]].flat();
      if (ok.some((suffix) => norm(file).endsWith(norm(suffix)))) continue;
      lines.forEach((text, i) => { if (!COMMENT.test(text) && test(p, text)) out.push({ file, line: i + 1, pattern: label(p) }); });
    }
  }
  return out;
}

/** Every file under `dir` (recursively) with one of the extensions. */
export function filesUnder(dir, { ext = ['.js', '.mjs'] } = {}) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...filesUnder(p, { ext }));
    else if (ext.some((e) => name.endsWith(e))) out.push(p);
  }
  return out.sort();
}
