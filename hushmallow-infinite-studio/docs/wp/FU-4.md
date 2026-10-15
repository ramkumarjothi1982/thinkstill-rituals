# FU-4: Pose bridges and the missing G-DIR rules (WP-03 gaps)

**Status: done (round 2), except `hm guard`.** The guard is red only because of another package's write (open issue 1). FU-4 closes WP-03 criterion 4, which the M0 audit marked partial (M0-REPORT section 8, WP-03 #4, and section 9 item 4). It also adds the five G-DIR rules WP-03 left out of the plan and refits the G-COST final and draft models to the measured farm (section 9 item 8). Every criterion below has the command it was measured with. The golden T01 keeps exact parity, and the frozen v2 is untouched.

Measured on 2026-10-15 on the studio machine (4 cores, Node v22.22.0). In round 1, FU-5 was working in the same tree and holding heavy-lock slots at the same time; in round 2, FU-1, FU-2 and FU-3 (round 2) were. Scratch files went only to `/home/user/hm-work/fu4/`, `/home/user/hm-work/fu4r2/` and `/home/user/hm-work/tmp/fu4*/`.

**How the work was done.** A first FU-4 agent was interrupted. The lead committed its uncommitted tree in `7e786dc` (the pose rewrite, the bridge move, and the G-DIR rule helpers, with no tests). This package reviewed that code, fixed what the review found (below), wrote all the tests, did the G-COST refit and ran the acceptance checks.

## Round 2 (2026-10-15): the verifier's gaps

An adversarial verifier found five gaps in round 1. Each one is fixed below and re-measured; the acceptance table shows the round-2 results.

| # | Gap | Fix |
|---|---|---|
| 1 | `hm guard` red: `.git/info/exclude`, written by the workflow orchestrator at 01:26:53Z | **Closed by FU-1 round 2's reviewed re-arm** at 04:11:45Z (`qa/guard/outside-writes.json`: the reason reviews this exact write). The guard is red again, but for a new finding that is not FU-4's: pip's bytecode cache `list.cpython-313.pyc`, written at 04:25:08Z by concurrent FU-3 round-2 work. See open issue 1. FU-4 did not re-arm over another package's write. |
| 2 | The eye gate was a blanket exception. On any closed-tube Mallow, shut eyes met every open-eyed pose, whether or not the gate had shut them | **The exception is now narrow.** The composer records every opening the pack's gate shuts, in `direction.provenance.eyeGate` (`{ t, by, asked, k, gate }`). Shut eyes meet an open-eyed pose only from such a closure until the next key on `face.eyeOpen` (`poses.js` `eyeGateAt`). G-DIR re-checks each record (`pose:gate`). The verifier's probes now fail on Noomi exactly as they do on an open-socket face. |
| 3 | The R-BREATH `content` test passed on the smile alone, not on the eyes it claimed | The test now asserts both channels in the message. A new eyes-only probe (TURN-SQUEEZE declared exit `alert`) fails on `face.eyeOpen` alone, identically on both face styles. |
| 4 | FU-4's calibrations never reached OWNER-DECISIONS Q5; the `THRESHOLDS` comment contradicted deviation 5; the per-change spin ramp had no warning band | **Q5 now has an "FU-4 additions (provisional)" entry**: C1, the spin-ramp reading, "shut" = 0.1, the 1e-3 tolerance, the eye gate and the close-up trigger. **C1 is narrowed:** the plan's strict limit is the error everywhere except the breath envelope's break points, the one place v2 kinks. **The per-change spin ramp is a warning** (`safety:spin-ramp-change`; v2 0.29 s). The `THRESHOLDS` comment now says exactly what is calibrated. |
| 5 | The close-up spin limit cannot fire for the face spiral; the pulse rule covers only `pulse` channels | These follow the plan's literal triggers, so the code is unchanged. Both are recorded as open issues for the Zuzu (WP-50) and realm (WP-20, WP-55) packages: open issues 4 and 6. |

## What was built

### 1. Pose contracts on compiled values (`composer/poses.js`, `composer/moves/acting/bridge.js`, `composer/compose.js`)

- **`mismatches()` no longer skips channels the exit pose leaves open.**
  - **With compiled values** (the composer always passes them), every channel the entry pose declares is judged by its value at the entry time. The previous exit pose's declarations are not evidence; G-DIR checks them separately.
  - **Declarations only** (two pose names), a channel the exit pose leaves unconstrained counts as a mismatch. An unknown value is never assumed to be in range.
  - The audit's probes, before → after:
    - `mismatches('alert','squeezed')`: `eyeOpen` → `eyeOpen, squint`;
    - `mismatches('startled','asleep')`: `eyeOpen, mouthSmile` → all seven `asleep` channels.
