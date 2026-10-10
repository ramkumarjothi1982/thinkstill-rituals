/* Bubble expression art for Reflect. The seven Bubbles and their 100 expressions each come from the shared
 * `bubble-expressions/` set (the same art Reset and Reframe use); moods are named so scenes read like direction notes.
 * If Reset has published custom avatars through the shared-media bridge, those replace the neutral face. */
import type { Slug } from '../room/protocol';

export const MOODS: Record<Slug, Record<string, string>> = {
  loopie: { neutral: 'E01', happy: 'E03', laugh: 'E18', love: 'E09', wow: 'E05', surprised: 'E58', worried: 'E52', sad: 'E30', cry: 'E25', angry: 'E66', cool: 'E21', wink: 'E17', think: 'E14', calm: 'E02', sleepy: 'E07', celebrate: 'E20', shy: 'E28', determined: 'E70', silly: 'E06', confused: 'E87', idea: 'E19', dizzy: 'E15', peace: 'E02', star: 'E43' },
  glitch: { neutral: 'E01', happy: 'E07', laugh: 'E18', love: 'E23', wow: 'E21', surprised: 'E20', worried: 'E36', sad: 'E92', cry: 'E86', angry: 'E10', cool: 'E35', wink: 'E29', think: 'E65', calm: 'E38', sleepy: 'E64', celebrate: 'E22', shy: 'E44', determined: 'E13', silly: 'E27', confused: 'E14', idea: 'E52', dizzy: 'E80', meltdown: 'E11', smug: 'E31', coffee: 'E74', scan: 'E46', nerd: 'E77', facepalm: 'E64', gasp: 'E34' },
  patch: { neutral: 'E01', happy: 'E14', laugh: 'E08', love: 'E11', wow: 'E52', surprised: 'E40', worried: 'E09', sad: 'E42', cry: 'E76', angry: 'E61', cool: 'E10', wink: 'E03', think: 'E38', calm: 'E19', sleepy: 'E30', celebrate: 'E87', shy: 'E53', determined: 'E61', silly: 'E73', confused: 'E54', idea: 'E37', hug: 'E05', cosy: 'E89' },
  drop: { neutral: 'E05', happy: 'E03', laugh: 'E20', love: 'E21', wow: 'E16', surprised: 'E23', worried: 'E57', sad: 'E80', cry: 'E69', angry: 'E62', cool: 'E39', wink: 'E14', think: 'E44', calm: 'E02', sleepy: 'E91', celebrate: 'E42', shy: 'E17', determined: 'E29', silly: 'E38', confused: 'E90', idea: 'E32', rain: 'E71', grow: 'E64', flower: 'E47' },
  rush: { neutral: 'E01', happy: 'E02', laugh: 'E40', love: 'E09', wow: 'E19', surprised: 'E13', worried: 'E58', sad: 'E37', cry: 'E47', angry: 'E31', cool: 'E17', wink: 'E06', think: 'E74', calm: 'E50', sleepy: 'E55', celebrate: 'E16', shy: 'E33', determined: 'E22', silly: 'E11', confused: 'E74', idea: 'E54', panic: 'E28', speed: 'E23', fume: 'E57' },
  still: { neutral: 'E01', happy: 'E07', laugh: 'E08', love: 'E09', wow: 'E27', surprised: 'E46', worried: 'E30', sad: 'E71', cry: 'E55', angry: 'E47', cool: 'E79', wink: 'E61', think: 'E45', calm: 'E02', sleepy: 'E19', celebrate: 'E35', shy: 'E31', determined: 'E64', silly: 'E62', confused: 'E45', idea: 'E81', meditate: 'E03', glow: 'E44', music: 'E58' },
  sync: { neutral: 'E01', happy: 'E03', laugh: 'E05', love: 'E11', wow: 'E20', surprised: 'E17', worried: 'E42', sad: 'E46', cry: 'E43', angry: 'E47', cool: 'E29', wink: 'E02', think: 'E60', calm: 'E10', sleepy: 'E23', celebrate: 'E61', shy: 'E12', determined: 'E51', silly: 'E33', confused: 'E60', idea: 'E57', storm: 'E27', dizzy: 'E49', rainbow: 'E98', moon: 'E90' }
};

export const DEFAULT_ASSET_BASE = 'https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/bubble-expressions/';

export function exprCode(slug: Slug, mood: string): string {
  if (/^E\d{2,3}$/.test(mood)) return mood;
  const m = MOODS[slug] || MOODS.loopie;
  return m[mood] || m.neutral || 'E01';
}

/** Loads and caches Bubble expression images. `get` never blocks: it returns null until the image is ready and calls
 * `onReady` once it is, so a canvas scene can simply redraw. */
export class FaceBank {
  private imgs = new Map<string, HTMLImageElement>();
  private ready = new Set<string>();
  private failed = new Set<string>();
  onReady: (() => void) | null = null;
  constructor(public base: string = DEFAULT_ASSET_BASE, public avatars: Partial<Record<Slug, string>> = {}, public available?: Set<string>) {
    this.base = String(base || DEFAULT_ASSET_BASE).replace(/\/?$/, '/');
  }
  url(slug: Slug, mood: string): string {
    let code = exprCode(slug, mood);
    if (this.available && !this.available.has(slug + '_' + code)) code = exprCode(slug, 'neutral');
    if (code === exprCode(slug, 'neutral') && this.avatars[slug]) return this.avatars[slug]!;
    return this.base + slug + '_' + code + '.webp';
  }
  get(slug: string, mood: string): HTMLImageElement | null {
    const u = this.url(slug as Slug, mood);
    if (this.ready.has(u)) return this.imgs.get(u)!;
    if (this.failed.has(u)) {
      const n = this.base + slug + '_' + exprCode(slug as Slug, 'neutral') + '.webp';
      return n !== u && this.ready.has(n) ? this.imgs.get(n)! : null;
    }
    this.load(u);
    return null;
  }
  private load(u: string): Promise<void> {
    if (this.imgs.has(u)) return Promise.resolve();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    this.imgs.set(u, img);
    return new Promise(res => {
      img.onload = () => { this.ready.add(u); if (this.onReady) this.onReady(); res(); };
      img.onerror = () => { this.failed.add(u); res(); };
      img.src = u;
    });
  }
  /** Preload a list of [slug, mood] pairs (scenes call this before their first frame). */
  preload(list: [string, string][]): Promise<void> {
    return Promise.all(list.map(([s, m]) => this.load(this.url(s as Slug, m)))).then(() => undefined);
  }
}
