// The home Mallow above the sign-in card (the account screens and the
// /auth/callback page). It is the person's own Mallow, alive (the same rig
// the app uses), and it reacts gently to what happens on the card:
//
//   idle       listening, a soft smile
//   away       a password field has focus: it closes its eyes (no peeking)
//   busy       waiting for the server: curious, attentive
//   happy      success: one soft hop and a smile, then back to idle
//   concerned  something went wrong: a small worried face, no shake
//
// The holder always carries data-mood (tests and the CSS fallback read it).
// If the rig cannot load (no canvas, art missing) a still picture takes its
// place and the moods become small CSS changes (src/auth/auth.css). Reduced
// motion: no hop, no float; the face still changes, calmly. Decoration only:
// the holder is aria-hidden; every state is also said in words on the card.

export const MOODS = Object.freeze(['idle', 'away', 'busy', 'happy', 'concerned']);
const FACE = Object.freeze({
  idle: { mix: { curious: 0.35, calm: 0.25, happy: 0.4 }, intensity: 0.5 },
  // eyes shut in two soft arcs and a small smile: "I'm not looking"
  away: { mix: { calm: 0.7, happy: 0.3 }, intensity: 0.9, extra: { eyeOpen: 0, closedCurve: -1 } },
  busy: { mix: { curious: 0.7, hopeful: 0.3 }, intensity: 0.55 },
  happy: { mix: { happy: 0.7, excited: 0.3 }, intensity: 0.8 },
  // worried brows, a small flat mouth, no tears or rain
  concerned: { mix: { anxious: 0.6, sad: 0.4 }, intensity: 0.7, extra: { tears: 0, wet: 0, fxRain: 0, mouthSmile: -0.25 } },
});
const HAPPY_MS = 1700;

/** The Mallow id to show: a valid id from the candidates, else Blubi (the softie). */
export function pickMallow(ids, ...candidates) {
  for (const c of candidates) if (typeof c === 'string' && ids.includes(c)) return c;
  return ids.includes('blubi') ? 'blubi' : ids[0];
}

/**
 * createAuthMallow(holder, { id, reducedMotion, lowStim }) →
 *   { mood(name), get mood, setId(id), destroy(), ready: Promise<'rig'|'still'|'none'> }
 * (options.mood: the mood to start in)
 */
export function createAuthMallow(holder, { id = 'blubi', mood: initial = 'idle', reducedMotion = false, lowStim = false, rigModule, registry } = {}) {
  let current = MOODS.includes(initial) ? initial : 'idle', rig = null, still = null, destroyed = false, back = 0, mallowId = id;
  holder.dataset.mood = current;
  holder.setAttribute('aria-hidden', 'true');
  holder.classList.toggle('hm-auth-rm', !!reducedMotion);

  function applyFace() {
    if (!rig?.ready) return;
    const f = FACE[current] || FACE.idle;
    try { rig.setEmotion(f.mix, f.intensity, { quiet: current !== 'happy', extra: f.extra || null }); } catch { /* the face is decoration */ }
  }

  async function mountRig(idNow) {
    const [{ MallowRig }, reg] = await Promise.all([rigModule || import('../mallows/rig.js'), registry || import('../mallows/registry.js')]);
    if (destroyed || idNow !== mallowId) return 'none';
    if (!reg.MALLOWS[idNow]) return 'none';
    const box = document.createElement('div');
    box.className = 'hm-auth-rig';
    holder.replaceChildren(box);
    const r = new MallowRig(box, { id: idNow, interactive: false, reducedMotion, particles: !lowStim, audio: null, haptics: false, haptic: null, fit: 0.78, baseline: 0.9 });
    rig = r;
    await r.loaded;
    if (destroyed || rig !== r) { r.destroy(); return 'none'; }
    if (!r.ready) throw new Error('rig not ready');
    applyFace();
    holder.dataset.kind = 'rig';
    return 'rig';
  }

  async function mountStill(idNow) {
    try {
      const reg = await (registry || import('../mallows/registry.js'));
      if (destroyed || idNow !== mallowId) return 'none';
      const m = reg.MALLOWS[idNow] || reg.MALLOWS.blubi;
      still = document.createElement('img');
      Object.assign(still, { src: m.file, alt: '', width: 300, height: 300, decoding: 'async' });
      holder.replaceChildren(still);
      holder.dataset.kind = 'still';
      return 'still';
    } catch { return 'none'; }
  }

  function mount(idNow) {
    return mountRig(idNow).catch((e) => {
      try { rig?.destroy(); } catch { /* gone */ }
      rig = null;
      if (destroyed) return 'none';
      console.warn('[auth mallow] still picture', e?.message || e);
      return mountStill(idNow);
    });
  }

  const api = {
    get mood() { return current; },
    get id() { return mallowId; },
    get rig() { return rig; },
    /** Change how the Mallow feels: one of MOODS. 'happy' returns to idle by itself. */
    mood(name) {
      if (!MOODS.includes(name) || destroyed) return api;
      clearTimeout(back);
      current = name;
      holder.dataset.mood = name;
      applyFace();
      if (name === 'happy' && rig?.ready) {
        try { rig.react(reducedMotion ? 'nod' : 'success'); } catch { /* decoration */ }
      }
      if (name === 'happy') back = setTimeout(() => { if (current === 'happy') api.mood('idle'); }, HAPPY_MS);
      return api;
    },
    /** Another Mallow (the person picked a new home Mallow): it arrives with a small hop. */
    setId(next) {
      if (!next || next === mallowId || destroyed) return api.ready;
      mallowId = next;
      try { rig?.destroy(); } catch { /* gone */ }
      rig = null;
      api.ready = mount(next).then((k) => { if (k === 'rig' && !reducedMotion) { try { rig?.react('hop'); } catch { /* decoration */ } } return k; });
      return api.ready;
    },
    destroy() { destroyed = true; clearTimeout(back); try { rig?.destroy(); } catch { /* gone */ } rig = null; holder.replaceChildren(); },
    ready: null,
  };
  api.ready = mount(mallowId);
  return api;
}
