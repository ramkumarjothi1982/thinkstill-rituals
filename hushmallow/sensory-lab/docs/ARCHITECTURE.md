# Sensory Lab architecture

One shared sensory engine with thin experiences on top. The modules form a
one-way dependency graph with no cycles:

```
features/*  ──▶ features/stage-screen ──▶ core/companion (one per stage; a second one in a duet)
                     │                        ├─▶ core/soft-mallow ──▶ src/mallows/rig.js (production, read-only)
                     │                        │        ├─▶ core/softbody ──▶ core/materials
                     │                        │        ├─▶ core/mesh-renderer
                     │                        │        ├─▶ core/expression-engine (deformationFace)
                     │                        │        └─▶ adapters/rig-adapter (contract check)
                     │                        ├─▶ core/gesture-engine
                     │                        ├─▶ core/personality
                     │                        ├─▶ core/expression-engine (ExpressionDirector)
                     │                        └─▶ src/engine/haptics.js (production, read-only)
                     └─▶ core/environment ──▶ src/world/realm.js (Hushfold realms, production, read-only)
                                         └─▶ core/effects (FlashGate)
features/pocket-hush ──▶ core/effects, core/pocket-rules, features/pocket/* (one module per moment)
features/weather     ──▶ core/weather + core/weather/* (pure sims), core/weather-draw, -layer, -mallow, -sound,
                         features/weather/{tools,ui}; shared: environment, pointer-router, ambience, effects, FaceMixer
features/hushbeat    ──▶ core/music-theory, -time, -engine (pure), core/music-kits, -audio, -fx,
                         features/hushbeat/{player,performer,sheet,copy}; shared: sound-engine (voices, quietSound), effects, FaceMixer
features/nightlight  ──▶ core/frame-pacer, core/screen-wake, features/nightlight/{session,settings,look,pacing,
                         ways,modes,world,sky,bed,sheet,copy}; shared: environment (stills), ambience, sound-engine (facade, trim)
lab.js ──▶ core/prefs, core/sound-engine, core/perf, features/registry,
           core/comfort-dna ──▶ adapters/comfort-store (local) | adapters/supabase-comfort (later, unused)
```

`core/math.js` is a leaf that everything may use. Only `soft-mallow`,
`mesh-renderer`, `gesture-engine` (the `bindGestures` part), `companion` and
`sound-engine` touch the DOM or Web Audio. Everything else runs in Node and is
unit tested there.

## How a squeeze happens

1. **Gesture Engine.** Two pointers go down, so `squeezestart` fires; as they
   move, `squeeze {amount, angle}` fires.
2. **Companion.** It calls `SoftMallow.setSqueeze(amount, angle)`, plays a
   squish sound at amount thresholds with a light haptic, and asks
   `Personality.respond('squeezestart')` for a face.
3. **SoftMallow.** Each frame it combines the rig's own body motion (hop,
   squash beat, breathing, lean) with the squeeze into the soft body's *pose*,
   steps the physics, and reads back the metrics (squash, stretch, wobble).
4. **deformationFace().** It blends that Mallow's authored `squeezeFace`
   (from `src/mallows/reactions.js`) into the rig's facial targets in
   proportion to the measured compression. The face springs there through the
   rig's existing parameter springs.
5. **Rendering.** The rig renders its skin as before: the approved art plus
   the animated face. SoftMallow then maps that skin through the deformed
   mesh in WebGL, with lighting per vertex from the area change, and
   composites it with the shadow, aura and particles.
6. **Release.** On `squeezeend`, the squeeze is removed, the material springs
   back with its own overshoot and damping, a release "boing" plays at the
   squeeze's peak strength, and the personality chooses a reaction (`release`,
   `success`, …).

## Public APIs

### Gesture Engine: `core/gesture-engine.js`
- `new GestureRecognizer(emit, opts?)`: a pure state machine.
  `down/move/up(id, x, y, tMs, onBody)`, `cancel(id, t)`, `tick(t)`.
- Events: `contact, tap{streak, interval, steady}, doubletap, holdstart,
  holding{dur}, holdend, dragstart, drag{dx,dy,vx,vy}, dragend{fling,
  converted}, strokestart, stroke{speed}, strokeend, squeezestart,
  squeeze{amount, angle}, squeezeend`.
