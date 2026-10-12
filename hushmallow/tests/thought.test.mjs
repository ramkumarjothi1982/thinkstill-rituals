// Thought Mallows and Belief Mallows (W2 stage 2): the style table, emotion
// names, tints that stay clear of the seven, every feeling's motion signature,
// the verbs (none of which removes a thought), squeeze / carry / stroke / toss
// / pinch with the same TouchReader as MallowTouch, the words a tag shows, and
// each Belief prop's weight working through the soft body.
// Run: node --test hushmallow/tests/thought.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createThought, ThoughtMallow, PT } from '../src/mallows/thought/thought.js';
import { createBelief, PROPS, PROP_WEIGHT } from '../src/mallows/thought/belief.js';
import { THOUGHT_STYLES, THOUGHT_KINDS, CALM_TINT, FACE_KEYS, SHAPE, TAG_MIN_PX, normaliseEmotion, styleFor, deriveLook, outlineUV, insideUV, tagBudget, hexRgb, siblingCount, wordsExcerpt } from '../src/mallows/thought/styles.js';
import { MALLOWS, MALLOW_IDS } from '../src/mallows/registry.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const DT = 1 / 60;
const VIEW = { W: 390, H: 844 };
const BOUNDS = { left: 16, top: 64, right: 374, bottom: 820 };
let T = 1000;                       // simulated clock (s); pointer times are T * 1000 ms
const env = (o = {}) => ({ now: T, view: VIEW, bounds: BOUNDS, rm: false, low: false, ...o });
function sim(th, sec, fn, o) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { fn?.(i); T += DT; th.step(DT, env(o)); } }
const thought = (emotion, o = {}) => createThought({ text: 'My boss embarrassed me today.', emotion, intensity: 0.75, x: 200, y: 400, ...o });
const ptr = (th, type, x, y, id = 1) => th.pointer({ type, id, x, y, t: T * 1000 });
const finite = (a) => Array.from(a).every(Number.isFinite);

