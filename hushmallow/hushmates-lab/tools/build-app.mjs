#!/usr/bin/env node
// Build the customer app for production: dist/app holds exactly the files the
// app loads (server/app-files.mjs follows its imports from app/index.html),
// with a manifest of their hashes the production server checks at start-up.
//
// What ships has no comments (developers' notes stay in the source), and every
// stripped module is checked to still parse. Then it reads every file it wrote
// and refuses the build (deleting it) if anything meant only for developers or
// testers made it in: lab and control-room words, test identities, simulated
// services, testing labels, debug calls, local service addresses, or anything
// that looks like a key.
//
//   node tools/build-app.mjs [--out dist/app]
//
// Building is local. Nothing is uploaded or deployed.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { appFiles, LAB_ROOT } from '../server/app-files.mjs';
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
  [/sk-ant-|api[_-]?key|service[_-]?role|SUPABASE_|ANTHROPIC_/i, 'credentials'],
  [/lorem ipsum|placeholder text|\bTODO\b|\bFIXME\b/i, 'placeholders'],
];
/** The server's own code, never sent to a browser. */
const SERVER_ONLY = ['/core/relay.js', '/core/relay-rules.js', '/core/relay-seed.js', '/core/perspectives.js', '/net/', '/lab/', '/tests/', '/tools/', '/docs/', '/server/', '/v1-messaging/'];

export function scan(files) {
  const found = [];
  for (const [url, file] of files) {
    if (SERVER_ONLY.some((p) => url.startsWith(p))) found.push({ url, why: 'server or developer file', match: url });
    if (!/\.(?:html|css|m?js|json|txt|svg)$/.test(url)) continue;
    const text = readFileSync(file, 'utf8');
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

export function build({ out = join(LAB_ROOT, 'dist', 'app') } = {}) {
  const files = appFiles();
  rmSync(out, { recursive: true, force: true });
  const manifest = { app: 'hushmates', format: 1, files: {} };
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
    else if (url.endsWith('.html')) writeFileSync(target, stripHtml(readFileSync(file, 'utf8')));
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
  const i = process.argv.indexOf('--out');
  const res = build(i > 0 ? { out: resolve(process.argv[i + 1]) } : {});
  if (!res.ok) {
    console.error('Build refused: developer-only content would reach customers.');
    for (const p of res.problems) console.error(`  ${p.url}${p.line ? `:${p.line}` : ''}  ${p.why}  (${JSON.stringify(p.match)})`);
    process.exit(1);
  }
  console.log(`Built ${res.count} files into ${res.out} (scan clean). Nothing was deployed.`);
}
