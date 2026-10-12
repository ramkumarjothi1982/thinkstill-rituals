// STATIC TO SIGNAL — Glitzi, The Static Storm.
// For anger, frustration, resentment, irritation and their cousins.
//
// 1. Let it crackle   — scribble the static out; your words get zapped into
//                       fragments while Glitzi matches the heat (validation).
// 2. Ground the charge — hold the ground stone through three slow breaths with
//                       a longer out-breath; the static drains into the earth.
// 3. Find the signal  — flick away what isn't yours to fix; then name the need
//                       underneath, which lights up as a constellation.
// 4. Your next move   — choose one practical step (with a calm line to say,
//                       if you want one).
//
// Rationale (plain): naming and expressing anger safely, slowing the
// out-breath, separating what's controllable, and spotting the unmet need
// behind anger are common, widely taught approaches. No promise it will
// make the anger vanish — the aim is to be steering it.

import { h, wait } from '../app/ui.js';
import { canvasFontPx } from '../ui/type.js';

const FONT_17 = canvasFontPx(17, 800);

const FRAGMENTS = ['unfair', 'not listened to', 'too much at once', 'disrespected', 'blamed', 'no time', 'ignored', 'moved the goalposts'];
const NEEDS = [
  ['heard', 'To be heard'], ['respect', 'Respect'], ['fairness', 'Fairness'], ['rest', 'Rest'], ['time', 'Time'],
  ['support', 'Support'], ['clarity', 'Clarity'], ['credit', 'Recognition'], ['space', 'Space'],
];
const NEXT = [
  ['settle', 'Let it settle for now', 'A calmer you can decide later. That’s a choice, not a dodge.'],
  ['say-later', 'Say it calmly later', 'Here’s a line you could use, in your own words:'],
  ['talk', 'Talk it through with someone', 'Pick someone who listens more than they fix.'],
  ['walk', 'Walk it off for 5 minutes', 'Movement burns off leftover charge. Go on, Glitzi will wait.'],
  ['unsent', 'Write the unsent version', 'Say everything. Send nothing. Delete it after if you like.'],
  ['ask', 'Ask for what I need', 'Short and specific works best:'],
];
const STOP = new Set('i me my myself we our you your he she they them it its the a an and or but so to of in on at for with about what that this was were is are be been am im i\'m really very just so feel feeling felt happened happen work today got get getting like'.split(' '));

export const meta = { id: 'static-to-signal' };

