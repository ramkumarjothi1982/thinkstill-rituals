// G-FINAL brand: the DRAFT/INTERNAL mark is burned in if and only if the video
// is not for publishing, the end card is the resolution line or a brand closer
// (never both), and there are no '!' effects.
//
//   mark     expected when the spec is internal (review) or draft quality, when
//            QA judges draft frames, or when the render was asked for a mark
//            (provenance params.mark); present when qa/gates/marks.py finds an
//            engine mark template in the corner (NCC). A render that names its
//            mark must show that label.
//   endCard  spec.copy.end.kind is exactly one of resolution | closer, with text
//   noBang   no '!' in the copy or the direction's overlay text (brand rule;
//            sweat and '!' effects are disabled in G-DIR)
// (Closer frequency, about 30 % and never 3 in a row, is a posting rule that
// G-SPEC's sequencing checks against the ledger.)

import { check, gate } from './verdict.mjs';

export function expectedMark(ctx) {
  const why = [];
  if (ctx.spec?.internal) why.push('the spec is internal (review)');
  if (ctx.spec?.quality === 'draft') why.push('the spec is draft quality');
  if (ctx.stage === 'draft') why.push('QA is judging draft frames');
  const label = ctx.provenance?.job?.params?.mark || null;
  if (label) why.push(`the render was asked for the mark "${label}"`);
  return { expected: why.length > 0, why, label };
}

export function brandMarksGate(ctx, py) {
  const m = py?.metrics || {};
  const exp = expectedMark(ctx);
  const detected = m.detected || null;
  const nccs = Object.entries(m.ncc || {}).map(([k, v]) => `${k} ${v}`).join(', ');
  let mark;
  if (!py) mark = check('not-run', null, null, 'the pixel pass did not run');
  else if (exp.expected && !detected) mark = check('fail', null, 'present', `no DRAFT/INTERNAL mark found, but one is required: ${exp.why.join('; ')} (NCC ${nccs})`);
  else if (!exp.expected && detected) mark = check('fail', detected, 'absent', `a ${detected} mark is burned into a video meant for publishing (NCC ${nccs})`);
  else if (exp.label && detected && !exp.label.includes(detected) && !detected.includes(exp.label)) mark = check('fail', detected, exp.label, `the render asked for "${exp.label}" but shows "${detected}"`);
  else mark = check('pass', detected, exp.expected ? 'present' : 'absent', exp.expected ? `${detected} mark present (${exp.why.join('; ')})` : `no mark, as a publishable video needs (NCC ${nccs})`);
  const checks = { mark };
  const end = ctx.spec?.copy?.end;
  if (ctx.spec) {
    const okKind = end && ['resolution', 'closer'].includes(end.kind) && Array.isArray(end.text) && end.text.length > 0;
    checks.endCard = check(okKind ? 'pass' : 'fail', end?.kind ?? null, 'resolution | closer', okKind ? `end card: one ${end.kind} (${end.text.join(' / ')})` : 'the end card must be exactly one resolution line or one brand closer');
  } else {
    checks.endCard = check('not-run', null, null, 'no spec');
  }
  const strings = [];
  if (ctx.spec?.copy) {
    const c = ctx.spec.copy;
    strings.push(...(c.hook || []), ...(c.lines || []), ...(c.end?.text || []));
  }
  for (const t of ctx.direction?.text || []) strings.push(...(t.opts?.lines || []));
  if (strings.length) {
    const bang = strings.filter((s) => s.includes('!'));
    checks.noBang = check(bang.length ? 'fail' : 'pass', bang.length, 0, bang.length ? `'!' in: ${bang.join(' | ')}` : `no '!' in ${strings.length} strings of copy and overlay text`);
  } else {
    checks.noBang = check('not-run', null, 0, 'no copy or overlay text to read');
  }
  return gate(checks, { metrics: { expected: exp, detected, ncc: m.ncc || {} } });
}
