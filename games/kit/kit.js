/* ThinkStill game kit: the shared mechanics, effects, characters, music and test helpers that every game in the
 * Reset and Reframe consoles is built from. A game receives a kit bound to its own scope (ctx.kit), so anything it
 * starts (timers, listeners, loops, sounds, canvases) is released when the console unmounts it.
 */
(function (env) {
  'use strict';
  const TS = env.TS;
  const TAU = Math.PI * 2;

  /* Expression moods for the seven bubble characters (circular art: show whole, never crop, text never on top). */
  const MOODS = {
    loopie: { neutral: 'E01', happy: 'E03', laugh: 'E18', love: 'E09', wow: 'E05', surprised: 'E58', worried: 'E52', sad: 'E30', cry: 'E25', angry: 'E66', cool: 'E21', wink: 'E17', think: 'E14', calm: 'E02', sleepy: 'E07', celebrate: 'E20', shy: 'E28', determined: 'E70', silly: 'E06', confused: 'E87', idea: 'E19', dizzy: 'E15', peace: 'E02', star: 'E43' },
    glitch: { neutral: 'E01', happy: 'E07', laugh: 'E18', love: 'E23', wow: 'E21', surprised: 'E20', worried: 'E36', sad: 'E92', cry: 'E86', angry: 'E10', cool: 'E35', wink: 'E29', think: 'E65', calm: 'E38', sleepy: 'E64', celebrate: 'E22', shy: 'E44', determined: 'E13', silly: 'E27', confused: 'E14', idea: 'E52', dizzy: 'E80', meltdown: 'E11', smug: 'E31', coffee: 'E74', scan: 'E46', nerd: 'E77', facepalm: 'E64', gasp: 'E34' },
    patch: { neutral: 'E01', happy: 'E14', laugh: 'E08', love: 'E11', wow: 'E52', surprised: 'E40', worried: 'E09', sad: 'E42', cry: 'E76', angry: 'E61', cool: 'E10', wink: 'E03', think: 'E38', calm: 'E19', sleepy: 'E30', celebrate: 'E87', shy: 'E53', determined: 'E61', silly: 'E73', confused: 'E54', idea: 'E37', hug: 'E05', cosy: 'E89' },
    drop: { neutral: 'E05', happy: 'E03', laugh: 'E20', love: 'E21', wow: 'E16', surprised: 'E23', worried: 'E57', sad: 'E80', cry: 'E69', angry: 'E62', cool: 'E39', wink: 'E14', think: 'E44', calm: 'E02', sleepy: 'E91', celebrate: 'E42', shy: 'E17', determined: 'E29', silly: 'E38', confused: 'E90', idea: 'E32', rain: 'E71', grow: 'E64', flower: 'E47' },
    rush: { neutral: 'E01', happy: 'E02', laugh: 'E40', love: 'E09', wow: 'E19', surprised: 'E13', worried: 'E58', sad: 'E37', cry: 'E47', angry: 'E31', cool: 'E17', wink: 'E06', think: 'E74', calm: 'E50', sleepy: 'E55', celebrate: 'E16', shy: 'E33', determined: 'E22', silly: 'E11', confused: 'E74', idea: 'E54', panic: 'E28', speed: 'E23', fume: 'E57' },
    still: { neutral: 'E01', happy: 'E07', laugh: 'E08', love: 'E09', wow: 'E27', surprised: 'E46', worried: 'E30', sad: 'E71', cry: 'E55', angry: 'E47', cool: 'E79', wink: 'E61', think: 'E45', calm: 'E02', sleepy: 'E19', celebrate: 'E35', shy: 'E31', determined: 'E64', silly: 'E62', confused: 'E45', idea: 'E81', meditate: 'E03', glow: 'E44', music: 'E58' },
    sync: { neutral: 'E01', happy: 'E03', laugh: 'E05', love: 'E11', wow: 'E20', surprised: 'E17', worried: 'E42', sad: 'E46', cry: 'E43', angry: 'E47', cool: 'E29', wink: 'E02', think: 'E60', calm: 'E10', sleepy: 'E23', celebrate: 'E61', shy: 'E12', determined: 'E51', silly: 'E33', confused: 'E60', idea: 'E57', storm: 'E27', dizzy: 'E49', rainbow: 'E98', moon: 'E90' }
  };
  TS.MOODS = MOODS;
  TS.CAST = Object.keys(MOODS);
  const faceUrl = (slug, mood) => { const m = MOODS[slug] || MOODS.loopie; return TS.face(MOODS[slug] ? slug : 'loopie', /^E\d+$/.test(mood || '') ? mood : (m[mood] || m.neutral)); };
  TS.faceUrl = faceUrl;

  const PENTA = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6'];

  TS.makeKit = (S) => {
    const A = TS.audio, h = TS.h;
    const K = { TAU, MOODS, h, S };
    const root = S.root;

    /* ---------------- geometry ---------------- */
    K.scaleOf = (el) => { el = el || root; const r = el.getBoundingClientRect(); return el.offsetWidth ? r.width / el.offsetWidth : 1; };
    K.local = (e, el) => { el = el || root; const r = el.getBoundingClientRect(); const sc = el.offsetWidth ? r.width / el.offsetWidth : 1; return { x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc }; };
    K.rectIn = (el, of) => { of = of || root; const a = el.getBoundingClientRect(), b = of.getBoundingClientRect(), sc = K.scaleOf(of); return { x: (a.left - b.left) / sc, y: (a.top - b.top) / sc, w: a.width / sc, h: a.height / sc, cx: (a.left - b.left + a.width / 2) / sc, cy: (a.top - b.top + a.height / 2) / sc }; };
    K.size = () => ({ w: root.clientWidth || 390, h: root.clientHeight || 700 });
    K.phone = () => (root.clientWidth || 390) < 700;
    K.clamp = TS.clamp; K.lerp = TS.lerp; K.ease = TS.ease; K.rng = TS.rng; K.pick = TS.pick;
    K.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    K.shuffle = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor((r ? r() : Math.random()) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    K.dark = () => TS.scene() === 'dark';
    K.reduced = () => TS.reduced();
    K.intensity = () => TS.intensity();
    K.token = (name) => getComputedStyle(root).getPropertyValue(name).trim();

    /* ---------------- canvas ---------------- */
    K.canvas = (parent, o) => {
      o = o || {};
      parent = parent || root;
      const c = h('canvas', { class: 'gk-canvas' + (o.cls ? ' ' + o.cls : ''), 'aria-hidden': 'true' });
      if (o.z != null) c.style.zIndex = o.z;
      if (o.before) parent.prepend(c); else parent.append(c);
      const st = { el: c, g: null, w: 0, h: 0, dpr: 1 };
      const cbs = [];
      const fit = () => {
        const w = c.clientWidth || parent.clientWidth, hh = c.clientHeight || parent.clientHeight;
        if (!w || !hh) return;
        const r = TS.fitCanvas(c, w, hh, o.maxDpr || 2);
        st.g = r.ctx; st.dpr = r.dpr; st.w = w; st.h = hh;
        cbs.forEach(f => { try { f(st); } catch (e) { console.error(e); } });
      };
      st.onResize = (f) => { cbs.push(f); if (st.w) f(st); };
      st.clear = () => { if (st.g) { st.g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); st.g.clearRect(0, 0, st.w, st.h); } };
      st.fit = fit;
      try { const ro = new ResizeObserver(() => fit()); ro.observe(c); S.onDestroy(() => ro.disconnect()); } catch (e) { S.listen(window, 'resize', fit); }
      fit();
      return st;
    };

    /* ---------------- time ---------------- */
    K.loop = (fn) => S.loop(fn);
    K.later = (fn, ms) => S.later(fn, ms);
    K.sleep = (ms) => S.sleep(TS.reduced() ? Math.min(ms, 400) : ms);
    K.wait = (ms) => S.sleep(ms);
    K.anim = (ms, fn, ease) => new Promise(res => {
      if (TS.reduced()) ms = Math.min(ms, 160);
      const t0 = performance.now();
      const step = () => {
        if (S.destroyed) return;
        const k = Math.min(1, (performance.now() - t0) / Math.max(1, ms));
        try { fn(ease ? ease(k) : k); } catch (e) { console.error(e); }
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });

    /* ---------------- particles ---------------- */
    const PRESETS = {
      spark: { life: [0.4, 0.9], speed: [120, 320], grav: 260, size: [1.5, 3.2], drag: 0.92, glow: true, color: ['#fff3c4', '#ffd36b', '#ffae4a'] },
      ember: { life: [1.2, 2.6], speed: [10, 40], grav: -40, size: [1, 2.4], drag: 0.99, glow: true, flicker: true, color: ['#ffb347', '#ff7a3d', '#ffe08a'] },
      dust: { life: [0.5, 1.1], speed: [20, 70], grav: -10, size: [2, 5], drag: 0.95, fade: true, color: ['rgba(200,190,210,0.5)'] },
      confetti: { life: [1.6, 3], speed: [160, 380], grav: 380, size: [5, 9], drag: 0.97, rect: true, spin: true, color: ['#ff5fa2', '#ffd36b', '#3fd0c9', '#8f7bff', '#7be08a', '#ff8a4d'] },
      bubble: { life: [1.6, 3.2], speed: [20, 60], grav: -70, size: [3, 9], drag: 0.99, ring: true, wobble: true, color: ['rgba(190,230,255,0.85)'] },
      petal: { life: [2.2, 4], speed: [30, 90], grav: 50, size: [4, 7], drag: 0.98, petal: true, spin: true, wobble: true, color: ['#ffc4d6', '#ffd9e6', '#ffe9b3', '#fff'] },
      snow: { life: [2.5, 4.5], speed: [10, 30], grav: 30, size: [1.5, 3.5], drag: 0.995, wobble: true, color: ['#ffffff', '#e8f4ff'] },
      mote: { life: [1.8, 3.6], speed: [8, 30], grav: -16, size: [1.5, 3], drag: 0.99, glow: true, wobble: true, color: ['#fff6d8', '#cfe9ff', '#ffe0f0'] },
      star: { life: [0.7, 1.4], speed: [60, 200], grav: 0, size: [2, 4], drag: 0.93, star: true, glow: true, color: ['#fffbe6', '#ffe58a'] },
      drop: { life: [0.6, 1.2], speed: [40, 140], grav: 520, size: [1.5, 3], drag: 0.99, color: ['rgba(170,210,255,0.9)'] },
      smoke: { life: [1.2, 2.4], speed: [8, 26], grav: -30, size: [8, 18], drag: 0.98, fade: true, grow: true, color: ['rgba(160,160,180,0.22)'] },
      leaf: { life: [2.5, 4.5], speed: [20, 70], grav: 60, size: [5, 8], drag: 0.985, petal: true, spin: true, wobble: true, color: ['#9ccf6b', '#e0b84f', '#d9823b'] }
    };
    K.particles = (o) => {
      o = o || {};
      const P = { list: [], max: o.max || (TS.intensity() === 2 ? 600 : 360) };
      const rr = (a) => a[0] + Math.random() * (a[1] - a[0]);
      P.emit = (preset, x, y, n, eo) => {
        const p = PRESETS[preset] || PRESETS.spark;
        eo = eo || {};
        n = Math.round((n || 12) * (TS.reduced() ? 0.35 : 1) * (TS.intensity() === 0 ? 0.7 : 1));
        for (let i = 0; i < n; i++) {
          const ang = eo.angle != null ? eo.angle + (Math.random() - 0.5) * (eo.spread ?? TAU) : Math.random() * TAU;
          const sp = rr(eo.speed || p.speed);
          const cols = eo.colors || p.color;
          P.list.push({ p, x: x + (eo.jitter ? (Math.random() - 0.5) * eo.jitter : 0), y: y + (eo.jitter ? (Math.random() - 0.5) * eo.jitter : 0),
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: rr(eo.life || p.life), age: 0, size: rr(eo.size || p.size), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8,
            col: cols[Math.floor(Math.random() * cols.length)], ph: Math.random() * TAU });
        }
        if (P.list.length > P.max) P.list.splice(0, P.list.length - P.max);
      };
      P.update = (dt) => {
        for (const q of P.list) {
          q.age += dt;
          const d = Math.pow(q.p.drag, dt * 60);
          q.vx *= d; q.vy = q.vy * d + q.p.grav * dt;
          q.x += q.vx * dt + (q.p.wobble ? Math.sin(q.age * 3 + q.ph) * 12 * dt : 0); q.y += q.vy * dt;
          if (q.p.spin) q.rot += q.vr * dt;
        }
        P.list = P.list.filter(q => q.age < q.life);
      };
      P.draw = (g) => {
        for (const q of P.list) {
          const k = 1 - q.age / q.life;
          const a = q.p.flicker ? k * (0.6 + 0.4 * Math.sin(q.age * 30 + q.ph)) : k;
          const s = q.size * (q.p.grow ? 1 + (1 - k) * 1.6 : 1);
          g.globalAlpha = Math.max(0, Math.min(1, a));
          if (q.p.glow) {
            const gl = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, s * 3);
            gl.addColorStop(0, q.col); gl.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gl; g.fillRect(q.x - s * 3, q.y - s * 3, s * 6, s * 6);
          }
          g.fillStyle = q.col; g.strokeStyle = q.col;
          if (q.p.rect) { g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.fillRect(-s / 2, -s / 4, s, s / 2); g.restore(); }
          else if (q.p.petal) { g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.beginPath(); g.ellipse(0, 0, s, s * 0.5, 0, 0, TAU); g.fill(); g.restore(); }
          else if (q.p.ring) { g.lineWidth = 1.2; g.beginPath(); g.arc(q.x, q.y, s, 0, TAU); g.stroke(); g.globalAlpha *= 0.5; g.beginPath(); g.arc(q.x - s * 0.3, q.y - s * 0.3, s * 0.25, 0, TAU); g.fill(); }
          else if (q.p.star) { starPath(g, q.x, q.y, s * 1.6, s * 0.6, 4, q.rot); g.fill(); }
          else { g.beginPath(); g.arc(q.x, q.y, s, 0, TAU); g.fill(); }
        }
        g.globalAlpha = 1;
      };
      P.count = () => P.list.length;
      return P;
    };
    function starPath(g, x, y, R, r, n, rot) {
      g.beginPath();
      for (let i = 0; i < n * 2; i++) { const a = (rot || 0) + i * Math.PI / n - Math.PI / 2, rad = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
      g.closePath();
    }
    K.starPath = starPath;

    /* ---------------- input ---------------- */
    /* Pointer press with capture and element-local coordinates (Framer canvas zoom aware). */
    K.press = (el, o) => {
      let active = null;
      const down = (e) => {
        if (active != null || (o.button !== false && e.button > 0)) return;
        active = e.pointerId;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
        if (o.prevent !== false) e.preventDefault();
        A.unlock();
        if (TS.ui.guide) TS.ui.guide.progress();
        o.down && o.down(K.local(e, o.space || el), e);
      };
      const move = (e) => { if (e.pointerId !== active) return; o.move && o.move(K.local(e, o.space || el), e); };
      const up = (e) => { if (e.pointerId !== active) return; active = null; o.up && o.up(K.local(e, o.space || el), e); };
      S.listen(el, 'pointerdown', down);
      S.listen(el, 'pointermove', move);
      S.listen(el, 'pointerup', up); S.listen(el, 'pointercancel', up); S.listen(el, 'lostpointercapture', up);
      return { active: () => active != null };
    };
    /* Drag with velocity. cb.start(p) -> false cancels. */
    K.drag = (el, o) => {
      let s = null, last = null, vx = 0, vy = 0, lt = 0;
      return K.press(el, {
        space: o.space,
        down: (p, e) => { if (o.start && o.start(p, e) === false) return; s = p; last = p; lt = performance.now(); vx = vy = 0; },
        move: (p, e) => {
          if (!s) return;
          const now = performance.now(), dt = Math.max(1, now - lt);
          vx = vx * 0.6 + ((p.x - last.x) / dt * 1000) * 0.4; vy = vy * 0.6 + ((p.y - last.y) / dt * 1000) * 0.4;
          last = p; lt = now;
          o.move && o.move(p, { dx: p.x - s.x, dy: p.y - s.y, vx, vy, start: s }, e);
        },
        up: (p, e) => { if (!s) return; const st = s; s = null; o.end && o.end(p, { dx: p.x - st.x, dy: p.y - st.y, vx, vy, start: st }, e); }
      });
    };
    /* Press-and-hold with live progress; optionally requires the finger to stay still. Keyboard: hold Space/Enter on the element. */
    K.hold = (el, o) => {
      const ms = o.ms || 1500;
      let t = 0, holding = false, origin = null, done = false, moved = false;
      const ctl = { progress: () => t / ms, reset() { t = 0; done = false; }, holding: () => holding };
      K.press(el, {
        space: o.space,
        down: (p) => { if (done && !o.repeat) return; holding = true; origin = p; moved = false; o.start && o.start(p); },
        move: (p) => { if (holding && o.still && origin && K.dist(p, origin) > o.still) { moved = true; o.wobble && o.wobble(p); } else if (holding && o.still && origin && K.dist(p, origin) <= o.still * 0.5) moved = false; },
        up: () => { if (!holding) return; holding = false; if (!done) o.cancel && o.cancel(t / ms); }
      });
      S.listen(el, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); holding = true; moved = false; o.start && o.start(null); } });
      S.listen(el, 'keyup', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && holding) { holding = false; if (!done) o.cancel && o.cancel(t / ms); } });
      S.loop((dt) => {
        if (done) return;
        if (holding && !moved) t = Math.min(ms, t + dt * 1000);
        else if (!holding && o.decay) t = Math.max(0, t - dt * 1000 * o.decay);
        o.progress && o.progress(t / ms, holding && !moved);
        if (t >= ms) { done = true; holding = false; o.done && o.done(); }
      });
      return ctl;
    };
    /* Fast tap (fires on pointerdown, keyboard Enter/Space on buttons fire via click). */
    K.tap = (el, fn) => {
      let downAt = 0;
      S.listen(el, 'pointerdown', (e) => { if (e.button > 0) return; downAt = performance.now(); A.unlock(); if (TS.ui.guide) TS.ui.guide.progress(); fn(e, downAt); });
      S.listen(el, 'click', (e) => { if (performance.now() - downAt < 600) return; fn(e, performance.now()); });
    };
    K.onKey = (codes, fn) => S.listen(window, 'keydown', (e) => {
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT')) return;
      if (!(root.contains(ae) || ae === document.body || !ae)) return;
      if (codes.includes(e.code) || codes.includes(e.key)) fn(e);
    });

    /* ---------------- rhythm (audio-time accurate) ---------------- */
    K.rhythm = (o) => {
      const R = { bpm: o.bpm || 90, target: o.bpm || 90, next: 0, index: 0, beats: [], running: false, ease: o.ease ?? 0.25, perBar: o.perBar || 4 };
      const vnow = () => A.now() - A.latency();
      R.start = (delay) => { A.unlock(); R.next = A.now() + (delay ?? 0.3); R.index = 0; R.beats = []; R.running = true; };
      R.stop = () => { R.running = false; };
      R.set = (bpm) => { R.target = bpm; };
      S.loop(() => {
        if (!R.running) return;
        const horizon = A.now() + 0.16;
        while (R.next < horizon) {
          const t = R.next, i = R.index;
          R.beats.push({ t, i, hit: false });
          try { o.onBeat && o.onBeat(t, i, i % R.perBar); } catch (e) { console.error(e); }
          R.bpm += (R.target - R.bpm) * R.ease;
          R.next += 60 / R.bpm; R.index++;
        }
        if (R.beats.length > 16) R.beats.splice(0, R.beats.length - 16);
      });
      R.window = () => {
        const vt = vnow();
        let prev = null, next = null;
        for (const b of R.beats) { if (b.t <= vt) prev = b; else { next = b; break; } }
        if (!next) next = { t: R.next, i: R.index };
        if (!prev) prev = { t: next.t - 60 / R.bpm, i: next.i - 1 };
        return { prev, next, p: TS.clamp((vt - prev.t) / Math.max(0.05, next.t - prev.t), 0, 1) };
      };
      R.pos = () => { const w = R.window(); return w.prev.i + w.p; };
      R.judge = () => { // grade a tap right now against the nearest beat
        const t = vnow();
        let best = null, bd = Infinity;
        R.beats.concat([{ t: R.next, i: R.index, hit: false, future: true }]).forEach(b => { const d = Math.abs(t - b.t); if (d < bd) { bd = d; best = b; } });
        const iv = 60 / R.bpm, inten = TS.intensity();
        const pw = [0.1, 0.075, 0.06][inten] + iv * 0.04, gw = [0.2, 0.16, 0.13][inten] + iv * 0.05;
        if (!best || best.hit) return { grade: 'repeat', delta: bd };
        const grade = bd <= pw ? 'perfect' : bd <= gw ? 'good' : (t < best.t ? 'early' : 'late');
        if (grade === 'perfect' || grade === 'good') best.hit = true;
        return { grade, delta: t - best.t, beat: best };
      };
      return R;
    };

    /* ---------------- characters ---------------- */
    K.face = faceUrl;
    /* An in-world bubble character with a speech bubble that never covers the art. */
    K.character = (slug, o) => {
      o = o || {};
      const size = o.size || (K.phone() ? 84 : 104);
      const wrap = h('div', { class: 'gk-char gk-side-' + (o.side || 'right'), style: { '--sz': size + 'px' }, 'aria-hidden': o.decor ? 'true' : null });
      const img = h('img', { class: 'gk-char-img', alt: '', draggable: 'false' });
      const bubble = h('div', { class: 'gk-bubble', hidden: true, role: 'status', 'aria-live': 'polite' }, h('span'));
      const text = bubble.firstChild;
      wrap.append(img, bubble);
      (o.parent || root).append(wrap);
      let base = o.mood || 'neutral', ft = 0, st = 0;
      img.src = faceUrl(slug, base);
      if (!TS.opts.staticRender) Object.values(MOODS[slug] || {}).slice(0, 12).forEach(e => { const i = new Image(); i.src = TS.face(slug, e); });
      const C = { el: wrap, img, bubble, slug };
      C.face = (mood, ms) => {
        S.cancel(ft);
        const src = faceUrl(slug, mood);
        if (img.getAttribute('src') !== src) img.src = src;
        img.classList.remove('gk-pop'); void img.offsetWidth; img.classList.add('gk-pop');
        if (ms) ft = S.later(() => { img.src = faceUrl(slug, base); }, ms); else base = mood;
        return C;
      };
      C.base = (mood) => { base = mood; return C.face(mood); };
      C.say = (line, so) => {
        so = so || {};
        S.cancel(st);
        if (!line) { bubble.hidden = true; return Promise.resolve(); }
        if (so.mood) C.face(so.mood, so.moodMs || 0);
        const p = TS.ui.say(bubble, line, { target: text, tick: () => { if (A.ctx && TS.settings.sound && Math.random() < 0.6) A.tone({ type: 'sine', freq: (o.voice || 520) + Math.random() * 120, dur: 0.035, vol: 0.022 }); } });
        if (so.ms !== 0) st = S.later(() => { bubble.hidden = true; }, so.ms || Math.max(2600, line.length * 60));
        return p;
      };
      C.hush = () => { S.cancel(st); bubble.hidden = true; };
      C.react = (kind) => { wrap.classList.remove('gk-r-bounce', 'gk-r-shake', 'gk-r-glitch', 'gk-r-spin'); void wrap.offsetWidth; if (!TS.reduced()) wrap.classList.add('gk-r-' + (kind || 'bounce')); };
      C.place = (x, y, ms) => { wrap.style.transition = ms && !TS.reduced() ? `left ${ms}ms cubic-bezier(.2,.9,.3,1), top ${ms}ms cubic-bezier(.2,.9,.3,1)` : 'none'; wrap.style.left = x + 'px'; wrap.style.top = y + 'px'; return C; };
      C.side = (side) => { wrap.classList.remove('gk-side-right', 'gk-side-left', 'gk-side-above', 'gk-side-below'); wrap.classList.add('gk-side-' + side); return C; };
      C.show = (v) => { wrap.hidden = v === false; return C; };
      if (o.x != null) C.place(o.x, o.y); else wrap.classList.add('gk-char-dock');
      return C;
    };

    /* ---------------- UI builders ---------------- */
    K.button = (label, onClick, o) => {
      o = o || {};
      const b = h('button', { type: 'button', class: 'ts-btn' + (o.quiet ? ' ts-btn-quiet' : '') + (o.cls ? ' ' + o.cls : ''), text: label });
      b.addEventListener('click', (e) => { A.unlock(); if (TS.ui.guide) TS.ui.guide.progress(); onClick && onClick(e); });
      if (o.parent) o.parent.append(b);
      return b;
    };
    K.chips = (parent, items, onPick, o) => {
      o = o || {};
      const wrap = h('div', { class: 'gk-chips' + (o.cls ? ' ' + o.cls : ''), role: 'group', 'aria-label': o.label || 'Choices' });
      const chosen = new Set();
      items.forEach((it, idx) => {
        const item = typeof it === 'string' ? { id: String(idx), label: it } : it;
        const b = h('button', { type: 'button', class: 'ts-chip gk-chip' + (item.user ? ' gk-user' : ''), 'aria-pressed': 'false', text: item.label, 'data-id': item.id });
        b.addEventListener('click', () => {
          A.unlock();
          if (o.multi) { if (chosen.has(item.id)) chosen.delete(item.id); else chosen.add(item.id); b.setAttribute('aria-pressed', String(chosen.has(item.id))); }
          else { wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); chosen.clear(); chosen.add(item.id); }
          if (A.ctx) A.click({ vol: 0.08 });
          onPick && onPick(item, b, chosen);
        });
        wrap.append(b);
      });
      (parent || root).append(wrap);
      wrap.chosen = chosen;
      return wrap;
    };
    K.userText = (text, cls) => h('span', { class: 'gk-user' + (cls ? ' ' + cls : ''), text });
    K.panel = (parent, o) => { o = o || {}; const p = h('div', { class: 'gk-panel' + (o.cls ? ' ' + o.cls : '') }); (parent || root).append(p); return p; };
    K.hint = (textIn) => {
      let el = root.querySelector(':scope > .gk-hint');
      if (!textIn) { if (el) el.hidden = true; return null; }
      if (!el) { el = h('div', { class: 'gk-hint', role: 'status' }); root.append(el); }
      el.hidden = false; el.textContent = textIn;
      return el;
    };
    K.slider = (parent, o) => {
      const id = 'gk' + Math.random().toString(36).slice(2, 7);
      const input = h('input', { type: 'range', class: 'gk-slider', id, min: o.min ?? 0, max: o.max ?? 10, step: o.step ?? 1, value: o.value ?? 5, 'aria-label': o.aria || o.label || 'Slider' });
      const out = h('output', { class: 'gk-slider-out', for: id, text: o.format ? o.format(Number(input.value)) : input.value });
      const wrap = h('div', { class: 'gk-slider-wrap' }, o.label ? h('label', { class: 'gk-label', for: id, text: o.label }) : null, h('div', { class: 'gk-slider-row' }, input, out),
        (o.left || o.right) ? h('div', { class: 'gk-slider-ends' }, h('span', { text: o.left || '' }), h('span', { text: o.right || '' })) : null);
      input.addEventListener('input', () => { const v = Number(input.value); out.textContent = o.format ? o.format(v) : String(v); if (A.ctx) A.click({ vol: 0.04 }); o.onInput && o.onInput(v); });
      input.addEventListener('change', () => o.onChange && o.onChange(Number(input.value)));
      (parent || root).append(wrap);
      return { wrap, input, out, value: () => Number(input.value) };
    };
    /* Title card that opens a game: the world, its name, the character's first line. Tap to skip. */
    K.intro = async (o) => {
      const card = h('div', { class: 'gk-intro', role: 'dialog', 'aria-label': o.title },
        o.char ? h('img', { class: 'gk-intro-img', alt: '', src: faceUrl(o.char, o.mood || 'happy') }) : null,
        h('h2', { class: 'gk-intro-title', text: o.title }),
        o.sub ? h('p', { class: 'gk-intro-sub', text: o.sub }) : null,
        o.how ? h('p', { class: 'gk-intro-how', text: o.how }) : null,
        h('span', { class: 'gk-intro-tap', text: 'Tap to start' }));
      root.append(card);
      if (A.ctx) A.whoosh({ vol: 0.1, dur: 0.5 });
      await new Promise(res => {
        let done = false;
        const go = () => { if (done) return; done = true; res(); };
        card.addEventListener('pointerdown', go);
        S.listen(window, 'keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') go(); });
        S.later(go, o.ms || (TS.reduced() ? 1600 : 3200));
      });
      card.classList.add('gk-intro-out');
      await S.sleep(TS.reduced() ? 10 : 320);
      card.remove();
    };
    /* A short banner pop ("Nice!", "Caught!") at a point or centre. */
    K.pop = (textIn, o) => {
      o = o || {};
      const el = h('div', { class: 'gk-pop-text ' + (o.kind ? 'gk-' + o.kind : ''), text: textIn, 'aria-hidden': 'true' });
      el.style.left = (o.x ?? K.size().w / 2) + 'px'; el.style.top = (o.y ?? K.size().h * 0.42) + 'px';
      root.append(el);
      S.later(() => el.remove(), 1000);
      return el;
    };
    K.progress = (parent, n) => {
      const el = h('div', { class: 'gk-steps', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': n, 'aria-valuenow': 0 });
      for (let i = 0; i < n; i++) el.append(h('i'));
      (parent || root).append(el);
      return { el, set(k) { el.setAttribute('aria-valuenow', k); Array.from(el.children).forEach((c, i) => c.classList.toggle('on', i < k)); } };
    };

    /* ---------------- guide arrows (every step) ---------------- */
    let gid = 0;
    K.guide = (spec) => { if (!spec) { TS.ui.guide.clear(); return; } TS.ui.guide.set(Object.assign({ id: (spec.id || 'g') + ':' + (++gid) }, spec)); };
    K.guideDone = () => TS.ui.guide.progress();
    S.onDestroy(() => TS.ui.guide.clear());

    /* ---------------- sound ---------------- */
    const at = () => performance.now();
    K.note = (n) => A.note(n);
    K.sfx = {
      tap(a) { if (!A.ctx) return; A.click({ vol: 0.1 }); A.sync('tap', a || at()); },
      ok(a) { if (!A.ctx) return; A.tone({ type: 'sine', freq: 660, to: 990, glide: 0.08, dur: 0.18, vol: 0.14 }); A.sync('ok', a || at()); },
      good(a, n) { if (!A.ctx) return; A.pluck(A.note(PENTA[Math.min(PENTA.length - 1, n || 4)]), { vol: 0.22, damp: 0.995, verb: 0.25 }); A.sync('good', a || at()); },
      great(a) { if (!A.ctx) return; ['C5', 'E5', 'G5'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.06, vol: 0.08, dur: 1.2 })); A.sync('great', a || at()); },
      soft(a) { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 300, to: 220, glide: 0.15, dur: 0.22, vol: 0.08 }); A.sync('soft', a || at()); },
      no(a) { if (!A.ctx) return; A.boing({ freq: 240, vol: 0.1 }); A.sync('no', a || at()); },
      whoosh(a) { if (!A.ctx) return; A.whoosh({ vol: 0.14, dur: 0.3 }); A.sync('whoosh', a || at()); },
      pop(a, f) { if (!A.ctx) return; A.pop({ vol: 0.18, freq: f || 560 }); A.sync('pop', a || at()); },
      thud(a) { if (!A.ctx) return; A.thud({ vol: 0.4 }); A.sync('thud', a || at()); },
      paper(a) { if (!A.ctx) return; A.paper({ vol: 0.14 }); A.sync('paper', a || at()); },
      chime(i, a) { if (!A.ctx) return; A.chime(A.note(PENTA[((i || 0) % PENTA.length + PENTA.length) % PENTA.length]), { vol: 0.1, dur: 1.4 }); A.sync('chime', a || at()); },
      rise(a) { if (!A.ctx) return; A.tone({ type: 'sine', freq: 300, to: 900, glide: 0.5, dur: 0.6, vol: 0.08, verb: 0.3 }); A.sync('rise', a || at()); },
      fall(a) { if (!A.ctx) return; A.tone({ type: 'sine', freq: 700, to: 200, glide: 0.5, dur: 0.6, vol: 0.08 }); A.sync('fall', a || at()); },
      lock(a) { if (!A.ctx) return; A.wood(undefined, 0.25, 1.4); A.click({ vol: 0.12 }); A.sync('lock', a || at()); },
      sparkle(a) { if (!A.ctx) return; for (let i = 0; i < 5; i++) A.tone({ when: A.now() + i * 0.05, type: 'sine', freq: 1800 + Math.random() * 1600, dur: 0.12, vol: 0.03 }); A.sync('sparkle', a || at()); },
      win(a) { if (!A.ctx) return; A.pad([A.note('C4'), A.note('E4'), A.note('G4'), A.note('C5')], { dur: 3.5, vol: 0.18, attack: 0.3 }); ['G5', 'C6', 'E6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + 0.15 + i * 0.12, vol: 0.08, dur: 1.8 })); A.sync('win', a || at()); },
      glitch(a) { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < 8; i++) A.tone({ when: t + i * 0.035, type: 'square', freq: 180 + Math.random() * 1600, dur: 0.03, vol: 0.04, lp: 3000 }); A.sync('glitch', a || at()); },
      heartbeat() { if (!A.ctx) return; const t = A.now(); A.tone({ when: t, type: 'sine', freq: 70, to: 50, dur: 0.18, vol: 0.3 }); A.tone({ when: t + 0.22, type: 'sine', freq: 62, to: 46, dur: 0.2, vol: 0.22 }); }
    };
    /* Generative music beds. Each returns {stop(), level(v)}; they schedule with the audio clock. */
    const STYLES = {
      calm: { bpm: 64, prog: [['C3', ['E4', 'G4', 'C5']], ['A2', ['E4', 'A4', 'C5']], ['F2', ['F4', 'A4', 'C5']], ['G2', ['D4', 'G4', 'B4']]], pluck: 0.08, pad: 0.06, perc: 0 },
      lofi: { bpm: 78, prog: [['D3', ['F4', 'A4', 'C5', 'E5']], ['G2', ['F4', 'A4', 'B4', 'D5']], ['C3', ['E4', 'G4', 'B4', 'D5']], ['A2', ['E4', 'G4', 'C5']]], pluck: 0.07, pad: 0.05, perc: 0.5 },
      noir: { bpm: 76, prog: [['D2', ['F4', 'A4', 'C5', 'E5']], ['G2', ['F4', 'A#4', 'D5']], ['E2', ['G4', 'A#4', 'C#5']], ['D2', ['F4', 'A4', 'D5']]], pluck: 0.05, pad: 0.03, perc: 0.35, walk: true },
      playful: { bpm: 104, prog: [['C3', ['C5', 'E5', 'G5']], ['F2', ['A4', 'C5', 'F5']], ['G2', ['B4', 'D5', 'G5']], ['C3', ['E5', 'G5', 'C6']]], pluck: 0.1, pad: 0.03, perc: 0.6, bounce: true },
      space: { bpm: 56, prog: [['A2', ['E4', 'A4', 'B4']], ['F2', ['C4', 'F4', 'G4']], ['C3', ['G4', 'C5', 'D5']], ['G2', ['D4', 'G4', 'A4']]], pluck: 0.05, pad: 0.08, perc: 0, twinkle: true },
      ocean: { bpm: 58, prog: [['D3', ['F#4', 'A4', 'D5']], ['B2', ['F#4', 'B4', 'D5']], ['G2', ['G4', 'B4', 'D5']], ['A2', ['E4', 'A4', 'C#5']]], pluck: 0.05, pad: 0.07, perc: 0, waves: true },
      musicbox: { bpm: 84, prog: [['C4', ['C6', 'E6', 'G6']], ['A3', ['A5', 'C6', 'E6']], ['F3', ['F5', 'A5', 'C6']], ['G3', ['G5', 'B5', 'D6']]], pluck: 0.06, pad: 0.02, perc: 0, bell: true },
      arcade: { bpm: 112, prog: [['A2', ['A4', 'C5', 'E5']], ['F2', ['F4', 'A4', 'C5']], ['C3', ['G4', 'C5', 'E5']], ['G2', ['G4', 'B4', 'D5']]], pluck: 0.08, pad: 0.02, perc: 0.7, square: true }
    };
    K.music = (style, o) => {
      o = o || {};
      const st = STYLES[style] || STYLES.calm;
      const M = { on: true, bpm: o.bpm || st.bpm, beat: 0, next: 0, vol: 1 };
      let waves = null;
      const startIt = () => { if (!A.ctx) return false; M.next = A.now() + 0.15; if (st.waves && !waves) { waves = A.loop({ pink: true, filter: 'lowpass', freq: 600, q: 0.4, bus: 'amb' }); } return true; };
      let started = startIt();
      S.on('audio-ready', () => { if (!started) started = startIt(); });
      S.loop((dt, t) => {
        if (!M.on || !A.ctx || !started) return;
        if (waves) { waves.level((0.06 + 0.05 * Math.sin(t * 0.5)) * M.vol, 0.5); }
        const ahead = A.now() + 0.2, inten = TS.intensity();
        while (M.next < ahead) {
          const time = M.next, i = M.beat, bar = Math.floor(i / 4) % st.prog.length, b = i % 4;
          const [bass, chord] = st.prog[bar], v = M.vol;
          if (b === 0) A.pluck(A.note(bass), { when: time, vol: 0.3 * v, damp: 0.994, lp: 700, bus: 'music' });
          if (st.walk && b !== 0) A.pluck(A.note(bass) * [1, 1.189, 1.335, 1.5][b], { when: time, vol: 0.24 * v, damp: 0.991, lp: 650, bus: 'music' });
          if (b === 0 && st.pad) chord.forEach((n, k) => A.tone({ when: time + k * 0.01, type: 'triangle', freq: A.note(n), dur: 60 / M.bpm * 4, vol: st.pad * v, attack: 0.5, lp: 1500, verb: 0.4, bus: 'music' }));
          const arp = chord[(i * (st.bounce ? 2 : 1)) % chord.length];
          if (st.bell) A.chime(A.note(arp), { when: time, vol: 0.05 * v, dur: 1.2, bus: 'music' });
          else if (st.square) A.tone({ when: time, type: 'square', freq: A.note(arp), dur: 0.12, vol: 0.025 * v, lp: 2200, bus: 'music' });
          else A.pluck(A.note(arp), { when: time + (b % 2 ? 0.02 : 0), vol: st.pluck * 1.6 * v, damp: 0.996, verb: 0.3, bus: 'music' });
          if (st.perc && inten > 0) {
            if (b === 0 || b === 2) A.kick(time, 0.22 * st.perc * v);
            if (b === 1 || b === 3) A.brush(time, 0.05 * st.perc * v, 0.14);
            A.shaker(time + 30 / M.bpm, 0.025 * st.perc * v);
          }
          if (st.twinkle && Math.random() < 0.35) A.tone({ when: time + Math.random() * 0.4, type: 'sine', freq: A.note(chord[Math.floor(Math.random() * chord.length)]) * 2, dur: 0.6, vol: 0.02 * v, verb: 0.6, bus: 'music' });
          M.beat++; M.next += 60 / M.bpm;
        }
      });
      M.stop = () => { M.on = false; if (waves) { waves.stop(); waves = null; } };
      M.level = (v) => { M.vol = v; };
      M.tempo = (bpm) => { M.bpm = bpm; };
      S.onDestroy(M.stop);
      return M;
    };
    K.ambience = (kind) => { const a = A.ambience(kind); S.onDestroy(() => a.stop(0.4)); return a; };

    /* ---------------- finales ---------------- */
    /* A library of spectacular endings. Games combine one with their own objects and colours, so each ending is the game's own. */
    K.finale = (kind, o) => {
      o = o || {};
      const dur = (o.ms || 3600) * (TS.reduced() ? 0.5 : 1);
      const cv = K.canvas(root, { cls: 'gk-finale' });
      const P = K.particles({ max: 900 });
      const W = () => cv.w, H = () => cv.h;
      const cols = o.colors || ['#ffd36b', '#ff8fb1', '#7fd8ff', '#b79bff', '#9ff0c0'];
      const from = (o.from && o.from.length ? o.from : [{ x: W() / 2, y: H() * 0.7 }]);
      const items = [];
      const t0 = performance.now();
      const big = o.text ? h('div', { class: 'gk-finale-text', text: o.text }) : null;
      if (big) root.append(big);
      if (A.ctx) {
        if (o.sound !== false) {
          const chord = o.chord || ['C4', 'E4', 'G4', 'B4'];
          A.pad(chord.map(n => A.note(n)), { dur: dur / 1000 + 1.5, vol: 0.16, attack: 0.6 });
        }
        A.sync('finale', performance.now());
      }
      const R = TS.rng(o.seed || 7);
      if (kind === 'lanterns') { const per = o.per || 3; from.forEach((p, i) => { for (let j = 0; j < per; j++) items.push({ x: p.x + (R() - 0.5) * 30, y: p.y + (R() - 0.5) * 10, vx: (R() - 0.5) * 18, d: i * 0.3 + j * 0.45, c: cols[(i + j) % cols.length], s: (j ? 0.55 : 0.85) + R() * 0.4 }); }); }
      if (kind === 'constellation') { const n = o.count || 7; for (let i = 0; i < n; i++) items.push({ x: W() * (0.15 + 0.7 * R()), y: H() * (0.12 + 0.35 * R()), d: 0.4 + i * 0.22, src: from[i % from.length] }); }
      if (kind === 'bloom') { const n = o.count || 9; for (let i = 0; i < n; i++) items.push({ x: W() * (0.1 + 0.8 * ((i + 0.5) / n)) + (R() - 0.5) * 20, y: H() * (0.62 + 0.25 * R()), d: i * 0.18, c: cols[i % cols.length], s: 0.7 + R() * 0.6, petals: 5 + Math.floor(R() * 3) }); }
      if (kind === 'fireworks') { const n = o.count || 6; for (let i = 0; i < n; i++) items.push({ x: W() * (0.2 + 0.6 * R()), y: H() * (0.18 + 0.25 * R()), d: i * 0.42, c: cols[i % cols.length], sx: from[i % from.length].x, sy: from[i % from.length].y, boom: false }); }
      if (kind === 'ripple') { const n = o.count || 5; for (let i = 0; i < n; i++) items.push({ x: (from[i % from.length] || {}).x ?? W() / 2, y: (from[i % from.length] || {}).y ?? H() / 2, d: i * 0.35, c: cols[i % cols.length] }); }
      let lastChime = -1;
      const lp = S.loop((dt) => {
        const t = (performance.now() - t0) / 1000, g = cv.g;
        if (!g) return;
        cv.clear();
        const k = Math.min(1, t / (dur / 1000));
        if (kind === 'aurora' || kind === 'sunrise' || kind === 'dawn') {
          const a = TS.ease.inOutSine(Math.min(1, t / 1.8));
          if (kind === 'aurora') {
            for (let b = 0; b < 4; b++) {
              g.beginPath();
              for (let x = 0; x <= W(); x += 12) { const y = H() * (0.18 + b * 0.07) + Math.sin(x * 0.012 + t * (0.7 + b * 0.2) + b) * 26 + Math.sin(x * 0.03 + t) * 8; if (x === 0) g.moveTo(x, y); else g.lineTo(x, y); }
              g.lineTo(W(), 0); g.lineTo(0, 0); g.closePath();
              const gr = g.createLinearGradient(0, 0, 0, H() * 0.5);
              gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, hexA(cols[b % cols.length], 0.22 * a));
              g.fillStyle = gr; g.fill();
            }
          } else {
            const gr = g.createRadialGradient(W() / 2, H() * 1.05, 10, W() / 2, H() * 1.05, H() * (0.4 + 0.8 * a));
            gr.addColorStop(0, hexA(cols[0], 0.75 * a)); gr.addColorStop(0.5, hexA(cols[1] || cols[0], 0.35 * a)); gr.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = gr; g.fillRect(0, 0, W(), H());
            for (let r = 0; r < 9; r++) { const ang = -Math.PI / 2 + (r - 4) * 0.22 + Math.sin(t * 0.3) * 0.02; g.strokeStyle = hexA(cols[0], 0.08 * a); g.lineWidth = 18; g.beginPath(); g.moveTo(W() / 2, H() * 1.05); g.lineTo(W() / 2 + Math.cos(ang) * H() * 1.2, H() * 1.05 + Math.sin(ang) * H() * 1.2); g.stroke(); }
          }
          if (Math.random() < 0.5) P.emit('mote', Math.random() * W(), H() * (0.4 + Math.random() * 0.5), 1);
        }
        if (kind === 'confetti' && t < 1.4 && Math.random() < 0.9) P.emit('confetti', W() * Math.random(), -10, 6, { angle: Math.PI / 2, spread: 0.8, speed: [60, 200], colors: cols });
        if (kind === 'confetti' && t < 0.1) from.forEach(p => P.emit('confetti', p.x, p.y, 40, { angle: -Math.PI / 2, spread: 1.2, colors: cols }));
        if (kind === 'bubbles' && t < dur / 1000 - 1) from.forEach(p => { if (Math.random() < 0.3) P.emit('bubble', p.x + (Math.random() - 0.5) * 40, p.y, 1); });
        if (kind === 'fireflies' && t < dur / 1000 - 0.8 && Math.random() < 0.5) P.emit('mote', Math.random() * W(), H() * (0.3 + Math.random() * 0.6), 1, { colors: ['#e9ff9a', '#fff3a0'] });
        if (kind === 'petals' && t < dur / 1000 - 1 && Math.random() < 0.7) P.emit('petal', Math.random() * W(), -10, 1, { angle: Math.PI / 2, spread: 0.6, speed: [30, 80], colors: cols });
        if (kind === 'lanterns' && t < dur / 1000 - 1 && Math.random() < 0.25) P.emit('mote', Math.random() * W(), H() * (0.2 + Math.random() * 0.5), 1, { colors: ['#fff3c4'] });
        if (kind === 'stars' && t < dur / 1000 - 1 && Math.random() < 0.6) P.emit('star', Math.random() * W(), Math.random() * H() * 0.6, 1, { speed: [5, 20] });
        if (kind === 'lanterns') items.forEach(it => {
          const lt = t - it.d; if (lt < 0) return;
          it.x += it.vx * dt; const y = it.y - lt * lt * 18 - lt * 40;
          const s = 16 * it.s, glow = g.createRadialGradient(it.x, y, 0, it.x, y, s * 3.2);
          glow.addColorStop(0, hexA(it.c, 0.55)); glow.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = glow; g.fillRect(it.x - s * 3.2, y - s * 3.2, s * 6.4, s * 6.4);
          g.fillStyle = it.c; g.beginPath(); g.moveTo(it.x - s * 0.6, y - s); g.lineTo(it.x + s * 0.6, y - s); g.lineTo(it.x + s * 0.75, y + s * 0.6); g.lineTo(it.x - s * 0.75, y + s * 0.6); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,250,220,0.9)'; g.fillRect(it.x - s * 0.2, y + s * 0.2, s * 0.4, s * 0.3);
          if (!it.rang && lt > 0.05) { it.rang = true; if (A.ctx) A.chime(A.note(PENTA[(items.indexOf(it) + 3) % PENTA.length]), { vol: 0.07, dur: 1.6 }); }
        });
        if (kind === 'constellation') {
          const pts = [];
          items.forEach((it, i) => {
            const lt = t - it.d; if (lt < 0) return;
            const kk = Math.min(1, lt / 0.9), e = TS.ease.inOutCubic(kk);
            const x = TS.lerp(it.src.x, it.x, e), y = TS.lerp(it.src.y, it.y, e) - Math.sin(kk * Math.PI) * 40;
            if (kk < 1) { P.emit('mote', x, y, 1, { speed: [2, 8] }); }
            else { pts.push(it); if (!it.rang) { it.rang = true; if (A.ctx) A.chime(A.note(PENTA[(i + 4) % PENTA.length]), { vol: 0.08, dur: 1.8 }); } }
            const gl = g.createRadialGradient(x, y, 0, x, y, 12); gl.addColorStop(0, 'rgba(255,248,225,1)'); gl.addColorStop(1, 'rgba(255,230,180,0)');
            g.fillStyle = gl; g.fillRect(x - 12, y - 12, 24, 24);
          });
          g.strokeStyle = 'rgba(255,240,205,0.6)'; g.lineWidth = 1.3; g.beginPath();
          for (let i = 1; i < pts.length; i++) { g.moveTo(pts[i - 1].x, pts[i - 1].y); g.lineTo(pts[i].x, pts[i].y); }
          g.stroke();
        }
        if (kind === 'bloom') items.forEach(it => {
          const lt = t - it.d; if (lt < 0) return;
          const gk = Math.min(1, lt / 0.9), bk = TS.clamp((lt - 0.6) / 0.8, 0, 1), s = 22 * it.s;
          g.strokeStyle = '#5fae6a'; g.lineWidth = 3; g.beginPath(); g.moveTo(it.x, H() + 4); g.quadraticCurveTo(it.x - 10, it.y + (H() - it.y) * 0.5, it.x, H() - (H() - it.y) * gk); g.stroke();
          if (bk > 0) {
            g.save(); g.translate(it.x, it.y); g.rotate(t * 0.15);
            for (let p = 0; p < it.petals; p++) { g.rotate(TAU / it.petals); g.fillStyle = hexA(it.c, 0.92); g.beginPath(); g.ellipse(0, -s * 0.55 * bk, s * 0.32 * bk, s * 0.55 * bk, 0, 0, TAU); g.fill(); }
            g.fillStyle = '#ffe48a'; g.beginPath(); g.arc(0, 0, s * 0.22 * bk, 0, TAU); g.fill(); g.restore();
            if (!it.rang) { it.rang = true; P.emit('petal', it.x, it.y, 4, { colors: [it.c] }); if (A.ctx) A.pluck(A.note(PENTA[(items.indexOf(it) + 2) % PENTA.length]), { vol: 0.16, damp: 0.996, verb: 0.3 }); }
          }
        });
        if (kind === 'fireworks') items.forEach(it => {
          const lt = t - it.d; if (lt < 0) return;
          const kk = Math.min(1, lt / 0.7);
          if (kk < 1) { const x = TS.lerp(it.sx, it.x, kk), y = TS.lerp(it.sy, it.y, TS.ease.outCubic(kk)); g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); if (Math.random() < 0.6) P.emit('ember', x, y, 1); }
          else if (!it.boom) { it.boom = true; P.emit('spark', it.x, it.y, 46, { colors: [it.c, '#fff6d0'] }); if (A.ctx) { A.noise({ filter: 'lowpass', freq: 800, dur: 0.4, vol: 0.12 }); A.chime(A.note(PENTA[(items.indexOf(it) + 5) % PENTA.length]), { vol: 0.07 }); } }
        });
        if (kind === 'ripple') items.forEach(it => {
          const lt = t - it.d; if (lt < 0) return;
          for (let r = 0; r < 3; r++) { const rr = (lt - r * 0.25) * 120; if (rr <= 0) continue; const a = Math.max(0, 1 - rr / (Math.max(W(), H()) * 0.6)); g.strokeStyle = hexA(it.c, 0.5 * a); g.lineWidth = 3; g.beginPath(); g.ellipse(it.x, it.y, rr, rr * 0.45, 0, 0, TAU); g.stroke(); }
          if (!it.rang) { it.rang = true; if (A.ctx) A.pluck(A.note(PENTA[(items.indexOf(it) + 1) % PENTA.length]), { vol: 0.18, damp: 0.997, verb: 0.4 }); }
        });
        if (kind === 'rainbow') {
          const a = TS.ease.outCubic(Math.min(1, t / 1.6));
          const rc = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
          rc.forEach((c, i) => { g.strokeStyle = hexA(c, 0.55); g.lineWidth = 10; g.beginPath(); g.arc(W() / 2, H() * 0.78, Math.min(W(), H()) * 0.45 - i * 10, Math.PI, Math.PI + Math.PI * a); g.stroke(); });
          if (Math.random() < 0.4) P.emit('star', W() * Math.random(), H() * 0.4 * Math.random(), 1, { speed: [5, 15] });
        }
        P.update(dt); P.draw(g);
        const ci = Math.floor(t * 2);
        if (kind !== 'constellation' && kind !== 'lanterns' && ci !== lastChime && t < dur / 1000 - 1 && (kind === 'stars' || kind === 'fireflies' || kind === 'aurora' || kind === 'petals')) { lastChime = ci; if (A.ctx && Math.random() < 0.6) A.chime(A.note(PENTA[(ci * 3) % PENTA.length]) * 2, { vol: 0.03, dur: 1.4 }); }
        if (k >= 1 && !o.keep) { lp.stop(); }
      });
      return new Promise(res => S.later(() => { if (!o.keep) { cv.el.classList.add('gk-finale-out'); S.later(() => cv.el.remove(), 500); } if (big) S.later(() => big.remove(), 600); res(); }, dur));
    };
    function hexA(hex, a) {
      const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
      if (!m) return hex;
      return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
    }
    K.hexA = hexA;

    /* ---------------- words ---------------- */
    K.words = (s, n) => TS.words(s, n);
    K.clean = (s, n) => TS.clean(s, n);
    /* Short phrases from the player's own words (for labels, cards, bubbles). Never invents words. */
    K.phrases = (text, max, maxWords) => {
      const raw = TS.clean(text || '', 600);
      if (!raw) return [];
      const parts = raw.split(/[.!?;\n]+|,\s+|\s+(?:and|but|so|because|then)\s+/i).map(x => x.trim()).filter(x => x.split(/\s+/).length >= 2);
      const out = [];
      parts.forEach(p => { const w = p.split(/\s+/); out.push(w.length > (maxWords || 7) ? w.slice(0, maxWords || 7).join(' ') + '…' : p); });
      return out.slice(0, max || 6);
    };
    K.sentence = (s) => { s = String(s || '').trim(); if (!s) return s; s = s[0].toUpperCase() + s.slice(1); return /[.!?…]$/.test(s) ? s : s + '.'; };

    /* ---------------- test helpers (autoplay in QA) ---------------- */
    let pid = 40;
    const fire = (el, type, x, y, id) => {
      const r = el.getBoundingClientRect();
      const cx = x == null ? r.left + r.width / 2 : r.left + x * K.scaleOf(el), cy = y == null ? r.top + r.height / 2 : r.top + y * K.scaleOf(el);
      el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: cx, clientY: cy, pointerId: id, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    };
    K.sim = {
      async tap(el, x, y) { const id = ++pid; fire(el, 'pointerdown', x, y, id); await S.sleep(60); fire(el, 'pointerup', x, y, id); try { el.click(); } catch (e) { /* not clickable */ } await S.sleep(40); },
      async press(el, x, y) { const id = ++pid; fire(el, 'pointerdown', x, y, id); return { id, move: (mx, my) => fire(el, 'pointermove', mx, my, id), up: (ux, uy) => fire(el, 'pointerup', ux, uy, id) }; },
      async drag(el, a, b, ms, steps) { const id = ++pid; steps = steps || 12; fire(el, 'pointerdown', a.x, a.y, id); for (let i = 1; i <= steps; i++) { await S.sleep((ms || 400) / steps); fire(el, 'pointermove', TS.lerp(a.x, b.x, i / steps), TS.lerp(a.y, b.y, i / steps), id); } fire(el, 'pointerup', b.x, b.y, id); await S.sleep(40); },
      async hold(el, ms, x, y) { const id = ++pid; fire(el, 'pointerdown', x, y, id); await S.sleep(ms); fire(el, 'pointerup', x, y, id); },
      click(el) { el.click(); },
      wait: (ms) => S.sleep(ms)
    };
    return K;
  };
})(window.TSG_ENV);
