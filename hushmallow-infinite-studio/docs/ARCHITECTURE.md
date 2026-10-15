# Architecture: the composer and the direction contract

This page documents the interfaces frozen at the end of WP-03 (PHASE2-PLAN "INTERFACES"):

1. the **direction contract v3** (`direction.json`, and the runtime interface the engine stage loads);
2. the **move contract** (`composer/moves/**`);
3. the **channel catalogue** (`composer/channels.js`);
4. the **face parameter vocabulary**;
5. the **prop controller interface** (`composer/controllers/`).

It also explains how the composer reproduces the approved v2 exactly, and how the pieces fit together. The face style and world module interfaces belong to WP-10 and WP-14; they consume the parameters defined here and change nothing in them.

## 0. The pipeline

```
spec.json (hm-variant/1, planner)                                  library/ (packs, presets, tuning matrix)
        │                                                                │
        ▼                                                                ▼
composer/compose.js ── moves in slot order ── personality ── acting ── build ── circular wrap
        │                         (typed channels, ownership windows, posts, deferred values)
        ▼
direction.json (hm-direction/3) ──► G-DIR (composer/validate.js), G-COST (composer/cost.js)
        │
        ▼
engine/runtime/direction-runtime.js  ── composer/scene.js (the one evaluator of direction semantics)
        │                                 also used by the composer's dry runs, G-DIR and G-COST
        ▼
engine stage (renderFrame, dryRun, prime) ──► frames, cue log, curves
```

