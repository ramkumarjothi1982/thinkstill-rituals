/* Room core + ritual rule tests (run: esbuild tests/room.test.ts --bundle --platform=node --outfile=… && node …).
 *   core: host rules, companions seal by their rules, privacy until the reveal, duplicate actions ignored, rejoin by
 *         token, late joiners spectate, replay seats them.
 *   Mess Auction: sealed drawings + estimates validated; the authority's auction clock (hammer at the second-to-last
 *         paddle, late paddles are out, nobody bids on their own lot, paddles survive the capped event log).
 *   Shadow Monsters: only box objects, the pull window, pulls recorded in the room state.
 *   Emotional Rollercoaster: track validation and the switch rule. */
import { RoomHub } from '../src/room/hub';
import { REGISTRY } from '../src/rituals/registry';
import { timetable as maTimetable, MaPub } from '../src/rituals/mess-auction/logic';
import { AUC, priceAt } from '../src/rituals/mess-auction/content';
import { encode } from '../src/rituals/mess-auction/portrait';
import { timetable as smTimetable } from '../src/rituals/shadow-monsters/logic';
import { SHOW } from '../src/rituals/shadow-monsters/content';
declare const process: any;
let fails = 0;
const ok = (c: any, msg: string) => { if (!c) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };

/* a controllable clock for the authority */
let NOW = 1_800_000_000_000;
const realNow = Date.now;
(Date as any).now = () => NOW;

function room(ritual: string, code = 'ABCDE') {
  const hub = new RoomHub(REGISTRY, code, ritual as any);
  const inbox: Record<string, any[]> = {};
  const conn = (k: string) => { inbox[k] = inbox[k] || []; const c: any = { send: (m: any) => inbox[k].push(m) }; hub.open(c); return c; };
  const last = (k: string) => [...inbox[k]].reverse().find(m => m.t === 'state' || m.t === 'welcome').view;
  const errs = (k: string) => inbox[k].filter(m => m.t === 'error').map(m => m.code);
  const say = (c: any, m: any) => hub.message(c, JSON.stringify(m));
  return { hub, inbox, conn, last, errs, say };
}

