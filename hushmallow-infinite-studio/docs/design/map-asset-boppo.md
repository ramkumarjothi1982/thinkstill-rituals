Boppo can be animated at the v2 bar, but the face clean-up is much harder than Noomi's (rated HIGH). Every measurement below is my own, taken on hires/boppo.webp in source pixels (1254 canvas). I wrote nothing under /home/user/thinkstill-rituals. Scratch masks and crops are in /tmp/claude-0/-home-user-thinkstill-rituals/408ed79f-c8dc-5aa7-9180-8647f2fe949e/scratchpad/boppo/ (eyewhite_L/R.png, browL/R_full.png, mouth_mask.png, tongue_mask.png, eyes.json, mouthbrows.json, side_by_side.png, edit_overlay.png).

**First, a decision for the owner.** The 1254 px hires Boppo and the app's 379×384 px Boppo (mallows/boppo.png, rig/boppo-body.png) are two different paintings, not one image at two sizes:
- **Hires:** a wide-open grin with a pink heart-shaped tongue, larger eyes and irises, bigger glittery cheeks, and a wider body (width/height 1.043).
- **App art:** a narrower dark crescent smile with no tongue, smaller irises, and a body ratio of 0.992.
- **Proof:** matching features between the two only fits about a third of them (17 of 60), with different horizontal and vertical scales (3.12 vs 3.44).

So the registry's face numbers and specFromRig() cannot be scaled up for Boppo; everything must come from the hires measurements. The owner should confirm the hires grin is the canonical Boppo for videos.

## 1. What to remove and what to keep

