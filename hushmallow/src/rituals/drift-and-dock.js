// DRIFT AND DOCK — Loomi, The Blue Drift.
// For anxiety, worry, nervousness, dread, unease, overwhelm and their cousins.
//
// 1. Slow the wave  — trace a glowing float along one long wave across the
//                     water: right while breathing in (~4 s), back left while
//                     breathing out (~6 s). Rush it and the water chops.
// 2. Worry boats    — each worry goes into its own little paper boat and is
//                     launched onto the water (authored, or your own words,
//                     shown back exactly as typed — never interpreted).
// 3. Dock them      — drag each boat to a jetty: "Can do something today",
//                     "Later / not yet" or "Not mine to control". Each boat
//                     that ties up stills the water a little more.
// 4. One anchor     — for one "today" boat, pick a tiny first step (or, if
//                     none fit, a grounding anchor) and pull the anchor down.
//
// Rationale (plain): paced breathing with a longer out-breath, writing worries
// down, sorting what you can act on from what you can't, and one small next
// step or a simple grounding exercise are common, widely taught approaches.
// No promise the worry disappears — the aim is a little more room.

import { h, wait } from '../app/ui.js';

export const meta = { id: 'drift-and-dock' };

const WORRIES = [
  ['said', 'something I said'], ['money', 'money'], ['what-if', 'what might happen'], ['todo', 'too much to do'],
  ['health', 'someone’s health'], ['convo', 'a conversation coming up'], ['work', 'work or school'], ['decision', 'a decision I have to make'],
];
const STEPS = {
  said: ['Write down what I actually said, word for word', 'Decide whether it needs a quick check-in, or nothing at all', 'Give it one evening before deciding anything'],
  money: ['Look at one number. Just look.', 'Write down the one bill that’s bugging me', 'Put a 15-minute money slot in my diary'],
  'what-if': ['Write the what-if down in one line', 'Name one thing I’d do if it did happen', 'Check one fact I can actually check'],
  todo: ['Write everything down, messily', 'Do five minutes of the smallest task', 'Cross off one thing that can wait'],
  health: ['Write down the one question I’d like answered', 'Get the number or info I’d need ready, just in case', 'Have a glass of water and something to eat'],
  convo: ['Jot down the one thing I most want to say', 'Pick a time to think about it that isn’t now', 'Say my first line out loud, once'],
  work: ['Open the thing. Just open it.', 'Write the next tiny step on a sticky note', 'Set a 10-minute timer and start badly'],
  decision: ['Write the two options side by side', 'Decide when I’ll decide', 'Write one thing I already know I want'],
  own: ['Write it down in one line', 'Do the smallest, most boring bit for five minutes', 'Decide when I’ll look at it next'],
};
const ANCHORS = [
  ['see5', 'Spot 5 things you can see', 'Name them in your head. Boring things count. Boring things are excellent.'],
  ['feet', 'Feet flat on the floor', 'Press them down and notice the floor pressing back. It’s been there the whole time.'],
  ['cold', 'Cold water on your wrists', 'Run them under the cold tap for a few seconds. Bracing, in a good way.'],
  ['walk', 'A short walk', 'Even just to the window and back. Look at something far away.'],
];
const DOCKS = [
  ['today', 'Can do something today', '#ffd98a'],
  ['later', 'Later / not yet', '#a8f0ff'],
  ['notmine', 'Not mine to control', '#cdb8ff'],
];
const DOCK_LINES = {
  today: ['Today pile. Practical. I like it.', 'Another one you can poke at today. Gently.'],
  later: ['Later. Not never — just not now.', 'Parked for later. It’ll keep.'],
  notmine: ['Not yours to steer. You can still wave at it.', 'Out of your hands. Your hands can have a rest.'],
};
const LAUNCH_LINES = ['Off you go, little boat.', 'Into the water with that one.', 'One more for the fleet.', 'Floats nicely, that one.', 'Launched. Very seaworthy.', 'Ahoy, worry.'];
const MAX_BOATS = 6;