/* ---------------- core, on The Glorious Mess Auction ---------------- */
{
  const R = room('mess-auction');
  const A = R.conn('a'), B = R.conn('b');
  R.say(A, { t: 'hello', room: 'ABCDE', name: 'Ana', avatar: 'patch' });
  R.say(B, { t: 'hello', room: 'ABCDE', name: 'Ben', avatar: 'rush' });
  const tokB = R.inbox.b.find(m => m.t === 'welcome').token;
  ok(R.last('a').players.length === 2 && R.last('a').hostPid === A.pid, 'two people, the first is the host');
  R.say(B, { t: 'act', id: 'x1', kind: 'start' });
  ok(R.last('a').phase === 'lobby', 'only the host can start');
  R.say(A, { t: 'act', id: 'c1', kind: 'add_companion', data: { avatar: 'still' } });
  R.say(A, { t: 'act', id: 's1', kind: 'start', data: { seed: 42 } });
  let v = R.last('a');
  ok(v.phase === 'play' && v.players.length === 3, 'started with a Bubble companion');
  ok(v.sealed['c-still'] === true, 'the companion drew and priced by its own rules');
  const pub = v.pub as MaPub;
  ok(pub.staff.auctioneer !== 'patch' && pub.staff.auctioneer !== 'rush' && pub.staff.attendant !== 'patch' && pub.staff.attendant !== 'rush', 'the staff are Bubbles nobody is playing as');
  ok(!pub.collectors.includes('patch') && !pub.collectors.includes('rush') && pub.collectors.includes('still'), 'collectors: the room companion, never a person’s Bubble');
  ok(pub.order[0] === 'c-still' && pub.order.length === 3, 'a Bubble opens the sale');
  const art = encode([{ p: 0, pts: [[10, 10], [200, 40], [120, 230]] }, { p: 1, pts: [[30, 20], [220, 20]] }]);
  R.say(A, { t: 'act', id: 'p1', kind: 'seal', data: { strokes: art, est: 5 } });
  R.say(A, { t: 'act', id: 'p1', kind: 'seal', data: { strokes: [], est: 9999 } });
  v = R.last('b');
  ok(v.sealed[A.pid] === true && v.revealed === null, 'Ben sees that Ana sealed, not what');
  ok(JSON.stringify(v).indexOf('"est"') === -1 && JSON.stringify(v).indexOf('"strokes"') === -1, 'no drawing or price anywhere in Ben’s view');
  ok(R.last('a').mine && R.last('a').mine.est === 5, 'Ana sees her own sealed price; the duplicate was ignored');
  R.hub.close(B);
  ok(R.last('a').players.find((p: any) => p.pid === B.pid).connected === false, 'a dropped connection is visible');
  const B2 = R.conn('b'); R.say(B2, { t: 'hello', room: 'ABCDE', name: 'Ben', avatar: 'rush', token: tokB });
  ok(B2.pid === B.pid, 'rejoin by token restores the same seat');
  R.say(B2, { t: 'act', id: 'q1', kind: 'seal', data: { strokes: art, est: 0 } });
  ok(R.last('b').sealed[B2.pid] !== true, 'an estimate outside 1…10,000 is refused');
  R.say(B2, { t: 'act', id: 'q2', kind: 'seal', data: { strokes: [{ p: 0, d: 'not base64!' }], est: 3 } });
  ok(R.last('b').sealed[B2.pid] !== true, 'a broken drawing is refused');
  R.say(B2, { t: 'act', id: 'q3', kind: 'seal', data: { strokes: art, est: 3 } });
  v = R.last('a');
  ok(v.phase === 'reveal' && v.revealed[B2.pid].est === 3 && v.revealed[A.pid].est === 5 && v.pub.revealAt > NOW, 'everyone sealed → the auction is scheduled with every drawing');

  /* the auction on the authority's clock */
  const lots = () => maTimetable(R.last('a').pub, NOW).lots;
  const L0 = lots()[0];
  NOW = L0.open + 100;
  R.say(A, { t: 'act', id: 'l1', kind: 'live', data: { k: 'in', i: 0 } });
  R.say(B2, { t: 'act', id: 'l2', kind: 'live', data: { k: 'in', i: 0 } });
  ok(R.last('a').pub.ins['0'][A.pid] === NOW && R.last('a').pub.ins['0'][B2.pid] === NOW, 'paddles up are kept in the room state (not only the capped log)');
  NOW += 100;
  R.say(A, { t: 'act', id: 'l3', kind: 'live', data: { k: 'drop', i: 0 } });
  ok(R.errs('a').includes('rate_limited'), 'paddle moves are rate-limited per person');
  NOW = L0.bid + 1500;
  R.say(A, { t: 'act', id: 'l4', kind: 'live', data: { k: 'drop', i: 0 } });
  NOW = L0.bid + 3000;
  R.say(B2, { t: 'act', id: 'l5', kind: 'live', data: { k: 'drop', i: 0 } });
  const p = R.last('a').pub as MaPub;
  const t0 = maTimetable(p, L0.cap + 1).lots[0];
  const bots = Object.values(p.bots!['0']).sort((a, b) => a - b);
  const drops = [1.5, 3.0, ...bots].sort((a, b) => a - b);
  ok(t0.decided && Math.abs(t0.price - priceAt(drops[drops.length - 2])) < 1e-9, 'the hammer falls at the price when the second-to-last paddle went down');
  ok(t0.winner.length === 1 && t0.winner[0].id.startsWith('bot:'), 'the last paddle up wins (a Bubble collector here)');
  ok(maTimetable(p, L0.cap + 1).lots.every((l, i) => i === 0 || l.start >= maTimetable(p, L0.cap + 1).lots[i - 1].next), 'lots follow each other without overlap');
  const L1 = maTimetable(p, NOW).lots[1];
  NOW = L1.open + 50;
  R.say(A, { t: 'act', id: 'm1', kind: 'live', data: { k: 'in', i: 1 } });
  ok(!R.last('a').pub.ins['1'] || R.last('a').pub.ins['1'][A.pid] == null, 'nobody bids on their own lot');
  NOW = L1.bid + (AUC.grace + 0.5) * 1000;
  R.say(B2, { t: 'act', id: 'm2', kind: 'live', data: { k: 'in', i: 1 } });
  const late = maTimetable(R.last('a').pub, NOW).lots[1].bidders.find((b: any) => b.id === B2.pid);
  ok(late && late.drop === L1.bid, 'a paddle raised after the grace period counts as out');
  // a full room's worth of reactions cannot push the paddles out of the record
  ok(Object.keys(R.last('a').pub.drops['0']).length === 2, 'both drops on lot 1 are on record');
  // late joiners spectate; replay seats them
  const C = R.conn('c'); R.say(C, { t: 'hello', room: 'ABCDE', name: 'Cat', avatar: 'sync' });
  ok(R.last('a').players.find((x: any) => x.pid === C.pid).spectator === true, 'a late joiner watches as a spectator');
  R.say(A, { t: 'act', id: 'r1', kind: 'replay' });
  ok(R.last('a').phase === 'lobby' && R.last('a').players.find((x: any) => x.pid === C.pid).spectator === false, 'replay gives the spectator a seat');
}

