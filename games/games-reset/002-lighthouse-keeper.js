/* 002 Lighthouse Keeper — Reset · GROUND · Panic / Body Alarm
 * Mechanism: the physiological sigh (two inhales, one long exhale), the fastest breath pattern known to lower arousal
 * (cyclic sighing, Balban et al. 2023). Hold the lamp to breathe in, tap again to top up, then sweep the beam slowly
 * across the sea to breathe out. Each slow exhale guides one of the player's own thoughts home and calms the storm.
 * Verb: breathe (hold, top-up, slow sweep). Finale: the moored boats light lanterns that rise into a cleared, starry sky.
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'lighthouse-keeper', mode: 'reset', name: 'Lighthouse Keeper', verb: 'breathe', family: 'GROUND', minutes: 2,
    parents: ['Panic / Body Alarm', 'Attention / Grounding / Mental Quiet', 'Sleep / Winding Down'],
    cast: ['still'], poster: { char: 'still', mood: 'glow' },
    tagline: 'Breathe the beam across a stormy sea and bring your thoughts home.',
    why: 'For a racing body: two breaths in, one long breath out, the fastest way to settle an alarm.',
    css: `
.g-lighthouse-keeper { --lk-ink: #eaf3ff; }
.g-lighthouse-keeper .lk-hud { position: absolute; z-index: 32; right: 14px; top: calc(env(safe-area-inset-top, 0px) + 60px); display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.g-lighthouse-keeper .lk-storm { font: 600 13px/1 var(--font-ui); color: #eaf3ff; background: rgba(8, 14, 30, 0.55); border: 1px solid rgba(234, 243, 255, 0.2); padding: 8px 11px; border-radius: 999px; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.g-lighthouse-keeper .lk-boat { position: absolute; z-index: 20; transform: translate(-50%, -100%); padding: 5px 9px 4px; border-radius: 8px; background: rgba(255, 248, 230, 0.94); color: #1d2a3a; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  font: 600 15px/1.15 var(--font-ui); white-space: nowrap; pointer-events: none; transition: opacity 0.4s ease; letter-spacing: 0.02em; max-width: 46cqw; overflow: hidden; text-overflow: ellipsis; }
.g-lighthouse-keeper .lk-boat.home { opacity: 0; }
.g-lighthouse-keeper .lk-controls { position: absolute; z-index: 34; left: 0; right: 0; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: none; }
.g-lighthouse-keeper .lk-lamp { pointer-events: auto; width: 128px; height: 128px; border-radius: 50%; border: 0; cursor: pointer; position: relative; touch-action: none;
  background: radial-gradient(circle at 50% 42%, #fff7d6 0%, #ffd36b 34%, #f0a63a 62%, #9a5a16 100%); box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.12), 0 0 calc(18px + var(--glow, 0) * 70px) calc(var(--glow, 0) * 30px) rgba(255, 214, 120, 0.7), 0 14px 30px rgba(0, 0, 0, 0.45); }
.g-lighthouse-keeper .lk-lamp:focus-visible { outline: 3px solid #fff; outline-offset: 6px; }
.g-lighthouse-keeper .lk-lamp svg { position: absolute; inset: -10px; width: calc(100% + 20px); height: calc(100% + 20px); transform: rotate(-90deg); overflow: visible; pointer-events: none; }
.g-lighthouse-keeper .lk-lamp circle { fill: none; stroke: #fff; stroke-width: 6; stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: calc(100 - var(--fill, 0) * 100); transition: stroke-dashoffset 0.08s linear; opacity: 0.95; }
.g-lighthouse-keeper .lk-lamp b { position: absolute; inset: 0; display: grid; place-items: center; font: 700 16px/1.1 var(--font-ui); color: #3a2205; text-align: center; padding: 0 14px; }
.g-lighthouse-keeper .lk-sweep { pointer-events: auto; position: relative; width: min(340px, calc(100% - 40px)); height: 74px; border-radius: 40px; touch-action: none; cursor: grab;
  background: linear-gradient(90deg, rgba(255, 214, 120, 0.25), rgba(255, 214, 120, 0.08)); border: 2px solid rgba(255, 230, 170, 0.55); box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35); }
.g-lighthouse-keeper .lk-knob { position: absolute; top: 50%; left: 0; width: 60px; height: 60px; margin: -30px 0 0 7px; border-radius: 50%; background: radial-gradient(circle at 45% 40%, #fffbe8, #ffd36b 60%, #d58a26); box-shadow: 0 0 22px rgba(255, 214, 120, 0.8); transform: translateX(var(--x, 0px)); }
.g-lighthouse-keeper .lk-sweep span { position: absolute; inset: 0; display: grid; place-items: center; font: 600 15px/1 var(--font-ui); color: #fff4d6; padding-left: 60px; pointer-events: none; }
.g-lighthouse-keeper .lk-slow { color: #ffd0b0 !important; }
.g-lighthouse-keeper .gk-char { left: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 160px); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis;
      const rounds = [3, 4, 5][ctx.intensity];
      const boats = (an.strands && an.strands.length ? an.strands : [{ label: 'THE RACING HEART' }, { label: 'WHAT IF IT GETS WORSE' }, { label: 'THE TIGHT CHEST' }])
        .concat(an.core ? [an.core] : []).slice(0, rounds).map((s, i) => ({ label: s.label, i, x: 0, y: 0, home: false, t: 0, lit: 0, phase: Math.random() * 6 }));
      while (boats.length < rounds) boats.push({ label: ['THE NOISE', 'THE RUSH', 'THE BUZZ'][boats.length % 3], i: boats.length, x: 0, y: 0, home: false, t: 0, lit: 0, phase: Math.random() * 6 });

      /* world */
      const cv = K.canvas(el);
      const P = K.particles();
      const W = { storm: 1, beam: -0.15, breath: 0, flash: 0, lh: { x: 0, y: 0 }, horizon: 0 };
      cv.onResize(c => { W.horizon = c.h * 0.5; W.lh = { x: c.w * (c.w > 700 ? 0.18 : 0.2), y: c.h * 0.5 }; layoutBoats(); });
      function layoutBoats() {
        const c = cv; if (!c.w) return;
        boats.forEach((b, i) => { if (b.home) return; const n = boats.length; b.x = c.w * (0.42 + 0.5 * ((i + 0.5) / n)) + (i % 2 ? 8 : -8); b.y = W.horizon + 40 + (i % 3) * 34 + (c.h - W.horizon) * 0.06; b.hx = W.lh.x + 46 + i * 22; b.hy = W.horizon + 54 + (i % 2) * 10; });
      }
      const labels = boats.map(b => { const l = h('div', { class: 'lk-boat gk-user', text: b.label }); el.append(l); return l; });
      const hud = h('div', { class: 'lk-hud' }, h('span', { class: 'lk-storm', text: 'Storm: wild' }));
      el.append(hud);
      const keeper = K.character('still', { side: 'right', mood: 'worried' });
      const controls = h('div', { class: 'lk-controls' });
      const lamp = h('button', { type: 'button', class: 'lk-lamp', 'aria-label': 'Lamp. Press and hold to breathe in. Tap again to top up.', html: '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" pathLength="100"/></svg><b>Hold to breathe in</b>' });
      const sweep = h('div', { class: 'lk-sweep', role: 'slider', tabindex: '0', 'aria-label': 'Breathe out: slide the beam slowly across the sea', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', hidden: true }, h('i', { class: 'lk-knob' }), h('span', { text: 'Breathe out… slowly' }));
      controls.append(sweep, lamp);
      el.append(controls);
      const lampLabel = lamp.querySelector('b'), knob = sweep.querySelector('.lk-knob'), sweepText = sweep.querySelector('span');
      const music = K.music('ocean');
      const rain = K.ambience('rain');

      /* breath state machine: in -> topup -> out */
      const B = { stage: 'idle', fill: 0, holding: false, round: 0, outP: 0, released: 0, slowWarn: 0 };
      let inhaleHum = null;
      function setStage(s) {
        B.stage = s;
        if (s === 'in') { lampLabel.textContent = 'Hold to breathe in'; sweep.hidden = true; lamp.hidden = false; K.guide({ id: 'in', g: 'hold', target: lamp, label: 'HOLD: BREATHE IN', ms: 2200 }); }
        if (s === 'topup') { lampLabel.textContent = 'Tap again: top up'; K.guide({ id: 'top', g: 'tap', target: lamp, label: 'TAP AGAIN: TOP UP', delay: 250 }); }
        if (s === 'out') { lamp.hidden = true; sweep.hidden = false; B.outP = 0; knob.style.setProperty('--x', '0px'); sweepText.textContent = 'Breathe out… slowly'; K.guide({ id: 'out', g: 'drag', dir: 'r', d: Math.min(220, sweep.clientWidth - 90), target: sweep, ox: 0.12, label: 'SWEEP SLOWLY: BREATHE OUT' }); }
      }
      K.press(lamp, {
        down: () => {
          if (B.stage === 'in') { B.holding = true; if (A.ctx) { inhaleHum = A.loop({ pink: true, filter: 'bandpass', freq: 500, q: 0.8 }); inhaleHum && inhaleHum.level(0.08, 0.3); } }
          else if (B.stage === 'topup') { B.fill = 1; K.sfx.sparkle(); P.emit('star', W.lh.x, W.horizon - 120, 14); keeper.face('wow', 900); K.later(() => setStage('out'), 380); }
        },
        up: () => {
          if (B.stage !== 'in' || !B.holding) return;
          B.holding = false;
          if (inhaleHum) { inhaleHum.level(0.0001, 0.1); const hum = inhaleHum; K.later(() => hum.stop(), 400); inhaleHum = null; }
          if (B.fill >= 0.72) { B.fill = 0.8; B.released = performance.now(); setStage('topup'); }
          else { keeper.say(ctx.line({ Jolly: 'A little longer. Fill right up.', Cheeky: 'That was a sip. Take a gulp.', Unfiltered: 'Longer. Fill the lungs.' }), { ms: 2000 }); B.fill = Math.max(0, B.fill - 0.2); }
        }
      });
      let lastX = 0, lastT = 0;
      K.drag(sweep, {
        start: (p) => { if (B.stage !== 'out') return false; lastX = p.x; lastT = performance.now(); if (A.ctx) A.tone({ type: 'sine', freq: 330, to: 196, glide: 5, dur: 5.5, vol: 0.07, attack: 0.4, lp: 900, bus: 'sfx', verb: 0.5 }); },
        move: (p) => {
          const now = performance.now(), dt = Math.max(1, now - lastT), v = Math.abs(p.x - lastX) / dt * 1000;
          lastX = p.x; lastT = now;
          const span = sweep.clientWidth - 74, maxV = span / 3.6;
          const want = K.clamp((p.x - 37) / span, 0, 1);
          if (v > maxV * 1.9 && want > B.outP) { B.slowWarn = 1; sweepText.textContent = 'Slower… like a long breath out'; sweepText.classList.add('lk-slow'); return; }
          if (want > B.outP) B.outP = Math.min(want, B.outP + 0.06);
          sweepText.classList.remove('lk-slow'); sweepText.textContent = 'Breathe out… slowly';
          knob.style.setProperty('--x', (B.outP * span) + 'px');
          sweep.setAttribute('aria-valuenow', String(Math.round(B.outP * 100)));
          if (B.outP >= 0.98) exhaled();
        },
        end: () => { if (B.stage === 'out' && B.outP < 0.98) K.guide({ id: 'out-more', g: 'drag', dir: 'r', d: 120, target: sweep, ox: 0.12 + B.outP * 0.7, label: 'KEEP SWEEPING SLOWLY', delay: 600 }); }
      });
      K.onKey(['ArrowRight'], () => { if (B.stage === 'out') { B.outP = Math.min(1, B.outP + 0.08); knob.style.setProperty('--x', (B.outP * (sweep.clientWidth - 74)) + 'px'); if (B.outP >= 0.98) exhaled(); } });

      function exhaled() {
        if (B.stage !== 'out') return;
        B.stage = 'dock';
        const b = boats.find(x => !x.home);
        B.round++;
        W.storm = Math.max(0, 1 - B.round / rounds);
        K.sfx.chime(B.round + 2);
        if (A.ctx) A.wood(undefined, 0.15, 0.7);
        if (b) b.docking = true;
        hud.firstChild.textContent = 'Storm: ' + ['calm', 'settling', 'rough', 'wild'][Math.min(3, Math.ceil(W.storm * 3))];
        keeper.base(B.round >= rounds ? 'happy' : B.round >= rounds / 2 ? 'calm' : 'neutral');
        if (B.round === 1) keeper.say(ctx.line({ Jolly: 'Lovely. One home. Longer out than in, that’s the trick.', Cheeky: 'See? Breathing. Turns out you’re good at it.', Unfiltered: 'One home. Out longer than in. Again.' }), { ms: 2800 });
        ctx.track('breath', { round: B.round });
        K.later(() => { if (B.round >= rounds) finale(); else { B.fill = 0; setStage('in'); } }, 1500);
      }

      /* render */
      K.loop((dt, t) => {
        const g = cv.g; if (!g) return;
        const w = cv.w, H = cv.h, calm = 1 - W.storm, hz = W.horizon;
        if (B.stage === 'in' && B.holding) B.fill = Math.min(1, B.fill + dt / 2.1);
        if (B.stage === 'in' && !B.holding) B.fill = Math.max(0, B.fill - dt * 0.3);
        W.breath += ((B.stage === 'out' ? 1 - B.outP * 0.7 : B.fill) - W.breath) * Math.min(1, dt * 6);
        lamp.style.setProperty('--fill', B.fill.toFixed(3)); lamp.style.setProperty('--glow', W.breath.toFixed(3));
        const targetBeam = B.stage === 'out' ? -0.15 + B.outP * 0.62 : -0.15 + Math.sin(t * 0.4) * 0.05;
        W.beam += (targetBeam - W.beam) * Math.min(1, dt * 5);
        // sky
        const sky = g.createLinearGradient(0, 0, 0, hz);
        sky.addColorStop(0, mix('#0d1222', '#081335', calm)); sky.addColorStop(1, mix('#2a3346', '#1d3566', calm));
        g.fillStyle = sky; g.fillRect(0, 0, w, hz + 2);
        if (calm > 0.3) { g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { const sx = (i * 97.3) % w, sy = (i * 53.7) % (hz * 0.9); g.globalAlpha = (calm - 0.3) * (0.4 + 0.4 * Math.sin(t * 1.3 + i)); g.fillRect(sx, sy, 1.4, 1.4); } g.globalAlpha = 1; }
        if (calm > 0.5) { const mx = w * 0.78, my = hz * 0.28; const mg = g.createRadialGradient(mx, my, 6, mx, my, 90); mg.addColorStop(0, `rgba(230,240,255,${(calm - 0.5) * 0.7})`); mg.addColorStop(1, 'rgba(230,240,255,0)'); g.fillStyle = mg; g.fillRect(mx - 90, my - 90, 180, 180); g.fillStyle = `rgba(245,248,255,${(calm - 0.5) * 2})`; g.beginPath(); g.arc(mx, my, 20, 0, K.TAU); g.fill(); }
        for (let i = 0; i < 6; i++) { const cx = ((i * 211 + t * (8 + i * 3) * (0.4 + W.storm)) % (w + 300)) - 150, cy = 40 + (i % 3) * 46; g.fillStyle = `rgba(${Math.round(30 + calm * 40)},${Math.round(36 + calm * 50)},${Math.round(52 + calm * 70)},${0.25 + W.storm * 0.55})`; g.beginPath(); g.ellipse(cx, cy, 130, 34, 0, 0, K.TAU); g.fill(); }
        // lightning (not in Gentle, not with reduced motion)
        if (W.storm > 0.6 && ctx.intensity > 0 && !K.reduced() && Math.random() < dt * 0.25 * W.storm) { W.flash = 1; if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 220, dur: 1.6, attack: 0.05, vol: 0.2 }); }
        W.flash = Math.max(0, W.flash - dt * 4);
        // sea
        for (let layer = 0; layer < 4; layer++) {
          const amp = (4 + layer * 3) * (0.3 + W.storm * 1.4), base = hz + layer * (H - hz) * 0.22;
          g.fillStyle = mix(['#132033', '#0f1b2c', '#0b1624', '#08111d'][layer], ['#163a5c', '#123251', '#0e2a46', '#0a213a'][layer], calm);
          g.beginPath(); g.moveTo(0, H);
          for (let x = 0; x <= w + 10; x += 10) g.lineTo(x, base + Math.sin(x * 0.02 + t * (1.2 + layer * 0.3)) * amp + Math.sin(x * 0.053 - t * 0.8) * amp * 0.5);
          g.lineTo(w, H); g.closePath(); g.fill();
        }
        // beam (drawn before boats so they sit in it)
        const lx = W.lh.x, ly = hz - Math.min(150, H * 0.2);
        const ang = W.beam, spread = 0.07 + W.breath * 0.12, len = w * 1.2;
        g.save(); g.globalCompositeOperation = 'lighter';
        const bg = g.createLinearGradient(lx, ly, lx + Math.cos(ang) * len, ly + Math.sin(ang) * len);
        bg.addColorStop(0, `rgba(255,230,160,${0.25 + W.breath * 0.45})`); bg.addColorStop(1, 'rgba(255,230,160,0)');
        g.fillStyle = bg; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.cos(ang - spread) * len, ly + Math.sin(ang - spread) * len); g.lineTo(lx + Math.cos(ang + spread) * len, ly + Math.sin(ang + spread) * len); g.closePath(); g.fill();
        g.restore();
        // boats
        boats.forEach((b, i) => {
          if (b.docking && !b.home) { b.t = Math.min(1, b.t + dt * 0.7); if (b.t >= 1) { b.home = true; labels[i].classList.add('home'); } }
          const k = TS_ease(b.t), x = b.x + (b.hx - b.x) * k, bob = Math.sin(t * 1.6 + b.phase) * (2 + W.storm * 5) * (1 - k * 0.7);
          const y = b.y + (b.hy - b.y) * k + bob;
          b.cx = x; b.cy = y;
          const toB = Math.atan2(y - ly, x - lx), lit = Math.abs(toB - ang) < spread + 0.05;
          b.lit += ((lit ? 1 : 0) - b.lit) * Math.min(1, dt * 6);
          g.save(); g.translate(x, y); g.rotate(Math.sin(t * 1.3 + b.phase) * 0.12 * (0.3 + W.storm));
          g.fillStyle = '#2b1d14'; g.beginPath(); g.moveTo(-16, 0); g.lineTo(16, 0); g.lineTo(11, 7); g.lineTo(-11, 7); g.closePath(); g.fill();
          g.fillStyle = b.lit > 0.3 ? '#fff5d6' : '#cdd6e2'; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, -2); g.lineTo(13, -2); g.closePath(); g.fill();
          g.strokeStyle = '#2b1d14'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -26); g.lineTo(0, 0); g.stroke();
          if (b.home) { g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(-8, -6, 2.4, 0, K.TAU); g.fill(); }
          g.restore();
          if (!b.home) { const half = (b.half = b.half || (labels[i].offsetWidth || 120) / 2); labels[i].style.left = K.clamp(x, half + 8, w - half - 8) + 'px'; labels[i].style.top = (y - 30) + 'px'; }
        });
        // lighthouse
        drawLighthouse(g, lx, ly, hz, t);
        // rain
        const drops = Math.round(120 * W.storm * (K.reduced() ? 0.3 : 1));
        if (drops) { g.strokeStyle = 'rgba(200,215,240,0.35)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < drops; i++) { const rx = (i * 73.1 + t * 380) % (w + 40) - 20, ry = (i * 41.3 + t * 620) % H; g.moveTo(rx, ry); g.lineTo(rx - 4, ry + 12); } g.stroke(); }
        if (rain) rain.level(0.15 + W.storm * 0.85, 1.2);
        if (W.flash > 0) { g.fillStyle = `rgba(220,230,255,${W.flash * 0.35})`; g.fillRect(0, 0, w, H); }
        P.update(dt); P.draw(g);
      });
      function drawLighthouse(g, x, ly, hz, t) {
        g.fillStyle = '#1a1f26'; g.beginPath(); g.ellipse(x, hz + 18, 70, 22, 0, 0, K.TAU); g.fill();
        g.fillStyle = '#2a3038'; g.fillRect(x + 30, hz + 6, 70, 8);
        const top = ly + 10, base = hz + 8;
        g.fillStyle = '#f2efe8'; g.beginPath(); g.moveTo(x - 16, top); g.lineTo(x + 16, top); g.lineTo(x + 24, base); g.lineTo(x - 24, base); g.closePath(); g.fill();
        g.fillStyle = '#c94a3f'; for (let i = 0; i < 3; i++) { const y0 = top + (base - top) * (0.18 + i * 0.3), y1 = y0 + (base - top) * 0.12, w0 = 16 + (y0 - top) / (base - top) * 8, w1 = 16 + (y1 - top) / (base - top) * 8; g.beginPath(); g.moveTo(x - w0, y0); g.lineTo(x + w0, y0); g.lineTo(x + w1, y1); g.lineTo(x - w1, y1); g.closePath(); g.fill(); }
        g.fillStyle = '#2b2f36'; g.fillRect(x - 20, top - 6, 40, 6);
        const glow = g.createRadialGradient(x, ly - 2, 2, x, ly - 2, 40 + W.breath * 60);
        glow.addColorStop(0, `rgba(255,236,170,${0.7 + W.breath * 0.3})`); glow.addColorStop(1, 'rgba(255,220,140,0)');
        g.fillStyle = glow; g.fillRect(x - 110, ly - 110, 220, 220);
        g.fillStyle = '#ffe9a8'; g.fillRect(x - 11, ly - 14, 22, 18);
        g.fillStyle = '#2b2f36'; g.beginPath(); g.moveTo(x - 15, ly - 14); g.lineTo(x, ly - 30); g.lineTo(x + 15, ly - 14); g.closePath(); g.fill();
        void t;
      }
      function mix(a, b, k) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const r = Math.round(((pa >> 16) & 255) + ((((pb >> 16) & 255) - ((pa >> 16) & 255)) * k)), gg = Math.round(((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * k)), bb = Math.round((pa & 255) + (((pb & 255) - (pa & 255)) * k)); return `rgb(${r},${gg},${bb})`; }
      function TS_ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

      let finished = false;
      async function finale() {
        B.stage = 'end';
        K.guide(null);
        controls.hidden = true;
        hud.firstChild.textContent = 'Storm: calm';
        keeper.say(ctx.line({ Jolly: 'Every boat’s home. Listen to that quiet.', Cheeky: 'Harbour’s full. Storm’s bored. Nice work.', Unfiltered: 'All home. Storm’s gone. That was you breathing.' }), { mood: 'happy', ms: 0 });
        music.level(0.6);
        await K.finale('lanterns', { from: boats.map(b => ({ x: b.cx || b.hx, y: (b.cy || b.hy) - 10 })), colors: ['#ffd36b', '#ffb46b', '#fff0b0', '#ffc98a'], chord: ['D4', 'F#4', 'A4', 'D5'], ms: 4200 });
        finished = true;
        ctx.finish({ title: 'The harbour is calm', mood: 'calm', lines: [rounds + ' slow breaths, each longer out than in', boats.length + ' thoughts safely moored', 'Storm: wild → calm'], share: rounds + ' boats home. Storm cleared.' });
      }

      /* start */
      (async () => {
        await K.intro({ title: 'Lighthouse Keeper', sub: 'Your thoughts are boats lost in a storm. Your breath is the light that brings them home.', how: 'Hold to breathe in. Tap to top up. Sweep slowly to breathe out.', char: 'still', mood: 'glow' });
        keeper.say(ctx.line({ Jolly: 'Storm’s rough tonight. Let’s light the way home, one breath at a time.', Cheeky: 'Bit wild out there. Good thing you’ve got lungs.', Unfiltered: 'Storm’s loud. Your breath runs the lamp. Let’s go.' }), { ms: 3600 });
        setStage('in');
      })();

      return {
        async autoplay() {
          for (let r = 0; r < rounds; r++) {
            while (B.stage !== 'in') await K.wait(120);
            await K.sim.hold(lamp, 2300);
            while (B.stage !== 'topup') await K.wait(80);
            await K.sim.tap(lamp);
            while (B.stage !== 'out') await K.wait(80);
            const sw = sweep.clientWidth;
            await K.sim.drag(sweep, { x: 37, y: 37 }, { x: sw - 30, y: 37 }, 4600, 46);
            await K.wait(300);
            if (B.stage === 'out') { await K.sim.drag(sweep, { x: 37 + B.outP * (sw - 74), y: 37 }, { x: sw - 20, y: 37 }, 2600, 26); }
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
