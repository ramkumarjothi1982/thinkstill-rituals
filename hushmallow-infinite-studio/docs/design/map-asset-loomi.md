**Loomi hi-res derivation plan**

Source: `hushmallow/assets/source/hires/loomi.webp` (1254 px). I compared it with the app's 363 px art, `loomi-body.png`, the registry, `rig.js`, `derive_noomi_hires.py`, `noomi-face.json` and `face.js`. I also ran the unchanged Noomi pipeline on Loomi as a trial, with output going to scratch only. Nothing was written under `/home/user/thinkstill-rituals`.

Coordinates are "art px", meaning the crop the Noomi pipeline makes of the source. The crop offset is (41,116), so source px = art px + (41,116). The art is 1173×1098 and the body silhouette spans [30,29,1141,1069], i.e. 1112×1041.

**Owner decision needed before any work:** the hi-res Loomi is a different version of the character from the app's Loomi.
- The hi-res art (and the lineup sheet) has 2 closed-eye arcs and a smile.
- The 363 px app art (and `approved-mallows-transparent.webp`) has 4 arcs: the upper pair are what the registry stores as "brows" (U-shaped, `alpha:1`).
- The body proportions differ too: the app art is about 0.92 wide-to-tall, the hi-res about 1.07, and the textures differ.
- Because of this, no single scale factor maps app coordinates onto the hi-res art. `specFromRig` and `loomi-body.png` cannot be used.
- My default is the hi-res look, with no brows at rest. Showing the 4-arc app look would be the owner's call.

**1. What to remove, and what to keep**

Remove:
- **Eye strokes (L and R):** glossy navy tubes, including:
  - the dark outer rim;
  - a faint violet-navy band along the lower edge;
  - the thin specular line;
  - the highlight beads on the end caps: about one 3 px white dot on the outer cap and 2–3 small glints on the inner cap.
- **Mouth stroke:** the same parts.
- **Inner-side glow (inside the U):**
  - Eyes: a dark blue glow, visible only in the green channel. It is −15 to −19 % at 4 px from the edge, −6 % at 10 px, −2 % at 16 px, and gone by about 22 px.
  - Mouth: a wider glow. Red is −96 % at 4 px, −58 % at 10 px, −20 % at 25 px, and gone by about 60 px. Green is −23 % at 4 px and gone by about 40 px.
- **Outer-side rim on the eyes:** a narrow cyan rim. Red is −75 % at 4 px, −39 % at 7 px, −18 % at 10 px, gone by about 15 px. The eyes have no measurable light band under them (2 % or less).
- **Bright band under the mouth:** it belongs to the mouth and must move with it. Red goes from a background of 57 up to 134 at 13 px below the edge, green from 208 to 240, and it fades back by about 65 px.

Not present in the hi-res art, so nothing to remove: irises, whites of the eyes, lids, lashes, brows, teeth, tongue, mouth interior, eye sparkles, glitch lines.

Keep:
- **Both cheeks with all their glints:**
  - L: centre (257.4,727.7), radius 83.7, softness 21.1, colour #fc93fb. Main glint at (248,700.6) r 8.4, plus 4 tiny glints.
  - R: centre (919.0,730.2), radius 73.6 (smaller than L), softness 17.1, colour #fc9dfb. Main glint at (927.6,700.5) r 9.2, plus 4–5 tiny glints.
- The lighter, lit area around the face (R about 45–90, G about 205–220).
- The top dimple: centre (588,207), bbox 540–672 × 146–214, with radial creases.
- The shoulder and top-rim highlights, e.g. bboxes [946,298,97,107], [159,270,54,73], [419,183,417,53].
- The see-through cyan rim around the silhouette.
- The cellular texture: cells about 26–36 px across.

Clean up: zero the colour values wherever alpha is below 2. There are about 34k coloured but transparent pixels, including the visible cyan specks above the head at source y 96–140.

**2. Difficulty and technique**

