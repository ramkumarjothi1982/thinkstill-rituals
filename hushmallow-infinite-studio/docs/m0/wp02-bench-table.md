# WP-02 benchmark table (M0 gate)

The performance pass on *My Brain at 2 AM* v2: 15 s, 450 frames, 1080×1920, on 4 CPU cores with SwiftShader (no GPU).

## Farm wall clock (the acceptance numbers)

Each render used 1 worker under the exclusive heavy lock, except `exact-1` and `exact-2`, which used 2 workers. The wall clock covers everything: compile, render, master encode (x264 QP 15, running alongside the render), score, mux and preview.

| Render | Profile | Code | Wall clock | Segments (render) | Notes |
|---|---|---|---|---|---|
| `final-1` | final | P2–P8 (`9708a32` + draft/proof) | 758.6 s (12.64 min) | 674.0 s | preview transcode ~64 s; over the 12 min limit, so P4b, P5b and the preview preset followed |
| `final-2` | final | all steps, round 1 (`db877bc`) | 607.0 s (10.12 min) | 562.2 s | preview ~23 s |
| `final-3` | final | round 2 HEAD (`93ea10b`) | 651.1 s (10.85 min) | 604.4 s | a slow period of the machine (see the benches below) |
| `final-4` | final | round 2 HEAD (engine of `93ea10b`) | **572.1 s (9.54 min)** | 526.8 s | video stream byte-identical to `final-3` |
| `draft-1` | draft | round 1 | 95.1 s | 84.0 s | 540×960, 450 sub-frames |
| `draft-2` | draft | round 2 HEAD | **88.7 s** | 79.4 s | 540×960, 450 sub-frames |
| `proof-2` | proof | round 1 | 14.7 s | — | 6 stills, page setup included |
| `proof-3` | proof | round 2 HEAD | **13.3 s** | — | |
| `exact-1` | exact | round 1 | 1359.6 s | — | **2 workers**; 450/450 frames identical to `qa/golden/v2/sequential-frames.json` |
| `exact-2` | exact | round 2 HEAD | 1341.2 s | — | **2 workers**; 450/450 identical; video stream byte-identical to `exact-1` |

The exact profile's single-worker figure is the P1 `hm bench` number: 24.73 min, without the encoder.

## `hm bench` per step

Each row is the median of 3 runs under the exclusive lock. Columns:

- **ms/frame:** render plus binary readback, measured as a worker.
- **Film figure:** ms/frame × 450.
- **Pass columns:** the fenced per-pass split, in ms per frame.

The sample is 6 windows of 8 consecutive frames. Since P6 it holds 3.08 sub-frames per frame, while the film averages 3.58, so the film figure reads 15–20 % below the farm. The farm render is the number that counts.

