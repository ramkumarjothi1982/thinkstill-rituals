// MOONMILK WIND-DOWN — Noomi, The Dreamer.
// For exhaustion, burnout, end-of-day overwhelm, can't-switch-off evenings,
// night restlessness, and the flat, grey boredom/apathy family.
//
// 1. Snuff the lanterns — the day's open loops glow as lanterns on the shore;
//                         press and hold each to dim it for tonight.
// 2. Heavy and soft     — drag a moonbeam slowly down over Noomi (forehead to
//                         legs); each region softens and Noomi's eyes get
//                         heavier. Or let the beam guide itself.
// 3. Slow blinks        — blink along with Noomi; the count tides down and
//                         every blink is a little slower than the last.
// 4. Tiny rest          — pick one small, kind thing for rest.
// Finale: Noomi yawns and drifts off; the cove goes quiet.
//
// Rationale (plain): "parking" unfinished tasks, slow attention moving down
// the body, slowing the pace of what you do, and choosing one small restful
// action are common, widely taught wind-down approaches. Nothing here
// promises sleep — resting counts either way.

import { h, wait } from '../app/ui.js';
import { canvasFontPx } from '../ui/type.js';

const FONT_13 = canvasFontPx(13, 650);   // canvas labels: the voice face, at the 13px floor

export const meta = { id: 'moonmilk-wind-down' };

const LANTERNS = [
  ['emails', 'emails', 'Mmm. The emails can’t find us here.'],
  ['messages', 'messages', 'Messages are excellent at waiting. They’ll keep till morning.'],
  ['conversation', 'that conversation', 'That conversation can have the night off too.'],
  ['list', 'tomorrow’s list', 'Tomorrow’s list belongs to tomorrow. It’s in the name.'],
  ['chores', 'chores', 'Shh. The chores are asleep. Don’t wake them.'],
];
const OWN_LINES = ['Put down for tonight. It’ll still be there tomorrow.', 'There. Glowing quietly somewhere else now.'];
const REGIONS = [
  ['forehead', 'Forehead', 0.12, 'Forehead… unscrunch. Mine is extremely unscrunched.'],
  ['shoulders', 'Shoulders', 0.32, 'Shoulders down. I don’t have any, so I’m borrowing yours.'],
  ['chest', 'Chest', 0.5, 'Chest… nothing to hold up in there tonight.'],
  ['belly', 'Belly', 0.68, 'Belly soft. Mmm. Like warm dough.'],
  ['legs', 'Legs', 0.88, 'And legs. Heavy as sandbags. Very comfy sandbags.'],
];
const BLINKS = 5;
const CYCLE = [5.2, 5.8, 6.4, 7.0, 7.6, 8.0, 8.4]; // seconds per blink, gently slowing

function rests(day) {
  return [
    ['lights', 'Lights low, phone away', 'Face-down and out of reach. It’ll keep, promise.'],
    ['drink', 'A warm drink', 'Something warm and sleepy. Hold the mug with both hands.'],
    ['nothing', 'Five minutes of nothing', 'Officially scheduled nothing. Very important work.'],
    ['stretch', 'A slow stretch', 'Reach up… then let everything flop. Noomi recommends the flop.'],
    ['sound', 'A soft sound', 'Rain, waves, or something you’ve heard a hundred times. Nothing new.'],
    day
      ? ['outside', 'A short break outside', 'Five minutes of sky. No destination needed.']
      : ['lie', 'Just lie down', 'No pressure to sleep. Resting counts even if sleep doesn’t turn up.'],
  ];
}

