/* The Glorious Mess Auction on the hub: the cloth comes off a blind portrait, paddles go up, the price climbs, SOLD. */
import type { Slug } from '../../room/protocol';
import type { Surface } from '../../ui/dom';
import type { FaceBank } from '../../actor/faces';
import { mulberry32 } from '../../room/ritual';
import { bubblePortrait, scribble, Stroke } from './portrait';
import { layout, drawHouse, drawFrame, drawBoard, drawStamp, drawPaddle, drawPodium } from './house';
import { fmt, worth, priceAt, PADDLE } from './content';

const ARTISTS: Slug[] = ['rush', 'loopie', 'still', 'drop', 'sync'];
const ROW: Slug[] = ['loopie', 'drop', 'still', 'sync'];
const cache = new Map<number, Stroke[]>();
function art(n: number): Stroke[] {
  let a = cache.get(n);
  if (!a) { const r = mulberry32(n * 7919 + 11); a = bubblePortrait(ARTISTS[n % ARTISTS.length], r); a.push({ p: 2, pts: scribble(r) }); cache.set(n, a); if (cache.size > 6) cache.delete(cache.keys().next().value as number); }
  return a;
}

export function maPreview(sf: Surface, now: number, faces: FaceBank) {
  sf.fit(); const g = sf.g, W = sf.pw, H = sf.ph; if (W < 8) return;
  const cyc = 6, n = Math.floor(now / cyc), k = now % cyc;
  const L = layout(W, H, ROW.length);
  // zoom a little so the frame and the board fill the card
  g.save(); const z = 1.22; g.translate(W / 2, H * 0.47); g.scale(z, z); g.translate(-W / 2, -H * 0.47);
  drawHouse(g, W, H, L, { t: now, spot: 1, house: 0.3 });
  const cloth = k < 0.9 ? 1 - Math.min(1, k / 0.9) : 0;
  drawFrame(g, L.frame, art(n), { t: now, cloth, boil: Math.max(0.8, L.frame.w * 0.006), seed: n });
  const bidT = Math.max(0, Math.min(k - 1.3, 3.2));
  const price = k < 1.3 ? 10 : priceAt(bidT * 1.7);
  drawBoard(g, L.board, fmt(price), worth(price), 0, k > 4.6 ? 'SOLD' : 'CURRENT BID');
  const gface = faces.get('glitch', k > 4.6 ? 'celebrate' : 'neutral');
  const pr = L.podium.r * 0.85;
  if (gface) g.drawImage(gface, L.podium.x - pr, L.podium.y - pr * 0.45 - pr * 2, pr * 2, pr * 2);
  drawPodium(g, L.podium.x, L.podium.y, L.podium.r, k > 4.6 && k < 5 ? 1 - (k - 4.6) / 0.4 : 0);
  const sp = Math.min(W * 0.9 / ROW.length, L.rowR * 3.2);
  ROW.forEach((s, j) => {
    const x = W / 2 + (j - (ROW.length - 1) / 2) * sp, y = L.rowY, r = L.rowR;
    const dropAt = 1.6 + j * 0.8 + (s === 'still' ? 9 : 0);
    const up = k > 1.2 && k < dropAt ? 1 : s === 'still' && k > 1.2 ? 1 : 0;
    const f = faces.get(s, up ? 'determined' : k > 4.6 ? (s === 'drop' ? 'cry' : 'laugh') : 'neutral');
    if (f) g.drawImage(f, x - r, y - 2 * r, 2 * r, 2 * r);
    drawPaddle(g, x + r * 0.9, up ? y - r * 2.2 : y - r * 0.55, r * (up ? 0.85 : 0.6), PADDLE[s] || 5, 0, now * 9 + j, s === 'still' && k > 4.6);
  });
  drawStamp(g, 'SOLD!', L.frame.x + L.frame.w / 2, L.frame.y + L.frame.h * 0.45, L.frame.w * 0.17, -0.16, k > 4.6 ? Math.min(1, (k - 4.6) / 0.5) : 0);
  g.restore();
}
