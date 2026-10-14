// Weather Weaver — the weather's two canvases (DOM inside methods only).
//
//   .wx-back   in the stage wrap, after the realm canvas and behind the Mallow:
//              every weather element, the light shafts, touch rings, the idle
//              affordance and the weather front (so the Mallow stays in front)
//   .wx-front  over the stage (z 2): only what is held in the hand (beads and
//              star clusters) and the resolve bloom; costs nothing while empty,
//              and does not exist on the low tier (held things draw on the back
//              canvas there)
//
// Back paint order (spec §10): stars and their lines, beams, the sun's haze,
// storm heads (back bands) and the rain deck, far rain, shafts, the front band,
// mist (with the Mallow's lantern), ribbons and fluffs, water and puddles, light
// pools and the halo behind the Mallow, embers and the warm trail, near rain,
// rings, the idle affordance, dew, then the front veil.
//
// Both are owner-driven EffectsLayers (manual: no rAF of their own): the
// feature's loop calls frame(dt, scene) with one scene object it mutates every
// frame. While the page is hidden the loop stops, so the canvases freeze.

import { EffectsLayer, Bloom, FlashGate, glowBlend } from './effects.js';
import { smoothstep } from './math.js';
import {
  buildSprites, freeSprites, weatherTints, drawClouds, drawShafts, drawRain, drawBeads, drawRings, drawAffordance, drawFront,
  drawStars, drawConstellations, drawBeam, drawField, drawRibbons, drawFluffs, drawWater, drawGlitter, drawPuddles, drawPool, drawHalo,
  drawEmbers, drawTrail, drawDew,
} from './weather-draw.js';

export const DPR_CAP = Object.freeze({ high: 1.5, medium: 1.25, low: 1 });
/** The lab's share of the photosafe budget (SHARED C6): cloud glows from either bank ≤ 1 a second; small blooms ≥ 1.2 s apart. */
export const LAB_GLOW = Object.freeze({ max: 1, windowMs: 1000, bloomGap: 1200 });

/**
 * One gate per screen for the lab's own brightenings: allow('glow') for a cloud glow (the thunderheads'
 * or the rain deck's, counted together), allow('bloom') for a bead's bloom. Realm pulses have their own
 * gate (env.gate, 2 a second), so realm and lab together stay within 3 bright events a second.
 * The resolve bloom (≥ 1.6 s, once per weather) does not ask.
 */
export function labGlowGate(now = () => performance.now()) {
  return new FlashGate({ max: LAB_GLOW.max, windowMs: LAB_GLOW.windowMs, bright: ['glow'], gaps: { bloom: LAB_GLOW.bloomGap }, now });
}
const SHAFT_SLANT = 0.08;   // light falls a little from the left
const HAZE_K = 0.35;        // the sun's overcast haze never covers more than this

export class WeatherLayer {
  /**
   * @param {{wrap:HTMLElement, screen:HTMLElement, quality?:string, reducedMotion?:boolean, palette?:object|null}} o
   *   palette: Comfort DNA colours ({glow, soft, deep}) that tint stars, moonlight, ribbons, embers and warm swells.
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
    this._go = { dpr: 1 };   // glowSprite options, reused
    this._o = { alpha: 1, warm: 0, blend: 'lighter', W: 1, H: 1, t: 0, dpr: 1, go: this._go, reduced: this.reduced, light: false, floorY: 0, horizonY: 0,
      slant: SHAFT_SLANT, deckY: 0, aff: 0, body: null };
    this._fo = { alpha: 1, body: null, fade: 0, top: null, arc: 0 };
    this._tinies = {};
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
    if (this.sp) this.sp.tint = weatherTints(this.realmPalette, this.tone, this.palette);
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
  /** Comfort DNA's palette changed: the tints follow at once (no sprite rebuild). */
  setPalette(p) {
    this.palette = p || null;
    if (this.sp) this.sp.tint = weatherTints(this.realmPalette, this.tone, this.palette);
  }

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

  // a tiny canvas the size of a FieldGrid (one putImageData a frame, drawn scaled up)
  _tiny(name, grid) {
    let t = this._tinies[name];
    if (!t || t.c.width !== grid.cols || t.c.height !== grid.rows) {
      if (t) { t.c.width = 0; t.c.height = 0; }
      const c = document.createElement('canvas');
      c.width = grid.cols; c.height = grid.rows;
      const g = c.getContext('2d');
      t = this._tinies[name] = { c, g, img: g ? g.createImageData(grid.cols, grid.rows) : null };
    }
    return t;
  }

  _opts() {
    const s = this.scene, o = this._o;
    o.W = s.W; o.H = s.H; o.t = s.t; o.dpr = this.back.dpr; this._go.dpr = o.dpr; o.reduced = this.reduced;
    o.blend = glowBlend(this.tone); o.light = this.tone === 'light';
    o.floorY = s.geo.floorY; o.horizonY = s.geo.horizonY; o.deckY = s.sims.rain.deckY; o.body = s.geo.body; o.aff = 0;
    return o;
  }

