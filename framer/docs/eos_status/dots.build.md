I fixed all 10 round-1 review findings in `src/eos/12_eos_dots.jsx`: 1 major and 9 minors, none skipped. The acceptance checks pass at 1280×860 and 390×844 with zero page errors. Only the dots files are committed ("EOS fix: dots round 1").

**Round-1 fixes (docs/eos_status/dots.review_r1.json)**

1. **Animated-node budget (major).** Dots used to run 91 animated elements in play at 1280 and level 9, and 60 at 390.
   - No dot runs an animation of its own any more.
   - The intensity wobble is now a second animation on the lane element itself. It is ±2 px, and ±3.5 px at levels 9–10.
   - The fireflies blink, aurora shimmer and gold glints are built into each lane's own keyframes (`eosDotsLaneFf/Au/Gd`), using opacity and filter stops.
   - Desktop drops from 30 lanes to 28.
   - **Measured in play at level 9, for each of the five dust styles:** 59 animated elements at 1280 and 42 at 390.
2. **Compositor layers (minor).** Each lane is now a 0×0 box placed on its starting point. Its `transform-origin` is the measured centre in px (`calc((cxf − xf) × 100cqw)`, with a px-variable fallback for browsers without container units). Each lane layer is now dot-sized instead of covering the whole stage. The centre checks still pass at both sizes, and the lane boxes measure 0×0. This has not been profiled on a real iPhone.
3. **Audio unlock on touch (minor).** The bed now arms on pointerdown, pointerup, touchstart, touchend, click and keydown. It stays armed until the shared audio context reports `running`. `bedUpdate` retries `resume()` while the context is suspended.
4. **§0.5 `useEosProgress` (minor).** I kept polling progress inside the controller's own 4 Hz pass, which the pacer, rates and audio need anyway, and it avoids React re-renders. This is a deliberate deviation, recorded in the module header.
5. **Single API target (minor).** Live controllers are now kept in a Set. `pulse`, `setLevel` and `gather` reach every mounted instance, and `state()` reads the most recently mounted one. Unmounting removes only that instance.
6. **Reveal burst invisible on phone (minor).**
   - During `.eosBurst` every dot goes to opacity 1 and twice its size (a 0.32 s transition), with a trail pointing back at the light.
   - The shockwave ring grows to 3.4× on desktop and 4.3× on phone, so it clears the result card.
   - On phone, the reveal halo is a ring that frames the card instead of a glow hidden behind it.
   - Measured at 390: mean dot distance from the centre 143 px, max 231 px.
7. **One centre vs the game's own centrepiece (minor).** During play, a focal anchor now wins: `[data-eos-focus]` (any game can opt in) or the legacy `.blackHole` (39) and `.lotusCore` (109). The Still Point glides there over 0.7 s and every dust layer follows it. The white spark hides and the glow dims behind the centrepiece; with calm visuals or reduced motion this happens instantly.
   - **Measured:** 39 core at (640,335) vs hole (640,336) at 1280, and (195,299) vs (195,299) at 390. 109 matches the lotus at both sizes.
8. **Calm colour washed out at the in-game bloom (minor).** While the dust gathers, the flash and halo use saturated stops at 58–66% lightness, and the wave becomes a 3 px coloured corona. On screen at 390: sad blooms peach and anger blooms teal. At 1280, panic blooms a pinkish dawn tone.
9. **Muddy reveal haze on desktop (minor).** The reveal overlay now has a soft clear well around the Still Point (8% → 52% darkening). The desktop halo is tighter (inset −62% instead of −80%) and brighter, at 64–70% lightness. Panic now shows a warm gold aura around the card instead of a brown wash.
10. **Intensity change barely visible (minor).** Each `setLevel()` step now gets an immediate answer:
    - Turning the dial up: a surge of `1 + 0.6×step` (capped at 3.4×) for 0.42 s.
    - Turning it down: a brief hush (down to 0.35×).
    - Either way: the core's ring twinkles (`eosDotsTwinkle`).
    - The surge settles exactly on time, without waiting for the next frame. Measured: 5.13 during the surge, then back to 1.51.
