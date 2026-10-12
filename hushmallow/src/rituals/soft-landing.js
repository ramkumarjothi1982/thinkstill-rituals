// SOFT LANDING — Blubi, The Softie, in the Raindrop Lagoon.
// For shame, guilt, embarrassment, humiliation, remorse, regret and cousins.
//
// 1. The hot stone    — the sting appears as a heavy, glowing-hot pebble.
//                       Name what kind of sting it is (or use your own words).
//                       Blubi blushes and looks down too: it’s human.
// 2. Cool it down     — drag the stone into the lagoon and swish it, or stroke
//                       it; steam rises and it cools as you move. A splash
//                       button does the same.
// 3. Friend’s words   — choose the kind words you’d give a friend in your
//                       place; each one wraps the stone in a soft bubble layer.
// 4. Repair or rest   — guilt: one small repair (or nothing needed);
//                       embarrassment/shame: one soothing next step.
// Finale              — the stone is now a smooth pebble; pop it in your pocket.
//
// Self-compassion, not reframing: nothing here weighs whether the person did
// something wrong or whether a thought is accurate. Acknowledge, soothe, and
// where relevant, repair. All lines are authored; free text is only shown back.

import { h, wait } from '../app/ui.js';

const STINGS = [
  { id: 'messed', label: 'I messed up', kind: 'guilt', tag: 'a messed-up moment',
    reply: 'Oh, the messing-up sting. I know that one. Look, my cheeks have gone pink just hearing it.' },
  { id: 'embarrassed', label: 'I embarrassed myself', kind: 'shame', tag: 'an embarrassing moment',
    reply: 'Ohh. The cheeks-on-fire one. Mine are doing it too. See? Very human.' },
  { id: 'letdown', label: 'I let someone down', kind: 'guilt', tag: 'letting someone down',
    reply: 'That one sits heavy. It’s heavy because they matter to you.' },
  { id: 'notenough', label: 'I feel not good enough', kind: 'shame', tag: 'a not-good-enough feeling',
    reply: 'Oh, that’s a heavy little stone. Let’s hold it together, very gently.' },
];
const OWN_REPLY = 'Thank you for telling me. I’ll hold it carefully. No judging, only squishing.';

const WORDS = [
  ['everyone', 'Everyone gets this wrong sometimes'],
  ['moment', 'You’re more than one moment'],
  ['care', 'You noticed. That means you care'],
  ['stung', 'Of course that stung. It would sting anyone'],
  ['side', 'I’m still on your side'],
  ['progress', 'You’re allowed to be a work in progress'],
];
const WORD_REPLIES = [
  'Ohh, that’s lovely. Say it to yourself too, just quietly.',
  'Another soft layer. I’m welling up a little.',
  'See? You know exactly how to be kind. Point it inwards.',
  'So squishy now. The stone barely knows what’s happening.',
  'You’d say that to a friend in a heartbeat. You count too.',
  'All wrapped up. Like a little pearl in a raincoat.',
];

const REPAIR = [
  ['sorry', 'Say sorry, in your own time', 'A short, honest sorry is plenty. When, and whether, is up to you. No rush tonight.'],
  ['fix', 'Put one small thing right', 'Just one small piece. You don’t have to mend everything at once.'],
  ['learn', 'Learn one thing from it', 'One little lesson, tucked away. Then you’re allowed to stop replaying it.'],
  ['none', 'Nothing needs doing', 'Then nothing it is. Sometimes a sting is just a sting. Let it be soft.'],
];
const REST = [
  ['warm', 'Something warm, slow sips', 'Hands round a warm mug. Very Blubi-approved.'],
  ['heart', 'Hand on heart, three slow breaths', 'Hand on your chest. In… and out, a bit longer. That’s you on your own side.'],
  ['cosy', 'Get cosy for a bit', 'Blanket, soft socks, the works. A little squish time.'],
  ['replay', 'Let the replay rest tonight', 'If it starts replaying, you can say “not now” and come back to the cushion.'],
];
const GUILT_IDS = new Set(['guilt', 'remorse', 'regret', 'apologetic', 'qualms', 'obligated']);

export const meta = { id: 'soft-landing' };

// readable over the bright lagoon: pressed choices keep a dark glass base
const PRESSED_BG = 'rgba(12,20,80,.72)';
const press = (b, on) => { b.setAttribute('aria-pressed', String(on)); b.style.background = on ? PRESSED_BG : ''; };

