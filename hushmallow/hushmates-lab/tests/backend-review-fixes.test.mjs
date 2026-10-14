// Regression tests for what the independent reviews found (each failed before its fix): sign-in, and the Mallow.

import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, randomBytes } from 'node:crypto';
import { createVerifier } from '../supabase/functions/_shared/jwt.js';
import { createFieldCrypt } from '../supabase/functions/_shared/fieldcrypt.js';
import { libraryProvider } from '../core/perspectives.js';
import { createMallow, createMemoryUsage } from '../supabase/functions/_shared/mallow.js';
import { createAnotherAngle } from '../supabase/functions/_shared/ai-another-angle.js';
import http from 'node:http';

const { subtle } = webcrypto;
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
async function ecKey(kid) {
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await subtle.exportKey('jwk', pair.publicKey);
  return { kid, privateKey: pair.privateKey, jwk: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, kid, alg: 'ES256', use: 'sig' } };
}
async function sign(k, claims) {
  const input = `${b64({ alg: 'ES256', kid: k.kid, typ: 'JWT' })}.${b64(claims)}`;
  const sig = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k.privateKey, Buffer.from(input));
  return `${input}.${Buffer.from(sig).toString('base64url')}`;
}
const iss = 'https://abcdefgh.supabase.co/auth/v1';
const T = Date.UTC(2026, 9, 14, 9);
const claims = { iss, sub: 'u1', aud: 'authenticated', role: 'authenticated', exp: Math.floor(T / 1000) + 3600, iat: Math.floor(T / 1000) };
const outcome = (v, t) => v.verify(t).then(() => 'ok', (e) => `refused (${e.reason})`);

test('sign-in keys: one failed fetch at a cold start doesn’t refuse valid sign-ins for the next 30 seconds', async () => {
  const a = await ecKey('a');
  const clock = { t: T };
  let up = false;
  const fetch = async () => { if (!up) throw new Error('ECONNRESET'); return new Response(JSON.stringify({ keys: [a.jwk] })); };
  const v = createVerifier({ issuers: [{ iss, provider: 'hushmates', jwksUrl: `${iss}/.well-known/jwks.json` }], fetch, now: () => clock.t });
  const token = await sign(a, claims);
  assert.match(await outcome(v, token), /refused/, 'a token verified with no keys at all');
  up = true;
  clock.t = T + 1000;
  assert.equal(await outcome(v, token), 'ok', 'people were refused (and signed out) while the issuer was back');
});

test('sign-in keys: requests arriving together after a key rotation all wait for the one fetch', async () => {
  const a = await ecKey('a');
  const b = await ecKey('b');
  let served = { keys: [a.jwk] };
  let calls = 0;
  const fetch = async () => { calls += 1; await new Promise((r) => setTimeout(r, 50)); return new Response(JSON.stringify(served)); };
  const v = createVerifier({ issuers: [{ iss, provider: 'hushmates', jwksUrl: `${iss}/.well-known/jwks.json` }], fetch, now: () => T });
  assert.equal(await outcome(v, await sign(a, claims)), 'ok');
  served = { keys: [a.jwk, b.jwk] };
  const tokenB = await sign(b, claims);
  const results = await Promise.all(Array.from({ length: 5 }, () => outcome(v, tokenB)));
  assert.deepEqual(results, Array(5).fill('ok'));
  assert.equal(calls, 2, 'each request fetched the keys on its own');
});

test('field encryption: a key id that isn’t text is refused up front, not on the first feeling', async () => {
  const keys = { 1: randomBytes(32).toString('base64') };
  await assert.rejects(createFieldCrypt({ keys, current: 1, macKey: randomBytes(32).toString('base64') }), /current key id/);
});

// --------------------------------------------------------------- the Mallow --
const MALLOWS = ['noomi', 'blubi', 'pipzi', 'boppo', 'zuzu', 'loomi', 'glitzi'];
async function anglesFor(text, label) {
  const lib = libraryProvider();
  const ids = new Set();
  for (const mallow of MALLOWS) ids.add((await lib({ text, label, mallow })).angleId);
  return [...ids];
}

test('the Mallow library: everyday "died" and "dying" are not a bereavement', async () => {
  for (const [text, label] of [['My phone died and I missed the call about the job', 'frustration'], ['I nearly died laughing at my sister’s wedding speech', 'joy'],
    ['I’m dying to see my best friend next week', 'excitement'], ['The car battery died again', 'frustration'], ['My laptop died right before my deadline', 'frustration']]) {
    const ids = await anglesFor(text, label);
    assert.ok(!ids.some((id) => id.startsWith('hm-loss')), `${text} → ${ids}`);
  }
  for (const text of ['My cat died', 'My grandad died last month and I keep thinking about him', 'Dad is dying and I don’t know what to do']) {
    assert.ok((await anglesFor(text, 'sadness')).every((id) => id.startsWith('hm-loss')), `${text} lost its grief lines`);
  }
});

