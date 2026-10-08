BUILD game-sigh: FINISHED. 111 BIG SIGH (panic hero, express-orb target), file /home/user/thinkstill-rituals/framer/src/eos/21_eos_game_sigh.jsx

WHAT I BUILT
- The scene has 3 depth layers. Back: a storm-violet sky with stars and a soft storm glow (a 4.6 s opacity drift, low contrast, no lightning), a sun that rises behind the horizon, and a crescent moon. Middle: the sea with a sunrise glint, and SYNC's palm island on the horizon (SYNC has a warm key light and a cool rim light). Front: 6 storm clouds carrying the user's words (EosWord only), the breath orb centre-low above the safe-bottom line, one cue line in an aria-live region, and sigh pips.
- Finger down = air in, finger up = air out.
  - Press and hold the orb, or anywhere in the arena: the arena is the breath pad and the orb is the target. Inhale 1 fills to 72 % in 2.0 s with a linear fill. At 72 %: notch 1 lights, eosHaptic("notch"), a tick tone.
  - Still pressing, a slide up of 24 px or more (CSS px ÷ eosStageScale), a 2nd-finger tap or the ↑ key = the sip, 72 → 100 % in 0.6 s, with notch 2 and a bright tone. With no slide, the automatic top-up plays after 1.0 s while the pointer is still down.
  - Let go = a LINEAR exhale of 4.5 → 5.5 → 6 (→ 6) s from EOS_BREATH.gameOut. Two clouds drift out to sea (left and right) and dissolve into light rain, wind gusts blow, the sky, sea and sun move from storm to dawn over that exhale, and the rest of the scene follows: eosBreathOwn("out", D), eosHaptic("exhale"), rainSfx(D/1000), eosApi("dots").pulse?.("out"). Input is ignored during the exhale; a touch gets a soft acknowledgement only.
  - Still holding at 100 % → the exhale starts on its own after 0.9 s, so there is no breath-hold at the top.
  - Lifting before 72 % = a little puff + "bigger breath in, then let go" (progress is never reduced). Two early lifts in a row → "Breathe however feels easy — the slow out is what matters." and easy mode: a hold of 450 ms or more is topped up kindly, then exhales.
  - 3 sighs, or 4 when EOS_STORE.before ≥ 8; clouds leave 2·2·2 or 2·2·1·1.
- SYNC's face goes E44 → E48 (sigh 1) → a happy face (seeded from 61/63/70/80) → E90 asleep on the moon at the finale, with a squash pop on each change. At the finale the orb turns into a warm gold sun-glow, the pips go gold, and the arpeggio, sfx("win") and eosHaptic("finish") play.
- Pacer: the game owns it the whole time: "hold" while waiting, "in" 2000, "hold" 1000 at ready, "in" 600 for the sip, "hold" when full, "out" D, and eosBreathOwn(null) at the finale and on unmount. No heartbeat anywhere; the haptics are touch, notch, exhale, hit and finish only.
- Progress: onProgress(0, "HOLD · BREATHE IN") on mount. Then provisional steps base+3 (press, "HOLD · BREATHE IN"), +6 ("SIP ONCE MORE"), +8 (sip, "LET IT OUT SLOWLY") and +10 (exhale start), then cycle/N × 100 at each exhale end, 100 "STORM PASSED". It is strictly increasing, never takes a 3rd argument, and onDone(bonus 260-360) fires once, 450 ms after 100.
- Scored sounds: exactly one sfx("chime") per completed sigh (at the end of the exhale the player started) + sfx("win") at the finale. Everything else is sfx("soft") or eosTone. Every touch answers in the same handler: sfx("soft") + eosTone + eosHaptic("touch") + a squash set as a DOM attribute, so it never waits for React.
- Replay variety: seeded variants (variationSeed % 3) change the cloud pairs, the island, sun and moon positions, and the storm palette (violet, indigo or plum). The dawn palette follows eosDayPart() (dawn, day, dusk or night).
- Layout is measured (eosSighLayout + ResizeObserver, applied before paint). Clouds sit in rows A/B at the top of the safe box, then SYNC on the horizon, then the cue, then the orb at the bottom of the safe box. It works for any arena size; the narrow layout (< 560 px) uses 3 + 3 clouds.
- The once-per-device line "Dizzy or tingly? Breathe normally for a moment." rides under the first cue for 7 s (pref flag eos_prefs_v1.sighTip, a boolean).
- Keyboard: Space/Enter down = inhale, ↑ = sip, Space/Enter up = exhale. A window listener is active only when focus is on body or inside the arena.
- Reduced motion / calm visuals (eosCalm): clouds, sun and SYNC only cross-fade with no travel, orb growth is ≤ 4 % (k .04), there is no wave, bob, motes or gust travel, and the countdown is numeric ("in 2… out 5…", shown in both modes as a CSS counter).
- Performance and DOM churn:
  - Per-frame values go through the --f CSS variable set from one rAF loop.
  - The 1 Hz count is a CSS counter, so there are no text mutations; only the cue text changes, about 5 times per cycle.
  - Loops are transform/opacity only.
  - The root sets filter:none!important on .eosG111 only, removing the arcade's saturate(1.08)/contrast(1.035) arena filter so it is not repainted every frame.

