// Reference probes for the brand gates, drawn with the engine's own classes.
//
//   window.__probe.ready                       resolves once Fredoka is loaded
//   window.__probe.logo(opts, t, w, h)         the LogoCard overlay at time t → { rgba (base64), w, h }
//   window.__probe.mark(label, k)              the corner mark at output scale k → { rgba, w, h, x, y }
//
// RGBA comes from getImageData, i.e. straight (unpremultiplied) alpha.

import { LogoCard } from '../../../engine/type.js';
import { Marks } from '../../../engine/runtime/marks.js';

async function loadFonts() {
  const url = new URL('../../../../hushmallow/assets/fonts/fredoka-latin.woff2', import.meta.url).href;
  const face = new FontFace('Fredoka', `url(${url}) format("woff2")`, { weight: '300 700', style: 'normal' });
  await face.load();
  document.fonts.add(face);
  await Promise.all([400, 500, 600, 700].map((w) => document.fonts.load(`${w} 40px Fredoka`)));
}

const b64 = (data) => {
  let s = '';
  const step = 0x8000;
  for (let i = 0; i < data.length; i += step) s += String.fromCharCode.apply(null, data.subarray(i, i + step));
  return btoa(s);
};

window.__probe = {
  ready: loadFonts(),
  async logo(opts, t, w = 1080, h = 1920) {
    const card = new LogoCard(opts);
    await card.load();
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    card.draw(g, t);
    return { rgba: b64(g.getImageData(0, 0, w, h).data), w, h, plate: [card.pw, card.ph] };
  },
  mark(label, k) {
    const m = new Marks(label);
    const c = m.canvas(k);
    const g = c.getContext('2d', { willReadFrequently: true });
    return { rgba: b64(g.getImageData(0, 0, c.width, c.height).data), w: c.width, h: c.height, x: Math.round(m.margin * k), y: Math.round(m.margin * k) };
  },
};
