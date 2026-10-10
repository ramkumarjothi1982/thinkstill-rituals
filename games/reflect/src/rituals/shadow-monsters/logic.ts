/* Shadow Monsters — authoritative rules.
 * Sealed: your monster (up to five objects on sticks: which, where, how turned) and an optional name tag.
 * The Shadow Show runs on the room's clock from the reveal: each monster looms, the audience reacts live, its maker
 * pulls the light back (a live event recorded in pub so it survives the capped event log), the lights come up.
 * Companions' monsters and pulls are authored and seeded, and always labelled. */
import { RitualLogic, Seat, Rng, mulberry32 } from '../../room/ritual';
import type { Slug } from '../../room/protocol';
import { COMPANION_MONSTERS, COMPANION_PULL, MAX_OBJS, Monster, SHOW, TAG_IDS, TagId, pickBox, validObj } from './content';
import type { ObjId } from './objects';

export interface CastSeat { pid: string; avatar: Slug; human: boolean; }
export interface SmPub { box: ObjId[]; order: string[]; cast: CastSeat[]; revealAt?: number; pulls: Record<string, number>; }

export interface Slot { i: number; pid: string; start: number; pullAt: number; pullDur: number; curve: string; lights: number; end: number; pulled: boolean; }
/** The whole show's timetable in server milliseconds, from what is known so far (a pull not yet made is assumed at the
 * automatic time; when the real pull arrives every later slot moves earlier, identically on every device). */
export function timetable(pub: SmPub): { slots: Slot[]; evrAt: number; end: number } {
  const at0 = (pub.revealAt || 0) + SHOW.intro * 1000;
  const slots: Slot[] = [];
  let t = at0;
  pub.order.forEach((pid, i) => {
    const c = pub.cast.find(x => x.pid === pid);
    let pullAt: number, dur: number, curve = 'plain', pulled = false;
    if (c && !c.human) { const cp = COMPANION_PULL[c.avatar]; pullAt = t + cp.at * 1000; dur = cp.dur * 1000; curve = cp.curve; pulled = true; }
    else {
      const p = pub.pulls[String(i)];
      pulled = p != null;
      pullAt = Math.min(t + SHOW.autoPull * 1000, Math.max(t + SHOW.pullOpen * 1000, p ?? Infinity));
      dur = SHOW.shrink * 1000;
    }
    const lights = pullAt + dur + SHOW.beat * 1000;
    const end = lights + SHOW.lights * 1000;
    slots.push({ i, pid, start: t, pullAt, pullDur: dur, curve, lights, end, pulled });
    t = end;
  });
  return { slots, evrAt: t, end: t + SHOW.evr * 1000 };
}

export const smLogic: RitualLogic = {
  id: 'shadow-monsters',
  title: 'Shadow Monsters',
  min: 2, max: 4,
  setup(seed: number, seats: Seat[]): SmPub {
    const rng = mulberry32(seed ^ 0x5bd1e995);
    const box = pickBox(rng);
    const order = seats.map(s => s.pid).sort(() => rng() - 0.5);
    const cast = seats.map(s => ({ pid: s.pid, avatar: s.avatar, human: s.human }));
    const av = (pid: string) => (cast.find(c => c.pid === pid) || { avatar: 'loopie' }).avatar;
    // comic timing: never open on Still's tiny duck, and Sync can only copy a monster it has already seen
    if (order.length > 1 && av(order[0]) === 'still') order.push(order.shift()!);
    const si = order.findIndex(p => av(p) === 'sync');
    if (si >= 0 && !order.slice(0, si).some(p => (cast.find(c => c.pid === p) || { human: false }).human)) order.push(order.splice(si, 1)[0]);
    return { box, order, cast, pulls: {} };
  },
  validateSeal(pub: SmPub, _seat: Seat, d: any): Monster | null {
    if (!d || !Array.isArray(d.objs) || d.objs.length < 1 || d.objs.length > MAX_OBJS) return null;
    const objs = d.objs.map((o: any) => validObj(o, pub.box));
    if (objs.some((o: any) => !o)) return null;
    if (new Set(objs.map((o: any) => o.o)).size !== objs.length) return null;
    const tag: TagId | null = TAG_IDS.includes(d.tag) ? d.tag : null;
    return { objs, tag };
  },
  companionSeal(_pub: SmPub, seat: Seat, rng: Rng): Monster {
    const opts = COMPANION_MONSTERS[seat.avatar] || COMPANION_MONSTERS.loopie;
    const m = opts[Math.floor(rng() * opts.length) % opts.length];
    return { objs: m.objs.map(o => ({ ...o })), tag: m.tag, mirror: m.mirror || undefined };
  },
  validateLive(pub: SmPub, seat: Seat, d: any, phase: string, now: number) {
    if (phase !== 'reveal' || !d || !pub.revealAt) return null;
    const i = Number(d.i);
    if (!Number.isInteger(i) || i < 0 || i >= pub.order.length) return null;
    if (d.k === 'react') {
      if (!['scream', 'laugh', 'hug'].includes(d.r)) return null;
      return { k: 'react', r: d.r, i };
    }
    if (d.k === 'pull') {
      if (pub.order[i] !== seat.pid || pub.pulls[String(i)] != null) return null;
      const s = timetable(pub).slots[i];
      if (now < s.start + (SHOW.pullOpen - 0.6) * 1000 || now > s.start + (SHOW.autoPull + 1.2) * 1000) return null;
      return { k: 'pull', i };
    }
    return null;
  },
  onLive(pub: SmPub, ev: { at: number; data: any }) {
    if (ev.data && ev.data.k === 'pull' && pub.pulls[String(ev.data.i)] == null) return { ...pub, pulls: { ...pub.pulls, [String(ev.data.i)]: ev.at } };
  },
  onReveal(pub: SmPub, now: number): SmPub { return { ...pub, revealAt: now + 300, pulls: {} }; }
};
