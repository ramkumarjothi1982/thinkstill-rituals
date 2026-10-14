// From checks to a gate verdict, and from gates to a report verdict. One place
// for the rules, so every gate (Node or Python) is judged the same way:
//
//   a check      { status: pass | warn | fail | not-run, value, limit, detail, reportOnly? }
//   a gate       fails when any check fails; did not run (pass: null) when a
//                required check did not run and none failed; otherwise passes.
//                warn: true when any check warned. reportOnly checks are shown
//                but never decide the gate.
//   the report   'fail' when any gate failed, 'incomplete' (pass: null) when a
//                gate did not run, else 'pass' - the shape planner/compile.mjs
//                uses for compile.json, so pass: true always means "every gate
//                ran and passed" (planner/export.mjs qaProblems relies on it).

export const STATUS = Object.freeze(['pass', 'warn', 'fail', 'not-run']);

/** A check record. */
export const check = (status, value = null, limit = null, detail = '', extra = {}) => ({ status, value, limit, detail, ...extra });
export const notRun = (detail) => check('not-run', null, null, detail);

/** Gate verdict from its checks. → { pass, warn, status, checks, ...extra } */
export function gate(checks, extra = {}) {
  const all = Object.entries(checks || {});
  for (const [k, c] of all) if (!STATUS.includes(c?.status)) throw new Error(`check ${k}: bad status ${c?.status}`);
  const decide = all.filter(([, c]) => !c.reportOnly);
  const failed = decide.filter(([, c]) => c.status === 'fail').map(([k]) => k);
  const missing = decide.filter(([, c]) => c.status === 'not-run').map(([k]) => k);
  const warned = all.filter(([, c]) => c.status === 'warn').map(([k]) => k);
  let pass, status;
  if (!decide.length) { pass = null; status = 'not-run'; }
  else if (failed.length) { pass = false; status = 'fail'; }
  else if (missing.length) { pass = null; status = 'not-run'; }
  else { pass = true; status = 'pass'; }
  return { pass, warn: warned.length > 0, status, failed, notRun: missing, warned, checks, ...extra };
}

/** A gate that could not run at all. */
export const notRunGate = (reason, extra = {}) => ({ pass: null, warn: false, status: 'not-run', reason, failed: [], notRun: [], warned: [], checks: {}, ...extra });

/** Report verdict from its gates. → { status, pass, failed, pending, warnings } */
export function reportVerdict(gates) {
  const all = Object.entries(gates);
  const failed = all.filter(([, g]) => g.pass === false).map(([k]) => k);
  const pending = all.filter(([, g]) => g.pass !== true && g.pass !== false).map(([k]) => k);
  const warnings = all.filter(([, g]) => g.warn).map(([k]) => k);
  if (failed.length) return { status: 'fail', pass: false, failed, pending, warnings };
  if (pending.length) return { status: 'incomplete', pass: null, failed, pending, warnings };
  return { status: 'pass', pass: true, failed, pending, warnings };
}
