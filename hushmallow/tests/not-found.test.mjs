// Unknown paths on the published site (404.html, tools/build-site.sh): served
// the way Cloudflare Pages serves them (tools/site/pages-headers.mjs). Without
// a 404.html Pages answers every unknown path with index.html, whose relative
// paths under a nested path (/plans/yearly) point at that fallback again: the
// live preview showed a blank page and about 6,000 requests in 5 seconds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../tools/site/pages-headers.mjs';

const root = new URL('..', import.meta.url).pathname;
const VER = 'nf0test';
const ENV = { PATH: process.env.PATH, HOME: process.env.HOME || '/tmp' };

test('the built site answers an unknown path at any depth with a small 404 page that names only absolute files', async () => {
  const out = mkdtempSync(join(tmpdir(), 'hm-404-'));
  const srv = createServer(out);
  try {
    execFileSync('bash', [join(root, 'tools/build-site.sh'), out, VER], { cwd: root, stdio: 'ignore', env: ENV });
    const page = readFileSync(join(out, '404.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    assert.ok(!/<script\b|\son[a-z]+=/i.test(page), 'no script, no inline handler');
    const named = [...page.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(named.includes(`/v/${VER}/src/ui/legal.css`));
    for (const x of named) assert.ok(x === '/' || x.startsWith(`/v/${VER}/`), `${x}: "/" or an absolute /v/${VER}/ path`);

    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${srv.address().port}`;
    for (const p of ['/plans/yearly', '/auth/', '/legal/', '/a/b/c', '/auth/callbak/?token_hash=x&type=signup', `/v/${VER}/src/app/nope.js`, '/v/oldversion/src/app/main.js']) {
      const r = await fetch(base + p, { redirect: 'manual' });
      const body = await r.text();
      assert.equal(r.status, 404, p);
      assert.equal(r.headers.get('cache-control'), 'no-store', `${p}: Pages sends every 404 with no-store`);
      assert.match(body, /This page isn’t here/, p);
      assert.ok(!body.includes('src/app/main.js'), `${p}: not the app page`);
    }
    // what it names is in the site, and the app's own addresses are unchanged
    for (const x of named.filter((x) => x !== '/')) assert.equal((await fetch(base + x)).status, 200, x);
    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), new RegExp(`v/${VER}/src/app/main\\.js" onerror="hmStale\\(\\)"`), 'a missing module (404) still fires hmStale');
    for (const p of ['/auth/callback/', '/legal/privacy', '/legal/terms', '/version.json', '/src/app/main.js']) assert.equal((await fetch(base + p)).status, 200, p);
    for (const [p, to] of [['/legal/privacy/', '/legal/privacy'], ['/index', '/'], ['/index.html', '/'], ['/auth/callback', '/auth/callback/']]) {
      const r = await fetch(base + p, { redirect: 'manual' });
      assert.deepEqual([r.status, r.headers.get('location')], [308, to], p);
    }

    // the site check refuses a 404.html that would break at depth or run code (tools/site/check.mjs rule 9)
    const good = readFileSync(join(out, '404.html'), 'utf8');
    const check = () => { try { execFileSync('node', [join(root, 'tools/site/check.mjs'), out, VER], { cwd: root, stdio: 'pipe', env: ENV }); return 'ok'; } catch (e) { return String(e.stdout) + String(e.stderr); } };
    assert.equal(check(), 'ok');
    const css = `/v/${VER}/src/ui/legal.css`, logo = `/v/${VER}/assets/brand/hushmallow-logo-light-360.webp`;
    for (const [what, bad] of [
      ['a single-quoted relative path', good.replace(`href="${css}"`, "href='src/ui/legal.css'")],
      ['an unquoted relative path', good.replace(`href="${css}"`, 'href=src/ui/legal.css')],
      ['a relative second srcset candidate', good.replace(`src="${logo}"`, `src="${logo}" srcset="${logo} 360w, assets/brand/hushmallow-logo-light-720.webp 720w"`)],
      ['a script', good.replace('</body>', '<script>1</script></body>')],
      ['an inline handler', good.replace('<a class="legal-home"', '<a onclick ="x()" class="legal-home"')],
      ['an inline style', good.replace('<body class="legal-page">', '<body class="legal-page" style="color:red">')],
      ['no strict policy of its own', good.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')],
    ]) {
      writeFileSync(join(out, '404.html'), bad);
      assert.match(check(), /404\.html/, `the site check refuses ${what}`);
    }
    writeFileSync(join(out, '404.html'), good);
  } finally {
    srv.close();
    rmSync(out, { recursive: true, force: true });
  }
});
