// audio/score.mjs: the generic score plan. --compat v2-score is buildPlanV2
// exactly; the default differs from it only by the documented fixes, each
// visible on its own; every Mallow gets its own kit, key and bed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildScore, FIX_ORDER, soundSlots, V2_SEED, kitGestureEvents, mallowSound, CLOSE_DAMP, HIT, SYNC_MAX } from '../../audio/score.mjs';
import { hitMoves } from '../../audio/hits.mjs';
import { PHONE_HZ } from '../../audio/pitch.mjs';
import { contourCheck, closeCheck, contourRules, synthTonal } from '../../audio/check.mjs';
import { CONTOURS } from '../../audio/recipes/contours.mjs';
import { planV2 } from '../../tools/golden/plan-v2.mjs';
import { studioPath, GOLDEN_V2 } from '../../render/lib/paths.mjs';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const log = () => readJson(studioPath('output', 'v2', 'cues.json'));
const direction = () => readJson(studioPath('specs', 'golden', 't01-v2.direction.json'));
const spec = () => readJson(studioPath('specs', 'golden', 't01-v2.json'));
const json = (x) => JSON.stringify(x);
/** the plan minus the generic-only fields (kit, circular) */
const core = ({ kit, circular, ...rest }) => rest;

test('--compat v2-score reproduces buildPlanV2 byte for byte (live, and the committed golden), with or without the direction', async () => {
  const want = json(await planV2(log()));
  assert.equal(json(readJson(`${GOLDEN_V2}/plan-v2.json`)), want, 'the golden is buildPlanV2 of the approved log');
  for (const input of [{ log: log() }, { log: log(), direction: direction() }, { log: log(), direction: direction(), spec: spec() }]) {
    assert.equal(json(buildScore(input, { compat: 'v2-score' }).plan), want);
  }
});

test('compat refuses anything v2 was not: another Mallow, realm or sound slots', () => {
  assert.throws(() => buildScore({ log: log() }, { compat: 'v2-score', mallow: 'blubi' }), /differs in: mallow, key/);
  assert.throws(() => buildScore({ log: log() }, { compat: 'v2-score', sound: { tickTempo: 1.05 } }), /differs in: slots/);
  assert.throws(() => buildScore({ log: log() }, { compat: 'v1' }), /unknown compat mode/);
});

test('the fix chain: each documented fix changes only its own part of the plan', () => {
  const input = { log: log(), direction: direction(), spec: spec() };
  const stage = (fixes) => buildScore(input, { fixes }).plan;
  const v2 = buildScore(input, { compat: 'v2-score' }).plan;
  const diff = (a, b) => Object.keys(core(b)).filter((k) => json(core(a)[k]) !== json(core(b)[k]));
  const s1 = stage(['r10']), s2 = stage(['r10', 'r11']), s3 = stage(['r10', 'r11', 'swirl']), s4 = stage([...FIX_ORDER]);
  assert.deepEqual(diff(v2, s1), [], 'R10 is behaviour-neutral on v2\'s log (all its cues exist; the anchored times equal the old literals)');
  assert.deepEqual(diff(s1, s2), ['synth', 'swirl'], 'R11: breath events and whoosh pans');
  assert.deepEqual(diff(s2, s3), ['swirl'], 'swirl at spin_up');
  assert.deepEqual(diff(s3, s4), ['synth', 'ticks', 'crickets', 'bed', 'fade'], 'R7: pre-roll events, crickets, bed window, no fade');
  assert.equal(s4.kit, 'noomi');
  assert.deepEqual(s4.circular, { tail: 4 });
  assert.equal(json(stage(undefined)), json(s4), 'the default is every fix');
});

