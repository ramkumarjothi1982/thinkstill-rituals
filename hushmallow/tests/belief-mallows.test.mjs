// Belief Mallows inside Another Angle (workstream belief-mallows): the authored words, the on-device store, the switch,
// the flow's seams with Another Angle's safety routing, and the stage's physics contract.
// Run: node --test hushmallow/tests/belief-mallows.test.mjs   (the browser probe: tests/belief-mallows.probe.cjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

const { BELIEF, excerpt } = await import('../src/beyond/belief/lines.js');
const store = await import('../src/beyond/belief/store.js');
const { beliefMallowsOn, devSwitch } = await import('../src/beyond/belief/gate.js');
const { createBeliefHook, beliefQuestion, offerable } = await import('../src/beyond/belief/hook.js');
const { pullOf, LEAN_AT, DONE_AT } = await import('../src/beyond/belief/stage.js');
const { LIVE_FEATURES, PLANS } = await import('../src/app/entitlements.js');
const { PROPS, PROP_WEIGHT, createBelief } = await import('../src/mallows/thought/belief.js');
const { ANGLE_CHOICE, CHECK_IN } = await import('../src/beyond/lines.js');

/** Every string in a nested object (labels, lines). */
function strings(x, out = []) {
  if (typeof x === 'string') out.push(x);
  else if (typeof x === 'function') out.push(x('words'));
  else if (Array.isArray(x)) x.forEach((v) => strings(v, out));
  else if (x && typeof x === 'object') Object.values(x).forEach((v) => strings(v, out));
  return out;
}
function memStore(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    m, writes: [],
    get(k, d = null) { return m.has(k) ? JSON.parse(JSON.stringify(m.get(k))) : d; },
    set(k, v) { this.writes.push(k); m.set(k, JSON.parse(JSON.stringify(v))); },
    remove(k) { m.delete(k); },
    clearAll() { m.clear(); },
  };
}

// ------------------------------------------------------------------ the words --
test('the words never judge, diagnose, weigh evidence or reframe (REDESIGN_BRIEF §5)', () => {
  const all = strings(BELIEF);
  assert.ok(all.length > 60);
  const OK_PHRASES = ['Nothing about it has to be right or wrong.'];
  for (const s of all) {
    const t = OK_PHRASES.reduce((a, p) => a.replace(p, ''), s);
    assert.doesNotMatch(t, /\b(wrong|untrue|not true|false|irrational|distort\w*|disorder\w*|diagnos\w*|symptom\w*|unhealthy|negative thinking|cognitive|faulty|mistaken|evidence|prove|proof|disprove|reframe\w*|challenge|should(?:n’t)?|must|fix\w*|cure\w*|therapy|AI)\b/i, s);
    // nothing playful: no exclamation marks, no emoji
    assert.doesNotMatch(s, /!|\p{Extended_Pictographic}/u, s);
  }
  // it says plainly that nothing is right or wrong, that it is never removed, and that it stays on the phone when kept
  assert.match(BELIEF.arrive, /Nothing about it has to be right or wrong/);
  assert.match(BELIEF.kept, /on this phone only/);
  assert.match(BELIEF.letGo, /not kept anywhere/);
  // the person picks the prop and every answer; four props, matching the model's
  assert.deepEqual(BELIEF.props.map((p) => p.value), [...PROPS]);
  assert.deepEqual(Object.keys(BELIEF.meet).sort(), [...PROPS].sort());
  assert.deepEqual(Object.keys(BELIEF.loosen.done).sort(), [...PROPS].sort());
  // chips stay short enough for a 320 px phone at the largest text (two to a row, or one)
  for (const o of [...BELIEF.props, ...BELIEF.experiences, ...BELIEF.understand.options, ...BELIEF.feel]) assert.ok(o.label.length <= 26, o.label);
  for (const v of Object.values(BELIEF.end)) assert.ok(v.length <= 30, v);
});

