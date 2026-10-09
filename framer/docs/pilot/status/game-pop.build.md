# POP (id 1) "Balloon Morning": build report

**File:** `framer/src/pilot/72_pilot_pop.jsx`. It is registered with `eosPilotRegister(1, EosPilotPopEngine)` and builds on the shared systems in 70 and 71 (S0–S6).
**Switch:** with `?pilot=off` or `localStorage eos_pilot=off`, the original POP plays to the reveal. This was tested: 6 `popBubbleV2` buttons, `finishGame` reached the reveal, 0 errors.
**After shots:** `docs/pilot/status/game-pop.after.jpg`.
- Top row (390): 6-word start, mid-play after the re-balance, the calm bubble with the win face, the tableau, and the reveal card with the sky afterglow.
- Bottom row (1280): start, mid-play, and the tableau with the sunbeam and the rainbow arch.
- **Before:** `dev/shots/quality/sheets/1.png`.

## What the player sees

**World.**
- The `sky` kit fills the arena. It starts as hazy lilac and clears to a high blue sky as the bubbles pop.
- At 34% the haze lifts off the sun. From 67% sun rays fan out of the sun, and two birds appear.
- The hero stands on a sunlit cloud-top that is part of the play plane.
- The shared nebula and ring stage no longer show inside the arena.

**Cast.**
- The session emotion's character, at the start a crying SYNC for "panic", is an S1 holder with hands and feet.
- Its raised hands hold one 1.6 px tether per bubble.
- The bubbles have no faces. Each is a near-clear soap film with an iridescent conic rim that rotates slowly, a specular dot from the sun (upper-left) and a cool rim on the right.
- Each bubble sways around the hero's **hand point**, so the string stays on the hand. The marked bubble sways hardest.
- Bubble size depends on word length, and tether lengths vary.

**Per pop.** The bubble reacts on pointerdown:
1. It dimples toward the touch point, then the film tears.
2. Ten droplets fly on gravity arcs, a shockwave ring expands, and up to four glyph shards (letters of the word) drift up.
3. One droplet stays hanging in the air; these are used in the finale.
4. The tether snaps back toward the hand.
5. The two nearest bubbles swing on their tethers (supporting cast).
6. The hero lurches away from the popped side, scaled by bubble size. It then plays one reaction from a pool that never repeats the same pair twice in a row:
   - brace face, then looks at the empty spot;
   - wow face, then shakes it off;
   - wow face, then glances at the player.
   - Chains override these: at 3–4 a giggle with a shoulder bounce (alternating with a tilt); at 5 or more a laugh with a one-foot hop.
   - A face-step crossing overrides everything: a closed-eye phew.
7. The feet re-plant wider (`setStance(k/N)`) and the pull eases (`setTug`).
8. A small exhale puff plays.

**Between pops.**
- After 400 ms with no pop, upper bubbles glide down into empty lower slots. Each tether's anchor moves by `translate` with the same transition, so the string stays on the hand during the glide.
- With one bubble left, the hero looks at the camera with a wow face ("you do it").
- A miss gets a head shake or a tilt, the nearest lower bubble wobbles toward the hero, and the s2 miss cue plays. It is never silent and never a fail.
- With more than 6 chunks, POP plays in waves: a new bunch drifts in from the right and the hero catches it. The code path exists, but the wrapper hands over ≤ 6 entries, so it was not reachable in tests.

**Finale "Calm Bubble".** No lift-off, no burst, no sunrise.

