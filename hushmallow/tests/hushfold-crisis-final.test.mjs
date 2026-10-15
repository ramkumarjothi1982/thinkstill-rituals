// Static guards for the crisis hold in a running world (H1 final review): after a crisis nothing on
// the stage invites play or offers to resume, and no saved world survives to be offered on reload.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/app/scenes/hushfold.js', import.meta.url), 'utf8');
const fn = (name) => {
  const i = src.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} exists`);
  const j = src.indexOf('\n  function ', i + 10);
  return src.slice(i, j > 0 ? j : undefined);
};

test('crisis hold hides the Paused pill, clears every line and choice, and forgets saved progress', () => {
  const body = fn('safetyHold');
  const crisis = body.slice(body.indexOf("level === 'crisis'"), body.indexOf('} else if'));
  assert.match(crisis, /pausedPill\.hidden = true/);
  assert.match(crisis, /subtitles\.clear\(\)/, 'a plain clear (no keepHeld), so a parked careBeat choice resolves as none');
  assert.match(crisis, /forgetProgress\(\)/);
});

test('the fade-out after a crisis keeps nothing that invites play', () => {
  const body = fn('onFinished');
  assert.match(body, /if \(S\.crisis\) \{ subtitles\.clear\(\); pausedPill\.hidden = true; forgetProgress\(\); \}/);
});

test('saved progress is cleared now and again after a hidden-tab save while the crisis hold lasts', () => {
  const body = fn('forgetProgress');
  assert.match(body, /clearProgress\(store\)/);
  assert.match(body, /visibilitychange/);
  assert.match(body, /S\.hold === 'crisis'/);
  assert.match(src, /removeEventListener\('visibilitychange', forgetOnHide\)/, 'the listener goes when the scene leaves');
});