// --------------------------------------------------------------- styles --
test('styles: every feeling has a complete look, and the shape is rounder than the seven', () => {
  for (const k of THOUGHT_KINDS) {
    const s = THOUGHT_STYLES[k];
    assert.ok(s, k);
    for (const key of ['light', 'mid', 'deep', 'glow', 'ink']) assert.match(s.tint[key], /^#[0-9a-f]{6}$/i, `${k}.${key}`);
    for (const f of FACE_KEYS) assert.ok(Number.isFinite(s.face[f]), `${k}.face.${f}`);
    assert.ok(s.tension > 0 && s.tension <= 1 && s.charge > 0 && s.charge <= 1);
  }
  // the seven's family silhouette fits n ≈ 3.0 (audit); a Thought Mallow is clearly rounder
  assert.ok(SHAPE.n < 2.6, `n ${SHAPE.n}`);
  const O = outlineUV(44);
  assert.equal(O.length, 88);
  for (let i = 0; i < O.length; i++) assert.ok(O[i] >= 0 && O[i] <= 1);
  assert.ok(insideUV(0.5, 0.5) && !insideUV(0.02, 0.02), 'corners are outside the round body');
});

test('styles: emotion words, chip ids and A–Z ids all find a style', () => {
  const cases = { angry: 'anger', Anger: 'anger', frustrated: 'frustration', anxious: 'anxiety', worried: 'anxiety', overthinking: 'overwhelm', overwhelmed: 'overwhelm',
    sad: 'sadness', grief: 'sadness', lonely: 'loneliness', embarrassed: 'embarrassment', shame: 'embarrassment', restless: 'restlessness', 'something else': 'neutral',
    // families of the A–Z picker
    resentment: 'anger', dread: 'anxiety', guilt: 'embarrassment', heartbreak: 'sadness', 'not-a-feeling': 'neutral', '': 'neutral' };
  for (const [k, v] of Object.entries(cases)) assert.equal(normaliseEmotion(k), v, k);
  assert.equal(normaliseEmotion({ id: 'anxiety' }), 'anxiety');
  assert.equal(normaliseEmotion([{ id: 'sadness' }]), 'sadness');
  assert.equal(normaliseEmotion(null), 'neutral');
  assert.equal(styleFor('angry').id, 'anger');
});

// CIE76 ΔE between two hex colours
function lab(hex) {
  const [r, g, b] = hexRgb(hex).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };

test('styles: tints are distinct from each other and from every Mallow body', () => {
  const kinds = THOUGHT_KINDS.filter((k) => k !== 'neutral');
  for (let i = 0; i < kinds.length; i++) for (let j = i + 1; j < kinds.length; j++) {
    const d = dE(THOUGHT_STYLES[kinds[i]].tint.mid, THOUGHT_STYLES[kinds[j]].tint.mid);
    assert.ok(d >= 12, `${kinds[i]} vs ${kinds[j]}: ΔE ${d.toFixed(1)}`);
  }
  for (const k of THOUGHT_KINDS) for (const id of MALLOW_IDS) {
    const d = dE(THOUGHT_STYLES[k].tint.mid, MALLOWS[id].colours.body);
    assert.ok(d >= 20, `${k} vs ${id}: ΔE ${d.toFixed(1)}`);
  }
  for (const k of kinds) assert.ok(dE(THOUGHT_STYLES[k].tint.mid, CALM_TINT.mid) >= 10, `${k} vs calm`);
});

test('look: transform leads to the calm palette and the relieved face; care eases the feeling', () => {
  const s = THOUGHT_STYLES.anger;
  const base = { tension: 0.9, charge: 0.85, calm: 0, transform: 0, soft: 0, settle: 0, space: 0, slow: 0 };
  const a = structuredClone(deriveLook(s, base));
  const b = structuredClone(deriveLook(s, { ...base, transform: 1 }));
  assert.ok(a.e > 0.8 && a.fx.crackle > 1.5 && a.face.browA > 0.8 && a.body.puff > 1);
  assert.ok(b.e < 0.12 && b.relief === 1 && b.tintK === 1 && b.face.closed > 0.8 && b.face.curve > 0.6 && b.fx.crackle < 0.3);
  const soft = deriveLook(s, { ...base, soft: 1, calm: 0.5 });
  assert.ok(soft.e < a.e && soft.fx.crackle < a.fx.crackle);
  const slow = deriveLook(s, { ...base, slow: 1 });
  assert.ok(slow.pace < a.pace * 0.5, 'slowing slows it');
  // photosafe: never more than 3 arcs a second
  assert.ok(deriveLook(s, { ...base, tension: 1, charge: 1 }).fx.crackle <= 3);
});

// ---------------------------------------------------- motion signatures --
function signature(emotion, sec = 4, o = {}) {
  T += 10;
  const th = thought(emotion, o);
  sim(th, 1.2);
  let jitter = 0, crossings = 0, lastSign = 0, sumY = 0, n = 0, darts = 0, lastTx = th.gaze.tx;
  let px = th.off.x, py = th.off.y;
  const ys = [];
  sim(th, sec, () => { ys.push(th.off.y); });
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  T += 0;
  // replay for jitter / crossings / darts (deterministic second pass)
  sim(th, sec, () => {
    jitter += Math.hypot(th.off.x - px, th.off.y - py); px = th.off.x; py = th.off.y;
    const sg = Math.sign(th.off.y - mean); if (sg && lastSign && sg !== lastSign) crossings++; if (sg) lastSign = sg;
    sumY += th.off.y; n++;
    if (th.gaze.tx !== lastTx) { darts++; lastTx = th.gaze.tx; }
  });
  return { th, jitter: jitter / sec, crossings: crossings / sec, meanY: sumY / n, darts: darts / sec };
}

test('motion: anxiety trembles and its gaze darts; anger is tense; sadness is slow and sinks', () => {
  const neutral = signature('neutral'), anx = signature('anxiety'), anger = signature('anger'), sad = signature('sadness');
  assert.ok(anx.jitter > neutral.jitter * 4, `anxiety jitter ${anx.jitter.toFixed(1)} vs ${neutral.jitter.toFixed(1)}`);
  assert.ok(anger.jitter > neutral.jitter * 3, `anger jitter ${anger.jitter.toFixed(1)}`);
  assert.ok(anx.darts >= 1, `gaze darts ${anx.darts.toFixed(2)}/s`);
  assert.equal(neutral.darts, 0);
  assert.ok(sad.crossings < anx.crossings, `sadness bobs slower (${sad.crossings.toFixed(2)} vs ${anx.crossings.toFixed(2)} /s)`);
  assert.ok(sad.meanY > 0.25 * sad.th.render.P, `sadness sinks ${sad.meanY.toFixed(1)} px`);
  assert.ok(sad.th.look.body.droop > 0.5, 'and droops');
  assert.ok(sad.th.look.fx.rain > 1, 'under a light rain');
});

test('motion: anger crackles (≤ 3 arcs/s) with puffed cheeks; frustration huffs steam', () => {
  T += 10;
  const anger = thought('anger'), calm = thought('neutral');
  // count arcs as they are born (a pool slot's life jumps back up)
  let arcs = 0;
  const last = anger.fx.arcs.map((a) => a.life);
  sim(anger, 4, () => anger.fx.arcs.forEach((a, i) => { if (a.life > last[i] + 0.5) arcs++; last[i] = a.life; }));
  sim(calm, 4);
  assert.ok(arcs >= 6 && arcs <= 14, `${arcs} arcs in 4 s`);
  // puffed cheeks: the body is wider at cheek height than a calm thought's
  const width = (th) => { const L = th.point(PT.left), R = th.point(PT.right); return (R.x - L.x) / th.render.P; };
  assert.ok(width(anger) > width(calm) + 0.02, `cheeks ${width(anger).toFixed(3)} vs ${width(calm).toFixed(3)}`);
  const fr = thought('frustration');
  let puffs = 0;
  sim(fr, 6, () => { puffs = Math.max(puffs, fr.fx.puffs.filter((p) => p.life > 0).length); });
  assert.ok(puffs >= 2, `steam puffs ${puffs}`);
});

test('motion: loneliness drifts apart; embarrassment blushes and shrinks', () => {
  T += 10;
  const lonely = thought('loneliness'), calm = thought('neutral');
  const away = { x: 100, y: 400 };
  sim(lonely, 1, null, { away });
  const d0 = Math.hypot(lonely.render.cx - away.x, lonely.render.cy - away.y);
  sim(lonely, 10, null, { away });
  const d1 = Math.hypot(lonely.render.cx - away.x, lonely.render.cy - away.y);
  assert.ok(d1 > d0 + 20, `drifted ${d0.toFixed(0)} → ${d1.toFixed(0)}`);
  const emb = thought('embarrassment');
  sim(emb, 2); sim(calm, 2);
  assert.ok(emb.render.P < calm.render.P * 0.9, `shrinks ${emb.render.P.toFixed(1)} vs ${calm.render.P.toFixed(1)}`);
  assert.ok(emb.look.face.blush > 1 && emb.look.face.lines > 0.5, 'blushes');
});

test('overthinking: 3–4 smaller siblings mouthing over one another; room quiets them', () => {
  T += 10;
  const th = thought('overthinking');
  assert.ok(th.siblings.length >= 3 && th.siblings.length <= 4, `${th.siblings.length} siblings`);
  assert.equal(thought('anger').siblings.length, 0);
  assert.equal(siblingCount(styleFor('overwhelm'), 0.4), 3);
  for (const s of th.siblings) assert.ok(s.r < th.r * 0.65 && s.kind === 'sibling' && !s.text);
  const talk = th.siblings.map(() => []);
  sim(th, 4, () => th.siblings.forEach((s, i) => talk[i].push(s.talk)));
  for (const t of talk) assert.ok(Math.max(...t) > 0.4, 'each one talks');
  // out of phase: no two siblings move their mouths together
  const corr = (a, b) => { const ma = a.reduce((x, y) => x + y) / a.length, mb = b.reduce((x, y) => x + y) / b.length; let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb || 1); };
  for (let i = 0; i < talk.length; i++) for (let j = i + 1; j < talk.length; j++) assert.ok(corr(talk[i], talk[j]) < 0.7, `siblings ${i},${j} in sync`);
  // crowded at first, spread out with room, quiet once soothed
  const spread = () => th.siblings.reduce((a, s) => a + Math.hypot(s.home.x - th.x, s.home.y - th.y), 0) / th.siblings.length;
  const before = spread();
  th.makeSpace(1); sim(th, 3);
  assert.ok(spread() > before * 1.25, `spread ${before.toFixed(0)} → ${spread().toFixed(0)}`);
  th.transform(1); sim(th, 4);
  const loud = th.siblings.map(() => 0);
  sim(th, 2, () => th.siblings.forEach((s, i) => { loud[i] = Math.max(loud[i], s.talk); }));
  for (const l of loud) assert.ok(l < 0.15, `still chattering ${l.toFixed(2)}`);
});

