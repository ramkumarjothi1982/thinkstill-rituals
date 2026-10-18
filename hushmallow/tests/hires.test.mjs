// High-res Mallow rigs (W7): the patch table in src/mallows/hires.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { MALLOWS, MALLOW_IDS, SPRITES, HIRES_ON } from '../src/mallows/registry.js';
import { HIRES, HIRES_VERIFIED, applyHires, hiresMallow } from '../src/mallows/hires.js';

// The registry switches HIRES_VERIFIED at import, so the live MALLOWS are no
// longer the original drawings: "old" values come from the snapshot the
// pipeline was built against (never regenerate it).
const OLD = JSON.parse(readFileSync(new URL('../tools/hires/data/old-registry.json', import.meta.url), 'utf8'));
// a registry entry as it was before the switch (personality from the live one)
const pre = (id) => ({ id, name: MALLOWS[id].name, voice: structuredClone(MALLOWS[id].voice),
  file: `old/${id}.png`, body: `old/${id}-body.png`, ...structuredClone(OLD[id]) });
import { parsePatch, applyFilePatch, appPath } from '../tools/hires/res-patch.mjs';

// ---- the res support W2 merges: tools/hires/rig-res.patch ---------------
// Every check below runs on the code as it will be once the patch is merged
// (today's files + the patch, or today's files once it is in).
const APP = fileURLToPath(new URL('../', import.meta.url));
const PATCH = parsePatch(readFileSync(join(APP, 'tools/hires/rig-res.patch'), 'utf8'));
const PATCHED = {};       // app path -> { state, text }
for (const fp of PATCH) {
  const p = appPath(fp.file);
  PATCHED[p] = applyFilePatch(readFileSync(join(APP, p), 'utf8'), fp);
}
const effective = (p) => (PATCHED[p] && PATCHED[p].state !== 'failed' ? PATCHED[p].text : readFileSync(join(APP, p), 'utf8'));
// expressions.js has no imports: the patched one loads from a data: URL
const EXPR = await import('data:text/javascript;base64,' + Buffer.from(effective('src/mallows/expressions.js')).toString('base64'));

// width/height from a WebP header (VP8X, VP8L or VP8)
function webpSize(path) {
  const b = readFileSync(path);
  assert.equal(b.toString('ascii', 0, 4), 'RIFF', path);
  assert.equal(b.toString('ascii', 8, 12), 'WEBP', path);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === 'VP8L') {
    const v = b.readUInt32LE(21);
    return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)];
  }
  if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  throw new Error(`unknown WebP chunk ${kind}`);
}

const path = (url) => fileURLToPath(url);

test('every Mallow has a high-res rig whose files exist', () => {
  assert.deepEqual(Object.keys(HIRES).sort(), [...MALLOW_IDS].sort());
  for (const [id, h] of Object.entries(HIRES)) {
    for (const f of [h.file, h.art, h.body, ...Object.values(h.sprites)]) assert.ok(existsSync(path(f)), `${id}: ${f}`);
    assert.match(h.art, /mallows-hires\/[a-z]+\.webp$/);
    assert.match(h.file, /mallows-hires\/[a-z]+-thumb\.webp$/);
    assert.match(h.body, /rig-hires\/.+-body\.webp$/);
  }
});

test('art, body and logical size agree (res = art px per logical px)', () => {
  for (const [id, h] of Object.entries(HIRES)) {
    const art = webpSize(path(h.art));
    assert.deepEqual(webpSize(path(h.body)), art, `${id} body matches the cut-out`);
    assert.ok(Math.max(...art) === 1024, `${id} is 1024 px on its long side`);
    // the thumbnail every non-rig picture uses: the same cut-out, 384 px
    const th = webpSize(path(h.file));
    assert.equal(Math.max(...th), 384, `${id} thumb`);
    assert.ok(Math.abs(th[0] / th[1] - art[0] / art[1]) < 0.01, `${id} thumb aspect`);
    assert.ok(h.res > 2 && h.res < 3, `${id} res ${h.res}`);
    assert.ok(Math.abs(h.size[0] * h.res - art[0]) < 1 && Math.abs(h.size[1] * h.res - art[1]) < 1, `${id} size`);
    const [x0, y0, x1, y1] = h.bodyBox;
    assert.ok(x0 >= 0 && y0 >= 0 && x1 <= h.size[0] && y1 <= h.size[1] && x1 - x0 > h.size[0] * 0.9, `${id} bodyBox`);
  }
});

