#!/usr/bin/env node
// Build the customer app and the safety desk for production: dist/app and dist/staff
// hold exactly the files each loads (server/app-files.mjs follows their imports from
// app/index.html and staff/index.html), with a manifest of their hashes the production
// server checks at start-up.
//
// Where the backend is: --supabase-url and --anon-key (or HUSHMATES_SUPABASE_URL and
// HUSHMATES_SUPABASE_ANON_KEY) write app/config.json and let the pages' Content Security
// Policy connect to that Supabase project, and nowhere else. The anon (publishable) key is
// public by design; a secret key is refused.
//
// What ships has no comments (developers' notes stay in the source), and every
// stripped module is checked to still parse. Then it reads every file it wrote
// and refuses the build (deleting it) if anything meant only for developers or
// testers made it in: lab and control-room words, test identities, simulated
// services, testing labels, debug calls, local service addresses, or anything
// that looks like a key.
//
//   node tools/build-app.mjs [--out dist] [--supabase-url https://<ref>.supabase.co --anon-key <publishable key>]
//
// Building is local. Nothing is uploaded or deployed.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { appFiles, staffFiles, LAB_ROOT } from '../server/app-files.mjs';
import { stripJs, stripCss, stripHtml } from './strip-comments.mjs';

/** Never in a customer build: [pattern, why]. */
export const FORBIDDEN = [
  [/\blabs?\b/i, 'the lab'],
  [/\blab[A-Z_]|[a-z]Lab\b|\bLAB_/, 'the lab'],
  [/control[\s-]*room/i, 'the control room'],
  [/[Ss]cenarios?\s*[-\s]?[ABCabc]\b/, 'test scenarios'],
  [/\b[Pp]hones?\s*[-\s]?[ABab]\b(?!\s+(?:friend|call|number|line))/, 'the lab’s test phones'],
  [/simulat|\btesters?\b|\btest (?:account|key|user|phone|host|data)/i, 'testing'],
  [/type[\s-]*it[\s-]*for[\s-]*me/i, 'the lab’s typing shortcut'],
  [/test identit/i, 'test identities'],
  [/\b(?:Moon|Cloud|Star|Fern|Dream|Pebble|Ember)Mallow\b|\bSafetyTeam\b/, 'test identity names'],
  [/seedRelay|signInTestAccount|createTestAccount|RELAY_IDENTITIES|testMode/, 'test accounts'],
  [/canned|Example for testing|DEMO_VOICES|demoProvider/i, 'canned testing examples'],
  [/catch:result|unconfigured/, 'developer signals'],
  [/MaxOutputTokens|reportsToPause|cost guard|fairnessPool|fallbackGlobalPerDay|MALLOW_VOICES/, 'server tuning'],
  [/\b\d+\s?KB\b|\$\{[^}]*\/\s*1024\)/, 'technical file sizes'],
  [/LocalNetwork|__lab\b|fixture/i, 'the simulated service'],
  [/dev(?:elopment)?[\s-]*clock|devClock/i, 'the development clock'],
  [/\bdebugger\b|console\.(?:log|debug|trace)\s*\(/, 'debugging'],
  [/localhost|127\.0\.0\.1|:8790\b/, 'local service addresses'],
  [/sk-ant-|\bapi[_-]key\b|service[_-]?role|sb_secret_|SUPABASE_|ANTHROPIC_/i, 'credentials'],
  [/lorem ipsum|placeholder text|\bTODO\b|\bFIXME\b/i, 'placeholders'],
];
/** The server's own code, never sent to a browser. */
const SERVER_ONLY = ['/core/relay.js', '/core/relay-rules.js', '/core/relay-seed.js', '/core/perspectives.js', '/net/', '/lab/', '/tests/', '/tools/', '/docs/', '/server/', '/v1-messaging/'];

/** Signed tokens in the text whose role isn't the public 'anon' one (a service key, a person's token). */
function secretTokens(text) {
  const out = [];
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]*/g)) {
    let role = null;
    try { role = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')).role; } catch { /* not a token */ }
    if (role !== 'anon') out.push(m[0].slice(0, 24));
  }
  return out;
}