test('excerpt: whole words, marked, never empty', () => {
  assert.equal(excerpt('I’m not good enough'), 'I’m not good enough');
  const e = excerpt('Everybody at work is always judging every single thing I do', 28);
  assert.ok(e.length <= 29 && e.endsWith('…') && !/\s…$/.test(e), e);
  assert.equal(excerpt('  a   b  '), 'a b');
});

// ------------------------------------------------------------------ the store --
test('nothing is stored unless they choose; kept is validated, capped and deletable', () => {
  const s = memStore();
  assert.deepEqual(store.keptBeliefs(s), []);
  assert.equal(store.hasBeliefData(s), false);
  const a = store.keepBelief(s, { text: '  I must  always be perfect ', prop: 'shell', explored: 0.812345, room: 2, understood: 'safe' }, { now: Date.UTC(2026, 9, 15, 13, 45) });
  assert.equal(a.ok, true);
  const [k] = store.keptBeliefs(s);
  assert.deepEqual(k, { id: a.id, text: 'I must always be perfect', prop: 'shell', explored: 0.812, room: 1, understood: 'safe', kept: '2026-10-15' });
  assert.deepEqual([...s.m.keys()], [store.BELIEF_KEYS.kept], 'one key, nothing else');
  // updating keeps one record
  assert.equal(store.keepBelief(s, { ...k, explored: 0.9 }).id, a.id);
  assert.equal(store.keptBeliefs(s).length, 1);
  // capped at MAX_KEPT
  store.keepBelief(s, { text: 'Everybody judges me', prop: 'stone' });
  store.keepBelief(s, { text: 'I can pause before responding', prop: 'charm' });
  assert.equal(store.keptBeliefs(s).length, store.MAX_KEPT);
  assert.deepEqual(store.keepBelief(s, { text: 'One more', prop: 'thread' }), { ok: false, full: true });
  // malformed records are dropped on read
  s.m.set(store.BELIEF_KEYS.kept, [{ id: 'abc', text: 'short id' }, { id: 'abcdefgh', text: '   ' }, { id: 'ABCDEFGH', text: 'caps' }, { id: 'goodid12', text: 'fine', prop: 'lava', explored: 'x', understood: 'evil' }, 'nope', null]);
  assert.deepEqual(store.keptBeliefs(s), [{ id: 'goodid12', text: 'fine', prop: 'stone', explored: 0, room: 0, understood: null, kept: null }]);
  s.m.set(store.BELIEF_KEYS.kept, { not: 'a list' });
  assert.deepEqual(store.keptBeliefs(s), []);
  // empty words are never kept
  assert.equal(store.keepBelief(memStore(), { text: '…  ', prop: 'stone' }).ok, false);
  // a store that refuses (sealed after a delete) reports it
  const sealed = { get: () => null, set: () => {}, remove: () => {} };
  assert.equal(store.keepBelief(sealed, { text: 'I’m not good enough', prop: 'stone' }).ok, false);
});

test('deleting: its own row, "Delete everything" (clearAll), and the props list matches the model', () => {
  const s = memStore();
  const a = store.keepBelief(s, { text: 'Everybody judges me', prop: 'stone' });
  const b = store.keepBelief(s, { text: 'I must always be perfect', prop: 'shell' });
  assert.equal(store.forgetBelief(s, a.id), true);
  assert.deepEqual(store.keptBeliefs(s).map((x) => x.id), [b.id]);
  assert.equal(store.forgetBelief(s, b.id), true);
  assert.equal(s.m.has(store.BELIEF_KEYS.kept), false, 'the key goes with the last one');
  store.keepBelief(s, { text: 'Everybody judges me', prop: 'stone' });
  s.clearAll();
  assert.deepEqual(store.keptBeliefs(s), []);
  store.keepBelief(s, { text: 'Everybody judges me', prop: 'stone' });
  store.deleteBeliefData(s);
  assert.deepEqual(store.keptBeliefs(s), []);
  assert.deepEqual([...store.PROPS], [...PROPS]);
});

