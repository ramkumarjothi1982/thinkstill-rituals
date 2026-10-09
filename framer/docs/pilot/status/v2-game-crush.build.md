# v2 CRUSH (id 2) "The Press": build report

**Builder:** game builder for CRUSH, Pilot A v2 (from-scratch redesign).
**Date:** 2026-10-09.
**Spec:** `PILOT_A_ADDENDUM.md` §Shared and §CRUSH, layered on `PILOT_A_SPEC.md` §3.3, under the Emotional Shift Standard, F6, F7/C2, F8 and F9.
**Branch:** `claude/jolly-hopper-ognrxj`.

**Files:**
- `src/pilot/74_pilot_crush.jsx` is a full rewrite. The old draft had never run in a browser; its zero-commit-per-tap idea, its play-box geometry approach and its cue tables were kept.
- `71_pilot_fx.jsx` and `70_pilot_core.jsx` are **unchanged**. Every shared system already existed and is reused by name: S2′ `useEosPilotFinale({settle:true})`, S7 `eosPilotMirror`, S8 `useEosPilotBreath`, S9 `stage.shift`, S10 `EosPilotFace` / `eosPilotFacePics` / `eosPilotFaceHost`, S11 `eosPilotRunSeed` / `eosPilotPickRun`, and S4 noise and swell. Because 71 and 70 did not change, POP and CLEANSE did not need re-checking.

`?pilot=off` still plays the original CRUSH to the reveal with 0 errors.

## What was built, beat by beat

### Mirror (0 to 2 s)

**The workshop opens in the player's own weather.** There is no neutral first frame: the S7 tint is joined by CRUSH's own props, each fading with `--calm`.

| Emotion | Workshop | Bed (S4 tones, logged) |
|---|---|---|
| anger | furnace glow, red beacon spinning, gauge needle rattling in the red, steam jets from the pipes | furnace roar and clank |
| panic | beacon at 2×, conveyor stutter, lamp buzz (flicker ≤ 4% opacity, under 3 Hz), faint alarm wash (≤ 4%) | two-tone alarm and hiss |
| sad | cold blue-grey night, a pipe dripping into a bucket, the lamp flickering dim | plink and a low hum |
| anxious | violet, a loose sparking wire, a twitching gauge, a clattering wall fan | buzz and ticks |

**The first blob arrives with the player's own picture and words.**
- From 300 ms, blob 1 tumbles out of the hatch, rolls along the belt under the press and squashes to a stop.
- It is a jelly blob, D 150 at 390 and 187 at 1280. The F8 negative picture sits inside it, with the player's words below the picture, also inside.
- Each hatch rattle stands for one blob still to come, and the hatch's queue lights show the same count.

**The blob's take (from about 820 ms), by emotion:**
- **anger:** fists up, stomps twice, steams.
- **panic:** braces, bounces nervously, eyes dart (the picture jumps left and right), sweat drops.
- **sad:** deflates and sags.
- **anxious:** peeks, fidgets and wobbles.

At about 1000 ms it glares up at the jaw, then looks back at the camera with one small nod.

**Input timing.**
- Taps count once the blob has landed.
- The `CRUSH ×4` marker goes live at 1400 ms.
- There is no text other than the player's words.

### Release (premium game feel, with zero React commits per tap)

**One slam:**
- **Pointerdown:** the slam is counted synchronously, through attribute writes only.
- **Jaw:** it twitches up 4 px, then drops (0–30 ms). At impact there is a hit-stop of 40 ms, or 70 ms on a heavy hit, where jaw and blob hold the impact frame.
- **Blob:**
  - It braces with its arms up against the jaw, then squashes to c = .22, .42 and .60 on slams 1–3.
  - **Resistance:** on slams 1 and 2 it pushes the jaw back up 10 px with a jelly rebound and a "boing". On slam 3 it gives in.
  - Its heat (`--heat`) drops a quarter per slam, so the jelly cross-fades from the emotion's colour to its own calm hue. The object's colour is the meter.
- **World:**
  - Red-hot goo arcs into the heat tray.
  - The play plane shakes ±3 px, or ±6 px on a heavy hit.
  - The three nearest gallery members wince.
  - The gauge needle kicks.
  - The jaw's edge glows amber during the heavy window, and a soft tick sounds when the window opens.