test('face specs keep every key the rig reads, with geometry on the body', () => {
  for (const [id, h] of Object.entries(HIRES)) {
    const old = OLD[id].face, f = h.face;
    assert.equal(f.eyeStyle, old.eyeStyle);
    for (const side of ['L', 'R']) {
      for (const k of Object.keys(old.eyes[side])) assert.ok(k in f.eyes[side], `${id} eye ${side}.${k}`);
      for (const k of Object.keys(old.brows[side])) assert.ok(k in f.brows[side], `${id} brow ${side}.${k}`);
      const e = f.eyes[side];
      assert.ok(e.x > 0 && e.x < h.size[0] && e.y > 0 && e.y < h.size[1], `${id} eye ${side} inside`);
      const key = e.iris || e.sprite;
      assert.ok(h.sprites[key], `${id} sprite ${key}`);
      const [cx, cy, r] = f.cheeks[side];
      assert.ok(cx > 0 && cx < h.size[0] && cy > 0 && cy < h.size[1] && r > 0, `${id} cheek ${side}`);
    }
    for (const k of Object.keys(old.mouth)) assert.ok(k in f.mouth, `${id} mouth.${k}`);
    // left features left of right features, mouth below the eyes
    assert.ok(f.eyes.L.x < f.eyes.R.x && f.mouth.y > f.eyes.L.y && f.mouth.y > f.eyes.R.y, `${id} layout`);
    assert.equal(typeof f.neutral, 'object');
  }
});

test('Glitzi carries its own iris and re-measured glitch rows', () => {
  const g = HIRES.glitzi;
  assert.equal(g.glitchRows.length, 9);
  assert.ok(g.glitchRows.every((y, i, a) => y > 0 && y < g.size[1] && (i === 0 || y > a[i - 1])));
  assert.equal(g.face.eyes.L.iris, 'hires:glitzi-iris-L');
  assert.equal(g.face.eyes.R.iris, 'hires:glitzi-iris-R');
  assert.equal(g.face.eyes.L.lw, 6);
  // Zuzu's spirals are drawn at native px / res: spriteR matches the file
  for (const s of ['L', 'R']) {
    const z = HIRES.zuzu.face.eyes[s];
    const w = webpSize(path(HIRES.zuzu.sprites[z.sprite]))[0];
    assert.ok(Math.abs(w / 2 / HIRES.zuzu.res - z.spriteR) < 0.1, `zuzu spriteR ${s}`);
  }
});

test('hiresMallow copies; applyHires switches in place, once, and only the ids asked', () => {
  const base = pre('zuzu');
  const before = JSON.stringify(base);
  const z = hiresMallow(base);
  assert.equal(JSON.stringify(base), before, 'base untouched');
  assert.equal(z.id, 'zuzu');
  assert.equal(z.name, base.name);
  assert.ok(z.hires && z.res === HIRES.zuzu.res);
  z.face.eyes.L.x = -1;
  assert.notEqual(HIRES.zuzu.face.eyes.L.x, -1, 'face is a deep copy');

  const mallows = { glitzi: pre('glitzi'), zuzu: pre('zuzu'), noomi: pre('noomi') };
  const sprites = { 'iris-amber': 'old/iris-amber.png' };
  assert.deepEqual(applyHires(mallows, sprites, ['glitzi', 'nobody']), ['glitzi']);
  assert.equal(mallows.glitzi.file, HIRES.glitzi.file);
  assert.equal(mallows.glitzi.art, HIRES.glitzi.art);
  assert.deepEqual(mallows.glitzi.presetOverrides, HIRES.glitzi.presetOverrides);
  assert.equal(mallows.glitzi.voice.hello[0], MALLOWS.glitzi.voice.hello[0], 'personality kept');
  assert.equal(mallows.zuzu.file, 'old/zuzu.png', 'others untouched');
  assert.deepEqual(mallows.zuzu.face, OLD.zuzu.face, 'others untouched (face)');
  assert.ok(sprites['hires:glitzi-iris-L'] && sprites['iris-amber'], 'sprites added, none removed');
  const once = JSON.stringify(mallows.glitzi);
  applyHires(mallows, sprites, ['glitzi']);
  assert.equal(JSON.stringify(mallows.glitzi), once, 'idempotent');
  assert.ok(HIRES_VERIFIED.every((id) => HIRES[id]), 'verified ids are known');
});

