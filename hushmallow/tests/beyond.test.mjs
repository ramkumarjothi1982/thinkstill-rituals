// Another Angle (hushmallow Beyond, W8): the client's vocabulary, the authored
// offline scenes, the server client, consent, and the ten mechanics' contract.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as V from '../src/beyond/vocab.js';
import * as SV from '../server/another-angle/src/vocab.js';
import { THOUGHT_PATTERNS } from '../src/ultra/frameworks.js';
import { authoredScene, sceneParts, exactPhrase, chunkStep, candidatePatterns } from '../src/beyond/authored.js';
import { createAngleClient, resolveEndpoint, makeDeviceId, PATHS } from '../src/beyond/angle-client.js';
import { consentState, setConsent, withdrawConsent, deleteAngleData, hasAngleData, noteFeedback, lessWanted, STORE_KEYS, CONSENT_VERSION, PROVIDER_RETENTION, RETENTION_PLACEHOLDER } from '../src/beyond/consent.js';
import * as LINES from '../src/beyond/lines.js';
import { MECHANIC_MODULES } from '../src/beyond/mechanics/index.js';
import { createStore } from '../src/engine/storage.js';
import { ANGLE_ENDPOINT, ANGLE_ALLOWED_HOSTS } from '../src/app/config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const memStore = () => createStore({ backend: 'memory' });
const words = (s) => (String(s).match(/[\p{L}\p{N}'’]+/gu) || []).length;

const SAMPLES = [
  'My boss embarrassed me in front of everyone.',
  'He hasn’t replied to my message for five hours. He must be annoyed with me.',
  'I failed my exam. I’m useless.',
  'Nobody likes me.',
  'My colleague got promoted instead of me.',
  'I made a mistake at work. Everyone will judge me.',
  'My friend invited everyone except me.',
  'I keep replaying something embarrassing I said.',
  'It was a complete disaster, the whole presentation.',
  'It’s my fault the team missed the deadline.',
  'My manager took the credit for my idea again.',
  'What if I freeze in the interview tomorrow?',
];

// --------------------------------------------------------------- vocab --
test('the client vocabulary is the server’s, exactly (scene-v1)', () => {
  assert.equal(V.SCHEMA_VERSION, SV.SCHEMA_VERSION);
  assert.deepEqual([...V.MALLOW_IDS], [...SV.MALLOWS]);
  assert.deepEqual([...V.PATTERNS], [...SV.PATTERNS]);
  assert.deepEqual({ ...V.PATTERN_INTERACTION }, { ...SV.PATTERN_INTERACTION });
  assert.deepEqual(JSON.parse(JSON.stringify(V.PATTERN_MALLOWS)), JSON.parse(JSON.stringify(SV.PATTERN_MALLOWS)));
  assert.deepEqual({ ...V.PATTERN_TO_AUTHORED }, { ...SV.PATTERN_TO_AUTHORED });
  assert.equal(V.MECHANICS.length, 10);
  assert.equal(new Set(V.MECHANICS).size, 10);
  // the short names in the build notes are accepted
  assert.equal(V.normaliseMechanic('let_loop'), 'let_loop_drift');
  assert.equal(V.normaliseMechanic('soften_harsh'), 'soften_harshness');
  assert.equal(V.normaliseMechanic('fly_away'), null);
});

test('every authored thinking habit plays as one of the ten scenes', () => {
  for (const p of THOUGHT_PATTERNS) assert.ok(V.PATTERNS.includes(V.AUTHORED_TO_PATTERN[p.id]), p.id);
  for (const id of Object.values(V.PATTERN_TO_AUTHORED)) if (id) assert.ok(THOUGHT_PATTERNS.some((p) => p.id === id), id);
});

const GOOD = {
  emotion: 'worry', situation_type: 'relationship', reasoning_pattern: 'fact_vs_assumption',
  known_fact: 'You know he hasn’t replied for five hours.', possible_assumption: 'That he is annoyed with you.',
  alternative_angle: 'He might be busy, or waiting to reply properly.', practical_next_step: 'Give it until this evening before deciding anything.',
  interaction_type: 'pull_apart', mallow_character: 'zuzu',
  subtitle_line_1: 'Five hours without a reply is a fact.', subtitle_line_2: 'What it means is still an unanswered question.', safety_status: 'ok',
};
test('validateScene: only the controlled lists, the fixed pairing, and clean short lines', () => {
  const s = V.validateScene(GOOD);
  assert.equal(s.mechanic, 'pull_apart');
  assert.equal(s.subtitle_line_1, GOOD.subtitle_line_1);
  // a mismatched mechanic is replaced by the pattern's own, never trusted
  assert.equal(V.validateScene({ ...GOOD, interaction_type: 'find_boundary' }).mechanic, 'pull_apart');
  assert.equal(V.validateScene({ ...GOOD, reasoning_pattern: 'self_hypnosis' }), null);
  assert.equal(V.validateScene({ ...GOOD, safety_status: 'maybe' }), null);
  assert.equal(V.validateScene({ ...GOOD, subtitle_line_2: '' }), null);
  assert.equal(V.validateScene({ ...GOOD, subtitle_line_1: 'See https://example.com for more.' }), null);
  assert.equal(V.validateScene({ ...GOOD, subtitle_line_1: 'As an AI, I think this is a fact.' }), null, 'the brand language rule holds on arrival');
  assert.equal(V.validateScene({ ...GOOD, subtitle_line_1: 'x'.repeat(260) }), null);
  assert.equal(V.validateScene({ ...GOOD, mallow_character: 'clippy' }).mallow_character, 'zuzu');
  assert.equal(V.validateScene(null), null);
  assert.equal(V.validateScene([GOOD]), null);
  // a support status needs no lines (support replaces the reframe)
  assert.equal(V.validateScene({ ...GOOD, safety_status: 'crisis', subtitle_line_1: '', subtitle_line_2: '' }).safety_status, 'crisis');
});

test('previous angles: newest four, both lines, pattern + its mechanic', () => {
  const shown = Array.from({ length: 6 }, (_, i) => ({ ...GOOD, reasoning_pattern: V.PATTERNS[i], subtitle_line_1: `Line ${i}.`, subtitle_line_2: 'Two.' }));
  const prev = V.previousAngles(shown);
  assert.equal(prev.length, 4);
  assert.deepEqual(prev.map((p) => p.reasoning_pattern), V.PATTERNS.slice(2, 6));
  for (const p of prev) assert.equal(p.interaction_type, V.PATTERN_INTERACTION[p.reasoning_pattern]);
  for (const p of prev) assert.deepEqual(Object.keys(p).sort(), ['interaction_type', 'reasoning_pattern', 'subtitle_line_1', 'subtitle_line_2']);
});

// --------------------------------------------------- the authored path --
test('authored scenes: valid, short, deterministic, quoting the person exactly', () => {
  for (const text of SAMPLES) {
    const a = authoredScene(text);
    const b = authoredScene(text);
    assert.deepEqual(a, b, `deterministic: ${text}`);
    const v = V.validateScene(a);
    assert.ok(v, `valid: ${text}`);
    assert.equal(a.mechanic, V.PATTERN_INTERACTION[a.reasoning_pattern]);
    for (const l of [a.subtitle_line_1, a.subtitle_line_2]) {
      assert.ok(words(l) >= 3 && words(l) <= 22, `short line (${words(l)} words): ${l}`);
      assert.doesNotMatch(l, /\bAI\b|\{thought\}/);
    }
    // the person's words appear only as exact phrases of what they typed
    for (const f of [a.known_fact, a.possible_assumption]) {
      const q = /“([^”]+)”/.exec(f);
      if (q) assert.ok(text.includes(q[1].replace(/…$/, '')), `exact quote "${q[1]}" from "${text}"`);
    }
    assert.ok(V.PATTERN_MALLOWS[a.reasoning_pattern].includes(a.mallow_character) || a.mallow_character === 'zuzu');
  }
});

test('authored scenes fit the words: fair anger, replaying, mind-reading, self-criticism', () => {
  assert.equal(authoredScene('My manager took the credit for my idea again.').reasoning_pattern, 'valid_anger');
  assert.equal(authoredScene('My boss embarrassed me in front of everyone.').reasoning_pattern, 'valid_anger');
  assert.equal(authoredScene('I keep replaying something embarrassing I said.').reasoning_pattern, 'rumination');
  assert.equal(authoredScene('He hasn’t replied for hours. He must be annoyed with me.').reasoning_pattern, 'mind_reading');
  assert.equal(authoredScene('I failed my exam. I’m useless.').reasoning_pattern, 'self_criticism');
  assert.equal(authoredScene('Nobody likes me.').reasoning_pattern, 'overgeneralisation');
  // a fair-anger step is a boundary, never "say something light"
  assert.match(authoredScene('My boss embarrassed me in front of everyone.').practical_next_step, /limit|boundar|noted|say/i);
  // a self-directed thought is never told it is a guess about someone else's mind
  for (const t of ['I always mess things up.', 'I feel like a fraud at work.']) assert.ok(!candidatePatterns(t).includes('mind_reading'), t);
});

test('"Show me another angle" (offline) always moves to a genuinely different pattern', () => {
  for (const text of SAMPLES) {
    const seen = [], used = [];
    for (let i = 0; i < 4; i++) {
      const s = authoredScene(text, { exclude: seen, usedAngles: used });
      assert.ok(!seen.includes(s.reasoning_pattern), `${text}: ${s.reasoning_pattern} repeated`);
      seen.push(s.reasoning_pattern); used.push(s.angle_id, s.alt_id);
    }
  }
  // a server fallback hint is honoured
  assert.equal(authoredScene('Nobody likes me.', { hint: 'mind_reading' }).reasoning_pattern, 'mind_reading');
});

test('scene parts for the mechanics: exact phrases, a harsh verdict, a step in three pieces', () => {
  assert.equal(exactPhrase('He HASN’T replied  yet!', "hasn't replied yet"), 'HASN’T replied  yet');
  assert.equal(exactPhrase('abc', 'xyz'), '');
  const p = sceneParts('I failed my exam. I’m useless.', { practical_next_step: 'Make a small plan for your weakest area: three short sessions this week.' });
  assert.equal(p.harsh, 'I’m useless');
  assert.equal(p.fact, 'I failed my exam');
  assert.equal(p.steps.length, 3);
  assert.equal(p.steps.join(' ').replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' '), 'Make a small plan for your weakest area three short sessions this week');
  assert.equal(chunkStep('').length, 3);
  for (const s of SAMPLES) assert.ok(sceneParts(s).excerpt.length <= 46, s);
});

// ------------------------------------------------------------- client --
function fakeServer({ angle = null, status = 200, failSessions = 0, delay = 0, expireFirst = false } = {}) {
  const calls = [];
  let sessions = 0, angles = 0;
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, method: init.method, headers: init.headers, body, credentials: init.credentials, redirect: init.redirect });
    if (delay) await new Promise((r, j) => { const t = setTimeout(r, delay); init.signal?.addEventListener('abort', () => { clearTimeout(t); j(new Error('aborted')); }); });
    const res = (code, data) => ({ status: code, json: async () => data });
    if (url.endsWith('/v1/session')) {
      sessions++;
      if (sessions <= failSessions) return res(503, { status: 'error' });
      return res(200, { status: 'ok', token: `tok${sessions}`, expires_at: new Date(Date.now() + 3600e3).toISOString() });
    }
    if (url.endsWith('/v1/angle')) {
      angles++;
      if (expireFirst && angles === 1) return res(401, { status: 'error', error: { code: 'expired' } });
      if (status !== 200) return res(status, { status: 'error' });
      return res(200, typeof angle === 'function' ? angle(body) : angle);
    }
    if (url.endsWith('/v1/feedback')) return res(202, { status: 'ok' });
    return res(404, {});
  };
  return { fetch, calls };
}
const EP = 'https://angle.example.workers.dev';
const OK = { status: 'ok', prompt_version: 'angle-v1', scene: GOOD, keep_support_close: false };

