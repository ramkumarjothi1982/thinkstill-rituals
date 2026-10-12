// GE-33 · ECLIPSE LENS — rotating shade lens (lens orbit).
// A blinding light hangs in the middle of the stage, throwing slow aperture
// rays, an anamorphic streak and hexagonal flare reflections. A smoky shade
// lens rests on a curved orbit rail beside it. Slide the lens along its orbit
// over the bright centre: wherever the glass overlaps the light it is seen
// calmly (granulated sun surface, or the person's own photo in its own
// colours). The uncovered crescent keeps a luminous edge that thins with the
// overlap, beads into a diamond ring at the last sliver, then settles as an
// even, soft corona around the rim — the glare softens but never disappears.
// The glare's outer edge contracts continuously towards the pearl ring (the
// selected brightness zone). Win: the lens rests centred, the glow sitting
// softly in the pearl ring.
//
// Photos: the main photo is the over-bright centre (glow tone, washed white);
// through the lens it is seen calmly in its own colours. The other photos hang
// as hexagonal flare reflections that cool from glare back to their own
// colours as the light softens, then gather in a calm orbit at the finale.
// Words: engraved around the lens's outer rim, lit by the light behind it.

import { TAU, clamp, lerp, invLerp, smooth, ease, rgba, mix, hex, glow, glint, glowSprite, orb, arcText, noise2, rng, motes, canvas } from '../fx.js';
import { Wobble } from '../kit.js';

export const meta = {
  id: 'GE-33',
  howTo: 'Slide the shade lens along its orbit over the bright centre.',
  steps: ['Touch the smoky lens resting beside the glare.', 'Slide it along its curved orbit, over the bright centre.', 'Let it rest when the glow sits softly in the pearl ring.'],
  tapAlt: 'each press glides the lens a little further along its orbit',
  words: 'Your words are engraved around the lens rim, lit by the softened glow behind it.',
  photos: {
    where: 'Your first photo is the bright centre; any others hang nearby as hexagonal flare reflections.',
    becomes: 'an over-bright light and its soft reflections',
    touch: 'You slide the shade lens over the glare;',
    change: 'through the glass the photo is seen calmly in its own colours, and each reflection cools from glare back to its own colours as the light softens.',
    payoff: 'At the end they gather in a calm orbit around the softened light.',
  },
  finaleSec: 4.2,
};

// radii in units of the light's radius
const GLASS = 1.12;                  // clear shade glass (a little wider than the light)
const KNURL = 1.2;                   // turning knurled ring
const ZONE = 1.7;                    // the pearl ring: the selected brightness zone
const T_GLASS = 0.3;                 // how much glare the shade lets through
const BEADS = 16, N = 220;

