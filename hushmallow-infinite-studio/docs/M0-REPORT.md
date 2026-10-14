# M0 report: foundations (independent audit)

**Milestone M0** (`docs/PHASE2-PLAN.md`, "M0 Foundations"): the generator reproduces the approved v2 exactly through the new engine and composer; a final renders in 12 min or less per 15 s (stretch 9 min); score, QA, planner and derivation tooling work end to end; the owner decisions that block assets are collected.

This report is the independent M0 audit. It checks every acceptance criterion of WP-00 to WP-07 against the integrated branch `claude/hushmallow-phase-1-video-0ipvz6` at `f034da8` (Wave D). Each key result was **re-measured in this audit**; numbers taken from a work-package report are marked *(WP report)*. Machine: 4 cores, no GPU (SwiftShader), Chromium 141.0.7390.37 from Playwright 1.56.1, Node v22.22.0, ffmpeg 6.1.1, 2026-10-14. Every heavy run held the heavy-job lock; timed runs held it exclusively. Logs and outputs are in `/home/user/hm-work/m0-audit/` (machine-local).

## 1. Verdict

**M0's core promise holds. The milestone is not fully closed.**

- **v2 is reproduced exactly.** T01 composed from its spec and rendered through runtime v3 matches the frozen v2 module in every state number (476,585 numbers, max |Δ| 0), every mesh hash, every sub-frame count, the cue log, the curves and the score plan. 16 of 16 golden frames and all 450 frames of a full exact-profile farm render are bit-identical. The audio is the approved soundtrack, byte for byte.
- **A final renders in 8.7 min per 15 s on one worker** (521.6 s, this audit, exclusive lock). The limit is 12 min and the stretch 9 min. The same render work measured 9.5–10.9 min in earlier runs *(WP-02 report)*, so the stretch is met in 1 of 5 runs; the limit holds in all of them.
- **QA, score, planner and derivation work end to end.** The approved master and T01 both pass all 18 QA gates (about 22–25 s each); all 17 fault fixtures fail exactly their own gate; the planner compiles 1,000 specs through G-SPEC and G-DIR with 0 violations; the Noomi derivation is byte-identical to the frozen assets.
- **The frozen v2 and the live app are untouched**: byte-identical to the `v2-approved` tag (section 6).

What keeps M0 open:

1. **8 of 43 acceptance criteria are partial** (none is unmet outright). The two that matter most for brand safety: the banned-sound lint lets 25 of 27 known banned shapes through (WP-04), and the copy lint misses common inflections of banned topics and is not a strict superset of the library validator for clock phrases (WP-06). The determinism and write guards have known bypasses (WP-00). Details in sections 8 and 9.
2. **The owner's M0 gate review has not happened yet.** Its materials are ready (section 7). Two of them were missing before this audit and were built by it: the T01-versus-approved side-by-side and the Q2 stills sheet.
3. **Integration defects found by this audit** (section 10): a remuxed video can never pass QA (`G-FINAL:delivery` rejects its provenance stamp); a farm render of a composed direction carries no `spec.json`, so QA reports it incomplete; the `v2-approved` tag exists only locally, not on GitHub.

**Recommendation:** hold the owner's M0 gate review now; the materials are ready and none of the open items changes what the owner is asked to judge. Run a short M0 follow-up wave on the items in section 9 before M1 work relies on them (WP-13 tunes new cells on the pose bridge and G-DIR; every new direction's sound goes through the banned-sound lint once Q7 switches the score). None of the follow-ups touches the frozen v2 or the parity results.

## 2. What M0 delivers

| Piece | What it does | State |
|---|---|---|
| Freeze and safety rails (WP-00) | Hash-locks the approved v2 (git-ignored render files included) and the live app; a guard suite fails on any change, on clock or randomness reads in `engine/` and `composer/`, and on writes outside the studio; a kernel write jail confines every studio entry point; the heavy-job lock serialises CPU-heavy jobs. | working; guard bypasses open (section 9) |
| Golden data (WP-00) | The v2 reference: state at all 2,441 times, mesh hashes, sub-frame counts, cue log, curves, score plan, 16 lossless frames, and the hashes of all 450 frames in order. | complete |
| Engine and render farm (WP-01) | `engine/` is a fork of `stage2/`; the farm renders 90-frame segments in parallel workers, reads frames back by binary POST, joins segments losslessly, resumes after a crash, and writes provenance. `hm render`, `hm status`, `hm doctor`. | working |
| Quality profiles (WP-02) | `exact` (bit-identical to v2, for goldens), `final` (production, 8.7–10.9 min), `draft` (88.7 s *(WP report)*), `proof` (6 stills in 13.3 s *(WP report)*). Every speed-up is a switchable feature with its own pixel gate. | working; default profile is still `exact` |
| Composer (WP-03) | Turns a spec into a direction (`hm-direction/3`) from moves; v2 is T01 expressed as ten moves; runtime v3 renders directions on the engine. | working; pose-bridge flaw open |
| Score generaliser (WP-04) | Cue recipes per move, each Mallow's kit and realm bed, a seamless circular render; `--compat v2-score` reproduces v2 exactly. `hm score`, `hm remux`. | working; banned-sound lint gaps open; not yet used for new videos (Q7) |
| QA suite and gallery (WP-05) | 18 automated gates from spec to audio, 17 fault fixtures, a static review gallery with a `decisions.json` export. `hm qa`. | working; several limits calibrated on v2 alone (Q6) |
| Planner (WP-06) | Seeded, capability-gated spec planning, copy lint, fingerprints, posting rules, an append-only ledger, approval and export. `hm plan`, `hm spec`, `hm approve`, `hm export`. | working; copy-lint gaps open |
| Derivation refactor (WP-07) | The Noomi asset derivation as a shared Python package with per-family feature finders and 13 shared asset gates, so each Mallow's asset work can start without risking Noomi. | working |

