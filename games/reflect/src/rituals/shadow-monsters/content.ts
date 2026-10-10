/* Shadow Monsters — authored content: the toyboxes, the optional name tags, the Bubble companions' own monsters and
 * the show's timing. Source rituals in the corpus: TS-001 Certainty Receipt (Glitch: the story the brain supplies vs
 * what a camera would see), TS-061 Same Question, Different Costume (Loopie), TS-031 Three Changes (Still: attention
 * leaves the thought), TS-076 Shoelace Start (Rush: shrink the start until it is almost silly). */
import type { Slug } from '../../room/protocol';
import { OBJ_IDS, ObjId, OBJECTS } from './objects';
import { Placed, clampX, clampZ } from './world';

export const MAX_OBJS = 5;
export const BOX_SIZE = 8;

/** A seeded toybox of eight objects: always something for eyes, something spiky and something big. */
export function pickBox(rng: () => number): ObjId[] {
  const need: ObjId[][] = [['doughnut', 'scissors'], ['fork', 'cactus', 'whisk', 'glove'], ['teapot', 'umbrella', 'slipper']];
  const box = new Set<ObjId>();
  for (const opts of need) box.add(opts[Math.floor(rng() * opts.length)]);
  if (rng() < 0.6) box.add('duck');
  const rest = OBJ_IDS.filter(o => !box.has(o)).sort(() => rng() - 0.5);
  while (box.size < BOX_SIZE && rest.length) box.add(rest.pop()!);
  return Array.from(box).sort((a, b) => OBJ_IDS.indexOf(a) - OBJ_IDS.indexOf(b));
}

export type TagId = 'deadline' | 'message' | 'work' | 'money' | 'someone' | 'body' | 'said' | 'unsure';
export const TAGS: { id: TagId; label: string }[] = [
  { id: 'deadline', label: 'A deadline' }, { id: 'message', label: 'A message' }, { id: 'work', label: 'Work' },
  { id: 'money', label: 'Money' }, { id: 'someone', label: 'Someone' }, { id: 'body', label: 'My health' },
  { id: 'said', label: 'Something I said' }, { id: 'unsure', label: 'Not sure' }
];
export const TAG_IDS = TAGS.map(t => t.id);
export const TAG_PICT: Record<TagId, string> = { deadline: 'clock', message: 'chat', work: 'work', money: 'coin', someone: 'heart', body: 'plus', said: 'mouth', unsure: 'q' };

export interface Monster { objs: Placed[]; tag: TagId | null; mirror?: boolean; }

/** The Bubbles' own monsters (they bring their own objects, whatever is in the box). Positions in stage metres. */
export const COMPANION_MONSTERS: Record<Slug, Monster[]> = {
  rush: [
    { objs: [{ o: 'cactus', x: 0.0, z: 0.3, r: 0 }, { o: 'fork', x: -0.035, z: 0.25, r: 7 }, { o: 'whisk', x: 0.04, z: 0.28, r: 1 }], tag: 'message' },
    { objs: [{ o: 'glove', x: 0.0, z: 0.24, r: 0 }, { o: 'fork', x: -0.03, z: 0.3, r: 7 }, { o: 'banana', x: 0.035, z: 0.3, r: 1 }], tag: 'deadline' }
  ],
  loopie: [
    { objs: [{ o: 'croissant', x: 0.0, z: 0.2, r: 4 }, { o: 'doughnut', x: 0.012, z: 0.3, r: 0 }, { o: 'banana', x: -0.03, z: 0.26, r: 2 }], tag: 'unsure' }
  ],
  still: [
    { objs: [{ o: 'duck', x: 0.0, z: 1.0, r: 0 }], tag: null }
  ],
  drop: [
    { objs: [{ o: 'umbrella', x: 0.0, z: 0.34, r: 0 }, { o: 'teapot', x: 0.01, z: 0.42, r: 0 }], tag: 'someone' }
  ],
  patch: [
    { objs: [{ o: 'glove', x: 0.0, z: 0.28, r: 0 }, { o: 'slipper', x: 0.03, z: 0.5, r: 0 }], tag: 'said' }
  ],
  glitch: [
    { objs: [{ o: 'whisk', x: 0.0, z: 0.28, r: 0 }, { o: 'fork', x: -0.05, z: 0.34, r: 6 }, { o: 'fork', x: 0.05, z: 0.34, r: 2 }, { o: 'doughnut', x: 0.0, z: 0.42, r: 0 }], tag: 'work' }
  ],
  sync: [{ objs: [], tag: null, mirror: true }]
};