test('the Another Angle delete row removes kept Belief Mallows, counts them as data, and says so', async () => {
  const consent = await import('../src/beyond/consent.js');
  assert.ok(consent.ANGLE_EXTRA_KEYS.includes(store.BELIEF_KEYS.kept));
  const s = memStore();
  assert.equal(consent.hasAngleData(s), false);
  store.keepBelief(s, { text: 'Everybody judges me', prop: 'stone' });
  assert.equal(consent.hasAngleData(s), true, 'only a kept Belief Mallow: the delete row shows');
  consent.deleteAngleData(s);
  assert.deepEqual(store.keptBeliefs(s), []);
  assert.equal(s.m.size, 0);
  // the sheets say what goes: the Another Angle row, and "Delete everything" (its clearAll removes the key: above)
  assert.match(read('src/beyond/consent.js'), /any Belief Mallows you kept\./);
  for (const m of read('src/app/scenes/settings.js').matchAll(/This removes [^']*sealed predictions[^']*/g)) assert.match(m[0], /kept Belief Mallows/);
});

test('never synced: the account sync carries only its own listed keys', () => {
  const auto = read('src/auth/autosync.js');
  assert.doesNotMatch(auto, /belief/i);
  assert.doesNotMatch(read('src/auth/sync.js'), /belief/i);
});

// ------------------------------------------------------------------ the switch --
test('on since the integration (16 Oct 2026), sold on Beyond only; Beyond required; the dev switch never on the published site', () => {
  assert.equal(LIVE_FEATURES.beliefMallows, true);
  assert.match(PLANS.ultra.includes.join(' '), /Belief Mallow investigation for the stories that keep coming back/);
  assert.doesNotMatch(PLANS.paid.includes.join(' '), /Belief/, 'never sold on Flow');
  const beyond = { ent: { has: (t) => t === 'ultra' || t === 'paid' } }, flow = { ent: { has: (t) => t === 'paid' } }, none = { ent: { has: () => false } };
  assert.equal(beliefMallowsOn(beyond), true);
  assert.equal(beliefMallowsOn(flow), false, 'Flow alone never');
  assert.equal(beliefMallowsOn(none), false);
  assert.equal(beliefMallowsOn(beyond, { live: false, dev: false }), false, 'the switch still turns it off');
  assert.equal(beliefMallowsOn(beyond, { live: true }), true);
  assert.equal(beliefMallowsOn(flow, { live: true }), false, 'Flow alone never');
  assert.equal(beliefMallowsOn(beyond, { live: false, dev: true }), true);
  assert.equal(beliefMallowsOn({}, { live: true }), false);
  assert.equal(devSwitch({ hostname: 'localhost', search: '?beliefMallows=1' }), true);
  assert.equal(devSwitch({ hostname: '127.0.0.1', search: '?a=1&beliefMallows=1' }), true);
  assert.equal(devSwitch({ hostname: 'hushmallow.app', search: '?beliefMallows=1' }), false, 'never on the published site');
  assert.equal(devSwitch({ hostname: 'localhost', search: '' }), false);
  assert.equal(devSwitch(null), false);
});

// ------------------------------------------------------------- the question --
test('a question before every Belief Mallow: the same three equal answers and values as Another Angle', () => {
  const q = beliefQuestion('choice');
  assert.equal(q.ms, ANGLE_CHOICE.ms);
  assert.deepEqual(q.options.map((o) => o.value), ['angle', 'be', 'notreally']);
  assert.ok(q.options.every((o) => !o.primary), 'equal weight');
  assert.equal(q.options[2].label, ANGLE_CHOICE.notOkay);
  const c = beliefQuestion('check');
  assert.equal(c.ask, CHECK_IN.ask);
  assert.deepEqual(c.options.map((o) => o.value), ['angle', 'notreally', 'be']);
  assert.equal(beliefQuestion('check-in'), null, 'the loss check-in keeps its own words');
});

test('their recent words are offered only when nothing heavy is in them', () => {
  const r = offerable(['Everybody judges me', 'I want to kill myself', 'my dad died last year', '', 'Everybody judges me', 'I must always be perfect', 'He hits me']);
  assert.deepEqual(r, ['I must always be perfect', 'Everybody judges me']);
  assert.deepEqual(offerable([]), []);
});

