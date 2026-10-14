// Layout (composer/layout.js): the library's wrap rule, hook auto-fit, glass
// card boxes as v2 measured them, and the pure TextBlock / LogoCard visibility
// models G-DIR reads.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrap2, fitSize, layoutHook, layoutBubble, layoutEndText, textLine, logoAlpha, TEXT_STYLES, TEXTBLOCK_DEFAULTS } from '../../composer/layout.js';
import { wrap2 as plannerWrap2, linePools } from '../../planner/library.mjs';
import { shimMeasure } from '../../composer/lib-node.mjs';
import { lib } from '../parity/composer-fixtures.mjs';

test('wrap2 is the story library\'s rule: identical to the planner\'s on every thought line of every template', () => {
  let n = 0;
  for (const t of lib.templates.values()) {
    const lines = [...t.escalation.lines, ...Object.values(linePools(t)).flat()];
    for (const l of new Set(lines)) { assert.deepEqual(wrap2(l, 17), plannerWrap2(l, 17), l); n++; }
  }
  assert.ok(n > 300, `${n} lines`);
  assert.deepEqual(wrap2('That awkward conversation.', 17), ['That awkward', 'conversation.']);
  assert.deepEqual(wrap2('Did I say something weird?', 17), ['Did I say', 'something weird?']);
  assert.deepEqual(wrap2('Why did I do that?', 17), ['Why did I', 'do that?']);
});

test('text styles are v2\'s and agree with the story library format', () => {
  const L = lib.raw.format.layout;
  assert.deepEqual([TEXT_STYLES.hook.y, TEXT_STYLES.hook.size, TEXT_STYLES.hook.minSize, TEXT_STYLES.hook.weight, TEXT_STYLES.hook.tracking], [L.hook.y, L.hook.size, L.hook.minSize, L.hook.weight, L.hook.tracking]);
  assert.deepEqual([TEXT_STYLES.bubble.size, TEXT_STYLES.bubble.weight], [L.thoughtBubble.size, L.thoughtBubble.weight]);
  assert.deepEqual([TEXT_STYLES.endText.y, TEXT_STYLES.endText.size, TEXT_STYLES.endText.weight], [L.resolution.y, L.resolution.size, L.resolution.weight]);
  assert.deepEqual([TEXT_STYLES.logo.y, TEXT_STYLES.logo.logoW, TEXT_STYLES.logo.urlSize], [L.logoCard.y, L.logoCard.logoW, L.logoCard.urlSize]);
});

test('hook auto-fit: the v2 hook keeps 76 px; long hooks shrink toward 50 px; a hook that cannot fit is refused', () => {
  assert.equal(layoutHook(['ME TRYING TO SLEEP', 'AT 2 AM...'], shimMeasure).size, 76);
  const long = layoutHook(['WHEN YOU CLOSE YOUR EYES', 'AND THE REPLAY STARTS'], shimMeasure);
  assert.ok(long.size < 76 && long.size >= 50, `${long.size}`);
  assert.ok(Math.max(...long.widths) <= 960);
  assert.throws(() => layoutHook(['A'.repeat(40)], shimMeasure), /does not fit/);
  assert.equal(fitSize(['X'], () => 2000, { weight: 600, max: 76, min: 50, maxWidth: 960 }), null);
});

test('glass card boxes follow v2\'s bubbleCanvas(): w/2 + 38 by rows · 58 / 2 + 26', () => {
  const m = () => 300;
  const b = layoutBubble('Did I say something weird?', m);
  assert.deepEqual(b, { lines: ['Did I say', 'something weird?'], w: 300, hw: 300 / 2 + 38, hh: (2 * 58) / 2 + 26 });
  assert.throws(() => layoutBubble('Supercalifragilisticexpialidocious nonsense', m), /cannot wrap/);
  assert.throws(() => layoutEndText(['x'], () => 1200), /over 960/);
});

test('TextBlock visibility model: the hook is fully up on frame 0, the return enters at HOOK_IN, the card fades out', () => {
  const hook = { lines: ['A', 'B'], y: 286, size: 76, weight: 600, tracking: 2, enterAt: -10, exitAt: 2.72, exitDur: 0.5 };
  assert.equal(textLine(hook, 0, 0).a, 1);
  assert.equal(textLine(hook, 0, 1).a, 1);
  assert.equal(textLine(hook, 3.3, 0).a, 0);
  const ret = { ...hook, enterAt: 14.66, inDur: 0.3, stagger: 0, rise: 0, exitAt: undefined };
  delete ret.exitAt;
  assert.equal(textLine(ret, 14.6, 0).a, 0);
  assert.ok(textLine(ret, 14.99, 1).a > 0.99);
  assert.equal(textLine(ret, 14.8, 0).y, 286, 'no rise on the return, so frame 0 continues it');
  const end = { lines: ['a', 'b'], y: 262, size: 62, weight: 500, enterAt: 11.9, exitAt: 14.3, exitDur: 0.34, stagger: 0.18 };
  assert.ok(textLine(end, 12.5, 1).a < textLine(end, 12.5, 0).a, 'rows are staggered');
  assert.equal(textLine(end, 14.7, 0).a, 0);
  assert.equal(TEXTBLOCK_DEFAULTS.lineHeight, 1.16);
  const logo = { enterAt: 12.6, exitAt: 14.3, exitDur: 0.34 };
  assert.deepEqual(logoAlpha(logo, 12.5), { plate: 0, url: 0 });
  assert.equal(logoAlpha(logo, 13.5).plate, 1);
});
