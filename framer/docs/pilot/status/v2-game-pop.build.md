# v2 POP (id 1) "Balloon Morning": build report

**Builder:** game builder for POP, Pilot A v2 (from-scratch redesign).
**Date:** 2026-10-09.
**Spec:** `PILOT_A_ADDENDUM.md` §Shared and §POP, layered on `PILOT_A_SPEC.md` §3.1. The addendum carries the Emotional Shift Standard, F6, F7/C2, F8 and F9.
**Branch:** `claude/jolly-hopper-ognrxj`.

**Files:**
- `src/pilot/72_pilot_pop.jsx`: a full rewrite.
- `src/pilot/71_pilot_fx.jsx`: the shared systems from §Shared.
- `src/pilot/70_pilot_core.jsx`: the per-game hand-off config and the over-burst CSS.

The original game still plays with `?pilot=off`.

## What was built, beat by beat

### Mirror (0 to 2 s): the hero gets your feeling

**Weather from frame 0.**
- The scene opens in the emotion's weather; there is no neutral first frame. It comes from the S7 tint layer `.eosPilotL0m`, which uses the `EOS_PILOT_MIRROR` presets, plus POP's own weather props:

| Emotion | Weather |
|---|---|
| anger | maroon-orange smog, a low red sun smouldering, heat shimmer |
| panic | a cold lilac-to-cyan haze, cloud streaks racing at 2× |
| sad | a grey fog bank, 8 drizzle streaks, no sun |
| anxious | violet dusk, 6 darting motes, a light flicker of 4% or less at under 3 Hz |

- Overwhelm, overthinking and the "lite" families map as the addendum specifies.

**The bubbles arrive.**
- From 300 to 900 ms, 5 or 6 thought bubbles inflate out of the hero's fists, 90 ms apart.
- Each bubble shows the user's own word under an F8 negative picture, inside the film.
- Each inflation tugs the hero, and its eyes follow every bubble.

**The hero's take (600 to 1400 ms), one per family:**
- **panic:** clutches the strings, pants, eyes dart.
- **anger:** stamps twice, puffs steam, then yanks every string.
- **sad:** slumps, looks down, and a tear plinks onto the cloud.
- **anxious:** nibbles its nails, glances left and right, and flinches at a string's twang.

At 1300 ms it looks into the camera and nods ("I know").

**Input timing.**
- The marker goes live at 1400 ms. Targets are live earlier.
- The world breathes from the start (the S8 breath clock).
- The hero's name label is hidden, so the only text on screen is the user's words.

**Words rule.**
- Stop-only chunks are dropped.
- If fewer than 5 chunks remain, the text is split into single words with stop tokens removed.
- If there are still fewer than 5, picture-only "feeling bubbles" labelled with the emotion noun fill the gap (for example "anger").

### Release: premium game feel

**One pop: press, stretch, burst.**
- **Pointerdown:** the film dimples toward the finger in 40 ms, then bulges up to 1.12 along the touch axis. The picture squishes, the iridescence spins up, and the string goes taut.
- **Hero and neighbours on press:** the hero lurches 3 px toward the bubble, braces and leans away. The two nearest bubbles lean away.
- **Sound on press:** a creak plus a rising squeak.
- **Pointerup, or automatically at 220 ms:** a tear seam opens from the touch point, then the burst, 10 droplets and a shock ring. Anger gets a heavier hit: ring ×1.4, a 70 Hz thud and droplets ×1.3.
- **The freed feeling:** the picture flips to its positive relief variant, floats up 46 px, waves and fades over 700 ms. The word breaks into 3 or 4 glyph shards that drift up. One droplet stays hanging for the climax.

**Calm spreads by contact.**
- The two nearest bubbles swing.
- At +120 ms they blink, and faces past their share flip positive through the shared resolver.

**The hero performs on every input.**
- It lurches away, scaled to the bubble.
- It plays a reaction from an 8-entry pool, never the same pair twice in a row: spot, shake, glance, bounce, sigh, hop, tilt, blow.
- Chains of 3 and 5 or more get the giggle and laugh ladders.
- Crossing 34% or 67% gets a "phew" and step chimes. From 67% it hums a 3-note motif.
- A miss is never a fail: the hero shakes or tilts its head, and the nearest bubble wobbles toward it.

**Breath pop.**
- The bubble rims glow once per breath, on the exhale.
- A pop during that glow turns the droplets into gold sparkles, the hero blows a puff ring, and a chime climbs a ladder.

