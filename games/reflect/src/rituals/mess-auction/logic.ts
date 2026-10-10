/* The Glorious Mess Auction — authoritative rules.
 * Sealed: your blind drawing (face pass, hair pass, signature) and your own secret estimate of what it is worth.
 * The auction runs on the room's clock. For every lot the price climbs; each bidder holds a paddle up until it is too
 * rich for them. Humans send 'in' (paddle up) and 'drop' (paddle down) as live events; the authority keeps them in pub
 * so the result never depends on the capped event log. Bubble collectors drop at authored, seeded moments. The hammer
 * falls when one paddle is left (or at the cap) at the price of the moment the second-to-last paddle went down. */
import { RitualLogic, Seat, Rng, mulberry32, hashStr } from '../../room/ritual';
import type { Slug } from '../../room/protocol';
import { AUC, COLLECTORS, COMPANION_EST, DROP_RANGE, EST_MAX, EST_MIN, PROMPTS, STAFF_POOL, priceAt } from './content';
import { bubblePortrait, cleanEnc, encode, scribble, Enc } from './portrait';

export interface CastSeat { pid: string; avatar: Slug; human: boolean; name: string; }
export interface MaPub {
  prompt: number;
  order: string[];                              // lot order (pids of the artists)
  cast: CastSeat[];
  staff: { auctioneer: Slug; attendant: Slug };
  collectors: Slug[];                           // the Bubbles with paddles (room companions first)
  revealAt?: number;
  bots?: Record<string, Record<string, number>>; // lot → collector → seconds after bidding opens
  ins: Record<string, Record<string, number>>;   // lot → human pid → server time the paddle went up
  drops: Record<string, Record<string, number>>; // lot → human pid → server time the paddle came down
}
export interface Sealed { strokes: Enc[]; est: number; }

export interface Bidder { id: string; human: boolean; slug: Slug; drop: number; }   // drop: server ms (Infinity = still holding)
export interface Lot {
  i: number; pid: string;
  start: number; open: number; bid: number; cap: number;
  bidders: Bidder[];
  end: number;          // when the field narrowed to one (or the cap); Infinity while undecided
  winner: Bidder[];     // one, or several who held to the cap
  price: number;
  sold: number; next: number; decided: boolean;
}

/** The whole auction's timetable from what the authority (or a client) knows right now. */
export function timetable(pub: MaPub, now = Date.now()): { lots: Lot[]; gapAt: number; end: number } {
  const lots: Lot[] = [];
  let t = (pub.revealAt || 0) + AUC.intro * 1000;
  pub.order.forEach((pid, i) => {
    const start = t, open = start + AUC.present * 1000, bid = open + AUC.open * 1000, cap = bid + AUC.cap * 1000;
    const bots = (pub.bots && pub.bots[String(i)]) || {};
    const ins = pub.ins[String(i)] || {}, drops = pub.drops[String(i)] || {};
    const bidders: Bidder[] = [];
    // humans other than the artist: in if they raised a paddle in time
    const graceEnd = bid + AUC.grace * 1000;
    for (const c of pub.cast) {
      if (!c.human || c.pid === pid) continue;
      const up = ins[c.pid];
      if (up == null || up > graceEnd) { if (now >= graceEnd || up != null) bidders.push({ id: c.pid, human: true, slug: c.avatar, drop: bid }); else bidders.push({ id: c.pid, human: true, slug: c.avatar, drop: Infinity }); continue; }
      bidders.push({ id: c.pid, human: true, slug: c.avatar, drop: drops[c.pid] != null ? Math.max(bid, drops[c.pid]) : Infinity });
    }
    // the Bubble collectors (an artist never bids on its own lot)
    const artist = pub.cast.find(c => c.pid === pid);
    // Sync copies the first person who raised a paddle and then let go
    const firstHuman = Math.min(...pub.cast.filter(c => c.human && c.pid !== pid && ins[c.pid] != null && ins[c.pid] <= graceEnd && drops[c.pid] != null).map(c => Math.max(bid, drops[c.pid])), Infinity);
    for (const s of (pub.collectors || COLLECTORS)) {
      if (artist && !artist.human && artist.avatar === s) continue;
      let d = bid + (bots[s] ?? 5) * 1000;
      if (s === 'sync' && Number.isFinite(firstHuman)) d = Math.min(d, firstHuman + 150);
      bidders.push({ id: 'bot:' + s, human: false, slug: s, drop: Math.min(d, cap) });
    }
    // the field narrows: the hammer falls when one paddle is left
    const sorted = bidders.slice().sort((a, b) => a.drop - b.drop);
    let end = Infinity, winner: Bidder[] = [];
    if (sorted.length <= 1) { end = bid; winner = sorted; }
    else {
      const second = sorted[sorted.length - 2].drop;
      if (second < cap) { end = second; winner = [sorted[sorted.length - 1]]; }
      else if (now >= cap || sorted.every(b => Number.isFinite(b.drop))) { end = cap; winner = sorted.filter(b => b.drop >= cap); }
    }
    const decided = Number.isFinite(end);
    const e = decided ? end : cap;                  // undecided: later lots are placed as if it ran to the cap
    const price = decided ? priceAt((Math.min(end, cap) - bid) / 1000) : priceAt((Math.max(bid, Math.min(now, cap)) - bid) / 1000);
    const sold = e + AUC.going * 1000, next = sold + AUC.sold * 1000 + 300;
    lots.push({ i, pid, start, open, bid, cap, bidders, end, winner, price, sold, next, decided });
    t = next;
  });
  return { lots, gapAt: t, end: t + AUC.gap * 1000 };
}