// ---------------------------------------------------------------- verbs --
test('verbs: soften, slow, settle, transform, farther — and none removes the thought', () => {
  T += 10;
  const th = thought('anger');
  sim(th, 1);
  const kG0 = th.sb.material.kG, P0 = th.render.P, pace0 = th.look.pace, sink0 = th._sink;
  th.soften(1); sim(th, 2);
  assert.ok(th.sb.material.kG < kG0 * 0.8, 'softer jelly');
  th.slow(1); sim(th, 2);
  assert.ok(th.look.pace < pace0 * 0.6, 'slower');
  th.settle(1); sim(th, 4);
  assert.ok(th._sink > sink0 + 3, 'settles lower');
  th.transform(1); sim(th, 3);
  assert.ok(th.look.tintK > 0.95 && th.look.face.closed > 0.6 && th.look.fx.crackle < 0.2, 'transformed: calm palette, relieved');
  th.farther(1); sim(th, 3);
  assert.ok(th.z > 0.95 && th.render.P < P0 * 0.6, 'farther away');
  // closer(k) eases to distance level k, as farther(k) does (no argument: one step nearer)
  th.closer(0); sim(th, 3);
  assert.ok(th.z < 0.05);
  th.farther(0.6); th.closer(); assert.ok(Math.abs(th.zGoal - 0.3) < 1e-9, 'a step nearer');
  th.makeSpace(1); th.soften(); th.slow(); th.settle(); th.transform(); sim(th, 1);
  assert.equal(th.destroyed, false);
  assert.ok(finite(th.sb.positions) && finite(th.render.outline));
  // no argument adds a step; a level eases (never jumps)
  const t2 = thought('neutral');
  t2.soften(); assert.ok(Math.abs(t2.levels.soft.goal - 0.34) < 1e-9);
  t2.soften(); assert.ok(Math.abs(t2.levels.soft.goal - 0.68) < 1e-9);
  assert.equal(t2.levels.soft.cur, 0);
});

