# High-res Mallow re-rig (W7)

The owner's 1254 px art (`assets/source/hires/<id>.webp`) re-rigged for the
existing Mallow rig. Everything here re-runs from a fresh checkout:
`tools/hires/run.sh` (Python 3 with numpy, scipy, opencv-python-headless,
Pillow; Node 18+; for step 4, Playwright with Chromium and a local server).

| Step | Tool | Reads | Writes |
|---|---|---|---|
| 1 | `prepare.py` | `assets/source/hires` | `assets/mallows-hires/<id>.webp` (1024 px cut-out, the rig's `art`), `<id>-thumb.webp` (384 px, every other picture: `file`), `$WORK/<id>.png` |
| 2 | `measure.py` | `$WORK/<id>.png`, `data/old-registry.json` | `$WORK/measure-<id>.json` (copied to `data/`), `masks_<id>.npz`, overlay PNGs |
| 3 | `derive.py` | `$WORK` | `assets/rig-hires/` (face-cleaned bodies, irises, spirals), `$WORK/erase_<id>.png`, `derive-report.json` (incl. Boppo's re-fitted iris circles) |
| 4a | `build_table.py --no-fit` | `data/`, `assets/rig-hires` | `data/hires-nofit.js` (the fit's starting point) |
| 4b | `lab/run.cjs fit` (`lab/fit.html`) | the no-fit table, the real rig | `data/fit-<id>.json` |
| 4c | `build_table.py` | `data/` (measure + fit), `assets/rig-hires` | `src/mallows/hires.js`, `data/silhouette.json`, `data/checks.json` |
| 5 | `lab/run.cjs` (`lab/check.html`) | the table, the real rig | screenshots and numbers (below) |

`data/old-registry.json` is the registry *before* any high-res switch (the
fixed input of step 2; do not regenerate it after `applyHires` is wired in).
Hand decisions live in code with their reasons: `measure.py` NEUTRAL and
MOUTH_LANDMARKS (painted open-mouth points), `build_table.py` TWEAKS (Glitzi's
lid line, its open-mouth depth / upper lip so an excited mouth stays inside
the body, its crease relief) and PRESET_OVERRIDES (Glitzi's lids and round
mouths per preset).

## The res support (W2 merges it): `rig-res.patch`

One unified diff, `git apply hushmallow/tools/hires/rig-res.patch` from the
repo root. Additive: with the current art nothing changes. It touches
`rig.js` (art/body drawn at `m.size`, spiral sprites / res in the draw and
the dirty rect, `m.glitchRows`, skin q up to 1.25 x res, the crease mouth's
`relief`), `touch/mallow-touch.js` (`_atSkin` draws the approved art and
Glitzi's bare body at `m.size`: tier A cross-fades them in at rest),
`registry.js` (the rig loads `m.art || m.file`) and `expressions.js`
(`resolveExpression` merges `m.presetOverrides`).

* `res-patch.mjs` reads and applies it without git (offset- and
  fuzz-tolerant; a hunk already in the file counts as merged).
* `node hushmallow/tools/hires/refresh-patch.mjs` rewrites it against today's
  files (exact line numbers and context); `--check` only reports.
* `tests/hires.test.mjs` fails when a hunk fits nowhere, and runs a static
  guard on the patched code: no 3-argument `drawImage` anywhere in
  `src/mallows/**` (a natural-size draw of 1024 px art in a ~390 unit rig is
  a 2.6x crop), no sprite width used as rig units without `/ res`, the
  per-rig glitch rows, `m.art`, `presetOverrides`.
* The labs apply the same patch file in the browser (`lab/rig-loader.js`);
  once every hunk is merged they import the real modules, and the blob path
  in `rig-loader.js` can be deleted.

## Labs (dev only, never shipped: `tools/` is not in `build-site.sh`)

Serve the repo root (`python3 -m http.server 8000`), then:

* `lab/fit.html?mallow=<id>&table=../data/hires-nofit.js` — the render-fit
  pass: coordinate descent on each feature so the drawn neutral face matches
  the approved art on the real rig renderer. Spiral centres are pinned (they
  are the rotation centre).
* `lab/check.html?mode=…` — `skins` (rest approved / drawn / |diff|, every
  preset, blinks, and the rest-jump metric), `pair` (current rig vs high-res
  rig), `spin` (Zuzu's eyes at several spin angles), `overflow` (drawn face
  pixels outside the body alpha for every preset, stage and reaction, with
  spring overshoot), `jump` (rest-jump metric, all seven), `live` (ticking
  rigs at several sizes; `run.cjs page`).
* Rest jump (`mode=jump`): mean |luminance| difference (0-255) in the face
  rect between the approved art and the drawn rest face on one frozen frame
  (t 1.234, no blink, reduced motion, skin 600), Zuzu's spirals at the
  painted phase (spinAngle 0; `zuzuSpin07` adds phase 0.7). 12 Oct, r2:
  `node tools/hires/lab/run.cjs json 'mode=jump&kind=new'` (and `kind=old`):

  | | glitzi | zuzu (0.7) | boppo | pipzi | blubi | loomi | noomi |
  |---|---|---|---|---|---|---|---|
  | high-res | 5.84 | 5.80 (11.83) | 7.53 | 7.47 | 5.04 | 3.59 | 3.45 |
  | current | 15.73 | 6.90 (12.41) | 8.72 | 8.97 | 6.07 | 6.31 | 4.33 |

  A spinning Zuzu jumps by its phase, not its rig: W2, snap `spinAngle` to 0
  (the painted phase) while the face is at rest.
* `lab/rig-loader.js` gives the labs the rig *with* res support: the real
  `src/mallows/rig.js` once `rig-res.patch` is merged, a copy patched in the
  browser until then.

Examples: `node tools/hires/lab/run.cjs json 'mode=overflow&kind=new'`,
`node tools/hires/lab/run.cjs shot 'mode=pair&id=glitzi&presets=rest,excited' /tmp/p.png`.

## Notes

* Pictures: `file` is the 384 px thumbnail (switcher, mallows scene, studio
  tiles, ritual cards keep reading `m.file`: ~4 MB decoded for seven instead
  of ~28 MB at 1024 px); `art` is the 1024 px cut-out the rig loads.
  `src/ultra/another-angle.js` hard-codes `assets/mallows/<id>.png` for its
  cameos: it should read `MALLOWS[id].file` (W8/W1), or an old Zuzu sits
  next to the new hero.
* Geometry in `hires.js` is in the rig's logical space (art px / res), so
  rig constants keep their meaning (see "The res support" above).
* Boppo's iris: measure.py's circle (fitted with the glow) ran ~14 px into a
  pale crescent of sclera at the top; derive.py's `iris_circle` re-fits the
  painted iris outline (the edge where the sclera starts, per 2 degrees,
  least squares without outliers) and cuts 2 px inside it; build_table.py
  places the sprite from that circle. Every iris sprite is also masked to
  rc = w/2 - 2 (the radius the rig draws at irisR); `checks.json` `irises`
  counts pale pixels past rc and per rim sector, and the test asserts them.
* Zuzu's spirals are ~300 px (302 / 310), not the ~360 px of the brief: the
  cut-out is capped at 1024 px on its long side (prepare.py), and at that
  scale the painted discs are 300-310 px across. The rounding in derive.py
  keeps the interior 1:1 and reshapes only the outer band so the dark rim sits
  on one radius (the painted discs are ~7% oval).
* `tests/hires.test.mjs` checks the table: keys, sizes, a pure-geometry
  containment check (every preset, stage and reaction at full intensity with
  spring overshoot stays >= 6 px inside the silhouette; it uses the patched
  `resolveExpression`, so Glitzi's `presetOverrides` are in it), the spiral
  and iris checks, sampled mouth colours, no structuredClone, and the res
  contract (above).
