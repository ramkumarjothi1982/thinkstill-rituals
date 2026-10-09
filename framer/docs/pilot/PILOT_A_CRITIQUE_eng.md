# Pilot A — engineering critique (senior front-end / game engineer)

**Reviewed:** `docs/pilot/PILOT_A_SPEC.md` v1 (2026-10-09). **Method:** every claim below was checked against the code by grep/Read (line numbers as of today). No pilot code exists yet (`src/pilot/` is empty), so this is a pre-build review.
**Verdict:** buildable in one Framer file with React 18 + WAAPI. The S1-S6 split is sound, and the CRUSH progress rule (G4) is right. Fix **E1-E9 before writing code**: they would break arrows, layout, sound sync or the hand-off. E10-E20 are perf and robustness fixes for mid-range phones. E21-E30 are smaller.

Severity: **B** = blocker (a spec rule is wrong or the build fails a check as written) · **M** = major (perf, robustness, or a check that is flaky) · **m** = minor.

---

## A. Blockers: the spec is wrong against the code

### E1 (B) Marker label key is `label`, not `L`
- **Evidence:** `eosTarget(spec)` (00_eos_core L719-731) maps only `label` to `data-eos-label`. The arrows read `L: d.eosLabel` (30_eos_arrows L248). §1.3 writes `{g:"tap", L:"POP IT!"}` and similar. That `L` is the key of the `EOS_GESTURES` *table* and is **silently dropped** by `eosTarget`, so the arrow shows the default label.
- **Fix:** `eosPilotMarker({g:"tap", label:"POP IT!"})`, `{g:"hold", ms:850, mvar:"--hold-pct", label:"HOLD… THEN LET GO"}`, `{g:"taps", n:4, label:"CRUSH ×4"}`.
- Also align the marker's `ms` (900) with `holdMs` (850). The arrows' fallback hold ring uses `ms` when no meter value is readable.

### E2 (B) "Non-live hits are `disabled`" contradicts POP and CLEANSE play, and breaks holds and the keyboard
- **Evidence:** S6.3 and the §4 engine contract say non-live hits are `disabled`. But POP says any bubble pops ("pops never lock"), and CLEANSE says "hold in any order … while one exhales, the others can be held".
  - A `disabled` button is skipped by Tab, so keyboard POP can only reach one bubble.
  - It does not dispatch click/mouse events, and the pointer-event dispatch on disabled controls varies by engine (Safari drops them).
  - Toggling `disabled` on the element that holds pointer capture fires `lostpointercapture`, which cancels an active hold.
- **What the arrows actually need:** `resolve()` (30_eos_arrows L860-876) returns **step 1 (markers)** whenever any usable marker exists. The fallback (`.arena button:not(:disabled)`, L148) is reached only when no marker is live **and** (for ids that have a table, as 1, 2 and 109 do) 2.5 s have passed since the arena mounted.
- **Fix (new rule):**
  - While a marker is live, every playable hit is an **enabled** `<button>`, and exactly one of them carries the marker.
  - During no-live windows (round transition, finale), the play plane gets class `isLocked` (`pointer-events:none`) **and** all hits get `disabled`.
  - Never toggle `disabled` or move the marker off an element that holds pointer capture. Move the marker after release.

### E3 (B) The finish toast is not positioned by `--fx-x/--fx-y`, so S6.1 cannot dock it
- **Evidence:** `GLOBAL_FINAL_MESSAGE_GUARANTEE_CSS` (00_arcade L21050) pins `.tsArcade.stage-play .globalFinishFeedbackCopy{left:50%!important;top:50%!important;translate:-50% -50%!important}`.
  - It shows for `finishHoldMs` (3 s) from the hand-off, centred on the arena. That is exactly where the lotus and STILL (y 48%), the POP calm bubble and the CRUSH cube sit, so V3 fails by design.
  - 10_eos_readability only resizes the toast's text (L139-143); it does not dock it.
- **Fix:** override `top`, `left` and `translate` with `EOS_A` specificity (three `:not(#id)` beat `.tsArcade.stage-play`):
  ```css
  ${EOS_A}.stage-play .cinematicContentShell[data-eos-pilot="1"] :is(.globalStepFeedbackCopy,.globalFinishFeedbackCopy){
    --fx-x:50%!important; --fx-y:8%!important; top:8%!important; left:50%!important; translate:-50% 0!important }
  ```
  Then verify by rect (V3) on the phone, where the legacy step copy is width-clamped by `@media(max-width:700px)`.
