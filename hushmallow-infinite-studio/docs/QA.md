# QA: every gate, threshold and fixture

QA suite v1 and review gallery v1 were built in WP-05. This page explains:

- what each gate checks and how it measures it;
- which thresholds were calibrated on the approved v2, and so are provisional;
- the fault fixtures that prove each gate fires;
- the review gallery and its `decisions.json`;
- the log of threshold changes.

All thresholds are kept in one file, `qa/gates/thresholds.json`. Every QA report records that file's sha256.

## 1. Running it

```sh
node cli/hm.mjs qa v2                         # the approved v2: every gate must pass
node cli/hm.mjs qa runs/<batch>/<id>          # a variant or farm job directory -> <dir>/qa/report.json
node cli/hm.mjs qa runs/<batch>               # every variant of a batch
node cli/hm.mjs qa <dir> --stage draft        # draft frames: G-SPEC, G-DIR, G-COST, G-DRAFT, brand mark
node cli/hm.mjs qa fixtures [--build]         # v2 passes; each fault fixture fails exactly its own gate
node cli/hm.mjs qa gallery runs/<batch>       # runs/<batch>/gallery/index.html (opens offline)
```

**Targets** (resolved by `qa/gates/context.mjs`):

| Target | What QA reads |
|---|---|
| `v2` | `qa/fixtures/v2/target.json`: the approved master, its production twin spec, the golden direction, the v2 cue log, the render evidence |
| `<variant or farm job dir>` | `final.mp4`, plus whichever of these exist: `spec.json`, `direction.json`, `cues.json`, `provenance.json`, `job.json`, `score-plan.json`. A legacy direction (`my-brain-at-2am-v2`) maps to the golden direction. |
| `<batch dir>` | every sub-directory that holds a `final.mp4` |
| `<manifest>.json` | an `hm-qa-target/1` manifest: explicit paths, used by the fixtures |
| `<video>.mp4` | only the gates that need nothing but the video |

**Options:**

- `--no-render` skips the determinism re-render. G-FINAL:determinism is then reported as not run.
- `--ledger <dir|empty>` chooses the ledger for G-SPEC and G-DUPES.
- `--corpus <jsonl>` adds G-DUPES signatures.
- `--at <iso>` sets the reference time.
- `--json` prints the report.

**Exit codes:** 0 when every gate passed, 1 when a gate failed, 3 when a gate did not run, 2 for a usage error.

**Heavy lock.** QA holds a shared slot of the heavy-job lock for each target. The determinism re-render, the fixture builds and the gallery encodes also take the lock. Timing runs take it `--exclusive`.

**Pipeline** (`qa/run-qa.mjs`):

1. **Plan and compile gates:** G-SPEC, G-DIR and G-COST run on what was rendered.
2. **Direction geometry:** `qa/gates/geometry.mjs` works out, for every frame, the Mallow's contour, its skin and face sample points, the face box, text boxes, glass cards, the rest envelope and the mood. It uses `composer/scene.js` and the same soft-body mesh the renderer builds.
3. **Brand probes:** `qa/gates/probes.mjs` renders the engine's own `LogoCard` and `Marks` in Chromium. The result is cached in `WORK/qa-cache`.
4. **Three jobs in parallel:**
   - one ffmpeg decode of the video feeds every pixel gate (`qa/gates/pixels.py`);
   - the audio gate (`qa/gates/audio.py`);
   - the determinism re-render (`qa/gates/determinism.mjs`).
5. **Combining gates:** delivery, fidelity (with the magnification log), brand marks, allowlist, G-AUDIO (with recipes) and G-DUPES.
6. **The report.**

## 2. The report: `qa/report.json` (`hm-qa/1`)

```
{ schema, target, stage, at, video: { file, sha256, bytes }, spec: { id, fingerprint, ... }, direction,
  status: pass | fail | incomplete, pass: true | false | null, failed: [...], pending: [...], warnings: [...],
  gates: { <gate>: { pass, warn, status, failed, notRun, warned, checks: { <check>: { status, value, limit, detail } },
                     metrics, artefacts, errors? } },
  signature: { anchors: [{ label, frame, phash }], colour, audio },     # for G-DUPES / WP-25
  review: { artefacts }, timings, thresholds: { file, sha256 }, tools, render, reportFile }
```

