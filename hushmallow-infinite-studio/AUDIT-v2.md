# v2 audit — "My Brain at 2 AM"

My own judgement against your ten questions, made frame by frame on the final
file: full-resolution stills, consecutive-frame filmstrips (`output/v2/qa/strip-*.jpg`),
a 0.5 s contact sheet, and measurements. One honest limit up front: I can't watch
it the way a person does, in real time with the sound on. I judged motion from
frame sequences and sound from its waveform, spectrogram and onset timing. Your
own viewing on a phone is the real test.

Scale: **strong** / **good** / **adequate** / **weak**.

| # | Question | Verdict | Why — and what still holds it back |
|---|---|---|---|
| 1 | Does Noomi feel alive? | **strong** | Noomi never fully stops: sleeping breath, shallow panting after the shock, a shiver in the spiral, a slow calm breath at the end. Blinks, eye darts, glances, a wince and a guilty look-down read as thinking. Impacts travel up the body as a jelly wave. *Holding back:* while the eyes are closed (7.3–11.7 s) the life is mostly in the body; the face is still apart from the breath mouth. |
| 2 | Is the motion physically believable? | **good** | The jump is a true ballistic arc: stretch at take-off, rounder at the apex, a falling stretch. The landing squashes the base first, rebounds and settles. The reflection separates while airborne, and ripple rings distort it. *Holding back:* the impact squash (0.75 × height, 1.28 × width, three frames) is deliberately cartoony. Noomi sits on a mirror plane rather than displacing water. |
| 3 | Is the face compelling? | **good → strong** | Pin-prick pupils on the take, worried brows and a wobbly mouth, a cringe, a guilty glance, then a soft open-eyed smile with moon catchlights. At rest it is the untouched painting. *Holding back:* the open eyes follow the app rig's design (flat white sclera, galaxy iris). That is approved and on-model, but less sculpted than a feature-film eye, and the painting itself only has closed eyes. |
| 4 | Is it truly sharp at 1080 × 1920? | **strong** | Every body pixel is a downsample of the 1254 px approved painting, the face is drawn at the painting's resolution, and the type is vector-sharp. 1:1 face crops show 27 % more high-frequency energy than v1 (`compare/v1-vs-v2-sharpness.json`). Mean gradient is only +2 %, so the visual difference is clearer than that figure. Fast frames carry intentional motion blur. |
| 5 | Is the cinematography premium? | **good** | Restrained palette, a real lighting arc (cool night → cold anxiety → warm moonlight → night), depth from the mirror lake, ridges and a sky that parallaxes less than the foreground. Glass thoughts, clean type and slow camera moves only: no shakes, no roll, no flashes. *Holding back:* it is much darker than v1, and the spiral (5–9.5 s) is low-key. That is cinematic, but on a bright feed it may pop less than a saturated cartoon. |
| 6 | Is the first second captivating? | **good** | Text is on the cover frame and the jolt lands at 0.40 s: a stretch, a jump and a heavy landing inside the first second. *Holding back:* frames 0–0.4 s are calm (sleeping). It is a strong comedic hook, not a spectacle. |
| 7 | Soothing and satisfying? | **good → strong** | The breath is built to be felt: a long swell, a tiny crest, then a long elastic melt. The calm ring spreads over the water, the thoughts' words fade and they turn to light, clouds part and the lake stills, all under a breath-and-pad sound bed. |
| 8 | Is the sound synced? | **good** | Every sound is cue-driven from the same timeline as the picture. Loud cues (take, landing, thoughts, release, eyes-open) land at 0 ms measured offset; quieter cues measure −30 … +45 ms because they overlap other sounds (`qa/audio-onsets.json`). −16 LUFS, −2 dBTP. *Holding back:* not human-listened by me; the limiter shapes ~2 s of transients. |
| 9 | Does the ending encourage replay? | **strong** | It's a true loop. Pose, palette, breath phase, sky and water motion are all periodic over 15 s. The 449 → 0 seam changes by 1.89 mean |Δ|, which is less than the film's other keyframe boundaries in quiet stretches (2.02–2.09). The small excess over within-group pairs (1.37–1.50) is the encoder's keyframe, not the animation (`qa/loop-seam.json`). The hook caption returns, so the loop reads as "…every night." |
| 10 | Is it worth sharing? | **good** | Relatable (the 2 AM cringe jolt) and premium. *Holding back:* the joke is a single beat; virality isn't something I can promise. |

## What materially improved over v1

* **Resolution:** a 1254 px source drawn at ≈ 0.56× (always downsampled) instead
  of the 439 px sprite drawn at ≈ 1.4× (upscaled, soft).
* **Animation:** a deformable soft-body mesh with a travelling jelly wave, true
  ballistic arcs and adaptive motion blur, instead of strip-warping a flat image.
* **Face:** procedural strokes measured from the painting, at art resolution,
  plus the app's full expression vocabulary. At rest the untouched painting itself
  is shown.
* **Restraint:** no "!" glyphs, sweat drops, bokeh, outlined cartoon captions, camera
  shakes or roll; the effect comes from the performance.
* **Story:** a physical cause-and-effect chain (jolt → thoughts → breath → release)
  and a seamless loop.

## Remaining limitations

* **2.5-D, not 3-D.** Noomi is the painting on a deforming mesh. She can squash,
  stretch, lean, bulge and ripple, but cannot turn to show a side.
* **Open eyes and brows aren't in the painting.** The approved art has closed eyes
  only. Open eyes and worried brows follow the approved app rig's design,
  reconstructed at high resolution.
* **The face-cleaned body is partly reconstructed.** About 70,700 px around the
  former strokes are re-synthesised. Pixels outside the edit mask are bit-identical
  to the painting. Adversarial QA found only measurable flaws, invisible at 1:1 and
  2:1 (`output/asset-qa/`):
  * the fluff there is mostly one cloned patch;
  * its cells are slightly softer than the surrounding fluff;
  * the cheek pink's edge under the old glow is inferred.
  
  In the video this area sits under the drawn face, or the painting is shown.
* **Render speed.** Software WebGL: ~25 min per render on this 4-core box. A GPU
  would take this to a minute or two.
* **Logo.** The approved wordmark is black-on-white with no reversed version, so it
  sits on a light plate.
* **Phone UI overlays.** Key content avoids TikTok's right rail and caption area.
  The lower water and the moon's reflection sit under the caption overlay.

## Production app

Untouched. Across all branch commits, `git diff` against `main` shows changes only
inside `hushmallow-infinite-studio/`; `hushmallow/` and
`.github/workflows/hushmallow-pages.yml` are identical. Nothing was deployed. No
paid APIs or services were used.