## 3. Parity: is v2 reproduced exactly?

| Check | Command (this audit) | Result |
|---|---|---|
| G-STATE through the composer and runtime v3 | `HM_PARITY_FULL=1 node cli/hm.mjs test guard unit parity property` | 2,446 rows (2,441 times + the 0.98 s golden), **476,585 numbers, max \|Δ\| 0** (limit 1e-9) |
| Mesh hashes, sub-frame counts | same | identical for every row; 1,991 sub-frames |
| G-CUES | same | cue log and curves byte-equal |
| G-PIXEL, exact profile, through the composer | same (`composer-v2-pixels`, all 16 with `HM_PARITY_FULL=1`) | **16/16 cold golden frames bit-identical** (tolerance 0/255) |
| G-PIXEL, exact profile, legacy route | `node cli/hm.mjs test golden` | 16/16 bit-identical; the sequential reference agrees |
| Full film, exact profile, through the composer | `hm render composer/t01-v2 --profile exact --workers 2` (the farm checks every frame against `qa/golden/v2/sequential-frames.json`) | **450/450 frame hashes identical**; the video stream is byte-identical (`ed3afaa9…`) to WP-01's legacy-route renders and WP-02's `exact-2`; 0 decode errors |
| Full film, final profile: composer route against legacy route | `hm render composer/t01-v2 --profile final --workers 1`, then `sha256sum video.mp4` | **byte-identical video stream** (`552c2bee…`) to WP-02's legacy-route final renders `final-3` and `final-4` |
| Final profile against exact (16 goldens) | `node cli/hm.mjs test golden` | PSNR **min 51.91 dB**, mean 53.69 (limit 45); face-box PSNR min 46.75 dB; face-box SSIM **mean 0.99906, min 0.99865** (limits 0.995 / 0.98) |
| T01 final against the **approved master MP4** (decoded, all 450 frames) | `ffmpeg … psnr / ssim` (`m0-audit/compare.sh`) | PSNR-Y mean **44.22 dB** (min 43.09); SSIM-Y mean **0.9685** (min 0.9660) |
| Encoder floor for that comparison | the exact render (identical source pixels) against the approved master | PSNR-Y mean 44.59 dB, SSIM-Y mean 0.9691: two lossy encodes of the grainy picture differ this much on their own, so the final profile costs about 0.4 dB on top of the encoder |
| Score, compat mode | `node audio/score.mjs output/v2/cues.json … --compat v2-score` | plan **byte-equal** to `qa/golden/v2/plan-v2.json`; WAV sha256 `cfbf57e5…` = the approved soundtrack |
| Score in the farm render | `sha256sum score.wav`; `ffmpeg -map 0:a -c copy -f adts` | `score.wav` = the approved soundtrack; the AAC stream is **bit-identical** to the approved master's (`5775b82c…`) |
| Cue log of the farm render | compare with `output/v2/cues.json` | cues and curves equal; only the id differs (`T01-noomi-late-night-15s-076e81`) |

## 4. Performance

