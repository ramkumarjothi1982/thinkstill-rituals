/* 035 Kintsugi — Reset · CLARIFY · Values / Meaning / Grief
 * Mechanism: self-compassion and meaning-making (Neff 2003; growth after adversity, Tedeschi & Calhoun 2004): meeting the
 * hard parts of your story with care instead of shame lets them become part of a stronger whole. The player mends a broken
 * tea bowl the kintsugi way. Each crack holds one hard thing and is traced slowly with liquid gold: slow, steady attention
 * that neither rushes nor looks away. As the gold cools, a quiet kind line is written beside it.
 * Verb: mend (drag the shards into place, trace each crack slowly with gold, hold to pour). Twist: one tiny piece is missing;
 * instead of hiding the gap, the player fills it with a gold patch shaped like something that matters to them.
 * Finale: the mended bowl lifts onto a lacquer stand and turns slowly in warm light, its seams flaring as they pass the
 * light. It joins a shelf of mended bowls that grows across visits; the glaze changes every day.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const ID = 'kintsugi';
  const KEY = ID + ':shelf';
  const PHI = 0.4, SPH = Math.sin(PHI), CPH = Math.cos(PHI);   // the camera looks down at the bowl by PHI
  const HB = 0.78;                                              // body height / rim radius
  const rUnit = (v) => 0.47 + 0.53 * (1 - Math.pow(1 - v, 2.1)); // the bowl's profile: radius at height v (0 foot, 1 rim)

  /* Today's glaze (the same all day, a different one tomorrow; they fill a collection over visits). */
  const GLAZES = [
    { name: 'Celadon', hi: '#d9e7d4', base: '#9fbea6', lo: '#4e6c58', inner: '#8db39a', innerLo: '#2a3f33', clay: '#cda57c', clayLo: '#86603d', speck: 'rgba(48,66,50,0.42)' },
    { name: 'Ash white', hi: '#f6f1e8', base: '#ddd2c1', lo: '#8f826f', inner: '#d3c8b5', innerLo: '#625747', clay: '#d49b69', clayLo: '#8e5a35', speck: 'rgba(150,78,36,0.45)' },
    { name: 'Tenmoku', hi: '#7a563d', base: '#3c251a', lo: '#140b07', inner: '#4a2c1c', innerLo: '#0e0805', clay: '#bf8f60', clayLo: '#76502f', speck: 'rgba(214,132,64,0.5)' },
    { name: 'Ruri indigo', hi: '#7f97d2', base: '#364d86', lo: '#131c38', inner: '#33497e', innerLo: '#0c1226', clay: '#caa27b', clayLo: '#82603d', speck: 'rgba(196,214,255,0.32)' },
    { name: 'Persimmon', hi: '#ebaa78', base: '#b8613a', lo: '#5b250e', inner: '#a4532d', innerLo: '#3a160a', clay: '#dab78f', clayLo: '#8f6c48', speck: 'rgba(60,20,8,0.42)' },
    { name: 'Oribe green', hi: '#a9d2a8', base: '#4d8a62', lo: '#1c3f2b', inner: '#e1d4b8', innerLo: '#7f7259', clay: '#d1a87d', clayLo: '#88603c', speck: 'rgba(18,48,28,0.42)' },
    { name: 'Plum ash', hi: '#efd2d4', base: '#c59ba2', lo: '#6a4650', inner: '#bc939a', innerLo: '#4a2f35', clay: '#d8b088', clayLo: '#91704c', speck: 'rgba(96,40,52,0.38)' }
  ];
  /* Gentle examples for when a crack can't be the player's own words (no words, or padding). Shown as "a crack might hold…". */
  const HARD = ['a rough week', 'something I lost', 'a hard goodbye', 'a mistake I made', 'a day that hurt', 'feeling not enough', 'words I wish I hadn’t said', 'a plan that fell apart'];
  const GENERIC = new Set(['THAT THING I SAID', "TOMORROW'S LIST", 'WHAT IF IT GOES WRONG', "SHOULD'VE DONE BETTER", 'WHAT THEY THINK', 'EVERYTHING AT ONCE', 'THE BIG WORRY']);
  const POS = /\b(BEST|LOVE[DS]?|LOVELY|LAUGH\w*|HAPP\w*|PROUD|GRATEFUL|THANKFUL|FUN|GREAT|AMAZING|AWESOME|NICE|ENJOY\w*|BEAUTIFUL|GOOD|WIN|WON|NAILED|CELEBRAT\w*|EXCITED|BUZZING|SMIL\w*|SUNNY|FINALLY|DELICIOUS|PEACEFUL|JOY\w*|THRILLED|STOKED|WONDERFUL|PROMOTED|ENGAGED|PASSED MY)\b/;
  const NEG = /\b(WORR\w*|ANX\w*|SCARED|AFRAID|SAD|HATE\w*|STRESS\w*|FAIL\w*|USELESS|TIGHT|PANIC\w*|CRY\w*|ANGRY|MISS(ED|ING)?|LOST|GRIEF|GRIEV\w*|PASSED AWAY|ARGU\w*|HURT\w*|PAIN\w*|SICK|TIRED|CAN'?T|NEVER|NOT|ALONE|LONELY|BAD|AWFUL|WORST|WRONG|SHOULD\w*|WHAT IF|GUILT\w*|SHAME\w*|DIED|DEATH|FUNERAL)\b/;
  const SCALE = ['D4', 'E4', 'G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6', 'E6'];
  const BARS = [['D2', ['A3', 'D4', 'E4', 'A4']], ['B1', ['F#3', 'B3', 'D4', 'E4']], ['G1', ['B3', 'D4', 'G4', 'A4']], ['A1', ['A3', 'C#4', 'E4', 'B4']]];
  const GOLD = { cool: '#d6a432', hot: '#fff5d4', shade: 'rgba(48,24,4,0.45)', hi: 'rgba(255,247,214,0.78)' };

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const wrapA = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  const mixHex = (a, b, k) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), m = (s) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k));
    return '#' + ((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1);
  };
  function xr(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* ---------------- the bowl: a surface of revolution, so the finale can really turn it ---------------- */
  function makeBowl(cx, Y0, R) {
    const B = { cx, Y0, R, Hb: R * HB, fh: R * 0.1, fr: R * 0.38 };
    B.rad = (v) => R * rUnit(v);
    // a point on the outer wall at surface angle th (0 faces the camera), height v, bowl turned by al, lifted by dy
    B.pt = (th, v, al, dy) => { const t = th + (al || 0), r = R * rUnit(v); return { x: cx + r * Math.sin(t), y: Y0 + (dy || 0) - v * B.Hb * CPH + r * Math.cos(t) * SPH, c: Math.cos(t), t }; };
    B.rimY = Y0 - B.Hb * CPH; B.top = B.rimY - R * SPH; B.footY = Y0 + B.fh * CPH + B.fr * SPH;
    return B;
  }
  function bodyPath(B, dy) {
    const p = new Path2D(), N = 26, hp = Math.PI / 2;
    for (let i = 0; i <= N; i++) { const q = B.pt(-hp, 1 - i / N, 0, dy); if (i) p.lineTo(q.x, q.y); else p.moveTo(q.x, q.y); }
    for (let i = 1; i <= N; i++) { const q = B.pt(-hp + Math.PI * i / N, 0, 0, dy); p.lineTo(q.x, q.y); }
    for (let i = 1; i <= N; i++) { const q = B.pt(hp, i / N, 0, dy); p.lineTo(q.x, q.y); }
    for (let i = 1; i < N; i++) { const q = B.pt(hp - Math.PI * i / N, 1, 0, dy); p.lineTo(q.x, q.y); }
    p.closePath();
    return p;
  }
  /* Crack shapes live in surface coordinates (angle, height) and are generated in a scale-free unit space (rim radius 1). */
  const toU = (q) => [q[0] * rUnit(q[1]), -q[1] * HB * CPH];
  const fromU = (q) => { const v = Math.max(0, Math.min(1, -q[1] / (HB * CPH))); return [Math.max(-1.45, Math.min(1.45, q[0] / rUnit(v))), v]; };
  function jag(A, Bq, R, amp) {
    let pts = [toU(A), toU(Bq)], a = amp;
    for (let lev = 0; lev < 5; lev++) {
      const out = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1e-6, k = (R() - 0.5) * a * L;
        out.push([(p[0] + q[0]) / 2 - dy / L * k, (p[1] + q[1]) / 2 + dx / L * k], q);
      }
      pts = out; a *= lev < 2 ? 0.62 : 0.8;
    }
    const res = pts.map(fromU); res[0] = A.slice(); res[res.length - 1] = Bq.slice();
    return res;
  }
  const nearV = (C, v) => { let bi = 2, bd = 9; for (let i = 2; i < C.length - 2; i++) { const d = Math.abs(C[i][1] - v); if (d < bd) { bd = d; bi = i; } } return bi; };
  /* One bowl's break: C1 and C2 run rim to foot, C3 crosses between them, C4 drops from the rim to C3, and the tiny
     chip where C3 and C4 meet was never found. Three shards: top-left, top-right, bottom. */
  function network(seed) {
    const R = xr(seed * 7919 + 101), j = (a, b) => a + (b - a) * R();
    const a1 = j(-0.98, -0.78), b1 = j(-0.62, -0.42), a2 = j(0.7, 0.9), b2 = j(0.36, 0.56), a4 = j(-0.2, 0.14);
    const C1 = jag([a1, 1], [b1, 0], R, 0.34), C2 = jag([a2, 1], [b2, 0], R, 0.34);
    const k1 = nearV(C1, j(0.56, 0.66)), k2 = nearV(C2, j(0.54, 0.64));
    const C3 = jag(C1[k1], C2[k2], R, 0.22);
    const k3 = Math.round((C3.length - 1) * j(0.44, 0.56));
    const C4 = jag([a4, 1], C3[k3], R, 0.3);
    const ju = toU(C3[k3]), chip = [];
    for (let i = 0; i < 7; i++) { const ang = i / 7 * TAU + R() * 0.5, rr = 0.082 * (0.8 + R() * 0.38); chip.push(fromU([ju[0] + Math.cos(ang) * rr, ju[1] + Math.sin(ang) * rr * 0.86])); }
    const poolsOf = (C, ends) => C.map((q, i) => {
      let p = R() < 0.16 ? 0.3 + R() * 0.4 : R() * 0.14;
      if (i > 0 && i < C.length - 1) { const a = toU(C[i - 1]), b = toU(q), c = toU(C[i + 1]), t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c[1] - b[1], c[0] - b[0]); if (Math.abs(wrapA(t2 - t1)) > 0.75) p += 0.35; }
      if (ends.includes(i)) p = 1.05;
      return p;
    });
    const ve = { s1: R() * TAU, s2: R() * TAU, drips: [0, 1, 2, 3].map(() => ({ th: j(-Math.PI, Math.PI), a: j(0.04, 0.09) })) };
    const spk = []; for (let i = 0; i < 70; i++) spk.push({ th: j(-Math.PI, Math.PI), v: j(0.26, 0.97), r: j(0.006, 0.016), a: j(0.4, 1) });
    return {
      C1, C2, C3, C4, k1, k2, k3, a1, a2, b1, b2, a4, j: C3[k3], chip, ve, spk,
      pools: { C1: poolsOf(C1, [k1]), C2: poolsOf(C2, [k2]), C3: poolsOf(C3, [0, k3, C3.length - 1]), C4: poolsOf(C4, [C4.length - 1]) }
    };
  }
  const glazeEdge = (N, th) => { let v = 0.2 + 0.028 * Math.sin(3 * th + N.ve.s1) + 0.016 * Math.sin(7 * th + N.ve.s2); for (const d of N.ve.drips) { const x = wrapA(th - d.th) / 0.06; v -= d.a * Math.exp(-x * x); } return v; };

  /* What matters: twelve values, each a solid gold shape big enough to cover the missing chip. Units: [-1, 1], y down. */
  let MOT = null;
  function motifs() {
    if (MOT) return MOT;
    const P = (d) => new Path2D(d), circ = (p, x, y, r) => { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); };
    const rr = (p, x, y, w, hh, r) => { p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + hh, r); p.arcTo(x + w, y + hh, x, y + hh, r); p.arcTo(x, y + hh, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); };
    const L = [];
    const add = (id, label, oy, path, eng) => L.push({ id, label, oy, path, eng });
    add('love', 'Love', 0, P('M0 0.92 C-0.22 0.72 -1 0.28 -1 -0.22 C-1 -0.68 -0.62 -0.94 -0.32 -0.94 C-0.12 -0.94 0 -0.78 0 -0.62 C0 -0.78 0.12 -0.94 0.32 -0.94 C0.62 -0.94 1 -0.68 1 -0.22 C1 0.28 0.22 0.72 0 0.92 Z'), P('M-0.64 -0.46 C-0.74 -0.24 -0.66 -0.04 -0.5 0.1'));
    { const p = P(); circ(p, 0, -0.46, 0.46); circ(p, -0.46, -0.12, 0.42); circ(p, 0.46, -0.12, 0.42); circ(p, -0.2, 0.14, 0.4); circ(p, 0.22, 0.14, 0.4); rr(p, -0.13, 0.3, 0.26, 0.68, 0.06); rr(p, -0.5, 0.88, 1.0, 0.1, 0.05);
      add('family', 'Family', -0.06, p, P('M0 0.86 L0 0.0 M0 0.32 L-0.3 0.06 M0 0.18 L0.32 -0.12 M-0.3 0.06 L-0.42 -0.16 M0.32 -0.12 L0.3 -0.36')); }
    { const p = P(); circ(p, -0.36, 0, 0.7); circ(p, 0.36, 0, 0.7); const e = P(); e.arc(-0.36, 0, 0.7, -1.03, 1.03); add('friends', 'Friends', 0, p, e); }
    { const p = P(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; circ(p, Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.45); } circ(p, 0, 0, 0.42);
      const e = P(); circ(e, 0, 0, 0.16); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i + 0.5) * TAU / 5; e.moveTo(Math.cos(a) * 0.2, Math.sin(a) * 0.2); e.lineTo(Math.cos(a) * 0.38, Math.sin(a) * 0.38); }
      add('kindness', 'Kindness', 0, p, e); }
    add('courage', 'Courage', 0.3, P('M0.05 -1 C0.3 -0.62 0.8 -0.3 0.8 0.24 C0.8 0.7 0.42 0.98 0 0.98 C-0.42 0.98 -0.8 0.7 -0.8 0.24 C-0.8 -0.12 -0.5 -0.36 -0.36 -0.62 C-0.2 -0.42 -0.12 -0.32 -0.04 -0.26 C0.04 -0.52 -0.05 -0.78 0.05 -1 Z'),
      P('M0 0.84 C-0.3 0.82 -0.44 0.58 -0.4 0.36 C-0.34 0.12 -0.12 0.02 0 -0.16 C0.12 0.06 0.42 0.22 0.38 0.5 C0.34 0.72 0.18 0.84 0 0.84 Z'));
    { const p = P(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.66 : 1.06; if (i) p.lineTo(Math.cos(a) * r, Math.sin(a) * r + 0.06); else p.moveTo(Math.cos(a) * r, Math.sin(a) * r + 0.06); } p.closePath();
      const e = P(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; e.moveTo(Math.cos(a) * 0.14, Math.sin(a) * 0.14 + 0.06); e.lineTo(Math.cos(a) * 0.74, Math.sin(a) * 0.74 + 0.06); }
      add('hope', 'Hope', 0.06, p, e); }
    { const p = P(); circ(p, -0.5, 0.12, 0.44); circ(p, -0.04, -0.2, 0.58); circ(p, 0.5, 0.08, 0.46); rr(p, -0.94, 0.04, 1.88, 0.6, 0.28); add('rest', 'Rest', 0.12, p, P('M-0.58 0.4 C-0.3 0.52 0.3 0.52 0.62 0.38')); }
    add('growth', 'Growth', 0, P('M-0.08 1 C-0.12 0.72 -0.84 0.5 -0.82 -0.05 C-0.8 -0.6 -0.25 -0.94 0.44 -1.02 C0.64 -0.52 0.92 -0.12 0.72 0.36 C0.56 0.72 0.18 0.8 -0.08 1 Z'),
      P('M-0.06 0.96 C0 0.4 0.12 -0.2 0.38 -0.86 M0.02 0.42 L-0.42 0.12 M0.08 0.1 L-0.48 -0.28 M0.06 0.3 L0.5 0.06 M0.16 -0.1 L0.52 -0.36'));
    { const e = P(); e.rect(-0.2, 0.36, 0.4, 0.56); e.rect(0.3, 0.02, 0.24, 0.22); add('home', 'Home', 0, P('M0 -0.98 L0.98 -0.08 L0.76 -0.08 L0.76 0.92 L-0.76 0.92 L-0.76 -0.08 L-0.98 -0.08 Z'), e); }
    { const p = P(); circ(p, 0, 0, 0.64); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; p.moveTo(Math.cos(a - 0.13) * 0.7, Math.sin(a - 0.13) * 0.7); p.lineTo(Math.cos(a) * 1.04, Math.sin(a) * 1.04); p.lineTo(Math.cos(a + 0.13) * 0.7, Math.sin(a + 0.13) * 0.7); p.closePath(); }
      const e = P(); e.arc(0, 0, 0.42, 0, TAU); add('joy', 'Joy', 0, p, e); }
    { const p = P(); rr(p, -0.62, -0.62, 1.24, 1.32, 0.44); rr(p, -0.34, -0.88, 0.68, 0.3, 0.06); rr(p, -0.34, 0.66, 0.68, 0.28, 0.06); add('faith', 'Faith', 0.04, p, P('M-0.6 -0.3 L0.6 -0.3 M-0.62 0.04 L0.62 0.04 M-0.6 0.38 L0.6 0.38')); }
    add('peace', 'Peace', 0.1, P('M-1 0.64 C-1 -0.02 -0.55 -0.52 0 -0.52 C0.55 -0.52 1 -0.02 1 0.64 Z'), P('M-0.7 0.64 C-0.7 0.16 -0.38 -0.22 0 -0.22 C0.38 -0.22 0.7 0.16 0.7 0.64 M-0.4 0.64 C-0.4 0.34 -0.22 0.08 0 0.08 C0.22 0.08 0.4 0.34 0.4 0.64'));
    return (MOT = L);
  }

  (env.games = env.games || []).push({
    id: ID, mode: 'reset', name: 'Kintsugi', verb: 'mend', family: 'CLARIFY', minutes: 2,
    parents: ['Values / Meaning / Grief', 'Identity / Self', 'Emotion'],
    cast: ['drop', 'still'], poster: { char: 'drop', mood: 'calm' },
    tagline: 'Mend a broken bowl with gold. The cracks become the best part.',
    why: 'For something that hurts or broke: care for the hard parts instead of hiding them.',
    fonts: ['Shippori+Mincho:wght@600;800', 'Zen+Maru+Gothic:wght@500;700', 'Klee+One:wght@600'],
    css: `
.g-kintsugi { --ks-disp: "Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", Georgia, "Times New Roman", serif; --ks-ui: "Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Quicksand", "Nunito", system-ui, sans-serif;
  --ks-hand: "Klee One", "Shippori Mincho", "Segoe Print", Georgia, serif; --ks-gold: #f0c96a; --ks-panel: rgba(26, 19, 15, 0.96); --ks-panel2: rgba(40, 29, 22, 0.97); --ks-ink: #f6eddc; --ks-muted: #d9c9ae;
  --ks-line: rgba(240, 201, 106, 0.34); --ks-chip: rgba(255, 244, 220, 0.06); --ks-chipon: rgba(240, 201, 106, 0.2); background: #15100e; }
.g-kintsugi.ks-bright { --ks-panel: rgba(251, 247, 239, 0.97); --ks-panel2: rgba(245, 237, 224, 0.98); --ks-ink: #2c2119; --ks-muted: #6d5a45; --ks-line: rgba(150, 104, 24, 0.36); --ks-chip: rgba(255, 255, 255, 0.9); --ks-chipon: rgba(214, 164, 50, 0.24); background: #e9dfcf; }
.g-kintsugi .gk-intro { background: radial-gradient(ellipse 72% 58% at 50% 46%, rgba(46, 31, 22, 0.86), rgba(20, 14, 11, 0.93) 64%, rgba(8, 6, 5, 0.96)); -webkit-backdrop-filter: none; backdrop-filter: none; color: #f6eddc; }
.g-kintsugi .gk-intro-title { font-family: var(--ks-disp); font-weight: 800; font-size: clamp(46px, 13cqw, 82px); letter-spacing: 0.06em; color: #f2cf78; text-shadow: 0 2px 0 #6e4a10, 0 12px 34px rgba(0, 0, 0, 0.55); }
.g-kintsugi .gk-intro-title::after { content: ""; display: block; width: 78%; height: 14px; margin: 12px auto 0;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 14' preserveAspectRatio='none'%3E%3Cpath d='M2 8 L24 6 L33 10 L58 5 L71 9 L92 4 L104 8 L131 6 L140 11 L163 5 L176 8 L198 7' fill='none' stroke='%23e9bd55' stroke-width='2.6' stroke-linejoin='round' stroke-linecap='round'/%3E%3Ccircle cx='104' cy='8' r='3' fill='%23f6d985'/%3E%3C/svg%3E") center / 100% 100% no-repeat; }
.g-kintsugi .gk-intro-sub { font-family: var(--ks-ui); font-weight: 500; color: #f1e6d2; }
.g-kintsugi .gk-intro-how { font-family: var(--ks-ui); font-weight: 700; color: #f0c96a; }
.g-kintsugi .gk-intro-tap { color: #e6d6bd; }
.g-kintsugi .ks-hit { position: absolute; inset: 0; z-index: 20; touch-action: none; outline: none; -webkit-tap-highlight-color: transparent; cursor: pointer; }
.g-kintsugi .ks-hit:focus-visible { outline: 3px solid var(--ks-gold); outline-offset: -6px; }
.g-kintsugi .ks-label, .g-kintsugi .ks-kind { position: absolute; z-index: 24; left: 0; top: 0; width: max-content; max-width: min(360px, calc(100% - 28px)); text-align: center; pointer-events: none; transform: translate(-50%, 0); }
.g-kintsugi .ks-label { transition: opacity 0.6s ease, transform 0.6s ease; }
.g-kintsugi .ks-label.ks-off { opacity: 0; transform: translate(-50%, 8px); }
.g-kintsugi .ks-label small { display: block; font: 700 12px/1.2 var(--ks-ui); letter-spacing: 0.16em; text-transform: uppercase; color: #f0c96a; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6); }
.g-kintsugi .ks-label .ks-lt { display: block; margin-top: 5px; font: 700 17px/1.22 var(--ks-ui); color: #fbf3e4; letter-spacing: 0.03em; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6); text-wrap: balance; }
.g-kintsugi .ks-label .ks-lt.gk-user { font-size: 17px; }
.g-kintsugi .ks-label .ks-lt.ks-ex { font: 600 19px/1.2 var(--ks-hand); letter-spacing: 0.01em; }
.g-kintsugi .ks-kind { font: 600 22px/1.28 var(--ks-hand); color: #f6d684; text-shadow: 0 2px 12px rgba(0, 0, 0, 0.65), 0 0 22px rgba(240, 190, 90, 0.28); transition: opacity 0.9s ease; text-wrap: balance; }
.g-kintsugi .ks-kind.ks-off { opacity: 0; }
.g-kintsugi .ks-kind.ks-in { animation: kintsugi-write 1.3s cubic-bezier(.3, .1, .3, 1) both; }
@keyframes kintsugi-write { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
.g-kintsugi .ks-more { position: absolute; z-index: 22; right: 16px; top: 0; padding: 4px 9px; border-radius: 999px; font: 700 12px/1.2 var(--ks-ui); letter-spacing: 0.06em; color: #f6eddc; background: rgba(20, 14, 10, 0.62); border: 1px solid rgba(240, 201, 106, 0.4); pointer-events: none; }
.g-kintsugi .ks-more[hidden] { display: none; }
.g-kintsugi .ks-panel { position: absolute; z-index: 34; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); width: min(620px, calc(100% - 20px)); box-sizing: border-box; transform: translateX(-50%); padding: 13px 12px 14px;
  border-radius: 22px; background: linear-gradient(180deg, var(--ks-panel2), var(--ks-panel)); border: 1px solid var(--ks-line); color: var(--ks-ink); font-family: var(--ks-ui);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 236, 190, 0.12); display: flex; flex-direction: column; gap: 10px; transition: transform 0.55s cubic-bezier(.3, 1.15, .5, 1), opacity 0.35s ease; }
.g-kintsugi .ks-panel.ks-away { transform: translate(-50%, calc(100% + 40px)); opacity: 0; pointer-events: none; }
.g-kintsugi .ks-q { margin: 0; text-align: center; }
.g-kintsugi .ks-q b { display: block; font: 800 20px/1.2 var(--ks-disp); letter-spacing: 0.02em; color: var(--ks-ink); }
.g-kintsugi .ks-q span { display: block; margin-top: 3px; font: 500 14px/1.3 var(--ks-ui); color: var(--ks-muted); }
.g-kintsugi .ks-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; }
.g-kintsugi .ks-chip { appearance: none; cursor: pointer; min-height: 44px; padding: 7px 13px 7px 8px; border-radius: 999px; display: inline-flex; align-items: center; gap: 7px; font: 700 15px/1.1 var(--ks-ui); color: var(--ks-ink);
  background: var(--ks-chip); border: 1.5px solid var(--ks-line); transition: transform 0.15s ease, background 0.2s ease; }
.g-kintsugi .ks-chip canvas { width: 24px; height: 24px; flex: none; }
.g-kintsugi .ks-chip:active { transform: scale(0.95); }
.g-kintsugi .ks-chip.ks-on { background: var(--ks-chipon); transform: scale(1.05); border-color: #e2b24a; }
.g-kintsugi .ks-chip:focus-visible { outline: 3px solid var(--ks-gold); outline-offset: 2px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = [0, 1, 2].includes(ctx.intensity) ? ctx.intensity : 1;
      const RED = K.reduced(), dayN = K.daily(), rnd = Math.random;
      const line = (o) => ctx.line(o);
      const vibe = () => (['Jolly', 'Cheeky', 'Unfiltered'].includes(S.settings && S.settings.vibe) ? S.settings.vibe : ctx.vibe) || 'Jolly';
      const dark = () => K.dark();
      const noWords = !String(ctx.text || '').trim();
      const care = () => an.safety === 'care';
      const grief = () => an.parent === 'Values / Meaning / Grief' || (Array.isArray(an.parents2) && an.parents2.includes('Values / Meaning / Grief')) || /\b(grief|griev\w*|passed away|died|funeral|lost (my|a|our)|miss (him|her|them|you))\b/i.test(ctx.text || '');
      const soft = () => care() || grief();
      const devQ = (k) => { try { return S.isDev() ? new URLSearchParams(location.search).get(k) : null; } catch (e) { return null; } };
      const qg = devQ('ksglaze'), GZI = qg != null && qg !== '' && GLAZES[Number(qg)] ? Number(qg) : K.dailyPick(GLAZES.map((_, i) => i), 9), GZ = GLAZES[GZI];
      const NAMED = [2, 3, 4][inten];
      const VMAX = [52, 62, 74][inten], TOL = [42, 34, 29][inten], LEAD = [64, 50, 40][inten], FILL_T = [2.4, 2.0, 1.8][inten];
      const SEED = 1000 + Math.floor(rnd() * 8999000);
      const NET = network(SEED), MOTS = motifs();

      /* ---------------- the shelf: every mended bowl is kept (glaze, crack seed, value shape; never words) ---------------- */
      const DATA = (() => {
        const d = S.store.get(KEY, null), ok = d && typeof d === 'object' && Array.isArray(d.bowls);
        const bowls = ok ? d.bowls.filter(b => b && GLAZES[b.g | 0] && MOTS[b.m | 0]).slice(-60).map(b => ({ g: b.g | 0, s: (Number(b.s) >>> 0) % 10000000, m: b.m | 0 })) : [];
        return { bowls, n: ok ? Math.max(bowls.length, d.n | 0) : 0 };
      })();
      const save = () => S.store.set(KEY, { v: 1, bowls: DATA.bowls.slice(-60), n: DATA.n });
      const OLD = DATA.bowls.slice();

      /* ---------------- the hard things: the player's own strands (heaviest last), or gentle examples ---------------- */
      function hardThings() {
        const own = [], seen = new Set(), up = (s) => String(s).replace(/[’‘]/g, "'").toUpperCase().trim();
        const ok = (s) => { if (!s || !s.label || s.generic || noWords) return false; const k = up(s.label); return k.replace(/[^A-Z]/g, '').length >= 3 && !GENERIC.has(k) && !(POS.test(k) && !NEG.test(k)); };
        const core = ok(an.core) ? String(an.core.label).trim() : '';
        if (core) seen.add(up(core));
        (an.strands || []).forEach(s => { if (ok(s) && !seen.has(up(s.label))) { seen.add(up(s.label)); own.push(String(s.label).trim()); } });
        const list = own.slice(0, core ? NAMED - 1 : NAMED).map(label => ({ label, own: true }));
        const ex = K.shuffle(HARD, K.rng(dayN * 3 + 7));
        let k = 0;
        while (list.length < (core ? NAMED - 1 : NAMED)) list.push({ label: ex[k++ % ex.length], own: false });
        if (core) list.push({ label: core, own: true, core: true });
        return list;
      }
      let HT = hardThings();
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && a.safety !== 'support' && (phase === 'intro' || phase === 'welcome' || phase === 'assemble')) { an = a; HT = hardThings(); named.forEach((c, i) => { c.hard = HT[i]; }); } }, () => {});

      /* ---------------- scene ---------------- */
      el.classList.toggle('ks-bright', !dark());
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.6 });
      const P = K.particles({ max: 320 });
      const hit = h('div', { class: 'ks-hit', tabindex: '0', role: 'application', 'aria-label': 'The workbench' });
      const labelEl = h('div', { class: 'ks-label ks-off', 'aria-live': 'polite' });
      const kindEl = h('div', { class: 'ks-kind ks-off', 'aria-live': 'polite' });
      const moreEl = h('div', { class: 'ks-more', hidden: true });
      const panel = h('div', { class: 'ks-panel ks-away', role: 'group', 'aria-label': 'What matters to you?' });
      el.append(hit, labelEl, kindEl, moreEl, panel);
      const charSize = () => (K.phone() ? 72 : 96);
      const drop = K.character('drop', { side: 'right', mood: 'sad', x: 12, y: 64, size: charSize() });
      const still = K.character('still', { side: 'right', mood: 'calm', x: 12, y: 64, size: charSize() });
      still.show(false);

      /* ---------------- sound: a quiet room, a rin bowl, slow plucked notes, and gold that hums as it flows ---------------- */
      const amb = K.ambience('room');
      amb.level(0.5, 2);
      const MUS = { on: false, next: 0, i: 0, vol: 0.85, R: xr(dayN + 5) };
      const musicOn = () => { if (A.ctx && !MUS.on) { MUS.on = true; MUS.next = A.now() + 0.3; } };
      S.on('audio-ready', () => { if (phase !== 'intro') musicOn(); });
      S.loop(() => {
        if (!MUS.on || !A.ctx) return;
        const spb = 60 / 54, ahead = A.now() + 0.45;
        while (MUS.next < ahead) {
          const t = MUS.next, i = MUS.i, bar = Math.floor(i / 4) % 4, b = i % 4, ch = BARS[bar], v = MUS.vol, R = MUS.R;
          if (b === 0) {
            A.tone({ when: t, type: 'sine', freq: A.note(ch[0]), dur: spb * 4.6, vol: 0.07 * v, attack: 1.4, lp: 360, bus: 'music' });
            ch[1].forEach((n, j) => A.tone({ when: t + j * 0.05, type: 'triangle', freq: A.note(n), dur: spb * 4.4, vol: 0.011 * v, attack: 1.6, lp: 900, verb: 0.6, bus: 'music' }));
          }
          if (R() < [0.62, 0.28, 0.46, 0.22][b]) A.pluck(A.note(ch[1][Math.floor(R() * 4)]) * (R() < 0.35 ? 2 : 1), { when: t + R() * 0.06, vol: 0.075 * v, damp: 0.9982, lp: 2300, verb: 0.55, bus: 'music' });
          MUS.i++; MUS.next += spb;
        }
      });
      let pourV = null, humV = null;
      S.onDestroy(() => { if (pourV) pourV.stop(); if (humV) humV.stop(); });
      const SND = {
        sync(name) { if (A.ctx) A.sync(name, performance.now()); },
        lift() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 2600, q: 2, dur: 0.07, vol: 0.05 }); A.tone({ type: 'triangle', freq: 460, to: 400, dur: 0.07, vol: 0.05 }); this.sync('lift'); },
        rustle(k) { if (A.ctx) A.noise({ filter: 'bandpass', freq: 1500 + rnd() * 900, q: 0.7, dur: 0.12, attack: 0.03, vol: 0.012 + 0.03 * k }); },
        near() { if (A.ctx) A.tone({ type: 'sine', freq: 1480, dur: 0.12, vol: 0.025 }); },
        snap(n) { if (!A.ctx) return; const f = [1760, 1976, 2349][n % 3]; A.tone({ type: 'sine', freq: f, dur: 0.42, vol: 0.06, verb: 0.35 }); A.tone({ type: 'sine', freq: f * 2.76, dur: 0.22, vol: 0.026 }); A.tone({ type: 'sine', freq: f * 5.4, dur: 0.1, vol: 0.012 });
          A.click({ vol: 0.09 }); A.tone({ type: 'sine', freq: 330, to: 250, glide: 0.06, dur: 0.1, vol: 0.09 }); this.sync('snap'); },
        set() { if (A.ctx) A.tone({ type: 'triangle', freq: 300, to: 240, glide: 0.08, dur: 0.12, vol: 0.06 }); },
        rin(note, vol, dur) { if (!A.ctx) return; const f = A.note(note); A.chime(f, { vol: vol || 0.11, dur: dur || 4.6, verb: 0.6 }); A.tone({ type: 'sine', freq: f, dur: (dur || 4.6) * 1.1, vol: (vol || 0.11) * 0.28, attack: 0.01, verb: 0.4 }); A.tone({ type: 'sine', freq: f * 1.0035, dur: (dur || 4.6) * 1.1, vol: (vol || 0.11) * 0.28, attack: 0.01 }); this.sync('rin'); },
        pourOn() {
          if (!A.ctx) return;
          if (!pourV) pourV = A.loop({ pink: true, filter: 'lowpass', freq: 420, q: 0.6 });
          if (!humV) humV = A.loop({ pink: true, filter: 'bandpass', freq: 147, q: 16 });
          A.noise({ filter: 'bandpass', freq: 900, q: 1.2, dur: 0.18, attack: 0.04, vol: 0.04 }); this.sync('pour');
        },
        pourLevel(k, prog) { if (pourV) { pourV.level(0.03 + 0.07 * k, 0.12); pourV.freq(380 + 260 * prog, 0.2); } if (humV) { humV.level(0.05 + 0.13 * k, 0.12); humV.freq(147 * Math.pow(2, prog * 7 / 12), 0.25); } },
        pourOff() { if (pourV) pourV.level(0.0001, 0.12); if (humV) humV.level(0.0001, 0.18); },
        step(i) { if (A.ctx) A.pluck(A.note(SCALE[Math.min(SCALE.length - 1, i)]), { vol: 0.05, damp: 0.998, lp: 3200, verb: 0.5 }); },
        cool() { if (!A.ctx) return; A.noise({ filter: 'highpass', freq: 3600, to: 1600, dur: 0.9, attack: 0.06, vol: 0.035 }); A.pad([A.note('D4'), A.note('A4'), A.note('E5'), A.note('F#5')], { dur: 3.2, vol: 0.075, attack: 0.5 }); this.sync('cool'); },
        kind() { if (A.ctx) A.chime(A.note('A5'), { vol: 0.03, dur: 1.8, verb: 0.6 }); },
        seep() { if (A.ctx) A.tone({ type: 'sine', freq: 520, to: 880, glide: 0.9, dur: 1.0, vol: 0.03, attack: 0.2, verb: 0.5 }); },
        miss() { if (A.ctx) A.tone({ type: 'sine', freq: 392, to: 330, glide: 0.12, dur: 0.18, vol: 0.04 }); },
        value() { if (!A.ctx) return; A.click({ vol: 0.07 }); A.pluck(A.note('A4'), { vol: 0.14, damp: 0.997, verb: 0.35 }); this.sync('value'); },
        fillOn() { if (!A.ctx) return; this.pourOn(); this.sync('fill'); },
        patched() { if (!A.ctx) return; this.rin('D5', 0.1, 5); K.sfx.sparkle(); A.pad([A.note('D3'), A.note('A3'), A.note('F#4'), A.note('E5')], { dur: 4, vol: 0.09, attack: 0.4 }); },
        glint(i) { if (A.ctx) A.chime(A.note(SCALE[7 + (i % 5)]), { vol: 0.03, dur: 1.4, verb: 0.6 }); },
        finale() { if (!A.ctx) return; A.pad([A.note('D3'), A.note('A3'), A.note('E4'), A.note('F#4'), A.note('A4')], { dur: 9, vol: 0.14, attack: 1.4 }); this.sync('finale'); },
        tapBowl() { if (A.ctx) A.chime(A.note(SCALE[5 + Math.floor(rnd() * 4)]), { vol: 0.035, dur: 1.6, verb: 0.5 }); this.sync('tap'); },
        tap() { if (A.ctx) A.noise({ filter: 'bandpass', freq: 1200 + rnd() * 600, q: 1.5, dur: 0.05, vol: 0.03 }); }
      };

      /* ---------------- cached sprites ---------------- */
      function sprite(size, stops) { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r); stops.forEach(([k, col]) => gr.addColorStop(k, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c; }
      const GLOW = sprite(96, [[0, 'rgba(255,236,170,0.95)'], [0.3, 'rgba(255,200,90,0.42)'], [1, 'rgba(255,170,60,0)']]);
      const SOFT = sprite(96, [[0, 'rgba(0,0,0,0.6)'], [0.55, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]);
      const WARM = sprite(128, [[0, 'rgba(255,214,150,0.5)'], [0.5, 'rgba(255,190,110,0.16)'], [1, 'rgba(255,170,90,0)']]);
      function mk(w, hh) { const c = document.createElement('canvas'), d = cv.dpr; c.width = Math.max(1, Math.ceil(w * d)); c.height = Math.max(1, Math.ceil(hh * d)); const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { c, g, w, h: hh }; }
      const pathOf = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y))); p.closePath(); return p; };

      /* ---------------- geometry ---------------- */
      const G = { w: 0, H: 0, phone: true, B: null, BX: 0, BY: 0, BW: 0, BH: 0, scale: 1, wallY: 0, shelfY: 0, labelY: 0, cloth: null, cap: 0 };
      const LY = {};
      const CR = {};
      let pieces = [], cracks = [], named = [], chipPath = null, regionPath = null, antiChip = null, J = { x: 0, y: 0 };
      ['C1', 'C2', 'C3', 'C4'].forEach(id => { CR[id] = { id, tv: NET[id], pools: NET.pools[id], named: false, hard: null, done: false, active: false, auto: false, prog: 0, tp: [], baked: false, doneAt: 0, deps: [] }; });
      CR.C3.deps = ['C1', 'C2']; CR.C4.deps = ['C3'];
      cracks = ['C1', 'C3', 'C2', 'C4'].map(id => CR[id]);
      named = (NAMED === 2 ? ['C1', 'C2'] : NAMED === 3 ? ['C1', 'C3', 'C2'] : ['C1', 'C4', 'C3', 'C2']).map((id, i) => { const c = CR[id]; c.named = true; c.hard = HT[i]; return c; });
      const PIECE_IDS = ['left', 'right', 'bottom'];
      pieces = PIECE_IDS.map((id, i) => ({ id, i, placed: false, x: 0, y: 0, rot: [0.34, -0.38, 0.24][i] + (rnd() - 0.5) * 0.14, srot: 0, tw: null, near: false }));
      pieces.forEach(pc => { pc.srot = pc.rot; });

      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        Object.assign(G, { w, H, phone });
        G.wallY = Math.round(H * (phone ? 0.42 : 0.445));
        G.shelfY = Math.round(phone ? Math.max(H * 0.27, 200) : H * 0.27);
        const R = Math.round(phone ? Math.min(w * 0.4, 162, H * 0.19) : Math.min(w * 0.17, H * 0.25, 220));
        const rimTop = phone ? Math.max(G.shelfY + 72, H * 0.355) : Math.max(G.shelfY + 90, H * 0.37);
        G.B = makeBowl(Math.round(w / 2), Math.round(rimTop + R * HB * CPH + R * SPH), R);
        G.scale = R / 128;
        G.BX = Math.floor(G.B.cx - R - 16); G.BY = Math.floor(G.B.top - 16); G.BW = Math.ceil(2 * R + 32); G.BH = Math.ceil(G.B.footY - G.B.top + 32);
        G.labelY = Math.round(G.B.footY + (phone ? 20 : 26));
        G.cloth = phone ? { t: G.wallY + 22, b: H - 98, tl: 16, tr: w - 16, bl: 5, br: w - 5 } : { t: G.wallY + 34, b: H - 62, tl: G.B.cx - 2.7 * R, tr: G.B.cx + 2.7 * R, bl: G.B.cx - 3.1 * R, br: G.B.cx + 3.1 * R };
        buildGeometry();
        paintAll();
        scatter();
        placeDom();
        [drop, still].forEach(c => c.el.style.setProperty('--sz', charSize() + 'px'));
        drop.place(phone ? 12 : 24, phone ? 64 : 72);
        if (FIN.on) placeFinaleCast(); else still.place(phone ? 12 : 24, phone ? 64 : 72);
      }
      function buildGeometry() {
        const B = G.B, N = NET, sc = (list) => list.map(q => { const p = B.pt(q[0], q[1], 0); return { x: p.x, y: p.y }; });
        const arc = (t0, t1, v) => { const n = Math.max(2, Math.ceil(Math.abs(t1 - t0) / 0.05)), out = []; for (let i = 0; i <= n; i++) out.push([t0 + (t1 - t0) * i / n, v]); return out; };
        const rev = (a) => a.slice().reverse(), tl = (a) => a.slice(1);
        const C1a = N.C1.slice(0, N.k1 + 1), C1b = N.C1.slice(N.k1), C2a = N.C2.slice(0, N.k2 + 1), C2b = N.C2.slice(N.k2), C3a = N.C3.slice(0, N.k3 + 1), C3b = N.C3.slice(N.k3);
        const polys = {
          left: [...C1a, ...tl(C3a), ...tl(rev(N.C4)), ...tl(arc(N.a4, N.a1, 1))],
          right: [...N.C4, ...tl(C3b), ...tl(rev(C2a)), ...tl(arc(N.a2, N.a4, 1))],
          bottom: [...C1b, ...tl(arc(N.b1, N.b2, 0)), ...tl(rev(C2b)), ...tl(rev(N.C3))]
        };
        regionPath = pathOf(sc([...N.C1, ...tl(arc(N.b1, N.b2, 0)), ...tl(rev(N.C2)), ...tl(arc(N.a2, N.a1, 1))]));
        const chipPts = sc(N.chip); chipPath = pathOf(chipPts);
        antiChip = new Path2D(); antiChip.rect(-50, -50, G.w + 100, G.H + 100); antiChip.addPath(chipPath);
        const jq = B.pt(N.j[0], N.j[1], 0); J = { x: jq.x, y: jq.y, r: Math.max(...chipPts.map(q => Math.hypot(q.x - jq.x, q.y - jq.y))) };
        G.bodyP = bodyPath(B, 0);
        for (const c of cracks) {
          const frac = c.len ? c.prog : 0;
          c.pts = sc(c.tv); c.L = [0];
          for (let i = 1; i < c.pts.length; i++) c.L.push(c.L[i - 1] + Math.hypot(c.pts[i].x - c.pts[i - 1].x, c.pts[i].y - c.pts[i - 1].y));
          c.len = c.L[c.L.length - 1]; c.prog = frac;
        }
        pieces.forEach(pc => {
          const pts = sc(polys[pc.id]);
          let a = 0, cx = 0, cy = 0;
          for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length], cr = p.x * q.y - q.x * p.y; a += cr; cx += (p.x + q.x) * cr; cy += (p.y + q.y) * cr; }
          pc.pts = pts; pc.path = pathOf(pts); pc.cx = cx / (3 * a); pc.cy = cy / (3 * a);
        });
      }
      function scatter() {
        const B = G.B, R = B.R;
        const spots = G.phone ? [[G.w * 0.25, G.H * 0.7], [G.w * 0.75, G.H * 0.7], [G.w * 0.5, G.H * 0.818]] : [[B.cx - 2.05 * R, B.Y0 + 0.08 * R], [B.cx + 2.05 * R, B.Y0 + 0.04 * R], [B.cx + 0.12 * R, Math.min(B.footY + 0.98 * R, G.H - 0.5 * R - 20)]];
        pieces.forEach((pc, i) => { pc.sx = spots[i][0]; pc.sy = spots[i][1]; pc.tw = null; if (!pc.placed && pc !== DRAG.pc) { pc.x = pc.sx; pc.y = pc.sy; pc.rot = pc.srot; } if (pc.placed) { pc.x = pc.cx; pc.y = pc.cy; pc.rot = 0; } });
      }
      function placeDom() {
        if (!G.w) return;
        labelEl.style.left = G.B.cx + 'px'; labelEl.style.top = G.labelY + 'px';
        kindEl.style.left = G.B.cx + 'px'; kindEl.style.top = (G.labelY + 2) + 'px';
        moreEl.style.top = (G.shelfY - (G.phone ? 30 : 38)) + 'px';
      }

      /* ---------------- painting the cached layers ---------------- */
      function paintAll() {
        if (!G.w) return;
        const D = dark();
        LY.bg = mk(G.w, G.H); paintRoom(LY.bg.g, D);
        LY.bowl = bowlLayer(true);
        LY.main = mk(G.BW, G.BH); { const g = LY.main.g; g.translate(-G.BX, -G.BY); g.drawImage(LY.bowl.c, G.BX, G.BY, G.BW, G.BH); g.save(); g.clip(regionPath); g.clearRect(G.BX, G.BY, G.BW, G.BH); through(g, regionPath, 3.2); g.restore(); }
        LY.whole = mk(G.BW, G.BH); { const g = LY.whole.g; g.translate(-G.BX, -G.BY); g.drawImage(LY.bowl.c, G.BX, G.BY, G.BW, G.BH); g.save(); g.clip(chipPath); g.clearRect(G.BX, G.BY, G.BW, G.BH); through(g, chipPath, 2.6); g.restore(); hairlines(g); }
        pieces.forEach(pieceSprite);
        LY.gold = mk(G.BW, G.BH); LY.gold.g.translate(-G.BX, -G.BY); bakeAll();
        LY.mood = mk(G.w, G.H); paintMood(LY.mood.g, D);
        LY.stand = standLayer(D, G.B);
        if (FIN.on) finGeom();
        el.style.backgroundColor = D ? '#15100e' : '#e9dfcf';
      }
      function bowlLayer(detail) {
        const o = mk(G.BW, G.BH), g = o.g; g.translate(-G.BX, -G.BY);
        paintBowl(g, G.B, GZ, NET, detail, 0, 0);
        return o;
      }
      /* The bowl body, lit from the left. detail: glaze edge, drips and iron speckles baked in (they turn with the bowl in the finale instead). */
      function paintBowl(g, B, gz, N, detail, al, dy) {
        const cx = B.cx, R = B.R;
        // foot ring (bare clay)
        const fy0 = B.Y0 + dy - R * 0.02, fy1 = B.Y0 + dy + B.fh * CPH, fp = new Path2D();
        fp.moveTo(cx - B.fr, fy0); fp.lineTo(cx - B.fr, fy1); fp.ellipse(cx, fy1, B.fr, B.fr * SPH, 0, Math.PI, 0, true); fp.lineTo(cx + B.fr, fy0); fp.ellipse(cx, fy0, B.fr, B.fr * SPH, 0, 0, Math.PI, false); fp.closePath();
        const fg = g.createLinearGradient(cx - B.fr, 0, cx + B.fr, 0); fg.addColorStop(0, gz.clayLo); fg.addColorStop(0.3, gz.clay); fg.addColorStop(1, mixHex(gz.clayLo, '#000000', 0.25));
        g.fillStyle = fg; g.fill(fp); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.stroke(fp);
        // the body
        const bp = bodyPath(B, dy);
        g.save(); g.clip(bp);
        const hg = g.createLinearGradient(cx - R, 0, cx + R, 0);
        hg.addColorStop(0, mixHex(gz.lo, gz.base, 0.55)); hg.addColorStop(0.2, gz.hi); hg.addColorStop(0.44, gz.base); hg.addColorStop(0.82, gz.lo); hg.addColorStop(1, mixHex(gz.lo, '#000000', 0.35));
        g.fillStyle = hg; g.fillRect(cx - R - 2, B.top + dy - 2, 2 * R + 4, B.footY - B.top + 4);
        const vg = g.createLinearGradient(0, B.top + dy, 0, B.footY + dy); vg.addColorStop(0, 'rgba(255,255,255,0.12)'); vg.addColorStop(0.35, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.3)');
        g.fillStyle = vg; g.fillRect(cx - R - 2, B.top + dy - 2, 2 * R + 4, B.footY - B.top + 4);
        if (detail) { clayBand(g, B, gz, N, al, dy); speckles(g, B, gz, N, al, dy); }
        // a soft vertical specular stripe
        g.save(); g.translate(cx - 0.43 * R, B.rimY + dy + 0.42 * B.Hb * CPH); g.scale(0.17, 1);
        const sg = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.55); sg.addColorStop(0, 'rgba(255,255,255,0.3)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.fillRect(-R * 0.6, -R * 0.6, R * 1.2, R * 1.2); g.restore();
        g.restore();
        g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 1; g.stroke(bp);
        // inside, seen over the front rim
        const ip = new Path2D(); ip.ellipse(cx, B.rimY + dy, R, R * SPH, 0, 0, TAU);
        g.save(); g.clip(ip);
        g.fillStyle = gz.innerLo; g.fillRect(cx - R, B.top + dy, 2 * R, 2 * R * SPH + 2);
        const ig = g.createRadialGradient(cx - 0.22 * R, B.rimY + dy - 0.42 * R * SPH, 0, cx - 0.22 * R, B.rimY + dy - 0.42 * R * SPH, R * 1.05);
        ig.addColorStop(0, gz.inner); ig.addColorStop(0.6, mixHex(gz.inner, gz.innerLo, 0.55)); ig.addColorStop(1, gz.innerLo);
        g.fillStyle = ig; g.fillRect(cx - R, B.top + dy, 2 * R, 2 * R * SPH + 2);
        const fs = g.createLinearGradient(0, B.rimY + dy - R * SPH * 0.1, 0, B.rimY + dy + R * SPH); fs.addColorStop(0, 'rgba(0,0,0,0)'); fs.addColorStop(1, 'rgba(0,0,0,0.42)');
        g.fillStyle = fs; g.fillRect(cx - R, B.rimY + dy - R * SPH, 2 * R, 2 * R * SPH + 2);
        g.restore();
        // the rim catches the light
        g.strokeStyle = hexA(gz.hi, 0.9); g.lineWidth = Math.max(1.4, R * 0.018); g.beginPath(); g.ellipse(cx, B.rimY + dy, R - 0.6, R * SPH - 0.4, 0, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(cx, B.rimY + dy, R - R * 0.03, R * SPH - R * 0.025, 0, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, R * 0.012); g.beginPath(); g.ellipse(cx, B.rimY + dy, R - 1, R * SPH - 0.8, 0, Math.PI * 0.62, Math.PI * 0.95); g.stroke();
      }
      function hexA(hex, a) { const p = parseInt(hex.slice(1), 16); return 'rgba(' + ((p >> 16) & 255) + ',' + ((p >> 8) & 255) + ',' + (p & 255) + ',' + a + ')'; }
      function clayBand(g, B, gz, N, al, dy) {
        const pts = [], hp = Math.PI / 2;
        for (let i = 0; i <= 48; i++) { const t = -hp + Math.PI * i / 48, th = t - al, q = B.pt(th, glazeEdge(N, th), al, dy); pts.push(q); }
        g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)));
        for (let i = 48; i >= 0; i--) { const q = B.pt(-hp + Math.PI * i / 48 - al, 0, al, dy); g.lineTo(q.x, q.y + 4); }
        g.closePath();
        const cg = g.createLinearGradient(B.cx - B.R, 0, B.cx + B.R, 0); cg.addColorStop(0, gz.clayLo); cg.addColorStop(0.24, gz.clay); cg.addColorStop(1, mixHex(gz.clayLo, '#000000', 0.3));
        g.fillStyle = cg; g.fill();
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = hexA(gz.lo, 0.6); g.lineWidth = Math.max(1.2, B.R * 0.016); g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.stroke();
        g.strokeStyle = hexA(gz.hi, 0.22); g.lineWidth = 1; g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y - 1.6) : g.moveTo(q.x, q.y - 1.6))); g.stroke();
      }
      function speckles(g, B, gz, N, al, dy) {
        g.fillStyle = gz.speck; g.beginPath();
        for (const s of N.spk) { const q = B.pt(s.th, s.v, al, dy); if (q.c < 0.12) continue; const r = s.r * B.R; g.moveTo(q.x + r, q.y); g.ellipse(q.x, q.y, r * (0.35 + 0.65 * q.c), r, 0, 0, TAU); }
        g.fill();
      }
      function through(g, path, edge) { // what shows through a hole in the front wall: the inside of the back wall, and the broken wall's clay edge
        const B = G.B, tg = g.createLinearGradient(0, B.top, 0, B.footY);
        tg.addColorStop(0, GZ.inner); tg.addColorStop(0.55, mixHex(GZ.inner, GZ.innerLo, 0.7)); tg.addColorStop(1, GZ.innerLo);
        g.fillStyle = tg; g.fillRect(G.BX, G.BY, G.BW, G.BH);
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(G.BX, G.BY, G.BW, G.BH);
        g.strokeStyle = mixHex(GZ.clay, '#ffffff', 0.18); g.lineWidth = edge * G.scale; g.stroke(path);
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.8; g.stroke(path);
      }
      function hairlines(g) {
        g.save(); g.clip(antiChip, 'evenodd'); g.lineCap = 'round'; g.lineJoin = 'round';
        for (const c of cracks) {
          g.beginPath(); c.pts.forEach((q, i) => (i ? g.lineTo(q.x + 0.7, q.y + 0.7) : g.moveTo(q.x + 0.7, q.y + 0.7))); g.strokeStyle = hexA(mixHex(GZ.clay, '#ffffff', 0.3), 0.6); g.lineWidth = 1; g.stroke();
          g.beginPath(); c.pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.strokeStyle = 'rgba(28,16,10,0.62)'; g.lineWidth = 1.15; g.stroke();
        }
        g.restore();
      }
      function pieceSprite(pc) {
        const xs = pc.pts.map(q => q.x), ys = pc.pts.map(q => q.y), pad = 6;
        const x0 = Math.floor(Math.min(...xs) - pad), y0 = Math.floor(Math.min(...ys) - pad), x1 = Math.ceil(Math.max(...xs) + pad), y1 = Math.ceil(Math.max(...ys) + pad);
        const o = mk(x1 - x0, y1 - y0), g = o.g; g.translate(-x0, -y0);
        g.save(); g.clip(pc.path); g.drawImage(LY.bowl.c, G.BX, G.BY, G.BW, G.BH);
        g.strokeStyle = mixHex(GZ.clay, '#ffffff', 0.15); g.lineWidth = 2.8 * G.scale; g.stroke(pc.path);
        g.restore();
        g.save(); g.globalCompositeOperation = 'destination-out'; g.fill(chipPath); g.restore();
        g.save(); g.globalCompositeOperation = 'source-atop'; g.strokeStyle = mixHex(GZ.clay, '#ffffff', 0.15); g.lineWidth = 4 * G.scale; g.stroke(chipPath); g.restore();
        pc.spr = { c: o.c, x0, y0, w: o.w, h: o.h };
        const sh = mk(x1 - x0 + 30, y1 - y0 + 30), sg = sh.g; sg.translate(-x0 + 15, -y0 + 15);
        if ('filter' in sg) { sg.filter = 'blur(6px)'; sg.fillStyle = 'rgba(0,0,0,0.55)'; sg.fill(pc.path); sg.filter = 'none'; }
        else { sg.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 0; k < 6; k++) { sg.save(); sg.translate(Math.cos(k) * 3, Math.sin(k) * 3); sg.fill(pc.path); sg.restore(); } }
        pc.sh = { c: sh.c, x0: x0 - 15, y0: y0 - 15, w: sh.w, h: sh.h };
      }
      function roundRect(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function paintRoom(g, D) {
        const w = G.w, H = G.H, phone = G.phone, wy = G.wallY, s = G.phone ? 1 : 1.3;
        // the wall
        const wg = g.createLinearGradient(0, 0, 0, wy); wg.addColorStop(0, D ? '#1d1714' : '#efe7da'); wg.addColorStop(1, D ? '#2b211c' : '#e3d5c0');
        g.fillStyle = wg; g.fillRect(0, 0, w, wy + 2);
        // a shoji window on the left is the scene's one light
        const sx = phone ? -16 : Math.round(w * 0.05), sy = phone ? 74 : 70, sw = phone ? 132 : Math.round(w * 0.2), shh = Math.round(phone ? G.shelfY - 40 - sy : (wy - sy) * 0.8);
        const lg = g.createRadialGradient(sx + sw * 0.6, sy + shh * 0.45, 10, sx + sw * 0.6, sy + shh * 0.45, Math.max(w, H) * 0.75);
        lg.addColorStop(0, D ? 'rgba(255,196,120,0.2)' : 'rgba(255,248,232,0.65)'); lg.addColorStop(1, D ? 'rgba(255,196,120,0)' : 'rgba(255,248,232,0)');
        g.fillStyle = lg; g.fillRect(0, 0, w, wy);
        const pg = g.createLinearGradient(sx, sy, sx + sw, sy + shh); pg.addColorStop(0, D ? '#f5cf8e' : '#fffaf0'); pg.addColorStop(1, D ? '#d99a56' : '#f6e9d0');
        g.globalAlpha = D ? 0.55 : 1; g.fillStyle = pg; g.fillRect(sx, sy, sw, shh); g.globalAlpha = 1;
        g.strokeStyle = D ? '#2a1d15' : '#a88e6a'; g.lineWidth = 2.2 * s;
        g.strokeRect(sx, sy, sw, shh);
        g.lineWidth = 1.1 * s; g.beginPath();
        const cols = phone ? 3 : 4, rows = phone ? 5 : 6;
        for (let i = 1; i < cols; i++) { const x = sx + sw * i / cols; g.moveTo(x, sy); g.lineTo(x, sy + shh); }
        for (let i = 1; i < rows; i++) { const y = sy + shh * i / rows; g.moveTo(sx, y); g.lineTo(sx + sw, y); }
        g.stroke();
        // a branch's shadow falls across the paper
        g.strokeStyle = D ? 'rgba(60,30,12,0.45)' : 'rgba(120,96,70,0.28)'; g.lineWidth = 2.2 * s; g.lineCap = 'round'; g.beginPath();
        g.moveTo(sx + sw * 1.05, sy + shh * 0.2); g.quadraticCurveTo(sx + sw * 0.6, sy + shh * 0.28, sx + sw * 0.18, sy + shh * 0.5);
        g.moveTo(sx + sw * 0.62, sy + shh * 0.27); g.quadraticCurveTo(sx + sw * 0.52, sy + shh * 0.12, sx + sw * 0.4, sy + shh * 0.08); g.stroke();
        g.fillStyle = D ? 'rgba(60,30,12,0.4)' : 'rgba(120,96,70,0.24)';
        [[0.4, 0.08], [0.3, 0.36], [0.5, 0.3], [0.2, 0.47], [0.78, 0.22]].forEach(([u, v], i) => { g.beginPath(); g.ellipse(sx + sw * u, sy + shh * v, 7 * s, 3.4 * s, 0.6 + i, 0, TAU); g.fill(); });
        // the shelf of mended bowls
        paintShelf(g, D);
        // the table
        const tg = g.createLinearGradient(0, wy, 0, H); tg.addColorStop(0, D ? '#2f2017' : '#d9c2a0'); tg.addColorStop(1, D ? '#170f0b' : '#c19f76');
        g.fillStyle = tg; g.fillRect(0, wy, w, H - wy);
        g.fillStyle = D ? 'rgba(255,220,180,0.08)' : 'rgba(255,255,255,0.4)'; g.fillRect(0, wy, w, 2);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, wy + 2, w, 3);
        const R = xr(17); g.strokeStyle = D ? 'rgba(0,0,0,0.28)' : 'rgba(120,80,40,0.16)'; g.lineWidth = 1;
        for (let i = 0; i < 26; i++) { const y = wy + 6 + Math.pow(R(), 1.6) * (H - wy), amp = 2 + R() * 4; g.beginPath(); for (let x = -10; x <= w + 10; x += 20) { const yy = y + Math.sin(x * 0.012 + i) * amp; if (x < -5) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
        paintCloth(g, D);
        // the gold-mixing dish and its brush rest on the table
        const dx = phone ? 64 : G.B.cx + 2.3 * G.B.R, dyy = phone ? H - 46 : wy + 52, dr = phone ? 17 : 22;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(dx + 2, dyy + 5, dr * 1.05, dr * 0.4, 0, 0, TAU); g.fill();
        g.fillStyle = '#16100d'; g.beginPath(); g.ellipse(dx, dyy, dr, dr * 0.42, 0, 0, TAU); g.fill();
        g.fillStyle = '#b9862c'; g.beginPath(); g.ellipse(dx, dyy - 1, dr * 0.72, dr * 0.27, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,236,170,0.75)'; g.beginPath(); g.ellipse(dx - dr * 0.25, dyy - dr * 0.08, dr * 0.25, dr * 0.08, 0, 0, TAU); g.fill();
        g.strokeStyle = D ? '#c9a46a' : '#a77b45'; g.lineWidth = 2.6 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(dx - dr * 1.9, dyy + dr * 0.1); g.lineTo(dx + dr * 0.5, dyy - dr * 0.34); g.stroke();
        g.strokeStyle = '#2a1a10'; g.lineWidth = 3.2 * s; g.beginPath(); g.moveTo(dx + dr * 0.5, dyy - dr * 0.34); g.lineTo(dx + dr * 0.95, dyy - dr * 0.42); g.stroke();
        if (phone) { // a small cup of tea keeps the mender company
          const ux = dx + 70, uy = dyy + 6, ur = 15;
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(ux + 2, uy + 3, ur * 1.05, ur * 0.34, 0, 0, TAU); g.fill();
          const ug = g.createLinearGradient(ux - ur, 0, ux + ur, 0); ug.addColorStop(0, D ? '#cfc4b0' : '#efe7da'); ug.addColorStop(0.35, D ? '#e8dfcc' : '#fbf6ee'); ug.addColorStop(1, D ? '#8f8573' : '#c9bda9');
          g.fillStyle = ug; g.beginPath(); g.moveTo(ux - ur, uy - ur * 1.25); g.lineTo(ux + ur, uy - ur * 1.25); g.quadraticCurveTo(ux + ur * 0.95, uy, ux + ur * 0.62, uy); g.lineTo(ux - ur * 0.62, uy); g.quadraticCurveTo(ux - ur * 0.95, uy, ux - ur, uy - ur * 1.25); g.fill();
          g.fillStyle = D ? '#6a5a3a' : '#8a7a4c'; g.beginPath(); g.ellipse(ux, uy - ur * 1.25, ur * 0.94, ur * 0.3, 0, 0, TAU); g.fill();
          g.fillStyle = D ? '#9c8a52' : '#b8a768'; g.beginPath(); g.ellipse(ux, uy - ur * 1.22, ur * 0.8, ur * 0.22, 0, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(214,164,50,0.85)'; g.lineWidth = 1.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(ux - ur * 0.55, uy - ur * 0.9); g.lineTo(ux - ur * 0.3, uy - ur * 0.62); g.lineTo(ux - ur * 0.42, uy - ur * 0.3); g.stroke();
        }
      }
      function paintCloth(g, D) {
        const c = G.cloth, path = new Path2D();
        path.moveTo(c.tl, c.t); path.lineTo(c.tr, c.t); path.lineTo(c.br, c.b); path.lineTo(c.bl, c.b); path.closePath();
        g.save(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.translate(0, 4); g.fill(path); g.restore();
        const cg = g.createLinearGradient(0, c.t, 0, c.b); cg.addColorStop(0, D ? '#1b2948' : '#2a4373'); cg.addColorStop(1, D ? '#121c33' : '#1f3360');
        g.fillStyle = cg; g.fill(path);
        g.save(); g.clip(path);
        // seigaiha waves in sashiko stitch, smaller with distance
        g.strokeStyle = D ? 'rgba(232,220,196,0.13)' : 'rgba(243,234,216,0.2)'; g.lineWidth = 1; g.setLineDash([3, 2.4]);
        const H = c.b - c.t;
        for (let y = c.t + 6, row = 0; y < c.b + 20; row++) {
          const k = 0.55 + 0.45 * clamp01((y - c.t) / H), r = 12 * k * (G.phone ? 1 : 1.25), stepX = r * 2;
          g.beginPath();
          for (let x = (row % 2 ? r : 0) - stepX; x < G.w + stepX; x += stepX) for (let q = 1; q <= 3; q++) { const rr = r * q / 3; g.moveTo(x + rr, y); g.arc(x, y, rr, Math.PI, 0, false); }
          g.stroke();
          y += r * 0.62;
        }
        g.setLineDash([]);
        // woven texture and a stitched border
        g.strokeStyle = 'rgba(0,0,0,0.08)'; g.beginPath(); for (let y = c.t; y < c.b; y += 3) { g.moveTo(0, y); g.lineTo(G.w, y); } g.stroke();
        g.restore();
        g.strokeStyle = D ? 'rgba(232,220,196,0.3)' : 'rgba(243,234,216,0.42)'; g.lineWidth = 1.2; g.setLineDash([5, 4]);
        g.beginPath(); g.moveTo(c.tl + 10, c.t + 8); g.lineTo(c.tr - 10, c.t + 8); g.lineTo(c.br - 18, c.b - 10); g.lineTo(c.bl + 18, c.b - 10); g.closePath(); g.stroke(); g.setLineDash([]);
        g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.moveTo(c.tl, c.t); g.lineTo(c.tr, c.t); g.lineTo(c.tr - 2, c.t + 3); g.lineTo(c.tl + 2, c.t + 3); g.closePath(); g.fill();
      }
      function paintShelf(g, D) {
        const w = G.w, y = G.shelfY, phone = G.phone, x0 = phone ? 14 : Math.round(w * 0.3), x1 = phone ? w - 14 : Math.round(w * 0.95), th = phone ? 7 : 9;
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.moveTo(x0 + 6, y + th); g.lineTo(x1 - 6, y + th); g.lineTo(x1 - 22, y + th + 16); g.lineTo(x0 + 22, y + th + 16); g.closePath(); g.fill();
        g.fillStyle = D ? '#4c3626' : '#c8a171'; g.beginPath(); g.moveTo(x0 + 8, y - 6); g.lineTo(x1 - 8, y - 6); g.lineTo(x1, y); g.lineTo(x0, y); g.closePath(); g.fill();
        g.fillStyle = D ? '#2f2016' : '#a37d52'; g.fillRect(x0, y, x1 - x0, th);
        g.fillStyle = D ? 'rgba(255,220,180,0.12)' : 'rgba(255,255,255,0.35)'; g.fillRect(x0, y, x1 - x0, 1.2);
        // a slim vase with a branch at one end
        const vx = phone ? x0 + 20 : x0 + 30, vh = phone ? 34 : 46, vw = phone ? 9 : 12;
        g.fillStyle = D ? '#d8cbb6' : '#f3ece0'; g.beginPath(); g.moveTo(vx - vw * 0.45, y - vh); g.quadraticCurveTo(vx - vw * 1.3, y - vh * 0.35, vx - vw, y); g.lineTo(vx + vw, y); g.quadraticCurveTo(vx + vw * 1.3, y - vh * 0.35, vx + vw * 0.45, y - vh); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.moveTo(vx + vw * 0.2, y - vh); g.quadraticCurveTo(vx + vw * 1.3, y - vh * 0.35, vx + vw, y); g.lineTo(vx + vw * 0.4, y); g.closePath(); g.fill();
        g.strokeStyle = D ? '#6b4a33' : '#5a4030'; g.lineWidth = 1.6; g.lineCap = 'round'; g.beginPath();
        g.moveTo(vx, y - vh); g.quadraticCurveTo(vx + 4, y - vh * 1.8, vx + vh * 0.55, y - vh * 2.25); g.moveTo(vx + 2, y - vh * 1.55); g.quadraticCurveTo(vx - 8, y - vh * 1.9, vx - vh * 0.3, y - vh * 2.05); g.stroke();
        g.fillStyle = D ? '#e8a8b0' : '#d77a8a'; [[vx + vh * 0.55, y - vh * 2.25], [vx - vh * 0.3, y - vh * 2.05], [vx + vh * 0.2, y - vh * 1.98]].forEach(([bx, by]) => { for (let k = 0; k < 5; k++) { const a = k * TAU / 5; g.beginPath(); g.arc(bx + Math.cos(a) * 2.6, by + Math.sin(a) * 2.6, 2.3, 0, TAU); g.fill(); } });
        g.fillStyle = '#f6d36a'; [[vx + vh * 0.55, y - vh * 2.25], [vx - vh * 0.3, y - vh * 2.05], [vx + vh * 0.2, y - vh * 1.98]].forEach(([bx, by]) => { g.beginPath(); g.arc(bx, by, 1.3, 0, TAU); g.fill(); });
        // the mended bowls, oldest first
        const rm = phone ? 17 : 24, gap = phone ? 11 : 16, start = vx + vw + gap + rm + 4, cap = Math.max(1, Math.floor((x1 - 10 - start + rm) / (2 * rm + gap)));
        G.cap = cap;
        const show = OLD.slice(-cap);
        show.forEach((b, i) => mini(g, start + i * (2 * rm + gap), y - 1, rm, b));
        G.slot = { x: start + Math.min(show.length, cap - 1) * (2 * rm + gap), y: y - rm }; // where today's bowl will sit next time
        moreEl.hidden = OLD.length <= cap; moreEl.textContent = '+' + (OLD.length - cap) + ' more';
      }
      function mini(g, x, footY, rm, b) {
        const B0 = makeBowl(x, 0, rm), B = makeBowl(x, footY - (B0.footY - B0.Y0), rm), N = network(b.s), gz = GLAZES[b.g];
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 2, footY + 1, rm * 0.62, rm * 0.12, 0, 0, TAU); g.fill();
        paintBowl(g, B, gz, N, true, 0, 0);
        g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
        ['C1', 'C2', 'C3', 'C4'].forEach(id => { g.beginPath(); N[id].forEach((q, i) => { const p = B.pt(q[0], q[1], 0); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }); g.strokeStyle = '#d9a634'; g.lineWidth = Math.max(1, rm * 0.06); g.stroke(); });
        const m = MOTS[b.m], jq = B.pt(N.j[0], N.j[1], 0), s = rm * 0.22;
        g.translate(jq.x, jq.y); g.scale(s, s); g.translate(0, -m.oy); g.fillStyle = '#e2b240'; g.fill(m.path);
        g.restore();
      }
      function paintMood(g, D) {
        const w = G.w, H = G.H, B = G.B;
        const vg = g.createRadialGradient(B.cx, B.Y0 - B.R * 0.2, B.R * 0.6, B.cx, B.Y0, Math.max(w, H) * 0.75);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, D ? 'rgba(6,3,2,0.62)' : 'rgba(70,44,22,0.3)');
        g.fillStyle = vg; g.fillRect(0, 0, w, H);
        const sp = g.createRadialGradient(B.cx, B.footY, 4, B.cx, B.footY, B.R * 1.8); sp.addColorStop(0, D ? 'rgba(255,196,120,0.3)' : 'rgba(255,214,150,0.4)'); sp.addColorStop(1, 'rgba(255,196,120,0)');
        g.save(); g.translate(B.cx, B.footY); g.scale(1, 0.42); g.translate(-B.cx, -B.footY); g.fillStyle = sp; g.fillRect(B.cx - B.R * 2, B.footY - B.R * 2, B.R * 4, B.R * 4); g.restore();
      }
      const LIFT = () => -0.14 * G.B.R;
      function standLayer(D, B) { // only as big as the stand itself
        const R = B.R, x0 = Math.floor(B.cx - R * 1.1), y0 = Math.floor(B.footY - 0.56 * R - 8), x1 = Math.ceil(B.cx + R * 1.1), y1 = Math.ceil(B.footY + R * 0.36);
        const o = mk(x1 - x0, y1 - y0); o.g.translate(-x0, -y0); paintStand(o.g, D, B); o.x = x0; o.y = y0; return o;
      }
      function paintStand(g, D, B) {
        const R = B.R, fy = B.footY - 0.14 * R - B.fr * SPH, cx = B.cx, rx = R * 0.66, ry = rx * SPH, th = R * 0.07; // the plate sits centred under the lifted foot
        g.drawImage(SOFT, cx - R * 1.05, B.footY - R * 0.08, R * 2.1, R * 0.4);
        const lac = D ? '#1a1110' : '#2e1d15';
        [-1, 1].forEach(sd => { g.fillStyle = lac; roundRect(g, cx + sd * rx * 0.62 - R * 0.07, fy + ry + th * 0.6, R * 0.14, R * 0.09, 3); g.fill(); });
        g.fillStyle = mixHex(lac, '#000000', 0.2); g.beginPath(); g.ellipse(cx, fy + th, rx, ry, 0, 0, Math.PI); g.lineTo(cx - rx, fy); g.ellipse(cx, fy, rx, ry, 0, Math.PI, 0, true); g.closePath(); g.fill();
        const tg = g.createLinearGradient(cx - rx, 0, cx + rx, 0); tg.addColorStop(0, mixHex(lac, '#ffffff', 0.12)); tg.addColorStop(0.35, lac); tg.addColorStop(1, mixHex(lac, '#000000', 0.3));
        g.fillStyle = tg; g.beginPath(); g.ellipse(cx, fy, rx, ry, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(226,178,72,0.85)'; g.lineWidth = Math.max(1.2, R * 0.012); g.beginPath(); g.ellipse(cx, fy, rx - 1, ry - 0.6, 0, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,230,180,0.12)'; g.beginPath(); g.ellipse(cx - rx * 0.3, fy - ry * 0.3, rx * 0.4, ry * 0.25, 0, 0, TAU); g.fill();
      }

      /* ---------------- gold ---------------- */
      const goldCol = (k) => mixHex(GOLD.cool, GOLD.hot, clamp01(k));
      const heatAt = (c, i, now) => { const t = c.tp[i]; return t == null || t < 0 ? 0 : clamp01(1 - (now - t) / 1500); };
      function goldLine(g, pts, heats, pools, w0, glow) {
        if (pts.length < 2) return;
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x + 0.8, q.y + 1.2) : g.moveTo(q.x + 0.8, q.y + 1.2))); g.strokeStyle = GOLD.shade; g.lineWidth = w0 * 1.8; g.stroke();
        for (let i = 1; i < pts.length; i++) { g.strokeStyle = goldCol((heats[i] + heats[i - 1]) / 2); g.lineWidth = w0 * (1 + 0.42 * (pools[i] + pools[i - 1])); g.beginPath(); g.moveTo(pts[i - 1].x, pts[i - 1].y); g.lineTo(pts[i].x, pts[i].y); g.stroke(); }
        for (let i = 0; i < pts.length; i++) if (pools[i] > 0.5) { const r = w0 * (0.5 + pools[i] * 0.72); g.fillStyle = goldCol(heats[i]); g.beginPath(); g.ellipse(pts[i].x, pts[i].y, r * 1.18, r, 0.35, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,250,225,0.85)'; g.beginPath(); g.arc(pts[i].x - r * 0.32, pts[i].y - r * 0.36, r * 0.3, 0, TAU); g.fill(); }
        g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x - 0.5, q.y - 0.6) : g.moveTo(q.x - 0.5, q.y - 0.6))); g.strokeStyle = GOLD.hi; g.lineWidth = Math.max(0.8, w0 * 0.34); g.stroke();
        if (glow) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < pts.length; i += 1) if (heats[i] > 0.04) { g.globalAlpha = heats[i] * 0.5; const s = w0 * 7.5; g.drawImage(GLOW, pts[i].x - s / 2, pts[i].y - s / 2, s, s); } g.restore(); }
      }
      const W0 = () => 2.3 * G.scale + 0.9;
      function visible(c, upto, now) {
        const P0 = c.pts, L = c.L, pts = [P0[0]], heats = [heatAt(c, 0, now)], pools = [c.pools[0]];
        for (let i = 1; i < P0.length; i++) {
          if (L[i] <= upto + 1e-6) { pts.push(P0[i]); heats.push(heatAt(c, i, now)); pools.push(c.pools[i]); continue; }
          const k = (upto - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
          if (k > 0) { pts.push({ x: lerp(P0[i - 1].x, P0[i].x, k), y: lerp(P0[i - 1].y, P0[i].y, k) }); heats.push(heats[heats.length - 1]); pools.push(0); }
          break;
        }
        return { pts, heats, pools };
      }
      function drawLive(g, c, t, now) {
        const V = visible(c, c.prog * c.len, now);
        g.save(); g.clip(antiChip, 'evenodd'); goldLine(g, V.pts, V.heats, V.pools, W0(), true); g.restore();
        if (!c.done && c.prog > 0 && c.prog < 1) { // the molten bead at the front of the flow
          const hp = V.pts[V.pts.length - 1], r = W0() * (1.25 + 0.08 * Math.sin(t * 11));
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.85; g.drawImage(GLOW, hp.x - r * 6, hp.y - r * 6, r * 12, r * 12); g.restore();
          g.fillStyle = GOLD.hot; g.beginPath(); g.arc(hp.x, hp.y, r, 0, TAU); g.fill();
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(hp.x - r * 0.35, hp.y - r * 0.35, r * 0.3, 0, TAU); g.fill();
        }
      }
      function bakeCrack(c) { const g = LY.gold.g; g.save(); g.clip(antiChip, 'evenodd'); const V = visible(c, c.len, 1e15); goldLine(g, V.pts, V.heats.map(() => 0), V.pools, W0(), false); g.restore(); c.baked = true; }
      const bakePatch = () => drawPatch(LY.gold.g, 0, { x: J.x, y: J.y, clip: G.bodyP });
      function bakeAll() { for (const c of cracks) if (c.baked) bakeCrack(c); if (PATCH.baked) bakePatch(); }
      function pointAt(c, s) { const L = c.L, P0 = c.pts; s = Math.max(0, Math.min(c.len, s)); for (let i = 1; i < P0.length; i++) if (L[i] >= s) { const k = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); return { x: lerp(P0[i - 1].x, P0[i].x, k), y: lerp(P0[i - 1].y, P0[i].y, k) }; } return P0[P0.length - 1]; }
      function nearest(c, x, y, s0, s1) {
        const P0 = c.pts, L = c.L; let best = { s: 0, d: 1e9 };
        for (let i = 1; i < P0.length; i++) {
          if (L[i] < s0 || L[i - 1] > s1) continue;
          const ax = P0[i - 1].x, ay = P0[i - 1].y, dx = P0[i].x - ax, dy = P0[i].y - ay, l2 = dx * dx + dy * dy || 1e-6, k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
          const d = Math.hypot(x - ax - dx * k, y - ay - dy * k);
          if (d < best.d) best = { s: L[i - 1] + (L[i] - L[i - 1]) * k, d };
        }
        return best;
      }

      /* ---------------- the patch: the missing chip filled with a gold shape that matters ---------------- */
      const PATCH = { m: null, mi: -1, fill: 0, down: false, done: false, doneAt: 0, baked: false, on: false };
      const PS = () => G.B.R * 0.2;
      /* o: { fill, heat, light, x, y, sx (foreshortening), s (size), clip (the body, so the patch never overhangs it) } */
      function drawPatch(g, t, o) {
        const m = PATCH.m; if (!m) return;
        const s = o.s || PS(), fill = o.fill == null ? 1 : o.fill, heat = o.heat || 0, light = o.light || 0;
        g.save();
        if (o.clip) g.clip(o.clip);
        g.translate(o.x, o.y); g.scale(s * (o.sx == null ? 1 : o.sx), s); g.translate(0, -m.oy);
        if (fill < 1) {
          g.setLineDash([0.14, 0.11]); g.lineWidth = 0.06; g.strokeStyle = 'rgba(255,226,150,' + (0.55 + 0.3 * Math.sin(t * 3)).toFixed(3) + ')'; g.stroke(m.path); g.setLineDash([]);
          if (fill > 0) {
            g.save(); g.clip(m.path);
            const top = 1.1 - 2.2 * fill;
            g.fillStyle = '#ffe08c'; g.beginPath(); g.moveTo(-1.3, 1.3);
            for (let k = 0; k <= 13; k++) g.lineTo(-1.3 + k * 0.2, top + Math.sin(t * 7 + k * 0.9) * 0.05);
            g.lineTo(1.3, 1.3); g.closePath(); g.fill();
            g.strokeStyle = '#fff8e0'; g.lineWidth = 0.07; g.beginPath();
            for (let k = 0; k <= 13; k++) { const yy = top + Math.sin(t * 7 + k * 0.9) * 0.05; if (k) g.lineTo(-1.3 + k * 0.2, yy); else g.moveTo(-1.3, yy); }
            g.stroke();
            g.restore();
          }
        } else {
          g.save(); g.translate(0.05, 0.08); g.fillStyle = 'rgba(40,20,4,0.5)'; g.fill(m.path); g.restore();
          g.fillStyle = goldCol(heat); g.fill(m.path);
          const gr = g.createLinearGradient(-1, -1, 1, 1); gr.addColorStop(0, 'rgba(255,250,228,' + (0.5 + 0.35 * light).toFixed(3) + ')'); gr.addColorStop(0.45, 'rgba(255,240,190,0)'); gr.addColorStop(1, 'rgba(110,64,8,0.4)');
          g.fillStyle = gr; g.fill(m.path);
          g.lineCap = 'round'; g.lineJoin = 'round';
          g.strokeStyle = 'rgba(112,66,10,0.8)'; g.lineWidth = 0.075; g.stroke(m.eng);
          g.strokeStyle = 'rgba(255,248,214,0.55)'; g.lineWidth = 0.05; g.stroke(m.path);
        }
        g.restore();
      }

      /* ---------------- state ---------------- */
      let phase = 'intro', finished = false, lastNow = performance.now(), drawn = 0, half = 0, acc = 0, qAcc = 0, qN = 0;
      const DRAG = { pc: null, ox: 0, oy: 0, rot0: 0, lx: 0, ly: 0, rt: 0 };
      const TR = { c: null, i: -1, down: false, off: false, f: 0, steadyT: 0, totalT: 0, fastT: 0, warned: false, ready: false, notes: 0, spark: 0 };
      const FIN = { on: false, t0: 0, k: 0, lift: 0, a: 0, off: 0, w: 0, drag: false, lx: 0, turning: false, glintAt: 0, lastG: [], said: false, clay: null };
      const steadies = [];
      const waiters = {}, fired = new Set();
      const waitFor = (name) => (fired.has(name) ? (fired.delete(name), Promise.resolve()) : new Promise(res => { waiters[name] = res; }));
      const resolveW = (name) => { const f = waiters[name]; if (f) { delete waiters[name]; f(); } else fired.add(name); };

      /* ---------------- drawing ---------------- */
      function draw(t, dt) {
        const g = cv.g, now = performance.now();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        if (FIN.on) { drawFinale(g, t, dt, now); return; }
        g.drawImage(LY.bg.c, 0, 0, G.w, G.H);
        const B = G.B;
        g.globalAlpha = 0.8; g.drawImage(SOFT, B.cx - B.R * 1.1, B.footY - B.R * 0.16, B.R * 2.2, B.R * 0.36); g.globalAlpha = 1;
        const whole = pieces.every(p => p.placed);
        g.drawImage((whole ? LY.whole : LY.main).c, G.BX, G.BY, G.BW, G.BH);
        if (!whole) for (const pc of pieces) if (pc.placed && !pc.tw) drawPiece(g, pc, false, false);
        if (phase === 'twist' || phase === 'value' || (phase === 'pour' && !PATCH.done)) { // the gap glows softly while we look at it
          const pu = 0.5 + 0.5 * Math.sin(t * 2.6);
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + 0.25 * pu; const s = J.r * 6; g.drawImage(GLOW, J.x - s / 2, J.y - s / 2, s, s); g.restore();
        }
        g.drawImage(LY.gold.c, G.BX, G.BY, G.BW, G.BH);
        for (const c of cracks) if (c.active && !c.baked) drawLive(g, c, t, now);
        if (PATCH.on && !PATCH.baked) {
          const heat = PATCH.done ? clamp01(1 - (now - PATCH.doneAt) / 1600) : 1;
          drawPatch(g, t, { fill: PATCH.fill, heat, x: J.x, y: J.y, clip: G.bodyP });
          if (PATCH.done && heat > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = heat * 0.7; const s = PS() * 5; g.drawImage(GLOW, J.x - s / 2, J.y - s / 2, s, s); g.restore(); }
          if (PATCH.fill > 0 && !PATCH.done) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.28; const s = PS() * 3.6; g.drawImage(GLOW, J.x - s / 2, J.y - s / 2, s, s); g.restore(); }
        }
        if (phase === 'trace' && TR.c && !TR.c.done) drawBrush(g, t);
        for (const pc of pieces) if ((!pc.placed || pc.tw) && pc !== DRAG.pc) drawPiece(g, pc, !pc.placed, false);
        if (DRAG.pc) drawPiece(g, DRAG.pc, true, true);
        P.update(dt); P.draw(g);
      }
      function drawPiece(g, pc, loose, lifted) {
        if (!pc.spr) return;
        const s = G.scale;
        if (loose) {
          g.save(); g.translate(pc.x + (lifted ? 9 : 3) * s, pc.y + (lifted ? 16 : 5) * s); g.rotate(pc.rot); g.globalAlpha = lifted ? 0.45 : 0.7;
          g.drawImage(pc.sh.c, pc.sh.x0 - pc.cx, pc.sh.y0 - pc.cy, pc.sh.w, pc.sh.h); g.restore();
        }
        g.save(); g.translate(pc.x, pc.y); g.rotate(pc.rot); if (lifted) g.scale(1.045, 1.045);
        g.drawImage(pc.spr.c, pc.spr.x0 - pc.cx, pc.spr.y0 - pc.cy, pc.spr.w, pc.spr.h);
        g.restore();
      }
      function drawBrush(g, t) {
        const c = TR.c, hp = pointAt(c, c.prog * c.len), s = G.scale * (G.phone ? 1 : 0.9);
        g.save(); g.translate(hp.x, hp.y); g.rotate(0.62 + Math.sin(t * 1.4) * 0.03 + (TR.down ? 0.06 : 0));
        g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 5 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(4 * s, -18 * s); g.lineTo(4 * s, -84 * s); g.stroke();
        g.fillStyle = '#d6b07a'; roundRect(g, -2.6 * s, -86 * s, 5.2 * s, 64 * s, 2.6 * s); g.fill();
        g.fillStyle = 'rgba(120,80,40,0.45)'; [-70, -50].forEach(y => g.fillRect(-2.6 * s, y * s, 5.2 * s, 1.6 * s));
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-1.6 * s, -84 * s, 1.2 * s, 60 * s);
        g.fillStyle = '#c99a3a'; g.fillRect(-3 * s, -24 * s, 6 * s, 6 * s);
        g.fillStyle = '#2a1a10'; g.beginPath(); g.moveTo(-3 * s, -18 * s); g.quadraticCurveTo(-3.6 * s, -6 * s, 0, 0); g.quadraticCurveTo(3.6 * s, -6 * s, 3 * s, -18 * s); g.closePath(); g.fill();
        g.fillStyle = GOLD.cool; g.beginPath(); g.moveTo(-1.6 * s, -5 * s); g.quadraticCurveTo(-1.8 * s, -2 * s, 0, 0); g.quadraticCurveTo(1.8 * s, -2 * s, 1.6 * s, -5 * s); g.closePath(); g.fill();
        g.restore();
      }
      /* The finale: the bowl lifts onto a lacquer stand, the camera eases in, and it turns in the window light. Seams flare
         as they pass the light; when they swing to the back, they show through the rim on the inside wall. */
      const LIGHT = -0.5;
      const lightAt = (t) => { const x = wrapA(t - LIGHT) / 0.38; return Math.exp(-x * x); };
      function finGeom() { // the bowl as the camera will frame it, rendered crisp at that size (never an upscaled cache)
        const B = G.B, Z1 = G.phone ? 1.07 : 1.22;
        FIN.Z1 = Z1; FIN.F = { x: B.cx, y: B.Y0 - 0.3 * B.R }; FIN.F2 = { x: G.w / 2, y: G.phone ? Math.min(B.Y0 - 0.3 * B.R, G.H * 0.5) : G.H * 0.5 };
        const B2 = makeBowl(FIN.F2.x + (B.cx - FIN.F.x) * Z1, FIN.F2.y + (B.Y0 - FIN.F.y) * Z1, B.R * Z1);
        FIN.B2 = B2; FIN.dy2 = -0.14 * B2.R; FIN.body = bodyPath(B2, FIN.dy2);
        FIN.bx = Math.floor(B2.cx - B2.R - 16); FIN.by = Math.floor(B2.top + FIN.dy2 - 16); FIN.bw = Math.ceil(2 * B2.R + 32); FIN.bh = Math.ceil(B2.footY - B2.top + 32);
        LY.plain2 = mk(FIN.bw, FIN.bh); LY.plain2.g.translate(-FIN.bx, -FIN.by); paintBowl(LY.plain2.g, B2, GZ, NET, false, 0, FIN.dy2);
        LY.stand2 = standLayer(dark(), B2);
      }
      const camPt = (x, y) => { const z = lerp(1, FIN.Z1, FIN.k); return { x: lerp(FIN.F.x, FIN.F2.x, FIN.k) + (x - FIN.F.x) * z, y: lerp(FIN.F.y, FIN.F2.y, FIN.k) + (y - FIN.F.y) * z }; };
      function drawFinale(g, t, dt, now) {
        const B = G.B, k = FIN.k, z = lerp(1, FIN.Z1, k), fx = lerp(FIN.F.x, FIN.F2.x, k), fy = lerp(FIN.F.y, FIN.F2.y, k), d = cv.dpr;
        // the room, under a slow camera push-in
        g.setTransform(d * z, 0, 0, d * z, d * (fx - FIN.F.x * z), d * (fy - FIN.F.y * z));
        g.drawImage(LY.bg.c, 0, 0, G.w, G.H);
        g.globalAlpha = k; g.drawImage(LY.mood.c, 0, 0, G.w, G.H); g.globalAlpha = 1;
        if (!FIN.turning) {
          const dy = LIFT() * easeInOut(FIN.lift);
          g.globalAlpha = k; g.drawImage(LY.stand.c, LY.stand.x, LY.stand.y, LY.stand.w, LY.stand.h); g.globalAlpha = 1;
          if (k < 1) { g.globalAlpha = 0.8 * (1 - k); g.drawImage(SOFT, B.cx - B.R * 1.1, B.footY - B.R * 0.16, B.R * 2.2, B.R * 0.36); g.globalAlpha = 1; }
          g.drawImage(LY.whole.c, G.BX, G.BY + dy, G.BW, G.BH); g.drawImage(LY.gold.c, G.BX, G.BY + dy, G.BW, G.BH);
          g.setTransform(d, 0, 0, d, 0, 0);
        } else {
          g.setTransform(d, 0, 0, d, 0, 0);
          g.drawImage(LY.stand2.c, LY.stand2.x, LY.stand2.y, LY.stand2.w, LY.stand2.h);
          drawTurning(g, t, now);
        }
        // the window light falls across the bowl from beyond the frame
        const B2 = FIN.B2, lx = -G.w * 0.12, ly = G.H * 0.04, tx = B2.cx, ty = B2.Y0 - B2.R * 0.2, L = Math.hypot(tx - lx, ty - ly) * 1.25, a = Math.atan2(ty - ly, tx - lx);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.36 * k;
        const bg = g.createLinearGradient(lx, ly, lx + Math.cos(a) * L, ly + Math.sin(a) * L); bg.addColorStop(0, 'rgba(255,214,150,0.32)'); bg.addColorStop(0.75, 'rgba(255,206,130,0.2)'); bg.addColorStop(1, 'rgba(255,200,120,0)');
        g.fillStyle = bg; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + Math.cos(a - 0.17) * L, ly + Math.sin(a - 0.17) * L); g.lineTo(lx + Math.cos(a + 0.11) * L, ly + Math.sin(a + 0.11) * L); g.closePath(); g.fill();
        g.restore();
        P.update(dt); P.draw(g);
      }
      function drawTurning(g, t, now) {
        const B = FIN.B2, dy = FIN.dy2, al = FIN.a, R = B.R, z = FIN.Z1;
        g.drawImage(LY.plain2.c, FIN.bx, FIN.by, FIN.bw, FIN.bh);
        g.save(); g.clip(FIN.body);
        clayBand(g, B, GZ, NET, al, dy); speckles(g, B, GZ, NET, al, dy);
        g.restore();
        // seams: the inside of the back wall first (seen over the front rim), then the outside
        const w0 = W0() * z, glints = [];
        const fr = (X) => { const u = (X - B.cx) / R; return Math.abs(u) >= 1 ? -1e9 : B.rimY + dy + R * SPH * Math.sqrt(1 - u * u) - 1.5; };
        g.save(); g.strokeStyle = 'rgba(214,164,50,0.6)'; g.lineWidth = w0 * 0.7; g.lineCap = 'round'; g.lineJoin = 'round';
        for (const c of cracks) {
          g.beginPath(); let pen = false;
          c.tv.forEach(q => {
            const tt = q[0] + al; if (Math.cos(tt) >= -0.02) { pen = false; return; }
            const r = R * rUnit(q[1]) - R * 0.035, x = B.cx + r * Math.sin(tt), y = B.Y0 + dy - q[1] * B.Hb * CPH + r * Math.cos(tt) * SPH;
            if (y >= fr(x)) { pen = false; return; }
            if (pen) g.lineTo(x, y); else { g.moveTo(x, y); pen = true; }
          });
          g.stroke();
        }
        g.restore();
        for (const c of cracks) {
          let run = { pts: [], heats: [], pools: [] }, best = null;
          const flush = () => { if (run.pts.length > 1) goldLine(g, run.pts, run.heats, run.pools, w0 * 0.95, false); run = { pts: [], heats: [], pools: [] }; };
          c.tv.forEach((q, i) => {
            const p = B.pt(q[0], q[1], al, dy);
            if (p.c < 0.04) { flush(); return; }
            const li = lightAt(p.t) * Math.min(1, p.c * 2.5);
            run.pts.push({ x: p.x, y: p.y }); run.heats.push(li * 0.85); run.pools.push(c.pools[i] * (0.5 + 0.5 * p.c));
            if (!best || li > best.li) best = { li, x: p.x, y: p.y };
          });
          flush();
          if (best && best.li > 0.5) glints.push(best);
        }
        // the gold shape where the gap was
        const jp = B.pt(NET.j[0], NET.j[1], al, dy);
        if (jp.c > 0.08) { const li = lightAt(jp.t); drawPatch(g, t, { heat: li * 0.6, light: li, x: jp.x, y: jp.y, sx: Math.max(0.12, jp.c), s: PS() * z, clip: FIN.body }); if (li > 0.5) glints.push({ li, x: jp.x - PS() * z * 0.3 * jp.c, y: jp.y - PS() * z * 0.4 }); }
        g.save(); g.globalCompositeOperation = 'lighter';
        glints.forEach((q, i) => { const s = w0 * (2.4 + 3.6 * q.li) * (1 + 0.12 * Math.sin(t * 9 + i)); g.globalAlpha = (q.li - 0.45) * 1.5; g.drawImage(GLOW, q.x - s, q.y - s, s * 2, s * 2); g.fillStyle = '#fffbe8'; K.starPath(g, q.x, q.y, s * 0.95, s * 0.14, 4, t * 0.5); g.fill(); });
        g.restore();
        if (glints.length && now > FIN.glintAt && glints.some(q => q.li > 0.85)) { FIN.glintAt = now + 650; SND.glint(Math.floor(now / 650)); if (rnd() < 0.7) { const q = glints[0]; P.emit('star', q.x, q.y, 3, { colors: ['#fffbe6', '#ffe08a'], speed: [20, 60] }); } }
      }

      /* ---------------- per-frame updates (gameplay on the real clock) ---------------- */
      K.loop((dtIn, t) => {
        const g = cv.g; if (!g || !LY.bg) return;
        if (el.dataset.phase !== phase) el.dataset.phase = phase;
        if (phase === 'intro' && drawn > 2) { lastNow = performance.now(); return; }
        if (dtIn < 0.25) { qAcc += dtIn; qN++; if (qN >= 90) { if (qAcc / qN > 0.07 && cv.quality > 0.8) cv.setQuality(0.8); qAcc = 0; qN = 0; } }
        acc += dtIn;
        const now = performance.now(), rdt = Math.min(0.25, Math.max(0, (now - lastNow) / 1000)); lastNow = now;
        update(rdt, t, now);
        const busy = DRAG.pc || pieces.some(p => p.tw) || phase === 'trace' || cracks.some(c => c.active && !c.baked) || PATCH.on && !PATCH.baked || FIN.on || P.count() > 0 || phase === 'twist' || phase === 'value' || phase === 'pour';
        if (!busy && (half ^= 1)) return; // when nothing moves, paint every other frame
        const dt = Math.min(0.06, acc); acc = 0;
        draw(t, dt);
        drawn++;
      });
      function update(rdt, t, now) {
        // pieces settling into place, or sliding back to the cloth
        for (const pc of pieces) if (pc.tw) {
          const T = pc.tw, k = clamp01((now - T.t0) / T.ms), e = easeOut(k);
          pc.x = lerp(T.x, T.tx, e); pc.y = lerp(T.y, T.ty, e); pc.rot = lerp(T.rot, T.trot, e);
          if (k >= 1) pc.tw = null;
        }
        // tracing: the gold flows toward the finger, never faster than VMAX
        if (phase === 'trace' && TR.c && !TR.c.done) {
          const c = TR.c, gl = c.prog * c.len, ahead = TR.f - gl, vmax = VMAX * G.scale;
          if (TR.down) { TR.totalT += rdt; if (!TR.off && ahead <= LEAD) TR.steadyT += rdt; if (ahead > LEAD) TR.fastT += rdt; else TR.fastT = Math.max(0, TR.fastT - rdt * 0.5); }
          if (TR.fastT > 0.5 && !TR.warned) { TR.warned = true; drop.say(line(L.slow), { mood: 'calm', moodMs: 2000, ms: 2600 }); }
          if (ahead > 0.01) advance(c, Math.min(TR.f, gl + vmax * rdt), now);
          SND.pourLevel(ahead > 0.5 ? 1 : TR.down ? 0.25 : 0, c.prog);
          if (c.prog >= 0.9995) crackDone(c, now);
        }
        // hairlines fill themselves once both their ends are gold
        for (const c of cracks) if (c.auto && c.active && !c.done) { advance(c, Math.min(c.len, c.prog * c.len + c.len * rdt / 0.85), now); if (c.prog >= 0.9995) { c.done = true; c.doneAt = now; autoFill(); } }
        // gold that has cooled is baked into the gold layer
        for (const c of cracks) if (c.done && !c.baked && now - c.doneAt > 1650) { bakeCrack(c); c.active = false; }
        // pouring the patch
        if (phase === 'pour' && PATCH.down && !PATCH.done) {
          PATCH.fill = Math.min(1, PATCH.fill + rdt / FILL_T);
          SND.pourLevel(1, PATCH.fill);
          if (rnd() < rdt * 10) P.emit('spark', J.x + (rnd() - 0.5) * PS(), J.y + PS() * (0.9 - 1.8 * PATCH.fill), 1, { colors: ['#fff3c4', '#ffd36b'], speed: [20, 70] });
          if (PATCH.fill >= 1) patchDone(now);
        }
        if (PATCH.done && !PATCH.baked && now - PATCH.doneAt > 1700 && !FIN.on) { bakePatch(); PATCH.baked = true; }
        // the finale
        if (FIN.on) {
          const ft = (now - FIN.t0) / 1000, TT = RED ? 5 : 8.2;
          FIN.k = easeInOut(clamp01(ft / 1.3)); FIN.lift = clamp01((ft - 0.2) / 1.1);
          if (!FIN.turning && ft > 1.35) FIN.turning = true;
          const base = TAU * easeInOut(clamp01((ft - 1.35) / TT));
          if (!FIN.drag) FIN.off += (Math.round(FIN.off / TAU) * TAU - FIN.off) * Math.min(1, rdt * 0.9);
          FIN.a = base + FIN.off;
          if (rnd() < rdt * (RED ? 1.5 : 5)) { const B = FIN.B2; P.emit('mote', B.cx + (rnd() - 0.7) * B.R * 2.6, B.Y0 - rnd() * B.R * 1.6, 1, { colors: ['#fff3c4', '#ffe0a0'], speed: [4, 14] }); }
        }
      }
      function advance(c, ng, now) {
        const g0 = c.prog * c.len;
        if (ng <= g0) return;
        for (let i = 0; i < c.L.length; i++) if (c.L[i] > g0 - 1e-6 && c.L[i] <= ng + 1e-6 && !(c.tp[i] >= 0)) c.tp[i] = now;
        c.prog = Math.min(1, ng / c.len);
        if (!c.auto) {
          const ni = Math.floor(c.prog * 8);
          while (TR.notes < ni) { TR.notes++; SND.step(TR.notes + TR.i); }
          if (now > TR.spark) { TR.spark = now + 140; const hp = pointAt(c, ng); P.emit('spark', hp.x, hp.y, 1, { colors: ['#fff3c4', '#ffd36b', '#ffb84a'], speed: [20, 60] }); }
        }
      }

      /* ---------------- characters ---------------- */
      function speaker(c) { [drop, still].forEach(x => { if (x !== c) { x.hush(); if (!FIN.on) x.show(false); } }); c.show(true); c.react('bounce'); return c; }
      function placeFinaleCast() { const cs = G.phone ? 62 : 84; still.el.style.setProperty('--sz', cs + 'px'); still.side('left'); still.place(G.w - cs - (G.phone ? 12 : 30), G.H - cs - (G.phone ? 20 : 26)); }
      const L = {
        hello: { Jolly: 'This bowl broke. We’re not throwing it out. We’re mending it, with gold.', Cheeky: 'Bowl’s in bits. Good news: the fix involves actual gold.', Unfiltered: 'It broke. We mend it. With gold.' },
        helloSoft: 'This bowl broke. Let’s mend it slowly, with care. There’s no rush here.',
        back: { Jolly: 'Your shelf is still here, every bowl you’ve mended. Here’s today’s.', Cheeky: 'Your shelf’s looking fancy. Another one needs you.', Unfiltered: 'Your shelf’s still here. New bowl.' },
        assemble: { Jolly: 'First, fit the pieces back. They remember where they go.', Cheeky: 'Jigsaw first. Three pieces. You’ve got this.', Unfiltered: 'Fit the pieces back.' },
        placed: { Jolly: 'Click. That’s it coming back together.', Cheeky: 'Click! Deeply satisfying, that.', Unfiltered: 'One in.' },
        assembled: { Jolly: 'All back together. Almost.', Cheeky: 'One piece again. Ish.', Unfiltered: 'Together. Almost.' },
        trace0: { Jolly: 'Each crack holds something hard. Trace it slowly. Gold doesn’t rush.', Cheeky: 'Each crack is a hard thing. Go slow. Gold is fussy.', Unfiltered: 'Each crack: a hard thing. Trace it slowly.' },
        traceN: { Jolly: 'Next crack. Same slow hand.', Cheeky: 'Another one. Slow is pro.', Unfiltered: 'Next. Slowly.' },
        traceCore: { Jolly: 'Last crack. This one’s the heaviest. Take all the time you need.', Cheeky: 'Last one. Heaviest too. No rush at all.', Unfiltered: 'Last one. The heaviest. Slowly.' },
        traceLast: { Jolly: 'Last crack. Same slow hand.', Cheeky: 'Final crack. Steady does it.', Unfiltered: 'Last one. Slowly.' },
        slow: { Jolly: 'Slowly… let the gold catch up with you.', Cheeky: 'Easy. Gold won’t be rushed.', Unfiltered: 'Slower. Let it flow.' },
        gap: { Jolly: 'Hang on. There’s a gap where a piece should be.', Cheeky: 'Wait. We’re a piece short.', Unfiltered: 'There’s a gap.' },
        missing: { Jolly: 'One little piece never turned up. That’s alright. We don’t hide the gap.', Cheeky: 'One piece went missing. Classic. We don’t hide it though.', Unfiltered: 'One piece is gone. We don’t hide the gap.' },
        missing2: { Jolly: 'We fill it with gold, in the shape of something that matters to you.', Cheeky: 'We fill it with gold. Shaped like something you care about. Very fancy.', Unfiltered: 'Fill it with gold. Shaped like what matters.' },
        finale: { Jolly: 'Look at it in the light. Where it broke is where it shines.', Cheeky: 'Honestly? The cracks are the best part.', Unfiltered: 'Broken. Mended. Shining at the seams.' },
        finaleSoft: 'Still a bowl. Still holds. And it shines where it broke.',
        still: { Jolly: 'Nothing here needs hiding.', Cheeky: 'Nothing to hide. Nice.', Unfiltered: 'Nothing hidden.' },
        careEnd: 'For the practical side of what you wrote, someone qualified can help you see where you stand.'
      };
      /* Quiet lines written beside each crack as the gold cools: kind, plain, never a promise. */
      const KIND = {
        Jolly: ['This happened. It’s part of the bowl now.', 'Held with care, not hidden.', 'It broke here. It holds here too.', 'Gentle with this one.'],
        Cheeky: ['Cracked, not finished.', 'Gold suits it, honestly.', 'Still holds tea. Still counts.', 'Fancy seam. Fair enough.'],
        Unfiltered: ['It happened. It’s mended.', 'Not hidden. Held.', 'Broke here. Holds here.', 'Hard thing. Handled with care.'],
        soft: ['This happened. It’s part of the bowl now.', 'Held with care, not hidden.', 'Some cracks stay. They can still shine.', 'You don’t have to hide this one.']
      };
      const kindLine = (i) => { const set = soft() ? KIND.soft : (KIND[vibe()] || KIND.Jolly); return set[i % set.length]; };
      const patchLine = (v) => line({ Jolly: v + ', in gold. Right where the gap was.', Cheeky: v + ', in solid gold. Where the hole was. Poetic.', Unfiltered: v + '. Where the gap was.' });

      /* ---------------- input: one layer for the whole workbench ---------------- */
      K.press(hit, {
        down: (p) => {
          if (phase === 'assemble') grabPiece(p);
          else if (phase === 'trace') traceDown(p);
          else if (phase === 'pour') pourDown(p);
          else if (phase === 'finale') { FIN.drag = true; FIN.lx = p.x; }
          else if (phase === 'twist' && Math.hypot(p.x - J.x, p.y - J.y) < Math.max(56, PS() * 1.8)) { SND.tapBowl(); P.emit('star', J.x, J.y, 8, { colors: ['#fffbe6', '#ffe08a'], speed: [20, 70] }); resolveW('gap'); }
          else ambient(p);
        },
        move: (p) => {
          if (DRAG.pc) movePiece(p);
          else if (TR.down) traceMove(p);
          else if (FIN.drag) { FIN.off += (p.x - FIN.lx) / (FIN.B2.R * 1.1); FIN.lx = p.x; if (FIN.turning && rnd() < 0.2) SND.rustle(0.3); }
        },
        up: () => {
          if (DRAG.pc) dropPiece();
          if (TR.down) traceUp();
          if (PATCH.down) pourUp();
          FIN.drag = false;
        }
      });
      function ambient(p) {
        if (phase === 'intro' || !G.w) return;
        const B = G.B, onBowl = Math.abs(p.x - B.cx) < B.R && p.y > B.top && p.y < B.footY;
        if (onBowl) { SND.tapBowl(); P.emit('mote', p.x, p.y, 4, { colors: ['#fff3c4', '#ffe0a0'], speed: [10, 30] }); }
        else { SND.tap(); P.emit('dust', p.x, p.y, 4, { colors: ['rgba(240,220,190,0.5)'], speed: [10, 40] }); }
      }

      /* ---------------- step 1: fit the pieces ---------------- */
      function pieceAt(p) {
        let best = null, bd = 1e9;
        for (const pc of pieces) {
          if (pc.placed) continue;
          const dx = p.x - pc.x, dy = p.y - pc.y, c = Math.cos(-pc.rot), s = Math.sin(-pc.rot), hx = pc.cx + dx * c - dy * s, hy = pc.cy + dx * s + dy * c;
          if (inPoly(pc.pts, hx, hy)) return pc;
          const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = pc; }
        }
        return bd < 58 * Math.max(1, G.scale) ? best : null;
      }
      function inPoly(pts, x, y) { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside; } return inside; }
      function grabPiece(p) {
        const pc = pieceAt(p);
        if (!pc) { ambient(p); return; }
        pc.tw = null; DRAG.pc = pc; DRAG.ox = p.x - pc.x; DRAG.oy = p.y - pc.y; DRAG.rot0 = pc.rot; DRAG.lx = p.x; DRAG.ly = p.y; DRAG.rt = 0;
        SND.lift(); drop.face('think', 900);
        P.emit('dust', pc.x, pc.y, 5, { colors: ['rgba(240,220,190,0.5)'], speed: [10, 40] });
      }
      const SNAP = () => 44 * Math.max(1, G.scale * 0.9);
      function movePiece(p) {
        const pc = DRAG.pc, now = performance.now();
        pc.x = K.clamp(p.x - DRAG.ox, 24, G.w - 24); pc.y = K.clamp(p.y - DRAG.oy, 80, G.H - 24);
        const d = Math.hypot(pc.x - pc.cx, pc.y - pc.cy);
        pc.rot = lerp(DRAG.rot0, 0, easeOut(clamp01(1 - (d - 24) / (190 * G.scale))));
        if (d < SNAP() && !pc.near) { pc.near = true; SND.near(); } else if (d >= SNAP() * 1.3) pc.near = false;
        const sp = Math.hypot(p.x - DRAG.lx, p.y - DRAG.ly); DRAG.lx = p.x; DRAG.ly = p.y;
        if (now > DRAG.rt && sp > 3) { DRAG.rt = now + 110; SND.rustle(Math.min(1, sp / 30)); }
      }
      function dropPiece() {
        const pc = DRAG.pc; DRAG.pc = null;
        const d = Math.hypot(pc.x - pc.cx, pc.y - pc.cy);
        if (d < SNAP()) { snapPiece(pc); return; }
        const B = G.B, overBowl = Math.abs(pc.x - B.cx) < B.R * 1.05 && pc.y < B.footY + 16;
        SND.set();
        // not quite: over the bowl it slides back to its spot on the cloth; anywhere else it rests where it was put down
        if (overBowl) pc.tw = { t0: performance.now(), ms: RED ? 160 : 380, x: pc.x, y: pc.y, rot: pc.rot, tx: pc.sx, ty: pc.sy, trot: pc.srot };
        else pc.srot = pc.rot;
        guideAssemble(900);
      }
      function snapPiece(pc) {
        pc.placed = true; pc.near = false; pc.tw = { t0: performance.now(), ms: RED ? 90 : 170, x: pc.x, y: pc.y, rot: pc.rot, tx: pc.cx, ty: pc.cy, trot: 0 };
        const n = pieces.filter(p => p.placed).length;
        SND.snap(n - 1);
        P.emit('dust', pc.cx, pc.cy, 10, { colors: [GZ.clay, mixHex(GZ.clay, '#ffffff', 0.4)], speed: [20, 70] });
        P.emit('star', pc.cx, pc.cy, 6, { colors: ['#fffbe6', '#ffe08a'], speed: [30, 90] });
        drop.face(n === 3 ? 'wow' : 'happy', 1200);
        ctx.track('piece', { n });
        if (n === 1) drop.say(line(L.placed), { ms: 2200 });
        if (n >= 3) { K.guide(null); K.later(() => resolveW('assembled'), 260); }
        else guideAssemble(700);
      }
      function nextPiece() { return pieces.find(p => !p.placed && p !== DRAG.pc) || null; }
      function guideAssemble(delay) {
        const pc = nextPiece(); if (!pc || phase !== 'assemble') return;
        K.guide({ id: 'fit-' + pc.id, g: 'drag', target: () => ({ x: pc.x, y: pc.y }), dx: pc.cx - pc.x, dy: pc.cy - pc.y, ms: 1500, label: pieces.some(p => p.placed) ? 'FIT THE NEXT PIECE' : 'FIT THE PIECE', place: pc.y > G.H * 0.8 ? 'above' : 'below', delay });
        hit.setAttribute('aria-label', 'A shard of the bowl. Drag it into its place in the bowl. Press Enter to place it.');
      }
      K.onKey(['Enter', 'Space'], (e) => {
        if (phase === 'assemble') { const pc = nextPiece(); if (pc) { e.preventDefault(); A.unlock(); snapPiece(pc); } }
        else if (phase === 'trace' && TR.c && !TR.c.done) { e.preventDefault(); A.unlock(); TR.f = Math.min(TR.c.len, Math.max(TR.f, TR.c.prog * TR.c.len) + TR.c.len * 0.1); TR.steadyT += 0.4; TR.totalT += 0.4; }
      });
      K.onKey(['ArrowRight', 'ArrowDown'], (e) => { if (phase === 'trace' && TR.c && !TR.c.done) { e.preventDefault(); TR.f = Math.min(TR.c.len, Math.max(TR.f, TR.c.prog * TR.c.len) + TR.c.len * 0.06); TR.steadyT += 0.25; TR.totalT += 0.25; } });

      /* ---------------- step 2: trace each crack with gold ---------------- */
      function traceDown(p) {
        const c = TR.c; if (!c || c.done) return;
        const gl = c.prog * c.len, q = nearest(c, p.x, p.y, gl - 40, gl + 100);
        if (q.d > Math.max(TOL + 12, 46)) { SND.miss(); guideTrace(300, 'START AT THE GOLD'); return; }
        TR.down = true; TR.off = false; if (q.s > TR.f) TR.f = Math.min(c.len, q.s);
        SND.pourOn(); K.guide(null);
      }
      function traceMove(p) {
        const c = TR.c; if (!c) return;
        const gl = c.prog * c.len, q = nearest(c, p.x, p.y, gl - 40, gl + 160);
        if (q.d <= TOL) { TR.off = false; if (q.s > TR.f) TR.f = Math.min(c.len, q.s); }
        else if (q.d > TOL * 1.7) TR.off = true;
      }
      function traceUp() {
        TR.down = false; SND.pourOff();
        if (TR.c && !TR.c.done) K.later(() => { if (!TR.down && TR.c && !TR.c.done && phase === 'trace' && TR.f <= TR.c.prog * TR.c.len + 2) guideTrace(100, 'KEEP TRACING'); }, 1400);
      }
      function guideTrace(delay, label) {
        const c = TR.c; if (!c) return;
        const s0 = c.prog * c.len, a = pointAt(c, s0), b = pointAt(c, Math.min(c.len, s0 + 110 * G.scale));
        K.guide({ id: 'trace-' + c.id + '-' + Math.round(s0), g: 'drag', target: () => pointAt(c, c.prog * c.len), dx: b.x - a.x, dy: b.y - a.y, ms: 2400, label, place: a.y > G.B.Y0 ? 'above' : 'below', delay });
      }
      function showLabel(hd) {
        labelEl.textContent = '';
        labelEl.append(h('small', { text: hd.own ? 'This crack holds' : 'A crack might hold' }), h('span', { class: 'ks-lt' + (hd.own ? ' gk-user' : ' ks-ex'), text: hd.label }));
        labelEl.classList.remove('ks-off');
      }
      const hideLabel = () => labelEl.classList.add('ks-off');
      function showKind(text) { kindEl.textContent = text; kindEl.classList.remove('ks-off', 'ks-in'); void kindEl.offsetWidth; kindEl.classList.add('ks-in'); }
      const hideKind = () => { kindEl.classList.remove('ks-in'); kindEl.classList.add('ks-off'); };
      async function traceCrack(i) {
        const c = named[i];
        TR.c = c; TR.i = i; TR.f = 0; TR.steadyT = 0; TR.totalT = 0; TR.fastT = 0; TR.warned = false; TR.notes = 0; TR.down = false;
        c.active = true; c.prog = 0; c.tp = c.L.map(() => -1);
        showLabel(c.hard);
        const last = i === named.length - 1;
        speaker(drop).say(line(i === 0 ? L.trace0 : last ? (c.hard.core ? L.traceCore : L.traceLast) : L.traceN), { mood: last && c.hard.core ? 'calm' : 'think', moodMs: 0, ms: 4200 });
        hit.setAttribute('aria-label', 'A crack in the bowl. Drag slowly along it to fill it with gold. Arrow keys also trace it.');
        phase = 'trace'; TR.ready = true;
        guideTrace(i ? 700 : 1500, 'TRACE SLOWLY');
        await waitFor('traced');
        TR.ready = false;
        await K.wait(RED ? 700 : 1100);
        hideLabel(); showKind(kindLine(i)); SND.kind();
        drop.base(i === named.length - 1 ? 'love' : 'calm');
        autoFill();
        await K.wait(RED ? 2000 : 2700);
        hideKind();
        await K.wait(450);
      }
      function crackDone(c, now) {
        c.prog = 1; c.done = true; c.doneAt = now;
        TR.down = false; SND.pourOff(); SND.cool(); K.guide(null);
        const st = TR.totalT > 0.25 ? clamp01(TR.steadyT / TR.totalT) : 1;
        steadies.push(st);
        c.pts.forEach((q, i) => { if (i % 5 === 2) P.emit('star', q.x, q.y, 1, { colors: ['#fffbe6', '#ffe08a'], speed: [10, 40] }); });
        drop.face('love', 1600);
        ctx.track('traced', { i: TR.i, steady: Math.round(st * 100) });
        resolveW('traced');
      }
      function autoFill() {
        for (const c of cracks) if (!c.named && !c.active && !c.done && c.deps.every(id => CR[id].done)) { c.active = true; c.auto = true; c.prog = 0; c.tp = c.L.map(() => -1); SND.seep(); }
      }

      /* ---------------- step 3: the missing piece ---------------- */
      function showPanel() {
        panel.textContent = '';
        const row = h('div', { class: 'ks-chips' });
        const chips = MOTS.map((m, i) => {
          const ic = h('canvas', { width: '48', height: '48', 'aria-hidden': 'true' });
          const g = ic.getContext('2d'); g.setTransform(18, 0, 0, 18, 24, 24); g.translate(0, -m.oy * 0.6); g.fillStyle = '#e0ad3c'; g.fill(m.path); g.strokeStyle = 'rgba(110,64,10,0.7)'; g.lineWidth = 0.09; g.stroke(m.eng);
          const b = h('button', { type: 'button', class: 'ks-chip' }, ic, h('span', { text: m.label }));
          S.listen(b, 'pointerdown', () => { if (A.ctx) A.click({ vol: 0.06 }); });
          b.addEventListener('click', () => pickValue(i, b));
          row.append(b); return b;
        });
        panel.append(h('p', { class: 'ks-q' }, h('b', { text: 'What matters to you?' }), h('span', { text: 'Its shape fills the gap, in gold.' })), row);
        panel.classList.remove('ks-away');
        return chips;
      }
      function pickValue(i, b) {
        if (phase !== 'value') return;
        phase = 'pour';
        PATCH.m = MOTS[i]; PATCH.mi = i; PATCH.on = true; PATCH.fill = 0;
        b.classList.add('ks-on'); SND.value(); K.guide(null);
        const r = K.rectIn(b, el); P.emit('star', r.cx, r.cy, 10, { colors: ['#fffbe6', '#ffe08a'], speed: [40, 120] });
        ctx.track('value', { v: PATCH.m.id });
        K.later(() => { panel.classList.add('ks-away'); }, 420);
        speaker(still).say(line({ Jolly: PATCH.m.label + '. Hold the gap to pour the gold.', Cheeky: PATCH.m.label + '. Good choice. Hold to pour.', Unfiltered: PATCH.m.label + '. Hold to pour.' }), { mood: 'happy', moodMs: 1600, ms: 3600 });
        hit.setAttribute('aria-label', 'The gap in the bowl. Press and hold to pour the gold. Space also pours.');
        guidePour(900);
      }
      function guidePour(delay) { K.guide({ id: 'pour', g: 'hold', target: () => ({ x: J.x, y: J.y }), label: 'HOLD TO POUR GOLD', ms: Math.round(FILL_T * 1000), place: 'below', delay }); }
      function pourDown(p) {
        if (PATCH.done || !PATCH.m) return;
        if (Math.hypot(p.x - J.x, p.y - J.y) > Math.max(60, PS() * 1.9)) { SND.miss(); guidePour(200); return; }
        PATCH.down = true; SND.fillOn(); K.guide(null);
      }
      function pourUp() { PATCH.down = false; SND.pourOff(); if (!PATCH.done) K.later(() => { if (!PATCH.down && !PATCH.done && phase === 'pour') guidePour(100); }, 1100); }
      S.listen(hit, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && phase === 'pour' && !PATCH.done && PATCH.m) { e.preventDefault(); A.unlock(); PATCH.down = true; SND.fillOn(); } });
      S.listen(hit, 'keyup', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && PATCH.down) pourUp(); });
      function patchDone(now) {
        PATCH.done = true; PATCH.down = false; PATCH.doneAt = now; PATCH.fill = 1;
        SND.pourOff(); SND.patched(); K.guide(null);
        P.emit('star', J.x, J.y, 18, { colors: ['#fffbe6', '#ffe08a', '#ffd36b'], speed: [40, 150] });
        P.emit('spark', J.x, J.y, 14, { colors: ['#fff3c4', '#ffd36b'] });
        DATA.bowls.push({ g: GZI, s: SEED, m: PATCH.mi }); DATA.n++; save();
        ctx.track('patched', { v: PATCH.m.id, shelf: DATA.n });
        resolveW('patched');
      }
      async function missingPiece() {
        phase = 'twist';
        speaker(drop).say(line(L.gap), { mood: 'surprised', moodMs: 1800, ms: 3400 });
        hit.setAttribute('aria-label', 'A gap in the bowl where a piece is missing. Tap it.');
        K.guide({ id: 'gap', g: 'tap', target: () => ({ x: J.x, y: J.y }), label: 'TAP THE GAP', place: 'below', delay: 800 });
        await Promise.race([waitFor('gap'), K.wait(RED ? 4200 : 5600)]);
        K.guide(null);
        speaker(still).say(soft() ? 'One little piece never turned up. That’s alright. We don’t hide the gap.' : line(L.missing), { mood: 'think', moodMs: 0, ms: 4600 });
        await K.wait(RED ? 2600 : 3600);
        still.say(soft() ? 'We fill it with gold, in the shape of something that matters to you.' : line(L.missing2), { mood: 'calm', ms: 5200 });
        await K.wait(RED ? 1200 : 1800);
        phase = 'value';
        const chips = showPanel();
        hit.setAttribute('aria-label', 'Choose what matters to you.');
        K.guide({ id: 'value', g: 'choose', target: () => chips.filter(c => c.isConnected), label: 'CHOOSE WHAT MATTERS', place: 'above', delay: 900 });
        await waitFor('patched');
        speaker(drop).say(patchLine(PATCH.m.label), { mood: 'love', moodMs: 0, ms: 3600 });
        await K.wait(RED ? 2200 : 3000);
      }

      /* ---------------- finale: the bowl turns in warm light ---------------- */
      async function finale() {
        phase = 'finale'; K.guide(null);
        hideLabel(); hideKind(); panel.classList.add('ks-away');
        if (!PATCH.baked) { bakePatch(); PATCH.baked = true; }
        finGeom();
        FIN.on = true; FIN.t0 = performance.now(); FIN.k = 0;
        SND.finale(); MUS.vol = 1; amb.level(0.25, 2);
        placeFinaleCast(); still.show(true); still.hush(); still.base('happy'); still.react('bounce');
        speaker(drop).say(soft() ? L.finaleSoft : line(L.finale), { mood: 'love', moodMs: 0, ms: 0 });
        hit.setAttribute('aria-label', 'The mended bowl turning in the light. Drag to turn it.');
        K.guide({ id: 'turn', g: 'drag', target: () => ({ x: FIN.B2.cx - FIN.B2.R * 0.32, y: FIN.B2.Y0 - FIN.B2.R * 0.25 }), dir: 'r', d: Math.round(FIN.B2.R * 0.66), label: 'TURN IT IN THE LIGHT', place: 'below', delay: 1800, once: true });
        K.later(() => { if (A.ctx) SND.rin('A4', 0.08, 5); }, 1500);
        // a glint on the shelf: where this bowl will sit next time
        K.later(() => { const s = G.slot && camPt(G.slot.x, G.slot.y); if (s) P.emit('star', s.x, s.y, 10, { colors: ['#fffbe6', '#ffe08a'], speed: [20, 70] }); }, RED ? 2500 : 7600);
        await K.wait(RED ? 4200 : 6200);
        if (care()) still.say(L.careEnd, { mood: 'calm', ms: 0 }); else still.face('love', 2600);
        await K.wait(RED ? 2400 : 4200);
        end();
      }
      function end() {
        if (finished) return;
        finished = true; phase = 'end';
        const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 1);
        const steady = avg(steadies), pct = Math.round(steady * 100), badges = [];
        const pb = K.best('steady', pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + pct + '% steady trace');
        else if (pb.first) badges.push('Steady trace: ' + pct + '%');
        const tier = K.tier(steady, [0.55, 0.75, 0.9]);
        if (tier) badges.push(tier + ' steady hand');
        const col = K.collect(GZ.name);
        badges.push((col.isNew ? 'New glaze: ' : 'Glaze: ') + GZ.name + ' (' + col.count + ' of ' + GLAZES.length + ')');
        ctx.track('done', { steady: pct, shelf: DATA.n, v: PATCH.m ? PATCH.m.id : '' });
        ctx.finish({
          title: 'Mended with gold', mood: 'calm',
          lines: [NAMED + ' cracks traced in gold', 'The missing piece: ' + (PATCH.m ? PATCH.m.label : 'gold') + ', in gold', 'Your shelf: ' + DATA.n + (DATA.n === 1 ? ' mended bowl' : ' mended bowls') + ', a new glaze each day'],
          share: 'Mended a broken bowl with gold. The cracks are the best part.',
          badges
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => { layout(); if (cv.g && LY.bg) draw(performance.now() / 1000, 0); });
      S.on('theme', () => { el.classList.toggle('ks-bright', !dark()); paintAll(); });
      (async () => {
        await K.intro({ title: 'Kintsugi', sub: 'A broken bowl, mended with gold. Where it broke is where it shines.', how: 'Fit the pieces, then trace each crack slowly with gold.', char: 'drop', mood: 'calm' });
        phase = 'welcome'; musicOn();
        if (A.ctx) SND.rin('D4', 0.06, 4);
        drop.say(soft() ? L.helloSoft : OLD.length ? line(L.back) : line(L.hello), { mood: OLD.length && !soft() ? 'happy' : 'sad', moodMs: 0, ms: 4200 });
        ctx.track('bowl', { glaze: GZI, shelf: OLD.length });
        await K.wait(OLD.length ? 2800 : 2400);
        phase = 'assemble';
        drop.say(line(L.assemble), { mood: 'determined', moodMs: 0, ms: 3800 });
        guideAssemble(1100);
        await waitFor('assembled');
        phase = 'assembled';
        SND.rin('A4', 0.1, 4.6);
        P.emit('mote', G.B.cx, G.B.Y0 - G.B.R * 0.3, 10, { colors: ['#fff3c4', '#ffe0a0'], speed: [10, 40] });
        drop.say(line(L.assembled), { mood: 'happy', moodMs: 1600, ms: 2600 });
        await K.wait(RED ? 1600 : 2300);
        for (let i = 0; i < named.length; i++) await traceCrack(i);
        await missingPiece();
        await finale();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < (ms || 60000)) await K.wait(80); };
          await K.wait(700);
          { const card = el.querySelector('.gk-intro'); if (card && phase === 'intro') await K.sim.tap(card); }
          await until(() => phase === 'assemble' || finished, 20000);
          for (let n = 0; n < 3; n++) {
            const pc = nextPiece(); if (!pc) break;
            await K.wait(450);
            await K.sim.drag(hit, { x: pc.x, y: pc.y }, { x: pc.cx + 2, y: pc.cy + 2 }, 650, 12);
            await until(() => pc.placed || DRAG.pc == null, 3000);
            if (!pc.placed) await K.sim.drag(hit, { x: pc.x, y: pc.y }, { x: pc.cx, y: pc.cy }, 400, 8);
          }
          for (let i = 0; i < named.length; i++) {
            await until(() => (phase === 'trace' && TR.ready && TR.i === i) || finished, 30000);
            await K.wait(450);
            const c = named[i], v = VMAX * G.scale * 0.9, a = pointAt(c, 0);
            const pr = await K.sim.press(hit, a.x, a.y), t0 = performance.now();
            for (;;) { const s = Math.min(c.len, (performance.now() - t0) / 1000 * v + 14), q = pointAt(c, s); pr.move(q.x, q.y); if (c.done || performance.now() - t0 > 20000) break; await K.wait(45); }
            const e = pointAt(c, c.len); pr.up(e.x, e.y);
          }
          await until(() => phase === 'twist' || finished, 30000);
          await K.wait(1000);
          if (phase === 'twist') await K.sim.tap(hit, J.x, J.y);
          await until(() => (phase === 'value' && !panel.classList.contains('ks-away') && panel.querySelector('.ks-chip')) || finished, 30000);
          await K.wait(700);
          { const chips = panel.querySelectorAll('.ks-chip'); if (chips.length) await K.sim.tap(chips[(dayN + 2) % chips.length]); }
          await until(() => phase === 'pour' || finished, 8000);
          await K.wait(700);
          { const pr = await K.sim.press(hit, J.x, J.y); await until(() => PATCH.done || finished, 9000); pr.up(J.x, J.y); }
          await until(() => finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
