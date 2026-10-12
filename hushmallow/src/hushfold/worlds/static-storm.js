// Glitzi's Static Storm — the first Hushflow world.
//
// Mechanic: your pace is the weather. Drawing fast throws jagged lightning,
// raises the storm and charges your Thought Mallow; drawing slowly lays down
// smooth ribbons of light that gather the charge out of the thought and heal
// the sky. Nobody tells you to slow down first — the storm just responds, and
// the discovery lines only arrive once you have felt both.
//
// The backdrop is the existing Static Storm realm (src/world/realms), driven
// through its mood API; this module adds the gameplay layer on top.

import { STORM, TOUCH_QUIPS } from '../data/lines.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export default function staticStorm(ctx) {
  const { canvas, subs, app, reduced } = ctx;
  const g = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1;
  const trails = [];           // { pts:[{x,y,t,slow,fast}], id }
  const active = new Map();    // pointerId -> trail
  const bolts = [];            // { pts, t, life, hue }
  const sparks = [];           // drifting static + discharge sparks
  const boltTimes = [];
  let charge = ctx.startCharge ?? 0.75;   // the storm's agitation 0..1
  let fastT = 0, slowT = 0, slowAfterFast = 0, stillT = 0, idleT = 0, time = 0;
  let discovered = false, done = false, saidFast = false, saidSlow = false, hinted = false, completing = false;
  let chargeHold = null;
  let paused = false;
  let lastFastAt = -1, lastSlowAt = -1;   // event-clock seconds
  let offerP = null;                      // the skill offer, so completion waits for it
  const clock = () => performance.now() / 1000;

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  resize();

  for (let i = 0; i < 60; i++) sparks.push(ambient());
  function ambient() { return { x: rand(0, W), y: rand(0, H), vx: rand(-20, 20), vy: rand(-10, 10), life: rand(2, 6), age: rand(0, 3), kind: 'static', r: rand(0.8, 2) }; }

  const realm = () => app.world?.realm;
  function applyMood() {
    realm()?.setMood({ agitation: charge, clarity: clamp(1 - charge * 1.1, 0.05, 1), heaviness: 0.2 * charge, warmth: 0.35 + (1 - charge) * 0.4 });
    realm()?.transform(clamp((0.55 - charge) / 0.5, 0, 1));
    app.audio.setAmbienceMood?.({ agitation: charge, clarity: 1 - charge });
  }

  function quip(kind) {
    const lines = TOUCH_QUIPS.glitzi[kind];
    if (lines) subs.say(lines[Math.floor(Math.random() * lines.length)], { who: 'Glitzi', priority: 'low' });
  }

  function bolt(x0, y0, x1, y1) {
    const now = performance.now();
    while (boltTimes.length && now - boltTimes[0] > 1000) boltTimes.shift();
    if (boltTimes.length >= 3) return;          // photosensitivity: at most three bright bursts a second
    boltTimes.push(now);
    const pts = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const j = i === 0 || i === n ? 0 : rand(-1, 1) * 26 * Math.sin(Math.PI * t);
      const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1;
      pts.push([x0 + (x1 - x0) * t + (nx / l) * j, y0 + (y1 - y0) * t + (ny / l) * j]);
    }
    bolts.push({ pts, t: 0, life: reduced ? 0.4 : 0.22, hue: Math.random() < 0.5 ? '#3ee8ff' : '#ff3df2' });
    realm()?.pulse(reduced ? 'tap' : 'strike', { x: x1, y: y1 });
    app.audio.fx('crackle', { intensity: 0.4 + charge * 0.4, pan: (x1 / W) * 2 - 1 });
    app.haptic('tick');
  }

  const api = {
    id: 'static-storm',
    get charge() { return charge; },
    get progress() { return clamp(1 - charge, 0, 1); },
    get done() { return done; },
    get pace() { return { fastT: +fastT.toFixed(2), slowT: +slowT.toFixed(2), slowAfterFast: +slowAfterFast.toFixed(2), discovered }; },

    async enter() {
      applyMood();
      await subs.say(STORM.intro, { who: 'Glitzi' });
    },

    pointerDown(e) {
      const tr = { id: e.pointerId, pts: [{ x: e.clientX, y: e.clientY, t: time, v: 0 }], speed: 0, born: time, et: clock(), n: 0 };
      trails.push(tr); active.set(e.pointerId, tr);
      if (trails.length > 24) trails.shift();
      idleT = 0;
    },
    pointerMove(e) {
      const tr = active.get(e.pointerId);
      if (!tr) return;
      const last = tr.pts[tr.pts.length - 1];
      const d = Math.hypot(e.clientX - last.x, e.clientY - last.y);
      if (d < 2) return;
      // pace is measured on the event clock, not the frame clock, so a slow
      // or busy device still reads the finger's real speed
      const et = clock();
      const dt = Math.max(0.008, et - tr.et);
      tr.et = et;
      const v = d / dt;
      tr.speed = tr.n ? tr.speed + (v - tr.speed) * 0.35 : v;
      tr.n++;
      const norm = tr.speed / Math.min(W, H);            // screens per second
      const sure = tr.n >= 3;                            // the first samples are noise
      const fast = sure && norm > 1.35, slow = sure && norm > 0.05 && norm < 0.75;
      tr.pts.push({ x: e.clientX, y: e.clientY, t: time, v: norm, fast, slow });
      if (tr.pts.length > 160) tr.pts.shift();
      idleT = 0; stillT = 0;
      if (!paused) {
        const seg = Math.min(0.1, dt);
        if (fast) { lastFastAt = et; fastT += seg; charge = Math.min(1, charge + seg * 0.4); }
        else if (slow) {
          lastSlowAt = et; slowT += seg;
          if (fastT > 0.6) slowAfterFast += seg;
          charge = Math.max(0, charge - seg * 0.085);
        }
      }
      if (fast && Math.random() < 0.35) {
        // lightning to the thought if it's near, else to a random cloud point
        const th = ctx.thoughts()[0];
        const head = th?.head();
        if (head && Math.hypot(head.x - e.clientX, head.mid - e.clientY) < 240) { bolt(e.clientX, e.clientY, head.x, head.mid); th.charge = Math.min(1, th.charge + 0.1); th.calm = Math.max(0, th.calm - 0.03); }
        else bolt(e.clientX, e.clientY, e.clientX + rand(-120, 120), rand(H * 0.05, H * 0.3));
      }
    },
    pointerUp(e) { active.delete(e.pointerId); },

    update(dt) {
      if (paused) return;
      time += dt;
      idleT += dt;
      // pace: fast and slow time are counted as the finger moves (pointerMove);
      // here we only notice a resting finger and let the sky settle
      const et = clock();
      const fastNow = et - lastFastAt < 0.25, slowNow = et - lastSlowAt < 0.25;
      for (const tr of active.values()) if (et - tr.et > 0.25) { stillT += dt; break; }
      if (fastNow) {
        if (!saidFast && fastT > 0.8) { saidFast = true; quip('jiggle'); subs.say(STORM.fast[Math.floor(Math.random() * STORM.fast.length)], { who: 'Glitzi', priority: 'low' }); }
        chargeHold ||= app.audio.hold('charge', { intensity: 0.3 });
        chargeHold?.update?.({ intensity: 0.25 + charge * 0.5 });
      } else if (chargeHold) { chargeHold.stop?.(); chargeHold = null; }
      if (!slowNow && stillT > 1) {
        // a finger simply resting on the glass also calms things, more gently
        slowT += dt * 0.5;
        charge = Math.max(0, charge - dt * 0.04);
      }
      if (slowNow || stillT > 1) {
        if (!saidSlow && slowT > 1.6) { saidSlow = true; subs.say(STORM.slow[0], { who: 'Glitzi', priority: 'low' }); }
      } else if (!fastNow) {
        charge = Math.max(0.05, charge - dt * 0.012);
      }
      // the thought discharges into nearby slow ribbons
      const th = ctx.thoughts()[0];
      if (th) {
        const head = th.head();
        let near = false;
        for (const tr of trails) {
          for (let i = tr.pts.length - 1; i >= Math.max(0, tr.pts.length - 40); i -= 3) {
            const p = tr.pts[i];
            if (!p.slow || time - p.t > 3) continue;
            if (Math.hypot(p.x - head.x, p.y - head.mid) < Math.max(150, head.w * 1.4)) {
              near = true;
              if (Math.random() < dt * 14 && th.charge > 0.05) sparks.push({ x: head.x + rand(-head.w / 3, head.w / 3), y: head.mid, tx: p.x, ty: p.y, life: 0.9, age: 0, kind: 'discharge', r: rand(1.5, 2.6) });
              break;
            }
          }
          if (near) break;
        }
        if (near) { th.calm = Math.min(1, th.calm + dt * 0.11); th.charge = Math.max(0, th.charge - dt * 0.2); }
        th.calm = Math.max(th.calm, (1 - charge) * 0.55);
        // crackle off a charged thought
        if (th.charge > 0.3 && Math.random() < dt * 6 * th.charge && !reduced) sparks.push({ x: head.x + rand(-head.w / 2, head.w / 2), y: head.mid + rand(-20, 20), vx: rand(-60, 60), vy: rand(-80, 10), life: 0.5, age: 0, kind: 'zap', r: rand(1, 2) });
        if (!hinted && time > 9 && slowT < 1.5) { hinted = true; subs.say(STORM.thought, { who: 'Glitzi', priority: 'low' }); }
      }
      // Glitzi's mood follows the storm
      const m = ctx.mallow();
      if (m) {
        m.touch.calm = Math.max(m.touch.calm, (1 - charge) * 0.6);
        if (charge > 0.7 && Math.random() < dt * 0.3) m.react('glitchBurst');
      }
      applyMood();
      // discovery: felt both paces
      if (!discovered && ((fastT > 0.6 && slowAfterFast > 2.4) || slowT > 6.5)) {
        discovered = true;
        const lines = fastT > 0.6 ? STORM.discovery : STORM.discoveryGentle;
        subs.clear();
        m?.react('success');
        offerP = subs.say(lines, { who: 'Glitzi', hold: true, ack: 'Oh!' }).then(() => ctx.offerSkill('slowing'));
      }
      if (discovered && !completing && charge < 0.2 && slowT > 8) {
        completing = true;
        Promise.resolve(offerP).then(() => new Promise((r) => setTimeout(r, 900))).then(() => {
          if (done) return;
          subs.say(STORM.done, { who: 'Glitzi' }).then(() => { done = true; ctx.complete(); });
        });
      }
      // particles
      for (const s of sparks) {
        s.age += dt;
        if (s.kind === 'discharge') { const k = Math.min(1, dt * 4); s.x += (s.tx - s.x) * k; s.y += (s.ty - s.y) * k; }
        else { const sp = s.kind === 'static' ? 0.4 + charge * 2.2 : 1; s.x += s.vx * dt * sp; s.y += s.vy * dt * sp; }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        if (sparks[i].age > sparks[i].life) { if (sparks[i].kind === 'static') sparks[i] = ambient(); else sparks.splice(i, 1); }
      }
      for (const b of bolts) b.t += dt;
      while (bolts.length && bolts[0].t > bolts[0].life) bolts.shift();
    },

    render() {
      if (canvas.clientWidth !== W || canvas.clientHeight !== H) resize();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      // static motes
      for (const s of sparks) {
        const a = Math.sin(Math.PI * clamp(s.age / s.life, 0, 1));
        if (s.kind === 'static') { g.fillStyle = `rgba(120,220,255,${0.25 * a * (0.4 + charge)})`; g.fillRect(s.x, s.y, s.r * 2.2, s.r * 0.8); }
        else { g.fillStyle = s.kind === 'zap' ? `rgba(255,120,240,${0.9 * a})` : `rgba(255,220,140,${0.95 * a})`; g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill(); }
      }
      // trails: slow parts are ribbons of light, fast parts are brittle static
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const tr of trails) {
        const P = tr.pts;
        for (let i = 1; i < P.length; i++) {
          const a = P[i - 1], b = P[i];
          const age = time - b.t;
          if (b.slow) {
            const life = 3.2;
            if (age > life) continue;
            const f = 1 - age / life;
            g.strokeStyle = `rgba(255,200,120,${0.16 * f})`; g.lineWidth = 22;
            g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
            g.strokeStyle = `rgba(150,240,255,${0.5 * f})`; g.lineWidth = 7;
            g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
            g.strokeStyle = `rgba(255,250,235,${0.85 * f})`; g.lineWidth = 2.2;
            g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
          } else {
            const life = 0.45;
            if (age > life) continue;
            const f = 1 - age / life;
            const j = reduced ? 0 : 5;
            g.strokeStyle = `rgba(255,80,230,${0.55 * f})`; g.lineWidth = 2;
            g.beginPath(); g.moveTo(a.x + rand(-j, j), a.y + rand(-j, j)); g.lineTo(b.x + rand(-j, j), b.y + rand(-j, j)); g.stroke();
          }
        }
      }
      // lightning
      for (const b of bolts) {
        const f = 1 - b.t / b.life;
        if (reduced) {
          const [x, y] = b.pts[b.pts.length - 1];
          const gr = g.createRadialGradient(x, y, 0, x, y, 60);
          gr.addColorStop(0, `rgba(160,230,255,${0.35 * f})`); gr.addColorStop(1, 'rgba(160,230,255,0)');
          g.fillStyle = gr; g.fillRect(x - 60, y - 60, 120, 120);
          continue;
        }
        for (const [w, a, c] of [[9, 0.18, b.hue], [3, 0.7, b.hue], [1.4, 1, '#ffffff']]) {
          g.strokeStyle = c; g.globalAlpha = a * f; g.lineWidth = w;
          g.beginPath(); b.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        }
        g.globalAlpha = 1;
      }
      g.globalCompositeOperation = 'source-over';
    },

    /** Melt: the static falls as glowing drops while the ocean rises. */
    melt() {
      for (const s of sparks) { s.kind = 'zap'; s.vx = rand(-8, 8); s.vy = rand(120, 260); s.life = s.age + rand(0.8, 1.6); }
      chargeHold?.stop?.(); chargeHold = null;
    },
    pause() { paused = true; chargeHold?.stop?.(); chargeHold = null; },
    resume() { paused = false; },
    resize,
    destroy() { chargeHold?.stop?.(); chargeHold = null; g.clearRect(0, 0, canvas.width, canvas.height); },
  };
  return api;
}
