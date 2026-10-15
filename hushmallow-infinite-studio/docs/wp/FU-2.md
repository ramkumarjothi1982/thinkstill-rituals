# FU-2: Sound lint robustness and the generic score switch

**Status: done.** M0 follow-up (docs/M0-REPORT.md §9 item 1; WP-04 criterion 5 gaps; OWNER-DECISIONS Q7
and the 2026-10-14 lead decisions). All 27 probes of the WP-04 round-3 review are rejected, each in its
own category, and the approved cues stay clean, alone, repeated and in every whole score plan tried
(the approved v2, 701 default plans, 1,000 planned specs). G-AUDIO now lints the whole score plan by
shape. The legacy seam exception belongs to the approved master and the golden direction, not to a
score id. New directions name `'hm-score'`; the golden T01 keeps `'soundtrack-v2'` and exact parity.
A circular score is delivered with no pre-roll behind its edit list, which the switch needed to meet
the lead decision.

**Round 2 (2026-10-15).** An adversarial verifier found four ways past the round-1 lint. All four are
closed, and so are the near variants of each, by fixing the model rather than moving a limit:
- **The scooped thump.** A thump's "its pitch does not rise" is now read from where its energy is, not from the
  raw glide.
- **The staggered or lopsided ring.** A ring's two tones are paired while they *sound together*, not only
  inside one 30 ms onset cluster. A quieter second tone counts by how much the pair's level swings.
- **The out-of-band masker.** Masking stays in the thump's register. Thumps within 100 ms are one beat.
- **Pips and slides.** Pips (pitched, but too short for a beep) and a chirp sliding into a note make a
  two-tone.

See "Round 2" below. The approved cues stay clean everywhere tried, and every round-1 result holds.

Machine: 4 cores, no GPU, Node v22, Chromium from Playwright 1.56.1, ffmpeg 6.1.1, 2026-10-14/15. Every
render, QA run and decode ran under the heavy lock: shared for renders, tests and QA, exclusive for the
remux timing. Scratch work and logs are in `/home/user/hm-work/fu2/` (logs in `fu2/logs/`); round 2's are in
`/home/user/hm-work/fu2b/` (logs in `fu2b/logs/`).

## What was built

### 1. The sound model (`audio/lint-shapes.mjs`, rewritten)

Every event becomes one or more sound parts. Each part has:
- an envelope, with its attack, its body (time above −20 dB) and its energy;
- an effective RMS level over time;
- for a tone, a pitch path.

The four WP-04 gaps, and what replaced each:

| WP-04 gap (review / M0 §9) | Now |
|---|---|
| **"Steady" was decided from the raw glide in cents.** An inaudible 2 ms scoop turned a beep into a non-signal. | **Steady is decided from where the energy sits.** A tone is steady when ≥ 85 % of its energy lies within ±25 cents of its energy-weighted median pitch, and that median is its pitch. A 2 ms scoop under a 4 ms attack keeps ≥ 97 % of the energy at any depth (110 to 2,400 cents). The least-moving approved chirp is v2's flinch, at 78 %; v2's blink is at 66 %. Both stay chirps. Vibrato deeper than 100 cents counts against steadiness, unless it is a trill (≥ 10 Hz: a bell ring). |
| **Engine voices were always unpitched.** | **Every engine fx voice is modelled as the app builds it.** That covers 29 voices (`ENGINE_FX`, transcribed read-only from `hushmallow/src/engine/audio.js` FX): tones, noise, grains, additive bells and pads. Each takes its pitch from `pitch` and the pentatonic `note`, its level from A × trim, and the voice's cut. A voice at pan 0 has no panner, so it is mono at full gain (+3 dB against a studio strip). The engine's noise buffers are already stereo. The model is checked against the engine itself (§ parity). The Mallow's own gestures are kit-specific and stay opaque: one part, ranked by `ENGINE.eff` and limited as a stack (`LOUD.voice`). |
| **No telephone ring was modelled.** | **A ring burst** is any of: two steady tones 50–250 cents apart sounding together (the beating two-tone of a phone line); a trill; or one plain steady tone held ≥ 0.8 s. It must be held ≥ 0.3 s. It is a ringtone when held ≥ 1 s (not the plain tone) or repeated within 6 s. That window covers every national ring cadence: UK 3 s, Europe 5 s, US 6 s. Round 2 defines "sounding together" as the two bodies overlapping by ≥ 0.3 s, wherever each starts, at an interval that holds. The pair must beat at ≥ 10 Hz and its level must swing ≥ 3 dB. Each tone need only hold its pitch within ±150 cents and bend ≤ 100 cents, so a drifting or wobbling ring still rings. Round 1 required one onset cluster, steady tones (±25 cents) and the quieter tone at ≥ 0.5×. See "Round 2". |
| **Heartbeat limits were escaped just past their boundary** (0.36 s decay, 55 ms attack, a 270 Hz tom). | **The thump was redefined.** It is low by **energy**: ≥ 70 % of its energy is in tones whose energy sits ≤ 340 Hz and whose pitch does not bend up by more than 150 cents while it sounds (round 2; round 1 used the raw glide), or in noise ending ≤ 680 Hz. Its attack must be ≤ half the lub-dub interval (otherwise the two beats merge into one swell). Its body must be ≤ 1.5 s. It must be in the foreground: no sound twice as loud **in its register** started in the 100 ms before it (round 2; round 1 took any sound). A thump no longer has a fixed attack or decay limit. 340 Hz sits a minor third under the flinch (410 Hz). v2's landing bloop (274 Hz) bends up 278 cents, so it is not a thump. The landing's wobbling tail is masked by its splat. |

Further detectors and limits, each derived from a probe class:

- **Alarm.** Any steady tone (a chime, a 25 ms pip) repeated **four** times at a steady interval of up to 4 s is
  an alarm. Three of the same approved sound is still a gag. The signal-beep train (≥ 3), beep-beep, buzzer,
  siren and machine rules are as in WP-04.
- **Ringtone figures.**
  - 2–24 signal notes, played again (the Nokia figure has 13 notes; WP-04 capped figures at 12).
  - Or 3–24 steady notes of any length: a marimba or chime ringtone. A pair of chimes played again is a
    doorbell figure the brand uses (MO-CLOSE), not a ringtone.
- **Messenger pop.** As before for signal notes. Further cases count:
  - two long-ringing notes **louder than v2's own celesta pairs** (`LOUD.chimePair`, calibrated on the
    eyes-open pair);
  - two **chirps of the same kind** a whole tone apart within 150 ms. "Same kind" means the same direction and a
    size within 1.5×. Round 2 measures this by their `bend`, whatever the waveform; round 1 used the same
    waveform and the raw glide. v2's double blink, the closest approved pair, is 240 ms apart; land → ripple is
    200 ms;
  - (round 2) two **pips** a whole tone apart within 300 ms. A pip is a steady tone under 30 ms whose body holds
    ≥ 4 cycles;
  - (round 2) a **chirp and a note** a whole tone apart within 150 ms: a slide into a two-tone.

  Every pop sounds above the thumps' register (340 Hz).