- `bindGestures(el, {hitTest, onGesture, onWheel?, onHover?, options?})`
  returns `{recognizer, tick(), dispose()}`. It uses Pointer Events, pointer
  capture, cancels iOS scrolling and the long-press menu, and uses one
  processing clock for events and ticks.
- Rules: a tap is emitted straight away, and a second tap within 320 ms
  upgrades it to `doubletap`. A hold is resting for 480 ms. Moving more than
  26 px turns a hold into a drag. Back-and-forth motion (path longer than
  2.3× the net movement), or sweeping onto the body from outside, is a
  stroke. A second finger turns any single-finger gesture into a squeeze.

### SoftBody Physics Engine: `core/softbody.js`, `core/materials.js`
- `new SoftBody({width, height, cols, rows, inside(u,v), material, substeps})`
  builds an XPBD triangle mesh over the silhouette.
- `setPose({squash, breath, lean, float, squeeze:{c, ax, ay, px}})` sets the
  intended shape. Links and areas measure deviation from the pose.
- `step(dt)`: 4–8 substeps with distance, bending and area constraints,
  shape memory, finger grabs, and floor friction.
- Interaction: `grab(id,x,y)`, `moveGrab(id,x,y)` (rubber-band limit),
  `release(id, flingX, flingY)` returns the stretch amount, `poke(x,y,s)`,
  `brush(x,y,vx,vy)`, `setPress(x,y,depth)`, `impulse(vx,vy)`.
- `metrics()` returns `{squash, widen, offset, energy, area, top, bottom}`.
- `MATERIALS`: marshmallow, jelly, mochi, cloud, pillow. Each is a set of
  physical constants (shape stiffness, damping, compliances, gravity,
  stretch limit, volume, dent, float) plus a sound profile.

### SoftMallow (rig + physics): `core/soft-mallow.js`
- `new SoftMallow(container, {id, material, quality, renderer, ...MallowRig opts})`
- `softReady` resolves once the soft body is built.
- Screen-space methods: `poke`, `grab`, `moveGrab`, `release`, `brush`,
  `setPress`, `setSqueeze(amount, angle, cx)`, `lookAtScreen`, `hitTest`,
  `toLocal`.
- Settings: `setMaterial`, `setQuality('high'|'medium'|'low')`,
  `setReducedMotion`, and `showMesh` (draws the wireframe).
- It keeps the full MallowRig API (`setEmotion`, `react`, `setStage`…) and
  adds the events `impact {strength}` and `settle`.

### Character Personality Engine: `core/personality.js`
- `new Personality(mallowId, {seed, style})`, with style `gentle`,
  `balanced` or `playful`.
- `respond(gesture, data)` returns `{react, mix, i, hold, voice, poke, tag}`
  or `null`.
- `tick(dt)` decays the mood. `restExpression()` returns the resting face
  from the Mallow's mood.
- `PROFILES`: per-Mallow overrides of a shared behaviour table. These cover
  tap variants, the streak thresholds for giggles and dizziness, groove on a
  steady rhythm, and answers to hold, stroke, fling and squeeze.
- It's deterministic (seeded PRNG), never gives the same tap answer twice
  in a row, makes no AI calls, and never claims to read the person's feelings.

### Expression Engine: `core/expression-engine.js`
- `ExpressionDirector(rig)`: `setRest({mix,i})`, `play(mix, i, holdSecs)`,
  `clear()`, `tick(dt)`. It drives `rig.setEmotion` only when the face
  actually changes.
- `deformationFace(goal, {squeeze, stretch, wobble, closedEyes}, squeezeFace)`:
  a pure function that adjusts the face from the body's shape.

### Sound Engine: `core/sound-engine.js`
- `new SoundEngine({volume, muted})`. Call `unlock()` from a user gesture;
  nothing plays before that. Also `setMuted`, `setVolume`, `stopAll`,
  `dispose`, `debug()`.
- Material one-shots: `poke`, `squish`, `release`, `impact`, `settle`.
- Continuous sounds return `{update, end}`: `stretch(mat)` and `brush()`.
- `voice(mallowId, kind, intensity)`, where kind is `tap`, `giggle`,
  `surprise`, `boing`, `content`, `coo`, `hum` or `grumble`. Each Mallow uses
  the same root note and scale as its kit in `src/engine/audio.js`.
- It is synthesised in Web Audio with no files. It has a lowpass and
  compressor master, caps voices, rate-limits, disconnects every node, and
  suspends when the page is hidden.