Overall this is medium-hard, harder than Noomi.
- Finding the strokes is easy. `find_features` worked unchanged: 3 strokes of 11,522 / 10,988 / 11,491 px, quadratic curve fit error at most 2.5 px, and the dimple was found.
- The hard part is the colour. Loomi is saturated and clipped:
  - 33 % of body pixels have red ≤ 5 (Noomi: 4 %).
  - 73 % have blue ≥ 250.
  - Above the eyes the texture exists only in green. Below the eyes there are different lighting conditions, and the cheeks are close.

Trial of the unchanged pipeline (143 s):
- The edit mask was 175,867 px and pixels outside it were unchanged, which is correct.
- The rebuilt area grew to 120,873 px (Noomi: 70,681) because the glow fit failed: σ hit its limit of 60, the shift hit its limit of 30, and the strength came out at 1.6.
- **Pale band above both eyes:** median red went from 2 to 12–15 and green from 170 to 183. This shows as a lighter, washed-out band.
- **Cheek spread and seam:** the cheek pink spread toward the removed left eye, and a linear seam about 50 px long appeared at about art (300–360, 683–690). It is faint lilac in RGB and obvious in the red channel. The same happens at the right cheek.
- In plain RGB the clean result looks good at a glance. The defects only show in the stretched channel views.

Reuse as is from `derive_noomi_hires.py`:
- `crop_art`, `find_features`
- the skeleton, curve-fit and arc-length helpers, `side_cos`
- the geometry and colour part of `measure_stroke`
- `laplace_fill`, `loclin_lowpass`, `norm_blur`
- `patchmatch_complete`, the seamless boundary correction
- the composite step and its checks, the JSON writer and the QA images

Generalise it into `derive_mallow_hires.py --mallow` and confirm that Noomi still comes out bit-identical.

Changes needed:
- **F1 Glow measurement:** replace the red-only formula `a = 1 - O_R/B_R` with a least-squares blend fit across all channels. Drop channels where the background is below 12 or above 245. Fit the inner and outer sides separately.
- **F2 Correction where channels are clipped:** in the glow correction, set the per-channel factor to 1 wherever the background or the art channel is clipped.
- **F3 Background estimate:**
  - Leave the cheek discs (radius + 2 × softness), the shoulder highlights and the glints out of the background estimate.
  - Treat each cheek as its own layer, using the fitted disc model. Take it out before filling and put it back after. This fixes the pink spread and the seam.
  - Weight the cheek exclusion softly instead of with a hard boundary.
- **F4 Texture matching:** the texture copier (PatchMatch) should also compare the low-pass background colour (σ about 10), or keep separate source pools for the clipped area (red below 10) and the lit face (red 30–110). Texture copied above the eye must come from red-clipped skin.
- **F5 Detail per channel:** balance texture strength separately for red and green. Add a final pass that keeps red at most base + 3 where the base red is below 6, and keeps blue at 248–255 where the neighbours are clipped.
- **F6 Edit area per side:**

  | Stroke | Inner side | Outer side | Why |
  |---|---|---|---|
  | Eyes | 40 px | 28 px | glow reaches about 22 px inside and 15 px outside; keeps the mask away from the cheek centres |
  | Mouth | 64 px | 84 px | the bright band reaches about 65 px |

- **F7 Glint detection:** lower the size threshold (area ≥ 2, or use a high-pass test) so every cheek glint is protected.
- **F8 Height map:** dimple radius about 95–100 px (Noomi used 70) to include the creases. Weight out the shoulder highlights so they are not baked into the height.
- **F9 Edge colour:** zero the colour of transparent pixels or upload pre-multiplied, then check for edges fringing on black and on white backgrounds.

Expected area to rebuild after the fixes: about 70–90k px. That much invented texture is fine, because there are about 1M px of untouched skin to sample from.

**3. Measurements (art px)**

Curves are quadratic, as `p0 / c / p1`:

