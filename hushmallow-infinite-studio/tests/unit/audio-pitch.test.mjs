// audio/pitch.mjs and library/sound/soundmap.json: notes written once in the
// reference key (v2's C5 major pentatonic) and transposed by scale degree to
// each Mallow's kit (R8); the kit table matches the app's engine.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { N } from '../../audio/soundtrack.mjs';
import { transposer, refSemis, refDegree, nearestOctave, REF_HZ } from '../../audio/pitch.mjs';
import { soundmap } from '../../audio/score.mjs';
import { HUSHMALLOW } from '../../render/lib/paths.mjs';

const sm = soundmap();
const kit = (id) => sm.kits[id];
const close = (a, b, rel = 1e-12) => assert.ok(Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${a} vs ${b}`);
const C5_GRID = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];

test('the reference table is v2\'s N, bit for bit, keyed by semitones from C5', () => {
  assert.equal(Object.keys(REF_HZ).length, Object.keys(N).length);
  for (const [name, hz] of Object.entries(N)) assert.ok(Object.is(REF_HZ[refSemis(name)], hz), name);
  assert.equal(refSemis('G6'), 19);
  assert.equal(refSemis('C3'), -24);
  assert.deepEqual(refDegree(19), { index: 3, octave: 1 });
  assert.throws(() => refDegree(1), /not on the reference C major pentatonic/);
  assert.throws(() => refSemis('F5'), /not a note of the reference/);
});

test('Noomi is the identity: v2\'s exact frequencies, st(k) ratios and fx options', () => {
  const p = transposer(kit('noomi'));
  assert.equal(p.identity, true);
  assert.equal(p.octave, 0);
  for (const [name, hz] of Object.entries(N)) assert.ok(Object.is(p.note(name), hz), name);
  for (const off of [3, 0, -5]) assert.ok(Object.is(p.fxPitch(9, off), Math.pow(2, off / 12)), `chime ${off}`);
  assert.deepEqual(p.bubble(2), { note: 2 });
  assert.equal(p.ratio(19), 1);
});

test('Blubi: scale-degree notes land on F5 major pentatonic (F5 G5 A5 C6 D6 F6)', () => {
  const p = transposer(kit('blubi'));
  assert.equal(p.identity, false);
  assert.equal(p.octave, 0, 'F5 is already the nearest F to C5');
  const want = [0, 2, 4, 7, 9, 12].map((s) => 698.46 * Math.pow(2, s / 12));
  C5_GRID.forEach((n, i) => close(p.note(n), want[i]));
  close(p.note('A6'), 698.46 * Math.pow(2, 21 / 12));      // thought ting: degree 9 → D7
  close(p.note('C3'), 698.46 / 4);                          // pad root → F3
  // an engine fx moved by the same interval: the chime's C6 (A5 + 3 semitones, equal-tempered from its 880 Hz) becomes F6
  close(880 * p.fxPitch(9, 3), 880 * Math.pow(2, 3 / 12) * (698.46 / 523.25), 1e-12);
  close(880 * p.fxPitch(9, 3), 698.46 * 2, 1e-5);
  // the engine bubble plays 420 · pitch · penta(note): the note stays, the pitch moves its degree into F
  assert.equal(p.bubble(4).note, 4);
  close(p.bubble(4).pitch, 698.46 / 523.25, 1e-12);
});

test('Glitzi: Bb4 minor pentatonic; Zuzu: G4 Hirajoshi (the kit\'s own scale, not major)', () => {
  const g = transposer(kit('glitzi'));
  [0, 3, 5, 7, 10, 12].forEach((s, i) => close(g.note(C5_GRID[i]), 466.16 * Math.pow(2, s / 12)));
  const z = transposer(kit('zuzu'));
  [0, 2, 3, 7, 8, 12].forEach((s, i) => close(z.note(C5_GRID[i]), 392 * Math.pow(2, s / 12)));
});

test('register: the kit key in the octave nearest C5 (Loomi G3 → G4, Boppo E4 → E5, Pipzi G5 → G4); a pack may override', () => {
  assert.equal(nearestOctave(196), 1);
  assert.equal(nearestOctave(329.63), 1);
  assert.equal(nearestOctave(783.99), -1);
  close(transposer(kit('loomi')).note('C5'), 392);
  close(transposer(kit('boppo')).note('C5'), 659.26);
  close(transposer(kit('pipzi')).note('C5'), 391.995);
  close(transposer(kit('loomi'), { octave: 0 }).note('C5'), 196);
  assert.throws(() => transposer(kit('loomi'), { octave: 0.5 }), /whole number/);
});

test('soundmap kits are the app engine\'s KITS (root, scale, speed), read from its source', () => {
  const src = fs.readFileSync(path.join(HUSHMALLOW, 'src', 'engine', 'audio.js'), 'utf8');
  const re = /^ {2}([a-z]+): makeKit\(\{\n {4}root: ([\d.]+), scale: \[([\d, ]+)\], speed: ([\d.]+)/gm;
  const app = {};
  for (const m of src.matchAll(re)) app[m[1]] = { root: +m[2], scale: m[3].split(',').map(Number), speed: +m[4] };
  delete app.neutral;
  assert.deepEqual(Object.keys(app).sort(), Object.keys(sm.kits).sort(), 'the 7 Mallow kits');
  for (const [id, k] of Object.entries(app)) assert.deepEqual({ root: sm.kits[id].root, scale: sm.kits[id].scale, speed: sm.kits[id].speed }, k, id);
});

test('soundmap: every Mallow has its kit and its registry home realm, every realm its engine bed', () => {
  const reg = fs.readFileSync(path.join(HUSHMALLOW, 'src', 'mallows', 'registry.js'), 'utf8');
  const homes = Object.fromEntries([...reg.matchAll(/id: '([a-z]+)'[\s\S]*?realm: '([a-z-]+)'/g)].map((m) => [m[1], m[2]]));
  assert.equal(Object.keys(homes).length, 7);
  for (const [id, realm] of Object.entries(homes)) {
    assert.equal(sm.mallows[id].kit, id);
    assert.equal(sm.mallows[id].bed, realm, id);
    assert.equal(sm.realms[realm].bed, realm);
    assert.ok(sm.realms[realm].tods.default, `${realm} has an explicit default time of day`);
  }
  assert.deepEqual(sm.realms['moonmilk-cove'].tods['late-night'].layers.crickets, { voices: [[4150, -0.55, 0.64, 3], [3880, 0.6, 0.83, 4]], amp: 0.0065 }, 'v2\'s crickets');
});
