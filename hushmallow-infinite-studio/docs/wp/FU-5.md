# FU-5: Render ops — CRF 16 masters, delivered timing, defaults, farm fixes

**Status: done, with one owner decision flagged** (the audio edit list, section 4). Every other item of the package is implemented and measured. The frozen v2 is byte-identical and the golden T01 keeps exact parity.

The decision in section 4 matters for every new video: the lead asked for "no edit lists: audio physically starts at t = 0". Measured, that format **clicks at every loop**. AAC cannot rebuild the first frame of a stream that has no edit list (G-AUDIO wrap step −26 dBFS, against a −60 dBFS limit). So the default keeps the standard 1024-sample AAC priming edit, which is the approved master's own structure and gives a seamless loop (−86 dBFS). It removes every other offset: no pre-roll, and the picture's B-frame delay is gone too. The literal no-edit-list format is implemented, tested and one flag away (`--audio-edit trim`).

Measured on 2026-10-15 on the studio machine (4 cores, no GPU, Node v22.22.0, Chromium 141.0.7390.37 from Playwright 1.56.1, ffmpeg 6.1.1). FU-4 and the M0 verifiers worked in the same checkout at the same time and shared the heavy lock. Every heavy run held the lock: renders, QA, fixture builds and decodes took shared slots, and the T01 timing and the encoder benchmarks took it exclusively. Scratch files and logs are in `/home/user/hm-work/fu5/` (renders in `fu5/renders/`, logs in `fu5/logs/`).

## What was built

### 1. CRF 16 masters through lossless segment intermediates (Q4(b))

`render/encode.mjs`, `render/farm.mjs`, `render/worker.mjs`, `engine/render/profiles.js`.

- **Segments are encoded losslessly.** The new `lossless` encoder is x264 QP 0, ultrafast, High 4:4:4 Predictive (lossless needs that profile, even for 4:2:0), with closed 30-frame GOPs.
  - It decodes to exactly the yuv420p frames that the colour conversion produced. Checked bit for bit on real T01 frames and on synthetic grain.
  - It is about 16× cheaper than the old segment encoder, so it no longer competes with Chromium for the CPU: 1.2 s instead of 18.6 s for a 90-frame 1080×1920 segment, 74 MB instead of 8.7 MB.
- **The master is one pass over the joined frames.** The new `crf16` is exactly `render/render.mjs`'s x264 arguments (`-preset slow -crf 16 -tune film -profile:v high -level 4.2 -g 30 -keyint_min 30`, BT.709 tags, no `-x264-params`), with `-threads 6`. Six is what x264 chose for the approved master on this 4-core machine (its SEI reads `threads=6`), and pinning it keeps the master independent of the machine.
  - `encodeMaster()` feeds the segments through the concat demuxer into one x264 process.
  - With a preview, a `split` filter feeds a second x264 instance (CRF 20, preset fast) from the same decode.
- **The master is the approved render's encoder, bit for bit.** T01 rendered through the composer at the exact profile (2 workers, 5 lossless segments, one master pass) gives the **approved master's H.264 stream exactly** (`bd761d96…`, `fu5/logs/t01-exact.log`).
- **Segmentation never shows.** Because the intermediate is lossless, the master equals a single-pass master of the same frames, bit for bit, however the film was cut.
  - Proved on 75 grainy frames cut into three uneven segments (unit test).
  - Proved on the farm's own renders: `--tee-single-pass` now tees the master's single pass and compares H.264 stream hashes (golden farm test).
- **Profiles.**
  - `exact` and `final`: `encoder: 'lossless', master: 'crf16'`.
  - `draft`: `encoder: 'draft', master: null`. Drafts keep their speed: veryfast QP 20 segments, joined with concat -c copy.
  - `--encoder qp15` still works (concat, no master pass).
  - `crf16` and `crf20` are refused as segment encoders: CRF is never segment-invariant.
  - The master's name and arguments are part of the job key.