- **Jump scare.** The summed RMS envelope now includes the engine fx voices, so engine and studio levels add up.
  Two new limits:
  - `LOUD.noise`: the noise envelope alone, whatever its top frequency. A 5 kHz low-passed hit used to
    escape the bright-band rule.
  - `LOUD.voice`: the opaque Mallow gestures stacked.

  All the calibrated limits are v2's own maxima + 3 dB, recomputed by a test.
- **Texture.** `shapeFindings(events, { texture })`: texture events (the sparkle layer's cloud) count for the
  level but join no figure, train or pair.

The limits that changed (all in `SHAPE` / `LOUD`):

| Limit | WP-04 | FU-2 | Grounds |
|---|---|---|---|
| steady | raw glide ≤ 100 cents | ≥ 85 % energy within ±25 cents of the energy median | probes: 2 ms scoops; approved: flinch 78 %, blink 66 % |
| note.maxStruck | 0.5 s (bell measured without its attack) | 0.5 s (bell 3 ms attack + decay) | v2's sleepy tink, 0.553 s, stays a chime |
| train.tones | — | 4 | three approved repeats are a gag; four pings or clicks at 1 s are an alarm |
| figure.maxLen / chimeLen | 12 / — | 24 / 3 | the Nokia figure is 13 notes |
| ring | — | dual 50–250 cents, overlapping ≥ 0.3 s (R2: any onsets), interval holding (R2: moves ≤ half itself), beating ≥ 10 Hz (R2), level swing ≥ 3 dB (R2; R1: quieter ≥ 0.5×), held 1 s, single tone 0.8 s, cadence 6 s (R2: the repeat starts after the burst); ring tones hold their pitch: ±150 cents and bend ≤ 100 cents (R2 `ring.maxBend`; R1: steady, ±25 cents) | national ring cadences; a major third (386 c) is a chord; the phone lines beat at 25–50 Hz; a 3 dB swing is the quieter tone at 17 %; v2's breaths bend 142–181 cents; lens-focus converges |
| lubDub.lowHz / lowNoiseHz | 250 / 500 Hz | 340 / 680 Hz | tom probe 280 Hz (median); flinch 410 Hz |
| lubDub.maxBend (R2; R1: maxRise) | — | bend ≤ 150 cents (R1: raw glide ≤ 300 cents) | 150 = `SHAPE.drift`, the lint's "same pitch"; v2's rising bloops bend 268 (release) and 278 (landing) cents; a 2 ms scoop of any depth bends 0 |
| lubDub.maxAttack / maxDur | 50 ms / 0.35 s (−60 dB) | ≤ ½ interval / body ≤ 1.5 s | thrum (50 ms swell, 0.68 s body) and settle are thumps |
| lubDub mask | — | 100 ms, 2× in the thump's register (R2; R1: any sound's lead); thumps within 100 ms are one beat (R2) | v2's landing splat masks its own tail; a 2 kHz tick masks no 60 Hz thump |
| note.minCycles (R2) | — | a pip's body holds ≥ 4 cycles | below about 4 cycles the spectral blur (about 1/cycles, > 25 %) is wider than a major third |
| pop chirps / chimes | — | 150 ms, bend 1.5× any waveform (R2; R1: glide 1.5×, same waveform) / > LOUD.chimePair; chirp + note within 150 ms (R2) | drips pop; double blink (240 ms) and celesta pairs do not |
| LOUD | rise 0.0773, riser 0.0773, bright 0.0155, engine 0.9 | + noise 0.0228, voice 0.5125, chimePair 0.0178 | v2 maxima 0.0161 (landing noise), 0.362 (drift sigh), 0.0126 (eyes-open pair), + 3 dB |

### 2. G-AUDIO lints the whole score plan (`qa/gates/audio-gate.mjs`)

**The new `shapes` check** runs `lintEvents` over every engine and synth event of the score plan together:
- `score-plan.json` for hm-score;
- the buildPlanV2 replay or `qa/golden/v2/plan-v2.json` for soundtrack-v2.

A score made outside `audio/score.mjs` is therefore shape-checked. The sparkle cloud is regenerated exactly:
- **The generator.** `audio/score.mjs` `sparkleTexture(plan, { log, mallow, panSeed })` runs the layer with the
  plan's Mallow and pan seed (from its report; v2's for the frozen score). The sparkles take the stream's
  first draws. A circular plan's events are wrapped into the loop.
- **What counts as texture.** Only plan events equal to a regenerated sparkle are texture. A forged or moved
  ping is linted like any note. A plan whose cloud does not regenerate (wrong seed or Mallow) is linted whole,
  so it fails closed.

**Not linted as events:** the tick, cricket, swirl, hum, pad and bed layers. They are separate plan structures
from approved generators, and the clock's tick-tock would read as a beep train.

**The seam key: `seamKey(ctx, T)` and `approvedV2Match(ctx)`.**
- **The rule.** The legacy seam limit (thresholds `G-AUDIO.seam.legacy['soundtrack-v2']`, −24 dBFS) applies
  only to the approved v2:
  - the target's video sha256 equals the approved master's in `qa/golden/v2/frozen.sha256`, or
  - its direction's canonical hash equals `specs/golden/t01-v2.direction.json`'s.

  Any other video is held to −60 dBFS, whatever its score id.
