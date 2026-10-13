# Hushmallow Infinite Studio: Phase 2 design (reusable generator)

Root: `/home/user/thinkstill-rituals/hushmallow-infinite-studio` (all paths below are relative to this root unless they start with `/`). The app at `/home/user/thinkstill-rituals/hushmallow` is read-only and is never written to.

I checked the specialist reports against the code: `stage2/*`, `videos/my-brain-at-2am-v2.js`, `render/render.mjs`, `render/verify.mjs`, `audio/soundtrack-v2.mjs`, `templates/story-library.json`, and the app's `realm.js` and realm factories. The machine has 4 cores, 15 GB RAM, about 26 GB free disk, Node 22, ffmpeg 6.1.1, Playwright 1.56.1, and Python with numpy, cv2, scipy and PIL.

---

## 0. Summary

**Strategy.** Treat v2 as a golden master that the generator has to reproduce exactly before it does anything new.
1. Freeze the v2 code path.
2. Fork the engine behind the seam v2 already has (`state(t)` → renderer).
3. Rebuild "My Brain at 2 AM" as template T01, assembled from a library of beats lifted from v2.
4. Prove it matches: compiled state equal to v2 within 1e-9 at all 2,441 sampled times (450 frame centres plus 1,991 sub-frames), the same cue log, and identical frames.

Only after that do optimisations, new Mallows, realms and templates go in. Each one is gated by the same golden tests plus automated QA.

**Key decisions**

1. **v2 is frozen and becomes the reference.** `stage2/`, `videos/my-brain-at-2am-v2.js` and `audio/soundtrack-v2.mjs` stay byte-frozen; a test checks their hashes. New code lives in `engine/` (browser), `core/` (pure, deterministic, runs in Node and the browser) and `studio/` (Node CLI). Spec `specs/golden/t01-v2.json` must always reproduce the approved film.
2. **The generator only picks; it never writes.** All copy, moves, palettes and assets come from curated, versioned, owner-approved data. Nothing is generated as free text at render time. The planner can only choose beats, packs and realms marked `implemented` and `approved`.
3. **The "moves" system is a library of code beats that write into typed channels.** Each beat is a parameterised macro lifted from v2 (one beat drives 10–20 tracks with hand-tuned spring values). Templates are data that place beats on a beat clock. A per-Mallow acting layer scales and maps each beat to that character. Noomi's acting layer is the identity function, so v2 is unchanged.
4. **Faces use one style per face family:** `closed-tube` (Noomi, Blubi, Loomi), `open-socket` (Boppo, Pipzi), `spiral` (Zuzu), `heavy-lid` (Glitzi). Mouth styles are separate. Every Mallow is derived from its 1254 px approved art with one generalised derivation tool; re-running it on Noomi must give byte-identical files.
5. **Worlds are World modules with a fixed uniform/state API.** The v2 lake becomes the first module of a "SkyWater" family (Moonmilk Cove, Blue Drift, Raindrop Lagoon). A "StageFloor" family covers Static Storm, Spiral Observatory, Spark Festival and Sunpop Orchard. Set pieces come from the app's own realm designs. An early spike checks whether the app's static layers can be captured as plates without touching the app.
6. **Sound recipes live next to the beats that emit their cues.** This removes the class of bugs where picture and sound disagree (audit R10/R11). The app's engine provides all 7 Mallow kits and 7 realm beds today. Synth notes are written as scale degrees and transposed to each kit.
7. **No silent fallbacks.** A missing face JSON, cue or asset makes the render fail. Every texture the page loads is checked against an allowlist of approved, hash-pinned assets.
8. **Determinism:**
   - every frame is a pure function of t;
   - lint bans `Math.random`, `Date.now` and `performance.now` in `core/` and `engine/`;
   - seeded named RNG streams;
   - pinned Chromium, font and ffmpeg versions;
   - cues and curves always come from the dry run, so rendering order doesn't matter (fixes R12).
9. **Owner approval at each milestone,** plus smaller owner checkpoints inside M2 (each Mallow) and M3 (each realm, and the prop sheet). Internal renders get a burned-in "INTERNAL" or "DRAFT" corner mark so unapproved content can't be posted by accident.

**Render budget.**

| | Time per 15 s video |
|---|---|
| Today | about 26 min (≈1,580 s) |
| M1 target, final quality, 1 worker | ≤ 12 min (stretch ≤ 9; estimate after optimisations about 7.8 min) |
| Draft profile | ≤ 3 min |
| Sustained throughput, 2 workers | about 7–9 final videos per hour, about 150/day at most |

Owner review, not CPU, is the real limit on how much can be published.

| Milestone | Scope | Focused work | Calendar (3 streams) | Machine time | Review batch |
|---|---|---|---|---|---|
| M1 | Generator core, Noomi, T01 (golden) + T26 + T22, QA, CLI, gallery, perf pass | ≈ 28–34 d | ≈ 2 weeks | ≈ 6 h | 6 videos |
| M2 | All 7 Mallow packs, 4 face styles, 5 mouth styles, acting profiles, fidelity QA | ≈ 38–46 d | ≈ 3–4 weeks | ≈ 10 h | 7 character packs (sheets + test reels) |
| M3 | 7 realms, full move library for 28 templates, batch planner/scheduler, ops | ≈ 60–75 d | ≈ 5–7 weeks | ≈ 14 h | 14 publish-ready videos + a 2-week posting order |

"d" means one focused working day for one engineer or agent stream. Machine time is the hard limit: 4 shared cores. Benchmarks need the machine to themselves.

---

## 1. Non-negotiables, how they are enforced, and owner decisions

| Rule | How the system enforces it |
|---|---|
| Never edit or redeploy the app | `tests/guard-app-untouched.test.mjs` fails if `git diff --quiet -- hushmallow/ .github/` is not clean. All output paths go through `studio/lib/paths.mjs`, which refuses anything outside the studio root. App modules are imported read-only, either directly (as v2 does with `registry.js`) or fetched as text and patched in memory (as `soundtrack.mjs` does with `audio.js`). |
| No paid APIs or services | No network code apart from the local static server. Lint bans `fetch('http` to non-local hosts in `studio/`. |
| Approved assets only; design preserved; never upscaled | Packs pin a sha256 of each source `hires/<id>.webp` and each derived file. The runtime logs every texture URL and QA gate Q8/Q9 compares it with `packs/allowlist.json`. The renderer logs the maximum art→screen magnification per raster per frame; Q8 fails if it goes above 1.0. Deformation limits are checked at compile time (Q2). |
| lowercase "hushmallow"; logo never altered | Copy lint. `LogoCard` is the only code that draws the logo: uniform scale and fade only. Q9 compares the logo region with a reference crop. |
| No bouncing or shaking text; no strobe or flashes; no breath-hold instructions | Only `TextBlock` (rise and fade) and `LogoCard` exist; the spec schema has no other text motion. Q5 runs a flash and luminance scan. Copy lint bans breath-hold phrasing. R-BREATH timing is checked at compile time. |
| No camera shake or roll | The camera channel schema has no roll or noise field. Zoom must stay in 0.95–1.10 and change by at most 0.04 per second (Q2). |
| v2 quality bar | Golden gates G-STATE, G-CUES and G-PIXEL on every engine change; rest-match and fidelity probes for every Mallow. |

**Owner decisions.** Each has a default so work isn't blocked; the owner signs it off at the stated point.

| # | Decision | Default | Needed by |
|---|---|---|---|
| D1 | Loomi canonical look: 2-arc hi-res art vs 4-arc app art | 2-arc hi-res, no brows at rest | WP2.4 |
| D2 | Boppo canonical look: hi-res grin with tongue vs app crescent | hi-res | WP2.7 |
| D3 | Zuzu: hi-res proportions; designs for closed eyes and closed mouth; highlights stay fixed while the spiral turns; replace `spiralHue` rainbow with a cyan/magenta/violet shift | as stated | WP2.9 |
| D4 | Glitzi: invented top half of the eyeball when lids rise (limit 28 px); asymmetric eyes kept | as stated | WP2.8 |
| D5 | Closed-eye designs for Boppo and Pipzi (not in the paintings) | maroon tube on the lid curve, owner still | WP2.6/2.7 |
| D6 | Face caching (draw once per frame) changes a few v2 pixels; accept if PSNR ≥ 45 dB vs exact | accept | WP1.8 |
| D7 | Audio loop wrap and R11 breath-sound fix change the v2-style audio slightly | on for new videos; off only in the golden check | WP1.6 |
| D8 | Static Storm without lightning or flicker; glitch bursts are displacement-only | as stated | WP3.3 |
| D9 | Contrast fixes for daytime realms (Loomi blue on blue; Boppo orange on apricot) | rim light + darker water band / green meadow island | WP3.2/3.6 |
| D10 | Optional extras not in the app realm (Moonmilk lighthouse and aurora; Pipzi pond) | Moonmilk extras behind a flag; no pond | WP3.2/3.5 |
| D11 | Each new prop's look (glass card, meter, cloud, cone, blocks, lantern…) | approved together on one prop sheet | WP3.7 |
| D12 | Noomi colour conflicts between approved v2 and the registry (tongue `#ff8ab0` vs `#ff6f9c`; source-over blush vs screen) | the approved v2 output wins for Noomi; for the other six, the measured hi-res art wins | WP2.2 |

---

## 2. Architecture

### 2.1 Layers and data flow

```
 templates/story-library.json   packs/mallows/<id>/   packs/realms/<id>/     (curated data, versioned, approval flags)
            │                          │                     │
 studio/plan  ── seeded slot sampler + constraints + ledger cooldowns + uniqueness ──►  VideoSpec (JSON, fully determined)
            │
 core/compose ── beat clock(D) → beat sheet → beats → channels/events/props/cues → Timeline (pure, hashable)
            │                                   (core/acting: per-Mallow filter)
 engine/runtime (headless Chromium, WebGL2/SwiftShader)
      Direction v3 = evaluators(Timeline) → state(t)  ──► Renderer: World module → sub-frames (mesh, face, glass, particles)
                                                         → accumulate → bloom → post → overlay → raw RGBA (binary POST)
            │                                                      │
 studio/render (worker pool, 90-frame segments, resume, ffmpeg)    studio/audio (dry-run cues + curves → plan → offline engine → master)
            │                                                      │
            └────────────── mux (AAC, faststart, provenance) ──────┘
 studio/qa  (gates Q0–Q12) → output/batches/<b>/<id>/qa/report.json → ledger/ledger.jsonl → static gallery → owner
```

### 2.2 File layout

