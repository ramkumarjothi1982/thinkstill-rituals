BUILD game-ground: FINISHED. 113 GROUND CONTROL (the anxiety hero) is built and passes all 8 acceptance checks. File: /home/user/thinkstill-rituals/framer/src/eos/23_eos_game_ground.jsx

WHAT I BUILT
- The scene has 3 depth layers:
  - Back: a violet "anxiety" sky with stars and GLITCH's ringed planet. It changes to a calm sky that follows the local time of day (eosDayPart: dawn, day, dusk or night), and an aurora appears.
  - Middle: a curved hill with a lit rim and rocks, a landing pad with 6 lights, and a fog band. The fog is a backdrop-blur veil (8 px down to 0) plus drifting puffs. GLITCH's static scanlines lie over the world.
  - Front: GLITCH's rocket. It has a hull with a warm key light from the top-left and a cool rim light on the right, a lit glass dome with GLITCH's face inside, fins, a flame, an antenna light, and legs that drop out for landing.
- The worry words hang in the fog to the left and right of the rocket. There are 5 of them: the player's words, padded with the feeling's seed phrases. They appear only inside EosWord, and they become neutral words under a strong safety flag.
- There are 5 beacons on the ground. The front row is nearest the thumb. Each beacon is a big glossy lamp with an emoji icon and a mission of 4 words or fewer.
- The 3 SPOT beacons are tap = "found it":
  - The lamp fills over 1.2 s and the cue says "keep looking…". A tap within 1.5 s of the previous one fills over 2.4 s instead.
  - Each has a "↻ another" swap: a "↻" badge on phones and a "↻ another" pill on desktop. The badge flips toward the centre so it is never clipped.
  - The swap pool has 14 missions that rotate through the senses in turn: see, touch, hear, smell/taste and body contact. Examples: "the CHAIR under you", "the FLOOR under you", "AIR on your skin", "touch a COOL thing". One or two swaps always reach a non-visual, non-auditory mission.
- The 2 BODY beacons are holds of 3 s each:
  - "feet DOWN", plus one seeded release beacon: "drop your SHOULDERS", "soften your JAW" or "loosen your HANDS".
  - Each has a teal glass lamp, a dashed hold track, a live gold hold ring (--f, updated by the rAF loop) and a "HOLD" tag.
  - Letting go pauses the ring (a blue pulse and the cue "paused · hold again to finish"). It never resets.
  - While a beacon is held, the rocket settles slightly lower (--hold).
- Each lit beacon does all of the following:
  - It turns gold with a burst of sparks.
  - It plays a rising pentatonic note (sfx("tskey:clean:"+k), one scored step) with eosHaptic("hit").
  - Its searchlight beam sweeps the fog and burns off one worry word: the word turns gold, embers rise, and it blurs and fades. A glowing icon of what you found takes its place.
  - The rocket steps down one step and nods toward the beacon.
  - GLITCH's face changes: E15 worried → E7 curious (after 2 beacons) → a seeded happy win face (after 4) → E10 confident at touchdown.
- The finale is a first-class state that plays BEFORE 100 %, so it is seen before the wrapper's reveal takes the stage:
  - The 5th beacon triggers "landing": legs drop, the rocket makes its final descent, the static fades and the fog blur melts.
  - Touchdown follows 1.3 s later: a dust puff ring, a squash landing, a soft low thump (eosTone 84 → 44 Hz), sfx("win"), eosHaptic("finish") and an arpeggio.
  - GLITCH hops out of the dome onto the nose, the 5 beacons swing their beams up into a salute fan, and the found icons join into a gold constellation (an SVG polyline draws itself in) and twinkle.
  - The cue reads "Touchdown · you're right here / Your room is real. The what-ifs aren't here yet."
- The arrow marks the beacon being held, or else the next unlit beacon nearest the thumb. The thumb is the last touch (a tap on empty sky re-aims the arrow), or the bottom-centre thumb zone before the first touch.
  - Spot marker: eosTarget({g:"tap", label:"FOUND IT? TAP"}).
  - Body marker: eosTarget({g:"hold", ms:3000, label:"HOLD · FEET DOWN" | "HOLD · SHOULDERS" | "HOLD · SOFT JAW" | "HOLD · LOOSE HANDS"}).
  - There is no marker while only filling beacons remain, or during landing and the finale (automatic phases).
- Progress:
  - It starts with onProgress(0, "FOUND IT? TAP").
  - Each lit beacon adds 18. Partials below 18 come from fills and holds (+4 on a tap, +3 per 0.75 s held).
  - The 5th beacon gives 90 "WATCH IT LAND", touchdown gives 96 "TOUCHDOWN", and 100 comes 1.9 s later.
  - onDone(bonus 260-360) fires once, 450 ms after 100.
  - Values are strictly increasing, there is never a 3rd argument, and labels are 18 characters or fewer.
