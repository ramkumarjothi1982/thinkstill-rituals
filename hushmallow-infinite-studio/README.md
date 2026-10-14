# hushmallow Infinite Studio — Phase 1: Video 1

**"My Brain at 2 AM" — v2**: 15 s · 1080 × 1920 (9:16) · 30 fps · H.264 + AAC · loops seamlessly

This folder holds **one** fully rendered short and the source that reproduces it
exactly. It is the approval gate before any generator is built: there is no
dashboard, no batch mode, no templates and no "infinite engine" here.

v1 was not approved. v2 replaces its whole execution — renderer, character
animation, face, story treatment, cinematography and score. v1 is kept only for
comparison (see the end of this file).

> **Phase 2 is under way** (`docs/PHASE2-PLAN.md`). v2 is approved and **frozen**:
> its files are hash-locked in `qa/golden/v2/frozen.sha256` (plus
> `frozen-local.sha256` for the git-ignored render artefacts) and tagged
> `v2-approved`. Phase 2 forks them and never edits them. Before you change anything, read
> `docs/CONVENTIONS.md` (paths, the write jail, the heavy-job lock, `hm`
> commands, tests, goldens) and `docs/OWNER-DECISIONS.md`. Run `npm test` (or, without npm,
> `node cli/hm.mjs test`) and `node cli/hm.mjs guard` before you hand work in.
> `node cli/hm.mjs help` lists every command: so far the render farm (`hm render`,
> `hm status`, `hm doctor`, WP-01), the quality profiles and benchmarks
> (`hm render --profile exact|final|draft`, `hm bench`, `hm bench gate`,
> `hm proof`, WP-02), the planner (`hm plan`, `hm spec …`, `hm approve`,
> `hm reject`, `hm export`, WP-06), the generic score (`hm score`, `hm remux`,
> WP-04) and the QA gates with the review gallery (`hm qa`, `hm qa fixtures`,
> `hm qa gallery`, WP-05; `docs/QA.md`); the generic asset derivation lives in
> `tools/derive/` (WP-07). The composer (`composer/`, WP-03) turns a spec into a
> `direction.json` rendered by runtime v3: `hm render composer/t01-v2` renders
> the approved v2 rebuilt from `specs/golden/t01-v2.json`, bit-identical to v2.
> Its contracts are frozen in `docs/ARCHITECTURE.md`.

| File | What it is |
|---|---|
| `output/v2/my-brain-at-2am-v2.mp4` | **The deliverable**: H.264 High 4.2, yuv420p, BT.709, 1080×1920, 30 fps, 450 frames, 15.000 s; AAC 48 kHz stereo; faststart; −16 LUFS, −2 dBTP; 34.6 MB (all checks in `output/v2/verify.json`) |
| `output/v2/my-brain-at-2am-v2.preview.mp4` | A lighter copy for messaging/phones (11.6 MB, CRF 20, same resolution, frames and audio; ≈ 42.5 dB PSNR vs the master) |
| `output/v2/poster.jpg` | Cover still |
| `AUDIT-v2.md` | My frame-by-frame audit against the ten approval questions, improvements, limitations |
| `output/v2/my-brain-at-2am-v2.soundtrack.wav` | The mixed soundtrack (48 kHz / 24-bit) |
| `output/v2/cues.json` | Every timed story event + the per-frame curves the soundtrack is built from |
| `output/v2/compare/` | v1 vs v2 at the same story beats, 1:1 pixel crops and a sharpness measurement |
| `output/v2/qa/` | Filmstrips (frame-by-frame motion), loop-seam check, audio waveform/spectrogram with cue markers |
| `output/asset-qa/` | Before/after crops proving the face-line removal on the hi-res artwork |

## The story (beat sheet)