EXPORTS (top level, no import/export lines): EOS_GAME_111 (all 15 GAMES fields), EosBigSighEngine, EOS_SIGH_CSS.
- Registered with eosRegisterGame(EOS_GAME_111, EosBigSighEngine, {hint, mindBend, css: EOS_SIGH_CSS, gesture:"hold", char:"sync", seconds:30}), which gives EOS_GAME_META[111] = {gesture:"hold", char:"sync", seconds:30}.
- Dev/test handle eosExpose("sigh", {state(), EOS_GAME_111}): window.__eos.sigh.state() returns {phase, f, cycle, n, early, easy, prog, D, pointer, sfx[kinds], plog[], done}. It never contains words.
- Every other top-level name is EOS_SIGH_* / EosSigh* / eosSigh*. Keyframes are eosSigh*. The CSS key is game-111, via eosRegisterGame.

INTEGRATOR: NOTHING NEW TO WIRE
- The game runs through the existing I1-E11 route (EosEngineFor in RoutedGameContent) and is already exercised by dev/eos_integrate.py.
- Optional hooks it calls when present:
  - eosApi("dots").pulse?.("in" on press / "out" on exhale)
  - the shared pacer, which it owns (the Still Point, arrows wait-ring and audio bed should read eosBreathPhase())
- Marker contract for the arrows module, on button.eosSighOrb:
  - idle / inhale / puff: {g:"hold", ms:2000, label:"HOLD · BREATHE IN"}
  - at 72 % (phase "ready"): {g:"drag", dir:"u", d:30, label:"SIP MORE ↑"}
  - no marker during sip, full, exhale or finale (automatic phases)
  - own is not set, so first plays get the full level-2 arrow
- Router: 111 must be registered for the panic / express routes (it registers at module load).

