// The plan-time and compile-time gates, re-run by QA on what was rendered:
//
//   G-SPEC  planner/gspec.mjs checkSpec() on spec.json, against the ledger and
//           capabilities in force (the context may name others: fixtures use an
//           empty ledger and, for specs of templates no Mallow is cleared for
//           yet, the open capability set).
//   G-DIR   composer/validate.js gdir() on the compiled direction QA judged
//           (direction.json; else the spec composed in Node), plus the rules
//           WP-03 left to QA (docs/wp/WP-03.md, open issue 3): spin speed and
//           ramps, pulse ramps, the face inside the silhouette, and no
//           absolute-time audio layers.
//   G-COST  composer/cost.js gcost(), plus the actual render time against the
//           prediction when provenance has segment timings (warn at +30 %;
//           reported only: the refit is WP-15's).
// Each error rule becomes a failing check named by the rule, so a report (and
// a fixture expectation) can say exactly which rule fired. As in
// planner/compile.mjs, G-DIR and G-COST never run on a spec G-SPEC refused.

import path from 'node:path';
import { check, gate, notRunGate } from './verdict.mjs';

/** checks from a gate result { errors, warnings }. */
function ruleChecks(r, passName) {
  const checks = {};
  for (const e of r.errors || []) {
    const k = e.rule;
    const prev = checks[k];
    checks[k] = check('fail', (prev?.value || 0) + 1, 0, prev ? `${prev.detail}; ${e.message}` : e.message);
  }
  for (const w of r.warnings || []) {
    const k = `warn:${w.rule}`;
    const prev = checks[k];
    checks[k] = check('warn', (prev?.value || 0) + 1, null, prev ? `${prev.detail}; ${w.message}` : w.message);
  }
  if (!Object.values(checks).some((c) => c.status === 'fail')) checks[passName] = check('pass', 0, 0, `${passName}: no errors`);
  return checks;
}

async function planningContext(ctx) {
  const { loadLibrary } = await import('../../planner/library.mjs');
  const { loadPolicy } = await import('../../planner/policy.mjs');
  const { loadCapabilities, openCapabilities, CAPABILITIES_FILE } = await import('../../planner/capabilities.mjs');
  const { loadLedger, emptyLedger } = await import('../../planner/ledger.mjs');
  const lib = loadLibrary();
  const caps = ctx.capabilities === 'open' ? openCapabilities(lib) : loadCapabilities(lib, ctx.capabilities || CAPABILITIES_FILE);
  const ledger = ctx.ledgerDir === 'empty' ? emptyLedger() : loadLedger({ dir: ctx.ledgerDir || undefined });
  return { lib, policy: loadPolicy(), caps, ledger };
}

export async function gspecGate(ctx) {
  if (!ctx.spec) return notRunGate('no spec.json: G-SPEC needs the spec the video was made from');
  const { checkSpec } = await import('../../planner/gspec.mjs');
  const { batchSpecsOf } = await import('../../planner/runs.mjs');
  const pc = await planningContext(ctx);
  const batchSpecs = ctx.specFile && path.basename(ctx.specFile) === 'spec.json' ? batchSpecsOf(ctx.specFile) : [];
  const r = checkSpec(ctx.spec, { ...pc, batchSpecs });
  return gate(ruleChecks(r, 'checkSpec'), {
    errors: r.errors, warnings: r.warnings, metrics: { ...r.metrics, capabilities: ctx.capabilities === 'open' ? 'open (fixture)' : 'in force', ledger: pc.ledger.dir || 'empty' },
  });
}

/** The direction QA judges: the context's compiled direction, else the spec composed in Node. */
async function directionFor(ctx) {
  if (ctx.direction) return { direction: ctx.direction, source: ctx.directionFile };
  if (!ctx.spec) return { direction: null, source: null };
  const { compose } = await import('../../composer/compose.js');
  const c = await compose(ctx.spec);
  return { direction: c.direction ?? c, source: 'composed in Node from spec.json (shim layout)' };
}

