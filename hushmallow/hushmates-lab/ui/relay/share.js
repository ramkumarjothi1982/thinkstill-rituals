// SHARE: a vertical picture of a journey, for the person to keep or post
// themselves. Private by default: nothing is uploaded or posted from here.
// It shows light and an emotion label only, never the feeling's words and
// never anyone's perspective, and its numbers are the real ones.

import { h, icon } from '../dom.js';
import { sentenceSwitch } from '../kit.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb } from '../orb.js';
import { top, feelColour, feelName, lights } from './common.js';

const END_CARD = 'A softer space for feelings.';

function headlineFor(j) {
  const n = j.humanCount;
  if (!n && j.mallowPetal) return { big: 'One feeling.', small: 'Seen another way by a Mallow.' };
  if (!n) return { big: 'One feeling.', small: 'Released into the sky.' };
  return { big: 'One feeling.', small: `${n === 5 ? 'Five' : n} ${n === 1 ? 'perspective' : 'perspectives'}. Back to me.` };
}

export function share(dev, { id } = {}) {
  const j = dev.client.journey(id);
  if (!j) return { el: h('div', { class: 'hm-scene rl-scene' }, h('div', { class: 'rl-head-slot' }, top(dev, { title: 'Share', back: true }))), mood: 'warm' };
  const opts = { label: !!j.label };
  const tint = feelColour(j.label);
  const orb = new Orb({ size: null, tint, label: 'The journey’s orb of light' });
  orb.setPetals(j.petals || [], j.mallowPetal);
  const line = headlineFor(j);
  const chip = h('span', { class: 'rl-feel rl-share-chip', style: { '--feel': tint } }, h('i'), feelName(j.label));
  const card = h('figure', { class: 'rl-share-card', style: { '--feel': tint }, 'aria-label': 'Preview of the picture', dataset: { test: 'share-preview' } },
    h('span', { class: 'rl-share-glow', 'aria-hidden': 'true' }),
    h('p', { class: 'rl-share-brand' }, 'Hush', h('em', {}, 'mates')),
    h('div', { class: 'rl-share-orb' }, orb.el),
    j.label ? chip : null,
    h('p', { class: 'rl-share-big' }, line.big),
    h('p', { class: 'rl-share-small' }, line.small),
    lights(j),
    h('figcaption', { class: 'rl-share-end' }, h('strong', {}, 'Hushmallow'), h('span', {}, END_CARD)));
  const el = h('div', { class: 'hm-scene rl-scene rl-share' },
    h('div', { class: 'rl-head-slot' }, top(dev, { title: 'Share a picture', back: true })),
    h('div', { class: 'hm-scroll rl-share-scroll' },
      card,
      h('div', { class: 'rl-card rl-card--lilac', dataset: { test: 'share-privacy' } },
        h('div', { class: 'rl-card-head' }, icon('shield'), h('h3', {}, 'Private until you choose')),
        h('p', {}, 'Nothing is posted anywhere from here. The picture never includes your words or anyone’s perspective: only light, the number of perspectives, and (if you like) the feeling’s name.')),
      j.label ? sentenceSwitch({ label: 'Show the feeling’s name', checked: opts.label, test: 'share-label', onChange: (on) => { opts.label = on; chip.hidden = !on; } }) : null,
      h('div', { class: 'rl-actions' },
        h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'share-save' }, onclick: () => save() }, icon('download'), 'Save the picture to this device'),
        h('p', { class: 'kit-note rl-center' }, 'You decide if and where to post it.'))));

  async function save() {
    try {
      const blob = await render(j, { ...opts, line });
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: 'hushmates-journey.png' });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      dev.toast('Saved to this device. Nothing was uploaded.');
    } catch {
      dev.toast('Couldn’t make the picture here. Please try again.', { tone: 'warn' });
    }
  }
  return { el, mood: 'warm', destroy() { orb.destroy(); } };
}