- **Verification of video.mp4:** frame count, zero decode errors, an IDR at frame 0 and never more than 30 frames apart (the master), or the old segment-start IDR rule (concat). The intermediates are deleted after the pass unless `--keep-segments` is given.
- **Provenance** gains `master` (name and arguments), `videoStream.sha256` (the H.264 elementary stream: the picture, whatever the container), `delivery` (each track's edit list) and `preview`.

### 2. The preview: CRF 20, at most 15 MB

`preview.mp4` is the preview picture from the master pass, muxed exactly like the final (same audio, same timing).
- It is encoded from the lossless frames, not from the master. That is better and smaller than re-encoding the master: on the same 450 frames, 46.48 dB at 9.4 MB instead of 46.10 dB at 11.9 MB.
- If a preview exceeds `PREVIEW_MAX_BYTES` (15 MB, OWNER-DECISIONS Q3), it is encoded again from the master at CRF 22, then 24. If it is still too big, the farm says so (`withinLimit: false`).
- T01 measures 7.4 MB.

### 3. `DEFAULT_PROFILE = 'final'`

`hm render` without `--profile` now makes production masters.

The engine page has its own default, `PAGE_PROFILE = 'exact'`, because the goldens, the parity tests and the QA re-render of the approved v2 open pages without a profile and must get the approved rules. `resolveProfile()` defaults to `PAGE_PROFILE`, so nothing that renders without a profile changed. The farm always names its profile in the page URL (`&profile=final`).

### 4. Delivered timing: edit lists (the lead decision, and why the default differs from it)

`render/mux.mjs`, `audio/loop-aac.mjs` (FU-2's file, extended; deviation 1), `audio/score-cli.mjs` (the remux path), `qa/gates/delivery.mjs`.

**The facts, measured on T01's hm-score loop** (`fu5/exp/noedit.mjs`; T01 remuxes in `fu5/renders/t01-final` and `fu5/renders/t01-trim`):

| Delivery | Edit lists | First 21.3 ms vs the score | Loop wrap step (G-AUDIO, ≤ −60) | Click | Ignoring edit lists |
|---|---|---|---|---|---|
| FU-2 / approved-master structure: priming edit only | sound `[[D,1024]]`, picture `[[D,1024]]` | 48.7 dB SNR | −86.0 dBFS | −70.2 | sound 21.3 ms late, picture 66.7 ms late, so the **sound is 45 ms early** |
| **FU-5 default `priming`** | sound `[[D,1024]]`, picture none (identity `[[D,0]]`) | 48.7 dB | **−86.0 dBFS, pass** | −70.2 | picture at 0; sound 21.3 ms late |
| `trim` (the lead decision read literally) | **none** | **1.8 dB** | **−26.1 dBFS, FAIL** | −26.0 | sound and picture both at 0, both exactly 15.000 s |

Why `trim` must click:
- An AAC decoder rebuilds each frame by overlap-adding it with the previous frame (MDCT time-domain aliasing cancellation).
- A stream's first frame has no predecessor, so it can only come out as w·(w·u − J(w·u)): a fade-in with a time-reversed bleed. No encoder input can make it equal the true signal.
- The least-squares best possible first frame is exactly that partial reconstruction.
- Every MP4 encoder therefore primes the stream and skips the priming with an edit list. Without one, the partial frame plays at t = 0, which is the loop seam.

Measured with the farm's own mux on T01: G-AUDIO fails `seamStep` at −26.08 dBFS (`fu5/renders/t01-trim/qa-remux/report.json`). The same remux in `priming` mode passes at −86.0 (`fu5/renders/t01-final/qa-remux/report.json`).

**What the default does:**
- **No pre-roll.** The pre-roll is dropped from the bitstream (FU-2). The only sound edit is the codec priming, presenting exactly D.
- **No picture offset.** x264's 2-frame B-frame delay is written as negative composition offsets (`-movflags +negative_cts_offsets`) instead of an edit list, so a player that ignores edit lists shows frame 0 at t = 0.
  - With the approved master's layout such a player showed the picture 66.7 ms late, so the sound ran 45 ms early. That is at the edge of what viewers notice.
  - It now runs 21.3 ms late, inside every lip-sync tolerance.
  - The video bytes are unchanged (stream copy).
- **The sound media is physically priming + D.** Its last packet is trimmed in `stts`, as in the approved master (721,024 samples). With edit lists ignored, the audio reads 15.021 s against the video's 15.000 s: only the priming differs.
- **T01's AAC stream is the approved master's, bit for bit** (`5775b82c…`). The only container change is the picture's edit, from `[[15000,1024]]` to `[[15000,0]]`.

**`--audio-edit trim`** (`hm render`, `hm remux`) delivers the literal decision:
- no edit list on any track;
- the sound starting at t = 0 and lasting exactly D with `-ignore_editlist`;
- the last packet trimmed in `stts` (setts bitstream filter);
- one frame more dropped from the bitstream.

The QA gate fails it on every loop that is not silent at the seam. Choosing it is the owner's call (open issue 1).

**The delivery gate** gains a `timing` check:
- the sound may carry the codec priming (at most 2,112 samples, Apple's) presenting the film, and nothing more. WP-04's 1.02 s pre-roll fails.
- a picture offset warns.

The approved v2 passes with a warning (its 66.7 ms picture offset). Every new farm render passes.

### 5. `hm remux` writes a provenance stamp G-FINAL:delivery accepts

`cli/commands/remux.mjs`, `render/remux.mjs` (new), `render/lib/provenance.mjs`, `qa/gates/delivery.mjs`, plus a `stamp` hook in `audio/score-cli.mjs` `remux()`.

- **The stamp.** One grammar for every stamp: `parseStamp()` and `remuxStamp()` in `render/lib/provenance.mjs`, used by the farm, remux and QA. A remux of a farm render is stamped `<the render's farm stamp> remux <key12>`. A re-remux replaces the remux part.
- **The key.** It hashes what decides the new file: the farm job, the picture's H.264 stream, the sound slots, the fixes and the audio edit. The same remux therefore always gets the same stamp.
- **The record** (`hm-remux/1`) holds:
  - the key;
  - the picture kept: file, sha256 and H.264 stream sha256;
  - the slots, the fixes and the audio edit;
  - the score files;
  - the output's sha256 and the stamp.
- **Where it is written.**
  - In place: into `provenance.json`, which then describes the new `final.mp4`; `replaced` records the old file, and `remuxHistory` lists every remux.
  - Out of place: into `provenance.remux.json`, with **`qa-remux.json`**, a ready `hm-qa-target/1` manifest for `final.remux.mp4`.
- **G-FINAL:delivery** accepts a remux stamp only when all of these hold:
  - the provenance names the same job;
  - it describes this exact file;
  - its remux record has the stamp's key and this file's sha256;
  - the file's H.264 stream equals the stream the remux kept **and** the farm's recorded `videoStream`. The picture is re-hashed by QA: about 1 s, a stream copy.

  WP-04's free-form `… | remux {json}` stamp stays refused. A source that is not a farm render with provenance keeps the old stamp, and `hm remux` says that QA cannot verify it.

### 6. Composed jobs carry `spec.json` (and `direction.json`)

`render/farm.mjs` `composedInputs()`. A registry entry whose source is a direction JSON is a composed direction. For one, the farm:
- finds the spec it was compiled from, beside it: `<name>.json` for `<name>.direction.json`, or `spec.json`;
- accepts it only if its id and fingerprint are the ones `meta.spec` and `meta.fingerprint` name;
- copies both into the job directory, recording `job.inputs`.

`hm qa <job>` is then complete. A composed direction without a matching spec renders with a warning (G-SPEC would not run).

T01's own spec is the golden **review** spec (`internal: true`). QA therefore requires its INTERNAL mark, and the acceptance render carries it (`--mark INTERNAL`). The M0 audit had judged T01 against the production twin through a hand-made manifest.

### 7. Atomic stale-lock reclaim, and the "only one can win" test

`render/segment.mjs`. WP-01's reclaim renamed whatever sat at the lock path aside. A reclaimer that had judged a dead owner's lock could therefore move away the fresh lock another reclaimer had just created, and both rendered the segment.

Now a lock is removed only inside `<lock>.reclaim`, a section entered with O_EXCL and held for microseconds, and only if the file is still exactly the lock that was judged: same inode, same text. A live lock is never removed. Of any number of reclaimers exactly one ends up holding the lock, because the O_EXCL create after the removal decides. `releaseLock` uses the same section.

A section left behind by a process that died inside it (owner gone, or silent for 10 s) is cleared: moved aside, checked to be the one judged, and restored otherwise.

Tests (`tests/unit/farm-segment.test.mjs`):
- the deterministic interleaving: A judges a dead lock, B reclaims it and takes the segment, then A continues;
- **8 processes reclaiming the same stale lock at the same instant, 12 rounds**;
- a dead reclaim section.

The same race against WP-01's `segment.mjs` (HEAD) and FU-5's, 20 rounds each (`fu5/oldseg/race.mjs`):

| | interleaving | rounds without exactly one winner |
|---|---|---|
| WP-01 (HEAD) | **both A and B hold the lock** | **12 of 20** (up to 3 winners) |
| FU-5 | B holds it, A gets none | 0 of 20 |

The test keeps every winner alive until the round ends. A winner that exits leaves a lock that is legitimately stale. The first version of the test missed that, and the FU-5 code then showed one 2-winner round, which turned out to be correct behaviour.

### 8. Odd output sizes are refused before anything renders

`jobParams()` checks the output size, design size × scale, and refuses an odd width or height: yuv420p halves the chroma planes. `renderMany` validates every job's parameters before preflight and before a browser starts, so no job directory is created.

```
hm render dev/text-a --scale 0.21  →  hm render: output size 227x403 (1080x1920 at scale 0.21): yuv420p needs an even width and height; choose another --scale or design size
```

### 9. Magnification of the glass-card text rasters

`engine/runtime/asset-log.js`, plus one call each in `engine/renderer/index.js` (`assetLog.bind`) and `engine/renderer/passes/glass.js` (`assetLog.glassMagnification`). These are logging only: no pixel changes.

The card's text texture spans the card's rect, `2·hw × 2·hh` local px (GLASS_FS). Its magnification per axis is `scale · squash · camera zoom · render scale · (2·hw or 2·hh) / texture px`, the larger axis, at every glass draw. T01 final: `text:b0` 0.539, `text:b1` 0.560, `text:b2` 0.573 (WP-01 logged `null`). The art rasters stay at 0.869.

### 10. `hm doctor` takes the heavy lock

The engine-frame check (Chromium, WebGL2, one frame through the sink) runs under a shared slot. `hm doctor` reports who holds the machine before it asks, and waits behind an exclusive job instead of disturbing it.

### 11. Fault fixtures for the nine gates that had none

`qa/fixtures/fixtures.json`, `build.mjs`, `make_fixtures.py`, `run-fixtures.mjs`. Each is the approved v2 with exactly one fault and must fail exactly its own gate.

| Fixture | Gate (check) | Fault |
|---|---|---|
| `moov-at-end` | G-FINAL:delivery (`faststart`) | the master remuxed without faststart (container only) |
| `foreign-frame-hashes` | G-FINAL:determinism (`frames`) | the render record lists frame hashes the direction does not reproduce; `render: true` makes the runner re-render it |
| `unlisted-asset` | G-FINAL:allowlist (`assets`) | the asset log has the Mallow art served with a hash on no allowlist |
| `camouflaged-mallow` | G-FINAL:figure-ground (`contrast`) | a ring 2–44 px around the Mallow painted in its own mean colour |
| `foreign-realm` | G-FINAL:realm-likeness (`likeness`) | everything but the Mallow, its cards, text and logo hue-rotated 150° (Lab, lightness kept) |
| `washed-out-text` | G-DRAFT:readability (`overlay`) | the overlay rows washed out to 15 % contrast while readable |
| `ballooning-cards` | G-DRAFT:layout (`propCoverFace`) | the thought cards balloon about 2.4× as their words fade (direction only). Chosen so that only the frames where neither QA nor G-DIR reads the cards change. |
| `unemitted-cue` | G-DIR (`audio:unemitted`) | M-ORBIT's `wince` cue removed from the direction |
| `subframe-flood` | G-COST (`cost:budget`) | 16 sub-frames on every frame |

Now every one of the 18 gates has at least one fixture (unit test). The direction-only faults were tuned against the gates in Node (`fu5/fx/tune.mjs`) and are pinned by `tests/unit/qa-fixtures.test.mjs`. The full suite result is in "Acceptance".

### 12. T01 re-rendered through the composer at the final profile

`hm render composer/t01-v2 --profile final --mark INTERNAL --workers 1`, timed under the exclusive lock (`fu5/logs/t01-final.log`):

| | FU-5 | M0 audit (QP 15 farm) |
|---|---|---|
| wall clock, 15 s, 1 worker | **549.3 s (9.15 min)** | 521.6 s; earlier runs of the same work 572.1 and 651.1 s |
| render segments | **452.5 s** (99.3 + 143.0 + 93.9 + 65.6 + 50.7) | 481.7 s |
| join | **master pass + preview picture 78.1 s** | concat about 1 s, then the preview 22.7 s |
| video stream | **34.06 MB** (the approved master: 34.22 MB) | 46.1 MB |
| preview | 7.4 MB | 9.8 MB |
| PSNR-Y against the approved master, outside the INTERNAL mark | 44.28 dB | 44.22 dB |

- The lossless intermediates took 29 s off the segments. The master pass added 78 s.
- Net, this run took 27.7 s longer than the M0 audit's single run. The M0 audit saw a 130 s spread between runs of identical work.
- The limit is 12 min (it holds); the stretch is 9 min (missed by 9 s in this run).
- The master is the approved master's size and quality (CRF 16 rather than QP 15's +35 %), as Q4(b) asked.

QA on the job directory as the farm left it, with no manifest: **PASS, 18/18 gates, complete** (25.5 s).

The same pipeline at the exact profile (`fu5/t01-exact.sh`) reproduces the approved master bit for bit:
- 450/450 frame hashes equal the sequential golden;
- H.264 stream `bd761d96…`, the approved master's;
- AAC `5775b82c…`, the approved master's.

The wall time was 1,354 s with 2 workers, on a machine shared with other agents' test runs. The remux of the same job (hm-score) passes 18/18 too, through its generated `qa-remux.json`, with delivery verifying the remux stamp.

## Acceptance

Every command ran inside the write jail, `hm` confining itself or `node render/lib/write-jail.mjs -- …`. Heavy runs held the lock.

| # | Criterion (FU-5 scope) | Command | Measured | Met |
|---|---|---|---|---|
| 1 | **Q4(b): segments to a near-lossless intermediate, one CRF 16 x264 pass over the joined frames, size ≈ the approved master** | `node render/lib/heavy-lock.mjs --exclusive -- fu5/t01-final.sh` (= `hm render composer/t01-v2 --profile final --mark INTERNAL --workers 1`) | 5 lossless segments, then `master pass (crf16) over 5 lossless segment(s) in 78.1 s`: 450/450 frames, 0 decode errors, an IDR every 30 frames. **Video stream 34.06 MB; the approved master's 34.22 MB** (QP 15 farm: 46.1 MB). | yes |
| 1a | The master equals a single pass however the film is segmented | `node --test tests/unit/farm-encode.test.mjs` (test 7); `node --test tests/golden/farm.test.mjs` (test 1, `--tee-single-pass`) | 75 grainy frames in segments of 30/20/25: the joined lossless segments decode to the converted frames bit for bit, and the master's H.264 stream equals the single pass's. Farm: `verify.singlePass.h264Identical: true`, 30/30 frames identical | yes |
| 1b | The master pass is the approved render's encoder | `fu5/t01-exact.sh` (= `hm render composer/t01-v2 --profile exact --workers 2`, then H.264/AAC stream hashes) | 450/450 frame hashes equal the sequential golden. **H.264 stream `bd761d96…` = the approved master's, bit for bit; AAC `5775b82c…` = the approved master's.** 1,354 s on a loaded machine (other agents' test runs) | yes |
| 2 | **Preview CRF 20, at most 15 MB** | the T01 render; `node --test tests/unit/render-mux.test.mjs` (test 7) | T01 `preview.mp4` **7.42 MB** at CRF 20, from the lossless frames (46.48 dB against the source on the bench frames, against 46.10 dB from the master). Over the limit, it is re-encoded at CRF 22 then 24, and `withinLimit: false` is reported if it is still over (tested) | yes |
| 3 | **Remove the audio edit list: the circular score trimmed physically so audio starts at t = 0; with `-ignore_editlist`, audio duration = video duration** | `hm remux fu5/renders/t01-trim --audio-edit trim …`; `ffprobe -ignore_editlist 1 …`; `hm qa …/qa-remux.json`; `tests/unit/render-mux.test.mjs` test 4 | **Implemented as `--audio-edit trim`**: no edit list on any track, sound at lag 0 from t = 0, and with `-ignore_editlist` **audio 15.000 s = video 15.000 s**. It is **not the default**, because it makes every loop click: G-AUDIO `seamStep` −26.08 dBFS FAIL, against −86.0 dBFS with the priming edit (section 4, deviation 1). The default delivers no pre-roll, no picture offset and the sound media physically priming + D (audio 15.021 s against 15.000 s with edit lists ignored). | **partly (owner decision, open issue 1)** |
| 4 | **`DEFAULT_PROFILE = 'final'`** | `node --test tests/unit/perf-tools.test.mjs` | `DEFAULT_PROFILE` `final` and `PAGE_PROFILE` `exact`; `jobParams({direction})` → profile final, `lossless` + `crf16`; the farm puts `&profile=final` in the page URL; goldens and parity unchanged (see "Suites") | yes |
| 5 | **`hm remux` writes a provenance stamp G-FINAL:delivery accepts** | `hm remux fu5/renders/t01-final --contour rise-1 --tick-tempo 1.08 --pan-seed 7`; `hm qa fu5/renders/t01-final/qa-remux.json`; `node --test tests/unit/remux-stamp.test.mjs` | stamp `… job ad0101c7d222 remux 00fa47ba49aa`; **QA PASS, 18/18 gates**. Delivery: "remux 00fa47ba49aa keeps the farm's picture (H.264 stream eebf2e8c28c4 = the farm record) with a new score". G-AUDIO passes with the −60 dBFS limit. The unit test refuses: a missing record, a wrong key, a swapped picture, a stale record, and WP-04's free-form stamp. Remux 10.2 s | yes |
| 6 | **The farm writes spec.json into composed jobs' directories, so hm qa is complete** | `hm render composer/t01-v2 …`; `hm qa fu5/renders/t01-final` (the job directory, no manifest); `tests/unit/farm-worker.test.mjs` test 8 | `job.inputs`: `direction.json` ← `specs/golden/t01-v2.direction.json`, `spec.json` ← `specs/golden/t01-v2.json` (fingerprint `sha256:076e81ef…` checked). **QA PASS, 18/18 gates, status complete** (M0 audit: INCOMPLETE, "no spec") | yes |
| 7 | **Atomic stale-lock reclaim, and the missing "only one can win" test** | `node --test tests/unit/farm-segment.test.mjs` (tests 11–13); `fu5/oldseg/race.mjs` against HEAD and FU-5 | 13/13 pass. 8 processes, 12 rounds: exactly one winner each round, and the lock on disk is the winner's. Against WP-01's code the same race had **12 of 20 rounds without exactly one winner** and the interleaving left two holders; FU-5: 0 of 20, one holder | yes |
| 8 | **Refuse odd output sizes at compile** | `hm render dev/text-a --scale 0.21`; `tests/golden/farm.test.mjs` test 3; `tests/unit/perf-tools.test.mjs` | exit 1, `output size 227x403 (1080x1920 at scale 0.21): yuv420p needs an even width and height`, before preflight and before any browser starts; no job directory is created | yes |
| 9 | **Log magnification for glass text rasters** | the T01 render, `provenance.json assets.rasters` | `text:b0` 0.539, `text:b1` 0.560, `text:b2` 0.573 (WP-01: `null`); art 0.869, logo 0.240. At scale 0.25: 0.115–0.126 (it scales with the render) | yes |
| 10 | **`hm doctor` takes the heavy lock** | `node cli/hm.mjs doctor` (while another agent's `hm test parity` held a slot) | `heavy lock busy: shared pid 14166 "node cli/hm.mjs test parity" (doctor waits for a shared slot)`, then `engine frame … (under the heavy lock: shared slot)`; all checks ok | yes |
| 11 | **Fault fixtures for every gate that had none, each failing exactly its own gate** | `node cli/hm.mjs qa fixtures --build` (`fu5/logs/fixtures-build.log`); `node --test tests/unit/qa-fixtures.test.mjs` | **26/26 fixtures fail exactly their own gate, and v2 passes** (627 s; 1,847 s with every media rebuilt). The nine new ones and their measured values: delivery `faststart` (atoms ftyp, free, mdat); determinism `frames` (134, 257, 273 differ); allowlist `assets` (`noomi-clean.png`); figure-ground `contrast` (dE 1.89 < 8); realm-likeness `likeness` (21.7 > 14); readability `overlay` (1.54:1 < 4.5); layout `propCoverFace` (30.5 % > 8 %); G-DIR `audio:unemitted`; G-COST `cost:budget` (18.6 > 11 min). The unit test confirms every one of the 18 gates has a fixture | yes |
| 12 | **T01 re-rendered via the composer at the final profile passes every gate with the new master and audio** | `hm qa fu5/renders/t01-final` | **PASS, 18/18 gates** (25.5 s): determinism re-renders frames identically at the final profile, delivery `timing` passes (no picture offset, the priming only), G-AUDIO passes (soundtrack-v2, legacy seam warn). AAC bit-identical to the approved master's. Wall 549.3 s (12-min limit; the 9-min stretch missed by 9 s in this run) | yes |
| – | The frozen v2 byte-identical; the golden T01 at exact parity | `node cli/hm.mjs guard` (frozen and app checks); 1b above; "Suites" | frozen v2 ok (tree `8d0627dfee6d`, local `9a740db17b29`); live app untouched; exact render 450/450 = the sequential golden | yes |

### Suites

| Command | Result |
|---|---|
| `node cli/hm.mjs test unit` | **424/424 pass**. It includes the new `render-mux` (7), `remux-stamp` (2) and `qa-fixtures` (3) tests and the extended `farm-encode`, `farm-segment`, `farm-worker` and `perf-tools` tests. The wall time, 1,247 s, was inflated by the concurrent exact render and another agent's `hm test` run |
| `node cli/hm.mjs test guard parity property` | **192 pass, 1 skipped, 1 fail.** The skip is the opt-in 25-min sequential render. The one failure is the write audit, flagging only `/home/user/thinkstill-rituals/.git/info/exclude` written at 01:26:53Z by the workflow orchestrator, before this session (FU-4's report has the same finding). Passing among them: the parity tests (G-STATE through the composer and on the engine, max \|Δ\| 0; 4 composer golden frames cold, bit-identical); `engine/ and composer/ contain no wall-clock or unseeded-randomness reads` (the asset-log and glass changes included); the frozen and app guards; property 1k/10k |
| `node cli/hm.mjs golden verify` | ok: all committed golden files and 16 PNGs; pixel tolerance 0/255, state tolerance 1e-9 |
| `node cli/hm.mjs test golden` | **15 pass, 1 skipped** (the fixtures opt-in, run separately above, 26/26). Among them: G-PIXEL final vs exact (16 goldens, ≥ 45 dB, face SSIM); the feature matrix; the 16 engine goldens through the binary readback; readback ≤ 60 ms; the farm (master pass vs tee, qp15 concat, kill -9 and resume, the odd-size refusal, the watchdog); v2 passes every QA gate |
| `node cli/hm.mjs guard` | frozen v2 ok (tree `8d0627dfee6d`, local `9a740db17b29`); live app untouched; no repository changes outside the studio; the write audit is red only for the orchestrator's `.git/info/exclude` (integrator note 5). Nothing FU-5 wrote is flagged: scratch is under `/home/user/hm-work/fu5/` |
| `git diff --stat v2-approved -- <every frozen path> ../hushmallow` | only `output/v2/my-brain-at-2am-v2.preview.mp4`, which `451caf0` added in Phase 1 and which is hash-locked (as in the M0 audit) |
| `node cli/hm.mjs qa v2 --no-render` | PASS for every gate it ran; delivery `timing` warns on the approved master's 66.7 ms picture offset, as designed |

## Open issues

1. **Owner decision: how the AAC priming is delivered.** `priming` (default: seamless loops; 21.3 ms late only in players that ignore edit lists) or `trim` (the lead decision read literally: no edit lists, sound at t = 0 everywhere, a −26 dBFS click at every loop). The measurements are in section 4. No AAC encoding can have both; a lossless audio codec could, but no upload pipeline is known to accept it reliably.
2. **Render time.** The master pass adds 78 s (master and preview from one decode); the lossless intermediates give back about 29 s of segment time.
   - Overlapping the master with rendering would not pay. The machine is CPU-bound: removing 93 CPU-seconds of segment encoding during the render saved only 29 s of wall time, and the master pass needs about 250 CPU-seconds.
   - The remaining levers change pictures (a faster master preset) or the preview (preset faster). They are not taken without the owner.
3. **Disk.** Lossless intermediates take about 74 MB per 90-frame segment, 0.35–0.5 GB per 15 s job (more with grain-heavy realms), until the master pass deletes them. A batch with several jobs in flight needs that much more headroom above the farm's 3 GB floor.
4. **Signed composition offsets.** These are ctts version 1, used for the picture instead of the B-frame delay edit. ISO BMFF has had them since 2012, and ffmpeg, Chromium, AVFoundation and ExoPlayer read them. A very old player could mistime the first frames. If an upload pipeline ever rejects them, `render/mux.mjs` can drop the flag; the video bytes are the same.
5. **The crash-loss guarantee** stays as WP-01 restated it: a kill loses at most the segment each worker held. With a master pass, a kill during that pass (78 s) redoes the pass, not any segment, because the segments are kept until it succeeds.

## Files

**Changed (FU-5's own):**
- `render/encode.mjs`: the `lossless` and `crf16` encoders, `encodeMaster`, `h264StreamSha256`, `PREVIEW_MAX_BYTES`, per-encoder profile, level, tune and threads;
- `render/farm.mjs`: params with the master, odd-size refusal, `composedInputs` and job inputs, the master-pass `encodeVideo`, `makePreview`, `finishJob` provenance (`master`, `videoStream`, `delivery`, `preview`), `audioEdit`;
- `render/worker.mjs`: the tee is the master's single pass;
- `render/mux.mjs`: `AUDIO_EDIT_*`, `deliveryTiming`, `muxJob` with no picture offset, the preview path and a delivery record;
- `render/segment.mjs`: `withReclaim`, the atomic `lockFile`, `releaseLock` in the section;
- `render/lib/provenance.mjs`: `STAMP_RE`, `parseStamp`, `remuxStamp`;
- `engine/runtime/asset-log.js`: `bind`, `glassMagnification`;
- `cli/commands/render.mjs`: `--master`, `--audio-edit`, usage;
- `cli/commands/remux.mjs`: the provenance stamp and record, `--audio-edit`;
- `cli/commands/doctor.mjs`: the heavy lock;
- `qa/gates/delivery.mjs`: `parseStamp`, the remux branch, the `timing` check;
- `qa/fixtures/fixtures.json`, `build.mjs`, `make_fixtures.py`, `run-fixtures.mjs`: nine fixtures; direction, provenance and swap-asset ops; the ring-fill, world-hue, fade-text and remux media ops; per-fixture `render`.

**New:**
- `render/remux.mjs`: the remux record and the QA manifest;
- `tests/unit/render-mux.test.mjs` (7);
- `tests/unit/remux-stamp.test.mjs` (2);
- `tests/unit/qa-fixtures.test.mjs` (3);
- `docs/wp/FU-5.md`.

**Changed outside FU-5's list, minimally (deviation 2):**
- `engine/render/profiles.js`: `DEFAULT_PROFILE`, `PAGE_PROFILE`, the `master` field;
- `engine/renderer/index.js`: one `assetLog.bind` line;
- `engine/renderer/passes/glass.js`: an import and one `assetLog.glassMagnification` call;
- `audio/loop-aac.mjs`: the `edit` and `circular` options, `silenceExtended`, `assertDelivery`, no picture offset, the last packet trimmed in stts;
- `audio/score-cli.mjs` `remux()`: the `stamp` and `audioEdit` options, no picture offset;
- `docs/QA.md`: targets, G-FINAL:delivery `timing` and remux stamps, the fixture table.

**Tests updated:**
- `tests/unit/farm-encode.test.mjs`: lossless and master arguments; the master pass equals the single pass;
- `tests/unit/farm-segment.test.mjs`: interleaving, the 8-process race, the dead section;
- `tests/unit/farm-worker.test.mjs`: profile in the URL, golden params, `composedInputs`;
- `tests/unit/perf-tools.test.mjs`: defaults, master, odd sizes;
- `tests/golden/farm.test.mjs`: master pass vs tee, the qp15 concat path, the odd-size refusal.

**Unchanged:**
- the frozen v2 (`render/render.mjs`, `render/verify.mjs` and the rest);
- `../hushmallow`;
- `cli/commands/status.mjs`: it already reads the job states;
- `qa/gates/thresholds.json`: no threshold moved.

## Deviations

1. **The audio edit list is kept by default (`priming`). The literal "no edit lists" is opt-in (`--audio-edit trim`).** The scope says "remove the audio edit list: the circular score is trimmed physically so audio starts at t = 0 (verify with -ignore_editlist decode: audio duration = video duration)".
   - **Implemented:** `trim` does exactly that, and `tests/unit/render-mux.test.mjs` test 4 checks it: no edit list, and with `-ignore_editlist` audio 2.000 s = video 2.000 s at lag 0 (T01: 15.000 = 15.000).
   - **Measured:** AAC cannot reconstruct the first frame of a stream without its predecessor. Every loop then clicks at −26 dBFS, G-AUDIO fails every hm-score video, and the first 21 ms of every score come back at about 2 dB SNR (section 4). That contradicts the owner's own requirements for this batch, a seamless loop in every video and automatic detection of weak loops.
   - **The default instead removes every offset that costs nothing:**
     - no pre-roll (FU-2);
     - no picture offset (new: in a player that ignores edit lists the sound is no longer 45 ms early);
     - the sound media physically priming + D;
     - only the codec priming kept, as in the approved master.
   - The lead's reason for the decision, "pipelines that ignore edit lists would play the score 1 s late", is fully resolved: 21.3 ms, the same as the approved master.
   - Switching is one flag, or `AUDIO_EDIT_DEFAULT` in `render/mux.mjs`. Open issue 1 asks the owner.
2. **Files outside FU-5's list.**
   - `DEFAULT_PROFILE` lives in `engine/render/profiles.js`.
   - The glass draws happen in `engine/renderer/passes/glass.js`, and the texture creation in `engine/renderer/index.js`. Both are logging lines, with no pixel effect: the engine tree hash changes, the frames do not.
   - The edit-list work has to live where the loop is encoded (`audio/loop-aac.mjs`), and the remux stamp is written inside `audio/score-cli.mjs` `remux()`. FU-2, which owns `audio/**`, had finished; the changes are additive options with unchanged defaults, except the picture offset and the stts trim.
   - `docs/QA.md` documents the gate and fixtures this package changed.
3. **The intermediate is lossless, not "near-lossless".** It is lossless x264 (QP 0), because lossless makes the master provably equal to a single pass and costs less CPU than near-lossless QP 4 (1.2 s vs 5.0 s per segment). The price is disk: about 74 MB per 90-frame segment on T01 frames, 0.35–0.5 GB per 15 s job, deleted after the master pass.
4. **The T01 acceptance render carries the INTERNAL mark.** The farm now puts T01's own spec in the job directory, and that spec is the golden review spec (`internal: true`), whose renders QA requires to be marked. Outside the mark, PSNR against the approved master is the M0 audit's (44.28 vs 44.22 dB).
5. **In `priming` mode the picture keeps an identity edit `[[D, 0]]`.** ffmpeg writes edit boxes for every track once any track needs one. An identity edit has no offset, so a player that ignores it shows the same thing. `trim` mode writes none.

## Integrator notes

1. **`docs/OWNER-DECISIONS.md`.**
   - **Q4:** implemented (FU-5). Lossless segment intermediates and one CRF 16 master pass with the approved render's arguments. T01 master 34.06 MB, the approved master 34.22 MB.
   - **Audio pre-roll:** please add, for the owner's M1 review, "measured (FU-5): a file with no edit list clicks at every loop (AAC's first frame); default kept at the standard priming edit (seamless, as the approved master), with every other offset removed; `--audio-edit trim` delivers the literal decision".
2. **`docs/CONVENTIONS.md` §4.**
   - WP-01/WP-02 line: "`hm render --profile final|exact|draft` (default final since FU-5; `--audio-edit priming|trim`, `--master crf16`)".
   - WP-04 line: "`hm remux` stamps `<farm stamp> remux <key12>` and writes `provenance.remux.json` and `qa-remux.json` (FU-5)".
3. **`composer/cost.js` (G-COST).** FU-4 fitted the final model's overhead (44.8 s) on the QP 15 farm. With the master pass, T01's overhead is 96.8 s (549.3 − 452.5 s of segment time), and segment time fell about 6 %. WP-15's refit should use FU-5 renders.
4. **`docs/M0-REPORT.md` §9 item 6 and §10:** the stale-lock reclaim, glass magnification, odd sizes, the doctor lock, the remux stamp, and spec.json in composed jobs are closed. The crash-loss guarantee (at most one segment *per worker*) is unchanged and stated as such in `render/farm.mjs`.
5. **`hm guard`** is red only for the orchestrator's `.git/info/exclude` write at 01:26:53Z (also in FU-4's report). Re-arm after review.
