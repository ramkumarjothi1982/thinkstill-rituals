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
    // the rig's true body box when it has measured itself (world.bodyRect), else the layer estimate
    const b = appWorld?.bodyRect?.();
    if (b && b.width > 20 && b.height > 20 && b.right != null) return { left: b.left, top: b.top, width: b.width, height: b.height, right: b.right, bottom: b.bottom, cx: b.cx, cy: b.cy };
    const r = appWorld?.mallowRect?.();
    if (!r) return null;
    // the rig draws the body in roughly the middle 64% of the layer's width
    const w = r.width * 0.64;
    return { left: r.cx - w / 2, top: r.top, width: w, height: r.height, right: r.cx + w / 2, bottom: r.bottom, cx: r.cx, cy: r.cy };
  };
  /**
   * The body box where the shell put it, without this adapter's own float (the CSS translate /
   * rotate below) or a hop: the same framing as world.bodyRect(), measured on the layer (the
   * canvas fills it and carries the float; the layer does not). A world keys its layout on this,
   * so its own bob never re-plans the screen.
   */
  const restRect = () => {
    const g = rig(), layer = g?.canvas?.parentElement;
    if (!g?.S || !g.W || !g.H || !g.mallow?.bodyBox || !layer?.getBoundingClientRect) return null;
    const r = layer.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const kx = r.width / g.W, ky = r.height / g.H;
    const [bx0, by0, bx1, by1] = g.mallow.bodyBox;
    const bw = (bx1 - bx0) * g.S, bh = (by1 - by0) * g.S;
    const left = r.left + (g.CX - bw / 2) * kx, top = r.top + (g.BASE - bh) * ky, width = bw * kx, height = bh * ky;
    return { left, top, width, height, right: left + width, bottom: top + height, cx: left + width / 2, cy: top + height / 2 };
  };
  return {
    rect, bodyRect: rect, restRect,
    hitTest(x, y) {
      const g = rig();
      if (!g?.ready || !g._toLocal || !g._hit) return false;
      try { return g._hit(g._toLocal({ clientX: x, clientY: y })); } catch { return false; }
    },
    react(kind) { try { rig()?.react(kind); } catch { /* not ready */ } },
    setEmotion(mix, intensity, opts) { try { rig()?.setEmotion(mix, intensity, opts); } catch { /* not ready */ } },
    lookAt(nx, ny) { try { rig()?.lookAt(nx, ny); } catch { /* not ready */ } },
    /**
     * Float on the water: lift in body heights (up), tilt in degrees. The rig has no float of its
     * own, so the canvas moves with the CSS `translate` / `rotate` properties — separate from the
     * layer's `transform` (and its 720 ms transition), so the bob is never lagged or eased away.
     */
    float({ lift = 0, tilt = 0 } = {}) {
      const c = rig()?.canvas;
      if (!c?.style) return;
      const h = rect()?.height || 200;
      const ty = Math.round(-lift * h * 10) / 10, rot = Math.round(tilt * 20) / 20;
      if (c._fy === ty && c._fr === rot) return;
      c._fy = ty; c._fr = rot;
      c.style.transformOrigin = '50% 82%';
      c.style.translate = ty ? `0 ${ty}px` : '';
      c.style.rotate = rot ? `${rot}deg` : '';
    },
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
 * Wrap `text` into lines no wider than maxW (canvas 2D context `m` with its font set). Words
 * wrap at spaces; a word wider than a line breaks between characters (code points, so emoji
 * stay whole). Nothing is dropped.
 */
export function wrapLines(m, text, maxW) {
  const out = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const t = line ? `${line} ${word}` : word;
    if (m.measureText(t).width <= maxW) { line = t; continue; }
    if (line) { out.push(line); line = ''; }
    if (m.measureText(word).width <= maxW) { line = word; continue; }
    const ch = Array.from(word);
    while (ch.length) {
      let k = ch.length;
      while (k > 1 && m.measureText(ch.slice(0, k).join('')).width > maxW) k--;
      const part = ch.splice(0, k).join('');
      if (ch.length) out.push(part); else line = part;
    }
  }
  if (line) out.push(line);
  return out;
}

/**
 * A 2D Thought Mallow carrying the person's words (words.token: exact text,
 * ≤ 42 characters). font(px, weight) → canvas font string. The world sets
 * x, y, scale and state; draw(g, x, y, scale, {tension, charge, calm, fizz, radius, now}).
 */