- **Junctions and bridges are judged on the built channels.** `planBridges(spans, { channels, end, eyeGate })` gets the channel set as built so far and simulates the bridges it plans, so a later junction sees an earlier bridge. For each failing channel, the bridge (`acting/bridge`):
  - keys an `inOutSine` ease over the whole gap. The slope is zero at both ends, so the channel stays C1.
  - lands inside the entry range exactly at the entry. `engine/motion.js` `Track` is a sum of step responses, so the bridge aims at the preferred value **corrected by the residual** that the previous move's still-settling spring owes, clamped to the range. The channel lands in range and also rests there afterwards.
  - **hands the channel on** after the entry:
    - a move owns it from the entry on: that move takes over;
    - nobody owns it, and holding it would break the next move's exit pose: the bridge keeps ownership up to the next window and releases it toward the value the previous move left. Example: the ritual's `squeezed` entry asks for squint 0.5–1, and its `calm` exit asks for ≤ 0.1;
    - otherwise the channel holds.
- **Refusals are compile errors, never a pop.**
  - `pose:no-room`: the gap is under 0.25 s.
  - `pose:bridge-short`: the old spring owes more than the range allows, so no in-range rest value can land in time.
  - The `pose:no-room` message now **names the move that last keyed each failing channel**. That is usually the move to fix: "face.browAlpha = 0.780 ∉ [0, 0.05] (last keyed by M-ORBIT at 3.1 s)".
