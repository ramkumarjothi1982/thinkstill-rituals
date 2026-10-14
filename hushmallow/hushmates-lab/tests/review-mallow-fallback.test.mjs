// Adversarial review, lens: the Mallow fallback and cost controls.
// Written to fail on the code as it was reviewed; each now guards the fix (regression tests).
//   node --test tests/review-mallow-fallback.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { world, FEELING, REFRAMES } from './relay-helpers.mjs';
import { RelayService } from '../core/relay.js';
import { anotherAngleProvider, libraryProvider, demoProvider, chain } from '../core/perspectives.js';

const MIN = 60e3;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const counting = (inner) => { const p = async (a) => { p.calls += 1; return inner(a); }; p.calls = 0; return p; };
const scene = { status: 'ok', prompt_version: 'angle-v5', scene: { subtitle_line_1: 'That wait is the part that happened.', subtitle_line_2: 'What it means is still an open question.', mallow_character: 'zuzu', alternative_angle: '' } };
const health = (provider) => JSON.stringify({ ok: true, provider, configured: { provider_key: true } });

// A real HTTP server (so the adapter's real fetch + AbortController path is exercised).
async function angleServer(handlers) {
  const srv = createServer((req, res) => {
    const h = handlers[req.url];
    if (h) return h(req, res);
    res.writeHead(404); res.end('{}');
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${srv.address().port}`, close: () => { srv.closeAllConnections(); srv.close(); } };
}

// ---------------------------------------------------------------- 1 --
// A safety "support" answer from the provider is dropped: the feeling keeps travelling to strangers.
const OVERDOSE = 'I took a load of paracetamol an hour ago and feel strange.';

test('BUG 1 (fixed): the relay’s own screen now answers this text with support at release: never stored, never sent', () => {
  const w = world();
  const r = w.release('moon', { allowFallback: true, text: OVERDOSE });
  assert.equal(r.status, 'support');
  assert.ok(r.support.resources.length > 0);
  assert.ok(!JSON.stringify(w.svc.s).includes('paracetamol'), 'crisis words were stored');
});

test('BUG 1 (fixed): a crisis verdict from the Mallow provider stops the feeling, brings support and asks a person to look', async () => {
  // text the rules let through, which the provider's own safety gate flags
  const support = { title: 'Let’s pause', message: 'You deserve real support with this.', resources: [{ label: 'Samaritans', detail: '116 123' }] };
  const w = world({ provider: async () => ({ status: 'support', level: 'crisis', support }) });
  const r = w.release('moon', { allowFallback: true });
  assert.equal(r.status, 'released');
  const id = r.journey.id;
  w.advance(31 * MIN);
  const j = await w.svc.askMallow(w.T.moon, { journeyId: id });
  assert.equal(j.fallback.status, 'failed');
  assert.equal(j.fallback.reason, 'safety');
  // the author is shown support, in Hushmates' own reviewed words (a provider's text is never shown as is)
  assert.ok(j.fallback.support?.message && j.fallback.support.resources?.length, 'the author is shown no support');
  assert.notEqual(j.fallback.support.message, support.message, 'the provider’s unreviewed support text reached the author');
  assert.equal(w.svc.findFeeling(w.T.cloud).offer, null, 'a feeling flagged as crisis is still offered to a stranger');
  const reports = w.svc.modListReports(w.T.mod).reports;
  assert.ok(reports.some((x) => x.urgent && x.kind === 'feeling' && x.status === 'open'), 'no urgent report for a person on the safety team');
});

test('BUG 1 (fixed, live harness): a crisis verdict never leaves the feeling circulating', async (t) => {
  let up = false;
  try { up = (await fetch('http://127.0.0.1:8790/v1/health')).ok; } catch { up = false; }
  if (!up) { t.skip('no local Another Angle harness on :8790'); return; }
  const base = 'http://127.0.0.1:8790';
  const session = async () => (await (await fetch(`${base}/v1/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ device_id: 'hushmates-review-0001' }) })).json()).token;
  // the server's own lexicon on its own: it answers "crisis" for this text
  const p = anotherAngleProvider({ baseUrl: base, session });
  const verdict = await p({ text: OVERDOSE, label: 'worry' });
  if (verdict.status === 'unavailable' && ['session', 'limit'].includes(verdict.reason)) { t.skip(`the local harness refused (${verdict.reason}): its own limits`); return; }
  assert.equal(verdict.status, 'support', 'precondition: the real server flags it');
  // and the relay never lets the same text out in the first place
  const w = world({ provider: chain(p, libraryProvider()) });
  assert.equal(w.release('moon', { allowFallback: true, text: OVERDOSE }).status, 'support');
  assert.equal(w.svc.findFeeling(w.T.cloud).offer, null);
});

