// Finds secrets that must never be committed or published: Stripe secret and
// restricted keys (sk_/rk_, live or test) and webhook signing secrets
// (whsec_), Supabase secret keys (sb_secret_), service_role JWTs and access
// tokens (sbp_), Anthropic keys (sk-ant-) and private keys (PEM).
//   node hushmallow/tools/secret-scan.mjs           every tracked file (git ls-files)
//   node hushmallow/tools/secret-scan.mjs --staged  the lines a commit adds
//
// One list of patterns for three guards: tests/no-secrets.test.mjs (every
// tracked file), tools/site/check.mjs (every file of the built site, with no
// allow-list) and the pre-commit hook (tools/hooks/pre-commit at the repository
// root; turn it on with git config core.hooksPath tools/hooks). Publishable
// keys (pk_, sb_publishable_) and the anon JWT are public and are not flagged.
// A test fixture is built at run time (`rk_live_${'a'.repeat(24)}`), so it
// never matches; a fake that cannot be (a workflow line) goes in ALLOW, as
// its exact line. Prints where a secret is and its kind, never the secret.
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** kind, and a pattern whose `head` group is the public prefix shown in a report. */
export const SECRET_PATTERNS = [
  // not after a letter, so mask_test_ or disk_live_ is never a key
  { kind: 'a Stripe secret or restricted key', re: /(?<![A-Za-z])(?<head>[sr]k_(?:live|test)_)[A-Za-z0-9]{10,}/g },
  { kind: 'a Stripe webhook signing secret', re: /(?<head>whsec_)[A-Za-z0-9+/=]{16,}/g },
  { kind: 'a Supabase secret key', re: /(?<head>sb_secret_)[A-Za-z0-9_-]{8,}/g },
  { kind: 'a Supabase access token', re: /(?<head>sbp_)[a-f0-9]{40}/g },
  { kind: 'an Anthropic API key', re: /(?<head>sk-ant-)[A-Za-z0-9_-]{10,}/g },
  { kind: 'a private key', re: /(?<head>-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----)/g },
  // only a service_role JWT: the anon one is a public key
  { kind: 'a Supabase service_role JWT', re: /(?<head>eyJ)[A-Za-z0-9_-]+\.(?<payload>eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]*/g, keep: (m) => /"role"\s*:\s*"service_role"/.test(Buffer.from(m.groups.payload, 'base64url').toString('utf8')) },
];

/**
 * The deliberate fakes that cannot be built at run time, each by its exact line
 * (sha256 of the line, so this file holds no secret-shaped string either). An
 * edited line, or the same value anywhere else, is reported again.
 */
export const ALLOW = [
  { file: '.github/workflows/another-angle-real.yml', sha256: '3c830680e6bb64e9395f692ef5b814af9a5343305f756e7305c95f91a837d466', why: 'the invalid Anthropic key of the second harness: Anthropic refuses it (401), so the fallback path runs at no cost' },
  { file: 'hushmallow/tests/security-headers-monitor.test.mjs', sha256: 'ea268d13af428b102ddc90a90af2fec13faa0b703bd72bd94080a40c7d59c151', why: 'a published sign-in config holding a fake sb_secret_, which the monitor must call a SECRET' },
];

export const lineHash = (line) => createHash('sha256').update(line).digest('hex');
/** True when ALLOW names this exact line of this file (a path from the repository root). */
export const isAllowed = (file, line) => ALLOW.some((a) => a.file === file && a.sha256 === lineHash(line));

/** [{ kind, head }] for every secret on one line. */
export function secretsInLine(line) {
  const out = [];
  for (const p of SECRET_PATTERNS) for (const m of line.matchAll(p.re)) if (!p.keep || p.keep(m)) out.push({ kind: p.kind, head: m.groups.head });
  return out;
}

/** [{ line, kind, head }] for every secret in a text (lines from 1); with file, the lines ALLOW names are skipped. */
export function findSecrets(text, file = null) {
  if (!SECRET_PATTERNS.some((p) => text.search(p.re) >= 0)) return [];   // most files: one pass per pattern, no split
  const out = [];
  text.split('\n').forEach((l, i) => {
    const hits = secretsInLine(l);
    if (hits.length && !(file && isAllowed(file, l))) for (const h of hits) out.push({ line: i + 1, ...h });
  });
  return out;
}

/** [{ file, line, kind, head }] in these files (paths from root); binaries, symlinks and missing files are skipped. */
export function scanFiles(root, files, { allow = true } = {}) {
  const out = [];
  for (const f of files) {
    const p = join(root, f);
    try { if (!lstatSync(p).isFile()) continue; } catch { continue; }
    const buf = readFileSync(p);
    if (buf.subarray(0, 8000).includes(0)) continue;   // binary, as git decides it
    for (const s of findSecrets(buf.toString('utf8'), allow ? f : null)) out.push({ file: f, ...s });
  }
  return out;
}

