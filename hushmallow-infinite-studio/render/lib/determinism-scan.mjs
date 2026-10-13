// Static guard for deterministic code: engine/ and composer/ must never read
// wall-clock time or unseeded randomness (Math.random, Date.now,
// performance.now). Frames are pure functions of t on a virtual clock and
// every random choice comes from a seeded stream.
//
// Rules:
//   - any *read* or *call* of the three APIs is a finding;
//   - comments are ignored (so docs may name the rule), strings are NOT
//     (a string can be eval'd, and false alarms are cheap to fix);
//   - assigning to them is allowed: that is how the virtual clock installs
//     itself (`Math.random = mulberry32(seed)`);
//   - a line may opt out with `hm-allow-wallclock: <reason>` (a reason is
//     required), e.g. the clock keeping a reference to the real timer for
//     profiling. Every opt-out is reported so reviews can see them.

import fs from 'node:fs';
import path from 'node:path';

export const DETERMINISTIC_DIRS = Object.freeze(['engine', 'composer']);
const EXTS = /\.(m?js|cjs|html?)$/;
const BANNED = [
  ['Math.random', /\bMath\s*\.\s*random\b/g],
  ['Date.now', /\bDate\s*\.\s*now\b/g],
  ['performance.now', /\bperformance\s*\.\s*now\b/g],
];
const PRAGMA = /hm-allow-wallclock:\s*(\S.{2,})/;

/**
 * Blank out // and /* *\/ comments (newlines kept, so line numbers survive),
 * skipping over string and template literals so "//" inside a string is not
 * mistaken for a comment. Regex literals are not parsed (good enough for
 * engine code; a false positive only means a reviewer looks once).
 */
export function stripComments(src) {
  let out = '', i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < n && src[i] !== '\n') { out += ' '; i++; }
    } else if (c === '/' && d === '*') {
      out += '  '; i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      if (i < n) { out += '  '; i += 2; }
    } else if (c === '"' || c === "'" || c === '`') {
      out += c; i++;
      while (i < n && src[i] !== c) {
        if (src[i] === '\\') { out += src[i] + (src[i + 1] ?? ''); i += 2; continue; }
        if (c !== '`' && src[i] === '\n') break;              // unterminated: stop at end of line
        out += src[i]; i++;
      }
      if (i < n) { out += src[i]; i++; }
    } else { out += c; i++; }
  }
  return out;
}

/** Findings in one source text. → { findings: [{ api, line, text }], allowed: [{ api, line, reason }] } */
export function scanSource(src) {
  const code = stripComments(src);
  const lines = src.split('\n');
  const findings = [], allowed = [];
  for (const [api, re] of BANNED) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(code))) {
      const after = code.slice(m.index + m[0].length, m.index + m[0].length + 4);
      if (/^\s*=(?!=)/.test(after)) continue;                   // assignment target: installing a virtual hook
      const line = code.slice(0, m.index).split('\n').length;
      const text = lines[line - 1] ?? '';
      const p = PRAGMA.exec(text);
      if (p) allowed.push({ api, line, reason: p[1].trim() });
      else findings.push({ api, line, text: text.trim() });
    }
  }
  const byLine = (a, b) => a.line - b.line;
  return { findings: findings.sort(byLine), allowed: allowed.sort(byLine) };
}

/** Scan every JS/HTML file under root/<dir> for each dir that exists. */
export function scanDirs(root, dirs = DETERMINISTIC_DIRS) {
  const report = { scanned: [], missing: [], findings: [], allowed: [] };
  const walk = (abs) => {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const p = path.join(abs, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
      if (!EXTS.test(e.name)) continue;
      const rel = path.relative(root, p).split(path.sep).join('/');
      report.scanned.push(rel);
      const r = scanSource(fs.readFileSync(p, 'utf8'));
      for (const f of r.findings) report.findings.push({ file: rel, ...f });
      for (const a of r.allowed) report.allowed.push({ file: rel, ...a });
    }
  };
  for (const d of dirs) {
    const abs = path.join(root, d);
    if (fs.existsSync(abs)) walk(abs); else report.missing.push(d);
  }
  return report;
}
