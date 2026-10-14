// Weather Weaver — the weather's two canvases (DOM inside methods only).
//
//   .wx-back   in the stage wrap, after the realm canvas and behind the Mallow:
//              every weather element, the light shafts, touch rings, the idle
//              affordance and the weather front (so the Mallow stays in front)
//   .wx-front  over the stage (z 2): only what is held in the hand (beads) and
//              the resolve bloom; costs nothing while empty, and does not exist
//              on the low tier (held things draw on the back canvas there)
//
// Both are owner-driven EffectsLayers (manual: no rAF of their own): the
// feature's loop calls frame(dt, scene) with one scene object it mutates every
// frame. While the page is hidden the loop stops, so the canvases freeze.

import { EffectsLayer, Bloom, glowBlend } from './effects.js';
import { buildSprites, freeSprites, drawClouds, drawShafts, drawRain, drawBeads, drawRings, drawAffordance, drawFront } from './weather-draw.js';

export const DPR_CAP = Object.freeze({ high: 1.5, medium: 1.25, low: 1 });
const SHAFT_SLANT = 0.08;   // light falls a little from the left

export class WeatherLayer {
  /**
   * @param {{wrap:HTMLElement, screen:HTMLElement, quality?:string, reducedMotion?:boolean, palette?:object|null}} o
   *   palette: Comfort DNA colours ({glow, soft, deep}) for stars, ribbons and embers (later weathers).
   */
  constructor({ wrap, screen, quality = 'medium', reducedMotion = false, palette = null }) {
    this.wrap = wrap;
    this.screen = screen;
    this.quality = DPR_CAP[quality] ? quality : 'medium';
    this.reduced = !!reducedMotion;
    this.palette = palette;
    this.back = new EffectsLayer(wrap, { manual: true, className: 'wx-back', zIndex: '', dprCap: DPR_CAP[this.quality], quality: this.quality, reducedMotion });
    this.front = null;
    if (this.quality !== 'low') this._makeFront();
    this.scene = null;
    this.sp = null;
    this.realmId = null;
    this.realmPalette = null;
    this.tone = 'dark';
    this.frames = 0;
    this.drawn = { puffs: 0, drops: 0, beads: 0, ribbons: 0, stars: 0, embers: 0, crests: 0 };
    this._o = { alpha: 1, warm: 0, blend: 'lighter', W: 1, H: 1, t: 0, dpr: 1, reduced: this.reduced, light: false, floorY: 0, slant: SHAFT_SLANT, deckY: 0 };
    this._backItem = { step: () => true, draw: (g) => this._drawBack(g) };
    this._frontItem = { step: () => true, draw: (g) => this._drawFront(g) };
    this.back.add(this._backItem);
  }

  _makeFront() {
    this.front = new EffectsLayer(this.screen, { manual: true, className: 'wx-front', zIndex: '2', dprCap: DPR_CAP[this.quality], quality: this.quality, reducedMotion: this.reduced });
  }

  /** A realm change (at the swap, under a full front): sprites take the new realm's colours. */
  setRealm(realmId, palette, tone = 'dark') {
    this.realmId = realmId;
    this.realmPalette = palette;
    this.tone = tone === 'light' ? 'light' : 'dark';
    this._sprites();
  }

  _sprites() {
    freeSprites(this.sp);
    this.sp = this.realmPalette ? buildSprites({ palette: this.realmPalette, tone: this.tone, dpr: this.back.dpr }) : null;
  }

  /** Lab tier: back DPR cap, and no front canvas on the low tier. */
  setQuality(q) {
    if (!DPR_CAP[q] || q === this.quality) return;
    this.quality = q;
    const dpr = this.back.dpr;
    this.back.setDprCap(DPR_CAP[q]);
    if (this.back.dpr !== dpr) this._sprites();
    if (q === 'low' && this.front) { this.front.destroy(); this.front = null; }
    else if (q !== 'low' && !this.front) this._makeFront();
    else this.front?.setDprCap(DPR_CAP[q]);
  }

  setReducedMotion(b) { this.reduced = !!b; }
  setPalette(p) { this.palette = p || null; }

  /** A soft local bloom (never a flash: ≥ 1.6 s), on the front canvas where there is one. */
  addBloom(x, y, r, color, dur = 1.8) {
    (this.front || this.back).add(new Bloom({ x, y, r, color, dur: Math.max(1.6, dur) }));
  }

  /** One frame: dt in seconds; scene is the feature's reused scene object. */
  frame(dt, scene) {
    this.scene = scene;
    if (this.front) {
      const need = scene.held > 0;
      if (need && !this.front.items.has(this._frontItem)) this.front.add(this._frontItem);
      else if (!need && this.front.items.has(this._frontItem)) this.front.remove(this._frontItem);
      this.front.render(dt);
    }
    this.back.render(dt);
    this.frames++;
  }

  _opts() {
    const s = this.scene, o = this._o;
    o.W = s.W; o.H = s.H; o.t = s.t; o.dpr = this.back.dpr; o.reduced = this.reduced;
    o.blend = glowBlend(this.tone); o.light = this.tone === 'light';
    o.floorY = s.geo.floorY; o.deckY = s.sims.rain.deckY;
    return o;
  }

  _drawBack(g) {
    const s = this.scene, sp = this.sp;
    if (!s || !sp) return;
    const o = this._opts(), d = this.drawn, fade = s.fade, st = s.storm, sims = s.sims;
    d.puffs = 0; d.drops = 0; d.beads = 0;
    // the thunderheads' back bands and the rain deck
    o.alpha = fade; o.warm = st.warm;
    d.puffs += drawClouds(g, sims.clouds, sp, 0, 1, o);
    o.warm = 0;
    d.puffs += drawClouds(g, sims.deck, sp, 0, 0, o);
    // far rain, light through the gaps, then the front band of storm heads
    o.alpha = fade * s.rainAlpha;
    d.drops += drawRain(g, sims.rain, sp, 0, 0.5, o);
    o.alpha = fade * st.shaft; o.slant = SHAFT_SLANT;
    drawShafts(g, st.gaps, st.n, st.y0, sp, o);
    o.alpha = fade; o.warm = st.warm;
    d.puffs += drawClouds(g, sims.clouds, sp, 2, 2, o);
    o.alpha = fade * s.rainAlpha;
    d.drops += drawRain(g, sims.rain, sp, 0.5, 1.01, o);
    // touch rings, the idle affordance, held things on the low tier, then the front veil
    o.alpha = fade;
    drawRings(g, s.rings, sp, o);
    if (s.affordance) { o.alpha = fade * s.affordanceA; drawAffordance(g, s.affordance, sims, sp, o); o.alpha = fade; }
    if (!this.front) d.beads = drawBeads(g, sims.rain, sp, o);
    if (s.front.on) drawFront(g, s.front, o);
  }

  _drawFront(g) {
    const s = this.scene, sp = this.sp;
    if (!s || !sp) return;
    const o = this._opts();
    o.alpha = s.fade;
    this.drawn.beads = drawBeads(g, s.sims.rain, sp, o);
  }

  stats() {
    return { frames: this.frames, drawn: { ...this.drawn }, backDpr: this.back.dpr, front: !!this.front, frontActive: !!this.front && this.front.items.size > 0,
      realm: this.realmId, reduced: this.reduced, quality: this.quality };
  }

  destroy() {
    this.back.destroy();
    this.front?.destroy();
    this.front = null;
    freeSprites(this.sp);
    this.sp = null;
    this.scene = null;
  }
}