**Weather answers each pop.**
- **sad:** a hole opens in the fog and a sun shaft lands on the hero, accumulating with each pop.
- **anxious:** one mote goes quiet.
- **anger:** the smog shudders.

**Surprise pool.** One surprise per run, chosen by seed and never the same as the last run (`localStorage eos_pilot_last_1`):
- **Sneeze chain:** a stray droplet lands on the hero's nose, it sneezes, and the nearest bubble pops by itself. This is logged as `action:"sneeze"`.
- **Dodger:** the next-to-last bubble dodges the first tap with a cheeky positive face. The hero grabs its string and offers it ("go on"), and the marker follows.
- **Bird peck:** a bird lands on a string and pecks twice; the bubble pops and the hero laughs.
- **Golden film (rare, 1 in 6):** an early sun shaft, and blush cheeks for the rest of the run.

**Replay variation (S11).** The seed is `hash(entries) ^ run`, which selects:
- 3 layouts: fan, crown or ladder;
- the reaction pool order;
- the surprise;
- 3 end poses: wave, thumbs-up or floating;
- whether the birds appear;
- the pearl tint per emotion.

### Transform: visibly loud to calm

- `stage.shift(p)` (S9) tweens the world on every release over 600 ms. The mirror layer fades at 1 − s and the calm sky at s.
- Weather props fade on their own curves:
  - anger: the smog turns amber around 34%, then clears;
  - sad: the fog is at about 60% by 34% and the drizzle is gone by 67%;
  - anxious: the motes go.
- Sun rays and birds appear from about 60% to 67%.
- The bunch's tremble, shove, sag or drift motion scales with `--mot`, which runs from 1 down to 0 at 70%.
- The hero is pulled less after each pop: its stance widens and its tug sway shrinks.
- The hero's face steps from loud to soft to calm by progress. SYNC's calm face is overridden to an awake one (E61) for the daytime sky.
- The breath period lerps from the preset's `breath0` to 4000 ms (S8), so the world breathes more slowly.
- The sound bed eases:
  - the heartbeat slows from 108 to 66 bpm, with the beating pair settling;
  - the rumble and rain fade;
  - the minor-third pad turns major at 67%;
  - the shimmer goes off;
  - everything drops −6 dB from 34%.

### Payoff: the game's own "Calm Bubble" climax, then the approved burst

T0 is the last pop's pointerup.

| T0 + (ms) | Beat | What happens |
|---|---|---|
| 0–250 | **Time-freeze** | The last bubble tears at 2.5× slow motion. Its droplets and every droplet left hanging freeze and glint in one wave from left to right, under a light veil. Sound: a reverse swell. |
| 250–700 | **Gather** | The droplets stream on curved paths into the cupped hands and form a glowing pearl tinted by the emotion. The face goes wow, then grin. Sound: 6 rising plinks. |
| 700–1300 | **The blow** | Three puffed-cheek pumps; the second nearly fizzles, with a wobble and a sheepish glance at the camera. Then an iridescent film inflates from the hands around the hero and its cloud: 196 px at 390, 260 at 1280, ease-out-back. Sound: pump, fizzle, then the "fwoomp" of noise sweeping 400 to 1200 Hz. |
| 1150–1550 | **Lift and refract** | The bubble bobs up 24 px off the cloud and the sunbeam strikes it. The rim flashes once and a caustic sweeps through. A 7-band rainbow unfurls across the sky (scaleX 0 to 1), and the morning clears to 100. Sound: a glass chime and a rising pad. |
| 1550–1950 | **Pose** | The win face. Palms press to the film, then the seed's pose: wave, thumbs-up or lies back floating. Two birds loop once around the bubble. The pad ends by 1930. |
| 2000 | **Settle** (S2′) | Finite animations are committed, loops are paused, transitions are killed and timed sound is cut. The scene is a still painting. |
| 2150 | **Hand-off** | `onDone(bonus)`, then the wrapper's approved `RewardSurgeBurst` mega burst plays over the still scene for 3.0 s, then the reveal. |

**Reduced motion:** cross-fades only. The droplets fade at 0, the pearl at 300 and the bubble plus rainbow at 600; the hand-off is at 900.

## Shared systems landed in 71 and 70 (§Shared; CLEANSE and CRUSH reuse them by name)

### S2′ `useEosPilotFinale({settle: true})`

**Timing.** `EOS_PILOT_HANDOFF` is `{1: 2150, 109: 2350, 2: 2250}`; reduced motion uses 900. `settleAt` is the hand-off minus 150.

**Beat checks.** In dev, beats are warned about and clamped or dropped if they pass `settleAt`.