// ------------------------------------------------------------------ the flow --
function fakeHost({ answers = [], on = true, S: s = {} } = {}) {
  const calls = [];
  const S = { level: 'none', crisis: false, care: false, noPlay: false, seq: 0, recent: [], text: '', left: false, phase: 'invite', ...s };
  const queue = [...answers];
  const host = {
    app: { store: memStore(), ent: { has: () => on }, prefs: { reducedMotion: () => true, get: () => null }, haptic: () => {} },
    S, root: null,
    say: async (t) => { calls.push(['say', t]); },
    choose: async (p, opts) => { calls.push(['choose', p, opts.map((o) => o.value)]); const a = queue.shift(); if (typeof a === 'function') return a(S, opts); return a ?? null; },
    careFace: () => calls.push(['careFace']),
    announce: () => {}, dockShow: (o) => calls.push(['dock', o]), layout: () => {}, measureBand: () => 120,
    endMechanic: async () => calls.push(['endMechanic']), openTell: () => calls.push(['openTell']),
    afterTell: (r) => { calls.push(['afterTell', r.text]); S.text = r.text; },
    startAngle: (o) => calls.push(['startAngle', o]), finish: () => calls.push(['finish']), rectOf: () => null,
    get: () => ({ g: null, area: { x: 0, y: 100, w: 390, h: 400 }, zAd: null }), setMech: (m) => calls.push(['setMech', !!m]),
  };
  return { host, calls, S };
}
const withDev = async (fn) => {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { hostname: 'localhost', search: '?beliefMallows=1' } });
  try { return await fn(); } finally { if (had) Object.defineProperty(globalThis, 'location', had); else delete globalThis.location; }
};

test('without Beyond: no answer, no prompt, no question, never active', () => {
  const { host } = fakeHost({ on: false });
  const b = createBeliefHook(host);
  assert.deepEqual(b.inviteOptions(), []);
  assert.deepEqual(b.tell(), {});
  assert.equal(b.question('choice'), null);
  assert.equal(b.active(), false);
});

test('belief mode lasts for the Tell it opened: an ordinary Tell after it is an ordinary Tell', () => withDev(async () => {
  const { host, calls } = fakeHost();
  const b = createBeliefHook(host);
  const [opt] = b.inviteOptions();
  assert.equal(opt.label, BELIEF.invite);
  opt.onPick();                                            // inside the tap: the Tell opens in belief mode
  assert.deepEqual(calls.at(-1), ['openTell']);
  const t = b.tell();
  assert.equal(t.prompt, BELIEF.prompt);
  assert.equal(t.privacyNote, null, 'the input says the words stay on this phone (never the server clause)');
  assert.equal(b.active(), true);
  assert.equal(b.question('choice').ask, BELIEF.question.ask);
  // the Tell pill next: an ordinary Tell
  assert.deepEqual(b.tell(), {});
  assert.equal(b.active(), false);
  assert.equal(b.question('choice'), null);
}));

test('crisis or care in the visit: never a Belief Mallow (and no way in)', () => withDev(async () => {
  for (const s of [{ crisis: true }, { care: true }, { level: 'care' }, { level: 'crisis' }]) {
    const { host, calls } = fakeHost({ S: s });
    const b = createBeliefHook(host);
    b.inviteOptions()[0]?.onPick();
    b.tell();
    assert.equal(b.active(), false, JSON.stringify(s));
    await b.play();
    assert.ok(!calls.some((c) => c[0] === 'setMech' || c[0] === 'choose'), JSON.stringify(s));
    assert.deepEqual(b.endOptions(), []);
  }
}));

test('the end choice offers their own recent words; a tap reads them again as a Tell (afterTell: every safety route)', () => withDev(async () => {
  const { host, calls, S } = fakeHost();
  S.recent = ['Everybody judges me'];
  const b = createBeliefHook(host);
  const [opt] = b.endOptions();
  assert.equal(opt.label, BELIEF.endInvite);
  opt.onPick();
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(calls.at(-1), ['afterTell', 'Everybody judges me']);
  assert.equal(b.active(), true);
  // nothing offered after a quiet visit, or when every recent Tell was heavy
  S.noPlay = true;
  assert.deepEqual(b.endOptions(), []);
  S.noPlay = false; S.recent = ['I want to die'];
  assert.deepEqual(b.endOptions(), []);
}));