// ---- containment: every drawn face part stays inside the body ------------
// A pure-geometry mirror of the extents rig.js draws (drawMouth, eyeGeom; W2
// owns rig.js, keep these in step with it), checked against the silhouette
// of each cut-out (tools/hires/data/silhouette.json, written by
// build_table.py: per 2 logical px column, the body's top and bottom).
const { PRESETS, STAGES, resolveExpression } = EXPR;     // with the patch's presetOverrides seam
import { REACTIONS } from '../src/mallows/reactions.js';

const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
const lerpN = (a, b, t) => a + (b - a) * t;

function mouthExtent(M, P) {
  const s = clampN(P.mouthSmile, -1.2, 1.2), o = clampN(P.mouthOpen, 0, 1.4), r = clampN(P.mouthRound, 0, 1);
  const pout = clampN(P.mouthPout, 0, 1);
  const W = M.w * clampN(P.mouthWidth, 0.3, 1.5) * (1 - 0.5 * r) * (1 - 0.45 * pout);
  const oc = clampN(o, 0, 1);
  const sagS = (M.sag === 0 ? M.w * 0.18 * (1 - oc) : (M.sag ?? M.w * 0.2)) * s * (1 - 0.6 * r);
  const tremble = Math.abs(P.mouthTremble) * 3.2;
  const skewY = Math.abs(P.mouthSkew * M.w * 0.1), dx = P.mouthSkew * M.w * 0.04;
  const depth = M.depth || M.w * 0.45;
  const upperOpen = (M.upper ?? -M.w * 0.08) * (0.4 + 0.6 * Math.max(0, s));
  let U = lerpN(sagS, upperOpen, oc) - r * o * depth * 0.28;
  const LoT = sagS + o * depth * (1 + 0.15 * r) * (s < -0.2 ? 0.7 : 1);
  const Lo = LoT + tremble;
  if (s < 0 && oc > 0.05) U = Math.min(U, LoT - tremble - 2);
  const open = Lo - U > 2.2;
  const half = open ? Math.max(2, M.lw * 0.45) / 2 : (M.style === 'open' ? Math.max(M.lw, 8) : M.lw) / 2 + P.mouthWave * M.w * 0.05;
  let bottom = M.y + skewY + Math.max(0, Lo, U) + half;
  const top = M.y - skewY + Math.min(0, U, Lo) - half;
  // the upper lip, per column: the rig's cubic from corner to corner
  const x0 = M.x + dx - W / 2, x1 = M.x + dx + W / 2;
  const lip = (x) => {
    let t = 0.5;
    for (let i = 0; i < 20; i++) {   // invert x(t) by bisection (monotone)
      const xt = (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * (x0 + W * 0.22) + 3 * (1 - t) * t * t * (x1 - W * 0.22) + t ** 3 * x1;
      t += (x > xt ? 1 : -1) * 0.5 ** (i + 2);
    }
    return M.y + 4 * t * (1 - t) * (open ? U : Math.min(U, 0)) - half;
  };
  if (open) bottom = Math.max(bottom, M.y + Lo * 1.005 + M.lw * 0.45 + Math.max(1.5, M.lw * 0.25) / 2);
  if (pout > 0.05) bottom = Math.max(bottom, M.y + Math.max(Lo, 0) + M.lw * 1.25);
  // a tongue stuck out ("bleh") hangs below the lips: its tip, separately
  const tip = P.tongue > 0.03 ? M.y + Math.max(Lo, U) + M.lw * 0.3 + M.w * 0.2 * clampN(P.tongue, 0, 1) * 0.94 : -Infinity;
  return { x0: x0 - half, x1: x1 + half, top, lip, bottom, tip, tx0: M.x - M.w * 0.17, tx1: M.x + M.w * 0.17 };
}

// the top edge of one drawn eye, as [x, y] points: an open eye draws only
// inside its ellipse (the lid line is clipped to 1.06 x it); a closed one is
// the lid line itself
function eyeTop(spec, side, P, style) {
  const es = P.eyeScale, ry = spec.ry * es, rx = spec.rx * es;
  const ey = style === 'closed' ? spec.y + spec.sag * 0.42 : spec.y;
  const wink = side === 'R' ? clampN(P.wink, 0, 1) : 0;
  const o = clampN(P.eyeOpen * (1 - wink), 0, 1.45), oc = Math.min(1, o);
  const pts = [];
  if (o > 0.015) {
    const RX = rx * 1.06, RY = ry * 1.06;
    for (let k = -10; k <= 10; k++) {
      const x = spec.x + RX * k / 10.5, h = RY * Math.sqrt(1 - (k / 10.5) ** 2);
      pts.push([x, ey - h - spec.lw / 2, ey + h + spec.lw / 2]);
    }
  } else {
    const inner = side === 'L' ? 1 : -1;
    const yC = style === 'closed' ? spec.y : ey + ry * 0.12;
    const sagC = spec.sag * lerpN(P.closedCurve, -1, wink);
    const hw = lerpN(spec.hw * (style === 'closed' ? 1 : Math.min(1.1, es)), rx * 1.3, oc);
    const tilt = (spec.tilt || 0) * (1 - oc);
    const xin = spec.x + inner * hw, xout = spec.x - inner * hw, yin = yC + tilt, yout = yC - tilt;
    const qUp = lerpN(yC + 2 * sagC, ey - ry * 2.35, clampN(o * (1 - P.lidTop), 0, 1.45));
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      const y = (1 - t) ** 2 * yout + 2 * (1 - t) * t * qUp + t * t * yin;
      pts.push([lerpN(xout, xin, t), y - spec.lw / 2, y + spec.lw / 2]);
    }
  }
  return pts;
}