  _drawBack(g) {
    const s = this.scene, sp = this.sp;
    if (!s || !sp) return;
    const o = this._opts(), fo = this._fo, d = this.drawn, fade = s.fade, st = s.storm, sims = s.sims, T = sp.tint;
    d.puffs = 0; d.drops = 0; d.beads = 0; d.stars = 0; d.ribbons = 0; d.embers = 0; d.crests = 0;
    o.alpha = fade;
    fo.alpha = fade; fo.body = s.geo.body;
    // stars and the lines that stay (held clusters go on the front canvas when there is one)
    if (sims.stars.amount > 0.001) {
      drawConstellations(g, sims.stars, sp, o);
      o.aff = this._aff('starlight');
      d.stars = drawStars(g, sims.stars, sp, o, this.front ? 0 : 2);
      o.aff = 0;
    }
    // beams from the realm's sun or moon, and the overcast haze the sun burns away
    if (sims.sun.amount > 0.01) {
      drawBeam(g, s.sunAt[0], s.sunAt[1], sims.sun, sp, o);
      fo.fade = 0.4; fo.top = null; fo.arc = 0;
      drawField(g, sims.sun.haze, this._tiny('haze', sims.sun.haze), T.haze, HAZE_K * smoothstep(0, 1, sims.sun.amount), fo);
    }
    if (sims.moon.amount > 0.01) drawBeam(g, s.moonAt[0], s.moonAt[1], sims.moon, sp, o);
    // the thunderheads' back bands and the rain deck
    o.warm = st.warm;
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
    o.warm = 0;
    // fog: it rises from and sinks to the floor; the Mallow glows like a lantern inside it
    if (sims.mist.amount > 0.001) {
      fo.fade = 0.5; fo.top = s.mistTop; fo.arc = this._aff('fog');
      drawField(g, sims.mist.grid, this._tiny('mist', sims.mist.grid), T.mist, s.mistK, fo);
      drawHalo(g, s.geo.body, T.sun, s.lantern, o, 1.25);
    }
    // silk currents and seed fluffs
    if (sims.ribbons.amount > 0.01) {
      o.aff = this._aff('wind');
      d.ribbons = drawRibbons(g, sims.ribbons, sp, o);
      o.aff = 0;
      drawFluffs(g, sims.fluffs, sp, o);
    }
    // water (swells, the light's glitter path) and puddles
    if (s.water) {
      d.crests = drawWater(g, sims.waves, s.water[0], s.water[1], sp, o);
      drawGlitter(g, sims.sun, s.water[0], sims.waves, sp, o);
      drawGlitter(g, sims.moon, s.water[0], sims.waves, sp, o);
    }
    drawPuddles(g, sims.puddles, s.puddleRip, sp, o);
    // light pools, and the glow behind the Mallow (basking, moonlit, the hearth)
    if (sims.sun.amount > 0.01) { o.aff = this._aff('sunshine'); drawPool(g, sims.sun, sp, o); }
    if (sims.moon.amount > 0.01) { o.aff = this._aff('moonlight'); drawPool(g, sims.moon, sp, o); }
    o.aff = 0;
    if (s.halo.a > 0.004) drawHalo(g, s.geo.body, T[s.halo.kind] || T.sun, s.halo.a * fade, o);
    // embers and the warm ribbon a drag lays
    if (sims.embers.amount > 0.001) {
      o.aff = this._aff('warm');
      d.embers = drawEmbers(g, sims.embers, sp, o);
      o.aff = 0;
    }
    drawTrail(g, s.trail, sp, o);
    // near rain, touch rings, the idle affordance, held things on the low tier, dew, then the front veil
    o.alpha = fade * s.rainAlpha;
    d.drops += drawRain(g, sims.rain, sp, 0.5, 1.01, o);
    o.alpha = fade;
    drawRings(g, s.rings, sp, o);
    if (s.affordance === 'storm' || s.affordance === 'rain') { o.alpha = fade * s.affordanceA; drawAffordance(g, s.affordance, sims, sp, o); o.alpha = fade; }
    if (!this.front) d.beads = drawBeads(g, sims.rain, sp, o);
    drawDew(g, s.dew, sp, o);
    if (s.front.on) drawFront(g, s.front, o);
  }

  _drawFront(g) {
    const s = this.scene, sp = this.sp;
    if (!s || !sp) return;
    const o = this._opts();
    o.alpha = s.fade;
    if (s.sims.stars.amount > 0.001) drawStars(g, s.sims.stars, sp, o, 1);
    this.drawn.beads = drawBeads(g, s.sims.rain, sp, o);
  }

  _aff(w) { const s = this.scene; return s.affordance === w ? s.affordanceA : 0; }

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
    for (const k in this._tinies) { const t = this._tinies[k]; t.c.width = 0; t.c.height = 0; }
    this._tinies = {};
    this.scene = null;
  }
}
