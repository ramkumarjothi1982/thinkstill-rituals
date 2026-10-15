// The screens around the main flow say only what the code does, and clean up what they say they do (fix round, 15 Oct
// 2026): About names everything Another Angle sends and what an account keeps; the account deletion screen claims no
// more than delete_my_account() removes; "Delete everything" clears the tab's visit safety too; a returning pilot tester
// whose test plan this site no longer honours is told so, quietly, on the plans page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createStore } from '../src/engine/storage.js';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const LIVE = 'https://hushmallow-another-angle.vibyfy-chat.workers.dev';

test('About: the one exception names the words, the feeling and the kind of help Another Angle sends', async () => {
  const P = await import('../src/app/privacy.js');
  for (const signIn of [false, true]) {
    const live = P.aboutPrivacy({ endpoint: LIVE, signIn });
    assert.match(live, /The one exception is Another Angle in hushmallow Beyond: only after you say yes, the words you choose go to our server, with the feeling and the kind of help you pick there, and an outside service prepares the perspectives you see\./);
    assert.doesNotMatch(P.aboutPrivacy({ endpoint: null, signIn }), /feeling and the kind of help/, 'nothing is sent while Another Angle is not live');
  }
  // (what the client really sends: the words, and the feeling and intention when picked)
  const client = read('src/beyond/angle-client.js');
  assert.match(client, /if \(typeof emotion === 'string' && EMOTION_ID\.test\(emotion\)\) body\.emotion = emotion;/);
  assert.match(client, /if \(typeof intention === 'string' && INTENTION_ID\.test\(intention\)\) body\.intention = intention;/);
  // signed in: what an account keeps includes when the app was last opened (profiles.last_seen_at, touched at each start)
  assert.match(P.ACCOUNT_KEEPS, /is kept with it, as is when you last opened the app;/);
  assert.match(read('src/auth/client.js'), /update\(\{ last_seen_at: /);
  assert.match(P.aboutPrivacy({ endpoint: LIVE, signIn: true }), /when you last opened the app/);
});

test('account deletion: no more than delete_my_account() removes; the sign-in service’s own log is named', () => {
  const src = read('src/app/scenes/account.js');
  const sql = read('supabase/migrations/0007_delete_my_account.sql');
  // what the function deletes: the profile row (with last_seen_at), the sync rows and the auth.users row
  for (const t of ['public.profiles', 'public.sync_consents', 'public.preferences', 'public.favourite_worlds', 'public.garden_skills', 'public.hushflow_progress', 'auth.users']) assert.ok(sql.includes(`delete from ${t} where`), t);
  assert.doesNotMatch(sql, /audit_log_entries/, 'the sign-in service’s own security log is not deleted by it');
  assert.match(src, /'your profile: your name, home Mallow and when you last opened the app'/);
  const notTouched = src.slice(src.indexOf('const NOT_TOUCHED = ['), src.indexOf('];', src.indexOf('const NOT_TOUCHED = [')));
  assert.match(notTouched, /'the sign-in service’s own security log \(such as when you signed in\): we can’t delete it from here'/);
});

test('Settings → Delete everything: the tab’s visit safety goes too (stored copy and the page’s own)', () => {
  const src = read('src/app/scenes/settings.js');
  assert.match(src, /import \{ forgetVisitSafety \} from '\.\.\/visit-safety\.js';/);
  assert.match(src, /rec\.clearAll\(\); forgetVisit\(\); s\.close\(\); toast\('Deleted'\); app\.go\('home'\);/);
  const fn = src.slice(src.indexOf('function forgetVisit() {'), src.indexOf('}', src.indexOf('function forgetVisit() {')) + 1);
  assert.match(fn, /forgetVisitSafety\(\);/);
  assert.match(fn, /app\.state\.hfSafety = null;/);
  // "Keep my saved angles" is not this round's to change
  assert.match(src, /sw\('saveWords', 'Keep my saved angles'/);
});

test('plans: a test plan kept on the phone and set aside on a host without test purchases → one quiet line', async () => {
  const { createEntitlements } = await import('../src/app/entitlements.js');
  const prev = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const at = (hostname) => Object.defineProperty(globalThis, 'location', { value: { hostname }, configurable: true });
  try {
    const kept = JSON.stringify({ tier: 'ultra', source: 'test', since: 1 });
    // the pilot's public host: set aside, said once on the plans page, nothing stored changed
    at('ramkumarjothi1982.github.io');
    let store = createStore({ backend: 'memory' });
    store.set('entitlement', JSON.parse(kept));
    let ent = createEntitlements({ store });
    assert.equal(ent.tier(), 'none');
    assert.equal(ent.testEnded, true);
    assert.equal(ent.canPurchase, false);
    assert.equal(JSON.stringify(store.get('entitlement')), kept, 'purchasing and storage are unchanged');
    assert.deepEqual(await ent.purchase('paid'), { ok: false, test: false, unavailable: true });
    // a development host keeps its test plan (nothing to say), and nobody else is told anything
    at('localhost');
    ent = createEntitlements({ store });
    assert.equal(ent.tier(), 'ultra');
    assert.equal(ent.testEnded, false);
    at('ramkumarjothi1982.github.io');
    store = createStore({ backend: 'memory' });
    assert.equal(createEntitlements({ store }).testEnded, false, 'no plan kept: no line');
    store.set('entitlement', { tier: 'paid', source: 'app-store', since: 1 });
    assert.equal(createEntitlements({ store }).testEnded, false, 'a real plan: no line');
  } finally {
    if (prev) Object.defineProperty(globalThis, 'location', prev); else delete globalThis.location;
  }
  const P = await import('../src/app/scenes/plans.js');
  assert.equal(P.TEST_ENDED, 'Test access ended for the pilot.');
  assert.match(read('src/app/scenes/plans.js'), /ent\.testEnded \? h\('p', \{ class: 'test-note', 'data-test-ended': '' \}, TEST_ENDED\) : null/);
});
