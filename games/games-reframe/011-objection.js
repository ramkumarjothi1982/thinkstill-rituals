/* 011 Objection! — Reframe · REFRAME · Beliefs / Evidence
 * Mechanism: catching thinking traps as they happen and naming them (Beck's cognitive restructuring; Burns 1980). The
 * player's own statement is read into the court record line by line; the traps (mind reading, fortune telling,
 * all-or-nothing, labels, shoulds, conclusions with no evidence) glow as they are spoken. Objecting at that moment and
 * naming the grounds loosens belief in the thought; the facts stay on the record because a camera could have caught them.
 * Then the defence states it fairly. Honest: when the facts back the worry, the verdict orders a plan instead.
 * Verb: object (tap OBJECTION! as a trap is spoken, pick the grounds; rapid-fire objections in the closing; put the fair
 * statement together). Finale: the jury whispers, NOT PROVEN slams down with the gavel, court papers fly and sunlight
 * pours through the tall windows; the law book records the grounds you used.
 */
(function (env) {
  'use strict';
  const GROUNDS = {
    spec: { name: 'Speculation', short: 'Speculation', tag: 'Mind reading', why: 'Guessing what’s in someone else’s head.' },
    pred: { name: 'Calls for a prediction', short: 'Prediction', tag: 'Fortune telling', why: 'A guess about the future, stated as fact.' },
    over: { name: 'Overreach', short: 'Overreach', tag: 'All-or-nothing', why: 'Always, never, everyone: wider than the facts.' },
    label: { name: 'Name-calling', short: 'Name-calling', tag: 'Labelling', why: 'A label instead of what actually happened.' },
    facts: { name: 'Not in evidence', short: 'No evidence', tag: 'Jumping to conclusions', why: 'A conclusion the facts don’t show.' },
    should: { name: 'Should-ing', short: 'Should-ing', tag: 'Rigid rule', why: 'A rule dressed up as a fact.' }
  };
  const GKEYS = ['spec', 'pred', 'over', 'label', 'facts', 'should'];
  const DMAP = { mind_reading: 'spec', fortune_telling: 'pred', catastrophising: 'pred', all_or_nothing: 'over', overgeneralising: 'over', magnifying: 'over', labelling: 'label', should: 'should', emotional_reasoning: 'facts', personalising: 'facts', discounting_positive: 'facts', filtering: 'facts' };
  const AP = "['’]";
  const RX = {
    spec: new RegExp("\\b(thinks?|thought|knows?) (i" + AP + "?m|i am|i was|of me|that i|i" + AP + "ll)\\b|\\b(hates?|hated) (me|us)\\b|\\b(annoyed|mad|angry|upset|furious|fed up|disappointed) (at|with|in) (me|us)\\b|\\b(sick|tired|bored) of me\\b|\\bjudg\\w* me\\b|\\blaughing at me\\b|\\blosing interest\\b|\\b(doesn" + AP + "?t|don" + AP + "?t) (like|care about|want|rate|respect) (me|us)\\b|\\bignoring me\\b|\\bon purpose\\b|\\b(everyone|everybody|they|people|nobody|no one) (\\w+ )?(thinks?|noticed|saw|knows?|judg\\w*)\\b|\\bmust (think|hate|be (annoyed|mad|angry|sick|bored))\\b", 'i'),
    pred: new RegExp("\\b(going to|gonna|bound to|about to|definitely getting|will (never|be|get|lose|fail|hate|end|ruin)|won" + AP + "?t (ever|be|get)|never (live|get|be|recover|forget|find|make)|\\w+" + AP + "ll (never|be|get|lose|fail|hate|ruin|end|mess|freeze))\\b", 'i'),
    label: new RegExp("\\b(i" + AP + "?m|i am|i was|i feel like) (a |an |such a |such an |so |the |a total |a complete |totally |completely |just a |an absolute )?(failure|idiot|loser|mess|disaster|joke|fraud|burden|stupid|useless|pathetic|worthless|incompetent|annoying|embarrassing|hopeless|cringe|weirdo|freak|moron|fool|dumb|clown)\\b|\\b(what an?|such an?) (idiot|loser|mess|joke|fool|failure)\\b", 'i'),
    should: new RegExp("\\b(should(n" + AP + "?t)?|ought to|supposed to)\\b|\\b(have|has) to (be|have|get|do)\\b", 'i'),
    over: /\b(always|never|everyone|everybody|nobody|no one|nothing|everything|every time|all the time|completely|totally|ruined|forever)\b/i
  };
  const COURTS = [
    { key: 'day', name: 'Day Court',
      dark: { wall0: '#2e1d15', wall1: '#3f281b', panel: '#2a170e', panelLine: '#4b2d1b', wood: '#5c3320', woodHi: '#86532f', woodLo: '#2c170c', brass: '#e0ac52', sky0: '#ffcf8f', sky1: '#ee8a5c', frame: '#1b100a', floor0: '#2a1810', floor1: '#120a06', carpet: '#6e1824', carpetHi: '#8d2434', beam: '#ffd9a0', tense: '#0a1230', accent: '#e0ac52' },
      bright: { wall0: '#f1e6cf', wall1: '#e4d1ab', panel: '#b88956', panelLine: '#d1a675', wood: '#93603a', woodHi: '#b77a49', woodLo: '#62391f', brass: '#a8741f', sky0: '#9fd6ff', sky1: '#e8f6ff', frame: '#6d4a2c', floor0: '#d0ab7e', floor1: '#a8835a', carpet: '#a52a3b', carpetHi: '#c2404f', beam: '#fff2c4', tense: '#4a5878', accent: '#b8832a' } },
    { key: 'night', name: 'Night Court',
      dark: { wall0: '#111a30', wall1: '#1b2643', panel: '#141c31', panelLine: '#2a3657', wood: '#43302b', woodHi: '#6a4a3e', woodLo: '#1f1513', brass: '#d4b46a', sky0: '#0a1230', sky1: '#24366c', frame: '#090d1c', floor0: '#161d2e', floor1: '#090c16', carpet: '#33275e', carpetHi: '#46387e', beam: '#cfe0ff', tense: '#03050d', accent: '#7cf0a8', lamp: '#8ff5b5' },
      bright: { wall0: '#dfe3f3', wall1: '#c9d0ea', panel: '#727ea6', panelLine: '#8f9ac0', wood: '#71503f', woodHi: '#93695a', woodLo: '#4c3229', brass: '#9a7428', sky0: '#33468a', sky1: '#9db0e6', frame: '#3a4468', floor0: '#a2abc9', floor1: '#7f88ad', carpet: '#5d4d93', carpetHi: '#7062a8', beam: '#eef3ff', tense: '#2a3152', accent: '#2f9e64', lamp: '#5fe39a' } },
    { key: 'rooftop', name: 'Rooftop Court',
      dark: { wall0: '#1d1748', wall1: '#d0606e', panel: '#2a2040', panelLine: '#3a2d58', wood: '#6b3f2a', woodHi: '#95603f', woodLo: '#3a2014', brass: '#f0b85a', sky0: '#1d1748', sky1: '#f08a6a', frame: '#141030', floor0: '#3b2b29', floor1: '#1c1312', carpet: '#7a2a3a', carpetHi: '#9a3a4e', beam: '#ffc08a', tense: '#0b0820', accent: '#ffd36b', skyline: '#150f30', sun: '#ffd27a' },
      bright: { wall0: '#6ec0ff', wall1: '#ffe0b5', panel: '#8fa7c9', panelLine: '#a8bddb', wood: '#9a6438', woodHi: '#bd8352', woodLo: '#6a4024', brass: '#a8741f', sky0: '#6ec0ff', sky1: '#ffe9c9', frame: '#4d5f82', floor0: '#c9a27a', floor1: '#a17b55', carpet: '#c0374c', carpetHi: '#d8566a', beam: '#fff3cf', tense: '#5a6a8a', accent: '#e6a23a', skyline: '#7f93b6', sun: '#fff1b0' } },
    { key: 'tiny', name: 'Tiny Claims Court',
      dark: { wall0: '#2b2036', wall1: '#3b2c48', panel: '#33263f', panelLine: '#4b3a5c', wood: '#6a4a7a', woodHi: '#8d6aa0', woodLo: '#3a2846', brass: '#ffd36b', sky0: '#ff9fc4', sky1: '#ffd9e8', frame: '#21162a', floor0: '#3a2c46', floor1: '#1d1524', carpet: '#c94d6d', carpetHi: '#e06d8a', beam: '#ffe0f0', tense: '#140c1d', accent: '#ff9ec2', books: ['#e9707a', '#6cc3b5', '#f2c14e', '#7d8ce0', '#f29e6c'] },
      bright: { wall0: '#fff1e6', wall1: '#fbdcd0', panel: '#f1b9a8', panelLine: '#f7cdbf', wood: '#c48a6a', woodHi: '#dba47f', woodLo: '#94604a', brass: '#b37c16', sky0: '#a8dcff', sky1: '#f0f9ff', frame: '#a06a54', floor0: '#f3cdb6', floor1: '#dcae94', carpet: '#e0607e', carpetHi: '#f07f99', beam: '#fff6d6', tense: '#6a5470', accent: '#e0607e', books: ['#e9707a', '#4fb3a4', '#e8b33a', '#6c7bd6', '#ef8f5c'] } }
  ];
  /* No GPU (VMs, blocklisted devices): canvas pixels are rasterised on the CPU, so the canvases run at 1x there. */
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
  const SERIF = "'Playfair Display', Didot, 'Bodoni 72', Georgia, 'TeX Gyre Bonum', 'DejaVu Serif', serif";
  const BURST = (() => { const pts = [], n = 26; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.68 : 1, j = 0.86 + ((i * 37) % 11) / 40; pts.push([Math.cos(a) * r * j, Math.sin(a) * r * j]); } return pts; })();
  const BFONT = "Bangers, Impact, 'Arial Narrow Bold', 'TeX Gyre Heros Cn', 'DejaVu Sans Condensed', sans-serif";

  (env.games = env.games || []).push({
    id: 'objection', mode: 'reframe', name: 'Objection!', verb: 'object', family: 'REFRAME', minutes: 2,
    parents: ['Beliefs / Evidence', 'Inner Speech / Mental Text', 'Social / Team / Perspective'],
    cast: ['glitch', 'patch', 'still'], poster: { char: 'glitch', mood: 'determined' },
    fonts: ['Bangers', 'Playfair+Display:ital,wght@0,700;0,900;1,700;1,900', 'Lora:ital,wght@0,500;0,600;1,500'],
    tagline: 'Your inner critic is prosecuting. Shout OBJECTION! at every trap.',
    why: 'For a harsh inner voice: catch each thinking trap as it’s said, name it, then say it fairly.',
    css: `
.g-objection { --oj-paper: #fbf5e6; --oj-paper2: #efe1c2; --oj-ink: #2b1a10; --oj-red: #c8102e; --oj-gold: #f2c25a;
  --oj-burst: 'Bangers', Impact, Haettenschweiler, 'Arial Narrow Bold', 'TeX Gyre Heros Cn', 'DejaVu Sans Condensed', sans-serif;
  --oj-serif: 'Playfair Display', Didot, 'Bodoni 72', Georgia, 'TeX Gyre Bonum', 'DejaVu Serif', serif;
  --oj-text: 'Lora', Georgia, 'Iowan Old Style', 'Times New Roman', 'Liberation Serif', serif; }
.g-objection .oj-fx { z-index: 36; }
.g-objection .oj-rec { position: absolute; z-index: 12; display: flex; flex-direction: column; border-radius: 10px; overflow: hidden; color: var(--oj-ink);
  background: linear-gradient(180deg, var(--oj-paper), var(--oj-paper2)); box-shadow: 0 0 0 1px rgba(70, 40, 15, .45), 0 0 0 6px rgba(36, 20, 10, .5), 0 22px 44px rgba(0, 0, 0, .5), inset 0 0 50px rgba(150, 100, 40, .16);
  transition: opacity .6s ease, transform .6s cubic-bezier(.3, .9, .3, 1), filter .4s ease; }
.g-objection .oj-rec.dim { filter: brightness(.42) saturate(.6); }
.g-objection.oj-bright .oj-rec.dim { filter: brightness(.68) saturate(.5) contrast(.9); }
.g-objection .oj-rec.gone { opacity: 0; transform: translateY(16px) scale(.96); pointer-events: none; }
.g-objection .oj-rhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 12px 8px; border-bottom: 3px double rgba(110, 60, 25, .4); }
.g-objection .oj-rtitle { font: 700 12px/1.2 var(--oj-serif); letter-spacing: .1em; text-transform: uppercase; color: #6d3b1b; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.g-objection .oj-doubt { display: flex; align-items: center; gap: 7px; flex: none; }
.g-objection .oj-doubt em { font: 700 12px/1 var(--font-ui); font-style: normal; letter-spacing: .08em; text-transform: uppercase; color: #8a5a32; }
.g-objection .oj-doubt i { position: relative; display: block; width: 70px; height: 10px; border-radius: 6px; background: rgba(90, 50, 20, .18); box-shadow: inset 0 1px 2px rgba(0, 0, 0, .25); overflow: hidden; }
.g-objection .oj-doubt b { position: absolute; inset: 0; transform-origin: 0 50%; transform: scaleX(var(--k, 0)); background: linear-gradient(90deg, #e39a2a, #ffd36b); transition: transform .8s cubic-bezier(.2, 1.4, .4, 1); }
.g-objection .oj-charge { padding: 7px 12px 8px; font: italic 500 15px/1.3 var(--oj-text); color: #4f2612; border-bottom: 1px solid rgba(110, 60, 25, .22); }
.g-objection .oj-charge small { font: 700 12px/1 var(--oj-serif); font-style: normal; letter-spacing: .12em; text-transform: uppercase; color: var(--oj-red); margin-right: 7px; }
.g-objection .oj-charge span { transition: color .6s ease; text-decoration: line-through; text-decoration-color: transparent; text-decoration-thickness: 2px; }
.g-objection .oj-charge.shaky span { text-decoration-color: rgba(200, 16, 46, .7); color: #8a6a58; }
.g-objection .oj-body { position: relative; flex: 1; min-height: 0; overflow: hidden;
  background: linear-gradient(90deg, transparent 40px, rgba(196, 50, 50, .3) 40px 41px, transparent 41px 44px, rgba(196, 50, 50, .3) 44px 45px, transparent 45px), repeating-linear-gradient(180deg, transparent 0 35px, rgba(90, 120, 160, .13) 35px 36px); background-position: 0 0, 0 4px; }
.g-objection .oj-scroll { position: absolute; left: 0; right: 0; top: 0; padding: 8px 14px 16px 0; transition: transform .5s cubic-bezier(.2, .9, .3, 1); }
.g-objection .oj-wait { position: absolute; left: 54px; right: 16px; top: 14px; font: italic 500 15px/1.45 var(--oj-text); color: #8a6a4a; animation: objection-breathe 2.4s ease-in-out infinite; }
@keyframes objection-breathe { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
.g-objection .oj-line { position: relative; display: grid; grid-template-columns: 40px 1fr; column-gap: 14px; padding: 5px 0 6px; }
.g-objection .oj-num { font: 600 12px/26px var(--oj-text); color: #a2754e; text-align: right; padding-right: 6px; }
.g-objection .oj-text { font: 500 17px/1.5 var(--oj-text); color: var(--oj-ink); }
.g-objection .oj-text.gk-user { font-size: 17px; font-weight: 500; }
.g-objection .oj-w { opacity: 0; transition: opacity .14s ease; }
.g-objection .oj-w.on { opacity: 1; }
.g-objection .oj-hot { border-radius: 4px; padding: 1px 3px; margin: 0 -3px; -webkit-box-decoration-break: clone; box-decoration-break: clone;
  background-image: linear-gradient(#c8102e, #c8102e); background-repeat: no-repeat; background-position: 0 58%; background-size: 0% 3px; transition: background-color .35s ease, box-shadow .35s ease, color .35s ease; }
.g-objection .oj-hot.glow .oj-w.on { background-color: rgba(255, 168, 40, calc(.16 + var(--pulse, 0) * .2)); box-shadow: 0 0 calc(5px + var(--pulse, 0) * 9px) rgba(255, 150, 30, .32); }
.g-objection .oj-hot.again .oj-w.on { background-color: rgba(255, 150, 30, calc(.32 + var(--pulse, 0) * .22)); box-shadow: 0 0 0 1px rgba(240, 130, 20, .55), 0 0 14px rgba(255, 150, 40, .45); }
.g-objection .oj-hot.struck .oj-w { background-color: transparent; box-shadow: none; }
.g-objection .oj-hot.struck { background-color: rgba(200, 16, 46, .07); box-shadow: none; color: #7c5b48; background-size: 100% 3px; transition: background-size .55s cubic-bezier(.7, 0, .2, 1), background-color .3s ease, color .3s ease; }
.g-objection .oj-mark { display: inline-block; vertical-align: 2px; margin-left: 8px; padding: 3px 6px 2px; border: 2px solid currentColor; border-radius: 4px; font: 800 12px/1 var(--oj-serif); letter-spacing: .08em; text-transform: uppercase; transform: rotate(-5deg); animation: objection-stampin .4s cubic-bezier(.2, 1.6, .4, 1) backwards; white-space: nowrap; }
.g-objection .oj-mark.st { color: #c8102e; }
.g-objection .oj-mark.rc { color: #3f6a7c; }
.g-objection .oj-mark.gd { color: #1f7a48; }
@keyframes objection-stampin { from { opacity: 0; transform: rotate(-5deg) scale(1.5); } to { opacity: 1; transform: rotate(-5deg) scale(1); } }
.g-objection .oj-defl { margin-top: 4px; padding-top: 6px; border-top: 1px dashed rgba(110, 60, 25, .35); }
.g-objection .oj-defl small { display: block; font: 700 12px/1.2 var(--oj-serif); letter-spacing: .12em; text-transform: uppercase; color: #1f7a48; margin-bottom: 4px; }
.g-objection .oj-slot { display: inline-block; min-width: 54px; margin: 2px 3px 2px 0; padding: 0 8px; border: 2px dashed #b58b5a; border-radius: 8px; font: 700 15px/30px var(--oj-text); color: #b58b5a; text-align: center; vertical-align: middle; transition: background-color .3s ease, border-color .3s ease; }
.g-objection .oj-slot.next { border-color: #e39a2a; background: rgba(255, 190, 70, .2); animation: objection-slotpulse 1.2s ease-in-out infinite; }
.g-objection .oj-slot.full { display: inline; border: 0; padding: 0 2px; margin: 0; font: 600 17px/1.5 var(--oj-text); color: #17482d; background: rgba(255, 205, 90, .22); border-radius: 4px; -webkit-box-decoration-break: clone; box-decoration-break: clone; animation: objection-fill .5s cubic-bezier(.2, 1.4, .4, 1); text-align: left; vertical-align: baseline; }
.g-objection .oj-slot.full.lit { background: rgba(255, 205, 90, .55); box-shadow: 0 0 14px rgba(255, 200, 80, .55); }
@keyframes objection-slotpulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(227, 154, 42, .0); } 50% { box-shadow: 0 0 0 4px rgba(227, 154, 42, .25); } }
@keyframes objection-fill { from { background-color: rgba(255, 220, 120, .9); } to { background-color: rgba(255, 205, 90, .22); } }
.g-objection .oj-obj { position: absolute; z-index: 32; transform: translateX(-50%); border: 0; border-radius: 22px; cursor: pointer; touch-action: manipulation; padding: 0 14px; color: #fff;
  background: radial-gradient(120% 140% at 50% 0%, #ff6152 0%, #d4162c 46%, #8e0b1c 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px;
  box-shadow: 0 6px 0 #5a0610, 0 14px 30px rgba(0, 0, 0, .45), inset 0 2px 0 rgba(255, 255, 255, .35); transition: transform .08s ease, box-shadow .08s ease; }
.g-objection .oj-obj::before { content: ""; position: absolute; inset: -5px; border-radius: 26px; box-shadow: 0 0 30px 10px rgba(255, 196, 70, .85), 0 0 0 3px rgba(255, 220, 120, .9); opacity: var(--hot, 0); pointer-events: none; will-change: opacity; }
.g-objection .oj-obj b { font: 400 40px/0.9 var(--oj-burst); letter-spacing: .05em; color: #ffe14d; -webkit-text-stroke: 2px #2a0a05; paint-order: stroke fill; text-shadow: 0 3px 0 #2a0a05; }
.g-objection .oj-obj small { font: 700 12px/1 var(--font-ui); letter-spacing: .14em; text-transform: uppercase; color: #ffe5dc; }
.g-objection .oj-obj.press { transform: translateX(-50%) translateY(5px) scale(.985); box-shadow: 0 1px 0 #5a0610, 0 8px 18px rgba(0, 0, 0, .4), inset 0 2px 0 rgba(255, 255, 255, .3); }
.g-objection .oj-obj:focus-visible { outline: 3px solid #ffd36b; outline-offset: 4px; }
.g-objection .oj-grounds { position: absolute; z-index: 33; display: flex; flex-direction: column; gap: 6px; }
.g-objection .oj-grounds.row { flex-direction: row; gap: 14px; }
.g-objection .oj-g { appearance: none; border: 0; cursor: pointer; flex: 1 1 0; min-height: 48px; text-align: left; padding: 6px 14px 7px; border-radius: 13px; color: var(--oj-ink);
  background: linear-gradient(180deg, #fffaf0, #f1e2c2); box-shadow: 0 3px 0 #b08550, 0 10px 22px rgba(0, 0, 0, .42); display: flex; flex-direction: column; justify-content: center; gap: 2px;
  animation: objection-cardin .42s cubic-bezier(.2, 1.4, .4, 1) backwards; transition: opacity .25s ease, transform .2s ease, box-shadow .2s ease, background .3s ease; }
.g-objection .oj-g:nth-child(2) { animation-delay: .06s; }
.g-objection .oj-g:nth-child(3) { animation-delay: .12s; }
.g-objection .oj-g b { font: 900 16px/1.15 var(--oj-serif); letter-spacing: .01em; }
.g-objection .oj-g b em { font: 700 12px/1 var(--font-ui); font-style: normal; letter-spacing: .08em; text-transform: uppercase; color: #9a5a1c; margin-left: 7px; white-space: nowrap; }
.g-objection .oj-g span { font: 500 13px/1.25 var(--oj-text); color: #5a3a24; }
.g-objection .oj-g:active { transform: scale(.97); }
.g-objection .oj-g.no { opacity: .62; transform: scale(.97); pointer-events: none; background: linear-gradient(180deg, #e9eef3, #d6dee6); box-shadow: 0 1px 0 #8a9aa8; }
.g-objection .oj-g.no span { color: #36526a; font-style: italic; }
.g-objection .oj-g.yes { box-shadow: 0 0 0 3px #2fbf71, 0 0 22px rgba(47, 191, 113, .55), 0 10px 22px rgba(0, 0, 0, .42); }
.g-objection .oj-g:focus-visible { outline: 3px solid #ffd36b; outline-offset: 2px; }
.g-objection.oj-wide .oj-g { padding: 12px 16px 13px; gap: 5px; }
.g-objection.oj-wide .oj-g b { font-size: 19px; }
.g-objection.oj-wide .oj-g span { font-size: 15px; }
@keyframes objection-cardin { from { opacity: 0; transform: translateY(18px) scale(.94); } to { opacity: 1; transform: none; } }
.g-objection .oj-ruling { position: absolute; z-index: 37; transform: translate(-50%, -50%) rotate(-4deg); padding: 9px 22px 11px; border: 5px double currentColor; border-radius: 12px; text-align: center; pointer-events: none;
  font: italic 900 34px/1 var(--oj-serif); background: rgba(255, 250, 236, .95); box-shadow: 0 16px 34px rgba(0, 0, 0, .45); animation: objection-stamp .42s cubic-bezier(.2, 1.6, .4, 1) backwards; white-space: nowrap; }
.g-objection .oj-ruling.sus { color: #1c7f47; }
.g-objection .oj-ruling.ovr { color: #3f5a76; font-size: 28px; }
.g-objection .oj-ruling small { display: block; font: 700 12px/1.2 var(--font-ui); font-style: normal; letter-spacing: .12em; text-transform: uppercase; margin-top: 5px; color: #5a3a24; }
.g-objection .oj-ruling.out { animation: objection-out .3s ease forwards; }
@keyframes objection-stamp { from { opacity: 0; transform: translate(-50%, -50%) rotate(-4deg) scale(1.35); } to { opacity: 1; transform: translate(-50%, -50%) rotate(-4deg) scale(1); } }
@keyframes objection-out { to { opacity: 0; transform: translate(-50%, -60%) rotate(-4deg) scale(.92); } }
.g-objection .oj-fly { position: absolute; z-index: 35; transform: translate(-50%, -50%); width: max-content; max-width: min(360px, calc(100% - 44px)); padding: 14px 18px 15px; border-radius: 14px; text-align: center;
  font: 600 21px/1.28 var(--oj-text); color: var(--oj-ink); background: linear-gradient(180deg, #fffaf0, #efdfbd); box-shadow: 0 0 0 2px #b8925a, 0 18px 34px rgba(0, 0, 0, .5); animation: objection-flyin .3s cubic-bezier(.2, 1.4, .4, 1) backwards; }
.g-objection .oj-fly .gk-user { font-size: 21px; font-weight: 600; }
.g-objection .oj-fly.hot { box-shadow: 0 0 0 2px #e39a2a, 0 0 calc(12px + var(--pulse, 0) * 16px) rgba(255, 150, 30, .6), 0 18px 34px rgba(0, 0, 0, .5); background: linear-gradient(180deg, #fff6e3, #f7deb0); }
.g-objection .oj-fly small { display: block; margin-bottom: 7px; font: 700 12px/1 var(--font-ui); letter-spacing: .14em; text-transform: uppercase; color: #8a5a32; }
.g-objection .oj-fly.smash { animation: objection-smash .5s ease-out forwards; }
.g-objection .oj-fly.pass { animation: objection-pass .45s ease-in forwards; }
.g-objection .oj-fly .oj-mark { position: absolute; right: -6px; top: -12px; background: #fffaf0; }
@keyframes objection-flyin { from { opacity: 0; transform: translate(-50%, -50%) scale(.6) rotate(4deg); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes objection-smash { 0% { transform: translate(-50%, -50%) scale(1); } 30% { transform: translate(-50%, -50%) scale(1.05) rotate(-3deg); filter: brightness(1.25); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(.7) rotate(8deg); } }
@keyframes objection-pass { to { opacity: 0; transform: translate(-50%, -40%) scale(.9); } }
.g-objection .oj-frags { position: absolute; z-index: 33; display: flex; flex-wrap: wrap; align-content: center; justify-content: center; gap: 9px; }
.g-objection .oj-frag { appearance: none; border: 0; cursor: grab; touch-action: none; border-radius: 12px; padding: 10px 14px; min-height: 48px; max-width: 100%; text-align: left;
  background: linear-gradient(180deg, #fffaf0, #f1e2c2); color: var(--oj-ink); font: 600 15px/1.3 var(--oj-text); box-shadow: 0 3px 0 #b08550, 0 10px 22px rgba(0, 0, 0, .42); animation: objection-cardin .45s cubic-bezier(.2, 1.4, .4, 1) backwards; transition: opacity .25s ease, transform .2s ease; }
.g-objection .oj-frag:nth-child(2) { animation-delay: .07s; }
.g-objection .oj-frag:nth-child(3) { animation-delay: .14s; }
.g-objection .oj-frag.lift { opacity: .3; }
.g-objection .oj-frag.used { opacity: 0; transform: scale(.85); pointer-events: none; }
.g-objection .oj-frag.nope { animation: objection-nope .45s ease; }
.g-objection .oj-frag:focus-visible { outline: 3px solid #ffd36b; outline-offset: 2px; }
.g-objection .oj-ghost { position: absolute; z-index: 39; pointer-events: none; margin: 0; transform: rotate(-2deg) scale(1.05); box-shadow: 0 3px 0 #b08550, 0 24px 36px rgba(0, 0, 0, .55); animation: none; }
@keyframes objection-nope { 0%, 100% { transform: none; } 20% { transform: translateX(-8px) rotate(-2deg); } 45% { transform: translateX(7px) rotate(2deg); } 70% { transform: translateX(-4px); } }
.g-objection .oj-verdict { position: absolute; z-index: 38; transform: translate(-50%, -50%) rotate(-4deg); width: max-content; max-width: calc(100% - 30px); text-align: center; padding: 12px 20px 14px; border: 6px double #b0122b; border-radius: 14px; color: #b0122b;
  background: linear-gradient(180deg, rgba(255, 251, 238, .97), rgba(246, 234, 205, .97)); box-shadow: 0 22px 50px rgba(0, 0, 0, .5); animation: objection-slam .55s cubic-bezier(.2, 1.6, .35, 1) backwards; pointer-events: none; }
.g-objection .oj-verdict.plan { color: #1d6a8a; border-color: #1d6a8a; }
.g-objection .oj-verdict small { display: block; font: 700 12px/1.25 var(--oj-serif); letter-spacing: .12em; text-transform: uppercase; color: #6b3a1c; }
.g-objection .oj-verdict small s { text-decoration-color: rgba(176, 18, 43, .8); text-decoration-thickness: 2px; text-transform: none; letter-spacing: .02em; font-style: italic; }
.g-objection .oj-verdict b { display: block; margin: 6px 0 4px; font: italic 900 clamp(38px, 11.5cqw, 70px)/0.95 var(--oj-serif); letter-spacing: .01em; text-wrap: balance; }
.g-objection .oj-verdict span { display: block; max-width: 34ch; margin: 6px auto 0; font: 600 15px/1.35 var(--oj-text); color: #2b1a10; text-wrap: balance; }
.g-objection .oj-verdict span.ad { font: 700 13px/1.3 var(--font-ui); color: #1d6a8a; }
@keyframes objection-slam { 0% { opacity: 0; transform: translate(-50%, -80%) rotate(-4deg) scale(1.12); } 60% { opacity: 1; transform: translate(-50%, -50%) rotate(-4deg) scale(.97); } 100% { opacity: 1; transform: translate(-50%, -50%) rotate(-4deg) scale(1); } }
.g-objection .oj-book { position: absolute; z-index: 37; transform: translateX(-50%); width: min(500px, calc(100% - 28px)); padding: 7px; border-radius: 12px; background: linear-gradient(180deg, #6a2418, #4a160e); box-shadow: 0 0 0 2px #2a0a05, 0 20px 40px rgba(0, 0, 0, .5); animation: objection-book .6s cubic-bezier(.2, 1.3, .4, 1) backwards; pointer-events: none; }
.g-objection .oj-page { border-radius: 7px; padding: 9px 12px 10px; background: linear-gradient(180deg, #fffaf0, #f0e3c5); color: var(--oj-ink); }
.g-objection .oj-bhead { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; border-bottom: 2px solid rgba(110, 60, 25, .3); padding-bottom: 6px; margin-bottom: 6px; }
.g-objection .oj-bhead b { font: 900 17px/1 var(--oj-serif); }
.g-objection .oj-bhead span { font: 700 12px/1.2 var(--font-ui); letter-spacing: .06em; text-transform: uppercase; color: #8a5a32; text-align: right; }
.g-objection .oj-blist { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 3px 12px; }
.g-objection .oj-blist li { display: flex; justify-content: space-between; gap: 6px; font: 600 14px/1.55 var(--oj-text); color: #b9a58a; white-space: nowrap; }
.g-objection .oj-blist li.on { color: #2b1a10; }
.g-objection .oj-blist li.on.new i { color: #1f7a48; }
.g-objection .oj-blist li i { font-style: normal; font-weight: 700; color: #a2754e; }
.g-objection .oj-blist li.on i { color: #c8102e; }
.g-objection .oj-bfoot { margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(110, 60, 25, .35); font: 700 12px/1.3 var(--font-ui); letter-spacing: .06em; text-transform: uppercase; color: #6b3a1c; text-align: center; }
@keyframes objection-book { from { opacity: 0; transform: translateX(-50%) translateY(26px) rotateX(40deg); } to { opacity: 1; transform: translateX(-50%); } }
.g-objection .oj-c-judge .gk-bubble { max-width: min(280px, calc(50cqw - var(--sz, 60px) / 2 - 24px)); }
.g-objection .oj-c-pros.gk-side-below .gk-bubble { left: auto; right: 0; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const TAU = Math.PI * 2, clamp = K.clamp, lerp = K.lerp, hexA = K.hexA, now = () => performance.now();
      const inten = ctx.intensity, RM = () => K.reduced(), visits = K.visits(), bright = () => S.scene() === 'bright';
      const L = (o, sub) => { let s = ctx.line(o) || ''; if (sub) Object.keys(sub).forEach(k => { s = s.split('{' + k + '}').join(sub[k]); }); return s; };
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.55 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const text = String(ctx.text || '');
      const care = an.safety === 'care';
      const support = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const lead = (k) => clip((leads.find(l => l.kind === k) || leads[0] || { text: 'Ask one simple question that would fill the biggest gap.' }).text, 110);
      let devCourt = null; try { if (S.isDev && S.isDev()) devCourt = new URLSearchParams(window.location.search).get('court'); } catch (e) { /* no query */ }
      const COURT = COURTS.find(c => c.key === devCourt) || K.dailyPick(COURTS, 3);
      const UIFONT = (getComputedStyle(el).getPropertyValue('--font-ui') || '').trim() || 'system-ui, sans-serif';
      const pal = () => COURT[bright() ? 'bright' : 'dark'];
      let PAL = pal();

      /* ---------------- the case: the player's own words, line by line ---------------- */
      const wordsOf = (q) => { const out = [], re = /\S+/g; let m; while ((m = re.exec(q))) out.push({ w: m[0], a: m.index, b: m.index + m[0].length }); return out; };
      const clipW = (s, n) => { const w = String(s).trim().split(/\s+/); return w.length <= n ? w.join(' ') : w.slice(0, n).join(' ') + '…'; };
      function classify(q) {
        const valid = new Set(); let primary = null, hot = null;
        if (an.source === 'ai' && Array.isArray(an.distortions)) an.distortions.forEach(d => {
          const g = d && DMAP[d.type], dq = d && typeof d.quote === 'string' ? d.quote.replace(/…+$/, '').trim() : '';
          if (!g || dq.length < 2) return;
          const i = q.toLowerCase().indexOf(dq.toLowerCase()); if (i < 0) return;
          valid.add(g); if (!primary) { primary = g; hot = [i, i + dq.length]; }
        });
        let grow = false;
        ['spec', 'pred', 'label', 'should', 'over'].forEach(k => { const m = RX[k].exec(q); if (!m) return; valid.add(k); if (!primary) { primary = k; hot = [m.index, m.index + m[0].length]; grow = true; } });
        if (!primary) { primary = 'facts'; hot = [0, q.length]; }
        valid.add(primary);
        return { primary, valid, hot, grow };
      }
      function mkLine(q, kind, user) {
        const words = wordsOf(q), ln = { text: q, kind, user, words };
        if (kind === 'brain') {
          const c = classify(q); ln.primary = c.primary; ln.valid = c.valid;
          let a = words.findIndex(w => w.b > c.hot[0]), b = -1;
          words.forEach((w, i) => { if (w.a < c.hot[1]) b = i; });
          if (a < 0) a = 0; if (b < a) b = words.length - 1;
          if (c.grow) { b = Math.min(words.length - 1, b + 3); if (words.length - 1 - b <= 1) b = words.length - 1; if (a <= 1) a = 0; }
          ln.hot = [a, b];
        }
        return ln;
      }
      const FLOURISH = [{ text: 'Everyone can see it!', g: 'over' }, { text: 'It’s obvious!', g: 'facts' }, { text: 'It’ll always be like this!', g: 'pred' }];
      function hotSnippet(l) { const n = l.words.length, s = Math.max(0, Math.min(l.hot[0], n - 7)); return clipW(l.words.slice(s).map(w => w.w).join(' '), 7); }
      function classicCase() {
        const all = [['camera', 'Someone hasn’t replied to my message yet.'], ['brain', 'They’re obviously annoyed with me.'], ['brain', 'I always mess things up.'], ['brain', 'It’s going to be awkward forever.'], ['brain', 'I’m such an idiot.'], ['brain', 'I should have known better.']];
        const use = [all[0]].concat(all.slice(1, 1 + [3, 4, 5][inten]));
        const lines = use.map(([k, q]) => mkLine(q, k, false));
        return { classic: true, lines, hot: lines.filter(l => l.kind === 'brain').map(l => ({ text: hotSnippet(l), user: false, g: l.primary })), facts: [{ text: 'Someone hasn’t replied yet.', user: false }, { text: 'The message went at 6pm.', user: false }], charge: 'You’re an idiot who always messes things up.', fair: 'One slow reply isn’t proof of anything. I can wait, or simply ask.' };
      }
      function buildCase() {
        if (!text.trim()) return classicCase();
        const lower = text.toLowerCase();
        let sp = (Array.isArray(an.spans) ? an.spans : []).map(s => {
          const q = s && typeof s.quote === 'string' ? s.quote.trim() : '';
          if (q.split(/\s+/).length < 2) return null;
          let at = text.indexOf(q); if (at < 0) at = lower.indexOf(q.toLowerCase()); if (at < 0) return null;
          let end = at + q.length; while (end < text.length && /[.!?…]/.test(text[end])) end++;
          return { at, end, kind: s.kind === 'camera' ? 'camera' : 'brain' };
        }).filter(Boolean).sort((a, b) => a.at - b.at);
        const kept = []; sp.forEach(s => { if (!kept.length || s.at >= kept[kept.length - 1].end) kept.push(s); });
        sp = kept;
        if (!sp.length) return classicCase();
        const capB = [2, 3, 4][inten], capC = [1, 2, 2][inten];
        let br = sp.filter(s => s.kind === 'brain'), cam = sp.filter(s => s.kind === 'camera');
        if (br.length > capB) br = br.slice(0, capB - 1).concat(br.slice(-1));
        cam = cam.slice(0, capC);
        const lines = br.concat(cam).sort((a, b) => a.at - b.at).map(s => mkLine(text.slice(s.at, s.end), s.kind, true));
        if (!lines.some(l => l.kind === 'brain')) lines.push(mkLine(K.sentence(clip(an.thought || an.conclusion || 'This means something bad.', 90)), 'brain', false));
        const factOf = (t) => { const seg = t.split(/[:;.!?]\s|,\s|[“"]/)[0].trim(); const n = seg.split(/\s+/).length; return n >= 3 && n <= 9 ? seg : clipW(t.replace(/["“”]/g, ''), 7); };
        const facts = lines.filter(l => l.kind === 'camera').map(l => ({ text: factOf(l.text), user: true }));
        if (!facts.length && an.situation) facts.push({ text: clipW(K.sentence(an.situation), 8), user: false });
        return { classic: false, lines, hot: lines.filter(l => l.kind === 'brain').map(l => ({ text: hotSnippet(l), user: l.user, g: l.primary })), facts, charge: clip(an.thought || an.conclusion || 'This means something bad.', 84), fair: an.balanced || '' };
      }
      const CASE = buildCase();
      const lines = CASE.lines, targets = lines.filter(l => l.kind === 'brain');
      const grace = [2400, 1600, 1100][inten];

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', doubt: 0, sunK: 0, sunT: 0, shake: 0, flash: 0, punch: 0, speed: 0, speedAt: { x: 0, y: 0 }, lastTap: 0, falseN: 0, readback: null, scores: [], chain: 0, bestChain: 0, used: {}, struck: 0,
        finished: false, major: false, gavelT: -9999, whisper: 0, juryK: 0, juryTo: 0, beatT: 0, beatN: 0, step: 0, glowEl: null, cards: null, fr: 0, zoneBusy: false, objections: 0 };
      const M = { W: 0, H: 0, wide: false };
      const R = { li: -1, wi: 0, gap: 0, line: null, paused: false, done: null };
      const CL = { items: [], i: -1, ticks: 0, cur: null, done: null, fin: false };
      const DF = { frags: [], next: 0, done: null, slots: [] };
      const P = K.particles({ max: 500 });
      const papers = [];

      /* ---------------- DOM ---------------- */
      const SOFT = softwareGfx();
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1 : 1.5 });
      const fx = K.canvas(el, { maxDpr: SOFT ? 1 : 1.5, cls: 'oj-fx' });
      const room = document.createElement('canvas'), beamCv = document.createElement('canvas'), base = document.createElement('canvas');
      let roomDirty = true, fxLive = false, baseKey = '';
      const doubtB = h('b'), chargeEl = h('div', { class: 'oj-charge' }, h('small', { text: 'Charge' }), h('span', { text: CASE.charge }));
      const rec = h('section', { class: 'oj-rec', 'aria-label': 'Court transcript' },
        h('div', { class: 'oj-rhead' }, h('span', { class: 'oj-rtitle', text: (CASE.classic ? 'A classic case' : 'The People v. You') }), h('span', { class: 'oj-doubt', title: 'Reasonable doubt' }, h('em', { text: 'Doubt' }), h('i', null, doubtB))),
        chargeEl);
      const body = h('div', { class: 'oj-body' }), scroll = h('div', { class: 'oj-scroll' });
      const waitNote = h('div', { class: 'oj-wait' }, CASE.classic ? 'No statement filed. The prosecution will read a classic from the critic’s greatest hits…' : 'The prosecution will now read your statement into the record…');
      body.append(scroll, waitNote); rec.append(body);
      const btn = h('button', { type: 'button', class: 'oj-obj', 'aria-label': 'Objection! Tap when a thinking trap is spoken.' }, h('b', { text: 'OBJECTION!' }), h('small', { text: 'Tap when a phrase glows' }));
      const btnHint = btn.querySelector('small');
      el.append(rec, btn);
      lines.forEach((ln, i) => {
        const tx = h('span', { class: 'oj-text' + (ln.user ? ' gk-user' : '') });
        const nW = ln.words.length;
        ln.wEls = ln.words.map((w, j) => h('span', { class: 'oj-w', text: w.w + (j < nW - 1 && !(ln.hot && j === ln.hot[1]) ? ' ' : '') }));
        let k = 0;
        while (k < nW) {
          if (ln.hot && k === ln.hot[0]) {
            const hs = h('span', { class: 'oj-hot' });
            for (let j = ln.hot[0]; j <= ln.hot[1]; j++) hs.append(ln.wEls[j]);
            tx.append(hs); ln.hotEl = hs; k = ln.hot[1] + 1;
            if (k < nW) tx.append(' ');
          } else { tx.append(ln.wEls[k]); k++; }
        }
        const cell = h('div', { class: 'oj-cell' }, tx);
        ln.el = h('div', { class: 'oj-line', hidden: true }, h('span', { class: 'oj-num', text: String(i + 1) }), cell);
        ln.cell = cell; scroll.append(ln.el);
      });
      const judge = K.character('still', { side: 'right', mood: 'calm', x: 0, y: 0 });
      const pros = K.character('glitch', { side: 'below', mood: 'smug', x: 0, y: 0, voice: 330 });
      const def = K.character('patch', { side: 'below', mood: 'determined', x: 0, y: 0, voice: 600 });
      judge.el.classList.add('oj-c-judge'); pros.el.classList.add('oj-c-pros'); def.el.classList.add('oj-c-def');

      /* jurors: the rest of the cast, growing with visits */
      const JURY = ['loopie', 'drop', 'sync'].concat(visits >= 1 ? ['rush'] : []);
      const faceCache = {};
      const faceImg = (slug, mood) => { const k = slug + ':' + mood; if (!faceCache[k]) { const im = new Image(); im.src = K.face(slug, mood); faceCache[k] = im; } return faceCache[k]; };
      const jurors = JURY.map((slug, i) => ({ slug, mood: 'neutral', base: 'neutral', until: 0, ph: i * 1.7, hop: 0 }));
      jurors.forEach(j => ['neutral', 'happy', 'wow', 'surprised', 'laugh', 'celebrate', 'think'].forEach(m => faceImg(j.slug, m)));
      function juryMood(mood, ms) { const t = now(); jurors.forEach((j, i) => { j.mood = mood; j.until = t + (ms || 1600) + i * 90; j.hop = t + i * 70; }); }

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.W = W; M.H = H; M.wide = W >= 960 && H >= 560;
        el.classList.toggle('oj-wide', M.wide);
        if (!M.wide) {
          const sh = H < 740, js = sh ? 52 : 58, top = 60, cs = sh ? 54 : 62, btnH = sh ? 70 : 80;
          M.judge = { x: W / 2 - js / 2, y: top, s: js };
          M.bench = { x: W * 0.16, y: top + js - 9, w: W * 0.68, h: sh ? 50 : 58 };
          M.jury = { x: 8, y: top, w: Math.max(90, W / 2 - js / 2 - 18), h: js - 8 };
          M.btn = { x: W / 2, y: H - 18 - btnH, h: btnH, w: Math.min(330, W - 40) };
          M.charY = M.btn.y - 12 - 84 - cs;
          M.def = { x: 14, y: M.charY, s: cs }; M.pros = { x: W - 14 - cs, y: M.charY, s: cs };
          M.rec = { x: 12, y: M.bench.y + M.bench.h + 10, w: W - 24 }; M.rec.h = M.charY - 12 - M.rec.y;
          M.bar = { y: M.charY + cs - 4, h: 30 };
          M.act = { x: 14, y: M.charY + cs + 10, w: W - 28 }; M.act.h = H - 14 - M.act.y;
          M.wins = [{ x: 14, y: 66, w: 50, h: 104 }, { x: W - 64, y: 66, w: 50, h: 104 }];
          M.juryBig = { x: 18, y: M.rec.y + M.rec.h * 0.56, w: W - 36, h: Math.min(140, M.rec.h * 0.34) };
          M.gavel = { x: M.judge.x + js + 34, y: M.bench.y + 3 };
          judge.side('right'); def.side('below'); pros.side('below');
        } else {
          const js = 86, cs = 100, btnH = 88;
          M.judge = { x: W / 2 - js / 2, y: 62, s: js };
          M.bench = { x: W / 2 - 330, y: 62 + js - 12, w: 660, h: 88 };
          M.jury = { x: 30, y: Math.min(430, H * 0.5), w: Math.min(260, W / 2 - 360), h: 132 };
          M.btn = { x: W / 2, y: H - 26 - btnH, h: btnH, w: 360 };
          M.def = { x: 40, y: H - 34 - cs, s: cs }; M.pros = { x: W - 40 - cs, y: H - 34 - cs, s: cs };
          M.charY = M.def.y;
          M.bar = null;
          const aw = Math.min(860, W - 300);
          M.act = { x: W / 2 - aw / 2, y: M.btn.y - 34, w: aw, h: H - 16 - (M.btn.y - 34) };
          M.rec = { x: W / 2 - 330, y: M.bench.y + M.bench.h + 14, w: 660 }; M.rec.h = M.act.y - 14 - M.rec.y;
          const ww = 96, wh = Math.min(300, H * 0.36);
          M.wins = [{ x: 40, y: 74, w: ww, h: wh }, { x: 172, y: 74, w: ww, h: wh }, { x: W - 40 - ww, y: 74, w: ww, h: wh }, { x: W - 172 - ww, y: 74, w: ww, h: wh }];
          M.juryBig = { x: M.jury.x, y: M.jury.y - 30, w: M.jury.w + 20, h: M.jury.h + 30 };
          M.gavel = { x: M.judge.x + js + 46, y: M.bench.y + 3 };
          M.clock = { x: W - 150, y: Math.min(440, H * 0.5) + 20 };
          judge.side('right'); def.side('right'); pros.side('left');
        }
        [[judge, M.judge], [pros, M.pros], [def, M.def]].forEach(([c, r]) => { c.el.style.setProperty('--sz', r.s + 'px'); c.place(r.x, r.y); });
        Object.assign(rec.style, { left: M.rec.x + 'px', top: M.rec.y + 'px', width: M.rec.w + 'px', height: Math.max(120, M.rec.h) + 'px' });
        Object.assign(btn.style, { left: M.btn.x + 'px', top: M.btn.y + 'px', width: M.btn.w + 'px', height: M.btn.h + 'px' });
        if (st.cards) placeCards(st.cards);
        if (DF.box) placeFrags();
        if (st.verdictEl) placeVerdict();
        if (st.bookEl) placeBook();
        roomDirty = true;
        S.later(rescroll, 30);
      }
      cv.onResize(() => layout());
      el.classList.toggle('oj-bright', bright());
      S.on('theme', () => { PAL = pal(); roomDirty = true; el.classList.toggle('oj-bright', bright()); });
      try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { roomDirty = true; rescroll(); }); } catch (e) { /* no font api */ }

      /* bottom characters share one speech zone on phones: one bubble at a time, none while cards are out */
      function say(c, line, o) {
        o = o || {};
        if (c === def || c === pros) {
          if (st.zoneBusy) { if (o.mood) c.face(o.mood, o.moodMs || 1800); return; }
          if (!M.wide) (c === def ? pros : def).hush();
        }
        return c.say(line, o);
      }
      function hushBottom() { def.hush(); pros.hush(); }

      /* ---------------- sound: a courtroom ostinato in D minor that resolves to D major ---------------- */
      const SEQ = { bpm: [84, 92, 100][inten], target: [84, 92, 100][inten], next: 0, perfNext: 0, step: 0, q: [], on: false, mode: 'perf', vol: 0.9 };
      const PROG_MIN = [['D2', ['D4', 'F4', 'A4'], 'A2'], ['A#1', ['D4', 'F4', 'A#4'], 'F2'], ['G1', ['D4', 'G4', 'A#4'], 'D2'], ['A1', ['C#4', 'E4', 'A4'], 'E2']];
      const PROG_MAJ = [['D2', ['D4', 'F#4', 'A4'], 'A2'], ['B1', ['D4', 'F#4', 'B4'], 'F#2'], ['G1', ['D4', 'G4', 'B4'], 'D2'], ['A1', ['C#4', 'E4', 'A4'], 'E2']];
      const audioOn = () => !!(A.ctx && A.ctx.state === 'running');
      function seqLoop() {
        const t = now();
        if (audioOn()) {
          const an0 = A.now();
          if (SEQ.mode !== 'audio') { SEQ.mode = 'audio'; SEQ.next = an0 + Math.max(0.05, ((SEQ.perfNext || t) - t) / 1000); }
          if (SEQ.next < an0 - 1.6) SEQ.next = an0 + 0.03;
          let guard = 0;
          while (SEQ.next < an0 + 0.14 && guard++ < 16) {
            if (SEQ.next >= an0 - 0.03) playStep(SEQ.step, SEQ.next);
            SEQ.q.push({ at: t + (SEQ.next - an0 + A.latency()) * 1000, step: SEQ.step });
            SEQ.next += 30 / SEQ.bpm; SEQ.step++; SEQ.bpm += (SEQ.target - SEQ.bpm) * 0.1;
          }
        } else {
          if (SEQ.mode !== 'perf') { SEQ.mode = 'perf'; SEQ.perfNext = t + 40; }
          if (!SEQ.perfNext || SEQ.perfNext < t - 1600) SEQ.perfNext = t + 30;
          let guard = 0;
          while (SEQ.perfNext <= t + 8 && guard++ < 16) { SEQ.q.push({ at: SEQ.perfNext, step: SEQ.step }); SEQ.perfNext += 30000 / SEQ.bpm; SEQ.step++; SEQ.bpm += (SEQ.target - SEQ.bpm) * 0.1; }
        }
        let n = 0;
        while (SEQ.q.length && SEQ.q[0].at <= t && n++ < 10) { const e = SEQ.q.shift(); onTick(e.step); }
      }
      function playStep(step, t) {
        if (!SEQ.on || !A.ctx) return;
        const b8 = step % 8, bar = Math.floor(step / 8) % 4, PR = (st.major ? PROG_MAJ : PROG_MIN)[bar], spb = 60 / SEQ.bpm;
        const closing = st.phase === 'closing' || st.phase === 'closingIntro', calm = st.phase === 'verdict' || st.phase === 'end';
        const v = SEQ.vol * (calm ? 0.75 : 1);
        if (b8 === 0) {
          A.pluck(A.note(PR[0]), { when: t, vol: 0.36 * v, damp: 0.993, lp: 460, bus: 'music' });
          A.tone({ when: t, type: 'triangle', freq: A.note(PR[0]) * 2, dur: spb * 3.8, vol: 0.03 * v, attack: 0.4, lp: 520, bus: 'music' });
          if (st.major) PR[1].forEach((n, i) => A.chime(A.note(n) * 2, { when: t + i * spb * 0.5, vol: 0.026 * v, dur: 1.8, bus: 'music' }));
        }
        if (b8 === 6 && !closing) A.pluck(A.note(PR[2]), { when: t, vol: 0.2 * v, damp: 0.99, lp: 520, bus: 'music' });
        if (!calm || b8 % 2 === 0) {
          const pat = [0, 2, 1, 2, 0, 2, 1, 2];
          A.pluck(A.note(PR[1][pat[b8]]) * (b8 === 3 || b8 === 7 ? 2 : 1), { when: t, vol: (b8 % 2 ? 0.045 : 0.07) * v, damp: 0.972, lp: 2600, bus: 'music' });
        }
        if (!closing && b8 === 0 && inten > 0 && !calm) A.drum(t, 0.14 * v, 0.34, 0.2);
        if (closing && st.phase === 'closing') {
          if (b8 % 2 === 0) A.drum(t, (b8 === 0 ? 0.32 : 0.18) * v, 0.34, 0.12);
          A.shaker(t, 0.028 * v);
          if (b8 === 2 || b8 === 6) PR[1].forEach((n, i) => A.tone({ when: t + i * 0.004, type: 'sawtooth', freq: A.note(n), dur: 0.15, vol: 0.02 * v, attack: 0.004, lp: 1800, bus: 'music' }));
        }
      }
      const SND = {
        stinger(level) {
          K.sfx.whoosh();
          if (!A.ctx) return;
          const t = A.now(), up = Math.pow(2, Math.min(12, (level || 0) * 2) / 12);
          ['D4', 'F4', 'A4', 'D5'].forEach((n, i) => A.tone({ when: t + i * 0.005, type: 'sawtooth', freq: A.note(n) * up, dur: 0.46, vol: 0.05, attack: 0.006, lp: 2800, verb: 0.3 }));
          A.tone({ when: t, type: 'square', freq: A.note('D3') * up, dur: 0.32, vol: 0.05, attack: 0.004, lp: 1100 });
          A.drum(t, 0.62, 0.4, 0.4);
          A.noise({ when: t, filter: 'highpass', freq: 2800, dur: 0.1, vol: 0.13 });
        },
        mini() { K.sfx.pop(undefined, 420); if (A.ctx) { const t = A.now(); A.tone({ when: t, type: 'sawtooth', freq: A.note('D4'), dur: 0.2, vol: 0.035, attack: 0.005, lp: 1600 }); A.drum(t, 0.3, 0.5, 0.2); } },
        gavel(big) {
          K.sfx.thud();
          if (!A.ctx) return;
          const t = A.now();
          A.wood(t, big ? 0.55 : 0.34, 0.52);
          A.noise({ when: t + 0.004, filter: 'bandpass', freq: 850, q: 1.3, dur: 0.11, vol: big ? 0.34 : 0.18 });
          if (big) { A.thud({ vol: 0.8 }); A.noise({ when: t, filter: 'lowpass', freq: 260, dur: 0.7, vol: 0.28 }); A.drum(t, 0.6, 0.3, 0.7); }
        },
        sustained() { K.sfx.good(undefined, 6); if (!A.ctx) return; const t = A.now() + 0.08; ['D5', 'F#5', 'A5'].forEach((n, i) => A.chime(A.note(n), { when: t + i * 0.07, vol: 0.075, dur: 1.4 })); },
        overruled() { K.sfx.soft(); if (!A.ctx) return; const t = A.now(); A.chime(A.note('A4'), { when: t, vol: 0.06, dur: 0.9 }); A.chime(A.note('F4'), { when: t + 0.16, vol: 0.055, dur: 1.1 }); },
        murmur(n) { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < (n || 7); i++) A.noise({ when: t + 0.05 + Math.random() * 0.9, pink: true, filter: 'bandpass', freq: 500 + Math.random() * 700, q: 2.4, dur: 0.25 + Math.random() * 0.35, attack: 0.08, vol: 0.05 + Math.random() * 0.04, pan: Math.random() * 1.4 - 0.7 }); },
        whispers(sec) { if (!A.ctx) return; const t = A.now(); for (let i = 0; i < sec * 9; i++) A.noise({ when: t + Math.random() * sec, filter: 'bandpass', freq: 3200 + Math.random() * 2400, q: 1.6, dur: 0.12 + Math.random() * 0.25, attack: 0.04, vol: 0.025 + Math.random() * 0.03, pan: Math.random() * 1.6 - 0.8 }); },
        drumroll(sec) { if (!A.ctx) return; const t = A.now(); let x = 0, i = 0; while (x < sec) { A.drum(t + x, 0.12 + 0.3 * (x / sec), 0.36, 0.1); x += Math.max(0.045, 0.11 - x * 0.05); i++; } void i; },
        paper() { K.sfx.paper(); },
        key() { if (A.ctx) A.typeKey({ vol: 0.045 }); }
      };

      /* ---------------- ticks: every eighth note of the ostinato drives the reading and the closing ---------------- */
      function onTick(step) {
        st.step = step;
        if (step % 2 === 0) { st.beatT = now(); st.beatN = step / 2; jurors.forEach((j, i) => { if (Math.random() < 0.18) j.hop = now() + i * 30; }); }
        if (st.phase === 'read') readTick();
        else if (st.phase === 'closing') closingTick();
        else if (st.phase === 'readout') readoutTick();
      }

      /* ---------------- reading the case into the record ---------------- */
      function readCase() { return new Promise(res => { R.done = res; R.li = -1; R.paused = false; st.phase = 'read'; nextLine(); }); }
      function nextLine() {
        R.li++; R.wi = 0; R.gap = 0;
        if (R.li >= lines.length) { R.line = null; const d = R.done; R.done = null; if (d) d(); return; }
        const ln = lines[R.li]; R.line = ln; ln.el.hidden = false; waitNote.hidden = true;
        rescroll();
        pros.face(ln.kind === 'brain' ? 'smug' : 'determined', 2200);
      }
      function rescroll() {
        const ln = R.line || lines.slice().reverse().find(l => !l.el.hidden) || null;
        const target = DF.block && !DF.block.hidden ? DF.block : ln && ln.el;
        if (!target) return;
        const bh = body.clientHeight; if (!bh) return;
        const bottom = target.offsetTop + target.offsetHeight + 14;
        scroll.style.transform = 'translateY(' + (-Math.max(0, bottom - bh)) + 'px)';
      }
      function readTick() {
        if (R.paused || !R.line) return;
        const ln = R.line;
        if (R.wi < ln.words.length) { reveal(ln, R.wi); R.wi++; if (R.wi >= ln.words.length) ln.endT = now(); return; }
        if (ln.kind === 'brain' && !ln.caught) { if (now() - ln.endT > grace) readback(ln); return; }
        if (++R.gap >= 2) { if (ln.kind === 'camera') mark(ln, 'rc', 'On record'); nextLine(); }
      }
      function reveal(ln, i) {
        ln.wEls[i].classList.add('on');
        SND.key();
        if (ln.hot && i === ln.hot[0]) {
          ln.hotEl.classList.add('glow'); st.glowEl = ln.hotEl;
          const first = !targets.some(x => x !== ln && x.glowed);
          ln.glowed = true;
          if (first) { say(def, L(LINES.firstGlow), { mood: 'wow', ms: 1800 }); K.guide({ id: 'now', g: 'tap', target: btn, label: 'OBJECTION! NOW', delay: 250 }); }
          else K.guide({ id: 'now', g: 'tap', target: btn, label: 'OBJECTION! NOW', delay: 1500 });
        }
      }
      function mark(ln, kind, label) { if (ln.marked) return; ln.marked = true; ln.cell.append(h('span', { class: 'oj-mark ' + kind, text: label })); }
      function readGuide() { K.guide({ id: 'listen', g: 'tap', target: btn, label: 'TAP WHEN IT GLOWS', delay: 900 }); }
      function readback(ln) {
        R.paused = true; st.readback = ln; ln.rb = (ln.rb || 0) + 1;
        ln.hotEl.classList.add('again'); st.glowEl = ln.hotEl;
        say(def, L(LINES.psst), { mood: 'think', ms: 3200 });
        S.later(() => { if (st.readback === ln && !ln.caught) judge.say(L(LINES.readBack), { mood: 'think', ms: 2200 }); }, 1200);
        const ws = ln.wEls.slice(ln.hot[0], ln.hot[1] + 1);
        ws.forEach(w => w.classList.remove('on'));
        ws.forEach((w, k) => S.later(() => { w.classList.add('on'); SND.key(); }, 380 + k * 240));
        K.guide({ id: 'rb', g: 'tap', target: btn, label: 'OBJECT NOW!', delay: 700 });
        ctx.track('readback', { n: ln.rb });
      }

      /* ---------------- OBJECTION! ---------------- */
      function pressFx() { btn.classList.remove('press'); void btn.offsetWidth; btn.classList.add('press'); S.later(() => btn.classList.remove('press'), 140); }
      function objectTap() {
        const t = now(); if (t - st.lastTap < 280) return; st.lastTap = t;
        pressFx();
        if (st.phase === 'closing') { closingObject(); return; }
        if (st.phase !== 'read') { K.sfx.tap(); return; }
        const ln = R.line;
        if (ln && ln.kind === 'brain' && !ln.caught) {
          const lastW = R.wi - 1;
          const q = st.readback === ln ? 'readback' : (lastW >= ln.hot[0] && lastW <= ln.hot[1] + 2) || (R.wi >= ln.words.length && now() - ln.endT < 650) ? 'perfect' : 'good';
          caught(ln, q);
        } else falseObjection();
      }
      K.tap(btn, () => objectTap());
      K.onKey(['KeyO'], () => objectTap());
      /* bursts, combos and title cards are painted on the effects canvas: big type that can overshoot freely */
      const FXT = [];
      function fxText(kind, x, y, text, sub) { FXT.push({ kind, x, y, text, sub, t0: now() }); fxLive = true; }
      function burstAt(x, y, mini) {
        fxText(mini ? 'mini' : 'burst', x, y, mini ? 'Objection!' : 'OBJECTION!');
        if (!RM()) { st.speed = mini ? 0.5 : 1; st.speedAt = { x, y }; st.punch = mini ? 0.5 : 1; }
      }
      function shake(k) { if (!RM()) st.shake = Math.max(st.shake, k); }
      async function caught(ln, q) {
        ln.caught = true; ln.q = q; R.paused = true; st.readback = null; st.phase = 'objection'; st.objections++;
        ln.wEls.forEach(w => w.classList.add('on')); R.wi = ln.words.length; ln.endT = now();
        K.guide(null);
        const c = recCenter();
        burstAt(c.x, c.y - (M.wide ? 30 : 10), false); SND.stinger(0); shake(0.8); st.flash = RM() ? 0 : 0.45;
        def.face('determined', 1700); def.react('bounce'); pros.face('gasp', 1700); pros.react('shake'); judge.face('wow', 1100);
        juryMood('surprised', 1400);
        ctx.track('object', { ok: 1, q: q === 'perfect' ? 2 : q === 'good' ? 1 : 0 });
        if (q === 'perfect') S.later(() => comboPop(M.W / 2, recCenter().y + (M.wide ? 92 : 78), 'Perfect timing!'), 420);
        await K.wait(RM() ? 380 : 980);
        showGrounds(ln);
      }
      function falseObjection() {
        st.falseN++;
        if (st.falseN <= 2) st.scores.push(0.35);
        const c = recCenter();
        burstAt(c.x, c.y, true); SND.mini(); S.later(() => SND.overruled(), 260);
        S.later(() => ruling('Overruled', 'That part’s on the record', 'ovr'), 320);
        judge.say(L(LINES.onRecord), { mood: 'calm', ms: 2400 });
        pros.face('laugh', 1500);
        if (st.falseN === 1) S.later(() => say(def, L(LINES.factTip), { mood: 'think', ms: 3600 }), 900);
        else S.later(() => say(pros, L(LINES.prosSmug), { mood: 'smug', ms: 2400 }), 700);
        ctx.track('object', { ok: 0 });
      }
      function recCenter() { return { x: M.rec.x + M.rec.w / 2, y: M.rec.y + Math.min(M.rec.h, 420) * 0.48 }; }
      function ruling(big, small, kind) {
        const c = recCenter();
        const r = h('div', { class: 'oj-ruling ' + kind, 'aria-hidden': 'true' }, big, small ? h('small', { text: small }) : null);
        r.style.left = c.x + 'px'; r.style.top = (c.y + (M.wide ? 10 : 0)) + 'px';
        el.append(r);
        S.later(() => r.classList.add('out'), 1250); S.later(() => r.remove(), 1600);
      }
      function comboPop(x, y, label) { fxText('combo', x, y, label); }

      /* ---------------- on what grounds? ---------------- */
      function distractors(ln) {
        const r = K.rng(K.daily() + R.li * 17 + st.objections);
        let pool = K.shuffle(['spec', 'pred', 'over', 'label', 'should'].filter(g => !ln.valid.has(g)), r);
        if (pool.length < 2 && !ln.valid.has('facts')) pool.push('facts');
        if (pool.length < 2) pool = pool.concat(K.shuffle(Array.from(ln.valid).filter(g => g !== ln.primary), r));
        return pool.slice(0, 2);
      }
      function placeCards(box) {
        const a = M.act;
        if (M.wide) Object.assign(box.style, { left: a.x + 'px', top: (a.y + 6) + 'px', width: a.w + 'px', height: Math.min(130, a.h - 10) + 'px' });
        else Object.assign(box.style, { left: a.x + 'px', top: a.y + 'px', width: a.w + 'px', height: a.h + 'px' });
      }
      function showGrounds(ln) {
        st.phase = 'grounds'; btn.hidden = true; st.zoneBusy = true; hushBottom();
        const r = K.rng(R.li * 31 + K.daily());
        const opts = K.shuffle([ln.primary].concat(distractors(ln)), r);
        const box = h('div', { class: 'oj-grounds' + (M.wide ? ' row' : ''), role: 'group', 'aria-label': 'On what grounds?' });
        opts.forEach(g => {
          const why = h('span', { text: GROUNDS[g].why });
          const b = h('button', { type: 'button', class: 'oj-g', 'aria-label': GROUNDS[g].name + ': ' + GROUNDS[g].why }, h('b', null, GROUNDS[g].name, h('em', { text: GROUNDS[g].tag })), why);
          b.dataset.g = g; b.whyEl = why;
          K.tap(b, () => pickGround(ln, g, b));
          box.append(b);
        });
        ln.tries = 0; st.cards = box; el.append(box); placeCards(box);
        judge.say(L(LINES.grounds), { mood: 'think', ms: 2600 });
        K.guide({ id: 'grounds', g: 'choose', target: () => Array.from(box.querySelectorAll('.oj-g:not(.no)')), label: 'PICK THE GROUNDS', delay: 1200 });
      }
      function pickGround(ln, g, b) {
        if (st.phase !== 'grounds' || b.classList.contains('no')) return;
        SND.paper();
        if (ln.valid.has(g)) { sustain(ln, g, b); return; }
        ln.tries++;
        b.classList.add('no'); b.whyEl.textContent = L(LINES.hint[ln.primary]);
        SND.overruled(); ruling('Overruled', 'but close', 'ovr');
        judge.say(L(LINES.close), { mood: 'think', ms: 2200 });
        pros.face('smug', 1600);
        ctx.track('grounds', { ok: 0 });
        K.guide({ id: 'grounds2', g: 'choose', target: () => Array.from(st.cards ? st.cards.querySelectorAll('.oj-g:not(.no)') : []), label: 'TRY ANOTHER', delay: 1600 });
      }
      async function sustain(ln, g, b) {
        st.phase = 'ruling'; K.guide(null);
        b.classList.add('yes');
        st.cards.querySelectorAll('.oj-g').forEach(x => { if (x !== b) x.classList.add('no'); });
        SND.gavel(); st.gavelT = now(); SND.sustained(); shake(0.35);
        ruling('Sustained!', GROUNDS[g].name, 'sus');
        judge.say(L(LINES.sustained), { mood: 'determined', ms: 1800 });
        strike(ln);
        st.struck++; st.used[g] = (st.used[g] || 0) + 1;
        const tq = ln.q === 'perfect' ? 1 : ln.q === 'good' ? 0.85 : 0.6, gq = [1, 0.6, 0.35][Math.min(2, ln.tries)];
        st.scores.push(tq * gq);
        setDoubt(st.doubt + 0.62 / Math.max(1, targets.length));
        pros.face(['facepalm', 'sad', 'meltdown', 'facepalm'][Math.min(3, st.struck - 1)], 2600); pros.react(st.struck >= 3 ? 'glitch' : 'shake');
        def.face('happy', 2400); juryMood('wow', 1700); SND.murmur(6);
        ctx.track('grounds', { ok: 1, tries: ln.tries });
        await K.wait(RM() ? 650 : 1150);
        if (st.cards) { st.cards.remove(); st.cards = null; }
        st.zoneBusy = false; btn.hidden = false;
        say(def, L(LINES.explain[g]), { mood: 'happy', ms: 3300 });
        await K.wait(RM() ? 800 : 1300);
        st.phase = 'read'; R.paused = false; readGuide();
      }
      function strike(ln) {
        if (!ln.hotEl) return;
        ln.hotEl.classList.remove('glow', 'again'); ln.hotEl.classList.add('struck');
        if (st.glowEl === ln.hotEl) st.glowEl = null;
        S.later(() => mark(ln, 'st', 'Struck'), 420);
        try {
          const r = K.rectIn(ln.hotEl);
          P.emit('spark', r.cx, r.cy, 16, { colors: ['#ff5a5a', '#ffd36b', '#fff3c4'] });
          fxLive = true;
        } catch (e) { /* off screen */ }
      }
      function setDoubt(v) { st.doubt = clamp(v, 0, 1); doubtB.style.setProperty('--k', st.doubt.toFixed(3)); chargeEl.classList.toggle('shaky', st.doubt >= 0.5); }

      /* ---------------- the twist: a rapid-fire closing argument ---------------- */
      function closingItems() {
        const n = [6, 8, 10][inten];
        let hot = CASE.hot.slice();
        if (hot.length < 3) hot = hot.concat(FLOURISH.slice(0, 3 - hot.length).map(f => ({ text: f.text, user: false, g: f.g })));
        const facts = CASE.facts.slice(0, 3), nf = facts.length ? Math.floor(n * 0.36) : 0, out = [];
        const factAt = new Set(); for (let k = 0; k < nf; k++) factAt.add(Math.max(1, Math.round((k + 0.6) * n / nf)));
        let hi = 0, fi = 0;
        for (let i = 0; i < n; i++) {
          if (factAt.has(i) && nf) out.push(Object.assign({ hot: false }, facts[fi++ % facts.length]));
          else out.push(Object.assign({ hot: true }, hot[hi++ % hot.length]));
        }
        return out;
      }
      async function closingPhase() {
        st.phase = 'closingIntro'; K.guide(null);
        judge.say(L(LINES.closingCall), { mood: 'neutral', ms: 2000 }); SND.gavel(); st.gavelT = now();
        await K.wait(RM() ? 500 : 900);
        say(pros, L(LINES.closingOpen), { mood: 'determined', ms: 2800 }); pros.react('bounce');
        rec.classList.add('dim');
        SEQ.target = [100, 106, 112][inten];
        const c = recCenter();
        fxText('title', c.x, c.y, 'CLOSING ARGUMENT', 'RAPID FIRE');
        if (!RM()) { st.speed = 0.7; st.speedAt = { x: c.x, y: c.y }; }
        SND.stinger(1); shake(0.5);
        await K.wait(RM() ? 1200 : 2300);
        say(def, L(LINES.closingTip), { mood: 'determined', ms: 3000 });
        CL.items = closingItems(); CL.i = -1; CL.ticks = 0; CL.cur = null; CL.fin = false; st.chain = 0;
        await new Promise(res => { CL.done = res; st.phase = 'closing'; K.guide({ id: 'closing', g: 'tap', target: btn, label: 'OBJECT TO TRAPS ONLY', delay: 900 }); });
      }
      function closingTick() {
        CL.ticks++;
        const per = inten === 0 ? 6 : 4;
        if ((CL.ticks - 1) % per !== 0) return;
        if (CL.cur) retire(CL.cur);
        CL.i++;
        if (CL.i >= CL.items.length) { if (!CL.fin) { CL.fin = true; S.later(() => { const d = CL.done; CL.done = null; if (d) d(); }, 450); } return; }
        spawn(CL.items[CL.i]);
        SEQ.target = Math.min(SEQ.target + [2, 3, 4][inten], [110, 124, 136][inten]);
      }
      function spawn(it) {
        const c = recCenter();
        const e = h('div', { class: 'oj-fly' + (it.hot ? ' hot' : '') }, h('small', { text: 'The prosecution says' }), h('span', { class: it.user ? 'gk-user' : '', text: it.text }));
        e.style.left = c.x + 'px'; e.style.top = (c.y + (CL.i % 2 ? 8 : -8)) + 'px';
        el.append(e); it.el = e; it.t0 = now(); CL.cur = it;
        if (it.hot) st.glowEl = e;
        pros.face(it.hot ? 'smug' : 'determined', 900); pros.react('bounce');
        st.punch = Math.max(st.punch, 0.35);
      }
      function retire(it) {
        if (!it.res) {
          if (it.hot) { it.res = 'missed'; st.scores.push(0); if (st.chain >= 2) S.later(() => say(def, L(LINES.slipped), { mood: 'think', ms: 1600 }), 60); st.chain = 0; }
          else { it.res = 'passed'; st.scores.push(1); it.el.append(h('span', { class: 'oj-mark gd', text: 'Fact stands' })); if (A.ctx) A.chime(A.note('A5'), { vol: 0.03, dur: 0.6 }); }
        }
        const e = it.el; if (st.glowEl === e) st.glowEl = null;
        if (it.res === 'passed' || it.res === 'missed' || it.res === 'fact') { e.classList.add('pass'); S.later(() => e.remove(), it.res === 'passed' ? 420 : 460); }
        if (CL.cur === it) CL.cur = null;
      }
      function closingObject() {
        const it = CL.cur;
        if (!it || it.res) { K.sfx.tap(); return; }
        const r = { x: parseFloat(it.el.style.left), y: parseFloat(it.el.style.top) };
        if (it.hot) {
          it.res = 'caught'; st.chain++; st.bestChain = Math.max(st.bestChain, st.chain); st.scores.push(1);
          it.el.classList.add('smash'); const e = it.el; S.later(() => e.remove(), 520);
          if (st.glowEl === e) st.glowEl = null;
          SND.stinger(st.chain); shake(0.35 + Math.min(0.5, st.chain * 0.08)); st.flash = RM() ? 0 : 0.18;
          burstAt(r.x, r.y - 6, true);
          P.emit('spark', r.x, r.y, 14 + st.chain * 3, { colors: ['#ffd36b', '#ff7a4a', '#fff3c4'] }); fxLive = true;
          comboPop(r.x, r.y - (M.wide ? 92 : 78), st.chain > 1 ? 'Objection ×' + st.chain + '!' : 'Objection!');
          setDoubt(st.doubt + 0.2 / Math.max(1, CL.items.filter(x => x.hot).length));
          pros.face(st.chain >= 5 ? 'meltdown' : st.chain >= 3 ? 'worried' : 'gasp', 900);
          if (st.chain === 3 || st.chain === 6) S.later(() => say(pros, L(st.chain === 3 ? LINES.combo3 : LINES.combo6), { mood: st.chain === 6 ? 'meltdown' : 'worried', ms: 1700 }), 120);
          juryMood(st.chain >= 4 ? 'laugh' : 'wow', 900);
          ctx.track('rapid', { ok: 1, chain: st.chain });
        } else {
          it.res = 'fact'; st.scores.push(0.3); st.chain = 0;
          it.el.append(h('span', { class: 'oj-mark rc', text: 'That’s a fact' }));
          SND.mini(); S.later(() => SND.overruled(), 200);
          pros.face('laugh', 1200);
          ctx.track('rapid', { ok: 0 });
        }
      }

      /* ---------------- the defence closes: the fair version, piece by piece ---------------- */
      function fragments(s, n) {
        s = clip(s, 170);
        let parts = (s.match(/[^.!?]+[.!?]*/g) || [s]).map(x => x.trim()).filter(Boolean);
        let guard = 0;
        while (parts.length < n && guard++ < 6) {
          let bi = -1, bl = 0; parts.forEach((p, i) => { const wc = p.split(/\s+/).length; if (wc >= 6 && p.length > bl) { bl = p.length; bi = i; } });
          if (bi < 0) break;
          const w = parts[bi].split(/\s+/); let cut = -1, best = 1e9;
          for (let i = 3; i <= w.length - 3; i++) { const sc = Math.abs(i - w.length / 2) - (/[,;:]$/.test(w[i - 1]) ? 3 : 0) - (/^(and|but|so|because|or|yet|until|unless|while)$/i.test(w[i]) ? 1.5 : 0); if (sc < best) { best = sc; cut = i; } }
          if (cut < 0) break;
          parts.splice(bi, 1, w.slice(0, cut).join(' '), w.slice(cut).join(' '));
        }
        while (parts.length > n) { let bi = 0, bl = 1e9; for (let i = 0; i < parts.length - 1; i++) { const l = parts[i].length + parts[i + 1].length; if (l < bl) { bl = l; bi = i; } } parts.splice(bi, 2, parts[bi] + ' ' + parts[bi + 1]); }
        return parts;
      }
      function placeFrags() {
        const a = M.act, box = DF.box; if (!box) return;
        if (M.wide) Object.assign(box.style, { left: a.x + 'px', top: (a.y + 4) + 'px', width: a.w + 'px', height: Math.min(140, a.h - 8) + 'px' });
        else Object.assign(box.style, { left: a.x + 'px', top: a.y + 'px', width: a.w + 'px', height: a.h + 'px' });
      }
      async function defencePhase() {
        st.phase = 'defenceIntro'; K.guide(null);
        rec.classList.remove('dim');
        judge.say(L(LINES.defenceCall), { mood: 'calm', ms: 1800 });
        await K.wait(RM() ? 500 : 900);
        say(def, L(LINES.defenceOpen), { mood: 'determined', ms: 2600 });
        const fair = CASE.fair || 'One moment isn’t the whole story, and the facts don’t settle it yet.';
        const wc = fair.split(/\s+/).length, n = inten === 0 || wc < 9 ? 2 : (wc >= 15 || (inten === 2 && wc >= 11) ? 3 : 2);
        const parts = fragments(fair, n);
        DF.parts = parts; DF.next = 0;
        const block = h('div', { class: 'oj-line oj-defl', hidden: true }, h('span', { class: 'oj-num', text: '§' }), h('div', { class: 'oj-cell' }, h('small', { text: 'The defence states' })));
        const cell = block.lastChild;
        DF.slots = parts.map((p, i) => { const s = h('span', { class: 'oj-slot' + (i === 0 ? ' next' : ''), text: String(i + 1) }); cell.append(s, ' '); return s; });
        scroll.append(block); DF.block = block;
        await K.wait(RM() ? 600 : 1500);
        block.hidden = false; rescroll();
        st.zoneBusy = true; hushBottom(); btn.hidden = true;
        const order = K.shuffle(parts.map((p, i) => i), K.rng(K.daily() + 5));
        if (order.every((x, i) => x === i)) order.reverse();
        const box = h('div', { class: 'oj-frags', role: 'group', 'aria-label': 'Pieces of the fair statement' });
        DF.frags = order.map(i => { const b = h('button', { type: 'button', class: 'oj-frag', text: parts[i], 'aria-label': 'Piece: ' + parts[i] + '. Tap to place it next.' }); const f = { i, el: b }; bindFrag(f); box.append(b); return f; });
        DF.box = box; el.append(box); placeFrags();
        st.phase = 'defence';
        fragGuide();
        await new Promise(res => { DF.done = res; });
        await readout();
      }
      function fragGuide(retry) {
        const f = DF.frags.find(x => x.i === DF.next && !x.used); if (!f) return;
        const slot = DF.slots[DF.next];
        K.guide({ id: 'frag' + DF.next + (retry ? 'r' : ''), g: 'drag', target: f.el, dx: 0, dy: -Math.min(120, Math.max(60, K.rectIn(f.el).y - K.rectIn(slot).y)), label: DF.next ? 'NEXT PIECE' : 'DRAG THE FIRST PIECE', delay: retry ? 1400 : 1000, place: 'below' });
      }
      function bindFrag(f) {
        let ghost = null, start = null;
        K.drag(f.el, {
          space: el,
          start: (p) => {
            if (st.phase !== 'defence' || f.used) return false;
            const r = K.rectIn(f.el); start = p;
            ghost = f.el.cloneNode(true); ghost.classList.add('oj-ghost'); ghost.removeAttribute('aria-label');
            Object.assign(ghost.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
            el.append(ghost); f.el.classList.add('lift'); f.off = { x: p.x - r.x, y: p.y - r.y, r };
            K.sfx.pop(undefined, 600); K.guide(null);
          },
          move: (p) => { if (!ghost) return; ghost.style.left = (p.x - f.off.x) + 'px'; ghost.style.top = (p.y - f.off.y) + 'px'; },
          end: (p) => {
            if (!ghost) return;
            const g0 = ghost; ghost = null; f.el.classList.remove('lift');
            const moved = start ? Math.hypot(p.x - start.x, p.y - start.y) : 0;
            const recR = K.rectIn(rec), over = p.y < recR.y + recR.h + 20 && p.y > recR.y - 20;
            if (moved < 10 || over) { if (tryPlace(f, g0)) return; }
            Object.assign(g0.style, { transition: 'left .3s cubic-bezier(.2,1.3,.4,1), top .3s cubic-bezier(.2,1.3,.4,1), opacity .3s ease', left: f.off.r.x + 'px', top: f.off.r.y + 'px', opacity: '0' });
            S.later(() => g0.remove(), 320);
            if (moved >= 10 && !over) { K.sfx.soft(); fragGuide(true); }
          }
        });
        S.listen(f.el, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'defence') { e.preventDefault(); tryPlace(f, null); } });
      }
      function tryPlace(f, ghost) {
        if (f.used || st.phase !== 'defence') return false;
        if (f.i !== DF.next) {
          f.el.classList.remove('nope'); void f.el.offsetWidth; f.el.classList.add('nope');
          K.sfx.soft(); def.face('think', 1400);
          const old = DF.parts[f.i]; f.el.textContent = L(LINES.notYetShort); S.later(() => { if (!f.used) f.el.textContent = old; }, 1100);
          fragGuide(true);
          return false;
        }
        f.used = true; f.el.classList.add('used');
        const slot = DF.slots[DF.next];
        if (ghost) { const sr = K.rectIn(slot); Object.assign(ghost.style, { transition: 'all .25s cubic-bezier(.2,1.2,.4,1)', left: sr.x + 'px', top: sr.y + 'px', width: Math.max(60, sr.w) + 'px', height: sr.h + 'px', opacity: '0.15' }); S.later(() => ghost.remove(), 260); }
        slot.className = 'oj-slot full'; slot.textContent = DF.parts[DF.next];
        DF.next++;
        if (DF.slots[DF.next]) DF.slots[DF.next].classList.add('next');
        K.sfx.good(undefined, 3 + DF.next * 2); SND.paper();
        try { const r = K.rectIn(slot); P.emit('star', r.cx, r.cy, 10, { colors: ['#ffe58a', '#fff6d0'] }); fxLive = true; } catch (e) { /* layout */ }
        def.face('happy', 1200); def.react('bounce');
        setDoubt(st.doubt + 0.08 / DF.parts.length);
        S.later(rescroll, 60);
        ctx.track('piece', { n: DF.next });
        if (DF.next >= DF.parts.length) { K.guide(null); S.later(() => { if (DF.box) { DF.box.remove(); DF.box = null; } const d = DF.done; DF.done = null; if (d) d(); }, 420); }
        else fragGuide();
        return true;
      }
      async function readout() {
        st.phase = 'readout'; st.zoneBusy = false; DF.lit = 0;
        const full = DF.parts.join(' ');
        say(def, L(LINES.reads) + ' “' + clip(full, M.wide ? 150 : 96) + '”', { mood: 'determined', ms: 4200 });
        juryMood('think', 2400);
        if (A.ctx) { const t = A.now(); ['D4', 'F#4', 'A4', 'D5'].forEach((n, i) => A.chime(A.note(n), { when: t + 0.1 + i * 0.22, vol: 0.05, dur: 1.6 })); }
        await K.wait(RM() ? 1600 : 3200);
        mark({ cell: DF.block.lastChild }, 'gd', 'Fair');
        juryMood('happy', 2000);
        await K.wait(RM() ? 400 : 900);
      }
      function readoutTick() {
        if (DF.lit < DF.slots.length && st.step % 2 === 0) { DF.slots[DF.lit].classList.add('lit'); DF.lit++; SND.key(); }
      }

      /* ---------------- verdict: the finale ---------------- */
      function placeVerdict() {
        const e = st.verdictEl; if (!e) return;
        e.style.left = (M.W / 2) + 'px';
        e.style.top = (M.wide ? M.rec.y + 120 : M.rec.y + Math.min(118, M.rec.h * 0.3)) + 'px';
      }
      function placeBook() {
        const e = st.bookEl; if (!e) return;
        e.style.left = (M.W / 2) + 'px';
        const vr = st.verdictEl ? K.rectIn(st.verdictEl) : { y: M.rec.y, h: 160 };
        e.style.top = Math.round(Math.min(vr.y + vr.h + (M.wide ? 30 : 18), M.charY - 12 - (e.offsetHeight || 150))) + 'px';
      }
      async function verdictPhase() {
        st.phase = 'verdict'; K.guide(null); btn.hidden = true; hushBottom();
        judge.say(L(LINES.jury), { mood: 'think', ms: 2300 });
        rec.classList.add('gone');
        st.juryTo = 1; st.whisper = 1; SND.whispers(2.4);
        juryMood('think', 2600);
        await K.wait(RM() ? 900 : 2400);
        st.whisper = 0; jurors[0].hop = now(); jurors[0].mood = 'wow'; jurors[0].until = now() + 1600;
        SND.drumroll(RM() ? 0.6 : 1.3);
        await K.wait(RM() ? 600 : 1350);
        const plan = support === 'strong';
        const big = plan ? 'Plan ordered' : care ? 'Not proven' : 'Not proven';
        const sub = plan ? 'The real worry stays, and gets a plan: ' + lead('prepare')
          : support === 'some' ? 'Not yet, anyway. Next step: ' + lead('ask')
          : care ? 'The traps are struck. For the real question, ask someone qualified.'
          : clip(DF.parts.join(' '), 120);
        const v = h('div', { class: 'oj-verdict' + (plan ? ' plan' : ''), role: 'status' },
          h('small', null, plan ? 'Traps struck from ' : 'On the charge of ', h('s', { text: clip(CASE.charge, M.wide ? 70 : 44) })),
          h('b', { text: big }), h('span', { class: plan || care || support === 'some' ? 'ad' : '', text: sub }));
        st.verdictEl = v; el.append(v); placeVerdict(); setDoubt(1);
        SND.gavel(true); st.gavelT = now(); shake(1.3); st.flash = RM() ? 0 : 0.9; fxLive = true;
        st.major = true; SEQ.target = [72, 76, 80][inten];
        st.sunT = now();
        launchPapers();
        judge.face('happy'); def.face('celebrate'); def.react('bounce'); pros.face(plan ? 'think' : 'facepalm'); pros.react('shake');
        juryMood('celebrate', 6000);
        ctx.track('verdict', { plan: plan ? 1 : 0, struck: st.struck });
        if (A.ctx) { const t = A.now() + 0.15; A.pad(['D3', 'F#3', 'A3', 'D4', 'F#4'].map(n => A.note(n)), { when: t, dur: 5.5, vol: 0.2, attack: 0.25 }); ['A5', 'D6', 'F#6', 'A6'].forEach((n, i) => A.chime(A.note(n), { when: t + 0.2 + i * 0.13, vol: 0.06, dur: 2 })); }
        await K.wait(RM() ? 900 : 1700);
        say(pros, L(plan ? LINES.prosPlan : care ? LINES.prosCare : LINES.prosLose), { mood: plan || care ? 'think' : 'facepalm', ms: 3200 });
        await K.wait(RM() ? 900 : 1900);
        st.juryTo = 0;
        showBook();
        S.later(() => say(def, L(care ? LINES.endCare : plan ? LINES.endPlan : support === 'some' ? LINES.endSome : LINES.end), { mood: 'celebrate', ms: 0 }), 900);
        await K.wait(RM() ? 1800 : 3600);
        finishGame();
      }
      function launchPapers() {
        const W = M.W, H = M.H, n = RM() ? 12 : M.wide ? 60 : 38;
        const ox = M.gavel.x, oy = M.gavel.y;
        for (let i = 0; i < n; i++) {
          const fromSide = i % 3 === 0;
          papers.push({ x: fromSide ? (i % 2 ? -20 : W + 20) : ox + (Math.random() - 0.5) * 80, y: fromSide ? H * (0.25 + Math.random() * 0.4) : oy, vx: fromSide ? (i % 2 ? 1 : -1) * (120 + Math.random() * 220) : (Math.random() - 0.5) * 520, vy: fromSide ? -60 - Math.random() * 160 : -260 - Math.random() * 380,
            rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 5, flip: Math.random() * TAU, vf: 2 + Math.random() * 5, w: 16 + Math.random() * 12, life: 0, max: 3.2 + Math.random() * 2 });
        }
        fxLive = true;
      }
      function showBook() {
        const counts = S.store.get('objection:counts', {}) || {};
        const newPages = [];
        Object.keys(st.used).forEach(g => { counts[g] = (counts[g] || 0) + st.used[g]; const c = K.collect(GROUNDS[g].name); if (c.isNew) newPages.push(g); });
        S.store.set('objection:counts', counts);
        const cases = (S.store.get('objection:cases', 0) || 0) + 1; S.store.set('objection:cases', cases);
        st.newPages = newPages; st.cases = cases;
        const acc = st.scores.length ? st.scores.reduce((a, b) => a + b, 0) / st.scores.length : 0.8;
        st.acc = acc; st.tier = K.tier(acc, [0.5, 0.72, 0.88]);
        const list = h('ul', { class: 'oj-blist' });
        GKEYS.forEach(g => { const n = counts[g] || 0, nw = newPages.includes(g); list.append(h('li', { class: (n ? 'on' : '') + (nw ? ' new' : '') }, h('b', { text: n ? GROUNDS[g].short : '? ? ?' }), h('i', { text: n ? (nw ? 'new ×' : '×') + n : '' }))); });
        const book = h('div', { class: 'oj-book', role: 'status' }, h('div', { class: 'oj-page' },
          h('div', { class: 'oj-bhead' }, h('b', { text: 'Law book' }), h('span', { text: 'Case No. ' + String(cases).padStart(3, '0') + ' · ' + COURT.name })),
          list,
          h('div', { class: 'oj-bfoot', text: (st.tier ? st.tier + ' counsel' : 'Counsel') + ' · ' + st.struck + ' struck' + (st.bestChain > 1 ? ' · best chain ×' + st.bestChain : '') })));
        st.bookEl = book; el.append(book); placeBook();
        if (A.ctx) { K.sfx.paper(); A.chime(A.note('E6'), { when: A.now() + 0.2, vol: 0.05, dur: 1.2 }); }
      }
      function finishGame() {
        if (st.finished) return; st.finished = true;
        const best = K.best('chain', st.bestChain, 'higher');
        const badges = [];
        if (st.tier) badges.push(st.tier + ' counsel');
        if (best.isNew && st.bestChain > 1) badges.push('New best: ×' + st.bestChain + ' objection chain');
        (st.newPages || []).slice(0, 2).forEach(g => badges.push('Law book: ' + GROUNDS[g].name));
        const plan = support === 'strong';
        const names = Object.keys(st.used).map(g => GROUNDS[g].name);
        ctx.finish({
          title: plan ? 'Traps struck. Plan ordered.' : 'Not proven',
          mood: 'celebrate',
          lines: [st.struck + ' thinking trap' + (st.struck === 1 ? '' : 's') + ' struck from the record', names.length ? 'Grounds: ' + clip(names.join(', '), 70) : 'The facts stayed on the record', 'Fair version: ' + clip(DF.parts ? DF.parts.join(' ') : CASE.fair, 80)],
          share: plan ? 'OBJECTION! The thinking traps got struck. The real worry got a plan.' : 'OBJECTION! Sustained. My worst thought got thrown out of court.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- canvas: the courtroom ---------------- */
      function rr(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function arch(g, x, y, w, hh) { g.beginPath(); g.moveTo(x, y + hh); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + hh); g.closePath(); }
      function renderRoom() {
        roomDirty = false; PAL = pal();
        const W = M.W, H = M.H, dpr = cv.dpr || 1, Pl = PAL;
        room.width = Math.max(2, Math.round(W * dpr)); room.height = Math.max(2, Math.round(H * dpr));
        const g = room.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const floorY = M.bench.y + M.bench.h;
        if (COURT.key === 'rooftop') drawRoof(g, Pl, floorY); else drawWall(g, Pl, floorY);
        drawFloor(g, Pl, floorY);
        drawBench(g, Pl);
        drawBar(g, Pl);
        const gr = g.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.25, W / 2, H * 0.5, Math.hypot(W, H) * 0.62);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, bright() ? 'rgba(60,30,10,0.2)' : 'rgba(0,0,0,0.5)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        renderBeams(Pl);
      }
      function drawWall(g, Pl, floorY) {
        const W = M.W;
        let gr = g.createLinearGradient(0, 0, 0, floorY); gr.addColorStop(0, Pl.wall0); gr.addColorStop(1, Pl.wall1);
        g.fillStyle = gr; g.fillRect(0, 0, W, floorY + 2);
        if (COURT.key === 'tiny') { g.fillStyle = hexA(Pl.accent, bright() ? 0.22 : 0.16); for (let y = 12, r = 0; y < floorY; y += 24, r++) for (let x = (r % 2) * 12; x < W; x += 24) { g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill(); } }
        else { g.fillStyle = hexA('#000000', bright() ? 0.035 : 0.12); for (let x = 0; x < W; x += 18) g.fillRect(x, 0, 6, floorY); }
        g.fillStyle = Pl.woodLo; g.fillRect(0, 0, W, 8); g.fillStyle = Pl.woodHi; g.fillRect(0, 8, W, 2);
        M.wins.forEach((wn, i) => drawWindow(g, wn, Pl, i));
        const wy = M.bench.y + M.bench.h * 0.3;
        g.fillStyle = Pl.panel; g.fillRect(0, wy, W, floorY - wy);
        g.fillStyle = Pl.woodHi; g.fillRect(0, wy - 3, W, 3);
        g.strokeStyle = Pl.panelLine; g.lineWidth = 1.5; const pw = M.wide ? 90 : 60;
        for (let x = 6; x < W - 20; x += pw) g.strokeRect(x + 6, wy + 7, pw - 12, Math.max(4, floorY - wy - 14));
        if (COURT.key === 'tiny') drawRuler(g, Pl);
        if (M.wide) drawEmblem(g, Pl, W / 2, M.judge.y - 2 + M.judge.s / 2);
      }
      function drawRuler(g, Pl) {
        const x = M.wide ? M.W - 330 : M.W * 0.5 - 150, y = M.wide ? 86 : 62, w = M.wide ? 54 : 30, len = M.wide ? 300 : 96;
        if (!M.wide) return;
        g.save(); g.translate(x, y); g.rotate(0.08);
        g.fillStyle = '#f2d36b'; rr(g, 0, 0, w, len, 4); g.fill(); g.strokeStyle = 'rgba(80,50,10,.6)'; g.lineWidth = 1.2;
        for (let i = 0; i < len; i += 10) { g.beginPath(); g.moveTo(0, i); g.lineTo(i % 50 === 0 ? 18 : 9, i); g.stroke(); }
        g.restore();
      }
      function drawEmblem(g, Pl, cx, cy) {
        const r = M.judge.s * 0.86;
        const gr = g.createRadialGradient(cx, cy, 2, cx, cy, r * 1.6); gr.addColorStop(0, hexA(Pl.brass, 0.25)); gr.addColorStop(1, hexA(Pl.brass, 0));
        g.fillStyle = gr; g.fillRect(cx - r * 1.6, cy - r * 1.6, r * 3.2, r * 3.2);
        g.strokeStyle = hexA(Pl.brass, 0.55); g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
        g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, r - 7, 0, TAU); g.stroke();
      }
      function drawWindow(g, wn, Pl, idx) {
        const { x, y, w } = wn, hh = wn.h;
        g.fillStyle = Pl.frame; arch(g, x - 5, y - 5, w + 10, hh + 10); g.fill();
        const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, Pl.sky0); gr.addColorStop(1, Pl.sky1);
        g.fillStyle = gr; arch(g, x, y, w, hh); g.fill();
        g.save(); arch(g, x, y, w, hh); g.clip();
        if (COURT.key === 'night') {
          g.fillStyle = '#ffffff'; for (let i = 0; i < 14; i++) { g.globalAlpha = 0.3 + ((i * 37) % 10) / 14; g.fillRect(x + ((i * 53) % w), y + ((i * 71) % (hh * 0.7)), 1.6, 1.6); }
          g.globalAlpha = 1;
          if (idx === 0 || idx === 2) { const mx = x + w * 0.62, my = y + w * 0.55; g.fillStyle = '#f4f1dc'; g.beginPath(); g.arc(mx, my, w * 0.18, 0, TAU); g.fill(); g.fillStyle = Pl.sky0; g.beginPath(); g.arc(mx + w * 0.08, my - w * 0.04, w * 0.16, 0, TAU); g.fill(); }
        } else {
          g.fillStyle = hexA('#ffffff', bright() ? 0.7 : 0.35);
          for (let i = 0; i < 3; i++) { const cx = x + w * (0.2 + 0.35 * ((i + idx) % 3)), cy = y + hh * (0.35 + 0.18 * i); g.beginPath(); g.ellipse(cx, cy, w * 0.28, w * 0.09, 0, 0, TAU); g.fill(); }
        }
        g.restore();
        g.strokeStyle = Pl.frame; g.lineWidth = 3; g.beginPath(); g.moveTo(x + w / 2, y + 2); g.lineTo(x + w / 2, y + hh);
        for (let k = 1; k < 4; k++) { const yy = y + w / 2 + (hh - w / 2) * k / 4; g.moveTo(x, yy); g.lineTo(x + w, yy); }
        g.stroke();
        g.fillStyle = Pl.woodHi; g.fillRect(x - 8, y + hh, w + 16, 5);
      }
      function drawRoof(g, Pl, floorY) {
        const W = M.W;
        let gr = g.createLinearGradient(0, 0, 0, floorY); gr.addColorStop(0, Pl.sky0); gr.addColorStop(1, Pl.sky1);
        g.fillStyle = gr; g.fillRect(0, 0, W, floorY + 2);
        const sx = W * (M.wide ? 0.82 : 0.84), sy = floorY * (M.wide ? 0.52 : 0.6);
        const sg = g.createRadialGradient(sx, sy, 2, sx, sy, M.wide ? 160 : 90); sg.addColorStop(0, hexA(Pl.sun, 0.95)); sg.addColorStop(0.25, hexA(Pl.sun, 0.5)); sg.addColorStop(1, hexA(Pl.sun, 0));
        g.fillStyle = sg; g.fillRect(sx - 170, sy - 170, 340, 340);
        g.fillStyle = hexA('#ffffff', bright() ? 0.75 : 0.22);
        [[0.18, 0.3, 1], [0.5, 0.18, 0.8], [0.66, 0.42, 1.2]].forEach(([fx, fy, s]) => { const cx = W * fx, cy = floorY * fy, rw = (M.wide ? 70 : 34) * s; g.beginPath(); g.ellipse(cx, cy, rw, rw * 0.26, 0, 0, TAU); g.ellipse(cx + rw * 0.4, cy - rw * 0.14, rw * 0.5, rw * 0.24, 0, 0, TAU); g.fill(); });
        g.fillStyle = Pl.skyline;
        const base = floorY - (M.wide ? 30 : 16); let x = 0, i = 0;
        while (x < W) { const bw = (M.wide ? 40 : 22) + ((i * 37) % 5) * (M.wide ? 14 : 7), bh = (M.wide ? 60 : 26) + ((i * 53) % 7) * (M.wide ? 18 : 8); g.fillRect(x, base - bh, bw - 3, bh + 40); x += bw; i++; }
        g.fillStyle = hexA('#ffe9a8', bright() ? 0 : 0.7);
        x = 0; i = 0; while (x < W) { const bw = (M.wide ? 40 : 22) + ((i * 37) % 5) * (M.wide ? 14 : 7), bh = (M.wide ? 60 : 26) + ((i * 53) % 7) * (M.wide ? 18 : 8); for (let k = 0; k < 4; k++) if ((i * 7 + k * 3) % 5 === 0) g.fillRect(x + 4 + (k % 2) * 8, base - bh + 6 + Math.floor(k / 2) * 9, 3, 4); x += bw; i++; }
        g.strokeStyle = hexA('#000000', 0.35); g.lineWidth = 1; g.beginPath(); g.moveTo(0, floorY * 0.2); g.quadraticCurveTo(W / 2, floorY * 0.34, W, floorY * 0.2); g.stroke();
        const cols = ['#ff6b6b', '#ffd36b', '#6bd3ff', '#9cff8a'];
        for (let k = 1; k < 16; k++) { const t = k / 16, bx = W * t, by = floorY * 0.2 + Math.sin(Math.PI * t) * floorY * 0.14 * 0.5 + 1; g.fillStyle = cols[k % 4]; g.beginPath(); g.moveTo(bx - 6, by); g.lineTo(bx + 6, by); g.lineTo(bx, by + 11); g.closePath(); g.fill(); }
      }
      function drawFloor(g, Pl, floorY) {
        const W = M.W, H = M.H;
        let gr = g.createLinearGradient(0, floorY, 0, H); gr.addColorStop(0, Pl.floor0); gr.addColorStop(1, Pl.floor1);
        g.fillStyle = gr; g.fillRect(0, floorY, W, H - floorY);
        g.strokeStyle = hexA('#000000', bright() ? 0.09 : 0.28); g.lineWidth = 1;
        const vy = floorY - (H - floorY) * 1.4;
        for (let i = -16; i <= 16; i++) { const bx = W / 2 + i * W / 9; g.beginPath(); g.moveTo(lerp(W / 2, bx, (floorY - vy) / (H - vy)), floorY); g.lineTo(bx, H); g.stroke(); }
        const t0 = M.bench.w * 0.14, t1 = M.wide ? W * 0.17 : W * 0.33;
        g.fillStyle = Pl.carpet; g.beginPath(); g.moveTo(W / 2 - t0, floorY); g.lineTo(W / 2 + t0, floorY); g.lineTo(W / 2 + t1, H); g.lineTo(W / 2 - t1, H); g.closePath(); g.fill();
        g.strokeStyle = hexA(Pl.brass, 0.55); g.lineWidth = 2;
        g.beginPath(); g.moveTo(W / 2 - t0 + 6, floorY); g.lineTo(W / 2 - t1 + 14, H); g.moveTo(W / 2 + t0 - 6, floorY); g.lineTo(W / 2 + t1 - 14, H); g.stroke();
      }
      function seal(g, cx, cy, r, Pl) {
        g.fillStyle = Pl.brass; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
        g.strokeStyle = Pl.woodLo; g.lineWidth = Math.max(1.2, r * 0.09); g.beginPath(); g.arc(cx, cy, r * 0.82, 0, TAU); g.stroke();
        g.lineWidth = Math.max(1.2, r * 0.1); g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx, cy - r * 0.55); g.lineTo(cx, cy + r * 0.45); g.moveTo(cx - r * 0.5, cy - r * 0.35); g.lineTo(cx + r * 0.5, cy - r * 0.35); g.moveTo(cx - r * 0.25, cy + r * 0.48); g.lineTo(cx + r * 0.25, cy + r * 0.48); g.stroke();
        g.beginPath(); g.arc(cx - r * 0.5, cy - r * 0.1, r * 0.2, 0, Math.PI); g.moveTo(cx + r * 0.7, cy - r * 0.1); g.arc(cx + r * 0.5, cy - r * 0.1, r * 0.2, 0, Math.PI); g.stroke();
        g.lineCap = 'butt';
      }
      function drawBench(g, Pl) {
        const B = M.bench, x = B.x, y = B.y, w = B.w, hh = B.h;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 6, y + hh, w - 12, 7);
        if (COURT.key === 'tiny') {
          const bk = Pl.books, n = 3, bh = (hh - 4) / n;
          for (let i = 0; i < n; i++) {
            const by = y + 4 + i * bh, inset = (n - 1 - i) * 4 - 8 + (i === 1 ? 6 : 0), bx = x + inset, bw = w - inset * 2;
            g.fillStyle = '#f7efdc'; rr(g, bx + 6, by + 2, bw - 4, bh - 4, 3); g.fill();
            g.strokeStyle = 'rgba(120,90,60,.35)'; g.lineWidth = 1; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(bx + bw - 14, by + 2 + k * (bh - 4) / 4); g.lineTo(bx + bw + 1, by + 2 + k * (bh - 4) / 4); g.stroke(); }
            g.fillStyle = bk[(i + 1) % bk.length]; rr(g, bx, by, bw - 12, bh - 1, 4); g.fill();
            g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(bx + 2, by + 2, bw - 16, 2);
            g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(bx, by + bh - 4, bw - 12, 3);
            g.fillStyle = Pl.brass; [bx + 14, bx + bw - 30].forEach(sx => g.fillRect(sx, by + 2, 4, bh - 5));
          }
          const ly = y + 4 + bh * 1.5, lab = 'TINY CLAIMS COURT';
          g.font = '700 ' + (M.wide ? 14 : 12) + 'px ' + SERIF; const tw = g.measureText(lab).width + 18;
          g.fillStyle = '#fff6e2'; rr(g, x + w / 2 - tw / 2, ly - 9, tw, 18, 4); g.fill();
          g.fillStyle = '#5a3a24'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, x + w / 2, ly + 1);
          return;
        }
        g.fillStyle = Pl.woodHi; rr(g, x - 8, y, w + 16, 9, 3); g.fill();
        const gr = g.createLinearGradient(0, y + 9, 0, y + hh); gr.addColorStop(0, Pl.wood); gr.addColorStop(1, Pl.woodLo);
        g.fillStyle = gr; g.fillRect(x, y + 9, w, hh - 9);
        const n = M.wide ? 5 : 3, pw = (w - 16) / n;
        g.strokeStyle = hexA(Pl.woodHi, 0.6); g.lineWidth = 1.5;
        for (let i = 0; i < n; i++) { if (i === (n - 1) / 2) continue; g.strokeRect(x + 8 + i * pw + 5, y + 15, pw - 10, hh - 23); }
        const cx = x + w / 2, r = M.wide ? 20 : 12;
        seal(g, cx, y + 9 + (M.wide ? 30 : 17), r, Pl);
        { const lab = 'COURT OF SECOND THOUGHTS', ly = y + hh - (M.wide ? 18 : 11); g.font = '700 ' + (M.wide ? 14 : 12) + 'px ' + SERIF; const tw = g.measureText(lab).width + 20;
          g.fillStyle = Pl.brass; rr(g, cx - tw / 2, ly - (M.wide ? 11 : 9), tw, M.wide ? 22 : 18, 3); g.fill();
          g.fillStyle = hexA('#ffffff', 0.25); g.fillRect(cx - tw / 2 + 3, ly - (M.wide ? 10 : 8), tw - 6, 1.5);
          g.fillStyle = Pl.woodLo; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, cx, ly + 1); }
        if (COURT.key === 'night') { [x + 18, x + w - 18].forEach(lx => { g.fillStyle = '#2a4a32'; g.beginPath(); g.ellipse(lx, y - 1, 13, 7, 0, Math.PI, 0); g.fill(); g.fillStyle = Pl.brass; g.fillRect(lx - 1, y - 1, 2, 3); }); }
      }
      function drawBar(g, Pl) {
        if (!M.wide) {
          const y = M.bar.y, hh = M.bar.h, W = M.W;
          g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, y + hh, W, 6);
          g.fillStyle = Pl.woodHi; g.fillRect(0, y, W, 5);
          const gr = g.createLinearGradient(0, y + 5, 0, y + hh); gr.addColorStop(0, Pl.wood); gr.addColorStop(1, Pl.woodLo);
          g.fillStyle = gr; g.fillRect(0, y + 5, W, hh - 5);
          g.fillStyle = hexA('#000000', 0.25); for (let x = 22; x < W; x += 34) g.fillRect(x, y + 8, 2, hh - 11);
          plate(g, Pl, M.def.x + M.def.s / 2, y + hh / 2 + 2, 'DEFENCE');
          plate(g, Pl, M.pros.x + M.pros.s / 2, y + hh / 2 + 2, 'PROSECUTION');
        } else {
          [[M.def, 'DEFENCE'], [M.pros, 'PROSECUTION']].forEach(([c, lab]) => {
            const dx = c.x - 26, dw = c.s + 52, dy = c.y + c.s - 8, dh = M.H - dy;
            g.fillStyle = Pl.woodHi; rr(g, dx - 6, dy, dw + 12, 8, 3); g.fill();
            const gr = g.createLinearGradient(0, dy + 8, 0, M.H); gr.addColorStop(0, Pl.wood); gr.addColorStop(1, Pl.woodLo);
            g.fillStyle = gr; g.fillRect(dx, dy + 8, dw, dh);
            plate(g, Pl, c.x + c.s / 2, dy + 22, lab);
          });
        }
      }
      function plate(g, Pl, cx, cy, label) {
        g.font = '700 12px ' + SERIF; const tw = g.measureText(label).width + 16;
        cx = clamp(cx, tw / 2 + 6, M.W - tw / 2 - 6);
        g.fillStyle = Pl.brass; rr(g, cx - tw / 2, cy - 9, tw, 18, 3); g.fill();
        g.fillStyle = Pl.woodLo; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, cx, cy + 1);
      }
      function renderBeams(Pl) {
        const W = M.W, H = M.H;
        beamCv.width = Math.max(2, Math.round(W * 0.5)); beamCv.height = Math.max(2, Math.round(H * 0.5));
        const g = beamCv.getContext('2d'); g.setTransform(0.5, 0, 0, 0.5, 0, 0); g.clearRect(0, 0, W, H);
        g.globalCompositeOperation = 'lighter';
        const src = COURT.key === 'rooftop' ? [{ x: W * (M.wide ? 0.82 : 0.84) - 30, y: (M.bench.y + M.bench.h) * (M.wide ? 0.52 : 0.6), w: 60, h: 10, sun: true }] : M.wins;
        src.forEach(wn => {
          const right = wn.x + wn.w / 2 > W / 2, dir = right ? -1 : 1, len = H * 1.25;
          const ax = wn.x, bx = wn.x + wn.w, y0 = wn.y + wn.h * (wn.sun ? 0 : 0.25), y1 = wn.y + wn.h;
          const dx = dir * len * (M.wide ? 0.42 : 0.62), dy = len;
          const gr = g.createLinearGradient(wn.x, y0, wn.x + dx * 0.6, y0 + dy * 0.6);
          gr.addColorStop(0, hexA(Pl.beam, 0.34)); gr.addColorStop(1, hexA(Pl.beam, 0));
          g.fillStyle = gr; g.beginPath(); g.moveTo(ax, y0); g.lineTo(bx, y1); g.lineTo(bx + dx * (wn.sun ? 1.3 : 1), y1 + dy); g.lineTo(ax + dx * (wn.sun ? 0.7 : 1), y0 + dy); g.closePath(); g.fill();
        });
      }
      const motes = Array.from({ length: 26 }, (v, i) => ({ x: (i * 97.3) % 1, y: (i * 61.7) % 1, s: 0.8 + (i % 4) * 0.5, ph: i * 1.3 }));
      function curJury() {
        const k = K.ease.inOutCubic(st.juryK), a = M.jury, b = M.juryBig;
        return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) };
      }
      function drawJury(g, t) {
        const J = curJury(), n = jurors.length, Pl = PAL, tn = now();
        const railY = J.y + J.h * 0.66, fs = Math.min(J.h * 0.64, (J.w - 12) / n * 0.92);
        g.fillStyle = hexA(Pl.woodLo, 0.94); rr(g, J.x, J.y + J.h * 0.16, J.w, J.h * 0.52, 8); g.fill();
        g.strokeStyle = hexA(Pl.woodHi, 0.35); g.lineWidth = 1.2; const np = Math.max(2, Math.round(J.w / 70)), pw2 = (J.w - 12) / np;
        for (let k = 0; k < np; k++) g.strokeRect(J.x + 6 + k * pw2 + 3, J.y + J.h * 0.16 + 6, pw2 - 6, J.h * 0.52 - 10);
        for (let i = 0; i < n; i++) {
          const j = jurors[i]; if (j.until && tn > j.until) { j.mood = j.base; j.until = 0; }
          const cx = J.x + J.w * (i + 0.5) / n;
          const hopK = j.hop ? Math.max(0, 1 - (tn - j.hop) / 420) : 0;
          const bob = Math.sin(t * 1.8 + j.ph) * 1.5 + Math.sin(Math.min(1, (tn - j.hop) / 420) * Math.PI) * (hopK > 0 ? fs * 0.16 : 0);
          const lean = st.whisper ? Math.sin(t * 5 + i) * fs * 0.06 + (i % 2 ? -1 : 1) * fs * 0.08 : 0;
          const img = faceImg(j.slug, j.mood);
          const fy = railY - fs - 2 - Math.max(0, bob);
          if (img.complete && img.naturalWidth) g.drawImage(img, cx - fs / 2 + lean, fy, fs, fs);
          if (st.whisper && i % 2 === 0 && i + 1 < n) {
            const wx = cx + fs * 0.45, wy = fy - fs * 0.12, bw = fs * 0.62, bh2 = fs * 0.3;
            g.fillStyle = 'rgba(255,250,240,.92)'; rr(g, wx - bw / 2, wy - bh2 / 2, bw, bh2, bh2 / 2); g.fill();
            g.fillStyle = '#6a4a30'; for (let d = 0; d < 3; d++) { const on = ((t * 3 + d * 0.33) % 1) < 0.6; g.globalAlpha = on ? 0.9 : 0.35; g.beginPath(); g.arc(wx - bw * 0.22 + d * bw * 0.22, wy, bh2 * 0.13, 0, TAU); g.fill(); }
            g.globalAlpha = 1;
          }
        }
        const rg = g.createLinearGradient(0, railY, 0, railY + J.h * 0.34); rg.addColorStop(0, Pl.wood); rg.addColorStop(1, Pl.woodLo);
        g.fillStyle = rg; rr(g, J.x - 3, railY, J.w + 6, J.h * 0.34, 6); g.fill();
        g.fillStyle = Pl.brass; g.fillRect(J.x - 3, railY, J.w + 6, 3);
        g.fillStyle = hexA('#000000', 0.18); for (let x = J.x + 14; x < J.x + J.w - 6; x += 22) g.fillRect(x, railY + 6, 2, J.h * 0.34 - 10);
        if (J.h > 60) { g.font = '700 12px ' + SERIF; const tw = g.measureText('THE JURY').width + 18, cy = railY + J.h * 0.17 + 1; g.fillStyle = Pl.brass; rr(g, J.x + J.w / 2 - tw / 2, cy - 9, tw, 18, 3); g.fill(); g.fillStyle = Pl.woodLo; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('THE JURY', J.x + J.w / 2, cy + 1); }
      }
      function drawGavel(g) {
        const G = M.gavel, dt = (now() - st.gavelT) / 1000, Pl = PAL, s = M.wide ? 1.3 : 1;
        let ang = 0.7;
        if (dt >= 0 && dt < 0.08) ang = lerp(0.7, -0.12, dt / 0.08);
        else if (dt >= 0.08 && dt < 0.55) ang = lerp(-0.12, 0.7, K.ease.outCubic((dt - 0.08) / 0.47));
        g.fillStyle = Pl.woodLo; rr(g, G.x - 34 * s, G.y - 4 * s, 22 * s, 6 * s, 2); g.fill();
        g.save(); g.translate(G.x, G.y - 6 * s); g.rotate(ang);
        g.fillStyle = Pl.woodHi; g.fillRect(-26 * s, -2 * s, 26 * s, 4 * s);
        g.fillStyle = Pl.wood; rr(g, -36 * s, -8 * s, 13 * s, 16 * s, 3); g.fill();
        g.fillStyle = Pl.brass; g.fillRect(-36 * s, -2.5 * s, 13 * s, 2.5 * s);
        g.restore();
        if (dt >= 0.07 && dt < 0.5 && !RM()) { const k = (dt - 0.07) / 0.43; g.strokeStyle = hexA('#fff6d0', 0.7 * (1 - k)); g.lineWidth = 2; g.beginPath(); g.ellipse(G.x - 23 * s, G.y - 2, 10 + k * 34 * s, 3 + k * 10 * s, 0, 0, TAU); g.stroke(); }
      }
      function drawClock(g, t) {
        const c = M.clock, Pl = PAL; if (!c) return;
        const beat = st.beatT ? Math.min(1, (now() - st.beatT) / (60000 / SEQ.bpm)) : (t * SEQ.bpm / 60) % 1;
        const side = st.beatN % 2 ? 1 : -1, ang = side * Math.cos(beat * Math.PI) * 0.32;
        g.fillStyle = Pl.woodLo; rr(g, c.x - 36, c.y - 40, 72, 230, 10); g.fill();
        g.fillStyle = Pl.wood; rr(g, c.x - 30, c.y - 34, 60, 218, 8); g.fill();
        g.fillStyle = bright() ? 'rgba(255,250,235,.55)' : 'rgba(10,8,20,.55)'; rr(g, c.x - 22, c.y + 30, 44, 150, 6); g.fill();
        g.strokeStyle = Pl.brass; g.lineWidth = 1.5; rr(g, c.x - 22, c.y + 30, 44, 150, 6); g.stroke();
        g.fillStyle = '#f6efdc'; g.beginPath(); g.arc(c.x, c.y, 24, 0, TAU); g.fill();
        g.strokeStyle = Pl.woodLo; g.lineWidth = 2; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(c.x + Math.cos(a) * 19, c.y + Math.sin(a) * 19); g.lineTo(c.x + Math.cos(a) * 22, c.y + Math.sin(a) * 22); g.stroke(); }
        g.lineWidth = 2.4; g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(c.x + 10, c.y - 6); g.moveTo(c.x, c.y); g.lineTo(c.x - 2, c.y - 16); g.stroke();
        g.save(); g.beginPath(); g.rect(c.x - 22, c.y + 30, 44, 150); g.clip();
        g.translate(c.x, c.y + 30); g.rotate(ang); g.strokeStyle = Pl.brass; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 110); g.stroke();
        g.fillStyle = '#e8b64a'; g.beginPath(); g.arc(0, 118, 11, 0, TAU); g.fill(); g.strokeStyle = '#7a5418'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = hexA('#ffffff', 0.55); g.beginPath(); g.arc(-3, 115, 4, 0, TAU); g.fill();
        g.restore();
      }
      function drawLamps(g) {
        if (COURT.key !== 'night') return;
        const B = M.bench, Pl = PAL, spr = K.glowSprite(Pl.lamp);
        [B.x + 18, B.x + B.w - 18].forEach(lx => { g.globalAlpha = 0.5; g.drawImage(spr, lx - 34, B.y - 30, 68, 68); g.globalAlpha = 1; });
      }
      function renderBase() {
        const W = M.W, H = M.H, dpr = cv.dpr || 1, Pl = PAL;
        if (base.width !== room.width || base.height !== room.height) { base.width = room.width; base.height = room.height; }
        const g = base.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.drawImage(room, 0, 0, W, H);
        const tense = (1 - st.doubt) * (1 - st.sunK);
        if (tense > 0.01) { g.fillStyle = hexA(Pl.tense, (bright() ? 0.14 : 0.3) * tense); g.fillRect(0, 0, W, H); }
        if (st.sunK > 0 && COURT.key !== 'rooftop') {
          M.wins.forEach(wn => {
            g.save(); g.globalCompositeOperation = 'lighter';
            const wg = g.createLinearGradient(0, wn.y, 0, wn.y + wn.h); wg.addColorStop(0, hexA('#fff4c8', (bright() ? 0.32 : 0.6) * st.sunK)); wg.addColorStop(1, hexA('#ffc870', (bright() ? 0.22 : 0.45) * st.sunK));
            g.fillStyle = wg; arch(g, wn.x, wn.y, wn.w, wn.h); g.fill(); g.restore();
            g.strokeStyle = Pl.frame; g.lineWidth = 3; g.beginPath(); g.moveTo(wn.x + wn.w / 2, wn.y + 2); g.lineTo(wn.x + wn.w / 2, wn.y + wn.h);
            for (let k = 1; k < 4; k++) { const yy = wn.y + wn.w / 2 + (wn.h - wn.w / 2) * k / 4; g.moveTo(wn.x, yy); g.lineTo(wn.x + wn.w, yy); }
            g.stroke();
          });
        }
        const beamA = clamp(0.22 + st.doubt * 0.32 + st.sunK * 0.95, 0, 1.4);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, beamA * (bright() ? 0.55 : 0.85)); g.drawImage(beamCv, 0, 0, W, H); g.restore();
        drawLamps(g);
      }
      function dynRects() {
        const out = [], J = curJury(), fs = Math.min(J.h * 0.64, (J.w - 12) / jurors.length * 0.92), s = M.wide ? 1.3 : 1;
        out.push({ x: J.x - 8, y: J.y - fs * 0.62 - 4, w: J.w + 16, h: J.h + fs * 0.62 + 10 });
        out.push({ x: M.gavel.x - 84 * s, y: M.gavel.y - 52 * s, w: 104 * s, h: 70 * s });
        if (M.wide && M.clock) out.push({ x: M.clock.x - 40, y: M.clock.y - 44, w: 80, h: 240 });
        return out;
      }
      function drawMain(t, full) {
        const g = cv.g, W = M.W, H = M.H, Pl = PAL, dpr = cv.dpr || 1;
        const sun = st.sunT ? clamp((now() - st.sunT) / 1600, 0, 1) : 0; st.sunK = K.ease.inOutCubic(sun);
        const key = st.doubt.toFixed(2) + ':' + st.sunK.toFixed(2) + ':' + room.width + 'x' + room.height + ':' + (bright() ? 'b' : 'd');
        if (key !== baseKey) { renderBase(); baseKey = key; full = true; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const sk = st.shake > 0.01 ? st.shake : 0, z = 1 + Math.max(st.punch * 0.025, sk * 0.05);
        if (full || z > 1.0005 || st.fullN > 0) {
          if (st.fullN > 0) st.fullN--;
          if (z > 1.0005) { g.translate(W / 2 + (sk ? st.shX : 0), H * 0.42 + (sk ? st.shY : 0)); g.scale(z, z); g.translate(-W / 2, -H * 0.42); }
          g.drawImage(base, 0, 0, W, H);
          if (st.sunK > 0) {
            g.fillStyle = hexA(Pl.beam, 0.5 * st.sunK);
            motes.forEach(m => { const x = ((m.x * W + t * 9 * m.s) % W), y = (m.y * H * 0.85 + Math.sin(t * 0.6 + m.ph) * 14 + t * 4 * m.s) % H; g.fillRect(x, y, m.s * 1.4, m.s * 1.4); });
          }
          if (z > 1.0005) st.fullN = 1;
        } else {
          dynRects().forEach(r => { const x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y)), w = Math.min(W - x, Math.ceil(r.w) + 1), hh = Math.min(H - y, Math.ceil(r.h) + 1); if (w > 0 && hh > 0) g.drawImage(base, x * dpr, y * dpr, w * dpr, hh * dpr, x, y, w, hh); });
        }
        if (M.wide) drawClock(g, t);
        drawJury(g, t);
        drawGavel(g);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function fitFont(g, text, size, maxW) { g.font = '400 ' + size + 'px ' + BFONT; const w = g.measureText(text).width; if (w > maxW) { size = Math.floor(size * maxW / w); g.font = '400 ' + size + 'px ' + BFONT; } return size; }
      function inkText(g, text, size, fill, stroke) {
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        g.fillStyle = stroke; g.fillText(text, 0, size * 0.09);
        g.lineWidth = Math.max(3, size * 0.13); g.strokeStyle = stroke; g.strokeText(text, 0, 0);
        g.fillStyle = fill; g.fillText(text, 0, 0);
      }
      function drawFxText(g) {
        const tn = now(), W = M.W;
        for (let i = FXT.length - 1; i >= 0; i--) {
          const f = FXT[i], age = (tn - f.t0) / 1000, dur = f.kind === 'burst' ? 0.95 : f.kind === 'mini' ? 0.68 : f.kind === 'title' ? 2.1 : 0.8;
          if (age > dur) { FXT.splice(i, 1); continue; }
          const k = age / dur, rm = RM();
          const sc = rm ? 1 : age < 0.1 ? lerp(1.7, 0.93, age / 0.1) : age < 0.19 ? lerp(0.93, 1.04, (age - 0.1) / 0.09) : age < 0.27 ? lerp(1.04, 1, (age - 0.19) / 0.08) : 1 + (k > 0.75 ? (k - 0.75) * 0.3 : 0);
          const a = clamp(k < 0.75 ? age / 0.05 : 1 - (k - 0.75) / 0.25, 0, 1);
          g.save(); g.globalAlpha = a;
          if (f.kind === 'burst' || f.kind === 'mini') {
            const big = f.kind === 'burst', rx = big ? Math.min(220, W * 0.47) : Math.min(124, W * 0.31), ry = rx * 0.56;
            g.translate(f.x, f.y); g.rotate(-0.12); g.scale(sc, sc);
            g.beginPath(); BURST.forEach(([px, py], j) => { if (j) g.lineTo(px * rx, py * ry); else g.moveTo(px * rx, py * ry); }); g.closePath();
            g.lineJoin = 'round'; g.lineWidth = big ? 12 : 8; g.strokeStyle = '#1c0705'; g.stroke();
            g.fillStyle = '#d7192f'; g.fill();
            g.save(); g.scale(0.86, 0.86); g.lineWidth = big ? 4 : 3; g.strokeStyle = '#ffcf4a'; g.stroke(); g.restore();
            const size = fitFont(g, f.text, big ? Math.min(78, W * 0.15) : Math.min(42, W * 0.09), rx * 1.62);
            inkText(g, f.text, size, '#fff3b0', '#240804');
          } else if (f.kind === 'combo') {
            g.translate(f.x, f.y - k * 34); g.rotate(-0.1); g.scale(sc, sc);
            const size = fitFont(g, f.text, M.wide ? 46 : 36, W - 40);
            inkText(g, f.text, size, '#ffe14d', '#2a0a05');
          } else {
            g.translate(f.x, f.y); g.rotate(-0.05); g.scale(sc, sc);
            const size = fitFont(g, f.text, M.wide ? 70 : 46, W - 36);
            inkText(g, f.text, size, '#ffe14d', '#240804');
            if (f.sub) { g.font = '700 13px ' + UIFONT; const tw = g.measureText(f.sub).width + 26, y = size * 0.78; g.fillStyle = '#240804'; rr(g, -tw / 2, y - 14, tw, 28, 14); g.fill(); g.fillStyle = '#ffd36b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f.sub, 0, y + 1); }
          }
          g.restore();
        }
      }
      function drawFx(dt) {
        const g = fx.g, W = M.W, H = M.H; if (!g) return;
        const active = st.speed > 0.01 || st.flash > 0.01 || P.count() > 0 || papers.length > 0 || FXT.length > 0;
        if (!active && !fxLive) return;
        g.setTransform(fx.dpr, 0, 0, fx.dpr, 0, 0); g.clearRect(0, 0, W, H);
        fxLive = active;
        if (!active) return;
        if (st.speed > 0.01) {
          const c = st.speedAt, R2 = Math.hypot(W, H);
          g.save(); g.translate(c.x, c.y); g.rotate(now() / 900);
          for (let i = 0; i < 44; i++) { const a = i / 44 * TAU, w2 = 0.035; g.fillStyle = i % 2 ? hexA('#ffffff', 0.28 * st.speed) : hexA('#1a0805', 0.32 * st.speed); g.beginPath(); g.moveTo(Math.cos(a) * 90, Math.sin(a) * 60); g.lineTo(Math.cos(a - w2) * R2, Math.sin(a - w2) * R2); g.lineTo(Math.cos(a + w2) * R2, Math.sin(a + w2) * R2); g.closePath(); g.fill(); }
          g.restore();
          st.speed = Math.max(0, st.speed - dt * 1.8);
        }
        if (st.flash > 0.01) { g.fillStyle = 'rgba(255,248,230,' + (st.flash * 0.55).toFixed(3) + ')'; g.fillRect(0, 0, W, H); st.flash = Math.max(0, st.flash - dt * 3.2); }
        for (let i = papers.length - 1; i >= 0; i--) {
          const p = papers[i]; p.life += dt; p.vy += 260 * dt; p.vx *= Math.pow(0.4, dt); p.vy = Math.min(p.vy, 120 + Math.sin(p.flip) * 40);
          p.x += (p.vx + Math.sin(p.life * 2.4 + p.rot) * 30) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
          if (p.life > p.max || p.y > H + 40) { papers.splice(i, 1); continue; }
          const a = Math.min(1, (p.max - p.life) / 0.6);
          g.save(); g.globalAlpha = a; g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.max(0.12, Math.abs(Math.cos(p.flip))));
          const w2 = p.w, h2 = p.w * 1.3;
          g.fillStyle = Math.cos(p.flip) > 0 ? '#fffaf0' : '#efe2c5'; g.fillRect(-w2 / 2, -h2 / 2, w2, h2);
          g.fillStyle = 'rgba(80,60,40,.45)'; for (let k = 0; k < 4; k++) g.fillRect(-w2 / 2 + 3, -h2 / 2 + 4 + k * h2 * 0.2, w2 * (k === 3 ? 0.4 : 0.75), 1.2);
          g.restore();
        }
        P.update(dt); P.draw(g);
        if (FXT.length) drawFxText(g);
      }
      K.loop((dt, t) => {
        seqLoop();
        if (!M.W || !cv.g) return;
        const pulse = st.beatT ? Math.exp(-(now() - st.beatT) / 260) : 0, pv = pulse.toFixed(1);
        if (st.glowEl && st.glowEl.__p !== pv) { st.glowEl.__p = pv; st.glowEl.style.setProperty('--pulse', pv); }
        const hot = (st.phase === 'read' && R.line && R.line.kind === 'brain' && !R.line.caught && R.wi > R.line.hot[0]) || st.readback || (st.phase === 'closing' && CL.cur && CL.cur.hot && !CL.cur.res);
        const hv = (hot ? 0.45 + 0.55 * pulse : 0.08 * pulse).toFixed(1);
        if (btn.__h !== hv) { btn.__h = hv; btn.style.setProperty('--hot', hv); }
        const ht = st.phase === 'closing' || st.phase === 'closingIntro' ? 'Traps only · let facts stand' : 'Tap when a phrase glows';
        if (btnHint.textContent !== ht) btnHint.textContent = ht;
        st.juryK += ((st.juryTo) - st.juryK) * Math.min(1, dt * 2.6);
        /* camera shake lives inside the room canvas (cheap); moving the whole DOM root repaints everything */
        if (st.shake > 0) {
          st.shake = Math.max(0, st.shake - dt * 2.6); st.shX = (Math.random() - 0.5) * st.shake * 14; st.shY = (Math.random() - 0.5) * st.shake * 10;
          if (st.shake <= 0.01) { st.shake = 0; st.fullN = Math.max(st.fullN || 0, 1); }
        }
        st.punch = Math.max(0, st.punch - dt * 2.2);
        const moving = (st.juryK > 0.005 && st.juryK < 0.995) || st.sunK > 0 && st.sunK < 1 || (st.phase === 'verdict' && st.sunK > 0);
        st.fr++;
        if (roomDirty) { renderRoom(); baseKey = ''; }
        if (moving || st.punch > 0.01 || st.shake > 0 || st.fr % 2 === 0) drawMain(t, moving);
        drawFx(dt);
      });

      /* ---------------- lines (every one in three vibes) ---------------- */
      const LINES = {
        allRise: { Jolly: 'All rise! Court is in session.', Cheeky: 'Order, order. Phones off.', Unfiltered: 'Order. We begin.' },
        prosOpen: care ? { Jolly: 'The case against you, Your Honour. I’ll be brief.', Cheeky: 'The case against you. Brief, I promise.', Unfiltered: 'The case against you.' } : visits ? { Jolly: 'Back again? Lovely. I’ve polished my best lines.', Cheeky: 'You again. I rehearsed. Twice.', Unfiltered: 'Round two. I’m ready.' }
          : { Jolly: 'The People versus You! I’ll have this wrapped up by lunch.', Cheeky: 'Open and shut, Your Honour. Mostly shut.', Unfiltered: 'The case against you. Let’s begin.' },
        defOpen: { Jolly: 'I’m your co-counsel! When a phrase glows, that’s a thinking trap. Hit OBJECTION!', Cheeky: 'When something glows, it’s a trap. Smash the red button.', Unfiltered: 'Glow means trap. Trap means OBJECTION!' },
        classic: { Jolly: 'No statement filed today, so the critic is doing his greatest hits.', Cheeky: 'Nothing typed? The critic brought his greatest hits anyway.', Unfiltered: 'No statement. Practice case: the critic’s classics.' },
        firstGlow: { Jolly: 'There! It’s glowing. Now!', Cheeky: 'That’s the one. Go!', Unfiltered: 'Now!' },
        grounds: { Jolly: 'On what grounds?', Cheeky: 'Grounds, counsel?', Unfiltered: 'Grounds?' },
        sustained: { Jolly: 'Sustained!', Cheeky: 'Sustained. Strike it.', Unfiltered: 'Sustained.' },
        close: { Jolly: 'Overruled… but close.', Cheeky: 'Close. Not quite.', Unfiltered: 'Close. Again.' },
        onRecord: { Jolly: 'Overruled. That’s on the record.', Cheeky: 'Overruled. That’s a fact.', Unfiltered: 'Overruled. Fact.' },
        factTip: { Jolly: 'Fair try! A camera could have caught that bit, so it stays. Save it for the glow.', Cheeky: 'That one’s a fact. Facts get to stay. Annoying, I know.', Unfiltered: 'Facts stay. Object to the glow.' },
        prosSmug: { Jolly: 'Ha! You can’t object to a fact!', Cheeky: 'Objecting to facts now? Bold.', Unfiltered: 'That’s a fact. Ha.' },
        psst: { Jolly: 'Psst… that sounded like a guess dressed up as a fact.', Cheeky: 'Psst. Did that sound like evidence to you?', Unfiltered: 'Psst. That was a trap.' },
        readBack: { Jolly: 'Read that back, please.', Cheeky: 'Once more, slowly.', Unfiltered: 'Read it back.' },
        explain: {
          spec: { Jolly: 'Nobody in this room can read minds. Not even me.', Cheeky: 'Mind reading isn’t admissible. Or real.', Unfiltered: 'A guess about their head isn’t proof.' },
          pred: { Jolly: 'That’s a forecast, not a fact. The future hasn’t testified yet.', Cheeky: 'The future hasn’t happened. It can’t be evidence.', Unfiltered: 'A prediction isn’t evidence.' },
          over: { Jolly: 'Always? Never? Everyone? That’s a lot of ground for one moment.', Cheeky: '“Everyone”? Did we poll everyone? No.', Unfiltered: 'Too wide. The facts are smaller.' },
          label: { Jolly: 'A name isn’t evidence. What actually happened?', Cheeky: 'Name-calling. In court. Shocking.', Unfiltered: 'A label isn’t a fact.' },
          facts: { Jolly: 'Where’s the proof? The record doesn’t show that.', Cheeky: 'Lovely theory. Zero evidence.', Unfiltered: 'No evidence for that.' },
          should: { Jolly: 'That’s a rule, not a fact. Rules can be kinder.', Cheeky: 'Says who? Show me that rulebook.', Unfiltered: 'A rule, not a fact.' }
        },
        hint: {
          spec: { Jolly: 'Close! Whose head is that claim about?', Cheeky: 'Close. It claims to know someone’s mind.', Unfiltered: 'Close. Think: mind reading.' },
          pred: { Jolly: 'Close! Is that about now, or the future?', Cheeky: 'Close. It’s telling fortunes.', Unfiltered: 'Close. Think: prediction.' },
          over: { Jolly: 'Close! Listen for always, never, everyone.', Cheeky: 'Close. It’s a bit too… total.', Unfiltered: 'Close. Think: all-or-nothing.' },
          label: { Jolly: 'Close! Is that a description, or a name?', Cheeky: 'Close. It’s calling you names.', Unfiltered: 'Close. Think: a label.' },
          facts: { Jolly: 'Close! Is that on camera, or a conclusion?', Cheeky: 'Close. There’s no footage of that.', Unfiltered: 'Close. Think: no evidence.' },
          should: { Jolly: 'Close! Is it a fact, or a rule?', Cheeky: 'Close. Who wrote that rule?', Unfiltered: 'Close. Think: a should.' }
        },
        closingCall: { Jolly: 'Closing arguments.', Cheeky: 'Closings. Briefly.', Unfiltered: 'Closings.' },
        closingOpen: { Jolly: 'Members of the jury! Allow me to repeat myself. Quickly!', Cheeky: 'Members of the jury, brace yourselves. Rapid fire!', Unfiltered: 'Fine. All of it. Fast.' },
        closingTip: { Jolly: 'He’s speeding up! Object to the traps, let the facts stand.', Cheeky: 'Traps: object. Facts: let them be. Go!', Unfiltered: 'Traps only. Go.' },
        closingEnd: { Jolly: 'I… may have overstated my case.', Cheeky: 'I rest my case. It needs a rest.', Unfiltered: 'I’m done.' },
        slipped: { Jolly: 'One slipped by. Next one!', Cheeky: 'Missed one. He’s slippery.', Unfiltered: 'Next.' },
        combo3: { Jolly: 'Stop objecting so well!', Cheeky: 'This is harassment! Legal harassment!', Unfiltered: 'Stop that.' },
        combo6: { Jolly: 'My notes! My beautiful notes!', Cheeky: 'I would like a different defence lawyer.', Unfiltered: 'Fine. FINE.' },
        defenceCall: { Jolly: 'The defence may close.', Cheeky: 'Defence. Keep it fair.', Unfiltered: 'Defence.' },
        defenceOpen: { Jolly: 'Our turn. Let’s put the fair version together, piece by piece.', Cheeky: 'Right. Let’s say it fairly. In order, ideally.', Unfiltered: 'Build the fair version.' },
        notYet: { Jolly: 'Nearly! That piece comes later.', Cheeky: 'Good piece. Wrong moment.', Unfiltered: 'Later. Pick another.' },
        notYetShort: { Jolly: 'That one comes later…', Cheeky: 'Later, counsel…', Unfiltered: 'Later.' },
        reads: { Jolly: 'Your Honour, the defence states:', Cheeky: 'For the record, Your Honour:', Unfiltered: 'For the record:' },
        jury: { Jolly: 'Has the jury reached a verdict?', Cheeky: 'Jury? Take your time. Not too much.', Unfiltered: 'Verdict?' },
        prosLose: { Jolly: 'Not proven? I’ll appeal! To… nobody. Fine.', Cheeky: 'I demand a retrial. Tomorrow. Probably.', Unfiltered: 'Fair. I overreached.' },
        prosCare: { Jolly: 'Fair. I overstated it. The real question deserves proper answers.', Cheeky: 'I overreached. Get the real facts from someone who knows.', Unfiltered: 'I overreached. Ask a professional.' },
        prosPlan: { Jolly: 'Fine. Some of it’s real. But I still exaggerated.', Cheeky: 'Partly right, wildly dramatic. My signature.', Unfiltered: 'Part true. Mostly loud.' },
        end: { Jolly: 'The facts stand. The traps don’t. Well argued!', Cheeky: 'Thrown out of court. Pack it up, critic.', Unfiltered: 'Not proven. Facts kept. Done.' },
        endSome: { Jolly: 'Not proven yet. One simple check next, then decide.', Cheeky: 'Not proven. One check, then we’ll know more.', Unfiltered: 'Not proven. Check one thing next.' },
        endPlan: { Jolly: 'The worry is real, so it gets a plan, not a panic.', Cheeky: 'Real worry, real plan. Drama dismissed.', Unfiltered: 'Real worry. Plan it. Drop the drama.' },
        endCare: { Jolly: 'Traps struck. For the real question, someone qualified can tell you where you stand.', Cheeky: 'Traps gone. The real bit deserves proper advice.', Unfiltered: 'Traps struck. Get proper advice on the rest.' }
      };

      /* ---------------- flow ---------------- */
      (async () => {
        await K.intro({ title: 'Objection!', sub: 'Your inner critic is prosecuting your thoughts. You’re the defence.', how: 'Tap OBJECTION! the moment a thinking trap is spoken. Then name the grounds.', char: 'glitch', mood: 'determined' });
        layout();
        SEQ.on = true;
        st.phase = 'opening';
        SND.gavel(); st.gavelT = now();
        S.later(() => { SND.gavel(); st.gavelT = now(); }, 380);
        judge.say(L(LINES.allRise), { mood: 'determined', ms: 2200 });
        juryMood('happy', 1400);
        await K.wait(RM() ? 700 : 1500);
        say(pros, L(LINES.prosOpen), { mood: 'smug', ms: 2500 }); pros.react('bounce');
        await K.wait(RM() ? 1100 : 2400);
        say(def, L(CASE.classic ? LINES.classic : LINES.defOpen), { mood: 'determined', ms: CASE.classic ? 3000 : 3800 });
        if (CASE.classic) S.later(() => { if (!targets.some(x => x.glowed)) say(def, L(LINES.defOpen), { mood: 'determined', ms: 3400 }); }, 3100);
        readGuide();
        await K.wait(RM() ? 300 : 700);
        await readCase();
        await K.wait(RM() ? 400 : 900);
        await closingPhase();
        say(pros, L(LINES.closingEnd), { mood: 'sad', ms: 2600 });
        await K.wait(RM() ? 700 : 1500);
        await defencePhase();
        await verdictPhase();
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = now(); while (!fn()) { if (now() - t0 > (ms || 30000)) return false; await K.wait(70); } return true; };
          await until(() => st.phase === 'read', 30000);
          let falseDone = false, wrongDone = false;
          while (st.phase !== 'closingIntro' && st.phase !== 'closing' && !st.finished) {
            if (st.phase === 'grounds' && st.cards) {
              await K.wait(650);
              const ln = R.line, cards = Array.from(st.cards.querySelectorAll('.oj-g:not(.no)'));
              let pick = cards.find(b => ln && ln.valid.has(b.dataset.g));
              if (!wrongDone && st.objections >= 2) { const wrong = cards.find(b => ln && !ln.valid.has(b.dataset.g)); if (wrong) { pick = wrong; wrongDone = true; } }
              if (pick) await K.sim.tap(pick);
              await K.wait(250);
              continue;
            }
            if (st.phase === 'read' && R.line && !R.paused) {
              const ln = R.line;
              if (ln.kind === 'camera' && !falseDone && R.wi >= 4) { falseDone = true; await K.sim.tap(btn); await K.wait(400); continue; }
              if (ln.kind === 'brain' && !ln.caught && (R.wi > ln.hot[0] + 1 || R.wi >= ln.words.length)) { await K.wait(120); await K.sim.tap(btn); await K.wait(300); continue; }
            }
            if (st.readback) { await K.wait(500); await K.sim.tap(btn); await K.wait(300); continue; }
            await K.wait(70);
          }
          await until(() => st.phase === 'closing', 20000);
          while (st.phase === 'closing') {
            const it = CL.cur;
            if (it && it.hot && !it.res && now() - it.t0 > 220) { await K.sim.tap(btn); await K.wait(120); continue; }
            await K.wait(50);
          }
          await until(() => st.phase === 'defence', 30000);
          await K.wait(900);
          let first = true;
          while (st.phase === 'defence') {
            const f = first && DF.frags.length > 1 ? DF.frags.find(x => !x.used && x.i !== DF.next) : DF.frags.find(x => !x.used && x.i === DF.next);
            first = false;
            if (!f) { await K.wait(100); continue; }
            const fr = K.rectIn(f.el), sr = K.rectIn(DF.slots[DF.next]);
            await K.sim.drag(f.el, { x: fr.w / 2, y: fr.h / 2 }, { x: sr.cx - fr.x, y: sr.cy - fr.y }, 650, 14);
            await K.wait(700);
          }
          await until(() => st.finished, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
