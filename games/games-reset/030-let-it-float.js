/* 030 Let It Float — Reset · DISTANCE · Memory / Replay / Rumination
 * Mechanism: "leaves on a stream", the ACT defusion exercise (Hayes, Strosahl & Wilson): putting each thought on something
 * that floats and watching it drift away practises noticing a thought without gripping it or pushing it off. Each looping
 * thought (a strand) is handwritten on a sheet; three crease drags fold it into a paper boat; you set it down gently and the
 * current carries it into the distance, smaller and smaller (self-distancing). The heaviest one snags on a rock: touching
 * the boat does nothing, rippling the water beside it frees it, in its own time ("Some take longer. That's fine.").
 * Verb: fold (three crease drags), set down (gently), let go (ripple the water, never the boat).
 * Finale: the stream opens onto a lake at sunset; the boats gather, a little light flickers on in each, and one last ripple
 * sends them drifting toward the horizon until they are out of sight.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2, R2 = Math.SQRT2, H2 = R2 / 2, YB = H2 + 0.5, HB = R2 - YB, S2 = Math.SQRT1_2;
  const hex = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, k) => { const p = hex(a), q = hex(b); k = clamp(k, 0, 1); const f = (i) => Math.round(p[i] + (q[i] - p[i]) * k); return '#' + ((1 << 24) + (f(0) << 16) + (f(1) << 8) + f(2)).toString(16).slice(1); };
  const rgba = (c, a) => { const p = hex(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
  const lerp = (a, b, k) => a + (b - a) * k;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
  function seedRng(s) { let x = (s * 2654435761) >>> 0 || 7; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  const HAND = '"Klee One", "Segoe Print", "Bradley Hand", "Noteworthy", "Chalkboard SE", system-ui, "Inter", "Segoe UI", Roboto, sans-serif';
  const DISPLAY = '"Shippori Mincho B1", "Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "Iowan Old Style", "Palatino Linotype", Georgia, serif';

  /* Today's season on the stream (the same all day). Each has a sunlit (bright) and a golden-evening (dark) palette. */
  const SEASONS = [
    { id: 'spring', name: 'Blossom Stream', debris: 'petal', deb: ['#ffd3e2', '#ffc2d8', '#fff2f6'], paper: 'sakura', accent: '#e7849f', bird: 'trill',
      bright: { sky: '#eef8f0', canopy: ['#93cf94', '#64a56d', '#3f7d52'], bankFar: '#b9dca9', bank: ['#8fca72', '#69ab58'], earth: '#9a7b52', shallow: '#aee5d2', mid: '#55baab', deep: '#24868a', bed: '#dccfa0', glow: '#fffbe6', flower: ['#8fa8ff', '#ffffff', '#ffc2d8'], foam: '#ffffff' },
      dark: { sky: '#123029', canopy: ['#24533f', '#1a4032', '#0f2b22'], bankFar: '#2b5240', bank: ['#23472d', '#173520'], earth: '#3a2f22', shallow: '#2e7466', mid: '#175b55', deep: '#0b3a3e', bed: '#5b5a3c', glow: '#ffd9a0', flower: ['#8a9cf0', '#dfe6ff', '#f4b6cc'], foam: '#e8f4ee' } },
    { id: 'summer', name: 'Summer Stream', debris: 'fluff', deb: ['#fffbe8', '#fff3c4', '#ffffff'], paper: 'sky', accent: '#3f9fd8', bird: 'chirp',
      bright: { sky: '#f3f9e6', canopy: ['#86c46c', '#529c4f', '#2f7440'], bankFar: '#bcdd92', bank: ['#7dc25a', '#58a64a'], earth: '#a4824e', shallow: '#a8e8d8', mid: '#4cc0b0', deep: '#1e8d93', bed: '#e5d59e', glow: '#fffbe0', flower: ['#ffd84a', '#ffffff', '#ff9f6b'], foam: '#ffffff' },
      dark: { sky: '#17291b', canopy: ['#30502b', '#213c22', '#132a16'], bankFar: '#3b5629', bank: ['#2b4823', '#1d361a'], earth: '#3e3020', shallow: '#37735c', mid: '#1c5d51', deep: '#0c3b3b', bed: '#6a5e3a', glow: '#ffcf7a', flower: ['#f0c040', '#fff0c0', '#ff9f6b'], foam: '#f4f0dc' } },
    { id: 'autumn', name: 'Amber Stream', debris: 'leaf', deb: ['#e8643a', '#f2a23d', '#c2452a', '#f5c451'], paper: 'maple', accent: '#d9762f', bird: 'wren',
      bright: { sky: '#fcf2de', canopy: ['#e3a552', '#ca7a3c', '#8f5a32'], bankFar: '#ddca97', bank: ['#bbb466', '#97974f'], earth: '#94683e', shallow: '#bcdecd', mid: '#5fa9a0', deep: '#2b7a80', bed: '#d9c18e', glow: '#fff2d0', flower: ['#e8643a', '#f2b33d', '#a8422a'], foam: '#fffaf0' },
      dark: { sky: '#211b12', canopy: ['#5e3d1f', '#45311a', '#2a2012'], bankFar: '#4b4329', bank: ['#3b3b21', '#2c2c18'], earth: '#3a2a18', shallow: '#406858', mid: '#22504a', deep: '#0f3436', bed: '#6a5232', glow: '#ffb862', flower: ['#d0582f', '#e8a83a', '#8a3a24'], foam: '#f2ead8' } },
    { id: 'winter', name: 'Frost Stream', debris: 'snow', deb: ['#ffffff', '#eaf4ff'], paper: 'snow', accent: '#6f9cc8', bird: 'none',
      bright: { sky: '#f1f6fb', canopy: ['#bccbca', '#91a8a8', '#6f8a8c'], bankFar: '#f2f6f8', bank: ['#e7eff3', '#d0dee5'], earth: '#8d8a86', shallow: '#bce1e8', mid: '#6db4c5', deep: '#2e7d96', bed: '#cacdc5', glow: '#ffffff', flower: ['#ffffff', '#cfe6ff', '#e05a5a'], foam: '#ffffff' },
      dark: { sky: '#111d28', canopy: ['#26363f', '#1b2a32', '#121c24'], bankFar: '#4a5a66', bank: ['#3b4b57', '#2c3a46'], earth: '#2a2a2c', shallow: '#30606c', mid: '#1d4858', deep: '#0c2c3c', bed: '#4a525a', glow: '#cfe4ff', flower: ['#e8f0ff', '#a8c8ff', '#d04848'], foam: '#e8f4ff' } }
  ];
  /* Paper for each kind of thought (the same kind always gets the same paper); the season brings its own for the heavy one. */
  const PAPERS = {
    notebook: { name: 'Notebook', base: '#f7f2e4', ink: '#2b3a6b', design: 'ruled' },
    graph: { name: 'Graph paper', base: '#f2f6ee', ink: '#24433a', design: 'grid' },
    kraft: { name: 'Kraft', base: '#dcbd8f', ink: '#3b2a1a', design: 'kraft' },
    airmail: { name: 'Airmail', base: '#eef3fb', ink: '#23315c', design: 'airmail' },
    newsprint: { name: 'Newsprint', base: '#ece8de', ink: '#26231f', design: 'news' },
    rice: { name: 'Rice paper', base: '#f8f4eb', ink: '#3a2f2a', design: 'fibre' },
    sakura: { name: 'Sakura washi', base: '#fbe4ea', ink: '#5a2a3a', design: 'sakura' },
    sky: { name: 'Sky washi', base: '#ddedf8', ink: '#1f3550', design: 'clouds' },
    maple: { name: 'Maple washi', base: '#f6e2c9', ink: '#4a2a14', design: 'maple' },
    snow: { name: 'Snow washi', base: '#f8fbff', ink: '#2a3a58', design: 'flakes' }
  };
  const PAPER_COUNT = Object.keys(PAPERS).length;
  const LOOP_PAPER = { replay: 'notebook', whatif: 'graph', shouldhave: 'kraft', mindread: 'airmail', worstcase: 'newsprint', body: 'rice', todo: 'notebook', urge: 'kraft', other: 'rice' };
  /* Boat designs are earned by gentle skill (tiers), and stay unlocked. */
  const DESIGNS = ['Classic', 'Pennant', 'Lantern', 'Gilded'];
  const GENERIC = [{ label: 'THAT THING I SAID', loop: 'replay' }, { label: 'WHAT IF IT GOES WRONG', loop: 'whatif' }, { label: 'SHOULD’VE DONE BETTER', loop: 'shouldhave' }, { label: 'WHAT THEY THINK', loop: 'mindread' }, { label: 'TOMORROW’S LIST', loop: 'todo' }];
  // stream song: D major, harp arpeggios in 6/8 that rise and fall like ripples
  const SONG = [['D2', ['D4', 'A4', 'E5', 'F#5', 'A5', 'E5']], ['B1', ['B3', 'F#4', 'D5', 'A4', 'F#5', 'D5']], ['G1', ['G3', 'D4', 'B4', 'F#5', 'D5', 'B4']], ['A1', ['A3', 'E4', 'C#5', 'E5', 'A5', 'E5']]];
  const BELLS = ['A5', 'D6', 'E6', 'F#6', 'A6', 'B6'], SEND = ['D5', 'F#5', 'A5', 'B5', 'D6'];

  /* The kit's daily pick, reproduced so tomorrow's season can be named honestly. */
  const dayVal = (d) => d.getFullYear() * 1000 + Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  function pickFor(dv, arr, salt) {
    let x = (dv * 2654435761 + (salt || 0) * 40503 + Array.from('let-it-float').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13;
    return arr[(x >>> 0) % arr.length];
  }

  /* ---------------- origami: each fold turns a flap of paper about its crease line ----------------
     Sheet units: width 1, height √2 (a portrait A-sheet). A fold by c = cos(angle) maps a point at distance d from the
     crease to distance d·c (c = 1 open, 0 edge-on, -1 folded flat), which is an affine map, so every facet is one clip
     and one drawImage of the paper texture through its own transform. */
  const MI = [1, 0, 0, 1, 0, 0];
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const foldM = (px, py, nx, ny, c) => { if (Math.abs(c) < 0.015) c = c < 0 ? -0.015 : 0.015; const k = 1 - c, d = nx * px + ny * py; return [1 - k * nx * nx, -k * nx * ny, -k * nx * ny, 1 - k * ny * ny, k * nx * d, k * ny * d]; };
  const F1 = (c) => foldM(0, H2, 0, -1, c), R1 = foldM(0, H2, 0, -1, -1);
  const F2L = (c) => foldM(0.5, H2, -S2, -S2, c), F2R = (c) => foldM(0.5, H2, S2, -S2, c), F3 = (c) => foldM(0, YB, 0, 1, c);
  const PO = {
    FULL: [[0, 0], [1, 0], [1, R2], [0, R2]], A: [[0, H2], [1, H2], [1, R2], [0, R2]], B: [[0, 0], [1, 0], [1, H2], [0, H2]],
    AL: [[0, H2], [0.5, H2], [0, YB]], AR: [[1, H2], [0.5, H2], [1, YB]], AROOF: [[0.5, H2], [1, YB], [0, YB]], ABRIM: [[0, YB], [1, YB], [1, R2], [0, R2]],
    BL: [[0, H2], [0.5, H2], [0, HB]], BR: [[1, H2], [0.5, H2], [1, HB]], BROOF: [[0.5, H2], [1, HB], [0, HB]], BBRIM: [[0, HB], [1, HB], [1, 0], [0, 0]]
  };
  /* Facets in draw order for each step. A flap facet also carries its crease (P, n) and the transform that brought it to
     where it lies now (pre), so the renderer can lift it toward you by its height above the table: a shear that grows with
     distance from the crease, so the hinge stays attached. */
  function facets(st, c, c2) {
    const P1 = [0, H2], P2 = [0.5, H2], P3 = [0, YB], nL = [-S2, -S2], nR = [S2, -S2];
    if (st <= 1) return [{ p: PO.A, M: MI, s: 0 }, { p: PO.B, M: F1(c), s: c < 0 ? 1 : 0, flap: 1, P: P1, n: [0, -1], pre: MI }];
    if (st === 2) {
      const fl = F2L(c), fr = F2R(c), over = c < 0;
      const aL = { p: PO.AL, M: fl, s: over ? 1 : 0, flap: 1, P: P2, n: nL, pre: MI }, bL = { p: PO.BL, M: mul(fl, R1), s: over ? 0 : 1, flap: 1, P: P2, n: nL, pre: R1 };
      const aR = { p: PO.AR, M: fr, s: over ? 1 : 0, flap: 1, P: P2, n: nR, pre: MI }, bR = { p: PO.BR, M: mul(fr, R1), s: over ? 0 : 1, flap: 1, P: P2, n: nR, pre: R1 };
      return [{ p: PO.AROOF, M: MI, s: 0 }, { p: PO.ABRIM, M: MI, s: 0 }, { p: PO.BROOF, M: R1, s: 1 }, { p: PO.BBRIM, M: R1, s: 1 }].concat(over ? [bL, aL, bR, aR] : [aL, bL, aR, bR]);
    }
    const L2 = F2L(-1), R2m = F2R(-1);
    const roof = [{ p: PO.AROOF, M: MI, s: 0 }, { p: PO.BROOF, M: R1, s: 1 }, { p: PO.BL, M: mul(L2, R1), s: 0 }, { p: PO.AL, M: L2, s: 1 }, { p: PO.BR, M: mul(R2m, R1), s: 0 }, { p: PO.AR, M: R2m, s: 1 }];
    const seam = { line: [[0.5, H2 + 0.015], [0.5, YB]], M: MI };   // where the two folded corners meet (the band later covers its foot)
    if (st === 3) return [{ p: PO.ABRIM, M: MI, s: 0 }].concat(roof, [seam, { p: PO.BBRIM, M: mul(F3(c), R1), s: c < 0 ? 0 : 1, flap: 1, P: P3, n: [0, 1], pre: R1 }]);
    return [{ p: PO.ABRIM, M: F3(c2), s: c2 < 0 ? 1 : 0 }].concat(roof, [seam, { p: PO.BBRIM, M: mul(F3(-1), R1), s: 0 }]); // the hat: the back brim tucks behind
  }
  // the fold about (P, n) by c, plus a displacement of (ox, oy) per unit of distance from the crease (height made visible)
  const liftM = (P, n, c, ox, oy) => { const m = foldM(P[0], P[1], n[0], n[1], c), dP = n[0] * P[0] + n[1] * P[1]; m[0] += ox * n[0]; m[2] += ox * n[1]; m[4] -= ox * dP; m[1] += oy * n[0]; m[3] += oy * n[1]; m[5] -= oy * dP; return m; };
  // crease geometry per fold (current coordinates): a point on the crease, the unit normal toward the flap
  const CREASE = { 1: { P: [0, H2], n: [0, -1] }, 2: { P: [0.5, H2], n: [-S2, -S2], n2: [S2, -S2] }, 3: { P: [0, YB], n: [0, 1] } };
  const SHAPE_V = { 1: H2, 2: (H2 + R2) / 2, 3: (H2 + R2) / 2, 4: (H2 + YB) / 2, 5: (H2 + YB) / 2 };

  /* Lines in all three vibes: Drop (feelings, meaning) and Still (calm). Gentle throughout: this game meets grief too. */
  const L = {
    start: { Jolly: 'Every thought gets its own little boat. You fold it, the stream does the carrying.', Cheeky: 'Paper boats, your thoughts, and a stream that never gets tired of carrying things.', Unfiltered: 'Fold a thought into a boat. Set it on the water. The stream takes it.' },
    crease: { Jolly: 'Lovely crease. Paper likes to be sure.', Cheeky: 'Crisp. Origami teachers everywhere just nodded.', Unfiltered: 'Good crease. Keep going.' },
    boat: { Jolly: 'Look at that, a real boat!', Cheeky: 'Shipbuilder. Who knew?', Unfiltered: 'A boat. Nice.' },
    setDown: { Jolly: 'Set it on the water, gently. Then let go.', Cheeky: 'Gently. It’s a boat, not a basketball.', Unfiltered: 'Water. Gently. Then let go.' },
    firstFloat: { Jolly: 'Letting it float isn’t throwing it away. It just doesn’t have to sit in your hands.', Cheeky: 'It’s not gone. It’s just not your job to carry it right now.', Unfiltered: 'Not throwing it away. Just not holding it.' },
    watch: { Jolly: 'You don’t have to watch it the whole way.', Cheeky: 'No need to escort it. It knows the way.', Unfiltered: 'No need to follow it.' },
    gentle: { Jolly: 'So gentle. Barely a ripple.', Cheeky: 'Smooth. The fish didn’t even notice.', Unfiltered: 'Gentle. Good.' },
    splashy: { Jolly: 'Bit of a splash! It floats either way. Softer next time.', Cheeky: 'Cannonball! Still floats. Softer next time.', Unfiltered: 'Splashy. It floats anyway.' },
    ripple: { Jolly: 'The water doesn’t mind company.', Cheeky: 'Go on, make ripples. Very important work.', Unfiltered: 'Ripples. Nice.' },
    stuckIn: { Jolly: 'Oh. This one’s caught on the rock.', Cheeky: 'Uh oh. That one’s clinging to the rock.', Unfiltered: 'That one’s stuck.' },
    stuckTip: { Jolly: 'Don’t grab it. Ripple the water beside it.', Cheeky: 'Hands off the boat. Wiggle the water next to it.', Unfiltered: 'Not the boat. Ripple the water near it.' },
    boatTouch: { Jolly: 'Not the boat itself. Just the water near it.', Cheeky: 'Tempting, I know. Water, not boat.', Unfiltered: 'Water. Not the boat.' },
    nudge: { Jolly: 'It’s wobbling. Keep going, gently.', Cheeky: 'It’s thinking about it.', Unfiltered: 'It’s moving.' },
    freed: { Jolly: 'Some take longer. That’s fine.', Cheeky: 'Some take longer. That’s fine. Honestly.', Unfiltered: 'Some take longer. That’s fine.' },
    selfFree: { Jolly: 'There it goes, in its own time. Some take longer. That’s fine.', Cheeky: 'It freed itself. Some take longer. That’s fine.', Unfiltered: 'It went on its own. Some take longer.' },
    last: { Jolly: 'That’s all of them. Let’s see where the stream goes.', Cheeky: 'Fleet complete. Let’s follow them.', Unfiltered: 'All afloat. Follow the water.' },
    lake: { Jolly: 'They found the lake. Every one of them.', Cheeky: 'Look at them, a tiny regatta.', Unfiltered: 'They made it to the lake.' },
    lights: { Jolly: 'A little light in each. Now let them drift.', Cheeky: 'Mood lighting. Now send them off.', Unfiltered: 'Lights on. Let them go.' },
    gone: { Jolly: 'Out of sight. Still yours, just not in your hands.', Cheeky: 'Off they go. Bon voyage, thoughts.', Unfiltered: 'Out of sight. That’s enough.' },
    duck: { Jolly: 'Ducklings! They’re in no hurry either.', Cheeky: 'Duck convoy. Excellent formation.', Unfiltered: 'Ducks.' },
    frog: { Jolly: 'A frog’s keeping an eye on the rock today.', Cheeky: 'The frog has opinions about that rock.', Unfiltered: 'Frog on the rock.' },
    heron: { Jolly: 'A heron’s come to watch. Very patient bird.', Cheeky: 'The heron is judging nobody. Patiently.', Unfiltered: 'A heron. Still as anything.' }
  };

  (env.games = env.games || []).push({
    id: 'let-it-float', mode: 'reset', name: 'Let It Float', verb: 'fold', family: 'DISTANCE', minutes: 2,
    parents: ['Memory / Replay / Rumination', 'Emotion', 'Values / Meaning / Grief'],
    cast: ['drop', 'still'], poster: { char: 'drop', mood: 'calm' }, fonts: ['Shippori+Mincho+B1:wght@500;700', 'Klee+One:wght@600'],
    tagline: 'Fold each thought into a paper boat and let the stream carry it off.',
    why: 'For thoughts that replay: fold each one into a boat and watch it drift away.',
    css: `
.g-let-it-float { --lf-display: ${DISPLAY}; --lf-hand: ${HAND}; --font-display: var(--lf-display);
  --ui-bg: #0c2522; --ui-surface: #12322d; --ui-fg: #f3f0e2; --ui-muted: #c9d8cf; --ui-accent: #ffd88a; --ui-accent-ink: #2a1c06; --ui-line: rgba(243, 240, 226, 0.2); --ui-scrim: rgba(6, 20, 18, 0.55);
  background: #0c2522; color-scheme: dark; }
.tsg[data-scene="bright"] .g-let-it-float { --ui-bg: #e3f1e8; --ui-surface: #fffdf6; --ui-fg: #1d3833; --ui-muted: #4f6a62; --ui-accent: #2f7d6d; --ui-accent-ink: #ffffff; --ui-line: rgba(29, 56, 51, 0.16); --ui-scrim: rgba(29, 56, 51, 0.3); background: #9fd3b0; color-scheme: light; }
.g-let-it-float .gk-intro-title { font-weight: 500; letter-spacing: 0.02em; }
.g-let-it-float .lf-pad { position: absolute; inset: 0; z-index: 20; touch-action: none; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; }
.g-let-it-float .lf-pad:focus-visible { box-shadow: inset 0 0 0 3px rgba(255, 230, 160, 0.8); }
.g-let-it-float .lf-words { position: absolute; left: 0; top: 0; z-index: 22; transform: translate(-50%, -50%); text-align: center; pointer-events: none; white-space: pre; opacity: 0; transition: opacity 0.35s ease; }
.g-let-it-float .lf-words.lf-on { opacity: 1; }
.g-let-it-float .lf-words.lf-cut { transition: none; opacity: 0; }
.g-let-it-float .lf-words small { display: block; margin-bottom: 3px; font: 700 12px/1.2 var(--font-ui); letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.72; }
.g-let-it-float .lf-words .gk-user { display: block; font: 600 17px/1.22 var(--lf-hand); letter-spacing: 0.01em; }
.g-let-it-float.lf-desk .lf-words .gk-user { font-size: 19px; }
.g-let-it-float .lf-tag { position: absolute; left: 0; top: 0; z-index: 23; pointer-events: none; padding: 5px 10px 6px; border-radius: 4px; width: max-content; max-width: min(230px, 62cqw); text-align: center;
  background: rgba(255, 252, 242, 0.94); color: #23312e; box-shadow: 0 1px 0 rgba(90, 70, 40, 0.3), 0 6px 14px rgba(0, 20, 20, 0.28); opacity: 0; transition: opacity 0.6s ease; will-change: transform; }
.g-let-it-float .lf-tag.lf-on { opacity: 1; }
.g-let-it-float .lf-tag::after { content: ""; position: absolute; left: 50%; bottom: -9px; width: 1px; height: 9px; background: rgba(60, 50, 40, 0.5); }
.g-let-it-float .lf-tag small { display: block; font: 700 12px/1.2 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; color: #6a5a48; }
.g-let-it-float .lf-tag .gk-user { display: block; font: 600 15px/1.15 var(--lf-hand); }
.g-let-it-float .lf-cap { position: absolute; left: 50%; top: 0; z-index: 36; transform: translate(-50%, -40%); text-align: center; pointer-events: none; opacity: 0; width: max-content; max-width: calc(100% - 32px);
  transition: opacity 1.4s ease, transform 1.8s cubic-bezier(.2, .9, .3, 1); color: #fff8ec; text-shadow: 0 3px 18px rgba(30, 10, 30, 0.75), 0 0 3px rgba(30, 10, 30, 0.6); }
.g-let-it-float .lf-cap.lf-on { opacity: 1; transform: translate(-50%, -50%); }
.g-let-it-float .lf-cap b { display: block; font: 500 clamp(34px, 10.5cqw, 60px)/1.05 var(--lf-display); letter-spacing: 0.01em; text-wrap: balance; }
.g-let-it-float .lf-cap span { display: block; margin-top: 10px; font: 600 14px/1.35 var(--font-ui); letter-spacing: 0.08em; color: #ffe2b8; }
.g-let-it-float .lf-cap i { display: block; margin-top: 5px; font: 600 16px/1.3 var(--lf-hand); font-style: normal; color: #ffeccf; }
.g-let-it-float .gk-bubble { max-width: min(250px, calc(100cqw - 160px)); }
.g-let-it-float.lf-desk .gk-bubble { max-width: 300px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = clamp(Number(ctx.intensity) || 0, 0, 2);
      const care = () => an.safety === 'care';
      const say = (o) => (care() ? o.Jolly : ctx.line(o));
      const visits = K.visits();
      let SEA = pickFor(dayVal(new Date()), SEASONS, 5);
      try { if (S.isDev && S.isDev()) { const q = new URLSearchParams(location.search).get('lfseason'), f = SEASONS.find(x => x.id === q); if (f) SEA = f; } } catch (e) { /* dev preview only */ }
      const TOMORROW = pickFor(dayVal(new Date(Date.now() + 864e5)), SEASONS, 5);
      const design = clamp(Number(S.store.get('let-it-float:design', 0)) || 0, 0, 3);
      const NB = [3, 4, 5][inten];
      const T = { nudges: [2, 3, 4][inten], speed: [118, 135, 150][inten], selfFree: 22 };
      const pal = () => SEA[K.dark() ? 'dark' : 'bright'];

      /* ---------------- the thoughts, one per boat; the heaviest (core) is the sticky one, about halfway ---------------- */
      function buildItems() {
        const key = (s) => String(s || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
        const strands = (an.strands || []).filter(s => s && s.label);
        const core = an.core && an.core.label ? an.core : null;
        const seen = new Set(core ? [key(core.label)] : []), out = [];
        for (const s of strands) { if (out.length >= NB - 1) break; const k = key(s.label); if (!k || seen.has(k)) continue; seen.add(k); out.push({ text: s.label, generic: !!s.generic, loop: s.loop || 'other' }); }
        for (const g of GENERIC) { if (out.length >= NB - 1) break; if (seen.has(key(g.label))) continue; seen.add(key(g.label)); out.push({ text: g.label, generic: true, loop: g.loop }); }
        const c = core ? { text: core.label, generic: !!core.generic, loop: core.loop || 'other' } : (out.length > 1 ? out.pop() : { text: 'THE HEAVY ONE', generic: true, loop: 'other' });
        c.sticky = true;
        out.splice(Math.min(out.length, Math.max(1, Math.floor(NB / 2))), 0, c);
        return out.map((it, i) => Object.assign(it, { i, paper: it.sticky ? SEA.paper : (LOOP_PAPER[it.loop] || 'rice') }));
      }
      let ITEMS = buildItems();

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const P = K.particles({ max: 260 });
      const pad = h('div', { class: 'lf-pad', role: 'application', tabindex: '0', 'aria-label': 'A sunlit stream. Fold the paper with three drags: top edge down, corners to the middle, bottom edge up. Then drag the boat onto the water and let go. Touch the water to make ripples. Space does the next step.' });
      const words = h('div', { class: 'lf-words', 'aria-live': 'polite' }, h('small'), h('span', { class: 'gk-user' }));
      const cap = h('div', { class: 'lf-cap', 'aria-live': 'polite' }, h('b'), h('span'), h('i'));
      el.append(pad, words, cap);
      const drop = K.character('drop', { side: 'right', mood: 'calm', x: 10, y: 64, size: 56 });
      const still = K.character('still', { side: 'left', mood: 'calm', x: 320, y: 64, size: 56 });
      const CH = { drop: { c: drop, until: 0 }, still: { c: still, until: 0 } };
      let finished = false;
      function talk(who, o, ms, mood, moodMs) {
        if (finished) return;
        const me = CH[who], other = CH[who === 'drop' ? 'still' : 'drop'], txt = say(o), now = performance.now();
        const go = () => { if (finished) return; other.c.hush(); other.until = 0; me.c.say(txt, { ms: ms || 3200, mood, moodMs }); me.until = performance.now() + (ms || 3200); };
        if (other.until > now + 300) { S.later(go, Math.min(2600, other.until - now)); return; }
        go();
      }

      /* ---------------- state ---------------- */
      const G = { w: 0, h: 0, phone: true, U: 1, rocks: [] };
      const W = { phase: 'intro', t: 0, idx: 0, launched: 0, gone: 0, stuck: null, nudges: 0, touchedStuck: 0, lastNudge: 0, saidRipple: false, saidTouch: 0, stuckT: 0, lakeK: 0, bpm: 150, quiet: 0, sunK: 0, duskK: 0, lake: null, sendT: 0 };
      const F = { st: 0, c: 1, th: 0, thV: 0, thT: 0, drag: null, side: 1, c2: 1, item: null, tex: null, z: 1, zT: 1, vc: H2, vcT: H2, ox: 0, oy: 0, arriveT: 0, popT: 0, boatS: 1, boatSV: 0, carry: null, wordsOn: false, settle: 0, crease: [], gleam: 0, folds: 0, ready: false };
      const SC = { gentle: [], best: 0, splashy: 0, stuckSelf: false, papers: [] };
      const boats = [], streaks = [], debris = [], glints = [], DAP = [];
      let CL = null, CD = null, HL = null, HR = null, KK = null, streamPath = null, BGB = null, BGF = null, LAKE = null, CAUS = null, causPat = null, ROCKS = [], SPRITES = new Map();
      const RP = { cs: 6, nx: 0, ny: 0, a: null, b: null, m: null, img: null, c: null, g: null, energy: 0, acc: 0, adv: 0 };

      function off(w, hh, alpha) { const c = document.createElement('canvas'); const d = cv.dpr || 1; c.width = Math.max(1, Math.round(w * d)); c.height = Math.max(1, Math.round(hh * d)); const g = c.getContext('2d', alpha === false ? { alpha: false } : undefined); g.setTransform(d, 0, 0, d, 0, 0); return { c, g, w, h: hh }; }

      /* ---------------- layout: the stream flows away from you, from the bottom of the screen into the far bend ---------------- */
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700, U = phone ? clamp(Math.min(w / 390, H / 760), 0.86, 1.15) : clamp(H / 760, 1, 1.3);
        const prevW = G.w, prevH = G.h;
        Object.assign(G, { w, h: H, phone, U });
        el.classList.toggle('lf-desk', !phone);
        const CP = phone ? [[0.64, 0.112], [0.53, 0.19], [0.38, 0.29], [0.42, 0.4], [0.58, 0.5], [0.6, 0.6], [0.5, 0.72], [0.5, 0.86], [0.5, 1.04]]
          : [[0.67, 0.115], [0.6, 0.2], [0.46, 0.31], [0.43, 0.43], [0.55, 0.55], [0.57, 0.66], [0.5, 0.79], [0.5, 1.04]];
        const pts = CP.map(([x, y]) => [x * w, y * H]);
        G.yFar = Math.round(pts[0][1]); G.yH = G.yFar - (H - G.yFar) * 0.22;
        const cr = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
        const sx = [], sy = [];
        for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]; for (let k = 0; k < 32; k++) { const t = k / 32; sx.push(cr(p0[0], p1[0], p2[0], p3[0], t)); sy.push(cr(p0[1], p1[1], p2[1], p3[1], t)); } }
        sx.push(pts[pts.length - 1][0]); sy.push(pts[pts.length - 1][1]);
        const N = H + 2; CL = new Float32Array(N); CD = new Float32Array(N); HL = new Float32Array(N); HR = new Float32Array(N); KK = new Float32Array(N);
        let j = 0;
        for (let r = 0; r < N; r++) {
          if (r <= sy[0]) { CL[r] = sx[0]; continue; }
          while (j < sy.length - 2 && sy[j + 1] < r) j++;
          const t = clamp((r - sy[j]) / Math.max(0.001, sy[j + 1] - sy[j]), 0, 1); CL[r] = lerp(sx[j], sx[j + 1], t);
        }
        const hwN = (phone ? 0.62 : 0.37) * w;
        for (let r = 0; r < N; r++) {
          CD[r] = (CL[Math.min(N - 1, r + 6)] - CL[Math.max(0, r - 6)]) / 12;
          const k = clamp((r - G.yH) / (H - G.yH), 0.05, 1.3); KK[r] = k;
          const tip = 0.55 + 0.45 * sm((r - G.yFar) / (0.1 * H));
          HL[r] = hwN * k * tip * (1 + 0.07 * Math.sin(r * 0.029 + 1.1) + 0.04 * Math.sin(r * 0.081 + 2.3));
          HR[r] = hwN * k * tip * (1 + 0.06 * Math.sin(r * 0.025 + 4.2) + 0.05 * Math.sin(r * 0.069 + 0.7));
        }
        streamPath = new Path2D();
        streamPath.moveTo(CL[G.yFar] - HL[G.yFar], G.yFar);
        for (let r = G.yFar; r <= H + 1; r += 3) streamPath.lineTo(CL[r] - HL[r], r);
        streamPath.lineTo(CL[H] - HL[H], H + 40); streamPath.lineTo(CL[H] + HR[H], H + 40);
        for (let r = H + 1; r >= G.yFar; r -= 3) streamPath.lineTo(CL[r] + HR[r], r);
        streamPath.closePath();
        G.speed = T.speed * U;
        // the folding stone and the sheet on it
        G.Ws = Math.round((phone ? 148 : 172) * U);
        G.sx = Math.round(w / 2); G.sy = Math.round(H - 26 * U - G.Ws * R2 / 2);
        G.stoneTop = G.sy - G.Ws * R2 / 2 - 16 * U; G.stoneRx = phone ? Math.min(w * 0.41, 182 * U) : 236 * U;
        G.stoneCy = G.stoneTop + (H - G.stoneTop) * 0.55; G.stoneRy = (H - G.stoneTop) * 0.62;
        G.launchY = G.stoneTop - 44 * U; G.reachY = G.stoneTop - 92 * U; G.boatW = (phone ? 122 : 136) * U;
        // rocks: [row fraction, lateral, radius]; the first one is where the heavy thought snags
        const RK = phone ? [[0.44, 0.1, 44], [0.27, -0.66, 36], [0.6, 0.78, 46], [0.2, 0.58, 30], [0.72, -0.86, 50]] : [[0.41, 0.08, 46], [0.27, -0.62, 38], [0.58, 0.76, 48], [0.2, 0.56, 30], [0.72, -0.84, 54]];
        G.rocks = RK.map(([fy, lat, r], i) => { const y = Math.round(fy * H), x = CL[y] + lat * (lat < 0 ? HL[y] : HR[y]); return { x, y, r: r * U * KK[y] * 1.25, i }; });
        G.snag = G.rocks[0];
        // characters on the banks at the top
        const cs = phone ? 56 : 84;
        drop.el.style.setProperty('--sz', cs + 'px'); still.el.style.setProperty('--sz', cs + 'px');
        G.dropP = { x: phone ? 8 : 26 * U, y: phone ? 64 : 74, s: cs }; G.stillP = { x: phone ? w - cs - 8 : w - cs - 26 * U, y: phone ? 64 : 74, s: cs };
        drop.place(G.dropP.x, G.dropP.y); still.place(G.stillP.x, G.stillP.y);
        cap.style.top = Math.round(H * (phone ? 0.25 : 0.235)) + 'px';
        // carry floating things across a resize
        if (prevW && prevH && (prevW !== w || prevH !== H)) { const fx = w / prevW, fy = H / prevH; boats.forEach(b => { b.x *= fx; b.y *= fy; }); debris.forEach(d => { d.x *= fx; d.y *= fy; }); streaks.length = 0; glints.length = 0; }
        rippleInit(); paintAll(); placeWords();
      }
      function paintAll() { BGB = paintBack(); BGF = paintFront(); ROCKS = G.rocks.map(paintRock); SPRITES = new Map(); CAUS = CAUS || causticTile(); causPat = cv.g ? cv.g.createPattern(CAUS, 'repeat') : null; if (F.item) F.tex = paintPaper(F.item); if (W.lake) LAKE = paintLake(); }

      /* ---------------- the stream's flow: along the channel, faster mid-stream, around rocks, slower with distance ---------------- */
      const FL = { vx: 0, vy: 0, k: 1, lat: 0, inside: true };
      function flowAt(x, y) {
        const r = clamp(y | 0, 0, G.h + 1), cx = CL[r], hl = HL[r], hr = HR[r], k = KK[r];
        const lat = x < cx ? (x - cx) / hl : (x - cx) / hr, prof = Math.max(0, 1 - lat * lat);
        const sp = G.speed * k * (0.3 + 0.7 * prof);
        let dx = -CD[r], dy = -1; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
        let vx = dx * sp, vy = dy * sp;
        for (const rk of G.rocks) {
          const ex = x - rk.x, ey = y - rk.y, d = Math.hypot(ex, ey), R = rk.r;
          if (d > R * 3) continue;
          const ux = ex / (d || 1), uy = ey / (d || 1), vn = vx * ux + vy * uy;
          if (vn < 0 && d < R * 2.4) { const f = clamp((R * 2.4 - d) / (R * 1.4), 0, 1); vx -= ux * vn * f * 1.1; vy -= uy * vn * f * 1.1; }
          if (ey < 0 && Math.abs(ex) < R * 1.2) { const f = (1 - d / (R * 3)) * 0.6; vx *= 1 - f; vy *= 1 - f; vx += Math.sign(ex || 1) * sp * 0.25 * f; }
        }
        FL.vx = vx; FL.vy = vy; FL.k = k; FL.lat = lat; FL.inside = Math.abs(lat) < 1 && y > G.yFar - 2;
        return FL;
      }
      const onStone = (x, y) => { const dx = (x - G.sx) / (G.stoneRx * 1.02), dy = (y - G.stoneCy) / (G.stoneRy * 1.02); return dx * dx + dy * dy < 1; };
      function onWater(x, y) { if (y < G.yFar + 4 || onStone(x, y)) return false; const r = clamp(y | 0, 0, G.h + 1), lat = x < CL[r] ? (x - CL[r]) / HL[r] : (x - CL[r]) / HR[r]; return Math.abs(lat) < 0.97; }

      /* ---------------- ripples: a small height field the finger stirs; it rings off the banks and drifts with the current ---------------- */
      function rippleInit() {
        const cs = RP.cs = G.phone ? 6 : 8, nx = RP.nx = Math.ceil(G.w / cs) + 2, ny = RP.ny = Math.ceil(G.h / cs) + 2;
        RP.a = new Float32Array(nx * ny); RP.b = new Float32Array(nx * ny); RP.t = new Float32Array(nx * ny); RP.m = new Uint8Array(nx * ny);
        RP.vx = new Float32Array(nx * ny); RP.vy = new Float32Array(nx * ny);
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const x = (i - 0.5) * cs, y = (j - 0.5) * cs, idx = j * nx + i;
          if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) continue;
          let wet = onWater(x, y); for (const rk of G.rocks) if (Math.hypot(x - rk.x, (y - rk.y) * 1.4) < rk.r * 0.8) wet = false;
          RP.m[idx] = wet ? 1 : 0;
          if (wet) { const f = flowAt(x, y); RP.vx[idx] = f.vx / cs; RP.vy[idx] = f.vy / cs; }
        }
        RP.c = document.createElement('canvas'); RP.c.width = nx; RP.c.height = ny; RP.g = RP.c.getContext('2d'); RP.img = RP.g.createImageData(nx, ny); RP.energy = 0;
      }
      function splash(x, y, amp, rad) {
        if (!RP.a) return;
        const cs = RP.cs, ci = x / cs + 0.5, cj = y / cs + 0.5, r = Math.max(1.2, rad / cs);
        for (let j = Math.floor(cj - 2 * r); j <= Math.ceil(cj + 2 * r); j++) {
          if (j < 1 || j >= RP.ny - 1) continue;
          for (let i = Math.floor(ci - 2 * r); i <= Math.ceil(ci + 2 * r); i++) {
            if (i < 1 || i >= RP.nx - 1) continue;
            const idx = j * RP.nx + i; if (!RP.m[idx]) continue;
            const d2 = ((i - ci) * (i - ci) + (j - cj) * (j - cj)) / (r * r); if (d2 > 4) continue;
            RP.a[idx] += amp * Math.exp(-d2 * 1.6);
          }
        }
        RP.energy = Math.max(RP.energy, Math.abs(amp));
      }
      function rippleStep() {
        const { nx, ny, m } = RP; let a = RP.a, b = RP.b, e = 0;
        for (let j = 1; j < ny - 1; j++) {
          let idx = j * nx + 1;
          for (let i = 1; i < nx - 1; i++, idx++) {
            if (!m[idx]) { b[idx] = 0; continue; }
            const v = ((a[idx - 1] + a[idx + 1] + a[idx - nx] + a[idx + nx]) * 0.5 - b[idx]) * 0.982;
            b[idx] = v; const av = v < 0 ? -v : v; if (av > e) e = av;
          }
        }
        RP.a = b; RP.b = a; RP.energy = e;
        // every few steps the field drifts downstream (semi-Lagrangian), so rings are carried by the current
        if (++RP.adv >= 3) { RP.adv = 0; advect(RP.a, 3 / 50); advect(RP.b, 3 / 50); }
      }
      function advect(f, dt) {
        const { nx, ny, m, vx, vy } = RP, t = RP.t;
        t.set(f);
        for (let j = 1; j < ny - 1; j++) {
          let idx = j * nx + 1;
          for (let i = 1; i < nx - 1; i++, idx++) {
            if (!m[idx]) continue;
            let sx = i - vx[idx] * dt, sy = j - vy[idx] * dt;
            sx = clamp(sx, 1, nx - 2.001); sy = clamp(sy, 1, ny - 2.001);
            const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, k = y0 * nx + x0;
            f[idx] = (t[k] * (1 - fx) + t[k + 1] * fx) * (1 - fy) + (t[k + nx] * (1 - fx) + t[k + nx + 1] * fx) * fy;
          }
        }
      }
      function rippleGrad(x, y, out) {
        out.gx = 0; out.gy = 0; if (!RP.a || RP.energy < 0.004) return out;
        const i = clamp(Math.round(x / RP.cs + 0.5), 1, RP.nx - 2), j = clamp(Math.round(y / RP.cs + 0.5), 1, RP.ny - 2), idx = j * RP.nx + i, a = RP.a;
        out.gx = (a[idx + 1] - a[idx - 1]) * 0.5; out.gy = (a[idx + RP.nx] - a[idx - RP.nx]) * 0.5; return out;
      }
      function rippleDraw(g, D) {
        if (RP.energy < 0.004) return;
        const { nx, ny, m, a } = RP, d = RP.img.data, hi = D ? [255, 236, 190] : [255, 255, 250], lo = D ? [0, 18, 22] : [10, 70, 80];
        for (let j = 0; j < ny; j++) {
          let idx = j * nx, p = idx * 4;
          for (let i = 0; i < nx; i++, idx++, p += 4) {
            if (!m[idx] || i === 0 || j === 0 || i === nx - 1 || j === ny - 1) { d[p + 3] = 0; continue; }
            const s = ((a[idx - 1] - a[idx + 1]) * 0.6 + (a[idx - nx] - a[idx + nx]) * 0.8) * 230;
            if (s > 0) { d[p] = hi[0]; d[p + 1] = hi[1]; d[p + 2] = hi[2]; d[p + 3] = s > 210 ? 210 : s; }
            else { d[p] = lo[0]; d[p + 1] = lo[1]; d[p + 2] = lo[2]; d[p + 3] = -s > 150 ? 150 : -s; }
          }
        }
        RP.g.putImageData(RP.img, 0, 0);
        g.imageSmoothingEnabled = true; g.drawImage(RP.c, -RP.cs, -RP.cs, nx * RP.cs, ny * RP.cs);   // cell i is centred at (i - 0.5) * cs
      }

      /* ---------------- painting: the glade, the stream bed and the water (one picture), then what stands in front ---------------- */
      function paintBack() {
        const w = G.w, H = G.h, D = K.dark(), C = pal(), U = G.U, yF = G.yFar, rr = seedRng(11 + SEA.id.length);
        const o = off(w, H, false), g = o.g;
        let gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, C.canopy[2]); gr.addColorStop(clamp(yF / H, 0.05, 0.3), C.bankFar); gr.addColorStop(0.45, mix(C.bank[0], C.bankFar, 0.35)); gr.addColorStop(1, C.bank[1]);
        g.fillStyle = gr; g.fillRect(0, 0, w, H);
        // the far glade: light pouring through the trees where the stream bends out of sight
        const gx = CL[yF], gy = yF - 6 * U;
        let rg = g.createRadialGradient(gx, gy, 4, gx, gy, w * (G.phone ? 0.7 : 0.45));
        rg.addColorStop(0, rgba(C.glow, D ? 0.75 : 0.95)); rg.addColorStop(0.35, rgba(C.glow, D ? 0.25 : 0.45)); rg.addColorStop(1, rgba(C.glow, 0));
        g.fillStyle = rg; g.fillRect(0, 0, w, yF + H * 0.3);
        // trunks, far ones misty
        for (let i = 0; i < (G.phone ? 7 : 12); i++) {
          const x = (i + 0.3 + rr() * 0.4) / (G.phone ? 7 : 12) * w, far = rr(), tw = (6 + far * 16) * U, tb = yF + (8 + far * 40) * U;
          if (Math.abs(x - gx) < 34 * U) continue;
          const tc = mix(mix(C.canopy[2], C.sky, (1 - far) * (D ? 0.25 : 0.45)), '#000000', D ? 0.2 : 0.05), tgr = g.createLinearGradient(0, 0, 0, tb + 6 * U);
          tgr.addColorStop(0, tc); tgr.addColorStop(0.7, tc); tgr.addColorStop(1, rgba(C.sky, 0.2));
          g.fillStyle = tgr; g.beginPath(); g.moveTo(x - tw * 0.4, -10); g.lineTo(x + tw * 0.4, -10); g.lineTo(x + tw * 0.6, tb); g.quadraticCurveTo(x, tb + 6 * U, x - tw * 0.6, tb); g.closePath(); g.fill();
          g.fillStyle = rgba(C.glow, D ? 0.14 : 0.2); g.beginPath(); g.moveTo(x - tw * 0.4, -10); g.lineTo(x - tw * 0.15, -10); g.lineTo(x - tw * 0.3, tb); g.lineTo(x - tw * 0.58, tb); g.closePath(); g.fill();
        }
        // canopy clumps along the top, lit from the glade
        for (let i = 0; i < (G.phone ? 70 : 130); i++) {
          const x = rr() * w, y = -20 + Math.pow(rr(), 1.3) * (yF + 30 * U), r0 = (16 + rr() * 30) * U;
          const lit = clamp(1 - Math.hypot(x - gx, y - gy) / (w * 0.5), 0, 1);
          g.fillStyle = mix(C.canopy[Math.floor(rr() * 3)], C.glow, lit * (D ? 0.22 : 0.3));
          g.beginPath(); g.arc(x, y, r0, 0, TAU); g.fill();
        }
        for (let i = 0; i < (G.phone ? 50 : 90); i++) { const x = rr() * w, y = rr() * (yF + 20 * U); g.fillStyle = rgba(C.glow, 0.12 + rr() * 0.22); g.beginPath(); g.arc(x, y, (1.5 + rr() * 3) * U, 0, TAU); g.fill(); }
        // mist where the glade meets the banks
        const mg = g.createLinearGradient(0, yF - 30 * U, 0, yF + 70 * U); mg.addColorStop(0, rgba(C.sky, 0)); mg.addColorStop(0.45, rgba(C.sky, D ? 0.22 : 0.5)); mg.addColorStop(1, rgba(C.sky, 0));
        g.fillStyle = mg; g.fillRect(0, yF - 30 * U, w, 100 * U);
        // banks: moss, grass, flowers, pebbles, all in perspective
        for (let i = 0; i < (G.phone ? 260 : 520); i++) {
          const y = yF + Math.pow(rr(), 0.8) * (H - yF), x = rr() * w, r = clamp(y | 0, 0, H), k = KK[r];
          const lat = x < CL[r] ? (x - CL[r]) / HL[r] : (x - CL[r]) / HR[r]; if (Math.abs(lat) < 1.04) continue;
          const t = rr();
          if (t < 0.55) { g.fillStyle = rgba(rr() < 0.5 ? C.bank[0] : mix(C.bank[1], C.earth, 0.3), 0.5); g.beginPath(); g.ellipse(x, y, (8 + rr() * 22) * k * U, (4 + rr() * 8) * k * U, 0, 0, TAU); g.fill(); }
          else if (t < 0.85) { g.strokeStyle = rgba(mix(C.bank[0], D ? '#000000' : '#ffffff', D ? 0.25 : 0.25), 0.7); g.lineWidth = 1.1 * k * U; const hh = (5 + rr() * 9) * k * U; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 2 * k, y - hh * 0.6, x + (rr() - 0.5) * 5 * k, y - hh); g.stroke(); }
          else { const fc = C.flower[Math.floor(rr() * C.flower.length)]; g.fillStyle = fc; for (let p = 0; p < 4; p++) { g.beginPath(); g.arc(x + (rr() - 0.5) * 6 * k, y + (rr() - 0.5) * 3 * k, (1.2 + rr()) * k * U, 0, TAU); g.fill(); } }
        }
        // sun patches through the leaves, and cool shade, on the banks
        for (let i = 0; i < (G.phone ? 16 : 28); i++) {
          const y = yF + 20 * U + rr() * (H - yF), x = rr() * w, r = clamp(y | 0, 0, H), k = KK[r], s = (30 + rr() * 60) * U * k, lit = rr() < 0.6;
          g.globalCompositeOperation = lit ? (D ? 'lighter' : 'screen') : 'source-over'; g.globalAlpha = lit ? (D ? 0.12 : 0.28) : 0.18;
          g.drawImage(K.glowSprite(lit ? rgba(C.glow, 0.9) : 'rgba(0,20,10,0.9)'), x - s, y - s * 0.45, s * 2, s * 0.9);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // the water's wet edge, then the bed seen through clear water: shallow sand at the banks, deep green mid-stream
        g.save(); g.strokeStyle = rgba(mix(C.earth, '#000000', 0.3), D ? 0.55 : 0.4); g.lineWidth = 9 * U; g.stroke(streamPath); g.restore();
        for (let r = yF; r <= H; r += 2) {
          const xl = CL[r] - HL[r], xr = CL[r] + HR[r], k = KK[r], haze = (1 - k) * (D ? 0.25 : 0.4), dc = 0.5 + 0.14 * Math.sin(r * 0.009);
          const lg = g.createLinearGradient(xl, 0, xr, 0);
          const sh = mix(mix(C.shallow, C.bed, 0.35), C.sky, haze), md = mix(C.mid, C.sky, haze * 0.8), dp = mix(C.deep, C.sky, haze * 0.6);
          lg.addColorStop(0, sh); lg.addColorStop(0.16, mix(C.shallow, C.sky, haze)); lg.addColorStop(dc - 0.18, md); lg.addColorStop(dc, dp); lg.addColorStop(dc + 0.18, md); lg.addColorStop(0.86, mix(C.shallow, C.sky, haze)); lg.addColorStop(1, sh);
          g.fillStyle = lg; g.fillRect(xl, r, xr - xl, 2.4);
        }
        g.save(); g.clip(streamPath);
        for (let i = 0; i < (G.phone ? 150 : 280); i++) {
          const y = yF + 20 * U + Math.pow(rr(), 0.7) * (H - yF), r = clamp(y | 0, 0, H), k = KK[r], lat = (rr() * 2 - 1);
          const x = CL[r] + lat * (lat < 0 ? HL[r] : HR[r]), shallow = Math.pow(Math.abs(lat), 1.5);
          g.fillStyle = rgba(rr() < 0.5 ? mix(C.bed, '#000000', 0.25) : mix(C.bed, '#ffffff', 0.2), (0.12 + 0.35 * shallow) * (0.4 + 0.6 * k));
          g.beginPath(); g.ellipse(x, y, (3 + rr() * 9) * k * U, (2 + rr() * 5) * k * U, rr() * 0.6, 0, TAU); g.fill();
        }
        // the canopy mirrored along the edges, and the glade's sheen on the far water
        for (let i = 0; i < (G.phone ? 30 : 50); i++) { const y = yF + rr() * (H - yF) * 0.7, r = clamp(y | 0, 0, H), side = rr() < 0.5 ? -1 : 1, x = CL[r] + side * (side < 0 ? HL[r] : HR[r]) * (0.7 + rr() * 0.3), k = KK[r]; g.fillStyle = rgba(C.canopy[2], D ? 0.3 : 0.18); g.beginPath(); g.ellipse(x, y, (16 + rr() * 26) * k * U, (5 + rr() * 8) * k * U, 0, 0, TAU); g.fill(); }
        const sg = g.createLinearGradient(0, yF, 0, yF + (H - yF) * 0.55); sg.addColorStop(0, rgba(C.glow, D ? 0.5 : 0.6)); sg.addColorStop(1, rgba(C.glow, 0));
        g.globalCompositeOperation = D ? 'lighter' : 'screen'; g.fillStyle = sg; g.fillRect(0, yF, w, (H - yF) * 0.55); g.globalCompositeOperation = 'source-over';
        g.restore();
        g.strokeStyle = rgba(C.foam, D ? 0.35 : 0.6); g.lineWidth = 1.3 * U; g.stroke(streamPath);
        // light shafts through the trees
        g.save(); g.globalCompositeOperation = D ? 'lighter' : 'screen';
        for (let i = 0; i < 4; i++) {
          const x0 = gx + (i - 1.5) * 50 * U, ang = (i - 1.5) * 0.16 + (G.phone ? 0.05 : -0.05), len = H * 0.62, wd = (18 + i * 7) * U;
          const lg2 = g.createLinearGradient(x0, gy, x0 + Math.sin(ang) * len, gy + len); lg2.addColorStop(0, rgba(C.glow, D ? 0.08 : 0.12)); lg2.addColorStop(0.5, rgba(C.glow, D ? 0.03 : 0.05)); lg2.addColorStop(1, rgba(C.glow, 0));
          g.fillStyle = lg2; g.beginPath(); g.moveTo(x0 - wd * 0.2, gy); g.lineTo(x0 + wd * 0.2, gy); g.lineTo(x0 + Math.sin(ang) * len + wd, gy + len); g.lineTo(x0 + Math.sin(ang) * len - wd, gy + len); g.closePath(); g.fill();
        }
        g.restore();
        return o;
      }
      function fern(g, x, y, ang, len, col, k, rr) {
        const U = G.U; g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round';
        const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len, cx = x + Math.cos(ang - 0.35) * len * 0.55, cy = y + Math.sin(ang - 0.35) * len * 0.55 - len * 0.12;
        g.lineWidth = 1.6 * k * U; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(cx, cy, ex, ey); g.stroke();
        for (let t = 0.08; t < 0.98; t += 0.07) {
          const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex, py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey;
          const tx = 2 * (1 - t) * (cx - x) + 2 * t * (ex - cx), ty = 2 * (1 - t) * (cy - y) + 2 * t * (ey - cy), tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
          const pl = len * 0.2 * Math.sin(Math.PI * (0.15 + t * 0.85)) * (0.8 + rr() * 0.3);
          [-1, 1].forEach(s => { g.beginPath(); g.ellipse(px + nx * s * pl * 0.5 + tx / tl * pl * 0.12, py + ny * s * pl * 0.5 + ty / tl * pl * 0.12, pl * 0.55, pl * 0.17, Math.atan2(ny * s, nx * s) + 0.35 * s, 0, TAU); g.fill(); });
        }
      }
      function paintFront() {
        const w = G.w, H = G.h, D = K.dark(), C = pal(), U = G.U, yF = G.yFar, rr = seedRng(29 + SEA.id.length);
        const o = off(w, H), g = o.g;
        // ferns and stones along the water's edge (they overlap it, so the bank feels close)
        for (let i = 0; i < (G.phone ? 12 : 20); i++) {
          const y = yF + 30 * U + Math.pow((i + rr()) / (G.phone ? 12 : 20), 0.85) * (G.stoneTop - yF - 20 * U), r = clamp(y | 0, 0, H), k = KK[r], side = i % 2 ? 1 : -1;
          const x = CL[r] + side * (side < 0 ? HL[r] : HR[r]) * (1.02 + rr() * 0.12);
          g.fillStyle = mix(C.bank[1], '#5a5a58', 0.5); g.beginPath(); g.ellipse(x - side * 6 * k * U, y + 3 * k * U, (10 + rr() * 10) * k * U, (5 + rr() * 4) * k * U, 0, 0, TAU); g.fill();
          g.fillStyle = rgba('#ffffff', D ? 0.08 : 0.22); g.beginPath(); g.ellipse(x - side * 8 * k * U, y, (6 + rr() * 5) * k * U, 2.5 * k * U, 0, 0, TAU); g.fill();
          if (rr() < 0.75) for (let f = 0; f < 5; f++) fern(g, x + side * 4 * k * U, y, -Math.PI / 2 - side * (0.35 + f * 0.28) + (rr() - 0.5) * 0.2, (30 + rr() * 26) * k * U, mix(C.canopy[f % 2], D ? '#000000' : '#ffffff', D ? 0.1 : 0.08), k, rr);
        }
        // the far bend disappears behind a hedge of ferns and shrubs
        const fx = CL[yF];
        for (let i = 0; i < 22; i++) { const a = rr() * Math.PI, rad = (14 + rr() * 26) * U; g.fillStyle = mix(C.canopy[i % 3], C.glow, D ? 0.12 : 0.18); g.beginPath(); g.arc(fx + Math.cos(a) * (40 + rr() * 30) * U * (i % 2 ? 1 : -1), yF - 4 * U + Math.sin(a) * 10 * U, rad, 0, TAU); g.fill(); }
        for (let f = 0; f < 9; f++) fern(g, fx + (f - 4) * 9 * U, yF + 6 * U, -Math.PI / 2 + (f - 4) * 0.26, (26 + rr() * 16) * U, mix(C.canopy[1], C.glow, 0.1), 0.6, rr);
        // big fronds leaning in from the sides
        const fr = G.phone ? [[0, 0.36, -0.2], [w, 0.52, Math.PI + 0.25], [0, 0.66, -0.15]] : [[0, 0.32, -0.25], [w, 0.42, Math.PI + 0.2], [0, 0.6, -0.1], [w, 0.7, Math.PI + 0.12]];
        fr.forEach(([x, fy, a], i) => { for (let f = 0; f < 3; f++) fern(g, x, fy * H + f * 14 * U, a + (f - 1) * 0.22, (G.phone ? 90 : 150) * U * (1 - f * 0.12), mix(C.canopy[(i + f) % 3], '#000000', D ? 0.35 : 0.12), 1.2, rr); });
        // the flat folding stone you sit on, in the shallows: a slab with a sunlit top, a wet dark side, lichen at its rim
        const cx = G.sx, rx = G.stoneRx, cy = G.stoneCy, ry = G.stoneRy, th = 14 * U;
        const slab = (inset, dy) => { g.beginPath(); for (let i = 0; i <= 64; i++) { const a = i / 64 * TAU, wob = 1 + 0.045 * Math.sin(a * 3 + 0.6) + 0.022 * Math.sin(a * 7 + 2.1) + 0.01 * Math.sin(a * 17 + 0.4); g.lineTo(cx + Math.cos(a) * (rx - inset) * wob, cy + dy + Math.sin(a) * (ry - inset) * wob); } g.closePath(); };
        g.fillStyle = rgba(D ? '#00100c' : '#0a3a3a', D ? 0.45 : 0.26); slab(-12 * U, th + 8 * U); g.fill();
        const sc = D ? { top: '#7a8081', mid: '#5d6365', low: '#474d4f', side: '#262b2d' } : { top: '#e2e3da', mid: '#c7cac0', low: '#aab0a7', side: '#6b726d' };
        g.fillStyle = sc.side; slab(0, th); g.fill();
        const wetG = g.createLinearGradient(0, cy, 0, cy + ry + th); wetG.addColorStop(0, 'rgba(0,0,0,0)'); wetG.addColorStop(1, rgba(D ? '#000000' : '#173c3c', 0.4)); g.fillStyle = wetG; slab(0, th); g.fill();
        const tg = g.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.5, cy + ry); tg.addColorStop(0, sc.top); tg.addColorStop(0.55, sc.mid); tg.addColorStop(1, sc.low);
        g.fillStyle = tg; slab(0, 0); g.fill();
        g.save(); slab(0, 0); g.clip();
        const lit = g.createRadialGradient(cx - rx * 0.35, cy - ry * 0.55, 4, cx - rx * 0.35, cy - ry * 0.55, rx * 1.15); lit.addColorStop(0, rgba(C.glow, D ? 0.28 : 0.4)); lit.addColorStop(1, rgba(C.glow, 0));
        g.fillStyle = lit; g.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * 2.4);
        for (let i = 0; i < 900; i++) { const a = rr() * TAU, d = Math.sqrt(rr()), s = (0.6 + rr() * 1.3) * U; g.fillStyle = rr() < 0.55 ? `rgba(0,0,0,${(0.05 + rr() * 0.07).toFixed(3)})` : `rgba(255,255,255,${(0.05 + rr() * 0.09).toFixed(3)})`; g.fillRect(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, s, s); }
        g.strokeStyle = rgba('#000000', D ? 0.22 : 0.12); g.lineWidth = 1 * U;
        for (let i = 0; i < 3; i++) { let x = cx + (rr() - 0.5) * rx * 1.3, y = cy + (rr() - 0.5) * ry * 1.2; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rr() - 0.4) * 22 * U; y += (rr() - 0.5) * 12 * U; g.lineTo(x, y); } g.stroke(); }
        for (let i = 0; i < 14; i++) {
          const a = rr() * TAU, d = 0.74 + rr() * 0.24, lx = cx + Math.cos(a) * rx * d, ly = cy + Math.sin(a) * ry * d, col = rr() < 0.5 ? (D ? '#8f9a74' : '#c2cb93') : (D ? '#9a8a5e' : '#d8c385');
          for (let k = 0; k < 7; k++) { g.fillStyle = rgba(col, 0.3 + rr() * 0.25); g.beginPath(); g.arc(lx + (rr() - 0.5) * 12 * U, ly + (rr() - 0.5) * 7 * U, (2 + rr() * 4) * U, 0, TAU); g.fill(); }
        }
        for (let i = 0; i < 28; i++) { const a = Math.PI * (0.06 + rr() * 0.88), d = 0.9 + rr() * 0.12; g.fillStyle = rgba(D ? '#3d6a38' : '#64a04c', 0.4 + rr() * 0.3); g.beginPath(); g.ellipse(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, (4 + rr() * 8) * U, (2 + rr() * 4) * U, a, 0, TAU); g.fill(); }
        g.restore();
        g.strokeStyle = rgba(C.foam, D ? 0.45 : 0.75); g.lineWidth = 1.4 * U;
        for (let i = 0; i < 10; i++) { const a0 = Math.PI * (1.04 + i * 0.092) + rr() * 0.04, a1 = a0 + 0.04 + rr() * 0.05; g.beginPath(); g.ellipse(cx, cy + th * 0.9, rx * 1.035, ry * 1.035, 0, a0, a1); g.stroke(); }
        return o;
      }
      function paintRock(rk) {
        const D = K.dark(), C = pal(), U = G.U, R = rk.r, o = off(R * 3, R * 2.4), g = o.g, cx = R * 1.5, cy = R * 1.45, rr = seedRng(rk.i * 7 + 3);
        const pts = []; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; const k = 1 + (rr() - 0.5) * 0.18; pts.push([cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * 0.62 * k - (Math.sin(a) < 0 ? R * 0.22 : 0)]); }
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
        const sc = D ? ['#6a7172', '#3c4345', '#262b2d'] : ['#b9bdb4', '#8c938d', '#5e6763'];
        const lg = g.createLinearGradient(cx - R, cy - R, cx + R * 0.6, cy + R * 0.6); lg.addColorStop(0, sc[0]); lg.addColorStop(0.55, sc[1]); lg.addColorStop(1, sc[2]);
        g.fillStyle = lg; g.fill(); g.save(); g.clip();
        g.fillStyle = rgba(D ? '#5f8a4a' : '#7fb85a', 0.85); g.beginPath(); g.ellipse(cx - R * 0.15, cy - R * 0.62, R * 0.62, R * 0.24, -0.1, 0, TAU); g.fill();
        g.fillStyle = rgba(D ? '#000000' : '#1c3a3a', 0.35); g.fillRect(cx - R * 1.2, cy + R * 0.1, R * 2.4, R);
        g.fillStyle = rgba(C.glow, D ? 0.18 : 0.3); g.beginPath(); g.ellipse(cx - R * 0.4, cy - R * 0.45, R * 0.3, R * 0.12, -0.3, 0, TAU); g.fill();
        g.restore();
        return { c: o.c, w: o.w, h: o.h, ax: cx, ay: cy + R * 0.25 };
      }
      function causticTile() {
        const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
        const g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data, M = 5, rr = seedRng(77), pts = [];
        for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) pts.push([(i + 0.15 + rr() * 0.7) / M, (j + 0.15 + rr() * 0.7) / M]);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const u = x / N, v = y / N, ci = Math.floor(u * M), cj = Math.floor(v * M);
          let f1 = 9, f2 = 9;
          for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
            const ii = (ci + di + M) % M, jj = (cj + dj + M) % M, p = pts[jj * M + ii], px = p[0] + (ci + di - ii) / M, py = p[1] + (cj + dj - jj) / M;
            const dd = Math.hypot(u - px, v - py); if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
          }
          // soft, uneven light threads (tileable: the modulation uses whole periods)
          const mod = 0.55 + 0.45 * Math.sin(TAU * (u * 2 + v)) * Math.sin(TAU * (v * 2 - u + 0.3));
          const e = Math.pow(clamp(1 - (f2 - f1) * M * 2.3, 0, 1), 3.4) * mod, p = (y * N + x) * 4;
          d[p] = 255; d[p + 1] = 255; d[p + 2] = 236; d[p + 3] = Math.round(clamp(e, 0, 1) * 255);
        }
        g.putImageData(img, 0, 0);
        return c;
      }

      /* ---------------- paper: front (your words in ink), back (the ink shows through faintly) ---------------- */
      const MC = document.createElement('canvas').getContext('2d');
      function wrapLines(text, fontPx, maxW) {
        MC.font = `600 ${fontPx}px ${HAND}`;
        const ws = String(text).split(/\s+/).filter(Boolean), lines = []; let cur = '';
        ws.forEach(wd => { const t = cur ? cur + ' ' + wd : wd; if (MC.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; });
        if (cur) lines.push(cur);
        return lines.slice(0, 4);
      }
      const wordsFont = () => (G.phone ? 17 : 19);
      function paintPaper(it) {
        const PA = PAPERS[it.paper] || PAPERS.rice, pr = Math.min(3, (cv.dpr || 1) * 1.3), zMax = 1.32, TW = Math.round(G.Ws * zMax * pr), TH = Math.round(TW * R2), u = TW;
        const mk = () => { const c = document.createElement('canvas'); c.width = TW; c.height = TH; return { c, g: c.getContext('2d') }; };
        const rr = seedRng(it.i * 13 + 5), fib = [];
        for (let i = 0; i < 160; i++) fib.push([rr(), rr() * R2, (rr() - 0.5) * 0.06, rr() * 0.6, rr()]);
        const base = (g, back) => {
          g.fillStyle = back ? mix(PA.base, '#4a4436', 0.07) : PA.base; g.fillRect(0, 0, TW, TH);
          fib.forEach(([x, y, l, a, t]) => { g.strokeStyle = t < 0.5 ? `rgba(120,100,70,${0.05 + a * 0.06})` : `rgba(255,255,255,${0.12 + a * 0.12})`; g.lineWidth = Math.max(1, u * 0.004); g.beginPath(); g.moveTo(x * u, y * u); g.lineTo((x + l) * u, (y + l * 0.3) * u); g.stroke(); });
          const al = back ? 0.45 : 1, ds = PA.design;
          g.lineWidth = Math.max(1, u * 0.004);
          if (ds === 'ruled') { g.strokeStyle = `rgba(80,120,200,${0.32 * al})`; for (let y = HB + 0.07; y < R2 - 0.02; y += 0.085) { g.beginPath(); g.moveTo(0, y * u); g.lineTo(u, y * u); g.stroke(); } g.strokeStyle = `rgba(220,90,90,${0.36 * al})`; g.beginPath(); g.moveTo(0.12 * u, HB * u); g.lineTo(0.12 * u, TH); g.stroke(); }
          if (ds === 'grid') { g.strokeStyle = `rgba(60,140,120,${0.2 * al})`; for (let y = HB; y < R2; y += 0.06) { g.beginPath(); g.moveTo(0, y * u); g.lineTo(u, y * u); g.stroke(); } for (let x = 0.03; x < 1; x += 0.06) { g.beginPath(); g.moveTo(x * u, HB * u); g.lineTo(x * u, TH); g.stroke(); } }
          if (ds === 'kraft') { for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(90,60,30,${0.06 * al + rr() * 0.05})`; g.fillRect(rr() * u, rr() * TH, u * 0.006, u * 0.006); } }
          if (ds === 'airmail') { const s = 0.05; for (let x = -0.2; x < 1.2; x += s * 2) ['#d84a4a', '#3a64b8'].forEach((col, k) => { g.fillStyle = rgba(col, 0.55 * al); [[HB, HB + 0.035], [R2 - 0.035, R2]].forEach(([y0, y1]) => { g.beginPath(); g.moveTo((x + k * s) * u, y1 * u); g.lineTo((x + k * s + s) * u, y1 * u); g.lineTo((x + k * s + s + 0.035) * u, y0 * u); g.lineTo((x + k * s + 0.035) * u, y0 * u); g.closePath(); g.fill(); }); }); }
          if (ds === 'news') { g.fillStyle = `rgba(40,40,40,${0.1 * al})`; for (let y = HB + 0.05; y < R2 - 0.03; y += 0.035) for (let c = 0; c < 3; c++) { const x0 = 0.05 + c * 0.31, ln = 0.27 - rr() * 0.06; g.fillRect(x0 * u, y * u, ln * u, u * 0.012); } }
          if (ds === 'fibre') { for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(150,130,100,${0.12 * al})`; g.lineWidth = Math.max(1, u * 0.003); const x = rr(), y = HB + rr() * (R2 - HB); g.beginPath(); g.moveTo(x * u, y * u); g.bezierCurveTo((x + 0.1) * u, (y - 0.05) * u, (x + 0.15) * u, (y + 0.05) * u, (x + 0.26) * u, y * u); g.stroke(); } }
          if (ds === 'sakura' || ds === 'maple' || ds === 'flakes' || ds === 'clouds') {
            for (let i = 0; i < 16; i++) {
              const x = rr() * u, y = (HB + 0.04 + rr() * (R2 - HB - 0.06)) * u, s = (0.025 + rr() * 0.03) * u;
              g.save(); g.translate(x, y); g.rotate(rr() * TAU); g.globalAlpha = 0.35 * al;
              if (ds === 'sakura') { g.fillStyle = '#ec8fab'; for (let p = 0; p < 5; p++) { g.rotate(TAU / 5); g.beginPath(); g.ellipse(0, -s * 0.6, s * 0.38, s * 0.6, 0, 0, TAU); g.fill(); } }
              else if (ds === 'maple') { g.fillStyle = '#d9762f'; for (let p = 0; p < 5; p++) { g.rotate(TAU / 5); g.beginPath(); g.moveTo(0, 0); g.lineTo(-s * 0.25, -s * 0.6); g.lineTo(0, -s); g.lineTo(s * 0.25, -s * 0.6); g.closePath(); g.fill(); } }
              else if (ds === 'flakes') { g.strokeStyle = '#7fa8d8'; g.lineWidth = Math.max(1, s * 0.12); for (let p = 0; p < 3; p++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-s, 0); g.lineTo(s, 0); g.stroke(); } }
              else { g.fillStyle = '#ffffff'; g.globalAlpha = 0.7 * al; [[-0.5, 0, 0.5], [0, -0.2, 0.62], [0.55, 0, 0.45]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(dx * s * 1.4, dy * s, r * s, 0, TAU); g.fill(); }); }
              g.restore();
            }
          }
          // the printed band along the top edge: it ends up as the trim on the boat's side
          g.fillStyle = rgba(SEA.accent, back ? 0.3 : 0.85); g.fillRect(0, 0, TW, HB * u * 0.62);
          g.strokeStyle = rgba('#ffffff', back ? 0.2 : 0.65); g.lineWidth = Math.max(1, u * 0.006); g.beginPath();
          for (let x = 0; x <= 1.001; x += 0.02) { const y = HB * 0.31 + Math.sin(x * TAU * 4) * 0.018; if (x === 0) g.moveTo(x * u, y * u); else g.lineTo(x * u, y * u); }
          g.stroke();
          if (!back) { g.fillStyle = rgba(PA.ink, 0.55); g.font = `700 ${Math.round(u * 0.07)}px ${HAND}`; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('No. ' + (it.i + 1), 0.95 * u, HB * 0.82 * u); }
          // soft light across the sheet
          const lg = g.createLinearGradient(0, 0, TW, TH); lg.addColorStop(0, back ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.18)'); lg.addColorStop(1, 'rgba(0,0,0,0.06)');
          g.fillStyle = lg; g.fillRect(0, 0, TW, TH);
        };
        const fp = wordsFont(), lines = wrapLines(it.text, fp, G.Ws * 0.84), lh = fp * 1.22, scale = TW / G.Ws, head = it.generic ? 'A thought like…' : '';
        const ink = (g, alpha) => {
          g.save(); g.globalAlpha = alpha; g.fillStyle = PA.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
          const cyPx = 1.0 * u, total = lines.length * lh * scale + (head ? 15 * scale : 0);
          let y = cyPx - total / 2;
          if (head) { g.font = `700 ${12 * scale}px ${HAND}`; g.globalAlpha = alpha * 0.72; g.fillText(head.toUpperCase(), u / 2, y + 6 * scale); y += 15 * scale; g.globalAlpha = alpha; }
          g.font = `600 ${fp * scale}px ${HAND}`;
          lines.forEach((ln, i) => g.fillText(ln, u / 2, y + (i + 0.5) * lh * scale));
          g.restore();
        };
        const front = mk(), plain = mk(), back = mk();
        base(front.g, false); ink(front.g, 0.92);
        base(plain.g, false);
        base(back.g, true); ink(back.g, 0.1);
        return { front: front.c, plain: plain.c, back: back.c, lines, head, ink: PA.ink };
      }
      function placeWords() {
        if (!F.item || !F.tex) return;
        const p = sheetPt(0.5, 1.0);
        words.style.left = p.x + 'px'; words.style.top = p.y + 'px'; words.style.color = F.tex.ink;
      }

      /* ---------------- boats: a side-on paper boat sprite per paper and design ---------------- */
      function boatSprite(paperId) {
        const key = paperId + ':' + design + ':' + (K.dark() ? 'd' : 'b');
        if (SPRITES.has(key)) return SPRITES.get(key);
        const PA = PAPERS[paperId] || PAPERS.rice, pr = Math.min(3, (cv.dpr || 1) * 1.3), BW = Math.round(G.Ws * 1.3 * pr), BH = Math.round(BW * 0.86);
        const c = document.createElement('canvas'); c.width = BW; c.height = BH; const g = c.getContext('2d'), u = BW;
        const pt = (x, y) => [x * u, y * u], poly = (ps) => { g.beginPath(); ps.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
        const GL = pt(0.02, 0.5), GR = pt(0.98, 0.5), BL = pt(0.22, 0.78), BR = pt(0.78, 0.78), SL = pt(0.3, 0.5), SR = pt(0.7, 0.5), AP = pt(0.5, 0.1), MB = pt(0.5, 0.5);
        const shade = (k) => mix(PA.base, k > 0 ? '#ffffff' : '#3a3428', Math.abs(k));
        // far side of the hull, seen over the near gunwale
        g.fillStyle = shade(-0.3); poly([GL, pt(0.1, 0.44), SL]); g.fill(); poly([GR, pt(0.9, 0.44), SR]); g.fill();
        // the sail: two faces split by the centre crease
        g.fillStyle = shade(0.12); poly([SL, AP, MB]); g.fill(); g.fillStyle = shade(-0.12); poly([MB, AP, SR]); g.fill();
        // the hull: bow face, middle, stern face
        g.fillStyle = shade(0.05); poly([GL, SL, BL]); g.fill();
        g.fillStyle = shade(-0.06); poly([SL, SR, BR, BL]); g.fill();
        g.fillStyle = shade(-0.2); poly([SR, GR, BR]); g.fill();
        // the printed band becomes the trim along the gunwale
        g.save(); poly([GL, GR, BR, BL]); g.clip(); g.fillStyle = rgba(SEA.accent, 0.82); g.fillRect(0, 0.5 * u, u, 0.07 * u);
        g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = Math.max(1, u * 0.006); g.beginPath(); for (let x = 0; x <= 1; x += 0.02) { const y = 0.535 + Math.sin(x * TAU * 5) * 0.012; if (x === 0) g.moveTo(x * u, y * u); else g.lineTo(x * u, y * u); } g.stroke();
        const wet = g.createLinearGradient(0, 0.68 * u, 0, 0.78 * u); wet.addColorStop(0, 'rgba(40,80,90,0)'); wet.addColorStop(1, 'rgba(40,80,90,0.28)'); g.fillStyle = wet; g.fillRect(0, 0.6 * u, u, 0.2 * u);
        g.restore();
        // creases and edges
        g.strokeStyle = 'rgba(60,45,30,0.42)'; g.lineWidth = Math.max(1, u * 0.007); g.lineJoin = 'round';
        poly([GL, GR, BR, BL]); g.stroke(); poly([SL, AP, SR]); g.stroke();
        g.beginPath(); g.moveTo(AP[0], AP[1]); g.lineTo(MB[0], MB[1]); g.moveTo(SL[0], SL[1]); g.lineTo(BL[0], BL[1]); g.moveTo(SR[0], SR[1]); g.lineTo(BR[0], BR[1]); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1, u * 0.005); g.beginPath(); g.moveTo(SL[0] + u * 0.01, SL[1] - u * 0.01); g.lineTo(AP[0] - u * 0.006, AP[1] + u * 0.02); g.stroke();
        if (design >= 3) { g.strokeStyle = '#d9a632'; g.lineWidth = Math.max(1.2, u * 0.01); poly([SL, AP, SR]); g.stroke(); g.beginPath(); g.moveTo(GL[0], GL[1]); g.lineTo(GR[0], GR[1]); g.stroke(); }
        if (design >= 1) { g.strokeStyle = '#6a5040'; g.lineWidth = Math.max(1, u * 0.006); g.beginPath(); g.moveTo(AP[0], AP[1]); g.lineTo(AP[0], AP[1] - u * 0.09); g.stroke(); g.fillStyle = SEA.accent; g.beginPath(); g.moveTo(AP[0], AP[1] - u * 0.09); g.lineTo(AP[0] + u * 0.1, AP[1] - u * 0.065); g.lineTo(AP[0], AP[1] - u * 0.04); g.closePath(); g.fill(); }
        if (design >= 2) { const lx = GR[0] - u * 0.02, ly = GR[1] - u * 0.02; g.strokeStyle = '#6a5040'; g.lineWidth = Math.max(1, u * 0.005); g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx, ly - u * 0.06); g.stroke(); g.fillStyle = '#e8573a'; g.beginPath(); g.ellipse(lx, ly - u * 0.085, u * 0.022, u * 0.03, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,230,160,0.9)'; g.fillRect(lx - u * 0.008, ly - u * 0.09, u * 0.016, u * 0.012); }
        const s = { c, w: BW / pr, h: BH / pr, ax: 0.5, ay: 0.78 / 0.86, pr };
        SPRITES.set(key, s); return s;
      }
      function drawBoatSpr(g, spr, x, y, wpx, roll, squash, alpha) {
        const sc = wpx / spr.w;
        g.save(); g.translate(x, y); g.rotate(roll); g.scale(sc * squash, sc); g.globalAlpha = alpha;
        g.drawImage(spr.c, -spr.w * spr.ax, -spr.h * spr.ay, spr.w, spr.h);
        g.restore(); g.globalAlpha = 1;
      }

      /* ---------------- sound: the stream, a harp song in 6/8, paper you can hear ---------------- */
      const AU = {};
      const audioOn = () => {
        if (!A.ctx || AU.body) return;
        AU.body = A.loop({ pink: true, filter: 'lowpass', freq: 420, q: 0.5, bus: 'amb' }); if (AU.body) AU.body.level(0.07, 1.5);
        AU.babble = A.loop({ filter: 'bandpass', freq: 1300, q: 1.6, bus: 'amb' }); if (AU.babble) AU.babble.level(0.02, 2);
        AU.rustle = A.loop({ filter: 'bandpass', freq: 3600, q: 0.9 });
        AU.swish = A.loop({ pink: true, filter: 'bandpass', freq: 900, q: 0.8 });
      };
      S.on('audio-ready', audioOn); audioOn();
      S.onDestroy(() => Object.values(AU).forEach(x => { if (x && x.stop) x.stop(); }));
      const NF = {}; const nf = (n) => NF[n] || (NF[n] = A.note(n));
      const MU = { on: true, next: 0, step: 0, vol: 0.85, bloop: 0, bird: 4, beats: [], bells: [] };
      S.loop(() => {
        if (!A.ctx || !MU.on) return;
        const now = A.now();
        if (!MU.next || MU.next < now - 0.5) MU.next = now + 0.15;
        while (MU.next < now + 0.25) {
          const tm = MU.next, i = MU.step, bar = Math.floor(i / 6) % 4, b = i % 6, [bass, arp] = SONG[bar], v = MU.vol * (1 - W.quiet);
          if (b === 0) { A.pluck(nf(bass), { when: tm, vol: 0.2 * v, damp: 0.994, lp: 420, bus: 'music' }); A.pad([arp[0], arp[1], arp[3]].map(nf), { when: tm, dur: 60 / W.bpm * 6.4, vol: 0.035 * v, attack: 1.2, lp: 1100, bus: 'music' }); }
          if (W.phase !== 'intro') A.pluck(nf(arp[b]), { when: tm + (b % 2 ? 0.012 : 0), vol: (b === 0 ? 0.075 : 0.055) * v, damp: 0.995, lp: 2600, verb: 0.38, bus: 'music' });
          if (MU.bells.length && b % 3 === 0) { const n = MU.bells.shift(); A.chime(nf(n), { when: tm, vol: 0.05, dur: 2.2, verb: 0.55, bus: 'music' }); }
          MU.beats.push(tm); if (MU.beats.length > 8) MU.beats.shift();
          MU.step++; MU.next += 60 / W.bpm;
        }
        // the brook: little bloops under the hiss, birds by season
        if (now > MU.bloop && W.phase !== 'lake' && W.phase !== 'end') { MU.bloop = now + 0.12 + Math.random() * 0.35; const f = 480 + Math.random() * 700; A.tone({ when: now + 0.03, type: 'sine', freq: f, to: f * 0.62, glide: 0.06, dur: 0.075, vol: 0.006 + Math.random() * 0.012, bus: 'amb', pan: Math.random() * 1.4 - 0.7 }); }
        if (now > MU.bird && SEA.bird !== 'none' && (W.phase === 'play' || W.phase === 'intro')) {
          MU.bird = now + 3.5 + Math.random() * 5; const base = SEA.bird === 'wren' ? 3600 : SEA.bird === 'chirp' ? 3000 : 2500, n = SEA.bird === 'trill' ? 6 : 3, pan = Math.random() * 1.2 - 0.6;
          for (let k = 0; k < n; k++) A.tone({ when: now + 0.05 + k * (SEA.bird === 'trill' ? 0.06 : 0.11), type: 'sine', freq: base * (1 + (k % 2) * 0.12), to: base * (1.25 - (k % 3) * 0.1), glide: 0.05, dur: 0.07, vol: 0.016, bus: 'amb', pan });
        }
        if (AU.babble && (W.t * 10 | 0) % 3 === 0) { AU.babble.freq(1150 + 380 * Math.sin(W.t * 0.7) + 160 * Math.sin(W.t * 1.9), 0.2); AU.body && AU.body.level((W.phase === 'lake' || W.phase === 'end' ? 0.025 : 0.07) * (1 - W.quiet * 0.6), 0.8); }
      });
      const sync = (name) => { try { if (A.sync) A.sync(name, performance.now()); } catch (e) { /* dev log only */ } };
      const creaseSnd = (k) => { K.sfx.paper(); if (!A.ctx) return; A.noise({ filter: 'highpass', freq: 3800, dur: 0.02, vol: 0.14 * k }); A.tone({ type: 'sine', freq: 160, to: 70, glide: 0.06, dur: 0.1, vol: 0.12 * k }); A.paper({ freq: 1500, dur: 0.06, vol: 0.08 * k }); };
      const liftSnd = () => { if (!A.ctx) return; A.paper({ freq: 2600, dur: 0.12, vol: 0.06 }); sync('paper-lift'); };
      const plip = (gentle, x) => { if (!A.ctx) return; const pan = clamp((x / G.w) * 2 - 1, -0.8, 0.8); A.tone({ type: 'sine', freq: 1050 + gentle * 200, to: 360, glide: 0.07, dur: 0.13, vol: 0.09 + (1 - gentle) * 0.06, pan }); A.noise({ filter: 'lowpass', freq: 1500, dur: 0.12 + (1 - gentle) * 0.3, vol: 0.02 + (1 - gentle) * 0.09, attack: 0.01, pan }); sync('plip'); };
      const bloop = (x, y, vol) => { if (!A.ctx) return; const k = 1 - clamp((y - G.yFar) / (G.h - G.yFar), 0, 1), f = 420 + k * 520 + Math.random() * 80; A.tone({ type: 'sine', freq: f, to: f * 1.7, glide: 0.05, dur: 0.09, vol: vol || 0.05, pan: clamp((x / G.w) * 2 - 1, -0.8, 0.8) }); A.tone({ when: A.now() + 0.05, type: 'sine', freq: f * 1.3, to: f * 0.8, glide: 0.06, dur: 0.08, vol: (vol || 0.05) * 0.5 }); sync('bloop'); };
      const tok = (vol) => { if (!A.ctx) return; A.wood(undefined, vol || 0.08, 0.55); A.noise({ filter: 'lowpass', freq: 700, dur: 0.12, vol: 0.04 }); };

      /* ---------------- sheets ---------------- */
      function newSheet() {
        if (W.idx >= ITEMS.length) return;
        const it = ITEMS[W.idx];
        Object.assign(F, { st: 1, c: 1, th: 0, thV: 0, thT: 0, drag: null, c2: 1, item: it, z: 1, zT: 1, vc: H2, vcT: H2, popT: 0, carry: null, crease: [], gleam: 0, ready: false, settle: 0, popped: false, closing: false, backT: 0, boatS: 1, boatSV: 0 });
        F.tex = paintPaper(it);
        F.arriveT = performance.now(); F.ox = (W.idx % 2 ? 1 : -1) * G.w * 0.7;
        words.classList.remove('lf-on', 'lf-cut');
        words.firstChild.textContent = F.tex.head ? F.tex.head.toUpperCase() : ''; words.firstChild.hidden = !F.tex.head;
        words.lastChild.textContent = F.tex.lines.join('\n');
        words.style.width = Math.round(G.Ws * 0.92) + 'px';
        placeWords(); F.wordsOn = false;
        if (A.ctx) { A.paper({ freq: 1900, to: 1200, dur: 0.35, vol: 0.08 }); A.noise({ filter: 'bandpass', freq: 900, dur: 0.3, attack: 0.08, vol: 0.03 }); }
        sync('sheet');
        ctx.track('sheet', { n: W.idx + 1, generic: it.generic ? 1 : 0, sticky: it.sticky ? 1 : 0 });
      }
      function sheetReady() { F.ready = true; F.ox = 0; if (!words.classList.contains('lf-cut')) { words.classList.add('lf-on'); F.wordsOn = true; } guideStep(); }
      // sheet coordinates <-> screen
      function sheetT() { const Z = G.Ws * F.z * (1 + F.settle * 0.02); return [Z, 0, 0, Z * (1 - F.settle * 0.03), G.sx + F.ox - 0.5 * Z, G.sy + F.oy - F.vc * Z]; }
      function sheetPt(u, v) { const T = sheetT(); return { x: T[0] * u + T[4], y: T[3] * v + T[5] }; }
      function toSheet(x, y) { const T = sheetT(); return { u: (x - T[4]) / T[0], v: (y - T[5]) / T[3] }; }

      /* ---------------- guides: one for every step ---------------- */
      function guideStep() {
        if (W.phase !== 'play' || finished) return;
        if (W.stuck) { K.guide({ id: 'lf-nudge', g: 'tap', target: () => nudgePoint(), label: 'TAP THE WATER NEAR IT', place: 'below', delay: 900 }); return; }
        const Z = G.Ws * F.z;
        if (F.st === 1) K.guide({ id: 'lf-f1', g: 'drag', target: () => sheetPt(0.5, 0.06), dir: 'd', d: Math.round(Z * R2 * 0.82), label: 'FOLD IT IN HALF', place: 'above', ms: 1500, delay: 500 });
        else if (F.st === 2) K.guide({ id: 'lf-f2', g: 'drag', target: () => sheetPt(0.95, H2 + 0.04), dx: -Z * 0.4, dy: Z * 0.4, label: 'CORNERS TO THE MIDDLE', place: 'above', ms: 1300, delay: 450 });
        else if (F.st === 3) K.guide({ id: 'lf-f3', g: 'drag', target: () => sheetPt(0.5, R2 - 0.04), dir: 'u', d: Math.round(Z * (R2 - YB) * 2.1), label: 'FOLD THE EDGE UP', place: 'above', ox: 0, ms: 1200, delay: 450 });
        else if (F.st === 6) { const lp = launchPoint(), bp = sheetPt(0.5, SHAPE_V[5] + 0.08); K.guide({ id: 'lf-set', g: 'drag', target: () => sheetPt(0.5, SHAPE_V[5] + 0.08), dx: lp.x - bp.x, dy: lp.y - bp.y, label: 'SET IT ON THE WATER', place: 'below', ms: 1600, delay: 500 }); }
      }
      const launchPoint = () => ({ x: CL[clamp(G.launchY | 0, 0, G.h)] + (W.idx % 2 ? 0.12 : -0.12) * HL[clamp(G.launchY | 0, 0, G.h)], y: G.launchY });
      function nudgePoint() {
        const b = W.stuck; if (!b) return { x: G.w / 2, y: G.h / 2 };
        const side = b.x > CL[clamp(b.y | 0, 0, G.h)] ? -1 : 1;
        return { x: clamp(b.x + side * 62 * G.U, 24, G.w - 24), y: b.y + 30 * G.U };
      }

      /* ---------------- folding ---------------- */
      function grabFold(p) {
        if (!F.ready || F.st < 1 || F.st > 3 || F.drag) return false;
        const q = toSheet(p.x, p.y), cr = CREASE[F.st];
        let n = cr.n, side = 1;
        if (F.st === 1) { if (q.u < -0.12 || q.u > 1.12 || q.v < -0.18 || q.v > H2 - 0.04) return false; }
        if (F.st === 2) { if (q.v < H2 - 0.2 || q.v > YB + 0.05 || q.u < -0.15 || q.u > 1.15 || Math.abs(q.u - 0.5) < 0.08) return false; if (q.u > 0.5) { n = cr.n2; side = -1; } }
        if (F.st === 3) { if (q.u < -0.12 || q.u > 1.12 || q.v < YB + 0.01 || q.v > R2 + 0.25) return false; }
        const d0 = Math.max([0, 0.22, 0.16, 0.12][F.st], (q.u - cr.P[0]) * n[0] + (q.v - cr.P[1]) * n[1]);
        F.drag = { n, d0, P: cr.P }; F.side = side;
        F.thT = F.th;
        if (F.wordsOn) { words.classList.add('lf-cut'); words.classList.remove('lf-on'); F.wordsOn = false; }
        liftSnd();
        return true;
      }
      function moveFold(p) {
        const d = F.drag; if (!d) return;
        const q = toSheet(p.x, p.y), c = clamp(((q.u - d.P[0]) * d.n[0] + (q.v - d.P[1]) * d.n[1]) / d.d0, -1, 1);
        F.thT = Math.acos(c);
      }
      function releaseFold() {
        if (!F.drag) return;
        F.drag = null;
        if (F.th > 1.25) { F.thT = Math.PI; F.closing = true; }
        else { F.thT = 0; if (A.ctx) A.paper({ freq: 3000, dur: 0.18, vol: 0.05 }); S.later(() => { if (F.st >= 1 && F.st <= 3 && !F.drag && F.th < 0.1) guideStep(); }, 600); }
      }
      function autoFold() { if (!F.ready || F.st < 1 || F.st > 3 || F.drag || F.closing) return; if (F.wordsOn) { words.classList.add('lf-cut'); words.classList.remove('lf-on'); F.wordsOn = false; } F.thT = Math.PI; F.closing = true; liftSnd(); }
      function stepFold(dt) {
        if (F.st < 1 || F.st > 3) return;
        const kf = F.drag ? 260 : 150, df = F.drag ? 32 : (F.closing ? 15 : 22);
        F.thV += (kf * (F.thT - F.th) - df * F.thV) * dt; F.th += F.thV * dt;
        if (F.th < 0) { F.th = 0; F.thV = Math.abs(F.thV) * 0.2; }
        if (F.closing && F.th >= Math.PI - 0.01) { F.th = Math.PI; foldDone(); return; }
        if (F.th > Math.PI) { F.th = Math.PI; F.thV = 0; }
        F.c = Math.cos(F.th);
        if (AU.rustle) { const sp = Math.abs(F.thV); AU.rustle.level(Math.min(0.07, sp * 0.012), 0.05); AU.rustle.freq(2600 + Math.min(3000, sp * 260), 0.06); }
      }
      function foldDone() {
        const st = F.st;
        F.closing = false; F.thV = 0; F.th = 0; F.thT = 0; F.c = 1; F.settle = 1; F.gleam = 1; F.folds++;
        creaseSnd(1);
        if (AU.rustle) AU.rustle.level(0.0001, 0.05);
        const T = sheetT();
        if (st === 1) F.crease = [[[0, H2], [1, H2]]];
        if (st === 2) F.crease = [[[0.5, H2], [0, YB]], [[0.5, H2], [1, YB]]];
        if (st === 3) F.crease = [[[0, 1.0], [1, 1.0]]];
        F.creaseAt = performance.now();
        const mid = st === 1 ? sheetPt(0.5, H2) : st === 2 ? sheetPt(0.5, H2 + 0.25) : sheetPt(0.5, 1.0);
        P.emit('dust', mid.x, mid.y, 6, { colors: ['rgba(255,255,240,0.7)'], speed: [20, 60] });
        void T;
        if (st < 3) { F.st = st + 1; F.vcT = SHAPE_V[F.st]; F.zT = 1.18; if (!W.saidCrease && W.idx === 0 && st === 1) { W.saidCrease = true; talk('still', L.crease, 2600, 'happy'); } S.later(guideStep, 120); }
        else { F.st = 4; F.vcT = SHAPE_V[4]; F.zT = 1.22; F.c2 = 1; F.c2T = performance.now(); K.guide(null); }
        ctx.track('fold', { n: W.idx + 1, step: st });
      }
      function stepHat(dt) {
        if (F.st === 4) {
          const k = clamp((performance.now() - F.c2T) / 260, 0, 1); F.c2 = Math.cos(k * Math.PI);
          if (k >= 1) { F.st = 5; F.popT = performance.now(); if (A.ctx) { A.paper({ freq: 2200, dur: 0.18, vol: 0.08 }); A.noise({ filter: 'bandpass', freq: 2400, dur: 0.12, vol: 0.04 }); } }
        } else if (F.st === 5) {
          const t = (performance.now() - F.popT) / 1000;
          if (t >= 0.2 && !F.popped) {
            F.popped = true; F.boatS = 0.72; F.boatSV = 6;
            const p = sheetPt(0.5, SHAPE_V[5]);
            K.sfx.pop(undefined, 640); if (A.ctx) { A.chime(nf('A5'), { vol: 0.05, dur: 1.6 }); A.chime(nf('D6'), { when: A.now() + 0.09, vol: 0.04, dur: 1.6 }); }
            P.emit('star', p.x, p.y - 20 * G.U, 12, { colors: ['#fff6d8', rgba(SEA.accent, 1), '#ffffff'], speed: [60, 180] });
            if (W.idx === 0) { talk('drop', L.boat, 2400, 'wow', 2200); S.later(() => talk('still', L.setDown, 3200, 'calm'), 1800); }
            else drop.face('happy', 1200);
          }
          if (F.popped) { F.boatSV += (-180 * (F.boatS - 1) - 11 * F.boatSV) * dt; F.boatS += F.boatSV * dt; }
          if (t > 0.65 && F.st === 5) { F.st = 6; F.ready = true; guideStep(); }
        }
        if (F.st === 6 && !F.carry) { F.boatSV += (-180 * (F.boatS - 1) - 11 * F.boatSV) * dt; F.boatS += F.boatSV * dt; }
      }

      /* ---------------- carrying the boat to the water, and letting go ---------------- */
      function boatOnStone() { const p = sheetPt(0.5, SHAPE_V[5] + 0.12); return { x: p.x, y: p.y, w: G.Ws * F.z * 1.02 }; }
      function grabBoat(p) {
        if (F.st !== 6 || F.carry) return false;
        const b = boatOnStone();
        if (Math.abs(p.x - b.x) > b.w * 0.62 || p.y < b.y - b.w * 0.8 || p.y > b.y + b.w * 0.3) return false;
        F.carry = { x: b.x, y: b.y, gx: b.x, gy: b.y, ox: b.x - p.x, oy: b.y - p.y, vx: 0, vy: 0, sp: 0, lt: performance.now(), lx: p.x, ly: p.y, hist: [] };
        if (A.ctx) A.paper({ freq: 2400, dur: 0.1, vol: 0.06 }); sync('boat-lift');
        K.guideDone();
        return true;
      }
      function moveBoat(p) {
        const c = F.carry; if (!c) return;
        const now = performance.now();
        c.gx = p.x + c.ox; c.gy = Math.max(G.reachY, p.y + c.oy);   // you can only reach so far from the stone
        c.hist.push([now, c.gx, c.gy]); while (c.hist.length > 2 && now - c.hist[0][0] > 140) c.hist.shift();
      }
      function releaseBoat(p, force) {
        const c = F.carry; if (!c) return;
        F.carry = null;
        const now = performance.now(); let sp = 0;
        if (c.hist.length >= 2) { const a = c.hist[0], b = c.hist[c.hist.length - 1], dt = Math.max(16, b[0] - a[0]); sp = Math.hypot(b[1] - a[1], b[2] - a[2]) / dt * 1000; if (now - b[0] > 120) sp *= 0.3; }
        const x = force ? force.x : c.x, y = force ? force.y : c.y;
        if (!onWater(x, y) || y > G.stoneTop - 6) { // not on the water yet: it slides back onto the stone
          F.backT = performance.now(); F.backFrom = { x: c.x, y: c.y };
          if (A.ctx) A.paper({ freq: 1800, dur: 0.12, vol: 0.05 });
          S.later(guideStep, 500);
          return;
        }
        launch(x, y, force ? 40 : sp, c.vx || 0, c.vy || 0);
      }
      function launch(x, y, sp, vx, vy) {
        const it = F.item, gentle = clamp(1 - (sp - 70 * G.U) / (720 * G.U), 0, 1);
        SC.gentle.push(gentle); SC.best = Math.max(SC.best, gentle);
        const k = KK[clamp(y | 0, 0, G.h)];
        const b = { it, spr: boatSprite(it.paper), x, y, vx: clamp(vx * 0.12, -40, 40), vy: Math.min(0, vy * 0.12), yaw: (Math.random() - 0.5) * 0.4, yawV: 0, roll: 0, ph: Math.random() * 9, k, alpha: 1, state: it.sticky ? 'drift' : 'float', age: 0, tag: null, born: W.t, sticky: !!it.sticky, light: 0 };
        boats.push(b);
        // a gentle set-down barely ripples; a dropped boat splashes
        splash(x, y, 0.5 + (1 - gentle) * 2.6, (10 + (1 - gentle) * 16) * k * G.U);
        if (gentle < 0.45) { P.emit('drop', x, y - 4, Math.round(6 + (1 - gentle) * 10), { colors: ['rgba(220,245,255,0.9)'], angle: -Math.PI / 2, spread: 1.6, speed: [60, 160] }); SC.splashy++; }
        plip(gentle, x); K.sfx.soft();
        b.tag = makeTag(it); b.tagUntil = W.t + (it.sticky ? 999 : 4.2);
        W.launched++; W.idx++;
        F.st = 0; F.item = null; F.ready = false;
        ctx.track('launch', { n: W.launched, gentle: Math.round(gentle * 100), sticky: it.sticky ? 1 : 0 });
        if (!SC.papers.includes(it.paper)) SC.papers.push(it.paper);
        // what the characters say about it
        if (W.launched === 1) S.later(() => talk('drop', L.firstFloat, 4600, 'love', 2600), 700);
        else if (gentle > 0.9 && !W.saidGentle) { W.saidGentle = true; talk('still', L.gentle, 2400, 'happy'); }
        else if (gentle < 0.35 && !W.saidSplash) { W.saidSplash = true; talk('still', L.splashy, 3000, 'surprised', 1600); }
        else if (W.launched === 2 && !care()) S.later(() => talk('still', L.watch, 2800, 'calm'), 1200);
        K.guide(null);
        if (!it.sticky) nextAfter(1700);   // a breath to watch it go before the next sheet
      }
      function nextAfter(ms) {
        S.later(() => {
          if (W.phase !== 'play' || W.stuck) return;
          if (W.idx < ITEMS.length) newSheet();
          else lastOut();
        }, ms);
      }
      function makeTag(it) {
        const t = h('div', { class: 'lf-tag', 'aria-hidden': 'true' }, h('small', { text: 'A thought like…', hidden: !it.generic }), h('span', { class: 'gk-user', text: it.text }));
        el.append(t); t.style.transform = 'translate(-999px,-999px)';
        S.later(() => t.classList.add('lf-on'), 60);
        return { el: t, w: 0, h: 0 };
      }

      /* ---------------- the stream's passengers ---------------- */
      const GR = { gx: 0, gy: 0 };
      function stepBoats(dt) {
        for (let i = boats.length - 1; i >= 0; i--) {
          const b = boats[i];
          b.age += dt;
          if (b.state === 'gone') continue;
          if (b.state === 'stuck') { stepStuck(b, dt); continue; }
          const f = flowAt(b.x, b.y), k = f.k;
          rippleGrad(b.x, b.y, GR);
          if (b.state === 'drift') { // the heavy one is drawn straight onto the rock's near face
            const sn = G.snag, side = b.x > sn.x ? 1 : -1, cx = sn.x + side * sn.r * 0.32, cy = sn.y + sn.r * 0.62 + 6 * G.U;
            const dx = cx - b.x, dy = cy - b.y, dl = Math.hypot(dx, dy) || 1, spd = Math.max(28 * G.U, Math.hypot(f.vx, f.vy)), e2 = 1 - Math.exp(-dt * 2.4);
            b.vx += (dx / dl * spd - b.vx) * e2; b.vy += (dy / dl * spd - b.vy) * e2;
            if (dl < 9 * G.U || b.y < cy) getStuck(b);
          } else {
            const ease = 1 - Math.exp(-dt * 1.3);
            b.vx += (f.vx - b.vx) * ease - GR.gx * 520 * G.U * dt; b.vy += (f.vy - b.vy) * ease - GR.gy * 520 * G.U * dt;
            const r = clamp(b.y | 0, 0, G.h + 1), lat = f.lat;
            if (Math.abs(lat) > 0.72) b.vx += (CL[r] - b.x) * dt * (Math.abs(lat) - 0.72) * 9;
            for (const rk of G.rocks) { const dx = b.x - rk.x, dy = b.y - rk.y, d = Math.hypot(dx, dy), md = rk.r + 12 * k * G.U; if (d < md) { b.x = rk.x + dx / (d || 1) * md; b.y = rk.y + dy / (d || 1) * md; } }
          }
          if (b.state === 'stuck') continue;
          b.x += b.vx * dt; b.y += b.vy * dt;
          b.k = KK[clamp(b.y | 0, 0, G.h + 1)];
          const want = clamp(Math.atan2(b.vx, -b.vy) * 0.8, -1.1, 1.1) + Math.sin(W.t * 0.4 + b.ph) * 0.35;
          b.yawV += (angDiff(want, b.yaw) * 2.2 - b.yawV * 1.6 + (GR.gx - GR.gy) * 6) * dt; b.yaw += b.yawV * dt;
          b.roll = Math.sin(W.t * 1.7 + b.ph) * 0.05 + clamp(GR.gx * 3, -0.25, 0.25);
          if (b.y < G.yFar + G.h * 0.07) { b.alpha = clamp((b.y - (G.yFar + G.h * 0.025)) / (G.h * 0.045), 0, 1); if (b.alpha <= 0) boatGone(b); }
          if (b.tag && W.t > b.tagUntil && b.tag.el.classList.contains('lf-on')) b.tag.el.classList.remove('lf-on');
        }
      }
      function boatGone(b) {
        b.state = 'gone'; W.gone++;
        MU.bells.push(BELLS[(W.gone - 1) % BELLS.length]);
        if (b.tag) { b.tag.el.remove(); b.tag = null; }
        W.bpm = Math.max(126, 150 - W.gone * 5);
        ctx.track('gone', { n: W.gone });
        if (W.phase === 'play' && W.idx >= ITEMS.length && boats.every(x => x.state === 'gone')) lastOut();
      }
      function getStuck(b) {
        b.state = 'stuck'; W.stuck = b; W.stuckT = performance.now(); W.nudges = 0; W.wobble = 1;
        const sn = G.snag, side = b.x > sn.x ? 1 : -1;
        b.pin = { x: sn.x + side * sn.r * 0.32, y: sn.y + sn.r * 0.62 + 6 * G.U }; b.side = side; b.spin = 0.9; b.vx = b.vy = 0;
        tok(0.12); splash(b.pin.x, b.pin.y, 0.8, 12 * G.U);
        S.later(() => talk('drop', L.stuckIn, 2800, 'worried'), 300);
        S.later(() => { talk('still', L.stuckTip, 3600, 'calm'); guideStep(); }, 2600);
        if (W.cameo === 'frog' && !care()) W.frogHop = W.t;
        ctx.track('stuck', {});
      }
      function stepStuck(b, dt) {
        const k = b.k = KK[clamp(b.pin.y | 0, 0, G.h + 1)];
        W.wobble = Math.max(0.15, W.wobble - dt * 0.6);
        rippleGrad(b.x, b.y, GR);
        b.yaw += b.spin * dt; b.spin += (0.9 - b.spin) * dt * 0.5;
        const jig = Math.sin(W.t * 3.1) * 2.5 * W.wobble * G.U;
        b.x += (b.pin.x + jig + GR.gx * -40 * G.U - b.x) * Math.min(1, dt * 6); b.y += (b.pin.y + Math.cos(W.t * 2.3) * 1.5 * G.U - b.y) * Math.min(1, dt * 6);
        b.roll = Math.sin(W.t * 2.4) * 0.08 * (0.5 + W.wobble);
        if (b.tag && W.t > b.tagUntil) b.tag.el.classList.remove('lf-on');
        // nobody is ever stuck for good: left alone long enough, it works itself free (no pressure, no penalty)
        if (performance.now() - Math.max(W.stuckT, W.lastNudge) > T.selfFree * 1000) { SC.stuckSelf = W.nudges === 0; freeStuck(true); }
        void k;
      }
      function nudge(x, y) {
        const b = W.stuck; if (!b) return;
        W.nudges++; W.wobble = 1.2; W.lastNudge = performance.now();
        b.spin += 2.4 * (x < b.x ? 1 : -1); tok(0.07 + W.nudges * 0.02);
        const p = b.pin; p.x += (p.x - x) * 0.06; p.y -= 3 * G.U;
        P.emit('drop', b.x, b.y - 6, 4, { colors: ['rgba(230,250,255,0.85)'], angle: -Math.PI / 2, spread: 1.4, speed: [40, 90] });
        if (W.nudges === 1) talk('drop', L.nudge, 2200, 'wow', 1800);
        ctx.track('nudge', { n: W.nudges });
        if (W.nudges >= T.nudges) S.later(() => freeStuck(false), 380);
      }
      function freeStuck(self) {
        const b = W.stuck; if (!b || b.state !== 'stuck') return;
        b.state = 'float'; b.sticky = false; W.stuck = null; K.guide(null);
        const sn = G.snag; b.vx = b.side * 60 * G.U; b.vy = -40 * G.U; b.x = sn.x + b.side * (sn.r + 10 * G.U); b.tagUntil = W.t + 2.5;
        splash(b.x, b.y, 1.4, 16 * G.U);
        if (A.ctx) { A.whoosh({ from: 500, to: 1600, dur: 0.6, vol: 0.06 }); ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => A.chime(nf(n), { when: A.now() + 0.1 + i * 0.09, vol: 0.05, dur: 1.6 })); }
        sync('freed');
        S.later(() => talk('still', self ? L.selfFree : L.freed, 3600, 'happy'), 500);
        drop.face('happy', 2000);
        ctx.track('freed', { nudges: W.nudges, self: self ? 1 : 0, touched: W.touchedStuck });
        nextAfter(1900);
      }
      function lastOut() {
        if (W.phase !== 'play' || W.lastOut) return;
        W.lastOut = true; K.guide(null);
        S.later(() => talk('drop', L.last, 3200, 'happy'), 1400);
        S.later(toLake, 4800);
      }
      function spawnStreak() {
        const y = G.yFar + 40 * G.U + Math.pow(Math.random(), 0.6) * (G.h - G.yFar), r = clamp(y | 0, 0, G.h), lat = (Math.random() * 2 - 1) * 0.85, x = CL[r] + lat * (lat < 0 ? HL[r] : HR[r]);
        if (onStone(x, y)) return;
        streaks.push({ x, y, life: 2.4 + Math.random() * 2.6, age: 0, tr: [x, y], tt: 0 });
      }
      function stepFlowBits(dt) {
        while (streaks.length < (G.phone ? 26 : 40)) spawnStreak();
        for (let i = streaks.length - 1; i >= 0; i--) {
          const s = streaks[i]; s.age += dt; const f = flowAt(s.x, s.y);
          s.x += f.vx * dt; s.y += f.vy * dt; s.tt += dt;
          if (s.tt > 0.07) { s.tt = 0; s.tr.push(s.x, s.y); if (s.tr.length > 12) s.tr.splice(0, 2); }
          if (s.age > s.life || !f.inside || s.y < G.yFar + 10) streaks.splice(i, 1);
        }
        const nd = SEA.debris === 'snow' ? 8 : G.phone ? 10 : 16;
        while (debris.length < nd) {
          const y = G.yFar + 60 * G.U + Math.random() * (G.h - G.yFar - 60 * G.U), r = clamp(y | 0, 0, G.h), lat = (Math.random() * 2 - 1) * 0.8, x = CL[r] + lat * (lat < 0 ? HL[r] : HR[r]);
          if (onStone(x, y)) continue;
          debris.push({ x, y, vx: 0, vy: 0, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.8, s: 0.7 + Math.random() * 0.6, col: SEA.deb[Math.floor(Math.random() * SEA.deb.length)], ph: Math.random() * 9, born: W.t });
        }
        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i], f = flowAt(d.x, d.y); rippleGrad(d.x, d.y, GR);
          d.vx += (f.vx - d.vx) * Math.min(1, dt * 1.6) - GR.gx * 600 * G.U * dt; d.vy += (f.vy - d.vy) * Math.min(1, dt * 1.6) - GR.gy * 600 * G.U * dt;
          d.x += d.vx * dt; d.y += d.vy * dt; d.rot += (d.vr + GR.gx * 4) * dt; d.k = f.k;
          if (d.y < G.yFar + 20 || !f.inside) debris.splice(i, 1);
        }
        while (glints.length < (K.dark() ? 10 : 18)) { const y = G.yFar + 30 * G.U + Math.random() * (G.stoneTop - G.yFar), r = clamp(y | 0, 0, G.h), lat = (Math.random() * 2 - 1) * 0.8; glints.push({ x: CL[r] + lat * (lat < 0 ? HL[r] : HR[r]), y, ph: Math.random() * TAU, f: 1.5 + Math.random() * 2.5, life: 2 + Math.random() * 3, age: 0 }); }
        for (let i = glints.length - 1; i >= 0; i--) { const gl = glints[i], f = flowAt(gl.x, gl.y); gl.x += f.vx * dt; gl.y += f.vy * dt; gl.age += dt; if (gl.age > gl.life || !f.inside) glints.splice(i, 1); }
        if (!DAP.length) for (let i = 0; i < 6; i++) DAP.push({ px: Math.random() * 9, py: Math.random() * 9, fx: 0.05 + Math.random() * 0.07, fy: 0.04 + Math.random() * 0.06, s: 0.6 + Math.random() * 0.7 });
      }

      /* ---------------- input: fold, carry, or ripple the water ---------------- */
      const IN = { mode: null, lx: 0, ly: 0, lt: 0, acc: 0, lastNudgeAt: 0 };
      function stuckHit(p) { const b = W.stuck; if (!b) return false; const bw = G.boatW * b.k; return Math.abs(p.x - b.x) < bw * 0.55 && p.y > b.y - bw * 0.8 && p.y < b.y + bw * 0.25; }
      function nearStuck(p) { const b = W.stuck; if (!b) return false; return Math.hypot(p.x - b.x, p.y - b.y) < 175 * G.U; }
      K.press(pad, {
        down: (p) => {
          if (finished) return;
          IN.mode = null;
          if (W.phase === 'lake') { lakeTouch(p, true); IN.mode = 'lake'; IN.lx = p.x; IN.ly = p.y; return; }
          if (W.phase !== 'play') return;
          if (grabFold(p)) { IN.mode = 'fold'; return; }
          if (grabBoat(p)) { IN.mode = 'carry'; return; }
          if (stuckHit(p)) {
            IN.mode = 'touch'; W.touchedStuck++;
            if (A.ctx) A.tone({ type: 'triangle', freq: 320, to: 250, glide: 0.1, dur: 0.16, vol: 0.05 });
            if (performance.now() - W.saidTouch > 7000) { W.saidTouch = performance.now(); talk('still', L.boatTouch, 2800, 'think'); }
            return;
          }
          if (onWater(p.x, p.y)) {
            IN.mode = 'water'; IN.lx = p.x; IN.ly = p.y; IN.lt = performance.now(); IN.acc = 0;
            const k = KK[clamp(p.y | 0, 0, G.h)];
            splash(p.x, p.y, 2.2, 9 * k * G.U); bloop(p.x, p.y, 0.05);
            P.emit('drop', p.x, p.y, 3, { colors: ['rgba(230,250,255,0.8)'], angle: -Math.PI / 2, spread: 1.2, speed: [30, 70] });
            if (W.stuck && nearStuck(p)) { IN.lastNudgeAt = performance.now(); nudge(p.x, p.y); }
            else if (!W.saidRipple && W.launched >= 1 && !W.stuck) { W.saidRipple = true; S.later(() => talk('still', L.ripple, 2400, 'happy'), 400); }
          }
        },
        move: (p) => {
          if (IN.mode === 'fold') moveFold(p);
          else if (IN.mode === 'carry') moveBoat(p);
          else if (IN.mode === 'water' && onWater(p.x, p.y)) {
            const now = performance.now(), dt = Math.max(1, now - IN.lt), d = Math.hypot(p.x - IN.lx, p.y - IN.ly), sp = d / dt * 1000, k = KK[clamp(p.y | 0, 0, G.h)];
            const steps = Math.min(6, Math.ceil(d / (7 * G.U)));
            for (let s = 1; s <= steps; s++) splash(IN.lx + (p.x - IN.lx) * s / steps, IN.ly + (p.y - IN.ly) * s / steps, Math.min(1.2, 0.25 + sp / 1600) / steps * 2, 7 * k * G.U);
            IN.acc += d; IN.lx = p.x; IN.ly = p.y; IN.lt = now;
            if (AU.swish) { AU.swish.level(Math.min(0.06, sp / 9000), 0.05); AU.swish.freq(600 + Math.min(1600, sp * 0.8), 0.06); }
            if (W.stuck && nearStuck(p) && now - IN.lastNudgeAt > 650) { IN.lastNudgeAt = now; nudge(p.x, p.y); }
          } else if (IN.mode === 'lake') lakeTouch(p, false);
        },
        up: (p) => {
          if (IN.mode === 'fold') releaseFold();
          else if (IN.mode === 'carry') releaseBoat(p);
          if (AU.swish) AU.swish.level(0.0001, 0.08);
          IN.mode = null;
        }
      });
      K.onKey(['Space', 'Enter'], (e) => {
        if (finished || W.phase === 'intro') return;
        e.preventDefault(); A.unlock(); K.guideDone();
        if (W.phase === 'lake') { if (W.lakeStep === 'send') sendOff(); return; }
        if (W.phase !== 'play') return;
        if (W.stuck) { const q = nudgePoint(); splash(q.x, q.y, 2.2, 9 * G.U); bloop(q.x, q.y, 0.05); nudge(q.x, q.y); return; }
        if (F.st >= 1 && F.st <= 3) autoFold();
        else if (F.st === 6 && !F.carry) { const lp = launchPoint(); launch(lp.x, lp.y, 40, 0, 0); }
      });

      /* ---------------- drawing ---------------- */
      function drawStream(g, D, C) {
        const w = G.w, H = G.h, U = G.U, t = W.t;
        g.drawImage(BGB.c, 0, 0, w, H);
        // sun on the stream bed: two drifting layers of caustics
        if (causPat) {
          g.save(); g.clip(streamPath); g.beginPath(); g.rect(0, G.yFar + H * 0.14, w, H); g.clip(); g.globalCompositeOperation = D ? 'lighter' : 'overlay';
          const sc1 = 1.6 * U, sc2 = 1.15 * U, dr = G.speed * 0.32;
          for (let L2 = 0; L2 < 2; L2++) {
            const sc = L2 ? sc2 : sc1, ox = (L2 ? -t * 9 : t * 6) * U, oy = -t * dr * (L2 ? 0.8 : 1);
            g.globalAlpha = (D ? 0.045 : 0.13) * (0.7 + 0.3 * Math.sin(t * 0.9 + L2 * 2));
            g.setTransform(cv.dpr * sc, 0, 0, cv.dpr * sc * 0.62, cv.dpr * (ox % (128 * sc)), cv.dpr * (oy % (128 * sc * 0.62)));
            g.fillStyle = causPat; g.fillRect(-256, -256, w / sc + 512, H / (sc * 0.62) + 512);
          }
          g.restore(); g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        }
        // dappled light moving with the leaves above
        g.globalCompositeOperation = D ? 'lighter' : 'screen';
        const spr = K.glowSprite(rgba(C.glow, 0.9));
        for (const d of DAP) {
          const yy = G.yFar + (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * d.fy + d.py))) * (G.stoneTop - G.yFar), r = clamp(yy | 0, 0, H), xx = CL[r] + Math.sin(t * d.fx + d.px) * HL[r] * 0.9, k = KK[r];
          const s = 90 * U * d.s * k; g.globalAlpha = (D ? 0.12 : 0.2) * (0.6 + 0.4 * Math.sin(t * 0.5 + d.px)); g.drawImage(spr, xx - s, yy - s * 0.5, s * 2, s);
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        rippleDraw(g, D);
        // flow lines: the current made visible
        g.lineCap = 'round'; g.lineJoin = 'round';
        const sc = D ? '#ffe9c0' : '#ffffff';
        for (const s of streaks) {
          const n = s.tr.length / 2; if (n < 3) continue;
          const k = KK[clamp(s.y | 0, 0, H)], a = Math.sin(Math.PI * clamp(s.age / s.life, 0, 1)) * (D ? 0.22 : 0.4);
          g.strokeStyle = rgba(sc, a); g.lineWidth = (0.6 + 1.1 * k) * U;
          g.beginPath(); g.moveTo(s.tr[0], s.tr[1]); for (let i = 2; i < s.tr.length; i += 2) g.lineTo(s.tr[i], s.tr[i + 1]); g.lineTo(s.x, s.y); g.stroke();
        }
        // floating petals, leaves, seed fluff
        for (const d of debris) {
          const k = d.k || 0.5, s = 5 * d.s * k * U, fade = clamp((W.t - d.born) / 1.2, 0, 1) * clamp((d.y - G.yFar - 20) / 60, 0, 1);
          g.save(); g.translate(d.x, d.y); g.rotate(d.rot); g.globalAlpha = fade;
          if (SEA.debris === 'petal') { g.fillStyle = d.col; g.beginPath(); g.ellipse(0, 0, s, s * 0.62, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(-s * 0.2, -s * 0.15, s * 0.4, s * 0.22, 0, 0, TAU); g.fill(); }
          else if (SEA.debris === 'leaf') { g.fillStyle = d.col; g.beginPath(); g.moveTo(-s * 1.4, 0); g.quadraticCurveTo(0, -s * 0.9, s * 1.4, 0); g.quadraticCurveTo(0, s * 0.9, -s * 1.4, 0); g.fill(); g.strokeStyle = 'rgba(80,40,20,0.4)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-s * 1.3, 0); g.lineTo(s * 1.3, 0); g.stroke(); }
          else if (SEA.debris === 'snow') { g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(0, 0, s * 1.1, s * 0.5, 0, 0, TAU); g.fill(); }
          else { g.globalAlpha = fade * 0.9; g.fillStyle = d.col; g.beginPath(); g.arc(0, 0, s * 0.45, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.6; for (let r = 0; r < 6; r++) { const a = r / 6 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * s, Math.sin(a) * s); g.stroke(); } }
          g.restore();
        }
        g.globalAlpha = 1;
        // sun glints
        g.globalCompositeOperation = D ? 'lighter' : 'screen';
        g.fillStyle = D ? '#fff2cc' : '#ffffff';
        for (const gl of glints) {
          const a = Math.pow(Math.max(0, Math.sin(W.t * gl.f + gl.ph)), 6) * Math.sin(Math.PI * clamp(gl.age / gl.life, 0, 1)); if (a < 0.05) continue;
          const k = KK[clamp(gl.y | 0, 0, H)], s = (2 + 3 * a) * k * U;
          g.globalAlpha = a * (D ? 0.7 : 0.95); K.starPath(g, gl.x, gl.y, s * 1.8, s * 0.35, 4, 0); g.fill();
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }
      function drawRocksAndBoats(g, D, C) {
        const items = [];
        G.rocks.forEach((rk, i) => items.push({ y: rk.y, rock: i }));
        boats.forEach(b => { if (b.state !== 'gone') items.push({ y: b.y + 0.001, boat: b }); });
        items.sort((a, b) => a.y - b.y);
        for (const it of items) {
          if (it.rock != null) {
            const rk = G.rocks[it.rock], R = ROCKS[it.rock], U = G.U;
            g.strokeStyle = rgba(C.foam, D ? 0.35 : 0.6); g.lineWidth = 1.4 * U * KK[rk.y];
            for (let k = 0; k < 2; k++) { const ph = (W.t * 0.8 + k * 0.5) % 1; g.globalAlpha = (1 - ph) * 0.8; g.beginPath(); g.ellipse(rk.x, rk.y + rk.r * 0.22, rk.r * (1.05 + ph * 0.5), rk.r * (0.42 + ph * 0.2), 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); }
            g.globalAlpha = 1;
            g.drawImage(R.c, rk.x - R.ax, rk.y - R.ay, R.w, R.h);
            if (it.rock === 0) drawFrog(g);
          } else drawFloating(g, it.boat, D, C);
        }
      }
      function drawFloating(g, b, D, C) {
        const U = G.U, k = b.k || KK[clamp(b.y | 0, 0, G.h)], bw = G.boatW * k, a = b.alpha, bob = Math.sin(W.t * 1.9 + b.ph) * 1.4 * k * U;
        const cy = Math.cos(b.yaw), squash = (0.5 + 0.5 * Math.abs(cy)) * (cy < 0 ? -1 : 1);
        g.globalAlpha = 0.24 * a; g.fillStyle = D ? '#001510' : '#0a4a50'; g.beginPath(); g.ellipse(b.x, b.y + bw * 0.03, bw * 0.42 * Math.abs(squash), bw * 0.07, 0, 0, TAU); g.fill();
        // its reflection on the water, then the boat
        g.save(); g.translate(b.x, b.y + bw * 0.02); g.scale(1, -0.42); drawBoatSpr(g, b.spr, 0, 0, bw, -b.roll, squash, 0.2 * a); g.restore();
        drawBoatSpr(g, b.spr, b.x, b.y + bob, bw, b.roll, squash, a);
        g.globalAlpha = 0.45 * a; g.strokeStyle = rgba(C.foam, 0.9); g.lineWidth = 1 * U; g.beginPath(); g.ellipse(b.x, b.y + bob * 0.3 + bw * 0.01, bw * 0.4 * Math.abs(squash), bw * 0.05, 0, 0, Math.PI); g.stroke();
        g.globalAlpha = 1;
        if (b.tag) {
          const t = b.tag; if (!t.w) { t.w = t.el.offsetWidth || 120; t.h = t.el.offsetHeight || 32; }
          const x = clamp(b.x - t.w / 2, 8, G.w - t.w - 8), y = clamp(b.y - bw * 0.82 - t.h - 8, 60, G.h - t.h - 20);
          t.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          t.el.style.opacity = b.tag.el.classList.contains('lf-on') ? String(clamp((k - 0.3) / 0.2, 0, 1) * a) : '';
        }
      }
      function drawFrog(g) {
        if (W.cameo !== 'frog') return;
        const rk = G.snag, U = G.U, k = KK[rk.y], hop = W.frogHop ? clamp((W.t - W.frogHop) / 0.8, 0, 1) : 0;
        if (hop >= 1) return;
        const x = rk.x - rk.r * 0.2 + hop * 60 * U, y = rk.y - rk.r * 0.75 - Math.sin(hop * Math.PI) * 30 * U, s = 9 * k * U * 1.6;
        g.fillStyle = '#5c9a3e'; g.beginPath(); g.ellipse(x, y, s, s * 0.7, 0, 0, TAU); g.fill();
        g.fillStyle = '#7fc25a'; [-1, 1].forEach(sd => { g.beginPath(); g.arc(x + sd * s * 0.5, y - s * 0.55, s * 0.32, 0, TAU); g.fill(); });
        g.fillStyle = '#1a2a10'; [-1, 1].forEach(sd => { g.beginPath(); g.arc(x + sd * s * 0.5, y - s * 0.58, s * 0.14, 0, TAU); g.fill(); });
      }
      function drawCameo(g, D) {
        if (W.cameo === 'duck' && W.duckT) {
          const k0 = (W.t - W.duckT) / 16; if (k0 > 1) return;
          for (let i = 0; i < 4; i++) {
            const kk = k0 - i * 0.035; if (kk < 0) continue;
            const y = G.yFar + G.h * (0.08 + 0.02 * i), r = clamp(y | 0, 0, G.h), x = CL[r] - HL[r] * 0.9 + kk * (HL[r] + HR[r]) * 1.1, s = (i ? 5 : 8) * KK[r] * G.U * 1.6;
            g.fillStyle = i ? '#e8c050' : (D ? '#6b5a3a' : '#8a7448'); g.beginPath(); g.ellipse(x, y, s, s * 0.55, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(x + s * 0.7, y - s * 0.5, s * 0.42, 0, TAU); g.fill();
            g.fillStyle = '#f08a2a'; g.beginPath(); g.moveTo(x + s * 1.05, y - s * 0.5); g.lineTo(x + s * 1.45, y - s * 0.42); g.lineTo(x + s * 1.05, y - s * 0.35); g.fill();
          }
        } else if (W.cameo === 'heron') {
          const y = G.yFar + G.h * 0.2, r = clamp(y | 0, 0, G.h), x = CL[r] + HR[r] * 1.15, s = 26 * KK[r] * G.U * 1.5;
          g.strokeStyle = D ? '#9aa4a8' : '#6f7b80'; g.lineWidth = 1.6 * G.U; g.beginPath(); g.moveTo(x - s * 0.1, y); g.lineTo(x - s * 0.1, y - s * 0.6); g.moveTo(x + s * 0.1, y); g.lineTo(x + s * 0.12, y - s * 0.6); g.stroke();
          g.fillStyle = D ? '#b8c2c6' : '#8d9aa0'; g.beginPath(); g.ellipse(x, y - s * 0.85, s * 0.35, s * 0.22, -0.3, 0, TAU); g.fill();
          g.strokeStyle = g.fillStyle; g.lineWidth = 3 * G.U * KK[r]; g.beginPath(); g.moveTo(x + s * 0.15, y - s * 0.95); g.quadraticCurveTo(x + s * 0.32, y - s * 1.35, x + s * 0.18, y - s * 1.5); g.stroke();
          g.fillStyle = '#e0b040'; g.beginPath(); g.moveTo(x + s * 0.2, y - s * 1.52); g.lineTo(x + s * 0.48, y - s * 1.46); g.lineTo(x + s * 0.2, y - s * 1.44); g.fill();
        }
      }
      function drawSheet(g) {
        if (F.st < 1 || !F.tex) return;
        const D = K.dark(), dpr = cv.dpr, T = sheetT(), Z = T[0];
        if (F.st >= 5) { drawStoneBoat(g); return; }
        const fs = facets(F.st, F.c, F.c2), sn = Math.sqrt(Math.max(0, 1 - F.c * F.c)), rest = F.c > 0.999 && !F.drag && !F.closing;
        const setT = (M, ox, oy) => g.setTransform(dpr * M[0], dpr * M[1], dpr * M[2], dpr * M[3], dpr * (M[4] + (ox || 0)), dpr * (M[5] + (oy || 0)));
        const path = (p) => { g.beginPath(); for (let i = 0; i < p.length; i++) { if (i) g.lineTo(p[i][0], p[i][1]); else g.moveTo(p[i][0], p[i][1]); } g.closePath(); };
        // the paper's soft shadow on the stone
        g.fillStyle = D ? 'rgba(0,0,0,0.28)' : 'rgba(20,40,30,0.18)';
        for (const f of fs) { if (f.flap || f.line) continue; setT(mul(T, f.M), 2.5 * G.U, 4 * G.U); path(f.p); g.fill(); }
        // layers bottom to top; each casts a hairline shadow on the paper beneath it, so an edge shows only where paper overlaps
        for (const f of fs) {
          if (f.line) { setT(mul(T, f.M)); g.strokeStyle = 'rgba(70,55,40,0.4)'; g.lineWidth = 1 / Z; g.beginPath(); g.moveTo(f.line[0][0], f.line[0][1]); g.lineTo(f.line[1][0], f.line[1][1]); g.stroke(); continue; }
          let M = mul(T, f.M);
          if (f.flap && sn > 0.02) {
            // the raised flap: its shadow falls down-right on the paper, and it rises toward you by its height (the hinge stays put)
            setT(mul(T, mul(liftM(f.P, f.n, F.c, 0.16 * sn, 0.24 * sn), f.pre)), 1.5 * G.U, 2.5 * G.U); g.fillStyle = `rgba(10,20,15,${(0.22 * sn).toFixed(3)})`; path(f.p); g.fill();
            M = mul(T, mul(liftM(f.P, f.n, F.c, 0, -0.27 * sn), f.pre));
          } else if (!(f.flap && rest)) { setT(M, 0.8 * G.U, 1.3 * G.U); g.fillStyle = 'rgba(45,35,25,0.2)'; path(f.p); g.fill(); }
          setT(M); path(f.p);
          g.save(); g.clip();
          g.drawImage(f.s ? F.tex.back : (F.st === 1 && rest && F.wordsOn ? F.tex.plain : F.tex.front), 0, 0, 1, R2);
          if (f.flap && sn > 0.02) { g.fillStyle = F.c > 0 ? `rgba(255,255,255,${(0.14 * sn).toFixed(3)})` : `rgba(30,20,10,${(0.12 * sn).toFixed(3)})`; g.fillRect(-1, -1, 3, 3); }
          else if (f.s) { g.fillStyle = 'rgba(40,30,20,0.03)'; g.fillRect(-1, -1, 3, 3); }
          g.restore();
        }
        g.setTransform(dpr * T[0], 0, 0, dpr * T[3], dpr * T[4], dpr * T[5]);
        // while the paper rests, the next fold shows as a faint dashed line, like an origami diagram
        if (rest && F.ready && F.st <= 3) {
          const NX = { 1: [[[0, H2], [1, H2]]], 2: [[[0.5, H2], [0, YB]], [[0.5, H2], [1, YB]]], 3: [[[0, YB], [1, YB]]] }[F.st];
          g.setLineDash([5 / Z, 5 / Z]); g.strokeStyle = rgba(F.tex.ink, 0.32); g.lineWidth = 1.2 / Z;
          NX.forEach(([a, b]) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); });
          g.setLineDash([]);
        }
        // a gleam runs along the crease you just made
        const gk = clamp((performance.now() - (F.creaseAt || 0)) / 420, 0, 1);
        if (gk < 1) for (const [a, b] of F.crease) { const x = lerp(a[0], b[0], gk), y = lerp(a[1], b[1], gk), s = 0.13; g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - gk; g.drawImage(K.glowSprite('rgba(255,250,220,0.9)'), x - s, y - s, s * 2, s * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function drawStoneBoat(g) {
        const spr = boatSprite(F.item.paper), base = boatOnStone();
        let x = base.x, y = base.y, wpx = base.w, s = F.boatS;
        if (F.st === 5 && !F.popped) { // the hat squashes, then pops open into a boat
          const k = clamp((performance.now() - F.popT) / 200, 0, 1);
          const T = sheetT(), dpr = cv.dpr, fs = facets(4, 1, -1);
          g.setTransform(dpr * T[0] * (1 + 0.14 * k), 0, 0, dpr * T[3] * (1 - 0.3 * k), dpr * (T[4] - T[0] * 0.07 * k), dpr * (T[5] + T[3] * 0.3 * k * SHAPE_V[4]));
          for (const f of fs) { if (f.line) continue; const M = f.M; g.save(); g.transform(M[0], M[1], M[2], M[3], M[4], M[5]); g.beginPath(); f.p.forEach((pp, i) => (i ? g.lineTo(pp[0], pp[1]) : g.moveTo(pp[0], pp[1]))); g.closePath(); g.clip(); g.drawImage(f.s ? F.tex.back : F.tex.front, 0, 0, 1, R2); g.restore(); }
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          return;
        }
        if (F.carry) { const c = F.carry, lift = clamp((G.sy - c.y) / Math.max(1, G.sy - G.launchY), 0, 1.3); x = c.x; y = c.y; wpx = lerp(base.w, G.boatW * KK[clamp(c.y | 0, 0, G.h)], clamp(lift, 0, 1)); s = 1.04; }
        else if (F.backT) { const k = clamp((performance.now() - F.backT) / 380, 0, 1), e = 1 - Math.pow(1 - k, 3); x = lerp(F.backFrom.x, base.x, e); y = lerp(F.backFrom.y, base.y, e); if (k >= 1) F.backT = 0; }
        g.globalAlpha = F.carry ? 0.22 : 0.28; g.fillStyle = '#0a1a14'; g.beginPath(); g.ellipse(x + 4 * G.U, y + (F.carry ? 18 : 4) * G.U, wpx * 0.4, wpx * 0.07, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
        drawBoatSpr(g, spr, x, y - (F.carry ? 10 * G.U : 0), wpx * s, F.carry ? Math.sin(W.t * 3) * 0.04 : 0, 1, 1);
      }

      /* ---------------- the lake at sunset ---------------- */
      function lakeY0() { return Math.round(G.h * (G.phone ? 0.46 : 0.44)); }
      function paintLake() {
        const w = G.w, H = G.h, D = K.dark(), U = G.U, hy = lakeY0(), rr = seedRng(91), o = off(w, H, false), g = o.g;
        const sky = D ? ['#141b44', '#3d2c62', '#a24f6d', '#f08a5c', '#ffc777'] : ['#5b6bb8', '#9a7ac0', '#ef9a9a', '#ffc58a', '#ffe6a8'];
        let gr = g.createLinearGradient(0, 0, 0, hy);
        sky.forEach((c, i) => gr.addColorStop(i / (sky.length - 1), c));
        g.fillStyle = gr; g.fillRect(0, 0, w, hy + 1);
        for (let i = 0; i < 9; i++) { const y = hy * (0.25 + rr() * 0.55), x = rr() * w, cw = (60 + rr() * 140) * U; g.fillStyle = rgba(D ? '#f4a07a' : '#fff0dc', 0.16 + rr() * 0.12); g.beginPath(); g.ellipse(x, y, cw, cw * 0.08, 0, 0, TAU); g.fill(); }
        // far hills and a treeline, softened by the evening air
        const hills = D ? ['#5a3f6e', '#46325a', '#2f2442'] : ['#a07fae', '#836a9a', '#634f80'];
        hills.forEach((c, L2) => {
          g.fillStyle = c; g.beginPath(); g.moveTo(0, hy + 1);
          for (let x = 0; x <= w + 10; x += 10) { const y = hy - (14 + L2 * 10) * U - Math.sin(x * 0.006 + L2 * 2) * (10 + L2 * 4) * U - Math.sin(x * 0.017 + L2) * 5 * U; g.lineTo(x, L2 === 2 ? Math.max(y, hy - 12 * U - (rr() * 6 * U)) : y); }
          g.lineTo(w, hy + 1); g.closePath(); g.fill();
        });
        // the water: the sky, mirrored and deeper
        gr = g.createLinearGradient(0, hy, 0, H);
        const wat = D ? ['#c76a62', '#6a3f66', '#2a2448', '#141633'] : ['#f2a98e', '#b886a8', '#6f6aa8', '#42508e'];
        wat.forEach((c, i) => gr.addColorStop(i / (wat.length - 1), c));
        g.fillStyle = gr; g.fillRect(0, hy, w, H - hy);
        g.strokeStyle = rgba('#ffffff', D ? 0.06 : 0.1); g.lineWidth = 1;
        for (let i = 0; i < 70; i++) { const y = hy + 4 + Math.pow(rr(), 1.6) * (H - hy), x = rr() * w, l = (20 + rr() * 80) * U * (0.3 + (y - hy) / (H - hy)); g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke(); }
        // reeds and lily pads close by
        const reed = D ? '#121a20' : '#2a3a3a';
        [[0, 1], [w, -1]].forEach(([x0, s]) => {
          for (let i = 0; i < (G.phone ? 14 : 22); i++) { const x = x0 + s * rr() * w * (G.phone ? 0.3 : 0.18), hh = (60 + rr() * 120) * U, by = H + 4; g.strokeStyle = reed; g.lineWidth = (1.5 + rr() * 2) * U; g.beginPath(); g.moveTo(x, by); g.quadraticCurveTo(x + s * 8 * U, by - hh * 0.6, x + s * (6 + rr() * 16) * U, by - hh); g.stroke(); if (rr() < 0.3) { g.fillStyle = D ? '#3a2a1a' : '#5a3f28'; g.beginPath(); g.ellipse(x + s * 10 * U, by - hh * 0.8, 3 * U, 10 * U, 0.1 * s, 0, TAU); g.fill(); } }
        });
        for (let i = 0; i < 7; i++) { const x = w * (i % 2 ? 0.85 : 0.12) + (rr() - 0.5) * 70 * U, y = H * (0.82 + rr() * 0.14), r = (14 + rr() * 12) * U; g.fillStyle = D ? '#24402e' : '#4f8a5a'; g.beginPath(); g.ellipse(x, y, r, r * 0.38, 0, 0.3, TAU - 0.1); g.lineTo(x, y); g.closePath(); g.fill(); }
        return o;
      }
      function toLake() {
        if (W.phase !== 'play') return;
        W.phase = 'tolake'; K.guide(null);
        boats.forEach(b => { if (b.tag) { b.tag.el.remove(); b.tag = null; } });
        LAKE = paintLake();
        const n = boats.length, hy = lakeY0();
        W.lake = { boats: boats.map((b, i) => { const a = (i + 0.5) / n, tx = G.w * (0.5 + (a - 0.5) * (G.phone ? 0.62 : 0.4)), ty = hy + (G.h - hy) * (0.36 + 0.1 * Math.sin(i * 2.1)); return { spr: b.spr, x: G.w * (0.3 + 0.4 * a), y: G.h + 40 + i * 26 * G.U, tx, ty, ph: Math.random() * 9, light: 0, lit: false, yaw: (Math.random() - 0.5) * 0.6, delay: i * 0.35 }; }), t0: W.t };
        W.lakeStep = 'arrive';
        if (A.ctx) { A.whoosh({ from: 300, to: 900, dur: 1.4, vol: 0.05 }); A.pad(['D3', 'A3', 'F#4', 'E5'].map(nf), { dur: 5, vol: 0.1, attack: 1.4 }); }
        sync('lake');
        K.anim(1600, (k) => { W.lakeK = sm(k); }).then(() => {
          W.phase = 'lake'; W.lakeK = 1; MU.vol = 0.6;
          talk('drop', L.lake, 3200, 'love');
          S.later(lightUp, 2600);
        });
      }
      function lightUp() {
        if (!W.lake) return;
        W.lakeStep = 'lights';
        W.lake.boats.forEach((lb, i) => S.later(() => {
          lb.lit = true; if (A.ctx) { A.noise({ filter: 'bandpass', freq: 2400, dur: 0.12, attack: 0.03, vol: 0.03 }); A.chime(nf(BELLS[i % BELLS.length]), { vol: 0.05, dur: 2 }); }
          P.emit('ember', lb.x, lb.y - G.boatW * lb.k * 0.4, 4, { colors: ['#ffd27a', '#ffb05a'] });
        }, i * 520));
        S.later(() => {
          talk('still', L.lights, 3600, 'glow');
          W.lakeStep = 'send'; W.sendT = performance.now();
          K.guide({ id: 'lf-send', g: 'sweep', target: () => ({ x: G.w / 2, y: Math.min(G.h - 90, lakeY0() + (G.h - lakeY0()) * 0.66) }), d: 70 * G.U, label: 'SEND THEM OFF', place: 'below', delay: 700 });
        }, W.lake.boats.length * 520 + 600);
      }
      function lakeTouch(p, down) {
        if (W.phase !== 'lake') return;
        const hy = lakeY0(); if (p.y < hy + 6) return;
        const k = (p.y - hy) / (G.h - hy);
        if (down) { bloop(p.x, p.y, 0.05); W.lakeRipples.push({ x: p.x, y: p.y, t: W.t, k }); }
        else if (W.t - (W.lastLakeR || 0) > 0.12) { W.lastLakeR = W.t; W.lakeRipples.push({ x: p.x, y: p.y, t: W.t, k }); }
        if (W.lakeStep === 'send') sendOff();
      }
      function sendOff() {
        if (W.lakeStep !== 'send') return;
        W.lakeStep = 'away'; K.guide(null); W.awayT = W.t;
        const L0 = W.lake;
        // one last ripple runs out from every boat, and each one sounds its note as it goes
        L0.boats.forEach((b, i) => S.later(() => { W.lakeRipples.push({ x: b.x, y: b.y + 3, t: W.t, k: b.k || 0.5, big: 1 }); if (A.ctx) A.pluck(nf(SEND[i % SEND.length]), { vol: 0.13, damp: 0.997, verb: 0.45 }); }, i * 170));
        if (A.ctx) { A.whoosh({ from: 400, to: 1200, dur: 1.2, vol: 0.05 }); A.pad(['D3', 'A3', 'F#4', 'E5'].map(nf), { dur: 7, vol: 0.13, attack: 1.4 }); }
        K.sfx.rise();
        sync('send-off');
        S.later(() => talk('drop', L.gone, 4200, 'happy'), 2400);
        cap.children[0].textContent = 'Let it float.';
        cap.children[1].textContent = W.launched + ' paper boats · ' + SEA.name;
        cap.children[2].textContent = TOMORROW.id === SEA.id ? 'The stream will be here tomorrow.' : 'Tomorrow, the ' + TOMORROW.name + '.';
        S.later(() => { cap.classList.add('lf-on'); }, 3600);
        S.later(finish, 9200);
      }
      function stepLake(dt) {
        const L0 = W.lake; if (!L0) return;
        const hy = lakeY0(), away = W.lakeStep === 'away' ? W.t - W.awayT : 0;
        W.sunK = clamp(away / 7, 0, 1); W.duskK = clamp((away - 1.5) / 6, 0, 1);
        L0.boats.forEach((b, i) => {
          const lt = W.t - L0.t0 - b.delay; if (lt < 0) return;
          if (W.lakeStep !== 'away') { const e = 1 - Math.exp(-dt * 0.9); b.x += (b.tx - b.x) * e; b.y += (b.ty - b.y) * e; }
          else { const tx = G.w * 0.5 + (b.tx - G.w * 0.5) * 0.25, ty = hy + 3 * G.U; b.x += (tx - b.x) * dt * 0.28; b.y += (ty - b.y) * dt * (0.22 + i * 0.015); }
          b.k = clamp((b.y - hy) / (G.h - hy), 0.02, 1.2) * 1.05;
          if (b.lit) b.light = Math.min(1, b.light + dt * 2.2);
        });
        if (W.lakeStep === 'send' && performance.now() - W.sendT > 6500) sendOff();
      }
      function drawLake(g) {
        const w = G.w, H = G.h, U = G.U, hy = lakeY0(), D = K.dark(), L0 = W.lake;
        g.drawImage(LAKE.c, 0, 0, w, H);
        // the sun, slipping under the hills
        const sx = w * 0.5, sy = hy - (G.phone ? 46 : 60) * U + W.sunK * 74 * U, sr = (G.phone ? 26 : 34) * U;
        g.save(); g.beginPath(); g.rect(0, 0, w, hy - 8 * U); g.clip();
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.8 * (1 - W.sunK * 0.6); g.drawImage(K.glowSprite('rgba(255,190,110,0.9)'), sx - sr * 6, sy - sr * 6, sr * 12, sr * 12);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = mix('#fff2c8', '#ff9a5a', W.sunK); g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
        g.restore();
        // a glitter path to the sun: wider and brighter close by, fading as the sun goes down
        g.globalCompositeOperation = 'lighter';
        const gfade = 1 - W.sunK * 0.85;
        for (let i = 0; i < 80; i++) {
          const yy = hy + 2 + Math.pow(((i * 0.618) % 1), 1.7) * (H - hy) * 0.85, k = (yy - hy) / (H - hy), xx = sx + Math.sin(i * 12.9 + W.t * 0.5) * (5 + k * 80) * U * (0.6 + 0.4 * ((i * 0.37) % 1)), a = Math.pow(Math.max(0, Math.sin(W.t * (1.1 + (i % 7) * 0.35) + i * 1.7)), 3) * gfade * (1 - k * 0.45);
          if (a < 0.04) continue; g.globalAlpha = a * 0.8; g.fillStyle = i % 3 ? '#ffd9a0' : '#fff2d0'; g.fillRect(xx - (1.5 + k * 9) * U, yy, (3 + k * 18) * U, Math.max(1, (0.8 + k * 1.6) * U));
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // dusk settles in after the send-off: the first stars and a thin moon
        if (W.duskK > 0) {
          g.globalAlpha = W.duskK * 0.55; g.fillStyle = D ? '#0a0c22' : '#1c2350'; g.fillRect(0, 0, w, H); g.globalAlpha = 1; g.fillStyle = '#ffffff';
          const rr = seedRng(5); for (let i = 0; i < 70; i++) { const x = rr() * w, y = rr() * hy * 0.85; g.globalAlpha = W.duskK * (0.3 + 0.6 * rr()) * (0.6 + 0.4 * Math.sin(W.t * 2 + i)); g.fillRect(x, y, 1.5, 1.5); }
          const mx = G.phone ? w * 0.14 : w * 0.2, my = G.phone ? H * 0.36 : H * 0.17, mr = 9 * U;
          g.globalAlpha = W.duskK; g.globalCompositeOperation = 'lighter'; g.drawImage(K.glowSprite('rgba(255,244,220,0.5)'), mx - mr * 5, my - mr * 5, mr * 10, mr * 10); g.globalCompositeOperation = 'source-over';
          g.fillStyle = '#fff6e0'; g.beginPath(); g.arc(mx, my, mr, -Math.PI * 0.62, Math.PI * 0.62, true); g.arc(mx + mr * 0.42, my, mr * 0.86, Math.PI * 0.68, -Math.PI * 0.68, false); g.closePath(); g.fill();
          g.globalAlpha = 1;
        }
        // touches (and the send-off) leave rings that spread across the lake
        W.lakeRipples = W.lakeRipples.filter(r => W.t - r.t < (r.big ? 3.4 : 2.2));
        g.strokeStyle = 'rgba(255,240,220,0.5)';
        for (const r of W.lakeRipples) {
          const life = r.big ? 3.4 : 2.2, a = W.t - r.t, rad = (r.big ? 34 : 60) * U * (0.4 + r.k);
          for (let q = 0; q < (r.big ? 3 : 1); q++) { const aa = a - q * 0.35; if (aa <= 0) continue; g.globalAlpha = Math.max(0, 1 - aa / life) * (r.big ? 0.55 : 0.6); g.lineWidth = 1.2 * U; g.beginPath(); g.ellipse(r.x, r.y, aa * rad, aa * rad * 0.23, 0, 0, TAU); g.stroke(); }
        }
        g.globalAlpha = 1;
        // the boats with their little lights, mirrored on the water
        if (L0) {
          const order = L0.boats.slice().sort((a, b) => a.y - b.y);
          for (const b of order) {
            const k = b.k || 0.5, bw = G.boatW * k * 0.95, bob = Math.sin(W.t * 1.6 + b.ph) * 1.2 * k * U, fade = W.lakeStep === 'away' ? clamp((k - 0.06) / 0.14, 0, 1) : 1;
            const lightA = b.light * (W.lakeStep === 'away' ? clamp((k - 0.022) / 0.05, 0, 1) : 1);
            if (fade <= 0 && lightA <= 0.01) continue;
            g.save(); g.translate(b.x, b.y + bw * 0.02); g.scale(1, -0.4); drawBoatSpr(g, b.spr, 0, 0, bw, 0, Math.cos(b.yaw), 0.25 * fade); g.restore();
            if (lightA > 0) { // the light's long reflection on the water
              const fl = 0.85 + 0.15 * Math.sin(W.t * 17 + b.ph * 3) * Math.sin(W.t * 7.3 + b.ph), gs = (3 + 44 * k) * U * fl;
              g.globalCompositeOperation = 'lighter'; g.globalAlpha = lightA * 0.55 * fl; g.drawImage(K.glowSprite('rgba(255,190,100,0.9)'), b.x - gs * 0.7, b.y + bw * 0.05 - gs * 0.2, gs * 1.4, gs * 2.8);
              g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
            }
            if (fade > 0) drawBoatSpr(g, b.spr, b.x, b.y + bob, bw, Math.sin(W.t * 1.3 + b.ph) * 0.05, Math.cos(b.yaw), fade);
            if (lightA > 0) {
              const fl = 0.85 + 0.15 * Math.sin(W.t * 17 + b.ph * 3), ly = b.y - bw * 0.42 + bob, gs = (3 + 30 * k) * U * fl;
              g.globalCompositeOperation = 'lighter'; g.globalAlpha = lightA * fl; g.drawImage(K.glowSprite('rgba(255,214,140,0.95)'), b.x - gs, ly - gs, gs * 2, gs * 2);
              g.fillStyle = '#fff4d0'; g.beginPath(); g.arc(b.x, ly, Math.max(1, 2.2 * k * U + 0.6), 0, TAU); g.fill();
              g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
            }
          }
        }
      }

      /* ---------------- frame loop (real time, so a busy device still flows at the right speed) ---------------- */
      let lastT = 0, FDT = 1 / 60, qAcc = 0, qN = 0, qLvl = 1;
      K.loop((dtIn, tNow) => {
        const g = cv.g; if (!g || !G.w || !BGB) return;
        const raw = lastT ? tNow - lastT : dtIn; lastT = tNow;
        const rdt = clamp(raw, 0, 0.25); FDT = rdt;
        if (raw < 0.5) { qAcc += raw; qN++; if (qN >= 120) { if (qAcc / qN > 0.03 && qLvl > 0.7) { qLvl = qLvl > 0.9 ? 0.8 : 0.7; cv.setQuality(qLvl); } qAcc = 0; qN = 0; } }
        for (let rem = rdt; rem > 1e-4; rem -= 1 / 60) {
          const dt = Math.min(rem, 1 / 60);
          W.t += dt;
          if (W.phase === 'play' || W.phase === 'intro' || W.phase === 'tolake') { stepFold(dt); stepHat(dt); stepBoats(dt); stepFlowBits(dt); }
          if (W.phase === 'lake' || W.phase === 'tolake' || W.phase === 'end') stepLake(dt);
          F.z += (F.zT - F.z) * Math.min(1, dt * 6); F.vc += (F.vcT - F.vc) * Math.min(1, dt * 6); F.settle = Math.max(0, F.settle - dt * 7);
          if (F.ox) { const k = clamp((performance.now() - F.arriveT) / 520, 0, 1); F.ox = (W.idx % 2 ? 1 : -1) * G.w * 0.7 * Math.pow(1 - k, 3); if (k >= 1) { F.ox = 0; if (!F.ready && F.st === 1) sheetReady(); } }
          else if (F.st === 1 && !F.ready && F.item) sheetReady();
          if (F.carry) { const c = F.carry; const e = Math.min(1, dt * 22), px = c.x, py = c.y; c.x += (c.gx - c.x) * e; c.y += (c.gy - c.y) * e; c.vx = (c.x - px) / dt; c.vy = (c.y - py) / dt; }
          RP.acc += dt; let n = 0; while (RP.acc >= 1 / 50 && n < 4) { RP.acc -= 1 / 50; n++; if (RP.energy >= 0.002) rippleStep(); } if (n >= 4) RP.acc = 0;
        }
        if (F.wordsOn) placeWords();
        P.update(FDT);
        const D = K.dark(), C = pal();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        if (W.phase !== 'lake' && W.phase !== 'end') {
          drawStream(g, D, C);
          drawRocksAndBoats(g, D, C);
          drawCameo(g, D);
          g.drawImage(BGF.c, 0, 0, G.w, G.h);
          drawSheet(g);
          P.draw(g);
        }
        if (W.phase === 'tolake' || W.phase === 'lake' || W.phase === 'end') {
          if (W.phase === 'tolake') g.globalAlpha = W.lakeK;
          drawLake(g); g.globalAlpha = 1;
          if (W.phase !== 'tolake') P.draw(g);
        }
      });

      /* ---------------- the end ---------------- */
      function finish() {
        if (finished) return;
        finished = true; W.phase = 'end'; K.guide(null);
        const n = W.launched, best = Math.round(SC.best * 100), avg = SC.gentle.length ? SC.gentle.reduce((a, b) => a + b, 0) / SC.gentle.length : 0.7;
        const handsOff = W.touchedStuck === 0;
        const score = clamp(avg * 0.75 + (handsOff ? 0.25 : 0.1), 0, 1), tier = K.tier(score), tierIdx = ({ Bronze: 1, Silver: 2, Gold: 3 })[tier] || 0;
        const badges = [];
        const pb = K.best('gentle', best, 'higher');
        if (pb.isNew) badges.push('New best: ' + best + '% gentle set-down'); else if (pb.first) badges.push('Gentlest set-down: ' + best + '%');
        if (tierIdx > design) { S.store.set('let-it-float:design', tierIdx); badges.push('Unlocked: ' + DESIGNS[tierIdx] + ' boats'); } else if (tier) badges.push(tier + ' boatwright');
        let newPaper = 0; SC.papers.forEach(id => { if (K.collect('Paper: ' + PAPERS[id].name).isNew) newPaper++; });
        const box = K.collection().filter(x => /^Paper: /.test(x)).length;
        badges.push('Paper box: ' + box + ' of ' + PAPER_COUNT + (newPaper ? ' (' + newPaper + ' new)' : ''));
        if (handsOff && !SC.stuckSelf) badges.push('Hands off: freed by ripples alone');
        ctx.track('done', { n, gentle: best, tier: tierIdx, touched: W.touchedStuck, self: SC.stuckSelf ? 1 : 0, splashy: SC.splashy });
        const lines = [n + ' thoughts folded and set afloat', 'Gentlest set-down: ' + best + '%', SC.stuckSelf ? 'The sticky one floated on in its own time' : 'The sticky one floated on with a few ripples'];
        if (care()) lines[2] = 'For the heavy stuff, talking to someone can help too';
        ctx.finish({ title: 'Every boat afloat', mood: 'calm', lines, share: 'Folded ' + n + ' paper boats and let them float.', badges });
      }

      /* ---------------- start ---------------- */
      S.on('theme', () => { if (G.w) { SPRITES = new Map(); paintAll(); if (W.lake) W.lake.boats.forEach((lb, i) => { lb.spr = boatSprite(boats[i] ? boats[i].it.paper : 'rice'); }); boats.forEach(b => { b.spr = boatSprite(b.it.paper); }); } });
      W.lakeRipples = [];
      cv.onResize(() => layout());
      W.cameo = visits >= 1 ? ['duck', 'frog', 'heron'][(visits - 1) % 3] : null;
      try { document.fonts && document.fonts.load('600 17px "Klee One"').then(() => { if (F.item && !finished) { F.tex = paintPaper(F.item); words.lastChild.textContent = F.tex.lines.join('\n'); } }).catch(() => {}); } catch (e) { /* no font loading API */ }
      ctx.analysisReady.then(a => {
        if (!a || typeof a !== 'object' || a === an || W.launched > 0 || finished || (F.st === 1 && (F.drag || F.th > 0.01)) || F.st > 1) return;
        an = a; ITEMS = buildItems();
        if (F.item) { F.item = ITEMS[W.idx]; F.tex = paintPaper(F.item); words.firstChild.textContent = F.tex.head ? F.tex.head.toUpperCase() : ''; words.firstChild.hidden = !F.tex.head; words.lastChild.textContent = F.tex.lines.join('\n'); }
      }).catch(() => {});
      const DEV = !!(S.isDev && S.isDev());
      if (DEV) window.__letItFloat = { W, F, G, boats, SC, ITEMS: () => ITEMS, RP, splash, onWater };
      (async () => {
        await K.intro({ title: 'Let It Float', sub: 'Each thought gets its own paper boat. Fold it, set it on the stream, and let the water do the carrying.', how: 'Three folds make a boat. Set it down gently, then let it go.', char: 'drop', mood: 'calm' });
        W.phase = 'play';
        talk('drop', L.start, 4200, 'happy');
        newSheet();
        if (W.cameo === 'duck') S.later(() => { W.duckT = W.t; if (!care()) talk('drop', L.duck, 2600, 'wow', 2000); }, 16000);
        if (W.cameo === 'heron') S.later(() => { if (!care() && W.phase === 'play') talk('still', L.heron, 2800, 'calm'); }, 12000);
        if (W.cameo === 'frog') S.later(() => { if (!care() && W.phase === 'play' && !W.stuck) talk('drop', L.frog, 2600, 'happy'); }, 9000);
      })();

      return {
        async autoplay() {
          const intro = el.querySelector('.gk-intro'); if (intro) await K.sim.tap(intro);
          while (W.phase === 'intro') await K.wait(100);
          const t0 = performance.now();
          const waitFor = async (fn, ms) => { const t1 = performance.now(); while (!fn() && performance.now() - t1 < (ms || 8000)) await K.wait(80); };
          while (W.phase === 'play' && performance.now() - t0 < 140000) {
            if (W.stuck) { const q = nudgePoint(); await K.sim.tap(pad, q.x, q.y); await K.wait(650); continue; }
            if (F.ready && F.st === 1 && !F.drag) { const a = sheetPt(0.5, 0.05), b = sheetPt(0.5, R2 - 0.02); await K.sim.drag(pad, a, b, 640, 14); await waitFor(() => F.st !== 1 || (!F.closing && F.th < 0.05), 3000); continue; }
            if (F.ready && F.st === 2 && !F.drag) { const a = sheetPt(0.97, H2 + 0.03), b = sheetPt(0.52, YB + 0.02); await K.sim.drag(pad, a, b, 560, 12); await waitFor(() => F.st !== 2 || (!F.closing && F.th < 0.05), 3000); continue; }
            if (F.ready && F.st === 3 && !F.drag) { const a = sheetPt(0.5, R2 - 0.03), b = sheetPt(0.5, 0.82); await K.sim.drag(pad, a, b, 520, 12); await waitFor(() => F.st !== 3 || (!F.closing && F.th < 0.05), 3000); continue; }
            if (F.st === 6 && F.ready && !F.carry) {
              const s = boatOnStone(), lp = launchPoint(), pr = await K.sim.press(pad, s.x, s.y - 8);
              for (let i = 1; i <= 24; i++) { pr.move(lerp(s.x, lp.x, sm(i / 24)), lerp(s.y - 8, lp.y, sm(i / 24))); await K.wait(45); }
              await K.wait(260); pr.up(lp.x, lp.y); await K.wait(400); continue;
            }
            await K.wait(120);
          }
          await waitFor(() => W.phase === 'lake' && W.lakeStep === 'send', 30000);
          if (W.lakeStep === 'send') { const y = Math.min(G.h - 90, lakeY0() + (G.h - lakeY0()) * 0.66); await K.sim.drag(pad, { x: G.w * 0.3, y }, { x: G.w * 0.7, y }, 600, 12); }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
