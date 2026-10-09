/* 019 Pass the Glow — Reset · CONNECT · Social / Team / Perspective
 * Mechanism: loving-kindness practice (Fredrickson et al. 2008; Hutcherson, Seppälä & Gross 2008): directing simple good
 * wishes to yourself, someone you care about, a near-stranger, (only if you want) someone difficult, and then everyone,
 * raises felt social connection and positive emotion, even in short doses. Each wish is held while its words form (a slow,
 * steady hold) and then passed on with a gentle gesture, so the practice becomes something the hands do.
 * Verb: hold (warm the glow while the wish forms), then pass it: carry it home, walk it up the path, flick it across the
 * valley, let it drift to the far ridge, let it go as seeds. Finale: every window on the hillside glows, the path lanterns
 * light, fireflies rise, and Patch hugs.
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const ID = 'pass-the-glow';

  /* Today's season on the hill (the same all day, different tomorrow). */
  const SEASONS = [
    { id: 'spring', name: 'Spring', canopy: ['#d98bb4', '#e7a3c6', '#c97aa6'], grass: 0.12, fall: 'petal', fallC: ['#ffc4d6', '#ffd9e6', '#fff0f5'], amb: 'prairie' },
    { id: 'summer', name: 'Summer', canopy: ['#3f7a5a', '#4e8c66', '#356b4f'], grass: 0.22, fall: 'fly', fallC: ['#e9ff9a', '#fff3a0'], amb: 'prairie' },
    { id: 'autumn', name: 'Autumn', canopy: ['#c8743a', '#d9934a', '#a85a2e'], grass: 0.05, fall: 'leaf', fallC: ['#e0a04f', '#d9823b', '#b8582e'], amb: 'prairie' },
    { id: 'winter', name: 'Winter', canopy: null, grass: 0, fall: 'snow', fallC: ['#ffffff', '#e8f4ff'], amb: 'room', snow: true }
  ];
  /* Lantern styles: the glow wears a different one each day, and they fill a collection over visits. */
  const STYLES = [{ id: 'star', name: 'Star Jar' }, { id: 'flower', name: 'Flower Lamp' }, { id: 'moon', name: 'Moon Bulb' }, { id: 'ember', name: 'Ember' }, { id: 'heart', name: 'Heart Light' }, { id: 'fly', name: 'Firefly Jar' }];
  const ICON = {
    friend: '<circle cx="8.6" cy="8.4" r="3"/><circle cx="15.6" cy="8.4" r="3"/><path d="M3.4 19.4c.5-3.3 2.6-5.3 5.2-5.3 1.5 0 2.7.6 3.4 1.6.7-1 1.9-1.6 3.4-1.6 2.6 0 4.7 2 5.2 5.3"/>',
    family: '<path d="M4 11.2 12 4.4l8 6.8V20H4z"/><path d="M12 17.6s-3.4-2-3.4-4.3c0-1.2.9-2 1.9-2 .7 0 1.2.4 1.5.9.3-.5.8-.9 1.5-.9 1 0 1.9.8 1.9 2 0 2.3-3.4 4.3-3.4 4.3z"/>',
    partner: '<path d="M12 20.2S3.6 15.1 3.6 9.4C3.6 6.7 5.6 4.8 8 4.8c1.7 0 3.1.9 4 2.3.9-1.4 2.3-2.3 4-2.3 2.4 0 4.4 1.9 4.4 4.6 0 5.7-8.4 10.8-8.4 10.8z"/>',
    pet: '<ellipse cx="12" cy="16" rx="4.6" ry="3.6"/><circle cx="6.2" cy="10.6" r="1.9"/><circle cx="9.6" cy="6.8" r="1.9"/><circle cx="14.4" cy="6.8" r="1.9"/><circle cx="17.8" cy="10.6" r="1.9"/>'
  };
  const SIGN = {
    friend: 'M5.6 8.4a3 3 0 1 0 6 0a3 3 0 1 0-6 0M12.6 8.4a3 3 0 1 0 6 0a3 3 0 1 0-6 0M3.4 19.4c.5-3.3 2.6-5.3 5.2-5.3 1.5 0 2.7.6 3.4 1.6.7-1 1.9-1.6 3.4-1.6 2.6 0 4.7 2 5.2 5.3',
    family: 'M4 11.2 12 4.4l8 6.8V20H4zM12 17.6s-3.4-2-3.4-4.3c0-1.2.9-2 1.9-2 .7 0 1.2.4 1.5.9.3-.5.8-.9 1.5-.9 1 0 1.9.8 1.9 2 0 2.3-3.4 4.3-3.4 4.3z',
    partner: 'M12 20.2S3.6 15.1 3.6 9.4C3.6 6.7 5.6 4.8 8 4.8c1.7 0 3.1.9 4 2.3.9-1.4 2.3-2.3 4-2.3 2.4 0 4.4 1.9 4.4 4.6 0 5.7-8.4 10.8-8.4 10.8z',
    pet: 'M7.4 16a4.6 3.6 0 1 0 9.2 0a4.6 3.6 0 1 0-9.2 0M4.3 10.6a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0M7.7 6.8a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0M12.5 6.8a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0M15.9 10.6a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0'
  };
  const LOVED = [{ id: 'friend', label: 'A friend' }, { id: 'family', label: 'Family' }, { id: 'partner', label: 'A partner' }, { id: 'pet', label: 'A pet' }];
  const NEUTRAL = ['The barista', 'A bus driver', 'A neighbour', 'The cashier', 'A classmate', 'The postie', 'A delivery rider', 'The librarian'];
  /* The wishes, in every vibe. Words appear one by one while the glow is held. */
  const WISH = {
    self: { Jolly: 'May I be okay, just as I am.', Cheeky: 'May I be okay. May I go easy on me.', Unfiltered: 'May I be okay.' },
    loved: { Jolly: 'May you be happy. May you be safe.', Cheeky: 'May you be happy, safe and well fed.', Unfiltered: 'May you be safe and well.' },
    neutral: { Jolly: 'May you have an easy day.', Cheeky: 'May your day be easy and your coffee hot.', Unfiltered: 'May today be easy on you.' },
    diff: { Jolly: 'May you find some peace.', Cheeky: 'May you find some peace. From a distance.', Unfiltered: 'May you be at peace.' },
    all: { Jolly: 'May everyone be okay. May we all be okay.', Cheeky: 'May all of us be okay. Even the grumpy ones.', Unfiltered: 'May everyone be okay.' }
  };
  const GENERIC = new Set(['THAT THING I SAID', "TOMORROW'S LIST", 'WHAT IF IT GOES WRONG', "SHOULD'VE DONE BETTER", 'WHAT THEY THINK', 'EVERYTHING AT ONCE', 'THE BIG WORRY']);
  const PENTA = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7'];

  function softwareGfx() {
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r);
    } catch (e) { return false; }
  }
  const mixHex = (a, b, k) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), m = (s) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * k));
    return '#' + ((1 << 24) + (m(16) << 16) + (m(8) << 8) + m(0)).toString(16).slice(1);
  };

  (env.games = env.games || []).push({
    id: ID, mode: 'reset', name: 'Pass the Glow', verb: 'hold', family: 'CONNECT', minutes: 2,
    parents: ['Social / Team / Perspective', 'Communication / Boundaries', 'Values / Meaning / Grief'],
    cast: ['patch', 'drop', 'still'], poster: { char: 'patch', mood: 'love' },
    tagline: 'Hold a small kind wish, then pass it on until the whole hill glows.',
    why: 'For heavy people stuff: warm wishes, passed house to house, starting with you.',
    fonts: ['Caveat:wght@600;700', 'Quicksand:wght@500;600;700'],
    css: `
.g-pass-the-glow { --pg-hand: "Caveat", "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive; --pg-ui: "Quicksand", "Nunito", "Fredoka", system-ui, sans-serif;
  --pg-panel: rgba(8, 21, 32, 0.93); --pg-panel2: rgba(22, 46, 58, 0.95); --pg-ink: #fff6e8; --pg-muted: #cfe0d6; --pg-line: rgba(255, 236, 200, 0.18); --pg-chip: rgba(255, 255, 255, 0.06); --pg-warm: #ffcf7a; background: #061320; }
.g-pass-the-glow.pg-bright { --pg-panel: rgba(255, 252, 246, 0.95); --pg-panel2: rgba(255, 245, 230, 0.96); --pg-ink: #2a2016; --pg-muted: #66563f; --pg-line: rgba(42, 32, 22, 0.15); --pg-chip: rgba(255, 255, 255, 0.92); --pg-warm: #c2690f; background: #3a4a84; }
.g-pass-the-glow .gk-intro { background: radial-gradient(ellipse at 50% 42%, rgba(84, 56, 22, 0.55), rgba(3, 11, 19, 0.92)); -webkit-backdrop-filter: none; backdrop-filter: none; color: #fff6e8; }
.g-pass-the-glow .gk-intro-title { font-family: var(--pg-hand); font-weight: 700; font-size: clamp(50px, 14.5cqw, 88px); line-height: 0.95; color: #ffd98a; text-shadow: 0 0 26px rgba(255, 186, 86, 0.6), 0 3px 0 rgba(0, 0, 0, 0.25); }
.g-pass-the-glow .gk-intro-sub { color: #f6ead6; font-family: var(--pg-ui); font-weight: 600; }
.g-pass-the-glow .gk-intro-how { color: #ffcf7a; font-family: var(--pg-ui); font-weight: 700; }
.g-pass-the-glow .gk-intro-tap { color: #f0e2c8; }
.g-pass-the-glow .pg-orb { position: absolute; z-index: 26; left: 0; top: 0; width: 108px; height: 108px; margin: -54px 0 0 -54px; border-radius: 50%; touch-action: none; cursor: grab; outline: none; }
.g-pass-the-glow .pg-orb:focus-visible { box-shadow: 0 0 0 3px #fff6e8; }
.g-pass-the-glow .pg-wish { position: absolute; z-index: 24; left: 50%; top: 0; transform: translate(-50%, -100%); width: max-content; max-width: min(380px, calc(100% - 28px)); box-sizing: border-box; text-align: center;
  pointer-events: none; padding: 12px 22px 14px; border-radius: 24px; background: linear-gradient(180deg, rgba(8, 18, 30, 0.5), rgba(8, 18, 30, 0.38)); border: 1px solid rgba(255, 226, 170, 0.12);
  box-shadow: 0 0 34px rgba(255, 190, 100, 0.1); transition: opacity 0.6s ease; }
.g-pass-the-glow .pg-wish.pg-off { opacity: 0; }
.g-pass-the-glow .pg-line { display: block; font: 700 31px/1.12 var(--pg-hand); color: #fff3d6; text-shadow: 0 0 14px rgba(255, 190, 100, 0.8), 0 2px 2px rgba(0, 0, 0, 0.5); text-wrap: balance; }
.g-pass-the-glow .pg-line i { font-style: normal; display: inline-block; opacity: 0.3; transform: translateY(7px) scale(0.92); transition: opacity 0.5s ease, transform 0.5s cubic-bezier(.3, 1.5, .5, 1); }
.g-pass-the-glow .pg-line i.on { opacity: 1; transform: none; }
.g-pass-the-glow .pg-even { display: block; margin-top: 6px; font: 600 15px/1.3 var(--pg-ui); color: #f3e6cf; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6); }
.g-pass-the-glow .pg-even .gk-user { font-size: 15px; color: #ffe2a6; letter-spacing: 0.03em; }
.g-pass-the-glow .pg-panel { position: absolute; z-index: 34; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 14px); width: min(560px, calc(100% - 20px)); box-sizing: border-box; transform: translateX(-50%);
  padding: 14px 14px 15px; border-radius: 26px; background: linear-gradient(180deg, var(--pg-panel2), var(--pg-panel)); border: 1px solid var(--pg-line); color: var(--pg-ink); font-family: var(--pg-ui);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12); display: flex; flex-direction: column; gap: 10px; transition: transform 0.6s cubic-bezier(.3, 1.2, .5, 1), opacity 0.4s ease; }
.g-pass-the-glow .pg-panel.pg-away { transform: translate(-50%, calc(100% + 40px)); opacity: 0; pointer-events: none; }
.g-pass-the-glow .pg-pnote { margin: 0; text-align: center; font: 600 14px/1.35 var(--pg-ui); color: var(--pg-muted); text-wrap: balance; }
.g-pass-the-glow .pg-pnote b { display: block; font: 700 17px/1.25 var(--pg-ui); color: var(--pg-ink); margin-bottom: 1px; }
.g-pass-the-glow .pg-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.g-pass-the-glow .pg-chip { appearance: none; cursor: pointer; min-height: 48px; padding: 9px 16px 9px 11px; border-radius: 999px; display: inline-flex; align-items: center; gap: 8px; font: 700 15px/1 var(--pg-ui); color: var(--pg-ink);
  background: var(--pg-chip); border: 1.5px solid color-mix(in srgb, var(--pg-warm) 60%, transparent); box-shadow: 0 0 14px rgba(255, 196, 110, 0.16); transition: transform 0.15s ease, background 0.2s ease; }
.g-pass-the-glow .pg-chip svg { width: 26px; height: 26px; flex: none; fill: none; stroke: var(--pg-warm); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.g-pass-the-glow .pg-chip.pg-plain { padding: 9px 18px; }
.g-pass-the-glow .pg-chip:active { transform: scale(0.95); }
.g-pass-the-glow .pg-chip.pg-picked { background: color-mix(in srgb, var(--pg-warm) 34%, var(--pg-chip)); transform: scale(1.05); }
.g-pass-the-glow .pg-chip:focus-visible { outline: 3px solid #fff6e8; outline-offset: 3px; }
.g-pass-the-glow .pg-tag { position: absolute; z-index: 23; transform: translate(-50%, -100%); padding: 6px 11px; border-radius: 999px; font: 700 13px/1 var(--pg-ui); color: #2a1c08; background: #ffe0a6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35), 0 0 16px rgba(255, 200, 110, 0.6); white-space: nowrap; pointer-events: none; animation: pass-the-glow-tag 0.6s cubic-bezier(.3, 1.6, .5, 1) both; }
@keyframes pass-the-glow-tag { from { opacity: 0; transform: translate(-50%, -60%) scale(0.6); } to { opacity: 1; transform: translate(-50%, -100%); } }
.g-pass-the-glow .pg-tag.pg-fade { transition: opacity 0.8s ease; opacity: 0; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const inten = [0, 1, 2].includes(ctx.intensity) ? ctx.intensity : 1;
      const HOLD = [2.2, 2.8, 3.4][inten], SPEED = [520, 440, 380][inten], BASE = [14, 18, 22][inten];
      const RED = K.reduced(), visits = K.visits(), dayN = K.daily();
      const SEA = K.dailyPick(SEASONS, 2), SEA2 = SEASONS[((dayN + 1) * 7 + 26 + ID.length) % SEASONS.length];
      const STY = K.dailyPick(STYLES, 4);
      const line = (o) => ctx.line(o);
      const care = an.safety === 'care';
      const dark = () => K.dark();
      const SOFTGFX = softwareGfx();
      const extra = Math.min(12, visits);
      /* the player's own heaviest words, offered back only as "even with ..." on their own wish (never for care topics) */
      const ownCore = (() => {
        if (!String(ctx.text || '').trim() || care || an.safety === 'support' || !an.core || !an.core.label) return '';
        const c = String(an.core.label).replace(/\s+/g, ' ').trim(), k = c.replace(/[’‘]/g, "'").toUpperCase();
        return c && !GENERIC.has(k) && c.length <= 30 ? c : '';
      })();

      /* ---------------- scene ---------------- */
      el.classList.toggle('pg-bright', !dark());
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFTGFX ? 1.25 : 1.5 });
      const P = K.particles({ max: SOFTGFX ? 220 : 320 });
      const orbHit = h('div', { class: 'pg-orb', role: 'button', tabindex: '0', 'aria-label': 'The glow. Press and hold to warm the wish.' });
      const wishEl = h('div', { class: 'pg-wish pg-off', 'aria-live': 'polite' });
      const panel = h('div', { class: 'pg-panel pg-away', role: 'group' });
      el.append(wishEl, orbHit, panel);
      const patch = K.character('patch', { side: 'left', mood: 'love', x: 0, y: 66, size: 72 });
      const still = K.character('still', { side: 'right', mood: 'E44', x: 10, y: 66, size: 72 });
      const drop = K.character('drop', { side: 'right', mood: 'calm', x: 10, y: 66, size: 72 });
      still.show(false); drop.show(false);
      const G = { w: 0, H: 0, phone: true, bowl: { x: 0, y: 0 }, layers: [], houses: [], path: [], plen: 0, lanterns: [], home: { x: 0, y: 0 } };
      const W = { warm: 0, warmT: 0, fly: 0, idle: 0, pulse: 0, links: 0, linksT: 0 };
      const L = {};
      const ORB = { x: 0, y: 0, tx: 0, ty: 0, mode: 'rest', charge: 0, flicker: 0, scale: 1, alpha: 1, vis: 1 };

      /* ---------------- audio: a calm bed, a warm hum while you hold, a kalimba that sings the wish ---------------- */
      const music = K.music('calm', { bpm: 60 });
      music.level(0.55);
      const amb = K.ambience(SEA.amb);
      amb.level(SEA.amb === 'room' ? 0.2 : 0.3, 1.5);
      let hum = null;
      const humOn = () => { if (!hum && A.ctx) hum = A.loop({ pink: true, filter: 'bandpass', freq: 380, q: 1.3 }); return hum; };
      S.onDestroy(() => { if (hum) hum.stop(); });
      let noteI = 0;
      const SND = {
        word(i) { if (!A.ctx) return; A.pluck(A.note(PENTA[Math.min(PENTA.length - 1, i)]), { vol: 0.2, damp: 0.997, verb: 0.45 }); A.sync('word', performance.now()); },
        full() { if (!A.ctx) return; ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.07, vol: 0.06, dur: 2 })); A.sync('full', performance.now()); },
        grab() { if (A.ctx) { A.pop({ freq: 440, vol: 0.07 }); A.sync('grab', performance.now()); } },
        back() { if (A.ctx) A.boing({ freq: 260, vol: 0.06 }); },
        whoosh() { if (A.ctx) { A.whoosh({ from: 500, to: 2600, dur: 0.6, vol: 0.1 }); A.tone({ type: 'sine', freq: 520, to: 1040, glide: 0.8, dur: 0.9, vol: 0.04, attack: 0.1, verb: 0.4 }); A.sync('fling', performance.now()); } },
        light(k) { // a warm swell and a bell: every lit house adds a note to the hill's chord
          if (!A.ctx) return;
          A.tone({ type: 'sine', freq: 110, to: 220, glide: 0.6, dur: 1.4, vol: 0.1, attack: 0.25, verb: 0.3 });
          A.chime(A.note(PENTA[(k == null ? noteI++ : k) % PENTA.length]), { vol: 0.08, dur: 2.6, verb: 0.55 });
          A.sync('light', performance.now());
        },
        lamp(i) { if (A.ctx) A.chime(A.note(PENTA[(i + 5) % PENTA.length]) * 2, { vol: 0.025, dur: 0.9, verb: 0.5 }); },
        sputter() { if (!A.ctx) return; for (let i = 0; i < 4; i++) A.noise({ when: A.now() + i * 0.05 + Math.random() * 0.04, filter: 'highpass', freq: 3000 + Math.random() * 2500, dur: 0.015, vol: 0.03 }); },
        seed(i) { if (A.ctx) A.chime(A.note(PENTA[i % PENTA.length]), { vol: 0.045, dur: 1.6, verb: 0.6 }); },
        bloom() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 900, to: 5200, q: 0.9, dur: 0.9, attack: 0.05, vol: 0.08 }); A.pad([A.note('F3'), A.note('A3'), A.note('C4'), A.note('E4')], { dur: 5, vol: 0.12, attack: 0.8 }); A.sync('bloom', performance.now()); }
      };

      /* ---------------- sprites ---------------- */
      function sprite(size, stops) {
        const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
        stops.forEach(([k, col]) => gr.addColorStop(k, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
      }
      const WARM = sprite(96, [[0, 'rgba(255,214,140,0.75)'], [0.35, 'rgba(255,186,96,0.28)'], [1, 'rgba(255,170,80,0)']]);
      const HALO = sprite(128, [[0, 'rgba(255,236,190,0.9)'], [0.22, 'rgba(255,200,110,0.5)'], [0.55, 'rgba(255,160,70,0.14)'], [1, 'rgba(255,150,60,0)']]);
      const COOL = sprite(128, [[0, 'rgba(232,226,255,0.85)'], [0.25, 'rgba(184,170,255,0.42)'], [0.6, 'rgba(140,130,230,0.12)'], [1, 'rgba(120,110,220,0)']]);
      const CORE = sprite(64, [[0, 'rgba(255,255,250,1)'], [0.35, 'rgba(255,240,200,0.95)'], [0.7, 'rgba(255,210,140,0.35)'], [1, 'rgba(255,200,120,0)']]);
      const MOTE = sprite(16, [[0, 'rgba(255,250,220,1)'], [0.4, 'rgba(255,220,150,0.6)'], [1, 'rgba(255,210,140,0)']]);
      const SOFT = sprite(64, [[0, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
      const SPILL = sprite(64, [[0, 'rgba(255,190,110,0.5)'], [0.5, 'rgba(255,170,90,0.18)'], [1, 'rgba(255,160,80,0)']]);

      /* ---------------- the village: hills in layers, cottages on their crests, a winding path ---------------- */
      function off(w, hh) { const s = cv.dpr, c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(hh * s)); const g = c.getContext('2d'); g.setTransform(s, 0, 0, s, 0, 0); return { c, g, s }; }
      const crest = (i, x) => { const Ly = G.layers[i]; return Ly.y + Math.sin(x * Ly.f1 + Ly.p1) * Ly.a1 + Math.sin(x * Ly.f2 + Ly.p2) * Ly.a2; };
      function layout() {
        const w = cv.w, H = cv.h; if (!w || !H) return;
        const phone = w < 700;
        // a resize or a quality change rebuilds the village: keep every window that was already lit
        const prev = G.houses.map(q => ({ kind: q.kind, litT: q.litT, lit: q.lit, cool: q.cool, sign: q.sign, waver: q.waver })), prevL = G.lanterns.map(l => l.lit);
        Object.assign(G, { w, H, phone });
        const R = K.rng(4242); // the village itself never changes; it only grows
        const fr = phone ? [0.33, 0.43, 0.53, 0.645, 0.755] : [0.36, 0.46, 0.56, 0.665, 0.77];
        G.layers = fr.map((f, i) => ({ y: H * f, a1: (phone ? 10 : 16) + R() * 8, a2: 3 + R() * 4, f1: (0.006 + R() * 0.006) * (phone ? 1.6 : 1), f2: 0.02 + R() * 0.02, p1: R() * 6, p2: R() * 6, i }));
        G.bowl = { x: Math.round(w * 0.5), y: Math.round(H * (phone ? 0.795 : 0.8)) };
        const hs = [];
        const mk = (kind, i, x, sc) => ({ kind, layer: i, x, y: crest(i, x) + 2, s: sc, lit: 0, litT: 0, bloom: 0, cool: false, ph: R() * 6, roof: Math.floor(R() * 3), hue: Math.floor(R() * 4), sign: null, isNew: false, waver: 0 });
        hs.push(mk('you', 4, w * (phone ? 0.19 : 0.3), phone ? 1.6 : 1.45));
        hs.push(mk('loved', 3, w * (phone ? 0.77 : 0.68), phone ? 1.1 : 1.1));
        hs.push(mk('neutral', 1, w * (phone ? 0.84 : 0.86), phone ? 0.74 : 0.8));
        hs.push(mk('diff', 0, w * (phone ? 0.14 : 0.12), phone ? 0.6 : 0.66));
        // the path from your hands, past your house, up the hill to the loved one's door
        const lv = hs[1], wp = phone
          ? [[0.5, 0.795], [0.32, 0.765], [0.48, 0.728], [0.66, 0.702], [0.55, 0.668], [lv.x / w - 0.07, (lv.y + 1) / H]]
          : [[0.5, 0.8], [0.4, 0.775], [0.52, 0.745], [0.62, 0.72], [0.57, 0.69], [lv.x / w - 0.04, (lv.y + 1) / H]];
        const pts = wp.map(([a, b]) => ({ x: a * w, y: b * H }));
        const path = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
          for (let k = 0; k < 16; k++) { const t = k / 16, t2 = t * t, t3 = t2 * t; path.push({ x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3), y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3) }); }
        }
        path.push(pts[pts.length - 1]);
        let len = 0; path.forEach((p, i) => { if (i) len += Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y); p.s = len; });
        G.path = path; G.plen = len;
        // the rest of the village: fixed slots on the crests, clear of the path and the bowl (more fill in as it grows)
        const slots = [], layerS = [0.55, 0.68, 0.82, 0.98, 1.15];
        for (let i = 0; i < 5; i++) {
          let x = (phone ? 20 : 40) + R() * 30;
          while (x < w - 20) {
            const sc = layerS[i] * (phone ? 0.92 : 1.05) * (0.9 + R() * 0.2), hw = 15 * sc, gy = crest(i, x);
            const clash = hs.some(q => q.layer === i && Math.abs(q.x - x) < hw + 15 * q.s + 10) || (i === 0 && x < w * 0.3) || (i === 4 && Math.abs(x - G.bowl.x) < 90)
              || path.some(p => Math.abs(p.x - x) < hw + 12 && Math.abs(p.y - (gy - 12 * sc)) < 26 * sc + 10);
            if (!clash) slots.push({ i, x, s: sc, r: R() });
            x += hw * 2 + 14 + R() * (phone ? 34 : 70);
          }
        }
        slots.sort((a, b) => a.r - b.r);
        const n = Math.min(slots.length, BASE + extra);
        const grew = extra > 0 && BASE + extra <= slots.length; // the hill only claims a new house when there was room for one
        slots.slice(0, n).forEach((sl, k) => { const q = mk('other', sl.i, sl.x, sl.s); q.isNew = grew && k === n - 1; hs.push(q); });
        hs.sort((a, b) => a.layer - b.layer || a.x - b.x);
        G.houses = hs;
        G.you = hs.find(q => q.kind === 'you'); G.loved = hs.find(q => q.kind === 'loved'); G.neutral = hs.find(q => q.kind === 'neutral'); G.diff = hs.find(q => q.kind === 'diff');
        hs.forEach(q => { q.win = { x: q.x + 4 * q.s, y: q.y - 13 * q.s }; q.door = { x: q.x - 8 * q.s, y: q.y - 5 * q.s }; q.wins = []; });
        G.links = [];
        hs.forEach((q, i) => {
          let best = null, bd = Infinity;
          hs.forEach((r, j) => { if (j === i || Math.abs(r.layer - q.layer) > 1) return; const d = Math.hypot(r.x - q.x, (r.y - q.y) * 1.7); if (d < bd && !G.links.some(l => l.a === r && l.b === q)) { bd = d; best = r; } });
          if (best && bd < w * 0.42) G.links.push({ a: q, b: best, ph: R(), sp: 0.18 + R() * 0.22 });
        });
        G.lanterns = []; for (let d = 46, side = 1; d < len - 20; d += phone ? 52 : 64, side *= -1) { const p = at(d), q = at(d + 4), nx = -(q.y - p.y), ny = q.x - p.x, nl = Math.hypot(nx, ny) || 1; G.lanterns.push({ s: d, x: p.x + nx / nl * 13 * side, y: p.y + ny / nl * 13 * side, lit: 0 }); }
        if (prev.length === hs.length) prev.forEach((st, i) => { if (st.litT) Object.assign(hs[i], { litT: st.litT, lit: st.lit, cool: st.cool, sign: st.sign, waver: st.waver }); });
        else prev.forEach(st => { if (st.litT && st.kind !== 'other') { const q = hs.find(x => x.kind === st.kind); Object.assign(q, { litT: st.litT, lit: st.lit, cool: st.cool, sign: st.sign }); } });
        if (prevL.length === G.lanterns.length) prevL.forEach((v, i) => { G.lanterns[i].lit = v; });
        const sz = phone ? 72 : 96;
        patch.place(w - sz - (phone ? 10 : 24), phone ? 66 : 74); patch.el.style.setProperty('--sz', sz + 'px');
        [still, drop].forEach(c => { c.el.style.setProperty('--sz', sz + 'px'); c.place(phone ? 10 : 24, phone ? 66 : 74); });
        if (phase === 'finale' || phase === 'end') placeFinaleCast();
        paintLayers();
        G.home = { x: G.you.win.x, y: G.you.win.y };
        if (ORB.mode === 'rest' || ORB.mode === 'held') { ORB.x = ORB.tx = G.bowl.x; ORB.y = ORB.ty = G.bowl.y - 18; }
        syncDom();
      }
      function at(d) { // a point on the path at arc length d
        const pth = G.path; if (!pth.length) return { x: 0, y: 0 };
        if (d <= 0) return pth[0];
        for (let i = 1; i < pth.length; i++) if (pth[i].s >= d) { const a = pth[i - 1], b = pth[i], k = (d - a.s) / Math.max(0.001, b.s - a.s); return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
        return pth[pth.length - 1];
      }
      const PAL = {
        d: { sky: ['#04101d', '#0a2236', '#1b3d4f'], hill: ['#1b3a52', '#173349', '#132c40', '#0f2536', '#0b1c2a'], mist: 'rgba(170,210,230,', wall: ['#2c3a52', '#33405a', '#2a3448', '#3a3550'], roof: ['#4a2a36', '#2a3c4c', '#5a3626'], door: '#16131c', glass: '#1a2638' },
        b: { sky: ['#34457e', '#7466a6', '#eaa98e'], hill: ['#5b77a2', '#4e6b95', '#425f88', '#36527a', '#2a4466'], mist: 'rgba(255,236,226,', wall: ['#6e7aa0', '#7884a8', '#66729a', '#7a7098'], roof: ['#8a4e5c', '#4e6a82', '#9a5c40'], door: '#2e2638', glass: '#3a4a6a' }
      };
      let twinkles = [];
      function paintLayers() {
        if (!G.w) return;
        const D = dark(), C = PAL[D ? 'd' : 'b'], w = G.w, H = G.H, R = K.rng(dayN * 11 + 3);
        L.bg = off(w, H); const g = L.bg.g;
        const sk = g.createLinearGradient(0, 0, 0, G.layers[0].y + 30);
        sk.addColorStop(0, C.sky[0]); sk.addColorStop(0.6, C.sky[1]); sk.addColorStop(1, C.sky[2]);
        g.fillStyle = sk; g.fillRect(0, 0, w, H);
        const n = Math.round((D ? 150 : 70) * w * G.layers[0].y / (390 * 300));
        for (let i = 0; i < n; i++) { const x = R() * w, y = Math.pow(R(), 1.3) * (G.layers[0].y - 10), s = R() < 0.1 ? 1.6 : R() < 0.5 ? 1.1 : 0.7; g.globalAlpha = (0.25 + R() * 0.6) * (D ? 1 : 0.55); g.fillStyle = R() < 0.2 ? '#ffe9c4' : '#ffffff'; g.fillRect(x, y, s, s); }
        // long banks of cloud: dark now, lit warm from below once the village glows
        const top = G.layers[0].y, cl = off(w, top + 40), cg = cl.g;
        const CLD = sprite(64, [[0, D ? 'rgba(14,32,50,0.85)' : 'rgba(92,96,150,0.5)'], [0.55, D ? 'rgba(14,32,50,0.4)' : 'rgba(92,96,150,0.22)'], [1, 'rgba(14,32,50,0)']]);
        const banks = [[0.2, 0.44, 0.7], [0.76, 0.3, 0.6], [0.52, 0.64, 0.9]];
        g.globalAlpha = 1;
        banks.forEach(([fx, fy, fw]) => {
          const cx = w * fx, cy = top * fy, cw = w * fw * (G.phone ? 1.2 : 0.75);
          for (let k = 0; k < 11; k++) {
            const t2 = k / 10 - 0.5, bx = cx + t2 * cw + (R() - 0.5) * 20, rw = cw * (0.1 + R() * 0.07), rh = (13 + R() * 11) * (1 - Math.abs(t2) * 0.55), by = cy - Math.cos(t2 * Math.PI) * 14 + (R() - 0.5) * 18;
            g.drawImage(CLD, bx - rw, by - rh, rw * 2, rh * 2);
            cg.globalAlpha = 0.3; cg.drawImage(WARM, bx - rw * 1.15, by - rh * 1.2, rw * 2.3, rh * 3.2);
          }
        });
        cg.globalAlpha = 1; g.globalAlpha = 1;
        L.cloudLit = cl;
        const hg = g.createRadialGradient(w * 0.62, G.layers[0].y + 10, 10, w * 0.62, G.layers[0].y + 10, Math.max(w, H * 0.5) * 0.75);
        hg.addColorStop(0, D ? 'rgba(120,190,200,0.22)' : 'rgba(255,214,180,0.4)'); hg.addColorStop(1, 'rgba(120,190,200,0)');
        g.fillStyle = hg; g.fillRect(0, 0, w, G.layers[0].y + 40);
        g.fillStyle = mixHex(C.hill[0], C.sky[2], 0.55); g.beginPath(); g.moveTo(0, G.layers[0].y + 20);
        for (let x = 0; x <= w; x += 16) g.lineTo(x, G.layers[0].y - 34 - Math.abs(Math.sin(x * 0.011 + 1.7)) * (G.phone ? 40 : 60) - Math.sin(x * 0.031) * 6);
        g.lineTo(w, G.layers[0].y + 20); g.closePath(); g.fill();
        // the hill, far to near, each crest with mist, trees and cottages
        for (let i = 0; i < 5; i++) {
          const base = C.hill[i];
          g.fillStyle = base; g.beginPath(); g.moveTo(-4, H + 4);
          for (let x = -4; x <= w + 8; x += 6) g.lineTo(x, crest(i, x));
          g.lineTo(w + 8, H + 4); g.closePath(); g.fill();
          if (SEA.snow) { g.strokeStyle = D ? 'rgba(210,226,255,0.32)' : 'rgba(255,255,255,0.55)'; g.lineWidth = 3 + i; g.beginPath(); for (let x = -4; x <= w + 8; x += 6) { const y = crest(i, x) + 1; if (x < 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
          else if (SEA.grass) { g.strokeStyle = D ? `rgba(120,200,150,${SEA.grass * 0.6})` : `rgba(200,255,210,${SEA.grass})`; g.lineWidth = 2; g.beginPath(); for (let x = -4; x <= w + 8; x += 6) { const y = crest(i, x) + 1; if (x < 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
          const mg = g.createLinearGradient(0, G.layers[i].y - 30, 0, G.layers[i].y + 40);
          mg.addColorStop(0, C.mist + '0)'); mg.addColorStop(0.5, C.mist + (D ? 0.05 : 0.09) + ')'); mg.addColorStop(1, C.mist + '0)');
          g.fillStyle = mg; g.fillRect(0, G.layers[i].y - 30, w, 70);
          trees(g, i, D, R, C);
          G.houses.filter(q => q.layer === i).forEach(q => house(g, q, D, C));
          if (i === 4) pathStones(g, D);
        }
        garden(g, D, R, C);
        // the bowl that holds the glow
        const b = G.bowl;
        g.fillStyle = D ? '#1a2430' : '#3c4a62'; g.beginPath(); g.ellipse(b.x, b.y + 16, 46, 12, 0, 0, TAU); g.fill();
        g.fillStyle = D ? '#6a3e2a' : '#9a5a3a'; g.beginPath(); g.moveTo(b.x - 30, b.y - 2); g.quadraticCurveTo(b.x - 28, b.y + 18, b.x, b.y + 18); g.quadraticCurveTo(b.x + 28, b.y + 18, b.x + 30, b.y - 2); g.closePath(); g.fill();
        g.fillStyle = D ? '#8a5638' : '#b9774c'; g.beginPath(); g.ellipse(b.x, b.y - 2, 30, 6, 0, 0, TAU); g.fill();
        g.fillStyle = D ? '#2a1a14' : '#5a3424'; g.beginPath(); g.ellipse(b.x, b.y - 2, 25, 4, 0, 0, TAU); g.fill();
        el.style.backgroundColor = C.sky[0];
        const R2 = K.rng(dayN + 77); twinkles = [];
        for (let i = 0; i < 30; i++) twinkles.push({ x: R2() * w, y: 70 + R2() * (G.layers[0].y - 120), s: 1 + R2() * 1.2, ph: R2() * 6, sp: 0.7 + R2() * 1.8 });
      }
      function garden(g, D, R, C) {
        const w = G.w, H = G.H, wy = H * (G.phone ? 0.905 : 0.915), ground = C.hill[4];
        const vg = g.createLinearGradient(0, G.layers[4].y + 30, 0, H); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, D ? 'rgba(2,8,14,0.55)' : 'rgba(20,24,52,0.35)');
        g.fillStyle = vg; g.fillRect(0, G.layers[4].y + 30, w, H);
        // a low dry-stone wall
        const st = mixHex(ground, D ? '#8aa0b0' : '#e8e0f0', D ? 0.22 : 0.3), stD = mixHex(ground, '#000000', 0.25);
        for (let row = 0; row < 2; row++) {
          let x = -10 + row * 9;
          while (x < w + 10) { const sw = 16 + R() * 14, sh = 8 + R() * 3, y = wy + row * 9 + (R() - 0.5) * 2; g.fillStyle = stD; g.beginPath(); g.ellipse(x + sw / 2, y + 1.5, sw / 2, sh / 2, 0, 0, TAU); g.fill(); g.fillStyle = st; g.beginPath(); g.ellipse(x + sw / 2, y, sw / 2 - 0.5, sh / 2 - 0.8, 0, 0, TAU); g.fill(); x += sw + 1.5; }
        }
        // tufts and flowers along the wall and around the bowl
        g.strokeStyle = mixHex(ground, SEA.snow ? '#ffffff' : '#7fc89a', SEA.snow ? 0.35 : D ? 0.25 : 0.4); g.lineWidth = 1.3; g.lineCap = 'round';
        for (let i = 0; i < (G.phone ? 34 : 70); i++) { const x = R() * w, y = wy - 2 - R() * 6; g.beginPath(); for (let k = -1; k <= 1; k++) { g.moveTo(x, y); g.lineTo(x + k * 3 + (R() - 0.5) * 2, y - 5 - R() * 6); } g.stroke(); }
        const fl = SEA.id === 'spring' ? ['#ffd2e4', '#fff4f8'] : SEA.id === 'summer' ? ['#ffe58a', '#ffffff'] : SEA.id === 'autumn' ? ['#ffb35a', '#e07a3a'] : null;
        if (fl) for (let i = 0; i < (G.phone ? 22 : 44); i++) { g.fillStyle = fl[i % 2]; g.globalAlpha = D ? 0.55 : 0.8; g.beginPath(); g.arc(R() * w, wy - 4 - R() * 9, 1.5 + R(), 0, TAU); g.fill(); }
        g.globalAlpha = 1;
        // two shrubs frame the garden in the bottom corners
        const shrub = (cx, cy, r) => {
          const base = SEA.canopy ? mixHex(SEA.canopy[2], ground, 0.6) : mixHex(ground, '#ffffff', 0.08), col = mixHex(base, '#000000', D ? 0.45 : 0.2);
          g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.arc(cx - r * 0.75, cy + r * 0.25, r * 0.7, 0, TAU); g.arc(cx + r * 0.7, cy + r * 0.3, r * 0.68, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.arc(cx - r * 0.25, cy - r * 0.35, r * 0.45, 0, TAU); g.fill();
          if (SEA.snow) { g.fillStyle = D ? 'rgba(220,234,255,0.4)' : 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(cx, cy - r * 0.8, r * 0.6, r * 0.18, 0, 0, TAU); g.fill(); }
        };
        const rr = G.phone ? 40 : 64;
        shrub(-rr * 0.2, H - rr * 0.35, rr); shrub(w + rr * 0.2, H - rr * 0.4, rr * 1.05);
      }
      function trees(g, i, D, R, C) {
        const s0 = [0.5, 0.62, 0.76, 0.92, 1.1][i] * (G.phone ? 0.9 : 1.05), dk = D ? 0.55 + i * 0.05 : 0.75 + i * 0.04;
        let x = 6 + R() * 20;
        while (x < G.w) {
          const near = G.houses.some(q => q.layer === i && Math.abs(q.x - x) < 26 * q.s + 8);
          const onPath = i >= 3 && G.path.some(p => Math.abs(p.x - x) < 14 && Math.abs(p.y - crest(i, x)) < 30);
          if (!near && !onPath && R() < 0.55) {
            const s = s0 * (0.8 + R() * 0.5), y = crest(i, x) + 3, kind = R();
            g.fillStyle = mixHex(C.hill[i], '#000000', 0.35); g.fillRect(x - 1.3 * s, y - 10 * s, 2.6 * s, 10 * s);
            if (!SEA.canopy) { // bare winter trees with snow on the branches
              g.strokeStyle = mixHex(C.hill[i], '#000000', 0.3); g.lineWidth = 1.4 * s; g.beginPath();
              g.moveTo(x, y - 8 * s); g.lineTo(x, y - 26 * s); g.moveTo(x, y - 16 * s); g.lineTo(x - 8 * s, y - 24 * s); g.moveTo(x, y - 19 * s); g.lineTo(x + 7 * s, y - 27 * s); g.stroke();
              g.fillStyle = D ? 'rgba(220,232,255,0.5)' : 'rgba(255,255,255,0.8)'; g.fillRect(x - 8 * s, y - 25 * s, 4 * s, 1.5 * s); g.fillRect(x + 5 * s, y - 28 * s, 4 * s, 1.5 * s);
            } else if (kind < 0.35) { // a cypress
              g.fillStyle = mixHex(mixHex(SEA.canopy[2], C.hill[i], 0.45), '#000000', 1 - dk); g.beginPath(); g.ellipse(x, y - 20 * s, 5 * s, 16 * s, 0, 0, TAU); g.fill();
            } else { // a round canopy
              const col = mixHex(mixHex(SEA.canopy[Math.floor(R() * 3)], C.hill[i], 0.4), '#000000', 1 - dk);
              g.fillStyle = col; g.beginPath(); g.arc(x, y - 17 * s, 9 * s, 0, TAU); g.arc(x - 6 * s, y - 13 * s, 6.5 * s, 0, TAU); g.arc(x + 6 * s, y - 13 * s, 6.5 * s, 0, TAU); g.fill();
              g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.arc(x - 2 * s, y - 20 * s, 4 * s, 0, TAU); g.fill();
            }
          }
          x += (18 + R() * 30) * s0;
        }
      }
      function house(g, q, D, C) {
        const s = q.s, x = q.x, y = q.y, hw = 15 * s, hh = 17 * s, wall = C.wall[q.hue % C.wall.length], roof = C.roof[q.roof % C.roof.length], depth = [0.25, 0.18, 0.12, 0.06, 0][q.layer];
        const wl = mixHex(wall, C.sky[2], depth), rf = mixHex(roof, C.sky[2], depth);
        g.fillStyle = wl; g.fillRect(x - hw, y - hh, hw * 2, hh + 2);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + hw * 0.45, y - hh, hw * 0.55, hh + 2);
        g.fillStyle = rf;
        if (q.roof === 1) { g.beginPath(); g.moveTo(x - hw - 3 * s, y - hh); g.quadraticCurveTo(x, y - hh - 22 * s, x + hw + 3 * s, y - hh); g.closePath(); g.fill(); }
        else { g.beginPath(); g.moveTo(x - hw - 3 * s, y - hh + 1); g.lineTo(x - hw * 0.1, y - hh - 15 * s); g.lineTo(x + hw + 3 * s, y - hh + 1); g.closePath(); g.fill(); }
        g.fillRect(x + hw * 0.4, y - hh - 13 * s, 4 * s, 9 * s);
        q.chim = { x: x + hw * 0.4 + 2 * s, y: y - hh - 14 * s };
        if (SEA.snow) { g.strokeStyle = D ? 'rgba(220,234,255,0.75)' : '#ffffff'; g.lineWidth = 2.2 * s; g.lineCap = 'round'; g.beginPath(); if (q.roof === 1) { g.moveTo(x - hw - 2 * s, y - hh - 1); g.quadraticCurveTo(x, y - hh - 23 * s, x + hw + 2 * s, y - hh - 1); } else { g.moveTo(x - hw - 2 * s, y - hh); g.lineTo(x - hw * 0.1, y - hh - 15 * s); g.lineTo(x + hw + 2 * s, y - hh); } g.stroke(); }
        g.fillStyle = C.door; roundRect(g, x - hw * 0.62, y - 10 * s, 5.5 * s, 10 * s, 2.5 * s); g.fill();
        q.door = { x: x - hw * 0.62 + 2.75 * s, y: y - 5 * s };
        g.fillStyle = C.glass; q.wins = []; // rebuilt on every repaint (a theme change repaints the village)
        const wx = [x + 1 * s, x + 7.5 * s], wy = y - 12 * s;
        wx.forEach(cx => { roundRect(g, cx - 2.6 * s, wy - 3 * s, 5.2 * s, 6.5 * s, 2.4 * s); g.fill(); q.wins.push({ x: cx, y: wy, w: 5.2 * s, h: 6.5 * s }); });
        q.win = { x: (wx[0] + wx[1]) / 2, y: wy };
        if (q.kind === 'you') { // your own cottage gets a little round attic window and a doorstep
          g.fillStyle = C.glass; g.beginPath(); g.arc(x - hw * 0.1, y - hh - 6 * s, 2.6 * s, 0, TAU); g.fill(); q.wins.push({ x: x - hw * 0.1, y: y - hh - 6 * s, r: 2.6 * s });
          g.fillStyle = mixHex(C.hill[4], '#ffffff', 0.12); g.fillRect(x - hw * 0.62 - 2 * s, y - 1, 9.5 * s, 2 * s);
        }
      }
      function roundRect(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r); g.lineTo(x + w, y + hh); g.lineTo(x, y + hh); g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r); g.closePath(); }
      function pathStones(g, D) {
        const pth = G.path; if (!pth.length) return;
        for (let d = 8, k = 0; d < G.plen - 6; d += 11, k++) {
          const p = at(d), q = at(d + 3), nx = -(q.y - p.y), ny = q.x - p.x, nl = Math.hypot(nx, ny) || 1, off2 = (k % 2 ? 3 : -3);
          const sc = 0.65 + 0.55 * ((p.y - G.layers[2].y) / (G.H - G.layers[2].y));
          g.fillStyle = D ? 'rgba(160,190,200,0.28)' : 'rgba(255,240,225,0.45)'; g.beginPath(); g.ellipse(p.x + nx / nl * off2, p.y + ny / nl * off2, 4.6 * sc, 2.3 * sc, Math.atan2(q.y - p.y, q.x - p.x), 0, TAU); g.fill();
        }
        G.lanterns.forEach(ln => { g.fillStyle = D ? '#0b1218' : '#2a2a3a'; g.fillRect(ln.x - 1, ln.y - 14, 2, 15); g.fillStyle = D ? '#22303a' : '#4a4a62'; roundRect(g, ln.x - 3.5, ln.y - 21, 7, 8, 2); g.fill(); });
      }

      /* ---------------- drawing ---------------- */
      function draw(g, dt, t) {
        const w = G.w, H = G.H, D = dark();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.drawImage(L.bg.c, 0, 0, w, H);
        g.fillStyle = '#fff';
        for (const s of twinkles) { const a = (0.2 + 0.5 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * (D ? 1 : 0.6); g.globalAlpha = a; g.fillRect(s.x, s.y, s.s, s.s); }
        g.globalAlpha = 1;
        // the clouds catch the glow from below, and the hill warms as it lights
        const glowK = Math.min(1, litCount / Math.max(1, G.houses.length));
        if (!D && glowK > 0.01) { g.globalAlpha = Math.min(0.38, glowK * 0.45); g.fillStyle = '#141a3e'; g.fillRect(0, 0, w, H); g.globalAlpha = 1; }
        if (L.cloudLit && glowK > 0.02) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, glowK * 1.1) * (D ? 0.75 : 0.5); g.drawImage(L.cloudLit.c, 0, 0, G.w, G.layers[0].y + 40); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        if (W.warm > 0.01) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = W.warm * (D ? 0.32 : 0.22); g.drawImage(WARM, -w * 0.2, G.layers[1].y - H * 0.1, w * 1.4, H * 1.1); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        // lit cottages: spill, windows, porch lamp, a bloom ring when they first light
        g.globalCompositeOperation = 'lighter';
        for (const q of G.houses) {
          if (q.lit < 0.01) continue;
          const k = q.lit, s = q.s, fl = 0.92 + 0.08 * Math.sin(t * 3 + q.ph) * Math.sin(t * 7.3 + q.ph * 2), cool = q.cool;
          g.globalAlpha = Math.min(1, (0.62 + W.warm * 0.25) * k * fl); g.drawImage(cool ? COOL : WARM, q.win.x - 52 * s, q.win.y - 52 * s, 104 * s, 104 * s);
          g.globalAlpha = 0.55 * k; g.drawImage(SPILL, q.x - 40 * s, q.y - 9 * s, 80 * s, 24 * s);
          if (q.bloom > 0.01) { g.globalAlpha = q.bloom * 0.8; g.strokeStyle = cool ? '#d6ccff' : '#ffe2a6'; g.lineWidth = 2; g.beginPath(); g.arc(q.win.x, q.win.y, (1 - q.bloom) * 60 * s + 8, 0, TAU); g.stroke(); }
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        for (const q of G.houses) {
          if (q.lit < 0.01) continue;
          const k = q.lit;
          g.globalAlpha = k; g.fillStyle = q.cool ? '#d9d0ff' : '#ffd98a';
          for (const wn of q.wins) { if (wn.r) { g.beginPath(); g.arc(wn.x, wn.y, wn.r, 0, TAU); g.fill(); } else { roundRect(g, wn.x - wn.w / 2, wn.y - wn.h / 2 + 0.2, wn.w, wn.h, wn.w * 0.46); g.fill(); } }
          g.fillStyle = q.cool ? '#f4f0ff' : '#fff4d6'; g.globalAlpha = k * 0.8;
          for (const wn of q.wins) { if (!wn.r) g.fillRect(wn.x - wn.w * 0.18, wn.y - wn.h * 0.12, wn.w * 0.36, wn.h * 0.36); }
          g.fillStyle = q.cool ? '#b8acf2' : '#ffb35a'; g.fillRect(q.door.x - 1, q.door.y - 7 * q.s, 2, 2);
          if (q.sign) drawSign(g, q);
          if (q.waver > 0) drawWaver(g, q, t);
        }
        g.globalAlpha = 1;
        // the finale: every lit cottage is joined to its neighbour by a thread of light, with glints passing along it
        if (W.links > 0.01) {
          g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
          for (const l of G.links) {
            if (l.a.lit < 0.5 || l.b.lit < 0.5) continue;
            const ax = l.a.win.x, ay = l.a.win.y, bx = l.b.win.x, by = l.b.win.y, cx = (ax + bx) / 2, cy = Math.min(ay, by) - 12 - Math.abs(bx - ax) * 0.12;
            g.strokeStyle = l.a.cool || l.b.cool ? '#cfc4ff' : '#ffcf7a'; g.globalAlpha = 0.22 * W.links; g.lineWidth = 1.4;
            g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(cx, cy, bx, by); g.stroke();
            const k = (t * l.sp + l.ph) % 1, u = 1 - k, px = u * u * ax + 2 * u * k * cx + k * k * bx, py = u * u * ay + 2 * u * k * cy + k * k * by;
            g.globalAlpha = 0.85 * W.links * Math.sin(k * Math.PI); g.drawImage(MOTE, px - 5, py - 5, 10, 10);
          }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        // the walked path keeps a trail of light, and its lanterns stay lit
        if (W.trail > 0) {
          g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffcf7a'; g.lineCap = 'round'; g.lineJoin = 'round';
          g.globalAlpha = 0.22; g.lineWidth = 7; tracePath(g, W.trail); g.stroke();
          g.globalAlpha = 0.55; g.lineWidth = 2; tracePath(g, W.trail); g.stroke();
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
        for (const ln of G.lanterns) {
          if (ln.lit < 0.01) continue;
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 * ln.lit; g.drawImage(WARM, ln.x - 22, ln.y - 39, 44, 44);
          g.globalCompositeOperation = 'source-over'; g.globalAlpha = ln.lit; g.fillStyle = '#ffe2a0'; roundRect(g, ln.x - 2.5, ln.y - 20, 5, 6, 1.5); g.fill();
        }
        g.globalAlpha = 1;
        // the bowl glows while the orb rests in it
        if (ORB.mode === 'rest' || ORB.mode === 'held') { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + ORB.charge * 0.4; g.drawImage(SPILL, G.bowl.x - 70, G.bowl.y - 22, 140, 44); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
        drawSeeds(g, t);
        P.update(dt); P.draw(g);
        drawOrb(g, t);
      }
      function tracePath(g, upto) { g.beginPath(); let first = true; for (const p of G.path) { if (p.s > upto) break; if (first) { g.moveTo(p.x, p.y); first = false; } else g.lineTo(p.x, p.y); } const e = at(upto); g.lineTo(e.x, e.y); }
      function drawSign(g, q) {
        const x = q.door.x, y = q.y - 30 * q.s - 10, r = 7;
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(WARM, x - 18, y - 18, 36, 36); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.save(); g.translate(x - r, y - r); g.scale(r * 2 / 24, r * 2 / 24); g.strokeStyle = '#ffe2a6'; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(new Path2D(q.sign)); g.restore();
      }
      function drawWaver(g, q, t) { // a tiny figure waves back from the far window
        const x = q.wins[0].x, y = q.wins[0].y + 1, a = Math.sin(t * 6) * 0.6;
        g.fillStyle = 'rgba(40,24,10,0.85)'; g.beginPath(); g.arc(x, y - 1.2 * q.s, 1.2 * q.s, 0, TAU); g.fill(); g.fillRect(x - 1 * q.s, y, 2 * q.s, 2 * q.s);
        g.strokeStyle = 'rgba(40,24,10,0.85)'; g.lineWidth = 0.8 * q.s; g.beginPath(); g.moveTo(x + 0.8 * q.s, y); g.lineTo(x + (1.6 + Math.cos(a)) * q.s, y - (1.6 + Math.sin(a + 1)) * q.s); g.stroke();
      }
      function motif(g, x, y, r, t) {
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.strokeStyle = 'rgba(255,250,235,0.95)'; g.lineWidth = Math.max(1.2, r * 0.18); g.lineCap = 'round'; g.lineJoin = 'round';
        const id = STY.id;
        if (id === 'star') { K.starPath(g, x, y, r, r * 0.45, 5, t * 0.3); g.fill(); }
        else if (id === 'flower') { for (let i = 0; i < 5; i++) { const a = t * 0.4 + i * TAU / 5; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.42, r * 0.24, a, 0, TAU); g.fill(); } }
        else if (id === 'moon') { g.beginPath(); g.arc(x, y, r * 0.8, 0.6, TAU - 0.6); g.arc(x + r * 0.42, y, r * 0.62, TAU - 0.95, 0.95, true); g.closePath(); g.fill(); }
        else if (id === 'ember') { const f = Math.sin(t * 9) * 0.08; g.beginPath(); g.moveTo(x, y - r * (1.05 + f)); g.quadraticCurveTo(x + r * 0.85, y - r * 0.1, x, y + r * 0.75); g.quadraticCurveTo(x - r * 0.85, y - r * 0.1, x, y - r * (1.05 + f)); g.fill(); }
        else if (id === 'heart') { const s2 = r / 17; g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, hx = 16 * Math.pow(Math.sin(a), 3), hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); if (i) g.lineTo(x + hx * s2, y + hy * s2); else g.moveTo(x + hx * s2, y + hy * s2); } g.closePath(); g.fill(); }
        else { for (let i = 0; i < 4; i++) { const a = t * (1.4 + i * 0.3) + i * 1.7; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a * 1.3) * r * 0.45, r * 0.18, 0, TAU); g.fill(); } }
      }
      function drawOrb(g, t) {
        if (ORB.mode === 'gone' || ORB.alpha <= 0.01) return;
        const k = ORB.charge, fl = ORB.flicker, x = ORB.x, y = ORB.y;
        const jit = fl > 0 ? fl * (RED ? 0.18 : 0.45) * Math.max(0, Math.sin(t * 23) * 0.6 + Math.sin(t * 37 + 1) * 0.5) : 0;
        const a = ORB.alpha * (1 - jit), Rr = (15 + k * 15 + Math.sin(t * 2.4) * 1.5 * (1 - fl)) * ORB.scale;
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.55 * a; g.drawImage(fl > 0.35 ? COOL : HALO, x - Rr * 3.2, y - Rr * 3.2, Rr * 6.4, Rr * 6.4);
        if (fl > 0.05 && fl <= 0.35) { g.globalAlpha = 0.4 * a * fl / 0.35; g.drawImage(COOL, x - Rr * 3, y - Rr * 3, Rr * 6, Rr * 6); }
        g.globalAlpha = 0.95 * a; g.drawImage(CORE, x - Rr * 1.15, y - Rr * 1.15, Rr * 2.3, Rr * 2.3);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.85 * a; motif(g, x, y, Rr * 0.48, t);
        g.globalCompositeOperation = 'lighter';
        const nm = 3 + Math.round(k * 4);
        for (let i = 0; i < nm; i++) { const ang = t * (1.1 + i * 0.17) + i * 2.1, rr = Rr * (1.35 + 0.3 * Math.sin(t * 1.3 + i)); g.globalAlpha = 0.75 * a; g.drawImage(MOTE, x + Math.cos(ang) * rr - 4, y + Math.sin(ang) * rr * 0.8 - 4, 8, 8); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }

      /* ---------------- frame loop ---------------- */
      let phase = 'intro', drawn = 0, half = 0, acc = 0, qAcc = 0, qN = 0, quality = 1;
      K.loop((dtIn, t) => {
        const g = cv.g; if (!g || !L.bg) return;
        if (phase === 'intro' && drawn > 2) return;
        if (dtIn < 0.25) { qAcc += dtIn; qN++; if (qN >= 90) { if (qAcc / qN > 0.07 && quality > 0.8) { quality = 0.8; cv.setQuality(quality); } qAcc = 0; qN = 0; } }
        acc += dtIn;
        const busy = HOLDS.on || ORB.mode === 'drag' || ORB.mode === 'path' || ORB.mode === 'fly' || ORB.mode === 'drift' || ORB.mode === 'return' || seeds.length || G.houses.some(q => Math.abs(q.lit - q.litT) > 0.002 || q.bloom > 0.01) || W.fly > 0;
        if (!busy && (half ^= 1)) return; // while nothing moves but twinkles and smoke, paint every other frame
        const dt = Math.min(0.06, acc); acc = 0;
        const now = performance.now(), rdt = Math.min(0.25, Math.max(0, (now - (W.lastNow || now)) / 1000)); W.lastNow = now;
        update(dt, t, rdt);
        draw(g, dt, t);
        drawn++;
      });
      function update(dt, t, rdt) {
        W.warm += (W.warmT - W.warm) * Math.min(1, dt * 0.6); W.links += (W.linksT - W.links) * Math.min(1, dt * 0.7);
        W.fly = Math.max(0, W.fly - dt);
        for (const q of G.houses) {
          if (q.lit !== q.litT) { q.lit += (q.litT - q.lit) * Math.min(1, dt * 2.4); if (Math.abs(q.lit - q.litT) < 0.002) q.lit = q.litT; }
          if (q.bloom > 0) q.bloom = Math.max(0, q.bloom - dt * 1.3);
          if (q.litT > 0 && q.chim && rnd() < dt * 0.35) P.emit('smoke', q.chim.x, q.chim.y, 1, { speed: [4, 10], angle: -Math.PI / 2 - 0.2, spread: 0.4, size: [2 * q.s, 4 * q.s], colors: [dark() ? 'rgba(210,214,230,0.14)' : 'rgba(255,255,255,0.2)'] });
          if (q.waver > 0) q.waver = Math.max(0, q.waver - dt);
        }
        for (const ln of G.lanterns) if (ln.lit > 0 && ln.lit < 1) ln.lit = Math.min(1, ln.lit + dt * 3);
        // the season drifts across the hill
        const fr = SEA.fall === 'fly' ? 0.9 : SEA.fall === 'snow' ? (G.phone ? 6 : 12) : 1.4;
        if (rnd() < dt * fr * (RED ? 0.4 : 1)) {
          if (SEA.fall === 'fly') P.emit('mote', rnd() * G.w, G.layers[2].y + rnd() * (G.H - G.layers[2].y), 1, { colors: SEA.fallC });
          else P.emit(SEA.fall, rnd() * G.w, -8, 1, { angle: Math.PI / 2 + 0.3, spread: 0.6, speed: [14, 40], colors: SEA.fallC });
        }
        if (phase === 'finale' && rnd() < dt * (RED ? 3 : 9)) P.emit('mote', rnd() * G.w, G.layers[1].y + rnd() * (G.H - G.layers[1].y), 1, { colors: ['#e9ff9a', '#fff3a0', '#ffe2a6'], speed: [10, 26] });
        stepHold();
        stepOrb(dt, t, rdt);
        stepSeeds(dt);
        syncDom();
      }
      const rnd = Math.random;

      /* ---------------- holding the glow: the wish forms word by word ---------------- */
      const HOLDS = { on: false, down: false, k: 0, need: HOLD, words: [], shown: 0, breaks: 0, held: 0, total: 0, onDone: null, flick: 0 };
      let steadyNum = 0, steadyDen = 0, encouraged = false, wishTok = 0;
      function startHold(kind, need, onDone, opts) {
        opts = opts || {};
        const text = line(WISH[kind]);
        wishEl.textContent = ''; wishTok++;
        const ln = h('span', { class: 'pg-line' });
        const words = text.split(' ').map(wd => { const i = h('i', { text: wd }); ln.append(i, document.createTextNode(' ')); return i; });
        wishEl.append(ln);
        if (opts.even) wishEl.append(h('span', { class: 'pg-even' }, document.createTextNode('…even with '), h('span', { class: 'gk-user', text: opts.even })));
        wishEl.classList.remove('pg-off');
        Object.assign(HOLDS, { on: true, down: false, k: 0, need, words, shown: 0, breaks: 0, held: 0, total: 0, onDone, kind, lastT: performance.now() });
        ORB.charge = 0; ORB.mode = 'held'; ORB.flicker = opts.flicker ? 1 : 0;
        orbHit.setAttribute('aria-label', 'The glow. Press and hold to warm the wish: ' + text);
      }
      function stepHold() {
        if (!HOLDS.on) return;
        const now = performance.now(), dt = Math.min(0.25, Math.max(0, (now - (HOLDS.lastT || now)) / 1000)); HOLDS.lastT = now;
        HOLDS.total += dt;
        if (HOLDS.down) { HOLDS.k = Math.min(1, HOLDS.k + dt / HOLDS.need); HOLDS.held += dt; }
        else HOLDS.k = Math.max(0, HOLDS.k - dt * 0.2);
        ORB.charge = HOLDS.k;
        if (ORB.flicker > 0) {
          ORB.flicker = Math.max(0.05, 1 - HOLDS.k * 1.05);
          if (HOLDS.down && rnd() < dt * 3 * ORB.flicker) SND.sputter();
        }
        const want = Math.min(HOLDS.words.length, Math.floor(HOLDS.k * (HOLDS.words.length + 0.35) + 0.15));
        while (HOLDS.shown < want) { HOLDS.words[HOLDS.shown].classList.add('on'); SND.word(noteI % 5 + HOLDS.shown); HOLDS.shown++; P.emit('mote', ORB.x + (rnd() - 0.5) * 30, ORB.y - 10, 3, { colors: ['#fff3c4', '#ffd98a'], speed: [20, 50] }); }
        if (hum) { hum.level(HOLDS.down ? 0.03 + HOLDS.k * 0.06 : 0.0001, 0.12); hum.freq(360 + HOLDS.k * 620, 0.15); }
        if (HOLDS.k >= 1) {
          HOLDS.on = false; HOLDS.down = false;
          if (hum) hum.level(0.0001, 0.2);
          steadyNum += HOLDS.held; steadyDen += HOLDS.held + HOLDS.breaks * 0.6;
          SND.full(); W.pulse = 1; K.guide(null);
          const tok = ++wishTok; K.later(() => { if (tok === wishTok && !HOLDS.on) wishEl.classList.add('pg-off'); }, 1300);
          P.emit('star', ORB.x, ORB.y, 12, { colors: ['#fffbe6', '#ffe08a'], speed: [40, 120] });
          const fn = HOLDS.onDone; HOLDS.onDone = null; if (fn) fn();
        }
      }

      /* ---------------- the orb: held, carried home, walked up the path, flicked, drifting ---------------- */
      const CARRY = { s: 0, target: 0, on: false, lit: 0 };
      const FLY = { t: 0, dur: 1, x0: 0, y0: 0, cx: 0, cy: 0, x1: 0, y1: 0, onArrive: null };
      function flyTo(x1, y1, dur, lift, onArrive, mode) {
        Object.assign(FLY, { t: 0, dur, x0: ORB.x, y0: ORB.y, x1, y1, cx: (ORB.x + x1) / 2 + (mode === 'drift' ? -40 : 0), cy: Math.min(ORB.y, y1) - lift, onArrive });
        ORB.mode = mode || 'fly';
      }
      function stepOrb(dt, t, rdt) { // walking and flying run on the real clock, so they finish on time even when frames are slow
        const m = ORB.mode;
        if (m === 'rest' || m === 'held') { ORB.tx = G.bowl.x; ORB.ty = G.bowl.y - 18 + Math.sin(t * 1.6) * 3; ORB.x += (ORB.tx - ORB.x) * Math.min(1, dt * 8); ORB.y += (ORB.ty - ORB.y) * Math.min(1, dt * 8); }
        else if (m === 'drag') { ORB.x += (ORB.tx - ORB.x) * Math.min(1, dt * 16); ORB.y += (ORB.ty - ORB.y) * Math.min(1, dt * 16); }
        else if (m === 'return') { ORB.x += (G.bowl.x - ORB.x) * Math.min(1, dt * 6); ORB.y += (G.bowl.y - 18 - ORB.y) * Math.min(1, dt * 6); if (Math.hypot(ORB.x - G.bowl.x, ORB.y - G.bowl.y + 18) < 3) ORB.mode = 'rest'; }
        else if (m === 'path') {
          CARRY.s = Math.min(CARRY.target, CARRY.s + SPEED * rdt); // once steered, the glow walks on to where you pointed
          const p = at(CARRY.s); ORB.x = p.x; ORB.y = p.y - 12 + Math.sin(t * 5) * 1.2;
          W.trail = Math.max(W.trail || 0, CARRY.s);
          G.lanterns.forEach((ln, i) => { if (!ln.lit && CARRY.s >= ln.s) { ln.lit = 0.01; SND.lamp(i); P.emit('mote', ln.x, ln.y - 18, 4, { colors: ['#fff3c4', '#ffd98a'] }); } });
          if (CARRY.on && rnd() < dt * 20) P.emit('mote', ORB.x, ORB.y, 1, { colors: ['#ffe2a6', '#fff6d8'], speed: [6, 18] });
          if (CARRY.s >= G.plen - 3) { CARRY.on = false; arriveLoved(); }
          else if (!CARRY.on && CARRY.s >= CARRY.target - 0.5 && !CARRY.waitGuide) { CARRY.waitGuide = true; guidePath(900); }
        }
        else if (m === 'fly' || m === 'drift') {
          FLY.t = Math.min(1, FLY.t + rdt / FLY.dur);
          const e = m === 'drift' ? K.ease.inOutSine(FLY.t) : K.ease.inOutCubic(FLY.t), u = 1 - e;
          ORB.x = u * u * FLY.x0 + 2 * u * e * FLY.cx + e * e * FLY.x1 + (m === 'drift' ? Math.sin(FLY.t * 9) * 6 * (1 - FLY.t) : 0);
          ORB.y = u * u * FLY.y0 + 2 * u * e * FLY.cy + e * e * FLY.y1;
          ORB.scale = 1 - 0.55 * e;
          if (rnd() < dt * 40) P.emit('mote', ORB.x, ORB.y, 1, { colors: m === 'drift' ? ['#e6e0ff', '#fff6d8'] : ['#ffe2a6', '#fff6d8'], speed: [4, 14] });
          if (FLY.t >= 1) { ORB.mode = 'gone'; ORB.scale = 1; const fn = FLY.onArrive; FLY.onArrive = null; if (fn) fn(); }
        }
      }
      function syncDom() {
        if (!G.w) return;
        const show = ORB.mode !== 'gone' && ORB.mode !== 'fly' && ORB.mode !== 'drift';
        orbHit.style.transform = `translate(${ORB.x.toFixed(1)}px, ${ORB.y.toFixed(1)}px)`;
        orbHit.hidden = !show;
        wishEl.style.top = Math.round(Math.min(G.bowl.y - 64, ORB.y - 52)) + 'px';
      }
      function light(q, cool, quiet) {
        if (q.litT > 0) return;
        q.litT = 1; q.bloom = quiet ? 0 : 1; q.cool = !!cool;
        if (!quiet) SND.light();
        P.emit('star', q.win.x, q.win.y, 8, { colors: cool ? ['#efeaff', '#d6ccff'] : ['#fff6d8', '#ffd98a'], speed: [30, 80] });
        litCount++;
        music.level(Math.min(0.85, 0.55 + litCount * 0.012));
      }
      let litCount = 0;

      /* ---------------- input on the glow ---------------- */
      let grab = null, track = [];
      K.press(orbHit, {
        space: el,
        down: (p) => {
          if (HOLDS.on) { HOLDS.down = true; humOn(); if (hum) hum.level(0.03, 0.1); ORB.scale = 1.08; P.emit('mote', ORB.x, ORB.y, 4, { colors: ['#fff3c4', '#ffd98a'], speed: [20, 60] }); if (A.ctx) A.sync('hold', performance.now()); return; }
          track = [{ x: p.x, y: p.y, t: performance.now() }];
          if (phase === 'self-carry' || phase === 'neutral-fling') { grab = { x: p.x - ORB.x, y: p.y - ORB.y }; ORB.mode = 'drag'; ORB.tx = ORB.x; ORB.ty = ORB.y; SND.grab(); }
          else if (phase === 'loved-carry') { CARRY.on = true; CARRY.waitGuide = true; SND.grab(); onPathMove(p); }
          else if (phase === 'all-ready') releaseSeeds();
        },
        move: (p) => {
          track.push({ x: p.x, y: p.y, t: performance.now() }); if (track.length > 8) track.shift();
          if (ORB.mode === 'drag' && grab) {
            let tx = p.x - grab.x, ty = p.y - grab.y;
            if (phase === 'neutral-fling') { const dx = tx - G.bowl.x, dy = ty - (G.bowl.y - 18), d = Math.hypot(dx, dy), max = 95; if (d > max) { tx = G.bowl.x + dx / d * max; ty = G.bowl.y - 18 + dy / d * max; } }
            ORB.tx = tx; ORB.ty = ty;
            if (phase === 'self-carry' && Math.hypot(tx - G.home.x, ty - G.home.y) < (G.phone ? 46 : 52)) arriveHome();
          }
          else if (phase === 'loved-carry' && CARRY.on) onPathMove(p);
        },
        up: (p) => {
          if (HOLDS.on) { if (HOLDS.down) { HOLDS.down = false; ORB.scale = 1; if (HOLDS.k < 0.98) { HOLDS.breaks++; nudgeHold(); } } return; }
          if (phase === 'all-ready') { releaseSeeds(); return; }
          if (phase === 'loved-carry') { CARRY.on = false; CARRY.waitGuide = false; return; }
          if (ORB.mode !== 'drag') return;
          grab = null;
          if (phase === 'self-carry') { ORB.mode = 'return'; SND.back(); K.later(() => { if (phase === 'self-carry') guideHome(300); }, 600); patch.say(line({ Jolly: 'Almost. Bring it right to your window.', Cheeky: 'Your house is the big one on the left. Probably.', Unfiltered: 'To your window.' }), { ms: 2600 }); return; }
          if (phase === 'neutral-fling') {
            const a = track[0], b = track[track.length - 1], dtm = Math.max(16, b.t - a.t), vx = (b.x - a.x) / dtm * 1000, vy = (b.y - a.y) / dtm * 1000;
            if (vy < -300 || (G.bowl.y - 18 - ORB.ty) > 70) flingNeutral(Math.min(1, -vy / 1600), vx);
            else { ORB.mode = 'return'; SND.back(); K.later(() => { if (phase === 'neutral-fling') guideFling(200); }, 600); patch.say(line({ Jolly: 'A bit more flick! Up and over the valley.', Cheeky: 'Put some wrist into it.', Unfiltered: 'Flick it harder.' }), { ms: 2400 }); }
          }
        }
      });
      S.listen(orbHit, 'keydown', (e) => {
        if (e.code !== 'Space' && e.code !== 'Enter') return;
        e.preventDefault(); A.unlock();
        if (HOLDS.on && !e.repeat) { HOLDS.down = true; humOn(); }
        else if (!e.repeat) { if (phase === 'self-carry') arriveHome(); else if (phase === 'loved-carry') { CARRY.on = true; CARRY.target = G.plen; } else if (phase === 'neutral-fling') flingNeutral(0.8, 0); else if (phase === 'all-ready') releaseSeeds(); }
      });
      S.listen(orbHit, 'keyup', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && HOLDS.on && HOLDS.down) { HOLDS.down = false; if (HOLDS.k < 0.98) HOLDS.breaks++; } });
      function onPathMove(p) {
        let best = CARRY.s, bd = Infinity;
        for (const q of G.path) { if (q.s < CARRY.s - 30 || q.s > CARRY.s + 230) continue; const d = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y); if (d < bd) { bd = d; best = q.s; } }
        if (Math.sqrt(bd) < 110) CARRY.target = Math.max(CARRY.target, best);
      }
      function nudgeHold() {
        if (encouraged) return; encouraged = true;
        patch.say(line({ Jolly: 'No rush. Keep holding while the wish forms.', Cheeky: 'Stay a sec. Wishes need a minute to warm up.', Unfiltered: 'Keep holding.' }), { ms: 2600 });
      }

      /* ---------------- guides ---------------- */
      let gShown = performance.now();
      S.on('guide', (e) => { if (e && e.visible) gShown = performance.now(); });
      const guideHold = (label, delay) => K.guide({ id: 'hold-' + phase, g: 'hold', target: () => ({ x: ORB.x, y: ORB.y }), label, ms: Math.round(HOLDS.need * 1000), place: 'below', delay: delay ?? 700 });
      const guideHome = (delay) => K.guide({ id: 'home', g: 'drag', target: () => ({ x: ORB.x, y: ORB.y }), dx: G.home.x - ORB.x, dy: G.home.y - ORB.y, label: 'CARRY IT HOME', ms: 1500, place: 'below', delay: delay ?? 600 });
      const guideFling = (delay) => K.guide({ id: 'fling', g: 'drag', target: () => ({ x: ORB.x, y: ORB.y }), dx: 50, dy: -110, label: 'FLICK IT ACROSS', ms: 700, place: 'below', delay: delay ?? 600 });
      function guidePath(delay) {
        const period = 2600;
        K.guide({ id: 'path-' + Math.round(CARRY.s), g: 'hold', ms: period, label: 'FOLLOW THE PATH', place: 'below', delay: delay ?? 700,
          target: () => { const ph = ((performance.now() - gShown) % period) / period, k = ph < 0.12 ? 0 : ph > 0.85 ? 1 : K.ease.inOutSine((ph - 0.12) / 0.73), p = at(CARRY.s + k * Math.min(170, G.plen - CARRY.s)); return { x: p.x, y: p.y - 12 }; } });
      }
      const choose = (label, chips) => K.guide({ id: 'choose-' + phase, g: 'choose', target: () => chips.filter(c => c.isConnected), label, place: 'above', delay: 900 });

      /* ---------------- the five wishes ---------------- */
      let finished = false, chosenLoved = null, chosenNeutral = '', diffChoice = '', wishes = 0;
      function showPanel(title, sub, items, onPick, plain) {
        panel.textContent = '';
        const row = h('div', { class: 'pg-chips' });
        const chips = items.map(it => {
          const b = h('button', { type: 'button', class: 'pg-chip' + (plain || !it.icon ? ' pg-plain' : '') }, it.icon ? h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[it.icon] + '</svg>' }) : null, h('span', { text: it.label }));
          S.listen(b, 'pointerdown', () => { if (A.ctx) A.click({ vol: 0.08 }); });
          b.addEventListener('click', () => { if (panel.classList.contains('pg-away')) return; b.classList.add('pg-picked'); onPick(it); });
          row.append(b); return b;
        });
        panel.append(row, h('p', { class: 'pg-pnote' }, h('b', { text: title }), sub ? document.createTextNode(sub) : null));
        panel.setAttribute('aria-label', title);
        panel.classList.remove('pg-away');
        return chips;
      }
      const hidePanel = () => panel.classList.add('pg-away');
      function speaker(c) { [patch, still, drop].forEach(x => { if (x !== c) { x.hush(); x.show(false); } }); c.show(true); c.react('bounce'); return c; }

      function stepSelf() {
        phase = 'self-hold';
        speaker(patch).say(line(G.houses.some(q => q.isNew)
          ? { Jolly: 'Someone new moved in since last time. Let’s light the hill again, one small wish at a time.', Cheeky: 'New neighbours! The hill’s growing. Let’s light it up again.', Unfiltered: 'A new house on the hill. Let’s light it.' }
          : { Jolly: 'Dark night on the hill. Let’s light it, one small wish at a time.', Cheeky: 'Lights out everywhere. We’re fixing that, one wish at a time.', Unfiltered: 'Dark hill. One small wish at a time.' }), { ms: 3600 });
        K.later(() => { if (phase === 'self-hold') { speaker(still).say(line({ Jolly: 'First one’s for you. Hold the glow and let the wish form.', Cheeky: 'You first. Yes, really. Hold the glow.', Unfiltered: 'Start with you. Hold it.' }), { ms: 4200 }); } }, 3500);
        startHold('self', HOLD, () => {
          wishes++;
          phase = 'self-carry'; ORB.mode = 'rest';
          still.face('happy', 1600);
          guideHome(500);
        }, { even: ownCore });
        guideHold('HOLD THE GLOW', 1600);
      }
      function arriveHome() {
        if (phase !== 'self-carry') return;
        phase = 'self-lit'; grab = null; K.guide(null);
        wishEl.classList.add('pg-off');
        flyTo(G.home.x, G.home.y, RED ? 0.2 : 0.45, 20, () => {
          light(G.you);
          speaker(still).say(line({ Jolly: 'There. Your window’s lit. That one counts.', Cheeky: 'Look at you, glowing. Literally.', Unfiltered: 'Your window’s lit.' }), { mood: 'E09', ms: 2800 });
          K.later(() => { speaker(patch); stepLoved(); }, 2600);
        });
      }
      function stepLoved() {
        phase = 'loved-pick';
        resetOrb();
        patch.say(line({ Jolly: 'Now someone you care about. No names, just who.', Cheeky: 'Who’s your person? No names needed.', Unfiltered: 'Someone you care about.' }), { mood: 'love', ms: 3800 });
        const chips = showPanel('Someone you care about', 'No names. Just pick who.', LOVED.map(x => ({ label: x.label, icon: x.id, id: x.id })), (it) => {
          if (phase !== 'loved-pick') return;
          chosenLoved = it.id; ctx.track('loved', { who: it.id });
          K.sfx.good(); K.guide(null);
          K.later(() => { hidePanel(); phase = 'loved-hold';
            startHold('loved', HOLD, () => { wishes++; phase = 'loved-carry'; ORB.mode = 'path'; CARRY.s = 0; CARRY.target = 0; CARRY.waitGuide = true; W.trail = 0; patch.say(line({ Jolly: 'Walk it up the path to their door. Slowly is nice.', Cheeky: 'Hand delivery. Follow the path, no shortcuts.', Unfiltered: 'Follow the path up.' }), { ms: 3000 }); guidePath(500); });
            guideHold('HOLD: WISH THEM WELL', 900);
          }, 450);
        });
        choose('PICK WHO', chips);
      }
      function arriveLoved() {
        if (phase !== 'loved-carry') return;
        phase = 'loved-lit'; K.guide(null);
        wishEl.classList.add('pg-off');
        flyTo(G.loved.win.x, G.loved.win.y, RED ? 0.2 : 0.4, 16, () => {
          G.loved.sign = SIGN[chosenLoved] || SIGN.friend;
          light(G.loved);
          tag(G.loved, (LOVED.find(x => x.id === chosenLoved) || LOVED[0]).label);
          patch.say(line({ Jolly: 'Their window’s glowing. You did that.', Cheeky: 'Delivered. No tracking number needed.', Unfiltered: 'Their light’s on.' }), { mood: 'happy', ms: 2800 });
          K.later(stepNeutral, 2700);
        });
      }
      function stepNeutral() {
        phase = 'neutral-pick';
        resetOrb();
        patch.say(line({ Jolly: 'Now someone you barely know. They live across the valley.', Cheeky: 'Background characters need love too. Pick one.', Unfiltered: 'Someone neutral.' }), { ms: 3600 });
        const opts = K.shuffle(NEUTRAL, K.rng(dayN + 19)).slice(0, 4);
        const chips = showPanel('Someone neutral', 'Someone you see around, but don’t really know.', opts.map(x => ({ label: x })), (it) => {
          if (phase !== 'neutral-pick') return;
          chosenNeutral = it.label; K.sfx.good(); K.guide(null);
          K.later(() => { hidePanel(); phase = 'neutral-hold';
            startHold('neutral', HOLD * 0.9, () => { wishes++; phase = 'neutral-fling'; ORB.mode = 'rest'; patch.say(line({ Jolly: 'Their window’s way over there. Give it a flick!', Cheeky: 'Long-distance delivery. Flick it.', Unfiltered: 'Flick it across.' }), { ms: 2600 }); guideFling(500); });
            guideHold('HOLD THE GLOW', 900);
          }, 450);
        }, true);
        choose('PICK SOMEONE', chips);
      }
      function flingNeutral(power, vx) {
        if (phase !== 'neutral-fling') return;
        phase = 'neutral-fly'; K.guide(null); grab = null;
        wishEl.classList.add('pg-off');
        SND.whoosh(); W.fly = 1.5;
        const q = G.neutral;
        flyTo(q.win.x, q.win.y, RED ? 0.4 : 1.05 + (1 - power) * 0.2, 90 + power * 90 + Math.abs(vx) * 0.02, () => {
          light(q); q.waver = 4;
          tag(q, chosenNeutral);
          patch.say(line({ Jolly: 'Strangers count too. Look, a little wave.', Cheeky: 'Bullseye. They’re waving. Probably at you.', Unfiltered: 'Lit. They waved.' }), { mood: 'laugh', ms: 2800 });
          K.later(stepDiff, 2800);
        });
      }
      function stepDiff() {
        phase = 'diff-ask';
        resetOrb();
        speaker(drop).say(line({ Jolly: 'One more house, far up on the ridge. Someone who’s hard for you. Only if you want.', Cheeky: 'Optional bonus round: someone difficult. Skipping is totally fine.', Unfiltered: 'Someone difficult. Optional. Skipping is fine.' }), { ms: 5200 });
        const chips = showPanel('Someone difficult? Only if you want.', 'A wish isn’t saying what happened was okay.', [{ label: 'Send a small wish', id: 'yes' }, { label: 'Not today', id: 'skip' }], (it) => {
          if (phase !== 'diff-ask') return;
          diffChoice = it.id; ctx.track('difficult', { choice: it.id });
          K.guide(null); hidePanel();
          if (it.id === 'skip') {
            K.sfx.soft();
            drop.say(line({ Jolly: 'Not today is a kind choice too.', Cheeky: 'Totally fair. Their house can stay dark tonight.', Unfiltered: 'Fine. Your call.' }), { mood: 'love', ms: 2600 });
            K.later(() => { speaker(patch); stepAll(); }, 2500);
            return;
          }
          phase = 'diff-hold';
          drop.say(line({ Jolly: 'It might flicker. That’s normal. Just hold a little longer.', Cheeky: 'It’ll sputter. Hard ones do. Hold on a bit longer.', Unfiltered: 'It’ll flicker. Hold longer.' }), { ms: 3200 });
          SND.sputter();
          startHold('diff', HOLD * 1.7, () => {
            wishes++; phase = 'diff-drift';
            wishEl.classList.add('pg-off');
            drop.say(line({ Jolly: 'Let it drift. You don’t have to walk it there.', Cheeky: 'Let it float over. You can stay right here.', Unfiltered: 'Let it drift.' }), { ms: 2600 });
            const q = G.diff;
            flyTo(q.win.x, q.win.y, RED ? 0.6 : 2.6, 60, () => {
              light(q, true);
              drop.say(line({ Jolly: 'A little light, from a distance. That took something.', Cheeky: 'Done. From a safe distance. Very mature of you.', Unfiltered: 'A little light. From a distance.' }), { mood: 'love', ms: 3000 });
              K.later(() => { speaker(patch); stepAll(); }, 3000);
            }, 'drift');
          }, { flicker: true });
          guideHold('HOLD A LITTLE LONGER', 700);
        }, true);
        choose('ONLY IF YOU WANT', chips);
      }
      function stepAll() {
        phase = 'all-hold';
        resetOrb();
        patch.base('love');
        patch.say(line({ Jolly: 'Last one is for everyone. The whole hill, and you too.', Cheeky: 'Final round: everyone. Yes, even the noisy neighbours.', Unfiltered: 'Last one. Everyone.' }), { ms: 3600 });
        startHold('all', HOLD * 1.25, () => {
          wishes++; phase = 'all-ready';
          K.guide({ id: 'let-go', g: 'tap', target: () => ({ x: ORB.x, y: ORB.y }), label: 'LET IT GO', place: 'below', delay: 300 });
          K.later(() => { if (phase === 'all-ready') releaseSeeds(); }, 2600);
        });
        guideHold('HOLD FOR EVERYONE', 900);
      }
      function resetOrb() { ORB.mode = 'rest'; ORB.charge = 0; ORB.flicker = 0; ORB.alpha = 1; ORB.scale = 1; ORB.x = G.bowl.x; ORB.y = G.bowl.y - 40; wishEl.classList.add('pg-off'); }
      function tag(q, text) {
        const t = h('div', { class: 'pg-tag', text });
        t.style.left = K.clamp(q.x, 86, G.w - 86) + 'px'; t.style.top = (q.y - 34 * q.s - 18) + 'px';
        el.append(t); K.later(() => t.classList.add('pg-fade'), 2600); K.later(() => t.remove(), 3500);
      }

      /* ---------------- everyone: the glow lets go as seeds that drift to every dark window ---------------- */
      const seeds = [];
      function releaseSeeds() {
        if (phase !== 'all-ready') return;
        phase = 'all-seeds'; K.guide(null);
        wishEl.classList.add('pg-off');
        SND.bloom(); W.warmT = 0.5;
        const ox = ORB.x, oy = ORB.y;
        ORB.mode = 'gone';
        P.emit('star', ox, oy, 24, { colors: ['#fffbe6', '#ffe08a', '#ffd0a0'], speed: [60, 200] });
        const dark2 = G.houses.filter(q => q.litT === 0 && !(q.kind === 'diff' && diffChoice === 'skip'));
        dark2.sort((a, b) => Math.hypot(a.x - ox, a.y - oy) - Math.hypot(b.x - ox, b.y - oy));
        const now = performance.now();
        dark2.forEach((q, i) => {
          const d = Math.hypot(q.win.x - ox, q.win.y - oy), dur = (RED ? 0.6 : 1.4) + d / (RED ? 900 : 420) + rnd() * 0.5;
          seeds.push({ x0: ox, y0: oy, x1: q.win.x, y1: q.win.y, cx: (ox + q.win.x) / 2 + (rnd() - 0.5) * 140, cy: Math.min(oy, q.win.y) - 60 - rnd() * 120, t0: now + i * (RED ? 30 : 70), dur: dur * 1000, q, x: ox, y: oy, ph: rnd() * 6, i });
        });
        const nDecor = RED ? 24 : SOFTGFX ? 60 : 150;
        for (let i = 0; i < nDecor; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2.4, d = 120 + rnd() * 320; seeds.push({ x0: ox, y0: oy, x1: ox + Math.cos(a) * d, y1: oy + Math.sin(a) * d - 80, cx: ox + Math.cos(a) * d * 0.4, cy: oy - 60 - rnd() * 80, t0: now + rnd() * 600, dur: 2200 + rnd() * 1800, q: null, x: ox, y: oy, ph: rnd() * 6, i }); }
        patch.say(line({ Jolly: 'Let it go…', Cheeky: 'And… release the seeds.', Unfiltered: 'Let it go.' }), { mood: 'wow', ms: 2400 });
        ctx.track('seeds', { houses: dark2.length });
      }
      function stepSeeds() {
        if (!seeds.length) return;
        const now = performance.now();
        for (let i = seeds.length - 1; i >= 0; i--) {
          const s = seeds[i], k = (now - s.t0) / s.dur;
          if (k < 0) { s.vis = 0; continue; }
          const e = K.ease.inOutSine(Math.min(1, k)), u = 1 - e;
          s.x = u * u * s.x0 + 2 * u * e * s.cx + e * e * s.x1 + Math.sin(k * 7 + s.ph) * 10 * (1 - e);
          s.y = u * u * s.y0 + 2 * u * e * s.cy + e * e * s.y1;
          s.vis = s.q ? 1 : Math.max(0, 1 - k);
          if (k >= 1) { seeds.splice(i, 1); if (s.q) { light(s.q, false, true); SND.seed(s.i); } }
        }
        if (!seeds.length && phase === 'all-seeds') K.later(finale, 900);
      }
      function drawSeeds(g, t) { // dandelion seeds of light: one glow each, all their tufts in a single stroke
        if (!seeds.length) return;
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = '#fff6d8'; g.lineWidth = 0.8; g.globalAlpha = 0.3; g.beginPath();
        for (const s of seeds) {
          if (s.vis < 0.3) continue;
          const sw = Math.sin(t * 3 + s.ph) * 0.1;
          for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.32 + sw; g.moveTo(s.x, s.y); g.lineTo(s.x + Math.cos(a) * 7, s.y + Math.sin(a) * 7); }
        }
        g.stroke();
        for (const s of seeds) { if (!s.vis) continue; g.globalAlpha = 0.8 * s.vis; g.drawImage(MOTE, s.x - 6, s.y - 6, 12, 12); }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      }

      /* ---------------- finale: the whole hillside glows, fireflies rise, Patch hugs ---------------- */
      function placeFinaleCast() {
        const cs = G.phone ? 56 : 72;
        still.el.style.setProperty('--sz', cs + 'px'); drop.el.style.setProperty('--sz', cs + 'px');
        still.place(G.phone ? 16 : 40, G.H - cs - (G.phone ? 24 : 30)); drop.place(G.w - cs - (G.phone ? 16 : 40), G.H - cs - (G.phone ? 24 : 30));
      }
      async function finale() {
        if (phase === 'finale' || finished) return;
        phase = 'finale';
        W.warmT = 1; W.linksT = 1;
        G.lanterns.forEach(ln => { if (!ln.lit) ln.lit = 0.01; });
        W.trail = G.plen;
        G.houses.forEach(q => { if (!q.litT && !(q.kind === 'diff' && diffChoice === 'skip')) light(q, false, true); });
        speaker(patch); placeFinaleCast(); still.base('love'); drop.base('love'); still.show(true); drop.show(true); still.react('bounce'); drop.react('bounce');
        patch.base('hug'); patch.react('bounce');
        patch.say(line({ Jolly: 'Look at that. The whole hill’s glowing. Come here, you.', Cheeky: 'Whole village lit. Group hug. No escape.', Unfiltered: 'The whole hill. You lit it.' }), { ms: 0 });
        music.level(0.9);
        if (A.ctx) { A.pad([A.note('F3'), A.note('C4'), A.note('E4'), A.note('A4')], { dur: 6, vol: 0.14, attack: 1 }); ['C6', 'E6', 'G6', 'A6', 'C7'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + 0.4 + i * 0.22, vol: 0.05, dur: 2.4 })); }
        for (let i = 0; i < (RED ? 8 : 26); i++) P.emit('mote', rnd() * G.w, G.layers[2].y + rnd() * (G.H - G.layers[2].y), 1, { colors: ['#e9ff9a', '#fff3a0'], speed: [10, 30] });
        await K.sleep(RED ? 1500 : 5200);
        end();
      }
      function end() {
        if (finished) return;
        phase = 'end';
        const lit = G.houses.filter(q => q.litT > 0).length, total = G.houses.length;
        const steady = steadyDen > 0 ? Math.min(1, steadyNum / steadyDen) : 1, pct = Math.round(steady * 100);
        const badges = [];
        const pb = K.best('steady', pct, 'higher');
        if (pb.isNew) badges.push('New best: ' + pct + '% steady glow');
        else if (pb.first) badges.push('First glow: ' + pct + '% steady');
        const tier = K.tier(steady, [0.5, 0.75, 0.92]);
        if (tier) badges.push(tier + ': steady hands');
        const col = K.collect(STY.name);
        badges.push((col.isNew ? 'Collected: ' : 'Lantern: ') + STY.name + ' (' + col.count + ' of ' + STYLES.length + ')');
        if (G.houses.some(q => q.isNew)) badges.push('Village: ' + total + ' houses, one new today');
        ctx.track('done', { wishes, lit, total, diff: diffChoice === 'yes' ? 1 : 0, steady: pct });
        finished = true;
        ctx.finish({
          title: 'The whole hill is glowing', mood: 'hug',
          lines: [wishes + ' kind wishes, passed on', lit + ' of ' + total + ' windows lit', 'Tomorrow on the hill: ' + SEA2.name.toLowerCase()],
          share: 'Lit up a whole village with one small kind wish.',
          badges
        });
      }

      /* taps on the hillside answer softly */
      S.listen(el, 'pointerdown', (e) => {
        if (phase === 'intro' || !G.w) return;
        const tg = e.target; if (tg && tg.closest && tg.closest('.pg-orb, .pg-panel, button')) return;
        const p = K.local(e, el);
        P.emit('mote', p.x, p.y, 6, { colors: ['#fff3c4', '#ffd98a', '#e9ff9a'], speed: [20, 60] });
        if (A.ctx) { A.chime(A.note(PENTA[Math.floor(rnd() * 6)]), { vol: 0.03, dur: 1.1, verb: 0.5 }); A.sync('twinkle', performance.now()); }
      });

      /* ---------------- start ---------------- */
      cv.onResize(() => { layout(); if (cv.g && L.bg) draw(cv.g, 0, performance.now() / 1000); });
      S.on('theme', () => { el.classList.toggle('pg-bright', !dark()); paintLayers(); });
      (async () => {
        await K.intro({ title: 'Pass the Glow', sub: 'A dark hillside village. One small kind wish, passed from house to house.', how: 'Hold the glow while the wish forms, then pass it on.', char: 'patch', mood: 'love' });
        if (G.houses.some(q => q.isNew)) { const q = G.houses.find(x => x.isNew); P.emit('star', q.win.x, q.win.y, 10, { colors: ['#fffbe6', '#ffe08a'] }); }
        stepSelf();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < (ms || 60000)) await K.wait(80); };
          const hold = async (ms) => { // press, keep holding until the wish has formed, then lift
            const r = K.rectIn(orbHit, el), pr = await K.sim.press(orbHit, r.w / 2, r.h / 2), t0 = performance.now();
            while (HOLDS.on && performance.now() - t0 < ms * 4) await K.wait(80);
            await K.wait(160); pr.up(r.w / 2, r.h / 2); await K.wait(60);
          };
          await until(() => phase === 'self-hold' || finished);
          await K.wait(600);
          await hold(HOLD * 1000 + 500);
          await until(() => phase === 'self-carry', 6000);
          await K.wait(400);
          { const r = K.rectIn(orbHit, el); await K.sim.drag(orbHit, { x: r.w / 2, y: r.h / 2 }, { x: G.home.x - r.x, y: G.home.y - r.y }, 700, 14); }
          await until(() => phase === 'loved-pick', 9000);
          await K.wait(900);
          { const b = panel.querySelectorAll('.pg-chip'); await K.sim.tap(b[(dayN % 4)]); }
          await until(() => phase === 'loved-hold', 4000);
          await K.wait(300);
          await hold(HOLD * 1000 + 500);
          await until(() => phase === 'loved-carry', 6000);
          await K.wait(500);
          {
            const r0 = K.rectIn(orbHit, el), pr = await K.sim.press(orbHit, r0.w / 2, r0.h / 2);
            for (let d = 0; d <= G.plen; d += 22) { const p = at(d); pr.move(p.x - r0.x, p.y - 12 - r0.y); await K.wait(50); }
            const e = at(G.plen); pr.move(e.x - r0.x, e.y - 12 - r0.y);
            await K.wait(300);
            pr.up(e.x - r0.x, e.y - 12 - r0.y);
            await until(() => phase !== 'loved-carry', 15000);
          }
          await until(() => phase === 'neutral-pick', 9000);
          await K.wait(900);
          { const b = panel.querySelectorAll('.pg-chip'); await K.sim.tap(b[1]); }
          await until(() => phase === 'neutral-hold', 4000);
          await K.wait(300);
          await hold(HOLD * 900 + 500);
          await until(() => phase === 'neutral-fling', 6000);
          await K.wait(500);
          { const r = K.rectIn(orbHit, el); await K.sim.drag(orbHit, { x: r.w / 2, y: r.h / 2 }, { x: r.w / 2 + 40, y: r.h / 2 - 150 }, 120, 5); }
          await until(() => phase === 'diff-ask', 9000);
          await K.wait(1200);
          { const b = panel.querySelectorAll('.pg-chip'); await K.sim.tap(b[0]); }
          await until(() => phase === 'diff-hold', 4000);
          await K.wait(300);
          await hold(HOLD * 1700 + 600);
          await until(() => phase === 'all-hold', 12000);
          await K.wait(600);
          await hold(HOLD * 1250 + 700);
          await until(() => finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
