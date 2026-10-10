/* The Glorious Mess Auction — authored content.
 * Everyone draws blind, prices their own mess in secret, then bids on everyone else's by holding a paddle up while the
 * price climbs. The discovery is the gap: how little we think our own mess is worth, and how much we (and our friends)
 * will pay for someone else's. Source rituals in the corpus: TS-016 Purpose Day Off (Drop: not every moment must be
 * meaningful), TS-046 Reply Delay Roulette (Patch: what other people are really thinking), TS-091 Emotion Neighbour
 * Test (Sync), TS-076 Shoelace Start (Rush: shrink the start until it is almost silly). */
import type { Slug } from '../../room/protocol';

/** Prompts rotate by round, so a replay is a new mess. All are about you — the person we judge most harshly. */
export const PROMPTS: { face: string; hair: string; title: string; extra: string }[] = [
  { face: 'Your self-portrait', hair: 'Now your hair. Still blind.', title: 'Self-portrait, blind', extra: 'hair' },
  { face: 'You, on a Monday morning', hair: 'Now your coffee. Still blind.', title: 'Monday, blind', extra: 'coffee' },
  { face: 'Your inner critic', hair: 'Now give it a hat. Still blind.', title: 'The Critic, blind', extra: 'hat' },
  { face: 'You, as a superhero', hair: 'Now your cape. Still blind.', title: 'Hero, blind', extra: 'cape' }
];

export const T_FACE = 8, T_HAIR = 6;            // seconds of blind drawing per pass
export const EST_MIN = 1, EST_MAX = 10000;

/* ---------- the auction clock (seconds) ---------- */
export const AUC = {
  intro: 3.6,
  present: 3.2,      // the cloth comes off, the plaque, the gasps
  open: 1.4,         // "Opening at ten bubbles!"
  grace: 1.6,        // humans who have not raised a paddle by now are out
  cap: 10,           // the hammer falls by itself
  going: 1.8,        // going once… going twice…
  sold: 2.8,
  gap: 8,            // the estimates reveal after the last lot
  finale: 17
};
export const P0 = 10, RATE = 0.6;
/** The price climbs exponentially while paddles stay up (bubbles, rounded to nice numbers). */
export function priceAt(sec: number): number {
  const p = P0 * Math.exp(RATE * Math.max(0, sec));
  const step = p < 50 ? 1 : p < 200 ? 5 : p < 1000 ? 10 : p < 5000 ? 50 : 100;
  return Math.round(p / step) * step;
}
/** "1,240 bubbles"; above 500 the auctioneer converts into moons and pickles. */
export function fmt(n: number) { return Math.round(n).toLocaleString('en-US'); }
export function moonsAndPickles(n: number): string {
  if (n < 500) return '';
  const moons = Math.floor(n / 500), pickles = Math.round((n % 500) / 40);
  return moons + (moons === 1 ? ' moon' : ' moons') + (pickles ? ' and ' + pickles + (pickles === 1 ? ' pickle' : ' pickles') : '');
}
/** The auctioneer's conversion of any price into things that matter. */
export function worth(n: number): string {
  if (n < 20) return 'less than a pickle';
  if (n < 60) return 'about a pickle';
  if (n < 500) return 'about ' + Math.round(n / 40) + ' pickles';
  return moonsAndPickles(n);
}
/** The price slider's stops (bubbles). */
export const EST_STEPS = [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000];

/** The collectors in the room (in order of who gets a seat first). Glitch runs the auction; Patch wears the white
 * gloves — unless a person in the room is using that Bubble, then the next free Bubble takes the job. */
export const COLLECTORS: Slug[] = ['still', 'rush', 'drop', 'loopie', 'sync'];
export const STAFF_POOL: Slug[] = ['glitch', 'patch', 'sync', 'loopie', 'still', 'drop', 'rush'];
/** When each collector lets its paddle down, in seconds after bidding opens (authored ranges, seeded per lot). */
export const DROP_RANGE: Record<string, [number, number]> = {
  rush: [0.7, 2.3],     // panics, drops first, regrets it
  loopie: [2.4, 4.6],   // drops… raises again… (a gag; Glitch ignores it)
  sync: [3.0, 5.5],     // copies the first person who drops (see logic)
  drop: [4.6, 7.0],     // weeping; holds on far too long
  still: [5.4, 8.4],    // one calm nod; often wins
  glitch: [3.2, 6.0],   // only when Glitch is a guest rather than the auctioneer
  patch: [4.0, 7.0]
};
/** What each Bubble thinks its own blind portrait is worth (they are terrible at this too). */
export const COMPANION_EST: Record<Slug, number> = { rush: 2, loopie: 7, drop: 1, still: 40, sync: 12, glitch: 404, patch: 15 };
export const PADDLE: Record<string, number> = { rush: 7, loopie: 8, drop: 3, still: 1, sync: 22, glitch: 404, patch: 15 };
export const HUMAN_PADDLES = [11, 42, 64, 99];