export function create(E) {
  const { g, stage, photos, words, pal } = E;
  const reduced = E.reduced, low = E.lowStim || E.reduced, heavy = E.heavy;
  const nz = noise2(E.seed + 33);
  const first = E.round === 1;
  const dir = first ? 1 : (E.rand() < 0.5 ? -1 : 1);
  const jitter = first ? 0 : (E.rand() - 0.5) * 0.16;
  const SWEEP = dir * Math.PI * (first ? 0.62 : 0.56 + E.rand() * 0.12);
  const glareMax = 1 - E.calm * 0.55;          // loop rounds start calmer
  const variant = first ? 0 : Math.floor(E.rand() * 3);
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);

  // ---- colours (all from the realm palette)
  const ink = pal.ink || pal.deep;
  const skyL = lum(pal.sky), bright = skyL > 0.45;
  const glareCol = mix('#fff3d6', pal.glow, 0.16);
  const streakCol = mix(pal.glow, '#ffffff', 0.35);
  const coronaCol = mix([pal.warm, pal.glow, pal.accent][variant], '#ffe8c4', 0.42);
  const zoneCol = mix(pal.glow, '#fff2d6', 0.4), pearlD = mix(ink, zoneCol, 0.45);
  const tint = mix(mix(ink, '#0a0820', 0.45), [pal.accent, pal.glow, pal.warm][variant], 0.2);
  const metalD = mix('#17151f', ink, 0.3), metalL = '#e6e1f2';
  const band = mix(mix('#3a3650', pal.accent, 0.3), ink, 0.25);          // anodised rim
  const glassHi = mix(pal.glow, '#ffffff', 0.4);
  const coatA = mix('#b58cff', pal.accent, 0.25), coatB = mix('#7dffd2', pal.glow, 0.25);   // lens coating
  const ghostCols = [mix(pal.glow, '#ffffff', 0.3), mix(pal.accent, '#ffffff', 0.35), mix(pal.warm, '#ffffff', 0.3)];

  // ---- photos: the hero is the bright centre, the rest become flare reflections
  const n = photos.n;
  const hero = n ? (E.round - 1) % n : -1;
  const others = [];
  for (let k = 1; k < n; k++) others.push((hero + k) % n);
  const K = Math.max(4, others.length);
  const slotPh = new Array(K).fill(-1);
  const shift = first ? 0 : Math.floor(E.rand() * K);
  for (let j = 0; j < others.length; j++) slotPh[(Math.round((j * K) / others.length) + shift) % K] = others[j];
  const ghosts = slotPh.map((ph, i) => ({
    ph, i, u: K === 1 ? 0.5 : i / (K - 1), r: ph >= 0 ? 0.5 : 0.2 + 0.16 * ((i * 0.618 + 0.2) % 1), rad0: 2.34 + (i % 2 ? 0.2 : -0.05), rad: 2.34,
    thr: 0.12 + 0.72 * ((i + 0.5) / K), clear: 0, cooling: false, col: ghostCols[(i + variant) % 3], spin: (i * 1.3) % TAU, ang: 0, x: 0, y: 0,
  }));
  // clear photo reflections first-to-last in a pleasing order (alternating ends)
  const order = ghosts.map((gh) => gh.i).sort((a, b) => Math.abs(a - (K - 1) / 2) - Math.abs(b - (K - 1) / 2)).reverse();
  order.forEach((gi, k) => { ghosts[gi].thr = 0.12 + 0.72 * ((k + 0.5) / K); });

  // ---- geometry (fitted to the stage)
  let Rs = 60, sx = 0, sy = 0, A0 = Math.PI / 2, RIM = 1.46, RO = 2.58, LEN = 1, GA = 0, finRx = 2.3, finRy = 2.3, finRing = true;
  const PX = new Float32Array(N + 1), PY = new Float32Array(N + 1), CUM = new Float32Array(N + 1);
  let backGrad = null, rayGrad = null, washGrad = null, discGrad = null, surface = null, surfaceRs = 0, track = null;
  // orbit start radius: the lens rim just clear of the light
  const unitPt = (u, a0, rim, out) => { const r = (1 + rim + 0.12) * Math.pow(1 - u, 1.06), a = a0 + SWEEP * u; out[0] = Math.cos(a) * r; out[1] = Math.sin(a) * r; return out; };
  const tmp2 = [0, 0];
  function bbox(a0, rim) {
    let x0 = -ZONE, x1 = ZONE, y0 = -ZONE, y1 = ZONE;
    for (let i = 0; i <= 40; i++) { const [x, y] = unitPt(i / 40, a0, rim, tmp2); x0 = Math.min(x0, x - rim); x1 = Math.max(x1, x + rim); y0 = Math.min(y0, y - rim); y1 = Math.max(y1, y + rim); }
    const ga = ghostArc(a0);
    for (const gh of ghosts) { const a = ga + (gh.u - 0.5) * Math.PI * 0.8 * dir, x = Math.cos(a) * gh.rad, y = Math.sin(a) * gh.rad; x0 = Math.min(x0, x - gh.r); x1 = Math.max(x1, x + gh.r); y0 = Math.min(y0, y - gh.r); y1 = Math.max(y1, y + gh.r); }
    return [x0, x1, y0, y1];
  }
  // flare reflections hang on the side opposite to where the lens starts
  function ghostArc(a0) { return a0 + Math.PI + dir * 0.35; }
  function fit() {
    const m = 6;
    // try a few starting places for the lens and keep the one that lets the light be largest
    const cands = [Math.PI / 2 + dir * (0.42 + jitter), Math.PI / 2 + dir * 0.08, Math.PI / 2 + dir * (Math.PI / 2 - 0.12)];
    let best = -1, bb = null;
    const sizeGhosts = (r) => { for (const gh of ghosts) { if (gh.ph >= 0) gh.r = Math.max(0.5, 23 / Math.max(10, r)); gh.rad = Math.max(gh.rad0, ZONE + gh.r + 0.1); } };
    sizeGhosts(1e9);
    for (let pass = 0; pass < 2; pass++) {
      best = -1;
      for (const a0 of cands) {
        const b = bbox(a0, RIM);
        const r = Math.min((stage.w - 2 * m) / (b[1] - b[0]), (stage.h - 2 * m) / (b[3] - b[2]), 98 * stage.s);
        if (r > best * 1.04) { best = r; A0 = a0; bb = b; }
      }
      // keep the engraved band wide enough for ≥ 12 px words
      // and photo reflections at least ~46 px tall
      if (pass === 0) { RIM = KNURL + Math.max(0.26, 15 / Math.max(10, best)); sizeGhosts(best); }
    }
    Rs = best; RO = 1 + RIM + 0.12;
    sx = stage.cx - ((bb[0] + bb[1]) / 2) * Rs; sy = stage.cy - ((bb[2] + bb[3]) / 2) * Rs;
    GA = ghostArc(A0);
    // the orbit rail, arc-length parametrised
    let L = 0;
    for (let i = 0; i <= N; i++) {
      unitPt(i / N, A0, RIM, tmp2); PX[i] = sx + tmp2[0] * Rs; PY[i] = sy + tmp2[1] * Rs;
      if (i) L += Math.hypot(PX[i] - PX[i - 1], PY[i] - PY[i - 1]);
      CUM[i] = L;
    }
    LEN = L || 1;
    for (let i = 0; i <= N; i++) CUM[i] /= LEN;
    track = new Path2D();
    track.moveTo(PX[0], PY[0]); for (let i = 1; i <= N; i++) track.lineTo(PX[i], PY[i]);
    for (const gh of ghosts) { gh.ang = GA + (gh.u - 0.5) * Math.PI * 0.8 * dir; }
    // the finale orbit must stay inside the stage
    const maxR = Math.max(...ghosts.map((gh) => gh.r));
    const clearR = RIM + maxR + 0.12;
    const ax = Math.min(sx - stage.x, stage.x + stage.w - sx) / Rs - maxR - 0.06, ay = Math.min(sy - stage.y, stage.y + stage.h - sy) / Rs - maxR - 0.06;
    finRing = ax >= clearR && ay >= clearR;          // gather into a calm orbit only where a full ring fits
    finRx = clamp(ax, clearR, 2.4); finRy = clamp(ay, clearR, 2.4);
    // cached gradients (the light never moves)
    backGrad = g.createRadialGradient(sx, sy, Rs * 0.6, sx, sy, Rs * 3.8);
    const wellC = mix(ink, '#05031a', 0.5);
    backGrad.addColorStop(0, rgba(wellC, bright ? 0.42 : 0.3)); backGrad.addColorStop(0.55, rgba(wellC, bright ? 0.24 : 0.16)); backGrad.addColorStop(1, rgba(wellC, 0));
    rayGrad = g.createRadialGradient(sx, sy, Rs * 0.4, sx, sy, Rs * 3.9);
    rayGrad.addColorStop(0, 'rgba(255,255,255,0.95)'); rayGrad.addColorStop(0.28, rgba(glareCol, 0.42)); rayGrad.addColorStop(1, rgba(glareCol, 0));
    washGrad = g.createRadialGradient(sx, sy, 0, sx, sy, Rs * 1.04);
    washGrad.addColorStop(0, 'rgba(255,255,255,0.72)'); washGrad.addColorStop(0.6, 'rgba(255,250,236,0.5)'); washGrad.addColorStop(0.92, 'rgba(255,250,236,0.62)'); washGrad.addColorStop(1, rgba(glareCol, 0.2));
    discGrad = g.createRadialGradient(sx, sy, 0, sx, sy, Rs);
    discGrad.addColorStop(0, '#ffffff'); discGrad.addColorStop(0.62, '#fffaf0'); discGrad.addColorStop(0.9, mix('#fff0cc', pal.glow, 0.2)); discGrad.addColorStop(1, mix('#ffe2a8', pal.glow, 0.25));
    if (!surface || Math.abs(surfaceRs - Rs) > 3) { surface = paintSurface(); surfaceRs = Rs; }
  }

  // the light's real surface, seen calmly through the shade glass (no photo)
  function paintSurface() {
    const S = Math.max(16, Math.ceil(Rs * 2.24 * dpr)), c = canvas(S, S), sg = c.getContext('2d'), R = S / 2.24, o = S / 2;
    const base = mix('#ffc86e', pal.warm, 0.12), hot = mix('#ffe6b0', pal.glow, 0.08), limb = mix('#cf5f26', pal.warm, 0.2);
    const gr = sg.createRadialGradient(o, o, 0, o, o, R);
    gr.addColorStop(0, hot); gr.addColorStop(0.55, base); gr.addColorStop(0.86, mix(base, limb, 0.55)); gr.addColorStop(1, limb);
    sg.save(); sg.beginPath(); sg.arc(o, o, R, 0, TAU); sg.clip();
    sg.fillStyle = gr; sg.fillRect(0, 0, S, S);
    const r = rng(E.seed * 3 + 7);
    // granulation: soft bright cells with darker lanes
    for (let i = 0; i < 300; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * R, x = o + Math.cos(a) * d, y = o + Math.sin(a) * d, cs = R * (0.05 + r() * 0.05);
      const cg = sg.createRadialGradient(x, y, 0, x, y, cs);
      const lit = r() < 0.6;
      cg.addColorStop(0, lit ? 'rgba(255,246,214,0.36)' : 'rgba(140,50,14,0.26)'); cg.addColorStop(1, 'rgba(255,240,200,0)');
      sg.fillStyle = cg; sg.beginPath(); sg.arc(x, y, cs, 0, TAU); sg.fill();
    }
    // two soft sunspots and a few bright faculae
    for (let i = 0; i < 2; i++) {
      const a = r() * TAU, d = R * (0.25 + r() * 0.4), x = o + Math.cos(a) * d, y = o + Math.sin(a) * d, cs = R * (0.07 + r() * 0.04);
      const cg = sg.createRadialGradient(x, y, 0, x, y, cs * 2);
      cg.addColorStop(0, 'rgba(90,30,10,0.55)'); cg.addColorStop(0.4, 'rgba(140,60,20,0.3)'); cg.addColorStop(1, 'rgba(160,80,30,0)');
      sg.fillStyle = cg; sg.beginPath(); sg.arc(x, y, cs * 2, 0, TAU); sg.fill();
    }
    sg.restore();
    // soft prominences beyond the limb
    sg.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const a = r() * TAU, x = o + Math.cos(a) * R, y = o + Math.sin(a) * R, cs = R * (0.08 + r() * 0.06);
      const cg = sg.createRadialGradient(x, y, 0, x, y, cs);
      cg.addColorStop(0, rgba(mix('#ff9a6a', pal.warm, 0.3), 0.5)); cg.addColorStop(1, 'rgba(255,140,90,0)');
      sg.fillStyle = cg; sg.beginPath(); sg.arc(x, y, cs, 0, TAU); sg.fill();
    }
    return c;
  }

  // ---- rail helpers
  const A = { x: 0, y: 0 };
  function idxOf(p) { let lo = 0, hi = N; while (lo < hi) { const m = (lo + hi) >> 1; if (CUM[m] < p) lo = m + 1; else hi = m; } return lo; }
  function at(p, out = A) {
    p = clamp(p);
    const i = Math.max(1, idxOf(p)), c0 = CUM[i - 1], c1 = CUM[i], k = c1 > c0 ? (p - c0) / (c1 - c0) : 0;
    out.x = lerp(PX[i - 1], PX[i], k); out.y = lerp(PY[i - 1], PY[i], k);
    return out;
  }
  /** nearest rail position to (x, y), searched near `around` so the lens never jumps */
  function project(x, y, around) {
    const c = idxOf(around), lo = Math.max(0, c - 34), hi = Math.min(N, c + 34);
    let best = around, bd = Infinity;
    for (let i = lo; i < hi; i++) {
      const ax = PX[i], ay = PY[i], dx = PX[i + 1] - ax, dy = PY[i + 1] - ay, l2 = dx * dx + dy * dy || 1;
      const k = clamp(((x - ax) * dx + (y - ay) * dy) / l2), qx = ax + dx * k, qy = ay + dy * k, d = (x - qx) * (x - qx) + (y - qy) * (y - qy);
      if (d < bd) { bd = d; best = lerp(CUM[i], CUM[i + 1], k); }
    }
    return best;
  }

  fit();
  E.onResize(fit);

  // ---- state
  let wanted = 0, rot = 0, assistTo = null;      // input-asked / law-allowed progress along the orbit
  let shownP = 0, shownV = 0, prevShown = 0;     // the lens's own spring along the rail
  let offX = 0, offY = 0, offVX = 0, offVY = 0;  // a little flex off the rail towards the finger
  let drag = null, grabDX = 0, grabDY = 0, fingX = 0, fingY = 0, fingerP = 0, dragT = 0, holdHinted = false;
  let roll = E.rand() * TAU, rollV = 0.05, rayA = E.rand() * TAU, lift = 0, call = 0, lastTickRoll = 0;
  let lit = 0, heroDone = false, reached = false, lastWait = -9, lastHap = -9, lastFocus = -9;
  let lx = 0, ly = 0, cover = 0, Ug = 1, dist = RO;
  let finAt = -1, twistAt = -1;
  const twistKind = E.round % 2 ? 'path' : 'moon';
  const wob = new Wobble();
  const beads = Array.from({ length: BEADS }, () => ({ k: 0 }));
  let hum = null, humAt = 0;
  at(0); lx = A.x; ly = A.y;

  const coverFrac = (d, r2) => {          // fraction of the unit light covered by a disc of radius r2 at distance d
    if (d >= 1 + r2) return 0;
    if (d <= r2 - 1) return 1;
    const a = Math.acos(clamp((d * d + 1 - r2 * r2) / (2 * d), -1, 1));
    const b = r2 * r2 * Math.acos(clamp((d * d + r2 * r2 - 1) / (2 * d * r2), -1, 1));
    const c = 0.5 * Math.sqrt(Math.max(0, (-d + 1 + r2) * (d + 1 - r2) * (d - 1 + r2) * (d + 1 + r2)));
    return clamp((a + b - c) / Math.PI);
  };
  const stopHum = () => { if (hum) { try { hum.stop(); } catch { /* ignore */ } hum = null; } };

  // ------------------------------------------------------------- frame --
  function frame(dt, t) {
    // ---- input → world law → real state
    if (drag != null) wanted = clamp(wanted + clamp(fingerP - wanted, -dt * 1.8, dt * 1.8));
    if (assistTo != null) { wanted = Math.min(assistTo, wanted + dt * 0.5); if (assistTo - wanted < 1e-3) assistTo = null; }
    rot = E.gate(wanted);
    if (wanted > rot + 0.05) wanted = rot + 0.05;          // no banking past the law

    // ---- the lens: a heavy glass on a rail (spring + inertia), flexing towards the finger
    const kS = 110, cS = 2 * Math.sqrt(kS) * 0.72;
    shownV += (kS * (rot - shownP) - cS * shownV) * dt; shownP += shownV * dt;
    if (finAt >= 0) { shownP = lerp(shownP, 1, 1 - Math.exp(-dt * 3)); }
    at(shownP);
    let tx = 0, ty = 0;
    if (drag != null) {
      tx = fingX + grabDX - A.x; ty = fingY + grabDY - A.y;
      const l = Math.hypot(tx, ty), mx = 12 * stage.s;
      if (l > mx) { tx *= mx / l; ty *= mx / l; }
      tx *= 0.6; ty *= 0.6;
    }
    offVX += (150 * (tx - offX) - 16 * offVX) * dt; offVY += (150 * (ty - offY) - 16 * offVY) * dt;
    offX += offVX * dt; offY += offVY * dt;
    lx = A.x + offX; ly = A.y + offY;
    // it turns as it rolls along the orbit, and keeps turning a little after you let go
    const ds = (shownP - prevShown) * LEN; prevShown = shownP;
    const spinTo = (dt > 0 ? ds / dt / (RIM * Rs) : 0) * dir + (reduced ? 0.02 : 0.06);
    rollV = lerp(rollV, spinTo, 1 - Math.exp(-dt * (Math.abs(ds) > 0.05 ? 6 : 1.4)));
    roll += rollV * dt;
    if ((drag != null || assistTo != null) && Math.abs(roll - lastTickRoll) > 0.42) { lastTickRoll = roll; E.sound('rotate-tick', { intensity: 0.18, pitch: lerp(0.85, 1.2, Ug) }); }
    lift = lerp(lift, drag != null || assistTo != null ? 1 : 0, 1 - Math.exp(-dt * 9));
    call = Math.max(0, call - dt * 1.4);
    const wv = wob.update(dt);
    rayA += dt * (reduced ? 0.012 : 0.04) * (0.4 + 0.6 * Ug) * (1 - E.calm * 0.5);

    // ---- optics: how much of the light the lens covers
    dist = Math.hypot(lx - sx, ly - sy) / Rs;
    cover = coverFrac(dist, RIM);
    Ug = clamp(0.82 * (1 - cover) + 0.18 * clamp(dist / 0.9));   // glare level: crescent + off-centre leak
    if (hum && t - humAt > 0.1) { humAt = t; hum.update({ intensity: 0.12 + 0.32 * Ug, pitch: lerp(0.82, 1.18, Ug) }); }

    // ---- real checkpoints (all driven by the gated state)
    const pr = Math.min(rot, shownP + 0.02);
    const nLit = Math.min(BEADS, Math.floor(rot * BEADS + 0.04));
    if (nLit > lit) {
      for (let i = lit; i < nLit; i++) { const b = beadPos(i); E.sound('glass', { note: 9 - Math.round((i * 9) / (BEADS - 1)), intensity: 0.3, pan: clamp((b.x - stage.cx) / (stage.w / 2), -1, 1) * 0.5 }); }
      if (t - lastHap > 0.12) { lastHap = t; E.haptic('tick'); }
    }
    lit = nLit;
    for (const gh of ghosts) {
      if (!gh.cooling && pr >= gh.thr) {
        gh.cooling = true;
        const sz = gh.r * Rs;
        if (gh.ph >= 0) { photos.dust(gh.ph, gh.x, gh.y, sz * 2, low ? 6 : 12, { shape: 'hex', up: 22, speed: 22, sizePx: 4.5 }); E.checkpoint('photo', gh.ph); E.sound('chime', { intensity: 0.26, pitch: lerp(1.2, 0.8, gh.thr) }); }
        else { E.particles.burst(gh.x, gh.y, low ? 3 : 6, { speed: 30, colour: gh.col, life: 1.1, size: 6 }); E.sound('glass', { note: 4 + (gh.i % 4), intensity: 0.22 }); }
        E.haptic('light');
      }
      if (gh.cooling) gh.clear = Math.min(1, gh.clear + dt / 1.1);
    }
    if (hero >= 0 && !heroDone && cover >= 0.6) {
      heroDone = true; E.checkpoint('photo', hero); E.sound('lens-focus', { intensity: 0.4, pitch: 0.9 });
      photos.dust(hero, sx, sy, Rs * 2, low ? 6 : 12, { shape: 'circle', up: 18, speed: 26, sizePx: 4 });
    }
    if (!reached && rot >= 0.998) {
      reached = true; E.sound('settle', { intensity: 0.45 }); E.haptic('soft'); E.react('release');
      E.ripples.add(sx, sy, { colour: zoneCol, r: ZONE * Rs * 0.9, speed: 26, alpha: 0.4 });
    } else if (reached && rot < 0.97) reached = false;
    if (drag != null && rot >= 0.998) { dragT += dt; if (dragT > 0.9 && !holdHinted) { holdHinted = true; E.hint('Let go — let the lens rest in the soft ring.'); } } else dragT = 0;

    // ---- draw
    const fin = finAt >= 0 ? smooth(clamp((t - finAt) / 2.4)) : 0;
    const I = Ug * glareMax;
    drawBackdrop();
    drawTrack(t, fin);
    drawGlare(t, I, fin);
    drawZone(t, fin);
    drawGhosts(t, I, fin);
    drawLight(t, I);
    drawLimb(t, I, fin);
    drawLens(t, I, fin, wv);
    drawBloom(t, I, fin);
    drawTwist(t, fin);
    drawThread(t);
    if (fin > 0 && !heavy && !low && Math.random() < 0.18 * (1 - fin * 0.6)) {
      const a = Math.random() * TAU, r = (RIM + 0.12) * Rs;
      E.particles.emit({ x: lx + Math.cos(a) * r, y: ly + Math.sin(a) * r, vx: Math.cos(a) * 14, vy: Math.sin(a) * 14 - 8, life: 1.6, size: 5, colour: coronaCol, alpha: 0.7, kind: 'glint' });
    }
  }

  // ----------------------------------------------------------- drawing --
  function drawBackdrop() {
    g.fillStyle = backGrad; g.fillRect(sx - Rs * 3.9, sy - Rs * 3.9, Rs * 7.8, Rs * 7.8);
  }
  function drawTrack(t, fin) {
    // the orbit rail: a faint groove with pearls flowing ahead of the lens
    const a = 1 - fin;
    if (a <= 0.01) return;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = rgba(bright ? ink : '#ffffff', 0.1 * a); g.lineWidth = 7 * stage.s; g.stroke(track);
    g.strokeStyle = rgba(zoneCol, 0.16 * a); g.lineWidth = 1.2; g.stroke(track);
    const i0 = idxOf(shownP), gap = 9;
    g.globalCompositeOperation = 'lighter';
    for (let i = i0 + 6; i <= N; i += gap) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.12);
      g.fillStyle = rgba(zoneCol, (0.18 + 0.32 * pulse) * a * (1 - (i - i0) / (N - i0 + 1) * 0.5));
      g.beginPath(); g.arc(PX[i], PY[i], 1.3 + pulse * 1.1, 0, TAU); g.fill();
    }
    g.restore();
  }
  function drawGlare(t, I, fin) {
    const br = reduced ? 1 : 1 + 0.035 * Math.sin(t * 1.25);
    glow(g, sx, sy, Rs * (1.9 + 1.9 * I) * br, glareCol, 0.14 + 0.48 * I + 0.08 * fin);
    glow(g, sx, sy, Rs * (1.2 + 0.6 * I), '#ffffff', 0.18 + 0.55 * I);
    if (I > 0.01) {
      // aperture rays: twelve slow spikes, longer when the glare is strong
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rayGrad; g.globalAlpha = 0.55 * I;
      g.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = rayA + (k * TAU) / 12, long = k % 2 ? 0.58 : 1;
        const len = Rs * (1.3 + 2.3 * I * long * (0.78 + 0.22 * nz(k * 3.1, t * 0.22)));
        const w = Rs * (k % 2 ? 0.035 : 0.055), ca = Math.cos(a), sa = Math.sin(a);
        g.moveTo(sx - sa * w, sy + ca * w); g.lineTo(sx + ca * len, sy + sa * len); g.lineTo(sx + sa * w, sy - ca * w); g.closePath();
      }
      g.fill();
      // anamorphic streak
      const sw = Rs * (2.2 + 2.0 * I), sh = Rs * (0.06 + 0.05 * I);
      g.globalAlpha = 0.6 * I;
      g.drawImage(glowSprite(streakCol), sx - sw, sy - sh, sw * 2, sh * 2);
      g.globalAlpha = 0.35 * I;
      g.drawImage(glowSprite('#ffffff'), sx - sw * 0.55, sy - sh * 0.5, sw * 1.1, sh);
      g.restore();
    }
    // a faint chromatic halo ring, the signature of real glare
    if (I > 0.02) {
      g.save(); g.globalCompositeOperation = 'lighter';
      const hr = Rs * (1.34 + 0.08 * I);
      for (const [c, o] of [['#ff8f8a', 0.05], ['#ffe9a0', 0], ['#8fe8c8', -0.04], ['#8ab4ff', -0.08]]) {
        g.strokeStyle = rgba(c, 0.13 * I); g.lineWidth = Rs * 0.05;
        g.beginPath(); g.arc(sx, sy, hr + o * Rs, 0, TAU); g.stroke();
      }
      g.restore();
    }
    // dust motes drifting through the light (they calm with it)
    motes(g, sx - Rs * 2.6, sy - Rs * 2.6, Rs * 5.2, Rs * 5.2, t * (reduced ? 0.3 : 1), glareCol, { n: low ? 12 : 26, alpha: 0.12 + 0.38 * I, seed: 33, size: 1.2 });
  }
  const BP = { x: 0, y: 0 };
  function beadPos(i, spin = 0) {
    const a = A0 + dir * ((i + 0.5) / BEADS) * TAU + spin;
    BP.x = sx + Math.cos(a) * ZONE * Rs; BP.y = sy + Math.sin(a) * ZONE * Rs;
    return BP;
  }
  function drawZone(t, fin) {
    // the selected brightness zone: a pearl ring; the glare's edge contracts towards it
    const zr = ZONE * Rs, inZone = smooth(invLerp(0.12, 0.01, Ug));
    const er = lerp(zr, Rs * 2.3, Ug);
    g.save(); g.globalCompositeOperation = 'lighter';
    // glare edge (luminous, continuous)
    for (const [w, a] of [[Rs * 0.3, 0.035], [Rs * 0.14, 0.07], [Rs * 0.05, 0.12]]) {
      g.strokeStyle = rgba(glareCol, a * (0.3 + 0.7 * Ug) * (1 - inZone * 0.75)); g.lineWidth = w;
      g.beginPath(); g.arc(sx, sy, er, 0, TAU); g.stroke();
    }
    g.restore();
    // the pearl ring itself: a fine double hairline
    g.strokeStyle = rgba(bright ? ink : zoneCol, (bright ? 0.26 : 0.2) + 0.3 * inZone); g.lineWidth = 1;
    g.beginPath(); g.arc(sx, sy, zr - 2.5, 0, TAU); g.stroke();
    g.beginPath(); g.arc(sx, sy, zr + 2.5, 0, TAU); g.stroke();
    if (inZone > 0.01) {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = rgba(zoneCol, 0.35 * inZone * (0.8 + 0.2 * Math.sin(t * 1.4))); g.lineWidth = Rs * 0.07;
      g.beginPath(); g.arc(sx, sy, zr, 0, TAU); g.stroke(); g.restore();
    }
    const spin = fin * t * 0.05 * dir;
    for (let i = 0; i < BEADS; i++) {
      const b = beads[i]; b.k = lerp(b.k, i < lit || fin > 0 ? 1 : 0, 0.12);
      const p = beadPos(i, spin), r = (2.1 + 1.2 * b.k) * stage.s + 0.6;
      g.fillStyle = rgba(bright ? ink : '#05031a', 0.35); g.beginPath(); g.arc(p.x + 0.6, p.y + 1, r + 0.6, 0, TAU); g.fill();
      if (b.k > 0.02) { glow(g, p.x, p.y, r * 5, zoneCol, 0.5 * b.k); orb(g, p.x, p.y, r, mix(pearlD, '#fffaf0', b.k * 0.85), { alpha: 0.75 + 0.25 * b.k }); }
      else {
        g.fillStyle = pearlD; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(p.x - r * 0.3, p.y - r * 0.35, r * 0.35, 0, TAU); g.fill();
      }
    }
  }
  function ghostPos(gh, t, fin) {
    // reflections drift subtly opposite to the lens (real flare parallax)
    const px = -(lx - sx) * 0.035, py = -(ly - sy) * 0.035;
    const bob = reduced ? 0 : Math.sin(t * 0.55 + gh.i * 1.7) * 2.2 * stage.s;
    let x = sx + Math.cos(gh.ang) * gh.rad * Rs + px, y = sy + Math.sin(gh.ang) * gh.rad * Rs + py + bob;
    if (fin > 0 && finRing) {
      const a = GA + dir * Math.PI * 0.5 + (gh.i / K) * TAU * dir + t * 0.045 * dir * (reduced ? 0.3 : 1);
      const k = ease.inOutSine(fin);
      x = lerp(x, sx + Math.cos(a) * finRx * Rs, k); y = lerp(y, sy + Math.sin(a) * finRy * Rs + bob, k);
    }
    gh.x = x; gh.y = y;
  }
  function drawGhosts(t, I, fin) {
    for (const gh of ghosts) {
      ghostPos(gh, t, fin);
      const sz = gh.r * Rs, gl = 1 - gh.clear, hr = gh.spin + roll * 0.15;
      if (gh.ph >= 0) {
        if (gh.cooling && gh.clear < 1) glow(g, gh.x, gh.y, sz * 1.8, coronaCol, 0.5 * (1 - gh.clear));
        photos.draw(g, gh.ph, gh.x, gh.y, sz * 2, { shape: 'hex', rot: Math.sin(hr) * 0.12, tone: 'glow', toneMix: gl, blur: gl * 0.7,
          glow: 0.25 + 0.55 * I * gl + 0.25 * gh.clear, glowColour: mix(glareCol, coronaCol, gh.clear), shadow: false, alpha: 0.82 + 0.18 * gh.clear });
        if (gl > 0.01) glow(g, gh.x, gh.y, sz * 1.05, '#ffffff', 0.42 * gl * (0.35 + 0.65 * I));
      } else {
        // decorative aperture ghost: a faint tinted hexagon of light
        const a = (0.14 + 0.3 * I) * (0.55 + 0.45 * gl) + 0.08 * fin;
        g.save(); g.translate(gh.x, gh.y); g.rotate(hr); g.globalCompositeOperation = 'lighter';
        hexPath(sz);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, sz);
        gr.addColorStop(0, rgba(gh.col, a * 0.12)); gr.addColorStop(0.6, rgba(gh.col, a * 0.3)); gr.addColorStop(0.92, rgba(gh.col, a * 0.75)); gr.addColorStop(1, rgba(coronaCol, a * 0.4));
        g.fillStyle = gr; g.fill();
        g.lineJoin = 'round';
        g.strokeStyle = rgba(gh.col, a * 0.22); g.lineWidth = 5; g.stroke();
        g.strokeStyle = rgba(mix(gh.col, '#ffffff', 0.5), a * 0.4); g.lineWidth = 1; g.stroke();
        g.restore();
        glow(g, gh.x, gh.y, sz * 1.6, gh.col, a * 0.35);
      }
    }
  }
  function hexPath(r) {
    g.beginPath();
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k * TAU) / 6, x = Math.cos(a) * r, y = Math.sin(a) * r; k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath();
  }
  function drawLight(t, I) {
    // the bright centre itself (over-bright; the lens will show it calmly)
    if (hero >= 0) {
      photos.draw(g, hero, sx, sy, Rs * 2, { shape: 'circle', tone: 'glow', toneMix: 1, blur: 0.2 + 0.45 * I, glow: 0.9, glowColour: glareCol, shadow: false });
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.18 + 0.62 * I; g.fillStyle = washGrad;
      g.beginPath(); g.arc(sx, sy, Rs * 1.03, 0, TAU); g.fill(); g.restore();
      glow(g, sx, sy, Rs * 1.25, '#ffffff', 0.3 * I);
    } else {
      g.fillStyle = discGrad; g.beginPath(); g.arc(sx, sy, Rs, 0, TAU); g.fill();
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.1 + 0.06 * (1 - I);
      g.translate(sx, sy); g.rotate(t * 0.015); g.drawImage(surface, -Rs * 1.12, -Rs * 1.12, Rs * 2.24, Rs * 2.24); g.restore();
    }
  }
  function drawLimb(t, I, fin) {
    // the luminous edge of whatever part of the light the lens does not cover
    if (cover >= 0.999) return;
    const rr = RIM * Rs * lensScale();
    g.save();
    g.beginPath(); g.rect(sx - Rs * 4, sy - Rs * 4, Rs * 8, Rs * 8); g.arc(lx, ly, rr, 0, TAU); g.clip('evenodd');
    g.globalCompositeOperation = 'lighter';
    const a = 0.22 + 0.4 * I;
    for (let k = 0; k < 24; k++) { const q = (k / 24) * TAU + rayA * 0.5; glow(g, sx + Math.cos(q) * Rs, sy + Math.sin(q) * Rs, Rs * 0.34, glareCol, a); }
    g.strokeStyle = rgba('#ffffff', 0.55 + 0.3 * I); g.lineWidth = 2.2 * stage.s;
    g.beginPath(); g.arc(sx, sy, Rs * 0.99, 0, TAU); g.stroke();
    g.restore();
    void t; void fin;
  }
  const lensScale = () => 1 + 0.035 * lift;
  function drawLens(t, I, fin, wv) {
    const sc = lensScale() + wv * 0.012;
    const rg = GLASS * Rs * sc, rk = KNURL * Rs * sc, rr = RIM * Rs * sc;
    const q = Math.atan2(sy - ly, sx - lx), facing = dist > 0.05 ? 1 : 0;
    // soft drop shadow: the lens floats above the light, higher while held
    const so = Rs * (0.07 + 0.12 * lift);
    const sh = g.createRadialGradient(lx + so * 0.5, ly + so, rr * 0.7, lx + so * 0.5, ly + so, rr * 1.18);
    sh.addColorStop(0, `rgba(4,2,16,${0.4 + 0.08 * lift})`); sh.addColorStop(1, 'rgba(4,2,16,0)');
    g.fillStyle = sh; g.beginPath(); g.arc(lx + so * 0.5, ly + so, rr * 1.18, 0, TAU); g.fill();

    // ---- the shade glass: tinted, translucent, with the light seen calmly through it
    g.save(); g.beginPath(); g.arc(lx, ly, rg, 0, TAU); g.clip();
    const body = g.createRadialGradient(lx - rg * 0.35, ly - rg * 0.4, rg * 0.1, lx, ly, rg * 1.05);
    body.addColorStop(0, rgba(mix(tint, glassHi, 0.35), 0.42 - 0.1 * fin)); body.addColorStop(0.6, rgba(tint, 0.55 - 0.1 * fin)); body.addColorStop(1, rgba(mix(tint, '#05031a', 0.4), 0.72 - 0.1 * fin));
    g.fillStyle = body; g.fillRect(lx - rg, ly - rg, rg * 2, rg * 2);
    if (hero >= 0) {
      glow(g, sx, sy, Rs * 1.5, coronaCol, 0.26 + 0.06 * fin);
      photos.draw(g, hero, sx, sy, Rs * 2, { shape: 'circle', tone: 'warm', toneMix: 0.14 * (1 - fin), shadow: false });
    } else {
      glow(g, sx, sy, Rs * 1.6, coronaCol, 0.26 + 0.06 * fin);
      g.save(); g.translate(sx, sy); g.rotate(t * 0.015); g.drawImage(surface, -Rs * 1.12, -Rs * 1.12, Rs * 2.24, Rs * 2.24); g.restore();
    }
    // a graduated shade that turns with the lens (the 'rotating shade') + fine polariser lines
    g.save(); g.translate(lx, ly); g.rotate(roll);
    const sg = g.createLinearGradient(-rg, 0, rg, 0);
    sg.addColorStop(0, rgba(tint, 0.38 * (1 - fin * 0.5))); sg.addColorStop(0.45, rgba(tint, 0.1)); sg.addColorStop(1, rgba(tint, 0));
    g.fillStyle = sg; g.fillRect(-rg, -rg, rg * 2, rg * 2);
    g.strokeStyle = 'rgba(255,255,255,0.04)'; g.lineWidth = 1;
    g.beginPath();
    for (let k = -9; k <= 9; k++) { const x = (k / 9) * rg; g.moveTo(x, -rg); g.lineTo(x, rg); }
    g.stroke();
    // thin-film coating sheen, the way a coated lens glints violet and green as it turns
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = rgba(coatA, 0.16); g.lineWidth = rg * 0.1;
    g.beginPath(); g.arc(0, 0, rg * 0.9, 0.35, 1.25); g.stroke();
    g.strokeStyle = rgba(coatB, 0.12); g.lineWidth = rg * 0.07;
    g.beginPath(); g.arc(0, 0, rg * 0.9, 1.3, 1.85); g.stroke();
    g.strokeStyle = rgba(coatA, 0.08); g.lineWidth = rg * 0.05;
    g.beginPath(); g.arc(0, 0, rg * 0.74, 3.6, 4.3); g.stroke();
    g.restore();
    // inner depth
    const vg = g.createRadialGradient(lx, ly, rg * 0.62, lx, ly, rg);
    vg.addColorStop(0, 'rgba(6,4,22,0)'); vg.addColorStop(1, 'rgba(6,4,22,0.4)');
    g.fillStyle = vg; g.fillRect(lx - rg, ly - rg, rg * 2, rg * 2);
    // glass reflections (fixed to the room, not to the turning lens)
    g.globalCompositeOperation = 'lighter';
    const rb = g.createLinearGradient(lx - rg, ly - rg * 0.2, lx + rg * 0.2, ly + rg);
    rb.addColorStop(0, 'rgba(255,255,255,0)'); rb.addColorStop(0.42, 'rgba(255,255,255,0)'); rb.addColorStop(0.5, 'rgba(255,255,255,0.075)'); rb.addColorStop(0.62, 'rgba(255,255,255,0.03)'); rb.addColorStop(0.7, 'rgba(255,255,255,0)');
    g.fillStyle = rb; g.fillRect(lx - rg, ly - rg, rg * 2, rg * 2);
    g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = rg * 0.06; g.lineCap = 'round';
    g.beginPath(); g.arc(lx, ly, rg * 0.84, -2.8, -1.8); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.beginPath(); g.ellipse(lx - rg * 0.38, ly - rg * 0.52, rg * 0.26, rg * 0.08, -0.6, 0, TAU); g.fill();
    // refraction: the glass edge catches the light on the side facing it
    g.strokeStyle = rgba(glareCol, 0.12 + 0.45 * I * facing); g.lineWidth = Math.max(2, rg * 0.04);
    g.beginPath(); g.arc(lx, ly, rg - 1.5, q - 1.1, q + 1.1); g.stroke();
    g.strokeStyle = rgba(coronaCol, 0.12 + 0.12 * (1 - Ug)); g.lineWidth = Math.max(1.5, rg * 0.025);
    g.beginPath(); g.arc(lx, ly, rg - 1.5, q + Math.PI - 0.8, q + Math.PI + 0.8); g.stroke();
    if (facing) glow(g, lx + Math.cos(q) * rg * 0.72, ly + Math.sin(q) * rg * 0.72, rg * 0.4, glareCol, 0.4 * I * (1 - cover * 0.6));
    g.restore();

    // ---- knurled ring (turns with the lens)
    g.fillStyle = metalD; g.beginPath(); g.arc(lx, ly, rk, 0, TAU); g.arc(lx, ly, rg, 0, TAU, true); g.fill();
    g.save(); g.translate(lx, ly); g.lineWidth = Math.max(1, Rs * 0.018);
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * TAU + roll, c = Math.cos(a), s = Math.sin(a);
      const light = 0.5 + 0.5 * Math.cos(a + 2.3);          // lit from the top-left
      g.strokeStyle = rgba(metalL, 0.08 + 0.36 * light);
      g.beginPath(); g.moveTo(c * (rg + 1), s * (rg + 1)); g.lineTo(c * (rk - 1), s * (rk - 1)); g.stroke();
    }
    g.restore();
    // ---- outer rim: anodised metal band with your words engraved
    const mg = g.createLinearGradient(lx - rr * 0.7, ly - rr, lx + rr * 0.7, ly + rr);
    mg.addColorStop(0, mix(band, '#ffffff', 0.42)); mg.addColorStop(0.3, band); mg.addColorStop(0.62, mix(band, '#05031a', 0.45)); mg.addColorStop(0.85, mix(band, '#05031a', 0.25)); mg.addColorStop(1, mix(band, '#ffffff', 0.12));
    g.fillStyle = mg; g.beginPath(); g.arc(lx, ly, rr, 0, TAU); g.arc(lx, ly, rk, 0, TAU, true); g.fill();
    // engraved groove for the words
    g.fillStyle = rgba('#05031a', 0.34); g.beginPath(); g.arc(lx, ly, rr - Math.max(2, Rs * 0.035), 0, TAU); g.arc(lx, ly, rk + Math.max(1.5, Rs * 0.025), 0, TAU, true); g.fill();
    // bevels: bright outer lip at the top-left, a dark inner lip
    const bv = g.createLinearGradient(lx - rr, ly - rr, lx + rr, ly + rr);
    bv.addColorStop(0, 'rgba(255,255,255,0.6)'); bv.addColorStop(0.5, 'rgba(255,255,255,0.08)'); bv.addColorStop(1, 'rgba(255,255,255,0.22)');
    g.strokeStyle = bv; g.lineWidth = 1.4;
    g.beginPath(); g.arc(lx, ly, rr - 0.7, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(5,3,26,0.55)'; g.lineWidth = 1.2;
    g.beginPath(); g.arc(lx, ly, rk + 0.6, 0, TAU); g.stroke();
    if (E.phase !== 'law') {
      const size = Math.max(12, Math.min(18, (rr - rk) * 0.74));
      arcText(g, words.token, lx, ly, (rk + rr) / 2 + 0.5, -Math.PI / 2, { size, colour: mix('#fff6e8', coronaCol, 0.2 * (1 - Ug)), glowColour: mix(glareCol, coronaCol, 1 - Ug), alpha: 0.97, maxSweep: Math.PI * 1.6 });
    }
    // a small bright index jewel on the knurl so the turning reads
    const na = roll - Math.PI / 2, nx = lx + Math.cos(na) * (rg + rk) / 2, ny = ly + Math.sin(na) * (rg + rk) / 2;
    glow(g, nx, ny, Rs * 0.12, zoneCol, 0.5 + 0.3 * call);
    orb(g, nx, ny, Math.max(1.8, Rs * 0.032), mix(zoneCol, '#ffffff', 0.5));
    if (call > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(zoneCol, 0.5 * call); g.lineWidth = 2; g.beginPath(); g.arc(lx, ly, rr + 6 + (1 - call) * 10, 0, TAU); g.stroke(); g.restore(); }
  }
  function drawBloom(t, I, fin) {
    const rr = RIM * Rs * lensScale(), D = dist * Rs;
    const q = Math.atan2(sy - ly, sx - lx);
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    // rim light where the light touches the bezel
    const near = smooth(invLerp(RO + 0.2, 1.0, dist)) * (1 - cover);
    if (near > 0.01 && dist > 0.02) {
      for (const [w, a] of [[Rs * 0.12, 0.12], [Rs * 0.04, 0.35], [1.4, 0.8]]) {
        g.strokeStyle = rgba(glareCol, a * near * (0.4 + 0.6 * I)); g.lineWidth = w;
        g.beginPath(); g.arc(lx, ly, rr, q - 0.85, q + 0.85); g.stroke();
      }
    }
    // the softened corona: appears as the crescent thins, evens out as the lens centres
    const ck = smooth(invLerp(0.55, 1, cover)) * (0.85 + 0.15 * Math.sin(t * 1.1)) + fin * 0.4;
    if (ck > 0.01) {
      const cr = rr + Rs * 0.06;
      // soft eclipse streamers: the sharp glare spikes become slow, calm petals of light
      const spr = glowSprite(coronaCol);
      for (let k = 0; k < 11; k++) {
        const a = rayA * -0.6 + (k * TAU) / 11 + 0.25 * Math.sin(k * 2.1);
        const len = Rs * (0.55 + 0.45 * (0.5 + 0.5 * nz(k * 1.7, t * 0.12))) * (0.8 + 0.4 * fin), w = Rs * (0.34 + 0.12 * (k % 3) / 2);
        g.save(); g.translate(lx, ly); g.rotate(a); g.globalAlpha = 0.34 * Math.min(1, ck);
        g.drawImage(spr, rr * 0.86, -w / 2, len + rr * 0.3, w);
        g.restore();
      }
      for (const [w, a] of [[Rs * 0.22, 0.07], [Rs * 0.09, 0.16], [Rs * 0.03, 0.42]]) {
        g.strokeStyle = rgba(coronaCol, a * ck); g.lineWidth = w;
        g.beginPath(); g.arc(lx, ly, cr, 0, TAU); g.stroke();
      }
      const lean = clamp(dist / 0.5) * smooth(invLerp(0.55, 1, cover));
      if (lean > 0.01) { g.strokeStyle = rgba(glareCol, 0.35 * lean); g.lineWidth = Rs * 0.05; g.beginPath(); g.arc(lx, ly, cr, q - 0.7, q + 0.7); g.stroke(); }
    }
    g.restore();
    // Baily's beads where the rim crosses the light's edge, a diamond ring at the last sliver
    if (D > Math.abs(rr - Rs) && D < rr + Rs && D > 0.5) {
      const a = (Rs * Rs - rr * rr + D * D) / (2 * D), h = Math.sqrt(Math.max(0, Rs * Rs - a * a));
      const ux = (lx - sx) / D, uy = (ly - sy) / D, mx = sx + ux * a, my = sy + uy * a;
      const bk = smooth(invLerp(0.4, 0.9, cover)) * (1 - smooth(invLerp(0.97, 1, cover)));
      if (bk > 0.01) {
        glint(g, mx - uy * h, my + ux * h, Rs * (0.22 + 0.14 * bk), '#ffffff', 0.75 * bk, 0.3);
        glint(g, mx + uy * h, my - ux * h, Rs * (0.22 + 0.14 * bk), '#ffffff', 0.75 * bk, 0.3);
      }
      const dk = smooth(invLerp(0.82, 0.96, cover)) * (1 - smooth(invLerp(0.985, 1, cover)));
      if (dk > 0.01) { const fx0 = sx - ux * Rs, fy0 = sy - uy * Rs; glint(g, fx0, fy0, Rs * 0.5 * dk, '#fffaf0', 0.8 * dk, 0.785); glow(g, fx0, fy0, Rs * 0.6, glareCol, 0.4 * dk); }
    }
    void fin;
  }
  function drawTwist(t, fin) {
    if (twistAt < 0) return;
    const k = t - twistAt;
    if (twistKind === 'path') {
      // three resting lights step out of the pearl ring into the quiet space the lens left
      for (let i = 0; i < 3; i++) {
        const e = ease.inOutSine(clamp((k - i * 0.45) / 2.4));
        if (e <= 0) continue;
        const a = A0 + dir * (0.05 + 0.1 * i), r = lerp(ZONE, ZONE + 0.42 + i * 0.4, e) * Rs * (1 - 0.15 * fin);
        const x = sx + Math.cos(a) * r, y = sy + Math.sin(a) * r, br = 0.8 + (reduced ? 0 : 0.2 * Math.sin(t * 1.2 + i));
        glow(g, x, y, Rs * 0.26 * br, zoneCol, 0.45 * e);
        orb(g, x, y, (2.4 + i * 0.5) * stage.s + 1, mix(zoneCol, '#ffffff', 0.5), { alpha: e });
      }
    } else {
      // a small pale crescent slips out from behind the light and keeps a slow orbit
      const e = ease.inOutSine(clamp(k / 2.8));
      const a = A0 - dir * 0.35 + k * 0.05 * dir * (reduced ? 0.3 : 1), r = lerp(0.6, ZONE + 0.34, e) * Rs;
      const x = sx + Math.cos(a) * r, y = sy + Math.sin(a) * r, mr = Math.max(5, Rs * 0.15);
      glow(g, x, y, mr * 3, '#e9e6ff', 0.3 * e);
      g.save(); g.globalAlpha = e;
      g.beginPath(); g.arc(x, y, mr, 0, TAU); g.arc(x + mr * 0.45 * Math.cos(a + 2.4), y + mr * 0.45 * Math.sin(a + 2.4), mr * 0.86, 0, TAU); g.clip('evenodd');
      g.fillStyle = '#f4f1ff'; g.beginPath(); g.arc(x, y, mr, 0, TAU); g.fill();
      g.restore();
    }
  }
  function drawThread(t) {
    // when the lens can't follow (the world law holds it), an elastic thread shows the pull
    if (drag == null) return;
    const dx = fingX - (lx - grabDX), dy = fingY - (ly - grabDY), l = Math.hypot(dx, dy), k = clamp((l - 18) / 70);
    if (k <= 0.01) return;
    const ex = lx - grabDX + dx, ey = ly - grabDY + dy, bx = lx - grabDX, by = ly - grabDY;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = rgba(zoneCol, 0.45 * k); g.lineWidth = 2;
    g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo((bx + ex) / 2, (by + ey) / 2 + 10 * (1 - k), ex, ey); g.stroke();
    g.restore();
    glow(g, ex, ey, 16, zoneCol, 0.4 * k);
    void t;
  }

  // -------------------------------------------------------------- input --
  const onLens = (p) => Math.hypot(p.x - lx, p.y - ly) <= RIM * Rs + 26;
  return {
    get progress() { return rot; },
    get done() { return rot >= 0.998 && drag == null && assistTo == null && Math.abs(shownP - rot) < 0.008 && Math.abs(shownV) < 0.06; },
    frame,
    down(p) {
      if (finAt >= 0) return;
      if (drag == null && onLens(p)) {
        drag = p.id; assistTo = null; wanted = rot; fingerP = rot;
        at(rot); grabDX = A.x - p.x; grabDY = A.y - p.y; fingX = p.x; fingY = p.y;
        const now = E.now();
        if (now - lastFocus > 1.2) { lastFocus = now; E.sound('lens-focus', { intensity: 0.32, pitch: lerp(0.9, 1.15, Ug) }); } else E.sound('click', { intensity: 0.3 });
        E.haptic('light'); wob.kick(0.5);
        stopHum(); hum = E.hold('hum', { intensity: 0.12 + 0.3 * Ug, pitch: lerp(0.82, 1.18, Ug) });
        return;
      }
      // a touch on the light or the sky: the light answers, the lens glints to say "move me"
      call = 1;
      E.sound('glass', { note: 6, intensity: 0.2 }); E.haptic('tick');
      E.particles.burst(p.x, p.y, low ? 2 : 5, { speed: 40, colour: glareCol, life: 0.7, size: 5, kind: 'glint' });
    },
    move(p) {
      if (p.id !== drag) return;
      fingX = p.x; fingY = p.y;
      fingerP = project(p.x + grabDX, p.y + grabDY, wanted);
      const now = E.now();
      if (E.locked && fingerP > rot + 0.03 && now - lastWait > 0.9) { lastWait = now; E.checkpoint('wait'); wob.kick(0.8); E.sound('bubble', { note: 1, intensity: 0.18 }); }
    },
    up(p) {
      if (p.id !== drag) return;
      drag = null; stopHum(); holdHinted = false;
      E.sound(rot >= 0.998 ? 'drop-in' : 'click', { intensity: 0.25 });
    },
    assist() {
      if (finAt >= 0) return;
      assistTo = Math.min(1, Math.max(wanted, rot) + 1 / 8);
      call = Math.max(call, 0.6);
    },
    // the lens's lower rim at progress p (laws draw guides and wakes here, clear of the photo and the words)
    pointAt(p) { const q = at(p, { x: 0, y: 0 }); return { x: q.x, y: q.y + (RIM + 0.08) * Rs }; },
    hint() {
      if (rot >= 0.995) return { tap: { x: lx, y: ly } };
      const p0 = rot, p1 = Math.min(1, rot + 0.3), pts = [];
      for (let i = 0; i <= 12; i++) { at(lerp(p0, p1, i / 12)); pts.push([A.x, A.y]); }
      return { path: pts };
    },
    twist() {
      if (twistAt >= 0) return;
      twistAt = E.now();
    },
    finish() {
      finAt = E.now(); stopHum(); drag = null;
      for (const gh of ghosts) if (!gh.cooling) { gh.cooling = true; if (gh.ph >= 0) E.checkpoint('photo', gh.ph); }
      E.sound(heavy ? 'breathe-out' : 'shimmer', { intensity: 0.35 });
    },
    destroy() { stopHum(); },
  };
}

function lum(h) { const [r, g, b] = hex(h); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; }
