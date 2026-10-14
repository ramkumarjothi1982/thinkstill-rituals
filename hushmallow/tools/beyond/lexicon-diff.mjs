// The lexicon gate (final round 3, lexicon gaps, round 4): a change to the shared safety lexicon must be strictly additive.
// No sentence that the base reads as care or crisis may read lower on this tree, on either reading (plain: checkText; main
// screen: readSafety lossAware). False alarms are the lexicon's small cost; a lost disclosure is not.
//
//   node hushmallow/tools/beyond/lexicon-diff.mjs [--base REF] [--sentences FILE.json]... [--out FILE] [--keep]
//
// The corpus: every string literal and template chunk in hushmallow/tests/**/*.mjs on this tree and on a detached worktree
// of the base (default 931fbb0, made in the system temp directory and removed afterwards unless --keep), and every
// "double-quoted" sentence in the JSON reports given with --sentences (default: the two lexicon verifier reports, when they
// exist). Each string is read on both trees, plain and lossAware. Prints LOST (the base read care or crisis, this tree reads
// lower), GAINED (this tree reads higher) and SIDEWAYS (the same level, another category), lists every LOST one, and says
// whether every base rule is still there verbatim (STRUCTURE). Exit code 1 when anything is LOST. --out writes every
// changed reading as JSON.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const many = (k) => argv.flatMap((a, i) => (a === k && argv[i + 1] ? [argv[i + 1]] : []));
const one = (k, d) => many(k).at(-1) ?? d;

const HERE = dirname(fileURLToPath(import.meta.url));
const HEAD = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: HERE, encoding: 'utf8' }).trim();
const BASE_REF = one('--base', '931fbb0');
const DEFAULT_REPORTS = ['/tmp/claude-0/hf/verify-lex.json', '/tmp/claude-0/hf/verify-lex2.json'];
const REPORTS = many('--sentences').length ? many('--sentences') : DEFAULT_REPORTS.filter((f) => existsSync(f));
const RANK = { none: 0, concern: 1, care: 2, crisis: 3 };

// ------------------------------------------------------------------------------------- the strings --
const ESC = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' };
/** Cook one escape at src[i] === '\\'; returns [text, next index]. */
function escape(src, i) {
  const c = src[i + 1];
  if (c === undefined) return ['', i + 1];
  if (c === 'u' && src[i + 2] === '{') { const e = src.indexOf('}', i); return [String.fromCodePoint(parseInt(src.slice(i + 3, e), 16) || 0), e + 1]; }
  if (c === 'u') return [String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16) || 0), i + 6];
  if (c === 'x') return [String.fromCharCode(parseInt(src.slice(i + 2, i + 4), 16) || 0), i + 4];
  if (c === '\n') return ['', i + 2];
  return [ESC[c] ?? c, i + 2];
}

const KEYWORDS = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
/**
 * Every string literal and every literal chunk of a template (between its ${…}) in a JavaScript source, cooked. Comments and
 * regular-expression literals are skipped (a '/' starts one where an operand is expected).
 */