function faceStates(m) {
  const out = [];
  for (const p of Object.keys(PRESETS)) for (const I of [0.7, 1]) out.push([`${p}@${I}`, resolveExpression(m, { [p]: 1 }, I)]);
  for (const [s, st] of Object.entries(STAGES)) out.push([`stage:${s}`, resolveExpression(m, st.mix, st.intensity, st.extra)]);
  const table = { ...REACTIONS._shared, ...(REACTIONS[m.id] || {}) };
  for (const base of ['neutral', 'happy', 'excited', 'playful']) {
    const b = resolveExpression(m, { [base]: 1 }, 1);
    for (const [k, r] of Object.entries(table)) {
      const g = { ...b };
      for (const [kk, v] of Object.entries(r.params || r)) if (kk in g) g[kk] = v;
      out.push([`${k}/${base}`, g]);
    }
    out.push([`yawn-cycle/${base}`, { ...b, mouthRound: 1, mouthOpen: 1.15, mouthSmile: 0 }]);
  }
  return out;
}

const SIL = JSON.parse(readFileSync(new URL('../tools/hires/data/silhouette.json', import.meta.url)));
const silAt = (S, key, x0, x1, pick) => {
  let v = null;
  for (let x = Math.floor(x0 / S.step); x <= Math.ceil(x1 / S.step); x++) {
    const y = S[key][Math.max(0, Math.min(S[key].length - 1, x))];
    if (y != null) v = v == null ? y : pick(v, y);
  }
  return v;
};