/** What each Bubble says its monster is (shown under it, always with "Bubble companion"). */
/** What each companion's monster is about (shown while it looms — never what it is made of, so the lights still surprise). */
export const COMPANION_NOTE: Record<Slug, string> = {
  rush: 'the email it hasn’t opened',
  loopie: 'the thing it worried about yesterday. Again.',
  still: 'its tea going slightly cold',
  drop: 'a tiny problem that feels enormous',
  patch: 'waving back at someone who wasn’t waving at Patch',
  glitch: 'the “quick” software update',
  sync: 'whatever yours was about'
};
/** The punchline when the lights come up on a companion's monster. */
export const COMPANION_PUNCH: Record<Slug, string> = {
  rush: 'It still hasn’t opened the email.',
  loopie: 'The same croissant dragon as last time.',
  still: 'Just a duck. Held very close.',
  drop: 'A storm in a teacup. Literally.',
  patch: 'They were waving at someone behind Patch.',
  glitch: 'Update 1 of 214.',
  sync: 'Exactly the same as yours.'
};

/** "a fork", "an umbrella" */
export function withArticle(name: string) { const n = name.toLowerCase(); return (/^[aeiou]/.test(n) ? 'an ' : 'a ') + n; }
export function listOf(names: string[]) { const n = names.map(withArticle); return n.length > 1 ? n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1] : n[0] || 'nothing at all'; }

/* ---------- the show's clock (seconds) ---------- */
export const SHOW = {
  intro: 3.2,
  dark: 0.6,            // lights out
  rise: 1.6,            // the monster looms up
  react: 1.4,           // audience reaction cut
  pullOpen: 3.4,        // owner may pull the light back from here (after monster start)
  autoPull: 8.6,        // humans who never pull: it happens anyway
  shrink: 2.4,
  beat: 0.8,
  lights: 3.4,          // lights up: the objects, the laughs, the gag
  evr: 4.6,             // "same stuff, more distance"
  finale: 15.5
};

/** How a companion pulls the light back: when (after the monster starts), how long, and the shape of the pull. */
export const COMPANION_PULL: Record<Slug, { at: number; dur: number; curve: 'plain' | 'yank' | 'loop' | 'gentle' }> = {
  rush: { at: 4.4, dur: 0.7, curve: 'yank' },
  loopie: { at: 4.8, dur: 4.2, curve: 'loop' },
  still: { at: 5.2, dur: 3.2, curve: 'gentle' },
  drop: { at: 5.0, dur: 2.6, curve: 'plain' },
  patch: { at: 4.8, dur: 2.4, curve: 'plain' },
  glitch: { at: 4.6, dur: 2.4, curve: 'plain' },
  sync: { at: 4.8, dur: 2.4, curve: 'plain' }
};

/** Pull progress 0..1 at fraction k of the pull. Loopie pulls back, pushes it forward again, then pulls back. */
export function pullCurve(curve: string, k: number): number {
  k = Math.max(0, Math.min(1, k));
  const io = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  if (curve === 'loop') { if (k < 0.35) return io(k / 0.35) * 0.75; if (k < 0.6) return 0.75 - io((k - 0.35) / 0.25) * 0.6; return 0.15 + io((k - 0.6) / 0.4) * 0.85; }
  if (curve === 'yank') return 1 - Math.pow(1 - k, 4);
  return io(k);
}
/** Lamp position for pull progress p (0 at rest → far back). */
export const lampZFor = (p: number) => -6.5 * p;

export function validObj(o: any, box: ObjId[]): Placed | null {
  if (!o || typeof o.o !== 'string' || !box.includes(o.o as ObjId) || !OBJECTS[o.o as ObjId]) return null;
  const x = Number(o.x), z = Number(o.z), r = Number(o.r);
  if (![x, z, r].every(Number.isFinite)) return null;
  const zz = clampZ(z);
  return { o: o.o, x: Math.round(clampX(x, zz) * 1000) / 1000, z: Math.round(zz * 1000) / 1000, r: ((Math.round(r) % 8) + 8) % 8 };
}