// ---------------------------------------------------------------- 2 --
// The Another Angle health result is cached forever, including a failure.
test('BUG 2a (fixed): provenance is checked for every answer, so one failed health probe never mislabels later answers', async () => {
  let probes = 0;
  const fetch = async (url) => {
    if (url.endsWith('/v1/health')) { probes += 1; if (probes === 1) throw new TypeError('fetch failed'); return new Response(health('anthropic')); }
    return new Response(JSON.stringify(scene));
  };
  const p = anotherAngleProvider({ baseUrl: 'https://angle.test', session: async () => 'tok', fetch });
  await p({ text: FEELING, label: 'worry' });                      // a network blip on the first probe
  const later = await p({ text: FEELING, label: 'worry' });         // the server is healthy and runs the real model
  assert.equal(later.source, 'ai', 'a real model answer is presented as not AI');
});

test('BUG 2b (fixed): a server that switches to its mock provider is no longer labelled as live AI', async () => {
  let provider = 'anthropic';
  const fetch = async (url) => new Response(url.endsWith('/v1/health') ? health(provider) : JSON.stringify(scene));
  const p = anotherAngleProvider({ baseUrl: 'https://angle.test', session: async () => 'tok', fetch });
  assert.equal((await p({ text: FEELING, label: 'worry' })).source, 'ai');
  provider = 'mock';                                                // redeployed with PROVIDER=mock
  assert.equal((await p({ text: FEELING, label: 'worry' })).source, 'demo', 'mock placeholder labelled AI-generated');
});

// ---------------------------------------------------------------- 3 --
test('BUG 3 (fixed): deleting a feeling while its Mallow perspective is generating leaves no generated words stored', async () => {
  let open;
  const gate = new Promise((r) => { open = r; });
  const AI = 'Maybe the quiet says more about their week than about you.';
  const w = world({ provider: async ({ mallow }) => { await gate; return { status: 'ok', text: AI, mallow, source: 'ai', model: 't' }; } });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  const asking = w.svc.askMallow(w.T.moon, { journeyId: id });
  assert.deepEqual(w.svc.deleteJourney(w.T.moon, { journeyId: id, confirm: 'DELETE' }), { deleted: true });
  open();
  await asking.catch(() => {});
  assert.ok(!JSON.stringify(w.svc.s).includes(AI), 'the Mallow perspective of a deleted feeling was written back into storage');
});

test('BUG 3b (fixed): letting a feeling go while its Mallow is generating keeps the late answer out of the released collection', async () => {
  let open;
  const gate = new Promise((r) => { open = r; });
  const w = world({ provider: async ({ mallow }) => { await gate; return { status: 'ok', text: 'Maybe the quiet says more about their week.', mallow, source: 'ai' }; } });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  const asking = w.svc.askMallow(w.T.moon, { journeyId: id });
  w.svc.releaseJourney(w.T.moon, { journeyId: id });               // "the words are cleared; only what you kept stays"
  open();
  await asking;
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).collection.length, 0, 'an un-kept Mallow perspective appears after release');
});

// ---------------------------------------------------------------- 4 --
test('BUG 4 (fixed): a generation interrupted by a restart is marked failed, never "pending" forever', async () => {
  const w = world({ provider: () => new Promise(() => {}) });      // the process dies mid-call
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  w.svc.askMallow(w.T.moon, { journeyId: id });
  const restarted = new RelayService({ state: w.svc.toJSON(), now: () => w.clock.t, provider: demoProvider(), testMode: true });
  const j = await restarted.askMallow(w.T.moon, { journeyId: id });
  w.clock.t += 25 * 3600e3;
  const later = restarted.getJourney(w.T.moon, { journeyId: id });
  assert.equal(later.status, 'returned');
  assert.notEqual(later.fallback.status, 'pending', `stuck: ${j.fallback.status} → ${later.fallback.status} a day later`);
});