| Stroke | p0 | c | p1 | Tips | Width (ends→middle→ends) |
|---|---|---|---|---|---|
| Eye L | (282.9,602.5) | (371.0,633.9) | (456.9,557.0) | (259.5,594.2)–(475.4,540.5) | 49.5 (46→51→44) |
| Eye R | (719.2,558.3) | (805.0,636.6) | (897.8,601.0) | (701.6,542.3)–(920.0,592.5) | 47.6 (42→48→42) |
| Mouth | (473.3,722.1) | (584.0,817.5) | (697.3,721.0) | (457.5,708.4)–(713.2,707.4) | 42.0 (37.6→42→37.6) |

- Eye-L curve in source px: (323.9,718.5) / (412,749.9) / (497.9,673).
- **Tilt is Loomi's signature:** the inner ends sit about 45 px higher than the outer ends. Use tilt −22.75 (L) and −21.35 (R).
- The lowest point of each eye curve is off-centre toward the outer end (t = 0.29 for L, 0.69 for R).
- The mouth is centred between the eyes (585.3 vs 589.2).

Values ready for `face.js`:

| Feature | x | y | hw / w | sag | lw | tilt | cxOff | Open-eye r | irisR | irisOff |
|---|---|---|---|---|---|---|---|---|---|---|
| Eye L | 369.9 | 579.8 | hw 87.0 | 27.1 | 49.5 | −22.75 | +1.1 | 89–91 | 59 | [+9, 0] |
| Eye R | 808.5 | 579.6 | hw 89.3 | 28.5 | 47.6 | −21.35 | −3.5 | 89–91 | 59 | [−9, 0] |
| Mouth | 585.3 | 721.6 | w 224 | 48.0 | 42 | −0.55 | −1.3 | — | — | — |

