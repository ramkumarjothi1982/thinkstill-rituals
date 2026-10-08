BUILD game-lanterns: FINISHED. 114 SKY LANTERNS (the sad / lonely hero). File: /home/user/thinkstill-rituals/framer/src/eos/24_eos_game_lanterns.jsx

WHAT I BUILT
- The scene has 3 depth layers.
  - Back: a dusk sky that warms as you play, a starfield, twinkles, a crescent moon, and the user's own past lanterns (rows in eos_sessions_v1 for game 114, drawn up to 120). When there is at least one, a label reads "N lanterns lit here"; with none there is no label and no dots, so no fake strangers.
  - Middle: two hill ridges with a cool moon rim on the crest, a horizon glow, fireflies, and DROP on the crest. DROP has a warm key light from the lanterns and a cool rim light from the moon.
  - Front: three paper lanterns with ribs, cap, base and flame. Each carries one of the user's words on a hanging paper tag (EosWord only) and casts a pool of light on the grass.
- Mechanic
  - Hold a lantern (or anywhere in the sky; it picks the next lantern) for 1.2 s. The glow fills up from the bottom of the paper as you hold, with a warm hum, a paper rustle and a slowing heartbeat from eosHeartbeat (60 → 57 bpm on lantern 1 down to 52 bpm by lantern 3). Its visual twin is a pulse ring on DROP's chest plus a throb of the held lantern's halo, driven by data-beat="a|b" on the root.
  - Once lit, the lantern tugs upward. Drag it up 90 px (a flick, measured as CSS px ÷ eosStageScale), or simply let go, and it rises. It sways up for 2.2 s, shrinks, its word softens away, and it becomes a star.
  - Keyboard: Space/Enter holds the focused lantern (or the next one when focus is on the page), ↑ or releasing the key lets it rise, and focus moves to the next lantern.
  - No fail state. An early lift keeps the warmth, which cools slowly. After 2 early lifts, or 9 s with nothing lit, the hold drops to 0.7 s and the line "Hold gently — it lights faster now" appears. A lantern that stays lit and held for 6 s rises by itself, with a tone but no scored sfx.
- One line at a time (aria-live): "Hold a lantern to warm it" → "Warming up… keep holding" → "It's glowing — let it rise ↑". Under each rising lantern a true line follows:
  - "Missing someone means you loved something."
  - "Lots of people are looking up at the same sky tonight." ("today" at dawn and during the day)
  - "Everyone carries something heavy sometimes."
- Finale, a sequence designed for this game:
  - The three stars land on the lobes and the tip of a heart. The sky goes fully warm, every past lantern glows, and a dotted heart appears.
  - A golden 4th lantern descends into DROP's arms and asks "Send a little warmth?".
  - Two equal cards: Text someone "thinking of you" (navigator.share({text:"Thinking of you 💛"}); if share is missing or fails for any reason other than AbortError, it copies to the clipboard, falling back to execCommand, and shows the toast "Copied — paste it to someone", or `Send them: "…"` if copying is impossible), and Keep it for me. Both finish the game.
  - After the choice, the golden lantern rises into the heart's cleft, the constellation draws itself, sparkles fall, DROP hugs a heart (E08) with a heart pop, and the line reads "Sent with love. 💛" or "Kept close. This glow is yours."
- Safety mode (any strong flag in EOS_STORE.safety): the lanterns show EOS_NEUTRAL_WORDS (through core eosWords, reactive to the store), the question becomes "Reach out to someone?", and the card reads "Text someone you trust" with the message "Hey, can you talk? I'm having a hard time." shown on it and sent by share or clipboard. The rising lines switch to "You don't have to carry this alone." / the same-sky line / "Reaching out is a brave, strong thing."
- DROP's faces (picked from the local bubble-expressions): E80 (sad) or E70 (lonely) → E57 hopeful hands while you warm a lantern → E59 looking up while one rises → E28 / E31 soft smiles → E09 wink with a heart at the ask → E08 hugging a heart. Every change plays a squash pop. DROP also leans toward the lantern being held.
- Progress
  - onProgress(0, "HOLD TO LIGHT IT") on mount. Each lantern adds +3 when pressed, +10 when lit, +18 when it rises and +25 when it is a star, then 82 "YOUR CHOICE", 90 "WARMTH SENT" or "KEPT CLOSE", and 100.
  - It is strictly increasing and never passes a 3rd argument.
  - onDone(bonus 270-350) fires once, 450 ms after 100. The bonus is the same for both choices: no dark pattern.
