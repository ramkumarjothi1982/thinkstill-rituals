// SPARK TO LANTERN — Pipzi, The Spark.
// For buzzing, high-energy states: excitement, anticipation, restlessness,
// nervous jitters, impatience, eagerness, cravings and urges, shocks and jolts.
//
// 1. Catch the beat  — tap along with Pipzi's drum. Every on-beat tap lights
//                      a festival lantern and throws sparks. Pipzi starts
//                      FAST and slows down bit by bit, so your tapping slows
//                      with it (rhythmic entrainment, made into a game).
// 2. Ride the wave   — press and hold to carry a little surfer spark up a
//                      swell, over the crest and down to flat water (a
//                      playful take on "urge surfing": it rises, peaks, falls).
// 3. Spark or shelf  — drag each spark of energy to "use it now" (a lantern
//                      floats up) or "save it for later" (a lantern is put on
//                      the shelf).
// 4. Launch!         — pick one small next step, then hold to fill a lantern
//                      with warm air and let it fly.
// Finale: every lantern rises, a soft (non-flashing) firework blooms, Pipzi
// takes a very dramatic bow.
//
// Rationale (plain): moving with a steady, slowing rhythm, noticing that
// urges and surges tend to rise, peak and pass, and giving energy a concrete
// direction are common, widely taught approaches. No promise the buzz will
// vanish — the aim is to be steering it.

import { h, wait } from '../app/ui.js';
import { canvasFontPx } from '../ui/type.js';

const FONT_13 = canvasFontPx(13, 700);   // canvas labels: the voice face, at the 13px floor
import { getEmotion } from '../data/emotions.js';

export const meta = { id: 'spark-to-lantern' };

const LANTERNS = 8;
const HITS_PER = 2;        // on-beat taps per lantern
const RIDE_SEC = 24;

// what the energy could be for (move 3) and small steps for each (move 4)
const USES = [
  { id: 'start', label: 'Start the thing', now: 'Momentum! Ooh, I LOVE momentum!', later: 'Shelved! Future-you gets a head start.',
    steps: [['start-2min', 'Do just two minutes of it'], ['start-open', 'Open it up and look at it']] },
  { id: 'move', label: 'Move my body', now: 'Wiggle time! Shake that fizz out!', later: 'On the shelf, ready for later wiggles.',
    steps: [['move-song', 'Dance to one whole song'], ['move-walk', 'A quick walk, even round the room']] },
  { id: 'tell', label: 'Tell someone the news', now: 'Big news energy! Your way, your timing.', later: 'A secret… for now! Ooh, the drama!',
    steps: [['tell-who', 'Decide who hears it first'], ['tell-jot', 'Jot down how I’d say it']] },
  { id: 'wait', label: 'Wait it out', now: 'Waiting it out IS using it. Very sophisticated.', later: 'Shelved. Even waiting can wait!',
    steps: [['wait-water', 'Glass of water, then see'], ['wait-ten', 'Give it ten minutes, then check in']] },
  { id: 'plan', label: 'Make a plan', now: 'A plan! Pipzi approves, LOUDLY!', later: 'Plan-making, saved for a calmer moment.',
    steps: [['plan-three', 'Write three bullet points'], ['plan-when', 'Pick a time to do it']] },
];

const OPEN = {
  fizz: 'Ooh! You’re BUZZING! I can feel it from here! Me too! Let’s do something with it!',
  nervy: 'Whoa, jittery sparks! Same! Okay, okay, we’re going to dance with this. Ready?',
  urge: 'A big WANT! I know that feeling! It’s loud, isn’t it? Let’s give it a rhythm.',
  jolt: 'WHOA! What a jolt! My sparks went everywhere! Let’s gather them up together!',
};
const WAVE_INTRO = {
  fizz: 'Even brilliant fizz comes in waves! Up… over… down. Ride it with me!',
  nervy: 'Nervous energy tends to come in waves too. Up, over, down. Hold on!',
  urge: 'Urges are a bit like waves. They build, they peak, they tend to fade. Let’s surf this one!',
  jolt: 'A jolt makes a wave! Big at first, then it rolls on. Let’s ride it!',
};

function kindOf(input) {
  const fams = (input?.emotions || []).map((e) => getEmotion(e.id)?.family).filter(Boolean);
  const f = fams[0];
  if (f === 'desire') return 'urge';
  if (f === 'surprise') return 'jolt';
  if (f === 'fear' || f === 'anger' || f === 'boredom') return 'nervy';
  return 'fizz';
}

const tempoWord = (bpm) => (bpm > 128 ? 'zippy!' : bpm > 104 ? 'bouncy' : bpm > 82 ? 'strolling' : 'mellow');

