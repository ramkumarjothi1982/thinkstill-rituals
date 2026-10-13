# Zuzu hi-res derivation plan (approved art at 1254 px)

**Bottom line:** Zuzu is the hardest clean-up so far. The two spiral discs and the open mouth together leave about 308k px of skin that has to be re-synthesised, which is about 4.4 times Noomi's 70.7k px. The spiral eyes themselves are easy to rebuild procedurally from measured numbers, and a quick prototype already matches the painted layout. The app's spiral sprites and face-cleaned body can't be reused.

Nothing was written into `/home/user/thinkstill-rituals`. Measurement scripts are `m1.py`–`m12.py` in `/tmp/claude-0/-home-user-thinkstill-rituals/408ed79f-c8dc-5aa7-9180-8647f2fe949e/scratchpad/`. Images are in its `zuzu/` folder: `polar_L.png`, `polar_R.png`, `spiral_proto.png`, `ecc_align.png`, `app_body_cmp.png`, `mouth_mask.png`.

All coordinates are in source pixels of `zuzu.webp`. If the crop follows Noomi's rule (alpha ≥ 2 bounding box plus 24 px), the offset is (21, 73) and the art is 1212×1145. Art px = source px − (21, 73).

**Two "approved" versions disagree on proportions.** The app's `assets/mallows/zuzu.png` (377×386) is the same composition, but it is not a uniform downscale of the hi-res art. An affine fit (ECC, correlation 0.934) gives app → hi-res as:
- x' = 3.1366x + 0.0218y + 34.34
- y' = 0.0162x + 2.9442y + 84.96

So the hi-res art is about 6.5% wider, and the fine texture differs. App registry coordinates can only be moved across through this affine. The owner needs to confirm the hi-res art is canonical.

## 1. What to remove and what to keep

**Remove (redrawn procedurally later):**
- **Both spiral discs, whole:**
  - the cyan and magenta tube arms;
  - all white specular streaks on them;
  - the centre curl and the outer cyan ring;
  - the azure inner bevel and the dark inner shadow at the bottom of the disc;
  - the dark navy rim line.
- **The socket glow around each disc:**
  - a dark violet halo above and at the sides, reaching about 60–80 px at the top, 30–40 px at the outer sides and 20–30 px on the nose side;
  - a bright pink lit band under each disc, peaking 4–8 px below the rim and gone by about 40 px.
- **The mouth, whole:**
  - the smooth hot-pink upper lip band and the lower lip with its gloss ridge and glow (about 30 px);
  - the dark maroon interior;
  - the two-lobed heart tongue and its speculars.
- **Not present, so nothing to remove:** brows, lids, painted outlines, teeth and glitch lines (glitch lines belong to Glitzi).

**Keep in the clean body:**
- **Cheeks:** the pink blush with sparkle dust stays, as in the app (cheek `base: 1`). About 30% of each cheek's glow is hidden under or next to the disc, so that part must be completed.
- **Body highlights:**
  - the upper-left gloss at about (244–306, 366–430), only about 12 px outside the proposed eye mask, so it needs protecting;
  - (157–207, 332–388) and the top-left highlight (288–427, 184–212);
  - the left and right rim lights;
  - the bottom glints at (134–170, 1019–1077) and (1070–1112, 1016–1080).
- **Top dimple:** darkest point at (611, 251).
- **Silhouette and alpha:** untouched, bit-exact.

## 2. Difficulty and removal technique

**Difficulty:**

| Region | Rating | Why |
|---|---|---|
| Eyes | High | Two holes of about 350×335 px with nothing underneath to go on. They sit on a strong colour gradient: violet on the left, magenta on the forehead and between the eyes, hot pink on the right. |
| Mouth | Medium-high | About 78k px. It is the most exposed area, because the mouth changes shape often. |
| Cheek completion | Medium | The glow has to continue as a round blush under where the disc was. |
| Halo tails | Medium | The two eye halos overlap in the 111 px gap between the rims at y = 626. The mouth halo overlaps both eye halos by about 29k px. |

