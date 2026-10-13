# hushmallow v2 engine: generalisation audit

I read every file in stage2/ (including dev/, index.html and both JSONs), videos/my-brain-at-2am-v2.js, audio/soundtrack-v2.mjs, audio/soundtrack.mjs (in full, including the in-page renderer and mastering) and render/render.mjs. For context I also read the README, AUDIT-v2.md, render/serve.mjs, stage/components/clock.js and the app's registry, rig and audio-kit specs. I also ran read-only profiling probes in the actual headless Chromium with SwiftShader. Nothing in the project or the app was modified. The probe scripts are in the scratchpad: /tmp/claude-0/-home-user-thinkstill-rituals/408ed79f-c8dc-5aa7-9180-8647f2fe949e/scratchpad/probe{,2,3,4}.mjs.

## 0. Measured cost model (this machine)

The renderer is ANGLE on Vulkan, using SwiftShader (Subzero). Chromium logs "Automatic fallback to software WebGL has been deprecated" (see risk R2).

| Stage | Cost | Count per 15 s film | Total |
|---|---|---|---|
| **Face redraw** (`Face.draw`, Canvas2D on CPU) | **~257 ms**, of which ~220 ms is `ctx.filter` blur (36 ms without it) | **1991, once per sub-frame** | ~510 s |
| Face texture upload + mipmaps (`updateFace`) | ~18 ms | 1991 | ~36 s |
| Sub-frame GPU passes (`renderSub` + accumulate) | ~245–290 ms | 1991 | ~500 s |
| World pass (`renderWorld`) | ~0.6 s (sky and water cost about the same per pixel; clouds ~8%) | 450 | ~270 s |
| Bloom + post | ~170 ms | 450 | ~77 s |
| Readback + base64 + CDP transfer + Node decode | **~404 ms** (readPixels alone is 27 ms) | 450 | ~180 s |
| Overlay draw + upload | ~13 ms | 450 | ~6 s |

- **Sub-frames:** 1991 in total, mean 4.42 per frame. 332 of 450 frames sit at the floor of 3.
- **Total:** ≈ 1580 s ≈ 26 min, which matches the observed ~25 min. A 20-frame burst ran at 2.76 s/frame with all 4 cores ~75% busy.
- **Sub-frame breakdown** (3 bubbles visible): reflection mesh build, draw and blur 66 ms; copy world→scene 27; full-screen reflection composite 73; glass back 21; Mallow mesh 51; glass front 21; accumulate 27; particles <1.
- **Your context figure of "face ~30 ms" is wrong.** It is roughly the no-blur number. Because the redraw is never cached (R1), the face is the single largest cost: ~35% of render time.

## 1. Already generic and reusable as-is

**stage2/gl.js** — fully generic:
- `createGL`, `program` (reflects uniforms and attributes), `setUniforms` (dispatches by value type), `texture`, `updateTexture`, `target` (8-bit or RGBA16F, optional MSAA resolve), `fullscreen`, `FS_VERT`, `gridMesh` (interleaved dynamic grid).

**stage2/motion.js** — fully generic; this is the core "pure function of t" toolkit:
- `spring`, `ring`, `Track` (spring or eased piecewise), `Impulses`, `Hops`, `Blinks`, `noise1`, `ease`, `spline` (monotone cubic), `mixHex`, `hex3`, `clamp`/`lerp`/`smoothstep`/`smootherstep`.

**stage2/softbody.js** `SoftBody` (constructor, `build`, `project`):
- The six-DOF model, the lagged per-height-bin wave and the comp/bend attributes are character-agnostic.
- It takes art size, a silhouette and a `dofAt` callback.
- Constants are tuned on Noomi but reasonable for any single-blob Mallow standing on a base line.

**stage2/stage.js**:
- `Stage.init`, `renderFrame` (centred shutter sampling, adaptive sub-frame hook, raw/PNG/none capture), `dryRun`, `cue`.
- `loadImage` and `silhouette` are generic.

**stage2/renderer.js** — generic infrastructure:
- `setMallow`, `updateFace`, `textTexture`, `_blur`, `_copy`, `_drawMallow`, `_drawGlass`, `_drawParticles`, `_cam`.
- `renderFrame`: world once per frame, N sub-frames accumulated in HDR, bloom at 1/4 and 1/8, post.
- Shaders: `MESH_FS` (relights relative to the baked art lighting, so the approved look holds at rest), `GLASS_VS/FS` (any frosted card), `PART_VS/FS`, `BLUR_FS`, `COPY/BRIGHT/ACC_FS`, `POST_FS` (identity-below-0.8 shoulder, split-tone grade, vignette, grain/dither).
- Only `WORLD_FS`, `REFL_FS`, `WATER` and the reflection steps of `renderSub` are lake-specific.