| Time | Beat | What happens |
|---|---|---|
| T0 | Climax | The last bubble tears in slow motion (2.6×). Its droplets fly out and freeze in the air. Every hanging droplet stops and catches the light. A flare blooms behind the hero. |
| T0 + 350 | Transform | All droplets stream along curved paths into the hero's raised hands. They merge into an iridescent calm bubble that grows around the hero and its cloud (≤ 176 px at 390, 240 at desktop). Merge plinks play. The hero shows a closed-eye phew, then presses a hand to the film from inside. |
| T0 + 1300 | Peak / hand-off | The bubble catches the sun: a sunbeam from the sun reaches it, the film flashes, the rim spins up, and a rainbow caustic sweeps through the film. **A rainbow arches over the hero's bubble.** `onDone` fires, then `onProgress(100, "100% POPPED")`, and the face turns win. Each character's win face is a closed-eye smile, picked on the `EOS_WIN_FACES` strip (`EOS_PILOT_POP.winFace`). |
| T0 + 1300–2600 | Afterglow | The hero sits cross-legged (feet tucked, hands in its lap, body squashed) and bobs with its bubble on the cloud. Rainbow glints drift over the cloud. The grade goes from 0.7 to 1.0 as a supporting move. The glow pad plays from T0 + 1700. |
| T0 + 2600 | Tableau | The hero rests in its own bubble under its own rainbow, and the name label returns. The reveal carries the sky afterglow with the win face. |

## How each standard is met (CREATIVE_STANDARDS)

- **Characters are active in-world participants.**
  - The hero holds every pull. Every input moves it: a lurch on every pop, a varied acting pool, a miss reaction, an anticipation gag, a catch for a new wave.
  - The supporting cast reacts on every pop: neighbouring bubbles swing, and tethers sparkle at chain 3 or more.
  - The hero changes with progress:
    - face steps loud → soft → calm → win;
    - stance widens and the sway calms;
    - the jitter quirk fades;
    - it sits down in the end.
  - All of this is driven by the game's state, not by overlays.
- **Its own finale.** The droplets become the calm bubble, sunlight is refracted into a rainbow arch, and the hero sits in its bubble. The shared bloom, grade and dust only supplement it.
- **Distinct from look-alikes.**
  - Unlike the C1 bubble row on the ring stage, POP uses a single direct tap on tethered film that pulls a grounded holder.
  - The pentatonic chain ladder adds giggles and a laugh.
  - It is set in daylight.
  - Unlike 41 UNHOOK, POP grounds the hero; UNHOOK frees bubbles that rise.
  - Unlike CLEANSE, POP's bubbles are faceless, thin and tethered.
- **Bubble image rules.**
  - All balls are circles (`border-radius: 50%`, `overflow: hidden`), with no dark plate.
  - Words sit on the clear film. With user images, the image fills the film and the word goes **below** the bubble.
  - Rows never overlap. Rows clear the hero (`heroTop − 20`).
  - The sway envelope stays inside the play box: amplitude is capped at about 10–13 px.
- **Cinematic and immersive.**
  - Key light and rim from one direction (the sun, upper-left).
  - A static vignette and pre-blurred clouds.
  - Light fx: rays, a flare, the beam and the rainbow.
  - The film materials are built from gradients only. No blur filters, no backdrop-filter and no clip-path animation.
- **Features kept.**
  - `onProgress` on every pop (`n% POPPED`).
  - The `POPPED k / N` pill (top-left; the top-right is under the shared companion orb).
  - The LIVE GUIDE and MIND BEND, via the S6 dock and bend.
  - Guide arrows: one marker `{g:"tap", label:"POP IT!"}` on the lower-row bubble nearest the last tap.
  - Sound: arcade `pop` and `eosTone` layers.
  - Step toast, chain HUD and haptics (via `p.sfx`).
  - The user's own words at 16 px / 800 weight. Merged stop chunks keep every token.
  - User images in the bubbles.
  - Keyboard: Tab to a bubble, then Enter or Space pops it.
  - Reduced motion.
- **Phone first.**
  - The marked target's centre is at y 443–453 at 390×844 (F8 requires ≥ 400).
  - Targets are ≥ 84 px, plus a 64 px hit extender and 28 px near-hit forgiveness.
  - The guide is docked to the 44 px strip.
  - The calm bubble is composed above the strip.

