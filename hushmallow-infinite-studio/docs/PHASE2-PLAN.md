# Hushmallow Infinite Studio — Phase 2 build plan

_Synthesised by a design workflow: 9 mapping reports (v2 code audit, Mallow profiles, six per-Mallow hi-res asset plans, story-template research) → 3 independent designs (quality-first, variety-at-scale, ship-incrementally) → 3 judges → this synthesis. Sources in `docs/design/`. Machine-readable version: `docs/PHASE2-PLAN.json`._

## Summary

FINAL BUILD PLAN: Hushmallow Infinite Studio, Phase 2

The base is quality-first, the top-scoring design (8.4 and 8.35 from two judges). It supplies the architecture and the quality machinery:
- v2 frozen, plus parity to 1e-9.
- A tuning matrix with one cell per (move x Mallow) pair.
- Typed channels with ownership windows. There is no roll or shake channel, so those effects cannot be authored at all.
- A circular timeline with a movable loop seam.
- Gates ordered from cheapest to most expensive: spec, then compile, then ~2.5 min draft, then final.
- Zero brand flashes.
- Rest-match with no 'turn the crossfade off' fallback.
- A realm-likeness gate against the app's own realms.

On top of that:
- From ship-incrementally (staging and safety rails):
  - The first owner gate with new content comes at about week 5, not week 9.
  - Guard tests.
  - Every loaded asset is checked against a hash allowlist.
  - A DRAFT/INTERNAL mark is burned into renders that are not for publishing.
  - SwiftShader determinism is measured before anything depends on it.
  - M0 performance is accepted at 12 min or less, with 9 min as the stretch target.
  - Each optimisation is its own commit with its own PSNR gate.
  - Prop-sheet checkpoint and a checkpoint per Mallow.
  - A library smoke test.
  - Opaque-ground worlds.
  - A magnification assert.
- From variety-scale-first (variety engine):
  - Each cell stores owner-approved parameter ranges. Seeds sample inside them with a Beta(3,3) bias toward the default, and each range is reviewed at min, default and max.
  - Pose contracts, bridge moves, and review sheets for move junctions.
  - Least-recently-used weighting, copy reservations, a semantic hook cooldown and a grief-pairing rule.
  - The cover frame (the feed thumbnail) is checked against the last 30 posts, and the 'feels the same' thresholds are fitted to owner ratings.
  - Weather and dressing slots, taken only from the app's own realm content.
  - A pre-render cost gate and property tests.

MILESTONES (3–4 agent streams; the 4 CPU cores are shared through a heavy-job lock):

| Milestone | Weeks | What it delivers |
|---|---|---|
| M0 Foundations | 1–3 | Parity with approved v2, a fast segmented render farm, the score generaliser, QA, the planner, and the derivation refactor |
| M1 First new Noomi content | 4–5 | T01 variants, T26 and T22; 6 finals |
| M2 Noomi at depth, production start | 6–9 | Tier A moves, all of Moonmilk Cove, the variety engine; 11 Noomi templates |
| M3 Lake family: Blubi + Loomi | ~8–13 | 22 templates, 3 Mallows |
| M4 Open-socket family: Boppo + Pipzi | ~12–18 | All 28 templates playable |
| M5 Zuzu + Glitzi | ~17–23 | All 7 Mallows |

Asset derivation is its own Python stream from week 1, so face assets never block a wave.

