// Differential test: the real backend (Postgres + the gateway) against the reference engine
// (core/relay.js, 169 tests). Random sequences of actions by several people (releasing,
// catching, writing, reporting, blocking, withdrawing, letting go, asking a Mallow, sending
// out again, deleting, moderating, time passing) run through both; every answer (or refusal)
// must be the same, ids aside. Seeds are fixed, so a failure always reproduces.

import test from 'node:test';
import assert from 'node:assert/strict';
import { RelayService } from '../core/relay.js';
import { backend } from './backend-helpers.mjs';

const PEOPLE = [['moon', 'noomi'], ['cloud', 'blubi'], ['star', 'pipzi'], ['fern', 'loomi'], ['dream', 'zuzu'], ['pebble', 'boppo']];
const FEELINGS = [
  'My friend hasn’t replied. I think they’re avoiding me.', 'I keep replaying what I said in the meeting.',
  'I’m nervous about starting my new job on Monday.', 'Everyone seems to have it together except me.',
  'I feel left out of the group chat lately.', 'hi', 'Call me on 0412 345 678 if you want to talk.', 'I want to end it all',
];
const REFRAMES = [
  'Maybe they’ve had a really full week and meant to reply when they had more energy.',
  'Another possibility could be that they read it on the go and forgot it was still unanswered.',
  'Could there be another explanation, like them worrying about saying the wrong thing?',
  'Maybe the silence says more about their week than about how they feel about you.',
  'Maybe they’ve had a really full week and meant to reply when they had more energy!',   // near-duplicate
  'That is stupid, you are overreacting.', 'ok', 'Email me at someone@example.com and we can talk',
  'I don’t want to be here anymore',
];
const STEPS = [60e3, 5 * 60e3, 31 * 60e3, 3 * 3600e3, 25 * 3600e3];
const LABELS = [null, 'worry', 'sadness', 'loneliness'];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
const mallowStub = async ({ label, mallow }) => ({ status: 'ok', text: `A gentle thought about ${label || 'this'} from ${mallow}.`, mallow, source: 'library', model: 'stub' });

/** Ids differ between the two worlds; everything else must not. */
function normal(value) {
  const ids = new Map();
  const ID = /^(?:(?:jr|pv|hold|mp|rep|acc|aud)_[a-z0-9]{14}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
  const DROP = new Set(['test', 'adultConfirmed', 'seen']);
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v).sort()) if (!DROP.has(k)) out[k] = walk(v[k]);
      return out;
    }
    if (typeof v === 'string' && ID.test(v)) { if (!ids.has(v)) ids.set(v, `ID${ids.size + 1}`); return ids.get(v); }
    return v;
  };
  return walk(value);
}

