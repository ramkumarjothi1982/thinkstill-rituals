# Pilot A addendum: the Emotional Shift redesign of POP, CLEANSE and CRUSH

**Status:** binding for the Pilot A builders from 2026-10-09. Where this file and `PILOT_A_SPEC.md` disagree, this file wins. The founder's own newer words win over both.

**Sources:**
- `CREATIVE_STANDARDS.md`, last section "Emotional Shift Standard": the beats Mirror → Release → Transform → Payoff;
- FEEDBACK_LOG F6, F7/C2, F8 and F9;
- CINEMATIC_REDESIGN_DIRECTIVE §3–§10 and the §14 questions.

**Evidence reviewed:**
- the build reports `status/game-pop.build.md` and `status/game-cleanse.build.md`, and the CRUSH notes in `status/game-crush.progress.md`;
- the after sheets `game-pop.after.jpg` and `game-cleanse.after_390.png`;
- the before sheets `dev/shots/quality/sheets/{1,109,2}.png`;
- spec §2 S2 and §3.3;
- the code at `00_arcade.jsx` `wrappedDone` (L18961 legacy, L20140 GameEngine), `RewardSurgeBurst` (L19550), `16_eos_bubble_face.jsx`, `30_eos_arrows.jsx`, `14_eos_mood.jsx`, `71_pilot_fx.jsx` S2 and `70_pilot_core.jsx`.

**This addendum supersedes:**
- spec S2's hand-off model, where the peak lands on `onDone` and the afterglow and tableau play after it;
- critique fix CR-2 ("land the peak on the hand-off");
- the "≤ 5 s last input → reveal" budget;
- POP's faceless bubbles;
- CLEANSE's word under the orb;
- CRUSH's word on the anvil tag and its half-visible peeking blob.

---

## Findings that drive the redesign (verified in code and on the sheets)

1. **The approved burst gets painted over.** At `onDone` the wrapper's `wrappedDone` mounts `RewardSurgeBurst mega` and plays win × 3. The burst holds for `finishHoldMs`:
   - **POP and CRUSH** (GameEngineLegacy): max(2050, 3000) = **3000 ms**;
   - **CLEANSE** (GameEngine): max(4000, 3000) = **4000 ms**.

   Today the pilots start their afterglow beats on that same frame, under the burst:
   - **POP:** sitting cross-legged, rainbow glints, the grade from 0.7 to 1.0, the win-face swap;
   - **CLEANSE:** sway, fireflies, the grade.

   The shared mood "flip bloom" words (`.eosMoodFlip`: "slow / right here / safe") also draw on top. They are visible in POP `390_fin3000` and in CLEANSE `F390_f1300`.
2. **Every `p.sfx(kind)` that is not "soft" mounts a step burst.** The trigger is `triggerStepReward` in `wrappedSfx`. The step burst lasts **980 ms** in the legacy engine and **3200 ms** in GameEngine.
   - So a `p.sfx` call on the last word, or during the climax, lays a step burst over the climax.
   - In the baseline, that last step burst was replaced on the same frame by the mega burst, so the founder never saw it. Skipping it changes nothing the founder approved.
3. **No pilot game uses the F8 resolver.** All three use `eosPilotFaceSrc` and take a snapshot of the uploads at mount, so removing uploads never restores the defaults.
   - The shared DOM pass gives faces out by *visible-host order* (`slot = idx++`). When a bubble pops, every later bubble's picture shifts by one, so pilot objects must pin their slots.
4. **The shared face text is capped at 15 px.** The formula is `fs = clamp(9, 15, D·0.13)`. The pilot rule of "16 px / 800" therefore gives way to the shared component (15 px / 900). This still clears the 12 px readability floor.
5. **The arrows use explicit markers first.** `[data-eos-target="1"]` wins over the table rows for ids 1, 2 and 109. The gestures available include `tap`, `taps`, `hold`, `holdRelease` and `wait`.

---

## §Shared: changes to `71_pilot_fx.jsx` and `70_pilot_core.jsx` (pilot files only; `src/eos` is not edited)

**Ownership:**
- The first game builder (POP) lands everything in this section before redesigning its game.
- The CLEANSE and CRUSH builders run `git pull` and grep `71_pilot_fx.jsx` for each name (`useEosPilotBreath`, `EosPilotFace`, `EOS_PILOT_MIRROR`, `eosPilotFaceVars`) and reuse what is there.
- If a name is missing, they add it to 71 once. They never redefine it in their own file, because the concatenated build would fail on a duplicate top-level name.
- After any change to 71, the builder rebuilds and plays all three pilot games.

### S2′ The finale sequencer: climax, then a clean hand-off to the approved burst

| Rule | Value |
|---|---|
| T0 | The final action's `event.timeStamp`. For POP that is the pointerup of the last pop; for CLEANSE, the let-go of the hero orb; for CRUSH, the release of the charged slam. |
| Climax start | The `climax` beat runs at T0 + 0. Its first WAAPI frame comes in the same handler. Budget: **≤ 300 ms** from input to the first painted climax frame. |
| Beats | Free ids in the form `{id, at, run}`. Every beat must end by **`settleAt = handoffMs − 150`**. In dev builds, S2 warns and clamps any beat whose `at + dur` passes `settleAt`. The `afterglow` and `tableau` beats after the hand-off are **removed**. |
| `handoffMs` | POP **2150**, CLEANSE **2350**, CRUSH **2250**. Reduced motion: **900** for all three. `EOS_PILOT_HANDOFF_MS` becomes a per-game config. |
| Settle (`settleAt`) | (1) `eosPilotAnimSkip(beatAnims)` commits every end state. (2) `data-eos-pilot-hold="1"` on the arena: CSS sets `animation-play-state: paused` on every descendant, and the engine's idle WAAPI set is `.pause()`d. The scene becomes **a still painting** behind the burst, and the burst gets the whole frame budget. (3) The S4 cut: timed cues after `settleAt` are cancelled, and every climax pad's gain has reached 0 by `settleAt`, which leaves ≥ 80 ms of silence before the wrapper's win × 3, so no sound plays twice. |
| Hand-off (`handoffMs`) | (1) `data-eos-pilot-burst="1"` on `.tsArcade`. It is removed on reveal or unmount. (2) `live.onDone(bonus)`, which lets the wrapper mount the approved mega burst unchanged. (3) `live.onProgress(100, label)`. (4) The S6.9 reveal afterglow attribute; this only paints on `.stage-reveal`, which is verified. **No other visual change in the arena.** The hero's win face is shown inside the climax, not at the hand-off. |
| No `p.sfx` after the last input | The final word reports `onProgress(96)` **without** `p.sfx("pop")`. Climax sound uses S4 tones only. Between T0 and the hand-off, the engine calls **zero** `p.sfx` (see finding 2). |
| Over-burst suppression (pilot CSS, `70_pilot_core`) | `${EOS_A}[data-eos-pilot-burst] .eosMoodFlip{visibility:hidden!important}`. The guide strip does not change during the burst; MIND BEND switches at reveal. This rule is a guard. The parallel release-regressions batch (R1–R8, "EOS layers off the approved bursts") is meant to fix the overlay for every game; once it lands, the rule changes nothing. Re-check with A5 either way. |
| Skip | Unchanged. From T0 + 800, a tap commits the settled end states and hands off at once. Before T0 + 800, a tap plays the game's small finale-tap effect. |
| Log | `__eos.pilot.finaleLog = [{beat, t}]`, plus `inputT`, `settleT`, `handoffT` and `megaMountT` (from a MutationObserver), for test A4/A5. |

