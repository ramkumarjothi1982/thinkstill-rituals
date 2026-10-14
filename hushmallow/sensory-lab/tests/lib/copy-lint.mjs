// Copy lint for Phase 3 COPY tables (SHARED.md L23).
//
// hushmallow is a companion, not therapy: no treatment or health claims, no
// reading of a person's state, no streaks or scores. BANNED is the union of
// the three feature specs' lists, matched case-insensitively at word starts
// (so 'therap' also catches 'therapy' and 'therapeutic').
//
//   import { collectStrings, lintCopy } from './lib/copy-lint.mjs';
//   assert.deepEqual(lintCopy(collectStrings(COPY), { allow: [COPY.disclaimer] }), []);

export const BANNED_WORDS = ['therap', 'treat(?:ment|s|ing)?', 'cure', 'heal', 'diagnos', 'anxiety', 'insomnia', 'disorder', 'clinical', 'medical',
  'melatonin', 'blue light', 'sleep better', 'feel better', 'your (?:mood|feelings)', 'calm your', 'streak', 'score'];
export const BANNED = BANNED_WORDS.map((w) => new RegExp(`\\b${w}`, 'i'));

// string and template literals in a function's source (COPY entries like (n) => `${n} notes`)
const LITERALS = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
const fnStrings = (fn) => (String(fn).match(LITERALS) || []).map((q) => q.slice(1, -1).replace(/\$\{[^}]*\}/g, ' ').trim()).filter(Boolean);

/** Every string in a COPY table, walked deeply (objects, arrays, Maps, Sets, and string literals inside functions). */
export function collectStrings(obj, out = [], seen = new Set()) {
  if (typeof obj === 'string') { out.push(obj); return out; }
  if (typeof obj === 'function') { out.push(...fnStrings(obj)); return out; }
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return out;
  seen.add(obj);
  const vals = obj instanceof Map ? obj.values() : obj instanceof Set ? obj.values() : Array.isArray(obj) ? obj : Object.values(obj);
  for (const v of vals) collectStrings(v, out, seen);
  return out;
}

/**
 * Banned phrases in `strings` → [{ text, pattern }] (pattern = the regex source); empty when clean.
 * allow: exact strings or RegExps whose matching texts are skipped (e.g. a disclaimer).
 * extra: more RegExps to forbid (e.g. Weather's /\bmood\b/i).
 */
export function lintCopy(strings, { allow = [], extra = [] } = {}) {
  const hit = (re, t) => { re.lastIndex = 0; return re.test(t); };
  const allowed = (t) => allow.some((a) => (a instanceof RegExp ? hit(a, t) : a === t));
  const out = [];
  for (const text of strings) {
    if (typeof text !== 'string' || allowed(text)) continue;
    for (const re of [...BANNED, ...extra]) if (hit(re, text)) out.push({ text, pattern: re.source });
  }
  return out;
}
