/* Group Think Glitch — small drawn icons for the corkboard and the reveal (the cat, a balloon, "can't tell"), and the
 * Bubble image URL for people suspects. */
import { catSprite } from './world';
import type { Suspect } from './content';

const cache = new Map<string, HTMLCanvasElement>();
export function suspectIcon(id: Suspect, size = 96): HTMLCanvasElement {
  const key = id + size;
  const hit = cache.get(key);
  if (hit) { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d')!.drawImage(hit, 0, 0); return c; }
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbf7ef'; g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.fill();
  if (id === 'cat') {
    const cs = catSprite('sit');
    g.drawImage(cs, 30, 40, 150, 160, size * 0.06, size * 0.02, size * 0.9, size * 0.96);
  } else if (id === 'balloon') {
    const cx = size / 2, cy = size * 0.4, r = size * 0.24;
    g.strokeStyle = '#8a7f99'; g.lineWidth = size * 0.02; g.beginPath(); g.moveTo(cx, cy + r * 1.15); g.quadraticCurveTo(cx + r * 0.6, cy + r * 1.8, cx - r * 0.2, size * 0.92); g.stroke();
    const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, '#ff5d8f'); gr.addColorStop(1, '#a3264f');
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, r * 0.88, r * 1.05, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a3264f'; g.beginPath(); g.moveTo(cx - r * 0.12, cy + r * 1.12); g.lineTo(cx + r * 0.12, cy + r * 1.12); g.lineTo(cx, cy + r * 0.98); g.fill();
  } else if (id === 'unsure') {
    g.fillStyle = '#2b2540'; g.font = `700 ${size * 0.62}px 'Special Elite', Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', size / 2, size * 0.54);
  }
  cache.set(key, c);
  const out = document.createElement('canvas'); out.width = out.height = size; out.getContext('2d')!.drawImage(c, 0, 0);
  return out;
}
/** Suspects who are Bubbles use their real expression art. */
export const SUSPECT_FACE: Partial<Record<Suspect, [string, string]>> = { rush: ['rush', 'worried'], patch: ['patch', 'surprised'] };
