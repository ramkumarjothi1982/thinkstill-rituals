/* 029 Tiny Garden — Reset · AMPLIFY · Positive State
 * Mechanism: gratitude practice (Emmons & McCullough 2003; "three good things", Seligman et al. 2005): naming a few
 * specific good things and staying with each one for a moment lifts mood and broadens attention. Each good thing is a
 * seed the player plants, waters and grows by pulling the sun across the sky, so attention rests on it while it blooms.
 * Twist: a worry pops up as a weed. You don't yank it: you plant a good thing beside it and its leaves shade it small.
 * Verb: plant (drag the seed into the soil), water (hold the can), grow (pull the sun across the sky).
 * Finale: golden hour; string lights glow, bees and butterflies visit every flower and a polaroid of the bed develops.
 * The garden is saved (plant shapes and colours only, never words) and grows across visits. Nothing ever wilts.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const ID = 'tiny-garden';
  const KEY = ID + ':garden';

  /* The three kinds of good thing. Each grows its own kind of flower: people bloom as cosmos, small joys as sunflowers
     and daisies, small wins as tall spires. The player's own good words grow a star flower. */
  const KINDS = {
    who: { q: 'Who made today a little better?', sub: 'A person, a pet, even a stranger.',
      pool: [['A friend', 'someone in your corner'], ['Family', 'your people'], ['My pet', 'a furry little hello'], ['A kind stranger', 'a stranger being kind'], ['A good chat', 'a good chat'],
        ['A hug', 'a proper hug'], ['A nice message', 'a message that landed'], ['Someone listened', 'being listened to'], ['A neighbour', 'a friendly face nearby'], ['A workmate', 'someone on your side'],
        ['My partner', 'someone close'], ['Me, for trying', 'you, trying your best']] },
    what: { q: 'Something small you enjoyed?', sub: 'Tiny is perfect. A taste, a sound, a moment.',
      pool: [['Warm coffee', 'that first warm sip'], ['A cup of tea', 'a hot cup of tea'], ['Sunshine', 'sun on your face'], ['Fresh air', 'a breath of fresh air'], ['A good meal', 'a good meal'],
        ['Music', 'a song you like'], ['A hot shower', 'a hot shower'], ['My cosy bed', 'a cosy bed'], ['A funny video', 'a proper laugh'], ['A good book', 'a few good pages'],
        ['Rain sounds', 'rain on the window'], ['A tasty snack', 'a tasty snack'], ['Birdsong', 'a bit of birdsong'], ['A quiet minute', 'a quiet minute']] },
    win: { q: 'A small win today?', sub: 'Tiny counts. Getting up counts.',
      pool: [['Got up', 'getting up'], ['Drank water', 'a glass of water'], ['Went outside', 'getting outside'], ['Replied to someone', 'a reply, sent'], ['Finished a task', 'one thing done'],
        ['Asked for help', 'asking for help'], ['Cooked something', 'feeding yourself'], ['Tidied one thing', 'one tidy corner'], ['Moved my body', 'moving your body'], ['Rested', 'resting when you needed it'],
        ['Said no kindly', 'a kind, clear no'], ['Showed up', 'showing up'], ['Kept going', 'keeping going'], ['Took a break', 'a real break']] }
  };
  const KCOL = { who: ['#ff7aa2', '#c2185b'], what: ['#ffc83d', '#c7841a'], win: ['#9a7bff', '#5a3fcf'], own: ['#ffb38a', '#e0663a'] };
  const RK = ['who', 'what', 'win'];                       // the kind of good thing in each round
  const RH = [0, 2, 1];                                    // the hole each round plants: left, right (beside the weed), centre
  const PR = [[0.12, 0.38], [0.38, 0.64], [0.64, 0.9]];   // the sun's stretch of sky each round: morning, midday, golden hour
  const VIEWS = ['rooftops', 'harbour', 'hills', 'city'];
  /* Today's special visitor (the same all day, a different one tomorrow); they fill a collection over visits. */
  const VISITORS = [
    { name: 'Painted Lady', type: 'fly', c: ['#f28c3a', '#2b1a12', '#ffd9a8'] },
    { name: 'Common Blue', type: 'fly', c: ['#86b6ff', '#34509e', '#d9e8ff'] },
    { name: 'Brimstone', type: 'fly', c: ['#f2e56a', '#b8a62e', '#fffbe0'] },
    { name: 'Peacock', type: 'fly', c: ['#c4392d', '#2a1a2e', '#86b6ff'] },
    { name: 'Bumblebee', type: 'bee', c: ['#ffcf3a', '#2a2018', '#ffffff'] },
    { name: 'Ladybird', type: 'lady', c: ['#e8352c', '#1a1414', '#ffffff'] },
    { name: 'Hawk-moth', type: 'fly', c: ['#a8784a', '#4f3420', '#f0a050'] },
    { name: 'Orange Tip', type: 'fly', c: ['#fffdf5', '#f2862e', '#ece6d6'] }
  ];
  /* Flower colours by kind: [petal, light tip, eye/disc]. A plant's seed picks one, so every flower is its own. */
  const PAL = {
    who: [['#ff6f9c', '#ffc6d8', '#b8285e'], ['#ff8a6b', '#ffd6c6', '#c4472b'], ['#e65aa0', '#ffb8de', '#93256a'], ['#ff9cc2', '#fff2f7', '#d05a88'], ['#f2546f', '#ffa8ba', '#a51f3c']],
    what: [['#ffc531', '#ffe27a', '#5c3517'], ['#fffaf0', '#ffffff', '#f0b21c'], ['#ff9a3c', '#ffd08a', '#5a2f12'], ['#ffdb4d', '#fff3b0', '#6e4318'], ['#f6a05a', '#ffd6aa', '#5b351a']],
    win: [['#8e6cff', '#d9ceff', '#6a4ad8'], ['#5d7cff', '#c2cfff', '#3d56cf'], ['#b25cff', '#ebceff', '#8a3ad6'], ['#ff74cc', '#ffd3ef', '#d6489f'], ['#4cabff', '#cbeaff', '#2a7fd0']],
    own: [['#ffae86', '#fff1e8', '#ff7a59'], ['#78dccb', '#eafffb', '#2fa892'], ['#ffbde9', '#ffffff', '#e070b8'], ['#ffd164', '#fff8dc', '#e8a21c']]
  };
  /* Stem L-systems (S is the axiom). F a stem segment, f a short one, + and - turn, [ ] branch, L a leaf,
     B the main bloom, Q a second bloom, b a small bloom, c a floret, e a closed tip, t a curling tendril. */
  const SPEC = {
    who: { iters: 2, rules: { S: (R) => 'FLF' + (R() < 0.55 ? '[+T]' : '[+FLQ]') + 'FL[-T]F' + (R() < 0.45 ? '[+Fb]' : '') + 'FFB', T: (R) => (R() < 0.5 ? 'FFLQ' : 'F[-Fb]FLQ') },
      ang: 0.5, angJ: 0.5, decay: 0.78, bend: 0.16, trop: 0.15, top: 0.8, wide: 0.24, w0: 0.016, stem: '#4b8a3d', leaf: 'fine', leafLen: 0.14, leafAng: 1.05, bloom: 'cosmos' },
    what: { iters: 1, rules: { S: (R) => (R() < 0.45 ? 'FLFL[+FFLb]FLFFB' : 'FLFLFLFFB') },
      ang: 0.62, angJ: 0.4, decay: 0.8, bend: 0.1, trop: 0.24, top: 0.9, wide: 0.17, w0: 0.026, stem: '#5a8b35', leaf: 'heart', leafLen: 0.2, leafAng: 1.45, bloom: 'sun' },
    win: { iters: 2, rules: { S: (R) => 'FLFL' + (R() < 0.5 ? '[-FLP]' : '') + 'FFP', P: (R) => { let s = ''; const n = 6 + Math.floor(R() * 3); for (let i = 0; i < n; i++) s += 'f[+c][-c]'; return s + 'fe'; } },
      ang: 0.62, angJ: 0.3, decay: 0.74, bend: 0.06, trop: 0.34, top: 1.0, wide: 0.14, w0: 0.019, stem: '#4a7f45', leaf: 'palm', leafLen: 0.13, leafAng: 1.2, bloom: 'spire' },
    own: { iters: 2, rules: { S: (R) => 'F[+FT]FL[-FLb]F[+FT]FL' + (R() < 0.5 ? '[-Fb]' : '') + 'FB', T: (R) => 'F' + (R() < 0.5 ? 'L' : '') + 't' },
      ang: 0.62, angJ: 0.5, decay: 0.8, bend: 0.2, trop: 0.13, top: 0.84, wide: 0.22, w0: 0.012, stem: '#4f9a6a', leaf: 'oval', leafLen: 0.13, leafAng: 1.1, bloom: 'star' }
  };
  const BR = { who: { B: 0.105, Q: 0.08, b: 0.056 }, what: { B: 0.15, b: 0.068 }, win: { c: 0.044, e: 0.028 }, own: { B: 0.1, b: 0.062 } };
  const GENERIC = new Set(['THAT THING I SAID', "TOMORROW'S LIST", 'WHAT IF IT GOES WRONG', "SHOULD'VE DONE BETTER", 'WHAT THEY THINK', 'EVERYTHING AT ONCE', 'THE BIG WORRY']);
  const POS = /\b(BEST|LOVE[DS]?|LOVELY|LAUGH\w*|HAPP\w*|PROUD|GRATEFUL|THANKFUL|FUN|GREAT|AMAZING|AWESOME|NICE|ENJOY\w*|BEAUTIFUL|GOOD|WIN|WON|NAILED|CELEBRAT\w*|EXCITED|BUZZING|SMIL\w*|HUGS?|SUNNY|SUNSHINE|FINALLY|DELICIOUS|PEACEFUL|COSY|COZY|JOY\w*|THRILLED|STOKED|WONDERFUL|SWEET|KIND|CHEER\w*|PROMOTED|ENGAGED|PASSED MY)\b/;
  const NEG = /\b(WORR\w*|ANX\w*|SCARED|AFRAID|SAD|HATE\w*|STRESS\w*|FAIL\w*|USELESS|TIGHT|PANIC\w*|CRY\w*|ANGRY|MISS(ED|ING)?|LOST|GRIEF|GRIEV\w*|PASSED AWAY|ARGU\w*|FIGHT\w*|HURT\w*|PAIN\w*|SICK|ILL|TIRED|EXHAUST\w*|CAN'?T|CANNOT|DON'?T|NEVER|NOT|NOBODY|ALONE|LONELY|BAD|AWFUL|TERRIBLE|WORST|WRONG|SHOULD\w*|WHAT IF|DEADLINE|EMBARRASS\w*|GUILT\w*|SHAME\w*|ASHAMED|DEBT|BILLS?|OVERWHELM\w*|DIED|DEATH|FUNERAL)\b/;
  const SCALE = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6', 'E6', 'G6', 'A6', 'B6', 'D7'];
  const BARS = [['G2', ['G4', 'B4', 'D5', 'A5']], ['E2', ['E4', 'G4', 'B4', 'D5']], ['C3', ['E4', 'G4', 'C5', 'D5']], ['D3', ['D4', 'F#4', 'A4', 'E5']]];
  const SOILC = ['#5e3f2a', '#7a5539', '#3f2a1c', '#8c6646'];

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const outBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);
  const lerpAng = (a, b, k) => { const d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * k; };
  const mixHex = (a, b, k) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), m = (s) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k));
    return '#' + ((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1);
  };
  const hexA = (hex, a) => { const p = parseInt(hex.slice(1), 16); return 'rgba(' + ((p >> 16) & 255) + ',' + ((p >> 8) & 255) + ',' + (p & 255) + ',' + a + ')'; };
  function xr(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function softwareGfx() {
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
    } catch (e) { return false; }
  }
  /* Petal and leaf outlines, each one unit long along +x. */
  let PATH = null;
  function paths() {
    if (PATH) return PATH;
    const P2 = (d) => new Path2D(d);
    PATH = {
      cosmos: P2('M0 0 C0.22 -0.2 0.58 -0.36 0.92 -0.3 L0.87 -0.12 L1 0 L0.87 0.12 L0.92 0.3 C0.58 0.36 0.22 0.2 0 0 Z'),
      ray: P2('M0 0 C0.3 -0.16 0.74 -0.14 1 0 C0.74 0.14 0.3 0.16 0 0 Z'),
      daisy: P2('M0 0 C0.2 -0.09 0.8 -0.11 0.95 -0.06 Q1.02 0 0.95 0.06 C0.8 0.11 0.2 0.09 0 0 Z'),
      star: P2('M0 0 C0.24 -0.34 0.62 -0.26 1 0 C0.62 0.26 0.24 0.34 0 0 Z'),
      heart: P2('M0 0 C0.1 -0.42 0.62 -0.54 1 0 C0.62 0.54 0.1 0.42 0 0 Z'),
      oval: P2('M0 0 C0.24 -0.3 0.7 -0.3 1 0 C0.7 0.3 0.24 0.3 0 0 Z'),
      leaflet: P2('M0 0 C0.25 -0.14 0.75 -0.13 1 0 C0.75 0.13 0.25 0.14 0 0 Z'),
      bell: P2('M0 0 C0.16 -0.44 0.7 -0.52 1 -0.34 L0.94 0 L1 0.34 C0.7 0.52 0.16 0.44 0 0 Z'),
      bud: P2('M0 0 C0.08 -0.38 0.6 -0.44 1 0 C0.6 0.44 0.08 0.38 0 0 Z'),
      jag: P2('M0 0 L0.12 -0.1 L0.2 -0.04 L0.32 -0.2 L0.4 -0.07 L0.55 -0.24 L0.62 -0.08 L0.78 -0.18 L0.82 -0.05 L1 0 L0.82 0.05 L0.78 0.16 L0.62 0.07 L0.55 0.2 L0.4 0.06 L0.32 0.16 L0.2 0.03 L0.12 0.08 Z')
    };
    return PATH;
  }
  /* Grow a plant's shape from its kind and seed: an L-system string read by a turtle, normalised to one unit tall,
     with a growth time on every part (the stem climbs first, leaves unfurl as it passes, blooms open at the tips). */
  function buildPlant(kind, seed, hue) {
    const sp = SPEC[kind] || SPEC.what, R = xr(seed * 7919 + 13);
    let str = 'S';
    for (let i = 0; i < sp.iters; i++) { let o = ''; for (const ch of str) { const r = sp.rules[ch]; o += r ? r(R) : ch; } str = o; }
    const segs = [], leaves = [], blooms = [], curls = [], stack = [];
    let x = 0, y = 0, a = -Math.PI / 2 + (R() - 0.5) * 0.14, d = 0, dep = 0, side = R() < 0.5 ? 1 : -1;
    for (const ch of str) {
      if (ch === 'F' || ch === 'f') {
        const l = (ch === 'f' ? 0.36 : 1) * Math.pow(sp.decay, dep) * (0.86 + R() * 0.28);
        a += (R() - 0.5) * sp.bend; a += (-Math.PI / 2 - a) * sp.trop;
        const nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l;
        segs.push({ x0: x, y0: y, x1: nx, y1: ny, d0: d, d1: d + l, dep });
        x = nx; y = ny; d += l;
      } else if (ch === '+') a += sp.ang * (1 + (R() - 0.5) * sp.angJ);
      else if (ch === '-') a -= sp.ang * (1 + (R() - 0.5) * sp.angJ);
      else if (ch === '[') { stack.push([x, y, a, d, dep]); dep++; }
      else if (ch === ']') { const st = stack.pop(); if (st) { x = st[0]; y = st[1]; a = st[2]; d = st[3]; dep = st[4]; } }
      else if (ch === 'L') { side = -side; leaves.push({ x, y, a: a + side * sp.leafAng * (0.85 + R() * 0.35), d, dep, s: (0.82 + R() * 0.36) * Math.pow(0.86, dep) }); }
      else if (ch === 't') curls.push({ x, y, a, d, dir: R() < 0.5 ? 1 : -1, s: 0.07 + R() * 0.04 });
      else if ('BQbce'.indexOf(ch) >= 0) blooms.push({ ch, x, y, a, d, dep, rot: R() * TAU, s: 0.9 + R() * 0.2 });
    }
    let minY = -0.01, ext = 0.01, maxD = 0.01;
    for (const s of segs) { minY = Math.min(minY, s.y1); ext = Math.max(ext, Math.abs(s.x1)); maxD = Math.max(maxD, s.d1); }
    const ky = sp.top / -minY, kx = Math.min(ky, sp.wide / ext), T = (dd) => dd / maxD * 0.7;
    const wi = kind === 'what' && seed % PAL.what.length === 1;
    for (const s of segs) { s.x0 *= kx; s.x1 *= kx; s.y0 *= ky; s.y1 *= ky; s.t0 = T(s.d0); s.t1 = T(s.d1); s.w = sp.w0 * (1 - 0.5 * s.d0 / maxD) * (s.dep ? 0.72 : 1); }
    for (const l of leaves) { l.x *= kx; l.y *= ky; l.t = T(l.d) + 0.02; }
    for (const c of curls) { c.x *= kx; c.y *= ky; c.t = T(c.d) + 0.02; }
    const pals = PAL[kind] || PAL.what, pal = pals[seed % pals.length];
    const tone = (c) => (hue > 0 ? mixHex(c, '#ffffff', hue) : hue < 0 ? mixHex(c, '#000000', -hue) : c);
    for (const b of blooms) {
      b.x *= kx; b.y *= ky; b.t = T(b.d);
      const fr = clamp01((b.d / maxD - 0.5) / 0.5);
      b.r = (BR[kind][b.ch] || 0.05) * b.s * (b.ch === 'c' ? 1.15 - 0.55 * fr : 1);
      if (b.ch === 'c') b.col = mixHex(tone(pal[0]), pal[1], fr * 0.55);
    }
    // bounds, so a finished plant can be cached as one sprite
    let bx0 = -0.02, bx1 = 0.02, by0 = -0.02;
    const grow = (px, py) => { bx0 = Math.min(bx0, px); bx1 = Math.max(bx1, px); by0 = Math.min(by0, py); };
    for (const s of segs) { grow(s.x1 - s.w, s.y1 - s.w); grow(s.x1 + s.w, s.y1); }
    for (const l of leaves) { const L = sp.leafLen * l.s; grow(l.x + Math.cos(l.a) * L * 1.05, l.y + Math.sin(l.a) * L * 1.05); grow(l.x - L * 0.4, l.y - L * 0.4); grow(l.x + L * 0.4, l.y + L * 0.1); }
    for (const b of blooms) { grow(b.x - b.r * 1.15, b.y - b.r * 1.15); grow(b.x + b.r * 1.15, b.y + b.r * 0.5); }
    for (const c of curls) { grow(c.x - c.s * 1.4, c.y - c.s * 1.4); grow(c.x + c.s * 1.4, c.y); }
    const n = kind === 'who' ? 7 + (seed % 3) : kind === 'what' ? (wi ? 20 + (seed % 4) : 14 + (seed % 5)) : 6;
    return {
      kind, seed, segs, leaves, blooms, curls, n, white: wi, bloom: wi ? 'daisy' : sp.bloom, leafType: sp.leaf, leafLen: sp.leafLen,
      stem: sp.stem, leafC: kind === 'win' ? '#5b9c4f' : '#5ea548', leafD: '#3d7a36', leafL: '#9bd37a', budC: '#6aa84f',
      pet: tone(pal[0]), pet2: tone(pal[1]), petD: mixHex(tone(pal[0]), '#7a3a10', 0.22), eye: pal[2], seedC: '#3a2414', seedL: '#8a5a2a',
      bx0, bx1, by0, by1: 0.03
    };
  }
  function goodPhrases(an, text) {
    if (!String(text || '').trim() || !an || an.safety === 'support') return [];
    const out = [], seen = new Set();
    const positive = an.parent === 'Positive State' || (Array.isArray(an.parents2) && an.parents2.includes('Positive State'));
    const add = (s) => {
      if (!s || !s.label || s.generic || (s.loop && s.loop !== 'other')) return;
      const raw = String(s.label).replace(/\s+/g, ' ').trim(), k = raw.replace(/[’‘]/g, "'").toUpperCase();
      if (!raw || GENERIC.has(k) || seen.has(k) || NEG.test(k) || !(positive || POS.test(k)) || k.replace(/[^A-Z]/g, '').length < 3) return;
      seen.add(k); out.push(raw);
    };
    add(an.core); (an.strands || []).forEach(add);
    return out.slice(0, 2).map(raw => {
      let s = raw.toLowerCase().replace(/\bi\b/g, 'I').replace(/\bi'/g, "I'");
      s = s.charAt(0).toUpperCase() + s.slice(1);
      if (s.length > 26) { const w = s.split(' '); let o = ''; for (const x of w) { if ((o + ' ' + x).trim().length > 23) break; o = (o + ' ' + x).trim(); } s = (o || s.slice(0, 23)) + '…'; }
      return s;
    });
  }

  (env.games = env.games || []).push({
    id: ID, mode: 'reset', name: 'Tiny Garden', verb: 'plant', family: 'AMPLIFY', minutes: 2,
    parents: ['Positive State', 'Values / Meaning / Grief', 'Emotion'],
    cast: ['drop', 'still'], poster: { char: 'drop', mood: 'grow' },
    tagline: 'Plant three good things, then pull the sun across until they bloom.',
    why: 'For a flat or heavy day: three small good things, grown slowly enough to land.',
    fonts: ['DynaPuff:wght@500;700', 'Patrick+Hand', 'Nunito:wght@600;700;800'],
    css: `
.g-tiny-garden { --tg-ui: "Nunito", "Poppins", "Segoe UI", system-ui, sans-serif; --tg-hand: "Patrick Hand", "Segoe Print", "Bradley Hand", "Poppins", cursive; --tg-disp: "DynaPuff", "Poppins", "Baloo 2", system-ui, sans-serif;
  --tg-panel: rgba(30, 25, 46, 0.95); --tg-panel2: rgba(50, 40, 70, 0.96); --tg-ink: #fff6ea; --tg-muted: #e6dacb; --tg-line: rgba(255, 232, 205, 0.2); --tg-chip: rgba(255, 255, 255, 0.08); --tg-warm: #ffc46b; background: #182241; }
.g-tiny-garden.tg-bright { --tg-panel: rgba(255, 251, 244, 0.96); --tg-panel2: rgba(255, 244, 228, 0.97); --tg-ink: #3b2a1b; --tg-muted: #6c573f; --tg-line: rgba(70, 48, 28, 0.16); --tg-chip: rgba(255, 255, 255, 0.96); --tg-warm: #c2611b; background: #a9d6ee; }
.g-tiny-garden .gk-intro { background: radial-gradient(ellipse at 50% 42%, rgba(255, 200, 140, 0.32), rgba(14, 22, 42, 0.9)); -webkit-backdrop-filter: none; backdrop-filter: none; color: #fff8ee; }
.g-tiny-garden .gk-intro-title { font-family: var(--tg-disp); font-weight: 700; font-size: clamp(48px, 13.5cqw, 86px); line-height: 0.98; color: #ffe2a8; text-shadow: 0 3px 0 #b5562a, 0 12px 30px rgba(0, 0, 0, 0.4); }
.g-tiny-garden .gk-intro-sub { font-family: var(--tg-ui); font-weight: 700; color: #fff3e2; }
.g-tiny-garden .gk-intro-how { font-family: var(--tg-ui); font-weight: 800; color: #ffd27a; }
.g-tiny-garden .gk-intro-tap { color: #f3e6d2; }
.g-tiny-garden .tg-sun { position: absolute; z-index: 25; left: 0; top: 0; width: 84px; height: 84px; margin: -42px 0 0 -42px; border-radius: 50%; touch-action: none; cursor: grab; outline: none; }
.g-tiny-garden .tg-sun::after { content: ""; position: absolute; inset: 8px; border-radius: 50%; border: 3px dashed rgba(255, 240, 200, 0.95); opacity: 0; transition: opacity 0.3s ease; animation: tiny-garden-spin 10s linear infinite; }
.g-tiny-garden .tg-sun.tg-live::after { opacity: 1; }
.g-tiny-garden .tg-sun:focus-visible::after { opacity: 1; border-style: solid; }
@keyframes tiny-garden-spin { to { transform: rotate(360deg); } }
.g-tiny-garden .tg-seed { position: absolute; z-index: 27; left: 0; top: 0; width: 68px; height: 68px; margin: -34px 0 0 -34px; touch-action: none; cursor: grab; outline: none; display: grid; place-items: center;
  transition: transform 0.4s cubic-bezier(.3, 1.4, .5, 1), opacity 0.3s ease; }
.g-tiny-garden .tg-seed svg { width: 44px; height: 44px; overflow: visible; filter: drop-shadow(0 5px 5px rgba(0, 0, 0, 0.35)); transition: transform 0.3s ease; animation: tiny-garden-bob 2.2s ease-in-out infinite; }
.g-tiny-garden .tg-seed[hidden], .g-tiny-garden .tg-cam[hidden] { display: none; }
.g-tiny-garden .tg-seed.tg-held { transition: none; cursor: grabbing; }
.g-tiny-garden .tg-seed.tg-held svg { animation: none; transform: scale(1.22) rotate(-8deg); }
.g-tiny-garden .tg-seed.tg-sink { opacity: 0; }
.g-tiny-garden .tg-seed.tg-sink svg { animation: none; transform: scale(0.35); }
.g-tiny-garden .tg-seed:focus-visible svg { outline: 3px solid #fff; outline-offset: 4px; border-radius: 50%; }
@keyframes tiny-garden-bob { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-5px) rotate(4deg); } }
.g-tiny-garden .tg-can { position: absolute; z-index: 28; left: 0; top: 0; width: 98px; height: 98px; margin: -49px 0 0 -49px; padding: 0; border: 0; background: none; cursor: pointer; touch-action: none; outline: none; -webkit-tap-highlight-color: transparent;
  transition: transform 0.7s cubic-bezier(.3, 1.15, .5, 1), opacity 0.35s ease; }
.g-tiny-garden .tg-can .tg-canart { position: absolute; inset: 7px; transform-origin: 72% 64%; transition: transform 0.3s cubic-bezier(.3, 1.4, .5, 1); }
.g-tiny-garden .tg-can .tg-canart svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)); }
.g-tiny-garden .tg-can.tg-pour .tg-canart { transform: rotate(-34deg) translateY(-4px); }
.g-tiny-garden .tg-can:focus-visible .tg-canart { outline: 3px solid #fff; outline-offset: 2px; border-radius: 16px; }
.g-tiny-garden .tg-ring { position: absolute; inset: -3px; opacity: 0; transition: opacity 0.3s ease; pointer-events: none; }
.g-tiny-garden .tg-can.tg-ready .tg-ring { opacity: 1; }
.g-tiny-garden .tg-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
.g-tiny-garden .tg-ring circle { fill: none; stroke-width: 6; }
.g-tiny-garden .tg-rtrack { stroke: rgba(255, 255, 255, 0.28); }
.g-tiny-garden .tg-rzone { stroke: rgba(150, 236, 130, 0.9); stroke-dasharray: var(--zl, 20) 100; stroke-dashoffset: var(--zo, -80); }
.g-tiny-garden .tg-rfill { stroke: #8fd8ff; stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: calc(100 - var(--m, 0) * 100); transition: stroke 0.2s ease; }
.g-tiny-garden .tg-can.tg-inzone .tg-rfill { stroke: #b6ff9c; }
.g-tiny-garden .tg-can.tg-inzone .tg-ring svg { filter: drop-shadow(0 0 6px rgba(170, 255, 140, 0.9)); }
.g-tiny-garden .tg-panel { position: absolute; z-index: 34; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); width: min(560px, calc(100% - 20px)); box-sizing: border-box; transform: translateX(-50%); padding: 13px 12px 14px;
  border-radius: 24px; background: linear-gradient(180deg, var(--tg-panel2), var(--tg-panel)); border: 1px solid var(--tg-line); color: var(--tg-ink); font-family: var(--tg-ui);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12); display: flex; flex-direction: column; gap: 10px; transition: transform 0.55s cubic-bezier(.3, 1.2, .5, 1), opacity 0.35s ease; }
.g-tiny-garden .tg-panel.tg-away { transform: translate(-50%, calc(100% + 40px)); opacity: 0; pointer-events: none; }
.g-tiny-garden .tg-q { margin: 0; text-align: center; }
.g-tiny-garden .tg-q b { display: block; font: 700 19px/1.2 var(--tg-disp); color: var(--tg-ink); }
.g-tiny-garden .tg-q span { display: block; margin-top: 3px; font: 700 14px/1.3 var(--tg-ui); color: var(--tg-muted); }
.g-tiny-garden .tg-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; }
.g-tiny-garden .tg-chip { appearance: none; cursor: pointer; min-height: 44px; padding: 8px 14px 8px 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px; font: 700 15px/1.1 var(--tg-ui); color: var(--tg-ink);
  background: var(--tg-chip); border: 1.5px solid color-mix(in srgb, var(--tg-warm) 48%, transparent); box-shadow: 0 2px 0 rgba(0, 0, 0, 0.08); transition: transform 0.15s ease, background 0.2s ease; }
.g-tiny-garden .tg-chip i { width: 13px; height: 17px; flex: none; border-radius: 50% 50% 46% 46% / 58% 58% 42% 42%; background: radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0) 46%), var(--c); box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.18); }
.g-tiny-garden .tg-chip .gk-user { font-size: 16px; }
.g-tiny-garden .tg-chip:active { transform: scale(0.95); }
.g-tiny-garden .tg-chip.tg-picked { background: color-mix(in srgb, var(--tg-warm) 30%, var(--tg-chip)); transform: scale(1.05); }
.g-tiny-garden .tg-chip:focus-visible { outline: 3px solid var(--tg-ink); outline-offset: 2px; }
.g-tiny-garden .tg-tag { position: absolute; z-index: 22; left: 0; top: 0; box-sizing: border-box; width: max-content; max-width: var(--mw, 110px); padding: 5px 9px 6px; border-radius: 8px; text-align: center; pointer-events: none;
  font: 400 15px/1.08 var(--tg-hand); color: #4a2f17; background: linear-gradient(180deg, #fcecd0, #ecd09f); border: 1px solid #b98a52; box-shadow: 0 3px 0 #a87a45, 0 7px 12px rgba(0, 0, 0, 0.28); text-wrap: balance;
  transform: translate(-50%, 0) rotate(var(--rot, 0deg)); animation: tiny-garden-tag 0.6s cubic-bezier(.3, 1.6, .5, 1) both; }
.g-tiny-garden .tg-tag::before { content: ""; position: absolute; left: 50%; top: 3px; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; background: #8a6440; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4); }
.g-tiny-garden .tg-tag span { display: block; padding-top: 4px; }
.g-tiny-garden .tg-tag .gk-user { font-size: 16px; font-weight: 400; }
@keyframes tiny-garden-tag { from { opacity: 0; transform: translate(-50%, -14px) scale(0.6) rotate(-8deg); } to { opacity: 1; transform: translate(-50%, 0) rotate(var(--rot, 0deg)); } }
.g-tiny-garden .tg-wsign { position: absolute; z-index: 21; left: 0; top: 0; box-sizing: border-box; width: max-content; max-width: var(--mw, 170px); padding: 6px 11px 8px; border-radius: 10px; text-align: center; pointer-events: none;
  background: #5b626e; color: #f3f5f8; border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 7px 16px rgba(0, 0, 0, 0.32); transform: translate(-50%, -100%); transition: opacity 0.9s ease; animation: tiny-garden-sign 0.55s cubic-bezier(.3, 1.6, .5, 1) both; }
.g-tiny-garden .tg-wsign::after { content: ""; position: absolute; left: 50%; bottom: -13px; width: 3px; height: 13px; margin-left: -1.5px; background: #6d5a45; border-radius: 2px; }
.g-tiny-garden .tg-wsign small { display: block; font: 800 12px/1.2 var(--tg-ui); letter-spacing: 0.08em; text-transform: uppercase; color: #d3d9e2; }
.g-tiny-garden .tg-wsign .tg-wt { display: block; font: 800 15px/1.18 var(--tg-ui); letter-spacing: 0.02em; }
.g-tiny-garden .tg-wsign.tg-shaded { opacity: 0; animation: none; }
@keyframes tiny-garden-sign { from { opacity: 0; transform: translate(-50%, -60%) scale(0.5); } to { opacity: 1; transform: translate(-50%, -100%); } }
.g-tiny-garden .tg-weedhit { position: absolute; z-index: 23; left: 0; top: 0; width: 70px; height: 90px; margin: -90px 0 0 -35px; touch-action: none; cursor: pointer; }
.g-tiny-garden .tg-cam { position: absolute; z-index: 36; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 24px); transform: translateX(-50%); min-height: 58px; padding: 0 24px 0 16px; border-radius: 999px; border: 0; cursor: pointer;
  display: inline-flex; align-items: center; gap: 10px; font: 800 17px/1 var(--tg-ui); color: #3b2410; background: linear-gradient(180deg, #ffe6b0, #ffb45e); box-shadow: 0 12px 26px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  animation: tiny-garden-cam 0.6s cubic-bezier(.3, 1.5, .5, 1) both; }
.g-tiny-garden .tg-cam svg { width: 30px; height: 30px; flex: none; }
.g-tiny-garden .tg-cam:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-tiny-garden .tg-cam.tg-out { opacity: 0; animation: none; transform: translateX(-50%); transition: opacity 0.3s ease; pointer-events: none; }
@keyframes tiny-garden-cam { from { opacity: 0; transform: translate(-50%, 30px) scale(0.8); } to { opacity: 1; transform: translateX(-50%); } }
.g-tiny-garden .tg-flash { position: absolute; inset: 0; z-index: 45; background: #fff8ec; pointer-events: none; opacity: 0; transition: opacity 0.5s ease; }
.g-tiny-garden .tg-flash.tg-on { opacity: 0.5; transition: none; }
.g-tiny-garden .tg-photo { position: absolute; z-index: 46; left: 50%; top: var(--py, 16%); width: var(--pw, 250px); box-sizing: content-box; padding: 10px 10px 0; background: #fffdf8; border-radius: 4px; pointer-events: none;
  box-shadow: 0 20px 44px rgba(0, 0, 0, 0.42), 0 2px 0 rgba(0, 0, 0, 0.06); transform: translate(-50%, 0) rotate(-3deg); animation: tiny-garden-photo 0.95s cubic-bezier(.2, 1.15, .4, 1) both; }
.g-tiny-garden .tg-photo canvas { display: block; width: 100%; height: auto; border-radius: 2px; }
.g-tiny-garden .tg-photo .tg-dev { position: absolute; left: 10px; right: 10px; top: 10px; height: var(--ph, 200px); background: #f6efe0; transition: opacity 1.8s ease; }
.g-tiny-garden .tg-photo.tg-developed .tg-dev { opacity: 0; }
.g-tiny-garden .tg-photo p { margin: 0; padding: 9px 4px 12px; text-align: center; font: 400 19px/1.15 var(--tg-hand); color: #3b2a1b; text-wrap: balance; }
.g-tiny-garden .tg-photo p small { display: block; margin-top: 3px; font: 700 13px/1.3 var(--tg-ui); color: #7a6650; }
@keyframes tiny-garden-photo { from { opacity: 0; transform: translate(-50%, 50px) rotate(5deg) scale(0.82); } to { opacity: 1; transform: translate(-50%, 0) rotate(-3deg); } }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = [0, 1, 2].includes(ctx.intensity) ? ctx.intensity : 1;
      const RED = K.reduced(), dayN = K.daily();
      const line = (o) => ctx.line(o);
      const dark = () => K.dark();
      const care = () => an.safety === 'care';
      const SOFT = softwareGfx();
      const rnd = Math.random;
      const noWords = !String(ctx.text || '').trim();
      const devQ = (k) => { try { return S.isDev() ? new URLSearchParams(location.search).get(k) : null; } catch (e) { return null; } };
      const VIEW = VIEWS.includes(devQ('tgview')) ? devQ('tgview') : K.dailyPick(VIEWS, 3), VISITOR = K.dailyPick(VISITORS, 5);
      const Z = { lo: [0.68, 0.78, 0.84][inten], hi: [1.08, 1.02, 1.0][inten] };
      const WATER_T = [2.3, 1.9, 1.7][inten], SUN_T = [3.4, 2.8, 2.3][inten];
      paths();

      /* ---------------- the saved garden: plant shapes and colours only, never words ---------------- */
      const DATA = (() => {
        const d = S.store.get(KEY, null), ok = d && typeof d === 'object' && Array.isArray(d.plants);
        const plants = ok ? d.plants.filter(p => p && SPEC[p.k]).slice(0, 400).map(p => ({ k: p.k, s: (Number(p.s) >>> 0) % 1000000, h: Math.max(-0.2, Math.min(0.2, Number(p.h) || 0)) })) : [];
        return { plants, n: ok ? Math.max(plants.length, d.n | 0) : 0, weeds: ok ? (d.weeds | 0) : 0, seen: ok ? (d.seen | 0) : 0 };
      })();
      const save = () => S.store.set(KEY, { v: 1, plants: DATA.plants, n: DATA.n, weeds: DATA.weeds, seen: DATA.seen });
      const OLD = DATA.plants.slice();
      const oldP = OLD.map(d => buildPlant(d.k, d.s, d.h));
      const OWN = goodPhrases(an, ctx.text);
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && a.safety !== 'support' && !WEED.on) an = a; }, () => {});

      /* ---------------- scene ---------------- */
      el.classList.toggle('tg-bright', !dark());
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1.25 : 1.6 });
      const P = K.particles({ max: SOFT ? 200 : 340 });
      const SEED_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><defs><radialGradient id="tgSeedG" cx="36%" cy="30%" r="74%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".32" style="stop-color:var(--c)"/><stop offset="1" style="stop-color:var(--c2)"/></radialGradient></defs>' +
        '<path d="M21 9c-1.5-4 1-7 5-6.5" fill="none" stroke="#5aa64a" stroke-width="2.6" stroke-linecap="round"/><path d="M25.5 3.2c2.5-1 5 .4 5 2.6-2.4.9-4.4.2-5-2.6z" fill="#7cc45a"/>' +
        '<ellipse cx="20" cy="23" rx="10.5" ry="13.2" fill="url(#tgSeedG)" transform="rotate(-14 20 23)"/><path d="M14.6 18.5c1.4-3 3.8-4.6 6.8-4.8" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.2" stroke-linecap="round"/></svg>';
      const CAN_SVG = '<span class="tg-canart"><svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<path d="M62 33c13-15 33-7 30 13" fill="none" stroke="#2f7466" stroke-width="7.5" stroke-linecap="round"/>' +
        '<path d="M33 56 L10 33" stroke="#3f8a7b" stroke-width="8" stroke-linecap="round"/><ellipse cx="8" cy="31" rx="8" ry="5.5" transform="rotate(-45 8 31)" fill="#2f7466"/>' +
        '<rect x="29" y="38" width="54" height="48" rx="13" fill="#7cc8b6"/><rect x="29" y="72" width="54" height="14" rx="7" fill="#5aa999"/>' +
        '<path d="M37 47c0-3.4 2.4-5.6 5.6-5.6H54" stroke="#fff" stroke-opacity=".65" stroke-width="4.4" stroke-linecap="round" fill="none"/>' +
        '<g transform="translate(64 58)"><circle r="3" fill="#ffd56b"/><circle cx="0" cy="-5.5" r="3.4" fill="#fff6f8"/><circle cx="5.2" cy="-1.7" r="3.4" fill="#fff6f8"/><circle cx="3.2" cy="4.5" r="3.4" fill="#fff6f8"/><circle cx="-3.2" cy="4.5" r="3.4" fill="#fff6f8"/><circle cx="-5.2" cy="-1.7" r="3.4" fill="#fff6f8"/><circle r="2.6" fill="#ffc531"/></g>' +
        '</svg></span><span class="tg-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="tg-rtrack" cx="50" cy="50" r="47" pathLength="100"/><circle class="tg-rzone" cx="50" cy="50" r="47" pathLength="100"/><circle class="tg-rfill" cx="50" cy="50" r="47" pathLength="100"/></svg></span>';
      const CAM_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="9" width="26" height="18" rx="4" fill="#3b2410"/><path d="M11 9l2-3.5h6L21 9z" fill="#3b2410"/><circle cx="16" cy="18" r="6.2" fill="#ffe6b0"/><circle cx="16" cy="18" r="3.8" fill="#3b2410"/><circle cx="14.6" cy="16.6" r="1.2" fill="#fff"/><rect x="23" y="12" width="3.2" height="2.2" rx="1" fill="#ffb45e"/></svg>';
      const sunEl = h('div', { class: 'tg-sun', role: 'slider', tabindex: '-1', 'aria-label': 'The sun. Drag it across the sky to grow the flower.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' });
      const seedEl = h('div', { class: 'tg-seed', role: 'button', tabindex: '-1', 'aria-label': 'A seed. Drag it into the glowing spot in the soil.', hidden: true, html: SEED_SVG });
      const canEl = h('button', { type: 'button', class: 'tg-can', 'aria-label': 'Watering can. Press and hold to water the seed.', html: CAN_SVG });
      const weedHit = h('div', { class: 'tg-weedhit', 'aria-hidden': 'true', hidden: true });
      const panel = h('div', { class: 'tg-panel tg-away', role: 'group' });
      const camEl = h('button', { type: 'button', class: 'tg-cam', hidden: true }, h('span', { html: CAM_SVG }), h('span', { text: 'Take a photo' }));
      el.append(sunEl, weedHit, seedEl, canEl, panel, camEl);
      const charSize = () => (K.phone() ? 72 : 96);
      const drop = K.character('drop', { side: 'right', mood: 'happy', x: 10, y: 64, size: charSize() });
      const still = K.character('still', { side: 'right', mood: 'calm', x: 10, y: 64, size: charSize() });
      still.show(false);

      /* ---------------- sound: a kalimba garden bed, birds in the air, and a voice for every action ---------------- */
      const amb = K.ambience('dawn');
      amb.level(0.32, 2);
      const MUS = { on: false, next: 0, i: 0, vol: 0.8 };
      const musicOn = () => { if (A.ctx && !MUS.on) { MUS.on = true; MUS.next = A.now() + 0.25; } };
      S.on('audio-ready', () => { if (phase !== 'intro') musicOn(); });
      S.loop(() => {
        if (!MUS.on || !A.ctx) return;
        const spb = 60 / 76 / 2, ahead = A.now() + 0.3;
        while (MUS.next < ahead) {
          const t = MUS.next, i = MUS.i, bar = Math.floor(i / 8) % 4, k = i % 8, ch = BARS[bar], v = MUS.vol;
          if (k === 0) {
            A.pluck(A.note(ch[0]), { when: t, vol: 0.2 * v, damp: 0.995, lp: 520, bus: 'music' });
            ch[1].forEach((n, j) => A.tone({ when: t + j * 0.03, type: 'sine', freq: A.note(n) / 2, dur: spb * 8.2, vol: 0.016 * v, attack: 0.7, lp: 1100, verb: 0.45, bus: 'music' }));
          }
          const pat = [0, 2, 1, 3, 2, 1, 3, 2][k], rest = (k === 3 && bar % 2) || (k === 7 && bar === 3);
          if (!rest) A.pluck(A.note(ch[1][pat]) * (k === 5 && bar % 2 === 0 ? 2 : 1), { when: t + (k % 2 ? 0.018 : 0), vol: (k % 2 ? 0.075 : 0.1) * v, damp: 0.9975, lp: 2800, verb: 0.3, bus: 'music' });
          MUS.i++; MUS.next += spb;
        }
      });
      let chimeAt = performance.now() + 9000;
      const SND = {
        sync(name) { if (A.ctx) A.sync(name, performance.now()); },
        pick() { if (!A.ctx) return; A.click({ vol: 0.07 }); A.pluck(A.note('D5'), { vol: 0.16, damp: 0.996, verb: 0.25 }); this.sync('pick'); },
        seedIn() { if (A.ctx) A.chime(A.note('B5'), { vol: 0.05, dur: 1.2, verb: 0.5 }); },
        grab() { if (!A.ctx) return; A.pop({ freq: 430, vol: 0.08 }); this.sync('grab'); },
        back() { if (A.ctx) A.boing({ freq: 300, vol: 0.06 }); },
        plant() { if (!A.ctx) return; A.thud({ vol: 0.24 }); A.noise({ filter: 'lowpass', freq: 900, dur: 0.2, vol: 0.12 }); A.pluck(A.note('G4'), { vol: 0.14, damp: 0.995 }); this.sync('plant'); },
        canIn() { if (A.ctx) A.whoosh({ from: 300, to: 1200, dur: 0.4, vol: 0.06 }); },
        pourOn() { if (!A.ctx) return; if (!pourV) pourV = A.loop({ filter: 'bandpass', freq: 700, q: 2.2 }); if (pourV) pourV.level(0.11, 0.05); A.noise({ filter: 'highpass', freq: 2400, dur: 0.12, vol: 0.05 }); this.sync('pour'); },
        pourOff() { if (pourV) pourV.level(0.0001, 0.08); },
        zone() { if (!A.ctx) return; A.chime(A.note('G6'), { vol: 0.06, dur: 1.2 }); this.sync('zone'); },
        watered(ok) { if (!A.ctx) return; (ok ? ['G5', 'B5', 'D6'] : ['G5', 'D6']).forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.07, vol: 0.06, dur: 1.4 })); A.noise({ filter: 'lowpass', freq: 500, dur: 0.35, vol: 0.06, attack: 0.05 }); this.sync('watered'); },
        sprout() { if (A.ctx) A.pop({ freq: 620, vol: 0.07 }); },
        note(i) { if (A.ctx) A.pluck(A.note(SCALE[Math.min(SCALE.length - 1, i)]), { vol: 0.13, damp: 0.9975, lp: 3600, verb: 0.35 }); },
        leaf() { if (A.ctx) A.wood(undefined, 0.045, 0.62 + rnd() * 0.3); },
        petal(i) { if (A.ctx) A.pluck(A.note(SCALE[8 + (i % 6)]), { vol: 0.045, damp: 0.996, lp: 4200, verb: 0.4 }); },
        sunGrab() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 392, to: 523, glide: 0.25, dur: 0.4, vol: 0.06, verb: 0.3 }); this.sync('sun'); },
        bloom(r) { if (!A.ctx) return; const ch = [['G5', 'B5', 'D6', 'A6'], ['E5', 'G5', 'B5', 'D6'], ['C5', 'E5', 'G5', 'D6']][r % 3]; ch.forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.09, vol: 0.075, dur: 2.2, verb: 0.5 })); A.pad(ch.map(n => A.note(n) / 2), { dur: 3, vol: 0.09, attack: 0.25 }); K.sfx.sparkle(); this.sync('bloom'); },
        weed() { if (!A.ctx) return; A.boing({ freq: 150, vol: 0.13 }); A.noise({ filter: 'bandpass', freq: 1400, to: 300, q: 0.8, dur: 0.4, vol: 0.09 }); this.sync('weed'); },
        tug() { if (!A.ctx) return; A.boing({ freq: 210, vol: 0.11 }); A.noise({ filter: 'lowpass', freq: 600, dur: 0.15, vol: 0.08 }); this.sync('tug'); },
        shrink() { if (A.ctx) A.tone({ type: 'sine', freq: 520, to: 230, glide: 1.4, dur: 1.6, vol: 0.06, attack: 0.2, verb: 0.4 }); },
        light(i) { if (A.ctx) A.chime(A.note(SCALE[3 + (i * 3) % 9]), { vol: 0.024, dur: 0.8, verb: 0.5 }); },
        golden() { if (!A.ctx) return; A.pad([A.note('G3'), A.note('D4'), A.note('B4'), A.note('A4'), A.note('F#5')], { dur: 7, vol: 0.13, attack: 1.2 }); this.sync('golden'); },
        buzz() { if (A.ctx) A.tone({ type: 'sawtooth', freq: 180 + rnd() * 50, to: 215, glide: 0.8, dur: 0.9, vol: 0.014, attack: 0.18, lp: 640 }); },
        shutter() { if (!A.ctx) return; const t = A.now(); A.click({ vol: 0.22 }); A.noise({ when: t, filter: 'highpass', freq: 2200, dur: 0.06, vol: 0.14 }); A.noise({ when: t + 0.09, filter: 'bandpass', freq: 1300, to: 420, dur: 0.28, vol: 0.06 }); A.tone({ when: t + 0.12, type: 'square', freq: 1600, dur: 0.02, vol: 0.02 }); this.sync('shutter'); },
        tap() { if (!A.ctx) return; A.chime(A.note(SCALE[3 + Math.floor(rnd() * 6)]), { vol: 0.03, dur: 1, verb: 0.5 }); this.sync('tap'); }
      };
      let pourV = null;
      S.onDestroy(() => { if (pourV) pourV.stop(); });

      /* ---------------- cached sprites ---------------- */
      function sprite(size, stops) {
        const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
        stops.forEach(([k, col]) => gr.addColorStop(k, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
      }
      const SUNGLOW = sprite(160, [[0, 'rgba(255,250,220,1)'], [0.12, 'rgba(255,236,170,0.85)'], [0.35, 'rgba(255,214,120,0.32)'], [1, 'rgba(255,200,100,0)']]);
      const GOLDGLOW = sprite(160, [[0, 'rgba(255,236,190,1)'], [0.14, 'rgba(255,190,110,0.85)'], [0.4, 'rgba(255,140,70,0.3)'], [1, 'rgba(255,120,60,0)']]);
      const WARM = sprite(96, [[0, 'rgba(255,220,150,0.8)'], [0.4, 'rgba(255,190,110,0.28)'], [1, 'rgba(255,170,90,0)']]);
      const SHADOW = sprite(96, [[0, 'rgba(14,26,12,0.75)'], [0.55, 'rgba(14,26,12,0.32)'], [1, 'rgba(14,26,12,0)']]);
      const HOLEGLOW = sprite(64, [[0, 'rgba(255,246,200,0.95)'], [0.4, 'rgba(255,220,130,0.4)'], [1, 'rgba(255,210,120,0)']]);
      function cloudSprite(D) {
        const c = document.createElement('canvas'), W = 240, Hh = 100; c.width = W; c.height = Hh; const g = c.getContext('2d'), R = xr(77);
        const cs = []; for (let i = 0; i < 8; i++) { const k = i / 7; cs.push([40 + k * 160 + (R() - 0.5) * 12, 70 - Math.sin(k * Math.PI) * 20 + (R() - 0.5) * 6, 17 + Math.sin(k * Math.PI) * 21 + R() * 6]); }
        const body = (dx, dy, grow) => { g.beginPath(); cs.forEach(([x, y, r]) => { g.moveTo(x + dx + r + grow, y + dy); g.arc(x + dx, y + dy, r + grow, 0, TAU); }); g.rect(40 + dx, 66 + dy, 160, 14 + grow); };
        if ('filter' in g) g.filter = 'blur(2.5px)';
        g.fillStyle = D ? 'rgba(20,26,52,0.55)' : 'rgba(170,190,215,0.55)'; body(0, 5, 0); g.fill();
        const gr = g.createLinearGradient(0, 22, 0, 88); gr.addColorStop(0, D ? 'rgba(122,138,190,0.95)' : '#ffffff'); gr.addColorStop(1, D ? 'rgba(58,70,118,0.9)' : '#e6eef7');
        g.fillStyle = gr; body(0, 0, 0); g.fill();
        if ('filter' in g) g.filter = 'none';
        return c;
      }
      const LY = {};
      function off(w, hh, y0) { const s = cv.dpr, c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(hh * s)); const g = c.getContext('2d'); g.setTransform(s, 0, 0, s, 0, -(y0 || 0) * s); return { c, g, y0: y0 || 0, hh }; }

      /* ---------------- geometry ---------------- */
      const G = { w: 0, H: 0, phone: true, bed: { x: 0, w: 0, soil: 0, h: 0, bottom: 0 }, holes: [], arc: { cx: 0, cy: 0, rx: 1, ry: 1 }, Hf: 200, slots: [], seedHome: { x: 0, y: 0 }, canHome: { x: 0, y: 0 }, weed: { x: 0, y: 0 }, lights: [], clouds: [], snail: 0 };
      const arcPt = (p) => ({ x: G.arc.cx - G.arc.rx * Math.cos(Math.PI * p), y: G.arc.cy - G.arc.ry * Math.sin(Math.PI * p) });
      function pFromPt(px, py) { const ux = (px - G.arc.cx) / G.arc.rx, uy = (G.arc.cy - py) / G.arc.ry; let ang = Math.atan2(Math.max(-0.25, uy), ux); if (ang < 0) ang = ux > 0 ? 0 : Math.PI; return 1 - ang / Math.PI; }
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        Object.assign(G, { w, H, phone });
        G.hz = Math.round(H * 0.5);
        G.railTop = Math.round(H * (phone ? 0.512 : 0.525));
        G.floorY = Math.round(H * (phone ? 0.598 : 0.615));
        const bw = Math.round(phone ? Math.min(w - 40, 340) : Math.min(w * 0.5, 660)), soil = Math.round(H * (phone ? 0.668 : 0.7));
        G.bed = { x: Math.round((w - bw) / 2), w: bw, soil, h: phone ? 64 : 80 };
        G.bed.bottom = soil + G.bed.h;
        G.Hf = Math.round(phone ? Math.min(H * 0.3, 252) : Math.min(H * 0.38, 330));
        G.holes = [1 / 6, 3 / 6, 5 / 6].map(f => ({ x: Math.round(G.bed.x + bw * f), y: soil }));
        G.weed = { x: Math.round(G.bed.x + bw * 0.665), y: soil };
        G.arc = { cx: w / 2, cy: Math.round(H * (phone ? 0.385 : 0.39)), rx: Math.round(phone ? w * 0.42 : Math.min(w * 0.38, 500)), ry: Math.round(H * (phone ? 0.19 : 0.23)) };
        G.seedHome = phone ? { x: 66, y: H - 88 } : { x: Math.round(G.bed.x + bw * 0.1), y: Math.min(H - 72, G.bed.bottom + 66) };
        G.canHome = phone ? { x: w - 70, y: H - 94 } : { x: Math.round(G.bed.x + bw * 0.9), y: Math.min(H - 78, G.bed.bottom + 58) };
        stations();
        const R = xr(dayN * 13 + 5); G.clouds = [];
        for (let i = 0; i < (phone ? 4 : 6); i++) G.clouds.push({ x: R() * (w + 240) - 120, y: H * (0.1 + R() * 0.26), s: 0.55 + R() * 0.6, v: 3 + R() * 6 });
        const sz = charSize(), cx = phone ? 10 : 24, cy = phone ? 64 : 72;
        [drop, still].forEach(c => { c.el.style.setProperty('--sz', sz + 'px'); });
        drop.place(cx, cy);
        if (phase === 'golden' || phase === 'photo' || phase === 'snapped' || phase === 'end') placeFinaleCast(); else still.place(cx, cy);
        paintAll();
        placed = OLD.map((d, i) => i < G.slots.length ? { P: oldP[i], slot: G.slots[i] } : null).filter(Boolean).map(o => ({ spr: spriteOf(o.P, G.Hf * o.slot.sc), x: o.slot.x, y: o.slot.y, z: o.slot.z, sc: o.slot.sc, P: o.P }));
        today.forEach(tp => { if (tp.g >= 1) tp.spr = spriteOf(tp.P, G.Hf); });
        heads = null;
        placeDom();
      }
      /* Where earlier visits' flowers live. The bed's back row first, then new pots and railing boxes as the garden grows. */
      function stations() {
        const { w, H, phone, bed } = G, list = [];
        const add = (id, z, cont, pts, sc) => list.push({ id, z, cont, pts, sc });
        add('back', 'bed', null, [0.07, 0.34, 0.66, 0.93].map(f => ({ x: bed.x + bed.w * f, y: bed.soil - 3 })), 0.66);
        if (phone) {
          const bwid = Math.min(150, w * 0.36), yb = G.railTop - 7;
          add('boxL', 'back', { type: 'box', x: w * 0.25, y: G.railTop, w: bwid }, [-0.3, 0, 0.3].map(f => ({ x: w * 0.25 + bwid * f, y: yb })), 0.42);
          add('boxR', 'back', { type: 'box', x: w * 0.75, y: G.railTop, w: bwid }, [-0.3, 0, 0.3].map(f => ({ x: w * 0.75 + bwid * f, y: yb })), 0.42);
          add('ledge', 'back', { type: 'ledge', x: w * 0.5, y: G.railTop }, [-22, 22].map(dx => ({ x: w * 0.5 + dx, y: G.railTop - 16 })), 0.34);
        } else {
          const pr = 44;
          add('potL', 'front', { type: 'pot', x: bed.x - 84, y: bed.bottom - 2, r: pr }, [-15, 15].map(dx => ({ x: bed.x - 84 + dx, y: bed.bottom - 2 - pr * 1.42 })), 0.6);
          add('potR', 'front', { type: 'pot', x: bed.x + bed.w + 84, y: bed.bottom - 2, r: pr }, [-15, 15].map(dx => ({ x: bed.x + bed.w + 84 + dx, y: bed.bottom - 2 - pr * 1.42 })), 0.6);
          const bwid = Math.min(230, w * 0.18), yb = G.railTop - 8;
          add('boxL', 'back', { type: 'box', x: w * 0.2, y: G.railTop, w: bwid }, [-0.36, -0.12, 0.12, 0.36].map(f => ({ x: w * 0.2 + bwid * f, y: yb })), 0.42);
          add('boxR', 'back', { type: 'box', x: w * 0.8, y: G.railTop, w: bwid }, [-0.36, -0.12, 0.12, 0.36].map(f => ({ x: w * 0.8 + bwid * f, y: yb })), 0.42);
          const wall = Math.round(w * 0.055), sx = Math.max(wall + 58, bed.x - 196), sy = bed.soil - 22;
          add('standL', 'back', { type: 'stand', x: sx, y: sy }, [-30, 0, 30].map(dx => ({ x: sx + dx, y: sy - 24 })), 0.4);
          const sx2 = Math.min(w - wall - 58, bed.x + bed.w + 196);
          add('standR', 'back', { type: 'stand', x: sx2, y: sy }, [-30, 0, 30].map(dx => ({ x: sx2 + dx, y: sy - 24 })), 0.4);
          const hx = w - 150, hy = Math.round(H * 0.3);
          add('hang', 'back', { type: 'hang', x: hx, y: hy }, [-20, 0, 20].map(dx => ({ x: hx + dx, y: hy - 6 })), 0.34);
        }
        G.stations = list;
        G.slots = [];
        list.forEach(st => st.pts.forEach(p => G.slots.push({ x: Math.round(p.x), y: Math.round(p.y), sc: st.sc, z: st.z, st: st.id })));
      }
      const usedStations = (n) => { const set = new Set(); G.slots.slice(0, n).forEach(s => set.add(s.st)); return set; };

      /* ---------------- painting the cached layers ---------------- */
      const VIEWC = {
        b: { far: '#a9c8d8', mid: '#93b6c6', near: '#86a9b9', roof: ['#d9825b', '#c96f4a', '#e39a6c', '#cf7a50'], wall: ['#f3e3cc', '#ead2b5', '#f6ecdc', '#efd9c2'], win: '#7f93a6', lit: '#ffe6a8', tree: '#5f8f6a', sea0: '#86c6dd', sea1: '#5aa6c8', hill: ['#9fc9a8', '#86b993', '#73aa83'], sky: '#bfe0f2' },
        d: { far: '#2f3d60', mid: '#2a3657', near: '#253050', roof: ['#7a4636', '#6a3c30', '#8a5040', '#73412f'], wall: ['#3e4258', '#45475e', '#3a3d52', '#4a4a60'], win: '#2a3046', lit: '#ffd98a', tree: '#24382f', sea0: '#2b4a72', sea1: '#1e3658', hill: ['#2c4446', '#27403f', '#223a38'], sky: '#24365e' }
      };
      function paintAll() {
        if (!G.w) return;
        const D = dark(), w = G.w, H = G.H;
        LY.back = off(w, H); const g = LY.back.g;
        paintView(g, D);
        paintBalcony(g, D);
        G.stations.forEach((st, i) => { if (st.cont && st.z === 'back' && usedStations(OLD.length).has(st.id)) container(g, st.cont, D); void i; });
        paintVine(g, D);
        const by0 = Math.max(0, G.bed.soil - 16); LY.bed = off(w, H - by0, by0); paintBed(LY.bed.g, D);
        G.stations.forEach(st => { if (st.cont && st.z === 'front' && usedStations(OLD.length).has(st.id)) container(LY.bed.g, st.cont, D); });
        LY.cloud = cloudSprite(D);
        el.style.backgroundColor = D ? '#182241' : '#a9d6ee';
      }
      function paintView(g, D) {
        const w = G.w, H = G.H, C = D ? VIEWC.d : VIEWC.b, R = xr(dayN * 31 + VIEW.length * 7), top = G.hz - H * 0.15, bot = G.floorY + 4, phone = G.phone, s = phone ? 1 : 1.35;
        const ridge = (y0, amp, f, col, ph) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, bot); for (let x = 0; x <= w + 10; x += 8) g.lineTo(x, y0 - Math.abs(Math.sin(x * f + ph)) * amp - Math.sin(x * f * 3.1 + ph) * amp * 0.18); g.lineTo(w, bot); g.closePath(); g.fill(); };
        // a soft haze where land meets sky
        const hz = g.createLinearGradient(0, top - H * 0.06, 0, top + H * 0.05); hz.addColorStop(0, D ? 'rgba(255,190,160,0)' : 'rgba(255,250,240,0)'); hz.addColorStop(1, D ? 'rgba(255,190,160,0.14)' : 'rgba(255,250,240,0.4)');
        g.fillStyle = hz; g.fillRect(0, top - H * 0.06, w, H * 0.11);
        ridge(top + H * 0.03, H * 0.035, 0.0065, C.far, R() * 6);
        if (VIEW === 'harbour') {
          const st = top + H * 0.06, sg = g.createLinearGradient(0, st, 0, bot); sg.addColorStop(0, C.sea0); sg.addColorStop(1, C.sea1);
          g.fillStyle = sg; g.fillRect(0, st, w, bot - st);
          g.fillStyle = C.mid; g.beginPath(); g.moveTo(0, st + 6); g.quadraticCurveTo(w * 0.16, st - H * 0.05, w * 0.34, st + 4); g.lineTo(0, st + 8); g.closePath(); g.fill();
          const lx = w * 0.88, ly = st + 2; g.fillStyle = C.near; g.beginPath(); g.ellipse(lx, ly + 4, 34 * s, 8, 0, Math.PI, 0); g.fill();
          g.fillStyle = D ? '#cfd6e6' : '#ffffff'; g.fillRect(lx - 4 * s, ly - 26 * s, 8 * s, 26 * s); g.fillStyle = '#d65a4a'; g.fillRect(lx - 4 * s, ly - 17 * s, 8 * s, 4 * s); g.fillRect(lx - 4 * s, ly - 8 * s, 8 * s, 4 * s);
          g.fillStyle = D ? '#ffd98a' : '#ffefb0'; g.fillRect(lx - 3 * s, ly - 31 * s, 6 * s, 5 * s); g.fillStyle = C.near; g.beginPath(); g.moveTo(lx - 5 * s, ly - 31 * s); g.lineTo(lx, ly - 36 * s); g.lineTo(lx + 5 * s, ly - 31 * s); g.fill();
          for (let i = 0; i < 4; i++) { const bx = w * (0.15 + 0.2 * i + R() * 0.08), by = st + 10 + R() * (bot - st - 40), k = (0.7 + (by - st) / (bot - st)) * s; g.fillStyle = D ? '#1a2238' : '#4a5a70'; g.beginPath(); g.moveTo(bx - 9 * k, by); g.lineTo(bx + 9 * k, by); g.lineTo(bx + 6 * k, by + 3 * k); g.lineTo(bx - 6 * k, by + 3 * k); g.fill(); g.fillStyle = D ? '#c9d2e6' : '#ffffff'; g.beginPath(); g.moveTo(bx, by - 15 * k); g.lineTo(bx, by - 1); g.lineTo(bx + 8 * k, by - 1); g.closePath(); g.fill(); g.beginPath(); g.moveTo(bx - 1, by - 12 * k); g.lineTo(bx - 1, by - 1); g.lineTo(bx - 6 * k, by - 1); g.closePath(); g.fill(); }
          g.strokeStyle = D ? 'rgba(200,220,255,0.18)' : 'rgba(255,255,255,0.55)'; g.lineWidth = 1.2; g.beginPath();
          for (let i = 0; i < 40; i++) { const x = R() * w, y = st + 6 + R() * (bot - st - 6), l = 3 + R() * 10; g.moveTo(x, y); g.lineTo(x + l, y); } g.stroke();
          // the harbour front: a row of pastel houses down by the water
          let x = -8; const fy = bot;
          while (x < w + 8) { const bw2 = (20 + R() * 22) * s, bh = (16 + R() * 18) * s; g.fillStyle = D ? C.wall[Math.floor(R() * 4)] : ['#f6d9c6', '#d8e8f0', '#f3e8c4', '#e7d6ee', '#f6e6d8'][Math.floor(R() * 5)]; g.fillRect(x, fy - bh, bw2, bh); g.fillStyle = C.roof[Math.floor(R() * 4)]; g.fillRect(x - 1, fy - bh - 4 * s, bw2 + 2, 4 * s); g.fillStyle = D && R() < 0.5 ? C.lit : C.win; for (let k = 0; k < Math.floor(bw2 / (9 * s)); k++) g.fillRect(x + 4 * s + k * 9 * s, fy - bh + 6 * s, 3.5 * s, 4.5 * s); x += bw2 + 1; }
        } else if (VIEW === 'hills') {
          ridge(top + H * 0.06, H * 0.03, 0.009, C.hill[0], R() * 6);
          ridge(top + H * 0.1, H * 0.028, 0.012, C.hill[1], R() * 6);
          const wx = w * (0.6 + R() * 0.2), wy = top + H * 0.075 - Math.abs(Math.sin(wx * 0.009)) * H * 0.02;
          g.fillStyle = D ? '#cfc6b6' : '#f4ede0'; g.beginPath(); g.moveTo(wx - 5 * s, wy); g.lineTo(wx + 5 * s, wy); g.lineTo(wx + 3 * s, wy - 22 * s); g.lineTo(wx - 3 * s, wy - 22 * s); g.closePath(); g.fill();
          g.strokeStyle = D ? '#a89e8c' : '#c9bca4'; g.lineWidth = 2 * s; g.beginPath(); for (let i = 0; i < 4; i++) { const a = 0.4 + i * Math.PI / 2; g.moveTo(wx, wy - 22 * s); g.lineTo(wx + Math.cos(a) * 14 * s, wy - 22 * s + Math.sin(a) * 14 * s); } g.stroke();
          for (let i = 0; i < 26; i++) { const tx = R() * w, ty = top + H * (0.08 + R() * 0.06), r = (2.2 + R() * 2.4) * s; g.fillStyle = mixHex(C.tree, D ? '#000000' : '#ffffff', R() * 0.15); g.beginPath(); g.arc(tx, ty - r, r, 0, TAU); g.fill(); }
          ridge(top + H * 0.14, H * 0.025, 0.007, C.hill[2], R() * 6);
          g.strokeStyle = D ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.22)'; g.lineWidth = 2; for (let y = top + H * 0.15; y < bot; y += 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 4); g.stroke(); }
        } else if (VIEW === 'city') {
          let x = -6; g.fillStyle = C.far;
          while (x < w) { const bw2 = (14 + R() * 26) * s, bh = (28 + R() * 60) * s; g.fillRect(x, top + H * 0.07 - bh, bw2, bh + H); x += bw2 + 2; }
          x = -10;
          while (x < w + 10) {
            const bw2 = (26 + R() * 34) * s, bh = (34 + R() * 70) * s, yb = bot, col = C.mid;
            g.fillStyle = mixHex(col, D ? '#000000' : '#ffffff', R() * 0.12); g.fillRect(x, yb - bh, bw2, bh);
            if (R() < 0.25) { g.fillStyle = col; g.fillRect(x + bw2 * 0.3, yb - bh - 10 * s, bw2 * 0.4, 10 * s); }
            for (let wy = yb - bh + 6 * s; wy < yb - 8; wy += 9 * s) for (let wx = x + 4 * s; wx < x + bw2 - 6 * s; wx += 8 * s) { g.fillStyle = R() < (D ? 0.35 : 0.08) ? C.lit : mixHex(col, D ? '#000000' : '#ffffff', 0.2); g.fillRect(wx, wy, 3.6 * s, 4.6 * s); }
            x += bw2 + 3;
          }
          const tx = w * (0.3 + R() * 0.4), ty = bot - 70 * s; g.fillStyle = C.near; g.fillRect(tx - 9 * s, ty - 16 * s, 18 * s, 14 * s); g.beginPath(); g.moveTo(tx - 11 * s, ty - 16 * s); g.lineTo(tx, ty - 24 * s); g.lineTo(tx + 11 * s, ty - 16 * s); g.fill(); g.fillRect(tx - 7 * s, ty - 2 * s, 2 * s, 10 * s); g.fillRect(tx + 5 * s, ty - 2 * s, 2 * s, 10 * s);
        } else {
          // rooftops: a dome and a bell tower in the distance, then two rows of terracotta roofs
          const dx = w * (0.62 + R() * 0.2), dy = top + H * 0.06;
          g.fillStyle = C.mid; g.fillRect(dx - 20 * s, dy - 8 * s, 40 * s, 40 * s); g.beginPath(); g.arc(dx, dy - 8 * s, 20 * s, Math.PI, 0); g.fill(); g.fillRect(dx - 2 * s, dy - 36 * s, 4 * s, 9 * s);
          const tw = w * (0.12 + R() * 0.18); g.fillRect(tw - 7 * s, dy - 30 * s, 14 * s, 70 * s); g.beginPath(); g.moveTo(tw - 9 * s, dy - 30 * s); g.lineTo(tw, dy - 46 * s); g.lineTo(tw + 9 * s, dy - 30 * s); g.fill();
          for (let row = 0; row < 2; row++) {
            const yb = row ? bot : top + H * 0.1, k = (row ? 1 : 0.72) * s; let x = -12 + R() * 10;
            while (x < w + 12) {
              const bw2 = (26 + R() * 30) * k, bh = (22 + R() * 26) * k;
              g.fillStyle = mixHex(C.wall[Math.floor(R() * 4)], C.sky, row ? 0 : 0.25); g.fillRect(x, yb - bh, bw2, bh + H);
              g.fillStyle = mixHex(C.roof[Math.floor(R() * 4)], C.sky, row ? 0 : 0.25);
              g.beginPath(); g.moveTo(x - 3 * k, yb - bh); g.lineTo(x + bw2 * 0.5, yb - bh - bw2 * 0.3); g.lineTo(x + bw2 + 3 * k, yb - bh); g.closePath(); g.fill();
              if (R() < 0.35) g.fillRect(x + bw2 * 0.7, yb - bh - bw2 * 0.34, 4 * k, 9 * k);
              g.fillStyle = D && R() < 0.4 ? C.lit : C.win;
              for (let fy = yb - bh + 6 * k; fy < yb - 6 * k && fy < yb - bh + 30 * k; fy += 11 * k) for (let fx = x + 5 * k; fx < x + bw2 - 7 * k; fx += 10 * k) { g.fillRect(fx, fy, 4 * k, 6 * k); }
              x += bw2 + 1 + R() * 3;
              if (R() < 0.18) { g.fillStyle = C.tree; g.beginPath(); g.ellipse(x + 2, yb - bh * 0.9, 4.5 * k, 16 * k, 0, 0, TAU); g.fill(); x += 6; }
            }
          }
        }
      }
      function paintBalcony(g, D) {
        const w = G.w, H = G.H, phone = G.phone, fy = G.floorY, rt = G.railTop;
        const fg = g.createLinearGradient(0, fy, 0, H); fg.addColorStop(0, D ? '#4b3536' : '#e9b791'); fg.addColorStop(1, D ? '#2a1d21' : '#cf916c');
        g.fillStyle = fg; g.fillRect(0, fy, w, H - fy);
        // terracotta tiles in perspective
        const vpX = w / 2, vpY = fy - H * 0.7;
        g.strokeStyle = D ? 'rgba(0,0,0,0.3)' : 'rgba(150,78,46,0.3)'; g.lineWidth = 1;
        let y = fy + 6, dy = 9; g.beginPath(); while (y < H) { g.moveTo(0, y); g.lineTo(w, y); y += dy; dy *= 1.3; } g.stroke();
        const step = phone ? 46 : 64; g.beginPath();
        for (let i = -30; i <= 30; i++) { const xb = vpX + i * step * 1.9, xt = vpX + (xb - vpX) * ((fy - vpY) / (H - vpY)); if (xb < -w || xb > 2 * w) continue; g.moveTo(xt, fy); g.lineTo(xb, H); } g.stroke();
        const sh = g.createLinearGradient(0, fy, 0, fy + 26); sh.addColorStop(0, 'rgba(0,0,0,0.22)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, fy, w, 26);
        // a low balcony wall under the railing, then the wrought-iron railing
        g.fillStyle = D ? '#3a3141' : '#f1dfc6'; g.fillRect(0, fy - 10, w, 12); g.fillStyle = D ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.5)'; g.fillRect(0, fy - 10, w, 2);
        const iron = D ? '#0f1715' : '#2c473d';
        g.strokeStyle = iron; g.lineCap = 'round';
        g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, fy - 16); g.lineTo(w, fy - 16); g.stroke();
        const sp = phone ? 22 : 28; g.lineWidth = phone ? 2.2 : 2.8; g.beginPath();
        for (let x = sp / 2; x < w; x += sp) { g.moveTo(x, rt); g.lineTo(x, fy - 12); } g.stroke();
        g.lineWidth = 1.7; g.beginPath();
        const my = (rt + fy - 14) / 2;
        for (let x = sp; x < w; x += sp * 2) { g.moveTo(x - 1, my); g.arc(x - 6, my, 5, 0, Math.PI * 1.5, false); g.moveTo(x + 1, my); g.arc(x + 6, my, 5, Math.PI, Math.PI * 2.5, false); }
        g.stroke();
        g.lineWidth = phone ? 6 : 8; g.beginPath(); g.moveTo(0, rt); g.lineTo(w, rt); g.stroke();
        g.strokeStyle = D ? 'rgba(130,170,160,0.28)' : 'rgba(255,255,255,0.4)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, rt - 2); g.lineTo(w, rt - 2); g.stroke();
        // side walls frame the balcony on wide screens
        if (!phone) {
          const ww = Math.round(w * 0.055);
          [0, 1].forEach(sd => {
            const x0 = sd ? w - ww : 0, gr = g.createLinearGradient(x0, 0, x0 + ww, 0);
            gr.addColorStop(sd ? 1 : 0, D ? '#3b3346' : '#f2e2cb'); gr.addColorStop(sd ? 0 : 1, D ? '#2c2636' : '#ddc5a6');
            g.fillStyle = gr; g.fillRect(x0, 0, ww, H);
            g.fillStyle = D ? 'rgba(0,0,0,0.25)' : 'rgba(120,80,40,0.16)'; g.fillRect(sd ? x0 : x0 + ww - 3, 0, 3, H);
          });
          const lx = w - Math.round(w * 0.055), ly = Math.round(H * 0.3), ink = D ? '#17141c' : '#3a2f2a';
          g.strokeStyle = ink; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(lx, ly - 34); g.lineTo(lx - 26, ly - 34); g.quadraticCurveTo(lx - 10, ly - 22, lx, ly - 14); g.stroke();
          g.fillStyle = ink; g.fillRect(lx - 28, ly - 34, 3, 6);
          g.fillStyle = ink; roundRect(g, lx - 36, ly - 28, 18, 26, 3); g.fill(); g.beginPath(); g.moveTo(lx - 39, ly - 28); g.lineTo(lx - 27, ly - 37); g.lineTo(lx - 15, ly - 28); g.closePath(); g.fill();
          g.fillStyle = D ? '#6a5838' : '#fff1c8'; g.fillRect(lx - 33, ly - 25, 12, 20); g.fillStyle = ink; g.fillRect(lx - 28, ly - 25, 2, 20);
          G.lamp = { x: lx - 27, y: ly - 15 };
        } else G.lamp = null;
        // string lights hang across, waiting for golden hour
        const y0 = rt - H * (phone ? 0.16 : 0.18), sag = H * 0.05, n = Math.max(6, Math.round(w / (phone ? 36 : 52)));
        g.strokeStyle = D ? 'rgba(10,12,16,0.85)' : 'rgba(60,50,44,0.75)'; g.lineWidth = 1.2; g.beginPath();
        G.lights = [];
        for (let i = 0; i <= 60; i++) { const x = i / 60 * w, u = (x - w / 2) / (w / 2), yy = y0 + sag * (1 - u * u); if (i) g.lineTo(x, yy); else g.moveTo(x, yy); }
        g.stroke();
        for (let i = 0; i < n; i++) {
          const x = (i + 0.5) / n * w, u = (x - w / 2) / (w / 2), yy = y0 + sag * (1 - u * u) + 3;
          g.fillStyle = D ? '#20232c' : '#5a514a'; g.fillRect(x - 1.5, yy - 3, 3, 3);
          g.fillStyle = D ? 'rgba(200,210,230,0.32)' : 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(x, yy + 3, 2.6, 3.6, 0, 0, TAU); g.fill();
          G.lights.push({ x, y: yy + 3, on: 0, at: 0 });
        }
      }
      function container(g, c, D) {
        const terra = D ? '#a3583a' : '#d27a4e', terraL = D ? '#bd6a47' : '#e6966a', terraD = D ? '#743a25' : '#a85634', soil = D ? '#2e1d15' : '#4a3020';
        if (c.type === 'box') {
          const x0 = c.x - c.w / 2, y0 = c.y - 10, hh = 26;
          g.fillStyle = D ? '#4a3626' : '#8a5a3a'; g.fillRect(x0 + 8, y0 + hh - 2, 4, 10); g.fillRect(x0 + c.w - 12, y0 + hh - 2, 4, 10);
          g.fillStyle = D ? '#6b4a33' : '#b07a4f'; roundRect(g, x0, y0, c.w, hh, 5); g.fill();
          g.fillStyle = D ? 'rgba(0,0,0,0.25)' : 'rgba(90,50,20,0.22)'; g.fillRect(x0 + 3, y0 + 9, c.w - 6, 1.5); g.fillRect(x0 + 3, y0 + 17, c.w - 6, 1.5);
          g.fillStyle = soil; g.fillRect(x0 + 4, y0 + 2, c.w - 8, 4);
          g.fillStyle = D ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)'; g.fillRect(x0 + 2, y0, c.w - 4, 1.5);
        } else if (c.type === 'ledge') {
          g.fillStyle = D ? '#4a3626' : '#9a6a44'; g.fillRect(c.x - 44, c.y - 4, 88, 5);
          [-22, 22].forEach(dx => { pot(g, c.x + dx, c.y - 4, 11, terra, terraL, terraD, soil); });
        } else if (c.type === 'pot') {
          g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(c.x, c.y + 2, c.r * 1.05, 7, 0, 0, TAU); g.fill();
          pot(g, c.x, c.y, c.r, terra, terraL, terraD, soil);
        } else if (c.type === 'stand') {
          g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(c.x, G.bed.bottom + 3, 58, 6, 0, 0, TAU); g.fill();
          g.fillStyle = D ? '#3e2e22' : '#8a6040'; g.fillRect(c.x - 52, c.y, 104, 6); g.fillRect(c.x - 46, c.y + 6, 5, G.bed.bottom - c.y - 4); g.fillRect(c.x + 41, c.y + 6, 5, G.bed.bottom - c.y - 4);
          g.fillRect(c.x - 46, c.y + (G.bed.bottom - c.y) * 0.6, 92, 4);
          [-30, 0, 30].forEach(dx => pot(g, c.x + dx, c.y, 14, terra, terraL, terraD, soil));
        } else if (c.type === 'hang') {
          g.strokeStyle = D ? '#16161c' : '#4a4038'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(c.x - 26, c.y); g.lineTo(c.x, 56); g.lineTo(c.x + 26, c.y); g.moveTo(c.x, 56); g.lineTo(c.x, 0); g.stroke();
          g.fillStyle = D ? '#5e4630' : '#b8875a'; g.beginPath(); g.ellipse(c.x, c.y, 34, 18, 0, 0, Math.PI); g.fill();
          g.strokeStyle = D ? 'rgba(0,0,0,0.3)' : 'rgba(90,50,20,0.3)'; g.lineWidth = 1; g.beginPath(); for (let i = -3; i <= 3; i++) { g.moveTo(c.x + i * 9, c.y); g.lineTo(c.x + i * 7, c.y + 14 - Math.abs(i) * 2); } g.stroke();
          g.fillStyle = soil; g.fillRect(c.x - 32, c.y - 2, 64, 4);
        }
      }
      function pot(g, x, yb, r, terra, terraL, terraD, soil) {
        const ht = r * 1.42, tw = r, bw2 = r * 0.72;
        g.fillStyle = terra; g.beginPath(); g.moveTo(x - tw, yb - ht + r * 0.25); g.lineTo(x + tw, yb - ht + r * 0.25); g.lineTo(x + bw2, yb); g.lineTo(x - bw2, yb); g.closePath(); g.fill();
        g.fillStyle = terraD; g.beginPath(); g.moveTo(x + tw * 0.45, yb - ht + r * 0.25); g.lineTo(x + tw, yb - ht + r * 0.25); g.lineTo(x + bw2, yb); g.lineTo(x + bw2 * 0.45, yb); g.closePath(); g.fill();
        g.fillStyle = terraL; roundRect(g, x - tw - 3, yb - ht - 2, tw * 2 + 6, r * 0.42, 3); g.fill();
        g.fillStyle = soil; g.beginPath(); g.ellipse(x, yb - ht - 1, tw * 0.92, Math.max(2, r * 0.12), 0, 0, TAU); g.fill();
      }
      function paintVine(g, D) { // flowers beyond the garden's pots climb the railing, so nothing planted ever disappears
        const extra = Math.max(0, OLD.length - G.slots.length); if (!extra) return;
        const w = G.w, rt = G.railTop, n = Math.min(90, extra), R = xr(4711);
        g.strokeStyle = D ? '#2f5a3a' : '#4f8f45'; g.lineWidth = 1.6; g.beginPath();
        for (let x = 0; x <= w; x += 6) { const yy = rt + 3 + Math.sin(x * 0.05) * 4; if (x) g.lineTo(x, yy); else g.moveTo(x, yy); } g.stroke();
        for (let i = 0; i < n; i++) {
          const x = (i + 0.5) / n * w + (R() - 0.5) * 8, yy = rt + 3 + Math.sin(x * 0.05) * 4, k = OLD[G.slots.length + i] ? OLD[G.slots.length + i].k : 'what';
          const col = (PAL[k] || PAL.what)[Math.floor(R() * 4)][0];
          g.fillStyle = D ? '#3f7a45' : '#6cb85a'; g.beginPath(); g.ellipse(x - 4, yy + 3, 3.6, 1.8, 0.5, 0, TAU); g.fill();
          g.fillStyle = col; for (let p = 0; p < 5; p++) { const a = p * TAU / 5; g.beginPath(); g.arc(x + Math.cos(a) * 2.6, yy - 3 + Math.sin(a) * 2.6, 2, 0, TAU); g.fill(); }
          g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x, yy - 3, 1.4, 0, TAU); g.fill();
        }
      }
      function paintRug(g, D) {
        const B = G.bed, top = B.bottom - 14, bot = Math.min(G.H - 8, top + (G.phone ? 190 : 150)), cx = G.w / 2;
        const wt = G.phone ? G.w * 0.86 : B.w * 1.3, wb = G.phone ? G.w * 1.04 : B.w * 1.6;
        const quad = (k0, k1) => { const y0 = top + (bot - top) * k0, y1 = top + (bot - top) * k1, w0 = wt + (wb - wt) * k0, w1 = wt + (wb - wt) * k1; g.beginPath(); g.moveTo(cx - w0 / 2, y0); g.lineTo(cx + w0 / 2, y0); g.lineTo(cx + w1 / 2, y1); g.lineTo(cx - w1 / 2, y1); g.closePath(); };
        const cols = D ? ['#6a3a3a', '#7a5a2e', '#2f5658', '#5a4a6a', '#7a6a58'] : ['#d9785a', '#e8b04a', '#4f9a90', '#f3e3c8', '#c9604a'];
        quad(0, 1); g.fillStyle = D ? '#4a3a40' : '#f1dfc2'; g.fill();
        const bands = [0, 0.08, 0.14, 0.3, 0.36, 0.5, 0.64, 0.7, 0.86, 0.92, 1];
        for (let i = 0; i < bands.length - 1; i++) { if (i % 2 === 0) continue; quad(bands[i], bands[i + 1]); g.fillStyle = cols[(i >> 1) % cols.length]; g.fill(); }
        g.strokeStyle = D ? 'rgba(0,0,0,0.25)' : 'rgba(120,70,40,0.2)'; g.lineWidth = 1; quad(0.02, 0.98); g.stroke();
        g.strokeStyle = D ? 'rgba(220,200,180,0.35)' : 'rgba(255,250,240,0.8)'; g.lineWidth = 1.2; g.beginPath();
        for (let x = cx - wb / 2 + 4; x < cx + wb / 2 - 2; x += 5) { g.moveTo(x, bot); g.lineTo(x + 1, bot + 6); }
        g.stroke();
      }
      function paintBed(g, D) {
        const B = G.bed, x = B.x, y = B.soil, w = B.w, hh = B.h, ins = 9;
        paintRug(g, D);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + w / 2, B.bottom + 3, w * 0.54, 10, 0, 0, TAU); g.fill();
        const body = g.createLinearGradient(0, y, 0, B.bottom); body.addColorStop(0, D ? '#b4623f' : '#dc7e51'); body.addColorStop(1, D ? '#7a3d27' : '#b35835');
        g.fillStyle = body; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + w, y + 4); g.lineTo(x + w - ins, B.bottom); g.lineTo(x + ins, B.bottom); g.closePath(); g.fill();
        g.fillStyle = D ? 'rgba(0,0,0,0.22)' : 'rgba(110,40,15,0.2)'; g.fillRect(x + 6, y + hh * 0.42, w - 12, 2); g.fillRect(x + 8, B.bottom - 10, w - 16, 2);
        g.fillStyle = D ? 'rgba(255,190,150,0.08)' : 'rgba(255,230,200,0.22)'; g.fillRect(x + 6, y + hh * 0.42 + 2, w - 12, 1.5);
        g.fillStyle = D ? 'rgba(0,0,0,0.18)' : 'rgba(90,30,10,0.14)'; g.beginPath(); g.moveTo(x + w * 0.82, y + 4); g.lineTo(x + w, y + 4); g.lineTo(x + w - ins, B.bottom); g.lineTo(x + w * 0.82 - 2, B.bottom); g.closePath(); g.fill();
        g.fillStyle = D ? '#c46f4b' : '#ea9568'; roundRect(g, x - 5, y - 5, w + 10, 11, 4); g.fill();
        g.fillStyle = D ? 'rgba(255,220,190,0.14)' : 'rgba(255,240,220,0.55)'; g.fillRect(x - 3, y - 5, w + 6, 1.6);
        g.fillStyle = D ? '#2b1b13' : '#4a2f1f'; roundRect(g, x + 3, y - 3, w - 6, 6, 3); g.fill();
        const R = xr(91); g.fillStyle = D ? 'rgba(160,120,90,0.35)' : 'rgba(180,140,100,0.45)';
        for (let i = 0; i < w / 3; i++) { g.fillRect(x + 5 + R() * (w - 10), y - 2 + R() * 4, 1.2, 1); }
        // the seed waits in a little saucer
        const sh = G.seedHome;
        if (G.phone) { // a mug of tea keeps the gardener company
          const mx = sh.x + 64, my = sh.y + 14;
          g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(mx, my + 2, 15, 4, 0, 0, TAU); g.fill();
          g.strokeStyle = D ? '#c8d3e6' : '#f7f1e6'; g.lineWidth = 3; g.beginPath(); g.arc(mx + 11, my - 10, 5, -1.2, 1.2); g.stroke();
          g.fillStyle = D ? '#c8d3e6' : '#f7f1e6'; roundRect(g, mx - 11, my - 22, 22, 24, 4); g.fill();
          g.fillStyle = D ? '#8aa7d6' : '#7cc8b6'; g.fillRect(mx - 11, my - 13, 22, 5);
          g.fillStyle = '#7a4a2a'; g.beginPath(); g.ellipse(mx, my - 21, 9.5, 2.4, 0, 0, TAU); g.fill();
          G.mug = { x: mx, y: my - 24 };
        } else G.mug = null;
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(sh.x, sh.y + 16, 30, 7, 0, 0, TAU); g.fill();
        g.fillStyle = D ? '#9a5236' : '#cf7349'; g.beginPath(); g.ellipse(sh.x, sh.y + 12, 30, 9, 0, 0, Math.PI); g.fill();
        g.fillStyle = D ? '#b8653f' : '#e38a5e'; g.beginPath(); g.ellipse(sh.x, sh.y + 11, 30, 7, 0, 0, TAU); g.fill();
        g.fillStyle = D ? '#7a3f28' : '#b45a36'; g.beginPath(); g.ellipse(sh.x, sh.y + 11, 24, 4.6, 0, 0, TAU); g.fill();
      }
      function roundRect(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r); g.lineTo(x + w, y + hh - r); g.arcTo(x + w, y + hh, x + w - r, y + hh, r); g.lineTo(x + r, y + hh); g.arcTo(x, y + hh, x, y + hh - r, r); g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath(); }

      /* ---------------- plants: procedural while growing, cached sprites once in bloom ---------------- */
      function spriteOf(Pl, Hp) {
        const pad = 6, dpr = cv.dpr, x0 = Pl.bx0 * Hp - pad, x1 = Pl.bx1 * Hp + pad, y0 = Pl.by0 * Hp - pad, y1 = Pl.by1 * Hp + pad, cw = x1 - x0, ch = y1 - y0;
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(cw * dpr)); c.height = Math.max(1, Math.ceil(ch * dpr));
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, -x0 * dpr, -y0 * dpr);
        drawPlant(g, Pl, Hp, 1, 0);
        return { c, ox: -x0, oy: -y0, w: cw, h: ch };
      }
      function drawSpr(g, s, x, y, rot, sc) {
        if (!rot && (!sc || sc === 1)) { g.drawImage(s.c, x - s.ox, y - s.oy, s.w, s.h); return; }
        g.save(); g.translate(x, y); if (rot) g.rotate(rot); if (sc && sc !== 1) g.scale(sc, sc); g.drawImage(s.c, -s.ox, -s.oy, s.w, s.h); g.restore();
      }
      function drawPlant(g, Pl, Hp, gr, t) {
        g.save(); g.scale(Hp, Hp); g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = Pl.stem;
        for (const s of Pl.segs) {
          if (gr <= s.t0) continue;
          const k = gr >= s.t1 ? 1 : (gr - s.t0) / (s.t1 - s.t0);
          g.lineWidth = s.w; g.beginPath(); g.moveTo(s.x0, s.y0); g.lineTo(s.x0 + (s.x1 - s.x0) * k, s.y0 + (s.y1 - s.y0) * k); g.stroke();
        }
        if (Pl.kind === 'what') { // a sunlit edge on the sturdy stem
          g.strokeStyle = 'rgba(200,240,150,0.35)';
          for (const s of Pl.segs) { if (s.dep || gr <= s.t0) continue; const k = gr >= s.t1 ? 1 : (gr - s.t0) / (s.t1 - s.t0); g.lineWidth = s.w * 0.3; g.beginPath(); g.moveTo(s.x0 - s.w * 0.22, s.y0); g.lineTo(s.x0 - s.w * 0.22 + (s.x1 - s.x0) * k, s.y0 + (s.y1 - s.y0) * k); g.stroke(); }
        }
        for (const c of Pl.curls) { if (gr > c.t) drawCurl(g, Pl, c, Math.min(1, (gr - c.t) / 0.16)); }
        for (const lf of Pl.leaves) { if (gr > lf.t) drawLeaf(g, Pl, lf, outBack(Math.min(1, (gr - lf.t) / 0.13))); }
        for (const b of Pl.blooms) { if (gr > b.t - 0.07) drawBloom(g, Pl, b, gr, t); }
        g.restore();
      }
      function drawCurl(g, Pl, c, k) {
        g.strokeStyle = Pl.stem; g.lineWidth = 0.0055; g.beginPath();
        let x = c.x, y = c.y, a = c.a; g.moveTo(x, y);
        const n = Math.max(1, Math.round(26 * k)), st = c.s / 9;
        for (let i = 0; i < n; i++) { a += c.dir * (0.06 + i * 0.026); const f = 1 - i / 34; x += Math.cos(a) * st * f; y += Math.sin(a) * st * f; g.lineTo(x, y); }
        g.stroke();
      }
      function drawLeaf(g, Pl, lf, e) {
        const L = Pl.leafLen * lf.s * e; if (L <= 0.002) return;
        g.save(); g.translate(lf.x, lf.y); g.rotate(lf.a);
        if (Pl.leafType === 'fine') {
          g.strokeStyle = Pl.leafC; g.lineWidth = 0.0058; g.beginPath(); g.moveTo(0, 0); g.lineTo(L, 0);
          for (let i = 1; i <= 3; i++) { const px = L * i / 4.2, q = L * (0.28 - i * 0.04); g.moveTo(px, 0); g.lineTo(px + q * 0.75, -q); g.moveTo(px, 0); g.lineTo(px + q * 0.75, q); }
          g.stroke();
        } else if (Pl.leafType === 'palm') {
          g.strokeStyle = Pl.leafD; g.lineWidth = 0.0065; g.beginPath(); g.moveTo(0, 0); g.lineTo(L * 0.5, 0); g.stroke();
          g.translate(L * 0.5, 0);
          for (let i = 0; i < 7; i++) { g.save(); g.rotate((i - 3) * 0.36); g.scale(L * 0.64, L * 0.64); g.fillStyle = i % 2 ? Pl.leafC : Pl.leafD; g.fill(PATH.leaflet); g.restore(); }
        } else {
          const path = Pl.leafType === 'heart' ? PATH.heart : PATH.oval;
          g.scale(L, L);
          g.fillStyle = Pl.leafD; g.fill(path);
          g.save(); g.translate(0.05, -0.035); g.scale(0.93, 0.84); g.fillStyle = Pl.leafC; g.fill(path); g.restore();
          g.strokeStyle = Pl.leafL; g.lineWidth = 0.035; g.beginPath(); g.moveTo(0.06, 0); g.lineTo(0.86, 0);
          if (Pl.leafType === 'heart') { g.moveTo(0.28, 0); g.lineTo(0.5, -0.18); g.moveTo(0.28, 0); g.lineTo(0.5, 0.18); g.moveTo(0.55, 0); g.lineTo(0.72, -0.13); }
          g.stroke();
        }
        g.restore();
      }
      function drawBloom(g, Pl, b, gr, t) {
        const budK = clamp01((gr - (b.t - 0.07)) / 0.07), small = b.ch === 'c' || b.ch === 'e', o = clamp01((gr - b.t - 0.01) / (small ? 0.1 : 0.24)), r = b.r;
        g.save(); g.translate(b.x, b.y);
        if (b.ch === 'e') { g.rotate(b.a); g.scale(r * 1.6 * budK, r * 1.6 * budK); g.fillStyle = Pl.budC; g.fill(PATH.bud); g.fillStyle = Pl.pet2; g.globalAlpha = 0.55; g.save(); g.translate(0.5, 0); g.scale(0.4, 0.5); g.fill(PATH.bud); g.restore(); g.globalAlpha = 1; g.restore(); return; }
        if (o <= 0) {
          g.rotate(b.a); const s = r * (small ? 0.8 : 0.66) * budK; g.scale(s, s);
          g.fillStyle = Pl.budC; g.fill(PATH.bud);
          g.globalAlpha = 0.7 * budK; g.fillStyle = small ? (b.col || Pl.pet) : Pl.pet; g.save(); g.translate(0.5, 0); g.scale(0.5, 0.62); g.fill(PATH.bud); g.restore(); g.globalAlpha = 1;
          g.restore(); return;
        }
        const kind = b.ch === 'b' && Pl.kind === 'what' ? 'daisy' : Pl.bloom;
        if (kind === 'cosmos') bloomCosmos(g, Pl, b, r, o);
        else if (kind === 'sun') bloomSun(g, Pl, b, r, o);
        else if (kind === 'daisy') bloomDaisy(g, Pl, b, r, o);
        else if (kind === 'spire') bloomFloret(g, Pl, b, r, o);
        else bloomStar(g, Pl, b, r, o);
        g.restore();
      }
      function petalRing(g, n, r, o, rot, stag, close, fn) {
        for (let i = 0; i < n; i++) {
          const oi = clamp01(o * (1 + stag) - (i / n) * stag), fa = rot + i * TAU / n, ca = -Math.PI / 2 + (i - (n - 1) / 2) * close;
          fn(i, lerpAng(ca, fa, outCubic(oi)), r * (0.3 + 0.7 * outBack(oi)), oi);
        }
      }
      function bloomCosmos(g, Pl, b, r, o) {
        g.scale(1, 0.9);
        const n = b.ch === 'b' ? 6 : Pl.n;
        petalRing(g, n, r, o, b.rot, 0.5, 0.13, (i, ang, len, oi) => {
          g.save(); g.rotate(ang); g.scale(len, len * (0.72 + 0.28 * oi)); g.fillStyle = Pl.pet; g.fill(PATH.cosmos);
          g.translate(0.42, 0); g.scale(0.58, 0.72); g.fillStyle = Pl.pet2; g.globalAlpha = 0.55; g.fill(PATH.cosmos); g.globalAlpha = 1; g.restore();
        });
        g.globalAlpha = 0.5 * o; g.fillStyle = Pl.eye; g.beginPath(); g.arc(0, 0, r * 0.36, 0, TAU); g.fill(); g.globalAlpha = 1;
        const cr = r * 0.2 * outBack(clamp01(o * 1.3 - 0.2));
        if (cr > 0.0005) {
          g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(0, 0, cr, 0, TAU); g.fill();
          g.fillStyle = '#e39a1c'; for (let k = 0; k < 7; k++) { const a = b.rot + k * 0.9; g.beginPath(); g.arc(Math.cos(a) * cr * 0.55, Math.sin(a) * cr * 0.55, cr * 0.17, 0, TAU); g.fill(); }
        }
      }
      function bloomSun(g, Pl, b, r, o) {
        g.scale(1, 0.92);
        const n = Pl.n;
        petalRing(g, n, r * 1.04, o, b.rot + Math.PI / n, 0.6, 0.06, (i, ang, len) => { g.save(); g.rotate(ang); g.scale(len, len * 0.92); g.fillStyle = Pl.petD; g.fill(PATH.ray); g.restore(); });
        petalRing(g, n, r * 0.94, clamp01(o * 1.1 - 0.1), b.rot, 0.6, 0.06, (i, ang, len) => { g.save(); g.rotate(ang); g.scale(len, len * 0.9); g.fillStyle = Pl.pet; g.fill(PATH.ray); g.translate(0.5, 0); g.scale(0.45, 0.5); g.fillStyle = Pl.pet2; g.globalAlpha = 0.5; g.fill(PATH.ray); g.globalAlpha = 1; g.restore(); });
        const dk = outBack(clamp01(o * 1.4 - 0.15)), dr = r * 0.42 * dk;
        if (dr > 0.001) {
          g.fillStyle = Pl.eye; g.beginPath(); g.arc(0, 0, dr, 0, TAU); g.fill();
          const N = 48, ga = 2.39996;
          for (let i = 1; i < N; i++) { const rr = dr * 0.9 * Math.sqrt(i / N), a = i * ga + b.rot; g.fillStyle = i % 3 ? Pl.seedC : Pl.seedL; g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr, dr * 0.058, 0, TAU); g.fill(); }
          g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(-dr * 0.25, -dr * 0.3, dr * 0.45, 0, TAU); g.fill();
        }
      }
      function bloomDaisy(g, Pl, b, r, o) {
        g.scale(1, 0.9);
        const n = b.ch === 'B' ? Pl.n : 13, white = b.ch === 'B' ? Pl.white : true;
        petalRing(g, n, r, o, b.rot, 0.55, 0.07, (i, ang, len) => {
          g.save(); g.rotate(ang); g.scale(len, len); g.fillStyle = white ? '#fffdf6' : Pl.pet2; g.fill(PATH.daisy);
          g.strokeStyle = 'rgba(140,110,80,0.28)'; g.lineWidth = 0.035; g.stroke(PATH.daisy); g.restore();
        });
        const cr = r * 0.3 * outBack(clamp01(o * 1.3 - 0.2));
        if (cr > 0.0005) { g.fillStyle = white ? '#ffcc33' : Pl.eye; g.beginPath(); g.arc(0, 0, cr, 0, TAU); g.fill(); g.fillStyle = 'rgba(200,120,10,0.55)'; g.beginPath(); g.arc(cr * 0.15, cr * 0.2, cr * 0.7, 0, TAU); g.fill(); g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(-cr * 0.25, -cr * 0.25, cr * 0.35, 0, TAU); g.fill(); }
      }
      function bloomFloret(g, Pl, b, r, o) {
        g.rotate(b.a);
        const s = r * (0.45 + 0.55 * outBack(o)); g.scale(s, s * (0.8 + 0.2 * o));
        g.fillStyle = mixHex(b.col || Pl.pet, Pl.budC, (1 - o) * 0.6); g.fill(PATH.bell);
        g.globalAlpha = o; g.fillStyle = Pl.pet2; g.beginPath(); g.ellipse(0.9, 0, 0.13, 0.3, 0, 0, TAU); g.fill();
        g.fillStyle = Pl.eye; g.globalAlpha = 0.35 * o; g.beginPath(); g.ellipse(0.35, 0, 0.3, 0.12, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
      function bloomStar(g, Pl, b, r, o) {
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.45 * o; g.drawImage(WARM, -r * 1.8, -r * 1.8, r * 3.6, r * 3.6); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        petalRing(g, 6, r, o, b.rot, 0.5, 0.15, (i, ang, len) => { g.save(); g.rotate(ang); g.scale(len, len); g.fillStyle = Pl.pet; g.fill(PATH.star); g.translate(0.1, 0); g.scale(0.62, 0.55); g.fillStyle = Pl.pet2; g.globalAlpha = 0.85; g.fill(PATH.star); g.globalAlpha = 1; g.restore(); });
        const cr = r * 0.22 * outBack(clamp01(o * 1.3 - 0.2));
        if (cr > 0.0005) {
          g.strokeStyle = Pl.eye; g.lineWidth = r * 0.03; g.beginPath(); for (let k = 0; k < 8; k++) { const a = b.rot + k * TAU / 8; g.moveTo(0, 0); g.lineTo(Math.cos(a) * cr * 1.9, Math.sin(a) * cr * 1.9); } g.stroke();
          g.fillStyle = Pl.eye; for (let k = 0; k < 8; k++) { const a = b.rot + k * TAU / 8; g.beginPath(); g.arc(Math.cos(a) * cr * 1.9, Math.sin(a) * cr * 1.9, cr * 0.2, 0, TAU); g.fill(); }
          g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(0, 0, cr * 0.8, 0, TAU); g.fill();
        }
      }

      /* ---------------- state ---------------- */
      let phase = 'intro', finished = false, placed = [], heads = null, cur = null, lastNow = performance.now(), acc = 0, half = 0, drawn = 0, qAcc = 0, qN = 0;
      const today = [];                               // this visit's flowers: { P, hole, g, spr, pop, k, s, h }
      const HS = [0, 1, 2].map(() => ({ target: false, seeded: false, wet: 0 }));
      const tags = [];
      const SEED = { x: 0, y: 0, live: false, held: false, gx: 0, gy: 0 };
      const CAN = { x: 0, y: 0, ready: false };
      const WAT = { on: false, m: 0, down: false, inZone: false, nudged: false };
      const SUN = { p: PR[0][0], target: PR[0][0], p0: PR[0][0], p1: PR[0][1], live: false, drag: false, sn: 0, sd: 0, notes: 0 };
      const WEED = { on: false, k: 0, born: 0, shade: 0, tug: 0, sign: null, info: null, said: false, shrunk: false };
      const GOLD = { on: false, k: 0, t0: 0 };
      const bugs = [];
      const waterScores = [], sunSteady = [];
      const waiters = {};
      const waitFor = (name) => new Promise(res => { waiters[name] = res; });
      const resolveW = (name, v) => { const f = waiters[name]; if (f) { delete waiters[name]; f(v); } };
      const curHole = () => G.holes[cur ? cur.hole : 0];

      /* ---------------- DOM placement ---------------- */
      function placeDom() {
        if (!G.w) return;
        placeSun();
        if (!SEED.held) { if (SEED.live || seedEl.hidden) { SEED.x = G.seedHome.x; SEED.y = G.seedHome.y; } placeSeed(); }
        if (CAN.ready && cur) { const ho = curHole(); CAN.x = Math.min(G.w - 52, ho.x + (G.phone ? 60 : 72)); CAN.y = ho.y - (G.phone ? 98 : 116); } else { CAN.x = G.canHome.x; CAN.y = G.canHome.y; }
        placeCan();
        tags.forEach(t => placeTag(t));
        if (WEED.sign) placeSign();
        weedHit.style.transform = 'translate(' + G.weed.x + 'px,' + G.weed.y + 'px)';
      }
      function placeSun() { const p = arcPt(SUN.p); sunEl.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)'; }
      function placeSeed() { seedEl.style.transform = 'translate(' + SEED.x.toFixed(1) + 'px,' + SEED.y.toFixed(1) + 'px)'; }
      function placeCan() { canEl.style.transform = 'translate(' + CAN.x.toFixed(1) + 'px,' + CAN.y.toFixed(1) + 'px)'; }
      function placeTag(t) {
        const ho = G.holes[t.hole], mw = Math.round(G.bed.w / 3 - 8);
        t.el.style.setProperty('--mw', mw + 'px');
        t.el.style.left = K.clamp(ho.x, mw / 2 + 6, G.w - mw / 2 - 6) + 'px'; t.el.style.top = (G.bed.soil + (G.phone ? 12 : 16)) + 'px';
      }
      function placeSign() {
        const s = WEED.sign, mw = G.phone ? 150 : 190, x = K.clamp(G.weed.x - (G.phone ? 22 : 30), mw / 2 + 8, G.w - mw / 2 - 8);
        s.style.setProperty('--mw', mw + 'px'); s.style.left = x + 'px'; s.style.top = Math.round(G.weed.y - G.Hf * 0.42 * Math.max(0.5, WEED.k) * 0.86 - 16) + 'px';
      }
      function setRing() {
        const m = Math.min(1, WAT.m); canEl.style.setProperty('--m', m.toFixed(3));
        canEl.style.setProperty('--zl', ((Math.min(1, Z.hi) - Z.lo) * 100).toFixed(1)); canEl.style.setProperty('--zo', (-Z.lo * 100).toFixed(1));
      }

      /* ---------------- drawing ---------------- */
      const SKY = {
        b: [['#7fb6e0', '#bfe0f2', '#ffe5c8'], ['#56aae6', '#a6d8f3', '#d9f0fa'], ['#5872bd', '#f2a57a', '#ffcf8c']],
        d: [['#15224a', '#38508a', '#d99a7c'], ['#173462', '#33608f', '#7fa7c8'], ['#241b46', '#7e4060', '#ee8c5a']]
      };
      function skyAt(p, D) {
        const ks = SKY[D ? 'd' : 'b'], u = p < 0.5 ? p / 0.5 : 1, v = p < 0.5 ? 0 : clamp01((p - 0.5) / 0.42);
        return [0, 1, 2].map(i => p < 0.5 ? mixHex(ks[0][i], ks[1][i], u) : mixHex(ks[1][i], ks[2][i], v));
      }
      function drawSky(g, t, D) {
        const p = SUN.p + GOLD.k * 0.04, cols = skyAt(Math.min(1, p), D), w = G.w, hz = G.floorY, sb = G.hz - G.H * 0.1;
        const gr = g.createLinearGradient(0, 0, 0, sb); gr.addColorStop(0, cols[0]); gr.addColorStop(0.6, cols[1]); gr.addColorStop(1, cols[2]);
        g.fillStyle = gr; g.fillRect(0, 0, w, Math.min(hz, G.hz - G.H * 0.08));
        if (D) { g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) { const a = (1 - Math.min(1, p * 3.2)) * (0.3 + 0.4 * Math.sin(t * 1.1 + i)); if (a <= 0.02) continue; g.globalAlpha = a; g.fillRect((i * 97.3) % w, (i * 53.7) % (G.hz * 0.6), 1.3, 1.3); } g.globalAlpha = 1; }
        // clouds drift by (behind the sun, so the sun you pull is never hidden)
        if (LY.cloud) for (const c of G.clouds) { const cw = 240 * c.s, ch = 100 * c.s; g.globalAlpha = D ? 0.62 : 0.9; g.drawImage(LY.cloud, c.x, c.y, cw, ch); }
        g.globalAlpha = 1;
        // the sun, warming as the day goes
        const sp = arcPt(SUN.p), gold = clamp01((SUN.p - 0.55) / 0.35) * 0.7 + GOLD.k * 0.3, R0 = (G.phone ? 22 : 28) * (1 + gold * 0.2) * (SUN.drag ? 1.08 : 1);
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = (D ? 0.7 : 0.85) * (1 - gold); g.drawImage(SUNGLOW, sp.x - R0 * 5.5, sp.y - R0 * 5.5, R0 * 11, R0 * 11);
        g.globalAlpha = (D ? 0.75 : 0.9) * gold; g.drawImage(GOLDGLOW, sp.x - R0 * 6.5, sp.y - R0 * 6.5, R0 * 13, R0 * 13);
        if (SUN.live || GOLD.k > 0) { g.globalAlpha = 0.18 + (SUN.drag ? 0.12 : 0); g.strokeStyle = gold > 0.5 ? '#ffd29a' : '#fff1c4'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i < 12; i++) { const a = t * 0.25 + i * TAU / 12, r1 = R0 * 1.45, r2 = R0 * (1.9 + 0.2 * Math.sin(t * 2 + i)); g.moveTo(sp.x + Math.cos(a) * r1, sp.y + Math.sin(a) * r1); g.lineTo(sp.x + Math.cos(a) * r2, sp.y + Math.sin(a) * r2); } g.stroke(); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.fillStyle = mixHex('#fff0b0', '#ffb05a', gold); g.beginPath(); g.arc(sp.x, sp.y, R0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(sp.x - R0 * 0.28, sp.y - R0 * 0.3, R0 * 0.38, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
      function drawArc(g, t) {
        if (!SUN.live) return;
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        g.fillStyle = '#fff4d0';
        for (let q = SUN.p + 0.03; q < SUN.p1 - 0.008; q += 0.021) { const pt = arcPt(q); g.globalAlpha = 0.35 + 0.35 * pulse * (1 - (q - SUN.p) / 0.3); g.beginPath(); g.arc(pt.x, pt.y, G.phone ? 2.3 : 2.8, 0, TAU); g.fill(); }
        const e = arcPt(SUN.p1); g.globalAlpha = 0.85; g.strokeStyle = '#fff4d0'; g.lineWidth = 2; g.beginPath(); g.arc(e.x, e.y, (G.phone ? 9 : 11) + pulse * 2, 0, TAU); g.stroke();
        g.globalAlpha = 1;
      }
      const sway = (x, t) => (Math.sin(t * 0.85 + x * 0.011) * 0.6 + Math.sin(t * 1.7 + x * 0.023) * 0.4) * (RED ? 0.008 : 0.026);
      function drawPlaced(g, t, z) { for (const o of placed) if (o.z === z) drawSpr(g, o.spr, o.x, o.y, sway(o.x, t), 1); }
      function drawHoles(g, t) {
        G.holes.forEach((ho, i) => {
          const st = HS[i];
          if (st.wet > 0.01) { g.fillStyle = 'rgba(22,12,6,' + (0.55 * st.wet).toFixed(3) + ')'; g.beginPath(); g.ellipse(ho.x, ho.y + 1, 10 + 20 * st.wet, 2.4 + 2.4 * st.wet, 0, 0, TAU); g.fill(); }
          if (!today.some(tp => tp.hole === i)) { g.fillStyle = 'rgba(20,10,4,0.5)'; g.beginPath(); g.ellipse(ho.x, ho.y + 1, 12, 3, 0, 0, TAU); g.fill(); }
          if (st.target) {
            const pu = 0.5 + 0.5 * Math.sin(t * 4), near = SEED.held ? clamp01(1 - Math.hypot(SEED.x - ho.x, SEED.y - ho.y) / 160) : 0;
            g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 + 0.3 * pu + near * 0.3; g.drawImage(HOLEGLOW, ho.x - 34 - near * 10, ho.y - 26 - near * 6, 68 + near * 20, 52 + near * 12); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
            g.strokeStyle = 'rgba(255,240,190,' + (0.6 + 0.3 * pu) + ')'; g.lineWidth = 2; g.setLineDash([4, 4]); g.lineDashOffset = -t * 12; g.beginPath(); g.ellipse(ho.x, ho.y + 1, 19 + pu * 2 + near * 5, 6 + pu + near * 1.5, 0, 0, TAU); g.stroke(); g.setLineDash([]);
          }
          if (st.seeded && !today.some(tp => tp.hole === i)) { g.fillStyle = '#5a3a26'; g.beginPath(); g.ellipse(ho.x, ho.y - 1, 9, 3.4, 0, Math.PI, 0); g.fill(); }
        });
      }
      function drawToday(g, t) {
        for (const tp of today) {
          const ho = G.holes[tp.hole];
          if (tp.spr) { const pop = tp.pop > 0 ? 1 + 0.05 * Math.sin((1 - tp.pop) * Math.PI) : 1; drawSpr(g, tp.spr, ho.x, ho.y, sway(ho.x, t) * 0.55, pop); }
          else { g.save(); g.translate(ho.x, ho.y); drawPlant(g, tp.P, G.Hf, tp.g, t); g.restore(); }
        }
      }
      function drawWeed(g, t) {
        if (!WEED.on || WEED.k <= 0.01) return;
        const x = G.weed.x, y = G.weed.y, Hw = G.Hf * 0.42 * WEED.k, sh = WEED.shade;
        if (sh > 0.01) { g.globalAlpha = 0.6 * sh; g.drawImage(SHADOW, x - G.Hf * 0.3, y - G.Hf * 0.3, G.Hf * 0.6, G.Hf * 0.36); g.globalAlpha = 1; }
        g.save(); g.translate(x, y);
        const wob = (RED ? 0.3 : 1) * (1 - sh * 0.85);
        g.rotate(Math.sin(t * 6.5) * 0.05 * wob + WEED.tug * Math.sin(t * 34) * 0.12);
        g.scale(Hw, Hw * (1 + WEED.tug * 0.3));
        const leaf = mixHex('#86995a', '#4f5a44', sh), leafD = mixHex('#5d6f37', '#373e30', sh);
        for (let i = 0; i < 7; i++) { const a = -Math.PI + 0.32 + i * (Math.PI - 0.64) / 6; g.save(); g.rotate(a); const s = 0.4 + (i % 2) * 0.08 + Math.sin(i * 2.1) * 0.04; g.scale(s, s); g.fillStyle = i % 2 ? leaf : leafD; g.fill(PATH.jag); g.restore(); }
        g.strokeStyle = leafD; g.lineWidth = 0.045; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(0.09, -0.36, 0.03, -0.66); g.stroke();
        const hx = 0.03, hy = -0.72;
        g.strokeStyle = mixHex('#7d9152', '#454c3e', sh); g.lineWidth = 0.016; g.beginPath();
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.moveTo(hx + Math.cos(a) * 0.05, hy + 0.04 + Math.sin(a) * 0.05); g.lineTo(hx + Math.cos(a) * 0.11, hy + 0.04 + Math.sin(a) * 0.11); }
        g.stroke();
        g.fillStyle = mixHex('#7d9152', '#454c3e', sh); g.beginPath(); g.ellipse(hx, hy + 0.04, 0.07, 0.065, 0, 0, TAU); g.fill();
        g.strokeStyle = mixHex('#a383b8', '#5b5464', sh); g.lineWidth = 0.022; g.beginPath();
        for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.2; g.moveTo(hx, hy); g.lineTo(hx + Math.cos(a) * 0.11, hy + Math.sin(a) * 0.11); }
        g.stroke();
        g.restore();
      }
      function drawWater(g, t) {
        if (!WAT.down || !cur) return;
        const ho = curHole(), sx = CAN.x - 42, sy = CAN.y + 13;
        g.strokeStyle = 'rgba(200,236,255,0.6)'; g.lineWidth = 1.8; g.lineCap = 'round';
        for (let i = 0; i < 5; i++) { const off2 = (i - 2) * 2.6; g.beginPath(); g.moveTo(sx + off2 * 0.4, sy); g.quadraticCurveTo(sx - 8 + off2, (sy + ho.y) / 2, ho.x + 4 + off2 + Math.sin(t * 22 + i) * 1.4, ho.y - 2); g.stroke(); }
      }
      function drawLights(g, t) {
        if (!GOLD.on) return;
        g.globalCompositeOperation = 'lighter';
        for (const L of G.lights) { if (L.on <= 0.01) continue; const fl = 0.9 + 0.1 * Math.sin(t * 3 + L.x); g.globalAlpha = 0.55 * L.on * fl; g.drawImage(WARM, L.x - 16, L.y - 16, 32, 32); }
        if (G.lamp) { g.globalAlpha = 0.7 * GOLD.k; g.drawImage(WARM, G.lamp.x - 40, G.lamp.y - 40, 80, 80); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        for (const L of G.lights) { if (L.on <= 0.01) continue; g.globalAlpha = L.on; g.fillStyle = '#fff1c2'; g.beginPath(); g.ellipse(L.x, L.y, 2.6, 3.6, 0, 0, TAU); g.fill(); }
        g.globalAlpha = 1;
      }
      function drawTint(g, t, D) {
        const p = SUN.p, gk = Math.max(clamp01((p - 0.62) / 0.3) * 0.75, GOLD.k);
        if (gk > 0.01) {
          g.fillStyle = 'rgba(255,' + (D ? 140 : 160) + ',70,' + (0.13 * gk).toFixed(3) + ')'; g.fillRect(0, 0, G.w, G.H);
          if (GOLD.k > 0.01) { // long golden rays from the low sun
            const sp = arcPt(SUN.p), L = Math.hypot(G.w, G.H);
            g.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 6; i++) {
              const a = Math.PI * 0.82 + (i - 2.5) * 0.11 + Math.sin(t * 0.2 + i) * 0.02, w2 = 0.035 + (i % 3) * 0.012;
              const gr = g.createLinearGradient(sp.x, sp.y, sp.x + Math.cos(a) * L, sp.y + Math.sin(a) * L);
              gr.addColorStop(0, D ? 'rgba(255,214,150,' + (0.16 * GOLD.k).toFixed(3) + ')' : 'rgba(255,170,90,' + (0.09 * GOLD.k).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,190,110,0)');
              g.fillStyle = gr; g.beginPath(); g.moveTo(sp.x, sp.y); g.lineTo(sp.x + Math.cos(a - w2) * L, sp.y + Math.sin(a - w2) * L); g.lineTo(sp.x + Math.cos(a + w2) * L, sp.y + Math.sin(a + w2) * L); g.closePath(); g.fill();
            }
            g.globalCompositeOperation = 'source-over';
          }
        }
      }
      function drawSnail(g, t) {
        if (DATA.n < 6) return;
        const B = G.bed, span = B.w - 40, x = B.x + 20 + ((t * 2.2) % span), y = B.soil + 7;
        g.fillStyle = '#d9c39a'; g.beginPath(); g.ellipse(x, y + 2, 9, 2.6, 0, 0, TAU); g.fill();
        g.strokeStyle = '#d9c39a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 7, y); g.lineTo(x + 9, y - 6); g.moveTo(x + 8, y); g.lineTo(x + 12, y - 5); g.stroke();
        g.fillStyle = '#3a2a1a'; g.beginPath(); g.arc(x + 9, y - 6.5, 1, 0, TAU); g.arc(x + 12, y - 5.5, 1, 0, TAU); g.fill();
        g.fillStyle = '#c8783a'; g.beginPath(); g.arc(x - 1, y - 3, 6, 0, TAU); g.fill();
        g.strokeStyle = '#8a4a1e'; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 18; i++) { const a = i * 0.6, r = 5.2 - i * 0.27; if (i) g.lineTo(x - 1 + Math.cos(a) * r, y - 3 + Math.sin(a) * r); else g.moveTo(x - 1 + Math.cos(a) * r, y - 3 + Math.sin(a) * r); } g.stroke();
      }
      function drawBugs(g, t) {
        for (const b of bugs) {
          const s = b.s;
          g.save(); g.translate(b.x, b.y);
          if (b.type === 'bee') {
            g.rotate(K.clamp(b.vx * 0.004, -0.4, 0.4));
            const f = Math.abs(Math.sin(t * 46 + b.ph));
            g.fillStyle = 'rgba(255,255,255,0.78)';
            g.beginPath(); g.ellipse(-s * 0.18, -s * 0.5, s * 0.3, s * 0.48 * (0.35 + f * 0.65), -0.45, 0, TAU); g.fill();
            g.beginPath(); g.ellipse(s * 0.22, -s * 0.5, s * 0.3, s * 0.48 * (0.35 + f * 0.65), 0.45, 0, TAU); g.fill();
            g.fillStyle = b.c[0]; g.beginPath(); g.ellipse(0, 0, s * 0.62, s * 0.42, 0, 0, TAU); g.fill();
            g.fillStyle = b.c[1]; g.fillRect(-s * 0.1, -s * 0.4, s * 0.15, s * 0.8); g.fillRect(s * 0.24, -s * 0.34, s * 0.13, s * 0.68);
            g.beginPath(); g.arc(-s * 0.6, 0, s * 0.26, 0, TAU); g.fill();
          } else if (b.type === 'lady') {
            g.rotate(Math.atan2(b.vy, b.vx || 0.001) + Math.PI / 2);
            const f = b.sit > 0 ? 0 : Math.abs(Math.sin(t * 40 + b.ph));
            if (f > 0) { g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(-s * 0.5, s * 0.1, s * 0.25, s * 0.55 * f, -0.6, 0, TAU); g.ellipse(s * 0.5, s * 0.1, s * 0.25, s * 0.55 * f, 0.6, 0, TAU); g.fill(); }
            g.fillStyle = b.c[1]; g.beginPath(); g.arc(0, -s * 0.48, s * 0.24, 0, TAU); g.fill();
            g.fillStyle = b.c[0]; g.beginPath(); g.ellipse(0, 0, s * 0.46, s * 0.52, 0, 0, TAU); g.fill();
            g.fillStyle = b.c[1]; g.fillRect(-s * 0.03, -s * 0.48, s * 0.06, s * 0.98);
            [[-0.22, -0.15], [0.22, -0.15], [-0.25, 0.18], [0.25, 0.18], [0, 0.34]].forEach(([u, v]) => { g.beginPath(); g.arc(u * s, v * s, s * 0.08, 0, TAU); g.fill(); });
            g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(-s * 0.16, -s * 0.24, s * 0.08, 0, TAU); g.fill();
          } else {
            const f = b.sit > 0 ? 0.55 + 0.45 * Math.sin(t * 2.6 + b.ph) : Math.abs(Math.sin(t * 10 + b.ph));
            for (const sd of [-1, 1]) {
              g.save(); g.scale(sd * (0.2 + 0.8 * f), 1);
              g.fillStyle = b.c[0]; g.beginPath(); g.ellipse(s * 0.5, -s * 0.26, s * 0.56, s * 0.42, -0.55, 0, TAU); g.fill();
              g.fillStyle = b.c[2]; g.beginPath(); g.ellipse(s * 0.36, s * 0.24, s * 0.36, s * 0.3, 0.55, 0, TAU); g.fill();
              g.fillStyle = b.c[1]; g.beginPath(); g.arc(s * 0.66, -s * 0.36, s * 0.11, 0, TAU); g.fill(); g.beginPath(); g.arc(s * 0.86, -s * 0.18, s * 0.07, 0, TAU); g.fill();
              g.restore();
            }
            g.strokeStyle = '#2a1e18'; g.lineCap = 'round'; g.lineWidth = s * 0.13; g.beginPath(); g.moveTo(0, -s * 0.36); g.lineTo(0, s * 0.42); g.stroke();
            g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(0, -s * 0.36); g.quadraticCurveTo(-s * 0.1, -s * 0.7, -s * 0.24, -s * 0.78); g.moveTo(0, -s * 0.36); g.quadraticCurveTo(s * 0.1, -s * 0.7, s * 0.24, -s * 0.78); g.stroke();
          }
          g.restore();
        }
      }
      function draw(t, dt) {
        const g = cv.g, D = dark();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        drawSky(g, t, D);
        g.drawImage(LY.back.c, 0, 0, G.w, G.H);
        drawLights(g, t);
        drawArc(g, t);
        drawPlaced(g, t, 'back');
        g.drawImage(LY.bed.c, 0, LY.bed.y0, G.w, LY.bed.hh);
        drawHoles(g, t);
        drawPlaced(g, t, 'bed');
        drawWeed(g, t);
        drawToday(g, t);
        drawPlaced(g, t, 'front');
        drawSnail(g, t);
        if (G.mug) { // steam curls off the tea
          g.strokeStyle = dark() ? 'rgba(220,230,255,0.22)' : 'rgba(255,255,255,0.55)'; g.lineWidth = 1.6; g.lineCap = 'round';
          for (let i = 0; i < 2; i++) { const x0 = G.mug.x - 3 + i * 6, ph = t * 1.6 + i * 2; g.beginPath(); g.moveTo(x0, G.mug.y); g.bezierCurveTo(x0 + Math.sin(ph) * 5, G.mug.y - 8, x0 - Math.sin(ph + 1) * 5, G.mug.y - 14, x0 + Math.sin(ph + 2) * 3, G.mug.y - 22); g.stroke(); }
        }
        drawWater(g, t);
        P.update(dt); P.draw(g);
        drawBugs(g, t);
        drawTint(g, t, D);
      }

      /* ---------------- per-frame updates (gameplay on the real clock) ---------------- */
      K.loop((dtIn, t) => {
        const g = cv.g; if (!g || !LY.back) return;
        if (el.dataset.phase !== phase) el.dataset.phase = phase;
        if (phase === 'intro' && drawn > 2) { lastNow = performance.now(); return; }
        if (dtIn < 0.25) { qAcc += dtIn; qN++; if (qN >= 90) { if (qAcc / qN > 0.07 && cv.quality > 0.8) cv.setQuality(0.8); qAcc = 0; qN = 0; } }
        acc += dtIn;
        const now = performance.now(), rdt = Math.min(0.25, Math.max(0, (now - lastNow) / 1000)); lastNow = now;
        update(rdt, t);
        const busy = SEED.held || WAT.down || SUN.live || WEED.tug > 0 || (WEED.on && WEED.k < 0.999 && !WEED.shrunk) || bugs.length || P.count() > 0 || GOLD.on || today.some(tp => tp.pop > 0);
        if (!busy && (half ^= 1)) return; // when only the breeze moves, paint every other frame
        const dt = Math.min(0.06, acc); acc = 0;
        draw(t, dt);
        drawn++;
      });
      function update(rdt, t) {
        // clouds
        for (const c of G.clouds) { c.x += c.v * rdt; if (c.x > G.w + 40) c.x = -240 * c.s - 40; }
        // watering
        if (WAT.on) {
          if (WAT.down) {
            WAT.m = Math.min(1.32, WAT.m + rdt / WATER_T);
            const ho = curHole();
            if (rnd() < rdt * 26) P.emit('drop', ho.x + (rnd() - 0.5) * 14, ho.y - 2, 1, { angle: -Math.PI / 2, spread: 1.6, speed: [30, 80], colors: ['rgba(200,235,255,0.9)'] });
            if (pourV) pourV.freq(600 + Math.min(1, WAT.m) * 1500, 0.08);
            HS[cur.hole].wet = Math.min(1, WAT.m);
            const inZ = WAT.m >= Z.lo && WAT.m <= Z.hi;
            if (inZ && !WAT.inZone) { WAT.inZone = true; canEl.classList.add('tg-inzone'); SND.zone(); }
            else if (!inZ && WAT.inZone) { WAT.inZone = false; canEl.classList.remove('tg-inzone'); }
            if (WAT.m >= 1.32) { WAT.down = false; canEl.classList.remove('tg-pour'); SND.pourOff(); judgeWater(); }
          }
          setRing();
        }
        // the sun and the growing flower
        if (SUN.live) {
          const v = (SUN.p1 - SUN.p0) / SUN_T;
          if (SUN.target > SUN.p) { SUN.p = Math.min(SUN.target, SUN.p + v * rdt); placeSun(); sunEl.setAttribute('aria-valuenow', String(Math.round((SUN.p - SUN.p0) / (SUN.p1 - SUN.p0) * 100))); }
          if (SUN.drag) { const lag = SUN.target - SUN.p; SUN.sn += rdt * clamp01(1 - Math.max(0, lag - 0.04) / 0.18); SUN.sd += rdt; }
          const tp = cur && cur.tp;
          if (tp) {
            const g0 = tp.g, gN = Math.max(g0, 0.05 + 0.95 * clamp01((SUN.p - SUN.p0) / (SUN.p1 - SUN.p0)));
            if (gN > g0) {
              tp.g = gN;
              const ni = Math.floor(gN * 12); while (SUN.notes < ni) { SUN.notes++; SND.note(SUN.notes + cur.r); }
              let lf = 0; for (const l of tp.P.leaves) if (l.t > g0 && l.t <= gN) lf++;
              if (lf) { SND.leaf(); }
              let bl = 0; for (const b of tp.P.blooms) { const o0 = b.t + 0.02; if (o0 > g0 && o0 <= gN) { bl++; const ho = curHole(); if (b.ch !== 'c' || rnd() < 0.35) P.emit('mote', ho.x + b.x * G.Hf, ho.y + b.y * G.Hf, b.ch === 'c' ? 1 : 3, { colors: [tp.P.pet2, '#fff6d8'], speed: [10, 30] }); } }
              if (bl) SND.petal(SUN.notes);
              if (cur.r === 1 && WEED.on) { const sh = clamp01((gN - 0.28) / 0.55); if (sh > WEED.shade) { WEED.shade = sh; if (sh > 0.55 && WEED.sign && !WEED.sign.classList.contains('tg-shaded')) { WEED.sign.classList.add('tg-shaded'); SND.shrink(); } } }
            }
            if (rnd() < rdt * 6) { const pt = arcPt(SUN.p); P.emit('mote', pt.x + (rnd() - 0.5) * 30, pt.y + (rnd() - 0.5) * 30, 1, { colors: ['#fff3c4', '#ffe08a'], speed: [6, 20] }); }
          }
          if (SUN.p >= SUN.p1 - 1e-4) bloomed();
        }
        for (const tp of today) if (tp.pop > 0) tp.pop = Math.max(0, tp.pop - rdt * 1.8);
        // the weed: pops up, wobbles, shrinks in the shade
        if (WEED.on) {
          const age = (performance.now() - WEED.born) / 1000, popK = RED ? clamp01(age / 0.2) : outBack(clamp01(age / 0.6));
          const tgt = popK * (1 - 0.6 * WEED.shade);
          WEED.k += (tgt - WEED.k) * Math.min(1, rdt * (age < 0.7 ? 30 : 3));
          if (WEED.shade >= 0.999 && Math.abs(WEED.k - tgt) < 0.002) WEED.shrunk = true;
          if (WEED.tug > 0) WEED.tug = Math.max(0, WEED.tug - rdt * 2.2);
          if (WEED.sign && !WEED.shrunk) placeSign();
        }
        // golden hour
        if (GOLD.on) {
          GOLD.k = Math.min(1, GOLD.k + rdt / 2.2);
          if (SUN.p < 0.95) { SUN.p = Math.min(0.95, SUN.p + rdt * 0.006); placeSun(); }
          const el2 = (performance.now() - GOLD.t0) / 1000;
          G.lights.forEach((L, i) => { if (!L.at && el2 > 0.25 + i * 0.07) { L.at = 1; SND.light(i); } if (L.at) L.on = Math.min(1, L.on + rdt * 4); });
          if (rnd() < rdt * (RED ? 1.5 : 4)) P.emit('mote', rnd() * G.w, G.bed.soil - rnd() * G.Hf * 1.2, 1, { colors: ['#ffe9a0', '#fff6d8', '#ffd08a'], speed: [6, 18] });
        }
        stepBugs(rdt, t);
        if (performance.now() > chimeAt && A.ctx && phase !== 'intro') { chimeAt = performance.now() + 8000 + rnd() * 9000; const b0 = 6 + Math.floor(rnd() * 4); [0, 2, 1, 3].slice(0, 2 + Math.floor(rnd() * 3)).forEach((d, i) => A.chime(A.note(SCALE[b0 + d]), { when: A.now() + i * (0.18 + rnd() * 0.12), vol: 0.018, dur: 1.6, verb: 0.6, bus: 'amb' })); }
      }

      /* ---------------- characters ---------------- */
      function speaker(c) { [drop, still].forEach(x => { if (x !== c) { x.hush(); if (!GOLD.on) x.show(false); } }); c.show(true); c.react('bounce'); return c; }
      function placeFinaleCast() {
        const cs = G.phone ? 62 : 84;
        still.el.style.setProperty('--sz', cs + 'px');
        still.side('left'); still.place(G.w - cs - (G.phone ? 12 : 30), G.H - cs - (G.phone ? 20 : 26));
      }
      const L = {
        hello: { Jolly: 'A tiny balcony bed, all ours. Every good thing you notice becomes a seed.', Cheeky: 'One empty bed. Zero flowers. Three good things will fix that.', Unfiltered: 'Empty bed. Three good things. Let’s grow them.' },
        helloText: { Jolly: 'What you wrote can stay where it is. For two minutes, let’s grow a few good things beside it.', Cheeky: 'Your worries can wait on the bench. We’re gardening.', Unfiltered: 'The rest can wait. Let’s grow a few good things.' },
        helloGood: { Jolly: 'Something good happened? Let’s plant it before it slips past.', Cheeky: 'Good news? Nobody scrolls past good news on my balcony. Plant it.', Unfiltered: 'Something good happened. Let’s plant it.' },
        helloCare: 'This won’t fix what’s going on, and it doesn’t have to. Just two minutes with a few small good things.',
        back: { Jolly: 'Welcome back! Everything’s still blooming. Nothing wilts here.', Cheeky: 'You’re back. The plants barely noticed you left. Nothing wilts here.', Unfiltered: 'Back again. All still blooming. Nothing wilts here.' },
        backPot: { Jolly: 'Welcome back! It’s all still blooming, and look, a new pot!', Cheeky: 'You’re back, and the garden got bigger. New pot, who dis?', Unfiltered: 'Back again. Still blooming. New pot.' },
        ask: [
          { Jolly: 'First seed: someone. Who made today a bit better?', Cheeky: 'Seed one: a person. Or a pet. Pets count.', Unfiltered: 'First: someone.' },
          { Jolly: 'Next seed: something small you enjoyed.', Cheeky: 'Seed two: a small joy. Snacks count.', Unfiltered: 'Next: a small joy.' },
          { Jolly: 'Last seed: a small win. Tiny absolutely counts.', Cheeky: 'Final seed: a win. Getting up counts. I checked.', Unfiltered: 'Last: a small win.' }
        ],
        water: { Jolly: 'Hold the can. Let go when the ring’s in the green.', Cheeky: 'Water it. Not a flood, not a sip. The green bit.', Unfiltered: 'Hold to water. Green is right.' },
        more: { Jolly: 'A little more. Hold until the ring reaches the green.', Cheeky: 'That was a sip. Seeds are thirsty.', Unfiltered: 'More water.' },
        grow: [
          { Jolly: 'Now pull the sun across, slowly. Picture it while it grows.', Cheeky: 'Drag the sun. Slowly. Replay the good bit while you do.', Unfiltered: 'Pull the sun slowly. Picture it.' },
          { Jolly: 'Midday now. Slowly again. Remember how it felt.', Cheeky: 'Sun’s up. Slow drag, slow savour.', Unfiltered: 'Slowly. Remember it.' },
          { Jolly: 'Last stretch to golden hour. Take your time with this one.', Cheeky: 'Golden hour is that way. No rush, it’s literally the sun.', Unfiltered: 'Last stretch. Slowly.' }
        ],
        bloom: [
          { Jolly: 'Look at that. Your first bloom.', Cheeky: 'Flower number one. Show-off.', Unfiltered: 'One bloom.' },
          { Jolly: 'Two good things, blooming.', Cheeky: 'Two for two.', Unfiltered: 'Two blooms.' },
          { Jolly: 'Three good things, all in bloom.', Cheeky: 'Three for three. Gardener of the year.', Unfiltered: 'Three blooms.' }
        ],
        weed1: { Jolly: 'Oh! Something else just popped up.', Cheeky: 'Uh oh. We’ve got company.', Unfiltered: 'Something popped up.' },
        weed2: { Jolly: 'A worry weed. Don’t yank it, they just dig in. Plant a good thing right beside it.', Cheeky: 'Classic worry weed. Yanking makes it dig in. Crowd it with something good instead.', Unfiltered: 'A worry. Don’t fight it. Plant something good beside it.' },
        weed2ex: { Jolly: 'Even on good days a worry weed can pop up. Don’t yank it. Plant a good thing beside it.', Cheeky: 'Even good days get the odd worry weed. Don’t yank it. Out-grow it.', Unfiltered: 'Worries pop up. Don’t fight them. Plant beside them.' },
        weedCare: 'That’s a real worry, and it’s allowed to be here. We’re not pulling it. Let’s grow something good beside it.',
        tug: { Jolly: 'Pulling just makes it dig in. Plant beside it instead.', Cheeky: 'Roots like a grudge, that one. Plant beside it.', Unfiltered: 'Won’t budge. Plant beside it.' },
        tugCare: 'No need to fight it. Plant something good beside it.',
        shaded: { Jolly: 'See? You didn’t fight it. It just gets less light now.', Cheeky: 'Look at it, sulking in the shade. Still there. Way smaller.', Unfiltered: 'Still there. Smaller. Less light.' },
        shadedCare: 'It’s still there, and that’s okay. It just isn’t the only thing growing.',
        gold: { Jolly: 'Golden hour. And look who came to visit!', Cheeky: 'Golden hour. The bees have heard about this place.', Unfiltered: 'Golden hour. Visitors.' },
        photo: { Jolly: 'Quick, a photo. You grew this.', Cheeky: 'Photo, before the bees ask for royalties.', Unfiltered: 'Take a photo.' },
        snapped: { Jolly: 'Three good things, growing in the light. They’ll still be here next time.', Cheeky: 'Framed. And they’ll still be blooming next time. Zero watering guilt.', Unfiltered: 'They’ll still be here next time.' }
      };
      const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
      function savour(it) {
        if (it.user) return line({ Jolly: 'Your own good thing. That one deserves a flower.', Cheeky: 'Straight from you. Premium seed.', Unfiltered: 'Your words. Good seed.' });
        const sv = it.sv, C = cap(sv);
        if (it.kind === 'who') return line({ Jolly: C + '. Lovely. Plant it right here.', Cheeky: C + '? Top-shelf seed.', Unfiltered: C + '. Good seed.' });
        if (it.kind === 'what') return line({ Jolly: 'Mm, ' + sv + '. Plant it right here.', Cheeky: C + '. Excellent soil choice.', Unfiltered: C + '. Plant it.' });
        return line({ Jolly: C + '. That counts. Plant it.', Cheeky: C + '. Small win, big seed.', Unfiltered: C + '. Counts.' });
      }

      /* ---------------- step 1: pick a good thing ---------------- */
      function chipItems(r) {
        const kind = RK[r], pool = K.shuffle(KINDS[kind].pool, K.rng(dayN * 7 + r * 131 + 17)), own = OWN[r] && r < 2 ? OWN[r] : '';
        const n = G.phone ? 5 : 6, items = [];
        if (own) items.push({ label: own, sv: '', kind: 'own', user: true });
        pool.slice(0, n - items.length).forEach(([label, sv]) => items.push({ label, sv, kind }));
        return items;
      }
      function showPanel(title, sub, items, onPick) {
        panel.textContent = '';
        const row = h('div', { class: 'tg-chips' });
        const chips = items.map(it => {
          const b = h('button', { type: 'button', class: 'tg-chip' }, h('i', { style: { '--c': KCOL[it.kind][0] } }), h('span', { class: it.user ? 'gk-user' : null, text: it.label }));
          S.listen(b, 'pointerdown', () => { if (A.ctx) A.click({ vol: 0.06 }); });
          b.addEventListener('click', () => { if (panel.classList.contains('tg-away')) return; onPick(it, b); });
          row.append(b); return b;
        });
        panel.append(h('p', { class: 'tg-q' }, h('b', { text: title }), sub ? h('span', { text: sub }) : null), row);
        panel.setAttribute('aria-label', title);
        panel.classList.remove('tg-away');
        return chips;
      }
      const hidePanel = () => panel.classList.add('tg-away');
      function pickGood(r) {
        return new Promise(res => {
          const kind = RK[r];
          speaker(drop).say(line(L.ask[r]), { ms: 4400 });
          const chips = showPanel(KINDS[kind].q, KINDS[kind].sub, chipItems(r), (it, b) => {
            if (phase !== 'pick') return;
            phase = 'picked';
            b.classList.add('tg-picked'); SND.pick(); K.guide(null);
            const rr = K.rectIn(b, el); P.emit('star', rr.cx, rr.cy, 10, { colors: ['#fff6d0', KCOL[it.kind][0]], speed: [40, 120] });
            ctx.track('good', { kind: it.kind, own: it.user ? 1 : 0, r });
            drop.say(savour(it), { mood: 'happy', moodMs: 1800, ms: 3000 });
            K.later(() => { hidePanel(); res(it); }, 450);
          });
          K.guide({ id: 'pick-' + r, g: 'choose', target: () => chips.filter(c => c.isConnected), label: 'PICK A GOOD THING', place: 'above', delay: 1100 });
        });
      }

      /* ---------------- step 2: plant the seed ---------------- */
      function readySeed(it) {
        const col = KCOL[it.kind];
        seedEl.style.setProperty('--c', col[0]); seedEl.style.setProperty('--c2', col[1]);
        SEED.x = G.seedHome.x; SEED.y = G.seedHome.y; SEED.held = false; SEED.live = true;
        seedEl.classList.remove('tg-sink', 'tg-held'); seedEl.hidden = false; seedEl.tabIndex = 0; placeSeed();
        HS[cur.hole].target = true;
        P.emit('star', SEED.x, SEED.y, 8, { colors: ['#fff6d0', col[0]], speed: [30, 90] }); SND.seedIn();
        guidePlant(900);
      }
      function guidePlant(delay) { const ho = curHole(); K.guide({ id: 'plant-' + cur.r, g: 'drag', target: seedEl, dx: ho.x - SEED.x, dy: ho.y - 8 - SEED.y, ms: 1500, label: 'PLANT THE SEED', place: 'above', delay }); }
      K.drag(seedEl, {
        space: el,
        start: (p) => { if (phase !== 'plant' || !SEED.live) return false; SEED.held = true; SEED.gx = p.x - SEED.x; SEED.gy = p.y - SEED.y; seedEl.classList.add('tg-held'); SND.grab(); P.emit('mote', SEED.x, SEED.y, 4, { colors: ['#fff6d0'] }); },
        move: (p) => { if (!SEED.held) return; SEED.x = K.clamp(p.x - SEED.gx, 20, G.w - 20); SEED.y = K.clamp(p.y - SEED.gy, 70, G.H - 20); placeSeed(); if (rnd() < 0.35) P.emit('mote', SEED.x, SEED.y + 8, 1, { colors: ['#fff6d0', KCOL[cur.it.kind][0]], speed: [4, 14] }); },
        end: () => {
          if (!SEED.held) return;
          SEED.held = false; seedEl.classList.remove('tg-held');
          const ho = curHole(), B = G.bed, onBed = SEED.x > B.x - 10 && SEED.x < B.x + B.w + 10 && SEED.y > B.soil - G.Hf * 0.45 && SEED.y < B.soil + 34;
          if (Math.hypot(SEED.x - ho.x, SEED.y - ho.y) < (G.phone ? 70 : 80) || onBed) plantSeed();
          else { SEED.x = G.seedHome.x; SEED.y = G.seedHome.y; placeSeed(); SND.back(); guidePlant(800); }
        }
      });
      S.listen(seedEl, 'keydown', (e) => { if ((e.code === 'Enter' || e.code === 'Space') && phase === 'plant') { e.preventDefault(); A.unlock(); plantSeed(); } });
      function plantSeed() {
        if (phase !== 'plant') return;
        phase = 'planting'; SEED.live = false; K.guide(null); seedEl.tabIndex = -1;
        const ho = curHole();
        seedEl.classList.add('tg-sink'); SEED.x = ho.x; SEED.y = ho.y - 6; placeSeed();
        K.later(() => { seedEl.hidden = true; seedEl.classList.remove('tg-sink'); }, 420);
        HS[cur.hole].target = false; HS[cur.hole].seeded = true;
        K.later(() => { SND.plant(); P.emit('dust', ho.x, ho.y - 2, 16, { colors: SOILC, speed: [30, 100], angle: -Math.PI / 2, spread: 2.4 }); }, 260);
        drop.face('wow', 900);
        addTag(cur);
        ctx.track('planted', { r: cur.r });
        K.later(() => resolveW('planted'), 700);
      }
      function addTag(c) {
        const it = c.it, el2 = h('div', { class: 'tg-tag', style: { '--rot': ((c.r % 2 ? 1 : -1) * (1.5 + rnd() * 2)).toFixed(1) + 'deg' } }, h('span', { class: it.user ? 'gk-user' : null, text: it.label }));
        el.append(el2); const t = { el: el2, hole: c.hole }; tags.push(t); placeTag(t);
      }

      /* ---------------- step 3: water it ---------------- */
      function readyCan() {
        CAN.ready = true; placeDom();
        canEl.classList.add('tg-ready');
        WAT.on = true; WAT.m = 0; WAT.down = false; WAT.inZone = false; setRing();
        SND.canIn();
        if (cur.r === 0) drop.say(line(L.water), { ms: 3600 });
        guideWater(950);
      }
      function guideWater(delay) { K.guide({ id: 'water-' + cur.r, g: 'hold', target: canEl, label: WAT.m > 0.05 ? 'A LITTLE MORE WATER' : 'HOLD TO WATER', ms: Math.round(WATER_T * 900), place: 'above', delay }); }
      K.press(canEl, {
        space: el,
        down: () => {
          if (phase !== 'water' || !WAT.on) { canEl.classList.add('tg-pour'); K.later(() => canEl.classList.remove('tg-pour'), 260); if (A.ctx) A.noise({ filter: 'bandpass', freq: 1800, dur: 0.12, vol: 0.05 }); return; }
          WAT.down = true; canEl.classList.add('tg-pour'); SND.pourOn();
        },
        up: () => { if (!WAT.down) return; WAT.down = false; canEl.classList.remove('tg-pour'); SND.pourOff(); judgeWater(); }
      });
      S.listen(canEl, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && phase === 'water' && WAT.on) { e.preventDefault(); A.unlock(); WAT.down = true; canEl.classList.add('tg-pour'); SND.pourOn(); } });
      S.listen(canEl, 'keyup', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && WAT.down) { WAT.down = false; canEl.classList.remove('tg-pour'); SND.pourOff(); judgeWater(); } });
      function judgeWater() {
        if (phase !== 'water' || !WAT.on) return;
        if (WAT.m < 0.6) {
          if (!WAT.nudged) { WAT.nudged = true; drop.say(line(L.more), { ms: 2800 }); }
          guideWater(700); return;
        }
        phase = 'watered'; WAT.on = false; K.guide(null);
        const m = WAT.m, inZ = m >= Z.lo && m <= Z.hi, score = inZ ? 1 : m < Z.lo ? clamp01(1 - (Z.lo - m) / 0.5) : clamp01(1 - (m - Z.hi) / 0.6);
        waterScores.push(Math.max(0.3, score));
        const ho = curHole();
        K.pop(inZ ? 'Just right' : m < Z.lo ? 'Good enough' : 'Well watered', { x: K.clamp(ho.x, 90, G.w - 90), y: ho.y - 64, kind: inZ ? 'great' : 'good' });
        SND.watered(inZ);
        canEl.classList.remove('tg-ready', 'tg-inzone'); CAN.ready = false; placeDom();
        // a sprout appears
        const s = Math.floor(rnd() * 999983), kind = cur.it.kind, hh = Math.round((rnd() - 0.5) * 16) / 100;
        cur.tp = { P: buildPlant(kind, s, hh), hole: cur.hole, g: 0.05, spr: null, pop: 0, k: kind, s, h: hh };
        today.push(cur.tp);
        K.later(() => { SND.sprout(); P.emit('leaf', ho.x, ho.y - 8, 3, { colors: ['#7cc45a', '#5ea548'], speed: [20, 50] }); }, 250);
        ctx.track('watered', { r: cur.r, score: Math.round(score * 100) });
        K.later(() => resolveW('watered'), 800);
      }

      /* ---------------- step 4: pull the sun across to grow it ---------------- */
      function readySun(r) {
        SUN.p0 = PR[r][0]; SUN.p1 = PR[r][1]; SUN.p = Math.max(SUN.p, SUN.p0); SUN.target = SUN.p; SUN.live = true; SUN.drag = false; SUN.sn = 0; SUN.sd = 0; SUN.notes = 0;
        sunEl.classList.add('tg-live'); sunEl.tabIndex = 0; placeSun();
        drop.say(line(L.grow[r]), { mood: 'grow', moodMs: 2200, ms: 4600 });
        guideSun(1000, 'PULL THE SUN ACROSS');
      }
      function guideSun(delay, label) {
        const a = arcPt(SUN.p), b = arcPt(Math.min(SUN.p1, SUN.p + 0.2));
        K.guide({ id: 'sun-' + cur.r + '-' + Math.round(SUN.p * 100), g: 'drag', target: () => arcPt(SUN.p), dx: b.x - a.x, dy: b.y - a.y, ms: 1900, label, place: a.y > G.H * 0.27 ? 'above' : 'below', delay });
      }
      K.drag(sunEl, {
        space: el,
        start: () => { if (!SUN.live) { if (A.ctx) A.chime(A.note('D6'), { vol: 0.03, dur: 0.8 }); return false; } SUN.drag = true; SND.sunGrab(); },
        move: (p) => { if (!SUN.drag) return; const q = pFromPt(p.x, p.y); if (q > SUN.target) SUN.target = Math.min(SUN.p1, q); },
        end: () => { if (!SUN.drag) return; SUN.drag = false; if (SUN.live && SUN.target < SUN.p1 - 0.002) K.later(() => { if (SUN.live && !SUN.drag && SUN.p >= SUN.target - 0.001) guideSun(100, 'KEEP PULLING'); }, 1300); }
      });
      K.onKey(['ArrowRight', 'ArrowUp'], (e) => { if (!SUN.live) return; e.preventDefault(); SUN.target = Math.min(SUN.p1, SUN.target + 0.035); });
      function bloomed() {
        if (!SUN.live) return;
        SUN.live = false; SUN.drag = false; sunEl.classList.remove('tg-live'); sunEl.tabIndex = -1;
        phase = 'bloom'; K.guide(null);
        const tp = cur.tp; tp.g = 1; tp.spr = spriteOf(tp.P, G.Hf); tp.pop = 1;
        sunSteady.push(SUN.sd > 0.3 ? SUN.sn / SUN.sd : 1);
        const ho = curHole(), top = tp.P.blooms.find(b => b.ch === 'B') || tp.P.blooms[tp.P.blooms.length - 1], hx = ho.x + (top ? top.x : 0) * G.Hf, hy = ho.y + (top ? top.y : -0.8) * G.Hf;
        SND.bloom(cur.r);
        P.emit('star', hx, hy, 16, { colors: ['#fffbe6', tp.P.pet2], speed: [50, 150] });
        P.emit('petal', hx, hy, RED ? 3 : 8, { colors: [tp.P.pet, tp.P.pet2], speed: [30, 90] });
        P.emit('mote', hx, hy, 8, { colors: ['#fff6d8', tp.P.pet2], speed: [10, 40] });
        if (DATA.plants.length < 400) DATA.plants.push({ k: tp.k, s: tp.s, h: tp.h });
        DATA.n++; save();
        drop.face('flower', 2000); drop.react('bounce');
        ctx.track('bloom', { r: cur.r, kind: tp.k });
        heads = null;
        K.later(() => resolveW('bloomed'), 700);
      }

      /* ---------------- the twist: a worry weed ---------------- */
      function worryInfo() {
        const all = [an.core].concat(an.strands || []).filter(s => s && s.label);
        const goodish = (s) => { const k = String(s.label).toUpperCase(); return POS.test(k) && !NEG.test(k); };
        const real = noWords ? null : all.find(s => !s.generic && !goodish(s) && !GENERIC.has(String(s.label).replace(/[’‘]/g, "'").toUpperCase()));
        if (real) return { label: String(real.label).trim(), own: true };
        const gen = all.find(s => s.generic) || { label: 'WHAT IF IT GOES WRONG' };
        return { label: String(gen.label).trim(), own: false };
      }
      async function weedTwist() {
        phase = 'weed';
        await K.wait(500);
        WEED.info = worryInfo();
        WEED.on = true; WEED.born = performance.now(); WEED.k = 0;
        SND.weed();
        P.emit('dust', G.weed.x, G.weed.y - 2, 18, { colors: SOILC, speed: [40, 120], angle: -Math.PI / 2, spread: 2 });
        const wi = WEED.info;
        WEED.sign = h('div', { class: 'tg-wsign', role: 'note' }, h('small', { text: wi.own ? 'A worry weed' : 'A worry like' }), h('span', { class: 'tg-wt' + (wi.own ? ' gk-user' : ''), text: wi.label }));
        el.append(WEED.sign); placeSign();
        weedHit.hidden = false;
        drop.say(line(L.weed1), { mood: 'worried', ms: 2400 });
        ctx.track('weed', { own: wi.own ? 1 : 0 });
        await K.wait(2300);
        speaker(still).say(care() ? L.weedCare : line(wi.own ? L.weed2 : L.weed2ex), { mood: care() ? 'calm' : 'think', moodMs: 0, ms: 5600 });
        await K.wait(RED ? 2600 : 3600);
      }
      K.press(weedHit, {
        space: el,
        down: () => {
          if (!WEED.on || WEED.shade > 0.5) return;
          WEED.tug = 1; SND.tug(); P.emit('dust', G.weed.x, G.weed.y - 2, 6, { colors: SOILC, speed: [20, 60], angle: -Math.PI / 2, spread: 1.6 });
          if (!WEED.said) { WEED.said = true; speaker(still).say(care() ? L.tugCare : line(L.tug), { mood: care() ? 'calm' : 'wink', moodMs: 1600, ms: 3000 }); K.later(() => { if (phase === 'pick' || phase === 'plant') speaker(drop); }, 3200); }
        }
      });

      /* ---------------- finale: golden hour, visitors, a photo ---------------- */
      function allHeads() {
        if (heads) return heads;
        heads = [];
        today.forEach(tp => {
          const ho = G.holes[tp.hole], mine = [];
          tp.P.blooms.forEach(b => { if (b.ch === 'B' || b.ch === 'Q' || b.ch === 'b' || (b.ch === 'c' && rnd() < 0.3)) mine.push({ x: ho.x + b.x * G.Hf, y: ho.y + b.y * G.Hf - b.r * G.Hf * 0.3, main: false, tp }); });
          if (mine.length) mine.reduce((a, q) => (q.y < a.y ? q : a)).main = true;
          heads.push(...mine);
        });
        placed.forEach(o => { const b = o.P.blooms.find(q => q.ch === 'B') || o.P.blooms[o.P.blooms.length - 1]; if (b) heads.push({ x: o.x + b.x * G.Hf * o.sc, y: o.y + b.y * G.Hf * o.sc, main: false }); });
        return heads;
      }
      function nextTarget(b) {
        const hs = allHeads(); if (!hs.length) return;
        let hd = hs[Math.floor(rnd() * hs.length)];
        if (hd === b.last && hs.length > 1) hd = hs[(hs.indexOf(hd) + 1) % hs.length];
        b.last = hd; b.tx = hd.x + (rnd() - 0.5) * 6; b.ty = hd.y - 2;
      }
      function spawnBugs() {
        const nB = [2, 3, 5][inten], nF = [2, 3, 4][inten], ph = G.phone ? 1 : 1.3;
        const from = () => { const sd = rnd() < 0.5; return { x: sd ? -30 : G.w + 30, y: G.H * (0.25 + rnd() * 0.35) }; };
        const FLY = [['#fffdf5', '#2a2a2a', '#f0eee6'], ['#ffe27a', '#b8962e', '#fff3c0'], ['#9fc8ff', '#3a5aa8', '#dbe9ff']];
        for (let i = 0; i < nB; i++) { const f = from(); bugs.push({ type: 'bee', c: ['#ffcf3a', '#2a2018'], s: 9 * ph, x: f.x, y: f.y, vx: 0, vy: 0, sp: 95, wf: 7, wa: 30, sit: 0, stay: 1.1, ph: rnd() * 6, last: null, tx: 0, ty: 0 }); }
        for (let i = 0; i < nF; i++) { const f = from(); bugs.push({ type: 'fly', c: FLY[i % 3], s: 11 * ph, x: f.x, y: f.y, vx: 0, vy: 0, sp: 62, wf: 3, wa: 40, sit: 0, stay: 1.8, ph: rnd() * 6, last: null, tx: 0, ty: 0 }); }
        const v = VISITOR, f = from();
        const vip = { type: v.type, c: v.c, s: (v.type === 'lady' ? 9 : v.type === 'bee' ? 12 : 15) * ph, x: f.x, y: G.H * 0.2, vx: 0, vy: 0, sp: 70, wf: 3, wa: 26, sit: 0, stay: 99, ph: rnd() * 6, last: null, tx: 0, ty: 0, vip: true };
        const hs = allHeads(), tgt = hs.find(q => q.main && q.tp === today[today.length - 1]) || hs[0];
        if (tgt) { vip.tx = tgt.x; vip.ty = tgt.y - 3; vip.last = tgt; }
        bugs.push(vip);
        bugs.forEach(b => { if (!b.vip) nextTarget(b); });
      }
      let buzzAt = 0;
      function stepBugs(dt, t) {
        if (!bugs.length) return;
        for (const b of bugs) {
          if (b.sit > 0) {
            b.sit -= dt; b.x = b.tx + Math.sin(t * 2 + b.ph) * 1.2; b.y = b.ty + Math.sin(t * 3 + b.ph) * 0.8;
            if (b.sit <= 0) nextTarget(b);
            continue;
          }
          const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1, sp = b.sp * (RED ? 0.6 : 1) * (d < 60 ? 0.45 + d / 110 : 1);
          b.vx += (dx / d * sp - b.vx) * Math.min(1, dt * 2.6); b.vy += (dy / d * sp - b.vy) * Math.min(1, dt * 2.6);
          const wob = d > 20 ? 1 : d / 20;
          b.x += b.vx * dt + Math.sin(t * b.wf + b.ph) * b.wa * dt * wob; b.y += b.vy * dt + Math.cos(t * b.wf * 1.3 + b.ph) * b.wa * dt * wob;
          if (d < 4) { b.sit = b.stay * (0.7 + rnd() * 0.6); b.vx = b.vy = 0; P.emit('mote', b.x, b.y, 3, { colors: ['#ffe9a0', '#fff6d8'], speed: [6, 20] }); if (b.vip && A.ctx) A.chime(A.note('B6'), { vol: 0.04, dur: 1.2 }); }
        }
        if (performance.now() > buzzAt && bugs.some(b => b.type === 'bee' && b.sit <= 0)) { buzzAt = performance.now() + 900 + rnd() * 1400; SND.buzz(); }
      }
      async function finale() {
        phase = 'golden'; K.guide(null);
        GOLD.on = true; GOLD.t0 = performance.now();
        SND.golden(); MUS.vol = 1;
        placeFinaleCast(); still.show(true); still.hush(); still.base('happy'); still.react('bounce');
        speaker(drop).say(line(L.gold), { mood: 'celebrate', moodMs: 2600, ms: 4400 });
        spawnBugs();
        await K.wait(RED ? 2000 : 3800);
        phase = 'photo';
        camEl.hidden = false;
        drop.say(line(L.photo), { mood: 'flower', ms: 0 });
        K.guide({ id: 'photo', g: 'tap', target: camEl, label: 'TAKE THE PHOTO', place: 'above', delay: 700 });
        K.later(() => { if (phase === 'photo') snap(); }, 14000);
        await waitFor('snapped');
        await K.wait(RED ? 1800 : 3200);
        end();
      }
      K.tap(camEl, () => snap());
      function snap() {
        if (phase !== 'photo') return;
        phase = 'snapped'; K.guide(null);
        camEl.classList.add('tg-out');
        SND.shutter();
        if (!RED) { const f = h('div', { class: 'tg-flash tg-on' }); el.append(f); K.later(() => f.classList.remove('tg-on'), 40); K.later(() => f.remove(), 900); }
        // the photo: today's bed in golden light, bees and all
        const bx = Math.max(0, G.bed.x - 26), bx1 = Math.min(G.w, G.bed.x + G.bed.w + 26), by = Math.max(0, G.bed.soil - G.Hf - 30), by1 = Math.min(G.H, G.bed.bottom + 10);
        const sw = bx1 - bx, sh = by1 - by, pw = G.phone ? 236 : 300, ph = Math.round(Math.min(pw * 1.05, pw * sh / sw));
        const pc = document.createElement('canvas'); pc.width = Math.round(pw * 2); pc.height = Math.round(ph * 2);
        const pg = pc.getContext('2d');
        try {
          const ar = sw / sh, tar = pw / ph; let sx = bx, sy = by, sww = sw, shh = sh;
          if (ar > tar) { sww = sh * tar; sx = bx + (sw - sww) / 2; } else { shh = sw / tar; sy = by + (sh - shh) / 2; }
          pg.drawImage(cv.el, sx * cv.dpr, sy * cv.dpr, sww * cv.dpr, shh * cv.dpr, 0, 0, pc.width, pc.height);
        } catch (e) { pg.fillStyle = '#ffcf8a'; pg.fillRect(0, 0, pc.width, pc.height); }
        pg.fillStyle = 'rgba(255,190,110,0.12)'; pg.fillRect(0, 0, pc.width, pc.height);
        const vg = pg.createRadialGradient(pc.width / 2, pc.height / 2, pc.width * 0.3, pc.width / 2, pc.height / 2, pc.width * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,30,10,0.35)');
        pg.fillStyle = vg; pg.fillRect(0, 0, pc.width, pc.height);
        const total = DATA.n;
        const photo = h('div', { class: 'tg-photo', style: { '--pw': pw + 'px', '--ph': ph + 'px', '--py': (G.phone ? Math.round(G.H * 0.205) : Math.round(G.H * 0.13)) + 'px' } }, pc, h('i', { class: 'tg-dev' }),
          h('p', null, document.createTextNode('Golden hour · 3 good things'), h('small', { text: 'Your garden: ' + total + (total === 1 ? ' flower' : ' flowers') + ', all blooming' })));
        el.append(photo);
        K.later(() => photo.classList.add('tg-developed'), 160);
        drop.say(line(L.snapped), { mood: 'love', ms: 0 });
        still.face('love', 2600);
        resolveW('snapped');
      }
      function end() {
        if (finished) return;
        finished = true; phase = 'end';
        const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 1);
        const green = clamp01(avg(waterScores) * 0.45 + avg(sunSteady) * 0.55), pct = Math.round(green * 100);
        const badges = [];
        const pb = K.best('green', pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + pct + '% green thumb');
        else if (pb.first) badges.push('Green thumb: ' + pct + '%');
        const tier = K.tier(green, [0.55, 0.75, 0.9]);
        if (tier) badges.push(tier + ' green thumb');
        const col = K.collect(VISITOR.name);
        badges.push((col.isNew ? 'New visitor: ' : 'Visitor: ') + VISITOR.name + ' (' + col.count + ' of ' + VISITORS.length + ')');
        if (newPot) badges.push('Your garden got a new pot');
        if (WEED.shrunk || WEED.shade > 0.9) DATA.weeds++;
        DATA.seen = OLD.length; save();
        const before = usedStations(OLD.length), nextPot = [...usedStations(DATA.plants.length)].some(id => id !== 'back' && !before.has(id));
        ctx.track('done', { green: pct, total: DATA.n, own: today.some(tp => tp.k === 'own') ? 1 : 0 });
        ctx.finish({
          title: 'Your garden is blooming', mood: 'flower',
          lines: ['3 good things planted and grown', 'Your garden: ' + DATA.n + (DATA.n === 1 ? ' flower' : ' flowers') + '. Nothing wilts.', nextPot ? 'Next visit: a new pot appears' : 'Next visit: more room to grow'],
          share: 'Planted 3 good things. They’re blooming.',
          badges
        });
      }

      /* ---------------- taps on the balcony answer softly ---------------- */
      S.listen(el, 'pointerdown', (e) => {
        if (phase === 'intro' || !G.w) return;
        const tg = e.target; if (tg && tg.closest && tg.closest('.tg-sun, .tg-seed, .tg-can, .tg-panel, .tg-weedhit, .tg-cam, button')) return;
        const p = K.local(e, el);
        P.emit(p.y > G.floorY ? 'leaf' : 'petal', p.x, p.y, 3, { colors: ['#ffc6d8', '#ffe27a', '#d9ceff', '#9bd37a'], speed: [20, 60] });
        SND.tap();
      });

      /* ---------------- start ---------------- */
      let newPot = false;
      cv.onResize(() => { layout(); if (cv.g && LY.back) draw(performance.now() / 1000, 0); });
      S.on('theme', () => { el.classList.toggle('tg-bright', !dark()); paintAll(); });
      (async () => {
        await K.intro({ title: 'Tiny Garden', sub: 'A little balcony bed. Every good thing you notice becomes a seed.', how: 'Pick a good thing, plant it, water it, then pull the sun across to grow it.', char: 'drop', mood: 'grow' });
        phase = 'welcome'; musicOn();
        const fresh = [...usedStations(OLD.length)].filter(id => !usedStations(Math.min(DATA.seen, OLD.length)).has(id) && id !== 'back');
        newPot = OLD.length > 0 && fresh.length > 0;
        if (OLD.length) {
          placed.forEach((o, i) => K.later(() => P.emit('star', o.x, o.y - G.Hf * o.sc * 0.6, 4, { colors: ['#fffbe6', '#ffe08a'], speed: [20, 60] }), 200 + i * 60));
          G.stations.filter(st => fresh.includes(st.id)).forEach(st => { const c = st.cont || st.pts[0]; K.later(() => { P.emit('star', c.x, c.y - 20, 16, { colors: ['#fffbe6', '#ffe08a'], speed: [40, 130] }); if (A.ctx) K.sfx.sparkle(); }, 700); });
        }
        const hello = care() ? L.helloCare : OLD.length ? line(newPot ? L.backPot : L.back) : line(OWN.length ? L.helloGood : noWords ? L.hello : L.helloText);
        drop.say(hello, { mood: OLD.length ? 'celebrate' : 'happy', moodMs: 2400, ms: 4200 });
        ctx.track('garden', { old: OLD.length, newPot: newPot ? 1 : 0 });
        await K.wait(OLD.length || !noWords ? 2600 : 2000);
        for (let r = 0; r < 3; r++) {
          cur = { r, hole: RH[r], it: null, tp: null };
          phase = 'pick';
          cur.it = await pickGood(r);
          phase = 'plant'; readySeed(cur.it);
          await waitFor('planted');
          phase = 'water'; readyCan();
          await waitFor('watered');
          phase = 'grow'; readySun(r);
          await waitFor('bloomed');
          if (r === 1 && WEED.on) {
            await K.wait(500);
            speaker(still).say(care() ? L.shadedCare : line(L.shaded), { mood: care() ? 'calm' : 'happy', moodMs: 0, ms: 4200 });
            weedHit.hidden = true;
            await K.wait(RED ? 2400 : 3400);
            speaker(drop);
          } else {
            drop.say(line(L.bloom[r]), { mood: 'flower', moodMs: 2200, ms: 2800 });
            await K.wait(r === 2 ? 1200 : 1700);
          }
          if (r === 0) await weedTwist();
        }
        await finale();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < (ms || 60000)) await K.wait(80); };
          for (let r = 0; r < 3; r++) {
            await until(() => (phase === 'pick' && !panel.classList.contains('tg-away') && panel.querySelector('.tg-chip')) || finished, 45000);
            await K.wait(800);
            { const chips = panel.querySelectorAll('.tg-chip'); if (chips.length) await K.sim.tap(chips[(dayN + r) % chips.length]); }
            await until(() => phase === 'plant' && SEED.live, 8000);
            await K.wait(700);
            { const r0 = K.rectIn(seedEl, el), ho = curHole(); await K.sim.drag(seedEl, { x: r0.w / 2, y: r0.h / 2 }, { x: ho.x - r0.x, y: ho.y - 6 - r0.y }, 700, 8); }
            await until(() => phase === 'water' && WAT.on, 8000);
            await K.wait(1000);
            { const r0 = K.rectIn(canEl, el), pr = await K.sim.press(canEl, r0.w / 2, r0.h / 2); await until(() => WAT.m >= (Z.lo + Math.min(1, Z.hi)) / 2 || phase !== 'water', 8000); pr.up(r0.w / 2, r0.h / 2); }
            await until(() => phase === 'grow' && SUN.live, 8000);
            await K.wait(900);
            {
              // a slow, steady pull on the real clock: the finger stays just ahead of the sun however busy the device is
              const r0 = K.rectIn(sunEl, el), pr = await K.sim.press(sunEl, r0.w / 2, r0.h / 2), p0 = SUN.p, span = SUN.p1 - p0, t0 = performance.now();
              for (;;) { const k = Math.min(1, (performance.now() - t0) / (SUN_T * 1000) + 0.04), pt = arcPt(p0 + span * k); pr.move(pt.x - r0.x, pt.y - r0.y); if (k >= 1 || !SUN.live) break; await K.wait(60); }
              await until(() => !SUN.live, 6000);
              const e = arcPt(SUN.p); pr.up(e.x - r0.x, e.y - r0.y);
            }
          }
          await until(() => phase === 'photo' || finished, 30000);
          await K.wait(900);
          if (!finished && phase === 'photo') await K.sim.tap(camEl);
          await until(() => finished, 20000);
        }
      };
    }
  });
})(window.TSG_ENV);
