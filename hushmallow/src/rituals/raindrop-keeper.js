// RAINDROP KEEPER — Blubi, The Softie. Raindrop Lagoon.
// For sadness, grief, loneliness, hurt, heartache, longing and their cousins.
//
// 1. Catch a drop      — glass raindrops fall over the lagoon. Slide your
//                        cupped hands under one (or tap it) and name what it
//                        holds: an authored chip, or your own words (shown
//                        back, never interpreted). Up to three drops.
// 2. Hold it           — press and hold your hands. The drops warm from cool
//                        blue to soft gold while Blubi leans in and their
//                        tears slow. Nothing gets fixed; it just gets held.
// 3. Let it shine      — drag each drop onto the water, where it opens into
//                        a floating lily-lantern. The lagoon brightens a
//                        little. Only a little — that's allowed.
// 4. One small kindness — choose one gentle thing for right now.
//
// Rationale (plain): naming a feeling, letting it be there without pushing
// it away, a sense of company, and small acts of self-kindness are widely
// shared ideas. No promise that the sadness lifts.

import { h, clearBubble } from '../app/ui.js';
import { canvasFontPx } from '../ui/type.js';

const FONT_13 = canvasFontPx(13, 650);   // canvas labels: the voice face, at the 13px floor

// [id, chip label, Blubi's reply] — replies are authored per chip, never per free text
const HOLDS = [
  ['miss', 'someone I miss', 'Missing someone is love with nowhere to go. Of course it aches.'],
  ['hoped', 'it didn’t go how I hoped', 'You hoped for something. It makes sense that it stings.'],
  ['left-out', 'I feel left out', 'Being left out really hurts. I’m sitting right here next to you.'],
  ['lost', 'something I lost', 'Losing something leaves a shape behind. It’s okay that it hurts.'],
  ['words', 'something that hurt me', 'Ouch. Some things land so hard. It’s alright to feel bruised.'],
  ['home', 'missing home', 'Missing home is such a tender ache. I get it, truly.'],
  ['differently', 'I wish it had gone differently', 'Wishing it had gone another way… that’s a heavy little drop.'],
  ['unknown', 'I don’t know — it just aches', 'You don’t have to know what it is. We can hold it anyway.'],
];
const OWN_REPLY = 'Thank you for telling me. I’ll hold it carefully.';

const KIND = [
  ['drink', 'A warm drink', 'Something warm between your hands. Kettle on — I’ll wait right here.'],
  ['blanket', 'Wrap up in a blanket', 'Soft things are allowed to help. Burrow in.'],
  ['trust', 'Someone I trust, later', 'No need to send anything now. Just keep a name in mind for when you’re ready.'],
  ['walk', 'A short, slow walk', 'Five slow minutes outside. The sky doesn’t need you to be okay.'],
  ['cry', 'Let myself cry', 'If the tears want to come, let them. I’ll probably join in. Loudly.'],
  ['memory', 'Keep a memory close', 'A photo, a song, a thing they’d say. Keep it near for a while.'],
];

export const meta = { id: 'raindrop-keeper' };

// small hint text that stays legible over the bright lagoon
const SOFT = { textAlign: 'center', color: 'var(--text-1)', textShadow: '0 1px 2px rgba(5,10,58,.95), 0 0 12px rgba(5,10,58,.85)' };