test('state: a world may write x, y, scale and state; what it writes wins', () => {
  T += 10;
  const th = thought('anger');
  sim(th, 1);
  sim(th, 1, (i) => { th.x = 120 + i; th.y = 300; th.state.tension = 0.05; th.state.calm = 0.9; });
  assert.ok(th.driven);
  assert.ok(Math.abs(th.x - 179) < 1e-6 && th.home.x === th.x, 'positioned exactly');
  assert.ok(th.look.e < 0.3, `the written calm shows (${th.look.e.toFixed(2)})`);
  sim(th, 1.5);
  assert.ok(!th.driven && th.state.tension > 0.6, 'back to its own feeling once nobody writes');
  th.state.distance = 0.8; sim(th, 2);
  assert.ok(th.z > 0.7);
  // no draw(): the world positions it and the ThoughtLayer renders it
  assert.equal(typeof th.draw, 'undefined');
});

// ---------------------------------------------------------------- touch --
test('touch: press and hold squeezes it (dent, flatter, cheeks puff), release springs back and softens', () => {
  T += 10;
  const th = thought('anger', { x: 200, y: 400 });
  sim(th, 1.5);
  const h0 = th.bodyRect().height, soft0 = th.earned.soft, calm0 = th.earned.calm;
  assert.ok(ptr(th, 'down', th.render.cx, th.render.cy - th.render.P * 0.15));
  sim(th, 0.9);
  assert.ok(th.touch.depth > 0.6, `depth ${th.touch.depth.toFixed(2)}`);
  assert.ok(th.bodyRect().height < h0 * 0.95, `squashed ${h0.toFixed(1)} → ${th.bodyRect().height.toFixed(1)}`);
  ptr(th, 'up', th.render.cx, th.render.cy - th.render.P * 0.15);
  let peak = 0;
  sim(th, 0.6, () => { peak = Math.max(peak, th.bodyRect().height); });
  assert.ok(peak > h0 * 1.01, 'the jelly rebounds past its rest height');
  sim(th, 3);
  assert.ok(Math.abs(th.bodyRect().height - h0) < h0 * 0.03, 'and settles');
  assert.ok(th.earned.soft > soft0 && th.earned.calm > calm0, 'each squeeze softens it a little');
});

