// Stand-ins behind the W2 / W3 interfaces, so the Hushflow can be built and
// played before MallowTouch, the Thought Mallow system and the Hushfold
// subtitles land. Integration swaps each of these for the real module:
//
//   rigMallow(appWorld)          → W2 MallowTouch  { rect, bodyRect, hitTest, react, setEmotion, lookAt, float, pointer }
//   createPlaceholderThought()   → W2 createThought { text, x, y, scale, state, react, soften, settle, hitTest, pointer, draw }
//   createLabSubtitles()         → W3 createSubtitles { say, choice, clear, busy }
//
// The placeholder Thought Mallow is deliberately not one of the seven: a
// round translucent jelly with a simple face and an emotion tint. The
// person's words are drawn with fillText only (never parsed), exactly as typed.

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;
const hexRGB = (h) => { const s = String(h).replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; };
const rgba = (h, a) => { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${a})`; };
const mixHex = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); const c = (i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0'); return `#${c(0)}${c(1)}${c(2)}`; };

// ------------------------------------------------------------- Mallow --
/** The existing MallowRig (src/app/world.js) behind the MallowTouch interface. */
export function rigMallow(appWorld) {
  const rig = () => appWorld?.rig || null;
  const rect = () => {
    const r = appWorld?.mallowRect?.();
    if (!r) return null;
    // the rig draws the body in roughly the middle 64% of the layer's width
    const w = r.width * 0.64;
    return { left: r.cx - w / 2, top: r.top, width: w, height: r.height, right: r.cx + w / 2, bottom: r.bottom, cx: r.cx, cy: r.cy };
  };
  return {
    rect, bodyRect: rect,
    hitTest(x, y) {
      const g = rig();
      if (!g?.ready || !g._toLocal || !g._hit) return false;
      try { return g._hit(g._toLocal({ clientX: x, clientY: y })); } catch { return false; }
    },
    react(kind) { try { rig()?.react(kind); } catch { /* not ready */ } },
    setEmotion(mix, intensity, opts) { try { rig()?.setEmotion(mix, intensity, opts); } catch { /* not ready */ } },
    lookAt(nx, ny) { try { rig()?.lookAt(nx, ny); } catch { /* not ready */ } },
    float() {},
    /** Hand a real pointerdown to the rig's own canvas: it captures the pointer and plays the squeeze natively. */
    forward(e) {
      const c = rig()?.canvas;
      if (!c) return false;
      c.dispatchEvent(new PointerEvent('pointerdown', { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType, isPrimary: e.isPrimary, button: 0, buttons: 1, bubbles: true, cancelable: true }));
      return true;
    },
  };
}

// ------------------------------------------------------ Thought Mallow --
const TINTS = {
  angry: '#ff8a6b', frustrated: '#ff9f6b', anxious: '#8fe3ff', overwhelmed: '#c3a2ff', sad: '#8fa8ff',
  lonely: '#a9b6ff', restless: '#ffd36b', other: '#a8f0d8',
};

function bodySprite(tint, S = 160) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const cx = S / 2, cy = S / 2, r = S * 0.4;
  // aura
  let gr = g.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.25);
  gr.addColorStop(0, rgba(tint, 0.28)); gr.addColorStop(1, rgba(tint, 0));
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  // translucent jelly body, lit from the top left
  gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.38, r * 0.08, cx, cy, r * 1.05);
  gr.addColorStop(0, rgba(mixHex(tint, '#ffffff', 0.7), 0.96));
  gr.addColorStop(0.42, rgba(tint, 0.84));
  gr.addColorStop(1, rgba(mixHex(tint, '#1a1040', 0.45), 0.9));
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  // light passing through from below (subsurface)
  g.globalCompositeOperation = 'lighter';
  gr = g.createRadialGradient(cx, cy + r * 0.42, 0, cx, cy + r * 0.42, r * 0.75);
  gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
  // rim
  g.globalCompositeOperation = 'source-over';
  const lg = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  lg.addColorStop(0, 'rgba(255,255,255,0.65)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.08)'); lg.addColorStop(1, 'rgba(255,255,255,0.3)');
  g.strokeStyle = lg; g.lineWidth = S * 0.012; g.beginPath(); g.arc(cx, cy, r - 1, 0, TAU); g.stroke();
  // specular
  g.save(); g.translate(cx - r * 0.36, cy - r * 0.46); g.rotate(-0.6);
  gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
  gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.scale(1, 0.55); g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill();
  g.restore();
  return c;
}

