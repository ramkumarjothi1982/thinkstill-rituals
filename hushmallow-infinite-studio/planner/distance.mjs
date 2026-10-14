// Structural distance between two specs' visible slots (PHASE2-PLAN G-SPEC,
// story-library variationRules.uniqueness, design-variety-scale-first 10.3):
// two posts on one channel within 14 days must differ in >= 3 rule slots,
// one of them the Mallow or the hook, AND have weighted distance >= 6.0.
// Hooks compare semantically: token Jaccard >= 0.5 counts as the same hook,
// so a reworded hook is not a new hook.

import { loadPolicy } from './policy.mjs';

/** Word tokens of a hook (array of lines or string), lower-cased, punctuation dropped. Cached per text. */
const tokenCache = new Map();
export function hookTokens(hook) {
  const text = Array.isArray(hook) ? hook.join(' ') : String(hook || '');
  let set = tokenCache.get(text);
  if (!set) {
    set = new Set(text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/'/g, '').split(/\s+/).filter(Boolean));
    if (tokenCache.size > 50000) tokenCache.clear();
    tokenCache.set(text, set);
  }
  return set;
}

/** Jaccard similarity of two token sets. */
export function jaccard(a, b) {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Do two hooks count as the same hook (token Jaccard >= policy threshold)? */
export function sameHook(a, b, policy = loadPolicy()) {
  return jaccard(hookTokens(a), hookTokens(b)) >= policy.uniqueness.hookJaccard;
}

const endKey = (e) => (e ? `${e.kind}:${e.text.join(' ')}` : '');
const dressKey = (s) => [...(s.dressing || [])].map((d) => (typeof d === 'string' ? d : `${d.id}#${d.variant}`)).sort().join(',');   // spec objects or visible-slot strings

/**
 * Compare the visible slots of two specs (or ledger 'visible' objects with the
 * same field names). → { differ: [rule slots that differ], count, weighted, parts }
 */
export function slotDiff(a, b, policy = loadPolicy()) {
  const W = policy.uniqueness.weights;
  const la = a.copy?.lines || a.lines || [], lb = b.copy?.lines || b.lines || [];
  const ha = a.copy?.hook || a.hook, hb = b.copy?.hook || b.hook;
  const ea = a.copy?.end || a.end, eb = b.copy?.end || b.end;
  const gagId = (s) => (typeof s.gag === 'object' ? s.gag?.id : s.gag);
  const linesChanged = la.filter((l) => !lb.includes(l)).length;
  const d = {
    mallow: a.mallow !== b.mallow,
    hook: !sameHook(ha, hb, policy),
    lines: linesChanged > 0 || la.length !== lb.length,
    ritual: a.ritual !== b.ritual,
    gag: gagId(a) !== gagId(b),
    realmTod: a.realm !== b.realm || a.tod !== b.tod,
    metaphor: a.metaphor !== b.metaphor,
    template: a.template !== b.template,
    weatherDressing: a.weather !== b.weather || dressKey(a) !== dressKey(b),
    camera: a.camera !== b.camera,
    end: endKey(ea) !== endKey(eb),
  };
  const parts = {};
  for (const [k, w] of Object.entries(W)) {
    if (k === 'lines') parts.lines = (w * Math.min(3, Math.max(linesChanged, d.lines ? 1 : 0))) / 3;
    else parts[k] = d[k] ? w : 0;
  }
  const weighted = Object.values(parts).reduce((s, v) => s + v, 0);
  const differ = policy.uniqueness.ruleSlots.filter((k) => d[k]);
  return { differ, count: differ.length, weighted: Math.round(weighted * 1000) / 1000, parts };
}

/** Is candidate far enough from an earlier post? → { ok, diff, reason } */
export function distanceOk(a, b, policy = loadPolicy()) {
  const u = policy.uniqueness, diff = slotDiff(a, b, policy);
  if (diff.count < u.minSlotsDiffer) return { ok: false, diff, reason: `only ${diff.count} rule slots differ (${diff.differ.join(', ') || 'none'}; need ${u.minSlotsDiffer})` };
  if (!u.mustDifferOneOf.some((k) => diff.differ.includes(k))) return { ok: false, diff, reason: `neither ${u.mustDifferOneOf.join(' nor ')} differs` };
  if (diff.weighted < u.minWeightedDistance) return { ok: false, diff, reason: `weighted distance ${diff.weighted} < ${u.minWeightedDistance}` };
  return { ok: true, diff, reason: null };
}
