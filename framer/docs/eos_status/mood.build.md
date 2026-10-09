# EOS build: mood. FIX ROUND 2 (v2 close-out) FINISHED

Round 2 applied every finding in `docs/eos_status/mood.review_r2.json` (1 major, 4 minors) in `src/eos/14_eos_mood.jsx`, the only file changed. Verified on the isolated integrated build `/tmp/v2_mood` (all 15 `src/eos` modules, 0 stubs); test scripts and results are in `/tmp/v2_mood_t/` (`fin.mjs`, `r*.json`, `equiv.mjs`, `perf3.mjs`, `sheet1.png` and `sheet2.png`). Every run had 0 page errors.

## Round 2 fixes (finding → change → proof)

1. **MAJOR + minor 3: wrong finish-card prediction in 112 on phone.**
   - **Change:** `probeCard`. A hidden copy of the card is measured where the real card will sit: same classes (`globalFeedbackCopyLayer globalFinishFeedbackCopy` plus flavour and family), same parent (`.cinematicContentShell`), the same body per wrapper, and the arcade's own finish clamp (`--fb-shift-x/y`). It is set to `visibility:hidden`, `animation:none` and `transition:none`, all `!important`. It is laid out, read and removed in the same task, so every per-game override applies, such as 112's `:has(>.eosG112)>.globalFinishFeedbackCopy{top:var(--eosVolcFinY)}`. The old per-wrapper model is kept as the fallback.
   - **Proof:** the guess now equals the real card's measured box in every run where the card came after the bloom:
     - 112 at 390: `{10,367,340,130}` (the reviewer measured `{10,371,340,121}`);
     - 113 and 114 at 390, 111, 113 and 112 at 1280;
     - legacy 2 at 390 and POP 1 at 1280 (press-anchored), within 1 px.

     The real card covers 0 % of every word.
   - **Second cause, found while verifying:** with the card fixed, one 112 phone run still yielded two words. Rush hops from the crater to the summit 1.2 s into act c, and that pin moved onto the crown.
   - **New, `eosMoodPinPath`:** at placement only, each pinned root's running finite CSS animations and transitions are seeked ahead to 25, 50, 75 and 100 % of the bloom life. The root is measured at each step, and then every seek is restored in the same task, so nothing paints and no event fires. The samples become hard `path` obstacles, and `state().place.path` counts them.
   - **Result:** 112 at 390, twice, gave yields 0, a clean tier-2 stack at 25.2 px beside the landed Rush, and no overlap with "Cooled to zero", the hero, the flowers or the card (`sheet2.png`).
2. **Minors 2 and 5: placement cost on the finish frame.** `eosMoodPlace` now prunes exactly:
   - each anchor row tests only the obstacles that cross its vertical band;
   - a candidate stops scoring once it can be neither clean nor better than the best (or the clean) place found so far, with a 1e-3 margin for float noise;
   - the reported score uses the full formula's own order.

   Result:
   - Node equivalence against the round-1 function (`equiv.mjs`): 400 random stages with 0–300 obstacles gave 0 differences. Total time went from 17.0 s to 2.8 s, about 6× less.
   - In the browser at 4× CPU throttle, on the reviewer's synthetic stage (min of 7 runs, two interleaved runs per build):
     - 120 obstacles: 19.8 / 10.7 ms → 9.3 / 4.6 ms;
     - 300 obstacles: 39.8 / 28.4 ms → 11.9 / 9.7 ms.

   The result is identical, so the bloom still starts on the `isComplete` frame (no rAF delay was added).
3. **Minor 4: 113's emoji anchors were invisible to placement.**
   - **Standing pictographs (`\p{Extended_Pictographic}`) of 18 px or more** now count as hard `img` content (cap 40). They are skipped when they are inside a particle container (`particle|confetti|spark|burst|ember|floater|trail`) or still in transit, meaning a running finite animation on the glyph or its 3 nearest ancestors. Ambient infinite loops still count.
   - **New pin** in the stopgap list: `.eosGroundSlot[data-burn="1"] .eosGroundFound`. It counts while the anchor is still popping in.
   - **Pinned roots in an entrance scale** are now reserved at their full layout size.
   - **Result:** for 113 anxiety at 390, normal (×2) and reduced, the words do not overlap any glyph or text, and there are 0 yields. The placement is a tier-3 tight crown at 21 px under the sense buttons (`sheet1.png`). For 113 at 1280, it is a clean tier-0 crown.

**Test hook:** `eosExpose("mood")` also publishes `content` (`eosMoodContent`, read-only), which is used to name what lands on a yielding word.

