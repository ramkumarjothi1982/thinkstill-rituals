# Hushmallow Infinite Studio: Phase 2 design (generator at the v2 quality bar)

## 0. Summary of the decisions

1. **v2 stays frozen as the reference.** `stage2/`, `videos/my-brain-at-2am-v2.js` and `audio/soundtrack-v2.mjs` are never edited again. Phase 2 forks the engine into `engine/`. Nothing new ships until the generator reproduces v2. The first check is that the numeric state matches within 1e-9; the second is a pixel check against v2 golden frames.
2. **Craft lives in code, choices live in data.** The building blocks are hand-written code: moves (gags, metaphors, rituals, turns, loops, cameras, palette arcs), face styles and world modules. Each comes with per-Mallow tuning tables. Templates and variants are data that pick and parameterise these blocks.
3. **A tuning matrix controls quality.** Every (move × Mallow) cell has a status: `untuned`, `candidate` or `approved`. Production may only use approved cells, approved face styles and approved realm/time-of-day presets. Any code change to a move resets its cells to candidate.
4. **Fewer, deeper blocks in the first release.** Phase 2.1 delivers 9 gags, 8 metaphors (built from 4 glass-prop primitives), 9 rituals, 3 turns, 4 loop strategies, 5 cameras, 9 palette arcs, 4 time-of-day presets for Moonmilk Cove, and 1 face style (closed-tube).
   - These were measured against `templates/story-library.json`. With Noomi alone they unlock 11 of the 28 templates. Adding Loomi and Blubi (the same face pipeline, and all three are lake realms) unlocks 16. That trio is listed as a primary Mallow on 22 of the 28 templates.
5. **Order of work follows asset and world reuse.**
   - Noomi first: assets done, realm about 90% exists.
   - Then Loomi and Blubi: closed-tube faces and lake-family worlds.
   - Then Boppo and Pipzi: open-socket faces and open worlds.
   - Then Zuzu and Glitzi: spiral and heavy-lid faces, and floor worlds.
6. **Every frame is a pure function of (spec, t) on a circular timeline with a movable seam.** This gives seamless loops for every loop strategy, and lets frames render in any order, split into segments, with resume.
7. **Gates run before compute is spent:** spec, then compiled direction, then draft render (about 2–3 min), then final render (target 9 min or less per 15 s), then the automated QA suite, then the owner.
8. **Render budget.** v2 today takes 25.4 min per 15 s (from `output/v2/render.log`: video pass 1518 s, 3.4–4.0 s/frame). After the performance work package the projection is about 7.5–8.5 min per 15 s on one worker, and about 6.5 min effective with 2 workers. That is about 8 finals per hour, or about 60–80 accepted videos per day including drafts and rejects. The real bottleneck is owner review, not compute.

## 1. Facts used in this design

These were checked during this session.

**Machine**
- 4 cores, 15 GB RAM, **about 26 GB free disk**. No raw frames on disk; retention rules apply.
- Node 22.22, Playwright pinned at 1.56.1.
- ffmpeg 6.1.1, which has `ssim`, `psnr`, `ebur128`, `signalstats` and `scdet` but **no libvmaf**.
- Python numpy 2.5, OpenCV 5.0, SciPy 1.18. **scikit-image is not installed**, so SSIM and ΔE2000 are implemented in numpy/OpenCV.

**App realms** (`hushmallow/src/world/realms/*.js`)
- Canvas2D modules exposing `{build, frame, pulse}`. They use a seeded rng, but their frame state is integrated with `dt` (pools, drift accumulators), and `realm.js` uses `performance.now` and requestAnimationFrame.
- So they are **not pure functions of t** and cannot loop. They are used only as read-only reference renders for palette and composition; their look is ported into GLSL plus baked plates.

**Studio state**
- `templates/` is untracked in git.
- Approved v2 provenance: `my-brain-at-2am-v2 @ 9a16084d9477` (`output/v2/verify.json`).
- v2 QA artifacts exist: loop-seam 1.89 vs 2.02–2.09 within the film; loud-cue onsets at 0 ms.

**Asset reports**
- None of the app's 439 px sprites can be reused at video scale.
- Size of the area that has to be re-synthesised, compared with Noomi's 70.7k px:

| Mallow | Re-synthesised area | Notes |
|---|---|---|
| Noomi | 70.7k px | done |
| Loomi | ~70–90k px | after fixes |
| Blubi | 68k px | plus a 248k px un-blend region |
| Boppo | ~229k px | |
| Pipzi | ~290k px | |
| Zuzu | ~308k px | |
| Glitzi | — | different method: layers plus a 25k px mouth inpaint |

## 2. Architecture

```
library/*.json ──► planner ──► runs/<batch>/<id>/spec.json
                                  │
                                  ▼   (compiled inside the render page: real fonts, real layout)
                        composer + move library + personality + acting
                                  │
              direction.json  (all keys explicit, no randomness left) + cues.json (cues + per-frame curves)
                 │                                   │
                 ▼                                   ▼
   engine/ runtime (WebGL2, SwiftShader)     audio/score.mjs (app engine kits + realm beds + foley)
   frames → ffmpeg segments → video.mp4       score.wav (circular, mastered)
                 └──────────────► mux ◄──────────────┘
                                  ▼
                       final.mp4 → qa/ gates → report.json → gallery → owner → ledger
```

**Principles**
- Parity before features.
- One source of truth per constant. The breath envelope, pans and cue names are each defined once and shared by picture and sound.
- No `Math.random`, no wall time, no absolute-second audio layers.
- The app is imported read-only (registry, expressions, reactions, `audio.js` as text, realm modules for reference stills). Any change under `hushmallow/` fails the build: the render refuses if the app tree hash differs from the one recorded.

**File layout** (root `/home/user/thinkstill-rituals/hushmallow-infinite-studio`; everything here except the frozen reference is new)

```
stage/ stage2/ videos/my-brain-at-2am-v2.js audio/soundtrack-v2.mjs   FROZEN reference (stage2 still imports stage/ clock: R19)
engine/                         browser ESM, fork of stage2
  gl.js motion.js softbody.js stage.js type.js index.html
  renderer/ index.js passes/{world,reflection,mesh,glass,cloud,particles,accum,bloom,post}.js shaders/*.js
  worlds/ lake.js floor.js open.js glsl/{noise,sky,celestial,clouds,water,haze,plates}.js plates/<realm>/*.js
  face/ index.js params.js adapters.js tube.js glow.js iris-galaxy.js iris-sprite.js blush.js tears.js
        styles/{closed-tube,open-socket,spiral,heavy-lid}.js mouths/{tube-line,cavity,open-lip,groove}.js
  props/ glass-card.js glass-tile.js glass-block.js soft-cloud.js light-shapes.js controllers/{orbit,rise,lane,stack,fork,loom}.js
  particles/ shapes.js   (glow, star4, heart, droplet, ring, ribbon, z-glyph)
  runtime/ direction-runtime.js  (implements {meta,setup,state,overlay,subframes,probes} from direction.json)
composer/                       pure ESM, runs in page and in Node (tests)
  compose.js clock.js channels.js rng.js personality.js acting.js layout.js circular.js validate.js
  moves/ index.js gags/ metaphors/ rituals/ turns/ close/ loops/ cameras/ arcs/
library/
  story-library.json (moved from templates/, validator kept)  brand.json  assets-manifest.json  tuning-matrix.json
  mallows/<id>.json   realms/<id>.json   sound/soundmap.json sound/<mallow>.json   text-styles.json
planner/ pick.mjs lint-copy.mjs fingerprint.mjs schedule.mjs ledger.mjs metrics/fredoka-metrics.json
audio/ soundtrack.mjs (shared, + transposition + circular render) score.mjs layers/{tick,crickets,swirl,pad,breath,hum}.mjs
render/ farm.mjs worker.mjs segment.mjs encode.mjs mux.mjs serve.mjs verify.mjs render.mjs(legacy)
qa/ run-qa.mjs gates/{spec,direction,delivery,flash,seam,safezone,readability,fidelity,logo,audio,dupes,craft}.(mjs|py) golden/ fixtures/
tools/ derive/{common.py,noomi.py,loomi.py,blubi.py,boppo.py,pipzi.py,zuzu.py,glitzi.py} realm-reference.mjs font-metrics.mjs
       compare.py filmstrip.py qa_pack.py (existing)
cli/hm.mjs
gallery/build.mjs
runs/<batch>/<variant>/ spec.json direction.json cues.json score-plan.json seg/ video.mp4 score.wav final.mp4 preview.mp4 qa/ provenance.json
ledger/ published.jsonl fingerprints.jsonl copy-usage.jsonl cells.jsonl
tests/ unit/ parity/ golden/
docs/ ARCHITECTURE MOVES FACE-STYLES REALMS SOUND QA RUNBOOK OWNER-DECISIONS BRAND-RULES CHANGELOG
```

## 3. Data model

