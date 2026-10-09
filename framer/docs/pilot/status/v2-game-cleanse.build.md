# v2 CLEANSE (id 109) "Moon Pool": *your fog becomes stars*. Build report

**What this is:** CLEANSE rebuilt from scratch to `PILOT_A_ADDENDUM.md` §CLEANSE, with §Shared S2′ and S5′ through S11 on top of spec §3. The only file changed is `src/pilot/73_pilot_cleanse.jsx`. It uses the shared systems in `71_pilot_fx.jsx` and `70_pilot_core.jsx` as they are (committed in f626461). Nothing in 70, 71 or `src/eos` was edited.

**Before:** `dev/shots/quality/sheets/109.png`. That is an abstract space backdrop with faceless or sticker orbs. The words sit in pills under the orbs, "HOLD TO …" buttons sit outside them, and a central mandala shows "0%". The game ends with one white glowing dot labelled "RELEASED".

**After:**
- `v2-game-cleanse.after_390.jpg`: panic, full run from the Mirror to the reveal.
- `v2-game-cleanse.after_1280.jpg`: anger, full run.
- `v2-game-cleanse.mirrors.jpg`: the Mirror frame at 1.8 s for panic, sad and reduced-motion panic at 390, and for anger and anxious at 1280.
- `v2-game-cleanse.discoveries_390.jpg`: the frog, koi and shooting star, forced on with `?mpfx=rare,frog`.

## The game, beat by beat

**Mirror (0 to 2 s; the clock starts at the first measured layout).**
- **0 ms:** the pool already shows the session emotion's weather, from the S7 preset (`eosPilotMirror`) via the stage's `.eosPilotL0m` tint plus CLEANSE's own layers:
  - **panic:** lilac water with choppy cross-ripples, cloud racing over the moon, every orb trembling (1.5 px × (1 − calm)).
  - **anger:** red-orange sky and water, a red glow from below, rising steam, and orbs that boil inside (bubble streams) and get shoved every 1.6 s. One far thunder glow at 720 ms (140 ms, ≤ 0.42 opacity, never a strobe).
  - **sad:** grey-blue fog on the water, rain rings, the moon hidden, orbs half-sunk and tilted.
  - **anxious:** violet water with six darting motes and a restless figure-8 drift.
- **300 to 900 ms:** the orbs surface one by one, 90 ms apart (bob up, overshoot, a ripple ring at the base). Each orb is a glass circle holding the player's own picture and words (F8).
- **600 to 1400 ms, the hero's take inside its own orb:**
  - **panic:** pressed to the glass while the glass fogs with every fast breath.
  - **anger:** two thumps on the glass and a puff of steam.
  - **sad:** curled low and tilted.
  - **anxious:** turns round and round.
  - As each orb arrives, the hero's picture tilts toward it. It flinches at the first anger word and droops at the first sad word.
  - At 1300 ms it gives one nod to camera.
- **Input and arrow:** targets are live from 300 ms, and the first `hold` arrow appears at 1400 ms.

**Release (one breath per orb).**
- **Pointerdown:** all of this starts in the same handler:
  - the glass flexes (0.96 → 1) and lifts 14 px out of the pool;
  - the picture looks up;
  - clear water rises inside (the gesture fill, which is also `--hold-pct` for the arrow);
  - the murk is squeezed into a cloud at the top;
  - every uncleared orb and the hero breathe in with the player (scale 1.03), and cleared orbs turn to watch;
  - STILL breathes in;
  - a ripple spreads at the base;
  - sound: an intake whoosh plus a tone rising a fifth over the inhale.
- **Inhale length:** 2.6 s, plus 0.15 s per clear, up to 3.4 s.
- **Full breath:** the rim turns gold, the picture puffs its cheeks, the murk swirls faster, and the ready chime plays.
- **Let-go, the exhale:** 2.4 s, plus 0.12 s per clear, up to 3.2 s. During it, the "BREATHE OUT…" `wait` arrow shows with `data-eos-idle=10000`, and other orbs are locked.
  - The orb sinks with a squash and drifts toward the lotus.
  - The murk pours out of the top as light, mood-tinted wisps.
  - Then **4 to 6 points of light climb from the orb into the sky and settle as that word's own constellation** (five shapes, chosen by seed). Its lines fade in, and its mirror twin appears in the water.
  - The picture flips to its positive variant (F8 relief), and the word sharpens to crisp white.
  - Everyone breathes out.
  - One lotus petal loosens and glows.
  - Sound: the out-breath tone, then a falling G-pentatonic note at +520 ms, a star twinkle at +1500 ms, and the next phrase of the mood bed.