// ---------------------------------------------------------------- 5 --
test('BUG 5a (fixed): timeoutMs bounds the health probe (a slow /v1/health can’t hang the Mallow)', async () => {
  const s = await angleServer({
    '/v1/health': () => { /* never answers */ },
    '/v1/angle': (req, res) => { req.resume(); res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(scene)); },
  });
  try {
    const p = anotherAngleProvider({ baseUrl: s.base, session: async () => 'tok', timeoutMs: 200 });
    const r = await Promise.race([p({ text: FEELING, label: 'worry' }), sleep(1500).then(() => 'still waiting')]);
    assert.notEqual(r, 'still waiting', 'provider ignored its 200 ms deadline');
  } finally { s.close(); }
});

test('BUG 5b (fixed): timeoutMs bounds the response body (headers then a stall can’t hang the Mallow)', async () => {
  const s = await angleServer({
    '/v1/health': (req, res) => { res.writeHead(200); res.end(health('anthropic')); },
    '/v1/angle': (req, res) => { req.resume(); res.writeHead(200, { 'content-type': 'application/json' }); res.write('{"status":"ok",'); /* stalls */ },
  });
  try {
    const p = anotherAngleProvider({ baseUrl: s.base, session: async () => 'tok', timeoutMs: 200 });
    const r = await Promise.race([p({ text: FEELING, label: 'worry' }), sleep(1500).then(() => 'still waiting')]);
    assert.notEqual(r, 'still waiting', 'provider ignored its 200 ms deadline');
  } finally { s.close(); }
});

// ---------------------------------------------------------------- 6 --
test('BUG 6a (fixed): a feeling a catcher reported as "someone may be in danger" is never sent to the Mallow provider', async () => {
  const provider = counting(demoProvider());
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  const { offer } = w.svc.findFeeling(w.T.cloud);
  w.svc.reportFeeling(w.T.cloud, { holdId: offer.holdId, reason: 'safety' });
  w.advance(31 * MIN);
  const offered = w.svc.getJourney(w.T.moon, { journeyId: id }).fallback.status;
  try { await w.svc.askMallow(w.T.moon, { journeyId: id }); } catch { /* refusing is the fix */ }
  assert.equal(provider.calls, 0, `paused-for-safety feeling went to the provider (fallback view said "${offered}")`);
});

test('BUG 6b (fixed): a feeling a moderator removed is never sent to the Mallow provider', async () => {
  const provider = counting(demoProvider());
  const w = world({ provider });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  const { offer } = w.svc.findFeeling(w.T.cloud);
  const { reportId } = w.svc.reportFeeling(w.T.cloud, { holdId: offer.holdId, reason: 'harassment' });
  w.svc.modResolve(w.T.mod, { id: reportId, action: 'remove-feeling' });
  w.advance(31 * MIN);
  try { await w.svc.askMallow(w.T.moon, { journeyId: id }); } catch { /* refusing is the fix */ }
  assert.equal(provider.calls, 0, 'removed content went to the provider');
});

// ---------------------------------------------------------------- 7 --
const aiLike = async ({ mallow }) => ({ status: 'ok', text: 'Maybe the silence is about their week, not about you.', mallow, source: 'ai', model: 'test' });

test('BUG 7a (fixed): after five people answer, the journey shows no Mallow petal in the human count', async () => {
  const w = world({ provider: aiLike });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  await w.svc.askMallow(w.T.moon, { journeyId: id });
  ['cloud', 'star', 'fern', 'dream', 'pebble'].forEach((k, i) => w.give(k, REFRAMES[i]));
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.ok(j.collection.every((x) => x.kind === 'human') && j.collection.length === 5);
  assert.equal(j.mallowPetal, null, 'six petals for a five-slot feeling');
});

test('BUG 7b (fixed): a Mallow perspective the owner reported no longer shows as a petal', async () => {
  const w = world({ provider: aiLike });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * MIN);
  const before = await w.svc.askMallow(w.T.moon, { journeyId: id });
  const out = w.svc.reportPerspective(w.T.moon, { journeyId: id, perspectiveId: before.collection[0].id, reason: 'unkind' });
  assert.equal(out.journey.collection.length, 0);
  assert.equal(out.journey.mallowPetal, null, 'reported Mallow still advertised as "plus a Mallow’s"');
});
