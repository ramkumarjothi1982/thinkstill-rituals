// The spec planner: seeded, capability-gated sampling of variant specs
// (hm-variant/1) from the story library (PHASE2-PLAN WP-06, slotGrammar
// pipeline steps 1-5).
//
//   planBatch({ lib, caps, policy, ledger, mode, count, seed, ... }) → { specs, failures, manifest }
//   planSpec({ ..., constraints })                                    → one spec (hm spec new)
//
// Rules of the road:
//   - Only what library/capabilities.json enables can be sampled (review mode
//     also admits candidate move cells). Copy only ever comes from the library.
//   - Every choice comes from a named stream seeded by the spec seed
//     (planner/rng.mjs); spec seeds come from (batch seed, index, attempt). The
//     same inputs give the same bytes, in any process.
//   - Weights: primary Mallows 3, secondary 1; the Mallow's signature gag about
//     40% of the time where feasible; template intensity caps; then
//     planner/policy.json for the rest. WP-25 layers least-recently-used
//     weights on top through options.weight (slot, value) → multiplier.
//   - A candidate is resampled (new attempt seed) until it passes the hard
//     rules: copy lint, fingerprint never used, in-batch distinctness (review)
//     or the channel's posting rules (production). After policy retries the
//     planner stops and reports which constraints blocked it.

import fs from 'node:fs';
import { studioPath } from '../render/lib/paths.mjs';
import { hooksOf, linePools, resolutionsOf, gagsOf, ritualsOf, metaphorsOf } from './library.mjs';
import { lintHook, lintLine, lintEnd, lintString, errorsOf } from './lint-copy.mjs';
import { stream, seedOf } from './rng.mjs';
import { fingerprint, specId, visibleSlots } from './fingerprint.mjs';
import { canonical, sha256Hex, hashOf } from './canonical.mjs';
import { usedFingerprints } from './ledger.mjs';
import { channelContext, recordPlanned, checkSchedule, copyBlock, closerRunBlocked, sequenceFilter, dayNumber, dateOfDay, cadenceCap } from './schedule.mjs';
import { POLICY_FILE } from './policy.mjs';
import { TURN_MOVES } from './capabilities.mjs';

