# EOS build: mood. FINISHED

## What I built
The module is `src/eos/14_eos_mood.jsx`. It covers spec §5.6, §0.2 (grade and flip) and §11.9. Every game now moves visibly from the negative feeling to the positive one, and no engine was touched.

### (a) Colour script
`EosMoodGrade` renders three sibling layers inside `.releaseStage`. All three are `position:absolute; inset:0; z-index:54` (`EOS_Z.mood`), `pointer-events:none!important` and `aria-hidden="true"`.

- **`div.eosMoodGrade`** is the spec layer.
  - It is a `mix-blend-mode:soft-light` two-stop gradient (158°) that goes from the feeling's `grade.loud` pair to its `grade.calm` pair as the game's progress bar rises.
  - It reads progress through core's `useEosProgress` (4 Hz) and sets `--eos-p`.
  - Opacity goes from .22 to .08.
  - Colours are mixed in OKLCH, so there is no muddy grey midpoint.
  - The hue path avoids the yellow-green band, which matches the owner decision for the Still Point.
  - The emotion comes from `eosCurrentEmotion()`. When there is none it uses STILL's grade.
- **`div.eosMoodAir`** is an extra `screen` layer that makes the colour script readable on the arcade's dark scenes.
  - The loud colour presses in from the edges, and this grip loosens as you play.
  - Each feeling has its own light shape: panic gets dawn rising from the horizon, anger gets heat from below and cool light from above, and sad gets a warm window.
- **Numb** also gets `backdrop-filter` (and `-webkit-backdrop-filter`) `saturate(.6 → 1)`, so the game itself goes from grey to full colour.
- **Late night** (23:00–05:00 local, via `eosLateNight`): the calm pair is warmed by 10° of hue toward amber.
- **Gliding between values:** each progress change glides there over .6 s with a per-frame tween in OKLCH. I used a JS tween instead of a CSS transition because a CSS transition only advances on rendered frames and can stall on the loud colours when the main thread is starved. The finish always lands on the calm pair (`data-eos-done="1"`), even if a game completes below 95 % on its bar.
- **Reduced motion / calm visuals** (`eosCalm(reduced)`): three steps at 33 / 66 / 95 % with .9 s cross-fades only, and no transforms anywhere. I used 95 instead of the spec's 100 so the calm pair is on screen before the finish in every mode, which is what acceptance check (2) asks for.

### (b) Flip bloom
**Trigger:** the first `.globalPlayGuide.isComplete` or `.tsRewardSurge.mega`. Detection uses a class `MutationObserver` on the guide plus a 100 ms poll.

