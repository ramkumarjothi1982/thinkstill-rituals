#!/usr/bin/env node
// Build the customer app for production: dist/app holds exactly the files the
// app loads (server/app-files.mjs follows its imports from app/index.html),
// with a manifest of their hashes the production server checks at start-up.
//
// Then it reads every file it wrote and refuses the build if anything meant
// only for developers or testers made it in: lab and control-room words,
// test identities, simulated services, testing labels, debug calls, local
// service addresses, or anything that looks like a key.
//
//   node tools/build-app.mjs [--out dist/app]
//
// Building is local. Nothing is uploaded or deployed.

import { createHash } from 'node:crypto';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { appFiles, LAB_ROOT } from '../server/app-files.mjs';

/** Never in a customer build: [pattern, why]. */
export const FORBIDDEN = [
  [/\blab\b/i, 'the lab'],
  [/control room/i, 'the control room'],
  [/scenario\s+[ABC]\b/i, 'test scenarios'],
  [/\bphone\s+[AB]\b/i, 'the lab’s test phones'],
  [/type it for me/i, 'the lab’s typing shortcut'],
  [/test identit/i, 'test identities'],
  [/\b(?:Moon|Cloud|Star|Fern|Dream|Pebble|Ember)Mallow\b|\bSafetyTeam\b/, 'test identity names'],
  [/seedRelay|signInTestAccount|createTestAccount|RELAY_IDENTITIES|testMode/, 'test accounts'],
  [/canned|Example for testing|DEMO_VOICES|demoProvider/i, 'canned testing examples'],
  [/catch:result|unconfigured/, 'developer signals'],
  [/MaxOutputTokens|reportsToPause|cost guard|fairnessPool|fallbackGlobalPerDay|MALLOW_VOICES/, 'server tuning'],
  [/\b\d+\s?KB\b|\$\{[^}]*\/\s*1024\)/, 'technical file sizes'],
  [/LocalNetwork|__lab\b|fixture/i, 'the simulated service'],
  [/dev clock/i, 'the development clock'],
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
    if (!/\.(?:html|css|m?js|json|txt)$/.test(url)) continue;
    const text = readFileSync(file, 'utf8');
    for (const [re, why] of FORBIDDEN) {
      const m = re.exec(text);
      if (m) found.push({ url, why, match: m[0], line: text.slice(0, m.index).split('\n').length });
    }
  }
  return found;
}

export function build({ out = join(LAB_ROOT, 'dist', 'app') } = {}) {
  const files = appFiles();
  const problems = scan(files);
  if (problems.length) return { ok: false, problems };
  rmSync(out, { recursive: true, force: true });
  const manifest = { app: 'hushmates', format: 1, files: {} };
  for (const [url, file] of files) {
    const target = join(out, url);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(file, target);
    const bytes = readFileSync(target);
    manifest.files[url] = { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
  }
  writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  // check what was written, not only what was read
  const written = new Map(Object.keys(manifest.files).map((url) => [url, join(out, url)]));
  const after = scan(written);
  return { ok: !after.length, problems: after, out, count: written.size };
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
