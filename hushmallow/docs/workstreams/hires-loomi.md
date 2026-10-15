# Workstream hires-loomi: hi-res Loomi

Loomi now runs on the owner-approved browless cyan drawing. It is the sixth Mallow on its high-res rig, and Pipzi is the only one left on its old drawing.

## What I built

- **Loomi switched on.** `src/mallows/hires.js` adds `'loomi'` to `HIRES_VERIFIED`, a one-line change. The art, thumbnail, face-cleaned body and table entry already existed from the W7 pipeline. They are kept exactly as drawn: the approved silhouette (1024x959, wider than the old 363x388), the colours, and a browless face at rest.
- **Brows.** The browless drawing had kept the old drawing's brow strokes as hidden brows. Those strokes were really a second set of lid arcs: U-shaped and about 20 px above the closed eyes. When an expression faded them in, they read as a ghost double eyelid. This happened on the concerned stage (the face shown after a loss), and on sad, anxious, lonely and guilty.
  - `tools/hires/build_table.py` `LOOMI_BROWS` replaces them with arched brows placed like Noomi's, still at alpha 0 at rest. `hires.js` was regenerated, and only Loomi's brow lines changed.
  - `run.sh`'s verified list is updated to match.
- **The sweeps.** The five Mallows passed these checks before me; Loomi now has them too.
  - The lab, `tools/hires/lab/check.js`, has these modes:
    - `skins`: every preset, the six presets at 0.35, and blinks.
    - `pair`: old drawing against new, including the concerned stage.
    - `overflow`: every preset, stage and reaction, with spring overshoot.
    - `jump`.
    - New: `mouths`, every mouth state plus talking frames, with the concerned frames held to the stage limits.
  - The app, new `tools/hires/lab/loomi-sweep.cjs`, sweeps the Hushfold home with Loomi talking (the subtitles), every emotion stage, and the concerned stage mid-squeeze, after release and after a tap. It also covers the MallowTouch tiers gl/tri/strip, the side-panel switcher, the Mallows scene cards and the V3 ritual card.
    - It runs at 390x844, 360x780 and 320x568, at text 1 and 1.25 (the largest), and with reduced motion.
    - `PERF=3` runs interleaved old/new frame times at 4x CPU throttling.
- **Tests (`tests/hires.test.mjs`).**
  - The verified list is pinned exactly; only `'pipzi'` is left out of the pin, for its own branch.
  - Loomi is browless at rest, its brows arch clear of the eyes, and it keeps its line and cheek colours.
  - The concerned stage never grins: computed live, and from every app run (squeeze, release and tap all stay at smile ≤ 0.22 and open ≤ 0.11).
  - The recorded sweep (`tools/hires/data/loomi-sweep.json`) carries a fingerprint of Loomi's table entry and files (`tools/hires/loomi-fingerprint.mjs`). The test fails when that goes stale; I checked by changing one number.
  - The existing containment test already runs Loomi's live geometry.

## Results

