# mallows

## Summary
TODAY'S RENDERING (verified in Chromium at 390x844 @3x). Each Mallow is one MallowRig (src/mallows/rig.js:82, `new MallowRig(container, {id, interactive, pristine, fit:0.64, baseline:0.88, reducedMotion, audio, haptics, particles, shadow, aura})`). It draws a single 2D canvas inside `#mallow-layer`. That layer is sized `min(86vw,430px) x min(56vh,470px)` and positioned with a CSS translate+scale(--ms) (app.css:13-15). Each frame is drawn in two passes:
- **Skin pass** (`_renderSkin`, rig.js:674-721). It draws the face-cleaned body PNG, then Glitzi's glitch lines, then the eyes (lid-clipped sclera gradient, iris sprite moved by gaze, sparkle, heart eyes, wet gloss, rim, lid shadow and lid line). Zuzu gets rotating spiral sprites plus a conic colour tint instead. Then brows and mouth (glossy strokes, open mouth with tongue), then the untouched approved PNG cross-faded in with source-atop whenever the face is at rest, then cheeks/blush/puff, then tears and sweat. The result goes into an offscreen `skin` canvas at q = clamp(S*dpr*1.05, 0.28, 1.25) (rig.js:257).
- **Warp pass** (`_render`, rig.js:585-672). Contact shadow, aura, then the skin drawn as N=clamp(bodyH*S/5, 22, 72) horizontal strips. Each strip has its own width (squash, breath, droop, cheekPuff bulge) and offset (lean, shear, Glitzi row slices), with tremble/tilt/spin on top. Then screen-space ParticleField.

Measured sizes: layer 335.4x470 CSS px; canvas 670x940 device px (dpr is clamped to 2 at rig.js:242 even on a 3x phone); S 0.519-0.599, so every Mallow's body is about 213x215 CSS px. Skin canvases are 454-479 x 458-485 px, made from 363-439 px source art, so the art is upsampled about 1.2x in the skin and about 1.7x on a 3x screen. The Boppo body uses 43 strips.

Expression model: 62 spring-driven parameters in 7 spring groups (eye 8, gaze 2, cheek 15, brow 5, mouth 8, body 14, fx 10), 28 presets, per-Mallow PERSONALITY overrides and eye gates, and 10 STAGES, all combined by `resolveExpression` (expressions.js:253).
- `react(kind)` (rig.js:199) pushes an overlay with an envelope (18% attack, 62-100% release), adds body impulses, a signature particle burst, a sound and a haptic.
- There is one shared requestAnimationFrame loop (rig.js:43-62). dt is clamped to 0.05 s, springs are substepped at 1/120 s, and rigs that are hidden or off-screen are skipped.
- The skin is cached by `_faceSignature` and redrawn only when the face changes. Zuzu and Glitzi are always "animated", so their skins redraw every frame.

Measured JS time per frame (unflushed): 0.2 ms at rest, 2.3-3.9 ms with an active expression, 3.1-3.9 ms always for Glitzi and Zuzu. Forcing the raster (Glitzi excited): skin 2.8 ms + strip warp 3.7 ms. SwiftShader software rendering on a loaded shared machine; a real iPhone GPU should be much faster.

Today's squeeze is a global squash spring plus a yes/no squeezeFace after 0.35 s of holding. There is no local dent. The screenshots I took confirm it reads as flatten/lean, not soft-body.

TWO BLOCKERS I VERIFIED:
- **(B1) The home screen Mallow cannot be touched at all.** `#scene > * {pointer-events:auto}` (app.css:22) makes the full-height `.home` root take every touch. `elementFromPoint` over the Mallow returns DIV.home, and a real CDP touch-hold gives press=false. With `.home` made click-through the hold works (press and squeezed true, body.press 1.0, squash 0.20). So audit question 1 ("Can a user squeeze a Mallow immediately?") fails today.
- **(B2) Touch hit-testing breaks whenever the layer is scaled.** `_resize` reads getBoundingClientRect, which includes the CSS scale, but ResizeObserver never fires on transform changes. `_toLocal` returns screen px. After `place({scale:0.5})`, rig.W stays 335 while the rect is 167.7, and `_hit` at the visible body centre returns false. The canvas resolution also never follows the scale.

TEXTURE PATH (question 2). The cleanest per-frame RGBA source is the existing `rig.skin` canvas (the full live face on the body, before the warp). Proposed changes:
- Add a headless rig mode, a `skinSize` override for the q clamp, and a `skinVersion` counter.
- Upload with texSubImage2D of a fixed per-Mallow face rectangle, only when the skin actually changed. Never use getImageData or createImageBitmap per frame.
- Move Glitzi's glitch lines and Zuzu's spiral rotation into the shader or a small sprite, so their skins stop redrawing every frame.

Measured (SwiftShader):