async function run(seed, steps) {
  const R = rng(seed);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const clock = { t: Date.UTC(2026, 9, 14, 9) };
  const ref = new RelayService({ now: () => clock.t, random: rng(1), provider: mallowStub, limits: { fairnessPool: 1 }, testMode: true });
  const refTok = {};
  for (const [k, m] of PEOPLE) { ref.createTestAccount({ key: k, pseudonym: `${k}Mallow`, mallow: m, catching: true }); refTok[k] = ref.signInTestAccount(k); }
  ref.createTestAccount({ key: 'mod', pseudonym: 'SafetyDesk', mallow: 'loomi', role: 'moderator', catching: false });
  refTok.mod = ref.signInTestAccount('mod');

  const b = await backend({ mallow: { perspective: mallowStub }, start: clock.t, settings: { limits: { fairnessPool: 1 }, mallow: { autoGenerate: false } } });
  b.clock.t = clock.t;
  for (const [k, m] of PEOPLE) await b.join(`${k}Mallow`, { mallow: m });
  await b.join('SafetyDesk', { role: 'moderator', catching: false });
  const who = (k) => b.people[k === 'mod' ? 'SafetyDesk' : `${k}Mallow`];

  // each world keeps its own handles (ids differ); the same index picks the same thing in both
  const handles = { ref: {}, db: {} };
  const H = (w, k) => (handles[w][k] ||= { hold: null, journeys: [], gifts: [], reports: [] });
  const trace = [];
  const gone = new Set();
  const coverage = {};                                                // deleted their data: their sign-in is gone too

  async function both(k, method, makeArgs) {
    const outs = {};
    for (const w of ['ref', 'db']) {
      const args = makeArgs ? makeArgs(H(w, k), w) : {};
      try {
        const v = w === 'ref' ? await ref[method](refTok[k], args) : await b.gw.call(who(k), method, args);
        outs[w] = { ok: v };
        remember(w, k, method, v);
        if (method === 'deleteMyData') gone.add(k);
      } catch (e) {
        if (!e.code) throw e;
        outs[w] = { error: e.code, message: e.message };
      }
    }
    trace.push(`${k}.${method}`);
    const key = `${method}:${outs.ref.ok ? 'ok' : outs.ref.error}`;
    coverage[key] = (coverage[key] || 0) + 1;
    assert.deepEqual(normal(outs.db), normal(outs.ref), `seed ${seed}, step ${trace.length}: ${k}.${method} answered differently.\nTrace: ${trace.slice(-25).join(' → ')}`);
    return outs;
  }
  function remember(w, k, method, v) {
    const h = H(w, k);
    if ((method === 'findFeeling' || method === 'catchFeeling') && v?.offer) h.hold = v.offer.holdId;
    if (method === 'listJourneys') h.journeys = v.journeys;
    if (['myGifts', 'withdrawPerspective', 'setGiftSharing'].includes(method)) h.gifts = v.gifts;
    if (method === 'modListReports') h.reports = v.reports;
  }
  const jid = (i) => (h) => ({ journeyId: h.journeys[i % Math.max(1, h.journeys.length)]?.id || 'none' });

  for (let s = 0; s < steps; s++) {
    clock.t += 1 + Math.floor(R() * 9);                                  // no two actions at the same instant
    b.clock.t = clock.t;
    const k = pick(PEOPLE)[0];
    const i = Math.floor(R() * 4);
    if (gone.has(k)) continue;
    const roll = R();
    if (roll < 0.06) {                                                   // time passes for everyone
      clock.t += pick(STEPS); b.clock.t = clock.t;
      ref.tick(); await b.tick();
      trace.push(`time +${clock.t}`);
      continue;
    }
    if (roll < 0.16) {
      const a = { text: pick(FEELINGS), label: pick(LABELS), consent: R() > 0.05, allowFallback: R() > 0.5, clientId: `f-${seed}-${s}-xxxx` };
      await both(k, 'submitFeeling', () => a);
    } else if (roll < 0.30) {
      // the usual flow: look up, catch, write (most perspectives are fine; some get screened)
      const out = await both(k, 'findFeeling');
      if (out.ref.ok?.offer && R() < 0.85) {
        await both(k, 'catchFeeling', (h) => ({ holdId: h.hold }));
        if (R() < 0.9) {
          const text = R() < 0.8 ? REFRAMES[Math.floor(R() * 4)] : pick(REFRAMES); const share = R() > 0.5; const id = `w-${seed}-${s}-xxxx`;
          await both(k, 'submitReframe', (h) => ({ holdId: h.hold, text, clientId: id, allowShare: share }));
        }
      }
    }
    else if (roll < 0.38) await both(k, 'catchFeeling', (h) => ({ holdId: h.hold || 'none' }));
    else if (roll < 0.50) {
      const text = pick(REFRAMES); const share = R() > 0.5; const id = `r-${seed}-${s}-xxxx`;
      await both(k, 'submitReframe', (h) => ({ holdId: h.hold || 'none', text, clientId: id, allowShare: share }));
    } else if (roll < 0.53) await both(k, 'letFloatPast', (h) => ({ holdId: h.hold || 'none' }));
    else if (roll < 0.62) await both(k, 'listJourneys');
    else if (roll < 0.65) await both(k, 'withdrawFeeling', jid(i));
    else if (roll < 0.69) { const consent = R() > 0.3; await both(k, 'askMallow', (h) => ({ ...jid(i)(h), consent })); }
    else if (roll < 0.71) await both(k, 'resendJourney', (h) => ({ ...jid(i)(h), clientId: `s-${seed}-${s}-xxxx` }));
    else if (roll < 0.75) {
      const keep = pick([true, false, null]); const n = Math.floor(R() * 6);
      await both(k, 'choosePerspective', (h) => {
        const j = h.journeys[i % Math.max(1, h.journeys.length)];
        const items = j ? [...(j.collection || []), ...(j.mallowExtra ? [j.mallowExtra] : [])] : [];
        return { journeyId: j?.id || 'none', perspectiveId: items[n % Math.max(1, items.length)]?.id || 'none', keep };
      });
    } else if (roll < 0.77) await both(k, 'saveJourney', jid(i));
    else if (roll < 0.79) await both(k, 'releaseJourney', jid(i));
    else if (roll < 0.80) await both(k, 'deleteJourney', (h) => ({ ...jid(i)(h), confirm: 'DELETE' }));
    else if (roll < 0.82) await both(k, 'markReturnSeen', jid(i));
    else if (roll < 0.85) await both(k, 'myGifts');
    else if (roll < 0.86) { const allowShare = R() > 0.5; await both(k, 'setGiftSharing', (h) => ({ perspectiveId: h.gifts[i % Math.max(1, h.gifts.length)]?.id || 'none', allowShare })); }
    else if (roll < 0.87) await both(k, 'withdrawPerspective', (h) => ({ perspectiveId: h.gifts[i % Math.max(1, h.gifts.length)]?.id || 'none' }));
    else if (roll < 0.89) {
      const reason = pick(['unkind', 'harassment', 'safety', 'other', 'nonsense']); const details = R() > 0.5 ? 'It felt off.' : '';
      await both(k, 'reportFeeling', (h) => ({ holdId: h.hold || 'none', reason, details }));
    } else if (roll < 0.91) {
      const reason = pick(['unkind', 'identifying', 'other']); const n = Math.floor(R() * 6);
      await both(k, 'reportPerspective', (h) => {
        const j = h.journeys[i % Math.max(1, h.journeys.length)];
        const items = j ? [...(j.collection || []), ...(j.mallowExtra ? [j.mallowExtra] : [])] : [];
        return { journeyId: j?.id || 'none', perspectiveId: items[n % Math.max(1, items.length)]?.id || 'none', reason };
      });
    } else if (roll < 0.93) {
      const viaHold = R() > 0.5; const n = Math.floor(R() * 6);
      await both(k, 'blockContributor', (h) => {
        if (viaHold) return { holdId: h.hold || 'none' };
        const j = h.journeys[i % Math.max(1, h.journeys.length)];
        const humans = (j?.collection || []).filter((p) => p.kind === 'human');
        return { journeyId: j?.id || 'none', perspectiveId: humans[n % Math.max(1, humans.length)]?.id || 'none' };
      });
    } else if (roll < 0.95) await both(k, 'me');
    else if (roll < 0.96) await both(k, 'exportMyData');
    else if (roll < 0.97) { const a = { catching: R() > 0.2, mallow: pick(PEOPLE)[1] }; await both(k, 'savePreferences', () => a); }
    else if (roll < 0.985) {
      await both('mod', 'modListReports');
      const action = pick(['dismiss', 'resume-feeling', 'remove-feeling', 'remove-perspective', 'restrict-user']);
      const n = Math.floor(R() * 5);
      await both('mod', 'modGetReport', (h) => ({ id: h.reports[n % Math.max(1, h.reports.length)]?.id || 'none' }));
      const note = R() > 0.5 ? 'Looked at it.' : '';
      await both('mod', 'modResolve', (h) => ({ id: h.reports[n % Math.max(1, h.reports.length)]?.id || 'none', action, note }));
    } else if (roll < 0.99) { const confirm = R() > 0.7 ? 'DELETE' : 'no'; await both(k, 'deleteMyData', () => ({ confirm })); }
    else await both(k, 'getJourney', jid(i));
  }
  await b.drop();
  if (process.env.HM_COVERAGE) console.log(JSON.stringify(coverage));
  return { steps: trace.length, coverage };
}

for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
  test(`differential: the real backend answers exactly as the reference engine (seed ${seed})`, async (t) => {
    const { steps, coverage } = await run(seed, 300);
    t.diagnostic(JSON.stringify(Object.fromEntries(Object.entries(coverage).filter(([k]) => k.endsWith(':ok')))));
    assert.ok(steps > 200);
    // the run must really exercise the system, not just compare refusals
    const ok = (m) => Object.entries(coverage).filter(([k]) => k === `${m}:ok`).reduce((n, [, v]) => n + v, 0);
    for (const m of ['submitFeeling', 'findFeeling', 'catchFeeling', 'submitReframe', 'listJourneys']) assert.ok(ok(m) > 0, `no successful ${m} in this run`);
  });
}
