// The planner half of `hm lib validate` (the story-library validator runs
// first, unchanged): everything the planner reads must be well-formed and
// agree with the library before any plan is made.
//   - library/capabilities.json against the library ids and kinds;
//   - planner/policy.json (shape, regexes) and its intensity caps against
//     every "intensity <= x" / "capped at x" the library states in prose;
//   - the planner's restatement of the library validator
//     (planner/library-check.mjs) finds no error: the planner refuses to plan
//     from a library that fails it;
//   - every library string passes the planner's copy lint (context-free), and
//     its time words (library patterns intersected with clock times, the
//     validator's reading as the floor) still fit a time of day open to the
//     template's cast; a time-word exemption names a thought line only (the
//     validator time-checks hooks and end texts, so an exemption there would
//     let the planner accept what the validator rejects);
//   - policy.lint.clockTimes agrees with the library's own "N AM/PM" patterns;
//   - planner/metrics/fredoka-metrics.json matches the app's font file and the
//     current library (else re-run tools/font-metrics.mjs);
//   - library/brand.json parses and every owner hashtag passes the copy lint
//     (glued terms included); the spec schema and any ledger files parse.

import fs from 'node:fs';
import { HUSHMALLOW, studioPath } from '../render/lib/paths.mjs';
import { loadLibrary, hooksOf, linePools, resolutionsOf, castOf } from './library.mjs';
import { clockClasses } from './time-words.mjs';
import { loadPolicy } from './policy.mjs';
import { validateCapabilities, CAPABILITIES_FILE } from './capabilities.mjs';
import { lintHook, lintLine, lintEnd, lintString, errorsOf, timeClassesOf } from './lint-copy.mjs';
import { loadMetrics } from './text-metrics.mjs';
import { loadBrand } from './export.mjs';
import { specSchema } from './spec-schema.mjs';
import { readLedger, KINDS } from './ledger.mjs';
import { sha256Hex } from './canonical.mjs';
import { intensityCap } from './pick.mjs';
import { validatorFindings } from './library-check.mjs';

/** Intensity caps the library states in prose: { templateId: cap } (the smallest stated). */
export function statedIntensityCaps(lib) {
  const caps = {};
  const note = (id, v) => { caps[id] = Math.min(caps[id] ?? 1, v); };
  const re = /intensity\s*(?:<=|capped at)\s*(0?\.\d+|1(?:\.0+)?)/gi;
  for (const t of lib.templates.values()) {
    const text = JSON.stringify(t);
    for (const m of text.matchAll(re)) note(t.id, Number(m[1]));
  }
  // library-wide decisions name templates by topic ("Missing-someone and nostalgia ...")
  for (const d of lib.raw.medicalTherapyFlags.decisionsInThisLibrary) {
    for (const m of d.matchAll(re)) {
      for (const t of lib.templates.values()) {
        const label = t.id.replace(/^T\d+-/, '').replace(/-/g, '[- ]');
        if (new RegExp(label, 'i').test(d)) note(t.id, Number(m[1]));
      }
    }
  }
  return caps;
}