**stage2/type.js**:
- `lineSprite`, `TextBlock` (rise and fade only, so it complies with the no-bounce rule) and `LogoCard` (logo untouched, uniform scale) are generic brand components.

**stage2/face.js**:
- The tube renderer (`sampleCubic`, `sampleQuad`, `normals`, `tubeOutline`, `tube`) is a generic glossy-line renderer once its colours come from the spec.
- `eyeGeom`/`drawEye`/`drawBrow`/`drawMouth` ('line' mouth) and `specFromDerived`/`specFromRig` cover the app's **'closed'** eye style.
- In the registry, **noomi, loomi and blubi** all use `eyeStyle:'closed'`, mouth `style:'line'` and `iris-navy`. Two more Mallows are therefore close to drop-in once their colours are parameterised and their art is derived.

**render/render.mjs**:
- The pipeline is generic: static server → Chromium → raw RGBA → ffmpeg libx264 BT.709 → score → AAC mux, with a provenance stamp.

**audio/soundtrack.mjs** — the renderer is generic; only the plan is per video:
- `renderInPage` instruments: blip, bell, ping, noiseHit, air, tick, cricket, swirl, pad.
- The engine bridge (suspend and virtual-clock trick), `offlineDeterminism`, `measure`, `interSamplePeaks`, `limit` and `main(builder)` (−16 LUFS, ≤ −1.5 dBTP).
- In soundtrack-v2, `curveSampler` is generic.

**Determinism:** every v2 frame is a pure function of t; nothing in v2 uses `Math.random` or wall time. Frames can therefore be rendered in any order or split across processes, provided the curves come from the dry run (see R12).

## 2. Hard-coded to Noomi, this story or this world

**renderer.js**
- `W=1080, H=1920` (L18): every target size (L439–447) and the post-pass grain constant `vec2(1080.,1920.)` (L414) depend on it. This blocks a draft render scale.
- The lake world is baked into the pass structure: `WORLD_FS` (L158–275), `REFL_FS` (L279–304), `WATER` (L48–80), and `renderSub` steps 1–2 (L604–624).
- Water constants:
  - perspective `0.13+depth/700` (L57), ring speed 240 px/s (L66), width `30+22·age` (L67), decay `exp(-0.9·age)` (L68), displacement 17 px (L70);
  - swell, chop and agitation ×16 (L73–77); at most 8 ripples (L55, 60, 577).
- `WORLD_FS` constants:
  - sky gradient span 1150 px (L178), haze (L183–184);
  - stars: 7 px grid, density 0.9972, colour (L189–195);
  - moon halo, disc, maria and limb (L198–205); stratus band (L211–224);
  - two hill ridges (L227–232);
  - mirror compression 0.85 (L253), moon reflection ×0.9 (L256), water falloff 420 (L258), fresnel 260 (L252);
  - glitter column (L261–265), crest glint (L267), contact-shadow ellipse (L269–270), horizon haze 14 px (L272).
- `MESH_FS` tuning:
  - "rounded-cube" superellipse dome profile (L109–118);
  - normal-map LOD 3.5 and mix 0.6 (L130); bend 0.55 and comp 0.25 (L132); relight 0.78/0.22 (L135);
  - SSS tints (L139–140); ambient 0.06 (L143); lantern glow (L145);
  - spec power 36 and vnoise ×180 (L148); moon rim power 2.6 (L151); reflection tint (L153).
- `GLASS_FS` look:
  - padding 64, glow and shadow radii, sheen (L330–372);
  - warm dissolve colours `vec3(1,.9,.74)` and `vec3(1.2,.95,.65)` (L367, 369);
  - default tint `[0.93,0.92,1.0]` (L546).
- Fixed blur and bloom radii and mixes (L610, 628, 639, 671–677).
- `POST_FS` vignette centre (0.5, 0.47) and aspect 0.72 (L409–410).
- `uLoop` falls back to 15 (L579).
- One Mallow per scene (`setMallow` L472–482).

**softbody.js**
- Tuned constants: 0.85 inflate, exponent 0.58, bulge 0.3, spread 0.11/0.05, sway 0.1, lean drop 0.22, shimmer mode 3θ × 0.022·H (L76–99).
- Default lag 0.075 and bins 48 (L36–37); `R` is computed but unused (L39).

