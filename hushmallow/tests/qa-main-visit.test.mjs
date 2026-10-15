// QA main sweep (minor): after a heavy visit a reload in the same tab is still the same gentle visit — the level
// (never the words) is kept in sessionStorage for the tab, and every Mallow keeps the attentive face meanwhile
// (the plans page's 'curious' included).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { recallVisitSafety, rememberVisitSafety, forgetVisitSafety, VISIT_SAFETY_KEY, MAX_AGE_MS } = await import('../src/app/visit-safety.js');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const fnBody = (src, start, end) => { const a = src.indexOf(start); const b = src.indexOf(end, a + start.length); assert.ok(a >= 0 && b > a, `${start} … ${end}`); return src.slice(a, b); };
function fakeSession() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } };
}

test('visit r1: only the level is kept for the tab — never the words, nothing else', () => {
  const ss = fakeSession();
  assert.equal(recallVisitSafety({ ss }), null);
  assert.equal(rememberVisitSafety({ level: 'none' }, { ss }), false, 'an ordinary visit keeps nothing');
  assert.equal(ss.m.size, 0);
  const words = 'my partner hits me';
  assert.equal(rememberVisitSafety({ level: 'care', category: 'unsafe', crisisSpoken: false, text: words, input: { text: words } }, { ss, now: 1000 }), true);
  const raw = ss.m.get(VISIT_SAFETY_KEY);
  // (fix round, privacy: not the reading's category either — only what routing across a reload needs, as flags)
  assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), ['at', 'crisisSpoken', 'level']);
  assert.doesNotMatch(raw, /partner|hits|text|input|unsafe|category/, 'no words, no category');
  assert.deepEqual(recallVisitSafety({ ss, now: 2000 }), { level: 'care', crisisSpoken: false });
  // routing flags only, as booleans; anything else (a category, free text) is dropped
  rememberVisitSafety({ level: 'care', category: 'abuse', abuseFirst: true, noWorld: 'yes', note: 'he hit me' }, { ss, now: 3000 });
  assert.deepEqual(recallVisitSafety({ ss, now: 3000 }), { level: 'care', crisisSpoken: false, abuseFirst: true });
  assert.doesNotMatch(ss.m.get(VISIT_SAFETY_KEY), /abuse"|he hit me|note/);
});

test('visit r1: the level only rises; the calm line said stays said; it lapses after 12 h and when unreadable', () => {
  const ss = fakeSession();
  rememberVisitSafety({ level: 'crisis', category: null, crisisSpoken: true }, { ss, now: 0 });
  rememberVisitSafety({ level: 'concern', category: 'distress', crisisSpoken: false, liftable: true }, { ss, now: 10 });
  // (fix round: a lower level never brings its "distress alone" with it)
  assert.deepEqual(recallVisitSafety({ ss, now: 20 }), { level: 'crisis', crisisSpoken: true });
  assert.equal(recallVisitSafety({ ss, now: 10 + MAX_AGE_MS + 1 }), null, 'a tab left open past 12 h is a new visit');
  assert.equal(ss.m.size, 0, '...and the lapsed level is removed');
  ss.setItem(VISIT_SAFETY_KEY, '{nope');
  assert.equal(recallVisitSafety({ ss }), null);
  ss.setItem(VISIT_SAFETY_KEY, JSON.stringify({ level: 'panic', at: Date.now() }));
  assert.equal(recallVisitSafety({ ss }), null);
  forgetVisitSafety({ ss });
  assert.equal(ss.m.size, 0);
  // storage blocked: nothing throws
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(recallVisitSafety({ ss: blocked }), null);
  assert.equal(rememberVisitSafety({ level: 'care' }, { ss: blocked }), false);
});

test('visit r1: the Hushfold keeps the level for the tab, reads it back before the first frame, and floors every Mallow', () => {
  const scene = read('src/app/scenes/hushfold.js');
  const keep = fnBody(scene, 'function keepSafety() {', '// ---------------------------------------------------- telling');
  // (fix round: the routing flags only for a reload, never the category)
  assert.match(keep, /app\.state\.hfSafety = \{ level: S\.level, category: S\.category, crisisSpoken: S\.crisisSpoken, \.\.\.flags \};\s*rememberVisitSafety\(\{ level: S\.level, crisisSpoken: S\.crisisSpoken, \.\.\.visitFlags\(flags\) \}\);/);
  const enter = fnBody(scene, 'async enter() {', 'leave() {');
  const at = enter.indexOf('const kept = app.state.hfSafety || recallVisitSafety();');
  assert.ok(at > 0 && at < enter.indexOf('new MallowTouch('), 'read back before the Mallow is made');
  // (fix round: and after the check-in's "I'm okay" in this page session, S.attentive)
  assert.ok(enter.indexOf('if (kept?.level || S.attentive) setStageFloor(CARE_FACE);') > at && enter.indexOf('if (kept?.level || S.attentive) setStageFloor(CARE_FACE);') < enter.indexOf('new MallowTouch('));
  assert.match(fnBody(scene, 'function noteSafety(r) {', 'function safetyHold('), /keepSafety\(\);\s*\/\/[^\n]*\n\s*setStageFloor\(CARE_FACE\);/);
  // the module never touches localStorage and keeps no words (the shell itself still touches no storage at all)
  const mod = read('src/app/visit-safety.js');
  assert.doesNotMatch(mod.replace(/\/\/[^\n]*/g, ''), /localStorage|indexedDB|fetch\s*\(|\.text\b|\.input\b|words/);
  assert.doesNotMatch(scene, /sessionStorage|localStorage/);
});

test('visit r1: free tier back from the plans page without buying — a warm line, and the words offered back (memory only)', () => {
  const scene = read('src/app/scenes/hushfold.js');
  const resume = fnBody(scene, 'async function resumePendingTell() {', 'const view = {');
  const at = resume.indexOf("if (!ent.has('paid') && p.input?.text && !gentle()) { offerRetell(p); return true; }");
  assert.ok(at > 0 && at < resume.indexOf("if (!ent.has('paid')) return false;"), 'offered back before the plain no-plan return');
  assert.ok(at > resume.indexOf('if (p.gentle) { noteSafety(p.gentle); S.careSaid = true; }'), 'never after something heavy');
  const offer = fnBody(scene, 'function offerRetell(p) {', '/**');
  assert.match(offer, /subtitles\.choice\(RETELL, \[\{ label: 'Tell me again', value: 'tell', primary: true, onPick: \(\) => openTell\('retell'\) \}/);
  assert.match(offer, /else if \(v === 'play' && !gentle\(\)\) \{ retell = null;/, 'Just play lets the words go');
  assert.doesNotMatch(offer, /store\.|prefs\.set|app\.state\./, 'held in the scene only, never stored');
  assert.match(scene, /const RETELL = 'No rush\. Your words are still here, if you’d like to tell me again\.';/);
  // the overlay opens with them (Tell me again, or the Tell pill), and they go once sent
  const open = fnBody(scene, 'function openTellNow(prompt) {', 'async function afterTell(');
  assert.match(open, /const again = retell && !gentle\(\) \? retell : null;/);
  assert.match(open, /text: again\?\.text \|\| '',/);
  assert.match(open, /if \(retell\) retell = reason === 'submit' \? null : \(ov\?\.text\?\.trim\(\) \? \{ \.\.\.retell, text: ov\.text \} : null\);/);
});