**Last input → reveal:**
- POP 2.15 + 3.0 = **5.15 s**;
- CRUSH 2.25 + 3.0 = **5.25 s**;
- CLEANSE 2.35 + 4.0 = **6.35 s**.

These replace the old 5 s budget, which predates the founder decision (C2).

### S7 Mirror presets (`EOS_PILOT_MIRROR`), one per emotion and read by every kit

Emotion ids come from `eosDetectEmotion` and `EOS_EMO`. Overthinking maps to `anxious` with tangled variants. Overwhelm maps to `panic` with crowded variants. Anything else maps to `sad`-lite ("heavy").

| Key | panic (SYNC) | anger (RUSH) | sad (DROP) | anxious (GLITCH) |
|---|---|---|---|---|
| Weather word | jittery / tight | stormy / hot | foggy / heavy | buzzing |
| Tint hue, saturation, light | 250°, .55, .55 (cold lilac-cyan) | 12°, .80, .45 (bruised red-orange) | 215°, .25, .35 (grey-blue) | 285°, .50, .50 (violet with static) |
| Vignette inset `--m-tight` | 14% | 10% | 6% plus a fog layer at .7 | 8% |
| Object motion | tremble 1.5 px at 9 Hz | a shove impulse every 1.6 s (bump plus squash) | sag: +6% gravity, a slow drip | restless figure-8 drift of 3 px, darting motes (6) |
| Breath period (start → calm) | 1400 → 4000 ms | 2000 → 4000 | 3800 → 4000 (the shift comes from warmth and lift, not slowing) | 1800 → 4000 |
| Sound bed (S4 tones, logged) | heartbeat 108 → 66 bpm, plus 220/223 Hz beating → 220/220.5 | 55 Hz rumble swelling at 0.5 Hz, low-pass 300 → 800 | rain hiss (band-pass 1.2 kHz) plus a minor-third pad that turns major at 67% | 2.4 kHz shimmer with 7 Hz tremolo, fading to off |
| Reduced motion | colour, fog and faces only; no tremble, shove, darting or flicker | same | same | same |

Flicker is limited to ≤ 4% opacity at < 3 Hz. There is no strobe and no constant shake.

**The Mirror beat (shared clock, 0 → 2000 ms after mount, the same in all three games):**

