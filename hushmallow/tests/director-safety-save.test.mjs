// The director never saves progress while a world is held for safety (a reload after a crisis must
// not offer to resume it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/hushfold/flow/director.js', import.meta.url), 'utf8');

test('save() returns early while paused or pending for a safety reason', () => {
  const i = src.indexOf('function save() {');
  assert.ok(i > 0);
  const body = src.slice(i, src.indexOf('\n  }\n', i));
  assert.match(body, /if \(\(paused && pauseReason === 'safety'\) \|\| pausePending === 'safety'\) return;/);
  // the guard comes before anything is written
  assert.ok(body.indexOf("pauseReason === 'safety'") < body.indexOf('saveProgress('));
});