/** Every tracked file, as paths from root (the repository root). */
export const trackedFiles = (root) => execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 << 20 }).split('\0').filter(Boolean);
export const scanTree = (root) => scanFiles(root, trackedFiles(root));

/** A path in a diff header (b/<path>, quoted when git must), or null for /dev/null. */
function diffPath(s) {
  s = s.replace(/\t$/, '');   // git ends the header with a tab when the name has a space
  if (s === '/dev/null') return null;
  if (s.startsWith('"')) {
    const bytes = [];
    const esc = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13 };
    for (let i = 1; i < s.length - 1; i++) {
      if (s[i] !== '\\') { bytes.push(...Buffer.from(s[i])); continue; }
      const o = /^[0-7]{3}/.exec(s.slice(i + 1));
      if (o) { bytes.push(parseInt(o[0], 8)); i += 3; } else { i++; bytes.push(esc[s[i]] ?? s.charCodeAt(i)); }
    }
    s = Buffer.from(bytes).toString('utf8');
  }
  return s.replace(/^b\//, '');
}

/** [{ file, line, text }]: the lines a unified diff adds (counted from each hunk header, so an added "++ x" is a line, not a header). */
export function addedLines(diff) {
  const out = [];
  let file = null, n = 0, oldLeft = 0, newLeft = 0;
  for (const l of diff.split('\n')) {
    if (oldLeft > 0 || newLeft > 0) {
      if (l.startsWith('+')) { out.push({ file, line: n++, text: l.slice(1) }); newLeft--; }
      else if (l.startsWith('-')) oldLeft--;
      else if (l.startsWith(' ')) { n++; oldLeft--; newLeft--; }
      continue;   // "\ No newline at end of file" counts for neither side
    }
    const h = /^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(l);
    if (h) { oldLeft = h[1] === undefined ? 1 : +h[1]; n = +h[2]; newLeft = h[3] === undefined ? 1 : +h[3]; }
    else if (l.startsWith('+++ ')) file = diffPath(l.slice(4));
  }
  return out;
}

/** [{ file, line, kind, head }] among the lines a diff adds, ALLOW applied. */
export const scanDiff = (diff) => addedLines(diff).flatMap((a) => (a.file && !isAllowed(a.file, a.text) ? secretsInLine(a.text).map((s) => ({ file: a.file, line: a.line, ...s })) : []));

/**
 * The staged changes of the repository at cwd, with fixed prefixes and no user diff settings, so the parse never depends on config.
 * --text: a path .gitattributes (or a diff driver) calls binary or -diff still shows its lines, not "Binary files differ".
 */
export const stagedDiff = (cwd = process.cwd()) => execFileSync('git', ['-c', 'core.quotePath=false', 'diff', '--cached', '--text', '--no-color', '--no-ext-diff', '--no-textconv', '--src-prefix=a/', '--dst-prefix=b/', '-U0', '--diff-filter=ACMRT'], { cwd, encoding: 'utf8', maxBuffer: 256 << 20 });

/** One report line: where, and what kind (the prefix only, never the value). */
export const describe = (f) => `${f.file}:${f.line}: ${f.kind} (${f.head.startsWith('-----') ? f.head : `${f.head}…`})`;

// run by any path: Node gives import.meta.url as the real path, so a linked checkout (macOS /tmp, a ~/code link) compares real paths
let main = false;
try { main = !!process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { /* not a file: imported */ }
if (main) {
  const staged = process.argv.includes('--staged');
  let found;
  try {
    found = staged ? scanDiff(stagedDiff()) : scanTree(execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim());
  } catch (e) { console.error(`secret scan: ${e.message}`); process.exit(2); }
  if (found.length) {
    console.error(`secret scan: ${found.length} secret${found.length === 1 ? '' : 's'} in ${staged ? 'the staged changes (commit refused)' : 'tracked files'}:`);
    for (const f of found) console.error(`  ${describe(f)}`);
    if (staged) console.error('Take the value out of the file and git add it again.');
    console.error('A secret belongs in a Worker secret or a gitignored .dev.vars, never in git. If it was ever pushed or shared, roll it in that provider\'s dashboard.');
    console.error('A deliberate fake: build it at run time in a test, or add its exact line to ALLOW in hushmallow/tools/secret-scan.mjs.');
    process.exit(1);
  }
  if (!staged) console.log('secret scan: no secrets in tracked files');   // the hook stays quiet on a clean commit
}
