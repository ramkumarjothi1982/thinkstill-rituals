# Pilot A: build spec for 1 POP · 109 CLEANSE · 2 CRUSH

**Status:** buildable blueprint, v1 (2026-10-09). **Binding:** `docs/CREATIVE_STANDARDS.md`. **Starts from:** `docs/QUALITY_REPORT.md` §8 (P1, P3, P5) and §9 (S1-S6).
**Evidence looked at:** contact sheets `dev/shots/quality/sheets/{1,109,2}.png`, rater rows in `docs/quality/batch_1.json` (1, 2) and `batch_8.json` (109), and catalog rows in `catalog_A.md` L61-62 and `catalog_B.md` L144.
**Owner of this file:** the Pilot A lead designer. Builders change the code, not this spec. If the code proves the spec wrong, note the deviation in `docs/pilot/status/<step>.progress.md`.

What today's screenshots show, so builders know what they are replacing:

- **POP (sheet 1):** six blue-purple gradient spheres sit on the shared nebula and ring stage. The words are about 8 px. The right "feel" bubble is clipped at 390. The "+STILL HIT · CHAIN" toast lands on a live bubble. The only characters are blurred red decals at the edges and head-confetti at the finish. The desktop reveal tile has no card.
- **CLEANSE (sheet 109):** six character spheres have "HOLD TO …" pills that float apart from their spheres. On desktop, 5 of the 6 spheres render as empty dark glass. The lotus reads "0%" while the bar reads 100%. The confetti covers the pills. The reveal never appears.
- **CRUSH (sheet 2):** a 30 px face sits in a dark chip between two teal slabs that never move. You tap a full-width "THOUGHT MOVE · CRUSH n/4" pill instead of the object. The bar reads 45% while the counter reads "1/6". On phone, the reveal card and a giant face are clipped off the right edge.

---

## 0. Ground truth from the code (builders must respect these; verified by grep, line numbers as of today)

| # | Fact | Where | Consequence for the pilot |
|---|---|---|---|
| G1 | `dev/pilot_build.py` adds `const PE = EosPilotEngineFor(p.game); if (PE) return <PE {...p} />` at the top of **both** `RoutedGameContentLegacy` (ids < 100: POP, CRUSH) and `RoutedGameContent` (ids ≥ 100: CLEANSE). | pilot_build.py `HOOK` | The pilot engine receives the **wrapper's** `ep` props: `game, entries, imageSrc, imageSources, hasUserImages, sfx (wrappedSfx), onDone (wrappedDone), onProgress (reportProgress), reduced, rainSfx, tapOutBpm, bubbleTextPx, variationSeed, finishHoldMs`. |
| G2 | The engine's root is rendered as `{content}` directly inside `.cinematicContentShell` (00_arcade L18847), after the LIVE GUIDE. | GameEngineLegacy / GameEngine | The root **must** be `<div className="arena …">`. Arrows look for `.cinematicContentShell > .arena`. |
| G3 | `wrappedSfx(kind)` calls `p.sfx(kind)`, then `triggerStepReward()` (the "+STILL HIT · CHAIN" toast, haptic and chain HUD) unless the game uses explicit progress and `kind === "soft"`. **For non-explicit games it also adds `gameProgressStep(game)` to the bar.** | L18554, L19718; `usesExplicitProgress` L3619 | POP (1) and CLEANSE (109) are explicit: `sfx` never moves the bar. **CRUSH (2) is not explicit (E02, +15 per sfx call)**. See G4. |
| G4 | In the pilot and release builds, I1-E7/E8 route progress through `eosGateProgress` (60_eos_fixes L47). Engine reports are monotonic (`max(cur, v)`), and each sfx call "creeps" the bar to `min(cur+15, ownReported+12, 96)`. | 60_eos_fixes.jsx | **CRUSH rule:** call `p.sfx` **once per word**, at the word's completion, **then** immediately `onProgress(k/N·100)`. Never send partial per-hit progress, or the creep pushes the bar ahead of the counter. Every other CRUSH sound goes through `eosTone` (S4). |
| G5 | `wrappedDone` sets the bar to 100, shows the finish copy, plays `sfx("win")` at 0, 170 and 340 ms, and calls the real `onDone` **`finishHoldMs` later**. The root passes `finishHoldMs = 3000` for these ids. | L18563-18595, root L22112 | Reveal = pilot hand-off + 3.0 s. The pilot calls `onDone` at its hand-off beat (S2), never at the end of its finale, and never calls `p.sfx("win")` itself. |
| G6 | The step and finish toasts (`.globalStepFeedbackCopy` and `.globalFinishFeedbackCopy`) are positioned at the **last pointer position** (`--fx-x` / `--fx-y` inline, set by `onPointerDownCapture` on the shell). This is why they cover the object just tapped. | L18435-18456, L18873-18896 | S6: the pilot docks them to a top band inside pilot arenas with scoped CSS (`!important` beats the inline vars). First check whether the readability module (W0-1) already docks them. |
| G7 | Arrows (30_eos_arrows `resolve`, L860) check **`[data-eos-target="1"]` markers first for every id, including 1-110**. Only after that do they read `EOS_GESTURES[id]`, and only then the fallback list (`.arena button:not(:disabled)`, inline `touch-action: none`, …). Class names matching `/popped\|gone\|released\|done\|isGone…/` are treated as dead. The `dev/eos_drive.mjs` `finishGame` uses the same order. | 30_eos_arrows L860-930; eos_drive L278-300 | The pilot marks **exactly one live target** with `{...eosTarget(spec)}` (core L719). Whenever no target is live, no enabled `<button>` and no inline `touch-action` may exist in the arena (use classes). Dead items get the class `isGone`. **Do not mutate `EOS_GESTURES`.** |
| G8 | The mood flip-bloom (14_eos_mood) fires when `.globalPlayGuide.isComplete` (progress ≥ 100) or `.tsRewardSurge.mega` first appears. It treats `[data-eos-avoid]`, `[data-eos-char]` and visible pictures as obstacles. The colour-script grade (soft-light, z 54) sits over the game for the whole play. | 14_eos_mood header | Progress reaches 100 **only at the hand-off beat**. The finale hero and climax object carry `data-eos-avoid` and `data-eos-char`, so the bloom crowns around them. In-world palettes are tuned to read under that grade. |
| G9 | `eosTone` and `eosAudio` are gated by `EOS_STORE.get().sound`, which mirrors the arcade sound toggle (I1-E14). The arcade `sfx` (`useSfx(sound)`) is gated by the same toggle. Arcade kinds: `tap pop soft win chime bell plink clack hum spark tone`. | core L931-964; arcade L2628 | Both of S4's paths respect the sound toggle. |
| G10 | CLEANSE's reveal bug: the finish `useEffect` sets `finishLock`, then schedules `onDone` 2.2 s later. Its cleanup clears that timeout whenever a dependency re-renders, and the lock stays set, so `onDone` never fires. Also 6+ character images decode at once on mount. A 3.2 s visual hold (`cleanseStepVisualHoldMs`) sits between releases. | L6164, L6292-6299 | S2 owns `onDone`. Its timers live in a ref and are cleared **only on unmount**, and the lock is set when the call actually fires. S1 decodes faces before showing them and never shows an empty sphere. |
| G11 | Per-game facts to keep: POP batches words `MAX_VISIBLE_WORD_BUBBLES` (10) at a time, shows "POPPED k / N" and is explicit. CLEANSE takes 6-10 words via `wordsFor`; its pills read `HOLD TO ${releaseEmotionProfile(entries).actions[i]}` (emotion-aware), and it is in `EOS_SLOW_IDS`. CRUSH plays 4 taps per word over every entry ("CRUSH n/4", round "k/6"), is in `EOS_DISCHARGE_IDS`, and its mind bend is "It looked solid. It wasn't." | L4063-4256, L6143-6475, L15078 | See the preserved-features table (§1.3). |

---

## 1. Goals and acceptance

### 1.1 Goals

Make the three pilot games feel like premium Pixar/Netflix interactive pieces on a phone first. That means four things for each game:

- **Its own world:** an environment kit with depth, light and particles.
- **In-world characters as participants:** they react to every input, their face is driven by progress, and they celebrate.
- **Its own finale:** under 5 s, skippable, with a reduced-motion variant, and the shared bloom only as a supplement.
- **Clear differences from its look-alike cluster.**

At the same time, prove the reusable systems S1-S5 (plus the S6 chrome hooks) so the rollout can reuse them per game, customised and never stamped identically.

### 1.2 Rubric target (phone 390×844 first, desktop 1280×860 second; independent raters; owner approves)

| Axis | POP today | CLEANSE today | CRUSH today | Target, all three, both sizes | What earns it here |
|---|---:|---:|---:|---:|---|
| A Light & polish | 4 | 5 | 3 | ≥ 8 | Key and rim light from one stated direction, materials (soap film, glass and water, brushed steel), static depth of field |
| B Distinct world | 2 | 4 | 2 | ≥ 8 | Sky, pool and workshop kits fill the arena; no nebula or ring stage inside it |
| C Interaction feel | 5 | 5 | 2 | ≥ 8 | Anticipation, squash, impact and recovery on every input; sound ≤ 50 ms; direct manipulation of the object |
| D Characters | 2 | 3 | 2 | ≥ 8 | S1 actors in the world, a reaction per input, face steps driven by progress, celebration, never ending distressed |
| E Unique finale | 3 | 3 | 2 | ≥ 8 | The per-game shot lists in §3 |
| F Clarity | 6 | 5 | 4 | ≥ 8 | The target is the object; the arrow sits on it; the label is bound to the object; no toast covers it |
| G Mobile | 3 | 5 | 3 | ≥ 8 | Targets ≥ 64 px in the thumb zone, words ≥ 15 px, nothing clipped, finale composed for portrait |
| H Relief fit | 5 | 6 | 3 | ≥ 8 | POP calms anxious tugging; CLEANSE paces an exhale; CRUSH gives a physical discharge followed by warmth |