**Areas:**
- Re-synthesised zone (disc + 20 px, mouth opening + 20 px): about 308k px, 28% of the body.
- Full edit mask (disc + 80 px, mouth + 48 px): about 474k px, 43% of the body. Noomi's was 173k px.

**Reuse from `derive_noomi_hires.py`:**
- `crop_art`, `laplace_fill`, `norm_blur`, `loclin_lowpass`, `patchmatch_complete`.
- The whole step-6 pipeline: low-frequency band, base, detail normalisation, multi-band energy equalisation, seamless boundary correction.
- The bit-exact composite and its asserts, `height_normal`, `qa_images`, and the JSON writer pattern.

**Replace:**
- **Feature finding:** `find_features` and `measure_stroke` look for navy strokes. Zuzu needs cyan-disc segmentation, a rim ellipse fit, and maroon-mouth plus tongue segmentation.
- **Cheek fit:** `fit_cheeks` uses R − G, which doesn't separate pink from Zuzu's magenta skin. Fit on G or lightness instead, jointly with the pink band under each disc.
- **Halo model:** generalise `halo_transmission` so "position along the stroke" becomes the ellipse angle (and the mouth contour). Overlapping halos need either a jointly fitted product of transmissions, or the re-synthesised zone extended over the overlaps.

**Parameter changes:**
- Halo radius: 80 px for the eyes, 48 px for the mouth.
- Minimum re-synthesised width beyond the edge (`zone_vmin`): about 16–24 px. The pink band under the disc and the lower-lip gloss wash out the texture to about +20 px.
- Add one more pyramid level (`pm_levels` 5), so the 28–42 px skin cells stay coherent across a 350 px hole.

**Where texture must be invented, and how to keep it believable:**
- **What has to be invented:** both disc interiors, the mouth interior, the strongest halo bands, and the hidden part of each cheek.
- **Base shading:** don't use a plain harmonic fill over 350 px; it goes flat or overshoots. Instead:
  - fit a smooth global shading and colour field to the clean skin (thin-plate fit on a coarse grid, excluding features, cheeks and speculars);
  - use it as the prior and correct it with a harmonic fill of the boundary residual;
  - subtract the fitted cheek model first and add the extrapolated round cheek back afterwards, so the blush doesn't smear upward the way the app's version does.
- **Detail (PatchMatch):**
  - take source patches from the same side of the body, because the lighting direction on the cells flips across it;
  - guide matching by the low-pass colour of the target, plus a weak position term;
  - limit how often any one source patch can be reused, to avoid visible cloning;
  - exclude rim areas (distance to silhouette ≤ 70), cheeks, speculars, the dimple and all halos.
- **Execution:** run the three windows (left eye, right eye, mouth) separately with a fixed seed.

## 3. Measurements for the face renderer

**Disc rim (axis-aligned ellipses):**

| | Centre | rx × ry | Extent |
|---|---|---|---|
| Left | (403.3, 625.4) | 173.6 × 167.6 | x 230–577, y 458–793 |
| Right | (864.0, 622.4) | 176.7 × 168.8 | x 687–1041, y 454–791 |

- Rim line: about 4.5 px wide at half-darkness (3–6 px) on top and at the sides, colour #000397–#0404a5. At the bottom it thickens to 12–18 px and darkens to #16017c / #1c0056.
- Inner bevel: azure #028af9 about 4 px inside the rim. Bottom inner shadow: #2d09d9 / #3805cc, about 12 px wide over the bottom quarter.

**Socket halo outside the rim:**

| Side | Profile | Reaches body by |
|---|---|---|
| Top | #2726e4 at +4 → #5e13e8 at +8 → #6f07dd at +12 → #8102cc at +20 | 60–80 px |
| Outer sides | violet #7116f8 / #6c17f8 | 30–40 px |
| Nose side | #7e2cf9–#982df7 | 20–30 px |
| Bottom (pink band) | #fb92f5–#fcaaf2 at +4 to +8, #f841f6 at +20 | about 40 px |

