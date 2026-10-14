// STUB G-DIR (see compose.js): a few of G-DIR's text and safety rules on the
// stub direction, so the compile path has real verdicts to carry. The real
// G-DIR (WP-03, composer/validate.js) checks the composed curves.

const seconds = (ws) => ws.reduce((s, [a, b]) => s + Math.max(0, b - a), 0);

export function gdir(d, { spec, lib }) {
  const errors = [];
  for (const t of d.texts) {
    const need = Math.max(t.kind === 'caption' ? 2.0 : 1.0, 0.25 + 0.05 * t.text.length);
    const have = seconds(t.windows);
    if (have + 1e-9 < need) errors.push({ rule: 'stub:text-time', message: `${t.id} "${t.text}" shows ${have.toFixed(2)} s, needs ${need.toFixed(2)} s` });
  }
  const glass = d.texts.filter((t) => t.kind === 'glass');
  for (const t of glass) {
    const at = t.windows[0][0] + 1e-6;
    const onScreen = glass.filter((g) => g.windows.some(([a, b]) => a <= at && at < b)).length;
    if (onScreen > 3) errors.push({ rule: 'stub:glass-count', message: `${onScreen} glass texts at ${at.toFixed(2)} s` });
  }
  const minDur = lib.rituals[spec.ritual]?.minDur ?? 0;
  if (d.ritual.window + 1e-9 < minDur) errors.push({ rule: 'stub:ritual-window', message: `${spec.ritual} needs ${minDur} s, the clock gives ${d.ritual.window} s` });
  if (!(d.gag.intensity > 0 && d.gag.intensity <= 1)) errors.push({ rule: 'stub:intensity', message: `gag intensity ${d.gag.intensity}` });
  return { pass: errors.length === 0, errors, warnings: [], metrics: { texts: d.texts.length } };
}
