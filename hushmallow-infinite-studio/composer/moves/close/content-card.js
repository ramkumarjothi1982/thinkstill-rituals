// close/content-card — the resolution (approved v2): eyes open softly, a
// first glance up at the celestial light and then at us, a tiny content
// smile, the end line and the logo card, a slow blink, and the eyes drift
// shut as the card leaves. Shows either the template's resolution line or a
// brand closer (spec.copy.end), never both.

import { TEXT_STYLES, layoutEndText } from '../../layout.js';
import { zone } from '../lib.js';

const CHANNELS = ['face.eyeOpen', 'face.lidTop', 'face.lidBot', 'face.irisScale', 'face.lookX', 'face.lookY', 'face.mouthSmile', 'face.blush', 'face.sparkle'];

export default {
  id: 'close/content-card',
  kind: 'close',
  summary: 'eyes open softly, end line + logo card, slow blink, eyes drift shut',
  cost: { subframes: 'low', faceRedraws: 'med', overlay: true },
  requires: { caps: ['text.end', 'text.logo'] },
  span: ['OPEN-0.25', 'CARD_OUT'],
  entry: 'calm',
  exit: 'asleep',
  publishes: (A, at) => ({ open: A.OPEN, tagline: A.RESOLVE, logo: A.LOGO, slowBlink: at(A.LOGO, 0.2), sleep: A.SETTLE, cardOut: A.CARD_OUT }),
  owns: zone(CHANNELS, 'OPEN-0.25', 'END'),
  params: {
    skyGaze: { def: [0.28, -0.38], doc: 'first glance on opening: toward the celestial light (look units)' },
  },
  cues: {
    eyes_open: { recipe: 'v2/eyes_open' }, tagline: { recipe: 'v2/tagline' }, logo: { recipe: 'v2/logo' },
    blink: { recipe: 'v2/blink' }, drift: { recipe: 'v2/drift' },
  },

  compile(ctx, A, p) {
    const { at } = ctx;
    const open = A.open, sleep = A.sleep;

    // eyes open softly, look up at the light, then at us; drift shut
    ctx.key('face.eyeOpen', open, 1.0, { f: 1.4, z: 0.85 });
    ctx.key('face.eyeOpen', sleep, 0, { f: 1.1, z: 1 });
    ctx.key('face.lidTop', open, 0.04);
    ctx.key('face.lidTop', sleep, 0);
    ctx.key('face.lidBot', open, 0.4);
    ctx.key('face.lidBot', sleep, 0);
    ctx.key('face.irisScale', open - 0.1, 1.12);
    ctx.key('face.irisScale', sleep, 1);
    ctx.look(open - 0.05, p.skyGaze);
    ctx.look(at(A.LOGO, -0.25), [0, 0.06]);
    ctx.key('face.mouthSmile', open, 0.95, { f: 1.2 });
    ctx.key('face.mouthSmile', sleep, 1, { f: 0.8, z: 1 });
    ctx.key('face.blush', at(sleep, 0.1), 0);
    ctx.key('face.sparkle', open, 1);
    ctx.key('face.sparkle', sleep, 0);
    ctx.blink(A.slowBlink, { close: 0.15, hold: 0.08, open: 0.32 });

    // the end card: one line (resolution or brand closer) and the untouched logo on its plate
    const end = layoutEndText(ctx.spec.copy.end.text, ctx.measure);
    const st = TEXT_STYLES.endText, lg = TEXT_STYLES.logo;
    ctx.text({ id: 'end', kind: 'textblock', z: 2, opts: { lines: end.lines, y: st.y, size: st.size, weight: st.weight, enterAt: A.tagline, exitAt: A.cardOut, exitDur: 0.34, stagger: 0.18 }, widths: end.widths, readable: { min: 2.0 } });
    ctx.text({ id: 'logo', kind: 'logocard', z: 3, opts: { y: lg.y, logoW: lg.logoW, urlSize: lg.urlSize, gap: lg.gap, enterAt: A.logo, exitAt: A.cardOut, exitDur: 0.34 } });

    // the sleepy breathing returns as the eyes drift shut
    ctx.post('breath.resume', { amp: 1, from: at(sleep, -0.2), to: at(sleep, 0.9) });

    ctx.cue(open, 'eyes_open');
    ctx.cue(A.tagline, 'tagline');
    ctx.cue(A.logo, 'logo');
    ctx.cue(A.slowBlink, 'blink', { soft: true });
    ctx.cue(sleep, 'drift');
  },
};