**stage.js**
- Depends on v1 `../stage/components/clock.js` (L6).
- Fredoka *latin* subset only (L11).
- `silhouette` thresholds: 4% run, alpha >128 (L32–34).
- Default video id `'my-brain-at-2am-v2'` (L106).
- index.html also hard-codes a 1080×1920 canvas.

**type.js**
- Moonlit text gradient `#ffffff`→`#ece6ff` and ink shadow (L37–46).
- `TextBlock` defaults: x 540, y 300, size 72 (L54–55).
- `LogoCard`: logo path (L80), url `'hushmallow.com'`, sizes (L89), plate colours (L114–118), url colour (L123), entry timings 0.7/0.5/0.25 s (L131–142).

**face.js** — Noomi and the 'closed' style throughout:
- `NEUTRAL` rest is `eyeOpen:0, closedCurve:1, mouthSmile:1, blush:0` (L19–25). That is Noomi's painting, and its semantics differ from the app's `PARAMS` (closedCurve default 0.6, blush base 1, sparkle 1).
- `catchX/catchY` assume a key light upper-right, i.e. the moon (L24, L312–317).
- `TUBE` colours are Noomi's measured navy (L135–139). The spec carries `line` (L33, 71) and `colors: j.eyeL.colors` (L75), but **neither is used**. `lineHi` is ignored.
- Iris: navy galaxy gradient and fixed star seeds 7/19 (L279–308).
- Sclera (L348–351) and lid/rim colours (L364, 371, 379).
- Mouth inside `#1a0a3a` and tongue `#ff8ab0`/`#e2557f` (L456, 461). The registry has inside `#1a0a3a`, tongue **`#ff6f9c`**.
- Blush is a hard-coded `rgba(255,110,200)` drawn source-over (L478–480). The app draws `cheeks.colour` with a `screen` blend above `cheeks.base`. The measured cheek colour `#fca6fb` is also unused.
- `specFromDerived` scale `k=2.70` (L47) is Noomi's rig→hi-res fit. It assumes eyeL is screen-left with the inner corner at `p1` (L50) and needs `openEyeSocket` from the derive tool (L58).
- `eyeGeom` implements only the closed-arc ↔ open-eye model: `ey = y + sag·0.42`, open size from the rig ratio (L239–268).
  - No 'open' style with iris sprites (boppo, pipzi), 'spiral' (zuzu) or 'glitzi' style.
  - No 'open' resting mouth (zuzu, boppo, pipzi) or 'crease' mouth (glitzi).
  - Missing app params: `wink`, `browAsym`, `mouthPout`, `tongue`, `heartEyes`, `tears`, `sweat`, `blushLines`, `cheekPuff`, `spin`.
- `Face.box` heuristic (L494–496).

**videos/my-brain-at-2am-v2.js** — all story, character and world data:
- Mallow and assets:
  - `meta` (L28): 15 s, subframes 3, shutter 0.4.
  - `ASSET` paths, all noomi (L31–38).
  - `MALLOWS.noomi.face` (L270, 274); fallback `specFromRig(...,2.70,32,125)` (L274).
- Story timing and palettes:
  - beat times `T` (L41–46); `LOOP_BREATH=15/4` (L47);
  - palettes `PAL.night/cold/warm`: sky, water, hills, moon, halo, clouds, key, rim, ambient, spec, glow, post tints (L51–73); `coldAt`/`warmAt` key splines (L86–87).
- Body and face tracks:
  - body: `hop` 165 px; `sTrack`, `sKicks`, `swayKicks`, `inflTrack`, `liftTrack` 36, `leanTrack`, `shimmers` (L90–117);
  - envelopes `sleepEnv`/`pantEnv`/`trembleEnv` (L119–121); `dofAt` noise seeds 3/7 and rates 13/9 Hz (L123–135);
  - all face tracks and the blink list (L178–205); `restAt` 0.17–0.25 s and 14.2–14.5 s (L205);
  - `faceAt`: `browTilt:0.8`, `mouthWavePhase:t*4.2` (L207–216).
