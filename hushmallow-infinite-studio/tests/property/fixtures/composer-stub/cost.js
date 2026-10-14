// STUB G-COST (see compose.js): a flat per-second estimate against the
// final-profile budget of 11 min per 15 s, scaled by duration.
export function gcost(d) {
  const predictedMin = 0.5 * d.duration;
  const budgetMin = 11 * (d.duration / 15);
  return { pass: predictedMin <= budgetMin, errors: [], warnings: [], metrics: { predictedMin, budgetMin } };
}