### 1.3 Preserved features (Standard 7: redesign, never remove)

| Feature | POP (1) | CLEANSE (109) | CRUSH (2) |
|---|---|---|---|
| Progress bar / HUD (`.engineProgressHud`) | `onProgress` on every pop; label `n% POPPED` | `onProgress` on every release; label `n% CLEANSED` | `onProgress` on every completed word; label `n% CRUSHED` |
| Round / step counter, in step with the bar | `POPPED k / N` pill (same words as today) | `k / N CLEAR` pill (new; today only the guide said "x% cleansed") | `k / N` round pill, plus `CRUSH n/4` stamped on the press gauge |
| LIVE GUIDE + MIND BEND (wrapper) | kept; hint "Tap a bubble to pop it" (S6 hint patch) | kept; hint "Hold an orb… then let go slowly" | kept; hint "Tap the blob: 4 slams each" |
| Guide arrows (30_eos_arrows) | marker `{g:"tap", L:"POP IT!"}` on one bubble | marker `{g:"hold", ms:900, mvar:"--hold-pct", L:"HOLD… THEN LET GO"}` on one orb | marker `{g:"taps", n:4, L:"CRUSH ×4"}` on the blob |
| Sound + sound toggle | `p.sfx("pop")` on each pop, plus `eosTone` layers | `p.sfx("soft")` at hold, `p.sfx("pop")` at release, plus `eosTone` layers | `eosTone` per slam, plus **one** `p.sfx("pop")` per word (G4) |
| Step reward toast, chain HUD, haptics | kept (via `p.sfx`); toast docked (S6) | kept; docked | kept, **once per word** (less spam); docked |
| Reveal hand-off | S2 `onDone` once; reveal ≈ 4.3 s after the last input | **fixed** (G10) | kept; phone reveal overflow is W0-2's job, flagged in §5 |
| User's own words ≥ 15 px | on the soap film, 15-17 px, dark ink | below each orb, 15 px, plus the action caption at 12 px | on a stamped tag below the blob, 15-17 px |
| User-uploaded images (`hasUserImages`, image-only entries) | an image fills the bubble or the hero ball (circular) | the image replaces the orb's face | the image replaces the blob's face |
| Emotion-aware copy | — | `HOLD TO <ACTION>` captions from `releaseEmotionProfile(entries).actions` | — |
| Word batching | waves of ≤ 6 bubbles (today: batches of 10, kept as waves) | waves of ≤ 6 orbs | rounds = entries (≤ 6; the tail is joined on the last tag, wrapped) |
| Shared supplements | mood grade, flip bloom, Still Point dust, check-in and shift meter, rewards: all untouched | same | same |
| Safety | words via `eosWords` (neutral words under strong flags) | same | same |
| Keyboard | Tab to a bubble, Enter/Space pops it | Space/Enter held = hold | Enter/Space = slam |
| `?pilot=off` / `localStorage eos_pilot=off` | the original game | the original game | the original game |

### 1.4 Acceptance checks (each must pass at 390×844 **and** 1280×860)

- **F1 Plays through.** `finishGame(page, id)` reaches the reveal with `assertArrows:"auto"` and no page errors. Also play once by hand (a scripted pointer sequence) in reduced motion.
- **F2 Progress.** `progressLog` is monotonic.
  - During play, `|bar − k/N·100| ≤ 100/N`.
  - The last input reports `EOS_PILOT_FINAL_PCT` (96). Exactly 100 arrives only at the hand-off.
- **F3 Hand-off.** `onDone` fires exactly once. Last input → hand-off is 1300 ms (800 in reduced motion), so the reveal follows ≤ 4.5 s after the last input. A tap during the finale skips to the hand-off at once.
- **F4 Arrows.** While any target is live, a marker sits on a live target, and `arrowState(page)` aims inside its rect.
  - With no live target (round transitions ≤ 1.2 s, finale), the arena holds no enabled `<button>` and no inline `touch-action`, so no fallback "TAP IT" arrow can appear.
- **F5 Switch.** `launchEos({query:"pilot=off"})` plays the original for each id.
- **F6 Sound sync.** For every input-driven cue in `eosApi("pilot").soundLog()`, `dt = t − inputT` ≤ 50 ms (p95; report the max).
  - With sound off, rows log `muted:true` and no AudioContext output happens.
- **F7 Reduced motion.** `reducedMotion:"reduce"`: no running transform animation on actor bodies (`document.getAnimations()`). Faces and progress still change; the finale cross-fades.
- **V1 Text sizes.** `smallText(page, 12)` returns nothing in the pilot arena, and every user word is ≥ 15 px (computed).
- **V2 Bubble rules.**
  - Every actor image is circular (`border-radius: 50%`, `overflow: hidden`) with no dark plate behind it: the ball's own background luminance must be ≥ that of the stage behind it.
  - Every label is below its image with a gap ≥ 4 px, and no rects intersect.
  - Every actor and target rect lies inside the arena rect at both sizes, including sway and squash extents.
- **V3 Toasts.** No `.globalStepFeedbackCopy` or `.globalFinishFeedbackCopy` rect intersects the live marker's rect or the finale hero's rect.
- **P1 Performance.**
  - ≤ 40 running animations in the arena at any sampled frame of play and of the finale (WAAPI plus CSS, `document.getAnimations()`).
  - Only `transform`, `opacity` and (for the hold fill) `clip-path: inset()` are animated. No `backdrop-filter`, no live `mix-blend-mode` and no animated `filter` in the pilot.
  - ≤ 1 React commit per input. No input-caused long task > 200 ms (headless caveat recorded).
- **Premium.** Independent raters re-score phone first: ≥ 8 on every axis A-H. The owner plays the build and approves.

### 1.5 Approval package (CREATIVE_STANDARDS "Pilot approval package")

For each game, the reviewers produce:

- before/after shots at 390 and 1280 for start, mid, finish and reveal, plus four finale frames (T0+0.3, +0.9, +1.8, +3.0 s);
- the playable build (`/tmp/pilot_<you>/index.html`, plus the Framer `.txt` from the release build step);
- a phone-size recording of the full game and finale;
- an Event Timing input-latency table and a frame-time distribution (p50 / p95 / long frames) for play and finale;
- the sound log (§2 S4);
- the distinctiveness paragraph (the last item of each game section below).

---

## 2. Shared systems API (file `src/pilot/71_pilot_fx.jsx` unless noted)

**Conventions for all of S1-S6:**

- No imports. Every top-level name is prefixed `EosPilot`, `eosPilot` or `EOS_PILOT`.
- Read-only use of core and arcade globals: `React, motion, EOS_EMO, EOS_GUIDE_CHAR, EOS_CHAR_NAMES, EOS_WIN_FACES, eosFace, eosFacePool, eosCurrentEmotion, eosDetectEmotion, eosWords, EosWord, eosTone, eosNote, eosHaptic, EOS_HAPTIC, eosBreathOwn, eosTarget, eosCss, eosExpose, eosApi, eosNoise, eosClamp, EOS_STORE, isImageOnlyEntries, releaseEmotionProfile, displayText, pct`.
- CSS goes in through `eosCss("<name>", css)` at module top level. Every selector is scoped under `${EOS_A} .eosPilotArena`. Use classes for `touch-action`, `user-select` and the hold cursor, never inline styles (G7).
- **Refs, not state, for motion.** Per-frame and per-event visuals use WAAPI (`el.animate`) or CSS classes and vars written straight to the DOM. React state changes at most once per input (counter, phase).
- A user's words render only through `<EosWord>` inside a container that spreads `EOS_PRIVATE_ATTRS`.

### S1 · `EosPilotActor`: the character reaction layer

```jsx
const actor = React.useRef(null)
<EosPilotActor
  ref={actor}                    // React.forwardRef → imperative handle (below)
  role="holder" | "inside" | "breath"
  emotion={emotionId}            // EOS_EMO id; default eosCurrentEmotion() || "auto" (STILL)
  char={undefined}               // override: sync|rush|glitch|loopie|drop|patch|still
  image={null}                   // user-uploaded src; replaces the face, steps then show via halo/tint/pose
  size={112}                     // px at a 390-wide arena; actual = size × clamp(u, 0.85, 1.35), u = S5 box scale
  progress={0}                   // 0..100 → face step (≤ 1 prop change per input)
  label={undefined}              // caption BELOW the ball (≥ 12 px; a user word uses EosWord at ≥ 15 px)
  sub={undefined}                // second caption line (e.g. CLEANSE "hold to calm"), ≥ 12 px
  avoid={true}                   // data-eos-avoid + data-eos-char for the mood bloom (G8)
  reduced={false}
  className, style               // placement: left/top % of the play box via CSS vars
/>
```

**DOM (fixed, so every game composes the same way):**

```
.eosPilotActor[data-role][data-step]
  .eosPilotActorPos
    .eosPilotActorIdle
      .eosPilotActorBody
        .eosPilotActorBall
          img.f0
          img.f1
          i.gloss
          i.quirk
          (+ role parts)
    .eosPilotActorLabel
```

- `.eosPilotActorPos` holds the placement translate.
- `.eosPilotActorIdle` runs the CSS idle loop and the quirk.
- `.eosPilotActorBody` takes the WAAPI reactions; transform-origin is bottom-centre.
- The two face images cross-fade.
- The label is a sibling of Body, so text never squashes. It sits ≥ 6 px below the ball and has no background box (text-shadow only).