**Spiral model:**
- Each arm is an Archimedean spiral. The phase at a pixel is f = fract(ρ/pitch − s·(φ − φ0)/2π), with ρ and φ measured in a slightly rotated, squashed frame (vertical axis scaled by the "squash" value below).
- Left and right are mirror images:

| | Spiral centre | Pitch | φ0 | Squash | Handedness | Fit error (median / p90) |
|---|---|---|---|---|---|---|
| Left | (413.7, 633.4) | 58.3 px | 330.4° | 1.048 at 6.2° | s = −1, winds outward counter-clockwise | 0.8 / 2.9 px |
| Right | (853.8, 628.4) | 59.9 px | 242.3° | 1.037 at −13.7° | s = +1, winds outward clockwise | 1.4 / 4.4 px |

- Each spiral centre sits about 10 px toward the midline and 6–8 px below its disc centre.
- About 3.0 turns per arm from centre to rim. The cyan nub starts at ρ ≈ 5–7 px; magenta starts at ρ ≈ 12 px.
- Beyond about 0.86–0.88 of the rim radius there is a cyan outer ring about 20 px wide. The magenta arm runs into the rim at about 100° (left) and 80° (right), bottom outer side.

**Colour across one turn (f = 0 is the magenta centre, moving outward):**

| Phase f | Colour | Part |
|---|---|---|
| 0 | #f007ec / #f908f5 | magenta core |
| 0.06–0.10 | #d404e7 → #bc03e5 | magenta edge |
| 0.11–0.21 | #9c03e5 → #6205e8 → #4c08eb (luminance down to about 80) | wide violet crease, about 8 px |
| 0.21–0.26 | #260fed → #0d26f1 → #056efa | |
| 0.29–0.34 | #059ffd → #04dcfc | |
| 0.36–0.72 | #06f5fe – #20fcfd (luminance about 250) | cyan crown |
| 0.74–0.82 | #0ef7fc → #07d8fd | |
| 0.84–0.86 | #14acfe → #2a3cea | narrow crease, about 2 px |
| 0.89–0.94 | #870ee8 → #c507ea → #e206eb | |

- Widths: the cyan tube is about 32–34 px; the magenta core is about 10–11 px (about 14 px with falloff).
- This crease asymmetry is the same in all directions, so it is shape, not lighting.
- **Prototype check:** this phase field with a 64-step colour table, and no shading, reproduces the painted layout. The average colour error is 15.7 / 16.7 levels (out of 255) inside 0.8 of the rim radius, mostly at band edges where the paint deviates 3–4 px from a perfect spiral. Fitting a small correction term to the phase should bring band positions within about 1.5 px.

**Spiral speculars:**
- Coverage is 4.6% (left) and 4.9% (right) of the disc area. They sit on the cyan crown and always on the upward-facing side, so the key light comes from the top, slightly left.
- Six to eight large streaks per eye, 190–670 px² each, stretched 2–3:1 along the tube (for example 61×31, 96×27 px).
- Left eye largest at (470, 495), (439, 540), (422, 692), (532, 688), (274, 541), (326, 709).
- Right eye largest at (815, 480), (831, 681), (828, 538), (933, 710), (797, 740), (970, 506).

**Mouth:**
- Opening including the lip band: x 441–813, y 802–1010. Dark inner opening: x 447–805, y 812–1010; inner corners at (447, 868) and (805, 862); centre x ≈ 626.
- Inner upper edge passes through (477, 818), (537, 832), (596, 849), (626, 850), (656, 847), (715, 830), (775, 814), with round corners of about 25–30 px radius.
- Inner lower edge is a cubic with endpoints (447, 868) and (805, 862) and control points (473, 1060) and (780, 1056); fit error 0.6 px median, 2.1 px max.
- Open depth at the centre is 160 px, which matches the app's depth of 54 scaled by 2.94.
- Upper lip band: smooth, 10–17 px thick, #e900d5 → #f103b1.
- Lower lip: inner edge #b41e5a, then a gloss ridge #fab0ed–#ffcbfe at 4–12 px below the edge, fading #f88cf2 → #f355f5 into skin by about 30 px.
- Interior gradient by row:

| Rows (y) | Colour |
|---|---|
| 812–832 | #2f0005 |
| 832–852 | #3f000b |
| 852–872 | #510113 |
| 872–912 | #68011b – #71021f (brightest) |
| 932–952 | #550115 |
| 952–972 | #3e010b |

- Tongue: x 517–736, y 914 to the lower lip. Two lobes peak at about (580, 916) and (654, 914), with a notch at (621, 921) about 6 px deep. Colours: middle #f81e60, shadow #df0337, light #fb70a6. Speculars: main about 217 px² at (677, 962), minor about 37 px² at (593, 965). No teeth.

**Cheeks (rough fits; refit in the derivation script):**

| | Centre | Radius at half strength | Softness | Aspect | Main sparkles (area, position) |
|---|---|---|---|---|---|
| Left | (277, 804) | 60 px | 25 | 1.23 | 10 total: 550 at (264, 798), 175 at (299, 817), 86 at (227, 821) |
| Right | (977, 806) | 71 px | 24 | 1.24 | 14 total: 1036 at (992, 805), 116 at (932, 826) |

- Inner colour #f9aff3 / #f9a4f1; outer halo #f946ed.

**Brows and closed lids (app values mapped through the affine; brows are not in the painting):**
- Left brow: start (256, 416), control (394, 369), end (532, 411).
- Right brow: start (727, 412), control (865, 372), end (1003, 420).
- Line width about 33 px.
- Closed lid: half-width about 163 px, sag about 41 px, line width about 33 px.

**Skin texture:**
- Cells are about 28–42 px across.
- Detail strength (high-pass standard deviation) ranges from 6.6 at the chin to 25 on the left side.
- Average colours: left #a809f5, forehead #ec04f1, between the eyes #d203e5, right #f715f7, chin #b302b2, lower left #9102d0.

## 4. What `face.js` must add