| Measure | This audit | Earlier *(WP reports)* | Limit |
|---|---|---|---|
| **Final, 15 s, 1 worker, wall clock** (compile, render, x264 master, score, mux, preview) | **521.6 s = 8.69 min** | 572.1 s and 651.1 s at the same code; 584.3 s and 607.0 s at round 1's tip (same render work outside 21 rest frames) | ≤ 12 min (stretch 9) |
| Render segments of that run | 481.7 s (102.9 + 143.5 + 102.2 + 71.3 + 61.8) | 526.8 s, 604.4 s | — |
| Sub-frames per film (final) | 1,611 | 1,611 | — |
| Readback, binary POST, exclusive | **35.5 ms** round trip, 17.1 ms on the critical path (stage2: 256 ms) | 43.5–47.2 ms | ≤ 60 ms |
| Readback inside the render | 31.0–32.8 ms median per segment | 31.3–33.3 ms | — |
| Exact profile, 15 s, 2 workers | 1,183.9 s (19.7 min) | 1,341.2 s | — (goldens only) |
| Draft, 15 s | not re-run | 88.7 s | ≤ 3 min |
| Proof, 6 stills | not re-run | 13.3 s | ≤ 45 s |
| QA, 15 s, exclusive | **24.7 s** (approved master), **21.6 s** (T01) | 25.0–25.6 s | ≤ 90 s |
| `hm remux`, exclusive | **9.8 s** | 9.3 s | ≤ 60 s |
| Noomi derivation | **95.0 s** wall (93.7 s in-script) | legacy baseline 96.93 s | ≤ +10 % |
| Planning 10k specs | **1,007 ms** (2.0–2.2 s with writing) | 795–993 ms | < 10 s |

The run-to-run spread (521.6 to 651.1 s for the same work) comes from the machine, not the code: the two WP-02 runs and this audit's run all produced the same video stream, byte for byte. Plan throughput on the median, about 9.7 min per final on one worker. Size: the final's video stream is 46.1 MB against the approved master's 34.2 MB (+35 %), because the farm encodes constant QP 15 instead of CRF 16 (owner question Q4).

## 5. QA on the approved master and on T01

`node qa/run-qa.mjs v2` and `node qa/run-qa.mjs <T01 target>` (T01 judged as the production twin of the golden spec, as the approved master is):

| Gate | Approved master | T01 via composer, final profile |
|---|---|---|
| Verdict | **PASS, 18/18** (24.4 s) | **PASS, 18/18** (21.3 s) |
| G-SPEC, G-DIR, G-COST | pass (warnings: no assets manifest yet; end card clear 1.95 of 2.35 s; provisional cost model) | same |
| G-DRAFT safezone / readability / layout | pass with warnings: glass text 2.19:1; cards cover 21.8 % of the Mallow, 5.7 % of the face | same |
| G-FINAL delivery | pass | pass |
| G-FINAL determinism | frames 134, 257, 273 re-rendered bit-identically | frames 26, 272, 375 re-rendered bit-identically |
| G-FINAL flash | 0 flashes | 0 flashes |
| G-FINAL seam | 1.886 (limit 4.279) | 1.908 (limit 4.309) |
| G-FINAL fidelity | pass, warn: skin hue 22.3°, chroma 0.552 (provisional limits); magnification 0.869 | same; magnification 0.869 |
| G-FINAL logo | SSIM 0.988, dE 1.08 | SSIM 0.990, dE 0.92 |
| G-AUDIO | −16.0 LUFS, −2.0 dBTP; seam step −31.3 dBFS under the legacy limit (−24) for the frozen score | same score, same numbers |
| G-DUPES | pass | pass |

Run on the farm job directory as it stands, T01 is **INCOMPLETE**: the job holds no `spec.json`, so G-SPEC, the brand-mark end-card check and G-AUDIO's closing-motif check cannot run (section 10).

The generic score was also put through QA: the T01 picture re-scored by `hm remux` (score `hm-score`) **passes G-AUDIO** (−16.0 LUFS, −2.0 dBTP, raw seam step **−63.4 dBFS** against −60, final tones 784 → 1047 → 1568 Hz) but **fails G-FINAL:delivery** on its provenance stamp (section 10).

Fault fixtures (`HM_QA_FIXTURES=1 … tests/golden/qa-suite.test.mjs`): **17/17 fail exactly their own gate**, 14 of them the plan's 13 faults, in 311 s.

## 6. The frozen v2 and the live app

Checked independently of the guard suite (`/home/user/hm-work/m0-audit/frozen-check.sh`), against the tag `v2-approved` (`dfed2b6`):

| Check | Result |
|---|---|
| `../hushmallow`: every file on disk (ignored files included) against `qa/golden/app-tree.sha256` | 230 files, identical; no additions, no deletions |
| `../hushmallow`: every tracked blob at the tag against disk | 230 of 230 identical; `git diff v2-approved -- hushmallow` empty |
| Frozen v2 paths (`stage/`, `stage2/`, `videos/my-brain-at-2am-v2.js`, `audio/soundtrack-v2.mjs`, `audio/soundtrack.mjs`, `render/render.mjs`, `render/verify.mjs`, `assets/noomi/`, `output/v2/`): tracked blobs at the tag against disk | 49 of 49 identical |
| Files under the frozen paths that are not in the tag | `output/v2/my-brain-at-2am-v2.preview.mp4` (added by `451caf0` in Phase 1, before Phase 2, and hash-locked) and the 3 git-ignored render files, which match `frozen-local.sha256` |
| Both frozen manifests | `sha256sum -c`: 53 of 53 OK; the manifests have not changed since WP-00 |
| `node cli/hm.mjs guard` | all four checks ok |
| `git ls-remote --tags origin` | **empty: the tag is not on GitHub** (section 10) |