function haloSprite(colour, S = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, rgba(colour, 0.6)); gr.addColorStop(0.4, rgba(colour, 0.22)); gr.addColorStop(1, rgba(colour, 0));
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return c;
}

/**
 * A 2D Thought Mallow carrying the person's words (words.token: exact text,
 * ≤ 42 characters). font(px, weight) → canvas font string. The world sets
 * x, y, scale and state; draw(g, x, y, scale, {tension, charge, calm, fizz, radius, now}).
 */
export function createPlaceholderThought({ words, emotion = 'other', font = (px, w) => `${w} ${px}px system-ui, sans-serif`, dpr = 2 } = {}) {
  const tint = TINTS[emotion] || TINTS.other;
  let body = null, halo = null, label = null, labelKey = '';
  let squash = 0, squashV = 0, sigh = 0, appear = 0, settledK = 0;
  const imp = { squeeze: 0.5, release: -0.4, sigh: 0.3, appear: -0.6, poke: 0.3 };
  const handle = {
    id: 'thought-1', emotion, x: 0, y: 0, z: 0, scale: 1,
    get text() { return words?.full || ''; },
    get token() { return words?.token || ''; },
    state: { tension: 0.7, charge: 0.7, calm: 0, distance: 0 },
    react(kind) { squashV += (imp[kind] ?? 0.2) * 6; if (kind === 'sigh') sigh = 1; if (kind === 'appear') appear = 0; },
    soften() {}, settle(k = 1) { settledK = Math.max(settledK, k); }, transform() {},
    hitTest(x, y) { return Math.hypot(x - handle.x, y - handle.y) < 40 * handle.scale * 1.2; },
    pointer() {},
    destroy() { body = halo = label = null; },
    draw(g, x, y, scale = 1, o = {}) {
      if (!body) { body = bodySprite(tint); halo = haloSprite('#ffd98a'); }
      const now = o.now || 0, r = (o.radius || 34) * scale;
      const tension = clamp(o.tension ?? 0.6), calm = clamp(Math.max(o.calm ?? 0, settledK));
      // jelly springs
      const dt = 1 / 60;
      squashV += (-90 * squash - 9 * squashV) * dt; squash += squashV * dt;
      sigh = Math.max(0, sigh - dt * 0.6); appear = Math.min(1, appear + dt * 1.8);
      const trem = o.reduced ? 0 : tension * (o.fizz ? 1.6 : 1) * 1.6;
      const jx = trem ? Math.sin(now * 31) * trem * 0.6 : 0, jy = trem ? Math.cos(now * 27) * trem * 0.4 : 0;
      const breathe = o.reduced ? 0 : Math.sin(now * (1.6 - 0.8 * calm)) * 0.025;
      const puff = tension * 0.06;                     // cheeks puff out when tense
      const sx = (1 + squash * 0.18 + puff + breathe) * (0.6 + 0.4 * appear), sy = (1 - squash * 0.18 - breathe * 0.6) * (0.6 + 0.4 * appear);
      g.save();
      g.translate(x + jx, y + jy);
      // a warm halo once it has settled
      if (calm > 0.05) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * calm; g.drawImage(halo, -r * 2.2, -r * 2.2, r * 4.4, r * 4.4); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
      g.save(); g.scale(sx, sy);
      g.drawImage(body, -r * 1.25, -r * 1.25, r * 2.5, r * 2.5);
      // simple face
      const ink = '#1d1438';
      const eo = clamp(0.45 + 0.55 * (1 - tension) * (1 - sigh));
      g.fillStyle = ink;
      for (let side = -1; side <= 1; side += 2) {
        const ex = side * r * 0.3, ey = -r * 0.06;
        if (calm > 0.6 || sigh > 0.5) {
          // closed, content eyes
          g.strokeStyle = ink; g.lineWidth = r * 0.07; g.lineCap = 'round';
          g.beginPath(); g.arc(ex, ey - r * 0.02, r * 0.1, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
        } else {
          g.beginPath(); g.ellipse(ex, ey, r * 0.085, r * 0.13 * eo + r * 0.02, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(ex - r * 0.03, ey - r * 0.05 * eo, r * 0.03, 0, TAU); g.fill(); g.fillStyle = ink;
          // a tense brow line
          if (tension > 0.55) {
            g.strokeStyle = ink; g.lineWidth = r * 0.05; g.lineCap = 'round';
            const tilt = (tension - 0.55) * 0.5 * side;
            g.beginPath(); g.moveTo(ex - r * 0.11, ey - r * 0.2 - tilt * r); g.lineTo(ex + r * 0.11, ey - r * 0.2 + tilt * r); g.stroke();
          }
        }
      }
      // cheeks
      g.fillStyle = rgba('#ff6f9a', 0.22 + 0.25 * tension);
      for (let side = -1; side <= 1; side += 2) { g.beginPath(); g.ellipse(side * r * 0.5, r * 0.16, r * (0.12 + puff), r * 0.08, 0, 0, TAU); g.fill(); }
      // mouth: a tight wobbly line when tense, a soft smile when calm
      g.strokeStyle = ink; g.lineWidth = r * 0.055; g.lineCap = 'round';
      g.beginPath();
      if (calm > 0.5) { g.arc(0, r * 0.12, r * 0.13, Math.PI * 0.2, Math.PI * 0.8); }
      else {
        const wv = tension * r * 0.04;
        g.moveTo(-r * 0.13, r * 0.22);
        g.quadraticCurveTo(-r * 0.06, r * 0.22 - wv, 0, r * 0.22);
        g.quadraticCurveTo(r * 0.06, r * 0.22 + wv, r * 0.13, r * 0.22);
      }
      g.stroke();
      g.restore();
      // the person's words, exactly as typed, on a readable plate
      drawLabel(g, r, calm, o);
      g.restore();
    },
  };

  function buildLabel(calm) {
    const text = words?.token || '';
    if (!text) return null;
    const px = 17, weight = 700, maxW = 210;
    const c = document.createElement('canvas');
    const m = c.getContext('2d');
    m.font = font(px, weight);
    // wrap into at most two lines
    const ws = text.split(/\s+/); const ls = []; let line = '';
    for (const w of ws) { const t = line ? `${line} ${w}` : w; if (m.measureText(t).width <= maxW || !line) line = t; else { ls.push(line); line = w; } if (ls.length === 2) break; }
    if (line && ls.length < 2) ls.push(line);
    if (ls.length === 2 && ls.join(' ') !== ws.join(' ')) ls[1] = ls[1].replace(/\s*\S*$/, '') + '…';
    let tw = 0; for (const l of ls) tw = Math.max(tw, m.measureText(l).width);
    const lh = px * 1.25, padX = 14, padY = 8;
    const w = Math.ceil(tw + padX * 2), h = Math.ceil(ls.length * lh + padY * 2);
    c.width = Math.ceil((w + 24) * dpr); c.height = Math.ceil((h + 24) * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(12, 12);
    // plate
    g.fillStyle = 'rgba(14,9,38,0.66)';
    const rr = Math.min(16, h / 2);
    g.beginPath(); g.moveTo(rr, 0); g.arcTo(w, 0, w, h, rr); g.arcTo(w, h, 0, h, rr); g.arcTo(0, h, 0, 0, rr); g.arcTo(0, 0, w, 0, rr); g.closePath(); g.fill();
    g.strokeStyle = calm ? 'rgba(255,230,180,0.35)' : 'rgba(255,170,120,0.35)'; g.lineWidth = 1; g.stroke();
    g.font = font(px, weight); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = calm ? 'rgba(255,217,138,0.7)' : 'rgba(255,120,70,0.8)'; g.shadowBlur = 10;
    g.fillStyle = calm ? '#fffaf0' : '#fff0e0';
    ls.forEach((l, i) => g.fillText(l, w / 2, padY + lh * (i + 0.5)));
    return { c, w: w + 24, h: h + 24 };
  }
  function drawLabel(g, r, calm, o) {
    const key = `${words?.token}|${font(17, 700)}`;
    if (key !== labelKey) { labelKey = key; label = { ember: buildLabel(false), light: buildLabel(true) }; }
    if (!label?.ember) return;
    const y = r * 0.98 - 4;            // the plate canvas carries a 12 px margin
    const L = calm > 0.5 ? label.light : label.ember;
    // keep the plate on screen (the canvas is translated to the thought's centre)
    const m = g.getTransform(), cx = m.e / (m.a || 1);
    let dx = 0;
    if (o.minX != null && cx - L.w / 2 + 12 < o.minX) dx = o.minX - (cx - L.w / 2 + 12);
    if (o.maxX != null && cx + L.w / 2 - 12 > o.maxX) dx = o.maxX - (cx + L.w / 2 - 12);
    g.globalAlpha = 1;
    g.drawImage(L.c, -L.w / 2 + dx, y, L.w, L.h);
  }
  /** Re-render the label once the brand fonts have loaded. */
  handle.refreshLabel = () => { labelKey = ''; };
  return handle;
}

// ---------------------------------------------------------- subtitles --
let styled = false;
function injectStyle() {
  if (styled) return;
  styled = true;
  const st = document.createElement('style');
  st.textContent = `
.hf-subs{position:fixed;left:0;right:0;z-index:4;pointer-events:none;display:flex;flex-direction:column;align-items:center;padding:0 24px;transition:top .5s cubic-bezier(.2,.7,.2,1)}
.hf-line{margin:0;max-width:340px;text-align:center;color:#fff;font:600 20px/1.36 var(--ff-voice,"HM Nunito Sans",system-ui,sans-serif);letter-spacing:.004em;
  text-shadow:0 1px 2px rgba(6,4,22,.85),0 0 22px rgba(6,4,22,.75);padding:10px 18px;border-radius:22px;
  background:radial-gradient(closest-side,rgba(10,7,32,.5),rgba(10,7,32,0));opacity:0;transform:translateY(6px);transition:opacity .45s ease,transform .6s cubic-bezier(.2,.7,.2,1);text-wrap:balance}
.hf-line.on{opacity:1;transform:none}
.hf-line.discovery{font:500 24px/1.18 var(--ff-story,"HM Fraunces",Georgia,serif);letter-spacing:-.005em;color:#fff6e4;text-shadow:0 1px 2px rgba(6,4,22,.9),0 0 26px rgba(255,190,110,.35),0 0 18px rgba(6,4,22,.8)}
.hf-line.hold{pointer-events:auto;cursor:pointer}
.hf-hint{display:block;margin-top:6px;font:600 13px/1.2 var(--ff-ui,"HM Manrope",system-ui,sans-serif);color:rgba(255,255,255,.72);letter-spacing:.01em;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.hf-chips{display:flex;gap:10px;margin-top:12px;opacity:0;transition:opacity .45s ease}
.hf-chips.on{opacity:1}
.hf-chip{pointer-events:auto;min-height:44px;padding:0 20px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(20,14,52,.55);
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#fff;font:700 15px/1 var(--ff-ui,"HM Manrope",system-ui,sans-serif);cursor:pointer}
.hf-chip.primary{background:linear-gradient(180deg,#ffe8b8,#ffcf7a);color:#2a1a08;border-color:transparent}
.hf-dock{position:fixed;left:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);z-index:4;pointer-events:auto;max-width:calc(100vw - 32px);min-height:44px;display:flex;align-items:center;gap:8px;
  padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(14,10,40,.55);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
  color:rgba(255,255,255,.9);font:600 14px/1.2 var(--ff-ui,"HM Manrope",system-ui,sans-serif);opacity:0;transition:opacity .4s ease;cursor:pointer}
.hf-dock.on{opacity:1}
@media (prefers-reduced-motion: reduce){.hf-line,.hf-chips,.hf-dock{transition:opacity .2s linear}.hf-line{transform:none}}
`;
  document.head.append(st);
}

/**
 * Lab subtitles: one short line at a time, soft fade, readable timing
 * (clamp(1400 + 55·chars, 2400, 7000) / speed), aria-live polite, the last
 * line of a held sequence stays until tapped or after holdMs it docks as a
 * replayable chip. Placed at slotY() unless a finger (avoid rects) is there, then at altY().
 */
export function createLabSubtitles({ root = document.body, avoid = () => [], speed = 1, holdMs = 8000, slotY = () => 92, altY = () => innerHeight * 0.52 } = {}) {
  injectStyle();
  const box = document.createElement('div');
  box.className = 'hf-subs';
  box.setAttribute('aria-live', 'polite');
  box.setAttribute('role', 'status');
  const p = document.createElement('p'); p.className = 'hf-line';
  const chips = document.createElement('div'); chips.className = 'hf-chips';
  box.append(p, chips);
  const dock = document.createElement('button'); dock.className = 'hf-dock'; dock.type = 'button';
  root.append(box, dock);
  let queue = Promise.resolve(), busy = 0, paused = false, skipFn = null;
  const wait = (ms) => new Promise((r) => { const t0 = performance.now(); const tick = () => { if (skipFn?.skipped) return r(); if (paused) { setTimeout(tick, 120); return; } if (performance.now() - t0 >= ms) r(); else setTimeout(tick, 60); }; tick(); });
  function place() {
    const rects = avoid() || [];
    // the default slot is anchored by its bottom edge (just above the Mallow), so taller
    // content (two lines, a choice) grows upwards and never covers the Mallow
    const bottom = slotY(), band = { y: bottom - 96, h: 96 };
    const hit = rects.some((r) => r.kind === 'finger' && r.y < band.y + band.h && r.y + r.h > band.y);
    if (hit) { box.style.bottom = 'auto'; box.style.top = `${altY()}px`; }
    else { box.style.top = 'auto'; box.style.bottom = `${Math.max(0, innerHeight - bottom)}px`; }
  }
  // a discovery waits only for the line on screen (cut short), not for the dialogue queued behind it
  function queueFront(run) { const prev = current?.done || Promise.resolve(); return prev.then(run); }
  async function showLine(text, { kind = 'dialogue', hold = false } = {}) {
    let cutNow = null;
    const me = { kind, cut: () => cutNow?.(), done: null };
    current = me;
    let resolveDone; me.done = new Promise((r) => { resolveDone = r; });
    place();
    p.className = `hf-line ${kind === 'discovery' ? 'discovery' : ''}`;
    p.textContent = text;
    if (hold) { const h = document.createElement('span'); h.className = 'hf-hint'; h.textContent = 'Tap to continue'; p.append(h); p.classList.add('hold'); }
    requestAnimationFrame(() => p.classList.add('on'));
    if (hold) {
      await new Promise((res) => {
        const done = () => { p.removeEventListener('click', done); clearTimeout(tm); res(); };
        const tm = setTimeout(() => { docked(text); done(); }, holdMs);
        p.addEventListener('click', done);
      });
    } else {
      await Promise.race([wait(Math.min(7000, Math.max(2400, 1400 + 55 * text.length)) / speed), new Promise((r) => { cutNow = r; })]);
    }
    p.classList.remove('on');
    await wait(420);
    if (current === me) current = null;
    resolveDone();
  }
  function docked(text) {
    dock.textContent = `↺  ${text}`;
    dock.setAttribute('aria-label', `Replay: ${text}`);
    dock.classList.add('on');
    dock.onclick = () => { dock.classList.remove('on'); api.say([text], { kind: 'discovery' }); };
  }
  let gen = 0;            // bumped by a discovery: queued dialogue that has not started yet is dropped
  let current = null;     // { kind, cut() }
  const api = {
    say(lines, o = {}) {
      const list = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
      const discovery = o.kind === 'discovery';
      if (discovery) { gen++; if (current && current.kind !== 'discovery') current.cut(); }
      const myGen = gen;
      busy++;
      const run = async () => {
        for (let i = 0; i < list.length; i++) {
          if (!discovery && myGen !== gen) return;          // a discovery took the floor
          await showLine(list[i], { kind: o.kind, hold: o.hold && i === list.length - 1 });
          if (discovery && i < list.length - 1) await wait(800);
        }
      };
      const job = (discovery ? queueFront(run) : queue.then(run)).finally(() => { busy--; });
      queue = job.catch(() => {});
      return job;
    },
    choice(prompt, options = []) {
      busy++;
      const job = queue.then(() => new Promise((res) => {
        place();
        p.className = 'hf-line'; p.textContent = prompt;
        chips.replaceChildren(...options.map((o, i) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = `hf-chip${i === options.length - 1 ? ' primary' : ''}`; b.textContent = o.label;
          b.onclick = () => { p.classList.remove('on'); chips.classList.remove('on'); setTimeout(() => chips.replaceChildren(), 450); res(o.value); };
          return b;
        }));
        requestAnimationFrame(() => { p.classList.add('on'); chips.classList.add('on'); });
      })).finally(() => { busy--; });
      queue = job.catch(() => {});
      return job;
    },
    pause() { paused = true; }, resume() { paused = false; },
    clear() { p.classList.remove('on'); chips.classList.remove('on'); },
    get busy() { return busy > 0; },
    destroy() { box.remove(); dock.remove(); },
  };
  return api;
}