test('client: consent:true, the words, a stable device id; nothing else is ever sent', async () => {
  const store = memStore();
  const srv = fakeServer({ angle: OK });
  const c = createAngleClient({ store, endpoint: EP, fetchImpl: srv.fetch });
  const r = await c.angle({ text: '  My boss embarrassed me.  ', emotion: 'embarrassment', intention: 'calm' });
  assert.equal(r.status, 'ok');
  assert.equal(r.scene.source, 'server');
  assert.equal(r.scene.mechanic, 'pull_apart');
  const [session, angle] = srv.calls;
  assert.equal(session.url, `${EP}/v1/session`);
  assert.match(session.body.device_id, /^[A-Za-z0-9_-]{22}$/);
  assert.deepEqual(Object.keys(session.body).sort(), ['app_version', 'device_id', 'platform']);
  assert.equal(angle.url, `${EP}/v1/angle`);
  assert.equal(angle.headers.authorization, 'Bearer tok1');
  assert.equal(angle.credentials, 'omit');
  assert.equal(angle.redirect, 'error');
  assert.deepEqual(Object.keys(angle.body).sort(), ['consent', 'emotion', 'intention', 'locale', 'request_id', 'text']);
  assert.equal(angle.body.consent, true);
  assert.match(angle.body.request_id, /^[A-Za-z0-9-]{8,64}$/, 'the server’s request_id format');
  // every random id fits it (base64url's "_" would not)
  for (let i = 0; i < 64; i++) {
    const c3 = createAngleClient({ store: memStore(), endpoint: EP, fetchImpl: srv.fetch, random: (n) => new Uint8Array(n).fill(i * 4 + 3) });
    await c3.angle({ text: 'x y z' });
    assert.match(srv.calls.at(-1).body.request_id, /^[A-Za-z0-9-]{8,64}$/);
  }
  assert.equal(angle.body.text, 'My boss embarrassed me.');
  assert.doesNotMatch(JSON.stringify(srv.calls), /photo|image|canvas|data:/i);
  // the same device id next time, from the store
  const c2 = createAngleClient({ store, endpoint: EP, fetchImpl: srv.fetch });
  assert.equal(c2.deviceId(), session.body.device_id);
  for (const call of srv.calls) assert.ok(Object.values(PATHS).some((p) => call.url === EP + p));
});