test('every drawn face part stays inside the body, at every preset, stage and reaction', () => {
  const MARGIN = 6;      // logical px: the silhouette's bright rim stays clear
  const TIP = 3;         // a tongue tip may come closer, never past it
  for (const id of Object.keys(HIRES)) {
    const m = hiresMallow(MALLOWS[id], id), f = m.face, S = SIL[id];
    assert.ok(S, `${id} silhouette`);
    const bad = [];
    // how close the painted face itself puts mouth and eyes (the rest pose)
    const gapOf = (P, side) => {
      const me = mouthExtent(f.mouth, P);
      let gap = Infinity;
      for (const [x, , yb] of eyeTop(f.eyes[side], side, P, f.eyeStyle)) if (x > me.x0 + 4 && x < me.x1 - 4) gap = Math.min(gap, me.lip(x) - yb);
      return gap;
    };
    const rest = resolveExpression(m, { neutral: 1 }, 0);
    const restGap = { L: gapOf(rest, 'L'), R: gapOf(rest, 'R') };
    for (const [name, P0] of faceStates(m)) {
      // the mouth spring overshoots its target by ~7% (kS 170, kD 17)
      const P = { ...P0, mouthOpen: P0.mouthOpen * 1.07 };
      const me = mouthExtent(f.mouth, P);
      const floor = silAt(S, 'bottom', me.x0, me.x1, Math.min);
      if (floor - me.bottom < MARGIN) bad.push(`mouth ${name}: ${(floor - me.bottom).toFixed(1)} px`);
      const tfloor = silAt(S, 'bottom', me.tx0, me.tx1, Math.min);
      if (tfloor - me.tip < TIP) bad.push(`tongue ${name}: ${(tfloor - me.tip).toFixed(1)} px`);
      for (const side of ['L', 'R']) {
        let worst = Infinity;
        for (const [x, y] of eyeTop(f.eyes[side], side, P, f.eyeStyle)) worst = Math.min(worst, y - silAt(S, 'top', x, x, Math.max));
        if (worst < MARGIN) bad.push(`eye ${side} ${name}: ${worst.toFixed(1)} px`);
        // Glitzi's open mouth grows upward (its explicit `upper`): it never
        // runs into an eye. (Zuzu's spirals, scaled up by excited/calm
        // presets, already touch its mouth corners on the current rig: the
        // presets' business, not this table's.)
        if (id === 'glitzi') {
          const gap = gapOf(P, side);
          if (gap < Math.min(restGap[side], 4) - 3) bad.push(`mouth meets eye ${side} ${name}: ${gap.toFixed(1)} px`);
        }
      }
    }
    assert.deepEqual(bad.slice(0, 8), [], `${id}: face drawn past the outline`);
  }
});

test('Glitzi carries an explicit open-mouth depth (its frown has no painted one)', () => {
  const M = HIRES.glitzi.face.mouth;
  assert.equal(M.style, 'crease');
  assert.ok(M.depth > 20 && M.depth < M.w * 0.45, `depth ${M.depth}`);
});

test('high-res sprites passed the build checks (clean spiral rims)', () => {
  const C = JSON.parse(readFileSync(new URL('../tools/hires/data/checks.json', import.meta.url)));
  for (const s of ['L', 'R']) {
    const c = C.sprites[`zuzu-spiral-${s}`];
    assert.equal(c.bodyPx, 0, `zuzu spiral ${s}: body pixels inside the sprite`);
    assert.ok(c.rimDark > 0.95, `zuzu spiral ${s}: the rim is dark all the way round (${c.rimDark})`);
  }
});