test('R11: the sleeping breath follows the picture\'s envelope: audible from 11.8 to 13.3 s (v2\'s score was silent there)', () => {
  const input = { log: log(), direction: direction() };
  const breaths = (p) => p.synth.filter((e) => e.inst === 'air' && e.q === 0.8);
  const before = breaths(buildScore(input, { fixes: ['r10'] }).plan), after = breaths(buildScore(input, { fixes: ['r10', 'r11'] }).plan);
  const inWindow = (list) => list.filter((e) => e.t + e.a > 11.8 && e.t < 13.3);
  assert.equal(inWindow(before).length, 0);
  assert.deepEqual(inWindow(after).map((e) => e.t), [12.2], 'the exhale of the breath the body takes at 11.25 s');
  assert.ok(after.find((e) => e.t === 12.2).peak > 0.006, 'at the envelope\'s 0.7 plateau');
  assert.throws(() => buildScore({ log: log() }, { fixes: ['r10', 'r11'] }), /R11 takes the breath envelope from the direction/);
});

test('R11: one pan constant: whoosh pans are world x / 400, as the cue pans (v2: curve pan x / 420)', () => {
  const p = buildScore({ log: log(), direction: direction() }, { fixes: ['r10', 'r11'] }).plan;
  const v2 = buildScore({ log: log() }, { compat: 'v2-score' }).plan;
  const k = 300;   // a sample inside the orbit
  for (let i = 0; i < 3; i++) {
    const a = v2.swirl.items[i].pan[k], b = p.swirl.items[i].pan[k];
    if (Math.abs(a) < 0.95) assert.ok(Math.abs(b - Math.max(-1, Math.min(1, a * 420 / 400))) <= 2e-4, `item ${i}: ${a} → ${b}`);
  }
});

test('swirl at spin_up: no whoosh before the spin_up cue, ramped over 0.5 s, unchanged after', () => {
  const input = { log: log(), direction: direction() };
  const a = buildScore(input, { fixes: ['r10', 'r11'] }).plan.swirl, b = buildScore(input, { fixes: ['r10', 'r11', 'swirl'] }).plan.swirl;
  const spinUp = log().cues.find((c) => c.type === 'spin_up').t;
  assert.equal(a.t0, 2.9, 'the timeline (and the hum) still starts 0.1 s before the first thought');
  for (let i = 0; i < b.items.length; i++) {
    for (let k = 0; k < b.n; k++) {
      const t = b.t0 + k * b.dt;
      if (t <= spinUp) assert.equal(b.items[i].gain[k], 0, `item ${i} at ${t}`);
      if (t >= spinUp + 0.5) assert.equal(b.items[i].gain[k], a.items[i].gain[k]);
    }
    assert.ok(a.items[i].gain.slice(0, Math.round((spinUp - a.t0) / a.dt)).some((g) => g > 0), `v2: item ${i} whooshed before spin_up`);
  }
  assert.deepEqual(b.tension, a.tension, 'the hum is not the swirl');
});

test('R7: circular: nothing before frame 0 or after D, no fade, the bed carries its crossfade', () => {
  const p = buildScore({ log: log(), direction: direction() }).plan;
  for (const e of [...p.engine, ...p.synth, ...p.ticks]) assert.ok(e.t >= 0 && e.t < p.DUR, `${e.inst || e.name || 'tick'} at ${e.t}`);
  for (const c of p.crickets) for (const e of c.ev) assert.ok(e.t >= 0 && e.t + e.dur < p.DUR);
  assert.equal(p.fade, null);
  assert.deepEqual(p.bed.circular, { xfade: 1 });
  assert.ok(p.bed.mood.at(-1).t >= p.DUR + 1, 'the bed mood continues through the crossfade tail');
  const v2 = buildScore({ log: log() }, { compat: 'v2-score' }).plan;
  assert.ok(v2.synth.some((e) => e.t < 0) && v2.ticks[0].t < 0, 'v2 had a synthetic pre-roll');
  // the loop's own last inhale crosses the seam instead of v2's pre-roll copy
  assert.ok(p.synth.some((e) => e.inst === 'air' && Math.abs(e.t - 14.05) < 1e-9));
});

