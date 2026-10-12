// Quick tricks: the locked ThinkStill 1,000, played one at a time.
//
// Content lives in two generated modules (tools/import_tricks.py):
//   src/data/tricks/quick-tricks.js — Paid: attention resets, getting started
//   src/ultra/plot-twists.js        — Ultra only (reframing territory), loaded
//                                     through loadUltraTricks()
// Picking is deterministic and rule-based: the confirmed feelings' families
// against each trick's target issue, then a persistent shuffle-bag so nothing
// repeats until its pool has been dealt. No AI.

import { getEmotion } from '../data/emotions.js';
import { requireEntitlement } from '../app/entitlements.js';
import { MALLOWS } from '../mallows/registry.js';

let paidCache = null;
let ultraCache = null;

/** Every trick this person's plan includes. Throws without a plan. */
export async function loadTricks(ent) {
  requireEntitlement(ent, 'paid');
  paidCache ||= (await import('../data/tricks/quick-tricks.js')).QUICK_TRICKS;
  if (!ent.has('ultra')) return paidCache;
  ultraCache ||= await loadUltraTricks(ent);
  return [...paidCache, ...ultraCache];
}

/** The only way Ultra's plot twists get loaded. */
export async function loadUltraTricks(ent) {
  requireEntitlement(ent, 'ultra');
  return (await import('../ultra/plot-twists.js')).PLOT_TWISTS;
}

const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'for', 'vs', 'by', 'is', 'as']);
export function titleCase(s) {
  return s.toLowerCase().split(/(\s+|-)/).map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join('');
}

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

/** How well a trick suits the confirmed feelings (0..1). No feelings → 0.5. */
export function trickFit(t, emotions = []) {
  if (!emotions.length) return 0.5;
  let best = 0;
  for (const e of emotions) {
    const emo = getEmotion(e.id);
    if (!emo) continue;
    if (t.families.includes(emo.family)) best = Math.max(best, t.families[0] === emo.family ? 1 : 0.8);
    else if ((emo.also || []).some((f) => t.families.includes(f))) best = Math.max(best, 0.5);
  }
  return best;
}

/**
 * A deck over a list of tricks, with rotation stored in `store`.
 *   deck.pick({ emotions, intensity, tier, mallow }) → trick | null
 */
export function createTrickDeck({ store, tricks, rng = Math.random }) {
  const KEY = 'trick-rotation';
  const load = () => store.get(KEY, { bags: {}, last: null, played: [] });
  const save = (s) => store.set(KEY, s);
  return {
    size: tricks.length,
    pick({ emotions = [], intensity = 0.6, tier = null, mallow = null, exclude = [] } = {}) {
      const state = load();
      let pool = tricks.filter((t) => (!tier || t.tier === tier) && (!mallow || t.mallow === mallow) && !exclude.includes(t.id));
      // extra-care tricks wait until things are less intense
      if (intensity > 0.85) pool = pool.filter((t) => t.care !== 'extra');
      const scored = pool.map((t) => [t, trickFit(t, emotions)]);
      const top = Math.max(0, ...scored.map(([, s]) => s));
      if (!scored.length || (emotions.length && top < 0.5)) return null;
      const chosen = scored.filter(([, s]) => s >= top - 0.2).map(([t]) => t.id).sort();
      const key = hash(chosen.join('|'));
      let bag = state.bags[key];
      if (!bag || !bag.length) {
        bag = [...chosen];
        for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
        if (bag.length > 1 && bag[0] === state.last) bag.push(bag.shift());
      }
      const id = bag.shift();
      state.bags[key] = bag;
      state.last = id;
      state.played = [id, ...state.played.filter((x) => x !== id)].slice(0, 100);
      // keep storage small: only the bags touched recently survive
      const keys = Object.keys(state.bags);
      if (keys.length > 24) for (const k of keys.slice(0, keys.length - 24)) delete state.bags[k];
      save(state);
      return tricks.find((t) => t.id === id) || null;
    },
    get(id) { return tricks.find((t) => t.id === id) || null; },
    all() { return tricks; },
  };
}

/** Wrap one trick as a ritual the host can run. */
export function trickRitual(t) {
  const m = MALLOWS[t.mallow];
  return {
    id: t.id,
    name: titleCase(t.title),
    purpose: t.mission,
    family: t.tier === 'ultra' ? 'reframing' : 'attention-shift',
    tier: t.tier,
    emotions: t.families.map((f) => `family:${f}`),
    intensity: { min: 0, max: t.care === 'extra' ? 0.85 : 1 },
    contexts: [],
    durationSec: t.sec,
    mallows: [t.mallow],
    module: 'quick-trick',
    moves: [
      { id: 'mission', prompt: t.mission, kind: 'read' },
      { id: 'call', prompt: t.rule, kind: t.predict.kind },
      { id: 'move', prompt: t.move, kind: 'timed' },
      { id: 'twist', prompt: t.twist, kind: 'flip' },
      { id: 'bend', prompt: t.bend, kind: 'reveal' },
    ],
    world: { realm: m.realm, transform: 'The realm clears as the trick lands.' },
    checkIn: 'Notice anything shift?',
    trick: t,
  };
}