- Juice
  - Every touch answers in the same handler with sfx("soft") + eosTone + eosHaptic("touch") + a squash set as a DOM attribute.
  - Scored sounds are exactly sfx("chime") per lantern released by the player, plus a gold PremiumBurst and eosHaptic("hit"), then sfx("win") + eosHaptic("finish") + a big burst at the choice.
  - No non-soft sfx is ever called from a timer.
- Replay variety: 3 seeded dusks (variationSeed % 3) change the palettes, ridges, moon side and lantern tilts. Local time adds a tint for dawn, day, dusk or night. The warm horizon uses the sad or lonely calm grade.
- Layout is measured (eosLanLayout + ResizeObserver before paint) and everything sits in the safe box:
  - Below 820 px: DROP on the crest above the lanterns.
  - 820 px and up: DROP on the hill beside the lanterns, which leaves room for a bigger heart.
  - Tags take at most 2 lines.
  - The finale cards are equal: 158×130 at 390 and 248×140 at 1280.
- Performance: one rAF loop runs only while something warms, cools or rises, and writes style and CSS variables only. The transform lives on the inner .eosLanFly span, because the arcade skins button:hover with a transform. There are no blur or backdrop filters, sky contain:strict, about 57 or fewer animated nodes, pre-mounted pools (stars, rain, golden lantern), and the root sets filter:none.
- Reduced motion or calm visuals: lanterns fade upward with no sway (a 46 px drift and a cross-fade into the star). There is no hover, tug, flame flicker, motes, twinkle, lean or DROP pop, and the heartbeat twin is opacity only.

EXPORTS (top level, no import/export lines): EOS_GAME_114 (all 15 GAMES fields), EosSkyLanternsEngine, EOS_LANTERNS_CSS.
- Registered with eosRegisterGame(EOS_GAME_114, EosSkyLanternsEngine, {hint:"Hold a lantern to light it, then flick it up", mindBend, css, gesture:"hold", char:"drop", seconds:25}), which gives EOS_GAME_META[114] = {gesture:"hold", char:"drop", seconds:25}.
- Dev/test handle eosExpose("lanterns", {state(), EOS_GAME_114, layout}): window.__eos.lanterns.state() returns {stage, lanterns[{st, heat, slot}], held, risen, stars, prog, plog, sfx, beats, early, easy, choice, toast, face, faces, past, done}. It never contains words.
- Every other top-level name is EOS_LAN_* / EosLan* / eosLan*. Keyframes are eosLan*. The CSS key is game-114.

INTEGRATOR: NOTHING NEW TO WIRE
- The game runs through the existing I1-E11 route (EosEngineFor in RoutedGameContent) and works in dev/eos_integrate.py scratch builds.
- Optional hooks it calls when present: eosApi("dots").pulse?.("in") when a lantern is pressed and pulse?.("out") when it is released. It does not own the breath pacer: there is no breath rhythm, only the heartbeat.
- Marker contract for the arrows module:
  - unlit lantern (the next one, or the one being held): {g:"hold", ms:1200 (700 when easy), label:"HOLD TO LIGHT IT"}
  - lit and held: {g:"drag", dir:"u", d:140, label:"LET IT RISE ↑"}
  - no marker for 0.55 s after a launch, or during gather and fly
  - ask stage: both .eosLanOpt carry {g:"choose", label:"YOUR CHOICE"}
- Router: send sad and lonely to 114. GOOD must never be routed here (its copy is about loss).
- Do not add .eosLanLantern to PX_SQUASH_TARGETS. The engine already squashes on every touch.
- Note for readability/arcade: the wrapper's .tsExactUserText rule sets max-width:88% on user words, which squeezed shrink-to-fit tags into 1-letter lines ("lef / t"). This game overrides it locally with max-width:none!important on .eosLanTag .eosWord. Other shrink-to-fit word containers may hit the same issue.