- **Early let-go:** the water drains, the picture sighs, and a sigh sound plays. There is no caption and no fail.
- **Tapping the waiting hero:** it waves toward the next orb, which bobs "me first".
- **Tapping open water:** a ripple, the nearest picture looks at it, and the koi swims over.
- **Escalation and surprises:**
  - **Koi, every run:** colour by seed (gold, white-red or blue). It arrives at 34 %, circles each orb the player picks, and leaps on a deep clear (held past 3 s) with a splash.
  - **Frog, 50 % of runs:** plops off its pad at the first breath, or at the Mirror for anger and anxious. At 67 % it reappears on the lotus leaf.
  - **Shooting star, 1 run in 5, on a deep clear:** it crosses the sky, the hero looks up in wonder, and it lands in the lotus, which later opens with one gold petal.

**Transform (on every release, never in steps).**
- `stage.shift(p)` cross-fades the mirror tint to the calm night. With it:
  - the water murk falls by 1/N per breath;
  - the weather layers fade (calm × 1.3);
  - the cloud veil leaves the moon;
  - the moon and its reflection brighten.
- Orb weather loses amplitude through `--amp`.
- The breath clock (S8) slows from the preset's period toward 4000 ms. Measured: 1400 → 1842 → 2258 → 2700 → 3142 → 3558 → 3896 ms (panic).
- The hero's pose softens: loud at 0, soft at 34 %, and at 67 % its palm is pressed to the glass, which warms.
- The sound bed calms:
  - **panic:** the heartbeat slows from 108 to 66 bpm and the 220/223 Hz beating pair narrows;
  - **anger:** the rumble fades and stops;
  - **sad:** the rain thins and the minor pad turns major at 67 %;
  - **anxious:** the shimmer fades to off by 67 %.
- The sky fills with the player's own constellations.

**Payoff, the climax "Clearest Night".**
- **T0** is the let-go of the hero orb. The hero's face has already turned positive at its full in-breath; if the player lets go early, it turns positive inside the climax.
- **0, LAST BREATH:** the hero's murk leaves as silver light, one ring sweeps the pool edge to edge, the water goes still, and every reflected constellation snaps to a perfect twin (opacity 0.92).
- **300, STAR RIVER:** every constellation, in the sky and in the water, streams in two mirrored spirals onto the lotus. The moon path draws itself from the moon's reflection to the lotus, and a clear-night star field fades in. Six ascending chimes play.
- **800, BLOOM:** 8 petals open with a 70 ms stagger and the lotus grows to 1.3×. The lotus chord plays.
- **1300, FLARE:** the gold heart becomes the key light.
- **1350, MEETING:** the hero's glass dissolves into light, it glides to the lotus, and STILL wakes (win face) and rises. A bell plays, then the pad.
- **1700, GREETING:** a forehead touch, a nose boop or a slow spin (by run), and one gold ring on the water.
- **1800, THE MIRROR SHOT:** the plane eases 6 % down, and every cleared orb turns its positive face toward the pair. The pad reaches 0 by 2200.
- **2200, settle:** the scene is frozen.
- **2350, hand-off:** `onDone`, then the wrapper's approved mega burst, unchanged, then the reveal.
- **Reduced motion:** the same beats at 0, 300, 600, 650 and 700 with opacity only; settle at 750, hand-off at 900.

**Replay (S11):** each run varies:
- the arrangement (arc, rows or scatter);
- the constellation shape per word;
- the koi colour;
- STILL's greeting;
- the moon phase (full, gibbous or crescent);
- the frog (50 %) and the shooting star (20 %).

`eosPilotPickRun` never repeats the last run's pick. There are no counters, streaks or timers; the old "k / N CLEAR" pill is gone.

## How each standard is met (measured headless, CPU shared with parallel agents)

