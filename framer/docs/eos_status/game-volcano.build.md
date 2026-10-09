# game-volcano — FINISHED (round 1 fixes applied)

## What I built
`src/eos/22_eos_game_volcano.jsx` — **112 COOL THE VOLCANO**, the anger hero (spec §8.0, §8.2, §0.4 pacer, §6.5). One file, no imports/exports, all names `EosVolcano* / EOS_VOLCANO* / eosVolcano*`, registered at module top level with `eosRegisterGame(EOS_GAME_112, EosVolcanoEngine, {hint:"Tap to erupt, then cool it slowly", mindBend, css: EOS_VOLCANO_CSS, gesture:"taps", char:"rush", seconds:30})`, engine `"E04"` (explicit progress).

- **Act A ERUPT (0 → 30):** exactly 6 taps on the crater (the whole arena is a tap pad; pointerdown answers at once; Space/Enter on the crater button). Each tap launches word-rocks into **hang slots**: a grid over the sky band (phone 3 + 2 + 1, desktop 4 + 2 + 2). Every slot is clear of the mountain, the crater, the arrow's chevron and label column above the crater, and the BOOM floater. Each slot holds one rock at a time (pool of 8, slot i = rock i, least recently used first), so rocks that hang together never overlap. When every slot is busy, the extra rocks of that tap are skipped; the tap still gets its boom, burst, glow, shake and sound. The 6th tap always launches one rock. Rock width is capped by the slot (`--rockMax`: 94 px on a 360 px arena, 183 px on desktop). The phone tier is 1.0 and the desktop tier 1.0, 1.1 or 1.2. Each rock flies on one layer: a sampled arc, a hang, then a shatter at a scale of 1.12, plus pseudo-shards on single-rock taps. Juice scales with `EOS_STORE.before`: 1, 2 or 3 rocks, a deeper boom, and pitch that climbs at 9-10; the length never changes. Shake (6 px / 180 ms) happens only on alternate taps < 300 ms apart and never in reduced or calm mode. The next word waits **under** the crater. The crater marker aims at the crater's upper part (`oy -0.25`), so the arrow's chevron and label sit above, the ×N badge sits top-right and the glove sits below-right, all clear of the word. The combo floater ("BOOM ×k!") sits right of the crater and replays per element.
- **Bridge (2.8 s):** the last rocks shatter and fade (`data-clear` at 1.25 s). "Now watch it cool…" then fades in mid-sky at 1.45 s, and the cloud arrives at 2.8 s. Taps during the bridge get a soft answer: a low tone, a haptic and a crater-glow pulse, with no progress and no scored sfx.
- **Act B COOL (30 → 95):** a cute rain cloud. Drag anywhere (pointer capture), press and hold, or use ArrowLeft/Right glide + Space. The game owns the pacer (`eosBreathOwn` in 4 s / out 6 s). The **first breath** shows in large hero type ("Breathe in…" / "…and out") and the cloud chip is hidden. After that, the cue chip on the cloud takes over. **RUSH co-regulates:** it swells on "in", slumps and softens on "out", a steam wisp rises from its head as the heat drops, and a raindrop hits its head when the cloud rains over it. Rates: slow 4.5 %/s, a slow drag during "out" ×2 (≈ 14 s, 1.5 exhales), press-and-hold ≈ 22 s, mist (> 350 px/s) at half rate. **Idle floor = a linear schedule** from 100 at act-B start to 0 at 37 s after mount (act B always gets ≥ 8 s), with a snap below 0.05, so heat really reaches 0. Rain audio is synthesised outside the rAF (`later(…,0)`) and stopped at bloom and on unmount (`rainSfx(0.05)`). Five scored chimes come at 20 % steps, and RUSH's face goes 29 → simmer → soft.
- **Act C BLOOM (96 → 100), 3.4 s choreography, then `onProgress(100)`:**
  1. The last steam column rises from the crater into a teal → gold → pink **cooling aurora** that unfurls across the sky and then waves.
  2. **16 flowers race down the four cooled rivers** from the summit (44-56 px on phone, 54-68 px on desktop, 60 ms stagger, drop + squash on landing). The meadow fills the cone and the seams glow gold.
  3. The crater becomes a **petal spring** (6 petals in a fountain loop over a teal-gold pool).
  4. **RUSH hops onto the summit**: anticipation squash, stretch, an arc, a landing squash, ×1.18. It lands at 2.15 s with an E44 belly-laugh bounce, **the one big gold burst** at its position, a haptic and a three-note laugh chime.
  5. **The cloud does a happy spin** and drifts off to the far side.

  "Cooled to zero" fades in at the top, then fades out the moment `onProgress(100)` fires (`data-hero="off"`), so the shared flip words get the top band. `onDone(bonus)` fires once, 450 ms later.
