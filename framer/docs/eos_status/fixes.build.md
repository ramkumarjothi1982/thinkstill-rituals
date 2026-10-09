# EOS build: fixes — FINISHED

**What I built:** `src/eos/60_eos_fixes.jsx`, which covers spec §11 (all of it), §0.2 (`eosTextSafety` / `EOS_NEUTRAL_WORDS` in `EosEntries`), the §3.10 66/80 copy, and the §0.5 foundation-sweep game bugs that CSS or a guard can fix. It is one module: no imports, `Eos`/`EOS_FIXES_`/`eosFixes` namespace, `eosCss("fixes", …)`, no regex lookbehind, every listener and timer is cleaned up.

## Exports
- **`EOS_HINT_FIX`** — 50 corrected LIVE GUIDE lines. They are merged at module top level with `Object.assign(SHORT_HINT, EOS_HINT_FIX)` inside a guarded `try`.
- **`eosGateProgress(ref, value, fromSfx)`** — the exact §11.2 algorithm, keyed by a WeakMap on `progressRef`.
- **`EOS_LIVE_SELECTORS`** (array) — the live-element list for the §11.3 highlight. It is interpolated into the highlight rule, the reduced-motion rule and the calm rule.
- **`EosEntries(raw)`** — returns `null` (original behaviour) or 6 unique chunks.
  - Safety comes first: `eosTextSafety`, then `EOS_NEUTRAL_WORDS` under a strong flag, whether `enrich` is on or off.
  - Empty text returns `null`, so image-only uploads keep their own path.
- **`EosLegacyGuards({game, hostRef})`** — renders `div.eosGuardLayer` (z 58, `aria-live="polite"`, pointer-events none) only for the guard ids.
- **`EOS_FIXES_ALMOST`** — the "almost!" lines for ids 11, 13, 39 (added, same rule as 13/65), 65, 36, 64, 69, 70, 66 and 80.
- **`EOS_FIXES_CSS`** — all the CSS rules.
- `eosExpose("fixes", {EOS_HINT_FIX, EOS_FIXES_ALMOST, EOS_LIVE_SELECTORS, eosGateProgress, EosEntries, drumLog})`. `drumLog` holds voice names only and is filled only in dev.

## What the guards and CSS do
- **Hold-release guard (11, 13, 39, 65):** a slide-off or `pointercancel` re-dispatches `pointerup` on the current `button.uniqControl`.
- **"almost!" lines:**
  - The trigger is read from the committed DOM: `--p`, the foam/spaghettify transform, the lamp class, the `BEAT n` text, tap spacing, and restart counting for 66/80.
  - 69 also flashes a ring 700 ms after an early tap.
  - At most one line every 2 s; 16 px on desktop, 15 px on phone; fade-in; reduced-motion and calm variants.
- **68 DRUM IT:** four distinct `eosTone` voices — kick, snare, tom, clap. The third button is labelled TOM, so it plays a tom rather than the hat in the spec.
- **21 BIN:**
  - Framer-motion's inline transform is mirrored into `--eos-bin-t`, so the dragged bubble now moves and the game's own `onDragEnd` hit test works.
  - A drop with the pointer over the mouth (I3 margins) that did not bin falls back to a `dblclick`.
- **Calm visuals:** sets `data-eos-fixes-calm` on `.tsArcade`, which stops the live and tool pulses.
- **CSS fixes:**
  - Live highlight, plus dimming of the non-live elements.
  - Tool-dock arm pulse for 3, 4, 9, 16, 19, 43 and 96.
  - §11.6 occlusion fixes for 8, 17, 59, 42 and 47 (`:has(.plug)` added), and the 48 sticker minimum size.
  - 11: a striped green release-window band (55–92) on the needle track, which brightens while the needle is inside it.
  - 14: `clip-path` removed and replaced with a skew/rounded crumple look.
  - 51: the mirror stage gets `pointer-events:none`.
  - 77: `.filmGate` gets `overflow:visible`.
  - Phone: 45 orb moved to `left:8%`; 71 DEFUSE zones are compact rows; 103 is a compact 3 × 2 machine.
  - 107 GO WEIRD:
    - Desktop: compact cards (`--gw-card-h` 142, images 90) plus tighter gaps.
    - Phone: 3-column cards and a 3 + 2 prop dock with 12 px labels.