- Also note the step toast lasts **980 ms in the legacy wrapper but 3200 ms in the new one** (L18399 vs L19455). In CLEANSE a docked toast is on screen almost the whole game.

### E4 (B) Every wrapper commit re-renders the whole pilot tree, and its callbacks change identity each render
- **Evidence:** `ep = {...p, sfx: wrappedSfx, onDone: wrappedDone, onProgress: reportProgress}` is rebuilt on every wrapper render (L18597; new wrapper L19859), and the hook returns `<PE {...p}/>`. Re-renders come from:
  - each `p.sfx`, which calls `triggerStepReward` (4 setStates);
  - each `onProgress` (`setProgress`, `setLabel`, `setGuideText`);
  - the toast-hide timer;
  - in the new wrapper, each step reward also runs `setPositiveSlots` and `setReactionEpoch`. That recomputes `phaseImages`, so `imageSources` is a **new array**.
- **Fix (mandatory pattern for all three engines):**
  ```jsx
  function EosPilotPopEngine(p) {                       // thin shell: re-renders with the wrapper, costs ~nothing
    const live = React.useRef(p); live.current = p      // sfx/onDone/onProgress always called as live.current.x(...)
    const wordsKey = (p.entries || []).join("\u0001")
    return <EosPilotPopInner live={live} gameId={p.game.id} wordsKey={wordsKey}
             reduced={!!p.reduced} userImgs={p.hasUserImages ? eosPilotImgKey(p) : ""} />
  }
  const EosPilotPopInner = React.memo(function (...) { ... })   // props are primitives + a stable ref
  ```
- **Rules:**
  - Never put `p.sfx`, `p.onProgress` or `p.onDone` in effect deps. That is the G10 bug class.
  - Snapshot user images once at mount, because `imageSources` rotates in the new wrapper.
  - Memoise words on `wordsKey`, not on the `entries` array identity.

### E5 (B) The reveal unmounts the engine, so nothing of the pilot is ever visible behind the reveal card
- **Evidence:** the root `done` calls `setStage("reveal")` at once (L21540). `{stage === "play" && …<ReleaseGameEngine/>}` and `{stage === "reveal" && …releaseCompleteOverlay}` are mutually exclusive (L22095-22121).
- **Consequences:**
  - The pilot is on screen for exactly **`finishHoldMs` = 3000 ms after the hand-off**, then it unmounts.
  - S6.5 ("compose the tableau clear of the centred card") and S1 `finish` ("idles at the win face through the reveal") describe a state that never exists.
- **Fix:**
  - Remove those two requirements.
  - Compose the tableau against the **docked finish toast** (E3) instead.
  - End every timeline by hand-off + 2900 ms.
  - Unmount cleanup (E28) is the only way the pilot ends.

### E6 (B) The hand-off order loses the custom label
- **Evidence:** S2 does `onProgress(100,"100% POPPED")`, then `onDone(bonus)` in the same tick. `wrappedDone` then calls `setLabel(progressLabel(game,100))` (L18566), which is the last write in the batch, so the custom label is lost.
- **Fix:** call `onDone(bonus)` **first**, then `onProgress(100, label)`.
  - The gate is monotonic.
  - `v=100` triggers no step toast (`v < 99` guard, L18546).
  - `finishLock` already prevents a second done.

### E7 (B) CRUSH "queue one, coalesce the rest" drops taps and stalls the driver
- **Evidence:** `finishGame` sends `taps` as `clickAt(…,30)` plus `sleep(110)`, at most 4 per resolve (eos_drive L1005-1014), so taps arrive about 140 ms apart. That is inside the spec's "< 180 ms → queue, coalesce the excess" window.
  - Real anger tapping runs at 6-10 Hz.
  - Coalesced taps don't count, which contradicts "every tap counts; no dropped taps" (§3.3), and the driver needs extra resolve rounds.
- **Fix:**
  - **Count every pointerdown synchronously:** `n++`, the cue fires, and the `n/4` plate updates in the handler.
  - Decouple the jaw visual: on a tap mid-cycle, `cancel()` the jaw animation and restart it from the current computed transform. Use a compressed cycle, `cycle = clamp(0.8·interTapMs, 90, 268)`.
  - The 4th counted tap triggers the splat whatever phase the jaw is in.
  - Keep the heavy window (180-320 ms) as a bonus. It is not a gate.