## Test results (`/tmp/pilot_pop`, Playwright through `dev/eos_drive.mjs`)

| Check | 390×844 | 1280×860 |
|---|---|---|
| Plays to the reveal, page errors | yes, 0 (3-word ×5, 6-word ×2, reduced ×1) | yes, 0 |
| `finishGame` with `assertArrows:"auto"` (6 chunks) | done, reason `reveal`, 0 arrow misses, 0 label mismatches | (scripted run used) |
| Progress (F2) | 0 → 33 → 67 → 96 → 100; 17/33/50/67/83 → 96 → 100. 100 arrives 1.31–1.33 s after the last pop (reduced: 0.71 s) | same |
| Word size, `smallText(12)` | 16 px / 800; none | 16 px / 800; none |
| Arena DOM | 135 (3 words), 162 (6 words) | 135 |
| Running animations, steady (≤ 40) | 16 (3 bubbles), 22 (6 bubbles) | 16 |
| Sound log (S4) | one row per layer for pop, miss, exhale, step, step2, giggle/laugh chirps, shimmer, plink1–3, glow and finaleTap; `ctxState` running | same |
| `?pilot=off` (F5) | the original POP plays to the reveal | — |

## Deviations from the spec (with reasons)

1. **The rainbow is an arch over the bubble, not a sky-wide band or wedge.** The refracted wedge pointed off-screen below the cloud, because the sun is upper-left and the bubble is low. The arch reads at once and stays inside the box. I also turn on the kit's `rainbow` particle.
2. **The counter pill is top-left at the top of the play box.** The top-right is covered by the shared companion orb. The docked step toast can briefly overlap the pill's right edge.
3. **Upper bubble row spacing.** The upper row sits `dLow/2 + d/2 + 14` above the lower row, instead of the spec's 43%. With 84–100 px bubbles the spec's rows overlapped.
4. **Desktop hero column.** It uses the full arena height (`h − 16`) because the guide only covers the bottom-left. The spec's fractions made the lower row overlap the hero.
5. **Debug handle.** `__eos.pilotPop.state()` (dev builds) returns `k, N, wave, phase, chainMax` and a `perf` list of pointerdown-to-next-frame times. The arena carries `data-pop-t0` so tests can anchor finale frames.

## Known gaps

- **Frame timing on this machine.** Load was 4–7 on 4 cores. The pop handler itself takes 4–75 ms. Pointerdown to the next painted frame took 400–1550 ms, almost all of it after my handler, in the wrapper's synchronous re-render, audits and observers. Finale frames therefore render up to about 1 s behind the timeline. I could not measure F9 (peak at T0 + 1300 ± 60) or F6 (latency ≤ 15 ms) reliably here: input-layer `dt − at` had a p50 of 22–49 ms. Both need a check on a real device.
- **Intro animation count.** It briefly peaks at about 49 running animations with 6 bubbles under load: inflate, word fade and tether draw are staggered per bubble. The steady state is 16–22.
- **Reduced motion.** `setStance` moves the feet through the shared rig's `left` transition (300 ms, `71_pilot_fx` CSS). It is not a transform, but it is motion. All body and idle transforms are off.
- **SYNC's calm face (E90) is a sleeping moon crescent** from the shared face mapping. It reads as night in POP's daytime sky. This is for the systems owner (`EOS_PILOT_CHAR_CALM` / `EOS_EMO` calm ids).
- **Wave mode** (more than 6 chunks) is implemented but not reachable through the wrapper (it hands over ≤ 6 entries), so it is untested in the browser.
- **Shared supplements over the arena.** The wrapper's head-confetti orbs, the companion orb, the "slower… nice" bubble, the faint red edge decals and the mood bloom still draw over the pilot. They are not pilot regressions; they are W0-2 or shared-chrome items.
- **Not run.** No independent rater scores, no Event Timing table, no frame-time distribution, and no phone recording. These come with the approval package.
