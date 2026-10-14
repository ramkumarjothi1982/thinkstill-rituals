// G-SPEC (PHASE2-PLAN QA gates): judge a variant spec on its own, however it
// was produced (planner, hand edit, old batch). Milliseconds per spec.
//
//   - schema valid (planner/schema/hm-variant-1.schema.json) and every slot legal
//     for its template, Mallow, realm, time of day and duration;
//   - every move cell, Mallow pack and realm/ToD/duration preset enabled
//     (approved; review specs may use candidate cells), and spec.cells current;
//   - copy comes from the library and is lint-clean (planner/lint-copy.mjs);
//   - the ritual's minimum duration fits its window;
//   - fingerprint and id recompute; the fingerprint was never used before;
//   - production specs: sequencing, cooldowns, reservations, cadence and
//     distance hold against the channel's ledger and the batch's earlier posts;
//   - pins: library version, pack/preset hashes, and asset hashes against
//     library/assets-manifest.json once it exists.
//
// → { gate: 'G-SPEC', pass, errors: [{rule, message}], warnings: [...], metrics }

import fs from 'node:fs';
import path from 'node:path';
import { studioPath } from '../render/lib/paths.mjs';
import { castOf, hooksOf, linePools, resolutionsOf, gagsOf, ritualsOf, metaphorsOf } from './library.mjs';
import { validateSpecShape } from './spec-schema.mjs';
import { lintCopy } from './lint-copy.mjs';
import { fingerprint, specId } from './fingerprint.mjs';
import { sha256Hex } from './canonical.mjs';
import { usedFingerprints } from './ledger.mjs';
import { channelContext, checkSchedule } from './schedule.mjs';
import { TURN_MOVES } from './capabilities.mjs';
import { intensityCap } from './pick.mjs';
import { POLICY_FILE } from './policy.mjs';