test('open mouths use the colours painted in the high-res art', () => {
  for (const id of ['zuzu', 'boppo', 'pipzi']) {
    const M = HIRES[id].face.mouth;
    assert.notEqual(M.inside, OLD[id].face.mouth.inside, `${id} inside resampled`);
    assert.match(M.inside, /^#[0-9a-f]{6}$/);
    assert.match(M.tongue, /^#[0-9a-f]{6}$/);
  }
});

test('the live registry runs on the verified high-res rigs; pipzi and loomi keep their drawings; ?hires=0 keeps all seven', async () => {
  assert.deepEqual(HIRES_VERIFIED, ['glitzi', 'zuzu', 'boppo', 'blubi', 'noomi'], 'owner decision A-1: five switch now');
  assert.deepEqual(HIRES_ON, HIRES_VERIFIED, 'the registry applied exactly HIRES_VERIFIED');
  for (const id of HIRES_VERIFIED) {
    const m = MALLOWS[id], h = HIRES[id];
    assert.equal(m.hires, true, id);
    assert.equal(m.art, h.art, `${id} rig art (1024 px)`);
    assert.equal(m.file, h.file, `${id} pictures (384 px thumbnail)`);
    assert.equal(m.body, h.body, `${id} body`);
    assert.deepEqual(m.size, h.size, `${id} logical size`);
    assert.equal(m.res, h.res, `${id} res`);
    assert.deepEqual(JSON.parse(JSON.stringify(m.face)), h.face, `${id} face`);
    for (const k of Object.values(m.face.eyes).map((e) => e.iris || e.sprite)) assert.ok(SPRITES[k], `${id} sprite ${k}`);
  }
  for (const id of ['pipzi', 'loomi']) {
    const m = MALLOWS[id];
    assert.ok(!m.hires && !m.art && !m.res, `${id} stays on its drawing`);
    assert.match(m.file, new RegExp(`/assets/mallows/${id}\\.webp$`));
    assert.deepEqual(m.size, OLD[id].size);
    assert.deepEqual(JSON.parse(JSON.stringify(m.face)), OLD[id].face);
  }
  assert.ok(SPRITES['iris-amber'] && SPRITES['zuzu-spiral-L'], 'the original sprites stay for the old drawings');
  // the escape hatch: a fresh registry instance under ?hires=0 switches nothing
  globalThis.location = { search: '?hires=0' };
  try {
    const R = await import('../src/mallows/registry.js?hires-off');
    assert.deepEqual(R.HIRES_ON, []);
    for (const id of MALLOW_IDS) {
      assert.ok(!R.MALLOWS[id].hires, `${id} not switched`);
      assert.match(R.MALLOWS[id].file, new RegExp(`/assets/mallows/${id}\\.webp$`));
      assert.deepEqual(R.MALLOWS[id].size, OLD[id].size);
    }
  } finally { delete globalThis.location; }
});

test('hiresMallow does not need structuredClone (Safari < 15.4 boots)', () => {
  const keep = globalThis.structuredClone;
  try {
    globalThis.structuredClone = undefined;
    const g = hiresMallow(MALLOWS.glitzi);
    assert.equal(g.face.mouth.style, 'crease');
  } finally { globalThis.structuredClone = keep; }
});

// ---- the res contract (review r2: MallowTouch drew the art at its natural size)
test('rig-res.patch still fits today\'s files (or is merged)', () => {
  const files = Object.keys(PATCHED).sort();
  for (const p of ['src/mallows/rig.js', 'src/mallows/touch/mallow-touch.js', 'src/mallows/registry.js', 'src/mallows/expressions.js']) {
    assert.ok(files.includes(p), `the patch covers ${p}`);
  }
  for (const [p, r] of Object.entries(PATCHED)) {
    const bad = r.hunks.filter((h) => h.state === 'failed').map((h) => h.header);
    assert.deepEqual(bad, [], `${p}: hunks that fit nowhere (node hushmallow/tools/hires/refresh-patch.mjs, or edit the patch)`);
  }
});

function jsFiles(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) out.push(...jsFiles(f));
    else if (n.endsWith('.js')) out.push(relative(APP, f));
  }
  return out;
}
// every drawImage(...) call: its source text and top-level argument count
function drawImageCalls(src) {
  const out = [];
  for (let i = src.indexOf('drawImage('); i >= 0; i = src.indexOf('drawImage(', i + 1)) {
    let d = 0, n = 1, j = i + 'drawImage('.length;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === '(' || c === '[' || c === '{') d++;
      else if (c === ')' || c === ']' || c === '}') { if (d === 0) break; d--; } else if (c === ',' && d === 0) n++;
    }
    out.push({ text: src.slice(i, j + 1), args: n, line: src.slice(0, i).split('\n').length });
  }
  return out;
}

