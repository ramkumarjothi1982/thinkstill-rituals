// Ritual recommendation + rotation. Deterministic, rule-based scoring; no AI.
//
// Scoring considers the confirmed emotions (exact > same family > similar
// face), intensity fit, context, what the person wants, time available,
// their feedback history, favourites, and stimulation preferences.
// Rotation: a persistent shuffle-bag per eligible pool, so nobody gets the
// same ritual again until they've been offered the others that fit —
// unless they favourite it or ask to repeat it.

import { getEmotion, getFamily, faceSimilarity } from '../data/emotions.js';

const DESIRE_FAMILIES = {
  'calm-down': ['regulation', 'breath', 'grounding'], 'let-it-out': ['release', 'creative'],
  understand: ['reframing', 'reflection'], 'feel-less-alone': ['connection', 'self-compassion', 'grief-comfort'],
  sleep: ['rest', 'breath'], focus: ['attention-shift', 'grounding'], celebrate: ['celebration'],
  decide: ['problem-solving'], 'be-kind-to-self': ['self-compassion'], 'set-boundary': ['boundaries'],
  'prepare-conversation': ['relationship', 'connection'], 'move-body': ['release', 'sensory'], laugh: ['humour'],
};
const HEAVY = new Set(['sadness', 'loneliness']);

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

export function allowedFor(ritual, ent) {
  const tier = ritual.tier || 'paid';
  if (ritual.family === 'reframing' && !ent?.ultra) return false;
  if (tier === 'ultra') return !!ent?.ultra;
  return !!(ent?.paid || ent?.ultra);
}

