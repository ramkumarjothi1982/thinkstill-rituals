/* 005 Mood Glasses — Reframe · REFRAME · Emotion
 * Mechanism: an emotional-reasoning check ("feelings aren't facts"; Beck's cognitive therapy, Burns 1980). The same street
 * is seen through four lenses: the fear lens rewrites the signs into the hot thought and lights up the thinking traps it
 * adds, the fact lens shows only what a camera caught (until the feeling fogs the glass again and the player rubs it
 * clear), the friend and future lenses show kinder, longer views. Then the player keeps a fairer pair, honestly (the fear
 * lens may stay when the facts back it, and then a plan comes with it).
 * Verb: swap (swipe or tap a lens, drag the brass barrel to focus it, rub off the fog, hold to engrave).
 * Finale: daylight floods the giant glasses, prism rainbows spill across the shop, the chosen pair sparkles on velvet.
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'mood-glasses', mode: 'reframe', name: 'Mood Glasses', verb: 'swap', family: 'REFRAME', minutes: 2,
    parents: ['Emotion', 'Beliefs / Evidence'],
    cast: ['sync'], poster: { char: 'sync', mood: 'rainbow' },
    tagline: 'Swap four lenses on the same street. See what the feeling adds.',
    why: 'When a feeling feels like proof: compare the fear lens with the facts, then pick a fairer pair.',
    css: `
.g-mood-glasses .mg-nav { position: absolute; z-index: 32; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 62px); transform: translateX(-50%); display: flex; align-items: center; gap: 10px; transition: opacity .4s ease; }
.g-mood-glasses .mg-nav.is-gone { opacity: 0; pointer-events: none; }
.g-mood-glasses .mg-arrow { width: 44px; height: 44px; flex: none; border-radius: 50%; border: 1px solid var(--ui-line); background: var(--ui-surface); color: var(--ui-fg);
  display: grid; place-items: center; cursor: pointer; padding: 0; box-shadow: 0 6px 16px rgba(0,0,0,.25); transition: transform .12s ease, opacity .2s ease; }
.g-mood-glasses .mg-arrow:active { transform: scale(.9); }
.g-mood-glasses .mg-arrow[disabled] { opacity: .35; cursor: default; }
.g-mood-glasses .mg-arrow svg { width: 20px; height: 20px; }
.g-mood-glasses .mg-pill { display: flex; align-items: center; gap: 9px; min-width: 188px; justify-content: center; padding: 11px 16px; border-radius: 999px; background: var(--ui-surface);
  border: 1px solid var(--ui-line); color: var(--ui-fg); box-shadow: 0 6px 18px rgba(0,0,0,.25); }
.g-mood-glasses .mg-pill.is-pop { animation: mood-glasses-pop .4s cubic-bezier(.2,1.5,.4,1); }
@keyframes mood-glasses-pop { 0% { transform: scale(.9); } 60% { transform: scale(1.07); } 100% { transform: none; } }
.g-mood-glasses .mg-pill b { font: 700 15px/1 var(--font-ui); letter-spacing: .07em; text-transform: uppercase; white-space: nowrap; }
.g-mood-glasses .mg-dot { width: 14px; height: 14px; flex: none; border-radius: 50%; background: var(--lc, #fff); box-shadow: 0 0 10px var(--lc, #fff), inset 0 0 0 2px rgba(255,255,255,.55); }
.g-mood-glasses .mg-count { font: 600 13px/1 var(--font-ui); color: var(--ui-muted); letter-spacing: .04em; }
.g-mood-glasses .mg-hit { position: absolute; z-index: 13; touch-action: none; cursor: grab; border-radius: 30px; }
.g-mood-glasses .mg-hit:active { cursor: grabbing; }
.g-mood-glasses .mg-sign { position: absolute; z-index: 11; left: 0; top: 0; transform: translate(calc(-50% + var(--rub, 0px)), -100%) rotate(var(--sw, 0deg)); transform-origin: 50% 100%; pointer-events: none; transition: opacity .45s ease; will-change: transform; }
.g-mood-glasses .mg-sign.is-gone { opacity: 0; }
.g-mood-glasses .mg-sign::after { content: ""; position: absolute; left: 50%; top: 100%; width: 8px; height: var(--post, 12px); margin-left: -4px; background: linear-gradient(90deg, #4a2e14, #8a6440 50%, #3e2610); }
.g-mood-glasses .mg-sign.is-fear::after { background: linear-gradient(90deg, #1a0604, #3a120a 50%, #120402); }
.g-mood-glasses .mg-board { position: relative; overflow: hidden; border-radius: 12px; padding: 9px 12px 10px; border: 2px solid var(--b-edge); background: var(--b-bg); color: var(--b-ink); text-align: center;
  box-shadow: 0 9px 18px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.35); transition: color .3s ease, border-color .3s ease; }
.g-mood-glasses .mg-board::before, .g-mood-glasses .mg-board::after { content: ""; position: absolute; top: 6px; width: 5px; height: 5px; border-radius: 50%; background: rgba(0,0,0,.35); box-shadow: inset 0 1px 0 rgba(255,255,255,.45); }
.g-mood-glasses .mg-board::before { left: 6px; }
.g-mood-glasses .mg-board::after { right: 6px; }
.g-mood-glasses .is-blur .mg-scrib { opacity: var(--so, .5); transition: opacity .2s ease; }
.g-mood-glasses .mg-head { display: block; font: 700 12px/1.1 var(--font-ui); letter-spacing: .14em; text-transform: uppercase; opacity: .85; margin: 1px 0 6px; }
.g-mood-glasses .mg-words { margin: 0; font: 600 16px/1.27 var(--font-ui); text-wrap: balance; overflow: hidden; }
.g-mood-glasses .mg-words.is-clamp { display: -webkit-box; -webkit-box-orient: vertical; }
.g-mood-glasses .mg-words mark { background: none; color: inherit; border-bottom: 2px solid currentColor; padding: 0 1px; }
.g-mood-glasses .mg-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.g-mood-glasses .mg-tag { font: 700 14px/1 var(--font-ui); letter-spacing: .03em; padding: 7px 10px; border-radius: 999px; border: 1.5px solid currentColor; white-space: nowrap; }
.g-mood-glasses .mg-scrib { display: flex; flex-direction: column; gap: 8px; align-items: center; padding: 7px 4px 5px; }
.g-mood-glasses .mg-scrib i { display: block; height: 9px; border-radius: 5px; background: currentColor; opacity: .38; }
.g-mood-glasses .mg-sign.is-fear { --b-bg: linear-gradient(180deg, #4d1014, #2a0709); --b-edge: #ff6f5e; --b-ink: #ffe6df; }
.g-mood-glasses .mg-sign.is-fear .mg-words { text-shadow: 0 0 10px rgba(255, 80, 60, .9); }
.g-mood-glasses .mg-sign.is-fear .mg-tag { color: #ffd6cc; background: rgba(255, 70, 50, .24); box-shadow: 0 0 14px rgba(255, 96, 60, .85); animation: mood-glasses-glow 1.5s ease-in-out infinite; will-change: opacity; }
.g-mood-glasses .mg-sign.is-fact { --b-bg: linear-gradient(180deg, #fffdf7, #ece4d2); --b-edge: #c4b89e; --b-ink: #1b2230; }
.g-mood-glasses .mg-sign.is-friend { --b-bg: linear-gradient(180deg, #fff3d4, #ffd893); --b-edge: #e0963b; --b-ink: #4a2905; }
.g-mood-glasses .mg-sign.is-future { --b-bg: linear-gradient(180deg, #f3e6cb, #dbc398); --b-edge: #a98353; --b-ink: #44301a; }
.g-mood-glasses .mg-sign.is-future .mg-words { font-style: italic; }
@keyframes mood-glasses-glow { 0%, 100% { opacity: .72; } 50% { opacity: 1; } }
.g-mood-glasses .mg-focus { position: absolute; z-index: 34; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 7px; }
.g-mood-glasses .mg-barrel { position: relative; width: var(--bw, 300px); height: 58px; border-radius: 16px; touch-action: none; cursor: ew-resize; overflow: hidden; outline: none;
  background: linear-gradient(180deg, #4a2e0a 0%, #c99536 9%, #fbe7ad 24%, #fff6d6 33%, #e3b456 55%, #a8721f 80%, #3e2706 100%);
  box-shadow: 0 12px 24px rgba(0,0,0,.45), 0 0 0 1px rgba(60,35,5,.6), inset 0 0 0 1px rgba(255,255,255,.25); transition: box-shadow .2s ease; }
.g-mood-glasses .mg-barrel.is-sweet { box-shadow: 0 12px 24px rgba(0,0,0,.45), 0 0 0 2px #8fe3b0, 0 0 22px rgba(143,227,176,.75); }
.g-mood-glasses .mg-barrel:focus-visible { box-shadow: 0 0 0 3px var(--ui-accent), 0 12px 24px rgba(0,0,0,.45); }
.g-mood-glasses .mg-knurl { position: absolute; inset: 0; background: repeating-linear-gradient(90deg, rgba(70,40,6,.6) 0 2px, rgba(255,246,214,.35) 2px 4px, rgba(0,0,0,0) 4px 9px); background-position: var(--kx, 0px) 0; opacity: .85; }
.g-mood-glasses .mg-knurl::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(40,22,2,.55), rgba(0,0,0,0) 18%, rgba(0,0,0,0) 82%, rgba(40,22,2,.55)); }
.g-mood-glasses .mg-barrel span { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 6px 12px; border-radius: 999px; background: rgba(42, 25, 3, .8); color: #ffe7a8;
  font: 800 14px/1 var(--font-ui); letter-spacing: .2em; white-space: nowrap; pointer-events: none; box-shadow: inset 0 1px 0 rgba(255,255,255,.15); }
.g-mood-glasses .mg-sharp { width: var(--bw, 300px); height: 7px; border-radius: 4px; background: rgba(0,0,0,.32); overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,.4); }
.g-mood-glasses .mg-sharp i { display: block; height: 100%; width: calc(var(--s, 0) * 100%); border-radius: 4px; background: linear-gradient(90deg, #ff7a52, #ffd36b 55%, #8fe3b0); }
.g-mood-glasses .mg-focus.is-shake .mg-barrel { animation: mood-glasses-shake .4s ease; }
@keyframes mood-glasses-shake { 20% { transform: translateX(-6px); } 45% { transform: translateX(5px); } 70% { transform: translateX(-3px); } }
.g-mood-glasses .mg-rackb { position: absolute; z-index: 15; width: 52px; height: 52px; margin: -26px 0 0 -26px; border-radius: 50%; border: 0; background: transparent; cursor: pointer; padding: 0; }
.g-mood-glasses .mg-rackb:focus-visible { outline: 3px solid var(--ui-accent); outline-offset: 2px; }
.g-mood-glasses .mg-rackb[hidden] { display: none; }
.g-mood-glasses .mg-today { position: absolute; z-index: 12; left: 50%; transform: translateX(-50%); padding: 7px 14px 8px; border-radius: 8px; font: 700 12px/1.2 var(--font-ui); letter-spacing: .12em;
  text-transform: uppercase; white-space: nowrap; color: #3a2304; background: linear-gradient(180deg, #fff1c2, #e3b45a 60%, #b58028); box-shadow: 0 6px 14px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.8); }
.g-mood-glasses .mg-today.is-plan { white-space: normal; box-sizing: border-box; width: calc(100% - 36px); max-width: 560px; text-transform: none; letter-spacing: .01em; font: 600 15px/1.3 var(--font-ui); text-align: center; padding: 8px 14px 9px; }
.g-mood-glasses .mg-today.is-new { animation: mood-glasses-popc .55s cubic-bezier(.2,1.5,.4,1); }
@keyframes mood-glasses-popc { 0% { transform: translateX(-50%) scale(.9); } 60% { transform: translateX(-50%) scale(1.08); } 100% { transform: translateX(-50%); } }
.g-mood-glasses .mg-choose { position: absolute; z-index: 34; left: 50%; transform: translateX(-50%); width: min(430px, calc(100% - 24px)); display: flex; flex-direction: column; align-items: center; gap: 10px; }
.g-mood-glasses .mg-q { margin: 0; font: 700 16px/1.2 var(--font-ui); color: var(--ui-fg); text-align: center; background: var(--ui-surface); padding: 10px 16px;
  border-radius: 999px; border: 1px solid var(--ui-line); box-shadow: 0 6px 16px rgba(0,0,0,.22); }
.g-mood-glasses .mg-choose .gk-chips { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
.g-mood-glasses .mg-choose .gk-chip { display: flex; align-items: center; justify-content: center; gap: 9px; min-height: 50px; font-weight: 600; font-size: 16px; background: var(--ui-surface); box-shadow: 0 6px 16px rgba(0,0,0,.2); }
.g-mood-glasses .mg-choose .gk-chip::before { content: ""; width: 15px; height: 15px; flex: none; border-radius: 50%; background: var(--lc); box-shadow: 0 0 8px var(--lc), inset 0 0 0 2px rgba(255,255,255,.5); }
.g-mood-glasses .mg-choose .gk-chip[aria-pressed="true"] { border-color: var(--lc); border-width: 2px; background: color-mix(in srgb, var(--lc) 30%, var(--ui-surface)); }
.g-mood-glasses .mg-choose .gk-chip[aria-pressed="true"]::after { content: "✓"; font-weight: 800; }
.g-mood-glasses .mg-choose.is-engr .mg-q, .g-mood-glasses .mg-choose.is-engr .gk-chips { display: none; }
.g-mood-glasses .mg-choose.is-end .mg-hold { display: none; }
.g-mood-glasses .mg-hold { position: relative; width: min(280px, 100%); height: 56px; border: 0; border-radius: 999px; cursor: pointer; touch-action: none; overflow: hidden; color: #2b1a03; padding: 0;
  background: linear-gradient(180deg, #fff3c8, #e9bc5d 55%, #b07d24); box-shadow: 0 10px 22px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.75), inset 0 -2px 0 rgba(90,50,5,.35); transition: filter .25s ease, opacity .25s ease; }
.g-mood-glasses .mg-hold.is-off { filter: grayscale(.85); opacity: .5; }
.g-mood-glasses .mg-hold i { position: absolute; left: 0; top: 0; bottom: 0; width: calc(var(--p, 0) * 100%); background: linear-gradient(90deg, rgba(255,255,255,.2), rgba(255,255,255,.65)); }
.g-mood-glasses .mg-hold b { position: relative; font: 700 16px/1 var(--font-ui); letter-spacing: .02em; }
.g-mood-glasses .mg-plate { position: relative; width: 100%; box-sizing: border-box; padding: 13px 20px 14px; border-radius: 14px; text-align: center; animation: mood-glasses-plate .6s cubic-bezier(.2, 1.3, .4, 1) both;
  background: linear-gradient(180deg, #fff4cc 0%, #ecc771 38%, #cf9c40 72%, #9c6b1d 100%); box-shadow: 0 14px 28px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.85), inset 0 -2px 0 rgba(90,50,5,.5), 0 0 0 1px rgba(80,45,5,.55); }
.g-mood-glasses .mg-plate[hidden] { display: none; }
.g-mood-glasses .mg-plate::before, .g-mood-glasses .mg-plate::after { content: ""; position: absolute; top: 9px; width: 7px; height: 7px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff8dd, #a87a2a 70%); box-shadow: 0 1px 1px rgba(0,0,0,.4); }
.g-mood-glasses .mg-plate::before { left: 9px; }
.g-mood-glasses .mg-plate::after { right: 9px; }
.g-mood-glasses .mg-plate.is-shine { animation: mood-glasses-shine 1.4s ease both; }
@keyframes mood-glasses-plate { from { opacity: 0; transform: translateY(-10px) scale(.95); } to { opacity: 1; transform: none; } }
@keyframes mood-glasses-shine { 0% { filter: brightness(1); } 35% { filter: brightness(1.35); } 100% { filter: brightness(1); } }
.g-mood-glasses .mg-plate small { display: block; font: 800 12px/1 var(--font-ui); letter-spacing: .22em; color: #5b3a07; margin-bottom: 7px; }
.g-mood-glasses .mg-engr { margin: 0; font: 600 16px/1.32 var(--font-ui); color: #3a2304; text-shadow: 0 1px 0 rgba(255,243,205,.8), 0 -1px 0 rgba(80,45,5,.3); text-wrap: balance; }
.g-mood-glasses .mg-engr .mg-ghost { color: rgba(58, 35, 4, .16); text-shadow: none; }
.g-mood-glasses .mg-caret { display: inline-block; width: 0; height: 1em; vertical-align: -2px; }
.g-mood-glasses .mg-plan { margin: 9px 0 0; padding-top: 8px; border-top: 1px solid rgba(90,55,8,.35); font: 600 15px/1.3 var(--font-ui); color: #3a2304; }
.g-mood-glasses.is-calm .mg-focus.is-shake .mg-barrel, .g-mood-glasses.is-calm .mg-sign.is-fear .mg-tag, .g-mood-glasses.is-calm .mg-pill.is-pop, .g-mood-glasses.is-calm .mg-today.is-new { animation: none; }
.g-mood-glasses .gk-char.gk-side-right .gk-bubble { top: auto; bottom: 6px; }
.g-mood-glasses .gk-char.gk-side-right .gk-bubble::before { top: auto; bottom: 22px; }
@container (min-width: 700px) {
  .g-mood-glasses .mg-choose { width: min(760px, calc(100% - 40px)); }
  .g-mood-glasses .mg-choose .gk-chips { grid-template-columns: repeat(4, 1fr); }
  .g-mood-glasses .mg-words { font-size: 18px; }
  .g-mood-glasses .mg-engr { font-size: 18px; }
  .g-mood-glasses .mg-today { font-size: 13px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const inten = ctx.intensity, TAU = Math.PI * 2, visits = K.visits();
      const LENS = [
        { id: 'fear', label: 'Fear lens', short: 'Fear', color: '#ff5d4f', note: 'D4' },
        { id: 'fact', label: 'Fact lens', short: 'Fact', color: '#8fd0ff', note: 'A4' },
        { id: 'friend', label: 'Friend lens', short: 'Friend', color: '#ffb547', note: 'C#5' },
        { id: 'future', label: 'Future lens', short: 'Future', color: '#d2a878', note: 'E5' }
      ];
      const SPECTRUM = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
      const serious = () => an.fear_support === 'strong' || an.fear_support === 'some';
      const care = () => an.safety === 'care';

      /* ---------------- today's shop (the same all day, different tomorrow) ---------------- */
      const WEATHER = K.dailyPick(['clear', 'rain', 'snow', 'blossom', 'leaves'], 1);
      const FRAMES = [
        { name: 'Tortoiseshell', c: ['#2b1407', '#73401a', '#a9692a', '#5a2e10'], spot: ['255,190,105', '28,10,3'] },
        { name: 'Cherry', c: ['#3a0610', '#8a1428', '#d0405a', '#6a0c1e'], spot: ['255,170,190', '40,4,10'] },
        { name: 'Ink blue', c: ['#0b1530', '#1f3a78', '#4a72c4', '#14285a'], spot: ['170,200,255', '5,10,30'] },
        { name: 'Mint', c: ['#0f3a32', '#2f8a74', '#7fd8bf', '#1f6656'], spot: ['210,255,240', '5,30,25'] },
        { name: 'Honey horn', c: ['#3a2306', '#9a6420', '#e6ae55', '#7a4a12'], spot: ['255,230,170', '40,20,4'] },
        { name: 'Gold wire', c: ['#5a3d0a', '#c9952f', '#fbe6a2', '#a8741c'], spot: null }
      ];
      const FRAME = K.dailyPick(FRAMES, 2);
      const PAPER = K.dailyPick([
        { dark: ['#15222a', '#0d161b'], bright: ['#f1ead8', '#e3d8bd'], sd: 'rgba(150,215,205,0.05)', sb: 'rgba(60,110,100,0.08)' },
        { dark: ['#24172a', '#150d19'], bright: ['#f5e9ea', '#e9d6da'], sd: 'rgba(230,170,220,0.05)', sb: 'rgba(120,60,100,0.08)' },
        { dark: ['#18241d', '#0e1711'], bright: ['#eef1e3', '#dde4cd'], sd: 'rgba(180,230,180,0.05)', sb: 'rgba(70,110,60,0.08)' },
        { dark: ['#151c30', '#0b1020'], bright: ['#ecedf4', '#d9dcea'], sd: 'rgba(170,190,255,0.05)', sb: 'rgba(50,70,130,0.08)' }
      ], 3);
      const FRAME_KEY = FRAME.name + ' frames';
      const owned = K.collection();

      /* ---------------- the player's words, tidied (never invented) ---------------- */
      function tidy(s) {
        s = String(s || '').replace(/\s+/g, ' ').trim().replace(/^[\s"“”'’.,;:–—-]+/, '').trim();
        if (!s) return '';
        const close = (open, shut) => {
          const o = s.split(open).length - 1, c = open === shut ? 0 : s.split(shut).length - 1;
          if (open === shut ? o % 2 === 0 : o <= c) return;
          const at = s.lastIndexOf(open), m = /[.!?…]+/.exec(s.slice(at + 1));
          if (m) { const end = at + 1 + m.index + m[0].length; s = s.slice(0, end) + shut + s.slice(end); } else s += shut;
        };
        close('"', '"'); close('“', '”');
        s = s[0].toUpperCase() + s.slice(1);
        if (!/[.!?…"”’)]$/.test(s)) s += '.';
        return s;
      }
      const sentences = (s) => (String(s || '').match(/[^.!?…]+(?:[.!?…]+["”’)]*|$)/g) || []).map(x => x.trim()).filter(x => x.length > 1);
      function two(text, cap) { const t = tidy(text), ss = sentences(t); if (ss.length >= 2) return { L: ss[0], R: ss.slice(1).join(' ') }; return { L: ss[0] || t || cap, R: cap, cap: true }; }
      let TXT = [], ENGRAVE = '', PLAN = '', FEAR_TAG = '', THOUGHT = '';
      function buildTexts() {
        const ex = Array.isArray(an.exhibits) ? an.exhibits : [];
        const cams = ex.filter(e => e && e.kind === 'camera').map(e => tidy(e.text)).filter(Boolean);
        if (!cams.length) cams.push(tidy(an.situation) || 'Something happened.');
        const labels = [];
        (an.distortions || []).forEach(d => { if (d && d.label && !labels.includes(d.label)) labels.push(d.label); });
        const tags = labels.slice(0, 2); if (!tags.includes('Feelings as facts')) tags.push('Feelings as facts');
        FEAR_TAG = labels[0] || 'Feelings as facts';
        THOUGHT = tidy(an.thought || an.conclusion) || 'This means something bad.';
        const fr = two(an.friend, 'What you’d tell a friend.'), fu = two(an.future, 'You, one year on.');
        TXT = [
          { L: { words: THOUGHT, marks: (an.distortions || []).map(d => d && d.quote).filter(Boolean) },
            R: serious() ? { head: 'Worth taking seriously', words: tidy(an.support_reason) || 'Part of this is on record.' } : { head: 'This lens adds', tags } },
          { L: { words: cams[0] }, R: cams.length > 1 ? { words: cams.slice(1, 3).join(' ') } : { head: 'On camera', words: 'That’s all a camera caught.' } },
          { L: { words: fr.L }, R: fr.cap ? { head: 'Friend lens', words: fr.R } : { words: fr.R } },
          { L: { words: fu.L }, R: fu.cap ? { head: 'Future lens', words: fu.R } : { words: fu.R } }
        ];
        ENGRAVE = tidy(String(an.balanced || '').replace(/\s*…\s*$/, '')) || 'The feeling is real. It isn’t the facts.';
        const leads = Array.isArray(an.leads) ? an.leads.filter(l => l && l.text) : [];
        const lead = leads.find(l => l.kind === 'prepare') || leads.find(l => l.kind === 'ask') || leads[0];
        PLAN = serious() && lead ? tidy(lead.text) : '';
      }
      buildTexts();
      const T = ((ctx.text || '') + ' ' + (an.situation || '')).toLowerCase();
      const DOMAIN = /\b(boss|manager|work|job|meeting|colleague|client|office|shift|team)\b/.test(T) ? 'office'
        : /\b(landlord|lease|flat|rent|evict\w*|house|home)\b/.test(T) ? 'home'
          : /\b(text\w*|messag\w*|repl\w*|read|dm|whatsapp|email\w*|phone|call\w*|ghost\w*)\b/.test(T) ? 'phone'
            : /\b(present\w*|speech|class|stage|audience|talk|lecture|party|interview)\b/.test(T) ? 'stage' : 'home';

      /* ---------------- lines (every vibe) ---------------- */
      const LN = {
        start: { Jolly: 'Welcome in! You walked in wearing the fear lens. Turn the focus and read it.', Cheeky: 'Ooh, red frames. Bold. That’s the fear lens. Focus it and let’s see.', Unfiltered: 'You’re wearing the fear lens. Focus it. Read it.' },
        back: { Jolly: 'Welcome back! New frames in the window today. Fear lens first: focus it.', Cheeky: 'A regular! Today’s frames are fancy. Fear lens first. Focus.', Unfiltered: 'Back again. New frames today. Focus the fear lens.' },
        wobble: { Jolly: 'This one won’t sit still today. Strong feelings rarely do. Follow it gently.', Cheeky: 'The fear lens is wriggling. Of course it is. Track it.', Unfiltered: 'It drifts. Feelings do. Follow it, then hold.' },
        sweet: { Jolly: 'There! Hold it right there…', Cheeky: 'Ooh, sharp. Don’t move a muscle.', Unfiltered: 'Sharp. Hold still.' },
        needFocus: { Jolly: 'Focus this lens first, then swap.', Cheeky: 'Patience! Focus first, browse later.', Unfiltered: 'Focus it first.' },
        fearWeak: { Jolly: 'Through fear, every sign reads like proof. That’s the feeling talking.', Cheeky: 'Even the lamp post sounds threatening. Feelings are loud. Not facts.', Unfiltered: 'The feeling is real. It isn’t evidence. Swipe.' },
        fearReal: { Jolly: 'This lens isn’t all wrong today. Part of it is on record. Let’s see it clearly.', Cheeky: 'Okay, not just drama. Some of it is real. Let’s look properly.', Unfiltered: 'Some of this is real. Look at it straight, then plan.' },
        intro: [null,
          { Jolly: 'Fact lens: clear glass. Only what a camera would catch.', Cheeky: 'Gloriously boring glass. Facts only, zero drama.', Unfiltered: 'Plain glass. Camera facts only. Focus.' },
          { Jolly: 'Friend lens: how you’d see it if it happened to someone you love.', Cheeky: 'Friend lens. Same street, far less mean.', Unfiltered: 'What you’d tell a friend. Focus.' },
          { Jolly: 'Future lens: a year from now, looking back.', Cheeky: 'Future lens. A bit sepia. Very wise.', Unfiltered: 'One year out. Focus.' }],
        factWeak: { Jolly: 'That’s everything on record. Notice how much shorter it is than the fear?', Cheeky: 'Shorter than the fear, right? Facts are terrible at drama.', Unfiltered: 'That’s the record. Shorter than the fear.' },
        factReal: { Jolly: 'That’s what’s on record, and it’s worth taking seriously.', Cheeky: 'No spin. That’s the real bit. Worth a plan.', Unfiltered: 'That’s the record. It matters. Plan for it.' },
        fog: { Jolly: 'Uh-oh. The feeling is fogging the glass again. Rub it clear!', Cheeky: 'And the fear’s back, smudging the facts. Typical. Give it a rub.', Unfiltered: 'The feeling’s fogging the facts again. Rub it off.' },
        fogDone: { Jolly: 'There. The facts didn’t move. The fog did. Feelings come back; a wipe helps.', Cheeky: 'Squeaky clean. The facts sat there the whole time, unbothered.', Unfiltered: 'Clear. Facts didn’t change. The fog did.' },
        friend: { Jolly: 'Warmer, and still true. Same facts.', Cheeky: 'Funny how you’re kinder to everyone but you.', Unfiltered: 'Fair. Kind. Same facts.' },
        futureWeak: { Jolly: 'A year out, it looks smaller. Feelings are loud tonight.', Cheeky: 'Future you is way less dramatic. Love that for you.', Unfiltered: 'A year out it shrinks. Usually.' },
        futureReal: { Jolly: 'A year from now you’ll have dealt with this, one step at a time.', Cheeky: 'Future you handled it, step by step. Show-off.', Unfiltered: 'A year out: dealt with. One step at a time.' },
        chooseWeak: { Jolly: 'Which lenses will you keep wearing today? Pick any.', Cheeky: 'Pick your frames. Even the red ones, if they’re honest.', Unfiltered: 'Pick what you’ll wear today. Fear allowed, if honest.' },
        chooseReal: { Jolly: 'Keep the fear lens if it’s honest. Wear the fact lens with it.', Cheeky: 'The fear lens can stay. It made a point. Pair it with facts.', Unfiltered: 'Keep fear if it’s earned. Add facts. Then plan.' },
        keepFear: { Jolly: 'Honest pick. A fact lens beside it keeps it fair.', Cheeky: 'Keeping the red ones? Fair. Add a clear one too.', Unfiltered: 'Fine. Keep it. Facts beside it.' },
        engrave: { Jolly: 'Lovely pair. Hold the button to engrave the frames.', Cheeky: 'Fancy. Hold and I’ll engrave it. No extra charge.', Unfiltered: 'Good. Hold to engrave.' },
        pickFirst: { Jolly: 'Pick at least one lens first.', Cheeky: 'Frames with no lenses? Bold. Pick one.', Unfiltered: 'Pick a lens first.' },
        rackSkip: { Jolly: 'One lens at a time. The next one’s glowing.', Cheeky: 'No skipping the queue. The glowing one’s next.', Unfiltered: 'In order. The glowing one.' },
        finalWeak: { Jolly: 'Daylight! Same street, fairer glasses. Wear them gently.', Cheeky: 'Look at that light. You look great in facts.', Unfiltered: 'Clearer view. Same facts. Go.' },
        finalReal: { Jolly: 'Clear lenses and a real plan. That’s the strong way to see it.', Cheeky: 'Honest frames, real plan. Very this season.', Unfiltered: 'Seen straight. Plan ready. Go.' },
        finalCare: { Jolly: 'Clear lenses and a next step. Someone qualified can help with the rest.', Cheeky: 'Clear view and a next step. Get proper advice for the rest.', Unfiltered: 'Seen straight. Next step ready. Get proper advice.' }
      };

      /* ---------------- state ---------------- */
      const G = { stage: 'intro', cur: 0, pos: [0, 0, 0, 0], target: [0.64, 0.72, 0.58, 0.68], locked: [false, false, false, false], prec: [0, 0, 0, 0], dwell: 0, dragging: false, sweetSaid: false,
        blur: [1, 1, 1, 1], wipe: null, rub: 0, rubV: 0, chosen: [], fin: false, finT: 0, day: 0, prism: 0, standK: 0, drop: 0, flash: 0, boltX: 0.6, nextBolt: 2.5, alt: 0,
        fog: 0, fogT: 0, fogDone: false, rubbed: 0, wipeX: -1, wipeA: 0, t: 0 };
      const zone = [0.11, 0.08, 0.065][inten];
      const dwellNeed = [0.28, 0.36, 0.44][inten];
      const holdMs = [2600, 2000, 1700][inten];
      const rubNeed = [1.5, 2.1, 2.8][inten];
      const drift = visits >= 2 && inten > 0;
      const PAD = 40;
      const tgtOf = (i) => K.clamp(G.target[i] + (drift && i === 0 ? Math.sin(G.t * 0.9) * 0.06 : 0), 0.08, 0.92);

      /* ---------------- DOM ---------------- */
      const cv = K.canvas(el, { maxDpr: 1.5 });
      el.classList.toggle('is-calm', K.reduced()); S.on('motion', (v) => el.classList.toggle('is-calm', !!v));
      const P = K.particles();
      const ICON = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      const prevB = h('button', { type: 'button', class: 'mg-arrow', 'aria-label': 'Previous lens', html: ICON('M15 5l-7 7 7 7') });
      const nextB = h('button', { type: 'button', class: 'mg-arrow', 'aria-label': 'Next lens', html: ICON('M9 5l7 7-7 7') });
      const pillName = h('b', { text: 'Fear lens' }), pillCount = h('span', { class: 'mg-count', text: '1/4' });
      const pill = h('div', { class: 'mg-pill', role: 'status', 'aria-live': 'polite' }, h('i', { class: 'mg-dot' }), pillName, pillCount);
      const nav = h('div', { class: 'mg-nav' }, prevB, pill, nextB);
      const hit = h('div', { class: 'mg-hit', role: 'group', 'aria-label': 'The giant glasses. Swipe left or right to swap lenses.' });
      const signs = ['L', 'R'].map(side => {
        const head = h('span', { class: 'mg-head', hidden: true }), words = h('p', { class: 'mg-words gk-user' }), tags = h('div', { class: 'mg-tags', hidden: true });
        const scrib = h('div', { class: 'mg-scrib', 'aria-hidden': 'true' }, h('i', { style: { width: '88%' } }), h('i', { style: { width: '66%' } }), h('i', { style: { width: '78%' } }));
        const board = h('div', { class: 'mg-board' }, head, words, tags, scrib);
        const s = h('div', { class: 'mg-sign is-fear is-blur', 'data-side': side }, board);
        return { el: s, board, head, words, tags, scrib, side, mode: 'blank', lens: 0, scr: null, maxH: 120, bl: -1 };
      });
      const knurl = h('i', { class: 'mg-knurl' });
      const barrel = h('div', { class: 'mg-barrel', role: 'slider', tabindex: '0', 'aria-label': 'Focus barrel. Drag sideways to sharpen the view, then hold still.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, knurl, h('span', { text: '‹ FOCUS ›' }));
      const sharpBar = h('div', { class: 'mg-sharp', 'aria-hidden': 'true' }, h('i'));
      const focusWrap = h('div', { class: 'mg-focus', hidden: true }, barrel, sharpBar);
      const rackBs = LENS.map((l, i) => h('button', { type: 'button', class: 'mg-rackb', 'aria-label': l.label + ' on the rack', 'data-i': String(i) }));
      const today = h('div', { class: 'mg-today', text: '' });
      const chooseWrap = h('div', { class: 'mg-choose', hidden: true });
      const holdB = h('button', { type: 'button', class: 'mg-hold is-off', 'aria-label': 'Hold to engrave the frames' }, h('i'), h('b', { text: 'Hold to engrave' }));
      const engrCut = h('span'), engrCaret = h('i', { class: 'mg-caret' }), engrGhost = h('span', { class: 'mg-ghost' });
      const plan = h('p', { class: 'mg-plan gk-user', hidden: true });
      const plate = h('div', { class: 'mg-plate', hidden: true }, h('small', { text: 'ENGRAVED ON THE FRAMES' }), h('p', { class: 'mg-engr gk-user' }, engrCut, engrCaret, engrGhost), plan);
      signs.forEach(s => el.append(s.el));
      el.append(hit, nav, focusWrap, ...rackBs, today, chooseWrap);
      chooseWrap.append(h('p', { class: 'mg-q', text: 'Which lenses will you keep wearing today?' }));
      const chips = K.chips(chooseWrap, LENS.map(l => ({ id: l.id, label: l.label })), onChip, { multi: true, label: 'Lenses to keep wearing' });
      Array.from(chips.querySelectorAll('button')).forEach((b, i) => b.style.setProperty('--lc', LENS[i].color));
      chooseWrap.append(plate, holdB);
      const sync = K.character('sync', { side: 'right', mood: 'wink' });
      const say = (lines, o) => sync.say(ctx.line(care() ? Object.assign({}, lines, { Cheeky: lines.Jolly }) : lines), o); /* no jokes near a care-level concern */
      function paintToday(after) {
        const n = after != null ? after : owned.length;
        today.textContent = after != null ? FRAME.name + ' frames added · ' + n + '/' + FRAMES.length
          : 'Today’s frames: ' + FRAME.name + (n ? ' · ' + n + '/' + FRAMES.length + ' collected' : '');
      }
      paintToday();

      /* ---------------- layout + caches ---------------- */
      const L = { W: 0, H: 0 };
      const BG = document.createElement('canvas'), FR = document.createElement('canvas'), FRP = document.createElement('canvas'), S3 = document.createElement('canvas'), FOGC = document.createElement('canvas');
      const g3 = S3.getContext('2d');
      const LOOKC = {};
      let dprS = 1, SCL = null;
      function layout() {
        const W = cv.w || el.clientWidth || 390, H = cv.h || el.clientHeight || 844, phone = W < 700;
        Object.assign(L, { W, H, phone });
        if (phone) {
          L.ft = 9; L.gw = Math.min(W - 2 * (L.ft + 12), 470); L.bridge = Math.round(L.gw * 0.075); L.lw = (L.gw - L.bridge) / 2;
          L.gy = 126; L.lh = Math.round(K.clamp(Math.min(L.lw * 1.6, H * 0.31), 170, 300));
        } else {
          L.ft = 13; L.gw = Math.min(820, W - 420); L.bridge = Math.round(L.gw * 0.085); L.lw = (L.gw - L.bridge) / 2;
          L.gy = 138; L.lh = Math.round(Math.min(L.lw * 0.8, H * 0.35));
        }
        L.gx = Math.round((W - L.gw) / 2);
        L.lensL = { x: L.gx, y: L.gy, w: L.lw, h: L.lh };
        L.lensR = { x: L.gx + L.lw + L.bridge, y: L.gy, w: L.lw, h: L.lh };
        L.below = L.gy + L.lh + L.ft;
        L.barY = L.below + (phone ? 18 : 26);
        L.bw = Math.min(phone ? 300 : 380, W - 60);
        L.counterY = Math.max(L.below + (phone ? 236 : 200), H - (phone ? 204 : 150));
        L.rackY = L.counterY - (phone ? 70 : 76);
        L.rackR = phone ? 22 : 26;
        L.rackX = LENS.map((l, i) => W / 2 + (i - 1.5) * (phone ? 72 : 96));
        L.stand = { x: W / 2, y: L.counterY - (phone ? 34 : 40), s: phone ? 1 : 1.2 };
        Object.assign(hit.style, { left: L.gx + 'px', top: L.gy + 'px', width: L.gw + 'px', height: L.lh + 'px' });
        focusWrap.style.top = L.barY + 'px'; focusWrap.style.setProperty('--bw', L.bw + 'px');
        chooseWrap.style.top = (L.below + 12) + 'px';
        rackBs.forEach((b, i) => { b.style.left = L.rackX[i] + 'px'; b.style.top = L.rackY + 'px'; });
        today.style.top = (L.counterY + (phone ? 44 : 50)) + 'px';
        signs.forEach(placeSign);
        dprS = Math.min(2, cv.dpr || 1);
        SCL = makeScene(L.gw, L.lh, { a: L.lw / 2, b: L.lw + L.bridge + L.lw / 2, fx: L.lw * 0.56 });
        S3.width = Math.max(2, Math.round((L.gw + PAD * 2) * dprS)); S3.height = Math.max(2, Math.round(L.lh * dprS));
        ['fear', 'fact', 'friend', 'future'].forEach(id => { LOOKC[id] = bakeLook(SCL, id, LOOKC[id]); });
        if (LOOKC.day) LOOKC.day = bakeLook(SCL, 'day', LOOKC.day);
        buildBg(); buildFrame(); buildFog(); G.baked = false;
        signs.forEach(s => { if (s.mode === 'words') fitSign(s); });
      
        G.drawnOnce = false;
      }
      function placeSign(s) {
        const ln = s.side === 'L' ? L.lensL : L.lensR;
        const w = Math.round(ln.w - (L.phone ? 20 : 70));
        s.el.style.left = Math.round(ln.x + ln.w / 2 + (s.side === 'L' ? 2 : -2)) + 'px';
        s.el.style.top = Math.round(ln.y + ln.h - (L.phone ? 14 : 24)) + 'px';
        s.el.style.width = w + 'px';
        s.el.style.setProperty('--post', (L.phone ? 12 : 22) + 'px');
        s.maxH = Math.round(ln.h * (L.phone ? 0.64 : 0.58));
      }

      /* ---------------- signs ---------------- */
      const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz#%&?';
      function fillWords(p, text, marks) {
        p.textContent = '';
        const low = text.toLowerCase(), ranges = [];
        (marks || []).forEach(m => { m = String(m || ''); const j = m.length > 3 ? low.indexOf(m.toLowerCase()) : -1; if (j >= 0) ranges.push([j, j + m.length]); });
        ranges.sort((a, b) => a[0] - b[0]);
        let i = 0;
        ranges.forEach(([a, b]) => { if (a < i) return; if (a > i) p.append(document.createTextNode(text.slice(i, a))); p.append(h('mark', { text: text.slice(a, b) })); i = b; });
        if (i < text.length) p.append(document.createTextNode(text.slice(i)));
      }
      function fitSign(s) {
        const p = s.words;
        p.classList.remove('is-clamp'); p.style.webkitLineClamp = '';
        let fs = L.phone ? 17 : 19;
        p.style.fontSize = fs + 'px';
        if (!s.el.offsetWidth) return;
        while (s.board.scrollHeight > s.maxH && fs > 15) { fs--; p.style.fontSize = fs + 'px'; }
        if (s.board.scrollHeight > s.maxH) {
          const lh = fs * 1.27, extra = s.board.scrollHeight - p.offsetHeight;
          const lines = Math.max(2, Math.floor((s.maxH - extra) / lh));
          p.classList.add('is-clamp'); p.style.webkitLineClamp = String(lines);
        }
      }
      function setSign(s, li, mode, animate, override) {
        const id = LENS[li].id;
        s.lens = li; s.mode = mode;
        s.el.classList.remove('is-fear', 'is-fact', 'is-friend', 'is-future');
        s.el.classList.add('is-' + (override ? 'fear' : id));
        s.el.classList.toggle('is-blur', mode === 'blank');
        if (mode === 'blank') { s.scrib.hidden = false; s.head.hidden = true; s.tags.hidden = true; s.words.hidden = true; s.scr = null; return; }
        const c = override || TXT[li][s.side];
        s.scrib.hidden = true;
        s.head.hidden = !c.head; s.head.textContent = c.head || '';
        s.tags.hidden = !c.tags; s.tags.textContent = '';
        if (c.tags) c.tags.forEach(t => s.tags.append(h('span', { class: 'mg-tag', text: t })));
        s.words.hidden = !c.words;
        if (c.words) {
          fillWords(s.words, c.words, c.marks);
          fitSign(s);
          if (animate && !K.reduced()) s.scr = { text: c.words, marks: c.marks, t0: performance.now(), dur: Math.min(900, 260 + c.words.length * 9) };
        }
      }
      function scrambleStep(s, now) {
        const sc = s.scr, k = Math.min(1, (now - sc.t0) / sc.dur);
        if (k >= 1) { s.scr = null; fillWords(s.words, sc.text, sc.marks); return; }
        const n = Math.floor(sc.text.length * k);
        let out = sc.text.slice(0, n);
        for (let i = n; i < sc.text.length; i++) { const ch = sc.text[i]; out += /\s/.test(ch) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]; }
        s.words.textContent = out;
      }

      /* ---------------- looks of the street ---------------- */
      const FACT = { sky: ['#73b6e8', '#d8eefb'], sun: { x: 0.9, y: 0.15, r: 0.045, c: '#fffef0', glow: 'rgba(255,252,222,0.75)' }, cloud: 'rgba(255,255,255,0.95)', clouds: 3,
        far: '#a6bdd2', bld: ['#ede5d5', '#cdd8e4', '#e2d1b9', '#c2cfdc'], roof: '#8b6b55', win: '#6d89a3', winLit: '#ffe39a', lit: 0.07, ground: '#a1cb86', road: '#bab6ac', line: '#f7f4ea',
        walk: '#ddd6c7', tree: '#5b9d56', treeHi: 'rgba(255,255,240,0.18)', trunk: '#79553a', post: '#7a5636', lampOn: null, screen: '#e8f2fb', outline: 'rgba(25,35,55,0.42)' };
      const LOOK = {
        fear: { sky: ['#140305', '#4a1016'], sun: null, cloud: 'rgba(54,10,14,0.94)', clouds: 7, far: '#2b0a0e', bld: ['#41131a', '#341015', '#4c171f', '#391118'], roof: '#22070a',
          win: '#170406', winLit: '#ff5544', lit: 0.09, ground: '#230809', road: '#160405', line: '#4b1414', walk: '#30100f', tree: '#290b0d', treeHi: 'rgba(255,80,60,0.08)', trunk: '#150405',
          post: '#2a0d07', lampOn: '#ff5a44', screen: '#ff3b2f', tilt: -0.042 },
        fact: FACT,
        friend: Object.assign({}, FACT, { sky: ['#ff965f', '#ffdfa0'], sun: { x: 0.86, y: 0.5, r: 0.08, c: '#fff4d2', glow: 'rgba(255,190,105,0.9)' }, cloud: 'rgba(255,220,182,0.92)',
          far: '#e19e7b', bld: ['#f3c697', '#eab084', '#f7d5aa', '#e9bd90'], roof: '#b46e48', win: '#c4875a', winLit: '#ffe08f', lit: 0.62, ground: '#d6b46a', road: '#c79f78', line: '#fff1d4',
          walk: '#edd2a5', tree: '#b39d4c', treeHi: 'rgba(255,240,190,0.25)', trunk: '#865632', post: '#865632', lampOn: '#ffd27a', screen: '#fff0cf', outline: null }),
        future: Object.assign({}, FACT, { outline: 'rgba(60,40,20,0.35)' }),
        day: Object.assign({}, FACT, { sky: ['#8fd0ff', '#f4fbff'], sun: { x: 0.84, y: 0.2, r: 0.065, c: '#ffffff', glow: 'rgba(255,250,225,0.95)' }, lit: 0, clouds: 2, outline: null, bow: true })
      };
      function lookFor(id) {
        let lk = LOOK[id] || FACT;
        if (id === 'fear') return lk;
        if (WEATHER === 'rain' && id !== 'day') lk = Object.assign({}, lk, id === 'friend' ? { sky: ['#c98a6a', '#f0c79a'], sun: null, clouds: 6 } : { sky: ['#7d8da3', '#c3ccd6'], sun: null, clouds: 7, cloud: 'rgba(222,228,236,0.96)' });
        if (WEATHER === 'snow') lk = Object.assign({}, lk, { ground: '#eef2f8', walk: '#dfe5ee', snowCap: true, tree: id === 'friend' ? '#e6d4b0' : '#d6e2ea', treeHi: 'rgba(255,255,255,0.7)' });
        if (WEATHER === 'blossom') lk = Object.assign({}, lk, { tree: id === 'future' ? '#c9a39a' : '#f3a6c3', treeHi: 'rgba(255,240,248,0.55)' });
        if (WEATHER === 'leaves') lk = Object.assign({}, lk, { tree: '#e08a3c', treeHi: 'rgba(255,220,150,0.35)' });
        if (id === 'day' && WEATHER === 'rain') lk = Object.assign({}, lk, { bowStrong: true });
        return lk;
      }

      /* ---------------- street scene (baked once per layout, per look) ---------------- */
      const fract = (x) => x - Math.floor(x);
      const hash = (a, b, c) => fract(Math.sin(a * 1000 + b * 12.9898 + c * 78.233) * 43758.5453);
      function makeScene(w, H, posts) {
        const r = K.rng('mood-glasses-street'), k = K.clamp(H / 220, 1, 1.6);
        const sc = { w, H, hz: H * 0.6, k, far: [], bld: [], clouds: [], posts: posts ? [posts.a, posts.b] : [], fx: posts ? posts.fx : w * 0.3, lamp: { x: 0.9 * w } };
        for (let x = -PAD - 10; x < w + PAD + 10;) { const bw = 12 + r() * 24; sc.far.push({ x, w: bw, h: H * (0.05 + r() * 0.13) }); x += bw + 1 + r() * 3; }
        [[-0.02, 0.1], [0.08, 0.085], [0.58, 0.11], [0.7, 0.1], [0.83, 0.12], [0.96, 0.09]].forEach(([fx, fw], i) => sc.bld.push({ x: fx * w, w: fw * w, h: H * (0.17 + r() * 0.17), c: i % 4, roof: r() < 0.4 ? 'pitch' : 'flat', seed: r() * 10 }));
        sc.trees = [{ x: 0.175 * w, s: 0.9 }, { x: 0.64 * w, s: 0.8 }, { x: 0.99 * w, s: 1.05 }];
        for (let i = 0; i < 8; i++) sc.clouds.push({ x: r(), y: 0.06 + r() * 0.24, s: 0.6 + r() * 0.6 });
        return sc;
      }
      const R0 = K.rng('mood-glasses-fx');
      const RAIN = Array.from({ length: 64 }, () => ({ x: R0(), y: R0(), l: 7 + R0() * 9, v: 0.8 + R0() * 0.5 }));
      const FLAKES = Array.from({ length: 46 }, () => ({ x: R0(), y: R0(), v: 0.5 + R0() * 0.6, s: 1.2 + R0() * 1.8, ph: R0() * 6 }));
      const PETALS = Array.from({ length: 14 }, () => ({ x: R0(), y: R0(), v: 0.6 + R0() * 0.5, ph: R0() * 6, s: 0.8 + R0() * 0.6 }));
      const BIRDS = Array.from({ length: 4 }, () => ({ x: R0(), y: 0.1 + R0() * 0.2, v: 10 + R0() * 10, ph: R0() * 6 }));
      function cloud(g, x, y, s, col) {
        g.fillStyle = col; g.beginPath();
        g.ellipse(x, y, 26 * s, 9 * s, 0, 0, TAU); g.ellipse(x + 15 * s, y - 6 * s, 15 * s, 10 * s, 0, 0, TAU); g.ellipse(x - 12 * s, y - 3 * s, 13 * s, 8 * s, 0, 0, TAU);
        g.fill();
      }
      function building(g, b, lk, hz) {
        const x = b.x, w = b.w, top = hz - b.h;
        g.fillStyle = lk.bld[b.c % lk.bld.length]; g.fillRect(x, top, w, b.h + 1);
        g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(x + w * 0.72, top, w * 0.28, b.h + 1);
        g.fillStyle = lk.roof;
        if (b.roof === 'pitch') { g.beginPath(); g.moveTo(x - 3, top + 1); g.lineTo(x + w / 2, top - w * 0.36); g.lineTo(x + w + 3, top + 1); g.closePath(); g.fill(); }
        else g.fillRect(x - 2, top - 3, w + 4, 4);
        if (lk.snowCap) { g.fillStyle = '#ffffff'; if (b.roof === 'pitch') { g.beginPath(); g.moveTo(x + w * 0.18, top - w * 0.24); g.lineTo(x + w / 2, top - w * 0.36); g.lineTo(x + w * 0.82, top - w * 0.24); g.closePath(); g.fill(); } else g.fillRect(x - 2, top - 5, w + 4, 3); }
        const cols = Math.max(2, Math.round(w / 13)), rows = Math.max(2, Math.round(b.h / 15)), cw = w / cols, rh = b.h / rows;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows - 1; j++) { g.fillStyle = hash(b.seed, i, j) < lk.lit ? lk.winLit : lk.win; g.fillRect(x + (i + 0.25) * cw, top + (j + 0.35) * rh, cw * 0.5, rh * 0.42); }
        if (lk.outline) { g.strokeStyle = lk.outline; g.lineWidth = 1; g.strokeRect(x + 0.5, top + 0.5, w - 1, b.h); }
      }
      function tree(g, tr, lk, hz, k) {
        const s = tr.s * k, x = tr.x, base = hz + 4;
        g.fillStyle = lk.trunk; g.fillRect(x - 2.5 * s, base - 22 * s, 5 * s, 22 * s);
        g.fillStyle = lk.tree; g.beginPath(); g.arc(x, base - 30 * s, 13 * s, 0, TAU); g.arc(x - 9 * s, base - 22 * s, 10 * s, 0, TAU); g.arc(x + 9 * s, base - 23 * s, 10 * s, 0, TAU); g.fill();
        g.fillStyle = lk.treeHi; g.beginPath(); g.arc(x - 4 * s, base - 35 * s, 6 * s, 0, TAU); g.fill();
      }
      function focal(g, sc, lk, id) {
        const w = sc.w, H = sc.H, hz = sc.hz, fx = sc.fx, k = sc.k, fear = id === 'fear';
        if (DOMAIN === 'office') {
          const fw = Math.min(w * 0.13, 56 * k), fh = H * 0.5, x = fx - fw / 2, top = hz - fh;
          g.fillStyle = lk.bld[1]; g.fillRect(x, top, fw, fh + 1);
          g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(x + fw * 0.7, top, fw * 0.3, fh + 1);
          for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) { g.fillStyle = hash(7, i, j) < lk.lit ? lk.winLit : lk.win; g.fillRect(x + fw * (0.1 + i * 0.22), top + fh * (0.16 + j * 0.095), fw * 0.13, fh * 0.05); }
          const cw = fw * 0.56, ch = fw * 0.42; g.fillStyle = lk.roof; g.fillRect(fx - cw / 2, top - ch, cw, ch);
          g.fillStyle = fear ? '#ffcdc4' : '#fdfaf0'; g.beginPath(); g.arc(fx, top - ch / 2, ch * 0.36, 0, TAU); g.fill();
          g.strokeStyle = '#2a2a2a'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(fx, top - ch / 2); g.lineTo(fx - ch * 0.2, top - ch * 0.62); g.moveTo(fx, top - ch / 2); g.lineTo(fx + ch * 0.24, top - ch * 0.62); g.stroke();
          g.strokeStyle = lk.roof; g.lineWidth = 1.5; g.beginPath(); g.moveTo(fx, top - ch); g.lineTo(fx, top - ch - 12 * k); g.stroke();
          g.fillStyle = fear ? '#ff4433' : '#ffffff'; g.beginPath(); g.arc(fx, top - ch - 12 * k, 2 * k, 0, TAU); g.fill();
          if (lk.outline) { g.strokeStyle = lk.outline; g.lineWidth = 1; g.strokeRect(x + 0.5, top + 0.5, fw - 1, fh); }
        } else if (DOMAIN === 'phone') {
          const fw = Math.min(w * 0.11, 40 * k), fh = H * 0.36, x = fx - fw / 2, top = hz - fh + 4;
          g.fillStyle = '#20232b'; rr(g, x, top, fw, fh, fw * 0.18); g.fill();
          g.fillStyle = lk.screen; rr(g, x + fw * 0.09, top + fh * 0.07, fw * 0.82, fh * 0.84, fw * 0.08); g.fill();
          g.fillStyle = fear ? '#7a0c08' : '#c9d3df'; rr(g, x + fw * 0.16, top + fh * 0.16, fw * 0.5, fh * 0.12, 4); g.fill();
          g.fillStyle = fear ? '#ff6d5e' : (id === 'friend' ? '#ffb46b' : '#5aa8ff'); rr(g, x + fw * 0.34, top + fh * 0.34, fw * 0.5, fh * 0.14, 4); g.fill();
          g.strokeStyle = fear ? '#ffd0c8' : '#3c78c8'; g.lineWidth = 1.2; g.beginPath();
          const tx = x + fw * 0.6, ty = top + fh * 0.56; g.moveTo(tx, ty); g.lineTo(tx + 3, ty + 3); g.lineTo(tx + 8, ty - 3); g.moveTo(tx + 5, ty + 3); g.lineTo(tx + 11, ty - 3); g.stroke();
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(fx, hz + 5, fw * 0.8, 3, 0, 0, TAU); g.fill();
        } else if (DOMAIN === 'stage') {
          const fw = Math.min(w * 0.19, 70 * k), fh = H * 0.24, x = fx - fw / 2, top = hz - fh;
          g.fillStyle = lk.bld[2]; g.fillRect(x, top, fw, fh + 1);
          g.fillStyle = lk.roof; g.beginPath(); g.moveTo(x - 4, top); g.lineTo(fx, top - fh * 0.42); g.lineTo(x + fw + 4, top); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 4; i++) g.fillRect(x + fw * (0.1 + i * 0.25), top + 4, fw * 0.07, fh - 4);
          g.fillStyle = fear ? '#ff5544' : lk.winLit; g.fillRect(x + fw * 0.2, top + fh * 0.12, fw * 0.6, fh * 0.16);
          if (!fear) { g.fillStyle = 'rgba(255,248,220,0.18)'; g.beginPath(); g.moveTo(fx - 4, top + fh * 0.3); g.lineTo(fx - fw * 0.5, hz + H * 0.2); g.lineTo(fx + fw * 0.5, hz + H * 0.2); g.closePath(); g.fill(); }
        } else {
          const fw = Math.min(w * 0.17, 60 * k), fh = H * 0.21, x = fx - fw / 2, top = hz - fh;
          g.fillStyle = lk.roof; g.fillRect(x + fw * 0.68, top - fh * 0.42, fw * 0.12, fh * 0.3);
          g.fillStyle = lk.bld[2]; g.fillRect(x, top, fw, fh + 1);
          g.fillStyle = lk.roof; g.beginPath(); g.moveTo(x - 5, top + 1); g.lineTo(fx, top - fh * 0.5); g.lineTo(x + fw + 5, top + 1); g.closePath(); g.fill();
          if (lk.snowCap) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x + fw * 0.15, top - fh * 0.32); g.lineTo(fx, top - fh * 0.5); g.lineTo(x + fw * 0.85, top - fh * 0.32); g.closePath(); g.fill(); }
          const lit = lk.lit > 0.3 || fear;
          g.fillStyle = lit ? lk.winLit : lk.win; g.fillRect(x + fw * 0.12, top + fh * 0.22, fw * 0.24, fh * 0.26); g.fillRect(x + fw * 0.64, top + fh * 0.22, fw * 0.24, fh * 0.26);
          g.fillStyle = lk.trunk; g.fillRect(fx - fw * 0.08, top + fh * 0.5, fw * 0.16, fh * 0.5);
          g.fillStyle = fear ? 'rgba(30,8,10,0.7)' : 'rgba(255,255,255,0.55)';
          for (let i = 0; i < 3; i++) { const q = i / 3; g.globalAlpha = 1 - q; g.beginPath(); g.arc(x + fw * 0.74 + q * 10, top - fh * 0.45 - q * 22 * k, (3 + q * 6) * k, 0, TAU); g.fill(); }
          g.globalAlpha = 1;
          if (lk.outline) { g.strokeStyle = lk.outline; g.lineWidth = 1; g.strokeRect(x + 0.5, top + 0.5, fw - 1, fh); }
        }
      }
      function bakeLook(sc, id, cnv) {
        cnv = cnv || document.createElement('canvas');
        cnv.width = Math.max(2, Math.round((sc.w + PAD * 2) * dprS)); cnv.height = Math.max(2, Math.round(sc.H * dprS));
        const g = cnv.getContext('2d');
        drawScene(g, sc, id);
        return cnv;
      }
      function drawScene(g, sc, id) {
        const lk = lookFor(id), w = sc.w, H = sc.H, hz = sc.hz, k = sc.k, X0 = -PAD - 30, XW = w + PAD * 2 + 60;
        g.setTransform(dprS, 0, 0, dprS, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.clearRect(0, 0, w + PAD * 2, H);
        g.translate(PAD, 0);
        g.save();
        if (lk.tilt) { g.translate(w / 2, H * 0.62); g.rotate(lk.tilt); g.scale(1.12, 1.12); g.translate(-w / 2, -H * 0.62); }
        const sky = g.createLinearGradient(0, 0, 0, hz); sky.addColorStop(0, lk.sky[0]); sky.addColorStop(1, lk.sky[1]);
        g.fillStyle = sky; g.fillRect(X0, -30, XW, hz + 32);
        if (lk.sun) {
          const sx = lk.sun.x * w, sy = lk.sun.y * H, sr = lk.sun.r * w;
          const gl = g.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 4.5); gl.addColorStop(0, lk.sun.glow); gl.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gl; g.fillRect(sx - sr * 4.5, sy - sr * 4.5, sr * 9, sr * 9);
          g.fillStyle = lk.sun.c; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
        }
        if (lk.bow) {
          const bx = w * 0.42, by = hz + H * 0.08, br = Math.min(w * 0.5, H * 0.75);
          g.save(); g.globalAlpha = lk.bowStrong ? 0.62 : 0.4; g.lineWidth = Math.max(3, br * 0.035);
          SPECTRUM.forEach((c, i) => { g.strokeStyle = c; g.beginPath(); g.arc(bx, by, br - i * g.lineWidth, Math.PI * 1.04, Math.PI * 1.96); g.stroke(); });
          g.restore();
        }
        for (let i = 0; i < lk.clouds; i++) { const c = sc.clouds[i]; cloud(g, c.x * (w + PAD * 2) - PAD, c.y * H, c.s * k, lk.cloud); }
        g.fillStyle = lk.far; sc.far.forEach(b => g.fillRect(b.x, hz - b.h * k * 0.8, b.w, b.h * k * 0.8 + 2));
        sc.bld.forEach(b => building(g, b, lk, hz));
        focal(g, sc, lk, id);
        g.fillStyle = lk.ground; g.fillRect(X0, hz, XW, H - hz + 40);
        g.fillStyle = lk.road; g.fillRect(X0, hz + H * 0.05, XW, H * 0.1);
        g.fillStyle = lk.line; for (let x = -PAD; x < w + PAD; x += 26) g.fillRect(x, hz + H * 0.095, 14, 2.5);
        g.fillStyle = lk.walk; g.fillRect(X0, hz + H * 0.15, XW, H * 0.05);
        sc.trees.forEach(tr => tree(g, tr, lk, hz, k));
        const lx = sc.lamp.x, ly = hz + H * 0.17, lt = ly - H * 0.42;
        g.fillStyle = '#2b2b30'; g.fillRect(lx - 1.5 * k, lt, 3 * k, ly - lt); g.fillRect(lx - 7 * k, lt - 3, 14 * k, 4);
        if (lk.lampOn) { const gl = g.createRadialGradient(lx, lt + 2, 1, lx, lt + 2, 26 * k); gl.addColorStop(0, lk.lampOn); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(lx - 26 * k, lt - 24 * k, 52 * k, 52 * k); }
        if (lk.tilt) { g.fillStyle = '#0c0204'; g.beginPath(); g.ellipse(lx + 3, lt - 7 * k, 4 * k, 3 * k, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(lx + 6 * k, lt - 8 * k); g.lineTo(lx + 10 * k, lt - 9 * k); g.lineTo(lx + 6 * k, lt - 6 * k); g.fill(); }
        g.restore();
        const X1 = -PAD, W1 = w + PAD * 2;
        if (id === 'fear') {
          g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(255,120,104,0.6)'; g.fillRect(X1, 0, W1, H);
          g.globalCompositeOperation = 'source-over'; vignette(g, X1, W1, H, 'rgba(36,0,2,0.85)');
        } else if (id === 'friend') {
          g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,160,60,0.55)'; g.fillRect(X1, 0, W1, H);
          g.globalCompositeOperation = 'source-over'; vignette(g, X1, W1, H, 'rgba(120,50,10,0.32)');
        } else if (id === 'future') {
          g.globalCompositeOperation = 'color'; g.fillStyle = '#8f6c44'; g.fillRect(X1, 0, W1, H);
          g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(255,232,196,0.7)'; g.fillRect(X1, 0, W1, H);
          g.globalCompositeOperation = 'source-over'; vignette(g, X1, W1, H, 'rgba(56,34,12,0.7)');
        } else if (id === 'day') {
          g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,246,220,0.14)'; g.fillRect(X1, 0, W1, H);
          g.globalCompositeOperation = 'source-over';
        } else if (id === 'fact' && WEATHER === 'rain') vignette(g, X1, W1, H, 'rgba(40,52,70,0.25)');
        g.globalCompositeOperation = 'source-over';
      }
      function vignette(g, x, w, H, col) {
        const cx = x + w / 2, cy = H * 0.5, r = Math.max(w, H) * 0.62;
        const v = g.createRadialGradient(cx, cy, r * 0.42, cx, cy, r); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, col);
        g.fillStyle = v; g.fillRect(x, 0, w, H);
      }
      function rr(g, x, y, w, hh, r) {
        const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
        g.beginPath(); g.moveTo(x + tl, y); g.arcTo(x + w, y, x + w, y + hh, tr); g.arcTo(x + w, y + hh, x, y + hh, br); g.arcTo(x, y + hh, x, y, bl); g.arcTo(x, y, x + w, y, tl); g.closePath();
      }
      /* live weather and life on the street, drawn over the baked look (cheap strokes only) */
      function overlays(g, id, t, a) {
        if (a <= 0.03) return;
        const w = L.gw, H = L.lh, W1 = w + PAD * 2, ox = L.gx + G.rub, oy = L.gy, k = SCL.k;
        g.save(); g.globalAlpha = Math.min(1, a); g.translate(ox, oy);
        if (id === 'fear' || (WEATHER === 'rain' && id !== 'day')) {
          g.strokeStyle = id === 'fear' ? 'rgba(255,170,160,0.34)' : id === 'future' ? 'rgba(80,60,40,0.3)' : 'rgba(235,242,252,0.5)'; g.lineWidth = 1; g.beginPath();
          const n = id === 'fear' ? RAIN.length : 44;
          for (let i = 0; i < n; i++) { const d = RAIN[i]; const x = ((d.x * W1 + t * 50 * d.v) % W1) - PAD, y = ((d.y * (H + 30) + t * 300 * d.v) % (H + 30)) - 15; g.moveTo(x, y); g.lineTo(x - 3.5, y + d.l); }
          g.stroke();
        }
        if (id === 'fear' && G.flash > 0.25) {
          g.strokeStyle = 'rgba(255,225,215,' + Math.min(1, G.flash) + ')'; g.lineWidth = 2; g.beginPath();
          let bx = G.boltX * w, by = -5; g.moveTo(bx, by);
          for (let i = 0; i < 6; i++) { bx += (hash(G.boltX, i, 3) - 0.5) * 22; by += SCL.hz / 6; g.lineTo(bx, by); }
          g.stroke();
        }
        if (id === 'fear' && G.flash > 0) { g.fillStyle = 'rgba(255,200,190,' + (G.flash * 0.35) + ')'; g.fillRect(-PAD, 0, W1, H); }
        if (id !== 'fear' && WEATHER === 'snow') {
          g.fillStyle = id === 'future' ? 'rgba(255,246,228,0.85)' : 'rgba(255,255,255,0.92)';
          FLAKES.forEach(f => { const x = ((f.x * W1 + Math.sin(t * 0.8 + f.ph) * 8 + t * 6) % W1) - PAD, y = ((f.y * (H + 10) + t * 26 * f.v) % (H + 10)) - 5; g.fillRect(x, y, f.s, f.s); });
        }
        if (id !== 'fear' && (WEATHER === 'blossom' || WEATHER === 'leaves')) {
          const cols = WEATHER === 'blossom' ? ['#ffc4d8', '#ffe3ee', '#f59ab9'] : ['#e8913f', '#d4632c', '#f2c25a'];
          PETALS.forEach((p, i) => { const x = ((p.x * W1 + t * 14 * p.v + Math.sin(t + p.ph) * 10) % W1) - PAD, y = ((p.y * (H + 20) + t * 20 * p.v) % (H + 20)) - 10;
            g.fillStyle = cols[i % 3]; g.save(); g.translate(x, y); g.rotate(t * 1.5 + p.ph); g.beginPath(); g.ellipse(0, 0, 3.6 * p.s * k, 1.8 * p.s * k, 0, 0, TAU); g.fill(); g.restore(); });
        }
        if (id === 'friend' || id === 'day') {
          g.strokeStyle = id === 'day' ? 'rgba(60,70,90,0.6)' : 'rgba(110,60,30,0.75)'; g.lineWidth = 1.4; g.beginPath();
          BIRDS.forEach(b => { const x = ((b.x * W1 + t * b.v) % W1) - PAD, y = b.y * H + Math.sin(t * 1.5 + b.ph) * 4, f = Math.sin(t * 9 + b.ph) * 3 * k; g.moveTo(x - 5 * k, y - f); g.quadraticCurveTo(x - 2, y - 1, x, y); g.quadraticCurveTo(x + 2, y - 1, x + 5 * k, y - f); });
          g.stroke();
          g.fillStyle = 'rgba(255,244,210,0.75)';
          for (let i = 0; i < 14; i++) { const x = fract(i * 0.137 + t * 0.008) * (w + PAD) - PAD / 2, y = SCL.hz - fract(i * 0.271 + t * 0.03) * SCL.hz * 0.9; g.globalAlpha = a * (0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + i))); g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); }
          g.globalAlpha = Math.min(1, a);
        }
        if (id === 'future') {
          for (let i = 0; i < 36; i++) { g.fillStyle = (i & 1) ? 'rgba(40,24,8,0.22)' : 'rgba(255,245,220,0.22)'; g.fillRect(-PAD + Math.random() * W1, Math.random() * H, 1.2, 1.2); }
          if (!K.reduced() && Math.sin(t * 2.3) > 0.7) { g.fillStyle = 'rgba(60,40,15,0.25)'; g.fillRect(-PAD + fract(t * 0.37) * W1, 0, 1, H); }
        }
        g.restore();
      }
      function lensShape(g, ln, mirror, e) {
        const w = ln.w + e * 2, hh = ln.h + e * 2, x = ln.x - e, y = ln.y - e, k = Math.min(ln.w, ln.h);
        let r = [k * 0.16 + e, k * 0.2 + e, k * 0.3 + e, k * 0.24 + e];
        if (mirror) r = [r[1], r[0], r[3], r[2]];
        g.moveTo(x + r[0], y); g.arcTo(x + w, y, x + w, y + hh, r[1]); g.arcTo(x + w, y + hh, x, y + hh, r[2]); g.arcTo(x, y + hh, x, y, r[3]); g.arcTo(x, y, x + w, y, r[0]); g.closePath();
      }
      /* cheap axis-aligned clip; the cached frame image carries wall pixels over the rounded corners */
      function lensClip(g) {
        g.beginPath();
        if (G.fin) { lensShape(g, L.lensL, false, 0); lensShape(g, L.lensR, true, 0); }
        else { g.rect(L.lensL.x, L.lensL.y, L.lensL.w, L.lensL.h); g.rect(L.lensR.x, L.lensR.y, L.lensR.w, L.lensR.h); }
        g.clip();
      }
      /* one look of the street; defocus is a cheap downscale (no canvas filters, so phones stay smooth) */
      function pass(g, id, blur, x0, x1, t) {
        if (x1 - x0 < 0.5) return;
        const src = LOOKC[id]; if (!src) return;
        g.save(); lensClip(g);
        g.beginPath(); g.rect(L.gx + x0, L.gy - 2, x1 - x0, L.lh + 4); g.clip();
        const dx = L.gx - PAD + G.rub, dw = L.gw + PAD * 2;
        if (blur < 0.02) g.drawImage(src, dx, L.gy, dw, L.lh);
        else {
          const f = 1 + blur * 15, w3 = Math.max(6, Math.round(src.width / f)), h3 = Math.max(4, Math.round(src.height / f));
          g3.clearRect(0, 0, Math.min(S3.width, w3 + 2), Math.min(S3.height, h3 + 2));
          g3.drawImage(src, 0, 0, w3, h3);
          const gh = blur * (L.phone ? 6 : 9);
          g.drawImage(S3, 0, 0, w3, h3, dx - gh * 0.4, L.gy, dw, L.lh);
          if (gh > 0.8) { g.globalAlpha = 0.42; g.drawImage(S3, 0, 0, w3, h3, dx + gh, L.gy - gh * 0.25, dw, L.lh); g.globalAlpha = 1; }
        }
        overlays(g, id, t, 1 - blur * 3);
        g.restore();
      }
      function glassFx(g, t, tint) {
        g.save(); lensClip(g);
        if (tint) { g.fillStyle = tint; g.fillRect(L.gx - 4, L.gy - 4, L.gw + 8, L.lh + 8); }
        if (G.fog > 0.005) {
          g.globalAlpha = Math.min(1, G.fog); g.drawImage(FOGC, L.gx, L.gy, L.gw, L.lh); g.globalAlpha = 1;
          if (G.wipeA > 0.02 && G.wipeX >= 0) {
            const x = L.gx + G.wipeX, sg = g.createLinearGradient(x - 40, 0, x + 40, 0);
            sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,' + (0.4 * G.wipeA) + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = sg; g.fillRect(x - 40, L.gy, 80, L.lh);
          }
        }
        [L.lensL, L.lensR].forEach((ln, i) => {
          const sh = G.rub * 0.4 + Math.sin(t * 0.35 + i) * 4;
          const gr = g.createLinearGradient(ln.x + sh, ln.y, ln.x + ln.w * 0.6 + sh, ln.y + ln.h);
          gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.32, 'rgba(255,255,255,0.13)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.03)'); gr.addColorStop(0.47, 'rgba(255,255,255,0.09)'); gr.addColorStop(0.56, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.fillRect(ln.x, ln.y, ln.w, ln.h);
        });
        g.lineWidth = L.phone ? 12 : 18; g.strokeStyle = 'rgba(0,0,0,0.28)';
        g.beginPath(); lensShape(g, L.lensL, false, 0); lensShape(g, L.lensR, true, 0); g.stroke();
        g.restore();
      }

      /* ---------------- static art (rebuilt on resize / theme) ---------------- */
      function buildBg() {
        const dpr = cv.dpr || 1, W = L.W, H = L.H, dark = K.dark();
        BG.width = Math.max(2, Math.round(W * dpr)); BG.height = Math.max(2, Math.round(H * dpr));
        const g = BG.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const pc = dark ? PAPER.dark : PAPER.bright;
        const wall = g.createLinearGradient(0, 0, 0, L.counterY); wall.addColorStop(0, pc[0]); wall.addColorStop(1, pc[1]);
        g.fillStyle = wall; g.fillRect(0, 0, W, H);
        g.fillStyle = dark ? PAPER.sd : PAPER.sb;
        for (let x = 4; x < W; x += 30) g.fillRect(x, 0, 13, L.counterY);
        g.fillStyle = dark ? 'rgba(255,214,150,0.07)' : 'rgba(130,95,40,0.09)';
        for (let y = 20, row = 0; y < L.counterY; y += 34, row++) for (let x = (row % 2) * 15 + 11; x < W; x += 30) { g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 3, y); g.lineTo(x, y + 4); g.lineTo(x - 3, y); g.closePath(); g.fill(); }
        const pool = g.createRadialGradient(W / 2, L.gy + L.lh * 0.4, 10, W / 2, L.gy + L.lh * 0.4, Math.max(W, L.counterY) * 0.75);
        pool.addColorStop(0, dark ? 'rgba(255,190,110,0.16)' : 'rgba(255,236,190,0.6)'); pool.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = pool; g.fillRect(0, 0, W, L.counterY);
        g.save(); g.shadowColor = dark ? 'rgba(0,0,0,0.65)' : 'rgba(90,60,20,0.35)'; g.shadowBlur = 38; g.shadowOffsetY = 16;
        g.fillStyle = dark ? '#0a1014' : '#d9caa8'; g.beginPath(); lensShape(g, L.lensL, false, L.ft + 4); lensShape(g, L.lensR, true, L.ft + 4); g.fill(); g.restore();
        if (!L.phone) decor(g, dark);
        const cy = L.counterY;
        const top = g.createLinearGradient(0, cy, 0, cy + 30); top.addColorStop(0, dark ? '#8a5a33' : '#d6a877'); top.addColorStop(1, dark ? '#5c3a1f' : '#b9875a');
        g.fillStyle = top; g.fillRect(0, cy, W, 30);
        g.fillStyle = dark ? 'rgba(255,220,170,0.35)' : 'rgba(255,250,235,0.7)'; g.fillRect(0, cy, W, 2);
        g.strokeStyle = dark ? 'rgba(40,20,8,0.35)' : 'rgba(120,70,30,0.25)'; g.lineWidth = 1;
        for (let i = 0; i < 6; i++) { g.beginPath(); const yy = cy + 6 + i * 4; g.moveTo(0, yy); for (let x = 0; x <= W; x += 40) g.lineTo(x, yy + Math.sin(x * 0.03 + i) * 1.6); g.stroke(); }
        const front = g.createLinearGradient(0, cy + 30, 0, H); front.addColorStop(0, dark ? '#3d2513' : '#a8784c'); front.addColorStop(1, dark ? '#1d1109' : '#7e5534');
        g.fillStyle = front; g.fillRect(0, cy + 30, W, H - cy - 30);
        g.fillStyle = dark ? 'rgba(0,0,0,0.35)' : 'rgba(60,30,10,0.25)'; g.fillRect(0, cy + 30, W, 5);
        const pw = L.phone ? 110 : 150;
        for (let x = 14; x + pw < W; x += pw + 16) { g.strokeStyle = dark ? 'rgba(255,210,150,0.1)' : 'rgba(255,240,215,0.28)'; g.lineWidth = 2; g.strokeRect(x, cy + 50, pw, H - cy - 70); g.strokeStyle = 'rgba(0,0,0,0.22)'; g.strokeRect(x + 3, cy + 53, pw - 6, H - cy - 76); }
        const rail = g.createLinearGradient(0, cy + 34, 0, cy + 42); rail.addColorStop(0, '#fff0bf'); rail.addColorStop(0.5, '#d4a24a'); rail.addColorStop(1, '#7a5212');
        g.fillStyle = rail; g.fillRect(0, cy + 34, W, 7);
      }
      function decor(g, dark) {
        const ink = dark ? '#1b1f24' : '#2a2a2a';
        const ew = Math.min(150, L.gx - 70), ecx = Math.max(30, (L.gx - ew) / 2 - 6), ecy = L.gy + L.lh * 0.36, eh = ew * 1.45;
        if (ew > 90) {
          g.save(); g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 14; g.shadowOffsetY = 6; g.fillStyle = '#fbf8ef'; g.fillRect(ecx, ecy, ew, eh); g.restore();
          g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
          [['E', 44], ['F P', 30], ['T O Z', 22], ['L P E D', 17], ['P E C F D', 14], ['E D F C Z P', 12]].forEach(([s, fs], i) => { g.font = '700 ' + fs + 'px "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif'; g.fillText(s, ecx + ew / 2, ecy + 30 + i * (eh - 46) / 5.3); });
          g.fillStyle = '#c2392b'; g.fillRect(ecx + 10, ecy + eh - 14, ew - 20, 2);
        }
        const sx = L.gx + L.gw + 46, sw = L.W - sx - 36;
        if (sw > 100) {
          const mr = Math.min(56, sw * 0.32), mx = sx + sw / 2, my = L.gy + L.lh * 0.36 + mr;
          g.fillStyle = '#c99a44'; g.beginPath(); g.arc(mx, my, mr + 6, 0, TAU); g.fill();
          const mg = g.createLinearGradient(mx - mr, my - mr, mx + mr, my + mr); mg.addColorStop(0, dark ? '#9fb7c4' : '#e8f2f6'); mg.addColorStop(0.5, dark ? '#5f7886' : '#bfd2db'); mg.addColorStop(1, dark ? '#334650' : '#93aab6');
          g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; g.beginPath(); g.arc(mx, my, mr * 0.7, -2.4, -1.7); g.stroke();
          for (let s = 0; s < 2; s++) {
            const y = my + mr + 46 + s * 62;
            g.fillStyle = dark ? '#6b4426' : '#b98a5a'; g.fillRect(sx, y, sw, 8); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(sx, y + 8, sw, 4);
            for (let k = 0; k < 3; k++) mini(g, sx + sw * (0.2 + k * 0.3), y - 9, Math.min(17, sw * 0.08), ['#2a1a10', '#8a2b2b', '#1c3b5a', '#5a3b12', '#2f5a3b', '#6a5a7a'][(s * 3 + k) % 6]);
          }
        }
        [[L.gx + L.gw * 0.1, L.gy - 34], [L.gx + L.gw * 0.9, L.gy - 34]].forEach(([lx, ly]) => {
          g.strokeStyle = dark ? '#2a2a2a' : '#5a4a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, ly - 16); g.stroke();
          const cone = g.createLinearGradient(0, ly, 0, ly + 230); cone.addColorStop(0, dark ? 'rgba(255,205,130,0.22)' : 'rgba(255,225,160,0.35)'); cone.addColorStop(1, 'rgba(255,205,130,0)');
          g.fillStyle = cone; g.beginPath(); g.moveTo(lx - 16, ly); g.lineTo(lx - 110, ly + 230); g.lineTo(lx + 110, ly + 230); g.lineTo(lx + 16, ly); g.closePath(); g.fill();
          const sh = g.createLinearGradient(lx - 24, 0, lx + 24, 0); sh.addColorStop(0, '#7a5212'); sh.addColorStop(0.45, '#f5d68a'); sh.addColorStop(1, '#6a440e');
          g.fillStyle = sh; g.beginPath(); g.moveTo(lx - 8, ly - 18); g.lineTo(lx + 8, ly - 18); g.lineTo(lx + 24, ly); g.lineTo(lx - 24, ly); g.closePath(); g.fill();
          const bulb = g.createRadialGradient(lx, ly + 2, 1, lx, ly + 2, 26); bulb.addColorStop(0, 'rgba(255,240,200,0.95)'); bulb.addColorStop(1, 'rgba(255,200,120,0)');
          g.fillStyle = bulb; g.fillRect(lx - 26, ly - 24, 52, 52);
        });
      }
      function mini(g, x, y, s, col) {
        g.strokeStyle = col; g.lineWidth = Math.max(2, s * 0.18);
        g.beginPath(); g.ellipse(x - s * 0.62, y, s * 0.55, s * 0.42, 0, 0, TAU); g.stroke();
        g.beginPath(); g.ellipse(x + s * 0.62, y, s * 0.55, s * 0.42, 0, 0, TAU); g.stroke();
        g.beginPath(); g.moveTo(x - s * 0.1, y - s * 0.12); g.quadraticCurveTo(x, y - s * 0.3, x + s * 0.1, y - s * 0.12); g.stroke();
      }
      /* FRP: the frame alone. FR: the frame over wall pixels that cover the rounded lens corners, so play can use a cheap
         rectangle clip. The finale (where light floods the wall) uses FRP with the exact rounded clip instead. */
      function buildFrame() {
        const dpr = cv.dpr || 1, ex = L.phone ? L.ft + 10 : 160, ey = 44;
        L.frEx = ex; L.frEy = ey;
        drawFrameArt(FRP, dpr, ex, ey);
        FR.width = FRP.width; FR.height = FRP.height;
        const f = FR.getContext('2d'); f.setTransform(dpr, 0, 0, dpr, 0, 0); f.translate(ex - L.gx, ey - L.gy);
        [[L.lensL, false], [L.lensR, true]].forEach(([ln, mir]) => { f.save(); f.beginPath(); f.rect(ln.x - 1, ln.y - 1, ln.w + 2, ln.h + 2); lensShape(f, ln, mir, 0.5); f.clip('evenodd'); f.drawImage(BG, 0, 0, L.W, L.H); f.restore(); });
        f.setTransform(1, 0, 0, 1, 0, 0); f.drawImage(FRP, 0, 0);
      }
      function drawFrameArt(cnv, dpr, ex, ey) {
        cnv.width = Math.max(2, Math.round((L.gw + ex * 2) * dpr)); cnv.height = Math.max(2, Math.round((L.lh + ey * 2) * dpr));
        const g = cnv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.translate(ex - L.gx, ey - L.gy);
        const ft = L.ft, gy = L.gy, gx = L.gx, gw = L.gw, lh = L.lh, C = FRAME.c;
        const tort = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, C[0]); gr.addColorStop(0.3, C[1]); gr.addColorStop(0.55, C[2]); gr.addColorStop(0.8, C[3]); gr.addColorStop(1, C[0]); return gr; };
        if (!L.phone) {
          [[-1, gx - ft], [1, gx + gw + ft]].forEach(([d, x]) => {
            g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 14; g.shadowOffsetY = 8;
            g.fillStyle = tort(x, gy, x + d * 150, gy + 60);
            g.beginPath(); g.moveTo(x, gy + lh * 0.1); g.lineTo(x + d * 142, gy + lh * 0.2); g.quadraticCurveTo(x + d * 152, gy + lh * 0.22, x + d * 146, gy + lh * 0.3); g.lineTo(x + d * 138, gy + lh * 0.27); g.lineTo(x, gy + lh * 0.18); g.closePath(); g.fill();
            g.restore();
          });
        }
        const rings = () => { g.beginPath(); lensShape(g, L.lensL, false, ft); lensShape(g, L.lensR, true, ft); lensShape(g, L.lensL, false, 0); lensShape(g, L.lensR, true, 0); };
        const bx = L.lensL.x + L.lw + 1, bw = L.bridge - 2, by = gy + lh * 0.08, bh = ft * 1.55;
        const bridge = () => { g.beginPath(); g.moveTo(bx - 2, by + bh); g.quadraticCurveTo(bx + bw / 2, by - bh * 0.55, bx + bw + 2, by + bh); g.lineTo(bx + bw + 2, by); g.quadraticCurveTo(bx + bw / 2, by - bh * 1.5, bx - 2, by); g.closePath(); };
        g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 16; g.shadowOffsetY = 9; g.fillStyle = C[0]; rings(); g.fill('evenodd'); bridge(); g.fill(); g.restore();
        g.save(); rings(); g.clip('evenodd');
        g.fillStyle = tort(gx, gy - ft, gx + gw, gy + lh + ft); g.fillRect(gx - ft - 2, gy - ft - 2, gw + ft * 2 + 4, lh + ft * 2 + 4);
        if (FRAME.spot) {
          const r = K.rng('frame-spots');
          for (let i = 0; i < (L.phone ? 120 : 220); i++) {
            const x = gx - ft + r() * (gw + ft * 2), y = gy - ft + r() * (lh + ft * 2), s = 2 + r() * (L.phone ? 6 : 9);
            g.fillStyle = r() < 0.55 ? 'rgba(' + FRAME.spot[0] + ',' + (0.16 + r() * 0.28) + ')' : 'rgba(' + FRAME.spot[1] + ',' + (0.22 + r() * 0.32) + ')';
            g.beginPath(); g.ellipse(x, y, s, s * (0.4 + r() * 0.5), r() * 3, 0, TAU); g.fill();
          }
        }
        const gloss = g.createLinearGradient(0, gy - ft, 0, gy + ft * 2); gloss.addColorStop(0, 'rgba(255,240,215,0.5)'); gloss.addColorStop(1, 'rgba(255,240,215,0)');
        g.fillStyle = gloss; g.fillRect(gx - ft - 2, gy - ft - 2, gw + ft * 2 + 4, ft * 3);
        g.restore();
        g.fillStyle = tort(bx, by - bh, bx + bw, by + bh); bridge(); g.fill();
        g.fillStyle = 'rgba(255,230,190,0.35)'; g.fillRect(bx, by - bh * 0.62, bw, 1.5);
        g.strokeStyle = 'rgba(20,8,2,0.55)'; g.lineWidth = 1.2; g.beginPath(); lensShape(g, L.lensL, false, 0); lensShape(g, L.lensR, true, 0); g.stroke();
        g.strokeStyle = 'rgba(255,220,170,0.25)'; g.lineWidth = 1; g.beginPath(); lensShape(g, L.lensL, false, ft - 0.5); lensShape(g, L.lensR, true, ft - 0.5); g.stroke();
        if (!L.phone) [[gx - ft * 0.5, -1], [gx + gw + ft * 0.5, 1]].forEach(([x, d]) => {
          const y = gy + lh * 0.12, hw = ft * 0.9, hh = ft * 2.2;
          const mg = g.createLinearGradient(x - hw, 0, x + hw, 0); mg.addColorStop(0, '#8d8f96'); mg.addColorStop(0.5, '#f4f5f8'); mg.addColorStop(1, '#6d6f76');
          g.fillStyle = mg; g.fillRect(x - hw / 2 + d * ft * 0.3, y - hh / 2, hw, hh);
          g.fillStyle = '#e8e9ee'; [-0.28, 0.28].forEach(o => { g.beginPath(); g.arc(x + d * ft * 0.3, y + o * hh, Math.max(1.4, ft * 0.16), 0, TAU); g.fill(); });
        });
      }
      function buildFog() {
        FOGC.width = Math.max(2, Math.round(L.gw * dprS * 0.5)); FOGC.height = Math.max(2, Math.round(L.lh * dprS * 0.5));
        const g = FOGC.getContext('2d'), s = dprS * 0.5; g.setTransform(s, 0, 0, s, 0, 0);
        const r = K.rng('fog');
        g.fillStyle = 'rgba(96,12,16,0.62)'; g.fillRect(0, 0, L.gw, L.lh);
        for (let i = 0; i < 30; i++) { const x = r() * L.gw, y = r() * L.lh, rad = 26 + r() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, i % 3 ? 'rgba(255,110,90,0.32)' : 'rgba(40,0,4,0.45)'); gr.addColorStop(1, 'rgba(255,110,90,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
        for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,190,180,' + (0.08 + r() * 0.12) + ')'; g.beginPath(); g.arc(r() * L.gw, r() * L.lh, 1 + r() * 2.5, 0, TAU); g.fill(); }
      }

      /* ---------------- counter props ---------------- */
      const RACKC = document.createElement('canvas');
      let rackKey = '';
      function drawRack(g, t, alpha, beat) {
        if (alpha <= 0.01) return;
        const r = L.rackR, y = L.rackY, nextI = G.locked.indexOf(false);
        const x0 = L.rackX[0] - r - 30, y0 = y - r - 14, w0 = L.rackX[3] - L.rackX[0] + r * 2 + 60, h0 = r * 2 + 40;
        const inF = !G.fin && G.stage !== 'choose' && G.stage !== 'engrave' ? (G.wipe ? G.wipe.to : G.cur) : -1;
        const key = [inF, G.locked.join(), K.dark(), L.W, L.H].join('|');
        if (key !== rackKey) { rackKey = key; bakeRack(x0, y0, w0, h0, inF); }
        g.save(); g.globalAlpha = alpha;
        if (nextI >= 0 && nextI !== inF && G.locked[G.cur] && !K.reduced()) { const cx = L.rackX[nextI], p = 0.5 + 0.5 * Math.cos(beat * TAU); const gl = g.createRadialGradient(cx, y, r * 0.6, cx, y, r * 2); gl.addColorStop(0, K.hexA(LENS[nextI].color, 0.45 * p)); gl.addColorStop(1, K.hexA(LENS[nextI].color, 0)); g.fillStyle = gl; g.fillRect(cx - r * 2, y - r * 2, r * 4, r * 4); }
        g.drawImage(RACKC, x0, y0, w0, h0);
        g.restore();
      }
      function bakeRack(x0, y0, w0, h0, inF) {
        const dpr = cv.dpr || 1;
        RACKC.width = Math.max(2, Math.round(w0 * dpr)); RACKC.height = Math.max(2, Math.round(h0 * dpr));
        const g = RACKC.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.translate(-x0, -y0);
        const r = L.rackR, y = L.rackY, dark = K.dark();
        g.save();
        const rx0 = L.rackX[0] - r - 22, rx1 = L.rackX[3] + r + 22, ry = y + r + 3;
        g.fillStyle = 'rgba(0,0,0,0.28)'; rr(g, rx0 + 2, ry + 4, rx1 - rx0, 12, 4); g.fill();
        const plank = g.createLinearGradient(0, ry, 0, ry + 12); plank.addColorStop(0, dark ? '#8a5a33' : '#c99a66'); plank.addColorStop(1, dark ? '#4a2c14' : '#8f6236');
        g.fillStyle = plank; rr(g, rx0, ry, rx1 - rx0, 12, 4); g.fill();
        g.fillStyle = 'rgba(255,230,190,0.35)'; g.fillRect(rx0 + 4, ry + 1, rx1 - rx0 - 8, 1.5);
        L.rackX.forEach(x => { const cup = g.createLinearGradient(x - 12, 0, x + 12, 0); cup.addColorStop(0, '#7a5212'); cup.addColorStop(0.5, '#f5d68a'); cup.addColorStop(1, '#6a440e'); g.fillStyle = cup; rr(g, x - 12, ry - 6, 24, 8, 3); g.fill(); });
        LENS.forEach((l, i) => {
          const cx = L.rackX[i], inFrame = i === inF;
          g.fillStyle = 'rgba(0,0,0,0.32)'; g.beginPath(); g.arc(cx + 1, y + 2, r + 3, 0, TAU); g.fill();
          if (inFrame) { g.setLineDash([4, 4]); g.strokeStyle = K.dark() ? 'rgba(255,240,210,0.6)' : 'rgba(90,60,20,0.6)'; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, y, r, 0, TAU); g.stroke(); g.setLineDash([]); }
          else {
            const lg = g.createRadialGradient(cx - r * 0.35, y - r * 0.35, 1, cx, y, r); lg.addColorStop(0, 'rgba(255,255,255,0.92)'); lg.addColorStop(0.35, K.hexA(l.color, 0.78)); lg.addColorStop(1, K.hexA(l.color, 0.98));
            g.fillStyle = lg; g.beginPath(); g.arc(cx, y, r, 0, TAU); g.fill();
            g.strokeStyle = '#d9b46a'; g.lineWidth = 2.2; g.stroke();
          }
          if (G.locked[i]) { g.strokeStyle = '#2f9e62'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + r * 0.38, y + r * 0.58); g.lineTo(cx + r * 0.62, y + r * 0.84); g.lineTo(cx + r * 1.08, y + r * 0.22); g.stroke(); g.strokeStyle = '#a9f0c6'; g.lineWidth = 1.4; g.stroke(); }
        });
        g.restore();
      }
      function smallGlasses(g, x, y, s, cols, t) {
        const lw = 34 * s, lh = 24 * s, br = 9 * s, C = FRAME.c;
        [[x - br / 2 - lw, cols[0], 0], [x + br / 2, cols[1], 1]].forEach(([lx, c, i]) => {
          const lg = g.createLinearGradient(lx, y - lh / 2, lx + lw, y + lh / 2); lg.addColorStop(0, K.hexA(c, 0.5)); lg.addColorStop(1, K.hexA(c, 0.92));
          g.fillStyle = lg; rr(g, lx, y - lh / 2, lw, lh, [lh * 0.3, lh * 0.3, lh * 0.5, lh * 0.45]); g.fill();
          g.strokeStyle = C[1]; g.lineWidth = 3.6 * s; g.stroke();
          g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.5 * s; g.beginPath(); const sh = Math.sin(t * 1.2 + i) * 3 * s; g.moveTo(lx + lw * 0.18 + sh, y - lh * 0.22); g.lineTo(lx + lw * 0.42 + sh, y - lh * 0.22); g.stroke();
        });
        g.strokeStyle = C[1]; g.lineWidth = 3.6 * s; g.beginPath(); g.moveTo(x - br / 2, y - lh * 0.25); g.quadraticCurveTo(x, y - lh * 0.55, x + br / 2, y - lh * 0.25); g.stroke();
        g.strokeStyle = C[2]; g.lineWidth = 1.2 * s; g.stroke();
      }
      function drawStand(g, t) {
        const k = G.standK; if (k <= 0.001) return;
        const x = L.stand.x, y = L.stand.y, s = L.stand.s, dark = K.dark(), e = K.ease.outBack(Math.min(1, k));
        g.save(); g.translate(x, y + 40 * s); g.scale(e, e); g.translate(-x, -(y + 40 * s));
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y + 42 * s, 74 * s, 8 * s, 0, 0, TAU); g.fill();
        const br = g.createLinearGradient(x - 50 * s, 0, x + 50 * s, 0); br.addColorStop(0, '#6a440e'); br.addColorStop(0.45, '#fbe2a0'); br.addColorStop(1, '#6a440e');
        g.fillStyle = br; rr(g, x - 50 * s, y + 30 * s, 100 * s, 12 * s, 5 * s); g.fill();
        g.fillRect(x - 6 * s, y + 8 * s, 12 * s, 24 * s);
        const vel = g.createRadialGradient(x - 20 * s, y - 2 * s, 4, x, y + 6 * s, 80 * s); vel.addColorStop(0, dark ? '#c23a55' : '#cf4562'); vel.addColorStop(0.55, '#7d1530'); vel.addColorStop(1, '#3e0818');
        g.fillStyle = vel; g.beginPath(); g.ellipse(x, y + 2 * s, 78 * s, 16 * s, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,190,210,0.2)'; g.beginPath(); g.ellipse(x - 20 * s, y - 3 * s, 32 * s, 4 * s, -0.08, 0, TAU); g.fill();
        g.restore();
        if (G.drop > 0) {
          const cols = keepColors(), d = Math.min(1, G.drop), fall = (1 - K.ease.outBack(d)) * 90;
          const gs = (L.phone ? 2.1 : 2.3), gyy = y - 16 * s - fall;
          const sp = g.createRadialGradient(x, gyy, 4, x, gyy, 130 * s); sp.addColorStop(0, 'rgba(255,248,220,' + (0.5 * d) + ')'); sp.addColorStop(1, 'rgba(255,248,220,0)');
          g.fillStyle = sp; g.fillRect(x - 140 * s, gyy - 140 * s, 280 * s, 280 * s);
          smallGlasses(g, x, gyy, gs, cols, t);
        }
      }
      const keepColors = () => { const ids = G.chosen.length ? G.chosen : ['fact']; const a = LENS.find(l => l.id === ids[0]).color, b = LENS.find(l => l.id === ids[Math.min(1, ids.length - 1)]).color; return [a, b]; };
      /* daylight floods the shop: baked once, faded in behind the glasses so the lenses stay crisp and saturated */
      const FLOOD = document.createElement('canvas'), PRISM = document.createElement('canvas');
      function bakeFinale() {
        const W = L.W, H = L.H, dpr = cv.dpr || 1, dark = K.dark();
        FLOOD.width = Math.max(2, Math.round(W * dpr)); FLOOD.height = Math.max(2, Math.round(H * dpr));
        let g = FLOOD.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = 'rgba(255,226,170,' + (dark ? 0.07 : 0.1) + ')'; g.fillRect(0, 0, W, H);
        const cx = W / 2, cy = L.gy + L.lh * 0.5, rad = Math.max(W, H) * 0.8;
        const gl = g.createRadialGradient(cx, cy, L.gw * 0.3, cx, cy, rad); gl.addColorStop(0, 'rgba(255,240,200,' + (dark ? 0.32 : 0.3) + ')'); gl.addColorStop(1, 'rgba(255,226,170,0)');
        g.fillStyle = gl; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 4; i++) {
          const x0 = L.gx + L.gw * (0.12 + i * 0.25), sh = g.createLinearGradient(0, L.below, 0, H);
          sh.addColorStop(0, 'rgba(255,244,210,' + (dark ? 0.14 : 0.18) + ')'); sh.addColorStop(1, 'rgba(255,244,210,0)');
          g.fillStyle = sh; g.beginPath(); g.moveTo(x0 - 18, L.below - 6); g.lineTo(x0 + 18, L.below - 6); g.lineTo(x0 + 120, H); g.lineTo(x0 + 30, H); g.closePath(); g.fill();
        }
        PRISM.width = FLOOD.width; PRISM.height = FLOOD.height;
        g = PRISM.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const A0 = dark ? 1 : 0.8, land = L.counterY + 16;
        [L.lensL, L.lensR].forEach((ln, li) => {
          const ox = ln.x + ln.w * 0.5, oy = L.below - 6, reach = land - oy, dir = li ? 1 : -1;
          for (let i = 0; i < 6; i++) {
            const a0 = dir * (0.04 + i * 0.052), a1 = a0 + dir * 0.05, x0 = ox + Math.tan(a0) * reach, x1 = ox + Math.tan(a1) * reach, c = SPECTRUM[li ? i : 5 - i];
            const gr = g.createLinearGradient(0, oy, 0, land); gr.addColorStop(0, K.hexA(c, 0.05 * A0)); gr.addColorStop(0.35, K.hexA(c, 0.3 * A0)); gr.addColorStop(1, K.hexA(c, 0.42 * A0));
            g.fillStyle = gr; g.beginPath(); g.moveTo(ox + dir * 6, oy); g.lineTo(x0, land); g.lineTo(x1, land); g.closePath(); g.fill();
          }
          const xa = ox + Math.tan(dir * 0.04) * reach, xb = ox + Math.tan(dir * 0.35) * reach, pl = g.createLinearGradient(Math.min(xa, xb), 0, Math.max(xa, xb), 0);
          (li ? SPECTRUM : SPECTRUM.slice().reverse()).forEach((c, k) => pl.addColorStop(k / 5, K.hexA(c, 0.55 * A0)));
          g.fillStyle = pl; g.beginPath(); g.ellipse((xa + xb) / 2, land, Math.abs(xb - xa) / 2 + 6, 7, 0, 0, TAU); g.fill();
        });
        G.baked = true;
      }
      function drawFlood(g) {
        if (G.day <= 0) return;
        if (!G.baked) bakeFinale();
        g.save(); g.globalCompositeOperation = K.dark() ? 'lighter' : 'source-over'; g.globalAlpha = G.day; g.drawImage(FLOOD, 0, 0, L.W, L.H); g.restore();
      }
      function drawPrism(g, t) {
        const W = L.W, H = L.H, p = G.prism, dark = K.dark(); if (p <= 0) return;
        if (!G.baked) bakeFinale();
        g.save(); g.globalCompositeOperation = dark ? 'lighter' : 'source-over';
        g.globalAlpha = p * (0.88 + 0.12 * Math.sin(t * 1.3)); g.drawImage(PRISM, 0, 0, W, H); g.globalAlpha = 1;
        const A0 = dark ? 1 : 0.8;
        for (let i = 0; i < 7; i++) {
          const x = fract(i * 0.213 + Math.sin(t * 0.16 + i) * 0.04) * W, y = i % 3 === 0 ? 70 + fract(i * 0.31) * (L.gy - 40) : L.counterY + 60 + fract(i * 0.377) * (H - L.counterY - 80), r = 12 + (i % 3) * 7;
          g.fillStyle = K.hexA(SPECTRUM[i % 6], 0.26 * p * A0 * (0.55 + 0.45 * Math.sin(t * 1.4 + i))); g.beginPath(); g.ellipse(x, y, r, r * 0.4, 0.3, 0, TAU); g.fill();
        }
        if (G.drop >= 1) {
          const sx = L.stand.x, sy = L.stand.y - 18 * L.stand.s;
          g.lineWidth = 3;
          for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.3 + Math.sin(t * 0.7) * 0.05, len = 60 + 26 * Math.sin(t * 1.3 + i); g.strokeStyle = K.hexA(SPECTRUM[i % 6], 0.45 * p * A0); g.beginPath(); g.moveTo(sx + Math.cos(a) * 44, sy + Math.sin(a) * 26); g.lineTo(sx + Math.cos(a) * (44 + len), sy + Math.sin(a) * (26 + len * 0.6)); g.stroke(); }
        }
        g.restore();
      }

      /* ---------------- sound ---------------- */
      const music = K.music('calm');
      music.level(0.7);
      let drone = null, engr = null;
      const ensureDrone = () => { if (!drone && A.ctx) drone = A.loop({ pink: true, filter: 'lowpass', freq: 150, q: 1.4, bus: 'amb' }); return drone; };
      S.onDestroy(() => { if (drone) drone.stop(); if (engr) engr.stop(); });
      function moodAudio(li) {
        const id = LENS[li].id;
        music.level({ fear: 0.42, fact: 0.7, friend: 0.85, future: 0.75 }[id]);
        const d = ensureDrone(); if (d) d.level(id === 'fear' ? 0.14 : 0.0001, 0.6);
      }
      function beat() { if (!A.ctx || !music.bpm) return (performance.now() / 1000 * 64 / 60) % 1; const iv = 60 / music.bpm, x = (A.now() - (music.next - iv)) / iv; return ((x % 1) + 1) % 1; }
      function shopBell() { K.sfx.chime(10); if (!A.ctx) return; const t = A.now(); A.chime(A.note('G5'), { when: t + 0.16, vol: 0.07, dur: 1.8 }); A.noise({ when: t, filter: 'highpass', freq: 6500, dur: 0.3, vol: 0.025 }); }
      function lensClick() { K.sfx.tap(); if (!A.ctx) return; A.wood(undefined, 0.2, 1.9); A.tone({ type: 'sine', freq: 2300, to: 1500, glide: 0.05, dur: 0.07, vol: 0.035 }); }
      let lastTick = 0, lastSqueak = 0, lastDir = 0;
      const TUNE = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5'];
      let lastNote = -1;
      function focusTick(sharp) {
        const now = performance.now(); if (now - lastTick < 45 || !A.ctx) return; lastTick = now;
        A.click({ vol: 0.03 + sharp * 0.025 });
        const n = Math.round(sharp * (TUNE.length - 1)); /* the view "tunes in": notes climb as it sharpens */
        if (n !== lastNote) { lastNote = n; A.pluck(A.note(TUNE[n]), { vol: 0.05 + sharp * 0.05, damp: 0.994, verb: 0.25 }); }
      }
      function squeak(dir) { const now = performance.now(); if (now - lastSqueak < 90) return; lastSqueak = now; K.sfx.paper(); if (A.ctx && dir !== lastDir) A.tone({ type: 'sine', freq: 1700 + Math.random() * 500, to: 2600, glide: 0.06, dur: 0.08, vol: 0.022 }); lastDir = dir; }

      /* ---------------- flow ---------------- */
      const sharpOf = (i) => G.locked[i] ? 1 : K.clamp(1 - Math.abs(G.pos[i] - tgtOf(i)) / 0.62, 0, 1);
      function paintHud(pop) {
        const l = LENS[G.cur];
        pill.style.setProperty('--lc', l.color); pillName.textContent = l.label; pillCount.textContent = (G.cur + 1) + '/4';
        prevB.disabled = G.cur === 0; nextB.disabled = G.cur === 3;
        knurl.style.setProperty('--kx', (G.pos[G.cur] * 420).toFixed(1) + 'px');
        if (pop) { pill.classList.remove('is-pop'); void pill.offsetWidth; pill.classList.add('is-pop'); }
      }
      function guideFocus(delay) { K.guide({ id: 'mg-focus', g: 'drag', dir: G.pos[G.cur] < tgtOf(G.cur) ? 'r' : 'l', d: Math.round(L.bw * 0.4), target: barrel, ox: G.pos[G.cur] < tgtOf(G.cur) ? 0.22 : 0.78, label: 'DRAG, THEN HOLD STILL', delay: delay ?? 700 }); }
      function guideSwipe(delay) { K.guide({ id: 'mg-swipe', g: 'drag', dir: 'l', d: L.phone ? 120 : 200, target: hit, ox: 0.74, oy: 0.36, label: 'SWIPE: NEXT LENS', delay: delay ?? 900 }); }
      function readDelay(i) { const c = TXT[i]; const n = ((c.L.words || '') + ' ' + (c.R.words || '') + ' ' + (c.R.tags || []).join(' ')).split(/\s+/).length; return K.clamp(1400 + n * 150, 2200, 5000) * [1.25, 1, 0.85][inten]; }
      function bump(dir) { G.rubV = -dir * 260; }
      function goLens(to, dir) {
        if (G.wipe || !(G.stage === 'focus' || G.stage === 'swipe')) { if (G.stage === 'fog') K.sfx.soft(); return; }
        if (to < 0 || to > 3) { bump(dir); K.sfx.soft(); return; }
        if (dir > 0 && !G.locked[G.cur]) {
          bump(dir); K.sfx.no(); say(LN.needFocus, { ms: 2200 });
          focusWrap.classList.remove('is-shake'); void focusWrap.offsetWidth; focusWrap.classList.add('is-shake'); guideFocus(250); return;
        }
        if (to > G.cur + 1 && G.locked.slice(G.cur + 1, to).some(x => !x)) { bump(dir); K.sfx.no(); say(LN.rackSkip, { ms: 2200 }); return; }
        G.wipe = { from: G.cur, to, dir, p: 0, done: { L: false, R: false } };
        G.stage = 'wipe'; K.guide(null); K.sfx.whoosh();
        ctx.track('lens_swap', { to });
      }
      function arrive(i) {
        G.cur = i; G.wipe = null; G.dwell = 0;
        lensClick(); paintHud(true); moodAudio(i);
        P.emit('spark', L.rackX[i], L.rackY, 6, { colors: ['#ffffff', LENS[i].color], speed: [40, 120] });
        sync.base(['worried', 'cool', 'happy', 'calm'][i]);
        if (!G.locked[i]) {
          G.stage = 'focus'; focusWrap.hidden = false; guideFocus(900);
          if (LN.intro[i]) say(LN.intro[i], { ms: 3600 });
        } else { G.stage = 'swipe'; const nxt = G.locked.indexOf(false); if (nxt > i) guideSwipe(1400); else if (nxt >= 0) K.guide({ id: 'mg-back', g: 'drag', dir: 'r', d: L.phone ? 120 : 200, target: hit, ox: 0.26, oy: 0.36, label: 'SWIPE BACK', delay: 1400 }); else S.later(toChoose, 900); }
      }
      function lock(i) {
        if (G.locked[i] || G.stage !== 'focus') return;
        const err = Math.abs(G.pos[i] - tgtOf(i));
        G.prec[i] = K.clamp(1 - (err / (zone * 1.2)) * 0.6, 0.3, 1);
        G.locked[i] = true; G.pos[i] = tgtOf(i); G.dwell = 0; G.dragging = false;
        barrel.classList.remove('is-sweet');
        K.sfx.lock(); if (A.ctx) A.chime(A.note(LENS[i].note), { vol: 0.09, dur: 2 });
        if (G.prec[i] > 0.9) K.pop('Pin-sharp', { x: L.W / 2, y: L.gy + L.lh * 0.22, kind: 'great' }); else if (G.prec[i] > 0.72) K.pop('Sharp', { x: L.W / 2, y: L.gy + L.lh * 0.22, kind: 'good' });
        P.emit('star', L.lensL.x + L.lw * 0.5, L.gy + L.lh * 0.3, 8, { colors: ['#ffffff', LENS[i].color] });
        P.emit('star', L.lensR.x + L.lw * 0.5, L.gy + L.lh * 0.3, 8, { colors: ['#ffffff', LENS[i].color] });
        signs.forEach(s => setSign(s, i, 'words', true));
        K.guide(null);
        ctx.track('lens_focus', { lens: i, prec: Math.round(G.prec[i] * 100) });
        const ser = serious();
        if (i === 0) { say(ser ? LN.fearReal : LN.fearWeak, { mood: ser ? 'determined' : 'think', ms: 4200 }); sync.react(ser ? 'bounce' : 'shake'); }
        if (i === 1) say(ser ? LN.factReal : LN.factWeak, { mood: 'cool', ms: 4000 });
        if (i === 2) { say(LN.friend, { mood: 'love', ms: 3800 }); sync.react('bounce'); }
        if (i === 3) say(ser ? LN.futureReal : LN.futureWeak, { mood: 'calm', ms: 4200 });
        if (i === 1 && !G.fogDone) { G.stage = 'read'; S.later(startFog, readDelay(1) * 0.75); }
        else if (G.locked.every(Boolean)) { G.stage = 'read'; S.later(toChoose, readDelay(i)); }
        else { G.stage = 'swipe'; const nxt = G.locked.indexOf(false); if (nxt > i) guideSwipe(readDelay(i)); else K.guide({ id: 'mg-back', g: 'drag', dir: 'r', d: L.phone ? 120 : 200, target: hit, ox: 0.26, oy: 0.36, label: 'SWIPE BACK', delay: readDelay(i) }); }
      }
      /* the twist: the feeling fogs the fact lens and starts rewriting its signs */
      function startFog() {
        if (G.stage !== 'read' || G.fogDone || G.cur !== 1) return;
        G.stage = 'fog'; G.fogT = 0; G.rubbed = 0;
        if (A.ctx) { A.tone({ type: 'sawtooth', freq: 70, to: 52, glide: 1.4, dur: 1.6, vol: 0.05, lp: 400, attack: 0.4 }); A.noise({ pink: true, filter: 'lowpass', freq: 300, dur: 1.4, attack: 0.5, vol: 0.06 }); }
        const d = ensureDrone(); if (d) d.level(0.1, 0.8);
        music.level(0.45);
        sync.base('worried'); sync.react('shake');
        say(LN.fog, { mood: 'surprised', moodMs: 1200, ms: 4200 });
        S.later(() => { if (G.stage === 'fog') { setSign(signs[0], 1, 'words', true, { words: THOUGHT, marks: (an.distortions || []).map(x => x && x.quote).filter(Boolean) }); K.sfx.glitch(); } }, 900);
        K.guide({ id: 'mg-rub', g: 'sweep', d: Math.round(L.gw * 0.28), target: hit, oy: 0.4, label: 'RUB THE FOG OFF', delay: 1300 });
        ctx.track('fog', {});
      }
      function clearFog() {
        if (G.stage !== 'fog') return;
        G.fogDone = true; G.fog = 0; G.wipeA = 0;
        K.sfx.sparkle(); if (A.ctx) A.chime(A.note('A5'), { vol: 0.08, dur: 1.6 });
        P.emit('star', L.W / 2, L.gy + L.lh * 0.45, 16, { colors: ['#ffffff', '#cfe9ff'] });
        signs.forEach(s => setSign(s, 1, 'words', true));
        const d = ensureDrone(); if (d) d.level(0.0001, 0.5);
        moodAudio(1);
        sync.base('cool'); sync.react('bounce');
        say(LN.fogDone, { mood: 'happy', ms: 4200 });
        G.stage = 'swipe'; guideSwipe(2600);
      }
      function toChoose() {
        if (G.stage !== 'read' && G.stage !== 'swipe') return;
        G.stage = 'choose';
        focusWrap.hidden = true; chooseWrap.hidden = false; nav.classList.add('is-gone');
        rackBs.forEach(b => { b.hidden = true; });
        signs.forEach(s => s.el.classList.add('is-gone'));
        sync.base('idea'); say(serious() ? LN.chooseReal : LN.chooseWeak, { ms: 4600 });
        moodAudio(1);
        K.guide({ id: 'mg-pick', g: 'choose', target: () => Array.from(chips.querySelectorAll('button')), label: 'KEEP WHICH LENSES?', delay: 1100 });
      }
      function onChip(item, b, set) {
        if (G.stage !== 'choose') return;
        K.sfx.pop(undefined, 480 + LENS.findIndex(l => l.id === item.id) * 90);
        G.chosen = LENS.map(l => l.id).filter(id => set.has(id));
        holdB.classList.toggle('is-off', !G.chosen.length);
        G.alt = 0;
        if (set.has(item.id)) { const r = K.rectIn(b); P.emit('spark', r.cx, r.cy, 8, { colors: ['#ffffff', LENS.find(l => l.id === item.id).color], speed: [60, 160] }); }
        if (item.id === 'fear' && set.has('fear')) say(LN.keepFear, { mood: 'determined', ms: 3000 });
        else if (G.chosen.length === 1 && set.has(item.id)) say(LN.engrave, { mood: 'happy', ms: 3200 });
        if (G.chosen.length) K.guide({ id: 'mg-engrave', g: 'hold', target: holdB, label: 'HOLD TO ENGRAVE', ms: holdMs + 500, delay: 1500 });
        else K.guide({ id: 'mg-pick', g: 'choose', target: () => Array.from(chips.querySelectorAll('button')), label: 'KEEP WHICH LENSES?', delay: 900 });
      }
      let engrN = -1;
      function paintEngrave(k) {
        const n = Math.round(ENGRAVE.length * K.clamp(k, 0, 1));
        if (n === engrN) return; engrN = n;
        engrCut.textContent = ENGRAVE.slice(0, n); engrGhost.textContent = ENGRAVE.slice(n);
      }
      const HC = K.hold(holdB, {
        ms: holdMs, decay: 0.6,
        start: () => {
          if (G.stage === 'choose' && !G.chosen.length) { K.sfx.no(); say(LN.pickFirst, { ms: 2200 }); return; }
          if (G.stage !== 'choose' && G.stage !== 'engrave') return;
          if (G.stage === 'choose') {
            G.stage = 'engrave'; chooseWrap.classList.add('is-engr'); plate.hidden = false; paintEngrave(0);
            if (PLAN) { plan.hidden = false; plan.textContent = 'Next step: ' + PLAN; }
            ctx.track('keep', { n: G.chosen.length, fear: G.chosen.includes('fear') ? 1 : 0 });
          }
          K.sfx.paper();
          if (A.ctx && !engr) engr = A.loop({ filter: 'bandpass', freq: 3200, q: 3, bus: 'sfx' });
        },
        progress: (k, active) => {
          if (G.stage !== 'engrave') { if (k > 0) HC.reset(); return; }
          holdB.style.setProperty('--p', k.toFixed(3));
          paintEngrave(k);
          if (engr) { engr.level(active ? 0.05 + Math.random() * 0.03 : 0.0001, 0.03); if (active) engr.freq(2600 + Math.random() * 1800, 0.02); }
          if (active && Math.random() < 0.6) { const r = K.rectIn(engrCaret); P.emit('spark', r.x, r.y + r.h * 0.6, 2, { colors: ['#fff6d0', '#ffd36b'], speed: [40, 120] }); }
        },
        done: () => { if (engr) { engr.stop(); engr = null; } paintEngrave(1); finale(); },
        cancel: () => { if (engr) engr.level(0.0001, 0.05); }
      });

      /* ---------------- input ---------------- */
      let lastX = 0;
      function moveFocus(dx) {
        const i = G.cur; if (G.stage !== 'focus' || G.locked[i]) return;
        const prev = G.pos[i];
        G.pos[i] = K.clamp(prev + dx, 0, 1);
        knurl.style.setProperty('--kx', (G.pos[i] * 420).toFixed(1) + 'px');
        barrel.setAttribute('aria-valuenow', String(Math.round(G.pos[i] * 100)));
        if (Math.abs(G.pos[i] - prev) > 0.002) focusTick(sharpOf(i));
      }
      K.drag(barrel, {
        start: (p) => { if (G.stage !== 'focus' || G.wipe) { K.sfx.soft(); return false; } lastX = p.x; G.dragging = true; G.dwell = 0; K.sfx.tap(); },
        move: (p) => { const dx = p.x - lastX; lastX = p.x; moveFocus(dx / (barrel.clientWidth * 0.95)); },
        end: () => {
          G.dragging = false;
          if (G.stage !== 'focus' || G.locked[G.cur]) return;
          if (Math.abs(G.pos[G.cur] - tgtOf(G.cur)) <= zone * 1.2) lock(G.cur); else guideFocus(900);
        }
      });
      S.listen(barrel, 'keydown', (e) => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
        if (!d) return; e.preventDefault(); e.stopPropagation();
        if (G.stage !== 'focus' || G.locked[G.cur]) return;
        moveFocus(d * 0.04);
        if (Math.abs(G.pos[G.cur] - tgtOf(G.cur)) <= zone) lock(G.cur);
      });
      let rubLast = null, dragKind = '';
      K.drag(hit, {
        start: (p) => { if (G.wipe || !(G.stage === 'focus' || G.stage === 'swipe' || G.stage === 'fog')) { if (G.stage === 'read') { K.sfx.soft(); bump(1); } return false; } rubLast = p; dragKind = G.stage === 'fog' ? 'rub' : 'swipe'; if (dragKind === 'rub') { G.wipeX = p.x; G.wipeA = 1; squeak(0); } },
        move: (p, d) => {
          if (dragKind === 'rub') {
            if (G.stage !== 'fog') return;
            const dist = Math.abs(p.x - rubLast.x) + Math.abs(p.y - rubLast.y) * 0.6, dir = Math.sign(p.x - rubLast.x);
            rubLast = p; G.rubbed += dist; G.wipeX = p.x; G.wipeA = 1;
            G.fog = Math.max(0, 0.9 * (1 - G.rubbed / (L.gw * rubNeed)));
            if (dist > 2) squeak(dir);
            if (Math.random() < 0.35) P.emit('bubble', L.gx + p.x, L.gy + p.y, 1, { speed: [10, 40] });
            if (G.fog <= 0.04) clearFog();
            return;
          }
          G.rub = K.clamp(d.dx * 0.22, -46, 46); G.rubV = 0;
        },
        end: (p, d) => {
          if (dragKind === 'rub') { if (G.stage === 'fog' && G.fog <= 0.06) clearFog(); return; }
          if (d.dx < -34 || d.vx < -420) goLens(G.cur + 1, 1); else if (d.dx > 34 || d.vx > 420) goLens(G.cur - 1, -1);
        }
      });
      rackBs.forEach((b, i) => S.listen(b, 'click', () => { A.unlock(); K.guideDone(); if (i === G.cur && !G.wipe) { lensClick(); bump(1); return; } goLens(i, i > G.cur ? 1 : -1); }));
      S.listen(prevB, 'click', () => { A.unlock(); K.guideDone(); goLens(G.cur - 1, -1); });
      S.listen(nextB, 'click', () => { A.unlock(); K.guideDone(); goLens(G.cur + 1, 1); });
      K.onKey(['ArrowLeft', 'ArrowRight'], (e) => { if (document.activeElement === barrel) return; goLens(G.cur + (e.key === 'ArrowRight' ? 1 : -1), e.key === 'ArrowRight' ? 1 : -1); });
      S.on('theme', () => { if (L.W) { buildBg(); buildFrame(); rackKey = ''; G.baked = false; } });

      /* ---------------- render loop ---------------- */
      let hitActive = false;
      S.listen(hit, 'pointerdown', () => { hitActive = true; });
      S.listen(hit, 'pointerup', () => { hitActive = false; });
      S.listen(hit, 'pointercancel', () => { hitActive = false; });
      let acc = 0, odd = false;
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !L.gw || !SCL) return;
        /* adaptive frame rate: 60 fps while touched or animating hard, 30 fps for idle ambience (saves battery) */
        if (G.stage === 'intro' && G.drawnOnce) return;
        G.drawnOnce = true;
        const busy = G.dragging || hitActive || !!G.wipe || G.stage === 'fog' || G.stage === 'engrave' || G.fin || P.count() > 0 || G.flash > 0 || Math.abs(G.rub) > 0.5 || signs.some(x => x.scr);
        odd = !odd;
        if (!busy && odd) { acc += dt0; return; }
        const dt = Math.min(0.1, dt0 + acc); acc = 0;
        const now = performance.now(), bt = beat();
        G.t = t;
        for (let i = 0; i < 4; i++) { const tb = 1 - sharpOf(i); G.blur[i] += (tb - G.blur[i]) * Math.min(1, dt * 9); }
        if (G.stage === 'focus' && !G.locked[G.cur]) {
          const s = sharpOf(G.cur), inZone = Math.abs(G.pos[G.cur] - tgtOf(G.cur)) <= zone, sv = s.toFixed(2);
          if (sharpBar.lv !== sv) { sharpBar.lv = sv; sharpBar.style.setProperty('--s', sv); }
          barrel.classList.toggle('is-sweet', inZone);
          if (inZone && G.dragging) { G.dwell += dt; if (!G.sweetSaid && G.dwell > 0.08) { G.sweetSaid = true; say(LN.sweet, { ms: 1400 }); } if (G.dwell >= dwellNeed) lock(G.cur); }
          else G.dwell = 0;
        } else { const sv = G.locked[G.cur] ? '1' : '0'; if (sharpBar.lv !== sv) { sharpBar.lv = sv; sharpBar.style.setProperty('--s', sv); } }
        G.rub += G.rubV * dt; G.rubV *= Math.pow(0.02, dt);
        if (!hitActive || G.stage === 'fog') G.rub += (0 - G.rub) * Math.min(1, dt * 10);
        const sw = K.reduced() ? 0 : Math.sin(bt * TAU) * 0.7;
        signs.forEach(s => {
          const rub = (Math.round(G.rub * 2) / 2).toFixed(1) + 'px', swv = (Math.round((s.side === 'L' ? sw : -sw) * 20) / 20).toFixed(2) + 'deg';
          if (s.lr !== rub) { s.lr = rub; s.el.style.setProperty('--rub', rub); }
          if (s.ls !== swv) { s.ls = swv; s.el.style.setProperty('--sw', swv); }
          if (s.scr) scrambleStep(s, now);
          if (s.mode === 'blank') { const b = Math.round(G.blur[s.lens] * 5); if (b !== s.bl) { s.bl = b; s.el.style.setProperty('--so', (0.95 - b * 0.11).toFixed(2)); } }
        });
        if (G.wipe) {
          const w = G.wipe; w.p = Math.min(1, w.p + dt / (K.reduced() ? 0.25 : 0.62));
          const e = K.ease.inOutCubic(w.p), xe = w.dir > 0 ? L.gw * (1 - e) : L.gw * e;
          signs.forEach(s => {
            if (w.done[s.side]) return;
            const sx = s.side === 'L' ? L.lw / 2 : L.gw - L.lw / 2;
            if ((w.dir > 0 && xe < sx) || (w.dir < 0 && xe > sx)) { w.done[s.side] = true; setSign(s, w.to, G.locked[w.to] ? 'words' : 'blank', G.locked[w.to]); }
          });
          if (w.p >= 1) arrive(w.to);
        }
        if (G.stage === 'fog') { G.fogT += dt; if (G.rubbed === 0) G.fog = Math.min(0.9, G.fogT / 1.4 * 0.9); }
        G.wipeA = Math.max(0, G.wipeA - dt * 3);
        const fearOn = !G.fin && (LENS[G.cur].id === 'fear' || (G.wipe && (G.wipe.to === 0 || G.wipe.from === 0)));
        if (fearOn && !K.reduced() && inten > 0) { G.nextBolt -= dt; if (G.nextBolt <= 0) { G.flash = 1; G.boltX = 0.15 + Math.random() * 0.7; G.nextBolt = 4 + Math.random() * 4; if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 180, dur: 1.6, attack: 0.06, vol: 0.1, bus: 'amb' }); } }
        G.flash = Math.max(0, G.flash - dt * 2.6);
        if (G.fin) { G.finT += dt; G.day = Math.min(1, G.finT / 1.8); G.prism = K.clamp((G.finT - 0.5) / 1.5, 0, 1); G.standK = K.clamp((G.finT - 0.2) / 0.7, 0, 1); G.drop = K.clamp((G.finT - 0.9) / 0.7, 0, 1); }

        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.drawImage(BG, 0, 0, L.W, L.H);
        if (G.fin) drawFlood(g);
        const cur = LENS[G.cur].id;
        if (G.fin) {
          if (G.day < 1) pass(g, (G.chosen[0] || 'fact'), 0, 0, L.gw, t);
          g.globalAlpha = G.day; pass(g, 'day', 0, 0, L.gw, t); g.globalAlpha = 1;
        } else if (G.stage === 'choose' || G.stage === 'engrave') {
          const ids = G.chosen.length ? G.chosen : ['fact'];
          if (ids.length > 2) G.alt += dt;
          const off = ids.length > 2 ? Math.floor(G.alt / 2.4) % ids.length : 0;
          const a = ids[off % ids.length], b = ids[(off + 1) % ids.length] || a;
          pass(g, a, 0, 0, L.gw / 2, t); pass(g, ids.length > 1 ? b : a, 0, L.gw / 2, L.gw, t);
        } else if (G.wipe) {
          const w = G.wipe, e = K.ease.inOutCubic(w.p), xe = w.dir > 0 ? L.gw * (1 - e) : L.gw * e;
          const fa = LENS[w.from].id, fb = LENS[w.to].id;
          if (w.dir > 0) { pass(g, fa, G.blur[w.from], 0, xe, t); pass(g, fb, G.blur[w.to], xe, L.gw, t); }
          else { pass(g, fb, G.blur[w.to], 0, xe, t); pass(g, fa, G.blur[w.from], xe, L.gw, t); }
          g.save(); lensClip(g);
          const ex = L.gx + xe + G.rub, eg = g.createLinearGradient(ex - 26, 0, ex + 26, 0);
          eg.addColorStop(0, 'rgba(255,255,255,0)'); eg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); eg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = eg; g.fillRect(ex - 26, L.gy, 52, L.lh);
          g.fillStyle = 'rgba(30,15,5,0.55)'; g.fillRect(ex - 1, L.gy, 2, L.lh);
          g.restore();
        } else pass(g, cur, G.blur[G.cur], 0, L.gw, t);
        glassFx(g, t, G.fin ? null : { fear: 'rgba(255,40,30,0.07)', friend: 'rgba(255,170,60,0.05)', future: 'rgba(160,110,60,0.06)' }[cur]);
        g.drawImage(G.fin ? FRP : FR, L.gx - L.frEx, L.gy - L.frEy, L.gw + L.frEx * 2, L.lh + L.frEy * 2);
        drawRack(g, t, G.fin || G.stage === 'choose' || G.stage === 'engrave' ? 0 : 1, bt);
        if (G.fin) drawPrism(g, t);
        drawStand(g, t);
        if (G.fin && G.drop >= 1 && Math.random() < dt * 12) { const s = L.stand.s; P.emit('star', L.stand.x + (Math.random() - 0.5) * 150 * s, L.stand.y - 20 * s + (Math.random() - 0.5) * 50, 1, { colors: SPECTRUM.concat(['#ffffff']), speed: [10, 40] }); }
        P.update(dt); P.draw(g);
      });

      /* ---------------- finale ---------------- */
      let finished = false;
      async function finale() {
        if (G.fin) return;
        G.stage = 'end'; G.fin = true; G.finT = 0;
        K.guide(null);
        chooseWrap.classList.add('is-end');
        plate.classList.add('is-shine');
        if (!LOOKC.day) LOOKC.day = bakeLook(SCL, 'day');
        shopBell(); K.sfx.great();
        if (A.ctx) { const t0 = A.now(); SPECTRUM.forEach((c, i) => A.tone({ when: t0 + 0.5 + i * 0.09, type: 'sine', freq: 1400 + i * 260, dur: 0.5, vol: 0.02, verb: 0.6 })); }
        S.later(() => { K.sfx.pop(undefined, 620); if (A.ctx) A.chime(A.note('E6'), { vol: 0.08, dur: 1.6 }); P.emit('star', L.stand.x, L.stand.y - 20, 18, { colors: SPECTRUM.concat(['#ffffff']) }); }, 1500);
        const d = ensureDrone(); if (d) d.level(0.0001, 0.4);
        music.level(0.6);
        sync.base('rainbow'); sync.react('bounce');
        say(care() ? LN.finalCare : serious() ? LN.finalReal : LN.finalWeak, { ms: 0 });
        /* rewards: calm skill, today's frames, never time spent */
        const prec = G.prec.reduce((a, b) => a + b, 0) / 4, pct = Math.round(prec * 100);
        const best = K.best('focus', pct, 'higher'), tier = K.tier(prec, [0.5, 0.72, 0.88]);
        const col = K.collect(FRAME_KEY);
        const badges = [];
        if (best.isNew) badges.push('New best: ' + pct + '% focus'); else badges.push('Focus: ' + pct + '%' + (best.prev != null && !best.first ? ' (best ' + best.prev + '%)' : ''));
        if (tier) badges.push(tier + ' focus');
        if (col.isNew) badges.push('Collected: ' + FRAME_KEY);
        badges.push('Frames: ' + Math.min(col.count, FRAMES.length) + '/' + FRAMES.length);
        if (PLAN && L.phone) { plan.hidden = true; today.classList.add('is-plan', 'gk-user', 'is-new'); today.textContent = 'Next step: ' + PLAN; }
        else S.later(() => { paintToday(Math.min(col.count, FRAMES.length)); today.classList.add('is-new'); }, 1700);
        await S.sleep(700);
        await K.finale('stars', { colors: SPECTRUM.concat(['#ffffff']), chord: ['D4', 'F#4', 'A4', 'E5'], ms: 4400 });
        const names = (G.chosen.length ? G.chosen : ['fact']).map(id => LENS.find(l => l.id === id).short);
        finished = true;
        ctx.finish({
          title: 'A fairer pair of glasses', mood: 'rainbow',
          lines: ['Tried 4 lenses', 'Keeping: ' + names.join(' + '), serious() ? 'Fear lens: partly on record, so a plan' : 'Fear lens added: ' + FEAR_TAG],
          share: 'Tried 4 lenses. Kept ' + names.join(' + ') + '.',
          badges
        });
      }

      /* ---------------- start ---------------- */
      setSign(signs[0], 0, 'blank'); setSign(signs[1], 0, 'blank');
      cv.onResize(() => layout());
      paintHud();
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && a !== an && G.stage === 'intro') { an = a; buildTexts(); } }).catch(() => {});
      (async () => {
        await K.intro({ title: 'Mood Glasses', sub: 'Same street, four lenses. See what the feeling paints over the facts.', how: 'Drag to focus. Swipe to swap lenses. Keep the fairest pair.', char: 'sync', mood: 'rainbow' });
        shopBell();
        G.stage = 'focus'; focusWrap.hidden = false; moodAudio(0);
        sync.base('worried');
        say(drift ? LN.wobble : visits > 0 ? LN.back : LN.start, { mood: 'wink', moodMs: 1400, ms: 4400 });
        guideFocus(1200);
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > (ms || 25000)) return false; await K.wait(100); } return true; };
          const goTo = async (i) => {
            for (let n = 0; n < 8 && G.cur !== i; n++) {
              await until(() => (G.stage === 'focus' || G.stage === 'swipe') && !G.wipe, 20000);
              if (G.cur === i) break;
              const hw = hit.clientWidth, hh = hit.clientHeight, fwd = i > G.cur;
              await K.sim.drag(hit, { x: hw * (fwd ? 0.78 : 0.28), y: hh * 0.42 }, { x: hw * (fwd ? 0.28 : 0.78), y: hh * 0.44 }, 420, 10);
              await until(() => !G.wipe, 3000);
            }
          };
          for (let i = 0; i < 4; i++) {
            if (i > 0) { await until(() => G.stage === 'swipe', 25000); await K.wait(1400); await goTo(i); }
            await until(() => G.stage === 'focus' && G.cur === i && !G.wipe);
            await K.wait(700);
            const bw = barrel.clientWidth, y = barrel.clientHeight / 2, span = bw * 0.95, x0 = bw * 0.2;
            await K.sim.drag(barrel, { x: x0, y }, { x: x0 + (tgtOf(i) - G.pos[i]) * span, y }, 1200, 24);
            for (let n = 0; n < 6 && !G.locked[i]; n++) { const dd = (tgtOf(i) - G.pos[i]) * span; await K.sim.drag(barrel, { x: bw / 2, y }, { x: bw / 2 + dd, y }, 300, 6); }
            await until(() => G.locked[i], 3000);
            if (i === 1) {
              await until(() => G.stage === 'fog', 9000);
              await K.wait(1500);
              const hw = hit.clientWidth, hh = hit.clientHeight;
              for (let n = 0; n < 14 && G.stage === 'fog'; n++) await K.sim.drag(hit, { x: hw * (n % 2 ? 0.85 : 0.15), y: hh * (0.4 + (n % 3) * 0.05) }, { x: hw * (n % 2 ? 0.15 : 0.85), y: hh * (0.45 + (n % 2) * 0.05) }, 340, 10);
            }
          }
          await until(() => G.stage === 'choose', 15000);
          await K.wait(1200);
          const bs = chips.querySelectorAll('button');
          await K.sim.tap(bs[1]); await K.wait(500); await K.sim.tap(bs[2]); await K.wait(1300);
          for (let n = 0; n < 4 && !G.fin; n++) await K.sim.hold(holdB, holdMs + 700);
          await until(() => finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