export function stringsIn(src) {
  const out = [];
  const holes = []; // brace depth at each open ${
  let depth = 0, i = 0, last = '';
  const template = () => { // from just inside a ` or just after the } of a ${…}
    let s = '';
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { const [t, j] = escape(src, i); s += t; i = j; continue; }
      if (c === '`') { i++; if (s) out.push(s); last = 'value'; return; }
      if (c === '$' && src[i + 1] === '{') { i += 2; if (s) out.push(s); holes.push(depth); last = ''; return; }
      s += c; i++;
    }
    if (s) out.push(s);
  };
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '"' || c === "'") {
      let s = ''; i++;
      while (i < src.length && src[i] !== c && src[i] !== '\n') {
        if (src[i] === '\\') { const [t, j] = escape(src, i); s += t; i = j; } else s += src[i++];
      }
      i++; out.push(s); last = 'value'; continue;
    }
    if (c === '`') { i++; template(); continue; }
    if (c === '/' && last !== 'value') { // a regular-expression literal
      let j = i + 1, cls = false;
      for (; j < src.length && src[j] !== '\n'; j++) {
        if (src[j] === '\\') { j++; continue; }
        if (src[j] === '[') cls = true;
        else if (src[j] === ']') cls = false;
        else if (src[j] === '/' && !cls) break;
      }
      if (src[j] === '/') { i = j + 1; while (/[a-z]/i.test(src[i] || '')) i++; last = 'value'; continue; }
    }
    if (c === '}' && holes.length && holes[holes.length - 1] === depth) { holes.pop(); i++; template(); continue; }
    if (/[\w$]/.test(c)) {
      let j = i; while (j < src.length && /[\w$]/.test(src[j])) j++;
      last = KEYWORDS.has(src.slice(i, j)) ? '' : 'value'; i = j; continue;
    }
    if (c === '{') depth++;
    if (c === '}') depth--;
    last = c === ')' || c === ']' || c === '}' ? 'value' : '';
    i++;
  }
  return out;
}

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? (f === 'node_modules' ? [] : walk(p)) : p.endsWith('.mjs') ? [p] : [];
});
/** Every "double-quoted" stretch in the string values of a JSON report. */
function sentencesIn(file) {
  const out = [];
  const visit = (v) => {
    if (typeof v === 'string') for (const m of v.matchAll(/"([^"]{3,})"/g)) out.push(m[1]);
    else if (v && typeof v === 'object') Object.values(v).forEach(visit);
  };
  visit(JSON.parse(readFileSync(file, 'utf8')));
  return out;
}

// ------------------------------------------------------------------------------------- the readings --
async function reader(root) {
  const { checkText } = await import(pathToFileURL(join(root, 'hushmallow/src/engine/safety.js')).href);
  const overlay = await import(pathToFileURL(join(root, 'hushmallow/src/hushfold/input-overlay.js')).href);
  await overlay.loadGrief();
  const m = { checkText };
  const lexicon = await import(pathToFileURL(join(root, 'hushmallow/src/data/safety-lexicon.js')).href);
  return { plain: (t) => overlay.readSafety(m, t, false), main: (t) => overlay.readSafety(m, t, true), lexicon };
}

/** Whether every base rule is still in the same list, verbatim and in order, and the idiom guards are the base's. */
function structure(base, head) {
  const lists = (L) => ({
    idiomGuards: L.HARM_LEXICON.idiomGuards, crisis: L.HARM_LEXICON.crisis, crisisOther: L.HARM_LEXICON.crisisOther,
    ...Object.fromEntries(Object.entries(L.HARM_LEXICON.care).map(([k, v]) => [`care.${k}`, v])),
    concern: L.CONCERN_LEXICON, harmOthers: L.HARM_OTHERS_LEXICON,
  });
  const b = lists(base), h = lists(head);
  const missing = [];
  for (const [name, rules] of Object.entries(b)) {
    const there = h[name] || [];
    let k = 0;
    for (const r of rules) {
      const at = there.indexOf(r, k);
      if (at < 0) missing.push(`${name}: ${r}`); else k = at + 1;
    }
  }
  const guardsSame = JSON.stringify(b.idiomGuards) === JSON.stringify(h.idiomGuards);
  const added = Object.entries(h).reduce((n, [name, rules]) => n + rules.filter((r) => !(b[name] || []).includes(r)).length, 0);
  return { missing, guardsSame, added, baseRules: Object.values(b).flat().length };
}