- **Tempo by emotion:**
  - The heavy window is 180–320 ms for anger, 600–900 ms for panic and anxious, and 400–700 ms for sad.
  - The jaw's recoil is 210, 470, 470 and 340 ms respectively, so panic and anxiety get slow, exhale-paced slams.

**The 4th slam (SPLAT):**
- The jaw holds down for 120 ms on a pancake.
- A 10-drop goo ring flies out, and the picture flips to the slot's **positive relief variant** (`relief[slot]`).
- An ember drops into the tray.
- The one arcade `p.sfx("pop")` fires, then `onProgress`. Neither happens on the last word.

**After the 4th slam:**
- At +350 the jaw lifts and the blob pops back round and waves.
- It then rolls right, rides the wall lift up and slides into its gallery slot. Its word fades: "the word was squeezed out".
- Meanwhile the next blob tumbles out of the hatch.
- The hand-over takes about 800 ms with no marker. Taps in that window are not counted; they get a jaw twitch, a soft hiss and a flinch from the waiting blob.
- A miss (an empty tap more than 28 px from the press) gets a clank and a curious tilt from the blob.

**Surprises (S11 seed):**
- **Bouncer:** once per run, never in round 1 or the hero's round.
  - On slam 2 the blob squirts out sideways, bonks off the wall, arcs back and lands dizzy, with spinning stars and a wobbling picture.
  - The gallery's heads follow it, and the slam still counts.
  - The marker is hidden during the 760 ms flight, and taps in flight are not counted.
- **Gauge pop:** three heavy hits in a row make the needle spin twice. The gauge glass pops off with a steam puff, and the gallery cheers.
- **Workshop cat:** a ginger cat sleeps on the gantry or on the hatch roof (the perch varies by run).
  - On the first heavy hit its ear twitches; on the second its head comes up and it glares at the player (meow), then it settles back.
  - **Rare (1 in 6):** it swats the next blob out of the hatch, which arrives fast and spinning.

### Transform (loud to calm, on every release)

`stage.shift(p)` (S9) runs on every word, as a 700 ms tween.

| Progress | Beacon | Lamp | Windows | Pipes |
|---|---|---|---|---|
| 0 | red beacon spinning | sodium (or cold) cone | smog | leaking |
| about 34 | beacon at 50% | warming | smog thinning, 2 stars | |
| about 67 | beacon off | tungsten | clear sky with stars and a moon | stopped |
| 100 | | | | relief puffs |

- **Mirror props:** the furnace, alarm, drip, wire and fan fade, and their loops stop at 67%.
- **Mirror motion:** the tremble, shove, sag or drift scales with `--mot`, which runs from 1 down to 0 by 70%.
- **Incoming blobs:** they arrive less hot as progress rises (the starting heat goes from 1.0 to about 0.66): loud, then soft, then calm-leaning.
- **Breath (S8):** the world breathes: the blob idles, the gallery bobs, the lamp glows and the cat breathes. It slows from the preset's `breath0` to 4000 ms.
- **Bed:** the sound bed's gain eases with progress.

**Measured A3 (wall band, ΔE from the first slam to the charge frame):**
- 390 anger: **46.2**;
- 390 panic: **33.0**;
- 1280 anger: **50.9**.

### Payoff: the game's own climax "Warm Core", then the approved burst

