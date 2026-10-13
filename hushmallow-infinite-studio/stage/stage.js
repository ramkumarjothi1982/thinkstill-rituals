// Hushmallow Studio stage: composes one frame at a time from the approved
// engines (Hushfold realm + Mallow rig) and the studio's own layers.
//
// Frame pipeline
//   direct    the video's timeline sets realm mood/transform, the Mallow's
//             pose/gaze/impulses, camera and grade for time t
//   simulate  realm.step(dt), actor.tick(dt)  (fixed 1/fps, deterministic)
//   compose   realm → contact shadow → backlight halo → back bubbles →
//             Mallow (+ moonlight shading + rim light) → front bubbles →
//             foreground bokeh → grade (bloom, tint, vignette) → captions → grain
//
// window.__stage = { ready, info, renderFrame(i) → PNG data URL, cues }

import { clock } from './components/clock.js';   // must stay first
import { RealmBackdrop } from './components/realm-backdrop.js';
import { MallowActor } from './components/mallow-actor.js';
import { Grade } from './components/grade.js';
import { clamp, lerp, rgba, makeCanvas, rng, TAU } from './components/anim.js';

const OUT_W = 1080, OUT_H = 1920;
const WORLD_W = 720, WORLD_H = 1280;
const BASE_K = OUT_W / WORLD_W;   // 1.5 frame px per world px at zoom 1

async function loadFonts() {
  const url = new URL('../../hushmallow/assets/fonts/fredoka-latin.woff2', import.meta.url).href;
  const face = new FontFace('Fredoka', `url(${url}) format("woff2")`, { weight: '500 700', style: 'normal' });
  // the rig's glyph particles ("z", "!") ask for SF Pro Rounded; on a render
  // box that falls back to a system face, so alias it to the brand's Fredoka
  const alias = new FontFace('SF Pro Rounded', `url(${url}) format("woff2")`, { weight: '500 900', style: 'normal' });
  await Promise.all([face.load(), alias.load()]);
  document.fonts.add(face);
  document.fonts.add(alias);
  await Promise.all([500, 600, 700].map((w) => document.fonts.load(`${w} 40px Fredoka`)));
  await document.fonts.load('800 40px "SF Pro Rounded"');
}

class Stage {
  constructor() {
    this.out = document.getElementById('out');
    this.octx = this.out.getContext('2d');
    this.frameC = makeCanvas(OUT_W, OUT_H);
    this.fctx = this.frameC.getContext('2d');
    this.litC = makeCanvas(OUT_W, OUT_H);
    this.lctx = this.litC.getContext('2d');
    this.rimC = makeCanvas(OUT_W, OUT_H);
    this.rctx = this.rimC.getContext('2d');
    this.haloC = makeCanvas(OUT_W / 2, OUT_H / 2);
    this.hctx = this.haloC.getContext('2d');
    this.grade = new Grade(OUT_W, OUT_H);
    this.cues = [];
    this.curves = [];
    this.frameIndex = -1;
  }

  async init(video) {
    this.video = video;
    await loadFonts();
    const v = video.meta;
    this.fps = v.fps;
    this.realm = RealmBackdrop.mount(document.getElementById('realm-host'), v.realm, {
      mood: video.initialMood, transform: 0, groundY: v.groundY, dpr: v.realmDpr || 1.8,
    });
    this.actor = await MallowActor.create(document.getElementById('rig-host'), v.mallow, {
      // shadow + aura come from the stage's own light passes instead
      fit: v.fit, baseline: v.groundY, shadow: false, aura: false, skinHeadroom: v.skinHeadroom || 1.35,
    });
    this.cues.length = 0;
    await video.setup(this);
    // pre-roll the world (not recorded) so the realm's bubbles, clouds and
    // easers are alive on frame 0, and the Mallow's springs are settled
    this.realm.settle();
    const dt = 1 / this.fps;
    const pre = v.preroll ?? 90;
    for (let i = 0; i < pre; i++) {
      const tp = (i - pre) / this.fps;     // negative time: the world before frame 0
      video.direct(tp, dt, this, { preroll: true });
      this.realm.step(1000 * dt);
      this.tickActor(tp, dt);
    }
    return this;
  }

  cue(t, type, data = {}) { this.cues.push({ t: +t.toFixed(4), type, ...data }); }

  // ---------------------------------------------------------- camera --
  // frame = centre + k·R(roll)·(world − focus); k = BASE_K·zoom
  cameraMatrix(cam, zoomScale = 1, pivot = null) {
    const k = BASE_K * cam.zoom;
    const c = Math.cos(cam.roll || 0), s = Math.sin(cam.roll || 0);
    let a = k * c, b = k * s, cc = -k * s, d = k * c;
    let e = OUT_W / 2 + (cam.ox || 0) - (a * cam.x + cc * cam.y);
    let f = OUT_H / 2 + (cam.oy || 0) - (b * cam.x + d * cam.y);
    const m = new DOMMatrix([a, b, cc, d, e, f]);
    if (zoomScale !== 1 && pivot) {
      // differential (dolly) scale about a world pivot: background grows less than the subject
      return m.translate(pivot.x, pivot.y).scale(zoomScale).translate(-pivot.x, -pivot.y);
    }
    return m;
  }