**Ball:** `border-radius: 50%; overflow: hidden`, a light glass gloss (a radial highlight at the kit's key-light position, `--eos-pilot-key-x/y`), and a rim light from `--eos-pilot-rim`. **Never a dark plate, capsule or square.**

**Imperative handle**

| Method | Effect | Default timing (games may override) |
|---|---|---|
| `emit("press", {dir:[x,y]})` | anticipation: squash to 0.92 × 1.08, lean 4° toward `dir`, face "widen" (face image scale 1.04) | 80 ms, ease-out |
| `emit("hit", {strength 0..1, dir})` | recoil: squash to 1+0.15s × 1−0.15s, then spring back with overshoot 1.04; shake ±(2+4s) px if s > 0.7; flinch (face squint, scaleY 0.92) | impact 0-120 ms, recover 120-420 ms |
| `emit("miss", {dir})` | head-shake ±6° and a sheepish tilt; face holds the step-1 (soft) image for 600 ms | 200 ms + 600 ms |
| `emit("inhale", {ms})` / `setBreath(f 0..1)` | breath role: scaleY 1+0.08f, scaleX 1−0.04f (CSS var `--b` on Body, compositor) | follows the hold |
| `emit("exhale", {ms})` | squash-y 0.92 → stretch 1.04 → settle, plus one sigh-puff particle | 500 ms (or `ms`) |
| `emit("round")` | 12 px hop plus a face step check | 260 ms |
| `setTug(t 0..1)` | holder role: sway amplitude 6°·t; period 1.6 s → 3.2 s as t falls | CSS vars |
| `setCompression(c 0..1)` | inside role: scaleY 1 → 0.22, scaleX 1 → 1.5 about the bottom; dizzy stars (3 nodes) at c ≥ 0.5 | 0-60 ms per change |
| `emit("popBack")` | inside role: 0.22 → 1.15 → 1 spring | 420 ms |
| `emit("finish")` | crouch 0.9 × 1.1 → jump with stretch 1.2 (−40 px) → land squash 1.12 × 0.88 → settle → `gesture` (spin 360° / wave / heart, per game); then idles at the win face through the reveal | 140 + 220 + 120 + 300 + 500 ms |
| `anchor(name)` | `{x, y}` in arena px for `"hands"`, `"centre"`, `"top"`, `"feet"` | — |
| `el()` | the root element (for marker spreading, rects) | — |

**Face step (driven by progress, never by the word):** `eosPilotFaceStep(p)` returns:

- 0 (loud) for 0-33;
- 1 (soft) for 34-66;
- 2 (calm) for 67-99;
- 3 (win) at 100, or whenever `emit("finish")` runs.

`eosPilotFaceSrc(char, step, emotion)` gives:

- step 0: `EOS_EMO[e].loud` (else `EOS_GUIDE_CHAR.loud`);
- step 1: `EOS_PILOT_SOFT_FACE[char]` (start from the first id of `eosFacePool(char,"positive")` that is not the calm id). **The builder verifies the 7 soft faces on one contact strip** and records the ids in the table;
- step 2: `EOS_EMO[e].calm`;
- step 3: `EOS_WIN_FACES[char][seed % n]`.

The step is a 240 ms cross-fade between `img.f0` and `img.f1`. With a user image, the face stays; the step shows instead as halo warmth (glow hue loud → calm), posture (the tilt eases) and the end of the quirk.

**Preload:** at mount, decode all 4 step faces of every actor in the game (`new Image(); img.src; img.decode()`). Show the face only after decode. Until then the ball shows its hue gradient and the character's initial, **never an empty dark sphere** (G10).

**Idle quirks** (≤ 3 nodes, CSS only, fading out by step 2):

| Character | Quirk |
|---|---|
| RUSH | 2 steam puffs |
| SYNC | heartbeat scale pulse 110 → 60 bpm with progress |
| GLITCH | 1.5 px `steps(2)` jitter |
| LOOPIE | a slow spiral glyph above the head |
| DROP | one sliding tear |
| PATCH | two hands over the face that lower with progress |
| STILL | soft glow |

Idle breathing is scale-y 1 → 1.03 over 2.4 s.

**Reduced motion:** no Body or Idle transforms; faces, halo and labels still step; reactions become a 120 ms brightness (opacity) flash.

### S2 · `useEosPilotFinale`: the finale sequencer

```js
const fin = useEosPilotFinale({
  arenaRef,                       // writes data-eos-pilot-beat="climax|transform|handoff|celebrate|tableau" on the arena
  onDone, onProgress,             // the wrapper's (G5)
  bonus,                          // number passed to onDone
  label: "100% POPPED",
  reduced,
  handoffMs: EOS_PILOT_HANDOFF_MS,          // 1300 (reduced: 800)
  beats: [                                   // run(ctx) does DOM/WAAPI work only; ctx = {t0, reduced, arena, skip:boolean}
    { id: "climax",    at: 0,    run },      // the game's own climax beat
    { id: "transform", at: 350,  run },      // the family transformation
    { id: "handoff",   at: 1300 },           // onProgress(100,label) + onDone(bonus) in the same tick
    { id: "celebrate", at: 1300, run },      // character celebration (S1 emit("finish"))
    { id: "grade",     at: 1300, run },      // loud→calm light ramp completes (S3 stage.grade(1, 1600))
    { id: "tableau",   at: 2900, run },      // calm hold until the reveal
  ],
})
fin.start(inputEvent)   // idempotent; T0 = inputEvent.timeStamp (else performance.now())
fin.skip()              // a stage pointerdown before the hand-off: every pre-hand-off beat jumps to its end state, then the hand-off runs now
fin.phase               // ref: "play" | "finale" | "done"
```

**Guarantees**

- `onDone` is called exactly once. The lock is set inside the call that fires it.
- All timers live in `useRef([])` and are cleared **only** on unmount (G10).
- A watchdog at `handoffMs + 800` runs the hand-off if a beat threw (each `run` sits in try/catch).
- Pre-hand-off beats never wait on React state.

**Time budget**

- Last input → hand-off: 1.3 s. The hand-off → reveal is the wrapper's 3.0 s hold, so last input → reveal is **4.3 s ≤ 5 s** (reduced: 3.8 s).
- At the hand-off the shared systems take over as **supplements**: win ×3, the finish copy (docked by S6), the mood flip bloom (it avoids our `data-eos-avoid` hero and climax object), and the Still Point dust gathering. The pilot's own celebrate, grade and tableau beats keep playing under them.

**Skip:** while `phase === "finale"`, the arena's `onPointerDown` calls `fin.skip()` (no button, see G7). After the hand-off, taps do nothing, because the wrapper owns the reveal timer.

**Reduced motion:** every `run` gets `ctx.reduced`. Beats become opacity cross-fades of pre-composed end states, and the hand-off moves to 800 ms.

### S3 · `EosPilotStage`: environment kit and lighting rig

```jsx
const stage = React.useRef(null)
<EosPilotStage ref={stage} kit="sky" | "pool" | "workshop" reduced calm={progress / 100}>
  {/* play plane */}
</EosPilotStage>
stage.current.grade(to 0..1, ms)          // finale ramp: opacity of the calm layers
stage.current.camera({ y, scale, ms })    // WAAPI translate on layers × depth factor
stage.current.particles(name)             // the kit's pooled particle set (≤ 12 nodes), see EosPilotParticles
stage.current.burst(poolName, {x, y, n, spread, ms, hue})   // reuses pooled nodes, never mounts new ones
```

**Layers (absolutely positioned inside `.arena`, `overflow: hidden`, filling the whole arena):**

| Layer | Contents | Camera depth factor |
|---|---|---|
| L0 | backdrop: a LOUD gradient and a CALM gradient stacked; calm layer opacity = `calm × 0.7` during play, ramped to 1 by `grade()` | 0.1 |
| L1 | far props | 0.3 |
| L2 | mid props | 0.6 |
| Play plane | the game's objects and actors | 1 |
| L4 | foreground: bokeh and mist plates (pointer-events none) | 1.3 |

**Light rig:**

- A key light: a pre-blurred radial gradient placed by `--eos-pilot-key-x/y`, which also positions every gloss highlight.
- A rim light: `--eos-pilot-rim` colour and `--eos-pilot-rim-side` (`left` or `right`), used by object rims as inset shadows.
- A static vignette.

Idle parallax: CSS keyframes drift on L1/L2 (18-40 s loops, translate only). Particles come from pools of ≤ 12 nodes per kit.

**Bans:** `backdrop-filter`, live `mix-blend-mode`, animated `filter`/blur, and layout-property animation. Depth of field is static: far layers use pre-blurred radial shapes. The environment covers the shared nebula and edge decals **inside the arena only**. That is the S3 replacement named in QUALITY_REPORT §9; the decals' role moves to in-world characters.

| Kit | L0 loud → calm | L1 / L2 props | Key light | Rim | Particles |
|---|---|---|---|---|---|
| `sky` (POP) | hazy lilac `#6F6A9E → #A49AC4 → #D9C8DC` → golden morning `#5DB7F0 → #A6DBF7 → #FFE3A8` | L1: sun disc + 3 far cumulus; L2: 2 near clouds, 2 bird silhouettes (≥ 67%) | the sun, upper-left (10 o'clock), warm `#FFE6B0` | cool sky `#9FD8FF`, right | 6 floating motes; 12 droplets (pool) |
| `pool` (CLEANSE) | moonlit indigo `#0E1438 → #23306B`, water `#141C46` → dawn `#6E86C9 → #F7D9A8 → #FFB98A`, water gold | L1: moon (upper-right), stars ×3 twinkle, far tree line; L2: reeds, lily pads, lotus, mist band ×2 | moon, upper-right (1-2 o'clock), cool `#CFE3FF`; in the finale it swings to the sunrise, low centre, warm `#FFC98A` | silver-blue → peach, left | 3 ink puffs; 10 dawn motes |
| `workshop` (CRUSH) | sodium-lit steel `#3A2A2E → #5A3A3A`, night windows `#1B2440` → tungsten and sunrise `#4A4038 → #8A6A4A`, windows `#FFC98A` | L1: back wall of brushed-steel panels, 3 tall windows, pipes, gauges, red beacon (conic, rotating); L2: press frame (columns, crossbeam, piston), anvil, conveyor, shelf of 6 slots | overhead hanging lamp, top-centre cone onto the anvil, `#FFB060` (loud) → `#FFD08A` (calm) | window light, upper-left: cool `#7FA6D9` → peach `#FFC9A0` | 6 lamp-cone dust motes; 10 goo drops; 12 sparks; 3 steam puffs |

Palettes are tuned to read **under** the mood grade (G8): the pilot's calm layer runs at 0.7 opacity during play, so the in-world change and the shared grade do not double-saturate. Verify on one contact sheet per kit.

### S4 · `useEosPilotSound`: named cues and the sync log

```js
const snd = useEosPilotSound({ gameId, sfx: p.sfx, cues: EOS_PILOT_CUES[gameId] })
snd.cue("pop", e, { chain: 3, strength: 0.8 })   // returns the log row
// cue definition
EOS_PILOT_CUES[1] = {
  pop:   { arcade: "pop" },                                            // → p.sfx("pop") (wrapper side effects, G3)
  chain: { tones: (o) => [[eosNote(o.chain, 523), 120, { type: "sine", gain: 0.035, at: 0.03 }]] },
  miss:  { tones: [[220, 90, { type: "triangle", gain: 0.03, glide: 180 }]], haptic: 8 },
  ...
}
```

- `{arcade: kind}` calls `p.sfx(kind)`. `{tones: [[freq, ms, opts]…] | (o) => …}` calls `eosTone` for each tone. `{haptic}` calls `eosHaptic`.
- **Input-driven cues are fired synchronously inside the pointer handler**, never from effects or timeouts. A cue's audible start may be scheduled `at ≤ 0.045` s to land on an impact frame.
- **CRUSH:** `arcade` is allowed only for the per-word `"pop"` (G4).
- No pilot calls `p.sfx("win")` (G5).

**Log:** `EOS_PILOT_SOUND_LOG` is a ring buffer of 400 rows:

```
{ t, action, cue, inputT, dt, via: "arcade" | "tone", muted, game }
```

- `inputT` = `e.timeStamp` (same clock as `performance.now()`).
- `t` = `performance.now()` at scheduling + `at·1000`.
- `dt = t − inputT`.
- Timed (non-input) cues log `action: "timed:<beat>"` with `inputT = T0`.
- `muted = !EOS_STORE.get().sound`. Rows are logged even when muted; no audio plays.

Exposed as `eosExpose("pilot", { soundLog: () => rows.slice(), clearSoundLog })`, so in dev builds it is `window.__eos.pilot.soundLog()` (dev = `eosIsDev()`).

**Target:** p95 `dt` ≤ 50 ms for input cues. **One cue per event.**

### S5 · `useEosPilotGesture` and `useEosPilotBox`: gestures and the play box

```js
const bind = useEosPilotGesture({
  kind: "tap" | "hold",
  disabled,
  holdMs: 850,                    // hold: threshold
  fillVar: "--hold-pct",          // written on the bound element per rAF as "NN%" (arrows' hold meter, G7)
  onDown(e, info),                // tap: fires the action on pointerdown (latency); hold: start
  onHoldTick(f, info),            // rAF, 0..1, DOM writes only
  onHoldReady(info),              // threshold crossed (still pressed)
  onHoldDone(e, info),            // released after the threshold
  onHoldCancel(e, info),          // released early ("almost"), never a fail
})
<button type="button" className="eosPilotHit …" {...bind} {...markerIfLive} />
```

- **Pointerdown:**
  - `e.preventDefault()` (no text selection, no native drag image);
  - `setPointerCapture(e.pointerId)`;
  - add the class `isPress` synchronously, so feedback lands in the next frame;
  - ignore secondary pointers on the same target.
- **Release:** `pointerup`, `pointercancel` and `lostpointercapture` all release.
- **CSS** (`.eosPilotHit`, class-based, G7): `touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;`, plus a `::before` hit-extender so the hit area is ≥ 64 × 64 px.
- **Forgiveness:** `useEosPilotNearHit(arenaRef, getLiveTargets, radius = 28)`. A pointerdown on empty stage within 28 px of a live target's edge is routed to that target. Otherwise it is a **miss** (the actor's head-shake plus the soft `miss` cue; never silent).
- **Keyboard:** the hit is a real `<button>`. Enter or Space taps. For a hold, keydown starts it, keyup releases it, and the same threshold applies.

**`useEosPilotBox(arenaRef)`** returns `{ w, h, u, play: { top, bottom, left, right }, phone }`:

- `phone` = arena width < 700.
- `u` = min(w/360, h/480) at phone size, min(w/1180, h/620) at desktop.
- `play` = the arena rect minus the bottom of the `.engineProgressHud` band (top) and minus the `.globalPlayGuide` top − 8 px (bottom; the guide overlaps the arena at both sizes).
- It uses a ResizeObserver plus `visualViewport` resize. **Never hard-code pixel positions.** Every layout in §3 is a fraction of `play`, with px minimums.

Measured today: phone play box ≈ 360 × 480 (viewport y ≈ 95 → 575); desktop play box ≈ 1230 × 670, with the LIVE GUIDE occupying the bottom-left ≈ 460 × 160.

### S6 · Chrome hooks inside the pilot's scope (`70_pilot_core.jsx`)

1. **Toast dock** (G6): `${EOS_A} .cinematicContentShell:has(> .arena.eosPilotArena) :is(.globalStepFeedbackCopy, .globalFinishFeedbackCopy) { --fx-x: 50% !important; --fx-y: 6% !important }`.
   - First grep `globalFeedbackCopyLayer` CSS to confirm the vars drive `left/top`.
   - Skip this rule if 10_eos_readability already docks the toasts. Check with one screenshot.
2. **Bloom avoidance** (G8): S1 actors carry `data-eos-avoid data-eos-char`, and so does each finale's climax object.
3. **Markers** (G7): `eosPilotMarker(spec, live)` returns `eosTarget(spec)` when `live`, else `{}`. Exactly one live marker at a time. Dead items get the class `isGone`; non-live hits are `disabled`.
4. **Hint copy:**
   - `EOS_PILOT_HINTS = {1: "Tap a bubble to pop it", 2: "Tap the blob: 4 slams each", 109: "Hold an orb… then let go slowly"}`.
   - Apply it to `SHORT_HINT[id]` only while the switch is on, and restore the saved original when it is off.
   - Grep first that `globalReleaseGuideTextLegacy` / `GameEngine`'s guide read `SHORT_HINT` at render time. If they don't, drop this item and note it.
5. **Reveal:** the pilot does not own `.releaseCompleteOverlay` (root). It composes each tableau so the calm hero sits in the upper-middle third, clear of the centred card. The desktop missing card and the CRUSH phone overflow are W0-2 items; the pilot reviewer flags them if they are still seen.

---

## 3. The three games

All timings are in ms. "T0" is the final input's `timeStamp`. "s" is the sound-cue row in each game's cue table.

### 3.1 POP (id 1): "Balloon Morning" (Destroy · holder role · `sky` kit)

**One line.** The anxious character floats in a hazy morning sky, hanging from a jittery bunch of iridescent soap bubbles, each bubble one of your words tugging it a different way. Every pop removes a tug: the character steadies and softens. At the end the droplets merge into one calm bubble that carries it up into the sun.

**Cast.** The hero is the session emotion's character (anxiety → GLITCH, panic → SYNC, overthinking → LOOPIE; none → STILL), in the S1 `holder` role.

| Size | Hero | Label | Bubbles |
|---|---|---|---|
| 390 | 112 px | character name below, 13 px | 88-104 px |
| 1280 | 150 px | 13 px | 112-128 px |

**Storyboard**

| Time | What happens |
|---|---|
| 0-300 | Sky fades in (L0 loud), clouds drift. |
| 150-570 | 6 bubbles inflate, staggered 70 ms: scale 0 → 1.06 → 1, 380 ms. Strings draw as each bubble lands. |
| 300 | The hero bobs in; jitter quirk on; loud face. |
| 700 | The arrows module shows "POP IT!" on the marked bubble: the lowest-centre bubble, nearest the thumb; after that, the bubble nearest the last tap. |
| Play | Each pop runs the beat below. The bunch re-balances, so the strings fan out from the hero's raised hands. |
| 3rd pop (50%) | Face → soft. Haze lifts one step and the sun disc shows through the clouds. |
| 5th pop (83%) | Face → calm. Sun rays and birds appear. The sway is almost still. |
| 6th pop | Finale (below). With more than 6 words, a new bunch drifts in from the right after pop 6 of a wave (600 ms) and the hero catches it. |

**Per-pop beat**

| t | Bubble | Hero (S1) | Others / world | Sound (s) |
|---:|---|---|---|---|
| 0 (pointerdown) | dimple squash 0.94 × 1.06 toward the touch point | `press` (eyes widen, lean 4° toward the bubble) | — | s1 `pop` (arcade), s2 `chain` (at +30) |
| 40 | film tears: scale 1.18 + opacity 0 over 140; 10 droplets fly on 2-keyframe gravity arcs (380-520); ring shockwave scale 0.6 → 1.6 (220); 4 word-glyph shards drift up (600) | `hit` s = 0.6 (squash 1.09 × 0.91) at 40-160 | neighbouring bubbles swing on their tethers ±6° (spring, 600); 1 droplet per pop stays hanging in the air (finale material) | — |
| 160-420 | — | spring back, overshoot 1.04 | `setTug(remaining / N)` reduces the sway | — |
| 420-920 | — | `exhale` (sigh puff) | — | s4 `exhale` (timed) |
| 920 | ready (pops never lock; a fast second pop simply overlaps) | face cross-fade if a step threshold was crossed | sky step if crossed | s5 `step` (timed, only on a crossing) |

- **Chain:** a pop within 900 ms of the previous one increments the chain. The pitch climbs a pentatonic ladder (`eosNote(chain, 523)`). At chain ≥ 3 a sparkle runs along the strings. Slow pops are never punished.
- **Miss:** a tap more than 28 px from any bubble. The hero does `miss` (head-shake, sheepish), the nearest bubble wobbles toward the hero (300 ms) to show where to tap, and s3 `miss` plays.

**Progress → transformation map**

| Progress | Report | Hero face | Hero body | World |
|---|---|---|---|---|
| 0 | `onProgress(0,"0% POPPED")` on mount | loud | jitter quirk 100%, sway 6° at 1.6 s | hazy lilac, fast clouds, sun hidden (L1 sun opacity 0.25) |
| pop k < N | `round(k/N·100)` | by step | sway 6°·(N−k)/N, period → 3.2 s | `calm = k/N` (calm layer 0.7·calm) |
| 34-66 | | soft | jitter 50% | haze lifts, sun disc visible, clouds slow ×0.6 |
| 67-95 | | calm | jitter 0, small happy bob | rays, warm light, 2 birds |
| pop N | `EOS_PILOT_FINAL_PCT` (96), counter "POPPED N / N" | calm | — | finale starts |
| hand-off | 100 | win | — | — |

**Finale "Lift-off" (`useEosPilotFinale`, handoff 1300)**

| T0 + | Shot | Sound |
|---:|---|---|
| 0-350 | **Climax.** The last bubble tears in slow motion (the 0.35× time scale is just slower WAAPI durations). The new droplets, plus the hanging droplet from each earlier pop (≤ 16 nodes), freeze in the air. The light flares behind the hero. | s6 `finale.shimmer`, 660 → 1320 glide 350 |
| 350-1000 | **Transformation.** The droplets stream along curved paths (staggered 30) into the hero's hands and merge into one big iridescent CALM bubble that grows around the hero (0 → 180 px at 390, 240 at desktop). Face calm → win. The old strings fall away (opacity, translateY 20). | s7 `finale.merge`: plinks 1046 / 1318 / 1568 at 0 / 120 / 240 |
| 1000-1300 | The calm bubble wobbles twice (squash 1.06 × 0.94); the hero smiles and presses a hand to the film. | — |
| **1300** | **Hand-off:** `onProgress(100,"100% POPPED")` and `onDone(260 + chainMax·18)` in the same tick. The wrapper plays win ×3 and shows the finish copy (docked); the mood flip bloom crowns around the bubble (avoid-tagged); the Still Point gathers. | wrapper |
| 1300-2600 | **Celebrate and grade.** The calm bubble lifts the hero up (translateY −38% of the play box) with a gentle sway. The camera follows: `stage.camera({y: +60})`, so the clouds pass downward. The sky grades to golden morning (`grade(1,1600)`); the sun rays rotate slowly; the hero waves. | s8 `finale.rise`: warm pad 523 / 659 / 784, 1200, gain 0.015 |
| 2600-3000 | At the top, the bubble bursts softly into iridescent droplet confetti (the 12-node pool) and 3 tiny rainbow arcs. The hero hovers, spins (500), and a heart pops out. | s9 `finale.burst`: 1568 → 2093 shimmer + 784, 500 |
| 3000-4300 | **Tableau.** The hero hovers in sunlight with a calm bob and win face, upper-middle third. Reveal at ≈ 4300. | — |

**Environment.** Kit `sky`, as in the S3 table.

- **Bubble material:** a near-transparent film (`rgba(255,255,255,.06)`) with a thin-film iridescent rim. The rim is a static conic gradient (cyan `#9EF0FF`, pink `#FFB8E6`, gold `#FFF2A8`) on its own node, rotated slowly (8 s) for the shifting colour.
- **Light on the bubbles:** a specular dot upper-left (from the key light), a cool rim on the right, and a small caustic glint.
- **Strings:** a 1.5 px light thread from each bubble's base to `actor.anchor("hands")`. The string is a child of the bubble's sway node (angle and length computed on mount and resize), so it moves with the bubble's transform.
- **Words:** 15-17 px, weight 800, ink `#1E2A4A` with a 1 px white halo, at most 2 lines. A bubble grows from 88 to 104 px for long words. They must stay legible on the pale sky; verify on a sheet.

**Sound cue table**

| s | Cue | Trigger | Via | Recipe | Sync |
|---|---|---|---|---|---|
| s1 | `pop` | bubble pointerdown | arcade `pop` | wrapper pop, step reward and haptic | ≤ 15 ms |
| s2 | `chain` | same event | tone | `eosNote(chain, 523)`, 120, sine, gain 0.035, at 0.03 | ≤ 50 |
| s3 | `miss` | empty-sky tap | tone | 220 → 180, 90, triangle, 0.03; haptic 8 | ≤ 15 |
| s4 | `exhale` | pop + 420 | tone | 520 → 390, 380, sine, 0.02 | timed |
| s5 | `step` | face-step crossing | tone | 660 then 880 (at 0.08), 140, sine, 0.025 | timed |
| s6-s9 | finale | see the shot list | tone | as listed | s6 ≤ 50 from T0; the rest timed |

**Layout, phone 390 (fractions of the S5 play box).**

- Hero centre (50%, 76%), in the thumb zone; its label sits below it, above the play-box bottom.
- Honeycomb of 6, rows of 3 + 3 staggered by half a cell, centred on (50%, 34%), cells 88-104 px with 10 px gaps, total width ≤ 330 px.
  - The lower row's centres sit at ≈ 45% of the box (viewport y ≈ 310), inside comfortable thumb reach.
  - The sway envelope (±6° about each tether base) stays ≥ 12 px inside the box, so nothing clips; the V2 rect check includes this extent.
- The `POPPED k / N` pill sits at top-left inside the HUD band, 13 px. Its rect is checked against `.engineProgressHud`; if they overlap, it drops below the HUD.
- **Thumb rule:** the first marked bubble is the lowest-centre one.

**Layout, desktop 1280.**

- Hero at (58%, 70%), 150 px.
- Bubbles in a fan arc of 6 above the hero, centred at (58%, 32%), 112-128 px.
- Everything stays right of the LIVE GUIDE's rect.
- The sky panorama is wider: sun at (18%, 14%), clouds spread out.

**Reduced motion.**

- No bob, sway or squash.
- A pop is a 120 ms opacity fade plus a static droplet sparkle (opacity).
- The face and the sky still step.
- **Finale:** the calm bubble fades in around the hero (400), the sky cross-fades to gold (900), there is no lift, and the hand-off comes at 800.

**Performance budget.**

| Phase | Running animations | Count |
|---|---|---|
| Idle | bubbles 6 + rims 6 + hero 3 + clouds 3 + sun 1 + motes 6 | 25 |
| One pop | droplet pool 12 + shockwave 1 + shards 4 | +17 transiently, capped |
| Finale | | ≤ 38 (bubbles gone) |

- Each pop costs one React commit (the counter and progress); all else is WAAPI.
- No blur: the film is drawn with gradients.

**What makes it distinct.** It is set against C1 (the bubble row on the ring stage: 3, 4, 6, 9, 16, 19, 21, 41, 43, 99) and 74 BUBBLE WRAP.

- **Gesture:** a single direct tap on tethered soap film, with no tool arming (unlike C1's "arm, then tap ×3").
- **Physics:** tether sway and tug. The bunch's pull on the hero is the feedback loop: fewer bubbles mean a steadier, softer character.
- **Rhythm:** a pentatonic chain ladder.
- **World and finale:** a daytime sky and a merge-and-lift finale.
- Against **41 UNHOOK** (strings and bubbles at a night pier): UNHOOK snips strings to free bubbles that rise into sunrise. POP pops the bubbles to free the holder, in daylight.
- Against **19 ERASE** (same bubbles today): rubbing on a chalkboard.

### 3.2 CLEANSE (id 109): "Moon Pool" (Release · breath role · `pool` kit)

**One line.** Six characters sit in clouded glass orbs on a still, moonlit pool. Press and hold one: it breathes in, and clear water rises inside it. Let go: it breathes out the murk, which sinks and dissolves. The orb turns crystal clear and settles calm on a lily pad. The pool itself clears with every breath. With the last one the water turns into a mirror, the lotus blooms, STILL wakes, and dawn rises in the reflection.

**This is deliberately not a sky-lantern game.** 114 SKY LANTERNS (hold a lantern, lift it to a sky constellation) and 111 BIG SIGH (one breath orb, storm clouds blown to sea, dawn sky) already exist. QUALITY_REPORT P3's "floats up as a lantern" is therefore replaced by **water-borne cleansing**. Its finale is a **reflection**, not a sky.

**Cast.**

- **Six orb characters,** one per word, in the S1 `breath` role, 80 px at 390 and 104 px at 1280. The character is `eosDetectEmotion(word)`'s char, else a cycle that starts at the session char and then visits the other characters in `EOS_AROUSAL_ORDER` order, with no repeats until all 7 are used.
- **STILL,** the 7th, sleeps inside the closed lotus bud: S1, 72 px, calm face, visible faintly through the petals (0.35 opacity).

**Fixes carried in by design:**

- reveal hand-off (S2, G10);
- faces decoded before display (S1) and never empty;
- no percentage on the lotus;
- the hold control is the orb itself (the action caption is bound under it);
- the 3.2 s lock is removed.

**Storyboard**

| Time | What happens |
|---|---|
| 0-400 | Night pool fades in. The moon glows through haze; the reflections are broken by slow ripples. |
| 200-800 | The orbs rise out of the water, staggered 80: translateY 24 → 0 and opacity, 360. Murk swirls inside each (a rotating ink layer). |
| 700 | The marker goes on the suggested orb (bottom row centre first, for the thumb): "HOLD… THEN LET GO". |
| Play | Hold and release in any order. One active hold at a time; a second pointer is ignored. **No lock between orbs:** while one exhales, the others can be held. |
| 3 clear | The remaining orbs' faces soften (global step 1). The pool's murk halves; the moon's reflection sharpens. |
| 5 clear | Calm step. A pre-dawn band appears at the horizon. |
| 6th exhale | Finale (below). With more than 6 chunks, wave 2 rises from the pool after wave 1 (same beat). The finale follows the last wave. |

**Per-orb beat (hold → release)**

| t | Orb | Character (S1 breath) | World | Sound (s) |
|---:|---|---|---|---|
| 0 (pointerdown on the orb or its caption block) | the rim brightens; `isPress` | `press`, eyes widen | a ripple ring starts under the orb (one ring per 400 while held) | s1 `hold` (arcade `soft`: explicit, so no toast) plus s2 `rise` (tone glide over `holdMs`) |
| 0-850 | clear water rises inside: the fill node is clipped by the ball (`clip-path: inset(${100−f}% 0 0 0)`); the murk node's opacity goes 1 → 0.55; `--hold-pct` = f% on the target | `setBreath(f)`: stretches up 8% | `eosBreathOwn("in", 850)` (the Still Point inhales with you) | — |
| 850 (still held) | the rim turns gold ("let go now"); the fill caps at full; holding longer is fine | holds the inhale | haptic `EOS_HAPTIC.notch` | s3 `ready` (timed, ≤ 16 from the threshold frame) |
| release ≥ 850 | **exhale 0-1400:** squash 1.1 × 0.9 (160) → settle (340 spring); the murk leaves downward as 3 ink puffs that sink and dissolve in the pool (translate + scale + opacity, 1400); the glass clears (cloud node opacity → 0); the orb dips onto a lily pad that scales in under it (300) and turns gently toward the lotus | `exhale` (1400); face → calm (this orb only), with a small relieved closed-eyes moment then calm | `eosBreathOwn("out", 1400)`, then `eosBreathOwn(null)`; pool murk steps down (`calm = k/N`); `p.sfx("pop")` gives the step reward | s4 `exhale` (arcade `pop`) plus s5 `out` (tone glide 1200) |
| +600 | the cleared orb chimes its note | — | — | s6 `clear`: `eosNote(k, 392)` (each orb adds the next note, so the six releases form a melody) |
| release < 850 ("almost") | the water drains back (250); the caption flashes "a little longer…" for 900 ms | small sigh (`exhale` 300, scale 0.5) | `eosBreathOwn(null)` | s7 `almost`, 392 → 330, 120 |

**Progress → transformation map**

| Progress | Report | Uncleansed orbs | Cleansed orbs | Pool and sky |
|---|---|---|---|---|
| 0 | `onProgress(0,"0% CLEANSED")` | loud face, murk 100% | — | murky indigo water, thick mist, hazy moon, broken reflections |
| k < N | `round(k/N·100)`, label `n% CLEANSED`; counter `k / N CLEAR` | face step by global progress (loud → soft → calm) | calm, clear glass, on a lily pad | murk opacity 1 − k/N; ripple amplitude falls; moon reflection opacity k/N |
| 67-95 | | calm | calm | stars brighten; warm band at the horizon |
| N | 96 | — | calm | finale |
| hand-off | 100 | — | win | dawn |

**Finale "Mirror Dawn" (handoff 1300)**

| T0 + | Shot | Sound |
|---:|---|---|
| 0-900 | **Climax.** The last ink cloud dissolves. One ripple ring sweeps the whole pool (scale 0.2 → 3, opacity 1 → 0, 900). Behind it the water turns mirror-still: the ripple texture fades out and the reflection plate (a vertically flipped copy of the L0/L1 sky) fades in. | s8 `finale.ripple`: 196 + 294, 900, gain 0.04 |
| 400-1300 | **Transformation.** The lotus blooms: 8 petals rotate open, staggered 60, 700 each, with a gold core glow. STILL rises from the centre (translateY −18), eyes opening (calm → win). The six orbs turn to face the lotus; their glass sparkles (1 glint each). | s9 `finale.lotus`: arpeggio 392 / 494 / 587 / 740 / 880 at 0 / 100 / 200 / 300 / 400 |
| **1300** | **Hand-off:** `onProgress(100,"100% CLEANSED")` and `onDone(340 + N·25)`. Win ×3, finish copy (docked), flip bloom (avoids the lotus and STILL), Still Point gather. | wrapper |
| 1300-2900 | **Grade: dawn.** The moon sets (translateY +30%, opacity → 0, 1400). The sky cross-fades indigo → peach and gold (`grade(1,1600)`). The sun's rim rises at the horizon. The mirror reflects the sunrise (the reflection plate's calm layer). The mist lifts (translateY −20, opacity → 0). The key light moves from moon to sun (`--eos-pilot-key-*` to the low centre). | s10 `finale.dawn`: pad 523 / 659 / 784, 1200, 0.015 |
| 1500-2700 | **Celebrate.** The six characters hop on their pads in a wave (12 px, staggered 80, two passes) with win faces. STILL does `finish` with a slow open-arms stretch. 10 dawn motes rise off the water. | — |
| 2700-4300 | **Tableau.** A gold mirror pool, the bloomed lotus with STILL, six calm faces on their pads. Reveal at ≈ 4300. | — |

**Environment.** Kit `pool`, as in the S3 table.

- **Glass orbs:**
  - a light glass rim (white at 22%) with a cool rim light from the left;
  - a specular highlight from the moon, upper-right;
  - an inner murk layer: a dark-violet radial-gradient ink (`#3A2C5E` at 70%) that only ever sits **inside** the circular ball and is never a box behind it;
  - a clear-water fill (`#9FE3FF` → `#E9FBFF`, 35%).
- **Water plane:** the lower 45% of the box, with a reflection plate and a ripple texture (two static gradient rings, scaled).
- **Lily pads:** green `#2F6B4F` → `#5FAF7A` ellipses, appearing under cleared orbs.

**Sound cue table**

| s | Cue | Trigger | Via | Recipe | Sync |
|---|---|---|---|---|---|
| s1 | `hold` | orb pointerdown | arcade `soft` | — | ≤ 15 |
| s2 | `rise` | same event | tone | 330 → 495 over `holdMs`, sine, 0.02 | ≤ 15 |
| s3 | `ready` | threshold | tone | 784, 220, sine, 0.03; haptic notch | timed |
| s4 | `exhale` | release ≥ threshold | arcade `pop` | step reward and chain | ≤ 15 |
| s5 | `out` | same event | tone | 587 → 392, 1200, sine, 0.02; haptic `EOS_HAPTIC.exhale` | ≤ 15 |
| s6 | `clear` | release + 600 | tone | `eosNote(k, 392)`, 260, sine, 0.03 | timed |
| s7 | `almost` | early release | tone | 392 → 330, 120, triangle, 0.02 | ≤ 15 |
| s8-s10 | finale | shot list | tone | as listed | s8 ≤ 50 from T0 |

**Layout, phone 390.** Two arcs of three around the central lotus, the same proven composition as today's phone start tile, but bound and readable.

- **Columns:** x = 18% / 50% / 82% of the play box (≈ 65 / 180 / 295 px; spacing 115 px ≥ the 108 px caption block).
- **Top arc:** orb centres at y ≈ 15% (sides) and 12% (centre).
- **Lotus:** centre at (50%, 48%), 96 px.
- **Bottom arc:** orb centres at y ≈ 69% (sides) and 72% (centre).
- **Each orb block:** an 80 px ball, then the word (15 px, ≤ 2 lines, ≤ 108 px wide), then the action caption `hold to <action>` (12 px, lower case, 80% opacity). The whole block is one `eosPilotHit` target (≈ 108 × 130), so the pill-to-sphere ambiguity is gone.
- **Rect checks:** the top-arc caption blocks end above the lotus's top; the bottom-arc blocks end ≥ 12 px above the play-box bottom (the guide's top − 8). The V2 rect check must hold for 2-line words.
- The `k / N CLEAR` pill sits top-left in the HUD band.
- **Suggested order:** bottom row centre → bottom sides → top (thumb first).

**Layout, desktop 1280.**

- Landscape pool. Lotus centre at (55%, 50%), 140 px.
- The left trio arcs at x 24-32% and y 22-62%; the right trio mirrors it at x 78-86%. All stay above the LIVE GUIDE's top.
- Orbs 104 px, words 16 px.
- The moon at (82%, 12%); the horizon line at 58%.

**Reduced motion.**

- No stretch, squash or hop.
- The hold fill still shows, because it carries information: the clear-water layer's opacity follows f instead of clip-path.
- The exhale is a 400 ms cross-fade, murk → clear. No ink travel.
- **Finale:** the pool cross-fades to mirror (500); the lotus open and closed sprites cross-fade (500); dawn cross-fades (900); hand-off at 800.

**Performance budget.**

| Phase | Running animations | Count |
|---|---|---|
| Idle | orb bob 6 + murk swirl ≤ 6 (cleared orbs stop theirs) + mist 2 + moon 1 + stars 3 + water shimmer 2 | 20 |
| Hold | +3 | |
| Exhale | +ink 3 + pad 1 | |
| Finale | petals 8 + motes 10 + sky / moon / reflection 4 + 6 hops + STILL 2 | ≤ 34 (bob and murk stopped) |

- The hold fill runs on rAF writing one CSS var and one clip-path. **No React state per frame** (the lesson from 18 BURN).
- Faces: decode 7 × 4 = 28 images, staggered at idle priority after the first 7 loud faces.

**What makes it distinct.**

- **Within mechanic cluster D** (hold to threshold: 11, 13, 39, 65, 99, 18) and its visual twins 65, 11 and 18:
  - the hold is on the **character itself**, paced by the shared breath (CLEANSE owns the Still Point while held), with no timing window (unlike 11 PRESSURE POP's green zone);
  - the release is an **exhale you watch** (1.4 s of murk leaving);
  - progress is shown by **the world itself** (the pool clears);
  - the finale is a reflection.
- **Against 114 SKY LANTERNS and 111 BIG SIGH:** everything stays on and in the water (cleansing downward, gathering on lily pads), with no sky lift and no storm clouds. The lotus and STILL awakening are this game's own icons.

### 3.3 CRUSH (id 2): "The Press" (Destroy · inside role · `workshop` kit)

**One line.** A hydraulic press on a workshop line. Each thought rolls in on a conveyor as a squishy blob with a furious character inside. Tap the blob: the steel jaw slams. Four slams squash it flat, then it pops back round and smiling and rolls off to the shelf. Every flattening leaves a red ember of heat in the press's tray. After the last thought, the press slams the collected heat into a glowing cube that cracks open into warm light, and the whole workshop turns to sunrise.

**Cast.**

- One blob per round, S1 `inside` role: 130 px at 390, 170 at 1280. Its character is the word's detected emotion, else the session character (anger → RUSH).
- The **starting face** of each incoming blob follows global progress (rounds 1-2 loud, 3-4 soft, 5-6 calm-leaning). The workshop is cooling.
- Finished blobs sit on the shelf as 28 px circular indicators (decoration, not targets).

**Rounds.** Rounds = entries (≤ 6; any tail is joined on the last tag, ≤ 2 lines). Each round takes 4 slams, so 24 taps for 6 words.

**Storyboard**

| Time | What happens |
|---|---|
| 0-400 | Workshop lights up: lamp flicker, 2 frames of opacity. The red beacon spins. |
| 200-700 | Blob 1 rolls in on the conveyor from the left: translateX −120% → 0, wheel-less, with a squash on stop. Its tag drops onto the anvil front (spring). |
| 700 | Marker on the blob: "CRUSH ×4". The gauge plate shows `CRUSH 0/4`. |
| Play | Slams as below. After the 4th: splat → pop-back → roll-off → next blob (round transition ≈ 1100 ms). |
| Round 3 | Beacon dims to 50%. The lamp warms; the window light starts to show dawn blue. |
| Round 5 | Beacon off. Warm lamp. |
| Round 6, 4th slam | Finale. |

**Per-slam beat (every tap counts; no dropped taps)**

| t | Jaw / press | Blob (S1 inside) | World | Sound (s) |
|---:|---|---|---|---|
| 0 (pointerdown on blob or press mouth) | anticipation: the jaw twitches up 4 px (0-20); the piston hisses | `press`: eyes widen, braces | — | s1 `press` (tone) |
| 20-48 | the jaw drops (ease-in, 28) | — | — | s2 `slam` (tone, at 0.045 → audible on impact, dt ≈ 45) |
| 48 (impact) | the jaw hits the blob's top | `hit` (s 0.6, or 1 when heavy), then `setCompression(c)` with c = 0.22 / 0.42 / 0.6 for hits 1-3 | arena shake ±3 px (±6 heavy), 3 keyframes over 120; 4 goo drops (8 heavy) | — |
| 48-268 | the jaw recoils up (hydraulic ease-out, 220); the gauge needle sweeps | face by hit: 1 flinch (loud), 2 dizzy stars, 3 squint and goo cracks | the `CRUSH n/4` plate updates (direct `textContent` write) | — |
| **Heavy window** | a tap landing 180-320 ms after the previous impact (needle in the green) is a HEAVY hit: deeper sound, bigger shake and splash, the gauge flashes | — | — | s3 `heavy` replaces s2 |
| **Queue** | a tap during the drop or recoil (< 180 ms) queues **one** slam that fires at once when the recoil starts (all taps count; the excess beyond 1 queued is coalesced into that slam's strength) | — | — | the cue fires at the input (dt ≤ 15); the impact visual follows the queue (acceptable, noted in the log as `queued:true`) |
| 4th slam (word k done) | SPLAT: the jaw holds down 120 | `setCompression(1)` (pancake 0.22) plus a 10-drop goo splatter ring; the tag rattles | one red **ember** drops into the heat tray (scale step k/N); `p.sfx("pop")` then `onProgress(k/N·100)` (G4) | s4 `splat` (tone) plus the arcade `pop` |
| +350 | the jaw lifts | `popBack`: springs round, face → calm (win for round N) | — | s5 `popback`: boing plus bell (timed) |
| +800 | the conveyor runs (stripe translateX) | the blob rolls right onto the shelf slot k (hop 300) | the round pill reads `k / N` | s6 `roll` (timed) |
| +1100 | the next blob rolls in; the marker returns | starting face by global step | — | — |

**Miss:** a tap on the wall or floor more than 28 px from the press mouth. The jaw stays still; the blob turns toward the tap and sticks out its tongue (sheepish, `miss`); s7 `clank` plays.

**Progress → transformation map**

| Progress | Report | Blob faces | Workshop |
|---|---|---|---|
| 0 | `onProgress(0,"0% CRUSHED")` | loud | red beacon spinning; harsh sodium lamp; night-blue windows; steam leaks |
| round k < N done | `p.sfx("pop")`, then `onProgress(round(k/N·100), "n% CRUSHED")` | the next blob starts at the global step | `calm = k/N`; the beacon's opacity is 1 − k/N; the heat tray glows brighter (ember count k) |
| 34-66 | | soft start | lamp warms; windows go dawn blue |
| 67-95 | | calm start | beacon off; tungsten lamp; steam stops |
| round N | `p.sfx("pop")`, then 96 | win (pop-back) | finale |
| hand-off | 100 | — | sunrise |

**Finale "Cube of Light" (handoff 1300)**

| T0 + | Shot | Sound |
|---:|---|---|
| 0-450 | **Climax set-up.** The last blob pops back with a win face. The five shelf blobs hop down and line up on the conveyor to watch (5 hop arcs, staggered 50). The heat tray's embers roll out onto the anvil and fuse into one red-hot mass. The beacon gives one last spin. | s8 `finale.charge`: 110 → 220 saw glide, 450, 0.02 |
| 450-800 | **Mega slam.** The jaw slams the heat mass: 8 px shake over 160, a 12-spark burst (pool), a lamp flicker. | s9 `finale.mega`: 55 Hz 400 ms 0.12 + 900 Hz 60 ms |
| 800-1300 | **Transformation.** The jaw lifts. A small glowing amber cube sits on the anvil. 3 crack overlays light up in turn (120 apart), with light leaking through, and the cube trembles. | s10 `finale.crackle`: 2400 Hz, 30 ms, ×3 |
| **1300** | **Hand-off:** `onProgress(100,"100% CRUSHED")` and `onDone(250 + heavyHits·5)`. The wrapper's win ×3 lands **as the cube bursts**: warm light rays (a static conic gradient scaling 0 → 1.6 and rotating slowly) flood the shop. Flip bloom (avoids the cube and the blobs), Still Point gather. | wrapper |
| 1300-2700 | **Grade and celebrate.** The sodium light cross-fades to warm tungsten; sunrise god-rays come through the high windows (beam plates fade in); steam vents give 3 relief puffs. The six blobs bounce in a wave (staggered 80); the last blob, the hero, stretches tall (1.2), smiles and waves (`finish`). | s11 `finale.warm`: pad 262 / 330 / 392, 1200, 0.015, plus a soft steam hiss |
| 2700-4300 | **Tableau.** A warm workshop, the press open, six smiling blobs in a row, the cube's light hanging as a gentle glow. Reveal at ≈ 4300. | — |

**Environment.** Kit `workshop`, as in the S3 table.

- **Materials:**
  - brushed steel: hairline `repeating-linear-gradient` plus a moving-free light band from the lamp, rivets as radial dots;
  - a chrome piston rod (vertical gradient);
  - yellow and dark hazard stripes on the anvil base only (never behind a face);
  - the conveyor: dark rubber with lighter cleats; motion is the translateX of a repeating stripe node.
- **Blob:** a circular character image inside a translucent jelly rim (the session char's hue at 35%, a white gloss upper-left, a lamp-light top highlight). No dark chip.
- **Tag:** a stamped metal plate on the anvil's front face **below** the blob, `#C9CED6` with dark ink `#22262C` at 15-17 px, ≤ 2 lines, ≤ 300 px wide at 390.

**Sound cue table** (all tone except s4's arcade layer; G4)

| s | Cue | Trigger | Recipe | Sync |
|---|---|---|---|---|
| s1 | `press` | pointerdown | hiss 1800 → 900 triangle 60, 0.012 + clunk 140 Hz 50, 0.04 | ≤ 15 |
| s2 | `slam` | same, at 0.045 | thud 70 → 48 sine 160, 0.09 + clank 620 square 40, 0.02 | ≈ 45 |
| s3 | `heavy` | same, in the window, at 0.045 | thud 55 sine 220, 0.12 + ring 980 sine 300, 0.02 | ≈ 45 |
| s4 | `splat` | 4th slam | goo 300 → 120 sine 180, 0.05 (at 0.045) **plus `p.sfx("pop")`** (step reward, one per word) | ≤ 50 |
| s5 | `popback` | +350 | boing 220 → 660 sine 160, 0.04 + bell 880 + 1320 (at 0.06), 300 | timed |
| s6 | `roll` | +800 | 3 ticks 200 Hz, 20 ms, 90 apart | timed |
| s7 | `clank` | miss | 400 square 40, 0.02 | ≤ 15 |
| s8-s11 | finale | shot list | as listed | s8 ≤ 50 from T0 |

**Layout, phone 390.**

| Element | Position (fraction of the play box) |
|---|---|
| Press crossbeam | y 4-12% |
| Piston | down to the jaw, which rests with its bottom edge at y 34% |
| Blob centre | (50%, 50%) |
| Anvil top | y 64% |
| Tag | on the anvil face, y 66-75% |
| Conveyor | y 79-85%, full width |
| Heat tray | the anvil's left side |
| Shelf of 6 slots | right wall, y 16-28%, slots 30 px |
| `k / N` pill | top-left in the HUD band |
| `CRUSH n/4` gauge plate | right column, y 42% |

- **Hit target:** the whole press mouth, from the jaw's bottom to the anvil's top, 84% of the width (≈ 300 × 140 px), centred at viewport y ≈ 335. It sits in the thumb zone and far exceeds 64 px.
- The shake translates only the play-plane node, so the chrome never shakes.

**Layout, desktop 1280.**

- Press centred at x 56% (clear of the LIVE GUIDE), blob 170 px.
- The conveyor spans the box; the shelf is on the right wall.
- Three windows across the back wall make the sunrise read in the finale.

**Reduced motion.**

- No shake, jaw travel or squash.
- A slam is a 100 ms flash on the plate, then the blob's compression stage cross-fades (4 pre-composed states, opacity).
- Round transitions are cross-fades.
- **Finale:** the cube appears and the light cross-fades (500); the shop grades (900); hand-off at 800.

**Performance budget.**

| Phase | Running animations | Count |
|---|---|---|
| Play | jaw 1 + rod 1 + blob 3 + tag 1 + gauge 1 + goo pool 10 + conveyor 1 + beacon 1 + dust 6 + steam 3 | ≤ 28 |
| Finale | + sparks 12 + hops 5 − goo | ≤ 40 |

- **Per tap:** zero React commits for the jaw, blob, shake and particles (WAAPI). The `CRUSH n/4` text is a direct DOM write. Exactly 1 commit per *word* (round state).
- This answers the 3.7 s desktop long task (QUALITY_REPORT §7): the per-tap re-render of the whole legacy engine plus HUD is gone, and the wrapper's toast now fires once per word, not per tap.

**What makes it distinct.**

- **Against C2 / mechanic cluster B** (tap a pill N times: 12, 30, 53, 54 …): the **object** is the target, and the loop has a **mechanical rhythm** (jaw cycle plus heavy window) and per-hit **physical deformation**. Rounds come on a conveyor; the heat tray turns each word's discharge into the finale cube.
- **Against 13 SQUASH** (jelly kitchen; the words are kept as a gem): industrial force discharge, and the cube **breaks open into light**. Nothing is kept.
- **Against 5 HAMMER** (one timed swing at a forge): a 4-slam rapid sequence, hydraulic, no sweep.
- **Against 3 CRACK** (geodes) and **11 PRESSURE POP** (boiler hold-release): the workshop kit is set up as a **hydraulic factory line** (steel, conveyor, red beacon → sunrise windows), never a forge or a boiler room.

---

## 4. File plan (`framer/src/pilot/`, concatenated after the release modules by `dev/pilot_build.py`)

| File | Exports (top-level names) | Contract |
|---|---|---|
| `70_pilot_core.jsx` | `EOS_PILOT_VERSION`, `EOS_PILOT_IDS = [1, 2, 109]`, `eosPilotOn()`, `EOS_PILOT_ENGINES`, `eosPilotRegister(id, Engine, meta)`, **`EosPilotEngineFor(game)`**, `EOS_PILOT_HINTS`, `eosPilotApplyHints(on)`, `eosPilotWords(entries, max = 6)` (returns `{waves: string[][], imageOnly}` via `eosWords` / `isImageOnlyEntries`), `eosPilotCharFor(word, i, used)`, `eosPilotMarker(spec, live)`, `EOS_PILOT_FINAL_PCT = 96`, `EOS_PILOT_HANDOFF_MS = 1300`, `EOS_PILOT_CORE_CSS` (arena base and the S6 toast dock) | `eosPilotOn()` reads `?pilot=off\|on`, then `localStorage.eos_pilot` (`"off"`); default on; try/catch; memoised per page load. `EosPilotEngineFor(game)` returns `EOS_PILOT_ENGINES[id]` when on, else `null`, and calls `eosPilotApplyHints` (save and restore). It must be cheap: it runs on every router render. `eosExpose("pilot", {on, ids, state})`. **The only file that defines `EosPilotEngineFor`.** |
| `71_pilot_fx.jsx` | S1 `EosPilotActor`, `eosPilotFaceStep`, `eosPilotFaceSrc`, `EOS_PILOT_SOFT_FACE`, `eosPilotPreload` · S2 `useEosPilotFinale` · S3 `EosPilotStage`, `EOS_PILOT_KITS`, `EosPilotParticles` · S4 `useEosPilotSound`, `EOS_PILOT_SOUND_LOG`, `eosPilotSoundRow` · S5 `useEosPilotGesture`, `useEosPilotNearHit`, `useEosPilotBox` · `EOS_PILOT_FX_CSS` | Pure systems with no game ids inside. Adds `soundLog` and `clearSoundLog` to `eosExpose("pilot")`. |
| `72_pilot_pop.jsx` | `EosPilotPopEngine`, `EOS_PILOT_POP` (layout fractions, timings, `cues`), `EOS_PILOT_POP_CSS` | `eosPilotRegister(1, EosPilotPopEngine)`. Root `<div className="arena eosPilotArena eosPilotPop">`. |
| `73_pilot_cleanse.jsx` | `EosPilotCleanseEngine`, `EOS_PILOT_CLEANSE`, `EOS_PILOT_CLEANSE_CSS` | `eosPilotRegister(109, EosPilotCleanseEngine)`. Root `.arena.eosPilotArena.eosPilotCleanse`. |
| `74_pilot_crush.jsx` | `EosPilotCrushEngine`, `EOS_PILOT_CRUSH`, `EOS_PILOT_CRUSH_CSS` | `eosPilotRegister(2, EosPilotCrushEngine)`. Root `.arena.eosPilotArena.eosPilotCrush`. |

### Engine contract (all three)

- **Props:** the wrapper's `ep` (G1). **Use:** `game, entries, imageSrc, imageSources, hasUserImages, sfx, onDone, onProgress, reduced, bubbleTextPx`.
  - Word font = `max(15, the arcade's bubbleTextPx mapping)`.
  - Ignore `imageSources` faces unless `hasUserImages` (the arcade's phase images follow the word).
- **Mount:** `onProgress(0, "0% <VERB>")`. After that, progress is monotonic: `round(k/N·100)` per step, `EOS_PILOT_FINAL_PCT` at the last input, 100 only via S2's hand-off.
- **`onDone(bonus)`:** exactly once, from S2. No `p.sfx("win")`.
- **Arrows:** one live `eosPilotMarker` at a time. Targets are `<button className="eosPilotHit …">`, `disabled` when not live; dead ones carry `isGone`. Nothing in the arena may match the arrows fallback list while no marker is live (G7). **`EOS_GESTURES` is never mutated:** markers win for ids 1-110 too.
- **CSS:** `eosCss("pilot-core" | "pilot-fx" | "pilot-pop" | "pilot-cleanse" | "pilot-crush", css)`, every rule under `${EOS_A} .eosPilotArena`. Builders verify that 10_eos_readability's `!important` rules on `.arena` descendants (`.combo`, `.literalProgress`, `.uniqControl`, `.cleanseBubbleHoldButton`) do not hit pilot classes. That is why the pilot uses none of those class names.
- **Unmount:** clear every timer and animation, and call `eosBreathOwn(null)` (CLEANSE).

**Build order:** `70` + `71` first, smoke-tested with a stub engine for id 1. Then `72`, `73` and `74` in parallel.

---

## 5. Build, verify, risks

### Build and run

```
python3 framer/dev/pilot_build.py --dev-dir /tmp/pilot_<you>
```

Then drive `framer/dev/eos_drive.mjs`:

1. `launchEos({dir:'/tmp/pilot_<you>', width:390, height:844, lite:true})`.
2. `startGameById(page, id, "my boss yelled at me and I feel panic")`.
3. `finishGame(page, id, {log:true})`.
4. `progressLog`, `arrowState`, `smallText`, and `page.evaluate(() => window.__eos.pilot.soundLog())`.

Repeat at 1280 × 860, with `reducedMotion:"reduce"`, and with `query:"pilot=off"`.

Shots go through `dev/contact_sheet.py` (one sheet per game per size). Keep browser runs lean: another workflow shares the CPU.

### Risks and open points (decide in build, record in the progress notes)

1. **Soft-face ids** (`EOS_PILOT_SOFT_FACE`) need one visual check across 7 characters × 4 steps.
2. **Toast docking** may already be done by the readability module (check first).
3. **`SHORT_HINT` patching:** confirm the guide reads it at render time; else drop it.
4. **CRUSH reveal overflow on phone** and the **desktop reveal card** belong to the root overlay (W0-2), not to the pilot. Flag them in the review if still present.
5. **Headless timings** understate real-device smoothness (CREATIVE_STANDARDS caveat). The owner's device play is the ground truth.
6. **Wave mode** (more than 6 chunks) for POP and CLEANSE needs one test with a long input (12 words).
7. **The wrapper's `CinematicStageFX` and `CharacterEmotionFX`** stay mounted behind the arena. If either draws above the arena (z-order), raise `.eosPilotArena` with scoped CSS rather than hiding anything.
