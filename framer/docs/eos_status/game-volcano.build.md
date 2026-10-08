# game-volcano — FINISHED

## What I built
`src/eos/22_eos_game_volcano.jsx` — **112 COOL THE VOLCANO**, the anger hero (spec §8.0, §8.2, §0.4 pacer, §6.5). One file, no imports/exports, all names `EosVolcano* / EOS_VOLCANO* / eosVolcano*`, registered at module top level with `eosRegisterGame(EOS_GAME_112, EosVolcanoEngine, {hint:"Tap to erupt, then cool it slowly", mindBend, css: EOS_VOLCANO_CSS, gesture:"taps", char:"rush", seconds:30})`, engine `"E04"` (explicit progress).

- **Act A ERUPT (0 → 30):** exactly 6 taps on the crater (the whole arena is a forgiving tap pad; pointerdown answers instantly; Space/Enter on the crater button). Each tap launches word-rocks (pre-mounted pool of 12, restarted by `data-fly` a/b — no mount churn) that arc up (separate X/Y keyframes = real arc), hang readable, squash and shatter (pseudo-element shards) + `PremiumBurst tone="gold"` at the crater (≤ 4 Hz) + `sfx("clack")` + `eosHaptic("hit")` + boom tone + crater glow pulse + RUSH squash + combo floater "BOOM ×k!" + 6 ember pips. Juice scales with `EOS_STORE.before` (else `intensityGuess`, else 2): ≤6 → 1 rock, 7-8 → 2 bigger + deeper boom, 9-10 → 3 biggest + pitch climbing per tap; length never changes. Shake 6 px / 180 ms only on alternate taps < 300 ms apart (never reduced/calm). Lava rivers flow down further with each tap. Rocks carry `eosWords` (filler chunks such as "I am" skipped when ≥ 3 real chunks remain) inside `<EosWord>`; upload thumbnails ride on the rocks only when `hasUserImages`.
- **Bridge (1.3 s, no marker):** "Now watch it cool…".
- **Act B COOL (30 → 95):** a cute rain cloud. Drag anywhere (whole arena = drag pad, pointer capture) moves it ↔; press-and-hold rains at the slow rate by itself; ArrowLeft/Right glide it at 170 px/s, Space/Enter rains. Owns the shared pacer: `eosBreathOwn("in", 4000)` / `("out", 6000)` — cloud swells on in (cue "in…"), pours on out (cue "out…", rain sound via `rainSfx`), eyes close on out. Pointer speed = EMA of CSS px/s ÷ `eosStageScale`; > 350 → mist + "slower… 🐢" at half rate (never zero). Rates: slow 6 %/s, slow drag during "out" ×2, mist 3 %/s, idle = deadline floor (heat reaches 0 by 41 s after mount → finish ≤ ~44 s). Heat 100 → 0 drives `--h`: lava red/orange → grey obsidian, sky anger-red → teal (time-of-day calm palette), steam puffs where the rain lands, scored `sfx("chime")` + haptic + tone ladder at each 20 % removed (5), RUSH face 29 → simmer (52/58) → soft (34/20/70) → 44.
- **Act C BLOOM (96 → 100, 2 s auto):** green meadow grows over the cone, the cooled seams glow as gold fairy lights, 8 flowers spring up (squash), "Cooled to zero", RUSH E44 belly-laugh bounce, `sfx("win")` + `eosHaptic("finish")` + chord + big gold burst; `onProgress(100)` at 2 s, `onDone(bonus)` once 450 ms later (bonus 260-360 = share of heat cooled the slow way).
- Labels (LIVE GUIDE, ≤ 18 chars, imperative): TAP THE CRATER · COOL IT SLOWLY · WATCH IT BLOOM · ENJOY THE CALM.
- Replay variety: `variationSeed % 3` → hot-sky palette, cone shoulder + river layout, RUSH side; `eosDayPart()` → calm sky (dawn/day/dusk/night with stars).
- Reduced motion / calm visuals (`eosCalm`): no shake, rocks fade in place (no travel), rain is an opacity pulse, cloud breath = brightness, no embers/laugh bounce, flowers fade.
- a11y: crater + cloud are `<button>`s with action-stating aria-labels, focus moves crater → cloud for keyboard users, `aria-live="polite"` phase cue (sr-only). `EOS_PRIVATE_ATTRS` on the root.

## Exports (top-level names)
`EOS_GAME_112`, `EosVolcanoEngine`, `EOS_VOLCANO_CSS` (+ internal `EOS_VOLCANO`, `EOS_VOLCANO_HOT`, `EOS_VOLCANO_COOL`, `EOS_VOLCANO_FLOWERS`, `EOS_VOLCANO_FILLER`, `EOS_VOLCANO_P`, `EOS_VOLCANO_DEV`, `eosVolcanoSurf/Half/Paths/Layout/Now/Words/RocksPerTap/Intensity`). Dev/test API (dev builds only): `eosApi("volcano").state()` → `{mounted, act, taps, rocks, rocksPerTap, shakes, heat, mode, phase, speed, chimes, nonSoft, sfx[], slowerShown, holding, cloudX, owned, done, msAtA, msAtC, rates}` (keeps the last instance after unmount), `eosApi("volcano").rocksPerTap(before)`. Root test hooks: `data-act`, `data-rain`, `data-breath`, `data-eos-volc-taps`, `data-eos-volc-heat`.