- **Wrapper reward pills re-anchored (112 only):** a layout effect writes `--eosVolcPillX/Y` and `--eosVolcFinY` on the content shell (and removes them on unmount). `${EOS_A} :has(>.eosG112)>.globalStepFeedbackCopy` reads them with `!important`. In act A on phone the step pill sits beside the pips on the side opposite RUSH. In acts B and C it sits centred under the summit. It is never on the crater or the cloud. The finish card sits below the summit, not on it.
- **Reduced motion / calm:** no shake and no tap bursts (the crater-glow pulse is the answer). Rocks fade in their slot. Rain is an opacity pulse, and RUSH's breath shows as brightness. In act C, RUSH fade-teleports to the summit with a small burst, the aurora fades in statically, the flowers fade in, the petal spring is hidden and the cloud fades out.
- **Keyboard:** `releaseKeys()` on the cloud's `onBlur` and on window `blur` (with cleanup) resets `keyHold/keyDir/keyRainUntil/keyGlideUntil`.
- **Text that is not shown is not in the DOM.** Hero lines and cue chips mount only in their act, and rocks that have not launched are `display:none`. The arrows module reads text rects to place its label, so this keeps hidden text from steering it.
- **Performance:** one rock layer instead of three. Embers and plume pause while rocks fly (`data-busy`). Rain animates only in act B. The lava flow uses one registered-property transition (`@property --eosVolcFlow`) instead of 8 path transitions. PremiumBurst fires at most 2.5 Hz, and `big` only for spaced taps with ≤ 3 rocks flying.

## Round 1 findings → changes
| # | Sev | Finding | Change |
|---|---|---|---|
| 1 | blocker | Idle act B never finished (asymptotic floor) | Linear floor schedule to 0 at `coolEnd = max(t0+37 s, coolStart+8 s)` + snap < 0.05. Idle `onDone` 41.8 s after mount (390, reduced). At the old 39 s deadline it measured 44.4 s / 44.6 s, so I lowered it to 37 s for margin. |
| 2 | minor | Animated nodes over 60 | Pool 8 bound to slots, one layer per rock, shards only on single-rock taps, embers/plume paused, rain only in act B, `@property` flow, slower and smaller bursts. Peak targets: phone erupt 56 (intensity 10), bridge 42; desktop erupt 54, bridge 53-55 (one earlier sample of 61 was before the BOOM floater went to 0.75 s); finale 48 at +0.9 s. |
| 3 | minor | Reduced motion still burst | No PremiumBurst on taps when calm; landing burst `big={false}`. Reduced erupt: 13 animations. |
| 4 | minor | Keys stick on blur | `onBlur` + window `blur` → `releaseKeys()`. Test: [hold, dir] `[true,-1]` → `[false,0]`. |
| 5 | minor | BOOM floater did not replay | Toggle per element. |
| 6 | minor | Bridge line under the rocks | Rocks clear at 1.25 s; the line shows at 1.45 s, mid-sky. Measured heroOnRock 0. |
| 7 | minor | Bridge taps got no answer | Soft tone + haptic + glow pulse in act `ab` (`bridgeTaps` counter). |
| 8 | minor | Rain audio in rAF / not stopped | Deferred with `later(…,0)`; `stopRain()` at bloom and unmount (`rainOn` false after the finish). |
| 9 | major | Word rocks overlap at 390 | Hang-slot allocator + rock width capped by slot + straighter arc. **0 pairs > 5 %** at 390 (intensity 8, 10, reduced 9) and 1280 (10); boomOnRock 0. |
| 10 | major | Hero copy collides | Bridge: see #6. Finale: "Cooled to zero" fades at `report(100)` (opacity 0 verified). |
| 11 | major | Finale modest and covered | The 3.4 s act C choreography above, then `report(100)`; finish card anchored below the summit. |
| 12 | major | Step pill on crater/cloud | 112-scoped re-anchor (see above). pillOnCrater 0 everywhere; the pill is never on the cloud. The rewards/integration owner may later centralise this for all EOS games; my rule is scoped to `:has(>.eosG112)`. |
| 13 | minor | Act B too short | Rate 4.5 %/s (drag ≈ 14 s, hold ≈ 22 s, by formula). Measured headless driver runs: act B 18.9 s / 19.4 s (drag), 20.5 s (keyboard). |
| 14 | minor | Weak breath guidance / passive RUSH | Large first-cycle breath guide (chip hidden, verified opacity 0); RUSH swells on in, slumps on out, steams and gets dripped on. |
| 15 | minor | Arrow badge clips the loaded word | Word moved under the crater + `oy -0.25`. Arrow parts overlapping the word: none; label placed above the chevron. |

## Exports (top-level names)
`EOS_GAME_112`, `EosVolcanoEngine`, `EOS_VOLCANO_CSS`. Internal: `EOS_VOLCANO`, `EOS_VOLCANO_HOT`, `EOS_VOLCANO_COOL`, `EOS_VOLCANO_HUES`, `EOS_VOLCANO_FILLER`, `EOS_VOLCANO_P`, `EOS_VOLCANO_DEV`, `eosVolcanoSurf/Half/Paths/Layout/Slots/Now/Words/RocksPerTap/Intensity`. `EOS_VOLCANO_FLOWERS` was replaced by the river blooms.