### E8 (B) The hint patch is applied too late, and in render
- **Evidence:** the wrapper computes the first guide line in `useState(() => globalReleaseGuideTextLegacy(...))`, *before* its child router renders. `EosPilotEngineFor` runs inside the router render, so the first LIVE GUIDE line uses the old hint until the first progress report. That is also a render-phase side effect.
  - `shortHint()` reads `SHORT_HINT` at call time (00_arcade L2186), so a top-level patch works.
  - 60_eos_fixes already merges `EOS_HINT_FIX` at top level (`109: "Hold… then let go slowly"`).
- **Fix:**
  - In `70_pilot_core.jsx`, apply the hints **once at module top level**: `if (typeof window !== "undefined" && eosPilotOn()) Object.assign(SHORT_HINT, EOS_PILOT_HINTS)`. This is SSR-safe and in try/catch. File order 60 < 70, so it runs after the fixes merge.
  - Nothing to restore: the switch is per page load.
  - `EosPilotEngineFor` stays a pure lookup.

### E9 (B) Pilot words get tagged and restyled by the wrappers' DOM audits
- **Evidence:** both wrappers run an audit in a layout effect (L18610-18760, L19870-20710).
  - It adds `.tsExactUserText` to **any leaf element whose text equals an entry**. That includes the pilot's `<EosWord>`.
  - Generic rules then hit those words: readability's `line-height:1.05!important` (L99), the arcade's `font-weight:500!important` (`.releaseGlobal99Upgrade … .tsExactUserText`), and possibly more.
  - POP's weight 800 and the CRUSH tag's metrics change after the first audit, about 40 ms after mount.
- **Fix:** add a pilot word rule that beats them all:
  ```css
  ${EOS_A} .eosPilotArena .eosWord.eosPilotWord:is(*,.tsExactUserText){
    font-size:var(--eos-pilot-word-px)!important; font-weight:800!important; line-height:1.12!important;
    color:var(--eos-pilot-ink)!important; opacity:1!important }
  ```
  - Set `--eos-pilot-word-px` to `max(15px, …)`. **Never scale word size by `u`**: at u < 1 (a 360-wide phone) it would drop below 15.
  - Check V1 **after 1.2 s** (the audit retries at 40/120/280/600/1100 ms), not right after mount.
  - Avoid every class in the audits' `bubblePhotoSelectors` and `.uniqWord`/`.uniqArena`/`.uniqStatus`. Those trigger photo vars, character bonds and the `translate` auto-lift (L18680-18700).

---

## B. Major: performance on mid-range phones

### E10 (M) The audit MutationObservers make any per-frame DOM-tree mutation cost a full DOM sweep
- **Evidence:**
  - The legacy wrapper observes `{childList, subtree, characterData}` (L18754).
  - The new wrapper also observes `attributes` filtered to `src` (L20690).
  - Each mutation schedules (rAF-coalesced) a `querySelectorAll("span,b,strong,em,button,div,text,tspan")` sweep with `textContent` normalisation and rect reads.
  - The effect also re-runs completely (5 retry timers over 1.1 s, plus RO/MO re-attach) on every `progress`, `stepFx` and `finishFx` change, so **every input costs about 6 audits** regardless of what the pilot does.
  - 10_eos_readability also observes `childList` and `class` changes (L1415).
- **Fix:**
  - **No childList, characterData or `src` mutations per frame or per hit.**
  - Particle pools are mounted once and recycled with WAAPI (S3 already says so; make it a hard rule for droplets, shards, sparks and goo).
  - Face steps use **stacked `<img>`s with fixed `src`**, cross-faded by a class. Never swap `src`.
  - The CRUSH `n/4` plate uses `data-n` with `::after{content:attr(data-n)}` (an attribute change, not observed). Or accept one `textContent` write per tap.
  - **Arena DOM budget: ≤ 220 elements** (`arena.querySelectorAll("*").length`), so each audit stays ≤ 2 ms on a mid-range phone.
  - Add this to P1.

### E11 (M) The hold fill and breath are written per frame on the main thread
- **Evidence:** the spec writes inline `clip-path: inset()` and the `--b` var per rAF.
  - Inline `clip-path` changes repaint the layer every frame. They are not composited in Safari, nor in Chrome when driven from JS.
  - Inherited custom properties invalidate style for the whole orb block subtree every frame.
  - Both jank whenever the wrapper commits (E4).
