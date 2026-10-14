// STUB composer for the planner's compile tests: NOT the WP-03 composer and
// NOT G-DIR. It lets the property suite drive the whole compile path
// (G-SPEC -> compose -> G-DIR -> G-COST -> verdict) before the composer
// exists, through the same seam the real one will use
// (planner/composer-bridge.mjs, HM_COMPOSER_DIR).
//
// compose(spec) lays the spec's copy on its beat clock with instant fades:
// the hook (shown again from HOOK_IN through the loop seam), the thought
// lines (Lk until the ritual; with 4 lines the first retires when the 4th
// arrives, so no more than 3 glass texts are ever on screen) and the end card.

export function compose(spec, { lib }) {
  const c = lib.clocks[spec.duration];
  if (!c) throw new Error(`no beat clock for ${spec.duration} s`);
  const D = Number(spec.duration);
  const texts = [
    { id: 'hook', kind: 'caption', text: spec.copy.hook.join(' '), windows: [[0, c.HOOK_OUT], [c.HOOK_IN, D]] },
    ...spec.copy.lines.map((t, k) => {
      const end = spec.copy.lines.length === 4 && k === 0 ? c.L4 : c.RITUAL[0];
      return { id: `line${k + 1}`, kind: 'glass', text: t, windows: [[c[`L${k + 1}`], end]] };
    }),
    { id: 'end', kind: 'caption', text: spec.copy.end.text.join(' '), windows: [[c.RESOLVE, c.CARD_OUT]] },
  ];
  return { duration: D, texts, ritual: { id: spec.ritual, window: c.RITUAL[1] - c.RITUAL[0] }, gag: { ...spec.gag } };
}
