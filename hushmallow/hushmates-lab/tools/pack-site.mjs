#!/usr/bin/env node
// One folder to upload to a static host (for example a new Cloudflare Pages project): the
// customer app and the safety desk, built for one Supabase project, with the host's header
// rules (_headers), the two short redirects (_redirects) and a plain "not here" page (404.html).
// It builds and checks; it uploads nothing.
//
//   node tools/pack-site.mjs --supabase-url https://<ref>.supabase.co --anon-key <publishable key> [--out dist/site]

import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build-app.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOT_HERE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hushmates</title></head>'
  + '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#FFF8F3;color:#1F1640;font:600 17px/1.5 system-ui,sans-serif;text-align:center">'
  + '<p>This page isn’t here.<br><a href="/app/" style="color:#1F1640">Go to Hushmates</a></p></body></html>\n';

const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

export function packSite({ supabaseUrl, anonKey, out = join(ROOT, 'dist', 'site') }) {
  const origin = new URL(supabaseUrl).origin;
  if (new URL(supabaseUrl).protocol !== 'https:') throw new Error('the Supabase address must start with https://');
  const tmp = mkdtempSync(join(tmpdir(), 'hushmates-pack-'));
  try {
    for (const which of ['app', 'staff']) {
      const res = build({ out: join(tmp, which), which, deploy: { supabaseUrl, anonKey } });
      if (!res.ok) throw new Error(`the ${which} build was refused: ${res.problems.map((p) => `${p.url} ${p.why}`).slice(0, 3).join('; ')}`);
    }
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    // the two builds share the app's styles and parts: the same bytes, or the pack stops
    for (const which of ['app', 'staff']) {
      for (const file of walk(join(tmp, which))) {
        const rel = relative(join(tmp, which), file);
        if (rel === 'manifest.json') continue;                         // the Node host's check; a static host doesn't use it
        const target = join(out, rel);
        if (existsSync(target) && !readFileSync(target).equals(readFileSync(file))) throw new Error(`${rel} differs between the app and the desk`);
        mkdirSync(dirname(target), { recursive: true });
        cpSync(file, target);
      }
    }
    const csp = `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self' ${origin}; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
    writeFileSync(join(out, '_headers'), [
      '/*',
      '  X-Content-Type-Options: nosniff',
      '  Referrer-Policy: no-referrer',
      '  X-Frame-Options: DENY',
      '  Cross-Origin-Opener-Policy: same-origin',
      '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
      '  X-Robots-Tag: noindex, nofollow',
      '  Strict-Transport-Security: max-age=31536000',
      `  Content-Security-Policy: ${csp}`,
      '/app/config.json',
      '  Cache-Control: no-cache',
      '',
    ].join('\n'));
    writeFileSync(join(out, '_redirects'), '/ /app/ 302\n/app /app/ 302\n/staff /staff/ 302\n');
    writeFileSync(join(out, '404.html'), NOT_HERE);
    return { out, files: walk(out).length, origin };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  try {
    const r = packSite({ supabaseUrl: arg('supabase-url') || '', anonKey: arg('anon-key') || '', out: arg('out') ? resolve(arg('out')) : undefined });
    console.log(`✓ ${r.files} files in ${r.out}, connected to ${r.origin}. Nothing was uploaded.`);
    console.log('Upload that folder as it is (docs/STAGING.md, part 7).');
  } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
}