**The settle:**
- `eosPilotFreeze` finishes every finite animation and pauses every infinite one.
- It sets `data-eos-pilot-hold`, which pauses all CSS and removes transitions.
- It clears the game's timers.
- It sets `EOS_PILOT_SOUND.hold`, which cancels timed cues.

**The hand-off:**
- sets `data-eos-pilot-burst` on `.tsArcade`, removed when the mega burst unmounts, at the reveal or at unmount;
- calls `onDone`, then `onProgress(100)`;
- sets the reveal afterglow attribute;
- does not switch the MIND BEND guide during the burst.

**Log.** `__eos.pilot.finaleLog()` returns:
- `{log, inputT, climaxT, settleT, handoffT, megaMountT, megaUnmountT}`;
- `stepAfterT0` and `stepLog`, from a MutationObserver;
- `warn`.

**Opt-in.** Without `settle: true` the old behaviour is kept, so the CLEANSE and CRUSH drafts keep working until they switch.

**Over-burst CSS** (in 70): `.tsArcade[data-eos-pilot-burst] .eosMoodFlip{visibility:hidden}`.

### The other shared pieces

**S7 Mirror presets:**
- `EOS_PILOT_MIRROR`, `eosPilotMirror(emotion)` and `eosPilotMirrorStyle`;
- an `EosPilotStage` `mirror` prop, which renders `.eosPilotL0m` and `data-mirror`.

**S8 `useEosPilotBreath(mirror, progress)`:**
- WAAPI loops in which one iteration is one breath;
- retiming through `updatePlaybackRate`, so phase is continuous and nothing jumps;
- `phase()` and `exhale()`;
- `--eos-breath-ms`.

**S9 `stage.shift(p, ms)`.**

