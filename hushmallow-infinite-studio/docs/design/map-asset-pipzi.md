**Pipzi hi-res derivation plan (from `hushmallow/assets/source/hires/pipzi.webp`)**

All coordinates are in source pixels of the 1254×1254 canvas, measured with python in scratch. Nothing was written under /home/user/thinkstill-rituals.

If we use Noomi's crop rule (alpha ≥ 2 bounding box plus 24 px of padding), the offset is (19, 54) and the cropped art is 1222×1174: art px = source px − (19, 54).

The app's 434 px art is a different render of the same design, not a downscale of the hi-res file. Aligning the two matches well (correlation 0.977), but the mean difference is still 13/255, the skin cells don't line up and the grade is pinker (#fa1850 against #fa063c).

Mapping the registry face spec (434 px space) onto the hi-res art:
- x' = 2.7676x − 0.0112y + 35.30
- y' = −0.0013x + 2.7071y + 71.80
- Mapped registry points land within about 2–9 px of what I measured, so they are fine as a first guess, but the final spec should use the hi-res measurements below.

---

**(1) What gets removed and what stays**

*Remove (everything that moves):*
- **Eyeballs:** the whole sclera, including its pink reflected rim.
- **Irises:** black limbal ring, nebula, star flares and the pentagon catchlight.
- **Eye surround:** the dark crimson contact crease just outside the eyeball, the pink under-glow band below each eye and the lighter orange-red rim on the outer side.
- **Brows:** the full glossy maroon tube, its pink top-edge highlight, the dark-red contact shadow below it and the start of the pink under-glow band.
- **Mouth:** the dark interior, the two-lobed tongue with its highlight, the glossy peach inner rim of the lower lip, the lighter lip band and the darker crimson shading on the upper edge.
- **Not present on Pipzi:** there are no outline strokes, eyelids, lash lines or teeth anywhere in the painting.

*Keep (body):*
- **Cheek glows with their sparkles and glitter.** The registry says `base: 1` and the app's body kept them too. But the glow runs under the lower-outer part of each eyeball (that edge of the eyeball reads #f9b3f2 on the left eye), so the eye hole has to rebuild that part of the glow (see 2).
- **Body highlight** at the top left: (220–288, 308–375), centre (250, 338), #fefafd.
- **Top dimple:** darkest point (615, 207).
- **Rim light** along the top edge.
- **Several hundred small white glints** on the skin cells. These are part of the texture.
- **Smooth skin bands** about 15–35 px above the eyes and above the brows.
- **Glitch lines:** Pipzi has none (that's Glitzi), so there's nothing to keep.

**(2) Difficulty and technique: hard, roughly 4× Noomi**

*Why it's hard:*
- **Hole size:** about 290k px to rebuild, against Noomi's 70.7k. Each eye is about 89k (ellipse + 14–16 px), the mouth about 75k (opening + 22 px) and each brow about 18k (+20 px).
- **Texture:** the skin is a two-scale cobblestone (25–31 px cells with 11–16 px bumps) that has to be invented across holes up to 320 px wide.
- **Clipped red channel:** R ≥ 248 on 57% of body pixels, so the texture lives in G and B (forehead standard deviation: R 4, G 28, B 31).
- **Cheek glow** sits partly inside the eye holes.
- **What helps:** Pipzi's neutral expression has the eyes and mouth open, so most of those holes stay hidden. They show during blinks, squints and closed-mouth expressions (the app's angry and sad presets set mouthOpen to 0.05–0.15), and the old brow area shows when the brows move.

*Reuse from `derive_noomi_hires.py` as is:*
- `crop_art`, `laplace_fill`, `norm_blur`, `loclin_lowpass`
- `patchmatch_complete` (seeded, so runs are repeatable)
- the multi-band texture-energy equalisation and seam-correction steps
- the check that nothing changes outside the mask
- the face-JSON writer pattern, `height_normal`, `qa_images`
- the stroke tools (`zhang_suen`, `fit_quad_bezier`, `measure_stroke`) for the brows. The left brow's skeleton branches (fit error 17.9 px), so either prune the spur or fit to column centroids.
- the glow un-blending code, for the under-glow bands and the cheek glow.

*Must be replaced:*
- `find_features`: it looks for navy strokes and asserts exactly three. Pipzi needs its own finders for the eyeballs, irises, brows, mouth and cheeks.
- `fit_cheeks`: it detects cheeks with R−G, which is about 245 across all of Pipzi's skin. Use B or B−G instead.
- **The source-skin mask:** its pink filter (R−G > −30) is true for the entire body, so it would leave no source skin at all. Exclude the magenta glow instead (B−G > 60, dilated).
- **The specular exclusion:** it dilates every pixel brighter than 235 by 31 px, which would wipe out the source skin around the cell glints. Exclude only blobs over 150 px and the cheek sparkles.
- **Energy weighting:** it uses luma. Weight G/B more, about (0.2, 0.4, 0.4), or work per channel.
- **The single 64 px halo radius:** replace it with a mask per feature.

*Masks per feature:*
- **Eyes:** eyeball + 14 px on the top and sides, +18–22 px at the bottom, then a 16 px cross-fade band.
- **Mouth:** opening + 22 px.
- **Brows:** core + 20 px, then un-blend the under-glow out to +30 px below.

*Cheek glow:*
1. Fit a radial glow model per channel on the parts of each cheek the eyes don't cover.
2. Remove the glow from the hole's boundary data before filling.
3. After filling, put the model back inside the hole and add seeded glitter at the measured density (about 77 specks per cheek), so a blink doesn't take a bite out of the glow.

*Making invented texture believable:*
- Fill the low-frequency shading with a plain harmonic fill, not a biharmonic one.
- Use a detail scale of about 48.
- Take the target texture energy from a 20–90 px ring around the hole, not the 12 px edge, which is the painted smooth band.
- Use 5 pyramid levels for the eyes and mouth.
- Draw source skin per region: brows from the forehead and temples, eyes from the temples, sides and between the eyes, mouth from the chin, lower body and below-eye skin.
- Add brightness / distance-to-edge as a guide so top-lit cells stay near the top.
- Penalise reusing the same source patch, to avoid visible clones.
- Run each feature in its own window.
- Inside the eye holes, let the texture taper to about 60% toward the centre (the painting's own lid band is that smooth) and add a gentle dome shading of about ±4%. Put an eye-dome bump in the height map too, so a closed lid reads as skin over a ball and the open eyeball gets sphere lighting. Keep the mouth and brow areas flat in the height map.

*Other derivation steps:*
- The body's interior alpha is 252–253 (lossy webp). Snap ≥ 240 to 255, identically in `pipzi-art.png` and `pipzi-clean.png`.
- Cut iris sprites from the hi-res art at r ≈ 112 with a 1.5 px feathered edge. Remove the catchlight from them (a small dark-area fill), and optionally the stars.
- A sclera without its iris fills well biharmonically, because the sclera is smooth.

*Scratch tests I ran:*

| Region | Hole px | Window | PatchMatch time | Result |
|---|---|---|---|---|
| Right brow | 18.3k | 519×646 | 54–59 s | Simple version: pale smear, weak texture. With the harmonic fill, scale 48 and ring energy: real cells come through, but a hazy band remains where the under-glow wasn't removed. |
| Left eye | 89k | 728×744, 5 levels | 163 s | Soft texture, a whitish cast from the cheek glow and a hard seam on the cheek side. |

That confirms the full Noomi chain is needed, plus the Pipzi changes above. I estimate a full derivation at about 10–15 minutes on the 4 cores.

**(3) Measurements for the face renderer**

*Eyeballs* (fitted where G drops most steeply; they are wide ellipses, not circles):
- **Left:** centre (394.9, 653.5), rx 158.4, ry 148.7.
- **Right:** centre (864.7, 654.9), rx 156.3, ry 151.9.
- **Sclera colour:** #fdf8f9 at the centre, median #fbdfe7 (left) / #fcecef (right), #fadce3 → #fa9eaf toward the edge and #e64664 at the very edge.
- **Outside the eyeball:** a crimson crease (#aa0008–#b20010) at +3 px, about 4–6 px wide, strong on the top half and faded at the bottom. Below the eye, a pink under-glow from #fa3668 to #f91c52 over 1–16 px. On the outer side, a rim from #f32c3c to #fa1d3c out to +16 px. Above, a smooth band from +12 to +35 px.

*Irises:*
- **Left:** centre (423.9, 651.1), r 109.6. **Right:** centre (835.4, 653.3), r 106.4 (about 104×108).
- **Offset from the eyeball centre:** (+29.0, −2.4) and (−29.3, −1.6). Both look inward by about 0.19 rx, and the iris is about 0.69 rx.
- **Structure from the centre out:**
  - r 0–40: a black void (#000000), sitting slightly right of and below the centre.
  - r 40–60: blending to #3b0119.
  - r 60–90: nebula, about 60% magenta-plum (#50012a / #610231), about 33% crimson (#9f0324 / #ad0427) and about 4% orange-red glow around the stars (#f54d36), plus faint violet dust.
  - r 100–108: a near-black ring (#090305–#1e0108).
  - r 109: the sclera starts.
- **Catchlight:** a crisp pentagon (#fdfdfd) with a magenta halo from #dd307a to #580233 over 10 px.
  - Left vertices: (453,569) (426,595) (446,622) (475,615) (482,591).
  - Right vertices: (856,568) (828,593) (849,622) (879,614) (885,588).
- **Stars:** position relative to the iris centre in iris radii, with core size in px. Left and right are not mirror images; preserve both.
  - Left: (−.49,.55) 33×30 · (.62,.37) 21×19 · (−.55,.09) 20×17 · (.42,.66) 13×11 · (−.68,−.42) 9×9, pinkish · (.54,−.68) 9×9 · (−.39,−.80) 8×7 · (.04,.78) 5×5.
  - Right: (−.53,.48) 30×26 · (.61,.33) 19×18 · (.30,.66) 15×15 · (−.71,−.21) 8×9 · (−.52,−.70) 8×8 · (.51,−.75) 8×8 · (−.74,.19) 3×3.
- **Star look:** 8 rays (4 long, 4 short diagonals), rays about 15–22 px. From the centre: white to r 6, gold #fef2a2 at r 8, orange #fc904a at r 12, crimson #f61545 at r 18, plum #8e032e at r 25, gone by r 35.

*Brows* (quadratic Bezier through the dark core):
- **Left:** p0 (281.3, 457.0), c (372.2, 370.5), p1 (475.8, 407.5).
- **Right:** p0 (782.7, 403.9), c (891.6, 371.5), p1 (983.9, 445.9).
- **Shape:** an arch with the inner end higher and the outer end hooked down, round caps.
- **Width:** core about 36–40 px; about 48 px normal / ~55 px vertical including the gloss band.
  - Left vertical thickness, outer to inner: 19, 43, 43, 41, 39, 39, 37, 38, 26.
  - Right: 24, 40, 34, 35, 34, 35, 38, 39, 19.
- **Colour, top to bottom:** a pink top-edge highlight (#fc7589–#feb6bf), a gloss gradient (#b44755 → #852d36 → #671e24 → #53121a → #430610), the core (#2b0104 left / #2e0103 right) and a bottom edge of #190001.
- **Around it:** a dark-red contact shadow from #9d070b to #dc0314 over 0–6 px below, then a pink under-glow (#fb2d54) from +8 to +25 px.
- The registry ink (#4a0610) is lighter than the painted core.

*Mouth* (open, no outline):
- **Corners:** left (462, 880), right (798, 853). The right corner is 27 px higher (about 4.6° of tilt) and the opening is 336 px wide.
- **Upper edge:** a gull-wing shape made of two cubics, both within ~6 px of the traced edge:
  - [(462,880), (470.4,751.7), (570.1,843.6), (635,841)]
  - [(635,841), (691.9,849.0), (780.0,752.0), (798,853)]
- **Lower edge** (inner edge of the lower lip): [(462,880), (503.5,1054.7), (799.3,1051.9), (798,853)], bottom at about (635, 1009). The opening is about 168 px deep and covers about 55–59k px.
- **Interior:** a gradient from #2b0000 at the top through #3e0000, #5d0107 and #71020d, getting darker (#560103) beside the tongue.
- **Tongue:**
  - top edge at y ≈ 913–920 between x 560 and 710; cubic [(530,963), (558.7,893.2), (710.8,891.6), (740,963)]
  - groove at x ≈ 630
  - colours #f81944 → #fb658c → #ffb7cc
  - a white highlight of about 22×10 px at (680, 962)
  - a red crease against the lip at about (625–650, 1000)
- **Lower lip:** a peach inner rim (#ffe5d1 / #fec2b7) about 8–12 px wide, then a pink band (#f92f53 → #fa0a3b) over about 16 px.
- **Upper edge** is shaded #f20720. **No teeth.**

*Cheeks* (fitted on the B channel):
- **Left:** centre (282, 832), 50% radius ~70, softness ~20, aspect 0.89.
- **Right:** centre (998, 828), 50% radius ~63, softness ~18.
- **Colour by radius:** #fdf0fc at 0, #fbc4f9 at 16, #fa90f3 at 30, #fa40d1 at 50, #fb1d9e at 70, gone by about 110.
- **Sparkles:** a central star blob of about 1.2–1.4k px (core r ≈ 20) at (285, 822) and (1004, 820). Smaller sparkles on the left at (263,848), (232,863), (251,788), (251,773); on the right at (1030,794), (1045,777), (994,798). About 77 glitter specks of ~2 px per cheek.

*Body:*
- **Silhouette:** alpha > 127 spans x 47–1209, y 81–1193; base at y 1193; contact half-width 167 around x 604.

**(4) What `face.js` needs**

*Per-character settings:*
- Replace the global navy colour table with a palette per Mallow: lid/closed line, brow tube, sclera, iris, mouth, blush.
- Give each Mallow its own neutral. Pipzi's is eyeOpen 1, mouthOpen 1, mouthSmile 0.9, browAlpha floor 1, blush base 1. Today the shared neutral has browAlpha 0 and mouthOpen 0.
- Allow eyeball ellipses (rx, ry) instead of a single radius r.

*New eye style "pipzi":*
- Pink-rim sclera gradient, a soft top-left highlight and a magenta tint from the cheek on the lower-outer side.
- Draw the outside crease, the under-glow and the outer rim.
- **No lash line while the eye is open.** The current code always draws a navy one at 0.62 width.
- In blinks and squints, the lid is the body's own skin, plus a thin maroon lid-edge crease and shadowing on the eyeball.
- **Closed eye:** a maroon glossy tube using the registry hw/sag × 2.77 (hw ≈ 138, sag ≈ 33, lw ≈ 30). The painting has no closed eye, so this needs an owner-approved still.

*Iris "galaxy-warm":*
- Black void, magenta/crimson nebula, the limbal ring, the measured star list with 8-ray flares, and the pentagon catchlight fixed to the light rather than to the iris.
- Optional slow twinkle: 0.3 Hz or slower, ±15% at most.
- Preferred: use the hi-res iris sprite at native resolution for the neutral pose, which keeps the fade to the painting at rest clean.
- Cache the iris as an offscreen canvas so a face redraw stays at or under about 30 ms per sub-frame.

*Mouth style "cavity":*
- Built from the cubics above, scaled by the mouth parameters, keeping the corner tilt.
- Interior gradient, top shadow, two-lobed tongue with groove and highlight, peach lower-lip rim, no outline tube.
- **Closed mouth** (pout, cheek puff): a thin maroon crease tube in the brow palette, never navy.
- Support the existing tongue-out parameter.

*Brows:*
- Always visible.
- Measured maroon palette: a pink highlight along the top edge instead of Noomi's thin highlight line and beads, no blue glow, a red contact shadow and the under-glow below.
- Taper ≈ 0.75. Use the measured left and right Beziers; don't mirror one onto the other.

*Cheeks:*
- They stay in the body. Only add a screen blend (#fa90f3) when blush goes above 1.
- Optional gentle sparkle twinkle, no strobe.

*Loader:*
- `specFromDerived` reads `pipzi-face.json`. Use `specFromRig` with the mapping above only as a fallback.

*App's 434 px sprites: do not reuse.*
- On screen the body is drawn at about 0.56–0.6 screen px per hi-res px (world scale 0.56 × zoom up to 1.075). The iris is then about 122–130 px wide, against an 82 px sprite (1.5–1.6× upscale), and the body is about 650 px wide against a 434 px sprite (about 1.5×).
- They come from the different render described above, so they won't match the hi-res body.
- The face area of `pipzi-body.png` is a blurred smear.
- Rebuild from hi-res sprites plus procedural drawing.

**(5) Risks and the QA I'd require**

*Risks:*
- **Large-hole fill:** smears, clones, lighting mismatch or broken cell structure, visible in blinks, squints, closed mouths and brow moves.
- **Cheek glow** missing a chunk inside the eye hole.
- **Double images** when the painting fades in at rest, if the neutral face doesn't match it.
- **Clipped red channel:** colour shifts or banding. Also chroma bleed on red against white and black edges under 4:2:0 BT.709 encoding at CRF 17.
- **Interior alpha below 255.**
- **Motion blur:** stars and catchlights streak, and Pipzi has the highest energy (1.1), so more blur sub-frames and a longer render.
- **Brand rules:** sparkles that twinkle too fast, or other energetic touches, would break the "no strobe, cinematic restraint" rules.
- **Closed-eye design** is invented.
- **Painted asymmetries** (corner tilt, different star layouts, unmatched brows) get lost if anything is mirrored.

*Derivation QA:*
- Nothing changes outside the mask; alpha is identical between art and clean apart from the documented snap; same output on re-run with the same seed.
- 1:1 and 2:1 before/after crops of every region.
- Inside each hole against the 20–90 px ring of real skin:
  - texture energy per band and per G/B channel within 0.85–1.15
  - cell period within ±15%
  - glint density within ±25%
  - colour difference ΔE2000 under 2
- Sources: no source patch overused, no copied block larger than about 1.5 cells.
- Seam: edge gradients no stronger than the 95th percentile of natural skin.
- Rings: flat radial profiles across the old eyeball, brow and lip edges, so no leftover crease or glow ring.
- Cheek glow model error under about 3% of its amplitude.

*Neutral match:*
- Feature centres within 1.5 px, iris radius within 1 px, mouth outline within 3 px, brow centreline within 2 px.
- In the face region: SSIM above 0.9 with sprites, mean ΔE under 3.
- A frame-by-frame check of a 0→1 rest fade with no double features. If it fails, turn the rest fade off for Pipzi.

*Rendering checks:*
- Log the maximum magnification of every raster asset each frame and fail if it goes above 1.0 screen px per art px.
- Encode test of the saturated red (chroma check, body median ΔE under 3 after encode).
- Flash/strobe check following the WCAG 2.3.1 limits.
- Face redraw at or under 40 ms per sub-frame; full 15 s render at or under about 30 min.

*Owner sign-off stills:* neutral (should look identical to the approved art), mid-blink, happy closed eyes, closed smile, brows up and down, looking left and right, plus a 3 s loop.

*Output naming:* derive into `assets/pipzi/` (`pipzi-art`, `-clean`, `-clean-mask`, `-face.json`, `-height`, `-normal`, hi-res iris and sclera sprites) and `output/asset-qa/pipzi/`. Pull the shared code into a common module with a feature finder per Mallow, and check that regenerating Noomi gives byte-identical files.

Files are in `/tmp/claude-0/-home-user-thinkstill-rituals/408ed79f-c8dc-5aa7-9180-8647f2fe949e/scratchpad/`:
- `pz/test2_browR.png`
- `pz/test3_browR.png`
- `pz/test2_eyeL.png`
- `pz/overlay_eyeL.png`
- `pz/overlay_eyeR.png`
- `pz/align.png` (hi-res vs 434 px comparison)
- `pz/irisL3x.png`
- measurement scripts in `scripts/m*.py` and `scripts/test_inpaint*.py`