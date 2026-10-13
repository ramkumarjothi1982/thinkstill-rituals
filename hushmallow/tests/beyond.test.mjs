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
import { authoredScene, sceneParts, exactPhrase, chunkStep, candidatePatterns, sameWords, secondPerson, FACT_ASK, GUESS_ASK } from '../src/beyond/authored.js';
import { createAngleClient, resolveEndpoint, makeDeviceId, PATHS } from '../src/beyond/angle-client.js';
import { consentState, setConsent, withdrawConsent, deleteAngleData, hasAngleData, noteFeedback, lessWanted, STORE_KEYS, CONSENT_VERSION, PROVIDER_RETENTION, RETENTION_PLACEHOLDER,
  PROVIDER_SAFETY_HOLD, PROVIDER_USE, PROVIDER_DELETE, saveTesterCode } from '../src/beyond/consent.js';
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

test('"Show me another angle" (offline) always moves to a genuinely different pattern, or says there are no more', () => {
  for (const text of SAMPLES) {
    const seen = [], used = [];
    for (let i = 0; i < 4; i++) {
      const s = authoredScene(text, { exclude: seen, usedAngles: used });
      // only scenes that fit the words: when they run out the scene says so (the experience: "That's every angle…")
      if (s.exhausted) { assert.ok(i >= 2, `${text}: at least two angles before running out (${seen.join(', ')})`); break; }
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
  // the person's words are shown whole on their tag (it wraps); only very long words are shortened, at a word
  for (const s of SAMPLES) { const e = sceneParts(s).excerpt; assert.ok(e.length <= 72, s); if (s.length <= 72) assert.equal(e, s.replace(/\s+/g, ' ').trim(), s); }
});

// fact versus assumption: the two sides never say the same thing (review r2, blocking 2)
const PARTS_TEXTS = [...SAMPLES, 'She has read my message and still not replied.', 'My sister must think I’m selfish.', 'If the presentation goes badly I’m going to get fired.',
  'The party went badly and it’s my fault.', 'Nobody ever asks me to join in.', '😞😞', 'ok', 'Everything is fine but I feel awful.'];
test('scene parts: the fact and the assumption are never the same words; an empty side asks a question', () => {
  for (const t of PARTS_TEXTS) {
    const p = sceneParts(t, authoredScene(t));
    assert.ok(p.fact && p.guess, `both sides say something: ${t}`);
    assert.ok(!sameWords(p.fact, p.guess), `fact ≠ guess for "${t}": ${p.fact} / ${p.guess}`);
    if (p.factAsk) assert.equal(p.fact, FACT_ASK);
    if (p.guessAsk) assert.equal(p.guess, GUESS_ASK);
    assert.equal(p.alternatives.length, 3, t);
    assert.equal(new Set(p.alternatives).size, 3, `three different possibilities: ${t}`);
  }
  // the brief's own examples, offline
  const boss = sceneParts('My boss embarrassed me in front of everyone.');
  assert.ok(!sameWords(boss.fact, boss.guess));
  const nobody = sceneParts('Nobody likes me.');
  assert.equal(nobody.factAsk, true, 'an interpretation is never shown as the fact');
  assert.equal(nobody.guess, 'Nobody likes me');
  const read = sceneParts('She has read my message and still not replied.');
  assert.equal(read.fact, 'She has read my message and still not replied');
  assert.equal(read.guess, GUESS_ASK, 'no assumption in the words: the guess side asks, it never copies the fact');
  // the authored explore lines never quote the same words twice either
  const a = authoredScene('Nobody likes me.');
  assert.ok(!(a.known_fact.includes('Nobody likes me') && a.possible_assumption.includes('Nobody likes me')), a.known_fact);
});

// the brief's own seven examples, offline, through four "Show me another angle" steps (review r3, blocking 2)
const BRIEF_INPUTS = ['My boss embarrassed me in front of everyone.', 'My partner hasn’t replied for hours.', 'I failed my exam. I’m useless.', 'Nobody likes me.',
  'My colleague got promoted instead of me.', 'I made a mistake at work. Everyone will judge me.', 'My friend invited everyone except me.',
  'My friend must think I am boring company.', 'He hasn’t replied to my message for five hours.'];
const OTHER_PERSON = /^(?:they|he|she|someone|somebody|people|anyone|anybody|your \w+|the other)\b/i;
const outsideQuotes = (l) => String(l).replace(/“[^”]*”|"[^"]*"/g, '');
test('authored path: four angles for the brief’s examples, never cut, never nonsense', () => {
  for (const text of BRIEF_INPUTS) {
    const seen = [], used = [];
    for (let i = 0; i < 4; i++) {
      const s = authoredScene(text, { exclude: seen, usedAngles: used });
      if (s.exhausted) { assert.ok(i >= 2, `${text}: at least two angles (${seen.join(', ')})`); break; }
      const p = sceneParts(text, s);
      const lines = [s.subtitle_line_1, s.subtitle_line_2, s.known_fact, s.possible_assumption, s.alternative_angle, s.practical_next_step];
      const shown = [...lines, p.fact, p.guess, ...p.alternatives, ...p.steps, p.harsh, p.weight, p.excerpt].filter(Boolean);
      for (const l of shown) assert.doesNotMatch(l, /…|\.\.\./, `${text} [${s.reasoning_pattern}]: nothing is cut: ${l}`);
      // a "one word" frame quotes the label itself, never a whole sentence
      for (const l of lines) {
        if (/one word/.test(l)) { const q = /“([^”]+)”/.exec(l); assert.ok(!q || words(q[1]) <= 3, `${text}: "${q?.[1]}" in ${l}`); }
        // always / never lines only when those words (or their own strong word) are theirs
        for (const w of ['always', 'never']) if (new RegExp(`“${w}”`).test(l)) assert.match(text, new RegExp(`\\b${w}\\b`, 'i'), `${text}: ${l}`);
        const quotedWord = /A word like “([^”]+)”/.exec(l);
        if (quotedWord) assert.match(text, new RegExp(`\\b${quotedWord[1]}\\b`, 'i'), `${text}: ${l}`);
      }
      // Zuzu's voice: the step talks to "you" (a line to say, in quotes, may be first person)
      assert.doesNotMatch(outsideQuotes(s.practical_next_step), /\b(?:I|I’m|I'm|my|me|myself)\b/, `${text}: ${s.practical_next_step}`);
      // mind reading opens readings of the other person, never facts about thoughts
      if (s.reasoning_pattern === 'mind_reading') for (const a of p.alternatives) assert.match(a, OTHER_PERSON, `${text}: ${a}`);
      for (const a of p.alternatives) assert.ok(a.length <= 72 || s.source === 'server', `a possibility fits as written: ${a}`);
      seen.push(s.reasoning_pattern); used.push(s.angle_id, s.alt_id);
    }
    assert.ok(seen.length >= 2, `${text}: ${seen.join(', ')}`);
  }
  // overgeneralisation only when "always", "never", "nobody", "everyone"… is really the claim
  for (const t of ['My boss embarrassed me in front of everyone.', 'My friend invited everyone except me.']) {
    const seen = [];
    for (let i = 0; i < 6; i++) { const s = authoredScene(t, { exclude: seen }); if (s.exhausted) break; seen.push(s.reasoning_pattern); }
    assert.ok(!seen.includes('overgeneralisation'), `${t}: ${seen.join(', ')}`);
  }
  assert.equal(authoredScene('Nobody likes me.').subtitle_line_1, 'A word like “nobody” is powerful, but it’s rarely exactly true.');
  // "another angle" for mind-reading words: the label, not the sentence
  const second = authoredScene('My friend must think I am boring company.', { exclude: ['mind_reading'] });
  assert.equal(second.subtitle_line_1, '“I am boring” squashes a whole person into one word.');
});

test('steps: second person in Zuzu’s voice, and cut at a sentence end before anything else', () => {
  assert.equal(secondPerson('Check the facts: did my message ask something, or was there nothing that obviously needed a reply?'), 'Check the facts: did your message ask something, or was there nothing that obviously needed a reply?');
  assert.equal(secondPerson('Check the scale: was it a big group thing, or a smaller plan I wouldn’t usually be part of?'), 'Check the scale: was it a big group thing, or a smaller plan you wouldn’t usually be part of?');
  assert.equal(secondPerson('It’s okay to say: “I’m happy to talk, but not if we’re shouting.”'), 'It’s okay to say: “I’m happy to talk, but not if we’re shouting.”');
  assert.deepEqual(chunkStep('Give it a night. Cringe tends to fade by morning.'), ['Give it a night', 'Cringe tends to fade', 'by morning']);
  for (const st of ['Write the prediction down with a 0–100 confidence score. Check it afterwards.', 'Give it a night. Cringe tends to fade by morning.']) {
    const pieces = chunkStep(st);
    assert.ok(pieces.some((x, i) => i > 0 && /^[A-Z]/.test(x) && st.includes(`. ${x}`)), `${st}: a piece starts at the second sentence (${pieces.join(' | ')})`);
  }
});

const SERVER_BOSS = { ...V.validateScene({
  emotion: 'embarrassment', situation_type: 'work', reasoning_pattern: 'fact_vs_assumption',
  known_fact: 'Your boss said something that embarrassed you in front of the team.', possible_assumption: 'That everyone now thinks less of you.',
  alternative_angle: 'People in the room may remember the moment far less than you do.', practical_next_step: 'Decide whether to raise it with your boss privately this week.',
  interaction_type: 'pull_apart', mallow_character: 'zuzu', subtitle_line_1: 'What your boss did may have been unfair.', subtitle_line_2: 'What matters now is whether to raise it privately.', safety_status: 'ok',
}), source: 'server' };
test('a server scene personalises the mechanics (known_fact, possible_assumption, alternative_angle, the step)', async () => {
  const text = 'My boss embarrassed me in front of everyone.';
  const p = sceneParts(text, SERVER_BOSS);
  assert.equal(p.fact, SERVER_BOSS.known_fact);
  assert.equal(p.guess, SERVER_BOSS.possible_assumption);
  assert.equal(p.alternatives[0], SERVER_BOSS.alternative_angle);
  assert.deepEqual(p.steps.join(' ').split(/\s+/).length, SERVER_BOSS.practical_next_step.replace(/[.]$/, '').split(/\s+/).length);
  // the server's assumption reaches the pull-apart cards, and its other explanation the open buds
  for (const [id, want] of [['pull_apart', [SERVER_BOSS.known_fact, SERVER_BOSS.possible_assumption]], ['open_interpretations', [SERVER_BOSS.alternative_angle, SERVER_BOSS.possible_assumption]]]) {
    const mod = await MECHANIC_MODULES[id]();
    const ctx = { ...mountCtx(id), text, scene: { ...SERVER_BOSS, mechanic: id }, parts: p };
    const m = mod.mount(ctx);
    for (const w of want) assert.ok(ctx.tags.texts().includes(w), `${id} shows "${w}" (has: ${ctx.tags.texts().join(' / ')})`);
    m.destroy();
  }
  // a server scene with no assumption (or one that only repeats the fact) still never shows the fact twice
  const thin = sceneParts('He hasn’t replied for five hours.', { ...SERVER_BOSS, known_fact: 'He hasn’t replied for five hours.', possible_assumption: 'He hasn’t replied for five hours.' });
  assert.ok(!sameWords(thin.fact, thin.guess), `${thin.fact} / ${thin.guess}`);
  // the heaviest weight carries the blame as they put it
  assert.equal(sceneParts('The party went badly and it’s my fault.').weight, 'it’s my fault');
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
  for (const must of [/secure server/, /AI language model/, /Anthropic/, /Never your photos/, /stores nothing you write/, /doesn’t log your words/, /Not therapy or crisis support/, /'Accept'/, /'Not now'/, /Support lines/]) assert.match(src, must);
  // everything the client sends is told (review r3, blocking 3): the words and feeling, the kind of help
  // (intention), the lines already seen, the feedback buttons (never words), and the session's code + app version
  for (const must of [/the feeling and the kind of help you pick/, /\(for another angle\) the lines you’ve seen/, /Each angle request also carries the app’s language and a one-off random code, and every request carries this phone’s session code\./, /A feedback tap sends which button, which Mallow and what kind of angle it was \(and its version\), never your words/, /a random code for this phone, its version and device type/, /any invite code/, /Never your name or account/]) assert.match(src, must);
  const client = read('src/beyond/angle-client.js');
  for (const field of ['device_id', 'platform', 'app_version', 'invite', 'intention', 'previous_angles', 'rating', 'reasoning_pattern', 'interaction_type', 'mallow_character', 'prompt_version']) assert.match(client, new RegExp(field), `the client sends ${field} (and the notice says so)`);
  // on the card, "Not therapy" and the support link sit by the buttons (always in view), and a cue says when there is more to read
  const card = src.slice(src.indexOf('export function openConsent'), src.indexOf('export function openConsentSheet'));
  assert.match(card, /notTherapy\(app, 'p', support\),\s*h\('div', \{ class: 'bx-actions' \}/);
  assert.match(card, /'More below'/);
  // the Settings sheet carries the same notice, "Not therapy" included
  assert.match(src, /noticeBody\(app, \{ compact: true, therapy: true \}\)/);
  // the provider's retention: the owner's approved text once the server is on (before that, a marked placeholder)
  assert.match(RETENTION_PLACEHOLDER, /^\[Owner to confirm before launch:/);
  if (ANGLE_ENDPOINT) {
    assert.ok(PROVIDER_RETENTION.length > 0, 'the retention line is filled in when the server is on');
    assert.notEqual(PROVIDER_RETENTION, RETENTION_PLACEHOLDER);
    assert.doesNotMatch(PROVIDER_RETENTION, /Owner to confirm|\[|\]/);
  }
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
    add(text, o = {}) { const t = { text, title: o.title, w: 90, h: 30, el: { style: { setProperty() {} } }, at() { return t; }, own() { return t; }, rect: () => null, set(x) { t.text = x; return t; }, title_(x) { t.title = x; return t; }, hide() { return t; }, remove() { list.delete(t); } }; list.add(t); return t; },
    rects: () => [], clear() { list.clear(); }, get size() { return list.size; }, texts: () => [...list].map((t) => t.text),
    layout() {}, remeasure() {},
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

// ------------------------------------------------------------- safety --
test('safety seen while typing counts, sent or not (review r2, blocking 1)', () => {
  const src = read('src/beyond/another-angle.js');
  // the overlay reports the level the moment it is seen, and its close reports the worst seen
  assert.match(src, /onSafety:\s*\(r\)\s*=>\s*noteSafety\(r\)/);
  assert.match(src, /onClose:\s*\(reason, meta = \{\}\)\s*=>[\s\S]{0,400}noteSafety\(meta\.safety\)/);
  // closed without sending: crisis and care do what sending them would have done (and nothing is sent)
  assert.match(src, /if \(reason !== 'submit'\) \{[\s\S]{0,240}S\.level === 'crisis'\) crisisMode[\s\S]{0,80}S\.level === 'care'\) careMode/);
  // the visit's level decides before any request (reworded before Send still means no angle)
  assert.match(src, /noteSafety\(seen\);\s*noteSafety\(checkText\(S\.text\)\);\s*if \(S\.level === 'crisis'\) \{ crisisMode\(\); return; \}\s*if \(S\.level === 'care'\) \{ careMode\(\); return; \}/);
  // after something heavy: no playful squeeze lines, and the Support pill stays
  assert.match(src, /S\.level !== 'none' \|\| S\.crisis \|\| S\.care\) return;/);
  assert.match(src, /supportPill\.hidden = !\(S\.keepSupport \|\| S\.care \|\| S\.crisis\)/);
  // the safety lines themselves are calm (no jokes, no "another look")
  for (const l of [...LINES.SAFETY.crisis, ...LINES.SAFETY.care, ...LINES.SAFETY.finish]) assert.doesNotMatch(l, /squish|squeez|another look|angle\b.*fun/i, l);
});

// ------------------------------------------------------------- layout --
test('labels: the collision pass keeps visible labels off each other and off what they must avoid', async () => {
  const { overlapArea } = await import('../src/beyond/mechanics/kit.js');
  assert.equal(overlapArea({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 5, top: 5, right: 15, bottom: 15 }), 25);
  assert.equal(overlapArea({ left: 0, top: 0, right: 10, bottom: 10 }, { left: 10, top: 0, right: 20, bottom: 10 }), 0);
  // every mechanic names its bodies (the pass keeps labels off them) and every gradient is made once, not per frame
  for (const id of V.MECHANICS) {
    const mod = await MECHANIC_MODULES[id]();
    const m = mod.mount(mountCtx(id));
    assert.equal(typeof m.bodies, 'function', `${id}.bodies`);
    assert.ok(Array.isArray(m.bodies()), `${id}.bodies()`);
    m.destroy();
  }
  for (const f of readdirSync(`${root}src/beyond/mechanics`)) {
    if (f === 'kit.js' || f === 'index.js') continue;
    const src = read(`src/beyond/mechanics/${f}`);
    const frame = src.slice(src.indexOf('function frame('), src.indexOf('function pointer('));
    assert.doesNotMatch(frame, /create(?:Linear|Radial)Gradient/, `${f}: no gradient made inside frame()`);
  }
});

test('assemble: the pieces never start in reading order; list items stay together where they can', async () => {
  const mod = await MECHANIC_MODULES.assemble_step();
  for (const step of ['Choose one small action for this week and put it in your diary.', 'Make a small plan for your weakest area: three short sessions this week.', 'Write down the three things due first, then pick the smallest one.']) {
    const ctx = mountCtx('assemble_step');
    ctx.parts = { ...ctx.parts, steps: chunkStep(step) };
    const m = mod.mount(ctx);
    const rows = m.probe().pieces.sort((a, b) => a.i - b.i).map((p) => p.row);
    assert.notDeepEqual(rows, [0, 1, 2], `shuffled: ${step}`);
    m.destroy();
  }
  assert.deepEqual(chunkStep('Text a friend, a sister or a colleague and ask for ten minutes tonight.')[0], 'Text a friend, a sister or a colleague');
});

test('soften: a slow straight stroke across the shell softens it as surely as one round the edge', async () => {
  const mod = await MECHANIC_MODULES.soften_harshness();
  const strokes = (shape) => {
    const m = mod.mount(mountCtx('soften_harshness'));
    for (let i = 0; i < 30; i++) m.frame(1 / 30, i / 30);
    const { c, R } = m.probe();
    let t = 1000, n = 0;
    while (!m.settled && n < 20) {
      const pts = [];
      if (shape === 'round') for (let i = 0; i <= 60; i++) { const a = (i / 60) * Math.PI * 2 + n; pts.push([c.x + Math.cos(a) * R, c.y + Math.sin(a) * R]); }
      else for (let i = 0; i <= 40; i++) { const k = i / 40; pts.push([c.x - R * 0.9 + R * 1.8 * k, c.y + (n % 2 ? 0.4 : -0.3) * R]); }
      m.pointer({ type: 'down', id: 1, x: pts[0][0], y: pts[0][1], t });
      for (const [x, y] of pts.slice(1)) { t += 45; m.pointer({ type: 'move', id: 1, x, y, t }); }
      m.pointer({ type: 'up', id: 1, x: pts.at(-1)[0], y: pts.at(-1)[1], t: t + 10 }); t += 500;
      for (let i = 0; i < 10; i++) m.frame(1 / 30, i / 30);
      n++;
    }
    m.destroy();
    return n;
  };
  const straight = strokes('straight'), round = strokes('round');
  assert.ok(straight <= 10, `straight strokes finish (${straight})`);
  assert.ok(round >= 2, `but never in a single swipe (${round})`);
});

test('a mechanic that stops is never a dead end (pull_apart, then the perspective itself)', () => {
  const src = read('src/beyond/another-angle.js');
  assert.match(src, /catch \(e\) \{ mechFailed\(e\); \}/);
  // (pull_apart, or assemble_step for a feeling: a feeling never falls back to a fact/assumption split)
  assert.match(src, /const fallback = scene\.feeling \? 'assemble_step' : 'pull_apart';/);
  assert.match(src, /if \(!mech \|\| mech\.failed\)[\s\S]{0,320}scene\.mechanic = fallback[\s\S]{0,120}reveal\(scene, seq, \{ played: false \}\)/);
});

test('mechanics drive the person’s living Thought Mallow (W2) when the scene hands one in (review r3, polish 1)', async () => {
  const { createThought, styleFor } = await import('../src/mallows/thought/index.js');
  const { ThoughtBody } = await import('../src/beyond/mechanics/kit.js');
  let drawn = 0;
  const W2 = { create: createThought, draw: () => { drawn++; }, style: styleFor };
  for (const id of V.MECHANICS) {
    const mod = await MECHANIC_MODULES[id]();
    const ctx = mountCtx(id);
    const made = [];
    ctx.thought = (o) => { const t = new ThoughtBody({ text: ctx.text, emotion: 'anxiety', rmFn: () => false, ...o }, W2); made.push(t); return t; };
    const m = mod.mount(ctx);
    assert.ok(made.length >= 1 && made.every((t) => t.living), `${id} plays the living Thought Mallow`);
    await settle(m, 1 / 30, 0.6);
    // a touch on it reaches the jelly (it dents), and lets go
    const t0 = made[0];
    m.pointer({ type: 'down', id: 7, x: t0.x, y: t0.y, t: 2000 });
    m.pointer({ type: 'up', id: 7, x: t0.x, y: t0.y, t: 2080 });
    for (let i = 0; i < 14 && !m.settled; i++) { m.assist(); await settle(m, 1 / 30, 1.6); }
    assert.equal(m.settled, true, `${id} still completes`);
    m.destroy();
    assert.ok(made.every((t) => t.w2 === null), `${id} lets its Thought Mallows go`);
  }
  assert.ok(drawn > 100);
});

// ----------------------------------------- go-live (G1) and the client seam (B4) --
// The owner's approved wording (docs/integration/DECISIONS.md, 12 Oct 2026), compared with the apostrophes
// made straight: the app writes them typographically (’), the decision record plainly (').
const APPROVED = {
  retention: "Anthropic doesn't use your words to train its AI. It usually deletes them within 30 days.",
  safetyHold: 'If its automatic safety checks flag a message as breaking its rules, Anthropic can keep it for up to 2 years. It also keeps anything the law requires it to.',
  use: "Anthropic uses your words only to prepare your perspective, to keep its service safe, and where the law requires. It isn't sent your account or photos, but it sees anything you type, names included.",
  remove: "Anthropic's copy is usually deleted within 30 days (kept longer only if flagged or the law requires it). We can't delete it sooner from here.",
  plans: 'Another Angle asks first, then sends only the words you choose to our secure server. Never your photos.',
};
const plain = (t) => String(t).replace(/[‘’]/g, "'");

test('G1: the approved consent, privacy and delete wording, word for word, where the owner placed it', () => {
  assert.equal(plain(PROVIDER_RETENTION), APPROVED.retention);
  assert.equal(plain(PROVIDER_SAFETY_HOLD), APPROVED.safetyHold);
  assert.equal(plain(PROVIDER_USE), APPROVED.use);
  assert.equal(plain(PROVIDER_DELETE), APPROVED.remove);
  const src = read('src/beyond/consent.js');
  const body = src.slice(src.indexOf('function noticeBody('), src.indexOf('export function openConsent'));
  // line 1 straight after "The provider receives your words to prepare the perspective.", then lines 2 and 3 (card and sheet share noticeBody)
  assert.match(body, /'The provider receives your words to prepare the perspective\. ', retention, ` \$\{PROVIDER_SAFETY_HOLD\}`\)/);
  assert.match(body, /PROVIDER_USE\)/);
  assert.match(src, /noticeBody\(app\)\)/, 'the card');
  assert.match(src, /noticeBody\(app, \{ compact: true, therapy: true \}\)/, 'the privacy sheet');
  // line 4 on the delete sheet
  const del = src.slice(src.indexOf('function confirmDelete()'), src.indexOf('export function saveTesterCode'));
  assert.match(del, /PROVIDER_DELETE\)/);
  // the plans page sentence
  assert.ok(read('src/app/scenes/plans.js').includes(APPROVED.plans));
  // "AI" and the provider's name only on the consent card, the privacy sheet and the delete sheet (all in consent.js)
  for (const f of ['another-angle.js', 'lines.js', 'authored.js', 'angle-client.js', 'styles.js', 'vocab.js', 'endpoint.js']) {
    const strings = read(`src/beyond/${f}`).match(/'[^'\n]*'|`[^`]*`/g) || [];
    for (const x of strings) assert.doesNotMatch(x, /\bAI\b|Anthropic/, `${f}: ${x.slice(0, 60)}`);
  }
  // a newer notice asks again
  assert.ok(CONSENT_VERSION >= 2);
});

test('G1: the consent card says what the client really sends (every request body, re-checked)', async () => {
  const src = read('src/beyond/consent.js');
  const sent = src.match(/'What’s sent\. '\), '([^']+)'/)[1];
  const kept = src.match(/'What’s kept\. '\),[^\n]*?' stores nothing you write[^']*'/)[0];
  // what really goes out, from the client itself (a fake server records every body)
  const srv = fakeServer({ angle: OK });
  const store = memStore();
  saveTesterCode(store, '  tester-1  ');
  const c = createAngleClient({ store, endpoint: EP, fetchImpl: srv.fetch });
  const r = await c.angle({ text: 'Nobody likes me.', emotion: 'sadness', intention: 'calm', previous: [{ ...GOOD }] });
  await c.feedback('helped', r.scene);
  const [session, angle, fb] = srv.calls;
  assert.deepEqual(Object.keys(session.body).sort(), ['app_version', 'device_id', 'invite', 'platform']);
  assert.equal(session.body.invite, 'tester-1', 'the tester code, trimmed');
  assert.deepEqual(Object.keys(angle.body).sort(), ['consent', 'emotion', 'intention', 'locale', 'previous_angles', 'request_id', 'text']);
  assert.deepEqual(Object.keys(fb.body).sort(), ['interaction_type', 'mallow_character', 'prompt_version', 'rating', 'reasoning_pattern']);
  // …and each is told: words, feeling, kind of help, lines seen, language, request number; the session's code, version, device type, invite code
  for (const [field, words] of [['text', /your words/i], ['emotion', /the feeling/], ['intention', /the kind of help you pick/], ['previous_angles', /the lines you’ve seen/],
    ['locale', /the app’s language/], ['request_id', /a one-off random code/]]) assert.match(sent, words, `${field} is told`);
  // (review r6: the language and the request code ride on /v1/angle only; the session code on every request;
  // feedback names the Mallow and the prompt version too)
  assert.match(sent, /Each angle request also carries the app’s language and a one-off random code, and every request carries this phone’s session code\./);
  assert.match(sent, /A feedback tap sends which button, which Mallow and what kind of angle it was \(and its version\), never your words/);
  assert.match(kept, /a random code for this phone, its version and device type \(and any invite code\)/);
  assert.doesNotMatch(JSON.stringify(srv.calls.map((x) => x.body)), /photo|image|data:/i);
});

