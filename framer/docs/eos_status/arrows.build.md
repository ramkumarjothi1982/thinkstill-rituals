# arrows — BUILD REPORT (finished)

## What I built
`src/eos/30_eos_arrows.jsx` (~1,730 lines, shared file scope, no imports, every identifier prefixed Eos/EOS_/eos). It adds a guide arrow to every stage of every game.

- **In-game layer `EosGuideArrows({game, entries, hostRef, reduced})`**: a read-only overlay (`div.eosArrowsRoot.eosArrowLayer`, pointer-events none, z 60) that sits beside `.releaseGameHost`. It shows one cartoon glove (`svg.eosHand`, fingertip hotspot), a gold 3D chevron, and a chunky Baloo label (15 px desktop, 14 px phone), aimed at the live target. Each gesture has its own demo: tap, taps×n, hold, holdRelease (striped green window), drag, dragTo (pulsing DROP HERE zone), slow, swipe (3 ghost copies), sling (elastic band plus fly arc), scrub, timing (bpm / lit "NOW!"), alt, choose (gold halo hops across every option), seq (step number), tool, wait (cyan palm breathing with `eosBreathPhase`, countdown arc, gentle shake on touch), and type (caret).
- **Targets:**
  - The per-game table `EOS_GESTURES` covers ids 1-110 (§3.11). The most advanced state is listed first, with `when` / `once` / `until` / `armed` / `pick:"near"` / `@text`.
  - Games 111+ use `[data-eos-target]` markers. When the first marker is `choose`, every marker is an option.
  - There is a guarded fallback list. If nothing qualifies, no arrow is shown.
  - A usable target must meet the size, visibility and opacity rules (up to 3 ancestors). Disabled elements, dead classes and HUD/guide containers are excluded. The hand aims at the first hit-test sample (centre, then the 25%/75% points).
- **Lifecycle (§3.5):**
  - First show after 700 ms (500 ms for 111).
  - The hand hides on any pointerdown in the host. It hides immediately through the DOM, measured at 120-158 ms.
  - Stage-advance re-show runs 350 ms after pointerup and on any stage-key change. The stage-2 label appears in 60-110 ms (3) and in 0-217 ms for 3, 28, 40, 88, 98 and 107.
  - A missed tap re-shows the cue in about 1.2 s with a 3-shake wiggle. After 4 s idle it re-shows (6 s for veterans), and every 3rd re-show turns on the spotlight (level 3).
  - Veterans (`eosLearnedCount`) get level 1 (no label) and a 2.5 s first show. Games with `own:` get level 2 until they have been learned once.
  - A gold ✓ sparkle appears whenever progress rises.
- **Pinned count badge `.eosCount`**: it stays on the target's top-right corner for the whole taps stage, while the hand and label fade. It counts pointerdowns by (stage, selector, ordinal), so CRUSH reads ×4 → ×3 → ×2 → ×1 → ✓ even though the button remounts. Each tap plays a pentatonic `eosTone`, and it bursts into a green ✓ at 0. Markers carry their own live `n`.
- **Live feedback (§3.6):**
  - `.eosHoldLive` ring at the finger. It follows a real meter (11 `--p` on `.pressureCapsule`, 65 `.pauseRing`, 109 `--hold-pct`) or time. It flips to a green "LET GO!" inside the window, and the window arc is striped (not colour alone).
  - `.eosDragGoal`: an end ring at `d` along `dir` and a projected fill. It flashes green at threshold; sling also shows "LET GO!".
  - For `slow` (or any stage with `maxSpeed`) the gauge is green under the limit and amber "🐢 SLOWER…" above it. Speed is CSS px/s ÷ stage scale.
