// LP-RETURN — return to cover (approved v2): the Mallow settles back into the
// exact cover pose and rest face, the pristine painting fades back in, and the
// hook caption returns at HOOK_IN in the identical position, so frame N−1
// flows into frame 0. The seam stays at frame 0 (P = 0).

import { TEXT_STYLES } from '../../layout.js';

export default {
  id: 'LP-RETURN',
  kind: 'loop',
  library: 'LP-RETURN',
  summary: 'settle back into the cover pose; the hook returns',
  cost: { overlay: true },
  requires: { caps: ['text.hook'] },
  span: ['CARD_OUT', 'END'],
  entry: 'asleep',
  exit: 'asleep',
  seam: () => 0,                       // P: the loop seam sits at frame 0
  owns: {},
  params: {},
  cues: { loop: { recipe: 'v2/loop' } },

  compile(ctx, A) {
    const { at } = ctx;
    const hook = ctx.layout.hook, st = TEXT_STYLES.hook;
    // the painting returns before the seam
    ctx.post('rest.return', [at(A.CARD_OUT, -0.1), at(A.CARD_OUT, 0.2)]);
    // the hook comes back in place, no rise, so frame 0 continues it
    ctx.text({ id: 'hookReturn', kind: 'textblock', z: 1, drawFrom: A.HOOK_IN, opts: { lines: hook.lines, y: st.y, size: hook.size, weight: st.weight, tracking: st.tracking, enterAt: A.HOOK_IN, inDur: 0.3, stagger: 0, rise: 0 }, widths: hook.widths, readable: { min: 2.0, with: 'hook' } });
    ctx.cue(A.HOOK_IN, 'loop');
  },
};