| Time (ms) | What happens |
|---|---|
| 0–300 | The scene opens **already in the emotion's weather**. There is no neutral first frame. |
| 300–900 | The user's objects arrive with **their own words and pictures** (F8 negative faces), staggered 90 ms. |
| 600–1400 | **Hero take:** the hero acts out the feeling (see each game's table). Its eyes follow each object as it arrives, and it reacts to that word's own detected emotion (a flinch at "boss yelled", a droop at "alone"). At about 1300 it looks into the camera and gives one small nod: "I know". |
| ≥ 1400 | The first marker goes live. Targets are live from 300 ms, and the **first pointerdown starts a WAAPI response in the same handler** (target < 100 ms). |

There is no text apart from the user's words.

### S8 Breath clock (`useEosPilotBreath(mirror, progress)`)

- It writes `--eos-breath-ms` on the stage root and exposes `breath.phase()` in [0, 1). The exhale is phase ≥ 0.45.
- Its period is `lerp(mirror.breath0, 4000, p)`. It is retimed only at a cycle boundary (the iteration event) so loops never jump.
- Every idle loop locks its phase to the hero's breath: sways, ripples, lamp hum, bubble rims.
- **Hypnotic rule:** the world breathes, the breathing slows as the player progresses, and the player entrains to it without being told.

### S9 Transform driver (`stage.shift(p)`)

- One function maps progress to the world. It cross-fades two layer sets per kit, the **mirror set** at opacity `1 − s` and the **calm set** at `s`, plus per-element transforms. Each input tweens over 600 ms.
- The world changes **on every release**, not in steps at 34 and 67. Each game names the anchor states at 0, 34, 67 and 100 below.
- The hero's face steps (loud → soft → calm → win) are driven by the same `p`.
- There are no filter or `backdrop-filter` animations and no clip-path animations. Opacity and transform only.

### S10 F8 faces for pilot objects: `EosPilotFace` (shared resolver, shared markup, pinned slot)

```
pics   = tsBubbleFaceSources({ game: p.game, entries: p.entries,
           uploads: p.hasUserImages ? p.imageSources || [] : [],   // read every render, never a mount snapshot
           progress: pilotPct, count: 6, seed })
relief = tsBubbleFaceSources({ ...same, progress: 100 })           // the slot's positive variant, for its release moment
<div className="… tsNoBubbleFace" data-eos-pilot-face="1" data-ts-bubble-index={slot}>   // host = the emotional object
  <ts-face className={upload ? "tsFaceUpload" : released || pos ? "tsFacePos" : "tsFaceNeg"} style={eosPilotFaceVars(D, word)} aria-hidden>
    <ts-face-pic><img className="tsBubbleFaceImg" src={…} onLoad={e => tsFaceInscribe(e.currentTarget)} /></ts-face-pic>
    <ts-face-text className="tsBubbleFaceText">{word}</ts-face-text>
  </ts-face>
</div>
```

- **Shared parts, reused as they are:**
  - the resolver (defaults by emotion and progress, the six-image upload rule, removal restoring the defaults);
  - the `TS_BUBBLE_FACE_CSS` look (true circle, contained image, light glass ring, no dark plate);
  - `tsFaceInscribe`, so photos sit wholly inside the circle.
- **Pilot-specific parts:**
  - **The slot is pinned** to the object's index, so pictures never jump when a neighbour is released.
  - **The object's release moment** swaps in its positive variant, `relief[slot]`. This is the F8 "negative → positive" rule and the Transform beat, inside the object.
- `eosPilotFaceVars(D, word)` mirrors the shared sizing exactly: `fs = clamp(9, 15, 0.13·D)`, the picture is ≤ 0.56·D, and the text width is 0.8·D. Request to the F8 owner: export `tsFaceVars()` so both call the same function.
- `.tsNoBubbleFace` keeps the wrapper's DOM pass from adding a second face.
- React 18 maps `className` to `class` on the custom elements.
- The engine already receives `imageSources` and `hasUserImages`: the wrapper's `ep` spreads `p`.
- Sizes: emotional objects are **D ≥ 100 px at 390**, so the text is 13–15 px and the picture 56–70 px.
- Released objects that stay on screen as cast members (CRUSH gallery, cleared CLEANSE orbs) keep the picture. Whether they keep the word is set per game below.
- Check that the slot keeps its character between `progress` 0 and 100 (the same `<char>_E` prefix). If it does not, raise it with the F8 owner. Do not patch around it.
- Test: `dev/f8_probe.mjs` must count `[data-eos-pilot-face]` hosts. If the probe skips `.tsNoBubbleFace`, extend its selector (a dev file).

### S5′ Arrows: one live marker per stage, with no gaps

- Use `eosPilotMarker(spec, live)` on the real target. While input is expected, exactly one marker is live.
- In a hands-off stage (CLEANSE exhale), use a `wait` marker on the object that is acting.
- In no-input windows (round hand-overs ≤ 700 ms, the climax), no marker is shown. S2 strips every marker at T0.
- Each game lists its stages below. `dev/f6_probe.mjs` checks each one at 390 and at 1280.

### S11 Replay variation and discoveries

- `seed = hash(entries) ^ runIndex`. `runIndex` comes from `localStorage eos_pilot_runs_<id>`, wrapped in try/catch; an empty store simply means run 0.
- Each game rolls its arrangement, reaction pool, one surprise from a pool (never the same as last run) and a climax end-pose variant.
- Rare events (1 in 5 or 6) are discoveries, never rewards that someone can lose. There are **no streaks, timers, counters or guilt copy**.

### Shared acceptance (run at 390×844, then at 1280×860; headless timing uses Playwright's fake clock and is confirmed on a real phone for the package)

| # | Check |
|---|---|
| A1 F8 | `f8_probe`: 0 objects without a picture. The text rectangle lies inside the host circle. Uploads 1–6 give AAAAAA, ABABAB, ABCABC, ABCDAB, ABCDEA, ABCDEF. Removing the uploads restores the defaults. Faces start negative and are all positive at the climax. |
| A2 Mirror | Frames at 1.8 s for panic, anger, sad and anxious inputs are pairwise distinct (mean colour of the sky or water region ΔE ≥ 12), and the user's words are visible inside the objects. |
| A3 Transform | The arena background at 0% vs 96% differs by ΔE ≥ 20, and the hero's face goes loud → calm. |
| A4 Climax | `climaxT − inputT ≤ 300`, every beat ends ≤ `settleAt`, and `handoffT − inputT` equals the game's `handoffMs` ± 50. |
| A5 Burst clean | While `.tsRewardSurge.mega` is mounted: the arena's `getAnimations({subtree:true})` has 0 running; no `.eosMoodFlip` is visible; no S4 pilot row falls inside [handoffT, unmount]; no `.tsRewardSurge.step` mounts after T0. |
| A6 Arrows | `f6_probe` shows the listed stages with 0 misses and 0 label mismatches. |
| A7 Touch | The first pointerdown starts its WAAPI animation in the handler (perf log), with ≤ 100 ms to the paint on a real phone. |
| A8 Switch | With `?pilot=off`, all three originals play to the reveal. |

---

## §POP (id 1): "Balloon Morning", rebuilt around *your thoughts pulling you apart*

**Premise in 2 s:** the hero stands on a cloud, its fists full of strings. Each string holds a thought bubble showing your words and a worried face, and the bubbles tug it in six directions. Pop them and it gets lighter. Once it is free, it blows its own bubble of calm.

### Verdict per beat

| Beat | Verdict | Reason |
|---|---|---|
| Mirror | **Rebuild** | The same pastel lilac plays for every emotion, so the world does not "get" panic or anger. The bubbles are empty film. The hero cries, but the world is calm. |
| Release | **Strengthen** | Keep the tethered holder, the droplets, the tether snap-back, the reaction pool, the chains and the miss handling: this is the best core in Pilot A. Missing: press-stretch-burst tension (Directive §4), a breath rhythm, and pictures (F8). |
| Surprise | **Rebuild** | The current "you do it" look and the anticipation gag are acting, not surprise. |
| Transform | **Strengthen** | Haze → blue → rays is right, but it starts from the same lilac for everyone and moves in steps. Add weight: the hero is pulled less after each pop. |
| Payoff | **Strengthen and re-time** | The Calm Bubble is the right poetic image: the bubbles that pulled you become the one that holds you. But its peak and afterglow sit on and over the burst. The hero should *blow* the bubble (comic and shareable), and everything ends by 2150. |
| F8 | **Rebuild** | There are no pictures today, and with uploads the word sits under the bubble. |

### Storyboard, 0 s → burst

| Time | Beat | What the player sees |
|---|---|---|
| 0–300 | Mirror | The sky is already in the emotion's weather (table below). The hero is on its cloud, fists up, strings taut. |
| 300–900 | Mirror | 5–6 bubbles inflate out of the hero's fists one by one, each with the user's word and a negative picture. Each inflation gives the hero a small tug. |
| 600–1400 | Mirror | The hero's take. Its eyes follow each bubble, and at 1300 it looks into the camera and nods. |
| ≥ 1400 | Release | The marker goes live on the nearest lower bubble. Play runs 20–45 s. |
| about 50% | Surprise | One surprise from the pool. |
| Last pop | T0 | The climax (shot list below). |
| T0 + 2150 | Hand-off | `onDone`, then the approved burst for 3.0 s, then the reveal. |

**Mirror variants**

| | panic | anger | sad | anxious |
|---|---|---|---|---|
| Sky | cold lilac-cyan haze; clouds racing at 2× | maroon-orange smog; a low red sun smouldering; heat shimmer on the horizon | grey fog bank; 8 drizzle streaks; no sun | violet dusk; 6 static motes darting; light flicker ≤ 4% |
| Bubbles | tremble; strings twang | jostle and shove each other (bump and squash) | hang heavy, sag below the fists, drip | small restless figure-8s; strings cross and tangle |
| Hero take | fast shallow breaths (0.7 s); eyes dart; clutches the strings to its chest | stamps; 2 steam puffs from the head; yanks the strings | slumped, looks down; a tear plinks on the cloud | bites its nails; glances left and right; flinches at a twang |
| Pop feel | crisp and airy, high pentatonic | heavy: shock ring × 1.4, a 70 Hz thud, droplets fly 1.3× further | soft and warm: each pop punches a hole in the fog and **a sun shaft lands on the hero** | snappy: each pop silences one buzzing mote |

**Release: one pop**

| Time | Bubble | Hero and cast | World | Sound |
|---|---|---|---|---|
| pointerdown, 0 | It dimples toward the finger: scale (1.07, .93) along the touch axis over 40 ms. The picture squishes to .92 and the string goes taut. | The hero lurches 3 px toward it, and its eyes snap to it. | — | `stretch` creak, 300 → 420 Hz |
| held, 0–220 | It bulges toward the finger up to 1.12, the iridescence spins 3× faster, and the face strains (brace). | The hero braces and leans away. The neighbours lean away. | — | rising squeak |
| pointerup, or auto at 220 | **POP.** A tear seam opens from the touch point in 30 ms, then 10 droplets fly on gravity arcs and a shock ring spreads. **The picture flips to its positive variant (`relief[slot]`) and floats up 46 px, smiling, as it fades over 700 ms: the freed feeling waves goodbye.** The word breaks into 3–4 glyph shards that drift up. | The hero lurches away from the popped side, scaled to the bubble's size, and plays a reaction from the pool with no repeated pairs. The nearest 2 bubbles swing on their strings. | One droplet hangs in the air for the climax. `stage.shift(p)` tweens. | pop tone layers, plus `p.sfx("pop")` (but not on the last bubble) |
| +120 | Droplets that hit a neighbour make its face blink. If progress has crossed its slot, it flips to positive with a squash: **the calm spreads by contact.** | — | — | plink |
| **Breath pop** (not required) | A pop released during the hero's **exhale** (the rims glow softly once per breath) turns its droplets into sparkles. | The hero blows out a visible puff ring. | — | the next chime up the ladder |
| Chain ≤ 600 ms | Keep the giggle-and-laugh ladder. | | | |
| Miss | Keep: a head shake or tilt, and the nearest bubble wobbles toward the hero. It is never a fail. | | | |

**Surprise pool** (one per run by seed, never the same as last run):
- **Sneeze chain.** At about 50%, a stray droplet lands on the hero's nose. It sneezes and the nearest bubble pops by itself, a double pop, with a giggle and a guilty glance at the camera. It counts as progress and is logged `action:"sneeze"`.
- **Dodger.** The next-to-last bubble dodges the first tap with a cheeky face. The hero grabs its string and holds it out to you ("go on").
- **Bird peck.** A bird lands on a string and pecks; the bubble pops and the hero laughs.
- **Rare, 1 in 6: Golden film.** One bubble shimmers gold. Popping it sends a sun shaft early that warms the hero's cheeks pink for the rest of the run.

**Transform map**

| p | Sky and light | Bubbles | Hero | Sound |
|---|---|---|---|---|
| 0 | The full Mirror preset. | All negative; full tremble, shove or sag. | Loud face, pulled, short breaths. | The full bed. |
| 34 | The haze lifts off the sun and the light rises 30%. Anger: the smog goes amber. Sad: fog at 60% and the first sun shafts. Anxious: 3 motes left. | 2 faces positive; motion at 50%. | Soft face, stance wider, breath 2.4 s. | Heartbeat 90; bed −6 dB. |
| 67 | 70% blue, sun rays fan out, birds appear; drizzle and smog are gone. | A gentle sway only. | Calm face; hums a 3-note motif; breath 3.4 s. | The pad turns major. |
| 100 | A clear morning and a rainbow (climax). | — | Win face, inside its own bubble. | Climax cues. |

**Climax: "Calm Bubble"** (T0 = the last pop's pointerup; ends before `onDone` at 2150)

| T0 + (ms) | Shot | Sound |
|---|---|---|
| 0–250 | **Time-freeze.** The last bubble tears at 2.5× slow motion. Its droplets, and every droplet left hanging since earlier pops, freeze and glint in one wave from left to right. | reverse shimmer swell |
| 250–700 | **Gather.** The droplets stream on curved paths into the hero's cupped hands (staggered 20 ms) and form a glowing water pearl. Face: wow → grin. | ≤ 6 rising pentatonic plinks |
| 700–1150 | **The blow** (the shareable gag). The hero puffs its cheeks (pfff face) in 3 squash pumps; the 2nd nearly fizzles with a little wobble and a sheepish glance. Then it blows: an iridescent film inflates from its hands around the hero and its cloud (196 px at 390, 260 at 1280, ease-out-back). | a breathy "fwoomp" (noise 400 → 1200 Hz) |
| 1150–1550 | **Lift and refract.** The bubble bobs up 24 px off the cloud. The sunbeam strikes it and the rim flashes once (no strobe). A 7-band rainbow arch unfurls across the sky from the bubble (scaleX 0 → 1, 400 ms). | a glass chime and a rising pad |
| 1550–1950 | **Pose.** The hero presses both palms to the film and beams at the camera (win face). The pose varies with the seed: wave, thumbs-up, or lies back floating. Two birds loop once around the bubble. | the pad sustains, then reaches 0 by 2000 |
| 1950–2150 | **Settle.** Everything freezes, then 80 ms of silence. | — |
| 2150 | `onDone`, and the approved burst plays over the still picture. | wrapper's win × 3 |

**Reduced motion:** cross-fades only. At 0 the droplets fade; at 300 the hero holds the pearl; at 600 the bubble and rainbow are in place; at 900, the hand-off.

**What varies on replay:**
- 3 bubble layouts (fan, crown, ladder) and 3 cloud formations;
- the 8-reaction pool;
- the surprise pool, plus the rare golden film;
- 3 end poses;
- whether the birds appear;
- the climax pearl's tint, taken from the emotion.

### F8 picture placement

- Every bubble is D ≥ 100 px at 390 (≥ 112 at 1280) and uses `EosPilotFace`: the picture in the upper half, the word below it, **inside the film**.
- The film stays clear, with only an iridescent rim. There is no plate and no dark mask.
- Each bubble has a pinned slot; uploads take the picture's place.
- When a bubble pops, its positive picture rises out. The picture and word never separate while the bubble exists.
- **≥ 5 bubbles:**
  - if the user's text gives fewer than 5 chunks, split the chunks into single words (stop tokens excluded);
  - if there are still fewer than 5, add picture-only "feeling bubbles" labelled with the detected emotion noun from the user's text (for example "panic").
- The hero is the session character (actor rig), not an emotional object.
- SYNC's calm face (E90) is a sleeping moon, which reads as night in a daytime sky. The systems owner picks an awake calm face for the `sky` kit.

### Arrow targets per stage

| Stage | Target | Marker |
|---|---|---|
| Play, from 1.4 s, re-shown after 2.2 s idle | the live lower-row bubble nearest the last tap | `{g:"tap", label:"POP IT!"}` |
| Dodger (if rolled) | the dodging bubble, followed after the dodge | `{g:"tap", label:"POP IT!"}` |
| Climax and burst | none (input is not needed) | stripped at T0 |

### What makes it unlike every other ThinkStill game

- It is the only game where **the thoughts are physically attached to the character**. Each pop changes the hero's body (pull, stance, breath).
- Press-stretch-burst film, with **the freed face rising out smiling**.
- Calm spreads from bubble to bubble by droplet contact.
- A breath-synced bonus.
- It is set in daylight.
- The hero **blows its own bubble of calm**.
- Compared with 41 UNHOOK (strings cut, objects rise): POP's strings stay in the hero's hands, and the objects burst.

### §14 for POP

1. **Would someone play it for fun?** Yes. Press-stretch-burst film, a tugging character and chain giggles work as a toy.
2. **Interactive rather than tap-triggered?** Yes. The press depth, release timing, breath pops and chains all change the result.
3. **Is the world alive?** Yes. The weather mirrors the user, the sky breathes, birds arrive, and the calm spreads.
4. **Are the characters memorable?** Yes. A take for each emotion, a sneeze, the sheepish failed puff, and the bubble blow.
5. **Is there a surprise?** Yes. A pool of 4, with a rare gold film.
6. **Is the finale extraordinary?** Yes. Time-freeze, gather, the hero blowing its own bubble, and the rainbow.
7. **A credible release?** Yes. Your words leave as smiling faces; the pace slows to an exhale.
8. **Would players replay it?** Yes. Layouts, surprises and poses change between runs.
9. **Premium-looking?** Yes, if the film materials and slow-motion read at 60 fps on a phone. That is the risk to verify.
10. **Worth showing a friend?** Yes. The puffed-cheek blow and the rainbow make a 2-second clip.

---

## §CLEANSE (id 109): "Moon Pool", rebuilt as *your fog becomes stars*

**Premise in 2 s:** your thoughts float in a moonlit pool as fogged glass orbs, each with a worried face and your words inside. Hold one and breathe in with it: clear water rises inside. Let go and breathe out: its murk pours into the pool **and rises into the sky as stars.** Your released thoughts become the night sky.

### Verdict per beat

| Beat | Verdict | Reason |
|---|---|---|
| Mirror | **Rebuild** | The same dark violet plays for every emotion. The 60 px orbs read as stickers, and the water does not read as water. There is no hero take. |
| Release | **Strengthen** | Keep the hold → breath-in → let-go → breath-out core and the sympathetic breathing of the cast; it is the right exhale mechanic for panic and anxiety. But the orbs are too small, the clearing is invisible at phone size, and the exhale is passive. |
| Surprise | **Rebuild** | Only the "deep clear" flower exists. |
| Transform | **Strengthen** | The map from murk, ripples and petals is too subtle. **The ink becomes stars**, so the change is visible and comes from the player's own words. |
| Payoff | **Strengthen and re-time** | Keep the lotus opening and the STILL forehead touch. Today the peak lands on `onDone`, and fireflies, the sway and the grade play over the burst. Move all of it before the hand-off, and add the mirror shot. |
| F8 | **Rebuild** | The word and the "hold to …" caption sit under the orb, outside it. |

### Storyboard, 0 s → burst

| Time | Beat | What the player sees |
|---|---|---|
| 0–300 | Mirror | The pool is already in the emotion's weather. |
| 300–900 | Mirror | The orbs surface one by one (bob up, drip), each with a negative picture and the word inside. |
| 600–1400 | Mirror | The hero's take: the hero is inside its own orb, front-centre. |
| ≥ 1400 | Release | A `hold` marker appears on the first orb. Each orb takes 5.0–6.6 s. N + 1 orbs give 30–45 s. |
| 34% | Surprise | The koi arrives. |
| Hero orb let-go | T0 | The climax. |
| T0 + 2350 | Hand-off | `onDone`, then the approved burst (4.0 s on this engine), then the reveal. |

**Mirror variants**

| | panic | anger | sad | anxious |
|---|---|---|---|---|
| Pool | choppy cross-ripples; orbs bob and clink together; the moon races behind clouds | steaming water with a red glow from below; orbs boil (bubble streams inside); far thunder glow (2 frames, never a strobe) | thick fog on the water; rain rings; orbs half-sunk and tilted; the moon hidden | water striders skitter (6 specks); static on the glass; fireflies darting |
| Hero take | pressed to the inside of its glass, breathing fast; the glass fogs with each breath | 2 thumps on the glass and a puff of steam | curled at the bottom of its orb, looking down | turns round and round inside, checking everything |
| Bed | heartbeat and choppy lapping | a low boil and rumble | rain and a slow minor pad | a high whine and insect clicks |

**Release: one orb**

| Time | Orb | Hero and cast | World | Sound |
|---|---|---|---|---|
| pointerdown, 0 | The glass flexes (scale .97 → 1 spring), the picture inside looks up, and the water-level meter starts at the base. | Every orb and the hero breathe in (scale 1.03). | A ripple ring spreads at the base. | a soft intake whoosh |
| **Inhale**: 2.6 s at the start, +0.15 s per clear, up to 3.4 s | Clear water rises from the bottom (`--hold-pct` is the water level). The murk is squeezed into a cloud at the top. The orb lifts 14 px out of the pool and drips. | The others breathe in with it. Cleared orbs watch. | The moon's reflection steadies under the orb. | a breath tone rising a fifth |
| Ready | A gold rim. The face holds its breath (cheeks), and the murk trembles at the top. | — | — | ready chime |
| **Let go → exhale**: 2.4 s, rising to 3.2 s | The orb sinks back with a squash. The murk pours out of the top as an ink plume that unfurls in the water. **Each ink curl then lifts out of the water as 4–6 points of light, which climb into the sky and settle as this thought's own small constellation, mirrored in the water.** The picture flips to its positive variant (`relief[slot]`) and the word sharpens from soft to crisp white. | Everyone breathes out. Cleared orbs drift a little toward the lotus. | One lotus petal loosens and glows; the murk layer drops by 1/N. | the next falling melody note (G pentatonic), then a star twinkle |
| Early let-go | The water drains and the face sighs (no caption). | — | — | a small sigh |
| Tap on the hero orb before its turn | It waves the player toward the next orb. | — | — | — |

**Surprise pool:**
- **Koi** (every run, colour by seed: gold, white-red or blue). At 34% a glowing koi glides under the orbs, circles the next orb to clear, and **leaps on a deep clear** (a held breath past 3 s), throwing up a water crown.
- **Frog cameo** (50%). A frog on a pad is startled by a boiling or buzzing orb and plops into the water. Later it watches from the lotus leaf.
- **Rare, 1 in 5: shooting star.** On a deep clear, a shooting star crosses the sky. The hero points at it (wow face). It lands in the lotus, and the lotus later opens with one gold petal.

**Transform map**

| p | Water | Sky | Orbs | Hero | Sound |
|---|---|---|---|---|---|
| 0 | Murk .8; choppy, boiling, fogged or buzzing (per preset). | 3 stars; moon veiled to 70% (sad: hidden). | All fogged and negative. | Loud; pressed to the glass. | The full bed. |
| 34 | Murk .55, ripples halved; the koi arrives. | About 10 stars (2 constellations) plus reflections; fog −40%; the moon half out. | 2 clear and positive. | Soft. | Heartbeat 88; the boil stops. |
| 67 | Glassy (ripples at 30%); a crisp reflection. | About 20 stars; the moon full; the moon path faint. | 4 clear. | Calm; palm pressed to the glass. | The pad turns major. |
| 100 | Mirror-still (climax). | Every constellation. | All clear. | Win. | Climax cues. |

**Climax: "Clearest Night"** (T0 = the let-go of the hero orb; ends before `onDone` at 2350)

| T0 + (ms) | Shot | Sound |
|---|---|---|
| 0–300 | **Last breath.** The hero orb's murk pours out *already as silver light*. One ripple ring sweeps the pool from edge to edge, the water goes glass-still, and every star snaps into a perfect mirror twin. | one long exhale tone |
| 300–800 | **Star river.** Every constellation the player made lifts from the sky *and* from its reflection and streams in two mirrored spirals onto the lotus. The moon path draws itself from the moon's reflection to the lotus. | ascending star chimes (≤ 6) |
| 800–1350 | **Bloom.** The lotus opens petal by petal (8 petals, 70 ms stagger), each petal catching a star. At 1300 its heart flares gold and becomes the key light, and the rims relight warm and low. | a lotus chord |
| 1350–1800 | **Meeting.** The hero orb's glass dissolves into light and the hero glides up the moon path. STILL wakes in the lotus (win face) and rises. They touch foreheads at 1700, and one gold ring spreads across the water. | a soft bell, then the pad |
| 1800–2200 | **The mirror shot** (shareable). The play plane eases 6% down so the reflection is centred: the hero, STILL, the lotus and the moon are perfectly doubled. All the cleared orbs turn toward them (positive faces). | the pad falls to 0 by 2200 |
| 2200–2350 | **Settle.** Everything freezes, then silence. | — |
| 2350 | `onDone`, and the approved burst plays. | wrapper's win × 3 |

**Reduced motion:** at 0 the pool is still; at 300 the stars are on the lotus; at 600 the lotus is open and the pair are together; at 900, the hand-off.

**What varies on replay:**
- the orb arrangement (arc, two rows or scattered pads);
- the constellation shape per word (5 shapes);
- the koi's colour, the frog (50%) and the shooting star (rare);
- STILL's greeting (forehead touch, nose boop or a slow spin together);
- the moon phase (full, gibbous or crescent).

### F8 picture placement

- **Layout at 390:**
  - 5 word orbs of D 112 (back row of 3 at y ≈ 330, front pair at y ≈ 500);
  - the hero orb, D 124, front-centre at y ≈ 540;
  - the lotus on the moon path at y ≈ 235;
  - the moon top-left, clear of the companion orb.
- **Layout at 1280:** orbs are D ≥ 128.
- The hero orb carries the emotion the user named, or else their first chunk, so every orb has picture and text.
- **Inside the glass** (`EosPilotFace`), stacked from the back:
  1. the back of the glass;
  2. the murk (mid-tone, never darker than about #3a3f5a at 70%, so it is never a black mask);
  3. the rising water;
  4. `ts-face` (picture above, word below);
  5. a front gloss (upper-left only, ≤ 30% opacity, never over the face).
- The "hold to …" captions under the orbs are **removed**; the arrow carries the instruction.
- Cleared orbs keep their positive picture **and** their word, now crisp. In CLEANSE the thought is cleaned, not destroyed.

### Arrow targets per stage

| Stage | Target | Marker |
|---|---|---|
| Inhale | the next uncleared orb | `{g:"hold", ms: inhaleMs, mvar:"--hold-pct", label:"HOLD · BREATHE IN"}` |
| Exhale (hands off, 2.4–3.2 s) | the exhaling orb | `{g:"wait", label:"BREATHE OUT…"}` with `data-eos-idle="10000"` |
| Hero's turn | the hero orb | `{g:"hold", ms: inhaleMs, mvar:"--hold-pct", label:"YOU NOW · BREATHE IN"}` |
| Climax and burst | none | stripped at T0 |

### What makes it unlike every other ThinkStill game

- It is the only game whose input is **your breath held on the object**, with no timing window.
- It is the only game where **the released material becomes something beautiful that stays**: your thoughts become your sky.
- It has a night water world with a perfect-mirror finale.
- Compared with 111 BIG SIGH (sky lift) and 114 (lantern dawn): there is no lift, no dawn and no lantern. The ending is a doubled image on still water.

### §14 for CLEANSE

1. **Would someone play it for fun?** Yes, as a calm toy. Watching your constellation form is the hook.
2. **Interactive rather than tap-triggered?** Yes. The hold length sets the clear (deep clear, early let-go), and the breath pace changes.
3. **Is the world alive?** Yes. Koi, frog, fireflies, a sympathetic cast, and a pool that responds.
4. **Are the characters memorable?** Yes. A take for each emotion inside the glass, the STILL meeting, and the frog.
5. **Is there a surprise?** Yes. The koi leap and the rare shooting star.
6. **Is the finale extraordinary?** Yes. A river of stars and the mirror shot.
7. **A credible release?** Strongly. This is the breath-paced exhale the standard asks for in panic and anxiety.
8. **Would players replay it?** Yes. New constellations, koi colours and greetings each run.
9. **Premium-looking?** Yes, if the glass and water read at phone size. That is the risk to verify at 112 px.
10. **Worth showing a friend?** Yes. The mirror shot is a striking still and clip.

---

## §CRUSH (id 2): "The Press", finished as *squeeze the heat out*

**Premise in 2 s:** a hydraulic press in a night workshop. Each thought rolls in as a red-hot jelly blob with your words and a furious face inside. Slam it, and the heat squirts out and it cools. Four slams and it pops back round, relieved, and goes to watch from the gallery. At the end you charge ONE BIG SLAM, and what is left is a small warm core that the hero holds like a hand-warmer.

The code status: `74_pilot_crush.jsx` (1475 lines) is a draft that has never been checked in a browser. Finish it against this addendum, keeping its zero-commit-per-tap skeleton and its play-box geometry.

### Verdict per beat

| Beat | Verdict | Reason |
|---|---|---|
| Mirror | **Strengthen** | The red beacon and sodium lamp read as anger only. CRUSH is also routed to other emotions, so it needs four variants, and the blobs must arrive mid-tantrum. |
| Release | **Strengthen** | The 4-slam press with a heavy window is the right anger discharge. Add **resistance** (the blob pushes the jaw back), **hit-stop**, and **tempo by emotion**, so panic and anxiety get slow, exhale-paced slams. |
| Surprise | **Rebuild** | There is nothing beyond gallery reactions. Add the bouncer, the gauge pop and the workshop cat. |
| Transform | **Keep** | Heat out and cooling, plus the beacon → lamp map, are clear. Add windows that go from smog to stars. |
| Payoff | **Strengthen and re-time** | Warm Core is true to the mechanic, but its peak sits on `onDone` and its afterglow plays over the burst. The big slam becomes a **charged hold-and-release**. |
| F8 | **Rebuild** | The word is on the anvil tag, outside the object, and the peeking blob is a cropped picture. |

### Storyboard, 0 s → burst

| Time | Beat | What the player sees |
|---|---|---|
| 0–300 | Mirror | The workshop is lit in the emotion's preset. |
| 300–900 | Mirror | Blob 1 tumbles out of the hatch onto the conveyor, rolls under the press and squashes to a stop, with its word and negative picture inside. The hatch rattles once for each blob still to come. |
| 600–1400 | Mirror | The blob's take (table below), then it glares at the jaw and then at the camera. |
| ≥ 1400 | Release | The `taps` marker goes live on the press mouth. N rounds of 4 slams take 35–60 s. |
| Round with the bouncer | Surprise | The bouncer, chosen by seed. |
| After round N | Set-up | The charged big slam. |
| Big slam release | T0 | The climax. |
| T0 + 2250 | Hand-off | `onDone`, then the approved burst (3.0 s), then the reveal. |

**Mirror variants**

| | anger | panic | sad | anxious |
|---|---|---|---|---|
| Workshop | furnace glow; red beacon spinning; the gauge needle rattles in the red; steam jets | alarm beacon at 2×; the conveyor stutters; the lamp buzzes | cold blue night; a pipe drips into a bucket (plink); the lamp flickers dim | a loose wire sparks (2 every 3 s); gauges twitch; a fan clatters |
| Blob take | red-hot and steaming; fists up; stomps on the conveyor | shivering and sweaty; eyes dart; bounces nervously | deflated and grey-blue; sags | fidgets and wobbles; peeks up at the jaw |
| Heavy window | 180–320 ms after the previous slam (fast pounding) | 600–900 ms (a slow press; the piston's exhale hiss fills the gap) | 400–700 ms (weighty) | 600–900 ms |
| Bed | furnace roar and a clank loop | a soft two-tone alarm and hiss | drip and a low hum | buzz and tick |

**Release: one slam** (zero React commits per tap, as in the draft)

| Time | Jaw | Blob | World | Sound |
|---|---|---|---|---|
| pointerdown, 0 | The count `n++` updates synchronously, and the jaw twitches up 4 px (anticipation). | It braces, hands up against the jaw, eyes squeezed shut. | — | hiss |
| 0–30 | The jaw drops (ease-in). | — | — | — |
| 30, impact | **Hit-stop:** 40 ms, or 70 ms on a heavy hit. Jaw and blob hold the impact frame. | It squashes to c = .22, .42, .60 on slams 1–3. **Resistance:** on slams 1–2 the blob pushes the jaw back up 10 px with a jelly rebound (it fights); on slam 3 it gives in. Its hue cools by a quarter, from red toward its calm hue. | Red-hot goo and steam squirt into the heat tray. The play plane shakes ±3 px (±6 on heavy) for 120 ms. The gallery winces. | thud and clank; heavy adds depth and a ring |
| 4th slam | SPLAT: the jaw holds down for 120 ms. | Pancake, a 10-drop goo ring, a relieved grin; the picture flips to `relief[slot]`. | An ember drops into the tray. `p.sfx("pop")` (not on round N), then `onProgress`. | splat |
| +350 | The jaw lifts. | It pops back round, rolls right and rides the wall lift up to its gallery slot. | The next blob tumbles out of the hatch. | boing and bell |
| Transition (≈ 700 ms) | Not counted: a twitch and a soft hiss. | | | |
| Miss | Keep: a curious tilt and a `clank`. | | | |

**Surprise pool:**
- **Bouncer** (one round per run, never round 1 or the hero's round). On slam 2 the blob squirts out sideways, ricochets off the wall with a cartoon boing, and lands back on the anvil, dizzy, with spiral eyes. The slam still counts, and the jaw waits for it.
- **Gauge pop** (light mastery, once per run). Three heavy hits in a row make the gauge needle spin; its glass pops off with a steam puff, and the gallery cheers.
- **Workshop cat** (a supporting character). It sleeps on the gantry. Heavy hits wake it: an ear twitch, then its head comes up and it glares at the player. In the climax it curls up by the core. **Rare, 1 in 6:** it swats the next blob out of the hatch.

**Transform map**

| p | Beacon and lamp | Windows | Steam and pipes | Incoming blobs |
|---|---|---|---|---|
| 0 | Red beacon spinning; harsh sodium lamp. | Smoggy orange night. | Leaking. | Loud. |
| 34 | Beacon at 50%; the lamp warms. | The smog thins; 2 stars. | Half. | Soft. |
| 67 | Beacon off; tungsten lamp. | A clear night with stars. | Stopped. | Calm-leaning. |
| 100 | The warm core's glow (climax). | Starry. | Relief puffs. | Gallery full and leaning in. |

**Big slam set-up** (from round N's pop-back + 350 to + 950):
- The hero, the last blob and the session character, hops off to its watch spot.
- The embers roll out of the tray onto the anvil and fuse into one red-hot mass.
- The gallery hops down to the conveyor.
- The lights dim, and the jaw rises extra high and quivers.

**Charged slam** (from + 950):
- **Pointerdown** starts the charge. The gauge climbs from 0 to 100% in 900 ms, and the jaw rises a notch every 300 ms. The hero covers its eyes and peeks; the gallery leans back.
- **Release** at any point after 150 ms is T0. A quick tap gives a 40% slam, which still plays the full climax.
- At 100% held a further 600 ms, the jaw slams by itself. With no input for 8 s, it also slams by itself (logged `auto:true`).

**Climax: "Warm Core"** (T0 = release; ends before `onDone` at 2250)

| T0 + (ms) | Shot | Sound |
|---|---|---|
| 0–60 | The jaw falls from its high hold. | hiss and a whoosh |
| 60–170 | **Impact and a 110 ms hit-stop.** The frame holds and the contact line glows white-hot. Then an 8 px shake over 160 ms (none with reduced motion). | 55 Hz boom with body and click; two-pulse haptic |
| 170–450 | 14 sparks fountain up. The gallery flinches, then cheers in a hop wave from left to right (40 ms stagger). The cat bolts upright. | sparks crackle |
| 450–1100 | The jaw lifts with a long hydraulic sigh. **A glowing amber cube** sits on the anvil. Three cracks light up at 600, 800 and 1000 ms, with light beams leaking out, and the cube trembles. | 3 crackles |
| 1100–1400 | **The cube splits like an egg.** The shell halves tip away left and right. The warm core floats inside: a small sun-coloured orb with a slow heartbeat glow. Warm rays flood the shop (a static conic, scale 0 → 1.4). | a warm swell |
| 1400–1800 | The core drifts toward the hero in an arc. The hero lunges and **fumbles it once** (a comic juggle, 2 hops), then cradles it like a hand-warmer: win face, eyes half-closed. | a juggle "bip-bip", then a soft hum |
| 1800–2100 | The core lights every face from below (0 → .6). The gallery leans in 6°. The cat curls up beside the hero and purrs. 3 steam vents give relief puffs. | a purr (26 Hz amplitude modulation on 120 Hz) that reaches 0 by 2100 |
| 2100–2250 | **Settle.** Everything freezes, then silence. | — |
| 2250 | `onDone`, and the approved burst plays. | wrapper's win × 3 |

**Reduced motion:**
- each slam is a plate flash plus a pip, and the heat stages cross-fade;
- **climax:** at 0 the mass becomes a cube; at 300 the cube opens; at 600 the core is in the hero's hands; at 900, the hand-off.

**What varies on replay:**
- the blob order and casting;
- the bouncer's round;
- the cat's perch and its rare swat;
- the gallery's reactions;
- 3 crack patterns on the cube;
- 3 catch poses (fumble, one-hand, header-bounce).

### F8 picture placement

- The blob is D 150 at 390 (180 at 1280). `EosPilotFace` sits inside the jelly: picture in the upper half, word below, **inside**.
- The jelly rim cross-fades from red to the calm hue around the face.
- The squash applies to the whole host, so picture and word squash and spring back together.
- The anvil plate shows **pips only** (4 pips, no word).
- **No peeking blob.** The next blob waits behind the hatch: rattle and light only. A cropped picture is not allowed.
- **The gallery:** finished blobs at 56 px show their positive picture only. *The word was squeezed out*; the released object carries no text. They are cast members, marked `.tsNoBubbleFace` and `data-eos-pilot-cast`, not emotional objects.
- Uploads: slot = round index.

### Arrow targets per stage

| Stage | Target | Marker |
|---|---|---|
| Slams (each round) | the press-mouth button | `{g:"taps", n:4, label:"CRUSH ×4"}` |
| Round hand-over and the bouncer's flight (≤ 700 ms) | none (not counted) | — |
| Big slam (from + 950) | the press-mouth button | `{g:"holdRelease", ms:900, meter:".eosPilotCrushGauge", mvar:"--charge", win:[60,100], label:"HOLD… SLAM!"}` |
| Climax and burst | none | stripped at T0 |

### What makes it unlike every other ThinkStill game

- It is the only game where **you cool a feeling by pressure**. The heat leaves visibly with every slam, and the object's colour is the meter.
- Its tempo changes with the emotion.
- There is an **audience of your past feelings**, plus a workshop cat.
- The finale is a charged slam that ends in warmth you can hold.
- Compared with 5 HAMMER (one timed swing), 13 SQUASH (a kitchen gem), and 3 CRACK and 11 PRESSURE POP (geode and boiler): CRUSH has a hydraulic line, rapid resisted slams, and a core that is cradled, not kept as a gem.

### §14 for CRUSH

1. **Would someone play it for fun?** Yes. Hit-stop, resistance and a heavy rhythm are arcade-grade.
2. **Interactive rather than tap-triggered?** Yes. Rhythm windows, resistance and the charge length all shape the result.
3. **Is the world alive?** Yes. Beacon, steam, the cat, the gallery and the cooling shop.
4. **Are the characters memorable?** Yes. Blobs fighting back, the dizzy bouncer, the glaring cat and the fumbled catch.
5. **Is there a surprise?** Yes. The bouncer, the gauge pop and the cat's swat.
6. **Is the finale extraordinary?** Yes. A hit-stop slam, the cube cracking like an egg, and a held core.
7. **A credible release?** Strongly for anger. Panic, anxiety and sadness get slower, weighty slams.
8. **Would players replay it?** Yes. Casting, surprises and catch poses vary.
9. **Premium-looking?** Yes, if the steel, jelly and goo materials hold at 60 fps. Risk: the draft's untested performance (≤ 40 animations).
10. **Worth showing a friend?** Yes. The hit-stop slam, the egg-crack and the fumbled catch make a clip.

---

## Build order and gates

1. **Shared work** in `71_pilot_fx.jsx` and `70_pilot_core.jsx`: S2′ (the hand-off, freeze, sound cut, `.eosMoodFlip` suppression and log), then S10 (`EosPilotFace`), S7 (Mirror), S8 (breath), S9 (shift) and the S5′ stage helper. Gate: run A4 and A5 on the current POP before any redesign work.
2. **POP rebuild**, then A1–A8 at 390 and 1280, then a private preview link to the founder.
3. **CLEANSE rebuild**, with the same gates.
4. **Finish CRUSH** from the draft, with the same gates.
5. **The approval package** (CREATIVE_STANDARDS "Pilot approval package"):
   - before/after sheets for each of the 4 emotions (a Mirror frame at 1.8 s, a 67% frame, a climax frame, and the burst frame showing nothing on top);
   - recordings;
   - sound-scheduling logs only (headless has no audio, so no claim that anything was heard);
   - known issues.

**Out of pilot scope; raise with the owners:**
- the mood bloom over `.tsRewardSurge.mega`, which affects all games (regression rows R1–R8);
- the "slower… nice" feedback bubble and the companion orb drawing over game objects;
- exporting `tsFaceVars()`;
- F8 faces that paint as empty rings in headless runs at 1280 (verify on a real desktop).
