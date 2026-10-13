// Malicious and careless requests through the network entry point, plus the
// Mallow perspective providers' contracts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, cid, FEELING, REFRAMES } from './relay-helpers.mjs';
import { LocalNetwork } from '../net/local-network.js';
import { anotherAngleProvider, libraryProvider, demoProvider, chain } from '../core/perspectives.js';

const rejects = async (p, code) => {
  try { await p; } catch (e) { assert.equal(e.code, code, e.message); return; }
  assert.fail(`expected ${code}`);
};
const lab = (o) => { const w = world(o); return { ...w, net: new LocalNetwork(w.svc, { latency: [1, 3] }) }; };

test('attack: internals, seeding and the clock are unreachable from a client', async () => {
  const w = lab();
  const link = w.net.link('x');
  for (const m of ['createTestAccount', 'signInTestAccount', 'tick', '_return', '_journeyView', 'toJSON', 'subscribe', 'constructor', '__proto__']) {
    await rejects(link.request(m, w.T.cloud, {}), 'forbidden');
  }
});

test('attack: forged tokens and caller-supplied identities are ignored', async () => {
  const w = lab();
  const link = w.net.link('x');
  for (const tok of ['tok_forged', '', null, 7, { id: 'acc' }]) await rejects(link.request('listJourneys', tok), 'not-signed-in');
  const moonId = Object.values(w.svc.s.accounts).find((a) => a.key === 'moon').id;
  const r = await link.request('submitFeeling', w.T.cloud, { text: FEELING, consent: true, clientId: cid(), owner: moonId, accountId: moonId });
  assert.equal(w.svc.s.journeys[r.journey.id].owner, Object.values(w.svc.s.accounts).find((a) => a.key === 'cloud').id);
});

test('attack: nobody can read, withdraw, delete or ask a Mallow about someone else’s feeling', async () => {
  const w = lab();
  const id = w.release().journey.id;
  const link = w.net.link('x');
  for (const [m, args] of [['getJourney', { journeyId: id }], ['withdrawFeeling', { journeyId: id }], ['deleteJourney', { journeyId: id, confirm: 'DELETE' }],
    ['askMallow', { journeyId: id }], ['markReturnSeen', { journeyId: id }], ['saveJourney', { journeyId: id }], ['releaseJourney', { journeyId: id }]]) {
    await rejects(link.request(m, w.T.cloud, args), 'not-found');
    await rejects(link.request(m, w.T.mod, args), 'not-found');      // moderators can't browse journeys either
  }
  const list = await link.request('listJourneys', w.T.cloud);
  assert.equal(list.journeys.length, 0);
});

test('attack: holds cannot be guessed, stolen or replayed', async () => {
  const w = lab();
  w.release();
  const link = w.net.link('x');
  const { offer } = await link.request('findFeeling', w.T.cloud);
  await rejects(link.request('catchFeeling', w.T.star, { holdId: offer.holdId }), 'not-found');
  await rejects(link.request('submitReframe', w.T.star, { holdId: offer.holdId, text: REFRAMES[0], clientId: cid() }), 'not-found');
  await rejects(link.request('catchFeeling', w.T.star, { holdId: 'hold_guess0000000' }), 'not-found');
  await link.request('catchFeeling', w.T.cloud, { holdId: offer.holdId });
  await link.request('submitReframe', w.T.cloud, { holdId: offer.holdId, text: REFRAMES[0], clientId: cid() });
  // the used hold can't carry a second perspective
  await rejects(link.request('submitReframe', w.T.cloud, { holdId: offer.holdId, text: REFRAMES[1], clientId: cid() }), 'not-available');
});

test('attack: oversized and malformed input fails closed', async () => {
  const w = lab();
  const link = w.net.link('x');
  await rejects(link.request('submitFeeling', w.T.moon, { text: 'x'.repeat(5000), clientId: cid() }), 'feeling-too-long');
  await rejects(link.request('submitFeeling', w.T.moon, { text: FEELING, clientId: 'no' }), 'invalid');
  await rejects(link.request('submitFeeling', w.T.moon, { text: FEELING, clientId: cid(), label: 'despair<script>' }), 'invalid');
  await rejects(link.request('getJourney', w.T.moon, { journeyId: { $ne: null } }), 'not-found');
  await rejects(link.request('savePreferences', w.T.moon, { mallow: 'not-a-mallow' }), 'invalid');
});