test('R10: no fallback times and full coverage: a missing cue or a cue without a recipe is an error, not a silent default', () => {
  const l = log();
  const without = { ...l, cues: l.cues.filter((c) => c.type !== 'squeeze') };
  assert.ok(buildScore({ log: without }, { compat: 'v2-score' }).plan, 'v2 silently fell back to 6.98 s');
  assert.throws(() => buildScore({ log: without }, { fixes: ['r10'] }), /no 'squeeze' cue .*R10/);
  const extra = { ...l, cues: [...l.cues, { t: 4.2, type: 'kazoo' }] };
  assert.ok(buildScore({ log: extra }, { compat: 'v2-score' }), 'v2 played nothing for an unknown cue');
  assert.throws(() => buildScore({ log: extra }, { fixes: ['r10'] }), /cue 'kazoo' .* has no recipe/);
  const d = direction();
  const bad = { ...d, cues: d.cues.map((c) => (c.type === 'crest' ? { ...c, by: 'C-DRIFT-IN' } : c)) };
  assert.throws(() => buildScore({ log: l, direction: bad }, { fixes: ['r10'] }), /C-DRIFT-IN emits 'crest' but declares no recipe/);
});

test('every cue of T01 resolves to its move\'s recipe; silent ones are declared markers or anchors', () => {
  const { report } = buildScore({ log: log(), direction: direction() });
  for (const c of report.cues) assert.ok(c.recipe, `${c.type} has a recipe`);
  const silent = report.cues.filter((c) => c.role === 'marker' || c.role === 'anchor').map((c) => c.type);
  assert.deepEqual([...new Set(silent)].sort(), ['loop', 'scene', 'spin_up', 'tagline', 'warm_bloom']);
  assert.equal(report.cues.find((c) => c.type === 'take').recipe, 'v2/take');
  assert.equal(report.cues.find((c) => c.type === 'take').by, 'G-JOLT');
});

test('another Mallow: its kit voice, its key on its own scale, its home bed (T01 re-voiced as Blubi in Raindrop Lagoon)', () => {
  const d = direction();
  const blubi = { ...d, mallow: { ...d.mallow, id: 'blubi' }, realm: { ...d.realm, id: 'raindrop-lagoon', tod: 'blue-hour' } };
  const { plan, report } = buildScore({ log: log(), direction: blubi });
  assert.equal(plan.kit, 'blubi');
  assert.equal(plan.bed.realm, 'raindrop-lagoon');
  assert.equal(report.transposition.identity, false);
  assert.ok(!plan.crickets.length, 'no night layer in a realm whose time of day has none');
  const bells = plan.synth.filter((e) => e.inst === 'bell').map((e) => e.f);
  const F = (s) => 698.46 * Math.pow(2, s / 12);
  const near = (f, want) => Math.abs(f - want) < 1e-6 * want;
  for (const s of [21, 24, 28]) assert.ok(bells.some((f) => near(f, F(s))), `the thought ting at F5 + ${s} semitones (A6 C7 E7 → D7 F7 A7)`);
  assert.ok(near(plan.pad.notes[0][0], F(-24)), 'the pad root is F3');
  assert.ok(plan.engine.filter((e) => e.name === 'bubble').every((e) => e.opts.pitch > 1.33 && e.opts.pitch < 1.34));
  const noomi = buildScore({ log: log(), direction: d }).plan;
  assert.equal(json(plan.ticks), json(noomi.ticks), 'timing never depends on the kit');
});

/** T01 re-voiced as Mallow `id` in its home realm */
const voiced = (id) => {
  const d = direction(), sm = readJson(studioPath('library', 'sound', 'soundmap.json'));
  return id === 'noomi' ? d : { ...d, mallow: { ...d.mallow, id }, realm: { ...d.realm, id: sm.mallows[id].bed, tod: 'default' } };
};
const MALLOWS = ['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi'];

