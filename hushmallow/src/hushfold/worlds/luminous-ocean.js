// Loomi's Luminous Ocean — the second Hushflow world.
//
// Mechanic: sweep the water. Slow, long sweeps raise tall, smooth swells
// that roll out to the horizon; quick strokes make busy, choppy splashes
// that go nowhere. Long swells carry whatever floats on them farther out —
// including your Thought Mallow, which stays visible and readable the whole
// time, just smaller and quieter. That is the discovery: you can make room
// around a thought without fighting it. (Cognitive defusion, in game form.)
//
// Everything is drawn on one canvas in perspective: sky, moon, a stack of
// wave rows from horizon to shore, glitter on the crests, and floating
// things (the thought, your optional photos) drawn between the rows at their
// own depth.

import { OCEAN } from '../data/lines.js';
import { photoSession } from '../../v3/photos.js';
import { h } from '../../app/ui.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clock = () => performance.now() / 1000;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

const ROWS = 26;
const S_MIN = 0.07;
const sOfZ = (z) => Math.pow(1 - z, 1.7) * (1 - S_MIN) + S_MIN;       // perspective scale at depth z (0 shore … 1 horizon)
const zOfS = (s) => 1 - Math.pow(clamp((s - S_MIN) / (1 - S_MIN), 0, 1), 1 / 1.7);
const dOfS = (s) => 1 / s - 1;                                          // "distance" along the water
const sOfD = (d) => 1 / (d + 1);