test('the patched rig never draws an art asset at its natural size (high-res art is res x larger)', () => {
  const bad = [];
  for (const p of jsFiles(join(APP, 'src/mallows'))) {
    if (p.endsWith('hires.js')) continue;
    const src = effective(p);
    // a 3-argument drawImage paints the image at its natural pixel size: with
    // 1024 px art in a ~390 unit rig that is a 2.6x crop (MallowTouch _atSkin,
    // rig A.body / A.original before the patch)
    for (const c of drawImageCalls(src)) if (c.args === 3) bad.push(`${p}:${c.line} ${c.text}`);
    // a sprite's pixel width used as a size in rig units must divide by res
    src.split('\n').forEach((l, i) => {
      if (/\b(img|sprite|spr)\.(width|height)\b/.test(l) && /eyeScale|spriteR/.test(l) && !/\bres\b/.test(l)) bad.push(`${p}:${i + 1} ${l.trim()}`);
    });
  }
  assert.deepEqual(bad, [], 'natural-size draws / sprite px used as rig units');
});

test('the patched rig reads the per-Mallow seams the table relies on', () => {
  const rig = effective('src/mallows/rig.js');
  // Glitzi's rows: never the module constant on its own
  const uses = rig.split('\n').filter((l) => /GLITCH_ROWS/.test(l) && !/^const GLITCH_ROWS =/.test(l.trim()));
  assert.ok(uses.length >= 2, 'glitch rows are read');
  for (const l of uses) assert.match(l, /glitchRows \|\| GLITCH_ROWS/, `per-rig rows: ${l.trim()}`);
  assert.match(rig, /1\.25 \* \(m\.res \|\| 1\)/, 'skin q may follow the art (1.25 x res)');
  assert.match(rig, /M\.relief \|\| CREASE_RELIEF/, 'crease relief');
  assert.match(effective('src/mallows/registry.js'), /loadImage\(m\.art \|\| m\.file\)/, 'the rig loads the 1024 px art, pictures the thumbnail');
  assert.match(effective('src/mallows/expressions.js'), /mallow\.presetOverrides\?\.\[id\]/, 'presetOverrides merged');
});

test('Glitzi\'s redrawn lids open again for surprise, fear and awe (presetOverrides)', () => {
  const g = hiresMallow(MALLOWS.glitzi, 'glitzi');
  const rest = resolveExpression(g, { neutral: 1 }, 0).lidTop;
  assert.equal(rest, 0.55);
  for (const [p, max] of [['surprised', 0.05], ['scared', 0.05], ['awe', 0.1], ['curious', 0.3], ['anxious', 0.3]]) {
    const v = resolveExpression(g, { [p]: 1 }, 1).lidTop;
    assert.ok(v <= max, `${p} lidTop ${v.toFixed(2)} (rest ${rest})`);
  }
  // its round mouths open wider than the presets ask (depth 27 halves them)
  for (const p of ['surprised', 'awe', 'scared']) assert.ok(resolveExpression(g, { [p]: 1 }, 1).mouthOpen >= 0.8, `${p} opens`);
  assert.ok(Array.isArray(g.face.mouth.relief) && g.face.mouth.relief.length >= 1, 'relief');
});

test('iris sprites carry no sclera (no pale crescent, nothing past rc)', () => {
  const C = JSON.parse(readFileSync(new URL('../tools/hires/data/checks.json', import.meta.url)));
  for (const k of ['glitzi-iris-L', 'glitzi-iris-R', 'boppo-iris-L', 'boppo-iris-R', 'pipzi-iris-L', 'pipzi-iris-R', 'iris-navy']) {
    const c = C.irises?.[k];
    assert.ok(c, `${k} checked`);
    assert.ok(c.paleOutside <= 10, `${k}: ${c.paleOutside} pale px past rc`);
    assert.ok(c.paleRimSector <= 100, `${k}: a pale crescent on the rim (${c.paleRimSector} px in one 30 degree sector)`);
  }
});