### Variant spec
This is what the planner writes and what gets fingerprinted.

```json
{ "schema":"hm-variant/1", "id":"T03-noomi-night-12s-4f2a91", "batch":"2026-11-03-A",
  "template":"T03-social-battery", "mallow":"noomi", "realm":"moonmilk-cove", "tod":"night", "duration":12,
  "seed": 4991633, "quality":"final",
  "gag":"G-FLOP", "metaphor":"M-METER", "turn":"TURN-SQUEEZE", "ritual":"R-COSY", "loop":"LP-RETRIGGER",
  "camera":"C-DRIFT-IN", "arc":"A-GREY-CLEAR", "paletteJitter":{"hue":2.5,"warmth":0.04,"exposure":0.01},
  "copy":{"hook":["MY SOCIAL BATTERY","AFTER ONE PHONE CALL"],
          "lines":["Small talk. So much.","Did I laugh right?","Do not perceive me."],
          "end":{"kind":"resolution","text":["Alone time isn't rude.","It's recharging."]}},
  "sound":{"motifs":["MO-THUNK","MO-GLASS-RISE","MO-WARMPAD","MO-CLOSE"],"tickTempo":1.0},
  "fingerprint":"sha256:…", "cells":{"G-FLOP/noomi":"approved", "...":"..."} }
```

### Character pack
`library/mallows/noomi.json`, abridged.

```json
{ "id":"noomi", "status":"approved",
  "art":{"source":"../hushmallow/assets/source/hires/noomi.webp","pristine":"assets/noomi/noomi-art.png",
         "clean":"assets/noomi/noomi-clean.png","normal":"assets/noomi/noomi-normal.png",
         "face":"assets/noomi/noomi-face.json","cropOffset":[29,116]},
  "placement":{"baseX":540,"baseY":1300,"scale":0.56,"maxMagnification":1.0},
  "body":{"lag":0.062,"bins":48,"softbody":{},"limits":{"heightMin":0.6,"stretchMax":1.3,"shrinkMin":0.6}},
  "face":{"eyeStyle":"closed-tube","mouthStyle":"tube-line","neutral":{"eyeOpen":0,"closedCurve":1,"mouthSmile":1,"browAlpha":0},
          "eyeGate":[0.5,0.95],"tube":{"core":"#01185c","...":"measured"},"iris":"galaxy-navy",
          "blush":{"colour":"#ff7ff0","blend":"screen","base":1},"mouthInside":"#1a0a3a","tongue":"#ff8ab0"},
  "personality":{"energy":0.5,"amp":1.0,"tempo":1.0,"reactLag":0.06,"blinkRate":[3.5,7],"doubleBlink":0.1,
                 "expressionSource":"app:expressions.js#noomi","signature":{"gag":"G-JOLT","ritual":"R-CLOUDWRAP"}},
  "fx":{"particles":["moonstar","z","cloudpuff"]},
  "sound":{"kit":"noomi","root":523.25,"scale":[0,2,4,7,9],"bed":"moonmilk-cove"} }
```

Noomi is the **reference performer**: amp = 1 and tempo = 1. All base numbers in the moves are v2's Noomi numbers, which keeps T01 parity exact.

### Realm preset
`library/realms/moonmilk-cove.json`, abridged.

```json
{ "id":"moonmilk-cove", "family":"lake", "reflective":true,
  "tods":{"late-night":{"base":{…v2 PAL.night…},"tense":{…v2 PAL.cold…},"resolved":{…v2 PAL.warm…},
                        "celestial":{"kind":"moon","x":850,"y":590,"r":50},"stars":1.0,"text":"night-moonlit"},
          "night":{…}, "dusk":{…,"celestial":{"kind":"moon","x":780,"y":820,"r":46},"stars":0.35}, "pre-dawn":{…}},
  "constants":{"horizonY":1150,"hills":[…],"water":{"swell":…,"chopPeriodic":true},"shadow":0.55},
  "mood":{"tension":"palette base→tense","agitation":{"clouds.speed":1,"water.agitation":1,"scud":1},
          "warmth":"palette →resolved","clarity":{"stars":0.4,"haze":-0.3}},
  "transform":{"kind":"tide-still+aurora","aurora":{"maxAlpha":0.35,"rampMin":1.5}},
  "plates":[{"id":"headland","src":"engine/worlds/plates/moonmilk/headland.js","depth":0.15,"optional":true}],
  "weather":["stratus","scud","mist","fireflies","dream-bubbles"],
  "light":{"key":"celestial","ambient":0.06},
  "budget":{"worldMsFinal":250} }
```

The palette is driven by five world dials: tension, agitation, warmth, clarity and the transform value `p`. They map onto the app's agitation/heaviness/clarity/warmth plus the transform. v2's `coldAt` is tension and `warmAt` is warmth, so v2 reproduces exactly.

### Tuning matrix
`library/tuning-matrix.json`:

```json
{"G-JOLT":{"version":"sha1:…","noomi":{"status":"approved","by":"owner","on":"2026-10-13","ref":"v2"},"loomi":{"status":"untuned"}}}
```

### Direction
This is the compiled, auditable output and the only input to the runtime. It contains:
- `meta` (D, fps, shutter, seam `P`)
- `anchors` (clock, jitter applied)
- `layout` (measured text, prop slots)
- `channels`: `{ "body.squash":{"type":"track","t0":-P,"init":0,"keys":[[t,v,{f,z}]…]}, "body.squash.kicks":{"type":"impulses",…}, "face.eyeOpenL":…, "world.tension":{"type":"spline",…}, "cam.zoom":… }`
- `envelopes`, `blinks`, `looks`
- `props` (controller id + params)
- `particles` (seeded emitters)
- `text` (hook, resolution, name word, logo)
- `cues`
- `probes` (QA frames)
- `provenance` (move versions, asset hashes)

### Ledger
Append-only JSONL, one line per approve, reject or publish:

```json
{"id","batch","fingerprint","slots","copy","pHash","verdict","by","at","channel"}
```

## 4. Timeline and moves system

### 4.1 Beat clock
Clocks for 10/12/15/20 s come from `library/story-library.json` (`beatClocks`).

**Anchors:** COVER, ANTIC, GAG, IMPACT, HOOK_OUT, L1–L3 (plus L4 at 20 s), PEAK[a,b], TURN, RITUAL[a,b], OPEN, RESOLVE, LOGO, SETTLE, CARD_OUT, HOOK_IN.

**Sub-anchors:** moves publish their own (for example, R-BREATH publishes `inhale`, `crest`, `exhale`, `release`). Later moves can reference them; for example, the palette arc's warm bloom follows `ritual.release`.

**Seeded jitter:** ±80 ms on beats that are not frame-locked, applied *before* cues are emitted, so the sound always follows the picture.

**Breath period:** `D / round(D/3.8)`: 3.33 s at 10 s, 4.0 at 12, 3.75 at 15, 4.0 at 20.

### 4.2 Channel catalogue
Channels are typed. No roll or shake channel exists, so those effects cannot be authored at all.

| Group | Channels | Types |
|---|---|---|
| body | squash, inflate, lean, sway, shimmer, lift, **shrink, slide, sink, meltSkew** (new) | Track + Impulses + Hops + noise envelopes |
| face | canonical param set (§5.2), per-eye open, look, blinks | Track + Blinks + intent layer |
| glow | inner glow, rim modulation | Track |
| world | tension, agitation, warmth, clarity, transform p, ripples[], pulses[] (soft only) | Spline / list |
| camera | zoom, x, y, follow factor | Track (rate-limited) |
| props | controller instances (orbit, rise, lane, stack, fork, loom, cloud, light-shape) | code + params |
| particles | seeded emitters with shape, colour and life | list |
| text | hook, resolution or closer, name word, logo card | presets only (rise/fade) |

### 4.3 Move contract
These are code modules under `composer/moves/`.

```js
export default {
  id: 'G-FLOP', kind: 'gag', cost: { subframes: 'med', world: 'ripples' },
  requires: { ground: ['any'], caps: [] },
  span: { from: 'ANTIC', impactBy: 1.0, until: 'HOOK_OUT' },
  owns: { 'body.squash': ['ANTIC', 'HOOK_OUT'], 'body.inflate': ['GAG', 'IMPACT+1.2'] },   // ownership windows
  params: { depth: { def: 0.38, range: [0.25, 0.4] }, intensity: { def: 1, range: [0.4, 1] } },
  tuning: { noomi: { depth: 0.36, schlorp: 1.4 }, loomi: { depth: 0.3, schlorp: 1.9 } },   // per-Mallow cells
  cues: { flop_pre: {...}, flump: { loud: true }, schlorp: {...} },                        // owned cue names + recipes (§7)
  compile(ctx, A, p) {
    ctx.body('squash').key(A.GAG, -0.06, { f: 5, z: 0.7 }).key(A.IMPACT, 0.38 * p.depth / 0.38, { f: 9, z: 1 });
    ctx.body('squash').kick(A.IMPACT, 0.12, 2.4, 0.3);
    ctx.face.intent('deflated', A.IMPACT, { hold: 0.8 });
    ctx.world.ripple(A.IMPACT + 0.05, 0.5);
    ctx.cue(A.IMPACT, 'flump', { amp: 1 });
    ctx.publish('gag.end', A.IMPACT + 1.4);
  } };
```

