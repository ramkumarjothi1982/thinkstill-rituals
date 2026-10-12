// The seven Mallows as ritual material. When the person adds no photos of
// their own, these portrait cards take the photos' place inside the ritual:
// each Mallow in the soft light of its home realm, painted here from the
// approved artwork (assets/mallows/<id>.png). They are the app's own art,
// so they are never offered to keep, never counted as the person's photos
// and never shared. Built once per page and kept in memory.

import { MALLOWS, MALLOW_IDS } from '../mallows/registry.js';
import { REALMS } from '../world/realm.js';
import { photoItem } from './photos.js';
import { rng, rgba, TAU } from './fx.js';

const W = 560, H = 700;          // a 4:5 portrait, like a phone photo
let built = null;                // Promise<photo entries> in MALLOW_IDS order

function load(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img.decode().then(() => img);
}

function paint(m, img) {
  const pal = REALMS[m.realm]?.palette || { sky: '#2a2668', deep: '#15123d' };
  const col = m.colours;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const R = rng(MALLOW_IDS.indexOf(m.id) * 97 + 13);
  // home-realm sky
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, pal.sky); sky.addColorStop(1, pal.deep);
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // soft halo behind the Mallow, and a second light in its accent colour
  const halo = (x, y, r, colour, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(colour, a)); gr.addColorStop(1, rgba(colour, 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  };
  halo(W * 0.5, H * 0.5, W * 0.66, col.glow, 0.5);
  halo(W * (R() < 0.5 ? 0.16 : 0.84), H * 0.18, W * 0.5, col.accent, 0.22);
  // bokeh
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 24; i++) {
    const x = R() * W, y = R() * H * 0.9, r = 8 + R() * 34, colour = [col.glow, col.accent, '#ffffff'][i % 3];
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(colour, 0.08 + R() * 0.14)); gr.addColorStop(0.7, rgba(colour, 0.05)); gr.addColorStop(1, rgba(colour, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.restore();
  // the Mallow: centred, a little low, standing in a pool of light
  const k = Math.min((W * 0.76) / img.naturalWidth, (H * 0.6) / img.naturalHeight);
  const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
  const x = (W - dw) / 2, y = H * 0.55 - dh / 2;
  halo(W * 0.5, y + dh * 0.98, dw * 0.62, col.glow, 0.3);
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.filter = 'blur(10px)';
  g.beginPath(); g.ellipse(W * 0.5, y + dh * 0.97, dw * 0.36, dh * 0.06, 0, 0, TAU); g.fill();
  g.restore();
  g.save();
  g.shadowColor = rgba(col.glow, 0.55); g.shadowBlur = 36;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, x, y, dw, dh);
  g.restore();
  // a few glints, then a gentle vignette
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const gx = x + dw * (0.1 + R() * 0.8), gy = y - dh * 0.05 + R() * dh * 0.25, r = 2 + R() * 3;
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(gx, gy, r, 0, TAU); g.fill();
    halo(gx, gy, r * 6, '#ffffff', 0.18);
  }
  g.restore();
  const vg = g.createRadialGradient(W / 2, H * 0.52, W * 0.35, W / 2, H * 0.52, H * 0.72);
  vg.addColorStop(0, rgba(pal.deep, 0)); vg.addColorStop(1, rgba(pal.deep, 0.55));
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return photoItem(c, { focus: { x: 0.5, y: (y + dh * 0.5) / H }, mallow: m.id, name: m.name });
}

/** All seven cards (those whose artwork loaded), in the registry's order. */
export function mallowCards() {
  if (!built) {
    built = Promise.all(MALLOW_IDS.map((id) => load(MALLOWS[id].file).then((img) => paint(MALLOWS[id], img)).catch(() => null)))
      .then((list) => list.filter(Boolean));
    // nothing loaded (offline?): try again next ritual
    built.then((list) => { if (!list.length) built = null; });
  }
  return built;
}

/**
 * The seven Mallows as a ritual's material: the six companions first,
 * starting after the lead (so the hero object is a friend, not the guide
 * beside the stage), then the lead Mallow itself.
 */
export async function mallowMaterial(lead) {
  const all = await mallowCards();
  const i = all.findIndex((p) => p.mallow === lead);
  return i < 0 ? all : [...all.slice(i + 1), ...all.slice(0, i), all[i]];
}
