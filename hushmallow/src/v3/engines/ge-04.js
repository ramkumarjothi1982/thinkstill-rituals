// GE-04 · ECHO DIMMER — layered echo tiles (tap plus volume slide).
// Three glass tiles hum with echoes: offset ghost copies of your words (and of
// your photos) keep rolling out of each clear copy and shivering. Tap the
// loudest tile (its echoes shake the most), then slide its glowing volume seam
// left, towards the quiet moon. The repeating sound layer — level wash,
// waveform bars, ghost copies, speaker ripples — fades notch by notch while the
// exact words stay crisp on top. Win: one clear sentence remains without the
// echo. At the finale the quiet tiles slide in behind the sentence tile (all
// layers aligned, no echo left) and the photos settle around it as calm,
// clear copies. The originals are never removed — only their echoes fade.

import { TAU, clamp, lerp, smooth, ease, rgba, mix, glow, orb, halo, motes, roundRect, shadow } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-04',
  howTo: 'Tap the loudest echo tile, then slide its seam to the quiet side.',
  steps: ['Tap the tile whose echoes shake the most.', 'Slide its glowing seam left, towards the little quiet moon.', 'Quieten each tile in turn until one clear sentence remains.'],
  tapAlt: 'each press slides the loudest tile’s seam one notch quieter',
  words: 'Your exact words sit on the sentence tile, crisp on top, while their ghost echoes fade underneath.',
  photos: {
    where: 'Your photos sit on the other echo tiles, each with shimmering ghost copies.',
    becomes: 'layered photo slides',
    touch: 'You quieten them by sliding each tile’s volume seam;',
    change: 'the ghost copies soften, fade and fold back until one calm, clear copy of each photo remains.',
    payoff: 'At the end they settle as calm, clear slides around your one clear sentence.',
  },
  finaleSec: 4,
};

