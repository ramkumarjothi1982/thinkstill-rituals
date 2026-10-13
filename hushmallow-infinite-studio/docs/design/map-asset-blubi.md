**Blubi hi-res asset derivation plan**

Everything below was measured on `hushmallow/assets/source/hires/blubi.webp`. Coordinates are source pixels on the 1254 canvas. The derived art crop (alpha ≥ 2 bounding box plus 24 px padding, same rule as Noomi) has offset (48, 114) and size 1160×1130, so art px = source px − (48, 114). Nothing was written under /home/user/thinkstill-rituals; all scratch work is in /tmp/blubi_scratch.

I also tested the plan before writing it. I ran the Noomi removal pipeline on Blubi in scratch with two changes (a 5-stroke detector and a narrow re-synthesis zone). It took 85 s on 4 cores (PatchMatch 55 s), and the diff outside the edit mask was exactly 0. The result is usable as a first draft but not shippable; the defects are listed in sections 2 and 5.

### 1. What to remove and what to keep

**Remove (5 painted strokes and everything they cast):**
- **Eyes:** 2 closed eyes, ∪-shaped glossy navy tubes. The inner corners sit lower than the outer ones (droopy, sweet).
- **Brows:** 2 painted brows, ∩-shaped tubes with the inner ends raised (a worried, "softie" look). They are part of the approved rest face, not expression-only.
- **Mouth:** 1 closed smile line.
- **Stroke highlights:** each stroke's near-white specular streak and end beads. These belong to the stroke, so they go with it.
- **Dark halo:** a saturated deep-blue glow on the top side of every stroke.
- **Contact shadow:** a dark band under each stroke, 1–3 px under eyes and mouth, about 15 px under brows.
- **Under-glow:** a cyan-white band below the eyes and mouth (strong) and a faint one below the brows. The R-channel map shows it reaching about 50–60 px. It is baked lighting tied to the stroke positions, so it would leave a ghost once the face moves. face.js has to redraw it.

**Nothing else to remove:** no irises, sclera, lids, eye sparkles, mouth interior, tongue, teeth, outlines on the body, glitch rows or spirals.

