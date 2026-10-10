/* Ritual rules interface: each ritual supplies authoritative setup, validation and companion behaviour. These run on the
 * room server (and in the page for solo play). No generative AI: companions use authored, seeded rules only. */
import type { Phase, RitualId, Slug } from './protocol';

export type Rng = () => number;
export interface Seat { pid: string; seat: number; avatar: Slug; human: boolean; name: string; }

export interface RitualLogic {
  id: RitualId;
  title: string;
  min: number;              // minimum participants (humans + companions)
  max: number;              // maximum participants
  setup(seed: number, seats: Seat[], startData?: any): any;
  validateSeal(pub: any, seat: Seat, data: any): any | null;
  companionSeal(pub: any, seat: Seat, rng: Rng): any;
  validateLive?(pub: any, seat: Seat, data: any, phase: Phase): any | null;
  onReveal?(pub: any, now: number, sealed: Record<string, any>): any;   // may return an updated pub
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(arr: T[], seed: number): T[] {
  const r = mulberry32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
