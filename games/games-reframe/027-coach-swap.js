/* 027 Coach Swap — Reframe · REFRAME · Inner Speech / Mental Text
 * Mechanism: after a setback, self-compassion raises the motivation to improve more than self-criticism does (Breines &
 * Chen 2012): a voice that is kind, specific and points at the next step helps people get up and try again, where a harsh,
 * global, backward-looking one keeps them down. The player rewrites a drill-sergeant inner voice on the coach's magnet
 * board, one dimension at a time (harsh → kind, vague → specific, past → next step). The coach's line is rebuilt live from
 * their own words (whole sentences, so it reads right for any input) and their athlete's body answers every nudge (slump →
 * spring). Twist: the sergeant insists kindness makes you soft, so the same athlete runs the same course twice, side by
 * side, once with each voice; the clock decides. Honest: the race is labelled an illustration; the player's own timing is
 * mirrored into both runs so only the voice differs; when the facts back the worry, the kind voice takes it seriously and
 * the next step is a plan (or proper help, for health, money, housing or legal worries); kindness never excuses real harm.
 * Verb: drag (slide three magnets along the coach's board); tap (start; perfect take-offs at the gold mark); drag the medal.
 * Finale: medal ceremony, fireworks over the stands, a slow-motion victory lap while the big screen shows the new line.
 */