- Thought bubbles:
  - 3 bubble texts and slots (L138–142); `ORBIT` {540, 600, 270, 132} (L143); `PHASE` and `RADIUS` splines (L144–145); `HEAD` [540, 790] (L146);
  - `bubbleAt` kinematics: springs 1.6/0.62, 2.3/0.48; spin window 5.6–7.8; −150 px lift (L148–168);
  - `MOTES`: 8 per bubble, seeds 101+17i (L172–175); mote direction centre `[540,1060]` (L362) and colours (L370);
  - bubble text style: 500 50px, line height 58, padding, ink `#1b1d57` (L244–260).
- World and camera:
  - `WORLD` {horizonY 1150, base (540, 1300), scale 0.56, moon [850, 590, 50]} (L219); `RIPPLES` (L220); `agitationAt` (L221);
  - `camAt` keys, x 540, lift follow 0.2 (L224–232); `skyCamFor` parallax 0.35 around x 540 (L233–236).
- Setup choreography:
  - `SoftBody` lag 0.062 (L277); eye centre `eyeC` (L280);
  - all looks, including "guilty look down" and "up at the moon" (L288–296); lean (L298–300).
- Text and cues:
  - hook, hookEnd, tagline and logo positions, sizes and timings (L307–310);
  - all 23 cues (L315–327): `scene` (loop 15), `flinch`, `take`, `lift_off`, `land`, `ripple`, `blink` (incl. soft), `glance`, `thought`, `wince`, `spin_up`, `squeeze`, `inhale`, `crest`, `exhale`, `release`, `dissolve`, `warm_bloom`, `eyes_open`, `tagline`, `logo`, `drift`, `loop`.
- Per-frame state constants:
  - glass tint `mix3(...)` and edge (L351); light dir `[0.45,0.55,0.7]` and sss 1 (L382);
  - fresnel 1.0, reflAmt 0.62, contact shadow 0.55·exp(−lift/45) (L390–392);
  - post: bloom 0.14, thresh 0.85, contrast 1.04, vignette 0.38 + 0.08·cold, grain 0.018 (L395–398);
  - audio curve keys `bx/bf/ba{0..2}` normalised by 420 (L399–406), while cue pans use 400 (L319, 324).
- `subframes` probes only 4 silhouette points and only the L eye radius (L413–431). `overlay` clears a literal 1080×1920 (L435).

**audio/soundtrack-v2.mjs**
- Story fallback times 0.4, 0.98, 6.98, 7.42/1.48, 9.2/1.9, 8.9, 11.7, 12.6, 13.5 (L60–63).
- The whole cue → sound switch is Noomi- and story-specific (L66–165); bells use the C-pentatonic `N` (L113, 130, 154).
- Dissolve sparkles (L168–175).
- Sleeping-breath envelope constants (L181).
- Clock "busy" cue list (L193); ticks are a 2 AM-specific layer (L190–206).
- Crickets are a night-specific layer (L208–221).
- Swirl: start `t0:2.9` and exactly 3 items (L225, 228).
- Pad: C add9 (L248).
- Bed realm `'moonmilk-cove'`, tick windows and levels at absolute times (L264–268).
- Fades (L275).

**audio/soundtrack.mjs**
- `E.buildMallow('noomi', …)` (L777): every Mallow would get Noomi's voice kit.
- `N` is C major pentatonic, "Noomi's key" (L139–141). Engine `KITS` have their own root and scale, e.g. glitzi 466 Hz minor, blubi 698 Hz.
- The v1 `thoughtLayout` regex-parses video source text (L103–136); it is used only by v1.

**render.mjs**
- Default video is v1 (L28).
- Stage, raw mode and score are picked by the `'-v2'` suffix (L29, L86, L142).
- Viewport 1080×1920 (L61); `-preset slow`, CRF 16, `-g 30` (L150–151).

**tools/derive_noomi_hires.py**
- Paths and outputs are named noomi (L59–60). `find_features` assumes "dark navy strokes: two upper = eyes, lower = mouth" (L486–487).
- That only holds for closed-eye, line-mouth Mallows. Mallows with painted open eyes or spirals need a different extraction (e.g. hi-res eye sprites, as the app does at 439 px).

## 3. The implicit direction API and how to make it data-driven

### Today's contract

A video module default-exports `{ meta, setup, state, overlay?, subframes? }`. It runs as a stateful singleton (module-level `body`, `face`, `bubbleTex` and others, L239).

**`meta`** = `{ id, title, fps, duration, subframes, shutter }`.

**`setup(stage)`** (async):
- calls `stage.renderer.setMallow({artImg, pristineImg, faceCanvas, normalImg, cols, rows})` and `stage.renderer.textTexture(key, canvas)`;
- creates `SoftBody` and `Face`;
- appends keys that depend on layout (looks at bubbles, lean);
- emits the cue log with `stage.cue(t, type, payload)`.