export async function run(ctx) {
  const { world, audio, haptic, setMove, dock, signal } = ctx;
  const rm = !!ctx.reducedMotion;
  const low = !!ctx.lowStim;
  const realm = () => world.realm;
  const result = { completed: false, drops: [], heldSeconds: 0, lanterns: 0, kindness: null };

  // ------------------------------------------------------------ plumbing --
  const offs = [];
  const on = (t, type, fn, opts) => { t.addEventListener(type, fn, opts); offs.push(() => t.removeEventListener(type, fn, opts)); };
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const pause = (ms) => new Promise((r) => { later(r, ms); on(signal, 'abort', r, { once: true }); });
  const until = (setup) => new Promise((resolve) => { if (signal.aborted) return resolve(); on(signal, 'abort', () => resolve(), { once: true }); setup(resolve); });

  // say: put the bubble below Blubi when there's no room above (title block)
  const titleBottom = () => document.querySelector('.ritual-ui .move-title')?.getBoundingClientRect().bottom || 140;
  let movedAt = 0;
  // moving Blubi clears any bubble left pointing at the old spot
  const place = (p) => { movedAt = performance.now(); clearBubble(); world.place({ calm: true, ...p }); };
  const say = async (text, ms = 3200) => {
    // let Blubi finish gliding (and the layout settle) before anchoring the bubble
    const settle = 740 - (performance.now() - movedAt);
    if (settle > 0) await pause(settle);
    if (performance.now() - movedAt < 2000) {
      for (let i = 0; i < 12 && !signal.aborted; i++) {
        const a = world.mallowRect(); await pause(70); const b = world.mallowRect();
        if (Math.abs(a.top - b.top) < 1 && Math.abs(a.height - b.height) < 1) break;
      }
    }
    if (signal.aborted) return;
    const r = world.mallowRect();
    const above = r.top + r.height * 0.12 - (text.length > 60 ? 128 : 100) > titleBottom();
    return ctx.say(text, { who: 'Blubi', ms, above });
  };
  // face: an emotion mix plus how much Blubi is crying (tears slow as things are held)
  const feel = (mix, intensity, tears, opts = {}) => world.setEmotion(mix, intensity, { ...opts, extra: { tears, wet: Math.min(1, 0.3 + tears) } });

  // ------------------------------------------------------- fx canvas --
  const canvas = h('canvas', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', touchAction: 'none' } });
  world.fx.replaceChildren(canvas);
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); };
  resize();
  on(window, 'resize', resize);
  const hy = () => Math.round(H * 0.6); // the lagoon's horizon line
  const dockTop = () => dock.getBoundingClientRect().top || H * 0.8;

  const falling = [];          // {x,y,vy,ph,r,a,fly?}
  const held = [];             // {label, warm, x, y, drag?}
  const lanterns = [];         // {x,y,label,ph,bloom}
  const motes = [];
  const hands = { x: 0, y: 0, tx: 0, ty: 0, show: false, alpha: 0, warm: 0, ring: -1, scale: 1 };
  let anchor = null; // keeps the hands pinned to the current layout
  let slowmo = 1, glowBoost = 0, labelsOn = true, labelA = 1;
  let raf = 0, last = performance.now();
  const loop = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    anchor?.();
    drawLanterns(dt);
    drawFalling(dt);
    drawHands(dt);
    drawHeld(dt);
    drawMotes(dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const mix = (a, b, k) => a + (b - a) * k;
  const rgbMix = (c1, c2, k) => `rgb(${c1.map((v, i) => Math.round(mix(v, c2[i], k))).join(',')})`;
  const COOL_HI = [226, 245, 255], COOL_LO = [70, 160, 240], WARM_HI = [255, 244, 214], WARM_LO = [255, 160, 196];

  function bead(x, y, r, warm, alpha = 1) {
    g.save();
    g.globalAlpha = alpha;
    if (warm > 0.05) {
      g.globalCompositeOperation = 'lighter';
      const halo = g.createRadialGradient(x, y, r * 0.4, x, y, r * (2.6 + warm));
      halo.addColorStop(0, `rgba(255,214,170,${0.45 * warm})`); halo.addColorStop(1, 'rgba(255,170,200,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * (2.6 + warm), 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    // teardrop body
    g.beginPath();
    g.moveTo(x, y - r * 1.55);
    g.bezierCurveTo(x + r * 0.35, y - r * 0.95, x + r, y - r * 0.35, x + r, y + r * 0.1);
    g.arc(x, y + r * 0.1, r, 0, Math.PI);
    g.bezierCurveTo(x - r, y - r * 0.35, x - r * 0.35, y - r * 0.95, x, y - r * 1.55);
    const body = g.createRadialGradient(x - r * 0.3, y - r * 0.2, r * 0.1, x, y + r * 0.2, r * 1.3);
    body.addColorStop(0, rgbMix(COOL_HI, WARM_HI, warm));
    body.addColorStop(1, rgbMix(COOL_LO, WARM_LO, warm));
    g.fillStyle = body; g.fill();
    g.lineWidth = 1.4; g.strokeStyle = 'rgba(255,255,255,.75)'; g.stroke();
    // glint
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.25, r * 0.18, r * 0.3, -0.5, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function drawFalling(dt) {
    for (const d of falling) {
      if (d.fly) {
        d.fly.t = Math.min(1, d.fly.t + dt / 0.55);
        const k = 1 - (1 - d.fly.t) ** 3;
        d.x = mix(d.fly.x0, hands.x, k); d.y = mix(d.fly.y0, hands.y - 14, k) - Math.sin(Math.PI * k) * 30;
        if (d.fly.t >= 1) { d.gone = true; d.fly.done?.(); }
      } else {
        d.ph += dt;
        d.y += d.vy * dt * slowmo;
        d.x += Math.sin(d.ph * 1.3) * (rm ? 0 : 6) * dt;
        d.a = Math.min(1, d.a + dt * 2);
        if (d.y > (hands.y || H * 0.7) + 60) { d.a -= dt * 3; if (d.a <= 0) d.gone = true; }
      }
    }
    for (let i = falling.length - 1; i >= 0; i--) if (falling[i].gone) falling.splice(i, 1);
    for (const d of falling) bead(d.x, d.y, d.r, 0, Math.max(0, d.a) * 0.95);
  }

  function drawHands(dt) {
    hands.alpha = Math.max(0, Math.min(1, hands.alpha + (hands.show ? dt * 3 : -dt * 3)));
    if (hands.alpha <= 0) return;
    const ease = rm ? 1 : Math.min(1, dt * 9);
    hands.x += (hands.tx - hands.x) * ease; hands.y += (hands.ty - hands.y) * ease;
    const { x, y } = hands, s = hands.scale, w = hands.warm;
    g.save();
    g.globalAlpha = hands.alpha;
    // soft glow under the palms
    const gl = g.createRadialGradient(x, y + 8 * s, 4, x, y + 8 * s, 90 * s);
    gl.addColorStop(0, `rgba(255,${Math.round(190 + 40 * w)},${Math.round(230 - 60 * w)},${0.18 + 0.3 * w})`); gl.addColorStop(1, 'rgba(255,190,230,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(x, y + 8 * s, 90 * s, 0, Math.PI * 2); g.fill();
    // cupped palms: an outer bowl with a softer inner hollow
    g.beginPath();
    g.moveTo(x - 66 * s, y - 14 * s);
    g.bezierCurveTo(x - 64 * s, y + 30 * s, x - 30 * s, y + 44 * s, x, y + 44 * s);
    g.bezierCurveTo(x + 30 * s, y + 44 * s, x + 64 * s, y + 30 * s, x + 66 * s, y - 14 * s);
    g.bezierCurveTo(x + 54 * s, y - 2 * s, x + 30 * s, y + 6 * s, x, y + 6 * s);
    g.bezierCurveTo(x - 30 * s, y + 6 * s, x - 54 * s, y - 2 * s, x - 66 * s, y - 14 * s);
    const skin = g.createLinearGradient(0, y - 14 * s, 0, y + 44 * s);
    skin.addColorStop(0, '#ffeef7'); skin.addColorStop(1, rgbMix([240, 166, 210], [255, 190, 170], w));
    g.fillStyle = skin; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(120,60,140,.35)'; g.stroke();
    // the seam where the two palms meet
    g.beginPath(); g.moveTo(x, y + 10 * s); g.quadraticCurveTo(x + 2 * s, y + 28 * s, x, y + 42 * s); g.strokeStyle = 'rgba(150,80,150,.3)'; g.lineWidth = 1.6; g.stroke();
    // thumbs
    g.fillStyle = '#ffe3f1';
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(x + sd * 62 * s, y - 14 * s, 9 * s, 6 * s, sd * 0.6, 0, Math.PI * 2); g.fill(); }
    // hold progress ring
    if (hands.ring >= 0) {
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 5;
      g.beginPath(); g.arc(x, y + 6 * s, 78 * s, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(255,214,160,.95)';
      g.beginPath(); g.arc(x, y + 6 * s, 78 * s, -Math.PI / 2, -Math.PI / 2 + hands.ring * Math.PI * 2); g.stroke();
    }
    g.restore();
  }

  function heldSpot(i, n) {
    const offs = n === 1 ? [0] : n === 2 ? [-17, 17] : [-27, 0, 27];
    return [hands.x + offs[i] * hands.scale, hands.y - 6 * hands.scale - (n === 3 && i === 1 ? 8 : 0)];
  }
  function drawHeld(dt) {
    const n = held.length;
    held.forEach((d, i) => {
      if (d.placed) return;
      if (!d.drag) {
        const [tx, ty] = heldSpot(i, n);
        d.x = d.x == null ? tx : d.x + (tx - d.x) * Math.min(1, dt * 8);
        d.y = d.y == null ? ty : d.y + (ty - d.y) * Math.min(1, dt * 8);
      }
      const bob = rm ? 0 : Math.sin(performance.now() / 700 + i) * 1.5;
      bead(d.x, d.y + bob, 13 * hands.scale, d.warm, d.drag ? 1 : hands.alpha);
    });
  }

  function drawLanterns(dt) {
    glowBoost = Math.max(0, glowBoost - dt * 0.15);
    labelA = Math.max(0, Math.min(1, labelA + (labelsOn ? dt * 2 : -dt * 4)));
    for (const L of lanterns) {
      L.ph += dt * (rm ? 0.2 : 1);
      L.bloom = Math.min(1, L.bloom + dt * 1.2);
      const b = 1 - (1 - L.bloom) ** 3;
      const x = L.x, y = L.y + (rm ? 0 : Math.sin(L.ph * 0.9) * 2.2);
      // reflection on the water
      g.save();
      g.globalCompositeOperation = 'lighter';
      const refl = g.createLinearGradient(0, y, 0, y + 60);
      refl.addColorStop(0, `rgba(255,214,160,${0.28 * b + glowBoost * 0.2})`); refl.addColorStop(1, 'rgba(255,214,160,0)');
      g.fillStyle = refl; g.fillRect(x - 6, y, 12, 60);
      const halo = g.createRadialGradient(x, y - 10, 2, x, y - 10, 46 + glowBoost * 30);
      halo.addColorStop(0, `rgba(255,220,170,${0.55 * b + glowBoost * 0.3})`); halo.addColorStop(1, 'rgba(255,170,210,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(x, y - 10, 46 + glowBoost * 30, 0, Math.PI * 2); g.fill();
      g.restore();
      // lily pad with a little notch
      g.save();
      g.translate(x, y);
      g.scale(b, b);
      g.beginPath(); g.ellipse(0, 4, 30, 9, 0, 0.25, Math.PI * 2 - 0.25); g.lineTo(0, 4); g.closePath();
      const pad = g.createLinearGradient(0, -5, 0, 13);
      pad.addColorStop(0, '#5fd6b8'); pad.addColorStop(1, '#1d7f86');
      g.fillStyle = pad; g.fill();
      // petals cupping the light
      g.fillStyle = 'rgba(255,200,236,.95)';
      for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) { g.save(); g.rotate(a); g.beginPath(); g.ellipse(0, -8, 5, 11, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
      g.restore();
      bead(x, y - 10 * b, 9 * b, 1, 1);
      if (L.label && b > 0.6 && labelA > 0) {
        g.save();
        g.font = FONT_13;
        g.textAlign = 'center'; g.textBaseline = 'top';
        g.fillStyle = `rgba(255,246,252,${0.85 * labelA * (b - 0.6) / 0.4})`;
        g.shadowColor = 'rgba(5,10,58,.9)'; g.shadowBlur = 6;
        g.fillText(L.label, x, y + 16);
        g.restore();
      }
    }
  }
  function drawMotes(dt) {
    for (const m of motes) { m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; }
    for (let i = motes.length - 1; i >= 0; i--) if (motes[i].age > motes[i].life) motes.splice(i, 1);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const m of motes) { const a = Math.sin(Math.PI * m.age / m.life); g.fillStyle = `rgba(255,220,190,${0.8 * a})`; g.beginPath(); g.arc(m.x, m.y, m.s, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  const sparkle = (x, y, n = 8) => {
    if (low) n = Math.min(3, n);
    if (rm) n = Math.min(4, n);
    for (let i = 0; i < n; i++) motes.push({ x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 40, age: 0, life: 1 + Math.random(), s: 1.5 + Math.random() * 2 });
  };

  let holdSound = null;
  const cleanup = () => {
    cancelAnimationFrame(raf);
    offs.splice(0).forEach((f) => f());
    timers.forEach(clearTimeout); timers.clear();
    holdSound?.stop(); holdSound = null;
    world.fx.classList.remove('live');
    world.fx.replaceChildren();
  };
  signal.addEventListener('abort', cleanup, { once: true });

  // ============================================== 1. CATCH A DROP ==
  setMove(0, { eyebrow: 'Move 1 of 4', title: 'Catch a drop', prompt: 'Slide your cupped hands under a falling drop, or tap one.' });
  place({ x: 50, y: 37, scale: 0.56 });
  const startI = Math.min(0.95, Math.max(0.6, ctx.input.intensity || 0.7));
  const lonelyIn = (ctx.input.emotions || []).some((e) => /lonel|reject|exclu|alien|abandon|isolat|ghost|unloved|disconnect|forgot|invisible|homesick/.test(e.id));
  feel(lonelyIn ? { sad: 0.6, lonely: 0.4 } : { sad: 0.8, lonely: 0.2 }, startI, 1);
  realm()?.setMood?.({ heaviness: 0.75, clarity: 0.1, warmth: 0.15, agitation: 0.08 });
  realm()?.transform?.(0);
  later(() => say('Oh… it’s raining a lot in here today. That’s okay. Let’s catch one together.', 3600), 500);

  const order = chipOrder(ctx.input.emotions || []);
  hands.show = true;
  // the hands sit just above the dock; if the dock leaves no room (short screens, keyboard up) they fade out of the way
  const placeHands = () => { const y = Math.min(H * 0.72, dockTop() - 58); hands.ty = y; hands.show = y - 20 > titleBottom(); };
  hands.tx = hands.x = W / 2; placeHands(); hands.y = hands.ty;
  anchor = placeHands;

  const ownWordsLabel = (s) => { s = s.trim().replace(/\s+/g, ' '); return s.length > 26 ? `${s.slice(0, 25)}…` : s; };

  async function catchOne() {
    const hint = h('p', { class: 'muted', style: { ...SOFT, margin: '0' } }, 'Drag to move your hands. Arrow keys work too.');
    const helpBtn = h('button', { class: 'btn block', 'aria-label': 'Catch a drop for me' }, 'Catch one for me');
    dock.replaceChildren(hint, helpBtn);
    placeHands();
    world.fx.classList.add('live');
    slowmo = 1;
    let spawnT = 0, raf2 = 0, prev = performance.now();
    const graceUntil = performance.now() + 1200; // no accidental catch the instant the rain restarts
    await until((resolve) => {
      let caught = false;
      const catchDrop = (d, viaTap) => {
        if (caught) return;
        caught = true;
        audio.fx?.('drop-in', { intensity: 0.6, pan: (d.x / W - 0.5) });
        haptic('soft');
        if (viaTap) { d.fly = { t: 0, x0: d.x, y0: d.y, done: landed }; } else { d.gone = true; landed(); }
        realm()?.pulse?.('tap', { x: d.x, y: Math.max(hy() + 10, hands.y + 30) });
      };
      function landed() {
        cancelAnimationFrame(raf2);
        world.fx.classList.remove('live');
        world.react('nod');
        resolve();
      }
      const spawn = () => {
        const n = falling.filter((d) => !d.fly).length;
        if (n >= (low ? 3 : 5)) return;
        const top = titleBottom();
        falling.push({ x: W * (0.14 + Math.random() * 0.72), y: top + Math.random() * 20, vy: (rm ? 34 : 48) + Math.random() * 26, ph: Math.random() * 6, r: 12 + Math.random() * 4, a: 0 });
      };
      if (!falling.length) { spawn(); spawn(); }
      const step = (now) => {
        const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
        spawnT += dt;
        if (spawnT > (rm ? 1.6 : 1.1)) { spawnT = 0; spawn(); }
        placeHands();
        for (const d of falling) {
          if (d.fly || d.gone) continue;
          if (now > graceUntil && Math.abs(d.x - hands.x) < 50 * hands.scale && d.y > hands.y - 26 && d.y < hands.y + 14) { catchDrop(d, false); return; }
        }
        raf2 = requestAnimationFrame(step);
      };
      raf2 = requestAnimationFrame(step);
      on(signal, 'abort', () => cancelAnimationFrame(raf2), { once: true });
      let dragging = false;
      const down = (e) => {
        if (caught) return;
        const d = falling.find((f) => !f.fly && Math.hypot(f.x - e.clientX, f.y - e.clientY) < 36);
        if (d) { catchDrop(d, true); return; }
        dragging = true; canvas.setPointerCapture?.(e.pointerId);
        hands.tx = Math.max(70, Math.min(W - 70, e.clientX));
      };
      const move = (e) => { if (dragging) hands.tx = Math.max(70, Math.min(W - 70, e.clientX)); };
      const up = () => { dragging = false; };
      on(canvas, 'pointerdown', down); on(canvas, 'pointermove', move); on(canvas, 'pointerup', up); on(canvas, 'pointercancel', up);
      on(window, 'keydown', (e) => {
        if (caught) return;
        if (e.key === 'ArrowLeft') { hands.tx = Math.max(70, hands.tx - 40); e.preventDefault(); }
        if (e.key === 'ArrowRight') { hands.tx = Math.min(W - 70, hands.tx + 40); e.preventDefault(); }
      });
      on(helpBtn, 'click', () => {
        let d = falling.filter((f) => !f.fly).sort((a, b) => b.y - a.y)[0];
        if (!d) { spawn(); d = falling[falling.length - 1]; }
        catchDrop(d, true);
      });
    });
    if (signal.aborted) return null;
    // time softens while you name it; the hands come back to the middle
    slowmo = 0.15;
    hands.tx = W / 2;
    place({ x: 50, y: 31, scale: 0.48 });
    const drop = { label: '', id: '', warm: 0, x: null, y: null };
    held.push(drop);

    // ---- name what it holds
    let chosen = null;
    const keep = h('button', { class: 'btn primary block', disabled: true }, 'Hold onto this one');
    const ownInput = h('input', { type: 'text', maxlength: '60', placeholder: 'Type a few words…', 'aria-label': 'What this drop holds, in your own words',
      style: { display: 'none', width: '100%', minHeight: '48px', boxSizing: 'border-box', borderRadius: '16px', border: '1px solid var(--line-strong)', background: 'rgba(8,16,64,.82)', color: 'var(--text-1)', font: '500 var(--type-row-size)/1.25 var(--ff-ui)', padding: '0 14px' } });
    // short screens: a compact two-column set, with the rest behind "More…"
    const compact = H < 700;
    const chipBox = h('div', { class: compact ? '' : 'chips', role: 'group', 'aria-label': 'What this drop holds',
      style: compact ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } : { justifyContent: 'center', gap: '6px' } });
    const chipStyle = compact ? { minHeight: '44px', fontSize: 'var(--type-caption-size)', padding: '4px 10px', justifyContent: 'center', textAlign: 'center', lineHeight: '1.15', whiteSpace: 'normal' }
      : { minHeight: '44px', fontSize: 'var(--type-label-size)', padding: '0 13px' };
    const chips = [];
    const select = (id, el) => {
      chosen = id;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === el)));
      ownInput.style.display = id === 'own' ? 'block' : 'none';
      if (id === 'own') ownInput.focus();
      keep.disabled = id === 'own' ? !ownInput.value.trim() : false;
      audio.ui?.('select'); haptic('light');
    };
    const avail = order.filter(([id]) => !result.drops.some((d) => d.id === id));
    const makeChip = ([id, label]) => {
      const c = h('button', { class: 'chip', 'aria-pressed': 'false', style: chipStyle }, label);
      on(c, 'click', () => select(id, c));
      chips.push(c);
      return c;
    };
    const ownChip = h('button', { class: 'chip', 'aria-pressed': 'false', style: { ...chipStyle, borderStyle: 'dashed' } }, 'In my own words…');
    on(ownChip, 'click', () => select('own', ownChip));
    const firstN = compact ? 4 : avail.length;
    if (compact) anchor = () => { hands.show = false; };
    avail.slice(0, firstN).forEach((row) => chipBox.append(makeChip(row)));
    if (avail.length > firstN) {
      const more = h('button', { class: 'chip', style: { ...chipStyle, borderStyle: 'dashed' }, 'aria-label': 'Show more options' }, 'More…');
      on(more, 'click', () => { more.replaceWith(...avail.slice(firstN).map(makeChip)); chipBox.append(ownChip); chips[firstN]?.focus(); });
      chipBox.append(more);
    }
    chips.push(ownChip); chipBox.append(ownChip);
    on(ownInput, 'input', () => { keep.disabled = !ownInput.value.trim(); });
    on(ownInput, 'keydown', (e) => { if (e.key === 'Enter' && ownInput.value.trim()) keep.click(); });
    setMove(0, { eyebrow: 'Move 1 of 4', title: 'What does it hold?', prompt: 'Pick what fits, or use your own words.' });
    dock.replaceChildren(chipBox, ownInput, keep);
    if (result.drops.length === 0) say('Oh, that one’s heavy. What’s inside it?', 2600);
    await until((resolve) => on(keep, 'click', resolve));
    if (signal.aborted) return null;
    anchor = placeHands;
    if (chosen === 'own') { drop.id = 'own'; drop.label = ownWordsLabel(ownInput.value); drop.full = ownInput.value.trim(); }
    else { const row = HOLDS.find(([id]) => id === chosen); drop.id = row[0]; drop.label = row[1]; }
    result.drops.push({ id: drop.id, label: drop.full || drop.label });
    audio.fx?.('chime', { intensity: 0.4, pitch: 0.9 + result.drops.length * 0.08 });
    haptic('soft');
    sparkle(hands.x, hands.y - 10, 6);
    feel(lonelyIn ? { sad: 0.55, lonely: 0.35, comforted: 0.1 } : { sad: 0.75, lonely: 0.1, comforted: 0.15 }, startI, 0.9, { quiet: true });
    const reply = drop.id === 'own' ? OWN_REPLY : HOLDS.find(([id]) => id === drop.id)[2];
    return reply;
  }

  for (;;) {
    const reply = await catchOne();
    if (signal.aborted || reply == null) return result;
    if (held.length >= 3) { dock.replaceChildren(); await say(`${reply}`, 3000); break; }
    setMove(0, { eyebrow: 'Move 1 of 4', title: 'Caught', prompt: 'You can catch another, or hold this for now.' });
    const more = h('button', { class: 'btn block' }, 'Catch another drop');
    const enough = h('button', { class: 'btn primary block' }, held.length === 1 ? 'Just this one for now' : 'These are enough for now');
    dock.replaceChildren(more, enough);
    say(reply, 3400);
    slowmo = 0.35;
    const again = await until((resolve) => { on(more, 'click', () => resolve(true)); on(enough, 'click', () => resolve(false)); });
    if (signal.aborted) return result;
    if (!again) break;
    setMove(0, { eyebrow: 'Move 1 of 4', title: 'Catch a drop', prompt: 'Slide your cupped hands under a falling drop, or tap one.' });
  }
  // the rest of the rain drifts down and away
  slowmo = 1;
  for (const d of falling) if (!d.fly) d.vy = 160;

  // ================================================== 2. HOLD IT ==
  setMove(1, { eyebrow: 'Move 2 of 4', title: 'Hold it', prompt: 'Press and hold your hands. Let it warm up. Nothing to fix.' });
  const holdBtn = h('button', { class: 'hold-target', 'aria-label': 'Your cupped hands. Press and hold to keep the drops warm. Press Enter or Space to start or pause.',
    style: { width: '170px', height: '150px', borderRadius: '40%', alignContent: 'end', paddingBottom: '2px' } }, h('span', { style: { textShadow: '0 1px 8px rgba(5,10,58,.9)' } }, 'HOLD'));
  const holdLabel = holdBtn.firstChild;
  const short = H < 700;
  const cue = h('p', { class: 'muted', style: { ...SOFT, margin: '0', minHeight: '20px', display: short ? 'none' : 'block' }, 'aria-live': 'polite' }, 'You don’t have to do anything with it.');
  const tapMode = h('button', { class: 'btn ghost block' }, 'Can’t hold? Tap to start / pause');
  dock.replaceChildren(cue, holdBtn, tapMode);
  const anchorHands = () => { const r = holdBtn.getBoundingClientRect(); hands.tx = r.left + r.width / 2; hands.ty = r.top + r.height * 0.42; };
  anchorHands();
  anchor = anchorHands;
  hands.show = true;
  hands.scale = 1;
  const placeA = short ? { x: 50, y: 31, scale: 0.5 } : { x: 50, y: 38, scale: 0.56 };
  const leanB = short ? { x: 50, y: 32, scale: 0.55 } : { x: 50, y: 45, scale: 0.66 };
  const leanC = short ? { x: 50, y: 33, scale: 0.58 } : { x: 50, y: 49, scale: 0.74 };
  place(placeA);
  realm()?.setMood?.({ heaviness: 0.7, warmth: 0.2 });

  await until((resolve) => {
    const TOTAL = 10;
    let holding = false, toggled = false, t = 0, prev = performance.now(), tick = 0, beat = 0, stage = 0;
    holdSound = audio.hold?.('hum', { intensity: 0 }) || null;
    hands.ring = 0;
    const step = (now) => {
      const dt = Math.min(0.25, (now - prev) / 1000); prev = now;
      anchorHands();
      const active = holding || toggled;
      holdLabel.textContent = active ? 'HOLDING' : (t > 0 ? 'HOLD' : 'HOLD');
      if (active) {
        t += dt;
        const p = Math.min(1, t / TOTAL);
        hands.ring = p; hands.warm = p;
        held.forEach((d) => { d.warm = p; });
        beat += dt;
        if (beat > 1.5) { beat = 0; haptic('heartbeat'); }
        holdSound?.update?.({ intensity: 0.25 + p * 0.4 });
        // Blubi leans in; their tears slow
        feel({ sad: Math.max(0.2, 0.8 - p * 0.6), lonely: 0.2 * (1 - p), comforted: p * 0.7 }, mix(startI, 0.65, p), 0.9 - p * 0.65, { quiet: true });
        realm()?.setMood?.({ heaviness: 0.7 - p * 0.25, warmth: 0.2 + p * 0.3, clarity: 0.1 + p * 0.15 });
        realm()?.transform?.(p * 0.3);
        if (stage === 0 && p > 0.05) { stage = 1; say('Just holding. We’re not fixing anything.', 2600); cue.textContent = 'Just holding…'; }
        if (stage === 1 && p > 0.35) { stage = 2; place(leanB); world.react('nod'); say('It makes sense this hurts. Sniff. Sorry — sympathetic crier.', 3200); cue.textContent = 'It’s warming in your hands…'; }
        if (stage === 2 && p > 0.7) { stage = 3; place(leanC); say('Still heavy. A little warmer, though. And you’re not alone with it.', 3200); cue.textContent = 'Nearly there. Take your time.'; }
        if (p >= 1) { result.heldSeconds = Math.round(t); finish(); return; }
      } else holdSound?.update?.({ intensity: 0 });
      tick = requestAnimationFrame(step);
    };
    tick = requestAnimationFrame(step);
    const downH = (e) => { e.preventDefault(); holding = true; holdBtn.setPointerCapture?.(e.pointerId); haptic('soft'); };
    const upH = () => { holding = false; };
    on(holdBtn, 'pointerdown', downH); on(holdBtn, 'pointerup', upH); on(holdBtn, 'pointercancel', upH); on(holdBtn, 'lostpointercapture', upH);
    on(holdBtn, 'contextmenu', (e) => e.preventDefault());
    on(holdBtn, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggled = !toggled; } });
    on(tapMode, 'click', () => { toggled = !toggled; tapMode.textContent = toggled ? 'Pause' : 'Tap to keep holding'; });
    function finish() { cancelAnimationFrame(tick); holdSound?.stop(); holdSound = null; resolve(); }
    on(signal, 'abort', () => cancelAnimationFrame(tick), { once: true });
  });
  if (signal.aborted) return result;
  hands.ring = -1;
  audio.fx?.('bloom', { intensity: 0.6 });
  haptic('success');
  world.react('comfort');
  realm()?.pulse?.('success', { x: hands.x, y: hands.y });
  sparkle(hands.x, hands.y - 10, 10);
  dock.replaceChildren();
  await say(held.length > 1 ? 'There. Still yours, still heavy — but warm now. I’m right here.' : 'There. Still yours, still heavy — but warm now. I’m right here.', 3000);
  if (signal.aborted) return result;

  // ============================================== 3. LET IT SHINE ==
  setMove(2, { eyebrow: 'Move 3 of 4', title: 'Let it shine', prompt: held.length > 1 ? 'Drag each drop down onto the water. Or tap one.' : 'Drag the drop down onto the water. Or tap it.' });
  place({ x: 50, y: 31, scale: 0.5 });
  feel({ comforted: 0.55, sad: 0.35, hopeful: 0.1 }, 0.65, 0.25);
  const floatAll = h('button', { class: 'btn block' }, held.length > 1 ? 'Float them out for me' : 'Float it out for me');
  const shineHint = h('p', { class: 'muted', style: { ...SOFT, margin: '0' } }, 'They’ll stay yours. Just not in the dark.');
  dock.replaceChildren(shineHint, floatAll);
  const shineHands = () => { hands.tx = W / 2; hands.ty = Math.max(titleBottom() + 150, hy() - 40); };
  shineHands();
  anchor = shineHands;
  hands.show = true;
  hands.scale = 0.9;
  world.fx.classList.add('live');

  const bandTop = () => hy() + 22;
  const bandBottom = () => Math.max(bandTop() + 10, dockTop() - 40);
  const SLOTS = [[0.5, 0.35], [0.22, 0.6], [0.78, 0.55], [0.36, 0.95], [0.66, 0.9]];
  const freeSpot = (x, y, label = '') => {
    g.font = FONT_13;
    const half = Math.max(34, g.measureText(label).width / 2 + 8);
    const ok = (px, py) => lanterns.every((L) => Math.hypot(L.x - px, (L.y - py) * 1.6) > 86);
    const cy = Math.max(bandTop(), Math.min(bandBottom(), y));
    const cx = Math.max(half, Math.min(W - half, x));
    if (ok(cx, cy)) return [cx, cy];
    for (const [sx, sy] of SLOTS) { const px = W * sx, py = mix(bandTop(), bandBottom(), sy); if (ok(px, py)) return [px, py]; }
    return [cx, cy];
  };
  const toPlace = () => held.filter((d) => !d.placed && !d.sailing);

  await until((resolve) => {
    let dragging = null, sx = 0, sy = 0, auto = false;
    const setAfloat = (d, x, y) => {
      if (d.placed || d.sailing) return;
      const [px, py] = freeSpot(x, y, d.label);
      d.sailing = true;
      const x0 = d.x, y0 = d.y, t0 = performance.now(), dur = rm ? 350 : 700;
      const glide = () => {
        if (signal.aborted) return;
        const k = Math.min(1, (performance.now() - t0) / dur), e = 1 - (1 - k) ** 3;
        d.drag = true; d.x = mix(x0, px, e); d.y = mix(y0, py - 10, e) - Math.sin(Math.PI * e) * (rm ? 0 : 24);
        if (k < 1) { requestAnimationFrame(glide); return; }
        d.placed = true;
        lanterns.push({ x: px, y: py, label: d.label, ph: Math.random() * 6, bloom: 0 });
        result.lanterns = lanterns.length;
        audio.fx?.('drop-in', { intensity: 0.5, pan: px / W - 0.5 });
        later(() => audio.fx?.('chime', { intensity: 0.45, pitch: 0.9 + lanterns.length * 0.1 }), 160);
        haptic('soft');
        realm()?.pulse?.('ripple', { x: px, y: py });
        if (!low) later(() => realm()?.pulse?.('success', { x: px, y: py - 20 }), 300);
        sparkle(px, py - 14, 8);
        const k2 = lanterns.length / held.length;
        realm()?.setMood?.({ heaviness: 0.45 - k2 * 0.2, warmth: 0.5 + k2 * 0.2, clarity: 0.25 + k2 * 0.3 });
        realm()?.transform?.(0.3 + k2 * 0.4);
        feel({ comforted: 0.55 + k2 * 0.15, sad: 0.35 - k2 * 0.15, hopeful: 0.1 + k2 * 0.1 }, 0.65, 0.25 - k2 * 0.1, { quiet: true });
        world.react(lanterns.length === held.length ? 'comfort' : 'nod');
        if (!toPlace().length) resolve();
      };
      requestAnimationFrame(glide);
    };
    const down = (e) => {
      const d = toPlace().find((b) => Math.hypot(b.x - e.clientX, b.y - e.clientY) < 34);
      if (!d) return;
      dragging = d; d.drag = true; sx = e.clientX; sy = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
      haptic('light');
    };
    const move = (e) => { if (dragging) { dragging.x = e.clientX; dragging.y = e.clientY; } };
    const up = (e) => {
      const d = dragging; dragging = null;
      if (!d) return;
      const moved = Math.hypot(e.clientX - sx, e.clientY - sy);
      if (moved < 10) { setAfloat(d, W * (0.25 + Math.random() * 0.5), mix(bandTop(), bandBottom(), 0.5)); return; }
      if (e.clientY > hy() - 10) setAfloat(d, e.clientX, e.clientY);
      else { d.drag = false; audio.ui?.('tap'); }
    };
    on(canvas, 'pointerdown', down); on(canvas, 'pointermove', move); on(canvas, 'pointerup', up); on(canvas, 'pointercancel', up);
    on(floatAll, 'click', () => {
      if (auto) return; auto = true; floatAll.disabled = true;
      toPlace().forEach((d, i) => later(() => setAfloat(d, W * [0.5, 0.25, 0.75][i % 3], mix(bandTop(), bandBottom(), [0.4, 0.75, 0.7][i % 3])), i * 650));
    });
  });
  if (signal.aborted) return result;
  world.fx.classList.remove('live');
  hands.show = false;
  anchor = null;
  await pause(500);
  await say(lanterns.length > 1 ? 'Look at them glowing. Still yours. Just not in the dark any more.' : 'Look at it glowing. Still yours. Just not in the dark any more.', 3200);
  if (signal.aborted) return result;

  // ======================================== 4. ONE SMALL KINDNESS ==
  setMove(3, { eyebrow: 'Move 4 of 4', title: 'One small kindness', prompt: 'Something gentle for right now. Pick one.' });
  place(H < 700 ? { x: 50, y: 36, scale: 0.4 } : { x: 50, y: 30, scale: 0.46 });
  feel({ comforted: 0.6, sad: 0.25, loved: 0.15 }, 0.6, 0.1);
  labelsOn = false; // the choices sit over the water; keep the lanterns but hide their words
  realm()?.transform?.(0.75);
  const grid = h('div', { class: 'choice-grid', role: 'group', 'aria-label': 'One small kindness' });
  const SAFE = 'If it ever feels like too much, the support button is always there.';
  const note = h('p', { class: 'muted', style: { ...SOFT, margin: '0', minHeight: '20px', fontSize: H < 700 ? 'var(--type-label-size)' : '' }, 'aria-live': 'polite' }, H < 700 ? SAFE : '');
  const doneBtn = h('button', { class: 'btn primary block', disabled: true }, 'I’ll do that');
  const safety = H < 700 ? null : h('p', { class: 'muted', style: { ...SOFT, margin: '0', fontSize: 'var(--type-caption-size)' } }, SAFE);
  for (const [id, label, line] of KIND) {
    const b = h('button', { class: 'choice', 'aria-pressed': 'false', style: H < 700 ? { minHeight: '48px', padding: '6px 10px', fontSize: 'var(--type-label-size)' } : { minHeight: '52px', padding: '8px 12px', fontSize: 'var(--type-control-size)' } }, label);
    on(b, 'click', () => {
      grid.querySelectorAll('.choice').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      result.kindness = id;
      note.textContent = line;
      doneBtn.disabled = false;
      audio.ui?.('select'); haptic('light');
      world.react('nod');
    });
    grid.append(b);
  }
  dock.replaceChildren(...[grid, note, doneBtn, safety].filter(Boolean));
  await until((resolve) => on(doneBtn, 'click', resolve));
  if (signal.aborted) return result;

  // ======================================================= FINALE ==
  dock.replaceChildren();
  setMove(4, { eyebrow: 'The Raindrop Lagoon', title: 'Held, not fixed', prompt: '' });
  place({ x: 50, y: 40, scale: 0.82 });
  realm()?.transform?.(1);
  realm()?.setMood?.({ heaviness: 0.2, warmth: 0.75, clarity: 0.6, agitation: 0.02 });
  realm()?.pulse?.('clear', { x: W / 2, y: hy() + 30 });
  glowBoost = 1;
  lanterns.forEach((L, i) => later(() => { sparkle(L.x, L.y - 14, 6); if (!low) realm()?.pulse?.('success', { x: L.x, y: L.y }); }, 200 + i * 260));
  audio.fx?.('clear', { intensity: 0.6 });
  haptic('success');
  labelsOn = true;
  feel({ comforted: 0.65, loved: 0.2, sad: 0.15 }, 0.7, 0.2);
  world.react('comfort');
  const kindLabel = KIND.find(([id]) => id === result.kindness)?.[1] || '';
  await say('You held that so gently. It can still hurt — and I’m still here. Always, okay?', 3800);
  if (signal.aborted) return result;
  await pause(400);
  cleanup();
  result.completed = true;
  result.summary = [
    { label: result.drops.length > 1 ? 'Drops you caught' : 'The drop you caught', text: cap(listJoin(result.drops.map((d) => d.label))) },
    { label: 'Held', text: 'Held in your hands until it warmed — not fixed, just held' },
    { label: 'On the lagoon', text: lanterns.length > 1 ? `${lanterns.length} lily-lanterns glowing on the water` : 'One lily-lantern glowing on the water' },
    { label: 'One small kindness', text: kindLabel || '—' },
  ];
  result.share = { title: 'Held, not fixed', subtitle: 'Blubi kept me company on the Raindrop Lagoon.' };
  return result;
}

// Rule-based ordering: put the chip that most often fits the chosen feelings first.
function chipOrder(emotions) {
  const ids = emotions.map((e) => e.id);
  const has = (re) => ids.some((id) => re.test(id));
  const first = [];
  if (has(/homesick/)) first.push('home');
  if (has(/grief|mourn|bereft|longing|heartbreak|heartache|saudade|nostalg|wistful|anticipatory/)) first.push('miss', 'lost');
  if (has(/lonel|reject|exclu|alien|abandon|isolat|ghost|unloved|disconnect|forgot|invisible|unappreciated|misunderstood|judged/)) first.push('left-out');
  if (has(/disappoint|disillusion|discourag|defeat|dejection/)) first.push('hoped');
  if (has(/regret/)) first.push('differently');
  if (has(/hurt|betray/)) first.push('words');
  const seen = new Set();
  return [...first, ...HOLDS.map(([id]) => id)].filter((id) => !seen.has(id) && seen.add(id)).map((id) => HOLDS.find(([x]) => x === id));
}

function listJoin(a) { return a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`; }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