### Device settings: `core/prefs.js`
- `new Prefs(storage?, key?)`: `get`, `set` (known keys only), `all`,
  `reset`, `onChange`, `reducedMotion()`, `persistent`.
- It uses the key `hm.sensorylab.v1` for device settings only (sound,
  volume, haptics, motion, theme, quality, material) and stores only values
  that differ from the defaults.

### Sensory Preferences Engine (Comfort DNA): `core/comfort-dna.js`
- `new ComfortDNA(store)`, then `await load()`. `get(key)` returns the
  effective value (defaults while personalisation is off), `chosen(key)` the
  saved one, `set(key, value)` validates and skips unchanged writes.
- Behaviour helpers: `tuning()` (response style, speed and motion scales,
  voice and touch-sound switches), `breathTiming()`, `palette()`,
  `environment(kind, mallowId)`, `suggestions(n)`, `surpriseBias()`.
- Favourites and opt-in history: `toggleFavourite`, `isFavourite`,
  `record(kind, id)` (only while learning is on, known items only).
- Privacy: `view()`, `resetPreferences()`, `deleteHistory()`, `deleteAll()`.
  Stored data is sanitised on load.
- Stores share one interface (`load`, `save`, `clear`, `describe`):
  `LocalComfortStore` (key `hm.sensorylab.comfort.v1`, memory fallback),
  `MemoryComfortStore` (tests), and `SupabaseComfortStore` (an injected
  client, not connected). Details in `docs/COMFORT_DNA.md`.

### Effects Engine (first part): `core/effects.js`
- `EffectsLayer(parent, {quality, reducedMotion})`: one canvas over the
  stage with `add`, `remove`, `clear`, `destroy`.
- Effects: `GlowOrb`, `Floater` (a pure `step` with hit, hold, drag and
  release), `BreathRing`, `Bloom`, `Motes`. Phase 3 extends this for
  Weather Weaver and Nightlight.

