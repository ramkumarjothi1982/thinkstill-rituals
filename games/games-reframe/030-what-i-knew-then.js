/* 030 What I Knew Then — Reframe · REFRAME · Memory / Replay / Rumination
 * Mechanism: hindsight bias (Fischhoff 1975: once we know how it turned out, the past looks more predictable than it was)
 * and outcome bias (Baron & Hershey 1988: judging a decision by its outcome). Sorting what could be known at the time from
 * what only arrived later, as in Kubany's work on hindsight-biased guilt, gives a fair view of past-you without excusing
 * real harm. The player pulls a backlit paper memory reel back to the moment, fogs every tag that came later (how it went,
 * the replays, today's verdict), plays the moment forward with only what was in view, answers the friend test honestly
 * ("partly" and "yes" are real answers) and sends a letter back down the reel. Their own facts are theirs to sort (no
 * wrong answer); harm is owned, and a serious worry gets a next step or proper help, never a pep talk.
 * Verb: pull (drag the paper reel back), tap (fog what came later), hold (play it forward), send (drag the paper bird).
 * Finale: the letter folds into a paper bird that flies back down the reel to past-you; the lamp behind the paper warms
 * to gold, the fog turns to glowing mist and paper lanterns rise along the path.
 */
(function (env) {
  'use strict';

  /* Daily paper stock for the reel (first visit: sepia). Each stock is a reel in the collection. */
  const STOCKS = [
    { key: 'sepia', name: 'Sepia', short: 'Sepia', sky: ['#f6e3c0', '#ecc283'], glow: '#fff1cc', far: '#d4ae80', mid: '#a67b52', near: '#583b26', path: '#f6dfb2', fog: '#fff6e6', trim: '#d0a04a' },
    { key: 'dusk', name: 'Indigo Dusk', short: 'Dusk', sky: ['#2a2d5e', '#f0a07a'], glow: '#ffd7a4', far: '#5b5a91', mid: '#393a72', near: '#1b1c43', path: '#f6cf94', fog: '#ecebff', trim: '#d6a24c' },
    { key: 'dawn', name: 'Rose Dawn', short: 'Dawn', sky: ['#ffe1d2', '#ff9d8c'], glow: '#fff0e0', far: '#e9b0a7', mid: '#c17d87', near: '#73465c', path: '#fff0de', fog: '#fff4f0', trim: '#d39a5a' },
    { key: 'forest', name: 'Forest Green', short: 'Forest', sky: ['#edf2da', '#ffe7aa'], glow: '#fffbdf', far: '#b0ca9a', mid: '#6e996a', near: '#2d4f3e', path: '#f7edc8', fog: '#f6fbef', trim: '#c9a24a' },
    { key: 'cyan', name: 'Cyanotype', short: 'Cyanotype', sky: ['#d9e8f6', '#a6c6e7'], glow: '#f3f9ff', far: '#7ea5ce', mid: '#3f6e9e', near: '#163c62', path: '#e9f2fb', fog: '#f4f8ff', trim: '#c7a35a' }
  ];
  /* Things nobody has at the moment itself: true of any past moment, whatever happened next. */
  const LATER = [
    { id: 'after', label: 'Everything that happened after', line: 'You couldn’t see what came next.' },
    { id: 'went', label: 'How things went from there', line: 'You didn’t know how things would go.' },
    { id: 'learned', label: 'What you’ve learned since', line: 'You hadn’t learned what I know now.' },
    { id: 'replays', label: 'Every replay since then', line: 'You hadn’t replayed it a hundred times yet.' },
    { id: 'feels', label: 'How it feels now', line: 'You didn’t have today’s feelings about it.' },
    { id: 'said', label: 'What anyone said afterwards', line: 'Nobody had said a word about it yet.' }
  ];
  /* What past-you did have (categories, never claims about their life). */
  const THEN = [
    { id: 'hoped', label: 'What you hoped would happen', short: 'what you hoped' },
    { id: 'told', label: 'What you’d been told so far', short: 'what you’d been told' },
    { id: 'time', label: 'How much time you had', short: 'the time you had' },
    { id: 'plate', label: 'What else was on your plate', short: 'everything else on your plate' },
    { id: 'options', label: 'The options you could see', short: 'the options you could see' },
    { id: 'felt', label: 'How you felt that day', short: 'how you felt that day' }
  ];
  const GREETINGS = ['Dear then-me,', 'Hey you, back at the moment,', 'To me, on that day,'];
  const SIGNOFFS = ['Love, me now.', 'From the you who’s still here.', 'Kindly, future you.', 'With hindsight and kindness, me.'];
  // the player says they did something that went wrong or hurt someone: the letter owns it with them
  const OWN = /\bi (?:yelled|snapped|shouted|screamed|swore|lied|cheated|hit|hurt|broke|ignored|ghosted|blew up|lost my temper|forgot|missed|messed up|screwed up|made a mistake|let (?:\w+ ){0,2}down|was (?:rude|mean|wrong|harsh|unfair|horrible|awful|nasty|cruel|late))\b/i;
  // the hindsight verdict in their words ("you should have known")
  const HINDSIGHT = /\b(should(?:n['’]?t| not)? have|should['’]ve|could have|could['’]ve|knew|known|know better|obvious|saw it coming|see it coming|stupid|idiot|fool|my fault|your fault|regret|if only|why did|never should|mistake)\b/i;
  /* No GPU (VMs, blocklisted devices): every canvas pixel is rasterised on the CPU, so the canvas runs at 1x and about
   * 30 fps there; devices with a GPU keep the full picture. */
  let softMemo = null;
  function softwareGfx() {
    if (softMemo != null) return softMemo;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl');
      if (!gl) return (softMemo = true);
      const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      return (softMemo = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r));
    } catch (e) { return (softMemo = false); }
  }
  const hex3 = (c) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(c || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]; };
  const rgba = (c, a) => { const x = hex3(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; };
  const mixHex = (a, b, k) => { const x = hex3(a), y = hex3(b), f = (i) => Math.round(x[i] + (y[i] - x[i]) * k).toString(16).padStart(2, '0'); return '#' + f(0) + f(1) + f(2); };
  function rr(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  const BIRD = '<svg viewBox="0 0 96 72" aria-hidden="true"><ellipse cx="48" cy="66" rx="24" ry="4.5" fill="rgba(0,0,0,.22)"/>' +
    '<path d="M8 34 L44 26 L38 42 Z" fill="#efe3c9"/><path d="M88 16 L50 27 L54 42 Z" fill="#fffaf0"/><path d="M38 42 L54 42 L50 27 L44 26 Z" fill="#e2d1ae"/>' +
    '<path d="M44 26 L30 9 L47 27 Z" fill="#fffdf6"/><path d="M50 27 L64 8 L53 30 Z" fill="#f3e7cd"/><path d="M38 42 L30 50 L44 41 Z" fill="#d8c59e"/>' +
    '<path d="M44 26 L50 27 M38 42 L54 42" stroke="rgba(90,60,30,.35)" stroke-width="1.2" fill="none"/></svg>';
  const ENVELOPE = '<svg viewBox="0 0 40 30" aria-hidden="true"><rect x="1.5" y="3" width="37" height="25" rx="3" fill="#fffaf0" stroke="#b98a4a" stroke-width="1.6"/><path d="M2.5 5l17.5 13 17.5-13" fill="none" stroke="#b98a4a" stroke-width="1.6"/><circle cx="20" cy="18" r="4" fill="#c0392b"/></svg>';

  (env.games = env.games || []).push({
    id: 'what-i-knew-then', mode: 'reframe', name: 'What I Knew Then', verb: 'pull', family: 'REFRAME', minutes: 2,
    parents: ['Memory / Replay / Rumination', 'Identity / Self', 'Decision Pressure'],
    cast: ['still', 'drop'], poster: { char: 'still', mood: 'think' },
    fonts: ['Young+Serif', 'Nothing+You+Could+Do'],
    tagline: 'Pull the memory back to the moment. Fog what you only learned later.',
    why: 'For judging past-you with today’s hindsight: see the little you could actually see then.',
    css: `
.g-what-i-knew-then { --wk-serif: "Young Serif", "Iowan Old Style", "Palatino Linotype", Georgia, "Times New Roman", serif; --wk-hand: "Nothing You Could Do", "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive; --wk-ink: #2d1f14; }
.g-what-i-knew-then .wk-drag { position: absolute; z-index: 12; touch-action: none; cursor: grab; }
.g-what-i-knew-then .wk-drag.off { pointer-events: none; cursor: default; }
.g-what-i-knew-then .wk-ruler { position: absolute; z-index: 13; height: 48px; touch-action: none; cursor: ew-resize; }
.g-what-i-knew-then .wk-ruler.off { pointer-events: none; cursor: default; }
.g-what-i-knew-then .wk-mark { position: absolute; z-index: 14; transform: translateX(-50%); font: 700 12px/1 var(--font-ui); letter-spacing: .14em; text-transform: uppercase; white-space: nowrap; pointer-events: none; color: #e9d8b8; transition: color .4s ease, text-shadow .4s ease, opacity .3s ease; }
.g-what-i-knew-then .wk-mark.off { opacity: 0; }
.g-what-i-knew-then .wk-mark.lit { color: #ffd77a; text-shadow: 0 0 10px rgba(255,200,90,.8); }
.g-what-i-knew-then.wk-bright .wk-mark { color: #2e1a08; text-shadow: 0 1px 0 rgba(255,240,215,.45); }
.g-what-i-knew-then.wk-bright .wk-mark.lit { color: #fff3cf; text-shadow: 0 0 8px rgba(120,60,0,.8), 0 1px 0 #6a3a08; }
.g-what-i-knew-then .wk-cap { position: absolute; z-index: 18; box-sizing: border-box; width: max-content; transform: translateX(-50%); padding: 8px 16px 10px; text-align: center; color: var(--wk-ink); pointer-events: none;
  background: linear-gradient(180deg, #fffaf0, #f3e3c0); border-radius: 3px; box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 3px 0 rgba(110,80,40,.3), 0 10px 20px rgba(20,10,0,.3); transition: opacity .5s ease, translate .5s ease; }
.g-what-i-knew-then .wk-cap::before, .g-what-i-knew-then .wk-cap::after { content: ""; position: absolute; top: -11px; width: 6px; height: 14px; background: radial-gradient(circle at 50% 3px, #d0a04a 2.6px, transparent 3px), linear-gradient(90deg, transparent 2.2px, rgba(50,35,20,.6) 2.2px 3.8px, transparent 3.8px); }
.g-what-i-knew-then .wk-cap::before { left: 20px; } .g-what-i-knew-then .wk-cap::after { right: 20px; }
.g-what-i-knew-then .wk-cap small { display: block; font: 700 12px/1 var(--font-ui); letter-spacing: .18em; text-transform: uppercase; color: #9a5a1c; margin-bottom: 5px; }
.g-what-i-knew-then .wk-cap span { display: block; font: 400 16px/1.3 var(--wk-serif); text-wrap: balance; }
.g-what-i-knew-then .wk-cap span.gk-user { font: 400 16px/1.3 var(--wk-serif); }
.g-what-i-knew-then .wk-cap.off { opacity: 0; translate: 0 -10px; }
.g-what-i-knew-then .wk-cap.final { padding: 10px 18px 12px; background: linear-gradient(180deg, #fffbf2, #f7e6bd); box-shadow: inset 0 1px 0 rgba(255,255,255,.8), 0 3px 0 rgba(110,80,40,.3), 0 0 0 1px rgba(208,160,74,.5), 0 0 30px rgba(255,214,120,.55), 0 12px 24px rgba(20,10,0,.3); }
.g-what-i-knew-then .wk-cap.final span { font-size: 19px; }
.g-what-i-knew-then .wk-tag { position: absolute; z-index: 20; box-sizing: border-box; display: flex; flex-direction: column; gap: 3px; padding: 9px 11px 10px 25px; margin: 0; border: 0; text-align: left; cursor: pointer; touch-action: manipulation; color: var(--wk-ink);
  background: linear-gradient(180deg, #fffbf2, #f1e1bc); border-radius: 5px 10px 10px 5px; box-shadow: inset 0 1px 0 rgba(255,255,255,.75), 0 3px 0 rgba(110,80,40,.32), 0 10px 18px rgba(20,10,0,.3);
  transform-origin: 16px -12px; rotate: var(--rot, 0deg); translate: var(--tx, 0px) var(--ty, 0px); opacity: var(--op, 1);
  transition: translate .8s cubic-bezier(.2,1.1,.3,1), opacity .6s ease, rotate .6s ease; animation: what-i-knew-then-sway var(--sw, 4.8s) ease-in-out infinite; }
.g-what-i-knew-then .wk-tag::before { content: ""; position: absolute; left: 10px; top: 13px; width: 8px; height: 8px; border-radius: 50%; background: #3a2a1a; box-shadow: 0 0 0 2px #d0a04a; }
.g-what-i-knew-then .wk-tag::after { content: ""; position: absolute; left: 13.3px; bottom: calc(100% - 13px); width: 1.6px; height: 25px; background: rgba(60,40,22,.62); }
.g-what-i-knew-then .wk-tag small { font: 700 12px/1 var(--font-ui); letter-spacing: .12em; text-transform: uppercase; color: #9a5a1c; }
.g-what-i-knew-then .wk-tag span { font: 400 15px/1.28 var(--wk-serif); }
.g-what-i-knew-then .wk-tag span.gk-user { font: 400 15px/1.28 var(--wk-serif); }
.g-what-i-knew-then .wk-tag:focus-visible { outline: 3px solid #ffd77a; outline-offset: 3px; }
.g-what-i-knew-then .wk-tag.fog { --op: 0; pointer-events: none; transition: translate 1s ease, opacity .9s ease, rotate .9s ease; rotate: calc(var(--rot, 0deg) - 6deg); }
.g-what-i-knew-then .wk-tag.kept { box-shadow: inset 0 1px 0 rgba(255,255,255,.75), 0 3px 0 rgba(110,80,40,.32), 0 0 0 2px rgba(255,214,120,.9), 0 0 22px rgba(255,214,120,.55), 0 10px 18px rgba(20,10,0,.3); }
.g-what-i-knew-then .wk-tag.nudge { animation: what-i-knew-then-nudge .5s ease; }
.g-what-i-knew-then .wk-stamp { position: absolute; right: 8px; top: -10px; padding: 4px 7px 3px; border: 2px solid #2f7a3a; border-radius: 4px; background: #f3fbe9; color: #2f7a3a; font: 800 12px/1 var(--font-ui); letter-spacing: .06em; text-transform: uppercase; rotate: 5deg; pointer-events: none; }
@keyframes what-i-knew-then-sway { 0%, 100% { transform: rotate(-0.7deg); } 50% { transform: rotate(0.8deg); } }
@keyframes what-i-knew-then-nudge { 0%, 100% { transform: none; } 25% { transform: translateX(-6px) rotate(-3deg); } 60% { transform: translateX(5px) rotate(2deg); } }
.g-what-i-knew-then .wk-btn { position: absolute; z-index: 26; transform: translateX(-50%); min-height: 54px; padding: 0 26px; border: 0; border-radius: 999px; cursor: pointer; white-space: nowrap; font: 400 18px/1 var(--wk-serif); color: #2b1a0c;
  background: linear-gradient(180deg, #ffe9b8, #f1c26e); box-shadow: inset 0 1px 0 rgba(255,255,255,.75), 0 4px 0 #a7732a, 0 14px 26px rgba(0,0,0,.35); animation: what-i-knew-then-in .45s cubic-bezier(.2,1.3,.4,1) both; }
.g-what-i-knew-then .wk-btn:active { translate: 0 3px; box-shadow: inset 0 1px 0 rgba(255,255,255,.75), 0 1px 0 #a7732a, 0 8px 16px rgba(0,0,0,.35); }
.g-what-i-knew-then .wk-btn:focus-visible, .g-what-i-knew-then .wk-hold:focus-visible, .g-what-i-knew-then .wk-chip:focus-visible, .g-what-i-knew-then .wk-sign:focus-visible { outline: 3px solid #ffd77a; outline-offset: 4px; }
.g-what-i-knew-then .wk-hold { position: absolute; z-index: 26; width: 118px; height: 118px; margin: -59px 0 0 -59px; padding: 0; border-radius: 50%; border: 0; cursor: pointer; touch-action: none; display: grid; place-content: center; text-align: center; color: #2b1a0c;
  background: radial-gradient(circle at 38% 30%, #fff7de 0 10%, #ffd98a 42%, #e7a03c 100%); box-shadow: 0 5px 0 #a7732a, 0 0 calc(12px + var(--glow, 0) * 44px) rgba(255,208,120,.75), 0 14px 26px rgba(0,0,0,.4); animation: what-i-knew-then-in .45s cubic-bezier(.2,1.3,.4,1) both; }
.g-what-i-knew-then .wk-hold b { font: 400 16px/1.1 var(--wk-serif); padding: 0 14px; pointer-events: none; }
.g-what-i-knew-then .wk-hold svg { position: absolute; inset: -11px; width: calc(100% + 22px); height: calc(100% + 22px); transform: rotate(-90deg); pointer-events: none; overflow: visible; }
.g-what-i-knew-then .wk-hold circle { fill: none; stroke-width: 6; stroke-linecap: round; }
.g-what-i-knew-then .wk-hold .trk { stroke: rgba(255,240,210,.22); }
.g-what-i-knew-then .wk-hold .bar { stroke: #fff4d6; }
.g-what-i-knew-then .wk-chips { position: absolute; z-index: 26; display: flex; flex-direction: column; gap: 7px; }
.g-what-i-knew-then .wk-chip { appearance: none; text-align: left; cursor: pointer; min-height: 46px; padding: 9px 14px 10px; border-radius: 12px; border: 1px solid rgba(255,235,200,.28); color: #fbefd9;
  background: linear-gradient(180deg, rgba(64,42,26,.95), rgba(40,26,16,.96)); box-shadow: 0 8px 18px rgba(0,0,0,.3); font: 600 15px/1.3 var(--font-ui); animation: what-i-knew-then-in .45s cubic-bezier(.2,1.3,.4,1) both; }
.g-what-i-knew-then .wk-chip b { color: #ffd77a; font-weight: 800; }
.g-what-i-knew-then .wk-chip:nth-child(2) { animation-delay: .08s; } .g-what-i-knew-then .wk-chip:nth-child(3) { animation-delay: .16s; }
.g-what-i-knew-then.wk-bright .wk-chip { color: #2d1f14; background: linear-gradient(180deg, #fffaf0, #f3e3c3); border-color: rgba(120,80,30,.25); box-shadow: 0 6px 14px rgba(60,40,10,.18); }
.g-what-i-knew-then.wk-bright .wk-chip b { color: #9a5a1c; }
.g-what-i-knew-then .wk-chip.pick { box-shadow: 0 0 0 3px #ffd77a, 0 10px 20px rgba(0,0,0,.35); }
.g-what-i-knew-then .wk-chip.gone { opacity: 0; translate: 0 10px; transition: opacity .3s ease, translate .3s ease; pointer-events: none; }
.g-what-i-knew-then .wk-letter { --lh: 28px; --fs: 20px; position: absolute; z-index: 40; box-sizing: border-box; padding: 16px 20px 14px 22px; color: #2a2238; border-radius: 4px; touch-action: none; transform-origin: 50% 40%;
  background: repeating-linear-gradient(180deg, transparent 0 calc(var(--lh) - 1px), rgba(70,110,170,.16) calc(var(--lh) - 1px) var(--lh)) 0 42px / 100% calc(100% - 42px) no-repeat, linear-gradient(180deg, #fffdf7, #fbf2dc);
  box-shadow: inset 0 2px 0 rgba(255,255,255,.8), 0 0 0 1px rgba(150,110,60,.18), 0 18px 40px rgba(0,0,0,.45); animation: what-i-knew-then-up .6s cubic-bezier(.2,1.2,.4,1) both; transition: transform .55s cubic-bezier(.5,0,.3,1), opacity .5s ease .1s; }
.g-what-i-knew-then .wk-letter::after { content: ""; position: absolute; left: 12px; top: 40px; bottom: 10px; width: 1.5px; background: rgba(200,80,80,.25); }
.g-what-i-knew-then .wk-letter h3 { margin: 0 0 8px; font: 700 12px/1 var(--font-ui); letter-spacing: .16em; text-transform: uppercase; color: #8a5a2a; }
.g-what-i-knew-then .wk-letter p { margin: 0; font: 400 var(--fs)/var(--lh) var(--wk-hand); }
.g-what-i-knew-then .wk-letter .wd { opacity: 0; transition: opacity .2s ease; }
.g-what-i-knew-then .wk-letter .wd.on { opacity: 1; }
.g-what-i-knew-then .wk-letter.dense { --lh: 24px; --fs: 17px; }
.g-what-i-knew-then .wk-letter p.sign { text-align: right; margin-top: 6px; }
.g-what-i-knew-then .wk-letter.fold { transform: scale(.16) rotate(-14deg); opacity: 0; }
.g-what-i-knew-then .wk-signs { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin-top: 10px; }
.g-what-i-knew-then .wk-sign { appearance: none; cursor: pointer; min-height: 44px; padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(90,60,30,.32); background: #fffefa; color: #3a2a1a; font: 400 18px/1.1 var(--wk-hand); box-shadow: 0 3px 8px rgba(60,40,10,.16); animation: what-i-knew-then-in .4s cubic-bezier(.2,1.3,.4,1) both; }
.g-what-i-knew-then .wk-sign:nth-child(2) { animation-delay: .07s; } .g-what-i-knew-then .wk-sign:nth-child(3) { animation-delay: .14s; } .g-what-i-knew-then .wk-sign:nth-child(4) { animation-delay: .21s; }
.g-what-i-knew-then .wk-bird { position: absolute; z-index: 41; width: 96px; height: 72px; margin: -36px 0 0 -48px; touch-action: none; cursor: grab; animation: what-i-knew-then-in .5s cubic-bezier(.2,1.3,.4,1) both; }
.g-what-i-knew-then .wk-bird svg { width: 100%; height: 100%; display: block; overflow: visible; }
.g-what-i-knew-then .wk-bird i { position: absolute; inset: 0; animation: what-i-knew-then-bob 1.7s ease-in-out infinite; }
.g-what-i-knew-then .wk-bird.lift { cursor: grabbing; }
.g-what-i-knew-then .wk-env { position: absolute; z-index: 31; width: 38px; height: 29px; pointer-events: none; animation: what-i-knew-then-in .5s cubic-bezier(.2,1.5,.4,1) both; }
.g-what-i-knew-then .wk-env svg { width: 100%; height: 100%; display: block; }
.g-what-i-knew-then .wk-walk .gk-char-img { animation: what-i-knew-then-walk .52s ease-in-out infinite; }
@keyframes what-i-knew-then-in { from { opacity: 0; scale: .8; } to { opacity: 1; scale: 1; } }
@keyframes what-i-knew-then-up { from { opacity: 0; translate: 0 30px; } to { opacity: 1; translate: 0 0; } }
@keyframes what-i-knew-then-bob { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-7px) rotate(2deg); } }
@keyframes what-i-knew-then-walk { 0%, 100% { translate: 0 0; rotate: -3deg; } 50% { translate: 0 -5px; rotate: 3deg; } }
.g-what-i-knew-then .gk-bubble { max-width: min(270px, calc(100cqw - var(--sz, 72px) - 44px)); }
@container (min-width: 760px) {
  .g-what-i-knew-then .wk-cap span, .g-what-i-knew-then .wk-cap span.gk-user { font-size: 19px; }
  .g-what-i-knew-then .wk-cap.final span { font-size: 23px; }
  .g-what-i-knew-then .wk-tag span, .g-what-i-knew-then .wk-tag span.gk-user { font-size: 16px; }
  .g-what-i-knew-then .wk-letter { --lh: 29px; --fs: 21px; }
  .g-what-i-knew-then .wk-letter.dense { --lh: 25px; --fs: 18px; }
  .g-what-i-knew-then .gk-bubble { max-width: 250px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const TAU = Math.PI * 2, clamp = K.clamp, lerp = K.lerp, now = () => performance.now();
      const inten = ctx.intensity, visits = K.visits(), raw = String(ctx.text || ''), noWords = !raw.trim();
      const reduced = () => K.reduced(), isBright = () => S.scene() === 'bright';

      /* ---------------- the player's words, only as the reading gives them ---------------- */
      const clip = (s, n) => {
        s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
        if (s.length > n) { const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); s = (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; }
        if ((s.match(/"/g) || []).length % 2) s += '"';
        if ((s.match(/“/g) || []).length > (s.match(/”/g) || []).length) s += '”';
        return s;
      };
      const tidy = (s, n) => { s = clip(String(s || '').replace(/;\s+/g, '. '), n || 150); if (!s) return ''; s = s[0].toUpperCase() + s.slice(1); return /[.!?…"”’)]$/.test(s) ? s : s + '.'; };
      const nWords = (t) => String(t || '').replace(/[^A-Za-z0-9’' ]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      const WD = {};
      function readWords() {
        const ph = K.phone();
        WD.care = an.safety === 'care';
        WD.sup = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
        WD.own = !noWords && OWN.test(raw);
        const ex = (Array.isArray(an.exhibits) ? an.exhibits : []).filter(e => e && e.text && nWords(e.text) >= 3);
        const cams = ex.filter(e => e.kind === 'camera');
        let mom = cams[0] ? cams[0].text : (an.situation || '');
        if (/^something happened/i.test(mom)) mom = '';
        WD.moment = noWords ? '' : tidy(mom, ph ? 84 : 150);
        const hb = ex.filter(e => e.kind === 'brain' && HINDSIGHT.test(e.text)).slice(-1)[0];
        let v = hb ? hb.text : (an.thought || an.conclusion || '');
        if (/^this means something bad\.?$/i.test(v)) v = '';
        WD.verdict = noWords ? '' : tidy(v, ph ? 72 : 110);
        WD.extra = noWords ? [] : cams.slice(1).map(e => tidy(e.text, 72)).filter(t => t && t !== WD.moment && t !== WD.verdict).slice(0, 2);
        const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
        let lead = '';
        if (WD.care) { const l = leads.find(x => /\b(advice|advis\w*|service|doctor|gp|nurse|qualified|lawyer|legal|bank|counsel\w*|support|helpline|professional|tenant\w*)\b/i.test(x.text)); lead = l ? l.text : 'Ask someone qualified exactly where you stand.'; }
        else if (!noWords && WD.sup === 'strong') { for (const k of ['prepare', 'ask', 'steady']) { const l = leads.find(x => x.kind === k); if (l) { lead = l.text; break; } } }
        lead = String(lead || '').replace(/^([A-Z][a-z]+):\s+(?=[“"])/, '$1 ');
        WD.lead = lead ? tidy(lead, 110) : '';
      }
      readWords();
      // in care mode every line takes the warm (never cheeky) voice
      const L = (o) => (WD.care && o.Jolly ? o.Jolly : ctx.line(o)) || '';

      /* ---------------- today: paper stock, greeting, sign-offs (grow with visits, never by chance) ---------------- */
      const dayNo = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
      const STOCK = visits === 0 ? STOCKS[0] : STOCKS[((dayNo % STOCKS.length) + STOCKS.length) % STOCKS.length];
      const TOMORROW = STOCKS[(((dayNo + 1) % STOCKS.length) + STOCKS.length) % STOCKS.length];
      const GREET = GREETINGS[visits % GREETINGS.length];
      const SIGNS = SIGNOFFS.slice(0, visits >= 3 ? 4 : visits >= 1 ? 3 : 2);

      /* ---------------- state ---------------- */
      const G = { phase: 'intro', sx: 0, vel: 0, drag: false, xP: 0, fog: 0, fogT: 0, warm: 0, warmT: 0, clear: 1, mis: 0, req: 0, req0: 0, fogged: [], holding: false, walk: 0, answer: '', sign: '', done: false, lastMark: null, glide: null, arrived: false, lamp: 1 };
      const M = { W: 0, H: 0, phone: true, win: { x: 0, y: 0, w: 1, h: 1 }, strip: { x: 0, y: 0, w: 1, h: 1, n: 5 }, panel: { x: 0, y: 0, w: 1, h: 1 }, s: 1, Lw: 1, xF: 0, xN: 0 };
      const P = K.particles({ max: 320 });
      const TAGS = [];
      const puffs = [], lanterns = [];
      let bird = null;

      /* ---------------- DOM ---------------- */
      el.classList.toggle('wk-bright', isBright());
      const SOFT = softwareGfx();
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1 : 1.5 });
      const dragZone = h('div', { class: 'wk-drag', role: 'slider', tabindex: '0', 'aria-label': 'The memory reel. Drag it to the right to go back in time.', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '100' });
      const rulerZone = h('div', { class: 'wk-ruler', 'aria-hidden': 'true' });
      const markThen = h('div', { class: 'wk-mark', text: 'The moment' }), markNow = h('div', { class: 'wk-mark', text: 'Now' });
      const capK = h('small', { text: '' }), capT = h('span', { text: '' });
      const cap = h('div', { class: 'wk-cap off', role: 'status' }, capK, capT);
      el.append(dragZone, rulerZone, markThen, markNow, cap);
      const still = K.character('still', { side: 'right', mood: 'think', size: 72, x: 0, y: 0, voice: 470 });
      const drop = K.character('drop', { side: 'right', mood: 'sad', size: 64, x: 0, y: 0, voice: 600, shadow: false });
      drop.el.style.transition = 'opacity .45s ease'; drop.el.style.opacity = '0';
      const sayS = (o, mood, ms) => still.say(L(o), { mood, ms: ms == null ? 4200 : ms });
      const sayD = (o, mood, ms) => drop.say(L(o), { mood, moodMs: mood ? 1600 : 0, ms: ms == null ? 2400 : ms });
      const setCap = (k, text, user, cls) => {
        capK.textContent = k; capT.textContent = text; capT.className = user ? 'gk-user' : '';
        cap.className = 'wk-cap' + (cls ? ' ' + cls : ''); placeCap();
      };

      /* ---------------- sound: a felt-piano reel, paper, mist, pen ---------------- */
      const NOTES = ['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6'];
      const CHORDS = [['D3', 'A3', 'F#4', 'E5'], ['B2', 'F#3', 'D4', 'A4'], ['G2', 'D3', 'B3', 'F#4'], ['A2', 'E3', 'C#4', 'G4']];
      let noteI = 7, lastNoteT = 0, rustle = null, drone = null, bedNext = 0, bedI = 0;
      const amb = K.ambience('dawn'); amb.level(0.4, 1.2);
      const beds = () => { if (!A.ctx) return; if (!rustle) rustle = A.loop({ filter: 'bandpass', freq: 3200, q: 0.55, bus: 'sfx' }); if (!drone) drone = A.loop({ pink: true, filter: 'lowpass', freq: 340, q: 0.7, bus: 'amb' }); };
      beds(); S.on('audio-ready', beds);
      S.onDestroy(() => { [rustle, drone].forEach(l => l && l.stop()); });
      const SFX = {
        note(dir, speed) {
          if (!A.ctx) return; const t = now(); if (t - lastNoteT < 60) return; lastNoteT = t;
          noteI = (noteI + dir + NOTES.length) % NOTES.length;
          A.pluck(A.note(NOTES[noteI]), { vol: clamp(0.05 + speed * 0.00009, 0.05, 0.11), damp: 0.992, lp: 2300, verb: 0.3 });
          A.noise({ filter: 'highpass', freq: 5200, dur: 0.012, vol: 0.02 });
        },
        clunk() { if (!A.ctx) return; const t = A.now(); A.thud({ vol: 0.16 }); A.wood(t + 0.02, 0.12, 0.7); ['D4', 'A4', 'D5'].forEach((n, i) => A.pluck(A.note(n), { when: t + 0.05 + i * 0.07, vol: 0.12, damp: 0.995, verb: 0.35 })); },
        land(i) { if (!A.ctx) return; A.paper({ vol: 0.07, freq: 2200 + i * 160 }); A.wood(undefined, 0.05, 1.1 + i * 0.05); },
        fog(n) {
          if (!A.ctx) return; const t = A.now();
          A.noise({ pink: true, filter: 'lowpass', freq: 1100, to: 260, dur: 1.4, attack: 0.3, vol: 0.13 });
          A.whoosh({ vol: 0.06, dur: 0.6, from: 1800, to: 500 });
          A.chime(A.note(['F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6'][Math.min(6, n - 1)]), { when: t + 0.12, vol: 0.06, dur: 2, verb: 0.5 });
        },
        knock() { if (!A.ctx) return; const t = A.now(); A.wood(t, 0.11, 0.85); A.wood(t + 0.11, 0.08, 0.95); A.tone({ when: t + 0.05, type: 'triangle', freq: 392, to: 349, dur: 0.18, vol: 0.04 }); },
        step() { if (!A.ctx) return; A.noise({ filter: 'lowpass', freq: 420, dur: 0.06, vol: 0.05 }); },
        pen(n, dur) { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < n; i++) A.noise({ when: t + (i / n) * dur + Math.random() * 0.03, filter: 'bandpass', freq: 3800 + Math.random() * 2600, q: 1.6, dur: 0.035, vol: 0.016 + Math.random() * 0.01 }); },
        scratch(len) { if (!A.ctx) return; const t = A.now(), n = len > 5 ? 2 : 1; for (let i = 0; i < n; i++) A.noise({ when: t + i * 0.045, filter: 'bandpass', freq: 3600 + Math.random() * 2800, q: 1.5, dur: 0.03 + Math.min(len, 8) * 0.004, vol: 0.014 + Math.random() * 0.01 }); },
        flap() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 900 + Math.random() * 300, q: 1.1, dur: 0.07, vol: 0.05 }); },
        arrive() { if (!A.ctx) return; const t = A.now(); ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => A.chime(A.note(n), { when: t + i * 0.08, vol: 0.07, dur: 2.2 })); A.pad(['D3', 'A3', 'D4', 'F#4', 'A4'].map(n => A.note(n)), { dur: 6, vol: 0.12, attack: 0.8, lp: 1600 }); }
      };
      function stepBed() {
        if (!A.ctx || !G.bed) return; const t = A.now(); if (t < bedNext) return;
        bedNext = t + 4.8; const ch = CHORDS[bedI++ % CHORDS.length];
        A.pad(ch.map(n => A.note(n)), { dur: 5.8, vol: 0.045 * (G.warm > 0.2 ? 1.6 : 1), attack: 1.5, lp: 1100 });
      }

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        const frac = M.Lw > 1 ? G.sx / M.Lw : null, fracP = M.Lw > 1 ? G.xP / M.Lw : null;
        M.W = W; M.H = H; M.phone = W < 760;
        if (M.phone) {
          // the reel box takes the top; the film strip runs under it; the controls take that same band when they're
          // needed (the strip steps aside); Still keeps the bottom-left corner
          const stillTop = H - 16 - 66, wh = Math.round(clamp(H * 0.56, 290, 500));
          M.win = { x: 18, y: 76, w: W - 36, h: wh };
          const boxB = M.win.y + wh + 30, sw = W - 44, n = 5;
          M.strip = { x: 22, y: boxB + 14, w: sw, h: Math.round(clamp(sw / n * 0.62 + 24, 58, 84)), n };
          M.panel = { x: 12, y: boxB + 12, w: W - 24, h: Math.max(110, stillTop - 10 - (boxB + 12)) };
          M.stillTop = stillTop;
        } else {
          const pw = 360, gap = 34, ww = Math.round(Math.min(860, W - pw - gap - 80)), x0 = Math.round((W - (ww + gap + pw)) / 2);
          const wh = Math.round(Math.min(H - 84 - 34 - 150, ww * 0.64));
          M.win = { x: x0, y: 84, w: ww, h: wh };
          const boxB = 84 + wh + 34, sw = ww - 24, n = 8;
          M.strip = { x: x0 + 12, y: boxB + 16, w: sw, h: Math.round(clamp(sw / n * 0.62 + 30, 70, 104)), n };
          M.panel = { x: x0 + ww + gap, y: 84, w: pw, h: H - 84 - 16 };
        }
        M.s = M.win.h / 420;
        M.Lw = M.win.w * 3.2; M.xF = M.win.w * 0.75; M.xN = M.Lw - M.win.w * 0.5; M.off = M.win.w * 0.23; M.xT = M.xF + M.off;
        G.sx = frac != null ? frac * M.Lw : M.xN + M.off;
        G.xP = fracP != null ? fracP * M.Lw : M.xF;
        const w = M.win;
        Object.assign(dragZone.style, { left: w.x + 'px', top: w.y + 'px', width: w.w + 'px', height: w.h + 'px' });
        const st0 = M.strip;
        Object.assign(rulerZone.style, { left: (st0.x - 8) + 'px', top: (st0.y - 12) + 'px', width: (st0.w + 16) + 'px', height: (st0.h + 24) + 'px' });
        markThen.style.left = stripX(M.xF) + 'px'; markThen.style.top = (st0.y + st0.h + 8) + 'px';
        markNow.style.left = stripX(M.xN) + 'px'; markNow.style.top = (st0.y + st0.h + 8) + 'px';
        const ss = M.phone ? 66 : 92; still.el.style.setProperty('--sz', ss + 'px');
        if (M.phone) still.place(12, M.stillTop); else still.place(M.panel.x, M.panel.y);
        const ds = Math.round((M.phone ? 66 : 86) * clamp(M.s, 0.85, 1.15)); drop.el.style.setProperty('--sz', ds + 'px'); M.ds = ds;
        placeCap(); relayoutTags(); placeControls();
        artKey = '';
      }
      const stripX = (x) => M.strip.x + clamp(x / M.Lw, 0, 1) * M.strip.w;
      const focus = () => G.sx - M.off; // the world point under past-you's spot (27% across the window)
      function placeCap() { const w = M.win, mw = Math.min(w.w - 28, M.phone ? 340 : 560); cap.style.maxWidth = mw + 'px'; cap.style.left = (w.x + w.w / 2) + 'px'; cap.style.top = (w.y + 16) + 'px'; }

      /* ---------------- the paper world: a few layers cut and backlit ---------------- */
      let artKey = '';
      const ART = {};
      function mkc(w, hh, dmax) { const c = document.createElement('canvas'), d = Math.min(dmax || 1.5, cv.dpr || 1); c.width = Math.max(2, Math.ceil(w * d)); c.height = Math.max(2, Math.ceil(hh * d)); const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { c, g, w, h: hh, d }; }
      function gy(x) {
        const w = M.win.w, hh = M.win.h, s = M.s;
        let y = hh * 0.8 + Math.sin(x * 0.006 / s) * 6 * s + Math.sin(x * 0.017 / s + 1.3) * 3 * s;
        const dn = (x - M.xN) / (w * 0.5); y -= hh * 0.13 * Math.exp(-dn * dn * 2.2);
        const ds = (x - M.win.w * 1.4) / (w * 0.09); y += hh * 0.035 * Math.exp(-ds * ds);
        return y;
      }
      function buildArt() {
        const key = M.W + 'x' + M.H + ':' + (cv.dpr || 1) + ':' + (isBright() ? 'b' : 'd');
        artKey = key;
        buildRoom(); buildSky(); buildFar(); buildMid(); buildNear(); buildGrain(); buildStrip();
      }
      /* The film strip: the whole memory as frames, each a crop of the paper world where the camera would have been. */
      function buildStrip() {
        const sp = M.strip, n = sp.n, R = mkc(sp.w, sp.h, 2), g = R.g, w = M.win.w, wh = M.win.h, cw = sp.w / n, sb = Math.round(sp.h * 0.17), span = M.Lw / n;
        rr(g, 0, 0, sp.w, sp.h, 6); g.fillStyle = '#1d130b'; g.fill();
        g.fillStyle = 'rgba(255,236,200,0.07)'; g.fillRect(4, 1, sp.w - 8, 1.5);
        const hw = Math.max(4, sb * 0.56), hh = Math.max(3, sb * 0.42), step = Math.max(9, sb * 1.3);
        g.fillStyle = 'rgba(236,222,192,0.82)';
        for (let x = 7; x < sp.w - 9; x += step) { rr(g, x, (sb - hh) / 2, hw, hh, 1.3); g.fill(); rr(g, x, sp.h - sb + (sb - hh) / 2, hw, hh, 1.3); g.fill(); }
        const blit = (L, sx, sy, sw, sh, dx, dy, dw, dh) => {
          const d = L.d; let x0 = sx, x1 = sx + sw; const k = dw / sw;
          if (x0 < 0) { dx -= x0 * k; dw += x0 * k; x0 = 0; } if (x1 > L.w) { dw -= (x1 - L.w) * k; x1 = L.w; }
          if (x1 - x0 > 0.5 && dw > 0.5) g.drawImage(L.c, x0 * d, sy * d, (x1 - x0) * d, sh * d, dx, dy, dw, dh);
        };
        for (let j = 0; j < n; j++) {
          const fx = j * cw + 3, fy = sb, fw = cw - 6, fh = sp.h - 2 * sb, cx = (j + 0.5) * span;
          const band = Math.min(wh, span * fh / fw), sy0 = clamp(wh * 0.94 - band, 0, wh - band);
          g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip();
          blit(ART.sky, w / 2 - span / 2, sy0, span, band, fx, fy, fw, fh);
          [[ART.far, 0.35], [ART.mid, 0.65], [ART.near, 1]].forEach(([L, p]) => { const ox = clamp((cx - w / 2) * p, 0, Math.max(0, L.w - w)); blit(L, ox + w / 2 - span / 2, sy0, span, band, fx, fy, fw, fh); });
          // a touch of age: warm vignette inside each frame
          g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(150,110,70,0.18)'; g.fillRect(fx, fy, fw, fh); g.globalCompositeOperation = 'source-over';
          g.restore();
          g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1; g.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1);
        }
        ART.strip = R; ART.stripSB = sb;
      }
      function buildRoom() {
        const W = M.W, H = M.H, br = isBright(), R = mkc(W, H), g = R.g, w = M.win;
        let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, br ? '#f4e9d6' : '#1c1520'); gr.addColorStop(1, br ? '#e5d2b4' : '#0d0a11');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        // faint wallpaper damask
        g.globalAlpha = br ? 0.07 : 0.05; g.fillStyle = br ? '#8a6a44' : '#e8d2b0';
        for (let y = 20, row = 0; y < H; y += 46, row++) for (let x = row % 2 ? 23 : 0; x < W; x += 46) { g.beginPath(); g.moveTo(x, y - 7); g.quadraticCurveTo(x + 6, y, x, y + 7); g.quadraticCurveTo(x - 6, y, x, y - 7); g.fill(); }
        g.globalAlpha = 1;
        // the table the reel box stands on
        const ty = w.y + w.h + 30;
        gr = g.createLinearGradient(0, ty, 0, H); gr.addColorStop(0, br ? '#b98b5c' : '#2e1d14'); gr.addColorStop(1, br ? '#8c6038' : '#160d08');
        g.fillStyle = gr; g.fillRect(0, ty, W, H - ty);
        g.fillStyle = br ? 'rgba(255,240,220,.45)' : 'rgba(255,220,170,.08)'; g.fillRect(0, ty, W, 2);
        g.strokeStyle = br ? 'rgba(90,55,25,.12)' : 'rgba(255,220,170,.04)'; g.lineWidth = 1.2;
        for (let i = 0; i < 9; i++) { const yy = ty + 14 + i * (H - ty) / 9; g.beginPath(); g.moveTo(0, yy); for (let x = 0; x <= W; x += 40) g.lineTo(x, yy + Math.sin(x * 0.02 + i) * 2); g.stroke(); }
        // the lamp's pool of light on the wall around the box
        g.save(); g.globalCompositeOperation = br ? 'source-over' : 'lighter'; g.globalAlpha = br ? 0.5 : 0.22;
        g.drawImage(K.glowSprite(br ? '#fff6e2' : '#ffb870'), w.x - w.w * 0.3, w.y - w.h * 0.45, w.w * 1.6, w.h * 1.9); g.restore();
        // the box
        const ft = M.phone ? 13 : 16, fb = M.phone ? 30 : 34, X = w.x - ft, Y = w.y - ft, BW = w.w + ft * 2, BH = w.h + ft + fb;
        g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 34; g.shadowOffsetY = 14; rr(g, X, Y, BW, BH, 12); g.fillStyle = '#3b2415'; g.fill(); g.restore();
        gr = g.createLinearGradient(0, Y, 0, Y + BH); gr.addColorStop(0, '#6e4729'); gr.addColorStop(0.55, '#51321c'); gr.addColorStop(1, '#3a2213');
        rr(g, X, Y, BW, BH, 12); g.fillStyle = gr; g.fill();
        g.save(); rr(g, X, Y, BW, BH, 12); g.clip(); g.strokeStyle = 'rgba(255,214,160,.07)'; g.lineWidth = 1.4;
        const Rn = K.rng(41); for (let i = 0; i < 26; i++) { const yy = Y + Rn() * BH, a = 2 + Rn() * 4; g.beginPath(); g.moveTo(X, yy); for (let x = X; x <= X + BW; x += 18) g.lineTo(x, yy + Math.sin((x - X) * 0.012 + i) * a); g.stroke(); }
        g.restore();
        g.strokeStyle = 'rgba(255,225,180,.25)'; g.lineWidth = 1; rr(g, X + 0.5, Y + 0.5, BW - 1, BH - 1, 12); g.stroke();
        g.fillStyle = '#1e1109'; g.fillRect(w.x - 4, w.y - 4, w.w + 8, w.h + 8);
        g.strokeStyle = STOCK.trim; g.lineWidth = 1.6; g.strokeRect(w.x - 7.5, w.y - 7.5, w.w + 15, w.h + 15);
        [[X + 8, Y + 8], [X + BW - 8, Y + 8], [X + 8, Y + BH - 8], [X + BW - 8, Y + BH - 8]].forEach(([cx, cy]) => { const rg = g.createRadialGradient(cx - 1, cy - 1, 0.5, cx, cy, 4); rg.addColorStop(0, '#fff2c8'); rg.addColorStop(1, '#9a7330'); g.fillStyle = rg; g.beginPath(); g.arc(cx, cy, 3.6, 0, TAU); g.fill(); });
        // brass plaque
        const pw = Math.min(230, w.w * 0.6), px = w.x + w.w / 2 - pw / 2, py = w.y + w.h + (M.phone ? 7 : 8), phh = M.phone ? 18 : 20;
        gr = g.createLinearGradient(0, py, 0, py + phh); gr.addColorStop(0, '#f6dc96'); gr.addColorStop(0.5, '#d4a750'); gr.addColorStop(1, '#a87a2a');
        rr(g, px, py, pw, phh, 3); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(70,40,10,.55)'; g.lineWidth = 1; g.stroke();
        g.fillStyle = '#3a2408'; g.font = '400 ' + (M.phone ? 12 : 13) + 'px "Young Serif", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        try { g.letterSpacing = '2px'; } catch (e) { /* older canvas */ }
        g.fillText('WHAT I KNEW THEN', w.x + w.w / 2, py + phh / 2 + 1);
        try { g.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
        // the reel collection: on a phone, one spool per paper stock either side of the plaque (collected in colour, the
        // rest waiting); on a wide screen, a row of film tins on the table beside the box
        const got = K.collection().filter(x => x.indexOf('reel:') === 0).map(x => x.slice(5));
        if (!M.phone) drawTins(g, br, got);
        const sr = M.phone ? 7.5 : 9, cyS = py + phh / 2, slotsL = [0, 1, 2].map(i => px - 18 - i * (sr * 2 + 8)), slotsR = [0, 1].map(i => px + pw + 18 + i * (sr * 2 + 8));
        if (M.phone) STOCKS.forEach((s0, i) => {
          const cx = i < 3 ? slotsL[i] : slotsR[i - 3], have = got.includes(s0.key) || s0.key === STOCK.key;
          if (cx - sr < X + 6 || cx + sr > X + BW - 6) return;
          if (s0.key === STOCK.key) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(K.glowSprite('#ffd77a'), cx - sr * 2.6, cyS - sr * 2.6, sr * 5.2, sr * 5.2); g.restore(); }
          g.globalAlpha = have ? 1 : 0.35;
          g.fillStyle = have ? s0.near : '#2a1a0e'; g.beginPath(); g.arc(cx, cyS, sr, 0, TAU); g.fill();
          g.fillStyle = have ? s0.sky[1] : 'rgba(240,215,170,.25)'; g.beginPath(); g.arc(cx, cyS, sr * 0.55, 0, TAU); g.fill();
          g.strokeStyle = have ? '#e7c47a' : 'rgba(240,215,170,.4)'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cyS, sr, 0, TAU); g.stroke();
          g.fillStyle = '#2a1a0e'; g.beginPath(); g.arc(cx, cyS, sr * 0.18, 0, TAU); g.fill();
          g.globalAlpha = 1;
        });
        ART.room = R;
      }
      function drawTins(g, br, got) {
        const P0 = M.panel, sp = M.strip, n = STOCKS.length, slot = (P0.w - 16) / n, r = Math.min(27, slot / 2 - 6), cy = sp.y + sp.h * 0.42;
        const have = (s0) => got.includes(s0.key) || s0.key === STOCK.key, count = STOCKS.filter(have).length;
        g.font = '700 12px ' + (K.token('--font-ui') || 'system-ui, sans-serif'); g.textBaseline = 'middle'; g.textAlign = 'left';
        try { g.letterSpacing = '1.6px'; } catch (e) { /* older canvas */ }
        g.fillStyle = br ? '#4a2a0e' : '#e9d8b8'; g.fillText('YOUR REELS · ' + count + ' OF ' + n, P0.x + 8, sp.y - 16);
        try { g.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
        STOCKS.forEach((s0, i) => {
          const cx = P0.x + 8 + slot * (i + 0.5), ok = have(s0), today = s0.key === STOCK.key;
          g.fillStyle = 'rgba(0,0,0,' + (br ? 0.22 : 0.4) + ')'; g.beginPath(); g.ellipse(cx, cy + r + 4, r * 0.95, 5, 0, 0, TAU); g.fill();
          if (today) { g.save(); g.globalCompositeOperation = br ? 'source-over' : 'lighter'; g.globalAlpha = br ? 0.5 : 0.55; g.drawImage(K.glowSprite('#ffd77a'), cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4); g.restore(); }
          let rg2 = g.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.2, cx, cy, r);
          rg2.addColorStop(0, ok ? '#f6e3b0' : (br ? '#cdb898' : '#4a3a2a')); rg2.addColorStop(1, ok ? '#8a6630' : (br ? '#9c8463' : '#2a1e14'));
          g.fillStyle = rg2; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
          const ri = r * 0.78;
          g.save(); g.beginPath(); g.arc(cx, cy, ri, 0, TAU); g.clip();
          if (ok) { // a tiny paper landscape in that stock
            const sg = g.createLinearGradient(0, cy - ri, 0, cy + ri); sg.addColorStop(0, s0.sky[0]); sg.addColorStop(1, s0.sky[1]); g.fillStyle = sg; g.fillRect(cx - ri, cy - ri, ri * 2, ri * 2);
            g.fillStyle = s0.far; g.beginPath(); g.ellipse(cx - ri * 0.3, cy + ri * 0.35, ri * 0.9, ri * 0.45, 0, 0, TAU); g.fill();
            g.fillStyle = s0.mid; g.beginPath(); g.ellipse(cx + ri * 0.45, cy + ri * 0.55, ri * 0.85, ri * 0.42, 0, 0, TAU); g.fill();
            g.fillStyle = s0.near; g.fillRect(cx - ri, cy + ri * 0.62, ri * 2, ri);
            g.fillStyle = mixHex(s0.glow, '#ffffff', 0.3); g.beginPath(); g.arc(cx + ri * 0.35, cy - ri * 0.35, ri * 0.2, 0, TAU); g.fill();
          } else { g.fillStyle = br ? '#7c6448' : '#1a120b'; g.fillRect(cx - ri, cy - ri, ri * 2, ri * 2); }
          g.restore();
          g.strokeStyle = ok ? 'rgba(70,40,10,0.55)' : 'rgba(240,215,170,0.25)'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, ri, 0, TAU); g.stroke();
          g.fillStyle = ok ? '#3a2408' : 'rgba(240,215,170,0.4)'; g.beginPath(); g.arc(cx, cy, r * 0.13, 0, TAU); g.fill();
          if (!ok) { g.fillStyle = br ? 'rgba(255,245,225,0.75)' : 'rgba(240,215,170,0.55)'; g.font = '700 14px ' + (K.token('--font-ui') || 'system-ui, sans-serif'); g.textAlign = 'center'; g.fillText('?', cx, cy - r * 0.42); }
          g.font = '600 12px ' + (K.token('--font-ui') || 'system-ui, sans-serif'); g.textAlign = 'center';
          g.fillStyle = br ? (ok ? '#3a2208' : 'rgba(58,34,8,0.5)') : (ok ? '#f3e2c2' : 'rgba(243,226,194,0.42)');
          g.fillText(s0.short, cx, cy + r + 17);
        });
      }
      function buildSky() {
        const w = M.win.w, hh = M.win.h, s = M.s, R = mkc(w, hh), g = R.g;
        const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, STOCK.sky[0]); gr.addColorStop(0.72, STOCK.sky[1]); gr.addColorStop(1, mixHex(STOCK.sky[1], STOCK.near, 0.25));
        g.fillStyle = gr; g.fillRect(0, 0, w, hh);
        g.globalAlpha = 0.8; g.drawImage(K.glowSprite(STOCK.glow), w * 0.5 - w * 0.75, hh * 0.4 - w * 0.75, w * 1.5, w * 1.5); g.globalAlpha = 1;
        // a paper sun (or moon) cut from lighter stock
        g.fillStyle = mixHex(STOCK.glow, '#ffffff', 0.35); g.globalAlpha = 0.85; g.beginPath(); g.arc(w * 0.74, hh * 0.24, 24 * s, 0, TAU); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = rgba(STOCK.glow, 0.5); g.lineWidth = 1.2; g.beginPath(); g.arc(w * 0.74, hh * 0.24, 30 * s, 0, TAU); g.stroke();
        ART.sky = R;
      }
      function ridge(g, Sw, base, amp, seed, col, edge) {
        g.beginPath(); g.moveTo(0, M.win.h + 2);
        const pts = [];
        for (let x = 0; x <= Sw + 6; x += 6) { const y = base + amp * (0.55 * Math.sin(x * 0.0042 + seed) + 0.3 * Math.sin(x * 0.011 + seed * 2.1) + 0.15 * Math.sin(x * 0.029 + seed * 3.7)); pts.push(x, y); g.lineTo(x, y); }
        g.lineTo(Sw + 6, M.win.h + 2); g.closePath(); g.fillStyle = col; g.fill();
        if (edge) { g.strokeStyle = edge; g.lineWidth = 1.6; g.beginPath(); for (let i = 0; i < pts.length; i += 2) { if (i) g.lineTo(pts[i], pts[i + 1]); else g.moveTo(pts[i], pts[i + 1]); } g.stroke(); }
        return pts;
      }
      function layerW(p) { return Math.ceil((M.xN + M.off + 60 * M.s - M.win.w / 2) * p + M.win.w + 24); }
      function buildFar() {
        const hh = M.win.h, s = M.s, Sw = layerW(0.35), R = mkc(Sw, hh, 1.25), g = R.g, edge = rgba(STOCK.glow, 0.5);
        ridge(g, Sw, hh * 0.47, hh * 0.1, 1.3, mixHex(STOCK.far, STOCK.sky[1], 0.45), edge);
        ridge(g, Sw, hh * 0.55, hh * 0.08, 4.1, STOCK.far, edge);
        g.strokeStyle = rgba(STOCK.near, 0.42); g.lineWidth = 1.6 * s; g.lineCap = 'round';
        const Rn = K.rng(23); for (let i = 0; i < Sw / 160; i++) { const x = Rn() * Sw, y = hh * (0.12 + Rn() * 0.2), k = (5 + Rn() * 4) * s; g.beginPath(); g.moveTo(x - k, y - k * 0.5); g.quadraticCurveTo(x - k * 0.4, y - k * 0.7, x, y); g.quadraticCurveTo(x + k * 0.4, y - k * 0.7, x + k, y - k * 0.5); g.stroke(); }
        ART.far = R;
      }
      function pine(g, x, y, hh, col) { g.fillStyle = col; g.fillRect(x - hh * 0.04, y - hh * 0.2, hh * 0.08, hh * 0.22); for (let i = 0; i < 3; i++) { const yy = y - hh * 0.18 - i * hh * 0.24, ww = hh * (0.34 - i * 0.08); g.beginPath(); g.moveTo(x - ww, yy); g.lineTo(x, yy - hh * 0.42); g.lineTo(x + ww, yy); g.closePath(); g.fill(); } }
      function buildMid() {
        const hh = M.win.h, s = M.s, Sw = layerW(0.65), R = mkc(Sw, hh, 1.25), g = R.g, edge = rgba(STOCK.glow, 0.42);
        const pts = ridge(g, Sw, hh * 0.67, hh * 0.05, 2.7, STOCK.mid, edge);
        const yAt = (x) => { const i = Math.max(0, Math.min(pts.length / 2 - 1, Math.round(x / 6))); return pts[i * 2 + 1]; };
        const Rn = K.rng(31), dark = mixHex(STOCK.mid, STOCK.near, 0.28);
        for (let x = 20; x < Sw; x += (26 + Rn() * 70) * s) { const n = 1 + Math.floor(Rn() * 3); for (let j = 0; j < n; j++) { const xx = x + j * 13 * s, hgt = (24 + Rn() * 24) * s; pine(g, xx, yAt(xx) + 2, hgt, Rn() < 0.4 ? dark : STOCK.mid); } }
        for (let i = 0; i < 4; i++) {
          const x = Sw * (0.12 + i * 0.24) + Rn() * 30, y = yAt(x) + 3, bw = 26 * s, bh = 18 * s;
          g.fillStyle = dark; g.fillRect(x, y - bh, bw, bh); g.beginPath(); g.moveTo(x - 3 * s, y - bh); g.lineTo(x + bw / 2, y - bh - 13 * s); g.lineTo(x + bw + 3 * s, y - bh); g.closePath(); g.fill();
          g.fillStyle = STOCK.glow; g.fillRect(x + bw * 0.58, y - bh * 0.72, 6 * s, 6 * s);
        }
        ART.mid = R;
      }
      function buildNear() {
        const w = M.win.w, hh = M.win.h, s = M.s, Sw = Math.ceil(M.xN + M.off + 60 * s + w / 2 + 8), R = mkc(Sw, hh, 1.5), g = R.g, col = STOCK.near, edge = rgba(STOCK.glow, 0.55);
        g.beginPath(); g.moveTo(0, hh + 2); for (let x = 0; x <= Sw; x += 5) g.lineTo(x, gy(x)); g.lineTo(Sw, hh + 2); g.closePath(); g.fillStyle = col; g.fill();
        g.strokeStyle = edge; g.lineWidth = 1.8; g.beginPath(); for (let x = 0; x <= Sw; x += 5) { if (x) g.lineTo(x, gy(x)); else g.moveTo(x, gy(x)); } g.stroke();
        // the stream (a dip of lighter paper) and its little bridge
        const xs = w * 1.4;
        g.fillStyle = mixHex(STOCK.sky[1], '#ffffff', 0.25); g.globalAlpha = 0.9; g.beginPath(); g.ellipse(xs, gy(xs) + 18 * s, 40 * s, 7 * s, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = col; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(xs - 48 * s, gy(xs - 48 * s) + 2); g.quadraticCurveTo(xs, gy(xs) - 26 * s, xs + 48 * s, gy(xs + 48 * s) + 2); g.stroke();
        g.lineWidth = 1.6 * s; for (let i = -3; i <= 3; i++) { const x = xs + i * 12 * s, yTop = gy(xs) - 26 * s * (1 - (i * i) / 12) + 4 * s; g.beginPath(); g.moveTo(x, yTop); g.lineTo(x, yTop + 12 * s); g.stroke(); }
        // the path, a lighter ribbon worn into the ground, and the branch not taken at the moment
        g.strokeStyle = STOCK.path; g.lineCap = 'round'; g.lineWidth = 7 * s; g.globalAlpha = 0.92;
        g.beginPath(); for (let x = w * 0.16; x <= Sw - 8; x += 6) { const y = gy(x) + 11 * s + Math.sin(x * 0.01) * 2 * s; if (x <= w * 0.16) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
        const fx = M.xF, fy = gy(fx) + 11 * s;
        for (let i = 0; i < 18; i++) { const k0 = i / 18, k1 = (i + 1) / 18; g.globalAlpha = 0.85 * (1 - k0); g.lineWidth = (6 - 4.5 * k0) * s; g.beginPath(); const p = (k) => [fx + k * w * 0.42, fy - Math.sin(k * Math.PI * 0.55) * hh * 0.17]; const a = p(k0), b = p(k1); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
        g.globalAlpha = 1;
        // the cottage it started from
        const cx = w * 0.24, cy = gy(cx) + 2, bw = 52 * s, bh = 36 * s;
        g.fillStyle = col; g.fillRect(cx, cy - bh, bw, bh + 6); g.beginPath(); g.moveTo(cx - 6 * s, cy - bh); g.lineTo(cx + bw / 2, cy - bh - 26 * s); g.lineTo(cx + bw + 6 * s, cy - bh); g.closePath(); g.fill(); g.fillRect(cx + bw * 0.7, cy - bh - 22 * s, 7 * s, 14 * s);
        g.fillStyle = STOCK.glow; g.fillRect(cx + 9 * s, cy - bh + 9 * s, 11 * s, 10 * s); g.fillRect(cx + 32 * s, cy - bh + 9 * s, 11 * s, 10 * s);
        g.strokeStyle = rgba(STOCK.near, 0.5); g.lineWidth = 2 * s; g.beginPath(); g.moveTo(cx + bw * 0.74, cy - bh - 24 * s); g.bezierCurveTo(cx + bw * 0.6, cy - bh - 40 * s, cx + bw * 0.95, cy - bh - 46 * s, cx + bw * 0.8, cy - bh - 62 * s); g.stroke();
        // the signpost at the moment
        const sx0 = fx + 46 * s, sy0 = gy(sx0) + 4;
        g.fillStyle = col; g.fillRect(sx0 - 2.5 * s, sy0 - 70 * s, 5 * s, 70 * s);
        const arm = (y, dir, ang) => { g.save(); g.translate(sx0, y); g.rotate(ang); g.beginPath(); g.moveTo(0, -7 * s); g.lineTo(dir * 34 * s, -7 * s); g.lineTo(dir * 42 * s, 0); g.lineTo(dir * 34 * s, 7 * s); g.lineTo(0, 7 * s); g.closePath(); g.fill(); g.restore(); };
        arm(sy0 - 60 * s, 1, -0.32); arm(sy0 - 42 * s, 1, 0.06);
        g.fillStyle = STOCK.glow; g.font = '400 ' + Math.round(11 * s) + 'px "Young Serif", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.save(); g.translate(sx0, sy0 - 60 * s); g.rotate(-0.32); g.fillText('?', 20 * s, 1); g.restore();
        g.save(); g.translate(sx0, sy0 - 42 * s); g.rotate(0.06); g.fillText('?', 20 * s, 1); g.restore();
        // a lone tree, a gate, the hill of now with its bench and lamp
        const tx = w * 1.92, ty = gy(tx) + 2; g.fillStyle = col; g.fillRect(tx - 4 * s, ty - 46 * s, 8 * s, 48 * s);
        [[0, -66, 30], [-22, -54, 20], [22, -54, 21], [-12, -80, 18], [13, -82, 17]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(tx + dx * s, ty + dy * s, r * s, 0, TAU); g.fill(); });
        const gx0 = w * 2.28; for (let i = 0; i < 6; i++) { const x = gx0 + i * 15 * s; g.fillRect(x - 2 * s, gy(x) - 22 * s, 4 * s, 24 * s); } g.fillRect(gx0, gy(gx0 + 38 * s) - 18 * s, 76 * s, 3 * s); g.fillRect(gx0, gy(gx0 + 38 * s) - 10 * s, 76 * s, 3 * s);
        const nx = M.xN, ny = gy(nx) + 2;
        g.fillRect(nx + 30 * s, ny - 64 * s, 4 * s, 66 * s); g.beginPath(); g.moveTo(nx + 24 * s, ny - 64 * s); g.lineTo(nx + 40 * s, ny - 64 * s); g.lineTo(nx + 36 * s, ny - 76 * s); g.lineTo(nx + 28 * s, ny - 76 * s); g.closePath(); g.fill();
        g.fillStyle = STOCK.glow; g.fillRect(nx + 29 * s, ny - 74 * s, 6 * s, 9 * s); g.fillStyle = col;
        { const fx0 = nx - 58 * s, fy0 = gy(fx0) + 2; g.beginPath(); g.arc(fx0, fy0 - 40 * s, 6.5 * s, 0, TAU); g.fill(); g.beginPath(); g.moveTo(fx0 - 7 * s, fy0 - 31 * s); g.quadraticCurveTo(fx0, fy0 - 36 * s, fx0 + 7 * s, fy0 - 31 * s); g.lineTo(fx0 + 6 * s, fy0 - 12 * s); g.lineTo(fx0 - 6 * s, fy0 - 12 * s); g.closePath(); g.fill(); g.fillRect(fx0 - 4.5 * s, fy0 - 13 * s, 3.4 * s, 13 * s); g.fillRect(fx0 + 1.2 * s, fy0 - 13 * s, 3.4 * s, 13 * s); g.beginPath(); g.moveTo(fx0 - 5 * s, fy0 - 29 * s); g.lineTo(fx0 - 15 * s, fy0 - 22 * s); g.lineTo(fx0 - 13 * s, fy0 - 20 * s); g.lineTo(fx0 - 4 * s, fy0 - 25 * s); g.closePath(); g.fill(); }
        g.fillRect(nx - 40 * s, ny - 14 * s, 44 * s, 4 * s); g.fillRect(nx - 40 * s, ny - 24 * s, 44 * s, 3 * s); g.fillRect(nx - 37 * s, ny - 14 * s, 3 * s, 14 * s); g.fillRect(nx + 0 * s, ny - 14 * s, 3 * s, 14 * s);
        // grass tufts and stones along the ground
        const Rn = K.rng(53);
        for (let x = 6; x < Sw; x += (9 + Rn() * 30) * s) { const y = gy(x) + 1, k = (4 + Rn() * 7) * s; g.beginPath(); g.moveTo(x - 3 * s, y); g.lineTo(x - 1 * s, y - k); g.lineTo(x + 0.5 * s, y - 1); g.lineTo(x + 2 * s, y - k * 0.8); g.lineTo(x + 3.5 * s, y); g.closePath(); g.fill(); }
        ART.near = R;
      }
      function buildGrain() {
        const R = mkc(140, 140, 1), g = R.g, Rn = K.rng(9);
        for (let i = 0; i < 1600; i++) { g.fillStyle = Rn() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'; g.fillRect(Rn() * 140, Rn() * 140, 1, 1); }
        g.strokeStyle = 'rgba(120,90,50,0.4)'; g.lineWidth = 0.6; for (let i = 0; i < 26; i++) { const x = Rn() * 140, y = Rn() * 140, a = Rn() * TAU, l = 6 + Rn() * 14; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
        ART.grain = R; ART.grainPat = null;
      }
      let shadowC = null;
      function shadowSprite() {
        if (shadowC) return shadowC;
        shadowC = document.createElement('canvas'); shadowC.width = shadowC.height = 64;
        const sg = shadowC.getContext('2d'), rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
        rg.addColorStop(0, 'rgba(20,10,4,1)'); rg.addColorStop(1, 'rgba(20,10,4,0)'); sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64);
        return shadowC;
      }
      const fogCv = document.createElement('canvas'); let fogG = null, holeC = null;
      // the clearing in the fog round past-you: one soft radial cut, rendered once and reused every frame
      function holeSprite() {
        if (holeC) return holeC;
        holeC = document.createElement('canvas'); holeC.width = holeC.height = 128;
        const hg = holeC.getContext('2d'), rg = hg.createRadialGradient(64, 64, 16, 64, 64, 64);
        rg.addColorStop(0, 'rgba(0,0,0,0.92)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); hg.fillStyle = rg; hg.fillRect(0, 0, 128, 128);
        return holeC;
      }
      const MIST = []; { const Rn = K.rng(77); for (let i = 0; i < 18; i++) MIST.push({ x: Rn(), y: 0.2 + Rn() * 0.85, r: 0.22 + Rn() * 0.26, v: 0.006 + Rn() * 0.014, a: 0.55 + Rn() * 0.45, ph: Rn() * TAU }); }

      /* ---------------- frame ---------------- */
      K.loop((dt0, t) => {
        const g = cv.g; if (!g || !M.W) return;
        if (SOFT) { const tq = now(); if (tq - (G.lastDraw || 0) < 30) return; G.lastDraw = tq; } // CPU-only: every other frame
        const key = M.W + 'x' + M.H + ':' + (cv.dpr || 1) + ':' + (isBright() ? 'b' : 'd');
        if (artKey !== key) buildArt();
        const tn = now(), dt = clamp((tn - (G.lastT || tn)) / 1000, 0, 0.1); G.lastT = tn;
        stepScroll(dt);
        G.fog += (G.fogT - G.fog) * Math.min(1, dt * 1.4);
        G.warm += (G.warmT - G.warm) * Math.min(1, dt * 0.9);
        G.clear += ((G.phase === 'play' || G.phase === 'judge' || G.phase === 'letter' || G.phase === 'sign' || G.phase === 'send' ? 0.62 : 1) - G.clear) * Math.min(1, dt * 1.2);
        stepBed();
        const { x, y, w, h: wh } = M.win, d = cv.dpr || 1;
        g.setTransform(d, 0, 0, d, 0, 0);
        g.drawImage(ART.room.c, 0, 0, M.W, M.H);
        if (G.warm > 0.01) { g.save(); g.globalCompositeOperation = isBright() ? 'source-over' : 'lighter'; g.globalAlpha = G.warm * (isBright() ? 0.35 : 0.3); g.drawImage(K.glowSprite('#ffc867'), x - w * 0.35, y - wh * 0.5, w * 1.7, wh * 2); g.restore(); }
        g.save(); g.beginPath(); g.rect(x, y, w, wh); g.clip();
        g.drawImage(ART.sky.c, x, y, w, wh);
        // the lamp behind the paper breathes (and warms to gold at the end)
        const lampA = 0.16 + 0.05 * Math.sin(t * 1.3) + G.warm * 0.45;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = lampA; g.drawImage(K.glowSprite(G.warm > 0.5 ? '#ffd890' : STOCK.glow), x + w * 0.1, y - wh * 0.25, w * 0.8, wh * 1.1); g.restore();
        layer(g, ART.far, 0.35); layer(g, ART.mid, 0.65);
        layer(g, ART.near, 1);
        // past-you's little light on the ground
        const px = x + (G.xP - G.sx) + w / 2, py = y + gy(G.xP);
        if (G.arrived) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.28 + 0.06 * Math.sin(t * 2.2) + G.warm * 0.3; g.drawImage(K.glowSprite('#ffd27a'), px - 70 * M.s, py - 90 * M.s, 140 * M.s, 140 * M.s); g.restore(); }
        if (G.warm > 0.05) drawWarmth(g, t, dt, px, py);
        drawFog(g, t, dt, px - x, py - y - 30 * M.s);
        drawLanterns(g, dt, t);
        if (!ART.grainPat) ART.grainPat = g.createPattern(ART.grain.c, 'repeat');
        g.globalAlpha = 0.06; g.fillStyle = ART.grainPat; g.fillRect(x, y, w, wh); g.globalAlpha = 1;
        // vignette at the paper's edges, where it winds round the spools
        g.fillStyle = 'rgba(30,15,5,0.22)'; g.fillRect(x, y, 3, wh); g.fillRect(x + w - 3, y, 3, wh);
        g.restore();
        drawSpools(g, t);
        drawStrip(g, t, dt);
        if (bird) drawBird(g, dt, t); // over the box frame: it flies in from outside the window
        P.update(dt); P.draw(g);
        placeActors();
      });
      function drawWarmth(g, t, dt, px, py) {
        const { x, y, w, h: wh } = M.win, s = M.s, k = G.warm;
        G.pathT = Math.min(1, (G.pathT || 0) + dt / (reduced() ? 0.6 : 2.6));
        g.save(); g.globalCompositeOperation = 'lighter';
        // rays from the paper sun
        const sx0 = x + w * 0.74, sy0 = y + wh * 0.24;
        for (let i = 0; i < 7; i++) { const a = Math.PI * (0.18 + i * 0.11) + Math.sin(t * 0.25 + i) * 0.02, len = wh * 1.3; g.globalAlpha = 0.07 * k; g.fillStyle = '#fff1c4'; g.beginPath(); g.moveTo(sx0, sy0); g.lineTo(sx0 + Math.cos(a - 0.035) * len, sy0 + Math.sin(a - 0.035) * len); g.lineTo(sx0 + Math.cos(a + 0.035) * len, sy0 + Math.sin(a + 0.035) * len); g.closePath(); g.fill(); }
        // the path lights up from past-you onwards: kindness travelling from then to now
        const x0 = px, x1 = px + (x + w + 20 - px) * G.pathT, spr = K.glowSprite('#ffd88a');
        for (let xx = x0; xx < x1; xx += 9 * s) { const wx = G.sx - w / 2 + (xx - x), yy = y + gy(wx) + 11 * s; g.globalAlpha = 0.55 * k * (0.75 + 0.25 * Math.sin(t * 3 - xx * 0.03)); g.drawImage(spr, xx - 13 * s, yy - 13 * s, 26 * s, 26 * s); }
        if (G.pathT < 1 && x1 < x + w - 12 && Math.random() < 0.6) { const wx = G.sx - w / 2 + (x1 - x); P.emit('spark', x1, y + gy(wx) + 10 * s, 2, { colors: ['#fff3c4', '#ffd36b'], speed: [20, 60] }); }
        g.restore();
      }
      function layer(g, L, p) {
        const w = M.win.w, ox = clamp((G.sx - w / 2) * p, 0, Math.max(0, L.w - w)), d = L.d;
        g.drawImage(L.c, ox * d, 0, w * d, M.win.h * d, M.win.x, M.win.y, w, M.win.h);
      }
      function drawFog(g, t, dt, lx, ly) {
        // fog puffs from tags just fogged
        for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.t += dt; if (p.t > p.life) puffs.splice(i, 1); }
        const F = G.fog;
        if (F < 0.01 && !puffs.length) return;
        const w = M.win.w, wh = M.win.h, fs = 0.5, fw = Math.ceil(w * fs), fh = Math.ceil(wh * fs);
        if (fogCv.width !== fw || fogCv.height !== fh) { fogCv.width = fw; fogCv.height = fh; fogG = null; }
        const fg = fogG || (fogG = fogCv.getContext('2d'));
        fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = 'source-over'; fg.clearRect(0, 0, fw, fh);
        const col = G.warm > 0.4 ? '#ffe2a6' : STOCK.fog, spr = K.glowSprite(col), drift = reduced() ? 0.2 : 1;
        if (F > 0.01) {
          fg.globalAlpha = Math.min(0.5, F * 0.42); fg.fillStyle = col; fg.fillRect(0, 0, fw, fh);
          MIST.forEach((m, i) => {
            const mx = ((m.x + t * m.v * drift + (G.sx / M.Lw) * 0.3) % 1.3 - 0.15) * fw, my = (m.y + 0.03 * Math.sin(t * 0.3 + m.ph)) * fh, r = m.r * fw * (0.9 + 0.2 * Math.sin(t * 0.21 + i));
            const side = 0.55 + 0.75 * clamp(mx / fw, 0, 1); // thicker ahead (to the right): what came next was never in view
            fg.globalAlpha = clamp(F * m.a * side * 0.9, 0, 1); fg.drawImage(spr, mx - r, my - r, r * 2, r * 2);
          });
        }
        puffs.forEach(p => { const k = p.t / p.life, r = (p.r0 + k * p.r1) * fs; fg.globalAlpha = (1 - k) * 0.9; fg.drawImage(spr, p.x * fs - r, p.y * fs - r, r * 2, r * 2); });
        // the lantern's clearing round past-you: the little that could be seen
        if (G.arrived && F > 0.01) {
          const R0 = (M.phone ? 0.36 : 0.3) * w * fs * G.clear, gx = lx * fs, gyy = ly * fs;
          fg.globalCompositeOperation = 'destination-out'; fg.globalAlpha = 1; fg.drawImage(holeSprite(), gx - R0, gyy - R0, R0 * 2, R0 * 2);
        }
        fg.globalCompositeOperation = 'source-over'; fg.globalAlpha = 1;
        g.drawImage(fogCv, M.win.x, M.win.y, w, wh);
      }
      function drawSpools(g, t) {
        const { x, y, w, h: wh } = M.win, r = 9, ph = (G.sx / (TAU * 9)) % 1;
        [x + r - 1, x + w - r + 1].forEach((cx, side) => {
          const gr = g.createLinearGradient(cx - r, 0, cx + r, 0); gr.addColorStop(0, '#6e5434'); gr.addColorStop(0.35, '#e9d6b0'); gr.addColorStop(0.65, '#cdb58a'); gr.addColorStop(1, '#5a4228');
          g.fillStyle = gr; g.fillRect(cx - r, y - 2, r * 2, wh + 4);
          g.strokeStyle = 'rgba(70,45,20,0.35)'; g.lineWidth = 1;
          for (let i = 0; i < 4; i++) { const a = ((ph * (side ? -1 : 1) + i / 4) % 1 + 1) % 1, xx = cx + Math.sin(a * TAU) * r * 0.92; if (Math.cos(a * TAU) < 0) continue; g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + wh); g.stroke(); }
          g.fillStyle = '#2a1a0e'; g.fillRect(cx - r - 1, y - 5, r * 2 + 2, 5); g.fillRect(cx - r - 1, y + wh, r * 2 + 2, 5);
        });
        void t;
      }
      // the strip under the box: the whole memory as frames, a viewfinder for the window, fog over what came after the
      // moment, and in the finale every frame from the moment to now warming in turn
      function drawStrip(g, t, dt) {
        // on a phone the strip steps aside while a control needs its band (keep, hold, the answers, the paper bird)
        const on = !M.phone || G.finaleOn || !(keepBtn || holdBtn || G.chipBox || birdEl || (G.allFogged && G.phase === 'fog'));
        G.stripVis = clamp((G.stripVis == null ? 1 : G.stripVis) + (on ? 1 : -1) * dt * 3.2, 0, 1);
        const v = G.stripVis, sp = M.strip;
        if ((v > 0.5) !== G.marksOn) { G.marksOn = v > 0.5; markThen.classList.toggle('off', !G.marksOn); markNow.classList.toggle('off', !G.marksOn); }
        if (v < 0.01 || !ART.strip) return;
        const br = isBright(), sb = ART.stripSB, fy = sp.y + sb, fh = sp.h - 2 * sb, cw = sp.w / sp.n, xm = stripX(M.xF);
        g.save(); g.globalAlpha = v * (br ? 0.32 : 0.55); g.drawImage(shadowSprite(), sp.x - 24, sp.y + sp.h * 0.2, sp.w + 48, sp.h * 1.3); g.restore();
        g.globalAlpha = v; g.drawImage(ART.strip.c, sp.x, sp.y, sp.w, sp.h);
        // what came after the moment fogs over, just as it does in the view
        if (G.fog > 0.01) {
          const x0 = xm + 4, x1 = sp.x + sp.w - 3, fa = Math.min(0.9, G.fog * 0.92) * (1 - G.warm * 0.75);
          const gr = g.createLinearGradient(x0, 0, x0 + 26, 0); gr.addColorStop(0, rgba(STOCK.fog, 0)); gr.addColorStop(1, rgba(STOCK.fog, fa));
          g.fillStyle = gr; g.fillRect(x0, fy, 26, fh); g.fillStyle = rgba(STOCK.fog, fa); g.fillRect(x0 + 26, fy, x1 - x0 - 26, fh);
        }
        // finale: the reel glows warm, frame by frame, from the moment to now
        if (G.warm > 0.02) {
          const reach = xm + (sp.x + sp.w - xm) * (G.pathT || 0), spr = K.glowSprite('#ffcf7a');
          g.save(); g.globalCompositeOperation = 'lighter';
          for (let j = 0; j < sp.n; j++) {
            const fx = sp.x + j * cw + 3, fw = cw - 6, mid = fx + fw / 2, lit = mid < xm ? 0.45 : clamp((reach - fx) / fw, 0, 1);
            if (lit <= 0) continue;
            const a = lit * G.warm * (0.8 + 0.2 * Math.sin(t * 2.4 + j));
            g.globalAlpha = a * 0.5; g.drawImage(spr, fx - fw * 0.35, fy - fh * 0.8, fw * 1.7, fh * 2.6);
            g.globalAlpha = a * 0.28; g.fillStyle = '#ffd890'; g.fillRect(fx, fy, fw, fh);
          }
          g.restore();
          g.globalAlpha = v * G.warm; g.strokeStyle = '#ffd77a'; g.lineWidth = 1.5;
          for (let j = 0; j < sp.n; j++) { const fx = sp.x + j * cw + 3, fw = cw - 6; if (fx < reach && fx + fw / 2 >= xm) g.strokeRect(fx + 0.5, fy + 0.5, fw - 1, fh - 1); }
          g.globalAlpha = v;
        }
        // the moment: a brass pin on the frame it happened in
        g.fillStyle = '#ffd77a'; g.beginPath(); g.arc(xm, sp.y + sb / 2, Math.max(2.6, sb * 0.3), 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,215,122,0.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(xm, sp.y + sb - 1); g.lineTo(xm, sp.y + sp.h - sb + 1); g.stroke();
        // the viewfinder: the stretch of reel in the window right now
        const vx0 = stripX(G.sx - M.win.w / 2), vx1 = stripX(G.sx + M.win.w / 2), pulse = G.phase === 'pull' || G.phase === 'now' ? 0.25 + 0.15 * Math.sin(t * 4) : 0.15;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = v * pulse; g.drawImage(K.glowSprite('#ffd77a'), vx0 - 14, sp.y - 16, vx1 - vx0 + 28, sp.h + 32); g.restore();
        g.globalAlpha = v; g.strokeStyle = '#ffd77a'; g.lineWidth = 2.5; rr(g, vx0, sp.y - 3, vx1 - vx0, sp.h + 6, 6); g.stroke();
        // past-you's spot inside it
        const px = stripX(focus());
        g.fillStyle = br ? '#5a3008' : '#ffd77a'; g.beginPath(); g.moveTo(px, sp.y - 4); g.lineTo(px - 6.5, sp.y - 13); g.lineTo(px + 6.5, sp.y - 13); g.closePath(); g.fill();
        g.globalAlpha = 1;
      }

      /* ---------------- pull the reel ---------------- */
      function stepScroll(dt) {
        const lo = M.xT - 70 * M.s, hi = M.xN + M.off + 30 * M.s;
        if (G.phase === 'pull' || G.phase === 'now') {
          if (!G.drag) {
            G.sx += G.vel * dt; G.vel *= Math.exp(-dt * 2.4);
            const d = G.sx - M.xT;
            if (G.phase === 'pull' && Math.abs(d) < 150 * M.s) { G.vel += -d * 20 * dt; G.vel *= Math.exp(-dt * 6.5); if (Math.abs(d) < 1.5 && Math.abs(G.vel) < 12) arrive(); }
          }
          if (G.sx < lo) { G.sx = lo; G.vel = Math.max(0, G.vel); } if (G.sx > hi) { G.sx = hi; G.vel = Math.min(0, G.vel); }
        } else if (G.phase === 'play' && G.holding) {
          const v = 70 * M.s; G.sx += v * dt; G.xP += v * dt; G.walk += dt;
          if (G.walk > 0.42) { G.walk = 0; SFX.step(); }
        } else if (G.glide) {
          G.sx += (G.glide - G.sx) * Math.min(1, dt * 2.2);
        }
        // a felt-piano note for every frame of reel that passes (down when going back, up when going forward)
        const mk = Math.floor(G.sx / (44 * M.s));
        if (G.lastMark == null) G.lastMark = mk;
        if (mk !== G.lastMark) { const dir = mk < G.lastMark ? -1 : 1; G.lastMark = mk; SFX.note(dir, Math.abs(G.vel)); }
        const tn = now(); if (tn - (G.audT || 0) > 70) {
          G.audT = tn;
          if (rustle) rustle.level(G.phase === 'pull' ? Math.min(0.07, Math.abs(G.vel) * 0.00007 + (G.drag ? 0.01 : 0)) : 0.0001, 0.08);
          if (drone) drone.level(G.phase === 'play' && G.holding ? 0.05 : 0.0001, 0.3);
          const av = String(Math.round(clamp((G.sx - M.xT) / (M.xN - M.xF), 0, 1) * 100)); if (av !== G.av) { G.av = av; dragZone.setAttribute('aria-valuenow', av); }
        }
      }
      let lastPX = 0, lastPT = 0;
      const pullStart = (p) => { if (G.phase !== 'pull' && G.phase !== 'now') return false; G.drag = true; G.vel = 0; lastPX = p.x; lastPT = now(); dragZone.classList.add('grab'); if (A.ctx) A.paper({ vol: 0.05 }); K.guideDone(); if (G.phase === 'now') toPull(); };
      const pullMove = (p, k) => {
        if (!G.drag) return; const t = now(), dx = (p.x - lastPX) * (k || 1), dtt = Math.max(1, t - lastPT); lastPX = p.x; lastPT = t;
        G.sx = clamp(G.sx - dx, M.xT - 70 * M.s, M.xN + M.off + 30 * M.s); G.vel = G.vel * 0.55 + (-dx / dtt * 1000) * 0.45;
      };
      const pullEnd = () => { if (!G.drag) return; G.drag = false; dragZone.classList.remove('grab'); G.vel = clamp(G.vel, -2600 * M.s, 2600 * M.s); if (G.phase === 'pull' && Math.abs(G.sx - M.xT) > 160 * M.s) pullGuide(true); };
      K.drag(dragZone, { start: pullStart, move: (p) => pullMove(p, 1), end: pullEnd });
      // the film strip under the box scrubs too (drag its viewfinder left to go back)
      K.drag(rulerZone, { start: pullStart, move: (p) => pullMove(p, -M.Lw / M.strip.w), end: pullEnd });
      K.onKey(['ArrowLeft', 'ArrowRight'], (e) => { if (G.phase !== 'pull' && G.phase !== 'now') return; e.preventDefault(); if (G.phase === 'now') toPull(); G.vel += (e.key === 'ArrowLeft' || e.code === 'ArrowLeft' ? -1 : 1) * 520 * M.s; });
      function pullGuide(again) {
        K.guide({ id: 'pull' + (again ? '2' : ''), g: 'drag', target: dragZone, dir: 'r', d: M.phone ? 150 : 230, ox: 0.28, oy: 0.62, label: again ? 'KEEP PULLING BACK' : 'PULL THE REEL BACK', delay: again ? 1400 : 700 });
      }
      function toPull() { if (G.phase !== 'now') return; G.phase = 'pull'; }
      function arrive() {
        if (G.arrived) return;
        G.arrived = true; G.phase = 'arrive'; G.sx = M.xT; G.xP = M.xF; G.vel = 0; G.drag = false;
        dragZone.classList.add('off'); rulerZone.classList.add('off');
        markThen.classList.add('lit'); K.guide(null);
        SFX.clunk(); S.buzz(14);
        P.emit('mote', M.win.x + M.win.w * 0.27, M.win.y + gy(M.xF) - 30 * M.s, 14, { colors: ['#fff3c4', '#ffe08a'], speed: [10, 50] });
        ctx.track('arrive', {});
      }

      /* ---------------- the tags you carried back ---------------- */
      function buildTags() {
        const R = K.rng(dayNo % 997 + 3), ph = M.phone;
        const nLater = [2, 2, 3][inten], nFree = ph ? [0, 1, 0][inten] : [0, 1, 2][inten];
        const later = [], then = [], free = [];
        later.push({ kind: 'later', verdict: true, kicker: 'Today’s verdict', text: WD.verdict || 'A thought like “I should have seen it coming”', user: !!WD.verdict, line: 'And you didn’t have today’s verdict. That came later.' });
        const l0 = dayNo % LATER.length; for (let i = 0; i < nLater; i++) { const it = LATER[(l0 + i * 2) % LATER.length]; later.push({ kind: 'later', id: it.id, text: it.label, line: it.line }); }
        const t0 = (dayNo * 2 + 1) % THEN.length; for (let i = 0; i < 2; i++) { const it = THEN[(t0 + i * 3) % THEN.length]; then.push({ kind: 'then', id: it.id, text: it.label, short: it.short }); }
        WD.extra.slice(0, nFree).forEach(x => free.push({ kind: 'free', kicker: 'On record', text: x, user: true }));
        // mix them so the then-tags never sit together; the verdict always hangs first in reading order
        const rest = K.shuffle(later.slice(1).concat(free), R);
        const order = [later[0]];
        const pool = rest.slice(); then.forEach((tg, i) => { pool.splice(Math.min(pool.length, 1 + i * 2), 0, tg); });
        pool.forEach(x => order.push(x));
        G.req0 = later.length; G.req = later.length;
        order.forEach((tg, i) => {
          const b = h('button', { type: 'button', class: 'wk-tag', 'aria-label': (tg.kicker ? tg.kicker + ': ' : '') + tg.text + '. Tap if past-you only learned this later.' },
            tg.kicker ? h('small', { text: tg.kicker }) : null, h('span', { class: tg.user ? 'gk-user' : '', text: tg.text }));
          b.style.setProperty('--rot', ((i % 2 ? 1 : -1) * (0.4 + R() * 0.9)).toFixed(2) + 'deg');
          b.style.setProperty('--sw', (4.2 + R() * 1.6).toFixed(2) + 's');
          b.style.animationDelay = (-R() * 4).toFixed(2) + 's';
          tg.el = b; tg.i = i; el.append(b); TAGS.push(tg);
          K.tap(b, () => fogTap(tg));
        });
        placeTags(true);
      }
      // tag layout: past-you stands at 27% across; the tags hang in a column above them and over the road ahead (one
      // measurement per tag when they are placed, never per frame)
      function dropBox() { const w = M.win, ds = M.ds || 66, cx = w.x + w.w * 0.27; return { l: cx - ds / 2, r: cx + ds / 2, t: w.y + gy(M.xF) + 4 * M.s - ds }; }
      function tagCols() {
        const w = M.win, ph = M.phone, D = dropBox(), gap = ph ? 8 : 12;
        const top = cap.classList.contains('off') ? w.y + 16 : cap.offsetTop + cap.offsetHeight + (ph ? 12 : 18);
        const rx = Math.max(D.r + gap, w.x + w.w * 0.4), right = w.x + w.w - (ph ? 10 : 18);
        const cols = [];
        if (ph) cols.push({ x: rx, w: right - rx, y: top, bot: w.y + w.h - 8 });
        else { const cw = (right - rx - gap) / 2; cols.push({ x: rx, w: cw, y: top, bot: w.y + w.h - 12 }, { x: rx + cw + gap, w: cw, y: top, bot: w.y + w.h - 12 }); }
        cols.push({ x: w.x + (ph ? 10 : 18), w: rx - gap - w.x - (ph ? 10 : 18), y: top, bot: D.t - gap, left: true });
        return cols;
      }
      function placeTags(fly) {
        if (!TAGS.length) return;
        const cols = tagCols(), gap = M.phone ? 12 : 14, live = TAGS.filter(x => !x.done || fly);
        live.forEach((tg, i) => {
          // the verdict takes the widest column; the rest go wherever there is the most room left
          let best = null;
          cols.forEach((c, ci) => { if (i === 0 && c.left) return; tg.el.style.width = c.w + 'px'; const hh = tg.el.offsetHeight || 64, room = c.bot - c.y - hh; const score = room + (c.left ? -14 : 0); if (!best || score > best.score) best = { c, hh, score }; });
          const c = best.c; tg.el.style.width = c.w + 'px';
          tg.slot = { x: c.x, y: c.y, w: c.w }; c.y += best.hh + gap;
          Object.assign(tg.el.style, { left: tg.slot.x + 'px', top: tg.slot.y + 'px' });
          if (fly) { tg.el.style.setProperty('--tx', (M.win.x + M.win.w - c.w - c.x - 6) + 'px'); tg.el.style.setProperty('--ty', '-24px'); tg.el.style.setProperty('--op', '0'); }
        });
      }

      /* ---------------- fog what came later ---------------- */
      function fogTap(tg) {
        if (G.phase !== 'fog' || tg.done) return;
        K.guideDone();
        if (tg.kind === 'then') {
          tg.el.classList.remove('nudge'); void tg.el.offsetWidth; tg.el.classList.add('nudge'); S.later(() => tg.el.classList.remove('nudge'), 560);
          if (!tg.stamp) { tg.stamp = h('b', { class: 'wk-stamp', text: 'I had this' }); tg.el.append(tg.stamp); tg.el.classList.add('kept'); G.mis++; }
          SFX.knock(); drop.face('wink', 1400); sayS(LINES.knew, 'happy', 2600); askAgain(2700);
          ctx.track('kept', { i: tg.i });
          return;
        }
        tg.done = true; tg.el.classList.add('fog'); tg.el.setAttribute('aria-disabled', 'true'); tg.el.tabIndex = -1;
        G.fogged.push(tg); if (tg.kind === 'later') G.req--;
        const r = K.rectIn(tg.el), wx = r.cx - M.win.x, wy = r.cy - M.win.y;
        puffs.push({ x: wx, y: wy, r0: 30 * M.s, r1: 90 * M.s, t: 0, life: 1.4 });
        G.fogT = Math.min(1, 0.25 + 0.75 * (G.fogged.length / Math.max(1, G.req0 + TAGS.filter(x => x.kind === 'free').length)));
        SFX.fog(G.fogged.length);
        P.emit('mote', r.cx, r.cy, 8, { colors: [STOCK.fog, '#ffffff'], speed: [8, 30] });
        const left = G.req;
        drop.base(left <= 0 ? 'calm' : G.fogged.length >= 2 ? 'think' : 'worried');
        if (G.fogged.length === 1) { sayS(LINES.fog1, 'calm', 2400); askAgain(2500); }
        ctx.track('fog', { n: G.fogged.length, kind: tg.kind === 'free' ? 'f' : 'l' });
        if (left <= 0 && !G.allFogged) { G.allFogged = true; S.later(allFogged, 700); }
        else if (left > 0) fogGuide(true);
      }
      // the instruction stays on screen for the whole step (a reaction line borrows the bubble for a moment)
      let askT = 0;
      function askAgain(ms) { S.cancel(askT); askT = S.later(() => { if (G.phase === 'fog' && !G.allFogged) sayS(LINES.fogAsk, 'calm', 0); }, ms); }
      function fogGuide(again) {
        const next = TAGS.find(x => x.kind === 'later' && !x.done); if (!next) return;
        K.guide({ id: 'fog' + (again ? '2' : ''), g: 'tap', target: next.el, label: 'TAP WHAT CAME LATER', place: 'above', delay: again ? 2600 : 900 });
      }
      let keepBtn = null;
      function allFogged() {
        if (G.phase !== 'fog') return;
        K.guide(null);
        drop.base('calm');
        sayS(LINES.small, 'calm', 0);
        keepBtn = h('button', { type: 'button', class: 'wk-btn', text: 'That’s all I had' });
        el.append(keepBtn); placeControls();
        K.tap(keepBtn, keep);
        K.guide({ id: 'keep', g: 'tap', target: keepBtn, label: 'KEEP WHAT YOU HAD', place: 'above', delay: 1200 });
      }
      function keep() {
        if (G.phase !== 'fog' || !G.allFogged) return;
        G.phase = 'keep'; K.guide(null); K.sfx.tap(); if (A.ctx) A.chime(A.note('D6'), { vol: 0.05, dur: 1.6 });
        if (keepBtn) { keepBtn.remove(); keepBtn = null; }
        // what's left gathers round past-you's light: the small, foggy view they actually had
        const left = TAGS.filter(x => !x.done); TAGS.filter(x => x.done).forEach(x => x.el.remove());
        left.forEach(x => { x.kept = true; x.el.classList.add('kept'); x.el.disabled = true; x.el.style.cursor = 'default'; });
        G.gathered = true; gatherTags(left);
        G.fogT = 1;
        ctx.track('keep', { kept: left.length, mis: G.mis });
      }
      function relayoutTags() {
        if (!TAGS.length) return;
        const live = TAGS.filter(x => !x.done && x.el.isConnected);
        if (G.gathered) gatherTags(live, true); else placeTags(false);
      }
      function gatherTags(left, instant) {
        // what's left gathers round past-you's light: stacked above them, then beside them on the road
        const w = M.win, ph = M.phone, D = dropBox(), cols = tagCols(), gap = ph ? 12 : 14, lc = cols[cols.length - 1], rc = cols[0];
        let ly = lc.bot, ry = Math.min(rc.bot, D.t + (M.ds || 66));
        left.forEach((tg) => {
          const r0 = K.rectIn(tg.el);
          let c = lc; tg.el.style.width = lc.w + 'px'; let hh = tg.el.offsetHeight || 64;
          if (ly - hh < lc.y) { c = rc; tg.el.style.width = Math.min(rc.w, ph ? 200 : 260) + 'px'; hh = tg.el.offsetHeight || 64; }
          const y = c === lc ? (ly -= hh, ly) : (ry -= hh, ry);
          if (c === lc) ly -= gap; else ry -= gap;
          tg.slot = { x: c.x, y: Math.max(w.y + 8, y), w: parseFloat(tg.el.style.width) };
          Object.assign(tg.el.style, { left: tg.slot.x + 'px', top: tg.slot.y + 'px' });
          if (!instant) { tg.el.style.setProperty('--tx', (r0.x - tg.slot.x) + 'px'); tg.el.style.setProperty('--ty', (r0.y - tg.slot.y) + 'px'); void tg.el.offsetWidth; }
          tg.el.style.setProperty('--tx', '0px'); tg.el.style.setProperty('--ty', '0px');
        });
      }

      /* ---------------- play it forward with only that ---------------- */
      let holdBtn = null, holdRing = null, holdCtl = null;
      const HOLD_MS = [3800, 3300, 3000][inten];
      function makeHold() {
        holdBtn = h('button', { type: 'button', class: 'wk-hold', 'aria-label': 'Press and hold to play it forward', html: '<svg viewBox="0 0 120 120"><circle class="trk" cx="60" cy="60" r="56" pathLength="100"/><circle class="bar" cx="60" cy="60" r="56" pathLength="100" stroke-dasharray="0 100"/></svg><b>Hold to play it forward</b>' });
        holdRing = holdBtn.querySelector('.bar');
        el.append(holdBtn); placeControls();
        holdCtl = K.hold(holdBtn, {
          ms: HOLD_MS,
          start: () => { if (G.phase !== 'play') return; G.holding = true; drop.el.classList.add('wk-walk'); K.guideDone(); if (A.ctx) A.pluck(A.note('A4'), { vol: 0.08, damp: 0.995 }); },
          progress: (k, active) => {
            if (G.phase !== 'play') return;
            G.holding = !!active; drop.el.classList.toggle('wk-walk', !!active);
            holdRing.setAttribute('stroke-dasharray', (k * 100).toFixed(1) + ' 100'); holdBtn.style.setProperty('--glow', k.toFixed(3));
          },
          cancel: () => { G.holding = false; drop.el.classList.remove('wk-walk'); if (G.phase === 'play') K.guide({ id: 'hold2', g: 'hold', target: holdBtn, label: 'KEEP HOLDING', place: 'above', ms: 1600, delay: 1500 }); },
          done: () => { G.holding = false; drop.el.classList.remove('wk-walk'); played(); }
        });
      }
      async function played() {
        if (G.phase !== 'play') return;
        G.phase = 'played'; K.guide(null);
        if (holdBtn) { holdBtn.style.transition = 'opacity .35s ease'; holdBtn.style.opacity = '0'; const b = holdBtn; S.later(() => b.remove(), 380); holdBtn = null; }
        if (A.ctx) ['A4', 'D5', 'F#5'].forEach((n, i) => A.pluck(A.note(n), { when: A.now() + i * 0.09, vol: 0.1, damp: 0.995, verb: 0.35 }));
        setCap('From inside the fog', L(LINES.inside), false);
        drop.base('calm');
        ctx.track('played', {});
        await K.wait(reduced() ? 900 : 1500);
        judge();
      }

      /* ---------------- the friend test ---------------- */
      let chipEls = [];
      function judge() {
        G.phase = 'judge';
        sayS(LINES.friend, 'think', 0);
        const opts = [
          { key: 'fair', b: 'No.', t: ' With only this, it made sense.' },
          { key: 'part', b: 'Partly.', t: ' Some of it was mine to see.' },
          { key: 'own', b: 'Yes.', t: ' And they could learn from it.' }
        ];
        const box = h('div', { class: 'wk-chips', role: 'group', 'aria-label': 'Would you judge a friend who only had this?' });
        chipEls = opts.map(o => { const b = h('button', { type: 'button', class: 'wk-chip' }, h('b', { text: o.b }), document.createTextNode(o.t)); K.tap(b, () => answer(o, b, box)); box.append(b); return b; });
        el.append(box); G.chipBox = box; placeControls();
        K.guide({ id: 'judge', g: 'choose', target: () => chipEls.filter(x => x.isConnected), label: 'ANSWER HONESTLY', place: 'above', delay: 1100 });
      }
      function answer(o, b, box) {
        if (G.phase !== 'judge') return;
        G.phase = 'answered'; G.answer = o.key; K.guide(null); still.hush();
        b.classList.add('pick'); chipEls.forEach(x => { if (x !== b) x.classList.add('gone'); });
        if (A.ctx) { A.click({ vol: 0.08 }); A.chime(A.note(o.key === 'fair' ? 'F#5' : o.key === 'part' ? 'E5' : 'D5'), { vol: 0.07, dur: 1.6 }); }
        drop.base(o.key === 'fair' ? 'happy' : o.key === 'part' ? 'shy' : 'determined');
        ctx.track('friend', { a: o.key });
        S.later(() => { box.remove(); G.chipBox = null; letter(); }, 650);
      }

      /* ---------------- the letter ---------------- */
      let letterEl = null, signEls = [];
      function letterLines() {
        const out = [GREET];
        const fl = G.fogged.filter(x => x.kind === 'later');
        const vl = fl.find(x => x.verdict), gl = fl.filter(x => !x.verdict).slice(0, 2);
        gl.forEach(x => out.push(x.line));
        if (vl) out.push(vl.line);
        const kept = TAGS.filter(x => x.kind === 'then');
        if (kept.length) out.push('All you had was ' + kept.map(x => x.short).join(' and ') + '.');
        out.push(G.answer === 'fair' ? 'With only that, it made sense.' : G.answer === 'part' ? 'Some of it was yours to see. I can see it now, and that counts.' : 'Some of it was on you. Own it, learn it, and let the punishing stop.');
        if (WD.own) out.push('If it hurt someone, I can still help make it right.');
        if (WD.lead && (WD.care || WD.sup === 'strong')) out.push('Next: ' + WD.lead);
        return out;
      }
      async function letter() {
        G.phase = 'letter';
        sayS(LINES.write, 'calm', 3200);
        const lines = letterLines();
        const ps = lines.map(t => inkLine(t));
        letterEl = h('section', { class: 'wk-letter', 'aria-label': 'A letter to past-you' }, h('h3', { text: 'A letter back down the reel' }), ...ps);
        el.append(letterEl); placeControls();
        if (M.phone) { drop.el.style.opacity = '0'; TAGS.forEach(x => { if (x.el.isConnected) x.el.style.visibility = 'hidden'; }); cap.classList.add('off'); }
        if (A.ctx) A.paper({ vol: 0.1 });
        await K.wait(reduced() ? 200 : 500);
        for (const p of ps) { await writeLine(p); await K.wait(reduced() ? 80 : 240); }
        G.phase = 'sign';
        sayS(LINES.sign, 'happy', 0);
        const row = h('div', { class: 'wk-signs', role: 'group', 'aria-label': 'Sign it' });
        signEls = SIGNS.map(sg => { const b = h('button', { type: 'button', class: 'wk-sign', text: sg }); K.tap(b, () => signIt(sg, row)); row.append(b); return b; });
        letterEl.append(row); placeControls();
        K.guide({ id: 'sign', g: 'choose', target: () => signEls.filter(x => x.isConnected), label: 'SIGN YOUR LETTER', place: 'above', delay: 900 });
      }
      async function signIt(sg, row) {
        if (G.phase !== 'sign') return;
        G.phase = 'signed'; G.sign = sg; K.guide(null); row.remove();
        const p = inkLine(sg, 'sign'); letterEl.append(p); placeControls();
        ctx.track('sign', { i: SIGNS.indexOf(sg) });
        await writeLine(p);
        await K.wait(reduced() ? 300 : 700);
        fold();
      }
      // the letter writes itself a word at a time, in reading order, each word with its own scratch of the pen
      function inkLine(t, cls) {
        const p = h('p', cls ? { class: cls } : null);
        String(t).split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) p.append(document.createTextNode(w)); else p.append(h('span', { class: 'wd', text: w })); });
        return p;
      }
      async function writeLine(p) {
        const ws = Array.from(p.querySelectorAll('.wd'));
        if (reduced()) { ws.forEach(w => w.classList.add('on')); SFX.pen(4, 0.2); return; }
        for (const w of ws) { if (!w.isConnected) return; w.classList.add('on'); SFX.scratch(w.textContent.length); await K.wait(clamp(w.textContent.length * 24, 60, 160)); }
      }
      let birdEl = null;
      async function fold() {
        G.phase = 'folding';
        const r = K.rectIn(letterEl);
        if (A.ctx) { const t = A.now(); [0, 0.12, 0.26].forEach(d => A.paper({ when: t + d, vol: 0.09, freq: 2400 + d * 2000 })); }
        letterEl.classList.add('fold');
        await K.wait(reduced() ? 250 : 520);
        letterEl.remove(); letterEl = null;
        if (M.phone) { drop.el.style.opacity = '1'; TAGS.forEach(x => { if (x.el.isConnected) x.el.style.visibility = ''; }); }
        birdEl = h('div', { class: 'wk-bird', role: 'button', tabindex: '0', 'aria-label': 'Your letter, folded into a paper bird. Drag it to past-you.' }, h('i', { html: BIRD }));
        const bx = M.phone ? M.W / 2 : r.cx, by = M.phone ? M.panel.y + M.panel.h / 2 : clamp(r.cy, M.panel.y + 200, M.H - 80);
        Object.assign(birdEl.style, { left: bx + 'px', top: by + 'px' });
        el.append(birdEl); G.birdHome = { x: bx, y: by };
        G.phase = 'send';
        sayS(LINES.send, 'happy', 0);
        bindBird();
        birdGuide();
      }
      const dropPoint = () => { const w = M.win; return { x: w.x + (G.xP - G.sx) + w.w / 2, y: w.y + gy(G.xP) - M.ds * 0.55 }; };
      function birdGuide() { if (!birdEl || G.phase !== 'send') return; const r = K.rectIn(birdEl), tp = dropPoint(); K.guide({ id: 'bird', g: 'drag', target: birdEl, dx: tp.x - r.cx, dy: tp.y - r.cy, label: 'SEND IT TO PAST-YOU', delay: 900 }); }
      function bindBird() {
        let st = null;
        K.drag(birdEl, {
          space: el,
          start: (p) => { if (G.phase !== 'send') return false; const r = K.rectIn(birdEl); st = { ox: p.x - r.cx, oy: p.y - r.cy }; birdEl.classList.add('lift'); K.guideDone(); if (A.ctx) A.paper({ vol: 0.06 }); },
          move: (p) => { if (!st) return; birdEl.style.left = (p.x - st.ox) + 'px'; birdEl.style.top = (p.y - st.oy) + 'px'; },
          end: (p) => {
            if (!st) return; st = null; birdEl.classList.remove('lift');
            const w = M.win, inWin = p.y < w.y + w.h + 10 && p.y > w.y - 20 && p.x > w.x - 20 && p.x < w.x + w.w + 20;
            if (inWin || p.y < G.birdHome.y - 110) launchBird(p.x, p.y);
            else { if (A.ctx) A.tone({ type: 'triangle', freq: 320, to: 240, dur: 0.15, vol: 0.05 }); birdEl.style.transition = 'left .35s cubic-bezier(.2,1.3,.4,1), top .35s cubic-bezier(.2,1.3,.4,1)'; birdEl.style.left = G.birdHome.x + 'px'; birdEl.style.top = G.birdHome.y + 'px'; S.later(() => { if (birdEl) birdEl.style.transition = ''; }, 380); birdGuide(); }
          }
        });
        S.listen(birdEl, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && G.phase === 'send') { e.preventDefault(); const r = K.rectIn(birdEl); launchBird(r.cx, r.cy); } });
      }
      function launchBird(x, y) {
        if (G.phase !== 'send') return;
        G.phase = 'flying'; K.guide(null);
        if (birdEl) { birdEl.remove(); birdEl = null; }
        const tp = dropPoint();
        // it lands beside past-you, exactly where the envelope then appears (never over the character art)
        bird = { x0: x, y0: y, x1: tp.x - M.ds / 2 - 25, y1: tp.y + M.ds * 0.55 - 16, t: 0, dur: reduced() ? 0.6 : 1.25, flapT: 0, x, y, ang: 0 };
        if (A.ctx) A.whoosh({ vol: 0.1, dur: 0.6, from: 600, to: 2400 });
        ctx.track('send', {});
      }
      function drawBird(g, dt, t) {
        const b = bird; b.t += dt; const k = clamp(b.t / b.dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const cx = (b.x0 + b.x1) / 2, cy = Math.min(b.y0, b.y1) - 90 * M.s;
        const x = (1 - e) * (1 - e) * b.x0 + 2 * (1 - e) * e * cx + e * e * b.x1, y = (1 - e) * (1 - e) * b.y0 + 2 * (1 - e) * e * cy + e * e * b.y1;
        b.ang = Math.atan2(y - b.y, x - b.x) * 0.25; b.x = x; b.y = y;
        b.flapT += dt; if (b.flapT > 0.17) { b.flapT = 0; SFX.flap(); }
        const fl = Math.sin(t * 16) * (1 - k * 0.6), s = (M.phone ? 0.9 : 1.1) * (1 - k * 0.35);
        g.save(); g.translate(x, y); g.rotate(b.ang); g.scale(s, s);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(K.glowSprite('#fff3cf'), -34, -34, 68, 68); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.fillStyle = '#f2e6cc'; g.beginPath(); g.moveTo(-4, 0); g.lineTo(-30, -26 * fl - 4); g.lineTo(-10, 4); g.closePath(); g.fill();
        g.fillStyle = '#fffbf0'; g.beginPath(); g.moveTo(-14, 2); g.lineTo(18, -4); g.lineTo(26, -12); g.lineTo(20, 2); g.lineTo(-6, 8); g.closePath(); g.fill();
        g.fillStyle = '#fffdf6'; g.beginPath(); g.moveTo(2, 0); g.lineTo(-18, -30 * fl - 6); g.lineTo(10, 2); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(120,90,50,0.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-14, 2); g.lineTo(20, 2); g.stroke();
        g.restore();
        if (Math.random() < 0.5) P.emit('mote', x, y, 1, { colors: ['#fff3cf'], speed: [4, 16] });
        if (k >= 1) { bird = null; landed(); }
      }

      /* ---------------- finale: the reel glows warm ---------------- */
      function spawnLanterns() {
        const w = M.win, n = [6, 8, 10][inten];
        for (let i = 0; i < n; i++) S.later(() => {
          const wx = (0.08 + 0.84 * ((i * 0.618) % 1)) * w.w, worldX = G.sx - w.w / 2 + wx;
          lanterns.push({ x: wx, y: gy(worldX) - 6 * M.s, vy: -(18 + Math.random() * 14) * M.s, ph: Math.random() * TAU, s: (0.8 + Math.random() * 0.45) * M.s, t: 0 });
          if (A.ctx) A.chime(A.note(NOTES[(i * 2 + 3) % NOTES.length]) * 2, { vol: 0.045, dur: 2.2, verb: 0.5 });
        }, i * (reduced() ? 120 : 340));
      }
      function drawLanterns(g, dt, t) {
        if (!lanterns.length) return;
        const ox = M.win.x, oy = M.win.y, spr = K.glowSprite('#ffcf7a');
        for (let i = lanterns.length - 1; i >= 0; i--) {
          const L0 = lanterns[i]; L0.t += dt; L0.y += L0.vy * dt; L0.vy *= 1 - dt * 0.05;
          if (L0.y < -60) { lanterns.splice(i, 1); continue; }
          const x = ox + L0.x + Math.sin(t * 0.9 + L0.ph) * 8 * L0.s, y = oy + L0.y, s = L0.s;
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55; g.drawImage(spr, x - 34 * s, y - 34 * s, 68 * s, 68 * s); g.restore();
          g.fillStyle = '#ffd98a'; rr(g, x - 7 * s, y - 10 * s, 14 * s, 18 * s, 4 * s); g.fill();
          g.fillStyle = 'rgba(160,80,20,0.55)'; g.fillRect(x - 7 * s, y - 10 * s, 14 * s, 2.5 * s); g.fillRect(x - 7 * s, y + 5.5 * s, 14 * s, 2.5 * s);
          g.fillStyle = '#fff7d6'; g.beginPath(); g.ellipse(x, y + 1 * s, 2.4 * s, 3.6 * s, 0, 0, TAU); g.fill();
        }
      }
      let envEl = null;
      async function landed() {
        G.phase = 'finale'; G.finaleOn = true;
        SFX.arrive(); S.buzz([16, 40, 16]);
        const tp = dropPoint(), lx = tp.x - M.ds / 2 - 25, ly = tp.y + M.ds * 0.55 - 16;
        P.emit('spark', lx, ly, 26, { colors: ['#fff3c4', '#ffd36b', '#ffffff'], speed: [60, 200] });
        P.emit('mote', tp.x, tp.y, 18, { colors: ['#fff3c4', '#ffe08a'], speed: [10, 60] });
        drop.say(L(LINES.got), { mood: 'love', ms: 2600 }); drop.react('bounce');
        envEl = h('div', { class: 'wk-env', html: ENVELOPE }); el.append(envEl); placeActors();
        G.warmT = 1; G.fogT = 0.5; G.bed = true; amb.level(0.6, 2);
        TAGS.forEach(x => { if (x.el.isConnected) { x.el.style.transition = 'opacity .8s ease'; x.el.style.opacity = '0'; } });
        await K.wait(reduced() ? 400 : 900);
        TAGS.forEach(x => x.el.remove());
        spawnLanterns();
        const keyLine = G.answer === 'own' ? 'You only had what was in front of you. Now you know more.' : 'You only had what was in front of you.';
        setCap('To then-me', keyLine, false, 'final');
        sayS(WD.care ? LINES.endCare : WD.own || G.answer === 'own' ? LINES.endOwn : WD.sup === 'strong' ? LINES.endStrong : LINES.end, 'happy', 4200);
        await K.wait(reduced() ? 1800 : 4400);
        if (TOMORROW.key !== STOCK.key) sayS({ Jolly: 'Tomorrow the reel is ' + TOMORROW.name + '. I’ll keep the lamp on.', Cheeky: 'Tomorrow: ' + TOMORROW.name + ' paper. Same lamp.', Unfiltered: 'Tomorrow: ' + TOMORROW.name + '.' }, 'calm', 3200);
        await K.wait(reduced() ? 1200 : 2400);
        finish();
      }
      function finish() {
        if (G.done) return; G.done = true; G.phase = 'done';
        const n = G.fogged.length, score = G.req0 / Math.max(1, G.req0 + G.mis), pct = Math.round(score * 100);
        const tier = K.tier(score, [0.5, 0.74, 0.99]), best = K.best('clean', pct, 'higher'), col = K.collect('reel:' + STOCK.key);
        const reels = K.collection().filter(x => x.indexOf('reel:') === 0).length;
        const badges = [];
        if (tier) badges.push(tier + ' clear read' + (G.mis ? '' : ': nothing past-you had was fogged'));
        if (best.isNew) badges.push('New best: ' + pct + '% clean read');
        if (col.isNew) badges.push('New reel: ' + STOCK.name + ' (' + Math.min(reels, STOCKS.length) + '/' + STOCKS.length + ')');
        if ((visits === 1 || visits === 3) && SIGNS.length > (visits === 1 ? 2 : 3)) badges.push('New sign-off: “' + SIGNS[SIGNS.length - 1] + '”');
        const kept = TAGS.filter(x => x.kind === 'then').map(x => x.short);
        ctx.finish({
          title: 'Fair to then-me', mood: 'love',
          lines: ['Fogged ' + n + ' thing' + (n === 1 ? '' : 's') + ' you only learned later', kept.length ? 'Then, you had: ' + kept.join(' and ') : 'Then, you had only that moment', G.answer === 'fair' ? 'A friend with that view: it made sense' : G.answer === 'part' ? 'A friend with that view: partly theirs to see' : 'A friend with that view: theirs to learn from, not to punish'],
          share: 'Judged my past self with today’s information. Not fair. Rewound.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- DOM actors that follow the reel ---------------- */
      let lastDropKey = '';
      function placeActors() {
        const w = M.win, ds = M.ds || 66, xs = w.x + (G.xP - G.sx) + w.w / 2, feet = w.y + gy(G.xP) + 4 * M.s;
        const vis = G.arrived || (xs > w.x + ds * 0.5 && xs < w.x + w.w - ds * 0.5 && G.phase !== 'intro');
        const key = Math.round(xs) + ':' + Math.round(feet) + ':' + (vis ? 1 : 0) + ':' + ds;
        if (key !== lastDropKey) {
          lastDropKey = key;
          drop.el.style.left = (xs - ds / 2) + 'px'; drop.el.style.top = (feet - ds) + 'px';
          if (!(M.phone && (G.phase === 'letter' || G.phase === 'sign' || G.phase === 'signed' || G.phase === 'folding'))) drop.el.style.opacity = vis && xs > w.x + 12 && xs < w.x + w.w - 12 ? '1' : '0';
        }
        if (envEl) { envEl.style.left = (xs - ds / 2 - 44) + 'px'; envEl.style.top = (feet - 34) + 'px'; } // held out on the left, clear of the speech bubble
      }
      function placeControls() {
        const P0 = M.panel, ph = M.phone, midY = P0.y + P0.h / 2;
        if (keepBtn) { keepBtn.style.left = (P0.x + P0.w / 2) + 'px'; keepBtn.style.top = (ph ? midY - 27 : P0.y + 260) + 'px'; }
        if (holdBtn) { holdBtn.style.left = (P0.x + P0.w / 2) + 'px'; holdBtn.style.top = (ph ? midY : P0.y + 300) + 'px'; }
        if (G.chipBox) { Object.assign(G.chipBox.style, { left: (P0.x + (ph ? 4 : 0)) + 'px', width: (P0.w - (ph ? 8 : 0)) + 'px', top: 'auto', bottom: (ph ? M.H - (P0.y + P0.h) : M.H - (P0.y + 440)) + 'px' }); }
        if (letterEl) {
          if (ph) Object.assign(letterEl.style, { left: (M.win.x - 4) + 'px', top: (M.win.y - 4) + 'px', width: (M.win.w + 8) + 'px', maxHeight: (M.stillTop - 6 - M.win.y) + 'px' });
          else Object.assign(letterEl.style, { left: P0.x + 'px', top: (P0.y + 150) + 'px', width: P0.w + 'px', maxHeight: Math.max(200, M.strip.y - 40 - (P0.y + 150)) + 'px' });
          // a long letter writes a little smaller rather than spill past the paper
          letterEl.classList.remove('dense'); if (letterEl.scrollHeight > letterEl.clientHeight + 1) letterEl.classList.add('dense');
        }
      }

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        now: { Jolly: 'From up here, every turn looks obvious. Let’s go back to where you actually stood.', Cheeky: 'Hindsight: the one time everyone’s a genius. Let’s rewind.', Unfiltered: 'It looks obvious from here. It wasn’t. Rewind.' },
        nowNoWords: { Jolly: 'Think of a moment you keep judging yourself for. Let’s go back to it.', Cheeky: 'Got a moment you keep replaying? Let’s rewind to it.', Unfiltered: 'Pick a moment you judge yourself for. Rewind.' },
        arrive: { Jolly: 'There: the moment. Look how much you’ve carried back with you.', Cheeky: 'Back at the moment, with a suitcase of things you didn’t know yet.', Unfiltered: 'The moment. Plus everything you learned later.' },
        fogAsk: { Jolly: 'Tap everything past-you couldn’t have known yet. It goes to fog.', Cheeky: 'Only found it out later? Fog it.', Unfiltered: 'Fog what came later.' },
        fog1: { Jolly: 'See? That hadn’t happened yet.', Cheeky: 'Gone. It wasn’t there that day.', Unfiltered: 'Not there yet.' },
        knew: { Jolly: 'Past-you did have that one. It stays.', Cheeky: 'Nope, they had that one. Keep it.', Unfiltered: 'They had that. It stays.' },
        spoil: { Jolly: 'I can’t see any of that from here…', Cheeky: 'Who brought all these spoilers?', Unfiltered: 'I can’t see that.' },
        view: { Jolly: 'Yes. This is what I could see.', Cheeky: 'Ah. Now that’s my actual view.', Unfiltered: 'This is what I had.' },
        small: { Jolly: 'That’s the view you really had. Small, and foggy.', Cheeky: 'Cosy, isn’t it? That’s all past-you could see.', Unfiltered: 'That’s what you had.' },
        play: { Jolly: 'Now play it forward, with only that.', Cheeky: 'Roll it forward. No spoilers this time.', Unfiltered: 'Play it forward. Only that.' },
        inside: { Jolly: 'This was all there was to go on.', Cheeky: 'This was all there was to go on.', Unfiltered: 'This was all there was to go on.' },
        friend: { Jolly: 'Would you judge a friend who only had this to go on?', Cheeky: 'A friend shows you this exact view. Do you judge them?', Unfiltered: 'A friend had only this. Judge them?' },
        write: { Jolly: 'Then tell them. Kindly, and honestly.', Cheeky: 'Write to them. Fair, not fluffy.', Unfiltered: 'Write to them. Fair and true.' },
        sign: { Jolly: 'How do you sign it?', Cheeky: 'Sign it. Make it yours.', Unfiltered: 'Sign it.' },
        send: { Jolly: 'Fold it up and send it back down the reel.', Cheeky: 'Express post, to the past.', Unfiltered: 'Send it back.' },
        got: { Jolly: 'For me? Thank you.', Cheeky: 'Mail! From the future!', Unfiltered: 'Thank you.' },
        end: { Jolly: 'There. Fair to who you were.', Cheeky: 'Hindsight, put in its place.', Unfiltered: 'Fair. Finally.' },
        endOwn: { Jolly: 'Fair to who you were, and honest about what happened.', Cheeky: 'Kind and honest. Both at once. Rare.', Unfiltered: 'Fair, and honest.' },
        endStrong: { Jolly: 'Fair to who you were, with a next step for now.', Cheeky: 'Fair to then-you. Plan for now-you.', Unfiltered: 'Fair. Now the next step.' },
        endCare: { Jolly: 'Fair to who you were. Now the next step, with proper help.', Cheeky: 'Fair to who you were. Now the next step, with proper help.', Unfiltered: 'Fair to who you were. Now the next step, with proper help.' }
      };

      /* ---------------- flow ---------------- */
      async function nowStep() {
        G.phase = 'now'; G.bed = true;
        setCap('Today’s verdict', WD.verdict || 'A thought like “I should have seen it coming”', !!WD.verdict);
        sayS(noWords ? LINES.nowNoWords : LINES.now, 'think', 4600);
        pullGuide(false);
        await K.wait(300);
      }
      async function pullStep() {
        await new Promise(res => { const tick = () => { if (G.arrived) res(); else { if (G.phase === 'pull' && !cap.classList.contains('off') && G.sx < M.xN + M.off - M.win.w * 0.45) cap.classList.add('off'); S.later(tick, 80); } }; tick(); });
      }
      async function arriveStep() {
        setCap('The moment', WD.moment || 'The moment you keep coming back to', !!WD.moment);
        drop.base('sad');
        await K.wait(reduced() ? 300 : 700);
        buildTags();
        // the tags drift in from the "now" end, one by one, and hang over the moment
        TAGS.forEach((tg, i) => S.later(() => { tg.el.style.setProperty('--tx', '0px'); tg.el.style.setProperty('--ty', '0px'); tg.el.style.setProperty('--op', '1'); SFX.land(i); }, (reduced() ? 60 : 170) * i + 80));
        await K.wait((reduced() ? 60 : 170) * TAGS.length + 700);
        sayS(LINES.arrive, 'think', 3600);
        await K.wait(reduced() ? 500 : 900);
        await K.wait(reduced() ? 600 : 1100);
        G.phase = 'fog';
        sayS(LINES.fogAsk, 'calm', 0);
        fogGuide(false);
        await new Promise(res => { const tick = () => { if (G.phase === 'keep') res(); else S.later(tick, 80); }; tick(); });
      }
      async function playStep() {
        await K.wait(reduced() ? 400 : 900);
        G.phase = 'play';
        sayS(LINES.play, 'calm', 0);
        makeHold();
        K.guide({ id: 'hold', g: 'hold', target: holdBtn, label: 'HOLD TO PLAY IT ON', place: 'above', ms: 2200, delay: 900 });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { el.classList.toggle('wk-bright', isBright()); artKey = ''; });
      if (ctx.analysisReady && typeof ctx.analysisReady.then === 'function') ctx.analysisReady.then((a) => {
        if (!a || typeof a !== 'object' || G.arrived) return;
        an = a; readWords();
        if (G.phase === 'now' || G.phase === 'pull') { capT.textContent = WD.verdict || 'A thought like “I should have seen it coming”'; capT.className = WD.verdict ? 'gk-user' : ''; }
      }, () => {});
      (async () => {
        await K.intro({ title: 'What I Knew Then', sub: 'Looking back, it all seems obvious. It wasn’t.', how: 'Pull the reel back to the moment. Fog what you only learned later. Then play it forward.', char: 'still', mood: 'think' });
        await nowStep();
        await pullStep();
        await arriveStep();
        await playStep();
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(70); };
          await wait(() => G.phase === 'now' || G.phase === 'pull');
          await K.wait(1200);
          // pull the reel back the distance that's left, in a few strokes (the last one slow, so it settles into the moment)
          for (let i = 0; i < 8 && !G.arrived; i++) {
            const w = M.win, rem = G.sx - M.xT;
            if (Math.abs(rem) < 140 * M.s) break;
            const dist = Math.min(w.w * 0.7, rem), x0 = w.w * 0.12;
            await K.sim.drag(dragZone, { x: x0, y: w.h * 0.55 }, { x: x0 + dist, y: w.h * 0.55 }, dist >= w.w * 0.7 ? 520 : 1000, 14);
            await wait(() => G.arrived || Math.abs(G.vel) < 25, 2600);
          }
          await wait(() => G.arrived, 6000);
          await wait(() => G.phase === 'fog', 20000);
          await K.wait(900);
          for (const tg of TAGS.filter(x => x.kind === 'later')) { if (G.phase !== 'fog') break; await K.sim.tap(tg.el); await K.wait(700); }
          await wait(() => keepBtn && G.phase === 'fog', 8000);
          await K.wait(700);
          if (keepBtn) await K.sim.tap(keepBtn);
          await wait(() => G.phase === 'play' && holdBtn, 10000);
          await K.wait(900);
          if (holdBtn) await K.sim.hold(holdBtn, HOLD_MS + 500);
          await wait(() => G.phase === 'judge' && chipEls.length, 12000);
          await K.wait(1100);
          await K.sim.tap(chipEls[0]);
          await wait(() => G.phase === 'sign' && signEls.length, 25000);
          await K.wait(800);
          await K.sim.tap(signEls[0]);
          await wait(() => G.phase === 'send' && birdEl, 12000);
          await K.wait(900);
          if (birdEl) { const r = K.rectIn(birdEl), tp = dropPoint(); await K.sim.drag(birdEl, { x: r.w / 2, y: r.h / 2 }, { x: r.w / 2 + (tp.x - r.cx), y: r.h / 2 + (tp.y - r.cy) }, 900, 18); }
          await wait(() => G.done, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
