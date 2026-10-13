# Glitzi hi-res derivation plan

Conclusion: Glitzi needs a different approach from Noomi. Noomi's face was three painted lines, which were removed and redrawn. Glitzi's face is mostly sculpted relief: heavy textured brow-lid pads, a carved mouth groove with a lit lip mound, and open eyes. I recommend splitting the approved art into layers and keeping the painted texture wherever possible:

- **Eyes:** a new eye layer covers the whole eyeball, so nothing has to be invented behind the eyes.
- **Pads:** they stay in the body and are moved by a UV shift in the shader. No inpainting is needed.
- **Mouth:** the mouth is the only large area that needs inpainting.
- **Glitch lines and sparkles:** they go on their own emissive layer.

I wrote nothing under `/home/user/thinkstill-rituals`. Scratch work is in `/tmp/claude-0/-home-user-thinkstill-rituals/408ed79f-c8dc-5aa7-9180-8647f2fe949e/scratchpad/glitzi/`. The fit overlay is `ov_eyes2.png` and the mouth removal tests are `mouth_test*.png`.

Coordinates below are in the 1254 px source. Cropping like Noomi (alpha ≥ 2 plus 24 px padding) gives an offset of (64, 108) and an art size of 1132×1080; subtract the offset for art-space coordinates. The body's interior alpha is 251–253, the same as Noomi, so treat anything above 240 as opaque.

## 1. What to remove and what to keep

**Remove or replace:**
- **Both visible eyeballs.**
  - Sclera: white fading to lavender.
  - Iris: black pupil, orange fire band, dark maroon rim.
  - The four-point star glints and orange specks in the iris.
  - The D-shaped catchlight.
  - The violet shadow the lid casts on the sclera.
  - The black lid crease (5–9 px).
- **The mouth groove**: a near-black carved crease about 19 px wide, the lit cobalt rim just below it, and the arc of the lip mound under it.
- **Glitch streaks and sparkles inside these areas**: separate them before any inpainting. In a test, a streak next to the mouth got smeared into a magenta haze.

**Keep:**
- The cobblestone body cells.
- The cyan rim around the silhouette.
- The top pinch at (620, 260).
- The black outline and dark ring around the lower half of each eyeball, which belong to the body. This only works if eyeball size stays fixed (within ±3%) and eye stretching is turned off.
- The bumpy rim under each eye.
- The gap between the two pads.
- **The brow-lid pads.** These are also the brows. They stay in the body and are moved, not cut out.
- **The glitch streaks and sparkles**, kept but moved to an emission layer.
- **Cheeks:** the art has no blush. The registry sets the base to 0, with magenta `#ff3df2` used only for expressions, so there is nothing to remove.

## 2. Difficulty and technique

**Eyes: medium-hard, no inpainting.** The eye layer always covers the full eyeball ellipse. Fill the eyeball interior of the clean body with the socket colour `#08000d`, so any anti-aliasing seam reads as the socket outline.

The real difficulty is matching the art closely enough that the cut from the untouched painting to the animated face doesn't visibly pop. For that, I'd build the iris from the art, not purely procedurally:
- Unwrap the visible lower ~58% of the iris into polar coordinates and remove the catchlight.
- Remove the glints, fill in the hidden top by rotating and blending copies of the band, then add the glints back at their measured positions.
- Save as `glitzi-iris-L.png` / `glitzi-iris-R.png` (about 2r + 4 px, native size).

**Pads: medium, renderer work only.** Add a shader UV displacement driven by a weight map, `glitzi-lidweight.png`:
- The weight is 1 on each pad and down to the eye, fading to 0 over about 80 px of forehead.
- The fade must finish below the streak rows at y ≈ 420 and 450.
- Limits: ±28 px vertical and ±7° rotation, which keeps cell stretch at or below about 25%.
- The emission layer is not displaced, so streaks stay horizontal.

Blinks and closed eyes would stretch the pad by about 1.65×, so they need a lid-skin sprite instead: `glitzi-lidskin-L/R.png`. Build it by copying the pad's lower cells downward and baking in the eyeball curvature. Its bottom edge gets the same lit rim and black crease as the pad.

**Mouth: hardest part, about 25k px.** I tested three methods:
- Noomi's PatchMatch alone produced smeared, flat texture.
- The full Noomi pipeline at r = 5 lost half the detail: high-pass standard deviation in the hole was 12.2 against 27.1 around it. This cobblestone has far more contrast than Noomi's soft cloud texture.
- Copying a translated patch of nearby skin (offset −8, −48) and blending it in with `cv2.seamlessClone` gave crisp, believable cells.