test('rate limits: finding and reframing cannot be hammered', () => {
  const w = world({ limits: { findsPerHour: 3, maxActiveJourneys: 10 } });
  for (let i = 0; i < 4; i++) w.release('moon', { text: `${FEELING} number ${i}` });
  for (let i = 0; i < 3; i++) {
    const { offer } = w.svc.findFeeling(w.T.cloud);
    w.svc.letFloatPast(w.T.cloud, { holdId: offer.holdId });
  }
  assert.throws(() => w.svc.findFeeling(w.T.cloud), (e) => e.code === 'rate-limited');
});

test('realtime: only the author hears about their feeling', async () => {
  const w = lab();
  const heard = { moon: [], cloud: [], star: [] };
  for (const k of Object.keys(heard)) w.net.link(k).subscribe(w.T[k], (e) => heard[k].push(e));
  w.release();
  w.give('cloud', REFRAMES[0]);
  await new Promise((r) => setTimeout(r, 30));
  assert.ok(heard.moon.length >= 2);
  assert.equal(heard.star.length, 0);
  assert.ok(!JSON.stringify(heard.moon).includes(REFRAMES[0]), 'events carry no words');
});

test('lost reply + retry never duplicates a feeling or a perspective', async () => {
  const w = lab();
  const link = w.net.link('moon');
  link.loseNextResponse = true;
  const clientId = cid('f');
  await rejects(link.request('submitFeeling', w.T.moon, { text: FEELING, consent: true, clientId }), 'response-lost');
  const again = await link.request('submitFeeling', w.T.moon, { text: FEELING, consent: true, clientId });
  assert.equal(again.duplicate, true);
  assert.equal(Object.keys(w.svc.s.journeys).length, 1);
});

// --------------------------------------------------------- providers --
test('library provider: grounded authored perspective, refuses crisis text', async () => {
  const p = libraryProvider();
  const ok = await p({ text: FEELING, mallow: 'loomi' });
  assert.equal(ok.status, 'ok');
  assert.equal(ok.source, 'library');
  assert.ok(ok.text.length > 20);
  assert.equal((await p({ text: 'I want to end it all', mallow: 'loomi' })).status, 'support');
});

test('demo provider is always labelled demo', async () => {
  assert.equal((await demoProvider()({ label: 'worry', mallow: 'loomi' })).source, 'demo');
});

function fakeAngleServer({ provider = 'anthropic', reply }) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith('/v1/health')) return new Response(JSON.stringify({ ok: true, provider, configured: { provider_key: provider === 'anthropic' } }), { status: 200 });
    if (url.endsWith('/v1/angle')) { const r = reply(JSON.parse(init.body), init); return new Response(JSON.stringify(r.body), { status: r.status || 200 }); }
    return new Response('{}', { status: 404 });
  };
  return { fetch, calls };
}
const scene = { status: 'ok', prompt_version: 'angle-v5', scene: { subtitle_line_1: 'That wait is the part that happened.', subtitle_line_2: 'What it means is still an open question.', mallow_character: 'zuzu', alternative_angle: '' } };

test('Another Angle adapter: AI-labelled only when the server runs the real model', async () => {
  for (const [provider, source] of [['anthropic', 'ai'], ['mock', 'demo']]) {
    const s = fakeAngleServer({ provider, reply: () => ({ body: scene }) });
    const p = anotherAngleProvider({ baseUrl: 'https://angle.test', session: async () => 'tok', fetch: s.fetch });
    const r = await p({ text: FEELING, label: 'worry' });
    assert.equal(r.status, 'ok');
    assert.equal(r.source, source);
    assert.equal(r.mallow, 'zuzu');
    const sent = JSON.parse(s.calls.find((c) => c.url.endsWith('/v1/angle')).init.body);
    assert.equal(sent.consent, true);
    assert.equal(sent.emotion, 'worry');   // a taxonomy id the server accepts
    assert.deepEqual(Object.keys(sent).sort(), ['consent', 'emotion', 'intention', 'locale', 'text']);   // nothing about the person
  }
});