test('kit voice models: each kit\'s success phrase as the engine plays it, accent included', () => {
  const at = (id) => kitGestureEvents(mallowSound(id), { t: 0, kind: 'mallow', name: 'success', opts: { intensity: 0.5 } });
  const st = (x) => Math.pow(2, x / 12);
  // Noomi (v2): three music-box notes, then a celesta bell at 2·D(4) and a fifth above it 110 ms later
  const n = at('noomi');
  assert.deepEqual(n.map((e) => +e.t.toFixed(3)), [0, 0.143, 0.286, 0.39, 0.5]);
  assert.deepEqual(n.map((e) => +e.comps[0].f0.toFixed(1)), [523.3, 659.3, 880, 1760, 2640]);   // degrees 0, 2, 4: C5 E5 A5
  // Glitzi: the accent is an FM zap from 2.2·D(4) down to 0.6·D(4) in 90 ms
  const zap = at('glitzi')[3];
  assert.equal(zap.part, 'accent');
  const d4 = 466.16 * st(10);
  assert.ok(Math.abs(zap.comps[0].f0 - 2.2 * d4) < 1e-6 && Math.abs(zap.comps[0].f1 - 0.6 * d4) < 1e-6 && zap.comps[0].glide === 0.09);
  // Zuzu: a swell whose second voice falls from 1.5f to 1.34f
  assert.deepEqual(at('zuzu')[3].comps.map((c) => [+(c.f1 / c.f0).toFixed(4), c.level]), [[1.12, 1], [+(1.34 / 1.5).toFixed(4), 0.7]]);
  // Boppo: a cork pop at clamp(2·D(4), 700, 1400) gliding to 0.27×
  const pop = at('boppo')[3].comps[0];
  assert.ok(Math.abs(pop.f0 - 2 * 329.63 * st(9)) < 1e-6 && Math.abs(pop.f1 / pop.f0 - 0.27) < 1e-9);
  // Blubi: every note and the accent are droplets dropping an octave in 45 ms: the kit's articulation
  assert.ok(at('blubi').every((e) => e.comps.every((c) => c.articulation && Math.abs(c.f1 / c.f0 - 0.5) < 1e-9)));
  // Pipzi: its own four bells every 80 ms (not speed-scaled), no accent
  assert.deepEqual(at('pipzi').map((e) => [+e.t.toFixed(2), e.part]), [[0, 'note'], [0.08, 'note'], [0.16, 'note'], [0.24, 'note']]);
  // Loomi: the low bell at clamp(D(4), 150, 400), on the pitch of its last note
  const lo = at('loomi');
  assert.ok(Math.abs(lo[3].comps[0].f0 - lo[2].comps[0].f0) < 1e-9);
  // which kits' own phrase ends falling (the closing rules on the phrase alone)
  assert.deepEqual(MALLOWS.filter((id) => !contourRules(at(id)).pass), ['glitzi', 'zuzu', 'boppo']);
});

test('all 7 Mallows: T01 builds with each kit and home bed and its last tonal events never fall; Noomi\'s close is v2\'s untouched', () => {
  const noomi = buildScore({ log: log(), direction: direction() });
  const windows = log().cues.filter((c) => HIT.cues.includes(c.type)).map((c) => [c.t - HIT.before, c.t + HIT.after]);
  for (const id of MALLOWS) {
    const { plan, report } = buildScore({ log: log(), direction: voiced(id) });
    assert.equal(plan.kit, id);
    const c = contourCheck(report);
    assert.ok(c.pass, `${id}: ${JSON.stringify(c.falls)}`);
    assert.ok(closeCheck(plan, report).pass, id);
    const success = plan.engine.find((e) => e.name === 'success');
    const added = plan.synth.filter((e) => e.inst === 'bell' && e.t > 12.6 + 1e-9 && e.t < 13.5 && !noomi.plan.synth.some((v) => Math.abs(v.t - e.t) < 1e-9));
    if (id === 'noomi') {
      assert.equal(success.cut, null, 'Noomi: no damping');
      assert.equal(json(plan), json(noomi.plan));
      assert.ok(!report.notes.some((x) => x.startsWith('MO-CLOSE')));
      continue;
    }
    // the gate's own reading (synth bells, pings and blips only) rises too
    assert.ok(contourRules(plan.synth.map(synthTonal).filter(Boolean)).pass, `${id}: the synth-only contour`);
    assert.equal(added.length, 2, `${id}: a two-bell celesta resolution`);
    assert.ok(added[1].f > added[0].f * 1.25, `${id}: the second bell a fifth-ish above the first`);
    const damped = ['glitzi', 'zuzu', 'boppo'].includes(id);
    assert.equal(!!success.cut, damped, `${id}: the voice is damped only where its own accent falls`);
    for (const b of added) assert.ok(!windows.some(([a, z]) => b.t >= a && b.t <= z), `${id}: the resolution bell at ${b.t} keeps out of every cue's hit window`);
    if (damped) {
      const accent = kitGestureEvents(mallowSound(id), success).find((e) => e.part === 'accent');
      assert.ok(Math.abs(success.cut.at + success.cut.fade - accent.t) < 1e-9 && success.cut.fade === CLOSE_DAMP, `${id}: silent where the accent starts`);
      const inWindow = windows.find(([a, z]) => accent.t >= a && accent.t <= z);
      assert.ok(Math.abs(added[0].t - (inWindow ? inWindow[1] + 1e-3 : accent.t)) < 1e-6, `${id}: the resolution answers where the accent was, or just past the hit window it falls in`);
      assert.ok(!report.tonal.some((e) => e.source.endsWith(':accent')), `${id}: the damped accent is not a tonal event`);
    }
    assert.ok(report.notes.some((x) => x.startsWith(`MO-CLOSE (${id})`)));
  }
});