test('the flow: their prop, an experience, how it sits, keep on this phone, finish — nothing sent, nothing else stored', () => withDev(async () => {
  const { host, calls, S } = fakeHost({ answers: ['stone', 'understand', 'safe', 'lighter', 'keep', 'finish'] });
  S.text = 'I’m not good enough';
  const b = createBeliefHook(host);
  b.inviteOptions()[0].onPick(); b.tell();
  await b.play();
  const asked = calls.filter((c) => c[0] === 'choose').map((c) => c[1]);
  // (no canvas here: only "Get to know it" is offered, so the loop ends after it)
  assert.deepEqual(asked, [BELIEF.propAsk, BELIEF.nextAsk, BELIEF.understand.ask, BELIEF.feelAsk, BELIEF.endAsk, BELIEF.endAsk]);
  assert.deepEqual(calls.find((c) => c[0] === 'choose' && c[1] === BELIEF.endAsk)[2], ['keep', 'angle', 'finish']);
  assert.deepEqual(calls.filter((c) => c[0] === 'choose' && c[1] === BELIEF.endAsk)[1][2], ['forget', 'angle', 'finish'], 'kept now: no second keep');
  // the Support pill stays in the dock throughout (asking: true), and Zuzu's attentive face
  for (const d of calls.filter((c) => c[0] === 'dock')) assert.equal(d[1].asking, true, JSON.stringify(d));
  assert.ok(calls.some((c) => c[0] === 'careFace'));
  const kept = store.keptBeliefs(host.app.store);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].text, 'I’m not good enough');
  assert.equal(kept[0].understood, 'safe');
  assert.deepEqual(calls.at(-1), ['finish']);
  assert.deepEqual([...host.app.store.m.keys()], [store.BELIEF_KEYS.kept]);
}));

test('not kept unless chosen: "Finish" says it is not kept anywhere and stores nothing', () => withDev(async () => {
  const { host, calls, S } = fakeHost({ answers: ['shell', 'enough', 'finish'] });
  S.text = 'Everybody judges me';
  const b = createBeliefHook(host);
  b.inviteOptions()[0].onPick(); b.tell();
  await b.play();
  assert.ok(calls.some((c) => c[0] === 'say' && c[1] === BELIEF.letGo));
  assert.equal(host.app.store.m.size, 0);
  assert.deepEqual(calls.at(-1), ['finish']);
}));

test('crisis or care seen mid-flow ends it at once (nothing kept, nothing more asked)', () => withDev(async () => {
  const { host, calls, S } = fakeHost({ answers: ['charm', (s) => { s.crisis = true; s.seq++; return 'understand'; }, 'safe', 'keep'] });
  S.text = 'Everybody judges me';
  const b = createBeliefHook(host);
  b.inviteOptions()[0].onPick(); b.tell();
  await b.play();
  assert.equal(calls.filter((c) => c[0] === 'choose').length, 2);
  assert.equal(host.app.store.m.size, 0);
}));

test('"Look at it from another angle" hands over to Another Angle’s own path (its question; nothing sent from here)', () => withDev(async () => {
  const { host, calls, S } = fakeHost({ answers: ['thread', 'enough', 'angle'] });
  S.text = 'I must always be perfect';
  const b = createBeliefHook(host);
  b.inviteOptions()[0].onPick(); b.tell();
  await b.play();
  assert.deepEqual(calls.at(-1), ['startAngle', { another: false }]);
  assert.equal(b.active(), false, 'the angle is an ordinary one');
}));

