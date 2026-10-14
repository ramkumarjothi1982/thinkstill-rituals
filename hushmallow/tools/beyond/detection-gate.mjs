#!/usr/bin/env node
// The detection gate (final round 5). Five rounds of word lists never converged against a reviewer who reads the code, so this
// is a mechanical check instead: no sentence the base reads as care or crisis may read lower on this branch, no first-person
// sentence the base sends to the gentle path may drop to the question or the play question, and nothing on Another Angle's
// gentle path is ever sent.
//
//   node hushmallow/tools/beyond/detection-gate.mjs [--base=931fbb0] [--checks=a.json,b.json,…] [--json=out.json] [--quiet]
//
// The sentences: every string literal and every template chunk of hushmallow/tests/**/*.mjs on this branch AND on the base
// (a detached worktree of `--base`, made in the system's temp directory and removed after), plus every sentence quoted ("…") in
// the check files (`--checks`, the three independent checks by default). Each is read on both trees by
//   main    input-overlay.js readSafety (the main screen's reading, grief.js loaded): crisis | care | held (the gentle path,
//           supportFirst) | support (the lexicon's concern) | gentle | ask (unsure: the check-in question) | play (the question)
//   angle   tests/probes/r10-replay.mjs visit() with sharing on and a request-counting stub (STUBS.pull, an ordinary scene that
//           never reads as a loss; "Another angle" answered): crisis | care | held | gentle | ask | play
// and the counts printed:
//   LOST_CARE         the base reads it care or crisis on a screen, the branch reads it lower there
//   LOST_SELF_GENTLE  a first-person sentence the base sends to the gentle path on a screen, the branch asks or plays it there
//   GENTLE_SENT       a request made on the branch's gentle path (every server stub; "Another angle", the check-in's "Yes" and a
//                     remembered "Yes"), or after "Another angle" for unsure words with the safety net's words (grief.js keepLocal)
//   GAINED            read higher on the branch than on the base (information only)
// The first three must be 0: the exit code is 1 otherwise.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '../..');            // hushmallow/
const REPO = resolve(APP, '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const BASE = opt('base', '931fbb0');
const CHECKS = opt('checks', ['check-final.json', 'check-r3.json', 'check-r4.json'].map((f) => join('/tmp/claude-0/hf', f)).join(',')).split(',').filter(Boolean);
const JSON_OUT = opt('json', '');
const QUIET = argv.includes('--quiet');

// ------------------------------------------------------------------------------------------------ the sentences --
/** Every string literal and template chunk in JavaScript source, cooked (escapes read); comments and regex literals skipped. */
const REGEX_AFTER = new Set([...'(,=:[!&|?{};+-*%<>~^}']);
const REGEX_KW = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await', 'instanceof']);
function cook(raw) {
  return raw.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r?\n|.)/gu, (m, e) => {
    if (e[0] === 'u' && e[1] === '{') return String.fromCodePoint(parseInt(e.slice(2, -1), 16));
    if (e[0] === 'u' && e.length === 5) return String.fromCharCode(parseInt(e.slice(1), 16));
    if (e[0] === 'x' && e.length === 3) return String.fromCharCode(parseInt(e.slice(1), 16));
    return ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' })[e] ?? (/^\r?\n$/.test(e) ? '' : e);
  });
}
export function literals(src) {
  const out = [];
  const n = src.length;
  let i = 0, prev = '';
  const regexOk = () => !prev || REGEX_AFTER.has(prev) || REGEX_KW.has(prev) || prev === '=>';
  function quoted(q) {
    let raw = ''; i++;
    while (i < n && src[i] !== q && src[i] !== '\n') { if (src[i] === '\\') { raw += src[i] + (src[i + 1] ?? ''); i += 2; continue; } raw += src[i++]; }
    i++;
    out.push(cook(raw));
  }
  function template() {
    let raw = ''; i++;
    while (i < n && src[i] !== '`') {
      const c = src[i];
      if (c === '\\') { raw += c + (src[i + 1] ?? ''); i += 2; continue; }
      if (c === '$' && src[i + 1] === '{') { out.push(cook(raw)); raw = ''; i += 2; scan(true); i++; continue; }
      raw += c; i++;
    }
    i++;
    out.push(cook(raw));
  }
  function scan(inExpr) {
    let depth = 0;
    while (i < n) {
      const c = src[i], d = src[i + 1];
      if (c === '\n' || c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
      if (c === "'" || c === '"') { quoted(c); prev = 'str'; continue; }
      if (c === '`') { template(); prev = 'str'; continue; }
      if (c === '/' && regexOk()) {
        let cls = false; i++;
        while (i < n && src[i] !== '\n') { const e = src[i]; if (e === '\\') { i += 2; continue; } if (e === '[') cls = true; else if (e === ']') cls = false; else if (e === '/' && !cls) break; i++; }
        i++;
        while (i < n && /[a-z]/i.test(src[i])) i++;
        prev = 'regex'; continue;
      }
      if (/[\w$]/.test(c)) { const s = i; while (i < n && /[\w$]/.test(src[i])) i++; prev = src.slice(s, i); continue; }
      if (inExpr) { if (c === '{') depth++; else if (c === '}') { if (depth === 0) return; depth--; } }
      if (c === '=' && d === '>') { prev = '=>'; i += 2; continue; }
      prev = c; i++;
    }
  }
  scan(false);
  return out;
}
export function testFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') out.push(...testFiles(p)); } else if (e.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}
/** Every sentence quoted in a check file ("…" or “…” inside its strings). */
export function quotedIn(json) {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') { for (const m of v.matchAll(/"([^"\n]{1,600})"|“([^”\n]{1,600})”/gu)) out.push(m[1] ?? m[2]); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(json);
  return out;
}
export const keep = (s) => typeof s === 'string' && s.length <= 600 && /\p{L}/u.test(s) && s.trim().length > 0;

// ----------------------------------------------------------------------------------------------- the two readings --
const FIRST = /(?<![\p{L}\p{N}])(?:i|i['’]?m|i['’]?ve|i['’]?d|i['’]?ll|ive|ill|id|me|my|myself|mine|im)(?![\p{L}\p{N}])/iu;
const MAIN_RANK = { play: 0, ask: 1, gentle: 2, support: 3, held: 4, care: 5, crisis: 6 };
const ANGLE_RANK = { play: 0, ask: 1, gentle: 2, held: 4, care: 5, crisis: 6 };
export async function tree(root) {
  const u = (p) => pathToFileURL(join(root, 'hushmallow', p)).href;
  const [io, safety, replay, backstop, grief] = await Promise.all([u('src/hushfold/input-overlay.js'), u('src/engine/safety.js'), u('tests/probes/r10-replay.mjs'), u('src/beyond/backstop.js'), u('src/beyond/grief.js')].map((x) => import(x)));
  await io.loadGrief();
  return { root, io, safety, replay, backstop, grief };
}
export function readMain(T, t) {
  const r = T.io.readSafety({ checkText: T.safety.checkText }, t, true);
  if (r.level === 'crisis') return 'crisis';
  if (r.level === 'care') return 'care';
  if (r.level === 'concern') return r.supportFirst ? 'held' : r.category === 'loss' ? 'gentle' : 'support';
  return r.unsure ? 'ask' : 'play';
}
export function readAngle(T, t) {
  let n = 0;
  const stub = (x, o) => { n++; return T.replay.STUBS.pull(x, o); };
  // (the label is settled before any answer: the question left unanswered ends the replay there, nothing played)
  const R = T.replay.visit(t, { server: stub, walk: 1, answer: null });
  if (R.requests !== n) throw new Error(`request count ${R.requests} ≠ ${n}: ${t}`);
  const route = R.route === 'follow' ? 'care' : R.route;
  if (route === 'crisis' || route === 'care') return { label: route, R };
  if (route === 'gentle' && !R.asked) return { label: R.held ? 'held' : 'gentle', R };
  if (R.asked) return { label: T.backstop.lossRoute(t) === 'ask' ? 'ask' : 'play', R };
  return { label: route === 'gentle' ? 'gentle' : 'play', R };
}
/**
 * Requests on the gentle path, and after "Another angle" for unsure words in the net (grief.js keepLocal). Each way there is
 * replayed first with a tripwire stub (it counts, and answers as STUBS.pull): a stub is consulted only when a request is made, so
 * 0 requests with the tripwire is 0 with every stub. When the tripwire fires, every stub is replayed and each send reported.
 * Ways: lossRoute 'gentle' (no question); for unsure words "Another angle", the check-in's "Yes" (the question switched off) and
 * a "Yes" remembered for these words.
 */
export function gentleSent(T, t, keepLocal) {
  const route = T.backstop.lossRoute(t);
  const unsureLocal = route === 'ask' && keepLocal(t);
  const ways = route === 'ask' ? [{ answer: 'else' }, { answer: 'yes', asks: false }, { said: 'yes' }] : [{ answer: 'else' }];
  const run = (s, w) => {
    let n = 0;
    const stub = (x, o) => { n++; return s(x, o); };
    const R = T.replay.visit(t, { server: stub, walk: 2, ...w });
    // the gentle path: reached with no angle asked for (lossRoute 'gentle', the check-in's "Yes", a remembered "Yes")
    const viaGentle = R.route === 'gentle' && (!R.asked || w.asks === false || !!w.said);
    return viaGentle && n > 0 ? { requests: n, why: 'gentle' } : unsureLocal && n > 0 ? { requests: n, why: 'unsure-local' } : null;
  };
  const out = [];
  for (const w of ways) {
    if (!run(T.replay.STUBS.pull, w)) continue;
    for (const name of Object.keys(T.replay.STUBS)) {
      const s = T.replay.STUBS[name];
      if (typeof s !== 'function') continue;
      let r;
      try { r = run(s, w); } catch (e) { r = { error: String(e) }; }
      if (r) out.push({ stub: name, way: w, ...r });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------- the run --
const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
async function main() {
const baseDir = mkdtempSync(join(tmpdir(), 'detection-gate-'));
const baseTree = join(baseDir, 'base');
let code = 0;
// (stopped early: the base worktree is still removed)
const cleanup = () => {
  try { git('worktree', 'remove', '--force', baseTree); } catch { /* not made yet, or gone */ }
  try { git('worktree', 'prune'); } catch { /* ignore */ }
  rmSync(baseDir, { recursive: true, force: true });
};
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.once(sig, () => { cleanup(); process.exit(130); });
try {
  const baseSha = git('rev-parse', '--short', `${BASE}^{commit}`);
  git('worktree', 'add', '--detach', baseTree, baseSha);
  const headSha = git('rev-parse', '--short', 'HEAD');
  const dirty = git('status', '--porcelain', '--', 'hushmallow').length > 0;
  // the sentences
  const all = new Set();
  const from = { tests: 0, checks: 0 };
  for (const root of [REPO, baseTree]) {
    for (const f of testFiles(join(root, 'hushmallow', 'tests'))) for (const s of literals(readFileSync(f, 'utf8'))) if (keep(s) && !all.has(s)) { all.add(s); from.tests++; }
  }
  const missing = [];
  for (const f of CHECKS) {
    if (!existsSync(f)) { missing.push(f); continue; }
    for (const s of quotedIn(JSON.parse(readFileSync(f, 'utf8')))) if (keep(s) && !all.has(s)) { all.add(s); from.checks++; }
  }
  const sentences = [...all];
  const B = await tree(baseTree), H = await tree(REPO);
  const keepLocal = H.grief.keepLocal || (() => false);
  const lost = [], lostSelf = [], sent = [], gained = [];
  let n = 0;
  const t0 = Date.now();
  for (const t of sentences) {
    const bm = readMain(B, t), hm = readMain(H, t);
    const ba = readAngle(B, t).label, ha = readAngle(H, t).label;
    const first = FIRST.test(t);
    for (const [scr, b, h, rank] of [['main', bm, hm, MAIN_RANK], ['angle', ba, ha, ANGLE_RANK]]) {
      if ((b === 'care' || b === 'crisis') && rank[h] < rank[b]) lost.push({ t, screen: scr, base: b, branch: h });
      if (first && b === 'gentle' && (h === 'ask' || h === 'play')) lostSelf.push({ t, screen: scr, base: b, branch: h });
      if (rank[h] > rank[b]) gained.push({ t, screen: scr, base: b, branch: h });
    }
    if (hm === 'gentle' || hm === 'held' || ha === 'gentle' || ha === 'held' || H.backstop.lossRoute(t) === 'ask') {
      const g = gentleSent(H, t, keepLocal);
      if (g.length) sent.push({ t, main: hm, angle: ha, sends: g });
    }
    if (!QUIET && ++n % 2000 === 0) process.stderr.write(`  ${n}/${sentences.length} (${Math.round((Date.now() - t0) / 1000)} s)\n`);
  }
  // the module itself, not only its replay: griefMode (the gentle path) has no client call in another-angle.js on the branch
  const aa = readFileSync(join(APP, 'src/beyond/another-angle.js'), 'utf8');
  const gm = aa.slice(aa.indexOf('async function griefMode('), aa.indexOf('const heavySeen = '));
  const calls = (gm.match(/\bclient\s*(?:\.|\?\.)/g) || []).length;
  if (!gm || calls) sent.push({ t: '(another-angle.js griefMode source)', main: '-', angle: '-', sends: [{ stub: 'source', way: {}, requests: calls || 'not found' }] });
  const counts = { LOST_CARE: lost.length, LOST_SELF_GENTLE: lostSelf.length, GENTLE_SENT: sent.length, GAINED: gained.length };
  console.log(`detection gate: branch ${headSha}${dirty ? ' (+ working tree)' : ''} against base ${baseSha}`);
  console.log(`  another-angle.js griefMode: ${calls} client calls`);
  console.log(`  ${sentences.length} sentences (${from.tests} from tests on both trees, ${from.checks} more from ${CHECKS.length - missing.length} check files)${missing.length ? `; missing: ${missing.join(', ')}` : ''}`);
  const show = (name, rows, f) => { console.log(`${name} ${rows.length}`); for (const r of rows.slice(0, QUIET ? 0 : 400)) console.log(`  ${f(r)}`); };
  show('LOST_CARE', lost, (r) => `[${r.screen}] ${r.base} → ${r.branch}: ${JSON.stringify(r.t)}`);
  show('LOST_SELF_GENTLE', lostSelf, (r) => `[${r.screen}] ${r.base} → ${r.branch}: ${JSON.stringify(r.t)}`);
  show('GENTLE_SENT', sent, (r) => `${JSON.stringify(r.t)} (main ${r.main}, angle ${r.angle}): ${r.sends.map((s) => `${s.stub}/${JSON.stringify(s.way)}×${s.requests ?? s.error}`).slice(0, 4).join(', ')}`);
  const byKind = {};
  for (const g of gained) { const k = `[${g.screen}] ${g.base} → ${g.branch}`; byKind[k] = (byKind[k] || 0) + 1; }
  console.log(`GAINED ${gained.length}${Object.keys(byKind).length ? ` (${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join('; ')})` : ''}`);
  console.log(JSON.stringify(counts));
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ base: baseSha, head: headSha, dirty, sentences: sentences.length, counts, lost, lostSelf, sent, gained }, null, 1));
  if (lost.length || lostSelf.length || sent.length) code = 1;
} finally {
  cleanup();
}
return code;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exit(await main());