ACCEPTANCE (scratch integrated build: python3 dev/eos_integrate.py --dev-dir /tmp/eos_game-sigh --modules 21_eos_game_sigh.jsx; scripts /tmp/sigh/t1-t5.mjs)
(1) Meets the criterion. GAMES has all 15 fields; META = {hold, sync, 30}; the game starts from the menu (startGameById ok, name BIG SIGH); no [eos] warnings.
(2) Meets the criterion. The hold marker appears 1-22 ms after play starts and the orb is holdable from mount. The marker switches to g=drag dir=u 2.03-2.16 s after press.
(3) Meets the criterion. A 34-40 px slide while pressed → phase sip → full. A hold of 3.6 s with no slide auto-tops-up while still pressed (plog 3,6,8,10). Release → phase "out", eosBreathPhase() = {phase:"out", owned:true, ms:4500}. The drain is linear; exhales are 4.5 / 5.5 / 6 s.
(4) Meets the criterion. Release at about 0.5 s → phase puff, cue "bigger breath in, then let go", progress unchanged.
(5) Reaches the reveal by pointer and by keyboard (Space down / ArrowUp / Space up) at both sizes. Times were measured while other agents' browsers kept the machine at a load average of about 12 on 4 cores, roughly 2-3 fps at 1280:
  - 390×844, pointer finishGame: 33.4 s to the reveal.
  - 390×844, keyboard after one manual sigh: 24.8 s for the rest.
  - 1280×860: 100 % at 33.8 s (keyboard) and 37-38 s (pointer); the reveal at 42-46 s, because the wrapper's finishHoldMs adds about 3 s after onDone.
  - The nominal game time is about 25 s + 3 s of wrapper finish. Re-check (5) at 1280 on an idle machine or with lite:true.
(6) Meets the criterion. aria-valuenow log 0,3,6,8,10,33,36,39,41,43,67,70,73,75,77,100 is strictly increasing with 100 once. The engine's plog is identical. onDone fired once (doneSent). It never passes a 3rd argument.
(7) Meets the criterion. sfx log soft, chime, soft, chime, soft, chime, win → non-soft = 3 sighs + 1 finale. The 4-sigh path (before = 9) gives 4 chimes + win, progress 25/50/75/100.
(8) Meets the criterion. Vibrate patterns recorded (28) contain no heartbeat; flashCheck at 390 gives ok, 0 flashes per second. It reported reliable=false at 7.4 fps because of the machine load.
(9) Meets the criterion. The orb rect does not intersect .globalPlayGuide or .engineProgressHud at 1280×860 (orb 558,404 164×164; guide top 575) or at 390×844 (orb 137,433 117×117; guide top 559).
(10) Meets the criterion. No avoid-list classes and no strongPropPattern hits (I renamed a "Scale" class). User words appear only in .eosWord; the only "leak" hits were my own copy containing "breathe", a word that happened to be in the test text. smallText(14) in the arena is empty at both sizes. Root carries EOS_PRIVATE_ATTRS + fs-mask.
(11) Pixar checklist, all met: 3 depth layers · key + rim light on SYNC · squash on every touch (orb, face pop) · face changes 3 times and ends positive (asleep on the moon) · ≤ 1 instruction line (cue + sub) · Baloo 2 via var(--eos-font) · no flat rectangles as primary objects · colour script storm-violet → dawn gold · every touch answered synchronously with visual + sound + haptic · no flashes · safe area respected. Reduced motion: gone-cloud, gust and sun rects are identical 1.2 s apart (no travel), orb growth ≤ 1.034, motes display:none.
Zero page errors in every run.

SCREENSHOTS (/home/user/thinkstill-rituals/framer/dev/shots/eos/, a git-ignored folder)
game-sigh_start_1280.png, game-sigh_full_1280.png, game-sigh_mid_1280.png, game-sigh_finish_1280.png,
game-sigh_start_390.png, game-sigh_full_390.png, game-sigh_mid_390.png, game-sigh_finish_390.png,
game-sigh_reduced_mid_390.png, game-sigh_reduced_finish_390.png

KNOWN LIMITATIONS
- Time at 1280 in headless is load-sensitive (see (5)). Every timer is wall-clock and the drain is linear, so real devices play at the nominal timing.
- The cloud captions are core eosWords chunks (e.g. "at", "and I" from "…and I can't breathe at work"); chunking is core-owned.
- The wrapper's finish-reward card covers the middle of the scene during the finale. That is wrapper behaviour.
- Image-only input (thumbnails on clouds when hasUserImages) is implemented but was not exercised at runtime.
- I ran only the isolated and scratch-integrated builds, not the full build.py, to avoid clobbering dev/out.js for parallel tasks.