```
hushmallow-infinite-studio/
  stage2/  videos/my-brain-at-2am-v2.js  audio/soundtrack-v2.mjs   FROZEN v2 reference (hash-locked; legacy route only)
  stage/  videos/my-brain-at-2am.js                                v1 (kept for comparison; no longer imported by anything new)
  core/                               pure ES modules, no DOM; Node + browser
    motion.js                         copied verbatim from stage2/motion.js (+ unit tests asserting equal outputs)
    rng.js                            hash32(seed, stream) → xoshiro128**; mulberry32 kept for v2 compatibility
    clock/beat-clocks.js              10/12/15/20 s anchor tables (from story-library beatClocks) + anchor expressions
    timeline/channels.js              channel registry: type, merge rule, default, range, units
    timeline/builder.js               ChannelBuilder used by beats (key/kick/hop/shimmer/env/event/cue/prop/look)
    timeline/compose.js               layout phase → acting phase → freeze → Timeline JSON
    timeline/evaluate.js              Timeline → evaluators (Track/Impulses/Hops/Blinks/spline) → pure functions of t
    beats/registry.js                 library IDs (G-*, M-*, R-*, LP-*, C-*, A-*) → implementation + status + approval
    beats/v2/*.js                     beats extracted verbatim from v2 (§4.3)
    beats/gags|metaphors|rituals|loops|cameras|arcs/*.js
    props/*.js                        prop programs (orbit, rise, echo, stack, slide, pulse…) – pure kinematics
    acting/profile.js                 per-Mallow energy/time scaling (Noomi = identity), eye gate, limits
    acting/param-map.js               app expressions.js PARAMS ↔ studio face params (+ tests over all presets)
    layout/text.js                    hook auto-fit, bubble wrap, safe-zone boxes (measurer injected)
    layout/fredoka-metrics.json       advance widths for Node-side linting (the browser measurement is authoritative)
    spec/schemas/*.json               VideoSpec, MallowPack, RealmPreset, BeatSheet, Timeline, Ledger, QAReport
    spec/validate.mjs                 schema + semantic validators (Q1/Q2)
    copy/lint.js                      banned/caution lists, time-word↔ToD, glyph coverage, structural copy rules
    direction.js                      Timeline + packs → Direction v3 {meta, setup, state, overlay, subframes, dispose}
  engine/                             browser runtime (forked from stage2, behaviour-identical at M1 start)
    gl/gl.js
    render/renderer.js  render/passes/{mesh,glass,particles,bloom,post,accum,readback}.js  render/profiles.js
    world/api.js        world/realms/<realm-id>/{module.js, world.glsl.js, refl.glsl.js?, plates.js?}
    body/softbody.js
    face/face.js (dispatcher, cache, box upload)  face/tube.js  face/materials.js
    face/styles/{closed-tube,open-socket,spiral,heavy-lid}.js  face/mouths/{line,crease-ribbon,grin,cavity,open-lip}.js
    face/iris/{galaxy-navy.js, sprite.js}  face/extras/{blush,tears,lids}.js
    type/type.js (TextBlock, LogoCard)     fx/particle-atlas.js     props/glass-content.js
    runtime/stage.js  runtime/clock.js (copied from v1, removes R19)  runtime/asset-log.js  index.html
  packs/
    allowlist.json                    every loadable asset + sha256
    mallows/<id>/pack.json            (derived files live in assets/<id>/)
    realms/<id>/preset.json
  templates/
    story-library.json  validate-library.mjs           (already exist; untracked → committed in WP1.0)
    beatsheets/standard.json  beatsheets/T01.json …    template → beat placement (most templates use standard + overrides)
  assets/<id>/                        derived per-Mallow assets (committed; renders never need Python)
  tools/derive/                       common.py, derive_mallow.py, finders/{closed_tube,open_socket,spiral,heavy_lid}.py,
                                      configs/<id>.json, asset_qa.py      (derive_noomi_hires.py kept as a thin wrapper)
  studio/
    hms.mjs                           CLI entry ("bin": {"hms": "studio/hms.mjs"})
    plan/{sample.mjs, constraints.mjs, fingerprint.mjs, schedule.mjs}
    ledger/{ledger.mjs}               → ledger/ledger.jsonl (append-only, committed)
    render/{serve.mjs, worker.mjs, queue.mjs, encode.mjs, segments.mjs}   lib/{paths.mjs, heavy-lock.mjs}
    audio/{plan.mjs, recipes/*.mjs, layers/*.mjs, instruments.mjs (from soundtrack.mjs renderInPage), master.mjs}
    qa/{spec.mjs, compile.mjs, verify.mjs, audio.mjs (+ audio/qa.py), flash.py, text.mjs, seam.py, fidelity.py,
        brand.mjs, dupes.py, report.mjs}
    golden/{capture-v2.mjs, compare-state.mjs, compare-pixels.py}
    gallery/build.mjs
  specs/golden/t01-v2.json            the v2 lock spec
  tests/  (node:test + pytest)   tests/golden/v2/{state.ndjson.gz, cues.json, timeline.json, frames/*.png, plan-v2.json}
  docs/   ARCHITECTURE.md AUTHORING-BEATS.md MALLOW-PACKS.md REALMS.md TEMPLATES.md QA.md BRAND-RULES.md RENDER-OPS.md DECISIONS.md
  output/batches/<batch>/<videoId>/…  (gitignored; see §11)
```

### 2.3 The seams (interfaces)

**Direction v3** is a superset of today's contract, so the frozen v2 module still runs on the new runtime through an adapter.

```js
// core/direction.js → object consumed by engine/runtime/stage.js
{ meta: {id, title, fps, duration, shutter, profile},
  setup(stage) → Promise,           // loads pack assets (fails hard if missing), builds textures with content-hashed keys
  state(t, stage, {center}) → S,    // pure; same S shape as v2 (see v2-code report §3) plus optional fields below
  overlay(ctx, t) → bool,           // false when no text is visible (skips the 13 ms draw and upload)
  subframes(t) → int,               // 1..16, Number.isFinite guard (R18), floor set by the quality profile
  dispose() }                       // frees textures and meshes (R4); one page can render several specs

// new optional fields in S (absent = v2 behaviour)
S.world = { module: 'moonmilk-lake', loop: D, ...moduleUniforms }   // world.loop is always set (fixes R6 for other durations)
S.mallow.lidXform = {L:{dy,rot,pivot}, R:{...}}                     // Glitzi pad warp (shader uniform; ignored when weight map absent)
S.mallow.emission = {gain, drift, burstRows:[...]}                  // Glitzi glitch layer
S.mallow.xf = {x, y, s}                                             // per-time placement (slide/shrink DOFs)
S.glass[] = [{shape:'bubble'|'card'|'pill'|'disc', layer:'back'|'front', content, ...v2 fields}]
S.particles[i].shape = 0..7         // atlas index (0 = v2 soft round; instance stride 7 → 8 floats)
```

**World module** (`engine/world/api.js`):

```js
export default {
  id, family: 'skywater'|'stagefloor', ground: 'mirror'|'glossy'|'opaque',
  programs(gl) → {world, refl?},           // GLSL sources; 'opaque' grounds skip the reflection passes entirely
  async bake(ctx, preset, spec) → plates,  // static layers rendered once per video (sky gradient bands, far silhouettes, set-piece plates)
  uniforms(stateWorld, plates) → object,   // per-frame uniform values
  light(stateWorld) → {dir,key,rim,rimAmt,spec,specCol,ambient,glowCol,sss},
  periodic: true,                          // contract: everything animated is periodic in world.loop
  limits: {maxSetPieceSystems: 3}, cost: {targetMsPerFrame: 350} }
```

**Face style** (`engine/face/styles/*.js`):

```js
export default {
  id, neutral(spec) → P0,                  // per-Mallow rest pose (Noomi: v2 NEUTRAL)
  box(spec) → [x0,y0,x1,y1],               // from the spec, including glow padding, brow lift and max eyeScale (fixes R15)
  quantise(P) → key,                       // perceptual quanta per param; phase params dropped when their amplitude ≈ 0 (fixes R1)
  motionPx(Pa, Pb, spec, scale) → px,      // for subframes()
  draw(ctx, layers, spec, P) → dirtyRect,  // cached static layers (brows, iris sprites, socket glows) per bucket
  lidXform?(spec, P), emission?(spec, P) }
```

**Beat** (`core/beats/*.js`):

```js
export default defineBeat({
  id: 'hypnic-jolt', library: 'G-JOLT', kind: 'gag', status: 'implemented', approved: true,
  anchors: ['ANTIC','GAG','IMPACT'],        // resolved from the beat clock
  params: { height: {default: 165, range: [100, 180], unit: 'artpx', energy: true} },
  needs: ['ground:any'], mallows: 'all', minWindow: 0.75,
  build(b, at, p, act) { /* b.key('squash', at.GAG, -0.26, {f:6, z:0.5}) … b.cue(at.GAG, 'take') */ },
  sound: { take: (cue, k) => [...], land: (cue, k) => [...] } })   // recipes co-located with cue emission
```

---

## 3. Data model (schemas in `core/spec/schemas/`)

**VideoSpec** is the single input to a render. It is fully determined: there is no randomness left after planning.

```json
{ "$schema": "hms-video-spec/1", "id": "t26-noomi-15-7f3a9c", "internal": false,
  "template": "T26-nostalgia", "beatsheet": "standard", "duration": 15, "fps": 30,
  "mallow": "noomi", "realm": "moonmilk-cove", "tod": "night",
  "gag": "G-DOUBLETAKE", "metaphor": "M-DREAMBUBBLES", "ritual": "R-SAVOUR", "loop": "LP-OBJECT",
  "camera": "C-DRIFT-IN", "arc": "A-DIM-SOFT",
  "copy": { "hook": ["ONE SONG AND I'M", "BACK IN 2012"],
            "lines": ["Remember that summer?", "Everything felt new.", "Happy-sad. Both."],
            "end": {"kind": "insight", "lines": ["Happy and sad", "can share one heart."]}, "locale": "en-GB" },
  "seed": 2093411, "jitter": {"world": {"hue": 2.1, "warmth": -0.04, "exposure": 0.01}, "timingMs": 80},
  "score": {"contour": "arch-1", "tickTempo": 1.0},
  "quality": "final", "compat": null,
  "pins": {"engine": "git:abc123def456", "library": "1.0.0",
           "packs": {"noomi": "sha256:…", "moonmilk-cove": "sha256:…"}} }
```

**MallowPack** (`packs/mallows/noomi/pack.json`):

```json
{ "id": "noomi", "registry": "noomi", "approval": {"status": "owner-approved", "date": "2026-10-13", "by": "owner"},
  "source": {"path": "../hushmallow/assets/source/hires/noomi.webp", "sha256": "…"},
  "assets": {"pristine": "assets/noomi/noomi-art.png", "clean": "assets/noomi/noomi-clean.png",
             "normal": "assets/noomi/noomi-normal.png", "face": "assets/noomi/noomi-face.json",
             "extra": {}, "cropOffset": [29, 116], "hashes": {"…": "sha256:…"}},
  "placement": {"baseX": 540, "baseY": 1300, "scale": 0.56, "maxZoom": 1.10},
  "body": {"lag": 0.062, "bins": 48, "limits": {"minHeight": 0.6, "maxStretch": 1.3, "minShrink": 0.6}},
  "face": {"style": "closed-tube", "mouth": "line", "eyeGate": [0.5, 0.95], "restWindow": "standard",
           "overrides": {"tongue": "#ff8ab0", "blushMode": "source-over-v2"}},
  "light": {"rimMul": 1.0, "specMul": 1.0, "glowMul": 1.0},
  "acting": {"energy": 0.5, "ref": "noomi", "signature": {"gag": "G-JOLT", "ritual": "R-CLOUDWRAP"},
             "particles": ["moon-star", "z-glyph-icon", "puff"]},
  "sound": {"kit": "noomi"}, "realms": ["moonmilk-cove"] }
```