  /** Scale a world→frame matrix about the frame centre just enough that the
   *  whole frame shows painted world (no edges revealed by roll or shake). */
  coverWorld(m) {
    const inv = m.inverse();
    const c = inv.transformPoint(new DOMPoint(OUT_W / 2, OUT_H / 2));
    let s = 1;
    for (const [x, y] of [[0, 0], [OUT_W, 0], [0, OUT_H], [OUT_W, OUT_H]]) {
      const p = inv.transformPoint(new DOMPoint(x, y));
      if (p.x < 0) s = Math.max(s, (c.x - p.x) / Math.max(1, c.x));
      if (p.x > WORLD_W) s = Math.max(s, (p.x - c.x) / Math.max(1, WORLD_W - c.x));
      if (p.y < 0) s = Math.max(s, (c.y - p.y) / Math.max(1, c.y));
      if (p.y > WORLD_H) s = Math.max(s, (p.y - c.y) / Math.max(1, WORLD_H - c.y));
    }
    if (s <= 1.0001) return m;
    return new DOMMatrix().translate(OUT_W / 2, OUT_H / 2).scale(s).translate(-OUT_W / 2, -OUT_H / 2).multiply(m);
  }

  // ----------------------------------------------------------- frame --
  renderFrame(i, { capture = true } = {}) {
    const fps = this.fps, dt = 1 / fps, t = i / fps;
    this.frameIndex = i;
    clock.step(1000 * dt);
    const d = this.video.direct(t, dt, this, { frame: i });
    if (d.audio) this.curves.push({ t: +t.toFixed(4), ...d.audio });
    // stage camera → realm parallax (subtle depth while the camera drifts)
    const cam = d.camera;
    this.realm.camera(-(cam.x - 360) * 0.35 + (cam.parX || 0), -(cam.y - 760) * 0.18 + (cam.parY || 0));
    this.realm.step(1000 * dt);
    this.tickActor(t, dt);
    if (!capture) return null;
    this.compose(t, d);
    return this.out.toDataURL('image/png');
  }

  /** Timeline only (no simulation/compose): the cue log + audio curves. */
  dryRun(frames) {
    const dt = 1 / this.fps;
    for (let i = 0; i < frames; i++) {
      const t = i / this.fps;
      clock.step(1000 * dt);
      const d = this.video.direct(t, dt, this, { frame: i, dry: true });
      if (d.audio) this.curves.push({ t: +t.toFixed(4), ...d.audio });
    }
    return { cues: this.cues, curves: this.curves };
  }

  // the live app runs the rig near 60 Hz; two substeps per 30 fps frame
  // reproduce its soft-body integration (squash spring is one Euler step)
  tickActor(t, dt) {
    const SUB = this.video.meta.substeps || 2;
    for (let s = 0; s < SUB; s++) {
      const ts = t + (s * dt) / SUB;
      if (this.video.substep) this.video.substep(ts, dt / SUB, this);
      this.actor.tick(dt / SUB);
    }
  }