test('G1: the endpoint is the production Worker on its own allow-listed host (no other workers.dev address in src)', () => {
  if (!ANGLE_ENDPOINT) return;
  const u = new URL(ANGLE_ENDPOINT);
  assert.equal(u.protocol, 'https:');
  assert.deepEqual(ANGLE_ALLOWED_HOSTS, [u.hostname]);
  assert.equal(resolveEndpoint({ loc: { hostname: 'ramkumarjothi1982.github.io', protocol: 'https:', search: '' } }), ANGLE_ENDPOINT);
  // on localhost ?angleDev still points at a local mock (the only way to test it from a sandbox)
  assert.equal(resolveEndpoint({ loc: { hostname: 'localhost', protocol: 'http:', search: '?angleDev=8790' } }), 'http://localhost:8790');
  const hits = [];
  const walk = (d) => { for (const n of readdirSync(root + d)) { const p = `${d}/${n}`; if (statSync(root + p).isDirectory()) walk(p); else if (/\.(js|mjs|html|css|json)$/.test(n)) read(p).split('\n').forEach((l, i) => { if (/workers\.dev/.test(l)) hits.push(`${p}:${i + 1}`); }); } };
  walk('src');
  assert.equal(hits.length, 2, hits.join(', '));
  assert.ok(hits.every((h) => h.startsWith('src/app/config.js:')), hits.join(', '));
  assert.doesNotMatch(read('src/app/config.js'), /staging/);
});