/** The G-DIR rules WP-03 left to QA. → checks */
export async function dirSupplements(direction, ctx) {
  const { createScene } = await import('../../composer/scene.js');
  const sc = createScene(direction);
  const D = direction.meta.duration, hz = 240;
  const checks = {};
  // spin: <= 1 turn/s (<= 0.3 when the camera is close, zoom >= 1.10), ramps >= 0.5 s
  let worst = { rate: 0, t: 0, close: false }, ramp = null;
  for (const p of direction.props || []) {
    if (!p.channels?.phase) continue;
    const phase = sc.channel(p.channels.phase);
    const rates = [];
    for (let k = 0; k <= D * hz; k++) {
      const t = k / hz;
      const r = Math.abs(phase(Math.min(D, t + 0.5 / hz)) - phase(Math.max(0, t - 0.5 / hz))) * hz / (2 * Math.PI);
      rates.push(r);
      const close = sc.camAt(t).zoom >= 1.1 - 1e-9;
      if (r > worst.rate) worst = { rate: r, t, close };
      if (close && r > 0.3) worst = { ...worst, closeBreach: { rate: r, t } };
    }
    // ramp: time from 10 % to 90 % of the peak, on the way up
    const peak = Math.max(...rates);
    if (peak > 0.05) {
      const ip = rates.indexOf(peak);
      let i90 = ip, i10 = ip;
      while (i90 > 0 && rates[i90] > 0.9 * peak) i90--;
      while (i10 > 0 && rates[i10] > 0.1 * peak) i10--;
      const r = (i90 - i10) / hz;
      ramp = ramp === null ? r : Math.min(ramp, r);
    }
  }
  const rate = Math.round(worst.rate * 1000) / 1000;
  checks.spin = worst.closeBreach
    ? check('fail', Math.round(worst.closeBreach.rate * 1000) / 1000, 0.3, `spin ${worst.closeBreach.rate.toFixed(3)} turns/s at ${worst.closeBreach.t.toFixed(2)} s in a close-up (zoom >= 1.10; limit 0.3)`)
    : check(worst.rate <= 1 ? 'pass' : 'fail', rate, 1, `fastest spin ${rate} turns/s at ${worst.t.toFixed(2)} s (limit 1; 0.3 in close-ups)`);
  checks.spinRamp = ramp === null ? check('pass', null, 0.5, 'nothing spins')
    : check(ramp >= 0.5 ? 'pass' : 'fail', Math.round(ramp * 1000) / 1000, 0.5, `spin ramp (10-90 % of peak) ${ramp.toFixed(3)} s (limit >= 0.5 s)`);
  // pulse ramps >= 150 ms: a pulse channel's half period
  const pulses = Object.entries(direction.channels || {}).filter(([, c]) => c.type === 'pulse');
  const half = pulses.map(([n, c]) => [n, (c.period ?? (c.freq ? 1 / c.freq : Infinity)) / 2]);
  const minHalf = half.length ? Math.min(...half.map(([, h]) => h)) : null;
  checks.pulseRamp = minHalf === null ? check('pass', null, 0.15, 'no pulse channel')
    : check(minHalf >= 0.15 ? 'pass' : 'fail', Math.round(minHalf * 1000) / 1000, 0.15, `shortest pulse ramp (half period) ${minHalf.toFixed(3)} s (${half.map(([n, h]) => `${n} ${h.toFixed(2)} s`).join(', ')})`);
  // the face inside the silhouette: the face is drawn in art space and deformed with the body mesh,
  // so it stays inside unless a face transform channel moves it off the art (WP-10 adds them)
  const faceXf = Object.keys(direction.channels || {}).filter((n) => /^face\.(xf|offset|lidXform)/.test(n));
  checks.faceInSilhouette = faceXf.length ? check('not-run', null, null, `face transform channels ${faceXf.join(', ')}: geometry check not implemented yet (WP-10)`)
    : check('pass', 0, 0, 'the face is drawn in art space on the body mesh (no face transform channel): inside the silhouette by construction');
  // no absolute-time audio layers (R10/R11): the frozen v2 score has them; WP-04's score derives layers from cues
  const legacyScore = (ctx.score || direction.meta.score) === 'soundtrack-v2';
  checks.absoluteLayers = legacyScore
    ? check('warn', 1, 0, 'score soundtrack-v2 (frozen) keys its tick, swirl and bed layers to absolute times (audit R10/R11); WP-04\'s generalised score removes them')
    : check('pass', 0, 0, 'layers derive from cues (score is not the frozen soundtrack-v2)');
  return checks;
}

export async function gdirGate(ctx, specGate) {
  if (specGate && specGate.pass === false) return notRunGate('G-SPEC failed: the composer never sees a spec G-SPEC refuses');
  const { direction, source } = await directionFor(ctx);
  if (!direction) return notRunGate('no direction.json and no spec to compose');
  const { gdir } = await import('../../composer/validate.js');
  const t0 = process.hrtime.bigint();
  const r = gdir(direction, { spec: ctx.spec });
  const checks = ruleChecks(r, 'gdir');
  Object.assign(checks, await dirSupplements(direction, ctx));
  return gate(checks, { errors: r.errors, warnings: r.warnings, metrics: { ...r.metrics, source, ms: Math.round(Number(process.hrtime.bigint() - t0) / 1e5) / 10 } });
}

export async function gcostGate(ctx, specGate, thresholds) {
  if (specGate && specGate.pass === false) return notRunGate('G-SPEC failed: the composer never sees a spec G-SPEC refuses');
  const { direction, source } = await directionFor(ctx);
  if (!direction) return notRunGate('no direction.json and no spec to compose');
  const { gcost } = await import('../../composer/cost.js');
  const r = gcost(direction, { spec: ctx.spec });
  const checks = ruleChecks(r, 'gcost');
  const segs = ctx.provenance?.segments;
  const prof = ctx.provenance?.job?.params?.profile;
  if (segs?.length && r.metrics?.predictedSec) {
    const workers = new Set(segs.map((s) => s.worker)).size || 1;
    const actual = segs.reduce((s, x) => s + (x.ms || 0), 0) / 1000;
    const over = actual / r.metrics.predictedSec - 1;
    const lim = thresholds.gates['G-COST'].warnOver;
    checks.actualVsPredicted = check(over > lim ? 'warn' : 'pass', Math.round(over * 1000) / 1000, lim,
      `actual ${actual.toFixed(0)} s of segment render time (${workers} worker(s), profile ${prof}) vs predicted ${r.metrics.predictedSec.toFixed(0)} s (${r.metrics.model}): ${(over * 100).toFixed(0)} %`, { reportOnly: true });
  } else {
    checks.actualVsPredicted = check('not-run', null, null, 'no farm segment timings (provenance.json) to compare with the prediction', { reportOnly: true });
  }
  return gate(checks, { errors: r.errors, warnings: r.warnings, metrics: { ...r.metrics, source } });
}