- **Fixes to the inherited code** (review findings):
  - **Eye gate (round 2: narrow).** A gentle gag on Noomi keeps the painted eyes shut by design (`personality.eyesOpen`, the app's own gate), but `G-JOLT` declares the exit pose `startled`, which asks for open eyes. Strict compiled checks made that legitimate direction fail to compile (the eye-gate test in `composer-personality`). Round 1 answered that with a blanket rule: on any closed-tube Mallow, shut eyes met every open-eyed pose. The verifier showed this switched the eyes off for 4 of the 7 poses on Noomi. Round 2 accepts shut eyes **only where the gate really shut them**:
    - **Recording.** When the gate closes an opening a move asked for, the composer records `{ t, by, asked, k, gate }` (key time, move, asked opening, intensity, the pack's gate) in `direction.provenance.eyeGate`.
      - Moves call `ctx.personality.eyesOpen(k, value, t)`; `compose.js` `makeCtx` records the closure at `t`. A closure without `t` is the compile error `pose:eye-gate`. `G-JOLT` passes its snap time (one argument).
      - Intents record theirs in the personality pass (`applyPersonality(..., { gates })`).
      - The field is present only when the gate closed something. The approved film's jolt opens the eyes, so the golden direction file is unchanged.
    - **Where it holds** (`poses.js` `eyeGateAt`): from a closure until the next key on `face.eyeOpen`. A key later than the closure, and earlier than the query time, is a move deciding the eyes itself. Only the closure of an opening counts: what was asked must be above `SHUT`. `satisfies(ch, v, range, { gated })` then accepts shut eyes for an opening range. The reverse never holds: open eyes going into the painted cover are always a mismatch. `planBridges` (with the bridges it has simulated) and G-DIR share the rule.
    - **Checked** (G-DIR `pose:gate`): the face style has a gate (`closed-tube`); the closure's move is in the direction; the closure lies inside that move's window on `face.eyeOpen`; it closed an opening; and intensity × opening is under the gate. The record shape is in `composer/schemas/direction-v3.schema.json`.
    - **Result.** On the gentle gag (intensity 0.3) the gate closes G-JOLT's snap at 0.4 s. Four poses hold through it: G-JOLT's exit, the aftermath's entry and exit, and M-ORBIT's entry. Then M-ORBIT keys the eyes at 3.42 s and the gate stops holding. On the approved film nothing is recorded, so TURN-SQUEEZE declared `alert`, R-BREATH declared `alert` and LP-RETURN declared `alert` all fail on `face.eyeOpen`, on Noomi exactly as on an open-socket face.
  - **One "shut" (`SHUT = [0, 0.1]`) for every pose.** WP-03 had `asleep` at 0.02, the inherited tree had 0.05, and `squeezed`/`calm` used 0.1. A slower performer (tempo 0.8, the personality test's performer) reads 0.065 at CARD_OUT and failed to compile. Measured on Noomi's eye (`eyeGeom`, r 99.1, lid stroke 40.8 art px): at eyeOpen 0.1 the lid curves are 19.6 px apart, so the two strokes still overlap by 21 px and the eye reads as closed. A gap opens only near 0.2. The painted match at the seam stays G-DIR's stricter `craft:eye-gate` (≤ 0.05).
  - **Perceptual slack `POSE_TOL = 1e-3`** (was 1e-6). An underdamped eyeOpen spring dips about 1e-5 below 0, and the face clamps that to 0; at 1e-6 that failed a tempo-0.7 performer at the turn. 1e-3 of eyeOpen moves a lid by 0.2 art px.
- **Unchanged for v2:** T01 needs no bridge, and all 14 of its declared poses hold on its compiled values.

### 2. G-DIR (`composer/validate.js`): pose contracts plus the plan rules WP-03 left out

| Rule | What it checks | v2 measures | Limit |
|---|---|---|---|
| `pose:entry`, `pose:exit`, `pose:unknown`, `pose:bridge`, `pose:gate` | every span move's declared entry pose at the start of its span and exit pose at its end, on compiled values; shut eyes meet an open-eyed pose only where a recorded eye-gate closure holds them, and every record is checked (`pose:gate`); recorded bridges join adjacent span moves inside their gap. Replaces WP-03's `pose:mismatch` warning, which compared declarations only | 14/14 hold, none through the gate (no closure recorded) | contract |
| `safety:spin`, `safety:spin-ramp`, `safety:spin-ramp-change` | whatever turns (prop angles; the face spiral `face.spin` once the catalogue has it): turns/s, the close-up limit while its disc (orbit ellipse at its radius, zoomed) covers more than 25 % of the frame, and the whole motion's equivalent inOutSine ramp (π/2 · peak / max \|dω/dt\|). Round 2: each speed change on its own, (π/2) · \|Δω\| / max \|dω/dt\| within the change, warns under 0.5 s. A change runs between turning points of the speed (reversals under 2 % of the peak are ripple) and is cut where the acceleration jumps by more than 25 % of the steepest | thoughts 0.310 turns/s, ramp 0.72 s, disc 8.2 %; per change 0.29 s (the stop at the turn: 0.101 turns/s in 0.37 s at 6.63 s), a warning | ≤ 1; ≤ 0.3 in a close-up; ≥ 0.5 s (whole motion; per change warns) |
| `safety:pulse` | every swing of a pulse channel between turning points (ripple under 2 % of its range ignored), measured over two loops | glow pulse 1.875 s | ≥ 0.15 s |
| `deform:face` | every face feature's outline (eyes through the engine's `eyeGeom`, brows, mouth at its worst wave phase, blush; padded by half the line width) inside the ellipse inscribed in the measured silhouette box, in art space, at 240 Hz wherever the painting does not cover the face | worst 0.886 (left blush, 4 s) | ≤ 1 |
| `craft:c1`, `craft:c1-kink` | the slope jump of every non-kick channel at each point where its definition can break the slope: key times, eased-key ends, spline knots, blink phases, smoothstep edges, min/max/clamp switches, and the same for its envelope. Extrapolated to h → 0; the seam is loop closure's job | 1.26 × range/s at the breath envelope's handover (`env.breath`, 14.0 s; the body's breath sine 0.78 ×); everything else under 1e-5 × (worst `face.mouthRound`, 5.4e-7 ×) | error > 0.05 × range/s (plan) on every channel; round 2: only at the breath envelope's break points is the error 1.5 × (calibrated, Q5) and 0.05 × a warning |
| `audio:absolute-time`, `audio:absolute-layers`, `audio:score` | every layer time a cue hands the score (`at/from/to/until/start/end`) sits on an anchor or a cue time; the named score builds its layers from cues. The frozen `soundtrack-v2` (absolute seconds, audit R10/R11) is accepted only for the approved film's fingerprint (`compose.js` `SCORE.legacy`), as a warning | 1 time field (spin_up `until` = the squeeze cue); score `soundtrack-v2` on the golden fingerprint | contract |

G-DIR takes a median of 235 ms on T01, measured while the parity suite loaded the machine (about 140 ms idle). The limit is 3 s; before FU-4 it took about 100 ms. Round 2 adds the per-change spin scan and the gate check: 285–410 ms on T01 with three other packages' suites running.

### 3. G-COST refit (`composer/cost.js`)

- **The models now count what the engine counts:**
  - final: one sub-frame when the dry run moves less than `STILL_PX` = 2 px across the shutter (P6), otherwise the direction's 3–16;
  - final: no face draw while the painting covers the face; one per frame; every sub-frame only past `MOTION_PX` = 1.5 px of face motion (P3);
  - draft: one sub-frame, the face once per frame.
  - `ENGINE` mirrors those engine constants, and a test pins it to them.
  - The old final model's "floor 1" counted 2 sub-frames where the engine renders 3, giving 1,490 against 1,611 rendered. The new rule gives 1,587 (−1.5 %), and each 90-frame segment is within 10 sub-frames.
- **Coefficients.**
  - **Final:** WP-02's per-pass bench split (round 2, run B, exclusive lock). The glass pass is charged only on frames with a glass card on screen, because P5b scissors it to the cards. One scale (1.185) is fit so T01 predicts the median segment render time of six single-worker farm renders: **542.1 s against 542.2 s**. The runs measured 481.6, 526.8, 539.5, 544.9, 562.2 and 604.4 s. The bench reads 15–20 % below the farm (WP-02), so a scale is expected. With it, every 90-frame segment is within 8 %: +8.0, +1.2, −6.0, −4.2 and +0.1 %. Without the glass term the worst segment was +13.6 %.
  - **Draft:** scale 0.852, giving **79.9 s against a median of 79.8 s** (79.3, 79.8, 81.7). Segments are within 7 %.
- **Wall clock and budget.**
  - The budget is judged on the wall clock: render plus the job's overhead (compile, the master encode's tail, score, mux and preview). The overhead is the median of the same runs: final 44.8 s per 15 s (range 40.0–46.7), draft 9.4 s (9.1–9.6). It scales with duration.
  - T01 final: **586.9 s = 9.78 min** against a measured median of 586.5 s (521.6–651.1). The budget is 11 min.
  - T01 draft: 89.3 s against 88.9 s.
- **Proof:** 6 × the mean frame × 2 = 14.5 s against 12.8–14.8 s measured.
- **Metrics.**
  - `predictedSec` stays the segment render time, which QA's G15 check (`qa/gates/spec-gates.mjs`) compares with the farm's segments.
  - New: `overheadSec` and `predictedWallSec`.
  - `predictedMin` is now the wall clock.
  - Both models are fitted, so the `cost:provisional` warning is gone.

## Files

| File | Change |
|---|---|
| `composer/poses.js` | compiled-value contracts, `SHUT`, `EYE_GATE`, `satisfies()`, `closedEyed()`, `POSE_TOL` 1e-3, residual-aimed bridges with hand-on, last-writer error messages; round 2: `eyeGateAt()` (recorded closures), `satisfies(..., { gated })`, `planBridges(..., { eyeGate })` |
| `composer/moves/acting/bridge.js` | eased landing key over the gap; release key and ownership when planned |
| `composer/compose.js` | `planBridges(spans, { channels: built, end: D, eyeGate })`; round 2: the eye-gate closures (`makeCtx` wraps `personality.eyesOpen(k, value, t)`, the personality pass adds intents' closures, `provenance.eyeGate` only when non-empty) |
| `composer/personality.js` | round 2: the personality pass records intents' eye-gate closures (`applyPersonality(..., { gates })`); values unchanged |
| `composer/moves/gags/G-JOLT.js` | round 2: passes its snap time to `eyesOpen` (one argument; values unchanged) |
| `composer/schemas/direction-v3.schema.json` | round 2: the optional `provenance.eyeGate` record |
| `composer/validate.js` | `poseChecks` (with the eye gate), `spinChecks`, `pulseChecks`, `faceInSilhouette` + `faceOutline`, `c1Checks` + `exprSwitchTimes`, `absoluteTimeChecks`; new `THRESHOLDS`; round 2: `pose:gate` and recorded closures, C1 strict except at the breath envelope's break points (`c1Kink` 0.05, `c1KinkCalibrated` 1.5, `c1CalibratedEnv`), the per-change spin warning (`spinRipple`, `spinKink`), the corrected `THRESHOLDS` comment |
| `composer/cost.js` | refit: engine-faithful counting (`subframesFor`, `faceRedrawsFor`, `ENGINE`), glass term, overhead, wall-clock budget |
| `tests/unit/composer-poses.test.mjs` | rewritten: 11 tests (audit probes, compiled values, eye gate, bridge landing, residual, refusal, hand-on, performer variants, the composer bridge, the brows-left-up defect); round 2: `eyeGateAt` semantics, bridges only where a closure holds, the gentle gag's recorded closure and its schema |
| `tests/unit/composer-validate.test.mjs` | v2 measures every new rule; 10 new seeded faults (each fails only its own rule family); pose, eye-gate, close-up, C1 and score tests; threshold pins; round 2: the honest `pose:exit` test (both channels named), the eyes-only probe on both face styles, the recorded-closure test with five `pose:gate` faults, the strict-C1 test (v2's handover copied onto another envelope is an error), the per-change spin measure |
| `tests/unit/composer-cost.test.mjs` | new: 5 tests (engine mirrors, final/draft/proof against the measured runs, budget and duration scaling) |
| `tests/unit/composer-compose.test.mjs` | G-COST assertion updated to the refit (1,587 sub-frames, no provisional warning) |
| `tests/unit/composer-personality.test.mjs` | the intent fixture made pose-honest (see deviation 3); round 2: the gated intent and the gentle jolt record their closures |
| `docs/ARCHITECTURE.md` | §7 poses and §8 gates updated; round 2: `ctx.personality.eyesOpen(k, value, t)`, the recorded eye gate, C1 and spin wording |
| `docs/OWNER-DECISIONS.md` | round 2: Q5 "FU-4 additions (2026-10-15, provisional)" |
| `docs/wp/FU-4.md` | this report |

## Acceptance criteria

| # | Criterion | Command | Measured result |
|---|---|---|---|
| 1 | `mismatches()` checks entry channels the exit pose leaves unconstrained | `node -e` probe in `/home/user/hm-work/fu4/` against `git show 05afc1d:…/poses.js` | `alert→squeezed`: before `eyeOpen`; after `eyeOpen, squint`. `startled→asleep`: before 2 channels; after all 7 (closedCurve, browAlpha, mouthOpen, body.squash, body.lift included). `composer-poses` "declarations only…" passes |
| 2 | Bridges bring every declared entry channel into range (on compiled values) | `node render/lib/write-jail.mjs -- node --test tests/unit/composer-poses.test.mjs` | 11/11 pass (round 2). Round 2: shut eyes into an open-eyed entry are bridged unless a recorded closure holds them (no closure, or one followed by an eyeOpen key: `face.eyeOpen` bridged). A channel the exit pose never mentions (squint) is bridged and lands in [0.5, 1] at the entry; the evaluated channel lands where planned (±1e-9); residual aiming lands 0.79 → 0.89 with rest 1.3. The composer fixture TEST-TURN-OPEN → R-BREATH gets `eyeOpen, squint` bridged at 7.1–7.4 s; eyes ≤ 0.1 and squint ≥ 0.5 at the ritual; G-DIR 0 errors |
| 3 | The audit's defect is caught, never accepted | `node /home/user/hm-work/fu4/before-after-bridge.mjs` | Before (declarations): one bridge (`eyeOpen`), brows **0.780** at CARD_OUT under the painted cover. After: `pose:no-room … face.browAlpha = 0.780 ∉ [0, 0.05] (last keyed by M-ORBIT at 3.1 s)` |
| 4 | Declared poses checked against compiled values (G-DIR), with the eye gate only where the gate shut the eyes (round 2) | `node render/lib/write-jail.mjs -- node --test tests/unit/composer-validate.test.mjs`; the verifier's `probe7.mjs`/`probe5.mjs`; `/home/user/hm-work/tmp/fu4r2/gentle.mjs` | 36/36 pass. M-ORBIT declared `asleep` → `pose:entry` "eyeOpen = 1.0267 ∉ [0, 0.1]". R-BREATH declared `content` → one `pose:exit` naming **both** `face.eyeOpen = … ∉ [0.8, 1.2]` and `face.mouthSmile = 0.79… ∉ [0.8, 1.1]`. Eyes alone: TURN-SQUEEZE declared exit `alert` → exactly "face.eyeOpen = 1.14e-7 ∉ [0.8, 1.3]" on `closed-tube` and on `open-socket`. R-BREATH entry `alert` and LP-RETURN entry `alert` (0.0259) fail too. Gentle gag: G-JOLT's closure at 0.4 s holds 4 poses (G-JOLT exit, aftermath entry and exit, M-ORBIT entry) with 0 errors; without the record → 4 pose errors; R-BREATH entry `alert` there still fails. `pose:gate` faults: open-socket face, closure outside the writer's window (7.2 s), unknown move, asked 0.05, intensity 1 (the gate lets it open), each reported. Unknown pose → `pose:unknown`; T01 14/14 poses hold, none through the gate |
| 5 | Golden T01 parity kept (semantics adjusted, not the golden) | `HM_PARITY_FULL=1 node cli/hm.mjs test` (round 2 log `/home/user/hm-work/fu4r2/hm-test-full.log`); `node cli/hm.mjs golden verify` | Round 2: G-STATE max \|Δ\| 0 over 476,585 numbers; meshes, sub-frames, cues identical; the committed golden direction = page compose (no `eyeGate` record); **16/16 frames bit-identical**; `golden verify` ok. T01 compiles with 0 bridges |
| 6 | Spin ≤ 1 turn/s, ≤ 0.3 in close-ups, ramps ≥ 0.5 s | `composer-validate` faults `safety:spin` (1.43 turns/s), `safety:spin-ramp` (0.41 turns/s, 0.34 s ramp), close-up test (orbit disc ≥ 25 %: "0.31 turns/s … close-up max 0.3") | each fails its own rule family only; v2: 0.310 turns/s, 0.72 s ramp, 8.2 % disc. Round 2: the per-change reading warns (`safety:spin-ramp-change`): v2 "changes speed by 0.101 turns/s over 0.37 s at t=6.63: a 0.29 s ramp for that change". The close-up limit cannot fire for `face.spin` today (open issue 4) |
| 7 | Pulse ramps ≥ 150 ms | fault `safety:pulse` (glow pulse period 0.2 s) | "swings in 0.100 s"; v2 1.875 s |
| 8 | Face inside the silhouette | fault `deform:face` (mouth 520 px lower) | "the mouth leaves the silhouette … normalised radius 1.519"; v2 worst 0.886 |
| 9 | C1 continuity except declared kicks | fault `craft:c1` (an outCubic key on `body.lean`: 9.24 × range/s); inOutSine control passes; kick channels never checked; round 2: "C1: the calibrated limit is the breath envelope's alone…" | v2: the only kinks are the breath envelope's (1.26 ×) and the body's breath sine (0.78 ×), both warned at a calibrated break point. Everything else is under 1e-5 × (worst 5.4e-7 ×, `face.mouthRound`). Round 2: v2's handover copied onto `env.tremble` is a `craft:c1` error ("limit 0.05× range per s"); before, it would only have warned |
| 10 | No absolute-time layers | faults `audio:absolute-time` (`until` = 6.5 s, not on the clock), `audio:absolute-layers` (frozen score on another fingerprint), `audio:score` (unknown score); a `hm-score` direction passes with layers "cues" | each fails its own rule only |
| 11 | Calibrated so v2 passes (Q5); calibrated values documented as provisional for the owner (round 2) | `composer-validate` "the golden T01 direction passes G-DIR…" and "thresholds that differ from the plan…"; `grep -n "C1\|FU-4" docs/OWNER-DECISIONS.md` | 0 errors. Warnings: the WP-03 calibrated pair (reading-clear, glass-rail), `craft:c1-kink` ×2 and `safety:spin-ramp-change` (plan values as warnings), and `audio:absolute-layers` (frozen score, approved film only). OWNER-DECISIONS Q5 has an "FU-4 additions (2026-10-15, provisional)" entry: C1 (strict except the breath envelope, 1.5 ×), the spin-ramp reading, "shut" = 0.1, the 1e-3 tolerance, the recorded eye gate and the close-up trigger. The `THRESHOLDS` comment states what is calibrated, and the pins test checks it |
| 12 | Planned specs still compile clean | `node /home/user/hm-work/tmp/fu4r2/c1-survey.mjs 300` and the property suite (1,000 specs) | Round 2: 300/300 with 0 errors (warnings: reading-clear, glass-rail, c1-kink ×2 and spin-ramp-change on each). Property suite: G-DIR ran 1,000, passed 1,000 |
| 13 | G-COST final/draft refit to the measured farm (median about 9.7 min final) | `node render/lib/write-jail.mjs -- node --test tests/unit/composer-cost.test.mjs`; `node /home/user/hm-work/tmp/fu4b/cost-check.mjs` | 5/5 pass. Final 542.1 s render (median 542.2) and 586.9 s = 9.78 min wall (median 586.5); 1,587 sub-frames against 1,611; segments within 8 %. Draft 79.9 / 89.3 s (medians 79.8 / 88.9). Proof 14.5 s (12.8–14.8) |
| 14 | Tests added that test what they claim; style kept; G-DIR under 3 s | `node render/lib/write-jail.mjs -- node --test tests/unit/composer-*.test.mjs` | Round 2: 104/104 composer tests pass. G-DIR takes 285–410 ms on T01 with other packages' suites running (288 ms inside QA) |
| 15 | `hm guard` green | `node cli/hm.mjs guard` | **FAIL, not caused by FU-4** (open issue 1). Frozen v2 ok, app ok, repository ok. Round 1's `.git/info/exclude` finding is closed by FU-1 round 2's reviewed re-arm (04:11:45Z). The one finding left is pip's `list.cpython-313.pyc`, written at 04:25:08Z by concurrent FU-3 round-2 work; it needs the integrator's reviewed re-arm |

### Suites

**Round 2.** Command: `HM_PARITY_FULL=1 node cli/hm.mjs test` (guard + unit + parity with all 16 composer frames + property). Log: `/home/user/hm-work/fu4r2/hm-test-full.log`. Run time: 6 min 0 s, with FU-1, FU-2 and FU-3 round-2 work running alongside. Result: **636 tests: 630 pass, 5 fail, 1 skipped. None of the failures is in FU-4's code or touches the composer:**

- **`tests/guard/no-outside-writes.test.mjs`:** the pip bytecode cache written at 04:25:08Z (open issue 1).
- **Four planner tests:** two property tests, `planner-gspec` "the approved v2 is expressible…", and `tests/unit/planner-morph.test.mjs`. They fail on G-SPEC pin checks: "pins.capabilitiesSha256 is "test", not a sha256 digest" and "pins.policySha256 is a placeholder (00000000…)". `planner-morph` does not load.
  - These are FU-3 round 2's in-flight changes to `planner/gspec.mjs`, `planner/morph.mjs`, `planner/policy.mjs`, `planner/lint-copy.mjs` and `planner/policy.json`, modified at 04:42–04:52Z (its tasks: placeholder pins refused by G-SPEC, a real stemmer).
  - FU-4 touched no planner file.
- **The skipped test** is the opt-in 25-minute in-order render (`HM_PARITY_SEQUENTIAL=1`).
- **Every other guard test passes:** frozen v2, app tree, and the determinism scan of `engine/` and `composer/`.
- **Parity (round 2):**
  - G-STATE through the composer and runtime v3: 2,446 rows, 476,585 numbers, **max |Δ| 0**;
  - mesh hashes and sub-frame counts identical; G-CUES byte-equal;
  - "the committed golden direction (specs/golden/t01-v2.direction.json) is exactly what the page composes": no `eyeGate` record, because the approved film's gate closes nothing;
  - the page-composed direction passes G-DIR;
  - **16/16 cold golden frames bit-identical** (tolerance 0/255).
- **Property (round 2):** "G-SPEC 1000/1000; G-DIR ran 1000, passed 1000; compile {"pass":1000}" (198 s, under load). The run that failed did so on its own G-SPEC pins (FU-3), not on G-DIR. The stub-composer wiring test passes.
- **Composer unit tests:** 104/104 (`node render/lib/write-jail.mjs -- node --test tests/unit/composer-*.test.mjs`).
- Round 1, for reference: log `/home/user/hm-work/fu4/hm-test-default.log`, 601 tests, 599 pass, 1 fail (the `.git/info/exclude` finding), 1 skipped.

Other checks:

| Check | Command | Result |
|---|---|---|
| Goldens | `node cli/hm.mjs golden verify` (log `/home/user/hm-work/fu4r2/golden-verify.log`) | round 2: all committed files and 16 PNGs ok; tolerance 0/255 and 1e-9 |
| QA on the approved master | `node cli/hm.mjs qa v2 --out /home/user/hm-work/fu4r2/qa-v2` | round 2: **PASS** (23.7 s). G-DIR pass with 0 errors in 288 ms; warnings: reading-clear, glass-rail, c1-kink ×2, spin-ramp-change and absolute-layers. G-COST pass |
| QA on the M0 audit's farm render of T01 (G15 against real segment timings) | `node cli/hm.mjs qa /home/user/hm-work/fu4/qa-t01/target.json` (the audit's target, paths made absolute) | round 1: **PASS** (22.3 s). G15: "actual 482 s of segment render time (1 worker(s), profile final) vs predicted 542 s (final): −11 %" (warn above +30 %). G-COST is unchanged in round 2 |
| 300 planned specs, per channel | `node /home/user/hm-work/tmp/fu4r2/c1-survey.mjs 300` (result `/home/user/hm-work/tmp/fu4r2/c1-survey-300.json`) | round 2: 0 errors. Kinks above 0.05 × occur only in `env.breath` (1.26 ×) and `body.inflate.breath` (0.78 ×). `safety:spin-ramp-change` warns on all 300 (the same orbit stop). No eye-gate closures, because the planner samples gag intensity 0.8–1 |
| The verifier's probes | `node render/lib/write-jail.mjs -- node /home/user/hm-work/verify-fu4/probe7.mjs` and `probe5.mjs`; `node render/lib/write-jail.mjs -- node /home/user/hm-work/tmp/fu4r2/gentle.mjs` | round 2: TURN-SQUEEZE exit `alert`, R-BREATH entry `alert` and LP-RETURN entry `alert` each give one `face.eyeOpen` error on Noomi, the same as on an open-socket face. R-BREATH exit `content` names `face.eyeOpen` and `face.mouthSmile`. The gentle gag records `[{"t":0.4,"by":"G-JOLT","asked":1.32,"k":0.3,"gate":0.5}]` and has 0 errors; without the record it has 4 pose errors |
| Frozen v2, live app, write audit | `node cli/hm.mjs guard` (log `/home/user/hm-work/fu4r2/guard.log`) | round 2: frozen v2 ok (tree 8d0627dfee6d), live app untouched, no repository changes outside the studio. The write audit has 1 finding, the pip cache (open issue 1) |

## Deviations

1. **`pose:mismatch` (a warning on declarations) is replaced by `pose:entry`/`pose:exit` errors on compiled values.** It now covers the junction (after any bridge) and every declared pose, which is the audit's second point.
2. **One "shut" (eyeOpen ≤ 0.1), a 1e-3 slack, and the eye gate.** These are calibrations of the pose table, not of the golden; reasons and measurements are in section 1. Without them, compiled checks made two composer tests' legitimate directions fail to compile: a gentle gag under the app's own eye gate, and a performer at tempo 0.8. In round 2 the eye gate holds only where a recorded closure shut the eyes. All three are listed as provisional in OWNER-DECISIONS Q5 ("FU-4 additions").
3. **Two test fixtures declared poses their compiled channels did not hold.** The new semantics catch that, so the fixtures were made honest. Neither test changes what it checks.
   - `composer-personality` "intents expand…": TEST-INTENT declared exit `squeezed` but held surprised eyes up to the ritual. It now plays a flash of surprise as the stop hits, then TURN-SQUEEZE's own squeeze.
   - `composer-poses`: the bridge fixture TEST-TURN-OPEN now lets the escalation's brows go, as a turn must. The version that does not is the new defect test.
4. **C1's error limit is calibrated on v2, at the breath envelope only (round 2).** The plan's strict C1, 0.05 × the channel's range per second, is the error limit on every channel. That figure is FU-4's numerical reading of "C1 continuity"; everything in v2 outside the breath envelope measures under 1e-5 ×. The exception is the break points of the calibrated envelopes (`c1CalibratedEnv: ['breath']`: `env.breath` and whatever it scales). There the error limit is 1.5 ×, because v2's breath handover is 1.26 ×, and 0.05 × warns. Round 1 had applied 1.5 × to every channel, so a new move with a 0.05–1.5 × kink anywhere would only have warned; the new strict-C1 test shows v2's handover copied onto the tremble envelope is now an error. Over 300 planned specs, the only kinks above 0.05 × are the breath envelope's (1.26 ×) and the body's breath sine (0.78 ×). Listed in OWNER-DECISIONS Q5.
5. **The spin-ramp limit is one figure per spinning thing:** the inOutSine-equivalent ramp of its top speed against its steepest speed change. Measured per speed change, v2 fails: the orbit loses 0.101 turns/s in 0.37 s at the turn's stop. Within that change it is a 0.29 s ramp; round 1 quoted 0.23 s against the whole motion's steepest change. The global figure (0.72 s for v2) is the limit. In round 2 the per-change reading is a warning band, `safety:spin-ramp-change` (Q5: the plan's value warns). It appears on v2 and on every planned spec, because all of them use the orbit. Listed in OWNER-DECISIONS Q5.
6. **`compose.js` and `acting/bridge.js` are WP-03 files.** The fix needs both: the composer must hand the built channels to `planBridges`, and the bridge must write the planned keys. The changes are limited to that. In round 2 the narrow eye gate also needs `personality.js` (the personality pass records intents' closures), `G-JOLT.js` (one argument, its snap time), `compose.js` (`makeCtx` records the moves' closures; `provenance.eyeGate`) and the direction schema. No compiled value changes. The golden direction file is unchanged, because the approved film's gate closes nothing.
7. **G-COST's `predictedMin` is now the wall clock** (render plus overhead), because the plan's budget is a wall-clock figure. The new `predictedSec` remains the render time QA's G15 compares with.
8. **The verifier's close-up and pulse findings (round 2) change no code.** Both rules follow the plan's literal trigger: "a disc covers more than 25 % of the frame" and the realm presets' pulse ramps. Open issues 4 and 6 record what the Zuzu and realm packages must decide.

## Open issues

1. **`hm guard` is red, not because of FU-4.**
   - **Round 1's finding is closed.** That was `.git/info/exclude`, written at 01:26:53Z by the workflow orchestrator together with `hushmallow-infinite-studio/.workflows/m0fu-m1.js`. FU-1 round 2 reviewed exactly that write and re-armed at 2026-10-15T04:11:45.541Z; its reason is recorded in `qa/guard/outside-writes.json`.
   - **New finding:** `written: /usr/lib/python3/dist-packages/pip/_internal/commands/__pycache__/list.cpython-313.pyc [2026-10-15T04:25:08.885Z]`. That is Python's bytecode cache for pip's `list` command, so somebody ran `pip list` outside the write jail.
   - **Evidence it is not FU-4:**
     - FU-4 ran no pip command. Its Python one-offs import only `re` and `json`, whose bytecode already exists.
     - Every FU-4 node run was jailed (`write-jail.mjs`, `hm`).
     - The concurrent FU-3 round-2 work (a stemmer for the copy lint) has a `WORK/tmp/fu3r2/dl/` directory holding `wordlist-english-1.2.1.tgz`, created at 04:26:51Z, 103 s later.
   - **What the file is:** an honest compile. Its header matches the unchanged `pip/_internal/commands/list.py` (magic number, source mtime 2025-09-22 and source size), checked with a `python3 -I` header read.
   - **What the integrator should do:** review it once FU-3 round 2 finishes and re-arm with `node cli/hm.mjs guard --arm --reason "..."`. FU-4 did not re-arm over another package's in-flight write.
2. **G15 assumes one worker.** QA sums every segment's time. With 2 workers on 4 cores the segments stretch: 956.8 s summed against 539.5 s on one worker (`verify-wp02/final-2w`), so G15 would warn at +76 %. QA (WP-05) should compare per worker count, or the farm should record its parallelism factor.
3. **The overheads were measured with the WP-02 farm,** which encoded the QP 15 master alongside the render. FU-5's CRF 16 master over near-lossless intermediates changes the encode tail. Refit `overheadSec` from FU-5's T01 final render; G15 reports the render part on every QA run.
4. **The face spiral's spin limits are untestable today, and the close-up limit cannot fire for it (Zuzu, WP-50).**
   - `face.spin` is not in the channel catalogue yet; the Zuzu work package adds it. The spin rule already reads it, but a direction carrying it fails `structure:unknown` first, so only the prop branch can be tested today.
   - The close-up limit (0.3 turns/s) follows the plan's trigger, a disc covering more than 25 % of the frame. For `face.spin` the disc is both eyes, about 3 % of the frame, and zoom is capped at 1.10. So for Zuzu's spiral, the case the plan's spin rule exists for, the close-up limit cannot fire. Only the 1 turn/s limit and the ramps apply.
   - If the spiral needs close-up protection, WP-50 has to pick another trigger, such as the face box's share of the frame or a lower cover for spirals, and record it as an owner decision.
   - The close-up test reaches 25 % only by inflating the orbit ellipse (rx 540, ry 420).
   - The plan's "whole number of turns per loop" belongs to WP-50 too.
5. **The pose table is partial by design.** A move that replaces a slot must leave every channel the downstream poses ask for. The compile error names the last writer, but it surfaces at the first junction with no room, which can be several moves later. WP-13 should expect `pose:no-room` from new cells that forget to release brows or the mouth.
6. **Pulse ramps cover `pulse` channels only (realm packages: WP-14, WP-20, WP-55).** `safety:pulse` measures every channel of type `pulse`; today that is only `mallow.glowPulse`. The realm presets' 'strike' pulses (Moonmilk's falling star, WP-20; Static Storm's slow glow, WP-55) have no representation yet. When a realm package builds them, it must either write them as `pulse` channels or extend `pulseChecks` to its own channel type, so that the ≥ 150 ms ramp is measured on them.
7. **A closure holds until the next key on `face.eyeOpen`, across move boundaries.** Any move that leaves the eyes alone after a closure inherits it. Today that is the aftermath, which skips its openings exactly because the gag's eyes were gated (`gag.eyes`), and then M-ORBIT's entry, until M-ORBIT keys the eyes. This is the intended reading: the gate kept them shut, and nobody has opened them since. A stricter reading would let a closure hold only inside its own move's window. If WP-13 needs that, the aftermath would record its own skipped openings through `ctx.personality.eyesOpen(k, value, t)`, and `eyeGateAt` would cut each hold at the end of its writer's window.