const N = 3;              // echo tiles
const U0 = 0.94;          // seam start (loud side)
const UQ = 0.05;          // seam rest (quiet side)
const CAP = 0.045;        // input banked ahead of the law (progress units)
const G = 4;              // ghost copies per echo train
const NOTCH = 6;          // sound notches per seam travel
const SEAM_LAYERS = [[11, 0.1], [4.5, 0.3], [1.6, 0.95]];

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = E.reduced, low = E.lowStim, heavy = E.heavy, calm0 = E.calm;
  const R = () => E.rand();
  const quietCol = mix(pal.glow, '#e8f6ff', 0.55);
  const warmCol = mix(pal.warm || '#ffb37a', '#fff1d6', 0.45);
  const base = [pal.accent, pal.glow, pal.warm || '#ffb37a'].map((c) => mix(heavy ? mix(c, quietCol, 0.3) : c, '#ffffff', 0.1 + calm0 * 0.25));
  const crot = E.round === 1 ? 0 : Math.floor(R() * 3);

  // ------------------------------------------------------------- tiles --
  // round 1: the sentence sits in the middle and is the quietest, so it clears last
  const wordsSlot = E.round === 1 ? 1 : Math.floor(R() * N);
  const louds = [1, 0.7, 0.46].map((v) => v * (1 - calm0 * 0.35));
  const n = photos.n;
  const list = Array.from({ length: n }, (_, i) => (i + E.round - 1) % n);
  const nA = Math.ceil(n / 2);
  const photoSlots = [0, 1, 2].filter((s) => s !== wordsSlot);
  const tiles = [0, 1, 2].map((slot) => {
    const kind = slot === wordsSlot ? 'words' : 'photo';
    const pi = photoSlots.indexOf(slot);
    const ph = kind === 'photo' ? (pi === 0 ? list.slice(0, nA) : list.slice(nA)) : [];
    return { slot, kind, ph, L: 0, col: base[(slot + crot) % 3], ec: '#ffffff', vol: 0, su: U0, wob: new Wobble(), lift: 0, flare: 0, cue: 0,
      pulse: 0, clear: 0, quiet: false, ph0: R(), phase: R(), bob: R() * TAU, x: 0, y: 0, cs: 0, chH: 0, lx: [], side: pi === 0 ? -1 : 1 };
  });
  {
    let L = louds.slice();
    if (E.round === 1) { const a = R() < 0.5; tiles[photoSlots[0]].L = a ? L[0] : L[1]; tiles[photoSlots[1]].L = a ? L[1] : L[0]; tiles[wordsSlot].L = L[2]; }
    else { for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } tiles.forEach((t, i) => { t.L = L[i]; }); }
  }
  const order = [0, 1, 2].sort((a, b) => tiles[b].L - tiles[a].L);     // loudest first
  const rankOf = [0, 0, 0]; order.forEach((ti, r) => { rankOf[ti] = r; });
  const wordsTile = tiles[wordsSlot];

  // ------------------------------------------------------------ layout --
  let TW, TH, GAP, RAD, CW, trackW, GW, GH, wordSize, S = 1;
  let plateGrad, hiGrad, bandGrad, gripGrad;
  function fit() {
    S = stage.s;
    TW = Math.min(stage.w * 0.9, 430);
    GAP = clamp(stage.h * 0.04, 8, 22);
    TH = Math.min((stage.h * 0.9 - GAP * (N - 1)) / N, TW * 0.44);
    RAD = Math.min(20, TH * 0.22);
    CW = TW * 0.66;
    trackW = TW - 26;
    GW = Math.max(13, TW * 0.042); GH = TH * 0.44;
    wordSize = clamp(TH * 0.14, 13, 18);
    const total = TH * N + GAP * (N - 1), top = stage.cy - total / 2 + TH / 2;
    for (const t of tiles) {
      t.x = stage.cx; t.y = top + t.slot * (TH + GAP);
      t.lx.length = 0;
      if (t.kind === 'photo' && t.ph.length) {
        // fit the slides in one row: ≤ 74% of the tile height, inside the content band
        let sw = 0, mh = 0;
        const dims = t.ph.map((i) => photos.size(i, 'card', 100));
        for (const d of dims) { sw += d.w / 100; mh = Math.max(mh, d.h / 100); }
        const gap = 8, k = Math.min((TH * 0.74) / mh, (CW - gap * (t.ph.length - 1)) / sw);
        t.cs = k; t.chH = mh * k;   // cs = the card's longest side
        let x = -(sw * k + gap * (t.ph.length - 1)) / 2;
        for (const d of dims) { const w = (d.w / 100) * k; t.lx.push(x + w / 2); x += w + gap; }
      } else if (t.kind === 'photo') {
        t.cs = TH * 0.3; t.chH = t.cs;
        for (const f of [-0.32, 0, 0.32]) t.lx.push(f * CW);
      }
    }
    // static gradients in tile-local coordinates
    plateGrad = g.createLinearGradient(0, -TH / 2, 0, TH / 2);
    plateGrad.addColorStop(0, rgba(mix(pal.ink, '#ffffff', 0.16), 0.8));
    plateGrad.addColorStop(0.55, rgba(mix(pal.ink, pal.deep, 0.35), 0.84));
    plateGrad.addColorStop(1, rgba(mix(pal.ink, '#000010', 0.3), 0.9));
    hiGrad = g.createLinearGradient(0, -TH / 2, 0, -TH / 2 + TH * 0.45);
    hiGrad.addColorStop(0, 'rgba(255,255,255,0.13)'); hiGrad.addColorStop(1, 'rgba(255,255,255,0)');
    bandGrad = g.createLinearGradient(-TW / 2, 0, -TW / 2 + TW * 0.17, 0);
    bandGrad.addColorStop(0, rgba(quietCol, 0.3)); bandGrad.addColorStop(1, rgba(quietCol, 0));
    gripGrad = g.createLinearGradient(-GW / 2, 0, GW / 2, 0);
    gripGrad.addColorStop(0, mix(quietCol, '#5a6488', 0.55)); gripGrad.addColorStop(0.42, '#ffffff');
    gripGrad.addColorStop(0.6, mix(quietCol, '#ffffff', 0.6)); gripGrad.addColorStop(1, mix(quietCol, '#3a4468', 0.6));
  }
  fit();
  E.onResize(fit);
  const sxOf = (u) => -trackW / 2 + u * trackW;

  // ------------------------------------------------------------- state --
  let wanted = 0, p = 0, doneCount = 0, sel = -1, assistTo = null, drag = null, doneFlag = false;
  let finAt = -1, twistAt = -1, lastNotch = 0, lastTickT = -1, waitT = -1, hum = null, hinted = false, idleT = 0;
  const activeTile = () => (doneCount < N ? tiles[order[doneCount]] : null);

  function select(t) {
    sel = tiles.indexOf(t);
    E.sound('glass', { note: 4 + doneCount * 2, intensity: 0.42, pan: (t.x - stage.cx) / stage.w });
    E.haptic('light');
    E.ripples.add(t.x + sxOf(t.su), t.y, { colour: t.ec, alpha: 0.4, speed: 90, r: 8 });
    E.react('tap');
    t.pulse = 1;
  }
  function complete(t) {
    t.quiet = true; t.clear = 1; doneCount++; sel = -1; lastNotch = 0;
    E.checkpoint('step');
    E.sound('chime', { intensity: 0.42, pitch: 1 + doneCount * 0.06 });
    E.haptic('soft');
    E.react(doneCount >= N ? 'success' : 'nod');
    E.ripples.add(t.x - TW * 0.38, t.y, { colour: quietCol, alpha: 0.45, speed: 70, r: 10 });
    const m = reduced || low ? 5 : 12;
    for (let k = 0; k < m; k++) E.particles.emit({ x: t.x + (R() - 0.2) * TW * 0.7, y: t.y + (R() - 0.5) * TH * 0.7, vx: -30 - R() * 50, vy: (R() - 0.5) * 18, life: 1.1, size: 5, colour: quietCol, drag: 0.95 });
    for (let j = 0; j < t.ph.length; j++) {
      const i = t.ph[j];
      photos.dust(i, t.x + t.lx[j], t.y, t.cs, reduced ? 5 : 10, { shape: 'card', up: 16, speed: 18, sizePx: 4 });
      E.checkpoint('photo', i);
    }
    if (doneCount === 1 && !hinted) { hinted = true; E.hint('Lovely. Now tap the next loudest tile and slide its seam.'); }
    if (doneCount >= N) E.sound('settle', { intensity: 0.5 });
  }

  // ------------------------------------------------------------- frame --
  function frame(dt, time) {
    S = stage.s;
    // assisted presses travel the same path, at a slow sliding pace
    if (assistTo != null) { wanted = Math.min(assistTo, wanted + dt * 0.32); if (wanted >= assistTo - 1e-4) assistTo = null; }
    const lo = doneCount / N, hi = Math.min(1, (doneCount + 1) / N);
    wanted = clamp(wanted, lo, hi);
    p = Math.max(lo, Math.min(hi, E.gate(wanted)));
    if (wanted > p + CAP) wanted = p + CAP;
    const act = activeTile();
    if (act) {
      const qa = clamp(p * N - doneCount);
      const notch = Math.floor(qa * NOTCH + 1e-6);
      if (notch !== lastNotch) {
        const down = notch > lastNotch; lastNotch = notch;
        if (time - lastTickT > 0.07) {
          lastTickT = time;
          E.sound('pluck', { note: clamp(8 - notch, 1, 9), intensity: down ? lerp(0.42, 0.14, qa) : 0.2, pan: sxOf(act.su) / stage.w });
          E.haptic('tick');
          act.pulse = 1;
          if (!reduced) E.particles.emit({ x: act.x + sxOf(act.su), y: act.y + (R() - 0.5) * TH * 0.5, vx: -24 - R() * 30, vy: (R() - 0.5) * 16, life: 0.7, size: 4, colour: act.ec, kind: 'glint' });
        }
      }
      if (qa >= 0.995) complete(act);
    }
    if (!doneFlag && doneCount >= N && !drag && assistTo == null) doneFlag = true;
    if (!drag && assistTo == null && finAt < 0) idleT += dt; else idleT = 0;

    // per-tile physics: seam spring, lift, wobble, echo phase
    const tw = twistAt >= 0 ? clamp((E.now() - twistAt) / 3.4) : 0, twOn = tw > 0 && tw < 1;
    let loudAll = 0;
    for (let i = 0; i < N; i++) {
      const t = tiles[i], r = rankOf[i];
      const q = r < doneCount ? 1 : r === doneCount ? clamp(p * N - r) : 0;
      t.su = lerp(t.su, lerp(U0, UQ, q), 1 - Math.exp(-dt * 16));
      const qs = clamp((U0 - t.su) / (U0 - UQ));
      t.vol = t.quiet ? 0 : t.L * (1 - qs);
      t.ec = mix(quietCol, t.col, clamp(t.vol * 1.25));
      t.lift = lerp(t.lift, sel === i && finAt < 0 ? 1 : 0, 1 - Math.exp(-dt * 10));
      t.wob.update(dt);
      t.flare = Math.max(0, t.flare - dt * 1.2);
      t.pulse = Math.max(0, t.pulse - dt * 3);
      t.clear = Math.max(0, t.clear - dt * 0.8);
      const isNext = act === t && sel < 0 && finAt < 0;
      t.cue = (isNext ? 0.16 + 0.16 * Math.sin(time * 2.2) + Math.min(0.4, idleT * 0.08) * (0.5 + 0.5 * Math.sin(time * 2.2)) : 0) + t.flare;
      const rate = (0.3 + 0.9 * t.vol) * (reduced ? 0.35 : 1) * (1 - calm0 * 0.35);
      t.ph0 = (t.ph0 + dt * (twOn ? 0.25 : rate)) % 1;
      if (twOn) t.ph0 = lerp(t.ph0, (time * 0.25) % 1, Math.min(1, dt * 2));     // the echoes fall into step
      loudAll += t.vol / N;
    }
    if (hum) hum.update?.({ intensity: 0.04 + 0.18 * (act ? act.vol : 0), pitch: lerp(0.85, 1.15, act ? act.vol : 0) });

    // ---- drawing
    const fin = finAt >= 0 ? smooth(clamp((E.now() - finAt) / 2.4)) : 0;
    const total = TH * N + GAP * (N - 1), span = Math.max(TW, total);
    glow(g, stage.cx, stage.cy, span * 0.78, mix(quietCol, tiles[order[0]].col, loudAll * 1.3), 0.11 + 0.07 * loudAll + 0.08 * fin);
    halo(g, stage.cx, fin ? lerp(stage.cy, stage.cy, fin) : stage.cy, span * (0.6 + 0.15 * fin), time, mix(quietCol, '#ffffff', 0.3), { rings: 5, alpha: 0.045 + 0.08 * loudAll + 0.05 * fin, speed: (0.04 + 0.1 * loudAll) * (reduced ? 0.4 : 1) });
    if (!low) motes(g, stage.x, stage.y, stage.w, stage.h, time, quietCol, { n: reduced ? 12 : 24, alpha: 0.32, seed: 44, size: 1.5 });

    if (fin <= 0) {
      for (let i = 0; i < N; i++) if (i !== sel) drawTile(tiles[i], time, 0);
      if (sel >= 0) drawTile(tiles[sel], time, 0);
      drawTether(time);
      if (twOn) drawTwist(tw, time);
    } else {
      // finale: the quiet layers slide in behind the sentence tile and align; photos settle around it
      for (const t of tiles) if (t !== wordsTile) drawPlate(t, placement(t, time, fin), time);
      const wp = placement(wordsTile, time, fin);
      glow(g, wp.x, wp.y, TW * 0.8, heavy ? quietCol : warmCol, 0.22 * fin);
      drawPlate(wordsTile, wp, time);
      drawWordsContent(wordsTile, wp, time, fin);
      for (const t of tiles) if (t !== wordsTile) drawPhotoContent(t, placement(t, time, fin), time, fin);
      halo(g, wp.x, wp.y, TW * (0.5 + 0.35 * fin), time * 0.6, heavy ? quietCol : warmCol, { rings: 3, alpha: 0.12 * fin * (1 - fin * 0.4), speed: 0.12 });
    }
  }

  // ------------------------------------------------------------ drawing --
  const P = { x: 0, y: 0, sc: 1, a: 1 };
  function placement(t, time, fin) {
    const k = ease.inOutSine(fin);
    const bob = reduced ? 0 : Math.sin(time * 0.7 + t.bob) * 1.6 * (1 - k);
    P.x = t.x + t.wob.v * 7; P.y = t.y + bob - t.lift * 2; P.sc = 1 + 0.025 * t.lift; P.a = 1;
    if (fin > 0) {
      if (t === wordsTile) { P.y = lerp(P.y, stage.cy, k); P.sc = 1 + 0.06 * k; }
      else { P.y = lerp(P.y, stage.cy + t.side * 4, k * 0.97); P.sc = 1 - 0.03 * k; P.a = 1 - 0.85 * k; }
    }
    return P;
  }
  function drawTile(t, time, fin) {
    const pl = placement(t, time, fin);
    drawPlate(t, pl, time);
    if (t.kind === 'words') drawWordsContent(t, pl, time, fin);
    else drawPhotoContent(t, pl, time, fin);
  }
  function jx(t, k, time) { return Math.sin(time * 29 + k * 2.3 + t.phase * 9); }
  function jy(t, k, time) { return Math.cos(time * 23 + k * 1.7 + t.phase * 5); }
  const vibOf = (t) => (reduced || low ? 0 : t.vol * 1.9 * S * (heavy ? 0.6 : 1) * (1 - calm0 * 0.5) * (1 + t.cue * 0.6));

  function drawPlate(t, pl, time) {
    const vol = t.vol, sel = t.lift, vib = vibOf(t);
    g.save(); g.translate(pl.x, pl.y); g.scale(pl.sc, pl.sc); g.globalAlpha = pl.a;
    shadow(g, 0, TH * 0.5 + 6 + sel * 4, TW * 0.52, TH * 0.16, 0.3 + sel * 0.14);
    // the tile itself echoes: layered ghost plates offset up-right, shivering with the volume
    if (vol > 0.01) {
      g.lineWidth = 1.2;
      for (let k = 3; k >= 1; k--) {
        const off = k * vol * 6.5 * S * (1 - t.pulse * 0.2);
        roundRect(g, -TW / 2 + off + jx(t, k, time) * vib * 0.6, -TH / 2 - off * 0.55 + jy(t, k, time) * vib * 0.6, TW, TH, RAD);
        g.fillStyle = rgba(t.ec, 0.05 * vol * (4 - k)); g.fill();
        g.strokeStyle = rgba(t.ec, 0.34 * vol * (1 - k / 4.2)); g.stroke();
      }
    }
    // glass body
    roundRect(g, -TW / 2, -TH / 2, TW, TH, RAD); g.fillStyle = plateGrad; g.fill();
    g.save(); g.clip();
    g.fillStyle = bandGrad; g.fillRect(-TW / 2, -TH / 2, TW * 0.17, TH);
    const sx = sxOf(t.su);
    g.globalCompositeOperation = 'lighter';
    // the repeating sound layer: level wash + waveform bars from the quiet edge up to the seam
    if (vol > 0.004) {
      g.fillStyle = rgba(t.ec, 0.03 + 0.12 * vol); g.fillRect(-TW / 2, -TH / 2, sx + TW / 2, TH);
      const amp = TH * 0.46 * (0.1 + 0.9 * vol), sp = (1 + 3 * vol) * (reduced ? 0.3 : 1);
      g.beginPath();
      for (let bx = -TW / 2 + 9; bx < sx - 5; bx += 7) {
        const h = amp * (0.25 + 0.75 * Math.abs(Math.sin(bx * 0.061 + time * sp + t.phase * 6) * Math.sin(bx * 0.017 - time * 0.9 + t.phase)));
        g.rect(bx, -h / 2, 2.4, h);
      }
      g.fillStyle = rgba(t.ec, 0.05 + 0.15 * vol); g.fill();
      // speaker ripples on the loud side
      g.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const k = (time * (0.35 + 0.8 * vol) * (reduced ? 0.4 : 1) + i / 3 + t.phase) % 1;
        g.strokeStyle = rgba(t.ec, 0.6 * vol * (1 - k) * smooth(k * 5));
        g.beginPath(); g.arc(TW / 2 - TW * 0.17, 0, TH * (0.14 + 0.34 * k), -0.6, 0.6); g.stroke();
      }
    }
    if (t.clear > 0) { g.fillStyle = rgba(quietCol, 0.14 * t.clear); g.fillRect(-TW / 2, -TH / 2, TW, TH); }
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = hiGrad; g.fillRect(-TW / 2, -TH / 2, TW, TH * 0.45);
    g.restore();
    // rim (breathes on the loudest tile; bright when chosen)
    roundRect(g, -TW / 2, -TH / 2, TW, TH, RAD);
    g.strokeStyle = rgba(sel > 0.05 || t.cue > 0.05 ? mix(t.ec, '#ffffff', 0.35) : '#ffffff', Math.min(0.95, 0.16 + 0.45 * sel + 0.5 * t.cue)); g.lineWidth = 1.2 + 1.3 * sel + t.cue; g.stroke();
    // quiet side: a little moon
    moon(-TW / 2 + TW * 0.075, 0, Math.max(6, TH * 0.085), quietCol, 0.45 + 0.35 * sel + (t.quiet ? 0.45 : 0));
    drawSeam(t, sx, sel, time);
    g.restore();
  }
  function moon(x, y, r, col, a) {
    glow(g, x, y, r * 3.2, col, 0.32 * a);
    g.save(); g.globalAlpha *= Math.min(1, a); g.fillStyle = rgba(col, 0.92);
    g.beginPath(); g.arc(x, y, r, 0.955, TAU - 0.955); g.arc(x + r * 0.5, y, r * 0.82, -1.476, 1.476, true); g.closePath(); g.fill();
    g.restore();
  }
  function drawSeam(t, sx, sel, time) {
    const top = -TH / 2 + 7, bot = TH / 2 - 7;
    const sc = t.quiet ? quietCol : mix(t.ec, '#ffffff', 0.35);
    const k = t.quiet ? 0.55 : 0.6 + 0.4 * sel;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const [w, al] of SEAM_LAYERS) {
      g.strokeStyle = rgba(al > 0.9 ? '#ffffff' : sc, al * k * (1 + t.pulse * 0.4)); g.lineWidth = w;
      g.beginPath(); g.moveTo(sx, top); g.lineTo(sx, bot); g.stroke();
    }
    g.restore();
    glow(g, sx, 0, GH * (1 + 0.4 * sel + 0.3 * t.pulse), sc, 0.22 + 0.35 * sel + 0.3 * t.cue);
    // grip: a glass bead riding the seam
    g.save(); g.translate(sx, 0);
    roundRect(g, -GW / 2, -GH / 2, GW, GH, GW / 2); g.fillStyle = gripGrad; g.fill();
    g.strokeStyle = rgba('#ffffff', 0.5 + 0.35 * sel); g.lineWidth = 1; g.stroke();
    g.strokeStyle = rgba(pal.ink, 0.4); g.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-GW * 0.22, i * GH * 0.14); g.lineTo(GW * 0.22, i * GH * 0.14); g.stroke(); }
    g.restore();
    // chevrons drifting towards the quiet side while the tile is chosen
    if (sel > 0.05 && !t.quiet && sx > -TW * 0.25) {
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const kk = reduced ? i / 3 + 0.17 : (time * 0.7 + i / 3) % 1;
        const cx2 = sx - GW - 6 - kk * TW * 0.16, al = sel * 0.6 * Math.sin(kk * Math.PI);
        g.strokeStyle = rgba('#ffffff', al);
        g.beginPath(); g.moveTo(cx2 + 5, -7); g.lineTo(cx2, 0); g.lineTo(cx2 + 5, 7); g.stroke();
      }
      g.restore();
    }
  }
  function clipPlate(pl) {
    const w = TW * pl.sc, h = TH * pl.sc;
    roundRect(g, pl.x - w / 2, pl.y - h / 2, w, h, RAD * pl.sc); g.clip();
  }
  function drawWordsContent(t, pl, time, fin) {
    if (E.phase === 'law') return;               // the closing-move law shows the words itself
    const vol = t.vol, vib = vibOf(t);
    g.save(); g.translate(pl.x, pl.y); g.scale(pl.sc, pl.sc);
    if (vol > 0.01) {
      // ghost duplicates: an echo train rolling out of the clear copy, fading as it travels
      g.save(); roundRect(g, -TW / 2, -TH / 2, TW, TH, RAD); g.clip(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = mix(t.ec, '#ffffff', 0.35);
      const spanW = vol * 34 * S * (1 - t.pulse * 0.25);
      for (let k = G - 1; k >= 0; k--) {
        const f = (k + t.ph0) / G, al = vol * 0.55 * (1 - f) * smooth(f * 5);
        if (al < 0.01) continue;
        words.draw(g, f * spanW + jx(t, k, time) * vib, -f * spanW * 0.32 + jy(t, k, time) * vib, { style: 'echo', size: wordSize, maxWidth: CW, lines: 3, alpha: al });
      }
      g.restore();
    }
    // the exact words: always crisp, always on top of their echoes
    words.draw(g, 0, 0, { style: 'light', size: wordSize, maxWidth: CW, lines: 3, alpha: 1, glowColour: fin > 0 ? mix(quietCol, heavy ? quietCol : warmCol, fin) : mix(quietCol, t.ec, Math.min(1, vol * 1.4)) });
    g.restore();
  }
  function drawPhotoContent(t, pl, time, fin) {
    const vol = t.vol, vib = vibOf(t), k = ease.inOutSine(fin);
    const spanW = vol * 30 * S * (1 - t.pulse * 0.25);
    const fy = stage.cy + t.side * (TH * 0.56 + 12 * S + t.chH * 0.55);
    const items = t.ph.length || 3;
    for (let j = 0; j < items; j++) {
      const i = t.ph.length ? t.ph[j] : -1;
      let x = pl.x + t.lx[j] * pl.sc, y = pl.y;
      if (fin > 0) { x = lerp(x, stage.cx + t.lx[j] * 1.04, k); y = lerp(y, fy + (reduced ? 0 : Math.sin(time * 1.2 + j * 1.3 + t.slot) * 2.5 * k), k); }
      const sz = t.cs * (fin > 0 ? lerp(pl.sc, 1.06, k) : pl.sc);
      if (vol > 0.01) {
        g.save(); clipPlate(pl); g.globalCompositeOperation = 'lighter';
        for (let e = G - 1; e >= 0; e--) {
          const f = (e + t.ph0) / G, al = vol * 0.42 * (1 - f) * smooth(f * 5);
          if (al < 0.01) continue;
          const ox = x + f * spanW + jx(t, e + j, time) * vib, oy = y - f * spanW * 0.32 + jy(t, e + j, time) * vib;
          if (i >= 0) photos.draw(g, i, ox, oy, sz, { shape: 'card', alpha: al, tone: 'mist', toneMix: 0.55, shadow: false });
          else { g.strokeStyle = rgba(t.ec, al * 1.3); g.lineWidth = 1.6; g.beginPath(); g.arc(ox, oy, sz * 0.5, 0, TAU); g.stroke(); }
        }
        g.restore();
      }
      if (i >= 0) {
        const gc = fin > 0 ? (heavy ? quietCol : warmCol) : t.ec;
        photos.draw(g, i, x, y, sz, { shape: 'card', tone: 'mist', toneMix: vol * 0.4, glow: 0.14 + 0.25 * vol + 0.35 * t.clear + 0.3 * k, glowColour: gc, shadow: fin > 0.5 });
      } else {
        // no photos: glossy sound pearls, calming from the tile colour to a pale pearl
        const r = sz * 0.5;
        glow(g, x, y, r * 2.3, fin > 0 ? (heavy ? quietCol : warmCol) : t.ec, 0.3 + 0.2 * vol + 0.3 * t.clear);
        orb(g, x, y, r, fin > 0 ? mix(mix(quietCol, '#ffffff', 0.2), heavy ? quietCol : warmCol, k * 0.6) : mix(mix(quietCol, '#ffffff', 0.15), t.col, clamp(vol * 1.3)));
      }
    }
  }
  function drawTether(time) {
    if (!drag || drag.t.quiet) return;
    const t = drag.t, sx = t.x + sxOf(t.su) * (1 + 0.025 * t.lift), dx = drag.fx - sx;
    if (Math.abs(dx) < 10) return;
    // the finger is ahead of the seam (the law is pacing it): a soft elastic thread of light
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const y = t.y, sag = Math.min(14, Math.abs(dx) * 0.12);
    for (const [w, al] of SEAM_LAYERS) {
      g.strokeStyle = rgba(al > 0.9 ? '#ffffff' : t.ec, al * 0.55); g.lineWidth = w * 0.6;
      g.beginPath(); g.moveTo(sx, y); g.quadraticCurveTo((sx + drag.fx) / 2, y + sag, drag.fx, y); g.stroke();
    }
    g.restore();
    glow(g, drag.fx, y, 16, t.ec, 0.5 + 0.15 * Math.sin(time * 4));
  }
  function drawTwist(tw, time) {
    // the plot twist: the echoes fall into step and a cool hush-wave sweeps across every tile
    const total = TH * N + GAP * (N - 1);
    const x = lerp(stage.cx - TW * 0.62, stage.cx + TW * 0.62, ease.inOutSine(tw)), a = Math.sin(tw * Math.PI);
    const gr = g.createLinearGradient(x - 40, 0, x + 40, 0);
    gr.addColorStop(0, rgba(quietCol, 0)); gr.addColorStop(0.5, rgba(quietCol, 0.22 * a)); gr.addColorStop(1, rgba(quietCol, 0));
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - 40, stage.cy - total / 2 - 6, 80, total + 12); g.restore();
    if (!reduced && R() < 0.35) E.particles.emit({ x, y: stage.cy + (R() - 0.5) * total, vx: 10, vy: -12, life: 0.9, size: 5, colour: '#ffffff', kind: 'glint' });
  }

  // -------------------------------------------------------------- input --
  function tileAt(pt) {
    for (const t of tiles) if (Math.abs(pt.x - t.x) <= TW / 2 + 12 && Math.abs(pt.y - t.y) <= TH / 2 + GAP / 2) return t;
    return null;
  }
  return {
    get progress() { return p; },
    get done() { return doneFlag; },
    frame,
    down(pt) {
      if (finAt >= 0) return;
      const t = tileAt(pt); if (!t) return;
      idleT = 0;
      const act = activeTile();
      if (t.quiet || !act) {
        // already quiet: a soft clear note, nothing to do
        E.sound('glass', { note: 8, intensity: 0.22 }); E.haptic('tick'); t.clear = Math.max(t.clear, 0.5);
        E.ripples.add(pt.x, pt.y, { colour: quietCol, alpha: 0.3, speed: 60, r: 6 });
        return;
      }
      if (t !== act) {
        // not the loudest yet: a gentle wobble, and the loudest tile flares so it's easy to find
        t.wob.kick(0.8); act.flare = 1;
        E.sound('click', { intensity: 0.25 }); E.haptic('tick');
        return;
      }
      if (sel !== tiles.indexOf(t)) select(t);
      else { E.sound('pluck', { note: 3, intensity: 0.3 }); E.haptic('light'); t.pulse = 1; }
      if (!drag) {
        drag = { id: pt.id, t, lastX: pt.x, fx: pt.x, fy: pt.y };
        hum = E.hold ? E.hold('hum', { intensity: 0.08 }) : null;
      }
    },
    move(pt) {
      if (!drag || pt.id !== drag.id) return;
      const dx = pt.x - drag.lastX; drag.lastX = pt.x; drag.fx = pt.x; drag.fy = pt.y;
      const t = drag.t; if (t.quiet || finAt >= 0) return;
      const dq = (-dx / trackW) / (U0 - UQ);
      wanted = clamp(wanted + dq / N, doneCount / N, Math.min((doneCount + 1) / N, p + CAP));
      if (E.locked && wanted >= p + CAP - 1e-3 && E.now() - waitT > 0.6) { waitT = E.now(); E.checkpoint('wait'); }
    },
    up(pt) {
      if (!drag || pt.id !== drag.id) return;
      drag = null; if (hum) { hum.stop?.(); hum = null; }
      if (doneCount >= N && assistTo == null) doneFlag = true;
    },
    assist() {
      if (finAt >= 0 || doneCount >= N) return;
      const t = activeTile();
      if (sel !== tiles.indexOf(t)) select(t);
      const q = clamp(Math.max(wanted, p) * N - doneCount);
      const nq = Math.min(1, (Math.floor(q * 3 + 0.02) + 1) / 3);
      assistTo = (doneCount + nq) / N;
    },
    pointAt(pp) {
      const v = clamp(pp), r = clamp(Math.floor(v * N - 1e-9), 0, N - 1);
      const t = tiles[order[r]], q = clamp(v * N - r);
      return { x: t.x + sxOf(lerp(U0, UQ, q)), y: t.y };
    },
    hint() {
      const t = activeTile();
      if (!t) return { tap: { x: wordsTile.x, y: wordsTile.y } };
      if (sel !== tiles.indexOf(t)) return { tap: { x: t.x, y: t.y } };
      const x0 = t.x + sxOf(t.su), x1 = t.x + sxOf(UQ - 0.03), pts = [];
      for (let i = 0; i <= 16; i++) pts.push([lerp(x0, x1, i / 16), t.y + Math.sin((i / 16) * Math.PI) * 3]);
      return { path: pts };
    },
    twist() { twistAt = E.now(); },
    finish() {
      finAt = E.now();
      if (drag) { drag = null; }
      if (hum) { hum.stop?.(); hum = null; }
      for (const t of tiles) if (!t.quiet) { t.quiet = true; for (const i of t.ph) E.checkpoint('photo', i); }
      E.sound(heavy ? 'settle' : 'bloom', { intensity: heavy ? 0.4 : 0.5 });
      if (!heavy && !reduced) E.particles.burst(stage.cx, stage.cy, low ? 8 : 18, { speed: 70, colour: warmCol, life: 1.4, size: 5, kind: 'glint' });
      else E.ripples.add(stage.cx, stage.cy, { colour: quietCol, alpha: 0.35, speed: 50, r: 20 });
    },
    destroy() { if (hum) { hum.stop?.(); hum = null; } },
  };
}