## Integrator must wire
Nothing new in `00_arcade.jsx` / `99_pixar.jsx` beyond the existing plan: I1-E11 (`EosEngineFor` in `RoutedGameContent`) makes 112 playable; `EosGlobalStyle` renders its CSS (key `game-112`). 112 is already in core `EOS_SLOW_IDS`.
- Router (§7): 112 is the anger hero and the cool-down after discharge games — it is registered at runtime, so `EosRouteGame` can return it.
- Companion (§6.5): hides itself when `EOS_GAME_META[112].char === "rush"` equals the companion char (anger). If the lead wants it hidden in 112 for every emotion (spec §8.2 "the companion is hidden in this game"), add `|| Number(game?.id) === 112` to that check in the companion module.
- Arrows (§3): crater marker `{g:"taps", n:<taps left>, label:"ERUPT IT! ×<left>"}` (n counts down 6→1); cloud marker `{g:"slow", dir:"lr", d:160, maxSpeed:350, label:"RAIN… SLOWLY ↔"}`; no marker in the bridge and the bloom.

## Acceptance results (scratch integrated build `dev/eos_integrate.py --modules 22_eos_game_volcano.jsx`, zero page errors everywhere)
1. Registered: gesture `taps`, char `rush`, seconds 30; GAMES fields complete (no `[eos]` warnings).
2. Act A: exactly 6 taps → progress 5,10,…,30; msAtA 4.4-5.2 s from mount (synthetic taps; real headless clicks are frame-bound). Rocks per tap with before 5 / 8 / 10 = **1 / 2 / 3**, taps always 6.
3. Shake: 6 taps 150 ms apart → 3 shakes (taps 2, 4, 6); 400 ms apart → 0; reduced → 0.
4. Act B marker `g=slow dir=lr data-eos-max-speed=350`; fast drag (1200 px/s) → mode `mist`, cue `slower… 🐢`, ~2.8 %/s vs 6 %/s; press-and-hold alone cools (mode `rain`); ArrowLeft glides the cloud, Space → `rain`; `eosBreathPhase().owned === true` in act B, false after.
5. `finishGame`: 37.4 s (390×844), 36.4 s / 38.1 s (1280×860), keyboard-only 26.3 s (390); arrowMisses 0.
6. Progress strictly increasing (preview contract: thirdArg/backwards/flat/outOfRange/afterDone/afterUnmount all 0; labels ≤ 18); onDone once; non-soft sfx = **12 = 6 clack + 5 chime + 1 win**.
7. flashCheck 0 flashes/s (reliable, 8.5 fps at 390); crater, cloud (+ its cue) and RUSH clear of the LIVE GUIDE and HUD at both sizes; no text < 14 px in the game (cue 16 px phone / 18 px desktop, words via `--eos-fs-word`); `lintCopy` clean; reduced: X/Y rock animations `none`, body fade only, no shake, no laugh bounce.

Pixar checklist: 3 depth layers (sky + stars + far ridge / volcano, lava, rocks, cloud / RUSH) ✓ · key (lava-warm) + rim (teal) light on RUSH ✓ · squash & stretch on every touch (RUSH, crater glow, rock hang, cloud) ✓ · RUSH face 29 → 52/58 → 34/20/70 → 44 ✓ · ≤ 1 instruction line ✓ · Baloo 2 only ✓ · no flat rectangles ✓ · colour script red → teal ✓ · every touch answered in the pointerdown handler (sound + haptic + visual) ✓ · no flashes ✓ · safe area ✓.

## Screenshots (local, gitignored) — `framer/dev/shots/eos/`
`game-volcano_d_1start.png`, `_d_a_erupt.png`, `_d_b_rain.png`, `_d_4cloud.png`, `_d_c_garden.png`, `_d_4reveal.png`, `_p_1start.png`, `_p_a_erupt.png`, `_p_3cool.png`, `_p_b_rain.png`, `_p_c_garden.png`, `_p_4reveal.png` (+ mid/bridge/mist variants).

## Known limitations
- The wrapper's step-reward pill ("COOLED ✓ +18 ×6") pops at the last pointer position, so in act A it briefly covers the crater (it does not block taps; arrowMisses 0). That is `GameEngine` behaviour, not the engine's.
- Headless-only: CSS animations started at the bloom stay pending until the next forced frame, so read act C computed styles after a screenshot (real browsers are unaffected).
- With 9-10 intensity and very fast taps, up to 12 rocks (+ pseudo shards) animate at once for ~1.5 s — just above the ≤ 60 animated-node guideline at that peak only.
- The idle floor counts from mount, so a very slow act A shortens act B (by design: finish ≤ 45 s).
