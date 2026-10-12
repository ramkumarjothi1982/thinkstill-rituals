# High-res Mallow re-rig (W7)

The owner's 1254 px art (`assets/source/hires/<id>.webp`) re-rigged for the
existing Mallow rig. Everything here re-runs from a fresh checkout:
`tools/hires/run.sh` (Python 3 with numpy, scipy, opencv-python-headless,
Pillow; Node 18+; for step 4, Playwright with Chromium and a local server).

| Step | Tool | Reads | Writes |
|---|---|---|---|
| 1 | `prepare.py` | `assets/source/hires` | `assets/mallows-hires/<id>.webp` (1024 px cut-out), `$WORK/<id>.png` |
| 2 | `measure.py` | `$WORK/<id>.png`, `data/old-registry.json` | `$WORK/measure-<id>.json` (copied to `data/`), `masks_<id>.npz`, overlay PNGs |
| 3 | `derive.py` | `$WORK` | `assets/rig-hires/` (face-cleaned bodies, irises, spirals), `$WORK/erase_<id>.png`, `derive-report.json` |
| 4a | `build_table.py --no-fit` | `data/`, `assets/rig-hires` | `data/hires-nofit.js` (the fit's starting point) |
| 4b | `lab/run.cjs fit` (`lab/fit.html`) | the no-fit table, the real rig | `data/fit-<id>.json` |
| 4c | `build_table.py` | `data/` (measure + fit), `assets/rig-hires` | `src/mallows/hires.js`, `data/silhouette.json`, `data/checks.json` |
| 5 | `lab/run.cjs` (`lab/check.html`) | the table, the real rig | screenshots and numbers (below) |

`data/old-registry.json` is the registry *before* any high-res switch (the
fixed input of step 2; do not regenerate it after `applyHires` is wired in).
Hand decisions live in code with their reasons: `measure.py` NEUTRAL and
MOUTH_LANDMARKS (painted open-mouth points), `build_table.py` TWEAKS (Glitzi's
lid line, and its open-mouth depth / upper lip so an excited mouth stays inside
the body).

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
* `lab/rig-loader.js` gives the labs the rig *with* res support: the real
  `src/mallows/rig.js` once `rig-res.patch` is merged, a copy patched in the
  browser until then.

Examples: `node tools/hires/lab/run.cjs json 'mode=overflow&kind=new'`,
`node tools/hires/lab/run.cjs shot 'mode=pair&id=glitzi&presets=rest,excited' /tmp/p.png`.

## Notes

* Geometry in `hires.js` is in the rig's logical space (art px / res), so
  rig constants keep their meaning. The rig needs `rig-res.patch` (additive:
  art and body drawn at `m.size`, spiral sprites at native px / res, per-rig
  `glitchRows`, skin q up to 1.25 × res).
* Zuzu's spirals are ~300 px (302 / 310), not the ~360 px of the brief: the
  cut-out is capped at 1024 px on its long side (prepare.py), and at that
  scale the painted discs are 300-310 px across. The rounding in derive.py
  keeps the interior 1:1 and reshapes only the outer band so the dark rim sits
  on one radius (the painted discs are ~7% oval).
* `tests/hires.test.mjs` checks the table: keys, sizes, a pure-geometry
  containment check (every preset, stage and reaction at full intensity with
  spring overshoot stays >= 6 px inside the silhouette), the spiral checks,
  sampled mouth colours, and no structuredClone.
