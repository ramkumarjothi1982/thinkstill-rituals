// Hushflow dev lab (localhost only): play a world inside the real shell.
//
//   index.html?hushflow=static-storm
//     &text=My%20boss%20embarrassed%20me     the person's words (default: an example)
//     &emotion=angry&intention=calm&intensity=0.7
//     &photos=3          sample photos (0 = the seven Mallow cards)
//     &motion=reduce     reduced motion for this lab session only (the saved pref is untouched)
//     &autoflow=1        Auto-flow on
//     &next=<worldId>    force the next world (e.g. static-storm, or dev-realm for a melt test; lab-only worlds: moonmilk-cove)
//     &q=fixed | 0..3    quality: no governor / a fixed level
//     &resume=1          resume saved progress
//
// Uses the existing MallowRig as the hero Mallow and the placeholders in
// placeholders.js behind the W2 / W3 interfaces. Exposes window.__hushflow for QA.

import { createHushflow } from './director.js';
import { WORLDS, createRegistry, STATUS } from './registry.js';
import { rigMallow, createPlaceholderThought, createLabSubtitles } from './placeholders.js';

const WORDS_EMOTION = { angry: 'anger', frustrated: 'anger', anxious: 'fear', overwhelmed: 'fear', restless: 'fear', sad: 'sadness', lonely: 'loneliness' };

// A dev-only fixture world: just a realm backdrop, to test a melt into something different.
const DEV_REALM = {
  id: 'dev-realm', title: 'Dev fixture: Blue Drift backdrop', status: STATUS.DEV, realm: 'blue-drift', horizon: 0.57, palette: { sky: '#5ec8f2', deep: '#1a6fb5' },
  purpose: 'QA only', technique: {}, evidence: {}, scene: 'blue-drift realm', touch: [], mallow: { id: 'loomi' }, input: {}, progression: [], dialogue: {}, discoveries: {},
  sound: { ambience: 'blue-drift' }, haptics: [], completion: {}, transition: {}, memory: {}, accessibility: {}, playtest: {}, fits: { emotions: { other: 1 }, intentions: {} }, next: [],
  load: async () => ({
    create(ctx) {
      let core = null; let rings = 0;
      return {
        async prepare() { const { createRealmCore } = await import('../../world/realm.js'); core = createRealmCore('blue-drift', { W: ctx.W, H: ctx.H, dpr: ctx.dprBack, emotion: 'calm' }); core.build(); },
        get backCanvas() { return core?.canvas || null; },
        enter() {}, intro() {}, outro() {},
        frame(dt) { core.frame(dt * 1000); const g = ctx.front.g; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); },
        pointer(s) { if (s.type === 'down') { core.pulse('ripple', { x: s.x, y: s.y }); rings++; } },
        get progress() { return 0; }, get complete() { return false; }, get metrics() { return { rings }; },
        resize(w, h, { dprBack } = {}) { core?.resize(w, h, dprBack); core?.build(); },
        serialize() { return { v: 1 }; }, restore() {}, pause() {}, resume() {}, destroy() { core?.destroy(); },
      };
    },
  }),
};

// Lab-only worlds (not in WORLDS until the coordinator switches them on): playable here from the lab's own list.
const LAB_WORLDS = {
  'moonmilk-cove': () => import('./worlds/moonmilk-cove.js').then((m) => ({ ...m.MOONMILK_COVE, status: STATUS.PLAYABLE })),
};