**Words and look:**
- The feeling's three core `flip` words bloom out of the Still Point: the measured `.eosThoughtFlow .eosCore` centre, or the stage centre when that isn't mounted.
- Font is Baloo 2 900, cream (#fff2cf) with a warm-brown hairline, a calm-colour glow and a soft dusk cloud behind each word for contrast.
- Size is clamp(22px, 4.4cqi, 42px) on desktop (measured 42 px at 1280) and clamp(22px, 7cqi, 30px) on phone (measured 25.2 px at 390).

**Motion:**
- The words are staggered 250 ms apart, pop in with squash and stretch, float up 60 px and fade over 1.8 s.
- Four tiny sparks burst from each word, with a soft rising chime gated by the arcade's sound toggle.
- In reduced or calm mode the words fade in place, with no translate or scale, and there are no sparks.
- The words are pre-rendered (hidden), so the bloom starts in the same frame that paints `isComplete`.

**Placement (crown):** left word low, centre word high, right word low. The crown is placed to avoid:
- the finish card (its position is predicted from the last press, then tracked every 100 ms with a .5 s glide while the words live)
- the LIVE GUIDE, the HUD and the companion

It always stays inside the stage.

**Hygiene:**
- No store writes, and no user text anywhere.
- The flip root carries `EOS_PRIVATE_ATTRS` and `fs-mask`.
- Every timer, observer, listener and rAF is cleaned up.
- No `import`/`export` lines, every identifier is `eosMood…` / `EOS_MOOD_…`, and nothing touches PX_B / pxNoise / PIXAR_CSS.

### Release-1 scope
The module does not depend on `flipdata` or on games 115–120. It reads only the progress bar and `isComplete`, so it works for every registered game id, including 111–114 and any later ones. The flip words come from core `EOS_EMO[id].flip`. When the emotion is unknown or none, it uses STILL's flip (`lighter / clearer / here`), and a word list is never empty.

## Exports
- **`EosMoodGrade({ game, hostRef, reduced })`** is the component.
- **`EOS_MOOD_CSS`** is the stylesheet string, registered at module top level with `eosCss("mood", EOS_MOOD_CSS)`.
- **`eosExpose("mood", {...})`** publishes read-only helpers for tests: `state()` (the live dev mirror), `palette(emo)`, `colours(emo, t)`, `t(p, calm)`, `step(p)`, `flipWords(emo)`, `mix(a, b, t)` and `warm(hex)`. No other module needs to call them.

## What the integrator must wire (exact)
1. **I1-E3**, which already exists in `dev/eos_integrate.py`. Mount the component inside the keyed play fragment in `.releaseStage`, for both wrappers and every game:
   ```jsx
   {stage === "play" && selected ? (
       <React.Fragment key={`eos-play-${selected.id}-${variationSeed}-${materialRevision}`}>
           <EosMoodGrade game={selected} hostRef={gameHostRef} reduced={!!reduced} />
           …
       </React.Fragment>
   ) : null}
   ```
   The fragment key matters: it remounts the component on replay or a new game, so each game gets a fresh script and one bloom.
2. **I1-E1** (`<EosGlobalStyle />`) renders `EOS_MOOD_CSS`. Nothing else is needed.
3. Do **not** add the mood layers to `PX_SQUASH_TARGETS`. No other edits are needed in `00_arcade.jsx` or `99_pixar.jsx`.

## Tests
These ran in the scratch integrated build (`python3 dev/eos_integrate.py --dev-dir /tmp/eos_mood_int --modules 14_eos_mood.jsx`), which mounts the component through I1-E3 in the real arcade. The isolated build `build.py --dev-dir /tmp/eos_mood --modules 00_eos_core.jsx,14_eos_mood.jsx` passes, and so does a build that adds the readability and dots modules (`/tmp/eos_mood_int2`).

**Acceptance** (script `/tmp/eos_mood_t/accept.mjs`, one case per process; results in `/tmp/eos_mood_t/accept_run8.jsonl` and `accept_run9.jsonl`):

**22 of 22 cases pass, with 0 page errors.** The cases were:
- POP, HOT POTATO and CLEANSE, each with anger and with panic, at 1280×860 and at 390×844 (12 cases)
- numb: POP at both sizes, and HOT POTATO at 390 (3 cases)
- reduced motion: POP anger 1280, POP panic 390, HOT POTATO panic 390, CLEANSE anger 390 (4 cases)
- calm-visuals toggle: POP panic 1280, HOT POTATO anger 390 (2 cases)
- a POP anger 1280 rerun (1 case)

The 100/panic/1280 case did not finish in run 8 because of the headless HOT POTATO problem described under limitations; its rerun in run 9 passed.

What each check measured:
- **(1)** All three layers have z-index 54, `pointer-events:none`, `aria-hidden="true"` and `position:absolute`; the grade layer is soft-light; the words are hidden before the bloom.
- **(2)** The computed background holds exactly `rgba(<loud>, .22)` at progress 0 and exactly `rgba(<calm>, .08)` at progress ≥ 95. It settled 0.6–1.3 s after the bar reached ≥ 95 in headless.
- **(3)** `elementFromPoint` at the first game target still returns the target, and no mood layer is in `elementsFromPoint`.
- **(4)** The three flip words are in the DOM 0 ms after `isComplete`, and their animations start in the first frame rendered after it. The stagger is 0 / 250 / 500 ms, so the third word starts at 500 ms, inside the 600 ms limit. Every word is 42 px at 1280 and 25.2 px at 390, and the words match core `flip`.
- **(5)** For numb, saturate starts at 0.6 at progress 0, rises monotonically with progress and reaches ≥ 0.95.
- **(6)** Reduced and calm modes step through 0 → 1 → 2 → 3 only, with transform, translate and scale all `none` on the layers and the words, and the words use `eosMoodFade`.

**Unit tests** (node, `/tmp/eos_mood_t/unit.mjs` via `loadCoreNode`) pass for every emotion plus none and an unknown id:
- t=0 gives the loud pair and t=1 gives the calm pair
- the alpha ramp is .22 → .08
- no mix midpoint lands in the yellow-green band (`sickMid: 0`)

**Performance:** HOT POTATO at 1280 measured 3.2 fps with the mood layers and 3.3 fps without (headless software raster), so there is no measurable cost.

## Screenshots (looked at, tiled)
All in `/home/user/thinkstill-rituals/framer/dev/shots/eos/`:

**Colour script, before and after:**
- `mood_anger_p0_1280.png` and `mood_anger_p100_1280.png` (red-orange to teal)
- `mood_panic_p0_390.png` and `mood_panic_p100_390.png` (storm violet to dawn gold)
- `mood_numb_p0_390.png` and `mood_numb_p100_390.png` (grey to colour)
- `mood_script_grid_1280.png` and `mood_script_grid_390.png` (all emotions at p0 / 50 / 100)

**Flip bloom:**
- `mood_flip_panic_1280.png`
- `mood_flip_seq_1280.png` and `mood_flip_seq_390.png` (bloom sequences)
- `mood_flip_reduced_390.png` (fade in place)
- `mood_flip_calm_1280.png`
- `mood_flip_longwords_390.png` (lonely / overwhelm / jealous two-word flips fit at 390)
- `mood_finish_real_panic_390.png` (a real finish: words rising from the Still Point above the LIVE GUIDE)

## Known limitations
- **HOT POTATO (100) at 1280×860 in headless:** about half of the runs in builds that contain the mood module stop at 83 %, because the bottom-left potato's toss never registers. The driver retries for 4 minutes, and a manual sideways toss doesn't help either. The control build without mood finished 5 of 5 runs, but I don't think mood causes it, because the stall also happened:
  - with all mood layers set to `display:none`
  - with the mood pointer listeners and the rAF tween both removed (1 of 3 runs)

  The remaining mood code only reads (progress poll, finish poll, render). The game reacts to a drag only in `onDragEnd`, with a stale-closure `doneSet`. This is for Regression / `fixes` to probe:
  - Probes: `/tmp/eos_mood_t/hpstuck.mjs` and `/tmp/eos_mood_t/ctl.mjs`.
  - Bisect build: `/tmp/eos_mood_v1`.
  - The 390×844 runs always finished.
- **JS tween instead of a CSS transition:** the spec says `transition: background .6s`. I used a .6 s per-frame JS glide, for the reason given under (a); the visible behaviour is the same.
- **Reduced/calm third step at 95 %, not 100 %:** so the calm pair shows before the finish, as acceptance check (2) requires. The finish always forces the calm pair.
- **Bloom origin without the dots module:** when the dots module (`.eosCore`) is not mounted, the words bloom from the stage centre. In isolated builds `data-eos-from` is `"stage"`; with dots it is `"core"`.
- **Words vanish at the reveal:** the words live only during the play stage. The arcade holds the finish about 3 s before the reveal, so the 2.3 s bloom completes; if a future edit shortens that hold, the words would be cut when the play fragment unmounts.