CONFLICTS RESOLVED
1. **Noomi colours.** Approved v2 wins: source-over blush rgba(255,110,200) x 0.42, tongue #ff8ab0. I checked both values in stage2/face.js. Registry colours apply only to the other six Mallows. quality-first's noomi.json, which said '#ff7ff0 screen', is corrected.
2. **Cell approval.** Approving a video no longer approves its cells (quality-first's D9 is dropped). A cell becomes approved only when it compiles clean through the compile-time checks (G-DIR) and the owner ticks its min/default/max extremes sheet. An approved video counts as evidence. Review batches may use candidate cells; production may use approved cells only. A cell's version is the hash of its compiled output on fixed fixtures, not of its source text, so a refactor that changes nothing does not demote cells.
3. **Moonmilk set pieces.** The headland, lighthouse, aurora, pearly shore, shells and pearls, fireflies and dream bubbles are all in hushmallow/src/world/realms/moonmilk-cove.js (checked). They are approved designs, so ship-incrementally's D10 flag is dropped. Set pieces that really are new (for example a pond for Pipzi) stay out.
4. **Rest-match failure.** There is never a 'crossfade off' or 'restWindow none' fallback. The only fallbacks are a better derivation or a narrower expression range.
5. **Flash gate.** Zero flashes allowed: any change of 10% or more over 25% or more of the frame counts, calibrated so v2 passes. The WCAG count runs as an extra check only.
6. **Rejection reason codes.** They flag cells for re-tuning. They do not automatically down-weight slot combinations; the only automatic effect is a bounded 'sameness' penalty with a floor and a decay.
7. **Encoding and storage.** The CRF 16 master stays. Disk is handled by retention rules, with the spec plus engine SHA as the archive. Clean-plate caption variants are an optional later work package, composited before grain to keep v2's order.
8. **No generated copy.** No post.json captions or hashtags. The export writes caption.txt only from library strings plus a hashtag list the owner curates.
9. **Rollout order.** Vertical slices: each wave brings faces and realms together, rather than all faces first. Blubi derivation starts during M1.
10. **Small choices.** Segments are 90 frames. The story library stays in templates/ so the validator's paths keep working; packs live in library/.
11. **Throughput.** Planned at a ceiling of 60–80 accepted videos a day; the real limit is owner review. If the performance work misses, the content plan still holds at about 55 a day.

Three questions are left for the owner (see open_questions_for_owner). Everything else has a stated default, logged in docs/OWNER-DECISIONS.md. Invented looks are signed off as stills at each Mallow's checkpoint.

## Architecture

PIPELINE (one direction; everything is deterministic)
1. Inputs: templates/story-library.json (copy and structure, unchanged and validated) and library/ (Mallow packs, realm presets, sound maps, brand.json, tuning-matrix.json, assets-manifest.json).
2. planner/ produces spec.json, then G-SPEC runs. The planner:
   - only picks moves, Mallows and realms whose cells, packs and presets are approved (needs/provides capability gating);
   - samples with seeded weights and least-recently-used freshness;
   - checks ledger cooldowns, copy reservations, fingerprint and slot distance.
3. The composer turns spec.json into direction.json, cues.json and curves, then G-DIR and G-COST run. The composer is pure ESM. It runs inside the render page, so layout uses real Fredoka measurements, and also in Node with a font-metrics shim for tests.
4. The engine renders direction.json to frames, then G-DRAFT runs. The engine is headless Chromium with WebGL2 on SwiftShader.
5. Frames go to ffmpeg as 90-frame segments, which are concatenated into video.mp4.
6. In parallel, audio/score.mjs renders score.wav from the dry-run cues and curves.
7. mux → final.mp4 + preview.mp4 → G-FINAL and G-AUDIO → gallery → owner decisions (with reason codes) → ledger and tuning matrix.

COMPOSER STAGES (composer/compose.js)
1. Load the template, pack, realm preset, beat clock(D), tuning cells and recipe hook (composer/recipes/Txx.js, optional, 50 lines or fewer). Seed named random streams.
2. Layout: measure copy, auto-fit the hook from 76 down to 50 px, size the props, choose orbit and prop slots inside the safe zones.
3. Run moves in slot order: cover-idle, gag, aftermath, metaphor, turn, ritual, open/resolve, close, loop, camera, arc, weather/dressing.
   - Each move declares: needs, owned channel windows, entry and exit poses, a parameter schema, per-Mallow tuning plus approved [min, max, default] ranges, owned cue names and their recipes, and cost tags.
4. Personality pass:
   - semantic intents become per-Mallow face parameters through an adapter over the app's expressions.js plus video overrides in the pack;
   - amplitude, tempo and reaction-lag scaling, clamped to deformation limits, with the gag impact always landing by 1.0 s;
   - signature channels per Mallow;
   - the eye gate.
5. Acting pass:
   - idle breath with a whole number of cycles per loop;
   - seeded blinks and glances kept out of rest windows and impacts;
   - look-at targets resolved through pure prop controllers;
   - micro-noise envelopes that are zero at the seam;
   - a bridge move inserted wherever one move's exit pose doesn't match the next move's entry pose.
6. Build each channel:
   - sort keys by time before building the Track (fixes audit risk R5);
   - duplicate spline times are an error;
   - two moves writing the same channel inside each other's ownership window is a compile error;
   - impulses, ripples and shimmers merge by sum; blinks merge by max.
7. Circular wrap:
   - the composition lives on the domain [−P, D−P), and the runtime maps t ≥ D−P to t−D;
   - LP-RETURN uses P = 0; LP-RETRIGGER and LP-OBJECT put the seam at a quiet point and let the trigger play across frame 0.
8. Validate with G-DIR. Write direction.json (every value explicit, no randomness left), cues.json and per-frame curves from a dry evaluation (never from the render, which fixes R12), plus channel-plot SVGs.

ENGINE (engine/, forked from stage2, behaviour-identical at fork)
- gl, motion and softbody, with new DOFs: shrink, slide, sink with a waterline clip, meltSkew.
- Renderer with explicit passes: world, reflection, mesh, glass, cloud, particles, accum, bloom, post, overlay. Render scale is a parameter; quality profiles are exact, final, draft and proof.
- World modules, one per family, all sharing a GLSL library:
  - lake: mirror water and reflection (Moonmilk Cove, Blue Drift, Raindrop Lagoon);
  - floor: glossy floor with low-fresnel reflection (Static Storm, Spiral Observatory);
  - open: opaque ground with no reflection passes, saving about 140–170 ms per sub-frame (Sunpop Orchard, Spark Festival).
  - Static set pieces are baked as plates, either captured read-only from the app realm or hand-ported. Every moving element is a periodic pure function of t over D. The light rig comes from the preset.
- Face: one style plugin per family (closed-tube, open-socket, spiral, heavy-lid) and mouth plugins (tube-line, cavity/grin, open-lip, groove-ribbon). The quantised redraw cache draws once per frame, plus sub-frame redraws only during fast eye motion. Glow is blurred at 1/4 resolution, and only the dirty rectangle is uploaded.
- Glass Prop Kit (card, tile, block, soft cloud, light shapes) with pure controllers (orbit, rise, lane, stack, fork, loom).
- Analytic particles with a shape atlas.
- TextBlock (rise and fade only) and LogoCard (uniform scale and fade only; logo pixels never touched).
- asset-log.js records every texture URL with its hash and maximum magnification.
- DRAFT/INTERNAL corner mark drawn after post-processing.

INTERFACES (frozen at the end of WP-03)
- Direction contract v3: {meta, setup, state(t, stage, {center}), overlay, subframes, probes, dispose}. S is a superset of v2's state, with these optional additions: world.module, world.loop, mallow.xf, mallow.lidXform, mallow.emission, props[], text.boxes[].
- Move contract.
- Face style interface: {load, neutral, caps, box, quantise, motionPx, draw → {dirtyRect, lidXform?, emission?}, restMatch}.
- World module interface: {init, bake, renderWorld, renderReflection | null, light, contact, periodic: true, cost}.
- Prop controller interface.

PRINCIPLES
- v2 is hash-locked: stage2/, videos/my-brain-at-2am-v2.js and audio/soundtrack-v2.mjs never change, and the legacy route still renders them.
- Parity comes before features: G-STATE, G-CUES, G-PLAN and G-PIXEL run on every engine or composer commit.
- Craft lives in code (moves, face styles, worlds); choices live in data (specs, packs, presets, the tuning matrix).
- One source of truth per constant (breath envelope, pans, cue names), shared by picture and sound.
- Nothing silently falls back: a missing face JSON, cue recipe or asset is a hard failure.
- The app is read-only: registry, expressions and reactions are imported; audio.js is fetched as text and patched in memory; realm factories are loaded only to capture reference stills and plates. The render refuses to run if the app tree hash has changed.
- No network apart from the local static server. No paid services.

SOUND (three layers, all through the existing offline renderer and mastering)
1. Realm bed from the app engine, automated by the world-dial curves.
2. Mallow kit gestures via buildMallow(id).
3. Foley recipes owned by moves.
- Notes are written as scale degrees and transposed to each kit's root and scale.
- Resolutions rise or arch, and MO-CLOSE is mandatory.
- The render is circular: render past D and wrap-add the tail onto the start.
- --compat v2-score reproduces v2's event list exactly.
- hm remux re-scores an existing picture using only the audio slots.

OPERATIONS
- render/farm.mjs runs job states: compiled → drafted → final-queued → segments → encoded → scored → muxed → QA → review.
- Workers: 2 heavy render workers, or 1 derivation job. Benchmarks and goldens need the machine to themselves.
- Resume from per-segment .done markers that carry frame hashes.
- Disk guard warns below 5 GB free and refuses new jobs below 3 GB.
- CLI is cli/hm.mjs; the review gallery is static HTML per batch.

## File layout

```
Root: /home/user/thinkstill-rituals/hushmallow-infinite-studio. The app at /home/user/thinkstill-rituals/hushmallow is never written to. Everything below except the FROZEN entries is new.

```
FROZEN (hash-locked; legacy route only)
  stage/  stage2/  videos/my-brain-at-2am-v2.js  audio/soundtrack-v2.mjs  render/render.mjs  render/verify.mjs
  stage2 still imports stage/ clock; engine/ inlines its own copy (fixes R19)
templates/
  story-library.json  validate-library.mjs   (existing; committed in WP-00, not moved)
library/
  brand.json  text-styles.json  assets-manifest.json   (sha256 of every loadable asset = runtime allowlist)
  tuning-matrix.json
  mallows/<id>.json   realms/<id>.json   sound/soundmap.json   sound/<mallow>.json
engine/                       browser ESM, fork of stage2
  index.html  stage.js  gl.js  motion.js  softbody.js  type.js  themes.js
  render/profiles.js
  renderer/index.js  renderer/passes/{world,reflection,mesh,glass,cloud,particles,accum,bloom,post,overlay,readback}.js
  runtime/direction-runtime.js  runtime/clock.js  runtime/asset-log.js  runtime/marks.js
  worlds/{lake,floor,open}.js
  worlds/glsl/{noise,sky,celestial,clouds,water,haze,plates,floor,galaxy,mammatus}.js
  worlds/plates/<realm>/*.js
  face/index.js  face/params.js  face/adapters.js  face/cache.js  face/tube.js  face/glow.js
  face/iris-galaxy.js  face/iris-sprite.js  face/blush.js  face/tears.js  face/lids.js  face/emission.js
  face/styles/{closed-tube,open-socket,spiral,heavy-lid}.js
  face/mouths/{tube-line,cavity,grin,open-lip,groove-ribbon}.js
  props/{glass-card,glass-tile,glass-block,soft-cloud,light-shapes}.js
  props/content/{clock-face,battery,week,icons}.js
  props/controllers/{orbit,rise,lane,stack,fork,loom}.js
  particles/shapes.js
  dev/{rest-test,beat-lab,realm-bench}.html
composer/                     pure ESM; runs in the page and in Node
  compose.js  clock.js  channels.js  rng.js  poses.js  personality.js  acting.js
  layout.js  circular.js  validate.js  cost.js
  moves/index.js
  moves/{gags,metaphors,rituals,turns,loops,cameras,arcs,acting,close}/*.js
  recipes/Txx.js              optional, 50 lines or fewer each
planner/
  pick.mjs  capabilities.mjs  weights.mjs  reserve.mjs  lint-copy.mjs  fingerprint.mjs
  distance.mjs  schedule.mjs  ledger.mjs  calibrate.mjs
  metrics/fredoka-metrics.json
audio/
  soundtrack.mjs              shared; adds transposition + circular render, v2 path kept by compat
  score.mjs  recipes/*.mjs  layers/{tick,crickets,swirl,pad,breath,hum,rain,murmur}.mjs  lint-recipes.mjs
render/
  farm.mjs  worker.mjs  segment.mjs  encode.mjs  mux.mjs  serve.mjs
  lib/{paths.mjs,heavy-lock.mjs,provenance.mjs}
qa/
  run-qa.mjs
  gates/{spec,direction,cost,draft,delivery,flash,seam,safezone,readability,fidelity,figure-ground,realm-likeness,logo,brand-marks,allowlist,audio,dupes,determinism}.(mjs|py)
  golden/                     v2 state, cues, plan, mesh hashes, 16 frames; realm reference stills
  fixtures/                   fault clips and specs
tools/
  derive/{common.py,derive_mallow.py,asset_qa.py}
  derive/finders/{closed_tube,open_socket,spiral,heavy_lid}.py
  derive/configs/<id>.json
  derive_noomi_hires.py       thin wrapper
  golden/capture-v2.mjs  realm-reference.mjs  font-metrics.mjs  bench.mjs  cell.mjs  beat-sheet.mjs
  compare.py  filmstrip.py  qa_pack.py   (existing)
assets/<id>/                  derived hi-res sets, committed; noomi exists
cli/hm.mjs
gallery/{build.mjs,template.html}
specs/golden/t01-v2.json
runs/<batch>/                 gitignored
  index.html
  <variant>/{spec.json, direction.json, cues.json, plots/, seg/, video.mp4, score.wav, final.mp4,
             preview.mp4, qa/report.json, provenance.json}
ledger/{published,fingerprints,copy-usage,reservations,decisions,cells}.jsonl   (append-only, committed)
tests/{unit,guard,parity,golden,property,smoke,determinism}/
docs/
  ARCHITECTURE.md  MOVES.md  FACE-STYLES.md  REALMS.md  SOUND.md  QA.md  RUNBOOK.md
  OWNER-DECISIONS.md  BRAND-RULES.md  RISK-FIX-TABLE.md  CHANGELOG.md
README.md                     updated from 'Phase 1 only'
```
```

## Data model

All files are JSON. Schemas live in composer/schemas/*.json and are checked by `hm lib validate`. Every pack and preset carries a version, a status and its sha256.

---

## 1. Variant spec (`hm-variant/1`)

Written by the planner. It is fingerprinted and is the only input to compile. Example:

```json
{
  "schema": "hm-variant/1",
  "id": "T03-noomi-night-12s-4f2a91",
  "batch": "2026-11-03-A",
  "internal": false,
  "quality": "final",
  "template": "T03-social-battery",
  "mallow": "noomi",
  "realm": "moonmilk-cove",
  "tod": "night",
  "weather": "clear",
  "dressing": [{"id": "pearly-shore", "variant": 2}],
  "duration": 12,
  "seed": 4991633,
  "gag": {"id": "G-FLOP", "intensity": 0.85},
  "metaphor": "M-METER",
  "turn": "TURN-SQUEEZE",
  "ritual": "R-COSY",
  "loop": "LP-RETRIGGER",
  "camera": "C-DRIFT-IN",
  "arc": "A-GREY-CLEAR",
  "worldJitter": {"hue": 2.5, "warmth": 0.04, "exposure": 0.01},
  "copy": {
    "hook": ["MY SOCIAL BATTERY", "AFTER ONE PHONE CALL"],
    "lines": ["Small talk. So much.", "Did I laugh right?", "Do not perceive me."],
    "end": {"kind": "resolution", "text": ["Alone time isn't rude.", "It's recharging."]}
  },
  "sound": {"contour": "arch-1", "tickTempo": 1.0, "panWidth": 0.8},
  "cells": {"G-FLOP/noomi": "approved@sha:..."},
  "pins": {"library": "1.0.0", "engine": "git:...", "packs": {"noomi": "sha256:...", "moonmilk-cove": "sha256:..."}},
  "fingerprint": "sha256:..."
}
```

- **Visible slots** (used for fingerprint and distance): template, mallow, tod, weather, dressing set, gag, metaphor, the 3 lines, ritual, hook, end copy, camera, loop, duration.
- **Invisible slots**: seed, jitter, sound.
- **Fingerprint**: sha256 of the visible slots plus the seed, as the library defines it.

---

## 2. Character pack (`library/mallows/<id>.json`)

| Field | Contents |
|---|---|
| status | `approved` \| `candidate` \| `blocked` (with the blocking decision) |
| art | source path + sha256, plus pristine, clean, normal, face JSON, extra sprites (iris, lidskin, ribbon, emission, lidweight), cropOffset |
| placement | baseX, baseY, scale, maxDisplayScale (from the magnification cap, e.g. Boppo 0.77) |
| body | lag, bins, softbody constants, limits: heightMin 0.6, stretchMax 1.3, shrinkMin 0.6 |
| face | style, mouth, neutral pose, eyeGate, materials (tube core/bands/spec/beads/glow/underGlow per stroke), iris, blush (colour, blend, base), mouthInside, tongue, overrides |
| light | rimMul, specMul, glowMul |
| personality | energy, amp, tempo, reactLag, blinkRate, expression source `app:expressions.js#<id>`, signature gag/ritual, signature channel |
| fx | particle remaps |
| sound | kit, root, scale, bed |
| realms | which realms this Mallow appears in |
| provides | face params and body DOFs supported |

Noomi's overrides are the approved v2 values:
- `blushMode: "source-over-v2"`, colour rgba(255,110,200)
- tongue #ff8ab0 → #e2557f
- inside #1a0a3a

---

## 3. Realm preset (`library/realms/<id>.json`)

| Field | Contents |
|---|---|
| family | lake \| floor \| open |
| ground | mirror \| glossy \| opaque |
| tods{} | palette triple {base, tense, resolved}, celestial, stars, light rig, text style |
| constants | horizonY, hills/plates, water |
| mood | the 4 app dials (agitation, heaviness, clarity, warmth) plus transform p, mapped to uniforms; v2's coldAt = tension and warmAt = warmth |
| transform | the realm's payoff |
| pulses | strike → falling star or shaft (ramp ≥ 150 ms) |
| weather | whitelist of weather states |
| dressing[] | id, layer, cost ms, ToDs, source (`app:moonmilk-cove.js#lighthouse` or `capture:<plate>`) |
| dressingBudget | maxItems 2, maxCostMs 60 |
| plates[] | baked set pieces |
| budget | worldMsFinal, worldMsWorst |
| sound | bed, layers per ToD |
| reference | realm-likeness stills per mood |
| provides | capabilities offered to moves |

---

## 4. Tuning matrix (`library/tuning-matrix.json`)

Shape: `{ <moveId>: { version: <hash of compiled channel output on the canonical fixture set>, cells: { <mallow>: {...} } } }`

Each cell holds:
- status: untuned \| candidate \| approved
- tuning (per-Mallow parameter values)
- ranges: `{param: [min, max, default]}`
- evidence: test card id, extremes sheet id, junction sheets, approved videos
- approvedBy, approvedOn
- flags (reason codes from rejections)

Rules:
- If a move's compiled output hash changes, all its cells drop to candidate.
- Promoting a cell to approved needs a clean G-DIR on fixtures **and** an owner-ticked extremes sheet.

---

## 5. Move module (`composer/moves/**`)

Fields: id, kind, library id, cost {subframes, faceRedraws, world}, requires/needs {ground, caps}, span (anchors), owns {channel: [fromAnchor, toAnchor]}, entry/exit pose, params {def, range}, tuning per Mallow, cues {name: recipe}, and `compile(ctx, A, p)`.

`ctx` provides:
- body/face/world/camera/props/particles/text builders
- intent(name, t, opts)
- cue(t, name, payload)
- publish(subAnchor, t)
- rng(stream)

---

## 6. Compiled outputs

**direction.json**
- meta {D, fps, shutter, P, runtime: 'direction-v3', profile, internal}
- anchors, after jitter
- layout: measured text boxes and prop slots
- channels: `{name: {type: track|impulses|hops|blinks|spline|envelope|ref, ...}}`
- envelopes, blinks, looks, props, particles, text
- cues, probes, provenance (move versions, cell versions, asset hashes, engine SHA)

**cues.json**
- `{cues: [{t, type, move, pan, amp}], curves: [per-frame values]}`

---

## 7. Ledger (append-only JSONL)

- **Decision:** `{id, batch, fingerprint, visible, verdict: approve|reject, reasons: [acting|timing|copy|world|face|sameness|brand|other], note, by, at}`
- **Publish:** `{id, channel, postedAt, variantOf?}`
- **Signature:** `{id, coverHash, anchorHashes[7], audioSig}`
- **Copy usage and reservations:** `{text, kind, batch, channel, until}`
- **Cells:** `{move, mallow, from, to, evidence, at}`

---

## 8. QA report (`qa/report.json`)

`{gates: {G-SPEC..G-AUDIO: {pass, warn, metrics, artefacts[]}}, timings per pass, subframe histogram, faceRedraws, predicted vs actual, provenance}`

---

## 9. Provenance

spec hash, engine git SHA, pack and cell versions, Chromium build, Playwright 1.56.1, ffmpeg 6.1.1, profile, app tree hash.

## Template library

| id | title | feeling | Mallows | milestone |
|---|---|---|---|---|
| T01-brain-at-2am | My Brain at 2 AM | overthinking: replaying cringe at night (difficult, comic) | noomi, zuzu, blubi, glitzi | M1 |
| T26-nostalgia | Nostalgia Ambush | nostalgia: a memory out of nowhere (mixed, warm) | noomi, blubi, zuzu, loomi | M1 |
| T22-guilty-resting | Trying to Rest | guilt: guilt about resting (mixed, comic) | loomi, noomi, boppo, blubi, pipzi | M1 |
| T02-sunday-scaries | Sunday Scaries | dread: Sunday-evening Monday dread (difficult, comic) | loomi, blubi, noomi, glitzi, zuzu | M2 |
| T03-social-battery | Social Battery Empty | depletion: drained after people time (difficult, comic) | loomi, noomi, blubi, glitzi, boppo | M2 |
| T04-replaying-the-text | Replaying the Text I Sent | overthinking: re-reading your own message (difficult, comic) | zuzu, blubi, glitzi, pipzi, noomi | M2 |
| T09-rejection-sting | The No That Stings | hurt: rejection sting (difficult, gentle-comic; gag intensity <= 0.6) | blubi, noomi, boppo, glitzi | M2 |
| T16-morning-dread | Alarm vs Me | dread: morning dread (difficult, comic) | noomi, loomi, blubi, glitzi, boppo, zuzu | M2 |
| T17-small-win | Small Win, Huge Joy | pride: small-win joy (positive, comic) | boppo, pipzi, loomi, glitzi, noomi, blubi, zuzu | M2 |
| T27-someone-remembered | They Remembered | warmth: feeling seen (positive, warm) | blubi, boppo, noomi, loomi, pipzi, glitzi | M2 |
| T28-big-feelings-small-thing | Crying at an Advert | tenderness: big feelings over a small thing (mixed, comic) | blubi, noomi, boppo, zuzu, glitzi | M2 |
| T05-waiting-for-reply | Waiting for a Reply | anticipation: watching the typing dots (difficult, comic) | pipzi, blubi, zuzu, boppo, glitzi | M3 |
| T07-procrastination-guilt | The Task That Grew | guilt: procrastination guilt (difficult, comic) | glitzi, pipzi, loomi, boppo, zuzu | M3 |
| T11-comparison-scroll | Comparison Scrolling | comparison: feeling behind while scrolling (difficult, comic) | glitzi, blubi, zuzu, loomi | M3 |
| T12-three-pm-slump | The 3 PM Slump | depletion: afternoon energy crash (difficult, comic) | loomi, boppo, zuzu | M3 |
| T13-yes-meant-no | Said Yes, Meant No | people-pleasing: saying yes when you meant no (difficult, comic) | boppo, blubi, pipzi, loomi, glitzi | M3 |
| T14-missing-someone | Missing Someone | longing: missing someone far away (difficult, gentle; gag intensity <= 0.4) | noomi, blubi, loomi, zuzu | M3 |
| T18-left-out | Plans Without Me | loneliness: feeling left out (difficult, gentle-comic) | blubi, loomi, glitzi, noomi | M3 |
| T20-too-loud | Everything Is a Lot | overwhelm: too much noise and people (difficult, gentle-comic) | loomi, noomi, blubi, glitzi, zuzu | M3 |
| T21-plans-cancelled | Plans Cancelled (Yay) | relief: the joy of cancelled plans (positive, comic) | loomi, noomi, glitzi, blubi, boppo | M3 |
| T23-compliment-malfunction | Compliment Malfunction | shy joy: can't take a compliment (mixed, comic) | glitzi, blubi, boppo, pipzi, zuzu | M3 |
| T25-phone-call-nerves | When It Actually Rings | nerves: phone-call nerves (difficult, comic) | blubi, zuzu, loomi, noomi, glitzi | M3 |
| T06-imposter-feeling | Waiting to Be Found Out | self-doubt: imposter feeling (difficult, comic) | glitzi, zuzu, boppo, pipzi | M4 |
| T08-too-many-tabs | Too Many Tabs Open | overwhelm: mental clutter (difficult, comic) | zuzu, glitzi, pipzi, boppo, loomi | M4 |
| T10-excitement-overflow | Can't Contain It | joy: excitement you can't hold in (positive, comic) | boppo, pipzi, zuzu, blubi, glitzi | M4 |
| T15-presentation-nerves | Five Minutes Before | nerves: pre-presentation nerves (difficult, comic) | pipzi, zuzu, glitzi, boppo, blubi | M4 |
| T19-cant-decide | Can't Decide | overthinking: decision paralysis (mixed, comic) | zuzu, pipzi, boppo, glitzi | M4 |
| T24-one-of-those-days | One of Those Days | frustration: tiny annoyances piling up (difficult, comic) | glitzi, pipzi, blubi, boppo, zuzu | M4 |

## Per-Mallow asset plan

### noomi — Done: the assets exist. Low: face parity only.

Reuse assets/noomi/* unchanged. They are the approved v2 inputs.

Regenerate through tools/derive/derive_mallow.py --mallow noomi. The output must be byte-identical; this is the regression gate for the refactor.

Pack:
- crop offset (29,116)
- placement (540, 1300, 0.56)
- eye gate [0.5, 0.95]
- lag 0.062
- sound kit noomi (C5 major pentatonic)
- bed moonmilk-cove

No new art is needed. The 439 px app sprites are never used.

Moonmilk Cove world content comes from the app's moonmilk-cove.js, captured or ported in M2.

**Face style work:** Closed-tube style made data-driven. The v2 TUBE values become Noomi's material, bit-identical.

v2 colours are kept:
- source-over blush rgba(255,110,200) x 0.42
- tongue #ff8ab0 to #e2557f
- inside #1a0a3a
- neutral: closedCurve 1, mouthSmile 1, browAlpha 0

Fixes:
- R13: a missing face JSON is a hard error.
- R15: Face.box is derived from the face spec.
- The catchlight follows the realm's key light; for the Moonmilk moon this is identity.

New parameters, used by Tier A/B moves:
- tears and wet (T28)
- pout
- mouthTremble, 6 Hz or below
- browAsym and browCurve
- cheekPuff
- tongue

The app's expression preset map is applied through an adapter, with the eye gate.

### blubi — Medium-high. About 68k px is re-synthesised (Noomi was 70.7k), plus about 180k px un-blended from glow. Strokes are close together, the cheeks run under the eye ends, and R/B channels are clipped.

Uses the closed_tube finder. No owner decision is needed, so derivation can start in the M1 window.

Detection and masking:
- Stroke detector: B < 140, luma < 48, alpha > 200. This finds exactly 5 strokes (2 brows, 2 eyes, mouth).
- Zone A is the stroke core plus 10 px (about 68k px). Zone B is a 10–64 px band that is un-blended, not invented.

Colour handling:
- Pedestal ratio un-blend with epsilon (10, 2, 2).
- Glow fitted by least squares on G and B only, since R is about 0.

Cheeks:
- The fitted erfc cheek disc is subtracted as its own layer before the fill and added back afterwards.
- The dilated sparkle masks are excluded from both zones.

Glow residue:
- The zone A base is anchored to a thin-plate background filled from outside the whole halo.
- A final sigma 12 px low-frequency pass removes the residual R lift.

PatchMatch:
- Source patches from face-centre skin within 250 px.
- Patch radius 4–5, reuse penalty, band_gain_max 2.8.
- Oriented-gradient ghost test.

Crop offset (48,114), art 1160x1130.

Asset gates:
- Zero changes outside the mask; alpha identical.
- Mean R in zones A and B within +/-3 of the clean ring. The prototype failed this (18.9 vs ~5).
- Cross-stroke profiles flat within +/-1.5 levels.
- Band energy 0.9–1.1x of nearby skin.
- Cheek refit within 1%.
- 8-direction lighting sweep shows no ghosts.
- Owner checkpoint: neutral A/B flip, expression sheet, and a 6–8 s test reel rendered in Raindrop Lagoon.

**Face style work:** Closed-tube with 5 strokes.

Brows:
- Painted brows are always visible (browAlpha 1, taper 0.95), held in a cached layer.
- Brow lift is coupled to eyeOpen x eyeScale so an open eye never hits a brow.

Strokes:
- Cubic rest curves for eyes and mouth. Eye tilt +8.2 degrees, sag 44.2 / 42.9.
- Per-stroke taper: 0.88 eyes, 0.92 mouth.
- Per-stroke specular profile along the stroke, with end beads.
- Dark glow above, normal-blended toward rgb(0,0,215–244). Sigma: eyes 6.7–7.3, mouth 11.3, brows 12.6–14.6.
- Cyan screen-blended under-glow, strongest on the mouth.

Expression:
- Tears and wet eyes (signature).
- mouthTremble 6 Hz or below; pout; cheekPuff.
- Eye gate [0.38, 0.85].
- Blush: screen #ff7ef0 on base 1.
- Inside #2a0a3a, tongue #ff6f9c, no teeth.
- Procedural navy galaxy iris, r about 62 art px. Socket radius about 94.

The open-eye look is invented and is signed off as a still.

Rest-match: dE2000 mean 2 or less, p95 6 or less, centrelines within 1 px, widths within +/-1 px.

### loomi — Medium-hard. Strokes are easy to find. The colour is the hard part: 33% of pixels have R <= 5 and 73% have B >= 250. The unchanged Noomi pipeline leaves a pale band and a cheek seam. Expect 70–90k px after the fixes. Blocked by the canonical-art question.

Default design: the hi-res 2-arc look plus smile, no brows at rest. The app's 4-arc look is used only if the owner chooses it.

closed_tube finder with fixes F1–F9:
- F1: least-squares blend glow fit across all channels, inner and outer sides fitted separately.
- F2: correction factor set to 1 wherever a channel is clipped.
- F3: cheek discs, shoulder highlights and glints excluded from the background estimate; each cheek handled as an analytic layer.
- F4: PatchMatch guided by low-pass colour, with separate source pools for clipped skin and lit skin.
- F5: texture strength balanced per channel, then an R clamp and B 248–255 pass.
- F6: edit area per side. Eyes 40 px inside / 28 px outside; mouth 64 / 84 px.
- F7: smaller glint detection so every cheek glint is protected.
- F8: dimple radius about 95–100 px.
- F9: RGB zeroed where alpha < 2.

Crop offset (41,116), art 1173x1098.

Asset gates:
- Stretched channel views: median R above the eyes <= 4; low-pass step <= 2 levels; energy ratio 0.85–1.15.
- Ghost-detector correlation < 0.05.
- Cheek refit within +/-1 px.
- Owner checkpoint rendered in Blue Drift.

**Face style work:** Closed-tube.

Strokes:
- Signature tilt: -22.75 / -21.35 degrees.
- Two-sided glow: inner rgb(0,128,252) at opacity about 0.6; narrow outer cyan rim #0096fa.
- Mouth under-band rgb(200,255,255), peak at 13 px, sigma about 22, attached to the lower lip so it follows mouth opening. No under-band on the eyes.
- Specular uneven, peaking at the inner (higher) end of each eye. Whiter beads.
- Taper 0.88 eyes, 0.9 mouth.

Code guards:
- Brows are optional; add a guard for a missing brow spec.
- Never use the registry's U-shaped 'brows' for expressions.

Opening:
- When the eye opens, keep a residual droop (lidSlant about -0.2). Signed off as a still.
- Procedural navy iris, r 59, open-eye radius 89–91.

Blush #ff7cf5 with per-cheek radii (83.7 / 73.6).

Amplitude and tempo: amp 0.6, tempo 0.8, react lag +0.12 s. The comedy is under-reaction.

Rest-match: dE2000 mean 1.5 or less, p95 4 or less, centrelines within 2 px.

### boppo — High. About 229k px is re-synthesised (3.2x Noomi), and the furthest hole point is about 150 px from real skin. R is clipped, so all texture is in G. The app sprite is a different painting. Blocked by the canonical-art question.

Default canonical: the hi-res wide grin with heart tongue.

open_socket finder:
- Eye white: G - B < 40 and B > 100, joined with the iris disc.
- Iris: ray cast plus robust circle fit.
- Brows: R < 205, dilated 5–6 px upward.
- Mouth and tongue detectors.
- Protect masks for gloss, glitter and highlight dots.

fit_cheeks runs on the blurred B channel.

Halo model:
- Ratio in G, additive in B, R set to background.
- Radii: eyes 64 px, mouth 56 px, brows 20 px.
- Pixels with G > 235 in the cream band go to full re-synthesis.

Re-synthesis:
- Biharmonic base plus the cheek model.
- 5-level PatchMatch, radius 4.
- Each hole draws from its own source pool: left eye from the left half, right eye from the right half, mouth from the chin.
- Reuse penalty; fixed seed.
- Fallback: patch quilting from a clean 256-px swatch.

Cheeks: completed under the eyes, with glitter added at 11–15 sparkles per cheek.

Iris sprites: cut at native size, about 230 px square, with catchlights inpainted.

Crop offset (12,53), art 1226x1177.

Asset gates:
- Zero changes outside the mask.
- G band energy within +/-15%.
- No two 48 px blocks correlate above 0.92.
- Cheek fit error < 8 levels.
- Blind 100% / 200% real-vs-invented review.
- Owner checkpoint rendered in Sunpop Orchard.

**Face style work:** New open-socket style:
- Elliptical sclera with the measured gradient, salmon toward the rim.
- Crimson upper glow and cream lower band drawn along the lid curves, so blinks read as carved.
- Native iris sprite, with pentagon and oval catchlights fixed to the light.
- No lash line while open.
- Closed state: maroon tube plus socket lighting. This look is invented and signed off as a still.

New grin mouth:
- Built from the 30-point contour (corners, bumps, upper-lip dip, lower depth).
- Interior gradient #280101 to #660104, heart tongue.
- Closed-smile maroon tube, mouthRound, pout.

Brows: cubic maroon tubes, always visible, with an upper-edge highlight.

Magnification assert: eyeScale x irisScale x displayScale <= 1. Because surprise uses eyeScale 1.3, displayScale must stay at 0.77 or below; the planner reads this from the pack.

Glow sprites are cached by openness bucket. Redraw budget 75 ms or less.

Rest-match: median dE 2 or less, p95 6 or less, catchlight IoU >= 0.9, outlines within 2 px.

### pipzi — Hard. About 290k px is re-synthesised. The skin is a two-scale cobblestone, R >= 248 on 57% of body pixels, the cheek glow sits inside the eye holes, and interior alpha is 252–253.

open_socket finder, sharing code with Boppo. Pipzi is derived first.

Fixes:
- Source-skin mask: exclude magenta glow (B - G > 60, dilated).
- Specular exclusion: only blobs over 150 px plus cheek sparkles.
- Energy weighted toward G/B: (0.2, 0.4, 0.4).
- Masks per feature: eyes +14 to +22 px with a 16 px cross-fade; mouth +22 px; brows +20 px with un-blend to +30 px.

Cheek glow:
- Fit a radial glow model per channel.
- Remove it from the hole boundary before filling.
- Restore it after filling, with seeded glitter at about 77 specks per cheek.

Fill:
- Harmonic low-frequency fill, detail scale 48.
- Target energy taken from a 20–90 px ring.
- 5 pyramid levels; per-region source pools.
- Eye holes taper to about 60% texture toward the centre, with a gentle dome in the height map.

Alpha: snap values >= 240 to 255, identically in art and clean.

Iris sprites cut at r about 112.

Crop offset (19,54), art 1222x1174. Derivation takes about 10–15 min on 4 cores.

Asset gates:
- Energy 0.85–1.15 per G/B band.
- Cell period within +/-15%.
- Glint density within +/-25%.
- dE < 2.
- Glow model error < 3%.
- Owner checkpoint rendered in Spark Festival.

**Face style work:** Open-socket, shared with Boppo, with the 'galaxy-warm' iris:
- Native sprite at neutral; procedural fallback.
- Pentagon catchlight fixed to the light.
- Optional twinkle at 0.3 Hz or slower, +/-15%.

Cavity mouth:
- Gull-wing cubics, keeping the 4.6 degree corner tilt.
- Interior gradient, two-lobed tongue with groove, peach lower-lip rim.
- Closed mouth: maroon crease, never navy.

Brows: maroon tubes with a pink top highlight, taper 0.75. Measured left and right curves are kept separate; never mirrored.

Closed eye: maroon tube (hw about 138, sag about 33). Invented, signed off as a still.

All painted asymmetries are preserved: star layouts, corner tilt, brows.

Sparks are local only, never a full-frame brightening.

Rest-match: centres within 1.5 px, iris radius within 1 px, mouth within 3 px, face SSIM > 0.9, dE mean < 3 (tightened to <= 2 after the cache work), plus the rest-fade spike check.

### zuzu — Hardest. About 308k px of skin to re-synthesise (4.4x Noomi), on a strong colour gradient, with three overlapping halos. The spiral itself is easy to rebuild procedurally. The app art has different proportions (6.5% narrower). Blocked by the canonical-art question.

Default canonical: hi-res proportions.

spiral finder:
- Cyan-disc segmentation and rim ellipse fit.
- Maroon mouth and tongue segmentation.
- Cheek fit on G / lightness, jointly with the pink band under each disc.
- Halo model generalised so position runs along the ellipse angle. Eye halo radius 80 px, mouth 48 px.
- zone_vmin 16–24 px.

Fill:
- Thin-plate global shading and colour prior, corrected by a harmonic fill of the boundary residual.
- Cheeks extrapolated as round blush.
- 5-level PatchMatch per window (left eye, right eye, mouth). Same-side source patches, guided by low-pass colour, reuse limit, fixed seed.
- The upper-left gloss highlight is protected.

Crop offset (21,73), art 1212x1145.

Asset gates:
- Low-pass and high-pass disc-ghost views.
- Detail ratio 0.8–1.25.
- Repeat-patch detector.
- Owner checkpoint rendered in Spiral Observatory.

**Face style work:** New spiral style. The phase field is computed per pixel from a measured Archimedean fit, mirrored between eyes:
- Left: pitch 58.3, phi0 330.4 degrees, squash 1.048, handedness s = -1.
- Right: pitch 59.9, phi0 242.3 degrees, squash 1.037, handedness s = +1.
- Plus a small phase-correction term for the painted deviation.

Rendering:
- 64-step colour table.
- Fixed screen-space highlights, calibrated to 4–5.5% coverage.
- Analytic spin motion blur: the colour table is averaged over each frame's phase step.
- Socket layers (violet halo, pink band, rim thickening at the bottom, azure bevel) fade as the eye closes.
- Lids clip the disc.

Open-lip mouth: lip band, gloss ridge, interior gradient, heart tongue. A closed mouth is invented and signed off as a still.

Brows: expression-only, ink tube #3a0052.

Spin rules:
- At most 1 turn/s, eased over at least 0.5 s.
- At most 0.3 turn/s when a disc covers more than 25% of the frame.
- A whole number of turns over the loop.
- spiralHue rainbow replaced with a cyan/magenta/violet shift.

The face redraws every frame while spinning. Static layers are cached and only the dirty rectangle is uploaded.

Rest-match:
- Face-box dE mean 2 or less.
- Inside the disc: dE 5 or less with band positions within 2 px. This is the only resolved per-style exception, because of the paint deviation.
- Mouth IoU >= 0.97.
- Rest-fade spike check passes.

### glitzi — Different method. High risk, but the smallest invented area (~25k px, mouth only). The relief face is split into layers, not inpainted. Glitch is the most strobe-prone element in the brand.

heavy_lid finder.

Layers:
- Emission layer separated first: per-channel opening with a 9x1 kernel, then a 3 px ellipse. Glitch rows are re-measured on the hi-res art.
- A new eye layer always covers the full eyeball ellipse, and the clean body's eyeball interior is filled with #08000d. Nothing is invented behind the eyes.
- Pads stay in the body, moved by a shader UV shift driven by a weight map (glitzi-lidweight.png): +/-28 px, +/-7 degrees, fade finishing above the streak rows.
- Lid-skin sprites for blinks.

Iris sprites built from the art: polar unwrap of the visible band, catchlight removed, hidden top filled.

Mouth:
- Fill: 2–4 transplanted patches with min-cut seams, gradient-domain blend (seamlessClone), PatchMatch only for seam refinement (r >= 6, copy pass).
- Mouth ribbon sampled from the art along normals to the fitted curve.

Crop offset (64,108), art 1132x1080.

Asset gates:
- Recombination (clean + emission + ribbon) dE mean < 2, p99 < 6.
- Eye SSIM >= 0.9.
- Repeat-patch NCC <= 0.95.
- No magenta outside the emission mask.
- Owner checkpoint rendered in Static Storm.

**Face style work:** New heavy-lid style:
- Fixed per-eye rotated ellipses as measured. Lid-shadow sclera gradient follows the animated lid.
- Art-derived iris sprites; catchlight clipped by the lid.
- Per-eye neutral lids 0.50 / 0.47 and lookX about 0.87. The asymmetric sceptical look is kept.
- Surprise raises the pads (up to 28 px, then owner approval) and shrinks the iris; it never grows the eyeball.

Brows are the pads: browY, browTilt and browAsym drive lidXform uniforms.

Groove-ribbon mouth: carved frown at neutral; a cavity (#140820) opens between the ribbon halves; tongue #d4406f; no teeth.

Emission layer:
- Skips the key-light multiply.
- Gain 0.3–1.6, drift 6 px/s or less.
- Glitch bursts: 3–5 rows shifted by up to 10 px for 0.25–0.6 s, at most one every 2 s, brightness-preserving.

Lower rim, spec and glow multipliers. Stage halo plus cyan rim from the realm light rig.

Blush: magenta, screen, base 0, emotion only.

Rest-match: lid, iris and catchlight within 1 px; eye-region SSIM >= 0.9; rest-fade spike check passes.

## QA gates

- **G-PARITY (every commit to engine/, composer/ or library/mallows/noomi; npm run test:golden, about 4 min; full 16 frames at the end of each work package)**
- G-STATE: state matches the frozen v2 module within 1e-9 at all 2,441 sampled times (450 frame centres plus 1,991 sub-frame times), with identical mesh hashes and sub-frame counts.
- G-CUES: byte-equal cue log and curves.
- G-PLAN: under compat mode, the event list equals buildPlanV2's.
- G-PIXEL, exact profile: bit-identical to the goldens, or within 1/255 if WP-00 found SwiftShader non-deterministic.
- G-PIXEL, final profile against exact: PSNR >= 45 dB full frame; face-box SSIM >= 0.995 mean and >= 0.98 minimum; rest-test difference no worse than baseline.
- Guard tests: app tree hash unchanged; frozen file hashes unchanged; no Math.random, Date.now or performance.now in engine/ or composer/; no writes outside the studio root.
- **G-SPEC (plan time, milliseconds)**
- Schema is valid and every slot is legal.
- Every move cell, Mallow pack and realm/ToD preset is approved. Review batches may use candidate cells.
- Copy lint is clean. It is a superset of the library validator, adding:
  - the tone/topic blocklist (self-harm, death, illness, body/food, alcohol, drugs, appearance);
  - Latin-1 only;
  - lowercase 'hushmallow';
  - time words must match the ToD;
  - no breath-hold phrasing;
  - grief pairing (T14's sensitive hook never with a comic L3).
- The ritual's minimum duration fits its window.
- Fingerprint never used before. Distance rule: at least 3 visible slots differ, one of them the Mallow or the hook, plus weighted distance >= 6.0.
- Sequencing and cooldowns hold over the unlocked set. Copy reservations are respected. Semantic hook cooldown: token Jaccard >= 0.5 counts as the same hook.
- Asset hashes match the manifest.
- **G-DIR (compile, under 3 s in Node)**
- Structure: keys monotonic; no duplicate spline times; no ownership-window overlaps; no NaN at any frame or sub-frame time.
- Loop closure: every channel, world uniform and prop state has |x(D-) - x(0)| <= 1e-3 normalised and |dx'| <= 0.02/s; impulses < 1e-3 at the seam; rest windows >= 0.25 s on each side of the seam; hook at full alpha on frame 0.
- Deformation, sampled at 240 Hz: height >= 0.6, stretch <= 1.3, shrink >= 0.6; G-SINK keeps the mouth above the waterline; face inside the silhouette.
- Camera: zoom 0.95–1.10, rate <= 0.04/s, pan <= 40 px/s, roll exactly 0.
- Text:
  - key text inside x 60–1020, y 180–1250; right rail (x > 900, y 700–1500) clear; nothing below y 1500;
  - at most 3 readable glass texts at once;
  - each readable line visible for >= max(1.0 s, 0.25 s + 0.05 s per character) at alpha >= 0.9 and <= 150 px/s;
  - hook and end line each >= 2.0 s;
  - captions only rise or fade.
- Safety:
  - R-BREATH: inhale >= 1.2 s, crest <= 0.35 s, exhale >= 1.5x inhale;
  - spin <= 1 turn/s (<= 0.3 in close-ups), ramps >= 0.5 s;
  - glitch <= 1 burst per 2 s;
  - twinkle <= +/-15% with period >= 1.5 s;
  - pulse ramps >= 150 ms;
  - exposure change <= 12%, ramped over >= 0.5 s;
  - sweat and '!' disabled.
- Craft: gag impact between 0.25 and 1.0 s; no dead interval over 1.2 s outside rest windows and the end card; C1 continuity except at declared kicks; eye gate respected; dressing within the clutter budget.
- Audio linkage: every cue has a recipe and every recipe's cue is emitted; no absolute-time layers.
- **G-COST (compile)**
- Predicted render time = dry-run sub-frame count and face-redraw count x the fitted cost model.
- Must be within the profile budget: final <= 11 min per 15 s, scaled by duration.
- G15 compares actual with predicted, warns at +30%, and refits the model.
- **G-DRAFT (draft frames, about 20 s)**
- Text boxes inside the safe zones.
- Mallow silhouette at least 24 px from the frame edges.
- Props cover <= 15% of the Mallow and <= 5% of the face box; declared wraps keep >= 95% of the face visible.
- Text contrast >= 4.5:1, measured as glyph fill against the p10 luminance of a dilated background ring.
- DRAFT mark present.
- **G-FINAL delivery**
- Generalised verify.mjs: H.264 High, yuv420p, BT.709, 1080x1920, 30 fps.
- Exact frame count (30 x D); duration within +/-0.03 s; faststart; zero decode errors.
- AAC 48 kHz stereo; audio length equals video length.
- Provenance stamp (spec hash + engine SHA) replaces the mtime freshness check.
- Determinism: 3 random frames re-rendered give identical hashes.
- **G-FINAL flash and pattern (brand rule, stricter than WCAG)**
- Measured on linear relative luminance over a 34x60 block grid.
- Zero transitions of >= 10% over >= 25% of the frame where the darker state is < 0.8. Same rule for saturated red: zero.
- Zuzu stripe check: a moving pattern covering > 25% of the frame with > 5 stripe pairs fails.
- The WCAG 2.3.1 regional count is also reported, but only as an extra check.
- Threshold calibrated so approved v2 passes.
- **G-FINAL loop seam**
- Mean |delta| from the last frame to frame 0 must be <= max(1.15 x the median consecutive |delta| over quiet frames, p90 of all consecutive |delta|). v2: seam 1.89 vs 2.02–2.09 inside the film.
- Checked separately inside the face box.
- Audio wrap step < -60 dBFS, and the 10 ms RMS at the seam within +/-3 dB of its neighbours.
- **G-FINAL character fidelity**
- Rest probes: Mallow only, identity post, compared with the pristine art under the same transform.
  - dE2000 mean <= 1.0, p99 <= 4;
  - silhouette IoU >= 0.985.
- Rest-fade spike: the largest consecutive face-box |delta| inside fade windows <= 1.5x the median of the surrounding second.
- Magnification log: <= 1.0 screen px per art px for every raster on every frame.
- Grade guard on the body mask: hue shift <= 10 degrees, chroma ratio 0.8–1.2, lightness ratio 0.7–1.35. The Mallow is relit, never recoloured.
- Every loaded asset URL and hash is in the allowlist.
- **G-FINAL world**
- Figure-ground: dE between the body and a 40 px surrounding ring >= 8 (fail) or >= 12 (warn), calibrated on v2. This catches Loomi blue-on-blue, Boppo orange-on-apricot and dark Glitzi.
- Realm likeness: the 9x16 Lab grid of the render against app-captured reference stills at matching mood; mean dE <= 10 (warn), <= 14 (fail).
- Since judges called the coarse grid weak, the realm stills reviewed by the owner at each realm checkpoint are the primary on-model check.
- **G-FINAL brand**
- Logo at full alpha: SSIM >= 0.995 against a reference LogoCard probe rendered with the same post-processing.
- Plate present; lowercase hushmallow.com.
- End card is the resolution line or a brand closer, never both; closers about 30% of posts and never 3 in a row.
- DRAFT/INTERNAL mark present if and only if the spec is draft or internal.
- No '!' glyph effects.
- **G-AUDIO**
- Loudness -16 +/-0.5 LUFS; true peak <= -1.5 dBTP; LRA <= 10 LU.
- Loud-cue onsets within +/-20 ms; quiet cues within +/-45 ms.
- No gap longer than 1 s below -50 LUFS momentary, outside the planned turn.
- Tension hum <= -24 dBFS.
- The last 3 tonal events never fall; MO-CLOSE present.
- Recipe allowlist: no ringtone, alarm, heartbeat, messenger-pop or jump-scare recipes.
- **G-DUPES (post-render)**
- pHash at 7 anchor frames (cover, gag, impact, peak, ritual mid, eyes open, end card), plus colour and audio signatures.
- Held for review if >= 5 of 7 anchors are within Hamming 10 of any video in the 14-day ledger.
- Cover frame must be >= 14 from each of the last 30 posts on the channel.
- Thresholds are fitted to about 20 owner-rated 'feels the same / different' pairs from Batch A.
- **Asset gates (once per Mallow, through the heavy-job lock)**
- Zero changes outside the edit mask; alpha identical; same seed gives identical hashes.
- Texture energy per band and channel 0.85–1.15; repeat-patch NCC <= 0.95; ghost correlation < 0.05; cheek refit within +/-1 px.
- Each Mallow report's specific checks (for example Blubi's zone R within +/-3; Loomi's median R above the eyes <= 4).
- Style rest-match passes. A failing style does not ship: there is no crossfade-off fallback.
- Owner checkpoint: neutral A/B flip clip, expression sheet, and a 6–8 s test reel in the Mallow's own realm.
- **Fixtures and calibration**
- Every gate has at least one seeded fault fixture, and each fixture must fail exactly its own gate:
  - strobe;
  - 25% white frame;
  - seam jump;
  - text in the right rail;
  - upscaled sprite;
  - recoloured body;
  - tinted or rescaled logo;
  - -12 LUFS mix;
  - 300 ms A/V offset;
  - breath-hold line;
  - '2 AM' on an afternoon ToD;
  - duplicate render;
  - missing DRAFT mark.
- Thresholds calibrated on v2 alone are marked provisional, with warn bands.
- They are refitted after M2 on at least 12 approved videos plus the fixtures. Every change is logged in docs/QA.md.
- Nightly smoke: a 1 s draft of every candidate or approved cell, plus the fixture suite.
- **Owner review (G-HUMAN)**
- Each batch gallery shows, per video:
  - preview MP4, spec table, QA badges with metrics;
  - contact sheet and gag/ritual filmstrips;
  - the seam played twice;
  - waveform with cue markers;
  - nearest ledger neighbours;
  - a v2 side-by-side for T01-style videos.
- The owner works through the AUDIT-v2 10-question checklist.
- Decisions are exported with reason codes and imported by `hm review import`.
- Approval writes the ledger. It does not by itself promote cells, which need the extremes sheet.
- Nothing is ever auto-published.

## Performance plan

## Baseline (measured)

- v2 takes 1,524 s per 15 s video (output/v2/render.log); the per-pass model gives about 1,580 s.
- 1,991 sub-frames in total; 332 of 450 frames sit at the floor of 3.

| Pass | Cost each | Total |
|---|---|---|
| Face redraw | 257 ms, of which ~220 ms is ctx.filter blur | 510 s |
| Face upload | — | 36 s |
| Sub-frame GPU passes | ~250 ms | ~500 s |
| World | 0.6 s per frame | 270 s |
| Bloom + post | — | 77 s |
| Readback (base64 + CDP) | 404 ms per frame | 180 s |
| Overlay | — | 6 s |

## WP-02 performance pass

Each step is its own commit, with an `hm bench` number recorded and its own G-PIXEL gate. Savings are cumulative estimates.

| Step | Change | Saves | Gate |
|---|---|---|---|
| P1 (in WP-01) | Binary ArrayBuffer POST to the local sink, then ffmpeg stdin | ~160 s | bit-identical |
| P2 | Skip overlay draw and upload when empty | ~5 s | — |
| P3 | Face cache: quantised key; mouthWavePhase dropped when mouthWave < 0.01; skip when rest >= 0.999; draw once per frame, plus sub-frame redraws only when motionPx > 1.5 px (blinks, eye pops) | ~410 s | face-box PSNR >= 42 dB + owner A/B |
| P3b | Glow blur at 1/4 resolution (257 → ~50 ms); upload only the dirty rectangle (18 → ~8 ms) | ~110 s | (as P3) |
| P4 | World shader: branch moon fbm to the disc, hills to the horizon band, haze to h < 0.32; water samples a sky texture (0.6 → ~0.25 s) | ~160 s | PSNR >= 50 dB |
| P5 | Sub-frame restructure: premultiplied foreground accumulation, composite once as accum + world x (1 − Σwα); scissored reflection and accumulate; reflection mesh 48x48 into a 1/4-res target (~250 → ~140 ms) | ~220 s | PSNR >= 48 dB |
| P6 | Adaptive sub-frame floor of 1 when shutter displacement < 2 px (1,991 → ~1,490 sub-frames) | ~70–120 s | PSNR >= 45 dB |
| P7 | Precomputed mesh normal / d0 texture (51 → ~35 ms) | ~25 s | PSNR >= 50 dB |
| P8 | Explicit SwiftShader flags | — | — |

**Projection:** about 450–520 s, i.e. 7.5–8.7 min per 15 s on one worker.

**M0 acceptance:**
- Final: 12 min or less (stretch 9 min or less), so the milestone does not depend on every estimate holding.
- Alarm at 12 min; investigate at 15 min.

## Profiles

| Profile | Settings | Per 15 s |
|---|---|---|
| exact | v2 rules (sub-frame floor 3, per-sub-frame face, full blur); goldens only | ~26 min |
| final | scale 1.0; adaptive sub-frames 1–16; cached face; optimised world; x264 slow CRF 16 master + CRF 20 preview | target <= 9 min, accepted <= 12 |
| draft | 0.5 scale (uRes stays in design space); 1 sub-frame; face once per frame with no glow blur; 3-octave world, no clouds; no 1/8 bloom; x264 veryfast; DRAFT mark | <= 3 min, expected ~2–2.5 |
| proof | 6 full-quality stills | <= 45 s |

## Budgets per content type

| Content | Budget |
|---|---|
| Lake world | <= 0.25 s per frame (worst allowed combination <= 0.35) |
| Floor / open world | <= 0.35 s |
| Dressing | <= 60 ms total |
| Open-ground realms | skip reflection passes, saving ~140–170 ms per sub-frame, so they are cheaper than the lake |
| Closed-tube face | <= 50 ms per cached redraw |
| Open-socket face | <= 60–75 ms per redraw |
| Zuzu spin | redraws every frame, budget +10–20 ms per frame |
| 20 s video | about 1.33x the 15 s cost |
| Each glass primitive | <= 25 ms per sub-frame at 3 instances |

## Conditional perf pass 2 (WP-47)

Triggered only if open-style faces exceed 75 ms per redraw or the final exceeds 12 min:
- SDF tube/face shader into an art-space FBO (10–20 ms), gated on rest-test results;
- tileable noise textures (world ~0.1 s per frame);
- page reuse with dispose().

## Throughput (honest planning)

- 2 heavy workers give +15–30% from idle CPU: about 6–6.5 min effective per 15 s final, about 8–9 finals per hour on the lake family.
- Planning figure: **60–80 accepted videos per day** at most, after drafts, about 25% QA or owner rejects, and QA (under 90 s each).
- If WP-02 misses badly, the current path still gives about 55 per day. No content plan depends on the optimisations.
- Owner review (about 1 min per video) is the real bottleneck.
- Recommended operating rhythm: a nightly 10 h window of drafts (2 workers) then finals; daytime for development, derivation (heavy-job lock, 10–15 min per run) and benchmarks (exclusive). Weekly review batches of 14–28 videos.

## Resources

| Resource | Plan |
|---|---|
| Memory | ~2.5 GB per worker; at most 2 heavy workers or 1 derivation job (15 GB RAM) |
| Frames | never written to disk |
| Segments | deleted after mux |
| Drafts | pruned 7 days after review |
| Kept per final | ~52 MB (master ~35 MB, preview ~12 MB, QA ~5 MB) |
| Masters | pruned to spec 30 days after publish (deterministic re-render about 8 min; verified once in WP-26) |
| Disk guard | warn below 5 GB free, refuse below 3 GB (26 GB free today) |

## Machine-time budget by milestone

| Milestone | Machine time | Main uses |
|---|---|---|
| M0 | ~7 h | golden capture, ~18 bench runs, 2 full parity finals |
| M1 | ~6 h | — |
| M2 | ~14 h | realm benches, move cards, smoke, Batch A |
| M3 | ~16 h | includes ~3 h of derivations |
| M4 | ~18 h | — |
| M5 | ~20 h | — |

## Milestones

### M0 Foundations: frozen v2, parity, fast render farm (weeks 1-3)

The generator reproduces the approved v2 exactly through the new engine and composer. Finals are 12 min or less per 15 s (stretch: 9 min). Score, QA, planner and derivation tooling all work end to end. Owner decisions that block assets are collected in week 1.

**Owner review:** M0 gate, about 45 min of owner time:
- T01 rebuilt through the composer, shown side by side with the approved v2 MP4. PSNR and SSIM are reported, plus the state, cue and pixel parity results.
- An A/B flip sheet (16 frames) and a full-video side-by-side of the final profile against exact. The visible change: the face is no longer motion-blurred within a frame, except during blinks and eye pops. The owner approves or rejects this.
- An A/B listening pass on the v2 score with the documented fixes: circular loop wrap, breath sound in the 11.8–13.3 s window, swirl starting at spin_up.
- Benchmark table.
- A decision sheet (week 1) for the 3 open questions, with stills built from the asset reports.

#### WP-00 — Freeze, safety rails and golden capture (9 h, renders; depends on nothing)

Lock the approved v2 so it can't change, commit the story library, add guard tests, and capture full golden data before anything else changes.

Files: `templates/story-library.json (commit)`, `templates/validate-library.mjs (commit)`, `.gitignore`, `package.json`, `tests/guard/app-untouched.test.mjs`, `tests/guard/frozen-hashes.test.mjs`, `tests/guard/no-wallclock.test.mjs`, `render/lib/paths.mjs`, `render/lib/heavy-lock.mjs`, `tools/golden/capture-v2.mjs`, `qa/golden/v2/{state.ndjson.gz,mesh-hashes.json,subframes.json,cues.json,curves.json,plan-v2.json,frames/*.png}`, `docs/OWNER-DECISIONS.md`, `docs/RISK-FIX-TABLE.md`

Acceptance:
- Git tag v2-approved exists. templates/ is committed and __pycache__ is gitignored. node templates/validate-library.mjs reports 0 errors.
- The guard suite fails if any file under ../hushmallow changes (recorded tree hash), if any frozen v2 file hash changes, if Math.random, Date.now or performance.now appear in engine/ or composer/, or if any write lands outside the studio root.
- Golden capture records: numeric state at all 450 frame centres and 1,991 sub-frame times; mesh buffer hashes; subframes(t) per frame; the cue log; curves; buildPlanV2's event list; and 16 lossless frames at 0, 0.2, 0.4, 0.6, 0.98, 1.1, 3.2, 4.5, 6.5, 7.0, 8.9, 9.6, 10.5, 11.9, 12.8 and 14.9 s.
- SwiftShader run-to-run determinism is measured: the same frames rendered twice and out of order. Golden tolerance is set to exact, or to at most 1/255 if non-determinism is found.
- heavy-lock.mjs (flock) gives exclusive or shared CPU slots, and is used by bench, golden, derive and render.

#### WP-01 — Engine fork and render farm core (18 h, renders; depends on WP-00)

Fork stage2 into engine/ without changing behaviour, and build a segmented, resumable, binary-transfer render farm.

Files: `engine/** (copy of stage2; runtime/clock.js inlined from v1)`, `engine/index.html (canvas size from the query string)`, `engine/runtime/asset-log.js`, `engine/runtime/marks.js`, `render/{farm,worker,segment,encode,mux,serve}.mjs`, `render/lib/provenance.mjs`, `cli/hm.mjs (render, status, doctor)`

Acceptance:
- The frozen v2 module renders through an adapter on the new runtime, bit-identical to the goldens (or within the WP-00 tolerance).
- W, H and render scale are parameters. The flags --use-angle=swiftshader --enable-unsafe-swiftshader are explicit. The Playwright 1.56.1 and Chromium build are recorded in provenance. hm doctor checks WebGL2, ffmpeg, fonts, cores, RAM and free disk.
- Readback by binary POST takes 60 ms or less per frame.
- Segments: 90 frames with an IDR at each segment start (-g 30, closed GOP), joined with concat -c copy. ffprobe shows exactly 30 x D frames and 0 decode errors. Decoded PSNR against a single-pass encode is 60 dB or more.
- After kill -9 mid-segment, --resume gives identical frame hashes and loses at most one segment. Stale locks are reclaimed after 10 min. Each segment gets 2 retries, then is marked failed. A watchdog fires if a frame takes over 60 s.
- The page reloads per video. dispose() and content-hashed texture keys work: two different specs in one worker show no texture bleed. A NaN from subframes() falls back with a logged error.
- The runtime is chosen from direction.meta, with no '-v2' suffix routing. Curves come only from the dry run. Fixes R2, R3, R4, R12, R18 and R19.
- Every texture URL and its hash is logged per job, along with the maximum magnification per raster.

#### WP-02 — Performance pass 1 and quality profiles (30 h, renders; depends on WP-01)

Bring the final render from about 26 min to 12 min or less (target 7.5-8.5) per 15 s on one worker, without visible regressions. Add the draft and proof profiles.

Files: `engine/renderer/**`, `engine/face/{tube,glow,cache}.js`, `engine/stage.js`, `engine/render/profiles.js`, `engine/worlds/glsl/*.js`, `tools/bench.mjs`

Acceptance:
- Steps P2-P8 each land as a separate commit, each with hm bench per-pass numbers (median of 3, on an exclusive machine) and its own G-PIXEL tolerance as listed in perf_plan.
- The final profile renders v2 in 12 min or less per 15 s on 1 worker (stretch: 9 min). Draft takes 3 min or less. Proof (6 stills) takes 45 s or less.
- The exact profile stays bit-identical to the goldens. Final against exact: PSNR of 45 dB or more on all 16 goldens, and face-box SSIM of 0.995 or more on average (0.98 minimum).
- The rest-test diff is no worse than baseline. Loop-seam and flash metrics are unchanged within 2%.
- An owner A/B flip sheet and a full-video side-by-side are produced for the M0 gate. Fixes R1, R14 (roll assert) and R21.

#### WP-03 — Composer core, with v2 expressed as moves (33 h, renders; depends on WP-00)

Build the typed-channel composer, circular timeline, pose contracts, personality and acting layers, and the direction runtime. Re-express v2 as the first moves, with exact parity.

Files: `composer/{compose,clock,channels,rng,poses,personality,acting,layout,circular,validate,cost}.js`, `composer/moves/{acting/idle-breath,gags/G-JOLT,acting/aftermath-startled,metaphors/M-ORBIT,turns/TURN-SQUEEZE,rituals/R-BREATH,close/content-card,loops/LP-RETURN,cameras/C-DRIFT-IN,arcs/A-COLD-DIP-WARM}.js`, `composer/schemas/*.json`, `engine/runtime/direction-runtime.js`, `library/mallows/noomi.json`, `library/realms/moonmilk-cove.json (late-night only)`, `library/tuning-matrix.json`, `specs/golden/t01-v2.json`, `tests/parity/*`, `docs/ARCHITECTURE.md`

Acceptance:
- G-STATE passes at 1e-9 or better at all 2,441 times. Mesh hashes and sub-frame counts are identical. G-CUES: the cue log and curves are byte-equal.
- T01 rendered through the composer is bit-identical to the WP-01 legacy render, checked before the WP-02 merge and again after it.
- Unit fixtures prove that unsorted keys, duplicate spline times and overlapping ownership windows are compile errors (fixes R5). The breath envelope is a single exported function (fixes R11, picture side).
- Noomi's personality and acting layers are an exact identity transform. Moves declare entry and exit poses, and the bridge mechanism has unit tests.
- A circular wrap with P=0 reproduces v2. A unit test with P>0 passes loop closure.
- Frozen and documented: direction contract v3, the move contract, the channel catalogue, the face parameter vocabulary and the prop controller interface.

#### WP-04 — Score generaliser (18 h, renders; depends on WP-03)

Make the score plan generic: cue recipes owned by moves, kit transposition, the right voice and bed per Mallow and realm, and a seamless circular render. Keep exact v2 reproduction in compat mode.

Files: `audio/score.mjs`, `audio/recipes/*.mjs`, `audio/layers/{tick,crickets,swirl,pad,breath,hum}.mjs`, `audio/lint-recipes.mjs`, `audio/soundtrack.mjs (adds transposition and circular render; v2 path kept)`, `library/sound/{soundmap,noomi}.json`

Acceptance:
- --compat v2-score reproduces buildPlanV2's event list exactly.
- The default mode differs only by documented fixes, each landing as its own commit with a before/after WAV: R7 (wrap-add circular render), R10 (no fallback times, full cue/recipe coverage), R11 (shared breathEnv and a single pan constant), and the swirl starting at spin_up.
- G-AUDIO passes: -16 LUFS +/- 0.5, true peak -1.5 dBTP or lower, seam step below -60 dBFS, and the final tonal events never fall.
- buildMallow(id) and the realm bed build for all 7 ids. A unit test confirms scale-degree notes transpose correctly (for example Blubi's F5 major pentatonic).
- The banned-recipe lint rejects ringtone, alarm, heartbeat, messenger-pop and jump-scare recipes. hm remux re-scores an existing picture in 60 s or less.

#### WP-05 — QA suite v1 and review gallery v1 (27 h, renders; depends on WP-01)

Automate every gate (G-SPEC through G-AUDIO, plus fixtures) and build the static review gallery with a decisions export.

Files: `qa/run-qa.mjs`, `qa/gates/*.mjs`, `qa/gates/*.py`, `qa/fixtures/**`, `gallery/build.mjs`, `gallery/template.html`, `docs/QA.md`

Acceptance:
- The approved v2 MP4 passes every gate.
- Each fault fixture fails exactly its own gate. Fixtures: strobe, a white frame over 25% of the screen, seam jump, text in the right rail, an upscaled sprite, a recoloured body, a tinted or rescaled logo, a -12 LUFS mix, a 300 ms offset, a breath-hold line, '2 AM' on an afternoon template, a duplicate, a missing DRAFT mark.
- QA takes 90 s or less per 15 s video. SSIM and dE2000 are implemented in numpy/OpenCV (no scikit-image, no libvmaf).
- Thresholds calibrated on v2 alone are tagged provisional, with warn bands.
- The gallery opens offline. It shows the preview, spec, badges, contact sheet, filmstrips, the seam played twice, and a v2 side-by-side. It exports decisions.json with reason codes.

#### WP-06 — Planner core, ledger, copy lint and CLI (18 h; depends on WP-00)

Build a seeded, capability-gated spec planner with brand-safe copy lint, fingerprinting and an append-only ledger.

Files: `planner/{pick,capabilities,lint-copy,fingerprint,distance,schedule,ledger}.mjs`, `planner/metrics/fredoka-metrics.json`, `tools/font-metrics.mjs`, `ledger/*.jsonl`, `cli/hm.mjs (lib validate, library coverage, plan, spec, compile, approve, reject, export)`, `tests/property/specs.test.mjs`

Acceptance:
- Only approved cells, packs and presets can be sampled (review mode allows candidate cells). Primary Mallows get weight 3 and secondaries 1. The signature gag is used about 40% of the time where feasible. Template intensity caps are honoured.
- Copy lint is a superset of the library validator, adding: the tone/topic blocklist, Latin-1 only, time-word to time-of-day matching, lowercase 'hushmallow', breath-hold regexes, reading-time pre-checks, and no brand, app or song names.
- 10k specs are generated in under 10 s, byte-reproducible from the seed. All bad-copy fixtures are rejected. Fingerprints are stable across runs.
- Property test: 1,000 specs over enabled cells compile through G-SPEC and G-DIR with 0 violations.
- hm export writes final.mp4, metadata.json and a caption.txt built only from library strings plus the owner-curated hashtag list in brand.json. Nothing is generated and nothing is auto-posted.

#### WP-07 — Generic derivation refactor (Python) (12 h; depends on WP-00)

Turn derive_noomi_hires.py into a shared module with per-family feature finders, so every Mallow's asset work can start early without risking Noomi.

Files: `tools/derive/common.py`, `tools/derive/derive_mallow.py`, `tools/derive/asset_qa.py`, `tools/derive/finders/closed_tube.py`, `tools/derive/finders/{open_socket,spiral,heavy_lid}.py (stubs)`, `tools/derive/configs/noomi.json`, `tools/derive_noomi_hires.py (thin wrapper)`

Acceptance:
- derive_mallow.py --mallow noomi produces files byte-identical to assets/noomi/*. Two runs give identical hashes.
- asset_qa.py reproduces Noomi's QA pack and implements the shared asset-gate metrics.
- Runtime is within +10% of the Noomi baseline. Runs take the heavy-job lock and are scheduled outside render windows.

### M1 First new Noomi content: T01 variants, T26, T22 (weeks 4-5)

Get the owner's taste feedback early: 6 publish-quality Noomi finals built from a small set of hand-tuned new moves. This proves the face system, soft-body DOFs, glass prop kit, tuning-matrix workflow and movable loop seam at the v2 bar.

**Owner review:** M1 gate, about 60 min:
- 6 finals in the gallery: m1-01 T01 golden (side-by-side with v2); m1-02 T01 15 s with a new hook, lines and seed; m1-03 T01 12 s; m1-04 T26 15 s; m1-05 T22 15 s; m1-06 T26 20 s with 4 lines.
- The prop sheet: every Glass Prop Kit look, shown in Moonmilk light.
- A Noomi move reel and min/default/max extremes sheets for each new cell. Owner ticks promote cells to approved.
- Junction-pair sheets.
- Review of how the gallery and decisions flow works.
- The canonical-art answer for Loomi is needed by the end of M1.

#### WP-10 — Face unification for Noomi (18 h, renders; depends on WP-02, WP-03)

Make the face system data-driven: canonical parameters, adapters, a style registry and a closed-tube style built from data, with Noomi pixel-identical to the WP-02 output.

Files: `engine/face/{index,params,adapters,cache,tube,glow,iris-galaxy,blush,tears}.js`, `engine/face/styles/closed-tube.js`, `engine/face/mouths/tube-line.js`, `composer/personality.js`, `tests/unit/param-map.test.mjs`

Acceptance:
- The Noomi final profile is bit-identical to the WP-02 output, or within 60 dB PSNR. The rest-test diff is no worse than baseline.
- Noomi keeps her v2 colours: source-over blush rgba(255,110,200) at 0.42 x blush, tongue gradient #ff8ab0 to #e2557f, mouth inside #1a0a3a.
- A missing face JSON is a hard error (R13). Face.box is derived from the face spec, including glow, brow lift and eye scale (R15). The catchlight follows the realm key light (identity for Moonmilk).
- The new parameters tears, wet, pout, mouthTremble (6 Hz or below), browAsym, browCurve, cheekPuff and tongue all render without NaN. sweat and '!' are hard-disabled.
- The app-preset mapping table covers all 27 expressions.js presets for all 7 Mallows (test). An expression contact sheet is produced for Noomi.

#### WP-11 — SoftBody DOFs and deformation limits (18 h, renders; depends on WP-02)

Add shrink, slide, sink and meltSkew so the new gags and rituals can be built, with limits enforced at compile time.

Files: `engine/softbody.js`, `engine/renderer/passes/mesh.js`, `engine/renderer/passes/reflection.js`, `composer/validate.js`

Acceptance:
- shrink (uniform scale), slide (x offset), sink (waterline clip with a meniscus ring; the mouth-above-line constraint is checked) and meltSkew all work. The reflection and contact shadow follow slide and sink.
- The 240 Hz evaluator enforces height of 0.6 or more, stretch of 1.3 or less and shrink of 0.6 or more, and passes synthetic sweeps.
- The v2 golden is unchanged when the new DOFs are 0.

#### WP-12 — Glass Prop Kit, particle shapes and prop sheet (30 h, renders; depends on WP-02)

Generalise the v2 glass bubble into a kit (GlassCard, GlassTile, GlassBlock, SoftCloud, LightShape) with pure controllers, a new set of particle shapes, and an owner prop sheet.

Files: `engine/props/{glass-card,glass-tile,glass-block,soft-cloud,light-shapes}.js`, `engine/props/controllers/{orbit,rise,lane,stack}.js`, `engine/props/content/{clock-face,battery,week}.js`, `engine/particles/shapes.js`, `engine/renderer/passes/{glass,cloud,particles}.js`, `tools/prop-sheet.mjs`

Acceptance:
- GlassCard has per-instance depth sorting (R17), content-hashed textures and a sepia 'memory' skin. Text is crisp at 1:1.
- Each primitive costs 25 ms or less per sub-frame with 3 instances. Light shapes ramp over 0.3 s or more and never switch on hard.
- Particle shapes star4, heart, droplet, flat and round rings, ribbon, puff and z-glyph exist; glyphs have no scale wobble. Particles are analytic and loop-safe.
- Controllers are pure and importable by the composer, so look-at targets and audio pans use the same positions.
- The prop sheet is rendered for the owner. It contains no phones, real UI, brands or people. The v2 golden is unchanged.

#### WP-13 — Tuning-matrix workflow and the M1 moves on Noomi (36 h, renders; depends on WP-03, WP-10, WP-11, WP-12)

Hand-tune the first new moves on Noomi, with approved parameter ranges, extremes sheets, junction sheets and the movable seam.

Files: `composer/moves/gags/{G-DOUBLETAKE,G-FLOP}.js`, `composer/moves/metaphors/M-DREAMBUBBLES.js`, `composer/moves/rituals/{R-SAVOUR,R-DRIFT}.js`, `composer/moves/loops/{LP-RETRIGGER,LP-OBJECT}.js`, `composer/moves/arcs/{A-DIM-SOFT,A-GREY-CLEAR}.js`, `composer/moves/cameras/C-HOLD-WIDE.js`, `library/tuning-matrix.json`, `tools/cell.mjs`, `tools/beat-sheet.mjs`

Acceptance:
- Each move has a parameter schema, Noomi tuning and approved [min, max, default] ranges. Seeded parameters are sampled inside those ranges with a Beta(3,3) bias.
- A cell's version is the hash of its compiled channel output on a canonical fixture set. A refactor that doesn't change the output keeps the cell's status.
- hm cell renders a 4-6 s draft test card with channel plots. hm beat-sheet renders min/default/max extremes sheets and junction-pair sheets for every gag-to-metaphor and metaphor-to-ritual pair used by T26 and T22.
- G-DIR is clean, including impact landing by 1.0 s, no dead interval longer than 1.2 s, and C1 continuity.
- RETRIGGER and OBJECT loops with P>0 pass loop closure (1e-3 or better) and the seam gate. T26 and T22 compile at 12, 15 and 20 s.

#### WP-14 — Loop-safe Moonmilk world terms (12 h, renders; depends on WP-02)

Make every animated world term periodic over D, so 10, 12 and 20 s videos loop seamlessly.

Files: `engine/worlds/lake.js`, `engine/worlds/glsl/{noise,water,sky,clouds}.js`, `library/realms/moonmilk-cove.json`

Acceptance:
- uLoop always equals D (the fallback of 15 is removed).
- Chop runs on a periodic domain (fixes R6). Star twinkle frequencies are quantised to k/D. Cloud drift uses a periodic domain offset.
- World pass alone at t=0 against t=D: maximum difference 1/255 or less with grain off, for D = 10, 12, 15 and 20.
- chopMode 'v2' is kept for golden and compat only. New videos use periodic chop, and the PSNR difference is documented.

#### WP-15 — M1 review batch and audit (9 h, renders; depends on WP-04, WP-05, WP-06, WP-13, WP-14)

Render and QA the 6 M1 finals plus the review materials, and audit them against the AUDIT-v2 questions.

Files: `runs/m1/**`, `runs/m1/index.html`

Acceptance:
- All 6 finals pass every gate. Review-only renders carry the INTERNAL mark.
- The gallery includes the v2 side-by-side, move test cards, extremes and junction sheets, the prop sheet and benchmark numbers.
- Machine time is about 2.5 h or less, including re-renders.

### M2 Noomi at depth and production start (weeks 6-9)

The full Tier A move set and all of Moonmilk Cove (4 times of day, weather and dressing taken from the app realm) are at the v2 bar. The variety engine and production operations are ready. 11 Noomi templates can be published, at a capped cadence.

**Owner review:** M2 gate, about 90 min:
- Batch A: 10 Noomi finals in Moonmilk Cove, covering all 4 times of day, all 4 durations, all 9 Tier A gags, 4 loop strategies and 9 rituals.
- A Moonmilk contact sheet of time of day x weather x dressing, against the app reference stills.
- Extremes sheets for every new Noomi cell.
- 24 drafts showing a simulated 8-day posting plan.
- 20 calibration pairs, each rated 'feels the same / different'.
- On approval, the Noomi pack and Moonmilk presets are approved and production starts under the Q1 answer.

#### WP-19 — App realm reference capture and plate-capture spike (12 h, renders; depends on WP-01)

Load each app realm read-only to get reference stills (for the realm-likeness gate) and decide, per realm, whether set pieces are captured as plates or hand-ported.

Files: `tools/realm-reference.mjs`, `qa/golden/realms/<realm>/<mood>.png`, `engine/worlds/plates/<realm>/captured/*.png`, `docs/REALMS.md`

Acceptance:
- All 7 app realm factories are loaded read-only: fetched as text and patched in memory, with a seeded RNG and stubbed requestAnimationFrame / performance.now driven from a fixed t. Each renders at 1080x1920 for at least 5 fixed (mood, p) states.
- Static scene layers are captured at 1.15x native resolution, giving headroom for zoom up to 1.10.
- A capture-or-port decision is recorded per realm. The app tree hash is unchanged.

#### WP-20 — Moonmilk Cove in full (36 h, renders; depends on WP-14, WP-19)

Make Noomi's realm varied within the app's own design: 4 times of day, weather, dressing and the aurora payoff.

Files: `engine/worlds/lake.js`, `engine/worlds/plates/moonmilk/{headland-lighthouse,far-isle,pearly-shore,shells-pearls}.js`, `engine/worlds/glsl/{aurora,haze}.js`, `engine/themes.js`, `library/realms/moonmilk-cove.json`

Acceptance:
- Times of day dusk, night, late-night and pre-dawn each have a palette triple and a light rig. Weather options are clear, mist and scud.
- Dressing comes only from the app's moonmilk-cove.js: headland with a slow periodic lighthouse beam, far isle, pearly shore, shells and pearls glow, fireflies, dream bubbles.
- Clutter budget: at most 2 dressing items plus the payoff, at most 60 ms, all outside the text safe zones and the right rail.
- Aurora ribbon transform ramps over 1.5 s or more with alpha 0.35 or less. The 'strike' pulse becomes a falling star, never a flash.
- World pass is 0.25 s per frame or less typically, and 0.35 s or less in the worst case (hm bench realm --worst). Realm likeness against WP-19 is dE 10 or less (warn) and 14 or less (fail).
- The contact sheet is produced for the owner. The T01 golden still passes.

#### WP-21 — Tier A gags on Noomi (30 h, renders; depends on WP-13, WP-11)

Hand-tune G-JELLYFREEZE, G-DEADPAN, G-SINK, G-DEFLATE, G-CRINGE and G-MELT as Noomi cells.

Files: `composer/moves/gags/{G-JELLYFREEZE,G-DEADPAN,G-SINK,G-DEFLATE,G-CRINGE,G-MELT}.js`, `library/tuning-matrix.json`

Acceptance:
- Each gag has a test card and an extremes sheet, and its Noomi cell is at least candidate. G-DIR is clean, with impact by 1.0 s.
- Template intensity caps are respected (T09 at 0.6 or less). G-SINK keeps the mouth above the waterline.

#### WP-22 — Tier A metaphors on Noomi (36 h, renders; depends on WP-12, WP-13)

Build M-ECHO, M-STACK, M-CLOUD, M-GLOW, M-CLOCK, M-METER and M-WEEK on top of the Glass Prop Kit.

Files: `composer/moves/metaphors/{M-ECHO,M-STACK,M-CLOUD,M-GLOW,M-CLOCK,M-METER,M-WEEK}.js`, `engine/props/controllers/stack.js`, `library/tuning-matrix.json`

Acceptance:
- At most 3 readable glass texts at once. Each readable text is visible for at least max(1.0 s, 0.25 + 0.05 s per character) at alpha 0.9 or more, moving 150 px/s or slower.
- Props cover 15% or less of the Mallow and 5% or less of the face box. Test cards and extremes sheets are produced, and G-DIR is clean.

#### WP-23 — Rituals, turns, loops, cameras and arcs (42 h, renders; depends on WP-13, WP-20)

Complete the Tier A structural set so that every Noomi template can be assembled.

Files: `composer/moves/rituals/{R-CLOUDWRAP,R-COSY,R-FLOAT-AWAY,R-SQUISH,R-STRETCH,R-RAINLIFT}.js`, `composer/moves/turns/{TURN-STOP,TURN-SIGH}.js`, `composer/moves/loops/LP-CYCLE.js`, `composer/moves/cameras/{C-FOLLOW-SOFT,C-PULL-BACK,C-LOW-HERO}.js`, `composer/moves/arcs/{A-BUSY-STILL,A-FLAT-GOLDEN,A-BRIGHT-GLOW,A-DIM-CONE-OPEN,A-DUSK-DIP-GOLD,A-PREDAWN-SUNRISE}.js`

Acceptance:
- Every ritual ends by driving the realm transform p. Wraps keep 95% or more of the face visible. The R-BREATH rules hold.
- LP-CYCLE passes the seam gate together with the DUSK-DIP-GOLD and PREDAWN-SUNRISE arcs.
- Cameras stay within zoom 0.95-1.10, change zoom by 0.04/s or less, pan 40 px/s or less, and never roll.
- All 9 arcs are keyframed on the world dials and end equal to the cover. Exposure changes by 12% or less, ramped over 0.5 s or more.

#### WP-24 — Template recipes, coverage report and library smoke test (12 h, renders; depends on WP-21, WP-22, WP-23)

Add staging hooks for specific templates and prove that every eligible combination builds.

Files: `composer/recipes/{T02,T16,T28}.js`, `cli/hm.mjs (library coverage)`, `tests/smoke/library.mjs`

Acceptance:
- hm library coverage lists 11 renderable Noomi templates: T01, T02, T03, T04, T09, T16, T17, T22, T26, T27 and T28.
- Each recipe file is 50 lines or fewer (for example, T02's sun lurch during the double take).
- Smoke test: every eligible template x Mallow x duration compiles with 0 errors, and a 3 s draft per template x Mallow passes G-DRAFT.

#### WP-25 — Variety and uniqueness engine (21 h; depends on WP-06, WP-05)

Make long runs feel fresh without leaving the approved space.

Files: `planner/{weights,reserve,distance,calibrate}.mjs`, `qa/gates/dupes.py`, `ledger/{reservations,decisions}.jsonl`, `cli/hm.mjs (review import, plan --days)`

Acceptance:
- Least-recently-used weights per slot: w = base x (1 - e^(-age/tau)), with tau 60 for hooks, 6 for gags and 3 for time of day. Copy reservations work across batches.
- Semantic hook cooldown treats token Jaccard of 0.5 or more as the same hook. The grief-pairing rule is enforced. Weather and dressing are slots.
- Weighted slot distance is applied on top of the library's 3-slot rule. The perceptual signature uses 7 anchor frames, and the cover frame must be at Hamming distance 14 or more from each of the last 30 posts. A calibrate step fits thresholds from owner-rated pairs.
- Sequencing is applied over the unlocked Mallow set, with a cadence cap per channel.
- Imported reason codes demote cells for acting, timing and face to candidate. The only automatic down-weighting is a 'sameness' penalty with a floor of 0.5 and a 30-day decay.
- G-COST prediction from dry-run counts, with a G15 refit. A 90-day simulation at the capped cadence passes every rule.

#### WP-26 — Batch operations hardening (12 h, renders; depends on WP-01, WP-05)

Reliable unattended nightly runs on the 4-core machine.

Files: `render/farm.mjs`, `cli/hm.mjs (status, prune, bench realm)`, `tests/smoke/nightly.mjs`, `tests/determinism/*`, `docs/RUNBOOK.md`

Acceptance:
- 2 workers sustain 7 or more finals per hour on a lake-family mix (5 or more per hour if WP-02 only reached 12 min).
- The disk guard warns below 5 GB free and refuses below 3 GB. Retention prunes drafts after 7 days and masters (back to the spec) 30 days after posting. Re-rendering one pruned sample is verified identical.
- Nightly smoke covers every candidate and approved cell plus the fixtures. A crash-recovery test passes.

#### WP-27 — Batch A and QA threshold recalibration (12 h, renders; depends on WP-24, WP-25, WP-26)

The first review batch built for production, plus calibration data.

Files: `runs/batch-A/**`

Acceptance:
- 10 finals and 24 drafts, with all gates green.
- Coverage: all 4 times of day, all 4 durations, all Tier A gags, 4 loop strategies and 9 rituals.
- 20 calibration pairs are produced. Provisional QA thresholds are refitted on 12 or more approved videos and logged in docs/QA.md.
- Machine time is about 3.5 h or less.

### M3 Lake family: Blubi and Loomi (weeks ~8-13; asset stream starts in the M1 window)

Two more publishable Mallows in their own realms (Raindrop Lagoon, Blue Drift), using the closed-tube face pipeline, plus the Tier B metaphors. 22 templates are unlocked, and the posting mix gets closer to the library's sequencing rules.

**Owner review:** Checkpoints inside the milestone:
- Blubi pack: neutral A/B flip clip, expression sheet, a 6-8 s test reel rendered in Raindrop Lagoon, an asset QA pack, and a still of the invented open-eye look.
- Loomi pack: the same, rendered in Blue Drift.
- Realm stills: time of day x weather, against the app references, and contrast fixes.
- The day-ink caption style.

M3 gate is Batch B, 12 finals:
- 4 Noomi videos on Tier B templates (T14, T20, T21, T18).
- 4 Blubi videos (T09, T23, T13, T28).
- 4 Loomi videos (T12, T07, T03, T21).
- T03 rendered on all three Mallows, to judge the personality layer.
- A 7-day posting plan across the 3 Mallows.

#### WP-30 — Blubi asset derivation (24 h; depends on WP-07)

A clean hi-res Blubi body and face JSON that pass every asset gate.

Files: `tools/derive/finders/closed_tube.py`, `tools/derive/configs/blubi.json`, `assets/blubi/{blubi-art,blubi-clean,blubi-clean-mask,blubi-height,blubi-normal}.png`, `assets/blubi/blubi-face.json`, `output/asset-qa/blubi/**`

Acceptance:
- Applies the fixes from the asset report: B/luma detector finds exactly 5 strokes; zone A is the core plus 10 px; pedestal un-blend; G/B glow fit; cheek handled as a separate layer; anchoring to the background L and a sigma-12 residual pass; source pools and a reuse penalty.
- Nothing changes outside the mask, and alpha is identical. Mean R in zones A and B is within +/-3 of the clean ring. Cross-stroke profiles are flat within +/-1.5. Band energy is 0.9-1.1. The cheek refit is within 1%. No ghosts appear in the 8-direction lighting sweep.
- Noomi still derives byte-identical.

#### WP-31 — Loomi asset derivation (24 h; depends on WP-07)

A clean hi-res Loomi body (the canonical design from Q2) and face JSON.

Files: `tools/derive/configs/loomi.json`, `assets/loomi/**`, `output/asset-qa/loomi/**`

Acceptance:
- Fixes F1-F9 are applied. Stretched-channel QA: median R above the eyes is 4 or less, the low-pass step is 2 levels or less, and the energy ratio is 0.85-1.15. Ghost correlation is below 0.05. The cheek refit is within +/-1 px. RGB is zeroed where alpha is below 2.
- Blocked until the owner answers the canonical-art question. The default is the 2-arc hi-res look.

#### WP-32 — Closed-tube generalisation for Blubi and Loomi (30 h, renders; depends on WP-10, WP-30)

Extend the closed-tube style to Blubi and Loomi: their stroke counts, materials, glows and expressions.

Files: `engine/face/styles/closed-tube.js`, `engine/face/{tube,glow,tears,blush}.js`, `engine/face/mouths/tube-line.js`, `library/mallows/{blubi,loomi}.json`

Acceptance:
- Brows are always visible from a cached layer, with brow lift coupled to eye opening. Rest curves are cubic. Taper, specular profile and beads are set per stroke. Glow can be drawn on both sides. Cyan screen-blended under-glow. Loomi's mouth under-band follows the lower lip. Tears and wet eyes, pout, tremble at 6 Hz or below, and eye gates per Mallow.
- Rest-match: Blubi dE mean 2 or less with p95 6 or less; Loomi dE mean 1.5 or less with p95 4 or less; centrelines within 1-2 px.
- Expression sheets show no brow/eye collision. Noomi's golden output is unchanged.

#### WP-33 — Raindrop Lagoon realm (30 h, renders; depends on WP-20, WP-19)

Blubi's realm, built on the lake family.

Files: `engine/worlds/plates/raindrop-lagoon/*.js`, `engine/worlds/glsl/{cushion-hills,beads,rain}.js`, `library/realms/raindrop-lagoon.json`

Acceptance:
- Times of day: blue-hour, dusk, rainy-evening, night and misty-morning. Pastel cushion hills. Hanging beads done as cheap analytic refracting discs inside the world pass. Lily pad and cushion stage. Rain drives ripples. The payoff turns beads into light.
- World pass is 0.32 s per frame or less. Realm likeness passes. The loop test passes at all 4 durations. Owner realm stills are produced.

#### WP-34 — Blue Drift realm, sun-key light rig and day-ink caption style (30 h, renders; depends on WP-20, WP-19)

Loomi's daylight realm, with figure-ground contrast fixes.

Files: `engine/worlds/plates/blue-drift/*.js`, `engine/worlds/glsl/{sun,lenticular,gust}.js`, `engine/renderer/passes/mesh.js (key-rim rig uniforms)`, `engine/themes.js (day-ink)`, `library/realms/blue-drift.json`

Acceptance:
- Times of day: morning, midday, afternoon and golden. Sun with halo, islet plates with reflections, river-stone stage, cat's-paw gusts, seed fluffs and birds as particles.
- Sun-key rig with higher ambient; the Moonmilk moon-rim values stay exact.
- Contrast preset: golden bias, darker foreground water band and a rim light. Figure-ground dE is 12 or more. Day-ink captions (deep ink fill, soft light halo, no outline, no backdrop blur) reach 4.5:1 or better.
- World pass is 0.30 s per frame or less.

#### WP-35 — Personality profiles and tuning cells for Blubi and Loomi (42 h, renders; depends on WP-21, WP-22, WP-23, WP-32, WP-33, WP-34)

Tune every move that the unlocked templates need, per Mallow, so each character acts like itself.

Files: `composer/moves/**/*.js (tuning tables only)`, `composer/moves/gags/G-SPLASHSIT.js`, `library/tuning-matrix.json`, `library/sound/{blubi,loomi}.json`

Acceptance:
- Every cell needed by the M3 templates for Blubi and Loomi is approved, with extremes sheets ticked. At least 70% of core cells are at candidate or better for each Mallow.
- Loomi under-reacts (amp 0.6, tempo 0.8). Blubi's signature is tears.
- The T03 cross-Mallow sheet is reviewed. Kit gestures and beds are checked for each Mallow.

#### WP-36 — Tier B metaphors (42 h, renders; depends on WP-12, WP-13)

Unlock T05, T11, T14, T18, T20, T21 and T25.

Files: `composer/moves/metaphors/{M-FOG,M-NOISE,M-BUZZ,M-FARGLOW,M-FRAMES,M-COSYPILE,M-TEARS,M-DOTS}.js`

Acceptance:
- M-NOISE has 6 elements or fewer and stays low contrast. M-DOTS takes 1.2 s or more per cycle. M-FRAMES shows abstract scenes only. M-TEARS arcs are gentle.
- Each has test cards and extremes sheets on Noomi and Blubi. G-DIR is clean.

#### WP-37 — Batch B (12 h, renders; depends on WP-35, WP-36)

Owner review of the three-Mallow lake family.

Files: `runs/batch-B/**`

Acceptance:
- 12 finals with all gates green. A 7-day plan that satisfies every sequencing rule over the 3 unlocked Mallows.
- Machine time is about 4 h or less.

### M4 Open-socket family: Boppo and Pipzi (weeks ~12-18; derivation starts in M3)

Two high-energy Mallows in open-ground realms (Sunpop Orchard, Spark Festival), plus the Tier C moves. Every one of the 28 templates becomes playable.

**Owner review:** Checkpoints:
- Pipzi pack, then Boppo pack: neutral A/B flip, expression sheet, test reel in the Mallow's own realm, and invented-look stills (closed eyes, closed mouth).
- The icon sheet for M-ICONS and M-TABS.
- Realm stills, with the firework rules checked.

M4 gate is Batch C, 12 finals: 4 Boppo, 4 Pipzi, and 4 mixed on the newly unlocked templates (T06, T08, T10, T15, T19, T24), in a valid 10-post order across 5 Mallows.

#### WP-40 — Open-socket face style, cavity and grin mouths, native iris sprites (36 h, renders; depends on WP-32)

Shared face code for painted open eyes and open mouths.

Files: `engine/face/styles/open-socket.js`, `engine/face/mouths/{cavity,grin}.js`, `engine/face/iris-sprite.js`, `engine/face/lids.js`

Acceptance:
- Elliptical sclera with the measured gradient. Crimson upper and cream lower socket lighting drawn along the lid curves. No lash line while the eye is open.
- Catchlights are fixed to the light. Closed states are drawn as maroon tubes.
- The renderer asserts eyeScale x irisScale x displayScale is 1 or less, and the planner reads each pack's display cap.
- A cached redraw takes 75 ms or less. The measured neutral faces render from JSON.

#### WP-41 — Pipzi asset derivation (30 h; depends on WP-07)

Clean hi-res Pipzi body, iris sprites and face JSON.

Files: `tools/derive/finders/open_socket.py`, `tools/derive/configs/pipzi.json`, `assets/pipzi/**`, `output/asset-qa/pipzi/**`

Acceptance:
- Asset report checks pass: band energy 0.85-1.15 in the G and B channels, cell period within +/-15%, glint density within +/-25%, dE below 2, cheek glow model error below 3%, identical alpha snap in art and clean.
- Rest-match: centres within 1.5 px, SSIM above 0.9, and no spike in the rest-fade check.

#### WP-42 — Boppo asset derivation (30 h; depends on WP-41)

Clean hi-res Boppo body (the hi-res grin, per Q2), iris sprites and face JSON.

Files: `tools/derive/configs/boppo.json`, `assets/boppo/**`, `output/asset-qa/boppo/**`

Acceptance:
- No two 48x48 blocks correlate above 0.92. G-channel energy is within +/-15%. Cheek fit error is below 8 levels.
- Rest-match: median dE 2 or less, p95 6 or less, catchlight IoU 0.9 or more, outlines within 2 px.

#### WP-43 — Open world family and Sunpop Orchard (42 h, renders; depends on WP-34, WP-19)

Opaque-ground world module (reflection passes skipped) and Boppo's daylight realm.

Files: `engine/worlds/open.js`, `engine/worlds/plates/sunpop-orchard/*.js`, `engine/worlds/glsl/{billow,rainbow,beams}.js`, `library/realms/sunpop-orchard.json`

Acceptance:
- Opaque ground skips the reflection passes, and this is measured in the cost model.
- Cloud-sea surface, floating island plates with swaying trees, meadow stage, bouncing fruit, sun and sun shafts, and a rainbow payoff.
- Contrast preset (green meadow, cool rim): figure-ground dE 12 or more. World pass 0.30 s per frame or less.

#### WP-44 — Spark Festival (42 h, renders; depends on WP-43)

Pipzi's night festival realm.

Files: `engine/worlds/plates/spark-festival/*.js`, `engine/worlds/glsl/{lanterns,fireworks}.js`, `library/realms/spark-festival.json`

Acceptance:
- Plum hills, slow Ferris wheel, tents and carousel with warm interiors, catenary lantern strings, sky lanterns, confetti and dais. No pond.
- Fireworks rise over 0.45 s or more and fade over seconds. Sky glow stays local. The flash gate shows 0 flashes. World pass 0.30 s per frame or less.

#### WP-45 — Tier C moves (88 h, renders; depends on WP-40, WP-43)

Signature and high-energy gags, metaphors and rituals.

Files: `composer/moves/gags/{G-LAUNCH,G-SPARKPOP,G-PUFF,G-BONK,G-WEEBLE,G-SCOOT,G-PING}.js`, `composer/moves/metaphors/{M-SWELL,M-SPOTLIGHT,M-JITTERS,M-FORK,M-PEBBLES,M-TABS,M-LOOM,M-ICONS}.js`, `composer/moves/rituals/{R-SUNSOAK,R-LANTERN,R-WIGGLE,R-SETDOWN,R-BOOP-SIZE}.js`, `engine/props/content/icons.js`

Acceptance:
- Each move has test cards and extremes sheets on 2 Mallows. G-DIR is clean.
- Sparks stay local. The spotlight fades in over 0.3 s or more. R-WIGGLE sways at 2 Hz or slower. The owner approves the icon sheet before M-ICONS or M-TABS are used.

#### WP-46 — Tuning cells for Boppo and Pipzi (42 h, renders; depends on WP-41, WP-42, WP-44, WP-45)

Personality and acting for the high-energy Mallows across all unlocked templates.

Files: `composer/moves/**/*.js (tuning tables only)`, `library/tuning-matrix.json`, `library/sound/{boppo,pipzi}.json`

Acceptance:
- Every cell needed by unlocked templates for these two Mallows is approved. Boppo: amp 1.25, tempo 1.2, idle bounce. Pipzi: amp 1.2, tempo 1.25, sparks. Deformation clamps hold, and captions stay static while the Mallow bounces.

#### WP-47 — Conditional performance pass 2 (30 h, renders; depends on WP-40)

Recover the render budget if open-socket faces or the new realms push the final above 12 min.

Files: `engine/face/sdf-tube.js`, `engine/worlds/glsl/noise-tex.js`, `engine/stage.js`

Acceptance:
- Only triggered if an open-style face redraw exceeds 75 ms or a 15 s final exceeds 12 min.
- The SDF face path matches or improves on the rest-test for every approved Mallow. Final render returns to 9 min or less.

#### WP-48 — Batch C (12 h, renders; depends on WP-46)

Owner review of the open-socket family and full template coverage.

Files: `runs/batch-C/**`

Acceptance:
- 12 finals with all gates green. A valid 10-post order across the 5 Mallows. Machine time about 4 h or less.

### M5 Zuzu and Glitzi, full cast (weeks ~17-23)

The two Mallows with unique face pipelines are live in their floor realms (Spiral Observatory, Static Storm). All 7 Mallows can be published and the library's sequencing rules are fully satisfiable.

**Owner review:** Checkpoints:
- Zuzu pack: canonical proportions, fixed spiral highlights, the replacement hue shift, closed-eye and closed-mouth stills, and a spin sweep reel.
- Glitzi pack: eyeball-top stills at a lid raise of 28 px or less, glitch styling, and a filmstrip of the burst policy.
- Realm stills for both realms. Static Storm uses soft cloud glows only, with no lightning bolts.

M5 gate is Batch D: 14 finals, every Mallow twice in its own realm, 12 or more distinct templates, all durations, delivered in a valid two-week posting order. Docs are complete.

#### WP-50 — Spiral face style and open-lip mouth (36 h, renders; depends on WP-40)

Zuzu's procedural spiral eyes and open mouth.

Files: `engine/face/styles/spiral.js`, `engine/face/mouths/open-lip.js`

Acceptance:
- Per-pixel phase field built from the measured fit, with a correction term and a 64-step colour table. Highlights are fixed in screen space at 4-5.5% coverage. Spin motion blur is computed analytically. Socket layers fade as the eye closes.
- Spin is 1 turn/s or less (0.3 or less when the disc covers more than 25% of the frame), with ramps of 0.5 s or more and a whole number of turns per loop.
- The rest-match exception for the disc: dE 5 or less and bands within 2 px. The rest-fade spike check passes.

#### WP-51 — Zuzu asset derivation (36 h; depends on WP-41)

Clean hi-res Zuzu body (canonical per Q2) and face JSON.

Files: `tools/derive/finders/spiral.py`, `tools/derive/configs/zuzu.json`, `assets/zuzu/**`, `output/asset-qa/zuzu/**`

Acceptance:
- Thin-plate shading prior. No disc ghost in the low-pass or high-pass views. Detail ratio 0.8-1.25. The repeat-patch detector passes. Cheeks are extrapolated as round blush. The upper-left gloss is protected.

#### WP-52 — Heavy-lid style, emission layer, pad UV warp and groove ribbon (48 h, renders; depends on WP-40)

Glitzi's layered face.

Files: `engine/face/styles/heavy-lid.js`, `engine/face/mouths/groove-ribbon.js`, `engine/face/emission.js`, `engine/renderer/passes/mesh.js (lidXform weight-map warp, emission skips key light)`

Acceptance:
- Pads move up to +/-28 px and +/-7 degrees, with cell stretch of 25% or less. Lid-skin sprites are used for blinks. Surprise raises the pads and never grows the eyeball.
- Emission gain 0.3-1.6. Glitch bursts are displacement only, at most 1 every 2 s, and brightness-preserving. The flash gate shows 0 flashes.
- Recombination dE mean below 2 and p99 below 6. Eye SSIM 0.9 or more.

#### WP-53 — Glitzi asset derivation (layer split) (36 h; depends on WP-41)

Clean body, emission layer, lid weight map, lid-skin, iris and mouth-ribbon sprites.

Files: `tools/derive/finders/heavy_lid.py`, `tools/derive/configs/glitzi.json`, `assets/glitzi/**`, `output/asset-qa/glitzi/**`

Acceptance:
- Emission is separated first. The mouth fill uses transplanted patches with min-cut seams and seamlessClone. Repeat-patch NCC is 0.95 or less. No magenta appears outside the emission mask. Glitch rows are re-measured on the hi-res art.

#### WP-54 — Floor world family and Spiral Observatory (48 h, renders; depends on WP-43, WP-19)

Glossy-floor world module and Zuzu's dome realm.

Files: `engine/worlds/floor.js`, `engine/worlds/plates/spiral-observatory/*.js`, `engine/worlds/glsl/{galaxy,armillary,lens}.js`, `library/realms/spiral-observatory.json`

Acceptance:
- Log-spiral galaxy that is ghosted when unclear and crisp when clear. Armillary rings drawn as SDFs. The lens reuses the glass shader. Dome, telescope and arcade plates. Shutter reveal.
- The galaxy passes the stripe/pattern check. World pass 0.35 s per frame or less.

#### WP-55 — Static Storm (48 h, renders; depends on WP-54)

Glitzi's storm realm, with no lightning or flicker.

Files: `engine/worlds/plates/static-storm/*.js`, `engine/worlds/glsl/{mammatus,cracks,constellations}.js`, `library/realms/static-storm.json`

Acceptance:
- Mammatus cloud deck. Cracked glass floor that heals into a gold mandala. Constellations snap into place on 'clear'. Crystal plates and shards. Stage halo plus a cyan rim.
- The 'strike' pulse becomes a slow soft glow; there are no bolts. Row displacement preserves brightness. The flash gate shows 0 flashes. World pass 0.35 s per frame or less.

#### WP-56 — Signature moves and tuning cells for Zuzu and Glitzi (60 h, renders; depends on WP-50, WP-51, WP-52, WP-53, WP-55)

Complete the move library and tune every cell needed for the last two Mallows.

Files: `composer/moves/gags/{G-GLITCHSLIP,G-SPINUP}.js`, `composer/moves/rituals/{R-SPIRALSLOW,R-DEFRAG,R-NAMEIT}.js`, `library/tuning-matrix.json`, `library/sound/{zuzu,glitzi}.json`

Acceptance:
- Every cell needed by templates where Zuzu or Glitzi is primary or secondary is approved.
- Glitzi and Zuzu use their own kit scales (Bb4 minor pentatonic; G4 Hirajoshi), and resolutions still rise or arch.
- R-NAMEIT uses only the template's lowercase everyday feeling words, never a diagnosis.
- The library smoke test passes for all 7 Mallows.

#### WP-57 — Batch D, completed docs, operations handover (18 h, renders; depends on WP-56)

Show the full cast in production and finish the documentation.

Files: `runs/batch-D/**`, `docs/*.md`, `README.md`, `docs/CHANGELOG.md`

Acceptance:
- 14 finals with all gates green, in a valid two-week posting order.
- Docs complete: ARCHITECTURE, MOVES, FACE-STYLES, REALMS, SOUND, QA, RUNBOOK, OWNER-DECISIONS, BRAND-RULES, RISK-FIX-TABLE.
- A monthly regression render of T01 and the approved batches is scheduled.

## Risks

- **The fork silently changes v2.** Mitigation: v2 is hash-locked. G-STATE, G-CUES, G-PLAN and G-PIXEL run on every engine or composer commit. WP-03 integration is the lead's job and is done first. The legacy route keeps rendering the frozen module.
- **SwiftShader is non-deterministic, or its fallback is removed in a future Chromium (R2).** Mitigation: determinism is measured in WP-00, with a tolerance of 1/255 or less if needed. Playwright 1.56.1 is pinned, the flags are explicit, and the Chromium build is recorded in provenance. hm doctor checks WebGL2 before every batch.
- **The performance projection slips.** Mitigation: M0 is accepted at 12 min or less, not at the 7.5-8.5 min estimate. Each optimisation is measured on its own. No content plan depends on the speed-up; the current path still gives about 55 videos per day. Perf pass 2 (WP-47) is conditional.
- **Generated videos feel mechanical next to hand-directed v2.** Mitigation:
- Craft lives in hand-tuned moves, each with its own cell per Mallow.
- Seeds only sample inside ranges the owner has reviewed at their extremes.
- Pose contracts, bridge moves and junction review sheets.
- Turn variety.
- Recipe hooks for specific templates.
- Choreography is never random, and the owner reviews every batch.
- **Move-authoring effort is underestimated.** The judges flagged 0.3-0.4 days per move as unrealistic. Mitigation: about 0.8-1 day per first (Noomi) cell and about 0.25-0.5 day per extra Mallow cell. Tier A is smaller (9/9/9). Content is unlocked template by template through capability gating, so a late move delays only its templates.
- **Large-hole skin invention fails for Boppo, Pipzi or Zuzu (3-4x Noomi's area).** Mitigation: strict asset gates and owner stills. The only fallbacks are better derivation (patch quilting, per-region pools) or a narrower expression range that shows less invented skin. A style that fails rest-match does not ship, and production continues with the approved Mallows.
- **Too little variety while Noomi is the only Mallow; the library's sequencing rules can't be met.** Mitigation: Q1 default is to cap at 3-5 posts per week per channel and apply the rules over the unlocked set. Time of day, weather and dressing variety comes from the app's own Moonmilk content. Blubi derivation starts in the M1 window, so the lake family lands around week 12.
- **Provisional QA thresholds calibrated on a single video (n=1) produce false fails or false passes.** Mitigation: warn bands and fault fixtures. A planned refit after M2 on 12 or more approved videos. Every threshold change is logged. Owner review is always the final gate.
- **Photosensitivity: spirals, glitch, fireworks, sparkles, twinkle.** Mitigation: caps at spec level in G-DIR, plus a zero-flash pixel gate on every final, a Zuzu stripe check, and fault fixtures. Static Storm has no lightning bolts.
- **Realm ports drift from the approved designs.** Mitigation: the WP-19 capture spike uses the app's own static layers where possible. Dressing comes only from the app realm files. Realm-likeness gate plus owner realm stills. Set pieces that are genuinely new (for example a pond for Pipzi) stay out.
- **Owner review becomes the bottleneck, or decisions stall a wave.** Mitigation: the decision sheet arrives in week 1. Work is ordered so blocked Mallows come later. Weekly batches of 14-28. Cells are promoted by ticking extremes sheets in the gallery. Decisions are imported in bulk.
- **Disk exhaustion (26 GB free).** Mitigation: frames are never stored; segments are deleted; drafts are pruned after 7 days; masters are pruned to the spec 30 days after posting, since renders are deterministic. The farm warns below 5 GB and refuses below 3 GB. Clean plates are only built on request in an optional later work package.
- **Parallel agents collide on shared files or CPU.** Mitigation: one git worktree per work package. Single owners for engine/renderer, engine/face, engine/softbody and each world family module. Interfaces frozen at the end of WP-03. A heavy-job flock lock. Benchmarks and goldens need the machine to themselves.
- **The cell feedback loop starves combinations or drifts the mix toward bland ones.** Mitigation: reason codes only flag cells for re-tuning. The single automatic penalty (sameness) has a floor of 0.5 and decays over 30 days.
- **Brand drift in copy or sound.** Mitigation: copy comes only from curated library pools, with no generated text. The lint superset includes a tone/topic blocklist and grief pairing. The library version is pinned in each spec. Recipes come from an allowlist. The logo is only ever drawn by LogoCard, and an SSIM gate checks it.

## Open questions for the owner (defaults apply until answered)

1. 1. Posting while only Noomi is finished (about weeks 9-12). The library's own sequencing rules can't be met with one Mallow: no two posts in a row with the same Mallow, and every Mallow at least once in any 10 posts.
- Default: publish Noomi-only at a capped 3-5 posts per week per channel. All other rules (template, gag, ritual, feeling families, cooldowns) apply unchanged; the Mallow rules apply to whichever Mallows are unlocked. This runs until Blubi and Loomi are approved, around week 12.
- Alternative: hold public posting until at least 3 Mallows are approved.
Which do you want?
2. 2. Canonical art where the app's small sprite and the approved 1254 px art are different paintings. Default: the 1254 px art is canonical for all three, because it is the only version usable without upscaling.
- Loomi: 2 closed arcs plus a smile, no brows at rest. The app shows 4 arcs. Needed by the end of M1.
- Boppo: wide grin with a heart-shaped tongue. The app shows a narrow crescent. Needed by M3.
- Zuzu: hi-res proportions, about 6.5% wider. Needed by M4.
Do you confirm, or do you want the app version for any of them?
3. 3. How you review. Each batch's gallery is static HTML on this machine.
- Default: also publish each batch gallery as a private claude.ai artifact, with preview MP4s of 15 MB or less, so you can review and tick approvals from any device. It stays private unless you share it.
- Alternative: local files only.
Which do you prefer?