test('touch: press then drag carries it (the jelly trails, it never slips); put down it stays', () => {
  T += 10;
  const th = thought('sadness', { x: 200, y: 400 });
  sim(th, 1);
  const x0 = th.x, cx = th.render.cx, cy = th.render.cy;
  ptr(th, 'down', cx, cy);
  sim(th, 0.4);
  let stretched = 0;
  sim(th, 0.5, (i) => { if (i < 25) ptr(th, 'move', cx + (i + 1) * 5, cy); stretched = Math.max(stretched, th.sb.energy); });
  assert.ok(th.touch.carried, 'carried');
  assert.ok(th.x > x0 + 90, `moved ${(th.x - x0).toFixed(0)} px`);
  assert.ok(th.sb.ptr.has(1) && !th.sb.ptr.get(1).slipping, 'still holding the material');
  assert.ok(stretched > 1e-4, 'the jelly deformed while carried');
  ptr(th, 'up', cx + 125, cy);
  sim(th, 2);
  assert.ok(Math.abs(th.x - th.home.x) < 2 && th.x > x0 + 90, 'it rests where it was put');
});

test('touch: a quick slide that leaves the body picks it up; strokes over it soothe; a flick tosses it farther', () => {
  T += 10;
  const a = thought('anxiety', { x: 200, y: 400 });
  sim(a, 1);
  const cx = a.render.cx, cy = a.render.cy, x0 = a.x;
  ptr(a, 'down', cx, cy);
  sim(a, 0.5, (i) => { if (i < 20) ptr(a, 'move', cx + (i + 1) * 6, cy); });
  assert.ok(a.touch.carried && a.x > x0 + 50, 'slid off the edge → carried');
  ptr(a, 'up', cx + 120, cy); sim(a, 1);

  const b = thought('anxiety', { x: 200, y: 400 });
  sim(b, 1);
  const bx = b.render.cx, by = b.render.cy, calm0 = b.earned.calm;
  ptr(b, 'down', bx - 20, by);
  // gentle strokes back and forth across it, staying on the body
  sim(b, 2.2, (i) => { const ph = (i % 40) / 40, d = ph < 0.5 ? ph * 2 : 2 - ph * 2; ptr(b, 'move', bx - 20 + 40 * d, by); });
  ptr(b, 'up', bx, by);
  sim(b, 0.3);
  assert.ok(!b.touch.carried, 'stroking does not carry it');
  assert.ok(b.earned.calm > calm0 + 0.1, `soothed ${calm0.toFixed(2)} → ${b.earned.calm.toFixed(2)}`);

  const c = thought('anger', { x: 200, y: 400 });
  sim(c, 1);
  const z0 = c.zGoal, fx = c.render.cx, fy = c.render.cy;
  ptr(c, 'down', fx, fy);
  T += 0.016; ptr(c, 'move', fx + 10, fy - 8); T += 0.016; ptr(c, 'move', fx + 22, fy - 18); T += 0.016; ptr(c, 'move', fx + 34, fy - 28);
  ptr(c, 'up', fx + 34, fy - 28);
  assert.ok(c.zGoal > z0 + 0.1, `tossed farther (z ${z0} → ${c.zGoal.toFixed(2)})`);
  sim(c, 2);
  assert.ok(c.z > 0.1 && !c.destroyed);
});

test('touch: two fingers — pinch sends it farther, spread stretches it (with a waist)', () => {
  T += 10;
  const th = thought('neutral', { x: 200, y: 400, r: 46 });
  sim(th, 1);
  const cx = th.render.cx, cy = th.render.cy, w0 = th.bodyRect().width;
  ptr(th, 'down', cx - 22, cy, 1); ptr(th, 'down', cx + 22, cy, 2);
  sim(th, 0.6, (i) => { if (i < 20) { const d = 22 + (i + 1) * 1.8; ptr(th, 'move', cx - d, cy, 1); ptr(th, 'move', cx + d, cy, 2); } });
  assert.ok(th.touch.stretch > 1.3 && th.bodyRect().width > w0 * 1.1, `stretched ${(th.bodyRect().width / w0).toFixed(2)}×`);
  sim(th, 0.6, (i) => { if (i < 30) { const d = 58 - (i + 1) * 1.6; ptr(th, 'move', cx - d, cy, 1); ptr(th, 'move', cx + d, cy, 2); } });
  ptr(th, 'up', cx - 10, cy, 1); ptr(th, 'up', cx + 10, cy, 2);
  assert.ok(th.zGoal > 0.3, `pinched farther (z ${th.zGoal.toFixed(2)})`);
});

