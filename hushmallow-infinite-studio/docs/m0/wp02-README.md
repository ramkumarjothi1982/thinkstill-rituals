# M0 gate materials: WP-02 (final profile against exact)

For the owner's M0 review. Small previews are here; the full-size materials are in `/home/user/hm-work/m0-gate/`.

| File | What it is | Full size (WORK) |
|---|---|---|
| `wp02-ab-flip/index.html` | **A/B flip sheet**: the 16 golden times, exact against final. Each picture flips once a second; hover or press to hold one. Each card has the full frame at half size, the face box at 1:1, and the difference × 8. | `m0-gate/ab-flip/` |
| `wp02-ab-flip/contact-sheet.jpg` | all 16 faces in one image: exact, final, and \|difference\| × 8 | same |
| `wp02-side-by-side-preview.mp4` | **full-video side-by-side**: A exact on the left, B final on the right, 1080×960 (each side at half size), CRF 24, with sound | `m0-gate/side-by-side-exact-vs-final.mp4` (2160×1920, every frame at 1:1, CRF 16) |
| `wp02-bench-table.md` | **benchmark table**: farm wall clocks, plus `hm bench` per step with its per-pass split | `m0-gate/bench-table.md`, `bench-table.json` |
| `wp02-gate-summary.json` | final against exact on the 16 goldens; exact against the goldens; every feature's step gate, switched off alone and on alone; rest test; loop-seam (whole frame and face box) and flash metrics | `m0-gate/gate-summary.json` |

## What to look for

The final profile draws the face **once per frame**, from quantised parameters. An expression that changes within one frame is therefore no longer smeared across the shutter; blinks and eye pops still are. The face still moves and blurs with the body.

While the approved painting covers the face (the first 6 and last 15 frames of the loop), the final profile holds the neutral face under the painting instead of following the expression. The painting is what shows there; the held face only shapes the sheen and rim light over the painted features, so the loop seam looks the same.

The other steps change nothing visible at the gate tolerances. Against exact, every golden frame measures at least 51.9 dB, and the face-box SSIM is at least 0.9986.

## Sources

| Video | Render | Profile |
|---|---|---|
| A | `/home/user/hm-work/wp02r2/renders/exact-2/final.mp4` | exact, all 450 frames identical to the sequential goldens |
| B | `/home/user/hm-work/wp02r2/renders/final-3/final.mp4` | final, 651.1 s on 1 worker (a second run of the same code, `final-4`, took 572.1 s and produced the identical video stream) |

Both were rendered by the farm from branch `worktree-wf_2b3d309f-330-23` (WP-02, round 2, commit `93ea10b`). The report is `docs/wp/WP-02.md`.
