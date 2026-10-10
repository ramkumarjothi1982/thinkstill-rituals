/* Group Think Glitch — the incident as pure functions of time. Shared by the renderer, the room server (companion
 * spotlight paths) and the tests; no DOM here. */
import type { V3 } from '../../gfx/projector';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
const path = (t: number, keys: [number, V3][]): V3 => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) { const k = ease(seg(t, keys[i - 1][0], keys[i][0])); const a = keys[i - 1][1], b = keys[i][1]; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
  }
  return keys[keys.length - 1][1];
};

/** Spotlight paths travel as floor positions normalised to 0..1 (x from -6..6, z from -4..6). */
export const worldToUV = (x: number, z: number): [number, number] => [clamp((x + 6) / 12, 0, 1), clamp((z + 4) / 10, 0, 1)];
export const uvToWorld = (u: number, v: number): [number, number] => [u * 12 - 6, v * 10 - 4];

export const CAKE_REST: V3 = [-0.74, 0.76, 2.2];
export const STOOL: V3 = [-0.56, 0, 3.02];
export function stateAt(t: number) {
  // cake: Patch slides it to the left edge; the cat's paw tips it; it falls toward Rush
  const cakeSlide = path(t, [[0.6, [0.15, 0.76, 2.2]], [1.4, CAKE_REST]]);
  const nudge = seg(t, 4.1, 4.42);
  let cake: V3 = cakeSlide, cakeRot = 0, cakeTilt = 0, cakeOn = true;
  const splat = t >= 4.82;
  if (t >= 4.1) { cake = [CAKE_REST[0] - 0.12 * ease(nudge), 0.76, CAKE_REST[2]]; cakeTilt = 0.25 * nudge; }
  if (t >= 4.42) {
    const k = seg(t, 4.42, 4.82);
    cakeOn = false;
    const x0 = CAKE_REST[0] - 0.12, z0 = CAKE_REST[2];
    cake = [x0 - 0.44 * k, 0.76 + 0.16 * Math.sin(k * Math.PI) - 0.76 * k * k, z0 - 0.25 * k];
    cakeRot = -1.8 * k;
  }
  const splatAt: V3 = [-1.3, 0.005, 1.95];
  // Rush: walks in with a tray, a balloon ribbon catches a foot, stumbles, lunges, ends with iced hands
  const rush = path(t, [[0, [-4.3, 0, 0.55]], [3.35, [-1.45, 0, 1.45]], [3.9, [-1.15, 0, 1.7]], [4.55, [-1.05, 0, 1.92]], [5.4, [-1.12, 0, 1.82]]]);
  const walking = t < 3.35 ? 1 : 0;
  const stumble = seg(t, 3.45, 4.0), lunge = seg(t, 4.25, 4.6);
  const rushRot = t < 3.45 ? Math.sin(t * 7) * 0.05 : t < 4.25 ? 0.42 * Math.sin(stumble * Math.PI) : t < 5.2 ? -0.55 * Math.sin(Math.min(1, lunge) * Math.PI / 2) * (1 - seg(t, 4.9, 5.4)) : 0;
  const rushLean = t >= 4.25 && t < 5.2 ? 0.22 * Math.sin(Math.min(1, lunge) * Math.PI / 2) * (1 - seg(t, 4.9, 5.4)) : 0;
  const rushBob = walking ? Math.abs(Math.sin(t * 9)) * 0.06 : 0;
  const iced = t >= 4.85;
  const spill = seg(t, 3.55, 4.15);
  // cat: behind the table → hops onto the stool (right behind the cake, as seen from the door) → paws → drops behind the cloth
  const cat = path(t, [[0, [-0.5, 0.03, 3.3]], [1.85, [-0.52, 0.03, 3.25]], [2.35, [-0.56, 0.45, 3.02]], [4.36, [-0.56, 0.45, 3.02]], [4.5, [-0.52, 0.03, 3.3]], [4.75, [-0.1, 0.03, 3.45]], [9, [-0.1, 0.03, 3.45]]]);
  const catPose = t < 1.85 ? 'crouch' : t < 2.35 ? 'jump' : t >= 4.0 && t < 4.36 ? 'paw' : t >= 4.36 && t < 4.6 ? 'jump' : t >= 4.6 ? 'loaf' : 'sit';
  const catHop = (t >= 1.85 && t < 2.35 ? Math.sin(seg(t, 1.85, 2.35) * Math.PI) * 0.15 : 0) + (t >= 4.36 && t < 4.6 ? Math.sin(seg(t, 4.36, 4.6) * Math.PI) * 0.08 : 0);
  const pawK = t >= 4.0 && t < 4.36 ? Math.sin(seg(t, 4.0, 4.36) * Math.PI) : 0;
  // Patch slides the cake, steps back, gasps
  const patch = path(t, [[0, [0.95, 0, 2.98]], [0.6, [0.55, 0, 2.98]], [1.4, [-0.2, 0, 3.05]], [2.4, [1.3, 0, 3.1]], [9, [1.3, 0, 3.1]]]);
  const flash = t >= 5.45 && t < 5.9 ? 1 - seg(t, 5.45, 5.9) : 0;
  const wobble = t >= 3.95 && t < 4.7 ? Math.sin(t * 60) * 0.012 * (1 - seg(t, 3.95, 4.7)) : 0;
  const mood = {
    rush: t < 3.45 ? 'happy' : t < 4.25 ? 'surprised' : t < 4.85 ? 'determined' : t < 6.4 ? 'worried' : 'shy',
    patch: t < 1.5 ? 'happy' : t < 4.8 ? 'neutral' : t < 6.2 ? 'surprised' : 'worried',
    glitch: t < 5.4 ? 'cool' : t < 6.2 ? 'gasp' : 'think',
    sync: t < 4.8 ? 'laugh' : t < 6.0 ? 'surprised' : 'worried',
    loopie: t < 4.8 ? 'happy' : t < 6.0 ? 'wow' : 'laugh'
  };
  const syncPos: V3 = t < 4.8 ? [-2.3 + Math.sin(t * 3.1) * 0.12, Math.abs(Math.sin(t * 6.2)) * 0.1, 4.6] : [-2.25, 0, 4.55];
  const loopiePos: V3 = [1.95, t < 4.8 ? Math.abs(Math.sin(t * 5.4 + 1)) * 0.08 : 0, 4.45];
  const glitchPos: V3 = [2.35, 0, 1.05];
  const tug = Math.sin(seg(t, 3.45, 4.3) * Math.PI) * 0.35;
  // every head turns to Rush after the splat
  const look = seg(t, 6.2, 7.0);
  return { t, cake, cakeRot, cakeTilt, cakeOn, splat, splatAt, rush, rushRot, rushLean, rushBob, iced, spill, cat, catPose, catHop, pawK, patch, flash, wobble, mood, syncPos, loopiePos, glitchPos, tug, look };
}
export type WorldState = ReturnType<typeof stateAt>;

/** World anchor of each hotspot at time t (where the evidence is). */
export function hotspotAnchor(id: string, s: WorldState): V3 {
  switch (id) {
    case 'edge': return [s.cake[0], 0.98, s.cake[2]];
    case 'catjump': return [s.cat[0], s.cat[1] + 0.2 + s.catHop, s.cat[2]];
    case 'paw': return [-0.74, 0.9, 2.5];
    case 'string': return [s.rush[0] + 0.05, 0.08, s.rush[2]];
    case 'stumble': case 'lunge': case 'hands': return [s.rush[0], 0.42, s.rush[2]];
    case 'wobble': return [0, 0.7, 2.7];
    case 'splat': return [s.splatAt[0], 0.12, s.splatAt[2]];
  }
  return [0, 0.8, 2.2];
}