11. **Field freezes when the reveal never comes (minor).** If the dust has been gathered for over 6 s while still in play, it flows again at the calm finishing rate. A latch stops it re-gathering until a new finish happens. **Tested by faking the finish flag:** gathered at +1 s, flowing again at +7 s, still flowing at +9 s, gathered again on a new finish.

**Exports and API (unchanged):** `EosThoughtFlow`, `EOS_DOTS_CSS` (registered with `eosCss("dots")`). API via `eosApi("dots")`: `pulse(kind)`, `breath(phase, ms)`, `phase()`, `beat(bpm)`, `setLevel(n)`, `gather()`, `state()`. `state()` now also reports `kick` and `focus`.

**What the integrator must wire (unchanged apart from one new option)**
- Integration edits I1-E1, E2, P1 and E14 (already in `dev/eos_integrate.py`).
- The check-in and shift dial call `eosApi("dots").setLevel?.(n)` on every change. This now also triggers the surge or hush and the ring twinkle.
- Games 111/112 and the Still Moment call `eosBreathOwn` / `eosPacerBeat`. Rewards call `eosSetPref("dust", style)`.
- **New, optional:** a hero game can put `data-eos-focus` on its centrepiece (a volcano crater, a lantern…). The Still Point and all dust then converge there during play.
- **Arcade surfaces my CSS changes** (look only, no effect on interaction):
  - `.releaseIdleStage` loses its opaque base layer.
  - `.releaseCompleteOverlay` is lighter and has a soft clear well around the centre.
  - `.infinityField` is hidden.

**Tests (round 1)**
- **Builds:** the isolated build (`--modules 00_eos_core.jsx,12_eos_dots.jsx`), an isolated build together with the readability module, and the integrated build at `/tmp/eos_dots_int` all compile.
- **Acceptance suite** (`/tmp/eos_dots_t/accept.mjs`), every check passes at both sizes and the only remaining failures were load flakes, not regressions:
  - Covers lanes visible, one centre on the home screen, in play and in the reveal, rate mirroring, pacer sync, spark mode, audio bed, dust visible in 7 games, the cleanse tiles, gather on finish, reduced motion, calm visuals, perf, and zero errors.
  - **Calm visuals:** `8_calm` first flagged the new glow cross-fade under calm visuals. I made it instant there and in reduced motion; `8_calm` passed on the 390 run, and `8_calm_off_restores` passed at both sizes.
  - **Flakes:** pacer and spark failed once while three browser runs shared the CPU. They passed when re-run alone.
- **Round-1 probes:**
  - `r1_probe.mjs`: element budget per style, lane box size, the field-freeze release, and focus for 39, 109 and 2.
  - `r1_kick.mjs`: the dial surge.
  - `r1_burst.mjs`: burst numbers.
  - `r1_sc.mjs`: the burst scale transition.
  - `r1_seq.mjs` / `r1_cast.mjs`: gather and reveal frames.
  - Results are in `/tmp/eos_dots_t/r1/`.
- **Screenshots reviewed:** `/tmp/eos_dots_t/r1/sheet1.png` (gather, reveal and focus at both sizes), `sheet2.png` and `sheet3.png` (gather bloom colours, phone reveal halo).

**Known limitations**
- **Reveal burst not seen in motion:** headless rendering stalls for about 0.85 s while the reveal mounts, so no screenshot caught the burst in flight. The numbers above confirm it plays, and the dots grow to 2× once frames resume. It should be looked at on a device.
- **Layer memory unprofiled on WebKit:** the dot-sized lanes are measured as 0×0 boxes in Chromium only.
- **Main-thread dust:** the Pixar motes and cinema dust still move by `left/top`, as spec §5.3 prescribes.
- **Arcade glows still tint the bloom:** they are not mine to change. A gold bloom over the game's cyan glows mixes toward a warm dawn tone rather than pure gold.
- **Games 111–114 not tested:** their files don't exist yet. They can opt into `data-eos-focus` at integration.