| | 512 px | 768 px |
|---|---|---|
| Skin raster | 3.1 ms | 5.5 ms |
| Full texImage2D | 5.0 ms | 9.1 ms |
| Face-rect only | 0.9 ms (376x294) | 1.9 ms |

SOFT BODY (question 3). Recommended: a hybrid of global shape matching (linear part normalised by determinant, so area is preserved) and lattice shape matching with 3x3 regions (FastLSM) on a 23x23 vertex grid over the bodyBox, plus a per-quad area constraint, a floor constraint and a rest shape driven by the expression.
- A prototype took 0.17 ms per frame (p95 0.35) for 529 particles at 2 substeps. Global shape matching alone (489 particles x 4 substeps) took under 0.1 ms. A mass-spring lattice (2714 springs x 8 substeps) took 1.0 ms, needs stiff substepping and has no area preservation. So shape matching is preferred.
- One mesh fits all seven Mallows: their silhouettes overlap almost exactly (pairwise IoU 0.972 or more). A superellipse with n=3.0 matches the family mask at IoU 0.955.
- The 2D fallback is costly as a triangle warp: 10x10 grid 8.2 ms, 14x14 12.2 ms, 20x20 19 ms (software). Hence a tiered fallback: WebGL mesh first, then a 10x10 triangle warp, then the existing strip warp driven by the solver's row extents.

HIGH-RES ART (question 6).
- glitzi-hires and zuzu-hires are redraws, not upscales. Glitzi's aspect changes 0.992→1.048 and its eye centres move about 1.8% of body width. Zuzu's aspect changes 0.978→1.064 and its spirals sit about 3.3% higher. Similarity after blurring is 0.84 for Glitzi and 0.88 for Zuzu. So every rig coordinate needs re-measuring and the face-cleaned body needs redoing; scaling the old coordinates is not enough.
- **blue-closed-eyes-hires is not a clean Blubi or Loomi.** By colour it is Loomi: hue 196.6° vs Loomi 197.1° and Blubi 200.7°; median RGB 32,191,252 vs Loomi 5,181,251 and Blubi 5,166,251. But it has no brows, and both Blubi and Loomi have brow arcs above the closed eyes. Its single closed-eye arcs, mouth and proportions match Noomi within about 0.02 of body size (aspect 1.068 vs Noomi 1.044, Blubi 0.995, Loomi 0.920). So if forced to choose: Loomi by colour. But dropping it in would remove Loomi's approved brows, so the owner needs to confirm what it is.
- logo-mascot is a new pastel character (galaxy irises, brows, sparkly blush). It is not one of the seven and should stay brand-only. hushmallow-logo.webp is RGB on white, with no transparency.
- tools/build-site.sh:16 ships only assets/mallows, assets/rig and assets/fonts, so the brand folder is never published.
- Verdict: re-rig Glitzi now (hero of Static Storm) and Zuzu next. Keep the other five on current art until their high-res files exist and the blue file is confirmed.

ETA for this rendering workstream (agent build time on this shared machine; estimates, not commitments; excludes owner testing on a real iPhone):
- B1/B2 fixes and the headless rig/skin API: about 1 h.
- MallowTouch (solver, gestures, WebGL renderer, character table, fallbacks): about 5-7 h build plus 2 h QA at 375/390/430 and desktop.
- Thought Mallows: about 3 h.
- Glitzi and Zuzu high-res re-rig: about 2-3 h (OpenCV is not installed here; tools/detect.py and derive.py need it).
- The other five Mallows: about 1 h each once their art arrives.
- So pilot-ready rendering is about 1.5-2 agent-days. Full product (all seven high-res, Belief Mallows, per-character tuning, real-device performance pass) is about 2-3 more days after the art and device feedback arrive.