**Regression:**
- `/tmp/eos_mood_t/unit2.mjs` PASS.
- The isolated build `build.py --modules 00_eos_core.jsx,14_eos_mood.jsx` passes.
- Runs with 0 yields, 0 % card cover and 0 page errors:
  - 112 at 390 (×4) and 1280;
  - 113 at 390 (normal ×2 and reduced) and 1280;
  - 114 at 390;
  - 111 at 1280;
  - 2 at 390;
  - 1 at 1280.
- One parallel 111 at 1280 run timed out with no finish under load average 20. The same run alone passed.

---

# EOS build: mood. FIX ROUND 1 FINISHED

The module is `src/eos/14_eos_mood.jsx` (the only file I own). It covers spec §5.6, §0.2 (grade and flip) and §11.9. Round 1 applied every finding in `docs/eos_status/mood.review_r1.json`: 1 major and 5 minors, all fixed, none skipped.

## Round 1 fixes (finding → change)

1. **MAJOR: the flip bloom covered the hero games' own finale** (112's "Cooled to zero", 114's character face, 113's hero and labels; CREATIVE_STANDARDS 2 + 4).
   - **Hard obstacles.** The game's own content now counts as a hard obstacle, weighted 12× the chrome, in `eosMoodContent`. It is read from the whole game host and covers three kinds:
     - **Pinned roots.** These count even while they are still fading in:
       - `[data-eos-avoid]`, a new contract: engines tag their character bubble and their finale headline with it.
       - `[data-eos-finale]` and `[data-eos-char]` (EosCharacterOrb).
       - The known 111-114 roots, as a stopgap until those engines carry the tag: `.eosOrbFace`, `.eosVolcHero`, `.eosVolcCloudFace`, `.eosGroundHero`, `.eosGroundFace`, `.eosGroundFin`, `.eosSighOrbWrap`, `.eosSighMoonFace`, `.eosSighSyncFace`.
     - **Pictures (the generic pass for legacy games).** Every visible `<img>` of at least 20 px, plus circular background-image bubbles.
     - **Text.** Every visible text of at least 2 letters at 14 px or more.
     - **Skipped:** chrome subtrees, anything larger than 45 % of the stage (backdrops and containers), and sub-word glyphs such as emoji particles and "+10".
   - **Tiered search** in `eosMoodPlace`. It stops at the first tier that has a clean place, meaning no overlap with anything:
     - (0) a crown within ±240 px of the Still Point;
     - (1) a crown anywhere on the stage, which is the clearest band above or below the character;
     - (2) a tight crown, then a stacked one;
     - (3) smaller words (×.84, then ×.7), never below 20 px.

     When no tier is clean, the place with the least cover wins. A crown that pokes past the stage edge is now slid back in while each candidate is scored, not only for the final pick.
   - **No more glide.** The crown never travels sideways while it rises. During the bloom's life, a re-check every 120 ms looks for anything new that lands on a word, such as a finale headline or a card the prediction missed. When something does, only that word steps aside by fading out over .26 s (`.eosMoodWord.isYield`). Cover that a word already had when it was placed (the least-bad choice) does not count.
   - **Overlap assertion** added: `/tmp/eos_mood_t/overlap.mjs`. It uses the reviewers' method: each word is frozen 700 ms into its own animation, then checked again at bloom + 1300 ms, against every visible arena `<img>` of 14 px or more, text of 14 px or more and `[data-eos-char]`.
2. **Minor: bloom longer than the shortest finish hold.** The stagger is now 200 ms and each word lives 1.5 s, in both the rise and the reduced/calm fade, so the whole bloom ends at 1.9 s. That is inside GameEngineLegacy's 2050 ms minimum hold, however an engine times onDone. Sparks are .85 s with a +.16 s delay. The rise is 44 px; only the first 30 px count for placement, because the rest is crossed at under half opacity. The old report's "≈ 3 s" claim is corrected: the hold is ≥ 2.05 s.
3. **Minor: finale hero as an obstacle.** Covered by fix 1, and stronger than the reviewer asked: the finale is a hard obstacle, not a soft one.
4. **Minor: text measured at weight 800.** The canvas now measures at `900`, which matches `.eosMoodWordTx` (Baloo 2 900). The fallback factor went from .56 to .58.
5. **Minor: the grade washed out the HUD and LIVE GUIDE.** Both colour layers now carry a feathered SVG mask: rounded holes with 8 px padding and a 6 px Gaussian blur over `.engineProgressHud`, `.tsShiftRewardHud`, `.globalPlayGuide` and `.releaseScoreBar`.
   - The mask is applied with `mask-image` plus `-webkit-mask-image`.
   - It is re-measured every 500 ms and on resize, and rewritten only when a rect moves on a 6 px grid.
   - `state().carve` reports how many rects are carved.