ACCEPTANCE (scratch integrated build: python3 dev/eos_integrate.py --dev-dir /tmp/eos_game-lanterns_int --modules 24_eos_game_lanterns.jsx; scripts /tmp/lan/t4.mjs (acceptance), t5 (finishGame timing), t6 (safe area, copy lint, flash, shots), t7 (tags))
(1) Meets the criterion. META = {gesture:"hold", char:"drop", seconds:25}, there are no [eos] warnings, and the game starts from the menu as SKY LANTERNS.
(2) Meets the criterion. The markers go hold (ms 1200, "HOLD TO LIGHT IT") → drag u 140 "LET IT RISE ↑" once lit → choose on BOTH options "YOUR CHOICE". finishGame logged the stages m:hold and m:choose with 0 arrow misses and 0 label mismatches at both sizes.
(3) Meets the criterion. With no 114 rows (one row for game 2 only) there is no .eosLanCount and there are 0 dots. With 3, 5, 23 and 41 rows the label reads "3 / 5 / 23 / 41 lanterns lit here" with the same number of dots.
(4) Meets the criterion. The two cards have identical sizes (158×130 at 390, 248×140 at 1280) and both finish (done true, plog …82,90,100). With navigator.share stubbed to reject, the toast reads "Copied — paste it to someone". With navigator.share undefined, the toast is the same. With share stubbed to resolve, KEEP never calls share.
(5) Meets the criterion. With EOS_STORE.safety = "selfharm" the question reads "Reach out to someone?", the card reads "Text someone you trust / "Hey, can you talk? I'm having a hard time."", and the tags read "this feeling", "a heavy moment", "right now" (all EOS_NEUTRAL_WORDS).
(6) Meets the criterion.
  - finishGame (lite:true, load average 8-10 on 4 cores) took 27.5 s at 390×844 (pointer), 39.2 s at 1280×860 (pointer) and 30.1 s at 1280 (keyboard, alt:"keyboard"). The keyboard run at 390 took 18.3 s.
  - Earlier runs at load average 12-14 took 35 s at 390 and 46 s at 1280. The time is headless overhead (each pointer event waits for a 3 fps frame); the nominal game takes about 13-20 s.
  - Wrapper aria-valuenow is monotonic at both sizes, and the engine plog is 0,3,10,18,25,28,35,43,50,53,60,68,75,82,90,100. onDone fired once.
  - sfx = soft, chime, soft, chime, soft, chime, win.
  - Heartbeat twin present: beats 2-3 per hold, root data-beat toggles a/b, and .eosLanBeat is in the DOM.
  - Reduced motion: the rise transform is translate3d(0, −5…−46 px) rotate(0) scale(1), so there is no sway.
  - The tags, lanterns, cue and finale cards do not intersect .globalPlayGuide or .engineProgressHud at 390 or at 1280 (cards bottom 556 vs guide top 559 at 390, and 574 vs 575 at 1280). Nothing is off-screen.
  - smallText(14) in .eosG114 found nothing. lintCopy found no violations.
  - flashCheck at 390: 0 flashes per second in reduced mode (reliable, 11.1 fps) and at most 1 per second in normal mode (reliable=false at 5-6 fps because of machine load).
  - Zero page errors in every run.
Pixar checklist, all met: 3 depth layers (sky with past lanterns, hills with DROP, lanterns with tags and the golden lantern) · key light (warm, from the lanterns) and rim light (cool, from the moon) on DROP · squash on every touch (lantern paper data-sq, DROP pop on every face change, card :active) · the face changes 5-9 times and ends on E08 hugging a heart · ≤ 1 instruction line · Baloo 2 via var(--eos-font) · no flat rectangles as primary objects · colour script from a cool slate or indigo dusk to warm peach or amber · every touch answered synchronously with visual + sound + haptic · no flashes · safe area respected.

SCREENSHOTS (/home/user/thinkstill-rituals/framer/dev/shots/eos/, a git-ignored folder)
- Phone, the journey: game-lanterns_{start,warm,lit,rise,mid,ask,fly,finish}_390.png
- Desktop: game-lanterns_{start,mid,ask,fly,finish}_1280.png (the earlier layout, kept for comparison) and game-lanterns_{start,mid,ask,finish}_normal_1280.png (final)
- Phone, final: game-lanterns_{start,mid,ask,finish}_normal_390.png
- Phone, safety copy: game-lanterns_{start,mid,ask,finish}_safety_390.png
- Phone, reduced motion: game-lanterns_{start,mid,ask,finish}_reduced_390.png

KNOWN LIMITATIONS
- Headless timing depends on load (see (6)). Every timer is wall-clock and the hold accumulates real time, not frames, so real devices play at the nominal pace.
- Tag words come from core eosWords chunking. Chunks made only of little words ("and the") are dropped and padded with the feeling's seeds, but a lone chunk such as "left" can remain.
- The wrapper's step-reward card and finish card cover the centre of the scene during rises and the finale (wrapper behaviour), and partly hid the toast in some desktop shots.
- The real navigator.share sheet was not exercised; it was stubbed for resolve and reject, and also tested with share undefined.
- Image-only input (round thumbnails on the lantern paper, captions from the seeds) is implemented but was not exercised at runtime.
- I ran only the isolated and scratch-integrated builds, not the full build.py, to avoid clobbering dev/out.js for parallel tasks.