**`state(t, stage)`** returns `S`. Colours are linear RGB except the post tints, which are display-space. Everything must be a pure function of t and periodic over the loop.

```
S = { t, cam:{x,y,zoom,roll},
  buildMesh(mesh, flip)        // fills pos.xy(world px), uv, comp, bend, then uploads
  drawFace() -> bool           // redraw the art-space face canvas; true means re-upload
  mallow:{ bodyBox:[cx,baseY,halfW,h] (art px), rest:0..1 (pristine crossfade),
           light:{dir,key,rim,rimAmt,spec,specCol,glowCol,glow,ambient,sss} },
  world:{ zenith,high,horizon,haze, moon:[x,y,r],moonCol,moonGlow,haloCol, stars, clouds,cloudLit,cloudDark,
          hillCol, horizonY, waterNear,waterFar,fresnel, agitation, reflAmt, contactY, contact:[x,halfW], shadow,
          ripples:[{x,y,age,amp}], skyCam:[x,y,zoom], loop? },
  bubblesBack|bubblesFront:[{x,y,hw,hh,scale,squash,rot,radius,alpha,textAlpha,glowUp,textTex,tint,edge,stress}],
  particles:[{x,y,r,a,c}],
  post:{exposure,bloom,bloomThresh,contrast,sat,shadowTint,highTint,vignette,grain,time},
  audio:{ flat numeric curves } }   // read from the centre state only
```

**Rendering conventions:**
- The centre state drives the world pass, post, audio curves and overlay. Sub-frame states drive moving things: reflection, glass, mesh, face, particles.
- `overlay(ctx, t, stage)` returns a bool. It draws 1080×1920 premultiplied 2D content, which is composited after grade/vignette and before grain.
- `subframes(t, stage)` returns N in 3..16, targeting ≤ 2 px of movement between samples.
- Space is 1080×1920 design pixels, y down. Art px map to world px through `xf={x:baseX, y:baseY, s:scale}`.

**Cue log:**
- `cues.json = {video, title, fps, duration, cues:[{t,type,...}], curves:[per-frame centre.audio]}`.
- `buildPlanV2` maps cue types to engine and synth events, and curve keys (`warm`, `cold`, `agitation`, `inflate`, `lift`, `squash`, `spin`, `bx/bf/ba{i}`) to automation for swirl, tension, pad, bed mood and clock rate.

### Recommendation: keep this API as the seam, and make a composer produce it from data