### 4.4 Compile pipeline (`composer/compose.js`)
1. Load the template, pack, realm preset, clock(D) and tuning cells. Seed **namespaced PRNG streams** (`rng('blinks')`, `rng('orbit')`, …) so that changing one slot does not reshuffle the others.
2. **Layout pass** in the page. Measure copy with Fredoka, size props, choose orbit slots and safe positions. Fails if anything cannot fit.
3. **Moves in slot order:** cover-idle, gag, aftermath, metaphor, turn, ritual, open/resolve, close, loop, camera, palette arc. Each writes keys, intents, props, particles and cues into collectors.
4. **Personality pass** (§4.6). Expand intents to per-Mallow params, apply amp/tempo/lag where the move allows it, add signature channels, apply the eye gate.
5. **Acting pass:**
   - idle breath (integer cycles per loop);
   - seeded blinks, kept out of rest windows and impacts;
   - glances and look-at resolution: eyes follow prop controllers, which are pure functions importable by the composer;
   - micro-motion noise with envelopes that are zero at the seam.
6. **Build.** Per channel, **sort keys by t** and only then build the Track (fixes R5: `Track.to` captures `d` at insertion). Reject duplicate spline times. Impulses, shimmers, ripples and blinks merge by sum or max. Ownership-window overlaps are errors, not silent overwrites.
7. **Circular wrap** (§4.7).
8. **Validate** (§12, gate G-DIR). Emit `direction.json` and `cues.json`; curves come from dry evaluation at frame times, never from the render (fixes R12). Also write channel plot SVGs for authors.

### 4.5 v2 extracted as the first moves (verbatim numbers, times relative to anchors)

| v2 beat | Becomes |
|---|---|
| sleepBreath | `acting/idle-breath` (cover) |
| dreamFlinch + hypnicJolt | `G-JOLT` |
| aftermath (double blink, glances, pant, blush, wobbly mouth) | `acting/aftermath-startled` |
| thoughtPop ×3 + spiral | `M-ORBIT` (controller `orbit`, motes included) |
| squeezeRelease | `TURN-SQUEEZE` |
| breath + dissolve | `R-BREATH` |
| eyesOpenContent + endCard + slowBlink + driftToSleep | `close/content-card` |
| hookReturn | `LP-RETURN` |
| coldAt / warmAt / agitationAt | `A-COLD-DIP-WARM` |
| camAt / skyCamFor | `C-DRIFT-IN` |

### 4.6 Personality layer
- **Intents.** Moves write semantic face intents: neutral, sleepy, startle, shock, worried, cringe, guilty, sad, hurt, deflated, content, happy, proud, shy, excited, deadpan, focused.
  - `personality.js` maps each intent to canonical params per Mallow.
  - The mapping is seeded from the app's `expressions.js` PRESETS and per-Mallow overrides through an adapter, then overridden for video in the pack.
  - Noomi's map reproduces v2's explicit face tracks for T01.
- **Body scaling.** Defaults per pack:

| Mallow | amp | tempo | reactLag |
|---|---|---|---|
| Loomi | 0.6 | 0.8 | +0.12 s |
| Blubi | 0.9 | 0.95 | — |
| Boppo | 1.25 | 1.2 | −0.03 s |
| Pipzi | 1.2 | 1.25 | −0.04 s |
| Glitzi | 0.85 | 1.05 | — |
| Zuzu | 1.0 | 1.1 | — |

  These are only starting points: every cell's tuning table overrides them, and the impact is always clamped to land by 1.0 s.
- **Eye gate.** Noomi, Blubi and Loomi open their eyes only when intensity × eyeOpen ≥ gate.lo, and always start and end on the painted face.
- **Signature channels.** Derived automatically from the escalation intensity curve:
  - Zuzu: `spin` acts as a thought meter, capped at 1 turn/s with ramps ≥ 0.5 s.
  - Glitzi: `glitch` (displacement only, at most 1 burst per 2 s).
  - Pipzi: sparks.
  - Boppo: idle bounce.
  - Blubi: tears or wet eyes.
  - Loomi: under-reaction (lag and amp above).

### 4.7 Circular timeline with a movable seam
- The composition is built on the domain [−P, D−P). The runtime evaluates `t* = t ≥ D−P ? t−D : t`, so the loop seam sits at S = D−P instead of at frame 0.
  - LP-RETURN (v2): P = 0.
  - LP-RETRIGGER and LP-OBJECT: S is a quiet point before the retrigger, typically CARD_OUT + 0.1. The trigger then plays straight across frame 0.
- Validator rules at S:
  - all channels at rest;
  - impulses < 1e-3;
  - pristine-painting rest windows of at least 0.25 s on both sides of S;
  - the hook visible at full alpha on frame 0.
- World time terms use `uLoop = D` with periodic noise domains, fixing R6:
  - chop noise on a circle;
  - star twinkle frequencies quantised to k/D;
  - cloud drift as a periodic domain offset;
  - plate drift x = x0 + A·sin(2πkt/D).
- Audio is rendered circularly (§7).

### 4.8 Phase 2.1 core move set
Each move is hand-tuned on Noomi first.

| Kind | Moves | New engine needs |
|---|---|---|
| Gags (9) | JOLT, DOUBLETAKE, JELLYFREEZE, DEADPAN, SINK, DEFLATE, FLOP, CRINGE, MELT | `shrink`, `slide`, `sink` (waterline clip + meniscus ring, mouth-above-line check), `meltSkew` |
| Metaphors (8) | ORBIT, ECHO, STACK, CLOUD, GLOW, CLOCK, METER, WEEK | Glass Prop Kit (§4.9) |
| Turns (3) | TURN-SQUEEZE (v2), TURN-STOP (everything stops dead), TURN-SIGH | — |
| Rituals (9) | BREATH, SQUISH, CLOUDWRAP, COSY, FLOAT-AWAY, SAVOUR, STRETCH, DRIFT, RAINLIFT | soft-cloud front/back layers, particle shapes; every ritual ends by driving the realm transform `p` |
| Loops (4) | RETURN, RETRIGGER, OBJECT, CYCLE | circular timeline |
| Cameras (5) | DRIFT-IN, HOLD-WIDE, FOLLOW-SOFT, PULL-BACK, LOW-HERO | zoom 0.95–1.10, ≤ 0.04/s, roll ≡ 0 |
| Arcs (9) | all of the library's A-* arcs, as keyframes on the world dials | per-realm palette maps |

- **Later tiers:**
  - Tier B (Phase 2.2): FOG, NOISE/BUZZ rings, FARGLOW, FRAMES, COSYPILE, DOTS, TEARS, plus Blubi's G-SPLASHSIT.
  - Tier C (Phase 2.3+): TABS, FORK, LOOM, PEBBLES, JITTERS, SPOTLIGHT, LAUNCH, SPARKPOP, GLITCHSLIP, SPINUP, LANTERN, DEFRAG, SPIRALSLOW, SUNSOAK, NAMEIT, BOOP-SIZE, SETDOWN, WIGGLE.
- The planner treats any move without a tuned cell as unbuildable.

**Tuning workflow** (`hm cell <move> <mallow>`):
1. Render a 4–6 s draft **move test card**: the move in a neutral context, with a filmstrip and channel plots overlaid.
2. Tune the per-Mallow table.
3. Promote the cell to candidate.
4. The owner approves cells implicitly by approving review videos that use them.
5. Editing a move file changes its content hash, which demotes its cells to candidate.

### 4.9 Glass Prop Kit
These four primitives (plus light shapes) produce all eight Tier A metaphors.
- **GlassCard.** The v2 frosted card with text. Generalised to per-instance depth sorting (R17), hashed texture keys (R4) and a sepia "memory" skin.
- **GlassTile.** A rounded-rect glass tile with procedural vector content: clock face with hands, battery segments, week letters, simple chore glyphs. Never a real app UI.
- **GlassBlock.** A stackable glass block with a contact shadow and squash coupling to the Mallow (STACK).
- **SoftCloud.** A billow cloud baked once per shot at native resolution, using the app's `billowCloud` look ported into the studio. Animated by a shader warp, with front and back layers for wraps and soft drizzle streaks.
- **LightShape.** Spotlight cone, far glow and sun-drop, applied as world-light uniforms that ramp at least 0.3 s, never switched on hard.

Controllers place the props: `orbit`, `rise` (ECHO, METER), `stack`, `lane`, `loom`, `fork`. They are pure, deterministic, and importable by the composer so look-at targets and audio pans use the same positions.

## 5. Per-Mallow face style system

