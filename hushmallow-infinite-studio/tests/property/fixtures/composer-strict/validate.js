// STUB G-DIR that refuses every gag above intensity 0.9 (an arbitrary line for the test).
import { gdir as base } from '../composer-stub/validate.js';
export function gdir(d, ctx) {
  const r = base(d, ctx);
  if (d.gag.intensity > 0.9) r.errors.push({ rule: 'stub:strict-intensity', message: `intensity ${d.gag.intensity} > 0.9` });
  return { ...r, pass: r.errors.length === 0 };
}