Dev/test API (dev builds only):
- `eosApi("volcano").state()` → `{…previous fields, slots, skipped, coolEndMs, guide, landed, keyHold, keyDir, rainOn, bridgeTaps, msDone}`.
- `eosApi("volcano").coolNow()`: ends the cool-down now, for tests and finale screenshots.
- `eosApi("volcano").rocksPerTap(before)`.

Root test hooks: `data-act`, `data-rain`, `data-breath`, `data-guide`, `data-clear`, `data-busy`, `data-land`, `data-hero`, `data-eos-volc-taps`, `data-eos-volc-heat`.

## Integrator must wire
Nothing new. I1-E11 (`EosEngineFor` in `RoutedGameContent`) makes 112 playable, and `EosGlobalStyle` renders its CSS. In the isolated build without integration edits, 112 registers with zero errors but is not routed, as before.

- **Companion:** if the lead wants it hidden in 112 for every emotion, add `|| Number(game?.id) === 112` to the companion's check.
- **Rewards owner:** if a global EOS re-anchor of the step pill and finish card lands, 112's scoped rule can stay or be removed. They do not conflict, because the global rule would use the same `--fx-*` props.

## Acceptance results
All runs used the integrated scratch build with every release-1 module except the other hero games (`dev/eos_integrate.py`, all of `src/eos` minus 21/23/24), arena 360×658 inside 390×844, and 1280×860. **Zero page errors in every run.**

1. Registered: gesture `taps`, char `rush`, seconds 30. In the isolated build, 111 games are listed incl. 112 and there are no warnings.
2. Act A: 6 taps → progress 5…30. Rocks per tap for before 8 / 10 = 2 / 3, and taps are always 6. Slots: 6 (phone), 8 (desktop).
3. Overlap probe (visible rock bodies, opacity > 0.15, sampled 250/450 ms after every tap and every 250 ms through the bridge): **0 pairs > 5 %** at 390 (intensity 8, 10 and reduced 9) and 1280 (10). BOOM vs rocks 0 and hero vs rocks 0. The arrow's chevron, badge, glove and label never touch the loaded word, and the label sits above the chevron.
4. Canonical `finishGame` (pointer):
   - 390: done, onDone 39.3 s.
   - 1280: done, onDone 41.5 s.
   - **arrowMisses 0** on both.
   - Keyboard-only (after a blur test): done, onDone 33.5 s.
   - Progress strictly increasing until the reveal's null.
   - Non-soft sfx = **12 = 6 clack + 5 chime + 1 win**.
   - Headless act A is slow (13-23 s with the driver), so the 1280 run was finished by the floor schedule.
5. Idle (6 taps, then no input): onDone 41.8 s (390, reduced, 37 s deadline). Heat reaches 0, all 5 chimes fire, RUSH lands, and the rain is stopped.
6. Act B: the first-cycle guide hides the chip (opacity 0 over the first 0.7 s). Key blur releases held keys.
7. Act C:
   - RUSH lands (`data-land=1`) with a big burst (reduced: small burst, fade-teleport).
   - Progress is 100 after the peak.
   - "Cooled to zero" is at opacity 0 after `report(100)`.
   - Animated targets: 48 at +0.9 s (reduced 23).
8. Pill: pillOnCrater 0 at every size. Phone act A: lower-left of the cone, opposite RUSH. Acts B/C: centred below the summit, never on the cloud.

Pixar checklist:
- ✓ 3 depth layers (sky + aurora + ridge / volcano, lava, rocks, garden / cloud, RUSH).
- ✓ Key + rim light on RUSH; squash & stretch on every touch.
- ✓ RUSH transforms 29 → simmer → soft → E44 laugh on the summit and acts in the world: squash per eruption, breath co-regulation, steam, drip, hop, laugh.
- ✓ ≤ 1 instruction line at a time.
- ✓ Baloo 2 only.
- ✓ Colour script red → teal → aurora gold.
- ✓ Every touch answered in pointerdown, the bridge included.
- ✓ No flashes.
- ✓ Safe area respected.

## Screenshots (local) — `/tmp/eos_game-volcano_t/`
- Phone: `390_10_1start`, `_2erupt`, `_3bridge`, `_4breath`, `390_5breath`, `390_f1` (+1.1 s: aurora, flowers, cloud spin), `390_f2` (landing + burst), `390_f3` (after 100: shared flip words, RUSH laughing on the garden), `390r_f2` (reduced).
- Desktop: `1280_10_*`, `1280_f1`, `1280_f2`.
- Sheets: `sheet_p.png`, `sheet_d.png`, `sheet_f.png`, `sheet_g.png`.

## Known limitations
- The bridge line unmounts the moment the cloud arrives (no fade-out). Hidden text must not stay in the DOM, because the arrows module reads text rects to place its label.
- The wrapper's floating emotion orbs (`characterEmotionUniverse`) can drift over the top hero line. That layer is not in this module.
- At very fast tapping (≥ 4 taps/s at intensity 9-10), some taps launch no new rock because all 6 phone slots are holding readable words; the tap still gets its full juice. This trade is deliberate: no overlapping words.
- Headless timing: act A and finale timestamps in headless Chromium are frame-bound (3-9 fps), so screenshot moments drift by a few hundred ms.