export async function run(ctx) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const rm = ctx.reducedMotion;
  const realm = () => world.realm;
  // Glitzi's lines keep clear of the person's floating words (drawn on canvas)
  let wordRects = () => [];
  const say = (t, ms) => ctx.say(t, { who: 'Glitzi', ms, avoid: () => wordRects() });
  const result = { completed: false, flicked: [], kept: [], needs: [], next: null, breaths: 0 };

  // ------------------------------------------------ shared fx canvas --
  const canvas = h('canvas', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%' } });
  world.fx.replaceChildren(canvas);
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
  };
  resize();
  addEventListener('resize', resize);
  const strokes = [];       // {pts:[[x,y]], age}
  const sparks = [];        // drifting crackle specks
  const streams = [];       // golden ground streams
  let drawExtra = null;
  let raf = 0, last = performance.now();
  const loop = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    drawStrokes(dt);
    drawSparks(dt);
    drawStreams(dt);
    drawExtra?.(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  function jag(pts, amp) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      const nx = -(y1 - y0), ny = x1 - x0;
      const l = Math.hypot(nx, ny) || 1;
      const j = (Math.random() - 0.5) * amp;
      out.push([mx + (nx / l) * j, my + (ny / l) * j], pts[i]);
    }
    return out;
  }
  function drawStrokes(dt) {
    for (const s of strokes) s.age += dt;
    while (strokes.length && strokes[0].age > 1.8) strokes.shift();
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of strokes) {
      if (s.pts.length < 2) continue;
      const a = Math.max(0, 1 - s.age / 1.8);
      const path = rm ? s.pts : jag(s.pts, 9 * a);
      const pass = (w, col) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
      g.globalCompositeOperation = 'lighter';
      pass(16, `rgba(62,232,255,${0.12 * a})`);
      pass(7, `rgba(255,61,242,${0.45 * a})`);
      pass(2.4, `rgba(255,255,255,${0.95 * a})`);
      g.globalCompositeOperation = 'source-over';
    }
  }
  function drawSparks(dt) {
    for (const p of sparks) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].age > sparks[i].life) sparks.splice(i, 1);
    g.globalCompositeOperation = 'lighter';
    for (const p of sparks) {
      const a = 1 - p.age / p.life;
      g.fillStyle = p.c.replace('A', (a * 0.9).toFixed(3));
      g.fillRect(p.x - p.s, p.y - p.s * 0.25, p.s * 2, p.s * 0.5);
    }
    g.globalCompositeOperation = 'source-over';
  }
  function drawStreams(dt) {
    for (const s of streams) s.t += dt / s.dur;
    for (let i = streams.length - 1; i >= 0; i--) if (streams[i].t >= 1) streams.splice(i, 1);
    g.globalCompositeOperation = 'lighter';
    for (const s of streams) {
      const t = s.t, u = 1 - t;
      const x = u * u * s.x0 + 2 * u * t * s.cx + t * t * s.x1;
      const y = u * u * s.y0 + 2 * u * t * s.cy + t * t * s.y1;
      const gr = g.createRadialGradient(x, y, 0, x, y, 9);
      gr.addColorStop(0, 'rgba(255,240,190,0.95)'); gr.addColorStop(1, 'rgba(255,190,80,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
  const burstSparks = (x, y, n = 6) => {
    if (rm) n = Math.min(2, n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 140;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, age: 0, life: 0.5 + Math.random() * 0.5, s: 4 + Math.random() * 8,
        c: Math.random() < 0.5 ? 'rgba(62,232,255,A)' : 'rgba(255,61,242,A)' });
    }
  };

  const cleanup = () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    world.fx.classList.remove('live');
    world.fx.replaceChildren();
    chargeSound?.stop(); groundSound?.stop();
  };
  signal.addEventListener('abort', cleanup);
  let chargeSound = null, groundSound = null;

  // ============================================== 1. LET IT CRACKLE ==
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'Let it crackle', prompt: 'Scribble the static out. Fast, messy, whatever it feels like.' });
  world.place({ x: 50, y: 50, scale: 1 });
  const startI = Math.max(0.7, ctx.input.intensity || 0.8);
  world.setEmotion({ angry: 1 }, startI);
  realm()?.setMood?.({ agitation: 0.6, clarity: 0.15, heaviness: 0.2, warmth: 0.1 });
  // the person's own words become zappable static
  const words = [...new Set(String(ctx.input.text || '').toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w)))].slice(0, 5);
  const frags = [...words, ...FRAGMENTS].slice(0, 9);
  const floaters = frags.map((text, i) => {
    const a = (i / frags.length) * Math.PI * 2 + 0.4;
    return { text, x: 0.5 + Math.cos(a) * 0.36, y: 0.47 + Math.sin(a) * 0.27, ph: Math.random() * 6, zap: 0, gone: false };
  });
  wordRects = () => {
    g.font = FONT_17;
    return floaters.filter((f) => !f.gone).map((f) => {
      const x = f.px ?? f.x * W, y = f.py ?? f.y * H, w = g.measureText(f.text).width / 2 + 10;
      return { left: x - w, right: x + w, top: y - 16, bottom: y + 16 };
    });
  };
  say('Static levels: spicy. Go on, get it out. I can take it.', 3200);
  drawExtra = (dt) => {
    g.font = FONT_17;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const f of floaters) {
      if (f.gone) continue;
      f.ph += dt * (rm ? 0.3 : 1);
      const x = f.x * W + Math.sin(f.ph) * 6, y = f.y * H + Math.cos(f.ph * 0.8) * 5;
      f.px = x; f.py = y;
      const j = f.zap > 0 && !rm ? (Math.random() - 0.5) * 8 * f.zap : 0;
      g.fillStyle = 'rgba(62,232,255,0.55)'; g.fillText(f.text, x - 2 + j, y);
      g.fillStyle = 'rgba(255,61,242,0.55)'; g.fillText(f.text, x + 2 - j, y);
      g.fillStyle = `rgba(255,255,255,${0.9 - f.zap * 0.4})`; g.fillText(f.text, x + j * 0.5, y);
      f.zap = Math.max(0, f.zap - dt * 1.2);
    }
  };

  let charge = 0;
  const meter = h('i');
  const holdBtn = h('button', { class: 'btn block', 'aria-label': 'Hold to charge instead of scribbling' }, 'Or hold here to charge');
  dock.replaceChildren(h('div', { class: 'meter', role: 'progressbar', 'aria-label': 'Static charge', 'aria-valuemin': 0, 'aria-valuemax': 100 }, meter),
    h('div', { style: { height: '12px' } }), holdBtn);
  world.fx.classList.add('live');
  chargeSound = audio.hold?.('charge', { intensity: 0.2 }) || null;

  await new Promise((resolve) => {
    let cur = null, lastCrackle = 0, lastStrike = 0, holdTimer = 0, quips = 0;
    const add = (amt, x, y) => {
      if (charge >= 1) return;
      charge = Math.min(1, charge + amt);
      meter.style.width = `${Math.round(charge * 100)}%`;
      meter.parentElement.setAttribute('aria-valuenow', Math.round(charge * 100));
      world.setEmotion({ angry: 1 }, Math.min(1, startI + charge * 0.35), { quiet: true });
      if (world.rig) world.rig.target.glitch = 0.8 + charge * 1.2;
      realm()?.setMood?.({ agitation: 0.6 + charge * 0.4 });
      chargeSound?.update?.({ intensity: 0.2 + charge * 0.8 });
      const now = performance.now();
      if (x != null && now - lastCrackle > 90) {
        lastCrackle = now;
        audio.fx?.('crackle', { intensity: 0.4 + charge * 0.5, pan: (x / W - 0.5) * 1.4 });
        haptic('tick');
        burstSparks(x, y, 3);
        for (const f of floaters) if (!f.gone && Math.hypot((f.px || 0) - x, (f.py || 0) - y) < 46) { f.zap = 1; f.hits = (f.hits || 0) + 1; if (f.hits > 3) { f.gone = true; burstSparks(f.px, f.py, 10); audio.fx?.('snap'); } }
      }
      if (x != null && now - lastStrike > 1100 && !rm) { lastStrike = now; realm()?.pulse?.('strike', { x, y }); world.react('tap'); }
      if (quips === 0 && charge > 0.35) { quips++; say('Yes. More. That boss-shaped static isn’t going to zap itself.', 2600); }
      else if (quips === 1 && charge > 0.75) { quips++; say('Ooh. Spicy. Keep going.', 2000); }
      if (charge >= 1) done();
    };
    const target = () => (W + H) * 3.2;
    const down = (e) => { cur = { pts: [[e.clientX, e.clientY]], age: 0 }; strokes.push(cur); canvas.setPointerCapture?.(e.pointerId); };
    const move = (e) => {
      if (!cur) return;
      const [px, py] = cur.pts[cur.pts.length - 1];
      const d = Math.hypot(e.clientX - px, e.clientY - py);
      if (d < 6) return;
      cur.pts.push([e.clientX, e.clientY]);
      if (cur.pts.length > 40) { cur = { pts: [[e.clientX, e.clientY]], age: 0 }; strokes.push(cur); }
      add(d / target(), e.clientX, e.clientY);
    };
    const up = () => { cur = null; };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    const holdStart = (e) => { e.preventDefault(); clearInterval(holdTimer); holdTimer = setInterval(() => add(0.022, W / 2 + (Math.random() - 0.5) * 200, H * 0.45 + (Math.random() - 0.5) * 160), 60); };
    const holdEnd = () => clearInterval(holdTimer);
    holdBtn.addEventListener('pointerdown', holdStart);
    holdBtn.addEventListener('pointerup', holdEnd);
    holdBtn.addEventListener('pointerleave', holdEnd);
    holdBtn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') add(0.08); });
    function done() {
      clearInterval(holdTimer);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      world.fx.classList.remove('live');
      resolve();
    }
    signal.addEventListener('abort', () => { clearInterval(holdTimer); resolve(); });
  });
  if (signal.aborted) return result;
  for (const f of floaters) if (!f.gone) { f.gone = true; burstSparks(f.px || W / 2, f.py || H / 2, 6); }
  chargeSound?.stop(); chargeSound = null;
  world.react('glitchBurst');
  audio.fx?.('snap', { intensity: 0.9 });
  haptic('buzz');
  await say('Okay. That is a LOT of static. Respect.', 2300);
  if (signal.aborted) return result;

  // ============================================ 2. GROUND THE CHARGE ==
  setMove(1, { eyebrow: 'Move 2 of 4', title: 'Ground the charge', prompt: 'Hold the stone. Breathe in as the ring grows… and out, slower, as it shrinks.' });
  world.place({ x: 50, y: 37, scale: 0.86 });
  const ringCanvas = h('canvas', { width: 264, height: 264, style: { position: 'absolute', inset: '0', width: '100%', height: '100%' }, 'aria-hidden': 'true' });
  const label = h('span', { style: { position: 'relative', textShadow: '0 1px 8px rgba(0,0,0,.6)' } }, 'HOLD');
  const stone = h('button', { class: 'hold-target', 'aria-label': 'Ground stone. Press and hold to drain the static. Press Enter to start or pause.' }, ringCanvas, label);
  const cue = h('p', { class: 'muted', style: { textAlign: 'center', margin: '10px 0 0', minHeight: '20px' }, 'aria-live': 'polite' }, 'Breath 1 of 3');
  const tapMode = h('button', { class: 'btn ghost block' }, 'Can’t hold? Tap to start / pause');
  dock.replaceChildren(stone, cue, tapMode);
  const rc = ringCanvas.getContext('2d');

  await new Promise((resolve) => {
    const IN = 4, OUT = 6, CYCLES = 3;
    let holding = false, toggled = false, t = 0, drained = 0, phase = 'in', lastPhase = '';
    let tick = 0, prev = performance.now();
    const rect = () => stone.getBoundingClientRect();
    groundSound = audio.hold?.('ground', { intensity: 0 }) || null;
    const step = (now) => {
      const dt = Math.max(0, Math.min(1, (now - prev) / 1000)); prev = now; // real time: breaths keep their length on slow frames
      const active = holding || toggled;
      if (active) {
        t += dt;
        drained = Math.min(1, t / ((IN + OUT) * CYCLES));
        const ct = t % (IN + OUT);
        phase = ct < IN ? 'in' : 'out';
        const cycle = Math.min(CYCLES, Math.floor(t / (IN + OUT)) + 1);
        if (phase !== lastPhase) {
          lastPhase = phase;
          cue.textContent = `${phase === 'in' ? 'Breathe in…' : 'and out, slowly…'}  ·  breath ${cycle} of ${CYCLES}`;
          audio.fx?.(phase === 'in' ? 'breathe-in' : 'breathe-out', { intensity: 0.5, duration: phase === 'in' ? IN : OUT });
          haptic('heartbeat');
        }
        result.breaths = Math.floor(t / (IN + OUT));
        // golden streams flow from the static down into the stone
        if (!rm && Math.random() < dt * 14) {
          const r = rect(), m = world.mallowRect();
          const x0 = m.cx + (Math.random() - 0.5) * m.width * 0.6, y0 = m.top + Math.random() * m.height * 0.5;
          streams.push({ x0, y0, x1: r.left + r.width / 2, y1: r.top + r.height / 2, cx: (x0 + r.left + r.width / 2) / 2 + (Math.random() - 0.5) * 120, cy: y0 + 40, t: 0, dur: 0.9 + Math.random() * 0.5 });
        }
        // Glitzi cools as the charge drains
        world.setEmotion({ angry: Math.max(0.05, 1 - drained * 1.2), frustrated: 0.3 * (1 - drained), calm: drained }, 0.85, { quiet: true });
        if (world.rig) world.rig.target.glitch = Math.max(0.1, 2 - drained * 1.9);
        realm()?.setMood?.({ agitation: Math.max(0.1, 1 - drained), clarity: drained * 0.6 });
        realm()?.transform?.(drained * 0.35);
        groundSound?.update?.({ intensity: 0.5 });
      } else groundSound?.update?.({ intensity: 0 });
      // breathing ring
      const ct = t % (IN + OUT);
      const k = ct < IN ? ct / IN : 1 - (ct - IN) / OUT;
      const ease = 0.5 - Math.cos(Math.PI * k) / 2;
      rc.clearRect(0, 0, 264, 264);
      const R = 62 + ease * 58;
      const gr = rc.createRadialGradient(132, 132, 20, 132, 132, R);
      gr.addColorStop(0, 'rgba(255,230,160,0.95)'); gr.addColorStop(0.55, 'rgba(255,190,90,0.35)'); gr.addColorStop(1, 'rgba(255,190,90,0)');
      rc.fillStyle = gr; rc.beginPath(); rc.arc(132, 132, R, 0, Math.PI * 2); rc.fill();
      rc.strokeStyle = 'rgba(255,255,255,0.75)'; rc.lineWidth = 3; rc.beginPath(); rc.arc(132, 132, R * 0.92, 0, Math.PI * 2); rc.stroke();
      rc.strokeStyle = 'rgba(255,217,138,0.95)'; rc.lineWidth = 6; rc.lineCap = 'round';
      rc.beginPath(); rc.arc(132, 132, 54, -Math.PI / 2, -Math.PI / 2 + drained * Math.PI * 2); rc.stroke();
      rc.fillStyle = active ? '#3a2a10' : '#2a1f48';
      rc.beginPath(); rc.arc(132, 132, 46, 0, Math.PI * 2); rc.fill();
      label.textContent = active ? (phase === 'in' ? 'IN' : 'OUT') : (t > 0 ? 'HOLD' : 'HOLD');
      if (drained >= 1) { finish(); return; }
      tick = requestAnimationFrame(step);
    };
    tick = requestAnimationFrame(step);
    const on = (e) => { e.preventDefault(); holding = true; stone.setPointerCapture?.(e.pointerId); };
    const off = () => { holding = false; };
    stone.addEventListener('pointerdown', on);
    stone.addEventListener('pointerup', off);
    stone.addEventListener('pointercancel', off);
    stone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggled = !toggled; } });
    tapMode.addEventListener('click', () => { toggled = !toggled; tapMode.textContent = toggled ? 'Pause' : 'Tap to continue'; });
    let mid = false;
    const midQuip = setInterval(() => { if (!mid && t > 12) { mid = true; say('Huh. My static’s going quiet. Weird. Nice weird.', 2600); } }, 500);
    function finish() {
      cancelAnimationFrame(tick); clearInterval(midQuip);
      groundSound?.stop(); groundSound = null;
      resolve();
    }
    signal.addEventListener('abort', finish);
  });
  if (signal.aborted) return result;
  audio.fx?.('ground', { intensity: 0.7 });
  haptic('success');
  realm()?.pulse?.('clear', { x: W / 2, y: H * 0.4 });

  // ============================================= 3. FIND THE SIGNAL ==
  setMove(2, { eyebrow: 'Move 3 of 4', title: 'What’s out of your hands?', prompt: 'Flick those bits up and away. Keep anything that still matters.' });
  world.place({ x: 50, y: 64, scale: 0.72 });
  world.setEmotion({ calm: 0.5, curious: 0.5 }, 0.6);
  const field = h('div', { style: { position: 'fixed', inset: '0', zIndex: '3', pointerEvents: 'none' } });
  document.body.append(field);
  signal.addEventListener('abort', () => field.remove());
  const chipEls = frags.map((text, i) => {
    const [x, y] = gridPos(i, 25);
    const el = h('button', { class: 'chip', style: { position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', pointerEvents: 'auto', maxWidth: '31vw', whiteSpace: 'normal', lineHeight: '1.15', textAlign: 'center', padding: '6px 12px', fontSize: 'var(--type-label-size)',
      touchAction: 'none', background: 'rgba(14,16,48,.78)', borderColor: 'rgba(62,232,255,.45)', boxShadow: '0 0 18px rgba(62,232,255,.25)', transition: 'transform 600ms var(--ease-out), opacity 600ms' },
    'aria-label': `${text}. Flick up or press to let it drift away.` }, text);
    field.append(el);
    let y0 = null, x0 = null;
    const away = () => {
      if (el.dataset.gone) return;
      el.dataset.gone = '1';
      result.flicked.push(text);
      el.style.transform = 'translate(-50%, -420%) scale(.6)';
      el.style.opacity = '0';
      const r = el.getBoundingClientRect();
      burstSparks(r.left + r.width / 2, r.top, 8);
      realm()?.pulse?.('clear', { x: r.left + r.width / 2, y: r.top });
      audio.fx?.('star', { intensity: 0.6 });
      haptic('light');
      doneBtn.disabled = false;
    };
    el.addEventListener('pointerdown', (e) => { y0 = e.clientY; x0 = e.clientX; el.setPointerCapture?.(e.pointerId); });
    el.addEventListener('pointermove', (e) => { if (y0 != null) { const dy = Math.min(0, e.clientY - y0); el.style.transform = `translate(calc(-50% + ${(e.clientX - x0) * 0.3}px), calc(-50% + ${dy}px))`; } });
    el.addEventListener('pointerup', (e) => { if (y0 != null && (y0 - e.clientY > 40 || Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) < 8)) away(); else el.style.transform = 'translate(-50%,-50%)'; y0 = null; });
    return el;
  });
  const doneBtn = h('button', { class: 'btn primary block', disabled: true }, 'That’s the static gone');
  dock.replaceChildren(h('p', { class: 'muted', style: { textAlign: 'center', margin: '0 0 10px' } }, 'Tap or flick a bit to let it go.'), doneBtn);
  await new Promise((r) => { doneBtn.onclick = r; signal.addEventListener('abort', r); });
  if (signal.aborted) return result;
  result.kept = frags.filter((f) => !result.flicked.includes(f));
  chipEls.forEach((el) => { el.style.opacity = '0'; });
  await wait(350);
  field.replaceChildren();

  setMove(2, { eyebrow: 'Move 3 of 4', title: 'Under the static, what did you need?', prompt: 'Tap one to three. They’ll light up.' });
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible');
  field.append(svg);
  const pos = NEEDS.map((_, i) => gridPos(i, 27));
  const needEls = NEEDS.map(([id, label], i) => {
    const el = h('button', { class: 'chip', 'aria-pressed': 'false', style: { position: 'absolute', left: `${pos[i][0]}%`, top: `${pos[i][1]}%`, transform: 'translate(-50%,-50%)',
      pointerEvents: 'auto', maxWidth: '31vw', padding: '0 12px', fontSize: 'var(--type-label-size)' } }, h('span', { class: 'hue', style: { background: '#ffd98a', boxShadow: '0 0 10px #ffd98a' } }), label);
    el.onclick = () => {
      const on = el.getAttribute('aria-pressed') !== 'true';
      if (on && result.needs.length >= 3) return;
      el.setAttribute('aria-pressed', String(on));
      result.needs = on ? [...result.needs, id] : result.needs.filter((x) => x !== id);
      drawConstellation();
      audio.fx?.(on ? 'chime' : 'rotate-tick', { pitch: 1 + result.needs.length * 0.12 });
      haptic('light');
      if (on) { world.react('nod'); realm()?.pulse?.('success', { x: el.getBoundingClientRect().left + 30, y: el.getBoundingClientRect().top }); }
      needDone.disabled = !result.needs.length;
    };
    field.append(el);
    return el;
  });
  function drawConstellation() {
    svg.replaceChildren();
    const idx = result.needs.map((id) => NEEDS.findIndex(([n]) => n === id));
    for (let i = 1; i < idx.length; i++) {
      const [x0, y0] = pos[idx[i - 1]], [x1, y1] = pos[idx[i]];
      const l = document.createElementNS(svgNS, 'line');
      Object.entries({ x1: `${x0}%`, y1: `${y0}%`, x2: `${x1}%`, y2: `${y1}%`, stroke: 'rgba(255,217,138,.8)', 'stroke-width': '2', 'stroke-dasharray': '4 6' }).forEach(([k, v]) => l.setAttribute(k, v));
      svg.append(l);
    }
  }
  const needDone = h('button', { class: 'btn primary block', disabled: true }, 'That’s what I needed');
  dock.replaceChildren(needDone);
  await new Promise((r) => { needDone.onclick = r; signal.addEventListener('abort', r); });
  if (signal.aborted) return result;
  const needLabels = result.needs.map((id) => NEEDS.find(([n]) => n === id)[1].toLowerCase());
  say(`So it’s about ${listJoin(needLabels)}. Annoyingly reasonable. Not too much to want.`, 3000);
  realm()?.transform?.(0.7);
  needEls.forEach((el) => { if (el.getAttribute('aria-pressed') !== 'true') el.style.opacity = '0.25'; });
  await wait(1400);
  field.remove();

  // ============================================== 4. YOUR NEXT MOVE ==
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'Your next move?', prompt: 'Pick one. Small counts.' });
  world.place({ x: 50, y: 25, scale: 0.55 });
  world.setEmotion({ determined: 0.6, calm: 0.4 }, 0.6);
  const grid = h('div', { class: 'choice-grid' });
  const detail = h('div', { style: { marginTop: '12px' } });
  const finishBtn = h('button', { class: 'btn primary block', disabled: true, style: { marginTop: '12px' } }, 'Done');
  for (const [id, label, note] of NEXT) {
    const b = h('button', { class: 'choice', 'aria-pressed': 'false' }, label);
    b.onclick = () => {
      grid.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      result.next = id;
      audio.ui?.('select');
      haptic('light');
      finishBtn.disabled = false;
      const need = needLabels[0] || 'to be heard';
      const kids = [h('p', { class: 'muted', style: { margin: '0 0 8px' } }, note)];
      if (id === 'say-later' || id === 'ask') {
        const line = id === 'ask'
          ? `I’d really like ${needPhrase(need)}. Could we find ten minutes to sort it?`
          : `When that happened, I felt frustrated. What I need is ${needPhrase(need)}. Can we talk about it?`;
        const ta = h('textarea', { class: 'feel', 'aria-label': 'Your line', style: { minHeight: '84px', fontSize: 'var(--type-row-size)' } }, line);
        kids.push(ta, h('button', { class: 'btn ghost', onclick: () => { navigator.clipboard?.writeText(ta.value); ctx.toast('Copied. It stays on your phone.'); } }, 'Copy line'));
        result.line = line;
        ta.addEventListener('input', () => { result.line = ta.value; });
      }
      detail.replaceChildren(...kids);
    };
    grid.append(b);
  }
  dock.replaceChildren(grid, detail, finishBtn);
  await new Promise((r) => { finishBtn.onclick = r; signal.addEventListener('abort', r); });
  if (signal.aborted) return result;

  // ======================================================= FINALE ==
  dock.replaceChildren();
  setMove(4, { eyebrow: 'The Static Storm', title: 'Static → signal', prompt: '' });
  world.place({ x: 50, y: 50, scale: 1 });
  realm()?.transform?.(1);
  realm()?.pulse?.('success', { x: W / 2, y: H * 0.45 });
  audio.fx?.('clear', { intensity: 0.9 });
  haptic('success');
  world.setEmotion({ playful: 0.5, proud: 0.3, calm: 0.2 }, 0.75);
  world.react('celebrate');
  await say('Look at that. Order. Disgusting. I love it.', 2800);
  cleanup();
  result.completed = true;
  result.summary = [
    { label: 'Static let out', text: result.flicked.length ? `Zapped ${frags.length} bits of static` : 'Scribbled it out' },
    { label: 'Grounded', text: `${Math.max(3, result.breaths)} slow breaths, longer on the out` },
    result.flicked.length ? { label: 'Out of your hands', text: listJoin(result.flicked) } : null,
    { label: 'What you needed', text: cap(listJoin(needLabels)) },
    { label: 'Your next move', text: NEXT.find(([id]) => id === result.next)?.[1] || '—' },
  ].filter(Boolean);
  result.share = { title: 'Static → signal', subtitle: 'Glitzi helped me turn the static down.' };
  return result;
}

// 3×3 jittered grid in the upper half: readable and never overlapping
function gridPos(i, top) {
  const col = i % 3, row = Math.floor(i / 3);
  const jx = [[-3, 2, 4], [3, -2, -4], [-2, 3, 2]][row % 3][col];
  return [20 + col * 30 + jx, top + row * 9 + (col === 1 ? 3 : 0)];
}

function listJoin(a) { return a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function needPhrase(n) {
  return { 'to be heard': 'to be heard properly', respect: 'a bit more respect', fairness: 'things to feel fairer', rest: 'some proper rest', time: 'more realistic time',
    support: 'some support with this', clarity: 'clearer expectations', recognition: 'my effort to be recognised', space: 'a bit of space' }[n] || n;
}