const BOAT_SVG = (w = 64) => `<svg viewBox="0 0 64 40" width="${w}" height="${Math.round(w * 0.625)}" aria-hidden="true" style="display:block;overflow:visible">
<path d="M2 21 L62 21 L50 35 L14 35 Z" fill="#fdfbf4" stroke="#7fa9cc" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M2 21 L32 28 L62 21" fill="none" stroke="#c4dbea" stroke-width="1.2"/>
<path d="M18 21 L32 3 L46 21 Z" fill="#ffffff" stroke="#7fa9cc" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M32 3 L32 21" stroke="#c4dbea" stroke-width="1.2"/></svg>`;
const ANCHOR_SVG = `<svg viewBox="0 0 48 56" width="48" height="56" aria-hidden="true" style="display:block">
<circle cx="24" cy="8" r="5" fill="none" stroke="#ffd98a" stroke-width="3.5"/>
<path d="M24 13 V49 M14 22 H34 M8 36 Q9 50 24 50 Q39 50 40 36" fill="none" stroke="#ffd98a" stroke-width="3.5" stroke-linecap="round"/>
<path d="M4 39 L8 33 L13 38 M35 38 L40 33 L44 39" fill="none" stroke="#ffd98a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export async function run(ctx) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const rm = !!ctx.reducedMotion, low = !!ctx.lowStim;
  const realm = () => world.realm;
  const say = (t, ms = 2800) => ctx.say(t, { who: 'Loomi', ms });
  const result = { completed: false, breaths: 0, guided: false, worries: [], docked: { today: [], later: [], notmine: [] }, anchor: null, anchorKind: null, anchorFor: null };
  const startI = Math.min(1, Math.max(0.3, ctx.input?.intensity ?? 0.6));

  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const pause = (ms) => new Promise((r) => { const id = later(r, ms); signal.addEventListener('abort', () => { clearTimeout(id); r(); }, { once: true }); });
  const until = (register) => new Promise((resolve) => { register(resolve); signal.addEventListener('abort', resolve, { once: true }); });

  // --------------------------------------------------------- water canvas --
  const canvas = h('canvas', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', touchAction: 'none' } });
  world.fx.replaceChildren(canvas);
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let waterY = 0, bandBottom = 0;   // water surface and the lowest usable point above the dock
  let still = 0;                    // 0 sloshy … 1 mirror-still
  let chop = 0;                     // short-lived chop from rushing
  let t = 0;
  let mallowAt = { y: 30, s: 0.6 };
  let drawExtra = null;
  const parked = [];                // finale: little boats moored along the edges
  const ripples = [];

  // Where the Mallow's body ends, computed from world.place params (the layer
  // transitions, so its live rect lags behind).
  const mallowBottom = () => {
    const lh = Math.min(H * 0.56, 470);
    return (mallowAt.y / 100) * H + (0.88 - 0.5) * lh * mallowAt.s;
  };
  const place = (y, s) => { mallowAt = { y, s }; world.place({ x: 50, y, scale: s, calm: true }); };
  let relayout = () => {};
  const layout = () => {
    const dt = dock.getBoundingClientRect();
    bandBottom = (dt.height > 4 ? dt.top : H) - 12;
    waterY = Math.max(H * 0.3, Math.min(mallowBottom() + 4, bandBottom - 90));
    relayout();
  };
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    layout();
  };
  resize();
  addEventListener('resize', resize);

  const surf = (x) => {
    const amp = 1 + (1 - still) * (rm ? 3 : 6);
    const sp = rm ? 0.35 : 1;
    let y = waterY + amp * (Math.sin(x * 0.017 + t * 0.9 * sp) * 0.6 + Math.sin(x * 0.041 - t * 1.5 * sp) * 0.4);
    if (chop > 0.01) {
      const c = chop * (rm || low ? 6 : 13);
      y += c * (Math.sin(x * 0.09 + t * 4.8 * sp) * 0.55 + Math.sin(x * 0.14 - t * 6.3 * sp) * 0.45);
    }
    return y;
  };
  let raf = 0, last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    drawWater();
    drawRipples(dt);
    drawExtra?.(dt, now);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  function drawWater() {
    const step = 8;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W + step; x += step) g.lineTo(x, surf(x));
    g.lineTo(W, H); g.closePath();
    const gr = g.createLinearGradient(0, waterY - 10, 0, H);
    gr.addColorStop(0, `rgba(40,140,215,${0.34 + still * 0.08})`);
    gr.addColorStop(0.45, 'rgba(18,86,160,0.55)');
    gr.addColorStop(1, 'rgba(8,40,96,0.72)');
    g.fillStyle = gr; g.fill();
    // mirror sheen as it stills
    if (still > 0.5) {
      const a = (still - 0.5) * 2;
      const sh = g.createLinearGradient(0, waterY, 0, waterY + 70);
      sh.addColorStop(0, `rgba(220,248,255,${0.32 * a})`); sh.addColorStop(1, 'rgba(220,248,255,0)');
      g.fillStyle = sh; g.fillRect(0, waterY, W, 70);
    }
    // surface lines
    g.lineCap = 'round';
    g.strokeStyle = `rgba(232,250,255,${0.7 + still * 0.25})`; g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= W + step; x += step) (x ? g.lineTo(x, surf(x)) : g.moveTo(x, surf(x)));
    g.stroke();
    g.strokeStyle = 'rgba(200,240,255,0.22)'; g.lineWidth = 1.5;
    g.beginPath();
    for (let x = 0; x <= W + step; x += step) { const y = surf(x * 0.97 + 30) + 16; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    // parked boats (finale) and their reflections
    for (const p of parked) {
      const y = surf(p.x);
      drawMiniBoat(p.x, y - 6, p.s, 0.95);
      if (still > 0.6) { g.save(); g.translate(0, (y + 2) * 2); g.scale(1, -1); drawMiniBoat(p.x, y - 6, p.s, 0.25 * still); g.restore(); }
    }
  }
  function drawMiniBoat(x, y, s, a) {
    g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#fdfbf4'; g.strokeStyle = '#7fa9cc'; g.lineWidth = 1.6; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-30, 0); g.lineTo(30, 0); g.lineTo(18, 14); g.lineTo(-18, 14); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-14, 0); g.lineTo(0, -18); g.lineTo(14, 0); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  function drawRipples(dt) {
    for (const r of ripples) r.age += dt;
    for (let i = ripples.length - 1; i >= 0; i--) if (ripples[i].age > 1.6) ripples.splice(i, 1);
    for (const r of ripples) {
      const k = r.age / 1.6;
      g.strokeStyle = `rgba(230,250,255,${0.6 * (1 - k)})`; g.lineWidth = 2;
      g.beginPath(); g.ellipse(r.x, r.y, 10 + k * 70, 3 + k * 14, 0, 0, Math.PI * 2); g.stroke();
    }
  }
  const ripple = (x, y) => { ripples.push({ x, y: y ?? surf(x), age: 0 }); };

  // ---------------------------------------------------- boat DOM field --
  const field = h('div', { style: { position: 'fixed', inset: '0', zIndex: '3', pointerEvents: 'none' } });
  document.body.append(field);
  const boats = [];   // {id,label,own,el,x,y,ph,docked,dragging}
  let bobRaf = 0, bobLast = performance.now();
  const bob = (now) => {
    const dt = Math.min(0.05, (now - bobLast) / 1000); bobLast = now;
    for (const b of boats) {
      if (b.docked || b.dragging) continue;
      b.ph += dt * (rm ? 0 : 1.1);
      const amp = rm ? 0 : 1.5 + (1 - still) * 3 + chop * 4;
      const dy = Math.sin(b.ph) * amp, rot = rm ? 0 : Math.sin(b.ph * 0.8 + 1) * (1 + (1 - still) * 3);
      b.el.style.transform = `translate(-50%, calc(-50% + ${dy.toFixed(1)}px)) rotate(${rot.toFixed(1)}deg)`;
    }
    bobRaf = requestAnimationFrame(bob);
  };
  bobRaf = requestAnimationFrame(bob);

  const cleanup = () => {
    cancelAnimationFrame(raf); cancelAnimationFrame(bobRaf);
    for (const id of timers) clearTimeout(id);
    timers.clear();
    removeEventListener('resize', resize);
    world.fx.classList.remove('live');
    world.fx.replaceChildren();
    field.remove();
  };
  signal.addEventListener('abort', cleanup, { once: true });

  const setFace = (mix, i = 0.7) => world.setEmotion(mix, i, { quiet: true });
  const tiny = H < 640;   // short phones: shorter prompts, smaller Loomi
  // a soft dark backing so dock text reads over any realm
  const PILL = { justifySelf: 'center', textAlign: 'center', margin: '0', background: 'rgba(6,22,52,.66)', color: 'var(--text-1)', borderRadius: '12px', padding: '4px 12px', fontSize: '14px', maxWidth: '100%' };

  // ================================================= 1. SLOW THE WAVE ==
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'Slow the wave', prompt: tiny ? 'Right as you breathe in. Back, slower, as you breathe out.' : 'Trace the glow right as you breathe in. Back left, slower, as you breathe out.' });
  place(H < 640 ? 33 : 40, H < 640 ? 0.5 : 0.6);
  setFace({ anxious: 0.55 + startI * 0.45 }, 0.75);
  world.setEmotion({ anxious: 0.55 + startI * 0.45 }, 0.75);
  realm()?.setMood?.({ agitation: 0.75, heaviness: 0.35, clarity: 0.15, warmth: 0.15 });
  realm()?.transform?.(0);

  const IN = 4, OUT = 6, GOAL = 6;   // 6 smooth passes = 3 slow breaths
  const pips = Array.from({ length: GOAL }, () => h('i', { style: { width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,.22)', transition: 'background 400ms, box-shadow 400ms' } }));
  const cue = h('p', { 'aria-live': 'polite', style: { ...PILL, fontSize: '15px', fontWeight: '650', minHeight: '22px' } }, 'Put your finger on the glow →');
  const guideBtn = h('button', { class: 'btn block', 'aria-label': 'Run a guided wave for me: three slow breaths, about 4 seconds in and 6 out' }, 'Run a guided wave for me');
  dock.replaceChildren(h('div', { role: 'img', 'aria-label': 'Smooth waves so far', style: { display: 'flex', gap: '8px', justifyContent: 'center' } }, pips), cue, guideBtn);
  layout();
  await pause(900);
  if (signal.aborted) return result;
  say('Oh, hey. Your brain’s doing its job a bit too enthusiastically. I’m a little wobbly too, honestly.', 3600);

  world.fx.classList.add('live');
  await until((resolve) => {
    const P = { x0: 0, x1: 0, cy: 0, amp: 0 };
    relayout = () => {
      P.x0 = W * 0.11; P.x1 = W * 0.89;
      const band = Math.max(60, bandBottom - waterY);
      P.cy = waterY + band * 0.48; P.amp = Math.min(30, band * 0.24);
    };
    relayout();
    const px = (u) => P.x0 + u * (P.x1 - P.x0);
    const py = (u) => P.cy - Math.sin(u * Math.PI * 3) * P.amp;
    let pos = 0, dir = 1, passT0 = null, grabbing = false, guided = false;
    let lastPos = 0, vS = 0, smooth = 0, passes = 0, lastQuip = 0, chopWarned = false, faceT = 0, done = false, passChop = 0;
    const ideal = () => 1 / (dir > 0 ? IN : OUT);
    const setCue = () => {
      const b = Math.min(3, Math.floor(smooth / 2) + 1);
      cue.textContent = dir > 0 ? `Wave ${b} of 3 · breathe in, trace right →` : `← and out, slower · wave ${b} of 3`;
    };
    const startPass = (now) => {
      passT0 = now; passChop = 0;
      setCue();
      audio.fx?.(dir > 0 ? 'breathe-in' : 'breathe-out', { intensity: 0.45, duration: dir > 0 ? IN : OUT });
    };
    const endPass = (now) => {
      const el = (now - passT0) / 1000;
      const good = guided || (el >= (dir > 0 ? IN : OUT) * 0.62 && passChop < 0.45);
      passes++;
      haptic('heartbeat');
      if (good) {
        smooth++;
        const p = pips[smooth - 1];
        if (p) { p.style.background = '#a8f0ff'; p.style.boxShadow = '0 0 10px #a8f0ff'; }
        ripple(px(dir > 0 ? 1 : 0), py(dir > 0 ? 1 : 0));
        realm()?.pulse?.('ripple', { x: px(dir > 0 ? 1 : 0), y: py(dir > 0 ? 1 : 0) });
        if (smooth === 2) { world.react('nod'); say('That’s it. Very wave-like.', 2200); }
        if (smooth === 4) say('Smooth. The water noticed. So did I.', 2200);
      } else if (now - lastQuip > 2500) {
        lastQuip = now;
        say(passes % 2 ? 'Ooh, speedboat. Slower — let the faint ring lead.' : 'Bit choppy. The wave’s in no hurry, and neither are we.', 2600);
      }
      dir = -dir; passT0 = null; grabbing = false; vS = 0;
      cue.textContent = dir > 0 ? 'Back on the glow → breathe in' : '← now back, breathing out';
      if (smooth >= GOAL || passes >= 14) finish();
    };
    drawExtra = (dt, now) => {
      // --- motion
      if (guided) {
        if (passT0 == null) startPass(now);
        pos = Math.max(0, Math.min(1, pos + dir * dt * ideal()));
      }
      if (passT0 == null && Math.abs(pos - (dir > 0 ? 0 : 1)) > 0.015) startPass(now);
      const v = Math.abs(pos - lastPos) / Math.max(dt, 1e-3); lastPos = pos;
      vS += (v - vS) * Math.min(1, dt * 5);
      const ratio = vS / ideal();
      if (ratio > 1.7) chop = Math.min(1, chop + dt * (ratio - 1.7) * 1.6);
      else chop = Math.max(0, chop - dt * 0.5);
      if (chop > 0.5 && !chopWarned && now - lastQuip > 2500) {
        chopWarned = true; lastQuip = now; haptic('warning-soft');
        say('Bit choppy. The wave’s in no hurry, and neither are we.', 2600);
      }
      if (chop < 0.1) chopWarned = false;
      if (passT0 != null) passChop = Math.max(passChop, chop);
      if (passT0 != null && ((dir > 0 && pos >= 0.985) || (dir < 0 && pos <= 0.015))) endPass(now);
      // --- Loomi mirrors you, then settles as you do
      const calm = smooth / GOAL;
      still = calm * 0.4;
      faceT -= dt;
      if (faceT <= 0) {
        faceT = 0.25;
        const anx = Math.max(0, (0.55 + startI * 0.45) * (1 - calm * 1.05) + chop * 0.45);
        setFace({ anxious: anx, calm: Math.max(0.05, calm * 0.9) }, 0.72);
        realm()?.setMood?.({ agitation: Math.min(1, 0.72 * (1 - calm) + chop * 0.35 + 0.08), clarity: 0.15 + calm * 0.4, heaviness: 0.35 * (1 - calm), warmth: 0.15 + calm * 0.2 });
        realm()?.transform?.(calm * 0.3);
      }
      // --- draw the path
      g.save();
      g.setLineDash([2, 11]); g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 4;
      g.beginPath();
      for (let i = 0; i <= 90; i++) { const u = i / 90; i ? g.lineTo(px(u), py(u)) : g.moveTo(px(u), py(u)); }
      g.stroke();
      g.setLineDash([]);
      // traced part of this pass
      const a = dir > 0 ? 0 : pos, b = dir > 0 ? pos : 1;
      if (b - a > 0.004) {
        const j = rm ? 0 : chop * 7;
        const trace = () => { g.beginPath(); const n = Math.max(2, Math.round((b - a) * 90)); for (let i = 0; i <= n; i++) { const u = a + (b - a) * (i / n); const jj = j ? (Math.random() - 0.5) * j : 0; i ? g.lineTo(px(u), py(u) + jj) : g.moveTo(px(u), py(u) + jj); } g.stroke(); };
        g.strokeStyle = `rgba(168,240,255,${0.35})`; g.lineWidth = 12; trace();
        g.strokeStyle = chop > 0.4 ? 'rgba(255,255,255,0.95)' : 'rgba(225,252,255,0.95)'; g.lineWidth = 4; trace();
      }
      // pacing ring: where an unhurried breath would be
      if (passT0 != null && !guided) {
        const el = (now - passT0) / 1000;
        const gu = Math.max(0, Math.min(1, dir > 0 ? el / IN : 1 - el / OUT));
        g.strokeStyle = 'rgba(255,217,138,0.85)'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(px(gu), py(gu), 22, 0, Math.PI * 2); g.stroke();
      }
      // the float
      const fx = px(pos), fy = py(pos);
      const pulse = passT0 == null && !rm ? 1 + Math.sin(now / 420) * 0.12 : 1;
      const gl = g.createRadialGradient(fx, fy, 0, fx, fy, 34 * pulse);
      gl.addColorStop(0, 'rgba(255,255,255,0.95)'); gl.addColorStop(0.35, 'rgba(168,240,255,0.8)'); gl.addColorStop(1, 'rgba(168,240,255,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(fx, fy, 34 * pulse, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(fx, fy, 9, 0, Math.PI * 2); g.fill();
      g.restore();
      // breath tone follows the trace
    };
    const down = (e) => {
      if (guided) return;
      if (Math.abs(e.clientX - px(pos)) < 70 && Math.abs(e.clientY - py(pos)) < 90) {
        grabbing = true; canvas.setPointerCapture?.(e.pointerId);
      } else cue.textContent = dir > 0 ? 'Start from the glow on the left →' : '← Start from the glow on the right';
    };
    const move = (e) => {
      if (!grabbing || guided) return;
      const u = Math.max(0, Math.min(1, (e.clientX - P.x0) / (P.x1 - P.x0)));
      if (dir > 0 && u > pos) pos = Math.min(u, pos + 0.34);
      if (dir < 0 && u < pos) pos = Math.max(u, pos - 0.34);
    };
    const up = () => { grabbing = false; };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    guideBtn.addEventListener('click', () => {
      guided = !guided; result.guided = result.guided || guided;
      grabbing = false;
      guideBtn.textContent = guided ? 'I’ll trace it myself' : 'Run a guided wave for me';
      if (guided) { chop = 0; say('Just breathe with the glow. I’ll do the steering.', 2600); }
    });
    function finish() {
      if (done) return; done = true;
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      result.breaths = Math.max(1, Math.round(smooth / 2));
      resolve();
    }
  });
  if (signal.aborted) return result;
  world.fx.classList.remove('live');
  drawExtra = null; relayout = () => {};
  chop = 0; still = 0.4;
  realm()?.transform?.(0.3);
  realm()?.pulse?.('ripple', { x: W / 2, y: waterY + 30 });
  haptic('soft');
  setFace({ calm: 0.6, curious: 0.25, anxious: 0.15 }, 0.65);
  await say('There. Slightly less sloshy in here. I’ll take it.', 2500);
  if (signal.aborted) return result;

  // ================================================== 2. WORRY BOATS ==
  setMove(1, { eyebrow: 'Move 2 of 4', title: 'Worry boats', prompt: tiny ? 'Each worry gets its own paper boat.' : 'Tap what’s on your mind. Each one gets its own little paper boat.' });
  place(tiny ? 28 : 31, tiny ? 0.42 : 0.5);
  setFace({ curious: 0.55, calm: 0.45 }, 0.6);

  const small = H < 700;
  const chipWrap = h('div', { style: small
    ? { display: 'flex', gap: '8px', overflowX: 'auto', padding: '2px 2px 6px', scrollbarWidth: 'none' }
    : { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' } });
  const ownInput = h('input', { class: 'text', type: 'text', maxlength: '40', placeholder: 'Or in your own words…', 'aria-label': 'A worry in your own words', style: { flex: '1', minWidth: '0', fontSize: '16px' } });
  const ownBtn = h('button', { class: 'btn', style: { flex: '0 0 auto', padding: '0 16px', minHeight: '48px' } }, 'Launch');
  const fleetBtn = h('button', { class: 'btn primary block', disabled: true }, 'That’s the fleet');
  const chipEls = WORRIES.map(([id, label]) => {
    const c = h('button', { class: 'chip', 'aria-pressed': 'false', style: { minHeight: '44px', fontSize: '14px' }, 'aria-label': `${label}. Launch as a boat.` }, label);
    c.onclick = () => {
      if (c.dataset.used) return;
      c.dataset.used = '1';
      const had = document.activeElement === c, next = c.nextElementSibling || c.previousElementSibling;
      c.remove();
      if (had) (next || ownInput).focus({ preventScroll: true });
      launch(id, label, false);
    };
    chipWrap.append(c);
    return c;
  });
  dock.replaceChildren(chipWrap, h('div', { style: { display: 'flex', gap: '8px' } }, ownInput, ownBtn), fleetBtn);

  function boatSpots() {
    const live = boats.filter((b) => !b.docked);
    const n = live.length, cols = 3, rows = Math.max(1, Math.ceil(n / cols));
    const band = Math.max(70, bandBottom - waterY);
    const rowH = rows > 1 ? Math.min(84, Math.max(56, (band - 64) / (rows - 1))) : 0;
    live.forEach((b, i) => {
      const row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), col = i % cols;
      const span = inRow === 1 ? [0.5] : inRow === 2 ? [0.3, 0.7] : [0.18, 0.5, 0.82];
      b.x = W * span[col] + (row % 2 ? 6 : -6);
      b.y = Math.min(bandBottom - 34, waterY + 22 + row * rowH + (col === 1 ? 6 : 0));
      if (!b.dragging) { b.el.style.left = `${b.x}px`; b.el.style.top = `${b.y}px`; }
    });
  }
  relayout = boatSpots;
  layout();

  function launch(id, label, own) {
    if (boats.length >= MAX_BOATS) return;
    const el = h('button', { class: 'db-boat', 'aria-pressed': 'false', 'aria-label': `Boat: ${label}`,
      style: { position: 'absolute', left: '-80px', top: `${waterY + 22}px`, transform: 'translate(-50%,-50%)', pointerEvents: 'auto', touchAction: 'none',
        background: 'none', border: '0', padding: '4px', margin: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'grab',
        color: 'var(--text-1)', minWidth: '64px', minHeight: '44px', borderRadius: '14px',
        transition: rm ? 'opacity 300ms' : 'left 900ms cubic-bezier(.2,.8,.2,1), top 900ms cubic-bezier(.2,.8,.2,1), opacity 400ms' } },
      h('span', { html: BOAT_SVG(small ? 54 : 64) }),
      h('span', { class: 'db-label', style: { font: '650 13px/1.15 var(--font-ui)', background: 'rgba(6,22,52,.78)', borderRadius: '10px', padding: '3px 8px',
        maxWidth: '29vw', whiteSpace: 'normal', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,.25)' } }, label));
    field.append(el);
    const b = { id, label, own, el, x: 0, y: 0, ph: Math.random() * 6, docked: false, dragging: false };
    boats.push(b);
    result.worries.push(label);
    requestAnimationFrame(() => requestAnimationFrame(() => { layout(); }));
    later(() => { ripple(b.x, waterY + 8); realm()?.pulse?.('ripple', { x: b.x, y: waterY + 8 }); }, rm ? 0 : 700);
    audio.fx?.('drop-in', { intensity: 0.5, pan: 0 });
    haptic('soft');
    world.react(boats.length === 1 ? 'nod' : 'tap');
    say(boats.length === 1 ? 'Launched. They float. Mostly.' : LAUNCH_LINES[(boats.length - 2) % LAUNCH_LINES.length], 1800);
    fleetBtn.disabled = false;
    if (boats.length >= MAX_BOATS) {
      chipEls.forEach((c) => { c.disabled = true; });
      ownInput.disabled = true; ownBtn.disabled = true;
      fleetBtn.textContent = 'That’s a full harbour';
    }
    // a touch more slosh with each new worry on the water
    realm()?.setMood?.({ agitation: 0.25 + boats.length * 0.05 });
    attachDrag(b);
  }
  const launchOwn = () => {
    const v = ownInput.value.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!v) { ownInput.focus(); return; }
    ownInput.value = '';
    launch('own', v, true);
  };
  ownBtn.onclick = launchOwn;
  ownInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); launchOwn(); } });

  // drag + tap-to-choose, live only while docking
  let phase = 'launch', selected = null, piers = [];
  function pierAt(x, y) {
    return piers.find((p) => { const r = p.el.getBoundingClientRect(); return x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 16 && y <= r.bottom + 6; });
  }
  function attachDrag(b) {
    let s = null, moved = false, suppressClick = false;
    b.el.addEventListener('pointerdown', (e) => {
      if (phase !== 'dock' || b.docked) return;
      s = { x: e.clientX, y: e.clientY }; moved = false;
      b.el.setPointerCapture?.(e.pointerId);
    });
    b.el.addEventListener('pointermove', (e) => {
      if (!s) return;
      if (!moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) {
        moved = true; b.dragging = true;
        b.el.style.transition = 'none'; b.el.style.zIndex = '2'; b.el.style.cursor = 'grabbing';
        b.el.style.transform = 'translate(-50%,-50%) rotate(-4deg) scale(1.06)';
        haptic('light');
      }
      if (moved) {
        b.el.style.left = `${e.clientX}px`; b.el.style.top = `${e.clientY - 18}px`;
        const p = pierAt(e.clientX, e.clientY);
        piers.forEach((q) => q.hl(q === p));
      }
    });
    const end = (e) => {
      if (!s) return;
      const wasMoved = moved;
      s = null; moved = false;
      if (!wasMoved) return;
      suppressClick = true; later(() => { suppressClick = false; }, 60);
      b.dragging = false; b.el.style.cursor = 'grab'; b.el.style.zIndex = '';
      piers.forEach((q) => q.hl(false));
      const p = e.type === 'pointerup' ? pierAt(e.clientX, e.clientY) : null;
      if (p) dockBoat(b, p);
      else {
        b.el.style.transition = rm ? 'none' : 'left 500ms cubic-bezier(.2,.8,.2,1), top 500ms cubic-bezier(.2,.8,.2,1)';
        b.el.style.left = `${b.x}px`; b.el.style.top = `${b.y}px`;
        if (e.type === 'pointerup' && e.clientY > bandBottom - 30) hint.textContent = 'Nearly. Let go right over a jetty.';
      }
    };
    b.el.addEventListener('pointerup', end);
    b.el.addEventListener('pointercancel', end);
    b.el.addEventListener('click', () => {
      if (phase !== 'dock' || b.docked || suppressClick) return;
      const on = selected !== b;
      boats.forEach((x) => { x.el.setAttribute('aria-pressed', 'false'); x.el.style.background = 'none'; x.el.style.boxShadow = 'none'; });
      selected = on ? b : null;
      if (on) {
        b.el.setAttribute('aria-pressed', 'true');
        b.el.style.background = 'rgba(255,217,138,.16)'; b.el.style.boxShadow = '0 0 0 3px rgba(255,217,138,.65)';
        hint.textContent = `Now tap a jetty for “${b.label}”.`;
        audio.ui?.('select');
      } else hint.textContent = 'Drag a boat to a jetty, or tap a boat then a jetty.';
      piers.forEach((q) => { q.el.style.borderColor = selected ? q.col : 'rgba(255,255,255,.22)'; });
    });
  }

  await until((r) => { fleetBtn.onclick = r; });
  if (signal.aborted) return result;
  chipEls.forEach((c) => { c.disabled = true; });
  await say(boats.length > 3 ? 'That’s quite a fleet. Let’s find them all a parking spot.' : 'A small fleet. Let’s find them a parking spot.', 2300);
  if (signal.aborted) return result;

  // ================================================== 3. DOCK THEM ==
  phase = 'dock';
  setMove(2, { eyebrow: 'Move 3 of 4', title: 'Dock them', prompt: tiny ? 'Drag each boat to a jetty.' : 'Drag each boat to a jetty. No wrong answers, only parking.' });
  setFace({ calm: 0.55, curious: 0.35, anxious: 0.1 }, 0.6);
  const hint = h('p', { 'aria-live': 'polite', style: { ...PILL, minHeight: '20px' } }, 'Drag a boat to a jetty, or tap a boat then a jetty.');
  const pierRow = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' } });
  piers = DOCKS.map(([id, label, col]) => {
    const moor = h('span', { style: { display: 'flex', flexWrap: 'wrap', gap: '2px', justifyContent: 'center', minHeight: '18px' } });
    const count = h('span', { class: 'sr-only' }, '');
    const el = h('button', { 'aria-label': `${label} jetty. No boats yet.`,
      style: { position: 'relative', minHeight: small ? '92px' : '108px', borderRadius: '16px', border: '1px solid rgba(255,255,255,.22)', borderTop: `3px solid ${col}`,
        background: 'linear-gradient(180deg, rgba(14,34,74,.9), rgba(8,22,54,.94))', color: 'var(--text-1)', font: '700 13px/1.2 var(--font-ui)', padding: '10px 6px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: '6px', cursor: 'pointer',
        boxShadow: 'inset 0 -9px 0 rgba(170,128,86,.55), inset 0 -11px 0 rgba(90,60,40,.5)', transition: 'transform 200ms, box-shadow 200ms' } },
      h('span', { style: { textWrap: 'balance', textAlign: 'center' } }, label), moor, count);
    const p = { id, label, col, el, moor, n: 0,
      hl: (on) => { el.style.transform = on ? 'translateY(-4px)' : ''; el.style.boxShadow = on ? `0 0 0 3px ${col}, inset 0 -9px 0 rgba(170,128,86,.55)` : 'inset 0 -9px 0 rgba(170,128,86,.55), inset 0 -11px 0 rgba(90,60,40,.5)'; } };
    el.onclick = () => {
      if (selected) dockBoat(selected, p);
      else { hint.textContent = 'Pick a boat first, then its jetty.'; audio.ui?.('error-soft'); }
    };
    pierRow.append(el);
    return p;
  });
  dock.replaceChildren(hint, pierRow);
  layout();

  const total = boats.length;
  const seenDock = new Set();
  let dockedN = 0, allDone = null;
  function dockBoat(b, p) {
    if (b.docked) return;
    b.docked = true; dockedN++;
    if (selected === b) selected = null;
    piers.forEach((q) => { q.el.style.borderColor = 'rgba(255,255,255,.22)'; q.el.style.borderTopColor = q.col; });
    result.docked[p.id].push(b.label);
    const r = p.el.getBoundingClientRect();
    b.el.style.transition = rm ? 'opacity 250ms' : 'left 480ms cubic-bezier(.2,.8,.2,1), top 480ms cubic-bezier(.2,.8,.2,1), opacity 480ms, transform 480ms';
    b.el.style.left = `${r.left + r.width / 2}px`; b.el.style.top = `${r.top + r.height * 0.55}px`;
    b.el.style.transform = 'translate(-50%,-50%) scale(.35)'; b.el.style.opacity = '0';
    b.el.style.pointerEvents = 'none'; b.el.setAttribute('aria-hidden', 'true'); b.el.tabIndex = -1;
    later(() => b.el.remove(), 520);
    p.n++;
    p.moor.append(h('span', { title: b.label, html: BOAT_SVG(20), style: { display: 'inline-block', animation: rm ? 'none' : 'fadeIn 400ms both' } }));
    p.el.setAttribute('aria-label', `${p.label} jetty. ${p.n} boat${p.n > 1 ? 's' : ''}: ${result.docked[p.id].join(', ')}.`);
    audio.fx?.('sort', { intensity: 0.5, pitch: 0.9 + dockedN * 0.05 });
    haptic('pop');
    ripple(r.left + r.width / 2, Math.min(bandBottom, surf(r.left + r.width / 2) + 10));
    realm()?.pulse?.('ripple', { x: r.left + r.width / 2, y: r.top });
    const k = dockedN / total;
    still = 0.4 + 0.4 * k;
    setFace({ calm: 0.5 + k * 0.4, comforted: 0.1 + k * 0.2, anxious: Math.max(0, 0.1 - k * 0.1) }, 0.6);
    realm()?.setMood?.({ agitation: Math.max(0.05, 0.3 * (1 - k)), clarity: 0.55 + k * 0.25, heaviness: 0.15 * (1 - k), warmth: 0.35 + k * 0.15 });
    realm()?.transform?.(0.3 + k * 0.35);
    if (!seenDock.has(p.id)) { seenDock.add(p.id); world.react('nod'); say(DOCK_LINES[p.id][0], 2200); }
    else { world.react('nod'); if (Math.random() < 0.5) say(DOCK_LINES[p.id][1], 2000); }
    hint.textContent = dockedN < total ? `${total - dockedN} still bobbing about.` : 'All tied up.';
    later(boatSpots, 120);
    if (dockedN >= total) later(() => allDone?.(), 900);
  }
  await until((r) => { allDone = r; });
  if (signal.aborted) return result;
  phase = 'done';
  setFace({ calm: 0.8, comforted: 0.2 }, 0.6);
  await say('All tied up. Look how still that bit of water’s gone.', 2600);
  if (signal.aborted) return result;

  // ================================================== 4. ONE ANCHOR ==
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'One anchor', prompt: '' });
  place(tiny ? 30 : 30, tiny ? 0.4 : 0.48);
  setFace({ calm: 0.6, determined: 0.25, curious: 0.15 }, 0.6);
  const todayBoats = boats.filter((b) => result.docked.today.includes(b.label));
  const grid = h('div', { class: 'choice-grid' });
  const lead = h('p', { style: { ...PILL } });
  const swapBtn = h('button', { class: 'btn ghost block' }, 'None of these feel doable right now');
  const useBtn = h('button', { class: 'btn primary block', disabled: true }, 'Use this anchor');
  let choice = null;
  const showOptions = (opts, kind) => {
    choice = null; useBtn.disabled = true;
    grid.replaceChildren(...opts.map(([id, label, note]) => {
      const b = h('button', { class: 'choice', 'aria-pressed': 'false', style: { minHeight: small ? '56px' : '64px', fontSize: small ? '14px' : '15px' } }, label);
      b.onclick = () => {
        grid.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        choice = { id, label, note, kind };
        useBtn.disabled = false;
        audio.ui?.('select'); haptic('light');
      };
      return b;
    }));
  };
  const showGrounding = (why) => {
    setMove(3, { eyebrow: 'Move 4 of 4', title: 'One anchor', prompt: tiny ? 'Small and physical works best.' : 'Pick a grounding anchor. Small and physical works best.' });
    lead.textContent = why;
    swapBtn.style.display = 'none';
    showOptions(ANCHORS, 'ground');
  };
  const showSteps = (b) => {
    result.anchorFor = b.label;
    setMove(3, { eyebrow: 'Move 4 of 4', title: 'One anchor', prompt: tiny ? 'One tiny first step. Tiny counts.' : 'One boat, one tiny first step. Tiny counts. Tiny is the whole trick.' });
    lead.textContent = `For “${b.label}”:`;
    swapBtn.style.display = '';
    showOptions((STEPS[b.own ? 'own' : b.id] || STEPS.own).map((s, i) => [`${b.own ? 'own' : b.id}-${i}`, s, '']), 'step');
  };
  swapBtn.onclick = () => { say('Fair. Then we anchor you instead. Feet first, usually.', 2600); showGrounding('No step needed. Pick something for your body instead.'); };
  dock.replaceChildren(lead, grid, swapBtn, useBtn);
  layout();

  if (todayBoats.length > 1) {
    setMove(3, { eyebrow: 'Move 4 of 4', title: 'One anchor', prompt: tiny ? 'Which “today” boat gets the anchor?' : 'Which “today” boat gets the anchor? Just one. The others can wait their turn.' });
    lead.textContent = 'Pick one boat:';
    swapBtn.style.display = 'none';
    grid.replaceChildren(...todayBoats.map((b) => {
      const c = h('button', { class: 'choice', style: { minHeight: small ? '52px' : '60px' } }, b.label);
      c.onclick = () => { audio.ui?.('select'); haptic('light'); showSteps(b); };
      return c;
    }));
    say('Just one boat gets an anchor. The rest can wait their turn.', 2400);
  } else if (todayBoats.length === 1) {
    showSteps(todayBoats[0]);
    say('One boat, one tiny step. Tiny counts.', 2200);
  } else {
    showGrounding('Nothing for today, which is very sensible. Pick something for your body instead.');
    say('No today boats? Then we anchor you instead. Feet first, usually.', 2800);
  }
  await until((r) => { useBtn.onclick = () => { if (choice) r(); }; });
  if (signal.aborted) return result;
  result.anchor = choice.label; result.anchorKind = choice.kind;
  if (choice.kind === 'ground') result.anchorFor = null;

  // ---- drop the anchor: pull it down through the water
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'Drop the anchor', prompt: 'Pull it down to the seabed.' });
  const tag = h('span', { style: { font: '650 13px/1.2 var(--font-ui)', background: 'rgba(6,22,52,.82)', borderRadius: '10px', padding: '4px 10px', width: 'max-content', maxWidth: '44vw', textAlign: 'center', whiteSpace: 'normal' } }, choice.label);
  const anchorBtn = h('button', { 'aria-label': `Anchor: ${choice.label}. Drag down, or press to drop it.`,
    style: { position: 'absolute', left: '70%', top: '0px', transform: 'translate(-50%, 0)', pointerEvents: 'auto', touchAction: 'none', background: 'none', border: '0', padding: '4px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--text-1)', cursor: 'grab', minWidth: '64px', minHeight: '64px' } },
    tag, h('span', { html: ANCHOR_SVG, style: { filter: 'drop-shadow(0 0 10px rgba(255,217,138,.55))' } }));
  field.append(anchorBtn);
  const dropBtn = h('button', { class: 'btn primary block' }, 'Drop the anchor');
  const dcue = h('p', { style: { ...PILL } }, 'Drag it down, or press the button.');
  dock.replaceChildren(dcue, dropBtn);
  let ay = 0, aTop = 0;
  relayout = () => { aTop = waterY - 4; anchorBtn.style.top = `${aTop + ay}px`; };
  layout();
  drawExtra = () => {
    const r = anchorBtn.getBoundingClientRect();
    const ax = r.left + r.width / 2, ay2 = r.bottom - 52;
    g.strokeStyle = 'rgba(255,240,200,0.75)'; g.lineWidth = 2; g.setLineDash([5, 5]);
    if (ay2 > surf(ax) + 4) { g.beginPath(); g.moveTo(ax, surf(ax)); g.quadraticCurveTo(ax + 8, (surf(ax) + ay2) / 2, ax, ay2); g.stroke(); }
    g.setLineDash([]);
  };
  await until((resolve) => {
    let s0 = null, dropped = false;
    const maxD = () => Math.max(40, bandBottom - aTop - anchorBtn.offsetHeight - 4);
    const drop = () => {
      if (dropped) return; dropped = true;
      anchorBtn.style.transition = rm ? 'none' : 'top 900ms cubic-bezier(.5,0,.3,1)';
      ay = maxD(); anchorBtn.style.top = `${aTop + ay}px`;
      anchorBtn.style.pointerEvents = 'none';
      later(() => {
        ripple(W * 0.7, waterY + 6); realm()?.pulse?.('ripple', { x: W * 0.7, y: waterY });
        audio.fx?.('chime', { intensity: 0.6, pitch: 0.8 }); haptic('soft');
        resolve();
      }, rm ? 50 : 900);
    };
    anchorBtn.addEventListener('pointerdown', (e) => { s0 = e.clientY - ay; anchorBtn.style.transition = 'none'; anchorBtn.setPointerCapture?.(e.pointerId); });
    anchorBtn.addEventListener('pointermove', (e) => { if (s0 == null || dropped) return; ay = Math.max(0, Math.min(maxD(), e.clientY - s0)); anchorBtn.style.top = `${aTop + ay}px`; if (ay > 70) drop(); });
    const up = () => { if (s0 == null) return; s0 = null; if (!dropped) { anchorBtn.style.transition = rm ? 'none' : 'top 400ms cubic-bezier(.2,.8,.2,1)'; ay = 0; anchorBtn.style.top = `${aTop}px`; } };
    anchorBtn.addEventListener('pointerup', up);
    anchorBtn.addEventListener('pointercancel', up);
    anchorBtn.addEventListener('click', () => { if (s0 == null) drop(); });
    dropBtn.onclick = drop;
  });
  if (signal.aborted) return result;
  still = 0.92;
  realm()?.transform?.(0.8);
  setFace({ calm: 0.8, comforted: 0.2 }, 0.6);
  world.react('nod');

  if (choice.id === 'see5') {
    setMove(3, { eyebrow: 'Move 4 of 4', title: 'Five things', prompt: 'Look around. Tap a dot for each thing you can see.' });
    const dots = Array.from({ length: 5 }, (_, i) => h('button', { 'aria-label': `Thing ${i + 1} spotted`, 'aria-pressed': 'false',
      style: { width: '48px', height: '48px', borderRadius: '50%', border: '2px solid rgba(168,240,255,.6)', background: 'rgba(10,30,70,.7)', color: 'var(--text-1)', font: '800 16px var(--font-ui)', cursor: 'pointer' } }, String(i + 1)));
    const skip = h('button', { class: 'btn ghost block' }, 'Done looking');
    dock.replaceChildren(h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center' } }, dots), skip);
    say('Boring things count. Boring things are excellent.', 2400);
    await until((r) => {
      let n = 0;
      dots.forEach((d) => { d.onclick = () => {
        if (d.getAttribute('aria-pressed') === 'true') return;
        d.setAttribute('aria-pressed', 'true'); n++;
        d.style.background = '#a8f0ff'; d.style.color = '#08213f'; d.style.boxShadow = '0 0 14px #a8f0ff';
        audio.fx?.('chime', { intensity: 0.4, pitch: 1 + n * 0.1 }); haptic('light');
        ripple(W * (0.2 + Math.random() * 0.6), waterY + 10);
        if (n >= 5) later(r, 500);
      }; });
      skip.onclick = r;
    });
  } else {
    const note = choice.kind === 'ground' ? choice.note : 'Just that bit. The rest of the boat can wait.';
    setMove(3, { eyebrow: 'Move 4 of 4', title: 'Anchored', prompt: note });
    const ok = h('button', { class: 'btn primary block' }, 'Okay, got it');
    dock.replaceChildren(ok);
    say(choice.kind === 'ground' ? 'Anchor down. Take your time with it.' : 'Anchor down. That’s one boat that isn’t drifting.', 2400);
    await until((r) => { ok.onclick = r; });
  }
  if (signal.aborted) return result;

  // ======================================================= FINALE ==
  drawExtra = null;
  anchorBtn.remove();
  dock.replaceChildren();
  setMove(4, { eyebrow: 'The Blue Drift', title: 'Mirror-still', prompt: '' });
  place(H < 640 ? 40 : 42, H < 640 ? 0.72 : 0.84);
  relayout = () => {};
  layout();
  // the docked boats, moored neatly along the edges
  const docked = [...result.docked.today, ...result.docked.later, ...result.docked.notmine];
  docked.forEach((_, i) => {
    const left = i % 2 === 0, k = Math.floor(i / 2);
    parked.push({ x: left ? W * 0.08 + k * 34 : W * 0.92 - k * 34, s: 0.5 });
  });
  still = 1; chop = 0;
  realm()?.setMood?.({ agitation: 0, clarity: 1, heaviness: 0, warmth: 0.55 });
  realm()?.transform?.(1);
  realm()?.pulse?.('clear', { x: W / 2, y: waterY });
  ripple(W / 2, waterY + 4);
  audio.fx?.('clear', { intensity: 0.7 });
  haptic('success');
  world.setEmotion({ calm: 0.65, happy: 0.2, comforted: 0.15 }, 0.7);
  world.react('celebrate');
  await say('Mirror-still. Look at that. Quietly impressed over here.', 3000);
  if (signal.aborted) return result;
  await say('The boats are still there, by the way. They’re just parked.', 2800);
  if (signal.aborted) return result;
  cleanup();

  result.completed = true;
  const list = (a) => (a.length ? a.join(', ') : '');
  result.summary = [
    { label: 'Slowed the wave', text: `${result.breaths} slow breath${result.breaths === 1 ? '' : 's'}, longer on the out${result.guided ? ' (guided)' : ''}` },
    result.docked.today.length ? { label: 'Something today', text: list(result.docked.today) } : null,
    result.docked.later.length ? { label: 'Later / not yet', text: list(result.docked.later) } : null,
    result.docked.notmine.length ? { label: 'Not mine to control', text: list(result.docked.notmine) } : null,
    { label: 'Your anchor', text: result.anchorFor ? `${result.anchor} (for “${result.anchorFor}”)` : result.anchor },
  ].filter(Boolean);
  result.share = { title: 'Mirror-still', subtitle: 'Loomi helped me dock my worries.' };
  return result;
}