- **How audio.py receives it.** `qa/gates/audio.py` and `thresholds.json` are unchanged (not FU-2's files). The
  job's `score` field is the key audio.py reads the limit by, so audioJob passes the seam key there and the
  real score id as `scoreId`.
- **Reporting.** The gate's metrics carry `seam: { score, legacyExemption: 'video' | 'direction' | null }` and
  `shapes: { events, texture, mallow, panSeed, findings }`.

### 3. The score switch (`composer/compose.js`: the `meta.score` default only)

`SCORE = { default: 'hm-score', legacy: { <golden T01 fingerprint>: 'soundtrack-v2' } }`:
- every direction names `'hm-score'`, except the approved film (the golden spec's fingerprint, an own-property
  lookup), which keeps `'soundtrack-v2'`;
- the committed golden direction and every parity result are unchanged.

### 4. No pre-roll behind an edit list (`audio/loop-aac.mjs`)

**Why.** The lead decision (2026-10-14) is that audio physically starts at t = 0. WP-04's loop hid 1.0 s of
pre-roll behind its MP4 edit list (media time 49024). Switching new directions to hm-score would have shipped
that to every new video, so the loop mux was changed with the switch.

**The encode.**
- The pre-roll is a whole number of AAC frames (`PRE_FRAMES` = 47; the tries use 47 + k).
- Those frames are dropped from the ADTS bitstream before the mux (`adtsFrames`, `encodeLoopAac`).
- The first kept frame is exactly the standard 1024-sample priming, so the delivered sound track's edit list
  is `[[D, 1024]]`. That is the plain mux's and the approved master's own edit list
  (`[[15000, 1024]]`).

**Exact presentation.**
- ffmpeg cannot end-trim a copied ADTS stream, so `presentExactly()` writes the sound edit's segment duration,
  the track duration and the movie duration in place (same-size fields). ffprobe then reads 15.000 s for both
  tracks and the container.
- The media keeps the encoder's last partial frame past D, as the approved master's does.

**The mux's own checks.** `muxLoop` refuses any other edit list (`assertNoPreroll`). It still checks lag 0, the
exact length and the seam.

**What a listener hears.** A player that ignores edit lists now hears the score 1024 samples (21.3 ms) late,
exactly like the approved master. WP-04's loop was 1.02 s late.

`render/mux.mjs` is unchanged: it calls `muxLoop`.

*Since round 1, FU-5 has extended `audio/loop-aac.mjs`: the `edit` and `circular` options, no picture offset, and
the last packet trimmed in stts. Its section 4 is now the reference for delivered timing and for the open owner
decision on the priming edit. Round 2 did not touch the file.*

## Round 2: the verifier's four gaps (`audio/lint-shapes.mjs`)

An adversarial verifier (`WORK/verify-fu2/`) got four classes of banned sound past the round-1 lint, at the
recipe level and inside a real hm-score plan through G-AUDIO. Each fix below changes what the model reads, not
just the size of a limit, and each closes the near variants of its gap too.

| Verifier gap | Cause | Fix |
|---|---|---|
| **1. The scooped thump.** A 60 Hz lub-dub with a 2 ms onset scoop (or 5 ms from 30 Hz, or only the lub scooped) passed; the steady control was rejected. | `isLow` decided "its pitch does not rise" from the raw glide f0 → f1 (scoop: 498 cents). That is the scooped-beep trick FU-2 had fixed for steadiness. | **A part's `bend`** (`pitchStats`): the energy-weighted median pitch of the later half of its energy minus that of the earlier half. A scoop under the attack, or a glide that runs on after the sound has died, moves neither median: its bend is 0 at any depth (300–3600 cents in 1–5 ms, tested). A thump's tones must bend up by ≤ `lubDub.maxBend` = 150 cents, the lint's own "same pitch" (`SHAPE.drift`). v2's rising bloops bend 268 cents (release) and 278 cents (landing): they stay bloops, and the landing stays a non-thump (`fu2b/logs/approved-parts-1.log`). |
| **2. The staggered or lopsided ring.** The US ring with its 480 Hz tone 40 ms late passed, and so did the UK ring with 450 Hz at 0.45×. My own probes found two more escapes of the same class: each tone drifting 60 cents over its burst, and a 120-cent vibrato. | `ringBurst` paired two tones only inside one 30 ms onset cluster. The single-tone fallback missed too, because 440 → 480 Hz is 151 cents against a 150-cent drift. The level rule was 0.5×. Ring tones had to be *steady* (±25 cents), which is the beep/chirp boundary calibrated on v2's chirps, not a property of a ring. | **`ringBursts(cs)` pairs tones by what they do together.** Each ring tone **holds its pitch**: ≥ 85 % of its energy within ±150 cents (`SHAPE.drift`), and it bends ≤ `ring.maxBend` = 100 cents, vibrato aside. A ring drifting up to about 200 cents per burst still rings. v2's breaths glide a fifth and bend 142–181 cents at every duration: a sigh. A dual burst is two such tones whose bodies **overlap ≥ 0.3 s**, wherever each starts. Their interval is measured over the overlap, weighted by the product of their levels (`pairInterval`). It must be 50–250 cents and **hold**: it moves by at most half itself, so the app's `lens-focus` pair, converging to unison, is a tuning. The pair must **beat at ≥ 10 Hz** (`trill.rate`; the phone lines beat at 25–50 Hz; two low thumps beating at 7.5 Hz are a wobble). Its **level swing (1 + r)/(1 − r) must be ≥ 3 dB** (`ring.beatDb`; the quieter tone at ≥ 17 %; 0.45× swings 8.4 dB). A trill is any held tone warbling ≥ 10 Hz, ≥ 50 cents deep. A cadence's repeat starts after the first burst has ended. |
| **3. The out-of-band masker.** A 60 Hz lub-dub with 2/2.2 kHz pings (2.5× louder) 40 ms before each beat gave no finding. | `masked()` let any louder non-thump sound in any band hide a thump that started ≤ 100 ms after it. | **Masking stays in the thump's register** (`registerLevel`). The masker's level counts in full only from tones, bells and narrow bands whose energy sits ≤ 340 Hz (in either glide direction). Broadband noise counts by the share of its band below 680 Hz. A higher tone counts not at all, and neither does an opaque gesture, whose spectrum is unknown. The landing's splat still masks its own tail: its 190 → 92 Hz flump is 2.4× the tail. A louder **thump** masks too, and thumps within 100 ms are **one beat**, heard at the loudest. A flam or a grace thump before each beat is still a lub-dub. Round 1 let a thump never mask, so a flam escaped by breaking the pair's "standing out". |
| **4. Pips and slides.** A two-tone or tri-tone of 25–28 ms pips passed, and so did a rising chirp followed by a steady note a fifth up. | `isSignal` needs ≥ 30 ms (−60 dB). A pip was therefore neither a signal, a chime nor a chirp. Chirps paired only with chirps of the same waveform. | **Pips** (`isPip`): a steady tone under 30 ms whose body (above −20 dB) holds ≥ 4 cycles (`note.minCycles`). Below that its spectral blur (about 1/cycles, > 25 %) is wider than a major third, so no interval is heard. Pips are **two-tone notes** (300 ms window). A **chirp and a note** (beep, pip or loud chime) a whole tone apart **within 150 ms** are a slide into a two-tone. **Chirp kinds** are compared by `bend`, whatever the waveform. A sine and then a triangle drip, or a drip whose glide runs on twice as far after it has died, are the same drip again. |

**Judgement calls, walked from both sides in the tests.**
- **Pips are no alarm beeps.**
  - Two 25 ms pips at one pitch are a double click.
  - Three are a gag.
  - Four at a steady interval are an alarm (`train.tones`, as before).
  - Beep-beep and the 3-beep train keep the 30 ms floor (`note.minDur`, now walked: 32 ms beep-beep → alarm,
    28 ms → clean).

  A pip's pitch matters for a two-tone. Its sustain is what makes a beep.
- **Low-pass noise thumps at 800 Hz are a knock, not a heartbeat.** The noise register ends at 680 Hz: twice
  340 Hz, where a uniform band's energy median sits at the tones' limit. It is now walked (659 Hz → heartbeat,
  700 Hz → clean).
- **The app's own `unlock` and `star` voices stay clean.** unlock's pop chirp sits 184 cents under its first
  bell. Its second bell is under `LOUD.chimePair`.

**What the verifier's scripts give now** (unchanged scripts, `fu2b/logs/`):

| Script | Round 1 | Round 2 |
|---|---|---|
| `probe-extra.mjs` (26 near variants) | 13 rejected, 13 pass: the 8 named in the gaps, the sine-then-triangle chirps, and the 4 below | **22 rejected**; the 4 that pass are the judgement calls above (800 Hz knock, 3 pips, `unlock`, `star`) |
| `probe-mask.mjs` | lub-dub + 2 kHz ticks at 0.10: `[]` | heartbeat at every tick level |
| `gate-inject.mjs` (G-AUDIO on a default hm-score plan) | scooped lub-dub, staggered US ring, pip tri-tone: shapes **pass** | all three **fail** G-AUDIO (heartbeat, ringtone, messenger-pop); the baseline plan passes |
| `gate-inject2.mjs` | lub-dub behind ticks: shapes pass | **fail** |
| `probe-vib.mjs` (vibrato beeps) | 5/5 rejected | 5/5 rejected |

## Files

- **Changed:**
  - `audio/lint-shapes.mjs` (rewritten);
  - `audio/lint-recipes.mjs` (`lintEvents(events, options)`, `calibrateLoud` for all limits, header);
  - `audio/score.mjs` (`scoreStream`, `sparkleTexture`);
  - `audio/loop-aac.mjs` (trimmed delivery, `mp4Info`, `presentExactly`, `assertNoPreroll`, `adtsFrames`);
  - `audio/splice.mjs` (reports the pre-roll frames);
  - `qa/gates/audio-gate.mjs`;
  - `composer/compose.js` (the `meta.score` default only);
  - `tests/unit/audio-lint.test.mjs` (extended: 14 → 18 tests; round 2: 19, the limit walk rewritten for the new rules);
  - `tests/unit/audio-mux.test.mjs` (+2 tests).
- **New:**
  - `tests/unit/audio-gate.test.mjs` (4; round 2: test 2 holds the verifier's four gate-level injections);
  - `tests/unit/score-switch.test.mjs` (2);
  - `tests/parity/audio-lint-engine.test.mjs` (1);
  - `docs/wp/FU-2.md`.
- **Round 2** changed only `audio/lint-shapes.mjs`, `tests/unit/audio-lint.test.mjs`, `tests/unit/audio-gate.test.mjs`
  and this report:
  - `lint-shapes.mjs`: `pitchStats` → `bend` and `holdWide`; parts carry `bend`, `holds`, `warble` and their
    pitch `path`; `isPip`, `registerLevel`, `beats`, `ringBursts` (replaces `ringBurst`), `pairInterval`,
    `beatDepth`; `sameChirp` by bend; `messengerPop`;
  - `SHAPE`: `lubDub.maxBend` replaces `maxRise`, `ring.beatDb` replaces `ring.level`; `ring.maxBend` and
    `note.minCycles` are new.

  `qa/gates/audio-gate.mjs` needed no change: it calls `lintEvents`.
- **Unchanged:**
  - frozen `audio/soundtrack.mjs`, `audio/soundtrack-v2.mjs` and every other frozen file
    (`hm guard`: frozen v2 ok);
  - `../hushmallow`;
  - `qa/gates/audio.py`, `thresholds.json` and `render/mux.mjs`.

## Acceptance criteria

The task's criteria, plus M0-REPORT §9 item 1 ("the 27 probe cases in `WORK/verify-wp04r3/lint-evade3.mjs` are
the acceptance set").

### 1. The lint rejects the WP-04 review's evading probes (dual-tone rings, scooped beeps, pitched engine voices, heartbeat boundary escapes): **met**

| Command | Result |
|---|---|
| `node /home/user/hm-work/verify-wp04r3/lint-evade3.mjs` (the reviewer's script, verbatim, from the studio root) | **27 REJECTED, 0 PASSES** (`fu2/logs/lint-evade3.log`; WP-04: 25 of 27 passed). UK ring ×1 and ×2 cycles, US ring, trill bell: ringtone. Nokia beeps: alarm + ringtone; scooped Nokia, marimba pings, engine chime and pluck figures: ringtone (+ pop). Scooped two-tone, tri-tone, 0.55 s pings, engine chimes, engine drips: messenger-pop. Scooped beep-beep, 3+3 scooped beeps, 4 pings at 1 s, 4 engine clicks at 1 s, 3 scooped beeps at 1.5 s: alarm. 0.36 s decay, 55 ms attack, click on each beat (+ jump-scare), engine thrum, engine settle, 280 Hz tom: heartbeat. Engine snap at 0.89, crackle + 5 kHz hit: jump-scare. |
| `node --test tests/unit/audio-lint.test.mjs`, test "the M0 acceptance set" | the same 27 cases in the test file, each asserted in its own category: pass |
| test "every probe class past its boundary" | 22 further variants, all rejected in their category: dual-tone rings at 880+960 Hz and on triangles every 2 s; the 425 Hz European cadence; a 25 Hz trill held 1.2 s; scoops of 600 and 2,400 cents; a scoop over the whole attack; a glass figure, pluck and bubble two-tones; chime ×4 and pluck ×3 trains; rotate-tick ×4; lub-dubs with 0.6 s tails, 120 ms attacks, energy at 320 Hz, on the engine drop-in, after a quieter tick; snap at 0.6 × 0.8; a kit voice at full force; a 4 kHz noise burst; crackle at full intensity + a quiet hit |
| test "each limit, walked from both sides, past the boundary" | Every limit is walked from both sides (pass/fail ±2–5 % or ±10 cents/20 ms around it): beep vs chime length (3 vs 4 chimes); the steadiness share (glide solved at 87 % and 83 %); drift; train gap; lub-dub interval, register, rising bloop, attack share, body, masking; pop gap and interval; chirp-pop gap and interval; chime-pair level; ring dual range at both ends, cadence gap, level ratio, burst body, held time; the single-tone ring; trill rate and depth; figure length 24; doorbell vs 3-note chime figure; the rise, noise and voice limits. Pass. |
| `node /home/user/hm-work/verify-wp04r2/lint-evade2.mjs`; `node /home/user/hm-work/verify-wp04/mine/lint-evade.mjs` | R2: all 18 named cases rejected, as in WP-04. The single 400 → 1600 Hz bubble chirp still passes (v2's ripple shape; the R2 reviewer did not list it). R1: 10/10 rejected. |
| **Round 2:** `node /home/user/hm-work/verify-fu2/probe-extra.mjs` (the FU-2 verifier's script, verbatim) | **22 rejected, 4 pass** (`fu2b/logs/probe-extra.log`; round 1: 13 and 13). Newly rejected: both scooped lub-dubs (heartbeat); the US ring with 480 Hz 40 ms late and the UK ring at 0.45× (ringtone); the 25 ms and 28 ms pip two-tones, the pip tri-tone, the slide into a fifth, and the sine-then-triangle chirps (messenger-pop). The 4 that pass are the judgement calls: the 800 Hz low-pass knock, three pips, and the app's `unlock` and `star`. |
| **Round 2:** `node /home/user/hm-work/verify-fu2/probe-mask.mjs` | lub-dub alone, and with 2/2.2 kHz ticks at 0.06 or 0.10: **heartbeat** every time (round 1: `[]` behind the 0.10 ticks) |
| **Round 2:** `node /home/user/hm-work/verify-fu2/gate-inject.mjs`; `gate-inject2.mjs` (G-AUDIO's `audioGate` on a default hm-score plan) | baseline **pass**. Steady lub-dub, scooped lub-dub, US ring together and 40 ms late, pip tri-tone, lub-dub alone and behind 2 kHz ticks: every one **fails** G-AUDIO `shapes`, each in its category (`fu2b/logs/gate-inject*.log`; round 1 passed the scooped lub-dub, the late ring, the tri-tone and the ticks) |
| **Round 2:** test "FU-2 R2: the verifier's escapes are rejected" | 27 cases, each in its own category: the verifier's 13; the near variants of each fix (scoop on the lub only, 301 cents in 1 ms, the ring 0.3 s late, at 0.25×, drifting 60/120 cents, one tone drifting, a 120-cent vibrato, the 425 Hz ring and a trill bell drifting, 12 ms pips, a beep then a falling chirp, a drip whose glide runs on, a hiss masker, a grace thump, flams); `probe-mask` at four tick levels. Pass. |
| **Round 2:** test "each limit …", extended | New walks from both sides: `note.minDur` (32 ms beep-beep → alarm, 28 ms → clean; three pips clean, four an alarm); `note.minCycles` (4 ± 0.3 cycles at 440, 880 and 2,000 Hz); `lubDub.maxBend` (± 15 cents of bend); `lowNoiseHz` (± 3 %); masking gap, level and register (low bloop, broadband noise by its low share; tick, chirp and hiss mask nothing); beat grouping (grace at 80 ms vs 130 ms, flam, louder flam); `ring.beatDb` ± 0.3 dB; ring overlap (held ± 0.05 s, burst body ± 0.02 s with any lag); beat rate (10 ± 0.5 Hz); `ring.maxBend` ± 10 cents; the interval holding (narrowing by 40 % vs 60 % of itself); chirp kinds by bend (1.4× vs 1.6×, waveform and glide tail ignored); chirp + note (gap 150 ± 10 ms, interval 2.1 vs 1.9 semitones). v2's own bloops bend > 1.6 × 150 cents and its breaths > 1.4 × 100 cents. Pass. |
| **Round 2:** `node /home/user/hm-work/fu2b/scratch/self-probe.mjs` (my own near variants) | 11 rejected. The 4 that pass are walked boundaries: overlap 0.97 s held once; a chirp then a note 160 ms later; opposite-direction chirps (v2's release plays a falling then a rising chirp 40 ms apart); a pip before a chime quieter than v2's celesta pair. |

### 2. No false positives on the approved cues: **met**

| Command | Result |
|---|---|
| `node audio/lint-recipes.mjs` | `23 recipes, 1 direction(s): 0 finding(s)` |
| test "approved v2 sounds repeated by a direction" | every recipe × 4 payloads × 2–3 repeats × 9 gaps (0.2–2 s): 1656/1656 clean |
| test "no false alarms" | 17 brand figures clean, including: v2's MO-CLOSE celesta pair and the arrangeClose fifth; v2's three dissolve chimes 0.2 s apart; the double blink; three chimes; even bounces; one thrum and one settle; an unhurried pluck line; two unhurried drips; a held note with vibrato; six quiet noise hits |
| `node /home/user/hm-work/verify-wp04r2/fp.mjs` | prints only the recipe list: no finding |
| test "whole score plans" + `node /home/user/hm-work/fu2/scratch/plan-lint2.mjs` | The approved plan (compat = `qa/golden/v2/plan-v2.json`) is clean with its 25 sparkles as texture. **701 default plans** (7 Mallows × 4 contours × 25 pan seeds, plus compat) are clean (`fu2/logs/plan-sweep-701.log`). Without the texture the cloud itself reads as pops and trains, so the exemption is needed and it is exact. |
| `node /home/user/hm-work/fu2/scratch/planned-sweep.mjs 1000` | **1,000 planned specs** (`planBatch`, review mode, seed 2026), each composed, dry-run (`composer/artefacts.js`), scored by `buildScore` and linted whole. All 1,000 name `hm-score`; 82,892 plan events, 24,892 sparkles as texture, **0 findings**, 164 s (`fu2/logs/planned-sweep-1000.log`). |
| `node --test tests/parity/audio-score.test.mjs` | 7/7 (203 s; `fu2/logs/parity-audio-1.log`). `buildScore` lints every cue recipe and the recipes together: the default T01, T01 voiced by all 7 Mallows, the remux. |
| **Round 2**, final code: `node audio/lint-recipes.mjs`; `node /home/user/hm-work/verify-wp04r2/fp.mjs` | `23 recipes, 1 direction(s): 0 finding(s)`; fp.mjs: no finding |
| **Round 2:** `node --test tests/unit/audio-lint.test.mjs` | the 1656 repeated approved cues are still clean; "no false alarms" now holds 19 figures (+ the app's `lens-focus` twice, breathing in, out and in again) |
| **Round 2:** `node render/lib/heavy-lock.mjs --shared -- node /home/user/hm-work/fu2/scratch/plan-lint2.mjs` | **701 default plans: 0 bad** (`fu2b/logs/plan-sweep-701-final.log`) |
| **Round 2:** `node render/lib/heavy-lock.mjs --shared -- node /home/user/hm-work/fu2/scratch/planned-sweep.mjs 1000` | **1,000 planned specs, all `hm-score`: 0 findings**; 82,892 plan events, 24,892 sparkles as texture (168 s; `fu2b/logs/planned-sweep-1000-final.log`) |
| **Round 2:** `node /home/user/hm-work/fu2b/scratch/approved-parts.mjs` | The calibration for `maxBend`. Every approved v2 pitched part ≤ 450 Hz with its bend. The rising bloops (land 278, release 268, take 471/423 cents) stay above 150. No approved sound has a steady lead under 60 ms, so pips cannot touch v2 (`fu2b/logs/approved-parts-1.log`). |
| **Round 2:** `node /home/user/hm-work/fu2b/scratch/app-voices.mjs` | All 29 modelled app voices alone at 3 levels: the same verdict in round 2 as in round 1 in **78/78** cases. The pre-existing flags are listed under open issues (`fu2b/logs/app-voices.log`). |

### 3. G-AUDIO runs the structural lint over the score plan, not just recipe names: **met**

| Command | Result |
|---|---|
| `node cli/hm.mjs qa v2 --out /home/user/hm-work/fu2/qa-v2` | **PASS** (23.3 s, `fu2/logs/qa-v2.log`). G-AUDIO `shapes` pass: "82 score events, no banned shape …; 25 sparkle-layer events counted for their level only". `recipes` pass. `seamStep` warn −31.3 dBFS with `legacyExemption: 'video'`. 18 of 18 gates pass, as in the M0 audit. |
| `node --test tests/unit/audio-gate.test.mjs` | 4/4. The approved v2: shapes pass, texture 25. Default `score-plan.json` of all 7 Mallows: clean. A plan with an injected UK ring, scooped beep-beep, thrum lub-dub, full-force snap, or a two-tone of pings inside the sparkle cloud **fails G-AUDIO** in its category. A wrong pan seed or Mallow leaves texture 0: linted whole, fails. |
| `HM_QA_FIXTURES=1 node render/lib/write-jail.mjs -- node --test --test-name-pattern="fault fixture" tests/golden/qa-suite.test.mjs` | **pass**: every fault fixture still fails exactly its own gate, and the new `shapes` check fails none of them (319 s; `fu2/logs/qa-fixtures-2.log`). |
| **Round 2:** `HM_QA_FIXTURES=1 node render/lib/write-jail.mjs -- node --test --test-name-pattern="fault fixture" tests/golden/qa-suite.test.mjs` | **pass** on the final code. Every fault fixture still fails exactly its own gate, and the stricter `shapes` check fails none of them (594 s, sharing the machine with the sweeps; `fu2b/logs/qa-fixtures.log`). |
| **Round 2:** `node cli/hm.mjs qa v2 --out /home/user/hm-work/fu2b/qa-v2` | **PASS**, 18/18 gates (26.9 s, `fu2b/logs/qa-v2.log`). `shapes` pass: 82 events, 25 texture, no findings; `seam.legacyExemption: 'video'` |
| **Round 2:** `node --test tests/unit/audio-gate.test.mjs` | 4/4. Test 2 now also injects the verifier's four gate-level escapes into a default hm-score plan: a lub-dub with 2 ms scoops, the US ring 40 ms late, a 25 ms pip tri-tone, a lub-dub behind 2 kHz ticks. Each **fails** G-AUDIO in its category. |

### 4. The legacy seam exception is keyed on the approved video's sha256 / the golden direction, not the score id: **met**

| Command | Result |
|---|---|
| `node cli/hm.mjs qa /home/user/hm-work/fu2/rekey/golden.json` | The M0 audit's farm render of T01 (`WORK/m0-audit/renders/t01-final`, not the approved file), judged with the golden direction: G-AUDIO **pass**, seamStep warn −31.3 against the legacy −24, `legacyExemption: 'direction'` |
| `node cli/hm.mjs qa /home/user/hm-work/fu2/rekey/other.json` | The same audio, judged as T01 composed at seed 77 (still naming `soundtrack-v2` in the manifest): G-AUDIO **fail**, seamStep −31.3 against **−60**, `legacyExemption: null` (`fu2/logs/qa-rekey-*.log`) |
| test "the legacy seam exception is the approved v2's" | Exempt: the approved master by sha256, and the golden direction. Not exempt: another fingerprint, one anchor moved, or no direction. `hm-score` passes through unchanged. `audioJob` sends `score: null` and `scoreId: 'soundtrack-v2'` for a non-golden direction. Pass. |

### 5. New directions switch to 'hm-score'; the golden T01 keeps 'soundtrack-v2' and exact parity: **met**

| Command | Result |
|---|---|
| `node --test tests/unit/score-switch.test.mjs` | 2/2. The golden spec composes to `soundtrack-v2`, as the committed golden direction says. Seed 77, 20 s and other lines compose to `hm-score`. The farm (`render/mux.mjs SCORES`) renders both. A prototype-named fingerprint is just another spec. Four planned specs go end to end (compose → dry run → `buildScore` circular → G-AUDIO's `shapesOf`): clean, with their sparkles regenerated. |
| planned sweep (criterion 2) | 1,000/1,000 planned specs name `hm-score` |
| `node cli/hm.mjs test` (parity: composer-v2-parity, composer-v2-pixels, engine-v2-parity, v2-self-parity) | The golden T01's compiled direction is bit-equal to the committed one; state, mesh, sub-frames, cues, curves and pixels unchanged (see "The suites") |
| `node cli/hm.mjs golden verify` | all golden frames ok, pixel tolerance 0/255, state tolerance 1e-9 |
| `node --test tests/parity/audio-score.test.mjs` test 1 | `--compat v2-score` is still the approved soundtrack, byte for byte |

**The hm-score delivery the switch now ships.** `node render/lib/write-jail.mjs -- node /home/user/hm-work/fu2/scratch/delivered-table.mjs`
(shared lock, 112 s) scores T01 voiced by each Mallow, delivers it with `muxLoop` and grades it with
`qa/gates/audio.py` (unmodified):

| Kit | Splice (samples) | Wrap step WAV / delivered (dBFS) | Click delivered | Pre-roll frames (tries) | Sound edit list | Gate | Plan shapes |
|---|---|---|---|---|---|---|---|
| Noomi | +30 | −72.0 / −66.7 | −76.1 | 47 (1) | `[[15000,1024]]` | 10/10 | 0 findings, 25 texture |
| Glitzi | −44 | −72.9 / −66.8 | −70.2 | 48 (2) | `[[15000,1024]]` | 10/10 | 0, 25 |
| Blubi | +5 | −70.0 / −64.5 | −74.7 | 48 (2) | `[[15000,1024]]` | 10/10 | 0, 25 |
| Zuzu | −46 | −73.2 / −71.5 | −72.0 | 47 (1) | `[[15000,1024]]` | 10/10 | 0, 25 |
| Boppo | +47 | −71.3 / −67.2 | −66.5 | 47 (1) | `[[15000,1024]]` | 10/10 | 0, 25 |
| Pipzi | +20 | −71.2 / −66.9 | −73.9 | 47 (1) | `[[15000,1024]]` | 10/10 | 0, 25 |
| Loomi | −30 | −71.0 / −63.9 | −69.2 | 47 (1) | `[[15000,1024]]` | 10/10 | 0, 25 |

- **Seam and sync.** The delivered seam is −63.9 to −71.5 dBFS (WP-04: −63.4 to −71.0). Lag is 0 against
  `score.wav`.
- **Without the edit list.** Decoded with `ffmpeg -ignore_editlist 1`, the score sits exactly **1024 samples**
  late: SNR 40.0–46.2 dB at that lag, −3.4 to −4.0 dB at lag 0. WP-04 was 1.02 s late.
- **Durations.** ffprobe reads 15.000 s for video, audio and the container.
- **`hm remux`.** Under the exclusive lock (38 s wait):
  `node render/lib/heavy-lock.mjs --exclusive --label fu2-remux-timing -- node cli/hm.mjs remux /home/user/hm-work/fu2/remux-job --contour rise-1 --tick-tempo 1.08 --pan-seed 7`
  wrote the remux in **9.8 s** (WP-04: 9.3 s). Its delivered seam is −86 dBFS. Both tracks' edit lists are
  `[[15000, 1024]]`.

### 6. Tests for every probe class: **met**

| Probe class | Tests |
|---|---|
| dual-tone rings, trills, ring cadences | `audio-lint` tests 6 (ring and trill limits), 11, 12; `audio-gate` test 2 (a ring in a plan fails G-AUDIO) |
| scooped beeps (signals) | tests 6 (the steadiness share), 11, 12 (600, 2,400 cents, whole-attack scoop); `audio-gate` test 2 |
| pitched engine voices | test 13 (the engine model: pitches, levels, pan, cut, opaque gestures); tests 11, 12; `tests/parity/audio-lint-engine.test.mjs` (the model against the engine) |
| heartbeat boundary escapes | tests 6 (register, rise, attack share, body, masking, interval), 11, 12 |
| jump scares through the engine and below the bright band | tests 6 (rise, noise, voice), 10 (calibration), 11, 12 |
| whole-plan lint and texture | test 14; `audio-gate` tests 1–3 |
| seam re-key, score switch | `audio-gate` test 4; `score-switch` tests 1–2 |
| no pre-roll edit | `audio-mux` tests 4–5 |
| **round 2:** scooped thumps, `bend` | `audio-lint` test 6 (`maxBend` walk, scoops of 300–3,600 cents bend 0, v2's bloops), test "FU-2 R2" (4 cases); `audio-gate` test 2 |
| **round 2:** staggered, lopsided, drifting rings | test 6 (`beatDb`, overlap with any lag, held, burst body, beat rate, `ring.maxBend`, interval holding, breaths), test "FU-2 R2" (11 cases); `audio-gate` test 2 |
| **round 2:** out-of-band maskers, flams, grace thumps | test 6 (masking gap, level, register; tick, chirp and hiss; noise by low share; beat grouping), test "FU-2 R2" (4 cases + `probe-mask` at 4 levels); `audio-gate` test 2 |
| **round 2:** pips and slides | test 6 (`note.minDur`, `note.minCycles` at 3 pitches, chirp + note gap and interval, chirp kinds by bend), test "FU-2 R2" (8 cases); `audio-gate` test 2 |

### The engine fx model against the engine (`tests/parity/audio-lint-engine.test.mjs`, 7 s)

**The test.** Every modelled voice is rendered alone in Chromium through the engine (intensity 0.5, trim 0.5,
`note` 2), plus chime, pluck and snap panned. Its peak level over the first 250 ms (5 ms RMS of both channels)
is compared with the model's, both relative to a studio sine of known level.

**The deviation per voice** (engine − model, dB):
- crackle −2.5, sort 0.1, snap −1.0, drop-in 0.8, clear −2.0, portal 4.0, separate 0.1, rotate-tick −2.1;
- lens-focus 3.1, chime 0.2, star 0.3, bloom 3.0, pluck 0.1, glass 0.3, drip 0.1, paper −0.1, wind −1.4;
- settle 0.3, swish −0.1, shimmer 0.7, thrum 2.1, click −2.2, bubble −0.7, unlock −1.2;
- breathe-in 0.3, breathe-out 0.4, chime panned 0.2, pluck panned −0.2, snap panned −1.0.

**Reading the numbers.** 20 of 29 voices are within 1.2 dB, and the median |Δ| is 0.3 dB.
- The shortest clicks, the grains' worst case and the slow noise swells read high in the model, which is
  conservative.
- The sustained tonal swells read 2–4 dB low: reverb builds up under them and their partials beat. None of
  them has a fast onset.

**The test's limits.** It asserts |Δ| ≤ 4.5 dB per voice and a median ≤ 1 dB.

**Before the pan fix.** Before the pan-0 correction, every tonal voice at pan 0 read +2.2 to +3.8 dB.

## The suites

| Command | Result |
|---|---|
| `HM_PARITY_FULL=1 node cli/hm.mjs test` (guard, unit, parity with all 16 composer frames, property), final tree | **575 tests: 574 pass, 0 fail, 1 skipped** (the opt-in 25 min sequential render), 239 s (`fu2/logs/hm-test-final.log`). It includes "composer → runtime v3: 16 golden frames, cold, bit-identical (tolerance 0/255)" and `tests/parity/audio-lint-engine.test.mjs`. An earlier run on this branch: 573 tests, 572 pass, 1 skipped (`fu2/logs/hm-test-1.log`). |
| `HM_QA_FIXTURES=1 node render/lib/write-jail.mjs -- node --test --test-name-pattern="fault fixture" tests/golden/qa-suite.test.mjs` | pass, 319 s. The first attempt hit ENOENT: FU-3's agent started the same fixture suite at the same moment, and it rebuilt `WORK/qa-fixtures/duplicate` under my run. Re-run alone, it passes (`fu2/logs/qa-fixtures{,-2}.log`). |
| `node --test tests/unit/audio-lint.test.mjs tests/unit/audio-gate.test.mjs tests/unit/score-switch.test.mjs tests/unit/audio-mux.test.mjs` | 29/29 |
| `node --test tests/parity/audio-score.test.mjs` | 7/7, 203 s |
| `node --test tests/parity/audio-lint-engine.test.mjs` | 1/1, 7 s |
| `node cli/hm.mjs guard` (final tree) | all four guard checks ok: frozen v2 (tree `8d0627dfee6d`, local `9a740db17b29`), live app untouched, no repository changes outside the studio, nothing written outside the studio and WORK |
| `git diff --stat -- <every frozen path> ../hushmallow` | empty |
| `node cli/hm.mjs golden verify` | ok |
| **Round 2:** `node cli/hm.mjs test` (guard, unit, parity, property), final tree | **637 tests: 636 pass, 0 fail, 1 skipped** (the opt-in sequential render), 346 s while the fixture suite shared the machine (`fu2b/logs/hm-test-final.log`). Includes `audio-score` parity (`--compat v2-score` still the approved soundtrack byte for byte; T01 voiced by all 7 Mallows, linted whole), `audio-lint-engine` (29 voices within 4.5 dB), and the composer golden frames bit-identical. Round 2 changed no engine or composer file, so the 16-frame opt-in was not re-run. |
| **Round 2:** `node --test tests/unit/audio-lint.test.mjs tests/unit/audio-gate.test.mjs tests/unit/score-switch.test.mjs tests/unit/audio-mux.test.mjs` | **30/30** (audio-lint 19, audio-gate 4, score-switch 2, audio-mux 5) |
| **Round 2:** `node cli/hm.mjs golden verify` | ok: all golden frames, pixel tolerance 0/255, state tolerance 1e-9 (`fu2b/logs/golden-verify.log`) |
| **Round 2:** `git diff -- <every frozen path> ../hushmallow` | empty |
| **Round 2:** `node cli/hm.mjs guard` (final tree) | **frozen v2 ok** (tree `8d0627dfee6d`, local `9a740db17b29`), **live app untouched**, **no repository changes outside the studio**. The write audit reports **one** file outside the studio and WORK since the 04:11:45Z baseline (re-armed by FU-1 R2): `/usr/lib/python3/dist-packages/pip/_internal/commands/__pycache__/list.cpython-313.pyc` at 04:25:08Z, the byte-code of a `pip list`. It is **not FU-2's**. FU-2 ran no pip; its jobs ran in the write jail (`/usr` read-only) or were plain node scripts writing only to WORK. 96 s later FU-3 R2's agent created `WORK/tmp/fu3r2/dl` while working on its stemmer task. I left the file and the baseline alone: they are outside FU-2's scope, and re-arming is the integrator's deliberate act (`fu2b/logs/guard.log`). |

## Deviations

1. **The edit-list fix is in this package.** The task names the lint, the gate, the seam key and the switch.
   But the switch routes every new direction through `muxLoop`, and the lead decision forbids hiding pre-roll
   behind an edit list. So the loop mux was changed in `audio/loop-aac.mjs`, which FU-2 owns.
   `render/mux.mjs` is untouched.
2. **The exact presentation is written in place.** ffmpeg cannot end-trim a copied ADTS stream, so the sound
   edit's segment duration and the track and movie durations are rewritten after the mux. These are same-size
   fields; `mp4Info`/`presentExactly` are covered by tests and `muxLoop` verifies the result. The media keeps
   the encoder's last partial frame past D, as the approved master's does: ffmpeg decodes 720,896 samples for
   both, and compliant players stop at the edit.
3. **The seam key travels in `job.score`.** `qa/gates/audio.py` and `thresholds.json` are not FU-2's files, and
   audio.py reads the legacy limit by `job.score`. That field is now the seam key; the score id moved to
   `job.scoreId`.
4. **Some WP-04 test boundaries moved with the model.** Each is replaced by a walk past its new limit:
   - the 99/110-cent glide is now the 87 %/83 % energy share;
   - "a tom at ~300 Hz is above the heart's sounds" is now a heartbeat (≤ 340 Hz);
   - "six quiet hits within 50 ms" at peak 0.12 are now a noise jump scare (0.06 RMS, 8 dB over v2's noise);
     the clean case uses peak 0.03;
   - "bells ringing 0.5 s are beeps" now uses a decay of 0.497 s (bell length = attack + decay).
5. **The Mallow's gestures stay opaque.** Their voices are kit-specific; the lint is kit-free. They are ranked
   by `ENGINE.eff`, may be thumps (tap, press, hop), and are limited as a stack. `LOUD.voice` = v2's 0.362
   (drift sigh) + 3 dB, a new limit.
6. **Round 2 moved test boundaries with the model.** Each old walk is replaced by a walk past its new limit:
   - the rising-bloop walk (raw glide `maxRise` ± 20 cents) is now a walk of `bend` (`maxBend` ± 15), plus scoops
     of 300–3,600 cents that bend 0;
   - the ring-level walk (`ring.level` ± 0.05) is now `beatDb` ± 0.3 dB;
   - the masking walk's masker was a 900 → 1800 Hz chirp, which by the new rule masks no 80 Hz thump. It is now
     a low bloop, walked in gap and level, plus the counter-cases: a 2 kHz tick, a high chirp and a hiss at
     10–14× mask nothing.
7. **Round 2 judgement calls** (each walked from both sides, see "Round 2"):
   - pips are two-tone notes but not alarm beeps;
   - low-pass noise thumps above 680 Hz are a knock;
   - opaque Mallow gestures mask nothing (their spectrum is unknown, so the lint fails closed);
   - two tones beating slower than 10 Hz, or converging to unison, are not a ring.

   The last one narrows the round-1 ring rule. It was needed once tones pair across clusters: two sustained low
   thumps 60/52.5 Hz overlapping 1.25 s read as a ring, and so would the app's `lens-focus` played twice.

## Open issues

- **Kit gestures as melody.** A figure played on the Mallow's own gestures (e.g. `tap` at four `pitch`
  values, repeated) is not modelled pitch-wise; only their level is limited (`LOUD.voice`). Modelling them
  needs the per-kit voice models in the lint, with care for the logo's success phrase.
- **Layers outside the event lint.** The tick, cricket, swirl, hum, pad and bed layers are not shape-linted:
  they are approved generators, and a direction cannot change their shape. A new layer that writes discrete
  events into `plan.synth` would be linted whole unless it is registered as texture the way the sparkles are.
- **Ringtone rhythm tolerance.** A melody repeated with heavy random timing jitter (> 25 %) is still not a
  "figure played again", as in WP-04.
- **Engine model accuracy.** Sustained tonal swells read 2–4 dB low in the model (reverb build-up and beating
  partials). They have slow onsets and none is near a jump-scare limit. The parity test holds every voice
  within 4.5 dB.
- **The app's own voices, played alone, can trip the lint.** This is unchanged by round 2, which gives the same
  verdicts as round 1 for every one of the 29 modelled voices at intensity/trim 0.6/0.6, 0.6/1 and 1/1
  (`fu2b/logs/app-voices.log`):
  - `bloom` alone reads as a ringtone and a messenger pop: its five swelled, held triangle notes count as held
    signal notes, and its rising arpeggio as a two-tone and a transposed 2-note figure;
  - `sort`, `clear`, `star` and `unlock` (trim 1) read as messenger pops: their bell or triangle figures are
    louder than v2's celesta pair;
  - most voices at full force (1/1) are jump scares, against v2's maxima + 3 dB.

  No registered recipe uses them; v2 plays the engine at trims ≤ 0.8. When the M1 recipe work adds one,
  `lintRecipe` will flag it. A "beep starts like a beep" attack rule would clear `bloom`, but it needs the M1
  sounds to calibrate against.
- **Masking by a sustained sound.** A louder onset in the thump's register within 100 ms absorbs the thump, even
  when that sound then sustains (a drone onset). A transient 6 dB under a steady drone can still be heard. No
  probe uses this; a residual-level rule would not keep v2's landing clean (its splat has decayed to 0.4× of the
  tail when the tail peaks).
- **Three pips are a gag.** Three 25 ms pips at a steady interval pass, four are an alarm (judgement call 7).
- **Musical changes for the owner.** The switch makes owner-audible changes, all as raised in Q7: hit-sync
  pickups, the phone-band MO-CLOSE, and the 256 kb/s loop AAC. Per the lead decision, the owner hears them in
  the M1 batch.

## Integrator notes (files FU-2 does not own)

1. **`docs/CONVENTIONS.md` §4.** In the WP-04 line, "the composer still writes `'soundtrack-v2'` until the
   owner's M0 listening pass" should read: "the composer writes `'hm-score'` for every new direction (FU-2,
   Q7); the golden T01 keeps `'soundtrack-v2'`".
2. **`docs/QA.md`, G-AUDIO.**
   - Add the `shapes` check: the structural lint over the whole score plan, with the sparkle cloud as texture.
   - The legacy seam exception now applies only to the approved master (sha256) or the golden direction;
     every other video is held to −60 dBFS. Add `metrics.seam` and `metrics.shapes`.
   - Re-run "v2 passes every gate" (done here: PASS).
3. **`docs/OWNER-DECISIONS.md`.**
   - Q7: implemented (FU-2: lint gaps closed, new directions on `hm-score`, the golden T01 on
     `soundtrack-v2`).
   - Audio pre-roll: implemented. The loop carries the standard priming edit only, presents exactly D, and is
     1024 samples late without edit lists, as the approved master is.
4. **`render/mux.mjs` header.** "the edit list presenting exactly the duration" should read "the pre-roll
   dropped from the bitstream, the standard priming edit only".
5. **`engine/runtime/direction-runtime.js` L121.** The pre-setup placeholder `meta.score: 'soundtrack-v2'` for a
   spec composed in the page is overwritten by the composed direction's meta at setup. It is harmless, but
   could be `null` to avoid confusion.
6. **`docs/wp/WP-04.md` integrator gaps 1–4 and 6** are closed by this package; gap 5 (the edit list) too.
7. **M0-REPORT §9 item 8** ("the QA legacy seam limit is keyed on the score id"): closed.
8. **Round 2: the write audit.** `hm guard` reports one pip byte-code file under `/usr/lib/python3/dist-packages`
   written at 04:25:08Z. It is not from FU-2 (see "The suites"). Whoever wrote it should remove it, or the
   integrator should re-arm after review.
9. **Round 2: `docs/QA.md` G-AUDIO** (with note 2). The shape check now also covers:
   - rings whose tones start apart, drift or wobble;
   - thumps behind out-of-band sounds, flams and grace thumps;
   - pips and slides.

   No threshold in `thresholds.json` changed; every limit is in `audio/lint-shapes.mjs` `SHAPE`/`LOUD`.
