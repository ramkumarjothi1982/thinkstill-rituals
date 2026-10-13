import { RelayService } from '../core/relay.js';
import { seedRelay } from '../core/relay-seed.js';

export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

export const FEELING = 'My friend hasn’t replied. I think they’re avoiding me.';
export const REFRAMES = [
  'Maybe they’ve had a really full week and meant to reply when they had more energy.',
  'Another possibility could be that they read it on the go and forgot it was still unanswered.',
  'Could there be another explanation, like them worrying about saying the wrong thing?',
  'Maybe the silence says more about their week than about how they feel about you.',
  'It might help to send something light, with no pressure, and see how they are.',
];

let n = 0;
export const cid = (p = 'c') => `${p}-${(++n).toString(36)}-xxxxxxxx`;

export function world({ limits = {}, provider = null } = {}) {
  const clock = { t: Date.UTC(2026, 9, 14, 9) };
  const svc = new RelayService({ now: () => clock.t, random: rng(), limits, provider });
  seedRelay(svc);
  const T = {};
  for (const k of ['moon', 'cloud', 'star', 'fern', 'dream', 'pebble', 'ember', 'mod']) T[k] = svc.signInTestAccount(k);
  const release = (key = 'moon', o = {}) => svc.submitFeeling(T[key], { text: FEELING, label: 'worry', clientId: cid('f'), ...o });
  /** catch whatever this person is offered and write a perspective; returns the submit result */
  const give = (key, text) => {
    const { offer } = svc.findFeeling(T[key]);
    if (!offer) return null;
    svc.catchFeeling(T[key], { holdId: offer.holdId });
    return svc.submitReframe(T[key], { holdId: offer.holdId, text, clientId: cid('r') });
  };
  return { svc, clock, T, release, give, advance: (ms) => { clock.t += ms; svc.tick(); } };
}

export function throwsCode(fn, code) {
  try { fn(); } catch (e) { if (e.code === code) return true; throw new Error(`expected ${code}, got ${e.code}: ${e.message}`); }
  throw new Error(`expected ${code}, but it succeeded`);
}
export async function rejectsCode(p, code) {
  try { await p; } catch (e) { if (e.code === code) return true; throw new Error(`expected ${code}, got ${e.code}: ${e.message}`); }
  throw new Error(`expected ${code}, but it succeeded`);
}