test('hit test: on the body, not beside it; small siblings still give a 48 px target', () => {
  T += 10;
  const th = thought('overwhelm', { x: 200, y: 400 });
  sim(th, 1.5);
  const R = th.render;
  assert.ok(th.hitTest(R.cx, R.cy));
  assert.ok(!th.hitTest(R.cx + R.W, R.cy));
  assert.ok(!th.hitTest(R.cx + R.W * 0.48, R.cy - R.P * 0.48), 'the corner of its box is not body');
  const s = th.siblings[0];
  assert.ok(s.render.W < 48);
  assert.ok(s.hitTest(s.render.cx + 22, s.render.cy), 'a small body is still easy to touch');
});

// ---------------------------------------------------------------- words --
test('words: the tag shows the exact words (an excerpt only when long or far), never below 15 px', () => {
  assert.ok(TAG_MIN_PX >= 15);
  const short = thought('anger');
  assert.equal(short.tokenAt(0), 'My boss embarrassed me today.');
  const text = 'I keep replaying what I said in the meeting and I am sure everyone thinks I am useless now, which is exhausting to carry around all day';
  const th = createThought({ text, emotion: 'anxiety' });
  assert.equal(th.text, text, 'kept exactly');
  const words = text.split(' ');
  for (const z of [0, 0.5, 0.9]) {
    const tok = th.tokenAt(z);
    assert.ok(tok.length <= tagBudget(z) + 1, `${z}: ${tok}`);
    assert.ok(tok.endsWith('…'));
    // an excerpt is the person's own words, in order (cut at a word, nothing reworded)
    const got = tok.replace(/…$/, '');
    assert.ok(text.startsWith(got), `${tok} is the start of the words`);
    assert.ok(words.includes(got.split(' ').pop()) || words.some((w) => w.startsWith(got.split(' ').pop())), 'cut at a word');
  }
  assert.ok(th.tokenAt(0.9).length < th.tokenAt(0).length, 'far away shows fewer words (all of them a tap away)');
  // one very long word is cut inside it; emoji stay whole
  assert.equal(wordsExcerpt('Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 10), 'Aaaaaaaaa…');
  assert.equal(Array.from(wordsExcerpt('😀😀😀😀😀😀😀😀😀😀😀😀', 6)).length, 6);
  // markup stays text
  const odd = createThought({ text: '<b>not bold</b> & <img src=x onerror=alert(1)>' });
  assert.equal(odd.tokenAt(0), '<b>not bold</b> & <img src=x onerror=alert(1)>');
});

test('words: the layer sets words with textContent only and never scales the tag', () => {
  const src = readFileSync(root + 'src/mallows/thought/layer.js', 'utf8');
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML/.test(src), 'no HTML parsing');
  assert.match(src, /words\.textContent = text/);
  assert.match(src, /p\.textContent = th\.text/);
  assert.ok(!/scale\(/.test(src.replace(/\/\/.*$/gm, '').replace(/getBoundingClientRect|devicePixelRatio/g, '')), 'tags are never scaled');
  const sizes = [...src.matchAll(/font(?:-size)?:\s*(?:\d+\s+)?(\d+)px/g)].map((m) => +m[1]);
  assert.ok(sizes.length && sizes.every((px) => px >= 15), `font sizes ${sizes}`);
  const render = readFileSync(root + 'src/mallows/thought/render.js', 'utf8');
  assert.ok(!/fillText|strokeText/.test(render), 'the words are never painted onto the body');
});

// -------------------------------------------------------------- beliefs --
test('beliefs: 1.4× a thought, each prop weighs on the jelly, exploring lightens it', () => {
  for (const prop of PROPS) {
    T += 10;
    const b = createBelief({ text: 'I must always be perfect.', prop, x: 200, y: 400 });
    const t = thought('neutral');
    sim(b, 3); sim(t, 0.1);
    assert.equal(b.kind, 'belief');
    assert.ok(Math.abs(b.r / t.r - 1.4) < 1e-9, '1.4×');
    assert.ok(b.alpha > t.alpha, 'denser jelly');
    assert.ok(b.weight > 0.2 && Math.abs(b.weight - PROP_WEIGHT[prop]) < 1e-9);
    const r0 = b.bodyRect();
    const P = b.sb.positions, c = b.sb.cols;
    if (prop === 'stone') {
      // the stone's side of the head sinks under it
      const yL = P[2 * 2 + 1], yR = P[2 * (c - 3) + 1];
      assert.ok(yR > yL + 0.04, `stone side lower: ${yL.toFixed(3)} vs ${yR.toFixed(3)}`);
      assert.ok(r0.height < r0.width * 0.75, 'pressed flatter');
    }
    if (prop === 'thread') {
      const L = b.point(PT.left), R = b.point(PT.right);
      assert.ok((R.x - L.x) < b.render.W * 0.92, 'a pinched waist');
    }
    if (prop === 'shell') assert.ok(r0.height < r0.width * 0.9, 'the shell presses it a little');
    if (prop === 'charm') { assert.ok(b.propState.y > b.point(PT.left).y, 'the charm hangs below where it is tied'); assert.ok(b.propState.chain.init); }
    // exploring: the prop gets lighter and looser, the body comes back up
    b.explore(1); sim(b, 4);
    assert.ok(b.explored > 0.95 && b.weight < PROP_WEIGHT[prop] * 0.3, `${prop}: weight ${b.weight.toFixed(2)}`);
    const r1 = b.bodyRect();
    if (prop === 'stone' || prop === 'shell') assert.ok(r1.height > r0.height + 2, `${prop}: lifts ${r0.height.toFixed(1)} → ${r1.height.toFixed(1)}`);
    if (prop === 'thread') { const L = b.point(PT.left), R = b.point(PT.right); assert.ok((R.x - L.x) > b.render.W * 0.95, 'the waist lets go'); }
    if (prop === 'stone') { assert.ok(b.propState.down === 1 && b.propState.landed, 'the stone is set down beside it'); assert.ok(b.propState.x > r1.right, 'beside, not on it'); }
    assert.equal(b.destroyed, false);
    // saved as words + levels, never pixels
    const j = b.toJSON();
    assert.equal(j.prop, prop); assert.equal(j.text, 'I must always be perfect.');
    assert.ok(!JSON.stringify(j).includes('data:'));
    const back = createBelief({ text: j.text, prop: j.prop }).restore(j);
    assert.ok(back.explored > 0.95);
  }
});

test('beliefs: the person exploring by touch loosens the prop too', () => {
  T += 10;
  const b = createBelief({ text: 'Everybody judges me.', prop: 'thread', x: 200, y: 400 });
  sim(b, 1);
  const w0 = b.weight;
  for (let k = 0; k < 6; k++) {
    const cx = b.render.cx, cy = b.render.cy;
    ptr(b, 'down', cx, cy - 10);
    sim(b, 0.8);
    ptr(b, 'up', cx, cy - 10);
    sim(b, 0.6);
  }
  assert.ok(b.weight < w0 * 0.8, `squeezes loosen it: ${w0.toFixed(2)} → ${b.weight.toFixed(2)}`);
});

// --------------------------------------------------------- reduced motion --
test('reduced motion: no trembling, darting or bobbing offsets; the jelly is critically damped', () => {
  T += 10;
  const th = thought('anxiety', { reducedMotion: true });
  sim(th, 1, null, { rm: true });
  let move = 0, px = th.off.x, py = th.off.y;
  sim(th, 2, () => { move += Math.hypot(th.off.x - px, th.off.y - py); px = th.off.x; py = th.off.y; }, { rm: true });
  assert.ok(move < 6, `moved ${move.toFixed(1)} px in 2 s`);
  // a squeeze still follows the finger 1:1, without overshoot
  ptr(th, 'down', th.render.cx, th.render.cy);
  sim(th, 0.8, null, { rm: true });
  assert.ok(th.touch.depth > 0.5);
  const h = th.bodyRect().height;
  ptr(th, 'up', th.render.cx, th.render.cy);
  let peak = 0;
  sim(th, 1, () => { peak = Math.max(peak, th.bodyRect().height); }, { rm: true });
  const rest = thought('anxiety', { reducedMotion: true }); sim(rest, 1, null, { rm: true });
  assert.ok(peak <= rest.bodyRect().height * 1.01, 'no rebound overshoot');
  void h;
});

test('frame: the render buffers are reused (no per-frame allocation of big arrays)', () => {
  T += 10;
  const th = thought('overwhelm');
  const O = th.render.outline, Q = th.render.pts, Pp = th.sb.positions;
  sim(th, 1);
  assert.equal(th.render.outline, O); assert.equal(th.render.pts, Q); assert.equal(th.sb.positions, Pp);
  assert.ok(th instanceof ThoughtMallow && th.sb.cols === 10 && th.sb.rows === 10, 'SoftBody 10×10');
});

// ------------------------------------------------- integration contracts --
test('layer: the Hushfold placeholder shape (add / list / hitTest / pointer / rects / remove) and the director', async () => {
  const { ThoughtLayer } = await import('../src/mallows/thought/layer.js');
  const { thoughtList, primaryThought } = await import('../src/hushfold/flow/director.js');
  const hero = { left: 40, top: 300, right: 180, bottom: 440 };
  const L = new ThoughtLayer({ bounds: () => BOUNDS, keepOut: () => hero, reducedMotion: false });
  let changed = 0;
  L.onChange = () => { changed++; };
  // W3 calls add({text, emotion, intensity, from, home, r})
  const a = L.add({ text: 'My boss embarrassed me today.', emotion: 'embarrassment', intensity: 0.7, from: { x: 120, y: 250 }, home: { x: 300, y: 380 }, r: 38 });
  const b = L.add({ text: 'Everybody judges me.', prop: 'stone' }, { x: 120, y: 360 });     // on the hero at first
  assert.ok(changed >= 2);
  for (const k of ['id', 'text', 'emotion', 'x', 'y', 'z', 'scale', 'state', 'r']) assert.ok(k in a, k);
  for (const k of ['react', 'soften', 'settle', 'transform', 'hitTest', 'pointer', 'destroy', 'moveHome', 'slow', 'makeSpace', 'farther']) assert.equal(typeof a[k], 'function', k);
  assert.equal(b.kind, 'belief');
  assert.deepEqual(L.list, [a, b]);
  assert.equal(L.primary, b);
  assert.equal(primaryThought(L), b);
  assert.equal(thoughtList(L).length, 2);
  for (let i = 0; i < 240; i++) L.frame(DT);
  // nothing rests on the hero (it takes touches first)
  const r = b.bodyRect();
  assert.ok(r.left > hero.right || r.right < hero.left || r.top > hero.bottom || r.bottom < hero.top, `belief off the hero: ${JSON.stringify(r)}`);
  // routing: pointer(e) finds the thought; pointer(th, e) gives it to that one
  const ms = () => performance.now();
  assert.equal(L.hitTest(a.render.cx, a.render.cy), a);
  assert.ok(L.pointer({ type: 'down', id: 7, x: a.render.cx, y: a.render.cy, t: ms() }));
  assert.equal(L.owner.get(7), a);
  assert.ok(L.pressed);
  L.pointer({ type: 'up', id: 7, x: a.render.cx, y: a.render.cy, t: ms() });
  assert.ok(!L.pressed);
  assert.ok(L.pointer(b, { type: 'down', id: 8, x: b.render.cx, y: b.render.cy, t: ms() }));
  L.pointer(b, { type: 'cancel', id: 8, x: b.render.cx, y: b.render.cy, t: ms() });
  assert.equal(L.pointer({ type: 'down', id: 9, x: 5, y: 5, t: ms() }), false, 'empty space is not a thought');
  // rects for the subtitles to avoid
  const rs = L.rects();
  assert.equal(rs.length, 2);
  for (const q of rs) assert.ok(q.right > q.left && q.bottom > q.top);
  // only destroy() takes one away (the host leaving); remove() keeps it alive for another layer
  L.remove(a);
  assert.equal(L.list.length, 1); assert.equal(a.destroyed, false); assert.equal(a.layer, null);
  b.destroy();
  assert.equal(L.list.length, 0);
  L.destroy();
});

test('low stimulation: far fewer arcs, no motes; the feeling still shows', () => {
  T += 10;
  const loud = thought('anger'), quiet = thought('anger', { lowStim: true });
  const born = (th, o) => { let n = 0; const last = th.fx.arcs.map((a) => a.life); sim(th, 6, () => th.fx.arcs.forEach((a, i) => { if (a.life > last[i] + 0.5) n++; last[i] = a.life; }), o); return n; };
  const a = born(loud), b = born(quiet, { low: true });
  assert.ok(b < a * 0.6, `arcs ${a} → ${b}`);
  assert.ok(quiet.look.face.browA > 0.8, 'still visibly cross');
});
