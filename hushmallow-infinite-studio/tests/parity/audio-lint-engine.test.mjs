// The banned-sound lint's model of the engine's fx voices (audio/lint-shapes.mjs
// ENGINE_FX, FU-2) against the engine itself: every modelled voice is rendered
// alone through the app's engine in Chromium (audio/render-offline.mjs, the same
// graph the score renders through) and its peak level over the first 250 ms (the
// jump-scare windows; 5 ms RMS of both channels) is compared with the model's,
// both relative to a studio sine of known level. A voice at pan 0 is mono at full
// gain in both channels (+3 dB against a studio strip); a panned one is not.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withHeavyLock } from '../../render/lib/heavy-lock.mjs';
import { openRenderer, SR } from '../../audio/render-offline.mjs';
import { sounds, ENGINE_FX } from '../../audio/lint-shapes.mjs';
import { ENGINE_URL, LAT } from '../../audio/score.mjs';

const T0 = 0.5, WIN = 0.25, DUR = 1.5;
const plan = (engine, synth) => ({ SR, PRE: 1.0, DUR, LAT, engineUrl: ENGINE_URL, engine, synth, ticks: [], crickets: [], swirl: null, pad: null, fade: null,
  bed: { realm: 'moonmilk-cove', fadeIn: 0.8, mood: [{ t: -1, m: { agitation: 0.4, heaviness: 0.3, clarity: 0.6, warmth: 0.5 } }], tickWindows: [], level: [[-1, 0.85]], mute: true } });
/** the measured peak of the 5 ms RMS (L² + R²) within [T0, T0 + WIN] */
function measured(x) {
  const w = Math.round(0.005 * SR), from = Math.round(T0 * SR), to = Math.round((T0 + WIN) * SR);
  let s = 0, best = 0;
  const p = (i) => x[2 * i] ** 2 + x[2 * i + 1] ** 2;
  for (let i = from - w; i < to; i++) { s += p(i); if (i >= from) { s -= p(i - w); best = Math.max(best, Math.sqrt(s / w)); } }
  return best;
}
/** the model's peak summed (power) level within the same window */
function modelled(parts) {
  let best = 0;
  for (let t = 0; t <= WIN; t += 0.0005) {
    let s = 0;
    for (const q of parts) { if (!q.level) continue; const x = t - (q.t - T0); if (x >= 0 && x <= q.dur) s += q.level(x) ** 2; }
    best = Math.max(best, Math.sqrt(s));
  }
  return best;
}

test('every modelled engine fx voice: the lint\'s onset level is the engine\'s within 4.5 dB (median within 1 dB)', { timeout: 600_000 }, async (t) => {
  const cases = [['ref', [], [{ t: T0, inst: 'blip', f: 600, a: 0.004, h: 0.1, d: 0.2, peak: 0.1 }]]];
  for (const name of Object.keys(ENGINE_FX)) cases.push([name, [{ t: T0, kind: 'fx', name, opts: { intensity: 0.5, note: 2, duration: 1 }, trim: 0.5 }], []]);
  for (const name of ['chime', 'pluck', 'snap']) cases.push([`${name} panned`, [{ t: T0, kind: 'fx', name, opts: { intensity: 0.5, pan: 0.5 }, trim: 0.5 }], []]);
  const rows = await withHeavyLock({ mode: 'shared', label: 'test audio lint engine' }, async () => {
    const s = await openRenderer();
    try {
      const out = [];
      for (const [name, engine, synth] of cases) {
        const { x } = await s.render(plan(engine, synth), { probe: true });
        out.push({ name, measured: measured(x), model: modelled(sounds({ engine, synth })) });
      }
      return out;
    } finally { await s.close(); }
  });
  const k = rows[0].measured / rows[0].model;       // the studio sine: the scale between the model and the output
  const off = rows.slice(1).map((r) => ({ name: r.name, db: 20 * Math.log10(r.measured / r.model / k) }));
  const table = off.map((r) => `${r.name} ${r.db.toFixed(1)}`).join(', ');
  t.diagnostic(`engine − model (dB): ${table}`);
  for (const r of off) assert.ok(Math.abs(r.db) <= 4.5, `${r.name}: the engine is ${r.db.toFixed(1)} dB off the model (${table})`);
  const med = off.map((r) => Math.abs(r.db)).sort((a, b) => a - b)[Math.floor(off.length / 2)];
  assert.ok(med <= 1, `median |Δ| ${med.toFixed(2)} dB (${table})`);
});
