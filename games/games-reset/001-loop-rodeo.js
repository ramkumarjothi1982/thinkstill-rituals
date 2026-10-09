/* 001 Loop Rodeo — Reset · INTERRUPT · Memory / Replay / Rumination (flagship)
 * Mechanism: circling your thumb in time with a glowing knot is a continuous visuo-motor task that loads the same working
 * memory rumination runs on (dual-task interference, the principle behind eye-movement and tapping tasks). The knot orbits
 * once per bar at the player's own herd speed (their before-rating), and every catch slows the beat, so the hand slows with
 * it (rhythmic entrainment). The biggest thought is never forced into the pen: the player holds still with it while it
 * settles (acceptance), then books it a paddock time to come back to (worry postponement) instead of arguing with it.
 * Verb: circle (orbit lasso, with tap-the-posts and ride-along fallbacks; then hold still). Finale: every resting thought
 * lets go of a mote of light that rises into the dusk and draws its own constellation over the prairie.
 */
(function (env) {
  'use strict';
  (env.games = env.games || []).push({
    id: 'loop-rodeo', mode: 'reset', name: 'Loop Rodeo', verb: 'circle', family: 'INTERRUPT', flagship: true, minutes: 3,
    parents: ['Memory / Replay / Rumination', 'Overthinking / Thought Fusion', 'Uncertainty / Future Worry / Reassurance'],
    cast: ['loopie'], poster: { char: 'loopie', mood: 'dizzy' }, fonts: ['Rye'],
    tagline: 'Rope your racing thoughts while the music slows down.',
    why: 'For thoughts on repeat: your thumb takes the wheel while the beat slows.',
    css: `
/* One full-screen prairie: the world is a canvas, every control is a DOM layer above it.
   Dark = night prairie under the stars. Bright = golden hour on the same prairie. */
.g-loop-rodeo {
  --sky-top: #070b24; --sky-mid: #151c49; --sky-low: #3b2f62;
  --orb: #fff4d6; --orb-glow: rgba(190, 200, 255, 0.35);
  --mesa-far: #2c2550; --mesa: #1f1838; --ground-top: #2b2237; --ground-bottom: #120e19; --grass: #3a304d;
  --fire: #ffb347; --wood: #6b4a33; --wood-dark: #3a271c; --rope: #d8b679; --rope-dark: #8a6a3a;
  --ui-bg: #070b24; --ui-surface: #1e1931; --ui-fg: #f6eee0; --ui-muted: #c2b8d4; --ui-accent: #f2a541; --ui-accent-ink: #1d1206;
  --ui-line: rgba(246, 238, 224, 0.18); --ui-scrim: rgba(6, 4, 14, 0.6);
  --card: rgba(24, 19, 40, 0.9); --card-stitch: rgba(242, 165, 65, 0.32); --hud: rgba(18, 14, 32, 0.66);
  --sign: #e2bd85; --sign-ink: #2a180b; --judge-good: #8fe3b0; --judge-perfect: #ffd27a; --judge-miss: #c2b8d4;
  --sync: #8fe3b0; --slack: #ff9f7a;
  --font-display: "Rye", "Rockwell", "Georgia", serif;
  background: var(--sky-low); color-scheme: dark;
}
.tsg[data-scene="bright"] .g-loop-rodeo {
  --sky-top: #6c8ad3; --sky-mid: #e9b38d; --sky-low: #ffd8a4;
  --orb: #fff1c2; --orb-glow: rgba(255, 214, 140, 0.55);
  --mesa-far: #c08c79; --mesa: #8f5d4c; --ground-top: #c39758; --ground-bottom: #7e5a33; --grass: #9d7a3c;
  --fire: #ffb347; --wood: #7a5236; --wood-dark: #4b3122; --rope: #8a5a2b; --rope-dark: #5b3a1a;
  --ui-bg: #e8b48c; --ui-surface: #fff5e8; --ui-fg: #2b1d12; --ui-muted: #6e5846; --ui-accent: #b5481a; --ui-accent-ink: #fff8f0;
  --ui-line: rgba(43, 29, 18, 0.18); --ui-scrim: rgba(43, 29, 18, 0.38);
  --card: rgba(255, 246, 234, 0.93); --card-stitch: rgba(120, 72, 36, 0.35); --hud: rgba(255, 246, 234, 0.8);
  --sign: #f0d3a6; --sign-ink: #3a2414; --judge-good: #1f6b3f; --judge-perfect: #9e4310; --judge-miss: #6e5846;
  --sync: #1f8a4c; --slack: #c4521d;
  color-scheme: light;
}

/* Loopie, positioned every frame from the world camera. Full circle, never cropped. */
.g-loop-rodeo .r-loopie { position: absolute; left: 0; top: 0; width: 112px; height: 112px; pointer-events: none; will-change: transform; filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.35)); z-index: 5; }
.g-loop-rodeo .r-loopie img { display: block; width: 100%; height: 100%; object-fit: contain; transform-origin: 50% 85%; }
.g-loop-rodeo .r-loopie img.pop { animation: lr-pop 0.42s cubic-bezier(.2, 1.6, .4, 1); }
@keyframes lr-pop { 0% { transform: scale(1); } 35% { transform: scale(1.08, 0.93); } 70% { transform: scale(0.97, 1.04); } 100% { transform: scale(1); } }

.g-loop-rodeo .r-say { position: absolute; z-index: 30; max-width: min(300px, calc(100% - 32px)); padding: 12px 14px; border-radius: 16px; background: var(--ui-surface); color: var(--ui-fg);
  font: 500 15px/1.35 var(--font-ui); box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3); pointer-events: none; left: 16px; transform-origin: 18px 100%; }
.g-loop-rodeo .r-say::after { content: ""; position: absolute; left: 22px; bottom: -8px; width: 16px; height: 16px; background: inherit; transform: rotate(45deg); border-radius: 3px; }
.g-loop-rodeo .r-say.ts-say-in { animation: lr-say-in 0.28s cubic-bezier(.2, 1.4, .4, 1) both; }
@keyframes lr-say-in { from { opacity: 0; transform: translateY(8px) scale(0.92); } to { opacity: 1; transform: none; } }

/* The active critter's brand sign: the player's own words, so 15px and never clipped (wraps to two lines). */
.g-loop-rodeo .r-banner { position: absolute; left: 0; top: 0; z-index: 12; pointer-events: none; background: var(--sign); color: var(--sign-ink);
  font: 600 15px/1.15 var(--font-ui); letter-spacing: 0.04em; text-align: center; padding: 8px 12px 7px; border-radius: 7px; width: max-content; max-width: min(240px, 66%);
  white-space: normal; overflow-wrap: anywhere; text-wrap: balance; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.22), 0 8px 18px rgba(0, 0, 0, 0.25); will-change: transform; border: 1px solid rgba(60, 30, 10, 0.25); }
.g-loop-rodeo .r-banner::after { content: ""; position: absolute; left: 50%; bottom: -10px; width: 2px; height: 10px; background: var(--sign-ink); opacity: 0.5; }
.g-loop-rodeo .r-banner.big { font-size: 16px; padding: 9px 13px 8px; }

/* HUD: below the console's game bar (leave + name on the left, sound + settings on the right). */
.g-loop-rodeo .r-hud { position: absolute; z-index: 20; left: 0; right: 0; top: calc(env(safe-area-inset-top, 0px) + 62px); display: flex; justify-content: space-between; align-items: flex-start; padding-inline: 12px 14px; pointer-events: none; }
.g-loop-rodeo .r-gauge, .g-loop-rodeo .r-tally { background: var(--hud); color: var(--ui-fg); border: 1px solid var(--ui-line); border-radius: 16px; padding: 8px 12px 9px; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.g-loop-rodeo .r-gauge { display: flex; align-items: center; gap: 10px; }
.g-loop-rodeo .r-gauge svg { width: 64px; height: 40px; overflow: visible; }
.g-loop-rodeo .r-num { font: 600 22px/1 var(--font-ui); font-variant-numeric: tabular-nums; display: block; }
.g-loop-rodeo .r-unit { font: 600 12px/1 var(--font-ui); letter-spacing: 0.1em; color: var(--ui-muted); display: block; margin-top: 4px; text-transform: uppercase; }
.g-loop-rodeo .r-tally { text-align: right; min-height: 59px; display: flex; flex-direction: column; justify-content: center; }

/* The lasso ring: circle your thumb with the glowing knot. The canvas draws; the button takes input. */
.g-loop-rodeo .r-ringzone { position: absolute; z-index: 15; left: 50%; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); width: 228px; height: 228px; transform: translateX(-50%); }
.g-loop-rodeo .r-ring { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.g-loop-rodeo .r-ringbtn { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: 50%; border: 0; background: transparent; padding: 0; cursor: grab; touch-action: none; -webkit-user-select: none; user-select: none; }
.g-loop-rodeo .r-ringbtn:active { cursor: grabbing; }
.g-loop-rodeo .r-ringbtn:focus-visible { outline: 3px solid var(--ui-accent); outline-offset: 4px; }
.g-loop-rodeo .r-ringtext { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 62%; text-align: center; pointer-events: none; display: flex; flex-direction: column; gap: 4px; align-items: center; }
.g-loop-rodeo .r-ringtext b { font: 600 15px/1.1 var(--font-ui); letter-spacing: 0.04em; text-transform: uppercase; color: var(--ui-fg); text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45); }
.g-loop-rodeo .r-ringtext span { font: 500 12px/1.25 var(--font-ui); color: var(--ui-fg); opacity: 0.85; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5); }
.tsg[data-scene="bright"] .g-loop-rodeo .r-ringtext b, .tsg[data-scene="bright"] .g-loop-rodeo .r-ringtext span { text-shadow: 0 1px 8px rgba(255, 240, 220, 0.9); }
.g-loop-rodeo .r-judge { position: absolute; left: 50%; top: -14px; transform: translateX(-50%); font: 700 19px/1 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; pointer-events: none; opacity: 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35); }
.g-loop-rodeo .r-judge.show { animation: lr-judge 0.7s ease-out both; }
@keyframes lr-judge { 0% { opacity: 0; transform: translate(-50%, 8px) scale(0.8); } 18% { opacity: 1; transform: translate(-50%, 0) scale(1.08); } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -10px); } }
.g-loop-rodeo .r-assist { position: absolute; transform: translateX(-50%); z-index: 31; background: var(--ui-surface) !important; white-space: nowrap; }

/* Paddock time: a card over the world (worry postponement). */
.g-loop-rodeo .r-scene { position: absolute; inset: 0; z-index: 25; display: flex; flex-direction: column; pointer-events: none; }
.g-loop-rodeo .r-scene > * { pointer-events: auto; }
.g-loop-rodeo .r-card { margin: auto 12px calc(env(safe-area-inset-bottom, 0px) + 16px); align-self: center; width: min(460px, calc(100% - 24px)); background: var(--card); color: var(--ui-fg); border-radius: 22px; padding: 16px 18px 16px;
  position: relative; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); display: flex; flex-direction: column; gap: 12px; max-height: calc(100% - 90px); overflow: auto; }
.g-loop-rodeo .r-card::before { content: ""; position: absolute; inset: 6px; border-radius: 17px; border: 1.5px dashed var(--card-stitch); pointer-events: none; }
.g-loop-rodeo .r-cardhead { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.g-loop-rodeo .r-card h2 { margin: 0; font: 400 23px/1.15 var(--font-display); letter-spacing: 0.02em; text-wrap: balance; }
.g-loop-rodeo .r-card p { margin: 0; font: 400 15px/1.45 var(--font-ui); color: var(--ui-muted); text-wrap: pretty; }
.g-loop-rodeo .r-link { appearance: none; background: none; border: 0; color: var(--ui-fg); font: 500 15px/1 var(--font-ui); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; padding: 10px 4px; min-height: 44px; opacity: 0.85; flex: none; }
.g-loop-rodeo .r-slots { display: flex; flex-wrap: wrap; gap: 8px; }
.g-loop-rodeo .r-slot { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1 1 0; min-width: 92px; padding: 9px 10px 8px; border-radius: 16px; }
.g-loop-rodeo .r-slot b { font: 600 17px/1.1 var(--font-ui); font-variant-numeric: tabular-nums; white-space: nowrap; }
.g-loop-rodeo .r-slot span { font: 600 12px/1.1 var(--font-ui); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ui-muted); }
.g-loop-rodeo .r-alm { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; padding-top: 2px; border-top: 1px solid var(--ui-line); }
.g-loop-rodeo .r-alm canvas { width: 36px; height: 30px; flex: none; }
.g-loop-rodeo .r-almnew { font: 600 13px/1.3 var(--font-ui); color: var(--ui-accent); margin-left: 4px; }

@container (min-width: 760px) {
  .g-loop-rodeo .r-ringzone { width: 252px; height: 252px; bottom: 24px; }
  .g-loop-rodeo .r-card { margin-bottom: 26px; }
  .g-loop-rodeo .r-say { font-size: 16px; }
}
@container (max-height: 660px) {
  .g-loop-rodeo .r-ringzone { width: 196px; height: 196px; bottom: 10px; }
}
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el, UI = ctx.ui;
      const TAU = Math.PI * 2, KEY = 'loop-rodeo:';
      let an = ctx.analysis || {};
      let herdLocked = false;
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && !herdLocked && a.safety !== 'support') an = a; }, () => {});

      /* ================= species, lines, paddock time and almanac (folded in from rodeo-engine.js) ================= */
      const R = {};
      /* Loop species: each maps to a pattern people recognise, never a diagnosis. */
      R.SPECIES = {
        replay: { name: 'Replay Ram', wool: '#f4ead8', woolB: '#e6d5ba', face: '#6d4c5c', feature: 'horns', what: 'Re-runs something that already happened, hoping for a different ending.' },
        whatif: { name: 'What-If Woolly', wool: '#e5dcff', woolB: '#cbbcf5', face: '#5b4a7a', feature: 'fringe', what: 'Gallops into the future and comes back with worst guesses.' },
        shouldhave: { name: 'Should-Have Shearling', wool: '#dfe8f2', woolB: '#c3d2e2', face: '#4f5d70', feature: 'droop', what: 'Keeps a list of what you ought to have done differently.' },
        mindread: { name: 'Mind-Read Merino', wool: '#ffe3d6', woolB: '#f6c6b2', face: '#7a4d45', feature: 'antenna', what: 'Is sure it knows what everyone else is thinking.' },
        todo: { name: 'To-Do Tumbler', wool: '#dcf4e6', woolB: '#b9e3cb', face: '#3f6652', feature: 'tag', what: 'Carries every unfinished task at once, all at full volume.' },
        worstcase: { name: 'Worst-Case Woolly', wool: '#d9dbe3', woolB: '#b7bac8', face: '#454a5e', feature: 'frizz', what: 'Skips straight from a small thing to the ending of the world.' },
        body: { name: 'Heartbeat Hogget', wool: '#ffd9de', woolB: '#f2b6bf', face: '#7a3b48', feature: 'heart', what: 'Lives in your chest and stomach, turning a thought into a thumping heart.' },
        urge: { name: 'Urge Ewe', wool: '#fbeab4', woolB: '#ecd282', face: '#6b5332', feature: 'bell', what: 'Rings its little bell until you do the thing, right now.' },
        other: { name: 'Loop Lamb', wool: '#fbf6ee', woolB: '#eadfcd', face: '#66545a', feature: 'none', what: 'A thought that just keeps coming round.' }
      };
      R.LOOPS = Object.keys(R.SPECIES);
      R.LINES = {
        intro: {
          Jolly: ['Whoa, that’s a lively herd! Swing the rope with me and we’ll bring them home.', 'Big herd tonight. Circle the rope with the knot and we’ll round them up.'],
          Cheeky: ['Your brain left the gate open again. Classic. Grab the rope.', 'Look at this rabble. Right, cowpoke, ride that knot.'],
          Unfiltered: ['That’s a damn stampede. Circle with the knot and rope the lot.', 'Your head’s a rodeo. Swing the rope with the knot. Go.']
        },
        due: {
          Jolly: 'Paddock time! The big one’s back. Let’s ride with it gently.',
          Cheeky: 'Paddock time! The big one’s back. Right on schedule, for once.',
          Unfiltered: 'Paddock time! The big one’s back. As booked. Let’s ride.'
        },
        catch: {
          Jolly: ['Yee-haw! One home safe.', 'Lovely rope work!', 'That one’s snoozing already.', 'Gentle hands, steady loop.'],
          Cheeky: ['Gotcha, you woolly menace.', 'In the pen. Stay there.', 'Look at you, cowpoke.', 'Too slow, fluffball.'],
          Unfiltered: ['Roped. Next.', 'Sit down, you noisy thing.', 'That’s how it’s done.', 'One less galloping idiot.']
        },
        slack: {
          Jolly: ['Catch up with the glowing knot!', 'Follow the knot round, nice and smooth.'],
          Cheeky: ['The knot’s over there, partner.', 'You’re swinging solo. Follow the knot.'],
          Unfiltered: ['Wrong spot. Ride the knot.', 'Stay on the knot. That’s the whole trick.']
        },
        bounce: { Jolly: 'Boing! Too big for my little rope.', Cheeky: 'Yeah, no. That one laughed at the rope.', Unfiltered: 'Rope bounced. Of course it did.' },
        core: {
          Jolly: 'This big one isn’t going in a pen, and that’s okay. Let it rest by the fire with you.',
          Cheeky: 'This one’s too big for the pen. Fine. It can sit by the fire and behave.',
          Unfiltered: 'You can’t rope this one. You don’t need to. Let it lie down by the fire.'
        },
        still: { Jolly: 'Rest your thumb on the knot. Stay still while it settles.', Cheeky: 'Thumb on the knot. Now do the hardest thing: nothing.', Unfiltered: 'Thumb on the knot. Hold still. Let it slow down.' },
        wobble: { Jolly: 'Easy. Stillness is the trick.', Cheeky: 'Shh. Statue mode.', Unfiltered: 'Stop fidgeting. Stay put.' },
        close: { Jolly: 'Herd’s resting. The thoughts are still here, just not stampeding.', Cheeky: 'Look at that. Same thoughts, way less galloping.', Unfiltered: 'Still your thoughts. Just quieter now.' },
        paddock: { Jolly: 'Paddock time is {time}. Till then, it grazes.', Cheeky: 'Booked in for {time}. It can wait. So can you.', Unfiltered: '{time}. That’s its slot. Not before.' },
        nopaddock: { Jolly: 'No slot needed. It can graze by the fire.', Cheeky: 'Fine, it can freeload by the fire.', Unfiltered: 'No booking. It just grazes.' },
        hop: { Jolly: 'Hop! Room for the card.', Cheeky: 'Scooting up. Cards first.', Unfiltered: 'Moving. Pick a time.' }
      };
      /* When the reading is about health, money, housing or legal stuff: gentle lines only, no jokes near the concern. */
      const vline = (set) => {
        if (!set) return '';
        if (an.safety === 'care' && set.Jolly) return Array.isArray(set.Jolly) ? S.pick(set.Jolly) : set.Jolly;
        return ctx.line(set);
      };
      const lines = (key) => (key === 'intro' && an.host && an.host.intro && an.safety !== 'care' ? an.host.intro : vline(R.LINES[key]));

      const GENERIC = [{ label: 'THAT THING I SAID', loop: 'replay' }, { label: 'TOMORROW’S LIST', loop: 'todo' }, { label: 'WHAT IF IT GOES WRONG', loop: 'whatif' },
        { label: 'SHOULD’VE DONE BETTER', loop: 'shouldhave' }, { label: 'WHAT THEY THINK', loop: 'mindread' }];
      const loopOf = (l) => (R.SPECIES[l] ? l : 'other');
      const labelOf = (s) => S.clean(s, 40).toUpperCase();
      /* The herd is the player's own reading: strands run laps, the core is the big one. */
      function herdFrom(a) {
        const core = a && a.core && a.core.label ? { label: labelOf(a.core.label), loop: loopOf(a.core.loop) } : { label: 'EVERYTHING AT ONCE', loop: 'other' };
        const seen = new Set([core.label]), critters = [];
        (a && Array.isArray(a.strands) ? a.strands : []).forEach(s => {
          if (!s || !s.label) return;
          const label = labelOf(s.label);
          if (label.length < 2 || seen.has(label)) return;
          seen.add(label); critters.push({ label, loop: loopOf(s.loop) });
        });
        for (const g of GENERIC) { if (critters.length >= 4) break; if (!seen.has(g.label)) { seen.add(g.label); critters.push(Object.assign({}, g)); } }
        return { critters, core };
      }

      /* Paddock time: a booked slot for the big worry. Stores a time and a species, never words. */
      const SLOTS = [[12, 30], [17, 30], [19, 0]];
      R.timeOnly = (d) => d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?m\.?/i, (m, ap) => ' ' + ap.toLowerCase() + 'm');
      R.dayWord = (d, now) => {
        if (d.toDateString() === now.toDateString()) return 'today';
        if (new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString() === d.toDateString()) return 'tomorrow';
        return d.toLocaleDateString('en-AU', { weekday: 'short' });
      };
      R.timeLabel = (at, now) => { now = now || new Date(); const d = new Date(at); return R.timeOnly(d) + ' ' + R.dayWord(d, now); };
      R.slots = (now) => {
        now = now || new Date();
        const out = [];
        for (let day = 0; day < 2 && out.length < 3; day++) {
          SLOTS.forEach(([hh, mm]) => {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hh, mm, 0, 0);
            if (d.getTime() - now.getTime() >= 30 * 60000 && out.length < 3) out.push({ at: d.getTime(), time: R.timeOnly(d), day: R.dayWord(d, now), label: R.timeLabel(d.getTime(), now) });
          });
        }
        return out;
      };
      R.paddock = {
        get() { const p = S.store.get(KEY + 'paddock', null); return p && typeof p.at === 'number' ? p : null; },
        set(at, loop) { S.store.set(KEY + 'paddock', { at, loop: loopOf(loop), set: Date.now() }); },
        clear() { S.store.set(KEY + 'paddock', null); }
      };
      /* Almanac: species counts only, per game key. */
      R.almanac = () => { const a = S.store.get(KEY + 'almanac', {}); return a && typeof a === 'object' ? a : {}; };
      R.addToAlmanac = (loops) => {
        const a = R.almanac(), fresh = [];
        loops.forEach(l => { if (!a[l]) fresh.push(l); a[l] = (a[l] || 0) + 1; });
        S.store.set(KEY + 'almanac', a);
        return fresh;
      };
      /* A booked visit that has come round: Loopie mentions it and the record clears. */
      let paddockDue = null;
      (() => {
        const p = R.paddock.get(); if (!p) return;
        const now = Date.now();
        if (now > p.at + 36 * 3600000) { R.paddock.clear(); return; }
        if (now >= p.at) { paddockDue = p; R.paddock.clear(); ctx.track('paddock_visit', {}); }
      })();

      /* Herd speed comes from the console's before-rating (0-10 -> 1-10). */
      const beforeIn = ctx.before == null || ctx.before === '' || !isFinite(Number(ctx.before)) ? null : S.clamp(Number(ctx.before), 0, 10);
      const herdSpeed = beforeIn == null ? 6 : Math.round(1 + beforeIn * 0.9);

      /* ================= markup ================= */
      const cv = K.canvas(el);
      el.insertAdjacentHTML('beforeend', `
        <div class="r-loopie" aria-hidden="true"><img alt="" draggable="false"></div>
        <div class="r-say" hidden aria-live="polite"><span class="r-say-text"></span></div>
        <div class="r-banner gk-user" hidden></div>
        <div class="r-hud" hidden>
          <div class="r-gauge" role="img" aria-label="Herd speed">
            <svg viewBox="0 0 64 40" aria-hidden="true">
              <path d="M6 36 A26 26 0 0 1 58 36" fill="none" stroke="var(--ui-line)" stroke-width="6" stroke-linecap="round"/>
              <path class="r-gaugearc" d="M6 36 A26 26 0 0 1 58 36" fill="none" stroke="var(--fire)" stroke-width="6" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="40"/>
              <line class="r-needle" x1="32" y1="36" x2="32" y2="14" stroke="var(--ui-fg)" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="32" cy="36" r="3.5" fill="var(--ui-fg)"/>
            </svg>
            <div><span class="r-num r-bpm">120</span><span class="r-unit">Herd BPM</span></div>
          </div>
          <div class="r-tally"><span class="r-num r-pen">0 / 5</span><span class="r-unit">In the pen</span></div>
        </div>
        <div class="r-ringzone" hidden>
          <canvas class="r-ring" aria-hidden="true"></canvas>
          <div class="r-ringtext" aria-hidden="true"><b class="r-ringhead">Ride the knot</b><span class="r-ringsub">Circle with it</span></div>
          <button class="r-ringbtn" type="button" aria-label="Lasso. Circle your thumb round the rope with the glowing knot, or tap when the knot reaches a post. The space bar works too."></button>
          <div class="r-judge" aria-live="polite"></div>
        </div>
        <section class="r-scene r-paddocksc scene-rise" hidden aria-label="Paddock time">
          <div class="r-card">
            <div class="r-cardhead"><h2>Paddock time</h2><button class="r-link r-noslot" type="button">Skip for now</button></div>
            <p>The big one doesn’t have to go anywhere. Give it a set time to visit instead. Until then, it grazes.</p>
            <div class="r-slots" role="group" aria-label="Pick a time"></div>
            <div class="r-alm" aria-label="Herd Almanac"></div>
          </div>
        </section>`);
      const $ = (s) => el.querySelector(s);
      const loopieWrap = $('.r-loopie'), loopieImg = $('.r-loopie img');
      const sayEl = $('.r-say'), sayText = $('.r-say-text'), banner = $('.r-banner');
      const hud = $('.r-hud'), bpmEl = $('.r-bpm'), tallyEl = $('.r-pen'), gaugeArc = $('.r-gaugearc'), gaugeNeedle = $('.r-needle');
      const ringZone = $('.r-ringzone'), ringCanvas = $('.r-ring'), ringBtn = $('.r-ringbtn'), ringHead = $('.r-ringhead'), ringSub = $('.r-ringsub'), judgeEl = $('.r-judge');
      const paddockSc = $('.r-paddocksc'), paddockCard = $('.r-paddocksc .r-card'), slotsEl = $('.r-slots'), almEl = $('.r-alm');

      /* ================= Loopie ================= */
      const EXPR = {
        dizzy: S.face('loopie', 'E01'), excited: S.face('loopie', 'E03'), silly: S.face('loopie', 'E05'), laugh: S.face('loopie', 'E18'),
        shocked: S.face('loopie', 'E58'), worried: S.face('loopie', 'E52'), confused: S.face('loopie', 'E87'), half: S.face('loopie', 'E14'),
        calm: S.face('loopie', 'E12'), happy: S.face('loopie', 'E24'), surprised: S.face('loopie', 'E77'), peace: S.face('loopie', 'E02')
      };
      if (!S.opts.staticRender) Object.values(EXPR).forEach(src => { const i = new Image(); i.src = src; });
      loopieImg.src = EXPR.dizzy;
      let faceTimer = 0, baseFace = 'dizzy';
      function face(name, ms) {
        S.cancel(faceTimer);
        if (loopieImg.getAttribute('src') !== EXPR[name]) loopieImg.src = EXPR[name];
        loopieImg.classList.remove('pop'); void loopieImg.offsetWidth; loopieImg.classList.add('pop');
        if (ms) faceTimer = S.later(() => { if (loopieImg.getAttribute('src') !== EXPR[baseFace]) loopieImg.src = EXPR[baseFace]; }, ms);
      }
      function setBaseFace(name) { baseFace = name; face(name); }

      /* ================= world + layout ================= */
      const Wd = { w: 0, h: 0, portrait: true, horizon: 0, fire: { x: 0, y: 0 }, track: { cx: 0, cy: 0, rx: 0, ry: 0 }, pen: { x: 0, y: 0, w: 0, h: 0 }, penSlots: [], penGate: null,
        loopie: { x: 0, y: 0, size: 112 }, unit: 0.8, cam: { y: 0, z: 1, shake: 0 }, ringTop: 0, ring: { size: 228, cx: 0, cy: 0, r: 91 }, dusk: 0 };
      let skyCache = null, groundCache = null, mesaFar = null, mesaNear = null, penCache = null, stars = [], clouds = [], palette = {};
      let shooting = null, nextShoot = 6, ringCtx = null, vignette = null, laidOut = false;
      const lift = { v: 0, from: 0, to: 0, t: 1, d: 0.5 }; // Loopie hops up to make room for the paddock card

      function readPalette() {
        const tk = (n) => K.token(n);
        palette = {
          skyTop: tk('--sky-top'), skyMid: tk('--sky-mid'), skyLow: tk('--sky-low'), orb: tk('--orb'), orbGlow: tk('--orb-glow'),
          mesaFar: tk('--mesa-far'), mesa: tk('--mesa'), groundTop: tk('--ground-top'), groundBottom: tk('--ground-bottom'), grass: tk('--grass'),
          wood: tk('--wood'), woodDark: tk('--wood-dark'), rope: tk('--rope'), ropeDark: tk('--rope-dark'), sync: tk('--sync'), slack: tk('--slack'),
          dark: S.scene() === 'dark'
        };
      }

      function layout() {
        Wd.w = Math.max(320, cv.w || el.clientWidth || 390); Wd.h = Math.max(480, cv.h || el.clientHeight || 844);
        Wd.portrait = Wd.h > Wd.w * 1.05;
        const wide = Wd.w >= 760, short = Wd.h <= 660;
        const size = wide ? 252 : (short ? 196 : 228), bottom = wide ? 24 : (short ? 10 : 16);
        ringZone.style.width = ringZone.style.height = size + 'px';
        ringZone.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + ' + bottom + 'px)';
        const sb = parseFloat(getComputedStyle(ringZone).bottom); // includes the home-indicator inset when there is one
        const ringBottom = isFinite(sb) ? sb : bottom;
        Wd.ring = { size, cx: Wd.w / 2, cy: Wd.h - ringBottom - size / 2, r: Math.round(size * 0.4) };
        Wd.ringTop = Wd.h - ringBottom - size;
        Wd.loopie.size = wide ? 140 : (short ? 92 : 112);
        loopieWrap.style.width = loopieWrap.style.height = Wd.loopie.size + 'px';
        if (Wd.portrait) {
          Wd.horizon = Wd.h * 0.40;
          const groundSpan = Wd.ringTop - 24 - Wd.horizon;
          Wd.fire = { x: Wd.w * 0.52, y: Wd.horizon + groundSpan * 0.56 };
          const rx = Math.min(Wd.w * 0.43, 220);
          Wd.track = { cx: Wd.fire.x, cy: Wd.fire.y, rx, ry: rx * 0.32 };
          Wd.pen = { x: Wd.w * 0.58, y: Wd.horizon + groundSpan * 0.06, w: Wd.w * 0.36, h: Math.max(40, groundSpan * 0.16) };
          Wd.loopie.x = 14 + Wd.loopie.size / 2;
          Wd.loopie.y = Wd.ringTop - Wd.loopie.size * 0.5 + 6;
          Wd.unit = S.clamp(Wd.w / 370, 0.8, 1.15);
        } else {
          Wd.horizon = Wd.h * 0.45;
          Wd.fire = { x: Wd.w * 0.48, y: Math.min(Wd.h * 0.58, Wd.ringTop - 120) };
          const rx = Math.min(Wd.w * 0.24, 300);
          Wd.track = { cx: Wd.fire.x, cy: Wd.fire.y, rx, ry: rx * 0.3 };
          Wd.pen = { x: Wd.w * 0.68, y: Wd.horizon + 26, w: Math.min(Wd.w * 0.22, 300), h: 62 };
          Wd.loopie.x = Math.max(Wd.loopie.size * 0.7, Wd.fire.x - rx - 140);
          Wd.loopie.y = Wd.fire.y + 26;
          Wd.unit = S.clamp(Wd.h / 690, 0.9, 1.3);
        }
        readPalette();
        buildCaches();
        layoutPenSlots();
        ringCtx = S.fitCanvas(ringCanvas, size, size, 2).ctx;
        hudBottom = 0; bannerKey = '';
        // keep anything already resting where it belongs
        critters.forEach(c => {
          if (c.state === 'pen' && c.penSlot != null) { const s = Wd.penSlots[c.penSlot % Wd.penSlots.length]; c.x = s.x; c.y = s.y; }
          if (c.state === 'rest') { const r = restPoint(); c.x = r.x; c.y = r.y; }
        });
        if (!laidOut) { laidOut = true; Wd.cam.y = campCam(); }
      }

      function mk(cw, ch) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const c = document.createElement('canvas'); c.width = Math.ceil(cw * dpr); c.height = Math.ceil(ch * dpr);
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { c, g, w: cw, h: ch };
      }
      function buildCaches() {
        const w = Wd.w, H = Wd.h;
        const skyH = H * 0.6 + Wd.horizon + 40;
        skyCache = mk(w, skyH);
        {
          const g = skyCache.g, hz = skyH - 40;
          const grad = g.createLinearGradient(0, 0, 0, hz);
          grad.addColorStop(0, palette.skyTop); grad.addColorStop(0.62, palette.skyMid); grad.addColorStop(1, palette.skyLow);
          g.fillStyle = grad; g.fillRect(0, 0, w, skyH);
          const band = g.createLinearGradient(0, hz - H * 0.22, 0, hz + 30);
          band.addColorStop(0, 'rgba(0,0,0,0)'); band.addColorStop(1, palette.dark ? 'rgba(150,110,190,0.28)' : 'rgba(255,200,140,0.35)');
          g.fillStyle = band; g.fillRect(0, hz - H * 0.22, w, H * 0.22 + 40);
          const ox = palette.dark ? w * 0.8 : w * 0.24, oy = palette.dark ? H * 0.6 + Math.min(H * 0.31, Wd.horizon - 70) : hz - Math.min(70, H * 0.08), orr = palette.dark ? 28 : 36;
          const glow = g.createRadialGradient(ox, oy, orr * 0.6, ox, oy, orr * (palette.dark ? 5 : 6));
          glow.addColorStop(0, palette.orbGlow); glow.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = glow; g.fillRect(ox - orr * 7, oy - orr * 7, orr * 14, orr * 14);
          g.fillStyle = palette.orb; g.beginPath(); g.arc(ox, oy, orr, 0, TAU); g.fill();
          if (palette.dark) {
            g.fillStyle = 'rgba(200,190,170,0.35)';
            [[-7, -5, 5], [6, 4, 4], [-2, 9, 3], [9, -8, 2.5]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(ox + dx, oy + dy, rr, 0, TAU); g.fill(); });
          }
        }
        clouds = [];
        const rc = S.rng(31);
        for (let i = 0; i < 4; i++) {
          const cw = 220 + rc() * 200, chh = 90, c = mk(cw, chh);
          c.g.save(); c.g.translate(0, chh / 2); c.g.scale(1, 0.42);
          for (let k = 0; k < 8; k++) {
            const er = 36 + rc() * 50, ex = er + rc() * (cw - 2 * er), ey = (rc() - 0.5) * 30;
            const gg = c.g.createRadialGradient(ex, ey, 0, ex, ey, er);
            gg.addColorStop(0, palette.dark ? 'rgba(160,150,210,0.16)' : 'rgba(255,230,212,0.42)'); gg.addColorStop(1, palette.dark ? 'rgba(160,150,210,0)' : 'rgba(255,230,212,0)');
            c.g.fillStyle = gg; c.g.beginPath(); c.g.arc(ex, ey, er, 0, TAU); c.g.fill();
          }
          c.g.restore();
          clouds.push({ c, x: rc() * w, y: -H * 0.25 + rc() * (H * 0.25 + Wd.horizon * 0.7), v: 4 + rc() * 7 });
        }
        const rnd = S.rng(7);
        stars = [];
        const count = Math.round((w * (Wd.horizon + H * 0.6)) / 2600);
        for (let i = 0; i < count; i++) stars.push({ x: rnd() * w, y: -H * 0.6 + rnd() * (H * 0.6 + Wd.horizon - 30), r: rnd() < 0.12 ? 1.6 : 0.9 + rnd() * 0.5, p: rnd() * TAU, s: 0.6 + rnd() * 1.8 });
        const mesa = (color, heightMax, seed, flat) => {
          const c = mk(w, heightMax + 30); const g = c.g, rr = S.rng(seed);
          const mg = g.createLinearGradient(0, 0, 0, heightMax + 30);
          mg.addColorStop(0, shade(color, palette.dark ? 0.06 : 0.08)); mg.addColorStop(1, color);
          g.fillStyle = mg; g.beginPath(); g.moveTo(0, heightMax + 30);
          let x = 0, y = heightMax * (0.55 + rr() * 0.3);
          g.lineTo(0, y);
          while (x < w) {
            const step = 30 + rr() * 90;
            if (flat && rr() < 0.35) {
              const top = heightMax * (0.1 + rr() * 0.3);
              g.lineTo(x + 10, top); g.lineTo(x + step, top + rr() * 6); x += step + 10; g.lineTo(x, heightMax * (0.6 + rr() * 0.3));
            } else { x += step; y = heightMax * (0.45 + rr() * 0.5); g.lineTo(x, y); }
          }
          g.lineTo(w, heightMax + 30); g.closePath(); g.fill();
          return c;
        };
        mesaFar = mesa(palette.mesaFar, Math.min(110, H * 0.12), 11, true);
        mesaNear = mesa(palette.mesa, Math.min(70, H * 0.08), 23, false);
        const gH = H - Wd.horizon + H * 0.9;
        groundCache = mk(w, gH);
        {
          const g = groundCache.g;
          const grad = g.createLinearGradient(0, 0, 0, H - Wd.horizon);
          grad.addColorStop(0, palette.groundTop); grad.addColorStop(1, palette.groundBottom);
          g.fillStyle = grad; g.fillRect(0, 0, w, gH);
          const rg = S.rng(5); g.strokeStyle = palette.grass; g.lineCap = 'round';
          const tufts = Math.round(w * (H - Wd.horizon) / 900);
          for (let i = 0; i < tufts; i++) {
            const y = Math.pow(rg(), 0.8) * (H - Wd.horizon + 40), x = rg() * w, s = 0.5 + (y / (H - Wd.horizon)) * 1.4;
            g.lineWidth = 1 * s; g.globalAlpha = 0.5 + rg() * 0.5;
            for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * 2 * s, y); g.quadraticCurveTo(x + k * 3 * s, y - 4 * s, x + k * 4.5 * s, y - 7 * s * (0.7 + rg() * 0.6)); g.stroke(); }
          }
          g.globalAlpha = 1;
        }
        const p = Wd.pen;
        penCache = mk(p.w + 20, p.h + 40);
        {
          const g = penCache.g, ox = 10, oy = 26, pw = p.w, ph = p.h;
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(ox + pw / 2, oy + ph * 0.62, pw * 0.52, ph * 0.5, 0, 0, TAU); g.fill();
          const post = (x, y, s) => { g.fillStyle = palette.woodDark; g.fillRect(x - 2.2 * s, y - 16 * s, 4.4 * s, 18 * s); g.fillStyle = palette.wood; g.fillRect(x - 1.6 * s, y - 16 * s, 2.4 * s, 17 * s); };
          const rail = (x1, y1, x2, y2, s) => { g.strokeStyle = palette.wood; g.lineWidth = 2.6 * s; g.beginPath(); g.moveTo(x1, y1 - 12 * s); g.lineTo(x2, y2 - 12 * s); g.stroke(); g.beginPath(); g.moveTo(x1, y1 - 6 * s); g.lineTo(x2, y2 - 6 * s); g.stroke(); };
          const back = oy + 4, front = oy + ph;
          for (let i = 0; i <= 6; i++) { const x = ox + 8 + (pw - 16) * i / 6; post(x, back, 0.7); if (i) rail(ox + 8 + (pw - 16) * (i - 1) / 6, back, x, back, 0.7); }
          rail(ox + 8, back, ox, front, 0.85); rail(ox + pw - 8, back, ox + pw, front, 0.85);
          post(ox, front, 1); post(ox + pw, front, 1);
          for (let i = 2; i <= 6; i++) { const x = ox + pw * i / 6; post(x, front, 1); if (i > 2) rail(ox + pw * (i - 1) / 6, front, x, front, 1); }
          post(ox + pw / 6, front, 1);
          rail(ox, front, ox + pw / 6, front, 1);
          Wd.penGate = { x1: ox + pw / 6, x2: ox + pw * 2 / 6, y: front };
        }
        vignette = null;
      }
      function layoutPenSlots() {
        const p = Wd.pen, slots = [];
        for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) slots.push({ x: p.x + p.w * (0.2 + 0.6 * (c + (r % 2) * 0.5) / 3.5), y: p.y + p.h * (0.42 + r * 0.36) });
        Wd.penSlots = slots;
      }
      function shade(hex, amt) {
        const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex); if (!m) return hex;
        const f = (v) => Math.round(S.clamp(parseInt(v, 16) + 255 * amt, 0, 255)).toString(16).padStart(2, '0');
        return '#' + f(m[1]) + f(m[2]) + f(m[3]);
      }
      const restPoint = () => ({ x: Wd.fire.x - Wd.track.rx * 0.42, y: Wd.fire.y + Wd.track.ry * 0.55 });

      /* ================= critter sprites ================= */
      const spriteCache = new Map();
      function critterSprite(loop, variant, scaleIn) {
        const scale = Math.max(0.25, Math.round(scaleIn * 8) / 8);
        const key = loop + ':' + variant + ':' + scale;
        if (spriteCache.has(key)) return spriteCache.get(key);
        const sp = R.SPECIES[loop] || R.SPECIES.other;
        const dpr = Math.min(window.devicePixelRatio || 1, 2), U = scale * dpr;
        const cw = 104, ch = 86, c = document.createElement('canvas');
        c.width = Math.ceil(cw * U); c.height = Math.ceil(ch * U);
        const g = c.getContext('2d'); g.setTransform(U, 0, 0, U, cw * U / 2 - 4 * U, ch * U * 0.56);
        drawCritterBody(g, sp, variant);
        const outS = { c, ox: cw / 2 - 4, oy: ch * 0.56, w: cw, h: ch };
        spriteCache.set(key, outS);
        return outS;
      }
      function drawCritterBody(g, sp, variant) {
        const puffs = [[-15, 3, 11], [-7, -6, 12.5], [4, -8, 12.5], [14, -2, 11], [-10, 7, 10.5], [3, 7, 11], [13, 6, 9.5], [-20, 6, 7], [20, 5, 7]];
        const isCore = variant.includes('core');
        const wool = isCore ? shade(sp.wool, -0.18) : sp.wool, woolB = isCore ? shade(sp.woolB, -0.2) : sp.woolB;
        if (sp.feature === 'frizz') {
          g.fillStyle = woolB; g.beginPath();
          for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, r = i % 2 ? 22 : 27; g.lineTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 0.75); }
          g.closePath(); g.fill();
        }
        g.fillStyle = woolB; puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y + 1.6, r + 1.6, 0, TAU); g.fill(); });
        g.fillStyle = wool; puffs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
        g.fillStyle = 'rgba(255,255,255,0.6)'; [[-9, -10, 4], [2, -12, 3.5], [-17, 0, 2.5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
        if (sp.feature === 'heart') { // Heartbeat Hogget: a thumping heart on its flank
          const x = -5, y = -3, s = 10;
          g.fillStyle = '#e8475f'; g.beginPath(); g.moveTo(x, y + s * 0.3);
          g.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
          g.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
          g.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
          g.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x - s * 0.24, y + s * 0.26, s * 0.1, 0, TAU); g.fill();
        }
        const hx = 25, hy = -7;
        if (sp.feature === 'droop') { g.fillStyle = shade(sp.face, 0.15); g.beginPath(); g.ellipse(hx - 6, hy + 2, 3.6, 9, 0.35, 0, TAU); g.fill(); }
        else { g.fillStyle = shade(sp.face, 0.1); g.beginPath(); g.ellipse(hx - 7, hy - 7, 6.5, 3.2, -0.6, 0, TAU); g.fill(); g.fillStyle = '#f2a7b5'; g.beginPath(); g.ellipse(hx - 7, hy - 7, 3.8, 1.5, -0.6, 0, TAU); g.fill(); }
        g.fillStyle = sp.face; g.beginPath(); g.ellipse(hx, hy, 9.5, 10.5, 0.12, 0, TAU); g.fill();
        g.fillStyle = wool; [[hx - 4, hy - 9, 5], [hx + 1, hy - 11, 5.5], [hx + 5, hy - 8, 4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
        const sleeping = variant.includes('sleep');
        const eyes = [[hx - 1.5, hy - 1.5], [hx + 4.8, hy - 1]];
        if (sleeping) {
          g.strokeStyle = '#1b1220'; g.lineWidth = 1.4; g.lineCap = 'round';
          eyes.forEach(([x, y]) => { g.beginPath(); g.arc(x, y - 0.4, 2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); });
        } else {
          eyes.forEach(([x, y]) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); g.fillStyle = '#1b1220'; g.beginPath(); g.arc(x + 0.8, y + 0.3, 1.7, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 1.4, y - 0.5, 0.6, 0, TAU); g.fill(); });
        }
        if (sp.feature === 'fringe') { g.fillStyle = wool; [[hx - 3, hy - 4, 4.4], [hx + 2, hy - 5, 4.6], [hx + 6.5, hy - 3.5, 3.5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); }
        g.fillStyle = 'rgba(255,140,160,0.55)'; g.beginPath(); g.ellipse(hx + 6, hy + 4, 2.6, 1.6, 0, 0, TAU); g.fill();
        g.strokeStyle = '#1b1220'; g.lineWidth = 1.1; g.beginPath(); g.arc(hx + 3.5, hy + 4.5, 1.8, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
        if (sp.feature === 'horns') {
          g.strokeStyle = '#d4ad72'; g.lineWidth = 2.6; g.lineCap = 'round';
          g.beginPath(); for (let a = 0; a < 4.6; a += 0.2) { const r = 5.5 - a * 0.9; g.lineTo(hx - 6 + Math.cos(a + 3.6) * r, hy - 4 + Math.sin(a + 3.6) * r); } g.stroke();
        }
        if (sp.feature === 'antenna') {
          g.strokeStyle = sp.face; g.lineWidth = 1.3;
          [[hx - 2, -1], [hx + 4, 1]].forEach(([x, d]) => { g.beginPath(); g.moveTo(x, hy - 12); g.quadraticCurveTo(x + d * 4, hy - 19, x + d * 2, hy - 22); g.stroke(); g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(x + d * 2, hy - 22, 1.9, 0, TAU); g.fill(); });
        }
        if (sp.feature === 'tag') { g.fillStyle = '#ffd27a'; g.fillRect(hx - 11, hy - 4, 5, 6); g.strokeStyle = '#2f5a45'; g.lineWidth = 1; g.beginPath(); g.moveTo(hx - 10, hy - 1); g.lineTo(hx - 8.8, hy + 0.4); g.lineTo(hx - 6.8, hy - 2.6); g.stroke(); }
        if (sp.feature === 'bell') { // Urge Ewe: a collar with a little bell that will not stop ringing
          g.strokeStyle = '#c4473f'; g.lineWidth = 2.4; g.lineCap = 'round';
          g.beginPath(); g.moveTo(hx - 8.5, hy + 4); g.quadraticCurveTo(hx - 1.5, hy + 11, hx + 6.5, hy + 6.5); g.stroke();
          const bx = hx - 1.5, by = hy + 10;
          g.fillStyle = '#f2c14e'; g.beginPath(); g.moveTo(bx - 4.4, by + 7); g.quadraticCurveTo(bx - 4.6, by - 0.5, bx, by - 0.5); g.quadraticCurveTo(bx + 4.6, by - 0.5, bx + 4.4, by + 7); g.closePath(); g.fill();
          g.fillStyle = '#b07a1c'; g.fillRect(bx - 4.8, by + 6.2, 9.6, 1.6);
          g.beginPath(); g.arc(bx, by + 8.9, 1.4, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(bx - 1.7, by + 2.4, 0.9, 2, 0.3, 0, TAU); g.fill();
        }
        if (isCore) { g.fillStyle = shade(wool, -0.08); [[-4, -16, 6], [6, -17, 6.5]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); }
      }
      function drawLegs(g, sp, x, y, s, phase, facing, pose) {
        g.save(); g.translate(x, y); g.scale(s * facing, s);
        g.strokeStyle = shade(sp.face, -0.12); g.lineCap = 'round'; g.lineWidth = 3.4;
        if (pose === 'sit' || pose === 'rest') {
          g.fillStyle = shade(sp.face, -0.12);
          [[-12, 12], [14, 12]].forEach(([lx, ly]) => { g.beginPath(); g.ellipse(lx, ly, 5, 2.2, 0, 0, TAU); g.fill(); });
        } else {
          [-13, -5, 8, 16].forEach((lx, i) => {
            const sw = Math.sin(phase + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * 0.55;
            g.beginPath(); g.moveTo(lx, 10); g.lineTo(lx + Math.sin(sw) * 9, 10 + Math.cos(sw) * 9); g.stroke();
          });
        }
        g.restore();
      }
      function miniCritter(loop, w, hgt) {
        const c = document.createElement('canvas'); const dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = w * dpr; c.height = hgt * dpr; c.style.width = w + 'px'; c.style.height = hgt + 'px';
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const s = w / 76, spr = critterSprite(loop, 'awake', s);
        drawLegs(g, R.SPECIES[loop] || R.SPECIES.other, w / 2 - 2, hgt * 0.5, s, 0.8, 1, 'run');
        g.drawImage(spr.c, w / 2 - 2 - spr.ox * s, hgt * 0.5 - spr.oy * s, spr.w * s, spr.h * s);
        c.setAttribute('role', 'img'); c.setAttribute('aria-label', (R.SPECIES[loop] || R.SPECIES.other).name);
        return c;
      }

      /* ================= state ================= */
      let herd = null, critters = [], particles = [], constellations = [], motes = [];
      const game = {
        phase: 'intro', before: herdSpeed, start: performance.now(), perfect: 0, taps: 0, miss: 0, catches: 0,
        target: null, queue: [], penned: 0, total: 0, charge: 0, assist: false, assistOffered: false, lastCatchAt: 0,
        pressTime: 0, syncTime: 0, slackT: 0, slackSaid: false, coreStage: null, hold: 0, holding: false, startBpm: 100, endBpm: 60, finalBpm: 0,
        paddock: null, coreCritter: null, futureTap: null
      };
      const input = { down: false, key: false, x: 0, y: 0, angle: 0, dist: 0, downAt: 0, downX: 0, downY: 0, moved: 0, speed: 0, lastT: 0, lastX: 0, lastY: 0, pendingMiss: null };
      const ringState = { sync: false, assist: false, text: '' };
      const knot = { visible: false, fixed: null, glide: null, idle: -Math.PI / 2, wobble: 0 };
      const posts = [0, 0, 0, 0];
      const lasso = { spin: 0, throwT: -1, dur: 0.22, target: null, miss: false, onDone: null };
      let gateClosed = 0, gateAnim = -1, rollcallCritter = null, almanacFresh = null;
      const tolDeg = () => [55, 42, 32][S.intensity()];
      const tolRad = () => tolDeg() * Math.PI / 180;
      const lapsNeeded = () => [0.75, 1, 1][S.intensity()];
      const tapCharge = () => [0.34, 0.25, 0.2][S.intensity()];

      function makeCritter(c, i, n, isCore) {
        return {
          id: i, label: c.label, loop: c.loop, sp: R.SPECIES[c.loop] || R.SPECIES.other, core: !!isCore,
          theta: (i / Math.max(1, n)) * TAU + Math.PI * 0.5, slot: i, phase: Math.random() * TAU, facing: 1,
          state: 'enter', enter: 0, enterDelay: i * 0.7, x: -60, y: Wd.track.cy, fly: null, bounce: 0, sleep: false, rest: 0, restT: 0,
          jitter: c.loop === 'whatif' ? 1 : 0, announced: false, spin: 0, penSlot: null
        };
      }
      function trackPoint(theta) { const t = Wd.track; return { x: t.cx + Math.cos(theta) * t.rx, y: t.cy + Math.sin(theta) * t.ry }; }
      function depthScale(y) { const t = Wd.track; return Wd.unit * (0.78 + 0.32 * S.clamp((y - (t.cy - t.ry)) / (2 * t.ry), 0, 1.4)); }

      /* ================= clock (audio-driven, with a silent fallback so the knot never freezes) ================= */
      const clock = { running: false, bpm: 100, target: 100, next: 0, index: 0, beats: [], paused: false, base: 'p' };
      const audioLive = () => !!(A.ctx && A.ctx.state === 'running');
      const cnow = () => (audioLive() ? A.ctx.currentTime : performance.now() / 1000);
      const vnow = () => cnow() - (audioLive() ? A.latency() : 0); // the moment the listener is hearing
      let lastBeatSeen = null;
      function startClock(bpm, at) { clock.bpm = clock.target = bpm; clock.next = at; clock.index = 0; clock.beats = []; clock.running = true; clock.base = audioLive() ? 'a' : 'p'; lastBeatSeen = null; }
      function scheduleBeats() {
        if (!clock.running || clock.paused) return;
        const base = audioLive() ? 'a' : 'p';
        if (base !== clock.base) { clock.base = base; clock.next = cnow() + 0.3; clock.beats = []; lastBeatSeen = null; }
        const horizon = cnow() + 0.16;
        while (clock.next < horizon) {
          const t = clock.next, i = clock.index;
          clock.beats.push({ t, i, tapped: i === game.futureTap });
          onBeat(t, i);
          const ease = ['herd', 'core'].includes(game.phase) ? 0.16 : 0.3;
          clock.bpm += (clock.target - clock.bpm) * ease;
          clock.next += 60 / clock.bpm;
          clock.index++;
        }
        if (clock.beats.length > 16) clock.beats.splice(0, clock.beats.length - 16);
      }
      function beatWindow() {
        const vt = vnow();
        let prev = null, next = null;
        for (const b of clock.beats) { if (b.t <= vt) prev = b; else { next = b; break; } }
        if (!next) next = { t: clock.next, i: clock.index };
        if (!prev) prev = { t: next.t - 60 / clock.bpm, i: next.i - 1 };
        return { prev, next, p: S.clamp((vt - prev.t) / Math.max(0.05, next.t - prev.t), 0, 1) };
      }
      function clockAngle() { const { prev, p } = beatWindow(); const bp = prev.i + p; return -Math.PI / 2 + TAU * ((((bp % 4) + 4) % 4) / 4); }
      function knotAngle() {
        if (knot.fixed != null) return knot.fixed + (knot.wobble ? Math.sin(performance.now() / 40) * 0.03 * knot.wobble : 0);
        if (clock.running) return clockAngle();
        return knot.idle;
      }
      const isRopePhase = () => game.phase === 'herd' || (game.phase === 'core' && game.coreStage === 'rope');

      /* ================= music (scheduled on the beat) ================= */
      const PROG = [
        { bass: ['G2', 'D3'], chord: ['G3', 'B3', 'D4', 'G4'] },
        { bass: ['E2', 'B2'], chord: ['E3', 'G3', 'B3', 'E4'] },
        { bass: ['C3', 'G2'], chord: ['G3', 'C4', 'E4', 'G4'] },
        { bass: ['D3', 'A2'], chord: ['A3', 'D4', 'F#4', 'A4'] }
      ];
      const PENTA = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5', 'D6'];
      function onBeat(t, i) {
        if (clock.base !== 'a' || !A.ctx) return;
        const ph = game.phase;
        const bar = Math.floor(i / 4), beat = ((i % 4) + 4) % 4, ch = PROG[((bar % 4) + 4) % 4];
        const soft = S.intensity() === 0 ? 0.75 : 1;
        if (ph === 'countin') {
          A.wood(t, beat === 0 ? 0.32 : 0.22, beat === 0 ? 1.25 : 1);
          if (beat === 0) A.pluck(A.note(ch.bass[0]), { when: t, vol: 0.3, damp: 0.994, lp: 900, bus: 'music' });
          return;
        }
        if (ph === 'herd') {
          A.drum(t, (beat === 0 ? 0.26 : 0.16) * soft, beat === 0 ? 0.92 : 1.05);
          if (beat === 0 || beat === 2) A.pluck(A.note(ch.bass[beat === 0 ? 0 : 1]), { when: t, vol: 0.34 * soft, damp: 0.993, lp: 1000, bus: 'music' });
          if (beat === 1 || beat === 3) ch.chord.forEach((n, k) => A.pluck(A.note(n), { when: t + k * 0.022, vol: 0.12 * soft, damp: 0.996, bus: 'music', pan: (k - 1.5) * 0.15 }));
          const half = 30 / clock.bpm;
          if (S.intensity() > 0) A.shaker(t + half, 0.045 * soft);
          if (Math.random() < 0.08 && critters.some(c => c.state === 'run')) A.bleat({ when: t + half * 0.5, pitch: 0.85 + Math.random() * 0.4, vol: 0.08, pan: Math.random() * 1.2 - 0.6 });
          return;
        }
        if (ph === 'core') {
          A.drum(t, 0.12 * soft, 0.8);
          A.pluck(A.note(ch.chord[beat]), { when: t, vol: 0.14, damp: 0.997, bus: 'music', verb: 0.3 });
          if (beat === 0) A.pluck(A.note(ch.bass[0]), { when: t, vol: 0.3, damp: 0.995, lp: 800, bus: 'music' });
          if (game.holding) A.tone({ when: t, type: 'sine', freq: 98, dur: 0.6, vol: 0.12, attack: 0.04, bus: 'music' });
        }
      }
      /* Prairie night (wind, fire, crickets) and the rope whirr, released when the console unmounts the game. */
      let whirr = null, amb = null;
      function startAudio() {
        if (!A.ctx || S.destroyed) return;
        if (!amb) amb = K.ambience('prairie');
        if (!whirr) whirr = A.loop({ pink: false, filter: 'bandpass', freq: 700, q: 1.6 });
      }
      startAudio();
      S.on('audio-ready', startAudio);
      S.onDestroy(() => { if (whirr) { whirr.stop(); whirr = null; } });

      /* ================= camera ================= */
      let camTween = null, duskTween = null;
      function camTo(y, z, d, cb) {
        if (S.reduced()) { Wd.cam.y = y; Wd.cam.z = z; camTween = null; if (cb) cb(); return; }
        camTween = { t: 0, d, fy: Wd.cam.y, ty: y, fz: Wd.cam.z, tz: z, cb };
      }
      function duskTo(v, d) { duskTween = { t: 0, d: S.reduced() ? 0.01 : d, f: Wd.dusk, to: v }; }
      function campCam() { return Wd.portrait ? -Math.min(Wd.h * 0.2, Wd.fire.y - Wd.h * 0.4) : -Math.min(Wd.h * 0.15, Wd.fire.y - Wd.h * 0.44); }

      /* ================= update ================= */
      let embersTimer = 0;
      function update(dt, t) {
        if (camTween) {
          camTween.t += dt;
          const k = S.ease.inOutCubic(S.clamp(camTween.t / camTween.d, 0, 1));
          Wd.cam.y = S.lerp(camTween.fy, camTween.ty, k); Wd.cam.z = S.lerp(camTween.fz, camTween.tz, k);
          if (camTween.t >= camTween.d) { const cb = camTween.cb; camTween = null; if (cb) cb(); }
        }
        if (duskTween) { duskTween.t += dt; const k = S.clamp(duskTween.t / duskTween.d, 0, 1); Wd.dusk = S.lerp(duskTween.f, duskTween.to, S.ease.inOutSine(k)); if (k >= 1) duskTween = null; }
        if (lift.t < 1) { lift.t = Math.min(1, lift.t + dt / lift.d); lift.v = S.lerp(lift.from, lift.to, S.ease.outBack(lift.t)); }
        Wd.cam.shake = Math.max(0, Wd.cam.shake - dt * 3);
        posts.forEach((v, k) => { posts[k] = Math.max(0, v - dt * 3.2); });
        if (knot.glide) {
          knot.glide.t += dt;
          const k = S.ease.outCubic(S.clamp(knot.glide.t / knot.glide.d, 0, 1));
          knot.fixed = S.lerp(knot.glide.from, knot.glide.to, k);
          if (k >= 1) knot.glide = null;
        }
        knot.wobble = Math.max(0, knot.wobble - dt * 2);
        // a resting finger stops sending moves: let its speed settle so stillness is recognised
        if (input.down && performance.now() - input.lastT > 90) input.speed = Math.max(0, input.speed - dt * 4000);
        beatCrossings();
        updateRope(dt);
        updateStill(dt);
        if (lasso.throwT >= 0) {
          lasso.throwT += dt;
          if (lasso.throwT >= lasso.dur) { const cb = lasso.onDone; lasso.throwT = -1; lasso.target = null; lasso.onDone = null; if (cb) cb(); }
        }
        if (gateAnim >= 0) { gateAnim += dt; gateClosed = S.clamp(gateAnim / 0.5, 0, 1); if (gateClosed >= 1) gateAnim = -1; }
        const bpm = clock.running ? clock.bpm : (game.phase === 'rollcall' ? game.startBpm : 70);
        const omega = TAU / 8 * (bpm / 60);
        const active = critters.filter(c => c.state === 'run' || c.state === 'enter' || c.state === 'target');
        active.forEach((c, k) => { c.slot = k; });
        const n = Math.max(1, active.length);
        critters.forEach(c => {
          c.phase += dt * (bpm / 60) * TAU * (c.core ? 0.7 : 1);
          if (c.state === 'enter') {
            c.enterDelay -= dt;
            if (c.enterDelay <= 0) {
              c.enter = Math.min(1, c.enter + dt * 1.2);
              const p = trackPoint(c.theta), from = { x: -80, y: Wd.track.cy + Wd.track.ry * 0.4 }, k = S.ease.outCubic(c.enter);
              c.x = S.lerp(from.x, p.x, k); c.y = S.lerp(from.y, p.y, k); c.facing = 1;
              if (c.enter >= 1) c.state = 'run';
              if (!c.announced && c.enter > 0.05) { c.announced = true; if (game.phase === 'rollcall') announce(c); }
            }
          } else if (c.state === 'run' || c.state === 'target') {
            const lead = active[0] ? active[0].theta - (active[0].slot / n) * TAU : 0;
            const desired = lead + (c.slot / n) * TAU, diff = ((desired - c.theta) % TAU + TAU * 1.5) % TAU - TAU / 2;
            const speedMul = c.core ? 0.55 * (1 - game.hold * 0.95) : 1;
            c.theta += omega * dt * speedMul + diff * dt * 0.8;
            const p = trackPoint(c.theta);
            const nx = p.x + (c.jitter && !S.reduced() ? Math.sin(t * 23 + c.id) * 1.2 : 0), ny = p.y;
            if (Math.abs(nx - c.x) > 0.2) c.facing = nx > c.x ? 1 : -1;
            c.x = nx; c.y = ny;
            if (c.core && game.hold > 0.3) {
              const k = S.ease.inOutSine(S.clamp((game.hold - 0.3) / 0.7, 0, 1));
              const rest = restPoint();
              c.x = S.lerp(p.x, rest.x, k); c.y = S.lerp(p.y, rest.y, k); c.facing = 1;
            }
            if (!S.reduced() && Math.random() < dt * (bpm / 60) * 1.5 * (c.core ? 0.5 : 1)) dust(c.x - c.facing * 10 * depthScale(c.y), c.y + 10 * depthScale(c.y), 1);
          } else if (c.state === 'fly') {
            const f = c.fly; f.t += dt;
            const k = S.clamp(f.t / f.d, 0, 1);
            c.x = S.lerp(f.x0, f.x1, k); c.y = S.lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * f.arc;
            c.spin = S.reduced() ? 0 : k * TAU * c.facing;
            if (k >= 1) { c.state = 'pen'; c.bounce = 1; c.spin = 0; dust(c.x, c.y + 6, 6); if (A.ctx) A.thud({ vol: 0.25 }); }
          } else if (c.state === 'pen') {
            c.bounce = Math.max(0, c.bounce - dt * 2.5);
            c.restT += dt;
            if (!c.sleep && c.restT > 2.2) c.sleep = true;
          } else if (c.state === 'rest') {
            c.rest = Math.min(1, c.rest + dt * 0.8);
          }
        });
        embersTimer += dt;
        const emberRate = [0.09, 0.06, 0.035][S.intensity()] * (S.reduced() ? 2 : 1);
        while (embersTimer > emberRate) { embersTimer -= emberRate; particles.push({ kind: 'ember', x: Wd.fire.x + (Math.random() - 0.5) * 14, y: Wd.fire.y - 10, vx: (Math.random() - 0.5) * 10, vy: -26 - Math.random() * 30, life: 1.6 + Math.random() * 1.6, age: 0, r: 0.8 + Math.random() * 1.5 }); }
        particles.forEach(p => {
          p.age += dt;
          if (p.kind === 'ember') { p.x += (p.vx + Math.sin(p.age * 3 + p.r * 9) * 8) * dt; p.y += p.vy * dt; }
          else { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
        });
        particles = particles.filter(p => p.age < p.life);
        if (particles.length > 260) particles.splice(0, particles.length - 260);
        constellations.forEach(cs => { if (cs.started) cs.t += dt; });
        updateMotes(dt);
        if (game.phase === 'herd' && !game.assist && !game.assistOffered && performance.now() - game.lastCatchAt > (S.intensity() === 0 ? 10000 : 15000)) offerAssist();
      }
      function dust(x, y, n) { for (let i = 0; i < n; i++) particles.push({ kind: 'dust', x, y, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 16, life: 0.5 + Math.random() * 0.5, age: 0, r: 2 + Math.random() * 3 }); }

      /* ================= the orbit lasso ================= */
      function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
      function inSync() {
        if (!(input.down || input.key) || !isRopePhase()) return false;
        if (game.assist) return true;
        if (input.key) return false;
        const r = Wd.ring.r;
        if (input.dist < r * 0.35 || input.dist > r * 1.8) return false;
        return Math.abs(angDiff(input.angle, knotAngle())) < tolRad();
      }
      function updateRope(dt) {
        const live = isRopePhase();
        const sync = live && inSync();
        ringState.sync = sync; ringState.assist = game.assist;
        if (live && (input.down || (input.key && game.assist))) {
          game.pressTime += dt;
          const lap = 4 * 60 / Math.max(30, clock.bpm);
          if (sync) {
            game.charge += dt / (lap * lapsNeeded());
            game.syncTime += dt; game.slackT = 0;
          } else {
            game.charge = Math.max(0, game.charge - dt * 0.06);
            game.slackT += dt;
            if (game.slackT > 2.4 && !game.slackSaid) {
              game.slackSaid = true;
              face('worried', 1200); say(vline(R.LINES.slack), 2200);
              K.guide({ id: 'slack-' + game.penned, g: 'circle', target: ringCenterPoint, r: Wd.ring.r, label: 'FOLLOW THE KNOT', delay: 0 });
            }
          }
          if (game.charge >= 1) { game.charge = 0; if (game.phase === 'herd') throwLasso(); else coreBounce(); }
        }
        if (whirr) {
          const speed = S.clamp(input.speed / 900, 0, 1.4);
          whirr.level(live && input.down ? (sync ? 0.05 + speed * 0.05 : 0.018) : 0.0001, 0.05);
          whirr.freq(500 + speed * 900 + (sync ? 300 : 0), 0.08);
        }
        if (live) {
          if (game.assist) setRingText('Hold the rope', 'Any touch counts now');
          else if (!input.down) setRingText(game.phase === 'core' ? 'Rope the big one' : 'Ride the knot', 'Circle with it, or tap the posts');
          else setRingText(sync ? 'In sync' : 'Catch the knot', sync ? 'Keep circling' : 'Follow the glow', sync ? 'sync' : 'slack');
        }
      }
      function setRingText(head, sub, mood) {
        const key = head + '|' + sub + '|' + (mood || '');
        if (ringState.text === key) return;
        ringState.text = key;
        ringHead.textContent = head; ringSub.textContent = sub;
        ringHead.style.color = mood === 'sync' ? 'var(--sync)' : mood === 'slack' ? 'var(--slack)' : '';
      }
      const ringCenterPoint = () => ({ x: Wd.ring.cx, y: Wd.ring.cy });

      function beatCrossings() {
        if (!clock.running || clock.paused) return;
        const { prev } = beatWindow();
        if (!prev || prev.i === lastBeatSeen) return;
        const crossed = lastBeatSeen !== null && prev.i > lastBeatSeen && clock.beats.includes(prev);
        lastBeatSeen = prev.i;
        if (!crossed) return;
        const k = ((prev.i % 4) + 4) % 4;
        posts[k] = 1;
        if (clock.base === 'a') A.sync('beat-visual', performance.now(), prev.t);
        if (isRopePhase() && (input.down || input.key) && inSync()) {
          game.perfect++;
          if (A.ctx) { A.pluck(A.note(PENTA[Math.min(PENTA.length - 1, Math.floor(game.charge * 5) + Math.floor(game.penned / 2))]), { vol: 0.16, damp: 0.995, bus: 'sfx', verb: 0.25 }); A.sync('perfect-beat', performance.now()); }
          if (k === 0) showJudge('In sync', 'perfect');
        }
      }

      /* Taps on the posts (keyboard, and anyone who'd rather tap than trace). */
      function judgeTap(fromKey) {
        if (!isRopePhase()) return false;
        const tap = vnow();
        let best = null, bd = Infinity;
        for (const b of clock.beats) { const d = Math.abs(tap - b.t); if (d < bd) { bd = d; best = b; } }
        const nextD = Math.abs(clock.next - tap);
        if (nextD < bd) { best = { t: clock.next, i: clock.index, tapped: false, future: true }; bd = nextD; }
        if (!best) return false;
        const interval = 60 / clock.bpm;
        const inten = S.intensity();
        const perfectW = [0.1, 0.075, 0.06][inten] + interval * 0.04;
        const goodW = [0.2, 0.16, 0.13][inten] + interval * 0.05;
        const actionAt = performance.now();
        if (best.tapped) return false;
        if (bd <= goodW || game.assist) {
          best.tapped = true;
          if (best.future) game.futureTap = best.i;
          game.taps++;
          game.charge += tapCharge();
          const k = ((best.i % 4) + 4) % 4; posts[k] = 1;
          const grade = bd <= perfectW ? 'perfect' : 'good';
          if (A.ctx) { A.pluck(A.note(PENTA[Math.min(PENTA.length - 1, game.taps % 6 + 1)]), { vol: 0.2, damp: 0.995, verb: 0.2 }); A.sync('tap', actionAt); }
          showJudge(grade === 'perfect' ? 'Perfect' : 'Nice', grade);
          S.buzz(10);
          if (game.charge >= 1) { game.charge = 0; if (game.phase === 'herd') throwLasso(); else coreBounce(); }
          return true;
        }
        const signed = tap - best.t;
        if (fromKey) { game.miss++; showJudge(signed < 0 ? 'Early' : 'Late', 'miss'); if (A.ctx) { A.boing({ vol: 0.07, freq: 260 }); A.sync('tap-miss', actionAt); } }
        else input.pendingMiss = signed < 0 ? 'Early' : 'Late';
        return false;
      }
      function showJudge(text, kind) {
        judgeEl.textContent = text;
        judgeEl.style.color = kind === 'perfect' ? 'var(--judge-perfect)' : kind === 'good' ? 'var(--judge-good)' : kind === 'count' ? 'var(--ui-fg)' : 'var(--judge-miss)';
        judgeEl.classList.remove('show'); void judgeEl.offsetWidth; judgeEl.classList.add('show');
      }
      function offerAssist() {
        game.assistOffered = true;
        const b = h('button', { type: 'button', class: 'ts-btn ts-btn-quiet r-assist', text: 'Ride along (no timing)' });
        b.style.bottom = (Wd.h - Wd.ringTop + 18) + 'px';
        const clearOfLoopie = Wd.loopie.x + Wd.loopie.size / 2 + 12 + 100; // never over Loopie's art
        b.style.left = Math.min(Wd.w - 112, Math.max(Wd.ring.cx, clearOfLoopie)) + 'px';
        b.addEventListener('click', () => { game.assist = true; b.remove(); UI.toast('Any touch on the rope counts now. Enjoy the ride.'); ctx.track('assist', {}); });
        el.append(b);
        S.later(() => b.remove(), 12000);
      }

      /* Ring input: pointer (with capture, Framer-zoom aware) and the space bar. */
      const ringLocal = (p) => ({ x: p.x - Wd.ring.size / 2, y: p.y - Wd.ring.size / 2 });
      function trackInput(q) {
        const now = performance.now();
        const dtm = Math.max(1, now - input.lastT);
        const v = Math.hypot(q.x - input.lastX, q.y - input.lastY) / dtm * 1000;
        input.speed = input.lastT ? input.speed * 0.7 + v * 0.3 : 0;
        input.lastT = now; input.lastX = q.x; input.lastY = q.y;
        input.x = q.x; input.y = q.y; input.dist = Math.hypot(q.x, q.y); input.angle = Math.atan2(q.y, q.x);
        input.moved = Math.max(input.moved, Math.hypot(q.x - input.downX, q.y - input.downY));
      }
      function pointerEnd() {
        if (!input.down) return;
        input.down = false; input.speed = 0;
        if (input.pendingMiss && performance.now() - input.downAt < 260 && input.moved < 14 && isRopePhase()) {
          game.miss++; showJudge(input.pendingMiss, 'miss'); if (A.ctx) A.boing({ vol: 0.06, freq: 260 });
        }
        input.pendingMiss = null;
        pressEnd();
      }
      K.press(ringBtn, {
        down: (p) => {
          if (input.down || S.destroyed) return;
          const q = ringLocal(p);
          input.down = true; input.lastT = 0; input.speed = 0; input.moved = 0; input.pendingMiss = null;
          input.downX = q.x; input.downY = q.y;
          trackInput(q);
          input.downAt = performance.now();
          pressStart(false);
        },
        move: (p) => { if (input.down) trackInput(ringLocal(p)); },
        up: () => pointerEnd()
      });
      S.listen(window, 'keydown', (e) => {
        if (!(e.code === 'Space' || e.code === 'Enter') || e.repeat) return;
        const ae = document.activeElement;
        if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT' || (ae.tagName === 'BUTTON' && ae !== ringBtn))) return;
        if (!(el.contains(ae) || ae === document.body || !ae)) return;
        if (!['countin', 'herd', 'core'].includes(game.phase)) return;
        e.preventDefault();
        A.unlock();
        input.key = true;
        pressStart(true);
      });
      S.listen(window, 'keyup', (e) => { if ((e.code === 'Space' || e.code === 'Enter') && input.key) { input.key = false; pressEnd(); } });

      function pressStart(fromKey) {
        K.guideDone();
        if (game.phase === 'countin') { if (A.ctx) { A.drum(undefined, 0.25); A.sync('press', performance.now()); } return; }
        if (isRopePhase()) { judgeTap(fromKey); return; }
        if (game.phase === 'core' && game.coreStage === 'still') stillPress(fromKey);
      }
      function pressEnd() {
        if (game.phase === 'core' && game.coreStage === 'still' && game.holding) { game.holding = false; }
      }

      /* Catching. */
      function throwLasso() {
        const c = game.target; if (!c || c.state !== 'run' || lasso.throwT >= 0) return;
        lasso.target = c; lasso.throwT = 0; lasso.dur = 0.22; lasso.miss = false;
        c.state = 'target';
        lasso.onDone = () => catchCritter(c);
        const at = performance.now();
        if (A.ctx) { A.whoosh({ vol: 0.2, dur: 0.25, from: 300, to: 3600 }); A.sync('catch', at); }
        K.guideDone();
      }
      function catchCritter(c) {
        c.penSlot = game.penned % Wd.penSlots.length;
        const slot = Wd.penSlots[c.penSlot];
        c.state = 'fly';
        c.fly = { t: 0, d: S.reduced() ? 0.45 : 0.8, x0: c.x, y0: c.y, x1: slot.x, y1: slot.y, arc: Math.max(80, Math.abs(c.y - slot.y) + 60) };
        game.penned++; game.catches++; game.lastCatchAt = performance.now(); game.slackSaid = false;
        renderTally();
        if (A.ctx) { A.pop({ freq: 620, vol: 0.2 }); A.bleat({ pitch: 1.15, vol: 0.18 }); }
        S.buzz([18, 40, 18]);
        if (S.intensity() === 2) Wd.cam.shake = 0.6;
        const k = game.penned / game.total;
        clock.target = S.lerp(game.startBpm, game.endBpm + 4, k);
        setBaseFace(k < 0.34 ? 'excited' : k < 0.67 ? 'half' : 'calm');
        face('laugh', 900);
        showJudge('Caught!', 'perfect');
        if (game.penned === 1 || game.penned === 3 || game.penned === game.total) say(lines('catch'), 1700);
        banner.hidden = true;
        S.later(() => { if (game.phase === 'herd') nextTarget(); }, 380);
      }
      function renderTally() { tallyEl.textContent = game.penned + ' / ' + game.total; }

      /* ================= the big one ================= */
      async function startCore() {
        game.phase = 'core'; game.coreStage = 'arrive'; game.charge = 0;
        clock.target = game.endBpm;
        const c = game.coreCritter;
        c.state = 'enter'; c.enter = 0; c.enterDelay = 0.2; c.theta = Math.PI * 0.6;
        critters.push(c);
        game.target = c;
        setBaseFace('calm'); face('surprised', 1800);
        if (A.ctx) { A.tone({ type: 'sine', freq: 55, to: 45, dur: 1.4, vol: 0.4, attack: 0.05 }); A.bleat({ pitch: 0.55, vol: 0.2, dur: 0.8 }); }
        await S.sleep(900);
        if (game.phase !== 'core') return;
        banner.textContent = c.label; banner.classList.add('big'); banner.hidden = false; bannerKey = '';
        game.coreStage = 'rope';
        K.guide({ id: 'core-rope', g: 'circle', target: ringCenterPoint, r: Wd.ring.r, label: 'TRY TO ROPE IT', delay: 300 });
      }
      async function coreBounce() {
        const c = game.coreCritter;
        if (game.coreStage !== 'rope') return;
        game.coreStage = 'bounce';
        lasso.target = c; lasso.throwT = 0; lasso.dur = 0.3; lasso.miss = true;
        lasso.onDone = () => { if (A.ctx) A.boing({ freq: 200, vol: 0.2 }); dust(c.x, c.y + 10, 10); Wd.cam.shake = S.intensity() && !S.reduced() ? 0.5 : 0; };
        if (A.ctx) A.whoosh({ vol: 0.2, dur: 0.3, from: 300, to: 2600 });
        face('confused', 2600);
        say(vline(R.LINES.bounce), 1600);
        K.guide(null);
        await S.sleep(1700);
        if (game.phase !== 'core') return;
        banner.hidden = true;
        await say(lines('core'), 0);
        await S.sleep(900);
        if (game.phase !== 'core') return;
        // The knot glides to the top post and stops. Now the only move is to stay with it.
        const cur = knotAngle();
        let to = -Math.PI / 2; while (to < cur) to += TAU;
        knot.glide = { t: 0, d: S.reduced() ? 0.01 : 1.4, from: cur, to };
        knot.fixed = cur;
        game.coreStage = 'still'; game.hold = 0;
        setRingText('Hold still', 'Thumb on the knot');
        say(vline(R.LINES.still), 0);
        K.guide({ id: 'core-still', g: 'still', target: knotPoint, label: 'HOLD STILL ON THE KNOT', ms: 2600, delay: 900 });
      }
      const knotPoint = () => { const a = knotAngle(); return { x: Wd.ring.cx + Math.cos(a) * Wd.ring.r, y: Wd.ring.cy + Math.sin(a) * Wd.ring.r }; };
      function stillPress(fromKey) {
        if (fromKey) { game.holding = true; return; }
        const a = knotAngle(), kx = Math.cos(a) * Wd.ring.r, ky = Math.sin(a) * Wd.ring.r;
        if (Math.hypot(input.x - kx, input.y - ky) < 54) game.holding = true;
        else { knot.wobble = 1; showJudge('On the knot', 'count'); }
      }
      let wobbleSaid = 0;
      function updateStill(dt) {
        if (game.phase !== 'core' || game.coreStage !== 'still') return;
        const beats = 4, dur = beats * 60 / Math.max(40, clock.bpm);
        if (game.holding && input.down) {
          const a = knotAngle(), kx = Math.cos(a) * Wd.ring.r, ky = Math.sin(a) * Wd.ring.r;
          if (Math.hypot(input.x - kx, input.y - ky) > 70) game.holding = false;
        }
        const still = game.holding && (input.key || input.speed < 70);
        if (still) { game.hold = Math.min(1, game.hold + dt / dur); }
        else if (game.holding) {
          knot.wobble = 1;
          if (performance.now() - wobbleSaid > 4000) { wobbleSaid = performance.now(); say(vline(R.LINES.wobble), 1600); if (A.ctx) A.noise({ filter: 'lowpass', freq: 500, dur: 0.3, vol: 0.06 }); }
        } else game.hold = Math.max(0, game.hold - dt * 0.1);
        setRingText(still ? 'Stay with it' : 'Hold still', still ? Math.round(game.hold * 100) + '%' : 'Thumb on the knot', still ? 'sync' : '');
        if (whirr) whirr.level(0.0001);
        if (game.hold > 0.05 && !sayEl.hidden && still) sayEl.hidden = true;
        if (game.hold >= 1) finishCore();
      }
      async function finishCore() {
        game.coreStage = 'done'; game.holding = false;
        K.guide(null);
        const c = game.coreCritter;
        c.state = 'rest'; c.sleep = true;
        banner.hidden = true;
        game.finalBpm = Math.round(clock.bpm);
        clock.running = false;
        setBaseFace('peace');
        const at = performance.now();
        if (A.ctx) {
          A.pad([A.note('G3'), A.note('B3'), A.note('D4'), A.note('G4')], { dur: 5, vol: 0.2, attack: 1.2 });
          A.chime(A.note('G5'), { vol: 0.12, dur: 2.2 });
          A.sync('still-done', at);
        }
        S.buzz(30);
        game.phase = 'settle';
        ringZone.hidden = true;
        if (whirr) whirr.level(0.0001, 0.1);
        // the almanac counts each kind rounded up tonight (species only, never words)
        almanacFresh = R.addToAlmanac(Array.from(new Set(critters.filter(x => x.state === 'pen' || x.state === 'rest').map(x => x.loop))));
        await S.sleep(700);
        gateAnim = 0;
        if (A.ctx) { A.wood(undefined, 0.3, 0.7); S.later(() => { if (A.ctx) A.wood(undefined, 0.2, 0.6); }, 120); }
        await say(lines('close'), 3200);
        await S.sleep(500);
        if (game.phase !== 'settle') return;
        stage.go('paddock');
      }

      /* ================= render ================= */
      function draw(t) {
        const g = cv.g; if (!g || !skyCache) return;
        const w = Wd.w, H = Wd.h, cam = Wd.cam;
        const shakeX = cam.shake && !S.reduced() ? Math.sin(t * 60) * cam.shake * 3 : 0;
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        g.clearRect(0, 0, w, H);
        g.translate(Wd.fire.x + shakeX, Wd.fire.y); g.scale(cam.z, cam.z); g.translate(-Wd.fire.x, -Wd.fire.y);
        const skyOff = cam.y * 0.35;
        g.drawImage(skyCache.c, 0, -H * 0.6 + skyOff, skyCache.w, skyCache.h);
        if (Wd.dusk > 0.01) { // golden hour deepens to dusk for the finale, so the new stars can be seen
          const dg = g.createLinearGradient(0, -H * 0.6 + skyOff, 0, Wd.horizon + 40);
          dg.addColorStop(0, `rgba(10,14,46,${0.92 * Wd.dusk})`); dg.addColorStop(0.7, `rgba(36,30,86,${0.8 * Wd.dusk})`); dg.addColorStop(1, `rgba(120,70,110,${0.5 * Wd.dusk})`);
          g.fillStyle = dg; g.fillRect(0, -H * 0.6 + skyOff, w, H * 0.6 + Wd.horizon + 40);
        }
        const starA = palette.dark ? 1 : Wd.dusk;
        if (starA > 0.02) {
          g.fillStyle = '#fffaf0';
          for (const s of stars) {
            const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
            const y = s.y + skyOff; if (y < -4 || y > H) continue;
            g.globalAlpha = a * 0.9 * starA; g.fillRect(s.x, y, s.r, s.r);
          }
          g.globalAlpha = 1;
        }
        for (const cl of clouds) {
          const x = ((cl.x - t * cl.v) % (w + cl.c.w) + (w + cl.c.w)) % (w + cl.c.w) - cl.c.w;
          g.drawImage(cl.c.c, x, cl.y + skyOff, cl.c.w, cl.c.h);
        }
        if ((palette.dark || Wd.dusk > 0.5) && !S.reduced() && ['intro', 'settle', 'paddock', 'finale', 'end'].includes(game.phase)) {
          if (!shooting && t > nextShoot) { const r = Math.random(); shooting = { t0: t, x: w * (0.2 + 0.6 * r), y: H * (0.08 + 0.15 * Math.random()) + skyOff * 0.2, len: 90 + 60 * r }; nextShoot = t + 9 + Math.random() * 10; }
          if (shooting) {
            const k = (t - shooting.t0) / 0.8;
            if (k >= 1) shooting = null; else {
              const hx = shooting.x + k * 160, hy = shooting.y + k * 70;
              const tg = g.createLinearGradient(hx, hy, hx - shooting.len * 0.9, hy - shooting.len * 0.4);
              tg.addColorStop(0, `rgba(255,250,235,${0.9 * (1 - k)})`); tg.addColorStop(1, 'rgba(255,250,235,0)');
              g.strokeStyle = tg; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - shooting.len * 0.9, hy - shooting.len * 0.4); g.stroke();
            }
          }
        }
        drawConstellations(g, t, skyOff);
        const skyBottom = -H * 0.6 + skyOff + skyCache.h - 1;
        if (skyBottom < H) { g.fillStyle = palette.skyLow; g.fillRect(0, skyBottom, w, H - skyBottom + 2); }
        const mfY = Wd.horizon - mesaFar.h + 22 + cam.y * 0.6, mnY = Wd.horizon - mesaNear.h + 26 + cam.y * 0.8;
        g.drawImage(mesaFar.c, 0, mfY, mesaFar.w, mesaFar.h);
        g.fillStyle = palette.mesaFar; g.fillRect(0, mfY + mesaFar.h - 1, w, Math.max(0, H - mfY - mesaFar.h + 2));
        g.drawImage(mesaNear.c, 0, mnY, mesaNear.w, mesaNear.h);
        g.fillStyle = palette.mesa; g.fillRect(0, mnY + mesaNear.h - 1, w, Math.max(0, H - mnY - mesaNear.h + 2));
        const gy = cam.y;
        g.drawImage(groundCache.c, 0, Wd.horizon + gy, groundCache.w, groundCache.h);
        if (Wd.dusk > 0.01) { g.fillStyle = `rgba(16,12,40,${0.42 * Wd.dusk})`; g.fillRect(0, mfY, w, H - mfY + 2); }
        g.save(); g.translate(0, gy);
        const flick = 0.85 + Math.sin(t * 7.3) * 0.06 + Math.sin(t * 13.1) * 0.05;
        const lightR = (Wd.portrait ? 170 : 230) * Wd.unit * flick;
        g.globalCompositeOperation = palette.dark || Wd.dusk > 0.3 ? 'lighter' : 'source-over';
        const lg = g.createRadialGradient(Wd.fire.x, Wd.fire.y, 4, Wd.fire.x, Wd.fire.y, lightR);
        lg.addColorStop(0, palette.dark ? 'rgba(255,170,80,0.34)' : 'rgba(255,190,110,0.22)'); lg.addColorStop(1, 'rgba(255,150,60,0)');
        g.fillStyle = lg; g.beginPath(); g.ellipse(Wd.fire.x, Wd.fire.y, lightR * 1.25, lightR * 0.55, 0, 0, TAU); g.fill();
        g.globalCompositeOperation = 'source-over';
        g.drawImage(penCache.c, Wd.pen.x - 10, Wd.pen.y - 26, penCache.w, penCache.h);
        critters.filter(c => c.state === 'pen').sort((a, b) => a.y - b.y).forEach(c => drawCritter(g, c, t, Wd.unit * 0.62 * (1 + c.bounce * 0.15), 'sit'));
        if (gateClosed > 0) {
          const gt = Wd.penGate, ox = Wd.pen.x - 10, oy = Wd.pen.y - 26, k = S.ease.outBack(gateClosed);
          g.strokeStyle = palette.wood; g.lineWidth = 2.6; g.beginPath();
          const x1 = ox + gt.x1, x2 = ox + S.lerp(gt.x1, gt.x2, k), y = oy + gt.y;
          g.moveTo(x1, y - 12); g.lineTo(x2, y - 12); g.moveTo(x1, y - 6); g.lineTo(x2, y - 6); g.stroke();
        }
        const runners = critters.filter(c => c.state === 'run' || c.state === 'target' || c.state === 'enter' || c.state === 'rest');
        runners.filter(c => c.y < Wd.fire.y).sort((a, b) => a.y - b.y).forEach(c => drawRunner(g, c, t));
        drawFire(g, t, flick);
        runners.filter(c => c.y >= Wd.fire.y).sort((a, b) => a.y - b.y).forEach(c => drawRunner(g, c, t));
        critters.filter(c => c.state === 'fly').forEach(c => drawCritter(g, c, t, depthScale(c.y) * 0.9, 'fly'));
        particles.forEach(p => {
          const k = 1 - p.age / p.life;
          if (p.kind === 'ember') { g.fillStyle = `rgba(255,${180 + Math.round(60 * k)},110,${0.85 * k})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); }
          else { g.fillStyle = palette.dark ? `rgba(160,140,170,${0.28 * k})` : `rgba(140,100,60,${0.25 * k})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1.5 - k * 0.5), 0, TAU); g.fill(); }
        });
        drawLasso(g, t);
        g.restore();
        g.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
        drawMotes(g, t);
        if (!vignette || vignette.w !== w || vignette.h !== H || vignette.dark !== palette.dark) {
          const vg = g.createRadialGradient(w / 2, H * 0.55, Math.min(w, H) * 0.35, w / 2, H * 0.55, Math.max(w, H) * 0.75);
          vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, palette.dark ? 'rgba(4,2,12,0.55)' : 'rgba(60,30,10,0.22)');
          vignette = { g: vg, w, h: H, dark: palette.dark };
        }
        g.fillStyle = vignette.g; g.fillRect(0, 0, w, H);
      }

      function drawRunner(g, c, t) {
        const s = depthScale(c.y) * (c.core ? 1.7 : 1);
        if (c === game.target && (game.phase === 'herd' || (game.phase === 'core' && game.coreStage === 'rope'))) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 6);
          g.strokeStyle = `rgba(255,210,122,${0.45 + pulse * 0.35})`; g.lineWidth = 2;
          g.beginPath(); g.ellipse(c.x, c.y + 12 * s, 26 * s, 7 * s, 0, 0, TAU); g.stroke();
        }
        drawCritter(g, c, t, s, c.state === 'rest' ? 'rest' : 'run');
      }
      function drawCritter(g, c, t, s, pose) {
        const variant = (c.core ? 'core-' : '') + ((c.sleep || pose === 'rest') ? 'sleep' : 'awake');
        const spr = critterSprite(c.loop, variant, s);
        const bob = pose === 'run' ? -Math.abs(Math.sin(c.phase)) * 3 * s : (pose === 'sit' ? Math.sin(t * 1.5 + c.id) * 0.6 : 0);
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(c.x, c.y + 18 * s, 21 * s, 4.5 * s, 0, 0, TAU); g.fill();
        if (pose !== 'fly') drawLegs(g, c.sp, c.x, c.y + bob, s, c.phase, c.facing, pose);
        g.save(); g.translate(c.x, c.y + bob);
        if (c.spin) g.rotate(c.spin);
        if (pose === 'rest') g.scale(1.04, 0.86);
        g.scale(c.facing, 1);
        g.drawImage(spr.c, -spr.ox * s, -spr.oy * s, spr.w * s, spr.h * s);
        g.restore();
        if ((c.sleep || pose === 'rest') && pose !== 'fly' && !c.moted) {
          const k = (t * 0.6 + c.id * 0.37) % 1;
          g.fillStyle = palette.dark ? `rgba(255,250,235,${0.8 * (1 - k)})` : `rgba(60,40,30,${0.6 * (1 - k)})`;
          g.font = `600 ${Math.round(10 * s + 4)}px Fredoka, sans-serif`;
          g.fillText('z', c.x + 18 * s + k * 8, c.y - 18 * s - k * 16);
        }
      }
      function drawFire(g, t, flick) {
        const x = Wd.fire.x, y = Wd.fire.y, s = Wd.unit * (Wd.portrait ? 1 : 1.2);
        g.save(); g.translate(x, y + 8 * s);
        g.fillStyle = palette.woodDark;
        g.rotate(0.28); g.fillRect(-22 * s, -3.5 * s, 44 * s, 7 * s); g.rotate(-0.56); g.fillRect(-22 * s, -3.5 * s, 44 * s, 7 * s);
        g.restore();
        g.fillStyle = 'rgba(255,120,40,0.6)'; g.beginPath(); g.ellipse(x, y + 6 * s, 16 * s, 4 * s, 0, 0, TAU); g.fill();
        g.globalCompositeOperation = 'lighter';
        const layers = [[26, 50, [255, 96, 40], 0.7], [19, 38, [255, 160, 60], 0.85], [10, 24, [255, 236, 170], 0.95]];
        layers.forEach(([fw, fh, rgb, a], k) => {
          for (let j = -1; j <= 1; j++) {
            const hh = fh * s * (j ? 0.62 : 1) * (1 + 0.14 * Math.sin(t * 9 + k * 1.7 + j * 2) + 0.08 * Math.sin(t * 14.3 + k + j));
            const ww = fw * s * (j ? 0.6 : 1), bx = x + j * fw * 0.45 * s, sway = Math.sin(t * 5.2 + k + j * 1.3) * 4 * s;
            const gr = g.createLinearGradient(0, y, 0, y - hh);
            gr.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`); gr.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
            g.fillStyle = gr; g.beginPath(); g.moveTo(bx - ww / 2, y);
            g.bezierCurveTo(bx - ww / 2, y - hh * 0.45, bx - ww * 0.15 + sway * 0.5, y - hh * 0.72, bx + sway, y - hh);
            g.bezierCurveTo(bx + ww * 0.15 + sway * 0.5, y - hh * 0.72, bx + ww / 2, y - hh * 0.45, bx + ww / 2, y);
            g.closePath(); g.fill();
          }
        });
        const glow = g.createRadialGradient(x, y - 14 * s, 2, x, y - 14 * s, 60 * s * flick);
        glow.addColorStop(0, 'rgba(255,190,90,0.35)'); glow.addColorStop(1, 'rgba(255,140,50,0)');
        g.fillStyle = glow; g.fillRect(x - 70 * s, y - 80 * s, 140 * s, 110 * s);
        g.globalCompositeOperation = 'source-over';
      }

      /* Loopie's lasso spins above his head in step with the knot, and grows as the rope charges. */
      function handPoint() { return { x: Wd.loopie.x + Wd.loopie.size * 0.34, y: Wd.loopie.y - Wd.loopie.size * 0.08 - lift.v }; }
      function drawLasso(g) {
        const show = ['herd', 'countin'].includes(game.phase) || (game.phase === 'core' && ['rope', 'bounce', 'arrive'].includes(game.coreStage));
        if (!show && lasso.throwT < 0) return;
        const hp = handPoint();
        g.strokeStyle = palette.rope; g.lineCap = 'round';
        if (lasso.throwT >= 0 && lasso.target) {
          const k = S.clamp(lasso.throwT / lasso.dur, 0, 1);
          const tgt = { x: lasso.target.x, y: lasso.target.y - 4 };
          const mx = (hp.x + tgt.x) / 2, my = Math.min(hp.y, tgt.y) - 60;
          const qx = (1 - k) * (1 - k) * hp.x + 2 * (1 - k) * k * mx + k * k * tgt.x;
          const qy = (1 - k) * (1 - k) * hp.y + 2 * (1 - k) * k * my + k * k * tgt.y;
          g.lineWidth = 2; g.beginPath(); g.moveTo(hp.x, hp.y); g.quadraticCurveTo(S.lerp(hp.x, mx, k), S.lerp(hp.y, my, k), qx, qy); g.stroke();
          const lr = (lasso.miss ? 26 : 18) * Wd.unit * (lasso.target.core ? 1.6 : 1);
          g.lineWidth = 2.4; g.beginPath(); g.ellipse(qx, qy, lr, lr * 0.4, 0, 0, TAU); g.stroke();
          return;
        }
        const ch = S.clamp(game.charge, 0, 1);
        const r = (14 + ch * 22) * Wd.unit;
        lasso.spin = clock.running ? knotAngle() : lasso.spin + 0.05;
        const cx = hp.x + 6, cy = hp.y - 34 * Wd.unit - ch * 10;
        g.lineWidth = 2.4; g.beginPath(); g.moveTo(hp.x, hp.y); g.lineTo(cx + Math.cos(lasso.spin) * r, cy + Math.sin(lasso.spin) * r * 0.35); g.stroke();
        g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, r, r * 0.35, Math.sin(lasso.spin * 0.5) * 0.15, 0, TAU); g.stroke();
        if (ch > 0.05) { g.strokeStyle = `rgba(255,214,120,${0.25 + ch * 0.5})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy - 1, r, r * 0.35, Math.sin(lasso.spin * 0.5) * 0.15, Math.PI, TAU); g.stroke(); }
      }

      function drawRing() {
        if (!ringCtx || ringZone.hidden) return;
        const g = ringCtx, SZ = Wd.ring.size, c = SZ / 2, r = Wd.ring.r;
        g.clearRect(0, 0, SZ, SZ);
        const dark = palette.dark;
        const ang = knotAngle();
        const live = isRopePhase();
        const bg = g.createRadialGradient(c, c, r * 0.4, c, c, r * 1.3);
        bg.addColorStop(0, dark ? 'rgba(10,8,24,0.5)' : 'rgba(255,244,228,0.5)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = bg; g.beginPath(); g.arc(c, c, r * 1.3, 0, TAU); g.fill();
        if (live && !game.assist) {
          const tol = tolRad();
          g.fillStyle = dark ? 'rgba(143,227,176,0.14)' : 'rgba(31,138,76,0.14)';
          g.beginPath(); g.moveTo(c, c); g.arc(c, c, r + 20, ang - tol, ang + tol); g.closePath(); g.fill();
        }
        g.lineCap = 'round';
        g.strokeStyle = palette.ropeDark; g.lineWidth = 10; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke();
        g.strokeStyle = palette.rope; g.lineWidth = 7; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke();
        g.setLineDash([5, 7]); g.lineDashOffset = -((ang * r) % 12); g.strokeStyle = dark ? 'rgba(255,240,210,0.42)' : 'rgba(255,236,200,0.6)'; g.lineWidth = 2.2;
        g.beginPath(); g.arc(c, c, r - 0.5, 0, TAU); g.stroke(); g.setLineDash([]);
        for (let k = 0; k < 4; k++) {
          const a = -Math.PI / 2 + k * Math.PI / 2, px = c + Math.cos(a) * r, py = c + Math.sin(a) * r, f = posts[k];
          const pr = (k === 0 ? 7.5 : 5.5) + f * 4;
          if (f > 0.02) { const gl = g.createRadialGradient(px, py, 0, px, py, pr * 3.2); gl.addColorStop(0, `rgba(255,214,120,${0.65 * f})`); gl.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gl; g.fillRect(px - pr * 3.2, py - pr * 3.2, pr * 6.4, pr * 6.4); }
          g.fillStyle = palette.woodDark; g.beginPath(); g.arc(px, py, pr + 1.6, 0, TAU); g.fill();
          g.fillStyle = k === 0 ? '#ffd27a' : palette.wood; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
        }
        if (game.charge > 0.004 && (live || game.phase === 'core')) {
          g.save(); g.strokeStyle = '#ffd27a'; g.lineWidth = 6; g.shadowColor = 'rgba(255,200,90,0.85)'; g.shadowBlur = 10;
          g.beginPath(); g.arc(c, c, r + 15, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, game.charge)); g.stroke(); g.restore();
        }
        const kx = c + Math.cos(ang) * r, ky = c + Math.sin(ang) * r;
        if (game.phase === 'core' && game.coreStage === 'still') {
          g.strokeStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(60,40,20,0.18)'; g.lineWidth = 6; g.beginPath(); g.arc(kx, ky, 26, 0, TAU); g.stroke();
          if (game.hold > 0.002) { g.save(); g.strokeStyle = palette.sync; g.lineWidth = 6; g.shadowColor = palette.sync; g.shadowBlur = 8; g.beginPath(); g.arc(kx, ky, 26, -Math.PI / 2, -Math.PI / 2 + TAU * game.hold); g.stroke(); g.restore(); }
        }
        if (knot.visible) {
          if (live && clock.running && !S.reduced()) {
            for (let i = 1; i <= 9; i++) { const a = ang - i * 0.075; g.fillStyle = `rgba(255,214,120,${0.42 * (1 - i / 10)})`; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 7 - i * 0.5, 0, TAU); g.fill(); }
          }
          const glow = g.createRadialGradient(kx, ky, 0, kx, ky, 26);
          glow.addColorStop(0, 'rgba(255,236,170,0.95)'); glow.addColorStop(0.4, 'rgba(255,190,80,0.45)'); glow.addColorStop(1, 'rgba(255,170,60,0)');
          g.fillStyle = glow; g.fillRect(kx - 26, ky - 26, 52, 52);
          g.fillStyle = '#fff3cf'; g.beginPath(); g.arc(kx, ky, 9, 0, TAU); g.fill();
          g.strokeStyle = palette.ropeDark; g.lineWidth = 2; g.beginPath(); g.arc(kx, ky, 9, 0, TAU); g.stroke();
          g.strokeStyle = palette.rope; g.lineWidth = 2.2; g.beginPath(); g.moveTo(kx - 5, ky - 3); g.quadraticCurveTo(kx, ky + 4, kx + 5, ky - 3); g.stroke();
        }
        if (input.down && input.dist > 0 && (live || game.coreStage === 'still')) {
          const ta = input.angle, ok = game.coreStage === 'still' ? game.holding : (ringState.sync || game.assist);
          const tr = game.coreStage === 'still' ? Math.min(input.dist, r * 1.6) : r;
          const tx = c + Math.cos(ta) * tr, ty = c + Math.sin(ta) * tr;
          g.strokeStyle = ok ? palette.sync : palette.slack; g.lineWidth = 3;
          g.beginPath(); g.arc(tx, ty, 16, 0, TAU); g.stroke();
          if (!ok && live) { g.setLineDash([4, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(tx, ty); g.lineTo(kx, ky); g.stroke(); g.setLineDash([]); }
        }
      }

      function drawConstellations(g, t, skyOff) {
        if (!constellations.length) return;
        const lineCol = palette.dark ? 'rgba(255,236,190,0.6)' : `rgba(255,248,230,${0.5 + 0.35 * Wd.dusk})`;
        constellations.forEach(cs => {
          if (!cs.started) return;
          const k = S.clamp(cs.t / 1.4, 0, 1);
          const pts = cs.pts.map(([x, y]) => [cs.x + x * cs.s, cs.y + y * cs.s + skyOff]);
          const shown = cs.lines.length * k;
          g.strokeStyle = lineCol; g.lineWidth = cs.core ? 1.6 : 1.1;
          g.beginPath();
          cs.lines.forEach(([a, b], i) => {
            if (i > shown) return;
            const f = S.clamp(shown - i, 0, 1);
            g.moveTo(pts[a][0], pts[a][1]); g.lineTo(S.lerp(pts[a][0], pts[b][0], f), S.lerp(pts[a][1], pts[b][1], f));
          });
          g.stroke();
          pts.forEach(([x, y], i) => {
            if (i / pts.length > k + 0.05) return;
            const tw = 0.7 + 0.3 * Math.sin(t * 3 + i);
            const gl = g.createRadialGradient(x, y, 0, x, y, cs.core ? 9 : 7);
            gl.addColorStop(0, `rgba(255,244,214,${0.95 * tw})`); gl.addColorStop(1, 'rgba(255,240,200,0)');
            g.fillStyle = gl; g.fillRect(x - 9, y - 9, 18, 18);
            g.fillStyle = '#fffaf0'; g.fillRect(x - 1, y - 1, 2, 2);
          });
        });
      }

      /* Finale motes: each resting thought lets go of a little light that rises and becomes a constellation. */
      function toScreen(x, y, layer) {
        const z = Wd.cam.z, f = Wd.fire;
        const yy = y + (layer === 'sky' ? Wd.cam.y * 0.35 : Wd.cam.y);
        return { x: (x - f.x) * z + f.x, y: (yy - f.y) * z + f.y };
      }
      function updateMotes(dt) {
        motes.forEach(m => {
          m.t += dt;
          if (m.t < m.delay || m.done) return;
          if (!m.launched) { m.launched = true; if (m.critter) m.critter.moted = true; if (A.ctx) A.whoosh({ vol: 0.05, dur: 0.9, from: 900, to: 4200, pan: (m.cs.x / Wd.w - 0.5) }); }
          const k = S.clamp((m.t - m.delay) / m.dur, 0, 1);
          if (k >= 1) {
            m.done = true; m.cs.started = true;
            const at = performance.now();
            if (A.ctx) { A.chime(A.note(PENTA[m.i % PENTA.length]), { vol: m.core ? 0.13 : 0.09, dur: m.core ? 2.6 : 1.6 }); A.sync('constellation', at); }
            if (m.core && A.ctx) A.pad([A.note('G3'), A.note('D4'), A.note('B4'), A.note('G5')], { dur: 6, vol: 0.16, attack: 1.4 });
          }
        });
      }
      function drawMotes(g) {
        if (!motes.length) return;
        g.globalCompositeOperation = 'lighter';
        motes.forEach(m => {
          if (m.t < m.delay || m.done) return;
          const k = S.clamp((m.t - m.delay) / m.dur, 0, 1);
          const a = toScreen(m.from.x, m.from.y, 'ground');
          const b = toScreen(m.cs.x, m.cs.y, 'sky');
          const e = S.ease.inOutCubic(k);
          const sway = Math.sin(k * Math.PI * 2 + m.i) * 26 * (1 - k) * (S.reduced() ? 0 : 1);
          const x = S.lerp(a.x, b.x, e) + sway, y = S.lerp(a.y, b.y, e) - Math.sin(k * Math.PI) * 30;
          m.trail.push([x, y]); if (m.trail.length > 14) m.trail.shift();
          m.trail.forEach(([tx, ty], i) => { const f = i / m.trail.length; g.fillStyle = `rgba(255,220,150,${0.3 * f})`; g.beginPath(); g.arc(tx, ty, (m.core ? 5 : 3) * f, 0, TAU); g.fill(); });
          const r = m.core ? 9 : 6;
          const gl = g.createRadialGradient(x, y, 0, x, y, r * 3);
          gl.addColorStop(0, 'rgba(255,250,225,1)'); gl.addColorStop(0.35, 'rgba(255,210,130,0.6)'); gl.addColorStop(1, 'rgba(255,190,100,0)');
          g.fillStyle = gl; g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
        });
        g.globalCompositeOperation = 'source-over';
      }

      /* ================= DOM that lives in the world ================= */
      let bannerKey = '', bannerHalf = 60, bannerH = 34, hudBottom = 0;
      function loopieScreen() { const L = Wd.loopie, s = toScreen(L.x, L.y, 'ground'); s.y -= lift.v; return s; }
      function sayBox(s) { // Loopie's speech sits above his head and never leaves the frame
        const bw = Math.min(300, Wd.w - 32);
        return { bottom: s.y - Wd.loopie.size / 2 - 14, left: Math.max(12, Math.min(s.x - 30, Wd.w - bw - 12)), w: bw };
      }
      function placeSay(s) { const b = sayBox(s); sayEl.style.bottom = (Wd.h - b.bottom) + 'px'; sayEl.style.left = b.left + 'px'; }
      function setGauge(b) {
        bpmEl.textContent = String(b);
        const k = S.clamp((b - 50) / 100, 0, 1);
        gaugeArc.setAttribute('stroke-dashoffset', (100 - k * 100).toFixed(1));
        gaugeNeedle.setAttribute('transform', `rotate(${(-90 + k * 180).toFixed(1)} 32 36)`);
      }
      function positionDom(t) {
        const L = Wd.loopie, s = loopieScreen();
        const bob = S.reduced() ? 0 : Math.sin(t * (clock.running ? clock.bpm / 60 * Math.PI : 2)) * 3;
        const tilt = isRopePhase() && !S.reduced() ? Math.sin(t * 2) * 3 : 0;
        loopieWrap.style.transform = `translate(${(s.x - L.size / 2).toFixed(1)}px, ${(s.y - L.size / 2 + bob).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;
        if (!sayEl.hidden) placeSay(s);
        const tgt = game.target && (game.target.state === 'run' || game.target.state === 'target') ? game.target : (game.phase === 'rollcall' ? rollcallCritter : null);
        if (tgt && !banner.hidden) {
          const ds = depthScale(tgt.y) * (tgt.core ? 1.7 : 1);
          const p = toScreen(tgt.x, tgt.y - 30 * ds, 'ground');
          const key = banner.textContent + '|' + banner.className;
          if (bannerKey !== key) { bannerKey = key; bannerHalf = (banner.offsetWidth || 120) / 2; bannerH = banner.offsetHeight || 34; }
          if (!hudBottom && !hud.hidden) hudBottom = hud.offsetTop + hud.offsetHeight;
          const minBottom = (hud.hidden ? 64 : hudBottom + 10) + bannerH; // the player's words never slide under the HUD or the console bar
          const bx = S.clamp(p.x, bannerHalf + 10, Wd.w - bannerHalf - 10);
          let by = Math.max(p.y, minBottom);
          if (!sayEl.hidden) { // never let the player's words sit under Loopie's speech
            const b = sayBox(s), sTop = b.bottom - 84;
            if (by > sTop && by - bannerH < b.bottom && bx + bannerHalf > b.left && bx - bannerHalf < b.left + b.w) by = Math.max(minBottom, sTop - 6);
          }
          banner.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) translate(-50%, -100%)`;
        }
        if (clock.running) { const b = Math.round(clock.bpm); if (bpmEl.textContent !== String(b)) setGauge(b); }
      }

      /* ================= speech ================= */
      let sayTimer = 0;
      function say(text, ms) {
        S.cancel(sayTimer);
        if (!text) { sayEl.hidden = true; return Promise.resolve(); }
        placeSay(loopieScreen());
        const p = UI.say(sayEl, text, { target: sayText, tick: () => { if (A.ctx && S.settings.sound) A.tone({ type: 'sine', freq: 520 + Math.random() * 140, dur: 0.04, vol: 0.025 }); } });
        if (ms !== 0) sayTimer = S.later(() => { sayEl.hidden = true; }, ms || Math.max(2400, text.length * 55));
        return p;
      }

      /* ================= scenes: play, the paddock card, the sky ================= */
      const stage = new S.Stage();
      const sc = { play: { el: null }, paddock: { el: paddockSc }, sky: { el: null } };
      Object.keys(sc).forEach(k => stage.add(k, sc[k]));

      async function startRodeo() {
        herdLocked = true;
        herd = herdFrom(an);
        const inten = S.intensity();
        game.endBpm = [56, 60, 62][inten];
        game.startBpm = 72 + herdSpeed * 6;
        Object.assign(game, { perfect: 0, taps: 0, miss: 0, catches: 0, penned: 0, hold: 0, holding: false, charge: 0, assist: false, assistOffered: false, coreStage: null,
          pressTime: 0, syncTime: 0, slackT: 0, slackSaid: false, start: performance.now(), lastCatchAt: performance.now(), paddock: null });
        const maxCritters = [4, 5, 6][inten];
        const list = herd.critters.slice(0, maxCritters);
        game.total = list.length;
        critters = list.map((c, i) => makeCritter(c, i, list.length, false));
        game.coreCritter = makeCritter(herd.core, list.length, list.length, true);
        game.queue = critters.slice();
        game.target = null;
        renderTally();
        setGauge(game.startBpm);
        hud.hidden = false; hudBottom = 0;
        camTo(0, 1, 1.1);
        game.phase = 'rollcall';
        setBaseFace('dizzy'); face('shocked', 1600);
        if (A.ctx) A.noise({ pink: true, filter: 'lowpass', freq: 260, dur: 2.4, attack: 0.6, vol: 0.28 });
        ctx.track('rodeo_start', { speed: herdSpeed, bpm: game.startBpm, critters: game.total, paddockVisit: paddockDue ? 1 : 0 });
        await S.sleep(critters.length * 700 + 1000);
        if (game.phase !== 'rollcall') return;
        rollcallCritter = null; banner.hidden = true;
        if (paddockDue) face('surprised', 1400);
        await say(paddockDue ? vline(R.LINES.due) : lines('intro'), 3200);
        await S.sleep(600);
        if (game.phase !== 'rollcall') return;
        A.unlock();
        ringZone.hidden = false;
        knot.visible = true; knot.fixed = null; knot.glide = null;
        ringState.text = '';
        setRingText('Get ready', 'Watch the glowing knot');
        game.phase = 'countin';
        const t0 = cnow() + 0.25;
        startClock(game.startBpm, t0);
        const beatLen = 60 / game.startBpm;
        K.guide({ id: 'rope', g: 'circle', target: ringCenterPoint, r: Wd.ring.r, label: 'CIRCLE WITH THE KNOT', delay: 200 });
        ['3', '2', '1', 'Rope!'].forEach((txt, k) => S.later(() => showJudge(txt, 'count'), Math.max(0, (t0 + k * beatLen - cnow()) * 1000)));
        S.later(() => { if (game.phase === 'countin') { game.phase = 'herd'; game.lastCatchAt = performance.now(); nextTarget(); } }, Math.max(0, (t0 + 4 * beatLen - cnow() - beatLen * 0.5) * 1000));
      }
      function announce(c) {
        rollcallCritter = c;
        banner.textContent = c.label; banner.classList.remove('big'); banner.hidden = false;
        if (A.ctx) A.bleat({ pitch: 0.8 + Math.random() * 0.5, vol: 0.14, pan: -0.4 });
      }
      function nextTarget() {
        game.charge = 0;
        const nxt = game.queue.find(c => c.state === 'run' || c.state === 'enter');
        game.target = nxt || null;
        if (game.target) {
          game.target.state = 'run';
          banner.textContent = game.target.label; banner.classList.remove('big'); banner.hidden = false;
        } else {
          banner.hidden = true;
          startCore();
        }
      }

      /* Paddock time: book the big one a visit (worry postponement). */
      function renderAlmanac() {
        almEl.innerHTML = '';
        const loops = Array.from(new Set(critters.filter(c => c.state === 'pen' || c.state === 'rest').map(c => c.loop)));
        loops.slice(0, 7).forEach(l => almEl.append(miniCritter(l, 36, 30)));
        const seen = R.almanac(), met = R.LOOPS.filter(l => seen[l]).length;
        const fresh = (almanacFresh || []).filter(l => R.SPECIES[l]);
        almEl.append(h('span', { class: 'r-almnew', text: fresh.length ? 'New in your Herd Almanac: ' + fresh.map(l => R.SPECIES[l].name).join(', ') : 'Herd Almanac: ' + met + ' of ' + R.LOOPS.length + ' kinds met' }));
      }
      function liftTo(v) { lift.from = lift.v; lift.to = v; lift.t = 0; lift.d = S.reduced() ? 0.01 : 0.55; }
      sc.paddock.enter = () => {
        if (S.destroyed) return;
        game.phase = 'paddock';
        slotsEl.innerHTML = '';
        R.slots().forEach(s => {
          const b = h('button', { type: 'button', class: 'ts-chip r-slot', 'aria-label': 'Paddock time ' + s.label }, h('b', { text: s.time }), h('span', { text: s.day }));
          b.addEventListener('click', () => pickPaddock(s));
          slotsEl.append(b);
        });
        renderAlmanac();
        K.guide({ id: 'paddock', g: 'choose', target: () => Array.from(slotsEl.children), label: 'PICK A TIME', delay: 900 });
        // make room: Loopie hops up so the card never covers his art
        const cardTop = paddockSc.offsetTop + paddockCard.offsetTop, cardL = paddockCard.offsetLeft, cardR = cardL + paddockCard.offsetWidth;
        const L = Wd.loopie, s = toScreen(L.x, L.y, 'ground');
        const bottom = s.y + L.size / 2, left = s.x - L.size / 2, right = s.x + L.size / 2;
        if (right > cardL && left < cardR && bottom > cardTop - 10) {
          liftTo(bottom - (cardTop - 10));
          face('happy', 1200);
          if (A.ctx) A.pop({ freq: 440, vol: 0.1 });
        }
      };
      function pickPaddock(s) {
        if (game.phase !== 'paddock') return;
        K.guide(null);
        game.paddock = s;
        R.paddock.set(s.at, game.coreCritter ? game.coreCritter.loop : 'other');
        ctx.track('paddock_set', { slot: new Date(s.at).getHours() });
        if (A.ctx) { A.wood(undefined, 0.2, 1.2); A.chime(A.note('D5'), { vol: 0.08 }); }
        say(vline(R.LINES.paddock).replace('{time}', s.label), 2800);
        stage.go('sky', {}, { duration: 300 });
        S.later(finale, 400);
      }
      $('.r-noslot').addEventListener('click', () => {
        if (game.phase !== 'paddock') return;
        K.guide(null); game.paddock = null; ctx.track('paddock_skip', {});
        say(vline(R.LINES.nopaddock), 2400);
        stage.go('sky', {}, { duration: 300 }); S.later(finale, 400);
      });

      /* ================= finale: the herd's motes rise into the dusk and become constellations ================= */
      const SHAPE = {
        pts: [[-20, 6], [-15, -6], [-2, -12], [12, -9], [22, -14], [31, -6], [25, 4], [14, 8], [-12, 10], [-13, 20], [13, 9], [14, 20]],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [8, 9], [7, 10], [10, 11]]
      };
      function finale() {
        if (game.phase === 'finale' || game.phase === 'end') return;
        game.phase = 'finale';
        hud.hidden = true; ringZone.hidden = true; banner.hidden = true;
        K.guide(null);
        const all = critters.filter(c => c.state === 'pen' || c.state === 'rest');
        const up = Wd.h * 0.72, finalSkyOff = up * 0.35;
        const bandTop = 104, bandBottom = Math.max(bandTop + 160, Wd.h * 0.40);
        const smalls = all.filter(c => !c.core), cols = 3;
        const rows = Math.max(1, Math.ceil(smalls.length / cols));
        const coreS = Wd.portrait ? 1.9 : 2.6, smallS = Wd.portrait ? 1.25 : 1.7;
        const rowH = Math.min(84, (bandBottom - bandTop - 60 * (coreS / 1.9)) / rows);
        const spread = Wd.portrait ? Wd.w * 0.8 : Math.min(Wd.w * 0.6, 760);
        constellations = smalls.map((c, i) => {
          const col = i % cols, row = Math.floor(i / cols), inRow = Math.min(cols, smalls.length - row * cols);
          const x = Wd.w / 2 + (col - (inRow - 1) / 2) * (spread / cols) + (row % 2 ? 10 : -10);
          return { x, y: bandTop + row * rowH + 10 - finalSkyOff, s: smallS, pts: SHAPE.pts, lines: SHAPE.lines, t: 0, started: false, core: false };
        });
        const core = all.find(c => c.core);
        if (core) constellations.push({ x: Wd.w / 2 - 6, y: bandTop + rows * rowH + 34 * (coreS / 1.9) - finalSkyOff, s: coreS, pts: SHAPE.pts, lines: SHAPE.lines, t: 0, started: false, core: true });
        const order = smalls.concat(core ? [core] : []);
        const gap = S.reduced() ? 0.2 : 0.5;
        motes = order.map((c, i) => ({ i, critter: c, core: !!c.core, from: { x: c.x, y: c.y - 14 * (c.core ? 1.6 : 1) }, cs: constellations[i], delay: 0.6 + i * gap + (c.core ? 0.5 : 0), dur: S.reduced() ? 0.6 : 2.1, t: 0, done: false, launched: false, trail: [] }));
        camTo(up, 1, 2.8);
        if (!palette.dark) duskTo(0.85, 2.6);
        if (amb) amb.level(0.6, 1.5);
        const total = 0.6 + order.length * gap + 0.5 + (S.reduced() ? 0.6 : 2.1) + 1.6;
        S.later(finishGame, total * 1000);
      }

      let finished = false;
      function finishGame() {
        if (finished) return;
        finished = true;
        game.phase = 'end';
        const smalls = critters.filter(c => c.state === 'pen' && !c.core).length;
        const syncPct = game.pressTime > 0.5 ? Math.round(100 * game.syncTime / game.pressTime) : (game.taps ? 100 : 0);
        const b0 = game.startBpm, b1 = game.finalBpm || Math.round(game.endBpm);
        const secs = Math.round((performance.now() - game.start) / 1000);
        ctx.track('rodeo', { speed: herdSpeed, bpmStart: b0, bpmEnd: b1, perfect: game.perfect, taps: game.taps, miss: game.miss, sync: syncPct, critters: smalls + 1, assist: game.assist ? 1 : 0, paddock: game.paddock ? 1 : 0, seconds: secs });
        K.guide(null);
        ctx.finish({
          title: 'The herd is resting', mood: 'peace',
          lines: [
            'Herd BPM ' + b0 + ' → ' + b1,
            smalls + (smalls === 1 ? ' thought' : ' thoughts') + ' rounded up, 1 resting by the fire',
            game.paddock ? 'Paddock time: ' + game.paddock.label : (game.assist ? 'Rode along, no timing needed' : 'In sync ' + syncPct + '%')
          ],
          share: 'My herd went from ' + b0 + ' to ' + b1 + ' BPM'
        });
      }

      /* ================= pause, theme, resize, loop, start ================= */
      S.on('visibility', (vis) => {
        if (!vis) { if (clock.running) clock.paused = true; }
        else if (clock.running && clock.paused) { clock.paused = false; clock.next = cnow() + 0.4; clock.beats = []; lastBeatSeen = null; }
      });
      S.on('theme', () => { readPalette(); buildCaches(); spriteCache.clear(); vignette = null; if (game.phase === 'paddock') renderAlmanac(); });
      cv.onResize(() => layout());
      if (!laidOut) layout();
      stage.go('play', {}, { duration: 0 });
      S.loop((dt, t) => { if (!laidOut) return; scheduleBeats(); update(dt, t); draw(t); drawRing(); positionDom(t); });

      (async () => {
        await K.intro({ title: 'Loop Rodeo', sub: 'Your thoughts are stampeding. Grab the rope and round them up.', how: 'Circle your thumb with the glowing knot.', char: 'loopie', mood: 'dizzy' });
        startRodeo();
      })();

      return {
        /* Plays the whole game through the real ring button: rides the knot round for every catch, holds still on it for the
           big one, books the first paddock slot, and resolves once the console has the result. */
        async autoplay() {
          const until = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (S.destroyed || performance.now() - t0 > (ms || 60000)) return false; await K.wait(40); } return true; };
          const onRing = (a, rr) => ({ x: Wd.ring.size / 2 + Math.cos(a) * (rr == null ? Wd.ring.r : rr), y: Wd.ring.size / 2 + Math.sin(a) * (rr == null ? Wd.ring.r : rr) });
          const intro = el.querySelector('.gk-intro');
          if (intro) await K.sim.tap(intro);
          await until(() => game.phase === 'herd', 40000);
          const roping = () => game.phase === 'herd' || (game.phase === 'core' && (game.coreStage === 'arrive' || game.coreStage === 'rope'));
          while (roping() && !S.destroyed) {
            const tgt = game.target;
            if (!isRopePhase() || !tgt || tgt.state !== 'run' || lasso.throwT >= 0) { await K.wait(40); continue; }
            const caught = game.catches, phase = game.phase;
            let p = onRing(knotAngle());
            const ptr = await K.sim.press(ringBtn, p.x, p.y);
            while (isRopePhase() && game.catches === caught && game.phase === phase && !S.destroyed) {
              await K.wait(30);
              p = onRing(knotAngle()); ptr.move(p.x, p.y);
            }
            ptr.up(p.x, p.y);
            await K.wait(160);
          }
          await until(() => game.phase === 'core' && game.coreStage === 'still' && !knot.glide, 30000);
          await K.wait(500);
          const kp = onRing(knotAngle());
          const hold = await K.sim.press(ringBtn, kp.x, kp.y);
          await until(() => game.coreStage === 'done' || game.phase !== 'core', 30000);
          hold.up(kp.x, kp.y);
          await until(() => game.phase === 'paddock' && slotsEl.children.length > 0, 30000);
          await K.wait(1400);
          if (slotsEl.firstElementChild) await K.sim.tap(slotsEl.firstElementChild);
          await until(() => finished, 60000);
        },
        state: () => ({ phase: game.phase, core: game.coreStage, penned: game.penned, total: game.total, bpm: Math.round(clock.bpm), base: clock.base, charge: +game.charge.toFixed(2), hold: +game.hold.toFixed(2) })
      };
    }
  });
})(window.TSG_ENV);