6. **Minor: the crown re-glided because the card prediction missed.**
   - **Prediction rebuilt from measurements, per wrapper:**
     - **GameEngine (ids 100+):** the arcade's final `!important` rule centres the card in `.cinematicContentShell`, wherever the last press was. Size is 320 × 101 at 390 and 440 × ~112 at 1280.
     - **GameEngineLegacy (ids 1-99):** the card is centred on the last press and clamped into the shell. The press is tracked the same way the arcade tracks it. Size is 288 × 114 at 390.
   - The card now weighs 2.5× the rest of the chrome, because its "SHIFTED ✓" is the finish message.
   - The glide is gone (see fix 1), so `moves` is always 0.

## What I built (unchanged parts, short)

### (a) Colour script
`EosMoodGrade` renders three sibling layers in `.releaseStage`: `div.eosMoodGrade` (soft-light), `div.eosMoodAir` (screen) and `div.eosMoodFlip` (the words). All three are at z 54, `pointer-events:none!important` and `aria-hidden`.

- Colours run loud → calm, mixed in OKLCH on the hue path that avoids the yellow-green band.
- Opacity goes from .22 to .08.
- The JS tween takes .6 s per progress change. In reduced/calm mode the script moves in three steps (33 / 66 / 95 %) with .9 s cross-fades.
- Numb gets `saturate(.6 → 1)`.
- Late night warms the calm pair 10° toward amber.
- The finish always lands on the calm pair.

### (b) Flip bloom
- **Trigger:** the first `.globalPlayGuide.isComplete` or `.tsRewardSurge.mega`.
- **Words:** the feeling's three core `flip` words. Font is Baloo 2 900, cream with a warm hairline, calm glow and dusk cloud.
- **Size:** 42 px at 1280 and 25.2 px at 390 when space allows; never below 20 px. The size is set per bloom through `--eos-mood-fs`.
- **Motion:** the words are born at the Still Point. They pop with squash and stretch and float up 44 px. In reduced/calm mode they fade in place, and there are no sparks.
- **Sound:** a soft chime, gated by the arcade's sound toggle.
- **Hygiene:**
  - Words are pre-rendered (hidden), so the bloom starts in the same frame that shows `isComplete`.
  - No store writes and no user text.
  - The flip root carries `EOS_PRIVATE_ATTRS` and `fs-mask`.
  - Every timer, observer, listener and rAF is cleaned up.

### Release-1 scope
The module does not depend on flipdata or on games 115-120. Words come from core `EOS_EMO[id].flip`, with STILL's words as the fallback, so the list is never empty. It works for every registered id, 1-114.

## Exports
- **`EosMoodGrade({ game, hostRef, reduced })`** is the component. It now also reads `game.id` to choose the card model.
- **`EOS_MOOD_CSS`** is registered with `eosCss("mood", …)`.
- **`eosExpose("mood", …)`** publishes these read-only helpers:
  - `state()`, whose `place` now includes `tier`, `clean`, `layout`, `fs`, `hard`, `cover`, `guess`, `card` and `yields`, and which also has `carve`;
  - `palette`, `colours`, `t`, `step`, `flipWords`, `mix` and `warm`;
  - new: `place` (`eosMoodPlace`) and `carveUrl`.

## What the integrator must wire (unchanged)
1. **I1-E3:** `<EosMoodGrade game={selected} hostRef={gameHostRef} reduced={!!reduced} />` inside the keyed play fragment in `.releaseStage`, for both wrappers.
2. **I1-E1:** `<EosGlobalStyle />` renders the CSS.
3. Do not add the mood layers to `PX_SQUASH_TARGETS`.

**New, optional contract for game owners:** put `data-eos-avoid` on your character bubble and your finale headline. The bloom then never lands on them, even while they are still fading in. 111-114 are already covered by their class names.

## Tests
**Builds:**
- The isolated build passes: `python3 build.py --dev-dir /tmp/eos_mood --modules 00_eos_core.jsx,14_eos_mood.jsx` (1552 KB).
- The integrated scratch build passes: `dev/eos_integrate.py --dev-dir /tmp/eos_mood_int --modules 12_eos_dots.jsx,14_eos_mood.jsx,21…24` (real arcade, dots, and heroes 111-114).

**Overlap assertion** (`/tmp/eos_mood_t/overlap.mjs`; results in `/tmp/eos_mood_t/m2_*`, `m3_*`, `m4_*` and `m5_*.json`). 0 page errors in every run. Content overlap is the share of the word's box covered by game content, at 700 ms and again at 1300 ms.