test('a kept Belief Mallow comes back as it was left, and can be deleted from its own end choice', () => withDev(async () => {
  const { host, calls, S } = fakeHost({ answers: [(s, opts) => opts.find((o) => o.value.startsWith('kept:')).value, 'enough', 'forget', 'finish'] });
  const k = store.keepBelief(host.app.store, { text: 'Everybody judges me', prop: 'charm', explored: 0.5 });
  const b = createBeliefHook(host);
  b.inviteOptions()[0].onPick();
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(calls.find((c) => c[0] === 'afterTell'), ['afterTell', 'Everybody judges me']);
  await b.play();
  assert.ok(!calls.some((c) => c[0] === 'choose' && c[1] === BELIEF.propAsk), 'its prop is kept');
  assert.ok(calls.some((c) => c[0] === 'say' && c[1] === BELIEF.meetAgain));
  assert.ok(calls.some((c) => c[0] === 'choose' && c[1] === BELIEF.endAsk && c[2].includes('forget')));
  assert.deepEqual(store.keptBeliefs(host.app.store), []);
  void k; void S;
}));

// ---------------------------------------------------------- Another Angle's seams --
test('the hook in another-angle.js: small, and after every safety route', () => {
  const src = read('src/beyond/another-angle.js');
  const lines = src.split('\n').filter((l) => /\bbelief\b|createBeliefHook/.test(l) && !/^\s*\/\//.test(l));
  assert.ok(lines.length <= 9, lines.join('\n'));
  const start = src.indexOf('async function startAngle(');
  const body = src.slice(start, src.indexOf('\n  }\n', start));
  const hook = body.indexOf('if (belief.active()) return belief.play();');
  assert.ok(hook > 0, 'the hook is in startAngle');
  // after: the gentle loss route, "Not really" earlier, the question (and the check-in); before: anything spawned or sent
  for (const before of ["if (route === 'gentle') return griefMode();", 'if (S.notReally) return careLite();', "await askFirst('check')", 'await askFirst(step)']) assert.ok(body.indexOf(before) > 0 && body.indexOf(before) < hook, before);
  for (const after of ['spawnThought()', 'client.angle(']) assert.ok(body.indexOf(after) > hook, after);
  // afterTell routes crisis and care (and the screener's care) before startAngle is ever reached
  const at = src.slice(src.indexOf('async function afterTell('), src.indexOf('function firstLook('));
  for (const r of ["if (S.level === 'crisis') { crisisMode(); return; }", "if (S.level === 'care') { careMode(); return; }", "if (scr.level === 'care')"]) assert.ok(at.indexOf(r) > 0 && at.indexOf(r) < at.indexOf('startAngle('), r);
  // the question is asked in belief words through the same askFirst (its clock, its Back, its Support pill)
  assert.match(src, /const q = belief\.question\(kind\) \|\| FIRST_QUESTION\[kind\];/);
  assert.match(src, /privacyNote: serverMode\(\) \? SERVER_CLAUSE : null, \.\.\.belief\.tell\(\),/);
});

test('src/beyond/belief: nothing sent, nothing stored behind the app store, words only as text', () => {
  const dir = new URL('src/beyond/belief/', root);
  for (const f of readdirSync(dir)) {
    const s = readFileSync(new URL(f, dir), 'utf8');
    assert.doesNotMatch(s, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|innerHTML|outerHTML|insertAdjacentHTML|\bhtml:/, f);
    assert.doesNotMatch(s, /angle-client|client\.angle|client\.feedback/, f);
  }
});

// ------------------------------------------------------------------ the stage --
test('the pull: heavy at first (moments lean in), light once loosened (they pass), for every prop', () => {
  for (const prop of PROPS) {
    const b = createBelief({ text: 'Everybody judges me', prop, x: 200, y: 400, seed: 3 });
    assert.ok(Math.abs(pullOf(b) - 1) < 1e-6, prop);
    assert.ok(pullOf(b) >= LEAN_AT);
    const l = createBelief({ text: 'Everybody judges me', prop, x: 200, y: 400, seed: 3, explored: DONE_AT.loosen });
    assert.ok(pullOf(l) < LEAN_AT, `${prop} ${pullOf(l)}`);
    assert.ok(l.weight > 0 || prop === 'stone', 'nothing is ever removed (the stone is set down beside it)');
  }
  assert.equal(PROP_WEIGHT.stone, 1);
});