- **Fix:**
  - The hold is deterministic (850 ms), so start a **WAAPI** animation on pointerdown. Animate the water node `translateY(100%) → 0` inside the ball's rounded `overflow:hidden` clip, and animate Body with `scale`. Both run on the compositor.
  - On an early release, use `anim.reverse()` with `playbackRate` −2 to drain.
  - Write `--hold-pct` on the button for the arrows/driver **at ≤ 20 Hz**, from `anim.currentTime`. The arrows' tick is 50-220 ms (L1188), and `eos_drive` polls the button's inline var and needs ≥ 97. Write exactly `"100%"` at the threshold.
  - Register `@property --hold-pct{syntax:"*";inherits:false}` so descendants don't recalculate. This is progressive: ignored before Safari 16.4.
  - P1 then becomes: "only transform/opacity animated; no per-frame inline writes except one ≤ 20 Hz meter var".

### E12 (M) WAAPI hygiene: animation counts, leaks and skip
- **Problems:**
  - `fill:"forwards"` animations stay "in effect": they pile up in `document.getAnimations()`, break the ≤ 40 cap, and hold their targets alive.
  - `finish()` throws on infinite animations, which breaks `fin.skip()`.
  - Unmount must cancel everything.
- **Fix:** one helper, `eosPilotAnim(el, kf, opts)`:
  - registers into a per-engine `Set` (`useRef`) and removes itself on `finish`/`cancel`;
  - uses `fill:"none"` by default, with the end state committed **before** the animation starts via a class or CSS var, so there is no jump at the end;
  - `skip()` calls `finish()` on finite and `cancel()` on infinite animations, each in try/catch;
  - unmount calls `cancel()` on all.
  - Count P1 only over animations whose `effect.target` is inside the arena (`document.getAnimations()` also returns the wrapper's and mood's animations).

### E13 (M) GPU memory and overdraw under the mood grade
- **Evidence:**
  - S3 stacks full-arena layers (L0 loud, L0 calm, L1, L2, L4 mist, key light, vignette).
  - The shared mood grade is a full-screen live `soft-light` blend at z 54 (G8). It forces a re-composite of everything beneath it on every animated frame.
  - One promoted full-arena layer at 390×844 and DPR 3 is about 11.8 MB. Six to eight of them cost about 70-95 MB and 6-8× fill per frame.
- **Fix:**
  - **Promote only what animates.** Make one static backdrop node: the loud gradient, vignette, key light and pre-blurred far shapes painted together, with no `will-change`.
  - The calm layer is the only full-size opacity layer. Add `will-change:opacity` only during `grade()` and remove it afterwards.
  - L1/L2 drift runs on the individual prop nodes (small layers), not on full-size layer wrappers.
  - The L4 mist is 2 bounded plates.
  - Cap: **≤ 12 `will-change` nodes; ≤ 2 full-arena composited layers.**
  - Measure frame times with the mood grade on and off (perf table in the approval package).
  - The wrapper's `CinematicStageFX` and nebula keep animating under the opaque arena. Safari has no draw-occlusion culling. Measure that cost; if it is significant, ask the owner about pausing (not hiding) them with `animation-play-state` while a pilot arena is mounted.

### E14 (M) Face decode memory and network
- **Evidence:** the faces are `bubble-expressions/*.webp`, measured at **512×512, about 27 KB each** (700 files, max 37 KB). Each decodes to **about 1 MB**. "Decode 7 × 4 = 28 at mount" (CLEANSE) is about 28 MB of bitmaps on a phone, fetched from `raw.githubusercontent.com`.
- **Fix:**
  - At mount, decode the current and next step per actor (CLEANSE: 14, about 14 MB).
  - Decode the win faces once progress ≥ 67. That leaves seconds of lead before the finale.
  - Pre-*fetch* the rest (about 750 KB total) at idle without decoding.
  - Give `decode()` a 1200 ms timeout: show the face if `img.complete`, else keep the hue and initial state (no empty sphere).
  - Drop the `Image` refs on unmount.