(function (env) {
  'use strict';

  const SPORTS = {
    track: { id: 'track', name: 'Track', event: '110 m hurdles', obs: 'hurdle', course: 'race', slip: 'hurdle', place: 'the track', cue: 'Next hurdle: lift the lead knee a beat earlier.' },
    pool: { id: 'pool', name: 'Pool', event: '50 m freestyle', obs: 'wave', course: 'swim', slip: 'wave', place: 'the pool', cue: 'Next wave: breathe on the third stroke.' },
    wall: { id: 'wall', name: 'Climbing wall', event: 'Traverse wall', obs: 'hold', course: 'climb', slip: 'slip', place: 'the climbing wall', cue: 'Next hold: trust your feet, then reach.' }
  };
  const ORDER = ['track', 'pool', 'wall'];
  /* The coach's playbook: one kind opener is collected per visit (in order, never by chance). Each one is true whatever
   * happened (it never assumes a mistake, a fault or a good outcome). */
  const PLAYBOOK = [
    'Hey. That was hard, and you’re still in it.',
    'That stung. Of course it did. You care.',
    'Rough moment. You’re allowed to feel it.',
    'Breathe. One stumble isn’t the whole story.',
    'Go easy. You’d say the same to a friend.',
    'Hard day. Same you. Still worth backing.',
    'Wobble noted. So is the getting up.',
    'Shake it out. I’m still on your side.',
    'Every great one has stumbled. Every one.',
    'Honest version: that was tough, and you’re still here.',
    'Slow down. Reset. Then go again.',
    'Feel it first. Then we work out the next bit.'
  ];
  // view fractions [standsTop, standsBot, boardsBot, trackTop, ground] for the single view and a race band
  const FR = {
    track: [[0.16, 0.5, 0.555, 0.59, 0.935], [0.06, 0.42, 0.47, 0.52, 0.9]],
    pool: [[0.16, 0.46, 0.53, 0.56, 0.84], [0.06, 0.38, 0.45, 0.5, 0.79]],
    wall: [[0.15, 0.34, 0.37, 0.37, 0.94], [0.05, 0.23, 0.26, 0.26, 0.95]]
  };
  const ICON = {
    mega: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 9.5h3l8-4.5v14l-8-4.5h-3z" fill="currentColor"/><path d="M6.5 14.5l1.5 5h2.5l-1.4-5" fill="currentColor"/><path d="M18 8.5c1.6 1.8 1.6 5.2 0 7M20.5 6.5c2.6 3 2.6 8 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" fill="currentColor"/></svg>',
    fog: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 15.5a4 4 0 0 1 .6-8 5 5 0 0 1 9.4 1.6 3.3 3.3 0 0 1-.4 6.4z" fill="currentColor"/><path d="M5 19h9M9 22h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5L4 10.5l5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.6 10.5H14a5 5 0 0 1 0 10h-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    fwd: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    whistle: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 13a7 7 0 0 0 13.6 2.4L27 18v-6l-9.6-1.4A7 7 0 0 0 4 13z" fill="currentColor"/><circle cx="11" cy="13" r="2.6" fill="rgba(0,0,0,.35)"/><path d="M20 8.8V6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>'
  };
  const LANES = [
    { key: 'tone', a: 'Harsh', b: 'Kind', col: '#ff8a5c', dk: '#c4452a', i0: ICON.mega, i1: ICON.heart, label: 'DRAG IT KINDER' },
    { key: 'spec', a: 'Vague', b: 'Specific', col: '#4cc3ff', dk: '#1673b0', i0: ICON.fog, i1: ICON.target, label: 'MAKE IT SPECIFIC' },
    { key: 'next', a: 'Past', b: 'Next step', col: '#7ee36b', dk: '#2f8f2a', i0: ICON.back, i1: ICON.fwd, label: 'POINT IT FORWARD' }
  ];
  const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#a86f4c'];
  const SHIRT = ['#ff5a4f', '#ffc94a', '#4cc3ff', '#7ee36b', '#ffffff', '#b48cff', '#ff8fb1', '#2b6fff', '#ff9a3c'];
  const SPONSORS = ['LOOPIE LOOPS', 'STILL WATER', 'GLITCH GEAR', 'PATCH PLASTERS', 'DROP DRINKS', 'SYNC SNEAKERS', 'RUSH HOUR FM'];

  const hex3 = (c) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(c || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]; };
  const rgba = (c, a) => { const x = hex3(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; };
  const mixHex = (a, b, k) => { const x = hex3(a), y = hex3(b), f = (i) => Math.round(x[i] + (y[i] - x[i]) * k).toString(16).padStart(2, '0'); return '#' + f(0) + f(1) + f(2); };
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // the player says they did something that went wrong or hurt someone: the kind voice owns it with them (never excuses it)
  const OWN = /\bi (?:yelled|snapped|shouted|screamed|swore|lied|cheated|hit|hurt|broke|ignored|ghosted|blew up|lost my temper|forgot|missed|messed up|screwed up|made a mistake|let (?:\w+ ){0,2}down|was (?:rude|mean|wrong|harsh|unfair|horrible|awful|nasty|cruel|late))\b/i;
  // "it's all my fault": a share of the blame may be real, all of it rarely is; the kind voice neither confirms nor dismisses it
  const BLAME = /\b(my fault|because of me|i caused|i ruined|it'?s on me|blame myself)\b/i;
  function rr(g, x, y, w, hh, r) { r = Math.max(0, Math.min(r, w / 2, hh / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  (env.games = env.games || []).push({
    id: 'coach-swap', mode: 'reframe', name: 'Coach Swap', verb: 'drag', family: 'REFRAME', minutes: 2,
    parents: ['Inner Speech / Mental Text', 'Performance / Confidence', 'Identity / Self'],
    cast: ['rush', 'patch', 'still'], poster: { char: 'rush', mood: 'determined' },
    fonts: ['Barlow+Condensed:ital,wght@0,500;0,600;0,700;1,600', 'Black+Ops+One', 'Permanent+Marker'],
    tagline: 'Rewrite the drill sergeant in your head and watch your athlete fly.',
    why: 'For a harsh inner voice: kind, specific coaching helps you get up and try again.',
    css: `
.g-coach-swap { --cs-cond: "Barlow Condensed", "Oswald", "Roboto Condensed", "Arial Narrow", "TeX Gyre Heros Cn", var(--font-ui); --cs-stencil: "Black Ops One", "Stencil", "Impact", "Arial Black", var(--font-display);
  --cs-marker: "Permanent Marker", "Marker Felt", "Segoe Print", "Bradley Hand", "Comic Sans MS", var(--font-ui); --cs-red: #ff5a4f; --cs-gold: #ffc94a; }
.g-coach-swap .cs-screen { position: absolute; z-index: 22; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 62px); transform: translateX(-50%); box-sizing: border-box; padding: 6px 14px 7px; border-radius: 9px; text-align: center; pointer-events: none;
  background: radial-gradient(circle at 1px 1px, rgba(255,255,255,.08) 1px, transparent 1.3px) 0 0/4px 4px, linear-gradient(180deg, #0b0f1f, #141a38); border: 2px solid #2f3658;
  box-shadow: 0 0 0 3px rgba(0,0,0,.35), 0 10px 24px rgba(0,0,0,.45), inset 0 0 18px rgba(80,120,255,.14); color: #ffe7a8; transition: opacity .4s ease, width .5s ease; }
.g-coach-swap .cs-screen b { display: block; font: 700 12px/1.1 var(--cs-cond); letter-spacing: .18em; text-transform: uppercase; color: #8fd3ff; white-space: nowrap; }
.g-coach-swap .cs-screen span { display: block; margin-top: 2px; font: 700 17px/1.15 var(--cs-cond); letter-spacing: .06em; text-transform: uppercase; text-shadow: 0 0 10px rgba(255,200,90,.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-coach-swap .cs-screen.big { padding: 9px 16px 11px; }
.g-coach-swap .cs-screen.big span { white-space: normal; text-transform: none; letter-spacing: .01em; font: 600 19px/1.2 var(--cs-cond); color: #fff3d0; text-wrap: balance; }
.g-coach-swap .cs-screen.big em { display: block; margin-top: 5px; font: 600 15px/1.25 var(--cs-cond); font-style: normal; color: #b9f5a8; text-wrap: balance; }
.g-coach-swap .cs-screen.off { opacity: 0; }
.g-coach-swap .cs-shout { position: absolute; z-index: 27; box-sizing: border-box; max-width: calc(100% - 20px); padding: 15px 22px 16px; color: #fff8ec; text-align: center; pointer-events: none;
  font: 400 19px/1.14 var(--cs-stencil); text-transform: uppercase; letter-spacing: .02em; background: #d7263d; text-wrap: balance;
  clip-path: polygon(0% 14%, 7% 0%, 15% 9%, 25% 1%, 34% 10%, 45% 0%, 55% 9%, 66% 1%, 76% 10%, 87% 0%, 95% 9%, 100% 3%, 98% 30%, 100% 52%, 97% 75%, 100% 97%, 90% 88%, 80% 100%, 70% 89%, 58% 100%, 47% 88%, 36% 100%, 26% 90%, 14% 100%, 6% 89%, 0% 98%, 3% 74%, 0% 50%, 2% 28%);
  animation: coach-swap-shout .5s cubic-bezier(.2,1.5,.4,1) both; }
.g-coach-swap .cs-shout .gk-user { font-weight: 400; font-size: max(15px, 1em); }
.g-coach-swap .cs-shout.long { font-size: 16px; }
.g-coach-swap .cs-shout.quiet { background: #6b5a2a; font: 600 17px/1.22 var(--cs-cond); text-transform: none; letter-spacing: .01em; padding: 11px 18px 13px; }
.g-coach-swap .cs-shout small { display: block; font: 700 12px/1 var(--cs-cond); letter-spacing: .2em; color: #ffd1c4; margin-bottom: 5px; }
@keyframes coach-swap-shout { 0% { opacity: 0; transform: scale(.6) rotate(-4deg); } 55% { opacity: 1; transform: scale(1.08) rotate(2deg); } 75% { transform: scale(.97) rotate(-1deg); } 100% { opacity: 1; transform: none; } }
.g-coach-swap .cs-tag { position: absolute; z-index: 21; left: 0; top: 0; box-sizing: border-box; max-width: min(250px, 66%); padding: 6px 10px 7px; border-radius: 10px; pointer-events: none; text-align: center;
  background: rgba(10,12,28,.84); border: 1px solid rgba(255,255,255,.22); color: #fff; box-shadow: 0 6px 16px rgba(0,0,0,.4); transition: opacity .5s ease; }
.g-coach-swap .cs-tag small { display: block; font: 700 12px/1 var(--cs-cond); letter-spacing: .16em; text-transform: uppercase; color: #ffb38a; margin-bottom: 3px; }
.g-coach-swap .cs-tag span { display: block; font: 600 15px/1.2 var(--cs-cond); }
.g-coach-swap .cs-tag.gone { opacity: 0; }
.g-coach-swap .cs-voice { position: absolute; z-index: 24; box-sizing: border-box; padding: 9px 12px 10px; border-radius: 16px; overflow: hidden;
  background: linear-gradient(180deg, rgba(16,20,44,.94), rgba(10,12,30,.96)); border: 1px solid rgba(255,255,255,.12); box-shadow: 0 14px 30px rgba(0,0,0,.45); color: #f3f4ff; }
.g-coach-swap .cs-voice::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 4px; background: var(--cs-vc, #ff5a4f); transition: background .6s ease; }
.g-coach-swap .cs-vhead { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 2px 0 4px; }
.g-coach-swap .cs-vhead small { font: 700 12px/1 var(--font-ui); letter-spacing: .13em; text-transform: uppercase; color: rgba(225,228,255,.7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-coach-swap .cs-who { flex: none; font: 400 13px/1 var(--cs-stencil); letter-spacing: .05em; padding: 5px 9px 4px; border-radius: 6px; background: #5a1717; color: #ffc0b4; text-transform: uppercase; white-space: nowrap; transition: background .4s ease, color .4s ease; }
.g-coach-swap .cs-who.coach { font: 700 14px/1 var(--cs-cond); letter-spacing: .08em; background: #4a3606; color: #ffe08a; }
.g-coach-swap .cs-who.none { font: 700 13px/1 var(--cs-cond); background: rgba(255,255,255,.1); color: rgba(235,238,255,.8); }
.g-coach-swap .cs-row { position: relative; display: flex; gap: 9px; align-items: flex-start; padding: 4px 6px; margin: 0 -6px; border-radius: 9px; transition: background .3s ease; }
.g-coach-swap .cs-row.live { background: rgba(255,255,255,.07); }
.g-coach-swap .cs-pip { flex: none; width: 24px; height: 24px; border-radius: 50%; margin-top: 0; background: var(--c); color: #12142a; display: grid; place-items: center; box-shadow: 0 0 0 2px rgba(255,255,255,.14); }
.g-coach-swap .cs-pip svg { width: 15px; height: 15px; display: block; }
.g-coach-swap .cs-txt { flex: 1; min-width: 0; font: 600 17px/1.22 var(--cs-cond); overflow-wrap: anywhere; color: #f2f3ff; }
.g-coach-swap .cs-row[data-l="0"] .cs-txt, .g-coach-swap .cs-row[data-l="1"] .cs-txt { font: 400 15px/1.3 var(--cs-stencil); text-transform: uppercase; letter-spacing: .02em; color: #ff9f8f; }
.g-coach-swap .cs-row[data-l="1"] .cs-txt { color: #ffc28f; }
.g-coach-swap .cs-row[data-l="3"] .cs-txt { color: #ffe6a6; }
.g-coach-swap .cs-txt .gk-user { font-weight: 700; color: #ffffff; background: linear-gradient(transparent 60%, rgba(255,201,74,.32) 60%); }
.g-coach-swap .cs-voice.clamp .cs-row:not(.live) .cs-txt { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; }
.g-coach-swap .cs-voice.clamp3 .cs-txt { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.g-coach-swap .cs-still .gk-bubble { max-width: min(180px, calc(100cqw - var(--sz, 64px) - 150px)); }
.g-coach-swap .cs-race { display: none; }
.g-coach-swap .cs-was { display: none; margin-top: 10px; padding-top: 9px; border-top: 1px dashed rgba(255,255,255,.16); }
.g-coach-swap .cs-was small { display: block; font: 700 12px/1 var(--cs-cond); letter-spacing: .16em; text-transform: uppercase; color: rgba(255,170,150,.8); margin-bottom: 6px; }
.g-coach-swap .cs-was span { display: inline-block; margin: 0 12px 4px 0; font: 400 14px/1.3 var(--cs-stencil); text-transform: uppercase; color: rgba(255,150,130,.85); transition: color .5s ease; }
.g-coach-swap .cs-was span.x { text-decoration: line-through 2px rgba(255,201,74,.95); color: rgba(255,150,130,.45); }
.g-coach-swap.cs-bright .cs-was { border-top-color: rgba(30,40,80,.18); }
.g-coach-swap.cs-bright .cs-was small { color: #b0402e; }
.g-coach-swap.cs-bright .cs-was span { color: rgba(192,57,43,.85); }
.g-coach-swap.cs-bright .cs-was span.x { color: rgba(192,57,43,.45); text-decoration-color: #c98a12; }
.g-coach-swap .cs-board.dim { opacity: .38; pointer-events: none; }
.g-coach-swap .cs-voice.racing .cs-row, .g-coach-swap .cs-voice.racing .cs-vhead { display: none; }
.g-coach-swap .cs-voice.racing .cs-race { display: block; }
.g-coach-swap .cs-rrow { display: flex; align-items: center; gap: 10px; padding: 6px 4px; border-bottom: 1px solid rgba(255,255,255,.08); transition: background .4s ease; border-radius: 8px; }
.g-coach-swap .cs-rrow i { flex: none; width: 12px; height: 12px; border-radius: 50%; background: var(--c); box-shadow: 0 0 10px var(--c); }
.g-coach-swap .cs-rrow span { flex: 1; min-width: 0; font: 700 15px/1.1 var(--cs-cond); letter-spacing: .06em; text-transform: uppercase; color: rgba(236,238,255,.86); }
.g-coach-swap .cs-rrow b { font: 700 30px/1 var(--cs-cond); font-variant-numeric: tabular-nums; color: #fff; letter-spacing: .02em; }
.g-coach-swap .cs-rrow.win { background: rgba(255,201,74,.16); }
.g-coach-swap .cs-rrow.win b { color: #ffd76a; text-shadow: 0 0 14px rgba(255,201,74,.7); }
.g-coach-swap .cs-delta { margin: 8px 2px 0; font: 600 16px/1.3 var(--cs-cond); color: #c9f7b8; min-height: 21px; }
.g-coach-swap .cs-note { margin: 4px 2px 0; font: 500 13px/1.3 var(--font-ui); color: rgba(225,228,255,.68); }
.g-coach-swap .cs-board { position: absolute; z-index: 24; box-sizing: border-box; padding: 8px 14px 10px; border-radius: 16px; color: rgba(244,248,236,.94);
  background: radial-gradient(120% 90% at 30% 15%, #33604a, #224434 60%, #1a3528); border: 6px solid #80592f; box-shadow: inset 0 0 28px rgba(0,0,0,.45), 0 14px 30px rgba(0,0,0,.45); transition: opacity .4s ease; }
.g-coach-swap .cs-board.off { opacity: 0; pointer-events: none; }
.g-coach-swap .cs-bhead { display: flex; justify-content: space-between; align-items: baseline; font: 400 15px/1 var(--cs-marker); letter-spacing: .02em; margin-bottom: 4px; }
.g-coach-swap .cs-bhead span:last-child { font: 700 13px/1 var(--cs-cond); letter-spacing: .14em; opacity: .8; }
.g-coach-swap .cs-lane { position: relative; height: 58px; transition: opacity .35s ease; }
.g-coach-swap .cs-ends { display: flex; justify-content: space-between; font: 400 13px/1 var(--cs-marker); letter-spacing: .02em; padding: 0 2px; }
.g-coach-swap .cs-ends span:first-child { color: #ffb2a0; }
.g-coach-swap .cs-ends span:last-child { color: var(--c); }
.g-coach-swap .cs-rail { position: absolute; left: 0; right: 0; top: 14px; height: 46px; touch-action: none; cursor: grab; outline: none; border-radius: 23px; }
.g-coach-swap .cs-rail:focus-visible { box-shadow: 0 0 0 2px rgba(255,255,255,.7); }
.g-coach-swap .cs-rail::before { content: ""; position: absolute; left: 23px; right: 23px; top: 50%; height: 3px; margin-top: -1.5px; border-radius: 2px; background: rgba(240,246,232,.45); }
.g-coach-swap .cs-fill { position: absolute; left: 23px; top: 50%; height: 5px; margin-top: -2.5px; width: var(--w, 0px); border-radius: 3px; background: var(--c); box-shadow: 0 0 10px var(--c); opacity: .9; }
.g-coach-swap .cs-tick { position: absolute; top: 50%; width: 3px; height: 15px; margin: -7.5px 0 0 -1.5px; border-radius: 2px; background: rgba(240,246,232,.55); }
.g-coach-swap .cs-mag { position: absolute; left: 0; top: 0; width: 46px; height: 46px; border-radius: 50%; color: #fff; display: grid; place-items: center; transform: translateX(var(--x, 0px));
  background: radial-gradient(circle at 34% 28%, rgba(255,255,255,.95) 0 7%, var(--c) 34%, var(--cd) 100%); box-shadow: 0 3px 0 rgba(0,0,0,.28), 0 8px 14px rgba(0,0,0,.35), inset 0 -3px 6px rgba(0,0,0,.2); }
.g-coach-swap .cs-mag svg { width: 24px; height: 24px; display: block; filter: drop-shadow(0 1px 1px rgba(0,0,0,.35)); }
.g-coach-swap .cs-lane.grab .cs-mag { scale: 1.13; box-shadow: 0 5px 0 rgba(0,0,0,.22), 0 16px 22px rgba(0,0,0,.4), inset 0 -3px 6px rgba(0,0,0,.2); }
.g-coach-swap .cs-lane.shut { opacity: .38; }
.g-coach-swap .cs-lane.shut .cs-rail { cursor: default; }
.g-coach-swap .cs-lane .cs-lock { position: absolute; left: 50%; top: 27px; width: 22px; height: 22px; margin-left: -11px; color: rgba(240,246,232,.8); display: none; }
.g-coach-swap .cs-lane.shut .cs-lock { display: block; }
.g-coach-swap .cs-lane.open:not(.done) .cs-mag { animation: coach-swap-glow 1.6s ease-in-out infinite; }
@keyframes coach-swap-glow { 0%, 100% { box-shadow: 0 3px 0 rgba(0,0,0,.28), 0 8px 14px rgba(0,0,0,.35), 0 0 0 0 rgba(255,255,255,.0); } 50% { box-shadow: 0 3px 0 rgba(0,0,0,.28), 0 8px 14px rgba(0,0,0,.35), 0 0 0 7px rgba(255,255,255,.16); } }
.g-coach-swap .cs-stamp { position: absolute; left: 50%; top: 23px; padding: 5px 9px 4px; border: 2px solid currentColor; border-radius: 6px; color: var(--c); font: 400 13px/1 var(--cs-marker); transform: translateX(-50%) rotate(-6deg); pointer-events: none; white-space: nowrap;
  animation: coach-swap-stamp .45s cubic-bezier(.2,1.6,.4,1) both; background: #1d3a2c; }
@keyframes coach-swap-stamp { from { opacity: 0; transform: translateX(-50%) scale(1.8) rotate(-6deg); } to { opacity: 1; transform: translateX(-50%) rotate(-6deg); } }
.g-coach-swap.cs-bright .cs-stamp { background: #ffffff; }
.g-coach-swap .cs-go { position: absolute; z-index: 29; width: 112px; height: 112px; margin: -56px 0 0 -56px; border-radius: 50%; border: 0; cursor: pointer; touch-action: none; color: #2a1600;
  background: radial-gradient(circle at 36% 30%, #fff6d0 0 8%, #ffd24a 36%, #f08a1c 100%); box-shadow: 0 6px 0 #a3530c, 0 14px 26px rgba(0,0,0,.45); display: grid; place-content: center; gap: 2px; }
.g-coach-swap .cs-go::after { content: ""; position: absolute; inset: -9px; border-radius: 50%; border: 3px solid rgba(255,210,90,.75); animation: coach-swap-ring 1.5s ease-out infinite; pointer-events: none; }
@keyframes coach-swap-ring { from { transform: scale(.92); opacity: .9; } to { transform: scale(1.22); opacity: 0; } }
.g-coach-swap .cs-go b { font: 700 32px/.9 var(--cs-cond); letter-spacing: .04em; }
.g-coach-swap .cs-go small { font: 700 12px/1 var(--cs-cond); letter-spacing: .16em; text-transform: uppercase; }
.g-coach-swap .cs-go:active { transform: translateY(3px); box-shadow: 0 3px 0 #a3530c, 0 8px 16px rgba(0,0,0,.45); }
.g-coach-swap .cs-go:focus-visible { outline: 3px solid #fff; outline-offset: 6px; }
.g-coach-swap .cs-go.hit { animation: coach-swap-hit .25s ease; }
@keyframes coach-swap-hit { 50% { scale: .9; } }
.g-coach-swap .cs-golabel { position: absolute; z-index: 29; transform: translateX(-50%); padding: 6px 12px 5px; border-radius: 999px; background: rgba(8,10,26,.82); border: 1px solid rgba(255,255,255,.14); font: 700 13px/1.2 var(--cs-cond); letter-spacing: .14em; text-transform: uppercase; color: #eef1ff; text-align: center; white-space: nowrap; pointer-events: none; }
.g-coach-swap .cs-go .cs-ring { position: absolute; inset: -13px; width: calc(100% + 26px); height: calc(100% + 26px); transform: rotate(-90deg); overflow: visible; pointer-events: none; display: none; }
.g-coach-swap .cs-go.timing::after { display: none; }
.g-coach-swap .cs-go.timing .cs-ring { display: block; }
.g-coach-swap .cs-ring circle { fill: none; stroke-width: 7; stroke-linecap: round; }
.g-coach-swap .cs-ring .trk { stroke: rgba(255,255,255,.12); stroke-linecap: butt; }
.g-coach-swap .cs-ring .win { stroke: #ffc94a; opacity: .5; stroke-linecap: butt; }
.g-coach-swap .cs-ring .fill { stroke: #ffffff; }
.g-coach-swap .cs-go.hot .cs-ring .win { opacity: 1; filter: drop-shadow(0 0 6px rgba(255,201,74,.95)); }
.g-coach-swap .cs-go.hot .cs-ring .fill { stroke: #ffe58a; }
.g-coach-swap .cs-go.hot { box-shadow: 0 6px 0 #a3530c, 0 0 0 4px rgba(255,236,150,.85), 0 0 34px rgba(255,201,74,.9); }
.g-coach-swap .cs-go.clipnext .cs-ring .win { opacity: 0; }
.g-coach-swap .cs-pad { position: absolute; z-index: 24; box-sizing: border-box; padding: 11px 15px; border-radius: 16px; pointer-events: none; color: #eef0ff; transition: opacity .4s ease;
  background: radial-gradient(90% 70% at 50% 62%, rgba(255,201,74,.12), transparent 70%), repeating-linear-gradient(45deg, rgba(255,255,255,.025) 0 6px, transparent 6px 12px), linear-gradient(180deg, #13183a, #0b0e22);
  border: 1px solid rgba(255,255,255,.12); box-shadow: 0 14px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.07); }
.g-coach-swap .cs-phead { position: absolute; left: 15px; right: 15px; bottom: 13px; display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font: 700 12px/1 var(--cs-cond); letter-spacing: .16em; text-transform: uppercase; color: rgba(225,228,255,.78); white-space: nowrap; }
.g-coach-swap .cs-phead span:first-child { color: #ffe08a; }
.g-coach-swap .cs-phead b { font: 700 15px/1 var(--cs-cond); letter-spacing: .08em; color: #ffd76a; font-variant-numeric: tabular-nums; }
.g-coach-swap .cs-sub { position: absolute; z-index: 28; transform: translateX(-50%); display: grid; grid-template-columns: auto auto; gap: 5px 12px; align-items: center; padding: 10px 16px 12px; border-radius: 12px; pointer-events: none;
  background: #101114; border: 3px solid #3a3d44; box-shadow: 0 14px 28px rgba(0,0,0,.55), inset 0 0 16px rgba(0,0,0,.6); animation: coach-swap-pop .5s cubic-bezier(.2,1.4,.4,1) both; }
.g-coach-swap .cs-sub i { grid-column: 1 / -1; font: 700 12px/1 var(--cs-cond); letter-spacing: .22em; color: #aeb4c4; font-style: normal; text-align: center; }
.g-coach-swap .cs-sub b { font: 700 32px/1 var(--cs-cond); font-variant-numeric: tabular-nums; letter-spacing: .04em; }
.g-coach-swap .cs-sub .o { color: #ff4d4d; text-shadow: 0 0 12px rgba(255,60,60,.85); }
.g-coach-swap .cs-sub .n { color: #5dff7a; text-shadow: 0 0 12px rgba(80,255,120,.85); }
.g-coach-swap .cs-sub span { font: 700 20px/1 var(--cs-cond); letter-spacing: .08em; color: #fff; text-transform: uppercase; }
@keyframes coach-swap-pop { from { opacity: 0; transform: translateX(-50%) scale(.6); } to { opacity: 1; transform: translateX(-50%); } }
.g-coach-swap .cs-cap { position: absolute; z-index: 23; left: 10px; box-sizing: border-box; max-width: calc(100% - 20px); padding: 5px 10px 6px; border-radius: 10px; pointer-events: none; background: rgba(8,10,24,.82); border: 1px solid rgba(255,255,255,.16); color: #fff; }
.g-coach-swap .cs-cap small { display: flex; align-items: center; gap: 6px; font: 700 12px/1 var(--cs-cond); letter-spacing: .14em; text-transform: uppercase; color: rgba(236,238,255,.86); }
.g-coach-swap .cs-cap small i { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); }
.g-coach-swap .cs-cap p { margin: 3px 0 0; font: 600 15px/1.2 var(--cs-cond); color: #ffe6a6; max-width: 34ch; }
.g-coach-swap .cs-cap.sarge { left: auto; right: 10px; text-align: right; }
.g-coach-swap .cs-cap.sarge small { justify-content: flex-end; }
.g-coach-swap .cs-cap.sarge p { font: 400 14px/1.2 var(--cs-stencil); text-transform: uppercase; color: #ff9f8f; margin-left: auto; }
.g-coach-swap .cs-res { position: absolute; z-index: 25; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 4px; padding: 14px; border-radius: 16px; pointer-events: none;
  background: repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 2px, transparent 2px 14px), linear-gradient(180deg, #1a1608, #0e0c05); border: 1px solid rgba(255,214,120,.35); color: #ffe7a8; box-shadow: 0 14px 30px rgba(0,0,0,.45); animation: coach-swap-rise .5s cubic-bezier(.2,1.3,.4,1) both; }
.g-coach-swap .cs-res small { font: 700 12px/1 var(--cs-cond); letter-spacing: .24em; text-transform: uppercase; color: #ffd76a; }
.g-coach-swap .cs-res b { font: 700 58px/1 var(--cs-cond); font-variant-numeric: tabular-nums; color: #fff; text-shadow: 0 0 22px rgba(255,201,74,.7); }
.g-coach-swap .cs-res span { font: 600 17px/1.25 var(--cs-cond); color: #c9f7b8; max-width: 30ch; }
.g-coach-swap .cs-res i { font: 500 13px/1.3 var(--font-ui); font-style: normal; color: rgba(255,240,210,.7); max-width: 36ch; }
@keyframes coach-swap-rise { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
.g-coach-swap.cs-bright .cs-res { background: repeating-linear-gradient(90deg, rgba(0,0,0,.04) 0 2px, transparent 2px 14px), linear-gradient(180deg, #fffaf0, #fff3d6); color: #5a3a00; border-color: rgba(160,110,20,.3); box-shadow: 0 12px 26px rgba(60,40,0,.18); }
.g-coach-swap.cs-bright .cs-res small { color: #9a5b00; }
.g-coach-swap.cs-bright .cs-res b { color: #2a1a00; text-shadow: none; }
.g-coach-swap.cs-bright .cs-res span { color: #1f7a36; }
.g-coach-swap.cs-bright .cs-res i { color: rgba(60,40,0,.7); }
.g-coach-swap .cs-cap p:empty { display: none; }
.g-coach-swap .cs-ff { position: absolute; z-index: 23; right: 12px; padding: 5px 9px; border-radius: 8px; background: rgba(255,255,255,.14); color: #fff; font: 700 13px/1 var(--cs-cond); letter-spacing: .14em; pointer-events: none; }
.g-coach-swap .cs-medal { position: absolute; z-index: 33; width: 62px; height: 92px; touch-action: none; cursor: grab; }
.g-coach-swap .cs-medal i { position: absolute; inset: 0; transform-origin: 50% 0; transition: scale .15s ease; }
.g-coach-swap .cs-medal i::before { content: ""; position: absolute; left: 13px; top: 0; width: 36px; height: 44px; background: linear-gradient(90deg, #2b6fff 0 33%, #ffffff 33% 66%, #ff5a4f 66%); clip-path: polygon(0 0, 100% 0, 70% 100%, 30% 100%); }
.g-coach-swap .cs-medal i::after { content: "1"; position: absolute; left: 3px; top: 34px; width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; font: 700 26px/1 var(--cs-cond); color: #7a4a00;
  background: radial-gradient(circle at 35% 30%, #fff7cf 0 10%, #ffd34a 38%, #c98a12 100%); box-shadow: 0 0 0 3px #f0b52a inset, 0 8px 16px rgba(0,0,0,.4); }
.g-coach-swap .cs-medal.lift i { scale: 1.08; }
.g-coach-swap .cs-medal.home { transition: left .35s cubic-bezier(.2,1.2,.4,1), top .35s cubic-bezier(.2,1.2,.4,1); }
.g-coach-swap .cs-cere { position: absolute; z-index: 24; box-sizing: border-box; padding: 10px 14px; border-radius: 16px; background: linear-gradient(180deg, rgba(40,30,8,.9), rgba(24,18,6,.94)); border: 1px solid rgba(255,214,120,.3); color: #ffe7a8; box-shadow: 0 14px 30px rgba(0,0,0,.45); }
.g-coach-swap .cs-cere > b { display: block; font: 700 13px/1 var(--cs-cond); letter-spacing: .2em; text-transform: uppercase; }
.g-coach-swap .cs-tchips { position: absolute; left: 14px; right: 14px; bottom: 14px; display: flex; gap: 10px; animation: coach-swap-rise .5s cubic-bezier(.2,1.3,.4,1) both; }
.g-coach-swap .cs-tchip { flex: 1; min-width: 0; padding: 8px 12px 9px; border-radius: 12px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); }
.g-coach-swap .cs-tchip small { display: block; font: 700 12px/1.1 var(--cs-cond); letter-spacing: .14em; text-transform: uppercase; color: var(--c); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-coach-swap .cs-tchip b { display: block; margin-top: 3px; font: 700 30px/1.05 var(--cs-cond); color: #fff; font-variant-numeric: tabular-nums; letter-spacing: .02em; }
.g-coach-swap .cs-tchip.win { background: rgba(255,201,74,.15); border-color: rgba(255,201,74,.55); box-shadow: 0 0 22px rgba(255,201,74,.18); }
.g-coach-swap .cs-tchip.win b { color: #ffd76a; text-shadow: 0 0 14px rgba(255,201,74,.55); }
.g-coach-swap.cs-bright .cs-cere { background: linear-gradient(180deg, #fffaf0, #fff1d2); color: #5a3a00; border-color: rgba(160,110,20,.3); box-shadow: 0 12px 26px rgba(60,40,0,.18); }
.g-coach-swap.cs-bright .cs-tchip { background: rgba(255,255,255,.7); border-color: rgba(120,80,0,.18); }
.g-coach-swap.cs-bright .cs-tchip b { color: #2a1a00; }
.g-coach-swap.cs-bright .cs-tchip.win b { color: #9a5b00; text-shadow: none; }
.g-coach-swap.cs-bright .cs-tchip small { color: var(--cd, #7a4c00); }
.g-coach-swap .gk-bubble { max-width: min(250px, calc(100cqw - var(--sz, 84px) - 40px)); }
.g-coach-swap.cs-bright .cs-voice { background: linear-gradient(180deg, rgba(255,255,255,.97), rgba(244,247,252,.97)); border-color: rgba(30,40,80,.14); color: #1d2340; box-shadow: 0 12px 26px rgba(30,40,80,.2); }
.g-coach-swap.cs-bright .cs-vhead small { color: rgba(29,35,64,.66); }
.g-coach-swap.cs-bright .cs-txt { color: #1d2340; }
.g-coach-swap.cs-bright .cs-row[data-l="0"] .cs-txt { color: #c0392b; }
.g-coach-swap.cs-bright .cs-row[data-l="1"] .cs-txt { color: #b35a12; }
.g-coach-swap.cs-bright .cs-row[data-l="3"] .cs-txt { color: #7a4c00; }
.g-coach-swap.cs-bright .cs-txt .gk-user { color: #121633; background: linear-gradient(transparent 58%, rgba(255,190,40,.42) 58%); }
.g-coach-swap.cs-bright .cs-row.live { background: rgba(30,40,80,.06); }
.g-coach-swap.cs-bright .cs-who.none { background: rgba(30,40,80,.08); color: #3a4266; }
.g-coach-swap.cs-bright .cs-rrow span { color: #2a3150; }
.g-coach-swap.cs-bright .cs-rrow b { color: #12162e; }
.g-coach-swap.cs-bright .cs-rrow.win b { color: #9a5b00; text-shadow: none; }
.g-coach-swap.cs-bright .cs-rrow.win { background: rgba(255,190,40,.2); }
.g-coach-swap.cs-bright .cs-delta { color: #1f7a36; }
.g-coach-swap.cs-bright .cs-note { color: rgba(29,35,64,.7); }
.g-coach-swap.cs-bright .cs-board { background: linear-gradient(180deg, #ffffff, #eef2f7); border-color: #c8d0da; color: #1f3f8f; box-shadow: inset 0 0 0 1px #fff, inset 0 -20px 30px rgba(120,140,170,.08), 0 12px 26px rgba(30,40,70,.22); }
.g-coach-swap.cs-bright .cs-ends span:first-child { color: #c0392b; }
.g-coach-swap.cs-bright .cs-ends span:last-child { color: var(--cd); }
.g-coach-swap.cs-bright .cs-rail::before, .g-coach-swap.cs-bright .cs-tick { background: #9aa6b8; }
.g-coach-swap.cs-bright .cs-lane .cs-lock { color: #6b7790; }
.g-coach-swap.cs-bright .cs-stamp { background: rgba(255,255,255,.7); color: var(--cd); }
/* the voice panel lit up as the stadium board (phone finale): the same dark LED board in both themes */
.g-coach-swap .cs-voice.stadium, .g-coach-swap.cs-bright .cs-voice.stadium { background: radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 1.3px) 0 0/4px 4px, linear-gradient(180deg, #0b0f1f, #141a38); border: 2px solid #2f3658; box-shadow: 0 0 0 3px rgba(0,0,0,.35), 0 14px 30px rgba(0,0,0,.5), inset 0 0 22px rgba(80,120,255,.16); color: #fff3d0; }
.g-coach-swap .cs-voice.stadium .cs-vhead small, .g-coach-swap.cs-bright .cs-voice.stadium .cs-vhead small { color: #8fd3ff; }
.g-coach-swap .cs-voice.stadium .cs-row .cs-txt, .g-coach-swap.cs-bright .cs-voice.stadium .cs-row .cs-txt { color: #fff3d0; text-shadow: 0 0 10px rgba(255,200,90,.35); }
.g-coach-swap .cs-voice.stadium .cs-txt .gk-user, .g-coach-swap.cs-bright .cs-voice.stadium .cs-txt .gk-user { color: #ffffff; background: linear-gradient(transparent 60%, rgba(255,201,74,.3) 60%); }
@container (min-width: 700px) {
  .g-coach-swap .cs-txt { font-size: 20px; }
  .g-coach-swap .cs-row[data-l="0"] .cs-txt, .g-coach-swap .cs-row[data-l="1"] .cs-txt { font-size: 17px; }
  .g-coach-swap .cs-shout { font-size: 26px; padding: 18px 30px 19px; }
  .g-coach-swap .cs-screen span { font-size: 20px; }
  .g-coach-swap .cs-screen.big span { font-size: 23px; }
  .g-coach-swap .cs-screen.big em { font-size: 18px; }
  .g-coach-swap .cs-cap p { font-size: 17px; }
  .g-coach-swap .cs-lane { height: 66px; }
  .g-coach-swap .cs-ends { font-size: 15px; }
  .g-coach-swap .cs-rail { top: 18px; }
  .g-coach-swap .cs-bhead { font-size: 18px; }
  .g-coach-swap .cs-was:not([hidden]) { display: block; }
  .g-coach-swap .cs-voice.racing .cs-was { display: none; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      const TAU = Math.PI * 2, clamp = K.clamp, lerp = K.lerp, now = () => performance.now();
      const inten = ctx.intensity, visits = K.visits(), noWords = !String(ctx.text || '').trim();
      const reduced = () => K.reduced(), isBright = () => S.scene() === 'bright';
      const L = (o) => ctx.line(o) || '';
      const raw = String(ctx.text || '');

      /* ---------------- today: sport, playbook line ---------------- */
      const dayNo = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
      const SPID = visits === 0 ? 'track' : ORDER[((dayNo % 3) + 3) % 3];
      const SP = SPORTS[SPID], TOMORROW = SPORTS[ORDER[(((dayNo + 1) % 3) + 3) % 3]];
      const coll0 = K.collection();
      let PBI = PLAYBOOK.findIndex((_, i) => !coll0.includes('line:' + i));
      if (PBI < 0) PBI = ((dayNo % PLAYBOOK.length) + PLAYBOOK.length) % PLAYBOOK.length;

      /* ---------------- words (only as the reading gives them; whole sentences, never spliced mid-sentence) ---------------- */
      const clip = (s, n) => {
        s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
        if (s.length > n) { const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); s = (sp > n * 0.6 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; }
        if ((s.match(/"/g) || []).length % 2) s += '"';
        if ((s.match(/“/g) || []).length > (s.match(/”/g) || []).length) s += '”';
        return s;
      };
      const tidy = (s, n) => { s = clip(String(s || '').replace(/;\s+/g, '. '), n || 150); if (!s) return ''; s = s[0].toUpperCase() + s.slice(1); return /[.!?…"”’)]$/.test(s) ? s : s + '.'; };
      const WD = {};
      function readWords() {
        WD.care = an.safety === 'care';
        WD.sup = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
        WD.own = !noWords && OWN.test(raw);
        WD.blame = !noWords && !WD.own && ((Array.isArray(an.distortions) && an.distortions.some(d => d && d.type === 'personalising')) || BLAME.test(raw));
        WD.thought = noWords ? '' : tidy(an.thought || an.conclusion, 96);
        if (/^this means something bad\.?$/i.test(WD.thought)) WD.thought = '';
        let sit = noWords ? '' : tidy(an.situation, K.phone() ? 92 : 128);
        if (/^something happened/i.test(sit)) sit = '';
        WD.situation = sit;
        { const first = sit.split(/[:;.!?]\s/)[0].replace(/[.!?…:;]+$/, ''); WD.tag = sit ? clip(first.split(/\s+/).length >= 3 ? first : sit.replace(/[.!?…]+$/, ''), 40) : ''; }
        const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
        let lead = '';
        if (WD.care) { const l = leads.find(x => /\b(advice|advis\w*|service|doctor|gp|nurse|qualified|lawyer|legal|bank|counsel\w*|support|helpline|professional|tenant\w*)\b/i.test(x.text)); lead = l ? l.text : 'Ask someone qualified exactly where you stand.'; }
        else if (!noWords) {
          // the AI writes leads for this exact situation; the local reader's "ask" scripts fit one stock scenario per topic,
          // so its general "prepare" step makes the better coaching move (and a well-founded worry always gets the plan first)
          const order = WD.sup === 'strong' || an.source !== 'ai' ? ['prepare', 'ask', 'steady'] : ['ask', 'prepare', 'steady'];
          for (const k of order) { const l = leads.find(x => x.kind === k); if (l) { lead = l.text; break; } }
          if (!lead && leads[0]) lead = leads[0].text;
        }
        lead = String(lead || '').replace(/^([A-Z][a-z]+):\s+(?=[“"])/, '$1 ');
        WD.lead = lead ? tidy(lead, K.phone() ? 92 : 120) : '';
        WD.friend = noWords ? '' : tidy(an.friend, 150);
      }
      readWords();
      const kindLine = () => WD.care ? 'This is serious, and you don’t have to sort it out alone.'
        : WD.sup === 'strong' ? 'This is real, and it’s hard. You can still take the next step.'
          : WD.own ? 'You got it wrong, and you care. That’s where fixing starts.'
            : WD.blame ? 'Own your part. Only your part.' : PLAYBOOK[PBI];
      const usesPlaybook = () => !WD.care && WD.sup !== 'strong' && !WD.own && !WD.blame;
      const T = (s) => ({ s, u: false }), U = (s) => ({ s, u: true });
      function rowParts(key, lvl) {
        if (key === 'tone') {
          if (lvl === 0) return [T(L({ Jolly: 'Typical. You blew it again.', Cheeky: 'Wow. Blew it again. Classic you.', Unfiltered: 'You blew it. Again.' }))];
          if (lvl === 1) return [T(L({ Jolly: 'Sloppy. Do better.', Cheeky: 'Sloppy. Sort yourself out.', Unfiltered: 'Sloppy. Do better.' }))];
          if (lvl === 2) return [T(L({ Jolly: 'Okay. That one stung.', Cheeky: 'Okay. Ouch. That one stung.', Unfiltered: 'That stung.' }))];
          return [T(kindLine())];
        }
        if (key === 'spec') {
          if (lvl === 0) return [T(L({ Jolly: 'You always do this.', Cheeky: 'You always, always do this.', Unfiltered: 'You always do this.' }))];
          if (lvl === 1) return [T(L({ Jolly: 'Everything went wrong.', Cheeky: 'The whole thing was a disaster.', Unfiltered: 'All of it was bad.' }))];
          if (lvl === 2) return [T('It was one ' + SP.obs + ', not the whole ' + SP.course + '.')];
          // the real event, named plainly (never "just one moment": it may be serious, and it may not be the first time)
          return WD.situation ? [T('Here’s what actually happened. '), U(WD.situation)] : [T('It was the second ' + SP.obs + '. Just that one.')];
        }
        if (lvl === 0) return [T(L({ Jolly: 'Think about what you did.', Cheeky: 'Go on. Replay it. Again.', Unfiltered: 'Replay it all night.' }))];
        if (lvl === 1) return [T(L({ Jolly: 'Don’t you dare do that again.', Cheeky: 'Never. Do that. Again.', Unfiltered: 'Don’t do that again.' }))];
        if (lvl === 2) return [T(SP.cue)];
        if (WD.own && !WD.care) return [T('Next move: own it, and make it right where you can.')];
        return [T('Next move: ' + (WD.lead || 'back on the line, one ' + SP.obs + ' at a time.'))];
      }

      /* ---------------- state ---------------- */
      const G = { phase: 'intro', ts: 1, tsT: 1, split: false, shake: 0, flash: 0, excite: 0.25, done: false, t0: now(), go: false, perfect: 0, chances: 0,
        sarge: { on: false, x: -200, tx: -200, bark: 0, soft: 0, walk: 0, hop: 0, lane: 'V1' }, podium: false, medal: false, lap: false, wave: -1, raceT0: 0, ff: 1 };
      const M = { W: 0, H: 0, phone: true, vb: 0, top: 58 };
      const V1 = { id: 'V1', camX: 0 }, VA = { id: 'VA', camX: 0 }, VB = { id: 'VB', camX: 0 };
      const P = K.particles({ max: 380 });
      const lanes = {}; LANES.forEach(l => { lanes[l.key] = { def: l, v: 0, tv: 0, lvl: 0, open: false, done: false, grab: false, hold: 0 }; });

      /* ---------------- DOM ---------------- */
      el.classList.toggle('cs-bright', isBright());
      const cv = K.canvas(el, { opaque: true, maxDpr: 1.5 });
      const scrB = h('b', { text: SP.event }), scrS = h('span', { text: 'Warm-up' });
      const screenEl = h('div', { class: 'cs-screen', 'aria-hidden': 'true' }, scrB, scrS);
      const shout = h('div', { class: 'cs-shout', hidden: true, role: 'status' });
      const tagEl = h('div', { class: 'cs-tag', hidden: true, 'aria-hidden': 'true' });
      const whoEl = h('span', { class: 'cs-who none', text: 'No coach yet' });
      const voice = h('section', { class: 'cs-voice', 'aria-label': 'The voice in your head' }, h('div', { class: 'cs-vhead' }, h('small', { text: 'The voice in your head' }), whoEl));
      const vheadSmall = voice.querySelector('.cs-vhead small');
      const ROWEL = {};
      LANES.forEach(ln => {
        const pip = h('i', { class: 'cs-pip', style: { '--c': ln.col }, html: ln.i0 });
        const txt = h('div', { class: 'cs-txt', text: '· · ·' });
        const row = h('div', { class: 'cs-row', 'data-l': '2', 'data-k': ln.key }, pip, txt);
        voice.append(row); ROWEL[ln.key] = { row, txt, pip, plain: '', anim: null, lvl: -1, icon: 0 };
      });
      const wasEl = h('div', { class: 'cs-was', hidden: true }, h('small', { text: 'Sarge’s version' }), ...LANES.map(ln => h('span', { 'data-k': ln.key })));
      voice.append(wasEl);
      const raceA = h('b', { text: '00.00' }), raceB = h('b', { text: '00.00' });
      const rowA = h('div', { class: 'cs-rrow', style: { '--c': '#ff5a4f' } }, h('i'), h('span', { text: 'Run 1 · with Sarge' }), raceA);
      const rowB = h('div', { class: 'cs-rrow', style: { '--c': '#ffc94a' } }, h('i'), h('span', { text: 'Run 2 · with your coach' }), raceB);
      const noteEl = h('p', { class: 'cs-note', text: 'Same athlete, same ' + SP.course + ', same take-offs. Only the voice changes. (An illustration.)' });
      voice.append(h('div', { class: 'cs-race' }, rowA, rowB, noteEl));
      const board = h('section', { class: 'cs-board off', 'aria-label': 'Coach’s board' }); G.boardHidden = true;
      const bStep = h('span', { text: '' });
      board.append(h('div', { class: 'cs-bhead' }, h('span', { text: 'Coach’s board' }), bStep));
      LANES.forEach(ln => {
        const st = lanes[ln.key];
        const fill = h('i', { class: 'cs-fill' });
        const ticks = [0, 1, 2, 3].map(() => h('i', { class: 'cs-tick' }));
        const mag = h('div', { class: 'cs-mag', html: ln.i0 });
        const rail = h('div', { class: 'cs-rail', role: 'slider', tabindex: '-1', 'aria-label': ln.a + ' to ' + ln.b, 'aria-valuemin': '0', 'aria-valuemax': '3', 'aria-valuenow': '0', 'aria-valuetext': ln.a }, fill, ...ticks, mag);
        const lock = h('i', { class: 'cs-lock', html: ICON.lock });
        const lane = h('div', { class: 'cs-lane shut', style: { '--c': ln.col, '--cd': ln.dk } }, h('div', { class: 'cs-ends' }, h('span', { text: ln.a }), h('span', { text: ln.b })), rail, lock);
        board.append(lane);
        Object.assign(st, { lane, rail, mag, fill, ticks, railW: 200, icon: 0 });
      });
      const goBtn = h('button', { type: 'button', class: 'cs-go', hidden: true, 'aria-label': 'Start' }, h('b', { text: 'GO' }), h('small', { text: 'Start' }));
      // the take-off ring: it fills as Rush runs up to the next gold mark; the last arc is the take-off window
      goBtn.insertAdjacentHTML('afterbegin', '<svg class="cs-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="56" pathLength="100"/><circle class="win" cx="60" cy="60" r="56" pathLength="100"/><circle class="fill" cx="60" cy="60" r="56" pathLength="100" stroke-dasharray="0 100"/></svg>');
      const ringWin = goBtn.querySelector('.cs-ring .win'), ringFill = goBtn.querySelector('.cs-ring .fill');
      const goLab = h('div', { class: 'cs-golabel', hidden: true, text: '' });
      const padCount = h('b', { text: '0 / 0' });
      const pad = h('section', { class: 'cs-pad', hidden: true, 'aria-label': 'Race control' }, h('div', { class: 'cs-phead' }, h('span', { text: 'Tap in the gold' }), h('span', null, document.createTextNode('Perfect take-offs '), padCount)));
      const capA = h('div', { class: 'cs-cap sarge', hidden: true, style: { '--c': '#ff5a4f' } }, h('small', null, h('i'), document.createTextNode('Run 1 · Sarge’s voice')), h('p'));
      const capB = h('div', { class: 'cs-cap', hidden: true, style: { '--c': '#ffc94a' } }, h('small', null, h('i'), document.createTextNode('Run 2 · your coach’s voice')), h('p'));
      const ffEl = h('div', { class: 'cs-ff', hidden: true, text: '▶▶ Fast-forward' });
      el.append(screenEl, tagEl, capA, capB, ffEl, voice, board, pad, goLab, goBtn, shout);

      /* ---------------- cast ---------------- */
      const rush = K.character('rush', { side: 'right', mood: 'happy', size: 84, shadow: false, x: 0, y: 0, voice: 640 });
      const rush2 = K.character('rush', { side: 'right', mood: 'happy', size: 60, shadow: false, x: 0, y: 0, voice: 640 });
      const patch = K.character('patch', { side: 'left', mood: 'happy', size: 54, x: 0, y: 0, voice: 560 });
      const still = K.character('still', { side: 'right', mood: 'happy', size: 64, x: 0, y: 0, voice: 480 });
      rush2.show(false); patch.show(false); still.show(false); still.el.classList.add('cs-still');
      [rush, rush2].forEach(c => { c.el.style.left = '0px'; c.el.style.top = '0px'; c.el.style.transition = 'opacity .4s ease'; });
      const sayP = (o, mood, ms) => { rush.hush(); return patch.say(L(o), { mood, ms: ms == null ? 3600 : ms }); };
      const sayR = (o, mood, ms) => rush.say(L(o), { mood, moodMs: mood ? 1800 : 0, ms: ms == null ? 2600 : ms });
      const sayS = (o, mood, ms) => still.say(L(o), { mood, ms: ms == null ? 3600 : ms });

      /* ---------------- athletes ---------------- */
      const mkAth = (ch) => ({ ch, s: 0, v: 0, C: 0.6, Ct: 0.6, state: 'blocks', tt: 0, y: 0, vy: 0, air: null, obs: [], boost: 0, mood: '', rot: 0, sq: 0, lastStep: 0, recoverAt: 0, finished: false, time: 0, simT: 0, down: 0, rise: 0, fallV: 0, swing: 0 });
      const RACE_K = 1.72; // race-clock seconds per simulated second (an illustration, labelled as one)
      const ath = mkAth(rush), athA = mkAth(rush2);
      const vOf = (C) => (110 + 210 * C) * [0.9, 1, 1.07][inten];
      const strideOf = (a) => (SP.id === 'wall' ? 112 : 56 + 74 * a.C);
      const jumpLen = (a) => 70 + 46 * a.C;
      const takeoffD = (a) => jumpLen(a) * 0.5;
      const nextObs = (a) => { for (const o of a.obs) if (!o.passed) return o; return null; };

      /* ---------------- sound ---------------- */
      const music = K.music('playful');
      music.level(0); music.tempo(96);
      let crowd = null, chalk = null, lastCrowd = 0;
      const beds = () => { if (!A.ctx) return; if (!crowd) { crowd = A.loop({ pink: true, filter: 'bandpass', freq: 760, q: 0.55, bus: 'amb' }); } if (!chalk) chalk = A.loop({ filter: 'highpass', freq: 3600, q: 0.4, bus: 'sfx' }); };
      beds(); S.on('audio-ready', beds);
      S.onDestroy(() => { [crowd, chalk].forEach(l => l && l.stop()); });
      music.onBeat((time, i, b) => {
        if (!A.ctx) return;
        if (G.sargeBeat) { A.noise({ when: time, filter: 'bandpass', freq: 1900, q: 0.9, dur: 0.07, vol: 0.08 }); if (b === 3) for (let r = 1; r < 4; r++) A.noise({ when: time + r * 0.06, filter: 'bandpass', freq: 2100, q: 1, dur: 0.045, vol: 0.045 }); }
        else if (G.excite > 0.55 && (b === 1 || b === 3) && G.phase !== 'intro') A.noise({ when: time, filter: 'bandpass', freq: 1400, q: 1.1, dur: 0.07, vol: 0.06 * G.excite, bus: 'amb' });
      });
      const SFX = {
        whistle(len, harsh) {
          if (!A.ctx) return; const c = A.ctx, t = c.currentTime + 0.01, f0 = harsh ? 2450 : 2750;
          const o = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain(), f = c.createBiquadFilter();
          o.frequency.value = f0; o2.frequency.value = f0 * 1.008; lfo.frequency.value = harsh ? 34 : 26; lg.gain.value = harsh ? 190 : 90;
          lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency); f.type = 'bandpass'; f.frequency.value = f0; f.Q.value = 1.6;
          o.connect(f); o2.connect(f); f.connect(g); g.connect(A.bus('sfx'));
          const v = harsh ? 0.06 : 0.045; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.setValueAtTime(v, t + Math.max(0.03, len - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          [o, o2, lfo].forEach(x => { x.start(t); x.stop(t + len + 0.05); });
          o.onended = () => { try { g.disconnect(); f.disconnect(); lg.disconnect(); } catch (e) { /* gone */ } };
          A.noise({ filter: 'highpass', freq: 5200, dur: len, vol: 0.018 });
        },
        bark(n) {
          if (!A.ctx) return; const t0 = A.now() + 0.02;
          for (let i = 0; i < n; i++) {
            const t = t0 + i * 0.12 + (i % 3 === 2 ? 0.05 : 0), f = 140 + Math.random() * 80;
            A.tone({ when: t, type: 'sawtooth', freq: f * 1.35, to: f, glide: 0.08, dur: 0.1, vol: 0.075, lp: 1500, q: 5 });
            A.tone({ when: t, type: 'square', freq: f * 0.5, dur: 0.09, vol: 0.028, lp: 600 });
            A.noise({ when: t, filter: 'bandpass', freq: 1250, q: 3, dur: 0.06, vol: 0.03 });
          }
        },
        step(a) {
          if (!A.ctx) return; const v = 0.6 + a.C * 0.6;
          if (SP.id === 'track') { A.tone({ type: 'sine', freq: 115, to: 70, dur: 0.06, vol: 0.045 * v }); A.noise({ filter: 'lowpass', freq: 900, dur: 0.03, vol: 0.025 * v }); }
          else if (SP.id === 'pool') A.noise({ filter: 'bandpass', freq: 900 + Math.random() * 500, q: 0.8, dur: 0.13, attack: 0.012, vol: 0.035 * v });
          else { A.noise({ filter: 'highpass', freq: 2600, dur: 0.03, vol: 0.025 * v }); A.wood(undefined, 0.03 * v, 0.55); }
        },
        jump(p) { if (!A.ctx) return; A.whoosh({ vol: p ? 0.12 : 0.07, dur: 0.24, from: 500, to: p ? 3600 : 2400 }); },
        land() { if (!A.ctx) return; if (SP.id === 'pool') A.noise({ filter: 'lowpass', freq: 1200, dur: 0.22, attack: 0.01, vol: 0.08 }); else A.thud({ vol: 0.14 }); },
        clip() { if (!A.ctx) return; const t = A.now(); if (SP.id === 'track') { [0, 0.07, 0.16].forEach((d, i) => A.wood(t + d, 0.12 - i * 0.03, 0.9 - i * 0.15)); A.noise({ filter: 'lowpass', freq: 700, dur: 0.2, vol: 0.08 }); } else if (SP.id === 'pool') A.noise({ filter: 'bandpass', freq: 700, q: 0.7, dur: 0.35, vol: 0.1 }); else { A.noise({ filter: 'highpass', freq: 1800, dur: 0.12, vol: 0.06 }); A.wood(t, 0.08, 0.7); } },
        crash() {
          if (!A.ctx) return; const t = A.now();
          if (SP.id === 'track') { [0, 0.06, 0.13, 0.22, 0.34].forEach((d, i) => A.wood(t + d, 0.16 - i * 0.025, 1 - i * 0.12)); A.thud({ vol: 0.32 }); A.noise({ filter: 'lowpass', freq: 500, dur: 0.5, vol: 0.12 }); }
          else if (SP.id === 'pool') { A.noise({ filter: 'lowpass', freq: 1400, dur: 0.6, attack: 0.01, vol: 0.2 }); A.noise({ when: t + 0.35, filter: 'bandpass', freq: 380, q: 3, dur: 0.15, vol: 0.08 }); A.noise({ when: t + 0.6, filter: 'bandpass', freq: 420, q: 3, dur: 0.12, vol: 0.06 }); }
          else { A.whoosh({ vol: 0.12, dur: 0.3, from: 2600, to: 400 }); A.tone({ when: t + 0.3, type: 'sine', freq: 90, to: 60, dur: 0.25, vol: 0.2 }); A.noise({ when: t + 0.3, filter: 'lowpass', freq: 600, dur: 0.15, vol: 0.08 }); }
        },
        ooh() { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 650, to: 380, q: 2.2, dur: 1.3, attack: 0.18, vol: 0.12, bus: 'amb' }); A.tone({ type: 'sine', freq: 330, to: 230, dur: 1.1, attack: 0.15, vol: 0.03, bus: 'amb' }); },
        cheer(v) { if (!A.ctx) return; A.noise({ filter: 'bandpass', freq: 880, to: 1350, q: 0.7, dur: 1.4, attack: 0.25, vol: 0.13 * (v || 1), bus: 'amb' }); A.noise({ filter: 'highpass', freq: 3000, dur: 1.1, attack: 0.2, vol: 0.03 * (v || 1), bus: 'amb' }); },
        clack(i) { if (!A.ctx) return; A.wood(undefined, 0.16, 1.2 + i * 0.18); A.click({ vol: 0.08 }); A.tone({ type: 'sine', freq: [330, 392, 494, 587][i] || 587, dur: 0.12, vol: 0.05 }); },
        flap() { if (!A.ctx) return; A.noise({ filter: 'highpass', freq: 2400 + Math.random() * 1600, dur: 0.012, vol: 0.022 }); },
        pistol() { if (!A.ctx) return; A.noise({ filter: 'lowpass', freq: 4200, dur: 0.32, attack: 0.002, vol: 0.4 }); A.thud({ vol: 0.3 }); },
        fanfare() {
          if (!A.ctx) return; const t0 = A.now() + 0.05;
          [['C4', 0, 0.16], ['E4', 0.16, 0.16], ['G4', 0.32, 0.16], ['C5', 0.48, 0.5], ['G4', 1.02, 0.14], ['C5', 1.18, 0.9]].forEach(([n, d, len]) => {
            A.tone({ when: t0 + d, type: 'sawtooth', freq: A.note(n), dur: len + 0.1, vol: 0.06, attack: 0.02, lp: 1900, verb: 0.3, bus: 'music' });
            A.tone({ when: t0 + d, type: 'triangle', freq: A.note(n) * 2, dur: len + 0.1, vol: 0.03, attack: 0.02, verb: 0.3, bus: 'music' });
          });
        },
        flash() { if (!A.ctx) return; A.click({ vol: 0.04 }); A.noise({ filter: 'highpass', freq: 4500, dur: 0.05, vol: 0.02 }); }
      };

      /* ---------------- layout ---------------- */
      function setView(V, y0, hh, sz, band) {
        V.y0 = y0; V.h = hh; V.sz = sz; V.k = sz / 84; V.band = band;
        V.ax = Math.round(M.W * (M.phone ? 0.34 : 0.36));
        const f = FR[SP.id][band ? 1 : 0];
        V.standsTop = y0 + hh * f[0]; V.standsBot = y0 + hh * f[1]; V.boardsBot = y0 + hh * f[2]; V.trackTop = y0 + hh * f[3]; V.ground = y0 + hh * f[4];
        V.route = y0 + hh * (band ? 0.62 : 0.69);
      }
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        M.W = W; M.H = H; M.phone = W < 700;
        const ph = M.phone;
        M.vb = ph ? Math.round(clamp(H * 0.475, 330, 430)) : Math.round(clamp(H * 0.62, 400, 620));
        setView(V1, M.top, M.vb - M.top, ph ? 84 : 104, false);
        const mid = Math.round((M.top + M.vb) / 2);
        setView(VA, M.top, mid - M.top - 1, ph ? 60 : 82, true);
        setView(VB, mid + 1, M.vb - mid - 1, ph ? 60 : 82, true);
        rush.el.style.setProperty('--sz', V1.sz + 'px'); rush2.el.style.setProperty('--sz', VA.sz + 'px');
        // the bottom area: the voice panel and the coach's board
        const bot = H - 14;
        if (ph) {
          const bh = 224;
          Object.assign(board.style, { left: '10px', width: (W - 20) + 'px', top: (bot - bh) + 'px', height: bh + 'px' });
          Object.assign(voice.style, { left: '10px', width: (W - 20) + 'px', top: (M.vb + 8) + 'px', height: (bot - bh - 8 - M.vb - 8) + 'px' });
          M.bArea = { x: 10, y: bot - bh, w: W - 20, h: bh };
        } else {
          const half = Math.min(620, (W - 96) / 2), x0 = Math.round(W / 2 - half - 12), x1 = Math.round(W / 2 + 12);
          Object.assign(voice.style, { left: x0 + 'px', width: half + 'px', top: (M.vb + 12) + 'px', height: (bot - M.vb - 12) + 'px' });
          Object.assign(board.style, { left: x1 + 'px', width: half + 'px', top: (M.vb + 12) + 'px', height: (bot - M.vb - 12) + 'px' });
          M.bArea = { x: x1, y: M.vb + 12, w: half, h: bot - M.vb - 12 };
        }
        voice.classList.toggle('clamp', ph && !G.finaleLine);
        // before the coach arrives the board is there but locked (dimmed padlocks), so the screen never sits half empty
        if (G.boardHidden) { board.classList.remove('off'); board.classList.add('dim'); }
        LANES.forEach(l => { const st = lanes[l.key]; st.railW = st.rail.clientWidth || (M.bArea.w - 28); placeTicks(st); placeMag(st); });
        Object.assign(pad.style, { left: M.bArea.x + 'px', top: M.bArea.y + 'px', width: M.bArea.w + 'px', height: M.bArea.h + 'px' });
        placeGo();
        placeCast();
        screenEl.style.width = (ph ? Math.min(250, W - 140) : 380) + 'px';
        artKey = '';
      }
      // GO sits in the middle of the locked board for the first run; in the race it sits in the race-control pad
      function placeGo() {
        if (!M.bArea) return;
        const B = M.bArea, gx = B.x + B.w / 2, gy = G.split ? B.y + (M.phone ? 96 : B.h / 2 - 8) : B.y + B.h / 2 - 10;
        goBtn.style.left = gx + 'px'; goBtn.style.top = gy + 'px';
        goLab.style.left = gx + 'px'; goLab.style.top = (gy + (G.split ? 76 : 70)) + 'px';
      }
      function placeCast() {
        const ph = M.phone;
        if (G.split) {
          const ps = ph ? 46 : 70; patch.el.style.setProperty('--sz', ps + 'px'); patch.place(M.W - ps - (ph ? 8 : 40), VB.y0 + (ph ? 6 : 10));
          capA.style.top = (VA.y0 + 6) + 'px'; capB.style.top = (VB.y0 + 6) + 'px';
          ffEl.style.top = (VA.y0 + VA.h - 40) + 'px';
        } else if (G.phase === 'finale' || G.phase === 'done') {
          // below the card's title, never over it
          const C0 = G.cereRect || M.bArea, ps = ph ? 56 : 80; patch.el.style.setProperty('--sz', ps + 'px'); patch.place(C0.x + 12, C0.y + 34);
        } else if (G.podium) {
          const ps = ph ? 52 : 80; patch.el.style.setProperty('--sz', ps + 'px'); patch.place(M.W - ps - (ph ? 8 : 40), V1.standsTop + (ph ? 52 : 40));
        } else {
          const ps = ph ? 54 : 84; patch.el.style.setProperty('--sz', ps + 'px'); patch.place(M.W - ps - (ph ? 8 : 40), V1.standsTop + (ph ? 4 : 10));
        }
        const C1 = G.cereRect || M.bArea, ss = ph ? 62 : 84; still.el.style.setProperty('--sz', ss + 'px'); still.place(C1.x + 12, C1.y + 34);
      }
      function placeTicks(st) { const w = st.railW - 46; st.ticks.forEach((t, i) => { t.style.left = (23 + w * i / 3) + 'px'; }); }
      function placeMag(st) { const w = st.railW - 46; st.mag.style.setProperty('--x', (st.v * w).toFixed(1) + 'px'); st.fill.style.setProperty('--w', (st.v * w).toFixed(1) + 'px'); }

      /* ---------------- palette and pre-rendered art ---------------- */
      let artKey = '';
      const ART = {};
      function pal() {
        const b = isBright();
        if (SP.id === 'track') return b ? { skyT: '#4f9de8', skyB: '#cfe8ff', haze: '#fff3d6', tierA: '#c9d3e4', tierB: '#b7c3d8', edge: '#8e9cb6', crowdDim: 0, boardBg: ['#14306b', '#c8243a', '#0d7f63', '#e08a12', '#4b34b5'], boardTx: '#ffffff', infield: '#56a94f', infield2: '#4b9a46', trackA: '#d8653f', trackB: '#c4532f', line: 'rgba(255,255,255,0.95)', floorA: '#283656', floorB: '#1c2742', night: false }
          : { skyT: '#050820', skyB: '#1a1f4c', haze: '#3b2a6a', tierA: '#1b2248', tierB: '#161c3e', edge: '#2b3468', crowdDim: 0.35, boardBg: ['#0a0f26', '#0a0f26', '#0a0f26', '#0a0f26', '#0a0f26'], boardTx: 'led', infield: '#1f4a2c', infield2: '#1b4227', trackA: '#9a412b', trackB: '#873622', line: 'rgba(255,255,255,0.86)', floorA: '#0c1124', floorB: '#070a18', night: true };
        if (SP.id === 'pool') return b ? { skyT: '#dfeefa', skyB: '#f6fbff', haze: '#ffffff', tierA: '#d6dfeb', tierB: '#c6d2e2', edge: '#9eb0c8', crowdDim: 0, deck: '#eef3f8', deck2: '#d9e3ee', waterA: '#5ccff0', waterB: '#1f8fd0', rope: ['#ff4d4d', '#ffffff', '#2b6fff'], floorA: '#21405e', floorB: '#162c45', night: false }
          : { skyT: '#060b1e', skyB: '#0f2346', haze: '#173a6a', tierA: '#18223f', tierB: '#131b34', edge: '#25325a', crowdDim: 0.32, deck: '#2a3550', deck2: '#222c45', waterA: '#1fa6d6', waterB: '#0a4d86', rope: ['#ff4d4d', '#ffe9c4', '#3d7bff'], floorA: '#0b1426', floorB: '#060b18', night: true };
        return b ? { skyT: '#e9edf2', skyB: '#f6f8fb', haze: '#ffffff', tierA: '#d5dbe4', tierB: '#c7cfda', edge: '#98a3b5', crowdDim: 0, wallA: '#cfd6df', wallB: '#bfc8d3', seam: 'rgba(60,70,90,0.18)', nut: 'rgba(50,60,80,0.35)', mat: '#2f6fd6', mat2: '#285fb8', floorA: '#2b3346', floorB: '#1d2333', night: false }
          : { skyT: '#0a0d18', skyB: '#171c2e', haze: '#2a2f4a', tierA: '#1b2033', tierB: '#161a2b', edge: '#2a3048', crowdDim: 0.34, wallA: '#3a4152', wallB: '#323848', seam: 'rgba(0,0,0,0.3)', nut: 'rgba(0,0,0,0.45)', mat: '#1f4fa8', mat2: '#1a448f', floorA: '#0c0f1a', floorB: '#070910', night: true };
      }
      function mk(w, hh) { const c = document.createElement('canvas'), d = Math.min(1.5, cv.dpr || 1); c.width = Math.max(2, Math.ceil(w * d)); c.height = Math.max(2, Math.ceil(hh * d)); const g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { c, g, w, h: hh, d }; }
      function paintCrowd(g, w, hh, rows, seed, cheer, pl) {
        const R = K.rng(seed), rowH = hh / rows;
        for (let r = 0; r < rows; r++) {
          const y0 = r * rowH;
          g.fillStyle = r % 2 ? pl.tierA : pl.tierB; g.fillRect(0, y0, w, rowH);
          g.fillStyle = pl.edge; g.fillRect(0, y0 + rowH - 1.5, w, 1.5);
          const step = rowH * 0.66, hr = rowH * 0.2;
          for (let x = 4 + R() * step; x < w - step * 0.6; x += step * (0.82 + R() * 0.36)) {
            const empty = R() < 0.1, sk = SKIN[(R() * SKIN.length) | 0], sh = SHIRT[(R() * SHIRT.length) | 0], up = cheer && R() < 0.75, lift = up ? rowH * 0.1 : 0;
            if (empty) continue;
            const by = y0 + rowH - 2 - lift;
            g.fillStyle = sh; rr(g, x - step * 0.36, by - rowH * 0.36, step * 0.72, rowH * 0.36, step * 0.3); g.fill();
            g.fillStyle = sk; g.beginPath(); g.arc(x, by - rowH * 0.36 - hr * 0.9, hr, 0, TAU); g.fill();
            if (up) { g.strokeStyle = sk; g.lineWidth = Math.max(1, rowH * 0.07); g.lineCap = 'round'; g.beginPath(); g.moveTo(x - step * 0.3, by - rowH * 0.3); g.lineTo(x - step * 0.42, by - rowH * 0.78); g.moveTo(x + step * 0.3, by - rowH * 0.3); g.lineTo(x + step * 0.42, by - rowH * 0.78); g.stroke(); }
          }
          // aisles
          g.fillStyle = pl.edge; for (let ax = (seed % 3) * 60 + 90; ax < w; ax += 240) { g.globalAlpha = 0.55; g.fillRect(ax, y0, 6, rowH); g.globalAlpha = 1; }
        }
        if (pl.crowdDim) { g.fillStyle = 'rgba(5,8,25,' + pl.crowdDim + ')'; g.fillRect(0, 0, w, hh); }
      }
      function buildArt() {
        const W = M.W, H = M.H, pl = pal(), d = Math.min(1.5, cv.dpr || 1);
        artKey = W + 'x' + H + ':' + d + ':' + (isBright() ? 'b' : 'd');
        ART.pl = pl;
        // full background: sky / ceiling and the sideline floor under the panels
        const bg = ART.bg = mk(W, H), g = bg.g;
        let gr = g.createLinearGradient(0, 0, 0, V1.standsBot); gr.addColorStop(0, pl.skyT); gr.addColorStop(1, pl.skyB);
        g.fillStyle = gr; g.fillRect(0, 0, W, M.vb);
        if (SP.id === 'track') {
          if (pl.night) {
            const R = K.rng(7); g.fillStyle = '#ffffff'; for (let i = 0; i < 80; i++) { g.globalAlpha = 0.25 + R() * 0.55; g.fillRect(R() * W, R() * V1.standsTop * 1.1, 1.2, 1.2); } g.globalAlpha = 1;
            [0.08, 0.92].forEach(fx => { const x = W * fx, y = V1.standsTop - 6; g.fillStyle = '#20253f'; g.fillRect(x - 3, y, 6, V1.standsBot - y); g.fillStyle = '#2c3354'; rr(g, x - 26, y - 22, 52, 22, 4); g.fill();
              for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(x - 18 + i * 12, y - 16 + j * 10, 3.6, 0, TAU); g.fill(); }
              g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9; g.drawImage(K.glowSprite('#fff2c8'), x - 90, y - 100, 180, 180); g.globalAlpha = 0.18; const cone = g.createLinearGradient(0, y, 0, V1.trackTop); cone.addColorStop(0, 'rgba(255,245,210,1)'); cone.addColorStop(1, 'rgba(255,245,210,0)'); g.fillStyle = cone; g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x + 20, y); g.lineTo(fx < 0.5 ? x + W * 0.5 : x - W * 0.1, V1.trackTop); g.lineTo(fx < 0.5 ? x + W * 0.1 : x - W * 0.5, V1.trackTop); g.closePath(); g.fill(); g.restore(); });
          } else {
            g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55; g.drawImage(K.glowSprite('#fff4d0'), W * 0.78 - 120, 20, 240, 240); g.restore();
            g.fillStyle = 'rgba(255,255,255,0.8)'; [[0.18, 0.55, 60], [0.42, 0.35, 44], [0.7, 0.62, 52]].forEach(([fx, fy, r]) => { const x = W * fx, y = M.top + (V1.standsTop - M.top) * fy; g.beginPath(); g.ellipse(x, y, r, r * 0.32, 0, 0, TAU); g.ellipse(x + r * 0.5, y - r * 0.14, r * 0.6, r * 0.3, 0, 0, TAU); g.fill(); });
          }
          // the roof edge of the stands
          g.fillStyle = pl.night ? '#121733' : '#9aa7bf'; g.fillRect(0, V1.standsTop - 8, W, 8);
        } else if (SP.id === 'pool') {
          // ceiling trusses and lights / skylights
          g.strokeStyle = pl.night ? 'rgba(120,150,210,0.25)' : 'rgba(80,110,150,0.25)'; g.lineWidth = 2;
          for (let x = -40; x < W + 40; x += 70) { g.beginPath(); g.moveTo(x, M.top); g.lineTo(x + 35, V1.standsTop - 10); g.lineTo(x + 70, M.top); g.stroke(); }
          g.beginPath(); g.moveTo(0, V1.standsTop - 10); g.lineTo(W, V1.standsTop - 10); g.stroke();
          for (let x = 30; x < W; x += 90) { if (pl.night) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(K.glowSprite('#bfe4ff'), x - 40, M.top + 4 - 30, 80, 80); g.restore(); g.fillStyle = '#eaf6ff'; g.beginPath(); g.arc(x, M.top + 14, 3.5, 0, TAU); g.fill(); } else { g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(x - 20, M.top + 6, 40, 10); } }
          // bunting
          const by = V1.standsTop - 4; g.strokeStyle = pl.night ? 'rgba(220,230,255,0.4)' : 'rgba(60,80,110,0.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, by); g.lineTo(W, by); g.stroke();
          for (let x = 6, i = 0; x < W; x += 16, i++) { g.fillStyle = ['#ff4d4d', '#ffffff', '#2b6fff', '#ffc94a'][i % 4]; g.beginPath(); g.moveTo(x, by); g.lineTo(x + 12, by); g.lineTo(x + 6, by + 10); g.closePath(); g.fill(); }
        } else {
          // climbing gym: industrial lights
          for (let x = 40; x < W; x += 140) { g.fillStyle = pl.night ? '#232840' : '#b7c0cc'; g.fillRect(x - 1, M.top, 2, 18); rr(g, x - 22, M.top + 16, 44, 9, 4); g.fill(); if (pl.night) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.drawImage(K.glowSprite('#fff0c8'), x - 70, M.top + 20 - 50, 140, 110); g.restore(); } }
        }
        // the sideline floor under the panels
        gr = g.createLinearGradient(0, M.vb, 0, H); gr.addColorStop(0, pl.floorA); gr.addColorStop(1, pl.floorB);
        g.fillStyle = gr; g.fillRect(0, M.vb, W, H - M.vb);
        g.strokeStyle = pl.night ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)'; g.lineWidth = 2;
        for (let x = -H; x < W; x += 34) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + (H - M.vb), M.vb); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, M.vb, W, 3);
        // crowd tiles
        const sh = Math.max(20, V1.standsBot - V1.standsTop), tw = M.phone ? 720 : 1040, rows = SP.id === 'wall' ? 3 : (M.phone ? 6 : 8);
        ART.tw = tw; ART.sh = sh;
        ART.seat = mk(tw, sh); paintCrowd(ART.seat.g, tw, sh, rows, 11, false, pl);
        ART.cheer = mk(tw, sh); paintCrowd(ART.cheer.g, tw, sh, rows, 11, true, pl);
        // boards strip
        const bh = Math.max(8, V1.boardsBot - V1.standsBot), bw = 7 * 150;
        ART.bw = bw; ART.bh = bh;
        const bs = ART.boards = mk(bw, bh), bg2 = bs.g;
        if (SP.id === 'track') {
          SPONSORS.forEach((s, i) => {
            const x = i * 150; bg2.fillStyle = pl.boardTx === 'led' ? '#080c20' : pl.boardBg[i % pl.boardBg.length]; bg2.fillRect(x + 1, 0, 148, bh);
            bg2.font = '700 ' + Math.round(bh * 0.62) + 'px "Barlow Condensed", "Arial Narrow", sans-serif'; bg2.textAlign = 'center'; bg2.textBaseline = 'middle';
            if (pl.boardTx === 'led') { const c = SHIRT[(i * 3) % SHIRT.length]; bg2.save(); bg2.shadowColor = c; bg2.shadowBlur = 8; bg2.fillStyle = c; bg2.fillText(s, x + 75, bh / 2 + 1); bg2.restore(); }
            else { bg2.fillStyle = '#fff'; bg2.fillText(s, x + 75, bh / 2 + 1); }
          });
        } else if (SP.id === 'pool') {
          for (let x = 0; x < bw; x += 18) { bg2.fillStyle = (x / 18) % 2 ? pl.deck : pl.deck2; bg2.fillRect(x, 0, 18, bh); }
          bg2.fillStyle = 'rgba(0,0,0,0.12)'; bg2.fillRect(0, bh - 3, bw, 3);
        } else {
          bg2.fillStyle = pl.night ? '#262b3d' : '#a8b2c0'; bg2.fillRect(0, 0, bw, bh);
          for (let x = 0; x < bw; x += 150) { bg2.fillStyle = SHIRT[(x / 150) % SHIRT.length]; bg2.fillRect(x + 10, bh * 0.25, 40, bh * 0.5); bg2.fillStyle = pl.night ? '#dfe5f5' : '#1d2340'; bg2.font = '700 ' + Math.round(bh * 0.55) + 'px "Barlow Condensed", "Arial Narrow", sans-serif'; bg2.textBaseline = 'middle'; bg2.fillText(['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'][(x / 150) % 7], x + 58, bh / 2 + 1); }
        }
        // ground textures
        if (SP.id === 'track') {
          const gt = ART.grain = mk(160, 60), R = K.rng(5); gt.g.fillStyle = 'rgba(0,0,0,0)'; gt.g.clearRect(0, 0, 160, 60);
          for (let i = 0; i < 420; i++) { gt.g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)'; gt.g.fillRect(R() * 160, R() * 60, 1.4, 1.4); }
        } else if (SP.id === 'pool') {
          const ct = ART.caustic = mk(240, 120), cg = ct.g; cg.strokeStyle = 'rgba(255,255,255,0.22)'; cg.lineWidth = 1.6;
          for (let r = 0; r < 7; r++) { cg.beginPath(); for (let x = 0; x <= 240; x += 8) { const y = r * 18 + 6 + Math.sin(x * 0.052 + r * 1.7) * 5 + Math.sin(x * 0.026 * 2 + r) * 3; if (x) cg.lineTo(x, y); else cg.moveTo(x, y); } cg.stroke(); }
        } else {
          const wh = Math.max(40, V1.ground - V1.standsBot), wt = ART.wall = mk(672, wh), wg = wt.g, R = K.rng(9);
          const grd = wg.createLinearGradient(0, 0, 0, wh); grd.addColorStop(0, pl.wallA); grd.addColorStop(1, pl.wallB); wg.fillStyle = grd; wg.fillRect(0, 0, 672, wh);
          wg.strokeStyle = pl.seam; wg.lineWidth = 2; for (let x = 0; x <= 672; x += 112) { wg.beginPath(); wg.moveTo(x, 0); wg.lineTo(x, wh); wg.stroke(); } for (let y = 0; y < wh; y += 96) { wg.beginPath(); wg.moveTo(0, y); wg.lineTo(672, y); wg.stroke(); }
          wg.fillStyle = pl.nut; for (let x = 14; x < 672; x += 28) for (let y = 12; y < wh; y += 24) { wg.beginPath(); wg.arc(x + ((y / 24) % 2) * 14, y, 1.4, 0, TAU); wg.fill(); }
          for (let i = 0; i < 9; i++) { wg.fillStyle = pl.night ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.4)'; const x = R() * 620, y = R() * wh * 0.8; wg.beginPath(); wg.moveTo(x, y); wg.lineTo(x + 50 + R() * 40, y + 20 + R() * 30); wg.lineTo(x + 10, y + 60 + R() * 20); wg.closePath(); wg.fill(); }
          for (let i = 0; i < 26; i++) { const c = SHIRT[(R() * SHIRT.length) | 0]; wg.fillStyle = pl.night ? mixHex(c, '#20263a', 0.45) : mixHex(c, '#cfd6df', 0.25); const x = R() * 660, y = R() * wh; wg.beginPath(); wg.ellipse(x, y, 4 + R() * 5, 3 + R() * 4, R() * 3, 0, TAU); wg.fill(); }
        }
        ART.vig = mk(W, M.vb); const vg = ART.vig.g, vr = vg.createRadialGradient(W / 2, M.vb * 0.55, Math.min(W, M.vb) * 0.3, W / 2, M.vb * 0.55, Math.max(W, M.vb) * 0.8);
        vr.addColorStop(0, 'rgba(0,0,0,0)'); vr.addColorStop(1, pl.night ? 'rgba(0,0,10,0.45)' : 'rgba(20,30,60,0.12)'); vg.fillStyle = vr; vg.fillRect(0, 0, W, M.vb);
      }
      function tiled(g, img, tw, th, y, hh, off, x0, x1) {
        const sc = hh / th, w = tw * sc; if (w < 4) return;
        let x = -(((off % w) + w) % w) + (x0 || 0);
        for (; x < (x1 == null ? M.W : x1); x += w) g.drawImage(img.c, x, y, w + 0.6, hh);
      }

      /* ---------------- drawing a view ---------------- */
      const sxOf = (V, s) => V.ax + (s - V.camX) * V.k;
      function drawView(g, V, a, t) {
        const pl = ART.pl, W = M.W, k = V.k;
        g.save(); g.beginPath(); g.rect(0, V.y0, W, V.h); g.clip();
        if (V.band) { // a slice of the sky for the band
          const d = ART.bg.d; g.drawImage(ART.bg.c, 0, 0, ART.bg.c.width, Math.max(1, V1.standsTop * d), 0, V.y0 - 2, W, V.standsTop - V.y0 + 4);
        }
        // stands (parallax), with a crowd wave in the finale
        const off = V.camX * k * 0.22;
        tiled(g, ART.seat, ART.tw, ART.sh, V.standsTop, V.standsBot - V.standsTop, off);
        const ex = G.excite;
        if (ex > 0.5 && !reduced()) { g.globalAlpha = clamp((ex - 0.5) * 2, 0, 1) * (0.5 + 0.5 * Math.sin(t * 9)); tiled(g, ART.cheer, ART.tw, ART.sh, V.standsTop, V.standsBot - V.standsTop, off); g.globalAlpha = 1; }
        if (G.wave >= 0) { const wx = G.wave, ww = W * 0.22; g.save(); g.beginPath(); g.rect(wx - ww / 2, V.standsTop - 4, ww, V.standsBot - V.standsTop + 4); g.clip(); tiled(g, ART.cheer, ART.tw, ART.sh, V.standsTop - 3, V.standsBot - V.standsTop, off); g.restore(); }
        // camera flashes in the stands
        if (ex > 0.45 && !reduced() && Math.random() < 0.06 * ex) { G.flashes = G.flashes || []; G.flashes.push({ x: Math.random() * W, y: V.standsTop + Math.random() * (V.standsBot - V.standsTop) * 0.8, t: 0, v: V.id }); }
        if (G.flashes) G.flashes.forEach(f => { if (f.v !== V.id) return; const a2 = 1 - f.t / 0.18; if (a2 <= 0) return; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a2; g.drawImage(K.glowSprite('#ffffff'), f.x - 12, f.y - 12, 24, 24); g.restore(); });
        // boards / deck / wall top
        tiled(g, ART.boards, ART.bw, ART.bh, V.standsBot, V.boardsBot - V.standsBot, V.camX * k * 0.65);
        if (SP.id === 'track') drawTrack(g, V, a, t);
        else if (SP.id === 'pool') drawPool(g, V, a, t);
        else drawWall(g, V, a, t);
        // the sergeant on the sideline
        if (G.sarge.on && G.sarge.view === V.id) drawSarge(g, V);
        if (G.podium && V.id === 'V1') drawPodium(g, V);
        drawAthlete(g, V, a, t);
        g.restore();
      }
      function laneLines(V) { const gnd = V.ground, lw = (V.ground - V.trackTop) * 0.46; return { lw, ys: [gnd + lw * 0.5, gnd - lw * 0.5, gnd - lw * 1.5, gnd - lw * 2.5] }; }
      function drawTrack(g, V, a, t) {
        const pl = ART.pl, W = M.W, k = V.k, top = V.trackTop, bot = V.y0 + V.h;
        g.fillStyle = pl.infield; g.fillRect(0, V.boardsBot, W, top - V.boardsBot + 1);
        g.fillStyle = pl.infield2; const io = (V.camX * k) % 60; for (let x = -io - 60; x < W; x += 60) g.fillRect(x, V.boardsBot, 30, top - V.boardsBot);
        const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, pl.trackB); gr.addColorStop(1, pl.trackA);
        g.fillStyle = gr; g.fillRect(0, top, W, bot - top);
        tiled(g, ART.grain, 160, 60, top, bot - top, V.camX * k);
        g.fillStyle = pl.line; g.fillRect(0, top, W, 2);
        const LL = laneLines(V);
        LL.ys.forEach(y => { if (y > top + 2 && y < bot) g.fillRect(0, y - 1, W, 2); });
        // distance ticks on the lane lines
        const s0 = Math.floor((V.camX - V.ax / k) / 100) * 100;
        g.fillStyle = 'rgba(255,255,255,0.6)';
        for (let s = s0; s < V.camX + (W - V.ax) / k + 100; s += 100) { const x = sxOf(V, s); LL.ys.forEach(y => { if (y > top + 2 && y < bot) g.fillRect(x, y - 4, 2, 8); }); }
        drawCourseMarks(g, V, a);
        a.obs.forEach(o => { const x = sxOf(V, o.s); if (x < -60 || x > W + 60) return; if (o.mark && V.id !== 'VA' && !o.passed) drawMark(g, V, o, t); drawHurdle(g, x, V.ground, k, o); });
      }
      function drawCourseMarks(g, V, a) {
        const W = M.W, k = V.k;
        if (a.finishS) { const x = sxOf(V, a.finishS); if (x > -20 && x < W + 20) { const top = SP.id === 'wall' ? V.standsBot : V.trackTop, bot = V.y0 + V.h; for (let y = top, r = 0; y < bot; y += 6 * k, r++) { g.fillStyle = r % 2 ? '#111' : '#fff'; g.fillRect(x, y, 6 * k, 6 * k); g.fillStyle = r % 2 ? '#fff' : '#111'; g.fillRect(x + 6 * k, y, 6 * k, 6 * k); } } }
        if (a.startS != null) { const x = sxOf(V, a.startS); if (x > -20 && x < W + 20) { g.fillStyle = 'rgba(255,255,255,0.9)'; const top = SP.id === 'wall' ? V.standsBot : V.trackTop; g.fillRect(x - 1, top, 3, V.y0 + V.h - top); } }
      }
      function drawMark(g, V, o, t) {
        const D = takeoffD(ath), x = sxOf(V, o.s - D), k = V.k, y = SP.id === 'wall' ? V.route + V.sz * 0.62 : V.ground;
        const pulse = 0.55 + 0.45 * Math.sin(t * 8);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 * pulse; g.drawImage(K.glowSprite('#ffd24a'), x - 22 * k, y - 22 * k, 44 * k, 44 * k); g.restore();
        g.fillStyle = 'rgba(255,214,90,' + (0.7 + 0.3 * pulse).toFixed(2) + ')'; rr(g, x - 3 * k, y - 10 * k, 6 * k, 18 * k, 3 * k); g.fill();
      }
      function drawHurdle(g, x, gy, k, o) {
        // a side-on hurdle with a little depth: two uprights, feet, and a striped top board facing us
        const hh = 34 * k, dx = 8 * k, dy = 5 * k, fall = o.fall || 0, bar = o.setback ? ['#ffd24a', '#d7263d'] : ['#ffffff', '#1c1c24'];
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 6 * k, gy + 2 * k, 18 * k, 3.4 * k, 0, 0, TAU); g.fill();
        g.save(); g.translate(x + 6 * k, gy); g.rotate(fall * 1.42); g.translate(-6 * k, 0);
        g.lineCap = 'round';
        // far upright and foot
        g.strokeStyle = '#4a4d5c'; g.lineWidth = 3.2 * k; g.beginPath(); g.moveTo(dx, -dy); g.lineTo(dx, -hh - dy); g.moveTo(dx - 7 * k, -dy); g.lineTo(dx + 8 * k, -dy); g.stroke();
        // the board (seen at an angle) between the uprights
        g.beginPath(); g.moveTo(-1 * k, -hh - 1 * k); g.lineTo(dx + 1 * k, -hh - dy - 1 * k); g.lineTo(dx + 1 * k, -hh - dy + 8 * k); g.lineTo(-1 * k, -hh + 8 * k); g.closePath();
        g.fillStyle = bar[0]; g.fill();
        g.save(); g.clip(); g.fillStyle = bar[1]; for (let i = 0; i < 3; i++) { const t0 = i / 3 + 0.08, t1 = t0 + 0.17; g.beginPath(); g.moveTo(-1 * k + (dx + 2 * k) * t0, -hh - 1 * k - dy * t0); g.lineTo(-1 * k + (dx + 2 * k) * t1, -hh - 1 * k - dy * t1); g.lineTo(-1 * k + (dx + 2 * k) * t1, -hh + 9 * k - dy * t1); g.lineTo(-1 * k + (dx + 2 * k) * t0, -hh + 9 * k - dy * t0); g.closePath(); g.fill(); } g.restore();
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke();
        // near upright and foot
        g.strokeStyle = '#2a2c36'; g.lineWidth = 3.4 * k; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -hh + 6 * k); g.moveTo(-8 * k, 0); g.lineTo(8 * k, 0); g.stroke();
        g.restore();
      }
      function drawPool(g, V, a, t) {
        const pl = ART.pl, W = M.W, k = V.k, top = V.trackTop, bot = V.y0 + V.h;
        g.fillStyle = pl.deck; g.fillRect(0, V.boardsBot, W, top - V.boardsBot + 1);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, top - 3, W, 3);
        const gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, pl.waterA); gr.addColorStop(1, pl.waterB);
        g.fillStyle = gr; g.fillRect(0, top, W, bot - top);
        const LL = laneLines(V);
        // the black lane line on the bottom
        g.fillStyle = 'rgba(10,30,60,0.28)'; g.fillRect(0, V.ground + 2 * k, W, 5 * k); g.fillRect(0, V.ground - LL.lw - 1 * k, W, 4 * k);
        g.globalAlpha = 0.7; tiled(g, ART.caustic, 240, 120, top, bot - top, V.camX * k + t * 18); g.globalAlpha = 0.45; tiled(g, ART.caustic, 240, 120, top + 9, bot - top, V.camX * k * 0.8 - t * 12); g.globalAlpha = 1;
        // lane ropes
        LL.ys.forEach((y, ri) => {
          if (y < top + 3 || y > bot) return;
          const sp = 10 * k, s0 = Math.floor((V.camX - V.ax / k) / 10) * 10;
          for (let s = s0; s < V.camX + (W - V.ax) / k + 10; s += 10) { const x = sxOf(V, s), idx = Math.round(s / 10); const c = pl.rope[(Math.floor(idx / 6) + ri) % 3]; g.fillStyle = c; rr(g, x - sp * 0.42, y - 3 * k, sp * 0.84, 6 * k, 3 * k); g.fill(); }
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, y - 2.6 * k, W, 1);
        });
        drawCourseMarks(g, V, a);
        a.obs.forEach(o => { const x = sxOf(V, o.s); if (x < -60 || x > W + 60) return; if (o.mark && V.id !== 'VA' && !o.passed) drawMark(g, V, o, t); drawWave(g, x, V.ground, k, o, t); });
      }
      function drawWave(g, x, gy, k, o, t) {
        const fl = o.fall || 0, hgt = (16 - fl * 10) * k, w = 34 * k;
        g.fillStyle = 'rgba(160,230,255,0.55)'; g.beginPath(); g.moveTo(x - w, gy + 2 * k); g.quadraticCurveTo(x - w * 0.2, gy - hgt * 1.2, x + w * 0.2, gy - hgt); g.quadraticCurveTo(x + w * 0.6, gy - hgt * 0.4, x + w, gy + 2 * k); g.closePath(); g.fill();
        g.strokeStyle = o.setback ? '#ffd24a' : 'rgba(255,255,255,0.95)'; g.lineWidth = 3 * k; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x - w * 0.6, gy - hgt * 0.55); g.quadraticCurveTo(x - w * 0.1, gy - hgt * 1.15, x + w * 0.25, gy - hgt * 0.95); g.quadraticCurveTo(x + w * 0.4, gy - hgt * 0.7, x + w * 0.22, gy - hgt * 0.55); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(x - w * 0.5 + i * w * 0.32, gy - hgt * (0.5 + 0.25 * Math.sin(t * 4 + i)), 1.6 * k, 0, TAU); g.fill(); }
      }
      function routeHolds(V) { return { hy: V.route - V.sz * 0.62, fy: V.route + V.sz * 0.62 }; }
      function drawWall(g, V, a, t) {
        const pl = ART.pl, W = M.W, k = V.k, top = V.standsBot, matTop = V.ground, bot = V.y0 + V.h;
        tiled(g, ART.wall, 672, ART.wall.h, top, matTop - top, V.camX * k);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, top, W, 3);
        // crash mats
        g.fillStyle = pl.mat; g.fillRect(0, matTop, W, bot - matTop); g.fillStyle = pl.mat2; const mo = (V.camX * k) % 120; for (let x = -mo - 120; x < W; x += 120) g.fillRect(x, matTop, 3, bot - matTop);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, matTop, W, 2);
        drawCourseMarks(g, V, a);
        const RH = routeHolds(V), s0 = Math.floor((V.camX - V.ax / k) / 56) * 56, col = V.id === 'VA' ? '#ff6a5f' : '#ffc94a';
        for (let s = s0 + 28; s < V.camX + (W - V.ax) / k + 60; s += 56) {
          if (a.obs.some(o => s > o.s - 86 && s < o.s + 4)) continue;
          const x = sxOf(V, s); drawHold(g, x, RH.hy, k, col, 1); drawHold(g, x + 6 * k, RH.fy, k, col, 0.8);
        }
        a.obs.forEach(o => { const x = sxOf(V, o.s); if (x < -80 || x > W + 80) return; if (o.mark && V.id !== 'VA' && !o.passed) drawMark(g, V, o, t); drawCrux(g, x, V, o, col); });
      }
      function drawHold(g, x, y, k, col, s) {
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 1.5 * k, y + 2 * k, 6.5 * k * s, 4.5 * k * s, 0, 0, TAU); g.fill();
        g.fillStyle = col; g.beginPath(); g.ellipse(x, y, 6.5 * k * s, 4.8 * k * s, -0.3, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(x - 2 * k * s, y - 1.6 * k * s, 1.6 * k * s, 0, TAU); g.fill();
      }
      function drawCrux(g, x, V, o, col) {
        const k = V.k, RH = routeHolds(V);
        g.fillStyle = ART.pl.night ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.55)'; g.beginPath(); g.moveTo(x - 46 * k, RH.hy - 22 * k); g.lineTo(x + 6 * k, RH.hy - 40 * k); g.lineTo(x - 6 * k, RH.fy + 4 * k); g.closePath(); g.fill();
        g.fillStyle = o.setback ? '#ffd24a' : col; rr(g, x + 6 * k, RH.hy - 9 * k, 22 * k, 14 * k, 6 * k); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 10 * k, RH.hy - 6 * k, 10 * k, 2.4 * k);
        drawHold(g, x + 18 * k, RH.fy, k, col, 1);
      }
      function drawPodium(g, V) {
        const k = V.k, x = sxOf(V, G.podiumS), gy = podiumY(V);
        if (x < -200 || x > M.W + 200) return;
        const w = 44 * k, hh = 28 * k;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, gy + 2 * k, w * 1.6, 5 * k, 0, 0, TAU); g.fill();
        [[-1, 0.62, '2'], [1, 0.45, '3'], [0, 1, '1']].forEach(([dx, f, n]) => {
          const bx = x + dx * w - w / 2, bh = hh * f;
          const grd = g.createLinearGradient(0, gy - bh, 0, gy); grd.addColorStop(0, n === '1' ? '#fff3c4' : '#f4f6fb'); grd.addColorStop(1, n === '1' ? '#e8b832' : '#c3cada');
          g.fillStyle = grd; g.fillRect(bx, gy - bh, w, bh); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(bx, gy - bh, w, 3 * k);
          g.fillStyle = n === '1' ? '#7a4a00' : '#4a5470'; g.font = '700 ' + Math.round(16 * k) + 'px "Barlow Condensed", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, bx + w / 2, gy - bh / 2 + 1);
        });
      }

      /* ---------------- the athlete (limbs on the canvas, the bubble in the DOM above them) ---------------- */
      function bodyOf(a, V) {
        const k = V.k, sz = V.sz, C = a.C;
        let cx = sxOf(V, a.s), rot = 0, sx = 1, sy = 1, bottom, legExt = lerp(0.74, 1, C);
        const strideL = strideOf(a), bobA = (a.state === 'run' && !a.air) ? lerp(1.2, 5.5, C) : 0;
        const bob = bobA * Math.abs(Math.sin(TAU * a.s / strideL)) * k;
        if (SP.id === 'pool') {
          bottom = V.ground + sz * 0.2 - bob * 0.5 + a.y * k;
        } else if (SP.id === 'wall') {
          bottom = V.route + sz * 0.5 + a.y * k + (a.state === 'down' || a.state === 'tumble' ? a.down * k : 0) + (a.state === 'rise' ? a.down * (1 - a.rise) * k : 0);
        } else {
          if (a.state === 'blocks') legExt = 0.5;
          if (a.state === 'down') legExt = 0.18;
          if (a.state === 'rise') legExt = lerp(0.18, lerp(0.74, 1, C), a.rise);
          if (a.state === 'idle') legExt = 1;
          bottom = V.ground - 20 * k * legExt + 0.08 * sz + a.y * k - bob * 0.7;
        }
        if (onPodium(a)) { a.standY = podiumY(V) - 28 * k; bottom = a.standY - 20 * k + 0.08 * sz; }
        // posture: slump (head down, sunk, squashed) versus spring (upright, stretched on the bounce)
        if (a.state === 'run' || a.state === 'rise') {
          const slump = 1 - sstep(0.2, 0.75, C);
          rot = SP.id === 'pool' ? lerp(4, -3, C) + Math.sin(a.s / 30) * 4 : lerp(13, 5, C);
          sy = 1 - 0.06 * slump + (a.air ? 0.05 : 0.025 * C * Math.abs(Math.sin(TAU * a.s / strideL)));
          sx = 1 + 0.05 * slump - (a.air ? 0.03 : 0);
          if (a.air) rot += SP.id === 'track' ? -6 : -10;
        }
        if (a.state === 'blocks') { rot = SP.id === 'track' ? 16 : 0; sy = 0.96; }
        if (a.state === 'tumble') { rot = a.rot; sy = 1 - 0.06 * Math.sin(Math.PI * clamp(a.tt / 0.8, 0, 1)); }
        if (a.state === 'down') { rot = a.rot; sy = 0.95; sx = 1.04; }
        if (a.state === 'idle') { rot = 0; sy = 1 + 0.02 * Math.sin(now() / 260); }
        if (a.boost > 0.2) sy += 0.02;
        return { cx, bottom, top: bottom - sz, sz, rot, sx, sy, k };
      }
      function onPodium(a) { return a === ath && a.state === 'idle' && G.podium; }
      function podiumY(V) { return SP.id === 'pool' ? V.trackTop - 1 : V.ground; }
      function placeAthDom(a, V, B) {
        const C = a.ch;
        C.el.style.transform = 'translate3d(' + (B.cx - B.sz / 2).toFixed(1) + 'px,' + B.top.toFixed(1) + 'px,0)';
        C.img.style.rotate = B.rot.toFixed(1) + 'deg';
        C.img.style.scale = B.sx.toFixed(3) + ' ' + B.sy.toFixed(3);
      }
      function ik(hx, hy, fx, fy, a1, b1, dir) {
        let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy) || 0.001; const mx = a1 + b1 - 0.01;
        if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; fx = hx + dx; fy = hy + dy; }
        const ca = clamp((a1 * a1 + d * d - b1 * b1) / (2 * a1 * d), -1, 1), ang = Math.atan2(dy, dx) - dir * Math.acos(ca);
        return [hx + Math.cos(ang) * a1, hy + Math.sin(ang) * a1, fx, fy];
      }
      function limb(g, x0, y0, kx, ky, x1, y1, w, col, out) {
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = out; g.lineWidth = w + 2.4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(kx, ky); g.lineTo(x1, y1); g.stroke();
        g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(kx, ky); g.lineTo(x1, y1); g.stroke();
      }
      function shoe(g, x, y, k, ang, col) { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = '#1a1a22'; rr(g, -4 * k, -3.6 * k, 12 * k, 6.2 * k, 3 * k); g.fill(); g.fillStyle = col; rr(g, -3 * k, -3 * k, 10 * k, 4.4 * k, 2.4 * k); g.fill(); g.fillStyle = '#ffffff'; g.fillRect(-1 * k, -2.6 * k, 5 * k, 1.4 * k); g.restore(); }
      function drawAthlete(g, V, a, t) {
        const B = bodyOf(a, V), k = V.k, sz = V.sz;
        a.B = B; a.V = V;
        // ground shadow
        const pod = onPodium(a), gy = pod ? a.standY : SP.id === 'track' ? V.ground : null;
        if (gy != null) { const lift = clamp(-a.y / 60, 0, 1); g.fillStyle = 'rgba(0,0,0,' + (0.28 * (1 - lift * 0.6)).toFixed(3) + ')'; g.beginPath(); g.ellipse(B.cx, gy + 2 * k, sz * 0.32 * (1 - lift * 0.3), 4 * k, 0, 0, TAU); g.fill(); }
        // the low cloud of a harsh voice, the sparkle of a kind one
        if (a.state !== 'blocks' && a.C < 0.32 && a.state !== 'idle') drawCloud(g, B.cx + 4 * k, B.top - 14 * k, k, t, 1 - a.C / 0.32);
        if (a.C > 0.78 && (a.state === 'run') && !reduced()) {
          g.strokeStyle = 'rgba(255,255,255,' + (0.35 * (a.C - 0.78) / 0.22).toFixed(3) + ')'; g.lineWidth = 2 * k; g.lineCap = 'round';
          for (let i = 0; i < 3; i++) { const yy = B.top + sz * (0.3 + i * 0.2), len = (18 + 10 * i) * k; g.beginPath(); g.moveTo(B.cx - sz * 0.55 - len, yy); g.lineTo(B.cx - sz * 0.55, yy); g.stroke(); }
        }
        if (SP.id === 'track' || pod) drawLegs(g, a, V, B, t);
        else if (SP.id === 'wall') drawClimber(g, a, V, B, t);
        else drawSwim(g, a, V, B, t);
        if (G.medalOn && a === ath) drawMedalHang(g, B, k, t);
      }
      function drawCloud(g, x, y, k, t, a) {
        g.save(); g.globalAlpha = clamp(a, 0, 1) * 0.92;
        g.fillStyle = '#5b6177'; [[0, 0, 11], [-10, 3, 8], [10, 3, 8.5], [4, -5, 8]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * k, y + dy * k, r * k, 0, TAU); g.fill(); });
        g.strokeStyle = 'rgba(140,170,220,0.85)'; g.lineWidth = 1.4 * k; g.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const ph = (t * 1.8 + i * 0.27) % 1, dx = (i - 1.5) * 6 * k; g.globalAlpha = clamp(a, 0, 1) * (1 - ph); g.beginPath(); g.moveTo(x + dx, y + 10 * k + ph * 14 * k); g.lineTo(x + dx - 1.5 * k, y + 15 * k + ph * 14 * k); g.stroke(); }
        g.restore();
      }
      // the gold medal hangs from the bubble on a striped ribbon, swinging a little with each stride
      function drawMedalHang(g, B, k, t) {
        const sw = Math.sin(t * 5.2) * 0.12 * (reduced() ? 0 : 1), x = B.cx + 2 * k, top = B.bottom - 10 * k, len = 17 * k, R = 12 * k;
        const mx = x + Math.sin(sw) * len, my = top + Math.cos(sw) * len + R * 0.7;
        g.save(); g.lineCap = 'round';
        [['#2b6fff', -7], ['#ffffff', 0], ['#ff5a4f', 7]].forEach(([c, dx]) => { g.strokeStyle = c; g.lineWidth = 3.4 * k; g.beginPath(); g.moveTo(x + dx * k, top); g.lineTo(mx + dx * 0.25 * k, my - R * 0.8); g.stroke(); });
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55; g.drawImage(K.glowSprite('#ffd24a'), mx - R * 2.6, my - R * 2.6, R * 5.2, R * 5.2); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.fillStyle = '#9a6a0c'; g.beginPath(); g.arc(mx, my + 1.4 * k, R, 0, TAU); g.fill();
        g.fillStyle = '#f2b425'; g.beginPath(); g.arc(mx, my, R, 0, TAU); g.fill();
        g.fillStyle = '#ffe17a'; g.beginPath(); g.arc(mx, my, R * 0.72, 0, TAU); g.fill();
        g.fillStyle = '#b07a0e'; g.font = '700 ' + Math.round(13 * k) + 'px "Barlow Condensed", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1', mx, my + 0.6 * k);
        const gl = 0.5 + 0.5 * Math.sin(t * 3.1); g.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.4 * gl).toFixed(2) + ')'; g.beginPath(); g.ellipse(mx - R * 0.38, my - R * 0.42, R * 0.22, R * 0.12, -0.6, 0, TAU); g.fill();
        g.restore();
      }
      function drawLegs(g, a, V, B, t) {
        const k = V.k, sz = B.sz, out = '#7a0f18', col = '#e8323c', shoeC = '#ffc94a', a1 = 10.5 * k, b1 = 10.5 * k, w = 5.4 * k;
        const ang = B.rot * Math.PI / 180, cx = B.cx, cy = B.bottom - sz / 2;
        const hipAt = (dx) => { const hx = dx, hy = sz * 0.42; return [cx + hx * Math.cos(ang) - hy * Math.sin(ang), cy + hx * Math.sin(ang) + hy * Math.cos(ang)]; };
        const hips = [hipAt(-sz * 0.12), hipAt(sz * 0.1)], ground = V.ground;
        const feet = [];
        if (a.state === 'tumble' || (a.state === 'down' && reduced() === false && a.tt < 0)) {
          for (let i = 0; i < 2; i++) { const fa = ang + Math.PI / 2 + (i ? 0.5 : -0.4) + Math.sin(t * 20 + i) * 0.4; feet.push([hips[i][0] + Math.cos(fa) * 18 * k, hips[i][1] + Math.sin(fa) * 18 * k]); }
        } else if (a.state === 'down' || (a.state === 'rise' && a.rise < 0.5)) {
          feet.push([cx + 20 * k, ground - 1 * k], [cx + 30 * k, ground - 2 * k]);
        } else if (a.state === 'blocks') {
          feet.push([cx - 16 * k, ground], [cx - 28 * k, ground - 1 * k]);
          g.fillStyle = '#3a3f52'; g.fillRect(cx - 34 * k, ground - 7 * k, 26 * k, 4 * k); g.fillRect(cx - 32 * k, ground - 10 * k, 3 * k, 8 * k); g.fillRect(cx - 18 * k, ground - 10 * k, 3 * k, 8 * k);
        } else if (a.state === 'idle') {
          const fy = onPodium(a) ? a.standY : ground;
          feet.push([hips[0][0] - 2 * k, fy], [hips[1][0] + 2 * k, fy]);
        } else if (a.air) {
          const u = clamp((a.s - a.air.s0) / (a.air.s1 - a.air.s0), 0, 1);
          feet.push([cx - 18 * k + u * 4 * k, hips[0][1] + 8 * k], [cx + 22 * k - u * 6 * k, hips[1][1] + 6 * k - Math.sin(Math.PI * u) * 4 * k]);
        } else {
          const lam = strideOf(a), R = 12 * lerp(0.74, 1, a.C), st = clamp(2 * R / lam, 0.16, 0.6), lift = lerp(4, 13, a.C);
          for (let i = 0; i < 2; i++) {
            const n = a.s / lam + i * 0.5, f = n - Math.floor(n);
            let rx, fy;
            if (f < st) { rx = R * (1 - 2 * f / st); fy = ground; }
            else { const u = (f - st) / (1 - st), e = u * u * (3 - 2 * u); rx = -R + 2 * R * e; fy = ground - lift * Math.sin(Math.PI * u) * k; }
            feet.push([cx + rx * k + 2 * k, fy]);
            // footfall: a sound and a little dust, once per plant
            const plantId = Math.floor(n);
            if (f < st && a.plant && a.plant[i] !== plantId && V.id !== 'VA' && a.state === 'run') { a.plant[i] = plantId; if (a === ath || G.split) { SFX.step(a); if (Math.random() < 0.6) P.emit('dust', cx + rx * k, ground, 2, { colors: [isBright() ? 'rgba(160,90,60,0.5)' : 'rgba(200,170,160,0.35)'], speed: [10, 40], angle: -Math.PI * 0.85, spread: 0.8 }); } }
            else if (a.plant && f < st) a.plant[i] = plantId;
          }
          if (!a.plant) a.plant = [0, 0];
        }
        for (let i = 1; i >= 0; i--) {
          const hp = hips[i], ft = feet[i]; if (!ft) continue;
          const kn = ik(hp[0], hp[1], ft[0], ft[1], a1, b1, (a.state === 'down' || a.state === 'blocks') ? -1 : 1);
          limb(g, hp[0], hp[1], kn[0], kn[1], kn[2], kn[3], w, i ? col : mixHex(col, '#000000', 0.18), out);
          shoe(g, kn[2], kn[3], k, a.state === 'down' ? -0.5 : 0, shoeC);
        }
      }
      function drawClimber(g, a, V, B, t) {
        const k = V.k, sz = B.sz, out = '#7a0f18', col = '#e8323c', RH = routeHolds(V), lam = 112, cx = B.cx, cy = B.bottom - sz / 2;
        // the rope, from the top anchor to the harness
        const sw = a.state === 'down' ? Math.sin(t * 2.3) * 6 * k : 0;
        g.strokeStyle = isBright() ? '#ff7a2f' : '#ffb347'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(cx + sw * 3, V.y0 - 4); g.quadraticCurveTo(cx + sw * 2, (V.y0 + cy) / 2, cx, cy + sz * 0.38); g.stroke();
        const sh = [[cx - sz * 0.3, cy - sz * 0.18], [cx + sz * 0.3, cy - sz * 0.18]], hp = [[cx - sz * 0.14, cy + sz * 0.4], [cx + sz * 0.14, cy + sz * 0.4]];
        const hands = [], feet = [];
        if (a.state === 'down' || a.state === 'tumble') {
          hands.push([cx - 6 * k, cy - sz * 0.62], [cx + 6 * k, cy - sz * 0.64]);
          feet.push([cx - 8 * k + sw, cy + sz * 0.78], [cx + 10 * k + sw, cy + sz * 0.8]);
        } else if (a.air) {
          const u = clamp((a.s - a.air.s0) / (a.air.s1 - a.air.s0), 0, 1);
          hands.push([cx + 10 * k, RH.hy - 18 * k * Math.sin(Math.PI * u) + a.y * k * 0.3], [cx + 26 * k, RH.hy - 12 * k - 10 * k * Math.sin(Math.PI * u) + a.y * k * 0.3]);
          feet.push([cx - 14 * k, cy + sz * 0.72], [cx + 4 * k, cy + sz * 0.78]);
        } else {
          const st = 0.5;
          for (let i = 0; i < 2; i++) {
            const n = a.s / lam + i * 0.5, kk = Math.floor(n), f = n - kk, plant = (kk - i * 0.5 + 0.25) * lam;
            let hx, hy;
            if (f < st || a.state !== 'run') { hx = plant; hy = RH.hy; } else { const u = (f - st) / (1 - st), e = u * u * (3 - 2 * u); hx = plant + lam * e; hy = RH.hy - Math.sin(Math.PI * u) * 12 * k; }
            hands.push([sxOf(V, hx), hy]);
            const n2 = a.s / lam + i * 0.5 + 0.5, k2 = Math.floor(n2), f2 = n2 - k2, plant2 = (k2 - i * 0.5 - 0.5 + 0.25) * lam + 6;
            let fx, fy;
            if (f2 < st || a.state !== 'run') { fx = plant2; fy = RH.fy; } else { const u = (f2 - st) / (1 - st), e = u * u * (3 - 2 * u); fx = plant2 + lam * e; fy = RH.fy - Math.sin(Math.PI * u) * 8 * k; }
            feet.push([sxOf(V, fx), fy]);
            const plantId = kk; if (f < st && a.plant && a.plant[i] !== plantId && a.state === 'run') { a.plant[i] = plantId; if (V.id !== 'VA' && (a === ath || G.split)) { SFX.step(a); P.emit('dust', sxOf(V, hx), hy, 2, { colors: ['rgba(255,255,255,0.7)'], speed: [8, 30] }); } } else if (a.plant && f < st) a.plant[i] = plantId;
          }
          if (!a.plant) a.plant = [0, 0];
        }
        for (let i = 0; i < 2; i++) {
          const f = feet[i], hpt = hp[i], kn = ik(hpt[0], hpt[1], f[0], f[1], 13 * k, 13 * k, i ? 1 : -1);
          limb(g, hpt[0], hpt[1], kn[0], kn[1], kn[2], kn[3], 5 * k, col, out); shoe(g, kn[2], kn[3], k, 0, '#4cc3ff');
        }
        for (let i = 0; i < 2; i++) {
          const hd = hands[i], s0 = sh[i], el2 = ik(s0[0], s0[1], hd[0], hd[1], 17 * k, 17 * k, i ? -1 : 1);
          limb(g, s0[0], s0[1], el2[0], el2[1], el2[2], el2[3], 4.6 * k, col, out);
          g.fillStyle = col; g.strokeStyle = out; g.lineWidth = 1.6 * k; g.beginPath(); g.arc(el2[2], el2[3], 4 * k, 0, TAU); g.fill(); g.stroke();
        }
      }
      function drawSwim(g, a, V, B, t) {
        const k = V.k, sz = B.sz, cx = B.cx, wl = V.ground;
        // wake behind, a bow wave in front, kicks
        const sp = clamp(a.v / 320, 0, 1);
        g.strokeStyle = 'rgba(255,255,255,' + (0.25 + 0.5 * sp).toFixed(2) + ')'; g.lineWidth = 2.2 * k; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const len = (30 + i * 22) * k * (0.4 + sp), yy = wl + (i - 1) * 5 * k; g.beginPath(); g.moveTo(cx - sz * 0.35, wl + (i - 1) * 2 * k); g.quadraticCurveTo(cx - sz * 0.35 - len * 0.5, yy + (i - 1) * 4 * k, cx - sz * 0.35 - len, yy + (i - 1) * 7 * k); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.ellipse(cx + sz * 0.42, wl + 2 * k, 8 * k * (0.5 + sp), 3 * k, 0, 0, TAU); g.fill();
        if (a.state === 'run' && !a.air) {
          const lam = strideOf(a), n = a.s / lam, ph = Math.floor(n * 2);
          if (a.plant == null) a.plant = [ph, 0];
          if (ph !== a.plant[0]) { a.plant[0] = ph; if (V.id !== 'VA' || G.split) { if (a === ath || G.split) SFX.step(a); P.emit('drop', cx + (ph % 2 ? sz * 0.36 : -sz * 0.4), wl - 2 * k, 4, { colors: ['rgba(220,245,255,0.9)'], speed: [40, 110], angle: -Math.PI / 2, spread: 1.1 }); } }
          // kick foam behind
          g.fillStyle = 'rgba(255,255,255,0.55)'; for (let i = 0; i < 4; i++) { const ph2 = (n * 3 + i * 0.25) % 1; g.beginPath(); g.arc(cx - sz * 0.5 - ph2 * 26 * k, wl - 1 * k + Math.sin(ph2 * 9) * 2 * k, (3.5 - ph2 * 2.4) * k, 0, TAU); g.fill(); }
        }
      }

      /* ---------------- the sergeant (drawn, not a bubble character) ---------------- */
      function drawSarge(g, V) {
        const sg = G.sarge, k = V.k * (V.band ? 0.82 : sg.front ? 0.98 : 0.9), soft = sg.soft;
        const feetY = sg.front ? V.y0 + V.h - 5 : SP.id === 'wall' ? V.y0 + V.h - 3 : V.trackTop + 1, x = sg.x;
        // knee-deep in the shallow end for the pool's lap of honour
        if (sg.front && SP.id === 'pool') { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; for (let i = 0; i < 2; i++) { const ph = ((now() / 900) + i * 0.5) % 1; g.globalAlpha = 1 - ph; g.beginPath(); g.ellipse(x, feetY - 2, (26 + ph * 26) * k, (5 + ph * 4) * k, 0, 0, TAU); g.stroke(); } g.globalAlpha = 1; }
        const go = sg.moving || sg.jog, hop = Math.abs(Math.sin(sg.walk)) * (sg.moving ? 6 : sg.jog ? 3 : 0) * k + sg.hop * k;
        g.save(); g.translate(x, feetY - hop); g.scale(k * (sg.dir || 1), k);
        const b = sg.bark, sq = 1 + 0.07 * b;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, hop / k, 30, 6, 0, 0, TAU); g.fill();
        const stp = go ? Math.sin(sg.walk) * 5 : 0;
        g.fillStyle = '#4e5629'; g.fillRect(-15 + stp, -24, 11, 17); g.fillRect(5 - stp, -24, 11, 17);
        g.fillStyle = '#1b1a19'; rr(g, -23 + stp, -11, 22, 11, 4); g.fill(); rr(g, 2 - stp, -11, 22, 11, 4); g.fill();
        g.save(); g.translate(0, -56); g.scale(1 / Math.sqrt(sq), sq);
        // body: an egg in uniform, with a face
        g.save(); g.beginPath(); g.ellipse(0, 0, 33, 39, 0, 0, TAU); g.clip();
        g.fillStyle = mixHex('#e7a873', '#f0b98a', soft); g.fillRect(-40, -45, 80, 90);
        const shirtY = 6; g.fillStyle = '#66702f'; g.fillRect(-40, shirtY, 80, 50);
        g.fillStyle = '#7c8838'; g.beginPath(); g.moveTo(-14, shirtY); g.lineTo(0, shirtY + 12); g.lineTo(14, shirtY); g.closePath(); g.fill();
        g.fillStyle = '#e7a873'; g.beginPath(); g.moveTo(-7, shirtY); g.lineTo(0, shirtY + 7); g.lineTo(7, shirtY); g.closePath(); g.fill();
        g.fillStyle = '#d9b44a'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-31, shirtY + 10 + i * 6); g.lineTo(-25, shirtY + 6 + i * 6); g.lineTo(-19, shirtY + 10 + i * 6); g.lineTo(-19, shirtY + 13 + i * 6); g.lineTo(-25, shirtY + 9 + i * 6); g.lineTo(-31, shirtY + 13 + i * 6); g.closePath(); g.fill(); }
        g.fillStyle = '#2d2a20'; g.fillRect(-40, shirtY + 26, 80, 6); g.fillStyle = '#d9b44a'; g.fillRect(-4, shirtY + 25, 8, 8);
        g.restore();
        g.strokeStyle = 'rgba(60,30,10,0.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 33, 39, 0, 0, TAU); g.stroke();
        // eyes, brows
        const ey = -14, lk = 2.5;
        [[-9, ey], [11, ey]].forEach(([ex, eyy]) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, eyy, 5.5, 6.5 - soft * 1.5, 0, 0, TAU); g.fill(); g.fillStyle = '#1b1a19'; g.beginPath(); g.arc(ex + lk, eyy + 1, 2.7, 0, TAU); g.fill(); });
        g.strokeStyle = '#3a2412'; g.lineWidth = 4; g.lineCap = 'round';
        const ang = lerp(1, -0.25, soft);
        g.beginPath(); g.moveTo(-16, ey - 9 - 3 * ang); g.lineTo(-3, ey - 9 + 3 * ang); g.moveTo(4, ey - 9 + 3 * ang); g.lineTo(18, ey - 9 - 3 * ang); g.stroke();
        if (soft > 0.3) { g.fillStyle = 'rgba(255,110,110,' + (0.4 * soft).toFixed(2) + ')'; g.beginPath(); g.ellipse(-17, -3, 5, 3, 0, 0, TAU); g.ellipse(20, -3, 5, 3, 0, 0, TAU); g.fill(); }
        g.fillStyle = '#d98a5f'; g.beginPath(); g.ellipse(2, -5, 4.5, 3.6, 0, 0, TAU); g.fill();
        // mouth, moustache
        if (b > 0.05 && soft < 0.5) { g.fillStyle = '#3a0d0d'; g.beginPath(); g.ellipse(4, 6, 7 + 3 * b, 3 + 6 * b, 0, 0, TAU); g.fill(); }
        else if (soft > 0.5) { g.strokeStyle = '#3a0d0d'; g.lineWidth = 2; g.beginPath(); g.arc(3, 3, 6, 0.3, Math.PI - 0.3); g.stroke(); }
        g.fillStyle = '#4a2a14'; g.beginPath(); g.moveTo(-12, 0); for (let i = 0; i <= 8; i++) { const xx = -12 + i * 3.4; g.lineTo(xx, (i % 2 ? 4 : 1) + Math.abs(i - 4) * 0.4); } g.lineTo(16, -1); g.quadraticCurveTo(3, -6, -12, 0); g.fill();
        // hat (on the head, or in the hand once softened)
        const drawHat = () => { g.fillStyle = '#c79a55'; g.beginPath(); g.ellipse(0, 0, 42, 7, 0, 0, TAU); g.fill(); g.fillStyle = '#6b4a2b'; g.fillRect(-19, -7, 38, 5); g.fillStyle = '#b48845'; g.beginPath(); g.moveTo(-19, -6); g.lineTo(-12, -26); g.lineTo(-4, -22); g.lineTo(0, -30); g.lineTo(4, -22); g.lineTo(12, -26); g.lineTo(19, -6); g.closePath(); g.fill(); g.strokeStyle = 'rgba(80,50,20,0.45)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-6, -8); g.lineTo(-3, -22); g.moveTo(6, -8); g.lineTo(3, -22); g.stroke(); };
        if (soft < 0.5) { g.save(); g.translate(0, -36); g.rotate(-0.05 * b); drawHat(); g.restore(); }
        else {
          // hat off, held in both hands in front: the critic, humbled, still on the team
          g.strokeStyle = '#4a2a14'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-4, -38); g.quadraticCurveTo(-2, -46, 2, -44); g.moveTo(2, -39); g.quadraticCurveTo(5, -47, 8, -43); g.stroke();
          g.save(); g.translate(2, 27); g.rotate(0.1); g.scale(0.62, 0.62); drawHat(); g.restore();
          g.fillStyle = '#e7a873'; g.strokeStyle = 'rgba(60,30,10,0.4)'; g.lineWidth = 1.2; [[-24, 24], [27, 27]].forEach(([hx, hy]) => { g.beginPath(); g.arc(hx, hy, 5.5, 0, TAU); g.fill(); g.stroke(); });
        }
        // megaphone or whistle
        if (soft < 0.5) {
          g.save(); g.translate(20, 4); g.rotate(-0.08 - 0.06 * b); g.scale(1 + 0.12 * b, 1 + 0.12 * b);
          g.fillStyle = '#d7263d'; g.beginPath(); g.moveTo(0, -6); g.lineTo(34, -17); g.lineTo(34, 17); g.lineTo(0, 6); g.closePath(); g.fill();
          g.fillStyle = '#f4f4f4'; g.beginPath(); g.ellipse(34, 0, 5, 17, 0, 0, TAU); g.fill(); g.fillStyle = '#b01b2f'; g.beginPath(); g.ellipse(34, 0, 3, 13, 0, 0, TAU); g.fill();
          g.fillStyle = '#2b2b2b'; g.fillRect(8, 6, 5, 12);
          g.restore();
          if (b > 0.05) { g.strokeStyle = 'rgba(255,90,79,' + (0.85 * b).toFixed(2) + ')'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { const r = 14 + i * 12 + (1 - b) * 20; g.beginPath(); g.arc(56, 2, r, -0.6, 0.6); g.stroke(); } }
        } else { g.strokeStyle = '#c9ced8'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-8, 8); g.quadraticCurveTo(0, 26, 8, 8); g.stroke(); g.fillStyle = '#c9ced8'; rr(g, -4, 22, 10, 6, 2); g.fill(); }
        g.restore();
        g.restore();
      }

      /* ---------------- physics ---------------- */
      const HJ = { track: 1, pool: 0.55, wall: 0.42 }[SP.id];
      function startJump(a, o, perfect) {
        const J = jumpLen(a) + (perfect ? 16 : 0), clipIt = !perfect && (o.setback || a.C < 0.42);
        a.air = { o, s0: a.s, s1: Math.max(o.s + J * 0.5, a.s + J * 0.6), H: (clipIt ? (o.setback ? 15 : 22) : (50 + 12 * a.C + (perfect ? 16 : 0))) * HJ, clip: clipIt, perfect: !!perfect, hit: false };
        o.passed = true; if (perfect) o.perfect = true;
        if (a.V && (a !== athA || G.split) && !(a === athA && ath.air)) SFX.jump(perfect);
      }
      function stepAth(a, dt) {
        a.C += (a.Ct - a.C) * Math.min(1, dt * 2.4);
        if (G.raceT0 && !a.finished && a.finishS) a.simT += dt;
        if (a.state === 'run') {
          const vT = vOf(a.C) * (1 + 0.14 * a.boost) * (a.slowUntil > now() ? 0.6 : 1);
          a.v += (vT - a.v) * Math.min(1, dt * 2.8);
          a.s += a.v * dt;
          a.boost = Math.max(0, a.boost - dt * 0.9);
          if (!a.air && a.y < 0) a.y = Math.min(0, a.y + dt * 160);
          if (!a.air) {
            const o = nextObs(a);
            if (o && !o.passed) {
              const D = takeoffD(a); o.D = D;
              if (a.mirror && a.mirror[o.i] != null && a.s >= o.s - D - a.mirror[o.i]) startJump(a, o, true);
              else if (a.s >= o.s - D) startJump(a, o, false);
            }
          }
          if (a.air) {
            const ai = a.air, u = (a.s - ai.s0) / (ai.s1 - ai.s0);
            if (ai.clip && !ai.hit && a.s >= ai.o.s - 4) { ai.hit = true; hitObs(a, ai.o); if (a.state !== 'run') return; }
            if (u >= 1) { a.air = null; a.y = 0; if (ai.perfect) a.boost = 1; if (a.V && (a !== athA || G.split)) SFX.land(); if (SP.id !== 'pool' && a.V) P.emit('dust', a.B ? a.B.cx : 0, a.V.ground, 4, { colors: ['rgba(220,200,190,0.4)'], speed: [20, 60], angle: -Math.PI / 2, spread: 2 }); }
            else a.y = -ai.H * Math.sin(Math.PI * clamp(u, 0, 1));
          }
          if (a.finishS && !a.finished && a.s >= a.finishS) { a.finished = true; a.time = a.simT * RACE_K; }
        } else if (a.state === 'tumble') {
          a.tt += dt; const u = clamp(a.tt / 0.8, 0, 1);
          a.v *= Math.pow(0.08, dt); a.s += a.v * dt;
          if (SP.id === 'track') { a.y = -28 * Math.sin(Math.PI * Math.min(1, u * 1.1)); a.rot = reduced() ? 10 * u : 360 * sstep(0, 0.85, u) + 8; }
          else if (SP.id === 'pool') { a.y = 8 * Math.sin(Math.PI * u); a.rot = (reduced() ? 6 : 22) * Math.sin(u * Math.PI * 3) * (1 - u); }
          else { a.fallV += 900 * dt; a.down = Math.min(38, (a.down || 0) + a.fallV * dt); if (a.down >= 38 && !a.caught) { a.caught = true; a.fallV = -160; if (a.V && (a !== athA || G.split)) A.ctx && A.thud({ vol: 0.14 }); } a.rot = 6 * Math.sin(a.tt * 8) * (1 - u); }
          if (u >= 1) { a.state = 'down'; a.dt0 = now(); a.v = 0; a.y = 0; if (SP.id === 'track') a.rot = 4; if (SP.id === 'wall') a.down = 36; }
        } else if (a.state === 'down') {
          if (SP.id === 'pool') { a.y = 3 * Math.sin(now() / 300); a.rot = 6 * Math.sin(now() / 420); }
          if (SP.id === 'wall') { a.rot = 6 * Math.sin(now() / 380); }
          if (a.recoverAt && now() >= a.recoverAt) { a.state = 'rise'; a.rise = 0; a.recoverAt = 0; }
        } else if (a.state === 'rise') {
          a.rise = Math.min(1, a.rise + dt / 0.5); a.rot = lerp(a.rot, 0, a.rise); a.y = 0;
          if (a.rise >= 1) { a.state = 'run'; a.down = 0; a.v = vOf(a.C) * 0.5; }
        } else if (a.state === 'idle') {
          a.v = 0;
        }
        if (a.state === 'run' && a.boost > 0.6 && a.B && !reduced() && Math.random() < 0.4) P.emit('star', a.B.cx - a.B.sz * 0.4, a.B.top + a.B.sz * Math.random(), 1, { colors: ['#ffe58a', '#ffffff'], speed: [20, 60] });
      }
      function hitObs(a, o) {
        o.fall = 0.001; o.hitT = now();
        const vis = a === ath || G.split;
        if (o.setback) {
          a.state = 'tumble'; a.tt = 0; a.air = null; a.fallV = 0; a.caught = false; a.down = 0;
          if (a === ath) { SFX.crash(); G.shake = reduced() ? 0 : 1; SFX.ooh(); if (!G.split) { G.tsT = reduced() ? 1 : 0.32; S.later(() => { G.tsT = 1; }, 900); } }
          if (a.B && vis) P.emit(SP.id === 'pool' ? 'drop' : 'dust', a.B.cx + 10, (a.V || V1).ground - 4, 14, { colors: SP.id === 'pool' ? ['rgba(220,245,255,0.95)'] : ['rgba(220,200,190,0.55)'], speed: [40, 160], angle: -Math.PI / 2, spread: 2.2 });
          a.ch.face(SP.id === 'pool' ? 'surprised' : 'panic', 1200);
        } else {
          a.slowUntil = now() + 420;
          if (vis) { SFX.clip(); if (a === ath && !G.split) G.excite = Math.max(0.15, G.excite - 0.08); }
          a.ch.react('shake');
        }
      }
      // the face follows the voice: tearful, sad, okay, happy, flying
      const MOOD_LADDER = ['worried', 'sad', 'neutral', 'happy', 'speed'], MOOD_AT = [0.2, 0.4, 0.6, 0.8];
      const moodFor = (C) => MOOD_LADDER[MOOD_AT.filter(x => C >= x).length];
      function updateMood(a) {
        if (a.state !== 'run' || G.lockMood) return;
        const m = moodFor(a.C); if (m === a.mood) return;
        const i0 = MOOD_LADDER.indexOf(a.mood), i1 = MOOD_LADDER.indexOf(m);
        if (i0 >= 0 && Math.abs(i0 - i1) === 1 && Math.abs(a.C - MOOD_AT[Math.min(i0, i1)]) < 0.025) return; // hysteresis
        a.mood = m; a.ch.base(m);
      }
      function spawnAhead(a) {
        // keep a steady supply of obstacles while the voice is being rewritten
        let last = a.obs.length ? a.obs[a.obs.length - 1].s : a.s;
        while (last < a.s + 900) { last += 380 + ((a.obs.length * 37) % 60); a.obs.push({ s: last, i: a.obs.length }); }
        a.obs = a.obs.filter(o => o.s > a.s - 700);
      }

      /* ---------------- the board: three magnets ---------------- */
      LANES.forEach((ln, li) => {
        const st = lanes[ln.key];
        const toV = (x) => clamp((x - 23) / Math.max(20, st.railW - 46), 0, 1);
        K.drag(st.rail, {
          start: (p) => { if (!st.open || st.done || G.phase !== 'slide-' + ln.key) return false; st.grab = true; st.lane.classList.add('grab'); st.tv = toV(p.x); st.hold = 0; if (A.ctx) A.pop({ vol: 0.08, freq: 420 + li * 80 }); K.guideDone(); },
          move: (p) => { if (!st.grab) return; st.tv = toV(p.x); },
          end: () => { if (!st.grab) return; st.grab = false; st.lane.classList.remove('grab'); st.tv = Math.round(st.tv * 3) / 3; if (st.tv >= 0.999 && !st.done) lockLane(ln.key); else if (!st.done) laneGuide(ln.key, true); if (chalk) chalk.level(0.0001, 0.05); }
        });
        S.listen(st.rail, 'keydown', (e) => {
          if (!st.open || st.done) return;
          const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
          if (!d) return; e.preventDefault(); st.tv = clamp(Math.round(st.tv * 3 + d) / 3, 0, 1); if (st.tv >= 0.999) S.later(() => lockLane(ln.key), 260);
        });
      });
      function laneGuide(key, again) {
        const st = lanes[key], i = LANES.findIndex(l => l.key === key), w = st.railW - 46;
        K.guide({ id: 'lane-' + key + (again ? '-2' : ''), g: 'drag', target: st.mag, dx: Math.max(60, (1 - st.v) * w * 0.85), dy: 0, label: LANES[i].label, place: i === 2 ? 'above' : 'below', delay: again ? 1600 : 900 });
      }
      function openLane(key) {
        const st = lanes[key]; st.open = true; st.lane.classList.remove('shut'); st.lane.classList.add('open'); st.rail.tabIndex = 0;
        LANES.forEach(l => ROWEL[l.key].row.classList.toggle('live', l.key === key));
        bStep.textContent = (LANES.findIndex(l => l.key === key) + 1) + ' / 3';
        if (A.ctx) { A.click({ vol: 0.1 }); A.tone({ type: 'sine', freq: 520, to: 780, glide: 0.12, dur: 0.18, vol: 0.05 }); }
      }
      function lockLane(key) {
        const st = lanes[key]; if (st.done) return;
        st.done = true; st.tv = 1; st.v = 1; st.grab = false; placeMag(st); st.lane.classList.remove('grab', 'open'); st.lane.classList.add('done');
        st.rail.setAttribute('aria-valuenow', '3'); st.rail.setAttribute('aria-valuetext', LANES.find(l => l.key === key).b + ', locked in');
        const stamp = h('span', { class: 'cs-stamp', text: 'Locked in' }); st.lane.append(stamp);
        const ws = wasEl.querySelector('span[data-k="' + key + '"]'); if (ws) ws.classList.add('x');
        SFX.clack(3); if (A.ctx) { A.wood(undefined, 0.2, 0.8); ['E5', 'G5', 'C6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + 0.06 + i * 0.07, vol: 0.05, dur: 1.2 })); }
        S.buzz(18);
        const r = K.rectIn(st.mag); P.emit('star', r.cx, r.cy, 10, { colors: [LANES.find(l => l.key === key).col, '#ffffff'], speed: [40, 140] });
        K.pop('Locked in', { x: r.cx - 40, y: r.cy - 34, kind: 'great' });
        SFX.cheer(0.8); G.excite = Math.min(1, G.excite + 0.25);
        ctx.track('lock', { k: LANES.findIndex(l => l.key === key) });
        if (chalk) chalk.level(0.0001, 0.05);
      }
      function laneStep(dt) {
        LANES.forEach((ln, li) => {
          const st = lanes[ln.key]; if (!st.open) return;
          const prev = st.v;
          if (st.grab) { const det = Math.round(st.tv * 3) / 3; const pulled = Math.abs(det - st.tv) < 0.07 ? st.tv + (det - st.tv) * 0.45 : st.tv; st.v += (pulled - st.v) * Math.min(1, dt * 22); }
          else st.v += (st.tv - st.v) * Math.min(1, dt * 14);
          if (Math.abs(st.v - prev) > 0.0004) placeMag(st);
          const lvl = Math.round(st.v * 3);
          if (lvl !== st.lvl) { const up = lvl > st.lvl; st.lvl = lvl; setRow(ln.key, lvl); SFX.clack(lvl); st.rail.setAttribute('aria-valuenow', String(lvl)); st.rail.setAttribute('aria-valuetext', [ln.a, 'a little ' + ln.b.toLowerCase(), 'mostly ' + ln.b.toLowerCase(), ln.b][lvl]); onLevel(ln.key, lvl, up); }
          const ic = st.v > 0.5 ? 1 : 0; if (ic !== st.icon) { st.icon = ic; st.mag.innerHTML = ic ? ln.i1 : ln.i0; ROWEL[ln.key].pip.innerHTML = ic ? ln.i1 : ln.i0; }
          if (st.grab && chalk) { const sp = Math.abs(st.v - prev) / Math.max(dt, 0.001); chalk.level(Math.min(0.05, sp * 0.03), 0.04); }
          if (st.grab && st.v >= 0.985) { st.hold += dt; if (st.hold > 0.38) lockLane(ln.key); } else st.hold = 0;
        });
        if (G.phase.indexOf('slide') === 0 || G.phase === 'twistWait') {
          const v = (k) => lanes[k].v;
          ath.Ct = 0.12 + 0.88 * (0.45 * v('tone') + 0.3 * v('spec') + 0.25 * v('next'));
        }
      }
      function onLevel(key, lvl, up) {
        if (!up) return;
        const r = K.rectIn(ROWEL[key].row);
        P.emit('spark', r.x + 14, r.cy, 6, { colors: [LANES.find(l => l.key === key).col, '#ffffff'], speed: [60, 160] });
        if (lvl >= 2 && ath.state === 'run') { ath.ch.react('bounce'); G.excite = Math.min(1, G.excite + 0.08); }
      }

      /* ---------------- the line: whole sentences, flipped in like a scoreboard ---------------- */
      const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=?!';
      function renderParts(R, parts) { R.txt.replaceChildren(...parts.map(p => (p.u ? h('span', { class: 'gk-user', text: p.s }) : document.createTextNode(p.s)))); }
      function setRow(key, lvl, instant) {
        const R = ROWEL[key], parts = rowParts(key, lvl), plain = parts.map(p => p.s).join('');
        R.lvl = lvl; R.row.dataset.l = String(lvl);
        if (instant || reduced()) { R.anim = null; R.plain = plain; renderParts(R, parts); return; }
        R.anim = { from: R.plain || '', to: plain, t0: now(), dur: 240 + Math.min(320, plain.length * 3), parts, last: 0 };
        R.plain = plain;
      }
      function rowsStep() {
        LANES.forEach(ln => {
          const R = ROWEL[ln.key], an2 = R.anim; if (!an2) return;
          const tn = now(), p = clamp((tn - an2.t0) / an2.dur, 0, 1);
          if (p >= 1) { R.anim = null; renderParts(R, an2.parts); return; }
          if (tn - an2.last < 34) return; an2.last = tn;
          const to = an2.to, n = to.length, edge = p * (n + 6);
          let s = '';
          for (let i = 0; i < n; i++) { const c = to[i]; if (i < edge - 6 || c === ' ') s += c; else if (i < edge) s += GLYPHS[(Math.random() * GLYPHS.length) | 0]; else s += i < an2.from.length ? an2.from[i] : ''; }
          R.txt.textContent = s; SFX.flap();
        });
      }

      /* ---------------- frame ---------------- */
      let lastLvl = 0;
      K.loop((dtRaw, t) => {
        const g = cv.g; if (!g || !M.W) return;
        const key = M.W + 'x' + M.H + ':' + Math.min(1.5, cv.dpr || 1) + ':' + (isBright() ? 'b' : 'd');
        if (artKey !== key) buildArt();
        // real time, in small steps: a struggling device still runs the race at the right speed
        const tn = now(), rdt = clamp((tn - (G.lastT || tn)) / 1000, 0, 0.25); G.lastT = tn;
        G.ts += (G.tsT - G.ts) * Math.min(1, rdt * 6);
        laneStep(rdt); rowsStep();
        let rem = rdt * G.ts;
        while (rem > 1e-4) {
          const st = Math.min(1 / 40, rem); rem -= st;
          stepAth(ath, st);
          if (G.split) stepAth(athA, st * G.ff);
          [ath, athA].forEach(a => a.obs.forEach(o => { if (o.fall && o.fall < 1) o.fall = Math.min(1, o.fall + st / 0.32); }));
        }
        if (G.phase.indexOf('slide') === 0 || G.phase === 'twistWait' || G.phase === 'swap') spawnAhead(ath);
        updateMood(ath); if (G.split) updateMood(athA);
        if (G.phase === 'race') ringStep();
        // cameras
        const lead = (a) => clamp(a.v * 0.06, 0, 26);
        if (G.split) { VA.camX += (athA.s + lead(athA) - VA.camX) * Math.min(1, rdt * 7); VB.camX += (ath.s + lead(ath) - VB.camX) * Math.min(1, rdt * 7); }
        else { const target = G.podium && !G.lap ? G.podiumS : ath.s + lead(ath); V1.camX += (target - V1.camX) * Math.min(1, rdt * (G.podium && !G.lap ? 3 : 7)); }
        // sergeant
        const sg = G.sarge;
        if (sg.on) {
          const dx = sg.tx - sg.x, fol = sg.view === 'VA' ? athA : ath;
          sg.moving = Math.abs(dx) > 2; if (sg.moving) sg.dir = dx < 0 ? -1 : 1;
          sg.jog = !sg.moving && fol.state === 'run';
          sg.x += dx * Math.min(1, rdt * 4); sg.walk += rdt * (sg.moving ? 14 : sg.jog ? 6 + 6 * (sg.view === 'VA' ? G.ff : 1) : 0);
          sg.bark = Math.max(0, sg.bark - rdt * 1.6); sg.hop = Math.max(0, sg.hop - rdt * 30);
          if (sg.out && sg.x < -80) { sg.on = false; sg.out = false; }
        }
        G.excite += ((G.exciteT != null ? G.exciteT : 0.25 + 0.5 * ath.C) - G.excite) * Math.min(1, rdt * 0.8);
        if (G.flashes) { G.flashes.forEach(f => { f.t += rdt; }); G.flashes = G.flashes.filter(f => f.t < 0.2); }
        if (G.wave >= 0) { G.wave += rdt * M.W * 0.55; if (G.wave > M.W * 1.3) G.wave = -M.W * 0.3; }
        if (crowd && now() - lastCrowd > 120) { lastCrowd = now(); crowd.level(G.phase === 'intro' ? 0.02 : 0.03 + 0.09 * G.excite, 0.4); }
        if (G.phase.indexOf('slide') === 0 && now() - lastLvl > 400) { lastLvl = now(); music.tempo(Math.round(lerp(92, 116, ath.C))); music.level(lerp(0.18, 0.55, ath.C)); }
        // draw
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        const sh = G.shake > 0.01 ? G.shake : 0; G.shake = Math.max(0, G.shake - rdt * 3);
        g.drawImage(ART.bg.c, 0, 0, M.W, M.H);
        if (sh) { g.save(); g.translate((Math.random() - 0.5) * 8 * sh, (Math.random() - 0.5) * 6 * sh); }
        if (G.split) { drawView(g, VA, athA, t); drawView(g, VB, ath, t); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, VB.y0 - 2, M.W, 3); drawProgress(g); }
        else drawView(g, V1, ath, t);
        if (rockets.length || flashes.length) drawRockets(g, rdt);
        P.update(rdt); P.draw(g);
        if (sh) g.restore();
        g.drawImage(ART.vig.c, 0, 0, M.W, M.vb);
        if (G.flash > 0.01) { if (!reduced()) { g.fillStyle = 'rgba(255,255,255,' + (G.flash * 0.62).toFixed(3) + ')'; g.fillRect(0, 0, M.W, M.vb); } G.flash = Math.max(0, G.flash - rdt * 2.6); } // no flashes with reduced motion
        // DOM athletes and their tag
        if (ath.B) placeAthDom(ath, G.split ? VB : V1, ath.B);
        if (G.split && athA.B) placeAthDom(athA, VA, athA.B);
        if (!tagEl.hidden && G.tagObs) { const o = G.tagObs, x = clamp(sxOf(V1, o.s), 130, M.W - 130); tagEl.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + (V1.ground - 34 * V1.k - V1.sz - 62).toFixed(1) + 'px,0) translateX(-50%)'; }
        if (G.split && G.raceT0 && !G.raceDone) { const tA = athA.finished ? athA.time : athA.simT * RACE_K, tB = ath.finished ? ath.time : ath.simT * RACE_K; if (now() - (G.lastClock || 0) > 45) { G.lastClock = now(); raceA.textContent = fmtT(tA); raceB.textContent = fmtT(tB); } }
      });
      function drawProgress(g) {
        [[VA, athA, '#ff5a4f'], [VB, ath, '#ffc94a']].forEach(([V, a, c]) => {
          if (!a.finishS) return; const y = V.y0 + V.h - 6, x0 = 14, x1 = M.W - 14, p = clamp(a.s / a.finishS, 0, 1);
          g.fillStyle = 'rgba(0,0,0,0.45)'; rr(g, x0, y - 2, x1 - x0, 4, 2); g.fill(); g.fillStyle = c; rr(g, x0, y - 2, (x1 - x0) * p, 4, 2); g.fill();
          g.beginPath(); g.arc(x0 + (x1 - x0) * p, y, 4, 0, TAU); g.fill();
        });
      }
      const fmtT = (s) => { s = Math.max(0, s); return (s < 10 ? '0' : '') + s.toFixed(2); };

      /* ---------------- fireworks: rockets from the boards that burst in open sky, never behind the scoreboard ---------------- */
      const rockets = [], flashes = [], FW = ['#ffc94a', '#ff5a4f', '#4cc3ff', '#7ee36b', '#ffffff', '#ff8fb1'];
      const BOOM = ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'];
      function fireworks(n, gapMs) {
        const sr = G.scrRect, R = Math.random;
        for (let i = 0; i < n; i++) S.later(() => {
          if (!M.W) return;
          let x = 0, y = 0;
          for (let tries = 0; tries < 10; tries++) {
            x = M.W * (0.08 + 0.84 * R()); y = V1.standsTop + 14 + (V1.standsBot - V1.standsTop - 28) * R();
            if (!sr || x < sr.x - 24 || x > sr.x + sr.w + 24 || y > sr.y + sr.h + 20) break;
            if (tries === 9) y = Math.max(y, sr.y + sr.h + 26);
          }
          const c = FW[(i + rockets.length) % FW.length], x0 = x + (R() - 0.5) * 60, dur = 0.55 + R() * 0.25;
          rockets.push({ x0, y0: V1.boardsBot, x1: x, y1: y, t: 0, dur, c, i, trail: [] });
          if (A.ctx) A.tone({ type: 'sine', freq: 520, to: 1600, glide: dur, dur, vol: 0.018, pan: (x / M.W) * 1.4 - 0.7 });
        }, i * (gapMs || 380));
      }
      function drawRockets(g, dt) {
        for (let i = rockets.length - 1; i >= 0; i--) {
          const r = rockets[i]; r.t += dt;
          const k = clamp(r.t / r.dur, 0, 1), e = 1 - Math.pow(1 - k, 2.2), x = lerp(r.x0, r.x1, k), y = lerp(r.y0, r.y1, e);
          r.trail.push(x, y); if (r.trail.length > 14) r.trail.splice(0, 2);
          g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(r.c === '#ffffff' ? '#fff6d0' : r.c, 0.75); g.lineWidth = 2; g.lineCap = 'round';
          g.beginPath(); for (let j = 0; j < r.trail.length; j += 2) { if (j) g.lineTo(r.trail[j], r.trail[j + 1]); else g.moveTo(r.trail[j], r.trail[j + 1]); } g.stroke();
          g.drawImage(K.glowSprite('#fff6d0'), x - 9, y - 9, 18, 18); g.restore();
          if (k >= 1) {
            rockets.splice(i, 1);
            P.emit('spark', r.x1, r.y1, 46, { colors: [r.c, '#fff6d0', r.c], speed: [90, 270] });
            P.emit('star', r.x1, r.y1, 7, { colors: [r.c, '#ffffff'], speed: [40, 120] });
            flashes.push({ x: r.x1, y: r.y1, c: r.c, t: 0 });
            if (A.ctx) {
              const t0 = A.now(), pan = (r.x1 / M.W) * 1.4 - 0.7;
              A.noise({ filter: 'lowpass', freq: 600, dur: 0.6, vol: 0.13, pan }); A.tone({ type: 'sine', freq: 90, to: 45, dur: 0.4, vol: 0.12 });
              A.chime(A.note(BOOM[r.i % BOOM.length]), { vol: 0.06, dur: 1.6, pan });
              for (let j = 0; j < 7; j++) A.noise({ when: t0 + 0.18 + Math.random() * 0.5, filter: 'highpass', freq: 4200 + Math.random() * 2500, dur: 0.018, vol: 0.025 + Math.random() * 0.025, pan });
            }
          }
        }
        for (let i = flashes.length - 1; i >= 0; i--) {
          const f = flashes[i]; f.t += dt; const a = 1 - f.t / 0.45; if (a <= 0) { flashes.splice(i, 1); continue; }
          const s = 40 + f.t * 160;
          g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.8; g.drawImage(K.glowSprite(f.c === '#ffffff' ? '#fff6d0' : f.c), f.x - s, f.y - s, s * 2, s * 2); g.restore();
        }
      }

      /* ---------------- flow helpers ---------------- */
      const waitFor = (fn, ms) => new Promise(res => { const t0 = now(); const tick = () => { if (fn() || (ms && now() - t0 > ms)) res(); else S.later(tick, 50); }; tick(); });
      function screen(top, line) { scrB.textContent = top; scrS.textContent = line; }
      function showGo(label, sub, lab) { goBtn.hidden = false; goBtn.querySelector('b').textContent = label; goBtn.querySelector('small').textContent = sub; goBtn.setAttribute('aria-label', label + '. ' + sub); goLab.hidden = !lab; goLab.textContent = lab || ''; }
      function hideGo() { goBtn.hidden = true; goLab.hidden = true; }
      K.tap(goBtn, () => {
        goBtn.classList.remove('hit'); void goBtn.offsetWidth; goBtn.classList.add('hit');
        if (G.phase === 'ready' || G.phase === 'raceReady') { G.go = true; return; }
        if (G.phase === 'race') tryPerfect();
      });
      K.onKey(['Space'], (e) => { if (G.phase === 'race') { e.preventDefault(); tryPerfect(); } });
      // the take-off window (world units before the gold mark) and the run-up the ring shows
      const WIN = [56, 44, 34][inten], LATE = 8, RUNUP = 260;
      function tryPerfect() {
        const a = ath; G.taps = (G.taps || 0) + 1;
        if (a.state !== 'run' || a.air) { softTap(); return; }
        const o = nextObs(a); if (!o || o.setback) { softTap(); return; }
        // where the athlete is right now (between frames, on a slow device)
        const sNow = a.s + a.v * clamp((now() - (G.lastT || now())) / 1000, 0, 0.25) * G.ts;
        const D = takeoffD(a), d = (o.s - D) - sNow;
        if (d <= WIN && d >= -LATE) {
          startJump(a, o, true); G.perfect++; G.perfectIdx = G.perfectIdx || {}; G.perfectIdx[o.i] = Math.max(0, d);
          athA.mirror = athA.mirror || {}; athA.mirror[o.i] = Math.max(0, d);
          padCount.textContent = G.perfect + ' / ' + G.chances;
          if (A.ctx) { A.chime(A.note(['C6', 'E6', 'G6', 'C7'][Math.min(3, G.perfect - 1)]), { vol: 0.07, dur: 1.2 }); }
          K.pop('Perfect take-off', { x: a.B.cx + 30, y: a.B.top - 14, kind: 'great' });
          P.emit('star', a.B.cx, a.B.bottom, 12, { colors: ['#ffe58a', '#ffffff', '#ffc94a'], speed: [60, 180] });
          G.excite = Math.min(1, G.excite + 0.2); SFX.cheer(0.6); S.buzz(12);
        } else softTap(d > WIN ? 'early' : 'late');
      }
      // the ring round JUMP: it fills on the run-up to each gold mark; tapping inside the gold arc is a perfect take-off
      let ringF = -1, ringHot = false, ringClip = false;
      function ringStep() {
        let f = 0, hot = false, clipN = false;
        const o = nextObs(ath);
        if (o && ath.state === 'run' && !ath.air) {
          const d = (o.s - takeoffD(ath)) - ath.s;
          f = clamp((RUNUP - d) / (RUNUP + LATE), 0, 1) * 100;
          clipN = !!o.setback; hot = !o.setback && d <= WIN && d >= -LATE;
        }
        f = Math.round(f * 2) / 2;
        if (f !== ringF) { ringF = f; ringFill.setAttribute('stroke-dasharray', f + ' 100'); }
        if (hot !== ringHot) { ringHot = hot; goBtn.classList.toggle('hot', hot); if (hot && A.ctx) A.tone({ type: 'sine', freq: 1320, dur: 0.05, vol: 0.025 }); }
        if (clipN !== ringClip) { ringClip = clipN; goBtn.classList.toggle('clipnext', clipN); }
      }
      { const w = (WIN + LATE) / (RUNUP + LATE) * 100; ringWin.setAttribute('stroke-dasharray', w.toFixed(2) + ' 100'); ringWin.setAttribute('stroke-dashoffset', (w - 100).toFixed(2)); }
      function softTap() { if (A.ctx) A.tone({ type: 'triangle', freq: 420, to: 360, dur: 0.08, vol: 0.04 }); if (ath.B) P.emit('dust', ath.B.cx, (G.split ? VB : V1).ground, 2, { colors: ['rgba(255,240,200,0.5)'], speed: [10, 40] }); }
      function doShout(text, user, small) {
        shout.replaceChildren(small ? h('small', { text: small }) : '', user ? h('span', { class: 'gk-user', text: text }) : document.createTextNode(text));
        shout.classList.toggle('long', text.length > 38);
        shout.hidden = false; shout.style.animation = 'none'; void shout.offsetWidth; shout.style.animation = '';
        placeShout(G.sarge.tx, M.phone ? 360 : 560);
        screenEl.classList.add('off');
        G.sarge.bark = 1; G.sarge.hop = 6; SFX.bark(Math.min(10, 4 + Math.round(text.split(/\s+/).length * 0.8))); SFX.whistle(0.28, true);
        G.shake = reduced() ? 0 : 0.5;
      }
      // the shout sits just above the sergeant's hat (its bottom edge is anchored with translate, so the pop-in can scale freely)
      function sargeHeadY() { const V = V1, k = V.k * 0.9, feet = SP.id === 'wall' ? V.y0 + V.h - 3 : V.trackTop + 1; return feet - 124 * k; }
      function placeShout(cx, maxW) {
        const w = Math.min(M.W - 20, maxW); shout.style.maxWidth = w + 'px';
        shout.style.left = clamp(cx - w / 2, 10, M.W - w - 10) + 'px';
        // one measurement when it appears: its top edge never rises into the console's top bar, and its bottom edge stays
        // above the athlete (on the climbing wall the athlete hangs higher than the sergeant's hat)
        const hh = shout.offsetHeight || 80, athTop = ath.B && !G.split ? ath.B.top - 10 : 1e9;
        shout.style.top = Math.max(M.top + 6 + hh, Math.min(sargeHeadY() - 6, athTop)) + 'px'; shout.style.translate = '0 -100%';
      }
      function hideShout() { shout.hidden = true; if (!G.split) screenEl.classList.remove('off'); }
      function sargeIn(view) { const sg = G.sarge, V = view || V1; sg.on = true; sg.out = false; sg.view = V.id; sg.x = -70; sg.tx = M.phone ? Math.max(52, V.ax - M.W * 0.2) : V.ax - M.W * 0.2; SFX.whistle(0.4, true); G.sargeBeat = true; }
      function sargeOut() { const sg = G.sarge; sg.tx = -140; sg.out = true; G.sargeBeat = false; }

      /* ---------------- steps ---------------- */
      async function openingStep() {
        G.phase = 'ready';
        ath.state = 'blocks'; ath.s = 0; ath.C = ath.Ct = 0.62; ath.startS = 0;
        ath.obs = [{ s: 380, i: 0 }, { s: 760, i: 1, setback: true }];
        G.tagObs = ath.obs[1];
        tagEl.replaceChildren(h('small', { text: 'The ' + SP.slip }), WD.tag ? h('span', { class: 'gk-user', text: WD.tag }) : h('span', { text: 'a hard moment' }));
        tagEl.hidden = false;
        showGo('GO', 'Start', 'Tap to start the run');
        sayR({ Jolly: 'Big ' + SP.course + '. Ready when you are!', Cheeky: 'Warm. Ready. Mostly ready.', Unfiltered: 'Ready.' }, 'happy', 3000);
        K.guide({ id: 'go', g: 'tap', target: goBtn, label: 'TAP TO START', place: 'above', oy: 0.1, delay: 900 });
        await waitFor(() => G.go);
        G.go = false; K.guide(null); hideGo();
        SFX.whistle(0.22, false);
        K.pop(SP.id === 'pool' ? 'Splash!' : 'Go!', { x: M.W / 2, y: V1.standsTop + 40, kind: 'great' });
        ath.state = 'run'; ath.v = 60; G.phase = 'run1'; music.level(0.45); SFX.cheer(0.5);
        screen(SP.event, 'Lane 4 · Rush');
        await waitFor(() => ath.state === 'tumble' || ath.state === 'down');
        tagEl.classList.add('gone');
        await waitFor(() => ath.state === 'down');
        G.exciteT = 0.12; music.level(0.18);
        await K.wait(reduced() ? 300 : 550);
        // the drill sergeant arrives and barks the hot thought
        sargeIn(V1);
        rush.base('cry');
        await K.wait(700);
        const bark = WD.thought || L({ Jolly: 'You fell. Of course you fell.', Cheeky: 'Down again? Of course you are.', Unfiltered: 'You fell. Typical.' });
        doShout(bark, !!WD.thought, 'Sarge');
        ctx.track('bark', { words: WD.thought ? 1 : 0 });
        whoEl.className = 'cs-who'; whoEl.textContent = 'Sarge';
        voice.style.setProperty('--cs-vc', '#ff5a4f');
        LANES.forEach((ln, i) => S.later(() => { setRow(ln.key, 0); SFX.clack(0); }, 500 + i * 380));
        wasEl.querySelectorAll('span').forEach(sp => { sp.textContent = rowParts(sp.dataset.k, 0)[0].s; }); wasEl.hidden = false;
        ath.Ct = 0.12; ath.C = 0.2;
        await K.wait(reduced() ? 2200 : 3200);
        hideShout();
        ath.recoverAt = now(); // gets up, slumped
        G.exciteT = null;
        await waitFor(() => ath.state === 'run');
        spawnAhead(ath);
        rush.base('worried'); ath.mood = 'worried';
      }
      async function swapStep() {
        G.phase = 'swap';
        const sub = h('div', { class: 'cs-sub', role: 'status', 'aria-label': 'Substitution: Sarge off, Coach Patch on' }, h('i', { text: 'Substitution' }), h('b', { class: 'o', text: '00' }), h('span', { text: 'Sarge' }), h('b', { class: 'n', text: '07' }), h('span', { text: 'Coach Patch' }));
        sub.style.left = (M.W * (M.phone ? 0.62 : 0.5)) + 'px'; sub.style.top = (V1.standsTop + (M.phone ? 6 : 20)) + 'px';
        el.append(sub);
        SFX.whistle(0.18, false); S.later(() => SFX.whistle(0.18, false), 260); SFX.cheer(0.7);
        if (A.ctx) { A.tone({ type: 'square', freq: 880, dur: 0.12, vol: 0.03, lp: 2400 }); A.tone({ when: A.now() + 0.15, type: 'square', freq: 1320, dur: 0.16, vol: 0.03, lp: 2400 }); }
        await K.wait(reduced() ? 1200 : 1700);
        sargeOut();
        sub.style.transition = 'opacity .4s ease'; sub.style.opacity = '0'; S.later(() => sub.remove(), 450);
        patch.show(true); placeCast(); patch.base('happy'); patch.react('bounce');
        G.boardHidden = false; board.classList.remove('off', 'dim'); if (A.ctx) { A.paper({ vol: 0.08 }); A.wood(undefined, 0.1, 1.1); }
        whoEl.className = 'cs-who coach'; whoEl.textContent = 'Coach Patch'; voice.style.setProperty('--cs-vc', '#ffc94a');
        screen(SP.event, 'Coach: Patch');
        await sayP({ Jolly: 'Coach Patch, reporting! I read the lines. You write them.', Cheeky: 'New coach! I do the talking, you write the script. Deal?', Unfiltered: 'I’m the coach now. You write what I say.' }, 'happy', 2600);
        await K.wait(reduced() ? 900 : 1500);
        sayP({ Jolly: 'Hang on. I am NOT saying that to Rush. Make it kinder?', Cheeky: 'Yikes. I’m not reading that out loud. Kinder, please.', Unfiltered: 'Too harsh. Make it kinder.' }, 'worried', 4200);
      }
      async function sliderStep(key) {
        G.phase = 'slide-' + key;
        openLane(key); laneGuide(key);
        await waitFor(() => lanes[key].done);
        K.guide(null);
        await K.wait(reduced() ? 500 : 900);
        if (key === 'tone') {
          sayR({ Jolly: 'Oh. I can breathe again.', Cheeky: 'Huh. My legs work again.', Unfiltered: 'Better.' }, 'happy', 2200);
          await K.wait(900);
          await sayP({ Jolly: 'Much better. Now be specific: what actually happened?', Cheeky: '“Always”? Really? Name the actual bit.', Unfiltered: 'Now be specific. What happened?' }, 'think', 3600);
        } else if (key === 'spec') {
          await sayP({ Jolly: 'One moment, not a life sentence. Last one: point it forward.', Cheeky: 'One ' + SP.obs + ', not a personality. Now: what’s the next move?', Unfiltered: 'One moment. Now point it forward.' }, 'happy', 3600);
        } else {
          sayR({ Jolly: 'Let’s GO!', Cheeky: 'Somebody stop me!', Unfiltered: 'Go.' }, 'speed', 2000);
          await K.wait(700);
          await sayP({ Jolly: 'Kind. Specific. Forward. That’s how you’d talk to a friend.', Cheeky: 'Kind, specific, forward. Basically how you’d talk to a mate.', Unfiltered: 'Kind. Specific. Forward. Like a friend.' }, 'love', 3000);
        }
      }
      async function twistStep() {
        G.phase = 'twistWait';
        await K.wait(reduced() ? 600 : 1400);
        patch.hush(); rush.hush();
        sargeIn(V1);
        await K.wait(600);
        doShout(L({ Jolly: 'Kindness makes you SOFT!', Cheeky: 'Kindness? That’s how you get SOFT!', Unfiltered: 'Kindness makes you SOFT!' }), false, 'Sarge');
        patch.face('surprised', 1400);
        await K.wait(reduced() ? 1800 : 2400);
        hideShout();
        await sayP({ Jolly: 'Let’s test it, Sarge. Same athlete, same ' + SP.course + ', two voices.', Cheeky: 'Soft? Let’s race it. Same legs, two voices.', Unfiltered: 'Test it. Same legs, two voices.' }, 'wink', 3200);
        await K.wait(400);
        // split screen: run 1 with Sarge's voice, run 2 with yours
        G.flash = 1; if (A.ctx) A.whoosh({ vol: 0.12, dur: 0.4 });
        G.split = true; G.phase = 'raceReady'; patch.hush(); rush.hush(); screenEl.classList.add('off');
        board.classList.add('off'); voice.classList.add('racing'); voice.classList.remove('clamp');
        whoEl.className = 'cs-who none'; whoEl.textContent = 'Race';
        const n = [3, 4, 5][inten], gap = 380, obs = (setIdx) => Array.from({ length: n }, (_, i) => ({ s: 360 + i * gap, i, setback: i === setIdx, mark: i !== setIdx }));
        [ath, athA].forEach(a => { a.obs = obs(1); a.s = 0; a.v = 0; a.state = 'blocks'; a.C = a.Ct = 0.62; a.finished = false; a.finishS = 360 + n * gap - 60; a.startS = 0; a.air = null; a.y = 0; a.rot = 0; a.boost = 0; a.mood = ''; a.plant = null; a.simT = 0; a.down = 0; a.recoverAt = 0; });
        athA.mirror = {}; G.chances = n - 1; padCount.textContent = '0 / ' + G.chances;
        VA.camX = 0; VB.camX = 0;
        rush2.show(true); rush2.base('happy'); rush.base('happy');
        G.sarge.view = 'VA'; G.sarge.x = M.phone ? Math.max(46, VA.ax - M.W * 0.22) : VA.ax - M.W * 0.2; G.sarge.tx = G.sarge.x;
        capA.hidden = false; capB.hidden = false; capA.querySelector('p').textContent = ''; capB.querySelector('p').textContent = '';
        placeCast(); patch.base('happy');
        tagEl.hidden = true;
        pad.hidden = false; placeGo();
        showGo('GO', 'Race', '');
        K.guide({ id: 'race-go', g: 'tap', target: goBtn, label: 'START THE RACE', place: 'above', oy: 0.1, delay: 700 });
      }
      async function raceStep() {
        await waitFor(() => G.go);
        G.go = false; K.guide(null);
        goBtn.querySelector('b').textContent = '…'; goBtn.querySelector('small').textContent = 'Set';
        K.pop('On your marks', { x: M.W / 2, y: VB.y0 + 24, kind: 'soft' });
        if (A.ctx) A.click({ vol: 0.1 });
        await K.wait(reduced() ? 400 : 800);
        K.pop('Set', { x: M.W / 2, y: VB.y0 + 24, kind: 'soft' });
        await K.wait(reduced() ? 400 : 700);
        SFX.pistol(); G.flash = 0.5; SFX.cheer(1);
        G.raceT0 = now(); G.phase = 'race'; G.sargeBeat = false; music.level(0.55); music.tempo(108);
        [ath, athA].forEach(a => { a.state = 'run'; a.v = 80; });
        showGo('JUMP', 'Tap', ''); goBtn.classList.add('timing'); ringF = -1;
        K.guide({ id: 'race-jump', g: 'tap', target: goBtn, label: 'TAP WHEN RING IS GOLD', place: 'above', oy: 0.1, delay: 500 });
        // the setback: both runs clip the same obstacle, then hear different voices
        await waitFor(() => ath.state === 'down' && athA.state === 'down', 15000);
        const pA = capA.querySelector('p'), pB = capB.querySelector('p');
        pA.textContent = rowParts('tone', 0)[0].s; G.sarge.bark = 1; G.sarge.hop = 5; SFX.bark(5); athA.ch.base('worried'); athA.mood = 'worried'; athA.Ct = 0.24;
        pB.textContent = kindLine(); ath.ch.face('happy', 900); ath.Ct = 1;
        athA.recoverAt = now() + (reduced() ? 1200 : 1700); ath.recoverAt = now() + 480;
        await waitFor(() => ath.finished, 20000);
        // a photo finish for run 2
        G.flash = 0.9; SFX.flash(); SFX.cheer(1.2); G.exciteT = 1;
        K.pop('Finish!', { x: M.W * 0.62, y: VB.y0 + 40, kind: 'great' });
        raceB.textContent = fmtT(ath.time); rowB.classList.add('win');
        K.guide(null); hideGo(); goBtn.classList.remove('timing', 'hot', 'clipnext'); pad.hidden = true;
        const resB = h('b', { text: fmtT(ath.time) + ' s' }), resS = h('span', { text: 'Run 2 is home. Run 1 is still out there…' });
        const res = h('div', { class: 'cs-res', role: 'status' }, h('small', { text: 'Photo finish' }), resB, resS);
        Object.assign(res.style, { left: M.bArea.x + 'px', top: M.bArea.y + 'px', width: M.bArea.w + 'px', height: M.bArea.h + 'px' });
        el.append(res); G.resEl = res;
        if (!athA.finished) { G.ff = 3; ffEl.hidden = false; }
        await waitFor(() => athA.finished, 15000);
        G.ff = 1; ffEl.hidden = true; raceA.textContent = fmtT(athA.time); G.raceDone = true;
        const dlt = Math.max(0, athA.time - ath.time);
        resB.textContent = '−' + dlt.toFixed(2) + ' s'; resS.textContent = 'faster with your coach’s voice';
        res.append(h('i', { text: G.perfect ? 'Your ' + G.perfect + ' perfect take-off' + (G.perfect > 1 ? 's were' : ' was') + ' copied into both runs.' : 'Same legs, same take-offs in both runs.' }));
        if (A.ctx) A.wood(undefined, 0.12, 0.6);
        athA.state = 'idle'; ath.state = 'idle';
        ctx.track('race', { a: Math.round(athA.time * 100), b: Math.round(ath.time * 100), p: G.perfect });
      }
      async function resultStep() {
        G.phase = 'result';
        if (A.ctx) ['C5', 'E5', 'G5'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.09, vol: 0.06, dur: 1.4 }));
        await K.wait(600);
        G.sarge.soft = 0.15; capA.querySelector('p').textContent = L({ Jolly: '…Huh. Run that by me again.', Cheeky: '…That can’t be right. Check the clock.', Unfiltered: '…Huh.' });
        athA.ch.base('sad'); ath.ch.base('celebrate');
        await K.wait(reduced() ? 1800 : 2600);
      }
      async function medalStep() {
        G.phase = 'podium';
        G.flash = 1; if (A.ctx) A.whoosh({ vol: 0.1, dur: 0.4 });
        G.split = false; rush2.show(false); capA.hidden = true; capB.hidden = true; screenEl.classList.remove('off');
        voice.classList.remove('racing'); board.classList.add('off');
        if (G.resEl) { const r = G.resEl; r.style.transition = 'opacity .4s ease'; r.style.opacity = '0'; S.later(() => r.remove(), 450); }
        // the podium in the middle of the single view
        G.podium = true; G.podiumS = ath.s + 40; V1.camX = G.podiumS;
        ath.s = G.podiumS; ath.state = 'idle'; ath.C = 1; ath.y = 0; ath.rot = 0;
        G.sarge.view = 'V1'; G.sarge.on = true; G.sarge.x = V1.ax + Math.min(M.W * 0.3, 250 * V1.k); G.sarge.tx = G.sarge.x; G.sarge.dir = -1; G.sarge.soft = 0.2;
        placeCast(); patch.base('happy');
        // the final line: all three rows at their best, at full height
        G.finaleLine = true; voice.classList.remove('clamp'); LANES.forEach(l => { ROWEL[l.key].row.classList.remove('live'); setRow(l.key, 3, true); });
        whoEl.className = 'cs-who coach'; whoEl.textContent = 'Coach Patch';
        // on a phone the line takes the room it needs and the ceremony sits under it (one measurement, not per frame)
        const C0 = { x: M.bArea.x, y: M.bArea.y, w: M.bArea.w, h: M.bArea.h };
        if (M.phone) {
          voice.style.height = 'auto';
          const top = M.vb + 8, maxV = (M.H - 14) - 196 - 8 - top;
          let vh = voice.offsetHeight; if (vh > maxV) { voice.classList.add('clamp3'); vh = Math.min(maxV, voice.offsetHeight); voice.style.height = vh + 'px'; }
          C0.y = top + vh + 8; C0.h = (M.H - 14) - C0.y;
        }
        G.cereRect = C0;
        // the results card takes the photo-finish card's place straight away (the times stay on it to the end)
        const chip = (lab, t, col, win) => h('div', { class: 'cs-tchip' + (win ? ' win' : ''), style: { '--c': col } }, h('small', { text: lab }), h('b', { text: fmtT(t) + ' s' }));
        const cereHead = h('b', { text: 'Results · ' + SP.event });
        const cere = h('div', { class: 'cs-cere' }, cereHead, h('div', { class: 'cs-tchips' }, chip('With Sarge', athA.time, '#ff5a4f'), chip('With your coach', ath.time, '#ffc94a', true)));
        Object.assign(cere.style, { left: C0.x + 'px', top: C0.y + 'px', width: C0.w + 'px', height: C0.h + 'px' });
        el.append(cere); G.cere = cere; G.cereHead = cereHead;
        screen('Results', 'Gold · Rush · ' + fmtT(ath.time) + ' s');
        G.exciteT = 0.7;
        await K.wait(500);
        K.anim(900, (k) => { G.sarge.soft = lerp(0.2, 1, k); });
        const sgLine = L({ Jolly: 'I only shouted because I wanted you to do well.', Cheeky: 'I just… really wanted you to win, okay?', Unfiltered: 'I wanted you to try hard.' });
        shout.replaceChildren(h('small', { text: 'Sarge, quietly' }), document.createTextNode(sgLine)); shout.hidden = false; shout.classList.remove('long'); shout.classList.add('quiet');
        placeShout(G.sarge.x, M.phone ? 300 : 460); screenEl.classList.add('off');
        if (A.ctx) A.tone({ type: 'sine', freq: 220, to: 180, dur: 0.6, vol: 0.05 });
        await K.wait(reduced() ? 1800 : 2600);
        hideShout(); shout.classList.remove('quiet');
        await sayP({ Jolly: 'Same team, Sarge. Let me do the talking.', Cheeky: 'We want the same thing, Sarge. I’ve just got better lines.', Unfiltered: 'Same goal, Sarge. Kinder voice.' }, 'hug', 2600);
        // the ceremony
        G.phase = 'medal';
        cereHead.textContent = 'Medal ceremony';
        const ss = M.phone ? 62 : 84; still.el.style.setProperty('--sz', ss + 'px'); still.place(C0.x + 12, C0.y + 34);
        still.show(true); still.base('happy');
        const medalIn = h('i'), medal = h('div', { class: 'cs-medal', role: 'button', 'aria-label': 'Gold medal. Drag it onto Rush.' }, medalIn);
        const mx0 = M.phone ? C0.x + C0.w - 80 : C0.x + C0.w - 110, my0 = C0.y + (M.phone ? 22 : 30);
        Object.assign(medal.style, { left: mx0 + 'px', top: my0 + 'px' });
        el.append(medal); G.medalEl = medal; G.medalHome = { x: mx0, y: my0 };
        sayS({ Jolly: 'Gold for Rush. Hang it on them!', Cheeky: 'Gold for Rush. And a tiny one for whoever wrote the script.', Unfiltered: 'Gold. Hang it on them.' }, 'happy', 4200);
        const target = () => ({ x: ath.B.cx, y: ath.B.bottom });
        let st = null;
        K.drag(medal, {
          space: el,
          start: (p) => { if (G.medal) return false; const r = K.rectIn(medal); st = { ox: p.x - r.x, oy: p.y - r.y }; medal.classList.remove('home'); medal.classList.add('lift'); if (A.ctx) A.chime(A.note('A6'), { vol: 0.03, dur: 0.5 }); },
          move: (p, d) => { if (!st) return; medal.style.left = (p.x - st.ox) + 'px'; medal.style.top = (p.y - st.oy) + 'px'; medalIn.style.rotate = clamp(-d.vx * 0.02, -18, 18).toFixed(1) + 'deg'; if (now() - (G.gd || 0) > 400) { G.gd = now(); K.guideDone(); } },
          end: () => {
            if (!st) return; st = null; medal.classList.remove('lift'); medalIn.style.rotate = '';
            const r = K.rectIn(medal), tp = target(), d = Math.hypot(r.cx - tp.x, r.cy - tp.y);
            if (d < Math.max(90, V1.sz)) placeMedal();
            else { medal.classList.add('home'); medal.style.left = G.medalHome.x + 'px'; medal.style.top = G.medalHome.y + 'px'; if (A.ctx) A.tone({ type: 'triangle', freq: 300, to: 220, dur: 0.15, vol: 0.05 }); medalGuide(); }
          }
        });
        medalGuide();
        await waitFor(() => G.medal);
      }
      function medalGuide() {
        const m = G.medalEl; if (!m || G.medal) return;
        const r = K.rectIn(m), tp = { x: ath.B.cx, y: ath.B.bottom };
        K.guide({ id: 'medal', g: 'drag', target: m, dx: tp.x - r.cx, dy: tp.y - r.cy, label: 'DRAG THE MEDAL ON', delay: 900 });
      }
      function placeMedal() {
        if (G.medal) return; G.medal = true; K.guide(null);
        G.medalEl.remove(); G.medalOn = true;
        if (A.ctx) { A.chime(A.note('C7'), { vol: 0.08, dur: 1.4 }); A.chime(A.note('G6'), { when: A.now() + 0.05, vol: 0.06, dur: 1.2 }); }
        SFX.fanfare(); SFX.cheer(1.3); S.buzz([20, 40, 20]);
        rush.base('celebrate'); rush.react('bounce');
        P.emit('confetti', ath.B.cx, ath.B.top, 40, { angle: -Math.PI / 2, spread: 1.4, colors: ['#ffc94a', '#ff5a4f', '#4cc3ff', '#7ee36b', '#ffffff'] });
        G.flash = reduced() ? 0 : 0.35; G.exciteT = 1;
        // confetti cannons from both ends of the track, then rockets over the stands
        P.emit('confetti', 10, V1.ground - 12, 34, { angle: -Math.PI * 0.3, spread: 0.45, speed: [320, 560], colors: FW });
        P.emit('confetti', M.W - 10, V1.ground - 12, 34, { angle: -Math.PI * 0.7, spread: 0.45, speed: [320, 560], colors: FW });
        if (A.ctx) { A.noise({ filter: 'lowpass', freq: 1200, dur: 0.25, vol: 0.12 }); A.pad(['C4', 'E4', 'G4', 'C5'].map(n => A.note(n)), { dur: 4.4, vol: 0.14, attack: 0.5 }); }
        G.scrRect = K.rectIn(screenEl);
        fireworks([4, 6, 8][inten], 360);
        ctx.track('medal', {});
      }
      async function finale() {
        G.phase = 'finale';
        still.hush(); patch.hush();
        still.show(false);
        // the ceremony card becomes the final times
        if (G.cereHead) { G.cereHead.textContent = 'Final times · ' + SP.event; G.cere.classList.add('fin'); }
        // Patch comes down to the sideline (under the card's title); the big screen gets the whole top of the stadium
        { const C0 = G.cereRect || M.bArea, ps = M.phone ? 56 : 80; patch.el.style.setProperty('--sz', ps + 'px'); patch.place(C0.x + 12, C0.y + 34); patch.side('right'); }
        // the sergeant, hat in hands, comes down onto the near lane to watch the lap (in front of the stands, under the screen)
        G.sarge.front = true; G.sarge.x = M.W * (M.phone ? 0.8 : 0.82); G.sarge.tx = G.sarge.x; G.sarge.dir = -1;
        // the stadium board shows the new coach's line: on a phone the voice panel itself lights up as the board (so the
        // stands, the wave and the fireworks stay in view); on a desktop the big screen above the stands carries it
        if (M.phone) {
          voice.classList.add('stadium'); vheadSmall.textContent = 'Your new coach says';
          screenEl.classList.remove('off'); screen('Results', 'Gold · Rush · ' + fmtT(ath.time) + ' s');
        } else {
          screenEl.classList.add('big'); screenEl.classList.remove('off');
          screenEl.style.width = '600px';
          const nextTxt = rowParts('next', 3).map(p => p.s).join('');
          // what you'd tell a friend is the coach's best line (only when the reading weighed the facts, or the worry is light)
          const useFriend = !!WD.friend && (an.source === 'ai' || (WD.sup === 'weak' && !WD.care && !WD.own && !WD.blame));
          scrB.textContent = useFriend ? 'Your coach, like a friend would say it' : 'Your new coach says'; scrS.textContent = useFriend ? WD.friend : kindLine();
          let em = screenEl.querySelector('em'); if (!em) { em = h('em'); screenEl.append(em); } em.textContent = nextTxt;
        }
        G.scrRect = K.rectIn(screenEl);
        G.exciteT = 1; G.wave = 0; music.level(0.6); music.tempo(112);
        sayP({ Jolly: 'Same legs. New voice. Look at them go!', Cheeky: 'Kindness: surprisingly fast.', Unfiltered: 'New voice. Faster legs.' }, 'love', 3400);
        await K.wait(reduced() ? 600 : 1300);
        if (A.ctx) A.pad(['G4', 'C5', 'E5', 'G5'].map(n => A.note(n)), { dur: 5, vol: 0.13, attack: 0.6 });
        fireworks([3, 5, 7][inten], 520);
        // a slow-motion victory lap (the podium stays where it was and slides away behind)
        G.lap = true; G.tsT = reduced() ? 1 : 0.42;
        ath.state = 'run'; ath.C = ath.Ct = 1; ath.v = 120; ath.obs = []; ath.finishS = 0; ath.mood = ''; ath.y = SP.id === 'track' ? -28 : 0;
        if (SP.id === 'pool' && ath.B) P.emit('drop', ath.B.cx, V1.ground, 18, { colors: ['rgba(220,245,255,0.95)'], speed: [60, 180], angle: -Math.PI / 2, spread: 1.4 });
        for (let i = 0; i < (reduced() ? 2 : 5); i++) { S.later(() => P.emit('confetti', Math.random() * M.W, V1.standsTop, 18, { angle: Math.PI / 2, spread: 0.9, speed: [40, 140], colors: ['#ffc94a', '#ff5a4f', '#4cc3ff', '#7ee36b', '#ffffff'] }), i * 500); }
        await K.wait(reduced() ? 2400 : 4600);
        G.tsT = 1;
        if (TOMORROW.id !== SP.id) sayP({ Jolly: 'Tomorrow ' + TOMORROW.place + ' is open. Same coach.', Cheeky: 'Tomorrow: ' + TOMORROW.place + '. Bring the script.', Unfiltered: 'Tomorrow: ' + TOMORROW.place + '.' }, 'wink', 3000);
        await K.wait(reduced() ? 1200 : 2200);
        finish();
      }
      function finish() {
        if (G.done) return; G.done = true; G.phase = 'done';
        const tB = Math.round(ath.time * 100) / 100, tA = Math.round(athA.time * 100) / 100;
        const best = K.best('time-' + SP.id, tB, 'lower');
        const ratio = G.chances ? G.perfect / G.chances : 0, tier = K.tier(ratio, [0.3, 0.6, 0.99]);
        const badges = [best.isNew ? 'New best: ' + fmtT(tB) + ' s (' + SP.name + ')' : SP.name + ': ' + fmtT(tB) + ' s'];
        badges.push(tier ? tier + ' take-offs (' + G.perfect + '/' + G.chances + ')' : 'Perfect take-offs: ' + G.perfect + '/' + G.chances);
        if (usesPlaybook()) { const got = K.collect('line:' + PBI), n = K.collection().filter(x => x.indexOf('line:') === 0).length; badges.push((got.isNew ? 'Collected: ' : 'Playbook: ') + '“' + PLAYBOOK[PBI] + '” (' + Math.min(n, PLAYBOOK.length) + '/' + PLAYBOOK.length + ')'); }
        const gotS = K.collect('sport:' + SP.id); if (gotS.isNew && visits > 0) badges.push('New venue: ' + SP.name);
        ctx.finish({
          title: 'Coach hired', mood: 'celebrate',
          lines: ['With Sarge: ' + fmtT(tA) + ' s. With your coach: ' + fmtT(tB) + ' s.', 'Same legs, same ' + SP.course + '. Only the voice changed.', WD.care ? 'Kind, specific, forward, and ask someone qualified' : 'Kind, specific, forward: that’s a coach'],
          share: 'Fired my drill-sergeant inner voice. Hired a coach. ' + Math.max(0, tA - tB).toFixed(1) + ' s faster.',
          badges: badges.slice(0, 4)
        });
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => layout());
      S.on('theme', () => { el.classList.toggle('cs-bright', isBright()); artKey = ''; });
      if (ctx.analysisReady && typeof ctx.analysisReady.then === 'function') ctx.analysisReady.then((a) => { if (a && typeof a === 'object' && (G.phase === 'intro' || G.phase === 'ready')) { an = a; readWords(); if (G.phase === 'ready') tagEl.replaceChildren(h('small', { text: 'The ' + SP.slip }), WD.tag ? h('span', { class: 'gk-user', text: WD.tag }) : h('span', { text: 'a hard moment' })); } }, () => {});
      LANES.forEach(l => setRow(l.key, 0, true));
      LANES.forEach(l => { ROWEL[l.key].txt.textContent = '· · ·'; ROWEL[l.key].plain = ''; ROWEL[l.key].row.dataset.l = '2'; });
      (async () => {
        await K.intro({ title: 'Coach Swap', sub: 'The voice in your head is a drill sergeant. Your athlete hears every word.', how: 'Slide the magnets to rewrite the voice. Then race it both ways.', char: 'rush', mood: 'determined' });
        G.t0 = now();
        await openingStep();
        await swapStep();
        await sliderStep('tone');
        await sliderStep('spec');
        await sliderStep('next');
        await twistStep();
        await raceStep();
        await resultStep();
        await medalStep();
        await finale();
      })();

      return {
        async autoplay() {
          const wait = async (fn, ms) => { const t0 = now(); while (!fn() && now() - t0 < (ms || 30000)) await K.wait(60); };
          await wait(() => G.phase === 'ready');
          await K.wait(900);
          await K.sim.tap(goBtn);
          for (const key of ['tone', 'spec', 'next']) {
            await wait(() => G.phase === 'slide-' + key, 40000);
            await K.wait(1100);
            const st = lanes[key], w = st.railW;
            const s = await K.sim.press(st.rail, 23, 23);
            for (let i = 1; i <= 16; i++) { s.move(23 + (w - 46) * i / 16, 23); await K.wait(70); }
            await wait(() => st.done, 2500);
            s.up(w - 23, 23);
            await wait(() => st.done, 4000);
            if (!st.done) lockLane(key);
          }
          await wait(() => G.phase === 'raceReady', 40000);
          await K.wait(900);
          await K.sim.tap(goBtn);
          await wait(() => G.phase === 'race', 8000);
          while (G.phase === 'race' && !ath.finished) {
            const o = nextObs(ath);
            if (o && !o.setback && ath.state === 'run' && !ath.air) {
              const sNow = ath.s + ath.v * clamp((now() - (G.lastT || now())) / 1000, 0, 0.25) * G.ts, d = (o.s - takeoffD(ath)) - sNow;
              if (d <= 24 && d >= 2) { await K.sim.tap(goBtn); await K.wait(120); continue; }
            }
            await K.wait(12);
          }
          await wait(() => G.phase === 'medal' && G.medalEl, 40000);
          await K.wait(900);
          { const m = G.medalEl, r = K.rectIn(m), tp = { x: ath.B.cx, y: ath.B.bottom }; await K.sim.drag(m, { x: r.w / 2, y: r.h / 2 }, { x: r.w / 2 + (tp.x - r.cx), y: r.h / 2 + (tp.y - r.cy) }, 900, 18); }
          await wait(() => G.done, 40000);
        }
      };
    }
  });
})(window.TSG_ENV);
