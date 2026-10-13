# Hushmallow Infinite Studio: Phase 2 design

**The reusable generator: architecture, data model, variation engine, render farm on a 4-core CPU, QA gates, build plan and the first review batch**

---

## 0. Summary

**Key decisions**

1. **Keep v2's `state(t)` contract as the seam between authoring and rendering.** Today a hand-authored module produces it. In Phase 2 a composer produces it from a JSON `VideoSpec`, using a library of hand-tuned beats. The renderer stays mostly as it is.
2. **Freeze v2 as an archive.** `stage2/`, `videos/my-brain-at-2am-v2.js`, `audio/soundtrack*.mjs` and `render/` stay unchanged under the tag `v2-approved`. The generator lives in a new `engine/` (browser) and `studio/` (Node).
3. **Rebuild v2 as the first template and use it as the regression test.** The template `T01@v2` must reproduce the v2 module's state for every frame and sub-frame to within 1e-9, and the same cue log, before any new feature lands.
4. **Variety comes from five independent layers, each seeded separately.** Changing one slot never reshuffles the others.

   | Layer | What it varies |
   |---|---|
   | Story | template × gag × metaphor × ritual × loop × camera × duration |
   | Copy | hook × line triple × resolution/closer |
   | World | realm × time of day × weather × dressing × palette jitter |
   | Performance | Mallow personality filter × seeded micro-acting |
   | Sound | motif contour × tempo × pan × bed mood |

   Uniqueness is enforced at three levels: an exact fingerprint, a weighted slot distance, and a post-render perceptual signature.
5. **Capability gating.** Every beat declares what it needs and every Mallow or realm pack declares what it provides. The sampler only picks combinations that are buildable and owner-approved, so the system produces valid videos from day 1 with Noomi alone, and content unlocks as packs are signed off.
6. **Speed comes first.** Bring a final 15 s render from about 26 min to about 7.5–8.5 min per worker, and to about 6 min effective with 2 workers. Add a draft profile at about 2 min, and proof stills at about 25 s. Everything after that is cheap to iterate.
7. **Rollout order follows asset difficulty:**
   - Wave A: Noomi (done) with a full Moonmilk Cove (times of day, weather, dressing).
   - Wave B: Blubi and Loomi (same closed-tube face pipeline, water realms close to the lake).
   - Wave C: Boppo and Pipzi.
   - Wave D: Zuzu.
   - Wave E: Glitzi.

   Production can start at the end of Phase 2a with Noomi alone.
8. **Disk space is a real constraint.** There is 26 GB free, and one v2 master is 34.6 MB. The publish encode moves to CRF 18 (estimated ~20 MB). The spec plus the engine SHA is the true archive, because renders are deterministic; an MP4 is a cache that can be pruned.
9. **Automated gates block, they never approve.** Nothing is auto-published. Every video passes 15 automated gates and then human review, through a static gallery and a CLI decisions import.

**Key numbers (measured or estimated on this machine)**

| Item | Today | After Phase 2 performance work |
|---|---|---|
| Final 15 s render, 1 worker | ~26 min | **~7.5–8.5 min** (est.) |
| Final throughput, 2 workers | — | ~6–6.5 min effective, **~150–190 per 20 h day** (lake-family realms); ~120–150 for heavier realms |
| Draft (540×960, 1 sub-frame) | — | ~2 min; 3 workers ≈ 60 per hour |
| Proof stills (6 frames, full quality) | — | ~25 s |
| 1,000 finals | — | ≈ 5 days of continuous rendering (machine), ≈ 17 h of owner review at 1 min each, so review is the real bottleneck |
| Storage for 1,000 finals | — | ≈ 20–25 GB, more than is comfortably free, so a retention policy is required (section 12) |

---

## 1. Facts that shape the design

- **The machine:** 4 cores, 15 GB RAM, no GPU (SwiftShader through ANGLE/Vulkan), 26 GB free disk, Node 22.22, Playwright 1.56.1, ffmpeg with libx264 and AAC.
  - A Chromium worker with SwiftShader uses ~1.5–2.5 GB, so 3 concurrent workers is the ceiling.
  - Benchmarks need the machine to themselves.
- **The face is the biggest single cost, not the world.** A face redraw costs ~257 ms, not ~30 ms (the `ctx.filter` blur is ~220 ms of that), and it runs 1,991 times per film. That is ~35% of render time. Next come sub-frame passes (~500 s), the world (~270 s) and readback (~180 s).
- **The app's realm modules can't be imported to render frames.** They are stateful simulations (Pools, ages, `flashEnv`), not pure functions of t. Realms are therefore ported (design reference, palettes and set-piece geometry), not imported.
  - These app modules can be imported read-only: `audio.js` (already done through the in-memory patch), `expressions.js`, `registry.js`, the fonts and the art. This is how v2 already works.
- **Every Mallow except Noomi is blocked by asset derivation and owner decisions.**
  - The app's 439 px sprites can never be reused: they would be upscaled, and for Boppo, Pipzi, Loomi and Zuzu they are different paintings.
  - Each Mallow needs its own measured hi-res face spec and a cleaned body that passes the asset QA in the asset reports.
- **The story library already exists and validates:** 28 templates, 221 hooks, 336 lines, 84 resolutions. It is the copy and structure source of truth. Phase 2 adds a beat implementation for each gag, metaphor and ritual ID it references.

---

## 2. Architecture

### 2.1 Layers

```
                      ┌──────────────────────── studio/ (Node) ─────────────────────────┐
 templates/story-     │ spec/sample ──► spec/validate ──► queue/scheduler ──► render/    │
 library.json ───────►│  (variation      (G1–G5 pre-render   (jobs, resume,   worker ×N │
 data/mallows/*.json  │   engine)         gates, dedup)       lanes)           │         │
 data/realms/*.json   │                                                         ▼         │
 data/brand.json      │   audio/score ◄── cues+curves ◄── dry run ◄── Chromium page      │
 data/ledger/*.jsonl  │        │                                    (engine/stage.js)     │
                      │        ▼                                          │ frames (binary)│
                      │   master WAV ──► encode/mux ◄── ffmpeg x264 ◄─────┘               │
                      │                       │                                           │
                      │                       ▼                                           │
                      │              qa/gates G6–G15 ──► gallery (static HTML) ──► review │
                      └──────────────────────────────────────────────────────────────────┘
                      ┌──────────────────────── engine/ (browser, ES modules) ───────────┐
                      │ compose/ (layout → acting → channels → direction object)         │
                      │   beats/  moves/  acting.js (personality + app expressions)      │
                      │ body/softbody  face/{styles,mouths,brows,iris}  worlds/{kit,realms}│
                      │ props/ (glass family)  particles/ (analytic emitters)  type/     │
                      │ render/ (renderer, passes, post)  core/ (gl, motion, rng, clock) │
                      └──────────────────────────────────────────────────────────────────┘
```

### 2.2 File layout (everything under `/home/user/thinkstill-rituals/hushmallow-infinite-studio`)

```
stage2/ videos/ audio/soundtrack*.mjs render/   FROZEN v2 archive (git tag v2-approved)
templates/story-library.json, validate-library.mjs   (existing; stays the copy/structure source)

engine/
  index.html                       canvas size from query (?w=&h=), no hard-coded 1080×1920
  stage.js                         page runtime: load timeline or v2 module, renderFrame, dryRun,
                                   capture {raw-binary|png|none}, dispose(); NaN guard on N
  core/   gl.js motion.js rng.js clock.js (inlined from v1, R19) trackbuilder.js periodic.js
  render/ renderer.js passes/{world.js, glass.js, mesh.js, accum.js, bloom.js, post.js}
          quality.js (profiles: proof|draft|final|parity)
  body/   softbody.js (+ uniform shrink, slide x, row-shear hook for Glitzi)
  face/   face.js (dispatcher + cache) params.js (FaceParams + app mapping)
          styles/{closed-tube.js, open-socket.js, spiral.js, heavy-lid.js}
          mouths/{line-tube.js, cavity.js, open-lip.js, groove-ribbon.js}
          brows/{tube.js, pad-shift.js}  iris/{galaxy-navy.js, sprite.js}
  worlds/ kit/{sky.glsl.js, celestial.glsl.js, clouds.glsl.js, ground-*.glsl.js,
               far.js, atmosphere.glsl.js, bake.js}
          realms/<realm-id>/{index.js, dressing/*.js}   (moonmilk-cove first)
          lights.js (moon-rim | sun-key | stage-halo)
  props/  glass-card.js layouts/{orbit,echo,dots,week,stack,loom,tabs,frames,icons,fork,meter}.js
          icons/ (owner-approved glyph set) clock-face.js cloud.js spotlight.js
  particles/ emitter.js shapes/{dot,star4,droplet,ring,ribbon,puff,heart,shard,confetti,glyph}.js
  type/   layout.js (wrap, autofit, measure) text-block.js logo-card.js themes.js
  compose/ composer.js layout.js channels.js acting.js bridges.js validate.js cuespec.js
          beats/core/*.js beats/gags/*.js beats/metaphors/*.js beats/rituals/*.js beats/loops/*.js
          recipes/T01.js … (optional per-template staging hooks)
  dev/    beat-lab.html rest-test.html realm-bench.html

studio/
  cli.mjs (the `hm` command)
  spec/   schema.mjs sample.mjs grammar.mjs weights.mjs fingerprint.mjs distance.mjs lint-copy.mjs
  queue/  queue.mjs scheduler.mjs locks.mjs
  render/ worker.mjs server.mjs (static + binary frame sink) encode.mjs segments.mjs pipeline.mjs
  audio/  score.mjs recipes/*.mjs layers/*.mjs kits.mjs (reuses audio/soundtrack.mjs renderInPage,
          bridge and mastering by import)
  qa/     gates/G01…G15.mjs signature.mjs report.mjs
  gallery/ build.mjs template.html
  bench/  bench.mjs costmodel.json

data/
  mallows/<id>.json       character packs (status: approved | pending | blocked)
  realms/<id>.json        realm presets (time of day, weather, dressing, mood mapping)
  brand.json              banned/caution lists, closers, logo rules, text presets
  weights.json            learned down-weights from review rejections
  ledger/{posts,renders,reservations}.jsonl
  fonts/fredoka-metrics.json   (glyph advances + kerning, for exact layout in Node)

assets/<mallow>/          derived hi-res sets (noomi exists; blubi, loomi, ... added by WPs)
tools/derive/derive_mallow_hires.py  finders/<id>.py  configs/<id>.json
tests/  unit/ golden/ fixtures/ property/
docs/   ARCHITECTURE.md AUTHORING-BEATS.md ADDING-A-MALLOW.md ADDING-A-REALM.md
        QA-GATES.md OPERATIONS.md BRAND-RULES.md DECISIONS.md
output/ (gitignored) runs/<batch>/<videoId>/  cache/  gallery/  queue/
```