- **Per-Mallow colours instead of Noomi's:**
  - Replace the Noomi navy tube constant with tube colours from the spec. For Zuzu: core #3a0052 (registry ink), glow #5e13e8–#6b15ef (measured socket halo), highlight rgba(255,170,255,.3).
  - There is no painted Zuzu line to match, so this needs owner sign-off.
  - Make the blush colour come from the spec (#ff8cf0) instead of the hard-coded rgba(255,110,200).
  - Add a per-Mallow neutral face: eyes open 1, smile 0.9, mouth open 1, spin 0.25, brows hidden.
- **New eye style `spiral`:**
  - Socket layers: violet halo, pink band under the disc, rim line that thickens at the bottom, azure bevel and bottom inner shadow. All of these fade as the eye closes.
  - Disc interior drawn per pixel from precomputed (ρ, φ) tables: the measured colour table, tube normals from phase, and fixed screen-space lights with a deterministic streak pattern calibrated to the measured highlight coverage.
  - Highlights stay fixed while the spiral turns. That is physically right, but it differs from the app, where the sprite turns with its painted highlights.
  - Also needed: the centre nub, the outer ring with the magenta arm's exit, and mirrored spin. In the app both eyes visually flow outward, at 2.4 × spin rad/s.
  - Motion blur for the spin can be computed directly by averaging the colour table over each frame's phase step. At 1 turn/s the pattern only moves about 2 px per frame, so no extra sub-frames are needed.
  - Lids reuse the app's eye geometry with the radii above, clip the disc, and draw the lid line in Zuzu's ink.
- **New mouth style `open-lip`:**
  - The measured outline is the neutral shape. It deforms parametrically with the app's mouth parameters.
  - Draws the lip band, the lower-lip gloss and glow, the interior gradient, and the heart tongue clipped inside the opening and moving with the lower lip.
  - A closed or "line" mouth has no approved reference and needs a design decision.
- **Brows:** shown only by expression (alpha 0 at rest), drawn as an ink tube.
- **Face box:** must grow to include the 80 px socket halo and the lip glow.
- **Performance:** the spin forces a redraw every frame.
  - Cache the static layers.
  - Upload only the face box (`texSubImage2D`) in the renderer's `updateFace`.
  - Expected extra cost is about 10–20 ms of compute plus the upload per frame, small next to about 0.3 s per sub-frame.
- **Seamless loop:**
  - Total spin over the loop must be a whole number of turns.
  - Crossfading to the original painting at rest (`uRest`) is only valid when the spiral phase matches the painting's.
  - The app's rainbow overlay for happy/excited (`spiralHue`, with yellow and green) is off-palette; replace it with a cyan/magenta/violet shift, or let the owner decide.
- **App files cannot be reused:**
  - `zuzu-spiral-L.png` / `zuzu-spiral-R.png` (126 / 124 px, radius 60) would need about 2.2–2.9× upscaling to the 335–350 px disc, which breaks the "never upscaled" rule. They were also cut from the narrower app art (round instead of the hi-res 1.04 ellipse), and their highlights turn with the sprite.
  - `zuzu-body.png` (377 px) is low resolution, has horizontally smeared texture and a ghost of the discs, uses the other proportions, and has 43% of its pixels changed.
  - Rebuild everything procedurally. Use the app only as a reference for behaviour, ratios, spin rates and expression settings.

## 5. Risks and the QA I would require

**Risks:**
- **Visible patches under the eyes:** a ghost of the disc in the low-pass shading, wrong colour gradient, cell lighting that doesn't match, or cloned patches. These show whenever the eyes close or the lids drop (calm, sad and exhausted expressions).
- **Mouth area is the most exposed** because the mouth changes shape most often.
- **The pink band under the disc and the cheek glow are hard to separate.**
- **No approved reference exists** for closed-eye Zuzu, a closed mouth, or the lid and brow ink.
- **Proportion conflict** between the app art and the hi-res art (6.5%).
- **Photosensitivity:** keep spin at or below 1 turn/s, ease every speed change over at least 0.5 s, and never jump. In close-ups a disc can cover more than 25% of the frame with more than 5 stripe pairs, so cap spin at about 0.3 turns/s there or keep disc coverage under 25%.
- **The disc squashes with the jelly wave** because the face rides on the soft-body mesh. Keep deformation near the eyes moderate.

**Required QA:**
1. **Asset checks:**
   - Assert zero changes outside the edit mask and unchanged alpha.
   - Before/after crops and zone overlays.
   - Low-pass and high-pass views to catch a disc ghost.
   - Colour profiles across each hole.
   - Detail-strength ratio inside versus outside between 0.8 and 1.25.
   - A detector for repeated patches.
   - Shaded preview with the normal map under the v2 lights.
   - Review at 100% and at video scale.
2. **Neutral-face match against the original painting:**
   - Average colour error in the disc of about 5 or less (ΔE2000).
   - Band positions within 2 px; rim within 1.5 px.
   - Mouth outline overlap (IoU) at least 0.97; tongue at least 0.95.
   - Highlight coverage 4–5.5%.
   - An A/B flip GIF of the two.
3. **Animation filmstrips:** blink, close, squint, mouth open to line, a spin sweep across all expression speeds, and the loop seam.
4. **Automated flash and pattern check:** extend `verify.mjs` (fewer than 3 flashes per second in any 25% of the frame) and optionally run EA IRIS (open source).
5. **Render timing** with the spin forcing a redraw every frame.
6. **Owner sign-off** on: the clean body, the closed-mouth look, the ink colour, highlights staying fixed while the spiral turns, the spiral hue shift, and which art's proportions are canonical.