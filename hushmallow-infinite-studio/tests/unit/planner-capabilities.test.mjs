import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lib, capsFrom } from '../property/support.mjs';
import { loadCapabilities, validateCapabilities, openCapabilities, CAPABILITIES_FILE } from '../../planner/capabilities.mjs';

test('the committed capabilities: only Noomi, Moonmilk late night at 15 s, and the T01 moves', () => {
  const raw = JSON.parse(fs.readFileSync(CAPABILITIES_FILE, 'utf8'));
  assert.deepEqual(validateCapabilities(raw, lib), []);
  const caps = loadCapabilities(lib);
  assert.deepEqual(caps.unlocked(), ['noomi']);
  assert.ok(caps.todOk('moonmilk-cove', 'late-night'));
  assert.ok(!caps.todOk('moonmilk-cove', 'night'));
  assert.ok(caps.durationOk('moonmilk-cove', 15));
  assert.ok(!caps.durationOk('moonmilk-cove', 12));
  const enabled = Object.keys(raw.moves).filter((id) => caps.cellOk(id, 'noomi', 'production')).sort();
  assert.deepEqual(enabled, ['A-COLD-DIP-WARM', 'C-DRIFT-IN', 'G-JOLT', 'LP-RETURN', 'M-ORBIT', 'R-BREATH', 'TURN-SQUEEZE']);
  const t01 = lib.template('T01');
  for (const id of [t01.gag.primary, t01.escalation.metaphor, t01.ritual.primary, t01.loop.strategy, t01.palette, t01.camera[0]]) assert.ok(enabled.includes(id), id);
  assert.ok(!caps.cellOk('G-JOLT', 'blubi', 'review'), 'no cell for another Mallow');
  assert.ok(!caps.cellOk('G-SINK', 'noomi', 'review'), 'untuned moves are never sampled');
});

test('review mode admits candidate cells, never candidate packs or presets', () => {
  const caps = capsFrom({
    schema: 'hm-capabilities/1',
    mallows: { noomi: { status: 'approved' }, blubi: { status: 'candidate' } },
    realms: { 'moonmilk-cove': { status: 'approved', tods: { 'late-night': 'approved', night: 'candidate' }, durations: { 15: 'approved' }, weather: { clear: 'approved', mist: 'candidate' }, dressing: {}, dressingBudget: { maxItems: 2, maxCostMs: 60 } } },
    moves: { 'G-JOLT': { kind: 'gag', cells: { noomi: 'approved' } }, 'G-SINK': { kind: 'gag', cells: { noomi: 'candidate' } } },
  });
  assert.ok(caps.cellOk('G-SINK', 'noomi', 'review'));
  assert.ok(!caps.cellOk('G-SINK', 'noomi', 'production'));
  assert.ok(!caps.mallowOk('blubi'), 'a candidate pack is not sampled even in review');
  assert.ok(!caps.todOk('moonmilk-cove', 'night'));
  assert.deepEqual(caps.weather('moonmilk-cove'), ['clear']);
  assert.deepEqual(caps.movesOfKind('gag', 'noomi', 'review'), ['G-JOLT', 'G-SINK']);
  assert.deepEqual(caps.movesOfKind('gag', 'noomi', 'production'), ['G-JOLT']);
});

test('invalid capability files are rejected with every problem named', () => {
  const errs = validateCapabilities({
    schema: 'hm-capabilities/1',
    mallows: { noomi: { status: 'shipped' }, bob: { status: 'approved' } },
    realms: { 'moonmilk-cove': { status: 'approved', tods: { afternoon: 'approved' }, durations: { 13: 'approved' } }, mars: { status: 'blocked' } },
    moves: { 'G-JOLT': { kind: 'ritual', cells: {} }, 'G-NOPE': { kind: 'gag', cells: { noomi: 'approved' } }, 'M-ORBIT': { kind: 'metaphor', cells: { zed: 'approved' } } },
  }, lib);
  const text = errs.join('\n');
  for (const re of [/mallows\.noomi: status "shipped"/, /mallows\.bob: not a library Mallow/, /tods\.afternoon: not a time of day/, /durations\.13: no beat clock/,
    /realms\.mars: not the home realm/, /needs dressingBudget/, /moves\.G-JOLT: id does not match kind ritual/, /moves\.G-NOPE: not in the gag catalogue/, /cells\.zed: not a library Mallow/]) {
    assert.match(text, re);
  }
  assert.throws(() => capsFrom({ schema: 'x' }), /schema/);
});

test('open capabilities (tests and what-if only) enable the whole library', () => {
  const caps = openCapabilities(lib);
  assert.equal(caps.unlocked().length, 7);
  assert.ok(caps.cellOk('G-SPLASHSIT', 'blubi', 'production'));
  assert.ok(!caps.cellOk('G-SPLASHSIT', 'noomi', 'production'), 'still respects who can perform a gag');
  assert.equal(caps.sha256, 'open');
});
