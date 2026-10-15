// The folder for a static host (tools/pack-site.mjs): the app and the desk built for one
// project, the host's security headers with that project as the only place pages may connect
// to, no lab, no build manifests, and never a secret key.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { packSite } from '../tools/pack-site.mjs';

test('the static site: app and desk, the project as the only connection, headers, no lab', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-site-'));
  try {
    const out = join(dir, 'site');
    packSite({ supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co', anonKey: 'sb_publishable_test', out });
    for (const f of ['app/index.html', 'staff/index.html', 'app/config.json', '_headers', '_redirects', '404.html']) assert.ok(existsSync(join(out, f)), f);
    for (const f of ['manifest.json', 'lab/index.html', 'lab']) assert.ok(!existsSync(join(out, f)), `${f} was packed`);
    const headers = readFileSync(join(out, '_headers'), 'utf8');
    assert.match(headers, /connect-src 'self' https:\/\/abcdefghijklmnopqrst\.supabase\.co;/);
    assert.match(headers, /frame-ancestors 'none'/);
    assert.match(headers, /X-Frame-Options: DENY/);
    assert.equal(JSON.parse(readFileSync(join(out, 'app/config.json'), 'utf8')).supabaseAnonKey, 'sb_publishable_test');
    assert.throws(() => packSite({ supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co', anonKey: 'sb_secret_nope', out: join(dir, 'x') }), /never a secret/);
    assert.throws(() => packSite({ supabaseUrl: 'http://abcdefghijklmnopqrst.supabase.co', anonKey: 'sb_publishable_test', out: join(dir, 'y') }), /https/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