test('the tonal list is every studio bell, ping and blip (the gate\'s set) plus the modelled engine motif sounds', () => {
  const { plan, report } = buildScore({ log: log(), direction: direction() });
  const synth = plan.synth.filter((e) => ['bell', 'ping', 'blip'].includes(e.inst));
  assert.equal(report.tonal.filter((e) => e.source.startsWith('synth:')).length, synth.length);
  assert.equal(report.tonal.filter((e) => e.source.startsWith('kit:noomi:success')).length, 5);
  assert.equal(report.tonal.filter((e) => e.source === 'engine').length, 3, 'the three dissolve chimes');
  assert.ok(report.tonal.filter((e) => e.motif === 'MO-GLASS-RISE').length >= 6, 'the motif labels land on their notes');
});

test('sound slots (audio only): tick tempo, contour and pan seed change the score, not its timing anchors; bad values fail', () => {
  const input = { log: log(), direction: direction() };
  const base = buildScore(input).plan;
  const fast = buildScore(input, { sound: { tickTempo: 1.1 } }).plan;
  assert.ok(fast.ticks.length > base.ticks.length);
  const rise = buildScore(input, { sound: { contour: 'rise-1' } }).plan;
  const chimes = (p) => p.engine.filter((e) => e.name === 'chime').map((e) => e.opts.pitch);
  assert.ok(chimes(rise)[0] < chimes(rise)[2] && chimes(base)[0] > chimes(base)[2], 'rise-1 lifts the dissolve chimes; arch-1 (v2) lets them fall');
  const seeded = buildScore(input, { sound: { panSeed: 7 } }).plan;
  assert.notEqual(json(seeded.synth.filter((e) => e.inst === 'ping')), json(base.synth.filter((e) => e.inst === 'ping')));
  assert.equal(json(seeded.engine), json(base.engine));
  assert.equal(soundSlots(null).panSeed, V2_SEED);
  assert.throws(() => soundSlots(null, { tickTempo: 1.3 }), /tickTempo/);
  assert.throws(() => soundSlots(null, { contour: 'fall-1' }), /unknown sound.contour/);
  assert.throws(() => soundSlots(null, { motifs: ['MO-TICK'] }), /MO-CLOSE/);
});

test('a motif left out of the spec drops its layer', () => {
  const s = spec();
  const noTick = { ...s, sound: { ...s.sound, motifs: s.sound.motifs.filter((m) => m !== 'MO-TICK' && m !== 'MO-HUM') } };
  const { plan, report } = buildScore({ log: log(), direction: direction(), spec: noTick });
  assert.equal(plan.ticks.length, 0);
  assert.equal(plan.swirl.tension, null);
  assert.ok(!report.layers.includes('tick') && !report.layers.includes('hum') && report.layers.includes('swirl'));
});