export default function luminousOcean(ctx) {
  const { bg: canvas, subs, app, reduced } = ctx;
  const g = canvas.getContext('2d', { alpha: false });
  let W = 1, H = 1, dpr = 1, hy = 1, sky = null;
  let time = 0, rise = ctx.fromStorm ? 0 : 1, paused = false;
  const swells = [];      // { d, c, amp, sigma, x, wx, born, long }
  const ripples = [];     // { x, z, t }
  const spray = [];
  const strokes = new Map();
  let chop = 0, chopT = 0, longCount = 0, longAfterChop = 0;
  let discovered = false, offered = false, done = false, saidFar = false, saidBreath = false, completing = false;
  let thoughtD = dOfS(0.8), thoughtX = 0.5, bringBack = 0;
  const cards = photoSession.list.slice(0, 7).map((p, i) => ({ p, d: dOfS(0.75 - i * 0.05), x: 0.15 + (i % 4) * 0.23 + rand(-0.04, 0.04), rot: rand(-0.2, 0.2), sprite: null }));

  // a small "bring it closer" pill, only once the thought is out there
  const back = h('button', { class: 'hf-pill hf-bring', hidden: true, onclick: () => { bringBack = 1; back.hidden = true; } }, 'Bring it closer');
  ctx.ui.append(back);

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    hy = Math.round(H * 0.36);
    buildSky();
  }
  function buildSky() {
    sky = document.createElement('canvas');
    sky.width = Math.round(W * dpr); sky.height = Math.round((hy + 4) * dpr);
    const s = sky.getContext('2d');
    s.scale(dpr, dpr);
    const gr = s.createLinearGradient(0, 0, 0, hy);
    gr.addColorStop(0, '#040a24'); gr.addColorStop(0.55, '#0b2350'); gr.addColorStop(1, '#1d5a86');
    s.fillStyle = gr; s.fillRect(0, 0, W, hy + 4);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * W, y = Math.random() * hy * 0.85, r = Math.random() * 1.2 + 0.2;
      s.fillStyle = `rgba(220,240,255,${0.25 + Math.random() * 0.6})`;
      s.beginPath(); s.arc(x, y, r, 0, Math.PI * 2); s.fill();
    }
    const mx = W * 0.72, my = hy * 0.4;
    const mg = s.createRadialGradient(mx, my, 0, mx, my, W * 0.32);
    mg.addColorStop(0, 'rgba(230,250,255,0.55)'); mg.addColorStop(0.12, 'rgba(180,235,255,0.25)'); mg.addColorStop(1, 'rgba(120,200,255,0)');
    s.fillStyle = mg; s.fillRect(0, 0, W, hy + 4);
    s.fillStyle = '#f2fbff'; s.beginPath(); s.arc(mx, my, Math.min(W, H) * 0.045, 0, Math.PI * 2); s.fill();
    // horizon haze
    const hz = s.createLinearGradient(0, hy - 30, 0, hy + 4);
    hz.addColorStop(0, 'rgba(120,220,255,0)'); hz.addColorStop(1, 'rgba(140,230,255,0.35)');
    s.fillStyle = hz; s.fillRect(0, hy - 30, W, 34);
  }
  resize();

  const yOfZ = (z) => {
    const base = hy + (H - hy) * Math.pow(1 - z, 1.25);
    return base + (1 - ease(rise)) * (H - hy + 60);
  };
  const zOfY = (y) => { const t = clamp((y - hy) / (H - hy), 0, 1); return 1 - Math.pow(t, 1 / 1.25); };

  // tide: about 4 s rising and 6 s falling — something to breathe with, if you like
  function tide(t) {
    const p = (t % 10) / 10;
    return p < 0.4 ? -Math.cos((p / 0.4) * Math.PI) * 0.5 + 0.5 : Math.cos(((p - 0.4) / 0.6) * Math.PI) * 0.5 + 0.5;
  }

  /** Surface height (px, up is positive) at screen x and depth z. */
  function height(x, z) {
    const s = sOfZ(z);
    const d = dOfS(s);
    const xw = (x - W / 2) / (s * W);
    const amp = reduced ? 0.5 : 1;
    let hgt = Math.sin(xw * 5.1 + time * 0.9 + d * 1.7) * 0.32 + Math.sin(xw * 2.3 - time * 0.55 + d * 0.9) * 0.4 + Math.sin(xw * 11 + time * 1.7 - d * 2.3) * 0.08;
    hgt += (tide(time) - 0.5) * 0.5;
    for (const w of swells) {
      const dd = (d - w.d) / w.sigma;
      if (dd > 3 || dd < -3) continue;
      const ex = (x - w.x) / (w.wx * Math.max(0.35, s));
      const env = Math.exp(-ex * ex * 0.5);
      hgt += w.amp * Math.exp(-dd * dd) * env * (w.long ? 2.2 : 1.1) * (w.long ? 1 : Math.sin(xw * 26 + time * 9 + w.born));
    }
    hgt += chop * Math.sin(xw * 31 + time * 11) * Math.sin(xw * 7 - time * 5) * 0.5;
    return hgt * s * 16 * amp;
  }

  function addSwell(x, y, speedNorm, len) {
    const z = zOfY(y);
    const slowness = clamp(1 - (speedNorm - 0.18) / 1.0, 0, 1);
    const reach = clamp(len / (W * 0.6), 0.2, 1.2);
    const s = sOfZ(z);
    if (slowness > 0.42) {
      // a long swell rolls out from the shore side of the floating thought,
      // so whatever is on the water rides it outward
      swells.push({ d: Math.min(dOfS(s), thoughtD - 0.25), c: 0.35 + 0.5 * slowness, amp: (0.55 + 0.9 * slowness) * reach, sigma: 0.25 + 0.5 * slowness, x, wx: W * (0.45 + 0.6 * slowness), born: time, long: true, slowness });
      longCount++;
      if (chopT > 0.6) longAfterChop++;
      app.audio.fx('swish', { intensity: 0.25 + 0.3 * slowness, pan: (x / W) * 2 - 1 });
      app.haptic('soft');
    } else {
      swells.push({ d: dOfS(s), c: 0.6, amp: 0.4 * reach, sigma: 0.1, x, wx: W * 0.18, born: time, long: false, slowness });
      chop = Math.min(1.4, chop + 0.35);
      chopT += 0.4;
      if (!reduced) for (let i = 0; i < 14; i++) spray.push({ x: x + rand(-30, 30), y, vx: rand(-90, 90), vy: rand(-240, -90), life: rand(0.5, 0.9), age: 0 });
      app.audio.fx('drip', { intensity: 0.35, pan: (x / W) * 2 - 1 });
    }
    if (swells.length > 14) swells.shift();
  }

  function cardSprite(c) {
    if (c.sprite) return c.sprite;
    const cw = 120, ch = Math.round(120 / clamp(c.p.aspect, 0.6, 1.6)) + 16;
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const x = cv.getContext('2d');
    x.fillStyle = 'rgba(245,252,255,0.95)';
    roundRect(x, 0, 0, cw, ch, 10); x.fill();
    x.save(); roundRect(x, 6, 6, cw - 12, ch - 16, 6); x.clip();
    const k = Math.max((cw - 12) / c.p.w, (ch - 16) / c.p.h);
    x.drawImage(c.p.img, 6 + (cw - 12 - c.p.w * k) / 2, 6 + (ch - 16 - c.p.h * k) / 2, c.p.w * k, c.p.h * k);
    x.restore();
    c.sprite = cv;
    return cv;
  }

  const api = {
    id: 'luminous-ocean',
    get progress() { return clamp(1 - sOfD(thoughtD), 0, 1); },
    get done() { return done; },

    async enter() {
      app.audio.setAmbienceMood?.({ agitation: 0.1, clarity: 0.8 });
      await subs.say(OCEAN.intro, { who: 'Loomi' });
    },

    pointerDown(e) {
      strokes.set(e.pointerId, { x: e.clientX, y: e.clientY, len: 0, t0: clock() });
    },
    pointerMove(e) {
      const s = strokes.get(e.pointerId);
      if (!s) return;
      const d = Math.hypot(e.clientX - s.x, e.clientY - s.y);
      if (d < 1.5) return;
      s.len += d; s.x = e.clientX; s.y = e.clientY;
      // long continuous sweeps launch a swell every so often
      if (s.len > W * 0.42) {
        const dur = Math.max(0.05, clock() - s.t0);
        addSwell(e.clientX, e.clientY, s.len / dur / Math.min(W, H), s.len);
        s.len = 0; s.t0 = clock();
      }
    },
    pointerUp(e) {
      const s = strokes.get(e.pointerId);
      strokes.delete(e.pointerId);
      if (!s) return;
      const dur = Math.max(0.05, clock() - s.t0);
      if (s.len > 30) addSwell(s.x, s.y, s.len / dur / Math.min(W, H), s.len);
      else if (s.len < 10) {
        // a tap: a ripple ring and a gentle swell, so it works without dragging
        ripples.push({ x: s.x, z: zOfY(s.y), t: time });
        addSwell(s.x, s.y, 0.3, W * 0.25);
      }
    },

    update(dt) {
      if (paused) return;
      time += dt;
      rise = Math.min(1, rise + dt / (reduced ? 0.8 : 3));
      chop = Math.max(0, chop - dt * 0.5);
      for (const w of swells) { w.d += w.c * dt * (1 + w.d * 0.4); w.amp *= Math.exp(-dt * (w.long ? 0.09 : 0.9)); }
      for (let i = swells.length - 1; i >= 0; i--) if (swells[i].amp < 0.03 || swells[i].d > 14) swells.splice(i, 1);
      for (const p of spray) { p.age += dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      for (let i = spray.length - 1; i >= 0; i--) if (spray[i].age > spray[i].life) spray.splice(i, 1);
      for (let i = ripples.length - 1; i >= 0; i--) if (time - ripples[i].t > 2.4) ripples.splice(i, 1);

      // long swells carry floating things outward while their crest is underneath
      const carry = (d) => {
        let push = 0;
        for (const w of swells) {
          if (!w.long) continue;
          const dd = (d - w.d) / w.sigma;
          if (Math.abs(dd) < 0.9) push += w.c * w.amp * 0.55 * Math.exp(-dd * dd);
        }
        return push;
      };
      const th = ctx.thoughts()[0];
      if (th && !th.held) {
        if (bringBack > 0) { thoughtD = lerp(thoughtD, dOfS(0.82), Math.min(1, dt * 1.6)); if (Math.abs(thoughtD - dOfS(0.82)) < 0.02) bringBack = 0; }
        else thoughtD += carry(thoughtD) * dt;
        thoughtD = clamp(thoughtD, dOfS(0.95), dOfS(0.16));
        const s = sOfD(thoughtD), z = zOfS(s);
        thoughtX = lerp(thoughtX, 0.5 + Math.sin(time * 0.2) * 0.06, dt * 0.3);
        const x = thoughtX * W;
        th.scale = clamp(s * 1.1, 0.16, 1);
        th.tx = x; th.ty = yOfZ(z) - height(x, z) + 6 * s;
        th.x = lerp(th.x, th.tx, Math.min(1, dt * 6)); th.y = lerp(th.y, th.ty, Math.min(1, dt * 6));
        th.calm = Math.max(th.calm, clamp((0.85 - s) / 0.55, 0, 1) * 0.8);
        th.wordsAlpha = lerp(1, 0.78, clamp((0.6 - s) / 0.4, 0, 1));
        back.hidden = !(s < 0.45 && !bringBack);
      } else if (th && th.held) {
        // dragging it sets where it floats
        const z = zOfY(th.y);
        thoughtD = dOfS(sOfZ(z)); thoughtX = clamp(th.x / W, 0.08, 0.92);
        th.scale = clamp(sOfZ(z) * 1.1, 0.16, 1);
      }
      for (const c of cards) { c.d += carry(c.d) * dt; c.d = Math.min(c.d, dOfS(0.12)); }
      // Loomi bobs on the water near the shore
      ctx.setMallowBob?.(-height(W * 0.24, 0.04) * 0.9);
      const m = ctx.mallow();
      if (m) m.touch.calm = Math.max(m.touch.calm, 0.35 + clamp(longCount / 6, 0, 0.5));

      // discovery: felt the difference between choppy and long
      if (!discovered && ((chopT > 0.7 && longAfterChop >= 2) || longCount >= 4)) {
        discovered = true;
        subs.clear();
        m?.react('success');
        subs.say(chopT > 0.7 ? OCEAN.discovery : OCEAN.discovery.slice(1), { who: 'Loomi', hold: true, ack: 'I see it' }).then(() => {
          if (!saidBreath) { saidBreath = true; subs.say(OCEAN.breathe, { who: 'Loomi', priority: 'low' }); }
        });
      }
      const s = sOfD(thoughtD);
      if (th && !saidFar && s < 0.34) {
        saidFar = true;
        subs.say(OCEAN.far, { who: 'Loomi' }).then(() => { if (!offered) { offered = true; ctx.offerSkill('making-room'); } });
      }
      if (saidFar && offered && !completing && s < 0.3) {
        completing = true;
        setTimeout(() => subs.say(OCEAN.done, { who: 'Loomi' }).then(() => { done = true; ctx.complete(); }), 2500);
      }
      if (!th && !completing && longCount >= 5) {
        completing = true;
        subs.say(OCEAN.done, { who: 'Loomi' }).then(() => { done = true; ctx.complete(); });
      }
    },

    render() {
      if (canvas.clientWidth !== W || canvas.clientHeight !== H) resize();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(sky, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (rise < 1) { g.fillStyle = '#123a62'; g.fillRect(0, hy, W, H - hy); }
      const step = Math.max(6, Math.round(W / 70));
      const th = ctx.thoughts()[0];
      const thZ = th ? zOfS(sOfD(thoughtD)) : -1;
      const floats = cards.map((c) => ({ c, z: zOfS(sOfD(c.d)) })).sort((a, b) => b.z - a.z);
      let fi = 0;
      for (let j = ROWS; j >= 0; j--) {
        const z = (j / ROWS) * 0.995;
        const s = sOfZ(z);
        const y0 = yOfZ(z);
        g.beginPath();
        g.moveTo(-10, H + 10);
        let px = 0, ppy = 0;
        const crest = [];
        for (let x = -step; x <= W + step; x += step) {
          const yy = y0 - height(x, z);
          g.lineTo(x, yy);
          if (x > 0 && yy < ppy - 0.6 * s) crest.push([x, yy]);
          px = x; ppy = yy;
        }
        void px;
        g.lineTo(W + 10, H + 10);
        g.closePath();
        // nearer rows are deeper teal; far rows pick up the sky
        const near = 1 - z;
        g.fillStyle = `rgb(${Math.round(lerp(40, 8, near))},${Math.round(lerp(110, 46, near))},${Math.round(lerp(160, 92, near))})`;
        g.fill();
        // luminous crest line
        g.strokeStyle = `rgba(150,240,255,${0.12 + 0.25 * s})`;
        g.lineWidth = Math.max(0.6, 1.8 * s);
        g.beginPath();
        for (let x = -step; x <= W + step; x += step) { const yy = y0 - height(x, z) - 0.5; x === -step ? g.moveTo(x, yy) : g.lineTo(x, yy); }
        g.stroke();
        // glitter where the water rises
        g.fillStyle = `rgba(190,255,250,${0.5 + 0.4 * s})`;
        for (let i = 0; i < crest.length; i += 2) {
          if (((i * 7919 + j * 31 + Math.floor(time * 3)) % 5) !== 0) continue;
          const [cx, cy] = crest[i];
          g.fillRect(cx, cy - 1, Math.max(1, 2.2 * s), Math.max(1, 1.4 * s));
        }
        // things floating at this depth
        while (fi < floats.length && floats[fi].z >= z) {
          const { c, z: cz } = floats[fi++];
          const cs = sOfZ(cz), x = c.x * W, yy = yOfZ(cz) - height(x, cz);
          const sp = cardSprite(c);
          g.save(); g.translate(x, yy); g.rotate(c.rot + Math.sin(time + c.x * 9) * 0.06);
          const k = cs * 0.9;
          g.globalAlpha = 0.95; g.drawImage(sp, -sp.width * k / 2, -sp.height * k * 0.85, sp.width * k, sp.height * k);
          g.restore(); g.globalAlpha = 1;
        }
        void thZ;
      }
      // moon path
      g.globalCompositeOperation = 'lighter';
      const mx = W * 0.72;
      for (let j = 2; j < ROWS; j++) {
        const z = j / ROWS, s = sOfZ(z), y = yOfZ(z) - height(mx, z);
        const wv = (12 + 70 * s) * (0.6 + 0.4 * Math.sin(time * 2 + j));
        g.fillStyle = `rgba(200,245,255,${0.06 + 0.1 * (1 - s)})`;
        g.fillRect(mx - wv / 2 + Math.sin(time * 1.3 + j * 1.7) * 8 * s, y - 1, wv, Math.max(1, 2.5 * s));
      }
      // tap ripples
      for (const r of ripples) {
        const a = (time - r.t) / 2.4, s = sOfZ(r.z), y = yOfZ(r.z);
        g.strokeStyle = `rgba(170,250,255,${0.5 * (1 - a)})`; g.lineWidth = 1.5;
        g.beginPath(); g.ellipse(r.x, y, 10 + a * 140 * s, (10 + a * 140 * s) * 0.28, 0, 0, Math.PI * 2); g.stroke();
      }
      for (const p of spray) { g.fillStyle = `rgba(200,250,255,${0.8 * (1 - p.age / p.life)})`; g.fillRect(p.x, p.y, 2, 2); }
      g.globalCompositeOperation = 'source-over';
    },

    pause() { paused = true; },
    resume() { paused = false; },
    resize,
    destroy() { back.remove(); },
  };
  return api;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
