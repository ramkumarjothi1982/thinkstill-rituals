/* Loop Rodeo — a ThinkStill Reset game (v2: the orbit lasso).
 * Mechanism: circling your thumb in time with a glowing knot is a continuous visuo-motor task that takes up the
 * working memory rumination runs on. The knot orbits once per bar at the player's own "herd speed", and every
 * catch slows the music, so the player's own hand slows down with it. The biggest thought is never forced into
 * the pen: the player holds still with it while it settles (acceptance), then gives it a paddock time to come
 * back to (worry postponement), instead of arguing with it.
 */
(function (env) {
  'use strict';
  const TS = env.TS, A = TS.audio, R = TS.rodeo, h = TS.h, UI = TS.ui, guide = TS.ui.guide;
  Object.assign(TS.game, { id: 'loop-rodeo', mode: 'reset', family: 'INTERRUPT', parent: 'Memory / Replay / Rumination' });
  const TAU = Math.PI * 2;
  const root = TS.root;
  root.classList.add('tsg-rodeo');
  TS.fonts('https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Fredoka:wght@400;500;600;700&family=Rye&display=swap');
  const uid = 'lr' + Math.random().toString(36).slice(2, 7);

  root.insertAdjacentHTML('beforeend', `
  <canvas class="r-world" aria-hidden="true"></canvas>
  <div class="r-loopie" aria-hidden="true"><img alt="" draggable="false"></div>
  <div class="r-say" hidden aria-live="polite"><span class="r-say-text"></span></div>
  <div class="r-banner" hidden></div>
  <div class="r-hud" hidden>
    <div class="r-gauge" role="img" aria-label="Herd speed">
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <path d="M6 36 A26 26 0 0 1 58 36" fill="none" stroke="var(--ui-line)" stroke-width="6" stroke-linecap="round"/>
        <path class="r-gaugearc" d="M6 36 A26 26 0 0 1 58 36" fill="none" stroke="var(--fire)" stroke-width="6" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="40"/>
        <line class="r-needle" x1="32" y1="36" x2="32" y2="14" stroke="var(--ui-fg)" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="32" cy="36" r="3.5" fill="var(--ui-fg)"/>
      </svg>
      <div><span class="r-num r-bpm">120</span><span class="r-unit">Herd BPM</span></div>
    </div>
    <div class="r-tally"><span class="r-num r-pen">0 / 5</span><span class="r-unit">In the pen</span></div>
  </div>
  <div class="r-ringzone" hidden>
    <canvas class="r-ring" aria-hidden="true"></canvas>
    <div class="r-ringtext" aria-hidden="true"><b class="r-ringhead">Ride the knot</b><span class="r-ringsub">Circle with it</span></div>
    <button class="r-ringbtn" type="button" aria-label="Lasso. Circle your thumb round the rope with the glowing knot, or tap when the knot reaches a post. The space bar works too."></button>
    <div class="r-judge" aria-live="polite"></div>
  </div>

  <section class="scene r-camp" aria-label="Loop Rodeo camp">
    <div class="r-titleblock"><h1 class="r-title">Loop Rodeo</h1><p class="r-subtitle">Your thoughts are stampeding. Grab the rope and round them up.</p></div>
    <div class="r-card">
      <div class="r-paddock-note" hidden></div>
      <label class="r-label" for="${uid}-dump">What’s running laps in your head?</label>
      <textarea id="${uid}-dump" class="r-dump" rows="2" maxlength="600" placeholder="e.g. Replaying what I said in the meeting, and what my boss thinks of me…"></textarea>
      <div class="r-chips r-examples" aria-label="Examples"></div>
      <div class="r-row"><div class="r-vibes" role="group" aria-label="Vibe"></div><button class="r-link r-almbtn" type="button">Herd Almanac</button></div>
      <div class="r-row"><button class="r-link r-skip" type="button">Just let me play</button><button class="ts-btn r-saddle" type="button">Saddle up</button></div>
      <p class="r-privacy">Your words shape the herd, then stay in this session. Nothing you type is shared.</p>
    </div>
  </section>

  <section class="scene r-speedsc" hidden aria-label="Herd speed">
    <div class="r-card">
      <h2>How fast is the herd running right now?</h2>
      <div class="r-dial">
        <svg viewBox="0 0 220 128" aria-hidden="true">
          <path d="M14 118 A96 96 0 0 1 206 118" fill="none" stroke="var(--ui-line)" stroke-width="14" stroke-linecap="round"/>
          <path class="r-dialarc" d="M14 118 A96 96 0 0 1 206 118" fill="none" stroke="var(--ui-accent)" stroke-width="14" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="50"/>
          <g class="r-dialneedle" style="transform-origin: 110px 118px; transition: transform 0.25s cubic-bezier(.2,1.4,.4,1)"><line x1="110" y1="118" x2="110" y2="36" stroke="var(--ui-fg)" stroke-width="4" stroke-linecap="round"/></g>
          <circle cx="110" cy="118" r="8" fill="var(--ui-fg)"/>
        </svg>
        <div class="r-dialnum">6</div>
        <div class="r-dialword">Galloping</div>
      </div>
      <input class="r-speed r-before" type="range" min="1" max="10" step="1" value="6" aria-label="Herd speed from 1, grazing, to 10, full stampede">
      <div class="r-row"><span class="r-label">1 grazing</span><span class="r-label">10 stampede</span></div>
      <button class="ts-btn r-loose" type="button">Let ’em loose</button>
    </div>
  </section>

  <section class="scene r-paddocksc" hidden aria-label="Paddock time">
    <div class="r-card">
      <h2>Paddock time</h2>
      <p>The big one doesn’t have to go anywhere. Give it a set time to visit instead. Until then, it grazes.</p>
      <div class="r-slots" role="group" aria-label="Pick a time"></div>
      <div class="r-row"><button class="r-link r-noslot" type="button">Skip for now</button></div>
    </div>
  </section>

  <section class="scene r-endsc" hidden aria-label="The herd is resting">
    <div class="r-card">
      <h2>The herd is resting</h2>
      <p class="r-endsub">Every thought you rounded up, mapped in the stars.</p>
      <div class="r-stats">
        <div class="r-stat"><b class="r-st-tempo">126→60</b><span>Herd BPM</span></div>
        <div class="r-stat"><b class="r-st-pen">5 + 1</b><span>Rounded up</span></div>
        <div class="r-stat"><b class="r-st-sync">80%</b><span>In sync</span></div>
      </div>
      <p class="r-st-paddock" hidden></p>
      <div class="r-after">
        <label class="r-label" for="${uid}-after">How fast is the herd running now?</label>
        <div class="r-afterrow"><input id="${uid}-after" class="r-speed r-afterin" type="range" min="1" max="10" step="1" value="5" aria-label="Herd speed now, 1 to 10"><output class="r-afternum">?</output></div>
        <p class="r-verdict">Move the slider if you want to compare. It stays on this device.</p>
      </div>
      <div class="r-alm r-endalm"></div>
      <div class="r-helpslot"></div>
      <div class="r-actions">
        <button class="ts-btn ts-btn-quiet r-share" type="button">Share card</button>
        <button class="ts-btn ts-btn-quiet r-done" type="button">Done</button>
        <button class="ts-btn r-again" type="button">New herd</button>
      </div>
    </div>
  </section>`);

  const $ = (s) => root.querySelector(s);
  const canvas = $('.r-world'), loopieWrap = $('.r-loopie'), loopieImg = $('.r-loopie img');
  const sayEl = $('.r-say'), sayText = $('.r-say-text'), banner = $('.r-banner');
  const hud = $('.r-hud'), bpmEl = $('.r-bpm'), tallyEl = $('.r-pen'), gaugeArc = $('.r-gaugearc'), gaugeNeedle = $('.r-needle');
  const ringZone = $('.r-ringzone'), ringCanvas = $('.r-ring'), ringBtn = $('.r-ringbtn'), ringHead = $('.r-ringhead'), ringSub = $('.r-ringsub'), judgeEl = $('.r-judge');

  /* ---------------- Loopie ---------------- */
  const EXPR = {
    dizzy: TS.face('loopie', 'E01'), excited: TS.face('loopie', 'E03'), silly: TS.face('loopie', 'E05'), laugh: TS.face('loopie', 'E18'),
    shocked: TS.face('loopie', 'E58'), worried: TS.face('loopie', 'E52'), confused: TS.face('loopie', 'E87'), half: TS.face('loopie', 'E14'),
    calm: TS.face('loopie', 'E12'), happy: TS.face('loopie', 'E24'), surprised: TS.face('loopie', 'E77'), peace: TS.face('loopie', 'E02')
  };
  if (!TS.opts.staticRender) Object.values(EXPR).forEach(src => { const i = new Image(); i.src = src; });
  loopieImg.src = EXPR.dizzy;
  let faceTimer = 0, baseFace = 'dizzy';
  function face(name, ms) {
    TS.cancel(faceTimer);
    if (loopieImg.getAttribute('src') !== EXPR[name]) loopieImg.src = EXPR[name];
    loopieImg.classList.remove('pop'); void loopieImg.offsetWidth; loopieImg.classList.add('pop');
    if (ms) faceTimer = TS.later(() => { if (loopieImg.getAttribute('src') !== EXPR[baseFace]) loopieImg.src = EXPR[baseFace]; }, ms);
  }
  function setBaseFace(name) { baseFace = name; face(name); }

  /* ---------------- world + layout ---------------- */
  const Wd = { w: 0, h: 0, portrait: true, horizon: 0, fire: { x: 0, y: 0 }, track: { cx: 0, cy: 0, rx: 0, ry: 0 }, pen: { x: 0, y: 0, w: 0, h: 0 }, penSlots: [], penGate: null,
    loopie: { x: 0, y: 0, size: 112 }, unit: 0.8, cam: { y: 0, z: 1, shake: 0 }, ringTop: 0, ring: { size: 228, cx: 0, cy: 0, r: 91 }, dusk: 0 };
  let skyCache = null, groundCache = null, mesaFar = null, mesaNear = null, penCache = null, stars = [], clouds = [], palette = {};
  let shooting = null, nextShoot = 6, world = null, ringCtx = null, vignette = null;

  function readPalette() {
    const tk = (n) => TS.token(n);
    palette = {
      skyTop: tk('--sky-top'), skyMid: tk('--sky-mid'), skyLow: tk('--sky-low'), orb: tk('--orb'), orbGlow: tk('--orb-glow'),
      mesaFar: tk('--mesa-far'), mesa: tk('--mesa'), groundTop: tk('--ground-top'), groundBottom: tk('--ground-bottom'), grass: tk('--grass'),
      wood: tk('--wood'), woodDark: tk('--wood-dark'), rope: tk('--rope'), ropeDark: tk('--rope-dark'), sync: tk('--sync'), slack: tk('--slack'),
      dark: TS.scene() === 'dark'
    };
  }

  function layout() {
    const W = root.clientWidth || 390, H = root.clientHeight || 844;
    Wd.w = Math.max(320, W); Wd.h = Math.max(480, H);
    Wd.portrait = Wd.h > Wd.w * 1.05;
    const wide = Wd.w >= 760, short = Wd.h <= 660;
    const size = wide ? 252 : (short ? 196 : 228), bottom = wide ? 24 : (short ? 10 : 16);
    Wd.ring = { size, cx: Wd.w / 2, cy: Wd.h - bottom - size / 2, r: Math.round(size * 0.4) };
    Wd.ringTop = Wd.h - bottom - size;
    Wd.loopie.size = wide ? 140 : (short ? 92 : 112);
    if (Wd.portrait) {
      Wd.horizon = Wd.h * 0.40;
      const groundSpan = Wd.ringTop - 24 - Wd.horizon;
      Wd.fire = { x: Wd.w * 0.52, y: Wd.horizon + groundSpan * 0.56 };
      const rx = Math.min(Wd.w * 0.43, 220);
      Wd.track = { cx: Wd.fire.x, cy: Wd.fire.y, rx, ry: rx * 0.32 };
      Wd.pen = { x: Wd.w * 0.58, y: Wd.horizon + groundSpan * 0.06, w: Wd.w * 0.36, h: Math.max(40, groundSpan * 0.16) };
      Wd.loopie.x = 14 + Wd.loopie.size / 2;
      Wd.loopie.y = Wd.ringTop - Wd.loopie.size * 0.5 + 6;
      Wd.unit = TS.clamp(Wd.w / 370, 0.8, 1.15);
    } else {
      Wd.horizon = Wd.h * 0.45;
      Wd.fire = { x: Wd.w * 0.48, y: Math.min(Wd.h * 0.58, Wd.ringTop - 120) };
      const rx = Math.min(Wd.w * 0.24, 300);
      Wd.track = { cx: Wd.fire.x, cy: Wd.fire.y, rx, ry: rx * 0.3 };
      Wd.pen = { x: Wd.w * 0.68, y: Wd.horizon + 26, w: Math.min(Wd.w * 0.22, 300), h: 62 };
      Wd.loopie.x = Math.max(Wd.loopie.size * 0.7, Wd.fire.x - rx - 140);
      Wd.loopie.y = Wd.fire.y + 26;
      Wd.unit = TS.clamp(Wd.h / 690, 0.9, 1.3);
    }
    readPalette();
    buildCaches();
    layoutPenSlots();
    ringCtx = TS.fitCanvas(ringCanvas, size, size, 2).ctx;
  }

  function mk(cw, ch) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = document.createElement('canvas'); c.width = Math.ceil(cw * dpr); c.height = Math.ceil(ch * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, g, w: cw, h: ch };
  }
  function buildCaches() {
    const w = Wd.w, H = Wd.h;
    const skyH = H * 0.6 + Wd.horizon + 40;
    skyCache = mk(w, skyH);
    {
      const g = skyCache.g, hz = skyH - 40;
      const grad = g.createLinearGradient(0, 0, 0, hz);
      grad.addColorStop(0, palette.skyTop); grad.addColorStop(0.62, palette.skyMid); grad.addColorStop(1, palette.skyLow);
      g.fillStyle = grad; g.fillRect(0, 0, w, skyH);
      const band = g.createLinearGradient(0, hz - H * 0.22, 0, hz + 30);
      band.addColorStop(0, 'rgba(0,0,0,0)'); band.addColorStop(1, palette.dark ? 'rgba(150,110,190,0.28)' : 'rgba(255,200,140,0.35)');
      g.fillStyle = band; g.fillRect(0, hz - H * 0.22, w, H * 0.22 + 40);
      const ox = palette.dark ? w * 0.8 : w * 0.24, oy = palette.dark ? H * 0.6 + Math.min(H * 0.31, Wd.horizon - 70) : hz - Math.min(70, H * 0.08), orr = palette.dark ? 28 : 36;
      const glow = g.createRadialGradient(ox, oy, orr * 0.6, ox, oy, orr * (palette.dark ? 5 : 6));
      glow.addColorStop(0, palette.orbGlow); glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow; g.fillRect(ox - orr * 7, oy - orr * 7, orr * 14, orr * 14);
      g.fillStyle = palette.orb; g.beginPath(); g.arc(ox, oy, orr, 0, TAU); g.fill();
      if (palette.dark) {
        g.fillStyle = 'rgba(200,190,170,0.35)';
        [[-7, -5, 5], [6, 4, 4], [-2, 9, 3], [9, -8, 2.5]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(ox + dx, oy + dy, rr, 0, TAU); g.fill(); });
      }
    }
    clouds = [];
    const rc = TS.rng(31);
    for (let i = 0; i < 4; i++) {
      const cw = 220 + rc() * 200, chh = 90, c = mk(cw, chh);
      c.g.save(); c.g.translate(0, chh / 2); c.g.scale(1, 0.42);
      for (let k = 0; k < 8; k++) {
        const er = 36 + rc() * 50, ex = er + rc() * (cw - 2 * er), ey = (rc() - 0.5) * 30;
        const gg = c.g.createRadialGradient(ex, ey, 0, ex, ey, er);
        gg.addColorStop(0, palette.dark ? 'rgba(160,150,210,0.16)' : 'rgba(255,230,212,0.42)'); gg.addColorStop(1, palette.dark ? 'rgba(160,150,210,0)' : 'rgba(255,230,212,0)');
        c.g.fillStyle = gg; c.g.beginPath(); c.g.arc(ex, ey, er, 0, TAU); c.g.fill();
      }
      c.g.restore();
      clouds.push({ c, x: rc() * w, y: -H * 0.25 + rc() * (H * 0.25 + Wd.horizon * 0.7), v: 4 + rc() * 7 });
    }
    const rnd = TS.rng(7);
    stars = [];
    const count = Math.round((w * (Wd.horizon + H * 0.6)) / 2600);
    for (let i = 0; i < count; i++) stars.push({ x: rnd() * w, y: -H * 0.6 + rnd() * (H * 0.6 + Wd.horizon - 30), r: rnd() < 0.12 ? 1.6 : 0.9 + rnd() * 0.5, p: rnd() * TAU, s: 0.6 + rnd() * 1.8 });
    const mesa = (color, heightMax, seed, flat) => {
      const c = mk(w, heightMax + 30); const g = c.g, rr = TS.rng(seed);
      const mg = g.createLinearGradient(0, 0, 0, heightMax + 30);
      mg.addColorStop(0, shade(color, palette.dark ? 0.06 : 0.08)); mg.addColorStop(1, color);
      g.fillStyle = mg; g.beginPath(); g.moveTo(0, heightMax + 30);
      let x = 0, y = heightMax * (0.55 + rr() * 0.3);
      g.lineTo(0, y);
      while (x < w) {
        const step = 30 + rr() * 90;
        if (flat && rr() < 0.35) {
          const top = heightMax * (0.1 + rr() * 0.3);
          g.lineTo(x + 10, top); g.lineTo(x + step, top + rr() * 6); x += step + 10; g.lineTo(x, heightMax * (0.6 + rr() * 0.3));
        } else { x += step; y = heightMax * (0.45 + rr() * 0.5); g.lineTo(x, y); }
      }
      g.lineTo(w, heightMax + 30); g.closePath(); g.fill();
      return c;
    };
    mesaFar = mesa(palette.mesaFar, Math.min(110, H * 0.12), 11, true);
    mesaNear = mesa(palette.mesa, Math.min(70, H * 0.08), 23, false);
    const gH = H - Wd.horizon + H * 0.9;
    groundCache = mk(w, gH);
    {
      const g = groundCache.g;
      const grad = g.createLinearGradient(0, 0, 0, H - Wd.horizon);
      grad.addColorStop(0, palette.groundTop); grad.addColorStop(1, palette.groundBottom);
      g.fillStyle = grad; g.fillRect(0, 0, w, gH);
      const rg = TS.rng(5); g.strokeStyle = palette.grass; g.lineCap = 'round';
      const tufts = Math.round(w * (H - Wd.horizon) / 900);
      for (let i = 0; i < tufts; i++) {
        const y = Math.pow(rg(), 0.8) * (H - Wd.horizon + 40), x = rg() * w, s = 0.5 + (y / (H - Wd.horizon)) * 1.4;
        g.lineWidth = 1 * s; g.globalAlpha = 0.5 + rg() * 0.5;
        for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * 2 * s, y); g.quadraticCurveTo(x + k * 3 * s, y - 4 * s, x + k * 4.5 * s, y - 7 * s * (0.7 + rg() * 0.6)); g.stroke(); }
      }
      g.globalAlpha = 1;
    }
    const p = Wd.pen;
    penCache = mk(p.w + 20, p.h + 40);
    {
      const g = penCache.g, ox = 10, oy = 26, pw = p.w, ph = p.h;
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(ox + pw / 2, oy + ph * 0.62, pw * 0.52, ph * 0.5, 0, 0, TAU); g.fill();
      const post = (x, y, s) => { g.fillStyle = palette.woodDark; g.fillRect(x - 2.2 * s, y - 16 * s, 4.4 * s, 18 * s); g.fillStyle = palette.wood; g.fillRect(x - 1.6 * s, y - 16 * s, 2.4 * s, 17 * s); };
      const rail = (x1, y1, x2, y2, s) => { g.strokeStyle = palette.wood; g.lineWidth = 2.6 * s; g.beginPath(); g.moveTo(x1, y1 - 12 * s); g.lineTo(x2, y2 - 12 * s); g.stroke(); g.beginPath(); g.moveTo(x1, y1 - 6 * s); g.lineTo(x2, y2 - 6 * s); g.stroke(); };
      const back = oy + 4, front = oy + ph;
      for (let i = 0; i <= 6; i++) { const x = ox + 8 + (pw - 16) * i / 6; post(x, back, 0.7); if (i) rail(ox + 8 + (pw - 16) * (i - 1) / 6, back, x, back, 0.7); }
      rail(ox + 8, back, ox, front, 0.85); rail(ox + pw - 8, back, ox + pw, front, 0.85);
      post(ox, front, 1); post(ox + pw, front, 1);
      for (let i = 2; i <= 6; i++) { const x = ox + pw * i / 6; post(x, front, 1); if (i > 2) rail(ox + pw * (i - 1) / 6, front, x, front, 1); }
      post(ox + pw / 6, front, 1);
      rail(ox, front, ox + pw / 6, front, 1);
      Wd.penGate = { x1: ox + pw / 6, x2: ox + pw * 2 / 6, y: front };
    }
    vignette = null;
  }
  function layoutPenSlots() {
    const p = Wd.pen, slots = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) slots.push({ x: p.x + p.w * (0.2 + 0.6 * (c + (r % 2) * 0.5) / 3.5), y: p.y + p.h * (0.42 + r * 0.36) });
    Wd.penSlots = slots;
  }
  function shade(hex, amt) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex); if (!m) return hex;
    const f = (v) => Math.round(TS.clamp(parseInt(v, 16) + 255 * amt, 0, 255)).toString(16).padStart(2, '0');
    return '#' + f(m[1]) + f(m[2]) + f(m[3]);
  }

  /* ---------------- critter sprites ---------------- */
  const spriteCache = new Map();
  function critterSprite(loop, variant, scaleIn) {
    const scale = Math.max(0.25, Math.round(scaleIn * 8) / 8);
    const key = loop + ':' + variant + ':' + scale;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const sp = R.SPECIES[loop] || R.SPECIES.other;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), U = scale * dpr;
    const cw = 104, ch = 86, c = document.createElement('canvas');
    c.width = Math.ceil(cw * U); c.height = Math.ceil(ch * U);
    const g = c.getContext('2d'); g.setTransform(U, 0, 0, U, cw * U / 2 - 4 * U, ch * U * 0.56);
    drawCritterBody(g, sp, variant);
    const outS = { c, ox: cw / 2 - 4, oy: ch * 0.56, w: cw, h: ch };
    spriteCache.set(key, outS);
    return outS;
  }
  function drawCritterBody(g, sp, variant) {
    const puffs = [[-15, 3, 11], [-7, -6, 12.5], [4, -8, 12.5], [14, -2, 11], [-10, 7, 10.5], [3, 7, 11], [13, 6, 9.5], [-20, 6, 7], [20, 5, 7]];
    const isCore = variant.includes('core');
    const wool = isCore ? shade(sp.wool, -0.18) : sp.wool, woolB = isCore ? shade(sp.woolB, -0.2) : sp.woolB;
    if (sp.feature === 'frizz') {
      g.fillStyle = woolB; g.beginPath();
      for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, r = i % 2 ? 22 : 27; g.lineTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 0.75); }
      g.closePath(); g.fill();
    }
    g.fillStyle = woolB; puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y + 1.6, r + 1.6, 0, TAU); g.fill(); });
    g.fillStyle = wool; puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    g.fillStyle = 'rgba(255,255,255,0.6)'; [[-9, -10, 4], [2, -12, 3.5], [-17, 0, 2.5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    const hx = 25, hy = -7;
    if (sp.feature === 'droop') { g.fillStyle = shade(sp.face, 0.15); g.beginPath(); g.ellipse(hx - 6, hy + 2, 3.6, 9, 0.35, 0, TAU); g.fill(); }
    else { g.fillStyle = shade(sp.face, 0.1); g.beginPath(); g.ellipse(hx - 7, hy - 7, 6.5, 3.2, -0.6, 0, TAU); g.fill(); g.fillStyle = '#f2a7b5'; g.beginPath(); g.ellipse(hx - 7, hy - 7, 3.8, 1.5, -0.6, 0, TAU); g.fill(); }
    g.fillStyle = sp.face; g.beginPath(); g.ellipse(hx, hy, 9.5, 10.5, 0.12, 0, TAU); g.fill();
    g.fillStyle = wool; [[hx - 4, hy - 9, 5], [hx + 1, hy - 11, 5.5], [hx + 5, hy - 8, 4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    const sleeping = variant.includes('sleep');
    const eyes = [[hx - 1.5, hy - 1.5], [hx + 4.8, hy - 1]];
    if (sleeping) {
      g.strokeStyle = '#1b1220'; g.lineWidth = 1.4; g.lineCap = 'round';
      eyes.forEach(([x, y]) => { g.beginPath(); g.arc(x, y - 0.4, 2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); });
    } else {
      eyes.forEach(([x, y]) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); g.fillStyle = '#1b1220'; g.beginPath(); g.arc(x + 0.8, y + 0.3, 1.7, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 1.4, y - 0.5, 0.6, 0, TAU); g.fill(); });
    }
    if (sp.feature === 'fringe') { g.fillStyle = wool; [[hx - 3, hy - 4, 4.4], [hx + 2, hy - 5, 4.6], [hx + 6.5, hy - 3.5, 3.5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); }
    g.fillStyle = 'rgba(255,140,160,0.55)'; g.beginPath(); g.ellipse(hx + 6, hy + 4, 2.6, 1.6, 0, 0, TAU); g.fill();
    g.strokeStyle = '#1b1220'; g.lineWidth = 1.1; g.beginPath(); g.arc(hx + 3.5, hy + 4.5, 1.8, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
    if (sp.feature === 'horns') {
      g.strokeStyle = '#d4ad72'; g.lineWidth = 2.6; g.lineCap = 'round';
      g.beginPath(); for (let a = 0; a < 4.6; a += 0.2) { const r = 5.5 - a * 0.9; g.lineTo(hx - 6 + Math.cos(a + 3.6) * r, hy - 4 + Math.sin(a + 3.6) * r); } g.stroke();
    }
    if (sp.feature === 'antenna') {
      g.strokeStyle = sp.face; g.lineWidth = 1.3;
      [[hx - 2, -1], [hx + 4, 1]].forEach(([x, d]) => { g.beginPath(); g.moveTo(x, hy - 12); g.quadraticCurveTo(x + d * 4, hy - 19, x + d * 2, hy - 22); g.stroke(); g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(x + d * 2, hy - 22, 1.9, 0, TAU); g.fill(); });
    }
    if (sp.feature === 'tag') { g.fillStyle = '#ffd27a'; g.fillRect(hx - 11, hy - 4, 5, 6); g.strokeStyle = '#2f5a45'; g.lineWidth = 1; g.beginPath(); g.moveTo(hx - 10, hy - 1); g.lineTo(hx - 8.8, hy + 0.4); g.lineTo(hx - 6.8, hy - 2.6); g.stroke(); }
    if (isCore) { g.fillStyle = shade(wool, -0.08); [[-4, -16, 6], [6, -17, 6.5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); }
  }
  function drawLegs(g, sp, x, y, s, phase, facing, pose) {
    g.save(); g.translate(x, y); g.scale(s * facing, s);
    g.strokeStyle = shade(sp.face, -0.12); g.lineCap = 'round'; g.lineWidth = 3.4;
    if (pose === 'sit' || pose === 'rest') {
      g.fillStyle = shade(sp.face, -0.12);
      [[-12, 12], [14, 12]].forEach(([lx, ly]) => { g.beginPath(); g.ellipse(lx, ly, 5, 2.2, 0, 0, TAU); g.fill(); });
    } else {
      [-13, -5, 8, 16].forEach((lx, i) => {
        const sw = Math.sin(phase + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * 0.55;
        g.beginPath(); g.moveTo(lx, 10); g.lineTo(lx + Math.sin(sw) * 9, 10 + Math.cos(sw) * 9); g.stroke();
      });
    }
    g.restore();
  }

  /* ---------------- state ---------------- */
  let herd = null, critters = [], particles = [], constellations = [], motes = [];
  const game = {
    phase: 'camp', text: '', before: 6, after: null, start: 0, perfect: 0, taps: 0, miss: 0, catches: 0,
    target: null, queue: [], penned: 0, total: 0, charge: 0, assist: false, assistOffered: false, lastCatchAt: 0,
    pressTime: 0, syncTime: 0, slackT: 0, slackSaid: false, coreStage: null, hold: 0, holding: false, startBpm: 100, endBpm: 60,
    paddock: null, paddockVisit: false
  };
  const input = { down: false, id: null, key: false, x: 0, y: 0, angle: 0, dist: 0, downAt: 0, downX: 0, downY: 0, moved: 0, speed: 0, lastT: 0, lastX: 0, lastY: 0, tapCredited: false, pendingMiss: null };
  const ringState = { sync: false, assist: false, text: '' };
  const knot = { visible: false, fixed: null, glide: null, idle: -Math.PI / 2, wobble: 0 };
  const posts = [0, 0, 0, 0];
  const lasso = { spin: 0, throwT: -1, dur: 0.22, target: null, miss: false, onDone: null };
  let gateClosed = 0, gateAnim = -1, rollcallCritter = null;
  const tolDeg = () => [55, 42, 32][TS.intensity()];
  const tolRad = () => tolDeg() * Math.PI / 180;
  const lapsNeeded = () => [0.75, 1, 1][TS.intensity()];
  const tapCharge = () => [0.34, 0.25, 0.2][TS.intensity()];

  function makeCritter(c, i, n, isCore) {
    return {
      id: i, label: c.label, loop: c.loop, sp: R.SPECIES[c.loop] || R.SPECIES.other, core: !!isCore,
      theta: (i / Math.max(1, n)) * TAU + Math.PI * 0.5, slot: i, phase: Math.random() * TAU, facing: 1,
      state: 'enter', enter: 0, enterDelay: i * 0.7, x: -60, y: Wd.track.cy, fly: null, bounce: 0, sleep: false, rest: 0, restT: 0,
      jitter: c.loop === 'whatif' ? 1 : 0, announced: false, spin: 0
    };
  }
  function trackPoint(theta) { const t = Wd.track; return { x: t.cx + Math.cos(theta) * t.rx, y: t.cy + Math.sin(theta) * t.ry }; }
  function depthScale(y) { const t = Wd.track; return Wd.unit * (0.78 + 0.32 * TS.clamp((y - (t.cy - t.ry)) / (2 * t.ry), 0, 1.4)); }

  /* ---------------- clock (audio-driven) ---------------- */
  const clock = { running: false, bpm: 100, target: 100, next: 0, index: 0, beats: [], paused: false };
  function startClock(bpm, at) { clock.bpm = clock.target = bpm; clock.next = at; clock.index = 0; clock.beats = []; clock.running = true; lastBeatSeen = null; }
  function vnow() { return A.now() - A.latency(); } // the moment the listener is hearing
  function scheduleBeats() {
    if (!clock.running || clock.paused) return;
    const horizon = A.now() + 0.16;
    while (clock.next < horizon) {
      const t = clock.next, i = clock.index;
      clock.beats.push({ t, i, tapped: i === game.futureTap });
      onBeat(t, i);
      const ease = ['herd', 'core'].includes(game.phase) ? 0.16 : 0.3;
      clock.bpm += (clock.target - clock.bpm) * ease;
      clock.next += 60 / clock.bpm;
      clock.index++;
    }
    if (clock.beats.length > 16) clock.beats.splice(0, clock.beats.length - 16);
  }
  function beatWindow() {
    const vt = vnow();
    let prev = null, next = null;
    for (const b of clock.beats) { if (b.t <= vt) prev = b; else { next = b; break; } }
    if (!next) next = { t: clock.next, i: clock.index };
    if (!prev) prev = { t: next.t - 60 / clock.bpm, i: next.i - 1 };
    return { prev, next, p: TS.clamp((vt - prev.t) / Math.max(0.05, next.t - prev.t), 0, 1) };
  }
  function clockAngle() { const { prev, p } = beatWindow(); const bp = prev.i + p; return -Math.PI / 2 + TAU * ((((bp % 4) + 4) % 4) / 4); }
  function knotAngle() {
    if (knot.fixed != null) return knot.fixed + (knot.wobble ? Math.sin(performance.now() / 40) * 0.03 * knot.wobble : 0);
    if (clock.running) return clockAngle();
    return knot.idle;
  }
  const isRopePhase = () => game.phase === 'herd' || (game.phase === 'core' && game.coreStage === 'rope');

  /* ---------------- music ---------------- */
  const PROG = [
    { bass: ['G2', 'D3'], chord: ['G3', 'B3', 'D4', 'G4'] },
    { bass: ['E2', 'B2'], chord: ['E3', 'G3', 'B3', 'E4'] },
    { bass: ['C3', 'G2'], chord: ['G3', 'C4', 'E4', 'G4'] },
    { bass: ['D3', 'A2'], chord: ['A3', 'D4', 'F#4', 'A4'] }
  ];
  const PENTA = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6'];
  function onBeat(t, i) {
    if (!A.ctx) return;
    const ph = game.phase;
    const bar = Math.floor(i / 4), beat = ((i % 4) + 4) % 4, ch = PROG[((bar % 4) + 4) % 4];
    const soft = TS.intensity() === 0 ? 0.75 : 1;
    if (ph === 'countin') {
      A.wood(t, beat === 0 ? 0.32 : 0.22, beat === 0 ? 1.25 : 1);
      if (beat === 0) A.pluck(A.note(ch.bass[0]), { when: t, vol: 0.3, damp: 0.994, lp: 900, bus: 'music' });
      return;
    }
    if (ph === 'herd') {
      A.drum(t, (beat === 0 ? 0.26 : 0.16) * soft, beat === 0 ? 0.92 : 1.05);
      if (beat === 0 || beat === 2) A.pluck(A.note(ch.bass[beat === 0 ? 0 : 1]), { when: t, vol: 0.34 * soft, damp: 0.993, lp: 1000, bus: 'music' });
      if (beat === 1 || beat === 3) ch.chord.forEach((n, k) => A.pluck(A.note(n), { when: t + k * 0.022, vol: 0.12 * soft, damp: 0.996, bus: 'music', pan: (k - 1.5) * 0.15 }));
      const half = 30 / clock.bpm;
      if (TS.intensity() > 0) A.shaker(t + half, 0.045 * soft);
      if (Math.random() < 0.08 && critters.some(c => c.state === 'run')) A.bleat({ when: t + half * 0.5, pitch: 0.85 + Math.random() * 0.4, vol: 0.08, pan: Math.random() * 1.2 - 0.6 });
      return;
    }
    if (ph === 'core') {
      A.drum(t, 0.12 * soft, 0.8);
      A.pluck(A.note(ch.chord[beat]), { when: t, vol: 0.14, damp: 0.997, bus: 'music', verb: 0.3 });
      if (beat === 0) A.pluck(A.note(ch.bass[0]), { when: t, vol: 0.3, damp: 0.995, lp: 800, bus: 'music' });
      if (game.holding) A.tone({ when: t, type: 'sine', freq: 98, dur: 0.6, vol: 0.12, attack: 0.04, bus: 'music' });
    }
  }
  let whirr = null, amb = null;
  function startAmbience() { if (A.ctx && !amb) amb = A.ambience('prairie'); }
  TS.on('audio-ready', () => { startAmbience(); if (!whirr) whirr = A.loop({ pink: false, filter: 'bandpass', freq: 700, q: 1.6 }); });
  TS.onDestroy(() => { if (whirr) whirr.stop(); });

  /* ---------------- camera ---------------- */
  let camTween = null, duskTween = null;
  function camTo(y, z, d, cb) {
    if (TS.reduced()) { Wd.cam.y = y; Wd.cam.z = z; camTween = null; if (cb) cb(); return; }
    camTween = { t: 0, d, fy: Wd.cam.y, ty: y, fz: Wd.cam.z, tz: z, cb };
  }
  function duskTo(v, d) { duskTween = { t: 0, d: TS.reduced() ? 0.01 : d, f: Wd.dusk, to: v }; }
  function campCam() { return Wd.portrait ? -Math.min(Wd.h * 0.2, Wd.fire.y - Wd.h * 0.4) : -Math.min(Wd.h * 0.15, Wd.fire.y - Wd.h * 0.44); }

  /* ---------------- update ---------------- */
  let embersTimer = 0, lastBeatSeen = null;
  function update(dt, t) {
    if (camTween) {
      camTween.t += dt;
      const k = TS.ease.inOutCubic(TS.clamp(camTween.t / camTween.d, 0, 1));
      Wd.cam.y = TS.lerp(camTween.fy, camTween.ty, k); Wd.cam.z = TS.lerp(camTween.fz, camTween.tz, k);
      if (camTween.t >= camTween.d) { const cb = camTween.cb; camTween = null; if (cb) cb(); }
    }
    if (duskTween) { duskTween.t += dt; const k = TS.clamp(duskTween.t / duskTween.d, 0, 1); Wd.dusk = TS.lerp(duskTween.f, duskTween.to, TS.ease.inOutSine(k)); if (k >= 1) duskTween = null; }
    Wd.cam.shake = Math.max(0, Wd.cam.shake - dt * 3);
    posts.forEach((v, k) => { posts[k] = Math.max(0, v - dt * 3.2); });
    if (knot.glide) {
      knot.glide.t += dt;
      const k = TS.ease.outCubic(TS.clamp(knot.glide.t / knot.glide.d, 0, 1));
      knot.fixed = TS.lerp(knot.glide.from, knot.glide.to, k);
      if (k >= 1) knot.glide = null;
    }
    knot.wobble = Math.max(0, knot.wobble - dt * 2);
    beatCrossings();
    updateRope(dt);
    updateStill(dt);
    if (lasso.throwT >= 0) {
      lasso.throwT += dt;
      if (lasso.throwT >= lasso.dur) { const cb = lasso.onDone; lasso.throwT = -1; lasso.target = null; lasso.onDone = null; if (cb) cb(); }
    }
    if (gateAnim >= 0) { gateAnim += dt; gateClosed = TS.clamp(gateAnim / 0.5, 0, 1); if (gateClosed >= 1) gateAnim = -1; }
    const bpm = clock.running ? clock.bpm : (game.phase === 'speed' ? 72 + game.before * 6 : 70);
    const omega = TAU / 8 * (bpm / 60);
    const active = critters.filter(c => c.state === 'run' || c.state === 'enter' || c.state === 'target');
    active.forEach((c, k) => { c.slot = k; });
    const n = Math.max(1, active.length);
    critters.forEach(c => {
      c.phase += dt * (bpm / 60) * TAU * (c.core ? 0.7 : 1);
      if (c.state === 'enter') {
        c.enterDelay -= dt;
        if (c.enterDelay <= 0) {
          c.enter = Math.min(1, c.enter + dt * 1.2);
          const p = trackPoint(c.theta), from = { x: -80, y: Wd.track.cy + Wd.track.ry * 0.4 }, k = TS.ease.outCubic(c.enter);
          c.x = TS.lerp(from.x, p.x, k); c.y = TS.lerp(from.y, p.y, k); c.facing = 1;
          if (c.enter >= 1) c.state = 'run';
          if (!c.announced && c.enter > 0.05) { c.announced = true; if (game.phase === 'rollcall') announce(c); }
        }
      } else if (c.state === 'run' || c.state === 'target') {
        const lead = active[0] ? active[0].theta - (active[0].slot / n) * TAU : 0;
        const desired = lead + (c.slot / n) * TAU, diff = ((desired - c.theta) % TAU + TAU * 1.5) % TAU - TAU / 2;
        const speedMul = c.core ? 0.55 * (1 - game.hold * 0.95) : 1;
        c.theta += omega * dt * speedMul + diff * dt * 0.8;
        const p = trackPoint(c.theta);
        const nx = p.x + (c.jitter && !TS.reduced() ? Math.sin(t * 23 + c.id) * 1.2 : 0), ny = p.y;
        if (Math.abs(nx - c.x) > 0.2) c.facing = nx > c.x ? 1 : -1;
        c.x = nx; c.y = ny;
        if (c.core && game.hold > 0.3) {
          const k = TS.ease.inOutSine(TS.clamp((game.hold - 0.3) / 0.7, 0, 1));
          const rest = { x: Wd.fire.x - Wd.track.rx * 0.42, y: Wd.fire.y + Wd.track.ry * 0.55 };
          c.x = TS.lerp(p.x, rest.x, k); c.y = TS.lerp(p.y, rest.y, k); c.facing = 1;
        }
        if (!TS.reduced() && Math.random() < dt * (bpm / 60) * 1.5 * (c.core ? 0.5 : 1)) dust(c.x - c.facing * 10 * depthScale(c.y), c.y + 10 * depthScale(c.y), 1);
      } else if (c.state === 'fly') {
        const f = c.fly; f.t += dt;
        const k = TS.clamp(f.t / f.d, 0, 1);
        c.x = TS.lerp(f.x0, f.x1, k); c.y = TS.lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * f.arc;
        c.spin = TS.reduced() ? 0 : k * TAU * c.facing;
        if (k >= 1) { c.state = 'pen'; c.bounce = 1; c.spin = 0; dust(c.x, c.y + 6, 6); if (A.ctx) A.thud({ vol: 0.25 }); }
      } else if (c.state === 'pen') {
        c.bounce = Math.max(0, c.bounce - dt * 2.5);
        c.restT += dt;
        if (!c.sleep && c.restT > 2.2) c.sleep = true;
      } else if (c.state === 'rest') {
        c.rest = Math.min(1, c.rest + dt * 0.8);
      }
    });
    embersTimer += dt;
    const emberRate = [0.09, 0.06, 0.035][TS.intensity()] * (TS.reduced() ? 2 : 1);
    while (embersTimer > emberRate) { embersTimer -= emberRate; particles.push({ kind: 'ember', x: Wd.fire.x + (Math.random() - 0.5) * 14, y: Wd.fire.y - 10, vx: (Math.random() - 0.5) * 10, vy: -26 - Math.random() * 30, life: 1.6 + Math.random() * 1.6, age: 0, r: 0.8 + Math.random() * 1.5 }); }
    particles.forEach(p => {
      p.age += dt;
      if (p.kind === 'ember') { p.x += (p.vx + Math.sin(p.age * 3 + p.r * 9) * 8) * dt; p.y += p.vy * dt; }
      else { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
    });
    particles = particles.filter(p => p.age < p.life);
    if (particles.length > 260) particles.splice(0, particles.length - 260);
    constellations.forEach(cs => { if (cs.started) cs.t += dt; });
    updateMotes(dt);
    if (game.phase === 'herd' && !game.assist && !game.assistOffered && performance.now() - game.lastCatchAt > (TS.intensity() === 0 ? 10000 : 15000)) offerAssist();
  }
  function dust(x, y, n) { for (let i = 0; i < n; i++) particles.push({ kind: 'dust', x, y, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 16, life: 0.5 + Math.random() * 0.5, age: 0, r: 2 + Math.random() * 3 }); }

  /* ---------------- the orbit lasso ---------------- */
  function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
  function inSync() {
    if (!(input.down || input.key) || !isRopePhase()) return false;
    if (game.assist) return true;
    if (input.key) return false;
    const r = Wd.ring.r;
    if (input.dist < r * 0.35 || input.dist > r * 1.8) return false;
    return Math.abs(angDiff(input.angle, knotAngle())) < tolRad();
  }
  function updateRope(dt) {
    const live = isRopePhase();
    const sync = live && inSync();
    ringState.sync = sync; ringState.assist = game.assist;
    if (live && (input.down || (input.key && game.assist))) {
      game.pressTime += dt;
      const lap = 4 * 60 / Math.max(30, clock.bpm);
      if (sync) {
        game.charge += dt / (lap * lapsNeeded());
        game.syncTime += dt; game.slackT = 0;
      } else {
        game.charge = Math.max(0, game.charge - dt * 0.06);
        game.slackT += dt;
        if (game.slackT > 2.4 && !game.slackSaid) {
          game.slackSaid = true;
          face('worried', 1200); say(TS.line(R.LINES.slack), 2200);
          guide.set({ id: 'slack-' + game.penned, g: 'circle', target: ringCenterPoint, r: Wd.ring.r, label: 'FOLLOW THE KNOT', delay: 0 });
        }
      }
      if (game.charge >= 1) { game.charge = 0; if (game.phase === 'herd') throwLasso(); else coreBounce(); }
    }
    if (whirr) {
      const speed = TS.clamp(input.speed / 900, 0, 1.4);
      whirr.level(live && input.down ? (sync ? 0.05 + speed * 0.05 : 0.018) : 0.0001, 0.05);
      whirr.freq(500 + speed * 900 + (sync ? 300 : 0), 0.08);
    }
    if (live) {
      if (game.assist) setRingText('Hold the rope', 'Any touch counts now');
      else if (!input.down) setRingText(game.phase === 'core' ? 'Rope the big one' : 'Ride the knot', 'Circle with it, or tap the posts');
      else setRingText(sync ? 'In sync' : 'Catch the knot', sync ? 'Keep circling' : 'Follow the glow', sync ? 'sync' : 'slack');
    }
  }
  function setRingText(head, sub, mood) {
    const key = head + '|' + sub + '|' + (mood || '');
    if (ringState.text === key) return;
    ringState.text = key;
    ringHead.textContent = head; ringSub.textContent = sub;
    ringHead.style.color = mood === 'sync' ? 'var(--sync)' : mood === 'slack' ? 'var(--slack)' : '';
  }
  const ringCenterPoint = () => ({ x: Wd.ring.cx, y: Wd.ring.cy });

  function beatCrossings() {
    if (!clock.running || clock.paused) return;
    const { prev } = beatWindow();
    if (!prev || prev.i === lastBeatSeen) return;
    const crossed = lastBeatSeen !== null && prev.i > lastBeatSeen && clock.beats.includes(prev);
    lastBeatSeen = prev.i;
    if (!crossed) return;
    const k = ((prev.i % 4) + 4) % 4;
    posts[k] = 1;
    A.sync('beat-visual', performance.now(), prev.t);
    if (isRopePhase() && (input.down || input.key) && inSync()) {
      game.perfect++;
      if (A.ctx) { A.pluck(A.note(PENTA[Math.min(PENTA.length - 1, Math.floor(game.charge * 5) + Math.floor(game.penned / 2))]), { vol: 0.16, damp: 0.995, bus: 'sfx', verb: 0.25 }); A.sync('perfect-beat', performance.now()); }
      if (k === 0) showJudge('In sync', 'perfect');
    }
  }

  /* Taps on the posts (keyboard and anyone who'd rather tap than trace). */
  function judgeTap(fromKey) {
    if (!isRopePhase()) return false;
    const tap = vnow();
    let best = null, bd = Infinity;
    for (const b of clock.beats) { const d = Math.abs(tap - b.t); if (d < bd) { bd = d; best = b; } }
    const nextD = Math.abs(clock.next - tap);
    if (nextD < bd) { best = { t: clock.next, i: clock.index, tapped: false, future: true }; bd = nextD; }
    if (!best) return false;
    const interval = 60 / clock.bpm;
    const inten = TS.intensity();
    const perfectW = [0.1, 0.075, 0.06][inten] + interval * 0.04;
    const goodW = [0.2, 0.16, 0.13][inten] + interval * 0.05;
    const actionAt = performance.now();
    if (best.tapped) return false;
    if (bd <= goodW || game.assist) {
      best.tapped = true;
      if (best.future) game.futureTap = best.i;
      game.taps++;
      game.charge += tapCharge();
      const k = ((best.i % 4) + 4) % 4; posts[k] = 1;
      const grade = bd <= perfectW ? 'perfect' : 'good';
      if (A.ctx) { A.pluck(A.note(PENTA[Math.min(PENTA.length - 1, game.taps % 6 + 1)]), { vol: 0.2, damp: 0.995, verb: 0.2 }); A.sync('tap', actionAt); }
      showJudge(grade === 'perfect' ? 'Perfect' : 'Nice', grade);
      TS.buzz(10);
      if (game.charge >= 1) { game.charge = 0; if (game.phase === 'herd') throwLasso(); else coreBounce(); }
      return true;
    }
    const signed = tap - best.t;
    if (fromKey) { game.miss++; showJudge(signed < 0 ? 'Early' : 'Late', 'miss'); if (A.ctx) { A.boing({ vol: 0.07, freq: 260 }); A.sync('tap-miss', actionAt); } }
    else input.pendingMiss = signed < 0 ? 'Early' : 'Late';
    return false;
  }
  function showJudge(text, kind) {
    judgeEl.textContent = text;
    judgeEl.style.color = kind === 'perfect' ? 'var(--judge-perfect)' : kind === 'good' ? 'var(--judge-good)' : kind === 'count' ? 'var(--ui-fg)' : 'var(--judge-miss)';
    judgeEl.classList.remove('show'); void judgeEl.offsetWidth; judgeEl.classList.add('show');
  }
  function offerAssist() {
    game.assistOffered = true;
    const b = h('button', { type: 'button', class: 'ts-btn ts-btn-quiet r-assist', text: 'Ride along (no timing)' });
    b.style.bottom = (Wd.h - Wd.ringTop + 18) + 'px';
    b.addEventListener('click', () => { game.assist = true; b.remove(); UI.toast('Any touch on the rope counts now. Enjoy the ride.'); TS.track('assist', {}); });
    root.append(b);
    TS.later(() => b.remove(), 12000);
  }

  /* Ring input. */
  function ringLocal(e) {
    const r = ringZone.getBoundingClientRect();
    const scale = ringZone.offsetWidth ? r.width / ringZone.offsetWidth : 1;
    return { x: (e.clientX - r.left) / scale - Wd.ring.size / 2, y: (e.clientY - r.top) / scale - Wd.ring.size / 2 };
  }
  function trackInput(e) {
    const p = ringLocal(e), now = performance.now();
    const dtm = Math.max(1, now - input.lastT);
    const v = Math.hypot(p.x - input.lastX, p.y - input.lastY) / dtm * 1000;
    input.speed = input.lastT ? input.speed * 0.7 + v * 0.3 : 0;
    input.lastT = now; input.lastX = p.x; input.lastY = p.y;
    input.x = p.x; input.y = p.y; input.dist = Math.hypot(p.x, p.y); input.angle = Math.atan2(p.y, p.x);
    input.moved = Math.max(input.moved, Math.hypot(p.x - input.downX, p.y - input.downY));
  }
  ringBtn.addEventListener('pointerdown', (e) => {
    if (input.down || TS.destroyed) return;
    e.preventDefault();
    A.unlock();
    try { ringBtn.setPointerCapture(e.pointerId); } catch (err) { /* old browser */ }
    input.down = true; input.id = e.pointerId; input.lastT = 0; input.speed = 0; input.moved = 0; input.pendingMiss = null;
    const p = ringLocal(e); input.downX = p.x; input.downY = p.y;
    trackInput(e);
    input.downAt = performance.now();
    pressStart(false);
  });
  ringBtn.addEventListener('pointermove', (e) => { if (input.down && e.pointerId === input.id) trackInput(e); });
  const pointerEnd = (e) => {
    if (!input.down || (e && e.pointerId !== input.id)) return;
    input.down = false; input.speed = 0;
    if (input.pendingMiss && performance.now() - input.downAt < 260 && input.moved < 14 && isRopePhase()) {
      game.miss++; showJudge(input.pendingMiss, 'miss'); if (A.ctx) A.boing({ vol: 0.06, freq: 260 });
    }
    input.pendingMiss = null;
    pressEnd();
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => ringBtn.addEventListener(ev, pointerEnd));
  TS.listen(window, 'keydown', (e) => {
    if (!(e.code === 'Space' || e.code === 'Enter') || e.repeat) return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT' || (ae.tagName === 'BUTTON' && ae !== ringBtn))) return;
    if (!(root.contains(ae) || ae === document.body || !ae)) return;
    if (!['countin', 'herd', 'core'].includes(game.phase)) return;
    e.preventDefault();
    A.unlock();
    input.key = true;
    pressStart(true);
  });
  TS.listen(window, 'keyup', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && input.key) { input.key = false; pressEnd(); } });

  function pressStart(fromKey) {
    guide.progress();
    if (game.phase === 'countin') { if (A.ctx) { A.drum(undefined, 0.25); A.sync('press', performance.now()); } return; }
    if (isRopePhase()) { judgeTap(fromKey); return; }
    if (game.phase === 'core' && game.coreStage === 'still') stillPress(fromKey);
  }
  function pressEnd() {
    if (game.phase === 'core' && game.coreStage === 'still' && game.holding) { game.holding = false; }
  }

  /* Catching. */
  function throwLasso() {
    const c = game.target; if (!c || lasso.throwT >= 0) return;
    lasso.target = c; lasso.throwT = 0; lasso.dur = 0.22; lasso.miss = false;
    c.state = 'target';
    lasso.onDone = () => catchCritter(c);
    const at = performance.now();
    if (A.ctx) { A.whoosh({ vol: 0.2, dur: 0.25, from: 300, to: 3600 }); A.sync('catch', at); }
    guide.progress();
  }
  function catchCritter(c) {
    const slot = Wd.penSlots[game.penned % Wd.penSlots.length];
    c.state = 'fly';
    c.fly = { t: 0, d: TS.reduced() ? 0.45 : 0.8, x0: c.x, y0: c.y, x1: slot.x, y1: slot.y, arc: Math.max(80, Math.abs(c.y - slot.y) + 60) };
    game.penned++; game.catches++; game.lastCatchAt = performance.now(); game.slackSaid = false;
    renderTally();
    if (A.ctx) { A.pop({ freq: 620, vol: 0.2 }); A.bleat({ pitch: 1.15, vol: 0.18 }); }
    TS.buzz([18, 40, 18]);
    if (TS.intensity() === 2) Wd.cam.shake = 0.6;
    const k = game.penned / game.total;
    clock.target = TS.lerp(game.startBpm, game.endBpm + 4, k);
    setBaseFace(k < 0.34 ? 'excited' : k < 0.67 ? 'half' : 'calm');
    face('laugh', 900);
    showJudge('Caught!', 'perfect');
    if (game.penned === 1 || game.penned === 3 || game.penned === game.total) say(lines('catch'), 1700);
    banner.hidden = true;
    TS.later(() => { if (game.phase === 'herd') nextTarget(); }, 380);
  }
  function renderTally() { tallyEl.textContent = game.penned + ' / ' + game.total; }

  /* ---------------- the big one ---------------- */
  async function startCore() {
    game.phase = 'core'; game.coreStage = 'arrive'; game.charge = 0;
    clock.target = game.endBpm;
    const c = game.coreCritter;
    c.state = 'enter'; c.enter = 0; c.enterDelay = 0.2; c.theta = Math.PI * 0.6;
    critters.push(c);
    game.target = c;
    setBaseFace('calm'); face('surprised', 1800);
    if (A.ctx) { A.tone({ type: 'sine', freq: 55, to: 45, dur: 1.4, vol: 0.4, attack: 0.05 }); A.bleat({ pitch: 0.55, vol: 0.2, dur: 0.8 }); }
    await TS.sleep(900);
    banner.textContent = c.label; banner.classList.add('big'); banner.hidden = false; bannerKey = '';
    game.coreStage = 'rope';
    guide.set({ id: 'core-rope', g: 'circle', target: ringCenterPoint, r: Wd.ring.r, label: 'TRY TO ROPE IT', delay: 300 });
  }
  async function coreBounce() {
    const c = game.coreCritter;
    if (game.coreStage !== 'rope') return;
    game.coreStage = 'bounce';
    lasso.target = c; lasso.throwT = 0; lasso.dur = 0.3; lasso.miss = true;
    lasso.onDone = () => { if (A.ctx) A.boing({ freq: 200, vol: 0.2 }); dust(c.x, c.y + 10, 10); Wd.cam.shake = TS.intensity() ? 0.5 : 0; };
    if (A.ctx) A.whoosh({ vol: 0.2, dur: 0.3, from: 300, to: 2600 });
    face('confused', 2600);
    say(TS.line(R.LINES.bounce), 1600);
    guide.clear();
    await TS.sleep(1700);
    if (game.phase !== 'core') return;
    banner.hidden = true;
    await say(lines('core'), 0);
    await TS.sleep(900);
    if (game.phase !== 'core') return;
    // The knot glides to the top post and stops. Now the only move is to stay with it.
    const cur = knotAngle();
    let to = -Math.PI / 2; while (to < cur) to += TAU;
    knot.glide = { t: 0, d: TS.reduced() ? 0.01 : 1.4, from: cur, to };
    knot.fixed = cur;
    game.coreStage = 'still'; game.hold = 0;
    setRingText('Hold still', 'Thumb on the knot');
    say(TS.line(R.LINES.still), 0);
    guide.set({ id: 'core-still', g: 'still', target: knotPoint, label: 'HOLD STILL ON THE KNOT', ms: 2600, delay: 900 });
  }
  const knotPoint = () => { const a = knotAngle(); return { x: Wd.ring.cx + Math.cos(a) * Wd.ring.r, y: Wd.ring.cy + Math.sin(a) * Wd.ring.r }; };
  function stillPress(fromKey) {
    if (fromKey) { game.holding = true; return; }
    const a = knotAngle(), kx = Math.cos(a) * Wd.ring.r, ky = Math.sin(a) * Wd.ring.r;
    if (Math.hypot(input.x - kx, input.y - ky) < 54) game.holding = true;
    else { knot.wobble = 1; showJudge('On the knot', 'count'); }
  }
  let wobbleSaid = 0;
  function updateStill(dt) {
    if (game.phase !== 'core' || game.coreStage !== 'still') return;
    const beats = 4, dur = beats * 60 / Math.max(40, clock.bpm);
    if (game.holding && input.down) {
      const a = knotAngle(), kx = Math.cos(a) * Wd.ring.r, ky = Math.sin(a) * Wd.ring.r;
      if (Math.hypot(input.x - kx, input.y - ky) > 70) game.holding = false;
    }
    const still = game.holding && (input.key || input.speed < 70);
    if (still) { game.hold = Math.min(1, game.hold + dt / dur); }
    else if (game.holding) {
      knot.wobble = 1;
      if (performance.now() - wobbleSaid > 4000) { wobbleSaid = performance.now(); say(TS.line(R.LINES.wobble), 1600); if (A.ctx) A.noise({ filter: 'lowpass', freq: 500, dur: 0.3, vol: 0.06 }); }
    } else game.hold = Math.max(0, game.hold - dt * 0.1);
    setRingText(still ? 'Stay with it' : 'Hold still', still ? Math.round(game.hold * 100) + '%' : 'Thumb on the knot', still ? 'sync' : '');
    if (whirr) whirr.level(0.0001);
    if (game.hold > 0.05 && !sayEl.hidden && still) sayEl.hidden = true;
    if (game.hold >= 1) finishCore();
  }
  async function finishCore() {
    game.coreStage = 'done'; game.holding = false;
    guide.clear();
    const c = game.coreCritter;
    c.state = 'rest'; c.sleep = true;
    banner.hidden = true;
    clock.running = false;
    setBaseFace('peace');
    const at = performance.now();
    if (A.ctx) {
      A.pad([A.note('G3'), A.note('B3'), A.note('D4'), A.note('G4')], { dur: 5, vol: 0.2, attack: 1.2 });
      A.chime(A.note('G5'), { vol: 0.12, dur: 2.2 });
      A.sync('still-done', at);
    }
    TS.buzz(30);
    game.phase = 'settle';
    ringZone.hidden = true;
    await TS.sleep(700);
    gateAnim = 0;
    if (A.ctx) { A.wood(undefined, 0.3, 0.7); TS.later(() => A.wood(undefined, 0.2, 0.6), 120); }
    await say(lines('close'), 3200);
    await TS.sleep(500);
    if (game.phase !== 'settle') return;
    stage.go('paddock');
  }

  /* ---------------- render ---------------- */
  function draw(t) {
    const g = world.ctx;
    const w = Wd.w, H = Wd.h, cam = Wd.cam;
    const shakeX = cam.shake && !TS.reduced() ? Math.sin(t * 60) * cam.shake * 3 : 0;
    g.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
    g.clearRect(0, 0, w, H);
    g.translate(Wd.fire.x + shakeX, Wd.fire.y); g.scale(cam.z, cam.z); g.translate(-Wd.fire.x, -Wd.fire.y);
    const skyOff = cam.y * 0.35;
    g.drawImage(skyCache.c, 0, -H * 0.6 + skyOff, skyCache.w, skyCache.h);
    if (Wd.dusk > 0.01) { // golden hour deepens to dusk for the finale, so the new stars can be seen
      const dg = g.createLinearGradient(0, -H * 0.6 + skyOff, 0, Wd.horizon + 40);
      dg.addColorStop(0, `rgba(10,14,46,${0.92 * Wd.dusk})`); dg.addColorStop(0.7, `rgba(36,30,86,${0.8 * Wd.dusk})`); dg.addColorStop(1, `rgba(120,70,110,${0.5 * Wd.dusk})`);
      g.fillStyle = dg; g.fillRect(0, -H * 0.6 + skyOff, w, H * 0.6 + Wd.horizon + 40);
    }
    const starA = palette.dark ? 1 : Wd.dusk;
    if (starA > 0.02) {
      g.fillStyle = '#fffaf0';
      for (const s of stars) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
        const y = s.y + skyOff; if (y < -4 || y > H) continue;
        g.globalAlpha = a * 0.9 * starA; g.fillRect(s.x, y, s.r, s.r);
      }
      g.globalAlpha = 1;
    }
    for (const cl of clouds) {
      const x = ((cl.x - t * cl.v) % (w + cl.c.w) + (w + cl.c.w)) % (w + cl.c.w) - cl.c.w;
      g.drawImage(cl.c.c, x, cl.y + skyOff, cl.c.w, cl.c.h);
    }
    if ((palette.dark || Wd.dusk > 0.5) && !TS.reduced() && ['camp', 'finale', 'end', 'speed', 'paddock'].includes(game.phase)) {
      if (!shooting && t > nextShoot) { const r = Math.random(); shooting = { t0: t, x: w * (0.2 + 0.6 * r), y: H * (0.05 + 0.15 * Math.random()) + skyOff * 0.2, len: 90 + 60 * r }; nextShoot = t + 9 + Math.random() * 10; }
      if (shooting) {
        const k = (t - shooting.t0) / 0.8;
        if (k >= 1) shooting = null; else {
          const hx = shooting.x + k * 160, hy = shooting.y + k * 70;
          const tg = g.createLinearGradient(hx, hy, hx - shooting.len * 0.9, hy - shooting.len * 0.4);
          tg.addColorStop(0, `rgba(255,250,235,${0.9 * (1 - k)})`); tg.addColorStop(1, 'rgba(255,250,235,0)');
          g.strokeStyle = tg; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - shooting.len * 0.9, hy - shooting.len * 0.4); g.stroke();
        }
      }
    }
    drawConstellations(g, t, skyOff);
    const skyBottom = -H * 0.6 + skyOff + skyCache.h - 1;
    if (skyBottom < H) { g.fillStyle = palette.skyLow; g.fillRect(0, skyBottom, w, H - skyBottom + 2); }
    const mfY = Wd.horizon - mesaFar.h + 22 + cam.y * 0.6, mnY = Wd.horizon - mesaNear.h + 26 + cam.y * 0.8;
    g.drawImage(mesaFar.c, 0, mfY, mesaFar.w, mesaFar.h);
    g.fillStyle = palette.mesaFar; g.fillRect(0, mfY + mesaFar.h - 1, w, Math.max(0, H - mfY - mesaFar.h + 2));
    g.drawImage(mesaNear.c, 0, mnY, mesaNear.w, mesaNear.h);
    g.fillStyle = palette.mesa; g.fillRect(0, mnY + mesaNear.h - 1, w, Math.max(0, H - mnY - mesaNear.h + 2));
    const gy = cam.y;
    g.drawImage(groundCache.c, 0, Wd.horizon + gy, groundCache.w, groundCache.h);
    if (Wd.dusk > 0.01) { g.fillStyle = `rgba(16,12,40,${0.42 * Wd.dusk})`; g.fillRect(0, mfY, w, H - mfY + 2); }
    g.save(); g.translate(0, gy);
    const flick = 0.85 + Math.sin(t * 7.3) * 0.06 + Math.sin(t * 13.1) * 0.05;
    const lightR = (Wd.portrait ? 170 : 230) * Wd.unit * flick;
    g.globalCompositeOperation = palette.dark || Wd.dusk > 0.3 ? 'lighter' : 'source-over';
    const lg = g.createRadialGradient(Wd.fire.x, Wd.fire.y, 4, Wd.fire.x, Wd.fire.y, lightR);
    lg.addColorStop(0, palette.dark ? 'rgba(255,170,80,0.34)' : 'rgba(255,190,110,0.22)'); lg.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = lg; g.beginPath(); g.ellipse(Wd.fire.x, Wd.fire.y, lightR * 1.25, lightR * 0.55, 0, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.drawImage(penCache.c, Wd.pen.x - 10, Wd.pen.y - 26, penCache.w, penCache.h);
    critters.filter(c => c.state === 'pen').sort((a, b) => a.y - b.y).forEach(c => drawCritter(g, c, t, Wd.unit * 0.62 * (1 + c.bounce * 0.15), 'sit'));
    if (gateClosed > 0) {
      const gt = Wd.penGate, ox = Wd.pen.x - 10, oy = Wd.pen.y - 26, k = TS.ease.outBack(gateClosed);
      g.strokeStyle = palette.wood; g.lineWidth = 2.6; g.beginPath();
      const x1 = ox + gt.x1, x2 = ox + TS.lerp(gt.x1, gt.x2, k), y = oy + gt.y;
      g.moveTo(x1, y - 12); g.lineTo(x2, y - 12); g.moveTo(x1, y - 6); g.lineTo(x2, y - 6); g.stroke();
    }
    const runners = critters.filter(c => c.state === 'run' || c.state === 'target' || c.state === 'enter' || c.state === 'rest');
    runners.filter(c => c.y < Wd.fire.y).sort((a, b) => a.y - b.y).forEach(c => drawRunner(g, c, t));
    drawFire(g, t, flick);
    runners.filter(c => c.y >= Wd.fire.y).sort((a, b) => a.y - b.y).forEach(c => drawRunner(g, c, t));
    critters.filter(c => c.state === 'fly').forEach(c => drawCritter(g, c, t, depthScale(c.y) * 0.9, 'fly'));
    particles.forEach(p => {
      const k = 1 - p.age / p.life;
      if (p.kind === 'ember') { g.fillStyle = `rgba(255,${180 + Math.round(60 * k)},110,${0.85 * k})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
      else { g.fillStyle = palette.dark ? `rgba(160,140,170,${0.28 * k})` : `rgba(140,100,60,${0.25 * k})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1.5 - k * 0.5), 0, TAU); g.fill(); }
    });
    drawLasso(g, t);
    g.restore();
    g.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);
    drawMotes(g, t);
    if (!vignette || vignette.w !== w || vignette.h !== H || vignette.dark !== palette.dark) {
      const vg = g.createRadialGradient(w / 2, H * 0.55, Math.min(w, H) * 0.35, w / 2, H * 0.55, Math.max(w, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, palette.dark ? 'rgba(4,2,12,0.55)' : 'rgba(60,30,10,0.22)');
      vignette = { g: vg, w, h: H, dark: palette.dark };
    }
    g.fillStyle = vignette.g; g.fillRect(0, 0, w, H);
  }

  function drawRunner(g, c, t) {
    const s = depthScale(c.y) * (c.core ? 1.7 : 1);
    if (c === game.target && (game.phase === 'herd' || (game.phase === 'core' && game.coreStage === 'rope'))) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      g.strokeStyle = `rgba(255,210,122,${0.45 + pulse * 0.35})`; g.lineWidth = 2;
      g.beginPath(); g.ellipse(c.x, c.y + 12 * s, 26 * s, 7 * s, 0, 0, TAU); g.stroke();
    }
    drawCritter(g, c, t, s, c.state === 'rest' ? 'rest' : 'run');
  }
  function drawCritter(g, c, t, s, pose) {
    const variant = (c.core ? 'core-' : '') + ((c.sleep || pose === 'rest') ? 'sleep' : 'awake');
    const spr = critterSprite(c.loop, variant, s);
    const bob = pose === 'run' ? -Math.abs(Math.sin(c.phase)) * 3 * s : (pose === 'sit' ? Math.sin(t * 1.5 + c.id) * 0.6 : 0);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(c.x, c.y + 18 * s, 21 * s, 4.5 * s, 0, 0, TAU); g.fill();
    if (pose !== 'fly') drawLegs(g, c.sp, c.x, c.y + bob, s, c.phase, c.facing, pose);
    g.save(); g.translate(c.x, c.y + bob);
    if (c.spin) g.rotate(c.spin);
    if (pose === 'rest') g.scale(1.04, 0.86);
    g.scale(c.facing, 1);
    g.drawImage(spr.c, -spr.ox * s, -spr.oy * s, spr.w * s, spr.h * s);
    g.restore();
    if ((c.sleep || pose === 'rest') && pose !== 'fly' && !c.moted) {
      const k = (t * 0.6 + c.id * 0.37) % 1;
      g.fillStyle = palette.dark ? `rgba(255,250,235,${0.8 * (1 - k)})` : `rgba(60,40,30,${0.6 * (1 - k)})`;
      g.font = `600 ${Math.round(10 * s + 4)}px Fredoka, sans-serif`;
      g.fillText('z', c.x + 18 * s + k * 8, c.y - 18 * s - k * 16);
    }
  }
  function drawFire(g, t, flick) {
    const x = Wd.fire.x, y = Wd.fire.y, s = Wd.unit * (Wd.portrait ? 1 : 1.2);
    g.save(); g.translate(x, y + 8 * s);
    g.fillStyle = palette.woodDark;
    g.rotate(0.28); g.fillRect(-22 * s, -3.5 * s, 44 * s, 7 * s); g.rotate(-0.56); g.fillRect(-22 * s, -3.5 * s, 44 * s, 7 * s);
    g.restore();
    g.fillStyle = 'rgba(255,120,40,0.6)'; g.beginPath(); g.ellipse(x, y + 6 * s, 16 * s, 4 * s, 0, 0, TAU); g.fill();
    g.globalCompositeOperation = 'lighter';
    const layers = [[26, 50, [255, 96, 40], 0.7], [19, 38, [255, 160, 60], 0.85], [10, 24, [255, 236, 170], 0.95]];
    layers.forEach(([fw, fh, rgb, a], k) => {
      for (let j = -1; j <= 1; j++) {
        const hh = fh * s * (j ? 0.62 : 1) * (1 + 0.14 * Math.sin(t * 9 + k * 1.7 + j * 2) + 0.08 * Math.sin(t * 14.3 + k + j));
        const ww = fw * s * (j ? 0.6 : 1), bx = x + j * fw * 0.45 * s, sway = Math.sin(t * 5.2 + k + j * 1.3) * 4 * s;
        const gr = g.createLinearGradient(0, y, 0, y - hh);
        gr.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`); gr.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        g.fillStyle = gr; g.beginPath(); g.moveTo(bx - ww / 2, y);
        g.bezierCurveTo(bx - ww / 2, y - hh * 0.45, bx - ww * 0.15 + sway * 0.5, y - hh * 0.72, bx + sway, y - hh);
        g.bezierCurveTo(bx + ww * 0.15 + sway * 0.5, y - hh * 0.72, bx + ww / 2, y - hh * 0.45, bx + ww / 2, y);
        g.closePath(); g.fill();
      }
    });
    const glow = g.createRadialGradient(x, y - 14 * s, 2, x, y - 14 * s, 60 * s * flick);
    glow.addColorStop(0, 'rgba(255,190,90,0.35)'); glow.addColorStop(1, 'rgba(255,140,50,0)');
    g.fillStyle = glow; g.fillRect(x - 70 * s, y - 80 * s, 140 * s, 110 * s);
    g.globalCompositeOperation = 'source-over';
  }

  /* Loopie's lasso spins above his head in step with the knot, and grows as the rope charges. */
  function handPoint() { return { x: Wd.loopie.x + Wd.loopie.size * 0.34, y: Wd.loopie.y - Wd.loopie.size * 0.08 }; }
  function drawLasso(g, t) {
    const show = ['herd', 'countin'].includes(game.phase) || (game.phase === 'core' && ['rope', 'bounce', 'arrive'].includes(game.coreStage));
    if (!show && lasso.throwT < 0) return;
    const hp = handPoint();
    g.strokeStyle = palette.rope; g.lineCap = 'round';
    if (lasso.throwT >= 0 && lasso.target) {
      const k = TS.clamp(lasso.throwT / lasso.dur, 0, 1);
      const tgt = { x: lasso.target.x, y: lasso.target.y - 4 };
      const mx = (hp.x + tgt.x) / 2, my = Math.min(hp.y, tgt.y) - 60;
      const qx = (1 - k) * (1 - k) * hp.x + 2 * (1 - k) * k * mx + k * k * tgt.x;
      const qy = (1 - k) * (1 - k) * hp.y + 2 * (1 - k) * k * my + k * k * tgt.y;
      g.lineWidth = 2; g.beginPath(); g.moveTo(hp.x, hp.y); g.quadraticCurveTo(TS.lerp(hp.x, mx, k), TS.lerp(hp.y, my, k), qx, qy); g.stroke();
      const lr = (lasso.miss ? 26 : 18) * Wd.unit * (lasso.target.core ? 1.6 : 1);
      g.lineWidth = 2.4; g.beginPath(); g.ellipse(qx, qy, lr, lr * 0.4, 0, 0, TAU); g.stroke();
      return;
    }
    const ch = TS.clamp(game.charge, 0, 1);
    const r = (14 + ch * 22) * Wd.unit;
    lasso.spin = clock.running ? knotAngle() : lasso.spin + 0.05;
    const cx = hp.x + 6, cy = hp.y - 34 * Wd.unit - ch * 10;
    g.lineWidth = 2.4; g.beginPath(); g.moveTo(hp.x, hp.y); g.lineTo(cx + Math.cos(lasso.spin) * r, cy + Math.sin(lasso.spin) * r * 0.35); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, r, r * 0.35, Math.sin(lasso.spin * 0.5) * 0.15, 0, TAU); g.stroke();
    if (ch > 0.05) { g.strokeStyle = `rgba(255,214,120,${0.25 + ch * 0.5})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy - 1, r, r * 0.35, Math.sin(lasso.spin * 0.5) * 0.15, Math.PI, TAU); g.stroke(); }
  }

  function drawRing() {
    if (!ringCtx || ringZone.hidden) return;
    const g = ringCtx, S = Wd.ring.size, c = S / 2, r = Wd.ring.r;
    g.clearRect(0, 0, S, S);
    const dark = palette.dark;
    const ang = knotAngle();
    const live = isRopePhase();
    const bg = g.createRadialGradient(c, c, r * 0.4, c, c, r * 1.3);
    bg.addColorStop(0, dark ? 'rgba(10,8,24,0.5)' : 'rgba(255,244,228,0.5)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = bg; g.beginPath(); g.arc(c, c, r * 1.3, 0, TAU); g.fill();
    if (live && !game.assist) {
      const tol = tolRad();
      g.fillStyle = dark ? 'rgba(143,227,176,0.14)' : 'rgba(31,138,76,0.14)';
      g.beginPath(); g.moveTo(c, c); g.arc(c, c, r + 20, ang - tol, ang + tol); g.closePath(); g.fill();
    }
    g.lineCap = 'round';
    g.strokeStyle = palette.ropeDark; g.lineWidth = 10; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke();
    g.strokeStyle = palette.rope; g.lineWidth = 7; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke();
    g.setLineDash([5, 7]); g.lineDashOffset = -((ang * r) % 12); g.strokeStyle = dark ? 'rgba(255,240,210,0.42)' : 'rgba(255,236,200,0.6)'; g.lineWidth = 2.2;
    g.beginPath(); g.arc(c, c, r - 0.5, 0, TAU); g.stroke(); g.setLineDash([]);
    for (let k = 0; k < 4; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 2, px = c + Math.cos(a) * r, py = c + Math.sin(a) * r, f = posts[k];
      const pr = (k === 0 ? 7.5 : 5.5) + f * 4;
      if (f > 0.02) { const gl = g.createRadialGradient(px, py, 0, px, py, pr * 3.2); gl.addColorStop(0, `rgba(255,214,120,${0.65 * f})`); gl.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gl; g.fillRect(px - pr * 3.2, py - pr * 3.2, pr * 6.4, pr * 6.4); }
      g.fillStyle = palette.woodDark; g.beginPath(); g.arc(px, py, pr + 1.6, 0, TAU); g.fill();
      g.fillStyle = k === 0 ? '#ffd27a' : palette.wood; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
    }
    if (game.charge > 0.004 && (live || game.phase === 'core')) {
      g.save(); g.strokeStyle = '#ffd27a'; g.lineWidth = 6; g.shadowColor = 'rgba(255,200,90,0.85)'; g.shadowBlur = 10;
      g.beginPath(); g.arc(c, c, r + 15, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, game.charge)); g.stroke(); g.restore();
    }
    const kx = c + Math.cos(ang) * r, ky = c + Math.sin(ang) * r;
    if (game.phase === 'core' && game.coreStage === 'still') {
      g.strokeStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(60,40,20,0.18)'; g.lineWidth = 6; g.beginPath(); g.arc(kx, ky, 26, 0, TAU); g.stroke();
      if (game.hold > 0.002) { g.save(); g.strokeStyle = palette.sync; g.lineWidth = 6; g.shadowColor = palette.sync; g.shadowBlur = 8; g.beginPath(); g.arc(kx, ky, 26, -Math.PI / 2, -Math.PI / 2 + TAU * game.hold); g.stroke(); g.restore(); }
    }
    if (knot.visible) {
      if (live && clock.running && !TS.reduced()) {
        for (let i = 1; i <= 9; i++) { const a = ang - i * 0.075; g.fillStyle = `rgba(255,214,120,${0.42 * (1 - i / 10)})`; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 7 - i * 0.5, 0, TAU); g.fill(); }
      }
      const glow = g.createRadialGradient(kx, ky, 0, kx, ky, 26);
      glow.addColorStop(0, 'rgba(255,236,170,0.95)'); glow.addColorStop(0.4, 'rgba(255,190,80,0.45)'); glow.addColorStop(1, 'rgba(255,170,60,0)');
      g.fillStyle = glow; g.fillRect(kx - 26, ky - 26, 52, 52);
      g.fillStyle = '#fff3cf'; g.beginPath(); g.arc(kx, ky, 9, 0, TAU); g.fill();
      g.strokeStyle = palette.ropeDark; g.lineWidth = 2; g.beginPath(); g.arc(kx, ky, 9, 0, TAU); g.stroke();
      g.strokeStyle = palette.rope; g.lineWidth = 2.2; g.beginPath(); g.moveTo(kx - 5, ky - 3); g.quadraticCurveTo(kx, ky + 4, kx + 5, ky - 3); g.stroke();
    }
    if (input.down && input.dist > 0 && (live || game.coreStage === 'still')) {
      const ta = input.angle, ok = game.coreStage === 'still' ? game.holding : (ringState.sync || game.assist);
      const tr = game.coreStage === 'still' ? Math.min(input.dist, r * 1.6) : r;
      const tx = c + Math.cos(ta) * tr, ty = c + Math.sin(ta) * tr;
      g.strokeStyle = ok ? palette.sync : palette.slack; g.lineWidth = 3;
      g.beginPath(); g.arc(tx, ty, 16, 0, TAU); g.stroke();
      if (!ok && live) { g.setLineDash([4, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(tx, ty); g.lineTo(kx, ky); g.stroke(); g.setLineDash([]); }
    }
  }

  function drawConstellations(g, t, skyOff) {
    if (!constellations.length) return;
    const lineCol = palette.dark ? 'rgba(255,236,190,0.6)' : `rgba(255,248,230,${0.5 + 0.35 * Wd.dusk})`;
    constellations.forEach(cs => {
      if (!cs.started) return;
      const k = TS.clamp(cs.t / 1.4, 0, 1);
      const pts = cs.pts.map(([x, y]) => [cs.x + x * cs.s, cs.y + y * cs.s + skyOff]);
      const shown = cs.lines.length * k;
      g.strokeStyle = lineCol; g.lineWidth = cs.core ? 1.6 : 1.1;
      g.beginPath();
      cs.lines.forEach(([a, b], i) => {
        if (i > shown) return;
        const f = TS.clamp(shown - i, 0, 1);
        g.moveTo(pts[a][0], pts[a][1]); g.lineTo(TS.lerp(pts[a][0], pts[b][0], f), TS.lerp(pts[a][1], pts[b][1], f));
      });
      g.stroke();
      pts.forEach(([x, y], i) => {
        if (i / pts.length > k + 0.05) return;
        const tw = 0.7 + 0.3 * Math.sin(t * 3 + i);
        const gl = g.createRadialGradient(x, y, 0, x, y, cs.core ? 9 : 7);
        gl.addColorStop(0, `rgba(255,244,214,${0.95 * tw})`); gl.addColorStop(1, 'rgba(255,240,200,0)');
        g.fillStyle = gl; g.fillRect(x - 9, y - 9, 18, 18);
        g.fillStyle = '#fffaf0'; g.fillRect(x - 1, y - 1, 2, 2);
      });
    });
  }

  /* Finale motes: each resting thought lets go of a little light that rises and becomes a constellation. */
  function toScreen(x, y, layer) {
    const z = Wd.cam.z, f = Wd.fire;
    const yy = y + (layer === 'sky' ? Wd.cam.y * 0.35 : Wd.cam.y);
    return { x: (x - f.x) * z + f.x, y: (yy - f.y) * z + f.y };
  }
  function updateMotes(dt) {
    motes.forEach(m => {
      m.t += dt;
      if (m.t < m.delay || m.done) return;
      if (!m.launched) { m.launched = true; if (m.critter) m.critter.moted = true; if (A.ctx) A.whoosh({ vol: 0.05, dur: 0.9, from: 900, to: 4200, pan: (m.cs.x / Wd.w - 0.5) }); }
      const k = TS.clamp((m.t - m.delay) / m.dur, 0, 1);
      if (k >= 1) {
        m.done = true; m.cs.started = true;
        const at = performance.now();
        if (A.ctx) { A.chime(A.note(PENTA[m.i % PENTA.length]), { vol: m.core ? 0.13 : 0.09, dur: m.core ? 2.6 : 1.6 }); A.sync('constellation', at); }
        if (m.core && A.ctx) A.pad([A.note('G3'), A.note('D4'), A.note('B4'), A.note('G5')], { dur: 6, vol: 0.16, attack: 1.4 });
      }
    });
  }
  function drawMotes(g) {
    if (!motes.length) return;
    g.globalCompositeOperation = 'lighter';
    motes.forEach(m => {
      if (m.t < m.delay || m.done) return;
      const k = TS.clamp((m.t - m.delay) / m.dur, 0, 1);
      const a = toScreen(m.from.x, m.from.y, 'ground');
      const b = toScreen(m.cs.x, m.cs.y, 'sky');
      const e = TS.ease.inOutCubic(k);
      const sway = Math.sin(k * Math.PI * 2 + m.i) * 26 * (1 - k) * (TS.reduced() ? 0 : 1);
      const x = TS.lerp(a.x, b.x, e) + sway, y = TS.lerp(a.y, b.y, e) - Math.sin(k * Math.PI) * 30;
      m.trail.push([x, y]); if (m.trail.length > 14) m.trail.shift();
      m.trail.forEach(([tx, ty], i) => { const f = i / m.trail.length; g.fillStyle = `rgba(255,220,150,${0.3 * f})`; g.beginPath(); g.arc(tx, ty, (m.core ? 5 : 3) * f, 0, TAU); g.fill(); });
      const r = m.core ? 9 : 6;
      const gl = g.createRadialGradient(x, y, 0, x, y, r * 3);
      gl.addColorStop(0, 'rgba(255,250,225,1)'); gl.addColorStop(0.35, 'rgba(255,210,130,0.6)'); gl.addColorStop(1, 'rgba(255,190,100,0)');
      g.fillStyle = gl; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    });
    g.globalCompositeOperation = 'source-over';
  }

  /* ---------------- DOM that lives in the world ---------------- */
  let bannerKey = '', bannerHalf = 60, bannerH = 34;
  function positionDom(t) {
    const L = Wd.loopie, s = toScreen(L.x, L.y, 'ground');
    const bob = TS.reduced() ? 0 : Math.sin(t * (clock.running ? clock.bpm / 60 * Math.PI : 2)) * 3;
    const tilt = isRopePhase() && !TS.reduced() ? Math.sin(t * 2) * 3 : 0;
    loopieWrap.style.width = loopieWrap.style.height = L.size + 'px';
    loopieWrap.style.transform = `translate(${(s.x - L.size / 2).toFixed(1)}px, ${(s.y - L.size / 2 + bob).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;
    if (!sayEl.hidden) {
      const top = s.y - L.size / 2 - 14;
      sayEl.style.bottom = (Wd.h - top) + 'px';
      sayEl.style.left = Math.max(12, Math.min(s.x - 30, Wd.w - Math.min(300, Wd.w - 32) - 12)) + 'px';
    }
    const tgt = game.target && (game.target.state === 'run' || game.target.state === 'target') ? game.target : (game.phase === 'rollcall' ? rollcallCritter : null);
    if (tgt && !banner.hidden) {
      const ds = depthScale(tgt.y) * (tgt.core ? 1.7 : 1);
      const p = toScreen(tgt.x, tgt.y - 30 * ds, 'ground');
      if (bannerKey !== banner.textContent) { bannerKey = banner.textContent; bannerHalf = (banner.offsetWidth || 120) / 2; bannerH = banner.offsetHeight || 34; }
      const bx = TS.clamp(p.x, bannerHalf + 10, Wd.w - bannerHalf - 10);
      let by = Math.max(p.y, (TS.opts.hideBar ? 8 : 64) + bannerH + 4);
      if (!sayEl.hidden) { // never let the player's words sit under Loopie's speech
        const sTop = s.y - L.size / 2 - 14 - 84, sBottom = s.y - L.size / 2 - 14, sLeft = Math.max(12, Math.min(s.x - 30, Wd.w - Math.min(300, Wd.w - 32) - 12)), sRight = sLeft + Math.min(300, Wd.w - 32);
        if (by > sTop && by - bannerH < sBottom && bx + bannerHalf > sLeft && bx - bannerHalf < sRight) by = Math.max((TS.opts.hideBar ? 8 : 64) + bannerH + 4, sTop - 6);
      }
      banner.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) translate(-50%, -100%)`;
    }
    if (clock.running) {
      const b = Math.round(clock.bpm);
      if (bpmEl.textContent !== String(b)) {
        bpmEl.textContent = b;
        const k = TS.clamp((b - 50) / 100, 0, 1);
        gaugeArc.setAttribute('stroke-dashoffset', (100 - k * 100).toFixed(1));
        gaugeNeedle.setAttribute('transform', `rotate(${(-90 + k * 180).toFixed(1)} 32 36)`);
      }
    }
  }

  /* ---------------- speech ---------------- */
  let sayTimer = 0;
  function say(text, ms) {
    TS.cancel(sayTimer);
    if (!text) { sayEl.hidden = true; return Promise.resolve(); }
    const p = UI.say(sayEl, text, { target: sayText, tick: () => { if (A.ctx && TS.settings.sound) A.tone({ type: 'sine', freq: 520 + Math.random() * 140, dur: 0.04, vol: 0.025 }); } });
    if (ms !== 0) sayTimer = TS.later(() => { sayEl.hidden = true; }, ms || Math.max(2400, text.length * 55));
    return p;
  }
  const lines = (key) => {
    const ai = herd && herd.lines;
    if (ai) {
      if (key === 'catch' && ai.catch && ai.catch.length) return TS.pick(ai.catch);
      if (key !== 'catch' && ai[key]) return ai[key];
    }
    return TS.line(R.LINES[key]);
  };

  /* ---------------- scenes ---------------- */
  const stage = new TS.Stage();
  const sc = {
    camp: { el: $('.r-camp') }, speed: { el: $('.r-speedsc') }, play: { el: null },
    paddock: { el: $('.r-paddocksc') }, sky: { el: null }, end: { el: $('.r-endsc') }
  };
  Object.keys(sc).forEach(k => { if (sc[k].el) sc[k].el.classList.add('scene-rise'); stage.add(k, sc[k]); });

  /* Camp */
  const dump = $('.r-dump'), paddockNote = $('.r-paddock-note');
  const EXAMPLES = [
    ['Replaying the meeting', 'I keep replaying what I said in the meeting, and what if my boss thinks I’m useless'],
    ['Exam tomorrow', 'Exam tomorrow, I’m not ready, I should have started earlier and I’ll probably fail'],
    ['Money on loop', 'Rent is due, the credit card bill, what if I can’t cover it this month'],
    ['No reply yet', 'They read my message hours ago and haven’t replied, they must be annoyed with me']
  ];
  const exWrap = $('.r-examples');
  EXAMPLES.forEach(([label, ex]) => {
    const b = h('button', { type: 'button', class: 'ts-chip', text: label });
    b.addEventListener('click', () => { dump.value = ex; A.unlock(); if (A.ctx) A.pop({ vol: 0.12 }); campGuide(); });
    exWrap.append(b);
  });
  const vibesWrap = $('.r-vibes');
  function renderVibes() {
    vibesWrap.innerHTML = '';
    TS.VIBES.forEach(v => {
      const b = h('button', { type: 'button', class: 'ts-chip', 'aria-pressed': String(TS.settings.vibe === v), text: v });
      b.addEventListener('click', () => TS.set('vibe', v));
      vibesWrap.append(b);
    });
  }
  renderVibes();
  TS.on('settings', ({ key }) => { if (key === 'vibe') renderVibes(); });
  dump.addEventListener('input', () => campGuide());
  function campGuide() {
    if (stage.current !== sc.camp) return;
    const words = TS.clean(dump.value, 600).split(/\s+/).filter(Boolean).length;
    if (words >= 2) guide.set({ id: 'camp-go', g: 'tap', target: $('.r-saddle'), label: 'SADDLE UP', delay: 500 });
    else guide.set({ id: 'camp-type', g: 'type', target: dump, label: 'TYPE WHAT’S LOOPING', oy: 0.3, delay: 900 });
  }

  function renderPaddockNote() {
    const p = R.paddock.get();
    paddockNote.innerHTML = ''; paddockNote.hidden = true;
    if (!p) return;
    const sp = R.SPECIES[p.loop] || R.SPECIES.other;
    const now = Date.now();
    if (now > p.at + 36 * 3600000) { R.paddock.clear(); return; }
    paddockNote.hidden = false;
    if (now < p.at) {
      paddockNote.append(h('div', null, h('b', { text: 'Your big one is grazing' }), h('span', { text: 'Paddock time: ' + R.timeLabel(p.at) + '. It can wait till then.' })));
      return;
    }
    const visit = h('button', { type: 'button', class: 'ts-chip', text: 'Visit it now' });
    const graze = h('button', { type: 'button', class: 'ts-chip', text: 'It can keep grazing' });
    visit.addEventListener('click', () => { game.paddockVisit = true; R.paddock.clear(); TS.track('paddock_visit', {}); paddockNote.hidden = true; dump.focus(); say('Paddock time. Tell me how the big one looks now.', 3200); campGuide(); });
    graze.addEventListener('click', () => { R.paddock.clear(); TS.track('paddock_released', {}); TS.awardXP(6, 'paddock:' + p.set); paddockNote.hidden = true; UI.toast('Nice. It lost its grip while you got on with things.'); face('happy', 1600); });
    paddockNote.append(h('div', null, h('b', { text: 'Paddock time!' }), h('span', { text: 'Your ' + sp.name + ' is back for its visit. Still worth one?' }), h('div', { class: 'r-pbtns' }, visit, graze)));
  }

  sc.camp.enter = () => {
    game.phase = 'camp';
    setBaseFace('dizzy');
    hud.hidden = true; ringZone.hidden = true; banner.hidden = true; sayEl.hidden = true;
    constellations = []; motes = []; gateClosed = 0; gateAnim = -1; Wd.dusk = 0; duskTween = null;
    knot.visible = false; knot.fixed = null; knot.glide = null;
    clock.running = false;
    critters = R.localHerd('').critters.map((c, i, arr) => makeCritter(c, i, arr.length, false));
    critters.forEach(c => { c.state = 'run'; c.enter = 1; const p = trackPoint(c.theta); c.x = p.x; c.y = p.y; });
    camTo(campCam(), 1, 0.9);
    startAmbience();
    if (A.ctx) A.busLevel('amb', 0.55, 1);
    renderPaddockNote();
    campGuide();
  };

  let aiPromise = null, aiResult = null;
  function requestHerd(text) {
    aiResult = null;
    if (TS.safety.screen(text) === 'support') { aiResult = { safety: 'support' }; aiPromise = Promise.resolve(aiResult); return aiPromise; }
    if (!text.trim()) { aiResult = R.localHerd(''); aiPromise = Promise.resolve(aiResult); return aiPromise; }
    const token = (requestHerd.token = (requestHerd.token || 0) + 1);
    aiPromise = (async () => {
      try {
        const via = await TS.ai.available();
        if (!via) return R.localHerd(text);
        const raw = await TS.ai.json(R.prompt(text, TS.settings.vibe), { tier: 'quick' });
        return R.normalise(raw, text);
      } catch (e) {
        TS.ai.failure(e);
        return R.localHerd(text);
      }
    })().then(r => { if (token === requestHerd.token) aiResult = r; return r; });
    return aiPromise;
  }

  $('.r-saddle').addEventListener('click', () => go(dump.value));
  $('.r-skip').addEventListener('click', () => { dump.value = ''; go(''); });
  dump.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) go(dump.value); });
  function go(text) {
    A.unlock();
    game.text = TS.clean(text, 600);
    if (TS.safety.screen(game.text) === 'support') { showSupport(); return; }
    if (A.ctx) A.whoosh({ vol: 0.12 });
    TS.newSession();
    requestHerd(game.text);
    TS.track('start', { hasText: !!game.text, vibe: TS.settings.vibe, intensity: TS.settings.intensity, paddockVisit: game.paddockVisit });
    stage.go('speed');
  }
  function showSupport() {
    clock.running = false;
    guide.clear();
    TS.safety.show({ backLabel: 'Back to camp', onBack: () => stage.go('camp') });
  }

  /* Speed: the before measure */
  const speed = $('.r-before'), speedNum = $('.r-dialnum'), speedWord = $('.r-dialword'), dialArc = $('.r-dialarc'), dialNeedle = $('.r-dialneedle');
  const SPEED_WORDS = ['', 'Grazing', 'Ambling', 'Strolling', 'Trotting', 'Jogging', 'Galloping', 'Racing', 'Bolting', 'Stampede', 'Full stampede'];
  let speedTouched = false;
  function renderSpeed() {
    const v = Number(speed.value);
    game.before = v;
    speedNum.textContent = v; speedWord.textContent = SPEED_WORDS[v];
    dialArc.setAttribute('stroke-dashoffset', (100 - (v - 1) / 9 * 100).toFixed(1));
    dialNeedle.style.transform = `rotate(${(-90 + (v - 1) / 9 * 180).toFixed(1)}deg)`;
  }
  speed.addEventListener('input', () => {
    renderSpeed(); if (A.ctx) A.wood(undefined, 0.08, 0.8 + Number(speed.value) * 0.05);
    if (!speedTouched) { speedTouched = true; guide.set({ id: 'speed-go', g: 'tap', target: $('.r-loose'), label: 'LET ’EM LOOSE', delay: 700 }); }
  });
  renderSpeed();
  sc.speed.enter = () => {
    game.phase = 'speed';
    speedTouched = false;
    face('shocked', 1400);
    camTo(-Wd.h * (Wd.portrait ? 0.1 : 0.12), 1, 0.8);
    guide.set({ id: 'speed-slide', g: 'drag', dir: 'r', d: 70, target: speed, ox: 0.5, label: 'SLIDE TO YOUR SPEED', delay: 800 });
    (aiPromise || Promise.resolve(null)).then(r => { if (r && game.phase === 'speed' && r.safety !== 'support' && r.critters) previewHerd(r); });
  };
  function previewHerd(r) {
    const list = r.critters.slice(0, 6);
    critters = list.map((c, i) => makeCritter(c, i, list.length, false));
    critters.forEach(c => { c.state = 'run'; c.enter = 1; const p = trackPoint(c.theta); c.x = p.x; c.y = p.y; });
  }
  $('.r-loose').addEventListener('click', async () => {
    A.unlock();
    guide.clear();
    TS.track('rating_before', { value: game.before });
    let r = aiResult;
    if (!r) {
      const wait = h('div', { class: 'r-wait', role: 'status' }, h('span', { text: 'Loopie is reading the brand marks…' }));
      root.append(wait);
      const quick = h('button', { type: 'button', class: 'ts-btn ts-btn-quiet', text: 'Use a quick herd', hidden: true });
      let quickResolve;
      const quickP = new Promise(res => { quickResolve = res; });
      quick.addEventListener('click', () => { aiResult = R.localHerd(game.text); quickResolve(); });
      wait.append(quick);
      const tq = TS.later(() => { quick.hidden = false; }, 4500);
      await Promise.race([aiPromise, quickP]);
      TS.cancel(tq); wait.remove();
      r = aiResult || R.localHerd(game.text);
    }
    if (r.safety === 'support') { showSupport(); return; }
    herd = r;
    stage.go('play');
  });

  /* Play */
  sc.play.enter = () => { startRodeo(); };
  async function startRodeo() {
    const inten = TS.intensity();
    game.endBpm = [56, 60, 62][inten];
    game.startBpm = 72 + game.before * 6;
    Object.assign(game, { perfect: 0, taps: 0, miss: 0, catches: 0, penned: 0, hold: 0, holding: false, charge: 0, assist: false, assistOffered: false, coreStage: null,
      pressTime: 0, syncTime: 0, slackT: 0, slackSaid: false, start: performance.now(), lastCatchAt: performance.now(), paddock: null });
    const maxCritters = [4, 5, 6][inten];
    const list = herd.critters.slice(0, maxCritters);
    game.total = list.length;
    critters = list.map((c, i) => makeCritter(c, i, list.length, false));
    game.coreCritter = makeCritter(herd.core, list.length, list.length, true);
    game.queue = critters.slice();
    game.target = null;
    renderTally();
    hud.hidden = false;
    bpmEl.textContent = String(game.startBpm);
    camTo(0, 1, 1.1);
    game.phase = 'rollcall';
    setBaseFace('dizzy'); face('shocked', 1600);
    if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 260, dur: 2.4, attack: 0.6, vol: 0.28 });
    await TS.sleep(critters.length * 700 + 1000);
    if (game.phase !== 'rollcall') return;
    rollcallCritter = null; banner.hidden = true;
    await say(game.paddockVisit ? 'Paddock visit! Let’s see this herd at its own pace.' : lines('intro'), 3200);
    game.paddockVisit = false;
    await TS.sleep(600);
    if (game.phase !== 'rollcall') return;
    A.unlock();
    ringZone.hidden = false;
    knot.visible = true; knot.fixed = null; knot.glide = null;
    ringState.text = '';
    setRingText('Get ready', 'Watch the glowing knot');
    game.phase = 'countin';
    const t0 = A.now() + 0.25;
    startClock(game.startBpm, t0);
    const beatLen = 60 / game.startBpm;
    guide.set({ id: 'rope', g: 'circle', target: ringCenterPoint, r: Wd.ring.r, label: 'CIRCLE WITH THE KNOT', delay: 200 });
    ['3', '2', '1', 'Rope!'].forEach((txt, k) => TS.later(() => showJudge(txt, 'count'), Math.max(0, (t0 + k * beatLen - A.now()) * 1000)));
    TS.later(() => { if (game.phase === 'countin') { game.phase = 'herd'; game.lastCatchAt = performance.now(); nextTarget(); } }, Math.max(0, (t0 + 4 * beatLen - A.now() - beatLen * 0.5) * 1000));
  }
  function announce(c) {
    rollcallCritter = c;
    banner.textContent = c.label; banner.classList.remove('big'); banner.hidden = false;
    if (A.ctx) A.bleat({ pitch: 0.8 + Math.random() * 0.5, vol: 0.14, pan: -0.4 });
  }
  function nextTarget() {
    game.charge = 0;
    const nxt = game.queue.find(c => c.state === 'run' || c.state === 'enter');
    game.target = nxt || null;
    if (game.target) {
      game.target.state = 'run';
      banner.textContent = game.target.label; banner.classList.remove('big'); banner.hidden = false;
    } else {
      banner.hidden = true;
      startCore();
    }
  }

  /* Paddock time */
  const slotsEl = $('.r-slots');
  sc.paddock.enter = () => {
    game.phase = 'paddock';
    slotsEl.innerHTML = '';
    const slots = R.slots();
    slots.forEach(s => {
      const b = h('button', { type: 'button', class: 'ts-chip', text: s.label });
      b.addEventListener('click', () => pickPaddock(s));
      slotsEl.append(b);
    });
    guide.set({ id: 'paddock', g: 'choose', target: () => Array.from(slotsEl.children), label: 'PICK A TIME', delay: 900 });
  };
  function pickPaddock(s) {
    guide.clear();
    game.paddock = s;
    R.paddock.set(s.at, game.coreCritter ? game.coreCritter.loop : 'other');
    TS.track('paddock_set', { slot: new Date(s.at).getHours() });
    if (A.ctx) { A.wood(undefined, 0.2, 1.2); A.chime(A.note('D5'), { vol: 0.08 }); }
    say(TS.line(R.LINES.paddock).replace('{time}', s.label), 2800);
    stage.go('sky', {}, { duration: 300 });
    TS.later(finale, 400);
  }
  $('.r-noslot').addEventListener('click', () => { guide.clear(); game.paddock = null; TS.track('paddock_skip', {}); stage.go('sky', {}, { duration: 300 }); TS.later(finale, 400); });

  /* Finale */
  const SHAPE = {
    pts: [[-20, 6], [-15, -6], [-2, -12], [12, -9], [22, -14], [31, -6], [25, 4], [14, 8], [-12, 10], [-13, 20], [13, 9], [14, 20]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [8, 9], [7, 10], [10, 11]]
  };
  function finale() {
    if (game.phase === 'finale' || game.phase === 'end') return;
    game.phase = 'finale';
    hud.hidden = true; ringZone.hidden = true; banner.hidden = true;
    const all = critters.filter(c => c.state === 'pen' || c.state === 'rest');
    const up = Wd.h * 0.72, finalSkyOff = up * 0.35;
    const bandTop = 104, bandBottom = Math.max(bandTop + 160, Wd.h * 0.40);
    const smalls = all.filter(c => !c.core), cols = 3;
    const rows = Math.max(1, Math.ceil(smalls.length / cols));
    const coreS = Wd.portrait ? 1.9 : 2.6, smallS = Wd.portrait ? 1.25 : 1.7;
    const rowH = Math.min(84, (bandBottom - bandTop - 60 * (coreS / 1.9)) / rows);
    const spread = Wd.portrait ? Wd.w * 0.8 : Math.min(Wd.w * 0.6, 760);
    constellations = smalls.map((c, i) => {
      const col = i % cols, row = Math.floor(i / cols), inRow = Math.min(cols, smalls.length - row * cols);
      const x = Wd.w / 2 + (col - (inRow - 1) / 2) * (spread / cols) + (row % 2 ? 10 : -10);
      return { x, y: bandTop + row * rowH + 10 - finalSkyOff, s: smallS, pts: SHAPE.pts, lines: SHAPE.lines, t: 0, started: false, core: false };
    });
    const core = all.find(c => c.core);
    if (core) constellations.push({ x: Wd.w / 2 - 6, y: bandTop + rows * rowH + 34 * (coreS / 1.9) - finalSkyOff, s: coreS, pts: SHAPE.pts, lines: SHAPE.lines, t: 0, started: false, core: true });
    const order = smalls.concat(core ? [core] : []);
    const gap = TS.reduced() ? 0.2 : 0.5;
    motes = order.map((c, i) => ({ i, critter: c, core: !!c.core, from: { x: c.x, y: c.y - 14 * (c.core ? 1.6 : 1) }, cs: constellations[i], delay: 0.6 + i * gap + (c.core ? 0.5 : 0), dur: TS.reduced() ? 0.6 : 2.1, t: 0, done: false, launched: false, trail: [] }));
    camTo(up, 1, 2.8);
    if (!palette.dark) duskTo(0.85, 2.6);
    if (A.ctx) A.busLevel('amb', 0.35, 1.5);
    const total = 0.6 + order.length * gap + 0.5 + (TS.reduced() ? 0.6 : 2.1) + 1.6;
    TS.later(endScreen, total * 1000);
  }

  /* End */
  const after = $('.r-afterin'), afterNum = $('.r-afternum'), verdict = $('.r-verdict');
  function endScreen() {
    if (game.phase === 'end') return;
    game.phase = 'end';
    const dur = Math.round((performance.now() - game.start) / 1000);
    const smalls = critters.filter(c => c.state === 'pen' && !c.core);
    const syncPct = game.pressTime > 0.5 ? Math.round(100 * game.syncTime / game.pressTime) : (game.taps ? 100 : 0);
    $('.r-st-tempo').textContent = game.startBpm + '→' + Math.round(game.endBpm);
    $('.r-st-pen').textContent = smalls.length + ' + 1';
    $('.r-st-sync').textContent = game.assist ? 'Ride-along' : syncPct + '%';
    const pad = $('.r-st-paddock');
    pad.hidden = !game.paddock; pad.textContent = game.paddock ? 'Paddock time: ' + game.paddock.label + '. The big one grazes till then.' : '';
    game.after = null; afterNum.textContent = '?'; after.value = String(Math.max(1, game.before - 2));
    verdict.textContent = 'Before you rode, you said ' + game.before + ' (' + SPEED_WORDS[game.before].toLowerCase() + '). Slide to compare. It stays on this device.';
    const loops = Array.from(new Set(critters.filter(c => c.state === 'pen' || c.state === 'rest').map(c => c.loop)));
    const fresh = R.addToAlmanac(loops);
    const alm = $('.r-endalm'); alm.innerHTML = '';
    loops.slice(0, 6).forEach(l => alm.append(miniCritter(l, 40, 34)));
    if (fresh.length) alm.append(h('span', { class: 'r-almnew', text: 'New in your Almanac: ' + fresh.map(l => R.SPECIES[l].name).join(', ') }));
    const slot = $('.r-helpslot'); slot.innerHTML = '';
    UI.helpCheck(slot);
    TS.awardXP(12, 'game:loop-rodeo:' + TS.game.session);
    guide.learned();
    TS.track('complete', { before: game.before, bpmStart: game.startBpm, bpmEnd: Math.round(game.endBpm), perfect: game.perfect, taps: game.taps, miss: game.miss, sync: syncPct, seconds: dur, critters: smalls.length + 1, source: herd.source, assist: game.assist, paddock: !!game.paddock });
    stage.go('end');
    guide.set({ id: 'end-after', g: 'drag', dir: 'r', d: 60, target: after, label: 'HOW FAST NOW? SLIDE', delay: 1600, place: 'above' });
    if (herd.safety === 'care') TS.later(() => say(TS.safety.CARE_LINE, 6000), 1200);
  }
  after.addEventListener('input', () => {
    const v = Number(after.value); game.after = v; afterNum.textContent = v;
    const d = game.before - v;
    verdict.textContent = d > 0 ? `Down from ${game.before} to ${v}.` : d === 0 ? 'Same speed as before. Some herds take more than one round.' : 'Faster than before. Thanks for being honest. A Gentle round or a different game might suit better.';
    guide.clear();
  });
  after.addEventListener('change', () => {
    const v = Number(after.value), d = game.before - v;
    TS.track('rating_after', { value: v, before: game.before });
    TS.recordShift(d >= 4 ? 3 : d >= 2 ? 2 : d >= 1 ? 1 : 0);
  });
  $('.r-again').addEventListener('click', () => { TS.track('replay', {}); dump.value = ''; guide.clear(); stage.go('camp'); });
  $('.r-done').addEventListener('click', () => { guide.clear(); TS.exit('done'); UI.toast('Saved on this device. See you round the fire.'); stage.go('camp'); });
  $('.r-share').addEventListener('click', () => shareCard());

  function miniCritter(loop, w, hgt) {
    const c = document.createElement('canvas'); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr; c.height = hgt * dpr; c.style.width = w + 'px'; c.style.height = hgt + 'px';
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = w / 76, spr = critterSprite(loop, 'awake', s);
    drawLegs(g, R.SPECIES[loop], w / 2 - 2, hgt * 0.5, s, 0.8, 1, 'run');
    g.drawImage(spr.c, w / 2 - 2 - spr.ox * s, hgt * 0.5 - spr.oy * s, spr.w * s, spr.h * s);
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', R.SPECIES[loop].name);
    return c;
  }

  async function shareCard() {
    try { await document.fonts.load('64px Rye'); await document.fonts.load('600 32px Fredoka'); } catch (e) { /* fallback fonts */ }
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#070b24'); grad.addColorStop(0.65, '#1a1f52'); grad.addColorStop(1, '#3b2f62');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    const rnd = TS.rng(game.startBpm * 7 + game.penned);
    for (let i = 0; i < 260; i++) { g.globalAlpha = 0.3 + rnd() * 0.7; g.fillStyle = '#fffaf0'; const s = rnd() < 0.1 ? 3 : 1.6; g.fillRect(rnd() * W, rnd() * H * 0.85, s, s); }
    g.globalAlpha = 1;
    const n = constellations.length || 5;
    const drawC = (cx, cy, sc2) => {
      const pts = SHAPE.pts.map(([x, y]) => [cx + x * sc2, cy + y * sc2]);
      g.strokeStyle = 'rgba(255,236,190,0.7)'; g.lineWidth = 3; g.beginPath();
      SHAPE.lines.forEach(([a, b]) => { g.moveTo(pts[a][0], pts[a][1]); g.lineTo(pts[b][0], pts[b][1]); }); g.stroke();
      pts.forEach(([x, y]) => { const gl = g.createRadialGradient(x, y, 0, x, y, 16); gl.addColorStop(0, 'rgba(255,244,214,0.95)'); gl.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gl; g.fillRect(x - 16, y - 16, 32, 32); g.fillStyle = '#fff'; g.fillRect(x - 2.5, y - 2.5, 5, 5); });
    };
    const smallN = Math.max(1, n - 1);
    for (let i = 0; i < smallN; i++) { const col = i % 3, row = Math.floor(i / 3); drawC(220 + col * 320 + (row % 2) * 60, 300 + row * 190, 4); }
    drawC(W / 2, 300 + Math.ceil(smallN / 3) * 190 + 80, 6.5);
    g.fillStyle = '#fff6e2'; g.textAlign = 'center';
    g.font = '96px Rye, Georgia, serif'; g.fillText('LOOP RODEO', W / 2, 170);
    g.font = '600 46px Fredoka, sans-serif';
    g.fillText('My herd went from ' + game.startBpm + ' to ' + Math.round(game.endBpm) + ' BPM', W / 2, H - 230);
    g.font = '500 34px Fredoka, sans-serif'; g.fillStyle = 'rgba(255,246,226,0.78)';
    g.fillText(smallN + ' thoughts rounded up. One resting by the fire.', W / 2, H - 170);
    g.font = '600 30px Fredoka, sans-serif'; g.fillStyle = 'rgba(255,246,226,0.9)';
    g.fillText('ThinkStill', W / 2, H - 80);
    UI.share(c, { heading: 'Share your herd', filename: 'loop-rodeo', alt: 'A star map of your herd with your tempo change', note: 'No thoughts or labels are on this card. Just stars and numbers.' });
  }

  /* Almanac */
  $('.r-almbtn').addEventListener('click', () => {
    const seen = R.almanac();
    const list = h('div', { class: 'r-almlist' }, R.LOOPS.map(l => {
      const met = !!seen[l];
      return h('div', { class: 'r-almitem' + (met ? '' : ' locked') }, miniCritter(l, 56, 46),
        h('div', null, h('b', { text: met ? R.SPECIES[l].name : 'Not met yet' }), h('p', { text: met ? R.SPECIES[l].what + ' Rounded up ' + seen[l] + (seen[l] === 1 ? ' time.' : ' times.') : 'Turns up when a thought like this is running laps.' })));
    }));
    UI.sheet({ title: 'Herd Almanac', note: 'Every kind of looping thought you’ve rounded up. Kept only on this device.', body: list });
  });

  /* ---------------- pause, resize, boot ---------------- */
  TS.on('visibility', (vis) => {
    if (!vis) { if (clock.running) clock.paused = true; }
    else if (clock.running && clock.paused) { clock.paused = false; clock.next = A.now() + 0.4; clock.beats = []; lastBeatSeen = null; }
  });
  UI.bar({ mode: 'Reset · Loop Rodeo' });
  let resizeQueued = false;
  function resize() { if (TS.destroyed) return; world = TS.fitCanvas(canvas, root.clientWidth || 390, root.clientHeight || 844, 2); layout(); }
  try {
    const ro = new ResizeObserver(() => { if (resizeQueued) return; resizeQueued = true; requestAnimationFrame(() => { resizeQueued = false; resize(); }); });
    ro.observe(root); TS.onDestroy(() => ro.disconnect());
  } catch (e) { TS.listen(window, 'resize', resize); }
  TS.on('theme', () => { readPalette(); buildCaches(); spriteCache.clear(); });
  TS.ready(() => {
    resize();
    stage.go('camp', {}, { duration: 0 });
    TS.loop((dt, t) => { scheduleBeats(); update(dt, t); draw(t); drawRing(); positionDom(t); });
  });

  if (TS.isDev()) {
    window.__rodeo = {
      game, clock, stage, sc, Wd, input, knot, critters: () => critters, beatWindow, vnow, syncLog: () => A.syncLog(), guide: () => guide.state(),
      ring: () => { const r = root.getBoundingClientRect(); return { cx: r.left + Wd.ring.cx, cy: r.top + Wd.ring.cy, r: Wd.ring.r, angle: knotAngle(), tol: tolDeg(), phase: game.phase, stage: game.coreStage }; }
    };
  }
})(window.TSG_ENV);