**S10 F8 faces:**
- `EosPilotFace`, `eosPilotFaceVars(D, word)`, `eosPilotFacePics(p, progress, count, seed)` (the shared `tsBubbleFaceSources` plus each slot's relief variant) and `eosPilotFaceHost(slot)`.
- React 18 needs `class`, not `className`, on the `ts-face` custom elements; the first build missed this.

**S11 replay:** `eosPilotRunSeed`, `eosPilotPickRun`, `eosPilotLastGet/Set`.

**S4 additions:**
- `{noise:[f0,f1,ms,o]}` and `{swell:[f,ms,o]}` cue layers (`eosPilotNoise`, `eosPilotSwell`), logged with `via:"noise"/"swell"`;
- the hold cut.

**S1 additions:** an actor `faceIds` prop, for per-kit step-face overrides.

## How each standard is met (evidence: Playwright runs on `/tmp/pilot_pop2`, 390×844 first, then 1280×860)

| Check | Result |
|---|---|
| A1 F8 | `f8_probe` PROBE: 5 hosts, **0** noPic, notCircle, cropped, textOverPic, textOutside or darkMask, and 0 positive at the start. This holds at 390 and 1280. Faces are `tsFaceNeg` at the start, and the text is 13 px at 390 and 15 px at 1280 (`clamp(9, 15, 0.13·D)`). The picture is on top and the word below it, inside the film; D is 100 at 390 and 116 to 122 at 1280. Each slot keeps its character between progress 0 and 100 (for example glitch_E63 → glitch_E10, still_E41 → still_E15). Uploads: 1 gives AAAAA, 2 gives ABABA, 3 gives ABCAB, all `tsFaceUpload`. |
| A2 Mirror | Mean colour of the sky band at 1.8 s, as ΔE: anger–panic 45.7, anger–sad 39.1, anger–anxious 45.6, panic–sad 13.4, panic–anxious 17.1, sad–anxious 27.5. All are at least 12. The words are inside the objects. |
| A3 Transform | Background ΔE from 0% to 96%: anger 71.5, sad 28.0. The face goes loud, then soft, then calm, then win. |
| A4 Climax | Climax beat in the input handler: the first cue row lands at T0 + 13–89 ms. **First painted frame: `climaxT − inputT` = 65 ms in the final 390 run** (earlier headless runs measured 119–362, all frame-bound). Settle at 2013–2050, hand-off at 2163–2181 (target 2150 ± 50). Reduced motion hands off at 941 (target 900). Mega mounts at 2283–2618. Beat log: climax 16, gather 263, blow 713, lift 1163, pose 1563, settle 2013, hand-off 2164. 0 warnings. |
| A5 Burst clean | While `.tsRewardSurge.mega` is mounted: **0** running arena animations, **0** visible `.eosMoodFlip`, burst attribute present in every sample, **0** sound rows after the hand-off, **0** `p.sfx` after T0, and **0** step bursts mounted after T0 (`stepLog []`). This holds at 390 and 1280, and with reduced motion. |
| A6 Arrows | `finishGame` with arrows asserted: 0 misses, 0 label mismatches and 0 occluded, at 390 and 1280. This includes a dodger run, where the marker follows the offered bubble. |
| A7 Touch | The press handler takes 2–5 ms and starts its WAAPI animation inside the handler. Headless rAF to paint measured 45–548 ms because software rendering is frame-bound. **This needs a real phone.** |
| A8 Switch | `?pilot=off`: the original POP plays to the reveal with 0 errors. CLEANSE (109) and CRUSH (2) pilots still play to the reveal with 0 errors and 0 arrow misses after the 71 changes. |
| Errors | 0 page errors in every run: 390, 1280, panic, sad, anxious, anger, reduced, uploads, pilot off. |
| Sound | Scheduling logs only; headless has no audio, so nothing was heard. Cues logged in play: stretch, pop, popLast (tones only), blink, chime, step, hum, dodge, peck, laugh, and the beds (heart and beatPair, rumble, rain and pad, shimmerBed). The climax cues all end by 2000: freeze@29–89, plink×6 from 265 to 587, pump@720, fizzle@820, pump@970, fwoomp@1000, glass@1165–1245, rise@1180, hold@1564. |

**Compared with the BEFORE sheet** (`dev/shots/quality/sheets/1.png`):
- **Before:** faceless gradient balls in dark space, no character, no weather, no climax of the game's own, and the burst over a dark field.
- **Now:**
  - the user's weather;
  - a character physically holding your thoughts;
  - pictures and words inside every bubble;
  - a visible day breaking as you pop;
  - a shareable blow-your-own-bubble and rainbow climax that is still behind the approved burst.

## Screenshots

**Sheets (committed):**
- `docs/pilot/status/v2-game-pop.after_390.jpg`, 14 frames in this order:
  - the four Mirror frames at 1.8 s (anger, panic, sad, anxious);
  - first pop, 60%, 80%;
  - the climax at T0 + 150, 450, 850, 1250 and 1750;
  - the approved burst at T0 + 3000;
  - the reveal.
- `docs/pilot/status/v2-game-pop.after_1280.jpg`, 8 frames: the anxious Mirror, play, 80%, the climax, the hand-off card, the reveal.

**Raw frames:** `/tmp/pop2shots/*.jpg|png`. These are scratch files and are not committed.

**How the climax frames were taken:** one headless run per time offset, because a single screenshot takes 0.4–3 s in headless runs.

## Known gaps and notes for the founder review

1. **A real phone is needed** for A4's paint time, A7 and the 60 fps question (§14 Q9). Headless rendering at 1280 takes seconds per frame. The climax start is in the input handler and measured 65 ms to first paint in the final run, but earlier runs went up to 362 ms because frames were bound by software rendering.
2. **Final progress value.** The last pop reports 96 unless 96 would cross one of the wrapper's step-reward buckets. In that case it reports the highest value inside the current bucket, for example 83, so that no step burst lands on the climax (finding 2 / A5). 100 arrives at the hand-off.
3. **Upload removal mid-run is not proven by a test.** The F8 probe's `__f8ClearUploads` hook does not exist in any file. The code path re-reads `live.current` whenever the user-image key changes. The six-upload fingerprint used in the test was too weak to distinguish slot 5.
4. **Sneeze chain and golden film are untested.** The recorded seeds rolled the dodger and the bird peck. The sneeze and golden paths are implemented but have not been seen in a run.
5. **CLEANSE and CRUSH have not switched to S2′ yet.** They must pass `settle: true` and `handoffMs: EOS_PILOT_HANDOFF[id]`, and drop the afterglow and tableau beats. Until then S2 runs in legacy mode for them.
6. **Remaining wrapper overlays.** The wrapper's step bursts on non-last pops, the "phew… cooling" toasts, the companion orb and the finish card are unchanged wrapper chrome.
7. **Feeling bubbles repeat.** The rule-mandated feeling bubbles repeat the emotion noun, for example "anger" twice.
8. **Desktop has large empty sky.** At 1280 the bunch is compact around the hero (D 116–122).
9. **Requests to the other owners:**
   - F8 owner: export `tsFaceVars()`; `eosPilotFaceVars` copies its formula for now.
   - Probe owner: add a `__f8ClearUploads` hook.