| step | ms/frame | ms/sub-frame | sub-frames (sample) | 15 s film | vs previous | runs (ms/frame) | face.draw | face.upload | world | sub.reflection | sub.composite | sub.glass | sub.mesh | accum | composite | bloom | post | overlay.upload | state |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 baseline (exact) | 3297.3 | 753.7 | 210 | 1483.8 s (24.73 min) | — | 3297 / 3172 / 3457 | 935.6 | 233.9 | 843.8 | 435.4 | 668.2 | 152.9 | 336.6 | 236.9 | — | 44.8 | 93.1 | 13 | 1.4 |
| P2 overlaySkip | 3313 | 757.3 | 210 | 1490.9 s (24.85 min) | 0.5 % | 3875 / 3313 / 3299 | 922.4 | 231.5 | 861.2 | 427 | 643.3 | 145.3 | 329.4 | 236.7 | — | 45.3 | 88.3 | 6.8 | 1.2 |
| P3 faceCache | 2845.3 | 650.4 | 210 | 1280.4 s (21.34 min) | -14.1 % | 2845 / 2967 / 2837 | 246.6 | 51.7 | 812.7 | 427 | 630.6 | 147.7 | 329 | 225.4 | — | 41.7 | 84.3 | 7 | 1.2 |
| P3b faceFastGlow | 2693.3 | 615.6 | 210 | 1212 s (20.2 min) | -5.3 % | 3529 / 2622 / 2693 | 16.8 | 20.4 | 788.7 | 414.1 | 610.3 | 140.5 | 343.2 | 213.1 | — | 41.6 | 84.1 | 7.2 | 1.3 |
| P4 worldFast | 2211.9 | 505.6 | 210 | 995.3 s (16.59 min) | -17.9 % | 2266 / 2171 / 2212 | 16.6 | 19.9 | 369.2 | 404.8 | 606.6 | 140.6 | 338.4 | 213.7 | — | 40.8 | 80.6 | 6.8 | 1.1 |
| P5 fgAccum | 1552.3 | 354.8 | 210 | 698.5 s (11.64 min) | -29.8 % | 1552 / 1552 / 1679 | 17.3 | 21.1 | 381.4 | 117.5 | 156.6 | 150.8 | 345.6 | 138 | 29.7 | 42.2 | 83.4 | 6.7 | 1.1 |
| P6 adaptiveFloor | 1400.3 | 454.2 | 148 | 630.2 s (10.5 min) | -9.8 % | 1367 / 1412 / 1400 | 17.3 | 20.7 | 387.9 | 86.6 | 121.4 | 134.8 | 249.4 | 107.5 | 30.4 | 44.1 | 86.7 | 6.6 | 6.6 |
| P7 meshNormalTex | 1248.4 | 404.9 | 148 | 561.8 s (9.36 min) | -10.9 % | 1248 / 1236 / 1287 | 16.5 | 20.2 | 366.4 | 78.2 | 109.2 | 121.5 | 190.7 | 94.6 | 28.1 | 40 | 83.8 | 6.7 | 6.3 |
| P8 candidate flags (not adopted) | 1301.6 | 422.1 | 148 | 585.7 s (9.76 min) | 4.3 % | 1383 / 1290 / 1302 | 16 | 20 | 367.1 | 78.6 | 108 | 121.9 | 189.5 | 96.3 | 27.9 | 40.9 | 81.5 | 6.5 | 6.6 |
| P8 engine flags (re-run of P7 code) | 1290.4 | 418.5 | 148 | 580.7 s (9.68 min) | -0.9 % | 1290 / 1258 / 1306 | 17 | 20.1 | 364.1 | 79.2 | 111.8 | 127.3 | 195.4 | 100.2 | 27.8 | 40.8 | 79.4 | 6.5 | 6.1 |
| P4b worldPasses | 1147.6 | 372.2 | 148 | 516.4 s (8.61 min) | -11.1 % | 1158 / 1141 / 1148 | 17.2 | 21.8 | 181.2 | 82.5 | 116.2 | 133.6 | 201.2 | 104.8 | 29.4 | 43.4 | 88 | 7.1 | 7 |
| P5b tightPasses | 1032.8 | 335 | 148 | 464.8 s (7.75 min) | -10.0 % | 1027 / 1033 / 1060 | 18.8 | 22 | 187.5 | 54.3 | 118.8 | 68.9 | 211.2 | 91.2 | 32.1 | 45.2 | 90.8 | 7.1 | 7.1 |
| round 2: HEAD 93ea10b, run A (14:22) | 1070.9 | 347.3 | 148 | 481.9 s (8.03 min) | 3.7 % | 1072 / 1071 / 1054 | 17.5 | 20.8 | 186.5 | 52.9 | 119.9 | 69.5 | 203.5 | 93.6 | 30.6 | 44.5 | 89.8 | 6.9 | 5.9 |
| round 2: round 1 tip 9a3a111 re-run (15:10) | 1021.5 | 331.3 | 148 | 459.7 s (7.66 min) | -4.6 % | 1022 / 1082 / 1019 | 17.7 | 21.7 | 187 | 51.3 | 120.3 | 69.3 | 204.4 | 93.6 | 31.1 | 43.8 | 91.3 | 6.8 | 6.8 |
| round 2: HEAD 93ea10b, run B (15:16) | 1006.8 | 326.5 | 148 | 453.1 s (7.55 min) | -1.4 % | 1007 / 1019 / 997 | 18.2 | 21 | 183 | 48.8 | 112.5 | 63.1 | 200 | 84.2 | 29 | 42.1 | 84.9 | 6.6 | 5.7 |

Notes on particular rows:

- **`P8 candidate flags`** is the three neutral flags combined (`--num-raster-threads=4 --disable-gpu-driver-bug-workarounds --use-cmd-decoder=passthrough`). It is not adopted: it is no faster than the engine flags beyond run-to-run noise.
- **The three round-2 rows** were measured on the same day. Round 2's fixes change no render work outside the 21 rest frames.
  - Run A of HEAD fell in a slow period of the machine, the same period as `final-3`.
  - Round 1's tip re-run and HEAD's run B, measured back to back, agree within noise (1021.5 against 1006.8 ms/frame).

Sources:

- Results: `/home/user/hm-work/wp02/bench/*.json` (round 1) and `/home/user/hm-work/wp02r2/bench/*.json` (round 2).
- Table: `node tools/perf/bench-table.mjs <label=file> …`.