- Every touch is answered in the same handler: sfx("soft"), an eosTone, eosHaptic("touch"), and a squash set as a DOM attribute. A tap on empty sky gets a sonar ping. Non-soft sfx fire only on lit beacons and the finale, never from a timer or the rAF loop.
- Input:
  - Pointer events, with setPointerCapture plus cancel / lostcapture handling for holds.
  - Keyboard: Enter/Space on a focused beacon taps it, and Space held holds it. With focus on the page, Space/Enter plays the beacon the arrow points at.
  - Assistive-tech clicks: a bare click on a body beacon starts a hold that fills by itself.
  - Kind assist after 26 s: fills take 0.9 s and holds 1.8 s, so even clumsy play finishes in 45 s or less.
- Replay variety (seeded from variationSeed):
  - Kind layout: 3 arrangements of spot and body beacons, each also mirrored.
  - Starting spot missions: 3 sets.
  - Release mission: 3 options.
  - Loud palette: 3 options. Rocket accent: 3 options.
  - The calm palette follows the time of day.
- Layout is measured with eosGroundLayout and a ResizeObserver, applied before paint. It covers the safe box: below --eos-safe-top, above --eos-safe-bottom.
- Reduced motion / calm visuals (eosCalm):
  - The rocket moves in steps (0.01 s transition) and does not bob.
  - There is no fog drift or static-bar travel, and the flame does not flicker.
  - Beams fade in place instead of sweeping, the burn is a fade, there are no ember or dust travel, and GLITCH's hop is a fade.
  - Measured: every loop animation-name is none.
- Root: <div class="arena eosArena eosG113 fs-mask" {...EOS_PRIVATE_ATTRS}>, with filter:none!important on .eosG113 only. No avoid-list class names are used. Button visuals are on child spans (core clean shells).

EXPORTS (top level, no import/export lines): EOS_GAME_113 (all 15 GAMES fields), EosGroundControlEngine, EOS_GROUND_CSS.
- Registered with eosRegisterGame(EOS_GAME_113, EosGroundControlEngine, {hint:"Spot it, tap it — then hold the body beacons", mindBend, css: EOS_GROUND_CSS, gesture:"tap", char:"glitch", seconds:30}). Measured EOS_GAME_META[113] = {gesture:"tap", char:"glitch", seconds:30}.
- Dev/test handle: eosExpose("ground", {state(), pool(), EOS_GAME_113}). window.__eos.ground.state() returns {phase, lit, order, target, assist, beacons[{kind, sense, mission, words, icon, state, f, acc, fillMs}], fills[{i, ms, quick}], swaps, pauses, prog, plog, sfx, done}. It never contains user words.
- Every other top-level name is EOS_GROUND_* / EosGround* / eosGround*. Keyframes are eosGround*. The CSS key is game-113, via eosRegisterGame.

INTEGRATOR: NOTHING NEW TO WIRE
- The game runs through the existing I1-E11 route (EosEngineFor in RoutedGameContent). dev/eos_integrate.py already exercises it.
- Optional hook it calls when present: eosApi("dots").pulse?.("out") on each lit beacon. It does not own the breath pacer, because it is not a breath game.
- Router: 113 is registered at module load, so it is available for anxiety, panic mid, fear high, overthinking act 2 and the gentle list.
- Marker contract for the arrows module: the marker sits on button.eosGroundLampBtn, as described above. That button has pointer-events:none; its lamp (with an 8 px hit halo) and its label take the touches, so the empty corners of a label-wide button never steal taps from a neighbouring beacon. Point at the button rect as usual.

