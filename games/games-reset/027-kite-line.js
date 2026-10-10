/* 027 Kite Line — Reset · DISTANCE · Uncertainty / Future Worry / Reassurance
 * Mechanism: self-distancing (Kross & Ayduk 2011; Ayduk & Kross 2010). Seeing a worry from further away, in the mind's eye
 * and literally, lowers its emotional intensity and widens perspective: reliving becomes reviewing. The worry rides on a
 * bright kite. Every turn of the reel lets out line: the words shrink, the camera pulls back and the whole world comes into
 * view (fields, a river, a town, the coast). The twist is acceptance: in the big gust the steadiest move is to hold still and
 * let the kite ride it, instead of fighting every gust (experiential acceptance, ACT).
 * Verb: crank (circle the reel to let out line), tug (tap when a gust dips the kite), hold still (through the big gust).
 * Finale: the line runs out; you tie it to the fence post and lie back in the grass while the worry becomes a dot in a huge
 * sunset sky, the first stars come out and fireflies rise from the hill.
 * Come back: today's kite (8 designs to collect), today's sky, season and coastline (K.daily), best steady flight (K.best,
 * K.tier), and a hot-air balloon that drifts by for regulars (K.visits).
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;

  /* Eight kites to collect: one flies each day. c: [main, accent, trim, word panel] */
  const KITES = [
    { id: 'diamond', name: 'Sunburst Diamond', shape: 'diamond', c: ['#ffc23a', '#ff5f45', '#7a2c18', '#fff6dc'], tail: 'bows' },
    { id: 'delta', name: 'Coral Delta', shape: 'delta', c: ['#ff5f86', '#ffb43b', '#47204f', '#fff4e8'], tail: 'twin' },
    { id: 'rokkaku', name: 'Rokkaku', shape: 'rokkaku', c: ['#e6404c', '#22406e', '#22406e', '#fbf6ea'], tail: 'twin' },
    { id: 'sled', name: 'Sea Sled', shape: 'sled', c: ['#24c2c4', '#ff79a3', '#124a58', '#f6fffd'], tail: 'ribbon' },
    { id: 'star', name: 'Night Star', shape: 'star', c: ['#8d6cff', '#ffd23f', '#2b1f6b', '#fff9e3'], tail: 'ribbon' },
    { id: 'parafoil', name: 'Parafoil', shape: 'parafoil', c: ['#ff8a2a', '#2f6fdf', '#1d2a4a', '#fff8ec'], tail: 'twin' },
    { id: 'koi', name: 'Koi', shape: 'koi', c: ['#ff7b2e', '#fff1e2', '#c9283e', '#fff8ef'], tail: 'ribbon' },
    { id: 'barndoor', name: 'Barn Door', shape: 'barndoor', c: ['#3fb46a', '#f2df48', '#1f4a2a', '#fffbe8'], tail: 'bows' }
  ];
  /* Today's sky (daily). clouds: how many; haze: how far you can see; tint: a colour cast over the light. */
  const SKYV = [
    { id: 'clear', name: 'Clear skies', clouds: 1, haze: 1, tint: null },
    { id: 'billow', name: 'Big clouds', clouds: 1.6, haze: 1, tint: ['#a7bcd8', 0.08] },
    { id: 'haze', name: 'Summer haze', clouds: 0.7, haze: 0.72, tint: ['#ffd7a0', 0.14] },
    { id: 'crisp', name: 'After the rain', clouds: 1.2, haze: 1.5, tint: ['#7fb2ff', 0.07] },
    { id: 'pastel', name: 'Pastel evening', clouds: 1, haze: 1.1, tint: ['#ffc2dc', 0.12] }
  ];
  /* Today's season (daily): field patchwork, hedges, woods and the hill. */
  const SEASONS = [
    { id: 'spring', fields: ['#86c45a', '#a4d36a', '#6cae55', '#e3d455', '#79bb66', '#b6d886'], hedge: '#3d7337', wood: '#3a7d45', hill: ['#4f8f3e', '#9fd171'], town: '#d9ccb4', tree: ['#3f8a45', '#5fa84f'] },
    { id: 'summer', fields: ['#cdb558', '#e2c86c', '#8db654', '#d9a65a', '#a5c468', '#78a64e'], hedge: '#4a6b31', wood: '#3a6834', hill: ['#5e8f3c', '#b4cf6e'], town: '#dccbb0', tree: ['#3c6d34', '#5d8f3e'] },
    { id: 'autumn', fields: ['#c98a48', '#d8a65a', '#a77944', '#8f9a4a', '#b65a3a', '#c7b06a'], hedge: '#694a2b', wood: '#a85f2a', hill: ['#7a8a48', '#c2c27a'], town: '#d8c6ae', tree: ['#b5652a', '#d08a3a'] },
    { id: 'lavender', fields: ['#9c8ad4', '#b3a3e2', '#a3c467', '#d7c56a', '#8bb85a', '#c9b3e6'], hedge: '#4f6b35', wood: '#3d6a3a', hill: ['#5a8c42', '#a9cf73'], town: '#e0d2bd', tree: ['#3d6e3a', '#5c934a'] }
  ];
  /* The light from afternoon (0) through golden hour and sunset (1) to dusk (1.22). */
  const TODS = [0, 0.35, 0.7, 1.0, 1.22];
  const RAMP = {
    top: ['#2f7fd8', '#2d6cc6', '#2f4f9a', '#26336c', '#111940'],
    mid: ['#79b6ec', '#86b4e2', '#dca58e', '#d8737a', '#59407a'],
    hor: ['#d9efff', '#f6e8c9', '#ffd394', '#ffae68', '#e07c5c'],
    haze: ['#cfe3f4', '#e9dfc8', '#f2caa0', '#e8a08a', '#806084'],
    sun: ['#fffaf0', '#fff0c4', '#ffd890', '#ff9f55', '#ff7a45'],
    seaF: ['#9cc9ea', '#b9cad6', '#e6b991', '#ec9b78', '#8a5f78'],
    seaN: ['#2f73b3', '#2d68a2', '#33608f', '#384f86', '#22305e'],
    cloud: ['#ffffff', '#fff7e6', '#ffe1bd', '#ffb88f', '#e8908a'],
    shade: ['#c6d6ea', '#c9c6d4', '#c39aa6', '#8e6a8e', '#4a3a62'],
    warm: ['#ffffff', '#fff6e4', '#ffe2bc', '#ffc69a', '#b5a0c8'],
    light: [1, 0.98, 0.93, 0.84, 0.5]
  };
  /* Sunlight colour by time of day, per channel (it can run above 1): golden hour warms the land instead of greying it. */
  const SUNC = [[1, 1, 1], [1.05, 1, 0.93], [1.13, 0.97, 0.8], [1.2, 0.9, 0.72], [0.66, 0.58, 0.8]];
  /* The reel plays a folk tune in D major pentatonic as you crank (one note every third of a turn). */
  const MEL = ['A4', 'B4', 'D5', 'B4', 'A4', 'F#4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'D5', 'B4', 'A4', 'F#4', 'D5', 'E5', 'F#5', 'E5', 'D5', 'B4', 'A4', 'B4', 'A4', 'F#4', 'E4', 'D4', 'E4', 'F#4', 'A4', 'D5'];
  const CHORDS = [['D3', 'A3', 'E4', 'F#4'], ['B2', 'F#3', 'D4', 'A4'], ['G2', 'D3', 'B3', 'F#4'], ['A2', 'E3', 'D4', 'E4']];

  const hexRgb = (s) => { const n = parseInt(String(s).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const css = (c, al) => (al == null ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + Math.max(0, Math.min(1, al)).toFixed(3) + ')');
  const smooth = (k) => k * k * (3 - 2 * k);

  (env.games = env.games || []).push({
    id: 'kite-line', mode: 'reset', name: 'Kite Line', verb: 'crank', family: 'DISTANCE', minutes: 2,
    parents: ['Uncertainty / Future Worry / Reassurance', 'Mental Imagery', 'Overthinking / Thought Fusion'],
    cast: ['sync', 'drop'], poster: { char: 'sync', mood: 'happy' },
    fonts: ['Shantell+Sans:wght@700;800', 'Comfortaa:wght@600;700'],
    tagline: 'Write the worry on a kite, let out line, and watch it become a dot.',
    why: 'For a worry that feels huge up close: distance shrinks it and widens the view.',
    css: `
.g-kite-line { --kl-round: "Comfortaa", "Varela Round", "Nunito", "Trebuchet MS", system-ui, sans-serif; }
.g-kite-line.kl-duo .gk-char .gk-bubble { max-width: min(280px, calc(100cqw - var(--sz) * 2 - 58px)); }
.g-kite-line .kl-tug { position: absolute; inset: 0; z-index: 10; touch-action: none; }
.g-kite-line .kl-reel { position: absolute; z-index: 22; right: 8px; bottom: calc(env(safe-area-inset-bottom, 0px) + 14px); width: 168px; height: 168px; border-radius: 50%; touch-action: none; cursor: grab; outline: none; -webkit-tap-highlight-color: transparent; }
.g-kite-line .kl-reel:focus-visible { box-shadow: 0 0 0 3px #ffd36b; }
.g-kite-line .kl-reel.off { pointer-events: none; }
.g-kite-line .kl-meter { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 70px; text-align: center; pointer-events: none; color: #fff7e6; transition: opacity 0.4s ease; }
.g-kite-line .kl-meter b { display: block; font: 700 16px/1 var(--kl-round); letter-spacing: 0.01em; text-shadow: 0 1px 2px rgba(40, 18, 0, 0.6); font-variant-numeric: tabular-nums; }
.g-kite-line .kl-meter small { display: block; margin-top: 3px; font: 700 12px/1 var(--font-ui); letter-spacing: 0.14em; color: rgba(255, 236, 200, 0.85); }
.g-kite-line .kl-reel.off .kl-meter { opacity: 0; }
.g-kite-line .kl-mile { position: absolute; z-index: 26; left: 50%; top: 58%; transform: translate(-50%, 8px); width: max-content; max-width: calc(100% - 40px); box-sizing: border-box; padding: 9px 20px 11px; border-radius: 18px; background: rgba(12, 22, 52, 0.34); text-align: center; pointer-events: none; opacity: 0; transition: opacity 0.7s ease, transform 0.9s cubic-bezier(.2, .9, .3, 1); }
.g-kite-line .kl-mile.on { opacity: 1; transform: translate(-50%, 0); }
.g-kite-line .kl-mile small { display: block; font: 700 12px/1.2 var(--font-ui); letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255, 255, 255, 0.92); text-shadow: 0 1px 6px rgba(10, 20, 50, 0.55); }
.g-kite-line .kl-mile b { display: block; margin-top: 4px; font: 700 28px/1.05 var(--kl-round); color: #fff; letter-spacing: 0.01em; text-shadow: 0 2px 14px rgba(12, 24, 60, 0.55), 0 1px 2px rgba(12, 24, 60, 0.5); }
.g-kite-line.kl-bright .kl-mile { background: rgba(255, 255, 255, 0.5); }
.g-kite-line.kl-bright .kl-mile small { color: #1e3156; text-shadow: 0 0 8px rgba(255, 255, 255, 0.9), 0 0 2px rgba(255, 255, 255, 0.9); }
.g-kite-line.kl-bright .kl-mile b { color: #13284a; text-shadow: 0 0 14px rgba(255, 255, 255, 0.85), 0 0 3px rgba(255, 255, 255, 0.9); }
.g-kite-line .kl-cap { position: absolute; z-index: 27; left: 50%; top: 18%; transform: translate(-50%, 10px); width: max-content; max-width: calc(100% - 36px); text-align: center; pointer-events: none; opacity: 0; transition: opacity 1.2s ease, transform 1.4s cubic-bezier(.2, .9, .3, 1);
  font: 700 34px/1.1 var(--kl-round); color: #fff8ee; text-shadow: 0 2px 18px rgba(40, 10, 50, 0.6), 0 1px 2px rgba(40, 10, 50, 0.5); text-wrap: balance; }
.g-kite-line .kl-cap small { display: block; margin-top: 8px; font: 600 15px/1.35 var(--font-ui); color: rgba(255, 244, 230, 0.92); }
.g-kite-line .kl-cap.on { opacity: 1; transform: translate(-50%, 0); }
.g-kite-line .kl-hand { position: absolute; z-index: 24; left: 0; top: 0; width: 96px; height: 96px; margin: -48px 0 0 -48px; border-radius: 50%; touch-action: none; cursor: grab; outline: none; }
.g-kite-line .kl-hand:focus-visible, .g-kite-line .kl-lie:focus-visible { box-shadow: 0 0 0 3px #ffd36b; }
.g-kite-line .kl-lie { position: absolute; z-index: 24; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); width: min(340px, calc(100% - 40px)); height: 150px; transform: translateX(-50%); border-radius: 28px; touch-action: none; cursor: pointer; outline: none; }
.g-kite-line .kl-card { position: absolute; z-index: 40; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); width: min(360px, calc(100% - 28px)); box-sizing: border-box; padding: 14px 16px 15px; border-radius: 20px; text-align: center; transform: translateX(-50%);
  background: rgba(26, 20, 52, 0.9); border: 1px solid rgba(255, 214, 150, 0.45); color: #fff4e6; box-shadow: 0 18px 44px rgba(10, 4, 30, 0.5); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); transition: opacity 0.6s ease, transform 0.7s cubic-bezier(.2, 1.2, .4, 1); }
.g-kite-line .kl-card.pre { opacity: 0; transform: translate(-50%, 20px); }
.g-kite-line .kl-card-k { font: 700 12px/1.2 var(--font-ui); letter-spacing: 0.18em; text-transform: uppercase; color: #ffd391; }
.g-kite-line .kl-card-t { margin-top: 6px; font: 700 21px/1.15 var(--kl-round); color: #fff8ee; }
.g-kite-line .kl-card-s { margin-top: 6px; font: 500 15px/1.35 var(--font-ui); color: rgba(255, 244, 230, 0.9); text-wrap: balance; }
.g-kite-line .kl-tray { display: flex; justify-content: center; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
.g-kite-line .kl-tray canvas { width: 30px; height: 30px; border-radius: 9px; background: rgba(255, 255, 255, 0.07); }
.g-kite-line .kl-tray canvas.today { box-shadow: 0 0 0 2px #ffd391, 0 0 12px rgba(255, 211, 145, 0.7); }
.g-kite-line.kl-bright .kl-card { background: rgba(255, 252, 246, 0.94); border-color: rgba(176, 104, 40, 0.35); color: #2a1d12; box-shadow: 0 18px 40px rgba(60, 30, 10, 0.25); }
.g-kite-line.kl-bright .kl-card-k { color: #a2561a; }
.g-kite-line.kl-bright .kl-card-t { color: #2a1d12; }
.g-kite-line.kl-bright .kl-card-s { color: #4a3826; }
.g-kite-line.kl-bright .kl-tray canvas { background: rgba(60, 30, 10, 0.06); }
@container (min-width: 700px) {
  .g-kite-line .kl-reel { width: 196px; height: 196px; right: 22px; bottom: calc(env(safe-area-inset-bottom, 0px) + 22px); }
  .g-kite-line .kl-mile b { font-size: 34px; }
  .g-kite-line .kl-cap { font-size: 44px; top: 17%; }
  .g-kite-line .kl-card { width: 420px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      const an = ctx.analysis || {};
      const inten = ctx.intensity, visits = K.visits(), care = an.safety === 'care';
      const now = () => performance.now(), clamp = K.clamp, lerp = (a, b, t) => a + (b - a) * t;
      const line = (o) => ctx.line(o);
      const DAY = K.daily();
      const KITE = K.dailyPick(KITES, 3), SEASON = K.dailyPick(SEASONS, 11), SKY = K.dailyPick(SKYV, 7);
      const LMAX = [260, 320, 400][inten], MPR = [9, 10, 11][inten];
      // line paid out per turn of the reel: a little at a time low down (the words shrink slowly enough to watch), more up high
      const mprAt = (L) => MPR * lerp(0.42, 1.28, smooth(clamp((L - 14) / 170, 0, 1)));
      const DIPS = [[54, 0.8], [54, 104, 0.82], [52, 100, 150, 0.8, 0.88]][inten].map(v => (v < 1.5 ? Math.round(v * LMAX) : v));
      const GUST_L = Math.round(0.6 * LMAX), HOLD_NEED = [3000, 3800, 4600][inten];
      const DARK0 = K.dark(), TOD0 = DARK0 ? 0.42 : 0.04, TOD1 = 0.97;
      el.classList.toggle('kl-bright', !DARK0);
      S.on('theme', () => el.classList.toggle('kl-bright', !K.dark()));

      /* ---------------- the words on the kite: theirs, or an example (never presented as theirs) ---------------- */
      const own = (() => {
        if (an.core && an.core.label && !an.core.generic) return an.core.label;
        const s = (an.strands || []).find(x => x && x.label && !x.generic);
        return s ? s.label : '';
      })();
      const OWN = String(own || '').replace(/\s+/g, ' ').trim().toUpperCase();
      const EXAMPLE = !OWN;
      const WORDS = OWN || 'WHAT IF…';

      /* ---------------- palette ---------------- */
      const RP = {};
      Object.keys(RAMP).forEach(k => { RP[k] = RAMP[k].map(c => (typeof c === 'number' ? c : (SKY.tint ? mix3(hexRgb(c), hexRgb(SKY.tint[0]), SKY.tint[1]) : hexRgb(c)))); });
      function rampAt(key, tod) {
        const arr = RP[key]; let i = 0;
        while (i < TODS.length - 2 && tod > TODS[i + 1]) i++;
        const k = clamp((tod - TODS[i]) / (TODS[i + 1] - TODS[i]), 0, 1);
        return typeof arr[0] === 'number' ? arr[i] + (arr[i + 1] - arr[i]) * k : mix3(arr[i], arr[i + 1], k);
      }
      const PAL = { tod: -1 };
      function setTod(tod) {
        if (Math.abs(tod - PAL.tod) < 0.0015) return;
        PAL.tod = tod;
        ['top', 'mid', 'hor', 'haze', 'sun', 'seaF', 'seaN', 'cloud', 'shade', 'warm', 'light'].forEach(k => { PAL[k] = rampAt(k, tod); });
        PAL.key = Math.round(tod * 300);
        let i = 0; while (i < TODS.length - 2 && tod > TODS[i + 1]) i++;
        PAL.sunc = mix3(SUNC[i], SUNC[i + 1], clamp((tod - TODS[i]) / (TODS[i + 1] - TODS[i]), 0, 1));
      }
      const sunlit = (c, k) => { const s = PAL.sunc, l = PAL.light * (k || 1); return [Math.min(255, c[0] * s[0] * l), Math.min(255, c[1] * s[1] * l), Math.min(255, c[2] * s[2] * l)]; };
      const SEA = { fields: SEASON.fields.map(hexRgb), hedge: hexRgb(SEASON.hedge), wood: hexRgb(SEASON.wood), hill: SEASON.hill.map(hexRgb), town: hexRgb(SEASON.town), tree: SEASON.tree.map(hexRgb), sand: hexRgb('#e8d7a8'), road: hexRgb('#d9cfb8'), land: hexRgb(SEASON.fields[2]) };
      setTod(TOD0);

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const tugZone = h('div', { class: 'kl-tug', 'aria-hidden': 'true' });
      const meterB = h('b', { text: '14 m' });
      const reel = h('div', { class: 'kl-reel', role: 'slider', tabindex: '0', 'aria-label': 'Kite reel. Circle it to let out line. Hold it still in a big gust.', 'aria-valuemin': '0', 'aria-valuemax': String(LMAX), 'aria-valuenow': '14' },
        h('div', { class: 'kl-meter', 'aria-hidden': 'true' }, meterB, h('small', { text: 'LINE' })));
      const mile = h('div', { class: 'kl-mile', role: 'status' }, h('small'), h('b'));
      const cap = h('div', { class: 'kl-cap', role: 'status' });
      const hand = h('div', { class: 'kl-hand', role: 'button', tabindex: '0', 'aria-label': 'The kite line. Drag it to the fence post to tie it.', hidden: true });
      const lieZ = h('div', { class: 'kl-lie', role: 'button', tabindex: '0', 'aria-label': 'Press and hold to lie back in the grass.', hidden: true });
      el.append(tugZone, reel, mile, cap, hand, lieZ);
      const sync = K.character('sync', { side: 'right', mood: care ? 'calm' : 'worried', x: 10, y: 64 });
      const drop = K.character('drop', { side: 'left', mood: 'happy', x: 300, y: 64 });
      drop.show(false);
      let sayUntil = 0;
      function say(c, lines, mood, ms) {
        (c === sync ? drop : sync).hush();
        if (c === drop && drop.el.hidden) { drop.show(true); drop.react('bounce'); el.classList.add('kl-duo'); }
        const txt = line(lines);
        c.say(txt, { mood, ms: ms == null ? Math.max(2600, txt.length * 62) : ms });
        sayUntil = now() + (ms || Math.max(2600, txt.length * 62));
      }
      const sayFree = (c, lines, mood, ms) => { if (now() < sayUntil) return false; say(c, lines, mood, ms); return true; };

      /* ---------------- layout ---------------- */
      let W = 390, H = 844, phone = true, F = 600;
      const RL = { x: 300, y: 740, r: 70, half: 84 };
      function layout() {
        W = cv.w; H = cv.h; phone = W < 700; F = H * 0.72;
        const r = K.rectIn(reel, el); RL.x = r.cx; RL.y = r.cy; RL.half = r.w / 2; RL.r = r.w * 0.42;
        const sz = phone ? 72 : 96;
        sync.el.style.setProperty('--sz', sz + 'px'); drop.el.style.setProperty('--sz', sz + 'px');
        sync.place(phone ? 10 : 24, phone ? 64 : 72); drop.place(W - sz - (phone ? 10 : 24), phone ? 64 : 72);
        SPR.vig = null; SPR.reel = null; skyKey = '';
      }

      /* ---------------- the world (seeded by the day) ---------------- */
      const R = K.rng(DAY * 31 + 7), rr = (a, b) => a + R() * (b - a);
      const HILL = { R: 122, H: 34 };
      const AZ = 78 * Math.PI / 180, WD = { x: Math.cos(AZ), z: Math.sin(AZ) }, WP = { x: WD.z, z: -WD.x };
      const FEET = { x: 0, y: HILL.H, z: 0 };
      const hillY = (x, z) => { const d = Math.hypot(x, z); return d >= HILL.R ? 0 : HILL.H * Math.pow(Math.cos(Math.PI * d / (2 * HILL.R)), 2); };
      const cph = [rr(0, 6), rr(0, 6)], HEAD_X = rr(-1500, -1000);
      const coastZ = (x) => 1950 + 150 * Math.sin(x / 760 + cph[0]) + 70 * Math.sin(x / 290 + cph[1]) + 430 * Math.exp(-Math.pow((x - HEAD_X) / 360, 2)) - 210 * Math.exp(-Math.pow((x - 1100) / 600, 2));
      const TOWN = { x: rr(160, 460), z: rr(980, 1160) };
      function catmull(pts, seg) {
        const out = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
          for (let k = 0; k < seg; k++) {
            const t = k / seg, t2 = t * t, t3 = t2 * t, f = (j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
            out.push([f(0), f(1)]);
          }
        }
        out.push(pts[pts.length - 1].slice());
        return out;
      }
      // the river: from the far west, past the town, out to the bay
      const rc = [[-5600, 1300], [-3700, 950], [-2300, 1160], [-1300, 800], [-480, 960], [TOWN.x - 110, TOWN.z - 80], [TOWN.x + 300, TOWN.z + 230], [920, 1560], [1080, 0]];
      for (let i = 1; i < rc.length - 2; i++) { rc[i][0] += rr(-110, 110); rc[i][1] += rr(-120, 120); }
      rc[rc.length - 1][1] = coastZ(1080) + 80;
      const RIV = catmull(rc, 9);
      const RIVL = [], RIVR = [];
      RIV.forEach((p, i) => {
        const a = RIV[Math.max(0, i - 1)], b = RIV[Math.min(RIV.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
        const w = lerp(26, 78, Math.pow(i / (RIV.length - 1), 1.6)) / 2, nx = -dz / l * w, nz = dx / l * w;
        RIVL.push([p[0] + nx, p[1] + nz]); RIVR.push([p[0] - nx, p[1] - nz]);
      });
      const riverDist = (x, z) => { let m = 1e9; for (let i = 0; i < RIV.length; i += 2) { const d = Math.hypot(RIV[i][0] - x, RIV[i][1] - z); if (d < m) m = d; } return m; };
      // the road: from the foot of the hill to the town
      const ROAD = catmull([[40, 110], [150, 330], [70, 600], [TOWN.x - 240, TOWN.z - 300], [TOWN.x - 40, TOWN.z - 40]], 8);

      // the field lattice: columns west to east, rows from behind the hill out to the coast
      const LX0 = -3600, LDX = 240, LNX = 31, LZ0 = -760;
      const LT = [0, 0.09, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.77, 0.85, 0.92, 0.97, 1];
      const LNZ = LT.length, NV = LNX * LNZ;
      const LV = new Float64Array(NV * 2);
      for (let i = 0; i < LNX; i++) {
        for (let j = 0; j < LNZ; j++) {
          let x = LX0 + i * LDX;
          if (i > 0 && i < LNX - 1 && j < LNZ - 1) x += rr(-0.22, 0.22) * LDX;
          const cz = coastZ(x);
          let z = LZ0 + (cz - LZ0) * LT[j];
          if (j > 0 && j < LNZ - 1) z += rr(-0.24, 0.24) * (cz - LZ0) * (LT[j + 1] - LT[j]);
          if (j === LNZ - 1) z = cz;
          LV[(i * LNZ + j) * 2] = x; LV[(i * LNZ + j) * 2 + 1] = z;
        }
      }
      const CELLS = [];
      for (let i = 0; i < LNX - 1; i++) {
        for (let j = 0; j < LNZ - 1; j++) {
          const v = [i * LNZ + j, (i + 1) * LNZ + j, (i + 1) * LNZ + j + 1, i * LNZ + j + 1];
          let cx = 0, cz = 0; v.forEach(q => { cx += LV[q * 2] / 4; cz += LV[q * 2 + 1] / 4; });
          if (Math.hypot(cx, cz) < 80) continue;
          const town = Math.hypot(cx - TOWN.x, cz - TOWN.z) < 200;
          const kind = town ? 'town' : R() < 0.09 ? 'wood' : 'field';
          const base = kind === 'town' ? SEA.town : kind === 'wood' ? SEA.wood : SEA.fields[Math.floor(R() * SEA.fields.length)];
          CELLS.push({ v, kind, base: mix3(base, [0, 0, 0], rr(0, 0.07)), rows: kind === 'field' && R() < 0.55 ? 3 + Math.floor(R() * 3) : 0, rowDir: R() < 0.5 ? 0 : 1, key: -1, fill: '', cx, cz });
        }
      }

      // billboards: trees, houses, the church, wind turbines, the lighthouse, boats, the balloon, clouds
      const BB = [];
      const addTree = (x, z, s) => { if (Math.hypot(x, z) < HILL.R + 20 || z > coastZ(x) - 60 || riverDist(x, z) < 45) return; BB.push({ k: 'tree', x, y: 0, z, h: rr(9, 15) * (s || 1), c: R() < 0.5 ? 0 : 1 }); };
      CELLS.forEach(c => { if (c.kind === 'wood') for (let n = 0; n < 12; n++) { const a = R(), b = R() * (1 - a); const p = (q) => [LV[c.v[q] * 2], LV[c.v[q] * 2 + 1]]; const [p0, p1, p3] = [p(0), p(1), p(3)]; addTree(p0[0] + (p1[0] - p0[0]) * a + (p3[0] - p0[0]) * b, p0[1] + (p1[1] - p0[1]) * a + (p3[1] - p0[1]) * b); } });
      for (let q = 0; q < NV; q++) { if (q % LNZ === LNZ - 1) continue; if (R() < 0.3) addTree(LV[q * 2] + rr(-20, 20), LV[q * 2 + 1] + rr(-20, 20)); }
      for (let n = 0; n < 30; n++) { const a = rr(0, TAU), d = rr(HILL.R + 25, HILL.R + 170); addTree(Math.cos(a) * d, Math.sin(a) * d, 1.1); }
      const ROOFS = ['#b5523b', '#c8673f', '#7d4a3a', '#5a6f8f', '#9a4a3a'], WALLS = ['#f4ead8', '#efe0c4', '#e8d6bd', '#f7f1e6', '#e4d2c0'];
      for (let n = 0; n < 40; n++) {
        const a = rr(0, TAU), d = Math.abs(rr(-1, 1) * rr(0, 1)) * 200, x = TOWN.x + Math.cos(a) * d, z = TOWN.z + Math.sin(a) * d * 0.8;
        if (riverDist(x, z) < 40) continue;
        BB.push({ k: 'house', x, y: 0, z, w: rr(9, 16), h: rr(6, 10), roof: hexRgb(ROOFS[n % ROOFS.length]), wall: hexRgb(WALLS[n % WALLS.length]), lit: R() });
      }
      BB.push({ k: 'church', x: TOWN.x + 70, y: 0, z: TOWN.z + 40, w: 14, h: 34 });
      for (let n = 0; n < 5; n++) BB.push({ k: 'turbine', x: -1250 + n * 170 + rr(-30, 30), y: 0, z: 1180 + n * 110 + rr(-40, 40), h: 82, ph: rr(0, TAU) });
      BB.push({ k: 'lighthouse', x: HEAD_X - 60, y: 0, z: coastZ(HEAD_X - 60) - 70, h: 34 });
      for (let n = 0; n < 5; n++) { const x = rr(-1500, 2200); BB.push({ k: 'boat', x, y: 0, z: coastZ(x) + rr(250, 1500), h: rr(9, 13), dx: rr(-3, 3) }); }
      if (visits >= 2) BB.push({ k: 'balloon', x: -520, y: 210, z: 1100, h: 24, c: hexRgb(KITE.c[0]), c2: hexRgb(KITE.c[1]) });
      BB.push({ k: 'hill', x: 0, y: 0, z: 0 });
      const nC = Math.round(SKY.clouds * 11);
      for (let n = 0; n < nC; n++) BB.push({ k: 'cloud', x: rr(-2400, 2600), y: rr(170, 520), z: rr(400, 4600), w: rr(130, 300), spr: n % 4 });
      for (let n = 0; n < 4; n++) BB.push({ k: 'cloud', x: rr(-40, 220) + n * 50, y: rr(78, 128), z: rr(90, 420), w: rr(60, 110), spr: (n + 1) % 4 });
      // far hills across the bay, and the far shore
      const MTN = [];
      { const pts = []; for (let x = -11000; x <= -700; x += 400) pts.push([x, Math.max(0, 240 + 240 * Math.sin(x / 1300 + cph[0]) + 130 * Math.sin(x / 520) + (x > -2400 ? (x + 2400) * -0.17 : 0)), 7400 + 800 * Math.sin(x / 2400)]); MTN.push({ pts, dark: 0.18 }); }
      { const pts = []; for (let x = 1800; x <= 11000; x += 500) pts.push([x, Math.max(0, 100 + 70 * Math.sin(x / 900 + cph[1])), 8600]); MTN.push({ pts, dark: 0.1 }); }
      // sun glitter on the sea, along the line toward the sun
      const SUN_AZ = 0.28;
      const GLINT = [];
      for (let n = 0; n < 90; n++) { const d = 2150 + Math.pow(R(), 1.6) * 20000, lat = rr(-1, 1) * d * 0.035; GLINT.push({ x: Math.sin(SUN_AZ) * d + Math.cos(SUN_AZ) * lat, z: Math.cos(SUN_AZ) * d - Math.sin(SUN_AZ) * lat, ph: rr(0, TAU), w: rr(2, 5) }); }
      // grass tufts and the fence on the hilltop
      const TUFTS = [];
      for (let n = 0; n < 90; n++) { const a = rr(0, TAU), d = Math.sqrt(R()) * 11 + 0.6, x = Math.cos(a) * d, z = Math.sin(a) * d; TUFTS.push({ x, z, y: hillY(x, z), hh: rr(0.14, 0.34), ph: rr(0, TAU), c: R() }); }
      const POSTS = [[-2.3, 0.5], [-4.7, 0.15], [-7.1, -0.4], [-9.5, -1.1]].map(([x, z]) => ({ x, z, y: hillY(x, z) }));
      const SHEEP = []; for (let n = 0; n < 9; n++) { const a = rr(-2.6, 0.9), d = rr(30, 95), x = Math.cos(a) * d, z = Math.sin(a) * d; SHEEP.push({ x, z, y: hillY(x, z), ph: rr(0, TAU), f: R() < 0.5 ? 1 : -1 }); }
      const POST = POSTS[0];

      /* ---------------- camera & projection ---------------- */
      const CAM = { x: 4, y: 52, z: -2, yaw: 0.06, pitch: 0, ax: 0.5, ay: 0.7, f: 1 };
      let cYw = 1, sYw = 0, cPt = 1, sPt = 0, AX = 195, AY = 590, FF = 600, HOR = 590;
      function camPrep() { cYw = Math.cos(CAM.yaw); sYw = Math.sin(CAM.yaw); cPt = Math.cos(CAM.pitch); sPt = Math.sin(CAM.pitch); AX = W * CAM.ax; AY = H * CAM.ay; FF = F * CAM.f; HOR = AY + FF * Math.tan(CAM.pitch); }
      const PO = new Float64Array(6);
      function proj(X, Y, Z, o) {
        o = o || PO;
        const rx = X - CAM.x, ry = Y - CAM.y, rz = Z - CAM.z;
        const x1 = rx * cYw - rz * sYw, z1 = rx * sYw + rz * cYw;
        const y2 = ry * cPt - z1 * sPt, z2 = ry * sPt + z1 * cPt;
        o[0] = x1; o[1] = y2; o[2] = z2;
        if (z2 > 0.05) { const k = FF / z2; o[3] = AX + x1 * k; o[4] = AY - y2 * k; o[5] = k; } else { o[3] = NaN; o[4] = NaN; o[5] = 0; }
        return o;
      }
      const NEAR = 1.5;
      function clipNear(pts) { // camera-space polygon [[x,y,z],...] clipped to z > NEAR
        const out = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length], ain = a[2] > NEAR, bin = b[2] > NEAR;
          if (ain) out.push(a);
          if (ain !== bin) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]); }
        }
        return out;
      }
      function pathCam(g, pts) { // camera-space points → screen path (already clipped)
        for (let i = 0; i < pts.length; i++) { const p = pts[i], k = FF / p[2], x = AX + p[0] * k, y = AY - p[1] * k; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      }
      function polyWorld(g, list) { // list of [X,Y,Z] world points: clip + path (returns false when nothing is in front)
        const cam = list.map(p => { proj(p[0], p[1], p[2]); return [PO[0], PO[1], PO[2]]; });
        const cl = cam.every(p => p[2] > NEAR) ? cam : clipNear(cam);
        if (cl.length < 3) return false;
        g.beginPath(); pathCam(g, cl); g.closePath();
        return true;
      }
      const hazeK = (d) => 1 - Math.exp(-d / (3200 * SKY.haze));

      /* ---------------- kite physics (polar: elevation th, distance r from the hands; sway angle ph) ---------------- */
      const KM = 1.4, KQ = 0.7, CL0 = 1.0, CD0 = 0.56, GRV = 9.8, RD = 16;
      const KP = { th: 0.86, om: 0, r: 14, vr: 0, L: 14, T: 40, Ts: 40, bite: 0, taut: true, ph: 0, vph: 0 };
      const WND = { base: [6.8, 7.6, 8.3][inten], gs: 1, gd: 0, turb: 0, t: 0, gust: 0 };
      const ANC = { x: 0.05, y: HILL.H + 1.25, z: 0.36 };   // the hands; moves to the drag point and then the post
      const windAt = (t) => WND.base * WND.gs * (1 + 0.09 * Math.sin(t * 0.31) + 0.06 * Math.sin(t * 0.93 + 1.3) + 0.04 * Math.sin(t * 2.1 + 0.4));
      function physStep(dt, t) {
        const ws = windAt(t), ang = WND.gd + WND.turb * (Math.sin(t * 2.3) * 0.6 + Math.sin(t * 4.1 + 1) * 0.4);
        const wu = ws * Math.cos(ang), wv = -ws * Math.sin(ang);
        const c = Math.cos(KP.th), s = Math.sin(KP.th), vt = KP.om * RD;
        const au = wu + vt * s, av = wv - vt * c, as = Math.hypot(au, av) || 1e-3;
        const slack = KP.L - KP.r;
        const cl = CL0 * (slack > 5 ? 0.55 : 1) * (1 + KP.bite), q = KQ * as * as;
        const fu = q * (CD0 * au - cl * av) / as, fv = q * (CD0 * av + cl * au) / as - KM * GRV;
        const fr = fu * c + fv * s, ft = -fu * s + fv * c;
        let al = ft / (KM * RD) - 0.6 * KP.om - Math.min(1.2, KP.vr * 0.05);
        if (KP.th < 0.34) al += (0.34 - KP.th) * 9;
        if (KP.th > 1.12) al -= (KP.th - 1.12) * 16;
        KP.om += al * dt; KP.th += KP.om * dt;
        if (slack > 0.05) { KP.vr = Math.min(16, KP.vr + (Math.max(0, fr) / KM + 10) * dt); } else KP.vr += (fr / KM) * dt;
        KP.vr *= Math.exp(-0.5 * dt);
        KP.r += KP.vr * dt;
        if (KP.r >= KP.L) { KP.r = KP.L; if (KP.vr > 0) KP.vr = 0; KP.taut = true; } else KP.taut = slack < 0.8;
        KP.T = Math.max(0, fr);
        KP.bite = Math.max(0, KP.bite - dt * 2.2);
        // sideways drift across the wind window: a soft spring stirred by the breeze (and hard by the big gust)
        const stir = 0.05 * Math.sin(t * 0.43) + 0.035 * Math.sin(t * 1.07 + 2) + WND.turb * 1.6 * Math.sin(t * 1.9 + 0.7);
        KP.vph += ((stir - KP.ph) * 2.2 - KP.vph * (0.9 + GU.k * 2.4)) * dt;
        KP.ph += KP.vph * dt;
      }
      const KPOS = { x: 0, y: 0, z: 0 }, KNOM = { x: 0, y: 0, z: 0 };
      function kiteWorld() {
        const u = KP.r * Math.cos(KP.th), v = KP.r * Math.sin(KP.th), w = KP.r * Math.cos(KP.th) * Math.sin(KP.ph) * 0.9;
        KPOS.x = ANC.x + u * WD.x + w * WP.x; KPOS.y = ANC.y + v; KPOS.z = ANC.z + u * WD.z + w * WP.z;
      }

      /* ---------------- reel, dips, the big gust ---------------- */
      const RE = { phi: 0, om: 0, input: 0, held: false, lastIn: 0, teeth: 0, notes: 0, note: 0, slip: 0 };
      const DIP = { active: false, t0: 0, dur: 2400, tugs: 0, cool: 0, n: 0 };
      const GU = { t0: 0, hold: 0, k: 0, ramp: 0, done: false, last: 0 };
      const G = { phase: 'intro', crank: false, mi: 0, di: 0, saves: 0, tugs: 0, fights: 0, crankT: 0, slipT: 0, finished: false, tod: TOD0, minPx: phone ? 30 : 34, shot: 'climb', tween: null, lineSnap: 0, flash: 0, pose: 'hold', poseK: 0, lie: 0, pov: 0, tied: false, drag: null, endT: 0, dusk: 0, firstCrank: false, saidShrink: false, saidFast: 0, birds: 0, starK: 0, capOn: false };

      /* ---------------- audio: wind, the kite's flutter, the line's hum, a reel that plays a tune ---------------- */
      const AU = { live: false, wind: null, hum: null, next: 0, flapNext: 0, beat: 0, chord: 0, flap: 0, humV: 0, windV: 0.05 };
      function audioStart() {
        if (!A.ctx || AU.live || S.destroyed) return;
        AU.live = true;
        AU.wind = A.loop({ pink: true, filter: 'bandpass', freq: 420, q: 0.55, bus: 'amb' });
        AU.hum = A.loop({ filter: 'bandpass', freq: 330, q: 26 });
        AU.next = A.now() + 0.2; AU.flapNext = A.now() + 0.1;
      }
      S.on('audio-ready', audioStart);
      audioStart();
      S.onDestroy(() => { if (AU.wind) AU.wind.stop(); if (AU.hum) AU.hum.stop(); });
      function audioTick() {
        if (!A.ctx || !AU.live) return;
        const t = A.now();
        // the pad: a slow, airy chord every two bars; it warms toward sunset
        const spb = 60 / 64;
        while (AU.next < t + 0.3) {
          const b = AU.beat;
          if (b % 8 === 0) {
            const ch = CHORDS[AU.chord % CHORDS.length], v = G.phase === 'finale' ? 0.5 : 1;
            ch.forEach((n, i) => A.tone({ when: AU.next + i * 0.03, type: i ? 'sine' : 'triangle', freq: A.note(n), dur: spb * 8.6, vol: (i ? 0.018 : 0.03) * v, attack: 1.6, lp: 1400, verb: 0.55, bus: 'music' }));
            AU.chord++;
          }
          if (b % 4 === 2) A.noise({ when: AU.next, filter: 'highpass', freq: 7000, dur: 1.2, attack: 0.5, vol: 0.006, bus: 'music' });
          AU.next += spb; AU.beat++;
        }
        // the kite's sail flutters loudly up close and fades away as it climbs
        if (AU.flap > 0.004) {
          while (AU.flapNext < t + 0.12) {
            A.noise({ when: AU.flapNext, filter: 'bandpass', freq: 700 + Math.random() * 700, q: 1.1, dur: 0.05, attack: 0.005, vol: AU.flap * (0.6 + Math.random() * 0.4), bus: 'sfx' });
            AU.flapNext += 1 / (8 + 6 * WND.gs);
          }
        } else AU.flapNext = t + 0.05;
        if (AU.wind) { AU.wind.level(AU.windV, 0.25); AU.wind.freq(300 + 260 * (WND.gs - 1) + 80 * Math.sin(t * 0.3), 0.3); }
        if (AU.hum) { AU.hum.level(AU.humV, 0.12); AU.hum.freq(240 + Math.min(500, KP.Ts * 2.2), 0.2); }
      }
      const sync_ = (n) => { if (A.ctx) A.sync(n, now()); };
      function sClick(k) { if (!A.ctx) return; A.tone({ type: 'square', freq: 2600 + k * 180, dur: 0.011, vol: 0.016, lp: 5200 }); A.noise({ filter: 'highpass', freq: 4200, dur: 0.012, vol: 0.016 }); }
      function sNote() {
        if (!A.ctx) return;
        const n = MEL[RE.note % MEL.length], f = A.note(n) * (KP.L > LMAX * 0.62 ? 2 : 1);
        A.pluck(f, { vol: 0.13, damp: 0.997, verb: 0.35 }); A.tone({ type: 'sine', freq: f * 2, dur: 0.6, vol: 0.016, attack: 0.004, verb: 0.4 });
        RE.note++; sync_('note');
      }
      function sTug(hard) { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 230, to: hard ? 420 : 640, glide: 0.06, dur: 0.11, vol: 0.09 }); A.noise({ filter: 'bandpass', freq: 2600, to: 900, q: 1.4, dur: 0.12, vol: 0.06 }); if (!hard) A.whoosh({ from: 500, to: 2400, dur: 0.3, vol: 0.05 }); sync_('tug'); }
      function sDip() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 900, to: 480, glide: 0.5, dur: 0.6, vol: 0.05, verb: 0.3 }); A.whoosh({ from: 1800, to: 300, dur: 0.6, vol: 0.06 }); sync_('dip'); }
      function sSave() { if (!A.ctx) return; ['D5', 'A5'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.08, vol: 0.06, dur: 1.2 })); sync_('save'); }
      function sMile(i) { if (!A.ctx) return; const ns = [['D5', 'A5'], ['E5', 'B5'], ['F#5', 'D6'], ['A5', 'E6'], ['B5', 'F#6'], ['D6', 'A6']][i % 6]; ns.forEach((n, k) => A.chime(A.note(n), { when: A.now() + k * 0.12, vol: 0.05, dur: 2.2, verb: 0.5 })); sync_('mile'); }
      function sGust() { if (!A.ctx) return; A.noise({ pink: true, filter: 'bandpass', freq: 380, to: 1400, q: 0.7, dur: 2.2, attack: 1.1, vol: 0.2 }); sync_('gust'); }
      function sSteady() { if (!A.ctx) return; A.pad(['D4', 'F#4', 'A4', 'E5'].map(n => A.note(n)), { dur: 4, vol: 0.12, attack: 0.8 }); A.chime(A.note('A5'), { vol: 0.06, dur: 2 }); sync_('steady'); }
      function sKnot() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 500, to: 1500, q: 2, dur: 0.35, attack: 0.05, vol: 0.08 }); A.wood(A.now() + 0.32, 0.22, 0.8); A.chime(A.note('D6'), { when: A.now() + 0.36, vol: 0.05, dur: 1.6 }); sync_('knot'); }

      /* ---------------- sprites ---------------- */
      const SPR = { vig: null, reel: null, clouds: null };
      function cloudSprites() { // 4 shapes × 3 lights (day, golden, sunset), painted once
        const out = [];
        const lights = [0.15, 0.72, 1.08];
        for (let s = 0; s < 4; s++) {
          const RS = K.rng(DAY * 7 + s * 13 + 1), puffs = [];
          const n = 6 + Math.floor(RS() * 4);
          for (let i = 0; i < n; i++) { const t = i / (n - 1), r = 0.075 + Math.sin(t * Math.PI) * 0.075 + RS() * 0.03; puffs.push([0.2 + t * 0.6 + (RS() - 0.5) * 0.05, 0.72 - Math.sin(t * Math.PI) * (0.2 + RS() * 0.1) - r * 0.5, r]); }
          out.push(lights.map(td => {
            const c = document.createElement('canvas'); c.width = 256; c.height = 128;
            const g = c.getContext('2d'), lit = rampAt('cloud', td), sh = rampAt('shade', td), mid = mix3(lit, sh, 0.45);
            puffs.forEach(([x, y, r]) => { const X = x * 256, Y = y * 128 + 10, Rr = r * 256; const gr = g.createRadialGradient(X, Y, Rr * 0.15, X, Y, Rr); gr.addColorStop(0, css(sh, 0.95)); gr.addColorStop(0.7, css(sh, 0.75)); gr.addColorStop(1, css(sh, 0)); g.fillStyle = gr; g.fillRect(X - Rr, Y - Rr, Rr * 2, Rr * 2); });
            puffs.forEach(([x, y, r]) => { const X = x * 256 - r * 24, Y = y * 128 - r * 34, Rr = r * 256 * 0.86; const gr = g.createRadialGradient(X - Rr * 0.25, Y - Rr * 0.3, Rr * 0.05, X, Y, Rr); gr.addColorStop(0, css(lit, 1)); gr.addColorStop(0.55, css(mix3(lit, mid, 0.35), 0.92)); gr.addColorStop(1, css(mid, 0)); g.fillStyle = gr; g.fillRect(X - Rr, Y - Rr, Rr * 2, Rr * 2); });
            g.globalCompositeOperation = 'destination-in';
            const fade = g.createLinearGradient(0, 0, 0, 128); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.72, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = fade; g.fillRect(0, 0, 256, 128);
            return c;
          }));
        }
        return out;
      }
      SPR.clouds = cloudSprites();
      function vignette() {
        const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(W / 2)); c.height = Math.max(2, Math.round(H / 2));
        const g = c.getContext('2d'), gr = g.createRadialGradient(c.width / 2, c.height * 0.45, Math.min(c.width, c.height) * 0.35, c.width / 2, c.height * 0.5, Math.max(c.width, c.height) * 0.75);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,6,30,0.38)');
        g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
        return c;
      }
      function reelSprite(r) { // the wooden spool's flange and spokes (it turns as one piece)
        const dpr = cv.dpr || 1, S2 = Math.ceil(r * 2.3), c = document.createElement('canvas'); c.width = c.height = Math.ceil(S2 * dpr);
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.translate(S2 / 2, S2 / 2);
        const wood = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
        wood.addColorStop(0, '#e3a868'); wood.addColorStop(0.6, '#b8743c'); wood.addColorStop(1, '#7a4420');
        g.fillStyle = wood; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.arc(0, 0, r * 0.84, 0, TAU, true); g.fill('evenodd');
        g.strokeStyle = 'rgba(255,226,180,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r * 0.985, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
        g.strokeStyle = 'rgba(60,24,6,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, r * 0.845, 0, TAU); g.stroke();
        for (let i = 0; i < 4; i++) {
          g.save(); g.rotate(i * TAU / 4);
          const sg = g.createLinearGradient(0, -r * 0.08, 0, r * 0.08); sg.addColorStop(0, '#d39456'); sg.addColorStop(1, '#8a4f24');
          g.fillStyle = sg; g.beginPath(); g.moveTo(r * 0.3, -r * 0.07); g.lineTo(r * 0.86, -r * 0.09); g.lineTo(r * 0.86, r * 0.09); g.lineTo(r * 0.3, r * 0.07); g.closePath(); g.fill();
          g.restore();
        }
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.fillStyle = 'rgba(70,30,8,0.55)'; g.beginPath(); g.arc(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92, r * 0.025, 0, TAU); g.fill(); }
        return { c, S2 };
      }

      function reelParts(r) { // the static hub (the line meter sits on it) and the crank knob, painted once per size
        const dpr = cv.dpr || 1, mk = (sz, fn) => { const c = document.createElement('canvas'); c.width = c.height = Math.ceil(sz * dpr); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.translate(sz / 2, sz / 2); fn(g); return { c, sz }; };
        const hr = r * 0.44, kr = r * 0.19;
        const hub = mk(hr * 2 + 4, (g) => { const hg = g.createRadialGradient(-r * 0.08, -r * 0.1, 2, 0, 0, hr); hg.addColorStop(0, '#6b3a1c'); hg.addColorStop(1, '#3a1d0c'); g.fillStyle = hg; g.beginPath(); g.arc(0, 0, hr, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,220,170,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, hr - 0.75, 0, TAU); g.stroke(); });
        const knob = mk(kr * 2 + 4, (g) => { const kg = g.createRadialGradient(-r * 0.05, -r * 0.06, 1, 0, 0, kr * 1.05); kg.addColorStop(0, KITE.c[1]); kg.addColorStop(1, css(mix3(hexRgb(KITE.c[1]), [40, 20, 10], 0.5))); g.fillStyle = kg; g.beginPath(); g.arc(0, 0, kr, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(-r * 0.06, -r * 0.07, r * 0.05, 0, TAU); g.fill(); });
        return { hub, knob };
      }

      /* ---------------- render: sky, sun, stars, far hills, sea ---------------- */
      const SKYC = document.createElement('canvas'); SKYC.width = 1; SKYC.height = 256;
      const skg = SKYC.getContext('2d');
      let skyKey = '';
      function skyAt(e) { // sky colour by elevation above the horizon (radians)
        if (e <= 0) return mix3(PAL.hor, PAL.haze, clamp(-e / 0.06, 0, 1));
        if (e < 0.16) return mix3(PAL.hor, PAL.mid, smooth(e / 0.16));
        return mix3(PAL.mid, PAL.top, smooth(clamp((e - 0.16) / 0.52, 0, 1)));
      }
      function drawSky(g) {
        const key = Math.round(HOR) + ':' + PAL.key + ':' + H + ':' + Math.round(CAM.pitch * 100) + ':' + Math.round(FF);
        if (key !== skyKey) {
          skyKey = key;
          const gr = skg.createLinearGradient(0, 0, 0, 256);
          for (let i = 0; i <= 10; i++) { const y = i / 10 * H, e = Math.atan((AY - y) / FF) + CAM.pitch; gr.addColorStop(i / 10, css(skyAt(e))); }
          skg.fillStyle = gr; skg.fillRect(0, 0, 1, 256);
        }
        g.drawImage(SKYC, 0, 0, W, H);
      }
      const SUN = { x: 0, y: 0, on: false };
      function drawSun(g) {
        const el2 = lerp(0.2, 0.004, clamp(PAL.tod / 1.04, 0, 1)) - Math.max(0, PAL.tod - 1.04) * 0.25, d = 1e5;
        proj(CAM.x + Math.sin(SUN_AZ) * Math.cos(el2) * d, CAM.y + Math.sin(el2) * d, CAM.z + Math.cos(SUN_AZ) * Math.cos(el2) * d);
        SUN.on = PO[2] > 0; SUN.x = PO[3]; SUN.y = PO[4];
        if (!SUN.on) return;
        const r = H * 0.022, sc = PAL.sun;
        g.save(); g.globalCompositeOperation = 'lighter';
        const big = G.phase === 'finale' || G.phase === 'done' ? 1.7 : 1;
        g.globalAlpha = 0.28 + 0.2 * clamp(PAL.tod - 0.5, 0, 1); g.drawImage(K.glowSprite(css(mix3(sc, PAL.hor, 0.2), 0.9)), SUN.x - r * 10 * big, SUN.y - r * 6 * big, r * 20 * big, r * 12 * big);
        g.globalAlpha = 0.55; g.drawImage(K.glowSprite(css(sc, 1)), SUN.x - r * 3.2 * big, SUN.y - r * 3.2 * big, r * 6.4 * big, r * 6.4 * big);
        g.restore();
        g.fillStyle = css(mix3(sc, [255, 255, 255], 0.55)); g.beginPath(); g.arc(SUN.x, SUN.y, r, 0, TAU); g.fill();
      }
      const STARS = []; for (let n = 0; n < 110; n++) STARS.push([R(), Math.pow(R(), 1.4) * 0.72, rr(0.6, 1.7), rr(0, TAU)]);
      function drawStars(g, t) {
        if (G.starK <= 0.01) return;
        g.fillStyle = '#fff';
        for (const s of STARS) { const a = G.starK * (0.45 + 0.55 * Math.sin(t * 1.3 + s[3])) * clamp(1 - s[1] * 1.1, 0.15, 1); if (a < 0.03) continue; g.globalAlpha = a; g.fillRect(s[0] * W, s[1] * H, s[2], s[2]); }
        g.globalAlpha = 1;
      }
      function drawFarHills(g) {
        for (const m of MTN) {
          const col = mix3(PAL.haze, mix3(PAL.shade, PAL.top, 0.3), m.dark + 0.25 * clamp(PAL.tod - 0.6, 0, 1));
          g.fillStyle = css(col);
          g.beginPath(); let first = true;
          for (const p of m.pts) { proj(p[0], p[1], p[2]); if (!(PO[2] > 1)) continue; if (first) { g.moveTo(PO[3], PO[4]); first = false; } else g.lineTo(PO[3], PO[4]); }
          if (first) continue;
          const last = m.pts[m.pts.length - 1]; proj(last[0], 0, last[2]); g.lineTo(PO[3], PO[4] + 2);
          proj(m.pts[0][0], 0, m.pts[0][2]); g.lineTo(PO[3], PO[4] + 2); g.closePath(); g.fill();
        }
      }
      function drawSea(g, t) {
        if (HOR >= H) return;
        proj(CAM.x, 0, coastZ(CAM.x)); const ce = PO[2] > 1 ? clamp(PO[4], HOR + 8, H) : Math.min(H, HOR + (H - HOR) * 0.4 + 6);
        const gr = g.createLinearGradient(0, HOR, 0, ce);
        gr.addColorStop(0, css(mix3(PAL.seaF, PAL.hor, 0.4))); gr.addColorStop(0.12, css(PAL.seaF)); gr.addColorStop(0.45, css(mix3(PAL.seaF, PAL.seaN, 0.72))); gr.addColorStop(1, css(PAL.seaN));
        g.fillStyle = gr; g.fillRect(0, Math.max(0, HOR - 1), W, H - HOR + 1);
        // sun glitter
        const gk = 0.45 + 0.55 * clamp((PAL.tod - 0.3) / 0.7, 0, 1);
        g.fillStyle = css(mix3(PAL.sun, [255, 255, 255], 0.5));
        for (const q of GLINT) {
          proj(q.x, 0, q.z); if (!(PO[2] > 50)) continue;
          const a = gk * (0.5 + 0.5 * Math.sin(t * 2.4 + q.ph)) * clamp((PO[4] - HOR) / 4, 0, 1);
          if (a < 0.05) continue;
          const w = Math.max(1, q.w * PO[5] * 3);
          g.globalAlpha = a; g.fillRect(PO[3] - w / 2, PO[4], w, Math.max(0.8, PO[5] * 1.2));
        }
        g.globalAlpha = 1;        if (SUN.on && SUN.x > -W * 0.3 && SUN.x < W * 1.3) { // the sun's path on the water
          const pw = Math.max(70, W * 0.24), ph = Math.max(40, (ce - HOR) * 1.1);
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.16 + 0.3 * clamp((PAL.tod - 0.35) / 0.65, 0, 1);
          g.drawImage(K.glowSprite(css(mix3(PAL.sun, [255, 255, 255], 0.2), 0.95)), SUN.x - pw / 2, HOR - ph * 0.12, pw, ph); g.restore();
        }
      }

      /* ---------------- render: the land ---------------- */
      const VC = new Float64Array(NV * 3), VS = new Float64Array(NV * 2);
      const COAST = []; for (let x = -9000; x <= 9000; x += 150) COAST.push([x, coastZ(x)]);
      function landColor(base, depth) {
        return mix3(sunlit(base), PAL.haze, hazeK(depth));
      }
      function drawLand(g, t) {
        // projected lattice
        for (let q = 0; q < NV; q++) {
          proj(LV[q * 2], 0, LV[q * 2 + 1]);
          VC[q * 3] = PO[0]; VC[q * 3 + 1] = PO[1]; VC[q * 3 + 2] = PO[2];
          VS[q * 2] = PO[3]; VS[q * 2 + 1] = PO[4];
        }
        // the base of the land, out to the coastline
        g.fillStyle = css(landColor(SEA.land, 2400));
        g.beginPath(); let first = true, minY = H;
        for (const c of COAST) { proj(c[0], 0, c[1]); if (!(PO[2] > 1)) continue; const x = clamp(PO[3], -4 * W, 5 * W); if (first) { g.moveTo(x, PO[4]); first = false; } else g.lineTo(x, PO[4]); if (PO[4] < minY) minY = PO[4]; }
        g.lineTo(5 * W, H + 10); g.lineTo(-4 * W, H + 10); g.closePath(); g.fill();
        // fields
        const tk = Math.round(PAL.tod * 80);
        for (const c of CELLS) {
          const v = c.v;
          let zmin = 1e9, zsum = 0, xl = 1e9, xr = -1e9, yb = -1e9;
          for (let i = 0; i < 4; i++) { const z = VC[v[i] * 3 + 2]; if (z < zmin) zmin = z; zsum += z; const sx = VS[v[i] * 2], sy = VS[v[i] * 2 + 1]; if (sx < xl) xl = sx; if (sx > xr) xr = sx; if (sy > yb) yb = sy; }
          if (zsum / 4 < NEAR && zmin < NEAR) continue;
          if (zmin > NEAR && (xr < -2 || xl > W + 2 || VS[v[0] * 2 + 1] > H + 2 && VS[v[1] * 2 + 1] > H + 2 && VS[v[2] * 2 + 1] > H + 2 && VS[v[3] * 2 + 1] > H + 2)) continue;
          const depth = Math.max(10, zsum / 4), key = tk * 64 + Math.round(Math.log(depth) * 9);
          if (key !== c.key) { c.key = key; c.fill = css(landColor(c.base, depth)); c.row = c.rows ? css(landColor(mix3(c.base, [40, 30, 10], 0.22), depth)) : ''; }
          g.fillStyle = c.fill;
          if (zmin > NEAR) { g.beginPath(); g.moveTo(VS[v[0] * 2], VS[v[0] * 2 + 1]); g.lineTo(VS[v[1] * 2], VS[v[1] * 2 + 1]); g.lineTo(VS[v[2] * 2], VS[v[2] * 2 + 1]); g.lineTo(VS[v[3] * 2], VS[v[3] * 2 + 1]); g.closePath(); g.fill(); }
          else { const cl = clipNear(v.map(i => [VC[i * 3], VC[i * 3 + 1], VC[i * 3 + 2]])); if (cl.length > 2) { g.beginPath(); pathCam(g, cl); g.closePath(); g.fill(); } continue; }
          if (c.rows && depth < 2600) { // crop rows
            const a = c.rowDir ? [v[0], v[3], v[1], v[2]] : [v[0], v[1], v[3], v[2]];
            g.strokeStyle = c.row; g.lineWidth = Math.max(0.6, 5 * FF / depth); g.beginPath();
            for (let n = 1; n <= c.rows; n++) { const k = n / (c.rows + 1); g.moveTo(lerp(VS[a[0] * 2], VS[a[1] * 2], k), lerp(VS[a[0] * 2 + 1], VS[a[1] * 2 + 1], k)); g.lineTo(lerp(VS[a[2] * 2], VS[a[3] * 2], k), lerp(VS[a[2] * 2 + 1], VS[a[3] * 2 + 1], k)); }
            g.stroke();
          }
        }
        // hedgerows, nearer ones bolder
        const hc = SEA.hedge;
        for (let band = 0; band < 2; band++) {
          g.strokeStyle = css(landColor(hc, band ? 2600 : 900), band ? 0.45 : 0.7); g.lineWidth = band ? 0.7 : 1.3;
          g.beginPath();
          for (let i = 0; i < LNX; i++) {
            for (let j = 0; j < LNZ - 1; j++) {
              const a = i * LNZ + j, z = VC[a * 3 + 2];
              if (z < NEAR || (band ? z < 1600 : z >= 1600)) continue;
              const bq = a + 1; if (VC[bq * 3 + 2] > NEAR) { g.moveTo(VS[a * 2], VS[a * 2 + 1]); g.lineTo(VS[bq * 2], VS[bq * 2 + 1]); }
              if (i < LNX - 1) { const cq = a + LNZ; if (VC[cq * 3 + 2] > NEAR) { g.moveTo(VS[a * 2], VS[a * 2 + 1]); g.lineTo(VS[cq * 2], VS[cq * 2 + 1]); } }
            }
          }
          g.stroke();
        }
        // beach and surf along the coastline
        proj(0, 0, coastZ(0));
        const cw = Math.max(1, 34 * PO[5]);
        g.lineJoin = 'round';
        g.strokeStyle = css(landColor(SEA.sand, 2800)); g.lineWidth = cw; g.beginPath(); first = true;
        for (const c of COAST) { proj(c[0], 0, c[1] - 12); if (!(PO[2] > 1)) continue; const x = clamp(PO[3], -4 * W, 5 * W); if (first) { g.moveTo(x, PO[4]); first = false; } else g.lineTo(x, PO[4]); }
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,' + (0.45 + 0.25 * Math.sin(t * 1.2)).toFixed(3) + ')'; g.lineWidth = Math.max(0.7, cw * 0.3); g.beginPath(); first = true;
        for (const c of COAST) { proj(c[0], 0, c[1] + 22); if (!(PO[2] > 1)) continue; const x = clamp(PO[3], -4 * W, 5 * W); if (first) { g.moveTo(x, PO[4]); first = false; } else g.lineTo(x, PO[4]); }
        g.stroke();
        // the river (it mirrors the sky)
        g.beginPath(); first = true;
        for (let i = 0; i < RIVL.length; i++) { proj(RIVL[i][0], 0, RIVL[i][1]); if (!(PO[2] > NEAR)) continue; if (first) { g.moveTo(PO[3], PO[4]); first = false; } else g.lineTo(PO[3], PO[4]); }
        for (let i = RIVR.length - 1; i >= 0; i--) { proj(RIVR[i][0], 0, RIVR[i][1]); if (!(PO[2] > NEAR)) continue; g.lineTo(PO[3], PO[4]); }
        g.closePath();
        g.fillStyle = css(mix3(mix3(PAL.hor, PAL.mid, 0.35), [255, 255, 255], 0.12)); g.fill();
        g.strokeStyle = css(mix3(PAL.hor, [255, 255, 255], 0.5), 0.5); g.lineWidth = 0.8; g.beginPath(); first = true;
        for (let i = 0; i < RIV.length; i++) { proj(RIV[i][0], 0, RIV[i][1]); if (!(PO[2] > NEAR)) continue; if (first) { g.moveTo(PO[3], PO[4]); first = false; } else g.lineTo(PO[3], PO[4]); }
        g.stroke();
        // the road
        g.strokeStyle = css(landColor(SEA.road, 900)); g.lineCap = 'round'; g.beginPath(); first = true;
        let rw = 0;
        for (const p of ROAD) { proj(p[0], 0, p[1]); if (!(PO[2] > NEAR)) continue; rw = Math.max(rw, 7 * PO[5]); if (first) { g.moveTo(PO[3], PO[4]); first = false; } else g.lineTo(PO[3], PO[4]); }
        g.lineWidth = clamp(rw * 0.6, 0.6, 6); g.stroke();
      }

      /* ---------------- render: billboards (back to front) ---------------- */
      /* Billboards keep their colours (and sort records) between frames, so the frame loop makes almost no garbage. */
      const VIS = [], VISP = []; let nVisP = 0;
      const byDepth = (a, c) => c.d - a.d;
      function addVis(b, d, x, y, s2) { const v = VISP[nVisP] || (VISP[nVisP] = { b: null, d: 0, x: 0, y: 0, s: 0 }); nVisP++; v.b = b; v.d = d; v.x = x; v.y = y; v.s = s2; VIS.push(v); }
      const DK_TREE = [[20, 30, 20], 0.35];
      const C_CHURCH = [236, 226, 210], C_SPIRE = [90, 98, 112], C_TURB = [240, 242, 246], C_LH = [246, 242, 236], C_LHR = [200, 70, 60];
      function bc(b, i, base, hz, dk) { // a billboard's cached colour: rebuilt only when the light or its haze band changes
        const key = Math.round(PAL.tod * 80) * 64 + Math.round(hz * 48);
        if (!b.cc) { b.cc = []; b.ck = []; }
        if (b.ck[i] !== key) { b.ck[i] = key; let c = mix3(sunlit(base), PAL.haze, hz); if (dk) c = mix3(c, dk[0], dk[1]); b.cc[i] = css(c); }
        return b.cc[i];
      }
      function drawBillboards(g, t) {
        VIS.length = 0; nVisP = 0;
        const hfov = (W * 0.62) / FF + 0.2;
        for (const b of BB) {
          proj(b.x, b.y, b.z);
          if (!(PO[2] > NEAR)) { if (b.k === 'hill') addVis(b, PO[2], 0, 0, 0); continue; }
          if (b.k !== 'hill' && Math.abs(PO[0] / PO[2]) > hfov + (b.k === 'cloud' ? 0.5 : 0)) continue;
          addVis(b, PO[2], PO[3], PO[4], PO[5]);
        }
        VIS.sort(byDepth);
        for (const v of VIS) {
          const b = v.b;
          if (b.k === 'hill') { drawHill(g, t); continue; }
          const s = v.s, hz = hazeK(v.d);
          if (b.k === 'tree') {
            const hh = b.h * s; if (hh < 0.7) continue;
            const col = bc(b, 0, SEA.tree[b.c], hz);
            if (hh < 2.2) { g.fillStyle = col; g.fillRect(v.x - 0.6, v.y - hh, 1.2, hh); continue; }
            g.fillStyle = bc(b, 1, SEA.tree[b.c], hz, DK_TREE); g.beginPath(); g.ellipse(v.x, v.y - hh * 0.42, hh * 0.32, hh * 0.4, 0, 0, TAU); g.fill();
            g.fillStyle = col; g.beginPath(); g.ellipse(v.x - hh * 0.05, v.y - hh * 0.55, hh * 0.27, hh * 0.32, 0, 0, TAU); g.fill();
          } else if (b.k === 'house') {
            const ww = b.w * s, hh = b.h * s; if (hh < 0.6) continue;
            g.fillStyle = bc(b, 0, b.wall, hz); g.fillRect(v.x - ww / 2, v.y - hh, ww, hh);
            g.fillStyle = bc(b, 1, b.roof, hz); g.beginPath(); g.moveTo(v.x - ww * 0.58, v.y - hh); g.lineTo(v.x, v.y - hh * 1.6); g.lineTo(v.x + ww * 0.58, v.y - hh); g.closePath(); g.fill();
            if (G.dusk > 0.05 && b.lit < 0.7) { g.fillStyle = 'rgba(255,214,140,' + (G.dusk * 0.95).toFixed(3) + ')'; const wz = Math.max(0.8, ww * 0.16); g.fillRect(v.x - ww * 0.22, v.y - hh * 0.62, wz, wz); }
          } else if (b.k === 'church') {
            const ww = b.w * s, hh = b.h * s; if (hh < 1) continue;
            g.fillStyle = bc(b, 0, C_CHURCH, hz); g.fillRect(v.x - ww * 0.25, v.y - hh * 0.62, ww * 0.5, hh * 0.62);
            g.fillStyle = bc(b, 1, C_SPIRE, hz); g.beginPath(); g.moveTo(v.x - ww * 0.3, v.y - hh * 0.62); g.lineTo(v.x, v.y - hh); g.lineTo(v.x + ww * 0.3, v.y - hh * 0.62); g.closePath(); g.fill();
          } else if (b.k === 'turbine') {
            const hh = b.h * s; if (hh < 2) continue;
            const col = bc(b, 0, C_TURB, hz * 0.9);
            g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = Math.max(0.6, hh * 0.035);
            g.beginPath(); g.moveTo(v.x, v.y); g.lineTo(v.x, v.y - hh); g.stroke();
            const a0 = b.ph + RE.turb, bl = hh * 0.48;
            g.lineWidth = Math.max(0.5, hh * 0.022); g.beginPath();
            for (let i = 0; i < 3; i++) { const a = a0 + i * TAU / 3; g.moveTo(v.x, v.y - hh); g.lineTo(v.x + Math.cos(a) * bl, v.y - hh + Math.sin(a) * bl); }
            g.stroke();
            if (G.dusk > 0.1 && Math.sin(t * 2.2 + b.ph) > 0.2) { g.fillStyle = 'rgba(255,60,50,' + (G.dusk * 0.9).toFixed(3) + ')'; g.beginPath(); g.arc(v.x, v.y - hh, Math.max(1, hh * 0.04), 0, TAU); g.fill(); }
          } else if (b.k === 'lighthouse') {
            const hh = b.h * s; if (hh < 1.5) continue;
            const w2 = hh * 0.13;
            g.fillStyle = bc(b, 0, C_LH, hz); g.beginPath(); g.moveTo(v.x - w2, v.y); g.lineTo(v.x + w2, v.y); g.lineTo(v.x + w2 * 0.7, v.y - hh); g.lineTo(v.x - w2 * 0.7, v.y - hh); g.closePath(); g.fill();
            g.fillStyle = bc(b, 1, C_LHR, hz); g.fillRect(v.x - w2 * 0.9, v.y - hh * 0.55, w2 * 1.8, hh * 0.14); g.fillRect(v.x - w2 * 0.8, v.y - hh * 0.92, w2 * 1.6, hh * 0.1);
            if (G.dusk > 0.05) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = G.dusk * (0.6 + 0.4 * Math.sin(t * 1.6)); g.drawImage(K.glowSprite('rgba(255,236,170,0.9)'), v.x - hh * 0.6, v.y - hh * 1.6, hh * 1.2, hh * 1.2); g.restore(); }
          } else if (b.k === 'boat') {
            const hh = b.h * s; if (hh < 0.8) continue;
            g.fillStyle = css(mix3([250, 250, 252], PAL.haze, hz * 0.8)); g.beginPath(); g.moveTo(v.x, v.y - hh); g.lineTo(v.x + hh * 0.5, v.y - hh * 0.12); g.lineTo(v.x, v.y - hh * 0.12); g.closePath(); g.fill();
            g.fillStyle = css(mix3([60, 50, 60], PAL.haze, hz)); g.fillRect(v.x - hh * 0.3, v.y - hh * 0.12, hh * 0.75, Math.max(0.6, hh * 0.12));
          } else if (b.k === 'balloon') {
            const hh = b.h * s; if (hh < 1) continue;
            const yy = v.y + Math.sin(t * 0.6) * hh * 0.08;
            g.fillStyle = css(mix3(sunlit(b.c), PAL.haze, hz * 0.8)); g.beginPath(); g.arc(v.x, yy - hh * 0.62, hh * 0.38, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(v.x, yy - hh * 0.12); g.closePath(); g.fill();
            g.fillStyle = css(mix3(sunlit(b.c2), PAL.haze, hz * 0.8)); g.beginPath(); g.ellipse(v.x, yy - hh * 0.62, hh * 0.12, hh * 0.38, 0, 0, TAU); g.fill();
            g.fillStyle = css(mix3([90, 60, 40], PAL.haze, hz)); g.fillRect(v.x - hh * 0.06, yy - hh * 0.1, hh * 0.12, hh * 0.1);
          } else if (b.k === 'cloud') {
            const ww = b.w * s; if (ww < 4) continue;
            const set = SPR.clouds[b.spr], tod = PAL.tod, li = tod < 0.72 ? 0 : 1, kk = tod < 0.72 ? clamp((tod - 0.15) / 0.57, 0, 1) : clamp((tod - 0.72) / 0.36, 0, 1);
            const al = (1 - hz * 0.55) * clamp(ww / 20, 0, 1);
            g.globalAlpha = al * (1 - kk); g.drawImage(set[li], v.x - ww / 2, v.y - ww * 0.36, ww, ww * 0.5);
            g.globalAlpha = al * kk; g.drawImage(set[li + 1], v.x - ww / 2, v.y - ww * 0.36, ww, ww * 0.5);
            g.globalAlpha = 1;
          }
        }
      }

      /* ---------------- the hill, the fence, the flyer ---------------- */
      const HLV = [0, 0.38, 0.64, 0.82, 0.93, 0.983, 0.997].map(f => { const hh = HILL.H * f, r = (2 * HILL.R / Math.PI) * Math.acos(Math.sqrt(f)); return { h: hh, r }; });
      const RING = []; for (let i = 0; i < 40; i++) RING.push([Math.cos(i / 40 * TAU), Math.sin(i / 40 * TAU)]);
      const HPTS = HLV.map(() => RING.map(() => [0, 0, 0]));
      const sF0 = () => { proj(FEET.x, FEET.y, FEET.z); return PO[5]; };
      function drawHill(g, t) {
        proj(0, 0, 0); const dHill = Math.max(10, PO[2]);
        for (let k = 0; k < HLV.length; k++) {
          const L = HLV[k], tk = k / (HLV.length - 1);
          const hk = Math.round(PAL.tod * 80) * 64 + Math.round(Math.log(dHill) * 9);
          if (L.ck !== hk) { L.ck = hk; L.fill = css(landColor(mix3(SEA.hill[0], SEA.hill[1], Math.pow(tk, 0.8)), dHill)); }
          const pts = HPTS[k]; let allIn = true;
          for (let i = 0; i < RING.length; i++) { proj(RING[i][0] * L.r, L.h, RING[i][1] * L.r); const q = pts[i]; q[0] = PO[0]; q[1] = PO[1]; q[2] = PO[2]; if (!(PO[2] > NEAR)) allIn = false; }
          const cl = allIn ? pts : clipNear(pts);
          if (cl.length < 3) continue;
          g.fillStyle = L.fill; g.beginPath(); pathCam(g, cl); g.closePath(); g.fill();
        }
        { // the low sun warms the slope that faces it (seen from a distance)
          proj(Math.sin(SUN_AZ) * HILL.R * 0.4, HILL.H * 0.6, Math.cos(SUN_AZ) * HILL.R * 0.4);
          const rr = HILL.R * 0.8 * PO[5];
          if (PO[2] > NEAR && rr < W * 1.4) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.13 + 0.12 * clamp((PAL.tod - 0.4) / 0.6, 0, 1); g.drawImage(K.glowSprite(css(PAL.sun, 0.85)), PO[3] - rr, PO[4] - rr * 0.55, rr * 2, rr * 1.1); g.restore(); }
        }
        // sheep grazing on the slopes
        if (sF0() > 2.2) {
          const wool = css(mix3(sunlit([246, 244, 236]), PAL.haze, hazeK(dHill) * 0.6)), face = css(sunlit([50, 44, 48]));
          for (const sh of SHEEP) {
            proj(sh.x, sh.y, sh.z); if (!(PO[2] > NEAR)) continue;
            const s = PO[5], bw = Math.max(1.4, 1.1 * s), x = PO[3] + Math.sin(t * 0.3 + sh.ph) * 0.2 * s, y = PO[4];
            g.fillStyle = wool; g.beginPath(); g.ellipse(x, y - bw * 0.42, bw * 0.62, bw * 0.4, 0, 0, TAU); g.fill();
            if (bw > 3) { g.fillStyle = face; g.beginPath(); g.ellipse(x + sh.f * bw * 0.62, y - bw * 0.5 + Math.sin(t * 0.8 + sh.ph) * bw * 0.06, bw * 0.2, bw * 0.16, 0, 0, TAU); g.fill(); }
          }
        }
        // grass tufts, fence posts with their wire, the flyer
        proj(FEET.x, FEET.y, FEET.z); const sF = PO[5];
        if (sF > 24) {
          const gc = css(mix3(sunlit(SEA.hill[1], 0.9), [20, 40, 10], 0.25)), gc2 = css(sunlit(SEA.hill[0], 0.8));
          g.lineCap = 'round';
          for (const tf of TUFTS) {
            proj(tf.x, tf.y, tf.z); if (!(PO[2] > NEAR) || PO[4] > H + 40) continue;
            const s = PO[5], hh = tf.hh * s; if (hh < 1.5) continue;
            const bend = (0.25 + 0.35 * WND.gs) * hh * (0.6 + 0.4 * Math.sin(t * 2.2 + tf.ph));
            g.strokeStyle = tf.c < 0.5 ? gc : gc2; g.lineWidth = Math.max(0.8, s * 0.025);
            g.beginPath();
            for (let b = -1; b <= 1; b++) { g.moveTo(PO[3] + b * hh * 0.18, PO[4]); g.quadraticCurveTo(PO[3] + b * hh * 0.22 + bend * 0.3, PO[4] - hh * 0.6, PO[3] + b * hh * 0.25 + bend, PO[4] - hh * (1 - Math.abs(b) * 0.2)); }
            g.stroke();
          }
        }
        if (sF > 2.5) {
          const pc = css(mix3([86, 62, 44], [20, 16, 26], clamp(PAL.tod - 0.6, 0, 1) * 0.7));
          g.strokeStyle = pc; g.lineCap = 'round';
          for (let i = 0; i < POSTS.length; i++) {
            const p = POSTS[i]; proj(p.x, p.y, p.z); if (!(PO[2] > NEAR)) continue; const x0 = PO[3], y0 = PO[4], s = PO[5];
            proj(p.x, p.y + 1.15, p.z); g.lineWidth = Math.max(1, 0.11 * s); g.beginPath(); g.moveTo(x0, y0); g.lineTo(PO[3], PO[4]); g.stroke();
            if (i < POSTS.length - 1) {
              const q = POSTS[i + 1]; g.lineWidth = Math.max(0.6, 0.012 * s);
              for (const hgt of [0.55, 0.95]) { proj(p.x, p.y + hgt, p.z); const ax = PO[3], ay = PO[4]; proj(q.x, q.y + hgt, q.z); const bx = PO[3], by = PO[4]; proj((p.x + q.x) / 2, (p.y + q.y) / 2 + hgt - 0.08, (p.z + q.z) / 2); g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(2 * PO[3] - (ax + bx) / 2, 2 * PO[4] - (ay + by) / 2, bx, by); g.stroke(); }
            }
          }
        }
        drawFlyer(g, t, sF);
      }
      /* The flyer: joints in metres, projected, so the figure reads from any camera angle. Local frame: r (their right),
         up, f (forward, toward the kite). Poses: hold (the line), rest (arms down, once it's tied). */
      const POSE = {
        hold: { fl: [-0.13, 0, 0], fr: [0.13, 0, 0], kl: [-0.12, 0.48, 0.04], kr: [0.12, 0.48, 0.04], hip: [0, 0.9, 0], neck: [0, 1.48, 0.02], head: [0, 1.62, 0.04], sl: [-0.19, 1.42, 0.02], sr: [0.19, 1.42, 0.02], el: [-0.22, 1.2, 0.2], er: [0.22, 1.2, 0.2], hl: [-0.07, 1.26, 0.36], hr: [0.07, 1.27, 0.36] },
        rest: { fl: [-0.13, 0, 0], fr: [0.13, 0, 0], kl: [-0.12, 0.48, 0.03], kr: [0.12, 0.48, 0.03], hip: [0, 0.9, 0], neck: [0, 1.48, 0], head: [0, 1.62, 0.01], sl: [-0.19, 1.42, 0], sr: [0.19, 1.42, 0], el: [-0.26, 1.13, 0.02], er: [0.26, 1.13, 0.02], hl: [-0.27, 0.86, 0.06], hr: [0.27, 0.86, 0.06] }
      };
      const JN = Object.keys(POSE.hold), JP = {}, JS = {};
      JN.forEach(n => { JP[n] = [0, 0, 0]; JS[n] = [0, 0]; });
      const FWD = { x: WD.x, z: WD.z }, RGT = { x: WD.z, z: -WD.x };
      function poseNow() {
        const a = G.tied ? 'rest' : 'hold', b = a, kk = 0;
        const lean = -0.05 * (WND.gs - 1);
        for (const n of JN) {
          const p = POSE[a][n], q = POSE[b][n], r = lerp(p[0], q[0], kk), u = lerp(p[1], q[1], kk), f = lerp(p[2], q[2], kk) + lean * u;
          JP[n][0] = FEET.x + RGT.x * r + FWD.x * f; JP[n][1] = FEET.y + u; JP[n][2] = FEET.z + RGT.z * r + FWD.z * f;
        }
        if (G.drag) { const d = G.drag; JP.hl[0] = d.x - 0.04; JP.hl[1] = d.y; JP.hl[2] = d.z; JP.hr[0] = d.x + 0.04; JP.hr[1] = d.y; JP.hr[2] = d.z; JP.el[1] = (JP.sl[1] + d.y) / 2 - 0.05; JP.er[1] = (JP.sr[1] + d.y) / 2 - 0.05; JP.el[0] = (JP.sl[0] + d.x) / 2; JP.el[2] = (JP.sl[2] + d.z) / 2; JP.er[0] = (JP.sr[0] + d.x) / 2; JP.er[2] = (JP.sr[2] + d.z) / 2; }
      }
      function drawFlyer(g, t, sF) {
        const fade = 1 - clamp(G.pov * 1.8, 0, 1);
        if (fade <= 0.01) return;
        poseNow();
        const silC = mix3([40, 44, 78], [26, 22, 44], clamp(PAL.tod - 0.5, 0, 1)), sil = css(silC), coat = css(mix3(silC, [86, 96, 140], 0.22));
        if (sF * 1.7 < 7) { proj(FEET.x, FEET.y + 0.9, FEET.z); g.fillStyle = sil; g.fillRect(PO[3] - 0.9, PO[4] - sF * 0.8, 1.8, Math.max(2, sF * 1.7)); return; }
        let vis = true;
        for (const n of JN) { proj(JP[n][0], JP[n][1], JP[n][2]); if (!(PO[2] > NEAR)) vis = false; JS[n][0] = PO[3]; JS[n][1] = PO[4]; }
        if (!vis) return;
        const s = sF, pt = (b, r, u) => { proj(b[0] + RGT.x * r, b[1] + u, b[2] + RGT.z * r); return [PO[3], PO[4]]; };
        const seg = (a2, b2, w) => { g.lineWidth = Math.max(1, w * s); g.beginPath(); g.moveTo(a2[0], a2[1]); g.lineTo(b2[0], b2[1]); g.stroke(); };
        g.globalAlpha = fade;
        proj(FEET.x, FEET.y + 0.01, FEET.z); g.fillStyle = 'rgba(16,34,12,0.25)'; g.beginPath(); g.ellipse(PO[3], PO[4], s * 0.4, s * 0.09, 0, 0, TAU); g.fill();
        g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = sil;
        const hipL = pt(JP.hip, -0.1, 0), hipR = pt(JP.hip, 0.1, 0);
        seg(hipL, JS.kl, 0.16); seg(JS.kl, JS.fl, 0.12); seg(hipR, JS.kr, 0.16); seg(JS.kr, JS.fr, 0.12);
        g.fillStyle = sil; [JS.fl, JS.fr].forEach(f => { g.beginPath(); g.ellipse(f[0], f[1] - s * 0.02, s * 0.075, s * 0.045, 0, 0, TAU); g.fill(); });
        // the coat
        const c1 = pt(JP.sl, -0.03, 0.02), c2 = pt(JP.sr, 0.03, 0.02), c3 = pt(JP.hip, 0.21, -0.16), c4 = pt(JP.hip, -0.21, -0.16);
        g.fillStyle = coat; g.strokeStyle = coat; g.lineWidth = Math.max(1, 0.08 * s);
        g.beginPath(); g.moveTo(c1[0], c1[1]); g.lineTo(c2[0], c2[1]); g.lineTo(c3[0], c3[1]); g.lineTo(c4[0], c4[1]); g.closePath(); g.fill(); g.stroke();
        // arms and mittens
        g.strokeStyle = coat; seg(JS.sl, JS.el, 0.11); seg(JS.el, JS.hl, 0.09); seg(JS.sr, JS.er, 0.11); seg(JS.er, JS.hr, 0.09);
        g.fillStyle = KITE.c[1]; [JS.hl, JS.hr].forEach(m => { g.beginPath(); g.arc(m[0], m[1], s * 0.052, 0, TAU); g.fill(); });
        // scarf: wrapped at the neck, one end streaming downwind
        const nk = pt(JP.neck, 0, -0.03);
        g.strokeStyle = KITE.c[0]; g.lineWidth = Math.max(1, 0.075 * s); g.beginPath(); g.moveTo(nk[0] - s * 0.11, nk[1]); g.lineTo(nk[0] + s * 0.11, nk[1]); g.stroke();
        g.lineWidth = Math.max(1, 0.06 * s); g.beginPath(); g.moveTo(nk[0] + s * 0.06, nk[1]);
        for (let i = 1; i <= 5; i++) { const k = i / 5, wob = Math.sin(t * 7 - k * 4) * 0.1 * k; proj(JP.neck[0] + FWD.x * k * 0.5 + RGT.x * (0.08 + wob), JP.neck[1] - 0.04 - k * 0.14, JP.neck[2] + FWD.z * k * 0.5 + RGT.z * (0.08 + wob)); g.lineTo(PO[3], PO[4]); }
        g.stroke();
        // head and beanie (with a bobble), in the kite's accent colour
        const hr = 0.115 * s;
        g.fillStyle = sil; g.beginPath(); g.arc(JS.head[0], JS.head[1], hr, 0, TAU); g.fill();
        g.fillStyle = KITE.c[1]; g.beginPath(); g.arc(JS.head[0], JS.head[1] - hr * 0.08, hr * 1.06, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill();
        g.fillStyle = css(mix3(hexRgb(KITE.c[1]), [255, 255, 255], 0.35)); g.fillRect(JS.head[0] - hr * 1.06, JS.head[1] - hr * 0.2, hr * 2.12, hr * 0.26);
        g.fillStyle = KITE.c[0]; g.beginPath(); g.arc(JS.head[0], JS.head[1] - hr * 1.12, hr * 0.34, 0, TAU); g.fill();
        // a warm rim of low sun
        if (PAL.tod > 0.55 && s > 25) { g.strokeStyle = css(PAL.sun, 0.6 * clamp((PAL.tod - 0.55) * 2, 0, 1)); g.lineWidth = Math.max(1, 0.03 * s); g.beginPath(); g.arc(JS.head[0], JS.head[1], hr, -1.3, 0.2); g.stroke(); g.beginPath(); g.moveTo(c2[0], c2[1]); g.lineTo(c3[0], c3[1]); g.stroke(); }
        g.globalAlpha = 1;
      }
      // lying back: tall grass framing the bottom of the view, backlit by the low sun
      const BLADES = []; for (let n = 0; n < 54; n++) { const x = R(); BLADES.push({ x, h: 0.05 + Math.pow(Math.abs(x - 0.5) * 2, 1.6) * 0.17 + R() * 0.07, lean: rr(-0.3, 0.3), w: rr(0.005, 0.011), ph: rr(0, TAU), c: R() }); }
      BLADES.sort((a2, b2) => b2.h - a2.h);
      function drawForeGrass(g, t) {
        if (G.pov < 0.01) return;
        const a = smooth(clamp(G.pov, 0, 1)), base = H + 4;
        const dk = mix3([22, 34, 24], [32, 24, 44], clamp(PAL.tod - 0.8, 0, 1)), rim = PAL.sun;
        const gk = Math.round(PAL.tod * 80), rimS = css(rim, 0.35);
        for (const b of BLADES) {
          const x0 = b.x * W, hh = b.h * H * a, sway = b.lean + Math.sin(t * 1.2 + b.ph) * 0.07 * (K.reduced() ? 0.3 : 1), w0 = b.w * W;
          const tx = x0 + sway * hh, ty = base - hh;
          if (b.ck !== gk) { b.ck = gk; b.fill = css(mix3(dk, [0, 0, 0], b.c * 0.3)); }
          g.fillStyle = b.fill;
          g.beginPath(); g.moveTo(x0 - w0, base); g.quadraticCurveTo(x0 + sway * hh * 0.35 - w0 * 0.3, base - hh * 0.55, tx, ty); g.quadraticCurveTo(x0 + sway * hh * 0.4 + w0 * 0.4, base - hh * 0.5, x0 + w0, base); g.closePath(); g.fill();
          if (b.c > 0.55) { g.strokeStyle = rimS; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + w0 * 0.6, base - hh * 0.2); g.quadraticCurveTo(x0 + sway * hh * 0.4 + w0 * 0.3, base - hh * 0.55, tx, ty); g.stroke(); }
        }
      }

      /* ---------------- the line and the kite ---------------- */
      const LN = 36, LP = new Float64Array((LN + 1) * 2);
      function drawLine(g, t) {
        const ax = ANC.x, ay = ANC.y, az = ANC.z, bx = KPOS.x, by = KPOS.y, bz = KPOS.z;
        const dh = Math.hypot(bx - ax, bz - az), d = Math.hypot(dh, by - ay);
        const sagT = 0.035 * dh * dh / (8 * Math.max(8, KP.Ts)), sagS = Math.sqrt(0.375 * d * Math.max(0, KP.L - d));
        const sag = Math.min(0.2 * KP.L, Math.max(sagT, sagS) + 0.004 * KP.L);
        const hum = AU.humK || 0, snap = G.lineSnap;
        let n = 0;
        for (let i = 0; i <= LN; i++) {
          const k = i / LN, sg = sag * 4 * k * (1 - k) * (1 - snap * 0.8), vib = (hum * 0.012 * KP.L * Math.sin(Math.PI * k * 3) * Math.sin(t * 38)) * (K.reduced() ? 0.2 : 1);
          proj(lerp(ax, bx, k) + WP.x * vib, lerp(ay, by, k) - sg, lerp(az, bz, k) + WP.z * vib);
          if (!(PO[2] > NEAR)) continue;
          LP[n * 2] = PO[3]; LP[n * 2 + 1] = PO[4]; n++;
        }
        if (n < 2) return;
        const lc = PAL.tod > 0.6 ? mix3([255, 250, 240], PAL.sun, clamp((PAL.tod - 0.6) * 1.6, 0, 0.7)) : [255, 252, 246];
        g.strokeStyle = css(lc, 0.85); g.lineWidth = phone ? 1.1 : 1.2; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(LP[0], LP[1]); for (let i = 1; i < n; i++) g.lineTo(LP[i * 2], LP[i * 2 + 1]); g.stroke();
      }
      const KS = { x: 0, y: 0, px: 30, vx: 0, vy: 0, lx: 0, ly: 0, roll: 0, sq: 1, ok: false };
      const kiteScreen = () => ({ x: clamp(KS.x, 30, W - 30), y: clamp(KS.y, 90, H - 120) });
      // the tail: a little verlet rope in screen space, so it trails every swoop
      const TN = 10, TL = [];
      const tailCount = KITE.tail === 'twin' ? 2 : 1;
      for (let k = 0; k < tailCount; k++) { const arr = []; for (let i = 0; i < TN; i++) arr.push({ x: 0, y: 0, px: 0, py: 0 }); TL.push(arr); }
      let tailInit = false;
      function tailAnchor(k) { // kite-local attach point → screen
        const sh = KITE.shape, px = KS.px;
        let ax = 0, ay = 0.8;
        if (sh === 'delta') { ax = k ? 0.56 : -0.56; ay = 0.3; } else if (sh === 'rokkaku') { ax = k ? 0.36 : -0.36; ay = 0.7; } else if (sh === 'parafoil') { ax = k ? 0.48 : -0.48; ay = 0.24; } else if (sh === 'koi') { ax = 0.62; ay = 0.02; } else if (sh === 'star') ay = 0.56; else if (sh === 'sled') ay = 0.55; else if (sh === 'barndoor') ay = 0.62;
        const c = Math.cos(KS.roll), s = Math.sin(KS.roll), lx = ax * px, ly = ay * px * KS.sq;
        return [KS.x + lx * c - ly * s, KS.y + lx * s + ly * c];
      }
      function tailStep(dt, t) {
        // the tail streams toward where the wind is going (as seen on screen at the kite) and flutters; a
        // follow-the-leader rope, so it can never stretch, whatever the frame rate
        proj(KPOS.x + WD.x * 40, KPOS.y - 6, KPOS.z + WD.z * 40);
        let wx = 0, wy = 1;
        if (PO[2] > NEAR) { wx = PO[3] - KS.x; wy = PO[4] - KS.y; const wl = Math.hypot(wx, wy) || 1; wx /= wl; wy /= wl; }
        const px = KS.px, seg = px * 0.155, n = Math.min(6, Math.max(1, Math.ceil(dt / (1 / 60)))), h2 = Math.pow(dt / n, 2);
        const wa = px * 10, ga = px * 7, fl = px * (6 + 14 * (WND.gs - 1) + 42 * WND.turb);
        for (let k = 0; k < TL.length; k++) {
          const T = TL[k], a = tailAnchor(k);
          if (!tailInit) for (let i = 0; i < TN; i++) { T[i].x = T[i].px = a[0] + wx * i * seg; T[i].y = T[i].py = a[1] + wy * i * seg; }
          for (let st = 0; st < n; st++) {
            T[0].x = a[0]; T[0].y = a[1];
            for (let i = 1; i < TN; i++) {
              const p = T[i], vx = (p.x - p.px) * 0.9, vy = (p.y - p.py) * 0.9, w = Math.sin(t * 7.2 - i * 0.85 + k * 1.7) * fl * (0.25 + i / TN);
              p.px = p.x; p.py = p.y;
              p.x += vx + (wx * wa - wy * w + (TL.length > 1 ? (k ? 1 : -1) * px * 2.2 : 0)) * h2;
              p.y += vy + (wy * wa + wx * w + ga) * h2;
              const q = T[i - 1], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1e-3;
              if (d > seg) { p.x = q.x + dx / d * seg; p.y = q.y + dy / d * seg; }
            }
          }
        }
        tailInit = true;
      }
      function drawTail(g, alpha) {
        const c = KITE.c, px = KS.px;
        for (let k = 0; k < TL.length; k++) {
          const T = TL[k];
          g.globalAlpha = alpha;
          if (KITE.tail === 'bows') {
            g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(0.8, px * 0.02); g.beginPath(); g.moveTo(T[0].x, T[0].y); for (let i = 1; i < TN; i++) g.lineTo(T[i].x, T[i].y); g.stroke();
            for (let i = 2; i < TN; i += 2) { const p = T[i], q = T[i - 1], a = Math.atan2(p.y - q.y, p.x - q.x) + Math.PI / 2, bw = px * 0.13; g.fillStyle = (i / 2) % 2 ? c[0] : c[1]; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + Math.cos(a) * bw + Math.sin(a) * bw * 0.45, p.y + Math.sin(a) * bw - Math.cos(a) * bw * 0.45); g.lineTo(p.x + Math.cos(a) * bw - Math.sin(a) * bw * 0.45, p.y + Math.sin(a) * bw + Math.cos(a) * bw * 0.45); g.closePath(); g.moveTo(p.x, p.y); g.lineTo(p.x - Math.cos(a) * bw + Math.sin(a) * bw * 0.45, p.y - Math.sin(a) * bw - Math.cos(a) * bw * 0.45); g.lineTo(p.x - Math.cos(a) * bw - Math.sin(a) * bw * 0.45, p.y - Math.sin(a) * bw + Math.cos(a) * bw * 0.45); g.closePath(); g.fill(); }
          } else {
            const wdt = px * (KITE.tail === 'twin' ? 0.045 : 0.07);
            g.lineCap = 'round'; g.lineJoin = 'round';
            for (let i = 1; i < TN; i++) { g.strokeStyle = (i % 2 ? c[k ? 1 : 0] : c[k ? 0 : 1]); g.lineWidth = Math.max(0.9, wdt * (1 - i / TN * 0.6)); g.beginPath(); g.moveTo(T[i - 1].x, T[i - 1].y); g.lineTo(T[i].x, T[i].y); g.stroke(); }
          }
        }
        g.globalAlpha = 1;
      }
      const KFONT = '"Shantell Sans", "Marker Felt", "Chalkboard SE", "Comic Sans MS", "Trebuchet MS", sans-serif';
      const TXT = { lines: [], fs: 0, w: 0, box: null };
      const BOX = { diamond: [-0.33, -0.3, 0.66, 0.46], delta: [-0.34, -0.07, 0.68, 0.31], rokkaku: [-0.29, -0.26, 0.58, 0.54], sled: [-0.36, -0.26, 0.72, 0.5], star: [-0.26, -0.17, 0.52, 0.35], parafoil: [-0.52, -0.14, 1.04, 0.28], koi: [-0.32, -0.16, 0.7, 0.32], barndoor: [-0.38, -0.3, 0.76, 0.54] };
      const mctx = document.createElement('canvas').getContext('2d');
      function fitWords() { // wrap the words to the kite's word panel at a 100 px reference span
        const bx = BOX[KITE.shape], bw = bx[2] * 100, bh = bx[3] * 100, words = WORDS.split(/\s+/).filter(Boolean);
        for (let fs = 24; fs >= 7; fs -= 0.5) {
          mctx.font = '800 ' + fs + 'px ' + KFONT;
          const lines = []; let cur = '';
          for (const wd of words) { const tryL = cur ? cur + ' ' + wd : wd; if (mctx.measureText(tryL).width <= bw) cur = tryL; else { if (cur) lines.push(cur); cur = wd; } }
          if (cur) lines.push(cur);
          if (lines.length * fs * 1.02 <= bh && lines.every(l => mctx.measureText(l).width <= bw)) { TXT.lines = lines; TXT.fs = fs; TXT.box = bx; return; }
        }
        TXT.lines = [WORDS.slice(0, 16)]; TXT.fs = 7; TXT.box = bx;
      }
      fitWords();
      /* How big the kite is drawn while it climbs (px of span), by metres of line: big and readable up close (the words
         start at 16px or more), then shrinking steadily, so the player watches the words get small. */
      const PXT = [[14, 172], [24, 140], [40, 104], [60, 78], [90, 58], [130, 45], [190, 35], [260, 28], [400, 22]];
      function pxFloor(L) {
        const big = phone ? 1 : 1.18, start = clamp(1650 / Math.max(6, TXT.fs), 172, phone ? 236 : 270);
        for (let i = 1; i < PXT.length; i++) if (L <= PXT[i][0]) { const a = PXT[i - 1], b = PXT[i], k = smooth(clamp((L - a[0]) / (b[0] - a[0]), 0, 1)); return lerp(i === 1 ? start : a[1] * big, b[1] * big, k); }
        return PXT[PXT.length - 1][1] * big;
      }
      try { if (document.fonts && document.fonts.load) document.fonts.load('800 20px "Shantell Sans"').then(() => { if (!S.destroyed) fitWords(); }).catch(() => {}); } catch (e) { /* no font API */ }
      function kitePath(g, sh) {
        g.beginPath();
        if (sh === 'diamond') { g.moveTo(0, -0.66); g.lineTo(0.5, -0.14); g.lineTo(0, 0.84); g.lineTo(-0.5, -0.14); }
        else if (sh === 'delta') { g.moveTo(0, -0.52); g.lineTo(0.62, 0.32); g.lineTo(0.18, 0.27); g.lineTo(0, 0.42); g.lineTo(-0.18, 0.27); g.lineTo(-0.62, 0.32); }
        else if (sh === 'rokkaku') { g.moveTo(-0.37, -0.72); g.lineTo(0.37, -0.72); g.lineTo(0.5, -0.3); g.lineTo(0.37, 0.72); g.lineTo(-0.37, 0.72); g.lineTo(-0.5, -0.3); }
        else if (sh === 'sled') { g.moveTo(-0.44, -0.56); g.lineTo(0.44, -0.56); g.quadraticCurveTo(0.58, 0, 0.42, 0.56); g.quadraticCurveTo(0, 0.66, -0.42, 0.56); g.quadraticCurveTo(-0.58, 0, -0.44, -0.56); }
        else if (sh === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.3 : 0.62; g.lineTo(Math.cos(a) * r, Math.sin(a) * r + 0.04); } }
        else if (sh === 'parafoil') { g.moveTo(-0.6, -0.12); g.quadraticCurveTo(0, -0.34, 0.6, -0.12); g.lineTo(0.56, 0.2); g.quadraticCurveTo(0, 0.12, -0.56, 0.2); }
        else if (sh === 'koi') { g.ellipse(-0.06, 0, 0.5, 0.26, 0, 0, TAU); g.moveTo(0.4, 0); g.lineTo(0.66, -0.24); g.quadraticCurveTo(0.58, 0, 0.66, 0.24); }
        else { g.moveTo(-0.5, -0.6); g.lineTo(0.5, -0.6); g.lineTo(0.5, 0.3); g.lineTo(0.2, 0.62); g.lineTo(-0.2, 0.62); g.lineTo(-0.5, 0.3); }
        g.closePath();
      }
      function drawKiteBody(g, px, words) { // in kite-local units (span 1), already transformed
        const c = KITE.c, sh = KITE.shape;
        kitePath(g, sh); g.fillStyle = c[0]; g.fill();
        g.save(); kitePath(g, sh); g.clip();
        g.fillStyle = c[1];
        if (sh === 'diamond') { g.beginPath(); g.moveTo(0, -0.66); g.lineTo(0.5, -0.14); g.lineTo(0, -0.14); g.closePath(); g.moveTo(0, 0.84); g.lineTo(-0.5, -0.14); g.lineTo(0, -0.14); g.closePath(); g.fill(); }
        else if (sh === 'delta') { g.beginPath(); g.moveTo(0, -0.52); g.lineTo(0.62, 0.32); g.lineTo(0, 0.42); g.closePath(); g.fill(); }
        else if (sh === 'rokkaku') { g.fillStyle = c[3]; g.fillRect(-0.6, -0.8, 1.2, 1.6); g.fillStyle = c[0]; g.beginPath(); g.arc(0, 0.01, 0.4, 0, TAU); g.fill(); g.fillStyle = c[1]; g.fillRect(-0.6, -0.8, 1.2, 0.1); g.fillRect(-0.6, 0.62, 1.2, 0.12); }
        else if (sh === 'sled') { g.fillRect(-0.16, -0.7, 0.32, 1.5); g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(-0.24, 0.34, 0.06, 0, TAU); g.arc(0.24, 0.34, 0.06, 0, TAU); g.fill(); }
        else if (sh === 'star') { g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5 + Math.PI / 5; g.lineTo(Math.cos(a) * 0.3, Math.sin(a) * 0.3 + 0.04); } g.closePath(); g.fill(); }
        else if (sh === 'parafoil') { for (let i = -5; i <= 5; i += 2) g.fillRect(i * 0.11 - 0.055, -0.4, 0.11, 0.8); }
        else if (sh === 'koi') { g.fillStyle = c[1]; for (let i = 0; i < 4; i++) for (let j = -1; j <= 1; j++) { g.beginPath(); g.arc(-0.3 + i * 0.16, j * 0.13, 0.07, 0, Math.PI); g.fill(); } g.fillStyle = c[2]; g.beginPath(); g.arc(-0.42, -0.06, 0.05, 0, TAU); g.fill(); }
        else { g.fillRect(-0.6, 0, 1.2, 0.8); }
        g.restore();
        // spars
        g.strokeStyle = c[2]; g.lineWidth = Math.max(0.012, 1 / px); g.lineCap = 'round';
        g.beginPath();
        if (sh === 'diamond') { g.moveTo(0, -0.66); g.lineTo(0, 0.84); g.moveTo(-0.5, -0.14); g.lineTo(0.5, -0.14); }
        else if (sh === 'delta') { g.moveTo(0, -0.52); g.lineTo(0, 0.42); g.moveTo(-0.62, 0.32); g.lineTo(0, -0.52); g.lineTo(0.62, 0.32); g.moveTo(-0.34, -0.02); g.lineTo(0.34, -0.02); }
        else if (sh === 'rokkaku') { g.moveTo(0, -0.72); g.lineTo(0, 0.72); g.moveTo(-0.5, -0.3); g.lineTo(0.5, -0.3); g.moveTo(-0.37, 0.72); g.lineTo(0.37, 0.72); }
        else if (sh === 'parafoil') { for (let i = -4; i <= 4; i += 2) { g.moveTo(i * 0.11, -0.22 + Math.abs(i) * 0.01); g.lineTo(i * 0.11, 0.15); } }
        else if (sh === 'barndoor') { g.moveTo(-0.5, -0.6); g.lineTo(0.2, 0.62); g.moveTo(0.5, -0.6); g.lineTo(-0.2, 0.62); g.moveTo(-0.5, -0.14); g.lineTo(0.5, -0.14); }
        else if (sh === 'sled') { g.moveTo(-0.3, -0.56); g.lineTo(-0.3, 0.58); g.moveTo(0.3, -0.56); g.lineTo(0.3, 0.58); }
        g.stroke();
        kitePath(g, sh); g.lineWidth = Math.max(0.018, 1.4 / px); g.strokeStyle = 'rgba(30,14,10,0.45)'; g.stroke();
        // the word panel
        const bx = TXT.box;
        if (words && px > 20 && KITE.shape !== 'rokkaku') { g.fillStyle = c[3]; g.globalAlpha = 0.94; roundRect(g, bx[0] - 0.03, bx[1] - 0.02, bx[2] + 0.06, bx[3] + 0.04, 0.05); g.fill(); g.globalAlpha = 1; }
      }
      function roundRect(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + hh - r); g.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); g.lineTo(x + r, y + hh); g.quadraticCurveTo(x, y + hh, x, y + hh - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
      function drawKite(g, t) {
        if (!KS.ok) return;
        const px = KS.px, x = KS.x, y = KS.y;
        // a soft halo keeps a small kite findable against busy land
        if (px < 60) { const gr = px * 1.5 + 8; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.14; g.drawImage(K.glowSprite('rgba(255,240,210,0.8)'), x - gr, y - gr, gr * 2, gr * 2); g.restore(); }
        if (DIP.active) { const ph = ((now() - DIP.t0) / 700) % 1, rr2 = px * (0.7 + ph * 0.9) + 10; g.strokeStyle = 'rgba(255,214,140,' + (0.85 * (1 - ph)).toFixed(3) + ')'; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, rr2, 0, TAU); g.stroke(); }
        if (px < 6) { // a dot now: a small steady glint, like the first star
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.2 * Math.sin(t * 2.1); g.drawImage(K.glowSprite('rgba(255,236,200,0.9)'), x - 9, y - 9, 18, 18); g.restore();
          g.fillStyle = KITE.c[0]; g.beginPath(); g.arc(x, y, Math.max(1.6, px * 0.45), 0, TAU); g.fill(); return;
        }
        drawTail(g, 1);
        g.save(); g.translate(x, y); g.rotate(KS.roll); g.scale(px, px * KS.sq);
        drawKiteBody(g, px, true);
        g.restore();
        // the words, drawn in screen space at their true (shrinking) size
        const fs = TXT.fs * px / 100;
        if (fs >= 2.6) {
          g.save(); g.translate(x, y); g.rotate(KS.roll); g.scale(1, KS.sq);
          const bx = TXT.box, cyy = (bx[1] + bx[3] / 2) * px, lh = fs * 1.02;
          g.font = '800 ' + fs.toFixed(2) + 'px ' + KFONT; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillStyle = KITE.shape === 'rokkaku' ? '#fffaf0' : '#1d1830';
          const y0 = cyy - (TXT.lines.length - 1) * lh / 2 + (bx[0] + bx[2] / 2) * 0;
          TXT.lines.forEach((ln, i) => g.fillText(ln, (bx[0] + bx[2] / 2) * px, y0 + i * lh + fs * 0.06));
          g.restore();
        } else if (px >= 9 && KITE.shape !== 'star') {
          g.save(); g.translate(x, y); g.rotate(KS.roll); g.fillStyle = 'rgba(29,24,48,0.55)';
          const bx = TXT.box; TXT.lines.forEach((ln, i) => { const lw = Math.min(bx[2], ln.length * 0.05) * px; g.fillRect((bx[0] + bx[2] / 2) * px - lw / 2, (bx[1] + bx[3] / 2) * px + (i - (TXT.lines.length - 1) / 2) * px * 0.1 - 0.5, lw, Math.max(0.8, px * 0.035)); });
          g.restore();
        }
        if (G.flash > 0.02) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = G.flash * 0.7; const gr = px * 1.6 + 8; g.drawImage(K.glowSprite('rgba(255,255,240,0.95)'), x - gr, y - gr, gr * 2, gr * 2); g.restore(); }
      }
      // birds that come to fly alongside for a while
      const BIRDS = []; for (let n = 0; n < 7; n++) BIRDS.push({ a: rr(0, TAU), r: rr(0.1, 0.22), h: rr(-0.08, 0.1), w: rr(0.35, 0.6) * (R() < 0.5 ? 1 : -1), f: rr(7, 10), ph: rr(0, TAU) });
      function drawBirds(g, t) {
        if (G.birds <= 0.01) return;
        g.strokeStyle = css(mix3([40, 44, 70], [20, 16, 36], clamp(PAL.tod - 0.6, 0, 1)), G.birds); g.lineCap = 'round'; g.lineJoin = 'round';
        for (const b of BIRDS) {
          const a = b.a + t * b.w, rad = b.r * KP.r * (1.6 - G.birds * 0.6);
          proj(KPOS.x + Math.cos(a) * rad, KPOS.y + b.h * KP.r + Math.sin(t * 0.7 + b.ph) * 3 - (1 - G.birds) * 40, KPOS.z + Math.sin(a) * rad * 0.6);
          if (!(PO[2] > NEAR)) continue;
          const sz = Math.max(phone ? 5 : 6, 1.1 * PO[5]), fl = Math.sin(t * b.f + b.ph) * 0.55;
          g.lineWidth = Math.max(1, sz * 0.16); g.beginPath();
          g.moveTo(PO[3] - sz, PO[4] - sz * (0.15 + fl * 0.6)); g.quadraticCurveTo(PO[3] - sz * 0.45, PO[4] - sz * (0.35 + fl * 0.3), PO[3], PO[4]);
          g.quadraticCurveTo(PO[3] + sz * 0.45, PO[4] - sz * (0.35 + fl * 0.3), PO[3] + sz, PO[4] - sz * (0.15 + fl * 0.6)); g.stroke();
        }
      }
      // wind streaks: specks of air carried downwind, drawn as short motion lines
      const STK = []; for (let n = 0; n < 22; n++) STK.push({ x: 0, y: 0, z: 0, age: 9, life: 1 });
      function drawStreaks(g, dt) {
        const n = Math.round(10 + 12 * clamp((WND.gs - 1) * 2 + WND.turb * 2, 0, 1));
        const sp = windAt(WND.t) * 2.2;
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1; g.lineCap = 'round';
        g.beginPath();
        for (let i = 0; i < STK.length; i++) {
          const q = STK[i];
          q.age += dt;
          if (q.age > q.life) {
            if (i >= n) continue;
            const k = Math.random(), base = { x: lerp(ANC.x, KPOS.x, k), y: lerp(ANC.y, KPOS.y, k), z: lerp(ANC.z, KPOS.z, k) }, rad = 6 + KP.r * 0.35;
            q.x = base.x + (Math.random() - 0.5) * rad * 2; q.y = base.y + (Math.random() - 0.6) * rad; q.z = base.z + (Math.random() - 0.5) * rad * 2 - sp * 0.8; q.age = 0; q.life = 0.9 + Math.random() * 1.2;
          }
          q.x += WD.x * sp * dt; q.z += WD.z * sp * dt; q.y -= WND.gd * sp * 0.6 * dt;
          const fade = Math.sin(Math.PI * q.age / q.life);
          proj(q.x, q.y, q.z); if (!(PO[2] > NEAR)) continue; const x1 = PO[3], y1 = PO[4];
          proj(q.x - WD.x * sp * 0.22, q.y + WND.gd * sp * 0.13, q.z - WD.z * sp * 0.22); if (!(PO[2] > NEAR)) continue;
          if (fade < 0.2) continue;
          g.moveTo(PO[3], PO[4]); g.lineTo(x1, y1);
        }
        g.globalAlpha = 0.55; g.stroke(); g.globalAlpha = 1;
      }
      function drawReel(g, t) {
        if (G.reelA <= 0.01) return;
        const r = RL.r, x = RL.x, y = RL.y + (1 - G.reelA) * 160;
        if (!SPR.reel || SPR.reelR !== r) { SPR.reel = reelSprite(r); SPR.parts = reelParts(r); SPR.reelR = r; }
        g.save(); g.globalAlpha = G.reelA;
        g.fillStyle = 'rgba(10,6,24,0.35)'; g.beginPath(); g.ellipse(x + 4, y + r * 0.95, r * 0.95, r * 0.22, 0, 0, TAU); g.fill();
        // the wound line: it thins as line pays out
        const rin = r * 0.44, rout = lerp(r * 0.82, r * 0.5, clamp((KP.L - 14) / (LMAX - 14), 0, 1));
        g.fillStyle = '#f3ead8'; g.beginPath(); g.arc(x, y, rout, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(160,130,100,0.5)'; g.lineWidth = 1;
        g.beginPath(); for (let k = 1; k < 5; k++) { const rk = lerp(rin, rout, k / 5); g.moveTo(x + rk, y); g.arc(x, y, rk, 0, TAU); } g.stroke();
        const sp = SPR.reel, ang = RE.phi * TAU;
        g.save(); g.translate(x, y); g.rotate(ang); g.drawImage(sp.c, -sp.S2 / 2, -sp.S2 / 2, sp.S2, sp.S2); g.restore();
        // the hub (the line meter sits on it) and the crank
        const hb = SPR.parts.hub, kb = SPR.parts.knob;
        g.drawImage(hb.c, x - hb.sz / 2, y - hb.sz / 2, hb.sz, hb.sz);
        const ca = Math.cos(ang - Math.PI / 2), sa = Math.sin(ang - Math.PI / 2), kx = x + ca * r * 0.86, ky = y + sa * r * 0.86;
        g.strokeStyle = '#d9d2c6'; g.lineWidth = r * 0.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + ca * r * 0.47, y + sa * r * 0.47); g.lineTo(kx, ky); g.stroke();
        g.drawImage(kb.c, kx - kb.sz / 2, ky - kb.sz / 2, kb.sz, kb.sz);
        // hold-still progress in the big gust
        if (G.phase === 'gust' || GU.show > 0.01) {
          g.globalAlpha = G.reelA * (GU.show || 0);
          g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r * 1.12, 0, TAU); g.stroke();
          g.strokeStyle = '#ffd36b'; g.beginPath(); g.arc(x, y, r * 1.12, -Math.PI / 2, -Math.PI / 2 + GU.k * TAU); g.stroke();
          if (RE.held) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; g.drawImage(K.glowSprite('rgba(255,214,120,0.9)'), x - r * 1.7, y - r * 1.7, r * 3.4, r * 3.4); }
        }
        g.restore();
      }

      /* ---------------- camera direction ---------------- */
      const DTAB = [[14, 9], [30, 30], [60, 78], [100, 155], [150, 255], [230, 400], [320, 540], [400, 660]];
      const ATAB = [[14, 0.76, 0.36], [40, 0.68, 0.33], [70, 0.56, 0.3], [120, 0.45, 0.28], [180, 0.39, 0.26], [270, 0.33, 0.23], [400, 0.29, 0.21]];   // line, horizon, kite height (fractions of the height)
      function tab(T, r, col) {
        for (let i = 1; i < T.length; i++) if (r <= T[i][0]) { const a = T[i - 1], b = T[i], k = smooth(clamp((r - a[0]) / (b[0] - a[0]), 0, 1)); return lerp(a[col], b[col], k); }
        const l = T[T.length - 1]; return T === DTAB ? l[1] * r / l[0] : l[col];
      }
      const CT = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, ax: 0.5, ay: 0.7, f: 1 };
      const RN = { r: 14 };
      function shotClimb(t) {
        RN.r += (KP.r - RN.r) * 0.04;
        const r = RN.r, th = 0.8, u = r * Math.cos(th), v = r * Math.sin(th);
        KNOM.x = ANC.x + u * WD.x; KNOM.y = ANC.y + v; KNOM.z = ANC.z + u * WD.z;
        const close = clamp(1 - (r - 14) / 60, 0, 1), fx = lerp(KNOM.x, KPOS.x, 0.25 + close * 0.45), fy = lerp(KNOM.y, KPOS.y, 0.3 + close * 0.4), fz = lerp(KNOM.z, KPOS.z, 0.25 + close * 0.45);
        const D = tab(DTAB, r, 1);
        CT.yaw = 0.025 * Math.sin(t * 0.05); CT.pitch = 0; CT.f = 1; CT.ax = 0.5;
        CT.ay = tab(ATAB, r, 1);
        const ky = H * tab(ATAB, r, 2), kx = W * 0.56;
        const fwx = Math.sin(CT.yaw), fwz = Math.cos(CT.yaw), rgx = Math.cos(CT.yaw), rgz = -Math.sin(CT.yaw);
        CT.x = fx - fwx * D - rgx * (kx - W * CT.ax) * D / F;
        CT.z = fz - fwz * D - rgz * (kx - W * CT.ax) * D / F;
        CT.y = Math.max(fy - (H * CT.ay - ky) * D / F, HILL.H + 3);
      }
      function shotVista() { // the widest view: a crane up and back until the whole coast is laid out like a map
        const L = Math.max(KP.r, 100);
        CT.pitch = 0; CT.f = 1; CT.ax = 0.5; CT.ay = phone ? 0.19 : 0.22; CT.yaw = 0.06;
        CT.x = KPOS.x * 0.5 - 40; CT.z = FEET.z - (1.9 * L + 90); CT.y = FEET.y + 1.9 * L;
      }
      function shotHill() { // behind the flyer on the hilltop, the fence to the left, the sky above
        CT.yaw = -0.12; CT.pitch = 0.08; CT.f = phone ? 0.95 : 1; CT.ax = 0.5; CT.ay = 0.6;
        CT.x = FEET.x + 1.2; CT.z = FEET.z - (phone ? 9.6 : 8.6); CT.y = FEET.y + 2.3;
      }
      function shotLie() { // lying back beside the post: the line climbs from the post to a dot in a huge sky
        const cx = FEET.x - 3.4, cz = FEET.z - 3.2;
        const bp = Math.atan2(POST.x - cx, POST.z - cz), bk = Math.atan2(KPOS.x - cx, KPOS.z - cz);
        CT.yaw = (bp + bk) / 2 - 0.05; CT.pitch = 0.55; CT.f = phone ? 0.8 : 0.9; CT.ax = 0.5; CT.ay = 0.5;
        CT.x = cx; CT.z = cz; CT.y = FEET.y + 0.5;
      }
      const CK = ['x', 'y', 'z', 'yaw', 'pitch', 'ax', 'ay', 'f'];
      function camUpdate(t, rdt) {
        if (G.shot === 'climb') shotClimb(t); else if (G.shot === 'vista') shotVista(); else if (G.shot === 'hill') shotHill(); else if (G.shot === 'lie') shotLie();
        const tw = G.tween;
        if (tw) {
          const k = clamp((now() - tw.t0) / tw.dur, 0, 1), e = K.ease.inOutCubic(k);
          CK.forEach(n => { CAM[n] = lerp(tw.from[n], CT[n], e); });
          // swoop: a gentle arc up and over between the two shots
          CAM.y += Math.sin(Math.PI * e) * tw.lift;
          if (k >= 1) G.tween = null;
        } else {
          const rate = G.shot === 'climb' ? 2.2 : 3;
          const kk = 1 - Math.exp(-rdt * rate);
          CK.forEach(n => { CAM[n] += (CT[n] - CAM[n]) * kk; });
        }
      }
      function cutTo(shot, dur, lift) { const from = {}; CK.forEach(n => { from[n] = CAM[n]; }); G.shot = shot; G.tween = { from, t0: now(), dur: K.reduced() ? Math.min(dur, 900) : dur, lift: lift || 0 }; }

      /* ---------------- the frame ---------------- */
      let lastT = 0, tSim = 0, ready = false;
      RE.turb = 0;
      K.loop((cdt, t) => {
        const g = cv.g; if (!g || !ready) return;
        const tn = now(), rdt = clamp(lastT ? (tn - lastT) / 1000 : cdt, 0.001, 0.25); lastT = tn;
        // reel: the finger turns it; let go and it spins down with a few last clicks
        let dPhi = 0;
        if (RE.input > 0) { const w = RE.input / rdt; RE.om = lerp(RE.om, Math.min(w, 2.4), 0.5); dPhi = RE.input; RE.input = 0; RE.lastIn = tn; }
        else if (RE.held && G.phase !== 'gust') { if (tn - RE.lastIn > 90) RE.om *= Math.exp(-rdt / 0.05); }
        else { RE.om *= Math.exp(-rdt / 0.45); if (RE.om < 0.02) RE.om = 0; dPhi = RE.om * rdt; }
        if (!G.crank) dPhi = 0;
        if (dPhi > 0) {
          G.crankT += rdt; if (RE.slip > 0.6) G.slipT += rdt;
          RE.phi += dPhi;
          const want = dPhi * mprAt(KP.L), capL = Math.min(G.phase === 'climb' ? GUST_L + 1 : LMAX, KP.r + 2.5 + 0.035 * KP.r), before = KP.L;
          KP.L = Math.min(capL, KP.L + want);
          RE.slip = want > 0 && KP.L - before < want * 0.5 ? Math.min(1, RE.slip + rdt * 3) : Math.max(0, RE.slip - rdt * 2);
          const teeth = Math.floor(RE.phi * 12); if (teeth !== RE.teeth) { const n = Math.min(3, teeth - RE.teeth); for (let i = 0; i < n; i++) sClick(i); RE.teeth = teeth; }
          const notes = Math.floor(RE.phi * 3); if (notes !== RE.notes) { RE.notes = notes; sNote(); }
          if (!G.firstCrank) { G.firstCrank = true; firstCrank(); }
        }
        // physics on real time, sub-stepped
        const steps = Math.min(60, Math.max(1, Math.ceil(rdt / (1 / 240))));
        for (let i = 0; i < steps; i++) { physStep(rdt / steps, tSim); tSim += rdt / steps; }
        WND.t = tSim;
        KP.Ts += (KP.T - KP.Ts) * Math.min(1, rdt * 6);
        RE.turb += rdt * (0.6 + 1.6 * WND.gs) * 0.8;
        kiteWorld();
        events(tn, rdt);
        // light: afternoon toward sunset as the line goes out; dusk at the very end
        const tgt = G.phase === 'finale' || G.phase === 'done' ? 1.08 : lerp(TOD0, TOD1, clamp((KP.L - 14) / (LMAX - 14), 0, 1));
        G.tod += (tgt - G.tod) * Math.min(1, rdt * (G.phase === 'finale' ? 0.35 : 0.8));
        setTod(G.tod);
        G.dusk = clamp((G.tod - 0.92) / 0.2, 0, 1);
        G.starK += ((G.phase === 'finale' || G.phase === 'done' ? clamp((G.tod - 0.99) / 0.08, 0, 1) : 0) - G.starK) * Math.min(1, rdt * 1.2);
        G.birds += ((KP.L > LMAX * 0.42 && KP.L < LMAX * 0.95 && G.phase !== 'finale' ? 1 : 0) - G.birds) * Math.min(1, rdt * 0.6);
        G.lineSnap = Math.max(0, G.lineSnap - rdt * 3); G.flash = Math.max(0, G.flash - rdt * 2.5);
        G.reelA += (((G.phase === 'full' || G.phase === 'tie' || G.phase === 'tied' || G.phase === 'lie' || G.phase === 'finale' || G.phase === 'done') ? 0 : 1) - G.reelA) * Math.min(1, rdt * (G.phase === 'full' ? 1.2 : 4));
        GU.show += ((G.phase === 'gust' ? 1 : 0) - GU.show) * Math.min(1, rdt * 5);
        camUpdate(t, rdt);
        camPrep();
        // the kite on screen (its size never drops below a readable minimum until the very end)
        if (G.phase !== 'finale' && G.phase !== 'done') G.minPx = G.shot === 'climb' ? pxFloor(KP.L) : (phone ? 14 : 16);
        proj(KPOS.x, KPOS.y, KPOS.z);
        KS.ok = PO[2] > NEAR;
        if (KS.ok) {
          const phys = PO[5] * 2.0, minPx = G.minPx;
          KS.px = Math.max(phys, minPx);
          KS.vx = (PO[3] - KS.x) / rdt; KS.vy = (PO[4] - KS.y) / rdt; KS.x = PO[3]; KS.y = PO[4];
          const rollT = clamp(KP.vph * 0.5 + (KP.om < 0 ? KP.om * 0.25 : 0), -0.7, 0.7);
          KS.roll += (rollT - KS.roll) * Math.min(1, rdt * 6);
          KS.sq += ((1 - clamp(-KP.om * 0.5, 0, 0.32)) - KS.sq) * Math.min(1, rdt * 6);
          tailStep(rdt, tSim);
        }
        // sound follows the scene
        const camD = Math.hypot(KPOS.x - CAM.x, KPOS.y - CAM.y, KPOS.z - CAM.z);
        AU.flap = (G.phase === 'intro' ? 0.5 : 1) * 0.05 * clamp(14 / camD, 0, 1) * (0.7 + 0.5 * (WND.gs - 1)) * (G.phase === 'finale' ? 0 : 1);
        AU.windV = 0.045 + 0.09 * clamp(WND.gs - 1, 0, 1) + 0.05 * WND.turb + (G.phase === 'finale' ? -0.02 : 0);
        AU.humK = clamp((KP.Ts - 70) / 160, 0, 1) * (G.phase === 'gust' ? 1 : 0.4);
        AU.humV = 0.035 * AU.humK;
        audioTick();
        // draw
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        drawSky(g); drawStars(g, t); drawSun(g); drawFarHills(g); drawSea(g, t); drawLand(g, t);
        drawBillboards(g, t);
        drawLine(g, t); drawKite(g, t); drawBirds(g, t); drawStreaks(g, rdt);
        P.update(rdt); P.draw(g);
        drawForeGrass(g, t);
        if (!SPR.vig) SPR.vig = vignette();
        g.drawImage(SPR.vig, 0, 0, W, H);
        drawReel(g, t);
        const off = G.reelA < 0.6; if (off !== RE.off) { RE.off = off; reel.classList.toggle('off', off); }
        if (G.phase === 'tie') placeHand();
        const m = Math.round(KP.L) + ' m'; if (meterB.textContent !== m) { meterB.textContent = m; reel.setAttribute('aria-valuenow', String(Math.round(KP.L))); }
      });
      const P = K.particles({ max: 260 });
      G.reelA = 0; GU.show = 0;

      /* ---------------- events: milestones, dips, the big gust, the end of the line ---------------- */
      const MILES = [
        { L: 40, k: 'Now you can see', t: 'The fields' },
        { L: 76, k: 'Further out', t: 'A river' },
        { L: 122, k: 'Down there', t: 'A whole town' },
        { L: Math.round(LMAX * 0.5), k: 'Up here', t: 'Birds for company' },
        { L: Math.round(LMAX * 0.74), k: 'All the way to', t: 'The coast' },
        { L: Math.round(LMAX * 0.93), k: 'And beyond that', t: 'The open sea' }
      ];
      let mileT = 0;
      function showMile(m, i) {
        mile.firstChild.textContent = m.k; mile.lastChild.textContent = m.t;
        mile.style.top = mileTop().toFixed(0) + 'px';
        mile.classList.add('on'); sMile(i);
        S.cancel(mileT); mileT = S.later(() => mile.classList.remove('on'), 2900);
        ctx.track('view', { i });
        if (i === 1 && !G.saidShrink) { G.saidShrink = true; S.later(() => sayFree(sync, care ? { Jolly: 'It’s still there. Look how much sky is around it now.', Cheeky: 'Still there. But look at all that room around it.', Unfiltered: 'Still there. More room around it now.' } : { Jolly: 'Can you still read what it says? I can’t.', Cheeky: 'Quick test: can you still read it? Me neither.', Unfiltered: 'Can’t read it from here.' }, 'think', 3200), 1400); }
        if (i === 2) S.later(() => sayFree(sync, { Jolly: 'A whole town down there, everyone busy with their own day.', Cheeky: 'A whole town. Nobody down there is thinking about your kite.', Unfiltered: 'A whole town. Busy with its own day.' }, 'wow', 3200), 600);
        if (i === 3) S.later(() => sayFree(drop, { Jolly: 'Birds! I think they think it’s one of them.', Cheeky: 'Birds joined. Your kite has fans now.', Unfiltered: 'Birds. Company.' }, 'happy', 2800), 400);
      }
      function mileTop() { // under the kite and its tail when there's room, else above it, never over it
        const ky = KS.ok ? KS.y : H * 0.3, ext = KS.px || 40, hi = H - (phone ? 250 : 262), lo = H * 0.2;
        const below = ky + ext * 1.7 + 26, above = ky - ext * 0.95 - 86;
        if (below <= hi) return Math.max(below, H * 0.48);
        if (above >= lo) return above;
        return hi;
      }
      function events(tn, rdt) {
        const climbing = G.phase === 'launch' || G.phase === 'climb' || G.phase === 'climb2';
        if (climbing) {
          while (MILES[G.mi] && KP.L >= MILES[G.mi].L) { showMile(MILES[G.mi], G.mi); G.mi++; }
          if (!DIP.active && DIPS[G.di] != null && KP.L >= DIPS[G.di] && tn > DIP.cool && (G.phase !== 'climb' || DIPS[G.di] < GUST_L - 8)) startDip(tn);
          if (G.phase === 'climb' && !DIP.active && KP.L >= GUST_L) startGust();
          if (G.phase === 'climb2' && !DIP.active && KP.L >= LMAX - 0.5) endOfLine();
          // steadiness: how far below a comfortable height the kite sinks while it flies
          if (RE.slip > 0.8 && tn - G.saidFast > 9000 && !DIP.active) { G.saidFast = tn; sayFree(sync, { Jolly: 'Easy, let the wind take the line. It can only go so fast.', Cheeky: 'Whoa, speedy. The kite can’t keep up.', Unfiltered: 'Slower. Let the wind take it.' }, 'surprised', 2600); }
        }
        if (DIP.active) {
          const k = (tn - DIP.t0) / DIP.dur, b = k < 0.22 ? smooth(k / 0.22) : 1 - smooth(clamp((k - 0.22) / 0.78, 0, 1));
          WND.gd = 0.6 * b; WND.gs = 1 - 0.16 * b;
          if (k >= 1) endDip();
        }
        if (G.phase === 'gust') {
          const held = RE.held && rp && rp.moved < 30;
          if (held) GU.hold += rdt * 1000;
          GU.k = clamp(GU.hold / HOLD_NEED, 0, 1);
          GU.ramp = Math.min(1, GU.ramp + rdt / 1.6);
          WND.gs = 1 + 0.7 * GU.ramp * (1 - GU.k * 0.85); WND.turb = 0.42 * GU.ramp * (1 - GU.k);
          if (held && tn - GU.last > 700) { GU.last = tn; if (A.ctx) A.chime(A.note(['D5', 'E5', 'F#5', 'A5', 'B5', 'D6'][Math.min(5, Math.floor(GU.k * 6))]), { vol: 0.04, dur: 1.2 }); }
          if (GU.k >= 1 || tn - GU.t0 > 18000) gustDone(GU.k >= 1);
        }
      }

      /* ---------------- input ---------------- */
      let rp = null;
      K.press(reel, {
        down: (p) => {
          audioStart();
          const c = RL.half;
          rp = { a: Math.atan2(p.y - c, p.x - c), x0: p.x, y0: p.y, t0: now(), moved: 0, turn: 0 };
          RE.held = true; RE.lastIn = now();
          if (G.phase === 'gust') { K.guide(null); if (A.ctx) A.tone({ type: 'sine', freq: 180, to: 140, glide: 0.3, dur: 0.5, vol: 0.06 }); }
        },
        move: (p) => {
          if (!rp) return;
          const c = RL.half, a = Math.atan2(p.y - c, p.x - c);
          rp.moved = Math.max(rp.moved, Math.hypot(p.x - rp.x0, p.y - rp.y0));
          if (Math.hypot(p.x - c, p.y - c) < c * 0.16) { rp.a = a; return; }
          let da = a - rp.a; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU; rp.a = a;
          rp.turn += da;
          if (G.phase === 'gust') { GU.tries = (GU.tries || 0) + Math.abs(da); if (GU.tries > 3 && !GU.saidLock) { GU.saidLock = true; say(drop, { Jolly: 'No cranking in a gust like this. Just hold it still.', Cheeky: 'Reel’s locked. Your only job: hold still.', Unfiltered: 'Don’t crank. Hold still.' }, 'calm', 2800); } return; }
          if (G.crank) RE.input += Math.abs(da) / TAU;
        },
        up: () => {
          if (!rp) return;
          const tap = now() - rp.t0 < 260 && rp.moved < 12 && Math.abs(rp.turn) < 0.4;
          rp = null; RE.held = false;
          if (tap && G.phase !== 'gust') tug();
          if (G.phase === 'gust' && GU.k < 1) K.guide({ id: 'hold2', g: 'hold', target: reel, label: 'HOLD IT STILL', ms: 2400, delay: 900 });
        }
      });
      K.onKey(['ArrowRight', 'ArrowDown'], (e) => { if (G.crank) { e.preventDefault(); audioStart(); RE.input += 0.25; } });
      K.onKey(['ArrowUp', 'Space'], (e) => { if (G.phase === 'climb' || G.phase === 'climb2' || G.phase === 'launch') { e.preventDefault(); audioStart(); tug(); } });
      S.listen(reel, 'keydown', (e) => { if (G.phase === 'gust' && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); RE.held = true; rp = { a: 0, x0: 0, y0: 0, t0: now(), moved: 0, turn: 0 }; } });
      S.listen(reel, 'keyup', (e) => { if (G.phase === 'gust' && (e.code === 'Enter' || e.code === 'Space')) { RE.held = false; rp = null; } });
      K.tap(tugZone, () => { audioStart(); tug(); });
      function tug() {
        if (G.phase === 'gust') {
          G.fights++; KP.om += (Math.random() - 0.5) * 0.7; KP.vph += (Math.random() - 0.5) * 0.9; sTug(true);
          if (G.fights === 2 || G.fights === 7) say(drop, { Jolly: 'Easy… you don’t have to fight every gust. Hold the reel still.', Cheeky: 'Tugging won’t win this one. Holding will.', Unfiltered: 'Stop tugging. Hold the reel.' }, 'calm', 3000);
          return;
        }
        if (!(G.phase === 'climb' || G.phase === 'climb2' || G.phase === 'launch')) return;
        const dip = DIP.active;
        KP.om += dip ? 0.3 : 0.12; KP.bite = Math.min(0.9, KP.bite + (dip ? 0.45 : 0.2));
        G.tugs++; if (dip) DIP.tugs++;
        G.lineSnap = 1; G.flash = dip ? 1 : 0.5;
        sTug(false); S.buzz(10);
        const k = kiteScreen(); P.emit('spark', k.x, k.y, dip ? 10 : 5, { colors: ['#fff6dc', KITE.c[0], KITE.c[1]], speed: [60, 160] });
        if (dip && DIP.tugs === 1) K.guide(null);
      }
      function startDip(tn) {
        DIP.active = true; DIP.t0 = tn; DIP.dur = [2700, 2400, 2200][inten] + (DIP.n === 0 ? 400 : 0); DIP.tugs = 0; DIP.n++; G.di++;
        sDip(); sync.face('surprised', 1400);
        K.guide({ id: 'tug-' + DIP.n, g: 'tap', target: () => kiteScreen(), label: 'TAP TO TUG', place: 'below', delay: 80, ms: 900 });
        if (DIP.n === 1) say(sync, { Jolly: 'Ooh, it’s dipping! Tap to give the line a tug.', Cheeky: 'Nosedive! Quick little tug!', Unfiltered: 'It’s dropping. Tap to tug.' }, 'worried', 2400);
        ctx.track('dip', { n: DIP.n });
      }
      function endDip() {
        DIP.active = false; WND.gd = 0; WND.gs = 1; DIP.cool = now() + 2600;
        const k = kiteScreen();
        if (DIP.tugs > 0) {
          G.saves++; sSave();
          K.pop(DIP.tugs >= 2 ? 'Steady!' : 'Nice tug!', { x: clamp(k.x + (k.x > W / 2 ? -1 : 1) * (KS.px + 60), 70, W - 70), y: clamp(k.y + KS.px * 0.6, 150, H - 220), kind: 'great' });
          if (DIP.n === 1) say(sync, { Jolly: 'There it goes. Small tugs are all it needs.', Cheeky: 'Tiny tug, big recovery. Smooth.', Unfiltered: 'Good. Small tugs.' }, 'happy', 2600);
        } else {
          K.pop('Back up', { x: clamp(k.x + (k.x > W / 2 ? -1 : 1) * (KS.px + 50), 60, W - 60), y: clamp(k.y + KS.px * 0.6, 150, H - 220), kind: 'soft' });
          if (DIP.n === 1) say(sync, { Jolly: 'See? It bobbed back up on its own too.', Cheeky: 'It sorted itself out. Show-off.', Unfiltered: 'It came back up anyway.' }, 'happy', 2600);
        }
        if (G.crank) K.guide(crankGuide(1400));
        ctx.track('dip_end', { n: DIP.n, tugs: DIP.tugs });
      }
      const crankGuide = (delay) => ({ id: 'crank', g: 'circle', target: reel, r: Math.round(RL.r * 0.62), label: 'CRANK THE REEL', ms: 1700, delay: delay == null ? 500 : delay });
      function firstCrank() {
        G.phase = 'climb';
        S.later(() => sayFree(sync, EXAMPLE ? { Jolly: 'There it goes. The words are getting smaller already.', Cheeky: 'Shrinking already. Love that for it.', Unfiltered: 'Smaller already.' } : care ? { Jolly: 'There it goes. Still yours, just further away.', Cheeky: 'Up it goes. Same worry, more sky.', Unfiltered: 'Further away now.' } : { Jolly: 'Look, the words are getting smaller already.', Cheeky: 'Shrinking already. Love that for it.', Unfiltered: 'Smaller already.' }, 'wow', 2800), 1600);
      }
      function startGust() {
        G.phase = 'gust'; G.crank = false; GU.t0 = now(); GU.hold = 0; GU.k = 0; GU.ramp = 0;
        RE.om = 0; mile.classList.remove('on');
        sGust(); sync.face('surprised', 2200);
        say(drop, care ? { Jolly: 'Big gust! You don’t have to fight it. Hold the reel still and let the kite ride it.', Cheeky: 'Big one! Don’t fight it. Just hold the reel still.', Unfiltered: 'Big gust. Hold still. Let it ride.' } : { Jolly: 'Big gust! Don’t fight it. Hold the reel still and let the kite ride it.', Cheeky: 'Big one! Plot twist: you do nothing. Just hold the reel.', Unfiltered: 'Big gust. Don’t fight it. Hold still.' }, 'surprised', 0);
        K.guide({ id: 'hold', g: 'hold', target: reel, label: 'HOLD THE REEL STILL', ms: 2400, delay: 900 });
        ctx.track('gust', {});
      }
      async function gustDone(held) {
        if (G.phase !== 'gust') return;
        G.phase = 'calm'; WND.gs = 1; WND.turb = 0; GU.done = true; GU.held = held; K.guide(null);
        sSteady(); G.flash = 0.6;
        drop.base('calm');
        say(sync, held ? { Jolly: 'It steadied itself. You didn’t have to fight it at all.', Cheeky: 'Look at that. It sorted itself out. You just held on.', Unfiltered: 'It settled on its own. You just held on.' } : { Jolly: 'The gust passed. The kite rode it out on its own.', Cheeky: 'Gust’s gone. The kite handled it.', Unfiltered: 'It passed. The kite rode it out.' }, 'calm', 3400);
        ctx.track('gust_end', { held: held ? 1 : 0, fights: G.fights });
        await K.wait(2600);
        G.phase = 'climb2'; G.crank = true;
        K.guide(crankGuide(900));
        S.later(() => sayFree(drop, { Jolly: 'Let’s use the rest of the line.', Cheeky: 'Rest of the line. Send it.', Unfiltered: 'Rest of the line.' }, 'happy', 2200), 1600);
      }
      async function endOfLine() {
        if (G.phase !== 'climb2') return;
        G.phase = 'full'; G.crank = false; RE.om = 0; K.guide(null);
        if (A.ctx) { A.thud({ vol: 0.25 }); A.pad(['D3', 'A3', 'F#4', 'E5'].map(n => A.note(n)), { dur: 5, vol: 0.14, attack: 1 }); }
        cutTo('vista', 3600);
        say(sync, { Jolly: 'That’s all the line. Look how far you can see from up there.', Cheeky: 'Out of line! Look at that view though.', Unfiltered: 'That’s all the line. Look at the view.' }, 'wow', 3600);
        ctx.track('full', { L: Math.round(KP.L) });
        await K.wait(4300);
        G.phase = 'tie';
        cutTo('hill', 2800, 30);
        await K.wait(2400);
        say(drop, { Jolly: 'Tie it to the post. It can fly itself for a while.', Cheeky: 'Tie it off. The kite’s got this.', Unfiltered: 'Tie it to the post.' }, 'happy', 3200);
        hand.hidden = false; placeHand();
        guideTie(200);
      }
      function screenOf(x, y, z) { proj(x, y, z); return { x: PO[3], y: PO[4], k: PO[5], d: PO[2] }; }
      function placeHand() {
        if (hand.hidden) return;
        const p = G.drag ? screenOf(G.drag.x, G.drag.y, G.drag.z) : screenOf(ANC.x, ANC.y, ANC.z);
        hand.style.left = p.x.toFixed(1) + 'px'; hand.style.top = p.y.toFixed(1) + 'px';
      }
      function guideTie(delay) {
        if (G.phase !== 'tie') return;
        const a = screenOf(ANC.x, ANC.y, ANC.z), b = screenOf(POST.x, POST.y + 1.05, POST.z);
        K.guide({ id: 'tie', g: 'drag', target: hand, dx: b.x - a.x, dy: b.y - a.y, label: 'TIE IT TO THE POST', ms: 1900, delay: delay == null ? 600 : delay });
      }
      // drag the line from the hands to the post
      K.drag(hand, {
        space: el,
        start: () => { if (G.phase !== 'tie') return false; K.guide(null); if (A.ctx) A.click({ vol: 0.08 }); },
        move: (p) => {
          if (G.phase !== 'tie') return;
          // the finger's point on a vertical plane through the flyer, facing the camera
          proj(FEET.x, FEET.y, FEET.z); const d = PO[2];
          const x1 = (p.x - AX) * d / FF, y1 = (AY - p.y) * d / FF;
          const yc = y1 * cPt + d * sPt, zc = -y1 * sPt + d * cPt;   // un-pitch
          const wx = x1 * cYw + zc * sYw, wz = -x1 * sYw + zc * cYw;  // un-yaw
          const tgt = { x: CAM.x + wx, y: Math.max(FEET.y + 0.2, Math.min(FEET.y + 1.9, CAM.y + yc)), z: CAM.z + wz };
          const dx = tgt.x - FEET.x, dz = tgt.z - FEET.z, dd = Math.hypot(dx, dz), lim = 2.9;
          if (dd > lim) { tgt.x = FEET.x + dx / dd * lim; tgt.z = FEET.z + dz / dd * lim; }
          G.drag = tgt; ANC.x = tgt.x; ANC.y = tgt.y; ANC.z = tgt.z;
          if (Math.random() < 0.08 && A.ctx) A.noise({ filter: 'bandpass', freq: 900, q: 2, dur: 0.06, vol: 0.02 });
        },
        end: (p) => {
          if (G.phase !== 'tie') return;
          const b = screenOf(POST.x, POST.y + 1.05, POST.z);
          if (Math.hypot(p.x - b.x, p.y - b.y) < (phone ? 64 : 72)) tieIt();
          else { G.drag = null; ANC.x = 0.05; ANC.y = HILL.H + 1.25; ANC.z = 0.36; if (A.ctx) A.boing({ freq: 260, vol: 0.05 }); guideTie(700); }
        }
      });
      S.listen(hand, 'keydown', (e) => { if ((e.code === 'Enter' || e.code === 'Space') && G.phase === 'tie') { e.preventDefault(); tieIt(); } });
      async function tieIt() {
        G.phase = 'tied'; G.drag = null; G.tied = true; hand.hidden = true; K.guide(null);
        ANC.x = POST.x; ANC.y = POST.y + 1.02; ANC.z = POST.z;
        sKnot(); S.buzz(14);
        const b = screenOf(POST.x, POST.y + 1.02, POST.z);
        P.emit('star', b.x, b.y, 12, { colors: ['#fff3c4', '#ffd36b', KITE.c[0]], speed: [40, 120] });
        K.pop('Tied', { x: b.x, y: b.y - 40, kind: 'good' });
        ctx.track('tied', {});
        await K.wait(1300);
        G.phase = 'lie'; lieZ.hidden = false;
        say(sync, { Jolly: 'Now lie back. Just watch it for a bit.', Cheeky: 'Lie back. You’ve earned some sky.', Unfiltered: 'Lie back. Watch it.' }, 'calm', 3200);
        K.guide({ id: 'lie', g: 'hold', target: lieZ, label: 'HOLD TO LIE BACK', ms: 2000, delay: 700 });
      }
      const lieHold = K.hold(lieZ, {
        ms: 1300,
        start: () => { if (G.phase !== 'lie') return; K.guide(null); if (A.ctx) A.noise({ filter: 'lowpass', freq: 900, dur: 0.9, attack: 0.3, vol: 0.05 }); },
        progress: (k) => { if (G.phase === 'lie') G.pov = Math.max(G.pov, k * 0.12); },
        cancel: () => { if (G.phase === 'lie') { G.pov = 0; K.guide({ id: 'lie2', g: 'hold', target: lieZ, label: 'HOLD TO LIE BACK', ms: 2000, delay: 900 }); } },
        done: () => { if (G.phase === 'lie') lieBack(); }
      });
      void lieHold;
      async function lieBack() {
        G.phase = 'finale'; lieZ.hidden = true; K.guide(null);
        if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 600, to: 200, dur: 2.2, attack: 0.4, vol: 0.07 });
        cutTo('lie', 3200);
        await K.anim(2200, (k) => { G.pov = k; }, K.ease.inOutSine);
        finale();
      }

      /* ---------------- finale ---------------- */
      async function finale() {
        sync.base('calm'); drop.base('sleepy');
        say(sync, care ? { Jolly: 'It’s still real, and it still matters. It just has a lot more sky around it now.', Cheeky: 'Still real. Just a lot more sky around it.', Unfiltered: 'Still real. More sky around it.' } : EXAMPLE ? { Jolly: 'From down here, any worry is just a dot in a very big sky.', Cheeky: 'A dot. A tiny, very dramatic dot.', Unfiltered: 'Just a dot now.' } : { Jolly: 'From down here it’s just a dot in a very big sky.', Cheeky: 'Look at it. A tiny, very dramatic dot.', Unfiltered: 'It’s a dot now.' }, 'calm', 0);
        // the kite shrinks to its true size: a dot
        K.anim(3200, (k) => { G.minPx = lerp(phone ? 14 : 16, 3, k); }, K.ease.inOutSine);
        await K.wait(3000);
        sync.hush(); drop.hush();
        cap.innerHTML = ''; cap.append(document.createTextNode(care ? 'More sky around it.' : 'Just a dot.'), h('small', { text: care ? 'Still real. Easier to see around.' : 'Up close it was loud. From the grass, it’s tiny.' }));
        cap.classList.add('on');
        K.finale('fireflies', { colors: ['#ffe9a8', '#fff3c4', '#ffd27a', '#ffc8a0'], chord: ['D4', 'F#4', 'A4', 'E5'], ms: 5600 });
        const b = screenOf(POST.x, POST.y + 1.0, POST.z);
        P.emit('mote', b.x, b.y, 10, { colors: ['#fff3c4', '#ffd27a'], speed: [6, 20] });
        await K.wait(3600);
        cap.classList.remove('on');
        showCard();
        await K.wait(3200);
        finish();
      }
      function miniKite(k, owned) {
        const c = document.createElement('canvas'); c.width = c.height = 60; c.setAttribute('aria-hidden', 'true');
        const g = c.getContext('2d'); g.translate(30, 31); g.scale(34, 34);
        if (!owned) { g.fillStyle = 'rgba(160,150,180,0.45)'; kitePath(g, k.shape); g.fill(); return c; }
        kitePath(g, k.shape); g.fillStyle = k.c[0]; g.fill();
        g.save(); kitePath(g, k.shape); g.clip(); g.fillStyle = k.c[1]; g.fillRect(0, -1, 1, 2); g.restore();
        kitePath(g, k.shape); g.strokeStyle = 'rgba(30,14,10,0.5)'; g.lineWidth = 0.05; g.stroke();
        return c;
      }
      let card = null;
      function showCard() {
        const have = K.collection(), owned = KITES.filter(k => k.id === KITE.id || have.includes(k.id)).length;
        const tray = h('div', { class: 'kl-tray', role: 'img', 'aria-label': 'Your kites: ' + owned + ' of ' + KITES.length }, KITES.map(k => { const cc = miniKite(k, k.id === KITE.id || have.includes(k.id)); if (k.id === KITE.id) cc.classList.add('today'); return cc; }));
        card = h('div', { class: 'kl-card pre', role: 'status' },
          h('div', { class: 'kl-card-k', text: 'Today’s kite · ' + owned + ' of ' + KITES.length }),
          h('div', { class: 'kl-card-t', text: KITE.name }),
          h('div', { class: 'kl-card-s', text: 'Steady flight ' + steadyPct() + '% · ' + Math.round(KP.L) + ' m of line. Tomorrow: a new kite and a new sky.' }),
          tray);
        el.append(card);
        S.later(() => card && card.classList.remove('pre'), 30);
        K.sfx.paper();
      }
      function steadyPct() { // the skills the game teaches: save the dips, ride the big gust, let the wind take the line
        const dipK = G.saves / Math.max(1, DIP.n);
        const gustK = !GU.done ? 0.5 : GU.held ? (G.fights === 0 ? 1 : G.fights < 3 ? 0.78 : 0.55) : 0.4;
        const smoothK = 1 - clamp(G.slipT / Math.max(5, G.crankT) * 2.2, 0, 1);
        return Math.round(clamp(0.4 * dipK + 0.3 * gustK + 0.3 * smoothK, 0.2, 1) * 100);
      }
      function finish() {
        if (G.finished) return;
        G.finished = true; G.phase = 'done';
        const pct = steadyPct(), badges = [];
        const pb = K.best('steady', pct, 'higher');
        if (pb.isNew) badges.push('New best steady flight: ' + pct + '%'); else if (pb.first) badges.push('First flight: ' + pct + '% steady');
        const tier = K.tier(pct / 100, [0.55, 0.75, 0.9]); if (tier) badges.push(tier + ' flight');
        const col = K.collect(KITE.id);
        badges.push((col.isNew ? 'New kite: ' : 'Flew the ') + KITE.name + ' (' + Math.min(col.count, KITES.length) + ' of ' + KITES.length + ')');
        if (GU.done && GU.held && G.fights < 2) badges.push('Rode out the big gust');
        ctx.track('done', { pct, saves: G.saves, fights: G.fights, kite: KITE.id, sky: SKY.id });
        ctx.finish({
          title: care ? 'More sky around it' : 'It became a dot', mood: 'calm',
          lines: [Math.round(KP.L) + ' m of line let out, all the way to the sea', 'Steady flight: ' + pct + '% · ' + G.saves + ' of ' + DIP.n + (DIP.n === 1 ? ' dip saved' : ' dips saved'), care ? 'Still real. Just with more sky around it.' : 'Up close it was loud. From the grass, a dot.'],
          share: 'Flew my worry so high it became a dot.', badges
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => { layout(); ready = true; });
      setTod(TOD0); KP.L = 14; KP.r = 14; kiteWorld(); RN.r = 14; shotClimb(0); CK.forEach(n => { CAM[n] = CT[n]; });
      (async () => {
        await K.intro({ title: 'Kite Line', sub: EXAMPLE ? 'Any worry can ride a kite. Up close it’s loud. Let’s give it some sky.' : 'Your worry is written on a kite. Up close it’s loud. Let’s give it some sky.', how: 'Circle the reel to let out line. Tap to tug when it dips.', char: 'sync', mood: 'happy' });
        G.phase = 'launch';
        if (visits >= 1) say(sync, { Jolly: 'Back on the hill! Today’s kite: the ' + KITE.name + '.', Cheeky: 'Oh, a regular. Today we fly the ' + KITE.name + '.', Unfiltered: 'Today’s kite: ' + KITE.name + '.' }, 'happy', 2600);
        else say(sync, EXAMPLE ? { Jolly: 'No words needed. This kite carries a “what if”. Any worry flies the same.', Cheeky: 'Borrowed worry on the kite today. Works the same, promise.', Unfiltered: 'Example worry on the kite. Same idea.' } : care ? { Jolly: 'That one’s heavy up close. Let’s give it some room.', Cheeky: 'Big one, right up in your face. Let’s give it space.', Unfiltered: 'Heavy up close. Give it room.' } : { Jolly: 'Up close it’s so loud, isn’t it? Let’s give it some sky.', Cheeky: 'That is a very shouty kite. Let’s send it somewhere quieter.', Unfiltered: 'Too close. Let out some line.' }, care ? 'calm' : 'worried', 3600);
        await K.wait(visits >= 1 ? 1500 : 1100);
        G.crank = true;
        K.guide(crankGuide(300));
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 20000)) await K.wait(60); };
          await until(() => !!el.querySelector('.gk-intro') || G.phase !== 'intro', 5000);
          const intro = el.querySelector('.gk-intro'); if (intro) await K.sim.tap(intro);
          await until(() => G.crank, 15000);
          async function crankTurn() {
            const rs = reel.offsetWidth || 168, c = rs / 2, rad = rs * 0.34;
            let a = -Math.PI / 2;
            const pr = await K.sim.press(reel, c + Math.cos(a) * rad, c + Math.sin(a) * rad);
            for (let i = 1; i <= 8; i++) {
              await K.wait(60);
              if ((DIP.active && DIP.tugs === 0 && i > 2) || !G.crank) break;
              // a skilled flyer lets the wind take the line: pause while the line runs ahead of the kite
              for (let w = 0; w < 6 && KP.L - KP.r > 1.6 + 0.03 * KP.r; w++) await K.wait(70);
              a += TAU / 8; pr.move(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
            }
            pr.up(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
            await K.wait(30);
          }
          let guard = 0;
          while (!G.finished && guard++ < 900) {
            if (G.phase === 'gust') {
              await K.wait(1200);
              const rs = reel.offsetWidth || 168;
              const pr = await K.sim.press(reel, rs * 0.5 + rs * 0.2, rs * 0.5);
              await until(() => G.phase !== 'gust', 20000);
              pr.up(rs * 0.5 + rs * 0.2, rs * 0.5);
              continue;
            }
            if (G.phase === 'tie' && !hand.hidden) {
              await K.wait(900);
              const r = K.rectIn(hand, el), b = screenOf(POST.x, POST.y + 1.05, POST.z);
              await K.sim.drag(hand, { x: r.w / 2, y: r.h / 2 }, { x: b.x - r.x, y: b.y - r.y }, 900, 16);
              await until(() => G.phase !== 'tie', 3000);
              continue;
            }
            if (G.phase === 'lie' && !lieZ.hidden) {
              await K.wait(900);
              await K.sim.hold(lieZ, 1600);
              await until(() => G.phase !== 'lie', 4000);
              continue;
            }
            if (DIP.active && DIP.tugs < 3 && now() - DIP.t0 > 350) { const k = kiteScreen(); await K.sim.tap(tugZone, k.x, k.y); await K.wait(300); continue; }
            if (G.crank && !DIP.active) { await crankTurn(); continue; }
            await K.wait(100);
          }
          await until(() => G.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