export async function run(ctx) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const rm = !!ctx.reducedMotion, low = !!ctx.lowStim;
  const realm = () => world.realm;
  const say = (t, ms = 3000) => ctx.say(t, { who: 'Noomi', ms });
  const hour = new Date().getHours();
  const day = hour >= 7 && hour < 18;
  const result = { completed: false, dimmed: [], own: [], regions: [], blinks: 0, rest: null, guided: false };
  const startI = Math.min(0.85, Math.max(0.45, ctx.input?.intensity || 0.6));

  // --------------------------------------------------- shared canvas --
  const canvas = h('canvas', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', touchAction: 'none' } });
  world.fx.replaceChildren(canvas);
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    onResize?.();
  };
  let onResize = null;
  resize();
  addEventListener('resize', resize);

  // field for DOM pieces that sit above the Mallow (lanterns)
  const field = h('div', { style: { position: 'fixed', inset: '0', zIndex: '3', pointerEvents: 'none' } });
  field.append(h('style', {}, `
    .mm-lantern{position:absolute;width:76px;height:104px;transform:translate(-50%,0);border:0;background:none;padding:0;color:var(--text-1);
      display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer;
      transition:opacity 900ms ease, transform 900ms ease}
    .mm-lantern .bob{position:relative;width:60px;height:66px;display:grid;place-items:center}
    .mm-lantern .ring{position:absolute;inset:0;border-radius:50%;opacity:.9}
    .mm-lantern .hang{position:absolute;top:2px;left:50%;width:16px;height:9px;margin-left:-8px;border:2px solid rgba(220,210,255,.55);border-bottom:0;border-radius:10px 10px 0 0}
    .mm-lantern .glass{position:relative;margin-top:8px;width:34px;height:42px;border-radius:12px 12px 14px 14px;border:1.5px solid rgba(255,240,210,.55);
      background:radial-gradient(60% 55% at 50% 58%, rgba(255,226,160,calc(.95*var(--g))) 0%, rgba(255,190,110,calc(.35*var(--g))) 60%, rgba(60,70,130,.55) 100%);
      box-shadow:0 0 calc(30px*var(--g)) calc(6px*var(--g)) rgba(255,205,130,calc(.45*var(--g)));transition:box-shadow 300ms}
    .mm-lantern .flame{position:absolute;left:50%;top:50%;width:9px;height:14px;margin:-6px 0 0 -4.5px;border-radius:50% 50% 45% 45%;
      background:#fff3cf;opacity:var(--g);transform:scale(calc(.5 + .5*var(--g)))}
    .mm-lantern .lab{font:650 var(--type-caption-size)/1.15 var(--ff-ui);text-align:center;max-width:84px;text-shadow:0 1px 8px rgba(5,3,20,.9);color:var(--text-2)}
    .mm-lantern .lab small{display:block;font:600 var(--type-caption-size)/1.15 var(--ff-ui);color:var(--text-3);margin-top:2px}
    .mm-lantern.out .glass{border-color:rgba(180,190,230,.25)}
    .mm-lantern.out .lab{color:var(--text-3)}
    .mm-own .glass{background:rgba(40,40,90,.35);border-style:dashed;box-shadow:none;display:grid;place-items:center}
    .mm-own .plus{font:700 20px/1 var(--ff-voice);color:var(--text-2)}
    .mm-tight .mm-lantern .lab small{display:none}
    @keyframes mmFlicker{0%,100%{transform:scale(calc(.5 + .5*var(--g))) translateY(0)}50%{transform:scale(calc(.46 + .5*var(--g))) translateY(1px)}}
    .mm-flick .mm-lantern .flame{animation:mmFlicker 2.6s ease-in-out infinite}
  `));
  if (!rm && !low) field.classList.add('mm-flick');
  document.body.append(field);

  // drifting moonmilk motes, plus per-move drawing
  const motes = Array.from({ length: low ? 8 : 18 }, () => ({ x: Math.random(), y: Math.random() * 0.8, r: 1 + Math.random() * 2.2, ph: Math.random() * 6, v: 0.004 + Math.random() * 0.008 }));
  let veil = 0, veilTarget = 0;
  let drawExtra = null;
  let raf = 0, last = performance.now();
  const loop = (t) => {
    const dt = Math.min(0.2, (t - last) / 1000); last = t;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    veil += (veilTarget - veil) * Math.min(1, dt * 0.6);
    if (veil > 0.002) { g.fillStyle = `rgba(6,8,30,${veil})`; g.fillRect(0, 0, W, H); }
    for (const m of motes) {
      if (!rm) { m.ph += dt * 0.4; m.y -= m.v * dt; if (m.y < -0.02) { m.y = 0.85; m.x = Math.random(); } }
      const a = 0.18 + 0.14 * Math.sin(m.ph);
      g.fillStyle = `rgba(255,244,210,${a})`;
      g.beginPath(); g.arc(m.x * W + (rm ? 0 : Math.sin(m.ph) * 6), m.y * H, m.r, 0, Math.PI * 2); g.fill();
    }
    drawExtra?.(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  let humSound = null;
  const cleanup = () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    onResize = null;
    world.fx.classList.remove('live');
    world.fx.replaceChildren();
    field.remove();
    try { humSound?.stop(); } catch (e) { /* ignore */ } humSound = null;
  };
  signal.addEventListener('abort', cleanup);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const titleBottom = () => document.querySelector('.ritual-ui .move-title')?.getBoundingClientRect().bottom || 150;
  const dockTop = () => { const r = dock.getBoundingClientRect(); return r.height ? r.top : H - 140; };
  // place Noomi so her body (not her canvas box) is centred at cy and about bodyH tall
  const placeBody = (cy, bodyH) => {
    const LH = Math.min(H * 0.56, 470), LW = Math.min(W * 0.86, 430);
    let s = bodyH / (0.66 * LH);
    s = clamp(Math.min(s, (W * 0.92) / (0.7 * LW)), 0.28, 1.05);
    world.place({ x: 50, y: ((cy - 0.05 * LH * s) / H) * 100, scale: s, calm: true });
    return s;
  };
  // sleepy face helper: eyes half-lidded, heavier as `heavy` rises 0..1
  const sleepyFace = (heavy, mix = { exhausted: 0.55, calm: 0.45 }, extra = {}) => {
    world.setEmotion(mix, startI, { quiet: true, extra: { eyeOpen: clamp(0.5 - heavy * 0.48, 0, 1), lidTop: 0.2 + heavy * 0.4, lookY: 0.3, mouthSmile: 0.05 + heavy * 0.3, mouthWidth: 0.85, mouthRound: heavy > 0.5 ? 0.3 : 0, mouthOpen: heavy > 0.5 ? 0.06 : 0, yawnCycle: 0, fxZzz: heavy > 0.8 ? 0.3 : 0, ...extra } });
  };
  const ok = () => !signal.aborted;
  // reactions also trigger Mallow voice sounds; a sound-engine hiccup must never stop the ritual
  const sfx = (name, o) => { try { audio.fx?.(name, o); } catch (e) { console.warn('sound failed', e); } };
  const sui = (name) => { try { audio.ui?.(name); } catch (e) { console.warn('sound failed', e); } };
  const react = (kind) => { try { world.react(kind); } catch (e) { console.warn('Noomi reaction sound failed', e); } };

  // ============================================ 1. SNUFF THE LANTERNS ==
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'Snuff the lanterns', prompt: 'Press and hold a lantern to dim it for tonight.' });
  sleepyFace(0, { exhausted: 0.7, bored: 0.3 });
  realm()?.setMood?.({ agitation: 0.35, heaviness: 0.6, clarity: 0.2, warmth: 0.25 });
  realm()?.transform?.(0);
  const lanterns = LANTERNS.map(([id, label, line]) => ({ id, label, line, own: false, prog: 0, out: false, auto: false, el: null }));
  const dimBtn = h('button', { class: 'btn', 'aria-label': 'Dim the next lantern for me', style: { padding: '0 12px', fontSize: 'var(--type-control-size)' } }, 'Dim one for me');
  const doneBtn = h('button', { class: 'btn primary', disabled: true, style: { padding: '0 12px', fontSize: 'var(--type-control-size)' } }, 'Enough for tonight');
  const mainRow = h('div', { class: 'row-btns' }, dimBtn, doneBtn);
  dock.replaceChildren(mainRow);
  // an unlit lantern at the end of the shore: tap it to name your own loose end
  const ownBtn = h('button', { class: 'mm-lantern mm-own', 'aria-label': 'Add a lantern in your own words', style: { opacity: '0' } },
    h('span', { class: 'bob' }, h('span', { class: 'hang' }), h('span', { class: 'glass' }, h('span', { class: 'plus', 'aria-hidden': 'true' }, '+'))),
    h('span', { class: 'lab' }, 'your own'));

  const makeLantern = (L) => {
    const ring = h('span', { class: 'ring' });
    const sub = h('small', {}, '');
    const el = h('button', { class: 'mm-lantern', 'aria-label': `${L.label}. Press and hold, or press Enter, to dim it for tonight.`, style: { '--g': '1', opacity: '0' } },
      h('span', { class: 'bob' }, ring, h('span', { class: 'hang' }), h('span', { class: 'glass' }, h('span', { class: 'flame' }))),
      h('span', { class: 'lab' }, L.label, sub));
    L.el = el; L.ring = ring; L.sub = sub;
    const on = (e) => { if (L.out) return; e.preventDefault(); L.holding = true; el.setPointerCapture?.(e.pointerId); };
    const off = () => { L.holding = false; };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('lostpointercapture', off);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !L.out) { e.preventDefault(); L.auto = true; } });
    field.append(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    return el;
  };
  lanterns.forEach(makeLantern);
  field.append(ownBtn);
  requestAnimationFrame(() => { ownBtn.style.opacity = '1'; });

  const layoutLanterns = () => {
    const top = titleBottom() + 8, bottom = dockTop() - 6;
    const slots = ownBtn.isConnected && !ownBtn.disabled ? [...lanterns.map((L) => L.el), ownBtn] : lanterns.map((L) => L.el);
    const n = slots.length;
    const maxRow = W < 360 ? 4 : 5;
    const rows = Math.ceil(n / maxRow);
    const perRow = Math.ceil(n / rows);
    const tight = H < 700;
    field.classList.toggle('mm-tight', tight);
    const rowH = tight ? 98 : 112;
    const shoreTop = bottom - rows * rowH;
    slots.forEach((el, i) => {
      const r = Math.floor(i / perRow), c = i % perRow;
      const inRow = Math.min(perRow, n - r * perRow);
      const span = Math.min(W - 16, inRow * 84);
      const x = W / 2 - span / 2 + (span / inRow) * (c + 0.5);
      // a gentle shoreline curve: the middle sits a touch lower
      const k = inRow > 1 ? (c / (inRow - 1)) * 2 - 1 : 0;
      const y = shoreTop + r * rowH + (1 - k * k) * 8 - 8;
      el.style.left = `${x}px`; el.style.top = `${y}px`;
    });
    // Noomi sits above the shore, a little behind the back row
    const avail = shoreTop - top;
    const bodyH = clamp(avail + 24, 90, 300);
    placeBody(top + avail / 2 + 10, bodyH);
  };
  await wait(30);
  layoutLanterns();
  onResize = layoutLanterns;
  say('Mmh… hello. Those are the day’s loose ends. Let’s put them down, one glow at a time.', 3600);

  try { humSound = audio.hold?.('hum', { intensity: 0 }) || null; } catch (e) { humSound = null; }
  let dimmedCount = 0, hinted = false;
  await new Promise((resolve) => {
    let prev = performance.now(), tick = 0;
    const step = (now) => {
      const dt = Math.min(0.2, (now - prev) / 1000); prev = now;
      let anyHold = false;
      for (const L of lanterns) {
        if (L.out) continue;
        if (L.holding || L.auto) { L.prog = Math.min(1, L.prog + dt / (L.auto ? 1.8 : 1.5)); anyHold = true; }
        else if (L.prog > 0) {
          if (L.prog > 0.02 && L.prog < 0.3 && !hinted) { hinted = true; say('Slowly… keep holding. No rush at all.', 2200); }
          L.prog = Math.max(0, L.prog - dt / 2.4);
        }
        const gl = 1 - L.prog * 0.85;
        L.el.style.setProperty('--g', gl.toFixed(3));
        L.ring.style.background = L.prog > 0 ? `conic-gradient(rgba(200,210,255,.75) ${L.prog}turn, rgba(255,255,255,.08) 0)` : 'none';
        L.ring.style.webkitMask = L.ring.style.mask = 'radial-gradient(circle, transparent 62%, #000 64%, #000 70%, transparent 72%)';
        if (L.prog >= 1) dimLantern(L);
      }
      try { humSound?.update?.({ intensity: anyHold ? 0.22 : 0 }); } catch (e) { humSound = null; }
      tick = requestAnimationFrame(step);
    };
    tick = requestAnimationFrame(step);

    function dimLantern(L) {
      L.out = true; L.holding = false; L.auto = false;
      L.el.classList.add('out');
      L.el.style.setProperty('--g', '0');
      L.ring.style.background = 'none';
      L.sub.textContent = 'for tomorrow';
      L.el.setAttribute('aria-label', `${L.label}: put down for tonight.`);
      L.el.setAttribute('aria-disabled', 'true');
      if (!rm) L.el.style.transform = 'translate(-50%, 6px)';
      result.dimmed.push(L.label);
      dimmedCount++;
      const r = L.el.getBoundingClientRect();
      if (!low) realm()?.pulse?.('ripple', { x: r.left + r.width / 2, y: r.top + 30 });
      sfx('breathe-out', { intensity: 0.28, duration: 1.4 });
      sfx('chime', { intensity: 0.18, pitch: 0.7 - dimmedCount * 0.03 });
      haptic('soft');
      const left = lanterns.filter((x) => !x.out).length;
      const heavy = dimmedCount / Math.max(lanterns.length, 1);
      sleepyFace(heavy * 0.35, { exhausted: 0.5 - heavy * 0.2, calm: 0.5 + heavy * 0.2 });
      realm()?.setMood?.({ agitation: Math.max(0.05, 0.35 - heavy * 0.3), heaviness: 0.6 - heavy * 0.2, warmth: 0.25 + heavy * 0.2 });
      realm()?.transform?.(heavy * 0.25);
      react('nod');
      say(L.own ? OWN_LINES[result.own.indexOf(L.label) % OWN_LINES.length] : L.line, 2600);
      doneBtn.disabled = false;
      if (!left) setTimeout(finish, 1800);
    }
    dimBtn.onclick = () => { const L = lanterns.find((x) => !x.out && !x.auto); if (L) { L.auto = true; result.guided = true; } };
    ownBtn.onclick = () => {
      const inp = h('input', { class: 'text', type: 'text', maxlength: '24', placeholder: 'e.g. that form', 'aria-label': 'Name a loose end, a few words' });
      const add = h('button', { class: 'btn primary', style: { flex: '0 0 auto', padding: '0 16px' } }, 'Light it');
      const back = h('button', { class: 'btn ghost', 'aria-label': 'Cancel', style: { flex: '0 0 auto', padding: '0', width: '44px' } }, '✕');
      const row = h('div', { class: 'row-btns', style: { alignItems: 'center' } }, inp, add, back);
      inp.style.flex = '1'; inp.style.minWidth = '0';
      const restore = () => { dock.replaceChildren(mainRow); layoutLanterns(); };
      const commit = () => {
        const t = inp.value.replace(/\s+/g, ' ').trim().slice(0, 24);
        if (!t) { restore(); return; }
        const L = { id: `own-${result.own.length}`, label: t, line: '', own: true, prog: 0, out: false, auto: false, el: null };
        result.own.push(t);
        lanterns.push(L);
        makeLantern(L);
        sui('select');
        if (result.own.length >= 2) { ownBtn.disabled = true; ownBtn.remove(); }
        restore();
        say('Ooh, that one’s been glowing all day, hasn’t it.', 2400);
      };
      add.onclick = commit;
      back.onclick = restore;
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') restore(); });
      dock.replaceChildren(row);
      layoutLanterns();
      inp.focus();
    };
    doneBtn.onclick = finish;
    let finished = false;
    function finish() {
      if (finished) return; finished = true;
      cancelAnimationFrame(tick);
      try { humSound?.update?.({ intensity: 0 }); } catch (e) { /* ignore */ }
      resolve();
    }
    signal.addEventListener('abort', finish);
  });
  try { humSound?.stop(); } catch (e) { /* ignore */ } humSound = null;
  if (!ok()) return result;
  onResize = null;
  lanterns.forEach((L) => { L.el.style.opacity = L.out ? '0' : '0.35'; L.el.style.pointerEvents = 'none'; });
  ownBtn.style.opacity = '0'; ownBtn.style.pointerEvents = 'none';
  await say(lanterns.every((L) => L.out) ? 'All dimmed. The shore’s gone lovely and dark.' : 'Good enough. The rest can flicker without us.', 2600);
  if (!ok()) return result;
  field.querySelectorAll('.mm-lantern').forEach((el) => el.remove());
  field.classList.remove('mm-tight');

  // ============================================== 2. HEAVY AND SOFT ==
  setMove(1, { eyebrow: 'Move 2 of 4', title: 'Heavy and soft', prompt: 'Drag the moonbeam slowly down over me. Let each bit go heavy as it passes.' });
  const cue = h('p', { class: 'muted', 'aria-live': 'polite', style: { textAlign: 'center', margin: '0', minHeight: '22px', color: 'var(--text-1)', textShadow: '0 1px 10px rgba(5,3,20,.95), 0 0 2px rgba(5,3,20,.8)' } }, 'Start at the top. Slower is better.');
  const autoBtn = h('button', { class: 'btn block', 'aria-label': 'Guide the moonbeam for me, slowly' }, 'Guide me slowly');
  dock.replaceChildren(cue, autoBtn);
  await wait(30);
  const placeSweep = () => {
    const top = titleBottom() + 16, bottom = dockTop() - 16;
    placeBody((top + bottom) / 2, clamp(bottom - top - 20, 120, 360));
  };
  placeSweep();
  onResize = placeSweep;
  realm()?.setMood?.({ agitation: 0.08, heaviness: 0.45, warmth: 0.4, clarity: 0.3 });
  await wait(800);
  if (!ok()) return result;

  await new Promise((resolve) => {
    let body = world.mallowRect();
    let beamY = body.top - 10, goal = beamY, dragging = false, auto = false, pauseT = 0, reached = 0, tooFast = 0, done = false;
    const SPEED = rm ? 70 : 52; // px per second, the beam never rushes
    world.fx.classList.add('live');
    const down = (e) => { dragging = true; canvas.setPointerCapture?.(e.pointerId); goal = Math.max(goal, e.clientY); };
    const move = (e) => { if (!dragging) return; goal = Math.max(goal, Math.min(e.clientY, body.bottom + 30)); };
    const up = () => { dragging = false; };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    autoBtn.onclick = () => {
      auto = !auto; result.guided = result.guided || auto;
      autoBtn.textContent = auto ? 'Pause the beam' : 'Guide me slowly';
      sui('toggle');
    };
    drawExtra = (dt) => {
      body = world.mallowRect();
      if (auto && !done) {
        if (pauseT > 0) pauseT -= dt;
        else goal = Math.max(goal, beamY + SPEED * 0.75 * dt + 0.01);
      }
      const lagging = goal - beamY > 70;
      beamY = Math.min(goal, beamY + SPEED * dt);
      if (dragging && lagging) { tooFast += dt; if (tooFast > 1.2) { tooFast = -4; cue.textContent = 'Slower… the moonlight’s still catching up.'; } }
      const frac = (beamY - body.top) / body.height;
      while (reached < REGIONS.length && frac >= REGIONS[reached][2]) reachRegion(reached++);
      if (reached >= REGIONS.length && frac >= 1.02 && !done) { done = true; setTimeout(finish, 1400); }
      // softened wash over everything the beam has passed
      const bw = body.width * 0.62, bx = body.cx - bw / 2;
      if (beamY > body.top) {
        const wash = g.createLinearGradient(0, body.top, 0, beamY);
        wash.addColorStop(0, 'rgba(170,160,255,0.02)'); wash.addColorStop(1, 'rgba(190,200,255,0.16)');
        g.fillStyle = wash;
        g.beginPath(); g.ellipse(body.cx, (body.top + Math.min(beamY, body.bottom)) / 2, bw / 2, Math.max(1, (Math.min(beamY, body.bottom) - body.top) / 2), 0, 0, Math.PI * 2); g.fill();
      }
      // the moonbeam: a soft horizontal band of light with a little moon handle
      const y = beamY;
      const band = g.createRadialGradient(body.cx, y, 0, body.cx, y, bw * 0.75);
      band.addColorStop(0, 'rgba(235,240,255,0.55)'); band.addColorStop(0.6, 'rgba(190,200,255,0.2)'); band.addColorStop(1, 'rgba(190,200,255,0)');
      g.save(); g.translate(body.cx, y); g.scale(1, 0.16); g.translate(-body.cx, -y);
      g.fillStyle = band; g.beginPath(); g.arc(body.cx, y, bw * 0.75, 0, Math.PI * 2); g.fill();
      g.restore();
      const hx = Math.min(W - 26, body.cx + bw * 0.62);
      const moon = g.createRadialGradient(hx, y, 0, hx, y, 20);
      moon.addColorStop(0, 'rgba(255,248,225,0.95)'); moon.addColorStop(0.55, 'rgba(255,240,200,0.5)'); moon.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = moon; g.beginPath(); g.arc(hx, y, 20, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,250,235,0.95)'; g.beginPath(); g.arc(hx, y, 8, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(40,40,90,0.55)'; g.beginPath(); g.arc(hx + 3.5, y - 2, 6.5, 0, Math.PI * 2); g.fill();
      if (reached === 0 && !dragging && !auto) {
        g.font = FONT_13; g.textAlign = 'center';
        g.fillStyle = 'rgba(230,230,255,0.7)'; g.fillText('drag down, slowly', body.cx, y - 14);
      }
      // softened region labels on the left
      g.font = FONT_13; g.textBaseline = 'middle';
      for (let i = 0; i < reached; i++) {
        const ry = body.top + body.height * REGIONS[i][2];
        const txt = `${REGIONS[i][1].toLowerCase()} · soft`;
        const tw = g.measureText(txt).width;
        // sit just left of Noomi when there's room, otherwise tuck inside her edge
        const lx = Math.max(10, Math.min(bx - 8 - tw, W - tw - 10));
        g.textAlign = 'left';
        g.fillStyle = 'rgba(5,4,24,0.35)'; g.fillText(txt, lx + 1, ry + 1);
        g.fillStyle = 'rgba(225,228,255,0.75)'; g.fillText(txt, lx, ry);
      }
      g.textBaseline = 'alphabetic';
    };
    function reachRegion(i) {
      const [id, label, , line] = REGIONS[i];
      result.regions.push(id);
      const heavy = 0.35 + ((i + 1) / REGIONS.length) * 0.5;
      sleepyFace(heavy, { calm: 0.6, exhausted: 0.4 }, { droop: 0.2 + i * 0.12, squashBias: 0.02 + i * 0.015, breathRate: 0.12 - i * 0.008 });
      realm()?.transform?.(0.25 + ((i + 1) / REGIONS.length) * 0.25);
      realm()?.setMood?.({ heaviness: 0.45 - i * 0.06, warmth: 0.4 + i * 0.05 });
      if (!low) realm()?.pulse?.('tap', { x: body.cx, y: body.top + body.height * REGIONS[i][2] });
      sfx('breathe-out', { intensity: 0.22, duration: 2.2 });
      haptic('soft');
      cue.textContent = `${label}… heavy and soft.`;
      say(line, 2600);
      if (auto) pauseT = rm ? 1.6 : 2.4;
    }
    let finished = false;
    function finish() {
      if (finished) return; finished = true;
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      world.fx.classList.remove('live');
      drawExtra = null;
      resolve();
    }
    signal.addEventListener('abort', finish);
  });
  if (!ok()) return result;
  react('sigh');
  await say('Mmm. I’ve gone all heavy. Like a beanbag that’s given up.', 2800);
  if (!ok()) return result;

  // ================================================== 3. SLOW BLINKS ==
  setMove(2, { eyebrow: 'Move 3 of 4', title: 'Slow blinks', prompt: 'Tap as my eyes close. Each blink a little slower than the last.' });
  const blinkCanvas = h('canvas', { width: 264, height: 264, 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%' } });
  const countEl = h('span', { style: { position: 'relative', transform: 'translateY(-14px)', font: '700 calc(28px * var(--type-scale))/1.2 var(--ff-voice)', textShadow: '0 1px 8px rgba(0,0,0,.5)' } }, String(BLINKS));
  const blinkBtn = h('button', { class: 'hold-target', style: { width: '120px', height: '120px' }, 'aria-label': `Blink with Noomi. Press as Noomi’s eyes close. ${BLINKS} blinks to go.` }, blinkCanvas, countEl);
  const bcue = h('p', { class: 'muted', 'aria-live': 'polite', style: { textAlign: 'center', margin: '4px 0 0', minHeight: '20px', color: 'var(--text-1)', textShadow: '0 1px 10px rgba(5,3,20,.95), 0 0 2px rgba(5,3,20,.8)' } }, 'Watch my eyes…');
  const watchBtn = h('button', { class: 'btn block' }, 'Just watch Noomi');
  dock.replaceChildren(blinkBtn, bcue, watchBtn);
  await wait(30);
  const placeBlink = () => {
    const top = titleBottom() + 12, bottom = dockTop() - 12;
    placeBody((top + bottom) / 2 + 10, clamp(bottom - top - 30, 110, 330));
  };
  placeBlink();
  onResize = placeBlink;
  realm()?.setMood?.({ agitation: 0.03, heaviness: 0.3, warmth: 0.5, clarity: 0.4 });
  // take over Noomi's lids for this move
  world.setEmotion({ calm: 0.7, comforted: 0.3 }, startI, { quiet: true, extra: { blinkRate: 0, eyeOpen: 0.42, lidTop: 0.3, lookY: 0.3, mouthSmile: 0.25, mouthWidth: 0.8, mouthRound: 0.35, mouthOpen: 0.08, yawnCycle: 0, fxZzz: 0 } });
  const bc = blinkCanvas.getContext('2d');

  await new Promise((resolve) => {
    let left = BLINKS, ci = 0, t = 0, matched = false, missed = 0, watching = false, flash = 0, prev = performance.now(), tick = 0, said3 = false;
    const lids = (ph) => ph < 0.4 ? 1 : ph < 0.65 ? 1 - (ph - 0.4) / 0.25 : ph < 0.82 ? 0 : (ph - 0.82) / 0.18;
    const inWindow = (ph) => ph > 0.5 && ph < 0.9;
    const count = () => {
      matched = true; left--; result.blinks++;
      flash = 1;
      countEl.textContent = left > 0 ? String(left) : '·';
      blinkBtn.setAttribute('aria-label', left > 0 ? `Blink with Noomi. ${left} to go.` : 'All blinks done.');
      const m = world.mallowRect();
      if (!low) realm()?.pulse?.('ripple', { x: m.cx, y: m.top + m.height * 0.45 });
      sfx('chime', { intensity: 0.16, pitch: 0.62 - result.blinks * 0.04 });
      haptic('soft');
      bcue.textContent = left > 0 ? ['Mm.', 'Slower…', 'Mmmm.', 'Nearly floppy.'][result.blinks - 1] || 'Mm.' : 'Lovely.';
      realm()?.transform?.(0.5 + (result.blinks / BLINKS) * 0.25);
      if (!said3 && result.blinks === 3) { said3 = true; say('Slower still. Like a cat on a warm windowsill.', 2600); }
    };
    const step = (now) => {
      const dt = Math.min(0.2, (now - prev) / 1000); prev = now;
      const dur = CYCLE[Math.min(ci, CYCLE.length - 1)];
      t += dt;
      let ph = t / dur;
      if (ph >= 1) {
        if (!matched) { missed++; if (missed === 2 && !watching) bcue.textContent = 'No rush. Tap when my eyes close — or just watch.'; }
        if (left <= 0) { finish(); return; }
        t = 0; ph = 0; matched = false; if (result.blinks > ci) ci = result.blinks;
      }
      if (watching && !matched && ph > 0.66 && left > 0) count();
      const e = lids(ph);
      const maxOpen = 0.42 - result.blinks * 0.05;
      if (world.rig) { world.rig.target.eyeOpen = Math.max(0, maxOpen * e); world.rig.target.blinkRate = 0; }
      // the button shows a sleepy eye that closes with Noomi's
      bc.clearRect(0, 0, 264, 264);
      flash = Math.max(0, flash - dt * 0.8);
      const gl = bc.createRadialGradient(132, 132, 10, 132, 132, 120);
      gl.addColorStop(0, `rgba(200,205,255,${0.22 + flash * 0.3})`); gl.addColorStop(1, 'rgba(200,205,255,0)');
      bc.fillStyle = gl; bc.beginPath(); bc.arc(132, 132, 120, 0, Math.PI * 2); bc.fill();
      bc.strokeStyle = inWindow(ph) && !matched ? 'rgba(255,240,200,0.9)' : 'rgba(220,220,255,0.45)';
      bc.lineWidth = 6; bc.lineCap = 'round';
      bc.beginPath(); bc.arc(132, 132, 100, 0, Math.PI * 2); bc.stroke();
      // lid arc: an almond whose top lid lowers
      bc.strokeStyle = 'rgba(255,248,230,0.85)'; bc.lineWidth = 7;
      bc.beginPath(); bc.moveTo(86, 182); bc.quadraticCurveTo(132, 182 + 22, 178, 182); bc.stroke();
      bc.beginPath(); bc.moveTo(86, 182); bc.quadraticCurveTo(132, 182 - 30 * e + 20 * (1 - e), 178, 182); bc.stroke();
      tick = requestAnimationFrame(step);
    };
    tick = requestAnimationFrame(step);
    const tap = () => {
      if (left <= 0) return;
      const ph = t / CYCLE[Math.min(ci, CYCLE.length - 1)];
      if (!matched && inWindow(ph)) count();
      else if (!matched) { bcue.textContent = 'Mm, wait for my eyes to close…'; haptic('light'); }
    };
    blinkBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(); });
    blinkBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
    watchBtn.onclick = () => {
      watching = !watching;
      result.guided = result.guided || watching;
      watchBtn.textContent = watching ? 'Blink along myself' : 'Just watch Noomi';
      bcue.textContent = watching ? 'Just watch. Let your eyes do what mine do.' : 'Tap as my eyes close.';
    };
    let finished = false;
    function finish() {
      if (finished) return; finished = true;
      cancelAnimationFrame(tick);
      resolve();
    }
    signal.addEventListener('abort', finish);
  });
  if (!ok()) return result;
  sleepyFace(0.9, { calm: 0.6, exhausted: 0.4 });
  await say('Five slow blinks. That’s practically a nap, scientifically.', 2600);
  if (!ok()) return result;

  // ===================================================== 4. TINY REST ==
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'One tiny rest', prompt: day ? 'One small, kind thing for the next bit.' : 'One small, kind thing for tonight. Sleep or no sleep.' });
  sleepyFace(0.7, { comforted: 0.6, calm: 0.4 });
  const REST = rests(day);
  const grid = h('div', { class: 'choice-grid', role: 'group', 'aria-label': 'Tiny rests' });
  const note = h('p', { class: 'muted', 'aria-live': 'polite', style: { margin: '8px 2px 0', minHeight: '20px', textAlign: 'center', fontSize: 'var(--type-label-size)', color: 'var(--text-1)', textShadow: '0 1px 10px rgba(5,3,20,.95)' } }, '');
  const finishBtn = h('button', { class: 'btn primary block', disabled: true, style: { marginTop: '8px' } }, day ? 'Thanks, Noomi' : 'Goodnight, Noomi');
  for (const [id, label, line] of REST) {
    const tight = H < 700;
    const b = h('button', { class: 'choice', 'aria-pressed': 'false', style: { minHeight: tight ? '46px' : '54px', fontSize: tight ? 'var(--type-label-size)' : 'var(--type-control-size)', padding: tight ? '7px 12px' : '10px 14px' } }, label);
    b.onclick = () => {
      grid.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      const first = !result.rest;
      result.rest = id;
      note.textContent = line;
      sui('select');
      haptic('light');
      if (first) { react('nod'); realm()?.transform?.(0.85); }
      finishBtn.disabled = false;
    };
    grid.append(b);
  }
  dock.replaceChildren(grid, note, finishBtn);
  await wait(30);
  const placeRest = () => {
    const top = titleBottom() + 10, bottom = dockTop() - 10;
    placeBody((top + bottom) / 2, clamp(bottom - top - 10, 70, 240));
  };
  placeRest();
  onResize = placeRest;
  say('Something tiny. Tiny is the whole point.', 2600);
  await new Promise((r) => { finishBtn.onclick = r; signal.addEventListener('abort', r); });
  if (!ok()) return result;
  onResize = null;

  // ========================================================= FINALE ==
  dock.replaceChildren();
  setMove(4, { eyebrow: 'The Moonmilk Cove', title: day ? 'Day, put down' : 'Goodnight, day', prompt: '' });
  await wait(30);
  {
    const top = titleBottom() + 20, bottom = H - 60;
    placeBody((top + bottom) / 2 + 20, clamp(bottom - top - 40, 140, 340));
  }
  realm()?.setMood?.({ agitation: 0, heaviness: 0.15, warmth: 0.6, clarity: 0.55 });
  realm()?.transform?.(1);
  veilTarget = low ? 0.12 : 0.22;
  sfx('bloom', { intensity: 0.3 });
  haptic('soft');
  react('yawn');
  await wait(rm ? 900 : 1600);
  if (!ok()) return result;
  world.setEmotion({ exhausted: 0.4, calm: 0.6 }, 0.85, { extra: { eyeOpen: 0, lidTop: 0.6, fxZzz: 0.9, yawnCycle: 0, droop: 0.5, breathRate: 0.08, breath: 1.4, blinkRate: 0 } });
  // slow drifting z's
  const zs = [];
  let zT = 0;
  drawExtra = (dt) => {
    zT -= dt;
    const m = world.mallowRect();
    if (zT <= 0 && zs.length < (rm ? 2 : 4)) { zT = rm ? 2.6 : 1.6; zs.push({ x: m.cx + m.width * 0.18, y: m.top + m.height * 0.2, a: 0, age: 0, s: 14 + Math.random() * 8 }); }
    g.textAlign = 'center';
    for (const z of zs) {
      z.age += dt;
      if (!rm) { z.y -= 14 * dt; z.x += Math.sin(z.age * 0.9) * 0.25; }
      z.a = Math.min(1, z.age) * Math.max(0, 1 - z.age / 4.2);
      g.font = canvasFontPx(z.s + z.age * 3, 700);
      g.fillStyle = `rgba(235,235,255,${(0.6 * z.a).toFixed(3)})`;
      g.fillText('z', z.x + z.age * 8, z.y);
    }
    for (let i = zs.length - 1; i >= 0; i--) if (zs[i].age > 4.2) zs.splice(i, 1);
  };
  await say('*yaaawn* …oh. Excuse me.', 2000);
  if (!ok()) return result;
  await say(day ? 'Rest counts. Even the daytime sort. Zzz…' : 'The cove’s got the night shift now. Sleep, or don’t — both count. Zzz…', 3400);
  if (!ok()) return result;
  await wait(600);
  if (!ok()) return result;
  cleanup();

  const restLabel = REST.find(([id]) => id === result.rest)?.[1] || '—';
  result.completed = true;
  result.summary = [
    { label: 'Put down for tonight', text: result.dimmed.length ? cap(listJoin(result.dimmed)) : 'Nothing needed dimming' },
    { label: 'Heavy and soft', text: result.regions.length >= REGIONS.length ? 'Forehead to legs, one moonbeam' : 'A slow moonbeam sweep' },
    { label: 'Slow blinks', text: `${result.blinks} with Noomi, each a little slower` },
    { label: 'Your tiny rest', text: restLabel },
  ];
  result.share = { title: 'Moonmilk wind-down', subtitle: 'Noomi helped me put the day down.' };
  return result;
}

function listJoin(a) { return a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