### E15 (M) Play-box measurement must not track the LIVE GUIDE live
- **Evidence:** the guide element is keyed by `guideText` (`key={guide-${id}-${guideText}}`, L18836), so it **remounts on every progress change**. A ResizeObserver on it detaches. Its height changes when the text wraps, which would re-layout the whole play plane mid-game.
- **Fix:**
  - Measure the HUD and guide once per arena size or orientation, using the guide's max height (or a reserved band).
  - Update `useEosPilotBox` state only on arena RO and `visualViewport` changes, rAF-throttled.
  - Ignore height-only `visualViewport` changes < 80 px (the mobile URL bar).

### E16 (M) The sound-sync log measures JS scheduling, not audible sound
- **Evidence:** `eosTone` schedules at `ctx.currentTime + at` with no latency compensation (00_eos_core L945-963). `eosAudio()` calls `resume()` asynchronously, so the first cue after a suspend is late or silent. The arcade `useSfx` owns a **second** AudioContext (L2629-2638), whose timing the pilot cannot see.
- **Fix (add these fields to each row):**
  - `ctxState = ctx.state`;
  - `lat = (ctx.baseLatency || 0) + (ctx.outputLatency || 0)`;
  - `audT = ctx.currentTime + at`;
  - `dtAudible`: map `audT` to the performance clock through `ctx.getOutputTimestamp()` when present (`perf = ts.performanceTime + (audT − ts.contextTime)·1000 + lat·1000`), else `(now − inputT) + at·1000 + lat·1000`.
  - Report both `dt` (scheduling) and `dtAudible`.
  - Get the ctx with `eosAudio()`. It is sound-gated: it returns null when muted, so log `muted:true`.
  - **Warm-up:** on the arena's first pointerdown, call `eosAudio()` so the context is created and resumed inside a user gesture (iOS). Flag rows where `ctxState !== "running"`.
  - Mark `via:"arcade"` rows as `audible:"unknown"`.
  - **`e.timeStamp` sanity:** if `|e.timeStamp − performance.now()| > 5000` (old WebKit epoch stamps, synthetic events), use `performance.now()` and flag `tsFallback`.

### E17 (M) F6 fails by design for the impact-timed cues; "one cue per event" contradicts the cue tables
- **The latency problem:** CRUSH s2, s3 and s4 schedule at `at:0.045`. Their dt is 45 ms plus the handler delay, which is above 50 under the shared CPU or on a phone.
  - **Fix:** test `dt − at·1000 ≤ 15` (input latency) for every input layer. For impact layers, test `|dtAudible − impactFrameT| ≤ 20 ms`, where `impactFrameT` is the jaw animation's impact time logged from `anim.startTime + 48`. Alternatively, drop the jaw to impact at about 30 ms with `at:0.03`.
- **The counting problem:** POP fires s1 and s2, CLEANSE s1+s2 and s4+s5, and CRUSH s1+s2(+s4) on the same event.
  - **Fix:** define a cue as a *layer set*, and log one row per layer with a shared `evId`.
- **Timed cues:** cues scheduled with `at` > 50 ms (finale plinks, pads) cannot be cancelled on skip, unmount or a mid-cue mute, because `eosTone` connects straight to `destination`.
  - **Fix:** schedule timed cues from the finale's timer ref (setTimeout, cleared on unmount), and keep `at` ≤ 0.045 only for impact alignment.

---

## C. Robustness and contract details

### E18 (M) Reduced motion has two sources
- **Evidence:**
  - `reduced` = framer-motion `useReducedMotion()`, which is the OS setting only (L21058).
  - The in-app "calm visuals" toggle is `[data-eos-calm="1"]` on the arcade root (12_eos_dots L1200; 60_eos_fixes uses `${EOS_A}:is([data-eos-calm="1"],…)`).
- **Fix:**
  - Compute `isReduced = live.current.reduced || !!arena.closest('[data-eos-calm="1"]')` per event, not once at mount. It can flip mid-game without a remount.
  - Turn off the CSS idle loops under both `@media (prefers-reduced-motion: reduce)` and `${EOS_A}[data-eos-calm="1"] .eosPilotArena`.
  - On a flip, `cancel()` the running loops.
  - Add an F7 run with the calm toggle on.

### E19 (M) Input edge cases
- **Mouse taps fire twice:** with pointerdown actions on a real `<button>`, a mouse tap fires the action **and** `click`.
  - Never bind `onClick` for actions.
  - Keyboard: `onKeyDown` Enter/Space with `!e.repeat` and `preventDefault()`. Hold = keydown start, keyup release. Escape cancels.