test('the Mallow library: worries about things aren’t treated as worries about a loved one, and other misfires', async () => {
  for (const text of ['I’m worried about my exam tomorrow', 'I’m really worried about my results', 'Worried about my driving test on Monday']) {
    assert.ok(!(await anglesFor(text, 'worry')).some((id) => id.startsWith('hm-care-for')), text);
  }
  assert.ok((await anglesFor('I’m worried about my dad', 'worry')).every((id) => id.startsWith('hm-care-for')));
  for (const text of ['I failed my maths exam', 'Got my exam results today and they were awful']) {
    const ids = await anglesFor(text, 'sadness');
    assert.ok(!ids.includes('hm-exam-1') && !ids.includes('hm-exam-3'), `${text} got pre-exam lines: ${ids}`);
  }
  const lib = libraryProvider();
  for (const mallow of MALLOWS) {
    const r = await lib({ text: 'Dad is in hospital again and nobody will tell me anything', label: 'worry', mallow });
    assert.ok(!/your health/.test(r.text), `${mallow}: ${r.text}`);
  }
  assert.ok(!(await anglesFor('My brother Bill ignored me all through dinner', 'sadness')).some((id) => id.startsWith('hm-money')));
  assert.ok(!(await anglesFor('The other kids mock me for my accent', 'sadness')).some((id) => id.startsWith('hm-exam')));
  assert.ok(!(await anglesFor('I always end up crying on Sunday nights', 'sadness')).some((id) => id.startsWith('hm-load')));
  // and a rift with someone close gets lines about that, not generic sadness
  assert.ok((await anglesFor('I miss how things used to be with my brother before we stopped talking.', 'sadness')).every((id) => id.startsWith('hm-rift')));
});

test('the Mallow: one generation is shared only by the same person’s same feeling', async () => {
  const slow = async ({ text }) => { await new Promise((r) => setTimeout(r, 30)); return { status: 'ok', text: `About: ${text}`, source: 'library', model: 'x', angleId: text }; };
  const m = createMallow({ library: slow });
  const [a, b] = await Promise.all([
    m.perspective({ text: 'My grandad died last week.', memberId: 'A', journeyId: 'same' }),
    m.perspective({ text: 'I passed my driving test today.', memberId: 'B', journeyId: 'same' }),
  ]);
  assert.notEqual(a.text, b.text, 'one person received another person’s perspective');
});

test('the Mallow: an estimate that rounds to nothing never lets AI run under a A$0 cap', async () => {
  let called = 0;
  const ai = async () => { called += 1; return { status: 'ok', text: 'A kind thought.', source: 'ai', model: 'x', costAud: 0 }; };
  const m = createMallow({ library: libraryProvider(), ai, usage: createMemoryUsage(),
    settings: () => ({ ai: { enabled: true, monthlyCapAud: 0, perMemberDaily: 9, perDayGlobal: 9, costPerCallAud: 4e-7 } }) });
  const r = await m.perspective({ text: 'I keep worrying I said the wrong thing to my sister.', label: 'worry', mallow: 'noomi', memberId: 'm1', journeyId: 'j1' });
  assert.equal(called, 0);
  assert.equal(r.source, 'library');
});

test('Another Angle: an "unclear" answer to real words is charged, and the Mallow’s deadline cancels the request', async () => {
  let arrivedAfterAbort = false;
  const ctl = new AbortController();
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      if (ctl.signal.aborted) arrivedAfterAbort = true;
      if (req.url === '/v1/angle' && body.includes('slow')) { setTimeout(() => { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{}'); }, 600); return; }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'fallback', fallback: { reason: 'unclear' } }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const provider = createAnotherAngle({ baseUrl: base, serviceToken: 'token', timeoutMs: 5000, costPerCallAud: 0.06 });
    const words = await provider({ text: 'I keep worrying I said the wrong thing.', label: 'worry' });
    assert.equal(words.reason, 'unclear');
    assert.equal(words.costAud, 0.06, 'the model read real words: that call was billed');
    const emoji = await provider({ text: '🙂🙂🙂', label: 'worry' });
    assert.equal(emoji.costAud, 0, 'nothing for the model to read: not billed');
    setTimeout(() => ctl.abort(), 100);
    const t0 = Date.now();
    const cut = await provider({ text: 'slow words here please', label: 'worry', signal: ctl.signal });
    assert.equal(cut.reason, 'timeout');
    assert.ok(Date.now() - t0 < 500, 'the request kept going after the deadline');
    const late = await provider({ text: 'anything at all', label: 'worry', signal: ctl.signal });
    assert.equal(late.reason, 'timeout');
    assert.equal(late.costAud, 0, 'a request after the deadline was sent');
    assert.equal(arrivedAfterAbort, false, 'words reached the service after the Mallow gave up');
  } finally { await new Promise((r) => server.close(r)); }
});