export const maLogic: RitualLogic = {
  id: 'mess-auction',
  title: 'The Glorious Mess Auction',
  min: 2, max: 4,
  setup(seed: number, seats: Seat[], startData?: any): MaPub {
    const rng = mulberry32(seed ^ 0x2c1b3c6d);
    const cast = seats.map(s => ({ pid: s.pid, avatar: s.avatar, human: s.human, name: s.name }));
    // lots: a Bubble opens the sale, humans spread through it
    const humans = cast.filter(c => c.human).map(c => c.pid).sort(() => rng() - 0.5), bots = cast.filter(c => !c.human).map(c => c.pid).sort(() => rng() - 0.5);
    const order: string[] = [];
    if (bots.length) order.push(bots.shift()!);
    while (humans.length || bots.length) { if (humans.length) order.push(humans.shift()!); if (bots.length) order.push(bots.shift()!); }
    const round = Number(startData && startData.round) || 0;
    // who works the room: Bubbles nobody in the room is playing as
    const taken = new Set(cast.filter(c => c.human).map(c => c.avatar));
    const free = (s: Slug) => !taken.has(s);
    const auctioneer = STAFF_POOL.find(free) || 'glitch';
    const attendant = STAFF_POOL.find(s => free(s) && s !== auctioneer) || 'patch';
    const roomBubbles = cast.filter(c => !c.human).map(c => c.avatar);
    const pool: Slug[] = [];
    for (const s of [...roomBubbles, ...COLLECTORS]) if (free(s) && s !== auctioneer && s !== attendant && !pool.includes(s)) pool.push(s);
    const nCol = Math.max(roomBubbles.filter(s => pool.includes(s)).length, 6 - cast.filter(c => c.human).length, 2);
    return { prompt: (round + Math.floor(rng() * PROMPTS.length)) % PROMPTS.length, order, cast, staff: { auctioneer, attendant }, collectors: pool.slice(0, nCol), ins: {}, drops: {} };
  },
  validateSeal(_pub: MaPub, _seat: Seat, d: any): Sealed | null {
    if (!d) return null;
    const strokes = cleanEnc(d.strokes, 1400);
    if (!strokes) return null;
    const est = Math.round(Number(d.est));
    if (!Number.isFinite(est) || est < EST_MIN || est > EST_MAX) return null;
    return { strokes, est };
  },
  companionSeal(_pub: MaPub, seat: Seat, rng: Rng): Sealed {
    const r = mulberry32(hashStr(seat.pid) ^ Math.floor(rng() * 1e9));
    const strokes = bubblePortrait(seat.avatar, r);
    strokes.push({ p: 2, pts: scribble(r) });
    return { strokes: encode(strokes), est: COMPANION_EST[seat.avatar] || 5 };
  },
  validateLive(pub: MaPub, seat: Seat, d: any, phase: string, now: number) {
    if (phase !== 'reveal' || !d || !pub.revealAt || !seat.human) return null;
    const i = Number(d.i);
    if (!Number.isInteger(i) || i < 0 || i >= pub.order.length || pub.order[i] === seat.pid) return null;
    const lot = timetable(pub, now).lots[i];
    if (!lot || now < lot.start || (lot.decided && now > lot.end + 200)) return null;
    if (d.k === 'in') { if ((pub.ins[String(i)] || {})[seat.pid] != null || now > lot.cap) return null; return { k: 'in', i }; }
    if (d.k === 'drop') { if ((pub.drops[String(i)] || {})[seat.pid] != null) return null; return { k: 'drop', i }; }
    return null;
  },
  onLive(pub: MaPub, ev: { pid: string; at: number; data: any }) {
    const i = String(ev.data && ev.data.i);
    if (ev.data.k === 'in') return { ...pub, ins: { ...pub.ins, [i]: { ...(pub.ins[i] || {}), [ev.pid]: ev.at } } };
    if (ev.data.k === 'drop') return { ...pub, drops: { ...pub.drops, [i]: { ...(pub.drops[i] || {}), [ev.pid]: ev.at } } };
  },
  onReveal(pub: MaPub, now: number): MaPub {
    const rng = mulberry32((now & 0x7fffffff) ^ 0x9e3779b9);
    const bots: Record<string, Record<string, number>> = {};
    pub.order.forEach((pid, i) => {
      const b: Record<string, number> = {};
      const cols = (pub.collectors || COLLECTORS).filter(s => { const a = pub.cast.find(c => c.pid === pid); return !(a && !a.human && a.avatar === s); });
      // every lot has one collector who falls for it and holds on far too long
      const smitten = cols[Math.floor(rng() * cols.length)];
      for (const s of cols) {
        const [a, z] = s === smitten ? [7.2, 9.8] : DROP_RANGE[s] || [3, 7];
        b[s] = Math.round((a + rng() * (z - a)) * 100) / 100;
      }
      bots[String(i)] = b;
    });
    return { ...pub, revealAt: now + 300, bots, ins: {}, drops: {} };
  }
};