- **Android long-press:** Android fires `contextmenu` at about 500 ms, before the 850 ms hold threshold. `-webkit-touch-callout` is iOS only. Add `onContextMenu={e => e.preventDefault()}` on hold targets.
- **Near-hit:** read the ≤ 6 rects *before* any class or style write in the handler, to avoid a forced synchronous layout.
- **Second pointer:** ignore it (spec), but release on `pointercancel` and `lostpointercapture` as well. Also call `eosBreathOwn(null)` on cancel and on unmount mid-hold.

### E20 (M) CRUSH marker and hit target
- **Problem:** the marker is described "on the blob", while the hit is the press mouth. `eosArrowsAim` hit-tests the marker's centre, and the driver clicks it. If the blob is not inside the hit button, both have to route through near-hit, which is fragile.
- **Fix:** render the blob **inside** the press-mouth `<button>` (decoration `pointer-events:none`) and put the marker on that button.
  - The rect stays ≥ 12 px even at compression 0.22 (130 × 0.22 ≈ 29 px). The arrows' `usable()` floor is 12 (L214).
  - The same applies to POP strings and droplets and to CLEANSE ink: all are `pointer-events:none` so hit tests land on the targets.

### E21 (m) Toast-dock selector
- **Problem:** `:has()` needs Chrome 105+ or Safari 15.4+. Older Android WebViews drop the whole rule.
- **Fix:** in a layout effect, set `data-eos-pilot="1"` on `arena.parentElement` (`.cinematicContentShell`), and remove it on unmount. React does not manage that attribute, so wrapper re-renders keep it.

### E22 (m) Arcade CSS that hits pilot nodes
- **The rules:**
  - `.tsArcade.stage-play .releaseGameHost .arena button:not(:disabled):hover` adds `box-shadow: … 0 7px 19px rgba(0,0,0,.25)` and a border. On desktop that is a **dark plate under every hovered bubble**, which violates the bubble rules.
  - `.releaseGameHost .arena` itself gets an inset box-shadow and `isolation:isolate`.
- **Fix:**
  ```css
  ${EOS_A} .eosPilotArena .eosPilotHit:is(*,:hover,:focus,:active){background:none!important;border:0!important;
    box-shadow:none!important;padding:0!important;min-width:0!important;min-height:0!important;font:inherit!important}
  ```
  Add a pilot `:focus-visible` ring.
- **Class names to avoid:**
  - Live elements must not carry class words from `EOS_ARROWS_DEAD` (`dead|gone|popped|cut|loose|released|pulled|done|moved|shelved|…`; `-` counts as a word boundary).
  - No class names containing `ToolDock`, `ToolButton` or `ActivateBtn`: the fallback uses `[class*=…]`.

### E23 (m) Measuring "≤ 1 React commit per input"
- **Problem:** the pilot cannot see wrapper commits. One commit per input is unavoidable (the batched `p.sfx`/`onProgress` setStates). A second, delayed commit always follows from the toast-hide timer (980 ms legacy, 3200 ms new).
- **Fix:** restate P1 as "≤ 1 synchronous commit per input, and the pilot inner tree re-renders 0 times on wrapper-only commits".
  - Measure it with `<React.Profiler id="pilot">` around the inner tree. That works in the dev build only; `onRender` is a no-op in production React.
  - Use `PerformanceObserver("longtask")` for the > 200 ms check (Chrome only).

### E24 (m) Build constraints for one Framer file
- **Rejected by build.py (L36-46):** `import` and `export` lines in modules, and regex lookbehind (iOS < 16.4).
- **Order and references:** the pilot files are copied into the scratch `src/eos/` as `70-74`. They sort after `60`, so top-level order is fine. Nothing in 00_arcade may reference pilot names except through the `typeof` guard (already done).
- **Approval package:** the paste-able Framer file is **`/tmp/pilot_<you>/comp.jsx`**. A `--dev-dir` build does not write `ThinkStillReleaseArcade_EOS_FULL.txt`. Say so in §1.5.
- **No framer-motion on WAAPI nodes:** don't animate a node with framer-motion `animate` if WAAPI also touches it, because both write `transform`. Prefer no framer-motion in the pilot at all; it keeps per-frame JS at zero.