## What the integrator must wire
These are already the edits in `dev/eos_integrate.py`; nothing new.
- **I1-E3:** `<EosLegacyGuards game={selected} hostRef={gameHostRef} />` in the play fragment.
- **I1-E7 / E8:** `reportProgress = (value, nextLabel, eosFromSfx)` uses `eosGateProgress(progressRef, value, eosFromSfx)`, and `wrappedSfx` passes `true`. Two occurrences each.
- **I2-E12:** at the top of `cleanEntries(raw)`: `{ const eosEntries = EosEntries(raw); if (eosEntries) return eosEntries }`.
- **I3-E1/E2** (the `.eosNext` class on TAP OUT, needed by the 67 highlight), **E3** (11 window 55–92 and `min(meter, 40)` on a miss; the stripe band is drawn for 55–92), **E4** (BIN margins 70/70/80/90), **E5** (ECHO no-reset).
- **Still missing — I3 source fix for 109 CLEANSE** (not in `eos_integrate.py` yet; CSS cannot fix it). In `CleanseEngine.finishHold`, make the released list never shrink: `setReleasedIndices(releasedRef.current.slice())`, or a functional update that never shrinks. Otherwise fast players get stuck at 100 %.

## Acceptance — all run in the integrated scratch build (`/tmp/eos_fixes_int`), zero page errors
1. **Progress logs never decrease.**
   - 390: CRUSH, PIN POP, ARCHIVE and TAP OUT all reach the reveal; the logs never decrease and end at 100.
     - CRUSH / ARCHIVE / TAP OUT: `12,17,29,33,45,50,62,67,79,83,95,100`
     - PIN POP: `17,33,50,67,83,100`
   - Sfx creep alone is capped at 96, so only the engine's own final report or `onDone` can show 100.
   - UNFINISHED SENTENCE goes `34 → 100` (above 12 before the finish).
2. **Hint lines:** all 50 `EOS_HINT_FIX` ids show their new line in the LIVE GUIDE (390).
3. **Live highlight:** matches exactly one element at the start of 14, 17, 20, 33, 37, 42, 51, 55, 60, 63, 71 and 74, with the pulse animation and gold ring (390).
4. **Entries** (node, with the real `tokeniseWords` and `pct`):
   - "i am panicking about tomorrow" → `["i am panicking","about tomorrow","racing heart","tight chest","too fast","shaky"]`
   - "i am panicking" → `["i am panicking", +5 panic seeds]`
   - "so tired of it all" → `["so tired","of it all", …]`
   - "i want to die" → `EOS_NEUTRAL_WORDS` with `enrich` on and off, and at any length.
   - Text of 6 or more tokens → `null` (unchanged).
   - Empty text → `null`.
5. **Sliding off PRESSURE POP stops charging:** `--p` is frozen after the release (390 and 1280).
6. **"almost!" lines:** every line appeared for its condition in 11, 13, 39, 65, 36, 64, 69 (with the ring), 70, 66 and 80, at both 390 and 1280. For 11 at 1280, the slow headless frame rate let the needle reach the window, so the release correctly counted and no line was shown.
7. **GO WEIRD props:** all five are hittable at 5/5 sample points at 1280×860 and 390×844 with the `overflow-clip-margin` rule removed.
   - Dock bottom is inside the game box at both sizes.
   - Props sit above the LIVE GUIDE: bottom 573 vs guide top 575 at 1280; bottom 505 vs guide top 559 at 390.
8. **DRUM IT:** 4 distinct `eosTone` voices, checked by recording `AudioParam` values — kick 150/900, snare 230/3100/4700, tom 196/392, clap 1250×3/1050.
9. **Stub vs real gate:** the `eos_integrate.py` stub and the real `eosGateProgress` give identical output on the CRUSH sequence (`0,12,…,95,100`) and on 3,000 random fuzz sequences (0 differences, 0 decreases).

Also verified:
- **Phone fixes:** 71 DEFUSE — all 3 zone buttons hittable at 390 (before: STEP 3 clipped). 103 SINKING PLATFORM — LOWER button bottom at 539 (before: 1105, below the screen). 45 orb on screen. 21 BIN drag-to-bin works (progress 0 → 17).

## Screenshots
`/home/user/thinkstill-rituals/framer/dev/shots/eos/`:
- `fixes_11_window_{390,1280}.png`
- `fixes_14_crumple_390.png`
- `fixes_64_almost_390.png`
- `fixes_21_drag_390.png`
- `fixes_107_{390,1280}.png`
- `fixes_103_390.png`
- `fixes_71_390.png`
- `fixes_3_toolpulse_{390,1280}.png`
- `fixes_74_live_{390,1280}.png`
- `fixes_45_390.png`
- probes: `fixes_probe_{71,103}_390.png`

## Known limitations
- **107 desktop:** the more compact cards let the label pill overlap the bottom ~30 % of each character orb. Props being visible won over that. A polish pass could shrink the label pill or move the image up, to meet the "text below the bubble" rule.
- **103 phone:** a dark vertical column over the active (first) bay is still there. It existed before these fixes, is pointer-events none, and is probably the sink-shaft effect of the active bay.
- **Test coverage:** representative subset only (≤ 12 games per check). The full 110-game sweep belongs to Regression. CSS-only fixes for 8, 17, 48 and 77 are in place but were not swept here.
- **The 11 release band assumes I3-E3** (window 55–92). Without I3 the band is slightly wider than the 62–88 window.
- **109 CLEANSE** needs the I3 source edit above.