test('Another Angle adapter: support, fallback, limits, auth refresh and outages map safely', async () => {
  const cases = [
    [{ status: 200, body: { status: 'crisis', support: {} } }, 'support'],
    [{ status: 200, body: { status: 'fallback', fallback: { reason: 'quality' } } }, 'unavailable'],
    [{ status: 429, body: { status: 'limit' } }, 'unavailable'],
    [{ status: 503, body: { status: 'error' } }, 'unavailable'],
  ];
  for (const [reply, expected] of cases) {
    const s = fakeAngleServer({ reply: () => reply });
    const r = await anotherAngleProvider({ baseUrl: 'https://angle.test', session: async () => 'tok', fetch: s.fetch })({ text: FEELING });
    assert.equal(r.status, expected);
  }
  let first = true;
  const s = fakeAngleServer({ reply: () => (first ? (first = false, { status: 401, body: {} }) : { body: scene }) });
  let sessions = 0;
  const p = anotherAngleProvider({ baseUrl: 'https://angle.test', session: async () => `tok${++sessions}`, fetch: s.fetch });
  assert.equal((await p({ text: FEELING })).status, 'ok');
  assert.equal(sessions, 2);
  const down = anotherAngleProvider({ baseUrl: 'https://angle.test', session: async () => 'tok', fetch: async () => { throw new Error('offline'); } });
  assert.equal((await down({ text: FEELING })).status, 'unavailable');
  assert.equal((await anotherAngleProvider({})({ text: FEELING })).reason, 'unconfigured');
});

test('provider chain: Another Angle first, the Reframe library when it gives no usable answer', async () => {
  const s = fakeAngleServer({ reply: () => ({ body: { status: 'fallback', fallback: { reason: 'capacity' } } }) });
  const p = chain(anotherAngleProvider({ baseUrl: 'https://angle.test', session: async () => 't', fetch: s.fetch }), libraryProvider());
  const r = await p({ text: FEELING, label: 'worry', mallow: 'loomi' });
  assert.equal(r.source, 'library');
});

test('optional: the real Another Angle server (local harness, mock provider) if one is running on :8790', async (t) => {
  let up = false;
  try { up = (await fetch('http://127.0.0.1:8790/v1/health')).ok; } catch { up = false; }
  if (!up) { t.skip('no local Another Angle harness running'); return; }
  const base = 'http://127.0.0.1:8790';
  const session = async () => (await (await fetch(`${base}/v1/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ device_id: 'hushmates-tests-0001' }) })).json()).token;
  const p = anotherAngleProvider({ baseUrl: base, session });
  const ok = await p({ text: FEELING, label: 'worry' });
  // the harness has its own per-minute and per-day limits; when it refuses, there's nothing live to check
  // (how the adapter handles refusals is covered above against a fake server)
  if (ok.status === 'unavailable' && ['session', 'limit'].includes(ok.reason)) { t.skip(`the local harness refused (${ok.reason}): its own limits`); return; }
  assert.equal(ok.status, 'ok');
  assert.equal(ok.source, 'demo', 'mock provider must never be labelled AI');
  assert.equal((await p({ text: 'I want to end it all' })).status, 'support');
});

test('provider: a refused session (no token) is reported as "session", never shown as a perspective', async () => {
  let calls = 0;
  const fetch = async () => { calls += 1; return new Response('{}'); };
  const r = await anotherAngleProvider({ baseUrl: 'https://angle.test', session: async () => undefined, fetch })({ text: FEELING, label: 'worry' });
  assert.equal(r.status, 'unavailable');
  assert.equal(r.reason, 'session');
  assert.equal(calls, 0, 'nothing is sent without a session');
});