export async function run(ctx) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const rm = !!ctx.reducedMotion;
  const soft = rm || !!ctx.lowStim;          // softer particle feedback
  const realm = () => world.realm;
  const say = (t, ms) => ctx.say(t, { who: 'Pipzi', ms });
  const kind = kindOf(ctx.input);
  const startI = Math.min(1, Math.max(0.55, ctx.input?.intensity || 0.75));
  const result = { completed: false, kind, lanterns: 0, bpmStart: 0, bpmEnd: 0, rode: false, now: [], later: [], step: null };

  // ---------------------------------------------------- shared fx layer --
  const canvas = h('canvas', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%' } });
  const field = h('div', { style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
  world.fx.replaceChildren(canvas, field);
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resizers = [];
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    for (const fn of resizers) fn();
  };
  resize();
  addEventListener('resize', resize);

  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!signal.aborted) fn(); }, ms); timers.add(id); return id; };
  let humSound = null;

  // geometry helpers (read the host's layout so nothing collides)
  const titleBottom = () => document.querySelector('.ritual-ui .move-title')?.getBoundingClientRect().bottom || H * 0.2;
  const dockTop = () => { const r = dock.getBoundingClientRect(); return r.height ? r.top : H - 24; };
  const placeBelowTitle = (scale, gap = 6) => {
    const mh = document.getElementById('mallow-layer')?.offsetHeight || Math.min(H * 0.56, 470);
    const cy = titleBottom() + gap + mh * scale * 0.3;   // body starts ~22% down the layer
    world.place({ x: 50, y: Math.round((cy / H) * 1000) / 10, scale });
  };

  // ------------------------------------------------------- particles --
  const sparks = [];   // {x,y,vx,vy,age,life,s,c}
  const streaks = [];  // {x0,y0,x1,y1,t,dur,done}
  const flyers = [];   // free lanterns floating up {x,y,vy,s,sway,ph,a,hue}
  const COLS = ['rgba(255,207,74,A)', 'rgba(255,120,90,A)', 'rgba(255,176,240,A)', 'rgba(255,240,200,A)'];
  const burst = (x, y, n = 10, speed = 1) => {
    if (soft) n = Math.min(3, n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 160) * speed * (soft ? 0.5 : 1);
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, age: 0, life: 0.5 + Math.random() * 0.6, s: 2 + Math.random() * 3, c: COLS[i % COLS.length] });
    }
  };
  function drawSparks(dt) {
    for (const p of sparks) { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy = p.vy * 0.96 + 120 * dt; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].age > sparks[i].life) sparks.splice(i, 1);
    g.globalCompositeOperation = 'lighter';
    for (const p of sparks) {
      const a = 1 - p.age / p.life;
      g.fillStyle = p.c.replace('A', (a * 0.85).toFixed(3));
      g.beginPath(); g.arc(p.x, p.y, p.s * (0.6 + a * 0.4), 0, Math.PI * 2); g.fill();
    }
    for (const s of streaks) {
      s.t = Math.min(1, s.t + dt / s.dur);
      const e = 1 - (1 - s.t) * (1 - s.t);
      const x = s.x0 + (s.x1 - s.x0) * e, y = s.y0 + (s.y1 - s.y0) * e - Math.sin(e * Math.PI) * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, 10);
      gr.addColorStop(0, 'rgba(255,245,210,0.95)'); gr.addColorStop(1, 'rgba(255,190,80,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.fill();
      if (s.t >= 1 && !s.done) { s.done = true; s.onArrive?.(); }
    }
    for (let i = streaks.length - 1; i >= 0; i--) if (streaks[i].done) streaks.splice(i, 1);
    g.globalCompositeOperation = 'source-over';
  }

  function lantern(x, y, s, lit, hue = 0, alpha = 1) {
    if (alpha <= 0.01) return;
    g.save();
    g.globalAlpha = alpha;
    if (lit > 0.02) {
      const R = s * 2.6;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, `rgba(255,200,90,${0.45 * lit})`); gr.addColorStop(1, 'rgba(255,150,60,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
    }
    const body = hue ? ['#ff6fb8', '#ff9bd6'] : ['#ff5a3a', '#ffcf4a'];
    const w = s * 1.1, hh = s * 1.45;
    const gr2 = g.createLinearGradient(x, y - hh / 2, x, y + hh / 2);
    if (lit > 0.02) { gr2.addColorStop(0, body[0]); gr2.addColorStop(0.5, body[1]); gr2.addColorStop(1, body[0]); }
    else { gr2.addColorStop(0, '#4a2a3e'); gr2.addColorStop(1, '#2c1a30'); }
    g.fillStyle = gr2;
    g.beginPath();
    g.ellipse(x, y, w / 2, hh / 2, 0, 0, Math.PI * 2);
    g.fill();
    if (lit < 1) { g.fillStyle = `rgba(30,18,40,${0.55 * (1 - lit)})`; g.beginPath(); g.ellipse(x, y, w / 2, hh / 2, 0, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = 'rgba(80,20,30,.55)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(x, y, w * 0.18, hh / 2, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#5a1420';
    g.fillRect(x - w * 0.28, y - hh / 2 - s * 0.14, w * 0.56, s * 0.18);
    g.fillRect(x - w * 0.22, y + hh / 2 - s * 0.04, w * 0.44, s * 0.16);
    g.restore();
  }
  function drawFlyers(dt) {
    for (const f of flyers) {
      f.ph += dt;
      f.y += f.vy * dt;
      f.x += (Math.sin(f.ph * 0.9 + f.sway) * (rm ? 4 : 14) + f.vx) * dt;
      if (f.y < -40) f.gone = true;
      lantern(f.x, f.y, f.s, 1, f.hue, Math.min(1, f.a += dt * 2));
    }
    for (let i = flyers.length - 1; i >= 0; i--) if (flyers[i].gone) flyers.splice(i, 1);
  }
  const fly = (x, y, s = 16, hue = 0, vy = -70, vx = 0) => flyers.push({ x, y, s, hue, vy: vy * (rm ? 0.6 : 1), vx: vx * (rm ? 0.6 : 1), ph: 0, sway: Math.random() * 6, a: 1 });

  // festival string of lanterns (move 1, then the finale)
  const string = { alpha: 0, target: 1, y: 0, items: Array.from({ length: LANTERNS }, (_, i) => ({ i, lit: 0, pop: 0 })) };
  const lanternPos = (i) => {
    const x = W * (0.1 + 0.8 * (i / (LANTERNS - 1)));
    const u = i / (LANTERNS - 1);
    return [x, string.y + Math.sin(u * Math.PI) * 18];
  };
  function drawString(dt) {
    string.alpha += (string.target - string.alpha) * Math.min(1, dt * 3);
    if (string.alpha < 0.01) return;
    g.save(); g.globalAlpha = string.alpha;
    g.strokeStyle = 'rgba(255,230,190,.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, string.y - 14);
    g.quadraticCurveTo(W / 2, string.y + 30, W, string.y - 14); g.stroke();
    g.restore();
    const s = Math.min(15, W / 28);
    for (const it of string.items) {
      const [x, y] = lanternPos(it.i);
      it.pop = Math.max(0, it.pop - dt * 2.2);
      lantern(x, y + s * 0.4, s * (1 + (rm ? 0 : it.pop * 0.35)), it.lit, it.i % 2, string.alpha);
    }
  }

  let drawExtra = null;
  let raf = 0, last = performance.now();
  const loop = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    drawExtra?.(dt, t);
    drawString(dt);
    drawFlyers(dt);
    drawSparks(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const cleanup = () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    for (const id of timers) clearTimeout(id);
    timers.clear();
    humSound?.stop(); humSound = null;
    world.fx.classList.remove('live');
    world.fx.replaceChildren();
  };
  signal.addEventListener('abort', cleanup);

  // ===================================================== OPENING ==
  world.place(H < 700 ? { x: 50, y: 45, scale: 0.6 } : { x: 50, y: 47, scale: 0.72 });
  const openMix = { fizz: { excited: 1 }, nervy: { excited: 0.55, anxious: 0.45 }, urge: { excited: 0.6, determined: 0.4 }, jolt: { surprised: 0.6, excited: 0.4 } }[kind];
  world.setEmotion(openMix, startI, { extra: { bounceRate: 2.6 } });
  realm()?.setMood?.({ agitation: 0.75, clarity: 0.2, heaviness: 0.1, warmth: 0.55 });
  realm()?.transform?.(0);
  if (!rm) world.react('doubleTap');

  // ============================================== 1. CATCH THE BEAT ==
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'Catch the beat!', prompt: 'Tap along with my drum. On the beat, a lantern lights!' });
  say(OPEN[kind], 3400);
  const layoutString = () => { string.y = titleBottom() + 22; };
  layoutString(); resizers.push(layoutString);
  requestAnimationFrame(layoutString);

  const tapBtn = h('button', { class: 'btn primary block', style: { minHeight: '72px', fontSize: 'calc(20px * var(--type-scale))', letterSpacing: '.04em', touchAction: 'manipulation' },
    'aria-label': 'Tap on the beat. Press Space or Enter in time with the drum.' }, 'TAP! ✦');
  const tempoEl = h('p', { style: { textAlign: 'center', margin: '0', minHeight: '20px', color: 'var(--text-1)', font: '650 var(--type-label-size)/1.3 var(--ff-ui)', textShadow: '0 1px 8px rgba(10,4,20,.9)' }, 'aria-live': 'polite' }, `Lanterns: 0 of ${LANTERNS}`);
  dock.replaceChildren(tempoEl, tapBtn);
  world.fx.classList.add('live');

  const I0 = 400 + (1 - startI) * 140;   // ~150 bpm at full buzz
  const I1 = 1000;                        // 60 bpm, a mellow stroll
  result.bpmStart = Math.round(60000 / I0);
  await new Promise((resolve) => {
    const t0 = performance.now();
    let interval = I0, lastBeat = t0, nextBeat = t0 + 900, pulse = 0, lit = 0, hits = 0, misses = 0, mashes = 0, quips = 0, done = false;
    const tapTimes = [];
    const beats = new Map();            // beat time -> credited?
    const drum = () => {
      const m = world.mallowRect(), dt = dockTop();
      const y = Math.min(dt - 50, Math.max(m.bottom + 6, (m.bottom + dt) / 2));
      const r = Math.max(26, Math.min(44, (dt - m.bottom) / 2 - 10));
      return { x: W / 2, y, r };
    };
    drawExtra = (dt, now) => {
      if (!done) {
        const k = Math.max(hits / (LANTERNS * HITS_PER), Math.min(1, (now - t0) / 40000));
        interval = I0 + (I1 - I0) * (0.5 - Math.cos(Math.PI * k) / 2);
        while (now >= nextBeat) {
          lastBeat = nextBeat; nextBeat = lastBeat + interval;
          beats.set(lastBeat, false);
          if (beats.size > 6) beats.delete(beats.keys().next().value);
          pulse = 1;
          tapBtn.dataset.beat = String(Math.round(nextBeat));
          audio.fx?.('rotate-tick', { intensity: 0.45, pitch: 0.75 });
          const bpm = Math.round(60000 / interval);
          if (world.rig) world.rig.target.bounceRate = Math.max(0.9, bpm / 60);
        }
      }
      pulse = Math.max(0, pulse - dt * (rm ? 3 : 5));
      const { x, y, r } = drum();
      const ph = Math.min(1, (now - lastBeat) / Math.max(1, nextBeat - lastBeat));
      // approach ring: closes in on the drum exactly on the beat
      if (!done) {
        g.strokeStyle = `rgba(255,207,74,${0.2 + 0.55 * ph})`; g.lineWidth = 3;
        g.beginPath(); g.arc(x, y, r * (1 + 1.2 * (1 - ph)), 0, Math.PI * 2); g.stroke();
      }
      const gr = g.createRadialGradient(x, y, 0, x, y, r * 1.8);
      gr.addColorStop(0, `rgba(255,170,90,${0.25 + 0.3 * pulse})`); gr.addColorStop(1, 'rgba(255,120,60,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 1.8, 0, Math.PI * 2); g.fill();
      const rr = r * (1 + (rm ? 0.02 : 0.08) * pulse);
      g.fillStyle = '#7a1424'; g.beginPath(); g.ellipse(x, y + rr * 0.45, rr, rr * 0.55, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe9c4'; g.beginPath(); g.ellipse(x, y, rr, rr * 0.55, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#f2073b'; g.lineWidth = 4; g.beginPath(); g.ellipse(x, y, rr, rr * 0.55, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = `rgba(242,7,59,${0.15 + 0.25 * pulse})`; g.beginPath(); g.ellipse(x, y, rr * 0.45, rr * 0.25, 0, 0, Math.PI * 2); g.fill();
    };

    const lightNext = (fx, fy) => {
      const idx = lit++;
      const [lx, ly] = lanternPos(idx);
      streaks.push({ x0: fx, y0: fy, x1: lx, y1: ly + 6, t: 0, dur: rm ? 0.25 : 0.45, onArrive: () => {
        string.items[idx].lit = 1; string.items[idx].pop = 1;
        burst(lx, ly + 6, 8, 0.6);
        audio.fx?.('chime', { intensity: 0.55, pitch: 1 + idx * 0.07 });
      } });
      tempoEl.textContent = `Lanterns: ${lit} of ${LANTERNS}  ·  tempo: ${tempoWord(60000 / interval)}`;
      // Pipzi calms with the tempo
      const k = lit / LANTERNS;
      world.setEmotion({ excited: 1 - k * 0.6, happy: 0.2 + k * 0.5, calm: k * 0.4 }, startI - k * 0.2, { quiet: true, extra: { bounceRate: Math.max(0.9, 60000 / interval / 60) } });
      realm()?.setMood?.({ agitation: 0.75 - k * 0.4, warmth: 0.55 + k * 0.3, clarity: 0.2 + k * 0.3 });
      realm()?.transform?.(k * 0.25);
      if (lit === 2 && quips === 0) { quips++; say('YES! You’ve got it! Sparks for everyone!', 2400); }
      else if (lit === 4 && quips === 1) { quips++; say('Feel that? I’m slowing down… go with me…', 2800); }
      else if (lit === 6 && quips === 2) { quips++; say('Slower… steadier… still sparkly, though.', 2600); }
      if (lit >= LANTERNS) finish();
    };
    const tap = (x, y) => {
      if (done) return;
      const now = performance.now();
      const tol = Math.max(150, interval * 0.3);
      const d = drum();
      let best = null, bd = Infinity;
      for (const [bt, credited] of beats) if (!credited && Math.abs(now - bt) < bd) { bd = Math.abs(now - bt); best = bt; }
      if (Math.abs(now - nextBeat) < bd) { bd = Math.abs(now - nextBeat); best = nextBeat; }
      realm()?.pulse?.('tap', { x: x ?? d.x, y: y ?? d.y });
      tapTimes.push(now);
      while (tapTimes.length && now - tapTimes[0] > interval) tapTimes.shift();
      if (bd <= tol && tapTimes.length > 2) {
        // mashing: lovely enthusiasm, but it doesn't count
        mashes++;
        burst(d.x, d.y, 2, 0.4);
        if (mashes === 4) say('Ooh, SO many sparks! One tap per beat, though! Match my drum!', 2800);
      } else if (bd <= tol) {
        beats.set(best, true);
        hits++;
        haptic('pop');
        burst(d.x, d.y - d.r * 0.3, hits % HITS_PER ? 6 : 12);
        if (!rm && hits % 4 === 0) world.react('tap');
        if (hits % HITS_PER === 0) lightNext(d.x, d.y - d.r * 0.4);
        else audio.fx?.('star', { intensity: 0.35, pitch: 1.4 });
      } else {
        misses++;
        haptic('tick');
        burst(x ?? d.x, y ?? d.y, 3, 0.4);
        if (misses === 6 && hits < 2) say('Watch the ring! Tap when it hugs the drum!', 2600);
      }
    };
    const onCanvas = (e) => { if (e.isPrimary !== false) tap(e.clientX, e.clientY); };
    const onBtn = (e) => { e.preventDefault(); tap(); };
    const onKey = (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); tap(); } };
    canvas.addEventListener('pointerdown', onCanvas);
    tapBtn.addEventListener('pointerdown', onBtn);
    tapBtn.addEventListener('keydown', onKey);
    // kind fallback: after a while the drum lights whatever is left
    const fallback = later(() => {
      if (done) return;
      say('Close enough! That’s rhythm! Lanterns, LIGHT!', 2400);
      const d = drum();
      for (let i = lit; i < LANTERNS; i++) later(() => { if (lit < LANTERNS) lightNext(d.x, d.y); }, (i - lit) * 260);
    }, 70000);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(fallback);
      result.bpmEnd = Math.round(60000 / interval);
      canvas.removeEventListener('pointerdown', onCanvas);
      tapBtn.removeEventListener('pointerdown', onBtn);
      tapBtn.removeEventListener('keydown', onKey);
      world.fx.classList.remove('live');
      later(resolve, 900);
    }
    signal.addEventListener('abort', () => { done = true; resolve(); });
  });
  if (signal.aborted) return result;
  result.lanterns = LANTERNS;
  audio.fx?.('bloom', { intensity: 0.6 });
  haptic('success');
  world.setEmotion({ happy: 0.6, proud: 0.4 }, 0.75);
  world.react('celebrate');
  realm()?.pulse?.('success', { x: W / 2, y: string.y + 20 });
  await say('Eight lanterns! From zippy to mellow! You followed me all the way down!', 2800);
  if (signal.aborted) return result;

  // =============================================== 2. RIDE THE WAVE ==
  drawExtra = null;
  string.target = 0;
  setMove(1, { eyebrow: 'Move 2 of 4', title: 'Ride the wave', prompt: 'Press and hold to carry the spark up, over the crest and down.' });
  await wait(30);
  placeBelowTitle(0.42);
  world.setEmotion({ excited: 0.5, anxious: kind === 'fizz' ? 0.1 : 0.4, curious: 0.3 }, 0.7, { extra: { bounceRate: 1.4 } });
  say(WAVE_INTRO[kind], 3600);
  const rideBtn = h('button', { class: 'btn primary block', style: { touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' },
    'aria-label': 'Hold to ride the wave. Press Enter or Space to start or pause.' }, 'Hold to ride');
  const cue = h('p', { style: { textAlign: 'center', margin: '0', minHeight: '20px', color: 'var(--text-1)', font: '650 var(--type-label-size)/1.3 var(--ff-ui)', textShadow: '0 1px 8px rgba(10,4,20,.9)' }, 'aria-live': 'polite' }, 'Flat water… for now.');
  const toggleBtn = h('button', { class: 'btn ghost block' }, 'Can’t hold? Tap to ride / pause');
  dock.replaceChildren(cue, rideBtn, toggleBtn);
  world.fx.classList.add('live');

  await new Promise((resolve) => {
    let holding = false, toggled = false, p = 0, grow = 0, phase = 'flat', ended = false, nudged = false;
    humSound = audio.hold?.('hum', { intensity: 0 }) || null;
    const region = () => {
      const m = world.mallowRect(), top = Math.max(m.bottom + 34, titleBottom() + 40), bot = dockTop() - 26;
      return { top, bot, base: bot - 10, amp: Math.max(60, (bot - top) * 0.9) };
    };
    const SIG = 0.17;
    const shape = (u) => Math.exp(-((u - 0.5) ** 2) / (2 * SIG * SIG));
    const xOf = (u) => W * (0.06 + 0.88 * u);
    const setPhase = (ph) => {
      if (ph === phase) return;
      phase = ph;
      if (ph === 'rising') {
        cue.textContent = 'Rising… it’s getting bigger!';
        world.setEmotion({ excited: 0.6, anxious: kind === 'fizz' ? 0.1 : 0.35, determined: 0.3 }, 0.8, { quiet: true, extra: { bounceRate: 1.6 } });
      } else if (ph === 'crest') {
        cue.textContent = 'The crest! The biggest bit! Stay on!';
        say('THE CREST! Biggest bit! Stay on! You’re doing it!', 2600);
        world.setEmotion({ surprised: 0.5, awe: 0.5 }, 0.9, { quiet: true });
        if (!rm) world.react('gasp');
        audio.fx?.('bloom', { intensity: 0.45, pitch: 1.2 });
        haptic('heartbeat');
      } else if (ph === 'falling') {
        cue.textContent = 'Coming down… smoother now…';
        say('See? It’s rolling down already. Ooh, look at you go.', 2800);
        world.setEmotion({ relieved: 0.6, calm: 0.4 }, 0.7, { quiet: true, extra: { bounceRate: 1 } });
      }
    };
    let prevT = performance.now();
    drawExtra = (dt, now) => {
      const realDt = Math.min(0.25, Math.max(0, (now - prevT) / 1000)); prevT = now;   // real seconds, even on a slow frame rate
      const active = (holding || toggled) && !ended;
      if (active) { p = Math.min(1, p + realDt / RIDE_SEC); nudged = false; }
      grow = Math.min(1, grow + dt * 0.6);
      const { base, amp } = region();
      // the swell keeps its shape: it rises as you climb, then lies down after you pass
      const A = amp * grow * (p < 0.5 ? 0.55 + 0.45 * (p / 0.5) : 1 - 0.75 * ((p - 0.5) / 0.5) ** 1.3);
      const tt = now / 1000;
      const yAt = (u) => base - A * shape(u) - Math.sin(u * 18 + tt * (rm ? 0.6 : 1.8)) * 3 * (1 - p * 0.7);
      // water body
      g.beginPath(); g.moveTo(0, H);
      for (let i = 0; i <= 64; i++) { const u = i / 64; g.lineTo(xOf(u), yAt(u)); }
      g.lineTo(W, H); g.closePath();
      const wg = g.createLinearGradient(0, base - amp, 0, H);
      wg.addColorStop(0, 'rgba(255,140,170,.7)'); wg.addColorStop(0.45, 'rgba(150,30,110,.72)'); wg.addColorStop(1, 'rgba(40,8,50,.55)');
      g.fillStyle = wg; g.fill();
      g.strokeStyle = 'rgba(255,230,200,.85)'; g.lineWidth = 2.5;
      g.beginPath();
      for (let i = 0; i <= 64; i++) { const u = i / 64; i ? g.lineTo(xOf(u), yAt(u)) : g.moveTo(xOf(u), yAt(u)); }
      g.stroke();
      // trail behind the surfer
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        const u = p - i * 0.008; if (u < 0) break;
        g.fillStyle = `rgba(255,207,74,${0.35 * (1 - i / 14)})`;
        g.beginPath(); g.arc(xOf(u), yAt(u) - 6, 5 - i * 0.25, 0, Math.PI * 2); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      // labels
      g.font = FONT_13; g.textAlign = 'center'; g.fillStyle = 'rgba(255,240,225,.7)';
      g.fillText('rising', xOf(0.36), base - 16);
      g.fillText('crest', xOf(0.5), yAt(0.5) - 34);
      g.fillText('falling', xOf(0.64), base - 16);
      g.fillText('flat water', Math.min(W - 40, xOf(0.92)), yAt(0.92) - 22);
      // the surfer spark
      const sx = xOf(p), bob = active || rm ? 0 : Math.sin(tt * 4) * 3;
      const sy = yAt(p) - 12 + bob;
      const R = active ? 15 : 12;
      const sg = g.createRadialGradient(sx, sy, 0, sx, sy, R * 2.4);
      sg.addColorStop(0, 'rgba(255,250,220,1)'); sg.addColorStop(0.35, 'rgba(255,207,74,.9)'); sg.addColorStop(1, 'rgba(255,120,60,0)');
      g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, R * 2.4, 0, Math.PI * 2); g.fill();
      if (!active && !ended) {
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2;
        g.beginPath(); g.arc(sx, sy, R * 2 + (rm ? 0 : Math.sin(tt * 3) * 3), 0, Math.PI * 2); g.stroke();
      }
      if (active && !soft && Math.random() < dt * 20) sparks.push({ x: sx - 6, y: sy + 4, vx: -40 - Math.random() * 60, vy: -30 - Math.random() * 50, age: 0, life: 0.6, s: 2.2, c: COLS[(Math.random() * 3) | 0] });
      // height = how big the wave is under the spark
      const height = (base - yAt(p)) / amp;
      humSound?.update?.({ intensity: active ? 0.2 + height * 0.6 : 0.05, pitch: 0.8 + height * 0.4 });
      realm()?.setMood?.({ agitation: 0.25 + height * 0.6, clarity: 0.3 + p * 0.4 });
      realm()?.transform?.(0.25 + p * 0.25);
      if (p > 0.04 && p < 0.42) setPhase('rising');
      else if (p >= 0.42 && p < 0.58) setPhase('crest');
      else if (p >= 0.58 && p < 1) setPhase('falling');
      if (p >= 1 && !ended) end();
    };
    const on = (e) => { e.preventDefault(); holding = true; try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {} if (p === 0) haptic('soft'); };
    const off = () => {
      if (holding && p > 0.03 && p < 1 && !toggled && !nudged) { nudged = true; cue.textContent = 'Hop back on! Hold to keep riding.'; haptic('light'); }
      holding = false;
    };
    for (const el of [canvas, rideBtn]) {
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
    }
    rideBtn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); toggled = !toggled; } });
    toggleBtn.addEventListener('click', () => { toggled = !toggled; toggleBtn.textContent = toggled ? 'Pause' : 'Tap to keep riding'; });
    function end() {
      ended = true;
      holding = false; toggled = false;
      humSound?.stop(); humSound = null;
      result.rode = true;
      cue.textContent = 'Flat water. You rode the whole thing!';
      world.fx.classList.remove('live');
      for (const el of [canvas, rideBtn]) el.removeEventListener('pointerdown', on);
      later(resolve, 300);
    }
    signal.addEventListener('abort', () => { ended = true; resolve(); });
  });
  if (signal.aborted) return result;
  audio.fx?.('clear', { intensity: 0.5 });
  haptic('soft');
  world.setEmotion({ calm: 0.5, happy: 0.5 }, 0.7);
  world.react('success');
  realm()?.pulse?.('ripple', { x: W * 0.9, y: dockTop() - 40 });
  await say('Flat water! Up, over, down! Dramatic AND graceful!', 2600);
  if (signal.aborted) return result;

  // =============================================== 3. SPARK OR SHELF ==
  drawExtra = null;
  setMove(2, { eyebrow: 'Move 3 of 4', title: 'Spark or shelf?', prompt: 'Drag each spark: use it now, or save it for later.' });
  await wait(30);
  placeBelowTitle(0.4);
  world.setEmotion({ curious: 0.5, excited: 0.5 }, 0.65, { extra: { bounceRate: 1.4 } });
  say('Ooh, sorting! What’s all this lovely energy FOR?', 2600);
  const zoneStyle = (c) => ({ position: 'absolute', borderRadius: '22px', border: `2px dashed ${c}`, background: 'rgba(20,10,30,.55)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'flex-end', padding: '8px', pointerEvents: 'auto', color: 'var(--text-1)', font: '750 var(--type-label-size)/1.3 var(--ff-ui)', textAlign: 'center', boxSizing: 'border-box' });
  const shelfRow = h('div', { style: { display: 'flex', gap: '4px', minHeight: '26px', alignItems: 'flex-end', justifyContent: 'center', flexWrap: 'wrap', borderBottom: '3px solid rgba(255,200,140,.6)', width: '86%', paddingBottom: '2px', marginBottom: '6px' } });
  const nowZone = h('div', { style: zoneStyle('rgba(255,207,74,.75)'), 'aria-hidden': 'true' }, h('span', { style: { fontSize: 'calc(22px * var(--type-scale))', lineHeight: '1' } }, '↑'), h('span', {}, 'Use it now'));
  const laterZone = h('div', { style: zoneStyle('rgba(255,176,240,.7)'), 'aria-hidden': 'true' }, shelfRow, h('span', {}, 'Save for later'));
  const orb = h('span', { style: { width: '34px', height: '34px', borderRadius: '50%', flex: '0 0 auto', background: 'radial-gradient(circle at 40% 35%, #fffbe6, #ffcf4a 45%, #ff6a3a 80%)',
    boxShadow: rm ? '0 0 10px rgba(255,190,80,.6)' : '0 0 22px rgba(255,190,80,.85)' } });
  const sparkLabel = h('span', {});
  const sparkEl = h('button', { class: 'chip', style: { position: 'absolute', pointerEvents: 'auto', touchAction: 'none', minHeight: '56px', padding: '0 16px 0 10px', gap: '10px', fontSize: 'var(--type-row-size)',
    background: 'rgba(30,12,36,.85)', borderColor: 'rgba(255,207,74,.6)', transform: 'translate(-50%,-50%)', whiteSpace: 'nowrap', transition: 'opacity 250ms' } }, orb, sparkLabel);
  const countEl = h('p', { style: { textAlign: 'center', margin: '0', minHeight: '20px', color: 'var(--text-1)', font: '650 var(--type-label-size)/1.3 var(--ff-ui)', textShadow: '0 1px 8px rgba(10,4,20,.9)' }, 'aria-live': 'polite' });
  const nowBtn = h('button', { class: 'btn primary' }, 'Use it now');
  const laterBtn = h('button', { class: 'btn' }, 'Save for later');
  const skipBtn = h('button', { class: 'btn ghost block' }, 'Not this one');
  dock.replaceChildren(countEl, h('div', { class: 'row-btns' }, nowBtn, laterBtn), skipBtn);
  field.replaceChildren(nowZone, laterZone, sparkEl);
  let home = { x: 0, y: 0 };
  const layoutSort = () => {
    const m = world.mallowRect(), top = m.bottom + 8, bot = dockTop() - 12;
    const zh = Math.max(92, Math.min(140, (bot - top) * 0.42));
    const zw = Math.min(170, (W - 16 * 2 - 12) / 2);
    Object.assign(nowZone.style, { left: `${W / 2 - zw - 6}px`, top: `${bot - zh}px`, width: `${zw}px`, height: `${zh}px` });
    Object.assign(laterZone.style, { left: `${W / 2 + 6}px`, top: `${bot - zh}px`, width: `${zw}px`, height: `${zh}px` });
    home = { x: W / 2, y: top + Math.max(34, (bot - zh - top) / 2) };
    sparkEl.style.left = `${home.x}px`; sparkEl.style.top = `${home.y}px`;
  };
  resizers.push(layoutSort);
  await wait(60);
  layoutSort();

  await new Promise((resolve) => {
    let idx = 0, drag = null, busy = false;
    const show = () => {
      const u = USES[idx];
      sparkLabel.textContent = u.label;
      sparkEl.setAttribute('aria-label', `${u.label}. Drag left to use it now, right to save it for later, or use the buttons below.`);
      countEl.textContent = `Spark ${idx + 1} of ${USES.length}`;
      sparkEl.style.left = `${home.x}px`; sparkEl.style.top = `${home.y}px`;
      sparkEl.style.opacity = '1';
    };
    const sort = (where) => {
      if (busy || idx >= USES.length) return;
      busy = true;
      const u = USES[idx];
      const zr = (where === 'now' ? nowZone : laterZone).getBoundingClientRect();
      const cx = zr.left + zr.width / 2, cy = zr.top + zr.height / 2;
      sparkEl.style.opacity = '0';
      if (where === 'now') {
        result.now.push(u.id);
        fly(cx, cy, 15, 0, -90);
        burst(cx, cy, 10);
        realm()?.pulse?.('burst', { x: cx, y: cy });
        audio.fx?.('star', { intensity: 0.6, pitch: 1 + result.now.length * 0.1 });
        haptic('pop');
        if (!rm) world.react('tap');
      } else if (where === 'later') {
        result.later.push(u.id);
        shelfRow.append(h('span', { 'aria-hidden': 'true', style: { width: '14px', height: '18px', borderRadius: '45%', background: 'linear-gradient(#ff9bd6,#ff6fb8)', boxShadow: '0 0 8px rgba(255,150,220,.5)' } }));
        realm()?.pulse?.('tap', { x: cx, y: cy });
        audio.fx?.('drop-in', { intensity: 0.5 });
        haptic('soft');
        world.react('nod');
      } else {
        audio.fx?.('rotate-tick', { intensity: 0.4 });
        haptic('light');
      }
      if (where !== 'skip') say(u[where], 2200);
      idx++;
      later(() => { busy = false; if (idx >= USES.length) resolve(); else show(); }, 650);
    };
    sparkEl.addEventListener('pointerdown', (e) => {
      if (busy) return;
      drag = { dx: e.clientX - parseFloat(sparkEl.style.left), dy: e.clientY - parseFloat(sparkEl.style.top), x0: e.clientX, y0: e.clientY };
      try { sparkEl.setPointerCapture?.(e.pointerId); } catch {}
      sparkEl.style.transition = 'none';
      haptic('light');
    });
    sparkEl.addEventListener('pointermove', (e) => {
      if (!drag) return;
      sparkEl.style.left = `${e.clientX - drag.dx}px`; sparkEl.style.top = `${e.clientY - drag.dy}px`;
      if (!soft && Math.random() < 0.3) burst(e.clientX, e.clientY, 1, 0.3);
    });
    const drop = (e) => {
      if (!drag) return;
      sparkEl.style.transition = 'opacity 250ms, left 250ms, top 250ms';
      const inside = (el) => { const r = el.getBoundingClientRect(); return e.clientX >= r.left - 12 && e.clientX <= r.right + 12 && e.clientY >= r.top - 24 && e.clientY <= r.bottom + 12; };
      const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
      drag = null;
      if (inside(nowZone)) sort('now');
      else if (inside(laterZone)) sort('later');
      else { sparkEl.style.left = `${home.x}px`; sparkEl.style.top = `${home.y}px`; if (moved < 8) countEl.textContent = 'Drag me into a box, or use the buttons!'; }
    };
    sparkEl.addEventListener('pointerup', drop);
    sparkEl.addEventListener('pointercancel', drop);
    sparkEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); sort('now'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); sort('later'); }
    });
    nowBtn.onclick = () => sort('now');
    laterBtn.onclick = () => sort('later');
    skipBtn.onclick = () => sort('skip');
    show();
    signal.addEventListener('abort', resolve);
  });
  if (signal.aborted) return result;
  const nowLabels = result.now.map((id) => USES.find((u) => u.id === id).label.toLowerCase());
  await say(result.now.length ? `Using it now: ${listJoin(nowLabels)}! Spectacular!` : 'All on the shelf! Patience is VERY glamorous.', 2600);
  if (signal.aborted) return result;
  field.replaceChildren();
  realm()?.transform?.(0.7);

  // ===================================================== 4. LAUNCH! ==
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'Launch!', prompt: 'Pick one small next step for your lantern.' });
  await wait(30);
  placeBelowTitle(0.42);
  world.setEmotion({ determined: 0.5, excited: 0.5 }, 0.7, { extra: { bounceRate: 1.4 } });
  const pool = (result.now.length ? result.now : result.later.length ? result.later : USES.map((u) => u.id));
  const steps = pool.flatMap((id) => USES.find((u) => u.id === id).steps);
  const shown = steps.length > 6 ? pool.map((id) => USES.find((u) => u.id === id).steps[0]).slice(0, 6) : steps;
  const grid = h('div', { class: 'choice-grid' });
  dock.replaceChildren(grid);
  const picked = await new Promise((resolve) => {
    for (const [id, label] of shown) {
      grid.append(h('button', { class: 'choice', 'aria-pressed': 'false', onclick: (e) => {
        e.currentTarget.setAttribute('aria-pressed', 'true');
        audio.ui?.('select'); haptic('light');
        resolve([id, label]);
      } }, label));
    }
    signal.addEventListener('abort', () => resolve(null));
  });
  if (signal.aborted || !picked) return result;
  result.step = picked[0];
  result.stepLabel = picked[1];
  world.react('nod');
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'Fill it with warm air', prompt: 'Hold the lantern until it glows… then watch it fly!' });
  say('Ooh, a good one! Now fill it up, nice and slow!', 2400);
  const LSVG = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(LSVG, 'svg');
  svg.setAttribute('viewBox', '0 0 100 120');
  svg.setAttribute('width', '96'); svg.setAttribute('height', '116');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<defs><radialGradient id="stl-glow" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="#fff6d0"/><stop offset=".5" stop-color="#ffcf4a"/><stop offset="1" stop-color="#ff5a3a"/></radialGradient></defs>'
    + '<ellipse cx="50" cy="60" rx="46" ry="54" fill="rgba(255,190,80,.25)" class="halo"/>'
    + '<rect x="36" y="6" width="28" height="8" rx="3" fill="#5a1420"/>'
    + '<ellipse cx="50" cy="60" rx="34" ry="46" fill="#3a2032"/>'
    + '<ellipse cx="50" cy="60" rx="34" ry="46" fill="url(#stl-glow)" class="fill" opacity="0"/>'
    + '<ellipse cx="50" cy="60" rx="10" ry="46" fill="none" stroke="rgba(90,20,30,.5)"/>'
    + '<rect x="40" y="104" width="20" height="7" rx="3" fill="#5a1420"/>';
  const fillEl = svg.querySelector('.fill'), halo = svg.querySelector('.halo');
  const holdLabel = h('span', { style: { position: 'absolute', bottom: '-2px', font: '800 var(--type-caption-size)/1.3 var(--ff-ui)', letterSpacing: '.08em', textShadow: '0 1px 6px rgba(0,0,0,.6)' } }, 'HOLD');
  const lanternBtn = h('button', { class: 'hold-target', 'aria-label': `Lantern for: ${picked[1]}. Press and hold to fill it with warm air. Press Enter to start or pause.` }, svg, holdLabel);
  const stepCap = h('p', { style: { textAlign: 'center', margin: '0', font: '700 var(--type-row-size)/1.25 var(--ff-ui)' } }, `“${picked[1]}”`);
  const fillTap = h('button', { class: 'btn ghost block' }, 'Can’t hold? Tap to fill / pause');
  dock.replaceChildren(stepCap, lanternBtn, fillTap);

  await new Promise((resolve) => {
    let holding = false, toggled = false, fill = 0, prev = performance.now(), tick = 0, fin = false, lastTick = 0;
    const FILL = 2.6;
    humSound = audio.hold?.('drain', { intensity: 0 }) || null;
    const step = (now) => {
      const dt = Math.min(0.25, (now - prev) / 1000); prev = now;
      const active = holding || toggled;
      fill = Math.max(0, Math.min(1, fill + (active ? dt / FILL : -dt / 6)));
      fillEl.setAttribute('opacity', fill.toFixed(3));
      halo.setAttribute('fill', `rgba(255,190,80,${(0.2 + fill * 0.5).toFixed(3)})`);
      holdLabel.textContent = active ? `${Math.round(fill * 100)}%` : 'HOLD';
      humSound?.update?.({ intensity: active ? 0.2 + fill * 0.5 : 0, pitch: 0.9 + fill * 0.5 });
      if (active && now - lastTick > 420) { lastTick = now; haptic('tick'); }
      realm()?.setMood?.({ warmth: 0.6 + fill * 0.4, agitation: 0.2 });
      if (fill >= 1) { done(); return; }
      tick = requestAnimationFrame(step);
    };
    tick = requestAnimationFrame(step);
    lanternBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); holding = true; try { lanternBtn.setPointerCapture?.(e.pointerId); } catch {} });
    const off = () => { holding = false; };
    lanternBtn.addEventListener('pointerup', off);
    lanternBtn.addEventListener('pointercancel', off);
    lanternBtn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); toggled = !toggled; } });
    fillTap.addEventListener('click', () => { toggled = !toggled; fillTap.textContent = toggled ? 'Pause' : 'Tap to keep filling'; });
    function done() {
      if (fin) return; fin = true;
      cancelAnimationFrame(tick);
      humSound?.stop(); humSound = null;
      const r = lanternBtn.getBoundingClientRect();
      lanternBtn.style.visibility = 'hidden';
      fly(r.left + r.width / 2, r.top + r.height / 2, 30, 0, -110, W * 0.11);   // drifts past Pipzi, not through
      burst(r.left + r.width / 2, r.top + r.height * 0.8, 14, 0.8);
      audio.fx?.('bloom', { intensity: 0.8 });
      haptic('success');
      later(resolve, 1400);
    }
    signal.addEventListener('abort', () => { cancelAnimationFrame(tick); resolve(); });
  });
  if (signal.aborted) return result;

  // ======================================================= FINALE ==
  dock.replaceChildren();
  setMove(4, { eyebrow: 'The Spark Festival', title: 'Buzz → lantern', prompt: '' });
  world.place({ x: 50, y: 58, scale: 0.85 });
  realm()?.transform?.(1);
  realm()?.setMood?.({ agitation: 0.15, clarity: 0.9, warmth: 0.9, heaviness: 0 });
  realm()?.pulse?.('success', { x: W / 2, y: H * 0.45 });
  world.setEmotion({ happy: 0.5, proud: 0.3, excited: 0.2 }, 0.8, { extra: { bounceRate: 1.2 } });
  // the string's lanterns let go and rise; "now" lanterns join from below
  string.target = 0; string.alpha = 0;
  for (let i = 0; i < LANTERNS; i++) {
    const [x, y] = lanternPos(i);
    fly(x, y + 8, Math.min(15, W / 28), i % 2, -(36 + Math.random() * 30));
  }
  for (let i = 0; i < result.now.length + 2; i++) later(() => fly(W * (i % 2 ? 0.08 + Math.random() * 0.2 : 0.72 + Math.random() * 0.2), H + 30, 13 + Math.random() * 6, i % 2, -(60 + Math.random() * 30)), 300 + i * 380);
  // a soft firework bloom: slow fade in and out, no flashing
  const blooms = [];
  const addBloom = (x, y, hue) => blooms.push({ x, y, hue, t: 0 });
  drawExtra = (dt) => {
    for (const b of blooms) {
      b.t += dt / (rm ? 3.2 : 2.6);
      const t = Math.min(1, b.t);
      const env = Math.sin(Math.PI * t);                  // smooth 0 → 1 → 0
      const R = (rm ? 60 : 30 + 90 * (1 - (1 - t) ** 2)) * Math.min(1, W / 390);
      g.globalCompositeOperation = 'lighter';
      const n = soft ? 12 : 22;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const px = b.x + Math.cos(a) * R, py = b.y + Math.sin(a) * R + (rm ? 0 : t * 18);
        g.fillStyle = b.hue ? `rgba(255,176,240,${0.5 * env})` : `rgba(255,207,74,${0.5 * env})`;
        g.beginPath(); g.arc(px, py, 3, 0, Math.PI * 2); g.fill();
      }
      const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, R * 1.2);
      gr.addColorStop(0, `rgba(255,230,180,${0.16 * env})`); gr.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, R * 1.2, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    for (let i = blooms.length - 1; i >= 0; i--) if (blooms[i].t >= 1) blooms.splice(i, 1);
  };
  addBloom(W * 0.5, H * 0.24, 0);
  if (!ctx.lowStim) { later(() => addBloom(W * 0.26, H * 0.32, 1), 900); later(() => addBloom(W * 0.74, H * 0.3, 0), 1700); }
  audio.fx?.('clear', { intensity: 0.8 });
  haptic('success');
  if (!rm) world.react('celebrate');
  await say('KAPOW! Look at them GO! A whole sky of your sparks!', 2800);
  if (signal.aborted) return result;
  // the dramatic bow
  world.setEmotion({ proud: 0.6, happy: 0.4 }, 0.85, { extra: { squashBias: rm ? 0.08 : 0.22, tiltBias: -8, closedCurve: -1, eyeOpen: 0, mouthSmile: 1, blush: 2.2, bounce: 0 } });
  await say('*deep, deeply dramatic bow* Thank you! You’ve been a WONDERFUL audience!', 3000);
  if (signal.aborted) return result;
  world.setEmotion({ happy: 0.6, calm: 0.4 }, 0.7);
  await wait(400);
  if (signal.aborted) return result;
  cleanup();

  const laterLabels = result.later.map((id) => USES.find((u) => u.id === id).label);
  result.completed = true;
  result.summary = [
    { label: 'Beat caught', text: `${LANTERNS} lanterns lit, slowing from ${result.bpmStart} to about ${result.bpmEnd} beats a minute` },
    { label: 'Wave ridden', text: 'Up, over the crest and down to flat water' },
    result.now.length ? { label: 'Using it now', text: cap(listJoin(nowLabels)) } : null,
    laterLabels.length ? { label: 'Saved for later', text: cap(listJoin(laterLabels.map((s) => s.toLowerCase()))) } : null,
    { label: 'Lantern launched', text: result.stepLabel || '—' },
  ].filter(Boolean);
  result.share = { title: 'Spark to Lantern', subtitle: 'Pipzi helped me turn the buzz into a lantern.' };
  return result;
}

function listJoin(a) { return a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
