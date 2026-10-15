// Regression tests for the developer-content audit: things a customer could
// have seen that were meant for developers, or that were simply untrue.

import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './relay-helpers.mjs';
import { RelayService } from '../core/relay.js';
import { LocalNetwork } from '../net/local-network.js';
import { screenFeeling, screenReframe } from '../core/feeling-safety.js';
import { libraryProvider } from '../core/perspectives.js';
import { humane, GENTLE } from '../ui/dom.js';

test('audit: a long feeling with “…” is not refused as “contact details”', () => {
  const feeling = 'so tired… '.repeat(48).trim();
  assert.ok(feeling.length <= 500);
  const r = screenFeeling(feeling, { maxChars: 500 });
  assert.equal(r.ok, true, `refused: ${r.message}`);
  const persp = 'Maybe… it could be that they’re tired too… '.repeat(6).trim().slice(0, 270);
  const p = screenReframe(persp, { maxChars: 280 });
  assert.ok(p.ok || !/contact details/.test(p.message), `a perspective with “…” was called contact details: ${p.message}`);
});

test('audit: with no Mallow provider, a Mallow perspective is never offered (no promise that can’t be kept)', () => {
  const w = world({ provider: null });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  w.advance(31 * 60e3);
  const j = w.svc.getJourney(w.T.moon, { journeyId: id });
  assert.equal(j.fallback.status, 'off');
  assert.ok(!j.events.some((e) => e.type === 'mallow-offer'), 'the dock and a notice still announced a Mallow perspective');
  w.advance(24 * 3600e3);
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).canExplore, false);
});

test('audit: a fixed testing example kept in old state never reaches a customer service’s views', async () => {
  const lab = world({ provider: async ({ mallow }) => ({ status: 'ok', text: 'A fixed line for testing.', mallow, source: 'demo' }) });
  const id = lab.release('moon', { allowFallback: true }).journey.id;
  lab.advance(31 * 60e3);
  const before = await lab.svc.askMallow(lab.T.moon, { journeyId: id });
  assert.ok(before.collection.some((p) => p.source === 'demo'), 'setup: the lab shows its testing example');
  // the same state, served by a customer service: the test identity is nobody there
  const live = new RelayService({ state: lab.svc.toJSON(), now: () => lab.clock.t, provider: libraryProvider() });
  assert.throws(() => live.getJourney(lab.T.moon, { journeyId: id }), (e) => e.code === 'not-signed-in');
  assert.equal(live.cannedExamples, false);
  assert.equal(new RelayService({ cannedExamples: true }).cannedExamples, false, 'testing examples allowed without test mode');
  // and where examples are off, one kept in state is never shown or exported
  const quiet = new RelayService({ state: lab.svc.toJSON(), now: () => lab.clock.t, provider: libraryProvider(), testMode: true });
  const after = quiet.getJourney(lab.T.moon, { journeyId: id });
  assert.ok(!JSON.stringify(after).includes('Example for testing'), 'the testing label reached a view');
  assert.ok(!after.collection.some((p) => p.kind === 'mallow'));
  assert.ok(!JSON.stringify(quiet.exportMyData(lab.T.moon)).includes('A fixed line for testing.'), 'the testing example is in the file');
});

test('audit: an author whose account is paused sees no countdown that never ends', () => {
  const w = world({ provider: libraryProvider() });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  const acc = Object.values(w.svc.s.accounts).find((a) => a.key === 'moon');
  acc.state = 'restricted';
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).fallback.status, 'off');
});

test('audit: only words written for people reach the screen; programming errors become one gentle line', async () => {
  assert.equal(humane(new TypeError('Cannot read properties of null (reading \'profile\')')), GENTLE);
  assert.equal(humane(new SyntaxError('Unexpected token < in JSON at position 0')), GENTLE);
  assert.equal(humane({ code: 'error', message: 'ECONNREFUSED 127.0.0.1:5432' }), GENTLE);
  assert.equal(humane({ code: 'network' }), 'You’re offline. Nothing was sent; try again when you’re back.');
  // through the simulated network, a service refusal keeps its words and a crash doesn't
  const w = world();
  w.svc.boom = () => { throw new TypeError('x.y is not a function'); };
  const net = new LocalNetwork(w.svc, { latency: [0, 0], methods: [...w.svc.clientMethods, 'boom'] });
  const link = net.link('moon');
  const refusal = await link.request('submitFeeling', w.T.moon, { text: 'A feeling to share', clientId: 'audit-000001' }).catch((e) => e);
  assert.equal(humane(refusal), 'Please confirm you’re happy to share this without your name first.');
  const crash = await link.request('boom', w.T.moon, {}).catch((e) => e);
  assert.equal(humane(crash), GENTLE, 'a programming error’s text reached the screen');
  const notAllowed = await link.request('signInTestAccount', w.T.moon, { key: 'cloud' }).catch((e) => e);
  assert.equal(notAllowed.code, 'forbidden');
  assert.ok(!/allowed|request/i.test(humane(notAllowed)), humane(notAllowed));
});

test('audit: service refusals are written for people, never codes or technical words', () => {
  const w = world();
  const words = [];
  for (const fn of [
    () => w.svc.submitFeeling(w.T.moon, { text: 'hello there', consent: true, clientId: 'x' }),
    () => w.svc.getJourney(w.T.moon, { journeyId: 'nope' }),
    () => w.svc.modListReports(w.T.moon),
    () => w.svc.choosePerspective(w.T.moon, { journeyId: 'nope' }),
  ]) { try { fn(); } catch (e) { words.push(e.message); } }
  assert.equal(words.length, 4);
  for (const m of words) assert.ok(!/request|invalid|forbidden|not-found|error|null|undefined/i.test(m), m);
});
