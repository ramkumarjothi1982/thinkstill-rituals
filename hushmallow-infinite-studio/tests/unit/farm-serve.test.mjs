// render/serve.mjs: static files for the stage pages (the frozen route still
// uses it) and the binary frame sink that replaces base64 readback.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startServer, SINK_PREFIX, REPO_ROOT } from '../../render/serve.mjs';
import { REPO } from '../../render/lib/paths.mjs';

async function withServer(opts, fn) {
  const server = await startServer(0, opts);
  try { return await fn(server, `http://127.0.0.1:${server.address().port}`); } finally { server.close(); }
}

test('static files: served from the repository root, reported to onServe; no escape, no writes', async () => {
  const seen = [];
  await withServer({ onServe: (f) => seen.push(f) }, async (_s, base) => {
    assert.equal(REPO_ROOT, REPO);
    const r = await fetch(`${base}/hushmallow-infinite-studio/engine/index.html`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /importmap/);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].url, '/hushmallow-infinite-studio/engine/index.html');
    assert.ok(Buffer.isBuffer(seen[0].bytes));
    assert.equal((await fetch(`${base}/hushmallow-infinite-studio/nope.js`)).status, 404);
    // a raw request line with dot segments (fetch would normalise them away): the server's URL
    // parsing resolves them inside the root, so /etc/passwd is looked up as <repo>/etc/passwd
    const raw = await new Promise((resolve, reject) => http.get({ host: '127.0.0.1', port: Number(new URL(base).port), path: '/../../etc/passwd' }, (res) => { res.resume(); resolve(res.statusCode); }).on('error', reject));
    assert.equal(raw, 404);
    assert.ok(!seen.some((f) => !f.file.startsWith(`${REPO}/`)), 'nothing outside the repository is ever served');
    assert.equal((await fetch(`${base}/hushmallow-infinite-studio/engine/index.html`, { method: 'PUT', body: 'x' })).status, 405);
  });
});

test('frame sink: frames arrive whole, in order, as raw bytes; the response waits for the consumer', async () => {
  await withServer({}, async (server, base) => {
    const got = [];
    let release;
    const gate = new Promise((r) => { release = r; });
    const sink = server.addSink(async (i, buf) => { got.push([i, buf.length, buf[0], buf[buf.length - 1]]); if (i === 1) await gate; }, { bytes: 1024 });
    assert.ok(sink.url(7).startsWith(SINK_PREFIX));
    const body = (v) => new Blob([new Uint8Array(1024).fill(v)]);
    assert.equal((await fetch(base + sink.url(0), { method: 'POST', body: body(5) })).status, 204);
    let answered = false;
    const pending = fetch(base + sink.url(1), { method: 'POST', body: body(9) }).then((r) => { answered = true; return r.status; });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(answered, false, 'back-pressure: no answer before the consumer is done');
    release();
    assert.equal(await pending, 204);
    assert.deepEqual(got, [[0, 1024, 5, 5], [1, 1024, 9, 9]]);
    sink.close();
    assert.equal((await fetch(base + sink.url(2), { method: 'POST', body: body(1) })).status, 404, 'closed sink');
  });
});

test('frame sink refuses wrong sizes, unknown tokens, bad paths and consumer errors', async () => {
  await withServer({}, async (server, base) => {
    const sink = server.addSink((i) => { if (i === 3) throw new Error('frame 3 arrived, expected 2'); }, { bytes: 16 });
    const post = (url, n = 16) => fetch(base + url, { method: 'POST', body: new Blob([new Uint8Array(n)]) });
    assert.equal((await post(sink.url(0), 15)).status, 400);
    assert.equal((await post(`${SINK_PREFIX}deadbeef/0`)).status, 404);
    assert.equal((await post(`${sink.url(0)}/extra`)).status, 404);
    assert.equal((await post(`${SINK_PREFIX}${sink.token}/x`)).status, 404);
    assert.equal((await fetch(base + sink.url(0))).status, 405);
    const r = await post(sink.url(3));
    assert.equal(r.status, 500);
    assert.match(await r.text(), /expected 2/);
  });
});
