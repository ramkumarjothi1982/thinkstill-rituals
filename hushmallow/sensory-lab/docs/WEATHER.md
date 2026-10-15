# Hushfold Weather Weaver (`#weather`)

The Mallow sits in a Hushfold world, and the sky above it is something you can touch. Clouds part under
a finger, rain gathers into a glass bead, silk currents follow a drag, sunlight and moonlight go where
you take them, stars come to the fingertip, mist wipes away, embers kindle and water swells. Eight
weathers sit on a dial. Each happens in a realm that can paint its sky, and reshaping a weather moves the
realm toward its own authored resolution. The Mallow is the centre throughout: it watches the weather,
feels it in its body and answers in character.

The weather is a metaphor the person picks ("Pick a sky"). Nothing infers, labels or stores anyone's
feelings, and nothing is kept beyond this session's last weather, held in module memory.

This page is the feature's reference: what it does, how it is built, the public APIs of its modules, the
realm tables, how it is tested, and what still needs a real phone. Shared engine APIs (stage-screen,
Environment, pointer router, ambience, effects, sound engine, FaceMixer, Comfort DNA) are in
[ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. The experience

1. **Arrive.** The screen fades in on the home realm in its entry weather (never Storm). The weather's
   elements enter over 1.2 s, the hint shows at 0.8 s, and the Mallow sniffs the air and looks at the
   lead element.
2. **Choose.** A dial pick either **turns** the weather in place (the old weather leaves while the new
   one arrives, and the camera leans toward it) or sends a **weather front** across while the world
   changes behind it. The Mallow watches the leading edge, then gives its arrival reaction.
3. **Reshape.** Touch moves the weather toward its gentle form. Its **progress** drives the realm's mood
   and transform, so the realm's own resolution is the reward. The world answers at two speeds: the lab
   layer and realm pulses within a frame, the realm's painted weather over about 4 s.
4. **Rest.** At progress 1 the resolve beat plays: the Mallow's resolved reaction, a soft bloom, the
   `bright` motif, a caption and one authored line from the Mallow (4 s), and the lead chip becomes
   **Again**. Every element can still be touched.
5. **Leave.** Close or Escape at any time: the elements fade over 450 ms, the Mallow nods, the `rest`
   motif plays, the bed fades, and the screen returns home.

There are no progress bars, counters, dots or streaks. Progress shows only in the world.

### The eight weathers

| Weather | Gesture → what happens | Progress → resolve | Chip · arrows |
|---|---|---|---|
| Sunshine | drag: a warm light pool glides to the finger; a beam from the realm's sun; the overcast haze burns away along its path; resting 0.8 s sends a sunbeam (day realms); basking on the Mallow | max(painted / 0.7, bask s / 5) → golden hour | Bring the sun · moves the pool 28 px |
| Wind | drag: a jet in the flow field; ribbons stream, fluffs ride it; a gust brushes and leans the Mallow; circles make eddies; slow smooth strokes build calm | calm → "Just a breeze now." | Send a breeze (tap: one sweep; held: a calming breeze) · a sweep from that side |
| Fog | wipe 34–60 px by speed, a hold grows a clear patch, a tap opens a puff; it refills (τ 9 s); the Mallow glows like a lantern | fogClear / 0.75 → the fog lifts, dew glints | Clear the mist (a spiral from the Mallow) · a band from that side |
| Rain | hold still: a glass bead gathers drops; let go up or in the deck → light (the rain thins); low → it falls; a swipe sweeps and leans the rain; a drag on a deck puff moves the deck | (1 − rainLevel) / 0.85 → the deck drifts off, puddles glint | Catch the rain (a sheltering bead) · leans the rain |
| Storm | swipe across the bank: thunderheads part like curtains (a sideways swipe carries the puffs ahead of the finger and parts them at the fingertip, so it opens the sky as a downward one does); two fingers spread a gap; light shafts reach the ground and the Mallow; strikes 8–14 s apart (soft glows when gentle or reduced) | clear / 0.7 → the clouds drift leeward | Part the clouds · pushes the nearest puff |
| Moonlight | drag: a silver pool (heavier lag), a moonbeam, glitter and ripples on water; resting in the sky sends a falling star (≥ 6 s apart); moonlit breathing | dwell → "The tide is still." / "The night is clear." | Bring the moonlight · moves the pool |
| Starlight | sweep up an orbiting cluster; let go away → a constellation in the Mallow's own shape; let go on the Mallow → a star shower | constellations / 3 | Gather stars · each press asks for one more star |
| Warm glow | dim embers wait and the Mallow glows like a hearth; drag a warm ribbon that kindles embers; tap one; holding the Mallow makes it the hearth (warm rings kindle by radius) | heat → "Everything is glowing." | Spread the warmth (the hearth) · kindles that side |

**Water** (every weather but Fog, in realms with water): a drag sends a swell (60–220 px/s), a tap a
ripple, a hold a rocking swell; a swell reaching the Mallow bobs it (big ones: a hop and drops); swells are
gold in Warm glow and add heat. A travelling swell rides every water row in perspective, and is drawn in full
(a dark trough, a lit crest, a glint) on the row clear of the Mallow (`swellRow`: below it and above the
controls if there is room, else above it), because the weather canvas is behind the Mallow. The **Push the
water** chip sends one from alternating sides; the first time there is water, a one-time hint says so, and it
waits its turn: never while another hint, a caption or a front is showing (`hintLine().busy`), and not within
4 s of a weather change, so it never cuts the instruction for the weather just picked.
**Puddles** appear in dry realms after rain, either side of the Mallow on the ground just in front of its base
line, and ripple when touched. Each is soft-edged water (no outline): the sky's light in a bright middle, a darker
wet rim, a sheen along the far side (white over a bright sky) and one gentle glint. Where the shown swell row runs
under the Mallow, it passes behind the pedestal or pad the Mallow stands on (clipped out over 1.24 × its body
width), so only open water shows it.

Pick order for a claimed pointer: a held object, then the light pool (within 1.4 r), a deck puff (Rain),
the water band or a puddle (12 px of hysteresis at the horizon), then the lead tool. During a front,
every off-Mallow drag pushes the front. Touching the Mallow is always TouchTalk (the router never claims
a pointer that `rig.hitTest` places on the body).

---

## 2. Files

| File | Holds |
|---|---|
| `core/weather.js` | Pure: `COPY` (every user-facing string), the weather table, realm traits, `pickRealm`, `moodFor`, `transformFor`, `pulseFor`, `progressFor`, `classify`, `TransitionPlanner`, `WeatherSession`. Imports only `math.js`. |
| `core/weather/field.js` | `FieldGrid`, `SimBase`, `scatter`, `segDist2`. |
| `core/weather/clouds.js` | `CloudBank` (thunder / deck), `MistField`, `StrikeClock`, `glowEnvelope`. |
| `core/weather/rain.js` | `RainField` (drops, beads, sweeps, shelter, wetness). |
| `core/weather/wind.js` | `WindField`, `Ribbons`, `Fluffs`. |
| `core/weather/water.js` | `WaveField`, `Puddles`. |
| `core/weather/light.js` | `LightPool` (sun / moon, haze), `EmberField`. |
| `core/weather/stars.js` | `placeStars`, `constellationShape`, `StarSwarm`. |
| `core/weather-mallow.js` | `FEEL`, `REST`, `decide()` (pure) and `WeatherReactor` (the applier). |
| `core/weather-sound.js` | `bedLevels()`, `padFor()` (pure) and `WeatherSound` (AmbientBed plus one-shots). |
| `core/weather-draw.js` | Canvas 2D drawing, no state: sprites, tints and one `draw*` per element. |
| `core/weather-layer.js` | `WeatherLayer` (the `.wx-back` and `.wx-front` canvases), `labGlowGate()`. |
| `features/weather.js` | The screen: stage-screen, sims, tools, reactor, sound, layer, UI, the loop, keys, visibility, quality, `__lab.weather`. |
| `features/weather/tools.js` | `createTools(api)`: pointers → sim operations and weather events; the chips' alternatives and arrow keys. |
| `features/weather/ui.js` | `weatherDial`, `actionRow`, `hintLine`, `WEATHER_ICONS`. |
| `styles/weather.css` | Scoped `.weather` styles (two fixed 50 px bottom rows, chips, dial, hint). |
| `tests/weather.test.mjs` | Unit tests U1–U19, R1–R6 for the third review's findings, and R7 for the visual QA pass. |
| `tests/e2e-phase3-weather.cjs` | Browser tests (blocks listed in §10). |

Paint order, back to front: the realm canvas and `canvas.wx-back` (in `.stage-wrap`), `.stage-tint`, the
Mallow (`.stage`), `canvas.wx-front` (only what is held and blooms; none on the low tier), the hint and the
`.sr-only` announcer, the top bar, the bottom rows (the action row, then the dial).

---

## 3. Module APIs

### `core/weather.js` (pure)

```js
DIAL_ORDER = ['sunshine', 'wind', 'fog', 'rain', 'storm', 'moonlight', 'starlight', 'warm']   // WEATHER_IDS
TOOLS, WATER_TOOL, ALL_TOOLS, REALM_ORDER, DAY_REALMS, WATER_REALMS, DRY_REALMS
WEATHERS[id] = { id, label, hint, say, caption, captionWater?, tool, family: 'cloud'|'light'|'night',
                 base, resolved, T, hosts: {realmId: 0..3}, order: [realmId], alt: {label, hold} }
COPY                                   // every string: labels, hints ≤ 48 chars, captions, announcements, lines per Mallow
hostScore(w, realmId) → 0..3
pickRealm(w, { current, home }) → realmId
ENTRY, entryWeather(realmId) → weatherId
moodFor(w, progress, live, realmId, { gentle }, out) → { agitation, heaviness, clarity, warmth }   // no allocation
STATIC_AG = 0.32                       // agitation ceiling in the Static Storm, every weather
transformFor(w, progress, resolved) → 0..1
pulseFor(event, realmId, { reduced, gentle, n, weather }) → 'tap'|'ripple'|'success'|'burst'|'strike'|'clear'|null
PULSE_EVENTS, POINTER, classify(track, nowMs) → 'pending'|'tap'|'hold'|'drag', isFling(vx, vy)
progressFor(w, metrics) → 0..1, captionFor(w, realmId), lineFor(mallowId, w), realmShort(name), realmPhrase(name)
TIMING
new TransitionPlanner({ reduced, tier, speed, weather, realm, pick })
  .request({ from, to, fromRealm, toRealm, dir, viaKey }) → 'turn'|'front'|'queued'|'cancelled-swap'|'none'
  .step(dt) → { phase, k, cover, swapNow, resetNow, leaveK, enterK, from, to, realm, toRealm, mode, dir }   // reused
  .arrive(w, realm) · .again() · .finish() · .drag(pxPerSec) · .amount(w) · .setReduced/.setTier/.setSpeed · .busy · .snapshot()
new WeatherSession({ home, weather, reduced, tier, speed })
  .begin() · .choose(w, { dir, viaKey }) · .again() · .update(dt, raw) · .leave() · .pause() · .resume() · .snapshot()
  .state · .weather · .realm · .progress · .resolved · .resolvedNow · .arrivedNow · .swapNow · .resetNow · .planner
```

### Sims (`core/weather/*`, pure, Node-tested)

Every sim extends `SimBase` (`amount`, `target`, `enter(dir)`, `leave(dir)`, `setReduced`, `setSpeed`,
`setTier` (shrinks only), `reset`, `emit(type, x, y, k)`), sizes typed arrays once for the high tier,
and steps in sim time.

| Class | Main API | Events |
|---|---|---|
| `CloudBank({ kind, tier, seed })` | `resize` (a bank on screen scales with everything the person did; an unseen one lays out afresh), `push`, `spread`, `nudge`, `hit`, `grab`/`drag`/`release`, `flash(x)` (≤ 1 a second), `apart(k)` (a morph's parting, drawn only), `step(dt, wind)`, `coverage()`, `clear()`, `columnCover`, `gaps(out)`, `drawX(i)`, `ver` (bumps when a puff's shape changes: the sprite cache) | — |
| `MistField({ tier })` | `resize`, `wipe`, `hold`, `lift`, `step(dt, windPx)`, `fogClear()`, `rise`, `sink` | — |
| `StrikeClock({ seed })` | `step(dt, { coverage, gentle, reduced })` → `'strike'`/`'glow'`/`'thunder'`/null; ≥ 8 s apart | — |
| `RainField({ tier, seed, lagoon })` | `resize`, `orbStart`/`orbMove`/`orbRelease`, `sweep`, `nudge`, `step(dt, opts)`, `sheltered()`, `orbs()`, `positions(out)`, `clearDrops()`, `level`, `intensity`, `wet` | `merge`, `hit-body`, `land-*`, `orb-up`, `splash-*` |
| `WindField({ tier })` | `inject`, `swirl`, `step`, `sample(x, y, out)`, `track`/`endTrack`, `energy`, `turb`, `calm`, `ambient` | `eddy`, `calm-loop` |
| `Ribbons`, `Fluffs` | `resize`, `step(dt, field, reduced)` | — |
| `WaveField({ tier })` | `resize`, `push`, `ripple`, `rock`, `step`, `height(x)`, `energy`, `motion` | `arrive`, `shore` |
| `Puddles()` | `resize`, `addWet`, `step`, `hit`, `visible`, `e` | — |
| `LightPool({ kind, tier })` | `resize`, `to`, `place`, `step(dt, body)`, `x y r height rest onBody onWater bask dwell painted`, `haze` (sun) | `rest`, `body-in`, `body-out` |
| `EmberField({ tier, seed })` | `resize`, `kindleAlong`, `kindleAt`, `kindleNear`, `radiate`, `heat`, `litCount` | `kindle`, `all-lit` |
| `StarSwarm({ tier, seed, mallowId })` | `resize`, `sweep`, `hold`, `release` → `{kind, n}` (the first constellation right above the Mallow, then left, then right), `gatherOne`, `moveCluster`, `prick`, `seedFrom`, `twinkle(i)`, `constellations`, `affordance`; `isGuide(i)` (the two or three brighter guide stars) | `gather`, `constellation`, `gift` |

### `core/weather-mallow.js`

```js
FEEL[mallowId] = { loves, wary, home, closed, shape, signature, bask, moonlit, rest, beats, cool? }
REST, restFor(mallowId, w, p), EVENT_TYPES, COOL, GAP (1.2 s), VOICE_GAP, POKE_GAP, CLOSED_EYES, isPositiveMix(mix)
createMemory() → mem
decide(input, mem, rnd) → actions[]
  // input { mallowId, style, reduced, motion, weather, progress, event?, cond?, body? }
  // cond  { t, dt, gaze, touch, pool, cluster, front, windAt, energy, lightOnBody, moonlit, bask, hearth, raining,
  //         heat, clusterN, touched }
  // actions: react | rest | face (dur: passing) | gaze | nudge | brush | poke | inflate | particles | peek
new WeatherReactor(companion, { mallowId, sound, mixer, style, reduced, motion, seed })
  .weather(id, progress) · .event(type, { x, y, k, vx, vy }) → actions · .conditions(cond, dt)   // ≤ 10 Hz
  .setStyle(s) · .setReduced(b) · .setMotion(k) · .touched · .log (last 32) · .destroy()
```

### `core/weather-sound.js`

```js
LAYERS, TIER_LAYERS (high 5 · medium 4 · low 2 noise layers; the pad on every tier), PAD, BED, WIND_HZ, RUMBLE_SWELL, GAPS
padFor(w, progress, warmth) → 0..1
bedLevels(s, out) → { rain, wind, rumble, lap, air, pad, windHz }   // no allocation
  // s { amount(w), weather, progress, warmth, rain, storm, wind, water, waves, mist, fade }
new WeatherSound(sound, mallowId, { tier, now })
  .update(levels, nowMs)       // ≤ 10 Hz; builds the bed once the engine is ready
  .setTier(q)                  // sheds layers only
  .drip(step, i, pan) · .patter(pan) · .splash(size, pan) · .swish(speed, pan) · .swell(k, pan, 'swell'|'arrive')
  .thunder(k) · .rumble(k) · .rise(n) · .shower() · .chime(step, i) · .glint() · .kindle() · .tink() · .pair()
  .wipe(on, speed)             // owns one sound.brush() handle
  .alive · .end(fadeS) · .destroy() · .debug() → { alive, wanted, builds, tier, layers, levels, played, wiping, ended }
```

### `core/weather-layer.js` and `core/weather-draw.js`

```js
DPR_CAP = { high: 1.5, medium: 1.25, low: 1 }, LAB_GLOW = { max: 1, windowMs: 1000, bloomGap: 1200 }
labGlowGate(now) → FlashGate            // allow('glow') ≤ 1 a second across both banks; allow('bloom') ≥ 1.2 s apart
new WeatherLayer({ wrap, screen, quality, reducedMotion, palette })
  .setRealm(id, palette, tone) · .setQuality(q) · .setReducedMotion(b) · .setPalette(p)
  .addBloom(x, y, r, color, dur ≥ 1.6) · .frame(dt, scene) · .frames · .stats() · .destroy()
```

`weather-draw.js` exports `buildSprites`, `freeSprites`, `weatherTints`, `stageFade`, rings
(`createRings`, `addRing`, `stepRings`, `drawRings`), `frontColour`, and one drawer per element:
`drawClouds`, `drawShafts`, `drawRain`, `drawBeads`, `drawAffordance`, `drawFront`, `drawStars`,
`drawConstellations`, `drawBeam`, `drawPool`, `drawHalo`, `drawGlitter`, `drawField`, `drawDew`,
`drawRibbons`, `drawFluffs`, `drawWater` (with `swellRow`), `drawPuddles`, `drawEmbers`, `drawTrail`, `drawGroundGlow`.
None allocates per frame (one beam gradient a frame is the only exception); mist and haze are one tiny
`putImageData` each, and their top row carries on up under the top bar from a one-row canvas of its own (a 1-px
source rect of the grid canvas is filtered with the row under it, which drew a seam where the field begins once a
wipe had cleared that second row), so no seam shows.
Each puff is composited once into its own sprite, as **one body**: its silhouette is drawn once (the union of its
sub-blobs as discs in the lit colour, with a firm, narrowly feathered edge: `puffFeather`, 2 % of a sub-blob for
a thunderhead and 10 % for the deck, never under `PUFF_EDGE_PX` 1.5 sprite px), and everything after it is drawn
inside it (`source-atop`): the body over each lobe shifted down-right, so each lobe's upper edge stays lit (the
rim, in register), then light along the top and a flat darker base, each easing in over two stops (a linear ramp
from flat colour drew a line). Nothing is drawn outside the silhouette, so the sprite's box is the silhouette's
own (plus a pixel). The gold-lit twin, made only once a storm starts to clear, repeats exactly this geometry with
the gold colours, so the two cross-fade in register. The long side is capped at `PUFF_CAP` 400 device px; a sprite
is rebuilt when the bank's `ver` changes or the sprites are rebuilt for a realm or DPR, so a puff costs one blit a
frame (two while the gold cross-fades in). (The review round's version drew three offset passes of stretched
blob bitmaps per puff; their soft edges and the lit pass sticking out above the body read as blurred, ghosted
puffs with a second copy offset beside each one, and the gold twin as out of register.)