test('the last tonal events never fall and MO-CLOSE is present, in every contour', () => {
  for (const contour of Object.keys(CONTOURS)) {
    const { plan, report } = buildScore({ log: log(), direction: direction() }, { sound: { contour } });
    const c = contourCheck(report);
    assert.ok(c.pass, `${contour}: ${JSON.stringify(c.last3)}`);
    assert.ok(closeCheck(plan, report).pass, contour);
  }
});

test('the plan is a pure function of its inputs', () => {
  const a = buildScore({ log: log(), direction: direction(), spec: spec() });
  const b = buildScore({ log: log(), direction: direction(), spec: spec() });
  assert.equal(json(a), json(b));
});

test('MO-CLOSE in the phone band: the eyes-open pair is lifted as a unit where its accent would fall below 600 Hz; Noomi\'s is v2\'s', () => {
  const pair = (id) => buildScore({ log: log(), direction: voiced(id) }).plan.synth.filter((e) => e.inst === 'bell' && e.t >= 11.7 - 1e-9 && e.t < 11.85).map((e) => +e.f.toFixed(2));
  assert.deepEqual(pair('noomi'), [783.99, 1046.5], 'v2\'s G5 → C6');
  for (const [id, want] of [['zuzu', [1174.67, 1568]], ['loomi', [1174.67, 1568]], ['pipzi', [1174.66, 1567.98]]]) assert.deepEqual(pair(id), want, `${id}: D5–G5 (587–784 Hz) lifted to D6–G6`);
  for (const id of MALLOWS) assert.ok(Math.min(...pair(id)) >= PHONE_HZ, id);
});

test('MO-CLOSE in the phone band: a closing phrase lying wholly below it (Loomi\'s G3) is doubled by the celesta on the logo; no other kit is', () => {
  for (const id of MALLOWS) {
    const { plan, report } = buildScore({ log: log(), direction: voiced(id) });
    const onLogo = plan.synth.filter((e) => e.inst === 'bell' && Math.abs(e.t - 12.6) < 1e-9);
    if (id === 'loomi') {
      assert.deepEqual(onLogo.map((e) => e.f), [784], 'the first note (196 Hz) two octaves up');
      assert.ok(report.notes.some((n) => /below the phone band/.test(n)));
    } else assert.equal(onLogo.length, 0, id);
  }
});