export function scan(files) {
  const found = [];
  for (const [url, file] of files) {
    if (SERVER_ONLY.some((p) => url.startsWith(p))) found.push({ url, why: 'server or developer file', match: url });
    if (!/\.(?:html|css|m?js|json|txt|svg)$/.test(url)) continue;
    const text = readFileSync(file, 'utf8');
    for (const t of secretTokens(text)) found.push({ url, why: 'a signed key or token that isn’t the public one', match: t });
    // words split across lines or joined from pieces ('Example for ' + 'testing') are read whole too
    const joined = text.replace(/(['"`])\s*\+\s*\1/g, '').replace(/\\[nrt]/g, ' ').replace(/\s+/g, ' ');
    for (const [re, why] of FORBIDDEN) {
      const m = re.exec(text) || re.exec(joined);
      if (m) found.push({ url, why, match: m[0], line: m.input === text ? text.slice(0, m.index).split('\n').length : undefined });
    }
  }
  return found;
}

/** Does this stripped module still parse? (node --check reads .mjs files as modules) */
function parses(code) {
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-check-'));
  try {
    writeFileSync(join(dir, 'm.mjs'), code);
    const r = spawnSync(process.execPath, ['--check', join(dir, 'm.mjs')], { encoding: 'utf8' });
    return r.status === 0 ? null : (r.stderr || 'does not parse').split('\n').slice(0, 4).join(' ');
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** Where the backend is, checked: an https Supabase origin (http only on this machine) and a public key. */
export function deployConfig({ supabaseUrl = '', anonKey = '' } = {}) {
  const file = join(LAB_ROOT, 'app', 'config.json');
  const source = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { supabaseUrl: '', supabaseAnonKey: '', functionsPath: '/functions/v1/hushmates' };
  if (!supabaseUrl && !anonKey) return { config: source, origin: null };
  const u = new URL(supabaseUrl);
  if (u.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(u.hostname)) throw new Error('the Supabase URL must be https');
  if (!anonKey || /^sb_secret_/.test(anonKey) || secretTokens(anonKey).length) throw new Error('give the public (anon or publishable) key, never a secret one');
  return { config: { ...source, supabaseUrl: u.origin, supabaseAnonKey: anonKey }, origin: u.origin };
}

/** Let the page talk to the Supabase project (and nothing else): connect-src gains its origin. */
const allowOrigin = (html, origin) => (origin ? html.replace(/connect-src 'self'/g, `connect-src 'self' ${origin}`) : html);

/**
 * Build one page into `out`: which = 'app' (the customer app) or 'staff' (the safety desk).
 * deploy = { supabaseUrl, anonKey } for staging or production; without it, the source config.
 */
export function build({ out, which = 'app', deploy = {} } = {}) {
  out ||= join(LAB_ROOT, 'dist', which);
  const files = which === 'staff' ? staffFiles() : appFiles();
  const { config, origin } = deployConfig(deploy);
  rmSync(out, { recursive: true, force: true });
  const manifest = { app: which === 'staff' ? 'hushmates-staff' : 'hushmates', format: 1, files: {} };
  const problems = [];
  for (const [url, file] of files) {
    const target = join(out, url);
    mkdirSync(dirname(target), { recursive: true });
    // developers' notes stay in the source: what ships has no comments
    if (/\.m?js$/.test(url)) {
      const code = stripJs(readFileSync(file, 'utf8'));
      const broken = parses(code);
      if (broken) problems.push({ url, why: 'stripping comments broke it', match: broken });
      writeFileSync(target, code);
    } else if (url.endsWith('.css')) writeFileSync(target, stripCss(readFileSync(file, 'utf8')));
    else if (url.endsWith('.html')) writeFileSync(target, allowOrigin(stripHtml(readFileSync(file, 'utf8')), origin));
    else if (url === '/app/config.json') writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`);
    else copyFileSync(file, target);
    const bytes = readFileSync(target);
    manifest.files[url] = { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
  }
  writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  // the scan reads what was written: exactly what a browser would get
  const written = new Map(Object.keys(manifest.files).map((url) => [url, join(out, url)]));
  problems.push(...scan(written));
  if (problems.length) rmSync(out, { recursive: true, force: true });
  return { ok: !problems.length, problems, out, count: written.size };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opt = (name, env) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : (process.env[env] || ''); };
  const dist = resolve(opt('out', 'HUSHMATES_DIST') || join(LAB_ROOT, 'dist'));
  const deploy = { supabaseUrl: opt('supabase-url', 'HUSHMATES_SUPABASE_URL'), anonKey: opt('anon-key', 'HUSHMATES_SUPABASE_ANON_KEY') };
  let failed = false;
  for (const which of ['app', 'staff']) {
    const res = build({ out: join(dist, which), which, deploy });
    if (!res.ok) {
      failed = true;
      console.error(`Build of ${which} refused: developer-only content would reach people.`);
      for (const p of res.problems) console.error(`  ${p.url}${p.line ? `:${p.line}` : ''}  ${p.why}  (${JSON.stringify(p.match)})`);
    } else console.log(`Built ${res.count} files into ${res.out} (scan clean).`);
  }
  if (failed) process.exit(1);
  console.log(deploy.supabaseUrl ? `Connected to ${deploy.supabaseUrl}. Nothing was deployed.` : 'Using app/config.json as it is (same origin). Nothing was deployed.');
}