// ------------------------------------------------------------------------------------------- the run --
const baseDir = mkdtempSync(join(tmpdir(), 'lexicon-diff-'));
let exit = 0;
try {
  execFileSync('git', ['worktree', 'add', '--detach', baseDir, BASE_REF], { cwd: HEAD, stdio: 'pipe' });
  const files = { head: walk(join(HEAD, 'hushmallow/tests')), base: walk(join(baseDir, 'hushmallow/tests')) };
  const corpus = new Map(); // string → where it came from
  const add = (s, from) => { const t = s.trim(); if (t && /[a-z]/i.test(t) && !corpus.has(t)) corpus.set(t, from); };
  for (const [tree, list] of Object.entries(files)) {
    for (const f of list) for (const s of stringsIn(readFileSync(f, 'utf8'))) add(s, `${tree}:${f.slice((tree === 'head' ? HEAD : baseDir).length + 1)}`);
  }
  let reported = 0;
  for (const f of REPORTS) for (const s of sentencesIn(f)) { reported++; add(s, `report:${f}`); }

  const base = await reader(baseDir);
  const head = await reader(HEAD);
  const lost = [], lower = [], gained = [], sideways = [];
  for (const [t, from] of corpus) {
    for (const reading of ['plain', 'main']) {
      const b = base[reading](t), h = head[reading](t);
      const row = { reading, text: t, base: `${b.level}/${b.category}`, head: `${h.level}/${h.category}`, from };
      if (RANK[h.level] < RANK[b.level]) (RANK[b.level] >= RANK.care ? lost : lower).push(row);
      else if (RANK[h.level] > RANK[b.level]) gained.push(row);
      else if (b.category !== h.category) sideways.push(row);
    }
  }
  const st = structure(base.lexicon, head.lexicon);
  const strings = (rows) => new Set(rows.map((r) => r.text)).size;
  console.log(`base ${BASE_REF} (${files.base.length} test files) vs ${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: HEAD, encoding: 'utf8' }).trim()}+worktree (${files.head.length} test files)`);
  console.log(`corpus: ${corpus.size} unique strings (${reported} report sentences from ${REPORTS.length} report(s)), read plain and lossAware on both trees`);
  console.log(`STRUCTURE: ${st.baseRules - st.missing.length}/${st.baseRules} base rules kept verbatim and in order; idiom guards ${st.guardsSame ? 'identical' : 'CHANGED'}; ${st.added} rules added`);
  for (const m of st.missing) console.log(`  missing ${m}`);
  console.log(`LOST: ${lost.length} readings (${strings(lost)} strings)`);
  for (const r of lost) console.log(`  LOST ${r.reading}: ${JSON.stringify(r.text)} ${r.base} → ${r.head} (${r.from})`);
  console.log(`GAINED: ${gained.length} readings (${strings(gained)} strings)`);
  console.log(`LOWER below care: ${lower.length} readings (${strings(lower)} strings; concern on the base, none here)`);
  for (const r of lower) console.log(`  LOWER ${r.reading}: ${JSON.stringify(r.text)} ${r.base} → ${r.head}`);
  console.log(`SIDEWAYS: ${sideways.length} readings (${strings(sideways)} strings; the same level, another category)`);
  if (flag('--list')) {
    for (const r of gained) console.log(`  GAINED ${r.reading}: ${JSON.stringify(r.text)} ${r.base} → ${r.head}`);
    for (const r of sideways) console.log(`  SIDEWAYS ${r.reading}: ${JSON.stringify(r.text)} ${r.base} → ${r.head}`);
  }
  const out = one('--out');
  if (out) writeFileSync(resolve(out), JSON.stringify({ base: BASE_REF, corpus: corpus.size, structure: st, lost, lower, gained, sideways }, null, 1));
  exit = lost.length ? 1 : 0;
} finally {
  if (!flag('--keep')) {
    try { execFileSync('git', ['worktree', 'remove', '--force', baseDir], { cwd: HEAD, stdio: 'pipe' }); } catch {
      rmSync(baseDir, { recursive: true, force: true });
      try { execFileSync('git', ['worktree', 'prune'], { cwd: HEAD, stdio: 'pipe' }); } catch { /* nothing to prune */ }
    }
  } else console.log(`base worktree kept at ${baseDir}`);
}
process.exit(exit);
