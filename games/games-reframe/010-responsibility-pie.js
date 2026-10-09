/* 010 Responsibility Pie — Reframe · REFRAME · Social / Team / Perspective
 * Mechanism: the responsibility pie for personalising and guilt (Greenberger & Padesky, Mind Over Mood): list every
 * factor that contributed (other people, timing, circumstances, systems, chance) before deciding how much is yours, then
 * size each slice honestly. Your slice never drops below 5%: fair, not falsely reassuring.
 * Verb: slice (pour the ME jar in, drag ingredient jars onto the pie, drag the slice edges round the rim, hold to bake).
 * Finale: the baked pie is served at a sunny table; Patch, Drop and friends each take a slice, and yours is just yours.
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'responsibility-pie', mode: 'reframe', name: 'Responsibility Pie', verb: 'slice', family: 'REFRAME', minutes: 2,
    parents: ['Social / Team / Perspective', 'Identity / Self', 'Communication / Boundaries'],
    cast: ['patch'], poster: { char: 'patch', mood: 'cosy' },
    tagline: 'Feels all your fault? Bake a pie of every cause and slice it fairly.',
    why: 'For self-blame: list every factor that played a part, then size your share honestly.',
    css: `
.g-responsibility-pie { --rp-ink: #3a2414; }
.g-responsibility-pie .rp-tag { position: absolute; z-index: 18; left: 0; top: 0; transform: translateX(-50%); width: max-content; max-width: var(--mw, 76px); padding: 4px 7px 5px; border-radius: 7px;
  background: linear-gradient(180deg, #fff8ea, #f3e2c2); color: var(--rp-ink); font: 600 12px/1.12 var(--font-ui); text-align: center; box-shadow: 0 3px 7px rgba(60, 30, 10, .3); pointer-events: none;
  border-top: 4px solid var(--c, #ccc); transition: opacity .3s ease, transform .3s ease; }
.g-responsibility-pie .rp-tag.is-used { opacity: .4; }
.g-responsibility-pie .rp-tag.is-gone { opacity: 0; transform: translate(-50%, 8px); }
.g-responsibility-pie .rp-tag.is-me { font-weight: 800; font-size: 13px; letter-spacing: .08em; }
.g-responsibility-pie .rp-hit { position: absolute; z-index: 24; left: 0; top: 0; padding: 0; border: 0; border-radius: 14px; background: transparent; cursor: grab; touch-action: none; appearance: none; }
.g-responsibility-pie .rp-hit:focus-visible { outline: 3px solid #ffd36b; outline-offset: 2px; }
.g-responsibility-pie .rp-card { position: absolute; z-index: 20; left: 50%; top: 0; transform: translateX(-50%) rotate(-1deg); width: min(calc(100% - 40px), 520px); padding: 7px 14px 9px; border-radius: 6px;
  background: #fffdf6; color: #2b1d10; box-shadow: 0 6px 16px rgba(50, 25, 5, .3); text-align: center; pointer-events: none; transition: opacity .4s ease; }
.g-responsibility-pie .rp-card small { display: block; font: 700 12px/1 var(--font-ui); letter-spacing: .14em; text-transform: uppercase; color: #a3550f; margin-bottom: 3px; }
.g-responsibility-pie .rp-card span { display: block; font: 600 15px/1.22 var(--font-ui); text-wrap: balance; }
.g-responsibility-pie .rp-card::before { content: ""; position: absolute; left: 50%; top: -5px; width: 12px; height: 12px; margin-left: -6px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #ff8a7a, #c0392b); box-shadow: 0 2px 3px rgba(0, 0, 0, .35); }
.g-responsibility-pie .rp-card.is-gone { opacity: 0; }
.g-responsibility-pie .rp-legend { position: absolute; z-index: 22; left: 50%; top: 0; transform: translateX(-50%); width: min(calc(100% - 20px), 640px); display: flex; flex-wrap: wrap; justify-content: center; gap: 5px 6px; pointer-events: none; }
.g-responsibility-pie .rp-chip { display: flex; align-items: center; gap: 6px; padding: 5px 9px 5px 6px; border-radius: 999px; background: color-mix(in srgb, var(--ui-surface) 90%, transparent); border: 1px solid var(--ui-line); color: var(--ui-fg);
  font: 600 13px/1 var(--font-ui); white-space: nowrap; box-shadow: 0 3px 8px rgba(0, 0, 0, .18); animation: rp-pop .4s cubic-bezier(.2, 1.6, .4, 1) both; }
.g-responsibility-pie .rp-chip i { width: 14px; height: 14px; border-radius: 50%; background: var(--c); box-shadow: inset 0 -2px 3px rgba(0, 0, 0, .25); flex: none; }
.g-responsibility-pie .rp-chip b { font-weight: 800; font-variant-numeric: tabular-nums; }
.g-responsibility-pie .rp-chip.is-me { border-color: #d63a4a; }
@keyframes rp-pop { from { transform: scale(.6); opacity: 0; } to { transform: none; opacity: 1; } }
.g-responsibility-pie .rp-pct { position: absolute; z-index: 23; left: 0; top: 0; transform: translate(-50%, -50%); padding: 3px 7px; border-radius: 999px; background: rgba(255, 252, 244, .92); color: #2b1d10;
  font: 800 13px/1 var(--font-ui); pointer-events: none; white-space: nowrap; box-shadow: 0 2px 6px rgba(0, 0, 0, .25); font-variant-numeric: tabular-nums; transition: opacity .2s ease; }
.g-responsibility-pie .rp-pct.is-me { background: #fff1ef; color: #9e1f2e; }
.g-responsibility-pie .rp-pie { position: absolute; z-index: 21; left: 0; top: 0; touch-action: none; border-radius: 50%; }
.g-responsibility-pie .rp-pie:focus-visible { outline: 3px solid #ffd36b; outline-offset: 4px; }
.g-responsibility-pie .rp-dock { position: absolute; z-index: 32; left: 50%; top: 0; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 8px; width: min(calc(100% - 32px), 420px); }
.g-responsibility-pie .rp-btn { appearance: none; border: 0; cursor: pointer; min-height: 52px; padding: 0 24px; border-radius: 26px; font: 800 17px/1 var(--font-display); letter-spacing: .03em; color: #3a2414;
  background: linear-gradient(180deg, #fff1c9, #f6c96a); box-shadow: 0 5px 0 #b07a2a, 0 12px 24px rgba(0, 0, 0, .28); transition: transform .1s ease, box-shadow .1s ease; }
.g-responsibility-pie .rp-btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #b07a2a, 0 8px 16px rgba(0, 0, 0, .3); }
.g-responsibility-pie .rp-btn:focus-visible, .g-responsibility-pie .rp-oven:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-responsibility-pie .rp-btn.is-new, .g-responsibility-pie .rp-oven.is-new { animation: rp-pop .5s cubic-bezier(.2, 1.6, .4, 1) backwards; }
.g-responsibility-pie .rp-oven { position: relative; appearance: none; border: 0; cursor: pointer; touch-action: none; width: min(100%, 300px); height: 64px; border-radius: 18px; color: #fff4e0; overflow: hidden;
  font: 800 18px/1 var(--font-display); letter-spacing: .08em; background: linear-gradient(180deg, #4a3a3a, #2b1f1f); box-shadow: 0 5px 0 #140c0c, 0 14px 26px rgba(0, 0, 0, .35), inset 0 0 0 3px #8a6a4a; }
.g-responsibility-pie .rp-oven i { position: absolute; left: 8px; right: 8px; bottom: 7px; height: 8px; border-radius: 4px; background: rgba(255, 255, 255, .12); overflow: hidden; }
.g-responsibility-pie .rp-oven i::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: calc(var(--k, 0) * 100%); background: linear-gradient(90deg, #f3dcb0, #e9b45a 60%, #b5652a 85%, #5a2c12); }
.g-responsibility-pie .rp-oven i::after { content: ""; position: absolute; top: -2px; bottom: -2px; left: calc(var(--g0) * 100%); width: calc((var(--g1) - var(--g0)) * 100%); border: 2px solid #ffd36b; border-radius: 3px; }
.g-responsibility-pie .rp-oven span { position: relative; top: -4px; }
.g-responsibility-pie .rp-oven.is-down { box-shadow: 0 2px 0 #140c0c, 0 8px 16px rgba(0, 0, 0, .3), inset 0 0 0 3px #ffb35a, 0 0 30px rgba(255, 140, 60, .6); transform: translateY(3px); }
.g-responsibility-pie .rp-plan { position: relative; width: 100%; padding: 9px 13px; border-radius: 10px; background: #fffaf0; color: #2b1d10; border-left: 5px solid #d63a4a; box-shadow: 0 8px 20px rgba(0, 0, 0, .3);
  font: 600 14px/1.3 var(--font-ui); animation: rp-pop .5s cubic-bezier(.2, 1.4, .4, 1) both; }
.g-responsibility-pie .rp-plan small { display: block; font: 700 12px/1 var(--font-ui); letter-spacing: .12em; text-transform: uppercase; color: #a3550f; margin-bottom: 3px; }
.g-responsibility-pie .rp-guest { position: absolute; z-index: 19; left: 0; top: 0; width: var(--sz, 64px); height: var(--sz, 64px); object-fit: contain; pointer-events: none; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .3));
  animation: rp-guest .6s cubic-bezier(.2, 1.6, .4, 1) both; }
@keyframes rp-guest { from { transform: translateY(16px) scale(.5); opacity: 0; } to { transform: none; opacity: 1; } }
.g-responsibility-pie .rp-place { position: absolute; z-index: 23; left: 0; top: 0; transform: translate(-50%, 0); width: max-content; max-width: var(--mw, 80px); padding: 4px 7px 5px; border-radius: 7px; background: #fffdf6; color: #2b1d10;
  border-top: 4px solid var(--c); text-align: center; font: 600 12px/1.12 var(--font-ui); pointer-events: none; box-shadow: 0 3px 8px rgba(0, 0, 0, .25); animation: rp-popx .45s cubic-bezier(.2, 1.6, .4, 1) both; }
@keyframes rp-popx { from { transform: translate(-50%, 0) scale(.6); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
.g-responsibility-pie .rp-place b { display: block; font: 800 15px/1.05 var(--font-ui); }
.g-responsibility-pie .rp-place.is-me { max-width: 160px; padding: 6px 14px 7px; font-size: 14px; }
.g-responsibility-pie .rp-place.is-me b { font-size: 22px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = ctx.intensity;
      const clamp = K.clamp, lerp = K.lerp, TAU = K.TAU;
      const RM = () => K.reduced();
      const visits = K.visits();
      const care = () => an.safety === 'care';
      const serious = () => an.fear_support === 'strong' || an.fear_support === 'some' || care();

      /* ---------------- ingredients: the factors, seeded from the situation ---------------- */
      const FILL = { me: '#d63a4a', c: ['#5b6ee1', '#f2a541', '#7cbf4f', '#9b59b6', '#f0c93a', '#ff8a6a'] };
      const NAMES = ['Blueberry', 'Apricot', 'Gooseberry', 'Plum', 'Lemon', 'Peach'];
      function factorList() {
        const txt = [ctx.text, an.situation, an.thought].join(' ');
        const her = /\b(she|her|hers)\b/i.test(txt), him = /\b(he|him|his)\b/i.test(txt);
        const Pr = her ? 'Her' : him ? 'His' : 'Their';
        const D = [
          [/\b(presentation|speech|talk|pitch|interview|class|froze|stumbled|lost my place|audience)\b/i, ['Normal nerves', 'Short prep time', 'The room set-up', 'People’s phones', 'Plain chance', 'Tiredness']],
          [/\b(boss|manager|job|work|meeting|deadline|colleague|client|team|project)\b/i, [Pr + ' workload', 'Late-day timing', 'No context', 'How work runs', 'Plain chance', Pr + ' bad week']],
          [/\b(partner|boyfriend|girlfriend|husband|wife|bf|gf|date|dating|relationship)\b/i, [Pr + ' long day', 'Tiredness', 'Stress elsewhere', 'Timing', 'Plain chance', 'Mixed signals']],
          [/\b(mum|mom|dad|mother|father|sister|brother|family|parents?)\b/i, [Pr + ' old habits', Pr + ' bad day', 'Family patterns', 'Timing', 'Plain chance', 'Mixed signals']],
          [/\b(rent|landlord|lease|bill|debt|money|bank|loan|mortgage|flat)\b/i, ['Owner’s plans', 'Housing market', 'Timing', 'The rules', 'Plain chance', 'Paperwork']],
          [/\b(exam|test|grade|marks?|assignment|essay|uni|school|course)\b/i, ['A hard paper', 'Time available', 'How it’s marked', 'Other demands', 'Plain chance', 'Tiredness']],
          [/\b(text|texted|message|messaged|reply|replied|read|seen|ignor\w*|ghost\w*|friend)\b/i, [Pr + ' busy day', 'Timing', 'Phone habits', Pr + ' full plate', 'Plain chance', 'Mixed signals']]
        ];
        const row = (D.find(([re]) => re.test(txt)) || [null, ['Other people', 'Timing', 'Circumstances', 'Systems', 'Plain chance', 'Tiredness']])[1].slice();
        // one rival explanation from the reading, when it names a cause on their side
        const MAP = { 'BAD WEEK': Pr + ' bad week', 'BUSY DAY': Pr + ' busy day', 'LONG DAY': Pr + ' long day', 'BAD DAY': Pr + ' bad day', 'NEW TASK': 'New priorities', 'PRIVATE WORRY': 'A private worry', 'OLD HABIT': 'Old habits', 'OTHER REASON': 'Something else' };
        const alt = (Array.isArray(an.alternatives) ? an.alternatives : []).filter(a => a && !a.fear && a.name).map(a => MAP[String(a.name).replace(/^THE\s+/i, '').trim().toUpperCase()]).find(Boolean);
        if (alt && !row.includes(alt)) row.splice(2, 0, alt);
        const n = [4, 5, 6][inten];
        const out = [];
        row.forEach(x => { if (out.length < n && !out.includes(x)) out.push(x); });
        if (!out.includes('Plain chance')) out[out.length - 1] = 'Plain chance';
        return out;
      }
      let FACTORS = factorList();
      const PIES = [
        { name: 'Fluted crust', rim: 'flute' }, { name: 'Braided crust', rim: 'braid' }, { name: 'Star-top crust', rim: 'stars' }, { name: 'Leafy crust', rim: 'leaves' }, { name: 'Heart-cut crust', rim: 'hearts' }
      ];
      const PIE = K.dailyPick(PIES, 4);
      const DAWNS = [{ sky: ['#ffb3a7', '#ffe0b5'], sun: '#fff1c4' }, { sky: ['#c8b6ff', '#ffd6a5'], sun: '#fff6d8' }, { sky: ['#9fd3ff', '#ffe9c2'], sun: '#fffbe6' }, { sky: ['#ff9eb5', '#ffd08a'], sun: '#ffeab0' }];
      const DAWN = K.dailyPick(DAWNS, 9);
      const ROSTER = ['drop', 'still', 'sync', 'loopie', 'glitch', 'rush'];
      const shift = visits % ROSTER.length;
      const GUESTS = ROSTER.slice(shift).concat(ROSTER.slice(0, shift));
      if (GUESTS[0] !== 'drop') { GUESTS.splice(GUESTS.indexOf('drop'), 1); GUESTS.unshift('drop'); }

      /* ---------------- scene ---------------- */
      el.classList.add(K.dark() ? 'rp-dark' : 'rp-bright');
      const DPR = (el.clientWidth || 390) < 700 ? 1.5 : 2;
      const cv = K.canvas(el, { maxDpr: DPR });
      const bg2Cv = K.canvas(el, { maxDpr: DPR, before: true }); // the sunny table, faded in for the finale
      const bgCv = K.canvas(el, { maxDpr: DPR, before: true }); // the kitchen: painted on resize only
      bg2Cv.el.style.opacity = '0'; bg2Cv.el.style.transition = 'opacity 1.1s ease';
      const P = K.particles({ max: inten === 2 ? 600 : 420 });
      const G = {
        stage: 'intro', slices: [], B: [0, 1], fill: 0, drag: null, edge: -1, bake: 0, baking: false, bakeDone: false, steam: 0, scene: 0, glow: 0, shimmer: 0,
        lastIB: -1, edits: 0, lastClick: 0, minHit: 0, serve: 0, served: false
      };
      const jars = FACTORS.map((name, i) => ({ i, name, col: FILL.c[i % FILL.c.length], state: 'shelf', x: 0, y: 0, hx: 0, hy: 0, tip: 0, lift: 0, fly: null, level: 1 }));
      const me = { i: -1, name: 'Me', col: FILL.me, state: 'shelf', x: 0, y: 0, hx: 0, hy: 0, tip: 0, lift: 0, fly: null, level: 1, isMe: true };
      const ALLJ = [me].concat(jars);
      ALLJ.forEach(j => {
        j.tag = h('div', { class: 'rp-tag' + (j.isMe ? ' is-me' : ''), style: { '--c': j.col }, text: j.isMe ? 'ME' : j.name });
        j.hit = h('button', { type: 'button', class: 'rp-hit', 'aria-label': (j.isMe ? 'The ME jar' : 'Ingredient: ' + j.name) + '. Drag it onto the pie, or press Enter.' });
        el.append(j.tag, j.hit);
        K.drag(j.hit, { space: el, start: (p) => grabJar(j, p), move: (p, d) => moveJar(j, p, d), end: (p) => dropJar(j, p) });
        j.hit.addEventListener('click', (e) => { if (e.detail === 0) pourKeyboard(j); });
      });
      const situ = K.words(String(an.situation || an.thought || 'Something happened that you keep blaming yourself for').replace(/[\s;]+$/, ''), 13);
      const card = h('div', { class: 'rp-card' }, h('small', { text: 'Recipe for' }), h('span', { class: 'gk-user', text: K.sentence(situ.replace(/^"|"$/g, '')) }));
      const legend = h('div', { class: 'rp-legend', 'aria-live': 'polite' });
      const pieHit = h('div', { class: 'rp-pie', tabindex: '0', role: 'group', 'aria-label': 'The pie. Drag the slice edges around the rim. Arrow keys move the selected edge.' });
      const dock = h('div', { class: 'rp-dock' });
      const doneBtn = h('button', { type: 'button', class: 'rp-btn', hidden: true, text: 'That’s everything' });
      const oven = h('button', { type: 'button', class: 'rp-oven', hidden: true, 'aria-label': 'Hold to bake. Let go when the crust is golden.' }, h('span', { text: 'HOLD TO BAKE' }), h('i'));
      dock.append(doneBtn, oven);
      el.append(card, legend, pieHit, dock);
      const pcts = [];
      const patch = K.character('patch', { side: 'right', mood: 'worried', x: 12, y: 620 });
      const LN = lines();
      // care topics (health, money, housing, legal): no jokes, so the Cheeky vibe borrows the gentler wording
      function say(o, so) { if (care() && o && o.Jolly) o = Object.assign({}, o, { Cheeky: o.Jolly }); return patch.say(ctx.line(o), Object.assign({ ms: 4200 }, so || {})); }

      /* ---------------- layout ---------------- */
      const L = { W: 390, H: 844, ph: true };
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return false;
        const ph = W < 700;
        L.W = W; L.H = H; L.ph = ph;
        L.win = ph ? { x: 16, y: 64, w: 128, h: 82 } : { x: Math.max(30, W / 2 - 560), y: 70, w: 240, h: 150 };
        L.shelfY = ph ? 236 : 214;
        L.slot = ph ? Math.min(76, (W - 16) / jars.length) : Math.min(118, 720 / jars.length);
        L.jw = ph ? 50 : 66; L.jh = ph ? 62 : 80;
        L.cardY = ph ? 288 : 266;
        L.cx = W / 2; L.cy = ph ? 448 : 476;
        L.rx = ph ? Math.min(132, W * 0.34) : 196; L.ry = L.rx * 0.62; L.th = ph ? 16 : 22;
        L.legendY = L.cy + L.ry + L.th + (ph ? 10 : 14);
        L.patchSz = ph ? 84 : 104;
        L.patchY = ph ? L.legendY + (jars.length >= 6 ? 92 : 64) : H - L.patchSz - 16;
        L.dockY = ph ? L.patchY + L.patchSz + 8 : L.legendY + 52;
        me.hx = ph ? 34 : L.cx - L.rx - 90; me.hy = L.cy + L.ry + L.th - 2;
        jars.forEach((j, i) => { j.hx = W / 2 + (i - (jars.length - 1) / 2) * L.slot; j.hy = L.shelfY; });
        L.oven = ph ? null : { x: Math.min(W - 250, L.cx + L.rx + 90), y: L.cy - 150, w: 210, h: 250 };
        // the breakfast table for the finale, seen from your own seat
        L.tFar = ph ? 360 : 372; L.tcx = W / 2; L.tcy = ph ? 524 : 560;
        L.bwin = ph ? { x: 34, y: 70, w: W - 68, h: 180 } : { x: W / 2 - 300, y: 70, w: 600, h: 210 };
        L.youP = { x: W / 2, y: ph ? 652 : 716 };
        return true;
      }
      function pos(node, x, y) {
        const xs = x.toFixed(1), ys = y.toFixed(1);
        if (node._px === xs && node._py === ys) return; // skip unchanged writes: no style or layout work
        node._px = xs; node._py = ys; node.style.left = xs + 'px'; node.style.top = ys + 'px';
      }
      function place() {
        if (!layout()) return;
        paintBG(); paintBG2();
        ALLJ.forEach(j => {
          if (j.state === 'shelf' && !j.fly) { j.x = j.hx; j.y = j.hy; }
          const hw = j.isMe ? L.jw + 10 : L.slot - 6, hh = L.jh + 18;
          j.hit.style.width = hw + 'px'; j.hit.style.height = hh + 'px';
          if (j.state === 'shelf') pos(j.hit, j.hx - hw / 2, j.hy - hh);
          j.tag.style.setProperty('--mw', (j.isMe ? 60 : L.slot - 4) + 'px');
          pos(j.tag, j.hx, j.isMe ? j.hy + 4 : j.hy + 9);
        });
        pos(card, L.W / 2, L.cardY); card.style.left = '50%';
        legend.style.top = L.legendY + 'px';
        const pw = L.rx * 2 + 70, phh = L.ry * 2 + 70;
        pieHit.style.width = pw + 'px'; pieHit.style.height = phh + 'px'; pos(pieHit, L.cx - pw / 2, L.cy - phh / 2);
        dock.style.top = L.dockY + 'px';
        if (G.stage !== 'end') { G.patchAt = L.patchY; patch.place(L.ph ? 10 : Math.max(16, L.W / 2 - 480), L.patchY); }
        updatePcts(); fitBelowLegend();
      }

      /* ---------------- colour helpers ---------------- */
      const hexRGB = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
      const mixHex = (a, b, k) => { const x = hexRGB(a), y = hexRGB(b); return `rgb(${Math.round(x[0] + (y[0] - x[0]) * k)},${Math.round(x[1] + (y[1] - x[1]) * k)},${Math.round(x[2] + (y[2] - x[2]) * k)})`; };
      function crustCol(b) {
        const st = [[0, '#f3dcb0'], [0.45, '#efc27a'], [0.7, '#e0a04a'], [1, '#b06a2c'], [1.35, '#6b3a1c']];
        b = clamp(b, 0, 1.35);
        for (let i = 1; i < st.length; i++) if (b <= st[i][0]) return mixHex(st[i - 1][1], st[i][1], (b - st[i - 1][0]) / (st[i][0] - st[i - 1][0]));
        return st[st.length - 1][1];
      }
      function rr(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      const FONT = (getComputedStyle(el).getPropertyValue('--font-ui') || '').trim() || 'system-ui, sans-serif';

      /* ---------------- backdrops: kitchen, and the sunny table for the finale ---------------- */
      function paintWindow(g, w, dark, big) {
        g.fillStyle = dark ? '#3a2a24' : '#ffffff'; rr(g, w.x - 8, w.y - 8, w.w + 16, w.h + 16, 10); g.fill();
        g.save(); rr(g, w.x, w.y, w.w, w.h, 6); g.clip();
        const sg = g.createLinearGradient(0, w.y, 0, w.y + w.h); sg.addColorStop(0, dark ? '#2b2a55' : DAWN.sky[0]); sg.addColorStop(1, dark ? '#e08a7a' : DAWN.sky[1]);
        g.fillStyle = sg; g.fillRect(w.x, w.y, w.w, w.h);
        const sx = w.x + w.w * 0.62, sy = w.y + w.h * 0.82, sun = g.createRadialGradient(sx, sy, 2, sx, sy, w.w * 0.5);
        sun.addColorStop(0, DAWN.sun); sun.addColorStop(0.25, 'rgba(255,230,170,0.7)'); sun.addColorStop(1, 'rgba(255,220,160,0)');
        g.fillStyle = sun; g.fillRect(w.x, w.y, w.w, w.h);
        g.fillStyle = dark ? 'rgba(40,30,60,0.75)' : 'rgba(120,90,110,0.35)';
        g.beginPath(); g.moveTo(w.x, w.y + w.h); for (let i = 0; i <= 8; i++) g.lineTo(w.x + i * w.w / 8, w.y + w.h * (0.78 + Math.sin(i * 1.7) * 0.06)); g.lineTo(w.x + w.w, w.y + w.h); g.fill();
        g.restore();
        g.fillStyle = dark ? '#3a2a24' : '#ffffff'; g.fillRect(w.x + w.w / 2 - 2, w.y, 4, w.h); g.fillRect(w.x, w.y + w.h / 2 - 2, w.w, 4);
        if (big) { g.fillStyle = dark ? '#5a3a2a' : '#f2d7b5'; rr(g, w.x - 16, w.y + w.h + 6, w.w + 32, 9, 3); g.fill(); }
      }
      function paintBG() {
        const W = L.W, H = L.H, dpr = cv.dpr || 1, dark = K.dark();
        bgCv.fit(); if (!bgCv.g) return;
        const g = bgCv.g; g.setTransform(bgCv.dpr, 0, 0, bgCv.dpr, 0, 0); g.clearRect(0, 0, W, H); void dpr;
        // tiled wall
        g.fillStyle = dark ? '#2c2a3a' : '#f6f1ea'; g.fillRect(0, 0, W, H);
        const ts = L.ph ? 26 : 32;
        for (let y = 0, r = 0; y < H; y += ts, r++) for (let x = (r % 2) * ts / 2 - ts; x < W; x += ts) { g.fillStyle = dark ? ((r + Math.floor(x / ts)) % 5 === 0 ? '#34324a' : '#302e42') : ((r + Math.floor(x / ts)) % 5 === 0 ? '#e9eef5' : '#f2f4f7'); rr(g, x + 1.5, y + 1.5, ts - 3, ts - 3, 3); g.fill(); }
        // a soft blue tile band
        g.fillStyle = dark ? 'rgba(120,150,220,0.1)' : 'rgba(90,140,200,0.12)'; g.fillRect(0, L.shelfY + 50, W, 12);
        paintWindow(g, L.win, dark, false);
        // copper pans hanging on a rail
        const rx0 = L.ph ? W - 150 : W - 380, rx1 = L.ph ? W - 12 : W - 120;
        g.fillStyle = dark ? '#6b5a52' : '#b49a86'; g.fillRect(rx0, 66, rx1 - rx0, 4);
        [[0.18, 20], [0.52, 26], [0.84, 17]].forEach(([f, r]) => {
          const x = rx0 + (rx1 - rx0) * f, y = 78 + r; r *= L.ph ? 1 : 1.3;
          g.strokeStyle = dark ? '#8a6a5a' : '#9a7a66'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 70); g.lineTo(x, y - r - 2); g.stroke();
          const cg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r); cg.addColorStop(0, '#ffd2a8'); cg.addColorStop(0.5, '#d9874f'); cg.addColorStop(1, '#8a4a22');
          g.fillStyle = cg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
          g.fillStyle = '#6a3a1a'; g.fillRect(x - 3, y - r - 14, 6, 14);
        });
        // jar shelf
        const sx0 = W / 2 - L.slot * jars.length / 2 - 12, sx1 = W / 2 + L.slot * jars.length / 2 + 12;
        g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(sx0 + 4, L.shelfY + 8, sx1 - sx0, 6);
        const wg = g.createLinearGradient(0, L.shelfY, 0, L.shelfY + 9); wg.addColorStop(0, dark ? '#8a6a4a' : '#d9a876'); wg.addColorStop(1, dark ? '#5a3e28' : '#a87448');
        g.fillStyle = wg; rr(g, sx0, L.shelfY, sx1 - sx0, 9, 3); g.fill();
        // oven (desktop)
        if (L.oven) {
          const o = L.oven;
          g.fillStyle = 'rgba(0,0,0,0.22)'; rr(g, o.x + 6, o.y + 8, o.w, o.h, 18); g.fill();
          const og = g.createLinearGradient(o.x, 0, o.x + o.w, 0); og.addColorStop(0, '#9fd3c7'); og.addColorStop(0.5, '#c6ebe2'); og.addColorStop(1, '#7fb8ab');
          g.fillStyle = og; rr(g, o.x, o.y, o.w, o.h, 18); g.fill();
          g.fillStyle = '#2b2b33'; rr(g, o.x + 24, o.y + 70, o.w - 48, o.h - 110, 12); g.fill();
          g.fillStyle = '#e8e4dc'; rr(g, o.x + 20, o.y + 18, o.w - 40, 34, 8); g.fill();
          for (let i = 0; i < 4; i++) { g.fillStyle = '#4a4a55'; g.beginPath(); g.arc(o.x + 46 + i * (o.w - 92) / 3, o.y + 35, 8, 0, TAU); g.fill(); }
          g.fillStyle = '#c0c4cc'; rr(g, o.x + 34, o.y + 60, o.w - 68, 7, 3); g.fill();
        }
        // counter
        const cy = L.cy + L.ry + L.th - 4;
        g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, cy - 3, W, 4);
        const ct = g.createLinearGradient(0, cy, 0, H); ct.addColorStop(0, dark ? '#5a4436' : '#e8d3bb'); ct.addColorStop(0.05, dark ? '#4a3628' : '#dcc3a6'); ct.addColorStop(1, dark ? '#2a1e16' : '#c4a684');
        g.fillStyle = ct; g.fillRect(0, cy, W, H - cy);
        g.strokeStyle = dark ? 'rgba(255,220,180,0.06)' : 'rgba(120,80,40,0.1)'; g.lineWidth = 1;
        for (let y = cy + 14; y < H; y += 22) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + 3, W * 0.7, y - 3, W, y + 1); g.stroke(); }
        // the board the pie sits on
        g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(L.cx + 6, L.cy + L.th + 10, L.rx + 26, L.ry + 22, 0, 0, TAU); g.fill();
        const bg = g.createLinearGradient(0, L.cy - L.ry, 0, L.cy + L.ry); bg.addColorStop(0, dark ? '#9a7048' : '#d9a56e'); bg.addColorStop(1, dark ? '#6a4628' : '#b07a48');
        g.fillStyle = bg; g.beginPath(); g.ellipse(L.cx, L.cy + L.th + 4, L.rx + 22, L.ry + 18, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2; g.beginPath(); g.ellipse(L.cx, L.cy + L.th + 4, L.rx + 16, L.ry + 13, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.78);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, dark ? 'rgba(8,4,12,0.5)' : 'rgba(110,70,40,0.14)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
      }
      function paintBG2() {
        const W = L.W, H = L.H, dpr = cv.dpr || 1, dark = K.dark();
        bg2Cv.fit(); if (!bg2Cv.g) return;
        const g = bg2Cv.g; g.setTransform(bg2Cv.dpr, 0, 0, bg2Cv.dpr, 0, 0); g.clearRect(0, 0, W, H); void dpr;
        g.fillStyle = dark ? '#1e1418' : '#d9b896'; g.fillRect(0, 0, W, H);
        const wall = g.createLinearGradient(0, 0, 0, L.tFar); wall.addColorStop(0, dark ? '#3a2c3c' : '#fff3e2'); wall.addColorStop(1, dark ? '#2a1e2e' : '#f6dcc4');
        g.fillStyle = wall; g.fillRect(0, 0, W, L.tFar + 2);
        for (let x = 0; x < W; x += 30) { g.fillStyle = dark ? 'rgba(255,220,180,0.035)' : 'rgba(220,150,90,0.08)'; g.fillRect(x, 0, 14, L.tFar); }
        paintWindow(g, L.bwin, dark, true);
        if (visits >= 3) { // bunting for regulars
          g.strokeStyle = dark ? '#a08070' : '#c9a48a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 64); g.quadraticCurveTo(W / 2, 104, W, 64); g.stroke();
          for (let i = 1; i < 14; i++) { const x = i * W / 14, y = 64 + Math.sin(i / 14 * Math.PI) * 20 + 1; g.fillStyle = FILL.c[i % FILL.c.length]; g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + 8, y); g.lineTo(x, y + 16); g.closePath(); g.fill(); }
        }
        // the table runs from the far edge right down past the bottom of the screen
        const fx0 = W * 0.04, fx1 = W * 0.96, y0 = L.tFar;
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y0 - 4, W, 6);
        const cl = g.createLinearGradient(0, y0, 0, H); cl.addColorStop(0, dark ? '#cbbbd9' : '#f3e9df'); cl.addColorStop(0.35, dark ? '#e2d6ee' : '#fffaf3'); cl.addColorStop(1, dark ? '#bfaed2' : '#f4e8da');
        g.fillStyle = cl; g.beginPath(); g.moveTo(fx0, y0); g.lineTo(fx1, y0); g.lineTo(W + 140, H); g.lineTo(-140, H); g.closePath(); g.fill();
        // gingham runner down the middle and a border along the far edge
        g.save(); g.beginPath(); g.moveTo(fx0, y0); g.lineTo(fx1, y0); g.lineTo(W + 140, H); g.lineTo(-140, H); g.closePath(); g.clip();
        // a soft gingham runner down the middle, folds in the cloth
        const rw0 = L.ph ? 60 : 110, rw1 = L.ph ? 170 : 300;
        g.beginPath(); g.moveTo(W / 2 - rw0, y0); g.lineTo(W / 2 + rw0, y0); g.lineTo(W / 2 + rw1, H); g.lineTo(W / 2 - rw1, H); g.closePath(); g.save(); g.clip();
        g.fillStyle = dark ? 'rgba(214,58,74,0.16)' : 'rgba(214,58,74,0.1)';
        for (let i = -8; i <= 8; i += 2) { g.beginPath(); g.moveTo(W / 2 + i * rw0 / 8, y0); g.lineTo(W / 2 + (i + 1) * rw0 / 8, y0); g.lineTo(W / 2 + (i + 1) * rw1 / 8, H); g.lineTo(W / 2 + i * rw1 / 8, H); g.closePath(); g.fill(); }
        for (let y = y0 + 10, k = 0; y < H; k++, y += 12 + k * 8) g.fillRect(0, y, W, 5 + k * 1.4);
        g.restore();
        g.strokeStyle = dark ? 'rgba(214,58,74,0.35)' : 'rgba(214,58,74,0.25)'; g.lineWidth = 2;
        [-1, 1].forEach(sd => { g.beginPath(); g.moveTo(W / 2 + sd * rw0, y0); g.lineTo(W / 2 + sd * rw1, H); g.stroke(); });
        g.strokeStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(150,110,80,0.1)'; g.lineWidth = 1.5;
        [0.22, 0.78].forEach(f => { g.beginPath(); g.moveTo(W * f, y0); g.lineTo(W * (f < 0.5 ? f - 0.25 : f + 0.25), H); g.stroke(); });
        g.restore();
        g.fillStyle = dark ? '#d63a4a' : '#e05a66'; g.fillRect(fx0, y0, fx1 - fx0, 5);
        if (visits >= 1) { // a little vase of flowers for returning friends
          const vx = W * (L.ph ? 0.86 : 0.8), vy = y0 + (L.ph ? 120 : 140);
          g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(vx + 3, vy + 3, 16, 5, 0, 0, TAU); g.fill();
          g.fillStyle = '#9fd3c7'; rr(g, vx - 10, vy - 30, 20, 32, 7); g.fill();
          ['#ff8fb1', '#ffd36b', '#b49cff', '#ff9a76'].forEach((c, i) => { g.strokeStyle = '#5f9e6e'; g.lineWidth = 1.6; const fx = vx + (i - 1.5) * 9, fyy = vy - 52 - (i % 2) * 8; g.beginPath(); g.moveTo(vx, vy - 28); g.lineTo(fx, fyy); g.stroke(); g.fillStyle = c; g.beginPath(); g.arc(fx, fyy, 6, 0, TAU); g.fill(); g.fillStyle = '#fff6c4'; g.beginPath(); g.arc(fx, fyy, 2, 0, TAU); g.fill(); });
        }
        const vg = g.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.8);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, dark ? 'rgba(8,4,12,0.45)' : 'rgba(120,70,30,0.12)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
      }

      /* ---------------- pie geometry ---------------- */
      const A0 = -Math.PI / 2;
      const minOf = (i) => (G.slices[i] && G.slices[i].isMe ? 0.05 : 0.03);
      function fracs() { const out = []; for (let i = 0; i < G.slices.length; i++) out.push(G.B[i + 1] - G.B[i]); return out; }
      function pctList() {
        const f = fracs(), raw = f.map(x => x * 100), fl = raw.map(Math.floor);
        let rest = 100 - fl.reduce((a, b) => a + b, 0);
        raw.map((x, i) => [x - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rest > 0) { fl[i]++; rest--; } });
        return fl;
      }
      const angOf = (f) => A0 + f * TAU;
      const rim = (a, r) => ({ x: L.cx + Math.cos(a) * L.rx * (r || 1), y: L.cy + Math.sin(a) * L.ry * (r || 1) });
      function fracAt(px, py) { let a = Math.atan2((py - L.cy) / L.ry, (px - L.cx) / L.rx) - A0; a = ((a % TAU) + TAU) % TAU; return a / TAU; }
      function addSlice(sl, take) {
        // a new slice enters just after ME and takes its share from ME
        if (!G.slices.length) { G.slices = [sl]; G.B = [0, 1]; return; }
        G.slices.forEach(q => { if (q.grow) { const ff = q.base.slice(); ff[ff.length - 1] = q.grow.to; setFracs(ff); q.grow = null; } });
        const f = fracs(); const meF = f[0];
        const t = Math.min(take, meF - 0.05);
        const nf = [meF - t].concat(f.slice(1)).concat([0]);
        G.slices.push(sl);
        sl.grow = { from: 0, to: t, k: 0 }; sl.base = nf;
        setFracs(nf);
      }
      function setFracs(f) { const B = [0]; f.forEach((x, i) => B.push(B[i] + x)); B[B.length - 1] = 1; G.B = B; }

      /* ---------------- drawing ---------------- */
      function drawPie(g, t, x, y, sc, bake) {
        const rx = L.rx * sc, ry = L.ry * sc, th = L.th * sc;
        const crust = crustCol(bake);
        // tin + side wall (front half visible)
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 4, y + th + 6, rx + 8, ry + 6, 0, 0, TAU); g.fill();
        g.fillStyle = '#b9bfc9'; g.beginPath(); g.ellipse(x, y + th, rx + 6, ry + 4, 0, 0, Math.PI); g.lineTo(x - rx - 6, y); g.ellipse(x, y, rx + 6, ry + 4, 0, Math.PI, 0, true); g.closePath(); g.fill();
        g.fillStyle = mixHex('#c98a4a', '#7a4a22', clamp(bake, 0, 1)); g.beginPath(); g.ellipse(x, y + th * 0.85, rx, ry, 0, 0, Math.PI); g.lineTo(x - rx, y); g.ellipse(x, y, rx, ry, 0, Math.PI, 0, true); g.closePath(); g.fill();
        // filling
        const f = fracs();
        if (G.fill > 0 && G.slices.length) {
          g.save(); g.beginPath(); g.ellipse(x, y, rx * 0.97, ry * 0.97, 0, 0, TAU); g.clip();
          const fr = G.fill < 1 ? K.ease.outCubic(G.fill) : 1;
          let acc = 0;
          G.slices.forEach((sl, i) => {
            const a0 = angOf(acc), a1 = angOf(acc + f[i]); acc += f[i];
            if (f[i] <= 0.0005) return;
            const col = bake > 0.02 ? mixHex(sl.col, '#5a2a12', clamp((bake - 0.75) * 0.6, 0, 0.35)) : sl.col;
            g.fillStyle = col; g.beginPath(); g.moveTo(x, y); g.ellipse(x, y, rx * fr, ry * fr, 0, a0, a1); g.closePath(); g.fill();
          });
          // glossy highlights and bubbles
          g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(x - rx * 0.25, y - ry * 0.35, rx * 0.35, ry * 0.12, -0.15, 0, TAU); g.fill();
          if (G.baking || bake > 0.1) for (let i = 0; i < 9; i++) { const ph = (t * 0.8 + i * 0.13) % 1, a = i * 2.4, r = 0.25 + (i % 4) * 0.17; g.strokeStyle = `rgba(255,255,255,${0.35 * (1 - ph) * Math.min(1, bake * 2)})`; g.lineWidth = 1.2; g.beginPath(); g.arc(x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r, 1 + ph * 4, 0, TAU); g.stroke(); }
          g.restore();
          // pastry dividers between slices
          acc = 0;
          if (G.slices.length > 1) G.slices.forEach((sl, i) => { const a = angOf(acc); acc += f[i]; g.strokeStyle = crust; g.lineWidth = 4 * sc; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * rx * 0.97, y + Math.sin(a) * ry * 0.97); g.stroke(); g.lineCap = 'butt'; });
        } else {
          g.fillStyle = mixHex('#f3dcb0', '#e9c58e', 0.4); g.beginPath(); g.ellipse(x, y, rx * 0.97, ry * 0.97, 0, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(160,110,60,0.25)'; g.lineWidth = 1; for (let i = 0; i < 10; i++) { const a = i * 0.9; g.beginPath(); g.arc(x + Math.cos(a) * rx * 0.5, y + Math.sin(a) * ry * 0.5, 1.5, 0, TAU); g.stroke(); }
        }
        // crust rim with today's decoration
        g.strokeStyle = crust; g.lineWidth = 12 * sc; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - 2, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
        const n = Math.round(30 * sc + 6), dk = mixHex(crust.startsWith('#') ? crust : '#e0a04a', '#5a2a12', 0.25);
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU, p = { x: x + Math.cos(a) * rx, y: y + Math.sin(a) * ry };
          if (PIE.rim === 'flute') { g.fillStyle = crust; g.beginPath(); g.arc(p.x, p.y, 7.5 * sc, 0, TAU); g.fill(); g.strokeStyle = 'rgba(90,40,10,0.18)'; g.lineWidth = 1; g.stroke(); }
          else if (PIE.rim === 'braid') { g.fillStyle = i % 2 ? crust : dk; g.save(); g.translate(p.x, p.y); g.rotate(a + 0.7); g.beginPath(); g.ellipse(0, 0, 8 * sc, 4.5 * sc, 0, 0, TAU); g.fill(); g.restore(); }
          else if (PIE.rim === 'stars' && i % 2 === 0) { g.fillStyle = crust; K.starPath(g, p.x, p.y, 8 * sc, 3.5 * sc, 5, a); g.fill(); }
          else if (PIE.rim === 'leaves' && i % 2 === 0) { g.fillStyle = crust; g.save(); g.translate(p.x, p.y); g.rotate(a + Math.PI / 2); g.beginPath(); g.ellipse(0, 0, 9 * sc, 4 * sc, 0, 0, TAU); g.fill(); g.strokeStyle = dk; g.lineWidth = 1; g.beginPath(); g.moveTo(-7 * sc, 0); g.lineTo(7 * sc, 0); g.stroke(); g.restore(); }
          else if (PIE.rim === 'hearts' && i % 2 === 0) { g.fillStyle = crust; g.save(); g.translate(p.x, p.y); g.rotate(a + Math.PI / 2); g.scale(sc, sc); g.beginPath(); g.moveTo(0, 4); g.bezierCurveTo(-8, -2, -4, -9, 0, -4); g.bezierCurveTo(4, -9, 8, -2, 0, 4); g.fill(); g.restore(); }
        }
      }
      function drawHandles(g, t) {
        if (G.stage !== 'slice' && G.stage !== 'bakeReady') return;
        for (let k = 1; k < G.slices.length; k++) {
          const a = angOf(G.B[k]), p = rim(a, 1), act = G.drag && G.drag.kind === 'edge' && G.drag.k === k;
          const pulse = act ? 1 : 0.5 + 0.5 * Math.sin(t * 4 + k);
          g.fillStyle = `rgba(255,236,170,${0.25 + 0.25 * pulse})`; g.beginPath(); g.arc(p.x, p.y, 17 + pulse * 3, 0, TAU); g.fill();
          g.fillStyle = '#fff8e8'; g.beginPath(); g.arc(p.x, p.y, act ? 13 : 11, 0, TAU); g.fill();
          g.strokeStyle = '#b06a2c'; g.lineWidth = 2.5; g.stroke();
          g.strokeStyle = '#b06a2c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(p.x - 4, p.y - 3); g.lineTo(p.x + 4, p.y - 3); g.moveTo(p.x - 4, p.y + 1); g.lineTo(p.x + 4, p.y + 1); g.moveTo(p.x - 4, p.y + 5); g.lineTo(p.x + 4, p.y + 5); g.stroke();
        }
      }
      function drawJar(g, j, t) {
        const s = (L.ph ? 1 : 1.25) * (1 + j.lift * 0.08), w = 46 * s, hh = 54 * s, x = j.x, yb = j.y - j.lift * 8;
        g.save(); g.translate(x, yb); g.rotate(j.tip);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(0, 0, w * 0.5, 4, 0, 0, TAU); g.fill();
        // filling
        const lv = j.level;
        if (lv > 0.01) { g.fillStyle = j.col; rr(g, -w / 2 + 4, -hh * lv + 2, w - 8, hh * lv - 4, 8 * s); g.fill(); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(-w / 2 + 6, -hh * lv + 4, 5 * s, hh * lv - 10); }
        // glass
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; rr(g, -w / 2, -hh, w, hh, 10 * s); g.stroke();
        g.fillStyle = 'rgba(220,240,255,0.16)'; rr(g, -w / 2, -hh, w, hh, 10 * s); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(-w / 2 + 5, -hh + 8, 3, hh - 18);
        // gingham lid
        g.fillStyle = j.isMe ? '#d63a4a' : '#f6efe2'; rr(g, -w / 2 - 3, -hh - 10 * s, w + 6, 11 * s, 4); g.fill();
        g.fillStyle = j.isMe ? 'rgba(255,255,255,0.45)' : 'rgba(214,58,74,0.45)'; for (let i = 0; i < 5; i++) g.fillRect(-w / 2 - 1 + i * (w + 2) / 5, -hh - 9 * s, (w + 2) / 10, 9 * s);
        g.restore();
        void t;
      }
      function drawSteam(g, t, x, y, n, k) {
        g.strokeStyle = `rgba(255,255,255,${0.45 * k})`; g.lineWidth = 3; g.lineCap = 'round';
        for (let i = 0; i < n; i++) { const ox = x + (i - (n - 1) / 2) * 22, ph = (t * 0.5 + i * 0.3) % 1; g.globalAlpha = 1 - ph; g.beginPath(); for (let s2 = 0; s2 <= 10; s2++) { const yy = y - s2 * 5 - ph * 30, xx = ox + Math.sin(s2 * 0.6 + t * 2 + i) * 6; if (s2) g.lineTo(xx, yy); else g.moveTo(xx, yy); } g.stroke(); }
        g.globalAlpha = 1; g.lineCap = 'butt';
      }

      /* ---------------- loop ---------------- */
      let M = null, amb = null, frame = 0, sizzle = null;
      function beatPos() { if (A.ctx && M && M.next > 0) { const spb = 60 / M.bpm; return (M.beat - 1) + (A.now() - (M.next - spb)) / spb; } return performance.now() / 1000 * 64 / 60; }
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !L.W) return;
        frame++;
        if (G.fill > 0 && G.fill < 1) G.fill = Math.min(1, G.fill + dt / (RM() ? 0.2 : 0.9));
        G.slices.forEach(sl => { if (sl.grow) { sl.grow.k = Math.min(1, sl.grow.k + dt / (RM() ? 0.15 : 0.6)); const e = K.ease.outBack(sl.grow.k), f = sl.base.slice(), take = Math.min(sl.grow.to * e, f[0] + sl.grow.to - 0.05); f[0] = f[0] + sl.grow.to - take; f[f.length - 1] = take; setFracs(f); if (sl.grow.k >= 1) sl.grow = null; } });
        if (G.baking) { G.bake = Math.min(1.35, G.bake + dt / bakeSecs); oven.style.setProperty('--k', (G.bake / 1.35).toFixed(3)); }
        G.glow += ((G.baking ? 1 : 0) - G.glow) * Math.min(1, dt * 4);
        if (G.stage === 'end') G.scene = Math.min(1, G.scene + dt / (RM() ? 0.2 : 1.1));
        ALLJ.forEach(j => {
          if (j.fly) { j.fly.k = Math.min(1, j.fly.k + dt / j.fly.dur); const e = K.ease.inOutCubic(j.fly.k), to = j.fly.to(); j.x = lerp(j.fly.x, to.x, e); j.y = lerp(j.fly.y, to.y, e) - Math.sin(e * Math.PI) * j.fly.arc; if (j.fly.k >= 1) { const f = j.fly; j.fly = null; f.done && f.done(); } }
          j.lift += (((G.drag && G.drag.j === j) ? 1 : 0) - j.lift) * Math.min(1, dt * 14);
          j.tip += ((j.pouring ? 1.9 * (j.hx < L.cx ? 1 : -1) : 0) - j.tip) * Math.min(1, dt * 8);
        });
        if (A.ctx) {
          if (!amb) { amb = K.ambience('dawn'); if (amb && amb.level) amb.level(0.45); }
          if (sizzle && frame % 3 === 0) { sizzle.level(0.01 + 0.06 * G.glow * Math.min(1, G.bake + 0.3), 0.1); sizzle.freq(1400 + G.bake * 1800, 0.2); }
        }
        if (frame % 2 === 0) syncDom();
        const bp = beatPos(), ib = Math.floor(bp);
        if (ib !== G.lastIB) { G.lastIB = ib; onBeat(ib); }

        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0); g.globalAlpha = 1;
        const sc = G.scene;
        g.clearRect(0, 0, L.W, L.H);
        if (sc < 1) {
          g.globalAlpha = 1 - sc;
          if (L.oven && G.glow > 0.01) { const o = L.oven; g.fillStyle = `rgba(255,140,60,${0.7 * G.glow})`; rr(g, o.x + 24, o.y + 70, o.w - 48, o.h - 110, 12); g.fill(); }
          ALLJ.forEach(j => { if (j !== (G.drag && G.drag.j) && j.state !== 'gone') drawJar(g, j, t); });
          g.globalAlpha = 1;
        }
        // heat glow under the pie while baking
        if (G.glow > 0.01) { const hg = g.createRadialGradient(L.cx, L.cy + L.ry, 10, L.cx, L.cy, L.rx * 1.5); hg.addColorStop(0, `rgba(255,150,60,${0.45 * G.glow})`); hg.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = hg; g.fillRect(L.cx - L.rx * 1.6, L.cy - L.ry * 2, L.rx * 3.2, L.ry * 4); }
        if (G.stage === 'end') drawServe(g, t, dt);
        else {
          drawPie(g, t, L.cx, L.cy, 1, G.bake);
          drawHandles(g, t);
          if (G.glow > 0.05 && !RM()) { g.strokeStyle = `rgba(255,255,255,${0.18 * G.glow})`; g.lineWidth = 2; for (let i = 0; i < 4; i++) { const x0 = L.cx + (i - 1.5) * L.rx * 0.4; g.beginPath(); for (let s2 = 0; s2 < 12; s2++) { const yy = L.cy - L.ry - 8 - s2 * 7, xx = x0 + Math.sin(s2 * 0.8 + t * 6 + i) * 4; if (s2) g.lineTo(xx, yy); else g.moveTo(xx, yy); } g.stroke(); } }
          if (G.bakeDone) drawSteam(g, t, L.cx, L.cy - L.ry * 0.4, 3, 1);
        }
        if (G.drag && G.drag.j) drawJar(g, G.drag.j, t);
        drawArc(g, t);
        P.update(dt); P.draw(g);
      });
      function drawArc(g, t) {
        if (!G.arc || G.drag) return;
        const j = G.stage === 'me' ? me : (G.stage === 'jars' ? jars.find(q => q.state === 'shelf') : null);
        if (!j) return;
        const a = { x: j.x, y: j.y - L.jh * 0.6 }, b = { x: L.cx, y: L.cy - 4 };
        g.strokeStyle = K.dark() ? 'rgba(255,214,107,0.85)' : 'rgba(176,106,44,0.8)'; g.lineWidth = 3; g.lineCap = 'round'; g.setLineDash([2, 9]); g.lineDashOffset = -t * 30;
        g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 40, b.x, b.y); g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
      }
      function onBeat(i) {
        // the oven timer ticks with the music; steam breathes on the downbeat
        if (A.ctx && (G.stage === 'slice' || G.stage === 'bakeReady' || G.baking)) A.wood(undefined, 0.035, i % 2 ? 1.35 : 1.6);
        if (G.bakeDone && i % 2 === 0 && !RM()) P.emit('smoke', L.cx + (Math.random() - 0.5) * L.rx, L.cy - L.ry * 0.3, 2, { colors: ['rgba(255,255,255,0.35)'], angle: -Math.PI / 2, spread: 0.5, speed: [15, 35] });
      }
      function syncDom() {
        if (G.stage === 'end') return;
        const key = G.B.map(x => x.toFixed(4)).join(',') + ':' + G.fill.toFixed(2) + ':' + G.slices.length + ':' + L.W;
        if (key === G.domKey) return;
        G.domKey = key;
        updatePcts();
      }
      function updatePcts() {
        const pl = pctList(), f = fracs();
        while (pcts.length < G.slices.length) { const e = h('div', { class: 'rp-pct' }); el.append(e); pcts.push(e); }
        pcts.forEach((e, i) => {
          if (i >= G.slices.length || G.stage === 'end' || G.fill < 0.6 || f[i] < 0.075) { e.style.opacity = '0'; return; }
          let acc = 0; for (let k = 0; k < i; k++) acc += f[k];
          const a = angOf(acc + f[i] / 2), p = rim(a, G.slices.length === 1 ? 0 : 0.6);
          const txt = (G.slices[i].isMe ? 'ME ' : '') + pl[i] + '%';
          if (e.textContent !== txt) e.textContent = txt;
          e.classList.toggle('is-me', !!G.slices[i].isMe);
          e.style.opacity = '1'; pos(e, p.x, p.y);
        });
        // legend chips
        const want = G.slices.map((sl, i) => sl.name + ':' + pl[i]).join('|');
        if (legend.dataset.k !== want) {
          legend.dataset.k = want;
          if (legend.children.length !== G.slices.length) { legend.innerHTML = ''; G.slices.forEach(sl => legend.append(h('span', { class: 'rp-chip' + (sl.isMe ? ' is-me' : ''), style: { '--c': sl.col } }, h('i'), h('span', { text: sl.name }), h('b', { text: '' })))); fitBelowLegend(); }
          G.slices.forEach((sl, i) => { const b = legend.children[i] && legend.children[i].querySelector('b'); if (b) b.textContent = pl[i] + '%'; });
          const lh = legend.offsetHeight; if (lh !== G.legendH) { G.legendH = lh; fitBelowLegend(); }
        }
      }

      function fitBelowLegend() {
        // Patch and the buttons always sit below the legend, however many rows it wraps to
        if (!L.ph || G.stage === 'end') return;
        const py = Math.min(L.H - L.patchSz - 90, Math.max(L.patchY, L.legendY + legend.offsetHeight + 10));
        if (Math.abs(py - (G.patchAt || L.patchY)) > 1) { G.patchAt = py; patch.place(10, py, 250); }
        dock.style.top = Math.min(L.H - 76, py + L.patchSz + 8) + 'px';
      }
      /* ---------------- jars: step 1 (ME) and step 2 (every other ingredient) ---------------- */
      function grabJar(j, p) {
        if (j.state !== 'shelf' || j.fly || G.drag) return false;
        if (j.isMe ? G.stage !== 'me' : G.stage !== 'jars') { K.sfx.no(); if (!j.isMe && G.stage === 'me') say(LN.meFirst, { mood: 'think', ms: 2600 }); return false; }
        G.drag = { kind: 'jar', j, x: p.x, y: p.y }; G.arc = false;
        K.sfx.pop(undefined, 420); if (A.ctx) A.tone({ type: 'sine', freq: 1200, dur: 0.05, vol: 0.04 });
        j.tag.classList.add('is-used');
      }
      function moveJar(j, p) { const D = G.drag; if (!D || D.j !== j) return; D.x = p.x; D.y = p.y; j.x = p.x; j.y = p.y + 30; }
      function overPie(x, y) { const dx = (x - L.cx) / (L.rx * 1.25), dy = (y - L.cy) / (L.ry * 1.5); return dx * dx + dy * dy < 1; }
      function dropJar(j, p) {
        const D = G.drag; if (!D || D.j !== j) return;
        G.drag = null;
        if (overPie(p.x, p.y + 20)) pour(j);
        else { j.fly = { k: 0, dur: 0.35, x: j.x, y: j.y, arc: 20, to: () => ({ x: j.hx, y: j.hy }), done: () => {} }; j.tag.classList.remove('is-used'); K.sfx.soft(); guideStep(1400); }
      }
      function pourKeyboard(j) {
        if (j.state !== 'shelf' || G.drag) return;
        if (j.isMe ? G.stage !== 'me' : G.stage !== 'jars') return;
        j.tag.classList.add('is-used'); pour(j);
      }
      function pour(j) {
        j.state = 'pouring'; K.guide(null);
        const side = j.hx < L.cx ? -1 : 1;
        j.fly = { k: 0, dur: RM() ? 0.12 : 0.32, x: j.x, y: j.y, arc: 10, to: () => ({ x: L.cx + side * L.rx * 0.45, y: L.cy - L.ry - 26 }), done: () => {
          j.pouring = true;
          if (A.ctx) { A.noise({ filter: 'bandpass', freq: 700, to: 300, q: 1.5, dur: 0.7, attack: 0.08, vol: 0.09 }); A.tone({ type: 'sine', freq: 300, to: 160, glide: 0.5, dur: 0.6, vol: 0.05 }); }
          for (let i = 0; i < 6; i++) S.later(() => P.emit('drop', j.x - side * 14, j.y - 20, 4, { colors: [j.col], angle: Math.PI / 2, spread: 0.5, speed: [60, 140] }), i * 70);
          S.later(() => {
            if (j.isMe) { addSlice({ name: 'Me', col: j.col, isMe: true }); G.fill = 0.01; }
            else addSlice({ name: j.name, col: j.col }, [0.12, 0.11, 0.1][inten]);
            K.sfx.good(undefined, 3 + G.slices.length); patch.react('bounce');
            P.emit('star', L.cx, L.cy, 8, { colors: [j.col, '#ffffff'] });
            j.level = 0.15;
            j.pouring = false;
            j.fly = j.isMe ? { k: 0, dur: 0.6, x: j.x, y: j.y, arc: 40, to: () => ({ x: -60, y: j.hy }), done: () => { j.state = 'gone'; } }
              : { k: 0, dur: 0.5, x: j.x, y: j.y, arc: 30, to: () => ({ x: j.hx, y: j.hy }), done: () => { j.state = 'used'; if (A.ctx) A.wood(undefined, 0.08, 0.9); } };
            afterPour(j);
          }, RM() ? 80 : 420);
        } };
      }
      function afterPour(j) {
        if (j.isMe) {
          me.tag.classList.add('is-gone');
          say(LN.meFilled, { mood: 'sad', moodMs: 1800, ms: 4600 });
          S.later(startJars, RM() ? 400 : 2400);
          return;
        }
        const n = G.slices.length - 1, left = jars.filter(q => q.state === 'shelf').length;
        if (n === 1) say(LN.firstJar, { mood: 'wow', ms: 3200 });
        else if (left === 0) { say(LN.allJars, { mood: 'happy', ms: 3200 }); S.later(startSlice, 1300); return; }
        else if (n === 2) say(LN.moreJars, { mood: 'happy', ms: 4200 });
        if (n >= 2 && doneBtn.hidden) { doneBtn.hidden = false; doneBtn.classList.add('is-new'); }
        guideStep(1600);
      }
      function startJars() {
        G.stage = 'jars'; G.arc = true;
        say(LN.jars, { mood: 'think', ms: 5200 });
        guideStep(1000);
      }
      function guideStep(delay) {
        if (G.stage === 'me') { K.guide({ id: 'me', g: 'drag', target: me.hit, dir: 'r', d: 70, label: 'DRAG IN THE ME JAR', delay }); return; }
        if (G.stage === 'jars') {
          const nx = jars.find(q => q.state === 'shelf');
          const n = G.slices.length - 1;
          if (n >= 3 || !nx) K.guide({ id: 'done', g: 'tap', target: doneBtn, label: 'TAP WHEN THAT’S ALL', delay: delay + 2400 });
          if (nx && n < 3) K.guide({ id: 'jar', g: 'drag', target: nx.hit, dir: nx.hx < L.cx ? 'r' : 'l', d: 60, label: 'DRAG A JAR ONTO THE PIE', place: 'below', delay });
          else if (nx) K.guide({ id: 'jar2', g: 'drag', target: nx.hit, dir: nx.hx < L.cx ? 'r' : 'l', d: 60, label: 'ANYTHING ELSE?', place: 'below', delay });
          return;
        }
        if (G.stage === 'slice') { K.guide({ id: 'slice', g: 'circle', target: () => ({ x: L.cx, y: L.cy }), r: Math.round(L.ry * 0.9), label: 'DRAG THE SLICE EDGES', delay }); return; }
        if (G.stage === 'bakeReady') { K.guide({ id: 'bake', g: 'hold', target: oven, label: 'HOLD, LET GO AT GOLDEN', ms: bakeSecs * 800, delay }); }
      }
      K.tap(doneBtn, () => { if (G.stage === 'jars' && G.slices.length >= 3) startSlice(); });

      /* ---------------- step 3: slice it fairly ---------------- */
      function startSlice() {
        if (G.stage !== 'jars') return;
        G.stage = 'slice'; G.arc = false;
        doneBtn.hidden = true;
        jars.forEach(j => { if (j.state === 'shelf') j.tag.classList.add('is-used'); });
        if (A.ctx) A.tone({ type: 'triangle', freq: 600, to: 900, glide: 0.1, dur: 0.15, vol: 0.06 });
        say(serious() ? LN.sliceReal : LN.slice, { mood: 'think', ms: 5600 });
        guideStep(1100);
      }
      K.drag(pieHit, {
        space: el,
        start: (p) => {
          if (G.stage !== 'slice' && G.stage !== 'bakeReady') return false;
          let best = -1, bd = 40;
          for (let k = 1; k < G.slices.length; k++) { const q = rim(angOf(G.B[k]), 1), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = k; } }
          if (best < 0) return false;
          G.drag = { kind: 'edge', k: best }; G.edge = best;
          K.sfx.tap(); if (A.ctx) A.noise({ filter: 'highpass', freq: 4000, dur: 0.08, vol: 0.05 });
        },
        move: (p) => { if (G.drag && G.drag.kind === 'edge') moveEdge(G.drag.k, fracAt(p.x, p.y)); },
        end: () => { if (!G.drag || G.drag.kind !== 'edge') return; G.drag = null; G.edits++; edgeDone(); }
      });
      S.listen(pieHit, 'keydown', (e) => {
        if (G.stage !== 'slice' && G.stage !== 'bakeReady') return;
        const d = { ArrowRight: 0.01, ArrowUp: 0.01, ArrowLeft: -0.01, ArrowDown: -0.01 }[e.key];
        if (e.key === 'Tab' && !e.shiftKey && G.slices.length > 2) { /* default focus behaviour */ }
        if (e.key === ']' || e.key === '[') { G.edge = ((G.edge < 1 ? 1 : G.edge) + (e.key === ']' ? 1 : -1) + G.slices.length - 2) % (G.slices.length - 1) + 1; return; }
        if (d) { e.preventDefault(); const k = G.edge < 1 ? 1 : G.edge; moveEdge(k, G.B[k] + d * (e.shiftKey ? 5 : 1)); G.edits++; edgeDone(); }
      });
      function moveEdge(k, f) {
        const cur = G.B[k];
        const cands = [f - 1, f, f + 1]; let nf = cands.reduce((b, c) => Math.abs(c - cur) < Math.abs(b - cur) ? c : b, f);
        const lo = G.B[k - 1] + minOf(k - 1), hi = G.B[k + 1] - minOf(k);
        const hitMin = nf < lo - 0.004 && G.slices[k - 1].isMe;
        nf = clamp(nf, lo, hi);
        if (Math.abs(nf - cur) < 0.0005) { if (hitMin) bumpMin(); return; }
        G.B[k] = nf;
        const step = Math.floor(nf * 100), was = Math.floor(cur * 100);
        if (step !== was && A.ctx && performance.now() - G.lastClick > 40) { G.lastClick = performance.now(); A.wood(undefined, 0.05, 0.8 + nf * 0.8); A.noise({ filter: 'highpass', freq: 5000, dur: 0.03, vol: 0.02 }); }
        if (hitMin) bumpMin();
        updatePcts();
      }
      function bumpMin() {
        if (performance.now() - G.minHit < 2500) return;
        G.minHit = performance.now(); K.sfx.soft(); say(LN.minMe, { mood: 'hug', ms: 3400 });
      }
      function edgeDone() {
        if (G.stage === 'slice') {
          G.stage = 'bakeReady';
          oven.hidden = false; oven.classList.add('is-new'); K.sfx.ok();
          const f = fracs();
          say(f[0] > 0.6 ? LN.stillBig : LN.fair, { mood: 'happy', ms: 4200 });
          guideStep(2200);
        } else if (G.stage === 'bakeReady') guideStep(2600);
      }

      /* ---------------- step 4: bake to golden ---------------- */
      const bakeSecs = [3.6, 3.0, 2.6][inten];
      const GOLD = [0.62, 0.8];
      oven.style.setProperty('--g0', (GOLD[0] / 1.35).toFixed(3)); oven.style.setProperty('--g1', (GOLD[1] / 1.35).toFixed(3));
      K.press(oven, {
        down: () => {
          if (G.stage !== 'bakeReady' || G.bakeDone) return;
          G.stage = 'baking'; G.baking = true; K.guide(null);
          oven.classList.add('is-down');
          K.sfx.tap(); if (A.ctx) { A.tone({ type: 'sine', freq: 90, to: 70, dur: 0.3, vol: 0.12 }); if (!sizzle) sizzle = A.loop({ filter: 'bandpass', freq: 1500, q: 0.8 }); }
          patch.face('wow', 900);
        },
        up: () => { if (G.stage === 'baking') stopBake(); }
      });
      S.listen(oven, 'keydown', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && G.stage === 'bakeReady') { e.preventDefault(); G.stage = 'baking'; G.baking = true; K.guide(null); oven.classList.add('is-down'); K.sfx.tap(); if (A.ctx && !sizzle) sizzle = A.loop({ filter: 'bandpass', freq: 1500, q: 0.8 }); } });
      S.listen(oven, 'keyup', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && G.stage === 'baking') stopBake(); });
      function stopBake() {
        if (!G.baking) return;
        G.baking = false; G.bakeDone = true; G.stage = 'baked';
        oven.classList.remove('is-down');
        if (sizzle) { const sz = sizzle; sizzle = null; sz.level(0.0001, 0.2); S.later(() => sz.stop(), 600); }
        const b = G.bake, golden = b >= GOLD[0] && b <= GOLD[1];
        if (A.ctx) { A.chime(A.note('A5'), { vol: 0.12, dur: 1.6 }); A.chime(A.note('E6'), { when: A.now() + 0.12, vol: 0.08, dur: 1.4 }); }
        if (golden) { K.sfx.great(); K.pop('GOLDEN!', { x: L.cx, y: L.cy - L.ry - 30, kind: 'great' }); }
        else K.pop(b < GOLD[0] ? 'SOFT BAKE' : 'EXTRA CRISPY', { x: L.cx, y: L.cy - L.ry - 30, kind: 'good' });
        P.emit('star', L.cx, L.cy - 10, 16, { colors: ['#fff3c4', '#ffd36b', '#ffffff'] });
        say(golden ? LN.golden : b < GOLD[0] ? LN.pale : LN.toasty, { mood: 'laugh', ms: 3000 });
        oven.hidden = true;
        S.later(finale, RM() ? 900 : 2300);
      }
      K.loop(() => { if (G.baking && G.bake >= 1.35) stopBake(); });

      /* ---------------- finale: everyone takes a slice ---------------- */
      let finished = false;
      const served = [];
      function seats() {
        const n = G.slices.length - 1, out = [], x0 = L.W * (L.ph ? 0.13 : 0.2), x1 = L.W * (L.ph ? 0.87 : 0.8);
        for (let i = 0; i < n; i++) {
          const x = n === 1 ? L.W / 2 : lerp(x0, x1, i / (n - 1));
          out.push({ who: i === 0 ? 'patch' : GUESTS[i - 1], plate: { x, y: L.tFar + (L.ph ? 38 : 52) }, head: { x, y: L.tFar - (L.ph ? 70 : 92) } });
        }
        return out;
      }
      async function finale() {
        if (G.stage === 'end') return;
        G.stage = 'end'; K.guide(null);
        bg2Cv.el.style.opacity = '1';
        legend.style.opacity = '0'; card.classList.add('is-gone'); pcts.forEach(e => { e.style.opacity = '0'; });
        ALLJ.forEach(j => { j.tag.classList.add('is-gone'); j.hit.hidden = true; });
        pieHit.hidden = true; dock.innerHTML = '';
        patch.hush();
        if (M) M.level(0.85);
        if (A.ctx) { A.whoosh({ vol: 0.12, dur: 0.8 }); }
        const st = seats(), f = fracs(), pl = pctList();
        G.serveT = 0;
        // slice i>0 goes to a guest (Patch takes the last one); ME goes to your plate at the front
        let acc = f[0];
        const plan = serious() && Array.isArray(an.leads) ? (an.leads.find(l => l && l.kind === 'prepare') || an.leads.find(l => l && l.kind === 'ask') || an.leads[0]) : null;
        G.slices.forEach((sl, i) => {
          const mid = i === 0 ? f[0] / 2 : acc + f[i] / 2; if (i > 0) acc += f[i];
          const seat = i === 0 ? { who: 'you', plate: L.youP, big: true } : st[Math.min(st.length - 1, i - 1)];
          served.push({ sl, i, frac: f[i], pct: pl[i], a0: (i === 0 ? 0 : acc - f[i]), a1: (i === 0 ? f[0] : acc), mid, seat, k: 0, delay: 0.5 + (i === 0 ? G.slices.length : i) * 0.26 });
        });
        await K.sleep(RM() ? 200 : 1000);
        // Patch takes the host's seat; friends arrive along the far side
        const gs = L.ph ? 60 : 80;
        st.forEach((s, i) => {
          if (s.who === 'patch') { patch.side('above'); patch.place(s.head.x - L.patchSz / 2, L.tFar - L.patchSz - 4, 700); return; }
          S.later(() => { const img = h('img', { class: 'rp-guest', alt: '', src: K.face(s.who, ['happy', 'love', 'laugh', 'celebrate', 'wink', 'cool'][i % 6]), style: { '--sz': gs + 'px' } }); el.append(img); pos(img, s.head.x - gs / 2, L.tFar - gs - 4); if (A.ctx) A.pop({ freq: 500 + i * 120, vol: 0.1 }); }, i * 180);
        });
        patch.base('cosy');
        await K.sleep(RM() ? 200 : 900);
        G.serving = true;
        if (A.ctx) served.forEach((s, i) => A.chime(A.note(['C5', 'E5', 'G5', 'A5', 'C6', 'E6', 'G6'][i % 7]), { when: A.now() + 0.4 + i * 0.28, vol: 0.06, dur: 1.2 }));
        await K.sleep(RM() ? 300 : 900 + served.length * 280);
        // place cards
        const colW = st.length > 1 ? Math.abs(st[1].plate.x - st[0].plate.x) : 160;
        served.forEach(s => {
          const isMe = s.i === 0;
          const c = h('div', { class: 'rp-place' + (isMe ? ' is-me' : ''), style: { '--c': s.sl.col, '--mw': Math.max(64, colW - 6) + 'px' } }, h('b', { text: s.pct + '%' }), h('span', { text: isMe ? 'Your slice' : s.sl.name }));
          el.append(c);
          const cw = c.offsetWidth || 80;
          pos(c, clamp(s.seat.plate.x, 8 + cw / 2, L.W - 8 - cw / 2), s.seat.plate.y + (isMe ? (L.ph ? 36 : 48) : (L.ph ? 16 : 24)));
        });
        if (plan) { const pc = h('div', { class: 'rp-plan' }, h('small', { text: 'Your slice comes with a next step' }), h('span', { text: K.sentence(K.words(plan.text, 16)) })); dock.append(pc); dock.style.top = (L.youP.y + (L.ph ? 88 : 84)) + 'px'; }
        patch.base('celebrate'); patch.react('bounce');
        say(serious() ? LN.finalReal : LN.final, { ms: 0 });
        await K.finale('petals', { colors: [FILL.me].concat(FILL.c.slice(0, 4)), chord: ['C4', 'E4', 'G4', 'B4'], ms: RM() ? 1800 : 4200 });
        const R = rewards();
        finished = true;
        const others = G.slices.slice(1).map(s => s.name.toLowerCase());
        ctx.finish({
          title: serious() ? 'Your slice, owned, with a plan' : 'Shared out fairly', mood: 'celebrate',
          lines: ['Me: 100% → ' + pl[0] + '%', 'Shared with: ' + others.slice(0, 4).join(', '), plan ? 'Next step: ' + K.sentence(K.words(plan.text, 12)) : R.line],
          share: 'Baked a responsibility pie: my slice went from 100% to ' + pl[0] + '%.',
          badges: R.badges
        });
      }
      function drawPlate(g, p, big) {
        const rx = big ? (L.ph ? 96 : 130) : (L.ph ? 30 : 52), ry = rx * (big ? 0.34 : 0.36);
        g.fillStyle = 'rgba(0,0,0,0.14)'; g.beginPath(); g.ellipse(p.x + 3, p.y + 5, rx + 2, ry + 2, 0, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(p.x, p.y, rx, ry, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(214,58,74,0.4)'; g.lineWidth = big ? 3 : 2; g.beginPath(); g.ellipse(p.x, p.y, rx * 0.78, ry * 0.76, 0, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 1; g.beginPath(); g.ellipse(p.x, p.y, rx, ry, 0, 0, TAU); g.stroke();
      }
      function drawWedge(g, x, y, ssc, a0, a1, col, bake) {
        const rx = L.rx * ssc, ry = L.ry * ssc, th = L.th * ssc, am = (a0 + a1) / 2;
        // centre the wedge on its own middle so it sits on the plate
        const cx = x - Math.cos(am) * rx * 0.45, cy = y - Math.sin(am) * ry * 0.45;
        g.fillStyle = mixHex('#c98a4a', '#7a4a22', clamp(bake, 0, 1)); g.beginPath(); g.moveTo(cx, cy + th); g.ellipse(cx, cy + th, rx, ry, 0, a0, a1); g.closePath(); g.fill();
        g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy); g.ellipse(cx, cy, rx * 0.94, ry * 0.94, 0, a0, a1); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.moveTo(cx, cy); g.ellipse(cx, cy, rx * 0.6, ry * 0.6, 0, a0, a0 + (a1 - a0) * 0.4); g.closePath(); g.fill();
        g.strokeStyle = crustCol(bake); g.lineWidth = Math.max(3, 11 * ssc); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, a0, a1); g.stroke();
      }
      function drawServe(g, t, dt) {
        const tin = { x: L.tcx, y: L.tcy }, sc = L.ph ? 0.6 : 0.56;
        served.forEach(s => drawPlate(g, s.seat.plate, s.seat.big));
        if (!G.serving) { const e = K.ease.inOutCubic(G.scene); const x = lerp(L.cx, tin.x, e), y = lerp(L.cy, tin.y, e), q = lerp(1, sc, e); drawPie(g, t, x, y, q, G.bake); drawSteam(g, t, x, y - L.ry * 0.4 * q, 3, 1); drawRays(g, t); return; }
        G.serveT += dt;
        g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(tin.x + 4, tin.y + 10, L.rx * sc + 8, L.ry * sc + 6, 0, 0, TAU); g.fill();
        g.fillStyle = '#c9ced6'; g.beginPath(); g.ellipse(tin.x, tin.y, L.rx * sc + 5, L.ry * sc + 4, 0, 0, TAU); g.fill();
        g.fillStyle = '#e3e7ee'; g.beginPath(); g.ellipse(tin.x, tin.y, L.rx * sc - 4, L.ry * sc - 3, 0, 0, TAU); g.fill();
        g.fillStyle = crustCol(G.bake); for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(tin.x + Math.cos(i * 2.3) * L.rx * sc * 0.55, tin.y + Math.sin(i * 2.3) * L.ry * sc * 0.55, 2 + (i % 3), 0, TAU); g.fill(); }
        served.forEach(s => {
          s.k = clamp((G.serveT - s.delay) / (RM() ? 0.2 : 0.85), 0, 1);
          const e = K.ease.inOutCubic(s.k), to = s.seat.plate;
          const endSc = s.seat.big ? (L.ph ? 0.8 : 0.72) : (L.ph ? 0.26 : 0.32);
          const x = lerp(tin.x, to.x, e), y = lerp(tin.y, to.y - (s.seat.big ? 8 : 3), e) - Math.sin(e * Math.PI) * (s.seat.big ? 40 : 70);
          drawWedge(g, x, y, lerp(sc, endSc, e), angOf(s.a0), angOf(s.a1), s.sl.col, G.bake);
          if (s.k >= 1 && !s.landed) { s.landed = true; if (A.ctx) A.tone({ type: 'sine', freq: 1800 + s.i * 120, dur: 0.12, vol: 0.04 }); P.emit('smoke', to.x, to.y - 10, 3, { colors: ['rgba(255,255,255,0.4)'], angle: -Math.PI / 2, spread: 0.4, speed: [10, 25] }); }
          if (s.landed) drawSteam(g, t + s.i, to.x, to.y - (s.seat.big ? 30 : 12), s.seat.big ? 2 : 1, 0.8);
        });
        drawRays(g, t);
      }
      function drawRays(g, t) {
        // warm morning light through the big window
        const k = clamp((G.serveT || 0) / 2 + G.scene * 0.4, 0, 1), w = L.bwin; g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const x0 = w.x + w.w * (0.18 + i * 0.2), sway = Math.sin(t * 0.3 + i) * 8;
          const gr = g.createLinearGradient(x0, w.y + w.h, x0 + 60, L.H); gr.addColorStop(0, `rgba(255,214,150,${0.13 * k})`); gr.addColorStop(1, 'rgba(255,214,150,0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(x0, w.y + w.h * 0.5); g.lineTo(x0 + w.w * 0.08, w.y + w.h * 0.5); g.lineTo(x0 + w.w * 0.3 + sway, L.H); g.lineTo(x0 + w.w * 0.1 + sway, L.H); g.closePath(); g.fill();
        }
        g.restore();
      }
      function rewards() {
        const b = G.bake, dist = b < GOLD[0] ? GOLD[0] - b : b > GOLD[1] ? b - GOLD[1] : 0, score = clamp(1 - dist / 0.45, 0, 1);
        const tier = K.tier(score, [0.3, 0.7, 0.98]), pctScore = Math.round(score * 100);
        const best = K.best('bake', pctScore, 'higher');
        const col = K.collect(PIE.name);
        const badges = [];
        if (tier) badges.push(tier + ' bake');
        if (best.isNew) badges.push('New best bake: ' + pctScore + '%');
        badges.push(col.isNew ? 'Collected: ' + PIE.name : PIE.name + ' · ' + col.count + ' of ' + PIES.length + ' crusts');
        ctx.track('result', { me: pctList()[0], slices: G.slices.length, bake: pctScore, edits: G.edits });
        return { badges, line: (score >= 0.98 ? 'Baked to golden' : b < GOLD[0] ? 'A soft bake' : 'An extra-crispy bake') + ' · ' + (G.slices.length - 1) + ' ingredients listed' };
      }

      /* ---------------- lines (every vibe) ---------------- */
      function lines() {
        return {
          start: { Jolly: 'Morning! This pie is for an honest look at who and what made this happen. First, pour in how it feels.', Cheeky: 'Pie time. First, pour in how it feels. Probably “all me”, right?', Unfiltered: 'Fill the pie with how it feels. Then we check it.' },
          startCare: { Jolly: 'This sounds genuinely hard. Let’s look fairly at what played a part, without pretending.', Cheeky: 'Serious one, so no jokes from me. Let’s look at it fairly.', Unfiltered: 'Real situation. Let’s be fair about it.' },
          meFirst: { Jolly: 'ME jar first! That’s how it feels right now.', Cheeky: 'Patience. The ME jar goes in first.', Unfiltered: 'ME jar first.' },
          meFilled: { Jolly: '100% you. That’s how it feels. Now, what else went into the recipe?', Cheeky: 'One giant cherry slice labelled ME. Classic. What else is in there?', Unfiltered: 'All you. That’s the feeling. Now the other ingredients.' },
          jars: { Jolly: 'Drag in every ingredient that played a part. Each one gets its own slice.', Cheeky: 'Recipes have more than one ingredient. Add the others.', Unfiltered: 'Add every other factor. Each gets a slice.' },
          firstJar: { Jolly: 'See? The ME slice just got smaller.', Cheeky: 'Look at that, room on the plate already.', Unfiltered: 'ME shrank. Keep going.' },
          moreJars: { Jolly: 'Add anything else that played a part, then tap “That’s everything”.', Cheeky: 'More? Or is that the lot? Tap the button when it is.', Unfiltered: 'Any more? Tap the button when done.' },
          allJars: { Jolly: 'Every ingredient’s in. Now let’s size the slices.', Cheeky: 'Full recipe! Now the slicing.', Unfiltered: 'All in. Now size them.' },
          slice: { Jolly: 'Now size each slice honestly. Drag the edges round the rim. Fair to them, fair to you.', Cheeky: 'Slice it fairly. No hogging the blame, no dodging it either.', Unfiltered: 'Resize the slices. Honest sizes. Yours stays at least 5%.' },
          sliceReal: { Jolly: 'Some of this may really be yours, and that’s okay to own. Size every slice honestly.', Cheeky: 'Be straight with it. Your bit might be big, and that’s fine.', Unfiltered: 'Size it honestly. If it’s mostly yours, say so.' },
          minMe: { Jolly: 'Some of it is yours, and that’s okay. Your slice stays at least a sliver.', Cheeky: 'Nice try. You get at least a sliver.', Unfiltered: 'Not zero. Some of it’s yours.' },
          fair: { Jolly: 'That looks fair. Hold the oven button and let go when it’s golden.', Cheeky: 'Lovely slicing. Into the oven! Let go at golden, not charcoal.', Unfiltered: 'Fair. Hold to bake. Let go at golden.' },
          stillBig: { Jolly: 'Still a big slice for you. If that’s honest, that’s okay. Bake when ready.', Cheeky: 'Big ME slice. Fair if it’s true. Oven’s ready.', Unfiltered: 'Big slice. Fine if true. Bake.' },
          golden: { Jolly: 'Perfectly golden!', Cheeky: 'Chef’s kiss.', Unfiltered: 'Golden.' },
          pale: { Jolly: 'A soft bake. Still lovely!', Cheeky: 'Soft bake. Bold choice.', Unfiltered: 'Underdone. Fine.' },
          toasty: { Jolly: 'A little toasty. Still delicious.', Cheeky: 'Extra crispy. I like it that way.', Unfiltered: 'Bit dark. Still pie.' },
          final: { Jolly: 'Everyone takes a slice. You don’t have to carry the whole pie.', Cheeky: 'Pie for everyone! Turns out you weren’t the only ingredient.', Unfiltered: 'Shared out. Your slice is yours. The rest isn’t.' },
          finalReal: { Jolly: 'Your slice is real, and owning it is how you make it right. The rest is shared.', Cheeky: 'You own your slice. That’s the brave bit. Next step’s on the plate.', Unfiltered: 'Your part is real. Do the next step. The rest isn’t yours.' }
        };
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => place());
      S.on('theme', () => { el.classList.toggle('rp-dark', K.dark()); el.classList.toggle('rp-bright', !K.dark()); paintBG(); paintBG2(); });
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => {
        if (!a || a === an || G.stage !== 'intro') return;
        an = a; FACTORS = factorList(); jars.forEach((j, i) => { if (FACTORS[i]) { j.name = FACTORS[i]; j.tag.textContent = j.name; } });
      }).catch(() => {});
      (async () => {
        M = K.music('calm'); M.level(0.6);
        await K.intro({ title: 'Responsibility Pie', sub: 'When it feels like all your fault, bake a pie of everything that played a part.', how: 'Pour in the ME jar, add every other ingredient, then slice it fairly.', char: 'patch', mood: 'cosy' });
        G.stage = 'me'; G.arc = true;
        say(care() ? LN.startCare : LN.start, { mood: care() ? 'calm' : 'hug', moodMs: 1400, ms: 5600 });
        guideStep(1300);
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 20000)) return false; await K.wait(80); } return true; };
          const dragJar = async (j) => { const r = K.rectIn(j.hit); await K.sim.drag(j.hit, { x: r.w / 2, y: r.h / 2 }, { x: L.cx - r.x, y: L.cy - 30 - r.y }, 650, 16); };
          await until(() => G.stage === 'me', 15000);
          await K.wait(900);
          await dragJar(me);
          await until(() => G.stage === 'jars', 8000);
          const n = Math.min(jars.length, inten === 0 ? 3 : 4);
          for (let i = 0; i < n; i++) {
            await until(() => G.stage === 'jars' && !G.drag && ALLJ.every(q => !q.fly && !q.pouring), 6000);
            await K.wait(500);
            const j = jars.find(q => q.state === 'shelf'); if (!j) break;
            await dragJar(j);
            await until(() => j.state !== 'shelf', 3000);
          }
          await until(() => G.stage === 'slice' || (!doneBtn.hidden && ALLJ.every(q => !q.fly && !q.pouring)), 8000);
          if (G.stage === 'jars') { await K.wait(700); await K.sim.tap(doneBtn); }
          await until(() => G.stage === 'slice', 6000);
          await K.wait(1200);
          // drag the ME edge round the rim so ME settles near 30%
          const pr = K.rectIn(pieHit), k = 1, f0 = G.B[k], f1 = 0.3;
          const hp = await K.sim.press(pieHit, rim(angOf(f0), 1).x - pr.x, rim(angOf(f0), 1).y - pr.y);
          for (let s = 1; s <= 14; s++) { await K.wait(55); const ff = lerp(f0, f1, s / 14), q = rim(angOf(ff), 1); hp.move(q.x - pr.x, q.y - pr.y); }
          const qe = rim(angOf(f1), 1); hp.up(qe.x - pr.x, qe.y - pr.y);
          await until(() => G.stage === 'bakeReady', 4000);
          await K.wait(1400);
          const op = await K.sim.press(oven);
          await until(() => G.bake >= 0.7 || G.stage !== 'baking', 9000);
          op.up();
          await until(() => finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
