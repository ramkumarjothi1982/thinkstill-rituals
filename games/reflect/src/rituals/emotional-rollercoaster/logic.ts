/* Emotional Rollercoaster — authoritative rules. A sealed track is five segments (how high/low each moment felt and
 * how it moved you). The ride is scheduled from the reveal moment; jumping onto a friend's track at a junction is a
 * live event everyone sees. */
import { RitualLogic, Seat, Rng } from '../../room/ritual';
import { JUNCTIONS, MOD_IDS, N_SEG, SATURDAY, Seg, cleanMoments, Moment } from './content';
import { companionSegs } from './track';

export interface ErPub { moments: Moment[]; riders: string[]; own: boolean; revealAt?: number; }

export const erLogic: RitualLogic = {
  id: 'emotional-rollercoaster',
  title: 'Emotional Rollercoaster',
  min: 2, max: 4,
  setup(_seed: number, seats: Seat[], startData?: any): ErPub {
    const own = cleanMoments(startData);
    return { moments: own || SATURDAY, riders: seats.map(s => s.pid), own: !!own };
  },
  validateSeal(_pub: ErPub, _seat: Seat, d: any): { segs: Seg[] } | null {
    if (!d || !Array.isArray(d.segs) || d.segs.length !== N_SEG) return null;
    const segs: Seg[] = [];
    for (const s of d.segs) {
      if (!s || !MOD_IDS.includes(s.mod)) return null;
      const h = Number(s.h);
      if (!Number.isFinite(h)) return null;
      segs.push({ h: Math.round(Math.max(-1, Math.min(1, h)) * 100) / 100, mod: s.mod });
    }
    return { segs };
  },
  companionSeal(_pub: ErPub, seat: Seat, rng: Rng) { return { segs: companionSegs(seat.avatar, rng) }; },
  validateLive(pub: ErPub, seat: Seat, d: any, phase: string) {
    if (phase !== 'reveal' || !d) return null;
    if (d.kind === 'switch') {
      const j = Number(d.j);
      if (!JUNCTIONS.some(x => x.j === j)) return null;
      if (typeof d.to !== 'string' || d.to === seat.pid || !pub.riders.includes(d.to)) return null;
      return { kind: 'switch', j, to: d.to };
    }
    if (d.kind === 'whee') return { kind: 'whee' };
    return null;
  },
  onReveal(pub: ErPub, now: number): ErPub { return { ...pub, revealAt: now }; }
};