Look notes (from the slice-5 screenshot review, the third review and the visual QA pass): thunderheads have a
firm edge (a puff can span half a phone, and a soft edge at that size reads as smoke), a lit upper rim inside
each lobe and a darker flat base, sizes by depth (back band ×1.15, front ×0.85) and a cool silver-lavender rim in
every realm (a festival's gold glow mixed into violet-grey read as a dirty tan rim); the rim turns a bright gold
lining only as a storm clears. On a wide sky (over 700 px) the thunder band is no deeper than a third of the
screen and each band breaks between groups of three (a smaller, higher head, at a different place in each band),
so the sky shows through. The rain deck is softer-edged low cloud whose puffs vary in size (0.8–1.22×) and height
(±15 % of its band), and on a wide sky every fourth is a small, high one, so it never reads as a stamped row; over
a bright sky it is a cool soft slate with a silver rim (the realm's warm sky and gold glow mixed in read as a muddy
brown band with ochre rims). Rain over a bright sky is a soft slate, never ink. Ribbons are wide soft silk bands
(a 20 px sheen, a 9 px body, a fine light edge, and over a bright sky a broad, faint shadow of the realm's deep
colour under them: a narrow one read as an outline) anchored at evenly spread heights; each link is eased toward
running straight on from the one before (`RIB_STIFF` 0.3), so they bend in arcs and never fold into hooks; their
heads follow the wind more (×0.6) and the head nearest a drawing finger follows it. Light beams
feather (three nested quads under the one gradient) and fade out at the pool's near edge. Stars carry two or
three brighter guide stars, and a loose star's halo grows smoothly with its twinkle (no size pop). In Warm glow
the Mallow is the hearth from the start: a low ember glow behind it and on the ground at its feet, a warm haze
along the horizon, and on arrival the three waiting embers nearest it swell in turn, outward (drawn only:
nothing is lit, so the progress stays the person's).

### `features/weather/tools.js` and `features/weather/ui.js`

```js
createTools(api) → { claim, storm, rain, sun, moon, stars, wind, fog, glow, water, trail, puddleRip, breeze,
                     get(w), has(w), alt(w), altStart(w), altEnd(), altActive, nudge(w, dx, dy), pushWater(),
                     enter(w), reset(w), step(dt), focus(out), windAt(out), active, wiping() }
  // api { sims, geo, weather(), amount(w), fronting(), frontDrag(v), locked(), onMallow(x, y), waterOn(),
  //       emit(type, x, y, k, vx, vy), reduced(), gentle(), ring(x, y), touched(w), flash(bank, x) }
weatherDial(order, value, onPick) → { el, set(id), reveal() }
actionRow() → { el, set(list, { disabled }), endHolds() }
hintLine(screen) → { el, show(text, ms), caption(text, line, name, ms), hide(), destroy(), busy, captioning }
WEATHER_ICONS
```

### The debug handle `__lab.weather`

Set on mount, cleared on unmount only if it is still ours: `state`, `weather`, `realmId`, `progress`,
`resolved`, `front` (planner snapshot or null), `setWeather(id, { instant })`, `act('lead'|'water'|'again',
'start'|'end'|'tap')`, `sims`, `metrics()`, `env`, `layer`, `reactor`, `tools`, `session`, `live()`,
`sound` (WeatherSound.debug()), `glows` (the lab glow gate's log), `said` (the announcer's last 10
messages), `events` (last 64), `pulses` (env.log), `geo()`, `settle()`, `debug()` (plain JSON).

---

## 4. Realms

`pickRealm(w)`: stay in the current realm if it scores 2 or more (or 1 or more when it is home); else go
home if home scores 1 or more; else the weather's first choice. A score of 0 is impossible, which also
enforces the sky rule (no sunshine at night, no moon or stars by day). Home is `homeRealm(dna, mallowId)`:
a realm chosen in Comfort DNA, otherwise the Mallow's own (`auto` and `stage` both mean its own realm here,
because this experience needs a world).

| Weather | blue-drift | sunpop | lagoon | moonmilk | spark | spiral | static-storm | first choices |
|---|---|---|---|---|---|---|---|---|
| Sunshine | 3 | 3 | 0 | 0 | 0 | 0 | 0 | sunpop, blue-drift |
| Wind | 3 | 1 | 1 | 2 | 3 | 1 | 2 | blue-drift, spark, moonmilk |
| Fog | 3 | 1 | 2 | 3 | 2 | 1 | 1 | blue-drift, moonmilk, lagoon |
| Rain | 2 | 1 | 3 | 2 | 1 | 0 | 2 | lagoon, blue-drift, moonmilk |
| Storm | 2 | 1 | 1 | 2 | 1 | 0 | 3 | static-storm, blue-drift, moonmilk |
| Moonlight | 0 | 0 | 0 | 3 | 2 | 0 | 0 | moonmilk, spark |
| Starlight | 0 | 0 | 1 | 2 | 2 | 3 | 2 | spiral, moonmilk, spark |
| Warm glow | 2 | 2 | 2 | 2 | 3 | 1 | 1 | spark, moonmilk, blue-drift |

**Entry weather** (never Storm, always a score of 2 or more): blue-drift Wind · sunpop Sunshine · lagoon
Rain · moonmilk Moonlight · spark Warm glow · spiral Starlight · static-storm Starlight. The start weather is
this session's last weather if there is one.

**Mood recipe.** `k = smoothstep(progress)`; each axis lerps base → resolved by k, then the live terms
(wind energy, the sun's height and painted haze, the hearth) and the realm rules: agitation ≤ 0.32 in the
Static Storm in every weather (its own lightning starts above 0.33, so the only bolts there are the lab's
scheduled strikes); the Spark Festival keeps heaviness ≤ 0.45 and warmth + 0.15 in Rain and Storm (the fair
stays partly lit); the gentle style keeps agitation ≤ 0.30. Transform = T · smoothstep(0.45, 1, progress),
latched at T once resolved. `env.setMood` sends at most every 200 ms unless an axis moves by 0.02.

| Weather | Base a/h/c/w | Resolved a/h/c/w | T |
|---|---|---|---|
| Sunshine | .10/.30/.62/.62 | .05/0/.95/.92 | .70 |
| Wind | live/.12/.60/.50 | .08/.05/.82/.55 | .30 |
| Fog | .04/.50/.08/.40 | .04/.08/.88/.50 | .40 |
| Rain | .20/.82/.35/.30 | .05/.10/.80/.55 | .50 |
| Storm | .70/.70/.15/.25 | .06/.08/.85/.60 | .60 |
| Moonlight | .08/.35/.55/.40 | .04/.05/.95/.50 | .60 |
| Starlight | .06/.12/.70/.45 | .04/.02/1/.55 | .80 |
| Warm glow | .06/.20/.60/.80 | .04/0/.85/1 | .75 |

Starlight arrives crisp (its realm draws sharp stars and the moon ring) and Warm glow already golden, so when
either turns in the same realm as Moonlight (the Moonmilk Cove keeps all three) each reads as its own sky;
their progress lives mostly in the realm transform, which keeps the U5 rule (a change of ≥ 0.4 on some axis).

**Pulses** (`pulseFor`, then the Environment's gate): touch tap · water push ripple · bead up success (tap in
the fair) · splash burst on water (8 drops or more) or ripple / tap · storm gap clear · storm strike
strike in the Static Storm only, never gentle or reduced · sun at rest strike (day realms) · moon at rest
strike in the cove, tap in the fair · constellation and gift success · kindle tap · hearth success at the
feet (every 2 s while the Mallow is the hearth; a tap in the fair) · resolved: clear for Storm, Rain, Fog and
Wind, success for the others · gust over water ripple. The Spark Festival's success is a firework crown, so
with the gentle style a constellation, a gift and a resolve are a tap there.

**Transitions.** A same-realm pick turns (the old weather leaves over 1.2 s, the new enters over 1.5 s from
0.3 s). Another realm sends a front: cover 0.9 s (0.7 s on the low tier), swap only at ≥ 0.95 cover after
two painted frames, reveal 1.4 s (a drag pushes it, never under 0.5 s); reduced motion fades (0.6 s in,
0.9 s out). Morphs: Rain → Starlight (drops in flight become the stars), Storm or Rain → Sunshine (the clouds
part from the centre and the pool slides down from the gap), Fog → any (the mist sinks to the floor; it
fades in place with reduced motion). The Storm or Rain → Sunshine parting is drawn only (`CloudBank.apart`):
coverage never sees it, and it closes as the bank enters again, so a quick pick back finds the storm exactly
as the person left it. Again (R, the chip, a re-pick) is refused under a front, including its reveal (the
weather was entered fresh at the swap); a re-pick while Again is running changes nothing, so its reset still
comes; and should any phase but the front's own ever be left with a veil, it lifts at reveal pace and the
screen stays "fronting" until it has gone. A front that starts over a veil still up carries on from it.

---

## 5. Sound

`WeatherSound` builds everything on the Sound Engine (SHARED C7–C9): one **AmbientBed** (`respectFx: true`,
τ 0.6 s, 1 s fade-in) as a single `keep` voice, and one-shots through the engine's `_ok` (ready, its
own rate limit and `_room()` under the voice cap) plus their own gates. Nothing exists before the first
gesture. The bed and every one-shot follow Touch sounds and Mute; the Mallow's voice and the motifs follow
the voice switch, as the engine does. If anything stops every voice (mute, a hidden page), the bed is
marked not alive and the next update rebuilds it with a fresh fade-in. The feature updates it at most 10
times a second from `bedLevels()`, so sound and picture cross-fade together through turns and fronts.

| Layer | Source | Peak | Follows |
|---|---|---|---|
| rain | pink noise → bandpass 3.2 kHz, Q 0.6 | 0.03 | the drops falling now |
| wind | pink noise → bandpass 300 → 900 Hz (follows energy), Q 1.2, 0.15 Hz gust LFO | 0.035 | wind energy |
| rumble | brown noise → lowpass 140 Hz | 0.045 | thunderhead coverage × presence; swells over 0.5 s with each cloud glow |
| lap | brown noise → bandpass 420 Hz, Q 2, 0.25 Hz LFO | 0.02 | realm water × (wave energy + 0.3) |
| air | brown noise → lowpass 500 Hz | 0.01 | mist density |
| pad | three oscillators on the Mallow's root → lowpass 700 Hz | 0.035 | 0.4 + 0.6 · warmth in Sunshine, Warm glow, Moonlight and Starlight; in the cloud weathers it rises only as they settle (none in a raging storm) |

Tiers: high has all five noise layers, medium drops air, low keeps rain and wind; the pad plays on every
tier. A tier drop mid-session rebuilds the bed with fewer layers (it never grows back).

| One-shot | Sound | Gate |
|---|---|---|
| `drip` (a bead forms, a merge, a water tap, a puddle) | sine plink on the Mallow's scale, 0.18 s, peak 0.04 | ≤ 6 a second |
| `patter` (a drop on the Mallow) | a tiny high tick, 0.08 s, peak 0.018 | ≤ 1 per 0.7 s |
| `splash` | bandpassed noise, 0.3 s, peak ≤ 0.05 | ≤ 3 a second |
| `swish` (clouds part, a wipe starts, a stroke of wind, a gust) | noise sweep 600 → 2400 Hz, 0.35 s, peak ≤ 0.03 | ≤ 4 a second |
| `swell` (a push) / `arrive` (reaching the Mallow) | lowpassed noise rising 380 → 620 Hz, 1.2 s, 0.4 s attack | ≤ 2 / ≤ 1 a second |
| `thunder` (0.4–1.2 s after a glow or strike) | lowpassed 160 Hz swell (0.35 s attack, 2.2 s) and a softer roll; never a crack; 0.6 strength after a gentle glow | ≥ 6 s apart |
| `rise` (a bead goes up as light) | upward sine glide with a high shimmer | ≥ 0.4 s apart |
| `shower` (a star gift) | four soft notes falling down the scale | ≥ 1.2 s apart |
| `glint`, `kindle`, `tink` | `sound.chime` up the Mallow's scale | one gate, ≤ 5 a second |
| `pair` (the first light through a storm) | chimes on steps 2 and 4 | once |
| `wipe(on, speed)` | the engine's `brush()`, following the wipe speed (the spiral chip 0.5) | one handle |

Haptics (only while the Haptics setting is on): bead merge `light` (≤ 4 a second), a gap opens `soft`, a
constellation `pop`, a big swell reaching the Mallow `soft`.

---

## 6. The Mallow

All per-Mallow data is in `FEEL`. A loved weather arrives with a celebration and a giggle; a wary one with
a low shiver (or a peek, for closed-eyed Mallows) and a curious face; the home weather with a celebration
and the Mallow's signature particles.

| Mallow | Loves | Wary of | Home | Some of its own beats |
|---|---|---|---|---|
| Glitzi | Storm, Wind | Sunshine | Storm | strikes delight it (a glitch burst, never a flinch); drops make it huff; basks proudly, then is caught enjoying it; the storm passing gets a proud sparkle and its shards (its glitchy celebrate hid its eyes and mouth just as the caption appears) |
| Blubi | Rain, Moonlight | Storm, Fog | Rain | drops make it blush; relieved tears when light reaches it after a strike; melts in moonlight |
| Zuzu | Starlight, Wind | — | Starlight | spins faster in the wind, dizzy in a fast eddy; counts drops; stares at its reflection when a swell arrives |
| Boppo | Sunshine, Warm glow | Storm | Sunshine | the brightest bask; hops in the puddles twice when the rain stops; bounces when light reaches it |
| Pipzi | Starlight, Warm glow | Fog | Warm glow | sparks as embers kindle; determined in the rain, then fizzes; whisper sparks in moonlight |
| Loomi | Wind, Fog | — | Wind | gusts make it float; barely blinks at a strike; a serene bob for a swell |
| Noomi | Moonlight, Starlight, Fog | Sunshine, Storm | Moonlight | a sleepy-morning yawn in Sunshine; lulled by 10 s of rain; peeks at a strike, then snuggles; slowest moonlit breath |

**Rules.** 1.2 s between one-shot reactions; 2.5–6 s per event type; 4 s between voices; the same tag never
twice in a row. Minor beats (drips, gusts, swells, kindles) never hold back a bigger one, and priority beats
(arrival, the gap, light reaching it, shelter, a constellation, a gift, the resolve) wait up to 2.5 s for
their turn instead of being dropped. While the Mallow is being touched, only its gaze moves. Strikes
habituate: the full response, then half with no hop, then a glance. The gentle style and reduced motion go
through `softened()` (no hops, celebrations or double taps; gentle also turns flicks, shivers and glitch
bursts into a tap, giggles into coos, and intensity × 0.7). Reaction kinds come only from the production
reactions and mixes only from the expression presets.

**Continuous coupling** (decided at most 10 times a second, written through one `FaceMixer`: owner `mode`
for the continuous face, `event` for a passing one): the resting face per weather (`restOverride`; Storm
turns from curious to hopeful as it clears); gaze (a weather touch → the light pool → a star cluster → the
front's edge → the last event → its own); a lean with the wind at its position (`rig.nudge`); glow from
light on the body (a shaft, the sun close by, the fog lantern, the hearth; light reaching it through a gap
puffs it up by 0.15 only while that face lasts); basking (inflate 0.2–0.4, glow
≥ 0.9, blush 1.6, a halo behind it); moonlit breathing (`breathRate` 0.14, Noomi 0.12, float ≥ 0.3); glow and
blush that rise with the heat in Warm glow; eyes that sparkle more as a star cluster grows. Gusts brush the
body at three points and lean it (a squint on strong gusts), drops poke it (≤ 4 a second), swells bob it.
After 12–20 s without a weather touch it looks over at the weather's lead element (closed eyes peek).
`destroy()` hands the Mallow back exactly as it was: no resting face, face override, inflate or weather gaze.

---

## 7. Photosafety, reduced motion and access

**Photosafety (SHARED C6).** At most 3 bright events a second per screen, split as: realm pulses through the
Environment's gate (at most 2 bright a second, with per-kind gaps) and the lab's own cloud glows through
`labGlowGate()` (at most 1 a second across the thunderheads and the rain deck; bead blooms ≥ 1.2 s apart).
Every lab brightening rises over at least 300 ms (glows 350 ms, blooms ≥ 0.8 s), twinkle is ≤ 1.2 Hz at ±0.25
with independent phases, the resolve bloom lasts ≥ 1.6 s, and the front's alpha never exceeds 0.96 and never
changes in under 0.6 s. Storm strikes are ≥ 8 s apart in sim time, never near the Mallow, and with the gentle
style or reduced motion they become soft glows with softer thunder. The Static Storm's own lightning never
starts (agitation ≤ 0.32 there in every weather). The `photo` browser block measures this through a 32×18
luminance probe over 10 s of Storm with a strike and a dark-to-bright realm change: the largest local rise
within 250 ms was 0.099 (limit 0.2), the largest whole-frame rise from one frame to the next 0.055 (limit 0.1),
and no second had a rise of more than 0.1.

**Reduced motion** (live through `prefs.onChange`; the mood targets are the same, so the meaning is kept):
drops ×0.4 and ×0.35 speed, drawn as dots; clouds and mist move only with the finger (ambient drift ×0.3) and
enter and leave in place; ribbons ×0.3 with no flutter; swells ×0.5 speed and ×0.4 amplitude; stars fade between positions
with no twinkle; embers swell without drifting; no strikes, camera lean or idle shimmer; the front is a fade;
the reactor nods instead of hopping; `rig.nudge` is ×0.25. Direct manipulation still follows the finger.

**Accessibility.**
- The dial is a radiogroup "Weather" of eight named radios (label and title), one tab stop, arrows move and
  select. The chips are real buttons in a group "Weather actions"; hold chips take Space or Enter holds and
  release on blur. A held key's repeats never press a chip, and when the lead chip becomes Again, keyboard
  focus moves onto it.
- Keys: 1–8 choose the weather from anywhere but a text field (a clicked radio or chip keeps focus, and the
  digits still work); the arrows shape it (when focus is on the stage); holding W is the lead chip, and it
  lets go when the window loses focus (a `blur` listener: no keyup would ever come); R is Again; the stage
  keys still reach the Mallow (Enter/Space, D, H (the hearth in Warm glow), P, S, T); Escape leaves with the
  fade. Keys go through stage-screen's `keys` hook (no document key listeners of our own). Enter or Space on
  the chosen radio does nothing, as on a native radio (Again is the chip, R or a pointer tap on the radio).
- A press in the world (not on the controls) takes keyboard focus back to the stage from a clicked radio or
  chip, so Enter is the Mallow's tap again and no focus ring appears after a mouse click.
- A mouse over touchable weather shows a grab cursor (`.stage.grab`; `.grabbing` while a weather pointer is
  held); over the Mallow and the controls, none.
- Focus starts on the stage, labelled "Weather Weaver with {Mallow}. Keys 1 to 8 choose the weather, arrow
  keys shape it, hold W to weave. Touch {Mallow} to talk."
- The announcer (`role=status`, ≥ 3 s apart, newest wins) describes the world and the Mallow, never the
  person ("Rain at the Raindrop Lagoon. Hold to catch it.", "The clouds are opening.", "Light reaches
  Boppo.", "The storm passed."). The visible hint is `aria-hidden`, so nothing is read twice.
- Chrome follows the realm's tone (`data-backdrop`); the title, subtitle, hint and caption carry a tight halo
  in the backdrop's ink under the soft glow, and the subtitle, hint, caption and line are never under 14 px. The
  subtitle is "{Weather} · {World}" (the same text for screen readers); the world name never breaks, and where the
  subtitle has to wrap (320 px) the world takes its own line without the dot, so no separator dangles, and the hint
  steps down 10 px to keep clear of it (`.wx-two`, `.wx-sub-two`, measured on every change and layout). The Mallow's
  line under a caption wraps balanced, so its name never sits alone on the second line. In a bright realm, when a
  storm bank or a dark front fills the top band (darkness over 0.5, back under 0.35), the title, subtitle and the
  hint and caption under them take the dark backdrop's light ink and halo (`.topbar.wx-ink-light`,
  `.wx-hint.wx-ink-light`); the chips and dial keep the realm's, over the still bright ground.
- At 320 px eight 40 px radios cannot fit: the dial shows exactly seven whole radios, scrolls one radio at a time
  to keep the chosen one clear of the edge, and a narrow 12 px fade on the side that has more says so without
  cutting an icon in half at the pill's end.
- The stage is focused on arrival so the keys work at once, but its focus ring (lab.css draws it on
  `.stage:focus-visible::after`) waits for the first key (`.wx-quiet-focus .stage:focus-visible::after
  { content: none }`): Chrome shows `:focus-visible` for a script's focus before any click, which on a deep
  link framed the whole screen in the accent colour. A pointer press in the world quiets it again until the next
  key (after a digit, a swipe left the whole scene framed like a selected box). After a rebuild only the chip that
  took focus by itself ignores presses for 0.7 s (a key still held from the old chip); a chip the person moves to
  answers at once.

---

## 8. Performance, tiers and the hidden page

One feature loop: the planner (inside the session) → presence → tools → sims → mood and transform →
reactor → sound → layer. The scene object, events ring and sim arrays are allocated once; sims step in sim
time with dt capped at 0.05 s, so nothing catches up in a burst.

| Budget | high | medium | low |
|---|---|---|---|
| Back canvas DPR | ≤ 1.5 | ≤ 1.25 | 1 |
| Front canvas | on (only while something is held or blooming) | on | off |
| Thunderheads / deck puffs | 12 / 8 | 9 / 6 | 6 / 4 |
| Drops | 140 | 90 | 50 |
| Ribbons × segments / fluffs | 8×16 / 10 | 6×12 / 7 | 4×10 / 4 |
| Stars / embers | 28 / 32 | 20 / 24 | 12 / 14 |
| Bed noise layers | 5 | 4 | 2 |
| Realm quality | auto | auto | low |

`ctx.quality` is polled once a second; a change calls `env.setQuality`, `layer.setQuality` (DPR cap, front
canvas) and `wsound.setTier`, and shrinks the pools (never grows them). A drop never undoes what the person
did: a cloud bank on screen draws fewer sub-blobs at once but keeps its puffs (and so its gaps and progress)
until it next lays out (Again, arriving fresh, or once it has gone), and the star pool never drops a star that
is held, flying, placed in a constellation or showering. A rotate or resize scales a bank on screen, so
`clear()` keeps its meaning. These are budgets, not measurements:
no frame rate is claimed until it has been measured on phones.

**Hidden page:** the loop stops; the router cancels held pointers (a cancel is a release at zero velocity, so
beads and clusters never stick); held chips, W and the brush end; the engine stops the bed and suspends. On
return dt restarts at 0 and the bed is rebuilt with a fresh fade-in.

**Unmount**, in order: the rAF, the router, holds, prefs and Comfort DNA listeners, visibilitychange, timers,
the hint and announcer, `wsound.end()` (the brush, then the bed), `reactor.destroy()`, `layer.destroy()`,
`clearGlowSprites()`, `env.destroy()`, `s.unmount()`, then `__lab.weather` if it is still ours.

---

## 9. Comfort DNA

- The favourite Mallow is on stage; a chosen realm is home (`auto` and `stage` mean the Mallow's own).
- `tuning()`: style (gentle: the gentle reaction mapping, agitation ≤ 0.30, glows instead of bolts), speed
  (0.82 / 1 / 1.14 scales ambient drift, wind and turns), motion (0.6 / 1 / 1.25 scales ribbon amplitude, swell
  height and wind lean).
- `palette()` tints the stars, moonlight, ribbons, embers and warm swells; the sun keeps its own gold, and
  realm colours never change.
- Voice and Touch sounds gate the Mallow's voice and the weather sound through `sound.setParts`.
- Live changes apply without remounting. No weather history, favourites or schema change; the only record is
  the router's `{kind: 'experience', id: 'weather'}`, and only while learning is on.

---

## 10. Tests

```
cd /home/user/thinkstill-rituals
node --test hushmallow/sensory-lab/tests/weather.test.mjs                      # U1–U19, R1–R7 (Node, no DOM)
node --test hushmallow/sensory-lab/tests/*.test.mjs                             # the whole unit suite
python3 -m http.server 8000                                                     # from the repository root
node hushmallow/sensory-lab/tests/e2e-phase3-weather.cjs [outDir]               # every browser block
PART=weather:sound,weather:photo node hushmallow/sensory-lab/tests/e2e-phase3-weather.cjs /tmp/out
PART=weather node hushmallow/sensory-lab/tests/e2e-phase3.cjs /tmp/out          # through the lead's runner
```

Reports go to `docs/phase3/weather/e2e-phase3-weather.json`, screenshots to
`docs/phase3/weather/weather-<vp>-<state>.jpg`. Software GL can run at about 6 fps, so every browser wait is on
state with generous limits, and nothing relies on frame counts.

| Unit test | Proves |
|---|---|
| U1–U4 | eight complete weathers; the sky rule and realm choice; entry weathers and Comfort DNA home; realm geometry matches the production sources |
| U5 | every weather visibly changes its world, monotonically, within the realm rules (the Static Storm never auto-bolts, whatever the weather or wind) |
| U6 | transitions: covered swaps exactly once, continuous retargets, bounded drags, reduced-motion fades; the session's states, progress and Again |
| U7–U14 | clouds, fog, rain, wind, water, light pools, stars, warm glow |
| U15 | the Mallow reacts in character within the rules (valid kinds and mixes, gaps, no repeats, habituation, touch, gentle and reduced, priority beats, strong gusts, heat glow, star sparkle, the idle look) |
| U16 | photosafety: glow envelopes, strike spacing, twinkle, strike pulses, the lab glow gate |
| U17–U18 | copy (no claims, short hints, announcements about the world and the Mallow); module boundaries |
| U19 | sound: `bedLevels`, nothing before a gesture, the bed as one keep voice, layers and levels, the rumble swell, one-shot gates, thunder without a crack, Touch sounds, mute, the voice cap, tiers, the brush, end |
| R1 | (third review) Again during a front's reveal is refused and the veil always clears (at reveal pace, the session fronting until it has); a front over a leftover veil never jumps; a re-pick during Again keeps its one reset and one resolve |
| R2 | sideways swipes part the storm on every tier (centre-out each way > 0.3, one full-width > 0.15, slower too, a real gap); vertical swipes puff for puff as before |
| R3 | a tier drop or a rotate keeps the parted storm (within 0.05) and the puff count waits for the next layout; a tier drop keeps every constellation star |
| R4 | a morph's parting is drawn only: coverage untouched, puffs drawn away from the centre, closed again on re-entry, none with reduced motion |
| R5 | the light-through puff is let go; the hearth is a tap in the fair; gentle festival constellations, gifts and resolves are taps |
| R6 | the swell row is clear of the Mallow in all three water realms; two or three guide stars; the first constellation forms above the Mallow |
| R7 | (visual QA) each puff is one crisp body: through a recording canvas, every puff sprite's silhouette is its sub-blobs drawn first as discs with a firm edge (thunderheads ≤ 4 sprite px of feather, the deck ≤ 12 % of a sub-blob), no stretched bitmaps, nothing but `source-atop` after it, nothing outside its box; the gold twin has the same silhouette and rims and is blitted on the same rectangle |

| Browser block | Proves (spec §13) |
|---|---|
| `open` | W1: opens from the home card and a deep link; on a deep link the stage's focus ring waits for the first key, and a press in the sky quiets it again until the next |
| `storm`, `rain`, `sun`, `moon`, `stars`, `wind`, `fog`, `warm`, `water` | W4, W6, W7: each interaction, its consequences, the Mallow, the alternatives (Storm: sideways swipes part it too, and each thunderhead is one crisp body, fresh and with the gold twin cross-fading in: the *edge* probe; fog: no seam where the mist begins, after a wipe too; water: the pushed swell shows on the strip below the Mallow) |
| `front`, `morph` | W8: covered swaps, chips under cover, drags, turns, the three morphs; Storm → Sunshine → Storm finds the storm untouched |
| `resolve` | W15: the resolve beat and Again |
| `motion` | W9, W12: reduced motion (fade front, same mood targets, live toggle); a hidden page freezes and releases |
| `dial`, `keys` | W2, W3: every weather from the dial; digits (also after a mouse pick), arrows and R; Enter on the chosen radio is not Again; a press in the sky takes focus back; a held W lets go on blur; the grab cursor |
| `exit` | W14: Close and Escape, nothing left behind, listeners and storage back to baseline |
| `sound` | W11, W12: no sound before a gesture; one bed; bead sounds; thunder; Mute ≤ 500 ms; unmute ≤ 1.5 s; Touch sounds; hidden and back; Close; no AudioContext |
| `photo` | W10: the luminance probe and the pulse and glow budgets |
| `dna` | W16: chosen world, palette, Slower, gentle, personalisation off |
| `mallows` | W17: all seven Mallows' entry weather, home arrival, and different readings of one strike |
| `access` | labels, the radiogroup, the announcer, keyboard holds, focus onto Again, repeats |
| `tier` | a live quality drop sheds bed layers, the front canvas and pools; nothing grows back |
| `layout` | W13: at all six viewports (390×844, 375×812, 320×568, 412×915, 1280×860, 844×390): no overlap, on screen, targets ≥ 40 px, the Mallow between the bars, the chosen radio in view, the dial resting on whole radios with an edge cue when it scrolls, the same baseline for all eight weathers; in Storm the hint's ink follows the title's and the subtitle never ends a line on its dot; the resolve caption and the Mallow's line on screen, clear of the chrome, at ≥ 14 px |
| `states` | W2: every radio in turn settles in its realm at `moodFor`'s target, the Mallow answers within 2 s, and the world is not a recolour of the last (the colour-residual probe > 12, with its self-check) |
| `reach` | W4: one gesture per weather; the realm's answer beyond the touch box + 60 px (stills at the target before and after), the swell along the water for waves |
| `touch` | W5, W7: every interaction by CDP touch, the two-finger spread at its midpoint, a tap on the Mallow is TouchTalk; no page scroll or zoom |
| `chips` | W6: Space held on every lead chip, Space on "Push the water", W held on the stage |
| `smooth` | W8: the realm's eased mood never steps > 0.2 per 100 ms through a turn and two fronts; a mid-turn frame is its own; the outgoing weather 300 ms in; a dragged front's shorter reveal |
| `leak` | W14: TouchTalk after Weather starts clean (no face, rest, inflate, realm, timer, rAF or keep voice of ours); blocked storage still opens |

**The probes** (all in `tests/e2e-phase3-weather.cjs`):
- *Colour residual* (spec §13): 96×54 composites of the realm and `.wx-back`; the RMS left after the best
  12-parameter affine colour map from one to the other. A hue-turned, brightened or tinted copy leaves under 3
  (self-check); consecutive weathers leave 13–55. Warm glow after Starlight at the Moonmilk Cove was the
  closest call (about 9, a near recolour) until the hearth glow and readable embers went in (now about 15).
- *Beyond the touch*: the realm animates by itself, so a live before/after diff mostly measures that (a
  no-touch control measured as much). The probe paints the realm twice as stills (`paintRealm`, one
  deterministic frame) at the target mood and transform before and after the gesture and diffs them outside
  the touch box + 60 px; the same target painted twice diffs exactly 0. Waves change no mood, so they diff the
  lab layer's water band against a no-touch control instead.
- *Luminance* (W10): see §7.
- *Edge* (visual QA): up each column of `.wx-back` (read from a copy) from under the bank to the first solid
  pixel, then down to where it is clear again: that ramp is a puff's lower edge. One firm edge ramps over about
  3 px; the blurred, ghosted sprites of the review round ramped over 7–22. The check: median ≤ 3k + 2 and 80th
  percentile ≤ 4k + 2 device px (k = canvas px per CSS px).

**Touch in the harness.** CDP delivers one touch event per rendered frame, and software GL renders a few
frames a second, so a first move sent a frame after the down reaches the page after the 220 ms hold threshold
and reads as a hold. The `touch` block sends the first move with the down (as a finger's arrives, a few ms
later) and keeps the moves between few and long. On a phone at 60 Hz this does not arise.

---

## 11. On a real phone

Simulated input proves state only. None of these counts as tested until it has been tried on a real iPhone
(Safari) and a real Android phone (Chrome, 412×915):

- Two-finger cloud parting; a resting finger catching rain with no callout or magnifier; a Safari edge swipe
  during a drag releasing cleanly.
- The silent switch, and audio unlocking on the first tap; the bed's level against the Mallow's voice; thunder
  felt as a soft swell, never a crack; the patter of rain on the Mallow staying calm.
- Locking the phone during a storm, then unlocking: no burst of audio, the bed returns with its fade-in, the
  scene resumes where it was (including iOS's `interrupted` audio state).
- Low Power Mode, and how warm the phone gets after 5 minutes; a front's smoothness on an older phone and on a
  120 Hz display.
- VoiceOver and TalkBack: moving through the dial, double-tap-and-hold on the hold chips, the announcements and
  their spacing.
- Android haptics on a catch, a parting and a constellation, and none when Haptics is off.
- A luminance and comfort review of Storm in the Static Storm and of the dark-to-bright realm changes.
