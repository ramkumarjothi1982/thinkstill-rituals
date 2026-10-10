/* Harness: every Bubble's blind self-portrait (two seeds each), through encode → decode as the room stores them. */
import { bubblePortrait, drawStrokes, scribble, encode, decode } from '../src/rituals/mess-auction/portrait';
import { mulberry32 } from '../src/room/ritual';
const slugs = ['rush', 'loopie', 'drop', 'still', 'sync', 'glitch', 'patch'] as const;
const out = document.createElement('canvas'); out.width = 7 * 250 + 20; out.height = 2 * 270; document.getElementById('grid')!.appendChild(out);
const g = out.getContext('2d')!; g.fillStyle = '#3a1020'; g.fillRect(0, 0, out.width, out.height);
for (let row = 0; row < 2; row++) slugs.forEach((s, i) => {
  const r = mulberry32(1234 + row * 99 + i * 7);
  const strokes = bubblePortrait(s, r);
  strokes.push({ p: 2, pts: scribble(r) });
  const enc = encode(strokes), dec = decode(enc);
  const x = 10 + i * 250, y = 10 + row * 265;
  g.fillStyle = '#f7efe0'; g.fillRect(x, y, 240, 240);
  drawStrokes(g, dec, x, y, 240, { t: 0, boil: 0 });
  g.fillStyle = '#fff'; g.font = '13px sans-serif'; g.fillText(s + ' (' + JSON.stringify(enc).length + ' bytes)', x + 4, y + 254);
});
document.body.dataset.done = '1';
