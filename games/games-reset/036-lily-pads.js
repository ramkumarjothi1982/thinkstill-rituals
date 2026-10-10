/* 036 Lily Pads — Reset · ACT · Getting Started
 * Mechanism: taking the next step without certainty (graded approach, and building tolerance of uncertainty; Dugas &
 * Robichaud 2007; Carleton 2016): you don't need to see the whole path to take the next step, and each step shows you the
 * next one. The far shore (the task, or "the thing") shows through the dawn mist; the path doesn't. Every hop reveals one
 * more pad, a short hop still lands (a wobble, never a fall), and a few pads carry a tiny next step.
 * Verb: hop (press and hold to crouch, let go to hop; a longer hold is a longer hop). Twist: a gap with no pad at all; a
 * log drifts out of the mist only after you commit to the leap. Finale: the mist lifts, the sun comes up, the path you
 * hopped lights up pad by pad behind you, lotus flowers open and dragonflies circle the frog sitting proud on the far bank.
 * Come back: a different pond season each day, frog outfits earned by tier (worn next time), best clean hops.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;

  /* Today's pond. sky: top, middle, horizon; water: near, middle, far; pad: three leaf greens; rim: the leaf's edge. */
  const SEASONS = [
    { id: 'spring', name: 'Spring pond', sky: ['#a99bd8', '#f0b9c8', '#ffdcc0'], water: ['#45598a', '#8e9fcd', '#f6d2cc'], mist: '#fbeef3', pad: ['#63b45b', '#4e9c4f', '#7dc565'], rim: '#2f6b3a', flower: ['#ff8fb8', '#ffd3e3'], float: 'petal', floatCol: ['#ffd3e2', '#ffc2d8', '#fff2f6'], reed: '#3f6b48', bank: ['#6aa35a', '#3f7343'], trees: '#7a86b0' },
    { id: 'summer', name: 'Summer pond', sky: ['#7fa6e2', '#f4c7a2', '#ffe3ad'], water: ['#2c5978', '#7cadc6', '#ffe0b5'], mist: '#fff5e6', pad: ['#4ea94d', '#3b8f44', '#74c15a'], rim: '#25603a', flower: ['#fffaf0', '#ffe9a8'], float: '', floatCol: [], reed: '#3c6a3e', bank: ['#5f9c4c', '#3a6e3c'], trees: '#6a8597', flies: true },
    { id: 'autumn', name: 'Autumn pond', sky: ['#8c84c2', '#f2a88d', '#ffcd98'], water: ['#3a4e6e', '#9a98b8', '#f5c39b'], mist: '#fbefe3', pad: ['#93a64a', '#77893c', '#b2b558'], rim: '#4a5a26', flower: ['#ffb066', '#ffdcae'], float: 'leaf', floatCol: ['#e0893b', '#c9562f', '#f0b44a'], reed: '#6b6a3a', bank: ['#8a8f45', '#5e6a33'], trees: '#94787f' },
    { id: 'winter', name: 'Winter pond', sky: ['#8ea2d6', '#d8c2dd', '#fde2df'], water: ['#3d5573', '#9cb3cf', '#f2dde4'], mist: '#f3f6fb', pad: ['#5f9a84', '#4c836f', '#86b9a2'], rim: '#eef7f6', flower: ['#eaf2ff', '#ffffff'], float: 'snow', floatCol: ['#ffffff'], reed: '#5b6b62', bank: ['#d3dede', '#a5b6b8'], trees: '#8592ad', frost: true },
    { id: 'rain', name: 'Rainy pond', sky: ['#7d84a7', '#b8b2c8', '#e4d5d6'], water: ['#34465d', '#838ea7', '#d8ced4'], mist: '#eef0f5', pad: ['#56a057', '#43884a', '#6fb862'], rim: '#2c5f37', flower: ['#d7a6ff', '#f0dcff'], float: '', floatCol: [], reed: '#3d5f45', bank: ['#5b8f52', '#3a653b'], trees: '#6c7591', rain: true }
  ];
  const OUTFITS = [{ id: 'leaf', name: 'Leaf cap', tier: 'Bronze' }, { id: 'scarf', name: 'Reed scarf', tier: 'Silver' }, { id: 'crown', name: 'Lily crown', tier: 'Gold' }];
  /* Tiny next steps the pond offers on a few pads (gentle suggestions, never the player's words). */
  const STEPS = {
    start: ['OPEN IT', 'JUST LOOK', 'ONE LINE', 'TWO MINUTES', 'ONE MORE BIT'],
    perform: ['ONE BREATH', 'WARM UP', 'FIRST 30 SECONDS', 'SHOW UP', 'KEEP GOING'],
    unsure: ['JUST THIS PAD', 'ONE STEP', 'BREATHE OUT', 'NOTICE', 'KEEP GOING'],
    care: ['ONE STEP', 'WRITE IT DOWN', 'ASK SOMEONE', 'BREATHE OUT', 'KEEP GOING']
  };
  /* Each landing plays the next note of the pond's tune (F major pentatonic); a soft pad moves through four chords. */
  const TUNE = ['C5', 'D5', 'F5', 'G5', 'A5', 'G5', 'F5', 'A5', 'C6', 'A5', 'G5', 'D5', 'F5', 'G5', 'A5', 'C6'];
  const CHORDS = [['F3', 'C4', 'A4', 'E5'], ['D3', 'A3', 'F4', 'C5'], ['A#2', 'F3', 'D4', 'A4'], ['C3', 'G3', 'E4', 'D5']];

  const hexRgb = (s) => { const n = parseInt(String(s).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const css = (c, al) => (al == null ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')' : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + Math.max(0, Math.min(1, al)).toFixed(3) + ')');
  const smooth = (k) => k * k * (3 - 2 * k);

  (env.games = env.games || []).push({
    id: 'lily-pads', mode: 'reset', name: 'Lily Pads', verb: 'hop', family: 'ACT', minutes: 2,
    parents: ['Getting Started', 'Uncertainty / Future Worry / Reassurance', 'Performance / Confidence'],
    cast: ['loopie', 'rush'], poster: { char: 'loopie', mood: 'determined' },
    fonts: ['Lilita+One', 'Grandstander:wght@600;800'],
    tagline: 'Hop across a misty pond. The next pad only appears once you jump.',
    why: 'For when you can’t see the whole path: you only ever need the next step.',
    css: `
.g-lily-pads { --lp-disp: "Lilita One", "Chalkboard SE", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif; --lp-hand: "Grandstander", "Chalkboard SE", "Comic Sans MS", "Trebuchet MS", system-ui, sans-serif; }
.g-lily-pads .lp-zone { position: absolute; inset: 0; z-index: 10; touch-action: none; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; }
.g-lily-pads .lp-zone:focus-visible { box-shadow: inset 0 0 0 3px rgba(255, 214, 120, 0.85); }
.g-lily-pads.lp-duo .gk-char .gk-bubble { max-width: min(270px, calc(100cqw - var(--sz) * 2 - 58px)); }
.g-lily-pads .lp-goal { position: absolute; z-index: 12; left: 0; top: 0; transform: translate(-50%, -100%); padding: 6px 13px 8px; border-radius: 14px; text-align: center; pointer-events: none; width: max-content; max-width: min(250px, calc(100% - 28px));
  background: rgba(255, 249, 242, 0.86); color: #3b2c4a; box-shadow: 0 8px 22px rgba(50, 30, 80, 0.22); border: 1px solid rgba(255, 255, 255, 0.7); transition: opacity 0.6s ease; }
.g-lily-pads .lp-goal::after { content: ""; position: absolute; left: 50%; bottom: -6px; width: 12px; height: 12px; margin-left: -6px; background: inherit; transform: rotate(45deg); border-right: 1px solid rgba(255, 255, 255, 0.7); border-bottom: 1px solid rgba(255, 255, 255, 0.7); }
.g-lily-pads .lp-goal small { display: block; font: 700 12px/1.1 var(--font-ui); letter-spacing: 0.16em; text-transform: uppercase; color: #8a5a7a; }
.g-lily-pads .lp-goal b { display: block; position: relative; z-index: 1; margin-top: 3px; font: 400 16px/1.12 var(--lp-disp); letter-spacing: 0.03em; overflow-wrap: anywhere; }
.g-lily-pads .lp-goal.off { opacity: 0; }
.g-lily-pads .lp-goal.dim { opacity: 0.2; }
.g-lily-pads .lp-hud { position: absolute; z-index: 24; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); transform: translateX(-50%); padding: 8px 15px 9px; border-radius: 999px; font: 700 14px/1 var(--lp-hand); letter-spacing: 0.02em;
  color: #fff; background: rgba(24, 28, 62, 0.5); border: 1px solid rgba(255, 255, 255, 0.18); pointer-events: none; white-space: nowrap; transition: opacity 0.5s ease; }
.g-lily-pads .lp-hud em { font-style: normal; color: #ffd36b; }
.g-lily-pads .lp-hud.off { opacity: 0; }
.g-lily-pads.lp-bright .lp-hud { background: rgba(255, 255, 255, 0.78); color: #2b2440; border-color: rgba(60, 40, 90, 0.14); }
.g-lily-pads.lp-bright .lp-hud em { color: #a35c00; }
.g-lily-pads .lp-tag { position: absolute; z-index: 26; left: 0; top: 0; padding: 7px 12px 8px; border-radius: 13px; text-align: center; pointer-events: none; white-space: nowrap; opacity: 0;
  transform: translate(-50%, -100%) translateY(12px) scale(0.86); background: #fff4cf; color: #3a2a12; box-shadow: 0 8px 18px rgba(40, 30, 10, 0.28); transition: opacity 0.35s ease, transform 0.55s cubic-bezier(.2, 1.5, .4, 1); }
.g-lily-pads .lp-tag small { display: block; font: 700 12px/1 var(--font-ui); letter-spacing: 0.14em; color: #9a6a1a; margin-bottom: 4px; }
.g-lily-pads .lp-tag b { display: block; font: 400 17px/1 var(--lp-disp); letter-spacing: 0.04em; }
.g-lily-pads .lp-tag.on { opacity: 1; transform: translate(-50%, -100%) translateY(0) scale(1); }
.g-lily-pads .lp-wisp { position: absolute; z-index: 11; left: 50%; top: 40%; transform: translate(-50%, -50%); width: max-content; max-width: min(300px, calc(100% - 48px)); text-align: center; pointer-events: none; text-wrap: balance;
  font: 400 19px/1.15 var(--lp-disp); letter-spacing: 0.04em; color: #5a4a78; text-shadow: 0 0 14px rgba(255, 255, 255, 0.95), 0 0 4px rgba(255, 255, 255, 0.9); opacity: 0; transition: opacity 0.9s ease, transform 1.2s ease; }
.g-lily-pads .lp-wisp.on { opacity: 0.9; }
.g-lily-pads .lp-wisp.gone { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }
.g-lily-pads .lp-cap { position: absolute; z-index: 27; left: 50%; top: 21%; transform: translate(-50%, 10px); width: max-content; max-width: calc(100% - 36px); text-align: center; pointer-events: none; opacity: 0;
  font: 400 34px/1.05 var(--lp-disp); letter-spacing: 0.02em; color: #fffaf0; text-shadow: 0 3px 0 rgba(60, 40, 90, 0.25), 0 6px 26px rgba(50, 30, 90, 0.5); text-wrap: balance; transition: opacity 1s ease, transform 1.2s cubic-bezier(.2, .9, .3, 1); }
.g-lily-pads .lp-cap small { display: table; margin: 12px auto 0; padding: 6px 14px 7px; border-radius: 999px; background: rgba(40, 28, 74, 0.5); font: 700 15px/1.3 var(--lp-hand); color: #fff8ec; text-shadow: none; letter-spacing: 0.01em; }
.g-lily-pads .lp-cap.on { opacity: 1; transform: translate(-50%, 0); }
.g-lily-pads .lp-card { position: absolute; z-index: 40; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 18px); width: min(350px, calc(100% - 28px)); box-sizing: border-box; padding: 14px 16px 15px; border-radius: 22px; text-align: center; transform: translateX(-50%);
  background: rgba(30, 30, 64, 0.88); border: 1px solid rgba(255, 220, 160, 0.4); color: #fff6ea; box-shadow: 0 18px 44px rgba(10, 6, 40, 0.45); transition: opacity 0.6s ease, transform 0.7s cubic-bezier(.2, 1.2, .4, 1); }
.g-lily-pads .lp-card.pre { opacity: 0; transform: translate(-50%, 22px); }
.g-lily-pads .lp-card-k { font: 700 12px/1.2 var(--font-ui); letter-spacing: 0.18em; text-transform: uppercase; color: #ffd391; }
.g-lily-pads .lp-card-t { margin-top: 6px; font: 400 24px/1.1 var(--lp-disp); letter-spacing: 0.02em; }
.g-lily-pads .lp-card-s { margin-top: 6px; font: 600 15px/1.35 var(--lp-hand); color: rgba(255, 246, 234, 0.92); text-wrap: balance; }
.g-lily-pads .lp-row { display: flex; justify-content: center; gap: 8px; margin-top: 10px; }
.g-lily-pads .lp-row canvas { width: 34px; height: 34px; border-radius: 11px; background: rgba(255, 255, 255, 0.08); }
.g-lily-pads .lp-row canvas.on { box-shadow: 0 0 0 2px #ffd391, 0 0 12px rgba(255, 211, 145, 0.6); }
.g-lily-pads.lp-bright .lp-card { background: rgba(255, 252, 246, 0.95); border-color: rgba(160, 100, 60, 0.3); color: #2a2036; box-shadow: 0 18px 40px rgba(60, 40, 90, 0.22); }
.g-lily-pads.lp-bright .lp-card-k { color: #a2561a; }
.g-lily-pads.lp-bright .lp-card-s { color: #4a3d58; }
.g-lily-pads.lp-bright .lp-row canvas { background: rgba(60, 40, 90, 0.06); }
@container (min-width: 700px) {
  .g-lily-pads .lp-cap { font-size: 46px; top: 19%; }
  .g-lily-pads .lp-goal b { font-size: 18px; }
  .g-lily-pads .lp-card { width: 400px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      const an = ctx.analysis || {};
      const inten = ctx.intensity, care = an.safety === 'care', visits = K.visits();
      const now = () => performance.now(), clamp = K.clamp, lerp = (a, b, t) => a + (b - a) * t;
      const line = (o) => ctx.line(o);
      const SEASON = (S.isDev() && /lpseason=(\w+)/.test(location.search) && SEASONS.find(x => x.id === /lpseason=(\w+)/.exec(location.search)[1])) || K.dailyPick(SEASONS, 5); // TEMP-DEBUG
      const SC = { sky: SEASON.sky.map(hexRgb), water: SEASON.water.map(hexRgb), mist: hexRgb(SEASON.mist), pad: SEASON.pad.map(hexRgb), rim: hexRgb(SEASON.rim), flower: SEASON.flower.map(hexRgb), reed: hexRgb(SEASON.reed), bank: SEASON.bank.map(hexRgb), trees: hexRgb(SEASON.trees) };
      const DARK0 = K.dark();
      el.classList.toggle('lp-bright', !DARK0);
      S.on('theme', () => el.classList.toggle('lp-bright', !K.dark()));

      /* ---------------- words: the far shore is their task when they named one; their own what-if haunts the gap ---------------- */
      const ownCore = an.core && an.core.label && !an.core.generic ? String(an.core.label).replace(/\s+/g, ' ').trim().toUpperCase() : '';
      const ownStrand = (an.strands || []).find(s => s && s.label && !s.generic);
      const taskRaw = String(an.task || '').replace(/\s+/g, ' ').trim();
      let GOAL = 'THE OTHER SIDE', GOAL_OWN = false;
      if (taskRaw && taskRaw.length <= 30 && !/…|\.\.\.$/.test(taskRaw)) { GOAL = taskRaw.toUpperCase(); GOAL_OWN = true; }
      else if (ownCore && /Getting Started|Performance/.test(String(an.parent || ''))) { GOAL = ownCore; GOAL_OWN = true; }
      const strandUp = ownStrand ? String(ownStrand.label).replace(/\s+/g, ' ').trim().toUpperCase() : '';
      const WISP = GOAL_OWN && GOAL === ownCore ? (strandUp && strandUp !== GOAL ? strandUp : '') : (ownCore || strandUp);
      const stepsKey = care ? 'care' : an.parent === 'Getting Started' ? 'start' : an.parent === 'Performance / Confidence' ? 'perform' : 'unsure';
      const STEPW = K.shuffle(STEPS[stepsKey], K.rng(K.daily() + 3));
      const owned = K.collection();
      const WEAR = ['crown', 'scarf', 'leaf'].find(id => owned.includes('outfit:' + id)) || '';

      /* ---------------- the path (seeded by the day): pads, one log that isn't there yet, the far bank ---------------- */
      const PLAN = [[2.2, 2.6, 2.0, 'gap', 2.5, 2.2, 'bank'], [2.2, 2.7, 1.9, 3.0, 'gap', 2.4, 3.1, 2.0, 'bank'], [2.3, 2.9, 1.8, 3.2, 2.5, 'gap', 2.2, 3.3, 1.9, 2.8, 'bank']][inten];
      const PR = [0.72, 0.62, 0.55][inten], CLEAN = [0.5, 0.42, 0.34][inten], CHARGE_MS = [1500, 1250, 1050][inten];
      const MINH = 0.8, MAXH = 4.6, FW = 0.42;
      const RW = K.rng(K.daily() * 13 + 5), rw = (a, b) => a + RW() * (b - a);
      const PADS = [{ kind: 'start', x: 0, z: 0, r: 0.5, a: 1, dy: 0, vy: 0, glow: 0, rot: 0, v: 0, bloom: 0 }];
      {
        let z = 0, side = RW() < 0.5 ? 1 : -1;
        PLAN.forEach((d) => {
          const kind = d === 'gap' ? 'log' : d === 'bank' ? 'bank' : 'pad';
          const dist = kind === 'log' ? [3.7, 3.9, 4.05][inten] : kind === 'bank' ? 2.7 : d;
          side = -side;
          const x = kind === 'bank' ? 0 : side * rw(0.3, 0.68), dx = x - PADS[PADS.length - 1].x;
          z += Math.sqrt(Math.max(0.6, dist * dist - dx * dx));
          PADS.push({ kind, x, z, r: kind === 'pad' ? PR * rw(0.92, 1.12) : kind === 'log' ? 0.95 : 3, rot: rw(0, TAU), v: Math.floor(RW() * 3), a: 0, dy: 0, vy: 0, glow: 0, bloom: 0, flower: kind === 'pad' && RW() < 0.42, fx: rw(-0.5, 0.5), step: '' });
        });
      }
      const LOGI = PADS.findIndex(p => p.kind === 'log'), BANKI = PADS.length - 1;
      {
        const padIdx = PADS.map((p, i) => (p.kind === 'pad' ? i : -1)).filter(i => i > 0);
        [padIdx[1], LOGI + 1, BANKI - 1].filter((v, i, arr) => v > 0 && PADS[v] && PADS[v].kind === 'pad' && arr.indexOf(v) === i)
          .forEach((pi, k) => { PADS[pi].step = STEPW[k % STEPW.length]; PADS[pi].flower = true; });
      }
      const ZEND = () => PADS[BANKI].z;
      const JUDGED = PADS.filter(p => p.kind === 'pad').length;

      /* ---------------- state ---------------- */
      const FR = { x: 0, y: 0.1, z: 0, sq: 1, sqv: 0, wob: 0, wobv: 0, face: 1, legs: 0, crouch: 0, blink: 0, nb: now() + 1800, throat: 0, dangle: 0, arms: 0, air: null, front: 0, quiver: 0, look: 0 };
      const G = { phase: 'intro', at: 0, charge: 0, t0: 0, hops: 0, judged: 0, clean: 0, wobbles: 0, finished: false, zF: 1.2, zFt: 1.2, mist: 1, sunK: 0, dawn: DARK0 ? 0.5 : 0.78, shake: 0, lastTick: 0, inClean: false, saidWob: false, saidClean: false, saidTap: false, crane: 0, flies: 0, held: false, keyHold: false, pathGlow: -1 };
      const RIP = [], P = K.particles({ max: 320 });
      if (S.isDev()) window.__lpDbg = { G, FR, PADS }; // TEMP-DEBUG

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const zone = h('div', { class: 'lp-zone', role: 'button', tabindex: '0', 'aria-label': 'The pond. Press and hold to crouch, let go to hop. Hold longer for a longer hop.' });
      const goal = h('div', { class: 'lp-goal', 'aria-label': 'The far shore: ' + GOAL }, h('small', { text: 'Far shore' }), h('b', { class: GOAL_OWN ? 'gk-user' : null, text: GOAL }));
      const hud = h('div', { class: 'lp-hud', role: 'status', 'aria-live': 'polite' });
      const tag = h('div', { class: 'lp-tag', 'aria-hidden': 'true' }, h('small', { text: 'Tiny step' }), h('b'));
      const wisp = h('div', { class: 'lp-wisp gk-user', 'aria-hidden': 'true', text: WISP || '' });
      const cap = h('div', { class: 'lp-cap', role: 'status' });
      el.append(zone, goal, hud, tag, wisp, cap);
      const loopie = K.character('loopie', { side: 'right', mood: care ? 'calm' : 'worried', x: 10, y: 64 });
      const rush = K.character('rush', { side: 'left', mood: 'determined', x: 300, y: 64 });
      rush.show(false);
      let sayUntil = 0;
      function say(c, lines, mood, ms) {
        (c === loopie ? rush : loopie).hush();
        if (c === rush && rush.el.hidden) { rush.show(true); rush.react('bounce'); el.classList.add('lp-duo'); }
        const txt = line(lines), dur = ms == null ? Math.max(2600, txt.length * 60) : ms;
        c.say(txt, { mood, ms: dur });
        sayUntil = now() + (dur || 4000);
      }
      const sayFree = (c, lines, mood, ms) => { if (now() < sayUntil) return false; say(c, lines, mood, ms); return true; };
      function setHud() { hud.innerHTML = ''; hud.append(document.createTextNode(G.hops + (G.hops === 1 ? ' hop · ' : ' hops · ')), h('em', { text: String(G.clean) }), document.createTextNode(' clean')); }
      setHud();

      /* ---------------- layout & camera ---------------- */
      let W = 390, H = 844, phone = true, F = 800;
      const CAM = { x: 0, y: 2.0, z: -4.2, p: 0.2475, yaw: 0, AY: 422 }, CT = { x: 0, y: 2.0, z: -4.2, p: 0.2475, yaw: 0 };
      let cp = 1, spi = 0, cyw = 1, syw = 0;
      const PO = { x: 0, y: 0, k: 0, z: 0, ok: false };
      function camPrep() { cp = Math.cos(CAM.p); spi = Math.sin(CAM.p); cyw = Math.cos(CAM.yaw); syw = Math.sin(CAM.yaw); }
      function proj(X, Y, Z) {
        const rx0 = X - CAM.x, ry = Y - CAM.y, rz0 = Z - CAM.z;
        const rx = rx0 * cyw - rz0 * syw, rz = rx0 * syw + rz0 * cyw;
        const zc = -ry * spi + rz * cp, yc = ry * cp + rz * spi;
        PO.z = zc;
        if (zc < 0.12) { PO.ok = false; return PO; }
        const k = F / zc; PO.x = W / 2 + rx * k; PO.y = CAM.AY - yc * k; PO.k = k; PO.ok = true; return PO;
      }
      const horizonY = () => CAM.AY - Math.tan(CAM.p) * F;
      const topSafe = () => (phone ? 64 + 72 : 72 + 96) + 10; // just below the characters' row
      const E = { cx: 0, cy: 0, rx: 0, ry: 0, k: 0, ok: false };
      function ell(x, y, z, r) { // a flat disc on the water, as a screen ellipse
        proj(x, y, z - r); if (!PO.ok) { E.ok = false; return E; } const yn = PO.y;
        proj(x, y, z + r); if (!PO.ok) { E.ok = false; return E; } const yf = PO.y;
        proj(x, y, z); E.cx = PO.x; E.cy = (yn + yf) / 2; E.k = PO.k; E.rx = r * PO.k; E.ry = Math.max(0.6, Math.abs(yn - yf) / 2); E.ok = PO.ok; return E;
      }
      function layout() {
        W = cv.w; H = cv.h; phone = W < 700; F = H * 0.95; CAM.AY = H * 0.5;
        const sz = phone ? 72 : 96;
        loopie.el.style.setProperty('--sz', sz + 'px'); rush.el.style.setProperty('--sz', sz + 'px');
        loopie.place(phone ? 10 : 24, phone ? 64 : 72); rush.place(W - sz - (phone ? 10 : 24), phone ? 64 : 72);
        skyKey = ''; waterKey = ''; SPR.vig = null;
      }

      /* ---------------- the pond's furniture (seeded) ---------------- */
      const REEDS = [];
      for (let z = -3; z < ZEND() + 4; z += rw(0.9, 1.6)) {
        for (const sd of [-1, 1]) if (RW() < 0.8) REEDS.push({ x: sd * rw(2.6, 5.6), z: z + rw(-0.4, 0.4), h: rw(0.55, 1.35), n: 3 + Math.floor(RW() * 3), ph: rw(0, TAU), cat: RW() < 0.55 });
      }
      for (let i = 0; i < 9; i++) { const x = (RW() < 0.5 ? -1 : 1) * rw(1.5, 3.6); REEDS.push({ x, z: rw(-2.2, -0.7), h: rw(0.5, 1.1), n: 3 + Math.floor(RW() * 3), ph: rw(0, TAU), cat: RW() < 0.5 }); }
      for (let i = 0; i < 26; i++) REEDS.push({ x: rw(-6, 6), z: rw(-1.7, -1.2), h: rw(0.16, 0.32), n: 5, ph: rw(0, TAU), grass: true });
      for (let i = 0; i < 34; i++) { const x = rw(-7, 7); if (Math.abs(x) < 0.7) continue; REEDS.push({ x, z: ZEND() - 0.4 + rw(0, 2.6), h: rw(0.14, 0.3), n: 5, ph: rw(0, TAU), grass: true }); }
      for (let i = 0; i < 12; i++) { const x = rw(-6, 6); if (Math.abs(x) < 1.1) continue; REEDS.push({ x, z: ZEND() - 0.55 + rw(-0.15, 0.25), h: rw(0.5, 1.2), n: 3 + Math.floor(RW() * 3), ph: rw(0, TAU), cat: RW() < 0.5 }); }
      const TREES_FAR = [], TREES_NEAR = [];
      const blobs = () => [[0, -0.62, 0.5, 0.4], [rw(-0.42, -0.22), -0.42, rw(0.26, 0.36), rw(0.24, 0.32)], [rw(0.2, 0.4), -0.45, rw(0.26, 0.36), rw(0.24, 0.32)]];
      for (let x = -24; x < 24; x += rw(1.2, 2.3)) TREES_FAR.push({ x, z: ZEND() + rw(4.6, 10), h: rw(1.5, 3.2), w: rw(1.3, 2.5), willow: RW() < 0.3, d: rw(0, 0.22), b: blobs() });
      for (let x = -24; x < 24; x += rw(1.3, 2.5)) TREES_NEAR.push({ x, z: rw(-19, -12), h: rw(1.8, 3.6), w: rw(1.4, 2.6), willow: RW() < 0.3, d: rw(0, 0.22), b: blobs() });
      TREES_FAR.sort((a, b) => b.z - a.z); TREES_NEAR.sort((a, b) => a.z - b.z);
      const FARS = TREES_FAR.concat(REEDS.filter(r => r.z > PADS[LOGI].z - 0.5), []);
      const FLOAT = [];
      if (SEASON.float && SEASON.float !== 'snow') for (let i = 0; i < 26; i++) FLOAT.push({ x: rw(-4.5, 4.5), z: rw(-1, ZEND() - 1), rot: rw(0, TAU), s: rw(0.06, 0.12), c: Math.floor(RW() * SEASON.floatCol.length), vx: rw(-0.06, 0.06) });
      FLOAT.forEach(f => { if (f.z > PADS[LOGI].z - 0.5) FARS.push(f); });
      const WL = []; for (let i = 0; i < 44; i++) WL.push({ x: rw(-6, 6), z: rw(0, 30), len: rw(0.35, 1.5), ph: rw(0, TAU) });
      const GLINT = []; for (let i = 0; i < 70; i++) GLINT.push({ x: rw(-1, 1), z: rw(0, 1), ph: rw(0, TAU), w: rw(0.6, 1.6) });
      const PUFF = []; for (let i = 0; i < 16; i++) PUFF.push({ x: rw(-7, 7), dz: rw(-0.2, 7), y: rw(0.15, 0.9), s: rw(1.6, 3.4), ph: rw(0, TAU), v: rw(0.05, 0.16) * (RW() < 0.5 ? -1 : 1) });
      const LOW = []; for (let i = 0; i < 7; i++) LOW.push({ x: rw(-5, 5), dz: rw(0.8, 5), y: 0.12, s: rw(1.2, 2.4), ph: rw(0, TAU), v: rw(0.04, 0.1) });
      const FLIES = []; for (let i = 0; i < 4; i++) FLIES.push({ a: rw(0, TAU), r: rw(0.75, 1.35), h: rw(0.62, 1.2), w: rw(0.9, 1.6) * (i % 2 ? 1 : -1), ph: rw(0, TAU), c: i % 2 ? [90, 210, 230] : [120, 150, 255] });

      /* ---------------- sprites (painted once) ---------------- */
      const SPR = { pads: [], flower: null, frogBack: null, frogFront: null, puff: null, vig: null };
      function padSprite(col) {
        const S2 = 192, c = document.createElement('canvas'); c.width = c.height = S2;
        const g = c.getContext('2d'); g.translate(S2 / 2, S2 / 2); const r = S2 / 2 - 4, nw = 0.46;
        const leaf = () => { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, nw / 2, TAU - nw / 2); g.closePath(); };
        const gr = g.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r);
        gr.addColorStop(0, css(mix3(col, [255, 255, 230], 0.28))); gr.addColorStop(0.65, css(col)); gr.addColorStop(1, css(mix3(col, [10, 40, 20], 0.3)));
        leaf(); g.fillStyle = gr; g.fill();
        g.save(); leaf(); g.clip();
        g.strokeStyle = css(mix3(col, [20, 50, 20], 0.35), 0.45); g.lineWidth = 2; g.lineCap = 'round';
        for (let i = 0; i < 14; i++) { const a = nw / 2 + (i + 0.5) / 14 * (TAU - nw); g.beginPath(); g.moveTo(Math.cos(a) * r * 0.08, Math.sin(a) * r * 0.08); g.quadraticCurveTo(Math.cos(a + 0.08) * r * 0.55, Math.sin(a + 0.08) * r * 0.55, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); g.stroke(); }
        for (let i = 0; i < 18; i++) { const a = Math.random() * TAU, d = Math.random() * r * 0.85; g.fillStyle = css(mix3(col, [30, 60, 20], 0.4), 0.18); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, 2 + Math.random() * 4, 0, TAU); g.fill(); }
        g.restore();
        g.strokeStyle = SEASON.frost ? 'rgba(240,250,255,0.95)' : css(SC.rim, 0.85); g.lineWidth = SEASON.frost ? 6 : 3.5;
        g.beginPath(); g.arc(0, 0, r - 1, nw / 2, TAU - nw / 2); g.stroke();
        g.strokeStyle = 'rgba(255,255,235,0.35)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r - 7, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
        return c;
      }
      function flowerSprite() { // a lotus seen from the side: a cup of petals
        const c = document.createElement('canvas'); c.width = 120; c.height = 96;
        const g = c.getContext('2d'); g.translate(60, 80);
        const [p0, p1] = SC.flower, dk = mix3(p0, [120, 40, 80], 0.25);
        const petal = (a, len, wid, col) => { g.save(); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-wid, -len * 0.55, 0, -len); g.quadraticCurveTo(wid, -len * 0.55, 0, 0); g.fillStyle = col; g.fill(); g.restore(); };
        [-1.15, -0.62, 0, 0.62, 1.15].forEach((a, i) => petal(a * 0.9, 50, 17, css(i % 2 ? dk : mix3(p0, p1, 0.2))));
        [-0.75, -0.25, 0.25, 0.75].forEach((a) => petal(a, 58, 16, css(mix3(p0, p1, 0.45))));
        petal(0, 62, 15, css(p1));
        g.fillStyle = '#ffd86b'; g.beginPath(); g.ellipse(0, -18, 11, 5, 0, 0, TAU); g.fill();
        g.fillStyle = css(mix3(SC.pad[1], [0, 0, 0], 0.2)); g.beginPath(); g.ellipse(0, 2, 24, 6, 0, 0, TAU); g.fill();
        return c;
      }
      const FC = { body: [86, 182, 72], light: [168, 230, 112], dark: [40, 112, 56], belly: [246, 240, 196], spot: [44, 120, 52] };
      const RC = { body: css(FC.body), dark: css(FC.dark), light: css(FC.light), foot: css(mix3(FC.body, [255, 255, 200], 0.15)), padShadow: css(mix3(SC.water[0], [0, 0, 0], 0.25), 0.3), reed: css(SC.reed), reedDk: css(mix3(SC.reed, [0, 0, 0], 0.3)), grass: css(mix3(SC.bank[0], [255, 255, 210], 0.12)), grassDk: css(mix3(mix3(SC.bank[0], [255, 255, 210], 0.12), [0, 0, 0], 0.3)), farBank: css(mix3(SC.bank[1], SC.trees, 0.3)), farEdge: css(mix3(SC.bank[0], [255, 240, 210], 0.25), 0.6), nearBank: css(SC.bank[1]), nearEdge: css(SC.bank[0], 0.9) };
      function frogSprite(front) {
        const SS = 2, U = 150, Wd = 220, Ht = 200, c = document.createElement('canvas'); c.width = Wd * SS; c.height = Ht * SS;
        const g = c.getContext('2d'); g.scale(SS, SS); g.translate(Wd / 2, Ht - 22); g.scale(U, U);
        const sil = () => { g.beginPath(); g.ellipse(0, -0.38, 0.5, 0.38, 0, 0, TAU); g.moveTo(0.4, -0.7); g.ellipse(0, -0.7, 0.4, 0.27, 0, 0, TAU); };
        const gr = g.createRadialGradient(-0.16, -0.74, 0.04, 0, -0.42, 0.66);
        gr.addColorStop(0, css(FC.light)); gr.addColorStop(0.55, css(FC.body)); gr.addColorStop(1, css(FC.dark));
        sil(); g.fillStyle = gr; g.fill();
        g.save(); sil(); g.clip();
        if (front) {
          const bg = g.createRadialGradient(0, -0.3, 0.02, 0, -0.26, 0.36); bg.addColorStop(0, css(FC.belly)); bg.addColorStop(1, css(mix3(FC.belly, FC.body, 0.35)));
          g.fillStyle = bg; g.beginPath(); g.ellipse(0, -0.24, 0.32, 0.3, 0, 0, TAU); g.fill();
        } else {
          g.fillStyle = css(FC.spot, 0.55);
          [[-0.2, -0.5, 0.1, 0.065], [0.21, -0.36, 0.12, 0.075], [0.02, -0.22, 0.085, 0.055], [-0.29, -0.28, 0.065, 0.05], [0.12, -0.6, 0.06, 0.045]].forEach(([x, y, a, b]) => { g.beginPath(); g.ellipse(x, y, a, b, 0.3, 0, TAU); g.fill(); });
          g.strokeStyle = css(FC.light, 0.35); g.lineWidth = 0.035; g.lineCap = 'round';
          g.beginPath(); g.moveTo(-0.22, -0.82); g.quadraticCurveTo(-0.3, -0.5, -0.24, -0.2); g.moveTo(0.22, -0.82); g.quadraticCurveTo(0.3, -0.5, 0.24, -0.2); g.stroke();
        }
        g.restore();
        g.save(); sil(); g.clip(); g.strokeStyle = 'rgba(255,255,225,0.4)'; g.lineWidth = 0.05; g.beginPath(); g.ellipse(0.04, -0.66, 0.42, 0.3, 0, Math.PI * 1.08, Math.PI * 1.62); g.stroke(); g.restore();
        return { c, Wd, Ht, U, ox: Wd / 2, oy: Ht - 22 };
      }
      function puffSprite() { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, css(SC.mist, 0.9)); gr.addColorStop(0.5, css(SC.mist, 0.45)); gr.addColorStop(1, css(SC.mist, 0)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c; }
      function vignette() { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(W / 2)); c.height = Math.max(2, Math.round(H / 2)); const g = c.getContext('2d'), gr = g.createRadialGradient(c.width / 2, c.height * 0.48, Math.min(c.width, c.height) * 0.38, c.width / 2, c.height * 0.5, Math.max(c.width, c.height) * 0.78); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,14,50,0.34)'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); return c; }
      SPR.pads = SC.pad.map(padSprite); SPR.flower = flowerSprite(); SPR.frogBack = frogSprite(false); SPR.frogFront = frogSprite(true); SPR.puff = puffSprite();

      /* ---------------- audio: dawn air, water, a slow pad, and a tune the hops play ---------------- */
      const amb = K.ambience('dawn');
      const AU = { live: false, water: null, next: 0, beat: 0, chord: 0, note: 0 };
      function audioStart() {
        if (!A.ctx || AU.live || S.destroyed) return;
        AU.live = true;
        AU.water = A.loop({ pink: true, filter: 'lowpass', freq: 420, q: 0.5, bus: 'amb' });
        AU.next = A.now() + 0.3;
      }
      S.on('audio-ready', audioStart); audioStart();
      S.onDestroy(() => { if (AU.water) AU.water.stop(); });
      function audioTick(t) {
        if (!A.ctx || !AU.live) return;
        const al = Math.round((0.55 + 0.35 * G.sunK) * 50) / 50; if (al !== AU.al) { AU.al = al; amb.level(al, 1.5); }
        const wl = Math.round((0.035 + 0.015 * Math.sin(t * 0.4)) * 400) / 400; if (AU.water && wl !== AU.wl) { AU.wl = wl; AU.water.level(wl, 0.6); }
        const spb = 60 / 70, at = A.now();
        while (AU.next < at + 0.3) {
          const b = AU.beat;
          if (b % 8 === 0) { const ch = CHORDS[AU.chord % CHORDS.length]; ch.forEach((n, i) => A.tone({ when: AU.next + i * 0.04, type: i ? 'sine' : 'triangle', freq: A.note(n), dur: spb * 8.8, vol: (i ? 0.016 : 0.026) * (G.phase === 'finale' ? 1.3 : 1), attack: 1.8, lp: 1300, verb: 0.6, bus: 'music' })); AU.chord++; }
          if (b % 2 === 1 && Math.random() < 0.55) { const f = A.note(['F5', 'A5', 'C6', 'D6', 'G5'][Math.floor(Math.random() * 5)]); A.pluck(f, { when: AU.next + Math.random() * 0.2, vol: 0.022, damp: 0.985, verb: 0.55, bus: 'music' }); }
          AU.next += spb; AU.beat++;
        }
      }
      const sync = (n) => { if (A.ctx) A.sync(n, now()); };
      function sTick(c) { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 240 + c * 520, dur: 0.035, vol: 0.035 + c * 0.02, lp: 2400 }); }
      function sCroak() { if (!A.ctx) return; const t = A.now(); [0, 0.15].forEach((s, si) => { for (let p = 0; p < 4; p++) A.tone({ when: t + s + p * 0.022, type: 'sawtooth', freq: (si ? 200 : 168) - p * 7, dur: 0.028, vol: 0.075, lp: 1300, attack: 0.002 }); }); sync('croak'); }
      function sLaunch(d) { if (!A.ctx) return; A.tone({ type: 'triangle', freq: 210, to: 520 + d * 60, glide: 0.13, dur: 0.2, vol: 0.12 }); A.whoosh({ from: 400, to: 2200, dur: 0.28 + d * 0.04, vol: 0.06 }); A.noise({ filter: 'bandpass', freq: 1600, q: 1.5, dur: 0.06, vol: 0.05 }); sync('hop'); }
      function sLand(kind, imp) {
        if (!A.ctx) return;
        const t = A.now();
        A.noise({ filter: 'lowpass', freq: 1300, to: 300, dur: 0.2, vol: 0.12 + imp * 0.08 });
        A.tone({ type: 'sine', freq: 170, to: 80, glide: 0.12, dur: 0.18, vol: 0.14 * imp + 0.05 });
        for (let i = 0; i < 4; i++) A.tone({ when: t + 0.05 + i * 0.05 + Math.random() * 0.05, type: 'sine', freq: 900 + Math.random() * 1100, to: 1600 + Math.random() * 900, glide: 0.03, dur: 0.05, vol: 0.02 + Math.random() * 0.015 });
        const n = A.note(TUNE[AU.note % TUNE.length]); AU.note++;
        A.pluck(n, { when: t + 0.02, vol: 0.16, damp: 0.993, verb: 0.35 }); A.tone({ when: t + 0.02, type: 'sine', freq: n * 2, dur: 0.5, vol: 0.02, verb: 0.4 });
        if (kind === 'clean') A.chime(n * 1.5, { when: t + 0.1, vol: 0.06, dur: 1.4 });
        if (kind === 'short' || kind === 'long') { A.tone({ when: t + 0.08, type: 'sine', freq: 380, to: 300, glide: 0.1, dur: 0.12, vol: 0.05 }); A.tone({ when: t + 0.22, type: 'sine', freq: 330, to: 420, glide: 0.1, dur: 0.12, vol: 0.05 }); }
        sync('land');
      }
      function sReveal() { if (!A.ctx) return; const t = A.now(); [2093, 2349, 2794, 3136].forEach((f, i) => A.tone({ when: t + i * 0.07, type: 'sine', freq: f, dur: 0.5, vol: 0.016, verb: 0.6 })); A.noise({ filter: 'highpass', freq: 5000, dur: 0.8, attack: 0.3, vol: 0.012 }); sync('reveal'); }
      function sLog() { if (!A.ctx) return; const t = A.now(); A.wood(t, 0.22, 0.5); A.wood(t + 0.09, 0.16, 0.45); A.noise({ pink: true, filter: 'lowpass', freq: 700, to: 300, dur: 0.6, attack: 0.15, vol: 0.06 }); sync('log'); }
      function sFull() { if (!A.ctx) return; A.tone({ type: 'sine', freq: 1568, dur: 0.18, vol: 0.03 }); A.tone({ when: A.now() + 0.06, type: 'sine', freq: 2093, dur: 0.25, vol: 0.03 }); }

      /* ---------------- input: hold to crouch, let go to hop ---------------- */
      function pressStart() {
        audioStart();
        if (G.phase !== 'ready' && G.phase !== 'gapready') return;
        G.phase = 'charge'; G.charge = 0; G.t0 = now(); G.lastTick = 0; G.inClean = false; G.full = false;
        K.guide(null);
        if (A.ctx) A.tone({ type: 'sine', freq: 140, to: 110, glide: 0.1, dur: 0.12, vol: 0.06 });
      }
      function pressEnd() {
        if (G.phase !== 'charge') return;
        const held = now() - G.t0;
        if (held < 130) { // a tap: the frog croaks instead of hopping
          G.phase = PADS[G.at + 1].kind === 'log' ? 'gapready' : 'ready'; G.charge = 0;
          sCroak(); FR.throat = 1; FR.sqv -= 2;
          if (!G.saidTap) { G.saidTap = true; sayFree(rush, { Jolly: 'Ha! That was a ribbit. Hold a bit longer to crouch.', Cheeky: 'Lovely croak. Now hold it down to actually hop.', Unfiltered: 'Hold, then let go.' }, 'laugh', 2600); }
          guideHop(1200);
          return;
        }
        G.charge = clamp(held / CHARGE_MS, 0, 1);
        launch(G.charge);
      }
      K.press(zone, { down: pressStart, up: pressEnd });
      const keyOk = () => { const ae = document.activeElement; return !ae || ae === document.body || el.contains(ae); };
      S.listen(window, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && keyOk() && !G.keyHold && (G.phase === 'ready' || G.phase === 'gapready')) { e.preventDefault(); G.keyHold = true; pressStart(); } });
      S.listen(window, 'keyup', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && G.keyHold) { e.preventDefault(); G.keyHold = false; pressEnd(); } });

      /* ---------------- the hop ---------------- */
      const topOf = (p) => (p.kind === 'log' ? 0.2 : p.kind === 'start' ? 0.15 : p.kind === 'bank' ? 0.1 : 0.03);
      function aim() { const to = PADS[G.at + 1], dx = to.x - FR.x, dz = to.z - FR.z, dd = Math.hypot(dx, dz) || 1; return { to, dd, ux: dx / dd, uz: dz / dd }; }
      const distOf = (c) => MINH + (MAXH - MINH) * c;
      function launch(c) {
        const { to, dd, ux, uz } = aim();
        const want = distOf(c);
        let land = want, kind = 'good';
        const err = want - dd;
        if (to.kind === 'pad') {
          if (Math.abs(err) <= to.r * CLEAN) kind = 'clean';
          else if (Math.abs(err) > to.r * 0.8) { kind = err < 0 ? 'short' : 'long'; land = dd + Math.sign(err) * to.r * 0.82; }
        } else if (to.kind === 'log') { kind = 'log'; land = clamp(want, dd - 1.5, dd + 0.6); }
        else if (to.kind === 'bank') { kind = 'bank'; land = clamp(want, dd - 0.45, dd + 1.0); }
        const x1 = FR.x + ux * land, z1 = FR.z + uz * land;
        if (to.kind === 'log') { // the log meets the frog wherever it commits to land; everything beyond slides to match
          const sx = x1 - to.x, sz = z1 - to.z;
          for (let i = G.at + 1; i < PADS.length; i++) { PADS[i].x += sx; PADS[i].z += sz; }
          for (const o of FARS) if (o.z > to.z - 0.5) o.z += sz;
          to.x = x1; to.z = z1; to.sx = x1 + (x1 >= 0 ? 6.5 : -6.5); to.a = 1; to.arrive = now(); to.coming = true;
          if (WISP) { wisp.classList.add('gone'); }
          sLog();
        }
        const T = 0.44 + 0.075 * land, hgt = 0.4 + 0.27 * land;
        FR.air = { x0: FR.x, z0: FR.z, y0: FR.y, x1, z1, y1: topOf(to) + (to.kind === 'log' ? 0 : 0), t0: now(), T: T * 1000, hgt, kind, to: G.at + 1, err, d: land };
        FR.face = Math.sign(x1 - FR.x) || FR.face;
        G.phase = 'air'; G.charge = 0; tag.classList.remove('on');
        FR.crouch = 0; FR.sq = 1.28; FR.sqv = -3; FR.legs = 1;
        const pad = PADS[G.at]; pad.vy -= 0.5;
        const p0 = (proj(FR.x, topOf(pad), FR.z), { x: PO.x, y: PO.y });
        P.emit('drop', p0.x, p0.y, 8, { colors: ['rgba(220,236,255,0.9)', 'rgba(255,255,255,0.85)'], angle: -Math.PI / 2, spread: 2.4, speed: [50, 150] });
        sLaunch(land); S.buzz(8);
        ctx.track('hop', { n: G.hops + 1, k: Math.round(c * 100) });
      }
      function landNow() {
        const a = FR.air; FR.air = null;
        const to = PADS[a.to];
        FR.x = a.x1; FR.z = a.z1; FR.y = a.y1;
        G.at = a.to; G.hops++;
        const imp = clamp(a.d / 4, 0.45, 1);
        FR.sq = 1 - 0.4 * imp; FR.sqv = 0; FR.legs = 0;
        to.vy -= 1.4 * imp; G.shake = K.reduced() ? 0 : 0.6 + imp * 0.4;
        const kind = a.kind;
        if (to.kind === 'pad') {
          G.judged++;
          if (kind === 'clean') { G.clean++; to.glow = 1; }
          if (kind === 'short' || kind === 'long') { G.wobbles++; FR.wobv = (kind === 'short' ? -1 : 1) * FR.face * 6.5; FR.dangle = kind === 'short' ? 1 : 0; FR.arms = 1; to.tilt = (kind === 'short' ? 0.18 : -0.18); }
        }
        if (to.kind === 'log') { FR.wobv = 4; to.coming = false; }
        // splash and ripples
        proj(FR.x, topOf(to), FR.z);
        const px = PO.x, py = PO.y, big = kind === 'short' || kind === 'long' ? 1.6 : 1;
        P.emit('drop', px, py, Math.round((12 + 10 * imp) * big), { colors: ['rgba(214,232,255,0.95)', 'rgba(255,255,255,0.9)', css(mix3(SC.water[1], [255, 255, 255], 0.5), 0.9)], angle: -Math.PI / 2, spread: 2.8, speed: [60, 210 * imp + 40] });
        RIP.push({ x: FR.x, z: FR.z, t0: now(), r0: to.kind === 'pad' ? to.r * 0.9 : 0.5, life: 1700 }, { x: FR.x, z: FR.z, t0: now() + 180, r0: to.kind === 'pad' ? to.r * 0.7 : 0.35, life: 1500 });
        if (kind === 'clean') P.emit('star', px, py - 10, 10, { colors: ['#fff6c8', '#ffd36b', '#ffffff'], speed: [60, 160] });
        sLand(kind, imp); S.buzz(kind === 'clean' ? [10, 30, 10] : 12);
        setHud();
        ctx.track('land', { n: G.hops, kind });
        if (kind === 'clean') K.pop(G.clean === 1 ? 'Clean!' : ['Clean!', 'Bullseye!', 'Perfect!', 'Clean!'][G.clean % 4], { x: clamp(px, 80, W - 80), y: clamp(py - 96, topSafe() + 30, H - 200), kind: 'great' });
        else if (kind === 'short' || kind === 'long') K.pop(kind === 'short' ? 'Wobble!' : 'Whoa!', { x: clamp(px, 80, W - 80), y: clamp(py - 96, topSafe() + 30, H - 200), kind: 'soft' });
        afterLanding(kind, to);
      }
      async function afterLanding(kind, to) {
        if (to.kind === 'bank') { shoreFinale(); return; }
        G.phase = 'land';
        // reactions (comic timing: they react to what you just did)
        if (to.kind === 'log') say(loopie, { Jolly: 'A log! It wasn’t there until we jumped.', Cheeky: 'The pond delivered a log. Mid-air. Rude not to.', Unfiltered: 'It held.' }, 'wow', 3000);
        else if (kind === 'clean' && !G.saidClean) { G.saidClean = true; say(rush, { Jolly: 'Clean landing! Right in the middle!', Cheeky: 'Bullseye. Show-off.', Unfiltered: 'Clean.' }, 'celebrate', 2200); }
        else if ((kind === 'short' || kind === 'long') && !G.saidWob) { G.saidWob = true; say(loopie, kind === 'short' ? { Jolly: 'Wobbly, but we’re on! The pad caught us.', Cheeky: 'A bit short. The pad caught us anyway.', Unfiltered: 'Short. Still landed.' } : { Jolly: 'Whoa, big hop! Still on.', Cheeky: 'Overachiever. Still landed.', Unfiltered: 'Long. Still landed.' }, 'laugh', 2600); }
        if (to.step) showTag(to);
        await K.wait(kind === 'short' || kind === 'long' ? 950 : 380);
        if (S.destroyed) return;
        if (kind === 'short' || kind === 'long' || to.kind === 'log') await scoot(to);
        FR.dangle = 0; FR.arms = 0; to.tilt = 0;
        revealNext();
      }
      function scoot(to) { // a little shuffle back to the middle of the pad
        return new Promise(res => {
          const x0 = FR.x, z0 = FR.z, x1 = to.x, z1 = to.z, t0 = now(), T = 300;
          if (Math.hypot(x1 - x0, z1 - z0) < 0.05) { res(); return; }
          FR.scoot = { x0, z0, x1, z1, t0, T, res };
          if (A.ctx) A.tone({ type: 'triangle', freq: 300, to: 420, glide: 0.08, dur: 0.1, vol: 0.05 });
        });
      }
      function revealNext() {
        const nx = PADS[G.at + 1];
        if (!nx) return;
        if (nx.kind === 'log') { // the twist: nothing there
          G.phase = 'gapready'; G.zFt = PADS[G.at].z + PADS[G.at].r + 0.35;
          say(loopie, care ? { Jolly: 'There’s no pad there. I can’t see what comes next.', Cheeky: 'Um. There is no next pad.', Unfiltered: 'No pad.' } : { Jolly: 'There’s no pad. What if there’s nothing there?', Cheeky: 'Um. The pond forgot a pad.', Unfiltered: 'No pad. What if there’s nothing?' }, 'worried', 3000);
          S.later(() => { if (G.phase === 'gapready') say(rush, { Jolly: 'Only one way to find out. Hold all the way and leap!', Cheeky: 'Leap-of-faith time. Go big!', Unfiltered: 'Jump anyway. All the way.' }, 'determined', 3200); }, 2400);
          if (WISP) { wisp.classList.add('on'); }
          guideHop(1500);
          return;
        }
        G.phase = 'reveal';
        nx.a = 0.001; nx.rev = now(); G.zFt = nx.kind === 'bank' ? ZEND() + 12 : nx.z + nx.r + 0.45;
        sReveal(); G.dawn = Math.min(0.9, G.dawn + 0.035);
        proj(nx.x, 0.05, nx.z); P.emit('mote', PO.x, PO.y, 8, { colors: ['#fffbe6', css(SC.flower[1])], speed: [10, 40] });
        if (G.hops === 1) S.later(() => say(loopie, { Jolly: 'Oh! Another pad. It shows up when you go.', Cheeky: 'Wait. The pond is making pads as we go?', Unfiltered: 'It appears when you move.' }, 'surprised', 3000), 350);
        if (nx.kind === 'bank') S.later(() => say(rush, { Jolly: 'That’s the far bank! Last hop!', Cheeky: 'Shore ahoy. Bring it home!', Unfiltered: 'Last hop.' }, 'celebrate', 2600), 300);
        S.later(() => { if (G.phase === 'reveal') { G.phase = 'ready'; guideHop(); } }, 650);
      }
      function guideHop(delay) {
        const nx = PADS[G.at + 1]; if (!nx) return;
        const gap = nx.kind === 'log', last = nx.kind === 'bank';
        const label = gap ? 'HOLD ALL THE WAY' : last ? 'LAST HOP' : G.hops === 0 ? 'HOLD, THEN LET GO' : G.hops === 1 ? 'LONGER HOLD, LONGER HOP' : G.wobbles && G.hops === 2 ? 'AIM FOR THE MIDDLE' : 'HOLD AND HOP';
        K.guide({ id: 'hop' + G.hops, g: 'hold', target: () => frogScreen(), label, place: 'below', ms: gap ? 2400 : 1600, delay: delay == null ? (G.hops < 2 ? 500 : 1300) : delay });
      }
      function frogScreen() { proj(FR.x, FR.y + 0.2, FR.z); return { x: PO.x, y: PO.y }; }
      function showTag(p) {
        tag.lastChild.textContent = p.step;
        proj(p.x, 0.5, p.z); tag.style.left = clamp(PO.x, 90, W - 90).toFixed(0) + 'px'; tag.style.top = clamp(PO.y - 70, topSafe() + 60, H - 140).toFixed(0) + 'px';
        tag.classList.add('on'); p.bloomT = now();
        if (A.ctx) { A.chime(A.note('C6'), { vol: 0.05, dur: 1.2 }); A.paper({ vol: 0.06 }); }
        S.later(() => tag.classList.remove('on'), 2300);
        ctx.track('step', {});
      }

      /* ---------------- the finale: the far bank, the mist lifts, the path lights up behind you ---------------- */
      async function shoreFinale() {
        G.phase = 'finale'; K.guide(null); hud.classList.add('off');
        FR.wobv = 0;
        await K.wait(260);
        // walk up the bank a little
        await scoot({ x: FR.x * 0.5, z: ZEND() + 0.4 });
        FR.throat = 1; sCroak(); FR.happy = 1;
        say(loopie, { Jolly: 'We made it! And I never saw the whole path once.', Cheeky: 'Made it. Never saw the path. Not once.', Unfiltered: 'Across.' }, 'celebrate', 3200);
        if (A.ctx) A.noise({ pink: true, filter: 'bandpass', freq: 400, to: 2600, q: 0.6, dur: 3.2, attack: 1.2, vol: 0.1 });
        K.anim(2600, (k) => { G.mist = 1 - k; }, K.ease.inOutSine);
        K.anim(5200, (k) => { G.sunK = k; G.dawn = lerp(G.dawn, 1, k); }, K.ease.inOutSine);
        goal.classList.add('off');
        await K.wait(1200);
        // crane up and back: the whole pond, then light the path from the start to here
        G.crane = { from: Object.assign({}, CAM), to: { x: 0, y: 7.5 + ZEND() * 0.05, z: -10 - ZEND() * 0.1, p: 0.29, yaw: 0 }, t0: now(), T: K.reduced() ? 900 : 2600 };
        await K.wait(K.reduced() ? 1000 : 2400);
        const glowPads = PADS.filter(p => p.kind === 'pad' || p.kind === 'log');
        for (let i = 0; i < glowPads.length; i++) {
          const p = glowPads[i]; p.glow = 1; p.bloomT = now(); G.pathGlow = i;
          if (A.ctx) A.chime(A.note(TUNE[i % TUNE.length]), { vol: 0.07, dur: 1.6 });
          proj(p.x, 0.1, p.z); P.emit('mote', PO.x, PO.y, 5, { colors: ['#fff3c4', '#ffd36b', css(SC.flower[0])], speed: [10, 50] });
          await K.wait(K.reduced() ? 90 : 190);
        }
        const from = glowPads.filter((p, i) => i % 2 === 0).map(p => { proj(p.x, 0.02, p.z); return { x: PO.x, y: PO.y, ok: PO.ok }; }).filter(q => q.ok && q.y > 0 && q.y < H);
        K.finale('ripple', { from, colors: ['#ffe39a', SEASON.flower[0], '#ffffff'], count: Math.min(6, from.length), chord: ['F4', 'A4', 'C5', 'E5'], ms: 3800 });
        say(rush, { Jolly: 'Look back. There was a way across the whole time.', Cheeky: 'The path was there all along. You just had to hop it.', Unfiltered: 'The path was there. You hopped it.' }, 'cool', 3400);
        await K.wait(K.reduced() ? 1200 : 2600);
        // the frog dresses up in what it earned today (tiers celebrate skill, not time)
        const won = tierNow(), wonO = won ? OUTFITS[OUTFITS.findIndex(o => o.tier === won)] : null;
        if (wonO && OUTFITS.findIndex(o => o.id === wonO.id) >= OUTFITS.findIndex(o => o.id === WEAR_NOW)) { WEAR_NOW = wonO.id; G.dressed = wonO; }
        // swoop round to face the frog on the far bank, the lit path behind it
        G.flies = 1;
        G.crane = { from: Object.assign({}, CAM), to: { x: FR.x - 0.1, y: 0.95, z: FR.z + 2.5, p: 0.12, yaw: Math.PI }, t0: now(), T: K.reduced() ? 900 : 2400, front: true };
        await K.wait(K.reduced() ? 900 : 1500);
        FR.front = 1; FR.throat = 1; sCroak();
        if (G.dressed) { P.emit('star', FRS.x, FRS.y - FRS.bw * 1.1, 14, { colors: ['#fff6c8', '#ffd36b', '#ffffff'], speed: [50, 150] }); K.sfx.sparkle(); say(rush, { Jolly: 'Look at you! The ' + G.dressed.name.toLowerCase() + ' suits you.', Cheeky: 'Fancy. The ' + G.dressed.name.toLowerCase() + ' is very you.', Unfiltered: G.dressed.name + '. Earned.' }, 'wow', 2600); }
        await K.wait(900);
        cap.innerHTML = ''; cap.append(document.createTextNode('Couldn’t see the path.'), h('br'), document.createTextNode('Hopped anyway.'), h('small', { text: G.hops + ' hops into the mist · ' + G.clean + ' clean · every one landed' }));
        cap.classList.add('on');
        loopie.base('love'); rush.base('happy');
        await K.wait(3200);
        cap.classList.remove('on');
        showCard();
        await K.wait(3000);
        finish();
      }
      function outfitIcon(id, on) {
        const c = document.createElement('canvas'); c.width = c.height = 68; c.setAttribute('aria-hidden', 'true');
        const g = c.getContext('2d'); g.translate(34, 36); g.globalAlpha = on ? 1 : 0.32;
        if (id === 'leaf') { g.rotate(-0.5); g.fillStyle = '#7cc463'; g.beginPath(); g.moveTo(-20, 0); g.quadraticCurveTo(0, -18, 20, 0); g.quadraticCurveTo(0, 18, -20, 0); g.fill(); g.strokeStyle = '#3e7a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-18, 0); g.lineTo(18, 0); g.stroke(); }
        else if (id === 'scarf') { g.fillStyle = '#e5533d'; g.fillRect(-20, -8, 40, 12); g.fillStyle = '#ffd36b'; g.fillRect(-20, -4, 40, 3); g.fillStyle = '#e5533d'; g.beginPath(); g.moveTo(8, 2); g.lineTo(20, 20); g.lineTo(10, 22); g.lineTo(2, 4); g.fill(); }
        else { g.fillStyle = '#ffd04d'; g.beginPath(); g.moveTo(-18, 10); g.lineTo(-18, -8); g.lineTo(-9, 2); g.lineTo(0, -14); g.lineTo(9, 2); g.lineTo(18, -8); g.lineTo(18, 10); g.closePath(); g.fill(); g.fillStyle = '#ff6b8a'; g.beginPath(); g.arc(0, 3, 3.5, 0, TAU); g.fill(); }
        if (on) c.classList.add('on');
        return c;
      }
      function tierNow() { return K.tier(G.clean / Math.max(1, JUDGED), [0.3, 0.55, 0.85]); }
      function showCard() {
        const tier = tierNow(), have = K.collection(), got = (id) => have.includes('outfit:' + id) || OUTFITS.findIndex(o => o.id === id) <= OUTFITS.findIndex(o => o.tier === tier) && !!tier;
        const best = OUTFITS.filter(o => got(o.id)).pop();
        const next = OUTFITS.find(o => !got(o.id));
        const card = h('div', { class: 'lp-card pre', role: 'status' },
          h('div', { class: 'lp-card-k', text: 'Today · ' + SEASON.name }),
          h('div', { class: 'lp-card-t', text: G.clean + ' clean of ' + JUDGED + ' pads' }),
          h('div', { class: 'lp-card-s', text: best ? 'Your frog wears the ' + best.name + (next ? '. ' + next.name + ' comes with more clean hops.' : '. Every outfit found.') : 'Clean hops earn your frog an outfit for next time.' }),
          h('div', { class: 'lp-row', role: 'img', 'aria-label': 'Outfits: ' + OUTFITS.filter(o => got(o.id)).length + ' of 3' }, OUTFITS.map(o => outfitIcon(o.id, got(o.id)))));
        el.append(card);
        S.later(() => card.classList.remove('pre'), 30);
        K.sfx.paper();
      }
      function finish() {
        if (G.finished) return;
        G.finished = true; G.phase = 'done';
        const badges = [], tier = tierNow();
        const pb = K.best('clean', G.clean, 'higher');
        if (pb.isNew) badges.push('New best: ' + G.clean + ' clean hops'); else if (pb.first) badges.push('First crossing: ' + G.clean + ' clean');
        if (tier) {
          badges.push(tier + ' hopper');
          let fresh = null;
          OUTFITS.slice(0, OUTFITS.findIndex(o => o.tier === tier) + 1).forEach(o => { const r = K.collect('outfit:' + o.id); if (r.isNew) fresh = o; });
          if (fresh) badges.push('New outfit: ' + fresh.name);
        }
        const sc = K.collect('season:' + SEASON.id), seen = sc.items.filter(x => String(x).indexOf('season:') === 0).length;
        badges.push(SEASON.name + ' (' + seen + ' of ' + SEASONS.length + ' seasons)');
        ctx.track('done', { hops: G.hops, clean: G.clean, wob: G.wobbles, season: SEASON.id });
        const step = String(an.tinyStep || '').trim();
        ctx.finish({
          title: 'Made it across', mood: 'celebrate',
          lines: [G.hops + ' hops into the mist, and every one landed', G.clean + ' clean landing' + (G.clean === 1 ? '' : 's') + ' of ' + JUDGED + (G.wobbles ? ' · ' + G.wobbles + ' wobbly but fine' : ''), step ? 'Your next real pad: ' + step : 'The path showed up as you went'],
          share: 'Couldn’t see the path. Hopped anyway. Made it.', badges
        });
      }

      /* ---------------- render ---------------- */
      const SKYC = document.createElement('canvas'); SKYC.width = 1; SKYC.height = 256; const skg = SKYC.getContext('2d');
      const WATC = document.createElement('canvas'); WATC.width = 1; WATC.height = 256; const wag = WATC.getContext('2d');
      let skyKey = '', waterKey = '';
      const GOLD = [255, 206, 150];
      const warm = (c, k) => mix3(c, mix3(c, GOLD, 0.45), k);
      function drawSky(g) {
        const hy = horizonY(), key = Math.round(hy) + ':' + Math.round(G.sunK * 60) + ':' + H;
        if (key !== skyKey) {
          skyKey = key;
          const sk = G.sunK, top = mix3(SC.sky[0], [150, 190, 240], sk * 0.35), mid = warm(SC.sky[1], sk * 0.6), hor = warm(mix3(SC.sky[2], [255, 248, 230], sk * 0.3), sk * 0.5);
          const f = clamp(hy / H, 0.04, 0.98), gr = skg.createLinearGradient(0, 0, 0, 256);
          gr.addColorStop(0, css(top)); gr.addColorStop(f * 0.6, css(mix3(top, mid, 0.75))); gr.addColorStop(f * 0.92, css(mid)); gr.addColorStop(f, css(hor)); gr.addColorStop(1, css(hor));
          skg.fillStyle = gr; skg.fillRect(0, 0, 1, 256);
        }
        g.drawImage(SKYC, 0, 0, W, H);
      }
      const SUN = { x: 0, y: 0, ok: false, r: 0 };
      function drawSun(g, t) {
        proj(-1.5, -9 + 46 * G.sunK, 380);
        SUN.ok = PO.ok; SUN.x = PO.x; SUN.y = PO.y; SUN.r = H * 0.03;
        if (!SUN.ok) return;
        const r = SUN.r;
        g.save(); g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.35 + 0.35 * G.sunK; g.drawImage(K.glowSprite('rgba(255,226,180,0.9)'), SUN.x - r * 12, SUN.y - r * 7, r * 24, r * 14);
        g.globalAlpha = 0.6; g.drawImage(K.glowSprite('rgba(255,244,214,1)'), SUN.x - r * 3.5, SUN.y - r * 3.5, r * 7, r * 7);
        if (G.sunK > 0.05 && !K.reduced()) { // soft rays
          g.globalAlpha = 0.07 * G.sunK; g.fillStyle = '#fff1d0';
          for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.2 + Math.sin(t * 0.2 + i) * 0.03, l = H * 0.9; g.beginPath(); g.moveTo(SUN.x, SUN.y); g.lineTo(SUN.x + Math.cos(a - 0.035) * l, SUN.y + Math.sin(a - 0.035) * l); g.lineTo(SUN.x + Math.cos(a + 0.035) * l, SUN.y + Math.sin(a + 0.035) * l); g.closePath(); g.fill(); }
        }
        g.restore();
        g.fillStyle = 'rgb(255,248,226)'; g.beginPath(); g.arc(SUN.x, SUN.y, r, 0, TAU); g.fill();
      }
      function drawTreeLine(g, list, base) {
        for (const tr of list) {
          proj(tr.x, 0, tr.z); if (!PO.ok || PO.x < -W * 0.4 || PO.x > W * 1.4) continue;
          const k = PO.k, x = PO.x, y = PO.y, hh = tr.h * k, ww = tr.w * k;
          if (!tr.fill) tr.fill = css(mix3(base, [0, 0, 0], tr.d));
          g.fillStyle = tr.fill;
          if (tr.willow) { // a dome with a drooping, ragged hem
            g.beginPath(); g.moveTo(x - ww * 0.62, y - hh * 0.06); g.bezierCurveTo(x - ww * 0.7, y - hh * 0.9, x + ww * 0.7, y - hh * 0.9, x + ww * 0.62, y - hh * 0.06);
            for (let i = 6; i >= 0; i--) g.lineTo(x - ww * 0.62 + ww * 1.24 * i / 6, y - hh * (i % 2 ? 0.12 : 0.02));
            g.closePath(); g.fill();
          } else { g.fillRect(x - ww * 0.05, y - hh * 0.3, ww * 0.1, hh * 0.3); g.beginPath(); for (const b of tr.b) { g.moveTo(x + b[0] * ww + b[2] * ww, y + b[1] * hh); g.ellipse(x + b[0] * ww, y + b[1] * hh, b[2] * ww, b[3] * hh, 0, 0, TAU); } g.fill(); }
        }
      }
      const NEAR = 0.15;
      const CB = [], OB = []; // reusable camera-space buffers for the ground polygons
      function camInto(X, Y, Z, o) { const rx0 = X - CAM.x, ry = Y - CAM.y, rz0 = Z - CAM.z, rx = rx0 * cyw - rz0 * syw, rz = rx0 * syw + rz0 * cyw; o[0] = rx; o[1] = ry * cp + rz * spi; o[2] = -ry * spi + rz * cp; return o; }
      function fillWorld(g, pts) { // a polygon on the ground, clipped at the camera's near plane
        const n = pts.length; let m = 0;
        for (let i = 0; i < n; i++) camInto(pts[i][0], pts[i][1], pts[i][2], CB[i] || (CB[i] = [0, 0, 0]));
        const put = (x, y, z) => { const o = OB[m] || (OB[m] = [0, 0, 0]); o[0] = x; o[1] = y; o[2] = z; m++; };
        for (let i = 0; i < n; i++) { const a = CB[i], b = CB[(i + 1) % n], ain = a[2] > NEAR, bin = b[2] > NEAR; if (ain) put(a[0], a[1], a[2]); if (ain !== bin) { const k = (NEAR - a[2]) / (b[2] - a[2]); put(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR); } }
        if (m < 3) return false;
        g.beginPath(); for (let i = 0; i < m; i++) { const q = OB[i], k = F / q[2], x = W / 2 + q[0] * k, y = CAM.AY - q[1] * k; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); return true;
      }
      function strokeWorld(g, pts) { g.beginPath(); let first = true; for (const q of pts) { proj(q[0], q[1], q[2]); if (!PO.ok) { first = true; continue; } if (first) { g.moveTo(PO.x, PO.y); first = false; } else g.lineTo(PO.x, PO.y); } g.stroke(); }
      const BANK = { key: -1, far: null, farEdge: null, near: null, nearEdge: null };
      function bankShapes() {
        const zE = ZEND() - 0.62; if (BANK.key === zE) return;
        BANK.key = zE;
        BANK.farEdge = []; for (let x = -26; x <= 26; x += 2) BANK.farEdge.push([x, 0.06, zE + Math.sin(x * 0.7) * 0.18 + (Math.abs(x) > 4 ? -0.3 : 0)]);
        BANK.far = BANK.farEdge.concat([[26, 0.06, zE + 16], [-26, 0.06, zE + 16]]);
        BANK.nearEdge = []; for (let x = -26; x <= 26; x += 2) BANK.nearEdge.push([x, 0.08, -1.15 + Math.sin(x * 0.9 + 1) * 0.14 + (Math.abs(x) > 2.5 ? 0.35 : 0)]);
        BANK.near = BANK.nearEdge.slice().reverse().concat([[-26, 0.08, -24], [26, 0.08, -24]]);
      }
      function drawBanks(g) {
        bankShapes();
        if (fillWorld(g, BANK.far)) { g.fillStyle = RC.farBank; g.fill(); }
        g.strokeStyle = RC.farEdge; g.lineWidth = 2; strokeWorld(g, BANK.farEdge);
        if (fillWorld(g, BANK.near)) { g.fillStyle = RC.nearBank; g.fill(); }
        g.strokeStyle = RC.nearEdge; g.lineWidth = 3; strokeWorld(g, BANK.nearEdge);
      }
      function drawSign(g) { // the signpost on the far bank
        SIGN.ok = false;
        if (CAM.yaw > 1) return;
        const sx = PADS[BANKI].x - 1.35, sz = ZEND() + 1.5;
        proj(sx, 0, sz); if (!PO.ok) return;
        const k = PO.k * 0.7, x = PO.x, y = PO.y;
        g.fillStyle = '#6b4a2e'; g.fillRect(x - 0.04 * k, y - 0.9 * k, 0.08 * k, 0.9 * k);
        g.fillStyle = '#d9b483'; g.beginPath(); g.moveTo(x - 0.42 * k, y - 0.95 * k); g.lineTo(x + 0.36 * k, y - 0.95 * k); g.lineTo(x + 0.5 * k, y - 0.8 * k); g.lineTo(x + 0.36 * k, y - 0.65 * k); g.lineTo(x - 0.42 * k, y - 0.65 * k); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(80,50,20,0.5)'; g.lineWidth = Math.max(1, 0.02 * k); g.stroke();
        SIGN.x = x; SIGN.y = y - 1.05 * k; SIGN.ok = true;
      }
      const SIGN = { x: 0, y: 0, ok: false };
      function drawWater(g, t) {
        const hy = horizonY(); if (hy >= H) return;
        const key = Math.round(hy) + ':' + Math.round(G.sunK * 60) + ':' + H;
        if (key !== waterKey) { // still water mirrors the sky: the bright horizon far away, the deeper sky overhead close by
          waterKey = key;
          const sk = G.sunK;
          const far = warm(mix3(SC.sky[2], [255, 252, 240], 0.2 + sk * 0.2), sk * 0.3);
          const mid = warm(mix3(SC.sky[1], SC.water[1], 0.45), sk * 0.25);
          const deep = mix3(mix3(SC.sky[0], SC.water[0], 0.7), [22, 48, 78], Math.max(0, 0.32 - sk * 0.15));
          const gr = wag.createLinearGradient(0, 0, 0, 256);
          gr.addColorStop(0, css(far)); gr.addColorStop(0.035, css(mix3(far, mid, 0.5))); gr.addColorStop(0.16, css(mid)); gr.addColorStop(0.45, css(mix3(mid, deep, 0.55))); gr.addColorStop(1, css(deep));
          wag.fillStyle = gr; wag.fillRect(0, 0, 1, 256);
        }
        const y0 = Math.max(0, hy);
        g.drawImage(WATC, 0, y0, W, H - y0 + 1);
        // the sun's path on the water
        if (SUN.ok && SUN.x > -W * 0.2 && SUN.x < W * 1.2) {
          const pw = Math.max(90, W * 0.3), ph = (H - hy) * 0.95;
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.16 + 0.32 * G.sunK;
          g.drawImage(K.glowSprite('rgba(255,236,200,0.9)'), SUN.x - pw / 2, hy - ph * 0.08, pw, ph); g.restore();
        }
        // slow ripple lines and glints, laid out along wherever the camera looks
        const fx = syw, fz = cyw, rx = cyw, rz = -syw;
        g.strokeStyle = css(mix3(SC.sky[2], [255, 255, 255], 0.45)); g.lineWidth = 1;
        for (const l of WL) {
          const d = 1.6 + ((l.z + t * 0.06) % 30), lat = l.x * (0.4 + d * 0.13) + Math.sin(t * 0.3 + l.ph) * 0.2;
          proj(CAM.x + fx * d + rx * lat, 0, CAM.z + fz * d + rz * lat); if (!PO.ok || PO.y < hy + 2) continue;
          const w = l.len * PO.k; if (w < 2) continue;
          g.globalAlpha = clamp(0.05 + 0.2 * (1 - d / 32), 0, 0.25); g.beginPath(); g.moveTo(PO.x - w / 2, PO.y); g.lineTo(PO.x + w / 2, PO.y); g.stroke();
        }
        g.fillStyle = 'rgba(255,250,236,0.9)';
        for (const q of GLINT) {
          const d = 2 + Math.pow(q.z, 1.6) * 38, lat = q.x * (1.5 + d * 0.25);
          proj(CAM.x + fx * d + rx * lat, 0, CAM.z + fz * d + rz * lat); if (!PO.ok) continue;
          const xx = PO.x + (SUN.ok ? (SUN.x - W / 2) * 0.3 * q.z : 0);
          const a = (0.22 + 0.6 * G.sunK) * (0.5 + 0.5 * Math.sin(t * 2.2 + q.ph)) * (SUN.ok && Math.abs(xx - SUN.x) < W * 0.22 ? 1 : 0.3);
          if (a < 0.06 || PO.y < hy + 1) continue;
          const w = Math.max(1, q.w * PO.k * 0.12);
          g.globalAlpha = Math.min(1, a); g.fillRect(xx - w / 2, PO.y, w, Math.max(0.8, PO.k * 0.012));
        }
        g.globalAlpha = 1;
      }
      function drawStone(g, p) { // the frog's starting stone at the water's edge
        ell(p.x, 0, p.z, p.r); if (!E.ok) return;
        const ht = 0.15 * E.k, top = E.cy - ht;
        g.fillStyle = 'rgba(20,30,50,0.28)'; g.beginPath(); g.ellipse(E.cx, E.cy + E.ry * 0.25, E.rx * 1.12, E.ry * 1.15, 0, 0, TAU); g.fill();
        g.fillStyle = '#5f6b6c'; g.beginPath(); g.ellipse(E.cx, E.cy - ht * 0.45, E.rx, E.ry + ht * 0.55, 0, 0, TAU); g.fill();
        g.fillStyle = '#8b9792'; g.beginPath(); g.ellipse(E.cx, top + E.ry * 0.1, E.rx * 0.9, E.ry * 0.86, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(108,160,84,0.9)'; g.beginPath(); g.ellipse(E.cx - E.rx * 0.35, top + E.ry * 0.05, E.rx * 0.4, E.ry * 0.42, 0.2, 0, TAU); g.ellipse(E.cx + E.rx * 0.42, top + E.ry * 0.3, E.rx * 0.24, E.ry * 0.3, -0.2, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(E.cx, top + E.ry * 0.1, E.rx * 0.86, E.ry * 0.8, 0, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
      }
      function drawFloaters(g, t) {
        for (const f of FLOAT) {
          const x = f.x + Math.sin(t * 0.2 + f.rot) * 0.15;
          proj(x, 0.01, f.z); if (!PO.ok || PO.y < horizonY() || f.z > G.zF + 0.5 && G.mist > 0.5) continue;
          const s = f.s * PO.k; if (s < 0.6) continue;
          g.fillStyle = SEASON.floatCol[f.c]; g.save(); g.translate(PO.x, PO.y); g.scale(1, 0.4); g.rotate(f.rot + t * 0.05);
          if (SEASON.float === 'leaf') { g.beginPath(); g.moveTo(-s, 0); g.quadraticCurveTo(0, -s * 0.8, s, 0); g.quadraticCurveTo(0, s * 0.8, -s, 0); g.fill(); }
          else { g.beginPath(); g.ellipse(0, 0, s, s * 0.6, 0, 0, TAU); g.fill(); }
          g.restore();
        }
      }
      function drawRipples(g, tn) {
        g.lineWidth = 1.5;
        for (let i = RIP.length - 1; i >= 0; i--) {
          const r = RIP[i], k = (tn - r.t0) / r.life; if (k < 0) continue; if (k >= 1) { RIP.splice(i, 1); continue; }
          const rr = r.r0 + k * (r.small ? 0.32 : 1.6); ell(r.x, 0.005, r.z, rr); if (!E.ok) continue;
          g.strokeStyle = 'rgba(255,255,255,' + ((r.small ? 0.4 : 0.55) * (1 - k)).toFixed(3) + ')';
          g.beginPath(); g.ellipse(E.cx, E.cy, E.rx, E.ry, 0, 0, TAU); g.stroke();
        }
      }
      function drawPad(g, p, t) {
        if (p.a <= 0.005) return;
        if (p.kind === 'log') { drawLog(g, p, t); return; }
        if (p.kind === 'start') { drawStone(g, p); return; }
        if (p.kind !== 'pad') return;
        const bob = p.dy + Math.sin(t * 1.3 + p.rot * 3) * 0.008 - (1 - p.a) * 0.08;
        ell(p.x, bob, p.z, p.r); if (!E.ok) return;
        g.globalAlpha = p.a;
        g.fillStyle = RC.padShadow; g.beginPath(); g.ellipse(E.cx, E.cy + E.ry * 0.18, E.rx * 1.05, E.ry * 1.08, 0, 0, TAU); g.fill();
        g.save(); g.translate(E.cx, E.cy); g.scale(E.rx, E.ry); g.rotate(p.rot); g.drawImage(SPR.pads[p.v], -1, -1, 2, 2); g.restore();
        if (G.phase === 'charge' && PADS[G.at + 1] === p) { // the clean zone, softly marked
          g.strokeStyle = 'rgba(255,214,110,' + (0.55 + 0.25 * Math.sin(t * 6)).toFixed(3) + ')'; g.lineWidth = 2; g.setLineDash([5, 5]);
          g.beginPath(); g.ellipse(E.cx, E.cy, E.rx * CLEAN, E.ry * CLEAN, 0, 0, TAU); g.stroke(); g.setLineDash([]);
        }
        if (p.glow > 0.01) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = p.glow * 0.55 * p.a; g.drawImage(K.glowSprite('rgba(255,224,150,0.9)'), E.cx - E.rx * 1.7, E.cy - E.ry * 1.9, E.rx * 3.4, E.ry * 3.8); g.restore(); }
        if (p.flower) {
          const fa = p.rot + 2.2, fx = p.x + Math.cos(fa) * p.r * 0.45 + p.fx * 0.1, fz = p.z + Math.sin(fa) * p.r * 0.45;
          proj(fx, bob, fz);
          if (PO.ok) {
            const bk = p.bloomT ? clamp((now() - p.bloomT) / 700, 0, 1) : 0, open = p.step ? 0.35 + 0.65 * K.ease.outBack(bk) : 1;
            const fw = 0.34 * PO.k * (0.55 + 0.45 * open), fh = 0.27 * PO.k * (0.8 + 0.2 * open);
            g.drawImage(SPR.flower, PO.x - fw / 2, PO.y - fh * 0.85, fw, fh);
          }
        }
        g.globalAlpha = 1;
      }
      function drawLog(g, p, t) {
        let x = p.x;
        if (p.coming) { const k = clamp((now() - p.arrive) / (FR.air ? FR.air.T * 0.86 : 1), 0, 1); x = lerp(p.sx, p.x, K.ease.outCubic(k)); }
        const y = 0.06 + p.dy + Math.sin(t * 1.1) * 0.012, L = p.r;
        proj(x - L, y, p.z); if (!PO.ok) return; const ax = PO.x, ay = PO.y, k1 = PO.k;
        proj(x + L, y, p.z); if (!PO.ok) return; const bx = PO.x, by = PO.y, k2 = PO.k;
        const rad = 0.16 * (k1 + k2) / 2;
        g.fillStyle = 'rgba(30,40,70,0.25)'; g.beginPath(); g.ellipse((ax + bx) / 2, (ay + by) / 2 + rad * 0.6, Math.abs(bx - ax) / 2 + rad, rad * 0.55, 0, 0, TAU); g.fill();
        const gr = g.createLinearGradient(0, ay - rad, 0, ay + rad); gr.addColorStop(0, '#a77a52'); gr.addColorStop(0.45, '#7b5434'); gr.addColorStop(1, '#4a301c');
        g.fillStyle = gr; g.beginPath(); g.moveTo(ax, ay - rad); g.lineTo(bx, by - rad); g.lineTo(bx, by + rad); g.lineTo(ax, ay + rad); g.closePath(); g.fill();
        g.beginPath(); g.ellipse(ax, ay, rad * 0.42, rad, 0, Math.PI / 2, Math.PI * 1.5); g.fill();
        g.strokeStyle = 'rgba(40,24,10,0.45)'; g.lineWidth = Math.max(1, rad * 0.08);
        for (let i = 0; i < 5; i++) { const yy = ay - rad * 0.6 + i * rad * 0.3, o = (i * 37) % 23; g.beginPath(); g.moveTo(ax + (bx - ax) * (0.08 + o / 200), yy); g.lineTo(ax + (bx - ax) * (0.55 + o / 120), yy + rad * 0.04); g.stroke(); }
        g.fillStyle = '#e2c08e'; g.beginPath(); g.ellipse(bx, by, rad * 0.42, rad, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(120,80,40,0.6)'; g.lineWidth = 1; for (let r = 0.3; r < 1; r += 0.25) { g.beginPath(); g.ellipse(bx, by, rad * 0.42 * r, rad * r, 0, 0, TAU); g.stroke(); }
        g.fillStyle = 'rgba(70,110,60,0.85)'; g.beginPath(); g.ellipse(ax + (bx - ax) * 0.3, ay - rad * 0.9, rad * 0.5, rad * 0.18, -0.2, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse((ax + bx) / 2, (ay + by) / 2 + rad * 0.85, Math.abs(bx - ax) / 2 + rad * 0.6, rad * 0.3, 0, 0, Math.PI); g.stroke();
        if (p.coming) { proj(x + (p.sx > p.x ? L : -L), 0.02, p.z); if (PO.ok && Math.random() < 0.5) P.emit('drop', PO.x, PO.y, 1, { colors: ['rgba(255,255,255,0.8)'], angle: -Math.PI / 2, spread: 1.4, speed: [20, 60] }); }
      }
      function drawReed(g, rd, t) {
        proj(rd.x, 0, rd.z); if (!PO.ok || PO.x < -60 || PO.x > W + 60) return;
        const k = PO.k, x = PO.x, y = PO.y, hh = rd.h * k; if (hh < 2) return;
        const col = rd.grass ? RC.grass : RC.reed, dk = rd.grass ? RC.grassDk : RC.reedDk, sway = Math.sin(t * 0.9 + rd.ph) * (rd.grass ? 0.12 : 0.06) * hh;
        g.lineCap = 'round';
        for (let i = 0; i < rd.n; i++) {
          const o = (i - (rd.n - 1) / 2) * 0.06 * k, lean = (i - (rd.n - 1) / 2) * 0.1 * hh, hi = hh * (0.7 + 0.3 * ((i * 7 + 3) % 5) / 4);
          g.strokeStyle = i % 2 ? dk : col; g.lineWidth = Math.max(1, (rd.grass ? 0.02 : 0.028) * k);
          g.beginPath(); g.moveTo(x + o, y); g.quadraticCurveTo(x + o + lean * 0.3, y - hi * 0.6, x + o + lean + sway, y - hi); g.stroke();
          if (rd.cat && i === 1) { g.strokeStyle = '#6b4226'; g.lineWidth = Math.max(2, 0.07 * k); g.beginPath(); g.moveTo(x + o + lean * 0.8 + sway * 0.8, y - hi * 0.82); g.lineTo(x + o + lean * 0.95 + sway * 0.95, y - hi * 0.98); g.stroke(); }
        }
      }
      function drawFrog(g) {
        let gy = FR.y, fx = FR.x, fz = FR.z, lift = 0;
        if (FR.air) { const a = FR.air, k = clamp((now() - a.t0) / a.T, 0, 1); fx = lerp(a.x0, a.x1, k); fz = lerp(a.z0, a.z1, k); gy = lerp(a.y0, a.y1, k); lift = 4 * a.hgt * k * (1 - k); }
        if (FR.scoot) { const s = FR.scoot, k = clamp((now() - s.t0) / s.T, 0, 1); fx = lerp(s.x0, s.x1, k); fz = lerp(s.z0, s.z1, k); lift = 0.12 * Math.sin(Math.PI * k); }
        const padNow = PADS[G.at], bob = !FR.air && padNow ? padNow.dy : 0;
        // shadow on the water (or the pad)
        proj(fx, (FR.air ? 0.01 : gy + bob) + 0.001, fz);
        if (!PO.ok) return;
        const k = PO.k, sh = 1 / (1 + lift * 1.4);
        g.fillStyle = 'rgba(20,30,50,' + (0.28 * sh).toFixed(3) + ')'; g.beginPath(); g.ellipse(PO.x, PO.y, FW * 0.62 * k * sh, FW * 0.2 * k * sh, 0, 0, TAU); g.fill();
        proj(fx, gy + bob + lift, fz);
        const x = PO.x, y = PO.y + (G.shake > 0 ? G.shake * 2 : 0), bw = FW * PO.k;
        frogAt(g, x, y, bw);
        FRS.x = x; FRS.y = y; FRS.bw = bw;
      }
      const FRS = { x: 0, y: 0, bw: 40 };
      function frogAt(g, x, y, bw) {
        const front = FR.front > 0.5, face = FR.face, t = now() / 1000;
        const quiv = FR.quiver ? Math.sin(t * 70) * 0.012 : 0;
        const sq = FR.sq, sxs = (1 / Math.sqrt(Math.max(0.4, sq))) * (1 + FR.crouch * 0.16), sys = sq * (1 - FR.crouch * 0.24);
        g.save(); g.translate(x + quiv * bw, y); g.rotate(FR.wob); g.scale(bw * sxs, bw * sys);
        const body = RC.body, dark = RC.dark, foot = RC.foot;
        const legsOut = FR.legs, dang = FR.dangle;
        const drawLegs = () => {
          for (const sd of [-1, 1]) {
            if (legsOut > 0.05 || dang > 0.05) { // legs stretched out behind (or dangling into the water)
              const kick = dang ? Math.sin(t * 22 + sd) * 0.08 : 0, ext = Math.max(legsOut, dang);
              g.strokeStyle = dark; g.lineCap = 'round'; g.lineWidth = 0.13;
              g.beginPath(); g.moveTo(sd * 0.3, -0.16); g.quadraticCurveTo(sd * 0.5, 0.05 + ext * 0.1, sd * (0.36 + kick), 0.2 + ext * 0.32); g.stroke();
              g.fillStyle = foot; g.beginPath(); g.ellipse(sd * (0.38 + kick), 0.26 + ext * 0.34, 0.11, 0.06, sd * 0.4, 0, TAU); g.fill();
            }
            g.fillStyle = dark; g.beginPath(); g.ellipse(sd * (0.38 + FR.crouch * 0.05), -0.16, 0.24 + FR.crouch * 0.04, 0.17, sd * -0.3, 0, TAU); g.fill();
            g.fillStyle = body; g.beginPath(); g.ellipse(sd * (0.36 + FR.crouch * 0.05), -0.19, 0.2, 0.13, sd * -0.3, 0, TAU); g.fill();
            if (legsOut < 0.5 && dang < 0.5) { g.fillStyle = foot; for (let i = -1; i <= 1; i++) { g.beginPath(); g.ellipse(sd * (0.6 + Math.abs(i) * 0.02), -0.02 + i * 0.045, 0.07, 0.03, sd * (0.3 + i * 0.4), 0, TAU); g.fill(); } }
          }
        };
        if (front) drawLegs();
        const sp = front ? SPR.frogFront : SPR.frogBack;
        g.drawImage(sp.c, -sp.ox / sp.U, -sp.oy / sp.U, sp.Wd / sp.U, sp.Ht / sp.U);
        if (!front) drawLegs();
        // little hands
        g.fillStyle = foot;
        const arm = FR.arms ? Math.sin(t * 18) * 0.12 : 0;
        if (front) { for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 0.2, -0.03, 0.08, 0.04, 0, 0, TAU); g.fill(); } }
        else for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 0.47, -0.08 - (FR.arms ? 0.12 + arm * sd : 0), 0.06, 0.035, sd * 0.5, 0, TAU); g.fill(); }
        // throat sac (a croak)
        if (FR.throat > 0.02 && front) { const r = 0.17 * FR.throat; g.fillStyle = 'rgba(250,240,190,0.95)'; g.beginPath(); g.arc(0, -0.5 + r * 0.4, r, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(-r * 0.35, -0.5, r * 0.3, 0, TAU); g.fill(); }
        // face
        if (front) {
          g.strokeStyle = '#1f3a24'; g.lineWidth = 0.028; g.lineCap = 'round';
          g.beginPath(); g.moveTo(-0.26, -0.62); g.quadraticCurveTo(0, -0.5 + (FR.happy ? 0.02 : 0), 0.26, -0.62); g.stroke();
          g.fillStyle = 'rgba(255,140,150,0.55)'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 0.3, -0.62, 0.07, 0.04, 0, 0, TAU); g.fill(); }
        } else {
          g.strokeStyle = '#24452b'; g.lineWidth = 0.026; g.lineCap = 'round';
          g.beginPath(); g.moveTo(face * 0.2, -0.62); g.quadraticCurveTo(face * 0.33, -0.6, face * 0.4, -0.67); g.stroke();
          g.fillStyle = 'rgba(255,140,150,0.5)'; g.beginPath(); g.ellipse(face * 0.36, -0.62, 0.05, 0.03, 0, 0, TAU); g.fill();
        }
        // eyes on top of the head, with lids that blink
        const blink = FR.blink;
        const eye = (ex, ey, r, front2, near) => {
          g.fillStyle = body; g.beginPath(); g.arc(ex, ey + r * 0.15, r * 1.12, 0, TAU); g.fill();
          g.fillStyle = '#fbfbf2'; g.beginPath(); g.arc(ex, ey, r, 0, TAU); g.fill();
          const wide = FR.arms ? 0.7 : 1;
          if (front2) { g.fillStyle = '#1b2230'; g.beginPath(); g.ellipse(ex, ey + r * 0.08, r * 0.52 * wide, r * 0.6 * wide, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - r * 0.2, ey - r * 0.18, r * 0.2, 0, TAU); g.fill(); }
          else if (near) { g.fillStyle = '#1b2230'; g.beginPath(); g.ellipse(ex + face * r * 0.62, ey - r * 0.12, r * 0.26 * wide, r * 0.5 * wide, 0, 0, TAU); g.fill(); }
          if (blink > 0.02) { g.fillStyle = RC.light; g.beginPath(); g.ellipse(ex, ey - r * (1 - blink), r * 1.02, r * blink * 1.02, 0, 0, TAU); g.fill(); }
          g.strokeStyle = 'rgba(30,60,30,0.35)'; g.lineWidth = 0.02; g.beginPath(); g.arc(ex, ey, r, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        };
        if (front) { eye(-0.22, -0.9, 0.15, true); eye(0.22, -0.9, 0.15, true); }
        else { eye(-face * 0.19, -0.9, 0.13, false, false); eye(face * 0.25, -0.89, 0.155, false, true); }
        // outfit
        const wear = WEAR_NOW;
        if (wear === 'leaf') { g.save(); g.translate(-0.03, -1.1); g.rotate(-0.4); g.fillStyle = '#86cf62'; g.beginPath(); g.moveTo(-0.24, 0); g.quadraticCurveTo(0, -0.2, 0.24, 0); g.quadraticCurveTo(0, 0.2, -0.24, 0); g.fill(); g.strokeStyle = '#3e7a3a'; g.lineWidth = 0.025; g.beginPath(); g.moveTo(-0.22, 0); g.lineTo(0.3, 0); g.stroke(); g.restore(); }
        else if (wear === 'scarf') { const sy0 = front ? -0.3 : -0.5; g.fillStyle = '#e5533d'; g.beginPath(); g.ellipse(0, sy0, 0.42, 0.075, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd36b'; g.fillRect(-0.36, sy0 - 0.015, 0.72, 0.022); const wv = Math.sin(t * 6) * 0.04, sd = front ? 1 : -face; g.fillStyle = '#e5533d'; g.beginPath(); g.moveTo(sd * 0.3, sy0); g.quadraticCurveTo(sd * 0.5, sy0 + 0.14 + wv, sd * 0.62, sy0 + 0.28 + wv); g.lineTo(sd * 0.52, sy0 + 0.3 + wv); g.quadraticCurveTo(sd * 0.4, sy0 + 0.14, sd * 0.22, sy0 + 0.04); g.fill(); }
        else if (wear === 'crown') { g.fillStyle = '#ffd04d'; g.beginPath(); g.moveTo(-0.16, -1.07); g.lineTo(-0.16, -1.23); g.lineTo(-0.08, -1.14); g.lineTo(0, -1.27); g.lineTo(0.08, -1.14); g.lineTo(0.16, -1.23); g.lineTo(0.16, -1.07); g.closePath(); g.fill(); g.strokeStyle = 'rgba(150,100,0,0.5)'; g.lineWidth = 0.015; g.stroke(); g.fillStyle = '#ff6b8a'; g.beginPath(); g.arc(0, -1.11, 0.028, 0, TAU); g.fill(); }
        g.restore();
      }
      let WEAR_NOW = WEAR;
      function drawMarker(g, t) {
        if (G.phase !== 'charge') return;
        const { to, dd, ux, uz } = aim(), d = distOf(G.charge), lx = FR.x + ux * d, lz = FR.z + uz * d;
        const gapK = to.kind === 'log' ? clamp(1 - (lz - G.zF) / 1.4, 0, 1) : 1;
        let col = [190, 220, 255];
        if (to.kind === 'pad') { const err = Math.abs(d - dd); col = err <= to.r * CLEAN ? [255, 214, 110] : err <= to.r * 0.8 ? [255, 255, 255] : [190, 220, 255]; }
        // the arc
        const hgt = 0.4 + 0.27 * d;
        g.fillStyle = css(col, 0.85 * gapK + 0.15);
        for (let i = 1; i < 14; i++) {
          const k = i / 14, x = lerp(FR.x, lx, k), z = lerp(FR.z, lz, k), y = lerp(FR.y, 0.03, k) + 4 * hgt * k * (1 - k);
          proj(x, y, z); if (!PO.ok) continue;
          const fade = to.kind === 'log' ? clamp(1 - (z - G.zF) / 1.2, 0.12, 1) : 1;
          g.globalAlpha = fade; g.beginPath(); g.arc(PO.x, PO.y, Math.max(1.6, PO.k * 0.025), 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
        // the landing ring
        ell(lx, 0.02, lz, 0.2 + 0.03 * Math.sin(t * 9)); if (E.ok) {
          g.strokeStyle = css(col, 0.95 * gapK + 0.05); g.lineWidth = 3; g.beginPath(); g.ellipse(E.cx, E.cy, E.rx, E.ry, 0, 0, TAU); g.stroke();
          g.globalAlpha = 0.5 * gapK; g.beginPath(); g.ellipse(E.cx, E.cy, E.rx * 0.45, E.ry * 0.45, 0, 0, TAU); g.stroke(); g.globalAlpha = 1;
        }
      }
      function drawMistBand(g) {
        if (G.mist < 0.01) return;
        const hy = horizonY();
        proj(0, 0, G.zF); const yF = PO.ok ? Math.min(H, PO.y) : H;
        proj(0, 0, G.zF + 2.6); const y2 = PO.ok ? Math.min(yF, PO.y) : yF;
        const top = hy - H * 0.08; if (yF <= top) return;
        const gr = g.createLinearGradient(0, yF, 0, top), m = G.mist, span = yF - top;
        const warmMist = mix3(SC.mist, SC.sky[2], 0.55);
        gr.addColorStop(0, css(SC.mist, 0)); gr.addColorStop(clamp((yF - y2) / span, 0.01, 0.9), css(SC.mist, 0.88 * m)); gr.addColorStop(clamp((yF - hy) / span, 0.02, 0.97), css(warmMist, 0.62 * m)); gr.addColorStop(1, css(warmMist, 0));
        g.fillStyle = gr; g.fillRect(0, top, W, span);
        if (SUN.ok) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.2 * m; g.drawImage(K.glowSprite('rgba(255,214,170,0.9)'), SUN.x - W * 0.6, hy - H * 0.14, W * 1.2, H * 0.3); g.restore(); }
      }
      function drawPuffs(g, t, far) {
        if (G.mist < 0.01) return;
        g.save();
        const list = far ? PUFF : LOW;
        for (const q of list) {
          const xr = q.x + t * q.v * 0.6 + Math.sin(t * q.v * 2 + q.ph) * 0.8, x = ((xr + 9) % 18 + 18) % 18 - 9, z = far ? G.zF + q.dz : G.zF - q.dz, y = q.y;
          proj(CAM.x + x, y, z); if (!PO.ok) continue;
          const s = q.s * PO.k, a = (far ? 0.55 : 0.16) * G.mist * (far ? 1 : clamp(1 - q.dz / 6, 0, 1));
          if (a < 0.01 || s < 4) continue;
          g.globalAlpha = a; g.drawImage(SPR.puff, PO.x - s, PO.y - s * 0.42, s * 2, s * 0.84);
        }
        g.restore();
      }
      function drawFlies(g, t) {
        if (G.flies < 0.01 && !(SEASON.flies && G.hops >= 3)) return;
        const cx = G.flies > 0.01 ? FR.x : (PADS[Math.min(PADS.length - 1, G.at + 1)] || FR).x, cz = G.flies > 0.01 ? FR.z : (PADS[Math.min(PADS.length - 1, G.at + 1)] || FR).z;
        for (let i = 0; i < (G.flies > 0.01 ? FLIES.length : 1); i++) {
          const f = FLIES[i], a = f.a + t * f.w, x = cx + Math.cos(a) * f.r, z = cz + Math.sin(a) * f.r * 0.6, y = f.h + Math.sin(t * 2.3 + f.ph) * 0.12;
          proj(x, y, z); if (!PO.ok) continue;
          const k = PO.k, L = 0.16 * k, dir = Math.sign(Math.cos(a + Math.PI / 2) * f.w) || 1;
          if (!f.s1) { f.s1 = css(f.c); f.s2 = css(mix3(f.c, [255, 255, 255], 0.3)); }
          g.strokeStyle = f.s1; g.lineWidth = Math.max(1.4, 0.022 * k); g.lineCap = 'round';
          g.beginPath(); g.moveTo(PO.x - dir * L * 0.5, PO.y); g.lineTo(PO.x + dir * L * 0.5, PO.y); g.stroke();
          g.fillStyle = f.s2; g.beginPath(); g.arc(PO.x + dir * L * 0.55, PO.y, Math.max(1.4, 0.022 * k), 0, TAU); g.fill();
          const flap = Math.sin(t * 60 + f.ph) * 0.4;
          g.fillStyle = 'rgba(230,245,255,0.55)';
          for (const s of [-1, 1]) { g.beginPath(); g.ellipse(PO.x + dir * L * 0.2, PO.y + s * L * 0.18 * (0.6 + flap * 0.4), L * 0.32, L * 0.09, s * 0.3, 0, TAU); g.fill(); g.beginPath(); g.ellipse(PO.x, PO.y + s * L * 0.16 * (0.6 - flap * 0.4), L * 0.28, L * 0.08, -s * 0.2, 0, TAU); g.fill(); }
        }
      }

      /* ---------------- the frame ---------------- */
      let lastT = 0, ready = false;
      const DRAW = [], DP = []; let nDP = 0;
      const byDepth = (a, b) => b.d - a.d;
      function addDraw(d, o, k) { const r = DP[nDP] || (DP[nDP] = { d: 0, o: null, k: 0 }); nDP++; r.d = d; r.o = o; r.k = k; DRAW.push(r); }
      K.loop((cdt, t) => {
        const g = cv.g; if (!g || !ready) return;
        const tn = now(), rdt = clamp(lastT ? (tn - lastT) / 1000 : cdt, 0.001, 0.1); lastT = tn;
        // charge
        if (G.phase === 'charge') {
          G.charge = clamp((tn - G.t0) / CHARGE_MS, 0, 1);
          FR.crouch = Math.min(1, G.charge * 1.1); FR.quiver = G.charge >= 1 && !K.reduced() ? 1 : 0;
          if (tn - G.lastTick > 85 - G.charge * 30) { G.lastTick = tn; sTick(G.charge); }
          if (G.charge >= 1 && !G.full) { G.full = true; sFull(); }
          const { to, dd } = aim();
          if (to.kind === 'pad') { const inC = Math.abs(distOf(G.charge) - dd) <= to.r * CLEAN; if (inC && !G.inClean && A.ctx) A.tone({ type: 'sine', freq: 1760, dur: 0.08, vol: 0.03 }); G.inClean = inC; }
        } else { FR.crouch += (0 - FR.crouch) * Math.min(1, rdt * 14); FR.quiver = 0; }
        // flight
        if (FR.air && tn - FR.air.t0 >= FR.air.T) landNow();
        if (FR.scoot && tn - FR.scoot.t0 >= FR.scoot.T) { const s = FR.scoot; FR.scoot = null; FR.x = s.x1; FR.z = s.z1; FR.sq = 0.85; s.res(); }
        if (FR.air) { const k = (tn - FR.air.t0) / FR.air.T; FR.legs = k < 0.55 ? 1 : Math.max(0, 1 - (k - 0.55) * 3); FR.sq += ((k < 0.5 ? 1.18 : 0.96) - FR.sq) * Math.min(1, rdt * 10); }
        // springs: squash, wobble, pads bobbing
        const n = Math.max(1, Math.ceil(rdt * 120)), h2 = rdt / n;
        for (let i = 0; i < n; i++) {
          if (!FR.air) { FR.sqv += (-(FR.sq - 1) * 170 - FR.sqv * 11) * h2; FR.sq += FR.sqv * h2; }
          FR.wobv += (-FR.wob * 46 - FR.wobv * 3.6) * h2; FR.wob += FR.wobv * h2;
          for (let j = Math.max(0, G.at - 2); j < Math.min(PADS.length, G.at + 3); j++) { const p = PADS[j]; p.vy += (-p.dy * 80 - p.vy * 6.5) * h2; p.dy += p.vy * h2; }
        }
        FR.wob = clamp(FR.wob, -0.6, 0.6);
        FR.throat = Math.max(0, FR.throat - rdt * 1.6);
        if (tn > FR.nb) { FR.blink = 1; FR.nb = tn + 2200 + Math.random() * 2600; }
        FR.blink = Math.max(0, FR.blink - rdt * 7);
        G.shake = Math.max(0, G.shake - rdt * 5);
        // pads fading in from the mist; the mist edge following
        for (const p of PADS) { if (p.a > 0 && p.a < 1 && p.kind !== 'log') p.a = Math.min(1, p.a + rdt * 1.6); p.glow = G.phase === 'finale' || G.phase === 'done' ? p.glow : Math.max(0, p.glow - rdt * 0.8); }
        if (FR.air && PADS[FR.air.to].kind === 'log') G.zFt = Math.max(G.zFt, PADS[FR.air.to].z + 0.6);
        // today's weather: soft rain rings on the water, or a little snow
        if (SEASON.rain && G.phase !== 'done' && RIP.length < 40 && Math.random() < rdt * 16) { const d = 1.5 + Math.random() * 13, lat = (Math.random() - 0.5) * 7; RIP.push({ x: CAM.x + syw * d + cyw * lat, z: CAM.z + cyw * d - syw * lat, t0: tn, r0: 0.03, life: 900, small: true }); }
        if (SEASON.float === 'snow' && Math.random() < rdt * 9) P.emit('snow', Math.random() * W, -8, 1, { speed: [10, 30] });
        G.zF += (G.zFt - G.zF) * Math.min(1, rdt * 2.2);
        // camera
        if (G.crane) {
          const c = G.crane, k = K.ease.inOutCubic(clamp((tn - c.t0) / c.T, 0, 1));
          ['x', 'y', 'z', 'p', 'yaw'].forEach(key => { CAM[key] = lerp(c.from[key], c.to[key], k); });
          if (c.front && k > 0.55) FR.front = 1;
        } else {
          let fx = FR.x, fz = FR.z;
          if (FR.air) { const a = FR.air, k = smooth(clamp((tn - a.t0) / a.T, 0, 1)); fx = lerp(a.x0, a.x1, k); fz = lerp(a.z0, a.z1, k); }
          const nx = PADS[G.at + 1] && PADS[G.at + 1].a > 0.3 ? PADS[G.at + 1].x : fx;
          CT.x = fx * 0.55 + nx * 0.3; CT.z = fz - 4.2; CT.y = 2.0; CT.p = 0.2475;
          const kk = 1 - Math.exp(-rdt * 3.2);
          CAM.x += (CT.x - CAM.x) * kk; CAM.z += (CT.z - CAM.z) * kk; CAM.y += (CT.y - CAM.y) * kk; CAM.p += (CT.p - CAM.p) * kk;
        }
        camPrep();
        audioTick(t);
        // ---- draw ----
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        drawSky(g); drawSun(g, t);
        drawWater(g, t);
        drawBanks(g);
        drawTreeLine(g, TREES_FAR, mix3(SC.trees, SC.sky[2], 0.25));
        drawTreeLine(g, TREES_NEAR, mix3(SC.trees, [40, 50, 60], 0.3));
        drawSign(g);
        // things beyond the mist edge go under it
        DRAW.length = 0; nDP = 0;
        for (const rd of REEDS) { proj(rd.x, 0, rd.z); if (PO.ok) addDraw(PO.z, rd, 0); }
        for (const p of PADS) { if (p.a <= 0.005 || p.kind === 'bank') continue; proj(p.x, 0, p.z); if (PO.ok) addDraw(PO.z, p, 1); }
        let fz0 = FR.z; if (FR.air) fz0 = lerp(FR.air.z0, FR.air.z1, clamp((tn - FR.air.t0) / FR.air.T, 0, 1));
        proj(FR.x, 0, fz0 - 0.05); addDraw(PO.z, null, 2);
        DRAW.sort(byDepth);
        const zfront = G.zF;
        drawFloaters(g, t); drawRipples(g, tn);
        for (const it of DRAW) if (it.k === 0 && it.o.z > zfront + 0.3) drawReed(g, it.o, t);
        drawMistBand(g); drawPuffs(g, t, true);
        for (const it of DRAW) {
          if (it.k === 0) { if (it.o.z <= zfront + 0.3) drawReed(g, it.o, t); }
          else if (it.k === 1) drawPad(g, it.o, t);
          else drawFrog(g);
        }
        drawFlies(g, t);
        P.update(rdt); P.draw(g);
        drawPuffs(g, t, false);
        if (SEASON.rain && !K.reduced()) { g.strokeStyle = 'rgba(220,228,245,0.28)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 46; i++) { const rx = (i * 83.7 + t * 90) % (W + 40) - 20, ry = (i * 51.3 + t * 520) % H; g.moveTo(rx, ry); g.lineTo(rx - 3, ry + 13); } g.stroke(); }
        drawMarker(g, t);
        // the light: a cool dawn that warms as you go, golden when the sun is up
        const grade = 1 - G.dawn;
        if (grade > 0.01) { g.globalCompositeOperation = 'multiply'; g.fillStyle = css(mix3([255, 255, 255], [150, 150, 216], grade * 0.85)); g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
        if (SUN.ok && G.sunK > 0.02) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 * G.sunK; g.drawImage(K.glowSprite('rgba(255,220,170,0.8)'), SUN.x - H * 0.5, SUN.y - H * 0.35, H, H * 0.7); g.restore(); }
        if (!SPR.vig) SPR.vig = vignette();
        g.drawImage(SPR.vig, 0, 0, W, H);
        // DOM that follows the world
        const dim = G.phase === 'charge' || G.phase === 'air'; if (dim !== G.gdim) { G.gdim = dim; goal.classList.toggle('dim', dim); }
        if (SIGN.ok && G.phase !== 'finale' && G.phase !== 'done') { goal.style.left = clamp(SIGN.x, 120, W - 120).toFixed(1) + 'px'; goal.style.top = clamp(SIGN.y, topSafe() + 54, H - 200).toFixed(1) + 'px'; }
        if (WISP && (G.phase === 'gapready' || G.phase === 'charge' || G.phase === 'air') && PADS[G.at + 1] && PADS[G.at + 1].kind === 'log') { proj(PADS[G.at + 1].x * 0.5, 0.75, PADS[G.at].z + 3.2); if (PO.ok) wisp.style.top = clamp(PO.y, topSafe() + 40, H - 280).toFixed(1) + 'px'; }
      });

      /* ---------------- start ---------------- */
      cv.onResize(() => { layout(); ready = true; });
      PADS[1].a = 0; G.zF = G.zFt = PADS[0].z + 0.9;
      (async () => {
        await K.intro({ title: 'Lily Pads', sub: 'The far shore is out there. The path isn’t, yet. It shows up as you hop.', how: 'Hold to crouch, let go to hop. Hold longer for a longer hop.', char: 'loopie', mood: 'determined' });
        G.phase = 'look';
        if (visits >= 1) say(loopie, { Jolly: 'Back at the pond! ' + SEASON.name + ' today.' + (WEAR ? ' Nice ' + OUTFITS.find(o => o.id === WEAR).name.toLowerCase() + '.' : ''), Cheeky: SEASON.name + ' today. Same mist, new pads.' + (WEAR ? ' Love the ' + OUTFITS.find(o => o.id === WEAR).name.toLowerCase() + '.' : ''), Unfiltered: SEASON.name + '. Same mist. New pads.' }, 'happy', 3000);
        else say(loopie, care ? { Jolly: 'It’s a big one. We can’t see the whole path, and we don’t have to. Just the next pad.', Cheeky: 'Big pond. No path. But we only need the next pad.', Unfiltered: 'Can’t see the path. Only need the next pad.' } : { Jolly: 'I can’t see the path. How do we know there’s a way across?', Cheeky: 'Small problem: there is no visible path. At all.', Unfiltered: 'I can’t see the path.' }, care ? 'calm' : 'worried', 3200);
        await K.wait(1600);
        if (S.destroyed) return;
        PADS[1].a = 0.001; G.zFt = PADS[1].z + PADS[1].r + 0.45; sReveal();
        await K.wait(1300);
        say(rush, { Jolly: 'We don’t need the whole path. Just the next pad. Hop!', Cheeky: 'Path, schmath. One pad. Go!', Unfiltered: 'You only need the next pad.' }, 'determined', 3000);
        G.phase = 'ready';
        guideHop(700);
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 20000)) await K.wait(50); };
          await until(() => !!el.querySelector('.gk-intro') || G.phase !== 'intro', 5000);
          const intro = el.querySelector('.gk-intro'); if (intro) await K.sim.tap(intro);
          let n = 0;
          while (!G.finished) {
            await until(() => G.phase === 'ready' || G.phase === 'gapready' || G.phase === 'finale' || G.finished, 30000);
            if (G.phase === 'finale' || G.finished) break;
            await K.wait(220);
            const { to, dd } = aim();
            // a skilled frog aims for the middle; once it hops a little short, to show the wobble
            let target = clamp((dd - MINH) / (MAXH - MINH), 0, 1);
            if (to.kind === 'log') target = 0.97;
            else if (n === 2 && to.kind === 'pad') target = clamp((dd - to.r * 1.05 - MINH) / (MAXH - MINH), 0.05, 1);
            const p = frogScreen(), r = K.rectIn(zone, el);
            const pr = await K.sim.press(zone, p.x - r.x, p.y - r.y);
            await until(() => G.phase === 'charge', 1500);
            const rel = G.t0 + target * CHARGE_MS;
            while (G.phase === 'charge' && now() < rel - 4) await K.wait(Math.max(4, Math.min(40, rel - now() - 6)));
            pr.up(p.x - r.x, p.y - r.y);
            n++;
            await until(() => G.phase !== 'charge' && G.phase !== 'air', 8000);
          }
          await until(() => G.finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