test('client: 401 → one new session → retry; previous angles for "another angle"', async () => {
  const srv = fakeServer({ angle: OK, expireFirst: true });
  const c = createAngleClient({ store: memStore(), endpoint: EP, fetchImpl: srv.fetch });
  const r = await c.angle({ text: 'Nobody likes me.', previous: [{ ...GOOD }] });
  assert.equal(r.status, 'ok');
  assert.deepEqual(srv.calls.map((x) => x.url.replace(EP, '')), ['/v1/session', '/v1/angle', '/v1/session', '/v1/angle']);
  assert.equal(srv.calls[3].headers.authorization, 'Bearer tok2');
  assert.deepEqual(srv.calls[3].body.previous_angles, [{ subtitle_line_1: GOOD.subtitle_line_1, subtitle_line_2: GOOD.subtitle_line_2, reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart' }]);
});

test('client: statuses mapped; a non-200, a network error, a timeout or a bad scene is never "safe"', async () => {
  const run = async (opts, extra = {}) => createAngleClient({ store: memStore(), endpoint: EP, fetchImpl: fakeServer(opts).fetch, ...extra }).angle({ text: 'I failed my exam.' });
  assert.equal((await run({ angle: { status: 'crisis', support: {} } })).status, 'crisis');
  assert.equal((await run({ angle: { status: 'care', support: {} } })).status, 'care');
  assert.equal((await run({ angle: { status: 'fallback', fallback: { reason: 'unclear' } } })).status, 'unclear');
  const fb = await run({ angle: { status: 'fallback', fallback: { reason: 'timeout', hint: { reasoning_pattern: 'self_criticism' } } } });
  assert.deepEqual([fb.status, fb.reason, fb.hint.reasoning_pattern], ['fallback', 'timeout', 'self_criticism']);
  assert.equal((await run({ angle: { status: 'ok', scene: { ...GOOD, safety_status: 'crisis' } } })).status, 'crisis', 'the scene’s own safety judgement wins');
  assert.equal((await run({ angle: { status: 'ok', scene: { ...GOOD, reasoning_pattern: 'nope' } } })).status, 'error');
  assert.equal((await run({ status: 500 })).status, 'error');
  assert.equal((await run({ status: 429 })).reason, 'limit');
  assert.equal((await run({ failSessions: 5 })).status, 'error');
  const boom = await createAngleClient({ store: memStore(), endpoint: EP, fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }).angle({ text: 'x y' });
  assert.deepEqual([boom.status, boom.reason], ['error', 'network']);
  const slow = await run({ angle: OK, delay: 400 }, { timeouts: { session: 1000, angle: 60, feedback: 50 } });
  assert.deepEqual([slow.status, slow.reason], ['error', 'timeout']);
  assert.equal((await run({ angle: { status: 'ok', scene: GOOD, keep_support_close: true } })).keepSupportClose, true);
});

test('client: feedback sends one button and the kind of scene, never words; only for server scenes', async () => {
  const srv = fakeServer({ angle: OK });
  const c = createAngleClient({ store: memStore(), endpoint: EP, fetchImpl: srv.fetch });
  const r = await c.angle({ text: 'My boss embarrassed me.' });
  assert.equal(await c.feedback('helped', r.scene), true);
  const fb = srv.calls.at(-1);
  assert.equal(fb.url, `${EP}/v1/feedback`);
  assert.deepEqual(fb.body, { rating: 'helped', reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart', mallow_character: 'zuzu', prompt_version: 'angle-v1' });
  assert.equal(await c.feedback('helped', { ...r.scene, source: 'authored' }), false);
  assert.equal(await c.feedback('loved_it', r.scene), false);
});

test('client: never logs the person’s words', async () => {
  const secret = 'my very private sentence about Zebedee';
  const logged = [];
  const orig = { log: console.log, info: console.info, warn: console.warn, error: console.error, debug: console.debug };
  for (const k of Object.keys(orig)) console[k] = (...a) => logged.push(a.map(String).join(' '));
  try {
    for (const opts of [{ angle: OK }, { status: 500 }, { angle: { status: 'ok', scene: { bad: 1 } } }]) {
      await createAngleClient({ store: memStore(), endpoint: EP, fetchImpl: fakeServer(opts).fetch }).angle({ text: secret });
    }
    await createAngleClient({ store: memStore(), endpoint: EP, fetchImpl: async () => { throw new Error('down'); } }).angle({ text: secret });
  } finally { Object.assign(console, orig); }
  assert.ok(!logged.some((l) => l.includes('Zebedee')));
  assert.ok(!read('src/beyond/angle-client.js').match(/console\.\w+\([^)]*\btext\b/));
});

test('endpoint: empty by default (authored only); https on an allowed host; dev override only on localhost', () => {
  assert.equal(typeof ANGLE_ENDPOINT, 'string');
  assert.ok(Array.isArray(ANGLE_ALLOWED_HOSTS));
  assert.equal(resolveEndpoint({ configured: '', loc: { hostname: 'example.github.io', search: '' } }), null);
  assert.equal(resolveEndpoint({ configured: 'http://a.workers.dev', allowedHosts: ['a.workers.dev'], loc: null }), null);
  assert.equal(resolveEndpoint({ configured: 'https://a.workers.dev', allowedHosts: [], loc: null }), null);
  assert.equal(resolveEndpoint({ configured: 'https://a.workers.dev/', allowedHosts: ['a.workers.dev'], loc: null }), 'https://a.workers.dev');
  assert.equal(resolveEndpoint({ configured: 'https://u:p@a.workers.dev', allowedHosts: ['a.workers.dev'], loc: null }), null);
  assert.equal(resolveEndpoint({ configured: '', loc: { hostname: 'localhost', protocol: 'http:', search: '?angleDev=8791' } }), 'http://localhost:8791');
  assert.equal(resolveEndpoint({ configured: '', loc: { hostname: 'ramkumarjothi1982.github.io', protocol: 'https:', search: '?angleDev=8791' } }), null, 'no override on a real host');
  assert.equal(resolveEndpoint({ configured: '', loc: { hostname: 'localhost', protocol: 'http:', search: '?angleDev=evil.com' } }), null);
  assert.equal(createAngleClient({ store: memStore(), endpoint: null }).available, false);
  assert.match(makeDeviceId(() => new Uint8Array(16).fill(255)), /^[A-Za-z0-9_-]{22}$/);
});

test('switching the server on needs the plans copy changed in the same change', () => {
  // the plans screen says the words stay on the phone; that is only true while ANGLE_ENDPOINT is empty
  if (ANGLE_ENDPOINT) assert.doesNotMatch(read('src/app/scenes/plans.js'), /what you type stays here/);
  else assert.ok(true);
});

// ------------------------------------------------------------ consent --
test('consent: asked once per notice version, withdrawable, and deletable', () => {
  const store = memStore();
  assert.equal(consentState(store), 'unasked');
  setConsent(store, 'yes');
  assert.equal(consentState(store), 'yes');
  store.set(STORE_KEYS.session, { token: 't' });
  withdrawConsent(store);
  assert.equal(consentState(store), 'no');
  assert.equal(store.get(STORE_KEYS.session, null), null, 'withdrawing drops the session');
  store.set(STORE_KEYS.consent, { v: CONSENT_VERSION - 1, choice: 'yes' });
  assert.equal(consentState(store), 'unasked', 'a newer notice asks again');
  store.set(STORE_KEYS.device, 'abcdefghijklmnopqrstuv');
  noteFeedback(store, 'mind_reading', 'not_relevant');
  noteFeedback(store, 'mind_reading', 'not_relevant');
  noteFeedback(store, 'mind_reading', 'not_relevant');
  assert.deepEqual(lessWanted(store), ['mind_reading']);
  assert.equal(hasAngleData(store), true);
  deleteAngleData(store);
  for (const k of Object.values(STORE_KEYS)) assert.equal(store.get(k, null), null, k);
  assert.equal(hasAngleData(store), false);
});

test('the consent notice says it plainly (the one place automated processing is described)', () => {
  const src = read('src/beyond/consent.js');
  for (const must of [/secure server/, /AI language model/, /Anthropic/, /Never your photos/, /stores nothing you write on its server/, /doesn’t log your words/, /isn’t therapy or crisis support/, /'Accept'/, /'Not now'/, /Support lines/]) assert.match(src, must);
  // the provider's retention is a marked placeholder until the owner confirms it
  assert.equal(PROVIDER_RETENTION, '');
  assert.match(RETENTION_PLACEHOLDER, /^\[Owner to confirm before launch:/);
  // nowhere else in Another Angle does the experience name the technology
  const mechFiles = readdirSync(`${root}src/beyond/mechanics`).map((n) => `mechanics/${n}`);
  for (const f of ['another-angle.js', 'lines.js', 'authored.js', 'angle-client.js', 'styles.js', 'vocab.js', ...mechFiles]) {
    const strings = read(`src/beyond/${f}`).match(/'[^'\n]*'|`[^`]*`/g) || [];
    for (const s of strings) assert.doesNotMatch(s, /\bAI\b|language model|chatbot/i, `${f}: ${s.slice(0, 60)}`);
  }
});

test('Settings has the withdraw switch and "Delete my Another Angle data"', () => {
  const src = read('src/beyond/consent.js');
  assert.match(src, /Share my words with Another Angle/);
  assert.match(src, /Delete my Another Angle data/);
  assert.match(read('src/app/scenes/settings.js'), /beyond\/consent\.js/);
});

// --------------------------------------------------------------- lines --
test('authored lines: one short sentence each, British spelling, the brand’s own words', () => {
  const all = [];
  const walk = (v) => { if (typeof v === 'string') all.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  for (const [k, v] of Object.entries(LINES)) if (k !== 'pick') walk(v);
  assert.ok(all.length > 80);
  for (const l of all) {
    assert.ok(words(l) <= 24, `short: ${l}`);
    assert.doesNotMatch(l, /\bAI\b|\bcolor|realiz|apologiz|favorite|behavior|center\b|analyz|organiz|cure|fix you|guarantee/i, l);
  }
  for (const k of ['Show me another angle', 'Keep this discovery', 'That helped', 'Not relevant', 'I’d rather just squeeze a Mallow']) assert.ok(all.includes(k), k);
  assert.deepEqual(LINES.WAITING.slice(0, 3), ['There’s another side to this…', 'Let’s look a little closer.', 'What else could be true?']);
  assert.ok(LINES.WAITING_LONG.includes('Zuzu is exploring another angle.'));
  assert.deepEqual(LINES.EXPLORE.map((e) => e.label), ['What do you actually know?', 'Could there be another explanation?', 'What would you tell a friend?', 'Is there one useful action?']);
  for (const m of V.MECHANICS) for (const k of ['hint', 'assist', 'done']) assert.ok(LINES.MECHANIC_LINES[m]?.[k], `${m}.${k}`);
  for (const p of V.PATTERNS) { assert.equal(LINES.AUTHORED_PAIRS[p].length, 2, p); assert.ok(LINES.FRIEND_LINES[p], p); }
});

// ---------------------------------------------------------- mechanics --
// A 2D context that accepts every call (no canvas in Node), and tags without DOM.
function fakeCtx2d() {
  const grad = { addColorStop() {} };
  return new Proxy({}, { get: (t, k) => (k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => grad : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
}
globalThis.OffscreenCanvas ??= class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return fakeCtx2d(); } };
function fakeTags() {
  const list = new Set();
  return {
    add(text) { const t = { text, w: 90, h: 30, el: { style: { setProperty() {} } }, at() { return t; }, rect: () => null, set(x) { t.text = x; return t; }, hide() { return t; }, remove() { list.delete(t); } }; list.add(t); return t; },
    rects: () => [], clear() { list.clear(); }, get size() { return list.size; },
  };
}
function mountCtx(id, { rm = false } = {}) {
  const text = 'I failed my exam. I’m useless, and everyone will think so.';
  const scene = authoredScene(text);
  const choices = [];
  return {
    g: fakeCtx2d(), area: () => ({ x: 16, y: 170, w: 358, h: 400 }), from: { x: 195, y: 360, r: 36 },
    scene: { ...scene, mechanic: id }, parts: sceneParts(text, scene), text, emotion: 'shame', tags: fakeTags(),
    reducedMotion: () => rm, lowStim: () => false, hint() {}, choose: async (p, opts) => { choices.push(opts); return opts[1].value; },
    haptic() {}, fx() {}, progress() {}, kick() {}, choices,
  };
}
const settle = async (m, dt, secs) => { for (let t = 0; t < secs; t += dt) { m.frame(dt, t); await new Promise((r) => setImmediate(r)); } };

test('ten mechanic modules, one per interaction_type, each with the shared contract', async () => {
  assert.deepEqual(Object.keys(MECHANIC_MODULES).sort(), [...V.MECHANICS].sort());
  for (const id of V.MECHANICS) {
    const mod = await MECHANIC_MODULES[id]();
    assert.equal(mod.id, id);
    assert.equal(typeof mod.mount, 'function');
    const m = mod.mount(mountCtx(id));
    for (const k of ['frame', 'pointer', 'hitTest', 'assist', 'avoid', 'destroy']) assert.equal(typeof m[k], 'function', `${id}.${k}`);
    assert.ok(m.done instanceof Promise, `${id}.done`);
    m.destroy();
  }
  // every file is its own gameplay (no shared "card" scene)
  const sizes = V.MECHANICS.map((id) => read(`src/beyond/mechanics/${MECHANIC_MODULES[id].toString().match(/\.\/([\w-]+\.js)/)[1]}`).length);
  assert.ok(sizes.every((n) => n > 3500), 'each mechanic is substantial');
});

for (const rm of [false, true]) {
  test(`mechanics never complete by themselves, and the tap alternative completes each one${rm ? ' (reduced motion)' : ''}`, async () => {
    for (const id of V.MECHANICS) {
      const mod = await MECHANIC_MODULES[id]();
      const ctx = mountCtx(id, { rm });
      const m = mod.mount(ctx);
      let done = false;
      m.done.then(() => { done = true; });
      await settle(m, 1 / 30, 12);   // twelve seconds of nothing
      assert.equal(done, false, `${id} completed without any touch`);
      for (let i = 0; i < 14 && !done; i++) { m.assist(); await settle(m, 1 / 30, 1.6); }
      await settle(m, 1 / 30, 2.5);
      assert.equal(done, true, `${id} completes through assist()`);
      assert.equal(m.settled, true, `${id} settled`);
      if (id === 'find_boundary') assert.equal(ctx.choices.length, 1, 'the boundary asks what it needs (no "forgive")');
      if (id === 'find_boundary') assert.ok(!ctx.choices[0].some((o) => /forgiv/i.test(o.label)));
      m.destroy();
    }
  });
}

test('mechanics answer real touch: a pointer sequence on each one is handled without errors', async () => {
  for (const id of V.MECHANICS) {
    const mod = await MECHANIC_MODULES[id]();
    const m = mod.mount(mountCtx(id));
    await settle(m, 1 / 30, 1.5);
    const t0 = 1000;
    for (const [x, y] of [[195, 360], [100, 300], [280, 420], [195, 250]]) {
      m.pointer({ type: 'down', id: 1, x, y, t: t0 });
      for (let i = 1; i <= 8; i++) m.pointer({ type: 'move', id: 1, x: x + i * 6, y: y + i * 3, t: t0 + i * 30 });
      m.pointer({ type: 'up', id: 1, x: x + 48, y: y + 24, t: t0 + 300 });
      await settle(m, 1 / 30, 0.3);
    }
    m.destroy();
  }
});

test('the beyond module is gated like src/ultra (only through loadUltra)', () => {
  assert.match(read('src/app/entitlements.js'), /import\('\.\.\/beyond\/another-angle\.js'\)/);
  assert.match(read('src/app/scenes/angle.js'), /loadUltra\(app\.ent\)/);
  // nothing outside src/beyond (and the settings privacy rows) imports it
  const offenders = [];
  const walk = (d) => { for (const n of readdirSync(root + d)) { const p = `${d}/${n}`; if (statSync(root + p).isDirectory()) walk(p); else if (p.endsWith('.js') && !p.startsWith('src/beyond/')) { const s = read(p); if (/['"]\.\.?\/(?:\.\.\/)*beyond\/(?!consent\.js|endpoint\.js)/.test(s) && !/src\/app\/entitlements\.js$/.test(p)) offenders.push(p); } } };
  walk('src');
  assert.deepEqual(offenders, []);
  assert.ok(existsSync(`${root}src/beyond/angle-client.js`));
});