**Set-up** (round N's pop-back +350 to +950, no marker):
- The hero (the last blob, the session's feeling) hops to its watch spot on the belt.
- The tray's embers roll onto the anvil and fuse into a red-hot mass.
- The gallery hops down to a floor row.
- The lights dim, and the jaw rises high and quivers.

**Charged slam** (marker `{g:"holdRelease", ms:900, meter:".eosPilotCrushGauge", mvar:"--charge", win:[60,100], label:"HOLD… SLAM!"}`):
- **Pointerdown:**
  - the gauge ring fills 0 to 100% in 900 ms (`--charge`);
  - the jaw rises a notch every 300 ms;
  - the hero peeks with its arms up beside its face;
  - the gallery leans back;
  - a rising charge tone plays.
- **Release (T0):**
  - Release is T0. A quick tap gives a 40% slam, which still plays the full climax.
  - At 100% held a further 600 ms, the jaw slams by itself.
  - With no input for 8 s, it also slams by itself (logged `auto`).
- **At T0** the marker is stripped synchronously.

**Climax timeline** (S2′ settle, `handoffMs` 2250):

| T0 + (ms) | Beat | What happens |
|---|---|---|
| 0–450 | climax | The jaw falls; impact at 60. A 110 ms hit-stop with a white-hot contact line and a flash. The mass is crushed into a glowing amber cube. The shake is 5–8 px (scaled by charge). 12 sparks fountain. The gallery flinches, then cheers in a left-to-right hop wave. The cat bolts upright. Sound: whoosh, then a 55 Hz boom with body, click and a two-pulse haptic, then sparks. |
| 450–1100 | cube | The jaw lifts with a long hydraulic sigh. The cube trembles. Three cracks light at 600, 800 and 1000 (3 crack patterns by seed). |
| 1100–1400 | split | The cube splits like an egg: the shell halves tip away. The warm core floats up with a heartbeat glow. Warm rays flood the shop and the world shifts to 100. Sound: a warm swell. |
| 1400–1800 | catch | The core arcs to the hero, who lunges and catches it with one of three seeded poses: fumble, one-hand or header-bounce. It cradles the core at its lower front, never over its F8 picture. Sound: bips, then a hum. |
| 1800–2080 | glow | The core lights every face from below. The gallery leans in 6°. The cat curls up at the hero's feet and purrs (120 Hz with 26 Hz tremolo, ending at 2074). Three relief puffs. |
| 2100 | settle | The scene is a still painting: animations are committed or paused, the game's timers and timed sound are cut. |
| 2250 | hand-off | `onDone`, then the approved `RewardSurgeBurst` mega burst (3.0 s), then the reveal. |

**Reduced motion:** cross-fades only. The cube is at 0, the split at 300, the core is in the hero's hands at 600, settle is at 750 and the hand-off at **901** (measured).

## How each standard is met

Evidence comes from Playwright runs on `/tmp/pilot_crush2`, at 390×844 first and 1280×860 second.

| Check | Result |
|---|---|
| A1 F8 (`f8_probe`) | 390 and 1280: **0** noPic, notCircle, cropped, textOverPic, textOutside or darkMask; phase **neg** at the start. With uploads 2, 3 or 6: 0 violations, `upload` class. Text is 15 px at both sizes, inside the host, below the picture. Gallery members and the hero show the positive relief picture, so every face is positive at the climax. Host: `.crBlob.tsFaceObject.tsNoBubbleFace` with `data-eos-pilot-face` and a pinned `data-ts-bubble-index = round % 6`. |
| A2 Mirror (ΔE of the wall band at 1.8 s, 390) | anger–panic 53.7; anger–sad 45.5; anger–anxious 44.2; panic–sad 13.9; panic–anxious 24.0; sad–anxious 29.7. All are at least 12. The words are inside the blob and below the picture in all four. |
| A3 Transform | Background ΔE 46.2, 33.0 and 50.9 (see above). The blob's heat runs loud → calm per slam, and its picture flips negative → positive at the splat. |
| A4 Climax | First painted climax frame: `climaxT − inputT` = **35–208 ms** across 8 runs (frame-bound headless). The climax beat runs inside the pointerup handler. Beat log: `climax@12–25 cube@452 split@1102 catch@1402 glow@1802 settle@2102–2104 handoff@2252–2253` (target 2250 ± 50). 0 warnings. Mega mounts at T0 + 2344–2395. |
| A5 Burst clean | While `.tsRewardSurge.mega` is mounted: **0** running arena animations, **0** visible `.eosMoodFlip`, `data-eos-pilot-hold=1`, **0** step bursts after T0, **0** pilot sound rows after the hand-off. This holds in every run, including 1280 and reduced. |
| A6 Arrows (`f6_probe`) | 390 and 1280: stages `CRUSH ×4` (taps) and `HOLD… SLAM!` (holdRelease with meter), with **0** misses, **0** label mismatches and **0** aim misses; played to the reveal. Fix: the shared fallback `.arena button:not(:disabled)` showed "TAP IT" in no-marker windows (hand-over, set-up, climax, burst), so the mouth carries `aria-disabled` whenever no marker is live. |
| A7 Touch | The slam handler measures 1–11 ms (`state().perf`) and starts its WAAPI animations inside the handler. Paint latency needs a real phone. |
| A8 Switch | `?pilot=off`: the original CRUSH plays to the reveal (finishGame), with 0 errors and 0 arrow misses. |
| Errors | **0** page errors in every run: 390 anger, panic and sad (reduced), forced cat swat, 1280 anger ×2, probes, pilot off. |
| Sound | Scheduling logs only; headless has no audio, so nothing was heard. **Play:** slam, slamHeavy, splat, resist, word (the one arcade pop), tick, twitch, clank, popback, bell, tumble, rattle, boing, bonk, dizzy, gaugePop, cheer, meow, swat, rumble, charge, notch, and the beds. **Climax rows (390 anger):** mega@16 (boom layer @77), sparks@170, sigh@455, crackle@600, @800 and @1000, swell@1104, bip@1632 and @1701, hum@1701, purr@1804. All end by 2100. |

**Compared with the BEFORE sheet** (`dev/shots/quality/sheets/2.png`):
- **Before:** three teal slabs and a tiny faceless orb, a "THOUGHT MOVE · CRUSH 1/4" pill, a dark void, and no climax of its own.
- **Now:**
  - a lit night workshop in the player's weather, with a hydraulic press;
  - red-hot jelly blobs carrying the player's picture and words, which fight back, cool, splat and join a gallery;
  - a cat, a bouncer and a gauge pop;
  - a visible smog-to-stars change;
  - a charged slam that ends in a warm core held by the hero, still behind the approved burst.

## Screenshots

**Committed sheets:**
- `docs/pilot/status/v2-game-crush.after_390.jpg`, 13 frames in this order:
  - the four Mirror frames at 1.8 s (anger, panic, sad, anxious);
  - slam 3 (squashed, cooling);
  - the splat;
  - round 2 with the first gallery member;
  - the set-up (hero hop, mass, gallery hop-down);
  - the charge;
  - the climax at T0 + 1250 (cube with cracks);
  - T0 + 2050 (rays, split shell);
  - the approved burst over the still painting (core cradled);
  - the reveal.
- `docs/pilot/status/v2-game-crush.after_1280.jpg`, 9 frames: slam, splat, round 2, set-up, charge, cube, split, burst, reveal.

**Raw frames (scratch, not committed):** `/tmp/claude-0/-home-user-thinkstill-rituals/b5e1bfa3-ddef-5c62-9291-4d212bc0e4f1/scratchpad/crush/{fa,d2,r3,mir}/`.

## Known gaps

1. **A real phone is needed** for paint latency (A4 and A7) and 60 fps.
   - Headless screencast frames lag by 100–500 ms in the climax; at 1280 the first frames take seconds. For example, the T0 + 2050 frame still shows the core over the anvil.
   - The S2′ settle commits every end state before the burst, so the still painting is correct (the burst frame shows the core in the hero's hands).
2. **Animation count:** the peak running count measured mid-play is 72–90. This includes the CSS idle loops and many tiny goo and gallery nodes, all transform or opacity, and is above the addendum's "≤ 40" guideline.
   - Already trimmed: the dizzy loop and core heartbeat run only when visible, only three gallery members wince, there is no blend mode, and the beam and rays are size-capped.
   - Needs a real-phone fps check.
3. **Sparks:** the climax uses **12** sparks, not 14, because the shared workshop pool has 12 nodes. 71 was not edited.
4. **Untested paths:**
   - The gauge pop was seen at 390 panic, but not at 1280: the headless driver's taps are too slow for the anger window.
   - The cat swat was verified only through the dev-only hook `localStorage eos_pilot_force_2 = "swat"`.
   - The "fumble" catch pose was implemented but not rolled in a recorded run; "header" and "one-hand" were.
5. **Upload removal mid-run is not proven by a test.** There is no probe hook for it, the same as for POP. Pictures are re-read from the resolver whenever the upload key changes.
6. **Word chunks** come from the shared `eosPilotWords` and can split awkwardly (for example "I feel panic I"); this is the shared rule.
7. **Wrapper chrome is unchanged:**
   - the step burst plus the "STILL HIT · CHAIN" toast after non-last words;
   - the companion orb (top right);
   - the guide strip.

   On phone the gallery skips the top-right slot to stay clear of the orb. At 1280 the last floor-row member sits near it during the finale.
8. **Squash and the F8 circle rule:** the picture squashes with the jelly during slams and takes, by the addendum's design. Idle loops keep the picture anisotropy at 2% or less, so rest-state F8 audits pass.
