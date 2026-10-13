// Final main-screen polish (integ/final-main-polish): the urgent support sheet's calls, the first world from the
// words, reduced motion in the ocean, a heavy Tell inside a world, and the minors of the final QA sweep.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const support = await import('../src/app/scenes/support.js');

test('support: the region comes from the time zone first, the language only when the zone names no place', () => {
  const { supportRegion } = support;
  assert.equal(supportRegion({ timeZone: 'Europe/London', languages: ['en-US'] }), 'GB', 'en-US phones in the UK');
  assert.equal(supportRegion({ timeZone: 'Europe/Dublin' }), 'IE');
  assert.equal(supportRegion({ timeZone: 'America/Chicago', languages: ['en-GB'] }), 'US');
  assert.equal(supportRegion({ timeZone: 'America/Indiana/Indianapolis' }), 'US');
  assert.equal(supportRegion({ timeZone: 'Pacific/Honolulu' }), 'US');
  assert.equal(supportRegion({ timeZone: 'America/Toronto' }), 'CA');
  assert.equal(supportRegion({ timeZone: 'America/Mexico_City', languages: ['en-US'] }), null, 'a place the lines do not cover');
  assert.equal(supportRegion({ timeZone: 'Asia/Kolkata', languages: ['en-GB'] }), null);
  assert.equal(supportRegion({ timeZone: 'UTC', languages: ['en-GB'] }), 'GB', 'UTC: the language decides');
  assert.equal(supportRegion({ timeZone: null, languages: ['fr', 'en-US'] }), 'US');
  assert.equal(supportRegion({ timeZone: 'Etc/UTC', languages: ['de-DE'] }), null);
  assert.equal(supportRegion({}), null);
});

test('support: the urgent calls dial only numbers the sheet already lists, emergency first', () => {
  const { urgentCalls, SUPPORT_LINES, emergencyNumber } = support;
  const known = new Set(['999', '911', '112', ...SUPPORT_LINES.filter((l) => l.tel).map((l) => l.tel)]);
  assert.match(SUPPORT_LINES.find((l) => l.id === 'emergency').how, /999, 911, 112/, 'the three emergency numbers are the card\'s own');
  for (const r of ['GB', 'IE', 'US', 'CA', null]) {
    const calls = urgentCalls(r);
    assert.ok(calls.length >= 2, r);
    assert.equal(calls[0].id, 'emergency');
    assert.equal(calls[0].href, `tel:${emergencyNumber(r)}`);
    for (const c of calls) if (c.href.startsWith('tel:')) assert.ok(known.has(c.href.slice(4)), `${r}: ${c.href} is a listed number`);
  }
  assert.equal(emergencyNumber('GB'), '999');
  assert.equal(emergencyNumber('US'), '911');
  assert.equal(emergencyNumber(null), '112');
  assert.equal(urgentCalls('GB')[1].href, 'tel:116123', 'the UK: Samaritans');
  assert.equal(urgentCalls('US')[1].href, 'tel:988', 'the US: 988');
  assert.equal(urgentCalls(null)[1].href, 'https://findahelpline.com', 'elsewhere: Find A Helpline lists the local crisis lines');
});

test('support: abuse, violence and threats put Find A Helpline first and say it lists domestic-abuse services', () => {
  const { supportLines, abuseFirst } = support;
  for (const c of ['abuse', 'violence', 'threat']) {
    const ls = supportLines(c);
    assert.equal(ls[0].id, 'findahelpline', c);
    assert.match(ls[0].how, /domestic-abuse services/);
    assert.equal(ls.length, 4, 'nothing added, nothing dropped');
    assert.ok(abuseFirst(c));
  }
  for (const c of [null, 'unsafe', 'harassment', 'discrimination', 'loss', 'self']) assert.equal(supportLines(c)[0].id, 'emergency', String(c));
  const src = read('src/app/scenes/support.js');
  assert.doesNotMatch(src.replace(/\/\/[^\n]*/g, ''), /0808|1-800|799-7233/, 'no new numbers');
  // the urgent sheet: the calls come before the cards and the foot's "I'm safe — continue"
  const body = src.slice(src.indexOf('const body = urgent'));
  assert.ok(body.indexOf("class: 'support-calls'") > 0 && body.indexOf("class: 'support-calls'") < body.indexOf('...lines.map(card)'));
  // (the scene's support sheet reads the visit's category when the Support pill names none)
  assert.match(src, /app\?\.state\?\.hfSafety\?\.category/);
});
