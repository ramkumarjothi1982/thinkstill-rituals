import { HushmatesService } from '../core/service.js';
import { seedDemo } from '../core/seed.js';

// deterministic random + controllable clock
export function rng(seed = 42) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

export function world({ limits = {} } = {}) {
  const clock = { t: Date.UTC(2026, 9, 13, 12) };
  const svc = new HushmatesService({ now: () => clock.t, random: rng(), limits });
  seedDemo(svc);
  const tok = (key) => svc.signInTestAccount(key);
  const T = { moon: tok('moon'), cloud: tok('cloud'), star: tok('star'), fern: tok('fern'), dream: tok('dream'), mod: tok('mod') };
  svc.saveProfile(T.moon, { pseudonym: 'MoonMallow', avatar: 'noomi', interests: ['Work & study', 'Everyday stress'], style: 'gentle' });
  const handle = (key) => svc.me(T[key]).profile.handle;
  return { svc, clock, T, handle, advance: (ms) => { clock.t += ms; } };
}

/** MoonMallow and CloudMallow as connected Hushmates; returns the Hushspace id. */
export function connect(w, a = 'moon', b = 'cloud') {
  const inv = w.svc.sendInvitation(w.T[a], { handle: w.handle(b) });
  return w.svc.respondToInvitation(w.T[b], { id: inv.id, accept: true }).conversationId;
}

export function throwsCode(fn, code) {
  try { fn(); } catch (e) { if (e.code === code) return true; throw new Error(`expected ${code}, got ${e.code}: ${e.message}`); }
  throw new Error(`expected ${code}, but it succeeded`);
}
