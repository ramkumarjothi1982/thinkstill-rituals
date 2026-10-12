// GREEN GLITCH COMPASS — Glitzi, The Static Storm.
// For envy, jealousy, coveting, comparison and "everyone's doing better than me".
//
// 1. Glitch it out     — name what's on the highlight reel, then tap, rub or
//                        shake the shiny screen until it glitches apart.
//                        Glitzi joins in, gleefully (jealous → mischievous).
// 2. Find the needle   — the envy is a glitchy compass. Drag or spin the
//                        needle until it settles on what you actually want.
// 3. Mute the reel     — turn the comparison feed's volume dial down; the
//                        feed and Glitzi's static calm as you turn. Optional
//                        ways to keep it turned down.
// 4. One step your way — pick one small step toward the want.
//
// Rationale (plain): envy often signals something we want for ourselves.
// Noticing it without self-attack, naming the underlying want, reducing
// exposure to comparison triggers, and taking a small values-aligned action
// are common, widely taught approaches. This does NOT argue about whether the
// comparison is fair or what others really have — that's not its job.

import { h, wait } from '../app/ui.js';

const ITEMS = [
  ['success', 'Their success', 'BIG WIN', 'Another big win, posted.', '#ffd98a'],
  ['relationship', 'Their relationship', 'COUPLE GOALS', 'Couple content. Again.', '#ff8fc8'],
  ['looks', 'Their looks', 'FLAWLESS', 'The angle. The light. The hair.', '#c9a6ff'],
  ['freedom', 'Their freedom', 'OUT OF OFFICE', 'Somewhere sunny. No alarm clock.', '#7fe3ff'],
  ['attention', 'Their attention', 'ALL EYES', 'Everyone’s watching them.', '#ffb36b'],
  ['closer', 'A friend getting closer to someone else', 'BESTIES', 'Them two. Inside jokes.', '#9be8a8'],
];

const WANTS = [
  ['recognition', 'Recognition', 'Wanting what you do to be seen and valued.', 'Recognition. You want your effort seen. Wildly reasonable. Annoyingly.'],
  ['connection', 'Connection', 'Wanting closeness, belonging, your people.', 'Connection. You want your people close. Gross. Lovely. Same thing.'],
  ['security', 'Security', 'Wanting things to feel safe and steady.', 'Security. Something steady under your feet. Not too much to want.'],
  ['freedom', 'Freedom', 'Wanting room, choice and time that’s yours.', 'Freedom. More room to move. I respect a breakout.'],
  ['progress', 'Progress', 'Wanting to grow, move forward, get better.', 'Progress. You want to be getting somewhere. Noted, chief.'],
  ['chosen', 'Being chosen', 'Wanting to be picked, prioritised, wanted.', 'Being chosen. Wanting to be someone’s pick. Very human. Don’t tell anyone I said that softly.'],
  ['rest', 'Rest', 'Wanting ease, a break, less pushing.', 'Rest. Sometimes envy is just tired and jealous of naps.'],
  ['creativity', 'Creativity', 'Wanting to make, play and express.', 'Creativity. You want to make things. Excellent. Chaos with a purpose.'],
];

const MUTES = [
  ['mute', 'Mute or unfollow for a while'],
  ['scroll', 'Less scrolling tonight'],
  ['highlights', 'Remember I only see the highlights'],
  ['room', 'Phone in another room for an hour'],
  ['head', 'Just keep it quieter in my head'],
];

const STEPS = {
  recognition: ['Write down three things I’ve done this month', 'Say one thing I did well out loud', 'Show one thing I’ve made to someone I trust'],
  connection: ['Think of one person I’d like more time with', 'Say yes to the next invite that feels good', 'Look up one place my kind of people gather'],
  security: ['Write down one thing that’s solid right now', 'Sort one small practical worry', 'Name what “enough” looks like for me'],
  freedom: ['Block out one hour that’s only mine this week', 'Say no to one small thing', 'Plan one tiny adventure nearby'],
  progress: ['Ten minutes on the thing I want to get better at', 'Write down the next tiny step', 'Notice how far I’ve come since last year'],
  chosen: ['Choose myself for something small today', 'Spend time with someone who already picks me', 'Write down who’s glad I’m around'],
  rest: ['Have an early night tonight', 'Take a proper break, no scrolling', 'Cancel one thing I don’t need to do'],
  creativity: ['Make something rubbish for ten minutes, on purpose', 'Save one idea in my notes', 'Start the thing badly. Today.'],
};

const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
const GREEN = '#7CC48A';
const TAU = Math.PI * 2;
const SECTOR = TAU / WANTS.length;

export const meta = { id: 'green-glitch-compass' };