**RealmPreset** (`packs/realms/moonmilk-cove/preset.json`):
- `module`, `family`, `ground`, `approval`, `tods` (taken from the library's realm/ToD table);
- `palettes[tod] = {base, heavy, warm}`. For Moonmilk night these are v2's `PAL.night`, `PAL.cold` and `PAL.warm`, verbatim;
- `dials` maps the four mood dials plus transform p to palette axes and uniforms. For Moonmilk the mapping is the identity on v2's `cold`/`warm`/`agitation` axes;
- `constants`: horizonY 1150, moon [850, 590, 50], water and hill parameters (v2 values);
- `light[tod]`: v2 light dir [0.45, 0.55, 0.7];
- `setPieces` with flags, `bed: "moonmilk-cove"`, `layers` (crickets for night ToDs).

**BeatSheet** (`templates/beatsheets/standard.json`; templates override only what differs):

```json
{ "id": "standard", "acts": [
  {"beat": "sleep-breath", "from": "COVER", "to": "ANTIC", "resume": "SETTLE", "when": "mallow.restPose=='asleep'"},
  {"slot": "gag"}, {"beat": "aftermath", "at": "IMPACT+0.4"},
  {"slot": "metaphor", "lines": "copy.lines", "at": ["L1","L2","L3"], "peak": "PEAK"},
  {"beat": "turn-stop", "at": "TURN"}, {"slot": "ritual", "window": "RITUAL"},
  {"beat": "eyes-open-content", "at": "OPEN"}, {"beat": "end-card", "at": "RESOLVE", "logo": "LOGO", "out": "CARD_OUT"},
  {"beat": "slow-blink", "at": "LOGO+0.2"}, {"beat": "settle", "at": "SETTLE"}, {"slot": "loop", "hookIn": "HOOK_IN"} ],
  "arc": "template.palette", "camera": "spec.camera" }
```

**Timeline** (compiled, written as `timeline.json`, hashable):
- `channels{name: {type, keys[], kicks[], hops[], env[]}}`
- `events{ripples[], blinks[], shimmers[]}`
- `props[]` (program, params, content refs)
- `text[]` (blocks with boxes)
- `cues[]`
- `layout` (measured boxes and safe-zone report)
- `loop: {D, breathPeriod}`

**Ledger record** (`ledger/ledger.jsonl`, one JSON object per line):
- `{id, specHash, fingerprint, visibleSlots, state: planned|rendered|qa_pass|qa_fail|approved|rejected|published, at, batch, channel?, publishedAt?, reason?, dhash[12], files{mp4, sha256}}`

**QA report** (`qa/report.json`):
- `{gates: {Q1..Q11: {pass, metrics, artefacts[]}}, timings, provenance, warnings[]}`

---

## 4. The timeline and "moves" system

### 4.1 Channels and merge rules (`core/timeline/channels.js`)

| Group | Channels | Type → evaluator | Merge rule |
|---|---|---|---|
| body | `squash`, `inflate`, `lean`, `lift` | `Track` (spring or eased) + `Impulses` / `Hops` | Track keys collected as (t, v, opts), **stably sorted by t, duplicates rejected**, then built (fixes R5; `Track.to` captures `d = v − last`). Impulses, hops and shimmers sum (shimmer: max). |
| body (new) | `slideX`, `shrink` | Track | as above; `shrink` scales `xf.s` uniformly, `slideX` offsets `xf.x`. The reflection and contact shadow follow automatically. |
| body envelopes | `sleepBreath`, `pant`, `tremble` | `{start, end, fadeIn, fadeOut}` lists | max over layers. The same function feeds the body and the score (fixes R11). |
| face | all `Face` params (eyeOpen, lidTop/Bot, squint, closedCurve, eyeStretch, eyeScale, irisScale, look, sparkle, brow*, mouth*, blush, tears, glitch, spin…) | Track; `blink` → `Blinks`; `look` → Track whose targets can be references | as body; `rest` is an envelope (standard: 0–0.17 s and the last 0.5 s, from the beat clock) |
| world | `cold`, `warm` (grade poles), `agitation`, `heaviness`, `clarity`, `transform` | `spline` (monotone cubic; duplicate times rejected) | the last author per key time wins, with a validator warning |
| world events | `ripples`, `skyEvents` (falling star), `pulses` (soft only) | event lists | union, max 8 ripples at once (shader limit) |
| camera | `camY`, `zoom`, `follow` | spline + follow factor | single owner (the camera beat) |
| props | instances with programs | pure kinematics | layout assigns slots |
| text | hook, hookReturn, end, logo | TextBlock / LogoCard params | single owner |
| particles | emitters (motes, sparks, stars…) | closed-form, seeded | union |
| audio | cues + derived curves | — | beats own their cue names |

### 4.2 Beat contract and an example

```js
// core/beats/v2/hypnic-jolt.js — numbers copied verbatim from videos/my-brain-at-2am-v2.js L90–117, L178–205
build(b, at, p, act) {
  const A = act.amp, F = act.freq;                       // both exactly 1 for Noomi (identity profile)
  b.hop(at.GAG, at.IMPACT, p.height * A.hop);
  b.key('squash', at.ANTIC, 0.07, {f: 4.5*F, z: .75});  b.key('squash', at.GAG, -0.26 * A.squash, {f: 6*F, z: .5});
  b.key('squash', at.GAG + 0.13, -0.02, {f: 4.5*F, z: .75}); b.key('squash', at.GAG + 0.40, -0.09, {f: 3.5*F, z: .9});
  b.key('squash', at.IMPACT, 0, {f: 9*F, z: 1});      b.kick('squash', at.IMPACT, 0.27 * A.squash, 3.0, 0.24);
  b.shimmer(at.IMPACT, 1.0, 3.0, 19);  b.ripple(at.GAG + 0.02, 0.32); b.ripple(at.IMPACT, 1.0); b.ripple(at.IMPACT + 0.2, 0.42);
  act.face(b, 'jolt-wide', at.GAG);                      // Noomi: raw v2 keys; others: mapped expression
  b.cue(at.ANTIC, 'flinch'); b.cue(at.GAG, 'take'); b.cue(at.GAG + 0.02, 'lift_off'); b.cue(at.IMPACT, 'land', {amp: 1});
}
```

Beat times are always relative to resolved anchors. v2 used absolute times, so extraction rewrites them as `anchor + offset`. On the 15 s clock this gives back exactly v2's numbers.

### 4.3 The beat library and its mapping to the story library

**Extracted verbatim from v2 in M1** (T01 must match):
- `sleep-breath`
- `dream-flinch`
- `hypnic-jolt` (G-JOLT)
- `aftermath` (blinks, glances, lean, pant, blush, brow, wobbly mouth)
- `thought-pop` + prop `orbit` (M-ORBIT)
- `orbit-spiral` (PEAK)
- `squeeze-release` (TURN)
- `breath` (R-BREATH)
- `dissolve`
- `eyes-open-content`
- `end-card`
- `slow-blink`
- `drift-to-sleep`
- `hook-return` (LP-BASE / LP-RETURN)
- arc `A-COLD-DIP-WARM`
- camera `C-DRIFT-IN`

**New in M1** (for T26 and T22):

| Move | Kind | Built from |
|---|---|---|
| G-DOUBLETAKE | gag | look track + mini `Hops` + squash kick |
| G-FLOP | gag | squash to height 0.62 / width 1.35 + slow "schlorp" recovery spring |
| M-DREAMBUBBLES | metaphor | `rise` program for glass bubbles, warm sepia tint |
| R-SAVOUR | ritual | body glow ramp ≥ 0.6 s, warm grade, slow star particles |
| R-DRIFT | ritual | `slideX` + bob + lean, calm ripple |
| LP-RETRIGGER, LP-OBJECT | loop | object present on frame 0 and re-entering at D − x |
| A-DIM-SOFT, A-GREY-CLEAR | arc | dial keyframes on beat anchors |
| C-HOLD-WIDE | camera | zoom 0.96, follow 0 |

**M3: all remaining moves** (19 gags, 25 metaphors, 17 rituals, 5 loops, 5 cameras, 9 arcs).

Every library ID has an entry in `core/beats/registry.js` with a `status` and an `approved` flag. The planner treats a template as eligible only when its required moves, or at least one listed alt for each slot, are implemented and approved. That way the library opens up template by template without config changes.

### 4.4 Beat clocks and duration

- Anchors come from `story-library.json → beatClocks` (10/12/15/20 s). The 15 s clock equals v2's `T` exactly.
- Fixed rules:
  - the gag impact lands by 1.0 s;
  - the end card is anchored to D;
  - only escalation and ritual stretch;
  - 20 s adds a fourth line at 8.0.
- Breath period = D/k, with k the integer that brings the period closest to 3.75 s (15 s → 4 breaths, the v2 value).
- Anchor expressions allow `NAME±s` and `RITUAL.0` / `RITUAL.1`.
- A ritual whose `minDur` doesn't fit the window is rejected at planning (from the library: R-BREATH needs ≥ 3.2 s, so not 10 s).

### 4.5 The acting layer (`core/acting/`)

Purpose: the same beat reads differently on each Mallow, while Noomi stays exactly v2.

- **Energy scaling.**
  - Amplitude: `A = clamp((E/E_ref)^0.5, 0.7, 1.4)`, with `E_ref` = Noomi's personality energy 0.5.
  - Frequency: `F = 1 + 0.25·(E − 0.5)`.
  - For Noomi, `A = F = 1` exactly.
  - After scaling, deformation limits are re-clamped (height ≥ 0.6, stretch ≤ 1.3, shrink ≥ 0.6).
- **Expressions.** `act.face(b, name, t, {intensity, hold})` resolves through the app's own `expressions.js` presets plus per-Mallow overrides (imported read-only). `param-map.js` then converts the app `PARAMS` into studio face channels:
  - **eye gate:** closed-eye Mallows open their eyes only when intensity is at or above `eyeGate[0]`;
  - **eye-pop translation:** Glitzi's "surprised" becomes a pad raise, Zuzu's becomes spin;
  - **energy-derived timing.**
- **Raw keys.** v2 beats keep their raw face keys (exact), and `act.face` with the name `'v2:<label>'` passes them straight through.
- **Signature particles and fx** per Mallow come from the pack: moon-stars, shards, droplets, sparks, ribbons, rings.
- **Tests.** For every Mallow, the mapping table must cover all 27 app presets. A contact sheet of mapped expressions is rendered for review in M2.

### 4.6 Props and metaphors

- **Glass props** reuse `GLASS_VS/FS` with `shape` (bubble/card/pill/disc) and a content texture (text, simple icon, meter segments, dots, clock face) drawn per prop in the page. This covers cards, tabs, blocks, battery, M-ECHO, M-DOTS, M-FORK, M-ICONS and M-WEEK cheaply.
- **New shaders and atlas shapes (M3):**
  - soft cloud;
  - spotlight cone (fades in, never switches on hard);
  - mist band;
  - far glow;
  - particle atlas (star, droplet, shard, round ring, ribbon, heart/pixel heart, confetti, pebble).
- **Prop programs** (`core/props/`) are pure kinematic functions of (t, layout): `orbit` (v2 `bubbleAt`, verbatim), `rise`, `echo-fan`, `stack-on-head` (attaches to `body.project` of the top point), `slide-in`, `loom-scale`, `fold-away`, `float-up`.
- **Layout rules:**
  - at most 3 readable glass texts on screen besides captions;
  - readable front glass items may not overlap by more than 10% of their area (R17 is handled by layout rather than more blur passes).

### 4.7 Composer phases (`core/timeline/compose.js`)

1. **Resolve**: spec + beat sheet + beat clock(D) → beat instances with absolute anchors. Seeded jitter (±80 ms, stream `timing`) applies only to keys marked `jitter: true`, never to sound-synced anchors or the gag impact.
2. **Layout**: measure text (injected measurer: the page's canvas is authoritative; Node uses `fredoka-metrics.json` with a 3% margin for planning lint), size the glass, place the orbit and the Mallow, build safe-zone boxes.
3. **Acting**: run each beat's `build` against the `ChannelBuilder` with the Mallow's acting profile. References like `look-at prop i` or `camera follow lift` are resolved by evaluating prop programs, which are pure.
4. **Freeze**: sort and validate keys per channel, build evaluators, emit the Timeline JSON and its hash.

### 4.8 Compile-time validators (gate Q2)

- **Loop closure:** evaluate the full `state(t)` numeric tree at 0 and D. Relative difference ≤ 1e-6 on all channels, mesh vertex buffers and face params. Every periodic element runs a whole number of cycles in D.
- **Ordering:** keys monotonic, no duplicate spline times, no NaN anywhere in 2,441 samples (all frame centres plus the sub-frame times for the profile).
- **Body limits:** height ≥ 0.6, stretch ≤ 1.3, shrink ≥ 0.6. Face always above y 1250. Mallow inside its pack's allowed limits.
- **Camera:** zoom 0.95–1.10, rate ≤ 0.04/s, roll ≡ 0.
- **Text:**
  - inside x 60–1020, y 180–1250; right rail (x > 900, y 700–1500) clear; nothing below y 1500;
  - ≤ 3 readable glass texts at once;
  - reading time per glass line ≥ max(1.0 s, 0.25 s + 0.05 s per character) at full visibility;
  - hook ≥ 2.0 s; end line ≥ 2.0 s.
- **R-BREATH:** inhale ≥ 1.2 s, crest ≤ 0.35 s, exhale ≥ 1.5 × inhale, and no breath words in any line.
- **Cue coverage:** every cue type emitted has a recipe and every recipe's required cue exists. Unused cue types are warnings. This replaces the score's silent fallback times (R10).
- **Rest windows:** the face is exactly at rest at 0–0.17 s and in the last 0.5 s.
- **Water chop:** if the realm uses `chopMode: 'v2'`, agitation must be 0 at both t = 0 and t = D. Otherwise the module switches to `chopMode: 'periodic'` (R6).

### 4.9 The v2 equivalence procedure (the core of regression safety)

1. **Capture** (`studio/golden/capture-v2.mjs`) runs the frozen v2 module in a dev harness page:
   - for every frame it records `subframes(t)` and, at each centre and sub-frame time, every numeric leaf of `state()`;
   - it also records `buildMesh` output (both meshes, Float32 buffers hashed per 1,000 vertices) and the face parameter object;
   - plus the cue log, the curves, `buildPlanV2`'s event list, and 16 lossless reference frames at 0, 0.2, 0.4, 0.6, 0.98, 1.1, 3.2, 4.5, 6.5, 7.0, 8.9, 9.6, 10.5, 11.9, 12.8 and 14.9 s;
   - all stored in `tests/golden/v2/`.
2. **G-STATE**: the composer-built T01 (`specs/golden/t01-v2.json`) must match every leaf within 1e-9 absolute, with identical mesh hashes and identical sub-frame counts.
3. **G-CUES**: identical cue list, so rounding and the 400/420 pan normalisations are reproduced exactly.
4. **G-PIXEL (exact profile)**: the new engine renders the 16 frames bit-identically. If SwiftShader turns out to be non-deterministic run to run (checked in WP1.1), the tolerance is max |Δ| ≤ 1/255.
5. **G-PIXEL (final profile, after optimisations)** versus the exact profile: PSNR ≥ 45 dB over the frame and ≥ 42 dB in the face box, SSIM ≥ 0.995, plus an A/B flip sheet for the owner (D6).
6. **G-PLAN (audio)**: with `compat: 'v2'` the generic planner's event list equals `buildPlanV2`'s. With compat off, the differences are exactly the documented fixes (R7, R10, R11) and nothing else.

These gates run on every commit that touches `engine/`, `core/` or `packs/noomi`:
- `npm run test:golden`, about 4 min: state and cues are fast; 4 of the frames are rendered;
- the full 16 frames run at the end of each WP.

---

## 5. Per-Mallow face style system

### 5.1 Styles per Mallow

| Mallow | Eye style | Mouth | Brows at rest | Iris | Special layers | Derivation finder | Rebuilt area | Risk |
|---|---|---|---|---|---|---|---|---|
| noomi | closed-tube | line | hidden (expression-only) | procedural navy galaxy | — | closed_tube (done) | 70.7k px | done |
| blubi | closed-tube + tilt 8.2°, cubic rest curves | line | **painted, always visible** (∩) | navy galaxy | per-stroke under-glow (screen, cyan), tears/wet | closed_tube, 5 strokes, B/luma detector | ≈ 68k zone A | med-high |
| loomi | closed-tube, tilt −22.75/−21.35 | line + lower-lip band | none (D1) | navy galaxy | two-sided glow (inner, outer rim) | closed_tube + F1–F9 clipping fixes | 70–90k | med-hard |
| pipzi | open-socket (ellipses, no lash while open) | cavity (gull-wing, tongue, peach rim) | painted maroon tube | **native hi-res sprite** cut at r ≈ 110 | socket crease, under-glow, outer rim; pentagon catchlight fixed to the light | open_socket | ≈ 290k | hard |
| boppo | open-socket | grin (contour + heart tongue) | painted cubic tubes | native hi-res sprite (≈ 225 px) | crimson upper glow, cream lower band | open_socket | ≈ 229k | high |
| glitzi | heavy-lid (pads = brows, moved by shader UV warp) | crease-ribbon (sampled from the art) | = pads | sprite rebuilt from the art (polar unwrap) | emission layer (streaks/sparkles), glitch rows and bursts | heavy_lid (layer split + mouth transplant) | ≈ 25k (mouth) | high, unique |
| zuzu | spiral (per-pixel phase field from measured Archimedean fit; highlights fixed) | open-lip (lip band, gloss, heart tongue) | hidden | — | socket halo/pink band/bevel; phase-averaged spin blur | spiral | ≈ 308k | hardest |

### 5.2 Face JSON v2 (written by `tools/derive`, read by `face.js`)

```
{ version: 2, mallow, artSize, cropOffset, style, mouthStyle,
  strokes: { eyeL, eyeR, browL?, browR?, mouth }  // cubic (p0,c0,c1,p1) centrelines, width profile w(t), taper,
                                                  // material {core, upperBand, lowerBand, spec{col, offset, width, profile(t)}, beads[]},
                                                  // glow {above:{col, opacity, sigma, reach}, below:{…}}, underGlow {col, peakPx, gain, mode:'screen'}
  eyes: { style-specific block: closed {hw, sag, tilt, cxOff, openR, irisR, irisOff} | socket {cx, cy, rx, ry, rot, sclera[], socketGlow, irisSprite, catchlights[]}
          | spiral {centre, pitch, phi0, squash, handed, colourTable[64], phaseCorr[], rim, halo} | heavyLid {ellipse, lidCurve, lidSkinSprite, weightMap, irisSprite} },
  mouth: { line | crease-ribbon {ribbon sprite, curve} | cavity/grin/open-lip {contours, interior gradient, tongue, lip bands} },
  cheeks: { L:{c, r, sigma, aspect, colour}, R:{…}, base: 0|1, sparkles[] },
  neutral: { …per-Mallow rest params… }, measuredAt: "<tool version + source sha256>" }
```

### 5.3 Shared machinery

- **One tube renderer** (`engine/face/tube.js`) with per-stroke material. The current hard-coded `TUBE` palette becomes Noomi's material, with identical values. `line`, `lineHi`, `mouth.inside/tongue` and `cheeks.colour/base` come from the spec or registry (R9). Noomi keeps its v2 overrides (D12).
- **Blush:** `screen` blend with `cheeks.colour` above `base` for new Mallows; `source-over-v2` for Noomi.
- **New parameters:** browAsym, browCurve, heartEyes, wet, tears, mouthPout, mouthTremble (≤ 6 Hz, small), cheekPuff, tongue, glitch, spin, spinJitter, spiralHue (an approved palette shift, D3).
- **Rest crossfade:** the per-Mallow procedural neutral face must match the painting before the pristine crossfade is allowed (rest-match thresholds in §12, Q8). If a Mallow fails, its pack sets `restWindow: "none"` and the procedural face shows throughout, owner-reviewed.
- **Sprites** are cut only at native resolution. The renderer asserts `eyeScale × irisScale × displayScale ≤ 1`. Boppo's eyeScale of 1.3 therefore caps display scale at 0.77; the planner reads this from the pack.

### 5.4 Face cost and caching

Measured today: 257 ms per redraw, of which about 220 ms is `ctx.filter` blur, × 1,991 redraws ≈ 35% of render time.

- **Cache key:** quantise each parameter. Drop `mouthWavePhase` whenever `mouthWave < 0.01`. Skip drawing when `rest ≥ 0.999`.
- **Redraw policy:** draw once per frame. Redraw per sub-frame only when `motionPx` (blink, eye pop, gaze) exceeds 1.5 px. Expected redraws go from about 1,991 to about 520.
- **Glow blur at quarter resolution** in the scratch canvas, then upscaled: estimate 257 → about 50 ms.
- **Box-only upload** with `texSubImage2D`: 18 → about 8 ms.
- **Static layer caches:** brows, iris sprites and socket glows per openness/scale bucket (Boppo, Pipzi, Blubi).
- **Zuzu:** the spiral is drawn once per frame with a phase-averaged colour table (no extra sub-frames). Spin is capped at 1 turn/s, and 0.3 turn/s when a disc covers more than 25% of the frame. Total spin over the loop is a whole number of turns.
- **Later option (M2, gated):** an SDF tube shader that renders into an art-space FBO, about 10–20 ms. Adopted only if the rest-test mean difference is no worse than today's for every closed-tube Mallow.

### 5.5 Derivation tooling (`tools/derive/`)

- `common.py` takes the existing functions **unchanged**: `crop_art`, `laplace_fill`, `loclin_lowpass`, `norm_blur`, `patchmatch_complete`, the step-6 pipeline, the bit-exact composite and its asserts, `height_normal`, `qa_images`, and the JSON writer.
- **Per-family finders** carry the fixes from the asset reports:
  - **closed_tube** (Blubi, Loomi):
    - B/luma stroke detector;
    - narrow zone A (core + 10 px);
    - pedestal for the near-zero R channel;
    - all-channel least-squares glow fit;
    - cheek handled as its own analytic layer;
    - clipping-aware correction;
    - per-side masks;
    - edge-colour zeroing for transparent pixels.
  - **open_socket** (Boppo, Pipzi):
    - eye-white, iris, brow, mouth and tongue detectors;
    - harmonic base plus fitted cheek field;
    - 5-level PatchMatch with a guidance term, a reuse penalty and per-region source pools;
    - glitter re-seeded at the measured density;
    - native iris cut with the catchlight removed.
  - **heavy_lid** (Glitzi): emission-layer separation first, then a transplanted-patch mouth fill with min-cut seams and `seamlessClone`, plus the pad weight map, lid-skin sprites and ribbon sampling.
  - **spiral** (Zuzu):
    - disc and mouth segmentation;
    - thin-plate global shading prior;
    - cheek extrapolation;
    - 5-level PatchMatch per window;
    - spiral phase-field fit with a correction term.
- `configs/<id>.json` holds thresholds, halo radii and source windows.
- `asset_qa.py` produces the per-Mallow metric suite and writes `output/asset-qa/<id>/`.
- **Regression:** `derive_mallow.py --mallow noomi` must reproduce `assets/noomi/*` byte-identically before any other Mallow is derived.
- **Determinism:** fixed seeds; two runs give identical hashes. Derived assets are committed.

### 5.6 Order and owner checkpoints in M2

1. Blubi and Loomi (closed-tube family, fastest).
2. Pipzi, then Boppo (shared open-socket code).
3. Glitzi and Zuzu (separate streams).

Each Mallow gets an owner checkpoint: a neutral side-by-side with an A/B flip video, an expression sheet, an asset QA pack, and a 6 s internal test reel. Only then is `approval.status` set to `owner-approved`.

---

## 6. The realm and world system

### 6.1 How far to extend the v2 lake: one cinematic grammar for every realm

Every realm is built from the same parts:
- a sky gradient (up to 5 stops);
- one celestial key light: moon, sun or none;
- one soft cloud layer type: stratus (v2), cirrus/lenticular, cumulus billow or mammatus;
- a far silhouette band: v2 hills, pastel cushion hills, islets, crystals, plum hills or arcade;
- ground: `mirror` (v2 lake), `glossy` (rough reflection; Static Storm glass, observatory stone) or `opaque` (contact shadow only; no reflection passes, about 140–170 ms saved per sub-frame);
- 1–3 moving set-piece systems;
- atmosphere: haze, mist, motes.

The restraint rules from v2 apply everywhere:
- a clear "stage" ellipse around the Mallow;
- text zones kept low-contrast;
- at most 3 moving set-piece systems;
- no lightning, flicker or hard light switches;
- weather is expressed through cloud motion and grade.

**Families:**
- **SkyWater** (one parameterised module grown out of v2's `WORLD_FS`/`REFL_FS`/`WATER`): Moonmilk Cove, Blue Drift, Raindrop Lagoon. Raindrop's hanging glass beads are computed analytically in the world shader (small refracting discs), not as glass draws.
- **StageFloor** (shares the sky and post code; adds floor shaders and plates): Static Storm (glossy cracked-glass floor, emissive cracks → mandala), Spiral Observatory (glossy stone, dome, galaxy), Spark Festival (opaque hill and dais), Sunpop Orchard (opaque cloud sea and meadow island).

### 6.2 Palettes, time of day, mood dials, weather, transform

- **Time of day:** only those the library lists per realm. Each ToD is a palette triple `{base, heavy, warm}` plus a light rig.
- **Grade:** blended exactly like v2's `palette(cold, warm)`. The realm's dial map gives `cold = f(heaviness, agitation)` and `warm = f(warmth, clarity)`. Moonmilk night uses the identity map, so T01 reproduces v2.
- **Mood dials** (agitation, heaviness, clarity, warmth) plus transform p are channels keyed by palette arcs on beat anchors. Realms map them to uniforms:
  - agitation → chop, cloud speed, rain;
  - heaviness → cloud cover, mist, dimmer key;
  - clarity → star crispness, cloud clearing;
  - warmth → warm grade;
  - p → the realm's own payoff (clouds part, mirror stills, mandala heals, galaxy resolves, lanterns light, golden hour).
- **Pulses:** soft only: falling star, ring, sunbeam column, golden ring.
- **Grade rules (validator):** exposure changes ≤ 12% over at least 0.5 s; world-only jitter of hue ±6°, warmth ±0.1, exposure ±0.05. The Mallow is relit, never recoloured.

### 6.3 Set pieces: use approved designs, decided by a spike first

The app realms are Canvas2D painters with a deterministic `build(st)` for static layers (seeded `rng(77)`) and stateful per-frame simulations. **WP3.0 spike:** load each realm factory read-only (text-fetched and patched in memory, as `audio.js` already is) inside the studio page. Instrument its `sceneLayer` to capture the static layers at 1080 × 1.15 resolution (headroom for zoom 1.10), with `Math.random` seeded.

- **If that works:** the captured plates are the approved set-piece designs. The WebGL module adds parallax, lighting, reflection and periodic animation on top.
- **If not:** hand-port the static layers to GLSL or studio Canvas2D at the same resolution, using the app code as the design reference.

Either way, all moving elements are re-implemented as closed-form periodic functions of t (phase = 2π·k·t/D; particle lattices wrapped over [0, D)), never dt-stepped simulations.

### 6.4 Lighting rigs and contrast

- `MESH_FS`'s moon-rim term becomes a generic key-rim term driven by the rig. Moonmilk keeps v2's values exactly.
- **Rigs:**
  - night moon (v2);
  - day sun (higher ambient, lower specular; Blue Drift, Sunpop);
  - stage practicals (Spark Festival, observatory);
  - storm halo (Glitzi: strong cyan rim plus a stage halo, with lower `rimMul`/`specMul` because the cyan rim is already painted).
- **Contrast fixes (D9):** Loomi gets golden warmth, a darker foreground water band and a rim. Boppo gets a green meadow island, a contact shade and a cooler rim. Each is checked by a contrast probe: mean luminance contrast between the Mallow silhouette edge and the background ring must be ≥ 1.4:1.

### 6.5 Budget and order

| Realm | Family / ground | World pass target | Key new work | Effort |
|---|---|---|---|---|
| Moonmilk Cove | SkyWater / mirror | ≈ 0.25 s (after v2 world optimisations) | none in M1; M3 options: lavender water, shore band, fireflies, aurora at p, headland + lighthouse (flag, D10) | 2 d (M3 extras) |
| Blue Drift | SkyWater / mirror | ≤ 0.30 s | sun + halo, cirrus/lenticular, islet plates with reflections, river stone, day rig | 3 d |
| Raindrop Lagoon | SkyWater / mirror | ≤ 0.35 s | pastel cushion hills, analytic glass beads, lily pads, rain → `uRip`, beads → light at p | 3 d |
| Static Storm | StageFloor / glossy | ≤ 0.35 s | mammatus pouches, cracks → mandala, constellations, crystal plates, shards; no lightning | 4–5 d |
| Spiral Observatory | StageFloor / glossy | ≤ 0.35 s | log-spiral galaxy (ghosted ↔ crisp), stone floor, ring SDFs, lens = glass, dome plates, shutter reveal | 4–5 d |
| Spark Festival | StageFloor / opaque | ≤ 0.30 s | plum sky (v2 sky recoloured), lantern catenaries, slow wheel, tents, sky lanterns, slow fireworks (rise ≥ 0.45 s, fade over seconds), confetti | 4–5 d |
| Sunpop Orchard | StageFloor / opaque | ≤ 0.30 s | breathing sun + beams, cumulus billows, cloud sea, islands/fruit plates, rainbow at p | 4–5 d |

**Loop test per realm:** render the world pass alone at t = 0 and t = D; max difference ≤ 1/255 with grain off.

---

## 7. Sound

**Inputs.** Always the dry-run `cues.json` plus the per-frame curves. They are order-independent and complete, so segmented and parallel renders produce correct audio (fixes R12).

**The score is three layers** (from the library), all through the existing offline renderer and mastering:
1. **Realm bed** from the app engine (`startBed(realmId)`), driven by the mood-dial curves. All 7 beds exist.
2. **Mallow kit gestures** via `buildMallow(mallowId)`, which fixes R8: no more Noomi voice for everyone. All 7 kits exist.
3. **Studio foley recipes** owned by beats, in the form `beat.sound[cueType](cue, ctx)`. `ctx` provides:
   - the kit's root, scale, speed and send;
   - `note(degree, octave)` (scale degrees, not Hz);
   - the curve sampler;
   - seeded RNG (stream `audio`).

   Noomi's C5 major pentatonic equals v2's `N`, so T01 is identical.

**Layers become parameterised code** whose windows come from cues and channels, not absolute seconds:
- sleeping breath (uses the same envelope function as the body channel; fixes R11);
- crickets (night ToDs);
- ticks (MO-TICK, M-CLOCK);
- swirl (M-ORBIT, following `bx/ba` curves);
- pad (from the ritual onward, voiced on the kit's scale);
- realm-specific beds.

**Motifs** MO-* are recipe functions with seeded contour variants (rising or arching only, never falling at the end). MO-CLOSE is required in every video.

**Seamless loop.** Render [−pre, D + tail], add the tail onto [0, tail], and crossfade the pre-roll so the file is circular (fixes R7). In golden mode `compat: 'v2'` turns this off.

**Mastering:** unchanged (−16 LUFS, ≤ −1.5 dBTP, inter-sample peaks, limiter).

**Remux** (audio-only slots: contour, tick tempo, panning): `hms remux <videoId> --score '{...}'` re-scores onto the existing picture in about 1 min.

**Safety by construction:**
- no samples;
- the recipe allowlist has no ringtone, alarm or heartbeat recipes;
- "buzz" recipes are soft noise patterns approved once;
- a recipe-name lint enforces the allowlist.

---

## 8. Captions, copy and brand safety

- **Sources.** Copy comes only from the library pools: hook primary and variants, L1–L3 pools, resolution variants, brand closers, name words. Adding copy means a library change, then `validate-library.mjs`, then owner approval of the library version, which is pinned in each spec.
- **Text kinds:**
  - hook (cover caption, `TextBlock` at y 286, auto-fit 76 → 50 px);
  - glass lines (inside props, 50 px, wrapped to 2 lines of ≤ 17 characters at the word boundary nearest the middle);
  - end line (y 262, 62 px) **or** brand closer, never both;
  - logo card (y 488, untouched wordmark on its plate, plus "hushmallow.com").
- **Typography:** Fredoka. Both the latin and latin-ext files are loaded (fixes R16), and the lint checks glyph coverage. Data is stored as ASCII and rendered with typographic quotes and apostrophes. Motion is rise and fade only.
- **Lint** (`core/copy/lint.js`):
  - the library's banned and caution lists;
  - "hushmallow" always lowercase;
  - time words in the hook must match the ToD;
  - ≤ 2 question marks per video;
  - no two lines starting with the same word;
  - locale swaps (US "AD");
  - no breath-hold phrasing;
  - the tone/topic blocklist (self-harm, death, illness, body/food, alcohol, drugs, appearance).
- **Readability (Q6):**
  - caption contrast against the local blurred backdrop ≥ 3:1 at full visibility (white with soft ink shadow; the check guards bright daytime realms);
  - minimum rendered sizes: caption ≥ 50 px, glass text ≥ 42 px effective (50 px × bubble scale ≥ 0.85 while readable);
  - reading times as in §4.8.
- **Safe zones:** one strict profile that is the union of TikTok, Reels and Shorts (the library's zones). Per-platform profiles can be added later as data.
- **Cheap caption variants** (M3, optional): render a pre-overlay, pre-grain "clean plate" once (lossless x264 RGB, about 1–1.5 GB per 15 s, kept only on request), then composite hook/end and grain per variant at about 0.2 s/frame. Under the uniqueness rules these count as the same video: they are for A/B tests and cross-platform versions only, and are recorded as `variantOf` in the ledger.

---

## 9. Seeded variation and uniqueness

- **RNG streams.** `stream(seed, name) = xoshiro128**(hash32(seed, name))`. The named streams are `planner`, `timing`, `blinks`, `glances`, `orbit`, `motes`, `decoys`, `worldJitter` and `audio`. Adding a new random choice never shifts existing streams, so old specs keep rendering the same.
- **What the seed varies:**
  - ±80 ms jitter on non-anchored keys;
  - blink placement (minimum spacing 0.9 s, outside cue windows);
  - glance targets;
  - orbit slots;
  - mote seeds;
  - decoy-tab layouts;
  - world jitter (world only);
  - motif contour.
- **Planner** (`studio/plan/sample.mjs`):
  - weighted slot sampling: primary Mallow 3, secondary 1, signature gag about 40%;
  - constraint checks: realm ToD ∩ template ToD, time words, ritual fits its window, the Mallow is allowed the move, the move is implemented and approved, the pack is approved;
  - ledger cooldowns;
  - up to 50 resamples;
  - deterministic given (policy, batch seed, ledger snapshot hash).
- **Fingerprint:** sha256 of canonical JSON {template, mallow, tod, gag, metaphor, ritual, lines, hook, end, camera, seed, duration}. An exact repeat is refused.
- **Distance rule:** any two non-variant videos within 14 days on a channel must differ in ≥ 3 visible slots (Mallow, hook text, line triple, ritual, gag, realm/ToD, metaphor), one of which must be the Mallow or the hook.
- **Perceptual duplicate check (Q10):** a 64-bit dHash of 12 evenly spaced frames at 1/8 resolution. Fail if ≥ 9 of 12 frames are within Hamming distance 8 of any ledger video not declared as a variant.
- **Sequencing** (`studio/plan/schedule.mjs`, from the library's variationRules):
  - no two posts in a row with the same template, Mallow, ritual or gag;
  - each Mallow 1–3 times in any 10 posts;
  - any 7 posts cover ≥ 4 feeling families and ≥ 2 positive or mixed;
  - each template ≤ 2 times in 7 days; T01 ≤ 1;
  - copy cooldowns: hook 90 days; thought line ≤ 3 times in 30 days; resolution ≤ 1 time in 7 days;
  - closers about 30% of posts and never more than 2 in a row.

---

## 10. CLI and review gallery

`node studio/hms.mjs <command>` (also `npx hms`):

| Command | What it does |
|---|---|
| `hms validate [--all]` | library, packs, beat registry, specs (Q0/Q1) |
| `hms plan --template T26 --mallow noomi [--duration 15] [--seed N] [--internal]` | writes `specs/<id>.json` |
| `hms plan-batch --policy review-m1.json --count 6 --name m1-review` | writes `output/batches/<name>/batch.json` with specs and a posting order |
| `hms compile <spec>` | timeline, cue log, layout report, Q2 report (Node lint plus a short headless pass for authoritative layout) |
| `hms stills <spec> --at 0,0.98s,7s [--profile draft]` | PNG stills |
| `hms render <spec\|batch> [--profile draft\|final] [--workers 2] [--resume]` | full pipeline including the score and QA |
| `hms remux <videoId> [--score …]` | re-score only |
| `hms qa <videoDir>` | re-run the gates |
| `hms gallery <batch>` | builds the static review page |
| `hms ledger approve\|reject\|publish <id> [--reason] [--channel tiktok --date …]` | manual decisions (no platform APIs) |
| `hms golden [--capture-v2\|--check]` | regression harness |
| `hms derive <mallow>` | Python derivation plus asset QA (takes the heavy-job lock) |
| `hms bench [--frames 30]` | perf benchmark on a fixed frame list, median of 3 (needs the machine to itself) |
| `hms clean <batch> [--keep approved]` | delete intermediates |

**Gallery** (`output/batches/<b>/gallery/index.html`, static and relative-linked, opens from disk or via `node render/serve.mjs`). Per video it shows:
- the preview MP4 (CRF 20) and poster;
- spec slots and copy;
- the filmstrips (opening, escalation, ritual, loop seam) and contact sheet;
- QA badges with metrics, and the loop-seam A/B pair;
- for M1, a side-by-side with the approved v2;
- approve/reject checkboxes with reason fields that generate a decision text block the owner pastes back, which `hms ledger` ingests.

---

## 11. Batch rendering, resume and performance

### 11.1 Jobs and resume

- **Unit of work:** a 90-frame (3 s) segment. Videos have 4–7 segments.
- **Steps:** `compile → dry-run (cues+curves) → segments[k] → concat → score → mux → QA`. Each step is idempotent and keyed by sha256(spec, engine sha, pack hashes, profile). Outputs are written to a temp file and renamed atomically. `state.json` per video records progress.
- **Segment encode:** x264 with an IDR at the segment start (`-g 30`, segments at multiples of 30 frames), `-threads 2`. Final concatenation uses the concat demuxer with stream copy.
- **Workers:** each worker is one Chromium page that renders segments of any video. A crash or a frame taking more than 60 s → page restart and one retry of that segment, then the job is marked failed. The other worker continues.
- **Resume:** `hms render --resume` skips segments whose key matches and whose `.done` marker hash checks out.
- **Disk:**

  | File | Size per 15 s |
  |---|---|
  | final master (CRF 16) | ≈ 35 MB |
  | preview | ≈ 12 MB |
  | WAV | ≈ 4–9 MB |

  QA artefacts are about 5 MB. Segments are deleted after concatenation. A 100-video batch is about 6 GB of the 26 GB free; `hms clean` keeps approved masters only.
- **CPU discipline:** `studio/lib/heavy-lock.mjs` (flock) ensures only one heavy job runs outside batch mode (render, bench, derive). Batch mode runs two render workers. Benchmarks need the machine to themselves.

### 11.2 Performance plan (15 s, 450 frames)

Baseline is the measured ≈ 1,580 s. Savings are cumulative estimates from the measured per-pass costs. Each step is a separate commit with `hms bench` and G-PIXEL checks.

| # | Step | Est. saving | Expected change vs exact | Gate |
|---|---|---|---|---|
| P1 | Binary readback: page POSTs a raw `ArrayBuffer` to the local server, written in order into ffmpeg (404 → ≈ 50 ms/frame) | ≈ 160 s | bit-identical | identical frame hashes |
| P2 | Skip overlay draw and upload when no text is visible | ≈ 4 s | identical | hashes |
| P3 | Face cache + once-per-frame redraw + quarter-res glow + box upload (§5.4) | ≈ 500 s | small (face only) | PSNR face box ≥ 42 dB; owner A/B (D6) |
| P4 | World shader: branch moon maria/fbm to the disc, hills to the horizon band, haze to h < 0.32; water samples a sky texture instead of calling `sky()` again (0.6 → ≈ 0.25 s) | ≈ 160 s | ≈ none | PSNR ≥ 50 dB |
| P5 | Sub-frame restructure: foreground accumulation `accum + world·(1 − Σwα)`, scissored reflection composite and accumulate, quarter-res reflection target (≈ 250 → ≈ 140 ms) | ≈ 220 s | tiny | PSNR ≥ 48 dB |
| P6 | Adaptive sub-frame floor 1 when shutter motion < 2 px (1,991 → ≈ 1,490 sub-frames) | ≈ 70–100 s | blur on slow frames only | PSNR ≥ 45 dB |
| P7 | Mesh: precompute the static normal (dome + normal map at LOD 3.5) and the `d0` term into one texture (51 → ≈ 35 ms) | ≈ 25 s | ≈ none | PSNR ≥ 50 dB |
| P8 | Explicit `--use-angle=swiftshader --enable-unsafe-swiftshader`; Playwright stays pinned at 1.56.1 (R2) | 0 | none | — |
| (later) | fbm → tileable noise texture (world ≈ 0.1 s); SDF face shader | ≈ 70 s + ≈ 20 s | visible pattern change | owner sign-off only; not in M1 |

**Projected final profile:** ≈ 420–520 s (7–9 min) per 15 s with one worker. **M1 acceptance is ≤ 12 min**, so the milestone doesn't depend on every estimate holding; stretch goal ≤ 9 min.

**Profiles** (`engine/render/profiles.js`):

| Profile | Render scale | Sub-frames | Face | World | Bloom | x264 | Target per 15 s |
|---|---|---|---|---|---|---|---|
| `exact` | 1.0 | v2 rule (floor 3) | per sub-frame, full blur | full | full | slow / CRF 16 | ≈ 26 min (golden only) |
| `final` | 1.0 | floor 1, cap 16 | cached, quarter-res glow | optimised | full | slow / CRF 16 + preview CRF 20 | ≤ 12 min (est. 7–9) |
| `draft` | 0.5 (`uRes` stays in design space; targets, viewport, blur radii and overlay scale) | 1 | once per frame, no glow blur | 3 octaves, no clouds | no 1/8 | veryfast / CRF 23 + DRAFT mark | ≤ 3 min |

**Throughput:** two concurrent workers bring the effective time to about 5.5–7 min per 15 s video, about 8–10 per hour. Planning figures, allowing for heavier Mallows and realms, 20 s videos, scoring (≈ 1 min) and QA (≈ 1 min):
- **≈ 7–9 final videos per hour, ≈ 150/day at most;**
- drafts ≈ 35–40 per hour.

Non-Noomi faces add 0–40 ms per frame when cached. Opaque-ground realms are *cheaper* than the lake because they skip the reflection passes.

---

## 12. Automated QA gates

All gates write to `qa/report.json`. A fail blocks approval; warnings go to the gallery.

| Gate | When | Checks | Threshold |
|---|---|---|---|
| Q0 Library | on library change | `validate-library.mjs` + the new cross-references to beat IDs | 0 errors |
| Q1 Spec | plan | schema; approved packs, realm and moves only; ToD ∩ realm; time words; copy lint; glyph coverage; ritual fits its window; fingerprint unused; 14-day distance | all pass |
| Q2 Compile | compile | §4.8 (loop closure, ordering/NaN, body/camera limits, text zones and reading times, R-BREATH, cue coverage, rest windows, chop mode) | all pass |
| Q3 Integrity | after mux | generalised `verify.mjs`: H.264 High/yuv420p/BT.709, 1080×1920, 30 fps, frames = 30·D, duration ±0.03 s, AAC 48 kHz stereo, A/V length match, faststart, zero decode errors, provenance stamp = spec hash + engine sha (replaces the mtime freshness check) | all pass |
| Q4 Audio | after mux | integrated loudness; true peak; onset sync of loud cues (take, land, thought, release, eyes_open, logo) via `audio/qa.py`; quiet cues; seam click (wrap sample step); RMS step across the wrap; no digital silence > 300 ms | −16 ±1 LUFS; ≤ −1.5 dBTP; loud cues |Δ| ≤ 33 ms; quiet cues ≤ 60 ms; step ≤ −40 dBFS; RMS step ≤ 3 dB |
| Q5 Photosensitivity | after render | relative luminance (linear, Rec.709) at 1/4 resolution: WCAG 2.3.1-style general and red flash counting over any region ≥ 5% of the frame; house rule on frame-to-frame jumps; exposure ramp | ≤ 3 flashes/s; **no** jump ≥ 10% over ≥ 25% of the frame; exposure ≤ 12% per 0.5 s |
| Q6 Text | after render | overlay alpha boxes sampled at 2 fps plus the analytic glass boxes: safe zones, right rail, contrast, minimum sizes, monotonic rise/fade trajectories | zones clear; contrast ≥ 3:1; sizes as §8 |
| Q7 Loop seam | after render | full-res luma mean |Δ| from the last frame to frame 0, vs the film's own consecutive-frame Δ; plus SSIM | seam Δ ≤ P75 of in-film Δ (v2: 1.89 vs 2.02–2.09 at quiet keyframes); SSIM ≥ in-film P25 |
| Q8 Character fidelity | after render, and per pack | (a) fidelity probe: same engine, world off, neutral light, identity camera, a time inside the rest window, vs the approved art resampled the same way; (b) per-pack rest-match: procedural neutral face over the clean body vs the painting; (c) magnification log for every raster; (d) silhouette IoU at rest; (e) in-scene body chroma at frame 0 | (a) SSIM ≥ 0.98, mean ΔE00 ≤ 1.5 inside the silhouette; (b) asset-report thresholds, e.g. ΔE mean ≤ 1.5–3, centrelines ≤ 1–2 px, catchlight IoU ≥ 0.9; (c) ≤ 1.0; (d) ≥ 0.995; (e) ΔE ≤ 8 (grade allowance) |
| Q9 Brand | plan + render | copy lint; logo region vs reference crop at full visibility; end-card XOR rule; asset allowlist (every loaded URL and hash in `packs/allowlist.json`); no forbidden glyphs or assets; INTERNAL/DRAFT mark present iff the spec is internal or draft | logo ≤ grain tolerance (mean |Δ| ≤ 3/255); all pass |
| Q10 Duplicates | after render | dHash vs ledger (§9) | ≥ 9/12 frames within Hamming 8 → fail unless `variantOf` |
| Q11 Provenance / perf | always | timings per pass, sub-frame histogram, face redraw count, pins | info |
| Q12 Human | per batch | gallery review against the 10 AUDIT-v2 questions | owner approval required to publish |

**Failure fixtures** (`tests/qa-fixtures/`) are synthetic clips and specs that each gate must reject:
- a 4 Hz flash;
- text in the right rail;
- a seam jump;
- a 300 ms audio offset;
- a −10 LUFS mix;
- a rescaled logo;
- an upscaled sprite;
- a breath-hold line;
- "2 AM" on an afternoon ToD;
- a duplicate render.

---

## 13. Testing

| Suite | Runner | What | Time |
|---|---|---|---|
| unit | `node --test tests/unit` | motion equals stage2 (randomised inputs), channel merge and sort, duplicate rejection, beat clocks, RNG stream stability, fingerprint canonical form, copy lint, layout fit, param-map coverage (27 presets × 7 Mallows), planner constraints (property tests over 1,000 seeds), schedule rules | < 30 s |
| guard | `node --test tests/guard` | app untouched; frozen v2 hashes; no `Math.random`/`Date.now` in `core/` or `engine/`; output paths stay inside the studio | < 5 s |
| golden | `npm run test:golden` | G-STATE, G-CUES, G-PLAN, G-PIXEL (4 frames; 16 with `--full`) | ≈ 4 min (≈ 8 min full) |
| asset | `pytest tests/asset` | Noomi re-derivation byte-identical; two-run hash equality per Mallow; asset QA metrics | 2–15 min per Mallow (heavy lock) |
| face | headless | per-Mallow rest-match; expression sheet renders with no NaN or exceptions; box covers the drawn pixels | ≈ 1 min per Mallow |
| world | headless | loop test per realm (world at 0 vs D); contrast probe | ≈ 30 s per realm |
| integration | `npm run test:render` | 2 s draft clip per implemented template × one eligible Mallow, through the whole pipeline including the score and QA | ≈ 1 min per clip |
| determinism | headless | same spec twice → identical frame hashes at 8 frames; segmented render = sequential render; resume after a kill = uninterrupted | ≈ 5 min |
| QA fixtures | `node --test tests/qa` | each fixture fails its gate and only that gate | ≈ 2 min |
| perf | `hms bench` | 30 fixed frames from T01, median of 3; regression alarm at +10% | ≈ 6 min, exclusive |

---

## 14. Documentation

- **README.md:** what Phase 2 is, quickstart (plan → render → gallery), where outputs go, safety statement.
- **docs/ARCHITECTURE.md:** layers, seams, data flow, the Direction v3 / World / FaceStyle / Beat interfaces.
- **docs/AUTHORING-BEATS.md:** channels, merge rules, the anchor language, acting hooks, sound recipes, the validators a new beat must pass, and how to register and approve a move.
- **docs/MALLOW-PACKS.md:** derivation workflow, finder configs, asset QA thresholds, owner sign-off checklist, pack schema.
- **docs/REALMS.md:** module API, families, dial mapping, plates, periodicity rules, cost targets.
- **docs/TEMPLATES.md:** library schema, beat sheets, slot grammar, adding copy, validator.
- **docs/QA.md:** every gate, metric, threshold and fixture, and how to read `report.json`.
- **docs/BRAND-RULES.md:** single source for the rules and swaps, plus how each is enforced.
- **docs/RENDER-OPS.md:** profiles, workers, resume, disk, heavy lock, perf numbers, troubleshooting (SwiftShader flags, Chromium pin).
- **docs/DECISIONS.md:** D1–D12 with outcomes and dates.
- **CHANGELOG.md:** per WP.
- **Audit-risk → fix table:** R1→P3; R2→P8; R3→the spec route replaces the "-v2" suffix routing; R4→dispose and hashed keys; R5→composer sort and validation; R6→`world.loop` + chop mode; R7→loop wrap; R8→`buildMallow(id)`; R9→materials and overrides; R10/R11→co-located recipes and shared envelopes; R12→dry-run curves; R13→hard failures; R14→no roll channel; R15→spec-derived face box; R16→layout and latin-ext; R17→overlap rule; R18→finite guard; R19→clock copy; R20→kept, documented; R21→P2/P5; R22→Q5–Q10.

---

## 15. Build plan (work packages)

Parallelism: each stream works in its own git worktree and branch, and merges only after the golden gates pass. The engine (`engine/`) has a single owner per milestone so two streams never change it at once.

### Milestone 1: generator core + Noomi + 3 templates, end-to-end with QA

| WP | Goal | Key files | Deps | Acceptance | Effort | Machine | Parallel / isolation |
|---|---|---|---|---|---|---|---|
| 1.0 | Safety rails | `tests/guard/*`, `package.json` scripts, commit `templates/`, freeze-hash list, branch `phase2` | — | guard tests green; frozen hashes recorded | 0.5 d | — | first |
| 1.1 | Golden capture of v2 | `studio/golden/capture-v2.mjs`, `tests/golden/v2/*` | 1.0 | state dump for all 2,441 times, mesh hashes, cues, plan, 16 lossless frames; SwiftShader determinism measured (render twice → hash) | 1 d | ≈ 40 min | stream A |
| 1.2 | Engine fork, no behaviour change | `engine/**` (from stage2), `runtime/clock.js`, World API with the lake as `moonmilk` module, materials with Noomi defaults, dispose/hashed keys, finite guard, W/H/scale config, SwiftShader flags | 1.1 | frozen v2 module through an adapter on the new runtime: 16 frames bit-identical (or ≤ 1/255 if 1.1 found non-determinism) | 2.5 d | ≈ 30 min | stream A (owns `engine/`) |
| 1.3 | Core | `core/motion.js`, `rng.js`, `timeline/*`, `clock/*` + unit tests | 1.0 | unit suite green; motion outputs equal stage2 on 10⁵ random inputs | 2 d | — | stream B, parallel with 1.1–1.2 |
| 1.4 | v2 as beats (T01) | `core/beats/v2/*`, `beatsheets/T01.json`, arc, camera, `core/direction.js`, `specs/golden/t01-v2.json` | 1.2, 1.3 | **G-STATE ≤ 1e-9, G-CUES identical, G-PIXEL identical** | 3.5 d | ≈ 30 min | stream A (lead); highest risk, done first |
| 1.5 | Spec, packs, planner (single video), layout, lint | `core/spec/*`, `core/layout/*`, `core/copy/lint.js`, `packs/mallows/noomi`, `packs/realms/moonmilk-cove`, `studio/plan/*`, `hms plan/compile/validate` | 1.3 | T01 spec compiles to the 1.4 timeline hash; all 10 bad-spec fixtures rejected; 1,000-seed property test | 2.5 d | — | stream B |
| 1.6 | Generic score | `studio/audio/*` (plan, recipes in beats, layers, kit transposition, `buildMallow`, bed, loop wrap) | 1.4 (cue names); skeleton can start on v2 `cues.json` | G-PLAN equal in compat mode; new mode passes Q4; documented diffs only | 2.5 d | ≈ 15 min | stream C |
| 1.7 | Render pipeline v3 | `studio/render/*`, binary readback (P1), segments, resume, profiles, encode, provenance, generalised verify | 1.2 | T01 final via the new path is frame-identical to 1.4 (lossless capture check); kill-and-resume gives identical hashes; draft ≤ 4 min | 2.5 d | ≈ 1 h | stream A |
| 1.8 | Performance pass P2–P8 | `engine/render/*`, `engine/face/*`, world GLSL | 1.7 | final ≤ 12 min per 15 s on T01 (stretch ≤ 9); each step within its G-PIXEL tolerance; A/B sheet for D6 | 4.5 d | ≈ 2.5 h | stream A; **exclusive machine during benches** |
| 1.9 | New M1 moves | G-DOUBLETAKE, G-FLOP, M-DREAMBUBBLES, R-SAVOUR, R-DRIFT, LP-RETRIGGER, LP-OBJECT, A-DIM-SOFT, A-GREY-CLEAR, C-HOLD-WIDE, `slideX`/`shrink` DOFs, `act.face` + param-map for Noomi, star particle shape | 1.4, 1.5 | each move: 3 s test clip filmstrip, Q2 pass, loop closure; T26 and T22 compile for 12/15/20 s | 4.5 d | ≈ 45 min | stream B (beats; engine changes for DOFs and atlas go through stream A review) |
| 1.10 | QA gates v1 | `studio/qa/*`, fixtures | 1.5, 1.7 | Q1–Q11 implemented; every fixture fails only its own gate; v2 approved MP4 passes all gates | 3.5 d | ≈ 20 min | stream C |
| 1.11 | Ledger, gallery, CLI polish, docs | `studio/ledger`, `studio/gallery`, `hms.mjs`, docs | 1.10 | gallery for a 2-video test batch; docs reviewed | 2 d | — | stream C |
| 1.12 | M1 sample batch + audit | `output/batches/m1-review/*`, audit notes | all | 6 finals + drafts, all gates green, my audit against the 10 questions, gallery delivered | 1 d | ≈ 1.5 h | — |

M1 critical path: 1.0 → 1.1 → 1.2 → 1.4 → 1.7 → 1.8 → 1.12. Total ≈ 32 d of effort, about 9–11 working days with 3 streams.

### Milestone 2: all Mallow assets + face styles

| WP | Goal | Deps | Acceptance | Effort | Machine | Parallel |
|---|---|---|---|---|---|---|
| 2.0 | Decision stills for D1–D5 (from measurements) | M1 | owner answers recorded in DECISIONS.md | 0.5 d | ≈ 20 min | first |
| 2.1 | `tools/derive` refactor | M1 | Noomi byte-identical; two-run hash equality | 1.5 d | ≈ 10 min | stream D (Python) |
| 2.2 | Face engine refactor: style registry, closed-tube generalised (materials, two-sided glow, screen under-glow, tilt, cubic rest curves, visible brows, taper, spec profiles, beads, screen blush), spec-derived box, param-map for all Mallows | M1 | Noomi G-PIXEL unchanged; face-test sheet renders for Noomi with the new params | 3 d | ≈ 20 min | stream A; interface frozen at the end |
| 2.3 | Blubi pack | 2.1, 2.2 | asset QA (R-channel residual ±3, band energy 0.9–1.1, cheek fit ±1%, no ghost); rest-match ΔE mean < 2; tears; owner checkpoint | 3 d | ≈ 1 h | stream D/E |
| 2.4 | Loomi pack | 2.1, 2.2, D1 | Q2 stretched-channel metrics (median R above eyes ≤ 4, step ≤ 2 levels, ghost correlation < 0.05); rest-match ΔE mean ≤ 1.5; owner checkpoint | 2.5 d | ≈ 1 h | parallel with 2.3 (stagger derivations) |
| 2.5 | open-socket style + grin/cavity mouths + sprite irises + socket lighting + visible blinks | 2.2 | renders measured neutral faces for Boppo and Pipzi from JSON; magnification assert | 3.5 d | ≈ 20 min | stream E |
| 2.6 | Pipzi pack | 2.5, D5 | per-report QA (energy 0.85–1.15, cell period ±15%, glints ±25%, ΔE < 2; neutral centres ≤ 1.5 px, SSIM > 0.9); owner checkpoint | 3.5 d | ≈ 1.5 h | stream E |
| 2.7 | Boppo pack | 2.5, D2, D5 | per-report QA (48² self-similarity < 0.92, cheek ±8 levels; rest-match median ΔE ≤ 2, catchlight IoU ≥ 0.9); owner checkpoint | 3.5 d | ≈ 1.5 h | after 2.6 (shared code) |
| 2.8 | heavy-lid style + crease ribbon + emission/glitch + pad warp + Glitzi pack | 2.2, D4 | recombination ΔE < 2 (p99 < 6); eye SSIM ≥ 0.9; repeat-patch NCC ≤ 0.95; glitch: displacement-only, ≤ 1 burst per 2 s, Q5 pass; owner checkpoint | 5.5 d | ≈ 1.5 h | stream F |
| 2.9 | spiral style + open-lip mouth + Zuzu pack | 2.2, D3 | disc ΔE00 ≤ 5, band positions ≤ 2 px, mouth IoU ≥ 0.97, highlight coverage 4–5.5%; spin caps; owner checkpoint | 5.5 d | ≈ 2 h | stream G |
| 2.10 | Acting profiles + particle atlas (star, droplet, shard, ring, ribbon, heart, puff) | 2.2 | per-Mallow expression contact sheets; Noomi still the identity (golden) | 3 d | ≈ 30 min | stream B |
| 2.11 | Fidelity QA (Q8a/b/c full) + internal test-reel spec on a neutral review stage | 2.2 | Q8 runs for all packs | 2 d | ≈ 20 min | stream C |
| 2.12 | M2 review pack | all | 7 packs owner-approved | 1 d | ≈ 1 h | — |

Total ≈ 41 d of effort, about 3–4 weeks. Python derivations and renders take turns via the heavy-job lock.

### Milestone 3: realms + full template library + batch

| WP | Goal | Deps | Acceptance | Effort | Machine | Parallel |
|---|---|---|---|---|---|---|
| 3.0 | Plate-extraction spike | M2 | one still per realm via both routes; decision per realm | 2 d | ≈ 30 min | first |
| 3.1 | World API v2 (ground modes, plates + parallax, light rigs, dial map, transform, periodic particle fields, ToD palettes) | 3.0 | Moonmilk T01 G-PIXEL unchanged; opaque-ground test realm skips reflection | 3 d | ≈ 30 min | stream A |
| 3.2 | SkyWater: Moonmilk extras, Blue Drift, Raindrop Lagoon | 3.1, D9, D10 | world loop test; cost ≤ 0.35 s; contrast probe; owner realm stills | 7 d | ≈ 2 h | stream H |
| 3.3 | Static Storm | 3.1, D8 | as above + Q5 on the storm template | 4.5 d | ≈ 1 h | stream I |
| 3.4 | Spiral Observatory | 3.1 | as above | 4.5 d | ≈ 1 h | stream I (after 3.3) |
| 3.5 | Spark Festival | 3.1 | as above + firework rules | 4.5 d | ≈ 1 h | stream H (after 3.2) |
| 3.6 | Sunpop Orchard | 3.1, D9 | as above | 4.5 d | ≈ 1 h | stream J |
| 3.7a | Remaining gags (14) | M2 | each: test clip on 2 Mallows, Q2 pass, approved | 5 d | ≈ 1 h | stream B |
| 3.7b | Metaphors + props (23) + prop sheet (D11) | 3.1 | prop sheet approved; each metaphor clip | 8 d | ≈ 1.5 h | streams B/K |
| 3.7c | Rituals (15) incl. realm-transform hooks | 3.2–3.6 (signature rituals) | each clip; R-BREATH rules; owner spot-check | 5 d | ≈ 1 h | stream K |
| 3.7d | Arcs (7), cameras (3), loops (remaining) | 3.1 | validators; loop seam on every combination tested | 2 d | ≈ 20 min | stream B |
| 3.8 | Batch planner + scheduler + ledger rules | M1 | `plan-batch` produces sequencing-valid 14/28 sets; property tests | 2.5 d | — | stream C |
| 3.9 | Batch ops: 2 workers, disk management, optional clean-plate variants, throughput bench | M1 | sustained ≥ 7 finals per hour on a 6-video mix; crash-recovery test | 2 d | ≈ 2 h | stream A |
| 3.10 | Library smoke: compile every eligible template × Mallow × duration; 3 s draft clip per template × Mallow pair | 3.7, 3.8 | 0 compile errors; ≈ 110 clips pass Q2–Q9 | 1 d | ≈ 1.5 h | — |
| 3.11 | M3 sample batch + audit | all | 14 finals green; posting order valid; gallery | 1.5 d | ≈ 2 h | — |

Total ≈ 67 d of effort, about 5–7 weeks. Internal owner checkpoints: realm stills (after 3.2–3.6), prop sheet (3.7b), final batch (3.11).

---

## 16. Sample batches for owner review

**M1 (6 finals + drafts; about 1.5 h of machine time with 2 workers).** These are the M1 approval gate.

| ID | Spec | What it proves |
|---|---|---|
| m1-01 | T01 · noomi · 15 s · v2 copy · v2 seed (`specs/golden/t01-v2.json`) | the generator reproduces the approved v2; shown side by side with the approved MP4 plus metrics |
| m1-02 | T01 · noomi · 15 s · hook "LIGHTS OFF. BRAIN ON." · lines from L1/L2/L3 pools · resolution "Not every thought / needs an answer tonight." · new seed | variation with v2 quality |
| m1-03 | T01 · noomi · 12 s · hook "WHEN YOU CLOSE YOUR EYES / AND THE REPLAY STARTS" · R-BREATH on the 12 s clock | duration scaling |
| m1-04 | T26 Nostalgia · noomi · 15 s · G-DOUBLETAKE · M-DREAMBUBBLES · R-SAVOUR · A-DIM-SOFT · LP-OBJECT | new template, mixed valence, warm arc |
| m1-05 | T22 Trying to Rest · noomi · 15 s · G-FLOP · M-ORBIT (alt) · R-DRIFT · A-GREY-CLEAR · C-HOLD-WIDE · LP-RETRIGGER | new gag, ritual, camera and loop |
| m1-06 | T26 · noomi · 20 s (4 lines) | longest clock |

All are night or late-night Moonmilk, so no new world risk in M1. Each comes with the gallery, QA reports, filmstrips, the D6 A/B sheet and the bench numbers.

**M2 (per Mallow; about 1 h of machine time).**
- Neutral side-by-side (painting vs procedural rest face) with an A/B flip clip.
- 16-expression contact sheet.
- 6–8 s internal test reel (neutral → blink → glance L/R → mapped expression sweep → signature gag → back to rest) at final quality on a neutral review stage, marked INTERNAL.
- Asset QA pack.

These are not publishable: realms come in M3. If the owner wants publishable Blubi or Loomi earlier, WP3.2 (SkyWater) can be pulled into late M2.

**M3 (14 publish-ready finals; about 2 h of machine time with 2 workers).**
- Every Mallow twice, in its own realm.
- ≥ 12 distinct templates.
- Durations: 2 × 10 s, 3 × 12 s, 7 × 15 s, 2 × 20 s.
- ≥ 4 positive or mixed templates.
- Each Mallow's signature gag or ritual at least once.
- Delivered in a sequencing-valid two-week posting order, with all gates green, plus my audit.

One suggested set:

| Mallow | Videos |
|---|---|
| noomi | T16 (pre-dawn), T28 |
| blubi | T09, T27 |
| loomi | T03, T21 |
| glitzi | T06, T23 |
| zuzu | T19, T04 |
| boppo | T17, T12 |
| pipzi | T10, T15 |

---

## 17. Top risks and mitigations

| Risk | Mitigation |
|---|---|
| The fork silently changes v2 | Frozen reference, G-STATE/G-CUES/G-PIXEL on every engine commit, WP1.4 done first by the lead |
| Performance estimates don't hold | M1 acceptance at ≤ 12 min, not the 7–9 min estimate; each step measured on its own; no pattern-changing optimisations without sign-off |
| Large-hole skin invention (Zuzu, Pipzi, Boppo) looks fake | Per-report metric suites + owner checkpoint; fallback: restrict expressions that reveal the holes (pack `limits`), or keep the rest crossfade off |
| Canonical-art conflicts (Loomi, Boppo, Zuzu) | D1–D3 answered before the derivation WPs; defaults chosen |
| Realm ports drift from the approved designs | WP3.0 plate spike; owner realm stills; set pieces only from the app's designs |
| Photosensitivity (glitch, spiral, fireworks, sparkles) | Compile-time caps + Q5 on every render + per-realm rules |
| SwiftShader WebGL removed in a future Chromium | Pinned Playwright 1.56.1 + explicit flags; documented in RENDER-OPS |
| CPU contention between parallel streams skews benches | Heavy-job lock; benches need the machine to themselves |
| Combinatorial template space hides broken combinations | Library smoke (3.10) compiles every eligible combination and draft-renders every template × Mallow pair |
| Brand drift through copy | Curated pools only, lint at plan and render, library version pinned |

---

## 18. Machine-time budget (4 cores)

| Milestone | Golden / bench | Derivations | Dev clips | Review batch | Total |
|---|---|---|---|---|---|
| M1 | ≈ 3.5 h (capture, exact-path checks, about 18 bench runs, 2 full T01 finals) | — | ≈ 1 h | ≈ 1.5 h | **≈ 6 h** |
| M2 | ≈ 1 h | ≈ 6 h (6 Mallows × 2–3 iterations × 10–15 min) | ≈ 2 h | ≈ 1 h | **≈ 10 h** |
| M3 | ≈ 1 h | — | ≈ 9 h (realm dev, move clips, library smoke) | ≈ 2 h | **≈ 14 h** |

Sustained production after M3, two workers: about 7–9 final 15 s videos per hour, about 150/day theoretical. A practical cadence is weekly batches of 14–28 for owner review.