export async function run(ctx) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const rm = !!ctx.reducedMotion, low = !!ctx.lowStim;
  const realm = () => world.realm;
  const say = (t, ms = 3200) => ctx.say(t, { who: 'Blubi', ms });
  const result = { completed: false, sting: null, stingText: '', branch: 'shame', cooledBy: null, words: [], next: null };
  const I = clamp(ctx.input?.intensity ?? 0.65, 0.25, 0.95);
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

  // ------------------------------------------------- fx canvas + stone --
  const canvas = h('canvas', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', touchAction: 'none' } });
  world.fx.replaceChildren(canvas);
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let relayout = () => {};
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    relayout();
  };
  resize();
  addEventListener('resize', resize);

  // the stone
  const S = {
    x: W * 0.7, y: -80, hx: W * 0.7, hy: H * 0.5, r: 50,
    heat: 1, smooth: 0, layers: [], label: '', labelMax: H, alpha: 1, scale: 1, homing: true, pearl: 0,
    seed: Array.from({ length: 11 }, (_, i) => 0.55 + 0.45 * Math.sin(i * 2.3 + 1.1) * Math.cos(i * 1.7)),
  };
  const steam = [];
  const ripples = [];
  let pocket = null; // {x,y,w,h,open,glint}
  let t = 0, raf = 0, last = performance.now();
  const waterY = () => H * 0.6;

  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (S.homing) { const k = 1 - Math.pow(0.002, dt); S.x += (S.hx - S.x) * k; S.y += (S.hy - S.y) * k; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    drawRipples(dt);
    drawPocket(false);
    drawStone();
    drawPocket(true);
    drawSteam(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  function stonePath(r) {
    const n = S.seed.length, rough = 0.2 * (1 - S.smooth);
    const pts = S.seed.map((v, i) => {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (1 + (v - 0.55) * rough * 1.6);
      return [Math.cos(a) * rr * 1.12, Math.sin(a) * rr * 0.86];
    });
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = pts[i % n], q = pts[(i + 1) % n];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      if (i === 0) g.moveTo(mx, my); else g.quadraticCurveTo(p[0], p[1], mx, my);
    }
    g.closePath();
  }
  function drawStone() {
    if (S.alpha <= 0) return;
    const heat = S.heat, r = S.r * S.scale;
    const breathe = rm || low ? 0 : Math.sin(t * 2.2) * 0.04 * heat;
    g.save();
    g.globalAlpha = S.alpha;
    g.translate(S.x, S.y);
    // heat glow
    if (heat > 0.02) {
      const gr = g.createRadialGradient(0, 0, r * 0.5, 0, 0, r * (2.1 + breathe * 4));
      gr.addColorStop(0, `rgba(255,140,70,${0.55 * heat})`); gr.addColorStop(1, 'rgba(255,90,60,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 2.4, 0, Math.PI * 2); g.fill();
    }
    // soft shadow
    g.fillStyle = 'rgba(4,16,60,0.28)';
    g.beginPath(); g.ellipse(0, r * 0.95, r * 1.0, r * 0.2, 0, 0, Math.PI * 2); g.fill();
    // body
    const hot = ['#fff1c4', '#ff9a4a', '#c8382a'];
    const cool = ['#d6e2f7', '#8698c4', '#4b5b8c'];
    const pearl = ['#ffffff', '#cdbfff', '#7d86d8'];
    const col = (i) => rgb(mix(mix(hex(cool[i]), hex(hot[i]), heat), hex(pearl[i]), S.pearl));
    g.save();
    g.scale(1 + breathe, 1 + breathe);
    stonePath(r);
    const body = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.25);
    body.addColorStop(0, col(0)); body.addColorStop(0.5, col(1)); body.addColorStop(1, col(2));
    g.fillStyle = body; g.fill();
    if (S.pearl > 0) { g.strokeStyle = `rgba(255,255,255,${0.7 * S.pearl})`; g.lineWidth = 1.5; g.stroke(); }
    // cracks / glowing seams while hot
    if (heat > 0.15 && S.smooth < 0.9) {
      g.strokeStyle = `rgba(255,236,170,${0.7 * heat * (1 - S.smooth)})`; g.lineWidth = 2; g.lineCap = 'round';
      g.lineJoin = 'miter';
      const crack = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * r, y * r) : g.moveTo(x * r, y * r))); g.stroke(); };
      crack([[-0.62, 0.42], [-0.38, 0.2], [-0.3, 0.32], [-0.05, 0.02], [0.08, 0.1], [0.34, -0.3]]);
      crack([[-0.05, 0.02], [0.02, 0.38], [0.18, 0.5]]);
    }
    // highlight
    g.fillStyle = `rgba(255,255,255,${0.25 + 0.45 * (1 - heat) * (0.4 + S.smooth * 0.6)})`;
    g.beginPath(); g.ellipse(-r * 0.38, -r * 0.34, r * 0.32, r * 0.15, -0.5, 0, Math.PI * 2); g.fill();
    if (S.pearl > 0) {
      g.fillStyle = `rgba(255,142,242,${0.18 * S.pearl})`;
      g.beginPath(); g.ellipse(r * 0.3, r * 0.25, r * 0.5, r * 0.28, 0.3, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    // bubble layers
    S.layers.forEach((L, i) => {
      L.p = Math.min(1, L.p + (rm ? 1 : 0.035));
      const wob = rm ? 0 : Math.sin(t * 1.4 + i) * 2.5;
      const R = (r * 1.2 + 10 + i * 8) * (0.6 + 0.4 * ease(L.p)) + wob;
      const sg = g.createLinearGradient(-R, -R, R, R);
      sg.addColorStop(0, `rgba(255,142,242,${0.75 * L.p})`); sg.addColorStop(0.5, `rgba(244,251,255,${0.9 * L.p})`); sg.addColorStop(1, `rgba(127,212,255,${0.75 * L.p})`);
      g.fillStyle = `rgba(200,235,255,${0.07 * L.p})`;
      g.beginPath(); g.ellipse(0, 0, R * 1.08, R * 0.9, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = sg; g.lineWidth = 2;
      g.stroke();
      g.fillStyle = `rgba(255,255,255,${0.55 * L.p})`;
      g.beginPath(); g.ellipse(-R * 0.55, -R * 0.5, R * 0.12, R * 0.05, -0.7, 0, Math.PI * 2); g.fill();
    });
    g.restore();
    // own words / label under the stone
    if (S.label) {
      const ly = S.y + r * 1.25 + 16 + S.layers.length * 6;
      g.font = '650 13px "Nunito Sans", ui-rounded, system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const lines = wrap(S.label, Math.min(W * 0.42, 170)).slice(0, 3);
      if (ly + lines.length * 16 > S.labelMax) return;
      lines.forEach((ln, i) => {
        g.shadowColor = 'rgba(5,10,58,0.9)'; g.shadowBlur = 6;
        g.fillStyle = `rgba(244,251,255,${0.92 * S.alpha})`; g.fillText(ln, S.x, ly + i * 16);
        g.shadowBlur = 0;
      });
    }
  }
  function wrap(text, max) {
    const words = text.split(/\s+/), out = []; let cur = '';
    for (const w of words) { const n = cur ? `${cur} ${w}` : w; if (g.measureText(n).width > max && cur) { out.push(cur); cur = w; } else cur = n; }
    if (cur) out.push(cur);
    if (out.length > 3) out[2] = `${out[2].replace(/.{0,2}$/, '')}…`;
    return out;
  }
  function puff(x, y, n) {
    if (low) n = Math.ceil(n / 3);
    if (rm) n = Math.min(n, 2);
    for (let i = 0; i < n; i++) {
      steam.push({ x: x + (Math.random() - 0.5) * S.r, y: y - S.r * 0.4, vx: (Math.random() - 0.5) * 18, vy: -(28 + Math.random() * 40) * (rm ? 0.5 : 1),
        age: 0, life: 1.2 + Math.random() * 1.1, s: 8 + Math.random() * 12 });
    }
  }
  function drawSteam(dt) {
    for (const p of steam) { p.age += dt; p.x += (p.vx + (rm ? 0 : Math.sin(p.age * 3 + p.s) * 10)) * dt; p.y += p.vy * dt; p.s += dt * 10; }
    for (let i = steam.length - 1; i >= 0; i--) if (steam[i].age > steam[i].life) steam.splice(i, 1);
    if (steam.length > 140) steam.splice(0, steam.length - 140);
    for (const p of steam) {
      const a = Math.sin(Math.PI * (p.age / p.life)) * 0.32;
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
      gr.addColorStop(0, `rgba(244,251,255,${a})`); gr.addColorStop(1, 'rgba(244,251,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.s, 0, Math.PI * 2); g.fill();
    }
  }
  function ripple(x, y) { ripples.push({ x, y, age: 0 }); if (ripples.length > 12) ripples.shift(); }
  function drawRipples(dt) {
    for (const rp of ripples) rp.age += dt;
    while (ripples.length && ripples[0].age > 1.6) ripples.shift();
    for (const rp of ripples) {
      const k = rp.age / 1.6;
      g.strokeStyle = `rgba(200,236,255,${0.5 * (1 - k)})`; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(rp.x, rp.y, 14 + k * 60, (14 + k * 60) * 0.28, 0, 0, Math.PI * 2); g.stroke();
    }
  }
  function drawPocket(front) {
    if (!pocket) return;
    const { x, y, w, h: ph } = pocket;
    g.save();
    if (!front) {
      // back of the pocket (opening)
      g.fillStyle = 'rgba(40,30,110,0.85)';
      g.beginPath(); g.ellipse(x, y, w * 0.46, ph * 0.12, 0, 0, Math.PI * 2); g.fill();
    } else {
      // fabric front: a rounded patch pocket with stitching
      const top = y, bot = y + ph;
      g.beginPath();
      g.moveTo(x - w / 2, top);
      g.lineTo(x + w / 2, top);
      g.lineTo(x + w / 2 - 6, bot - 20);
      g.quadraticCurveTo(x + w / 2 - 10, bot, x + w / 2 - 30, bot);
      g.lineTo(x - w / 2 + 30, bot);
      g.quadraticCurveTo(x - w / 2 + 10, bot, x - w / 2 + 6, bot - 20);
      g.closePath();
      const fg = g.createLinearGradient(0, top, 0, bot);
      fg.addColorStop(0, '#ff9fd8'); fg.addColorStop(1, '#c76ad8');
      g.fillStyle = fg; g.fill();
      g.setLineDash([5, 5]); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x - w / 2 + 8, top + 8); g.lineTo(x + w / 2 - 8, top + 8); g.stroke();
      g.setLineDash([]);
      if (pocket.glint > 0) {
        pocket.glint = Math.max(0, pocket.glint - 0.012);
        g.fillStyle = `rgba(255,255,255,${0.8 * pocket.glint})`;
        g.beginPath(); g.arc(x, top + ph * 0.45, 4 + (1 - pocket.glint) * 10, 0, Math.PI * 2); g.fill();
      }
    }
    g.restore();
  }

  let drainSound = null;
  const cleanup = () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    for (const tm of timers) clearTimeout(tm);
    timers.clear();
    world.fx.classList.remove('live');
    world.fx.replaceChildren();
    drainSound?.stop(); drainSound = null;
  };
  signal.addEventListener('abort', cleanup, { once: true });
  const aborted = (r) => signal.addEventListener('abort', r, { once: true });

  // ---------------------------------------------------------- layout --
  const titleEl = dock.parentElement?.querySelector('.move-title');
  const free = () => {
    const top = (titleEl?.getBoundingClientRect().bottom || H * 0.22) + 10;
    const dr = dock.getBoundingClientRect();
    const bottom = (dr.height ? dr.top : H * 0.75) - 12;
    return { top, bottom: Math.max(top + 80, bottom) };
  };
  function sideBySide({ mx = 28, sx = 0.7 } = {}) {
    const f = free(), fh = f.bottom - f.top;
    const layerH = Math.min(H * 0.56, 470), layerW = Math.min(W * 0.86, 430);
    const s = clamp(Math.min((fh * 0.8) / (0.66 * layerH), (W * 0.44) / (0.64 * layerW)), 0.3, 0.8);
    const cy = (f.top + f.bottom) / 2;
    world.place({ x: mx, y: ((cy - 0.05 * layerH * s) / H) * 100, scale: s });
    S.r = clamp(Math.min(W * 0.14, fh * 0.2), 26, 60);
    S.hx = W * sx; S.hy = cy - Math.min(20, fh * 0.06);
    S.labelMax = f.bottom;
    return f;
  }
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // ============================================ 1. THE HOT STONE ==
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'The hot stone', prompt: 'That sting, as a stone. What kind of sting is it?' });
  world.setEmotion({ embarrassed: 0.6, guilty: 0.4 }, Math.max(0.55, I));
  realm()?.setMood?.({ heaviness: 0.35 + I * 0.4, agitation: 0.15, clarity: 0.1, warmth: 0.2 });

  const grid = h('div', { class: 'choice-grid' });
  const ownBtn = h('button', { class: 'btn ghost block', style: { background: 'rgba(5,10,58,.45)', color: 'var(--text-1)' }, 'aria-label': 'Describe the sting in my own words' }, 'In my own words');
  for (const s of STINGS) {
    grid.append(h('button', { class: 'choice', 'aria-pressed': 'false', style: { minHeight: '52px' }, onclick: () => pickSting(s) }, s.label));
  }
  dock.replaceChildren(grid, ownBtn);
  relayout = () => sideBySide();
  await frame();
  relayout();
  S.x = S.hx; S.y = -S.r * 2;
  if (rm) { S.x = S.hx; S.y = S.hy; }
  later(() => { audio.fx?.('drop-in', { intensity: 0.5 }); haptic('soft'); realm()?.pulse?.('ripple', { x: S.hx, y: S.hy + S.r }); }, rm ? 0 : 500);
  say('Oh. That looks like it stings. Can you tell me what kind?', 3400);

  let pickSting;
  await new Promise((resolve) => {
    pickSting = (s, own) => {
      if (result.sting) return;
      result.sting = s ? s.id : 'own';
      result.stingText = own || s.label;
      result.branch = s ? s.kind : ((ctx.input?.emotions || []).some((e) => GUILT_IDS.has(e.id)) ? 'guilt' : 'shame');
      S.label = own ? `“${own}”` : s.label;
      grid.querySelectorAll('.choice').forEach((b) => press(b, !!s && b.textContent === s.label));
      audio.ui?.('select');
      haptic('soft');
      realm()?.pulse?.('tap', { x: S.x, y: S.y });
      world.setEmotion(result.branch === 'guilt' ? { guilty: 0.6, embarrassed: 0.4 } : { embarrassed: 0.75, sad: 0.25 }, Math.max(0.6, I));
      world.react('sigh');
      resolve();
    };
    ownBtn.onclick = () => {
      const ta = h('textarea', { class: 'feel', 'aria-label': 'The sting, in your own words', maxlength: '120', placeholder: 'A few words is plenty…', style: { minHeight: '72px', fontSize: '16px' } });
      ta.value = String(ctx.input?.text || '').trim().slice(0, 120);
      const ok = h('button', { class: 'btn primary block' }, 'That’s the one');
      const back = h('button', { class: 'btn ghost block' }, 'Back to the choices');
      ok.onclick = () => { const v = ta.value.trim().replace(/\s+/g, ' ').slice(0, 120); if (!v) { ta.focus(); return; } pickSting(null, v); };
      back.onclick = () => dock.replaceChildren(grid, ownBtn);
      dock.replaceChildren(ta, h('div', { class: 'row-btns' }, back, ok));
      ta.focus();
    };
    aborted(resolve);
  });
  if (signal.aborted) return result;
  const stingObj = STINGS.find((s) => s.id === result.sting);
  await say(stingObj ? stingObj.reply : OWN_REPLY, 3400);
  if (signal.aborted) return result;

  // ============================================== 2. COOL IT DOWN ==
  setMove(1, { eyebrow: 'Move 2 of 4', title: 'Cool it down', prompt: 'Drag the stone into the lagoon and swish it about. Or stroke it gently.' });
  const meter = h('i', { style: { background: 'linear-gradient(90deg, #ff9a4a, #7fd4ff)' } });
  const meterWrap = h('div', { class: 'meter', role: 'progressbar', 'aria-label': 'How cool the stone is', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, meter);
  const splashBtn = h('button', { class: 'btn block', 'aria-label': 'Splash the stone with cool water' }, 'Splash it with cool water');
  dock.replaceChildren(meterWrap, h('div', { style: { height: '6px' } }), splashBtn);
  await frame();
  relayout();
  world.fx.classList.add('live');
  let dragged = 0, stroked = 0, splashed = 0;

  await new Promise((resolve) => {
    let cool = 0, mode = null, px = 0, py = 0, offX = 0, offY = 0, lastRipple = 0, lastTick = 0, inWater = false, quip = 0;
    drainSound = audio.hold?.('drain', { intensity: 0 }) || null;
    const target = () => (W + H) * 1.7;
    const add = (amt, x, y) => {
      if (cool >= 1) return;
      cool = Math.min(1, cool + amt);
      S.heat = 1 - cool;
      S.smooth = cool * 0.4;
      meter.style.width = `${Math.round(cool * 100)}%`;
      meterWrap.setAttribute('aria-valuenow', String(Math.round(cool * 100)));
      world.setEmotion({ embarrassed: (1 - cool) * 0.5, guilty: (1 - cool) * 0.25, calm: cool * 0.55, relieved: cool * 0.25, sad: 0.15 * (1 - cool) }, 0.7, { quiet: true });
      realm()?.setMood?.({ heaviness: (0.35 + I * 0.4) * (1 - cool * 0.6), clarity: 0.1 + cool * 0.3, warmth: 0.2 + cool * 0.2 });
      realm()?.transform?.(cool * 0.3);
      const now = performance.now();
      if (Math.random() < 0.6) puff(x ?? S.x, y ?? S.y, 1);
      if (now - lastTick > 140) { lastTick = now; haptic('tick'); }
      if (quip === 0 && cool > 0.4) { quip++; say('Ooh, steam. Look at it go. Slowly is fine.', 2600); }
      else if (quip === 1 && cool > 0.8) { quip++; say('Nearly. It’s going all soft and grey.', 2200); }
      if (cool >= 1) done();
    };
    const onStone = (x, y) => Math.hypot(x - S.x, y - S.y) < S.r * 1.5;
    const down = (e) => {
      px = e.clientX; py = e.clientY;
      if (onStone(px, py)) { mode = 'drag'; S.homing = false; offX = S.x - px; offY = S.y - py; }
      else mode = 'stroke';
      canvas.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (!mode) return;
      const x = e.clientX, y = e.clientY, d = Math.hypot(x - px, y - py);
      if (d < 3) return;
      px = x; py = y;
      if (mode === 'drag') {
        const fr = free();
        S.x = clamp(x + offX, S.r, W - S.r);
        S.y = clamp(y + offY, fr.top + S.r * 0.6, fr.bottom - S.r * 0.4);
        const wet = S.y + S.r * 0.5 > waterY();
        if (wet && !inWater) { audio.fx?.('drop-in', { intensity: 0.6 }); haptic('soft'); world.react('release'); ripple(S.x, S.y + S.r * 0.6); }
        inWater = wet;
        drainSound?.update?.({ intensity: wet ? 0.6 : 0.15 });
        dragged += d;
        add((d / target()) * (wet ? 1 : 0.4), S.x, S.y);
        const now = performance.now();
        if (wet && now - lastRipple > 320) { lastRipple = now; ripple(S.x, S.y + S.r * 0.6); realm()?.pulse?.('tap', { x: S.x, y: S.y + S.r * 0.6 }); }
      } else if (onStone(x, y)) {
        stroked += d;
        drainSound?.update?.({ intensity: 0.35 });
        add((d / target()) * 0.7, x, y);
      }
    };
    const up = () => { mode = null; drainSound?.update?.({ intensity: 0 }); };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    splashBtn.onclick = () => {
      splashed++;
      audio.fx?.('drop-in', { intensity: 0.5, pitch: 1 + splashed * 0.05 });
      haptic('soft');
      ripple(S.x, S.y + S.r * 0.8);
      realm()?.pulse?.('ripple', { x: S.x, y: S.y + S.r * 0.6 });
      puff(S.x, S.y, 6);
      add(0.15, S.x, S.y);
    };
    function done() {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      world.fx.classList.remove('live');
      drainSound?.stop(); drainSound = null;
      resolve();
    }
    aborted(resolve);
  });
  if (signal.aborted) return result;
  result.cooledBy = dragged >= stroked && dragged >= splashed * 200 ? 'lagoon' : stroked >= splashed * 200 ? 'stroke' : 'splash';
  S.homing = true;
  puff(S.x, S.y, 10);
  audio.fx?.('breathe-out', { intensity: 0.4, duration: 2.5 });
  haptic('success');
  realm()?.pulse?.('clear', { x: S.x, y: S.y });
  world.react('sigh');
  await say('There. Still there, but not burning. Much easier to hold.', 3000);
  if (signal.aborted) return result;

  // ============================================ 3. FRIEND’S WORDS ==
  setMove(2, { eyebrow: 'Move 3 of 4', title: 'What would you tell a friend?', prompt: 'If a friend had this stone, what would you say? Tap any that fit.' });
  world.setEmotion({ comforted: 0.5, loved: 0.3, calm: 0.2 }, 0.65);
  const shown = H < 700 ? WORDS.slice(0, 4) : WORDS;
  const wgrid = h('div', { class: 'choice-grid' });
  const wordsDone = h('button', { class: 'btn primary block', disabled: true }, 'Wrapped up warm');
  for (const [id, label] of shown) {
    const b = h('button', { class: 'choice', 'aria-pressed': 'false', style: { minHeight: '52px', fontSize: '14px' }, 'aria-label': `${label}. Wraps the stone in a bubble.` }, label);
    b.onclick = () => {
      if (b.getAttribute('aria-pressed') === 'true') return;
      press(b, true);
      result.words.push(id);
      flyWord(b, label);
      wordsDone.disabled = false;
    };
    wgrid.append(b);
  }
  dock.replaceChildren(wgrid, wordsDone);
  await frame();
  relayout();
  say('Now. If your best friend handed you this stone, what would you tell them?', 3600);

  function flyWord(btn, label) {
    const br = btn.getBoundingClientRect();
    const el = h('div', { 'aria-hidden': 'true', style: {
      position: 'fixed', left: `${br.left + br.width / 2}px`, top: `${br.top + br.height / 2}px`, transform: 'translate(-50%,-50%) scale(1)',
      maxWidth: '46vw', padding: '8px 12px', borderRadius: '999px', font: '650 13px/1.2 var(--font-ui)', color: '#f4fbff', textAlign: 'center',
      background: 'radial-gradient(120% 140% at 30% 20%, rgba(255,255,255,.35), rgba(127,212,255,.25) 50%, rgba(255,142,242,.25))',
      border: '1px solid rgba(244,251,255,.6)', boxShadow: '0 0 18px rgba(127,212,255,.35)', pointerEvents: 'none',
      transition: rm ? 'opacity 300ms' : 'left 850ms cubic-bezier(.2,.8,.2,1), top 850ms cubic-bezier(.2,.8,.2,1), transform 850ms, opacity 850ms',
    } }, label);
    world.fx.append(el);
    audio.fx?.('bloom', { intensity: 0.5, pitch: 1 + result.words.length * 0.08 });
    haptic('heartbeat');
    requestAnimationFrame(() => {
      if (!rm) { el.style.left = `${S.x}px`; el.style.top = `${S.y}px`; el.style.transform = 'translate(-50%,-50%) scale(.35)'; }
      el.style.opacity = '0';
    });
    later(() => {
      el.remove();
      S.layers.push({ p: 0 });
      S.smooth = Math.min(0.9, 0.4 + S.layers.length * 0.1);
      realm()?.pulse?.('ripple', { x: S.x, y: S.y });
      realm()?.transform?.(0.3 + Math.min(1, S.layers.length / 3) * 0.3);
      realm()?.setMood?.({ heaviness: Math.max(0.05, 0.3 - S.layers.length * 0.06), warmth: 0.4 + S.layers.length * 0.08, clarity: 0.4 + S.layers.length * 0.05 });
      world.react(result.words.length % 2 ? 'comfort' : 'nod');
      say(WORD_REPLIES[(result.words.length - 1) % WORD_REPLIES.length], 2600);
    }, rm ? 200 : 820);
  }

  await new Promise((r) => { wordsDone.onclick = r; aborted(r); });
  if (signal.aborted) return result;
  await wait(rm ? 250 : 900);
  if (signal.aborted) return result;

  // ============================================ 4. REPAIR OR REST ==
  let branch = result.branch;
  const finishBtn = h('button', { class: 'btn primary block', disabled: true }, 'That’s my next step');
  const swapBtn = h('button', { class: 'btn ghost block', style: { background: 'rgba(5,10,58,.45)', color: 'var(--text-1)' } });
  const ngrid = h('div', { class: 'choice-grid' });
  const renderNext = () => {
    const list = branch === 'guilt' ? REPAIR : REST;
    setMove(3, branch === 'guilt'
      ? { eyebrow: 'Move 4 of 4', title: 'One small repair?', prompt: 'Is there one small thing you’d like to do? Nothing is allowed too.' }
      : { eyebrow: 'Move 4 of 4', title: 'Something soothing next', prompt: 'Pick one small, soft thing for after this.' });
    swapBtn.textContent = branch === 'guilt' ? 'Rather just be gentle with yourself?' : 'Is there something to put right?';
    result.next = null; finishBtn.disabled = true;
    ngrid.replaceChildren(...list.map(([id, label, line]) => {
      const b = h('button', { class: 'choice', 'aria-pressed': 'false', style: { minHeight: '52px', fontSize: '14px' } }, label);
      b.onclick = () => {
        ngrid.querySelectorAll('.choice').forEach((x) => press(x, false));
        press(b, true);
        result.next = id; result.nextLabel = label; result.branch = branch;
        audio.fx?.('chime', { intensity: 0.5 });
        haptic('light');
        world.react('nod');
        realm()?.pulse?.('success', { x: S.x, y: S.y });
        say(line, 4200);
        finishBtn.disabled = false;
      };
      return b;
    }));
  };
  swapBtn.onclick = () => { branch = branch === 'guilt' ? 'shame' : 'guilt'; audio.ui?.('toggle'); renderNext(); };
  renderNext();
  dock.replaceChildren(ngrid, swapBtn, finishBtn);
  world.setEmotion({ calm: 0.45, hopeful: 0.3, comforted: 0.25 }, 0.6);
  realm()?.transform?.(0.7);
  await frame();
  relayout();
  say(branch === 'guilt' ? 'Is there one small thing you’d like to do about it? Or nothing at all. That’s allowed too.' : 'What would feel soothing next? Something small and soft.', 3600);
  await new Promise((r) => { finishBtn.onclick = r; aborted(r); });
  if (signal.aborted) return result;

  // ======================================================= FINALE ==
  setMove(4, { eyebrow: 'Soft landing', title: 'A smooth pebble', prompt: 'Drag it into your pocket, or tap the button.' });
  const pocketBtn = h('button', { class: 'btn primary block', 'aria-label': 'Pop the smooth pebble in my pocket' }, 'Pop it in my pocket');
  dock.replaceChildren(pocketBtn);
  await frame();
  relayout = () => {
    const f = sideBySide({ mx: 28, sx: 0.7 });
    const fh = f.bottom - f.top;
    S.hy = f.top + fh * 0.36;
    pocket = { x: W * 0.7, y: f.top + fh * 0.66, w: clamp(S.r * 2.6, 96, 150), h: clamp(fh * 0.28, 60, 110), glint: pocket?.glint || 0 };
  };
  relayout();
  // the stone settles into a pearly pebble
  S.label = '';
  await tween(rm ? 200 : 1200, (k) => { S.pearl = k; S.smooth = 0.9 + 0.1 * k; S.scale = 1 - 0.3 * k; S.heat = 0; S.layers.forEach((L) => { L.p = 1 - k * 0.6; }); });
  if (signal.aborted) return result;
  S.layers = [];
  audio.fx?.('star', { intensity: 0.5 });
  world.setEmotion({ relieved: 0.5, comforted: 0.5 }, 0.7);
  say('Look how smooth it’s gone. Small enough to keep in a pocket.', 3200);
  world.fx.classList.add('live');

  await new Promise((resolve) => {
    let drag = false, ox = 0, oy = 0;
    const inPocket = () => pocket && Math.abs(S.x - pocket.x) < pocket.w * 0.5 && S.y > pocket.y - S.r && S.y < pocket.y + pocket.h * 0.7;
    const down = (e) => { if (Math.hypot(e.clientX - S.x, e.clientY - S.y) < S.r * 1.8) { drag = true; S.homing = false; ox = S.x - e.clientX; oy = S.y - e.clientY; canvas.setPointerCapture?.(e.pointerId); } };
    const move = (e) => { if (!drag) return; S.x = clamp(e.clientX + ox, S.r, W - S.r); S.y = clamp(e.clientY + oy, S.r, H - S.r); if (inPocket()) finish(); };
    const up = () => { if (!drag) return; drag = false; if (inPocket()) finish(); else S.homing = true; };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    pocketBtn.onclick = () => finish();
    let finished = false;
    function finish() {
      if (finished) return; finished = true;
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      world.fx.classList.remove('live');
      pocketBtn.disabled = true;
      resolve();
    }
    aborted(resolve);
  });
  if (signal.aborted) return result;
  // drop into the pocket
  S.homing = false;
  const sx = S.x, sy = S.y;
  await tween(rm ? 150 : 650, (k) => { S.x = sx + (pocket.x - sx) * k; S.y = sy + (pocket.y + pocket.h * 0.3 - sy) * ease(k); S.alpha = 1 - k * k; });
  if (signal.aborted) return result;
  S.alpha = 0;
  pocket.glint = 1;
  audio.fx?.('clear', { intensity: 0.8 });
  haptic('success');
  realm()?.transform?.(1);
  realm()?.setMood?.({ heaviness: 0, agitation: 0, clarity: 0.9, warmth: 0.75 });
  realm()?.pulse?.('success', { x: W / 2, y: H * 0.45 });
  dock.replaceChildren();
  setMove(4, { eyebrow: 'Soft landing', title: 'Kept, gently', prompt: 'A smooth pebble, in your pocket.' });
  world.setEmotion({ comforted: 0.6, relieved: 0.4 }, 0.8);
  world.react('comfort');
  await say('You were so gentle with yourself. I’m going to cry. Happy tears!', 3400);
  if (signal.aborted) return result;

  cleanup();
  result.completed = true;
  const nextList = [...REPAIR, ...REST];
  result.summary = [
    { label: 'The sting', text: result.sting === 'own' ? `“${result.stingText}”` : result.stingText },
    { label: 'Cooled it', text: { lagoon: 'Swished it through the lagoon until it stopped steaming', stroke: 'Stroked it gently until it cooled', splash: 'Splashed it with cool water until it cooled' }[result.cooledBy] },
    { label: 'Kind words for you', text: result.words.map((id) => WORDS.find(([w]) => w === id)[1]).join(' · ') },
    { label: result.branch === 'guilt' ? 'One small repair' : 'Something soothing', text: nextList.find(([id]) => id === result.next)?.[1] || '—' },
    { label: 'Kept', text: 'A smooth pebble, in your pocket' },
  ];
  result.share = { title: 'A soft landing', subtitle: 'Blubi helped me cool a hot stone into a smooth pebble.' };
  return result;

  function tween(ms, fn) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = (now) => {
        if (signal.aborted) { resolve(); return; }
        const k = Math.min(1, (now - t0) / ms);
        fn(k);
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }
}

function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
function ease(k) { return 1 - Math.pow(1 - k, 3); }
function hex(c) { return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); }
function mix(A, B, k) { return A.map((v, i) => v + (B[i] - v) * k); }
function rgb(A) { return `rgb(${A.map(Math.round).join(',')})`; }
