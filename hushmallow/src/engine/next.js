// What to offer next, without repeats in this round (see round.js).
// Order: unseen rituals made for the feeling → any ritual not yet done this
// round. Rule-based; no AI.

/**
 * rec: recommender; req: request (emotions, intensity, entitlements…);
 * rituals: rituals this plan may be offered; seen: Set of ids already started
 * this round. Returns { options: [{type:'ritual', item, reasons}], left, total }.
 */
export function planOptions({ rec, req, rituals, seen, limit = 4, rng = Math.random }) {
  const left = rituals.filter((r) => !seen.has(r.id)).length;
  const out = [];
  for (const o of rec.recommend({ ...req, exclude: seen }, { limit })) out.push({ type: 'ritual', item: o.ritual, reasons: o.reasons, poolKey: o.poolKey });
  if (!out.length) {
    // nothing made for this feeling is left this round: offer what's left
    const rest = rituals.filter((r) => !seen.has(r.id));
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    for (const r of rest.slice(0, limit)) out.push({ type: 'ritual', item: r, reasons: ['Something new for you'] });
  }
  return { options: out, left, total: rituals.length };
}