export const ASSETS_MANIFEST = studioPath('library', 'assets-manifest.json');
let policyShaCache = null;
const policyFileSha = () => (policyShaCache ||= sha256Hex(fs.readFileSync(POLICY_FILE)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * ctx: { lib, caps, policy, ledger, batchSpecs? (the batch's other specs),
 *        assetsManifest? (path; default library/assets-manifest.json) }
 */
export function checkSpec(spec, ctx) {
  const t0 = process.hrtime.bigint();
  const errors = [], warnings = [];
  const err = (rule, message) => errors.push({ rule, message });
  const warn = (rule, message) => warnings.push({ rule, message });
  const done = () => ({ gate: 'G-SPEC', pass: errors.length === 0, errors, warnings, metrics: { ms: Number(process.hrtime.bigint() - t0) / 1e6, errors: errors.length, warnings: warnings.length } });
  const { lib, caps, policy, ledger } = ctx;

  // 1. shape
  const shape = validateSpecShape(spec);
  if (shape.length) { for (const s of shape) err('schema', s); return done(); }

  // 2. slots legal for the template and Mallow
  const t = lib.template(spec.template);
  if (!t || t.id !== spec.template) { err('slot:template', `unknown template ${spec.template}`); return done(); }
  const m = spec.mallow;
  if (!lib.MALLOWS.includes(m)) { err('slot:mallow', `unknown Mallow ${m}`); return done(); }
  if (!castOf(t).includes(m)) err('slot:mallow', `${m} is not cast in ${t.id}`);
  if (t.mallows.avoid?.[m]) err('slot:mallow', `${m} is avoided in ${t.id}: ${t.mallows.avoid[m]}`);
  const realm = lib.raw.mallows[m].realm;
  if (spec.realm !== realm) err('slot:realm', `${m} lives in ${realm}, not ${spec.realm} (no guest realms)`);
  if (!lib.todsFor(t, m).includes(spec.tod)) err('slot:tod', `ToD ${spec.tod} is not open to ${m} in ${t.id} (${lib.todsFor(t, m).join(', ')})`);
  if (!t.durations.includes(spec.duration)) err('slot:duration', `${spec.duration} s is not a duration of ${t.id}`);
  const g = spec.gag.id;
  if (!gagsOf(t).includes(g)) err('slot:gag', `${g} is not a gag of ${t.id}`);
  else if (!lib.whoCan(lib.gags[g]).includes(m)) err('slot:gag', `${m} cannot perform ${g}`);
  const cap = intensityCap(t, policy);
  if (spec.gag.intensity > cap + 1e-9) err('slot:intensity', `gag intensity ${spec.gag.intensity} exceeds the ${t.id} cap ${cap}`);
  if (!metaphorsOf(t).includes(spec.metaphor)) err('slot:metaphor', `${spec.metaphor} is not a metaphor of ${t.id}`);
  if (!TURN_MOVES.includes(spec.turn)) err('slot:turn', `${spec.turn} is not a turn move`);
  if (!ritualsOf(t).includes(spec.ritual)) err('slot:ritual', `${spec.ritual} is not a ritual of ${t.id}`);
  else {
    const r = lib.rituals[spec.ritual];
    if (!lib.whoCan(r).includes(m)) err('slot:ritual', `${m} cannot perform ${spec.ritual}`);
    if (lib.clocks[spec.duration] && r.minDur > lib.ritualWindow(spec.duration) + 1e-6) err('ritual-window', `${spec.ritual} needs >= ${r.minDur} s; the ${spec.duration} s ritual window is ${lib.ritualWindow(spec.duration).toFixed(2)} s`);
  }
  if (spec.loop !== t.loop.strategy) err('slot:loop', `${t.id} loops with ${t.loop.strategy}, not ${spec.loop}`);
  if (!t.camera.includes(spec.camera)) err('slot:camera', `${spec.camera} is not a camera of ${t.id}`);
  if (spec.arc !== t.palette) err('slot:arc', `${t.id} uses the arc ${t.palette}, not ${spec.arc}`);
  if (!same(spec.sound.motifs, t.sound.motifs)) err('slot:sound', `sound motifs must be the template's (${t.sound.motifs.join(', ')})`);
  const P = policy.sampling;
  if (!P.sound.contours.includes(spec.sound.contour)) err('slot:sound', `unknown contour ${spec.sound.contour}`);
  if (spec.sound.tickTempo < P.sound.tickTempo[0] - 1e-9 || spec.sound.tickTempo > P.sound.tickTempo[1] + 1e-9) err('slot:sound', `tick tempo ${spec.sound.tickTempo} outside ${P.sound.tickTempo.join('..')}`);
  for (const k of ['hue', 'warmth', 'exposure']) if (Math.abs(spec.worldJitter[k]) > P.worldJitter[k] + 1e-9) err('slot:jitter', `world jitter ${k} ${spec.worldJitter[k]} beyond +/-${P.worldJitter[k]}`);

  // 3. mode, channel and the INTERNAL mark
  if (spec.internal !== (spec.mode === 'review')) err('internal', 'review specs, and only review specs, carry the INTERNAL mark');
  if (spec.mode === 'production' && (!spec.channel || !spec.plannedFor)) err('mode', 'a production spec needs channel and plannedFor');
  if (spec.mode === 'review' && (spec.channel || spec.plannedFor)) err('mode', 'a review spec has no channel or plannedFor');

  // 4. capabilities (production: approved only; review: candidate cells too)
  if (!caps.mallowOk(m)) err('capability:pack', `Mallow pack ${m} is ${caps.mallowStatus(m)} (${caps.reason('mallow', m)})`);
  if (!caps.realmOk(realm)) err('capability:preset', `realm preset ${realm} is not approved (${caps.reason('realm', realm)})`);
  else {
    if (!caps.todOk(realm, spec.tod)) err('capability:tod', `${realm} ToD ${spec.tod} is not approved`);
    if (!caps.durationOk(realm, spec.duration)) err('capability:duration', `${realm} does not loop at ${spec.duration} s yet (not approved)`);
    if (!caps.weather(realm).includes(spec.weather)) err('capability:weather', `weather ${spec.weather} is not approved for ${realm}`);
    const items = new Map(caps.dressing(realm).map((d) => [d.id, d]));
    const budget = caps.dressingBudget(realm);
    let cost = 0;
    for (const d of spec.dressing) {
      const it = items.get(d.id);
      if (!it) { err('capability:dressing', `dressing ${d.id} is not approved for ${realm}`); continue; }
      if (it.tods && !it.tods.includes(spec.tod)) err('capability:dressing', `dressing ${d.id} is not used at ${spec.tod}`);
      if (d.variant > it.variants) err('capability:dressing', `dressing ${d.id} has ${it.variants} variant(s)`);
      cost += it.costMs;
    }
    if (spec.dressing.length > budget.maxItems || cost > budget.maxCostMs) err('capability:dressing', `dressing over budget (${spec.dressing.length} items, ${cost} ms; max ${budget.maxItems}, ${budget.maxCostMs} ms)`);
    if (new Set(spec.dressing.map((d) => d.id)).size !== spec.dressing.length) err('capability:dressing', 'dressing repeats an item');
  }
  const moves = [g, spec.metaphor, spec.turn, spec.ritual, spec.loop, spec.camera, spec.arc];
  const wantCells = Object.fromEntries(moves.map((id) => [`${id}/${m}`, caps.cellStatus(id, m)]));
  for (const id of moves) if (!caps.cellOk(id, m, spec.mode)) err('capability:cell', `cell ${id}/${m} is ${caps.cellStatus(id, m)}; ${spec.mode} specs need ${spec.mode === 'review' ? 'candidate or approved' : 'approved'}`);
  if (!same(Object.keys(spec.cells).sort(), Object.keys(wantCells).sort())) err('cells', `spec.cells must list exactly ${Object.keys(wantCells).join(', ')}`);
  else for (const [k, v] of Object.entries(wantCells)) if (spec.cells[k] !== v) err('cells', `cell ${k} was ${spec.cells[k]} at plan time, is ${v} now`);

  // 5. copy: from the library, lint-clean in context
  const c = spec.copy;
  if (!hooksOf(t).some((h) => same(h, c.hook))) err('copy:hook', `hook "${c.hook.join(' / ')}" is not a ${t.id} hook`);
  const pools = linePools(t);
  c.lines.slice(0, 3).forEach((l, k) => { if (!pools[k].includes(l)) err('copy:lines', `line ${k + 1} "${l}" is not in the ${t.id} L${k + 1} pool`); });
  if (c.lines.length === 4) {
    if (lib.clocks[spec.duration]?.L4 === undefined) err('copy:lines', `a 4th line needs a clock with an L4 beat (not ${spec.duration} s)`);
    if (!pools.flat().includes(c.lines[3])) err('copy:lines', `line 4 "${c.lines[3]}" is not a ${t.id} pool line`);
  }
  if (new Set(c.lines).size !== c.lines.length) err('copy:lines', 'a line repeats');
  if (c.end.kind === 'resolution') {
    const r = resolutionsOf(t).find((x) => same(x.lines, c.end.text));
    if (!r) err('copy:end', `resolution "${c.end.text.join(' / ')}" is not a ${t.id} resolution`);
    else if (r.only && !r.only.includes(m)) err('copy:end', `resolution "${c.end.text.join(' / ')}" is only for ${r.only.join(', ')}`);
  } else if (!lib.raw.brand.closers.some((x) => same(x, c.end.text))) err('copy:end', `closer "${c.end.text.join(' / ')}" is not a brand closer`);
  if (spec.ritual === 'R-NAMEIT') { if (!(t.nameWords || []).includes(c.nameWord)) err('copy:nameWord', `R-NAMEIT needs one of ${t.id}'s nameWords`); }
  else if (c.nameWord !== null) err('copy:nameWord', 'nameWord is only set with R-NAMEIT');
  for (const i of lintCopy(c, { lib, policy, template: t.id, tod: spec.tod, duration: spec.duration, metrics: ctx.metrics })) {
    (i.severity === 'error' ? err : warn)(`lint:${i.rule}`, `${i.where}: ${i.message}`);
  }

  // 6. identity and uniqueness
  const fp = fingerprint(spec);
  if (spec.fingerprint !== fp) err('fingerprint', `fingerprint does not match the visible slots and seed (expected ${fp})`);
  if (spec.id !== specId(spec, fp)) err('id', `id should be ${specId(spec, fp)}`);
  const users = usedFingerprints(ledger).get(fp);
  if (users && [...users].some((id) => id !== spec.id)) err('fingerprint-used', `fingerprint already used by ${[...users].filter((id) => id !== spec.id).join(', ')}`);
  const twins = (ctx.batchSpecs || []).filter((s) => s.fingerprint === fp && s.id !== spec.id);
  if (twins.length) err('fingerprint-used', `same fingerprint as ${twins.map((s) => s.id).join(', ')} in this batch`);
  if ((ctx.batchSpecs || []).some((s) => s.id === spec.id && s.fingerprint !== spec.fingerprint)) err('id-collision', `another spec of this batch has the id ${spec.id}`);

  // 7. posting rules (production): the batch's earlier posts and the channel's ledger
  if (spec.mode === 'production' && spec.channel && spec.plannedFor) {
    const earlier = (ctx.batchSpecs || []).filter((s) => s.batch === spec.batch && s.index < spec.index && s.mode === 'production' && s.channel === spec.channel);
    const sctx = channelContext({ ledger, channel: spec.channel, batch: spec.batch, batchSpecs: earlier, lib, caps });
    for (const v of checkSchedule(spec, sctx, { lib, policy })) err(v.rule, v.message);
  }

  // 8. pins: library, policy, capability set, packs/presets, assets
  if (spec.pins.library !== lib.version) err('pins:library', `planned against library ${spec.pins.library}, current is ${lib.version}`);
  else if (spec.pins.librarySha256 !== lib.sha256) warn('pins:library', 'story-library.json changed since planning (same version); copy was re-checked above');
  if (caps.sha256 && spec.pins.capabilitiesSha256 !== caps.sha256) warn('pins:capabilities', 'capabilities changed since planning; gating was re-checked above');
  if (spec.pins.policySha256 !== policyFileSha()) warn('pins:policy', 'planner/policy.json changed since planning; copy and caps were re-checked above');
  for (const [id, pin] of Object.entries(spec.pins.packs)) {
    if (!pin.file) continue;
    const abs = studioPath(pin.file);
    const now = fs.existsSync(abs) ? sha256Hex(fs.readFileSync(abs)) : null;
    if (pin.sha256 && now !== pin.sha256) err('pins:pack', `${id} (${pin.file}) changed since planning`);
    else if (!pin.sha256 && now) warn('pins:pack', `${id} (${pin.file}) appeared after planning; re-plan to pin it`);
    else if (!now) warn('pins:pack', `${id} (${pin.file}) does not exist yet`);
  }
  const manifest = ctx.assetsManifest || ASSETS_MANIFEST;
  if (!fs.existsSync(manifest)) warn('assets-manifest-missing', `${path.relative(studioPath(), manifest)} does not exist yet: asset hashes not checked`);
  else for (const p of checkAssets(manifest, m)) err('assets', p);

  return done();
}

/**
 * Asset hashes of a Mallow against the manifest { files: { "<studio path>": "<sha256>" } }:
 * every listed file under assets/<mallow>/ must exist with that hash.
 */
const assetCache = new Map();
export function checkAssets(manifestFile, mallow) {
  const key = `${sha256Hex(fs.readFileSync(manifestFile))}|${mallow}`;     // per manifest content: asset hashing is the slow part
  if (!assetCache.has(key)) assetCache.set(key, assetProblems(manifestFile, mallow));
  return assetCache.get(key);
}

function assetProblems(manifestFile, mallow) {
  const problems = [];
  const man = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (!man.files || typeof man.files !== 'object') return [`${manifestFile}: expected { files: { path: sha256 } }`];
  const prefix = `assets/${mallow}/`;
  const mine = Object.entries(man.files).filter(([p]) => p.startsWith(prefix));
  if (!mine.length) problems.push(`no ${prefix} assets listed in the manifest`);
  for (const [p, want] of mine) {
    const abs = studioPath(p);
    if (!fs.existsSync(abs)) problems.push(`${p} is missing`);
    else if (sha256Hex(fs.readFileSync(abs)) !== want) problems.push(`${p} does not match its manifest hash`);
  }
  return problems;
}