export async function run(ctx) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const rm = !!ctx.reducedMotion;
  const calm = rm || !!ctx.lowStim;
  const realm = () => world.realm;
  const say = (t, ms) => ctx.say(t, { who: 'Glitzi', ms });
  const sayAfter = (t, ms) => setTimeout(() => { if (!signal.aborted) say(t, ms); }, rm ? 120 : 780); // let the Mallow finish moving first
  const rig = (k, v) => { if (world.rig?.target) world.rig.target[k] = v; };
  const result = { completed: false, reel: [], ownWords: '', glitches: 0, want: null, volume: 10, mutes: [], step: null };

  // ------------------------------------------------- shared fx canvas --
  const canvas = h('canvas', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' } });
  const layer = h('div', { style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
  world.fx.replaceChildren(canvas, layer);
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, layout = null;
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    layout?.();
  };
  resize();
  addEventListener('resize', resize);

  const parts = [];   // {kind, x, y, vx, vy, grav, age, life, s, c}
  const zaps = [];    // {pts, age}
  const ticks = new Set();
  let raf = 0, last = performance.now();
  const loop = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    for (const fn of ticks) fn(dt, t / 1000);
    drawParts(dt);
    drawZaps(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  function drawParts(dt) {
    for (const p of parts) { p.age += dt; p.vy += (p.grav || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].age > parts[i].life) parts.splice(i, 1);
    for (const p of parts) {
      const a = Math.max(0, 1 - p.age / p.life);
      g.globalAlpha = a;
      g.fillStyle = p.c;
      if (p.kind === 'heart') {
        const s = p.s;
        HEART.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === 'X') g.fillRect(p.x + (rx - 3.5) * s, p.y + (ry - 3) * s, s, s); });
      } else if (p.kind === 'shard') {
        g.fillRect(p.x - p.s, p.y - p.s * 0.22, p.s * 2, p.s * 0.44);
      } else g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    g.globalAlpha = 1;
  }
  function drawZaps(dt) {
    for (const z of zaps) z.age += dt;
    while (zaps.length && zaps[0].age > 0.35) zaps.shift();
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const z of zaps) {
      const a = 1 - z.age / 0.35;
      const pass = (w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); z.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
      pass(8, `rgba(62,232,255,${0.18 * a})`);
      pass(3, `rgba(255,61,242,${0.6 * a})`);
      pass(1.4, `rgba(255,255,255,${0.85 * a})`);
    }
  }
  const shards = (x, y, n = 6) => {
    n = calm ? Math.min(2, n) : n;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = 60 + Math.random() * 150;
      parts.push({ kind: 'shard', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, age: 0, life: 0.45 + Math.random() * 0.4, s: 4 + Math.random() * 7,
        c: Math.random() < 0.5 ? '#3ee8ff' : '#ff3df2' });
    }
  };
  const hearts = (x, y, n = 6) => {
    n = calm ? Math.min(3, n) : n;
    for (let i = 0; i < n; i++) {
      parts.push({ kind: 'heart', x: x + (Math.random() - 0.5) * 120, y: y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 40, vy: -(40 + Math.random() * 60) * (rm ? 0.4 : 1),
        age: -i * 0.12, life: 1.8 + Math.random() * 0.6, s: 3 + Math.round(Math.random() * 2), c: ['#ff3df2', '#3ee8ff', GREEN][i % 3] });
    }
  };
  const zap = (x0, y0, x1, y1) => {
    if (calm) return;
    const pts = [[x0, y0]];
    const n = 7;
    for (let i = 1; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + (Math.random() - 0.5) * 26, y0 + (y1 - y0) * t + (Math.random() - 0.5) * 26]); }
    pts.push([x1, y1]);
    zaps.push({ pts, age: 0 });
  };

  // ------------------------------------------------- layout helpers --
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const stage = () => {
    const t = document.querySelector('.ritual-ui .move-title')?.getBoundingClientRect();
    const d = dock.getBoundingClientRect();
    const top = (t && t.height ? t.bottom : 130) + 10;
    const bottom = (d.height ? d.top : H - 24) - 10;
    return { top, bottom, h: Math.max(60, bottom - top) };
  };
  // Fit the Mallow's visible body (see world.mallowRect: middle ~64% width,
  // 22%..88% height of its layer) inside a box.
  const placeIn = (top, bottom, cx = W / 2, maxScale = 1, maxW = W - 32) => {
    const LH = Math.min(0.56 * H, 470), LW = Math.min(0.86 * W, 430);
    const hh = Math.max(50, bottom - top);
    const scale = Math.max(0.2, Math.min(maxScale, hh / (0.66 * LH), maxW / (0.64 * LW)));
    const L = LH * scale;
    const bodyTop = (top + bottom) / 2 - 0.33 * L;
    world.place({ x: (cx / W) * 100, y: ((bodyTop + 0.28 * L) / H) * 100, scale });
  };
  // Lay out a square widget plus the Mallow: stacked when there's room,
  // side by side on short screens.
  const arrange = (el, D0, { offsetTop = 0, minBody = 84, maxScale = 0.6 } = {}) => {
    const s = stage();
    const top = s.top + offsetTop, hh = s.bottom - top;
    let D = Math.min(D0, W - 40, hh - minBody - 6), left, y;
    if (D >= Math.min(D0, 210) * 0.85) {
      left = (W - D) / 2; y = top;
      placeIn(top + D + 6, s.bottom, W / 2, maxScale);
    } else {
      D = Math.max(60, Math.min(D0, hh, W - 120));
      left = 14; y = top + (hh - D) / 2;
      const rx = left + D + 6;
      placeIn(top, s.bottom, (rx + W) / 2, maxScale, W - rx - 10);
    }
    D = Math.round(D);
    Object.assign(el.style, { left: `${left}px`, top: `${y}px`, width: `${D}px`, height: `${D}px` });
    return D;
  };
  const until = (setup) => new Promise((resolve) => {
    const ab = () => resolve(null);
    signal.addEventListener('abort', ab, { once: true });
    setup((v) => { signal.removeEventListener('abort', ab); resolve(v); });
  });

  let hum = null;
  const cleanup = () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    removeEventListener('devicemotion', onMotion);
    ticks.clear();
    hum?.stop(); hum = null;
    world.fx.classList.remove('live');
    world.fx.replaceChildren();
  };
  signal.addEventListener('abort', cleanup);
  let motionHit = null;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || !motionHit) return;
    const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    if (Math.abs(m - 9.8) > 11) motionHit();
  }
  addEventListener('devicemotion', onMotion);

  // ================================================ 1. GLITCH IT OUT ==
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'What’s on the highlight reel?', prompt: 'Pick up to three. No judging. Glitzi is jealous of literally everyone.' });
  const startI = Math.min(0.95, Math.max(0.55, ctx.input.intensity || 0.7));
  world.setEmotion({ jealous: 0.8, playful: 0.2 }, startI);
  rig('glitch', 1.3);
  realm()?.setMood?.({ agitation: 0.55, heaviness: 0.25, clarity: 0.15, warmth: 0.1 });
  realm()?.transform?.(0);

  const picked = new Set();
  const own = h('input', { class: 'text', type: 'text', maxlength: '48', placeholder: 'Or in your own words (optional)', 'aria-label': 'What is on the reel, in your own words (optional)', autocomplete: 'off' });
  const playBtn = h('button', { class: 'btn primary block', disabled: true }, 'Play the reel');
  const chipWrap = h('div', { class: 'chips', style: { justifyContent: 'center' } });
  for (const [id, label] of ITEMS) {
    const c = h('button', { class: 'chip', 'aria-pressed': 'false', style: { minHeight: '44px', fontSize: '14px' } }, label);
    c.onclick = () => {
      const on = !picked.has(id);
      if (on && picked.size >= 3) { ctx.toast('Three’s plenty. Envy loves a crowd.'); return; }
      on ? picked.add(id) : picked.delete(id);
      c.setAttribute('aria-pressed', String(on));
      audio.ui?.('select'); haptic('light');
      if (on) world.react('tap');
      sync();
    };
    chipWrap.append(c);
  }
  const sync = () => { playBtn.disabled = !picked.size && !own.value.trim(); };
  own.addEventListener('input', sync);
  dock.replaceChildren(chipWrap, own, playBtn);
  await frame();
  layout = () => { const s = stage(); placeIn(s.top, s.bottom, W / 2, 0.82); };
  layout();
  say('Envy: your brain’s least subtle way of saying “I want that”.', 3600);
  await until((done) => { playBtn.onclick = done; own.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !playBtn.disabled) done(); }); });
  if (signal.aborted) return result;
  result.reel = ITEMS.filter(([id]) => picked.has(id)).map(([id, label]) => label.toLowerCase());
  result.ownWords = own.value.trim().slice(0, 48);
  const posts = ITEMS.filter(([id]) => picked.has(id)).map(([, , big, cap, hue]) => ({ big, cap, hue }));
  if (result.ownWords) posts.push({ big: result.ownWords.toUpperCase(), cap: 'Your words, on their reel.', hue: GREEN, own: true });
  own.blur();

  // ---- the reel screen
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'Glitch it out', prompt: 'Tap it, rub it, shake your phone. Break the shiny reel.' });
  const scr = h('canvas', { 'aria-hidden': 'true', style: { width: '100%', height: '100%', display: 'block', borderRadius: '24px' } });
  const screenEl = h('div', { role: 'button', tabindex: '0', 'aria-label': 'The highlight reel. Tap it, or press Enter, to glitch it apart.',
    style: { position: 'absolute', pointerEvents: 'auto', touchAction: 'none', borderRadius: '24px', cursor: 'pointer',
      boxShadow: '0 0 0 2px rgba(62,232,255,.55), 0 0 34px rgba(255,61,242,.28), 0 18px 50px rgba(0,0,0,.45)', transition: rm ? 'opacity 400ms' : 'transform 120ms ease-out' } }, scr);
  layer.append(screenEl);
  const meter = h('i');
  const meterBox = h('div', { class: 'meter', role: 'progressbar', 'aria-label': 'Glitch level', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0 }, meter);
  const glitchBtn = h('button', { class: 'btn block', 'aria-label': 'Glitch the reel' }, 'Glitch it');
  dock.replaceChildren(meterBox, glitchBtn);
  await frame();

  let sw = 200, sh = 300, sx = 0, sy = 0;
  const off = document.createElement('canvas');
  const pix = document.createElement('canvas');
  const sg = scr.getContext('2d'), og = off.getContext('2d'), pg = pix.getContext('2d');
  layout = () => {
    const s = stage();
    sh = Math.round(Math.max(160, Math.min(s.h - 96, s.h * 0.7, 340)));
    sw = Math.round(Math.min(sh * 0.66, W - 96));
    sx = Math.round((W - sw) / 2); sy = Math.round(s.top + 2);
    Object.assign(screenEl.style, { left: `${sx}px`, top: `${sy}px`, width: `${sw}px`, height: `${sh}px` });
    scr.width = off.width = sw * dpr; scr.height = off.height = sh * dpr;
    placeIn(sy + sh + 8, s.bottom, W / 2, 0.6);
  };
  layout();
  world.setEmotion({ jealous: 1 }, startI);
  sayAfter('Ugh. Look at it. So shiny. Let’s break it.', 2600);

  let damage = 0, kick = 0, hits = 0, shattered = false, lastPulse = 0, lastReact = 0, joined = 0;
  let bands = Array.from({ length: 12 }, () => 0);
  const cracks = [];
  const t0 = performance.now() / 1000;
  const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)));

  function renderPost(c, w, hh, p, alpha, dx) {
    c.save(); c.globalAlpha = alpha; c.translate(dx, 0);
    const pad = w * 0.06, imgH = hh * 0.52, imgY = hh * 0.13;
    const gr = c.createLinearGradient(0, imgY, w, imgY + imgH);
    gr.addColorStop(0, p.hue); gr.addColorStop(1, '#ff3df2');
    c.fillStyle = gr; roundRect(c, pad, imgY, w - pad * 2, imgH, w * 0.06); c.fill();
    // sparkles
    c.fillStyle = 'rgba(255,255,255,.9)';
    for (const [fx, fy, fs] of [[0.2, 0.25, 1], [0.78, 0.2, 0.7], [0.7, 0.75, 0.9], [0.28, 0.8, 0.6]]) star(c, pad + (w - pad * 2) * fx, imgY + imgH * fy, w * 0.035 * fs);
    // big caption inside the image
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(40,0,60,.55)'; c.shadowBlur = w * 0.04;
    const lines = wrap(c, p.big, w - pad * 4, `900 ${Math.round(w * 0.11)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`);
    const lh = w * 0.12;
    lines.slice(0, 3).forEach((ln, i) => c.fillText(ln, w / 2, imgY + imgH / 2 + (i - (Math.min(3, lines.length) - 1) / 2) * lh));
    c.shadowBlur = 0;
    // likes and caption
    c.textAlign = 'left';
    c.font = `800 ${Math.round(w * 0.062)}px system-ui, sans-serif`;
    c.fillStyle = '#ff3df2';
    const likes = 2400 + (performance.now() / 1000 - t0) * 173;
    c.fillText(`♥ ${fmt(likes)}`, pad, imgY + imgH + hh * 0.06);
    c.fillStyle = 'rgba(255,255,255,.88)';
    c.font = `600 ${Math.round(w * 0.055)}px system-ui, sans-serif`;
    wrap(c, p.cap, w - pad * 2, c.font).slice(0, 2).forEach((ln, i) => c.fillText(ln, pad, imgY + imgH + hh * 0.12 + i * w * 0.07));
    // comment pills
    c.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < 2; i++) { roundRect(c, pad, hh * 0.86 + i * hh * 0.055, (w - pad * 2) * (0.75 - i * 0.25), hh * 0.035, hh * 0.02); c.fill(); }
    c.restore();
  }
  function drawScreen(dt, now) {
    if (shattered) return;
    const w = off.width, hh = off.height;
    og.setTransform(1, 0, 0, 1, 0, 0);
    og.clearRect(0, 0, w, hh);
    og.fillStyle = '#0b0e33'; roundRect(og, 0, 0, w, hh, 24 * dpr); og.fill();
    og.fillStyle = 'rgba(255,255,255,.8)'; og.font = `800 ${Math.round(w * 0.055)}px system-ui, sans-serif`; og.textAlign = 'left'; og.textBaseline = 'middle';
    og.fillText('highlights', w * 0.06, hh * 0.065);
    og.fillStyle = '#ff3df2'; og.beginPath(); og.arc(w * 0.86, hh * 0.065, w * 0.018, 0, TAU); og.fill();
    og.fillStyle = 'rgba(255,255,255,.75)'; og.font = `800 ${Math.round(w * 0.045)}px system-ui, sans-serif`; og.fillText('LIVE', w * 0.68, hh * 0.066);
    const per = 2.6, tt = now - t0, i = Math.floor(tt / per) % posts.length, ph = (tt % per) / per;
    const p = posts[i], q = posts[(i + 1) % posts.length];
    if (posts.length > 1 && ph > 0.88) {
      const k = (ph - 0.88) / 0.12;
      if (rm) { renderPost(og, w, hh, p, 1 - k, 0); renderPost(og, w, hh, q, k, 0); }
      else { renderPost(og, w, hh, p, 1, -k * w); renderPost(og, w, hh, q, 1, (1 - k) * w); }
    } else renderPost(og, w, hh, p, 1, 0);
    // pixelate with damage
    const pf = Math.max(0.12, 1 - damage * 0.88);
    let src = off;
    if (pf < 0.97) {
      pix.width = Math.max(10, Math.round(w * pf)); pix.height = Math.max(14, Math.round(hh * pf));
      pg.imageSmoothingEnabled = true; pg.clearRect(0, 0, pix.width, pix.height); pg.drawImage(off, 0, 0, pix.width, pix.height);
      src = pix;
    }
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.clearRect(0, 0, w, hh);
    sg.imageSmoothingEnabled = false;
    const n = bands.length, bh = hh / n, shw = src.width / w;
    for (let b = 0; b < n; b++) {
      const dx = rm ? 0 : bands[b] * kick * w * 0.12;
      sg.drawImage(src, 0, b * bh * shw, src.width, bh * shw, dx, b * bh, w, bh + 1);
    }
    // rgb split ghosts while kicked
    if (!rm && kick > 0.05) {
      sg.globalCompositeOperation = 'lighter';
      sg.globalAlpha = 0.25 * kick;
      sg.drawImage(src, 0, 0, src.width, src.height, -6 * dpr * kick, 0, w, hh);
      sg.globalAlpha = 1; sg.globalCompositeOperation = 'source-over';
    }
    // dead-pixel cracks
    for (const c of cracks) { sg.fillStyle = c.c; sg.fillRect(c.x * w, c.y * hh, c.w * w, c.h * hh); }
    // scanlines
    sg.fillStyle = 'rgba(0,0,0,.12)';
    for (let y = 0; y < hh; y += 4 * dpr) sg.fillRect(0, y, w, dpr);
    kick = Math.max(0, kick - dt * 2.6);
    if (!rm) screenEl.style.transform = kick > 0.05 ? `translate(${(Math.random() - 0.5) * 6 * kick}px, ${(Math.random() - 0.5) * 3 * kick}px) rotate(${(Math.random() - 0.5) * 1.2 * kick}deg)` : '';
  }
  ticks.add(drawScreen);

  const hit = (amt, px, py, fromGlitzi = false) => {
    if (shattered || signal.aborted) return;
    damage = Math.min(1, damage + amt);
    hits++; result.glitches = hits;
    kick = 1;
    bands = bands.map(() => (Math.random() < 0.55 ? (Math.random() - 0.5) * 2 : 0));
    const lx = px != null ? (px - sx) / sw : Math.random(), ly = py != null ? (py - sy) / sh : Math.random();
    for (let k = 0; k < 3; k++) cracks.push({ x: clamp(lx + (Math.random() - 0.5) * 0.3, 0, 0.95), y: clamp(ly + (Math.random() - 0.5) * 0.2, 0, 0.97), w: 0.04 + Math.random() * 0.22, h: 0.012 + Math.random() * 0.03,
      c: ['#05061c', '#3ee8ff', '#ff3df2', GREEN][(Math.random() * 4) | 0] });
    const ax = sx + lx * sw, ay = sy + ly * sh;
    shards(ax, ay, fromGlitzi ? 4 : 7);
    audio.fx?.('crackle', { intensity: 0.35 + damage * 0.5, pan: (ax / W - 0.5) * 1.2 });
    haptic('tick');
    meter.style.width = `${Math.round(damage * 100)}%`;
    meterBox.setAttribute('aria-valuenow', Math.round(damage * 100));
    const now = performance.now();
    if (now - lastPulse > 450) { lastPulse = now; realm()?.pulse?.('tap', { x: ax, y: ay }); }
    world.setEmotion({ jealous: Math.max(0.05, 1 - damage * 1.1), playful: damage * 0.85, excited: damage * 0.2 }, startI, { quiet: true });
    rig('glitch', 1.2 + damage * 0.8);
    realm()?.setMood?.({ agitation: 0.55 + damage * 0.3 });
    if (now - lastReact > 1300) { lastReact = now; world.react('tap'); }
    if (damage > 0.3 && !hit.q1) { hit.q1 = true; say('Ooh, a crack. Do that again.', 2000); }
    else if (damage > 0.62 && !hit.q2) { hit.q2 = true; say('Budge up, I want a go. This is me helping.', 2400); }
    // Glitzi joins in: every third hit, a gleeful zap of its own
    if (!fromGlitzi && hits % 3 === 0) {
      setTimeout(() => {
        if (shattered || signal.aborted) return;
        joined++;
        const m = world.mallowRect();
        const tx = sx + sw * (0.2 + Math.random() * 0.6), ty = sy + sh * (0.3 + Math.random() * 0.5);
        zap(m.cx, m.top + m.height * 0.3, tx, ty);
        hit(0.04, tx, ty, true);
      }, 260);
    }
    if (damage >= 1) shatter();
  };

  let resolveGlitch = null;
  function shatter() {
    shattered = true;
    ticks.delete(drawScreen);
    // break the screen into pixels sampled from what it last showed
    const cols = 9, rows = 13;
    const tiny = document.createElement('canvas'); tiny.width = cols; tiny.height = rows;
    const tg = tiny.getContext('2d');
    tg.drawImage(off, 0, 0, cols, rows);
    let data = null;
    try { data = tg.getImageData(0, 0, cols, rows).data; } catch { data = null; }
    const cw = sw / cols, ch = sh / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (calm && (r + c) % 2) continue;
      const k = (r * cols + c) * 4;
      const neon = (r * 7 + c * 3) % 4 === 0;
      const col = data && !neon ? `rgb(${Math.min(255, data[k] * 1.25)},${Math.min(255, data[k + 1] * 1.25)},${Math.min(255, data[k + 2] * 1.25)})` : ['#3ee8ff', '#ff3df2', GREEN][(r + c) % 3];
      const x = sx + (c + 0.5) * cw, y = sy + (r + 0.5) * ch;
      const a = Math.atan2(y - (sy + sh / 2), x - (sx + sw / 2));
      const v = rm ? 12 : 60 + Math.random() * 120;
      parts.push({ kind: 'sq', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (rm ? 0 : 60), grav: rm ? 0 : 420, age: 0, life: rm ? 0.9 : 1.1 + Math.random() * 0.6, s: Math.min(cw, ch) * 0.9, c: col });
    }
    screenEl.remove();
    world.react('glitchBurst');
    audio.fx?.('snap', { intensity: 0.9 });
    haptic('buzz');
    realm()?.pulse?.('burst', { x: sx + sw / 2, y: sy + sh / 2 });
    world.setEmotion({ playful: 0.85, excited: 0.15 }, 0.8);
    resolveGlitch?.();
  }

  await until((done) => {
    resolveGlitch = done;
    let down = null, lastX = 0, dir = 0, travel = 0, lastRub = 0;
    screenEl.addEventListener('pointerdown', (e) => { e.preventDefault(); down = e.pointerId; lastX = e.clientX; dir = 0; travel = 0; screenEl.setPointerCapture?.(e.pointerId); hit(0.07, e.clientX, e.clientY); });
    screenEl.addEventListener('pointermove', (e) => {
      if (down !== e.pointerId) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      travel += Math.abs(dx);
      const nd = Math.sign(dx);
      const now = performance.now();
      if (nd && dir && nd !== dir && travel > 18 && now - lastRub > 170) { lastRub = now; travel = 0; hit(0.028, e.clientX, e.clientY); }
      if (nd) dir = nd;
    });
    const up = () => { down = null; };
    screenEl.addEventListener('pointerup', up);
    screenEl.addEventListener('pointercancel', up);
    screenEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(0.1); } });
    glitchBtn.onclick = () => hit(0.1);
    let lastMotion = 0;
    motionHit = () => { const now = performance.now(); if (now - lastMotion > 260) { lastMotion = now; hit(0.07); } };
  });
  motionHit = null;
  if (signal.aborted) return result;
  dock.replaceChildren();
  await wait(rm ? 300 : 700);
  await say('Whoops. Reel: deleted. Feeling: still here. Good — we’re using it.', 3000);
  if (signal.aborted) return result;
  realm()?.transform?.(0.2);

  // =============================================== 2. FIND THE NEEDLE ==
  setMove(1, { eyebrow: 'Move 2 of 4', title: 'Find the needle', prompt: 'Drag the needle round, or spin it. See where it settles.' });
  world.setEmotion({ confused: 0.5, jealous: 0.3, curious: 0.2 }, 0.7);
  rig('glitch', 1.5);
  realm()?.setMood?.({ agitation: 0.6, clarity: 0.25 });
  const compass = buildCompass();
  compass.el.setAttribute('role', 'slider');
  compass.el.setAttribute('tabindex', '0');
  compass.el.setAttribute('aria-label', 'Envy compass. Use left and right arrows to move the needle; Enter to choose.');
  compass.el.setAttribute('aria-valuemin', '1');
  compass.el.setAttribute('aria-valuemax', String(WANTS.length));
  Object.assign(compass.el.style, { position: 'absolute', pointerEvents: 'auto', touchAction: 'none', cursor: 'grab' });
  layer.append(compass.el);
  const readTitle = h('div', { style: { font: '700 20px/1.2 var(--font-display)', textAlign: 'center' }, 'aria-live': 'polite' }, 'Needle says: …spinning…');
  const readGloss = h('p', { class: 'muted', style: { textAlign: 'center', margin: '2px 0 0', minHeight: '20px' } }, 'Grab it. It’s faster than it looks.');
  const prevBtn = h('button', { class: 'btn', 'aria-label': 'Move the needle anticlockwise' }, '◀');
  const spinBtn = h('button', { class: 'btn', 'aria-label': 'Spin the needle' }, 'Spin');
  const nextBtn = h('button', { class: 'btn', 'aria-label': 'Move the needle clockwise' }, '▶');
  const wantBtn = h('button', { class: 'btn primary block', disabled: true }, 'Yes, that’s what I want');
  dock.replaceChildren(h('div', {}, readTitle, readGloss), h('div', { class: 'row-btns' }, prevBtn, spinBtn, nextBtn), wantBtn);
  await frame();
  layout = () => { arrange(compass.el, 300, { maxScale: 0.55 }); };
  layout();
  sayAfter('Right. That sting? It’s pointing at something you want. Let’s find out what.', 3200);

  const wantIdx = await until((done) => {
    let ang = Math.random() * TAU, vel = rm ? 0.8 : 7, st = 'wild', target = 0, offAng = 0, lastSector = -1, lastTickAt = 0, lastMoveT = 0, prevAng = 0;
    const centre = () => { const r = compass.el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const pAng = (e) => { const [cx, cy] = centre(); return Math.atan2(e.clientX - cx, -(e.clientY - cy)); };
    const sectorOf = (a) => ((Math.round(a / SECTOR) % WANTS.length) + WANTS.length) % WANTS.length;
    const nearest = (a) => Math.round(a / SECTOR) * SECTOR;
    const unsettle = () => { wantBtn.disabled = true; readGloss.textContent = ''; };
    const step = (dt) => {
      if (st === 'wild') {
        if (rm) vel = 0.8; else { vel += (Math.random() - 0.5) * 40 * dt; vel = clamp(vel, -9, 9); if (Math.abs(vel) < 3) vel += Math.sign(vel || 1) * 6 * dt; }
        ang += vel * dt;
        if (!calm && Math.random() < dt * 1.5) ang += (Math.random() - 0.5) * 1.2; // glitch jump
      } else if (st === 'free') {
        ang += vel * dt; vel *= Math.exp(-1.5 * dt);
        if (Math.abs(vel) < 1.1) { st = 'settling'; target = nearest(ang + vel * 0.25); }
      } else if (st === 'settling') {
        const acc = -46 * (ang - target) - 9.5 * vel;
        vel += acc * dt; ang += vel * dt;
        if (Math.abs(ang - target) < 0.004 && Math.abs(vel) < 0.06) { ang = target; vel = 0; st = 'settled'; settled(); }
      }
      const sec = sectorOf(ang);
      if (sec !== lastSector) {
        lastSector = sec;
        const now = performance.now();
        if (st !== 'wild' && now - lastTickAt > 55) { lastTickAt = now; audio.fx?.('rotate-tick', { intensity: 0.4, pitch: 0.9 + sec * 0.04 }); haptic('tick'); }
        compass.highlight(sec);
        if (st !== 'settled') readTitle.textContent = st === 'wild' ? 'Needle says: …spinning…' : `Needle says: ${WANTS[sec][1]}?`;
        compass.el.setAttribute('aria-valuenow', String(sec + 1));
        compass.el.setAttribute('aria-valuetext', WANTS[sec][1]);
      }
      const jitter = st === 'wild' && !rm ? (Math.random() - 0.5) * 0.08 : 0;
      compass.setNeedle(ang + jitter, st === 'settled');
    };
    ticks.add(step);
    function settled() {
      const sec = sectorOf(ang);
      readTitle.textContent = `Needle says: ${WANTS[sec][1]}`;
      readGloss.textContent = WANTS[sec][2];
      wantBtn.disabled = false;
      audio.fx?.('chime', { intensity: 0.6, pitch: 1 + sec * 0.03 });
      haptic('pop');
      world.react('nod');
      world.setEmotion({ hopeful: 0.55, curious: 0.35, playful: 0.1 }, 0.7);
      rig('glitch', 0.9);
      const r = compass.el.getBoundingClientRect();
      realm()?.pulse?.('ripple', { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      if (settled.last !== sec) { settled.last = sec; say(WANTS[sec][3], 3400); }
    }
    const touch = () => { if (st === 'wild') { world.setEmotion({ curious: 0.7, playful: 0.3 }, 0.7); rig('glitch', 1.1); } };
    compass.el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); touch(); unsettle();
      st = 'drag'; offAng = ang - pAng(e); prevAng = ang; lastMoveT = performance.now(); vel = 0;
      compass.el.setPointerCapture?.(e.pointerId); compass.el.style.cursor = 'grabbing';
    });
    compass.el.addEventListener('pointermove', (e) => {
      if (st !== 'drag') return;
      let a = pAng(e) + offAng;
      while (a - ang > Math.PI) a -= TAU;
      while (a - ang < -Math.PI) a += TAU;
      const now = performance.now(), dt = Math.max(0.008, (now - lastMoveT) / 1000);
      vel = vel * 0.5 + ((a - prevAng) / dt) * 0.5;
      prevAng = a; ang = a; lastMoveT = now;
    });
    const release = () => { if (st !== 'drag') return; compass.el.style.cursor = 'grab'; if (performance.now() - lastMoveT > 90) vel = 0; vel = clamp(vel, -20, 20); st = 'free'; if (Math.abs(vel) > 4) audio.fx?.('sort', { intensity: 0.4 }); };
    compass.el.addEventListener('pointerup', release);
    compass.el.addEventListener('pointercancel', release);
    const nudge = (d) => { touch(); unsettle(); if (st === 'wild' || st === 'drag') { vel = 0; target = nearest(ang); } else if (st !== 'settling') target = nearest(ang); target += d * SECTOR; st = 'settling'; };
    prevBtn.onclick = () => nudge(-1);
    nextBtn.onclick = () => nudge(1);
    spinBtn.onclick = () => { touch(); unsettle(); st = 'free'; vel = (rm ? 4 : 9 + Math.random() * 7) * (Math.random() < 0.5 ? -1 : 1); audio.fx?.('sort', { intensity: 0.5 }); world.react('tap'); };
    compass.el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); nudge(-1); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); nudge(1); }
      else if ((e.key === 'Enter' || e.key === ' ') && st === 'settled') { e.preventDefault(); finish(); }
    });
    const finish = () => { ticks.delete(step); done(sectorOf(ang)); };
    wantBtn.onclick = finish;
  });
  if (signal.aborted || wantIdx == null) return result;
  const want = WANTS[wantIdx];
  result.want = want[1];
  compass.lock();
  audio.fx?.('star', { intensity: 0.6 });
  haptic('success');
  realm()?.transform?.(0.42);
  realm()?.setMood?.({ agitation: 0.45, clarity: 0.45, warmth: 0.25 });
  compass.el.style.transition = rm ? 'opacity 400ms' : 'opacity 400ms, transform 500ms var(--ease-out)';
  compass.el.style.opacity = '0';
  if (!rm) compass.el.style.transform = 'scale(.8)';
  await wait(450);
  if (signal.aborted) return result;
  compass.el.remove();
  compass.el.style.transition = ''; compass.el.style.opacity = '1'; compass.el.style.transform = '';

  // ================================================= 3. MUTE THE REEL ==
  setMove(2, { eyebrow: 'Move 3 of 4', title: 'Mute the reel', prompt: 'The feed’s still blaring. Grab the dial and turn it down.' });
  world.setEmotion({ jealous: 0.45, frustrated: 0.2, playful: 0.35 }, 0.7);
  rig('glitch', 1.6);
  const feedRow = h('div', { style: { display: 'flex', gap: '10px', width: 'max-content', willChange: 'transform' } });
  const feedPosts = (posts.length ? posts : [{ big: 'HIGHLIGHTS', hue: '#ffd98a' }]);
  for (let k = 0; k < 4; k++) for (const p of feedPosts) {
    feedRow.append(h('div', { style: { flex: '0 0 auto', padding: '8px 12px', borderRadius: '14px', background: `linear-gradient(120deg, ${p.hue}, #ff3df2)`, color: '#fff',
      font: '800 13px/1.1 system-ui, sans-serif', whiteSpace: 'nowrap', boxShadow: '0 0 14px rgba(255,61,242,.35)' } }, `${p.big.length > 18 ? p.big.slice(0, 17) + '…' : p.big}  ♥ ${fmt(2400 + Math.random() * 9000)}`));
  }
  const feed = h('div', { 'aria-hidden': 'true', style: { position: 'absolute', left: '0', right: '0', height: '46px', overflow: 'hidden', pointerEvents: 'none',
    maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' } }, feedRow);
  const knobNum = h('div', { style: { font: '800 34px/1 var(--font-display)', color: '#fff', textShadow: '0 0 12px rgba(62,232,255,.7)' } }, '10');
  const knobLbl = h('div', { style: { font: '700 10px/1 var(--font-ui)', letterSpacing: '.16em', color: 'rgba(255,255,255,.65)', marginTop: '4px' } }, 'VOLUME');
  const grip = h('div', { style: { position: 'absolute', left: '50%', top: '8%', width: '6px', height: '22%', marginLeft: '-3px', borderRadius: '3px', background: '#fff', boxShadow: '0 0 10px #3ee8ff' } });
  const knobFace = h('div', { style: { position: 'absolute', inset: '14%', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #3b2c8f, #160f45 70%)',
    boxShadow: 'inset 0 2px 6px rgba(255,255,255,.18), inset 0 -6px 14px rgba(0,0,0,.5), 0 8px 24px rgba(0,0,0,.45)' } }, grip);
  const knobCentre = h('div', { style: { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', pointerEvents: 'none' } }, h('div', { style: { textAlign: 'center' } }, knobNum, knobLbl));
  const knob = h('div', { role: 'slider', tabindex: '0', 'aria-label': 'Comparison feed volume. Use arrow keys to turn it down.', 'aria-valuemin': '0', 'aria-valuemax': '10', 'aria-valuenow': '10',
    style: { position: 'absolute', borderRadius: '50%', pointerEvents: 'auto', touchAction: 'none', cursor: 'grab' } }, knobFace, knobCentre);
  layer.append(feed, knob);
  const downBtn = h('button', { class: 'btn', 'aria-label': 'Turn the volume down one notch' }, 'Quieter');
  const upBtn = h('button', { class: 'btn', 'aria-label': 'Turn the volume up one notch' }, 'Louder');
  const quietBtn = h('button', { class: 'btn primary block', disabled: true }, 'That’s quieter');
  const volHint = h('p', { class: 'muted', style: { textAlign: 'center', margin: 0 } }, 'Twist anticlockwise, like a real dial.');
  dock.replaceChildren(volHint, h('div', { class: 'row-btns' }, downBtn, upBtn), quietBtn);
  await frame();
  let feedX = 0;
  layout = () => {
    const s = stage();
    Object.assign(feed.style, { top: `${s.top}px` });
    const D = arrange(knob, Math.min(220, W * 0.6), { offsetTop: 56, maxScale: 0.5 });
    knob.style.visibility = D < 96 ? 'hidden' : '';
  };
  layout();
  hum = audio.hold?.('hum', { intensity: 0.5 }) || null;
  sayAfter('Now, the reel. It’s loud. Turn it down. I’ll pretend not to enjoy it.', 3000);

  let vol = 10, shown = 10;
  const applyVol = () => {
    const v = vol / 10;
    const deg = -135 + 270 * v;
    knobFace.style.transform = `rotate(${deg}deg)`;
    knob.style.background = `conic-gradient(from -135deg, #3ee8ff 0deg, #ff3df2 ${270 * v}deg, rgba(255,255,255,.1) ${270 * v}deg 270deg, transparent 270deg)`;
    feed.style.opacity = String(0.18 + 0.82 * v);
    feed.style.filter = `saturate(${0.2 + v * 0.8}) blur(${(1 - v) * 1.6}px)`;
    const n = Math.round(vol);
    if (n !== shown) {
      const down = n < shown; shown = n;
      knobNum.textContent = String(n);
      knob.setAttribute('aria-valuenow', String(n));
      audio.fx?.('rotate-tick', { intensity: 0.25 + v * 0.4, pitch: 0.8 + v * 0.5 });
      haptic('tick');
      hum?.update?.({ intensity: 0.05 + v * 0.45 });
      world.setEmotion({ jealous: 0.45 * v, frustrated: 0.15 * v, calm: (1 - v) * 0.75, playful: 0.25 }, 0.7, { quiet: true });
      rig('glitch', 0.15 + v * 1.45);
      realm()?.setMood?.({ agitation: 0.08 + v * 0.45, clarity: 0.45 + (1 - v) * 0.4, warmth: 0.25 + (1 - v) * 0.3 });
      realm()?.transform?.(0.42 + (1 - v) * 0.26);
      if (down && n <= 7 && !applyVol.q1) { applyVol.q1 = true; say('Mm. My static likes this.', 1900); }
      else if (down && n <= 4 && !applyVol.q2) { applyVol.q2 = true; say('Quieter. I can hear myself think. Horrifying.', 2400); }
      else if (down && n <= 1 && !applyVol.q3) { applyVol.q3 = true; world.react('sigh'); say('Ahh. Near-silence. Don’t get used to me being this calm.', 2600); }
      quietBtn.disabled = n > 5;
      volHint.textContent = n > 5 ? 'Twist anticlockwise, like a real dial.' : n > 0 ? 'Nice. Keep going, or stop where it feels right.' : 'Muted. Bliss.';
    }
  };
  applyVol();
  const feedTick = (dt) => {
    const v = vol / 10;
    if (!rm) { feedX -= dt * (14 + v * 70); const wRow = feedRow.scrollWidth / 4; if (wRow && -feedX > wRow) feedX += wRow; feedRow.style.transform = `translateX(${feedX}px)`; }
  };
  ticks.add(feedTick);
  await until((done) => {
    let dragging = false, prevA = 0;
    const kAng = (e) => { const r = knob.getBoundingClientRect(); return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))); };
    knob.addEventListener('pointerdown', (e) => { e.preventDefault(); dragging = true; prevA = kAng(e); knob.setPointerCapture?.(e.pointerId); knob.style.cursor = 'grabbing'; });
    knob.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const a = kAng(e); let d = a - prevA; prevA = a;
      if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
      vol = clamp(vol + (d / (Math.PI * 1.5)) * 10, 0, 10);
      applyVol();
    });
    const up = () => { dragging = false; knob.style.cursor = 'grab'; };
    knob.addEventListener('pointerup', up);
    knob.addEventListener('pointercancel', up);
    const bump = (d) => { vol = clamp(Math.round(vol) + d, 0, 10); applyVol(); };
    downBtn.onclick = () => bump(-1);
    upBtn.onclick = () => { bump(1); if (vol >= 10) say('Louder? Bold. Fine. Your dial.', 1800); };
    knob.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); bump(-1); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); bump(1); }
      else if (e.key === 'Home') { e.preventDefault(); vol = 0; applyVol(); }
    });
    quietBtn.onclick = () => done();
  });
  if (signal.aborted) return result;
  result.volume = Math.round(vol);
  audio.fx?.('clear', { intensity: 0.5 });
  haptic('soft');

  setMove(2, { eyebrow: 'Move 3 of 4', title: 'Keep it turned down?', prompt: 'Pick any that suit. Or none — the dial counts.' });
  const muteWrap = h('div', { class: 'chips', style: { justifyContent: 'center' } });
  for (const [id, label] of MUTES) {
    const c = h('button', { class: 'chip', 'aria-pressed': 'false', style: { minHeight: '44px', fontSize: '14px' } }, label);
    c.onclick = () => {
      const on = c.getAttribute('aria-pressed') !== 'true';
      c.setAttribute('aria-pressed', String(on));
      result.mutes = on ? [...result.mutes, id] : result.mutes.filter((x) => x !== id);
      audio.fx?.(on ? 'chime' : 'rotate-tick', { intensity: 0.4, pitch: 1 + result.mutes.length * 0.1 });
      haptic('light');
      if (on) world.react('nod');
      muteDone.textContent = result.mutes.length ? 'Keep it quiet' : 'Skip — the dial’s enough';
    };
    muteWrap.append(c);
  }
  const muteDone = h('button', { class: 'btn primary block' }, 'Skip — the dial’s enough');
  dock.replaceChildren(muteWrap, muteDone);
  await frame();
  layout();
  await until((done) => { muteDone.onclick = done; });
  if (signal.aborted) return result;
  ticks.delete(feedTick);
  hum?.stop(); hum = null;
  if (result.mutes.length) say('Sensible. Ugh. Fine. I’m impressed.', 2200);
  feed.style.transition = 'opacity 500ms'; feed.style.opacity = '0';
  knob.style.transition = 'opacity 500ms'; knob.style.opacity = '0';
  realm()?.transform?.(0.72);
  await wait(550);
  if (signal.aborted) return result;
  feed.remove(); knob.remove();

  // ============================================= 4. ONE STEP YOUR WAY ==
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'One step your way', prompt: `Your needle points to ${want[1].toLowerCase()}. Pick one small step toward it.` });
  world.setEmotion({ determined: 0.55, hopeful: 0.3, playful: 0.15 }, 0.7);
  rig('glitch', 0.4);
  const mini = buildCompass();
  mini.lock();
  mini.setNeedle(wantIdx * SECTOR, true);
  mini.highlight(wantIdx);
  Object.assign(mini.el.style, { position: 'absolute', pointerEvents: 'none' });
  mini.el.setAttribute('aria-hidden', 'true');
  layer.append(mini.el);
  const grid = h('div', { class: 'choice-grid' });
  const ownStep = h('input', { class: 'text', type: 'text', maxlength: '60', placeholder: 'My own small step', 'aria-label': 'Your own small step', autocomplete: 'off', style: { display: 'none' } });
  const lockBtn = h('button', { class: 'btn primary block', disabled: true }, 'Lock it in');
  const opts = [...STEPS[want[0]], 'My own step'];
  opts.forEach((label, i) => {
    const b = h('button', { class: 'choice', 'aria-pressed': 'false', style: { fontSize: '14px', lineHeight: '1.25', padding: '8px 10px' } }, label);
    b.onclick = () => {
      grid.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      audio.ui?.('select'); haptic('light');
      const isOwn = i === opts.length - 1;
      ownStep.style.display = isOwn ? '' : 'none';
      result.step = isOwn ? null : label;
      if (isOwn) { ownStep.focus(); lockBtn.disabled = !ownStep.value.trim(); } else lockBtn.disabled = false;
      world.react('nod');
      requestAnimationFrame(() => layout?.());
    };
    grid.append(b);
  });
  ownStep.addEventListener('input', () => { result.step = ownStep.value.trim() || null; lockBtn.disabled = !result.step; });
  dock.replaceChildren(grid, ownStep, lockBtn);
  await frame();
  layout = () => {
    const D = arrange(mini.el, 190, { minBody: 70, maxScale: 0.45 });
    mini.el.style.visibility = D < 70 ? 'hidden' : '';
  };
  layout();
  sayAfter('Last bit. One small step. Small is the whole point.', 2600);
  await until((done) => { lockBtn.onclick = done; ownStep.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !lockBtn.disabled) done(); }); });
  if (signal.aborted) return result;
  ownStep.blur();
  dock.replaceChildren();

  // ========================================================= FINALE ==
  setMove(4, { eyebrow: 'The Static Storm', title: 'Compass: true', prompt: `Pointing at ${want[1].toLowerCase()}. One step, locked in.` });
  await frame();
  const fs = stage();
  const FD = Math.round(Math.min(W - 80, fs.h * 0.42, 240));
  layout = () => {
    const s = stage();
    // compass on top, room for Glitzi's speech bubble, then Glitzi
    const D = Math.round(Math.min(W - 80, s.h * 0.36, 240));
    Object.assign(mini.el.style, { left: `${(W - D) / 2}px`, top: `${s.top}px`, width: `${D}px`, height: `${D}px`, visibility: '' });
    placeIn(s.top + D + 110, s.bottom, W / 2, 0.75);
  };
  mini.el.style.transition = rm ? 'none' : 'left 600ms var(--ease-out), top 600ms var(--ease-out), width 600ms var(--ease-out), height 600ms var(--ease-out)';
  layout();
  mini.glow();
  realm()?.transform?.(1);
  realm()?.setMood?.({ agitation: 0.05, clarity: 0.95, warmth: 0.6, heaviness: 0 });
  realm()?.pulse?.('success', { x: W / 2, y: fs.top + FD / 2 });
  audio.fx?.('bloom', { intensity: 0.8 });
  haptic('success');
  world.setEmotion({ playful: 0.5, proud: 0.4, loved: 0.1 }, 0.8);
  rig('glitch', 0.7);
  world.react('celebrate');
  await wait(rm ? 250 : 800); // let Glitzi land before the bubble is placed
  if (signal.aborted) return result;
  const m = world.mallowRect();
  hearts(m.cx, m.top + m.height * 0.3, 8);
  await say('Look at you, following your own compass. Gross. I’m so proud.', 3200);
  if (signal.aborted) return result;
  hearts(m.cx, m.top + m.height * 0.3, 5);
  audio.fx?.('star', { intensity: 0.5 });
  await say('Envy can visit again. Now you know what it’s pointing at.', 3000);
  if (signal.aborted) return result;
  cleanup();
  result.completed = true;
  const reelText = [...result.reel, result.ownWords ? `“${result.ownWords}”` : null].filter(Boolean);
  result.summary = [
    { label: 'On the reel', text: cap(listJoin(reelText)) || 'A highlight reel' },
    { label: 'Glitched apart', text: `${result.glitches} glitches (some of them Glitzi’s)` },
    { label: 'The needle pointed to', text: want[1] },
    { label: 'Reel turned down', text: `10 → ${result.volume}${result.mutes.length ? ` · ${listJoin(result.mutes.map((id) => MUTES.find(([x]) => x === id)[1].toLowerCase()))}` : ''}` },
    { label: 'Your step', text: result.step || '—' },
  ];
  result.share = { title: 'Green Glitch Compass', subtitle: `My envy was pointing at ${want[1].toLowerCase()}. Glitzi helped me find it.` };
  return result;

  // ------------------------------------------------- compass builder --
  function buildCompass() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-150 -150 300 300');
    svg.setAttribute('style', 'display:block;width:100%;height:100%;overflow:visible');
    const el = h('div', {}, svg);
    const mk = (tag, attrs, parent = svg) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); parent.append(n); return n; };
    const defs = mk('defs', {});
    const rg = mk('radialGradient', { id: 'ggc-face' }, defs);
    mk('stop', { offset: '0%', 'stop-color': '#1d1660' }, rg);
    mk('stop', { offset: '100%', 'stop-color': '#0b0e33' }, rg);
    const halo = mk('circle', { r: '146', fill: 'none', stroke: GREEN, 'stroke-width': '0', opacity: '0' });
    mk('circle', { r: '140', fill: 'url(#ggc-face)', stroke: '#3ee8ff', 'stroke-width': '3', opacity: '.95' });
    mk('circle', { r: '128', fill: 'none', stroke: 'rgba(255,255,255,.14)', 'stroke-width': '1' });
    const wedge = mk('path', { d: wedgePath(140, SECTOR), fill: 'rgba(124,196,138,.22)' });
    for (let i = 0; i < WANTS.length * 4; i++) {
      const a = (i / (WANTS.length * 4)) * 360, major = i % 4 === 0;
      mk('line', { x1: '0', y1: '-140', x2: '0', y2: major ? '-126' : '-133', stroke: major ? '#3ee8ff' : 'rgba(255,255,255,.35)', 'stroke-width': major ? '3' : '1.5', transform: `rotate(${a})` });
    }
    const labels = WANTS.map(([, label], i) => {
      const a = i * (360 / WANTS.length);
      const flip = a > 90 && a < 270;
      const t = mk('text', { x: '0', y: flip ? '108' : '-104', transform: `rotate(${flip ? a + 180 : a})`, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
        fill: 'rgba(255,255,255,.72)', 'font-size': '13.5', 'font-weight': '800', 'font-family': 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif' });
      t.textContent = label;
      return t;
    });
    const needle = mk('g', {});
    mk('polygon', { points: '0,-98 11,0 0,10 -11,0', fill: GREEN, stroke: '#eaffef', 'stroke-width': '1.5' }, needle);
    mk('polygon', { points: '0,98 9,0 0,-8 -9,0', fill: '#ff3df2', opacity: '.8' }, needle);
    mk('circle', { r: '13', fill: '#0b0e33', stroke: '#3ee8ff', 'stroke-width': '3' });
    mk('circle', { r: '4', fill: '#fff' });
    let locked = false;
    return {
      el,
      setNeedle(a, steady) { needle.setAttribute('transform', `rotate(${(a * 180) / Math.PI})`); needle.style.filter = steady ? `drop-shadow(0 0 6px ${GREEN})` : ''; },
      highlight(i) {
        wedge.setAttribute('transform', `rotate(${i * (360 / WANTS.length)})`);
        labels.forEach((t, k) => { t.setAttribute('fill', k === i ? '#eaffef' : 'rgba(255,255,255,.62)'); t.setAttribute('font-size', k === i ? '15' : '13.5'); });
      },
      lock() { locked = true; wedge.setAttribute('fill', 'rgba(124,196,138,.34)'); },
      glow() { halo.setAttribute('stroke-width', '6'); halo.setAttribute('opacity', '.85'); svg.style.filter = `drop-shadow(0 0 18px ${GREEN})`; void locked; },
    };
  }
}

function wedgePath(r, span) {
  const a0 = -Math.PI / 2 - span / 2, a1 = -Math.PI / 2 + span / 2;
  return `M0,0 L${(Math.cos(a0) * r).toFixed(2)},${(Math.sin(a0) * r).toFixed(2)} A${r},${r} 0 0 1 ${(Math.cos(a1) * r).toFixed(2)},${(Math.sin(a1) * r).toFixed(2)} Z`;
}
function roundRect(c, x, y, w, hh, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + hh, r); c.arcTo(x + w, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function star(c, x, y, s) {
  c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.28, y - s * 0.28); c.lineTo(x + s, y); c.lineTo(x + s * 0.28, y + s * 0.28);
  c.lineTo(x, y + s); c.lineTo(x - s * 0.28, y + s * 0.28); c.lineTo(x - s, y); c.lineTo(x - s * 0.28, y - s * 0.28); c.closePath(); c.fill();
}
function wrap(c, text, maxW, font) {
  c.font = font;
  const words = String(text).split(/\s+/), lines = [];
  let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}
function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
function listJoin(a) { return a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
