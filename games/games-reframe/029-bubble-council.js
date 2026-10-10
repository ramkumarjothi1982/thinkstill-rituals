/* 029 Bubble Council — Reframe · REFRAME · Social / Team / Perspective
 * Mechanism: perspective-taking, the cognitive-therapy question "what would someone else say?" (Beck 1976; Padesky 1993
 * on Socratic questioning). Hearing several distinct, fair views on the same facts loosens a single scary story
 * (cognitive flexibility), while the feared story is still heard rather than pushed away (suppression backfires; Wegner
 * 1987). The player deals their case onto a round table and spins the lazy Susan; it clicks into place at one of the
 * seven bubbles, who hands over one card from their speciality, built from the reading of the player's own words: rival
 * explanations, a friend's view, the open question, a steadying step, a next step. Keep the cards you agree with.
 * Honest: when the facts back the worry the council says so and votes for a plan; for health, money, housing or legal
 * worries it points to proper advice. The council's votes are opinions from cartoon characters, never statistics.
 * Verb: spin (circle the lazy Susan; it clicks into place at a member), deal (drag the case card onto the table), stack
 * (drag each card to your stack or set it aside), cast (drag your token into a bowl), hold (press the wax seal).
 * Twist: Loopie grabs the Susan out of turn and argues for the scary story; the council doesn't silence it: it gets one
 * seat out of seven.
 * Finale: the council votes with glowing tokens that arc into two ballot bowls, the candles blaze, a ring of seven lights
 * circles the table, and the verdict prints with the fair thought and a next step; you press the wax seal.
 */