### 5.1 Structure (`engine/face/`)
- `styles/*` implements the interface
  `{ load(packFace, assets), neutral, caps, box(params), draw(ctx, params, light) → {dirtyRect, lidXform?}, restMatch }`.
- Mouth styles are pluggable (`mouths/*`).
- Shared components:
  - the tube renderer (v2's `sampleCubic` / `tubeOutline`, with every colour from data);
  - glow;
  - the procedural navy galaxy iris (v2) and a native-resolution iris sprite;
  - blush with **screen** blend in the pack colour;
  - tears;
  - catchlight from the realm's key-light direction (fixes the moon-upper-right assumption).
- `Face.box` is computed from the spec, including glow padding, brow lift and eye scale (R15).
- A missing `<id>-face.json` is a hard error, never a fallback to another coordinate space (R13).

### 5.2 Canonical parameters
The vocabulary is the app's PARAMS names plus `catchX/Y` and `mouthWavePhase`:
- eyeOpenL/R, eyeScale, irisScale, lookX/Y, lidTop/Bot, lidSlant, closedCurve, squint
- browY, browTilt, browAsym, browCurve, browAlpha
- mouthSmile, mouthOpen, mouthRound, mouthWide, mouthWave, mouthPout, mouthTremble (≤ 6 Hz), tongue
- blush, tears, wet, sparkle, heartEyes, cheekPuff
- glitch, spin, spinJitter, spiralHue

`face/adapters.js` maps v2 semantics (NEUTRAL closedCurve 1, blush 0 extra) and app PRESET semantics (closedCurve default 0.6, blush base 1) onto these. The Noomi path is bit-identical to v2 `face.js` when given v2 values.

### 5.3 Style per Mallow

| Mallow | Eye style | Mouth | Brows at rest | Asset difficulty | Face work | Phase | Owner decision |
|---|---|---|---|---|---|---|---|
| noomi | closed-tube | tube-line | expression only | done | parity only | 2.1 | D6: tongue (v2 `#ff8ab0` vs registry `#ff6f9c`) |
| loomi | closed-tube; tilt −22.75/−21.35; two-sided glow | tube-line + bright under-band | none (hi-res) | medium-hard | per-side glow, specular along t, under-band follows lower lip | 2.2 | D1: 2-arc or 4-arc |
| blubi | closed-tube; 5 strokes; tilt +8.2; cubic rest curves | tube-line + cyan screen under-glow | painted ∩, always visible | medium-high | visible brows (cached layer), tears and wet, tremble, brow lift coupled to eye open | 2.2 | D4: open-eye still |
| boppo | open-socket (native ~225 px iris sprite) | cavity/grin, heart tongue | painted maroon tubes | high | elliptical sclera, socket lighting on lid curves, lid-skin blink, closed-smile tube | 2.3 | D2, D4 |
| pipzi | open-socket ("galaxy-warm", pentagon catchlight) | cavity | painted | hard | as Boppo, plus asymmetric stars; no mirroring | 2.3 | D4 |
| zuzu | spiral (procedural phase field) | open-lip | expression only | hardest | per-pixel spiral, fixed highlights, analytic spin blur, socket halo | 2.4 | D3, D4 |
| glitzi | heavy-lid (pad UV shift via `lidXform`, iris built from art) | groove ribbon | the pads | different method | emission layer (glitch rows), lid-skin sprites, groove/cavity | 2.4 | D5 |

### 5.4 Performance and the rest crossfade
- **Cache.**
  - Quantised parameter keys: angles to 1/256, positions to 0.25 art px.
  - `mouthWavePhase` is dropped while mouthWave < 0.01.
  - Skip the redraw when rest ≥ 0.999.
  - Draw **once per frame** unless `subframes()` flags fast face motion (blinks, eye pops).
  - Upload only the dirty rect.
- **Glow.** 1/4-resolution offscreen blur instead of `ctx.filter`. Expected 257 → ~50 ms per redraw.
- **Optional GPU path.** An SDF tube shader is a later, optional work package. It is gated on rest-match, and is worth doing only if open-eye faces still exceed 60 ms per redraw.
- **Rest-match gate per style.** The procedural neutral face over the clean body, compared with the pristine art over the face box:
  - ΔE2000 mean ≤ 2 (Loomi ≤ 1.5), p95 ≤ 6;
  - centrelines within 1–2 px;
  - catchlight IoU ≥ 0.9 (open styles).
  - A style that fails does not ship. There is no "turn the crossfade off" fallback, because the loop must start and end on the painting.

## 6. Realm and world system

### 6.1 How far to extend the v2 world
Not one uber-shader. There are **three world families** sharing a GLSL library: noise, sky gradient, celestial disc and halo, cloud modes (stratus, billow, lenticular, mammatus), haze, plates. Static set pieces are **baked plates**.

**World module interface:**
```
{ init(gl, preset, plates), renderWorld(R, W, cam)   // once per frame
  renderReflection(R, S, sub) | null                  // only for reflective ground
  light(W) → {key, rim, ambient, dir}, contact(W) }
```
The light is derived from the preset, never authored per video.

- **lake** (v2 generalised): mirror water, reflection, ripples. Moonmilk Cove, Blue Drift, Raindrop Lagoon.
- **floor:** reflective hard floor with low fresnel, no swell, emissive markings. Static Storm, Spiral Observatory.
- **open:** no reflection; cloud-sea or grass/dais ground. Sunpop Orchard, Spark Festival.

**Plates**
- Set pieces (headland and lighthouse, islets, cushion hills, Ferris wheel, crystals, dome) are Canvas2D painters ported into `engine/worlds/plates/<realm>/` from the app's realm drawing code. The code is copied into the studio; the app is not modified.
- Each is painted once per shot at native resolution or 2× (never upscaled), uploaded, then tinted and relit by palette uniforms, parallaxed by depth, and mirrored in the water by sampling at mirrored UVs (cheap).
- Moving parts are pure-t transforms: islet drift, wheel rotation, lantern sway.

**Weather vocabulary** (per realm whitelist)
- clear, stratus density, scud (agitation), mist (haze), drizzle and rain (streaks that drive ripple rings), fireflies, dream bubbles, seed fluffs, far birds, glints, aurora ribbon (transform).
- **No lightning anywhere.** A "strike" pulse becomes a falling star or a soft shaft that ramps ≥ 150 ms.

**Lighting**
- `MESH_FS` takes the realm key (moon or sun direction), ambient, rim and SSS as uniforms.
- It still relights relative to the baked art lighting, so rest stays identity for every realm.
- Day realms raise ambient and use a sun key.
- Contrast fixes are preset data, checked by the figure-ground gate (§12):
  - Loomi blue-on-blue: golden bias, darker foreground water band, rim.
  - Boppo orange-on-apricot: green meadow, contact shade, cool rim.
  - Glitzi dark body: stage halo plus cyan rim.

**Realm-likeness reference** (`tools/realm-reference.mjs`)
- Imports the app realm module read-only, builds it at 1080×1920 with a hand-made `st` (fixed mood and `p`), and saves reference stills.
- QA compares our world render's 9×16 Lab grid with the reference at matching mood: mean ΔE ≤ 10 (warn), ≤ 14 (fail). This keeps every realm on-brand.

**Text styles per realm/time of day:** `night-moonlit` (v2 gradient plus ink shadow) and `day-ink` (deep ink fill, soft light halo, no outline). The readability gate checks them.

### 6.2 Per-realm plan

| Realm | Mallow | Family | Times of day | Phase | New work | Effort | World budget (final) |
|---|---|---|---|---|---|---|---|
| moonmilk-cove | noomi | lake | dusk, night, late-night, pre-dawn | 2.1 | time-of-day palettes; headland + slow lighthouse beam plate; far isle; aurora transform; fireflies; dream bubbles; mist | 4 ad | ≤ 0.25 s/frame |
| blue-drift | loomi | lake (day) | morning, midday, afternoon, golden | 2.2 | sun + halo; lenticular/cirrus mode; 5 islet plates; river-stone stage; cat's-paw gust shader; seed fluffs; birds; daylight relight | 4.5 ad | ≤ 0.30 |
| raindrop-lagoon | blubi | lake (blue hour) | blue-hour, dusk, rainy-evening, night, misty-morning | 2.2 | pastel cushion hills (shape/gradient param); pink haze band; lily pad + cushion stage plates; hanging beads as cheap refractive sprites in the world pass (not glass passes); rain → ripples; bead-to-light transform | 3.5 ad | ≤ 0.32 |
| spark-festival | pipzi | open | dusk, night | 2.3 | plum hill plates; Ferris wheel; tents/carousel with warm interiors; catenary lantern strings; sky lanterns; slow local fireworks (rise ≥ 0.45 s, fade over seconds); confetti; dais. Pond only if D7 says yes | 7 ad | ≤ 0.35 |
| sunpop-orchard | boppo | open (day) | morning, afternoon, golden | 2.3 | cloud-sea billow surface; sun + beams; floating island plates with swaying trees; meadow stage; bouncing fruit; rainbow transform; pollen | 7 ad | ≤ 0.35 |
| spiral-observatory | zuzu | floor | any (night interior) | 2.4 | dome plate; log-spiral galaxy (ghosted → crisp); armillary SDF rings; lens (glass shader); telescope/arcade plates; glyph dais; shutter reveal | 8 ad | ≤ 0.35 |
| static-storm | glitzi | floor | night, late-night, pre-dawn | 2.4 | mammatus deck; constellation lines; crystal plates; cracked-glass floor → gold mandala; shards; brightness-preserving row displacement | 8 ad | ≤ 0.35 |

## 7. Sound plan generalisation

**Three layers**, all reusing `audio/soundtrack.mjs`'s offline renderer, the engine bridge and mastering:
1. **Realm bed:** `buildRealm(realmId)`, automated by the world-dial curves.
2. **Mallow kit gestures:** `buildMallow(mallowId)` (fixes R8). Gestures include tap, surprise, comfort, yawn and celebrate at low intensity.
3. **Foley and motifs:** blip, bell, ping, noiseHit, air, tick, cricket, swirl, pad.

**Cue ownership**
- Every move declares its cue names and recipes. `audio/score.mjs` only translates cues into events.
- Validation: every emitted cue has a recipe, every recipe cue is emitted, and there are no fallback times (fixes R10).
- Recipes live in the move, with per-Mallow overrides in `library/sound/<mallow>.json`.

**Pitch:** all tonal events are written as scale degrees and octaves, transposed to the kit's root and scale (Noomi C5 pentatonic, Glitzi Bb4 minor pentatonic, Zuzu G4 Hirajoshi, …). Resolutions rise or arch; a check confirms the last three tonal events never fall.

**Layers derived from cues:** tick from `tick_start` to TURN; swirl per orbit prop with pans from the controller; tension hum from the tension curve (≤ −24 dBFS); warm pad from `ritual.start`; MO-CLOSE mandatory at OPEN and LOGO. Night layers (crickets) come from the realm/time-of-day sound preset.

**Single source:** the sleeping-breath audio uses the same exported `breathEnv` as the picture (fixes R11), and pan normalisation has one constant.

**Circular render:** render [−pre, D + 4 s] and wrap-add the tail onto the start, so reverb tails cross the seam and there is no tick (fixes R7). Seam check in §12.

**Mastering:** −16 LUFS ±0.5, true peak ≤ −1.5 dBTP (v2 −2).

**Remux:** `hm remux` re-scores onto an existing picture in about 5 s, using audio slots only (motif contour, tick tempo ±10%, pans).

**Parity:** `--compat v2-score` must reproduce v2's event list exactly. The fixes (R7, R11, the swirl start at `spin_up`) then land as separate reviewed commits, each with a before/after WAV.

## 8. Captions, copy and brand safety

**Copy source**
- Copy comes only from `library/story-library.json` pools.
- New copy is a library edit that must pass `validate-library.mjs`. No generated copy, no LLM in the loop, no paid APIs.

**Planner lint** (`planner/lint-copy.mjs`; the validator's rules plus final-string checks after wrapping and case transforms):
- Banned and caution lists (§6 of the library).
- Time word must agree with time of day.
- ALL CAPS hooks; lowercase `hushmallow`.
- Bubble wrap ≤ 2 lines × 17 characters.
- No two lines start with the same word; ≤ 2 question marks.
- Latin-1 only (the Fredoka subset, R16).
- No brand, app or song names (word list).
- Caution words need an explicit per-line whitelist entry.

**Layout:** exact measurement in the page (the planner pre-lints with `fredoka-metrics.json` plus a 4% margin).
- Hook auto-fits 76 → 50 px.
- Safe zones: key text inside x 60–1020, y 180–1250; nothing important at x > 900 with y 700–1500; nothing important below y 1500.

**Text motion:** only `TextBlock` (rise ≤ 24 px, fade) and `LogoCard` (uniform scale, alpha). Logo pixels are never touched.

**End card:** the template's resolution line *or* a brand closer (about 30%, never 3 in a row), then the logo plate and `hushmallow.com`.

**Readable-text budget:** at most 3 readable glass texts besides the captions. At 20 s, L1 dissolves before L4 appears.

**Machine-enforced brand rules**

| Rule | Enforced in |
|---|---|
| lowercase hushmallow, fixed URL | copy lint, overlay builder assert |
| logo never altered | LogoCard API; logo SSIM gate |
| no bouncing or shaking text | text API; G-DIR text-motion check |
| no strobe or flash | particle, pulse and glitch caps (G-DIR); flash gate (G-FINAL) |
| no breath-hold instructions | copy lint; R-BREATH constraints (inhale ≥ 1.2 s, crest ≤ 0.35 s, exhale ≥ 1.5× inhale) |
| no medical claims | banned/caution lists |
| no camera shake or roll | no channel exists; zoom range and rate limits |
| one Mallow in its own realm; approved assets only | spec gate; `assets-manifest.json` sha256 check; magnification log ≤ 1.0 |
| no humans, real brands, apps or songs | copy lint; prop kit contains no such content |

## 9. Seeded variation and uniqueness

**Seeds:** a 32-bit seed with namespaced streams. Jitter covers:
- beat timing ±80 ms (non-locked beats);
- blink placement, glance targets, orbit slots, mote and cloud seeds, star field phase;
- palette jitter on the world only: hue ±6°, warmth ±0.1, exposure ±0.05. The Mallow is never recoloured.

**Exact fingerprint:** sha256 of the canonical visible slots (template, Mallow, time of day, gag, metaphor, ritual, lines, hook, end text, camera, duration, seed).

**Slot distance:** two posts on one channel within 14 days must differ in ≥ 3 visible slots, one of which is the Mallow or the hook.

**Sequencing and cooldowns** (from the library rules, checked against `ledger/`):
- No repeat of template, Mallow, ritual or gag in consecutive posts.
- Each Mallow 1–3 times per 10 posts.
- ≥ 4 feeling families and ≥ 2 positive or mixed templates per 7 posts.
- Hook cooldown 90 days; thought line ≤ 3 uses per 30 days; resolution ≤ 1 per 7 days.
- The planner resamples up to 50 times, then reports which constraint blocked it.

**Perceptual duplicate check:** 2 fps keyframes → 64-bit pHash per frame → signature. Videos that are too close to anything in the 14-day ledger are rejected unless the spec declares an overlay or A/B variant.

**Capacity:** each unlocked template has 10^5–10^6 combinations. The 3-slot rule still leaves several hundred clearly distinct posts per Mallow and template group. The library is not the limit.

## 10. CLI and review gallery

```
hm lib validate                      # library, packs, moves, tuning matrix, asset manifest
hm plan --count 8 --mallows noomi --channel tiktok --seed 42 --out runs/2026-11-03-A [--review]
hm spec new --template T03 --mallow noomi --tod night --dur 12 --gag G-FLOP ... | hm spec show <id>
hm compile <spec|batch>              # page-side compile → direction.json, cues.json, plots; runs G-DIR
hm draft <spec|batch> [--workers 2]  # 0.5 scale, 1 sub-frame, ~2–3 min / 15 s; runs G-DRAFT
hm render <spec|batch> --quality final [--workers 2] [--resume]
hm score <id> | hm remux <id>
hm qa <id|batch> | hm qa golden      # full gates | v2 parity
hm cell <move> <mallow>              # move test card (draft) + channel plots
hm stills <id> --t 0,0.4,0.98,...    # full-res stills via the farm
hm gallery <batch>                   # static runs/<batch>/index.html
hm approve <id> | hm reject <id> --reason "..."   # ledger + tuning-cell status
hm export <id>                       # final.mp4 + caption.txt + metadata.json (no auto-posting)
hm derive <mallow> | hm asset-qa <mallow>
hm bench [--pass world|face|sub|readback]   # takes the exclusive CPU lock
hm status                            # queue, ETA, disk
```

**Gallery** (static HTML in the batch folder). For each video it shows:
- the preview MP4 (CRF 20), the spec table and QA badges with gate details;
- a contact sheet and filmstrips of the gag and ritual;
- the loop seam played twice;
- for T01-style videos, a side-by-side with approved v2;
- the copyable approve/reject commands and the AUDIT-v2 ten-question checklist.

Optionally the gallery can be published as a private claude.ai artifact, with preview MP4s (each ≤ 15 MB) as assets, if the owner wants to review remotely.

## 11. Rendering: batch, resume and performance

### 11.1 Farm (`render/farm.mjs`, `worker.mjs`)
- **Jobs** move through: compiled → drafted → final-queued → segments → encoded → scored → muxed → QA → review.
- **Segments:** 30 frames (1 s) each. Each worker owns one Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader` (R2), reloads the page per video (R4), and streams raw frames over a binary POST to a local Node sink that pipes into ffmpeg. Encoder settings:
  `libx264 -preset slow -crf 16 -x264-params keyint=30:min-keyint=30:scenecut=0:open-gop=0`, BT.709, yuv420p.
- **Concat:** `-f concat -c copy`.
- **Resume:** per-segment `.done` markers with frame hashes. A stale lock after 10 min is requeued; 2 retries, then the segment is marked failed. A watchdog fires if a frame takes over 60 s.
- **Curves** always come from the compile-time dry run (R12). There is no suffix routing (R3); the runtime is selected by `direction.meta.runtime`.
- **NaN guard:** non-finite `subframes()` falls back to 16 and logs an error (R18).
- **Resource classes:** `exclusive` (bench, golden), `heavy` (final worker ≈ 2–3 cores; asset derivation = 4 cores), `light` (compile, QA).
  - Maximum concurrency: 2 heavy render workers, or 1 derivation.
  - Two workers can split one video's segments, giving lower latency.
- **Memory:** about 2.5 GB per worker plus ffmpeg, which fits in 15 GB.
- **Disk:**
  - Frames are never stored.
  - Segments are deleted after mux; drafts are pruned 7 days after review.
  - Kept per final: about 60 MB (master 25–45 MB, preview about 10 MB, QA about 8 MB).
  - The farm warns below 5 GB free and refuses new jobs below 3 GB.

### 11.2 Performance plan
Measured today against the projection after WP-02. Savings come from the v2 code audit's per-pass measurements.

| Pass | v2 today | After WP-02 | How |
|---|---|---|---|
| Face redraw | 510 s (1991 × 257 ms) | ~26 s (~520 × 50 ms) | cache, once per frame, 1/4-res glow |
| Face upload | 36 s | ~4 s | redraw-only, dirty rect |
| Sub-frame GPU | 500 s (1991 × ~250 ms) | ~210 s (1490 × 140 ms) | transparent foreground buffer + single composite, scissor the reflection and accumulate passes, adaptive floor 1, 48² reflection mesh at 1/4 res, precomputed mesh normals |
| World | 270 s (0.6 s) | ~115 s (0.25 s) | branch moon fbm, hills and haze; water samples a sky texture |
| Bloom + post | 77 s | ~70 s | — |
| Readback + transfer | 180 s (404 ms) | ~25 s | binary POST (later: GPU yuv420p pass) |
| Overlay | 6 s | ~2 s | skipped when empty |
| **Total per 15 s** | **~1580 s (26 min)** | **~450–480 s (7.5–8 min)** | |

**Budgets**
- Final: ≤ 9 min per 15 s; alarm at 12; hard investigate at 15. New realms may add up to 0.1 s/frame of world time; open-eye faces up to 75 ms per redraw. That leaves an estimated 8.5 min.
- A 20 s video costs about ×1.33.
- Draft: 0.5 render scale, 1 sub-frame, face once per frame without glow, 3-octave world without clouds, no 1/8 bloom, x264 veryfast. About 0.3 s/frame, i.e. 2–2.5 min per 15 s.
- Throughput with 2 workers: +15–30% from the remaining idle CPU, so about 6.5 min effective per 15 s final, about 8 finals per hour. Planning figure: **60–80 accepted videos per day**, after drafts, about 25% QA or owner rejects, and QA compute (under 1 min per video).
- If WP-02 misses its targets, the current path still gives about 55 per day. Nothing in the content plan depends on the optimisations.

**Not in Phase 2 core:** a clean-plate plus overlay split for cheap hook A/B variants (about 0.2 s/frame per extra variant). It is a later operations work package; thought lines inside glass can never be swapped this way.

## 12. Automated QA gates
Hard **fail** unless marked *warn*.

**G-SPEC (pre-compile, milliseconds)**
- schema valid; slots legal;
- tuning cells `approved` (production) or ≥ `candidate` (review batches);
- copy lint clean; time word matches time of day; ritual minimum ≤ ritual window;
- fingerprint unseen; slot distance; sequencing and cooldowns;
- assets in the manifest with matching hashes; app tree hash unchanged.

**G-DIR (compile, under 3 s in Node)**
- *Structure:* keys monotonic; no duplicate spline times; no ownership overlaps.
- *Loop closure:* every channel, world uniform and prop state satisfies |x(D⁻)−x(0)| ≤ 1e-3 normalised and |Δx'| ≤ 0.02/s; impulses < 1e-3 at the seam; rest windows ≥ 0.25 s around the seam; hook alpha 1 at frame 0.
- *Deformation:* SoftBody evaluated at 240 Hz (about 2 s) keeps height ≥ 0.6, stretch ≤ 1.3 and shrink ≥ 0.6 of rest; the SINK mouth stays above the waterline.
- *Camera:* zoom 0.95–1.10; |dz/dt| ≤ 0.04/s; pan ≤ 40 px/s; roll ≡ 0.
- *Text:* ≤ 3 readable glass texts at once; each readable text has a window of ≥ 1.2 s with alpha ≥ 0.9 and screen speed ≤ 150 px/s; captions only rise and fade.
- *Safety:*
  - R-BREATH: inhale ≥ 1.2 s, crest ≤ 0.35 s, exhale ≥ 1.5 × inhale;
  - spin ≤ 1 turn/s (0.3 in close-up) with ramps ≥ 0.5 s;
  - glitch ≤ 1 burst per 2 s;
  - twinkle ≤ ±15% with period ≥ 1.5 s;
  - pulse ramps ≥ 150 ms;
  - exposure change ≤ 12%, ramped ≥ 0.5 s.
- *Craft:*
  - gag impact (peak body-DOF velocity) between 0.25 and 1.0 s;
  - longest "dead" interval outside rest windows and end card ≤ 1.2 s;
  - C1 continuity except at declared kicks;
  - Noomi, Blubi and Loomi respect the eye gate.
- *Audio linkage:* every cue has a recipe; no absolute-time layers.

**G-DRAFT (draft frames, about 20 s)**
- Text boxes inside the safe zones.
- Mallow silhouette inside 24 px margins.
- Props cover ≤ 15% of the Mallow and ≤ 5% of the face box. Declared wraps must keep the face ≥ 95% visible.
- Text contrast ≥ 4.5:1: glyph fill against the p10 luminance of a dilated background ring.

**G-FINAL picture**
- *Delivery:* generalised `verify.mjs` checks frames = D×30, duration, codec, faststart, zero decode errors, AAC 48 kHz stereo and freshness.
- *Flash and strobe* on linear relative luminance over a 34×60 block grid:
  - any transition of ≥ 10% over ≥ 25% of the frame (with the darker state < 0.8) counts as a flash; brand allows **0**;
  - saturated-red transitions by the same rule: 0;
  - for Zuzu, a moving stripe pattern covering > 25% of the frame with > 5 pairs fails.
  - The threshold is calibrated so that approved v2 passes.
- *Loop seam:* mean |Δ| from frame N−1 to frame 0 ≤ max(1.15 × median consecutive |Δ| over quiet frames, p90 of all consecutive |Δ|). Also checked separately inside the face box.
- *Character fidelity:*
  - Rest probes (8 extra frames: Mallow only, identity post) against the pristine art under the same transform: ΔE2000 mean ≤ 1.0, p99 ≤ 4, silhouette IoU ≥ 0.985.
  - Rest-fade spike: maximum consecutive face-box |Δ| inside the fade windows ≤ 1.5 × the median of the surrounding second.
  - Magnification log: maximum ≤ 1.0 screen px per art px.
  - Grade guard on the body mask against pristine: hue shift ≤ 10°, chroma ratio 0.8–1.2, lightness ratio 0.7–1.35.
- *Figure-ground:* ΔE between body and a 40 px surrounding ring ≥ 8 (fail) or ≥ 12 (warn), calibrated on v2.
- *Realm likeness* against the app reference (§6.1).
- *Logo:* at full alpha, SSIM ≥ 0.995 against a reference LogoCard probe rendered with the same post.
- *Duplicates:* pHash distance from the ledger.

**G-AUDIO**
- −16 ±0.5 LUFS; true peak ≤ −1.5 dBTP; LRA ≤ 10 LU.
- Loud-cue onsets within ±20 ms; quiet cues within ±45 ms.
- Seam step < −60 dBFS, and the 10 ms RMS at the seam within ±3 dB of its neighbours.
- No gap longer than 1 s below −50 LUFS momentary.
- Tension hum ≤ −24 dBFS.

**Asset gates (once per Mallow)**
- Zero difference outside the edit mask; alpha identical; same seed gives identical hashes.
- Texture energy inside versus outside 0.85–1.15 per band and per channel; repeat-patch NCC ≤ 0.95; ghost-detector correlation < 0.05.
- Cheek refit within ±1 px.
- Style rest-match (§5.4).
- Owner sign-off stills.
- Regenerating Noomi through the refactored derivation gives byte-identical files.

**Review:** the owner, via the gallery. Approval writes the ledger and promotes the cells, face style and realm/time-of-day preset used.

## 13. Testing
- **Unit** (`node --test`, about 30 s):
  - motion primitives; channel sort and merge; clocks; circular wrap;
  - PRNG stream independence; fingerprint stability;
  - copy lint with seeded bad fixtures (the six the library validator already rejects, plus new ones);
  - sound-map coverage; prop controllers.
- **Parity** (about 1 min): frozen v2 module against composer runtime in one page.
  - Numeric state equal within 1e-9 at all 450 frame times and all 1991 sub-frame times.
  - Mesh buffers and face-param snapshots equal.
  - `cues.json` and curves equal.
- **Golden pixels:**
  - 24 PNG frames rendered from frozen `stage2` at `9a16084d9477`.
  - Engine in legacy mode must be bit-identical.
  - Optimised mode: PSNR ≥ 45 dB full frame, face-box SSIM ≥ 0.995, and `rest-test` diff ≤ today's.
- **Determinism:** the same frame rendered twice, out of order, and in parallel segments gives identical hashes. Segmented MP4 against a single pass: decoded PSNR ≥ 60 dB. The offline audio render is hash-stable.
- **Nightly smoke:** a 1 s draft of every candidate or approved cell; the QA suite on fixtures (strobe clip, broken seam, text outside the safe zone, upscaled asset, recoloured body, clipped audio, duplicated video); each must fail the right gate.

## 14. Documentation
Under `docs/`:

| File | Contents |
|---|---|
| ARCHITECTURE | pipeline, state contract v3, file ownership |
| MOVES | authoring and tuning a move, cue ownership, test cards |
| FACE-STYLES | parameter vocabulary, style interface, rest-match |
| REALMS | presets, plates, loop safety, budgets |
| SOUND | recipes, transposition, circular render |
| QA | every gate, threshold and fixture |
| RUNBOOK | batches, resume, disk, failures |
| OWNER-DECISIONS | D1–D10 with status |
| BRAND-RULES | the machine-enforced table |
| CHANGELOG | approved versions of moves, styles and realms |

The README is updated from "Phase 1 only".

## 15. Build plan
Effort is in agent-days (ad) of focused work.

**Isolation rules**
- One git worktree per work package.
- One owner at a time for `engine/renderer/*`, `engine/softbody.js` and `engine/face/*`.
- Benchmarks, golden runs and asset derivation take the exclusive CPU lock.
- The channel catalogue, state contract v3, face-param vocabulary and prop-controller interface are frozen at the end of WP-03.

### Phase 2.0 Foundations
Milestone **M0**: the generator reproduces v2 in ≤ 9 min.

**WP-00 Freeze and goldens** — 0.5 ad, about 0.3 h compute; first, exclusive.
- *Goal:* tag the frozen reference, render golden frames, set up the parity skeleton, commit the story library.
- *Files:* `qa/golden/`, `tests/parity/`, `library/story-library.json` (moved from `templates/`, which is currently untracked), git tag.
- *Acceptance:*
  - golden PNGs plus hashes stored;
  - `git diff main -- hushmallow/` empty check exists;
  - library validator still at 0 errors.

**WP-01 Engine fork and farm core** — 3 ad. Depends on WP-00.
- *Files:* `engine/` (copy of stage2), `render/{farm,worker,segment,encode,mux}.mjs`, `cli/hm.mjs` (render, status).
- *Scope:*
  - W, H and render scale as parameters; SwiftShader flags;
  - binary readback; page reload per video; `dispose`; hashed texture keys;
  - NaN guard; curves from the dry run; no v1 import.
- *Acceptance:*
  - legacy-mode frames bit-identical to goldens;
  - segmented render plus concat decodes at PSNR ≥ 60 dB against a single pass;
  - kill and resume loses ≤ 1 segment;
  - fixes R2, R3, R4, R12, R18, R19.

**WP-02 Performance pass** — 5 ad. Depends on WP-01. Needs the exclusive CPU for benchmarks.
- *Files:* `engine/renderer/*`, `engine/face/{tube,glow}.js`, `engine/stage.js`.
- *Acceptance:*
  - v2 final ≤ 9 min on one worker (measured by `hm bench`, recorded per pass);
  - golden PSNR ≥ 45 dB, face SSIM ≥ 0.995, rest-test diff ≤ baseline;
  - seam and flash gates unchanged;
  - fixes R1, R14 (roll assert), R21.

**WP-03 Composer core and v2 as data** — 5 ad. Depends on WP-00. Runs in parallel with WP-01 and WP-02 (`composer/` only); integrates the runtime at the end.
- *Files:* `composer/*`, `composer/moves/{G-JOLT,M-ORBIT,TURN-SQUEEZE,R-BREATH,close/content-card,LP-RETURN,C-DRIFT-IN,A-COLD-DIP-WARM}`, `engine/runtime/direction-runtime.js`, `library/mallows/noomi.json`, `library/realms/moonmilk-cove.json` (late-night only).
- *Acceptance:*
  - state, cue and curve parity at 1e-9;
  - render through the composer bit-identical to the WP-01 legacy render;
  - fixes R5, R11 (picture side);
  - interfaces frozen.

**WP-04 Score generaliser** — 3 ad. Depends on WP-03 (cue ownership). Parallel with WP-02.
- *Files:* `audio/score.mjs`, `audio/layers/*`, `library/sound/*`, `audio/soundtrack.mjs` (transposition, circular render).
- *Acceptance:*
  - `--compat v2-score` reproduces v2's event list exactly;
  - the fixed default passes the G-AUDIO gates, including the seam;
  - every Mallow id builds its own kit and bed;
  - fixes R7, R8, R10, R11.

**WP-05 QA suite v1 and gallery v1** — 4 ad. Can start immediately on the approved MP4; parallel.
- *Files:* `qa/*`, `gallery/build.mjs`.
- *Acceptance:*
  - approved v2 passes every gate;
  - each fixture fails exactly its gate;
  - QA under 1 min per video;
  - fixes R16 (frame side), R22.

**WP-06 Planner, ledger and CLI** — 2.5 ad. Parallel.
- *Files:* `planner/*`, `ledger/`, `tools/font-metrics.mjs`, the `cli/hm.mjs` plan/spec/approve commands.
- *Acceptance:*
  - 500 planned specs with zero rule violations;
  - bad copy fixtures rejected;
  - deterministic for a given seed.

Critical path to M0: WP-00 → WP-01 → WP-02, plus WP-03 integration. About 10 working days with 3 agents in parallel.

### Phase 2.1 Noomi generator
Milestone **M1**: Review Batch A.

| WP | Goal | Depends | Acceptance | Effort | Parallel / isolation |
|---|---|---|---|---|---|
| WP-07 Face unification | canonical params, adapters, data-driven closed-tube, tears/pout/tremble/browAsym, screen blush, key-light catchlights, spec-derived box | WP-02 (same files) | Noomi parity (golden SSIM ≥ 0.995, rest-test ≤ baseline); expression contact sheet; fixes R9, R13, R15 | 3 ad | owns `engine/face/*` |
| WP-08 SoftBody DOFs | shrink, slide, sink (waterline clip, meniscus, mouth constraint), meltSkew; limits evaluator | WP-01 | deformation gate on synthetic sweeps; reflection and contact follow slide and sink | 3 ad | owns `softbody.js` + mesh shader |
| WP-09 Glass Prop Kit + particle shapes | card/tile/block/cloud/light shapes; star4, heart, droplet, ring, z; per-instance sort | WP-01 | each primitive under 25 ms per sub-frame at 3 instances; no flash; text crisp at 1:1 | 5 ad | owns `engine/props/*`, glass/cloud passes |
| WP-10a Gags | 9 gags tuned on Noomi | WP-03, WP-08 | approved-candidate test cards; impact ≤ 1.0 s; G-DIR clean | 5 ad | `composer/moves/gags` |
| WP-10b Metaphors | 8 Tier A metaphors | WP-03, WP-09 | test cards; text readability windows | 6 ad | `composer/moves/metaphors` |
| WP-10c Rituals, turns, loops, cameras, acting | 9 rituals, 3 turns, 3 new loops, 5 cameras, 9 arcs, acting layer | WP-03, WP-08, WP-09 | breath safety rules; seam gates for each loop strategy | 6 ad | `composer/moves/{rituals,turns,loops,cameras,arcs}`, `acting.js` |
| WP-11 Moonmilk expansion | 4 times of day, mood maps, plates (headland/lighthouse, far isle), aurora transform, fireflies, dream bubbles; periodic world terms | WP-02 | world ≤ 0.25 s/frame; realm likeness ≤ 10 ΔE; seam gate at 10/12/15/20 s; fixes R6 | 4 ad | owns `engine/worlds/lake.js` |
| WP-12 Batch A | plan, draft, tune, render, QA, gallery | all above | 8 videos pass every gate; gallery delivered | 2 ad + ~2 h compute | exclusive farm time |

### Phase 2.2 Loomi, Blubi and the lake family
Milestone **M2**: Batch B.

| WP | Goal | Depends | Acceptance | Effort | Parallel / isolation |
|---|---|---|---|---|---|
| WP-13 Derivation refactor + Loomi + Blubi assets | `tools/derive/common.py` plus per-Mallow configs; fixes from the asset reports (multi-channel glow fit, clipped channels, cheek layer, per-side masks, pedestals) | WP-00 (**can start in week 1**); Loomi blocked by D1 | Noomi byte-identical; all asset gates; owner stills | 6 ad, 1–2 h CPU | 4-core jobs only off render hours |
| WP-14 Blue Drift + Raindrop Lagoon | daylight relight, sun, islets, river stone, lagoon hills, pads, beads, rain; text style tokens; contrast presets | WP-11 | budgets (§6.2); likeness; figure-ground ≥ 12 | 8 ad | owns `worlds/lake.js` after WP-11 |
| WP-15 Closed-tube for Blubi and Loomi | 5-stroke visible brows, cubic rest curves, two-sided glow, under-bands, tears | WP-07, WP-13 | rest-match ΔE ≤ 2 (Loomi ≤ 1.5); expression sheets; no brow/eye collision | 4 ad | owns `face/*` |
| WP-16 Personality and tuning cells | profiles; cells for Loomi and Blubi across core moves; Blubi G-SPLASHSIT; kits verified | WP-10*, WP-14, WP-15 | ≥ 70% of core cells per Mallow at candidate | 6 ad | `moves/*` tuning tables only |
| WP-17 Tier B metaphors | FOG, NOISE/BUZZ, FARGLOW, FRAMES, COSYPILE, DOTS, TEARS | WP-09 | test cards; G-DIR clean | 6 ad | parallel with WP-14–16 |
| WP-18 Batch B | 10 videos | above | all gates pass | 2 ad + ~3 h | farm |

### Later phases
- **Phase 2.3, Boppo and Pipzi** (about 38 ad). Blocked by D2 and D4.
  - Assets: 10 ad.
  - Open-socket style and cavity mouth: 6 ad.
  - Sunpop Orchard and Spark Festival: 14 ad.
  - Tuning plus Tier C moves LAUNCH and SPARKPOP: 6 ad.
  - Batch C: 2 ad.
- **Phase 2.4, Zuzu and Glitzi** (about 48 ad). Blocked by D3 and D5.
  - Assets: 12 ad.
  - Spiral style, heavy-lid style and emission layer: 10 ad.
  - Spiral Observatory and Static Storm: 16 ad.
  - Tuning plus SPINUP, GLITCHSLIP, SPIRALSLOW and DEFRAG: 8 ad.
  - Batch D: 2 ad.
- **WP-29, operations extras** (5–8 ad, optional): clean-plate and overlay variants; GPU face if needed.

**Calendar** with 3 agents in parallel plus owner turnaround: M0 about 2 weeks; M1 about +3 weeks; M2 about +3 weeks; M3 about +4–5 weeks; M4 about +5–6 weeks.

## 16. Sample batch for owner review
**Batch A**: all Noomi in Moonmilk Cove, rendered after M1.

| # | Template | Dur | Time of day | Gag | Metaphor | Ritual | Loop | Arc | What it proves |
|---|---|---|---|---|---|---|---|---|---|
| A1 | T01 Brain at 2 AM (reference) | 15 | late-night | JOLT | ORBIT | BREATH | RETURN | COLD-DIP-WARM | the generator equals approved v2 (shown side by side, PSNR reported) |
| A2 | T01 variant ("LIGHTS OFF. BRAIN ON.", pooled lines) | 15 | night | JELLYFREEZE | ECHO | CLOUDWRAP | RETURN | COLD-DIP-WARM | same template, new performance |
| A3 | T03 Social Battery | 12 | night | FLOP | METER | COSY | RETRIGGER | GREY-CLEAR | 12 s clock, glass tiles, movable seam |
| A4 | T16 Alarm vs Me | 10 | pre-dawn | SINK | CLOCK | STRETCH | CYCLE | PREDAWN-SUNRISE | 10 s clock, waterline sink, new time of day |
| A5 | T09 Rejection Sting (gag ≤ 0.6) | 15 | dusk | DEFLATE | CLOUD | RAINLIFT | OBJECT | GREY-CLEAR | gentle tone, soft cloud, particles |
| A6 | T27 They Remembered | 10 | night | MELT | GLOW | SAVOUR | RETURN | BRIGHT-GLOW | positive template, glow without flashes |
| A7 | T26 Nostalgia | 20 | late-night | DOUBLETAKE | ORBIT (memory skin) | FLOAT-AWAY | OBJECT | DIM-SOFT | 20 s clock, 4 lines with ≤ 3 visible at once |
| A8 | T02 Sunday Scaries | 15 | dusk | DEADPAN | WEEK | BREATH | CYCLE | DUSK-DIP-GOLD | dusk palette, tiles, understated comedy |

- **Coverage:** all 9 core gags, 7 of 8 metaphors (STACK comes in Batch B), 7 of 9 rituals, 4 loops, all 4 durations, all 4 Moonmilk times of day.
- **Compute:** 112 s of video ≈ 70 min final on one worker, plus about 20 min of drafts and QA. About 2 h with re-renders.
- **Optional extra:** a 30 s "Noomi move reel" at final quality (about 18 min) with the new gags and rituals in isolation, for fast cell sign-off.

**Batch B** (after M2), 10 videos:
- Loomi:
  - T12: afternoon, MELT / CLOCK / DRIFT.
  - T17: golden, DEADPAN / GLOW / SAVOUR.
  - T03: morning, DEFLATE / METER / DRIFT.
  - T07: afternoon, DEADPAN / STACK / SQUISH.
- Blubi:
  - T04: rainy-evening, CRINGE / ECHO / SQUISH.
  - T13: blue-hour, DOUBLETAKE / STACK / BREATH, 12 s.
  - T28: night, SPLASHSIT / CLOUD / RAINLIFT (tears).
  - T23: misty-morning, JELLYFREEZE / GLOW / SAVOUR, 10 s.
- Noomi:
  - T22: night, FLOP / ORBIT / DRIFT.
  - T14: FOG / CLOUDWRAP.
- About 140 s of video ≈ 90 min final.

## 17. Owner decisions and risks

**Decisions needed**
- **D1 Loomi:** the hi-res 2-arc face (my default) or the app's 4-arc face. Blocks Loomi assets.
- **D2 Boppo:** the hi-res grin with heart tongue as canonical. Blocks Boppo.
- **D3 Zuzu:**
  - hi-res proportions as canonical;
  - closed-mouth and closed-eye looks;
  - fixed highlights while the spiral turns;
  - replace the rainbow hue with a cyan/magenta shift.
- **D4 Invented looks** to sign off as stills: closed eyes for Boppo, Pipzi and Zuzu; open eyes for Blubi and Loomi.
- **D5 Glitzi:** the invented top of the eyeball when the lids lift (start at ≤ 28 px); glitch styling.
- **D6 Noomi tongue:** keep v2's `#ff8ab0` (needed for parity) or switch to the registry's `#ff6f9c`.
- **D7 Set pieces not in the app realms:** for example a Spark Festival pond. Default no.
- **D8:** 4-line 20 s variants allowed.
- **D9:** review cadence, and whether approving a video also approves its cells. Proposed: yes.
- **D10:** remote gallery via a private artifact, or local files only.

**Risks and mitigations**
- *Performance projection slips.* The content plan does not depend on it; the current ~55/day is enough for review volume.
- *SwiftShader deprecation (R2).* Explicit flags and a pinned Playwright 1.56.1; record the Chromium build in provenance.
- *Open-eye asset quality (Boppo, Pipzi, Zuzu).* Strict asset gates plus owner stills. Fallback: narrow the expression range so less invented skin shows (fewer blinks, smaller mouth closures), not a lower bar.
- *Quality drift as combinations grow.* The tuning matrix, the gates, and monthly regression renders of A1 and the approved batches.
- *Tone risk on gentle templates* (T09, T14, T26). Intensity caps in the template data, plus review.
- *Disk at 26 GB.* Retention rules and the farm's disk guard.
- *Parallel agents colliding.* Worktrees, file ownership, frozen interfaces after WP-03, and the exclusive CPU lock.

Nothing was modified in either tree while writing this design. The paths it refers to are under `/home/user/thinkstill-rituals/hushmallow-infinite-studio`: `templates/story-library.json`, `output/v2/render.log` and `output/v2/verify.json`, `stage2/`, `videos/my-brain-at-2am-v2.js`, `audio/soundtrack.mjs` and `render/verify.mjs`; and under `/home/user/thinkstill-rituals/hushmallow`: `src/world/realm.js` and `src/world/realms/`.