- Open-eye radius = half the tip-to-tip span × 0.80–0.82 (Loomi's rig uses 30/37.5).
- Iris radius = ⅔ of the open-eye radius.
- Open-eye centre L ≈ (369.9,572.6), R ≈ (808.5,572.5).

Stroke cross-section, from the lower edge to the upper edge:
- Lower edge rim #00083a, then the violet-navy band #0a0a41.
- Body gradient: #020e3c (lower) → #061b62 (centre) → #0a287d (upper).
- Specular line 10–12 px above the centre line, 2.5–4 px wide. Colour about #4669cd along the middle, brightening to #cfdaf2 at the inner (higher) end of each eye.
- Dark top rim #02114d, then the glow.
- `measure_stroke` core colours: #03144d, #061855, #041752.

Glow colours:
- Inner-side glow ≈ rgb(0,128,252), opacity about 0.6 at the edge.
- Outer-side rim ≈ #0096fa.
- Band under the mouth ≈ rgb(200,255,255), opacity about 0.55 at its peak, peak 13 px below the edge, σ about 22 px.

Other features: no brows, spirals or glitch rows. The iris is not in the hi-res art at all, so the existing procedural navy galaxy iris is used.

**4. What `face.js` must add**

- **Per-Mallow style:** replace the global `TUBE` constant with a style object loaded from the measurements. It should hold the colours, specular offset and width, and taper (0.88 for the eyes, 0.9 for the mouth; Noomi uses 0.8).
- **Glow on two sides:** separate passes for the inner and outer sides. Today's single symmetric blurred fill is too wide for Loomi's eyes and the wrong colour.
- **Band under the mouth, per feature:** strong for the mouth and attached to the lower lip so it follows the mouth as it opens; off for the eyes.
- **Specular strength along the stroke:** uneven, peaking toward the inner end of each eye. Make the beads whiter.
- **Brows optional:**
  - The constructor reads `spec.brows.L.c[1]` and would crash without brows; add a guard.
  - Neutral `browAlpha` is 0.
  - Do not use the registry's U-shaped Loomi "brows" for expressions; they would read as a second pair of closed eyes. Use an n-shaped brow, or the 4-arc look only if the owner approves it.
- **`specFromDerived` defaults:** remove the Noomi-specific ones (k = 2.70, brow placement relative to the rig). Derive the iris from the open-eye radius.
- **Blush colour:** `drawBlush` hard-codes pink. Use the per-Mallow `cheeks.colour` (#ff7cf5) and the measured radius of each cheek.
- **Open-eye centre:** `eyeGeom` uses y + 0.42 × sag (591 for Loomi), but the measurement file gives 572.6. Pick one.
- **Tilt when the eyes open:** `tilt × (1 − oc)` flattens the tilt as the eye opens. For Loomi, keep a little droop (lidSlant about −0.2) so it still reads as "chill". This needs owner sign-off.
- **Mouth:** closed by default. For open-mouth expressions, the inside #1a0a3a and tongue #ff6f9c match what `face.js` already uses; make them per-Mallow. No teeth.
- **Sprites:** none from the app can be reused.
  - `loomi-body.png` is the wrong version and would be upscaled about 3.2×.
  - `iris-navy.png` is 72 px (Boppo's iris recoloured) and would be upscaled about 1.65× at irisR 59.
  - The existing procedural `drawIris` already reproduces its structure: black up to 0.35 r, royal blue (5,31,168) peaking near 0.7 r, a dark rim, flecks, and a highlight at the top right.

**5. Risks and required QA**

Risks:
- The design-version mismatch above.
- Clipping causing a pale band.
- Cheek bleed and seams.
- Faint "ghost" lines along the old strokes (texture cells are 26–36 px and the gaps 50–80 px).
- A missing or doubled band under the mouth.
- Asymmetric glow that does not match the art.
- Changing the eye tilt would change the character's look.

Required QA:
- **Q1 Integrity:** bit-exact outside the mask, alpha identical, two runs give identical hashes, Noomi still comes out bit-identical.
- **Q2 Stretched channel views:** before/after at 1:1 and 3:1, green stretched 120–240 and red 0–160. These are where Loomi's defects show; RGB hides them.
  - Median red above the eyes ≤ 4 (the art has 2).
  - Low-pass colour step against the surrounding ring ≤ 2 levels.
  - Texture-strength ratio inside vs outside 0.85–1.15 per area. References: forehead 7.6, above the eye 6.0, lit face 3.4–3.9.
- **Q3 Ghost detector:** correlation of the clean image's fine detail with each old stroke's shape < 0.05.
- **Q4 Cheeks:** unchanged outside the mask; refitting the cheeks on the clean image moves centre and radius by ±1 px at most; all glints present.
- **Q5 Round trip:** clean body plus the neutral `face.js` face vs the original art, over face box art (180–1000, 470–880).
  - Colour difference (ΔE2000): mean ≤ 1.5, 95th percentile ≤ 4, 99th percentile ≤ 8.
  - Centre-line deviation ≤ 2 px; width ±5 %.
  - Cross-section and glow profiles overlaid on both sides; band under the mouth peak within ±10 %.
- **Q6 Animation stress:** blink, open eyes with lookX ±1, talk loop, squash 0.6 / stretch 1.3, and motion-blur sub-frames. Check filmstrips at the v2 framing and at the tightest close-up for leftovers of the old face and for the face staying inside the silhouette.
- **Q7 No upscaling:** art-to-screen scale ≤ 1 at every camera zoom; no sprites.
- **Q8 Owner sign-off:** 2-arc vs 4-arc version, the open-eye look, and the brow shape.

Files are in `/tmp/claude-0/-home-user-thinkstill-rituals/408ed79f-c8dc-5aa7-9180-8647f2fe949e/scratchpad/`:
- Measurement and trial scripts: `scripts/measure_loomi.py`, `scripts/glow.py`, `scripts/trial.py`
- Before/after of the trial: `loomi/trial_face_ab.png`
- Stretched channel view showing the defects: `loomi/trial_clean_GR.png`
- Close-up of the cheek seam: `loomi/trial_streak.png`
- Stretched channel view of the original art's glows: `loomi/face_GR.png`
- Trial outputs: `loomi/trial/out/`, `loomi/trial/qa/`