### 2.3 The runtime seam (direction contract v3)

`engine/stage.js` loads either a v2 module (`?module=…`, for parity) or a compiled job (`?job=<id>`). For a job it fetches `timeline.json` from the worker's server and calls `compose.instantiate(timeline, packs)`.

That call returns the same object v2 modules export, with `dispose` added:

```
{ meta, setup(stage), state(t, stage, {center}), overlay(ctx, t, stage) -> bool,
  subframes(t, stage) -> int, dispose() }
```

The `S` state structure stays as documented in the v2 audit. It gains these additions, each optional with a default:

- `S.world.realm`: the module id. `S.world` becomes `{realm, dials, uniforms…}`.
- `S.mallow.light.catchDir`: the face catchlight follows the light rig instead of a fixed upper-right moon.
- `S.mallow.lidXform`: Glitzi pad shift.
- `S.mallow.emission`: emission gain.
- `S.props[]`: replaces `bubblesBack/Front`, which keep working as aliases.
- `S.text.boxes[]`: overlay bounding boxes for QA.

Because the contract holds, the renderer, sub-frame sampling and capture are shared by the v2 archive and every generated video.

---

## 3. Data model

All files are JSON with JSON Schema in `studio/spec/schema.mjs`. Every pack carries `version` and `status`.

### 3.1 Mallow pack (`data/mallows/noomi.json`, abridged)

```json
{ "id": "noomi", "version": 3, "status": "approved",
  "registry": "../hushmallow/src/mallows/registry.js#noomi",
  "art": { "art": "assets/noomi/noomi-art.png", "clean": "assets/noomi/noomi-clean.png",
           "normal": "assets/noomi/noomi-normal.png", "face": "assets/noomi/noomi-face.json",
           "size": [1199, 1124], "cropOffset": [29, 116] },
  "placement": { "baseX": 540, "baseY": 1300, "scale": 0.56, "maxArtToScreen": 1.0 },
  "softbody": { "lag": 0.062, "bins": 48, "inflate": 0.85, "bulge": 0.3 },
  "limits": { "squashMin": 0.6, "stretchMax": 1.3, "shrinkMin": 0.6, "liftMax": 180 },
  "light": { "dir": [0.45, 0.55, 0.7], "sss": 1.0, "rimBoost": 1.0, "specScale": 1.0 },
  "face": { "style": "closed-tube", "mouth": "line-tube", "brows": "tube",
            "neutral": { "eyeOpen": 0, "closedCurve": 1, "mouthSmile": 1, "browAlpha": 0, "blush": 0 },
            "eyeGate": [0.5, 0.95], "restCrossfade": true,
            "palette": { "inside": "#1a0a3a", "tongue": "#ff8ab0", "blush": "rgba(255,110,200)" } },
  "personality": { "energy": [0.35, 0.5], "expressions": "app", "signature": { "gag": "G-JOLT", "ritual": "R-CLOUDWRAP" } },
  "particles": { "spark": "star4-cream", "heart": "star4-cream", "glyph": "z" },
  "audio": { "kit": "noomi", "root": 523.25, "scale": [0,2,4,7,9] },
  "realm": "moonmilk-cove",
  "provides": { "face": ["eyeOpen","squint","blink","look","brow","mouthOpen","mouthRound","wave","blush","tears"],
                "body": ["squash","inflate","lift","lean","sway","shimmer","shrink","slide"] } }
```