## Keep
- src/mallows/expressions.js (whole file): PARAMS (62 params, 7 spring groups), GATES, PRESETS (28), PERSONALITY (per-Mallow overrides + eyeGate + energy), STAGES (10), baseParams(), resolveExpression(mallow, mix, intensity, extra), describeExpression(). The emotion vocabulary for MallowTouch faces and for Thought Mallows (with a generic face spec).
- src/mallows/reactions.js (whole): _shared plus per-Mallow tap/doubleTap/flick/release/idle/celebrate/glitchBurst and squeezeFace overlays. Reuse as the per-Mallow gesture responses; squeezeFace becomes graded by squeeze depth.
- src/mallows/rig.js face renderers drawEye/eyeGeom/drawBrow/drawMouth/drawCheeks/drawTearsAndSweat/drawGlitchLines/tube (rig.js:745-1219), the parameter spring loop with 1/120 substeps (_tick rig.js:361-396), _composeTargets overlay envelope + gaze saccades + yawn/sigh cycles (398-460), blink (_updateCycles 462-502), the pristine approved-art crossfade (711-717) and _faceSignature skin caching (723-731). These produce the live face texture and must not be rewritten.
- src/mallows/rig.js strip warp _render (585-672). Keep as the lowest fallback tier, but drive its per-strip width/offset from the soft-body solver's row extents.
- src/mallows/rig.js shared rAF ticker plus visibility/IntersectionObserver gating (43-65, 144-147, 271-275). Extend with addTicker() so MallowTouch, Thought Mallows and realms share one loop.
- src/mallows/registry.js MALLOWS face specs (eyes/brows/mouth/cheeks in source px, bodyBox, size, colours, signature, realm), the SPRITES map, the loadImage cache and loadMallowAssets(id)->{original, body, sprites}.
- src/mallows/particles.js ParticleField: each Mallow's own particle style (shard, drop, ring, pop, spark, ribbon, moon, z, steam, puff). Keep as a 2D overlay above the GL mesh; only geo() needs the deformed bounds.
- assets/mallows/*.png (approved cut-outs, 363-439 px) and assets/rig/*-body.png, irises and spirals: the source of truth until high-res re-rigs land.
- tools/extract.py, tools/detect.py, tools/derive.py, tools/features.json: the art-to-rig pipeline, reused for the high-res re-rig (needs numpy, PIL and OpenCV; OpenCV is not installed in this container).
- src/v3/words.js excerpt(text,42), createWords(input) (keeps the person's exact text in .full) and drawWords(g,text,x,y,{style:'plate',...}) for Thought Mallow tags; src/v3/fx.js Rope/Spring/Spring2/Particles/wrap/motes/glow for tethers and Thought Mallow material.
- src/engine/audio.js play(mallowId, name, opts) with MALLOW_SOUNDS incl. 'press','squeeze','release', and hold(name,{...})->{update({intensity,pitch}), stop()} with HOLD_SOUNDS ['charge','ground','drain','hum']: drive a continuous squeeze sound from depth.
- src/engine/haptics.js haptic(kind) with rate limiting and hapticsChannel(): the only working iOS path is the native/webkit bridge (navigator.vibrate is not supported in iOS Safari).
- src/mallows/voices.js encounterLine(mallow, family): authored, rule-based Mallow lines for the subtitle layer.
- framer/HushmallowEmbed.tsx: the iframe embed keeps Framer from parsing the app, so WebGL lives entirely inside the hosted app (no Framer payload impact).

## Integration points
- src/app/ui/app.css:22 `#scene > * { pointer-events: auto; }` together with src/app/scenes/home.js:36 (`.home` root, height 100%) is blocker B1. The new Hushfold scene root must be `pointer-events:none`, with only its controls set to `auto`.
- src/mallows/rig.js:278-281 `_toLocal(e)`. B2 fix: `const r=this.canvas.getBoundingClientRect(); return { x:(e.clientX-r.left)*this.W/r.width, y:(e.clientY-r.top)*this.H/r.height }`. Also re-run `_resize()` from world.place() (world.js:89-94), since a CSS scale never triggers the ResizeObserver (rig.js:142).
- src/mallows/rig.js:82-162 constructor: add `opts.headless` (no visible canvas, no _bindPointer, still loads assets, springs and skin) and `opts.skinSize` (target max side px; overrides the 1.25 clamp at rig.js:257: `q = skinSize / Math.max(...m.size)`).
- src/mallows/rig.js:674-721 `_renderSkin()` → expose `renderSkin(): boolean` (true when pixels changed) and increment `this.skinVersion` after drawing. In headless mode skip `_render()`. Add `faceRect()` returning the union of eyes (±rx·1.4·1.3 scale), brows, mouth (incl. depth·1.4 and tongue), cheeks (±1.5r) and tears, plus 16 src-px pad, in skin px for texSubImage2D.
- src/mallows/rig.js:369-375 and 407-411: replace the boolean `press.squeezed` with `this.touch = {depth, stretch, lag, calm}` set by a new `setTouch(state)`. In `_composeTargets`: `goal[k] = lerp(goal[k], sq[k], smoothstep(0.05,0.6,depth))`, `cheekPuff += 0.7·depth`, `lidBot += 0.4·depth`, `eyeOpen *= 1-0.6·depth`.
- src/mallows/rig.js:510-582 `_updateBody(dt, goal)`: in MallowTouch mode keep only hop/tilt/spin/glitchBurst as a rigid transform. squashBias, droop, breath, cheekPuff, shrink and leanBias become rest-shape inputs to SoftBody.setRest().
- src/mallows/rig.js:41 GLITCH_ROWS (source-px rows): pass to the GL shader as `uniform vec2 uGlitch[9]` (row v, shift) so Glitzi's skin stops redrawing every frame. The `animated` test at rig.js:677 then drops 'glitzi' and 'zuzu' (spirals as two rotated sprite quads, or a dirty rect limited to the spiral circles).
- src/mallows/rig.js:43-62 ticker: export `addTicker(fn)` / `removeTicker(fn)` so the MallowTouch stage, Thought Mallows and realms share one requestAnimationFrame.
- src/mallows/particles.js:21-27 `geo()`: read `rig.geoOverride?.()` (deformed mesh bounds: cx, top, bottom, w, h, mid) when present, so bursts spawn from the squashed or stretched body.
- src/mallows/registry.js:288 `loadMallowAssets(id)`: also return `mask` = Float32Array 64x64 alpha sampled from the body PNG, for mesh culling, hit-testing and particle mass.
- src/app/world.js:54-74 `setMallow(id, {entrance})`: construct `new MallowTouch(holder, {id, reducedMotion, audio, haptics, quality:'auto'})` behind a pref/flag. Keep `api.rig` returning the inner headless MallowRig, because scenes call world.rig.on/react/setEmotion (world.js:23, home.js:85).
- src/app/world.js:88-110 `place({x,y,scale,calm})`, `fitBetween(top,bottom,{maxScale,x})`, `mallowRect()`: keep the signatures. In the Hushfold, implement them as a JS-spring stage transform instead of the CSS scale(--ms) at app.css:14, so hit-testing and raster resolution stay correct.
- src/app/world.js:58 `particles: !prefs.get('lowStim') || true` is always true, so the low-stimulation pref is ignored. Fix when wiring MallowTouch.
- src/mallows/expressions.js:244/253 `baseParams(mallow)` / `resolveExpression(mallow, mix, intensity, extra)`: call with a synthetic GENERIC_THOUGHT face spec (`{id:'thought', face:{neutral:{...}}}`); PERSONALITY then falls back to energy 1 with no overrides.
- src/mallows/reactions.js:13 `_shared.squeezeFace` and per-Mallow squeezeFace (lines 31, 46, 59, 72, 85, 98, 111): become depth-weighted targets.
- src/engine/audio.js:1560 `play(mallowId, name, opts)`, :1581 `hold(name, opts) → {update({intensity,pitch}), stop()}`: squeeze is hold('charge'), updated with intensity=depth and pitch from stretch; on release, stop() then play(id,'release').
- src/engine/haptics.js:67 `haptic(kind)`: 'light' on contact, 'soft' at depth thresholds 0.33/0.66, 'pop' on release when depth > 0.5, 'tick' per massage turn (already rate-limited).
- src/v3/words.js:15 `excerpt(text,42)`, :28 `createWords(input)`, :54 `drawWords(g,text,x,y,opts)`; src/v3/fx.js:233 `class Rope`, :313 `FONT` (Fredoka; replace with the typography-token family for Thought tags).
- tools/build-site.sh:16 `cp -r assets/mallows assets/rig assets/fonts` sets what ships. High-res replacements must land in those folders, or the cp line must change; assets/source/brand is never published.
- tools/detect.py:16-37 ROI table (hand-placed boxes in roughly 380 px space) and tools/derive.py:21 GLITZI_EYES (hand-measured): both need re-authoring for 1254 px art (×~2.8–2.9 with re-centring).

## Proposals
### 0. Fix the two touch blockers before anything else
B1: the Hushfold scene root (and .home until it is retired) gets `pointer-events:none`, with `pointer-events:auto` only on buttons, chips and inputs. Add a regression test in tests/: elementFromPoint at mallowRect().cx/cy returns the stage canvas at 375/390/430. B2: apply the _toLocal scale fix (rig.js:278) and call rig._resize() after place(). For the new stage, drop the CSS scale entirely and use a JS-tweened model transform. Without these fixes no squeeze work is testable on home.

### 1. Texture source: headless rig plus dirty-rect upload (no new face renderer)
MallowTouch owns a headless MallowRig as its 'face brain' (springs, overlays, blink, gaze, pristine crossfade, cached skin).
- Skin size: `skinSize: 640` for current art (q 1.46-1.76, crisp face vectors, body upsampled) and 1024 for high-res art.
- Each frame: `if (rig.renderSkin()) gl.texSubImage2D(TEXTURE_2D, 0, fr.x, fr.y, RGBA, UNSIGNED_BYTE, faceCanvas)`, where faceCanvas is a reused canvas the face rect is copied into (or upload the whole skin when the rect is over 60% of it).
- Upload the full skin once at load and when restMix crosses 0/1.
- `gl.pixelStorei(UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)`, blend ONE / ONE_MINUS_SRC_ALPHA, LINEAR filtering, CLAMP_TO_EDGE, no mipmaps (sizes are not powers of two in WebGL1).
- Measured: full 512 upload 5.0 ms vs face-rect 0.9 ms; full 768 upload 9.1 ms vs face-rect 1.9 ms.
- Avoid getImageData (CPU readback) and per-frame createImageBitmap (async allocation). Shadow, aura and particles stay in 2D canvases under and over the GL canvas.

### 2. SoftBody solver: lattice shape matching + global shape matching + area (src/mallows/touch/softbody.js)
`class SoftBody { constructor({cols:22, rows:22, mask, material}); setRest({sx, sy, droop, puffL, puffR, cheekUV, shrink, breath}); press(id,x,y,depth,r); grab(id,x,y,r); move(id,x,y); release(id,{vx,vy}); impulse(vx,vy,{x,y,r}); step(dt); positions:Float32Array(529*2); uvs; indices:Uint16Array(968*3); bounds(); rowExtents(); energy }`. Body-local units are the bodyBox normalised to 0..1, mapped to the stage by S.

Each fixed 1/120 s substep (accumulator, at most 4 per frame, so it behaves the same at 60/120 Hz and in iOS Low Power 30 Hz):
1. Predict positions.
2. Global match: centroid, Apq, closed-form 2x2 polar rotation; `goal = (β·A/√|det A| + (1-β)·R)·q + c`, blended in with kG.
3. Local 3x3-region match (FastLSM sums), blended with kL. Raise kL by 1.5x inside the face mask so the approved face stays readable.
4. Per-triangle area projection (compliance 0.3).
5. Floor constraint `y <= 1` with friction 0.8.
6. Velocity from position change × damping.

Rest shape is recomputed from expression params each frame (squashBias, breath·0.014·sin, droop, cheekPuff as a Gaussian push at registry cheek UVs, amplitude 0.045·W; shrink 0.12). Measured: 0.17 ms per frame (p95 0.35) for 529 particles at 2 substeps. Pick this over a mass-spring lattice (1.0 ms at 8 substeps, unstable under flicks, no area preservation, sags) and over global-only matching (no finger dents).

### 3. Touch reader: iPhone-safe squeeze depth and gesture-to-force mapping (src/mallows/touch/gestures.js)
`class TouchReader { constructor(el, {toLocal}); on(kind, fn) }`. Multi-pointer via pointerId map + setPointerCapture. Canvas styles: touch-action none, -webkit-user-select none, -webkit-touch-callout none; `gesturestart` preventDefault for Safari. Pressure is ignored (0 or a constant 0.5 on iPhone 11+).
- **Press/hold depth:** `d = dMax·(1-exp(-t/0.45)) + 0.15·clamp(path300ms/40px)` (kneading deepens). Contact radius `r = max(0.22·bodyW, 1.6·pointer.width)`. The solver applies a moving plunger constraint: particles within r cannot rise above `touchY + d·H·exp(-dist²/2r²)`; area preservation bulges the sides.
- **Pull:** starts once moved more than 10 px. Grab springs `k = 0.6·exp(-dist²/2σ²)` with σ = 0.3·bodyW. They slip (fade over 80 ms, 'release' sound) beyond maxStretch·H.
- **Two-finger stretch:** both pointers on the body; ratio `s = d/d0` clamped to [0.6, 1.6], axis θ, two grabs. The waist narrows through the area constraint. Fallbacks: Shift+drag, and ctrl+wheel (trackpad pinch).
- **Release/rebound:** keep the last-80 ms velocity (the existing rule at rig.js:324). Dip kG to 40% for 120 ms, then ramp back, for a delayed jelly overshoot.
- **Flick:** release speed > 900 px/s and dist > 24 px (rig.js:328). Impulse `0.6·v·falloff(0.5W) + 0.25·v` on the whole body, plus torque from the offset, then react('flick').
- **Jiggle:** 3 or more velocity sign reversals on the dominant axis within 600 ms, speed > 250 px/s, amplitude < 60 px.
- **Circular massage:** over a 1.2 s window, path radius 12-80 px around its running centroid, signed Σ|Δθ| of 1.6π or more, at least 80% same direction. Emits {turns, dir, rate} continuously and adds a tangential swirl force.
- **Stroke:** moving within 0.25 s of touch-down, path > 60 px, speed 80-600 px/s, chord/path > 0.7. Emits {dir, speed} with a light tangential drag on near-surface particles only.
- **Tap/double-tap:** unchanged (held < 0.35 s, dist < 14 px, 0.33 s window).
- **Hit-test:** point-in-deformed-triangle plus mask alpha at the barycentric UV, replacing the ellipse `_hit` (rig.js:283).

### 4. Secondary motion and face coupling
Each frame MallowTouch calls `rig.setTouch({depth, stretch:s, speed, turns, strokes})`.
- **Squeeze face:** depth-weighted squeezeFace blend; cheekPuff +0.7d (also a real mesh bulge through the rest shape); squint via lidBot +0.4d and eyeOpen ×(1-0.6d); browY -0.2d.
- **Stretch above 1.15:** 'ooh' (mouthRound 0.8, eyeOpen +0.3). Fast drag: gasp overlay.
- **Calming:** each massage turn adds 0.12 intensity toward 'comforted' (cap 0.8); 3 strokes go to the 'calm' stage; both decay after 4 s idle.
- **Face lag:** a spring follower (k 90, ζ 0.5) on the body centroid's velocity gives `uv offset = clamp(-v·0.004, ±0.02)`, applied in the vertex shader only to vertices with a face-mask weight attribute. Eyes and mouth trail the body by 1-2%.
- **Gaze:** `rig.lookAt` follows the finger (already wired at rig.js:307).
- **Lighting** (fragment shader): per-vertex compression `c = restArea/area - 1`, darkening `col *= 1 - 0.12c` and a specular streak `pow(max(0,dot(n,L)), 24)` from a pseudo-normal built from the area gradient. The rim glow uses the Mallow's colours.glow.
- **Contact shadow:** width from the bottom row's x-extent; opacity from the lift.

### 5. WebGL mesh renderer and stage (src/mallows/touch/mesh-gl.js, mallow-touch.js)
One WebGL1 context per stage, never per Mallow (iOS context limits and memory). Layer stack inside the Hushfold stage element:
1. Under-canvas 2D: shadow, aura.
2. GL canvas: hero Mallow mesh plus Thought Mallow meshes drawn from an atlas.
3. Over-canvas 2D: ParticleField, Thought tag tethers.
4. DOM: subtitles and controls.

API: `class MeshRenderer { constructor(canvas); addBody(key,{source,w,h}); updateTexture(key, src, rect?); draw([{key, positions, uvs, indices, faceW, transform, uniforms:{glitch, light, lag}}]); resize(w,h,dpr); onLost(fn) }`. dpr is min(devicePixelRatio, 2), or 3 for the hero once high-res art is in. Positions are uploaded with bufferSubData (529×2 floats, about 4 KB). On `webglcontextlost`, switch to the 2D tier and rebuild on restore. `class MallowTouch { constructor(container,{id, quality:'auto'|'gl'|'tri'|'strip', reducedMotion, audio, haptics}); loaded; rig; setEmotion/setStage/react passthrough; on('touch', fn) // {kind, depth, speed, turns}; destroy() }`.

### 6. Fallback tiers and performance budget
Tier selection:
- **Tier A:** WebGL available and no major performance caveat.
- **Tier B:** Canvas 2D triangle warp on a 10x10 grid, sampling the 22x22 solver at every other vertex. Clip each triangle expanded 4% to hide seams. Measured 8.2 ms in software (14x14 12.2 ms, 20x20 19 ms).
- **Tier C:** the existing strip warp (rig.js:629-669) with per-strip sx/xo from SoftBody.rowExtents(). No seams, 3.7 ms flushed.
- Auto-downgrade B→C if the median frame over the first 30 frames exceeds 12 ms, and A→B on context loss.

iPhone budget per 16.7 ms frame (ProMotion: same work at 120 Hz, the solver is time-based):

| Work | Target |
|---|---|
| Solver | ≤ 0.5 ms |
| Skin raster (only when the face signature changes) | ≤ 1.5 ms |
| Face-rect upload | ≤ 1 ms |
| GL draw (CPU) | ≤ 0.3 ms |
| Particles | ≤ 1 ms |
| Total main thread | ≤ 6 ms |

Memory: a 1024² RGBA texture is 4 MB; keep at most 3 such textures plus the skin canvas. Sleep (stop drawing) when there are no pointers, solver energy is below ε, no animated params, and the particle list is empty; wake on pointerdown or an emotion change. The existing hidden/off-screen gating stays.

### 7. Reduced motion and accessibility
Triggered by prefers-reduced-motion or prefs.reducedMotion():
- Critically damped jelly: ζ≈1, kG ×2, no rebound overshoot.
- No flick spin, no jiggle amplification, no idle hops (as now).
- dMax ×0.6, particles ×0.35 (existing).
- Face springs switch to GROUPS_CALM (rig.js:35).
- Direct manipulation stays 1:1: dents still follow the finger.

The lowStim pref must really disable particles (fix world.js:58). Keyboard: Enter/Space = tap (existing); hold Space = squeeze with depth ramping over time; arrow keys = pull. aria-label updates on emotion changes (existing _label). Haptics only through the native/webkit bridge on iOS; navigator.vibrate does nothing in iOS Safari (the iOS 18 `<input switch>` label trick is unofficial, opt-in only).

### 8. Per-Mallow touch character (src/mallows/touch/persona.js)
Each entry is `TOUCH_PERSONA[id] = { material:{kG,kL,beta,damp,dMax,maxStretch,reboundDip}, onDepth(P,d), onRelease(rig,d), onJiggle, onMassage(turns,dir), onStroke }`, using only existing params and reactions.
- **Glitzi** {.32,.7,.15,.90,.26,.30}: dense and resistant. glitch rises 0.6→2.0 with depth; release fires glitchBurst (impulse glitch 0.8, shards) and the shader band shifts scale with finger speed. Slow strokes and massage lower glitch toward 0.08 (the calm override), which is the Static Storm intentional-slowing mechanic. Fast jiggle raises it.
- **Zuzu** {.22,.6,.30,.95,.32,.40}: the spirals' spin follows the massage direction and angular rate (spin and spinAngle become signed; L/R stay counter-rotating). Squeeze sets spin 3 and spiralHue 1 (existing). A two-finger twist counter-rotates the spirals. Jiggle sets spinJitter 1 plus question fx.
- **Blubi** {.16,.5,.35,.965,.38,.45}: softest and wobbliest. Squeeze gives blush 2.4 and happy-shut eyes. Flick or over-stretch gives wet eyes and mouthTremble (dramatic). The third stroke gives happy tears (0.4) plus drop and ring fx.
- **Boppo** {.28,.55,.30,.94,.36,.40}: release hops with hop = 1.2·depth (more squeeze, higher bounce), plus pop fx. Jiggle gives a giggle (bounceRate 2.4).
- **Pipzi** {.26,.6,.30,.95,.34,.42}: squeeze charges fxSpark up to 1. Release bursts sparks with count ∝ depth. Stretch gives 'eee' (mouthWidth 1.4, mouthOpen 1.1).
- **Loomi** {.20,.55,.25,.90,.30,.38}: heavy damping and slow rebound. Squeeze gives a smirk (mouthSkew 0.3, existing). Flick only leans it, no outrage. Massage makes it float up (float 0.8) with ring ripples.
- **Noomi** {.14,.45,.40,.92,.40,.40}: pillowy. Long holds over 2.5 s can trigger a yawn cycle, and being held lulls it to sleep (eyeOpen 0, breathRate 0.1, fxZzz). Flick makes it grumpy-sleepy (existing flick). Massage brings moon stars.

### 9. Thought Mallows: original translucent jelly characters that keep the exact words (src/mallows/thought/)
Because the seven silhouettes nearly coincide (IoU 0.97 or more, superellipse n=3.0), the difference has to come from material, face style, size and colour, not just outline.
- **Skin:** `paintThoughtSkin(style, size=192) → canvas`, cached per style. Superellipse n=2.5-2.7 (rounder than the boxy family), aspect 1.08, bottom flattened 6%, only a shallow top dimple. Translucent gradient fill at alpha 0.62-0.78 with an inner rim glow, two specular ellipses, a soft core light and motes (fx.js motes). No fuzzy sugar texture.
- **Face:** `drawThoughtFace(ctx, P, box)`: bean eyes (rx 0.07W, ry 0.09W·eyeOpen, one catchlight), a tension line from lidSlant/lidTop, a single-stroke mouth (mouthSmile/Open/Wave), blush dots. Params come from resolveExpression(GENERIC_THOUGHT, mix, intensity).
- **Size:** 64-110 CSS px, against the 220-300 px hero Mallow.
- **Physics:** the same SoftBody at 10x10 (about 0.04 ms), rendered from a 1024² GL atlas of 256² tiles (16 thoughts), with Tier C strips as fallback.
- **Emotion styles** (keep tints visibly different from the seven brand colours):
  - anger: #ff7a45→#d6264f, crackle arcs on the rim, cheekPuff 1, lidSlant 0.9, tremble 0.25
  - frustration: #ffb347, steam
  - anxiety: #c9b8ff, tremble 0.6, gazeDart 1, sweat, jittery path
  - sadness: #7d9ccf, droop 0.8, sinks 8%, slow float, light rain
  - loneliness: #9fd3c7, 0.8 scale, drifts apart
  - embarrassment: #ff9fc4, blushLines, shrink 0.3
  - overthinking/overwhelm: the main thought plus 3-5 siblings at 0.55 scale whose mouths flap out of phase, 'talking over one another'
- **Words:** createWords().full is never reworded and is never painted onto the deforming body. It sits in a DOM tag: textContent only, Nunito Sans 600 at 17/1.3, max-width 240 px, 3 lines, rgba(12,8,34,.62) plate with blur(8px), radius 14, padding 8x12, contrast 4.5:1 or better. The tag hangs from the Thought Mallow on a fx.js Rope, follows with spring lag, rotates at most 4° and never scales below 1. Text over about 90 characters shows the excerpt() token, with tap to read the full text. If moved far away, the tag shrinks to a 13 px 'tap to read' pill.
- **Verbs** map to solver and params: soften (kG down, tint desaturates with accumulated gentle squeeze), slow (damping), make space (repulsion field), settle (sink and damp), transform (tint lerp to the calm palette, face to 'relieved'). None of the verbs destroy the thought.

### 10. Belief Mallows (same generator, longer-lived)
Same generator at 1.4x, alpha about 0.85, with the person's exact belief text on a tag. Carries a procedurally drawn prop (stone, shell, tangled thread or luminous charm) as a separate rigid body attached by a distance constraint to a body particle. A stone's weight visibly pulls one side down through the solver, so the belief's influence is physical. Exploration loosens the constraint and lightens the prop. Persisted as {text, style, seed, propState}, never as an image. Beyond-tier only for the structured interpretation work.

### 11. High-res art plan
Pilot: re-rig Glitzi, then Zuzu. Per Mallow:
1. Trim to the alpha bbox plus 6 px pad (Glitzi bbox 92,137-1163,1159 → about 1084x1035; Zuzu 48,103-1206,1191 → about 1170x1100).
2. Export WebP at a 1024 max side for the rig. For WebKit compatibility keep the PNG tests pointing at MALLOWS[id].file (tests/v3.test.mjs:170).
3. Re-author the detect.py ROI (×~2.85) and run detection to get a new features.json.
4. Run derive.py with re-measured GLITZI_EYES and dilations scaled about 2.8x (27→75 px) to re-inpaint the body.
5. Re-cut sprites. Glitzi currently borrows a recoloured Boppo iris (iris-amber); cut its own fiery iris from glitzi-hires. Re-cut Zuzu's spirals at about 360 px.
6. Update registry size, bodyBox and face coordinates; scale lw, irisR, mouth w/sag/depth and cheek r about 2.8x.
7. Re-measure the 9 GLITCH_ROWS (rig.js:41).
8. Check in studio.html at small/medium/large that the pristine crossfade (rig.js:711) has no visible jump.

S framing adapts automatically (rig.js:252). Install opencv-python-headless first. Payload is about 0.9-1 MB per Mallow (original plus body) vs about 550 KB now; already lazy per Mallow through loadMallowAssets. Do not swap the blue file into any slot until the owner confirms it (its face is Noomi's layout in Loomi's colour). Keep logo-mascot as brand-only.

### 12. Smaller fixes to fold in
- Brand casing: index.html:9-10,24; home.js:29,32,38; main.js:74 use 'Hushmallow'. Route through a brand config ('hushmallow').
- v3/fx.js:313 FONT is Fredoka; the typography brief needs Nunito Sans/Manrope/Fraunces font files in assets/fonts, which build-site.sh:16 already ships.
- hushmallow-logo.webp has no alpha; a transparent or dark-UI version is needed.
- Particles currently spawn from the undeformed body (particles.js:21); fix via geoOverride.


## Risks
- All timings come from SwiftShader software rendering on a shared, loaded Linux box. They are relative guides only, and STATUS.md:125 already notes speed on real phones is unmeasured. The owner must test on a real iPhone (a small/older model and a 120 Hz Pro) before tuning budgets.
- Uploading a canvas to a texture on iOS Safari can trigger a GPU readback or stall, because 2D canvas and WebGL are different surfaces. Mitigations: dirty-rect uploads only when skinVersion changes; Glitzi and Zuzu animation moved to the shader or sprites; if needed, the face split into its own small texture.
- iOS may drop the WebGL context under memory pressure, when backgrounded, or inside the Framer iframe. Without webglcontextlost/restored handling plus the 2D tiers, the Mallow would vanish.
- iPhones give no usable pressure: Touch.force is 0 on the iPhone 11 generation and later, and PointerEvent.pressure is a constant 0.5. Squeeze depth from duration and movement must be tuned so it feels intentional; people may expect a harder press to go deeper.
- Deforming the approved artwork can break the brief's 'preserve visual identities'. Keep the face region stiffer, cap dent depth per Mallow, and keep the pristine crossfade at rest so the untouched art is what users see when idle.
- Multi-touch inside an iframe embedded in Framer: page pinch-zoom, scroll and edge-swipe-back can steal gestures. This needs touch-action:none, gesturestart preventDefault, and keeping the touch target away from the 20 px screen edges. It must be verified on device in the Framer-hosted page, not just the bare app.
- The high-res files are redraws with different proportions (aspect +5% to +9%, features moved 2-4%). Swapping them in changes the approved look, and mixing high-res Glitzi/Zuzu with five low-res Mallows may look inconsistent in the lineup. The blue file is ambiguous (Noomi's face in Loomi's colour). All of this needs owner sign-off.
- The re-rig tooling needs OpenCV (not installed in this container) plus hand-tuned regions and Glitzi eye boxes. Misaligned rig coordinates show as a visible jump when the face leaves its rest state.
- rig.js is 1235 lines and used by all old rituals, 1,000 V3 rituals and studio. Changes must be additive (headless flag, new methods, a tier choice) so the strip-warp path and the world.place() API keep working while other work happens in parallel.
- Thought Mallows risk being mistaken for the seven, or the mascot, and must never suggest a feeling is bad or must be destroyed. The person's words must stay literal (textContent only) and readable at any distance or deformation.
- Changing pointer-events on .home to fix B1 can stop its buttons responding if done carelessly. Test every control at 320, 375, 390 and 430 widths after the change.
- The ETA figures are estimates of agent build time on a slow shared machine. They exclude owner review cycles, on-device testing and waiting for the remaining five high-res Mallow files.