export const PLANNER_VERSION = '1.0.0';
const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
const firstWord = (l) => (l.match(/[A-Za-z0-9']+/) || [''])[0].toLowerCase();
const questions = (l) => (l.match(/\?/g) || []).length;

/** Gag intensity cap of a template: min(1, tone cap, template cap). */
export function intensityCap(t, policy) {
  const I = policy.intensity;
  return Math.min(1, I.byTone[t.feeling.tone] ?? 1, I.byTemplate[t.id]?.cap ?? 1);
}

/** Pack/preset pins: { file, sha256 } (sha256 null while the file does not exist yet). */
const pinCache = new Map();
function pinOf(file) {
  if (!file) return { file: null, sha256: null };
  if (!pinCache.has(file)) {
    const abs = studioPath(file);
    pinCache.set(file, fs.existsSync(abs) ? sha256Hex(fs.readFileSync(abs)) : null);
  }
  return { file, sha256: pinCache.get(file) };
}
let policySha = null;
const policySha256 = () => (policySha ||= sha256Hex(fs.readFileSync(POLICY_FILE)));

/** Throw on a constraint value the library does not know (a typo must not read as "nothing plannable"). */
export function validateConstraints(constraints, lib) {
  const known = {
    template: [...lib.templates.keys()].flatMap((id) => [id, id.split('-')[0]]), mallow: lib.MALLOWS,
    tod: [...new Set(lib.MALLOWS.flatMap((m) => lib.raw.mallows[m].tods))], duration: Object.keys(lib.clocks),
    gag: lib.ids.gags, metaphor: lib.ids.metaphors, ritual: lib.ids.rituals, camera: lib.ids.cameras, turn: TURN_MOVES, weather: null,
  };
  for (const [k, vals] of Object.entries(constraints)) {
    if (!(k in known)) throw new Error(`unknown constraint "${k}" (have: ${Object.keys(known).join(', ')})`);
    if (!known[k]) continue;
    const bad = [].concat(vals).filter((v) => !known[k].includes(String(v)));
    if (bad.length) throw new Error(`unknown ${k} ${bad.join(', ')} (the library has: ${known[k].filter((x) => !/^T\d\d-/.test(x) || k !== 'template').join(', ')})`);
  }
}

/**
 * Everything the sampler can choose from, after capability gating and the
 * user's constraints, per template and Mallow. Copy is filtered later, per
 * (time of day, duration), through the lint.
 */
export function buildOptions({ lib, caps, policy, mode = 'production', constraints = {} }) {
  validateConstraints(constraints, lib);
  const want = (key, v) => !constraints[key] || [].concat(constraints[key]).map(String).includes(String(v));
  const templates = [];
  for (const t of lib.templates.values()) {
    if (!want('template', t.id) && !want('template', t.id.split('-')[0])) continue;
    const combos = [];
    t.mallows.primary.concat(t.mallows.secondary).forEach((m) => {
      if (!want('mallow', m) || !caps.mallowOk(m) || t.mallows.avoid?.[m]) return;
      const realm = lib.raw.mallows[m].realm;
      if (!caps.realmOk(realm)) return;
      const cell = (id) => caps.cellOk(id, m, mode);
      const tods = lib.todsFor(t, m).filter((x) => caps.todOk(realm, x) && want('tod', x));
      const durations = t.durations.filter((d) => caps.durationOk(realm, d) && want('duration', d));
      const gags = gagsOf(t).filter((g) => lib.gags[g] && lib.whoCan(lib.gags[g]).includes(m) && cell(g) && want('gag', g));
      const metaphors = metaphorsOf(t).filter((x) => cell(x) && want('metaphor', x));
      const cameras = t.camera.filter((x) => cell(x) && want('camera', x));
      const turns = caps.movesOfKind('turn', m, mode).filter((x) => want('turn', x));
      const weather = caps.weather(realm).filter((x) => want('weather', x));
      const ritualsByDuration = {};
      for (const d of durations) {
        ritualsByDuration[d] = ritualsOf(t).filter((r) => lib.rituals[r] && lib.whoCan(lib.rituals[r]).includes(m) &&
          lib.rituals[r].minDur <= lib.ritualWindow(d) + 1e-6 && cell(r) && want('ritual', r));
      }
      const okDurations = durations.filter((d) => ritualsByDuration[d].length);
      const loopOk = cell(t.loop.strategy), arcOk = cell(t.palette);
      if (!tods.length || !okDurations.length || !gags.length || !metaphors.length || !cameras.length || !turns.length || !weather.length || !loopOk || !arcOk) return;
      const primary = t.mallows.primary.includes(m);
      combos.push({ m, realm, primary, tods, durations: okDurations, gags, metaphors, cameras, turns, weather, ritualsByDuration });
    });
    if (combos.length) templates.push({ t, combos });
  }
  return { templates, mode, constraints };
}

/**
 * Narrow the options to what the channel's sequencing rules allow for the
 * next post (constraint-guided sampling: retries are spent on copy and
 * distance, not on picks the rules exclude anyway).
 * → { templates, blocked: { rule: count } }
 */
export function allowedOptions(opts, seq, hookFree = null) {
  if (!seq) return { templates: opts.templates, blocked: {} };
  const blocked = {};
  const why = (v) => { if (v) blocked[v.rule] = (blocked[v.rule] || 0) + 1; return !v; };
  const templates = [];
  for (const x of opts.templates) {
    if (!why(seq.template(x.t))) continue;
    if (hookFree && !why(hookFree(x.t))) continue;
    const combos = [];
    for (const c of x.combos) {
      if (!why(seq.mallow(c.m))) continue;
      const gags = c.gags.filter((g) => why(seq.gag(g)));
      const ritualsByDuration = Object.fromEntries(c.durations.map((d) => [d, c.ritualsByDuration[d].filter((r) => why(seq.ritual(r)))]));
      const durations = c.durations.filter((d) => ritualsByDuration[d].length);
      if (gags.length && durations.length) combos.push({ ...c, gags, durations, ritualsByDuration });
    }
    if (combos.length) templates.push({ t: x.t, combos });
  }
  return { templates, blocked };
}

/** Lint-clean copy pools for (template, mallow, tod, duration), cached per options object. */
function copyPools(opts, ctx, t, m, tod, d) {
  const key = `${t.id}|${m}|${tod}|${d}`;
  opts.copyCache ||= new Map();
  if (opts.copyCache.has(key)) return opts.copyCache.get(key);
  const lc = { lib: ctx.lib, policy: ctx.policy, tod, duration: d, metrics: ctx.metrics };
  const clean = (issues) => !errorsOf(issues).length;
  const pools = {
    hooks: hooksOf(t).filter((h) => clean(lintHook(h, lc))),
    lines: linePools(t).map((pool, k) => pool.filter((l) => clean(lintLine(l, k, lc)))),
    fourth: ctx.lib.clocks[d].L4 === undefined ? [] : [...new Set(linePools(t).flat())].filter((l) => clean(lintLine(l, 3, lc))),
    resolutions: resolutionsOf(t).filter((r) => (!r.only || r.only.includes(m)) && clean(lintEnd(r.lines, lc))).map((r) => r.lines),
    closers: ctx.lib.raw.brand.closers.filter((c) => clean(lintEnd(c, lc))),
    nameWords: (t.nameWords || []).filter((w) => clean(lintString(w, 'name-word', { lib: ctx.lib, policy: ctx.policy }))),
  };
  opts.copyCache.set(key, pools);
  return pools;
}

/**
 * Sample one candidate spec from `seed`. → { spec } or { fail: '<slot>' }.
 * ctx: { lib, caps, policy, opts, mode, batch, index, quality, plannedFor, channel, sctx, weight }
 */
export function sampleSpec(seed, ctx) {
  const { lib, caps, policy, opts } = ctx;
  const P = policy.sampling;
  const S = (name) => stream(seed, name);
  const wmul = (slot, v) => (ctx.weight ? ctx.weight(slot, v) : 1);
  const weighted = (r, items, base) => r.pick(items, items.map((x, i) => base(x, i)));
  const choices = ctx.allowed ? ctx.allowed.templates : opts.templates;
  if (!choices.length) {
    const top = Object.entries(ctx.allowed?.blocked || {}).sort((a, b) => b[1] - a[1])[0];
    return { fail: top ? top[0] : 'no-template' };
  }
  const day = ctx.plannedFor ? dayNumber(ctx.plannedFor) : null;
  const avail = (kind, text) => !ctx.sctx || !copyBlock(kind, text, day, ctx.sctx, policy);

  // 1-2 template, Mallow (primary 3 : secondary 1)
  const T = weighted(S('template'), choices, (x) => wmul('template', x.t.id));
  const t = T.t;
  const C = weighted(S('mallow'), T.combos, (c) => (c.primary ? P.mallowWeight.primary : P.mallowWeight.secondary) * wmul('mallow', c.m));
  const m = C.m;
  // 3 time of day, duration (15 s takes half the mass)
  const tod = weighted(S('tod'), C.tods, (x) => wmul('tod', x));
  const others = C.durations.filter((d) => d !== 15).length;
  const duration = weighted(S('duration'), C.durations, (d) => (C.durations.includes(15) && others ? (d === 15 ? P.duration['15'] : P.duration.rest / others) : 1) * wmul('duration', d));
  // 4 gag: the Mallow's signature about 40% of the time where it is feasible
  const sig = lib.raw.mallows[m].signature?.gag;
  const gr = S('gag');
  let gag;
  if (C.gags.includes(sig) && C.gags.length > 1) gag = gr.chance(P.signatureGag.rate) ? sig : weighted(gr, C.gags.filter((g) => g !== sig), (g) => (g === t.gag.primary ? P.slotWeight.primary : P.slotWeight.alt) * wmul('gag', g));
  else gag = weighted(gr, C.gags, (g) => (g === t.gag.primary ? P.slotWeight.primary : P.slotWeight.alt) * wmul('gag', g));
  const cap = intensityCap(t, policy);
  const intensity = Math.max(0.05, Math.min(cap, r2(S('intensity').range(policy.intensity.low * cap, cap))));   // 2 decimals, never above the cap
  // 5 metaphor, turn, ritual (fits the window), camera; loop and arc are the template's
  const slotW = (primaryId, slot) => (x) => (x === primaryId ? P.slotWeight.primary : P.slotWeight.alt) * wmul(slot, x);
  const metaphor = weighted(S('metaphor'), C.metaphors, slotW(t.escalation.metaphor, 'metaphor'));
  const turn = weighted(S('turn'), C.turns, (x) => wmul('turn', x));
  const ritual = weighted(S('ritual'), C.ritualsByDuration[duration], slotW(t.ritual.primary, 'ritual'));
  const camera = weighted(S('camera'), C.cameras, slotW(t.camera[0], 'camera'));
  // world: weather and dressing from the realm's approved content only
  const weather = weighted(S('weather'), C.weather, (x) => wmul('weather', x));
  const dressing = pickDressing(S('dressing'), caps, C.realm, tod);

  // copy (lint-clean for this ToD and duration, minus cooldowns and reservations)
  const pools = copyPools(opts, ctx, t, m, tod, duration);
  const grief = policy.lint.griefPairing.filter((g) => g.template === t.id);
  const hooks = pools.hooks.filter((h) => avail('hook', h));
  if (!hooks.length) return { fail: 'copy:hook' };
  const hook = weighted(S('hook'), hooks, (h) => (grief.find((g) => g.hook.join(' ') === h.join(' '))?.hookWeight ?? 1) * wmul('hook', h.join(' / ')));
  const comic = grief.filter((g) => g.hook.join(' ') === hook.join(' ')).flatMap((g) => g.comicL3);
  const lines = pickLines(S('lines'), pools, comic, (l) => avail('line', l), P.fourthLine.rate);
  if (!lines) return { fail: 'copy:lines' };
  const er = S('end');
  const closers = pools.closers.filter((c) => avail('closer', c) && !(ctx.sctx && closerRunBlocked(day, ctx.sctx, policy)));
  const resolutions = pools.resolutions.filter((r) => avail('resolution', r));
  const wantCloser = er.chance(t.feeling.valence === 'positive' ? P.closer.positiveRate : P.closer.rate);
  let end;
  if ((wantCloser && closers.length) || (!resolutions.length && closers.length)) end = { kind: 'closer', text: er.pick(closers) };
  else if (resolutions.length) end = { kind: 'resolution', text: er.pick(resolutions) };
  else return { fail: 'copy:end' };
  let nameWord = null;
  if (ritual === 'R-NAMEIT') {
    const words = pools.nameWords.filter((w) => avail('nameWord', w));
    if (!words.length) return { fail: 'copy:nameWord' };
    nameWord = S('nameWord').pick(words);
  }

  // invisible slots: world jitter (world only, the Mallow is never recoloured) and sound
  const J = P.worldJitter, jr = S('worldJitter');
  const worldJitter = { hue: r2(jr.range(-J.hue, J.hue)), warmth: r3(jr.range(-J.warmth, J.warmth)), exposure: r3(jr.range(-J.exposure, J.exposure)) };
  const sr = S('sound');
  const sound = { motifs: [...t.sound.motifs], contour: sr.pick(P.sound.contours), tickTempo: r3(sr.range(P.sound.tickTempo[0], P.sound.tickTempo[1])), panSeed: sr.u32() };
  const moves = { gag, metaphor, turn, ritual, loop: t.loop.strategy, camera, arc: t.palette };
  const cells = Object.fromEntries(Object.values(moves).map((id) => [`${id}/${m}`, caps.cellStatus(id, m)]));

  const spec = {
    schema: 'hm-variant/1', id: null, batch: ctx.batch, index: ctx.index, mode: ctx.mode, internal: ctx.mode === 'review',
    quality: ctx.quality, channel: ctx.channel ?? null, plannedFor: ctx.plannedFor ?? null,
    template: t.id, mallow: m, realm: C.realm, tod, weather, dressing, duration, seed,
    gag: { id: gag, intensity }, metaphor, turn, ritual, loop: t.loop.strategy, camera, arc: t.palette,
    worldJitter,
    copy: { hook: [...hook], lines, end: { kind: end.kind, text: [...end.text] }, nameWord },
    sound, cells,
    pins: {
      library: lib.version, librarySha256: lib.sha256, capabilitiesSha256: caps.sha256, policySha256: policySha256(),
      packs: { [m]: pinOf(caps.packFile(m)), [C.realm]: pinOf(caps.presetFile(C.realm)) },
      engine: null,
    },
    fingerprint: null,
  };
  spec.fingerprint = fingerprint(spec);
  spec.id = specId(spec, spec.fingerprint);
  return { spec };
}

/** 0..maxItems dressing items from the realm's approved set, within the cost budget, sorted by id. */
function pickDressing(r, caps, realm, tod) {
  const items = caps.dressing(realm).filter((d) => !d.tods || d.tods.includes(tod));
  const budget = caps.dressingBudget(realm);
  const k = r.int(Math.min(budget.maxItems, items.length) + 1);
  const out = [];
  let cost = 0;
  const pool = [...items];
  while (out.length < k && pool.length) {
    const it = pool.splice(r.int(pool.length), 1)[0];
    if (cost + it.costMs > budget.maxCostMs) continue;
    cost += it.costMs;
    out.push({ id: it.id, variant: 1 + r.int(it.variants) });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** One line per slot (first words differ, <= 2 '?', grief pairing), plus an optional 4th at 20 s. */
function pickLines(r, pools, comicL3, available, fourthRate) {
  const [p0, p1, p2] = pools.lines.map((p) => p.filter(available));
  for (let tries = 0; tries < 20; tries++) {
    const l0 = r.pick(p0);
    if (l0 === undefined) return null;
    const c1 = p1.filter((l) => firstWord(l) !== firstWord(l0));
    const l1 = r.pick(c1);
    if (l1 === undefined) continue;
    const used = new Set([firstWord(l0), firstWord(l1)]);
    const q = questions(l0) + questions(l1);
    const c2 = p2.filter((l) => !used.has(firstWord(l)) && q + questions(l) <= 2 && !comicL3.includes(l));
    const l2 = r.pick(c2);
    if (l2 === undefined) continue;
    const lines = [l0, l1, l2];
    if (pools.fourth.length && r.chance(fourthRate)) {
      const fw = new Set(lines.map(firstWord));
      const qq = q + questions(l2);
      const c3 = pools.fourth.filter((l) => !lines.includes(l) && !fw.has(firstWord(l)) && qq + questions(l) <= 2 && available(l));
      const l3 = r.pick(c3);
      if (l3 !== undefined) lines.push(l3);
    }
    return lines;
  }
  return null;
}

/**
 * Plan a batch. Options:
 *   lib, caps, policy, ledger, metrics?     loaded inputs
 *   mode: 'review' | 'production'           review admits candidate cells, writes INTERNAL specs, skips posting rules
 *   count, seed (uint32), batch (id)
 *   channel, start ('YYYY-MM-DD'), perWeek   production only: posts are planned on start + floor(i*7/perWeek)
 *   constraints { template, mallow, tod, duration, gag, metaphor, ritual, camera, turn, weather }
 *   quality ('final'|'draft'|'proof'), distinct (review: no two specs with the same visible slots; default true)
 *   weight(slot, value) → multiplier (WP-25 LRU hook)
 * → { specs, failures, manifest }
 */
export function planBatch(o) {
  const { lib, caps, policy, ledger } = o;
  const mode = o.mode || 'production';
  if (!['review', 'production'].includes(mode)) throw new Error(`mode must be review|production, got ${mode}`);
  if (!Number.isInteger(o.seed) || o.seed < 0 || o.seed > 0xffffffff) throw new Error('seed must be a uint32');
  if (!Number.isInteger(o.count) || o.count < 1) throw new Error('count must be a positive integer');
  if (!o.batch) throw new Error('batch id required');
  const production = mode === 'production';
  if (production && (!o.channel || !o.start)) throw new Error('a production plan needs a channel and a start date');
  const opts = buildOptions({ lib, caps, policy, mode, constraints: o.constraints || {} });
  const quality = o.quality || 'final';
  const cap = cadenceCap(caps.unlocked().length, policy);
  const perWeek = production ? Math.min(o.perWeek || cap, cap) : null;
  const startDay = production ? dayNumber(o.start) : null;
  const used = usedFingerprints(ledger);
  const newContext = (accepted) => (production ? channelContext({ ledger, channel: o.channel, batch: o.batch, batchSpecs: accepted, lib, caps }) : null);
  let sctx = newContext([]);
  const distinct = o.distinct !== false;
  const seenFp = new Set(), seenVisible = new Set(), seenIds = new Set();
  const specs = [], failures = [];
  const retries = policy.sampling.retries.perSpec;
  const maxBacktrack = production ? policy.sampling.retries.backtrack : 0;
  const round = new Array(o.count).fill(0);           // attempt-seed round per index (bumped when backtracking)
  let backtracks = 0;

  for (let i = 0; i < o.count;) {
    const plannedFor = production ? dateOfDay(startDay + Math.floor((i * 7) / perWeek)) : null;
    const day = production ? dayNumber(plannedFor) : null;
    // freshness: a template is weighted by the share of its hooks that are not cooling
    // down, so scarce templates (e.g. the few positive/mixed ones the valence rule
    // needs) are not spent early. WP-25's least-recently-used weights refine this.
    const freeShare = new Map();
    if (production) for (const x of opts.templates) { const hs = hooksOf(x.t); freeShare.set(x.t.id, hs.filter((h) => !copyBlock('hook', h, day, sctx, policy)).length / hs.length); }
    const hookFree = (t) => (freeShare.get(t.id) > 0 ? null : { rule: 'copy:hook', message: `every ${t.id} hook is cooling down` });
    const allowed = production ? allowedOptions(opts, sequenceFilter(sctx, day, { policy }), hookFree) : null;
    const weight = production ? (slot, v) => (slot === 'template' ? freeShare.get(v) : 1) * (o.weight ? o.weight(slot, v) : 1) : o.weight;
    const ctx = { lib, caps, policy, opts, allowed, mode, batch: o.batch, index: i, quality, plannedFor, channel: production ? o.channel : null, sctx, weight, metrics: o.metrics };
    const blocked = {};
    const block = (rule) => { blocked[rule] = (blocked[rule] || 0) + 1; };
    let accepted = null;
    for (let a = 0; a < retries && !accepted; a++) {
      const r = sampleSpec(seedOf(o.seed, i, round[i] * retries + a), ctx);
      if (r.fail) { block(r.fail); continue; }
      const s = r.spec;
      if (used.has(s.fingerprint) || seenFp.has(s.fingerprint)) { block('fingerprint-used'); continue; }
      if (seenIds.has(s.id)) { block('id-collision'); continue; }     // 6 hex digits collide in big batches: ids must name one folder
      if (!production && distinct) {
        const key = canonical(visibleSlots(s));
        if (seenVisible.has(key)) { block('duplicate-visible'); continue; }
      }
      if (production) {
        const v = checkSchedule(s, sctx, { lib, policy });
        if (v.length) { for (const rule of new Set(v.map((x) => x.rule))) block(rule); continue; }
      }
      accepted = s;
    }
    if (!accepted) {
      // a greedy dead end (a window rule no remaining option can meet): re-plan the
      // previous post with fresh attempt seeds, a bounded number of times
      if (i > 0 && backtracks < maxBacktrack) {
        backtracks++;
        round[i] = 0;
        const undone = specs.pop();
        seenFp.delete(undone.fingerprint);
        seenIds.delete(undone.id);
        seenVisible.delete(canonical(visibleSlots(undone)));
        sctx = newContext(specs);
        i--;
        round[i]++;
        continue;
      }
      failures.push({ index: i, plannedFor, attempts: retries, backtracks, blockedBy: blocked });
      break;
    }
    specs.push(accepted);
    seenFp.add(accepted.fingerprint);
    seenIds.add(accepted.id);
    seenVisible.add(canonical(visibleSlots(accepted)));
    if (sctx) recordPlanned(sctx, accepted, lib);
    i++;
  }

  const manifest = {
    schema: 'hm-plan/1', planner: PLANNER_VERSION, batch: o.batch, mode, seed: o.seed, count: o.count, planned: specs.length,
    channel: production ? o.channel : null, start: production ? o.start : null, perWeek, backtracks,
    constraints: o.constraints || {}, quality,
    pins: { library: lib.version, librarySha256: lib.sha256, capabilitiesSha256: caps.sha256, policySha256: policySha256() },
    plannable: opts.templates.map((x) => ({ template: x.t.id, mallows: x.combos.map((c) => c.m) })),
    // hash: the whole spec as planned (planner/integrity.mjs: approve and export refuse a spec edited after planning)
    specs: specs.map((s) => ({ id: s.id, index: s.index, plannedFor: s.plannedFor, template: s.template, mallow: s.mallow, tod: s.tod, duration: s.duration, fingerprint: s.fingerprint, hash: hashOf(s) })),
    failures,
  };
  return { specs, failures, manifest };
}

/** Plan exactly one spec with pinned slots (hm spec new). → { spec } or { failure } */
export function planSpec(o) {
  const r = planBatch({ ...o, count: 1 });
  return r.specs.length ? { spec: r.specs[0], manifest: r.manifest } : { failure: r.failures[0] || { blockedBy: { 'no-template': 1 } }, manifest: r.manifest };
}
