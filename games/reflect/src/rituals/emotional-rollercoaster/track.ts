/* Emotional Rollercoaster — track geometry and ride timing (no DOM, shared by the editor, the 3D ride and tests).
 * Every rider's track runs along +x in its own lane: station → chain lift → first drop → five moment segments → brake
 * run. Junctions between segments sit at the same baseline height for everyone, so carts can hop between tracks.
 * Timing is physical inside each segment (fast low, slow high, a chain lift that clanks along) but every segment
 * takes the same time for everyone, so all riders reach each moment together. */
import { Mod, N_SEG, Seg, T_PRE, T_SEG, T_POST } from './content';

export interface Sample { x: number; y: number; ang: number; roll: number; tunnel: boolean; seg: number; s: number; t: number; }
export interface Track { samples: Sample[]; len: number; segs: Seg[]; }

export const B = 8, AMP = 7.5, SEG_L = 34, X0 = 8;
export const X_START = -40, X_END = X0 + N_SEG * SEG_L + 36;
const G = 9.81;
const smooth = (a: number, b: number, u: number) => { const k = Math.max(0, Math.min(1, (u - a) / (b - a))); return k * k * (3 - 2 * k); };
const cosr = (a: number, b: number, u: number) => a + (b - a) * 0.5 * (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, u))));

type Pt = { x: number; y: number; roll: number; tunnel: boolean; seg: number };

function segmentPoints(i: number, sg: Seg, out: Pt[]) {
  const x0 = X0 + i * SEG_L, x1 = x0 + SEG_L, xm = (x0 + x1) / 2, H = B + sg.h * AMP;
  const N = 90;
  const push = (x: number, y: number, roll = 0, tunnel = false) => out.push({ x, y, roll, tunnel, seg: i });
  if (sg.mod === 'loop') {
    const R = 4 + Math.abs(sg.h) * 2.6, yb = sg.h >= 0 ? B + sg.h * AMP * 0.35 : H;
    const xa = xm - R * 0.35, xb = xm + R * 0.35;
    for (let k = 0; k <= 30; k++) { const u = k / 30; push(x0 + (xa - x0) * u, cosr(B, yb, u)); }
    for (let k = 1; k <= 72; k++) { const a = -Math.PI / 2 + (k / 72) * Math.PI * 2; const shift = (k / 72) * (xb - xa); push(xa + shift + Math.cos(a) * R, yb + R + Math.sin(a) * R); }
    for (let k = 1; k <= 30; k++) { const u = k / 30; push(xb + (x1 - xb) * u, cosr(yb, B, u)); }
    return;
  }
  for (let k = 1; k <= N; k++) {
    const u = k / N, x = x0 + u * SEG_L;
    let y: number, roll = 0, tunnel = false;
    if (sg.mod === 'drop') {
      if (sg.h >= 0) { const top = Math.max(H, B + 2), low = Math.min(B, H) - 3.5; y = u < 0.55 ? cosr(B, top, u / 0.55) : u < 0.78 ? cosr(top, low, (u - 0.55) / 0.23) : cosr(low, B, (u - 0.78) / 0.22); }
      else { const top = B + 1.5, low = H - 2.5; y = u < 0.35 ? cosr(B, top, u / 0.35) : u < 0.55 ? cosr(top, low, (u - 0.35) / 0.2) : cosr(low, B, (u - 0.55) / 0.45); }
    } else {
      const amp = sg.mod === 'cork' ? 0.7 : 1;
      y = B + (H - B) * amp * 0.5 * (1 - Math.cos(2 * Math.PI * u));
      if (sg.mod === 'cork') roll = Math.PI * 2 * smooth(0.28, 0.72, u);
      if (sg.mod === 'tunnel') tunnel = u > 0.14 && u < 0.86;
    }
    push(x, y, roll, tunnel);
  }
}

export function buildTrack(segs: Seg[]): Track {
  const pts: Pt[] = [];
  const pre = (x: number, y: number) => pts.push({ x, y, roll: 0, tunnel: false, seg: -1 });
  for (let x = X_START; x <= -28; x += 1) pre(x, 2);
  for (let k = 1; k <= 44; k++) { const u = k / 44; pre(-28 + 22 * u, 2 + 14 * smooth(0, 1, u)); }      // chain lift
  for (let k = 1; k <= 8; k++) pre(-6 + 0.5 * k, 16 + Math.sin(k / 8 * Math.PI) * 0.4);                    // crest
  for (let k = 1; k <= 40; k++) { const u = k / 40; pre(-2 + 10 * u, cosr(16, B, u)); }                    // first drop
  for (let i = 0; i < N_SEG; i++) segmentPoints(i, segs[i] || { h: 0, mod: 'smooth' }, pts);
  const xe = X0 + N_SEG * SEG_L;
  for (let k = 1; k <= 30; k++) { const u = k / 30; pts.push({ x: xe + 22 * u, y: cosr(B, 2, u), roll: 0, tunnel: false, seg: N_SEG }); }
  for (let x = xe + 23; x <= X_END; x += 1) pts.push({ x, y: 2, roll: 0, tunnel: false, seg: N_SEG });
  // tangent angle (unwrapped, so loops turn a full circle), arc length
  const S: Sample[] = [];
  let s = 0, prevA = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let ang = Math.atan2(b.y - a.y, b.x - a.x);
    while (ang - prevA > Math.PI) ang -= Math.PI * 2;
    while (ang - prevA < -Math.PI) ang += Math.PI * 2;
    prevA = ang;
    if (i) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    S.push({ ...pts[i], ang, s, t: 0 });
  }
  timeTable(S);
  return { samples: S, len: s, segs };
}