| case | placement | font | content overlap | card prediction vs real | yields |
|---|---|---|---|---|---|
| 111 panic 390 | tier 0 crown, clean | 25.2 | 0 % / 0 % | y 265/h128 vs 269/121 | 0 |
| 112 anger 390 | tier 2 tight, clean | 25.2 | 0 % / 0 % | same | 0 |
| 114 sad 390 | tier 0 crown, clean | 25.2 | 0 % / 0 % | same | 0 |
| 1 POP lonely 390 (legacy) | tier 2 tight, clean | 25.2 | 0 % / 0 % | y 157/h140 vs 160/134 | 0 |
| 113 anxiety 390 (normal and reduced) | tier 3 stack, hard cover 0 | 21 | 0 % / 0 % | y 265 vs 269 | 1 ("okay": the card lands on it) |
| 111 / 112 / 113 / 114 at 1280 | tier 0 crown, clean | 42 | 0 % / 0 % | y 280/h144 vs 286/132 | 0 |
| 1 POP lonely 1280 | tier 0 crown, clean | 42 | 0 % / 0 % | y 168/h152 vs 172/144 | 0 |

**HUD contrast** (mean luminance of the HUD rects at progress 0, with the mood layers vs with them hidden):

| case | before (reviewer) | now |
|---|---|---|
| 113 at 1280 | 67 / 74 vs 38 / 45 | 38 / 40 vs 38 / 41 |
| 114 at 390 | 58 vs 35 | 39 / 38 vs 37 / 37 |
| 112 at 390 | not given | 41 / 41 vs 40 / 41 |
| POP at 1280 | not given | 43 vs 50 |

`carve` is 3 rects on hero games and 2 on legacy.

**Acceptance suite from round 0** (`/tmp/eos_mood_t/accept.mjs`, with its stagger assertion updated to 0 / .2 / .4 s):
- `accept_r11.jsonl`, run alone: **PASS** for POP anger 1280, POP panic 390 reduced and CLEANSE anger 390. It checks layer z, pointer-events, aria-hidden and blend; exact loud/calm grade colours; that the game target is still hit-testable; that the words start 2-3 rendered frames after `isComplete`; the 0/200/400 ms stagger; font ≥ 20 px; and the calm steps with no transforms.
- `accept_r10.jsonl`: POP numb 390 and HOT POTATO 390 calm passed every check except the stale 0.25 s stagger assertion in my own script, which has since been fixed. That includes 5_numb (saturate .6 → 1) and 6_calm.

**Node unit test** (`/tmp/eos_mood_t/unit2.mjs` via `loadCoreNode`): PASS.
- An empty stage gives a tier-0 crown at the Still Point.
- Hero, centred card, guide and HUD give no hard overlap, soft cover under 5 % and a font of at least 20 px, at 360 and at 1100.
- A narrow free band is found.
- A fully covered stage gives the least-cover place with font ≥ 20 px and does not throw.
- `EOS_MOOD_LIFE` ≤ 1950 ms.
- The flip words are never empty for null, unknown, panic or lonely.
- The carve URL is valid, and an empty rect list gives no mask.
- Placement on a busy stage (120 obstacles) takes 10-13 ms. It runs once per finish; the follow loop never re-places.

## Screenshots (looked at, tiled; frozen 700 ms into each word)
- `/tmp/eos_mood_t/sheet3.png`:
  - 112 at 390: "cool · clear · strong" sits on the volcano ground, clear of "Cooled to zero", the character and the card.
  - 113 at 390: "steady · here" is stacked left of the character, between the headline and the card.
  - POP at 1280: the crown sits at the Still Point with the card at the top right.
- `/tmp/eos_mood_t/sheet4.png`: 113 at 1280, "steady · here · okay" in the open lower-right band, clear of every sense label.
- `/tmp/eos_mood_t/sheet2.png`: 114 at 390, "lighter · warm · held" crowning the lantern heart, off the character.

## Known limitations
- **113 GROUND CONTROL at 390 is the one crowded case.** Its finale fills the phone stage: headline, subtitle, character, five labelled sense buttons, the centred card and the guide. The crown therefore falls back to the stacked 21 px layout. The word the arriving card covers ("okay") shows for about 0.5 s and then fades, so the game's content is never covered. A clean three-word crown would need the 113 owner to leave a free band, or tag less of the stage.
- **Hero class list is a stopgap.** The 111-114 class list is a fallback; the lasting fix is `data-eos-avoid` in those engines (owners: game-sigh, game-volcano, game-ground, game-lanterns).
- **Desktop screenshots in headless.** Headless 1280 runs at about 3 fps, so a screenshot often misses the 2 s finish window. 111, 112 and 114 at 1280 are verified by numbers only; 113 at 1280 and POP at 1280 are verified visually too.
- **Words vanish at the reveal.** The words still live only during the play stage. The bloom now always ends (1.9 s) before the shortest hold (2.05 s).
- **HOT POTATO (100) at 1280 in headless** can stall at 83 %. This was documented in round 0 and is not caused by mood.
- **JS tween, reduced third step:** the JS tween replaces the spec's CSS transition, and the reduced/calm third step is at 95 %. Both are unchanged from round 0, for the reasons given there.