  compose(t, d) {
    const F = this.fctx, A = this.actor, R = this.realm;
    const cam = d.camera;
    const M = this.cameraMatrix(cam);
    const m = A.bodyMetrics;
    const pivot = { x: m.cx, y: A.BASE };
    // background zooms only bgDepth as much as the subject (dolly parallax)
    const bgK = cam.bgDepth ?? 0.55;
    const bgM = this.coverWorld(this.cameraMatrix(cam, (1 + (cam.zoom - 1) * bgK) / cam.zoom, pivot));

    F.setTransform(1, 0, 0, 1, 0, 0);
    F.globalCompositeOperation = 'source-over';
    F.globalAlpha = 1;
    F.fillStyle = '#07061f';
    F.fillRect(0, 0, OUT_W, OUT_H);

    // 1. realm (background), dolly-scaled about the Mallow's feet
    F.setTransform(bgM);
    F.imageSmoothingEnabled = true;
    F.imageSmoothingQuality = 'high';
    const bleed = 40;
    F.drawImage(R.canvas, 0, 0, WORLD_W, WORLD_H);
    // bleed guard for roll/shake: mirror-free extension using edge stretch
    F.drawImage(R.canvas, 0, 0, 2, R.canvas.height, -bleed, 0, bleed, WORLD_H);
    F.drawImage(R.canvas, R.canvas.width - 2, 0, 2, R.canvas.height, WORLD_W, 0, bleed, WORLD_H);
    F.drawImage(R.canvas, 0, R.canvas.height - 2, R.canvas.width, 2, 0, WORLD_H, WORLD_W, bleed);
    F.drawImage(R.canvas, 0, 0, R.canvas.width, 2, 0, -bleed, WORLD_W, bleed);

    F.setTransform(M);
    // 2. contact shadow + soft ground glow under the Mallow
    this.drawContactShadow(F, m, d);

    // 3. tremble offset (body only) for the Mallow layers
    const tr = d.tremble || 0;
    const jx = tr * (Math.sin(t * 47.0) * 0.6 + Math.sin(t * 31.3) * 0.4) * 1.8;
    const jy = tr * Math.sin(t * 39.7) * 0.6;

    // 4. thought bubbles behind the Mallow
    if (d.drawBack) d.drawBack(F, t);

    // 5. Mallow: lit copy (moonlight shading) + rim light + backlight halo
    this.drawMallow(F, M, d, jx, jy);

    // 6. bubbles in front, world-space extras
    F.setTransform(M);
    if (d.drawFront) d.drawFront(F, t);

    // 7. foreground bokeh (screen space with strong parallax)
    F.setTransform(1, 0, 0, 1, 0, 0);
    if (d.drawForeground) d.drawForeground(F, t, cam);

    // 8. grade → output, captions before grain
    const O = this.octx;
    O.setTransform(1, 0, 0, 1, 0, 0);
    O.globalCompositeOperation = 'source-over';
    O.globalAlpha = 1;
    const g = d.grade;
    const grain = g.grain;
    if (g.glow && g.glow.followMoon) {
      // the cove's moon sits at (0.70 W, 0.285 H) of the world (moonmilk-cove.js)
      const mp = bgM.transformPoint(new DOMPoint(WORLD_W * 0.7, WORLD_H * 0.285));
      g.glow = { ...g.glow, x: mp.x, y: mp.y };
    }
    this.grade.apply(O, this.frameC, { ...g, grain: 0, frame: this.frameIndex });
    if (d.drawOverlay) d.drawOverlay(O, t);
    if (grain > 0) this.grade.apply(O, this.out, { grain, frame: this.frameIndex, bloom: 0, vignette: 0, grainOnly: true });
  }

  drawContactShadow(F, m, d) {
    const lift = m.lift;
    const w = m.w * 0.6 * (1 - Math.min(0.45, lift / 300));
    const a = (d.shadowAlpha ?? 0.5) * (1 - Math.min(0.7, lift / 160));
    F.save();
    F.translate(m.cx, this.actor.BASE + 2);
    F.scale(1, 0.18);
    const g = F.createRadialGradient(0, 0, 0, 0, 0, w);
    g.addColorStop(0, `rgba(12,6,40,${a})`);
    g.addColorStop(0.55, `rgba(16,10,52,${a * 0.55})`);
    g.addColorStop(1, 'rgba(16,10,52,0)');
    F.fillStyle = g;
    F.beginPath(); F.arc(0, 0, w, 0, TAU); F.fill();
    F.restore();
    // ambient bounce: a faint glow of the scene light on the ground around the body
    if (d.groundGlow) {
      F.save();
      F.globalCompositeOperation = 'screen';
      F.translate(m.cx, this.actor.BASE + 4);
      F.scale(1, 0.22);
      const gg = F.createRadialGradient(0, 0, w * 0.6, 0, 0, w * 2.1);
      gg.addColorStop(0, rgba(d.groundGlow.color, d.groundGlow.amount));
      gg.addColorStop(1, rgba(d.groundGlow.color, 0));
      F.fillStyle = gg;
      F.beginPath(); F.arc(0, 0, w * 2.1, 0, TAU); F.fill();
      F.restore();
    }
  }