| Standard | Evidence |
|---|---|
| **F8 pictures** | Every orb (5 word orbs and the hero) is a `.tsFaceObject.tsNoBubbleFace` host with a pinned `data-ts-bubble-index`. Pictures come only from `eosPilotFacePics` (the `tsBubbleFaceSources` resolver), re-read when the uploads change, with the picture above and the words below inside the same circle. Murk sits behind the picture and gloss only at the upper-left. `f8_probe` for 109 at 390, with 0 and with 3 uploads: hosts 5, and 0 for each of noPic, notCircle, cropped, textOverPic, textOutside, darkMask, phasePositiveAtStart and emptyObject. Text is 14 to 15 px. Faces start negative and turn positive at each release. Relief pictures are pre-decoded at mount. |
| **Mirror within 2 s** | At 1.8 s the 4 presets are visibly distinct (`v2-game-cleanse.mirrors.jpg`), and the player's words and pictures are inside the orbs. |
| **A4 climax** | climax − input: 220 / 416 / 66 / 172 / 119 / 140 / 85 ms (the 416 was at 1280, before the picture swap was deferred by one frame). Every beat ends ≤ settleAt with 0 warnings. Hand-off − input: 2354, 2355, 2353, 2360, 2359, 2354 and 2354 ms; reduced motion 905 ms. |
| **A5 burst clean** | While `.tsRewardSurge.mega` is mounted:<br>- 0 running animations in the arena (`data-eos-pilot-hold=1`, 44 to 50 animations paused at settle);<br>- 0 visible `.eosMoodFlip`;<br>- 0 pilot sound rows between the hand-off and mega unmount;<br>- 0 `.tsRewardSurge.step` mounts after T0.<br>The final report is kept inside the wrapper's current reward bucket (83 → 100 at the hand-off), so GameEngine never mounts a step burst over the climax. Passed in all 6 full runs. |
| **A6 arrows** | Every stage has exactly one live marker:<br>- "HOLD · BREATHE IN" (`hold`, ms = inhale, `--hold-pct`) on the next orb;<br>- "BREATHE OUT…" (`wait`, `data-eos-idle=10000`) on the exhaling orb;<br>- "YOU NOW · BREATHE IN" on the hero;<br>- none during surfacing or the climax.<br>`f6_probe` 390: reached the reveal with 0 arrow misses and 0 label mismatches. |
| **Characters perform on every input** | Press, full, let-go, early let-go, tap on the waiting hero, tap on water, and finale taps (a ripple before T0 + 800, skip after). |
| **Sound + sync log** | Every cue is an S4 row (tone, noise or swell). Per run there are 86 to 157 rows covering hold, ready, exhale, note, twinkle, sigh, wave, miss, turn, koi, leap, plop, thunder, the bed cues and the climax cues. Input-to-tone dt p50 was 24 to 56 ms. Headless has no audio, so these are scheduling logs only; nothing was heard. |
| **Phone first** | At 390: D 108 (hero 119), the lotus on the far water and the sky above. Desktop uses the arena's centre band at D 126 (hero 139). |
| **Switch** | With `?pilot=off`, the original CLEANSE plays to the reveal (`finishGame`, 0 errors). |
| **Errors** | 0 page errors in all 6 full runs (390 panic ×2, 390 sad, 390 reduced, 390 discoveries, 1280 anger ×2, 1280 anxious), in both probes and in the pilot-off run. |

## Known gaps (honest)

**Timing**
- These are headless timings on a loaded shared machine. Real-phone touch latency (A7) and the ≤ 300 ms climax were not measured on a device.
- Screencast frames lag the page, so the finale frames show the composition, not exact offsets.

**The wrapper's per-step reward during play**
- After each non-final release, GameEngine plays its own step burst: character particles plus a toast such as "STEADIER ✓ +8 ×1".
- It is triggered on progress buckets, so it cannot be avoided without changing the wrapper.
- It never plays after T0.

**Word chunking (shared `eosPilotWords`)**
- Chunks can split oddly; examples: "full I", "late inbox is", "I feel so sad and".
- This also affects POP.

**Moon path at desktop**
- At desktop the moon sits far left, so the path from its reflection to the lotus runs almost horizontally. It reads as a light ribbon, not a classic moon path.

**Discoveries in the finale composition**
- At the climax the frog on the lotus leaf is partly hidden by the open lotus.
- The shooting-star flight was confirmed by state (`shot: true`), not by a frame.

**Not tested**
- Wave mode (6 to 10 word orbs) is implemented but was not played.
- The full uploads 1-to-6 matrix and removing uploads mid-run were not run (0 and 3 uploads were probed). The resolver is re-read whenever the upload key changes.

**Other**
- The hero's "eyes follow" is a tilt of its picture, because the pictures are images.
- POP and CRUSH were not replayed. Neither 70 nor 71 was changed, and every build includes all three pilot games without page errors.