**Keep (bit-exact outside the mask):**
- **Cheek blush discs:** magenta, inner colour #fb83fb / #fb8bfb, peak (251, 148–152, 251). Each keeps its sparkles: one big glint of radius 8–9 px and one tiny one. This is the registry's `cheeks.base: 1`, the same as Noomi and as the app's `blubi-body.png`.
- **Skin texture:** the cellular "cobblestone" skin. Cells are about 25–35 px across in the face; band-pass std of G is about 5–7 there versus 10–12 at the sides and top.
- **Shoulder glints:** upper-left at (226, 281), (276, 331), (232, 376), (217, 423), (280, 461); upper-right at (1015, 412), (1044, 464), (1062, 455).
- **Top dimple:** darkest point (626, 298), core bbox (611, 272)–(649, 303), plus the lit lip glint arc around (651, 304).
- **Rims:** cyan-white left/right rims (190–204, 250, 253) and the dark bottom rim (2, 63, 201).
- **Silhouette and alpha:** bbox (75, 141)–(1180, 1213); contact row y = 1209, half-width 162, centre x 623. Interior alpha is 251–253, the same as Noomi; keep it bit-exact (Noomi's script asserts this).

### 2. Difficulty and removal technique

**Difficulty: medium-high, harder than Noomi.**
- **One big edit region:** the 64 px halo gives a single connected mask of 248,130 art px, bbox (254, 546)–(1022, 1061). Noomi's was 173,344 px. The stroke cores alone are 41,945 px.
- **Strokes are close together:** core-edge gaps are brow to eye 78.5 / 82.9 px and eye to mouth 78.9 / 79.7 px, so the halos overlap.
- **The cheeks run under the eyes:** each cheek's 50 % contour touches the outer end of the eye stroke (clearance +1.3 / −1.7 px). The cheek sparkles sit 59.4 / 59.6 px from the eye cores, so their glow is inside the halo.
- **Clipped colour channels:** body colour is about (4, 170, 252). R is near 0 and B is clipped at about 252, so almost all the texture is in G.

**Reuse unchanged from `derive_noomi_hires.py`:**
- Geometry: `crop_art`, `zhang_suen`, `skeleton_path`, `fit_quad_bezier`, `arclen_samples`, `side_cos`.
- Fill helpers: `laplace_fill`, `loclin_lowpass`, `norm_blur`.
- `fit_cheeks` works on Blubi as-is (validated).
- `halo_transmission` (2-pass product model across strokes), `patchmatch_complete`, the multi-band energy equalisation, the seamless boundary correction, and the "outside mask = 0" / "alpha identical" asserts.
- `height_normal` with the dimple above, and `qa_images`.

**What must change:**
1. **Stroke detector.** Noomi's rule (R < 70 and G < 130) picks up Blubi's own shaded body: it returned 12–72k px blobs at the dimple, the left side and the bottom. Use B < 140 and luma < 48 and alpha > 200, then the same size, position and silhouette-distance filters. That gives exactly 5 strokes: sort by y into brows / eyes / mouth, then by x.
2. **Zone A (the part re-synthesised from scratch).** Noomi's rule ("glow changes luminance > 7 %") selected 220,478 of the 248,130 px, which would throw away almost all real texture. A relative-contrast map (high-pass G divided by low-pass G) shows the cells are intact to within about 4–8 px of every stroke edge. So zone A should be the core grown by about 10 px: 68,097 px, comparable to Noomi's 70,681. The remaining 10–64 px band is zone B, which is un-blended rather than invented.
3. **Near-zero R channel.** The ratio un-blend needs a pedestal: `corr = (rgb + ε) / T − ε` with ε about (10, 2, 2), and T measured on rgb + ε and Lbg + ε. The glow fit in `measure_stroke` divides by R ("glow R ≈ 0"), which breaks on Blubi. Fit a normal blend on G and B instead (that is how the numbers in section 3 were produced).
4. **Cheek handling (prototype defect).** Noomi excludes the cheek with a hard circle. On Blubi this left a sharp elliptical seam and a light "tadpole" ghost at each outer eye end. Instead, subtract the fitted erfc cheek disc as its own layer before the glow un-blend and inpainting, then add it back analytically. It is smooth, so the pink gradient under the stroke ends comes back without having to be invented. Keep the dilated sparkle mask out of both zones.
5. **Under-glow residual (prototype defect).** In zone A the mean R came out at 18.9 against about 5 on clean skin, which reads as faint cyan bands where the strokes were. Two fixes:
   - Anchor the zone-A base layer to the thin-plate background Lbg filled from outside the whole halo, not to the harmonic fill from zone A's own boundary, which inherits under-corrected glow.
   - Add a final low-frequency pass (σ ≈ 12 px) that removes the remaining per-channel deviation from Lbg across all of zone B.
6. **Texture where it must be invented.** Zone A is five bands about 57–60 px wide, roughly two cells across, along the strokes. In the prototype, zone-A texture energy was 4.09 versus 4.36 in nearby real skin, so slightly flat. To keep it believable:
   - Take source patches only from face-centre skin with the same cell scale, within about 250 px and away from the rims, shoulder glints and cheeks.
   - Use patch radius 4–5 at the finest level so cell rims hold together.
   - Add a reuse penalty so the same cells do not repeat along a 230 px stroke.
   - Raise `band_gain_max` from 2.2 to about 2.8.
   - Check that no cell boundaries line up along the old stroke direction. An oriented-gradient test in zone A against the reference skin catches this.

### 3. Measurements for the face renderer

Stroke centrelines are skeleton-fitted. "Inner" and "outer" refer to the end nearest or furthest from the face centre.

**Left eye**
- Quadratic: p0 (331.4, 783.1), c (427.8, 879.8), p1 (543.5, 799.6). Fit residual max 2.25 px.
- Cubic, recommended (max 0.83 px): (334.7, 783.6) (382.4, 846.7) (482.1, 851.7) (537.8, 801.1).
- Tips (318.0, 769.7) / (559.1, 788.8). Length 235.4.
- Width 38.0, varying 35–40 along the stroke, fullest in the middle (taper ≈ 0.88).
- face.js terms: x 437.4, y 791.4, hw 106.1, sag 44.2, tilt +8.2 (inner corner lower), cxOff −9.6.

**Right eye**
- Quadratic: p0 (734.4, 803.7), c (843.2, 881.4), p1 (943.4, 787.4). Residual max 1.82 px.
- Cubic (max 0.83 px): (738.0, 804.2) (795.1, 855.8) (889.1, 847.6) (939.4, 788.9).
- Tips (719.1, 792.8) / (957.1, 774.6). Length 231.2. Width 37.6.
- face.js terms: x 838.9, y 795.5, hw 104.5, sag 42.9, tilt +8.2, cxOff +4.3.

**Left brow**
- Quadratic, enough here (residual 0.95 px): p0 (369.3, 677.0), c (428.2, 630.6), p1 (499.6, 630.7).
- Tips (353.9, 689.2) / (519.2, 630.7). Length 141.1.
- Width 39.2 (38–40.5), nearly uniform, so taper ≈ 0.95–1.0.
- The arc rises from the low outer end and flattens toward the high inner end; the inner end is 46 px higher.

**Right brow**
- Quadratic: p0 (788.4, 632.9), c (855.7, 631.7), p1 (908.6, 675.9). Residual 0.73 px.
- Tips (768.8, 633.2) / (923.6, 688.5). Length 130.6. Width 39.2.

**Mouth (closed smile, the rest state)**
- Quadratic: p0 (535.1, 937.4), c (633.2, 1019.2), p1 (734.4, 935.8). Residual 1.97 px.
- Cubic (0.87 px): (538.5, 938.0) (588.5, 991.5) (680.1, 989.6) (730.0, 937.1).
- Tips (520.9, 925.5) / (748.6, 924.0). Tip span 227.7 matches the rig's w; face.js uses the p0–p1 chord, 199.3, so watch the convention.
- Centre (634.8, 936.6), sag 41.3, width 37.0 (35–38.4, taper ≈ 0.92).

**Stroke colours**
- Core #00073b–#010a44 (Noomi's was #01185c, so Blubi is darker and more indigo). Registry ink #050a3a agrees.
- Lighter band 6 px inside the top edge ≈ (6–15, 23–41, 83–121).
- Darker band 6 px inside the bottom edge ≈ (0, 0–2, 30–51).
- Specular core is near-white, #f4f8ff–#ffffff, with a bluish falloff. It sits 10.5–12.4 px (0.28–0.32 × width) above the centreline, with half-max width 2.5–8.5 px.

**Highlight placement**

| Stroke | Brightest highlight | Bead |
|---|---|---|
| Left brow | streak along the top edge at t 0–0.3 (outer end) | (508.2, 621.8), inner end |
| Right brow | long glint (845.5, 628.4), t 0.41 | (907.1, 659.5), outer end |
| Left eye | (422.1, 821.7), t 0.44 | (356.8, 792.4), outer end |
| Right eye | (809.2, 823.8), t 0.34 | (932.7, 785.0), outer end |
| Mouth | (602.5, 960.8), t 0.32 | (723.2, 932.6), right end |

**Glows**

Above every stroke: a dark glow, normal-blended toward about rgb(0, 0, 215–244).

| Stroke | Edge opacity | σ (px) | Reach (px) |
|---|---|---|---|
| Eyes | 0.69 / 0.66 | 6.7 / 7.3 | 45–54 |
| Mouth | 0.64 | 11.3 | 60 |
| Brows | 0.68 / 0.71 | 14.6 / 12.6 | 51–52 |

Below each stroke:

| Stroke | Contact shadow | Under-glow peak | Colour at peak | Extent |
|---|---|---|---|---|
| Eyes | 1–3 px | ×1.32 / ×1.23 luma at 11–13 px | (68, 204, 252) / (87, 214, 252) | 50–60 px |
| Mouth | 1–3 px | ×1.36 at 12 px (R +116, G +34) | (130, 235, 253) | about 50 px |
| Brows | about 15 px, from 0.45 at the edge | weak, +4–8 % at 31–33 px | – | – |

The brows show the same dark-above / light-below pattern as the ∪ strokes. So glow sides follow the light direction (face.js's "upward normals"), not the curve's concave side.

**Cheeks**
- Left: centre (300.8, 890.4), radius at 50 % 80.6, edge σ 21.8, aspect 0.96.
- Right: centre (969.5, 895.9), radius 82.2, σ 21.8, aspect 1.08.
- Sparkles: left (303.9, 864.0) r 8.4 and (343.2, 880.2) r 1.9; right (975.5, 864.2) r 9.0 and (944.5, 887.5) r 1.8.

**Open eyes (not in the painting; follow the app rig)**
- Socket radius about 94.5 / 93.3 (34/43.5 of the half tip-span, the registry ratio; Noomi's 36/44 ratio would give 98.9 / 97.6).
- Socket centres (437.4, 809.9) / (838.9, 813.6).
- Iris radius 23 × 2.70 ≈ 62 px, offset about 8 px toward the nose. Use the approved navy galaxy iris design: black core, navy to #0024c4 outer ring, star flecks, large upper catchlight.
- Clearance between socket top (about 715) and the left brow's outer-end lower edge (about 697) is about 18 px at eyeScale 1 and about 7 px at eyeScale 1.12.

**Rig-to-hi-res mapping:** source px = rig px × 2.70 + (63.5, 133.1). Where the registry and the painting disagree, use the measured values:
- Eye sag: rig 19.5 × 2.7 = 52.7 versus measured 44.2.
- Brow width: rig 12 × 2.7 = 32 versus measured 39.2.

**Mouth when open (no painted reference):** use the registry's `inside` #2a0a3a and `tongue` #ff6f9c. Blubi has no teeth anywhere in the approved art, so don't add any.

### 4. What face.js must add, and sprite reuse

1. **Per-Mallow style object** in place of the hard-coded Noomi `TUBE` values: core, edge and band colours, specular colour and width, dark-glow colour, opacity and σ per stroke, and an under-glow colour and strength per stroke (mouth > eyes > brows ≈ 0). Under-glow should be cyan and screen-blended, not `rgba(255,255,255,.2)`.
2. **Per-stroke specular profile and beads** as listed above, keyed to t, instead of the symmetric fade.
3. **Painted brows always visible.** Default browAlpha 1, taken from the derived JSON rather than the rig. Taper about 0.95 (currently 0.6) and glow 1 (currently 0.6). Add `browAsym` and `browCurve`: Blubi's angry and frustrated expressions use browTilt −1.4 and browAlpha 1.
4. **Cubic rest curves for eyes and mouth.** The renderer cross-fades to the pristine art at rest, so a 2 px mismatch shows as a visible pop.
5. **Per-stroke taper** of about 0.88 for eyes and 0.92 for mouth (currently 0.8).
6. **Per-Mallow neutral pose:** browAlpha 1, eyeOpen 0, closedCurve 1, mouthSmile 1, mouthOpen 0, extra blush 0. Honour the app's eyeGate [0.38, 0.85]: Blubi's eyes open only for strong emotion.
7. **Expression features face.js doesn't have yet:**
   - Tears and wet eyes. These are Blubi's signature ("beautifully dramatic", droplet): glossy tear tracks about 16 px wide, (190, 235, 255) with a white core, falling from the outer part of each eye across the cheek.
   - mouthPout, mouthTremble (keep it at 6 Hz or below and small, so it never reads as shaking), cheekPuff.
   - Per-Mallow mouth inside and tongue colours (currently hard-coded #1a0a3a and #ff8ab0).
8. **Blush colour and blend:** use the measured magenta (registry #ff7ef0) with a screen blend at the measured cheek centres, adding extra blush on top of base 1.
9. **Brow lift when eyes open:** couple browY to eyeOpen × eyeScale so an open eye never hits the brows.
10. **Performance:** 5 blurred tubes instead of 3 means about 1.7× face redraw cost when the face changes. Cache the brows in their own layer while their parameters are unchanged.

**Sprites: none of the app's can be reused.** The only Blubi-specific rig file is `blubi-body.png` at 414×417, which is the hi-res art divided by 2.70. At v2 framing (scale 0.56, zoom up to 1.075) one art pixel is about 0.6 screen px, so that file would be upscaled about 1.6×, and its face area is a smeared low-frequency patch anyway. The shared `iris-navy.png` is 72 px (a recoloured Boppo iris). At iris radius 62 art px it would be upscaled about 1.1× at v2 framing and 1.5× or more in any close-up. Rebuild everything procedurally; the existing `drawIris` already reproduces this iris design. Use the 414 px files only for the coordinate mapping above.

### 5. Risks and the QA I would require

**Regression risk:** refactor the script into a generic `derive_mallow_hires.py` with a per-Mallow config. Re-run it on Noomi and require byte-identical `noomi-*` outputs, so the approved v2 assets cannot change.

**Required checks on the clean body:**
- **Mask integrity:** maximum diff outside the mask = 0 and alpha identical (asserts).
- **Glow residue:**
  - R-channel map of the face: it must look like the forehead, with mean R in zone A and in zone B each within ±3 of the clean-ring mean (prototype failed: 18.9 vs about 5).
  - Cross-stroke luminance and G profiles must be flat within ±1.5 levels over ±60 px.
- **Texture:**
  - The ×2.5 contrast-boosted face and the relative-contrast map must show no stroke-shaped ghost, no arcs at the cheeks, and no flat bands.
  - Band-pass energy in zone A must be 0.9–1.1× that of nearby real skin.
  - Check PatchMatch source reuse and look for autocorrelation peaks (repetition).
- **Cheeks:** the cheek fit before and after must agree within 1 % in centre and radius, sparkles untouched.
- **Lighting sweep:** run the light direction through 8 positions on the clean body and normal map with no engraved face. Height-map ghosts show up only under moving light.

**Required checks on the face renderer:**
- **Rest-state match:** procedural rest face over the clean body against the approved art must have mean ΔE below 2 in the face box, centrelines within 1 px, widths within ±1 px, and highlights in the same places. Add an A/B toggle clip of the pristine cross-fade to check for a pop.
- **Style:** side-by-side 2:1 crops of every stroke, procedural versus painted.
- **Expression sweep contact sheet:** neutral, happy squint (closedCurve −1), eyes opening 0 → 1.2 with eyeScale 1.12, sad with tears and wet, angry brows, open mouth from double-tap, pout and tremble. Check for brow–eye collision, under-glow flipping correctly with the curve, and tear tracks over the blush.
- **Filmstrips** at the final 1080×1920 framing, including the closest planned zoom, to confirm nothing is upscaled.
- **Brand:** tears stay gentle, with no strobe, no shaking and no medical framing.

**Prototype files (scratch only):**
- Clean draft: `/tmp/blubi_scratch/proto_out/noomi-clean.png` (it keeps the original script's file name)
- Previews: `/tmp/blubi_scratch/p2_face.png`, `p2_face_boost.png`, `p2_R.png`, `p2_rel.png`
- Measurements: `/tmp/blubi_scratch/strokes.json`, `glow.json`
- Scripts: `/tmp/blubi_scratch/meas.py`, `glowfit.py`, `cheeks.py`, `proto2.py`