  drawMallow(F, M, d, jx, jy) {
    const A = this.actor;
    const L = this.lctx, Rr = this.rctx, H = this.hctx;
    const lt = d.light || {};
    // lit copy of the Mallow in frame space
    L.setTransform(1, 0, 0, 1, 0, 0);
    L.globalCompositeOperation = 'source-over';
    L.clearRect(0, 0, OUT_W, OUT_H);
    L.setTransform(M.translate(jx, jy));
    L.imageSmoothingQuality = 'high';
    L.drawImage(A.canvas, 0, 0, WORLD_W, WORLD_H);
    // silhouette-based rim light (crescent on the light-facing edge)
    if (lt.rim && lt.rim.amount > 0.01) {
      Rr.setTransform(1, 0, 0, 1, 0, 0);
      Rr.globalCompositeOperation = 'source-over';
      Rr.clearRect(0, 0, OUT_W, OUT_H);
      Rr.drawImage(this.litC, 0, 0);
      Rr.globalCompositeOperation = 'source-in';
      Rr.fillStyle = lt.rim.color;
      Rr.fillRect(0, 0, OUT_W, OUT_H);
      Rr.globalCompositeOperation = 'destination-out';
      const off = lt.rim.width || 10;
      Rr.drawImage(this.litC, -off * lt.rim.dx, -off * lt.rim.dy);
      // backlight halo (soft, half-res) from the same silhouette
      H.setTransform(1, 0, 0, 1, 0, 0);
      H.globalCompositeOperation = 'source-over';
      H.clearRect(0, 0, this.haloC.width, this.haloC.height);
      H.filter = `blur(${lt.halo?.blur ?? 26}px)`;
      H.drawImage(this.litC, 0, 0, this.haloC.width, this.haloC.height);
      H.filter = 'none';
      H.globalCompositeOperation = 'source-in';
      H.fillStyle = lt.halo?.color || lt.rim.color;
      H.fillRect(0, 0, this.haloC.width, this.haloC.height);
    }
    // moonlight shading on the body (key from the moon side, ink fill opposite)
    if (lt.shade && lt.shade.amount > 0.01) {
      const m = A.bodyMetrics;
      L.setTransform(M);
      L.globalCompositeOperation = 'source-atop';
      const x0 = m.cx + m.w * 0.55 * lt.shade.dx, y0 = m.top + m.h * 0.5 + m.h * 0.55 * lt.shade.dy;
      const x1 = m.cx - m.w * 0.6 * lt.shade.dx, y1 = m.top + m.h * 0.5 - m.h * 0.6 * lt.shade.dy;
      const g = L.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, rgba(lt.shade.key, lt.shade.keyAmount ?? lt.shade.amount * 0.6));
      g.addColorStop(0.45, rgba(lt.shade.key, 0));
      g.addColorStop(0.62, rgba(lt.shade.fill, 0));
      g.addColorStop(1, rgba(lt.shade.fill, lt.shade.amount));
      L.fillStyle = g;
      L.fillRect(m.cx - m.w, m.top - m.h, m.w * 2, m.h * 3);
      // bottom occlusion: the base sits in its own soft shadow
      const og = L.createLinearGradient(0, m.base - m.h * 0.28, 0, m.base);
      og.addColorStop(0, rgba(lt.shade.fill, 0));
      og.addColorStop(1, rgba(lt.shade.fill, (lt.shade.occlusion ?? 0.35)));
      L.fillStyle = og;
      L.fillRect(m.cx - m.w, m.base - m.h * 0.3, m.w * 2, m.h * 0.32);
      L.globalCompositeOperation = 'source-over';
    }
    // composite: halo (behind) → lit Mallow → rim
    F.save();
    F.setTransform(1, 0, 0, 1, 0, 0);
    if (lt.rim && lt.rim.amount > 0.01 && (lt.halo?.amount ?? 0) > 0.01) {
      F.globalCompositeOperation = 'screen';
      F.globalAlpha = lt.halo.amount;
      F.drawImage(this.haloC, 0, 0, OUT_W, OUT_H);
    }
    F.globalCompositeOperation = 'source-over';
    F.globalAlpha = 1;
    F.drawImage(this.litC, 0, 0);
    if (lt.rim && lt.rim.amount > 0.01) {
      F.globalCompositeOperation = 'screen';
      F.globalAlpha = lt.rim.amount;
      F.filter = `blur(${lt.rim.soft ?? 3}px)`;
      F.drawImage(this.rimC, 0, 0);
      F.filter = 'none';
    }
    F.restore();
  }
}

// ------------------------------------------------------------- boot --
const params = new URLSearchParams(location.search);
const videoId = params.get('video') || 'my-brain-at-2am';

const stage = new Stage();
const ready = (async () => {
  const mod = await import(`../videos/${videoId}.js`);
  const video = mod.default;
  await stage.init(video);
  return {
    id: videoId, fps: video.meta.fps, duration: video.meta.duration,
    frames: Math.round(video.meta.duration * video.meta.fps), width: OUT_W, height: OUT_H,
    title: video.meta.title,
  };
})();

window.__stage = {
  ready,
  renderFrame: (i, opts) => stage.renderFrame(i, opts),
  dryRun: (frames) => stage.dryRun(frames),
  get cues() { return stage.cues; },
  get curves() { return stage.curves; },
  stage,
};

// interactive preview: ?play=1 renders in real time-ish for eyeballing
if (params.get('play')) {
  ready.then(async (info) => {
    const hud = document.getElementById('hud');
    for (let i = 0; i < info.frames; i++) {
      stage.renderFrame(i);
      hud.textContent = `${(i / info.fps).toFixed(2)}s  frame ${i}`;
      await new Promise((r) => setTimeout(r, 0));
    }
  });
}