Note: Noomi keeps its approved v2 tongue and blush values. The registry values (#ff6f9c, screen-blend `#ff7ff0`) apply only to Mallows derived from now on. Changing Noomi's palette would change an approved look.

### 3.2 Realm pack (`data/realms/moonmilk-cove.json`, abridged)

```json
{ "id": "moonmilk-cove", "version": 2, "status": "approved", "module": "worlds/realms/moonmilk-cove",
  "layout": { "horizonY": 1150, "ground": "water-mirror", "sky": "night-moon",
              "celestial": { "kind": "moon", "pos": [850, 590], "r": 50 } },
  "tods": { "dusk":       { "palette": "pal/dusk",  "stars": 0.35, "celestial": { "pos": [760, 880], "r": 58 }, "light": "moon-rim" },
            "night":      { "palette": "pal/night", "stars": 1.0 },
            "late-night": { "palette": "pal/late",  "stars": 1.1, "haze": 0.8 },
            "pre-dawn":   { "palette": "pal/predawn", "stars": 0.4, "horizonGlow": 0.6 } },
  "weather": { "clear": {}, "mist": { "haze": 1.6, "stars": 0.6 }, "scud": { "cloudBase": 0.4, "cloudSpeed": 1.3 } },
  "dials": { "agitation": ["waterChop","cloudSpeed","scud"], "heaviness": ["mist","moonDim","starThin"],
             "clarity": ["starCrisp","mirror","moonPath"], "warmth": ["grade.peachLav"], "p": ["auroraRibbon","mirrorStill","risingBubbles"] },
  "dressing": [
    { "id": "headland-lighthouse", "layer": "far", "slots": ["left","right"], "cost": 18, "tods": "*", "period": "D/k:8-20s" },
    { "id": "pearly-shore", "layer": "front", "cost": 25, "variants": 3 },
    { "id": "shells-pearls", "layer": "front", "cost": 4, "requires": ["pearly-shore"] },
    { "id": "fireflies", "layer": "mid", "cost": 3, "tods": ["dusk","night"] },
    { "id": "dream-bubbles", "layer": "mid", "cost": 6 } ],
  "dressingBudget": { "maxItems": 2, "maxCostMs": 60 },
  "payoff": "aurora-ribbon",
  "pulses": { "strike": "falling-star", "clear": "mirror-sweep", "burst": "bubble-pop" },
  "caption": { "theme": "moonlit" },
  "audio": { "bed": "moonmilk-cove" },
  "provides": { "ground": ["water", "reflective"], "props": ["glass"], "weatherFx": ["mist","scud"] } }
```

### 3.3 Template extension

`story-library.json` is not restructured. Its IDs map to beat modules through `engine/compose/beats/index.js`.

Per-template couplings that don't generalise go in an optional `engine/compose/recipes/Txx.js` with at most ~50 lines. Example: T02, "the sun lurches lower on the double take" (a world event inside a gag). Aim for 80% data and 20% recipe hooks. Templates without a recipe file use the default recipe.

The default recipe is the library's beat structure (cover → antic → gag → impact → aftermath → hookOut → L1..L3/L4 → peak → turn → ritual → eyesOpen → resolution → logo → settle → cardOut → hookReturn), placed by `beatClocks[duration]`.

### 3.4 VideoSpec: the unit of work, fully resolved and hashable

```json
{ "schema": "hm-spec/1", "id": "hm-20261020-0007-noomi-T03-a41f",
  "seed": 3141592653, "channel": "tiktok",
  "format": { "w": 1080, "h": 1920, "fps": 30, "duration": 10 },
  "template": "T03-social-battery", "mallow": "noomi", "realm": "moonmilk-cove",
  "tod": "dusk", "weather": "clear", "dressing": [{ "id": "pearly-shore", "variant": 2 }],
  "palette": { "arc": "A-GREY-CLEAR", "jitter": { "hue": -3.2, "warmth": 0.04, "exposure": -0.02 } },
  "camera": "C-DRIFT-IN", "loop": "LP-RETRIGGER",
  "gag": { "id": "G-FLOP", "intensity": 0.85 }, "metaphor": { "id": "M-METER" },
  "lines": ["Small talk. So much.", "Did I laugh right?", "Do not perceive me."],
  "ritual": { "id": "R-COSY" }, "nameWord": null,
  "copy": { "hook": ["SOCIAL BATTERY: 2%", "SOMEONE: ONE MORE GAME?"],
            "end": { "kind": "insight", "lines": ["Some batteries charge", "in the quiet."] } },
  "sound": { "contour": "arch-2", "tickTempo": 1.0, "panWidth": 0.8 },
  "variation": { "jitterMs": 80, "streams": ["timing","blinks","glances","orbit","motes","decoys","world","audio"] },
  "pins": { "library": "1.0.0", "noomi": 3, "moonmilk-cove": 2, "engine": "<git sha at render>" } }
```

**Visible slots** (used by the fingerprint and distance): template, mallow, tod, weather, dressing set, gag, metaphor, the 3 lines, ritual, hook, end copy, camera, loop.

**Invisible slots:** the seed, jitter, audio contour and palette jitter.

### 3.5 Timeline IR (`timeline.json`, produced by the composer, inspectable and diffable)

```json
{ "spec": "<hash>", "clock": { "antic": 0.22, "gag": 0.36, "impact": 0.90, "...": 0 },
  "beats": [ { "id": "G-FLOP", "t0": 0.36, "t1": 1.6, "params": { "h": 0.62, "w": 1.35, "f": 2.1 } } ],
  "channels": { "body.squash": { "kind": "track", "v0": 0, "keys": [[0.36, -0.04, { "f": 4, "z": 0.7 }]] },
                "body.squashKicks": { "kind": "impulses", "list": [[0.9, 0.24, 3.0, 0.24]] },
                "face.blink": { "kind": "blinks", "list": [[1.42, {}]] },
                "world.dials.agitation": { "kind": "spline", "keys": [[0, 0.1]] },
                "camera.zoom": { "kind": "spline", "keys": [[0, 1]] } },
  "envelopes": [ { "ch": "body.tremble", "start": 3.0, "end": 6.6, "fadeIn": 3.6, "fadeOut": 0.35, "fn": "noise13" } ],
  "props": [ { "id": "battery", "type": "meter", "segments": 5 } ],
  "text": { "hook": { "lines": [], "size": 76, "y": 286, "in": 0, "out": 2.0, "return": 9.66 } },
  "cues": [ { "t": 0.9, "type": "flump", "beat": "G-FLOP", "pan": -0.05, "amp": 0.85 } ],
  "predicted": { "subframes": 1350, "faceRedraws": 410, "renderSeconds": 312 } }
```

### 3.6 Ledger and job records

- **Post ledger** (`data/ledger/posts.jsonl`): `{videoId, specHash, visible:{…}, signature:{cover, anchors[], audio}, channel, postedAt}`.
- **Reservations** (`reservations.jsonl`): batch plans reserve hooks and lines, so two planned batches never pick the same copy.
- **Job record** (`output/queue/jobs/<videoId>.json`): `{spec, profile, stage:"planned|compiled|dry|audio|rendering|encoded|muxed|qa|review|approved|rejected|final", segments:[{i, frames:[a,b], status, sha}], attempts, logs, timings}`.

---

## 4. Timeline system: primitives, moves, beats, composer

v2's quality lives in its hand-tuned keys: one beat sets 10–20 tracks with specific spring frequency (f) and damping (z) values. The system keeps that tuning inside reviewed beat modules, and adds variety by recombining beats and by seeded variation within ranges the owner has approved. It never generates random choreography.

### 4.1 Four levels

| Level | What it is | Example | Who tunes it |
|---|---|---|---|
| 1. Primitives | `motion.js` (Track, Impulses, Hops, Blinks, spline, noise) plus `periodic.js` | `spring(t, f, z)` | fixed |
| 2. Moves | small Mallow-agnostic actions that write to channels | `squashHit`, `hop`, `gasp`, `blink`, `doubleBlink`, `glance(target)`, `lookAt(ref)`, `lean`, `sway`, `shimmer`, `ripple`, `shrink`, `slide`, `quiver`, `nod`, `yawn`, `emote(preset, k, t, dur)` | engine |
| 3. Beats | v2-quality choreographies built from moves, plus cues, world dial keys and prop actions | `hypnicJolt`, `G-FLOP`, `M-METER`, `R-COSY` | authored, reviewed one at a time |
| 4. Recipe | beats placed on the template's beat clock, with bridges between them | T03 default recipe | data |

### 4.2 Channels and how writes merge

| Kind | Merge rule | Examples |
|---|---|---|
| `track` (spring-eased absolute targets) | Collect `(t, v, opts)` from all beats, **sort by t**, reject keys less than 1 ms apart (R5), then build the Track. A conflict error is raised if two beats write the same track inside each other's claimed window. | body.squash, inflate, lift, lean; face.eyeOpen, mouthSmile… |
| `impulses`, `hops`, `shimmers`, `ripples` | sum | squash kicks, sway kicks, water rings |
| `blinks` | max | face.blink |
| `spline` | union of keys, sorted, duplicates averaged with a warning | camera, world dials, orbit phase, palette arcs |
| `envelope` layers | `{start, end, fadeIn, fadeOut, fn}`, summed on the target channel | tremble, pant, sleepBreath |
| `ref` | resolved after layout | `lookAt(prop:L2)`, `cam.follow(lift, 0.2)` |

Every beat declares `claims: {channels, window}`. The composer runs in two phases. **Layout** measures text, sizes props, places the orbit and the Mallow from the pack's placement. **Acting** runs the beats, resolves refs, inserts bridges and merges the channels.

### 4.3 Beat module interface

```js
export default defineBeat({
  id: 'G-FLOP', kind: 'gag', version: 1, status: 'approved',
  needs:   { body: ['squash','spread'], face: ['squint','blink'], ground: ['*'] },
  window:  { anchor: 'gag', until: 'aftermath', minDur: 0.9 },
  entry:   { eyes: 'any', body: 'neutral' },  exit: { eyes: 'open', body: 'low' },
  params:  { h: [0.60, 0.66, 0.62], w: [1.28, 1.38, 1.35], settleF: [1.8, 2.4, 2.1] }, // [min,max,default]: the approved range
  intensity: { min: 0.4, max: 1.0 },          // templates such as T14 cap at 0.4
  cost:    { peakSubframes: 8, faceRedrawsPerSec: 30 },
  compose(ctx, p) {
    const { at, body, face, world, cue, emote, rng } = ctx;
    body.squash.to(at.gag, -0.03, { f: 4, z: 0.7 }).to(at.impact, 1 - p.h, { f: 6 * ctx.energyF, z: 0.55 });
    body.spread.to(at.impact, p.w - 1, { f: 5, z: 0.5 });
    body.kicks.kick(at.impact, 0.22 * ctx.k, 3.0, 0.24);
    emote('tired', 0.8, at.impact + 0.1, 1.2);       // goes through the app's expressions + personality
    world.ripple(at.impact, 0.8); cue(at.impact, 'flump', { amp: ctx.k });
  } });
```

`ctx.k` is the intensity × personality scale. `ctx.energyF = 0.8 + 0.4·energy` scales spring frequencies.

### 4.4 Personality and expression bridge (`compose/acting.js`)

- **`emote(preset, intensity, t, dur)`** calls the app's `resolveExpression(mallowRegistryEntry, {preset:1}, intensity)`. It imports `hushmallow/src/mallows/expressions.js` read-only. The resulting app params go through `face/params.js#fromApp()`, which is the semantic mapping layer (R9: closedCurve default, blush base and so on). The face channels then get keys with timings from the app's `STAGES`.

  As a result, Glitzi's "happy" becomes glitch 1.1 with a skewed half-smile, while Blubi's becomes blush 1.9 with ^^ eyes. The beat author writes it once.

- **Eye gate:** Noomi, Blubi and Loomi open their eyes only when intensity exceeds the pack's gate. Below the gate, `emote` uses squint and closedCurve instead.
- **Energy:** amplitudes scale by the personality multiplier. Hop heights and kick amplitudes are clamped by the pack limits.
- **Particle remaps** come from the pack: `spark` becomes Glitzi's shards, Pipzi's trailed sparks or Noomi's cream stars.
- **Disabled params:** `sweat` and the "!" glyph scale wobble are disabled by brand rules, whatever the app does.

### 4.5 Pose contracts and bridges

Every beat declares an entry pose and an exit pose (eyes open or closed, body neutral, low, tall or lifted, gaze). When one beat's exit doesn't match the next beat's entry, the composer inserts a bridge move: a `settle` spring at f 1.5–2.2, a slow blink, or an eye close at f 1.1.

Bridges are tested as pairs: `hm beat-sheet --pairs` renders every (gag → metaphor) and (metaphor → ritual) junction used by the enabled templates.

### 4.6 Seeded micro-acting

Named RNG substreams are derived as `mulberry32(fnv1a(name) ^ seed)`. The named substreams are timing, blinks, glances, orbit, motes, decoys, world, audio, plus each beat's own stream. Changing one slot never reshuffles the others, which matters for A/B tests.

What varies per seed:

- **Blinks:** Poisson placement with a minimum gap of 1.2 s, kept out of claimed eye windows and out of the first 0.3 s and the last 0.6 s.
- **Glance targets and their order.**
- **Timing:** ±80 ms jitter on beats that are not locked to a sound.
- **Layout:** orbit slot angles, mote seeds, decoy layouts.
- **Beat parameters:** sampled inside the approved `[min, max]` ranges, biased toward the default with a Beta(3,3) distribution.

Beats are reviewed at their range extremes (min, default and max contact sheets) before approval. That review is what guarantees a seeded variation never falls below the v2 bar.

### 4.7 Loop closure by construction

- Every periodic layer has period D/k. `periodic.js` provides `pnoise(t, D)` (a domain offset on a circle) and loop-aware emitters.
- The rest-face windows from the library (0–0.17 s and the last 0.5 s) are claimed by the `cover` and `settle` beats.
- **Validator:** for every channel and audio curve, |state(0) − state(D)| < 1e-6. The first and second derivatives are compared too, numerically over ±2 frames, within tolerance.

### 4.8 v2 rebuilt as the golden test

The 13 beats the v2 audit lists are moved verbatim into `beats/core/`, with times relative to their anchors: `sleepBreath`, `dreamFlinch`, `hypnicJolt`, `aftermath`, `thoughtPop`, `spiral`, `squeezeRelease`, `breath`, `dissolve`, `eyesOpenContent`, `endCard`, `slowBlink`/`driftToSleep`, `hookReturn`.

`recipes/T01.js` with the `v2` preset reproduces the 15 s v2 exactly.

Test (`tests/golden/v2-state.test.mjs`): dump the numbers-only `state(t)` at all 450 centre times and all 1,991 sub-frame times, from both `videos/my-brain-at-2am-v2.js` and the composer. They must match to within 1e-9, and the cue logs must be byte-equal. The test runs on every commit.

### 4.9 Beat library inventory and waves

| Wave | Gags | Metaphors (props) | Rituals | Core / loop |
|---|---|---|---|---|
| **A (Noomi)** | JOLT ✔, JELLYFREEZE, SINK, DEFLATE, DOUBLETAKE, FLOP, CRINGE, WEEBLE, MELT, DEADPAN | ORBIT ✔, ECHO, CLOUD, METER, FOG, DREAMBUBBLES, GLOW, TEARS, WEEK, COSYPILE, NOISE, ICONS, CLOCK | BREATH ✔, CLOUDWRAP, FLOAT-AWAY, COSY, DRIFT, LANTERN, RAINLIFT, SQUISH, STRETCH, SAVOUR, NAMEIT | linesPop (3/4), turn, eyesOpen, resolution, endCard, settle; LP-RETURN ✔, RETRIGGER, OBJECT, CYCLE |
| **B (later Mallows)** | LAUNCH, SCOOT, PUFF, PING, BONK, GLITCHSLIP, SPINUP, SPARKPOP, SPLASHSIT | DOTS, TABS, FRAMES, STACK, LOOM, FORK, SPOTLIGHT, JITTERS, BUZZ, PEBBLES, SWELL, FARGLOW | DEFRAG, SPIRALSLOW, SUNSOAK, SETDOWN, BOOP-SIZE, WIGGLE | — |

**Wave A enables 12–14 templates for Noomi:** T01, T02, T03, T09, T14, T16, T20, T21, T22, T26, T27, T28, plus T04 and T17 as secondary Mallow.

`hm library coverage` prints, for each template, which (mallow × gag × metaphor × ritual) combinations are renderable today.

---

## 5. Face style system

### 5.1 One parameter set, several styles

**`FaceParams`** (`face/params.js`) is the studio's canonical superset:

- Eyes: eyeOpen (L/R), lidTop, lidBot, blink, squint, closedCurve, eyeStretch, eyeScale, irisScale, lookX, lookY, sparkle, wet, tears, heartEyes.
- Brows: browAlpha, browY, browTilt, browAsym, browCurve.
- Mouth: mouthSmile, mouthOpen, mouthRound, mouthWave, mouthWavePhase, mouthWidth, mouthSkew, mouthPout, mouthTremble (≤ 6 Hz), tongue.
- Cheeks: cheekPuff, blush, blushLines.
- Mallow-specific: glitch, spin, spinJitter, spiralHue.
- `sweat` exists but is hard-disabled.
- `fromApp()` and `toApp()` document every semantic difference from the app's `PARAMS`.

**Style plugins** each implement `{init(spec, pack), draw(ctx, params, light) → {dirty, box, lidXform?, emission?}, cacheKey(params)}`:

| Style | Mallows | Built from |
|---|---|---|
| `closed-tube` | noomi, blubi, loomi | v2 `face.js`, parameterised: palette from the spec, cubic rest curves, per-stroke taper, two-sided glow (separate inner and outer passes), cyan screen-blended under-glow, per-stroke specular profile along the stroke and end beads, always-visible brows with a lift coupled to eyeOpen, tilt with a residual droop (lidSlant), guard for missing brows |
| `open-socket` | boppo, pipzi | Elliptical sclera from the measured gradient, socket lighting (crimson upper glow, cream lower band) drawn along the lid curves, native hi-res iris sprite, catchlights fixed to the light, no lash line while open, carved lid crease for blinks |
| `spiral` | zuzu | Phase field per pixel from the measured Archimedean fit plus a 64-step colour table. Fixed screen-space highlights. Spin motion blur computed analytically (the colour table averaged over the frame's phase step). Socket layers, lid clipping |
| `heavy-lid` | glitzi | Fixed per-eye rotated ellipses, lid-shadowed sclera, sprite iris built from the art, pad shift output as `lidXform` (the renderer's UV displacement, weight-map driven), lid-skin sprites for blinks |

**Mouths:**
- `line-tube` (closed-tube group)
- `cavity` (Boppo grin, Pipzi gull-wing): interior gradient, two-lobed tongue, lip bands, a closed state as a maroon crease
- `open-lip` (Zuzu)
- `groove-ribbon` (Glitzi): the art-derived ribbon re-bent along the animated curve; the cavity opens between the ribbon halves

**Brows:** `tube`, or `pad-shift` (Glitzi).

### 5.2 Face spec (derived per Mallow, `assets/<id>/<id>-face.json`)

One schema across styles:

```
{ version, artSpace:{size, cropOffset},
  strokes:{eyeL,eyeR,mouth,browL?,browR?: {cubic|quad, tips, width profile, cross-section colours,
           specular profile along t, beads, glow:{above,below}, underGlow, contactShadow}},
  eyes:{L,R: ellipse/socket centre, rx, ry, rot, sclera gradient, lid curve (neutral)},
  iris:{L,R: sprite path | procedural id, centre, r, stars[], catchlights[]},
  cheeks:{L,R: centre, r50, softness, aspect, colour, sparkles[]},
  neutral:{…}, eyeGate, palette:{tube, inside, tongue, blush, blend:"screen"},
  faceBox:[x0,y0,x1,y1] }
```

The face box is computed from strokes plus glow padding plus maximum eye scale (fixes R15).

### 5.3 Performance contract

- **Cache key:** each param is quantised to a perceptual step (eyeOpen 0.004, look 0.003, smile 0.005, and so on). `mouthWavePhase` drops out of the key when `mouthWave < 0.01`.
- **Skip** drawing when `rest ≥ 0.999`.
- **Redraw once per frame by default.** Redraw per sub-frame only during windows the beat marks as fast (blinks, eye pops), which `subframes()` already detects.
- **Layer caching:** brow layers, iris canvases and glow sprites are cached by openness/scale bucket.
- **Glow blur at quarter resolution** as an interim step (257 → ~50 ms). The SDF tube shader in WP19 targets 10–20 ms.
- **Upload only the face box** with `texSubImage2D`.
- **Budgets:** ≤ 50 ms per redraw for closed-tube and ≤ 60 ms for open-socket and spiral, both cached.

### 5.4 Fidelity gates per Mallow (from the asset reports)

A Mallow pack becomes `approved` only when all of these pass:

- **Asset QA:**
  - Bit-exact outside the edit mask; alpha unchanged.
  - Texture energy per band inside vs outside the edited area within 0.85–1.15.
  - Repeat-patch detector passes.
  - Ghost check on stretched channel views.
  - Cheek refit within ±1 px.
- **Rest match:** the procedural neutral face over the clean body against the pristine painting.
  - Closed-tube: ΔE2000 mean ≤ 2 in the face box, centrelines ≤ 1–2 px.
  - Open styles: SSIM ≥ 0.9 and catchlight IoU ≥ 0.9.
  - If this fails, `restCrossfade:false` is allowed only with owner sign-off on the procedural neutral.
- **Expression sheet** at 100% and 200%.
- **Stress filmstrips** (blink, gaze travel, squash 0.6 / stretch 1.3).
- **Owner sign-off still.**

The generic `derive_mallow_hires.py` must regenerate Noomi byte-identically before any other Mallow is derived.

---

## 6. World and realm system

### 6.1 How far to extend the v2 lake: one world kit, seven presets, nothing generic

The lake becomes a layered world kit that covers every realm's needs. Each realm is a preset plus 3–6 realm-specific set-piece modules ported from that realm's app design. There are no guest realms and no random scenery.

| Layer | Kit modules | Used by |
|---|---|---|
| Sky type | `night-moon` (v2), `blue-hour`, `day-sun`, `storm-deck`, `interior-dome` (galaxy through a shutter) | cove and festival; lagoon; drift and orchard; storm; observatory |
| Celestial body | moon (v2: maria, limb, halo), sun (soft disc, halo, shafts), galaxy (log-spiral, ghosted ↔ crisp), none / cloud-glow | — |
| Cloud models | stratus (v2), billow cumulus, mammatus, lenticular streaks, ember wisps | — |
| Far layer | baked silhouette strips: ridges (v2), headland + lighthouse, islets, crystal range, plum hills + tents, dome ribs | — |
| Ground | `water-mirror` (v2 lake, with periodic chop), `glass-floor` (v2 reflection + emissive crack→mandala), `stone-floor` (low-fresnel reflection + engraved dais), `cloud-sea` (billow top, no reflection), `hill-dais` (no reflection, contact shade) | — |
| Atmosphere | haze/mist (v2 haze, generalised), rain streaks (driving `uRip`), scanline sweep (storm, constant brightness) | — |
| Dressing | realm-specific modules (6.3) | — |
| Light rig | `moon-rim` (v2), `sun-key` (higher ambient, warm key, cooler rim for figure/ground contrast), `stage-halo` (Glitzi) | — |

### 6.2 Time of day, weather, mood dials and payoff

- **Time of day:** only the realm's canonical times from the library's Mallow profiles (Noomi: dusk, night, late-night, pre-dawn; Loomi: morning, midday, afternoon, golden; and so on). Each one is a palette (zenith, high, horizon, haze, celestial position/size/colour, stars, clouds, water tint, key/rim/ambient, post tints) plus time-specific dressing (lighthouse beam visible at night; fireflies at dusk and night; horizon glow before dawn).
  - Shifts within a video happen only through palette arcs (A-DUSK-DIP-GOLD, A-PREDAWN-SUNRISE), which wrap with LP-CYCLE.
- **Weather:** the baseline is a slot (clear, mist, scud; rain for the lagoon; overcast for the drift). Story weather is driven by the mood dials, as in the app: agitation brings chop and scud, heaviness brings mist and dimming, clarity sharpens stars and the mirror, warmth shifts the grade.
- **Palette arcs** (library A-\*) are dial keyframes on the beat clock, so every arc works in every realm. The realm maps the dials to its own uniforms.
- **Transform `p`** drives each realm's built-in payoff: aurora (cove), drops rising into light (lagoon), golden mandala (storm), shutters opening (observatory), rainbow (orchard), lanterns lit left to right (festival), haloed sun (drift).
- **Pulses** (ripple, strike, clear, burst) are beat-callable. Each is restyled per realm to be brand-safe (falling star, sun shaft; never lightning or a flash).

### 6.3 Scope per realm

| Realm | Ground / sky | Port and new work | Estimate |
|---|---|---|---|
| Moonmilk Cove (Noomi) | water / night-moon | v2 plus: 4 time-of-day palettes, mist and scud weather, headland + lighthouse (slow periodic beam), pearly shore band (3 curvature variants), shells and pearls glow, fireflies, dream bubbles, aurora payoff, lavender water tint | 8 d |
| Raindrop Lagoon (Blubi) | water / blue-hour | pastel cushion-hill shape mode, glass beads (small frosted glass cards, side bands only, non-refracting impostors past 6), lily pads and cushion stage, rain → ripples, beads → light payoff | 6 d |
| Blue Drift (Loomi) | water / day-sun | sun + halo, lenticular streaks, islets with reflections, river-stone stage, seed fluffs and birds as particles, `sun-key` rig, contrast fix (darker foreground water band, stronger rim) | 6 d |
| Spark Festival (Pipzi) | hill-dais / night-moon | plum recolour, festoon lantern strings (catenary + sway), Ferris wheel, tents and carousel silhouettes, sky lanterns, slow fireworks (rise ≥ 0.45 s, fade over seconds), confetti, lanterns-lit payoff | 8 d |
| Sunpop Orchard (Boppo) | cloud-sea / day-sun | billow cloud sea, meadow island stage, floating islands, fruit trees, bouncing fruit, sun shafts, rainbow payoff, contrast fix (green meadow, cool rim) | 8 d |
| Spiral Observatory (Zuzu) | stone / interior-dome | galaxy shader, armillary rings (SDF lines), floating lens (glass shader), dome/telescope/arcade silhouettes, shutter reveal | 8 d |
| Static Storm (Glitzi) | glass-floor / storm-deck | mammatus deck, crack emission → gold mandala, constellations, crystal silhouettes, shard particles, glitch row displacement (brightness-preserving, ≤ 1 burst per 2 s), **no lightning or flicker** | 8 d |

### 6.4 Budgets, baking and loops

- **World pass budget:** ≤ 0.35 s per frame at final quality in the worst allowed combination, and ≤ 0.07 s at draft. `hm bench realm <id> --worst` enforces it (G15); a realm can't be approved until it passes.
- **Baking:** static content (tileable fbm noise textures, silhouette strips, dressing sprites at native screen resolution) is baked once per (realm, dressing, layout variant) into `output/cache/world/<hash>.png`. Palettes and dials stay as runtime uniforms, which are cheap.
- **Loops:** every animated world element is periodic over D/k, including water chop (fixes R6). `uLoop` is always the spec's duration, never a fallback of 15.
- **Clutter budget (cinematic restraint):** at most 2 dressing items plus the payoff, and a cost ceiling of 60 ms. Dressing never sits inside the safe zones for text, the right-hand button rail (x > 900, y 700–1500), or the Mallow's silhouette band.

---

## 7. Props and particles

- **One renderer for the glass family.** `GlassCard` generalises v2's bubble: shape (pill, rounded rect, tab, block, battery segment), tint, content texture (text, or an owner-approved icon), stress, glowUp/dissolve.
  - Metaphors are layouts and choreographies of GlassCards: orbit, echo, week, stack, loom, tabs, frames, icons, fork, meter.
  - At most 3 readable cards (validator). Decoys (M-TABS) are cheap pre-blurred non-refracting impostors.
  - Overlapping front cards each get their own blurred backdrop when they overlap, at about +20 ms per card (fixes R17).
- **Non-glass props:**
  - personal cloud (drizzle, through the particle system)
  - spotlight cone: light mask; ramps ≥ 0.3 s; never switches on hard
  - clock face
  - cushions (M-COSYPILE): soft sprites in each realm's palette
  - lantern (R-LANTERN)
  - icon set: one owner-approved sheet of about 16 glass-etched pictograms; no phones, no app UI, no brands
- **Particles are analytic:** spawn time + seed → closed-form trajectory, so they stay pure and loop-safe. Ambient emitters wrap mod D.
  - New shapes: star4, droplet, flat ring, round ring (Zuzu), ribbon, puff, heart / pixel heart, shard, confetti, glyph (z, ?, ♪).
  - Glyphs are icons with no scale wobble. The "!" glyph is not used, per the library's design rules.

---

## 8. Sound

The score has three layers: the realm bed, the Mallow's kit gestures, and foley tied to cues. The instruments, engine bridge and mastering stay as they are. Only the plan becomes generic.

1. **Cue vocabulary owned by beats.** Each beat emits typed cues (`flump`, `squeak`, `tingLine{i}`, `orbitWhoosh{pan}`, `turnStop`, `inhale`, `crest`, `exhale`, `dissolveChime{i}`, `logoChime`, …). `studio/audio/recipes/<cue>.mjs` maps each cue to synth events. Recipes take parameters from the Mallow kit (`kits.mjs`: root, scale, speed, send, timbre), with per-Mallow overrides (Glitzi gets bit-crushed variants). An unknown cue fails G1, so cues can't silently go missing (fixes R10).
2. **All pitched synth events are transposed to the kit's root and scale** (fixes R8): bells, pad, glass tings on scale steps 0/2/4.
   - **Decision for the owner (default given):** the library says "major pentatonic only", but Glitzi's approved app kit is minor pentatonic and Zuzu's is Hirajoshi-like. Default: use each kit's own scale, which is the approved sound identity, and keep the library's contour rule that resolutions rise or arch.
3. **Engine voice** `E.buildMallow(spec.mallow)`; **bed** `E.startBed(realm.audio.bed, dials)`, driven by the same dial curves as the picture (one source of truth, fixes R11). Layers (ticks, crickets, swirl, pad, sleeping breath, rain patter, crowd murmur) are parameterised code whose windows come from cues, never absolute seconds.
4. **Circular render** (fixes R7): render [−4 s, D + 4 s] of the periodic timeline, fold the head and tail onto [0, D), master, then verify the wrap.
5. **Audio slots:** motif contour (`rise-1..3`, `arch-1..3`), tick tempo ±10%, pan width 0.6–1.0, bed mood offset. These can be re-scored on an existing picture (`hm render --remux`).
6. **Mastering:** −16 LUFS ±0.5, true peak ≤ −1.5 dBTP. The gate tightens from today's −1.0.
7. **Banned recipes** (lint on recipe IDs): samples, ringtone or alarm imitations, messenger pops, heartbeats, jump-scare stings.
8. **Audio comes from the dry run, never from the render** (fixes R12). It is rendered in a second page of the same worker browser while the video renders, so it is ready before the video pass ends.

---

## 9. Captions, copy and brand safety

- **Source of copy:** only the validated `story-library.json`, plus additions through `hm copy add`, which runs the same validator and the cross-template duplicate check.
  - No runtime text generation. Copy grows as a curated content task (suggested +40–60 hooks per month).
- **Text layout** (`type/layout.js`) is exact in the browser. In Node it uses `data/fonts/fredoka-metrics.json` (glyph advances and kerning measured once), so the sampler can pre-check fit.
  - Wrap and autofit: hook 76 → 50 px floor; bubbles 2 lines ≤ 17 chars at 50 px; resolution 62 px.
  - Safe zones: key text inside x 60–1020 and y 180–1250; nothing in the right-hand button rail; nothing below y 1500.
  - Ship the full Fredoka set when a non-Latin locale is added (R16).
- **Motion:** the `TextBlock` API offers only rise + fade. Brand rules can't be broken through the API, and G11 measures it anyway.
- **Caption themes per realm:**
  - `moonlit` (the v2 white→lavender gradient + ink shadow) for night realms.
  - `daylight` for Drift and Orchard: the same type, a deeper ink shadow and a soft local backdrop blur at ≤ 25% opacity. **This needs owner sign-off.**
  - Readability gate: ≥ 4.5:1 effective contrast.
- **Overlay split:** the caption layer is rendered separately (premultiplied RGBA, with a bounding-box sidecar per frame). A `--clean-plate` render keeps the post-grade picture before the caption layer, encoded at CRF 10 (~80–100 MB, est.), so new hooks or resolutions can be composited in ~10 s with ffmpeg overlay instead of a re-render.
  - Captions are then composited after grain. That is a tiny departure from v2, so parity mode keeps the in-renderer overlay.
  - Thought lines live inside glass, so they stay picture slots.
- **Copy lint** (`spec/lint-copy.mjs`, superset of `validate-library.mjs`):
  - The library's banned and caution lists.
  - Regexes for breath-hold phrasing and for counts ("4-7-8", "hold for").
  - Lowercase `hushmallow` everywhere, including inside ALL-CAPS hooks.
  - No medical or therapy claims.
  - Closers follow the rules (about 30% of posts, never 3 in a row, never together with an insight line).
  - Time-word ↔ time-of-day consistency.
  - No two lines starting with the same word; at most 2 question marks.
  - Grief-adjacent pairing rules: T14's sensitive hook never pairs with a comic L3.
  - Semantic hook cooldown: token Jaccard ≥ 0.5 between hooks counts as the same hook.
- **End card:** the untouched approved logo on its light plate (there is no reversed version, so the plate is always used), uniform scale and fade only, plus "hushmallow.com". G14 checks the pixels.
- **Post metadata** (`post.json`): a suggested caption made from the end copy plus a curated hashtag list, and alt text describing the Mallow and the beat. It is linted too. Publishing stays manual; Phase 2 has no social-media API integration.

---

## 10. Variation engine and uniqueness

### 10.1 Sampling pipeline (`spec/sample.mjs`)

Inputs: the library, packs filtered to `status: approved`, the ledger and reservations, the batch request (count, channel, date span, optional constraints) and the batch seed. For each slot n, with `seed_n = hash(batchSeed, n)`:

1. **Template**, weighted by the scheduler: cooldowns (each template ≤ 2 per 7 days, T01 ≤ 1), feeling-family coverage (≥ 4 families per 7 posts), valence quota (≥ 2 positive or mixed per 7), and the rejection down-weights in `data/weights.json`.
2. **Duration** from the template's allowed list (15 s weight 0.5, others share 0.5), filtered by ritual feasibility.
3. **Mallow:** primary ×3, secondary ×1, unlocked only, never the previous post's Mallow, at most 3 per 10 posts. The "every Mallow in 10 posts" rule applies to the unlocked set.
4. **Realm** (home) → **time of day** (realm ∩ template ∩ hook time words) → **weather** → **dressing** (within budget).
5. **Gag** (signature about 40% where feasible; intensity capped by the template) → **metaphor** → **ritual** (minimum duration ≤ the ritual window; allowed for this Mallow) → **camera** → **loop**.
6. **Copy:** hook, line triple, end copy, with cooldowns and reservations (hook 90 d per channel; line ≤ 3 per 30 d; resolution ≤ 1 per 7 d).
7. **Audio slots and micro-acting seeds.**
8. **Pre-render gates G1–G5.** On failure, resample up to 50 times. If still exhausted, relax soft constraints in a documented order (weather → dressing → camera → duration) and report it in the batch manifest.

Sampling 10,000 specs takes less than 10 s and is reproducible byte for byte from the seed.

### 10.2 Least-recently-used weighting

For every slot value: `w = base × (1 − e^(−age/τ))`, where age is the number of posts on this channel since the value was last used. τ is tuned per slot (hooks τ = 60, gags τ = 6, time of day τ = 3).

Usage spreads evenly, like dealing from a shuffled deck, so long runs stay fresh rather than clumping as uniform random sampling does.

### 10.3 Uniqueness at three levels

| Level | Check | Rule |
|---|---|---|
| L0 exact | SHA-256 of canonical visible slots + seed | never repeat |
| L1 structural (pre-render) | weighted distance over visible slots. Weights: mallow 3, hook 3, template 2, lines 2 (⅔ per line), ritual 2, gag 2, realm/time of day 1.5, metaphor 1.5, weather/dressing 1, camera 0.5, end copy 1 | vs anything on the same channel in the last 14 days: ≥ 3 visible slots differ, one of them Mallow or hook (library rule), **and** distance ≥ 6.0. A seed-only or overlay-only difference counts as the same video. |
| L2 perceptual (post-render) | anchor-frame pHash (64-bit) at cover, gag, impact, peak, ritual mid, eyesOpen and end card; per-beat colour histogram trajectory; audio onset and spectral-centroid signature | Hold for review if ≥ 5 of 7 anchors are within Hamming distance 10 of any library video. Cover frame (the feed thumbnail) must be ≥ 14 from each of the last 30 posts on the channel. |

The thresholds are calibrated on review batch R1: the owner rates 20 pairs "feels the same / feels different" and the thresholds are fitted to those ratings.

### 10.4 Scheduler

`hm batch plan --channel tiktok --days 7 --per-day 3` samples in post order, so the sequencing rules (no consecutive repeats of template, Mallow, ritual or gag; Mallow quotas; feeling-family coverage) hold over the planned order. It writes `batch.json` with the planned post dates and appends reservations.

Cross-platform copies of the same video are allowed and are tracked per channel.

### 10.5 Capacity by wave (honest)

- **Wave A, Noomi only:** about 13 templates × ~8 hooks × 27 line triples × 3 end lines × ~3 gags × ~3 rituals × 2–4 times of day × 3 weather × ~6 dressing sets. That is well over 10^5 raw combinations per template, and several hundred to a few thousand that pass L1.
  - The real limit is fatigue from one character in one realm. Expect about **3–5 good posts per week** from Noomi alone before the channel feels samey. Time of day, weather and dressing variety are what stretch that.
- **Waves B–E:** each added Mallow brings its own realm, times of day and personality filter, so perceived variety grows roughly with Mallows × realms.
  - With all 7 unlocked, the library's rules support **thousands of clearly distinct posts**, and the limits become copy growth and review time.

---

## 11. CLI (`hm` = `node studio/cli.mjs`)

| Command | Purpose |
|---|---|
| `hm doctor` | Pinned Playwright/Chromium, explicit SwiftShader flags (fixes R2), ffmpeg, fonts, cores, RAM, free disk ≥ 5 GB |
| `hm library validate` / `hm library coverage` | Existing validator + capability coverage: what is renderable now, and which combination gaps exist |
| `hm packs status` | Mallow and realm packs: status, version, blocking decisions |
| `hm spec sample [--template T03] [--mallow noomi] [--seed N] [--n 20]` | Write spec(s) |
| `hm spec explain <spec>` | Beat sheet, slot choices, predicted cost, nearest neighbours in the ledger with distances |
| `hm compile <spec>` | Timeline IR + G1–G5 report |
| `hm preview <spec> [--stills cover,gag,peak,ritual,end]` | Proof stills (~25 s) |
| `hm render <spec> --profile proof\|draft\|final\|parity [--clean-plate] [--remux]` | One video |
| `hm batch plan …` / `run <batch> --profile draft --workers 3` / `status` / `resume` / `retry --failed` | Batches |
| `hm qa <video>` / `hm qa report <batch>` | Post-render gates |
| `hm gallery <batch>` | Static review gallery → `output/gallery/<batch>/index.html` |
| `hm review import decisions.json` | Approve/reject with reason codes; feeds `weights.json` |
| `hm promote <batch>` | Queue finals for approved drafts (reuses cues and audio) |
| `hm variant <video> --hook "…" \| --end closer` | Overlay-only composite from the clean plate (A/B tests and cross-platform versions only) |
| `hm ledger post <video> --channel tiktok --date …` | Record a post (drives cooldowns) |
| `hm beat-sheet <beat> [--mallows all] [--extremes] [--pairs]` | Contact sheets for beat review |
| `hm bench [--realm X] [--worst] [--frames 30]` / `hm golden v2` / `hm derive <mallow>` / `hm prune` | Operations |

---

## 12. Batch rendering, resume, caching and storage

- **Workers:** `studio/render/worker.mjs` child processes. Each owns one Chromium with the explicit flags (`--use-angle=swiftshader --enable-unsafe-swiftshader`, plus the current ones). The browser is reused, with a new page per job (fixes R4 until `dispose()` is proven).
  - **Lanes:** `priority` (the owner is waiting: proof stills and single finals) and `bulk`.
  - **Defaults:** 2 workers for finals, 3 for drafts, never more than 3 in total.
- **Binary frame transfer:** the page POSTs an `ArrayBuffer` per frame, by index, to the worker's local server, which writes it straight to ffmpeg's stdin (fixes the base64 path).
- **Segments and resume:**
  - Video is encoded in segments of 150 frames (5 s) with `-g 30 -keyint_min 30 -sc_threshold 0`. Segment boundaries fall on keyframes, so `concat -c copy` gives the same GOP layout as a single pass.
  - The job record stores the SHA of each finished segment.
  - On restart, the scheduler verifies stage outputs (existence, checksum, ffprobe frame count) and continues from the first missing segment, so a crash costs at most 5 s of render.
  - Stale locks (PID plus a 60 s heartbeat) are reclaimed.
  - Failure handling: one retry with a fresh browser; a second failure marks the job failed with logs.
- **Stages are idempotent:** compile → dry run (timeline.json, cues.json, curves) → audio (parallel page) → video segments → concat → mux → QA → review.
- **Caches** (content-addressed by spec hash + engine SHA + pack versions):
  - timeline / cues / curves
  - score WAV (shared by draft and final)
  - world bakes (shared across all videos with the same realm, dressing and layout)
  - face per-job LRU
  - clean plates (only on request)
- **Determinism:** the same build gives bit-identical output. G15 re-renders 3 random frames and compares hashes. Provenance records the engine SHA, pack versions, Playwright/Chromium versions and the profile.
- **Output per video:** `output/runs/<batch>/<videoId>/{spec.json, timeline.json, cues.json, draft.mp4 | final.mp4, qa/{qa.json, filmstrip.jpg, contact.jpg, seam.jpg, wave.png}, post.json, render.log}`.

**Storage policy** (26 GB free):

| Artifact | Size (est.) | Kept until |
|---|---|---|
| Draft (540×960, CRF 24) | ~2 MB | rejected: 7 days; approved: until the final is accepted |
| Final publish (CRF 18, preset slow) | ~20 MB (to be measured in WP1; v2 is 34.6 MB at CRF 16 and 11.6 MB at CRF 20) | 30 days after posting, then pruned to the spec (re-render ~8 min) |
| Preview copy (CRF 20) | ~12 MB | optional |
| WAV | 4.3 MB | deleted after mux (re-renderable from cues) |
| QA pack | ~3 MB | with the video |
| Clean plate (CRF 10) | ~80–100 MB | only on request, 14 days |

`hm prune` enforces this, and `hm doctor` refuses to queue when free space is below 5 GB.

---

## 13. Performance plan

### 13.1 Pass 1: WP2, before generalising (Noomi/lake, 15 s, 1 worker)

| Item | Change | Saving (est., cumulative from ~1580 s) |
|---|---|---|
| P1 | Face caching, quantised key, once per frame, skip at rest | −410 s |
| P2 | Face glow blur at quarter resolution; box-only upload | −110 s |
| P3 | Binary readback via POST (404 → ~50 ms per frame) | −160 s |
| P4 | World shader: branch moon fbm, hills and haze; water reads a sky texture (0.6 → 0.25 s per frame) | −160 s |
| P5 | Accumulate a premultiplied foreground once; scissored reflection and accumulation; reflection mesh at quarter resolution (~250 → ~140 ms per sub-frame) | −220 s |
| P6 | Sub-frame floor of 1 when the shutter displacement is < 2 px (1,991 → ~1,490 sub-frames) | −70 to −120 s |
| P7 | Precomputed mesh normal/d0 texture (51 → 35 ms) | −25 s |
| P8 | Skip overlay draw and upload when it is empty | −6 s |
| **Result** | world 112 + sub-frames 209 + face 30 + bloom/post 77 + readback 22 + overlay 2 | **≈ 450 s render + ~45 s fixed per job ≈ 8.3 min** |

- **Render scale:** W and H are parameterised in the renderer, `index.html`, `stage.js`, the grain constant and the blur radii, with `uRes` kept in design space. This enables the draft profile.
- **Acceptance for pass 1:**
  - The parity profile against the approved v2 frames: PSNR min ≥ 45 dB and mean ≥ 50 dB.
  - The owner approves an A/B of 12 frames plus a side-by-side of the full video.
  - Expected visible change: the face expression is no longer motion-blurred within a frame, except during blinks and eye pops.

### 13.2 Profiles

| Profile | Scale | Sub-frames | Face | World | Est. per frame | Est. 15 s job | Workers → throughput |
|---|---|---|---|---|---|---|---|
| proof | 1.0 | adaptive | full | full | ~1.2 s | 6 stills ≈ 25 s | 3 |
| draft | 0.5 | 1 | once per frame, no glow blur | 3 octaves, no clouds, no 1/8 bloom | ~0.17–0.2 s | ~2 min | 3 → ~60 per hour |
| final | 1.0 | 1–16 adaptive | cached | full | ~1.0 s | ~8.3 min | 2 → ~6–6.5 min effective, ~9–10 per hour |
| parity | 1.0 | v2 rules (floor 3) | v2 | v2 | ~3.5 s | 26 min | golden checks only |

### 13.3 Daily budget, as an operating plan

- **20 h render window:** about 150–190 lake-family finals, or about 120–150 heavier-realm finals. In practice, mix drafts and finals.
- **Nightly 10 h, recommended:** 150 drafts (~2.5 h with 3 workers) plus ~70 finals (~7.5 h with 2 workers). Daytime is for development, asset derivation (10–15 min per Mallow on 4 cores) and benchmarks, which need the machine to themselves.
- **Heavier Mallows:** Boppo's face (60–100 ms uncached) and Zuzu's spin (redraws every frame) add about 30–50 s per film. Their budgets are enforced by G15.

### 13.4 Pass 2 (WP19)

- SDF tube face shader rendered into an art-space framebuffer: −60 to −80 s.
- Tileable noise textures for all fbm (world 0.25 → ~0.1 s per frame): −70 s.
- Page reuse with `dispose()`: −10 s per job.
- Floor ≈ 5.5–6 min per final per worker.

---

## 14. Automated QA gates

Hard gates block. Warnings appear in the gallery. Every gate writes metrics to `qa.json`.

| # | Gate | Stage | Checks (thresholds) |
|---|---|---|---|
| G1 | Spec & feasibility | pre | schema; capability match; durations; ritual minimum fits its window; time words ↔ time of day; every cue has a recipe |
| G2 | Copy lint | pre | banned/caution/medical/breath-hold lists; lowercase `hushmallow`; ALL-CAPS hooks; line rules; cooldowns; reservations; closer rules; grief pairing |
| G3 | Timeline validators | pre (dry run) | sorted keys and no duplicate spline keys; loop closure < 1e-6 on all channels and curves; rest windows; deformation (squash ≥ 0.6, stretch ≤ 1.3, shrink ≥ 0.6); camera (zoom 0.95–1.10, Δ ≤ 0.04/s, roll ≡ 0, no shake channel); exposure Δ ≤ 12% ramped ≥ 0.5 s; R-BREATH (inhale ≥ 1.2 s, crest ≤ 0.35 s, exhale ≥ 1.5× inhale); spin ≤ 1 turn/s (≤ 0.3 in close-ups, ramps ≥ 0.5 s); glitch ≤ 1 burst per 2 s; ≤ 3 readable texts; exact text layout inside safe zones; NaN/finite checks |
| G4 | Uniqueness L0/L1 | pre | 10.3 |
| G5 | Cost | pre | predicted render time from the dry run's real sub-frame counts × cost model ≤ profile budget (final ≤ 11 min) |
| G6 | Container | post | existing verify.mjs: H.264 High, yuv420p, BT.709, 1080×1920, 30 fps, exact frame count, faststart, 0 decode errors, provenance current |
| G7 | Loudness | post | −16 ±0.5 LUFS integrated, TP ≤ −1.5 dBTP, audio length = video length, no silent gaps > 1.5 s outside the planned turn |
| G8 | A/V sync | post | onsets detected within ±20 ms of sound-locked cues (impacts, pops, tings); overall offset ≤ 1 frame |
| G9 | Flash & pattern | post | luminance per frame on a 4×4 tile grid and on every 25%-area window: no more than 3 general or red flashes in any 1 s (WCAG 2.3.1); no frame-to-frame change ≥ 10% over ≥ 25% of the frame; stripe pattern check for spirals; optional offline EA IRIS (open source) |
| G10 | Loop seam | post | picture Δ(last→first) ≤ max of the film's own Δ at keyframes (v2: 1.89 vs 2.02–2.09); audio wrap step < −60 dBFS and spectral flux at the seam within the film's 95th percentile |
| G11 | Text | post | bounding boxes from the sidecar inside safe zones; contrast ≥ 4.5:1 on frames where text alpha > 0.9; motion is monotonic rise only, no oscillation (velocity sign changes = 0); dwell time ≥ 0.3 s per word + 0.5 s; ≤ 3 readable cards plus captions |
| G12 | Character fidelity | post | rest windows vs pristine art under the same transform (ΔE mean ≤ 2, SSIM ≥ 0.95); in-film body chroma ratio inside the relight band ("relit, never recoloured"); rendered alpha area 0.6–1.4× rest; renderer log of max screen px per art px ≤ 1.0 for every raster on every frame; face box inside silhouette; figure/ground separation at the silhouette edge ≥ threshold (Loomi and Boppo contrast risk) |
| G13 | Duplicate (perceptual L2) | post | 10.3 |
| G14 | Brand | post | logo region SSIM ≥ 0.98 against the approved logo composited at that scale, exact aspect, no tint; plate present; lowercase URL; no "!" glyphs; closer counts |
| G15 | Performance & determinism | post | actual vs predicted time (warn at +30%); re-render 3 random frames with equal hashes; realm and face budgets |

**Fault-injection suite** (`tests/qa-faults/`): each gate has at least one seeded-fault fixture, all of which must be caught:

- a white frame over 25% of the screen
- camera noise
- a hook outside the safe zone
- a mix at −12 LUFS
- a seam jump
- a tinted logo
- a recoloured Mallow
- an upscaled sprite
- a duplicate render
- a banned word
- a breath-hold line

**Human gate:** the static gallery shows, per video, the MP4, filmstrip, contact sheet, seam image, waveform with cue markers, gate results, spec summary and nearest neighbours.

The owner ticks approve or reject with reason codes (`acting`, `timing`, `copy`, `world`, `face`, `sameness`, `brand`, `other`), then clicks "Export decisions.json". `hm review import` applies the decisions, and rejection codes down-weight the slot combinations involved.

---

## 15. Testing

- **Unit tests** (`node:test`): motion primitives; TrackBuilder sorting and conflicts; periodic noise; RNG substream independence; layout/autofit against browser measurements (±1 px); lint; fingerprint and distance; LRU weights; scheduler rules; cost model.
- **Property tests:** sample 1,000 random specs from the currently enabled packs and compile each in Node (composer with the font-metrics shim). Each must pass G1–G4 with zero violations, and G3 loop closure must hold for all of them. This catches bad beat interactions before any render. Runtime is under 60 s.
- **Golden tests:**
  1. v2 state and cue equality (1e-9).
  2. Pixel parity of 12 frames: the new engine in parity profile vs frozen stage2 (bit-identical before WP2; PSNR ≥ 45 dB after).
  3. Comparison with the approved MP4 through `tools/compare.py`.
  4. Noomi asset regeneration byte-identical.
- **Visual regression:** stored draft hashes for each beat × Mallow contact sheet (diffs flagged for review), and rest-match for each face style.
- **Realm tests:** world(0) ≡ world(D) for D ∈ {10, 12, 15, 20}; benchmark of the worst case.
- **End-to-end smoke:** `hm batch run --sample 3 --profile draft` plus QA, as `npm test:e2e` (about 6 min).
- **Determinism:** render 10 frames twice and compare hashes.

---

## 16. Docs

| File | Contents |
|---|---|
| `docs/ARCHITECTURE.md` | layers, contract v3, data flow |
| `docs/AUTHORING-BEATS.md` | channel semantics, claims, entry/exit poses, approved ranges, extremes review, cue naming, cost tags, worked example (G-FLOP) |
| `docs/ADDING-A-MALLOW.md` | derive → measure → face spec → style config → asset QA → rest match → expression sheet → sign-off → pack approved |
| `docs/ADDING-A-REALM.md` | kit modules, time-of-day/weather/dressing presets, dial mapping, payoff, baking, loop rules, benchmark budget |
| `docs/QA-GATES.md` | every gate, metric, threshold and fault fixture |
| `docs/BRAND-RULES.md` | brand rules as implemented, with links to lint and gate code |
| `docs/OPERATIONS.md` | nightly runs, resume, storage/prune, review flow, ledger |
| `docs/DECISIONS.md` | owner decisions log (section 18) |

The README is updated to explain the v2 archive versus the engine.

---

## 17. Build plan

Effort is in focused engineering days (d). The ownership column lists the files each work package exclusively owns while it is in progress. Work packages that are marked parallel touch disjoint files.

### Phase 2a: platform plus Noomi at scale

| WP | Goal | Files | Depends on | Acceptance | Effort | Parallel / isolation |
|---|---|---|---|---|---|---|
| **WP0** Freeze & scaffold | Tag `v2-approved`; commit `templates/`; gitignore `__pycache__`; copy stage2 → `engine/` (inline clock, R19); `studio/cli.mjs` skeleton; `hm doctor`; test runner | engine/*, studio/cli.mjs, package.json | — | v2 archive untouched (git diff empty); engine renders 10 v2 frames bit-identical to stage2 | 0.5 d | first, alone |
| **WP1** Render pipeline v3 | Binary frame sink, segments + resume, profiles, explicit SwiftShader flags, no suffix routing (R3), page per job (R4), curves from dry run (R12), NaN guard (R18), provenance, CRF 18 publish measurement | studio/render/*, engine/stage.js (capture only) | WP0 | v2 output frames bit-identical; readback ≤ 60 ms/frame; kill -9 at a random frame then resume gives identical frame hashes; ffprobe 450 frames, 0 errors; CRF 18 size and PSNR reported | 2.5 d | serial after WP0 |
| **WP2** Performance pass 1 + render scale | P1–P8, parameterised W/H | engine/render/*, engine/face/face.js, engine/stage.js | WP1 | Final v2 ≤ 9 min (1 worker); draft ≤ 2.5 min; parity PSNR min ≥ 45 dB, mean ≥ 50; **owner perf-parity sign-off** | 5 d | **isolated**: owns renderer, face and stage; exclusive machine for benchmarks |
| **WP3** Composer + v2 beats + golden | channels, TrackBuilder, layout/acting, bridges, validators, 13 v2 beats, T01@v2 recipe | engine/compose/*, engine/core/trackbuilder.js, tests/golden | WP0 (WP1 for the render check) | state dumps equal to 1e-9 at all 2,441 times; cue log byte-equal; render bit-identical to the WP1 output (before WP2 merge) | 5 d | parallel with WP2 (does not touch renderer) |
| **WP4** Spec, sampler, ledger, scheduler | schema, sample, LRU weights, substreams, fingerprint/distance, reservations, `hm spec/batch plan`, font metrics | studio/spec/*, studio/queue/*, data/ledger, data/fonts | WP0 | 10k specs < 10 s, reproducible; 0 rule violations (property tests); 90-day simulation at 3 posts/day satisfies sequencing and cooldowns over the unlocked set | 3.5 d | parallel |
| **WP5** Score generalisation | plan builder, cue→recipe registry, kit transposition, `buildMallow(id)`, realm bed from dial curves, circular render, sync detector | studio/audio/* (imports audio/soundtrack.mjs read-only) | WP3 (cue schema), WP1 | v2 template score: cue onsets ±5 ms, −16 ±0.5 LUFS, TP ≤ −1.5; wrap step < −60 dBFS; stub Blubi spec bells detected at F-pentatonic pitches; owner listening pass | 3 d | parallel |
| **WP6** Type, captions, overlay split | layout/autofit/wrap, themes, bounding-box sidecar, clean plate, `hm variant`, generic logo card | engine/type/*, engine/render/passes/post.js (overlay hook, after WP2 merge) | WP2 | sweep of all 221 hooks / 336 lines / 84 resolutions × durations inside safe zones (contact sheet); contrast ≥ 4.5:1 on v2 backgrounds; overlay composite vs full render PSNR ≥ 45 dB in caption region | 2.5 d | after WP2 merge |
| **WP7** QA gates + gallery + review import | G1–G15, signature, report, gallery, decisions import, fault suite | studio/qa/*, studio/gallery/*, tests/qa-faults | WP1 (G3 needs WP3) | v2 passes all gates; 100% of injected faults caught by the intended gate; gallery opens offline | 4 d | parallel |
| **WP8** World kit + Moonmilk Cove v1 | world modules, baking, periodic water (R6), 4 times of day, 3 weather, 5 dressing items, aurora payoff, light rig with catchlight direction | engine/worlds/*, engine/render/passes/world.js, data/realms/moonmilk-cove.json | WP2 | worst-case world ≤ 0.35 s/frame final, ≤ 0.07 draft; loop identity for D ∈ {10,12,15,20}; owner approves the time-of-day × weather × dressing contact sheet; T01@v2 golden still green | 8 d | after WP2; owns worlds |
| **WP9** Props/particles kit + beat library wave A | GlassCard family + layouts, icon sheet (owner-approved), analytic emitters + shapes, soft-body shrink/slide; 9 gags, 12 metaphors, 10 rituals, core beats, 3 loops | engine/props/*, engine/particles/*, engine/body/softbody.js (additive), engine/compose/beats/* | WP3; WP8 for world-coupled beats | ≥ 12 Noomi templates renderable (`hm library coverage`); each beat passes G3 and has an approved extremes contact sheet plus a draft clip; junction-pair sheet reviewed; cost entries measured | 12 d (3 streams of ~4 d: gags / metaphors+props / rituals) | parallel streams; separate files per beat; weekly owner beat review |
| **WP10** Face style system + generic derivation | FaceParams + app mapping, style plugin API, closed-tube generalisation, face spec schema, `derive_mallow_hires.py` + per-Mallow config | engine/face/*, tools/derive/* | WP2 | Noomi rest-test diff ≤ today; Noomi derivation byte-identical; unit tests per style | 4 d | after WP2 (owns face) |
| **WP11** Integration & review batch R1 | end-to-end run, gallery, calibration pairs | — | WP4–WP10 | R1 delivered (section 18) with all hard gates green | 2 d | serial |

**Phase 2a total:** ≈ 49 d of work. With 3 parallel streams after WP2 this is **≈ 5–6 calendar weeks**, including owner review.

**Critical path:** WP0 → WP1 → WP2 → WP8 → WP9 (world-coupled beats) → WP11.

### Phases 2b–2e: unlocking the other six Mallows

| WP | Goal | Depends on / blocked by | Acceptance | Effort |
|---|---|---|---|---|
| **WP12** Blubi pack + Raindrop Lagoon | derivation with the Blubi report's fixes (5-stroke detector, narrow zone A, pedestal un-blend, cheek layer, under-glow residual pass), tears/pout/tremble, Lagoon realm | WP10, WP8 | asset QA (outside-mask = 0, zone R within ±3, band energy 0.9–1.1, cheek refit ±1%); rest-match ΔE < 2; Lagoon worst case ≤ 0.35 s; owner sign-off | 6 + 6 d |
| **WP13** Loomi pack + Blue Drift + sun-key rig + daylight caption theme | derivation fixes F1–F9, two-sided glow, tilt droop, Drift realm | **D0-2 (2-arc vs 4-arc)**, D0-8 | Loomi Q1–Q8 thresholds; G12 contrast passes on Drift; owner sign-off | 5 + 6 d |
| **WP14** Open-socket style + Boppo + Pipzi | per-Mallow finders, large-hole PatchMatch with the listed changes, cheek completion, native iris sprites, cavity mouth, closed states | **D0-3, D0-5** | asset QA from both reports; rest-match (SSIM ≥ 0.9, catchlight IoU ≥ 0.9); no-upscale log; owner stills | 12 d |
| **WP15** Sunpop Orchard + Spark Festival | cloud-sea and hill-dais grounds, set pieces, firework rules | WP8 | benchmark; G9 on fireworks; owner sheets | 8 + 8 d |
| **WP16** Zuzu: spiral style + derivation + Spiral Observatory | | **D0-4** | spiral neutral ΔE ≤ 5 in disc, bands within 2 px; G9 pattern check; spin cap | 8 + 8 d |
| **WP17** Glitzi: heavy-lid + pad-shift + emission + groove ribbon + derivation + Static Storm | | **D0-6** | Glitzi report QA; burst policy; no-lightning lint on the realm | 10 + 8 d |
| **WP18** Beat library wave B | signature gags/rituals + remaining metaphors | per Mallow availability | as WP9 | 12 d |
| **WP19** Performance pass 2 | SDF face shader, noise textures, page reuse | WP10 | final ≤ 6.5 min; rest-test unchanged | 5 d |
| **WP20** Docs & operations | rolling | — | docs complete per section 16 | 3 d |

**Calendar after 2a:**
- 2b (Blubi + Loomi): +3 weeks
- 2c (Boppo + Pipzi + Orchard + Festival): +5 weeks
- 2d (Zuzu): +3 weeks
- 2e (Glitzi): +3.5 weeks

All 7 Mallows at full variety in **≈ 20 weeks**. Derivation work packages (WP12–17) use all 4 cores for 10–15 min per run, so they are scheduled outside batch render windows.

---

## 18. What the owner reviews

### D0: decision sheet (deliver in week 1, built from the specialists' existing scratch work)

| # | Decision | Default proposed |
|---|---|---|
| 1 | Perf parity: the face is no longer motion-blurred within a frame (except blinks/pops); other approximations listed | approve after A/B (WP2) |
| 2 | Loomi canonical design: hi-res 2-arc vs app 4-arc | hi-res 2-arc, no brows at rest |
| 3 | Boppo canonical painting: hi-res grin with tongue vs app crescent | hi-res |
| 4 | Zuzu: hi-res proportions canonical; static spiral highlights; spiralHue as a cyan/magenta/violet shift (not rainbow); closed-eye and closed-mouth designs | yes / yes / shift / stills to review |
| 5 | Boppo and Pipzi closed-eye and blink look (not in the art) | maroon lid tube + socket lighting (stills) |
| 6 | Glitzi: invented eyeball tops (lid raise ≤ 28 px); glitch bursts (displacement only, ≤ 1 per 2 s); mouth range limited to frown→flat if the inpainting is weak | yes |
| 7 | Kit scales: use each approved kit's own scale (Glitzi minor, Zuzu Hirajoshi) | yes |
| 8 | Daylight caption theme for Drift and Orchard | deeper shadow + ≤ 25% local backdrop blur |
| 9 | Pipzi reflecting pond (not in the app realm) | no |
| 10 | Publish encode CRF 18 vs 16 | CRF 18 |
| 11 | Icon sheet for M-ICONS / M-TABS | review the sheet |
| 12 | Posting cadence per channel, and closer frequency (~30%) | 1–2 per day per channel during Wave A |

### R1: first review batch (end of Phase 2a)

All Noomi in Moonmilk Cove. Machine time ≈ 2 h: 15 finals × ~8.3 min with 2 workers ≈ 65–75 min, 24 drafts ≈ 20 min, QA ≈ 15 min.

**P0 – Parity:** T01@v2 rendered on the new engine (final profile), side by side with the approved v2. This proves there is no regression.

**14 finals.** The table is in planned post order, which obeys the sequencing rules.

| # | Template | Dur | Time of day / weather / dressing | Gag | Metaphor | Ritual | Loop | What it tests |
|---|---|---|---|---|---|---|---|---|
| 1 | T01 Brain at 2 AM | 15 | late-night / mist / headland-lighthouse | JELLYFREEZE | ORBIT | CLOUDWRAP | RETURN | new hook "LIGHTS OFF. BRAIN ON."; variety within a template |
| 2 | T03 Social battery | 10 | dusk / clear / pearly-shore | FLOP | METER | COSY | RETRIGGER | 10 s clock; new prop |
| 3 | T26 Nostalgia | 15 | dusk / clear / fireflies | DOUBLETAKE | DREAMBUBBLES | SAVOUR | OBJECT | warm and positive |
| 4 | T09 Rejection sting | 15 | night / mist / — | DEFLATE | CLOUD | RAINLIFT | OBJECT | gentle intensity cap 0.6 |
| 5 | T21 Plans cancelled | 10 | dusk / clear / shells-pearls | DEADPAN | COSYPILE | SQUISH | RETURN | comic understatement on Noomi |
| 6 | T16 Morning dread | 12 | pre-dawn / clear / — | SINK | CLOCK | STRETCH | CYCLE | A-PREDAWN-SUNRISE arc; mouth stays above the waterline |
| 7 | T14 Missing someone | 15 | night / mist / headland-lighthouse | WEEBLE (0.4) | FOG | LANTERN | OBJECT | grief-adjacent tone |
| 8 | T27 They remembered | 12 | night / clear / dream-bubbles | MELT | GLOW | FLOAT-AWAY | RETURN | positive |
| 9 | T20 Too loud | 15 | late-night / clear / — | CRINGE | NOISE | DRIFT | RETRIGGER | element count ≤ 6; muffle score |
| 10 | T01 Brain at 2 AM | 20 | night / scud / pearly-shore | SINK | ECHO | FLOAT-AWAY | RETURN | 20 s clock with line 4 |
| 11 | T28 Crying at an advert | 15 | night / clear / fireflies | JELLYFREEZE | TEARS | RAINLIFT | RETURN | tears on the closed-tube face |
| 12 | T22 Guilty resting | 15 | dusk / clear / — | DEADPAN | ICONS | DRIFT | RETRIGGER | icon sheet |
| 13 | T02 Sunday scaries | 15 | dusk → night / clear / headland | DOUBLETAKE | WEEK | FLOAT-AWAY | CYCLE | world-coupled gag (sun lurch) |
| 14 | T01 Brain at 2 AM | 12 | late-night / clear / dream-bubbles | JOLT | ORBIT | BREATH | RETURN | 12 s; the closest neighbour of v2, to test where the "feels the same" line falls |

**AB1:** #1 again as an overlay-only variant with a second hook, composited from the clean plate. This is for approving the cheap variant path; it never counts as a new post.

**24 drafts:** `hm batch plan --channel tiktok --days 8 --per-day 3`, rendered as drafts and shown as a cover-frame contact sheet plus clips. This lets the owner judge the scheduler's variety over a simulated 8 days.

**Calibration:** 20 pairs drawn from the batch, rated "feels the same / different", which fit the L1 and L2 thresholds.

### R2: after Phase 2b

18 finals: 6 each for Noomi, Blubi and Loomi. These include the same template (T03 Social battery) and the same gag across all three, to judge the personality filter. A 7-day plan of drafts across the 3 Mallows checks the sequencing rules with more than one character.

---

## 19. Main risks and mitigations

| Risk | Mitigation |
|---|---|
| Generated videos feel mechanical next to hand-directed v2 | Quality lives in reviewed beats with approved parameter ranges, pose contracts and junction-pair reviews. The personality filter comes from the app's own expressions. Owner review is mandatory, and rejections down-weight combinations. Choreography is never random. |
| SwiftShader fallback removed in a future Chromium (R2) | Pin Playwright 1.56.1 and its Chromium build; explicit `--use-angle=swiftshader --enable-unsafe-swiftshader`; `hm doctor` checks WebGL2 before any batch. |
| Asset derivation fails QA for a Mallow (Boppo, Pipzi, Zuzu holes ~3–4× Noomi's) | Gate per pack; documented fallbacks (patch quilting; a restricted expression range for that Mallow; `restCrossfade:false` with sign-off). Production carries on with the approved Mallows. |
| Owner decisions stall waves | D0 in week 1; work packages ordered so blocked Mallows come later; Wave A needs no new decisions beyond perf parity. |
| Disk exhaustion | CRF 18 publish, retention policy, spec as the archive, `hm doctor` and `hm prune`. |
| Photosensitivity (spirals, glitch, fireworks, sparkles) | Limits enforced at spec level (G3) and measured on pixels (G9); fault fixtures. |
| Brand drift in copy | Curated library only; lint superset; semantic cooldowns; human review. |
| Perf numbers are estimates | WP2 has measured acceptance targets. The cost model is re-fitted from real renders (G15), and budgets are enforced per realm and face style. |
| Too little variety in Wave A (one Mallow) | Use time-of-day, weather and dressing variety; cap the posting cadence during Wave A; push Wave B (same face pipeline, water realms) straight after 2a. |