## 7. What the owner should look at (M0 gate, about 45 minutes)

| # | Material | Where | What to decide |
|---|---|---|---|
| 1 | **T01 rebuilt through the composer, side by side with the approved v2 master** (new in this audit) | `docs/m0/t01-composer-vs-approved-preview.mp4` (1080×960, 2.0 MB); full size `/home/user/hm-work/m0-gate/t01/side-by-side-approved-vs-t01-final.mp4` (2160×1920, every frame 1:1) | Nothing should differ beyond encoder noise and the final profile's face change (item 2). Numbers: section 3. |
| 2 | **A/B flip sheet** (16 golden frames, exact against final, face box at 1:1 and difference × 8) and the **full-video side-by-side** of exact against final | `docs/m0/wp02-ab-flip/index.html`, `docs/m0/wp02-side-by-side-preview.mp4`, `docs/m0/wp02-README.md` | **Approve or reject R1:** the final profile draws the face once per frame, so an expression no longer smears within one frame (blinks and eye pops still do). |
| 3 | **A/B listening pass** on the v2 score with each documented fix (circular loop wrap, breath in 11.8–13.3 s, swirl from spin_up), plus the other Mallows' kits | `docs/m0/audio/README.md` and the WAV pairs beside it | **Q7:** when new videos switch to the generic score. |
| 4 | **Benchmark table** | `docs/m0/wp02-bench-table.md` | Nothing; section 4 updates it with this audit's run. |
| 5 | **Decision sheet** | `docs/OWNER-DECISIONS.md` (Q1–Q7 with defaults); stills for Q2 (new in this audit): `docs/m0/decision-q2-canonical-art.jpg` | Q1–Q3 (below). The plan asked for this sheet in week 1 with stills; before this audit it had no stills. |
| 6 | Optional: **the review gallery** for the approved master and T01 (QA badges, contact sheets, filmstrips, the seam played twice, the v2 side-by-side) | `/home/user/hm-work/m0-gate/gallery/index.html` (opens offline, 28 MB, machine-local) | Nothing; it shows how M1 batches will be reviewed (Q3). |

Decisions open, with the default that applies until the owner answers:

| Question | Default in force | Blocks |
|---|---|---|
| Q1 Posting while Noomi is the only finished Mallow | Noomi only, 3–5 posts per week per channel, until 3 Mallows are approved | the M2 gate |
| Q2 Canonical art for Loomi, Boppo, Zuzu | the 1254 px hi-res art (see the stills) | Loomi derivation (WP-31) by the end of M1 |
| Q3 How batches are reviewed | local galleries; previews ≤ 15 MB shareable | the M1 review batch |
| Q4 Master encoder: CRF 16 (D7) or constant QP | D7 stays decided, but the farm encodes QP 15 (bit-identical segments, slightly better quality, +35 % size) | the first production master |
| Q5 G-DIR limits calibrated on v2; G-JOLT extremes sheet | the calibrated values (stretch 1.4, exhale 1.25×, …); G-JOLT intensity 0.8–1 approved without its sheet | WP-13 |
| Q6 QA limits calibrated on v2 | the calibrated values, the plan's values as warnings | the M1 review batch |
| Q7 Switch new videos to the generic score | every direction keeps `soundtrack-v2` | M1 renders |

## 8. Acceptance criteria, package by package

Status: **met**, **partial** (part of the criterion does not hold, or a review gap contradicts it), **unmet**. 43 criteria: **35 met, 8 partial, 0 unmet.**