/** Time at every sample: the chain lift is steady; elsewhere the cart is fast where it is low (energy), and each
 * region (pre-ride, each moment, the brake run) is scaled to its fixed duration so everyone stays together. */
function timeTable(S: Sample[]) {
  const regions: [number, number][] = [[-1, T_PRE]];
  for (let i = 0; i < N_SEG; i++) regions.push([i, T_SEG]);
  regions.push([N_SEG, T_POST]);
  let t0 = 0;
  for (const [seg, dur] of regions) {
    const idx = S.map((p, i) => (p.seg === seg ? i : -1)).filter(i => i >= 0);
    if (!idx.length) { t0 += dur; continue; }
    const top = Math.max(...idx.map(i => S[i].y)) + 2.5;
    const dts: number[] = [];
    let sum = 0;
    idx.forEach((i, k) => {
      const ds = k ? S[i].s - S[idx[k - 1]].s : (i ? S[i].s - S[i - 1].s : 0);
      const lift = seg === -1 && S[i].x > -28 && S[i].x < -6;
      const v = lift ? 3.2 : Math.sqrt(Math.max(9, 2 * G * (top - S[i].y)));
      const dt = ds / v; dts.push(dt); sum += dt;
    });
    let acc = 0;
    idx.forEach((i, k) => { acc += dts[k]; S[i].t = t0 + (sum > 0 ? (acc / sum) * dur : (k / idx.length) * dur); });
    t0 += dur;
  }
}

function lerpS(a: Sample, b: Sample, k: number): Sample {
  const L = (p: number, q: number) => p + (q - p) * k;
  return { x: L(a.x, b.x), y: L(a.y, b.y), ang: L(a.ang, b.ang), roll: L(a.roll, b.roll), tunnel: k < 0.5 ? a.tunnel : b.tunnel, seg: k < 0.5 ? a.seg : b.seg, s: L(a.s, b.s), t: L(a.t, b.t) };
}
/** Where the cart is at ride time t. */
export function atTime(tr: Track, t: number): Sample {
  const S = tr.samples;
  if (t <= S[0].t) return S[0];
  if (t >= S[S.length - 1].t) return S[S.length - 1];
  let lo = 0, hi = S.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].t <= t) lo = m; else hi = m; }
  const a = S[lo], b = S[hi];
  return lerpS(a, b, b.t > a.t ? (t - a.t) / (b.t - a.t) : 0);
}
/** Where the track is at arc length s (camera rigs look ahead / behind along the rails). */
export function atS(tr: Track, s: number): Sample {
  const S = tr.samples;
  if (s <= 0) return S[0];
  if (s >= tr.len) return S[S.length - 1];
  let lo = 0, hi = S.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].s <= s) lo = m; else hi = m; }
  const a = S[lo], b = S[hi];
  return lerpS(a, b, b.s > a.s ? (s - a.s) / (b.s - a.s) : 0);
}
/** Speed (m/s) at time t, from neighbouring samples — drives wind, FOV and the whoosh. */
export function speedAt(tr: Track, t: number) { const a = atTime(tr, t - 0.05), b = atTime(tr, t + 0.05); return Math.abs(b.s - a.s) / 0.1; }

/** A companion's track, by its own rules: Rush goes extreme, Still stays gentle, Drop dives into tunnels. */
export function companionSegs(avatar: string, rng: () => number): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < N_SEG; i++) {
    let h = (rng() * 2 - 1) * 0.7, mod: Mod = (['smooth', 'drop', 'loop', 'tunnel', 'cork'] as Mod[])[Math.floor(rng() * 5)];
    if (avatar === 'rush') { h = (rng() < 0.5 ? -1 : 1) * (0.75 + rng() * 0.25); mod = rng() < 0.5 ? 'loop' : 'drop'; }
    else if (avatar === 'still') { h = (rng() * 2 - 1) * 0.3; mod = rng() < 0.8 ? 'smooth' : 'cork'; }
    else if (avatar === 'drop') { h = -0.3 - rng() * 0.6; mod = rng() < 0.6 ? 'tunnel' : 'drop'; if (i === 2 || i === 4) h = Math.abs(h) * 0.6; }
    // the fictional Saturday leans the same way for everyone a little (alarm and chat low, jacket and pizza high)
    h += [-0.25, -0.15, 0.3, -0.2, 0.3][i] * 0.6;
    out.push({ h: Math.round(Math.max(-1, Math.min(1, h)) * 100) / 100, mod });
  }
  return out;
}