**Remove:**
- **Eye whites (L and R).** This includes the pink fade at the edge (outer 10% of the radius, from near-white to salmon #f58c86) and the soft anti-aliased border.
- **Irises.** Black centre, maroon/purple haze, dark outer ring, 9–10 orange 8-point starbursts each, the large pentagon catchlight, the small oval catchlight, and the red fringe on the catchlight.
- **Lighting around each eye socket**, outside the eye white:
  - A crimson glow on the top and sides (green channel drops from about 100 to 27 at 5 px out, recovers by 30–40 px; peak colour about (222,27,9)), with a thin crimson line at the sides.
  - A cream lit "lower lid" band under each eye: peak (253,206–225,142–147) at 5–8 px out, gone by 50–60 px.
  - These are shading from the carved socket. If they stay, they glow under a closed eye, so they go and face.js redraws them on the lid curves.
- **Brows (L and R).** Glossy maroon bean-shaped tubes, plus the bright highlight on their upper edge and a tight red edge glow (back to plain skin by 8–12 px). My brow masks (red channel < 205) miss that highlight, so they need dilating 5–6 px upward.
- **Mouth.** Dark maroon interior and the tongue. There are no teeth and no ink outline. Around it: a crimson glow along the top edge (16–20 px), a cream lit lower lip (peak (252,223,132) at 8–12 px out, gone by about 50 px), and lighter bands at the sides (252,185,48).
- **Nothing else exists to remove on the open eyes:** no lids, lashes or ink outline.

**Keep (painted, in the clean body):**
- **Cheeks:** magenta glitter blush with one large 4-point star glint each, matching the app and Noomi (base 1). The blush continues *under* the eyeballs, so it has to be completed there:
  - Left: the cheek model reaches 0.6 strength inside the eye white (2,253 px at strength > 0.2).
  - Right: up to 0.46 strength (1,073 px).
  - Within the 60 px ring around each eye: 11.5k px (L) and 9.5k px (R) are cheek-tinted.
- **Top-left gloss:** region (62–420, 109–480), centre about (243,262). One lobe at (192–296, 321–404) touches the left-brow edit ring, so it needs a protect mask.
- **Other body features:** the top cushion highlight (rows 240–290), the stem dimple at (627,243), the silhouette's orange edge halo, and the darker underside (rows 1150–1198).
- **Not present on Boppo:** glitch rows, spirals, teeth, blush lines.

## 2. Difficulty and recommended technique

**Size of the job compared with Noomi:**

| | Boppo | Noomi |
|---|---|---|
| Feature pixels | 188k | — |
| Area that must be re-synthesised (feature + 8–12 px rim) | about 229k | 71k (Boppo is 3.2×) |
| Total edit mask | about 388k | 173k (Boppo is 2.2×) |
| Furthest point inside a hole from real skin | about 150 px | about 20–30 px |

The edit mask is one connected region (171–1072, 353–1031). The cream bands under the eyes (50–60 px) are wider than the eye-to-mouth gap (45–47 px), so the regions merge. Each eye hole needs about 8–10 orange-peel cells invented across it (texture repeats every 30–40 px).

**The skin colour makes this unusual.** Red is clipped at about 251–253 everywhere, blue is about 0–5, and all the texture lives in the green channel (std about 15).

**Proposed new script `tools/derive_boppo_hires.py`.** It should share a refactored module with the Noomi script.

- **Reuse unchanged from derive_noomi_hires.py:**
  - `crop_art` (24 px padding gives offset (12,53) and an art size of 1226×1177).
  - `laplace_fill` (biharmonic), `loclin_lowpass`, `norm_blur`, `patchmatch_complete`.
  - The whole step-6 pipeline (smooth base, texture detail layer, energy normalisation, multi-band equalisation, seamless correction).
  - The step-7 checks (nothing changes outside the mask, alpha identical), the `write_face_json` pattern, `qa_images`.
  - `height_normal`, retuned: dimple at (615,190) in art pixels, a squarer rounded-cube bevel.
- **Replace `find_features`** (it looks for dark navy strokes). The detectors I validated:
  - Eye white: green − blue < 40 and blue > 100, joined with the iris disc, closed and hole-filled.
  - Iris: cast rays outward from r = 96 to the first white pixel, then a robust circle fit.
  - Brows: red < 205 inside the brow window, plus the upward dilation.
  - Mouth: red < 205, or (blue > green + 12 and red > 120), hole-filled.
  - Tongue: red > 150 and blue > green + 12.
  - Protect masks: cheek glitter (all channels > 235 inside the cheek), the gloss region, and small skin highlight dots.
- **`fit_cheeks`:** fit the same soft-disc model to the blurred blue channel instead of red − green (orange skin already has red − green ≈ 140).
- **Brows:** fit a cubic curve plus a width profile. A quadratic fit is off by 12–15 px; a cubic is within 1.2–1.9 px.
- **`halo_transmission` (the glow-removal step):**
  - Keep the ratio model only in green. Treat blue as additive, because a ratio on blue ≈ 2 blows up. Set red to the smooth background, since it carries no texture.
  - Glow radius per feature: eyes 64 px, mouth 56 px, brows 20 px.
  - Pixels where green > 235 in the cream band have lost their texture and go to full re-synthesis.
  - The outline coordinate already distinguishes the upper crimson glow from the lower cream band.
- **Re-synthesis of the large holes:**
  - Smooth base by biharmonic fill, plus the fitted cheek model added inside the cheek overlap.
  - PatchMatch: 5 levels, patch radius 4 at the coarse levels, more iterations at the coarse levels.
  - Source skin, front face only:
    - between the eyes: x 575–675, y 520–760;
    - forehead: y 300–370, minus the gloss;
    - chin: y 1030–1130, x 380–880.
  - Excluded from the source: anything within 70 px of the silhouette, the top cushion (y < 300, where the cells converge on the stem), cheeks, gloss, the underside shadow.
  - Each hole takes from its own source region (left eye from the left half, right eye from the right half, mouth from the chin), with a reuse penalty against repeated patches and a fixed seed.
  - If an eye hole fails QA, fall back to patch quilting from a clean 256² skin swatch over the smooth base.
- **Cheek completion:** extend the fitted disc model. Add new glitter only where cheek strength > 0.6, matching the measured density (11–15 sparkles per cheek).
- **Iris sprites:** cut both painted irises at native size (about 230² RGBA, circle plus 1.5 px anti-alias). Inpaint the two catchlights (they sit on smooth dark haze) and keep the stars.
- **Where the invented skin shows:** only during blinks, closed eyes, smaller mouth shapes and brow moves. Even so, it has to hold up as a 100% still.
- **Runtime:** expect about 3× the Noomi derivation time.

## 3. Measurements for the face renderer (source px)

**Body and art**
- Silhouette (alpha > 127): (42,80)–(1208,1198).
- Interior alpha is 250–254, the same as Noomi, so the current pipeline already handles it.

**Eye whites**
- L: centre about (391.5,656.5), half-width 156.5, half-height 140; fitted tilt −10°, which may be biased by the cheek edge.
- R: centre about (853,654), half-width 154, half-height 141, tilt about 1°.
- Edge softness (10–90%): 4.5–8.6 px.
- Colour by distance from centre (ρ = 1 at the edge):

| ρ | Colour |
|---|---|
| < 0.8 | (252,247,246) |
| 0.88–0.94 | (251,225,223) |
| 0.94–0.98 | (247,183,181) |
| 0.98–1.0 | (245,140,134) |
| just outside | crimson |

- The upper rim is slightly more salmon than the rest.

**Irises**
- Circles: L (420.3,652.8) r 112.7; R (826.4,650.0) r 111.5.
- Offset from the eye-white centre: L (+28.4,−4.5), R (−28.0,−4.6), i.e. a cute inward look. Iris radius is 0.72 of the eye half-width.
- Gaze range is only about ±37 px.
- The iris edge is crisp: 1.75 px (10–90%).
- Radial structure:

| Fraction of radius | Colour |
|---|---|
| 0–0.3 | (6,0,1) |
| 0.3–0.55 | (31,1,1), purple haze toward the catchlight |
| 0.55–0.9 | base about (70,1,0), orange halos around the stars |
| 0.9–0.96 | dark ring (40,2,2) |
| outer rim | (30,3,5) |

- Stars: 8-point (4 long rays plus 4 short diagonals). White-yellow core (255,250,240), orange halo about (255,140,20), fading to (200,30,0).
- Main stars as (x, y) in iris radii from the iris centre, about ±0.02:
  - L: large (−0.53,0.49) and (0.60,0.40); medium (−0.62,−0.39) and (0.30,0.66); small (−0.69,0.06), (−0.13,0.71), (−0.33,−0.76), (0.81,−0.12).
  - R: large (0.58,0.34); medium (−0.69,−0.18) and (0.33,0.64); small (0.82,−0.08), (−0.42,−0.65), (−0.03,0.68), (−0.77,0.23).
  - The largest cores reach about 22–28 px.
- Catchlights:
  - Main pentagon, L: [[452,574],[423,599],[445,625],[474,617],[479,593]].
  - Main pentagon, R: [[853,568],[826,593],[847,621],[877,611],[881,589]].
  - Both about 56×52 px, at (0.26–0.29, −0.47–−0.50) iris radii, with a warm fringe on the lower-left edge.
  - Small oval: L at (480,574), 10×9 px; R at (893,571), 13×12 px.

**Socket lighting:** as in section 1. Upper glow reaches about 35 px. Cream lower band peaks at 5–8 px and reaches 50–60 px.

**Brows (glossy maroon tubes)**
- L, cubic curve: (300,458), (339.2,424.7), (395.2,402.9), (447,416). Tips at (277,472) and (480,412). Width 45 at the outer end, 52 at the inner end.
- R, cubic curve: (804,405), (855.1,387.5), (909.4,410.4), (950,440). Tips at (773,402) and (973,450). Width 49–51 on the inner half, 37.5 at the outer end.
- Both are thicker at the inner end and slope down toward the outside.
- Colours:
  - core (58–65,2–4,0), close to the registry ink #3a0602;
  - lower edge (36–48,0,0);
  - lit band 7 px inside the upper edge (126,34,49) to (196,116,115);
  - highlight (255,232,231), about 3–4 px wide, 4–6 px inside the upper edge;
  - red edge glow about (235,30,4), back to skin by about 10 px.

**Mouth (wide grin)**
- Contour (30 points): [[769,837],[764,822],[757,815],[737,809],[723,814],[698,834],[672,848],[647,855],[613,857],[574,849],[551,838],[521,817],[503,814],[485,825],[480,838],[480,855],[486,876],[502,907],[533,943],[541,945],[554,956],[575,966],[608,974],[638,974],[673,966],[714,942],[726,931],[746,905],[760,879],[768,853]].
- Corners (480,846.5) and (769,842). Rounded corner bumps rise to (503,814) and (737,809). The upper lip dips to (613,857).
- Upper lip, quadratic fit: (499.6,803), (627.6,910.4), (736.5,803.4); off by up to 6.4 px.
- Lower edge, cubic fit: (497,898), (552.7,998.8), (694,999.3), (751,897); off by up to 2.1 px.
- Interior is a vertical gradient: (40,1,1) at y 815, (72,1,0) at 870, (102,1,4) at 925.
- Tongue:
  - Box (540–711, 904–974), centre (626,938); its bottom is clipped by the mouth edge.
  - Two lobes on top at y 904–906, with a central notch at (627,912).
  - Colours: median (251,67,94), edge (242,5,43), highlights (255,153,172) with shine spots near (613,947) and (660,943).

**Cheeks (kept; for blush add-on and glint positions)**
- L: centre (265.4,833.8), 50% radius 79.3, softness 28.5, aspect 1.18, angle −27°.
- R: centre (976.9,832.2), 50% radius 71.2, softness 27.0, aspect 1.15, angle 7°.
- Core colour (250,146,238). Colour at the 50% radius about (251,65,130). Large star glints at (272,816) and (976,818).

**Gaps between features:** brow-to-eye 56 (L) / 71 (R) px; eye-to-mouth 47 / 44.5 px.

## 4. What face.js must add, and whether the app sprites can be reused

**App rig sprites: rebuild, do not reuse.** All of them (boppo-iris-L/R at 72/70 px, iris-amber/navy, boppo-body at 379 px) come from the other, smaller painting. The hires iris is about 225 px across, so those sprites would be upscaled about 3.1× in art space, or about 2.2× on screen at 0.7× display. Use the native-cut hires iris sprites instead, and keep a procedural galaxy iris as a fallback.

The sprites must never be upscaled. Boppo's surprised expression uses eyeScale 1.3, so the on-screen display scale must stay ≤ 0.77; the renderer should assert that eyeScale × irisScale × display scale ≤ 1.

**Changes to face.js:**
1. **Per-Mallow style object.** Replace the hard-coded navy (the `TUBE` palette, iris gradient, lid shadow rgba(10,20,80) and rim rgba(40,50,130)) with each Mallow's own colours. Boppo uses the maroon material with the highlight on the upper edge, not at 0.28 of the width. Tube widths need asymmetric per-stroke width functions.
2. **Per-Mallow neutral pose.** Boppo's: eyeOpen 1, browAlpha 1 (brows always visible), mouthSmile 1, mouthOpen 1 (meaning the painted shape), blush 0 (cheeks are painted), gaze matching the measured iris offsets.
3. **New eye style 'open-socket':**
   - elliptical eye whites (separate horizontal and vertical radii) centred on the measured centre (today it uses one radius `r` and the closed-eye centre offset);
   - no lash line while open;
   - the crimson upper glow and cream lower band drawn as blurred offset fills that follow the upper and lower lid curves, so blinks read as carved;
   - the measured eye-white gradient;
   - warm maroon shadow under the lid;
   - the native iris sprite with foreshortening;
   - procedural catchlights fixed to the light (pentagon plus oval with a warm fringe);
   - optional star twinkle;
   - closed state: a maroon tube along the lid curve (from the rig's sag 10 × 3.3 ≈ 33 px) plus the socket lighting. This look is not in the approved art and needs owner sign-off.
4. **Brows:** cubic curves, measured widths and materials, visible by default. Fall back to strip-warping the painted brow if the tube can't match it at rest.
5. **New mouth style 'grin':**
   - geometry from the measured contour, built from corners, corner bumps, upper-lip dip and lower depth so it can deform;
   - interior gradient and the heart-shaped glossy tongue, clipped to the interior;
   - no outline, but the crimson upper glow and the cream lower lip;
   - support mouthOpen → 0 (a maroon closed-smile tube), mouthRound (an O with the tongue hidden) and mouthPout (Boppo's "sad").
6. **Blush:** keep the existing add-on, using Boppo's measured cheek colour instead of the hard-coded pink.
7. **Redraw region:** compute it from the new spec, about (170–1075, 340–1035) source px. That is much larger than Noomi's, so pre-blur and cache the glow sprites by openness/scale bucket. Expect 60–100 ms per redraw unless cached, versus about 30 ms for Noomi.

## 5. Risks and the QA I would require

**Risks:**
1. **Which painting is canonical.** The hires and app Boppos differ (section 1).
2. **Large-hole skin invention.** Visible repetition, smearing, broken cells or invented shading would show in closed or happy eyes and during blinks.
3. **Clipped red channel.** Flat or posterised invented green can show up after the renderer's sRGB → linear relight.
4. **Cheek completion under the eyes.** It has to read as a natural round blush.
5. **The loop crossfades.** `restAt` crossfades to the pristine painting at 0.17–0.25 s and 14.2–14.5 s. Any mismatch between the procedural neutral face and the painting pops, and Boppo's face is far more complex than Noomi's.
6. **Gaze and squash.** The gaze range is small (iris is 0.72 of the eye width), and large eyes warp under the soft-body squash.
7. **Brand rules.** Star and glitter twinkle must not read as strobing.
8. **Render cost.** Large canvas blurs under SwiftShader.

**Required QA:**
1. **Derivation checks:**
   - Zero difference outside the mask; alpha identical.
   - A ×2.5 contrast-boosted face crop shows no ghost of the sockets, brows or mouth.
   - Green-channel texture energy per band inside the edit within ±15% of real skin.
   - Self-similarity: no two 48² blocks in the re-synthesised area correlate above 0.92.
   - Cheek model fit inside the former eye areas off by < 8 levels.
   - Blind side-by-side of real vs invented skin at 100% and 200%.
   - A relit (Lambert) preview showing no socket bumps.
2. **Rest-match:** the procedural neutral face over the clean body, compared with the pristine painting.
   - Colour difference (ΔE2000) median ≤ 2 and 95th percentile ≤ 6 within each feature mask plus ring.
   - Catchlight overlap (IoU) ≥ 0.9.
   - Mouth and brow outlines within 2 px (Hausdorff distance).
   - The crossfade windows rendered at 30 fps show no spike in frame-to-frame difference.
3. **Expression sheet at 100% and 200%:**
   - neutral; blink at 25/50/75/100%;
   - happy (^^ closed eyes), excited (eyeScale 1.2), surprised (1.3 plus O mouth), sad pout, sleepy;
   - looking left, right, up and down.
   - Pass criteria: the iris stays inside the eye white, the lid glow follows the lids, no navy pixels anywhere, no sprite upscaling.
4. **Motion filmstrip under squash:** the iris stays between 0.9 and 1.1 aspect at 15% squash.
5. **Brand:** twinkle amplitude ≤ 15%, period ≥ 1.5 s, no frame-to-frame jump > 3%.
6. **Performance:** face redraw ≤ 60 ms per sub-frame; a full 15 s render ≤ about 30 min.
7. **Owner sign-off on:**
   - the hires look as canonical;
   - the closed-eye design;
   - keeping the painted cheeks.