test('the hit window is the gate\'s: its graded cue types (LOUD | QUIET) and its search window', () => {
  const py = fs.readFileSync(studioPath('qa', 'gates', 'audio.py'), 'utf8');
  const set = (name) => [...py.match(new RegExp(`^${name} = \\{([^}]*)\\}`, 'm'))[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual([...HIT.cues].sort(), [...set('LOUD'), ...set('QUIET')].sort());
  const sync = readJson(studioPath('qa', 'gates', 'thresholds.json')).gates['G-AUDIO'].sync;
  assert.deepEqual([-HIT.before * 1000, HIT.after * 1000], sync.searchMs);
});

test('hit sync inputs: an advance starts the cue\'s kit gesture earlier (its cut with it), a soften lowers one studio event; compat takes neither', () => {
  const input = { log: log(), direction: voiced('glitzi') };
  const base = buildScore(input), take = base.report.cues.findIndex((c) => c.type === 'take'), open = base.report.cues.findIndex((c) => c.type === 'eyes_open');
  const moved = buildScore(input, { sync: { advance: { [take]: 0.129 }, soften: { [open]: { 1: 3 } } } });
  const surprise = (p) => p.engine.find((e) => e.name === 'surprise');
  assert.ok(Math.abs(surprise(moved.plan).t - (surprise(base.plan).t - 0.129)) < 1e-12);
  assert.equal(json(moved.plan.engine.filter((e) => e.name !== 'surprise')), json(base.plan.engine.filter((e) => e.name !== 'surprise')), 'nothing else moves');
  const answer = (p) => p.synth.find((e) => e.inst === 'bell' && Math.abs(e.t - 11.81) < 1e-6);
  assert.ok(Math.abs(answer(moved.plan).peak - answer(base.plan).peak * 10 ** (-3 / 20)) < 1e-12);
  assert.deepEqual(moved.report.kitVoices.find((v) => v.cue === take), { cue: take, cueT: 0.4, t: 0.4 - 0.129, offset: 0, advance: 0.129, name: 'surprise' });
  assert.throws(() => buildScore({ log: log() }, { compat: 'v2-score', sync: { advance: { 2: 0.1 } } }), /takes no hit sync/);
  assert.throws(() => buildScore(input, { sync: { advance: { [take]: SYNC_MAX + 0.01 } } }), /hit sync advance/);
});

test('hit moves: a late note of a kit gesture syncs that gesture to its own cue; a loud answer is softened; what neither reaches is reported', () => {
  const { report } = buildScore({ log: log(), direction: voiced('glitzi') });
  const idx = (type) => report.cues.findIndex((c) => c.type === type);
  const hit = (type, errorMs, lateDb = 6) => ({ i: idx(type), t: report.cues[idx(type)].t, type, graded: true, pass: false, errorMs, lateDb, toleranceMs: 20 });
  // lift_off (20 ms after the take) heard 109 ms late: the take's surprise sounds there → the take's gesture starts 129 ms early
  let m = hitMoves({ report, hits: [hit('lift_off', 109.2)] });
  assert.deepEqual(m.sync.advance, { [idx('take')]: 0.1292 });
  // the logo heard 91 ms late: its own success phrase → 91 ms early; heard late again by 96 ms after that → 187 ms
  m = hitMoves({ report, hits: [hit('logo', 90.9)] });
  assert.deepEqual(m.sync.advance, { [idx('logo')]: 0.0909 });
  const again = buildScore({ log: log(), direction: voiced('glitzi') }, { sync: m.sync }).report;
  assert.deepEqual(hitMoves({ report: again, hits: [hit('logo', 96.3)], sync: m.sync }).sync.advance, { [idx('logo')]: 0.1872 });
  // eyes_open heard at its answer bell (+110 ms, 2 dB over the accent): that bell is softened by 2 + 1.5 dB
  m = hitMoves({ report, hits: [hit('eyes_open', 110, 2)] });
  assert.deepEqual(m.sync.soften, { [idx('eyes_open')]: { 1: 3.5 } });
  assert.deepEqual(m.sync.advance, {});
  // early, or a studio note that is not an answer (the take's own eye-pop), or past SYNC_MAX: reported, not moved
  const far = { advance: { [idx('logo')]: 0.25 }, soften: {} };
  const farReport = buildScore({ log: log(), direction: voiced('glitzi') }, { sync: far }).report;
  m = hitMoves({ report: farReport, hits: [hit('take', -40), hit('land', 8.5), hit('logo', 120)], sync: far });
  assert.equal(m.moves.length, 0, m.moves.join('; '));
  assert.deepEqual(m.unresolved.map((h) => h.type), ['take', 'land', 'logo'], 'early; the landing\'s own bloop (not an answer); 0.25 + 0.12 s > SYNC_MAX');
});

test('hit moves: a clock tick heard as a cue\'s hit moves out of that cue\'s hit window (v2 kept only 80 ms); nothing else moves', () => {
  const input = { log: log(), direction: direction() };
  const { plan, report } = buildScore(input);
  const four = report.cues.findIndex((c) => c.type === 'thought' && c.t === 4);
  const tick = plan.ticks.find((k) => k.t > 4 && k.t < 4.12);
  assert.ok(tick, 'v2\'s clock ticks 83 ms after the second thought');
  const m = hitMoves({ report, plan, hits: [{ i: four, t: 4, type: 'thought', graded: true, pass: false, errorMs: (tick.t - 4) * 1000, lateDb: 1 }] });
  assert.deepEqual(m.sync.clearTicks, { [four]: true });
  const moved = buildScore(input, { sync: m.sync }).plan;
  assert.ok(!moved.ticks.some((k) => k.t > 4 - 0.08 && k.t < 4 + HIT.after), 'no tick inside the thought\'s hit window');
  assert.equal(json(moved.ticks.filter((k) => k.t < 4)), json(plan.ticks.filter((k) => k.t < 4)), 'the clock before it is untouched');
  assert.equal(json({ ...moved, ticks: null }), json({ ...plan, ticks: null }), 'only the clock moves');
});