### E25 (m) Progress details (verified, with notes)
- **CRUSH:** the per-word-only progress is right **for performance too**. Each `onProgress` calls `setGuideText`, which remounts the keyed LIVE GUIDE (E15). Per-slam progress would remount it 24 times.
- **G4 algebra:** `p.sfx` then `onProgress(k/N)` ends at exactly k/N, because the creep is ≤ own+12 < the 16.7 step for N ≤ 6. **For N ≥ 9 the creep would pass k/N**, so assert N ≤ 6.
- **POP waves:** N = the **total** word count, not the wave size.
- **Tolerance:** the 96 at the last input can cross a reward bucket and show a step toast 1.3 s before the finish toast. That is acceptable, but include it in V3.

### E26 (m) Wrapper differences the builders must handle
| Aspect | Legacy (POP 1, CRUSH 2) `GameEngineLegacy` | New (CLEANSE 109) `GameEngine` |
|---|---|---|
| `ep` extras | `{...p, sfx, onDone, onProgress}` | adds `imageSources = liveImages` (rotates on every step reward), `positiveImageSources`, `hasUserImages` as a boolean |
| Step reward | toast, haptic and chain; 980 ms | toast plus `showPositiveReactionForFeedback(lastBubbleIndexRef)` → `setPositiveSlots`, `setReactionEpoch`, and a recompute of `phaseImages`; 3200 ms |
| Bubble index | none | read from `[data-ts-bubble-index]` on pointerdown (L19532-19542). The pilot has none, so slot 0 is used. **Check on the CLEANSE mid shot whether a wrapper reaction face appears.** If it does, put `data-ts-bubble-index={i}` on the orbs. |
| Guide text | `globalReleaseGuideTextLegacy(game, v, label)` | `globalReleaseGuideText(game, v, label, entries)`. Both use `shortHint`, so one top-level patch covers both (E8) |
| Audit MO | childList, subtree, characterData | the same plus `attributes:["src"]` (E10) |
| `wrappedDone` | label → `progressLabel(100)`, win ×3, then `onDone` after 3000 ms | the same, plus shift XP/tokens (localStorage writes) and positive reactions for all slots |
| Explicit progress | POP yes; **CRUSH no** (sfx creep, G4) | CLEANSE yes (`soft` gives no toast) |

### E27 (m) Timers and visibility
- If the tab is hidden mid-finale, WAAPI pauses but the timers still fire (throttled), so the hand-off can run before the visuals. That is acceptable.
- The S2 watchdog (`handoffMs + 800`) also covers a beat that throws.
- Beats must read nothing from React state (spec already says so).

### E28 (m) Unmount checklist (one `useEffect` cleanup per engine)
- timers ref;
- the animation Set (E12);
- the rAF id;
- `releasePointerCapture`;
- window/document listeners (keyup for keyboard holds, `visualViewport`);
- RO disconnect;
- `eosBreathOwn(null)` (CLEANSE);
- the shell's `data-eos-pilot` attribute (E21);
- decode refs (E14);
- the `live` ref left as is.

### E29 (m) User-image path
- With `hasUserImages`, the legacy wrapper passes the root's `visibleSlots`, and the new wrapper passes `liveImages`.
- Snapshot them once at mount, keyed by the joined strings.
- Render them in the same circular ball (no `object-fit` plate; `object-fit:cover` inside `border-radius:50%; overflow:hidden`).

### E30 (m) Verified OK, no change needed
- **The hook:** `RoutedGameContentLegacy` and `RoutedGameContent` are hook-free (L18281, L18911), so the injected early return is safe.
- **The switch:** `eosPilotOn()` is memoised per page load, so the element type never flips mid-session.
- **Keying:** the root keys the engine `${id}-${variationSeed}-${materialRevision}` (L22099), so replay remounts it.
- **Single done:** `wrappedDone` has `finishLock`, and the root `done` has `donePendingRef`. With S2's own lock, there are three guards.
- **Sound gating:** both sound paths are gated by the toggle (`useSfx(enabled)`, and `eosAudio()` returns null when `!sound`).
- **CSS:** `eosCss` at top level only. Never call it at runtime: it re-renders the single global `<style>`. Pass dynamic values as CSS vars.
- **Dev handle:** `eosExpose` publishes `window.__eos` only when `eosIsDev()`. The 400-row ring buffer is cheap enough to keep in production too.
- **Arrows table:** `EOS_GESTURES[1]`, `[2]` and `[109]` target `button.popBubbleV2`, `button.uniqControl` and `button.cleanseBubbleHoldButton`. The pilot uses none of these, so the table never resolves and markers decide (as long as E2 holds).
