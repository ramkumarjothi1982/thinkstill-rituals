// The persistent Hushfold stage: one realm backdrop + one living Mallow that
// stay on screen while scenes change above them.

import { MALLOWS } from '../mallows/registry.js';
import { MallowRig } from '../mallows/rig.js';

let realmModule = null;
async function realmApi() {
  if (realmModule === null) {
    try { realmModule = await import('../world/realm.js'); } catch (e) { console.warn('Realm engine unavailable', e); realmModule = false; }
  }
  return realmModule || null;
}

export function createWorld({ prefs, audio }) {
  const worldEl = document.getElementById('world');
  const layer = document.getElementById('mallow-layer');
  const fx = document.getElementById('fx-layer');
  let realm = null, realmId = null, realmBox = null;
  let rig = null, mallowId = null;
  let emotion = { mix: { neutral: 1 }, intensity: 0 };

  const api = {
    get rig() { return rig; },
    get mallowId() { return mallowId; },
    get realm() { return realm; },
    get realmId() { return realmId; },
    fx,

    async setRealm(id, { emotion: e, intensity } = {}) {
      if (id === realmId && realm) return realm;
      realmId = id;
      const mod = await realmApi();
      const box = document.createElement('div');
      box.className = 'realm-fade';
      box.style.opacity = '0';
      worldEl.append(box);
      let handle = null;
      if (mod) {
        try {
          handle = mod.mountRealm(box, id, { emotion: e, intensity, reducedMotion: prefs.reducedMotion(), lowStimulation: prefs.get('lowStim') });
        } catch (err) { console.warn('Realm failed', err); }
      }
      if (!handle) {
        const m = Object.values(MALLOWS).find((x) => x.realm === id);
        box.style.background = `radial-gradient(120% 80% at 50% 100%, ${m?.colours.glow || '#7fd4ff'}66, ${m?.colours.body || '#2b2163'}55 40%, #0b0820 78%)`;
      }
      requestAnimationFrame(() => { box.style.opacity = '1'; });
      const old = realm, oldBox = realmBox;
      realm = handle; realmBox = box;
      setTimeout(() => { old?.destroy?.(); oldBox?.remove(); }, 950);
      audio?.ambience?.(id, {});
      return realm;
    },

    async setMallow(id, { entrance = true } = {}) {
      if (id === mallowId && rig) return rig;
      mallowId = id;
      const old = rig;
      const holder = document.createElement('div');
      holder.style.cssText = 'position:absolute;inset:0;';
      layer.append(holder);
      const next = new MallowRig(holder, {
        id, reducedMotion: prefs.reducedMotion(), audio: prefs.get('sound') ? audio : null,
        haptics: prefs.get('haptics'), particles: !prefs.get('lowStim') || true,
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
    showMallow(b) { layer.classList.toggle('hidden', !b); },
    dim(b) { worldEl.classList.toggle('dim', !!b); },
    mallowRect() {
      const r = layer.getBoundingClientRect();
      // the rig draws the body in roughly the middle 64% width, bottom-anchored
      const bodyTop = r.top + r.height * 0.22, bodyBottom = r.top + r.height * 0.88;
      return { left: r.left, top: bodyTop, width: r.width, height: bodyBottom - bodyTop, bottom: bodyBottom, cx: r.left + r.width / 2, cy: (bodyTop + bodyBottom) / 2 };
    },
    setAudio(a) { if (rig) rig.opts.audio = a; },
    setReducedMotion(b) { rig?.setReducedMotion(b); realm?.setReducedMotion?.(b); },
  };
  return api;
}
