/* Group Think Glitch — authoritative rules (run by the room server and by the in-page host for solo play). */
import { RitualLogic, Seat, Rng, shuffle } from '../../room/ritual';
import { CAMS, CamId, CAM_LEAN, HOTSPOTS, Suspect, SUSPECTS, hotspotsFor } from './content';
import { stateAt, hotspotAnchor, worldToUV } from './timeline';

export interface GtgPub { cams: Record<string, CamId>; }
export interface GtgSeal {
  pins: string[];          // hotspot ids, in the order the player arranged them (BEFORE → AFTER)
  suspect: Suspect;
  sure: 0 | 1 | 2;
  path: number[];          // spotlight path samples: t, u, v (floor position, see worldToUV), flattened, ≤ 60 samples
  surprise?: string;       // optional: what surprised them (reveal-phase live event instead)
}

const SUS = new Set(SUSPECTS.map(s => s.id));

export const gtgLogic: RitualLogic = {
  id: 'group-think-glitch',
  title: 'Group Think Glitch',
  min: 2, max: 4,
  setup(seed: number, seats: Seat[]): GtgPub {
    const order = shuffle(CAMS.slice(), seed);
    const cams: Record<string, CamId> = {};
    seats.forEach((s, i) => { cams[s.pid] = order[i % order.length]; });
    return { cams };
  },
  validateSeal(pub: GtgPub, seat: Seat, d: any): GtgSeal | null {
    const cam = pub.cams[seat.pid];
    if (!cam || !d || typeof d !== 'object') return null;
    const allowed = new Set(hotspotsFor(cam).map(h => h.id));
    const pins = Array.isArray(d.pins) ? d.pins.filter((p: any) => typeof p === 'string' && allowed.has(p)) : [];
    const uniq = Array.from(new Set(pins)).slice(0, 3) as string[];
    if (!uniq.length) return null;
    if (!SUS.has(d.suspect)) return null;
    const sure = [0, 1, 2].includes(d.sure) ? d.sure : 1;
    const path = Array.isArray(d.path) ? d.path.slice(0, 180).map((n: any) => Math.round(Math.max(0, Math.min(9, Number(n) || 0)) * 1000) / 1000) : [];
    return { pins: uniq, suspect: d.suspect, sure, path };
  },
  companionSeal(pub: GtgPub, seat: Seat, rng: Rng): GtgSeal {
    const cam = pub.cams[seat.pid];
    const spots = hotspotsFor(cam);
    // persona biases: Glitch → closest to the cake and literal; Sync → faces and reactions; Loopie → the most dramatic beat
    const pref: Record<string, string[]> = {
      glitch: ['edge', 'paw', 'lunge', 'wobble', 'splat', 'string', 'stumble', 'catjump', 'hands'],
      sync: ['hands', 'stumble', 'string', 'catjump', 'splat', 'lunge', 'edge', 'wobble', 'paw'],
      loopie: ['splat', 'lunge', 'stumble', 'hands', 'paw', 'catjump', 'wobble', 'string', 'edge']
    };
    const p = pref[seat.avatar] || pref.glitch;
    const ranked = spots.slice().sort((a, b) => p.indexOf(a.id) - p.indexOf(b.id));
    const pins = ranked.slice(0, 3).sort((a, b) => a.t0 - b.t0).map(h => h.id);
    const lean = CAM_LEAN[cam];
    const suspect: Suspect = seat.avatar === 'glitch' && rng() < 0.35 ? 'unsure' : lean;
    const sure = (seat.avatar === 'loopie' ? 2 : seat.avatar === 'glitch' ? 0 : 1) as 0 | 1 | 2;
    // a scripted spotlight path that drifts toward each pinned hotspot and rests on it (shown, labelled, in the reveal)
    const path: number[] = [];
    pins.forEach((id) => {
      const h = HOTSPOTS.find(x => x.id === id)!;
      const t = (h.t0 + h.t1) / 2;
      const a = hotspotAnchor(id, stateAt(t));
      const [u0, v0] = worldToUV(a[0] + (rng() - 0.5) * 1.2, a[2] + (rng() - 0.5) * 1.2);
      const [u1, v1] = worldToUV(a[0], a[2]);
      path.push(Math.max(0, t - 0.5), u0, v0, t, u1, v1);
    });
    return { pins, suspect, sure, path };
  },
  validateLive(pub: GtgPub, seat: Seat, d: any, phase: string) {
    // reveal-phase "what surprised me" tags
    if (phase === 'play' || !d || d.kind !== 'surprise') return null;
    const ok = ['cat', 'edge', 'string', 'nobody', 'angles'];
    return ok.includes(d.tag) ? { kind: 'surprise', tag: d.tag } : null;
  }
};
