// The staging rehearsal's stand-ins behave like the real hosts they stand for: the static site
// (server/static-site.mjs, for Cloudflare Pages) applies the packed folder's _headers and
// _redirects, serves 404.html for anything else and nothing outside the folder; a site packed for
// a local rehearsal differs from a real one only in the backend's address.

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { packSite } from '../tools/pack-site.mjs';
import { createStaticSite } from '../server/static-site.mjs';

// the path exactly as written: fetch() and URL tidy %2e%2e and ../ away before a server sees them
const rawGet = (base, path) => new Promise((resolve, reject) => {
  const u = new URL(base);
  const req = http.request({ host: u.hostname, port: u.port, path, method: 'GET' }, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }));
  });
  req.on('error', reject);
  req.end();
});

test('the static site serves the packed folder as Pages does', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-static-'));
  const site = createStaticSite({ root: (packSite({ supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co', anonKey: 'sb_publishable_x', out: join(dir, 'site') }), join(dir, 'site')) });
  const base = await site.listen(0);
  try {
    const app = await fetch(`${base}/app/`);
    assert.equal(app.status, 200);
    assert.match(app.headers.get('content-security-policy'), /connect-src 'self' https:\/\/abcdefghijklmnopqrst\.supabase\.co;/);
    assert.equal(app.headers.get('x-frame-options'), 'DENY');
    const root = await fetch(`${base}/`, { redirect: 'manual' });
    assert.equal(root.status, 302);
    assert.equal(root.headers.get('location'), '/app/');
    for (const p of ['/lab/', '/nope', '/_headers', '/_redirects']) {
      const r = await fetch(`${base}${p}`);
      assert.equal(r.status, 404, p);
      assert.match(await r.text(), /This page isn’t here/, p);
    }
    // nothing outside the folder: a file next to it, and the system's own, asked for every way a path can climb
    writeFileSync(join(dir, 'outside.txt'), 'OUTSIDE-THE-SITE-FOLDER');
    const up = '..%2f'.repeat(12);
    for (const p of ['/..%2foutside.txt', '/%2e%2e%2foutside.txt', '/..%2F..%2Fsite%2F..%2Foutside.txt', `/${up}etc%2fpasswd`, '/..%2f..%2fetc%2fpasswd',
      '/%2e%2e/%2e%2e/etc/passwd', '/../outside.txt', '/app/..%2f..%2foutside.txt', '/..%5coutside.txt']) {
      const r = await rawGet(base, p);
      assert.equal(r.status, 404, p);
      assert.ok(!r.text.includes('OUTSIDE-THE-SITE-FOLDER') && !/root:.*:0:0:/.test(r.text), `${p} served a file from outside the folder`);
    }
  } finally { await site.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('a rehearsal pack differs from a real one only in the backend address', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-static-'));
  try {
    packSite({ supabaseUrl: 'http://127.0.0.1:5555', anonKey: 'local-anon-key-dev-only', out: join(dir, 'local'), allowLocal: true });
    assert.equal(JSON.parse(readFileSync(join(dir, 'local', 'app', 'config.json'), 'utf8')).supabaseUrl, 'http://127.0.0.1:5555');
    assert.match(readFileSync(join(dir, 'local', '_headers'), 'utf8'), /connect-src 'self' http:\/\/127\.0\.0\.1:5555;/);
    assert.ok(!readFileSync(join(dir, 'local', 'app', 'index.html'), 'utf8').includes('rehearsal.invalid'));
    assert.throws(() => packSite({ supabaseUrl: 'http://127.0.0.1:5555', anonKey: 'x', out: join(dir, 'no') }), /https/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
