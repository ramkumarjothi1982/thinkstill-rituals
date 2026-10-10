/* Harness: every Bubble companion's shadow monster, on the sheet at the lamp and backstage with the lights up. */
import { renderAudience, renderBackstage, paintSheet, sheetCanvasFor } from '../src/rituals/shadow-monsters/world';
import { COMPANION_MONSTERS } from '../src/rituals/shadow-monsters/content';
const names = ['rush', 'loopie', 'drop', 'patch', 'glitch', 'still'] as const;
const out = document.createElement('canvas'); out.width = 6 * 305; out.height = 1100; document.getElementById('grid')!.appendChild(out);
const og = out.getContext('2d')!; og.fillStyle = '#111'; og.fillRect(0, 0, out.width, out.height);
const sheet = document.createElement('canvas');
names.forEach((n, i) => {
  const objs = COMPANION_MONSTERS[n][0].objs;
  const c = document.createElement('canvas'); c.width = 300; c.height = 520; const g = c.getContext('2d')!;
  sheetCanvasFor(sheet, 300); paintSheet(sheet, objs, { lampZ: 0, lamp: 1, house: 0, t: 1 }, true);
  renderAudience(g, 300, 520, { sheetCanvas: sheet, house: 0, t: 1 });
  og.drawImage(c, i * 305, 0);
  const c2 = document.createElement('canvas'); c2.width = 300; c2.height = 520; const g2 = c2.getContext('2d')!;
  sheetCanvasFor(sheet, 300); paintSheet(sheet, objs, { lampZ: -6.5, lamp: 1, house: 0.9, t: 1 }, false);
  renderBackstage(g2, 300, 520, { objs, light: { lampZ: -6.5, lamp: 1, house: 0.9, t: 1 }, sheetCanvas: sheet, zoom: 1.7, focus: [0, 0.07, 0.21], focusY: 0.5 });
  og.drawImage(c2, i * 305, 560);
  og.fillStyle = '#fff'; og.font = '16px sans-serif'; og.fillText(n, i * 305 + 10, 540);
});
document.body.dataset.done = '1';