/** → { errors: [..], warnings: [..], info: [..] } */
export function validatePlannerInputs({ lib = loadLibrary(), capabilitiesFile = CAPABILITIES_FILE } = {}) {
  const errors = [], warnings = [], info = [];
  // the library validator, as the planner applies it before every plan
  const vf = validatorFindings(lib.raw);
  for (const e of vf.errors) errors.push(`library validator: ${e} (the planner refuses to plan from this library)`);
  if (!vf.errors.length) info.push(`library validator: the planner's restatement agrees (0 errors, ${vf.warnings.length} warning(s)); planning is allowed`);
  // capabilities
  try {
    const raw = JSON.parse(fs.readFileSync(capabilitiesFile, 'utf8'));
    const errs = validateCapabilities(raw, lib);
    errors.push(...errs.map((e) => `capabilities: ${e}`));
    if (!errs.length) {
      const approved = Object.entries(raw.moves || {}).flatMap(([id, mv]) => Object.entries(mv.cells || {}).filter(([, s]) => s === 'approved').map(([m]) => `${id}/${m}`));
      info.push(`capabilities: OK (${Object.values(raw.mallows).filter((m) => m.status === 'approved').length} Mallow pack(s), ${approved.length} approved cells)`);
    }
  } catch (e) { errors.push(`capabilities: ${e.message}`); }
  // policy and intensity caps
  let policy = null;
  try { policy = loadPolicy(); info.push('policy: OK'); } catch (e) { errors.push(`policy: ${e.message}`); }
  if (policy) {
    for (const [id, stated] of Object.entries(statedIntensityCaps(lib))) {
      const t = lib.template(id);
      const cap = intensityCap(t, policy);
      if (cap > stated + 1e-9) errors.push(`policy: ${id} intensity cap ${cap} is above the library's stated ${stated}`);
    }
    for (const id of Object.keys(policy.intensity.byTemplate)) if (!lib.template(id)) errors.push(`policy: intensity.byTemplate names unknown template ${id}`);
    const hooksAndEnds = new Set([...lib.templates.values()].flatMap((t) => [...hooksOf(t).map((h) => h.join(' ')), ...resolutionsOf(t).map((r) => r.lines.join(' '))]));
    for (const x of policy.lint.timeWordExemptions) {
      if (hooksAndEnds.has(x.text)) errors.push(`policy: lint.timeWordExemptions "${x.text}" is a hook or end text; the library validator time-checks those, so only a thought line may be exempted`);
    }
    for (const g of policy.lint.griefPairing) {
      const t = lib.template(g.template);
      if (!t) { errors.push(`policy: griefPairing names unknown template ${g.template}`); continue; }
      if (!hooksOf(t).some((h) => h.join(' ') === g.hook.join(' '))) errors.push(`policy: griefPairing hook "${g.hook.join(' / ')}" is not a ${t.id} hook`);
      for (const l of g.comicL3) if (!linePools(t)[2].includes(l)) errors.push(`policy: griefPairing comic L3 "${l}" is not in ${t.id}'s L3 pool`);
    }
  }
  // copy lint over the whole library (context-free: ToD and duration are per spec)
  if (policy) {
    let n = 0;
    const flag = (where, issues) => { n++; for (const i of errorsOf(issues)) errors.push(`copy lint: ${where}: ${i.message}`); };
    for (const t of lib.templates.values()) {
      hooksOf(t).forEach((h, i) => flag(`${t.id} hook[${i}]`, lintHook(h, { lib, policy })));
      linePools(t).forEach((pool, k) => pool.forEach((l) => flag(`${t.id} L${k + 1}`, lintLine(l, k, { lib, policy }))));
      resolutionsOf(t).forEach((r, i) => flag(`${t.id} resolution[${i}]`, lintEnd(r.lines, { lib, policy })));
      (t.nameWords || []).forEach((w) => flag(`${t.id} nameWord`, lintString(w, 'name-word', { lib, policy })));
    }
    lib.raw.brand.closers.forEach((c, i) => flag(`brand.closers[${i}]`, lintEnd(c, { lib, policy })));
    info.push(`copy lint: ${n} library texts checked`);
    // time words: the planner's reading (library patterns ∩ clock times) must leave a cast ToD open
    let timed = 0;
    for (const t of lib.templates.values()) {
      const open = new Set(castOf(t).flatMap((m) => lib.todsFor(t, m)));
      const texts = [...hooksOf(t).map((h) => h.join(' ')), ...linePools(t).flat(), ...resolutionsOf(t).map((r) => r.lines.join(' '))];
      for (const x of texts) {
        const allowed = timeClassesOf(x, { lib, policy });
        if (!allowed) continue;
        timed++;
        if (!allowed.some((c) => open.has(c))) errors.push(`time words: "${x}" (${t.id}) fits no time of day open to its cast (${[...open].join(', ')}); allowed ${allowed.join('|') || 'none'}`);
      }
    }
    // the clock-hour table agrees with every "N AM" / "N PM" the library itself maps
    const hours = policy.lint.clockTimes.hours;
    let agreed = 0;
    for (let h = 1; h <= 12; h++) {
      for (const ap of ['AM', 'PM']) {
        const text = `AT ${h} ${ap}`;
        const fromLib = lib.timeClasses(text);
        if (!fromLib) continue;
        const fromClock = clockClasses(text, hours);
        if (JSON.stringify([...fromLib].sort()) !== JSON.stringify([...fromClock].sort())) errors.push(`policy: lint.clockTimes maps ${h} ${ap} to ${fromClock.join('|')}, the library's timeWords to ${fromLib.join('|')}`);
        else agreed++;
      }
    }
    info.push(`time words: ${timed} library texts name a time, all fit their cast; clock table agrees with the library on ${agreed} spelled hours`);
  }
  // Fredoka metrics
  try {
    const m = loadMetrics();
    const font = `${HUSHMALLOW}/assets/fonts/fredoka-latin.woff2`;
    if (m.font.sha256 !== sha256Hex(fs.readFileSync(font))) errors.push('metrics: the app font changed; re-run node tools/font-metrics.mjs');
    if (m.libraryCheck?.librarySha256 !== lib.sha256) warnings.push('metrics: measured against an older story library; re-run node tools/font-metrics.mjs to re-check the model error');
    if (policy && m.libraryCheck && m.libraryCheck.maxRelErrorPct >= ((policy.layout.margin - 1) * 100) / 2) errors.push(`metrics: model error ${m.libraryCheck.maxRelErrorPct}% is not below half the layout margin`);
    info.push(`metrics: OK (model error ${m.libraryCheck?.maxRelErrorPct}% on ${m.libraryCheck?.strings} strings)`);
  } catch (e) { errors.push(`metrics: ${e.message}`); }
  // brand, schema, ledger
  try { const b = loadBrand(undefined, { lib, policy }); info.push(`brand: OK (${b.hashtags.list.length} owner hashtags, each passing the copy lint inside its glued words)`); } catch (e) { errors.push(`brand: ${e.message}`); }
  try { specSchema(); } catch (e) { errors.push(`spec schema: ${e.message}`); }
  for (const kind of Object.keys(KINDS)) {
    try { readLedger(kind); } catch (e) { errors.push(`ledger: ${e.message}`); }
  }
  if (!fs.existsSync(studioPath('ledger', 'README.md'))) warnings.push('ledger: README.md missing');
  return { errors, warnings, info };
}