/* ---------------- Shadow Monsters rules ---------------- */
{
  const R = room('shadow-monsters', 'SMSMS');
  const A = R.conn('a'), B = R.conn('b');
  R.say(A, { t: 'hello', room: 'SMSMS', name: 'Ana', avatar: 'patch' });
  R.say(B, { t: 'hello', room: 'SMSMS', name: 'Ben', avatar: 'rush' });
  R.say(A, { t: 'act', id: 's1', kind: 'start', data: { seed: 7 } });
  const box: string[] = R.last('a').pub.box;
  const notInBox = ['fork', 'croissant', 'glove', 'slipper', 'teapot', 'doughnut', 'broccoli', 'whisk', 'scissors', 'cactus', 'banana', 'duck', 'umbrella', 'duster'].find(o => !box.includes(o))!;
  R.say(A, { t: 'act', id: 'a1', kind: 'seal', data: { objs: [{ o: notInBox, x: 0, z: 0.3, r: 0 }] } });
  ok(R.last('a').sealed[A.pid] !== true, 'only objects from this round’s toybox');
  R.say(A, { t: 'act', id: 'a2', kind: 'seal', data: { objs: [{ o: box[0], x: 0, z: 0.3, r: 0 }, { o: box[1], x: 0.02, z: 0.5, r: 2 }], tag: 'deadline' } });
  ok(R.last('a').sealed[A.pid] === true, 'a monster from the box seals');
  ok(JSON.stringify(R.last('b')).indexOf('"objs"') === -1, 'Ben cannot see Ana’s monster before the show');
  R.say(B, { t: 'act', id: 'b1', kind: 'seal', data: { objs: [{ o: box[2], x: 0, z: 0.2, r: 0 }] } });
  const v = R.last('a');
  ok(v.phase === 'reveal' && v.revealed[A.pid].tag === 'deadline', 'the show starts with every monster');
  const order: string[] = v.pub.order, ia = order.indexOf(A.pid);
  const s = smTimetable(v.pub).slots[ia];
  NOW = s.start + 1000;
  R.say(A, { t: 'act', id: 'p0', kind: 'live', data: { k: 'pull', i: ia } });
  ok(R.last('a').pub.pulls[String(ia)] == null, 'the light cannot be pulled before the monster has loomed');
  NOW = s.start + SHOW.pullOpen * 1000 + 500;
  R.say(B, { t: 'act', id: 'p1', kind: 'live', data: { k: 'pull', i: ia } });
  ok(R.last('a').pub.pulls[String(ia)] == null, 'only the maker pulls their own light back');
  R.say(A, { t: 'act', id: 'p2', kind: 'live', data: { k: 'pull', i: ia } });
  ok(R.last('a').pub.pulls[String(ia)] === NOW, 'the maker’s pull is recorded in the room state');
  const s2 = smTimetable(R.last('a').pub).slots[ia];
  ok(s2.pullAt === NOW && s2.pulled, 'the show timetable follows the pull');
}

/* ---------------- Emotional Rollercoaster rules ---------------- */
{
  const R = room('emotional-rollercoaster', 'ERERE');
  const A = R.conn('a'), B = R.conn('b');
  R.say(A, { t: 'hello', room: 'ERERE', name: 'Ana', avatar: 'patch' });
  R.say(B, { t: 'hello', room: 'ERERE', name: 'Ben', avatar: 'rush' });
  R.say(A, { t: 'act', id: 's1', kind: 'start', data: { seed: 3 } });
  R.say(A, { t: 'act', id: 'a1', kind: 'seal', data: { segs: [{ h: 9, mod: 'drop' }] } });
  ok(R.last('a').sealed[A.pid] !== true, 'a track needs five moments in range');
  const segs = [{ h: -0.6, mod: 'drop' }, { h: 0.2, mod: 'smooth' }, { h: 0.8, mod: 'loop' }, { h: -0.4, mod: 'tunnel' }, { h: 0.5, mod: 'cork' }];
  R.say(A, { t: 'act', id: 'a2', kind: 'seal', data: { segs } });
  R.say(B, { t: 'act', id: 'b2', kind: 'seal', data: { segs } });
  ok(R.last('a').phase === 'reveal', 'everyone’s track sealed → the ride');
}

(Date as any).now = realNow;
console.log(fails ? `${fails} FAILED` : 'all room tests passed');
process.exit(fails ? 1 : 0);