test('G1: Settings shows the Another Angle rows with the server on only for Beyond, or wherever its data is still kept', () => {
  const src = read('src/app/scenes/settings.js');
  assert.match(src, /const live = !!endpoint && ent\.has\('ultra'\);/);
  assert.match(src, /if \(live \|\| c\.hasAngleData\(app\.store\)\) c\.mountAngleSettings\(app, angleRows, \{ endpoint: live \? endpoint : null \}\);/);
});

test('B4: the compact input has no photos and says where the words go; Back closes a sheet before the input', () => {
  const src = read('src/beyond/another-angle.js');
  const open = src.slice(src.indexOf('function openTellNow()'), src.indexOf('async function afterTell('));
  assert.match(open, /photos: false, privacyNote: serverMode\(\) \? SERVER_CLAUSE : null/);
  assert.match(open, /support: \(o\) => openSupportSheet\(o\), trackSheet: \(sh\) => trackSheet\(sh\)/);
  assert.match(src, /const SERVER_CLAUSE = '[^']*secure server[^']*'/);
  assert.doesNotMatch(src, /hf-ghost\.photo|PRIVACY_CLAUSE/);
  // every support sheet the scene opens is tracked (its own history entry), the urgent one included
  assert.doesNotMatch(src.replace(/const openSupportSheet = \(opts = \{\}\) => trackSheet\(openSupport\(app, opts\)\);/, ''), /[^.\w]openSupport\(app/);
  assert.match(src, /openSupportSheet\(\{ urgent: true \}\)/);
  assert.match(src, /get blockBack\(\) \{\s*if \(!overlay && !sheets\.length\) return null;\s*return \(token\) => backClose\(token\);/);
  const back = src.slice(src.indexOf('function backClose('), src.indexOf('function backClose(') + 400);
  assert.ok(back.indexOf('sheet.close(\'back\')') < back.indexOf('overlay.close(\'back\')'), 'the sheet first, then the input');
});

test('B4: keeping a discovery passes a signal crisis or care aborts, and a subtitles adapter that never un-pauses the person', () => {
  const src = read('src/beyond/another-angle.js');
  const keep = src.slice(src.indexOf('async function keep()'), src.indexOf('async function endChoice('));
  assert.match(keep, /subtitles: installSubtitles,[^\n]*signal: ctl\?\.signal/);
  assert.match(keep, /finally \{\s*if \(keepCtl === ctl\) keepCtl = null;\s*installSubtitles\.resume\(\);/);
  assert.match(src, /pause\(\) \{ if \(!subs\) return; subsHeld = !subs\.paused; subs\.clear\(\{ keepHeld: true \}\); subs\.pause\(\); \}/);
  assert.match(src, /resume\(\) \{ if \(subsHeld\) \{ subsHeld = false; subs\?\.resume\(\); \} \}/);
  const note = src.slice(src.indexOf('function noteSafety('), src.indexOf('function crisisMode('));
  assert.match(note, /if \(lv === 'crisis' \|\| lv === 'care'\) keepCtl\?\.abort\(\);/);
  assert.match(src.slice(src.indexOf('    leave() {')), /keepCtl\?\.abort\(\);/);
});

test('B4: Continue carries the feeling, the intention, the words (in memory) and where the thought was', () => {
  const src = read('src/beyond/another-angle.js');
  const cont = src.slice(src.indexOf('async function continueFlow()'), src.indexOf('async function finish()'));
  assert.match(cont, /thought: thoughtAt/);
  assert.match(cont, /\{ x: Math\.round\(lt\.x\), y: Math\.round\(lt\.y\), r: Math\.round\(lt\.r\), emotion: S\.look \|\| S\.emotion \|\| null \}/);
  assert.match(cont, /app\.go\('home', worldId \? \{ flow: \{ worldId, \.\.\.carry \} \} : \{ carry \}\)/);
});

test('B4: invite_required → reason "invite", remembered until the stored code changes (no session request on each angle)', async () => {
  const store = memStore();
  const calls = [];
  let codes = ['the-code'];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(url.replace(EP, ''));
    const res = (code, data) => ({ status: code, json: async () => data });
    if (url.endsWith('/v1/session')) {
      if (codes.length && !codes.includes(body.invite)) return res(403, { status: 'error', error: { code: 'invite_required', message: 'A tester invite code is required during the testing phase.' } });
      return res(200, { status: 'ok', token: 'tok', expires_at: new Date(Date.now() + 3600e3).toISOString() });
    }
    if (url.endsWith('/v1/angle')) return res(200, OK);
    return res(404, {});
  };
  let t = 1_000_000;
  const mk = () => createAngleClient({ store, endpoint: EP, fetchImpl, now: () => t });
  const a = await mk().angle({ text: 'Nobody likes me.' });
  assert.deepEqual([a.status, a.reason], ['error', 'invite']);
  assert.deepEqual(calls, ['/v1/session']);
  // more angles, this visit and the next: no request at all
  assert.equal((await mk().angle({ text: 'Nobody likes me.' })).reason, 'invite');
  const c1 = mk();
  await c1.angle({ text: 'x y' }); await c1.angle({ text: 'x y z' });
  assert.deepEqual(calls, ['/v1/session'], 'remembered across angles and visits');
  // a wrong code is asked once, then remembered too
  saveTesterCode(store, 'wrong');
  assert.equal((await mk().angle({ text: 'x y' })).reason, 'invite');
  assert.equal((await mk().angle({ text: 'x y' })).reason, 'invite');
  assert.equal(calls.length, 2);
  // the right code (from Settings): the next angle is ok
  saveTesterCode(store, ' the-code ');
  assert.equal(store.get(STORE_KEYS.session, null), null, 'a new code drops the session');
  const ok = await mk().angle({ text: 'Nobody likes me.' });
  assert.equal(ok.status, 'ok');
  assert.deepEqual(calls.slice(2), ['/v1/session', '/v1/angle']);
  // codes switched off later: a device that was refused tries once more after INVITE_RETRY_MS
  const s2 = memStore();
  codes = ['x'];
  const mk2 = () => createAngleClient({ store: s2, endpoint: EP, fetchImpl, now: () => t });
  await mk2().angle({ text: 'x y' });
  codes = [];
  assert.equal((await mk2().angle({ text: 'x y' })).reason, 'invite');
  t += 12 * 3600000 + 1;
  assert.equal((await mk2().angle({ text: 'x y' })).status, 'ok');
  // deleting this phone's data removes the code and the remembered answer
  deleteAngleData(store);
  assert.equal(store.get(STORE_KEYS.invite, null), null);
  assert.equal(store.get(STORE_KEYS.inviteNeeded, null), null);
});

test('B4: the invite line is said once a visit with no speaker, then Zuzu’s own angle plays; the Tester code row is built', () => {
  assert.equal(LINES.INVITE.line, 'Another Angle is open to invited testers for now. You can add your code in Settings.');
  const src = read('src/beyond/another-angle.js');
  assert.match(src, /invited = res\.reason === 'invite';/);
  assert.match(src, /if \(invited && !S\.inviteSaid\) \{ S\.inviteSaid = true; S\.offlineSaid = true; scene\.inviteNote = true; \}/);
  assert.match(src, /if \(scene\.inviteNote\) say\(INVITE\.line, \{ who: null, colour: null \}\);/);
  const consent = read('src/beyond/consent.js');
  assert.match(consent, /rows\.push\(testerCodeRow\(app\)\);/);
  const row = consent.slice(consent.indexOf('function testerCodeRow('));
  assert.match(row, /type: 'text', class: 'search bx-invite', maxlength: '64'/);
  assert.match(row, /'Tester code'/);
  assert.match(read('src/beyond/styles.js'), /\.bx-invite-row input\.bx-invite \{[^}]*font-size: max\(16px, 1em\)/);
  const store = memStore();
  assert.equal(saveTesterCode(store, '  abc  '), 'abc');
  assert.equal(store.get(STORE_KEYS.invite, null), 'abc');
  saveTesterCode(store, '   ');
  assert.equal(store.get(STORE_KEYS.invite, null), null, 'an empty code removes it');
  assert.equal(saveTesterCode(store, 'x'.repeat(80)).length, 64);
});