Recommended pipeline:
1. Separate the emission layer first. Open each channel with a 9×1 kernel, then a 3 px ellipse, and treat the remainder as additive light over the body. Exclude it from the blend boundary.
2. Fill the hole with 2–4 transplanted patches cut along dark crevices with min-cut seams, so no single copied patch shows as a repeat.
3. Blend in the gradient domain.
4. Use PatchMatch only to refine seams, with patches at least as large as a cell (r ≥ 6) and a final pass that copies pixels instead of averaging them.

**What to reuse from `tools/derive_noomi_hires.py`:**
- `crop_art`, `laplace_fill`, `norm_blur` and `loclin_lowpass`.
- Step 6a (low-frequency band, which will flatten the mound's shading) and step 6f (seamless boundary correction).
- `fit_quad_bezier` and `measure_stroke` for the groove.
- `qa_images`, including the zero-difference check outside the mask.
- `height_normal`, used at a coarse level only.

**What does not carry over:**
- `find_features`: its "dark" threshold catches the whole body (median colour `#060649`). Use the tracked groove centreline and the measured top pinch instead.
- `halo_transmission`: Glitzi's lines have no glow around them.
- `fit_cheeks`: there are no painted cheeks.

The mouth itself is redrawn as a ribbon: sample the art along normals to the fitted curve, from 20 px above to 50 px below (`glitzi-mouth-ribbon.png`), feathered at the edges, and draw it along the animated curve. At neutral it reproduces the art exactly.

## 3. Measurements

### Eyeballs

Ellipses fitted to the lower outline (median residual about 0.25 px; only the lower ~55% is ever visible).

| | Centre | rx | ry | Rotation | Visible area |
|---|---|---|---|---|---|
| L | (429.5, 672.1) | 142.4 | 120.7 | −2.2° | x 286–572, bottom 792 |
| R | (827.6, 652.6) | 143.3 | 134.1 | −20.6° | x 686–974, bottom 788 |

R also fits well axis-aligned: centre (823.7, 663.2), 138.1 × 124.5. The top half of both eyeballs has never been painted, so its shape is a design choice for the owner.

### Lid edge (where the sclera starts under the crease)

- **L:** a nearly flat arc through (296, 665), (344, 667), (392, 671), (520, 673), (544, 669). It runs through the eyeball centre, so the eye is about 50% open.
- **R:** a straight line y ≈ 655 − 0.116 (x − 736), tilted −6.6° (outer end higher). The inner corner bends down to (700, 663). The eye is about 53% open.
- The two lids differ, and that difference is the approved sceptical look. Keep it as per-eye neutral values.

### Eye colours

**Lid shadow on the sclera:**

| Distance below lid | Colour |
|---|---|
| 0 px | `#8e4fad` |
| +10 px | `#c3a0db` |
| +25 px | `#e3d1f0` |
| +32 px | `#f0e9f6` |

**Sclera, by fraction of the eyeball radius:**

| Radius | Colour |
|---|---|
| 0.5 | `#fdfdfd` |
| 0.8 | `#ecdeee` |
| 0.9 | `#d3b6dd` |
| 0.96 | `#a27bb1` |
| 1.0 | `#553563` |
| 1.02–1.04 | `#08000d` (about 5 px socket line) |
| 1.07–1.12 | `#010828` (dark ring), then body colour |

### Iris

- **Circles:** L centre (486.0, 672.5), r 79.1; R centre (884.5, 654.7), r 75.5. Residuals are under 0.7 px.
- **Gaze:** offset from the eyeball centre is about (+57, +1), i.e. looking hard right (lookX ≈ +0.87 of travel, lookY ≈ 0).
- **Lid overlap:** the iris centres sit 7–8 px below the lid, so about 45% of each iris is hidden.

| Radius (fraction of r) | Colour |
|---|---|
| 0–0.40 (pupil) | `#010101`–`#070000` |
| 0.56 | `#350000` |
| 0.64 | `#c50502` |
| 0.72 | `#f45005` |
| 0.76–0.84 (fire band, R peaks `#fb880a`) | `#f77401` |
| 0.92 | `#e22008` |
| 0.955–1.0 (dark rim, about 3.5 px) | `#5c0911` → `#100016` |

- **Pupil** radius is about 0.60r.
- **Star glints** (position as fraction of r, area):
  - L: (−0.38, +0.65) 234 px², the large one at about (456, 724); (+0.16, +0.76) 63; (+0.56, +0.62) 39; (+0.73, +0.39) 11.
  - R: (−0.29, +0.69) 259, at about (863, 707); (+0.54, +0.60) 74; (+0.22, +0.71) 46; (−0.01, +0.86) 21; (+0.77, +0.27) 18.
- **Catchlight**, colour `#fdf9fe`. It is an ellipse about 0.44r × 0.36r with its top cut off by the lid, and there is no second catchlight.
  - L: x 515–545, y 670–687; centre (530.8, 678.4) = (+0.57, +0.07)r.
  - R: x 906–939, y 633–656; centre (923.0, 644.6) = (+0.51, −0.13)r.

### Brow-lid pads

- **L pad:** x 246–598.
  - The lower edge is the lid edge above, with a lit cobalt rim (`#0512a2`–`#151ca3`, 6–9 px) and the black crease below it.
  - The outer end is rounded, with a 25 px cyan rim (`#8aa7ff` / `#64a8f3` / `#0443ee`) at x 246–275, y 560–647.
  - The top fades into the forehead at about y 540–560.
- **R pad:** x 647–1011. The lower edge runs from (655, 649) to (1005, 607). The outer end is at y 553–612, with a black shadow gap at x 1012–1027.
- **Gap between pads:** x 598–647.
- **Magenta dotted streaks on the pads:** L at y ≈ 622 and 634 (x 300–590) and y ≈ 541 (x 253–368); R slopes from (680, 624) to (963, 590).

### Mouth groove

- Quadratic Bézier: p0 (496.1, 920.0), control (633.7, 827.4), p1 (803.3, 927.6).
  - Arc length 326 px, mean residual 1.3 px, apex at about (640, 875).
  - In face.js terms: centre (649.7, 923.8), width 307, sag −48.2 (a frown).
- **Core width:** 19 px (10th–90th percentile 15.8–21.2), tapering to about 10 px at the ends.
- **Colours:** the core is `#000000`–`#01010f`. Above it the colour fades through `#07114a` over 20 px. Below it, at +14 to +22 px, is the lit lip rim `#224fda`. The mound reaches y ≈ 960–980 between x 500 and 800.
- There is no mouth interior, tongue or teeth in the art.

### Glitch streaks (keep)

- Main rows: y ≈ 420 (x 258–492), 450 (603–1127), 541 (253–368), 593–614 (101–244), 726 (990–1159), 797 (805–1159), 875 (98–402), 901 (827–1155), 1020–1026 (130–530), 1042–1056 (712–1112).
- None crosses an eyeball or the groove; they stop at the pad ends and eye sockets.

### Sparkles and texture

- Sparkles: 18–36 per 10k px (49 on the nose bridge), median 6–8 px, 2–12% of them magenta.
- Cells: about 15 px across on the central face and 25–28 px on the pads and cheeks.
- Body colour: forehead median `#060649`, chin `#06043a`.

### Silhouette

- Bounding box (92, 137)–(1162, 1158), base y 1158, ground contact x 462–793.

### App art and rig coordinates

- The 383 px app art is not a uniform downscale of the hi-res art. The measured fit is x′ = 2.900x − 0.030y + 78.2 and y′ = 0.007x + 2.803y + 112.9 (correlation 0.86).
- So `specFromRig` with a single scale factor puts things about 3.5% wrong vertically, roughly 25 px at the mouth.
- The rig's eye is also 53 px lower than the measured eyeball. Use the measured coordinates, not scaled rig ones.

## 4. What face.js and the renderer need

- **Style per Mallow:** add a style registry (`noomi: closedArc`, `glitzi: heavyLid`). Move the hard-coded `TUBE` colours into `spec.tube`, and add a carved "groove" stroke: dark core, lit rim offset +0.9w, no blue glow, no highlight beads.
- **`drawEyeHeavyLid`:**
  - Fixed per-eye rotated ellipse with the sclera colours and the violet lid shadow that follows the animated lid curve.
  - A top socket line drawn only where a raised lid reveals it.
  - Iris from the derived texture (or a procedural fire iris using the colours above), catchlight clipped by the lid, and lid skin plus crease for blinks.
  - Per-eye neutral lid curve and slant.
  - "Surprise" maps to raising the pads (up to −28 px) and shrinking the iris, not to growing the eyeball.
- **Brows are the pads and are always visible.** browY, browTilt and browAsym drive the pad shift and rotation (angry means inner ends down, about 4.5° per unit of tilt). The app's `browAlpha` stroke brows are dropped.
- **Lid output to the renderer:** `Face.draw` returns `lidXform {L, R: dy, rot, pivot}`. The renderer applies it as shader uniforms, and the face canvas clips the eye opening to the same transformed lid edge.
- **Mouth:** closed by default (carved frown, from the art-derived ribbon). Smile, width, skew and wave bend the ribbon. An open mouth draws a cavity (`#140820` to `#05020c`) between the upper and lower halves of the ribbon, with a tongue (`#d4406f`) for the `tongue` parameter and no teeth. Blush is magenta, screen-blended, base 0.
- **Renderer:**
  - The emission texture skips the key-light multiply.
  - Its gain is a parameter: calm 0.3–0.5, neutral 1.0, at most 1.6.
  - Drift stays at or below 6 px/s.
  - Glitch bursts shift 3–5 rows by at most 10 px for 0.25–0.6 s, at most one every 2 s, with no flashes.
  - Lower the rim, specular and glow amounts for Glitzi, because the cyan rim is already painted and would clip.
  - Glitzi's neutral values: lookX ≈ 0.87, per-eye lidTop 0.50 / 0.47, mouthSmile −1, glitch 1.0.
- **The app's 439 px rig sprites can't be reused:**
  - `iris-amber.png` is 72 px against a needed ~155–160 px (a 2.2× upscale). It is also Boppo's iris recoloured, with a baked-in catchlight and the wrong structure (no large pupil or fire crescent).
  - `glitzi-body.png` would need a 2.8× upscale and has ghost pad outlines and green-tinted streak artifacts.
  - Everything is rebuilt at native resolution from the 1254 px art.

## 5. Risks and the QA I'd require

**Risks:**
- The cut from the untouched painting to the animated face pops if the derived face doesn't match at neutral.
- The mouth inpainting can smear, repeat patches, leave a haze from blended streaks, or leave the mound ridge visible. If that happens, limit the mouth to frown-to-flat using displacement and avoid big open smiles.
- Pad displacement above about 25% stretch looks rubbery.
- The top of each eyeball and iris has never been painted, so raising a lid shows invented geometry. That needs owner approval, so start with a raise of at most 28 px.
- The emissive streaks, sparkles and catchlights get dimmed or clipped by scene lighting.
- The webp source has colour fringing from chroma subsampling around high-contrast edges.
- Making the two eyes symmetric would change the approved design.
- Glitch bursts are the most strobe-prone element in the whole brand.

**QA:**
- **Exactness:** zero difference outside the edit masks, and alpha unchanged.
- **Recombination:** clean body + emission + ribbon reproduces the art with mean ΔE < 2 and 99th-percentile ΔE < 6.
- **Neutral render against the painting:**
  - Eye-region SSIM ≥ 0.9.
  - Lid, iris and catchlight positions within 1 px.
- **Filled-texture statistics:**
  - High-pass energy per band (σ 1–16) within 0.85–1.15 of nearby skin.
  - Cell period within ±15%.
  - Crevice darkness (5th-percentile luminance) matched.
  - Sparkle density within ±25%.
- **Repeat-patch detector:** flag any 24 px patch with NCC > 0.95 between the hole and its source.
- **Ghost and colour checks:** a 2.5× contrast-boosted ghost check, and no magenta outside the emission mask.
- **Stress clips at 1080×1920:**
  - Lid sweep and ±1.5 brow tilt.
  - Full gaze travel.
  - A 120 ms blink and a 1.5 s close.
  - Mouth from frown to smile 0.8 to open 0.6 with tongue.
  - Glitch gain from 0.1 to 2.0, with bursts.
  - Review all of these as filmstrips with `filmstrip.py` / `qa_pack.py`.
- **Flash check:** at most 3 flashes per second, with gain changes ramped over at least 150 ms.
- **Owner sign-off:** on a neutral side-by-side and an expression sheet before any production render.

The PatchMatch tests took 12–50 s for a 18–25k px hole, so derivation cost is minor. Per-frame render cost stays close to v2: the pad shift is about free in the shader, and the face canvas adds a ribbon and iris textures.