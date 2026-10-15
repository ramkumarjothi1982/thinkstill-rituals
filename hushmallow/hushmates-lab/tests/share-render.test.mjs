// What a share picture or video can show, read from what the renderer actually draws (a
// recording canvas stands in for the browser's). A Mallow's words never appear without
// "A Mallow perspective · Automatically generated"; the Mallow is never counted as a person;
// nothing about who wrote a perspective (not even the Mallow each writer chose) reaches it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeStory, honestLabel, storyLines, HUMAN_LABEL } from '../ui/relay/share-render.js';

/** A 2D context that records what is drawn: text (with its opacity) and every colour used. */
function recorder() {
  const texts = [];
  const colours = [];
  let st = { font: '10px x', globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', shadowColor: '#000' };
  const stack = [];
  const grad = { addColorStop(_, c) { colours.push(String(c)); } };
  const base = {
    save() { stack.push({ ...st }); }, restore() { st = stack.pop() || st; },
    translate() {}, scale() {}, rotate() {}, setTransform() {}, beginPath() {}, arc() {}, ellipse() {}, fill() {}, stroke() {}, fillRect() {}, clearRect() {},
    roundRect() {}, rect() {}, moveTo() {}, lineTo() {}, bezierCurveTo() {}, quadraticCurveTo() {}, closePath() {}, setLineDash() {}, drawImage() {}, clip() {},
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    measureText(t) { const px = parseFloat((/(\d+(?:\.\d+)?)px/.exec(st.font) || [])[1]) || 10; return { width: String(t).length * px * 0.55 }; },
    fillText(t) { texts.push({ t: String(t), a: st.globalAlpha }); },
  };
  const x = new Proxy(base, {
    get: (o, k) => (k in o ? o[k] : st[k]),
    set: (o, k, v) => { st[k] = v; if (/Style$|Color$/.test(String(k))) colours.push(String(v)); return true; },
    has: (o, k) => k in o || k in st || k === 'letterSpacing',
  });
  return { x, texts, colours };
}
const visible = (texts) => texts.filter((l) => l.a > 0).map((l) => l.t);
const MALLOW_LABEL = 'A Mallow perspective · Automatically generated';
const mallowPick = { kind: 'mallow', label: MALLOW_LABEL, text: 'Maybe the quiet says more about their week than about you.', mallow: 'noomi' };
const personPick = { kind: 'human', label: HUMAN_LABEL, text: 'It might help to send something light, with no pressure.', mallow: null };
const base = { tint: '#8FB8FF', label: null, labelColour: '#8FB8FF', words: null, petals: [], mallowPetal: null, mallow: 'noomi', hasMallow: false, humans: 0, picks: [] };

/** Every frame of the video (every tenth of a second) and the still picture. */
function everyFrame(d) {
  const s = makeStory(d);
  const frames = [];
  for (let t = 0; t <= s.duration; t += 0.1) { const r = recorder(); s.draw(r.x, t); frames.push(visible(r.texts)); }
  const still = recorder();
  s.still(still.x);
  frames.push(visible(still.texts));
  return frames;
}

test('a Mallow perspective’s label: kept only when it says both what it is and how it was made', () => {
  assert.equal(honestLabel({ kind: 'mallow', label: MALLOW_LABEL }), MALLOW_LABEL);
  assert.equal(honestLabel({ kind: 'mallow', label: 'A Mallow perspective · Automatically generated · Example' }), 'A Mallow perspective · Automatically generated · Example');
  for (const label of [undefined, '', 'A Mallow perspective', 'Written by Mallow fan Sam', 'A Hushmate’s perspective', 'Automatically generated']) {
    assert.equal(honestLabel({ kind: 'mallow', label }), MALLOW_LABEL, `kept a Mallow label it can't back up: ${label}`);
  }
  assert.equal(honestLabel({ kind: 'human' }), HUMAN_LABEL);
  assert.equal(honestLabel({ kind: 'human', label: '' }), HUMAN_LABEL);
});

test('the Mallow is never counted as a person', () => {
  const none = Object.values(storyLines({ ...base, humans: 0, hasMallow: true })).join(' ');
  assert.doesNotMatch(none, /\b(?:one|1) (?:stranger|person|Hushmate)/i, none);
  assert.match(none, /Mallow/, none);
  const two = Object.values(storyLines({ ...base, humans: 2, hasMallow: true })).join(' ');
  assert.match(two, /\bTwo\b/i, two);
  assert.doesNotMatch(two, /\bThree\b/i, two);
});

test('a Mallow’s words are never drawn without its label: in the still and in every video frame', () => {
  for (const d of [
    { ...base, humans: 0, hasMallow: true, picks: [mallowPick] },
    { ...base, humans: 1, hasMallow: true, petals: [{ slot: 1, mallow: 'blubi' }], picks: [personPick, mallowPick] },
    { ...base, humans: 2, hasMallow: true, petals: [{ slot: 1, mallow: 'blubi' }, { slot: 2, mallow: 'pipzi' }], picks: [{ ...mallowPick, label: undefined }] },
  ]) {
    const frames = everyFrame(d);
    let shown = 0;
    for (const lines of frames) {
      const all = lines.join(' ');
      if (!all.includes('Maybe the quiet')) continue;
      shown += 1;
      assert.match(all, /A MALLOW PERSPECTIVE/i, `Mallow words without "A Mallow perspective": ${all}`);
      assert.match(all, /AUTOMATICALLY GENERATED/i, `Mallow words without "Automatically generated": ${all}`);
    }
    assert.ok(shown > 0, 'the Mallow perspective chosen was never drawn');
  }
});

test('nothing about who wrote a perspective: the colours don’t follow the Mallow each writer chose', () => {
  const draw = (petals) => {
    const s = makeStory({ ...base, humans: petals.length, petals, picks: [personPick] });
    const r = recorder();
    s.still(r.x);
    for (let t = 0; t <= s.duration; t += 0.5) s.draw(r.x, t);
    return r.colours.join(',');
  };
  const one = draw([{ slot: 1, mallow: 'blubi' }, { slot: 2, mallow: 'pipzi' }, { slot: 3, mallow: 'zuzu' }]);
  const other = draw([{ slot: 1, mallow: 'glitzi' }, { slot: 2, mallow: 'noomi' }, { slot: 3, mallow: 'boppo' }]);
  assert.equal(one, other, 'the picture changes with the writers’ Mallows');
  // and a person's perspective, chosen, carries no Mallow of theirs
  const withMallow = recorder();
  makeStory({ ...base, humans: 1, petals: [{ slot: 1, mallow: 'glitzi' }], picks: [{ ...personPick, mallow: 'glitzi' }] }).still(withMallow.x);
  const without = recorder();
  makeStory({ ...base, humans: 1, petals: [{ slot: 1, mallow: 'glitzi' }], picks: [personPick] }).still(without.x);
  assert.equal(withMallow.colours.join(','), without.colours.join(','));
});
