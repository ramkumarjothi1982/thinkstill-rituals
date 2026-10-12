// What to offer next, without repeats in this round (see round.js).
// Order: unseen rituals made for the feeling → unseen tricks that fit the
// feeling → anything else not yet done. Rule-based; no AI.
import { trickFit } from './tricks.js';

/**
 * rec: recommender; req: request (emotions, intensity, entitlements…);
 * rituals: rituals this plan may be offered; tricks: tricks in this plan;
 * seen: Set of ids already started this round.
 * Returns { options: [{type:'ritual'|'trick', item, reasons}], left, total }.
 */
export function planOptions({ rec, req, rituals, tricks, seen, limit = 4, rng = Math.random }) {
  const offerable = [...rituals.map((r) => r.id), ...tricks.map((t) => t.id)];
  const left = offerable.filter((id) => !seen.has(id)).length;
  const out = [];
  for (const o of rec.recommend({ ...req, exclude: seen }, { limit })) out.push({ type: 'ritual', item: o.ritual, reasons: o.reasons, poolKey: o.poolKey });

  const unseenTricks = tricks.filter((t) => !seen.has(t.id));
  const shuffled = (xs) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  if (out.length < limit) {
    const fitting = shuffled(unseenTricks.filter((t) => trickFit(t, req.emotions || []) >= 0.5))
      .sort((a, b) => trickFit(b, req.emotions || []) - trickFit(a, req.emotions || []));
    for (const t of fitting.slice(0, limit - out.length)) out.push({ type: 'trick', item: t, reasons: ['Fits how you feel', 'About a minute'] });
  }
  if (!out.length) {
    // nothing made for this feeling is left this round: offer what's left
    const restRituals = rituals.filter((r) => !seen.has(r.id));
    for (const r of restRituals.slice(0, limit)) out.push({ type: 'ritual', item: r, reasons: ['Something new for you'] });
    for (const t of shuffled(unseenTricks).slice(0, limit - out.length)) out.push({ type: 'trick', item: t, reasons: ['Something new for you', 'About a minute'] });
  }
  return { options: out, left, total: offerable.length };
}