**Stays code** (versioned, QA'd once):
1. **Renderer and world modules.** Each realm is a GLSL module plus a uniform schema. The lake is the first: `WORLD_FS`/`REFL_FS`/`WATER`. Reflection becomes optional, only for reflective ground.
2. **SoftBody, motion primitives, and the face renderer per `eyeStyle` and mouth style.** Colours and rest pose come from the spec and registry.
3. **A beat library.** These are parameterised code macros that write coordinated keys into named channels, and they are where v2's quality lives: one beat sets 10–20 tracks with hand-tuned f/z values. Extracted verbatim from v2, with times relative to the beat anchor:

| Beat | What it covers |
|---|---|
| `sleepBreath(period, windows)` | inflate sine, glow pulse, audio breath layer |
| `dreamFlinch` | the 0.26 s flinch |
| `hypnicJolt(take, land, height)` | sTrack 5 keys, hop, inflate gasp, eyeOpen/stretch/scale/iris, squint/smile/mOpen/mRound, sKicks/swayKicks/shimmer, 3 ripples, rest cut, cues take/lift_off/land/ripple |
| `aftermath` | blinks, glances, lean, pant, blush, brow, wobbly mouth |
| `thoughtPop(i, cringe?)` | bubble spawn, look-at, lean, wince |
| `spiral(start, end)` | PHASE acceleration, chase looks, tremble, stress, cold, agitation, camera push |
| `squeezeRelease` | squeeze and let go |
| `breath(inhale, crest, exhale)` | sTrack, inflate, lift, RADIUS pull-in/out, 'o' mouth, release kicks, calm ripple, warm |
| `dissolve(i)` | glowUp, textAlpha, motes |
| `eyesOpenContent` | open, sparkle, looks at moon then camera, smile |
| `endCard(tagline, logo, out)` | tagline, logo card, exit |
| `slowBlink`, `driftToSleep` | closing beats |
| `hookReturn` | hook text returns for the loop |

4. **The composer.** It runs in two phases:
   - *Layout:* measure text, size bubbles, place the orbit and Mallow.
   - *Acting:* resolve references such as look-at-bubble and camera follow, then merge channel keys. For Track channels it collects `(t, v, opts)`, **sorts by t**, then builds each Track, because `Track.to` captures `d = v − last` at insertion time. Impulses, shimmers, blinks and ripples merge as sums or max. Envelope layers become `{start, end, fadeIn, fadeOut}`.
   - It emits cues from the beats, so cue names are owned by the beat library.
5. **Validators.**
   - Loop closure: numerically compare `state(0)` with `state(duration)` across all channels and curves.
   - Times monotonic, no duplicate spline keys.
   - Text safe zones; per-bubble text width cap.
   - Brand lint: no roll or shake channel exists; text uses whitelisted presets; copy is lowercase "hushmallow"; regex ban on breath-hold phrasing; no medical claims.
   - Flash/strobe check on rendered luminance.
6. **Audio instruments, engine bridge and mastering** stay as they are. Beds and layers (ticks, crickets, swirl, pad, sleeping breath) become parameterised code whose windows derive from cues, not absolute seconds. Synth notes are transposed to the Mallow's `KITS` root and scale; the engine voice is `buildMallow(mallowId)`; the bed is the realm id.

**Becomes data** (template JSON plus packs):
- **Character pack:** registry id; derived art, clean, normal and face JSON paths; placement (baseX, baseY, scale); lag; light dir; eyeStyle; rest/neutral pose; tube and mouth colours from the registry or measurements.
- **World preset:** realm module id, constants (horizonY, moon, hills, water params, reflAmt, fresnel, shadow), named palettes, and palette blend splines.
- **Camera:** key splines and follow factor.
- **Beat timeline:** `[{beat, t, params}]`.
- **Text:** hook, tagline and bubble lines; style tokens; card timings.
- **Sound:** sound-map overrides, mix levels, bed realm.
- **Quality profile, seed, duration, fps.**

**Regression harness, which is how quality is guaranteed:** re-express v2 as the first template. Dump `state(t)` (numbers only) and the cue log for every frame and sub-frame time, from both the old module and the composer, and require equality within 1e-9 before any pixel comparison. Then confirm the renders match the approved MP4.

## 4. Render hot spots and optimisations

Savings are estimated from the measured per-pass costs above and are cumulative, starting from ≈ 1580 s.

1. **Face caching** — saves ~410 s (−26%):
   - The cache key includes `mouthWavePhase:t*4.2` (video L214 → face.js L503), so it changes on every sub-frame. The probe shows a redraw even on held poses and at rest.
   - Fix: drop or quantise phase when `mouthWave≈0`; use a perceptual quantum per parameter; skip when `rest ≥ 0.999`; draw the face **once per frame** unless the expression itself changes fast.
   - The face canvas is in art space and deformed per sub-frame by the mesh, so body-motion blur on the face is unchanged. Only blinks and eye pops need per-sub-frame redraws, which `subframes()` already detects.
   - Result: ~1991 redraws → ~520.
2. **Replace `ctx.filter` blurs** (face.js L166, 176, 198, 200; 4 blurs per tube, 3–7 tubes per face) — saves ~110 s more:
   - Interim: blur the glow and under-glow at 1/4 resolution in `tmp`, then upscale. Est. 257 → ~50 ms.
   - Final: an SDF tube shader rendering the face into an art-space FBO, with analytic glow and no upload. Est. 10–20 ms. Gate it on `rest-test.html` mean diff staying at or below today's.
   - Also upload only `Face.box` (~0.67 MP of 1.33 MP), or use a box-sized face texture with its own UV remap in `MESH_FS`: 18 → ~8 ms.
3. **Readback** (404 ms/frame) — saves ~160 s:
   - POST the raw `ArrayBuffer` from the page to the local Node server (binary, ordered by frame index) instead of base64 through `page.evaluate`.
   - Optionally convert RGBA → planar yuv420p BT.709 limited range in a final GL pass (3.1 MB instead of 8.3 MB). That removes ffmpeg's `vflip`/`scale`; validate PSNR against the current path.
   - Async PBO readback with `fenceSync` is a further small gain. Est. 404 → ~50 ms.
4. **World shader** (0.6 s/frame) — saves ~160 s:
   - Branch the moon `maria`/`fine` fbm (L202–203) to `d < mr+2`. Today they are computed for every sky and mirrored-water pixel.
   - Branch hills (L228–229) to a band near the horizon, and haze to `h < 0.32`.
   - Have water sample a rendered sky texture, with the moon disc in alpha, instead of calling `sky()` a second time (L255).
   - Est. 0.6 → ~0.25 s. Further: replace procedural `fbm` (5 octaves × 4 hashes) with a precomputed tileable noise texture. Loop periodicity survives because the drift is a cos/sin domain offset. Est. → ~0.1 s.
5. **Sub-frame restructure** (~250 ms) — saves ~220 s:
   - Render the moving layers into a transparent premultiplied foreground buffer and accumulate Σw·fg and Σw·α. Composite once: `accum + world·(1−Σwα)`. This is exact, because the world is constant within a frame.
   - That removes the full-res `_copy(T.world, T.scene)` (27 ms). The glass blur source becomes a 1/4-res composite.
   - Scissor the reflection composite (73 ms full-screen, discarding after `waterDisp`) and the accumulate pass to the reflection/Mallow bounding box, about 1/5 of the screen.
   - Reflection mesh at 48×48 into a 1/4-res target.
   - Est. ~250 → ~140 ms.
6. **Adaptive sub-frame floor** — saves ~70–120 s:
   - Measured shutter displacement: 202 of 450 frames move < 2 px.
   - With floor 1 (N=1 when d < 2 px) sub-frames go 1991 → **1490**; with floor 2 → 1692. Single samples are exact because all motion is analytic.
7. **Mesh shader** (51 ms): precompute the static per-texel normal (dome blended with the normal map at LOD 3.5) and the `d0` term into one texture at setup. Est. ~35 ms.
8. **Overlay:** skip the 13 ms draw and upload when no text is visible, i.e. return false from `overlay`.
9. **Batch throughput:**
   - Two concurrent workers: CPU is ~75% busy today, so expect +15–30%, falling as the single-threaded face cost goes away.
   - Use x264 `-preset medium`, or encode after rendering, to stop it stealing cores.
   - For text-only variants of the same timeline: render a "clean plate" (pre-overlay, pre-grain) once. Composite overlay plus grain per variant at ~0.2 s/frame, which is ~20× faster per extra variant. Bubble-text variants still need re-rendering, because the bubble text sits inside the glass pass.
10. **Quality profiles:**
    - `renderScale`: keep `uRes` in design space and scale only the targets, viewport, blur texel radii and overlay. This needs W/H, grain, index.html and render.mjs:61 parameterised.
    - **Draft:** 0.5 scale, N=1, face once per frame without glow blur, low world quality (3 octaves, no clouds), no 1/8 bloom, x264 veryfast. Est. ~0.25–0.4 s/frame, ≈ 2–3 min per video.
    - **Final:** the full path.

**Projected final quality after items 1–7:** ≈ 420–520 s (7–9 min) per 15 s video, ≈ 6 min effective with 2 workers, versus 26 min today. Draft is ≈ 2 min.

## 5. Risks and bugs

- **R1 – face never cached (high):** the face redraws and uploads every sub-frame, ~35% of render time, including frames where `rest=1` shows the pristine painting (video L205/339, renderer L123/656). Fix as in §4.1 and §4.2.
- **R2 – SwiftShader fallback deprecated (high):** Chromium logs "Automatic fallback to software WebGL has been deprecated". A future Playwright/Chromium will lose WebGL2. Add explicit `--enable-unsafe-swiftshader` (or `--use-angle=swiftshader`) to `render.mjs` L55–57 and keep Playwright pinned at 1.56.1.
- **R3 – suffix routing (high):** stage, raw mode and score are chosen by the `'-v2'` suffix and the default is v1 (render.mjs L28–29, 86, 142). Any new template id silently gets the v1 stage and v1 score.
- **R4 – unsafe for one-page batches (high):**
  - `textTexture` caches by key `b${i}` (renderer L486–490, video L304), so a second video in the same page shows the first video's bubble text.
  - `setMallow` never deletes old textures or meshes (L472–482).
  - The module is a singleton (video L239).
  - Until fixed: reload the page per video, or add `dispose()` plus content-hashed keys.
- **R5 – Track and spline ordering (high for data):** `Track.value` breaks at the first future key (motion.js L56–64), so keys added out of order are silently ignored. `spline` divides by zero on duplicate times (L134–140). The composer must sort and validate.
- **R6 – water loop seam is fragile:** water chop `n1`/`n2` uses `uTime` directly (renderer L74–75) and is not periodic. The loop seam is safe only because agitation is 0 at both ends. `uLoop` falls back to 15 (L579), so other durations break the world loop unless `world.loop` is passed. The `scrollNoise` cross-fade also dips noise contrast around mid-loop (L52–54).
- **R7 – audio loop seam:** the end dips to 0.7, then frame 0 starts from 0 with a 4 ms ramp to 0.85 (soundtrack.mjs L538–546, v2 L275). The pre-roll is a synthetic "previous night", so reverb tails of the end chime and drift sigh are missing at frame 0. A tick on platform looping is possible. Fix: render past `DUR` and wrap-add the tail onto the start, making the render circular.
- **R8 – wrong voice and key for other Mallows:** `buildMallow('noomi')` (soundtrack.mjs L777), realm `'moonmilk-cove'` (v2 L265), and C-pentatonic bells and pad not transposed to each kit's root and scale.
- **R9 – face colours and semantics ignore the registry:**
  - `line`, `lineHi`, `mouth.inside`/`tongue`, `cheeks.colour`/`base` and the measured `colors` are all ignored.
  - Even for Noomi the tongue (`#ff8ab0`) ≠ registry `#ff6f9c`, and blush is source-over pink rather than the app's `screen` blend with `ch.colour`.
  - Parameter semantics differ from the app's `PARAMS`, so `expressions.js` PRESETS and `resolveExpression` need a mapping layer before reuse.
- **R10 – dead cues and masked missing cues:** the score's fallback times silently cover missing cues (v2 L60–63). `spin_up`, `warm_bloom`, `tagline` and `loop` are emitted but unused: the swirl starts at a hard-coded 2.9 s, not at `spin_up`.
- **R11 – constants duplicated between video and score:**
  - The sleeping-breath envelope differs: the score (v2 L181) omits the video's `0.7·smoothstep(10.8,11.8)` term (video L119), so the body breathes from 11.8–13.3 s with no breath sound.
  - Breath period `LOOP_BREATH` vs `loop/4`.
  - Pan normalisation /400 (cues) vs /420 (curves).
- **R12 – curves depend on render order:** `--frames N` writes truncated curves and the soundtrack clamps (render.mjs L138, 168). Curves are pushed on every `renderFrame` call (stage.js L82), so re-rendering a frame duplicates entries. Parallel or segmented rendering must take curves from `--dry`.
- **R13 – face fallback misalignment:** if the derived art exists but `noomi-face.json` is missing, `noomi-face-measured.json` (in 1254 px source space) is applied to the cropped 1199 px art. The face is then offset by `cropOffset` (29, 116) (video L264–274).
- **R14 – reflection ignores roll:** the reflection mesh pass drops camera roll (renderer L493) while the composite uses it (L615). Latent only; brand rules forbid roll anyway.
- **R15 – `Face.box` may clip other Mallows:** it uses only `brows.L` and ignores brow lift, glow padding and eye scale (face.js L494–496).
- **R16 – text has no layout safety:** no wrap, auto-fit or safe-zone check in `TextBlock` or `bubbleCanvas`; the orbit radii are fixed (type.js L52–78, video L143, L244–260). The font is the latin subset only, so other scripts fall back to system fonts.
- **R17 – glass ordering:** bubbles are sorted only into back and front. Overlapping front bubbles share one blurred backdrop, so they don't refract each other (renderer L637–642).
- **R18 – NaN sub-frames:** a NaN `d` in `subframes` gives N = NaN, zero sub-frames and a black frame (stage.js L73–79, video L430). Guard with `Number.isFinite`.
- **R19 – v1 dependency:** stage2 imports the v1 clock (stage.js L6). Deleting `stage/` breaks v2.
- **R20 – gamma-space mipmaps:** mipmaps are built on sRGB premultiplied data (gl.js L66–87), slightly darkening fine bright detail at 0.56×. This is part of the approved look, so do not change it silently; keep it consistent across Mallows.
- **R21 – minor inefficiencies:**
  - The overlay is uploaded every frame even when empty (video L434–441, renderer L682–685).
  - The mesh covers transparent padding (wasted fragments).
  - `SoftBody.R` is unused.
- **R22 – no automated brand QA:** flash/strobe luminance, text motion, loop-seam Δ and safe zones are checked by hand today. Unlimited generation needs these as automated gates.