- **Rest jump** (the art against the drawn rest face, lower is better): **3.48**. The old drawing scores 6.31.
- **Overflow** (face pixels drawn outside the body, every preset, stage and reaction with overshoot): **0**.
- **Concerned stage:** smile 0.18 and mouth 0.02. Across the 9 reactions and the squeeze, the highest values are 0.20/0.104 (the reviewer's run included).
- **App runs (7):** no page errors and no horizontal scroll (home, panel, Mallows scene). The rig art is 1024 px and the cards use the 384 px thumbnail.
- **Frame times** at 4x CPU throttling, 390x844, interleaved 3+3 runs of 6 s, while Loomi changes stage:
  - old drawing: 300.8 ms mean, p95 350;
  - high-res: 313.0 ms mean, p95 367.
  - That is +4%, consistent with a body about 16% wider. This container renders GL in software (SwiftShader), so the absolute numbers say nothing about phones; check on a real device.
- **Test suite:**
  - `hires.test.mjs`: 18/18.
  - The full suite (`node --test hushmallow/tests/*.test.mjs`) was re-run on 643e33c, with nothing in the tree changing during the run: **1109/1109 pass**.
  - The commits after it change only comments, examples and docs; `hires.test.mjs` passes 18/18 on them.

## Screenshots (`docs/workstreams/hires-loomi/`, before | after)

- `app-390x844-t1.jpg` and `app-320x568-t1.25.jpg`: every state (home/talking, all ten stages, concerned squeeze, panel, Mallows scene; the tiers at 390).
- `app-360x780-t1.25.jpg`, `app-320x568-t1.25-rm.jpg`: home, concerned, squeeze, panel, Mallows scene.
- `v3-card.jpg`.
- `lab-skins-{new,old}.jpg`, `lab-pair.jpg`, `lab-mouths-{new,old}.jpg`.

Notes on the screenshots:
- The high-res drawing is visibly crisper.
- The thin darker rim at the body's edge is painted into the art; Blubi has the same.
- No seams or ghost of the erased face showed around the eyes or mouth, and there is no 2.6x crop in any tier.
- The subtitle stays readable over the wider body at 320 at the largest text size.
- The squeeze quip in the concerned shots appears only because the sweep calls `setStage('concerned')` directly, outside the app's care state. It is identical before and after.

## Independent review

An adversarial subagent reviewed the work, and nothing it found was Critical.

| # | Severity | Finding | What I did |
|---|---|---|---|
| 1 | High | `HIRES_VERIFIED` was briefly reverted (for the "before" shots) while a full-suite run started | That run was discarded and the suite re-run on the final commit (below) |
| 2 | Medium | The second Loomi test read recorded numbers only | Added the fingerprint; stale data now fails the test |
| 3 | Medium | The exact verified-list pin had been loosened to `includes` | Exact pin restored, with `pipzi` filtered out for its own branch |
| 4 | Medium | The hidden brows were U-shaped lid arcs: a ghost double eyelid on the concerned and sad faces | Arched `LOOMI_BROWS`, with the arch and clearance tested |
| 5 | Medium | Blubi and the new Loomi look alike | Owner question (below); the art is approved, so there is no code change |
| 6 | Low | Docs were stale | README updated, this file written; the HUSHFOLD.md and DECISIONS.md diffs are below for the coordinator |
| 7 | Low | The concerned talking frames in the lab ignored the stage limits | Fixed |
| 8 | Low | The sweep and the test used different mouth thresholds | One threshold in both |
| 9 | Low | `kind=old` without `hires=0` silently showed the new art | It now throws |
| 10 | Low | One frame-time sample was too thin to show anything | Interleaved `PERF=3` runs recorded |
| 11 | Low | The drawn face lines are flatter than the painted ones | Shared rig style, the same on Noomi; not in scope |
| 12 | Low | Pipzi is the last Mallow on its old drawing | Pipzi's own branch |

**Re-check verdict: ready to merge.** Nothing at Medium or above is left.
- The re-check confirmed fixes F2, F3, F4 and F7-F10.
- It measured the arched brows in the app at 390 and at 320 (text 1.25, reduced motion):
  - concerned: browAlpha 0.42, smile 0.18, mouth 0.02;
  - sad, anxious and angry: proper sloped brows, well inside the body.
- It re-ran overflow for all seven Mallows: 0.

Its remaining Lows:
- **Fixed:** the doc path (now `hushmallow/docs/...`), and the documented examples that now need `&hires=0` (pair, jump with kind=old).
- **Left as they are:**
  - Recording the sweep is a manual step: the JSON is put together by hand, and the fingerprint does not hash `expressions.js`, `reactions.js` or `rig.js`.
  - The concerned mouth peaks at 0.104 against the 0.11 threshold. It is held by the rig's 0.1 limit, so the margin is spring overshoot only.
  - The brows on the concerned stage look faint and slightly grey, the same treatment as Noomi's.

## For the coordinator

1. **Merging with Pipzi's branch.** Both branches edit `HIRES_VERIFIED` in `hires.js`, `run.sh`'s `VERIFIED` default and the registry test in `hires.test.mjs`. The merged values should be:
   - the list: `["glitzi", "zuzu", "boppo", "pipzi", "blubi", "noomi", "loomi"]`;
   - the test pin: it filters `pipzi` out, so it passes either way. Once Pipzi lands, it can become a plain `deepEqual` of all seven.
2. **If Pipzi's branch regenerates `hires.js` with `build_table.py`,** it now carries `LOOMI_BROWS`, so Loomi's brows survive the rebuild. After any rebuild, run `node hushmallow/tools/hires/loomi-fingerprint.mjs`. If the fingerprint changed, Loomi's entry changed: re-run the sweep, or check that the change is intended and re-record the JSON.
3. **Docs I may not edit.**
   - `docs/integration/DECISIONS.md:37` (A-1): becomes "Switch the six verified Mallows (glitzi, zuzu, boppo, blubi, noomi, loomi); pipzi stays on the old art; `?hires=0` turns it off". Also record A-2 as answered: the browless cyan drawing is Loomi.
   - `docs/HUSHFOLD.md` D13 (:25) and W7 (:126): the same change; drop "is the browless cyan drawing Loomi" from the open questions.
4. **Owner question A-3** (still open): the new Loomi and Blubi are both cyan, closed-eyed and smiling. Mean hue is 0.551 for Loomi and 0.562 for Blubi, and the aspect ratios are 1.07 and 1.03. They sit side by side in the Mallows scene (`app-390x844-t1.jpg`, panel "mallows"). The old Loomi stood apart with its double arcs and taller shape. Ask the owner whether they read as distinct.
5. **Nothing else is needed:** no server, build or workflow changes. The assets already ship via `build-site.sh`.