| Time | Beat |
|---|---|
| 0.0 s | Noomi asleep on a mirror-still moonlit lake, the approved face exactly as painted, breathing slowly. **ME TRYING TO SLEEP AT 2 AM...** is already on the cover frame |
| 0.26 s | A dream flinch: the body sinks a little, the eyes squeeze, the smile drops |
| **0.40 s** | **The memory hits** — eyes snap wide (pin-prick pupils), a gasp, and the whole body jolts up out of the water: a stretched launch that rounds out in the air (a hypnic jerk) |
| 0.98 s | Heavy jelly landing: the base squashes first and the wave travels up the body and rebounds; rings roll across the lake and wobble the reflection |
| 1.4–2.6 s | Wide-eyed aftermath: "bip… bip" double blink, glances left and right, cheeks flush, shallow panting, a clock that won't stop ticking |
| 3.0 s | **That awkward conversation.** rises in glass from behind Noomi's head — Noomi reads it… and cringes (eyes squeezed, body shrinks, blush flares) |
| 4.0 s | **Did I say something weird?** — worried brows, a wobbly mouth |
| 5.0 s | **Why did I do that?** — a guilty look down |
| 5.6–7.0 s | The three thoughts orbit faster and faster; the eyes chase them; a shiver; clouds swallow the moon, the lake turns choppy, the light goes cold, the camera creeps in |
| 7.0 s | Squeeze… and let go: the swirl stops dead |
| 7.4–8.9 s | **One huge, slow inhale** — the body swells tall and lifts, the thoughts are drawn close |
| 9.2–11 s | **A long exhale** — the body melts into a luxurious elastic squash, a calm ring spreads over the water, the breath carries the thoughts away: each one's words fade, it turns to warm light and scatters into motes. Clouds part, the moon warms, the lake stills to a mirror, Noomi glows softly from within |
| 11.7 s | Eyes open softly — a first glance up at the warm moon, then at us, with a tiny peaceful smile |
| 11.9 s | **Give your feelings somewhere soft to land.** |
| 12.6 s | The approved hushmallow logo (untouched, on a light plate) + **hushmallow.com** |
| 12.8 s | A slow, content blink |
| 13.5–15 s | Eyes drift shut, the warmth eases back into night, the hook returns — and frame 449 flows into frame 0 |

## How Noomi is animated

* **Sharp because it's the source, not an upscale.** The body is the owner-supplied
  1254 × 1254 approved artwork (`hushmallow/assets/source/hires/noomi.webp`), drawn at
  ≈ 0.56× — every on-screen pixel is a *downsample* of the painting. The low-res
  439 px sprite v1 used is not used at all.
* **The face, removed once and rebuilt procedurally.** `tools/derive_noomi_hires.py`
  removes the painted eyes/mouth (and their glows) from the hi-res art — pixels outside
  the edit mask are bit-identical — and measures every painted stroke
  (`assets/noomi/noomi-face.json`). The face is then drawn every sub-frame at the
  painting's own resolution (`stage2/face.js`): glossy navy "gummy" tubes using the
  measured Bézier centrelines, widths, core/upper/lower colours, highlight offset and
  glow; open eyes follow the approved app rig's design (sclera, navy galaxy iris,
  lash line). When the face is at rest the untouched painting itself is shown
  (start and end of the loop); the procedural neutral face matches it to within
  anti-aliasing (`stage2/dev/rest-test.html`).
* **A deformable soft body.** The art is the texture of a 96 × 96 mesh
  (`stage2/softbody.js`). Six degrees of freedom drive it: volume-preserving
  squash/stretch with a water-balloon bulge and a spreading base, breath inflation,
  lean, a lateral jelly mode, a decaying rim ripple and lift. Each vertex reads the
  body state at `t − lag·height`, so impacts travel up the body as a wave.
* **Physics as closed-form functions of time** (`stage2/motion.js`): damped springs,
  impulse responses, ballistic hops and blink curves are evaluated analytically, so
  any instant is exact. That gives true motion blur (3–16 sub-frames per frame,
  more where something moves fast, 0.4 shutter) and a mathematically seamless loop.
* **Lit as it moves** (`stage2/renderer.js`): the body is relit relative to the art's
  own baked lighting (so the approved colours hold at rest): highlights slide as it
  bends, squeezed fluff brightens, the moon rims it, the large-scale form comes
  from the derived normal map, and the scene light shifts cold → warm with the story.

## The world and the camera

WebGL2, rendered headless in Chromium: a procedural night sky (gradient, a textured
moon, moonlit stratus, twinkling stars, two hazy ridges) over a lake that mirrors
the sky and Noomi, with perspective ripple rings, a slow swell and a moon glitter
path; frosted glass thought bubbles (blurred-scene refraction, lit rim, sheen);
HDR compositing, gentle bloom, an art-preserving tone shoulder, split-tone grade,
vignette and fine grain. Everything that moves on its own is periodic over 15 s.
The camera only ever drifts: a slow push-in during the spiral, an easing back on
the breath, a soft follow on the jump — no shakes, no roll, no flashes.