export async function hushflowLab(app, qs) {
  const worldId = qs.get('hushflow');
  const forceNext = qs.get('next') || null;
  const labWorlds = await Promise.all([...new Set([worldId, forceNext])].filter((id) => LAB_WORLDS[id]).map((id) => LAB_WORLDS[id]()));
  const registry = createRegistry([...WORLDS, ...labWorlds, ...(forceNext === 'dev-realm' ? [DEV_REALM] : [])]);
  const entry = registry.get(worldId);
  if (!entry || !registry.playable(worldId)) { console.warn(`[hushflow lab] no playable world "${worldId}"`); return false; }

  // &motion=reduce|full overrides reduced motion for this lab session only (the saved pref is untouched)
  const motionQ = qs.get('motion');
  const reducedOverride = motionQ === 'reduce' ? true : motionQ === 'full' ? false : null;
  const emotion = qs.get('emotion') || 'angry';
  const intention = qs.get('intention') || 'calm';
  const intensity = Number(qs.get('intensity') || 0.7);
  const text = qs.has('text') ? qs.get('text') : 'My boss embarrassed me today.';
  const reduced = reducedOverride ?? app.prefs.reducedMotion();

  history.replaceState({ i: 0 }, '', location.search + '#hushflow');
  document.title = `${entry.title} · hushmallow`;
  const sceneEl = document.getElementById('scene');
  sceneEl.replaceChildren();
  const worldEl = document.getElementById('world');
  const fxEl = document.getElementById('fx-layer');
  const layer = document.getElementById('mallow-layer');

  // ---- the hero Mallow, standing on the storm floor: the same size and place as the
  // Hushfold shell gives it in a world (hushfold.js layout(), worldMode), never CSS-scaled
  const placeMallow = () => {
    const vh = innerHeight, vw = innerWidth;
    const B = Math.max(130, Math.min(vw * 0.58, vh * 0.27, 300));
    const lw = B / 0.64, lh = lw * 1.1;
    const bodyCy = Math.min(vh * 0.885, vh - 76) - B / 2;
    const layerCy = bodyCy - 0.098 * lw;
    layer.style.setProperty('--mw', `${Math.round(lw)}px`);
    layer.style.setProperty('--mh', `${Math.round(lh)}px`);
    layer.style.setProperty('--mx', '50');
    layer.style.setProperty('--my', String((layerCy / vh) * 100));
    layer.style.setProperty('--ms', '1');
  };
  placeMallow();
  addEventListener('resize', placeMallow);
  await app.world.setMallow(entry.mallow?.id || 'glitzi', { entrance: false });
  if (reducedOverride != null) { try { app.world.setReducedMotion?.(reducedOverride); } catch { /* optional */ } }
  app.world.setEmotion({ frustrated: 0.6, excited: 0.2, curious: 0.2 }, 0.7, { instant: true });
  const mallow = rigMallow(app.world);

  // ---- photos (or the seven Mallow cards) and the person's words
  const [{ photoApi, photoSession, addPhotoCanvases }, { mallowMaterial }, { createWords }] = await Promise.all([
    import('../../v3/photos.js'), import('../../v3/mallow-cards.js'), import('../../v3/words.js'),
  ]);
  const nPhotos = Number(qs.get('photos') || 0);
  if (nPhotos > 0) { const { samplePhotos } = await import('../../v3/dev/sample-photos.js'); photoSession.clear(); addPhotoCanvases(samplePhotos(nPhotos)); }
  const fallback = await mallowMaterial(entry.mallow?.id || 'glitzi').catch(() => []);
  const photos = photoApi({ dpr: Math.min(2, devicePixelRatio || 1), seed: 11, fallback });
  const words = createWords({ text, emotions: WORDS_EMOTION[emotion] ? [{ id: WORDS_EMOTION[emotion] }] : [] });

  let fontPx = (px, w) => `${w} ${px}px "HM Nunito Sans", system-ui, sans-serif`;
  try { const t = await import('../../ui/type.js'); fontPx = t.canvasFontPx || fontPx; await t.fontsReady?.(['voice', 'ui', 'story'], 1500); } catch { /* fallback font */ }
  // a Thought Mallow only for words the person actually typed (never from the feeling's fallback token)
  const thought = words.own ? createPlaceholderThought({ words, emotion, font: fontPx, dpr: Math.min(2, devicePixelRatio || 1) }) : null;

  // ---- subtitles (W3 stand-in) — appended to body so #scene's touch rule never applies to them
  let director = null;
  // lines, discoveries and choices live in the band the world keeps clear (director.subtitleBand())
  const subtitles = createLabSubtitles({ root: document.body, band: () => director?.subtitleBand() || null, avoid: () => director?.avoid() || [] });

  const q = qs.get('q');
  director = createHushflow({
    app, worldEl, fxEl, mallow, thought, subtitles, photos, words, prefs: app.prefs, store: app.store, registry,
    forceNext, quality: q === 'fixed' || /^[0-3]$/.test(q || '') ? 'fixed' : 'auto', debug: qs.get('debug') === '1',
    ...(reducedOverride != null ? { reducedMotion: reducedOverride } : {}),
  });
  if (/^[0-3]$/.test(q || '')) director.debug.setQuality(Number(q));
  if (qs.get('autoflow') === '1') director.setAutoFlow(true);
  else if (qs.get('autoflow') === '0') director.setAutoFlow(false);

  // ---- the input router stand-in: hero Mallow first, then the world
  fxEl.classList.add('live');
  fxEl.style.touchAction = 'none';
  director.bindPointer(fxEl, { claim: (e) => (mallow.hitTest(e.clientX, e.clientY) ? mallow.forward(e) : false) });

  // ---- a minimal lab bar: pause / resume and Auto-flow (the real side panel is W3's)
  const bar = labBar({ director, reduced });
  const log = [];
  // QA: every line spoken, in order (text only, for the lab's own log)
  const sayOrig = subtitles.say.bind(subtitles);
  subtitles.say = (lines, o = {}) => { log.push({ ev: 'say', t: Math.round((director?.debug.time || 0) * 100) / 100, kind: o.kind || 'dialogue', lines: [].concat(lines) }); return sayOrig(lines, o); };
  for (const ev of ['world', 'discovery', 'offer', 'complete', 'melt', 'pause', 'resume', 'stay', 'finish', 'quality', 'error', 'checkpoint', 'loop']) {
    director.on(ev, (d) => { log.push({ ev, t: Math.round(director.debug.time * 100) / 100, ...(d && typeof d === 'object' ? JSON.parse(JSON.stringify(d, (k, v) => (k === 'error' ? String(v) : v))) : {}) }); });
  }
  // (W4b) the hero changes at the melt's midpoint, while the two worlds blend (as the shell should): Glitzi → Loomi
  director.on('melt', (d) => {
    if (d?.k !== 0) return;
    const id = registry.get(d.to)?.mallow?.id;
    if (!id || id === app.world.mallowId) return;
    const tick = () => {
      const m = director.state.melt;
      if (m == null) return;
      if (m >= 0.5) { Promise.resolve(app.world.setMallow(id, { entrance: false })).catch(() => {}); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  // the world's name, once, as a title card in the subtitle band (as the shell does)
  director.on('world', (d) => { if (!d.from && d.title) subtitles.say([d.title], { kind: 'title' }); });
  // the Memory Garden offer belongs to W5; the lab only shows that it would be offered
  // (held while it is open, as the shell does from H2: nothing melts by itself and the world's completion waits)
  director.on('offer', (d) => {
    director.hold?.('offer', true);
    import('../skills.js').then((m) => m.SKILLS?.[d.skillId]?.title || m.skillTitle?.(d.skillId)).catch(() => null).then((title) => {
      return subtitles.choice(title ? `Keep this? ${title}` : 'Keep this discovery?', [{ label: 'Not now', value: 'no' }, { label: 'Keep it', value: 'keep' }])
        .then((v) => log.push({ ev: 'offer-answer', value: v, skillId: d.skillId }));
    }).catch(() => {}).finally(() => director.hold?.('offer', false));
  });

  await director.start({ emotion, intention, intensity, input: { text }, worldId, resume: qs.get('resume') === '1' });
  thought?.react('appear');
  if (thought) document.fonts?.ready?.then(() => thought.refreshLabel?.());

  window.__hushflow = { director, mallow, thought, subtitles, photos, words, log, registry, bar, get world() { return director.world; }, get rig() { return app.world?.rig || null; } };
  window.__hushflowReady = true;
  return true;
}

function labBar({ director }) {
  const bar = document.createElement('div');
  Object.assign(bar.style, { position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 14px)', right: '16px', zIndex: '5', display: 'flex', gap: '8px', pointerEvents: 'none' });
  const btn = (label, aria) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label; b.setAttribute('aria-label', aria);
    Object.assign(b.style, {
      pointerEvents: 'auto', minWidth: '44px', height: '44px', padding: '0 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,.22)',
      background: 'rgba(16,12,44,.5)', backdropFilter: 'blur(14px)', webkitBackdropFilter: 'blur(14px)', color: '#fff',
      font: '700 14px/1 var(--ff-ui, "HM Manrope", system-ui, sans-serif)', cursor: 'pointer',
    });
    bar.append(b);
    return b;
  };
  const flow = btn('', 'Auto-flow');
  const pause = btn('❙❙', 'Pause');
  const sync = () => { flow.textContent = director.autoFlow ? 'Auto-flow on' : 'Auto-flow off'; flow.setAttribute('aria-pressed', String(director.autoFlow)); };
  flow.onclick = () => { director.setAutoFlow(!director.autoFlow); sync(); };
  pause.onclick = () => {
    if (director.state.paused) { director.resume(); pause.textContent = '❙❙'; pause.setAttribute('aria-label', 'Pause'); }
    else { director.pause(); pause.textContent = '▶'; pause.setAttribute('aria-label', 'Resume'); }
  };
  sync();
  document.body.append(bar);
  return { el: bar, sync };
}