**Gate verdicts** (`qa/gates/verdict.mjs`):

- A gate **fails** when any of its checks fails.
- A gate **did not run** (`pass: null`) when a required check did not run and none failed.
- Otherwise the gate **passes**. Warnings never fail a gate.
- A `reportOnly` check (for example WCAG, or G-COST's actual-versus-predicted time) is shown but never decides the gate.

**Report verdict:** `pass: true` only when every gate ran and passed. This is the shape `compile.json` uses. The report meets the QA contract of `docs/SPEC.md` that `hm export` enforces (`planner/export.mjs qaProblems`): it names the video's sha256 and the spec's fingerprint, lists 18 gates (draft stage: 7), and carries the required `G-FINAL:*` and `G-AUDIO` gates.

**Where reports go:**

- a variant or job directory: `<dir>/qa/` (`report.json`, `artefacts/`, `work/`);
- a manifest: `WORK/qa/<label>/`, unless the manifest names its own `out`.

## 3. The gates

**Columns in the threshold tables:**

- **plan:** PHASE2-PLAN's value.
- **v2:** what the approved v2 measures.
- **limit:** what QA fails on.
- **warn:** the warn band.

A threshold marked **provisional** was calibrated on v2 alone. WP-27 refits these on at least 12 approved videos plus the fixtures.

### G-SPEC (`qa/gates/spec-gates.mjs`)

`planner/gspec.mjs checkSpec()` runs on `spec.json` against the ledger and capabilities in force. Each error rule becomes a failing check named by that rule (for example `lint:breath-hold`).

- **Fixture manifests** use an empty ledger.
- **The afternoon-template fixture** uses the open capability set, so that only its copy fault is wrong.
- **The approved v2** is judged as its production twin, `qa/fixtures/v2/spec.production.json`. The twin has the same visible slots and seed as `specs/golden/t01-v2.json`, so the same fingerprint and id, with `mode: production`, `internal: false`, `channel: tiktok` and `plannedFor: 2026-10-13`. The golden spec itself is a review (INTERNAL) spec, because it is the composer's parity spec.

### G-DIR (`qa/gates/spec-gates.mjs`)

`composer/validate.js gdir()` runs on the compiled direction. If there is none, QA composes the spec in Node. QA adds the four rules WP-03 left open:

| Check | Rule | v2 |
|---|---|---|
| `spin` | at most 1 turn/s, or at most 0.3 when the camera zoom is 1.10 or more | 0.310 turns/s |
| `spinRamp` | 10 to 90 % of the peak spin over at least 0.5 s | 1.142 s |
| `pulseRamp` | half period of every `pulse` channel at least 150 ms | 1.875 s |
| `faceInSilhouette` | The face is drawn in art space on the body mesh, so it is inside the silhouette by construction. The check reports not run once face transform channels exist (WP-10 must add the geometric check). | pass |
| `absoluteLayers` | No absolute-time audio layers. It warns for the frozen `soundtrack-v2` (R10/R11) and passes for WP-04's score. | warn |

G-DIR and G-COST never run on a spec that G-SPEC refused. This is the same rule `planner/compile.mjs` applies.

### G-COST (`qa/gates/spec-gates.mjs`)

`composer/cost.js gcost()` runs as before. When `provenance.json` has segment timings, the report-only check `actualVsPredicted` warns above +30 %. The WP-02 final render measured +11 % (527 s actual against 476 s predicted).

### G-DRAFT:safezone (`qa/gates/safezone.py`)

**Forbidden zones**, in design px:

- the right rail, x > 900 and y 700–1500;
- below y = 1500;
- the side margins, x < 60 (y 180–1500) and x > 1020 (y 180–700);
- the top band, y < 180, except the corner mark's own box.

**Detection** (`qalib/text.py`). Every 3rd frame is scanned at about 0.5 px per design px:

1. Top-hat (light glyphs) and black-hat (dark glyphs) filters with a 25 px elliptical kernel isolate strokes.
2. Glyph-sized connected components are kept: 10–110 px tall, with a fill of 0.08–0.95.
3. Components that share a centre line are grouped into lines; a line needs at least 3 glyphs.

**What counts:**

- A line *intrudes* when at least 50 % of its box is inside a zone. A line that only grazes a zone is a *touch*, which warns.
- Readable text holds still. An intrusion *persists* when the next scan finds the same grayscale patch within 16 px (normalised cross-correlation of 0.7 or more).
- Periodic structures are not text. A line whose patch lines up with itself one period on is ignored: horizontal autocorrelation of 0.6 or more at a shift of 0.4 of its height or more. Measured text lines score 0.25–0.54 and stripe fragments 0.62–0.89. So is a line inside a tile that the flash gate's stripe detector finds striped.

**Verdict:** the gate fails when an intrusion persists over 2 scans in a row.

**Calibration:** v2 has 0 intrusions and 13 touches. The touches are v2's second thought card grazing the top of the rail, which is G-DIR's `text:glass-rail` warning too. All values are provisional.

### G-DRAFT:readability (`qa/gates/readability.py`)

For every text item at the frames where it is readable (alpha 0.9 or more, from the geometry), QA crops its box and finds the glyphs by top-hat (light text) or black-hat (dark ink). The glyph fill is the median relative luminance of the glyph pixels, eroded by 1 px. The background is a ring 4–12 px outside the glyphs. The contrast is the WCAG ratio of the fill against the ring's p90 for light text, or its p10 for dark text.

**Deviation from the plan:** the plan says the p10 of the ring. For light text the conservative end of the ring is its bright end, so light text uses p90. Each item's contrast is the median over its readable frames.

| | limit | warn | plan | v2 |
|---|---|---|---|---|
| overlay text (hook, end card) | 4.5:1 | – | 4.5:1 | 9.46:1 (lowest row) |
| glass-card text | 1.8:1, provisional | 4.5:1 | 4.5:1 | 2.19:1 |

v2's thought cards render their ink lighter than `#1b1d57` (measured fill luminance 0.105) on frosted glass. That is the approved look, so glass text has a calibrated limit and sits in the warn band. This needs an owner decision: see open issues in `docs/wp/WP-05.md`.

### G-DRAFT:layout (`qa/gates/layout.mjs`)

This gate uses the geometry only, every 3rd frame, at quarter resolution:

- the silhouette contour stays at least 24 px from every frame edge (v2: 127.6 px);
- glass cards with alpha 0.5 or more cover at most a set share of the Mallow and of the face box;
- declared wraps (none exist yet) keep the face at least 95 % visible.

| | limit | warn | plan | v2 |
|---|---|---|---|---|
| cards over the Mallow | 25 %, provisional | 15 % | 15 % | 21.8 % (frame 270, the dissolving card over the head) |
| cards over the face box | 8 %, provisional | 5 % | 5 % | 5.7 % |

### G-FINAL:delivery (`qa/gates/delivery.mjs`)

This is the generalised fork of the frozen `render/verify.mjs`:

- H.264 High, yuv420p, BT.709 tags, 1080x1920, 30/1 fps;
- exactly 30 × D frames;
- container duration within ±0.03 s;
- faststart, read from the top-level atom order;
- zero decode errors, counted by the pixel pass's own decode, so the video is decoded once;
- AAC 48 kHz stereo, with audio length equal to video length within ±0.025 s.

**Provenance** replaces verify.mjs's mtime check:

- **A farm stamp** (`... @ <sha12> job <key12>`) must name the job whose `provenance.json` describes exactly this file (`final.sha256`). A `-dirty` stamp warns.
- **A composer direction** must carry the spec's fingerprint.
- **A legacy stamp** (`... @ <sha12>`) must name a commit in this history while the frozen v2 still matches its hash-lock. When there is render evidence, it must pin this file's sha256.

v2 stamp: `hushmallow-infinite-studio my-brain-at-2am-v2 @ 9a16084d9477`.

### G-FINAL:determinism (`qa/gates/determinism.mjs`)

Three frames are picked from the video's sha256, so a re-run picks the same frames. Each is re-rendered in a fresh engine page, primed as the farm primes a segment start (`prime(i, preroll)`). Its RGBA hash must equal the recorded hash:

- a farm job: `provenance.json frameHashes`, at the job's own parameters;
- the legacy v2: `qa/golden/v2/sequential-frames.json`, whose re-encode is bit-identical to the approved H.264 stream.

Measured: v2 frames 134, 257 and 273 are identical (about 19 s, run in parallel with the pixel pass). The WP-02 final-profile render's frames 131, 358 and 408 are identical (11.7 s).

### G-FINAL:flash (`qa/gates/flash.py`)

Linear relative luminance is averaged over a 34x60 block grid, on every second pixel (exact box means). The film loops, so the wrap from the last frame back to frame 0 counts as one more transition.

| Check | Rule | v2 |
|---|---|---|
| `flash` | Zero transitions in which 25 % or more of the blocks change by 10 % or more while their darker state is below 0.8 (brand rule D5) | 0; largest share of changing blocks 0.133 |
| `red` | Zero saturated-red transitions: blocks where R/(R+G+B) ≥ 0.8 change (R−G−B)·320 by more than 20, over 25 % or more of the frame | 0 |
| `pattern` (provisional) | A moving periodic pattern: 3 or more of 12 tiles carry one strong periodic component (peak share ≥ 0.35, amplitude ≥ 0.05, 3 or more cycles per tile) with more than 5 stripe pairs, and its phase moves. More than 3 such analysed frames (every 2nd) fail. | 0 striped tiles |
| `wcag` | Report only: WCAG 2.3.1 general flashes in the worst 1 s window (warns above 3) | 0 |

### G-FINAL:seam (`qa/gates/seam.py`)

The seam is the mean |Δ| (RGB) from the last frame to frame 0. It must be at most max(1.15 × the median consecutive |Δ| over quiet pairs, the p90 of all consecutive |Δ|), where quiet pairs are those at or below the median. The same rule is applied inside the face box: the union of the face's screen boxes at the first and last frames.

| | v2 |
|---|---|
| whole frame | seam 1.886, limit 4.279 |
| face box | seam 2.435, limit 9.999 |

The plan's own v2 figures were "1.89 vs 2.02–2.09". The audio half of the seam belongs to G-AUDIO.

### G-FINAL:fidelity (`qa/gates/fidelity.py` + magnification)

The geometry places about 420 art points of the Mallow's skin (outside the face) on screen in every frame. The pixel there shows that art point after the soft body, the camera, the relight and the grade. Points under glass cards or text are skipped, and a frame needs at least half its points uncovered.

| Check | Rule | limit | warn | plan | v2 |
|---|---|---|---|---|---|
| `grade`: hue shift | mean skin hue against the pristine art at the same points, held for 15 frames | 30°, provisional | 10° | 10° | 22.3° (the cold section) |
| `grade`: lightness ratio | mean L* ratio, held for 15 frames | 0.7–1.35 | 0.75–1.25 | 0.7–1.35 | 0.796–1.042 |
| `grade`: chroma ratio | mean C* ratio, held for 15 frames | 0.45–1.6, provisional | 0.8–1.2 | 0.8–1.2 | 0.552–1.424 |
| `sharpness` | median, over still frames (the shutter moves less than 2 px), of the skin's band-pass contrast energy (DoG σ 0.7/1.6 px, 7 px window, normalised by local mean) against the pristine art's at the same screen scale | ≥ 0.6, provisional | 0.7 | – | 0.835 (WP-02 final profile 0.842) |
| `restFade` | largest consecutive face-box |Δ| inside the painted-rest fade windows, against the median of the surrounding second | ≤ 1.5 | – | 1.5 | 1.003 |
| `magnification` | largest screen px per art px of any loaded raster, from the render's asset log | ≤ 1.0 | – | 1.0 | 0.869 |

"Held for 15 frames" means the gate takes the largest deviation that lasts 15 frames, so a flash or a single odd frame belongs to other gates.

v2's cold and warm palettes relight the body well beyond the plan's hue and chroma bands, and the relight is part of the approved look. The plan's values stay as the warn band.

**Deviation: rest probes.** The plan's identity-post, Mallow-only rest probes need an engine probe mode, which `engine/` does not have yet (a WP-10 follow-up). See `docs/wp/WP-05.md`. The pixel checks above judge the delivered video instead.

### G-FINAL:figure-ground (`qa/gates/figure_ground.py`)

Every 3rd frame, at half resolution, QA computes dE2000 between two means:

- the mean Lab of the silhouette eroded by 20 px, outside the face box;
- the mean Lab of a ring 6–40 px outside the silhouette, minus cards, text and the frame border.

The value is the lowest one held for 15 frames.

| limit | warn | plan | v2 |
|---|---|---|---|
| < 8 fails | < 12 warns | the same | 41.6 |

Provisional.

### G-FINAL:realm-likeness (`qa/gates/realm_likeness.py`)

Each frame is reduced to a 9x16 Lab grid, area-averaged in linear light. Frames are classed by the direction's world dials:

- *tense*: tension ≥ 0.6;
- *resolved*: warmth ≥ 0.6;
- *base*: both ≤ 0.25;
- otherwise transitional, and skipped.

For each mood, the median grid is compared with the realm reference grid as the mean dE2000 over the cells. The gate value is the worst mood: 14 or more fails, 10 or more warns (the plan's values).

**Reference:** `qa/fixtures/ref/realms/moonmilk-cove.json`, built from v2 by `qa/fixtures/build-refs.mjs`. It is provisional until WP-19 captures the app's own realm stills, and the owner's realm stills stay the primary check.

**Measurements:** v2 is 0 by construction, the WP-02 final profile 0.04–0.05, and the re-encoded fixtures 0.35–0.43. A realm with no reference does not run, so it blocks export.

### G-FINAL:logo (`qa/gates/logo.py`)

The reference is the engine's own `LogoCard` drawn at the direction's options. The video's crop is averaged over the frames where the card is at full alpha and full scale (13.3–14.3 s in v2, 31 frames). Averaging removes most of the time-seeded grain and the codec noise. The comparison uses the probe's opaque pixels: the plate and the cores of the `hushmallow.com` glyphs.

| | limit | warn | plan | v2 |
|---|---|---|---|---|
| luminance SSIM | ≥ 0.95, provisional | 0.995 | 0.995 | 0.988 (final profile 0.990; re-encoded fixtures 0.985) |
| mean dE2000 | ≤ 3.0, provisional | 2.0 | – | 1.08 (re-encodes 1.40) |

A single frame of v2 measures 0.981. The plan's "same post-processing" probe would need the engine's post pass; averaging is the stand-in.

### G-FINAL:brand-marks (`brand-marks.mjs` + `marks.py`)

| Check | Rule |
|---|---|
| `mark` | A DRAFT/INTERNAL mark is required exactly when the spec is internal or draft, QA judges draft frames, or the render was asked for a mark (`params.mark`). A named mark must show its own label. |
| `endCard` | `copy.end.kind` is exactly one of resolution and closer, with text. |
| `noBang` | No `!` in the copy or the overlay text. |

**How the mark is detected:** QA takes the normalised cross-correlation (within ±3 px) of the frame's luminance with the engine's own `Marks` canvas at the output scale. It uses the template's opaque pixels, every 15th frame. A mark is present at a median NCC of 0.6 or more.

**Measurements:** the WP-02 DRAFT render scores 0.997. v2 scores 0.003 (DRAFT) and 0.019 (INTERNAL).

Closer frequency (about 30 %, never 3 in a row) is a posting rule that G-SPEC's sequencing enforces.

### G-FINAL:allowlist (`qa/gates/allowlist.mjs`)

Every served file under the studio's or the app's `assets/` must carry an allowed sha256. Code is covered by the job key. The allowed hashes come from:

- `library/assets-manifest.json`, once it exists;
- `qa/golden/v2/frozen.sha256`;
- `qa/golden/app-tree.sha256`.

The loaded files come from `provenance.json assets`. For the legacy v2 they come from `qa/fixtures/v2/render-evidence.json`. That file is built by `qa/fixtures/build-v2-evidence.mjs` from WP-01's farm job `runs/wp01/v2-w2`, whose 450 frame hashes equal the sequential golden. The script refuses to write unless that chain holds.

v2 loads 6 assets, all on the allowlist. No asset changed during the render.

### G-AUDIO (`qa/gates/audio.py` + `audio-gate.mjs`)

| Check | Rule | v2 |
|---|---|---|
| `loudness` | integrated −16 ± 0.5 LUFS (ffmpeg ebur128) | −16.0 |
| `truePeak` | ≤ −1.5 dBTP | −2.0 |
| `lra` | ≤ 10 LU | 3.3 |
| `offset` (provisional) | Global A/V offset within ±20 ms: the circular cross-correlation of the audio's onset strength (5 ms log-energy flux) with the cue log's impulse train, over ±500 ms | 0 ms |
| `onsets` (provisional) | Transient cues only: loud cues (take, land, thought, release, eyes_open, logo) within ±20 ms, quiet cues (blink, wince, lift_off) within ±45 ms. Onsets use a 600 Hz high-pass, a 2 ms envelope and the 20 % rise point. A cue rising less than 10 dB is masked and not graded. Cues scored with sustained sounds (breaths, swishes, sparkles) have no onset to time. | 12 graded, 0 outside |
| `seamStep` | wrap step \|x[0] − x[N−1]\| < −60 dBFS | −31.3 dBFS |
| `seamRms` | the 10 ms RMS across the seam lies within 3 dB of the range of its two 10 ms neighbours | 0 dB outside |
| `gap` | no run over 1 s below −50 LUFS momentary (K-weighted, 400 ms, circular) outside the turn | 0 s |
| `hum` | Tension hum ≤ −24 dBFS: the narrowband level (±1 bin of 5.9 Hz) at the score plan's hum frequency while it sounds, as a sine-equivalent RMS. This is an upper bound. | −26.1 |
| `tonal` | the last 3 tonal events of the score plan (bell, ping, blip) never fall by more than 50 cents | 784, 1046.5, 1568 Hz |
| `recipes` | no banned recipe (ringtone, alarm, heartbeat, messenger-pop, jump-scare) among move recipes and score events | 0 |
| `close` | MO-CLOSE is in the spec's sound motifs | yes |

**v2's seam step.** The frozen v2 score ends at 0.7 and restarts from 0 (R7), so it steps by −31.3 dBFS. The legacy score `soundtrack-v2` gets a provisional limit of −24 dBFS and warns. Every other score must meet −60 dBFS; WP-04's circular render fixes R7.

**Score plan:** `score-plan.json` from the score (WP-04), or a `buildPlanV2` replay for `soundtrack-v2`. Without either, the `hum` and `tonal` checks do not run.

**The seamRms reading:** the plan's "within ±3 dB of its neighbours" is read as within 3 dB of the neighbours' range. A click rises above both neighbours and a dropout falls below both. v2's neighbours differ from each other by 9 dB.

### G-DUPES (`qa/gates/signature.py` + `dupes.mjs`)

**Signature:**

- a 64-bit pHash (32x32 grayscale, 2-D DCT, the 8x8 low band against its median) at the 7 anchor frames, which are the direction's probes: cover, gag, impact, peak, ritual-mid, eyes-open and end-card;
- a 3x3 Lab grid per anchor;
- an audio band profile.

**Corpus:**

- `ledger/fingerprints.jsonl` records that carry a `signature`;
- `--corpus` JSONL files.

QA keeps the records from the last 14 days before the spec's `plannedFor` (or `--at`) and skips the video's own id.

**Rules:**

- `held`: 5 or more of the 7 anchors within Hamming 10 of one video fails (held for review);
- `cover`: the cover is at least 14 from each of the channel's last 30 posts.

All values are provisional. The report carries the signature, so an approval can record it (WP-25).

## 4. Fixtures

`qa/fixtures/fixtures.json` defines the fixtures. `qa/fixtures/build.mjs` builds them into `WORK/qa-fixtures/<id>/`, using `qa/fixtures/make_fixtures.py` for the media. `qa/fixtures/run-fixtures.mjs` (`hm qa fixtures`) runs them.

**What a fixture is:** the approved v2 with exactly one fault, plus an `hm-qa-target/1` manifest that uses an empty ledger. Its render evidence is pinned to its own video: a fixture stands for a render whose provenance is in order. Each video fixture is a full re-encode (x264 CRF 14, BT.709, faststart) with the source's audio stream copied.

**Caching:** media is re-made only when the fixture's `make` block, `make_fixtures.py` or the approved video changes. The manifests are always rewritten.

The runner checks two things for each fixture: exactly one gate fails, and the named check fails inside it. The determinism re-render runs only for v2 by default (`--render` for all), because it never reads a fixture's pixels.

| # | Fixture | Fault | Fails exactly | Measured |
|---|---|---|---|---|
| 1 | `strobe` | 1 s strobe from 4.0 s: 2 frames 55 % toward white, then 2 frames normal | G-FINAL:flash `flash` | 16 flashes |
| 2 | `white-frame` | frame 120 white over the top 36 % of the frame | G-FINAL:flash `flash` | 2 flashes |
| 3 | `seam-jump` | frames 440–449 replaced by frames 410–419 | G-FINAL:seam `seam` | 22.5 against limit 4.4 |
| 4 | `text-right-rail` | "Should I / explain?" burned at x 908, y 1000, 6–8 s | G-DRAFT:safezone `zones` | holds still for 19 scans |
| 5 | `upscaled-sprite` | the Mallow resampled from a copy 2.5 times smaller, every frame | G-FINAL:fidelity `sharpness` | 0.457 against ≥ 0.6 |
| 6 | `recoloured-body` | the Mallow's hue rotated by 75°, every frame | G-FINAL:fidelity `grade` | hue shift 97° against ≤ 30° |
| 7 | `tinted-logo` | logo card × (1.0, 0.86, 0.70) | G-FINAL:logo `colour` | dE 14.4 against ≤ 3 |
| 7 | `rescaled-logo` | logo card scaled 1.08 times about its centre | G-FINAL:logo `ssim` | 0.453 against ≥ 0.95 |
| 8 | `loud-mix` | +4 dB into a limiter | G-AUDIO `loudness` | −12.4 LUFS |
| 9 | `av-offset` | audio delayed 300 ms (circularly) | G-AUDIO `offset` | 300 ms |
| 10 | `breath-hold-line` | line 2 is "Hold your breath. Again." (spec only, sealed) | G-SPEC `lint:breath-hold` | also `lint:medical`, `copy:lines` |
| 11 | `two-am-afternoon` | T12 (three-pm slump), Loomi, afternoon; line 3 is "Still awake at 2 AM." (spec only, sealed) | G-SPEC `lint:time-word` | needs late-night or night |
| 12 | `duplicate` | a re-encode of v2; v2's signature is in the corpus under another id, 4 days earlier | G-DUPES `held` | 7 of 7 anchors |
| 13 | `missing-draft-mark` | the approved frames for the internal golden spec | G-FINAL:brand-marks `mark` | NCC 0.003 |
| – | `upscaled-sprite-log` | the asset log records the art raster magnified 1.6 times | G-FINAL:fidelity `magnification` | 1.6 against ≤ 1.0 |
| – | `stray-draft-mark` | the engine's DRAFT mark on a production render | G-FINAL:brand-marks `mark` | NCC 0.997 |
| – | `moving-stripes` | moving 40 px diagonal stripes over the bottom third, 4.0–5.5 s | G-FINAL:flash `pattern` | 21 analysed frames |

The plan's item 7, "a tinted or rescaled logo", has one fixture for each case.

**Result** (`WORK/qa-fixtures/summary.json`, `hm qa fixtures --render`): v2 passes, and 17 of 17 fixtures fail exactly their own gate. Every video fixture ran all 18 gates (the determinism re-render included) and failed exactly one. The two spec-only fixtures fail G-SPEC; their other 17 gates do not run, because they have no video and G-SPEC refuses them. The runner takes 431 s for the 17 fixtures plus v2.

## 5. The review gallery

`gallery/build.mjs` (or `hm qa gallery`) builds the gallery. QA runs first for any video that has no current report.

**Output:** `index.html` (built from `gallery/template.html` with the data inlined, and no external script, style or font) plus `media/<slug>/`. The page opens offline from the file system.

**For every video it shows:**

- **media:**
  - the preview MP4 (the render's own preview, else an encode of 15 MB or less, per OWNER-DECISIONS Q3);
  - the loop seam played twice (last 1.5 s, first 1.5 s, twice, with sound);
  - a side-by-side with the approved v2 for T01-style videos;
  - the contact sheet, the gag and ritual filmstrips, the waveform with cue markers, the seam pair, and the logo against its probe;
- **QA:**
  - QA badges for the 18 gates (click one for its checks);
  - the spec table;
  - the nearest ledger neighbours;
- **the decision:**
  - the AUDIT-v2 ten-question checklist (strong, good, adequate or weak);
  - a verdict, reason codes and a note;
  - copyable `hm approve` and `hm reject` commands.

**Saving and exporting decisions:**

- Decisions stay in the browser's localStorage until exported.
- **Export decisions.json** writes `hm-review-decisions/1`:

```
{ schema: 'hm-review-decisions/1', batch, title, by, exportedAt, reasonCodes,
  decisions: [{ id, batch, fingerprint, verdict: approve|reject, reasons: [acting|timing|copy|world|face|sameness|brand|other],
                note, checklist: { "1": "strong", ... }, video: { file, sha256 }, qa: { status, report, reportSha256 } }] }
```

- A rejection needs at least one reason code (the ledger's rule).
- Approving a video whose QA did not pass warns, because `hm export` would refuse it.
- `hm review import` (WP-25) reads this file and writes the ledger with the fields `planner/ledger.mjs` validates. Nothing is posted.

## 6. Interfaces for other work packages

| Package | What it does with QA |
|---|---|
| WP-04 (score) | Write `score-plan.json` next to `final.mp4` with `synth` events (`t`, `inst`, `f`) and the tension layer (`swirl.tension {gain, freq}`, `t0`, `dt`) so that `hum` and `tonal` can run. New scores must meet the −60 dBFS seam step. `audio/check.mjs` and `qa/gates/audio.py` measure the same G-AUDIO rules; converge them at integration. |
| WP-10 (face styles) | Add the geometric face-inside-silhouette check when face transform channels appear. An engine probe mode (identity post, Mallow only) enables the plan's rest probes. |
| WP-19 (realm references) | Replace `qa/fixtures/ref/realms/moonmilk-cove.json` with app-captured stills per mood, and add one file per realm. |
| WP-25 (variety) | Record `report.signature` in `fingerprints.jsonl` at approval; `hm review import` reads `decisions.json`. |
| WP-15 / WP-27 | Refit the provisional thresholds and the G-COST model. Log every change here. |
| Assets | When `library/assets-manifest.json` exists, the allowlist and G-SPEC's asset check both use it. |

## 7. Calibration and change log

| Date | Change | Why |
|---|---|---|
| 2026-10-14 (WP-05) | First calibration on the approved v2: every value marked `provisional` in `thresholds.json`, with the plan's value as the warn band | v2 must pass every gate (acceptance). v2 sits outside the plan on glass-card contrast (2.19:1), cards over the Mallow (21.8 %) and face (5.7 %), skin hue (22.3°) and chroma (0.55–1.42), logo SSIM (0.988) and the legacy audio seam step (−31.3 dBFS, R7). |
| 2026-10-14 (WP-05) | Sharpness limit 0.5 → 0.6, logo SSIM limit 0.97 → 0.95 | Balanced margins: v2 0.835 and upscaled fixture 0.457 for sharpness; re-encoded fixtures 0.985 and rescaled logo 0.45 for SSIM. |
| 2026-10-14 (WP-05) | Safezone: persistence plus rejection of periodic patterns | Moving stripes cut the water reflection into glyph-like pieces. That is a flash/pattern fault and must not also read as text. |

**Cross-checks of the calibration:**

- WP-02's final-profile render of the same film (`WORK/wp02r2/renders/final-4`) passes every gate it can judge. It has no spec, so G-SPEC does not run and its report is incomplete.
- The DRAFT-marked draft render (`WORK/wp02r2/renders/draft-2`, `--stage draft`) shows its mark (NCC 0.997).
