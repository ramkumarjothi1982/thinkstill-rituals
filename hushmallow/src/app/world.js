// The persistent Hushfold stage: one realm backdrop + one living Mallow that
// stay on screen while scenes change above them.
//
// Seams for the Hushfold scene (all backward compatible; the classic scenes
// call none of them): setLayerSize, bodyRect, setRealm(…, {crossfadeMs}),
// setMallow(id, {entrance, interactive}), releaseMallow(), setHaptics, setLowStim.

import { MALLOWS } from '../mallows/registry.js';
import { MallowRig } from '../mallows/rig.js';

let realmModule = null;
async function realmApi() {
  if (realmModule === null) {
    try { realmModule = await import('../world/realm.js'); } catch (e) { console.warn('Realm engine unavailable', e); realmModule = false; }
  }
  return realmModule || null;
}

export function createWorld({ prefs, audio, haptic = null }) {
  const worldEl = document.getElementById('world');
  const layer = document.getElementById('mallow-layer');
  const fx = document.getElementById('fx-layer');
  let realm = null, realmId = null, realmBox = null;
  let rig = null, mallowId = null;
  let emotion = { mix: { neutral: 1 }, intensity: 0 };
  let hapticsOn = !!prefs.get('haptics');
  let lowStim = !!prefs.get('lowStim');

  const api = {
    get rig() { return rig; },
    get mallowId() { return mallowId; },
    get realm() { return realm; },
    get realmId() { return realmId; },
    get layer() { return layer; },
    fx,

    async setRealm(id, { emotion: e, intensity, crossfadeMs = 900 } = {}) {
      if (id === realmId && realm) return realm;
      realmId = id;
      const mod = await realmApi();
      if (realmId !== id) return realm;          // a newer request won while the engine loaded
      const fade = Math.max(0, Math.round(crossfadeMs));
      const box = document.createElement('div');
      box.className = 'realm-fade';
      box.style.opacity = '0';
      box.style.transitionDuration = `${fade}ms`;
      worldEl.append(box);
      let handle = null;
      if (mod) {
        try {
          handle = mod.mountRealm(box, id, { emotion: e, intensity, reducedMotion: prefs.reducedMotion(), lowStimulation: lowStim });
        } catch (err) { console.warn('Realm failed', err); }
      }
      if (!handle) {
        const m = Object.values(MALLOWS).find((x) => x.realm === id);
        box.style.background = `radial-gradient(120% 80% at 50% 100%, ${m?.colours.glow || '#7fd4ff'}66, ${m?.colours.body || '#2b2163'}55 40%, #0b0820 78%)`;
      }
      requestAnimationFrame(() => { box.style.opacity = '1'; });
      const old = realm, oldBox = realmBox;
      // a realm held still under a Hushflow world stays held across the swap
      if (old?.paused) handle?.pause?.(true);
      realm = handle; realmBox = box;
      setTimeout(() => { old?.destroy?.(); oldBox?.remove(); }, fade + 50);
      audio?.ambience?.(id, {});
      return realm;
    },

    async setMallow(id, { entrance = true, interactive = true } = {}) {
      if (id === mallowId && rig && rig.opts.interactive === interactive) return rig;
      mallowId = id;
      const old = rig;
      const holder = document.createElement('div');
      holder.style.cssText = 'position:absolute;inset:0;';
      layer.append(holder);
      const next = new MallowRig(holder, {
        id, interactive, reducedMotion: prefs.reducedMotion(), audio: prefs.get('sound') ? audio : null,
        haptics: hapticsOn, particles: !lowStim,
        // rigs that support it send haptics through the app's gated channel
        ...(haptic ? { haptic: (k) => { if (hapticsOn) haptic(k); } } : {}),
      });
      rig = next;
      if (old) {
        old.canvas.style.transition = 'opacity 260ms, transform 260ms';
        old.canvas.style.opacity = '0';
        old.canvas.style.transform = 'scale(.9) translateY(12px)';
        setTimeout(() => { old.destroy(); old.container.remove(); }, 280);
      }
      await next.loaded;
      next.setEmotion(emotion.mix, emotion.intensity, { instant: true });
      if (entrance && !prefs.reducedMotion()) next.react('hop');
      return next;
    },

    /**
     * Let the classic rig go (its canvas, its ticker and its listeners) while another
     * Mallow owns the stage (the Hushfold's MallowTouch). The next setMallow(id) builds a
     * fresh rig, as the garden, the classic scenes and the rituals do on enter.
     */
    releaseMallow() {
      if (!rig) return;
      const r = rig;
      rig = null; mallowId = null;
      try { r.destroy(); } catch (e) { console.warn('[world] releaseMallow', e); }
      r.container?.remove();
    },

    setEmotion(mix, intensity = 0.7, opts = {}) {
      emotion = { mix: typeof mix === 'string' ? { [mix]: 1 } : mix, intensity };
      rig?.setEmotion(emotion.mix, intensity, opts);
      const top = Object.entries(emotion.mix).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
      realm?.setEmotion?.(top, intensity);
    },
    setStage(stage, opts) { rig?.setStage(stage, opts); },
    react(kind, opts) { rig?.react(kind, opts); },

    /** x,y in viewport % (centre of the Mallow), scale multiplier */
    place({ x = 50, y = 52, scale = 1, calm = false } = {}) {
      layer.classList.toggle('calm-move', calm || prefs.reducedMotion());
      layer.style.setProperty('--mx', x);
      layer.style.setProperty('--my', y);
      layer.style.setProperty('--ms', scale);
    },
    /** Size and place the Mallow so its whole body fits between two viewport y's (px). */
    fitBetween(topPx, bottomPx, { maxScale = 1, x = 50 } = {}) {
      const H = layer.offsetHeight || 470;
      const avail = Math.max(60, bottomPx - topPx);
      // the rig draws the body from ~22% to ~88% of the layer's height
      const scale = Math.max(0.35, Math.min(maxScale, avail / (0.66 * H)));
      const bodyCentre = (topPx + bottomPx) / 2;
      const layerCentre = bodyCentre - 0.05 * H * scale;
      api.place({ x, y: (layerCentre / innerHeight) * 100, scale });
    },
    /**
     * The Mallow layer's own size in CSS px ({w, h}), so the soft body has room
     * to stretch without a CSS scale (which breaks hit-testing). null restores
     * the default min(86vw,430px) × min(56vh,470px).
     */
    setLayerSize(size) {
      if (size && size.w > 0 && size.h > 0) {
        layer.style.setProperty('--mw', `${Math.round(size.w)}px`);
        layer.style.setProperty('--mh', `${Math.round(size.h)}px`);
      } else {
        layer.style.removeProperty('--mw');
        layer.style.removeProperty('--mh');
      }
    },
    /**
     * Shows or hides the classic Mallow. Hidden is out of reach as well as out of
     * sight: the layer goes inert and aria-hidden, so its rig canvas (tabIndex 0,
     * "Pipzi looks peaceful…") is no Tab stop and is never announced while
     * another Mallow, a card or a screen of its own has the stage.
     */
    showMallow(b) {
      layer.classList.toggle('hidden', !b);
      layer.inert = !b;
      if (b) layer.removeAttribute('aria-hidden'); else layer.setAttribute('aria-hidden', 'true');
    },
    dim(b) { worldEl.classList.toggle('dim', !!b); },
    mallowRect() {
      const r = layer.getBoundingClientRect();
      // the rig draws the body in roughly the middle 64% width, bottom-anchored
      const bodyTop = r.top + r.height * 0.22, bodyBottom = r.top + r.height * 0.88;
      return { left: r.left, top: bodyTop, width: r.width, height: bodyBottom - bodyTop, bottom: bodyBottom, cx: r.left + r.width / 2, cy: (bodyTop + bodyBottom) / 2 };
    },
    /**
     * The Mallow's true body box in client CSS px (from the rig's own framing:
     * S, BASE and the art's bodyBox), correct under any CSS scale of the
     * layer. Falls back to mallowRect() before the rig has measured itself.
     */
    bodyRect() {
      const rg = rig;
      if (!rg?.canvas || !rg.S || !rg.W) return api.mallowRect();
      const r = rg.canvas.getBoundingClientRect();
      if (!r.width || !r.height) return api.mallowRect();
      const kx = r.width / rg.W, ky = r.height / rg.H;
      const [bx0, by0, bx1, by1] = rg.mallow.bodyBox;
      const bw = (bx1 - bx0) * rg.S, bh = (by1 - by0) * rg.S;
      const lift = (rg.body?.hop || 0) * rg.H;
      const left = r.left + (rg.CX - bw / 2) * kx, top = r.top + (rg.BASE - bh - lift) * ky;
      const width = bw * kx, height = bh * ky;
      return { left, top, width, height, right: left + width, bottom: top + height, cx: left + width / 2, cy: top + height / 2 };
    },
    /**
     * Where the body sits in the layer, as shares of the layer's box ({ left, top, right, bottom }, 0…1): the rig's
     * own framing, standing (no hop), so it holds for wherever the layer is being placed, mid-move or not. Before the
     * rig has measured itself, the estimate fitBetween uses.
     */
    bodyFrame() {
      const rg = rig;
      if (!rg?.S || !rg.W || !rg.H || !rg.mallow?.bodyBox) return { left: 0.18, top: 0.22, right: 0.82, bottom: 0.88 };
      const [bx0, by0, bx1, by1] = rg.mallow.bodyBox;
      const bw = (bx1 - bx0) * rg.S, bh = (by1 - by0) * rg.S;
      return { left: (rg.CX - bw / 2) / rg.W, top: (rg.BASE - bh) / rg.H, right: (rg.CX + bw / 2) / rg.W, bottom: rg.BASE / rg.H };
    },
    setAudio(a) { if (rig) rig.opts.audio = a; },
    setReducedMotion(b) { rig?.setReducedMotion(b); realm?.setReducedMotion?.(b); },
    /** Live haptics switch: the rig reads opts.haptics on every touch. */
    setHaptics(b) { hapticsOn = !!b; if (rig) rig.opts.haptics = hapticsOn; },
    /** Low stimulation: no Mallow particles, calmer realm. */
    setLowStim(b) {
      lowStim = !!b;
      if (rig) rig.opts.particles = !lowStim;
      realm?.setLowStimulation?.(lowStim);
    },
  };
  return api;
}