(function (env) {
  'use strict';

  /* ---------------- the council: seats run clockwise from your left; seat 0 (the bottom) is the chair: you ---------------- */
  const MEMBERS = [
    { slug: 'patch', name: 'Patch', role: 'People', col: '#ff8a3d', seat: 1, voice: 600, titles: ['The Good Friend', 'The Peacemaker', 'The Kind Word'], talk: 'hug', glyph: 'heart' },
    { slug: 'drop', name: 'Drop', role: 'Meaning', col: '#4aa8ff', seat: 2, voice: 500, titles: ['The Deep Diver', 'The Meaning-Maker', 'The Poet'], talk: 'think', glyph: 'drop' },
    { slug: 'rush', name: 'Rush', role: 'Action', col: '#ff4d6a', seat: 3, voice: 880, titles: ['The Doer', 'The Sprinter', 'The Next Step'], talk: 'determined', glyph: 'bolt' },
    { slug: 'glitch', name: 'Glitch', role: 'Logic', col: '#3ff0c0', seat: 4, voice: 760, titles: ['The Detective', 'The Fact-Checker', 'The Logician'], talk: 'scan', glyph: 'lens' },
    { slug: 'still', name: 'Still', role: 'Calm', col: '#bfe6ff', seat: 5, voice: 360, titles: ['The Anchor', 'The Slow Breath', 'The Calm'], talk: 'meditate', glyph: 'moon' },
    { slug: 'sync', name: 'Sync', role: 'Feelings', col: '#ffd84a', seat: 6, voice: 680, titles: ['The Weather Report', 'The Heartbeat', 'The Feeler'], talk: 'idea', glyph: 'pulse' },
    { slug: 'loopie', name: 'Loopie', role: 'The loop', col: '#d04bff', seat: 7, voice: 440, titles: ['The What-If', 'The Replay', 'The Loop'], talk: 'determined', glyph: 'spiral' }
  ];
  const GLYPH = {
    heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 2.5c0 5.8-7.5 10.4-7.5 10.4z" fill="currentColor"/><path d="M8.2 11.4l1.8 1.8M14 11.4l1.8 1.8" stroke="#fff6e4" stroke-width="1.5" stroke-linecap="round"/>',
    drop: '<path d="M12 2.8c3.6 4.7 6.3 8 6.3 11.4a6.3 6.3 0 0 1-12.6 0C5.7 10.8 8.4 7.5 12 2.8z" fill="currentColor"/><path d="M9.2 14.6a3 3 0 0 0 2.6 2.7" stroke="#fff6e4" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    bolt: '<path d="M13.5 2L5 13.4h6.2L10 22l8.8-11.6h-6.3z" fill="currentColor"/>',
    lens: '<circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2.8"/><path d="M14.6 14.6L21 21" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
    moon: '<path d="M15.5 2.8a9.2 9.2 0 1 0 5.8 14A7.6 7.6 0 0 1 15.5 2.8z" fill="currentColor"/>',
    pulse: '<path d="M2 12.5h4.2l2.1-5.2 3.2 10.4 3.1-12.4 2.6 7.2H22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>',
    spiral: '<path d="M12.6 12.4a1.4 1.4 0 0 1-1.9 1.6 2.9 2.9 0 0 1 .4-5.4 4.5 4.5 0 0 1 5.4 4.6 6.1 6.1 0 0 1-7.2 5.6 7.6 7.6 0 0 1-5.7-8.6" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>',
    seal: '<circle cx="12" cy="12" r="2.2" fill="currentColor"/>'
  };
  const emblem = (k) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (GLYPH[k] || GLYPH.seal) + '</svg>';

  /* ---------------- today's room (tomorrow's is teased at the end) ---------------- */
  const ROOMS = [
    { key: 'library', name: 'the Lantern Library', wall: ['#24161c', '#120b10'], wallB: ['#f3e6d0', '#dcc6a4'], win: 'arch', view: 'moon', props: 'shelves', rug: ['#5a1f2a', '#3a121b'], rugB: ['#b0566a', '#8a3a4c'] },
    { key: 'treehouse', name: 'the Treehouse', wall: ['#1d1a12', '#0f0d08'], wallB: ['#efe5c7', '#d6c79c'], win: 'round', view: 'leaves', props: 'planks', rug: ['#2f4a2a', '#1c2f19'], rugB: ['#7aa06a', '#5a8050'] },
    { key: 'lighthouse', name: 'the Lighthouse Loft', wall: ['#10202a', '#071118'], wallB: ['#e4eef0', '#c4d6db'], win: 'round', view: 'sea', props: 'none', rug: ['#1d3a4a', '#10232e'], rugB: ['#5f93a8', '#46788c'] },
    { key: 'greenhouse', name: 'the Midnight Greenhouse', wall: ['#0e1d18', '#06110c'], wallB: ['#e6f0e6', '#c6dac9'], win: 'panes', view: 'moon', props: 'plants', rug: ['#3a2a1a', '#24180e'], rugB: ['#a07a56', '#80603f'] },
    { key: 'observatory', name: 'the Observatory', wall: ['#141836', '#080a1e'], wallB: ['#e6e8f6', '#c8cce6'], win: 'dome', view: 'stars', props: 'none', rug: ['#2a2350', '#181433'], rugB: ['#7a70b0', '#5d5494'] },
    { key: 'attic', name: 'the Rainy Attic', wall: ['#211628', '#120b17'], wallB: ['#efe3ec', '#d6c5d2'], win: 'round', view: 'rain', props: 'beams', rug: ['#4a2440', '#2e1428'], rugB: ['#a46a92', '#875176'] },
    { key: 'boathouse', name: 'the Boathouse', wall: ['#0f1b26', '#070f17'], wallB: ['#e2eaf0', '#c3d1dc'], win: 'arch', view: 'water', props: 'oars', rug: ['#203a52', '#122436'], rugB: ['#6a90b0', '#4f7494'] }
  ];

  /* ---------------- words: every line in three vibes ---------------- */
  const SAY = {
    hello: { Jolly: 'The council is in session. Deal your case onto the table.', Cheeky: 'Seven bubbles, one table, zero snacks. Deal your case.', Unfiltered: 'Council’s in session. Deal your case.' },
    helloBack: { Jolly: 'Welcome back, Chair. The council saved your seat. Deal your case.', Cheeky: 'The Chair returns! Deal the case, please.', Unfiltered: 'Back again. Deal your case.' },
    dealt: { Jolly: 'They’ve read it. Spin the lazy Susan: it stops at whoever gets the floor.', Cheeky: 'Spin it. Wherever it stops, someone has opinions.', Unfiltered: 'Spin. Whoever it points at speaks.' },
    keep: { Jolly: 'Agree? Drag it to your stack. Not for you? Set it aside.', Cheeky: 'Keep it or set it aside. Nobody sulks. Mostly.', Unfiltered: 'Keep it or set it aside.' },
    again: [{ Jolly: 'Spin again. More views on the same facts.', Cheeky: 'Spin! Somebody’s itching to talk.', Unfiltered: 'Spin again.' },
      { Jolly: 'Round it goes. Who’s next?', Cheeky: 'Next contestant, please.', Unfiltered: 'Next.' }],
    loopie: { Jolly: 'Uh-oh. Loopie has grabbed the Susan!', Cheeky: 'Loopie has hijacked the furniture.', Unfiltered: 'Loopie grabbed the Susan.' },
    loopieSeat: { Jolly: 'The scary story has had its say. It keeps its seat: one of seven.', Cheeky: 'Loopie gets a seat. One. Out of seven.', Unfiltered: 'One seat of seven.' },
    allHeard: { Jolly: 'All seven have spoken. The council votes!', Cheeky: 'Everyone talked. Historic. To the bowls!', Unfiltered: 'All heard. Vote.' },
    chair: { Jolly: 'Your token, Chair. Drop it in either bowl.', Cheeky: 'Chair’s vote. Any bowl you like.', Unfiltered: 'Your vote, Chair.' },
    printing: { Jolly: 'The verdict is printing…', Cheeky: 'Printing the verdict. Very official.', Unfiltered: 'Verdict printing.' },
    seal: { Jolly: 'Hold the wax to seal it.', Cheeky: 'Seal it like a proper royal.', Unfiltered: 'Hold to seal.' },
    sealed: { Jolly: 'Sealed. Seven views, one fair story.', Cheeky: 'Sealed, stamped and slightly smug.', Unfiltered: 'Sealed. Fair story.' },
    sealedPlan: { Jolly: 'Sealed. A real worry, and a real plan.', Cheeky: 'Sealed. Worry: real. Plan: also real.', Unfiltered: 'Sealed. Real worry, real plan.' },
    sealedCare: { Jolly: 'Sealed. Next, get proper advice on the real question.', Cheeky: 'Sealed. Now ask a qualified human.', Unfiltered: 'Sealed. Get proper advice.' },
    tooSmall: { Jolly: 'Give it a proper spin: round and round.', Cheeky: 'That was a nudge. Spin it!', Unfiltered: 'Spin it round.' },
    tomorrow: { Jolly: 'The council meets in {room} tomorrow.', Cheeky: 'Tomorrow’s meeting: {room}. Snacks still not provided.', Unfiltered: 'Tomorrow: {room}.' }
  };
  const CARD = {
    glitch: { Jolly: 'Same facts, different story:', Cheeky: 'Your facts have an alibi:', Unfiltered: 'This fits the facts too:' },
    glitchNone: { Jolly: 'Logic check: a feeling isn’t proof.', Cheeky: 'Beep. Certainty detected. Evidence pending.', Unfiltered: 'Feeling sure isn’t proof.' },
    glitchStrong: { Jolly: 'Honest logic: the facts lean toward the worry.', Cheeky: 'Annoyingly, the facts back the worry.', Unfiltered: 'The facts lean that way.' },
    patch: { Jolly: 'What you’d tell a friend:', Cheeky: 'Friend mode, activated:', Unfiltered: 'A friend would say:' },
    drop: { Jolly: 'Look a little deeper. It could also mean:', Cheeky: 'Deep thought incoming. It could also mean:', Unfiltered: 'It could also mean:' },
    dropWide: { Jolly: 'Zoom out a little:', Cheeky: 'Big chapter. Not the whole book:', Unfiltered: 'Zoom out:' },
    rush: { Jolly: 'Less guessing, more doing:', Cheeky: 'Stop guessing. Try this:', Unfiltered: 'Do this:' },
    rushPlan: { Jolly: 'Less spiralling, more planning:', Cheeky: 'Enough worrying. Action:', Unfiltered: 'Plan:' },
    rushCare: { Jolly: 'Get proper help with this one:', Cheeky: 'This one needs a qualified human:', Unfiltered: 'Get proper advice:' },
    still: { Jolly: 'One slow breath out first. Then:', Cheeky: 'Breathe out. Slower. Lovely. Now:', Unfiltered: 'Breathe. Then:' },
    sync: { Jolly: 'The feeling is loud. Loud isn’t proof.', Cheeky: 'Feelings: great alarms, terrible judges.', Unfiltered: 'A feeling isn’t a fact.' },
    syncStrong: { Jolly: 'Being scared makes sense here.', Cheeky: 'Fear has a point tonight.', Unfiltered: 'Fair fear.' },
    syncStrongBody: { Jolly: 'It can sit with you. It doesn’t get to drive.', Cheeky: 'It can ride along. No driving.', Unfiltered: 'Let it ride. Don’t let it drive.' },
    loopie: { Jolly: 'But what if it’s exactly what you think?', Cheeky: 'Hear me out. Worst case. Again.', Unfiltered: 'What if it’s true?' },
    loopieCare: { Jolly: 'What if the worst happens?', Cheeky: 'What if it goes the worst way?', Unfiltered: 'What if the worst happens?' },
    loopieStrong: { Jolly: 'What if it’s true? This time the facts give me a point.', Cheeky: 'For once, the facts are on my side.', Unfiltered: 'The facts back me this time.' },
    loopieTail: { Jolly: 'What if… what if… what if…', Cheeky: 'Encore! I know this one by heart.', Unfiltered: 'Again. And again.' },
    stillSeat: { Jolly: 'Everyone gets a seat, Loopie. You’ve got one. Of seven.', Cheeky: 'Lovely speech, Loopie. One seat. Out of seven.', Unfiltered: 'One seat. Of seven.' },
    stillSeatStrong: { Jolly: 'Loopie has a point tonight. It gets a seat, and a plan.', Cheeky: 'Point taken, Loopie. A seat, plus a plan.', Unfiltered: 'Fair point. Seat and a plan.' },
    stillSeatCare: { Jolly: 'The worry gets a seat. It also deserves proper advice.', Cheeky: 'A seat for the worry, and an expert for the question.', Unfiltered: 'Seat for the worry. Get advice.' }
  };

  (env.games = env.games || []).push({
    id: 'bubble-council', mode: 'reframe', name: 'Bubble Council', verb: 'spin', family: 'REFRAME', minutes: 2,
    parents: ['Social / Team / Perspective', 'Decision Pressure', 'Beliefs / Evidence'],
    cast: ['glitch', 'patch', 'drop', 'rush', 'still', 'sync', 'loopie'], poster: { char: 'glitch', mood: 'think' },
    fonts: ['IM+Fell+English+SC', 'Alegreya:ital,wght@0,500;0,700;1,500'],
    tagline: 'Spin the lazy Susan. Seven bubbles, seven takes on the same facts.',
    why: 'For one scary story on repeat: hear six other fair views, and give the fear one seat.',
    css: `
.g-bubble-council { --bc-gold: #e8c26a; --bc-ink: #2a1a0e; --bc-parch: #fbf3e2; --bc-parch2: #efdfbe;
  --bc-display: 'IM Fell English SC', 'Cormorant SC', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, 'DejaVu Serif', serif;
  --bc-serif: 'Alegreya', 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'DejaVu Serif', serif; }
.g-bubble-council .bc-hit { position: absolute; inset: 0; z-index: 4; touch-action: none; }
.g-bubble-council .bc-head { position: absolute; z-index: 20; left: 50%; transform: translateX(-50%); top: calc(env(safe-area-inset-top, 0px) + 60px); width: min(600px, calc(100% - 24px)); box-sizing: border-box;
  padding: 7px 14px 8px; border-radius: 14px; text-align: center; pointer-events: none; color: #fbefd6;
  background: linear-gradient(180deg, rgba(52, 30, 22, .94), rgba(28, 15, 11, .94)); border: 1px solid rgba(232, 194, 106, .5);
  box-shadow: 0 10px 26px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(255, 236, 190, .16); }
.g-bubble-council .bc-hrow { display: flex; align-items: center; justify-content: center; gap: 7px; font: 400 14px/1.1 var(--bc-display); letter-spacing: .06em; color: var(--bc-gold); white-space: nowrap; overflow: hidden; }
.g-bubble-council .bc-hrow span { font: 600 13px/1.1 var(--font-ui); letter-spacing: .03em; color: #e6d4b0; overflow: hidden; text-overflow: ellipsis; }
.g-bubble-council .bc-hrow .bc-sep { font-style: normal; color: #a88a5a; }
.g-bubble-council:not(.bc-wide) .bc-hrow b, .g-bubble-council:not(.bc-wide) .bc-hrow .bc-sep { display: none; }
.g-bubble-council:not(.bc-wide) .bc-hrow span { font: 400 15px/1.1 var(--bc-display); letter-spacing: .04em; color: var(--bc-gold); }
.g-bubble-council .bc-pips { display: inline-flex; gap: 4px; flex: none; }
.g-bubble-council .bc-pips i { width: 9px; height: 9px; border-radius: 50%; background: rgba(255, 255, 255, .13); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .14); transition: background .4s ease, box-shadow .4s ease; }
.g-bubble-council .bc-pips i.on { background: var(--mc); box-shadow: 0 0 9px var(--mc); }
.g-bubble-council .bc-say { margin: 4px 0 0; font: 500 15px/1.28 var(--bc-serif); color: #fff6e2; text-wrap: balance; }
.g-bubble-council .bc-say.swap { animation: bubble-council-swap .45s cubic-bezier(.2, 1.2, .4, 1) backwards; }
@keyframes bubble-council-swap { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
.g-bubble-council .bc-card { position: absolute; z-index: 26; box-sizing: border-box; border-radius: 14px; padding: 10px 14px 12px; color: var(--bc-ink); touch-action: none; cursor: grab;
  background: radial-gradient(120% 90% at 30% 0%, #fffaf0, var(--bc-parch) 45%, var(--bc-parch2)); box-shadow: 0 2px 0 #d6bf92, 0 14px 30px rgba(0, 0, 0, .45);
  border-top: 7px solid var(--mc, #c9a14a); }
.g-bubble-council .bc-card.fly { transition: transform .5s cubic-bezier(.2, .9, .3, 1.15), opacity .4s ease; }
.g-bubble-council .bc-card.lift { box-shadow: 0 2px 0 #d6bf92, 0 26px 44px rgba(0, 0, 0, .55); cursor: grabbing; }
.g-bubble-council .bc-card:focus-visible { outline: 3px solid var(--bc-gold); outline-offset: 3px; }
.g-bubble-council .bc-fh { display: flex; align-items: center; gap: 7px; font: 700 13px/1 var(--font-ui); letter-spacing: .05em; text-transform: uppercase; color: #4a2f1b; }
.g-bubble-council .bc-fh span { font-weight: 600; text-transform: none; letter-spacing: 0; color: #7a5636; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.g-bubble-council .bc-fh em { margin-left: auto; flex: none; font: 700 12px/1 var(--font-ui); font-style: normal; letter-spacing: .06em; padding: 4px 8px 3px; border-radius: 999px; color: #24160c;
  background: color-mix(in srgb, var(--mc) 55%, #fff6e2); }
.g-bubble-council .bc-em { flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; color: #24160c; background: var(--mc); box-shadow: 0 0 0 2px #fff6e2, 0 0 12px color-mix(in srgb, var(--mc) 70%, transparent); }
.g-bubble-council .bc-em svg { width: 17px; height: 17px; }
.g-bubble-council .bc-fl { margin: 7px 0 3px; font: italic 500 14px/1.28 var(--bc-serif); color: #6a4528; min-height: 1.28em; }
.g-bubble-council .bc-fb { margin: 0; font: 500 16px/1.3 var(--bc-serif); color: #24160c; text-wrap: pretty; }
.g-bubble-council .bc-fb .gk-user { font: italic 700 16px/1.3 var(--bc-serif); }
.g-bubble-council .bc-chip { display: inline-block; margin: 0 5px 2px 0; padding: 3px 7px 2px; border-radius: 6px; font: 700 12px/1.1 var(--font-ui); letter-spacing: .06em; text-transform: uppercase; vertical-align: 2px;
  color: #24160c; background: color-mix(in srgb, var(--mc) 35%, #fff8ea); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--mc) 80%, #24160c); }
.g-bubble-council .bc-tail { margin: 6px 0 0; font: italic 600 14px/1.2 var(--bc-serif); color: #7a3a8a; }
.g-bubble-council .bc-tail span { display: inline-block; animation: bubble-council-loop 1.6s ease-in-out infinite; }
.g-bubble-council .bc-tail span:nth-child(2) { animation-delay: .25s; } .g-bubble-council .bc-tail span:nth-child(3) { animation-delay: .5s; }
@keyframes bubble-council-loop { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
.g-bubble-council .bc-note { position: absolute; z-index: 27; box-sizing: border-box; border-radius: 12px; padding: 9px 13px 10px; pointer-events: none; color: var(--bc-ink); font: 500 16px/1.3 var(--bc-serif);
  background: linear-gradient(180deg, #fffaf0, var(--bc-parch2)); border-left: 6px solid var(--mc); box-shadow: 0 12px 26px rgba(0, 0, 0, .42); animation: bubble-council-swap .45s cubic-bezier(.2, 1.2, .4, 1) backwards; }
.g-bubble-council .bc-note b { display: block; font: 700 12px/1 var(--font-ui); letter-spacing: .08em; text-transform: uppercase; color: #5a3a22; margin-bottom: 4px; }
.g-bubble-council .bc-case { position: absolute; z-index: 24; box-sizing: border-box; border-radius: 14px; padding: 11px 15px 13px; color: var(--bc-ink); touch-action: none; cursor: grab;
  background: radial-gradient(120% 100% at 30% 0%, #fffaf0, var(--bc-parch) 50%, var(--bc-parch2)); box-shadow: 0 2px 0 #d6bf92, 0 16px 34px rgba(0, 0, 0, .5); border: 1px solid rgba(120, 80, 40, .25); }
.g-bubble-council .bc-case.fly { transition: transform .45s cubic-bezier(.4, 0, .6, 1), opacity .45s ease; }
.g-bubble-council .bc-case.lift { box-shadow: 0 2px 0 #d6bf92, 0 28px 46px rgba(0, 0, 0, .6); cursor: grabbing; }
.g-bubble-council .bc-case:focus-visible { outline: 3px solid var(--bc-gold); outline-offset: 3px; }
.g-bubble-council .bc-ch { display: flex; align-items: center; gap: 8px; font: 400 18px/1 var(--bc-display); letter-spacing: .06em; color: #7a2a1c; }
.g-bubble-council .bc-ch i { width: 22px; height: 22px; border-radius: 50%; flex: none; background: radial-gradient(circle at 35% 30%, #e05a4a, #a3202a 60%, #6a1018); box-shadow: 0 1px 2px rgba(0, 0, 0, .4); }
.g-bubble-council .bc-case small { display: block; margin: 8px 0 2px; font: 700 12px/1 var(--font-ui); letter-spacing: .08em; text-transform: uppercase; color: #8a5a2c; }
.g-bubble-council .bc-case p { margin: 0; font: 500 16px/1.3 var(--bc-serif); color: #24160c; }
.g-bubble-council .bc-case p.gk-user { font: italic 700 16px/1.3 var(--bc-serif); }
.g-bubble-council .bc-tray { position: absolute; z-index: 22; box-sizing: border-box; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; padding: 6px 8px 8px; cursor: pointer;
  border: 2px dashed rgba(232, 194, 106, .55); background: radial-gradient(100% 90% at 50% 100%, rgba(255, 214, 140, .14), rgba(20, 10, 8, .5)); color: #fbefd6; transition: opacity .5s ease, transform .5s cubic-bezier(.2, 1.2, .4, 1), box-shadow .2s ease, border-color .2s ease; }
.g-bubble-council .bc-tray.off { opacity: 0; transform: translateY(24px) scale(.94); pointer-events: none; }
.g-bubble-council .bc-tray.hot { border-color: #ffe7a0; border-style: solid; box-shadow: 0 0 0 3px rgba(255, 220, 140, .35), 0 0 26px rgba(255, 200, 110, .55); }
.g-bubble-council .bc-tray b { font: 700 13px/1 var(--font-ui); letter-spacing: .07em; text-transform: uppercase; }
.g-bubble-council .bc-tray small { font: 600 12px/1 var(--font-ui); color: #d9c6a2; }
.g-bubble-council .bc-tray.aside { border-color: rgba(200, 190, 210, .4); }
.g-bubble-council .bc-tray.aside b { color: #dcd2e6; }
.g-bubble-council .bc-tray:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.g-bubble-council .bc-pile { position: relative; width: 66px; height: 40px; flex: none; }
.g-bubble-council .bc-pile i { position: absolute; left: 9px; top: 4px; width: 48px; height: 32px; border-radius: 5px; background: linear-gradient(180deg, #fffaf0, #ecdcb8); border-top: 5px solid var(--mc); box-shadow: 0 2px 5px rgba(0, 0, 0, .35); transform: rotate(var(--r, 0deg)) translateY(var(--y, 0px)); animation: bubble-council-pile .45s cubic-bezier(.2, 1.4, .4, 1) backwards; }
.g-bubble-council .bc-tray.aside .bc-pile i { filter: saturate(.35) brightness(.88); }
.g-bubble-council .bc-pile:empty::before { content: ""; position: absolute; left: 9px; top: 4px; width: 48px; height: 32px; box-sizing: border-box; border-radius: 5px; border: 2px dashed rgba(232, 194, 106, .45); }
.g-bubble-council .bc-tray.aside .bc-pile:empty::before { border-color: rgba(210, 200, 225, .4); }
@keyframes bubble-council-pile { from { transform: rotate(0deg) translateY(-26px) scale(1.25); opacity: 0; } }
.g-bubble-council .bc-fan { position: absolute; z-index: 21; width: 0; height: 0; pointer-events: none; transition: opacity .6s ease; }
.g-bubble-council .bc-fan.off { opacity: 0; }
.g-bubble-council .bc-fan i { position: absolute; left: 0; top: 0; width: var(--fw, 44px); height: var(--fh, 62px); margin: calc(var(--fh, 62px) * -1) 0 0 calc(var(--fw, 44px) / -2); box-sizing: border-box; border-radius: 7px;
  display: grid; place-items: center; color: var(--mc); background: radial-gradient(circle at 50% 40%, #4a2e1e, #24150d 75%); border: 2px solid var(--mc);
  box-shadow: 0 6px 14px rgba(0, 0, 0, .45), inset 0 0 0 3px rgba(255, 236, 190, .08), 0 0 14px color-mix(in srgb, var(--mc) 35%, transparent);
  transform-origin: 50% 190%; transform: rotate(var(--a, 0deg)); transition: transform .6s cubic-bezier(.2, 1.2, .4, 1), opacity .45s ease; }
.g-bubble-council .bc-fan i svg { width: 52%; height: 52%; }
.g-bubble-council .bc-fan i.gone { opacity: 0; transform: rotate(var(--a, 0deg)) translateY(-70px) scale(.5); }
.g-bubble-council .bc-plaque { position: absolute; z-index: 23; transform: translate(-50%, 0); padding: 4px 9px 3px; border-radius: 8px; white-space: nowrap; pointer-events: none;
  font: 700 12px/1.1 var(--font-ui); letter-spacing: .06em; text-transform: uppercase; color: #fff4ff; background: linear-gradient(180deg, #9a3ab8, #6a1f88); box-shadow: 0 0 0 1px rgba(255, 220, 255, .45), 0 6px 14px rgba(0, 0, 0, .4), 0 0 16px rgba(208, 75, 255, .5);
  animation: bubble-council-swap .5s cubic-bezier(.2, 1.4, .4, 1) backwards; }
.g-bubble-council .bc-bowl { position: absolute; z-index: 22; transform: translate(-50%, 0); width: 148px; text-align: center; pointer-events: none; transition: opacity .5s ease; }
.g-bubble-council .bc-bowl.off { opacity: 0; }
.g-bubble-council .bc-bowl b { display: inline-block; padding: 4px 9px 3px; border-radius: 8px; font: 400 15px/1.1 var(--bc-display); letter-spacing: .05em; color: #fbefd6; background: rgba(34, 18, 12, .72); box-shadow: 0 0 0 1px rgba(232, 194, 106, .35); }
.g-bubble-council .bc-bowl span { display: block; width: max-content; margin: 5px auto 0; min-width: 34px; box-sizing: border-box; padding: 3px 8px 2px; border-radius: 999px; font: 800 15px/1.1 var(--font-ui); color: #1c1008; background: var(--bc-gold); box-shadow: 0 2px 8px rgba(0, 0, 0, .4); }
.g-bubble-council .bc-bowl.pop span { animation: bubble-council-count .4s cubic-bezier(.2, 1.6, .4, 1); }
@keyframes bubble-council-count { 0% { transform: scale(1.5); } 100% { transform: none; } }
.g-bubble-council .bc-token { position: absolute; z-index: 28; width: 58px; height: 58px; margin: -29px 0 0 -29px; border-radius: 50%; border: 0; padding: 0; cursor: grab; touch-action: none;
  background: radial-gradient(circle at 38% 32%, #fff8d8, #ffd36b 34%, #e0a030 62%, #8a5a10); box-shadow: 0 0 0 3px rgba(255, 240, 200, .6), 0 0 26px rgba(255, 200, 90, .9), 0 8px 16px rgba(0, 0, 0, .45);
  font: 800 13px/1 var(--font-ui); letter-spacing: .06em; color: #4a2a06; transition: opacity .4s ease; }
.g-bubble-council .bc-token.idle { animation: bubble-council-bob 1.6s ease-in-out infinite; }
@keyframes bubble-council-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -5px; } }
.g-bubble-council .bc-token:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }
.g-bubble-council .bc-verdict { position: absolute; z-index: 26; box-sizing: border-box; border-radius: 16px; padding: 12px 16px 14px; color: var(--bc-ink); overflow: hidden;
  background: radial-gradient(130% 100% at 30% 0%, #fffcf3, var(--bc-parch) 45%, var(--bc-parch2)); box-shadow: 0 2px 0 #d6bf92, 0 18px 40px rgba(0, 0, 0, .55), inset 0 0 0 1px rgba(140, 100, 50, .25);
  clip-path: inset(0 0 calc(100% - var(--rev, 0%)) 0 round 16px); }
.g-bubble-council .bc-verdict::after { content: ""; position: absolute; inset: 7px; border: 1px solid rgba(160, 110, 50, .35); border-radius: 11px; pointer-events: none; }
.g-bubble-council .bc-vtop { min-height: 62px; padding-right: 74px; box-sizing: border-box; }
.g-bubble-council.bc-wide .bc-vtop { padding-right: 0; }
.g-bubble-council .bc-vh { font: 400 19px/1.05 var(--bc-display); letter-spacing: .05em; color: #7a2a1c; }
.g-bubble-council .bc-vs { margin-top: 4px; font: 600 12px/1.25 var(--font-ui); letter-spacing: .04em; color: #8a6a44; }
.g-bubble-council .bc-vt { margin: 8px 0 0; font: 500 16px/1.3 var(--bc-serif); color: #24160c; text-wrap: pretty; }
.g-bubble-council .bc-vn { margin-top: 8px; padding-top: 7px; border-top: 1px dashed rgba(140, 100, 50, .45); font: 500 14px/1.3 var(--bc-serif); color: #3a2414; }
.g-bubble-council .bc-vn small { display: block; margin-bottom: 3px; font: 700 12px/1 var(--font-ui); letter-spacing: .08em; text-transform: uppercase; color: #1e7a4c; }
.g-bubble-council .bc-seal { position: absolute; z-index: 2; right: 12px; top: 10px; width: 60px; height: 60px; border-radius: 50%; border: 0; padding: 0; cursor: pointer; touch-action: none; color: #ffd9c8;
  background: radial-gradient(circle at 36% 30%, #e86a5a, #b3243a 52%, #7a1020); box-shadow: 0 3px 0 #5a0a16, 0 8px 16px rgba(0, 0, 0, .4), inset 0 -3px 6px rgba(0, 0, 0, .25);
  transform: scale(var(--sq, 1)); transition: transform .12s ease; }
.g-bubble-council .bc-seal svg { position: absolute; inset: 10px; width: 40px; height: 40px; opacity: .3; transition: opacity .3s ease; }
.g-bubble-council .bc-seal b { position: absolute; inset: 0; display: grid; place-items: center; font: 800 12px/1 var(--font-ui); letter-spacing: .08em; color: #fff1e6; text-shadow: 0 1px 2px rgba(60, 0, 10, .7); transition: opacity .25s ease; }
.g-bubble-council .bc-seal.done { cursor: default; animation: bubble-council-stamp .5s cubic-bezier(.2, 1.6, .4, 1); box-shadow: 0 1px 0 #5a0a16, 0 3px 6px rgba(0, 0, 0, .35), inset 0 -2px 5px rgba(0, 0, 0, .3), 0 0 0 6px rgba(179, 36, 58, .18); }
.g-bubble-council .bc-seal.done svg { opacity: 1; }
.g-bubble-council .bc-seal.done b { opacity: 0; }
@keyframes bubble-council-stamp { 0% { transform: scale(1.35); } 55% { transform: scale(.86, .8); } 100% { transform: none; } }
.g-bubble-council .bc-seal:focus-visible { outline: 3px solid #fff; outline-offset: 4px; }
.g-bubble-council.bc-wide .bc-say { font-size: 17px; } .g-bubble-council.bc-wide .bc-hrow { font-size: 16px; } .g-bubble-council.bc-wide .bc-hrow span { font-size: 13px; }
.g-bubble-council.bc-wide .bc-fb, .g-bubble-council.bc-wide .bc-fb .gk-user { font-size: 18px; } .g-bubble-council.bc-wide .bc-fl { font-size: 16px; } .g-bubble-council.bc-wide .bc-vt { font-size: 19px; } .g-bubble-council.bc-wide .bc-vn { font-size: 16px; } .g-bubble-council.bc-wide .bc-vh { font-size: 22px; }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, an = ctx.analysis || {};
      const TAU = Math.PI * 2, HALF = Math.PI / 2, STEP = Math.PI / 4, clamp = K.clamp, lerp = K.lerp, hexA = K.hexA, now = () => performance.now();
      const inten = ctx.intensity, RM = () => K.reduced(), visits = K.visits(), bright = () => S.scene() === 'bright';
      const L = (o, rep) => { let s = ctx.line(o) || ''; if (rep) Object.keys(rep).forEach(k => { s = s.split('{' + k + '}').join(rep[k]); }); return s; };
      const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > n * 0.55 ? c.slice(0, sp) : c).replace(/[\s,;:–-]+$/, '') + '…'; };
      const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
      const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
      const cap1 = (s) => { s = String(s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };
      const text = String(ctx.text || ''), hasText = !!text.trim();
      const care = an.safety === 'care';
      const support = an.fear_support === 'strong' ? 'strong' : an.fear_support === 'some' ? 'some' : 'weak';
      const strong = support === 'strong';

      /* ---------------- the reading of their words ---------------- */
      const lower = text.toLowerCase();
      const spans = hasText ? (Array.isArray(an.spans) ? an.spans : []).map(s => {
        const q = s && typeof s.quote === 'string' ? s.quote.trim() : ''; if (q.split(/\s+/).length < 2) return null;
        let at = text.indexOf(q); if (at < 0) at = lower.indexOf(q.toLowerCase()); if (at < 0) return null;
        return { at, q: text.slice(at, at + q.length), kind: s.kind === 'camera' ? 'camera' : 'brain' };
      }).filter(Boolean) : [];
      const concl = String(an.conclusion || an.thought || '');
      const overlap = (q) => { const c = concl.toLowerCase(); return q.toLowerCase().split(/[^a-z’']+/).filter(w => w.length > 3 && c.includes(w)).length; };
      const brainQ = (() => { const b = spans.filter(s => s.kind === 'brain').sort((a, c) => overlap(c.q) - overlap(a.q) || c.at - a.at)[0]; return b ? clip(b.q, 120) : ''; })();
      const camQ = (() => { const c = spans.filter(s => s.kind === 'camera').sort((a, b) => a.at - b.at)[0]; return c ? clip(c.q, 130) : ''; })();
      const alts = (Array.isArray(an.alternatives) ? an.alternatives : []).filter(a => a && a.theory);
      const rivals = alts.filter(a => !a.fear);
      const leads = (Array.isArray(an.leads) ? an.leads : []).filter(l => l && l.text);
      const lead = (k, fb) => clip((leads.find(l => l.kind === k) || {}).text || fb, 125);
      const unknown = clip(((Array.isArray(an.unknowns) ? an.unknowns : []).find(u => u && u.text) || {}).text || '', 100);
      const NEXT = care ? lead('prepare', 'Find a free advice service and ask them the real question.') : support === 'weak' ? lead('ask', 'Ask one simple question that would fill the biggest gap.') : lead('prepare', 'Write down the next single step you can take.');
      const FAIR = clip(an.balanced || (strong ? 'This is a real concern, and it deserves a plan.' : 'That fits more than one story, and the facts don’t settle it yet.'), 170);

      /* ---------------- what each member brings to the table ---------------- */
      const cardFor = (slug) => {
        const r1 = rivals[0], r2 = rivals[1];
        const altBody = (r) => ({ chip: clip(String(r.name || 'Another story'), 26), body: clip(cap1(r.theory), 120) });
        if (slug === 'glitch') {
          if (strong) return { lead: L(CARD.glitchStrong), body: clip(an.support_reason || 'Something on record points this way, so it deserves a plan, not a spiral.', 125) };
          if (r1) return Object.assign({ lead: L(CARD.glitch) }, altBody(r1));
          return { lead: L(CARD.glitchNone), body: 'A thought can feel certain and still be a guess. Check what a camera would have seen.' };
        }
        if (slug === 'patch') return { lead: L(CARD.patch), body: clip(an.friend || 'That sounds hard. One moment isn’t the whole story. Check the facts before deciding.', 130) };
        if (slug === 'drop') {
          if (!strong && r2) return Object.assign({ lead: L(CARD.drop) }, altBody(r2));
          return { lead: L(CARD.dropWide), body: clip(an.future || 'A year from now this will likely look smaller than it does tonight.', 125) };
        }
        if (slug === 'rush') return care ? { lead: L(CARD.rushCare), body: lead('prepare', 'Find a free advice service and ask them the real question.') }
          : support === 'weak' ? { lead: L(CARD.rush), body: lead('ask', 'Ask one simple question that would fill the biggest gap.') } : { lead: L(CARD.rushPlan), body: lead('prepare', 'Write down the next single step you can take.') };
        if (slug === 'still') return { lead: L(CARD.still), body: lead('steady', 'Take a ten-minute walk before deciding anything.') };
        if (slug === 'sync') return strong ? { lead: L(CARD.syncStrong), body: L(CARD.syncStrongBody) } : { lead: L(CARD.sync), body: unknown ? 'The real question: ' + (/^I\b/.test(unknown) ? unknown : unknown[0].toLowerCase() + unknown.slice(1)) : 'What would you need to know to be sure?' };
        // loopie: the scary story, in the player's own words when there are some
        return { lead: L(care ? CARD.loopieCare : strong ? CARD.loopieStrong : CARD.loopie), chip: 'The scary story', body: brainQ ? '“' + brainQ + '”' : cap1(clip(concl || 'It means something bad.', 110)), user: !!brainQ, tail: !care && !strong ? L(CARD.loopieTail) : '' };
      };

      /* ---------------- today's room, member card variants (they rotate with each visit) ---------------- */
      let devRoom = null; try { if (S.isDev && S.isDev()) devRoom = new URLSearchParams(window.location.search).get('room'); } catch (e) { /* no query */ }
      const ROOM = ROOMS.find(r => r.key === devRoom) || K.dailyPick(ROOMS, 29);
      const NEXT_ROOM = ROOMS[(ROOMS.indexOf(ROOM) + 1 + (K.daily() % 3)) % ROOMS.length];
      const VARIANT = (i) => (visits + i) % 3;

      /* ---------------- state ---------------- */
      const st = { phase: 'intro', heard: 0, active: null, dealt: false, loopieOpen: false, dim: 0, dimTo: 0, blaze: 0, blazeTo: 0, flare: 0, finished: false, kept: [], aside: [], votes: [0, 0], chairVote: -1,
        spot: null, spotT: 0, ring: 0, ringT: 0, waits: {}, sealed: false, said: 0 };
      const G = { W: 0, H: 0, phone: true, cx: 0, cy: 0, rx: 0, ry: 0, cs: 56, rxT: 0, ryT: 0, asp: 0.9, R: 0, band: 0, head: 0, seats: [] };
      const P = K.particles({ max: 420 });
      const SEATS = new Array(8).fill(null);
      const pal = () => bright() ? { wall: ROOM.wallB, rug: ROOM.rugB } : { wall: ROOM.wall, rug: ROOM.rug };

      /* ---------------- DOM ---------------- */
      const SOFT = (() => { try { const c = document.createElement('canvas'), gl = c.getContext('webgl'); if (!gl) return true; const ext = gl.getExtension('WEBGL_debug_renderer_info'), r = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''; const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(r); } catch (e) { return false; } })();
      const cv = K.canvas(el, { opaque: true, maxDpr: SOFT ? 1 : 1.75 });
      const roomCv = document.createElement('canvas'), susanCv = document.createElement('canvas');
      let roomKey = '', susanKey = '';
      const hit = h('div', { class: 'bc-hit', 'aria-hidden': 'true' });
      const pips = h('span', { class: 'bc-pips', 'aria-hidden': 'true' });
      const sayEl = h('p', { class: 'bc-say', role: 'status', 'aria-live': 'polite' });
      const head = h('div', { class: 'bc-head' }, h('div', { class: 'bc-hrow' }, h('b', { text: 'Council of seven' }), h('i', { class: 'bc-sep', text: '·' }), h('span', { text: cap1(ROOM.name) }), pips), sayEl);
      const keepTray = h('div', { class: 'bc-tray keep off', role: 'button', tabindex: '0', 'aria-label': 'My stack: keep this card' }, h('div', { class: 'bc-pile' }), h('b', { text: 'My stack' }), h('small', { text: 'Cards I agree with' }));
      const asideTray = h('div', { class: 'bc-tray aside off', role: 'button', tabindex: '0', 'aria-label': 'Set this card aside' }, h('div', { class: 'bc-pile' }), h('b', { text: 'Set aside' }), h('small', { text: 'Not for me tonight' }));
      const fanEl = h('div', { class: 'bc-fan off', 'aria-hidden': 'true' }); // the council's hand: one face-down card per member still to speak
      el.append(hit, head, fanEl, keepTray, asideTray);
      MEMBERS.forEach((m, i) => {
        m.i = i; m.heard = false; m.title = m.titles[VARIANT(i)];
        m.c = K.character(m.slug, { side: 'right', mood: m.slug === 'loopie' ? 'worried' : 'neutral', x: 0, y: 0, size: 56, voice: m.voice, fit: false });
        m.c.el.setAttribute('aria-hidden', 'true');
        SEATS[m.seat] = m;
        const pip = h('i'); pip.style.setProperty('--mc', m.col); pips.append(pip); m.pip = pip;
      });
      MEMBERS.slice().sort((a, b) => a.seat - b.seat).forEach(m => { const c = h('i', { html: emblem(m.glyph) }); c.style.setProperty('--mc', m.col); m.fan = c; fanEl.append(c); });
      function layoutFan() {
        const left = MEMBERS.filter(m => !m.heard).sort((a, b) => a.seat - b.seat), n = left.length, step = G.phone ? 11 : 9;
        left.forEach((m, i) => { m.fan.style.setProperty('--a', ((i - (n - 1) / 2) * step).toFixed(1) + 'deg'); });
        MEMBERS.forEach(m => m.fan.classList.toggle('gone', m.heard));
      }
      function say(o, rep) { const s = L(o, rep); if (!s || s === sayEl.textContent) return; sayEl.textContent = s; sayEl.classList.remove('swap'); void sayEl.offsetWidth; sayEl.classList.add('swap'); }

      /* ---------------- layout ---------------- */
      function layout() {
        const W = cv.w, H = cv.h; if (!W || !H) return;
        const phone = W < 700; G.W = W; G.H = H; G.phone = phone;
        el.classList.toggle('bc-wide', !phone);
        G.cs = phone ? (H < 740 ? 48 : 56) : clamp(Math.round(Math.min(W, H) * 0.1), 70, 92);
        G.head = 60 + Math.max(head.offsetHeight || 0, phone ? 74 : 64); // room for two lines of narration
        const bandH = phone ? clamp(H * 0.36, 226, 300) : clamp(H * 0.27, 196, 250);
        G.band = H - bandH;
        G.rx = phone ? W / 2 - G.cs / 2 - 8 : Math.min(W * 0.27, 360);
        const avail = G.band - 8 - (G.head + 8);
        G.ry = Math.max(60, Math.min((avail - G.cs) / 1.707, phone ? G.rx * 0.95 : G.rx * 0.68));
        G.cy = G.head + 8 + G.cs / 2 + G.ry + Math.max(0, (avail - G.cs - 1.707 * G.ry) / 2);
        G.cx = W / 2;
        G.rxT = G.rx - G.cs * 0.42; G.ryT = G.ry - G.cs * 0.42; G.asp = G.ryT / G.rxT; G.R = G.rxT * 0.6;
        G.seats = []; for (let k = 0; k < 8; k++) { const a = HALF + k * STEP; G.seats.push({ x: G.cx + G.rx * Math.cos(a), y: G.cy + G.ry * Math.sin(a), a }); }
        MEMBERS.forEach(m => { const p = G.seats[m.seat]; m.c.el.style.setProperty('--sz', G.cs + 'px'); m.c.place(p.x - G.cs / 2, p.y - G.cs / 2); });
        // the band below the table: the case card, the cards you're handed, the trays
        const bw = Math.min(W - 24, phone ? 380 : 980), bx = (W - bw) / 2;
        G.cardW = phone ? Math.min(W - 28, 360) : 480; G.cardX = (W - G.cardW) / 2; G.cardY = G.band + (phone ? 4 : 8);
        if (phone) {
          const tw = (bw - 12) / 2, th = clamp(H - 16 - (G.band + 176) - 4, 64, 84);
          G.trayY = H - 16 - th;
          Object.assign(asideTray.style, { left: bx + 'px', top: G.trayY + 'px', width: tw + 'px', height: th + 'px' });
          Object.assign(keepTray.style, { left: (bx + tw + 12) + 'px', top: G.trayY + 'px', width: tw + 'px', height: th + 'px' });
          G.cardMaxH = G.trayY - G.cardY - 8;
        } else {
          const tw = Math.min(210, (W - G.cardW) / 2 - 40), th = 132, ty = G.band + 14;
          G.trayY = ty;
          Object.assign(asideTray.style, { left: (G.cardX - 24 - tw) + 'px', top: ty + 'px', width: tw + 'px', height: th + 'px' });
          Object.assign(keepTray.style, { left: (G.cardX + G.cardW + 24) + 'px', top: ty + 'px', width: tw + 'px', height: th + 'px' });
          G.cardMaxH = H - 16 - G.cardY;
        }
        const fw = phone ? 44 : 56; fanEl.style.setProperty('--fw', fw + 'px'); fanEl.style.setProperty('--fh', Math.round(fw * 1.4) + 'px');
        Object.assign(fanEl.style, { left: G.cx + 'px', top: (phone ? G.trayY - 18 : G.band + 150) + 'px' }); layoutFan();
        if (caseEl && !st.dealt) placeCase();
        if (st.floor) placeFloor(st.floor, false);
        if (st.note) placeNote(st.note);
        if (st.plaque) placePlaque();
        if (st.verdict) placeVerdict();
        if (st.bowls) placeBowls();
        roomKey = ''; susanKey = '';
      }

      /* ---------------- the case card (deal it onto the table) ---------------- */
      const caseEl = (() => {
        const kids = [h('div', { class: 'bc-ch' }, h('i'), h('span', { text: hasText ? 'Your case' : 'Tonight’s case' }))];
        if (hasText && (camQ || an.situation)) { kids.push(h('small', { text: 'What happened' }), h('p', { class: camQ ? 'gk-user' : '', text: camQ || clip(an.situation, 130) })); }
        if (hasText && (brainQ || concl)) { kids.push(h('small', { text: 'The story it tells' }), h('p', { class: brainQ ? 'gk-user' : '', text: brainQ ? '“' + brainQ + '”' : cap1(clip(concl, 110)) })); }
        if (!hasText) kids.push(h('small', { text: 'For example' }), h('p', { text: 'A worry you’ve been carrying, and one scary story about what it means.' }));
        return h('div', { class: 'bc-case', role: 'button', tabindex: '0', 'aria-label': 'Your case card. Drag it onto the table, or press Enter.' }, ...kids);
      })();
      el.append(caseEl);
      function placeCase() {
        const w = Math.min(G.W - 40, G.phone ? 340 : 440);
        Object.assign(caseEl.style, { left: ((G.W - w) / 2) + 'px', top: (G.band + (G.phone ? 26 : 18)) + 'px', width: w + 'px', transform: '' });
      }
      const CD = { drag: null };
      K.drag(caseEl, {
        space: el,
        start: (p) => { if (st.phase !== 'deal') return false; const r = K.rectIn(caseEl); CD.drag = { ox: p.x - r.x, oy: p.y - r.y, x0: r.x, y0: r.y }; caseEl.classList.add('lift'); K.guide(null); K.sfx.tap(); if (A.ctx) A.paper({ vol: 0.1 }); },
        move: (p) => { const d = CD.drag; if (!d) return; caseEl.style.transform = 'translate(' + (p.x - d.ox - d.x0).toFixed(1) + 'px,' + (p.y - d.oy - d.y0).toFixed(1) + 'px) rotate(' + clamp((p.x - d.ox - d.x0) * 0.04, -8, 8).toFixed(1) + 'deg)'; },
        end: (p, dd) => {
          const d = CD.drag; if (!d) return; CD.drag = null; caseEl.classList.remove('lift');
          const r = K.rectIn(caseEl), up = G.band - (r.y + r.h * 0.4);
          if (up > -10 || dd.vy < -650 || Math.hypot(r.cx - G.cx, r.cy - G.cy) < G.R * 1.6) deal();
          else { K.sfx.soft(); caseEl.classList.add('fly'); caseEl.style.transform = ''; S.later(() => caseEl.classList.remove('fly'), 480); dealGuide(1400); }
        }
      });
      S.listen(caseEl, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.phase === 'deal') { e.preventDefault(); deal(); } });
      function dealGuide(delay) { K.guide({ id: 'deal', g: 'drag', target: caseEl, oy: 0.12, dir: 'u', d: Math.min(200, Math.max(80, G.band - G.cy)), label: 'DEAL IT ONTO THE TABLE', place: 'above', delay: delay || 900 }); }
      function deal() {
        if (st.phase !== 'deal') return;
        st.phase = 'dealing'; K.guide(null);
        const r = K.rectIn(caseEl), dx = G.cx - r.cx, dy = G.cy - r.cy;
        caseEl.classList.add('fly'); caseEl.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(-14deg) scale(.28)'; caseEl.style.opacity = '0';
        K.sfx.whoosh();
        S.later(() => {
          caseEl.remove(); st.dealt = true; st.dealT = now(); st.flare = 1;
          if (A.ctx) { const t = A.now(); A.noise({ when: t, filter: 'bandpass', freq: 900, q: 0.8, dur: 0.07, vol: 0.28 }); A.thud({ when: t, vol: 0.18 }); A.noise({ when: t + 0.04, filter: 'lowpass', freq: 300, to: 1600, dur: 0.7, attack: 0.08, vol: 0.12, pink: true }); }
          P.emit('ember', G.cx, G.cy, 22, { colors: ['#ffd98a', '#ffb347', '#fff1c4'], speed: [30, 120] });
          MEMBERS.forEach((m, i) => S.later(() => { m.c.face(m.slug === 'loopie' ? 'worried' : i % 2 ? 'think' : 'wow', 1400); m.c.base(m.slug === 'loopie' ? 'worried' : 'think'); }, 60 * i));
          ctx.track('deal', {});
          fanEl.classList.remove('off');
          const w = st.waits.deal; st.waits.deal = null; if (w) w();
        }, 440);
      }

      /* ---------------- the lazy Susan: circle to spin; it clicks into place at a member ---------------- */
      const SU = { th: HALF, w: 0, grab: false, lastA: 0, lastT: 0, tgt: null, notch: 0, drag: null, smooth: [], lastPass: {} };
      const FRIC = [2.3, 1.6, 1.15][inten], SNAP = [3.4, 2.7, 2.2][inten];
      const eligible = (k) => { const m = SEATS[k]; return !!m && !m.heard && (m.slug !== 'loopie' || st.loopieOpen); };
      function pickTarget() {
        const dir = Math.sign(SU.w) || 1; let ahead = null, near = null;
        for (let k = 1; k <= 7; k++) {
          if (!eligible(k)) continue;
          const d = wrap(G.seats[k].a - SU.th), fwd = ((d * dir) % TAU + TAU) % TAU;
          if (fwd < 0.85 && (!ahead || fwd < ahead.f)) ahead = { k, th: SU.th + fwd * dir, f: fwd };
          if (!near || Math.abs(d) < Math.abs(near.d)) near = { k, th: SU.th + d, d };
        }
        if (!ahead && !near) { const m = MEMBERS.find(x => !x.heard); if (m) { const d = wrap(G.seats[m.seat].a - SU.th); return { k: m.seat, th: SU.th + d }; } }
        return ahead || near;
      }
      const angOf = (p) => Math.atan2((p.y - G.cy) / G.asp, p.x - G.cx);
      K.press(hit, {
        down: (p) => {
          if (st.phase !== 'spin' && st.phase !== 'turning') return;
          SU.grab = true; SU.lastA = angOf(p); SU.lastT = now(); SU.w = 0; SU.tgt = null; SU.drag = { tot: 0, sp: [] };
          if (st.phase === 'spin') { st.phase = 'turning'; K.guide(null); }
          K.sfx.tap();
        },
        move: (p) => {
          if (!SU.grab) return;
          const a = angOf(p), tn = now(), dt = Math.max(8, tn - SU.lastT) / 1000;
          if (Math.hypot(p.x - G.cx, (p.y - G.cy) / G.asp) < G.R * 0.22) { SU.lastA = a; SU.lastT = tn; return; } // too near the hub to read a direction
          const d = wrap(a - SU.lastA);
          SU.th += d; SU.w = SU.w * 0.45 + clamp(d / dt, -16, 16) * 0.55; SU.lastA = a; SU.lastT = tn;
          SU.drag.tot += d; SU.drag.sp.push(Math.abs(d / dt));
        },
        up: () => {
          if (!SU.grab) return;
          SU.grab = false;
          const dr = SU.drag; SU.drag = null;
          if (dr && Math.abs(dr.tot) > 0.8 && dr.sp.length >= 6) { const sp = dr.sp.slice(1, -1), mu = sp.reduce((a, b) => a + b, 0) / sp.length, sd = Math.sqrt(sp.reduce((a, b) => a + (b - mu) * (b - mu), 0) / sp.length); if (mu > 0.2) SU.smooth.push(clamp(1 - sd / mu, 0, 1)); }
          if (!dr || Math.abs(dr.tot) < 0.3) { // a nudge, not a spin: settle back to the nearest notch and ask again
            SU.w = 0; SU.tgt = { k: -1, th: HALF + Math.round((SU.th - HALF) / STEP) * STEP }; st.phase = 'settleBack'; return;
          }
          SU.w = clamp(SU.w, -13, 13); st.phase = 'turning';
          ctx.track('spin', { turn: Math.round(dr.tot * 57) });
        }
      });
      K.onKey(['ArrowLeft', 'ArrowRight'], (e) => { if (st.phase !== 'spin' && st.phase !== 'turning') return; e.preventDefault(); SU.tgt = null; SU.w += e.key === 'ArrowLeft' || e.code === 'ArrowLeft' ? -6 : 6; st.phase = 'turning'; K.guide(null); });
      function physics(dt) {
        if (!SU.grab && (st.phase === 'turning' || st.phase === 'loopieSpin' || st.phase === 'settleBack')) {
          if (!SU.tgt) { SU.w *= Math.exp(-FRIC * dt); if (Math.abs(SU.w) < SNAP) SU.tgt = pickTarget(); }
          if (SU.tgt) { const err = SU.tgt.th - SU.th; SU.w += (err * 46 - SU.w * 10) * dt; SU.w = clamp(SU.w, -11, 11); }
          SU.th += SU.w * dt;
          if (SU.tgt && Math.abs(SU.tgt.th - SU.th) < 0.006 && Math.abs(SU.w) < 0.14) {
            SU.th = SU.tgt.th; SU.w = 0; const k = SU.tgt.k; SU.tgt = null;
            if (st.phase === 'settleBack') { st.phase = 'spin'; say(SAY.tooSmall); spinGuide(600); }
            else land(k);
          }
        }
        // notches: a wooden tick at every seat the pointer passes, a chime when it's someone who hasn't spoken
        const notch = Math.round((SU.th - HALF) / STEP);
        if (notch !== SU.notch) {
          const k = ((notch % 8) + 8) % 8; SU.notch = notch;
          if (A.ctx) A.wood(undefined, 0.05 + Math.min(0.06, Math.abs(SU.w) * 0.005), 1.7);
          const m = SEATS[k], tn = now();
          if (m && !m.heard && st.phase !== 'loopieSpin' && (!SU.lastPass[k] || tn - SU.lastPass[k] > 380)) { SU.lastPass[k] = tn; if (A.ctx) A.chime(A.note(NOTES[m.slug]), { vol: 0.03, dur: 0.6 }); if (Math.abs(SU.w) > 1.5 && m.c) m.c.face('surprised', 380); }
        }
        if (rumble) rumble.level(Math.min(0.13, Math.abs(SU.w) * 0.016) + 0.0001, 0.08);
      }
      // the circle guide puts its label above the orbit: orbit low on the Susan so the label stays clear of Glitch's seat
      function spinGuide(delay) { K.guide({ id: 'spin' + st.heard, g: 'circle', target: () => ({ x: G.cx, y: G.cy + G.R * G.asp * 0.32 }), r: clamp(G.R * 0.45, 30, 90), label: st.heard ? 'SPIN AGAIN' : 'SPIN THE LAZY SUSAN', delay: delay || 900 }); }

      /* ---------------- a member has the floor: their card is handed to you ---------------- */
      function land(k) {
        const m = SEATS[k]; if (!m) return;
        st.phase = 'floor'; st.active = m; m.heard = true; st.heard++; st.spot = m; st.spotT = now();
        m.pip.classList.add('on'); layoutFan();
        if (A.ctx) { const t = A.now(); A.wood(t, 0.2, 0.55); A.thud({ when: t, vol: 0.16 }); }
        motif(m.slug);
        m.c.face(m.talk); m.c.react(m.slug === 'loopie' ? 'shake' : 'bounce');
        MEMBERS.forEach(o => { if (o !== m) o.c.face(m.slug === 'loopie' ? (o.slug === 'still' ? 'calm' : 'surprised') : 'think', 1800); });
        const p = G.seats[k]; P.emit('spark', p.x, p.y - G.cs * 0.3, 14, { colors: [m.col, '#fff6d8'] });
        ctx.track('heard', { k: m.i, n: st.heard });
        showFloor(m);
      }
      function showFloor(m) {
        const c = cardFor(m.slug);
        const card = h('div', { class: 'bc-card', role: 'group', tabindex: '0', 'aria-label': m.name + ' says: ' + c.lead + ' ' + c.body + '. Drag to My stack to keep it, or to Set aside.' });
        card.style.setProperty('--mc', m.col);
        const em = h('i', { class: 'bc-em', html: emblem(m.glyph) });
        card.append(h('div', { class: 'bc-fh' }, em, h('b', { text: m.name }), h('span', { text: m.title }), h('em', { text: m.role })));
        const leadEl = h('p', { class: 'bc-fl' }); card.append(leadEl);
        const body = h('p', { class: 'bc-fb' });
        if (c.chip) body.append(h('span', { class: 'bc-chip', text: c.chip }));
        body.append(c.user ? h('span', { class: 'gk-user', text: c.body }) : document.createTextNode(c.body));
        card.append(body);
        if (c.tail) { // the loop gag: each "what if…" pulses in turn
          const parts = c.tail.indexOf('… ') > 0 ? c.tail.split('… ').map((s, i, a) => (i < a.length - 1 ? s + '…' : s)) : [c.tail];
          const tl = h('p', { class: 'bc-tail', 'aria-hidden': 'true' }); parts.forEach((s, i) => { if (i) tl.append(document.createTextNode(' ')); tl.append(h('span', { text: s })); }); card.append(tl);
        }
        el.append(card);
        const f = { el: card, m, c, dx: 0, dy: 0 }; st.floor = f;
        placeFloor(f, true);
        ctx.ui.say(leadEl, c.lead, { tick: () => { if (A.ctx && Math.random() < 0.7) A.tone({ type: 'sine', freq: m.voice + Math.random() * 90, dur: 0.035, vol: 0.02 }); } });
        bindFloor(f);
        keepTray.classList.remove('off'); asideTray.classList.remove('off');
        if (st.heard === 1 || m.slug === 'loopie') say(SAY.keep);
        S.later(() => { if (st.floor === f) stackGuide(); }, RM() ? 600 : 1500);
      }
      function placeFloor(f, enter) {
        const card = f.el; card.style.width = G.cardW + 'px';
        const ch = card.offsetHeight, top = G.cardY + Math.max(0, (G.cardMaxH - ch) / 2) * (G.phone ? 0.25 : 0.5);
        f.x = G.cardX; f.y = top; f.h = ch;
        Object.assign(card.style, { left: G.cardX + 'px', top: top + 'px' });
        if (enter) {
          const p = G.seats[f.m.seat], dx = p.x - (G.cardX + G.cardW / 2), dy = p.y - (top + ch / 2);
          card.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(.2)'; card.style.opacity = '0';
          void card.offsetWidth; card.classList.add('fly'); card.style.transform = ''; card.style.opacity = '1';
          S.later(() => card.classList.remove('fly'), 520);
          if (A.ctx) A.paper({ when: A.now() + 0.05, vol: 0.12 });
        }
      }
      function stackGuide() {
        const f = st.floor; if (!f || FD.drag) return;
        // anchored on the card's top edge, label above it: the guide never covers the words on the card
        const kr = K.rectIn(keepTray), fr = K.rectIn(f.el);
        K.guide({ id: 'stack' + st.heard, g: 'drag', target: f.el, ox: 0.5, oy: 0, dx: (kr.cx - fr.cx) * 0.8, dy: (kr.cy - fr.y) * 0.8, label: 'DRAG TO MY STACK', place: 'above', delay: 200 });
      }
      const FD = { drag: null, hot: null };
      function trayAt(p) { for (const t of [keepTray, asideTray]) { const r = K.rectIn(t); if (p.x > r.x - 18 && p.x < r.x + r.w + 18 && p.y > r.y - 26 && p.y < r.y + r.h + 18) return t; } return null; }
      function bindFloor(f) {
        K.drag(f.el, {
          space: el,
          start: (p) => { if (st.floor !== f || f.gone) return false; FD.drag = { ox: p.x - f.x, oy: p.y - f.y }; f.el.classList.add('lift'); K.guide(null); if (A.ctx) A.paper({ vol: 0.08 }); },
          move: (p) => {
            if (!FD.drag || st.floor !== f) return;
            const dx = p.x - FD.drag.ox - f.x, dy = p.y - FD.drag.oy - f.y; f.dx = dx; f.dy = dy;
            f.el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + clamp(dx * 0.05, -9, 9).toFixed(1) + 'deg) scale(' + (1 - clamp(dy / 600, 0, 0.25)).toFixed(3) + ')';
            const t = trayAt(p); if (t !== FD.hot) { if (FD.hot) FD.hot.classList.remove('hot'); FD.hot = t; if (t) { t.classList.add('hot'); if (A.ctx) A.chime(A.note(t === keepTray ? 'A5' : 'E5'), { vol: 0.03, dur: 0.4 }); } }
          },
          end: (p) => {
            if (!FD.drag) return; FD.drag = null; f.el.classList.remove('lift');
            if (FD.hot) FD.hot.classList.remove('hot');
            const t = FD.hot || trayAt(p); FD.hot = null;
            if (t) decide(f, t === keepTray);
            else { K.sfx.soft(); f.dx = 0; f.dy = 0; f.el.classList.add('fly'); f.el.style.transform = ''; S.later(() => f.el.classList.remove('fly'), 520); S.later(() => { if (st.floor === f) stackGuide(); }, 1200); }
          }
        });
        S.listen(f.el, 'keydown', (e) => { if (st.floor !== f) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); decide(f, true); } else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); decide(f, false); } });
      }
      [[keepTray, true], [asideTray, false]].forEach(([t, keep]) => { K.tap(t, () => { if (st.floor && !st.floor.gone && !FD.drag) decide(st.floor, keep); }); S.listen(t, 'keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && st.floor) { e.preventDefault(); decide(st.floor, keep); } }); });
      function decide(f, keep) {
        if (f.gone || st.floor !== f) return;
        f.gone = true; st.floor = null; st.phase = 'deciding'; K.guide(null);
        const tray = keep ? keepTray : asideTray, tr = K.rectIn(tray);
        const tx = tr.cx - (f.x + G.cardW / 2), ty = tr.cy - 10 - (f.y + f.h / 2);
        f.el.classList.add('fly'); f.el.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) rotate(' + (keep ? 6 : -6) + 'deg) scale(.16)'; f.el.style.opacity = '0';
        S.later(() => f.el.remove(), 520);
        const pile = tray.querySelector('.bc-pile'), mini = h('i'); mini.style.setProperty('--mc', f.m.col); mini.style.setProperty('--r', ((Math.random() - 0.5) * 16).toFixed(1) + 'deg'); mini.style.setProperty('--y', (-Math.min(10, pile.children.length * 2)) + 'px');
        S.later(() => pile.append(mini), 300);
        (keep ? st.kept : st.aside).push(f.m.slug);
        const n = (keep ? st.kept : st.aside).length; tray.querySelector('small').textContent = keep ? (n === 1 ? '1 card I agree with' : n + ' cards I agree with') : (n === 1 ? '1 card, no hard feelings' : n + ' cards, no hard feelings');
        if (keep) { K.sfx.good(undefined, 3 + st.kept.length); if (A.ctx) A.paper({ vol: 0.12 }); f.m.c.face('love', 1600); f.m.c.react('bounce'); P.emit('star', tr.cx, tr.y + 10, 10, { colors: [f.m.col, '#fff6d8'] }); }
        else { K.sfx.soft(); if (A.ctx) A.paper({ vol: 0.08, freq: 1800 }); f.m.c.face(f.m.slug === 'loopie' ? 'shy' : 'wink', 1600); }
        st.spot = null;
        ctx.track('card', { k: f.m.i, keep: keep ? 1 : 0 });
        S.later(next, 560);
      }

      /* ---------------- the running order: three views, then Loopie grabs the Susan, then the rest, then the vote ---------------- */
      async function next() {
        const loopie = MEMBERS.find(m => m.slug === 'loopie');
        if (st.lastWasLoopie) { st.lastWasLoopie = false; await afterLoopie(); }
        if (st.heard >= 7) { vote(); return; }
        if (st.heard === 3 && !loopie.heard && !st.loopieOpen) { loopieGrab(); return; }
        st.phase = 'spin';
        say(SAY.again[st.heard % 2]);
        spinGuide(st.heard > 2 ? 1400 : 900);
      }
      function loopieGrab() {
        const lp = MEMBERS.find(m => m.slug === 'loopie');
        st.loopieOpen = true; st.phase = 'loopieSpin'; st.lastWasLoopie = true; st.dimTo = 1;
        say(SAY.loopie);
        lp.c.face('silly'); lp.c.react('spin');
        MEMBERS.forEach(o => { if (o !== lp) o.c.face('surprised', 1600); });
        MUS.mode = 'loop';
        if (A.ctx) { const t = A.now(); A.noise({ when: t, filter: 'lowpass', freq: 400, to: 140, dur: 1.1, attack: 0.1, vol: 0.16, pink: true }); A.tone({ when: t, type: 'sawtooth', freq: 180, to: 90, glide: 0.9, dur: 1, vol: 0.035, lp: 700 }); }
        const d = wrap(G.seats[lp.seat].a - SU.th), turns = RM() ? 0 : TAU * (d >= 0 ? 1 : -1);
        SU.tgt = { k: lp.seat, th: SU.th + d + turns }; SU.w = 0;
        ctx.track('twist', {});
      }
      async function afterLoopie() {
        const st2 = MEMBERS.find(m => m.slug === 'still'), lp = MEMBERS.find(m => m.slug === 'loopie');
        st.phase = 'aside';
        showNote(st2, L(care ? CARD.stillSeatCare : strong ? CARD.stillSeatStrong : CARD.stillSeat));
        st2.c.face('calm'); st2.c.react('bounce');
        if (A.ctx) { const t = A.now(); A.chime(A.note('D5'), { when: t, vol: 0.06, dur: 2 }); A.noise({ when: t, filter: 'lowpass', freq: 600, to: 200, dur: 1.6, attack: 0.5, vol: 0.05, pink: true }); }
        st.dimTo = 0; MUS.mode = 'major';
        await K.wait(RM() ? 1400 : 1100);
        st.plaque = h('div', { class: 'bc-plaque', text: '1 seat of 7' }); el.append(st.plaque); placePlaque();
        lp.c.base('calm'); lp.c.face('shy', 1400);
        say(SAY.loopieSeat);
        if (A.ctx) A.chime(A.note('G5'), { vol: 0.05, dur: 1.2 });
        await K.wait(RM() ? 1800 : 2600);
        hideNote();
      }
      function placePlaque() { const p = G.seats[7]; if (!st.plaque) return; Object.assign(st.plaque.style, { left: clamp(p.x, 60, G.W - 60) + 'px', top: Math.min(G.band - 30, p.y + G.cs / 2 + 4) + 'px' }); }
      function showNote(m, line) {
        hideNote();
        const n = h('div', { class: 'bc-note', role: 'status' }, h('b', { text: m.name + ' · ' + m.role }), h('span', { text: line }));
        n.style.setProperty('--mc', m.col); el.append(n); st.note = { el: n, m }; placeNote(st.note);
        st.spot = m; st.spotT = now();
      }
      function placeNote(nt) { const w = Math.min(G.W - 40, G.phone ? 330 : 440); nt.x = (G.W - w) / 2; nt.y = G.cardY + 10; nt.w = w; Object.assign(nt.el.style, { left: nt.x + 'px', top: nt.y + 'px', width: w + 'px' }); }
      function hideNote() { if (st.note) { const n = st.note.el; n.style.transition = 'opacity .35s ease'; n.style.opacity = '0'; S.later(() => n.remove(), 380); st.note = null; } }

      /* ---------------- the vote: glowing tokens into two bowls, then your token, then the verdict ---------------- */
      const BOWL_NAMES = strong ? ['A spiral', 'A plan'] : ['The scary story', 'More to the story'];
      const tokens = [];
      let bowlEls = null, chairTok = null;
      function placeBowls() {
        const W = G.W, by = G.band + (G.phone ? 70 : 64), dx = G.phone ? W * 0.25 : Math.min(260, W * 0.2), rb = G.phone ? 46 : 56;
        G.bowls = [{ x: G.cx - dx, y: by, r: rb }, { x: G.cx + dx, y: by, r: rb }];
        if (bowlEls) bowlEls.forEach((b, i) => Object.assign(b.style, { left: G.bowls[i].x + 'px', top: (by + rb * 0.62 + 10) + 'px' }));
        if (chairTok && !chairTok.cast) Object.assign(chairTok.el.style, { left: G.cx + 'px', top: (G.phone ? G.H - 16 - 44 : by + 12) + 'px' });
      }
      async function vote() {
        st.phase = 'vote'; st.spot = null; K.guide(null);
        say(SAY.allHeard);
        keepTray.classList.add('off'); asideTray.classList.add('off'); fanEl.classList.add('off');
        if (st.plaque) { st.plaque.style.transition = 'opacity .4s ease'; st.plaque.style.opacity = '0'; }
        MUS.layer = 8;
        bowlEls = BOWL_NAMES.map((n, i) => { const b = h('div', { class: 'bc-bowl off' }, h('b', { text: n }), h('span', { text: '0' })); b.style.zIndex = '22'; el.append(b); return b; });
        st.bowls = true; placeBowls(); st.bowlT = now();
        await K.wait(60); bowlEls.forEach(b => b.classList.remove('off'));
        if (A.ctx) A.whoosh({ vol: 0.1, dur: 0.5 });
        await K.wait(RM() ? 500 : 900);
        // each member, round the table from your left, lights a token and sends it home
        const order = MEMBERS.slice().sort((a, b) => a.seat - b.seat);
        const ARP = ['D4', 'F#4', 'A4', 'D5', 'F#5', 'A5', 'D6'];
        for (let i = 0; i < order.length; i++) {
          const m = order[i], bi = strong ? 1 : (m.slug === 'loopie' ? 0 : 1);
          m.c.face('determined', 700);
          launchToken(m, bi, ARP[i], i);
          await K.wait(RM() ? 260 : [460, 380, 330][inten]);
        }
        await K.wait(RM() ? 600 : 900);
        // the chair's token
        st.phase = 'chair'; say(SAY.chair);
        const tok = h('button', { type: 'button', class: 'bc-token idle', 'aria-label': 'Your token, Chair. Drag it into a bowl, or press 1 for the left bowl, 2 for the right.', text: 'YOU' });
        el.append(tok); chairTok = { el: tok, cast: false }; placeBowls();
        if (A.ctx) A.chime(A.note('A5'), { vol: 0.06, dur: 1.2 });
        bindChair(tok);
        chairGuide(900);
        await new Promise(res => { st.waits.chair = res; });
        await K.wait(RM() ? 500 : 900);
        verdict();
      }
      function chairGuide(delay) { if (!chairTok || chairTok.cast) return; const b = G.bowls[1], tr = K.rectIn(chairTok.el); K.guide({ id: 'chair', g: 'drag', target: chairTok.el, dx: (b.x - tr.cx) * 0.8, dy: (b.y - tr.cy) * 0.8, label: 'DROP YOUR TOKEN IN', place: 'below', delay: delay || 900 }); }
      function launchToken(m, bi, note, i) {
        const p = G.seats[m.seat], b = G.bowls[bi];
        tokens.push({ x0: p.x, y0: p.y - G.cs * 0.62, x1: b.x + (Math.random() - 0.5) * b.r * 0.5, y1: b.y - b.r * 0.1, t0: now() + 220, dur: RM() ? 420 : 760, col: m.col, bi, note, m, i, done: false });
        P.emit('spark', p.x, p.y - G.cs * 0.62, 10, { colors: [m.col, '#fff6d8'], speed: [40, 120] });
        if (A.ctx) A.tone({ type: 'sine', freq: A.note(note) * 2, dur: 0.18, vol: 0.025 });
      }
      function tokenLanded(tk) {
        st.votes[tk.bi]++;
        const b = bowlEls[tk.bi]; b.querySelector('span').textContent = String(st.votes[tk.bi]); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
        if (A.ctx) { A.chime(A.note(tk.note), { vol: 0.08, dur: 1.6 }); A.tone({ type: 'sine', freq: A.note(tk.note) * 4, dur: 0.12, vol: 0.02 }); }
        const bw = G.bowls[tk.bi]; P.emit('star', bw.x, bw.y - bw.r * 0.2, 8, { colors: [tk.col, '#fff6d8'], speed: [30, 110] });
        if (tk.m) { tk.m.c.face(tk.bi === 0 && !strong ? 'wink' : 'happy', 1200); }
      }
      function bindChair(tok) {
        const T = { drag: null };
        const cast = (bi) => {
          if (!chairTok || chairTok.cast) return; chairTok.cast = true; st.chairVote = bi; K.guide(null);
          const r = K.rectIn(tok); tok.style.opacity = '0';
          tokens.push({ x0: r.cx, y0: r.cy, x1: G.bowls[bi].x, y1: G.bowls[bi].y - G.bowls[bi].r * 0.1, t0: now(), dur: RM() ? 300 : 480, col: '#ffd36b', bi, note: 'D6', m: null, done: false, chair: true });
          K.sfx.great();
          ctx.track('vote', { chair: bi });
          S.later(() => tok.remove(), 420);
        };
        K.drag(tok, {
          space: el,
          start: (p) => { if (chairTok.cast) return false; tok.classList.remove('idle'); T.drag = { ox: p.x, oy: p.y }; K.guide(null); K.sfx.tap(); },
          move: (p) => { if (!T.drag) return; tok.style.transform = 'translate(' + (p.x - T.drag.ox).toFixed(1) + 'px,' + (p.y - T.drag.oy).toFixed(1) + 'px) scale(1.08)'; },
          end: (p) => {
            if (!T.drag) return; T.drag = null;
            const bi = G.bowls.findIndex(b => Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.5);
            if (bi >= 0) cast(bi);
            else { K.sfx.soft(); tok.style.transition = 'transform .35s cubic-bezier(.2,1.3,.4,1)'; tok.style.transform = ''; S.later(() => { tok.style.transition = ''; tok.classList.add('idle'); }, 380); chairGuide(1400); }
          }
        });
        S.listen(tok, 'keydown', (e) => { if (e.key === '1' || e.key === 'ArrowLeft') { e.preventDefault(); cast(0); } else if (e.key === '2' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); cast(1); } });
      }

      /* ---------------- the verdict prints; you seal it ---------------- */
      async function verdict() {
        st.phase = 'verdict'; say(SAY.printing);
        bowlEls.forEach(b => b.classList.add('off')); st.bowlsOut = now();
        st.blazeTo = 1; st.ringT = now(); MUS.layer = 9;
        MEMBERS.forEach((m, i) => S.later(() => { m.c.face(m.slug === 'loopie' ? 'peace' : 'celebrate'); m.c.react('bounce'); }, 90 * i));
        const scary = st.votes[0], other = st.votes[1], nk = st.kept.length;
        const stackTxt = nk ? 'your stack: ' + nk + ' card' + (nk === 1 ? '' : 's') : 'heard all seven';
        const vsub = (strong ? 'A plan: ' + other + ' of 8 tokens' : 'The scary story: ' + scary + ' of 8 tokens') + ' · ' + stackTxt;
        // the next step comes from the cards you kept: Rush's step, else Still's, else the reading's own
        const stepCard = care ? null : ['rush', 'still'].find(s => st.kept.includes(s));
        st.next = stepCard ? cardFor(stepCard).body : NEXT;
        const seal = h('button', { type: 'button', class: 'bc-seal', 'aria-label': 'Wax seal. Press and hold to seal the verdict.', html: '<svg viewBox="0 0 40 40" aria-hidden="true">' + Array.from({ length: 7 }, (_, i) => { const a = -HALF + i * TAU / 7; return '<circle cx="' + (20 + Math.cos(a) * 11).toFixed(1) + '" cy="' + (20 + Math.sin(a) * 11).toFixed(1) + '" r="2.6" fill="currentColor"/>'; }).join('') + '<circle cx="20" cy="20" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' }, h('b', { text: 'HOLD' }));
        const kids = [h('div', { class: 'bc-vtop' }, h('div', { class: 'bc-vh', text: strong ? 'The council’s plan' : 'Verdict of the council' }), h('div', { class: 'bc-vs', text: vsub })), h('p', { class: 'bc-vt', text: FAIR })];
        kids.push(h('div', { class: 'bc-vn' }, h('small', { text: care ? 'Next step: proper advice' : 'Next step' }), h('span', { text: st.next })));
        const v = h('div', { class: 'bc-verdict', role: 'status', 'aria-live': 'polite' }, ...kids, seal);
        el.append(v); st.verdict = v; placeVerdict();
        // the print: paper feeds out line by line
        const t0 = now(), dur = RM() ? 500 : 1600;
        if (A.ctx) { const t = A.now(); A.thud({ when: t, vol: 0.22 }); A.wood(t, 0.2, 0.5); for (let i = 0; i < 12; i++) A.click({ when: t + 0.08 + i * dur / 12000, vol: 0.05 }); A.paper({ when: t + 0.05, dur: dur / 1000, vol: 0.1 }); }
        await new Promise(res => { const step = () => { const k = clamp((now() - t0) / dur, 0, 1); v.style.setProperty('--rev', (k * 100).toFixed(1) + '%'); if (k < 1) S.later(step, 30); else res(); }; step(); });
        v.style.setProperty('--rev', '100%');
        K.sfx.win();
        await K.wait(RM() ? 500 : 900);
        say(SAY.seal);
        st.phase = 'seal';
        K.hold(seal, {
          ms: 850,
          start: () => { if (A.ctx) A.tone({ type: 'sine', freq: 140, to: 200, glide: 0.8, dur: 0.85, vol: 0.05 }); },
          progress: (k) => { seal.style.setProperty('--sq', (1 - k * 0.12).toFixed(3)); },
          cancel: () => { seal.style.setProperty('--sq', '1'); },
          done: () => sealIt(seal)
        });
        K.guide({ id: 'seal', g: 'hold', target: seal, label: 'HOLD TO SEAL', place: 'above', ms: 1200, delay: 700 });
      }
      function placeVerdict() {
        const v = st.verdict; if (!v) return;
        const w = G.phone ? G.W - 24 : Math.min(660, G.W - 80), room = G.H - 16 - G.band;
        Object.assign(v.style, { left: ((G.W - w) / 2) + 'px', width: w + 'px', maxHeight: room + 'px' });
        // on a wide screen the seal sits in the title row, left of the lower-right seat, so its guide never covers anyone
        const seal = v.querySelector('.bc-seal'); if (seal) { if (G.phone) { seal.style.left = ''; seal.style.right = '12px'; } else { seal.style.right = 'auto'; seal.style.left = Math.round(w * 0.5 + 70) + 'px'; } }
        v.style.top = (G.band + Math.max(0, (room - v.offsetHeight) * 0.4)) + 'px';
      }
      function sealIt(seal) {
        if (st.sealed) return; st.sealed = true; K.guide(null);
        seal.classList.add('done'); seal.style.setProperty('--sq', '1');
        if (A.ctx) { const t = A.now(); A.tone({ when: t, type: 'sine', freq: 230, to: 80, glide: 0.22, dur: 0.3, vol: 0.22 }); A.noise({ when: t, filter: 'lowpass', freq: 500, dur: 0.18, vol: 0.18 }); }
        K.sfx.sparkle(); S.buzz && S.buzz([12, 30, 12]);
        const r = K.rectIn(seal); P.emit('confetti', r.cx, r.cy, 26, { colors: MEMBERS.map(m => m.col) }); P.emit('star', r.cx, r.cy, 14, { colors: ['#fff6d8', '#ffd36b'] });
        say(care ? SAY.sealedCare : strong ? SAY.sealedPlan : SAY.sealed);
        st.ringBoost = now();
        S.later(() => say(SAY.tomorrow, { room: NEXT_ROOM.name }), RM() ? 900 : 1500);
        S.later(finishGame, RM() ? 1900 : 3000);
      }
      function finishGame() {
        if (st.finished) return; st.finished = true;
        const sm = SU.smooth.length ? SU.smooth.reduce((a, b) => a + b, 0) / SU.smooth.length : 0, pct = Math.round(sm * 100);
        const tier = SU.smooth.length ? K.tier(sm, [0.35, 0.55, 0.72]) : '', best = SU.smooth.length ? K.best('smooth', pct, 'higher') : null;
        let fresh = 0; MEMBERS.forEach(m => { if (K.collect('card:' + m.slug + ':' + VARIANT(m.i)).isNew) fresh++; });
        const roomNew = K.collect('room:' + ROOM.key).isNew;
        const cards = K.collection().filter(x => typeof x === 'string' && x.indexOf('card:') === 0).length;
        const badges = [];
        if (tier) badges.push(tier + ': smooth spinner');
        if (best && best.isNew) badges.push('New best: ' + pct + '% smooth spins');
        if (fresh) badges.push('Council cards: ' + Math.min(21, cards) + ' of 21');
        if (roomNew) badges.push('New room: ' + cap1(ROOM.name.replace(/^the /, '')));
        const scary = st.votes[0];
        const lines = [strong ? 'Seven views on the same facts, and a plan' : 'Heard seven views on the same facts', strong ? 'The council voted for a plan' : 'The scary story got ' + scary + ' of 8 tokens (one seat of seven)'];
        lines.push(care ? 'Next: proper advice. ' + clip(st.next || NEXT, 70) : 'Next step: ' + clip(st.next || NEXT, 80));
        const share = strong ? 'Called a council of 7. We voted for a plan.' : 'Called a council of 7. The scary story got ' + scary + ' vote' + (scary === 1 ? '' : 's') + '.';
        ctx.finish({ title: strong ? 'A plan from the council' : 'The council has spoken', mood: 'celebrate', lines, share, badges: badges.slice(0, 4) });
      }

      /* ---------------- sound: a candlelit waltz that gains a voice with every member who speaks ---------------- */
      const NOTES = { patch: 'A4', drop: 'F#4', rush: 'D5', glitch: 'E5', still: 'D4', sync: 'B4', loopie: 'G4' };
      const MUS = { layer: 0, mode: 'major', on: false };
      const BPM = [66, 72, 78][inten];
      const PROG = { major: [['D2', ['F#4', 'A4', 'D5']], ['B1', ['F#4', 'B4', 'D5']], ['G1', ['G4', 'B4', 'D5']], ['A1', ['E4', 'A4', 'C#5']]], loop: [['D2', ['F4', 'A4', 'D5']], ['D2', ['F4', 'A#4', 'D5']], ['D2', ['F4', 'A4', 'D5']], ['C#2', ['E4', 'A4', 'C#5']]] };
      const R = K.rhythm({ bpm: BPM, perBar: 3, onBeat: (t, i, b) => playBeat(t, i, b) });
      function playBeat(t, i, b) {
        if (!A.ctx || !MUS.on) return;
        const lv = Math.max(MUS.layer, st.heard), loop = MUS.mode === 'loop', prog = loop ? PROG.loop : PROG.major, bar = Math.floor(i / 3) % 4, [bass, ch] = prog[bar], beat = 60 / BPM, fin = MUS.layer >= 9;
        if (b === 0) { A.tone({ when: t, type: 'sawtooth', freq: A.note(bass) * 2, dur: beat * 3.1, vol: 0.022 + (fin ? 0.01 : 0), attack: 0.35, lp: 480, bus: 'music' }); A.tone({ when: t, type: 'sine', freq: A.note(bass), dur: beat * 3, vol: 0.05, attack: 0.2, bus: 'music' }); }
        if (b === 0 && lv >= 2) A.pluck(A.note(bass) * 2, { when: t, vol: 0.2, damp: 0.993, lp: 900, bus: 'music' });
        if (b > 0) A.pluck(A.note(ch[(b + Math.floor(i / 3)) % 3]), { when: t, vol: lv >= 1 ? 0.075 : 0.045, damp: 0.991, lp: 3400, verb: 0.25, bus: 'music' });
        if (lv >= 3 && b === 0) A.chime(A.note(ch[2]) * 2, { when: t, vol: 0.03, dur: 1.4, bus: 'music' });
        if (lv >= 5 && b > 0) A.brush(t, 0.025, 0.12);
        if (loop && b > 0) { const n = ['A4', 'A#4', 'A4'][b % 3]; A.tone({ when: t + beat * 0.5, type: 'triangle', freq: A.note(n), dur: beat * 0.45, vol: 0.03, lp: 2000, bus: 'music' }); }
        if (fin && b === 0) A.pad(ch.map(n => A.note(n)), { when: t, dur: beat * 3.2, vol: 0.07, attack: 0.3 });
        if (fin && b === 2) A.chime(A.note(ch[(i / 3 | 0) % 3]) * 4, { when: t, vol: 0.02, dur: 1, bus: 'music' });
      }
      let rumble = null;
      function beds() { if (!A.ctx || rumble) return; rumble = A.loop({ pink: true, filter: 'lowpass', freq: 190, q: 0.9 }); S.onDestroy(() => rumble && rumble.stop()); }
      beds(); S.on('audio-ready', beds);
      const amb = K.ambience(ROOM.view === 'rain' ? 'rain' : 'room'); amb.level(ROOM.view === 'rain' ? 0.35 : 0.5, 1.5);
      function motif(slug) {
        if (!A.ctx) return; const t = A.now() + 0.05;
        if (slug === 'patch') { A.pluck(A.note('A4'), { when: t, vol: 0.2, damp: 0.996, verb: 0.3 }); A.pluck(A.note('C#5'), { when: t + 0.12, vol: 0.18, damp: 0.996, verb: 0.3 }); A.pad(['A3', 'C#4', 'E4'].map(n => A.note(n)), { when: t, dur: 1.6, vol: 0.06, attack: 0.2 }); }
        else if (slug === 'drop') { A.tone({ when: t, type: 'sine', freq: 1300, to: 420, glide: 0.12, dur: 0.18, vol: 0.12 }); A.pluck(A.note('F#5'), { when: t + 0.14, vol: 0.16, damp: 0.997, verb: 0.5 }); }
        else if (slug === 'rush') { ['D5', 'F#5', 'A5', 'D6'].forEach((n, k) => A.tone({ when: t + k * 0.045, type: 'square', freq: A.note(n), dur: 0.08, vol: 0.03, lp: 2600 })); }
        else if (slug === 'glitch') { K.sfx.glitch(); A.tone({ when: t + 0.2, type: 'square', freq: A.note('E5'), dur: 0.07, vol: 0.03, lp: 3000 }); A.tone({ when: t + 0.28, type: 'square', freq: A.note('B5'), dur: 0.09, vol: 0.03, lp: 3000 }); }
        else if (slug === 'still') { A.chime(A.note('D5'), { when: t, vol: 0.09, dur: 2.6 }); A.noise({ when: t, filter: 'lowpass', freq: 700, to: 250, dur: 1.4, attack: 0.5, vol: 0.05, pink: true }); }
        else if (slug === 'sync') { A.tone({ when: t, type: 'sine', freq: 70, to: 50, dur: 0.18, vol: 0.22 }); A.tone({ when: t + 0.22, type: 'sine', freq: 62, to: 46, dur: 0.2, vol: 0.16 }); ['B4', 'D5', 'F#5'].forEach((n, k) => A.pluck(A.note(n), { when: t + 0.42 + k * 0.03, vol: 0.12, damp: 0.995 })); }
        else if (slug === 'loopie') { for (let r = 0; r < 3; r++) ['G4', 'A4', 'G4'].forEach((n, k) => A.tone({ when: t + r * 0.42 + k * 0.12, type: 'triangle', freq: A.note(n) * (1 - r * 0.01), dur: 0.11, vol: 0.06 * (1 - r * 0.28), lp: 1800 })); }
      }

      /* ---------------- the room: walls, a window onto today's view, the rug, the table (pre-rendered) ---------------- */
      function renderRoom() {
        const W = G.W, H = G.H, dpr = cv.dpr || 1, br = bright(), PA = pal();
        roomCv.width = Math.max(2, Math.round(W * dpr)); roomCv.height = Math.max(2, Math.round(H * dpr));
        const g = roomCv.getContext('2d', { alpha: false }); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, PA.wall[0]); gr.addColorStop(1, PA.wall[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        // wainscot line and the floor
        const fy = G.cy - G.ryT * 0.2;
        gr = g.createLinearGradient(0, fy, 0, H); gr.addColorStop(0, br ? '#b48a62' : '#2a1810'); gr.addColorStop(1, br ? '#8a6444' : '#120a07'); g.fillStyle = gr; g.fillRect(0, fy, W, H - fy);
        g.strokeStyle = br ? 'rgba(90,60,30,.25)' : 'rgba(0,0,0,.35)'; g.lineWidth = 1;
        for (let x = -H; x < W + H; x += G.phone ? 34 : 48) { g.beginPath(); g.moveTo(x, fy); g.lineTo(x + (x - G.cx) * 0.35, H); g.stroke(); }
        g.fillStyle = br ? 'rgba(255,255,255,.25)' : 'rgba(255,220,170,.08)'; g.fillRect(0, fy - 2, W, 2);
        drawWindow(g, br);
        drawProps(g, br, fy);
        // the rug under the table
        const rr = G.rx * 1.18, rv = (G.ry + G.cs * 0.3) * 1.08;
        g.save(); g.translate(G.cx, G.cy + G.ryT * 0.18); g.scale(1, rv / rr);
        gr = g.createRadialGradient(0, 0, rr * 0.2, 0, 0, rr); gr.addColorStop(0, PA.rug[0]); gr.addColorStop(1, PA.rug[1]); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.fill();
        g.strokeStyle = hexA('#e8c26a', br ? 0.55 : 0.35); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, rr * 0.93, 0, TAU); g.stroke();
        g.setLineDash([2, 7]); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, rr * 0.86, 0, TAU); g.stroke(); g.setLineDash([]);
        g.restore();
        // the table: shadow, apron, top with grain, rim
        const ap = G.phone ? 11 : 18;
        g.save(); g.globalAlpha = br ? 0.28 : 0.55; g.drawImage(K.glowSprite('#000000'), G.cx - G.rxT * 1.45, G.cy - G.ryT * 1.05 + ap * 2, G.rxT * 2.9, G.ryT * 2.6); g.restore();
        g.fillStyle = br ? '#5a3418' : '#2e180c'; g.beginPath(); g.ellipse(G.cx, G.cy + ap, G.rxT, G.ryT, 0, 0, TAU); g.fill();
        g.fillRect(G.cx - G.rxT, G.cy, G.rxT * 2, ap);
        gr = g.createLinearGradient(0, G.cy, 0, G.cy + G.ryT + ap); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.beginPath(); g.ellipse(G.cx, G.cy + ap, G.rxT, G.ryT, 0, 0, Math.PI); g.fill();
        gr = g.createRadialGradient(G.cx - G.rxT * 0.2, G.cy - G.ryT * 0.35, 4, G.cx, G.cy, G.rxT * 1.05);
        gr.addColorStop(0, br ? '#b8794a' : '#8a5230'); gr.addColorStop(0.65, br ? '#9a5e34' : '#6a3a20'); gr.addColorStop(1, br ? '#7a4524' : '#4a2614');
        g.fillStyle = gr; g.beginPath(); g.ellipse(G.cx, G.cy, G.rxT, G.ryT, 0, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.ellipse(G.cx, G.cy, G.rxT, G.ryT, 0, 0, TAU); g.clip();
        g.strokeStyle = br ? 'rgba(70,35,15,.16)' : 'rgba(20,8,2,.28)'; g.lineWidth = 1.2;
        const rnd = K.rng(29);
        for (let y = G.cy - G.ryT; y < G.cy + G.ryT; y += G.phone ? 7 : 9) { g.beginPath(); for (let x = G.cx - G.rxT; x <= G.cx + G.rxT; x += 14) { const yy = y + Math.sin(x * 0.02 + y * 0.3) * 1.6 + (rnd() - 0.5) * 0.6; if (x === G.cx - G.rxT) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
        g.restore();
        g.strokeStyle = br ? 'rgba(255,230,190,.55)' : 'rgba(255,200,140,.32)'; g.lineWidth = 2; g.beginPath(); g.ellipse(G.cx, G.cy, G.rxT - 1, G.ryT - 1, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.beginPath(); g.ellipse(G.cx, G.cy, G.rxT * 0.985, G.ryT * 0.985, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke();
        // the Susan's base (it sits on a dark bearing ring)
        g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(G.cx, G.cy + (G.phone ? 6 : 9), G.R * 1.04, G.R * G.asp * 1.04, 0, 0, TAU); g.fill();
        g.fillStyle = br ? '#5a3418' : '#3a1e0e'; g.beginPath(); g.ellipse(G.cx, G.cy + (G.phone ? 4 : 6), G.R, G.R * G.asp, 0, 0, TAU); g.fill();
        // the chair's place (you): a brass plate at the table's front edge
        const px = G.cx, py = G.cy + G.ryT + ap * 0.5;
        g.fillStyle = '#c9a14a'; roundRect(g, px - 26, py - 9, 52, 18, 5); g.fill();
        g.fillStyle = '#5a3a12'; g.font = '700 12px ' + (getComputedStyle(el).fontFamily || 'sans-serif'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('YOU', px, py + 0.5);
        // candlesticks on the table (their flames are drawn live)
        G.sticks = [-1, 1].map(s => { const a = -HALF + s * Math.PI / 8; return { x: G.cx + Math.cos(a) * G.rxT * 0.78, y: G.cy + Math.sin(a) * G.ryT * 0.78, h: G.phone ? 26 : 40 }; });
        G.sticks.forEach(c => drawCandleBody(g, c.x, c.y, c.h, G.phone ? 7 : 10, br));
        roomKey = W + 'x' + H + (br ? 'b' : 'd') + dpr;
      }
      function roundRect(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
      function winRect() { const ww = G.phone ? Math.min(G.W * 0.5, 190) : Math.min(G.W * 0.26, 330), top = G.head + (G.phone ? 6 : 10), bot = G.cy - G.ryT * 0.25; return { x: G.cx - ww / 2, y: top, w: ww, h: Math.max(60, bot - top) }; }
      function winPath(g, r) {
        g.beginPath();
        if (ROOM.win === 'round') { const rad = Math.min(r.w, r.h) / 2; g.arc(r.x + r.w / 2, r.y + rad, rad, 0, TAU); }
        else if (ROOM.win === 'dome') { g.moveTo(r.x - r.w * 0.2, r.y + r.h); g.lineTo(r.x - r.w * 0.2, r.y + r.w * 0.7); g.arc(r.x + r.w / 2, r.y + r.w * 0.7, r.w * 0.7, Math.PI, 0); g.lineTo(r.x + r.w * 1.2, r.y + r.h); g.closePath(); }
        else if (ROOM.win === 'panes') { g.rect(r.x - r.w * 0.25, r.y, r.w * 1.5, r.h); }
        else { const rad = r.w / 2; g.moveTo(r.x, r.y + r.h); g.lineTo(r.x, r.y + rad); g.arc(r.x + rad, r.y + rad, rad, Math.PI, 0); g.lineTo(r.x + r.w, r.y + r.h); g.closePath(); }
      }
      function drawWindow(g, br) {
        const r = winRect();
        g.save(); winPath(g, r); g.clip();
        let gr = g.createLinearGradient(0, r.y, 0, r.y + r.h);
        if (br) { gr.addColorStop(0, '#8ec5f0'); gr.addColorStop(1, '#e8f4ff'); } else { gr.addColorStop(0, '#060a1e'); gr.addColorStop(1, ROOM.view === 'sea' || ROOM.view === 'water' ? '#123048' : '#1a1838'); }
        g.fillStyle = gr; g.fillRect(r.x - r.w, r.y - 4, r.w * 3, r.h + 8);
        const rnd = K.rng(ROOM.key.length * 71);
        if (!br) { g.fillStyle = '#fff'; for (let i = 0; i < (ROOM.view === 'stars' ? 120 : 50); i++) { g.globalAlpha = 0.25 + rnd() * 0.7; const s = rnd() < 0.1 ? 1.8 : 1.1; g.fillRect(r.x - r.w * 0.3 + rnd() * r.w * 1.6, r.y + rnd() * r.h * 0.8, s, s); } g.globalAlpha = 1; }
        else { g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 3; i++) { const cx = r.x + r.w * (0.2 + i * 0.3), cy = r.y + r.h * (0.25 + (i % 2) * 0.15); g.beginPath(); g.ellipse(cx, cy, r.w * 0.16, r.h * 0.05, 0, 0, TAU); g.ellipse(cx + r.w * 0.08, cy - r.h * 0.03, r.w * 0.1, r.h * 0.05, 0, 0, TAU); g.fill(); } }
        if (ROOM.view === 'moon' || ROOM.view === 'stars' || ROOM.view === 'water') { const mx = r.x + r.w * 0.68, my = r.y + Math.min(r.h * 0.3, r.w * 0.3), mr = Math.max(9, r.w * 0.09); g.globalAlpha = br ? 0.5 : 0.9; g.drawImage(K.glowSprite(br ? '#fff6c8' : '#cfe0ff'), mx - mr * 4, my - mr * 4, mr * 8, mr * 8); g.globalAlpha = 1; g.fillStyle = br ? '#fffbe6' : '#f4f1e2'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill(); if (!br) { g.fillStyle = 'rgba(190,190,170,.35)'; g.beginPath(); g.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, TAU); g.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.16, 0, TAU); g.fill(); } }
        if (ROOM.view === 'sea' || ROOM.view === 'water') { const hz = r.y + r.h * 0.62; g.fillStyle = br ? '#4f8fb8' : '#0b2236'; g.fillRect(r.x - r.w, hz, r.w * 3, r.h); g.strokeStyle = br ? 'rgba(255,255,255,.5)' : 'rgba(180,210,255,.25)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { const y = hz + 5 + i * 7; g.beginPath(); g.moveTo(r.x + rnd() * r.w * 0.3, y); g.lineTo(r.x + r.w * (0.5 + rnd() * 0.5), y); g.stroke(); } }
        if (ROOM.view === 'leaves' || ROOM.props === 'plants') { g.fillStyle = br ? '#5d9a4e' : '#0f2a17'; for (let i = 0; i < 26; i++) { const lx = r.x - r.w * 0.2 + rnd() * r.w * 1.4, ly = r.y + (i % 2 ? r.h * 0.85 : 0) + (rnd() - 0.5) * r.h * 0.4; g.beginPath(); g.ellipse(lx, ly, 9 + rnd() * 9, 5 + rnd() * 4, rnd() * 3, 0, TAU); g.fill(); } }
        g.restore();
        // frame and muntins
        g.save(); g.strokeStyle = br ? '#7a5634' : '#3b2416'; g.lineWidth = G.phone ? 6 : 9; winPath(g, r); g.stroke();
        g.lineWidth = G.phone ? 2.5 : 3.5; g.beginPath();
        if (ROOM.win === 'panes') { for (let i = 1; i < 6; i++) { const x = r.x - r.w * 0.25 + r.w * 1.5 * i / 6; g.moveTo(x, r.y); g.lineTo(x, r.y + r.h); } for (let j = 1; j < 3; j++) { const y = r.y + r.h * j / 3; g.moveTo(r.x - r.w * 0.25, y); g.lineTo(r.x + r.w * 1.25, y); } }
        else if (ROOM.win === 'dome') { for (let i = -2; i <= 2; i++) { g.moveTo(r.x + r.w / 2, r.y + r.w * 0.7); g.lineTo(r.x + r.w / 2 + i * r.w * 0.36, r.y - r.w * 0.1); } }
        else { g.moveTo(r.x + r.w / 2, r.y); g.lineTo(r.x + r.w / 2, r.y + r.h); g.moveTo(r.x, r.y + r.h * 0.55); g.lineTo(r.x + r.w, r.y + r.h * 0.55); }
        g.stroke(); g.restore();
        G.win = r;
      }
      function drawProps(g, br, fy) {
        const W = G.W, c = br ? 'rgba(80,50,30,.22)' : 'rgba(0,0,0,.42)', c2 = br ? 'rgba(80,50,30,.14)' : 'rgba(255,220,170,.05)';
        if (ROOM.props === 'shelves') {
          [[0, 1], [W, -1]].forEach(([x0, s]) => { const sw = Math.min(W * 0.2, 150), top = G.head + 10; for (let k = 0; k < 4; k++) { const y = top + k * ((fy - top) / 4); g.fillStyle = c; g.fillRect(s > 0 ? x0 : x0 - sw, y + 24, sw, 4); const rnd = K.rng(k * 13 + (s > 0 ? 1 : 2)); let x = s > 0 ? x0 + 4 : x0 - sw + 4; while (x < (s > 0 ? x0 + sw - 8 : x0 - 8)) { const bw = 5 + rnd() * 8, bh = 14 + rnd() * 12; g.fillStyle = rnd() < 0.5 ? c : c2; g.fillRect(x, y + 24 - bh, bw, bh); x += bw + 1.5; } } });
        } else if (ROOM.props === 'beams') {
          g.strokeStyle = c; g.lineWidth = G.phone ? 10 : 16; g.beginPath(); g.moveTo(-20, G.head + 120); g.lineTo(W * 0.32, G.head - 30); g.moveTo(W + 20, G.head + 120); g.lineTo(W * 0.68, G.head - 30); g.stroke();
        } else if (ROOM.props === 'planks') {
          g.strokeStyle = c2; g.lineWidth = 2; for (let y = G.head; y < fy; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        } else if (ROOM.props === 'oars') {
          g.strokeStyle = c; g.lineWidth = 5; [[W * 0.06, 1], [W * 0.94, -1]].forEach(([x, s]) => { g.beginPath(); g.moveTo(x, G.head + 20); g.lineTo(x + s * 30, fy - 10); g.stroke(); g.fillStyle = c; g.beginPath(); g.ellipse(x + s * 30, fy - 10, 9, 26, s * 0.1, 0, TAU); g.fill(); });
        } else if (ROOM.props === 'plants') {
          g.fillStyle = c; [[W * 0.08, 1], [W * 0.92, -1]].forEach(([x]) => { const rnd = K.rng(Math.round(x)); for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(x + (rnd() - 0.5) * 60, fy - 30 - rnd() * 110, 16 + rnd() * 10, 6 + rnd() * 4, rnd() * 3, 0, TAU); g.fill(); } g.fillRect(x - 16, fy - 26, 32, 26); });
        }
      }
      function drawCandleBody(g, x, y, hh, w, br) {
        g.fillStyle = br ? '#8a6a3a' : '#5a4220'; g.beginPath(); g.ellipse(x, y, w * 1.4, w * 0.55, 0, 0, TAU); g.fill();
        g.fillStyle = '#e6d6b6'; g.fillRect(x - w / 2, y - hh, w, hh); g.fillStyle = '#fff8e6'; g.fillRect(x - w * 0.28, y - hh, w * 0.3, hh); g.fillStyle = 'rgba(120,90,50,.25)'; g.fillRect(x + w * 0.22, y - hh, w * 0.28, hh);
        g.fillStyle = '#f4ead4'; g.beginPath(); g.ellipse(x, y - hh, w / 2, w * 0.2, 0, 0, TAU); g.fill();
        g.strokeStyle = '#2a1a10'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y - hh); g.lineTo(x, y - hh - 3); g.stroke();
      }
      function renderSusan() {
        const R = G.R, dpr = Math.min(2, cv.dpr || 1), s = Math.max(2, Math.round(R * 2 * dpr)), br = bright();
        susanCv.width = s; susanCv.height = s;
        const g = susanCv.getContext('2d'); g.setTransform(s / (2 * R), 0, 0, s / (2 * R), R, R);
        let gr = g.createRadialGradient(-R * 0.2, -R * 0.25, R * 0.1, 0, 0, R);
        gr.addColorStop(0, br ? '#c08a56' : '#9a6238'); gr.addColorStop(0.7, br ? '#a06a3e' : '#7a4626'); gr.addColorStop(1, br ? '#7e4c2a' : '#5a321a');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(40,18,6,.22)'; g.lineWidth = 1; for (let r = R * 0.18; r < R * 0.9; r += R * 0.085) { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
        // brass rim and the eight notches (seven members and you)
        g.strokeStyle = '#c9a14a'; g.lineWidth = R * 0.07; g.beginPath(); g.arc(0, 0, R * 0.95, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(255,240,200,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R * 0.98, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
        for (let k = 0; k < 8; k++) { const a = k * STEP; g.fillStyle = '#ffe7a8'; g.beginPath(); g.arc(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95, R * 0.035, 0, TAU); g.fill(); }
        // the pointer: a long brass arrow at local angle 0
        g.fillStyle = '#e8c26a'; g.strokeStyle = '#6a4a14'; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(R * 0.18, -R * 0.045); g.lineTo(R * 0.8, -R * 0.045); g.lineTo(R * 0.8, -R * 0.12); g.lineTo(R * 1.02, 0); g.lineTo(R * 0.8, R * 0.12); g.lineTo(R * 0.8, R * 0.045); g.lineTo(R * 0.18, R * 0.045); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#c9a14a'; g.beginPath(); g.arc(0, 0, R * 0.16, 0, TAU); g.fill(); g.fillStyle = '#7a5a1c'; g.beginPath(); g.arc(0, 0, R * 0.07, 0, TAU); g.fill();
        susanKey = R.toFixed(1) + (br ? 'b' : 'd') + dpr;
      }

      /* ---------------- the frame ---------------- */
      const CANDLES = [0, 1, 2].map(i => ({ a: i * TAU / 3 + Math.PI / 3 }));
      function flame(g, x, y, sz, lean, t, seed, col) {
        const fl = 0.86 + 0.14 * Math.sin(t * 13 + seed * 7) * Math.sin(t * 7.3 + seed), hh = sz * fl * (1 + st.blaze * 0.5 + st.flare * 0.6) * (1 - st.dim * 0.35);
        g.save(); g.globalCompositeOperation = 'lighter';
        const gs = hh * (4.2 + st.blaze * 1.2); g.globalAlpha = (bright() ? 0.3 : 0.55) * (1 - st.dim * 0.4) * (1 - st.blaze * 0.25); g.drawImage(K.glowSprite(col || '#ffb347'), x - gs / 2, y - hh * 0.5 - gs / 2, gs, gs);
        g.restore();
        const tipx = x + lean * hh * 0.6, tipy = y - hh;
        g.fillStyle = '#ffd98a'; g.beginPath(); g.moveTo(x - hh * 0.22, y - hh * 0.18); g.quadraticCurveTo(x - hh * 0.24, y - hh * 0.62, tipx, tipy); g.quadraticCurveTo(x + hh * 0.24, y - hh * 0.62, x + hh * 0.22, y - hh * 0.18); g.quadraticCurveTo(x, y + hh * 0.08, x - hh * 0.22, y - hh * 0.18); g.fill();
        g.fillStyle = '#fff8e0'; g.beginPath(); g.ellipse(x + lean * hh * 0.15, y - hh * 0.3, hh * 0.09, hh * 0.2, lean * 0.4, 0, TAU); g.fill();
      }
      let lastT = 0;
      K.loop((dt, t) => {
        const g = cv.g; if (!g || !G.W) return;
        const tn = now(); lastT = t;
        physics(dt);
        st.dim += (st.dimTo - st.dim) * Math.min(1, dt * 2.5); st.blaze += (st.blazeTo - st.blaze) * Math.min(1, dt * 1.4); st.flare = Math.max(0, st.flare - dt * 1.2);
        const W = G.W, H = G.H, dpr = cv.dpr || 1, br = bright();
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (roomKey !== W + 'x' + H + (br ? 'b' : 'd') + dpr) renderRoom();
        g.drawImage(roomCv, 0, 0, W, H);
        // live window: rain on the attic glass, the lighthouse beam sweeping outside
        if (G.win && (ROOM.view === 'rain' || ROOM.view === 'sea')) {
          const r = G.win; g.save(); winPath(g, r); g.clip();
          if (ROOM.view === 'rain') { g.strokeStyle = br ? 'rgba(80,110,150,.45)' : 'rgba(170,190,230,.38)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 22; i++) { const x = r.x + ((i * 37.3 + t * 30) % r.w), y = r.y + ((i * 53.1 + t * 210) % r.h); g.moveTo(x, y); g.lineTo(x - 2, y + 9); } g.stroke(); }
          else { const a = (t * 0.6) % TAU, bx = r.x + r.w * 0.82, by = r.y + r.h * 0.6; g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,240,190,' + (0.12 + 0.18 * Math.max(0, Math.cos(a))).toFixed(3) + ')'; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(a + 0.12) * r.w * 2, by - Math.abs(Math.sin(a + 0.12)) * r.h); g.lineTo(bx + Math.cos(a - 0.12) * r.w * 2, by - Math.abs(Math.sin(a - 0.12)) * r.h); g.closePath(); g.fill(); }
          g.restore();
        }
        // the twist darkens the room (and Loopie's spiral turns over the table); the finale warms it
        if (st.dim > 0.01) {
          g.fillStyle = 'rgba(24,6,34,' + (st.dim * (br ? 0.38 : 0.5)).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
        }
        // the pool of candlelight on the table
        g.save(); g.globalCompositeOperation = 'lighter';
        const pool = (br ? 0.16 : 0.32) * (1 + st.blaze * 0.45 + st.flare * 0.6) * (1 - st.dim * 0.5) * (0.94 + 0.06 * Math.sin(t * 9.1) * Math.sin(t * 5.3));
        g.globalAlpha = Math.min(1, pool); g.drawImage(K.glowSprite('#ffb347'), G.cx - G.rxT * 1.3, G.cy - G.ryT * 1.4, G.rxT * 2.6, G.ryT * 2.6);
        if (st.blaze > 0.02) { g.globalAlpha = st.blaze * (br ? 0.06 : 0.1); g.drawImage(K.glowSprite('#ffc46a'), G.cx - G.rx * 1.5, G.cy - G.ry * 1.5, G.rx * 3, G.ry * 3); }
        // the member with the floor: a warm spotlight in their colour
        if (st.spot) { const p = G.seats[st.spot.seat], k = smooth(0, 400, tn - st.spotT); g.globalAlpha = k * (br ? 0.3 : 0.48); const gs = G.cs * 2.6; g.drawImage(K.glowSprite(st.spot.col), p.x - gs / 2, p.y - gs / 2, gs, gs); }
        g.restore();
        // the Susan and what sits on it
        if (susanKey !== G.R.toFixed(1) + (br ? 'b' : 'd') + Math.min(2, dpr)) renderSusan();
        g.save(); g.translate(G.cx, G.cy); g.scale(1, G.asp); g.rotate(SU.th); g.drawImage(susanCv, -G.R, -G.R, G.R * 2, G.R * 2);
        if (st.dealt && st.phase !== 'verdict' && st.phase !== 'seal' && st.phase !== 'end') drawCase(g, tn);
        g.restore();
        // candles: two sticks on the table, three riding the Susan (their flames lean against the spin)
        const list = G.sticks ? G.sticks.map((c, i) => ({ x: c.x, y: c.y, h: c.h, w: G.phone ? 7 : 10, stick: true, seed: i * 3.1 })) : [];
        CANDLES.forEach((c, i) => { const a = SU.th + c.a, x = G.cx + Math.cos(a) * G.R * 0.7, y = G.cy + Math.sin(a) * G.R * 0.7 * G.asp; list.push({ x, y, h: G.phone ? 15 : 24, w: G.phone ? 6 : 9, lean: clamp(SU.w * Math.sin(a) * 0.12, -0.9, 0.9), seed: 9 + i * 2.3 }); });
        list.sort((a, b) => a.y - b.y);
        list.forEach(c => { if (!c.stick) drawCandleBody(g, c.x, c.y, c.h, c.w, br); flame(g, c.x, c.y - c.h - 2, G.phone ? 9 : 14, (c.lean || 0) + Math.sin(t * 2 + c.seed) * 0.08, t, c.seed); });
        if (st.dim > 0.03) { // Loopie's spiral turns over the table while the scary story has the floor
          g.save(); g.translate(G.cx, G.cy); g.scale(1, G.asp); g.rotate(-t * (RM() ? 0.2 : 1.1)); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
          g.strokeStyle = 'rgba(208,75,255,' + (st.dim * 0.3).toFixed(3) + ')'; g.lineWidth = G.phone ? 5 : 8;
          for (let arm = 0; arm < 3; arm++) { g.beginPath(); for (let s = 0; s <= 40; s++) { const u = s / 40, a = arm * TAU / 3 + u * 5.2, r = G.R * (0.15 + u * 0.95); if (s) g.lineTo(Math.cos(a) * r, Math.sin(a) * r); else g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); }
          g.restore();
        }
        // the thread from the speaker to the card you're holding
        drawThread(g, tn, t);
        drawTokens(g, tn);
        if (st.bowls) drawBowls(g, tn, t);
        if (st.ringT) drawRing(g, tn, t);
        P.update(dt); P.draw(g);
      });
      function drawCase(g, tn) {
        const R = G.R, k = st.dealT ? clamp((tn - st.dealT) / 380, 0, 1) : 1, sc = (0.4 + 0.6 * K.ease.outBack(k)) * R / 80;
        g.save(); g.rotate(-0.35); g.scale(sc, sc);
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(-34, -20, 70, 46);
        g.fillStyle = '#f6ead0'; g.fillRect(-36, -24, 70, 46);
        g.fillStyle = 'rgba(60,35,15,.55)'; [-12, -4, 4, 12].forEach((y, i) => g.fillRect(-28, y, i === 3 ? 30 : 52, 3));
        g.fillStyle = '#b3243a'; g.beginPath(); g.arc(24, 12, 6, 0, TAU); g.fill();
        g.restore();
      }
      function drawThread(g, tn, t) {
        // the card's place is known (no layout reads per frame): its slot plus the drag offset
        const f = st.floor ? { m: st.floor.m, x: st.floor.x + (st.floor.dx || 0), y: st.floor.y + (st.floor.dy || 0), w: G.cardW } : st.note ? st.note : null;
        if (!f || !f.m || f.x == null) return;
        const p = G.seats[f.m.seat];
        const x0 = p.x, y0 = p.y + G.cs * 0.48, x1 = f.x + f.w / 2, y1 = f.y + 2, mx = (x0 + x1) / 2 + (x0 - G.cx) * 0.25, my = Math.min(y0, y1) + Math.abs(y1 - y0) * 0.35;
        const k = smooth(0, 450, tn - st.spotT);
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = hexA(f.m.col, 0.55 * k); g.lineWidth = 2.2; g.setLineDash([5, 7]); g.lineDashOffset = -tn / 40;
        g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(mx, my, x1, y1); g.stroke(); g.setLineDash([]);
        for (let i = 0; i < 3; i++) { const u = ((tn / 1400) + i / 3) % 1, x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1, y = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1; g.globalAlpha = k * Math.sin(u * Math.PI); g.drawImage(K.glowSprite(f.m.col), x - 9, y - 9, 18, 18); }
        g.restore(); void t;
      }
      function drawTokens(g, tn) {
        for (const tk of tokens) {
          if (tk.done && tn - tk.t0 > tk.dur + 400) continue;
          const k = clamp((tn - tk.t0) / tk.dur, 0, 1); if (tn < tk.t0) { // a lit token waiting above its owner
            g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9; g.drawImage(K.glowSprite(tk.col), tk.x0 - 16, tk.y0 - 16, 32, 32); g.restore(); continue; }
          const e = K.ease.inOutCubic(k), x = lerp(tk.x0, tk.x1, e), lift = Math.min(G.H * 0.2, 60 + Math.abs(tk.x1 - tk.x0) * 0.2), y = lerp(tk.y0, tk.y1, e) - Math.sin(e * Math.PI) * lift;
          if (k >= 1 && !tk.done) { tk.done = true; tokenLanded(tk); if (tk.chair) { const w = st.waits.chair; st.waits.chair = null; if (w) S.later(w, 200); } }
          if (k >= 1) continue;
          g.save(); g.globalCompositeOperation = 'lighter';
          for (let j = 1; j <= 4; j++) { const e2 = K.ease.inOutCubic(Math.max(0, k - j * 0.035)), x2 = lerp(tk.x0, tk.x1, e2), y2 = lerp(tk.y0, tk.y1, e2) - Math.sin(e2 * Math.PI) * lift; g.globalAlpha = 0.5 - j * 0.1; g.drawImage(K.glowSprite(tk.col), x2 - 10, y2 - 10, 20, 20); }
          g.globalAlpha = 1; g.drawImage(K.glowSprite(tk.col), x - 18, y - 18, 36, 36);
          g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.fill();
          g.restore();
        }
      }
      function drawBowls(g, tn, t) {
        if (!G.bowls) return;
        const out = st.bowlsOut ? 1 - smooth(0, 500, tn - st.bowlsOut) : smooth(0, 500, tn - (st.bowlT || 0));
        if (out <= 0.01) return;
        G.bowls.forEach((b, i) => {
          const fill = clamp(st.votes[i] / 8, 0, 1), col = i === 0 ? '#d04bff' : '#ffd36b';
          g.save(); g.globalAlpha = out;
          g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(b.x, b.y + b.r * 0.62, b.r * 0.9, b.r * 0.2, 0, 0, TAU); g.fill();
          // glass bowl body
          g.fillStyle = bright() ? 'rgba(255,255,255,.35)' : 'rgba(200,220,255,.12)'; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(b.x - b.r, b.y - b.r * 0.2); g.quadraticCurveTo(b.x - b.r, b.y + b.r * 0.6, b.x, b.y + b.r * 0.6); g.quadraticCurveTo(b.x + b.r, b.y + b.r * 0.6, b.x + b.r, b.y - b.r * 0.2); g.fill(); g.stroke();
          // the light inside rises with the votes
          if (fill > 0) { g.save(); g.beginPath(); g.moveTo(b.x - b.r, b.y - b.r * 0.2); g.quadraticCurveTo(b.x - b.r, b.y + b.r * 0.6, b.x, b.y + b.r * 0.6); g.quadraticCurveTo(b.x + b.r, b.y + b.r * 0.6, b.x + b.r, b.y - b.r * 0.2); g.closePath(); g.clip();
            const lvl = b.y + b.r * 0.6 - fill * b.r * 0.85; g.fillStyle = hexA(col, 0.65); g.fillRect(b.x - b.r, lvl + Math.sin(t * 3 + i) * 1.5, b.r * 2, b.r * 2);
            g.globalCompositeOperation = 'lighter'; g.globalAlpha = out * 0.8; g.drawImage(K.glowSprite(col), b.x - b.r * 1.3, lvl - b.r * 0.6, b.r * 2.6, b.r * 1.6); g.restore(); }
          g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2; g.beginPath(); g.ellipse(b.x, b.y - b.r * 0.2, b.r, b.r * 0.22, 0, 0, TAU); g.stroke();
          g.restore();
        });
      }
      function drawRing(g, tn, t) {
        // seven lights circle the table once the vote is in, then hold a slow halo
        const k = smooth(0, 1200, tn - st.ringT), boost = st.ringBoost ? Math.exp(-(tn - st.ringBoost) / 700) : 0, spd = RM() ? 0.05 : 0.5 + boost * 3;
        st.ring += spd * (1 / 60);
        const rr = G.phone ? 3.4 : 4.6;
        MEMBERS.forEach((m, i) => {
          const a = st.ring + i * TAU / 7, x = G.cx + Math.cos(a) * G.rxT * 0.86, y = G.cy + Math.sin(a) * G.ryT * 0.86 - 6;
          g.save(); g.globalCompositeOperation = 'lighter';
          for (let j = 1; j <= 4; j++) { const a2 = a - j * 0.055 * (spd + 0.35), x2 = G.cx + Math.cos(a2) * G.rxT * 0.86, y2 = G.cy + Math.sin(a2) * G.ryT * 0.86 - 6; g.globalAlpha = k * (0.3 - j * 0.06); g.drawImage(K.glowSprite(m.col), x2 - 7, y2 - 7, 14, 14); }
          g.globalAlpha = k * (0.5 + boost * 0.3); const s = 20 + boost * 14; g.drawImage(K.glowSprite(m.col), x - s / 2, y - s / 2, s, s);
          g.restore();
          // a crisp coloured light with a bright heart, so each member's token reads as theirs
          g.globalAlpha = k; g.fillStyle = m.col; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
          g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(x - rr * 0.25, y - rr * 0.25, rr * 0.42, 0, TAU); g.fill(); g.globalAlpha = 1;
        });
        void t;
      }
      cv.onResize(() => layout());
      S.on('theme', () => { roomKey = ''; susanKey = ''; });

      /* ---------------- flow ---------------- */
      (async () => {
        await K.intro({ title: 'Bubble Council', sub: 'One scary story. Seven bubbles with other views on the very same facts.', how: 'Deal your case. Spin the lazy Susan. Keep the cards you agree with.', char: 'glitch', mood: 'think' });
        layout();
        MUS.on = true; R.start(0.3);
        st.phase = 'deal';
        say(visits ? SAY.helloBack : SAY.hello);
        MEMBERS.forEach((m, i) => S.later(() => { m.c.face(i % 3 === 0 ? 'happy' : i % 3 === 1 ? 'wink' : 'wow', 900); }, 120 + i * 110));
        dealGuide(1100);
        await new Promise(res => { st.waits.deal = res; });
        st.phase = 'spin';
        say(SAY.dealt);
        spinGuide(900);
      })();

      return {
        async autoplay() {
          const until = async (fn, ms) => { const t0 = now(); while (!fn()) { if (now() - t0 > (ms || 30000)) return false; await K.wait(90); } return true; };
          const intro = el.querySelector('.gk-intro'); if (intro) { await K.wait(600); await K.sim.tap(intro); }
          await until(() => st.phase === 'deal', 30000); await K.wait(900);
          { const r = K.rectIn(caseEl); await K.sim.drag(caseEl, { x: r.w / 2, y: r.h * 0.4 }, { x: r.w / 2 + (G.cx - r.cx), y: r.h * 0.4 + (G.cy - r.cy) }, 700, 16); }
          for (let n = 0; n < 7; n++) {
            await until(() => st.phase === 'spin' || st.phase === 'loopieSpin' || st.phase === 'floor', 30000);
            if (st.phase === 'spin') {
              await K.wait(700);
              const rad = Math.max(40, G.R * 0.85), a0 = Math.random() * TAU, turn = (0.9 + Math.random() * 0.8) * (n % 3 === 1 ? -1 : 1) * Math.PI, steps = 20;
              const p = await K.sim.press(hit, G.cx + Math.cos(a0) * rad, G.cy + Math.sin(a0) * rad * G.asp);
              for (let i = 1; i <= steps; i++) { await K.wait(32); const a = a0 + turn * i / steps; p.move(G.cx + Math.cos(a) * rad, G.cy + Math.sin(a) * rad * G.asp); }
              p.up(G.cx + Math.cos(a0 + turn) * rad, G.cy + Math.sin(a0 + turn) * rad * G.asp);
            }
            await until(() => st.phase === 'floor' && st.floor, 30000); await K.wait(1300);
            const f = st.floor; if (!f) continue;
            const keep = f.m.slug !== 'loopie' && !(n === 5);
            const tr = K.rectIn(keep ? keepTray : asideTray), fr = K.rectIn(f.el);
            await K.sim.drag(f.el, { x: fr.w / 2, y: fr.h / 2 }, { x: fr.w / 2 + (tr.cx - fr.cx), y: fr.h / 2 + (tr.cy - fr.cy) }, 650, 14);
            await until(() => st.floor !== f, 4000);
            if (st.floor === f) decide(f, keep);
          }
          await until(() => st.phase === 'chair' && chairTok, 40000); await K.wait(900);
          if (chairTok && !chairTok.cast) { const r = K.rectIn(chairTok.el), b = G.bowls[1]; await K.sim.drag(chairTok.el, { x: r.w / 2, y: r.h / 2 }, { x: r.w / 2 + (b.x - r.cx), y: r.h / 2 + (b.y - r.cy) }, 600, 14); }
          await until(() => st.phase === 'seal', 30000); await K.wait(900);
          { const s = st.verdict && st.verdict.querySelector('.bc-seal'); if (s) await K.sim.hold(s, 1100); }
          await until(() => st.finished, 30000);
        }
      };
    }
  });
})(window.TSG_ENV);