export function createRecommender({ rituals, store, rng = Math.random, modules = null }) {
  const KEY = 'rotation';
  const load = () => store.get(KEY, { bags: {}, dealt: [], history: [], favourites: [], feedback: {} });
  const save = (s) => store.set(KEY, s);

  function emotionMatch(r, emo) {
    const e = getEmotion(emo.id);
    if (!e) return 0;
    let best = 0;
    for (const ref of r.emotions) {
      if (ref === e.id) best = Math.max(best, 1);
      else if (ref.startsWith('family:')) {
        const fam = ref.slice(7);
        if (fam === e.family) best = Math.max(best, 0.8);
        else if ((e.also || []).includes(fam)) best = Math.max(best, 0.55);
      } else {
        const o = getEmotion(ref);
        if (!o) continue;
        if (o.family === e.family) best = Math.max(best, 0.6);
        best = Math.max(best, faceSimilarity(o.face, e.face) * 0.55);
      }
    }
    return best;
  }

  function score(r, req, state) {
    const reasons = [];
    const emos = req.emotions || [];
    let em = 0;
    let top = null;
    for (const e of emos) {
      const m = emotionMatch(r, e) * (e.confidence ?? 1);
      if (m > em) { em = m; top = e; }
    }
    if (!emos.length) em = 0.3;
    let s = em * 3;
    if (top && em > 0.7) reasons.push(`Made for ${(getEmotion(top.id)?.phrase || getEmotion(top.id)?.name || '').toLowerCase()}`);
    else if (top && em > 0.4) reasons.push(`Fits ${getFamily(getEmotion(top.id)?.family)?.name.toLowerCase() || 'this feeling'}`);
    const I = req.intensity ?? 0.6;
    const { min, max } = r.intensity;
    s += I >= min && I <= max ? 0.6 : -Math.min(1, Math.min(Math.abs(I - min), Math.abs(I - max)) * 2);
    const ctxHit = (r.contexts || []).filter((c) => (req.contexts || []).includes(c));
    if (ctxHit.length) { s += 0.4; reasons.push(`Good for ${ctxHit[0]} stuff`); }
    for (const d of req.desires || []) if ((DESIRE_FAMILIES[d] || []).includes(r.family)) { s += 0.7; reasons.push('Matches what you want right now'); break; }
    if (req.timeSec) {
      if (r.durationSec <= req.timeSec) { s += 0.3; reasons.push(`Fits about ${Math.max(1, Math.round(r.durationSec / 60))} min`); }
      else s -= 0.8;
    }
    const fb = state.feedback[r.id];
    if (fb) s += (fb.helped - fb.notHelped) * 0.25;
    if (state.favourites.includes(r.id)) { s += 0.5; reasons.push('One of your favourites'); }
    const prefs = req.prefs || {};
    const heavy = emos.some((e) => HEAVY.has(getEmotion(e.id)?.family) && (e.intensity ?? I) > 0.6);
    if ((prefs.lowStimulation || heavy) && r.tone === 'energetic') s -= 1.2;
    if ((prefs.lowStimulation || heavy) && (r.tone === 'gentle' || r.tone === 'quiet')) { s += 0.4; if (heavy) reasons.push('Quieter, since this feels heavy'); }
    if ((prefs.preferredMallows || []).includes(r.mallows[0])) s += 0.3;
    if ((prefs.avoidModules || []).includes(r.module)) s -= 3;
    return { s, reasons: [...new Set(reasons)].slice(0, 3) };
  }

  function eligible(req) {
    const ent = req.entitlements || {};
    return rituals.filter((r) => allowedFor(r, ent) && (!modules || modules.has(r.module)) &&
      (req.family ? r.family === req.family : true) && (req.tier ? (r.tier || 'paid') === req.tier : true));
  }

  return {
    recommend(req, { limit = 3 } = {}) {
      const state = load();
      // a ritual must genuinely fit at least one confirmed feeling
      const fits = (r) => !(req.emotions || []).length || (req.emotions || []).some((e) => emotionMatch(r, e) >= (req.minFit ?? 0.5));
      const scored = eligible(req).filter(fits).map((r) => ({ ritual: r, ...score(r, req, state) })).sort((a, b) => b.s - a.s);
      if (!scored.length) return [];
      const best = scored[0].s;
      const pool = scored.filter((x) => x.s >= best - 1.2 && x.s > 0.4);
      const poolIds = pool.map((x) => x.ritual.id).sort();
      const key = hash(poolIds.join('|'));
      let bag = state.bags[key];
      if (!bag || !bag.left.length) {
        // reshuffle (Fisher–Yates), but avoid starting with whatever came last
        const ids = [...poolIds];
        for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
        const last = bag?.last;
        if (ids.length > 1 && ids[0] === last) ids.push(ids.shift());
        bag = { left: ids, last };
      }
      // rank: favourites first, then the bag's order weighted by score
      const order = new Map(bag.left.map((id, i) => [id, i]));
      const ranked = pool.filter((x) => order.has(x.ritual.id) || state.favourites.includes(x.ritual.id))
        .sort((a, b) => (state.favourites.includes(b.ritual.id) - state.favourites.includes(a.ritual.id)) ||
          ((order.get(a.ritual.id) ?? 99) - (order.get(b.ritual.id) ?? 99)) * 0.6 + (b.s - a.s) * 0.4);
      state.bags[key] = bag;
      save(state);
      return ranked.slice(0, limit).map((x) => ({
        ritual: x.ritual, score: +x.s.toFixed(3), reasons: x.reasons, poolKey: key,
        why: x.reasons.length ? `${x.reasons[0]}.` : 'A good place to start.',
      }));
    },
    /** call when a suggestion is actually started */
    markDealt(id, poolKey) {
      const state = load();
      for (const [k, bag] of Object.entries(state.bags)) {
        if (poolKey && k !== poolKey) continue;
        const i = bag.left.indexOf(id);
        if (i >= 0) { bag.left.splice(i, 1); bag.last = id; }
      }
      state.dealt = [id, ...state.dealt.filter((x) => x !== id)].slice(0, 50);
      save(state);
    },
    markCompleted(id, { helped = null, before = null, after = null } = {}) {
      const state = load();
      const fb = state.feedback[id] || { helped: 0, notHelped: 0, runs: 0 };
      fb.runs++;
      if (helped === true) fb.helped++;
      if (helped === false) fb.notHelped++;
      state.feedback[id] = fb;
      state.history = [{ id, at: Date.now(), helped, before, after }, ...state.history].slice(0, 200);
      save(state);
    },
    toggleFavourite(id) {
      const state = load();
      state.favourites = state.favourites.includes(id) ? state.favourites.filter((x) => x !== id) : [id, ...state.favourites];
      save(state);
      return state.favourites.includes(id);
    },
    isFavourite(id) { return load().favourites.includes(id); },
    favourites() { return load().favourites; },
    repeat(id) { return rituals.find((r) => r.id === id) || null; },
    history() { return load().history; },
    resetRotation() { const s = load(); s.bags = {}; save(s); },
    clearAll() { save({ bags: {}, dealt: [], history: [], favourites: [], feedback: {} }); },
  };
}
