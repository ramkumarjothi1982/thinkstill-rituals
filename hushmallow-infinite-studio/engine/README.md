# engine/

The Phase 2 render engine: a fork of the approved `stage2/` (frozen), started in
WP-01. At the defaults (1080×1920 design space, render scale 1, no mark) it
renders the approved v2 bit-identically to the WP-00 goldens.

| File | What it is |
|---|---|
| `index.html`, `main.js` | the page: canvas sized from the query string (`w`, `h`, `scale`), `window.__engine` for the render worker, `window.__stage` (the stage2 surface the golden probes use) |
| `stage.js` | the frame model (sub-frame shutter sampling), binary readback, dry run, prime, dispose; `loadImage`/`silhouette` for the frozen direction |
| `renderer.js` | WebGL passes; design size and render scale as parameters, content-hashed text textures, dispose, asset log, corner mark |
| `gl.js` | WebGL2 toolkit (adds `gridMesh().dispose()`) |
| `face.js`, `softbody.js`, `motion.js` | byte-identical copies of stage2 |
| `type.js` | stage2's text and logo card, plus logo magnification logging |
| `directions.js` | direction registry (constant `import()` thunks) and runtime selection by `meta.runtime` |
| `runtime/clock.js` | the v1 virtual clock, inlined without its unused real-timer captures (R19) |
| `runtime/adapter-v2.js` | runtime `v2`: the frozen direction module on engine code |
| `runtime/asset-log.js` | rasters used and their maximum magnification |
| `runtime/marks.js` | DRAFT / INTERNAL corner mark, drawn after post |
| `runtime/hash.js` | content keys for the texture cache |
| `dev/` | stage2's face and rest-test pages, and `fixtures/`: tiny directions for the farm's tests |

How the frozen `videos/my-brain-at-2am-v2.js` runs here: it imports
`../stage2/*.js`, and the import map in `index.html` redirects those URLs to
this directory's copies. No frozen file is edited.

Rules: no wall clock and no unseeded randomness (`tests/guard/no-wallclock.test.mjs`
scans this directory and everything it imports); load modules through constant
specifiers only. Any change that alters pixels at the defaults must be gated
against `qa/golden/v2` (`hm test golden`).