### WP-00 Freeze, safety rails and golden capture: 4 met, 1 partial

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Tag `v2-approved`; `templates/` committed; `__pycache__` ignored; validator 0 errors | met | tag on `dfed2b6` (local only, see section 10); `node templates/validate-library.mjs`: OK, 0 errors, 1 caution warning; `git check-ignore`: `.gitignore:23:__pycache__/` |
| 2 | The guard suite fails if the app changes, a frozen hash changes, the wall clock appears in `engine/`/`composer/`, or a write lands outside the studio | **partial** | `node cli/hm.mjs test guard`: 146/146. It fired for real during this audit: one stray file of mine outside the studio failed the write audit (section 11). Open bypasses from the Wave A review, unchanged in code: the determinism scan skips every `node_modules` directory, does not follow symlinked directories, and lists but never follows imports of hash-locked code (today `engine/` and `composer/` import the live app's `registry.js` and `expressions.js` and the frozen v2 module; all three are clean of clock and random reads, checked by hand); the write audit misses a file created and then deleted between two audits. |
| 3 | Golden capture records state, mesh hashes, sub-frames, cues, curves, the plan and 16 lossless frames | met | `node cli/hm.mjs golden verify`: all committed files and 16 PNGs match; tolerance 0/255 and 1e-9 |
| 4 | SwiftShader determinism measured; tolerance set | met | `qa/golden/v2/determinism.json` *(WP report)*: run-to-run bit-identical, tolerance exact; this audit's golden runs reproduce 16/16 at 0/255 |
| 5 | `heavy-lock.mjs` gives exclusive or shared slots, used by bench, golden, derive and render | met | lock calls found in `tools/bench.mjs`, `tools/golden/{capture,sequential}-v2.mjs`, `render/{farm,worker}.mjs`, `tools/derive/*`; the derivation took the exclusive lock itself in this audit. Minor: `hm doctor` renders a frame without it; the Python lock accepts a shared lease for an exclusive job |

### WP-01 Engine fork and render farm: 6 met, 2 partial

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | The frozen v2 module renders through an adapter, bit-identical to the goldens | met | `test golden`: 16/16 bit-identical through the binary readback; `test parity`: G-STATE max \|Δ\| 0 on the engine |
| 2 | W, H, scale are parameters; explicit SwiftShader flags; Playwright and Chromium in provenance; `hm doctor` | met | T01 `provenance.json`: Playwright 1.56.1, Chromium 141.0.7390.37, `--use-angle=vulkan --enable-unsafe-swiftshader` (the plan's `--use-angle=swiftshader` changes pixels and is 3.7× slower: measured deviation) |
| 3 | Readback by binary POST ≤ 60 ms per frame | met | 35.5 ms round trip, 17.1 ms on the critical path (exclusive); 31.0–32.8 ms per segment inside the render |
| 4 | 90-frame segments, IDR at each start, `concat -c copy`, 30 × D frames, 0 decode errors, ≥ 60 dB against a single pass | met | T01 final: 450/450 frames, 0 decode errors, IDR at all 15 GOP starts; `farm` and `farm-encode` tests: segments decode bit-identically to a single pass. Encoder QP 15 instead of CRF 16: owner Q4 |
| 5 | `kill -9` then `--resume`: identical hashes, at most one segment lost; stale locks reclaimed after 10 min; 2 retries; 60 s watchdog | **partial** | `test golden` (`farm`): kill/resume identical, watchdog and retries pass. Open: with 2 workers a kill loses one segment per worker (reviewer's run lost 2); stale-lock reclaim can move aside a fresh lock another worker just took, and the unit test the report cites for it does not exist (`render/segment.mjs` unchanged since Wave B) |
| 6 | Page reload per video; `dispose()`; hashed texture keys; NaN fallback | met | `farm` test "two different specs rendered by one worker show no texture bleed"; `engine-fixtures` parity tests (R4, R18) pass |
| 7 | Runtime chosen from `direction.meta`; curves only from the dry run; R2, R3, R4, R12, R18, R19 | met | `engine-registry` and parity tests pass; the T01 render compiled "runtime v3" from meta |
| 8 | Every texture URL and hash logged per job, with the maximum magnification per raster | **partial** | T01 `provenance.json`: art, pristine, normal, face and logo carry hashes and magnification (max 0.869); the three glass-bubble text rasters log `maxMagnification: null` |

### WP-02 Performance pass 1 and quality profiles: 5 met, 1 partial

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | P2–P8 each a separate commit with `hm bench` numbers (median of 3, exclusive) and its own pixel gate | met | commits `8c6bdb6`, `49677fc`, `ccd688f`, `73b2866`, `349cd83`, `2c3f963`, `79300ec`, `9708a32`: each message carries the bench medians and the gate result; 18/18 step gates pass in this audit's golden run |
| 2 | Final ≤ 12 min per 15 s on 1 worker (stretch 9); draft ≤ 3 min; proof ≤ 45 s | met | final **8.69 min** (this audit; 9.54 and 10.85 min *(WP report)*); draft 88.7 s, proof 13.3 s *(WP report)* |
| 3 | Exact bit-identical; final against exact ≥ 45 dB on all 16, face-box SSIM ≥ 0.995 mean, ≥ 0.98 min | met | min 51.91 dB; face SSIM mean 0.99906, min 0.99865 |
| 4 | Rest test no worse than baseline; loop seam and flash within 2 % | met | *(WP report)*: rest 1.0172 / 2.0689 against 1.0222 / 2.0790; seam −0.02 % whole frame, +0.15 % face box; flash unchanged. This audit: T01 final seam 1.908, face box 2.330, 0 flashes |
| 5 | Owner A/B flip sheet and full-video side-by-side | met | `docs/m0/wp02-*` |
| 6 | Fixes R1, R14, R21 | **partial** | R14 and R21 fixed; R1 implemented, its proof waits for the owner's A/B verdict (gate item 2) |

### WP-03 Composer core, v2 as moves: 5 met, 1 partial

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | G-STATE ≤ 1e-9 at 2,441 times; mesh hashes, sub-frames identical; cue log and curves byte-equal | met | max \|Δ\| 0 over 476,585 numbers; all identical |
| 2 | T01 through the composer bit-identical to the WP-01 legacy render, before and after the WP-02 merge | met | 16/16 cold goldens (this audit); 450/450 in order after the merge *(Wave C)*; **450/450 in a full farm render of `composer/t01-v2` (this audit), video stream byte-identical to the WP-01 legacy render**; final-profile stream byte-identical to the legacy route |
| 3 | Unsorted keys, duplicate spline times, overlapping windows are compile errors (R5); one breath envelope (R11) | met | composer unit tests pass (part of 536/538 below) |
| 4 | Personality and acting an exact identity for Noomi; entry and exit poses; bridge unit tests | **partial** | identity tests pass. The bridge logic is wrong: `mismatches()` skips every channel the exit pose leaves open, so a bridge can leave the next pose's channels out of range. Reproduced: `mismatches('alert','squeezed')` returns only `face.eyeOpen`; `mismatches('startled','asleep')` skips closedCurve, browAlpha, mouthOpen, body.squash and body.lift. Declared poses are never checked against the compiled values. |
| 5 | Circular wrap: P = 0 reproduces v2; a P > 0 test passes loop closure | met | `composer-clock` tests pass |
| 6 | Contracts frozen and documented | met | `docs/ARCHITECTURE.md` §2–§6; schemas validate in the tests |

### WP-04 Score generaliser: 3 met, 2 partial

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | `--compat v2-score` reproduces `buildPlanV2`'s event list exactly | met | plan byte-equal; WAV byte-identical to the approved soundtrack |
| 2 | The default differs only by documented fixes, each its own commit with a before/after WAV | **partial** | each fix has its before/after WAV (`docs/m0/audio/`), but the fixes are flags in one commit, not one commit each (documented deviation: split commits would fail the parity test) |
| 3 | G-AUDIO: −16 LUFS ± 0.5, ≤ −1.5 dBTP, seam step < −60 dBFS, final tones never fall | met | T01 re-scored by `hm remux`: −16.0 LUFS, −2.0 dBTP, seam step −63.4 dBFS, 784 → 1047 → 1568 Hz; all 7 Mallows pass *(WP report)* |
| 4 | `buildMallow(id)` and the realm bed for all 7 ids; scale degrees transpose | met | `audio-pitch` and audio parity tests pass |
| 5 | The banned-recipe lint rejects ringtone, alarm, heartbeat, messenger-pop and jump-scare recipes; `hm remux` ≤ 60 s | **partial** | remux **9.8 s**. Lint: the reviewer's probe, re-run in this audit, gets **25 of 27** banned shapes through: telephone rings (400+450 Hz, 440+480 Hz), beeps with an inaudible 2 ms scoop, pitched engine voices (chime, pluck, drip, thrum), heartbeat limits escaped just past their boundary. G-AUDIO checks recipe names only, not shapes. |

### WP-05 QA suite and gallery: 5 met

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | The approved v2 MP4 passes every gate | met | 18/18 (section 5) |
| 2 | Each fault fixture fails exactly its own gate | met | 17/17, the plan's 13 faults included (9 of the 18 gates still have no fixture: a robustness gap, not part of this criterion) |
| 3 | QA ≤ 90 s per 15 s; SSIM and dE2000 in numpy/OpenCV | met | 24.7 s and 21.6 s; metric tests (dE2000 against Sharma et al.) pass |
| 4 | Thresholds calibrated on v2 alone tagged provisional, with warn bands | met | `qa/gates/thresholds.json`; owner question Q6 |
| 5 | The gallery opens offline, shows everything, exports `decisions.json` | met | `hm qa gallery v2 <T01 target>` (this audit, 19.6 s), opened as `file://` in headless Chromium: 0 page or console errors, 0 network requests, 5 videos (previews, the seam played twice, the v2 side-by-side), 12 images, 18 badges per video, the Export decisions.json button; no horizontal scroll at 390 px. The `decisions.json` export itself: *(WP report)* |

### WP-06 Planner, ledger, copy lint, CLI: 4 met, 1 partial

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Only approved cells, packs and presets; weights 3:1; signature gag about 40 %; intensity caps | met | primary share 0.7540 of 8,000 specs; signature gag 0.4000 of 20,000 |
| 2 | Copy lint a superset of the library validator, plus blocklist, Latin-1, time words, lowercase brand, breath-hold, reading time, no names | **partial** | the superset tests pass, but re-running the reviewer's probes in this audit: "3 IN THE MORNING AND STILL SCROLLING" is `morning` for the validator and clean on a late-night cast for the planner (not a superset); the topic blocklist misses inflections ("Smoked again.", "Vomiting.", "Starved by noon.", "Puking again." pass). The committed library itself is clean (652/652), so nothing unsafe is plannable today. |
| 3 | 10k specs under 10 s, byte-reproducible; bad copy rejected; stable fingerprints | met | planning 1,007 ms; byte-reproducible across processes |
| 4 | 1,000 specs over enabled cells compile through G-SPEC and G-DIR with 0 violations | met | "G-SPEC 1000/1000; G-DIR ran 1000, passed 1000" with the real composer (open at Wave B; closed once WP-03 landed) |
| 5 | `hm export` writes `final.mp4`, `metadata.json`, a `caption.txt` from library strings and `brand.json` only; nothing generated or posted | met | CLI tests pass. Review notes still open: a draft-quality spec can be exported as a final; G-SPEC trusts the pins a spec lists |

### WP-07 Derivation refactor: 3 met

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | `derive_mallow.py --mallow noomi` byte-identical to `assets/noomi/*`; two runs identical | met | this audit: 6/6 assets and 14/14 review-pack files byte-identical; 5 earlier runs gave one hash per file *(WP report)* |
| 2 | `asset_qa.py` reproduces Noomi's QA pack and implements the shared gates | met | *(WP report)*: 14/14; not every gate has a fault test, and the statistical gates "warn" rather than fail inside their noise band |
| 3 | Runtime within +10 % of the baseline; heavy lock; outside render windows | met | 93.7 s in-script against 96.93 s; took the exclusive lock |

### M0 gate materials

| Material | Status |
|---|---|
| T01 through the composer, side by side with the approved v2 MP4, with PSNR, SSIM, state, cue and pixel parity | **built by this audit** (it did not exist): `docs/m0/t01-composer-vs-approved-preview.mp4`, numbers in section 3 |
| A/B flip sheet and full-video side-by-side, final against exact | present (`docs/m0/wp02-*`) |
| A/B listening pass on the v2 score | present (`docs/m0/audio/`) |
| Benchmark table | present (`docs/m0/wp02-bench-table.md`) |
| Decision sheet for the 3 open questions, with stills | **partly present**: the questions and defaults are in `docs/OWNER-DECISIONS.md`; the Q2 stills were built by this audit (`docs/m0/decision-q2-canonical-art.jpg`). Q1 and Q3 need no stills. |

## 9. Open items and the follow-ups they need

Before M0 is signed off:

1. **Banned-sound lint (WP-04 criterion 5).** Model dual-tone ring cadences; decide "steady" by energy-weighted pitch, not the raw glide; treat pitched engine voices as pitched; test each limit past its boundary; run the shape lint inside G-AUDIO. The 27 probe cases in `WORK/verify-wp04r3/lint-evade3.mjs` are the acceptance set. Needed before Q7 switches any video to the generic score.
2. **Copy lint (WP-06 criterion 2).** Use inflection matching for topic terms; keep the validator's time classes as a floor so the planner never accepts what the validator rejects; refuse to plan from a library that fails the validator. The probes in `WORK/tmp/vr-wp06-r4/` are the acceptance set.
3. **Guard bypasses (WP-00 criterion 2).** Scan `node_modules` and symlinked directories under `engine/` and `composer/`; flag imports of hash-locked code unless an allowlist entry pins them with a reason (three exist today); make the write audit report directories whose ctime moved even when no name disappeared, then re-arm after review.
4. **Pose bridge (WP-03 criterion 4).** Compare compiled channel values at the span ends rather than declared ranges, and check declared poses against the compiled direction in G-DIR. Needed before WP-13 tunes new cells.
5. **The owner's gate review** (section 7): the R1 verdict, the listening pass, and answers to Q1–Q7 (or acceptance of the defaults).

Before M1 production renders (robustness and integration):

6. **Render farm (WP-01 criteria 5 and 8).** Make the stale-lock reclaim atomic (check ownership before the `.part` rename and the `.done` write) and add the missing test; restate the crash-loss guarantee per worker or narrow it; log magnification for the glass-bubble text rasters; refuse odd output sizes at compile; take the heavy lock in `hm doctor`.
7. **Integration defects** in section 10.
8. **Calibration debts** already logged: the G-COST final model (predicts 7.93 min; measured 8.7–10.9); the QA legacy seam limit is keyed on the score id, so every composed direction is held to −24 dBFS rather than −60 until Q7; `DEFAULT_PROFILE` is still `exact`, so production renders must pass `--profile final`.

## 10. Integration defects found by this audit

| Defect | Evidence | Effect | Owner |
|---|---|---|---|
| **A remuxed video never passes QA.** `hm remux` stamps the MP4 comment `remux {"contour":…}`, which `qa/gates/delivery.mjs` does not recognise. | QA on `final.remux.mp4`: G-AUDIO pass, **G-FINAL:delivery FAIL** "unrecognised provenance stamp" | a re-scored video cannot be exported | WP-04 + WP-05 |
| **A farm render of a composed direction carries no spec.** The job directory has `direction`, `cues.json`, `provenance.json`, but no `spec.json`. | `hm qa <job>`: INCOMPLETE; G-SPEC, the end-card check and G-AUDIO's closing-motif check report "no spec" | production renders cannot pass QA as they stand; this audit had to judge T01 through a manifest naming the spec | WP-01 farm / WP-25 batch path |
| **The `v2-approved` tag is not on GitHub.** | `git ls-remote --tags origin` lists no tags | the frozen reference lives only in this clone; WP-00 left `git push origin v2-approved` to the integrator | integrator |

## 11. How this audit was run

| Step | Command | Result |
|---|---|---|
| Read the plan and all eight reports, with every integrator note | — | review gaps listed per criterion above |
| Frozen and app integrity | `m0-audit/frozen-check.sh`; `node cli/hm.mjs guard` | section 6 |
| Default suites, all 16 composer frames | `HM_PARITY_FULL=1 node render/lib/heavy-lock.mjs --shared -- node cli/hm.mjs test guard unit parity property` | **538 tests: 536 pass, 1 fail, 1 skipped** (the opt-in 25-min sequential render), 270 s. The failure was the write audit catching my own stray file (below); after removing it, `test guard` passes **146/146** |
| Golden suite | `node cli/hm.mjs test golden` | **14 pass, 1 skipped** (the opt-in fixtures, run separately). The readback test asks for the exclusive lock, so it failed inside my outer shared lease ("nested heavy lock would deadlock"); re-run on its own it passes (35.5 ms) |
| QA fixtures | `HM_QA_FIXTURES=1 node render/lib/write-jail.mjs -- node --test --test-name-pattern="fault fixture" tests/golden/qa-suite.test.mjs` | pass, 17/17, 314 s |
| Final render of T01 | `node render/lib/heavy-lock.mjs --exclusive -- node timed.mjs … -- node cli/hm.mjs render composer/t01-v2 --profile final --workers 1` | 521.6 s; video stream `552c2bee…` |
| Exact render of T01 | `… --exclusive … hm render composer/t01-v2 --profile exact --workers 2` | 450/450 identical to the sequential golden, 1,183.9 s; stream `ed3afaa9…` |
| QA | `node qa/run-qa.mjs v2`; `node qa/run-qa.mjs <job>`; `node qa/run-qa.mjs m0-audit/qa-t01/target.json` (exclusive, timed) | section 5 |
| Score | `node audio/score.mjs output/v2/cues.json … --compat v2-score`; `hm remux` on a copy of the T01 job | sections 3 and 5 |
| Derivation | `python3 -I tools/derive/derive_mallow.py --mallow noomi` | 6/6 + 14/14 byte-identical, 95.0 s |
| Gallery | `node cli/hm.mjs qa gallery v2 m0-audit/qa-t01/target.json --out /home/user/hm-work/m0-gate/gallery`; opened as `file://` in headless Chromium (`m0-audit/gallery-check.mjs`) | 0 errors, 0 network requests, no horizontal scroll at 390 px |
| Side-by-side and stills | `m0-audit/sbs-t01.sh` (ffmpeg hstack, labelled); `m0-audit/q2_sheet.py` (Pillow, reads the live app read-only) | section 7, items 1 and 5 |
| Library, lint, goldens | `node templates/validate-library.mjs`; `node cli/hm.mjs lib validate`; `node audio/lint-recipes.mjs`; `node cli/hm.mjs golden verify` | OK (0 errors); planner inputs OK; 23 recipes, 0 findings; ok |
| Review probes | `node WORK/verify-wp04r3/lint-evade3.mjs`; `node WORK/tmp/vr-wp06-r4/{inflect-probe,superset-time}.mjs`; `composer/poses.js mismatches()` | gaps reproduced (section 8) |

**Audit hygiene.** At the start of the audit I copied `docs/wp/WP-02.md` into the agent session's scratchpad (`/tmp/claude-0/…/scratchpad/wp02.md`), outside the studio and WORK. The machine-wide write audit caught it in the default suite; I deleted the file and `hm guard` and `test guard` pass again. All other audit files are in `/home/user/hm-work/m0-audit/` and `/home/user/hm-work/m0-gate/`. Nothing in the frozen paths or `../hushmallow` was written.

**Committed by this audit:** this report, `docs/m0/t01-composer-vs-approved-preview.mp4` (2.0 MB) and `docs/m0/decision-q2-canonical-art.jpg` (0.4 MB).