- **Label placement**: tries above, below, right, left, then further above / below. Hard-avoids the HUD, guide, companion, safety card, support pill, world chips and the target. NEW: it also soft-avoids the game's own text (text-node rects in the arena, refreshed every 600 ms). So it no longer covers prompts such as 111's "Dizzy or tingly? Breathe normally" safety line.
- **Completion is a resumable park**: the layer parks on `.globalPlayGuide.isComplete` or `.tsRewardSurge.mega`. It resumes if the bar drops again, or if it is still in play 2.5 s later and the player touches or a new stage resolves. This fixes 96 SCRATCH, which fills the bar on ticket 1 but keeps dealing tickets. Before this, the arrows went dead for the rest of that game. The mega surge never resumes.
- **Keyboard**: typing into an input keeps the cue up and lets the next stage (50's SHOW ME) take over at once. Other keys hide the cue like a touch.
- **SR line**: `div.eosSrOnly[role=status][aria-live=polite]` carries the label (+ " · n left"), throttled to one update per 1.5 s.
- **Reduced motion / calm visuals** (`eosCalm(reduced)` class `isCalm` plus `@media (prefers-reduced-motion)`): no travel, ripple, bob, ghosts, fly or wiggle. The hand rests on the target, the dotted path and chevron arrowhead stay static, and a 1.6 s opacity pulse is the only animation. The wait palm keeps ≤4% scale with a numeric "in 3… out 4…" countdown.
- **Phone (≤560)**: hand 52 px, chevron 36 px, label 14 px with 6×10 padding, badge 22 px, travel `max(60, d×.75)` clamped into the stage.
- **LIVE GUIDE glyph**: `eosGlyph(game)` uses `EOS_GLYPH_OVERRIDE` {88 ☝, 94 ◎, 97 →, 98 ◎, 101 ←, 106 ◎, 107 ◎}, then the first table stage, then `EOS_GAME_META[id].gesture` for 111+. The CSS restyles `.guideActionArrow` in both wrappers as a 30 px gold glowing pulsing disc (26 px ≤700), and the `.guideStepCard` gets padding-left 48 px.
- **Stand-alone hints**:
  - `EosHandCue` (presentational, absolute coordinates).
  - `EosHandHint({target, root, g, label, L2, n, ms, dir, d, win, to, rest, reduced, showAfterMs=600, idleMs=3000, once, level})`. `target` can be an Element, a selector, an Element[] or a function. It hides on pointerdown/keydown in `root` (default: its parent) and re-shows after `idleMs`. For `choose` the halo hops across every element and the hand rests on the middle element or on `rest`.

## Exports (shared scope + registry)
`EOS_GESTURES`, `EOS_GLYPH_OVERRIDE`, `EosGestureFor(game) → {stages, glyph, own}`, `eosGlyph(game)`, `EosGuideArrows`, `EosHandCue`, `EosHandHint`, `EOS_ARROWS_CSS` (registered with `eosCss("arrows", …)`).
`eosExpose("arrows", {EOS_GESTURES, EOS_GLYPH_OVERRIDE, EosGestureFor, eosGlyph, EosGuideArrows, EosHandCue, EosHandHint, state})`.
`state()` returns `{visible, g, label, text, stage, targetSelector, x, y, inViewport, count, level, kind, occluded, id, gauge, parked, resumed}`.
Dev globals (file:/localhost/?eosdev=1 only): `window.__eosArrowMiss` (ids whose arena never resolved; always empty in tests) and `window.__eosArrowsResumed` (ids whose layer resumed after a park; only 96 in tests).

## What the integrator must wire (already scripted in dev/eos_integrate.py; nothing new)
- **I1-E3**: `<EosGuideArrows game={selected} entries={renderedEntries} hostRef={gameHostRef} reduced={!!reduced} />` inside `section.releaseStage` while `stage === "play"`, as a sibling of `.releaseGameHost`, keyed `${id}-${variationSeed}-${materialRevision}`.
- **I1-E4 / E6**: `<i className="guideActionArrow" aria-hidden="true">{eosGlyph(p.game)}</i>` in both LIVE GUIDE cards (the new card's dead `id < 100` gate turned on). **I1-E12** stops the regex arrow prefix for ids ≥111.
- **Consumers** (check-in, Still Moment, shift meter, reveal dial): `const H = eosApi("arrows").EosHandHint; H ? <H target={els} g="choose" rest={notSure} label="TAP HOW YOU FEEL" /> : null`. Render it as a component, not as a function call. Put it inside a positioned parent: the hint layer is `position:absolute; inset:0` of that parent. 40_eos_checkin.jsx already does this.
- **New games**: mark live elements with `eosTarget({g, label, n, ms, dir, d, win, meter, mvar, to, own, ox, oy})`. The stage identity is gesture + base class + label, so state classes toggling every frame do not re-pop the cue.

## Tests (scratch integrated build /tmp/eos_arrows_int = arrows + games 111-114; isolated build /tmp/eos_arrows OK)
1. **Hand within 1.5 s, hotspot inside target ±10 (group bbox for choose, palm for 66/80), label ≥14 px**: 1280×860 passes 114/114 (max 1.0 s). 390×844 passes 113/114; the one failure is 103, see Known limitations.
2. **finishGame per-stage (assertArrows) over 70+ runs** covering 2-114 (3, 4, 9, 11, 19, 28, 40, 43, 50, 66, 67, 72, 82, 88, 94, 96, 98, 101, 106, 107, 111-114 and a 25-game 1280 set plus a 17-game 390 set): every stage is visible with a matching label. The only failures are game-side issues (see Known limitations).
3. **CRUSH badge**: ×4 → ×3 → ×2 → ×1 → ✓ at both sizes.
4. **Hide / re-show timing**: hide 120-158 ms, miss re-show 1.16-1.25 s with wiggle, idle re-show 4.1-4.7 s.
5. **36 fast drag**: amber, "SLOWER…", `state().gauge === "amber"` (both sizes, unloaded machine).
6. **LIVE GUIDE glyph**: present in both wrappers, and the override glyphs are correct.
7. **EosHandHint test page** (choose over 3 elements): the halo visits all 3, hand at 357-429 ms, hidden on touch, re-shown at 3.1 s. Reduced motion: no animation.
8. **SR line**: `div.eosSrOnly[aria-live]` carries the label.
9. **Reduced motion**: hand position constant, animation none, pulse only.
10. **Side effects**: `__eosArrowMiss` empty, zero page errors in every run, MutationObserver on `.cinematicContentShell` sees 0 eos nodes.

## Screenshots
`framer/dev/shots/eos/arrows_<id>_1280.png` and `arrows_<id>_390.png` for ids 2, 3, 11, 24, 28, 32, 36, 50, 66, 72, 98, 107, 111, 112, 113, 114. Also:
- `arrows_36fast_1280.png`, `arrows_36fast_390.png` (amber gauge)
- `arrows_3s2_1280.png`, `arrows_3s2_390.png` (stage 2)
- `arrows_hint.png`, `arrows_hint_reduced.png`
- `arrows_36_reduced_390.png`

## Known limitations (game-side; the arrows behave correctly)
- **103 SINKING PLATFORM @390**: `button.spDropButton` renders at y≈1059 inside an `overflow:hidden` arena, so it is unreachable. The arrow is correctly absent because it never points at an unreachable element. Fix is in the fixes task (§11.6 "phone layout fit"); the arrow appears as soon as the button is inside the stage.
- **107 GO WEIRD @390**: the prop tray is clipped (§11.6), so finishGame times out. Arrows and labels are correct.
- **21 BIN** (both sizes): `transform:none!important` freezes the drag (foundation sweep, fixes task), so finishGame gets stuck. The arrow and its DROP HERE zone are correct.
- **3 CRACK @390**: the tool dock sits on the LIVE GUIDE panel. The hand is on the dock (hit-test OK), but the layout is cramped (readability / fixes).
- **96 SCRATCH**: the bar reports 100% after ticket 1. The arrows now resume for the following tickets; the bar bug itself belongs to the fixes task.
- `occluded` (dev flag only) is reported for 8, 17 @1280 and 8, 47, 107 @390. The hand aims at the element centre; §11.6 handles these occlusions.
- **Deferred games 115-120**: there are no table entries, and the marker path handles them automatically if they ship later. Glyphs fall back to ☝ through `EOS_GAME_META`. Nothing references them.