export function createPlaceholderThought({ words, emotion = 'other', font = (px, w) => `${w} ${px}px system-ui, sans-serif`, dpr = 2 } = {}) {
  const tint = TINTS[emotion] || TINTS.other;
  let body = null, halo = null, label = null, labelKey = '';
  let squash = 0, squashV = 0, sigh = 0, appear = 0, settledK = 0, drawnR = 0;
  const imp = { squeeze: 0.5, release: -0.4, sigh: 0.3, appear: -0.6, poke: 0.3 };
  const handle = {
    id: 'thought-1', emotion, x: 0, y: 0, z: 0, scale: 1,
    get text() { return words?.full || ''; },
    get token() { return words?.token || ''; },
    state: { tension: 0.7, charge: 0.7, calm: 0, distance: 0 },
    react(kind) { squashV += (imp[kind] ?? 0.2) * 6; if (kind === 'sigh') sigh = 1; if (kind === 'appear') appear = 0; },
    soften() {}, settle(k = 1) { settledK = Math.max(settledK, k); }, transform() {},
    /** The body as drawn (radius from the last draw), with a little touch slop. */
    hitTest(x, y) { return Math.hypot(x - handle.x, y - handle.y) < (drawnR || 40 * handle.scale) * 1.2; },
    pointer() {},
    destroy() { body = halo = label = null; },
    draw(g, x, y, scale = 1, o = {}) {
      if (!body) { body = bodySprite(tint); halo = haloSprite('#ffd98a'); }
      const now = o.now || 0, r = (o.radius || 34) * scale;
      drawnR = r;
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
      // o.alpha fades the whole thought (surfacing, a melt); the words plate keeps its own o.labelAlpha on top
      const A0 = Number.isFinite(o.alpha) ? clamp(o.alpha) : 1;
      if (A0 <= 0.003) return;
      g.save();
      g.translate(x + jx, y + jy);
      // a warm halo once it has settled
      if (calm > 0.05) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * calm * A0; g.drawImage(halo, -r * 2.2, -r * 2.2, r * 4.4, r * 4.4); g.globalCompositeOperation = 'source-over'; }
      g.globalAlpha = A0;
      g.save(); g.scale(sx, sy);
      g.drawImage(body, -r * 1.25, -r * 1.25, r * 2.5, r * 2.5);
      // simple face: soft dark eyes with catch-lights, a mouth that tightens with tension
      const ink = '#24163f';
      const eo = clamp(0.5 + 0.5 * (1 - tension) * (1 - sigh));
      const look = o.reduced ? 0 : Math.sin(now * 0.7) * r * 0.025;
      for (let side = -1; side <= 1; side += 2) {
        const ex = side * r * 0.29 + look, ey = -r * 0.05;
        if (calm > 0.6 || sigh > 0.5) {
          g.strokeStyle = ink; g.lineWidth = r * 0.075; g.lineCap = 'round';
          g.beginPath(); g.arc(ex, ey - r * 0.03, r * 0.1, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
        } else {
          const ew = r * 0.1, eh = r * (0.07 + 0.075 * eo);
          g.fillStyle = ink; g.beginPath(); g.ellipse(ex, ey, ew, eh, 0, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.arc(ex - ew * 0.35, ey - eh * 0.4, r * 0.035, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(ex + ew * 0.3, ey + eh * 0.35, r * 0.016, 0, TAU); g.fill();
          if (tension > 0.62) {
            // a worried brow, angled towards the middle
            g.strokeStyle = rgba(ink, clamp((tension - 0.62) * 3)); g.lineWidth = r * 0.05; g.lineCap = 'round';
            g.beginPath(); g.moveTo(ex - side * r * 0.12, ey - r * 0.25); g.quadraticCurveTo(ex, ey - r * 0.3, ex + side * r * 0.1, ey - r * 0.2); g.stroke();
          }
        }
      }
      // cheeks puff when tense
      g.fillStyle = rgba('#ff6f9a', 0.2 + 0.28 * tension);
      for (let side = -1; side <= 1; side += 2) { g.beginPath(); g.ellipse(side * r * 0.5, r * 0.16, r * (0.11 + puff), r * 0.075, 0, 0, TAU); g.fill(); }
      // mouth: a small tight wave when tense, a soft smile when calm
      g.strokeStyle = ink; g.lineWidth = r * 0.055; g.lineCap = 'round';
      g.beginPath();
      if (calm > 0.5) g.arc(0, r * 0.1, r * 0.12, Math.PI * 0.22, Math.PI * 0.78);
      else {
        const wv = tension * r * 0.045, mw = r * (0.13 - 0.04 * tension);
        g.moveTo(-mw, r * 0.23);
        g.quadraticCurveTo(-mw * 0.45, r * 0.23 - wv, 0, r * 0.23);
        g.quadraticCurveTo(mw * 0.45, r * 0.23 + wv, mw, r * 0.23);
      }
      g.stroke();
      g.restore();
      // the person's words, exactly as typed, on a readable plate
      drawLabel(g, r, calm, o, A0);
      g.restore();
    },
  };

  function buildLabel(calm, maxW = 210, maxLines = 2) {
    const text = words?.token || '';
    if (!text) return null;
    const weight = 700;
    const c = document.createElement('canvas');
    const m = c.getContext('2d');
    // the exact words on at most two lines: 17 px, stepping down to 15 px (never smaller) before
    // anything is left out; a word too long for a line breaks between characters. maxLines 1 (a
    // short screen): one wide line if it fits at 15 px or more, else the usual two.
    let px = 17, ls = null;
    for (const lim of maxLines === 1 ? [1, 2] : [2]) {
      for (const size of [17, 16, 15]) {
        px = size; m.font = font(px, weight);
        ls = wrapLines(m, text, maxW);
        if (ls.length <= lim) break;
      }
      if (ls.length <= lim) break;
    }
    if (ls.length > 2) {
      // still too long (the full text is one tap away in the reading overlay)
      ls = ls.slice(0, 2);
      const ch = Array.from(ls[1]);
      while (ch.length > 1 && m.measureText(`${ch.join('').trimEnd()}…`).width > maxW) ch.pop();
      ls[1] = `${ch.join('').trimEnd()}…`;
    }
    let tw = 0; for (const l of ls) tw = Math.max(tw, m.measureText(l).width);
    const lh = 21.25, padX = 12, padY = 8;     // the line box the storm layout plans for (17 px × 1.25)
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
  function drawLabel(g, r, calm, o, A0 = 1) {
    const maxW = Math.round(o.labelWidth || 210), lines = o.labelLines === 1 ? 1 : 2;
    const key = `${words?.token}|${font(17, 700)}|${maxW}|${lines}`;
    if (key !== labelKey) { labelKey = key; label = { ember: buildLabel(false, maxW, lines), light: buildLabel(true, maxW, lines) }; }
    if (!label?.ember) return;
    const L = calm > 0.5 ? label.light : label.ember;
    // o.labelY: where the visible plate's top edge sits, relative to the body's centre (the ocean
    // floats the words above a far thought); default just under the body. The canvas carries a 12 px margin.
    const y = Number.isFinite(o.labelY) ? o.labelY - 12 : r * 0.98 - 4;
    handle.plate = { w: L.w - 24, h: L.h - 24 };
    // keep the plate on screen (the canvas is translated to the thought's centre); o.labelX moves
    // the plate's centre sideways (words beside the thought)
    const m = g.getTransform(), lx = Number.isFinite(o.labelX) ? o.labelX : 0, cx = m.e / (m.a || 1) + lx;
    let dx = lx;
    if (o.minX != null && cx - L.w / 2 + 12 < o.minX) dx = lx + o.minX - (cx - L.w / 2 + 12);
    if (o.maxX != null && cx + L.w / 2 - 12 > o.maxX) dx = lx + o.maxX - (cx + L.w / 2 - 12);
    g.globalAlpha = A0 * (Number.isFinite(o.labelAlpha) ? clamp(o.labelAlpha) : 1);
    g.drawImage(L.c, -L.w / 2 + dx, y, L.w, L.h);
    g.globalAlpha = 1;
  }
  /** Re-render the label once the brand fonts have loaded. */
  handle.refreshLabel = () => { labelKey = ''; };
  return handle;
}

// ---------------------------------------------------------- subtitles --
// (lab-only class names, hfl-*, so the Hushfold shell's own .hf-subs styles never apply)
let styled = false;
function injectStyle() {
  if (styled) return;
  styled = true;
  const st = document.createElement('style');
  st.textContent = `
.hfl-subs{position:fixed;left:0;right:0;z-index:4;pointer-events:none;display:flex;flex-direction:column;align-items:center;padding:0 24px;transition:top .5s cubic-bezier(.2,.7,.2,1)}
.hfl-line{margin:0;max-width:340px;text-align:center;color:#fff;font:600 20px/1.36 var(--ff-voice,"HM Nunito Sans",system-ui,sans-serif);letter-spacing:.004em;
  text-shadow:0 1px 2px rgba(6,4,22,.85),0 0 22px rgba(6,4,22,.75);padding:8px 16px;border-radius:22px;
  background:radial-gradient(closest-side,rgba(10,7,32,.5),rgba(10,7,32,0));opacity:0;transform:translateY(6px);transition:opacity .45s ease,transform .6s cubic-bezier(.2,.7,.2,1);text-wrap:balance}
.hfl-line.on{opacity:1;transform:none}
.hfl-line.discovery{font:500 24px/1.18 var(--ff-story,"HM Fraunces",Georgia,serif);letter-spacing:-.005em;color:#fff6e4;text-shadow:0 1px 2px rgba(6,4,22,.9),0 0 26px rgba(255,190,110,.35),0 0 18px rgba(6,4,22,.8)}
.hfl-line.title{font:540 26px/1.12 var(--ff-story,"HM Fraunces",Georgia,serif);letter-spacing:-.01em;color:#fff6e8;text-shadow:0 1px 2px rgba(6,4,22,.9),0 0 30px rgba(120,80,255,.45)}
.hfl-go{pointer-events:auto;display:block;margin:8px auto 0;min-height:44px;min-width:44px;padding:0 18px;border-radius:999px;border:1px solid rgba(255,255,255,.24);
  background:rgba(16,12,44,.5);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);color:rgba(255,255,255,.9);font:650 14px/1 var(--ff-ui,"HM Manrope",system-ui,sans-serif);cursor:pointer}
.hfl-chips{display:flex;gap:10px;margin-top:10px;opacity:0;transition:opacity .45s ease}
.hfl-chips.on{opacity:1}
.hfl-chips.bottom{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);justify-content:center;margin:0}
.hfl-chip{pointer-events:auto;min-height:44px;padding:0 20px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(20,14,52,.55);
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#fff;font:700 15px/1 var(--ff-ui,"HM Manrope",system-ui,sans-serif);cursor:pointer}
.hfl-chip.primary{background:linear-gradient(180deg,#ffe8b8,#ffcf7a);color:#2a1a08;border-color:transparent}
.hfl-dock{position:fixed;left:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);z-index:4;pointer-events:auto;max-width:calc(100vw - 32px);min-height:44px;display:flex;align-items:center;gap:8px;
  padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(14,10,40,.55);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
  color:rgba(255,255,255,.9);font:600 14px/1.2 var(--ff-ui,"HM Manrope",system-ui,sans-serif);opacity:0;transition:opacity .4s ease;cursor:pointer}
.hfl-dock.on{opacity:1}
@media (max-width: 359px){.hfl-line{font-size:18px;padding:6px 12px}.hfl-line.discovery{font-size:22px}.hfl-line.title{font-size:24px}.hfl-chips{margin-top:8px}}
@media (prefers-reduced-motion: reduce){.hfl-line,.hfl-chips,.hfl-dock{transition:opacity .2s linear}.hfl-line{transform:none}}
`;
  document.head.append(st);
}

/**
 * Lab subtitles: one short line at a time, soft fade, readable timing
 * (clamp(1400 + 55·chars, 2400, 7000) / speed), aria-live polite. The last line
 * of a held sequence stays until Continue is tapped (or clear()), and after
 * holdMs it docks as a replayable chip. A choice waits up to choiceMs (20 s, as
 * the shell's subtitles), then resolves null. Lines sit in band() — the slot the
 * world keeps clear — or, with no band, in the lowest free band between altY()
 * and slotY() (avoid rects: hard, then soft).
 */
export function createLabSubtitles({ root = document.body, band = null, avoid = () => [], speed = 1, holdMs = 8000, choiceMs = 20000, slotY = () => innerHeight * 0.52, altY = () => 92 } = {}) {
  injectStyle();
  const box = document.createElement('div');
  box.className = 'hfl-subs';
  box.setAttribute('aria-live', 'polite');
  box.setAttribute('role', 'status');
  const p = document.createElement('p'); p.className = 'hfl-line';
  const chips = document.createElement('div'); chips.className = 'hfl-chips';
  box.append(p, chips);
  const dock = document.createElement('button'); dock.className = 'hfl-dock'; dock.type = 'button';
  root.append(box, dock);
  let queue = Promise.resolve(), busy = 0, paused = false, skipFn = null;
  const wait = (ms) => new Promise((r) => { const t0 = performance.now(); const tick = () => { if (skipFn?.skipped) return r(); if (paused) { setTimeout(tick, 120); return; } if (performance.now() - t0 >= ms) r(); else setTimeout(tick, 60); }; tick(); });
  // Inside the world's band: centred in it (top-aligned if taller). Returns whether it fits.
  // Without a band: the lowest free band between altY() and slotY() that is clear of hard
  // rects (the thought, fingers) and, if possible, soft ones; else the roomiest.
  function place() {
    const need = box.offsetHeight || 60;
    const b = band?.();
    if (b && b.h > 0) {
      const y = need <= b.h ? b.y + (b.h - need) / 2 : b.y;
      box.style.transition = 'none';     // the band is fixed: no glide that could cross what is under it
      box.style.bottom = 'auto';
      box.style.top = `${Math.round(y)}px`;
      return need <= b.h + 2;
    }
    const rects = avoid() || [];
    const top = altY(), bottom = slotY();
    const bands = (useSoft) => {
      const cuts = rects.filter((r) => !r.soft || useSoft).map((r) => [Math.max(top, r.y - 6), Math.min(bottom, r.y + r.h + 6)]).filter(([a, c]) => c > a).sort((p1, p2) => p1[0] - p2[0]);
      const out = []; let y = top;
      for (const [a, c] of cuts) { if (a > y) out.push([y, a]); y = Math.max(y, c); }
      if (y < bottom) out.push([y, bottom]);
      return out;
    };
    let pick = null;
    for (const soft of [true, false]) {
      const fit = bands(soft).filter(([a, c]) => c - a >= need);
      if (fit.length) { pick = fit[fit.length - 1]; break; }
    }
    if (!pick) pick = bands(false).sort((p1, p2) => (p2[1] - p2[0]) - (p1[1] - p1[0]))[0] || [top, bottom];
    box.style.transition = '';
    box.style.top = 'auto';
    box.style.bottom = `${Math.max(0, innerHeight - pick[1])}px`;
    return pick[1] - pick[0] >= need;
  }
  // a discovery waits only for the line on screen (cut short), not for the dialogue queued behind it
  function queueFront(run) { const prev = current?.done || Promise.resolve(); return prev.then(run); }
  async function showLine(text, { kind = 'dialogue', hold = false } = {}) {
    let cutNow = null;
    const me = { kind, cut: () => cutNow?.(), done: null };
    current = me;
    let resolveDone; me.done = new Promise((r) => { resolveDone = r; });
    p.className = `hfl-line ${kind === 'discovery' || kind === 'title' ? kind : ''}`;
    p.textContent = text;
    // the line never takes a touch (play goes on underneath); a small button acknowledges a held line
    let go = null;
    if (hold) { go = document.createElement('button'); go.type = 'button'; go.className = 'hfl-go'; go.textContent = 'Continue'; p.append(go); }
    place();
    requestAnimationFrame(() => p.classList.add('on'));
    if (hold) {
      await new Promise((res) => {
        const done = () => { go?.removeEventListener('click', done); clearTimeout(tm); cutNow = null; res(); };
        const tm = setTimeout(() => { docked(text); done(); }, holdMs);
        go?.addEventListener('click', done);
        cutNow = done;          // clear() dismisses a held line too
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
  let pendingChoice = null, choiceGen = 0;
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
        // unanswered choices step aside after choiceMs (null), so nothing waits on them for ever
        const tm = setTimeout(() => pendingChoice?.(null), choiceMs);
        const mine = ++choiceGen;
        // (the fade-out clears only this choice's chips, never the next choice's)
        pendingChoice = (v) => { clearTimeout(tm); pendingChoice = null; p.classList.remove('on'); chips.classList.remove('on'); setTimeout(() => { if (choiceGen === mine) chips.replaceChildren(); }, 450); res(v); };
        p.className = 'hfl-line'; p.textContent = prompt;
        chips.replaceChildren(...options.map((o, i) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = `hfl-chip${i === options.length - 1 ? ' primary' : ''}`; b.textContent = o.label;
          b.onclick = () => pendingChoice?.(o.value);
          return b;
        }));
        chips.classList.remove('bottom');
        // too tall for the band (very small phones): the chips move to a row below the Mallow
        if (!place()) { chips.classList.add('bottom'); dock.classList.remove('on'); place(); }
        requestAnimationFrame(() => { p.classList.add('on'); chips.classList.add('on'); });
      })).finally(() => { busy--; });
      queue = job.catch(() => {});
      return job;
    },
    pause() { paused = true; }, resume() { paused = false; },
    /** Dismiss what is on screen: a pending choice resolves with null, a line is cut short. */
    clear() { gen++; current?.cut(); pendingChoice?.(null); p.classList.remove('on'); chips.classList.remove('on'); },
    get busy() { return busy > 0; },
    destroy() { box.remove(); dock.remove(); },
  };
  return api;
}
