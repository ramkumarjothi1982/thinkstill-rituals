I finished and fixed the draft of `src/eos/12_eos_dots.jsx` and tested it. All nine acceptance checks pass at 1280×860 and 390×844 with zero page errors. Nothing is committed and no other source file was edited.

**What it does (spec §5.1–5.5, §0.4, §2.1, §9.2)**
- **Still Point:** a glowing core of `min(36vmin,280px)` at the stage centre. It breathes from the shared pacer: 10 s autonomous cycle, synced to `performance.now()` within about 20 ms. When a game owns the breath it follows that game's in / hold / out timing (linear on the out-breath).
- **One measured centre:** every dot layer flows into the same point. That covers 30/18/10 spiral lanes, the 14 Pixar motes, every game's `.cinemaDust i`, 109's star tiles, and the bokeh, which drifts 25% of the way in over 60 s. The centre is re-measured once a second, on resize and on stage change.
- **Speed follows intensity:** dot speed is `0.7 + 0.09 × level × (1 − progress)`, plus a small wobble at level 7 or above. Speed falls as the game progresses.
- **Finish and reveal:** at the finish the dots rush in and the core blooms. In the reveal they burst out once, then drift home on roughly 30 s lanes, and a calm-coloured glow sits behind the result card.
- **Spark mode** (numb, good): faster warm dust and a 72 bpm pulse instead of breathing.
- **Panic or fear at high intensity:** dots drift straight in, with no spiral.
- **Calm visuals and reduced motion:** a static field, no running dot animations, and `data-eos-calm` set on `.tsArcade` and `.tsPixarRoot`.
- **Dust styles:** default, fireflies, aurora, snow, gold, read from `eosPrefs().dust`.
- **Audio bed:** quiet low-passed noise (peak gain 0.024) that follows the pacer during check-in and play. It is silent while music plays, with sound off, in the reveal, or in a background tab.

**Changes in this session**
- **Performance:** the 4 Hz controller now runs right after each frame is painted. Its once-a-second measure used to force a 10–14 ms style recalculation inside the frame callback; each controller call is now about 0.5 ms.
- **Hand-over between autonomous and game-owned breathing:** the core's size is now calculated rather than read back from the page, so a game's `eosBreathOwn()` call costs nothing and the light never jumps. Measured maximum change is 0.65 scale/s over a 0.9 s hand-back. A repeated `"in"` (111's "one more sip") swells the core slightly further.
- **Colour (a deliberate spec reading — please confirm):** the core moves from the feeling's own hue to the hue of its calm grade (anger red → teal, panic → dawn gold, sad → peach), following §0.2, instead of always ending on cyan 190 as §5.2 says. It takes the way round the colour wheel that avoids yellow-green. Numb starts grey and regains colour as progress rises.
- **Look:** a stronger core during play, a visible calm glow in the reveal, a livelier spark mode, faster `pulse()` response, and a smaller noise buffer.

**Exports:** `EosThoughtFlow`, `EOS_DOTS_CSS` (registered with `eosCss("dots")`). API via `eosExpose("dots")`: `pulse(kind)`, `breath(phase, ms)`, `phase()`, `beat(bpm)`, `setLevel(n)`, `gather()`, plus `state()` for tests.

**What the integrator must wire**
- **Arcade/Pixar edits:** none beyond what `dev/eos_integrate.py` already applies:
  - I1-E1: `<EosGlobalStyle />`.
  - I1-E2: first child of `section.releaseStage` is `<EosThoughtFlow stage={stage} reduced={!!reduced} />`.
  - I1-P1: Pixar dust spawns over the full height.
  - I1-E14: store mirror of `sound` and `music: !!(musicOn && sound)`; the audio bed depends on it.
- **Check-in:** call `eosApi("dots").setLevel?.(n)` on every dial change. The shift meter's after-dial should do the same. The override clears itself when the store phase or the stage changes.
- **Games 111/112 and the Still Moment:** call `eosBreathOwn(phase, ms)` and finish with `eosBreathOwn(null)`. Beat games use `eosPacerBeat(bpm)`. Optional: `eosApi("dots").pulse?.("in"|"out")` and `gather?.()`; a `gather` re-flows after 1.7 s unless the game has finished.
- **Rewards:** `eosSetPref("dust", style)`; the change shows within about 250 ms.
- **Mood:** the flip words can rise from the measured `.eosCore` centre.
- **My CSS also changes arcade surfaces** (no effect on interaction):
  - `.releaseIdleStage` loses its opaque base layer, and the idle `.ts-abyss-*` centre is opened.
  - `.releaseCompleteOverlay` is lighter: 52% black and a 2 px blur instead of 82% and 15 px, so the bloom and glow show in the reveal. This changes the look of the classic reveal.
  - `.infinityField` is hidden.

**Tests**
- Builds: the isolated build, the integrated build at `/tmp/eos_dots`, and a build together with the readability module all compile. There are no name clashes.
- In the integrated build at both sizes: acceptance checks 1–9 pass, plus pulse in/out, rate following progress, gather, beat, dust styles, colour script and a live resize to phone width.
- No long tasks were recorded in the input, play or reveal windows.
- Test scripts are in `/tmp/eos_dots_t` (`accept.mjs`, `extra.mjs`, `pacer.mjs`); results are in `final_*.txt`.

**Screenshots** (in `/home/user/thinkstill-rituals/framer/dev/shots/eos/`, both sizes)
- Home and check-in: `dots_input_*`, `dots_emotion_*`, `dots_core_colour_script_1280.png`.
- Play: `dots_play_{pop,crush,burn,rain_out,hot_potato,black_hole,send_to_space,cleanse,p0,p85}_*`.
- Finish and reveal: `dots_finish_sequence_390.png`, `dots_reveal_*`, `dots_reveal_burst_*`.
- Modes: `dots_spark_*`, `dots_numb_grey_to_colour_1280.png`, `dots_reduce_*`, `dots_calm_*`.
- Dust styles: `dots_style_*`.

**Known limitations**
- **Main-thread dust:** the Pixar motes and cinema dust move by `left/top`, as §5.3 specifies (about 21–28 small dots, updated on the main thread every frame). A transform-based version is possible if low-end phones need it.
- **Long tasks during a full game:** headless software rendering is slow and noisy here (another builder's browsers share the 4 cores). Over a full POP run, the dots build showed more long tasks than a no-dots build. The dots' own work averages about 3 ms, with one forced style read of 20–35 ms when the dust gathers at the finish.
- **Core colour in play:** each game's own cyan centre glows wash out the core's colour during play. It reads clearly on the home screen, at the finish bloom and in the reveal.
- **Games 111 and 114 not tested:** their files don't exist yet, so dust visibility there (listed in §5.4) still needs checking at integration.