## Sound

All original and procedural (`audio/soundtrack-v2.mjs` on the shared offline
renderer in `audio/soundtrack.mjs`): the project's own Hushmallow sound engine
(Noomi's voice gestures, ritual fx, the moonmilk-cove night bed) plus synthesised
foley, every sound tied to an on-screen event — the eye-pop and rubbery boing on
the take, a water plip on take-off, a heavy wet landing (flump, squelch, water
bloop, a wobbling tail), blink "bips", the cringe squeak, glass bubbles with
rising tings, orbit whooshes panned to each thought, a tension tone and a clock
that speeds up then stops dead, the inhale/exhale, the squash-and-release, glass
chimes and sparkles as the thoughts dissolve, a light warm pad, Noomi's content
glide and the closing chime. Crickets and the sleeping breath run across the loop
seam. Mastered to −16 LUFS, true peak ≤ −1.5 dBTP. No samples, no music library,
no paid services.

## Regenerate it

Requirements: Node 22+, ffmpeg 6+ (libx264, AAC), Python 3 with NumPy, OpenCV, SciPy
and Pillow (only to re-derive the assets). Chromium comes with Playwright.

```bash
cd hushmallow-infinite-studio
npm install                                        # Playwright 1.56.1
python3 -I tools/derive_noomi_hires.py             # (optional) re-derive assets/noomi/* — deterministic, ~100 s
node render/render.mjs --video my-brain-at-2am-v2 --out output/v2   # ≈25 min on 4 CPU cores (software WebGL)
node render/verify.mjs output/v2/my-brain-at-2am-v2.mp4             # spec, playback, loudness, freshness
python3 tools/compare.py output/my-brain-at-2am.mp4 output/v2/my-brain-at-2am-v2.mp4 output/v2/compare
```

Useful variations:

```bash
node render/render.mjs --video my-brain-at-2am-v2 --stills 0,15,3.5s --out output/v2   # PNG stills
node render/render.mjs --video my-brain-at-2am-v2 --dry --out output/v2                 # cue log only
node render/render.mjs --video my-brain-at-2am-v2 --remux --out output/v2               # re-score onto the existing video pass
node audio/soundtrack-v2.mjs output/v2/cues.json out.wav                                # soundtrack only
python3 tools/filmstrip.py output/v2/my-brain-at-2am-v2.mp4 0 1.6 strip.jpg            # consecutive frames
node render/serve.mjs   # then open /hushmallow-infinite-studio/stage2/index.html?video=my-brain-at-2am-v2&play=1
```

Renders are deterministic (seeded; every frame is a pure function of time).

## Layout

```
render/render.mjs          headless Chromium → frames (raw RGBA for stage2) → ffmpeg H.264 → score → AAC mux
stage2/                    v2 stage: gl.js (WebGL2 helpers), renderer.js (all passes), softbody.js,
                           motion.js, face.js, type.js (captions + logo card), stage.js (runtime)
stage2/dev/                face-test.html (expression sheet), rest-test.html (painting vs procedural face)
videos/my-brain-at-2am-v2.js   the direction: timing, body/face/camera/light/palette tracks, bubbles, cues
assets/noomi/              derived from the approved hi-res art (see tools/derive_noomi_hires.py)
audio/soundtrack-v2.mjs    cue → sound plan for v2;  audio/soundtrack.mjs  shared offline renderer + mastering
tools/                     derive_noomi_hires.py, compare.py, filmstrip.py, shot.mjs, timing.mjs
stage/, videos/my-brain-at-2am.js   v1 (not approved), kept for comparison
```

## Safety

The live app is **not modified**. Approved engine files and art are read-only
inputs from `../hushmallow/`; nothing in this folder is part of the Cloudflare
Pages deploy (it publishes `hushmallow/` only, and only from `main`). No paid
APIs or external services are used.

---

## v1 (not approved) — kept for reference

`output/my-brain-at-2am.mp4` was the first attempt: the app's 439 px rig on the
Moonmilk Cove realm, rendered through a 2D canvas stage (`stage/`,
`videos/my-brain-at-2am.js`, `audio/soundtrack.mjs`). Regenerate it with
`node render/render.mjs` (defaults to v1).