/** Draw the 1080 × 1920 picture (canvas, no network). */
async function render(j, { label, line }) {
  const W = 1080; const H = 1920;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const tint = feelColour(j.label);
  try { await Promise.all(['500 96px Fraunces', 'italic 500 96px Fraunces', '800 40px Manrope'].map((f) => document.fonts.load(f))); } catch { /* system fonts */ }
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#FFF8F3'); bg.addColorStop(0.55, '#F7F0FF'); bg.addColorStop(1, '#FFF3EC');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const blob = (cx, cy, r, c) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); };
  blob(120, 160, 760, 'rgba(255,186,219,.65)'); blob(980, 380, 820, 'rgba(191,230,255,.75)'); blob(540, 1780, 900, 'rgba(205,184,255,.5)');
  blob(540, 820, 520, `${tint}88`);
  // petals (one per person, in their Mallow's colour) and the Mallow's star
  const cx = 540; const cy = 820; const R = 210;
  (j.petals || []).forEach((p, i) => {
    const m = MALLOWS[p.mallow] || MALLOWS.loomi;
    x.save(); x.translate(cx, cy); x.rotate((i * 72 * Math.PI) / 180);
    const g = x.createLinearGradient(0, -R, 0, -R - 230); g.addColorStop(0, m.body); g.addColorStop(0.7, m.glow); g.addColorStop(1, '#fff');
    x.fillStyle = g; x.globalAlpha = 0.95;
    x.beginPath(); x.moveTo(0, -R + 20); x.bezierCurveTo(-60, -R - 60, -55, -R - 170, 0, -R - 240); x.bezierCurveTo(55, -R - 170, 60, -R - 60, 0, -R + 20); x.fill();
    x.restore();
  });
  if (j.mallowPetal) {
    const m = MALLOWS[j.mallowPetal.mallow] || MALLOWS.loomi;
    x.save(); x.strokeStyle = m.deep; x.globalAlpha = 0.35; x.setLineDash([10, 18]); x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, 330, 0, Math.PI * 2); x.stroke(); x.restore();
    const sx = cx + 330 * Math.sin(0.6); const sy = cy - 330 * Math.cos(0.6);
    x.save(); x.translate(sx, sy); x.fillStyle = '#fff'; x.strokeStyle = m.deep; x.lineWidth = 4;
    x.beginPath(); x.moveTo(0, -30); x.quadraticCurveTo(4, -4, 30, 0); x.quadraticCurveTo(4, 4, 0, 30); x.quadraticCurveTo(-4, 4, -30, 0); x.quadraticCurveTo(-4, -4, 0, -30); x.fill(); x.stroke(); x.restore();
  }
  const sphere = x.createRadialGradient(cx - 70, cy - 80, 20, cx, cy, R);
  sphere.addColorStop(0, '#ffffff'); sphere.addColorStop(0.35, `${tint}`); sphere.addColorStop(1, '#8E6BFF');
  x.fillStyle = sphere; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.ellipse(cx - 70, cy - 110, 70, 38, -0.4, 0, Math.PI * 2); x.fill();
  // words: only the brand, the line and the label
  x.textAlign = 'center'; x.fillStyle = '#1F1640';
  x.font = 'italic 500 64px Fraunces, Georgia, serif'; x.fillText('Hushmates', W / 2, 200);
  let y = 1240;
  if (label && j.label) {
    x.font = '800 36px Manrope, sans-serif';
    const t = feelName(j.label).toUpperCase(); const w = x.measureText(t).width + 110;
    x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.roundRect((W - w) / 2, y - 52, w, 76, 38); x.fill();
    x.fillStyle = tint; x.beginPath(); x.arc((W - w) / 2 + 42, y - 14, 12, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#4B4366'; x.fillText(t, W / 2 + 18, y);
    y += 140;
  }
  x.fillStyle = '#1F1640'; x.font = '500 104px Fraunces, Georgia, serif'; x.fillText(line.big, W / 2, y); y += 96;
  x.font = 'italic 500 62px Fraunces, Georgia, serif'; x.fillStyle = '#4B4366'; x.fillText(line.small, W / 2, y);
  // end card
  x.fillStyle = 'rgba(31,22,64,.88)'; x.beginPath(); x.roundRect(140, H - 250, W - 280, 140, 70); x.fill();
  x.fillStyle = '#FFF8F3'; x.font = '800 40px Manrope, sans-serif'; x.fillText('Hushmallow', W / 2, H - 192);
  x.font = '500 34px Manrope, sans-serif'; x.fillStyle = 'rgba(255,248,243,.85)'; x.fillText(END_CARD, W / 2, H - 144);
  return new Promise((resolve, reject) => cv.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}