ACCEPTANCE
Scratch integrated build: python3 dev/eos_integrate.py --dev-dir /tmp/eos_game-ground_int --modules 23_eos_game_ground.jsx. Scripts: /tmp/gg/t1, t2, t4, t5.mjs. Isolated build also OK.
(1) Passes. Measured META = {tap, glitch, 30}. startGameById(113) gives "GROUND CONTROL". No [eos] warnings.
(2) Passes.
- There are 5 beacons (3 spot + 2 body), each with a 26 px emoji icon on a 58 px lamp (phone) or 82 px lamp (desktop).
- Every mission is 4 words or fewer (pool maxWords = 4).
- The swap pool has 14 missions over the senses see, touch, hear, smell and contact.
- 4 swaps in a row gave: contact "the FLOOR under you" → smell "TASTE in your mouth" → see "something RED" → contact "AIR on your skin". Swaps play soft sfx only.
(3) Passes. A 1.3 s press then release gave paused with acc ≈ 1.6-2.2 s. Pressing again lit the beacon after the remainder, with the ring --f live. Release never resets.
(4) Passes. The fills log showed {ms:1200, quick:false} and then {ms:2400, quick:true} for a second tap 0.4 s later.
(5) Passes. After 1 beacon: 1 slot data-burn, 1 beam data-on, 1 found icon. After 2 beacons: 2 of each.
(6) Passes.
- The first marker is the front-centre spot ({tap, "FOUND IT? TAP"}).
- After a tap near the back-left beacon, the marker moved to that beacon ({hold, "HOLD · SOFT JAW"}).
- During a hold the marker is {hold, ms 3000, "HOLD · FEET DOWN"}.
(7) Passes. Time to the reveal:
- 390×844 pointer: 29-31 s.
- 390×844 keyboard + reduced motion: 33 s.
- 1280×860 pointer: 25 s.
- 1280×860 keyboard: 21 s.
- The 1280 pointer run was 42 s when a second browser ran in parallel, before the finale was moved before 100 %.
(8) Passes.
- The progress log is strictly increasing, e.g. 0,4,7,18,19,22,25,28,36,40,43,54,55,58,64,72,76,79,90,96,100.
- onDone fired once (doneSent). The preview contract checks at both sizes were all 0: thirdArg, backwards, flat, outOfRange, afterDone, afterUnmount. Also doneCalls 1, longLabels [], doneDelayMs 451-470, nonSoft 6 (5 beacons + win).
- sfx log: soft, tskey:clean:0 … tskey:clean:4, win.
- flashCheck at 390 while a beacon lights: ok:true. It reported reliable:false at 7.6 fps because the machine was loaded.
- Safe-area and overlap check (lamps, labels, swaps, HOLD tags, words, cue): no element is outside the safe box and nothing overlaps, at start and mid-game, at both sizes.
- smallText(14) inside .eosG113 found nothing (labels are 14.6 px on phone, 16 px on desktop). lintCopy found nothing.
- Root carries data-private + fs-mask. No avoid-list classes are used, and no user word appears outside .eosWord.
- Zero page errors and zero warnings in every run.
Pixar checklist, all met:
- 3 depth layers (sky, ground/fog, rocket).
- Key and rim light on the rocket and on GLITCH's hop-out.
- Squash on every touch (lamp squash attribute, face pop, landing squash).
- The face changes 3 times and ends positive (E15 → E7 → happy → E10).
- One instruction line or fewer (cue + sub).
- Baloo 2 everywhere (var(--eos-font)); emoji only for icons.
- No flat rectangles as primary objects.
- Colour script goes from anxiety violet to a calm sky and teal ground.
- Every touch is answered with visual + sound + haptic in the same handler.
- No flashes; safe area respected.
- The game has its own finale: touchdown, hop-out, beam salute and constellation.

SCREENSHOTS (/home/user/thinkstill-rituals/framer/dev/shots/eos/, a git-ignored folder)
- game-ground_start_390.png, game-ground_mid_390.png (paused hold, 2 lit, found icons)
- game-ground_start_1280.png, game-ground_mid_1280.png
- game-ground_ptr_land_390.png, game-ground_ptr_finish_390.png (finale: hop-out, beam salute, constellation)
- game-ground_kbred_mid_390.png, game-ground_kbred_finish_390.png (keyboard + reduced motion)
- game-ground_ptr_land_1280.png, game-ground_kb_land_1280.png

KNOWN LIMITATIONS
- At 1280 the finish shots (game-ground_ptr_finish_1280.png, game-ground_kb_finish_1280.png) were taken after the reveal had already taken the stage: the state poll at about 3 fps lagged. The finale is verified visually at 390 only. At 1280 it is verified by state and progress (96 → 100 after 1.9 s).
- The wrapper's step-reward cards ("STEADIER ✓ +16 · ×5") briefly cover a beacon or the cue after each scored step. That is wrapper behaviour.
- GLITCH's face art is dark navy. The dome is a lit glass bowl so the face reads. The faces are the arcade's own cast.
- Image-only input (thumbnails above the fog words when hasUserImages is true) is implemented but was not exercised at runtime.
- Layout was tested only at 390×844 (arena 360×658, safe box 360×390) and 1280×860 (arena 1238×704). Very short phones (for example 375×667) were not tested: the layout clamps, but the fog band gets tight there.
- Headless timings depend on machine load; every game timer is wall-clock. I ran only the isolated and scratch-integrated builds, not the full build.py, so dev/out.js was not overwritten for parallel tasks.