### Pocket Hush: `features/pocket-hush.js`, `core/pocket-rules.js`
- The moment host owns the stage, input routing, hint, time limit, ending
  (a reaction, a closing line from that Mallow's authored lines, a sound
  motif, the realm's transform and a bloom) and the end card.
- Each moment in `features/pocket/` exports `{id, hint, maxSeconds,
  start(api)}` and uses the host API: `body()`, `hint()`, `button()`,
  `holdButton()`, `dots()`, `capture()`, `onGesture()`, `progress()`,
  `complete()`, plus `effectsKit`, `palette` and `timing`.
- `pickSurprise({modes, bias, recent, hour, reducedMotion, seed})` is a pure
  rules engine: it avoids recent moments, leans on Comfort DNA, weights
  evening moments at night, and picks a variant.

### Environments: `src/world/realm.js` (production, read-only)
- `stage-screen` mounts a Hushfold realm behind the Mallow when an
  experience asks for one (`backdrop` option, chosen through Comfort DNA).
  The top bar switches its colour tokens from the realm's sky brightness
  (`data-backdrop="light|dark"`).

### Performance: `core/perf.js`
- `initialTier(pref)` picks the starting quality from the device (pointer
  type, cores, memory). `FrameMonitor` drops a tier when the 75th-percentile
  frame time stays above 24 ms. It never steps back up mid-session.
- Tiers: high is a 14×14 grid with 8 substeps and DPR 2; medium is 11×11,
  6 substeps, DPR 1.5; low is 8×8, 4 substeps, DPR 1. WebGL is used with a
  Canvas 2D textured-triangle fallback.

### Phase 3 shared engine

**Environment Engine: `core/environment.js`.** One Hushfold realm per
container. `new Environment(wrap, {screen, quality, reducedMotion, gate})`,
then `mount(realmId, {mood | emotion, intensity, transform, groundY})`,
`remount`, `setMood(m)` (throttled: forwards at most every 200 ms unless an
axis moves by 0.02 or more), `transform(p)`, `pulse(kind, pos)` (through a
`FlashGate`: refused pulses are dropped, never converted), `setFocus`,
`snapshot()`, `destroy()`, and the getters `realm`, `realmId`, `geo`, `tone`,
`mood`, `log`. Also `REALM_GEO` (horizon, water, sun/moon anchors per realm,
pinned to the production realm files by a test), `backdropTone`, `homeRealm`,
`lightAnchor`, `pulseGate`, `paintRealm` (a still frame of a realm) and
`isBlank`. Only this module calls `mountRealm`.

**Pointer routing: `core/pointer-router.js`.** `routePointers(el, {claim})`
claims off-body pointers in the capture phase before a Companion sees them
(Weather Weaver's tools). `watchPresses(el, {onBody, ms, onPress, onRelease,
onTap})` watches passively for still presses off the body (Hushbeat's and
Nightlight's breath lead).

**Ambient beds: `core/ambience.js`.** `noiseBuffer(ac, secs, colour)` and
`AmbientBed(sound, {layers, pad, respectFx, tau, fadeIn})` with `set`,
`setFreq`, `ramp`, `want`, `tick`, `end`. One kept voice; it rebuilds itself
after mute, a hidden page or the voice cap ends it.

**SoftMallow additions.** `bodyRect()`, `nudge({lean, squash, shear, tilt,
hop})`, `setFrameCap(fps)` (null = uncapped, 0 = paused; physics stays real
time through substeps), a `'tick'` event, `overlay(kind, params, dur)`,
`peekParams`, `setGrade([r,g,b])` (drawn by the mesh renderer's `uGrade`).

**Sound Engine additions.** `_voice(dur, {pan, dest, send, keep})`, a
keep-aware voice cap (`_room()`), `setTrim(k)` and `rest()` (Nightlight's
session volume and screen-lock rest), and `soundFacade(sound, {fx, voice,
skip})` / `quietSound(sound)` for Companions whose own sounds should be
scaled or silenced (Hushbeat, Nightlight).

**Effects additions.** `FlashGate({max, windowMs, gaps, bright})` (the one
photosafe limiter: at most 3 bright events a second per screen, realm and
lab effects together), cached `glowSprite`s, `glowBlend(surfaceTone(el))`,
and EffectsLayer options `manual`, `before`, `dprCap`, `className`, `zIndex`
with a public `render(dt)`.

**Character controls.** `FaceMixer(rig, owners)` merges face overrides from
several owners (base, mode, event) into one object; `softened(kind, {gentle,
reduced})` and `Personality.setFilter(fn)` keep reactions gentle where a
feature needs it; `Companion` takes an `onGesture(type, d, companion)` hook.

**Stage screen and lab shell.** `stageScreen` gains `sound`, `feedback`,
`keys`, `onGesture`, `onLayout`, `stageLabel`, returns `wrap` and `env`, and
has a duet API: `setPartner(mallowId | null, {quality, tier})`, `companions`,
`stages`, `partner`. `ctx.addCompanion(c, {tier})` lets lab-wide settings
reach a partner Companion. Kept Hushbeat tunes are handed to Hushbeat by the
home offer.

### Phase 3 experiences
- **Hushfold Weather Weaver:** `docs/WEATHER.md`.
- **Hushbeat Symphony:** `docs/HUSHBEAT.md`.
- **Mallow Nightlight:** `docs/NIGHTLIGHT.md`.

### Not built yet (later phases)
These are planned modules: the Keepsake Renderer (Phase 4, which can start
from `Environment.snapshot()` and `paintRealm`) and the Connection Interface
(Phase 5).

## Integration

These are the points that will change when the lab joins the main app:

| Seam | Today (lab) | Later (main app) |
|---|---|---|
| Rig internals | `SoftMallow` subclasses `MallowRig`. The contract is listed in `adapters/rig-adapter.js` and checked at construction. | Keep the subclass, or move the mesh stage into `rig.js` as an option. Either way it's one file. |
| Preferences | Device settings: `core/prefs.js` → `hm.sensorylab.v1`. Comfort DNA: `LocalComfortStore` → `hm.sensorylab.comfort.v1` | `SupabaseComfortStore` with the authenticated client from Claude 1's auth, after the draft table (`docs/drafts/comfort_profiles.sql`) is reviewed and applied outside production first. |
| Sound | Its own `SoundEngine` with lab settings | Share the main app's sound on/off and volume preference through an adapter. |
| Haptics | `src/engine/haptics.js`, gated by the lab's setting | The same module. |
| Navigation | Hash router in `lab.js` | The main app's scene router. Features already export `mount(root, ctx)` / `unmount()`. |
| Entitlements | `features/registry.js` → `tier` (metadata only) | The main app's `entitlements.js`, with server-side verification. |