| Module | Job |
|---|---|
| `composer/compose.js` | `compose(spec, { lib, data?, measure?, moves? })` (async, the planner's seam) and `composeWith` (the pure, synchronous core). |
| `composer/clock.js` | The beat clock: anchors, `at()` (grid snapping), `resolveRef('TURN-0.05')`, the breath period, seeded anchor jitter. |
| `composer/channels.js` | The catalogue, the `ChannelSet` collector (ownership, ordering, merge rules), the evaluators, `checkChannels`. |
| `composer/scene.js` | `createScene(direction)`: direction → numeric state at any time, sub-frame counts, motion. |
| `composer/moves/**` | The moves. `index.js` is the registry, with constant imports. |
| `composer/personality.js` | Intents through the app's expression presets, plus amplitude, tempo, lag and the eye gate. |
| `composer/acting.js` | The resolver for deferred values, auto-blinks and `breathEnvelope()`. |
| `composer/poses.js` | The pose table, compatibility checks and bridge planning. |
| `composer/layout.js` | Text measurement (injected), hook auto-fit, glass card boxes, TextBlock/LogoCard visibility models. |
| `composer/circular.js` | The moving seam: `wrapTime`, domain and closure. |
| `composer/palette.js` | Realm palette triples blended by the world dials, and world-only jitter. |
| `composer/controllers/` | Prop controllers (`orbit`). |
| `composer/validate.js` | G-DIR. |
| `composer/cost.js` | G-COST. |
| `composer/artefacts.js` | Review artefacts from a dry evaluation (never a render, R12): `dryRun(direction)` → cue log, curves and sub-frame counts in the engine's shape; `channelPlotSvg(direction)` → channel plots. |
| `composer/lib-node.mjs` | Node inputs: library files, the face spec, the recorded silhouette, the font-metrics shim. |
| `composer/library.js` | A Node-free index of the story library: clocks, templates and format. |
| `composer/versions.mjs` | Move versions for the tuning matrix (Node only). |
| `composer/schemas/*.json` | JSON schemas: direction, move, mallow pack, realm preset, tuning matrix. |
| `engine/runtime/direction-runtime.js` | Runtime v3. Its page-side compose is `composeInPage`, which records the sha256 of the pack, preset and matrix it read, as Node does. |

The composer is pure ESM with no wall clock and no unseeded randomness (`tests/guard/no-wallclock.test.mjs` scans it). It runs in the render page, where layout uses the real Fredoka, and in Node, where it uses the font-metrics shim.

## 1. How exact parity works

T01 composed from `specs/golden/t01-v2.json` reproduces the frozen v2 module **bit for bit**: every state value, every mesh hash, every sub-frame count, the cue log, the curves and every pixel (`tests/parity/composer-v2-*.test.mjs`). Four rules make that possible:

- **The formulas are v2's, operand order included.** For example, `scene.js` sums each body DOF's layers left to right exactly as `dofAt` did. `squash = track + kicks + tremble·0.012·noise(13t, 3)` keeps v2's association, so the result is the same double. The same holds for the orbit controller, the motes, the palette, the camera, the light and the audio curves.
- **Anchor arithmetic matches v2's.** v2 wrote some times as literals (`0.53`) and computed others at run time (`T.exhale + 0.12 = 9.319999999999999`).
  - `at(base, off)` snaps to the 1 µs grid, so it returns the double the literal would parse to.
  - Plain `base + off` reproduces a run-time sum.
  - Moves use whichever form v2 used. Sub-anchors are always published on the grid.
- **Layout is measured in the page.** The glass card boxes come from `measureText` with Fredoka loaded, as v2's `bubbleCanvas()` did. A direction composed in Node records `meta.layout: 'shim'`. Runtime v3 refuses to render one unless it is told to (`allowShimLayout`).
- **Node and Chromium differ in the last bit of `Math.pow`.** Measured with v2's own palette code, Node gives 0.002932318323938363 and Chromium 0.0029323183239383624. The bit-exact gate therefore runs in the page. In Node the composer matches the goldens within 1.9e-12.

The legacy route (runtime `v2`, the frozen module through the import map) is untouched.

## 2. Direction contract v3

`direction.json` follows `composer/schemas/direction-v3.schema.json`. Every value is explicit: the runtime never draws a random number, and it measures only to verify.

| Field | Contents |
|---|---|
| `schema` | `"hm-direction/3"` |
| `meta` | `id`, `title`, `fps`, `duration` (D), `width`, `height`, `subframes` (floor), `subframeMax`, `subframePx`, `shutter`, `P` (loop seam), `runtime: "v3"`, `score`, `profile`, `internal`, `layout` (`page` or `shim`), `template`, `spec`, `fingerprint`, `composer` (version) |
| `anchors` | The clock anchors (after jitter), plus every sub-anchor a move published (`squeeze`, `inhale`, `crest`, `exhale`, `dissolve0..2`, `open`, …) |
| `mallow` | `id`, `registry`, `rigScale`, `assets` (studio-relative paths), `artSize`, `placement` {baseX, baseY, scale}, `silhouette` (as measured), `faceSpec` (`specFromDerived`), `faceStyle`, `body` {lag, cols, rows}, `limits` {heightMin, stretchMax, shrinkMin}, `light` {dir, sss} |
| `realm` | `id`, `tod`, `palette` {base, tense, resolved} (hex looks), `world` {horizonY, moon, fresnel, reflAmt, shadow, shadowFall, contactSpread, skyParallax, skyCentreX, rippleLife}, `post` {bloom, bloomThresh, contrast, vignette, vignetteTension, grain}, `jitter` (`null` when zero) |
| `channels` | `{name: channel}`; see §4. Owned channels keep their `windows`; every key and list entry carries `by`, the move that wrote it. |
| `body` | For each DOF (`squash inflate lean sway shimmer shimPhase lift`), the ordered layer channels it sums. `name#amp` and `name#phase` pick the two outputs of a shimmer channel. |
| `face` | Ordered `[param, channel]` pairs handed to `Face.draw`. Always includes v2's 22, plus any addition a move wrote. |
| `props` | `[{ id, controller, params, items: [{ slot, born, dissolve, text, lines, tex, layout: {w, hw, hh} }], channels, style: {glass, text}, motes, audio }]` |
| `text` | Overlay type in z order: `{ id, kind: textblock or logocard, z, opts (TextBlock/LogoCard options, exactly), drawFrom?, widths, readable, by }` |
| `cues` | `[{ t, type, data, by }]` in emission order. The stage's cue log is `{t, type, ...data}`, without `by`, so it stays byte-equal to v2's. |
| `audio` | `pan` {centre, curveNorm} for the per-frame curves. Cue pans use `composer/audio.js`. |
| `layout` | Measured text: the hook (lines, size, widths), plus `measuredBy` |
| `probes` | QA probe times: cover, gag, impact, peak, ritual-mid, eyes-open, end-card, rest-end |
| `moves` | `[{ slot, id, rank, params, published, cell: {status, version} }]` |
| `provenance` | Composer version, cells, pack, realm and tuning files with sha256, prop field writers, bridges |

**Runtime interface.** `engine/stage.js` loads this interface for every runtime; WP-03 left it unchanged.

```js
{ meta, setup(stage), state(t, stage, { center }), overlay(ctx, t, stage), subframes(t, stage), probes(), dispose(stage) }
```

- **`setup`** does the following, with no fallbacks:
  - loads the art, clean, normal and face JSON;
  - verifies the silhouette and the face spec against the direction;
  - builds the face canvas, `setMallow`, the glass text textures (content-hashed keys) and the TextBlocks/LogoCard;
  - emits the cues.
- **`state(t)`** returns v2's state shape `S`, key for key: `{ t, cam, buildMesh, drawFace, mallow:{bodyBox, rest, light}, world, bubblesBack, bubblesFront, particles, post, audio }`.
  - `S` may grow only by the optional additions the plan lists: `world.module`, `world.loop`, `mallow.xf`, `mallow.lidXform`, `mallow.emission`, `props[]` and `text.boxes[]`. Each is emitted only when it carries information.
  - Today that is only `world.loop`, emitted when D ≠ 15. The renderer's water loop falls back to 15, and v2 omitted the field.
- **The circular timeline.** Wall time t is evaluated at composition time `t* = t ≥ D − P ? t − D : t`. P = 0 leaves t untouched, not even subtracted.
- **Two ways in:**
  - `createDirectionRuntime({ direction })` takes a compiled direction;
  - `createDirectionRuntime({ spec })` composes in the page at setup, after `Stage.init` has loaded the font.
- **Registry wiring is the integrator's step.** It changes `engine/directions.js`, which WP-03 does not own:

  ```js
  import { createDirectionRuntime } from './runtime/direction-runtime.js';
  RUNTIMES.v3 = (mod, meta) => createDirectionRuntime({ direction: mod.direction });
  ```

  The registry entry's `load()` fetches the direction JSON as data, with a constant path, as the `import()` entries do: `'composer/t01-v2': { src: '../specs/golden/t01-v2.direction.json', load: () => loadDirectionJson('../specs/golden/t01-v2.direction.json') }`. It is not imported as code, so no import specifier is computed. The farm's job key must then also cover the code runtime v3 runs outside `engine/` (`composer/`, and `planner/` for the typography), because a direction JSON's sha256 alone does not change when `scene.js` does. The ready-made patches, validated in a mirror, are listed in `docs/wp/WP-03.md`.

**Evolution rules.**
- Adding a channel to the catalogue, a field the runtime treats as optional, or an optional addition to `S` is backward compatible.
- Renaming or re-typing a field, or changing a formula in `scene.js`, is a contract change. It requires `hm-direction/4`, and parity must still pass.

## 3. Move contract

A move is a module under `composer/moves/<kind>/` whose default export is (schema: `composer/schemas/move.schema.json`):

| Field | Meaning |
|---|---|
| `id`, `kind`, `library`, `summary` | `kind` is one of `cover-idle gag aftermath metaphor turn ritual close loop camera arc bridge weather dressing`. |
| `cost` | Tags for G-COST and scheduling (`subframes`, `faceRedraws`, `props`, `particles`, …). |
| `requires` | Capabilities it needs (`ground`, `caps`, `lines`, `minWindow`). |
| `span: [from, to]` | Anchor refs of the interval the move leads (for pose checks). |
| `entry`, `exit` | Poses (`composer/poses.js`). |
| `next` | For example a gag's `aftermath` move. |
| `publishes(A, at, p)` | Sub-anchors `{name: time}`, snapped to the grid and added to `A` before `owns` resolves. |
| `seam(A)` | Loop moves only: the loop seam P. |
| `owns: {channel: [from, to]}` | Ownership windows, as anchor refs (`'TURN-0.05'`, `'END'`). |
| `params: {name: {def, range?, doc}}` | Tunable parameters. A cell's `tuning` and `ranges` override and constrain them. A gag's `intensity` comes from the spec. |
| `cues: {type: {recipe, optional?}}` | The cue names the move owns, and their score recipe ids. |
| `compile(ctx, A, p)` | Writes the move. |

**Order.** The slot order is: cover-idle, gag, aftermath, metaphor, turn, ritual, close, loop, camera, arc. Then the personality pass runs, then the acting pass (rest windows, deferred values, auto-blinks, micro-noise, bridges), then the build.

**`ctx`** offers the following:

| Call | Effect |
|---|---|
| `ctx.at(base, off)`, `ctx.ref('X±d')` | Beat times (§1). |
| `ctx.key(channel, t, v, {f, z, ease, dur, react})` | A track or spline key, inside the move's own window, written in time order. `react: true` marks a reaction key that personality lag may delay. |
| `ctx.kick(ch, t, amp, f, z)`, `ctx.hop(t0, t1, h)`, `ctx.shimmer(t, amp, decay, freq)`, `ctx.ripple(t, amp)`, `ctx.blink(t, shape?)` | Merged lists (sum or max). |
| `ctx.term(channel, term)`, `ctx.envelope(name, expr)` | Single-writer terms and envelopes (§4). |
| `ctx.look(t, [x, y] or R => [x, y])` | Gaze keys on `face.lookX` and `face.lookY`. |
| `ctx.intent(name, t, {amount})` | A semantic face intent, expanded by the personality pass. |
| `ctx.prop(id, def)`, `ctx.prop(id).set(path, v)` | Create or amend a prop. A ritual sets the dissolve of the metaphor's thoughts. |
| `ctx.text(item)` | Overlay type. |
| `ctx.cue(t, type, data)` | Must be declared in `cues`. |
| `ctx.post(topic, value)`, `ctx.posts(topic)` | Facts for later moves, for example `turn.stop` or `breath.resume`. |
| `ctx.rng(name)` | A named stream from `spec.seed` (`composer/rng.js`). |
| `ctx.personality.eyesOpen(k, value, t)` | The pack's eye gate: `value`, or 0 when intensity × opening is under the gate. When it closes an opening, the composer records the closure at the key time `t` (`provenance.eyeGate`, used by the pose contracts, §7); a closure without `t` is the compile error `pose:eye-gate`. |
| `ctx.measure`, `ctx.styles`, `ctx.frame`, `ctx.pack`, `ctx.realm`, `ctx.layout`, `ctx.personality`, `ctx.spec`, `ctx.fail(rule, msg)` | Context and failure. |

**Deferred values.** Any key value, cue datum or envelope may be a function of the resolver `R`. Functions are resolved once, after every move has run. `R` provides `R.A`, `R.post(topic)`, `R.posts(topic)`, `R.propAt(prop, i, t)` and `R.lookAt(prop, i, t)`. This is how the eyes chase thoughts whose dissolve the ritual sets later, and how the escalation's tremble stops at the turn's stop window.

**Versions.** A move's version is the sha256 of everything it contributes on the canonical fixtures (`composer/versions.mjs`). The tuning matrix records it. When it changes, the move's cells must drop to candidate (`tests/unit/composer-library.test.mjs` refuses a stale matrix).

## 4. Channel catalogue

The channel types, with their formula (operand order is v2's) and merge rule:

| Type | Value at t | Merge |
|---|---|---|
| `track` | `motion.js Track`: v0 + Σ dᵢ·spring(t − tᵢ, fᵢ, zᵢ), or eased over `dur` | Owned. Keys are merged, sorted, and checked for duplicates. |
| `spline` | Monotone cubic through keys | Owned. Duplicate times are an error. |
| `impulses` | Σ amp·ring(t − tᵢ, f, z) | Summed in time order |
| `hops` | Ballistic arcs | Summed. Overlaps are an error. |
| `blinks` | Max over blink curves | Max |
| `shimmer` | Decaying rim ripple. Outputs `[amp, phase]` | Summed in time order |
| `ripples` | World water rings | List |
| `noise` | env(t)·amp·noise1(t·rate, seed) | One writer |
| `sine` | amp·sin(2πt/period) or amp·sin(2π·freq·t), times env(t) | One writer |
| `envscale` | env(t)·amp | One writer |
| `ramp` | t·rate, times env(t) when it has one | One writer |
| `pulse` | 1 + amp·sin(2πt/period) | One writer |
| `const` | value | One writer |
| `expr` | Envelope expression: number, `{ss:[a,b]}`, `{add:[…]}`, `{sub:[a,b]}`, `{mul:[…]}`, `{max:[…]}`, `{min:[…]}`, `{clamp:[e,lo,hi]}` | One writer |

**Ownership windows.**
- Windows are half-open, `[from, to)`; a window that ends at D includes D.
- Two moves' windows on one channel never overlap.
- Every key a move writes lies inside its own window.
- Keys may carry times in [−P, D].

The catalogue, as of WP-03. A body channel with `#n` adds into its DOF at position n. A face track's rest value v0 comes from the pack's `face.neutral`.

| Channel | Type | Merge | Feeds | Default spring f / z | v0 |
|---|---|---|---|---|---|
| `body.squash` | track | owned | squash #0 | 3 / 0.8 | 0 |
| `body.squash.kicks` | impulses | sum | squash #1 | | |
| `body.squash.tremble` | noise | owned | squash #2 | | |
| `body.squash.micro` | noise | owned | squash #3 | | |
| `body.inflate` | track | owned | inflate #0 | 2.4 / 0.85 | 0 |
| `body.inflate.breath` | sine | owned | inflate #1 | | |
| `body.inflate.pant` | sine | owned | inflate #2 | | |
| `body.lean` | track | owned | lean #0 | 2.2 / 0.75 | 0 |
| `body.sway.kicks` | impulses | sum | sway #0 | | |
| `body.sway.tremble` | noise | owned | sway #1 | | |
| `body.sway.micro` | noise | owned | sway #2 | | |
| `body.shimmer.kicks` | shimmer | sum | shimmer #0 (amp), shimPhase #0 (phase) | | |
| `body.shimmer.tremble` | envscale | owned | shimmer #1 | | |
| `body.shimPhase.tremble` | ramp | owned | shimPhase #1 | | |
| `body.lift.hops` | hops | sum | lift #0 | | |
| `body.lift` | track | owned | lift #1 | 2.4 / 0.85 | 0 |
| `face.eyeOpen` | track | owned | face | 7 / 0.5 | pack |
| `face.lidTop`, `face.lidBot` | track | owned | face | 1.2 / 1 | pack |
| `face.squint` | track | owned | face | 5 / 0.8 | pack |
| `face.closedCurve` | track | owned | face | 5 / 0.9 | pack |
| `face.eyeStretch`, `face.eyeScale` | track | owned | face | 2.4 / 0.85 | pack |
| `face.irisScale` | track | owned | face | 1 / 1 | pack |
| `face.lookX`, `face.lookY` | track | owned | face | 9 / 0.75 | pack |
| `face.sparkle` | track | owned | face | 1 / 1 | pack |
| `face.browAlpha`, `face.browY` | track | owned | face | 1.5 / 0.9 | pack |
| `face.mouthSmile`, `face.mouthOpen`, `face.mouthRound`, `face.mouthWave`, `face.mouthWidth` | track | owned | face | 2 / 0.9 | pack |
| `face.blush` | track | owned | face | 0.8 / 1 | pack |
| `face.blink` | blinks | max | face | | |
| `face.browTilt` | const | owned | face (pack constant) | | |
| `face.mouthWavePhase` | ramp | owned | face (pack rate) | | |
| `cam.x`, `cam.follow` | const | owned | camera | | |
| `cam.y`, `cam.zoom` | spline | owned | camera | | |
| `world.tension`, `world.warmth`, `world.agitation` | spline | owned | world dials (palette, water, vignette) | | |
| `world.ripples` | ripples | list | water | | |
| `mallow.glowPulse` | pulse | owned | light glow | | |
| `env.breath`, `env.pant`, `env.tremble`, `env.rest`, `env.micro` | expr | owned | envelopes, referenced by name (`env: 'breath'`) | | |
| `props.<id>.phase`, `props.<id>.radius` | spline | owned | prop controllers | | |

Further rules:
- **No roll and no shake channel exists.** `cam.roll` is outside the catalogue, so it cannot be authored, and G-DIR refuses it explicitly.
- **Reserved, not yet writable:** the body DOFs `shrink`, `slide`, `sink` and `meltSkew`. The engine's soft body gains them first (WP-11), then they join the catalogue as `body.<dof>` tracks.
- **Camera:** `cam.y = spline − lift·scale·follow`; `zoom` comes from its spline; `roll` is always 0.
- **Rest:** `mallow.rest = env.rest`, clamped to [0, 1]. It crossfades to the pristine painting.

## 5. Face parameter vocabulary

These are the parameters handed to `Face.draw`. The v2 set, in v2's order, is always present:

```
eyeOpen lidTop lidBot blink squint closedCurve eyeStretch eyeScale irisScale lookX lookY sparkle
browAlpha browY browTilt mouthSmile mouthOpen mouthRound mouthWave mouthWavePhase mouthWidth blush
```

The canonical additions are emitted only when a move writes them. They are consumed by the face styles (WP-10+):

```
eyeOpenL eyeOpenR lidSlant browAsym browCurve mouthPout mouthTremble mouthSkew tongue tears wet
heartEyes cheekPuff catchX catchY glitch spin spinJitter spiralHue
```

Semantics are v2's:
- `eyeOpen` 0 means the painted closed eyes. Values up to about 1.35 open them; the rig draws sclera and iris.
- `closedCurve` 1 is the painted arc.
- `mouthSmile` 1 is the painted smile.
- `blush` is the extra flush on top of the painted cheeks.
- `mouthWavePhase` is a phase in radians.

App expression presets (hushmallow `expressions.js`, read-only) map onto this vocabulary through `personality.adaptPreset`:
- the app's neutral smile of 0.5 becomes the pack's painted rest;
- the app's blush of 1 is the painted cheek, so the extra flush is blush − 1;
- sparkle is mapped as sparkle − 1, clamped.

A pack's `face.intents` override the app presets. **The eye gate:** a closed-eye Mallow opens only when intensity × opening ≥ the gate's low value, `pack.face.eyeGate`; for Noomi that is the app's `[0.5, 0.95]`.

## 6. Prop controller interface

```js
controller.create(prop, channel) → { count, at(i, t) → item | null }
  prop     the direction's prop record (id, controller, params, items, channels)
  channel  (name) → function of t (composer/channels.js evaluators)
  item     { x, y (world px), depth (−1 back … 1 front), scale, squash: [sx, sy], alpha, stress, th, glowUp, textAlpha }
```

- **Pure and deterministic.** The composer (look-at, cue pans, curves) and the runtime (glass passes) place props with the same code.
- **`orbit`** (M-ORBIT) is v2's `bubbleAt()` with its constants in `prop.params`:
  - `ellipse` {cx, cy, rx, ry, lift}, `origin`, `arrive`, `depthStart`, `spin[4]`, `wobble`, `spinWobble`, `grow`, `depthScale`, `swell`;
  - `fadeIn`, `fadeOut`, `depthAlpha`, `crowd`, `glowUp`, `textOut`, `stress`, `afterDissolve`;
  - the channels `phase` and `radius`.
- **Glass state.** The scene turns an item into a glass state with the prop's `style.glass` {tint pair blended by tension, edge, radiusMax, minAlpha}. Depth < 0 goes to the back pass, the rest to the front pass.
- **Motes.** Dissolving thoughts become motes (`prop.motes`: an explicit list per item, plus their motion constants).
- WP-12 adds `rise`, `lane`, `stack`, `fork` and `loom` behind the same interface.

## 7. Personality and acting

- **Reference performer.** Noomi is the reference: amp 1, tempo 1, lag 0. Every move's numbers are her v2 numbers.
- **The pass for Noomi.** It still runs for her, and is an identity operation by operation: v·1, f·1, d/1 and t+0 are exact in IEEE arithmetic. `tests/unit/composer-personality.test.mjs` proves the direction is bit-identical with the pass and without it.
- **Other performers:**
  - amp scales body deformation keys, kicks and hops;
  - tempo scales spring frequencies and eased durations;
  - lag delays reaction keys, clamped so the gag impact lands by 1.0 s.
- **Acting:**
  - the painted rest windows, built from the gag's `rest.leave` and the loop's `rest.return`;
  - resolution of deferred values;
  - seeded auto-blinks in open holds longer than the pack's blink interval (none on T01);
  - micro-noise with a seam-zero envelope (0 for Noomi);
  - bridges between moves whose junction does not satisfy the next move's entry pose (below).
- **Poses** (`composer/poses.js`, FU-4) are contracts on **compiled** channel values:
  - a move's entry pose must hold at the start of its span and its exit pose at its end, judged on each named track's value; G-DIR checks both (`pose:entry`, `pose:exit`);
  - a junction is judged on the channels as built, for **every** channel the entry pose declares, whether or not the previous exit pose mentions it;
  - a bridge eases each failing channel (`inOutSine`, so it stays C1) over the gap and lands it inside the entry range exactly at the entry, aiming through the residual of the previous move's still-settling spring. After the entry, a channel nobody owns is released toward the value the previous move left when holding it would break the next move's exit pose;
  - no room (gap < 0.25 s) is the compile error `pose:no-room`, which names the move that last keyed each failing channel; a spring too far from rest to land is `pose:bridge-short`;
  - "shut" eyes are eyeOpen ≤ 0.1 in every pose (`SHUT`: Noomi's 40.8 px lid stroke still covers the lid gap there); range tests have a perceptual slack of 1e-3;
  - the eye gate: every time the pack's gate shuts an opening a move asked for (G-JOLT's snap, an intent), the composer records the closure in `direction.provenance.eyeGate` (`{ t, by, asked, k, gate }`; present only when the gate closed something, so the approved film has none). From a closure until the next key on `face.eyeOpen`, and only there, a pose that asks for open eyes is also met by shut eyes (`poses.js` `eyeGateAt`). Anywhere else shut eyes are judged like any other value, on every face style; open eyes going into a shut pose never pass. G-DIR re-checks each record (`pose:gate`: a closed-eye face, a move of the direction, inside its window on the eyes, an opening, and intensity × opening under the gate).
- **The breath envelope** is built in one place (`acting/idle-breath`). It is exported as one function, `acting.breathEnvelope(direction)`, for the score. This is audit R11 on the picture side.

## 8. Gates

**G-DIR** (`composer/validate.js`) checks:
- **structure:** catalogue, sorting, duplicates, ownership, finite values at every frame and sub-frame time;
- **loop closure** at the seam: every body DOF, the camera, the world dials, the rest envelope, and the face whenever the painting does not cover it; no impulses, props or particles at the seam; the painted rest on both sides; the hook at full alpha on frame 0;
- **deformation** at 240 Hz, and the **face inside the silhouette** (every feature's outline inside the ellipse inscribed in the measured silhouette box, in art space, wherever the painting does not cover the face);
- **camera:** zoom, rates, follow, roll;
- **text:** safe zones, motion, reading time, glass thoughts;
- **safety:** breath timing, exposure, disabled effects; **spin** (whatever turns, props by their angle and the face spiral by `face.spin`: ≤ 1 turn/s, ≤ 0.3 while its disc covers more than 25 % of the frame, the whole motion's speed changes no faster than a 0.5 s inOutSine ramp; each speed change on its own under 0.5 s warns, `safety:spin-ramp-change`); **pulse ramps** (every swing of a `pulse` channel ≥ 150 ms; today that is `mallow.glowPulse`);
- **craft:** impact window, **C1 continuity** of every channel that is not a declared kick (slope jumps measured at each break point: key times, eased-key ends, spline knots, blink phases, smoothstep edges and min/max/clamp switches; error above 0.05× the channel's range per s, except 1.5× at the breath envelope's break points, where v2's handover kinks 1.26×), eye gate, dead intervals;
- **audio linkage:** every cue declared with a recipe, every declared cue emitted; **no absolute-time layers** (every layer time a cue hands the score sits on an anchor or another cue; the frozen `soundtrack-v2`, keyed to v2's own seconds, only for the approved film's fingerprint);
- **pose contracts** on compiled values (§7).

On T01 it takes about 0.15–0.3 s in Node. Thresholds calibrated on v2 are marked provisional in `THRESHOLDS` and listed in `docs/wp/WP-03.md`, `docs/wp/FU-4.md` and OWNER-DECISIONS Q5 (v2's values are the limits, the plan's stricter values warn; FU-4's additions are listed there as provisional).

**G-COST** (`composer/cost.js`) predicts the render time from the dry run's sub-frame and face-redraw counts, counted as the engine counts them for each profile:
- the `exact` model is fitted to WP-01's measured v2 render: 1,337.7 s predicted against 1,337.6 s measured;
- the `final` model (FU-4 refit) uses WP-02's bench split, scaled to the median of 6 single-worker farm renders of T01: 542.1 s of segment render time (measured 481.6–604.4 s) plus 44.8 s of per-job overhead, 586.9 s = 9.78 min wall clock (measured median 586.5 s);
- the `draft` model predicts 79.9 s of render, 89.3 s wall clock (measured medians 79.8 and 88.9 s);
- `predictedSec` is the segment render time QA's G15 check compares with; the budget is judged on `predictedMin`, the wall clock.
