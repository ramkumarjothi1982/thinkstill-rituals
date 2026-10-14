// hm lib coverage: what the generator can build today, and what blocks the
// rest. For every template x cast Mallow it lists the open times of day and
// durations, the usable gags/metaphors/rituals/cameras, the copy that passes
// the lint, and, for blocked pairs, each missing capability by name.

import { castOf, gagsOf, ritualsOf, metaphorsOf, hooksOf, linePools, resolutionsOf } from './library.mjs';
import { buildOptions } from './pick.mjs';
import { lintHook, lintLine, lintEnd, errorsOf } from './lint-copy.mjs';

/** Missing capabilities of (template, Mallow) in mode. → [reason] */
export function blockersOf(t, m, { lib, caps, mode }) {
  const out = [];
  const realm = lib.raw.mallows[m].realm;
  if (!caps.mallowOk(m)) out.push(`pack ${m}: ${caps.reason('mallow', m)}`);
  if (!caps.realmOk(realm)) out.push(`realm ${realm}: ${caps.reason('realm', realm)}`);
  else {
    const tods = lib.todsFor(t, m);
    if (!tods.some((x) => caps.todOk(realm, x))) out.push(`ToD: none of ${tods.join('/')} approved in ${realm}`);
    if (!t.durations.some((d) => caps.durationOk(realm, d))) out.push(`duration: none of ${t.durations.join('/')} s approved in ${realm}`);
  }
  const need = (label, ids) => { if (!ids.some((id) => caps.cellOk(id, m, mode))) out.push(`${label}: no ${mode === 'review' ? 'candidate/approved' : 'approved'} cell among ${ids.join(', ')}`); };
  need('gag', gagsOf(t).filter((g) => lib.gags[g] && lib.whoCan(lib.gags[g]).includes(m)));
  need('metaphor', metaphorsOf(t));
  need('ritual', ritualsOf(t).filter((r) => lib.rituals[r] && lib.whoCan(lib.rituals[r]).includes(m)));
  need('camera', t.camera);
  need('loop', [t.loop.strategy]);
  need('arc', [t.palette]);
  if (!caps.movesOfKind('turn', m, mode).length) out.push('turn: no turn move enabled');
  return out;
}

/** → { mode, plannable: n, templates: [{ id, title, plannable, mallows: [{ m, ok, tods, durations, gags, ..., copy, blockers }] }] } */
export function coverageReport({ lib, caps, policy, mode = 'production' }) {
  const opts = buildOptions({ lib, caps, policy, mode });
  const byTemplate = new Map(opts.templates.map((x) => [x.t.id, new Map(x.combos.map((c) => [c.m, c]))]));
  const templates = [];
  for (const t of lib.templates.values()) {
    const rows = castOf(t).filter((m) => !t.mallows.avoid?.[m]).map((m) => {
      const c = byTemplate.get(t.id)?.get(m);
      if (!c) return { m, ok: false, blockers: blockersOf(t, m, { lib, caps, mode }) };
      // copy that passes the lint in at least one open (ToD, duration)
      const ctxs = c.tods.flatMap((tod) => c.durations.map((duration) => ({ lib, policy, tod, duration })));
      const okIn = (fn) => ctxs.some((ctx) => !errorsOf(fn(ctx)).length);
      const copy = {
        hooks: hooksOf(t).filter((h) => okIn((ctx) => lintHook(h, ctx))).length,
        lines: linePools(t).map((pool, k) => pool.filter((l) => okIn((ctx) => lintLine(l, k, ctx))).length),
        resolutions: resolutionsOf(t).filter((r) => (!r.only || r.only.includes(m)) && okIn((ctx) => lintEnd(r.lines, ctx))).length,
      };
      return { m, ok: true, tods: c.tods, durations: c.durations, gags: c.gags, metaphors: c.metaphors, rituals: [...new Set(Object.values(c.ritualsByDuration).flat())], cameras: c.cameras, turns: c.turns, copy };
    });
    templates.push({ id: t.id, title: t.title, plannable: rows.some((r) => r.ok), mallows: rows });
  }
  return { mode, plannable: templates.filter((x) => x.plannable).length, templates };
}

/** Plain-text table of a coverage report. */
export function formatCoverage(rep, { all = false } = {}) {
  const lines = [`${rep.plannable}/${rep.templates.length} templates plannable in ${rep.mode} mode`];
  for (const t of rep.templates) {
    if (!t.plannable && !all) continue;
    lines.push(`${t.plannable ? 'OK     ' : 'blocked'} ${t.id}  (${t.title})`);
    for (const r of t.mallows) {
      if (r.ok) lines.push(`          ${r.m.padEnd(7)} ToD ${r.tods.join('/')} | ${r.durations.join('/')} s | gag ${r.gags.join(',')} | ritual ${r.rituals.join(',')} | hooks ${r.copy.hooks}, lines ${r.copy.lines.join('/')}, resolutions ${r.copy.resolutions}`);
      else if (all) lines.push(`          ${r.m.padEnd(7)} ${r.blockers.join('; ')}`);
    }
  }
  if (!all) lines.push(`(${rep.templates.length - rep.plannable} blocked templates hidden; --all shows what blocks each)`);
  return lines.join('\n');
}
