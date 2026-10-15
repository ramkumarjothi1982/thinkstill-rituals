# Mallow Nightlight (`#nightlight`)

A gentle bedtime companion. Your Mallow gets ready for bed in its own world at night and takes the light
down with it. The scene dims without masks, the session follows the wall clock (so a locked phone always
finds it on time, or finished), and nothing runs once the light has gone. It makes no claims about sleep.

This page is the feature's reference: what it does, how it is built, the public APIs of its modules, and
how it is tested. Shared engine APIs (stage-screen, Environment, effects, sound engine, FaceMixer,
Comfort DNA) are in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. The experience

Five beats per session:

1. **Arrive (0–15 s).** The world is painted while the screen is still black, then the screen rises over
   1.2 s (300 ms with less motion). It never flashes bright. The Mallow greets you sleepily, in character, and
   the mode's line shows for 3 s ("A soft glow to rest by.").
2. **Settle.** The mode's rhythm takes over. After 8 s without input the chrome goes to sleep: it fades out,
   Close stays at 35 % and still works on the first tap, and a tap on a faded control falls through to the stage.
   Keyboard focus in the chrome keeps it awake; a tapped or clicked control does not (Chromium focuses it).
3. **Keep company.** Small signs of life that never repeat exactly: slow blinks, a look up at its world's light,
   a dream twitch. Touches get drowsy, gentle answers, never a hop, a burst or a giggle.
4. **Drift down (the fade).** The world dims first, then the Mallow, while the sound falls. Below a Mallow level
   of 0.35 it falls asleep: a sleepy face, slower movement and blinks, a shallower breath, and its open eyes
   close (Glitzi's last). When the world reaches 0.25 it gives one soft sigh: a faint wisp of breath in its own
   night grade rises from the mouth, up and away, and is gone within a second. The world is repainted a little
   heavier (mist, a dimmer moon) at 25, 50 and 75 % of the fade. **A little longer** adds ten minutes, and a new
   Timer choice restarts from now; either way the light eases back up over 2 s and the Mallow wakes. A **Fade out**
   change keeps the end time and moves only the fade (switched off mid-fade, the light eases back up the same way).
5. **Finished.** The stage is torn down. A near-black end view shows the sleeping Mallow above a card:
   "Nightlight finished at 23:42." (between 05:00 and 11:00, "Good morning.") with one of the Mallow's own
   authored rest lines, and **Again** / **Done**. After 8 s the card rests dim (opacity 0.5), its text still
   readable in a dark room (the title ≥ 4:1, the rest line and Done ≥ 3.5:1); a touch or a key lifts it to full.
   Nothing runs: no animation frames, no voices, the audio suspended, no wake lock.

### Modes

| Mode | The Mallow | The night around it | Night sound (factor · pad / texture) | Steady frame cap |
|---|---|---|---|---|
| **Moonlight** | its own aura is the nightlight: the strongest glow of any mode (1.3 × the light, the others ≤ 0.8 ×), a slow ±12 % wave; every 40–70 s it looks up at its world's light; a tap is a touch-lamp swell (+0.4, rising over 600 ms, falling over 4 s) | the strongest halo (1.35) and floor pool (1.2), breathing ±20 % over 14 s with the glow; a few twinkles | 1.0 · 0.6 / 0.4 | 15 |
| **Breathing Together** | breathes with you (your Comfort DNA breath timing × the Speed setting; the cycle lengthens to × 1.12 over the first 10 min); a held press off the body, H, B or the **Hold to breathe in** chip leads the in-breath; captions for the first two cycles only | the halo swells with the breath | 0.9 · 0.5 / 0.5, the texture swelling with each breath | 24 |
| **Sleepy Companion** | a seeded evening: heavy blinks (or sleepy peeks for closed-eyed Mallows), yawns, stretches, settles, nods and dreams as it grows drowsy; a 4 s hold puts it to sleep in your hand | a dim halo, up to 3 fireflies | 0.8 · 0.6 / 0.4 | 15 (30 during a moment) |
| **Ambient Drift** | floats a little; its eyes follow a firefly now and then | clouds, twinkles, fireflies that drift toward your finger, a slowly sliding world; on high and medium devices with Movement Gentle the realm itself is live for the first 3 min and for 45 s after a touch; a soft bell on a firefly's glint, at most every 20 s | 1.0 · 0.3 / 0.7 | 20 |
| **Quiet Company** | almost still: no scripted moments | the halo only, drawn only when something changes | silent by default (the audio rests 10 s after the last touch); the **Sound** chip brings a faint pad back | 10 |

### Input and its alternatives

| Input | What happens | Without touch |
|---|---|---|
| Tap the Mallow | a sleepy peek and the Mallow's own drowsy answer; Moonlight's lamp swell (at most one brightening start per 2 s) | Enter or Space on the stage |
| Hold the Mallow | it leans in, comforted; the glow warms; Breathe: leads the inhale; Sleepy: 4 s or more means asleep at once | H held |
| Stroke | it leans into the hand; Sleepy: drowsiness rises | P |
| Squeeze, drag | gentle, scaled by motion; a night answer | S held, T |
| Still press off the body (≥ 250 ms, ≤ 12 px) | Breathe: leads the in-breath while held | **Hold to breathe in**, B held |
| Tap off the body | wakes the chrome; Drift: nearby fireflies drift toward the finger | — |
| Mode chips | a 1.2 s cross-fade into the mode, announced ("Breathing Together.") | keys 1–5; arrows in the group |
| ↑ / ↓ on the stage | brightness ± 10 %, eased, announced ("Brightness 40 %.") | the sheet's slider |
| **A little longer** (while fading) | +10 min (at most six times), the light eases back up over 2 s, the eyes open slowly | Tab, then Enter |
| Close · Escape | a 600 ms goodnight (a nod, a soft voice), then home | Escape (an open sheet closes first) |
| Again / Done (end view) | a fresh session from black / home | focus starts on Again; Escape is Done |

Touches never extend the session.

### Screen

- **Top bar:** Close · *Nightlight* with the subtitle "{Mode} · {Mallow}" ("Moonlight · Noomi") · the sliders
  button (**Nightlight settings**) · Mute.
- **Bottom** (a fixed height, so the Mallow is framed once and never jumps): the mode row (Moonlight · Breathe ·
  Sleepy · Drift · Quiet, a radio group dressed as chips; all five fit on phones, with smaller labels and no gaps at
  340 px and narrower, and a wider system font scrolls the row sideways with edge fades), and the
  status row: "Until 23:30", "No timer" or "Fading · until 23:30" (beside a chip it takes the short form
  "Until 23:30" at 360 px and narrower, and beside the long sound-back chip on phones; at 320 px that chip has the
  row to itself), with at most one chip: **Hold to breathe in** (Breathe), **Sound** (Quiet), **A little longer** (fading), or
  **Tap to bring the sound back** (the audio did not resume after the page was hidden). A newer need replaces the
  current chip until it is resolved.
- **Landscape** (≤ 420 px tall, a bedside stand): one row. The status text hides and the time moves into the
  subtitle ("Moonlight · until 23:30"); the chip stays inline after the modes. On these short, wide stages the
  Mallow is framed 1.28 × larger than stage-screen frames it (its scale is bound by the height there), and the
  caption sits a little lower and lighter, clear of the subtitle.
- **The caption** ("A soft glow to rest by.") steps aside while the sheet is open: the scene is the preview.
- **Night chrome** has no blur. It uses opaque night tokens on `.screen.nightlight` in either theme.

### The settings sheet (the sliders button)

Every change previews live behind the sheet: its scrim is clear, so the world and the sky show the new light
as the slider moves. In portrait it is a bottom sheet that keeps the sky in view; in landscape and on wide
screens it is a side panel, so the Mallow itself stays in view beside it, moved (with its halo) to the middle of
the space left of the panel while it is open (with less motion it stays put); in landscape the centred title and the
mode row, which the panel would cut in half, step aside while it is open. The sheet is fully opaque, traps
focus, closes on Done, the scrim or Escape, and hands focus back to the sliders button. Done stays at its foot as
an opaque pill on an opaque strip the sheet's full width, so the rows scroll under it and never show through: the
strip is opaque from its top edge, under a hairline (no fade), and at rest that edge falls in a gap, never through a
label, a sub-label or a control: between two rows, between a stacked row's label and its choices, or above the folded
Fade out, so a whole label can peek above it as a hint that more follows (the bottom sheet takes the height that
ends at such a gap, a little taller when that is a small step, else a little shorter; the full-height side panel's
strip reaches up to the gap above and lowers back to its own edge as the panel scrolls). When the rows are shorter
than the side panel, Done keeps to the panel's foot. The side panel is `min(380px, 42vw)` wide; in a narrow short
landscape (540–779 px wide, ≤ 420 px tall, such as 568 × 320 or 667 × 375) it is at least 300 px, so the sliders
stay beside their labels and the sub-labels keep to one line, and the Timer's six choices form an even 3 × 2 grid;
the Mallow, centred in the space left of it (half the panel's width, `--nl-panel`), still fits whole. The chrome
stays awake while it is open.

**A calm sheet on a small phone (Phase 4).** The everyday rows come first and the rarer ones sit behind one
disclosure, so a 320 × 568 phone shows Brightness, Light and Volume at rest (on 375 px and taller, the Timer and
Fade out too) and the rows scroll about 1.6 sheet heights instead of 2.7; nothing is dropped:

- **Inline rows** (Brightness, Light, Volume, and Fade out): the label and its value on the left in one column the
  same width in every row (8.8 em, room for "Brightness 100 %" on one line with a few px to spare), so the sliders
  line up and a changing value never resizes the slider or the row under the finger; a wider system font grows the
  column rather than running the value into the slider; the control takes the rest (at least 120 px, at most 260 px;
  without that room it drops under its label); the sub-label runs under both, on one line at 320 px. Brightness and
  Volume are described by their sub-labels (`aria-describedby`); Light has no sub-label, so no description (every
  ID the sheet refers to resolves).
- **Timer** shows its end time beside the label ("Timer  Ends at 23:40"), its six choices on one line (at 340 px
  and narrower with tighter padding, each still ≥ 40 px), and **Fade out** folded in under them as one group.
- **More settings** is a whole-row button (≥ 48 px, `aria-expanded`, `aria-controls`, named "More settings" and
  described "Speed, movement and screen"; a chevron turns, at once with less motion). It opens in place, keeps focus
  (Tab goes on into Speed) and scrolls the rows it shows into view above Done, never past itself; the scroll stops
  where Done's strip falls in a gap (between rows, or under a stacked row's label), so no row is left half under it:
  on a 320 × 568 phone Speed and Movement show whole and Keep screen on peeks by its label. It stays as the
  person left it while the page lives (never stored). A button rather than `<details>`, so the sheet's focus trap
  counts it; closing it with focus inside hands focus back to it.

| Row | Choices | Notes |
|---|---|---|
| Brightness | 5–100 % in 5s (default 40 %) | "Your screen's own brightness still applies." The value is shown beside the label and spoken as "40 %". |
| Light | Moon · Soft · Warm (default) · Candle · Ember | While sliding, only the colour grade follows; the world is repainted on release. |
| Volume | 0–100 % (default 50 %) | The session trim on the lab's own volume; reset when you leave. "Pauses if you lock the screen or switch apps." When sound is off: "Sound is off" and **Turn on** (together under the label on a narrow phone). |
| Timer | 10 · 20 · 30 (default) · 45 · 60 · None | Restarts from now (during the fade the light eases back up over 2 s). "Ends at 23:40" or "Runs until you close it", beside the label. |
| Fade out (in the Timer row) | On · Off | "Eases down over the last {n} minutes" (a third of the session, 2–8 min). Off: "Just dims in the last few seconds" (a 10 s settle). Disabled with None ("Needs a timer"). **A change keeps the end time**: only the fade moves (section 3, Time). When the fade under way is not the choice's usual length (switched on late, or "Fade out now"), the line says when it ends: "Easing down until 23:41". |
| More settings | the three rows below | A disclosure, closed at first. |
| Speed | Slowest · Slow · Natural | The rig's speed (0.62 / 0.75 / 0.9) and the breath and script tempo (× 1.25 / 1.1 / 1), live: the breath, the Sleepy script's next intervals and Moonlight's glow wave (its rate only, never a jump). It never changes when drowsiness arrives. |
| Movement | Gentle · Less · Still | When the lab or the device asks for less motion, Gentle is disabled ("Your device asks for less motion") and arrow keys skip it. |
| Keep screen on | Off (default) · On | Only where the browser has a screen wake lock: "Until the light fades, an hour at most. Uses more battery." A refusal turns it back to Off with "Not available right now". Elsewhere: "Your screen sleeps on its usual timer." |
| Finish | **Fade out now** · **Close Nightlight** | Fade out now ends gently within 12 s (hidden while already fading). Close Nightlight says goodnight and goes home. |

Footnote: "A gentle companion for winding down. It isn't a treatment for sleep problems." On screens 600 px tall
or less the rows are tighter (targets stay ≥ 40 px), the sheet may take 74 % of the height and the foot under Done
is slimmer.

---

## 2. Per-Mallow character

All of this is data in `features/nightlight/ways.js`, applied through the night response filter, the overlays
and the face mixer.

| Mallow | Night world | Arrival and sleepy sign | Stretch | Drowsy tap answer | Dream | "Still here" (back after > 30 s) | Bed texture |
|---|---|---|---|---|---|---|---|
| Noomi | moonmilk-cove | already yawning (first yawn at 8 s) | float | its peek and a coo; 1 in 3 a yawn | drifts up and settles, one moon mote | a peek | waves |
| Loomi | raindrop-lagoon at blue hour (no rain) | barely notices bedtime; sways like a buoy | melt (wide and lazy) | stays asleep: a smile and a little float, no sound | a slow drift | a smile | waves |
| Blubi | raindrop-lagoon | blushes and snuggles into its glow | tall, soft | a nod, a deeper blush, a coo | a blush rises | a blush | waves |
| Zuzu | spiral-observatory, dome open | heavy lids over its spirals, which slow down as it gets drowsy | tall, spirals turning | one slow swirl, a coo | a smile twitch | its spirals turn once | air |
| Boppo | moonmilk-cove, a little warmer | two tiny bounces, softer each time, then stillness (never a hop) | tall, with a yawn | a grin that squashes in place, a coo | a tiny bounce attempt | a sleepy grin | waves |
| Pipzi | spark-festival "after closing" | whisper sparks that fade as it gets drowsy | tall, with a yawn | two whisper sparks, a coo | one spark | one spark | hush |
| Glitzi | static-storm, calmed | keeps its side-eye open longest; its glitch lines dim | tall, with a shake-off | one eye opens, faint static, a quiet grumble | its lines glow softly | opens one eye, then looks away | hush |

- **Night worlds** (`nightWorld`): the Comfort DNA environment `stage` gives the painted plain night; a
  night-capable realm (static-storm, raindrop-lagoon, spiral-observatory, spark-festival, moonmilk-cove) is used
  as chosen; a day realm (blue-drift, sunpop-orchard), `auto` or anything else gives the Mallow's own night world.
- **The night filter** (`nightFilter`, installed with `Personality.setFilter`, on top of the gentle style): only
  nod, yawn, sigh and release reactions; only coo, hum and content voices (grumble for Glitzi and Noomi); excited,
  surprised, playful or anxious faces become the Mallow's calm night mix; responses at ≥ 0.62 intensity (so the
  rig's own idle hops stay asleep), softer pokes, and tags that start with `night-`.
- **Glitzi's** glitch values stay at 0.75 or below (the rig bursts above 0.8).

---

## 3. Architecture

```
features/nightlight.js           mount(): the session view and the end view, the debug handle
  ├─ features/stage-screen.js    backdrop null, keys, onLayout, the night sound facade, extraButtons
  ├─ nightlight/session.js       SessionClock (wall-clock deadline, resume), DisplayLevels, the record    (pure)
  ├─ nightlight/settings.js      NightSettings (one prefs key), cleanNight, MOTION_RULES                 (pure)
  ├─ nightlight/look.js          nightLook (grades, glow, halo, light colour), LightLimiter              (pure)
  ├─ nightlight/pacing.js        BreathPacer, SleepyScript, rampFor                                      (pure)
  ├─ nightlight/ways.js          NIGHT_WAYS, NIGHT_SCENES, nightWorld, nightFilter, restFor              (pure)
  ├─ nightlight/modes.js         MODES, startMode, Moments, Timeline                                     (DOM-free)
  ├─ nightlight/bed.js           nightSound (facade), bedPlan, NightBed on AmbientBed                    (DOM-free)
  ├─ nightlight/copy.js          COPY (every string), clock, endTitle                                    (pure)
  ├─ nightlight/world.js         WorldLayer: painted, graded stills; Drift's live window; paintNightStage
  ├─ nightlight/sky.js           NightSky on a manual EffectsLayer (halo, pool, twinkles, fireflies, clouds)
  ├─ nightlight/sheet.js         openNightSheet (the settings sheet), sheetView                         (sheetView pure)
  ├─ core/frame-pacer.js         fpsFor, FramePacer                                                      (pure)
  └─ core/screen-wake.js         ScreenWake (opt-in, honest wake lock)
```

Shared engine pieces it uses: `Environment` and `paintRealm` / `isBlank` (stills and the live window),
`EffectsLayer({ manual: true })` and `glowSprite`, `FlashGate` (inside LightLimiter), `FaceMixer`,
`Personality.setFilter`, SoftMallow `setFrameCap` / `'tick'` / `setGrade` / `overlay` / `peekParams` /
`nudge` / `bodyRect`, `watchPresses`, `AmbientBed`, `soundFacade`, `setTrim` / `rest`, and the lab-ui
`announcer`, `segmented`, `holdButton`, `openSheet` and the `sliders` icon.

### Layers, back to front

`.stage-wrap` (black; the two `canvas.nl-still` cross-fading, `div.nl-live` + `div.nl-grade` only in Drift's
live window) · `canvas.nl-sky` (DPR 1, behind the Mallow) · `.stage` (the rig, graded in its shader) · the top
bar and bottom · the caption (aria-hidden) and the one live region · the sheet and its clear scrim.

### One frame clock (no setInterval, no rAF of our own)

The rig's capped `'tick'` drives everything, in this order: the clock (`sync`, `phase`, `levels`), the displayed
levels (eased; they never rise on their own), brightness and Light eased with τ ≈ 0.4 s, `nightLook`,
`rig.setGrade` and `world.setGrade` (re-baked only when a channel moves ≥ 0.004), the frame cap
(`FramePacer.apply`), the night face base and the fade's face, the sigh and the repaint steps, the Mallow's
moments, the mode, `face.apply()`, the sky, chrome tokens, the bed (≤ 1 Hz inside), chrome sleep, the record
(only when `clock.rev` changes) and a quality poll (≤ 1 Hz). Every timer is a one-shot (the caption, the reveal
and unveil fallbacks, the goodnight, the end card's 8 s, the settings debounce).

### Light without masks

The world's brightness and colour are baked into the still with a `multiply` fill; the Mallow is graded by
`uGrade` in the mesh shader (brightness and 40 % of the colour shift, so it never looks washed out); particles
take the Mallow's grade as they are born. A sigh's puff (the rig's own is a hard, pale disc that lingers on the
mouth for over a second) becomes a soft wisp (`look.js` `sighPuff`): the Mallow's grade on a pale tint, drawn by the
Nightlight as a glow sprite with a `screen` blend at ≤ 0.3 opacity (fading in over ≥ 300 ms), rising up and away in a
small fan (about 0.6 body heights) and gone within 0.9 s of rig time. The aura and the light sit outside the grade. At low brightness the
Mallow stays at ≥ 0.45 and at least 2.5 × its world.

### Time

Session time is the wall clock: a deadline (`endsAt`) and a fade start (`fadeFrom`). The record lives in
sessionStorage (`hm.sensorylab.nightlight.session.v1`), so a reload or a Mallow change within 5 s resumes the
same deadline; a reload after the end (within 6 h) shows the end view, never a bright restart. Leaving the end
view any way (Again, Done, Escape, or back, which changes the route) forgets the session. A backwards
clock jump shifts the whole session, so the time left never grows; a forward jump can only end it early.

**Timer and Fade out.** A Timer change is a new session length from now (`restart`). A Fade out change keeps the
end time and moves only the fade's start, so its length (`setFade`, Phase 4):

- before the new fade would begin, it starts its usual length before the same end: On, a third of the session
  (2–8 min); Off, the last 10 s. Switched off during the fade, the fade moves back to the last 10 s, so the session
  is steady again and the light eases back up over 2 s (as after "A little longer"), still ending on time;
- switched on with less than the fade's length left, the fade starts now and still ends at the same time (shorter),
  from the light as it is (no jump down), announced "Fading out.";
- a fade already under way inside the new window carries on from where it is (switched off in the last 10 s,
  nothing visible changes);
- a short fade under way (12 s or less: "Fade out now", which always starts at once, or the last seconds) is never
  moved, from its very first moment: the same start and end, still fading, "Fading out." said once. It is read from
  the fade's own length, so it holds after a reload too; after "Fade out now" and then "A little longer" the fade is
  ten minutes away, not under way, so a Fade out change applies to it again;
- with No timer, or once ended, only the choice is kept.

The record (and so a reload) keeps the end and the fade as moved. "A little longer" then moves both by ten minutes,
keeping the fade's length.

### States

`booting → arriving (15 s) → steady → fading → ended (end view)`, with `leaving` (600 ms, then home) from any
state (an end that falls inside those 600 ms still goes home), "Fade out now" (12 s) from arriving or steady,
"A little longer", a new Timer or Fade out switched off back from fading, and Fade out switched on late into fading.
While hidden the screen is veiled at once (opacity 0, no transition): nothing runs and nothing catches up. On
return the levels are set from the clock under the veil, which lifts over 600 ms; after more than 30 s away the
Mallow gives its "still here" sign; a session that ended while away opens the end view at once and quietly.

---

## 4. Module APIs

### `features/nightlight/session.js` (pure)
`STORE_KEY`, `TIMER_MINUTES`, `ARRIVE_S` 15, `EXTEND_MIN` 10, `MAX_EXTRA_MIN` 60, `STOP_SOON_S` 12,
`fadeSeconds(minutes, fade)` (clamp(min·20, 120, 480) s, 10 s off, 0 with no timer), `levelsAt(u, out)`,
`validRecord(o, now)`. **`SessionClock({ now, minutes, fade, mode })`**: `start()`, `restart({ minutes, fade })`
(a Timer change: from now), `setFade(fade)` (a Fade out change: the same end, only the fade moves; true when it moved),
`extend(10)`, `stopSoon(12)`, `setMode(id)`, `sync()`, `phase(t)`, `levels(t, out)`, `remaining(t)`,
`toJSON(leftAt)`, `static restore(json, now)` → clock | `{ ended, endsAt }` | null; getters `startedAt endsAt
fadeFrom minutes fade mode extra fadeMs canExtend`, and `rev`. **`DisplayLevels`**: `step(dt, target)`,
`snap(target)`, `rise(2)`. `saveRecord`, `loadRecord`, `clearRecord` (each in try/catch).

### `features/nightlight/settings.js` (pure)
`MODES_ORDER`, `SPEEDS` ({rig, k}), `MOTIONS`, `NIGHT_DEFAULTS`, `MOTION_RULES` (what Gentle, Less and Still
allow), `cleanNight(raw, base)`, `defaultsFromDNA(dna)`, `effectiveMotion(setting, reduced)`, `tempIndex`,
`tempAt`. **`NightSettings(prefs, dna)`**: `get()`, `set(k, v, { persist: 'debounced' | 'now' | false })`,
`flush()`, `reload()`, `onChange(fn)` → unsubscribe, `destroy()`, `writing`.

### `features/nightlight/look.js` (pure)
`TEMPS`, `envGains`, `mallowGains`, `lightColour`, `mixHex`, **`nightLook(input, out)`** →
`{ worldB, worldGain, worldGrade, mallowB, mallowGain, mallowGrade, glow, haloAlpha, warmth, light, star }`
(no allocation per frame), `chromeTokens(look, out)`, **`LightLimiter({ now })`**: `request(k)` → `{ k, riseMs }`
or null (at most one brightening start per 2 s, each rising ≥ 300 ms), `log`. The sigh's wisp: `PUFF` (kind, tint,
peak, life, rise, drag, fan, size, fadeIn), **`sighPuff(p, { i, n, body, grade, reduced, rand })`** (turns a newborn puff
into the wisp, in place), `puffAlpha(t)`, `puffRadius(p, t)`, `gradeHex(hex, grade)` (5 % steps, few sprites).

### `features/nightlight/pacing.js` (pure)
**`BreathPacer({ inhale, exhale, speedK })`**: `step(dt)` → one reused `{ phase, k, level, turned }`, `lead(on)`,
`setSpeed(k)`, `period`, `duration`. **`SleepyScript({ seed, speedK, rampS, motion, closedEyes })`**: `step(dt)`
→ event | null, `touch()`, `holdLong()`, `drowse(k)`, `force(kind)`, `setMotion(m)`, `d`, `stage`.
`rampFor(minutes, fade)` (independent of speed).

### `features/nightlight/ways.js` (pure)
`NIGHT_SCENES`, `NIGHT_WAYS`, `NIGHT_SET`, `REST`, `nightWorld(mallowId, envPref, { temp, heavy })`,
`nightMood(world, { temp, heavy }, out)`, `nightSet(mallowId, d, out)`, `nightFilter(mallowId)`,
`nightVoice(mallowId)`, `restFor(mode, d)`, `peekFor(mallowId)`, `waysFor(mallowId)`.

### `features/nightlight/modes.js` (DOM-free)
`MODES` (id, label, name, line, cap, bed split, sky mix, chip), **`startMode(id, api)`** →
`{ tick(dt, t), event(e, ts), setMotion(m), stop() }` (Sleepy adds `script`, Breathe `breath`),
`Moments(api)`, `Timeline`, `TOUCHES`, `SWELL`, `LIVE`.

### `features/nightlight/bed.js` (DOM-free)
`nightSound(sound, mallowId)` (the shared `soundFacade`: touches × 0.6, no impact, night voices × 0.5, plus
`setQuiet(b)`), `bedPlan(input, out)` (pure: on/off and levels from the mode, Quiet, volume, the displayed sound
level, ended, hidden, leaving). **`NightBed(sound, { mallowId, texture, quality, temp })`** on `AmbientBed`
(`respectFx: false`, τ 1.5 s, a 4 s fade-in, peak 0.035): `want(plan)`, `touch()`, `breathe(phase, secs)`,
`chime()`, `setTexture(name)`, `setTemp(t)`, `tick(now)`, `end(fadeS)`, `destroy()`, `debug()`.

### `features/nightlight/world.js` and `sky.js`
**`WorldLayer(wrap, { quality })`**: `resize(W, H, baseline)`, `setScene(scene, { instant })`,
`setMood(partial, { force, instant })`, `setGrade(gain, { force })`, `setDrift(dx, dy)`, `goLive({ quality })`,
`goStill()` (idempotent: one snapshot and one 0.8 s cross-fade, then the live realm closes on its own timer, so a
repaint meanwhile cannot keep it alive), `stilling`, `sample()` → `{ lum, br }`, `debug()`, `destroy()`;
`paintNightStage(W, H, dpr, opts)`.
**`NightSky(screen, { before, quality, motion, seed })`**: `configure(mix)`, `setTone(glowHex, temp)` (the halo
and pool draw the two authored Light steps around `temp`, weighted, so easing the Light never builds new sprites;
twinkles and fireflies take the nearest step), `setLight(light, star)` (one colour), `setLevels`,
`setBody`, `setBreath`, `setHaloGain`, `attract(x, y)`, `setMotion`, `setQuality`, `frame(dt)`, `onGlint`,
`debug()`, `destroy()`.

### `features/nightlight/sheet.js`
**`openNightSheet(root, model)`** → `{ el, sync(), setMore(open), more, close({ quiet }), open }` (it fits the foot
between rows on open, when a row changes height, when the disclosure opens or closes, and on resize; let go on close). The model is getters and callbacks:
`state()` → `{ settings, labReduced, wakeSupported, wakeFailed, soundOn, endsAt, fadeMs, fading }` (`fadeMs`: the
clock's fade as now scheduled), `change(k, v, { persist, live })`, `fadeNow()`, `exit()`, `turnSoundOn()`,
`onClosed({ byUser })`. **`sheetView(state)`** (pure) is what each row shows; `fadeMinutes(minutes)`.

### `core/frame-pacer.js` (pure) and `core/screen-wake.js`
`NIGHT_CAPS`, `PACE`, **`fpsFor({ mode, phase, interacting, event, motion, quality, worldLevel, hidden })`**,
**`FramePacer({ now })`**: `touch()`, `event(ms)`, `cap(state)`, `apply(rig, state)` (calls `setFrameCap` only on
change). **`ScreenWake({ nav, doc, maxMs, onFail })`**: `want(on)`, `refresh()`, `release()`, `destroy()`;
`supported`, `wanted`, `held`. It is the only file that touches `navigator.wakeLock`.

### `features/nightlight.js`
`meta`, `mount(root, ctx)` → `{ unmount() }`. Private: the session view (stage screen, world, sky, bed, wake,
pacer, face mixer, modes, chrome, status, chips, sheet, visibility) and the end view.

---

## 5. Settings and Comfort DNA

- **One device pref, `nightlight`** (core/prefs.js): only the fields the person changed, read through
  `cleanNight()` field by field (a damaged value can never break the screen). Sliders write memory at once and
  the pref on release (or 400 ms after the last change). Lab Settings → Reset clears it.
- **Comfort DNA is only read**: the favourite Mallow, `animationSpeed` (slower → Slowest, natural → Slow,
  livelier → Natural), `breathTiming()`, the motion scale (capped at 0.6 at night), the palette's glow (40 % of
  the light colour), `environment` (the night world) and `comfort[]` (the first mode when none is saved). The
  router's own `experience` record is the only thing written.
- **Touch sounds** (SHARED C7): the night bed has its own controls (Quiet with its Sound chip, the Volume row),
  so it follows Mute and the Nightlight volume, not Touch sounds (said here and in COMFORT_DNA.md, not in the sheet).

---

## 6. Accessibility, motion and light

- **Movement**: Gentle (everything), Less (no stretch squash, no body nudges from scripts, a shallower breath,
  slower and fading fireflies, no parallax or live realm, softer twinkles, opacity-only UI changes with 200 ms
  chrome fades and a 300 ms arrival), Still (all of Less, plus no breath movement, a static sky drawn only on
  change, no scripted gaze or dreams, at most 10 fps). The lab or the device asking for less motion means at
  least Less; the lab's own prefs are never changed.
- **Photosensitivity**: every brightening rises over ≥ 300 ms (touch swells 600 ms, sliders τ 0.4 s, the sigh's faint wisp); at most one
  brightening start per 2 s; twinkles ≤ 15 % at ≤ 0.5 Hz; no realm pulses; the live window uses reduced motion
  (no fireworks); no full-screen change faster than 1.2 s except the 500 ms fade to black on leaving.
- **Screen readers**: the stage label "{Name} in the night. Tap to say goodnight, hold to stay close. Keys: 1 to
  5 change mode, up and down change brightness, Escape closes." One polite live region speaks only: the start,
  the mode, brightness, "Fading out.", "Ten more minutes.", "Nightlight finished." and "Sound paused. Tap to
  bring it back." Captions are aria-hidden; breaths and blinks are never announced. Asleep chrome stays in the
  accessibility tree (no `aria-hidden`, no `inert`).
- **Keyboard**: Tab order Close → settings → sound → the mode radio → the status chip; every gesture has a key or
  a button (section 1). The sheet traps focus and returns it to the sliders button.
- **Targets** are 40 px or more; sliders are 40 px high and at most min(180 px, 46 vw) wide.
- **Copy**: short, warm, plain British English, all in `copy.js` and linted (no treatment, health, tracking,
  streak or score words; the disclaimer is the one allowed mention). The brand is always written "hushmallow".

---

## 7. Background, battery and cleanup

- **Frame caps** (`fpsFor`): the display rate while touched (30 on the low tier, lifted at the touch itself, not on
  the next capped frame); 30 during a moment, a mode
  change or the arrival; steady 15 / 24 / 15 / 20 / 10 by mode; fading ≤ 12, then 8 below world level 0.3;
  Movement Still ≤ 10; the low tier × 0.8, never below 8; 0 when hidden or ended. Physics stays in real time at
  any cap. These are targets to measure on devices, not claims.
- **Live realm**: only in Drift, only on high and medium devices with Movement Gentle, never while fading: for the
  first 3 min and for 45 s after a touch, measured on the session clock (wall time), so a slow or throttled device
  never keeps it longer, and a clock set back keeps its length. Everywhere else the world is a painted still.
- **Hidden**: veiled at once; the rig, Companion, live realm and audio stop themselves; the wake lock lets go;
  timers are cleared. **Wake lock**: off unless the person turns it on; requested only while visible; let go when
  hidden (asked again on return), at the end, on exit and after an hour; a refusal is never retried.
- **Audio**: nothing plays before a gesture; the bed rises from silence over 4 s; the audio rests (suspended)
  10 s after the last touch in silent Quiet or at Volume 0, and after the end (at once after a quiet end, else
  2.2 s later, once the bed has faded; a resume the engine started on becoming visible ends in suspend, CR-N1).
- **Unmount** (in order): timers; listeners (pointer, keys, visibility, pagehide/pageshow, freeze/resume, prefs,
  Comfort DNA); the sheet; the mode, the night filter, the frame cap, the grade and the peek; the bed, then the
  trim back to 1; the wake lock; the world and the sky; the record (`leftAt`, or removed on a deliberate exit);
  the screen; `__lab.nightlight`. The end view keeps only the 8 s card timer and the audio rest.

---

## 8. Debug handle

`globalThis.__lab.nightlight` (set on mount, cleared on unmount if it is still ours): `view`, `state`, `mode`,
`settings`, `motion`, `clock` (its `now()` includes the skew), `levels`, `look`, `world`, `sky`, `bed`, `wake`,
`face`, `moments`, `pacer`, `limiter`, `modeCtl`, `script`, `breath`, `sheet`, and `debug()` → plain JSON
(`state, view, mode, phase, endsAt, fadeFrom, remainingS, levels, cap, renders, live, realm, bed, sound, wake,
chromeAsleep, veiled, quality, motion, quiet, chip, sheet, sky, world, drowsy, fade, sr`). Test helpers:
`skew(ms)`, `setMode(id)`, `set(k, v)`, `force(kind)`, `fadeNow()`, `longer()`, `sleepChrome()`.

---

## 9. Tests

```
cd /home/user/thinkstill-rituals
node --test hushmallow/sensory-lab/tests/nightlight.test.mjs             # unit, Node only
python3 -m http.server 8000                                              # (from the repository root)
node hushmallow/sensory-lab/tests/e2e-phase3-nightlight.cjs [outDir]     # browser, all blocks
PART=nightlight:sheet,nightlight:layout node hushmallow/sensory-lab/tests/e2e-phase3-nightlight.cjs
PART=nightlight:fadeout node hushmallow/sensory-lab/tests/e2e-phase3-nightlight.cjs <scratch outDir>   # Phase 4 follow-up 3
```

**Unit** (`tests/nightlight.test.mjs`): U1–U5 the session clock, fade, clock jumps, actions and resume records;
U6–U8 the look, colour temperature and the light limiter; U9 frame caps; U10–U11 the breath pacer and the sleepy
script; U12 the night filter over 7 Mallows × every gesture × 200 seeds with the real Personality; U13 night
worlds; U14 settings and Comfort DNA defaults; U15 the copy lint and string lengths; U16 the wake lock; U17 the
shared contracts; U18 the static scan (no network, workers, notifications or `setInterval`; `navigator.wakeLock`
only in `core/screen-wake.js`; the stylesheet loads nothing; pure modules have no DOM); U19–U20 the timeline,
moments and the five modes on a fake api; U21 world helpers; U22 the night sound on the real sound engine with
fake audio; U23 the settings sheet's view; U24 the stylesheet (every selector scoped to `.nightlight`, the night
tokens, no blur, no `!important`, 40 px controls, the viewport and reduced-motion rules); U25 the review fixes (a
Speed change reaches Sleepy's script and moves Moonlight's wave without a jump, Moonlight is the glow mode, the
Light's two steps, Zuzu's lids, the one footnote); U26 the sigh at night (the rig's own puff on the production
particle field lingers on the mouth; as a wisp it is faint, in the Mallow's grade, rises ≥ 0.45 body heights, is gone
within 0.9 s, and the field's own draw never paints it as a disc). Phase 4 added U27 (Fade out keeps the timer:
`setFade` both ways, before and during the fade, every timer, in the last seconds, after "A little longer" and a clock
jump, with No timer, after "Fade out now", unstarted and ended; the record stays valid and resumes; a Timer change
still restarts; switched on at any moment of a fade-off session the levels never jump down; "Fade out now" from
steady, arriving and mid-fade, then Fade out changed at u = 0 and a little in, both ways and after a reload, keeps
its start and end; after "A little longer" it takes the choice again), and in U23 / U24 the folded Fade out copy
and the disclosure's strings (one line at 320 px), Fade out's line from the clock's own fade ("Easing down until …"
when switched on late or after "Fade out now", the usual line for the usual length), the inline rows' growing label
column and control column, the narrow side panel (≥ 300 px, the Timer a 3 × 2 grid, the Mallow moved by half the
panel), and the disclosure's 48 px row, focus ring and still chevron with less motion.

**Browser** (`tests/e2e-phase3-nightlight.cjs`, on the shared harness; reports and screenshots in
`docs/phase3/nightlight/`): `open` (E1), `moonlight` (E3), `sleepy` (E5), `mallows` (E28), `modes`, `exit`
(and three-visit leaks), `sound` (E2, E7, E11), `fade` (E12, E13, E30), `background` (E16–E20), `wake` (E21),
`press` (E4, off-body press), `sheet` (the sheet, E8–E11 through it), `motion` (E14), `access` (E24, E25, E15),
`theme` (E26), `scroll` (E27), `privacy` (E22), `isolation` (E29), `sigh` (the fade's sigh), `breathe` (E4 in full: two breaths, the
period, the halo following the inflate, H and the chip, Less and Still), `drift` (E6 in full: the live realm's
3 minutes and 45 s on clock time, fireflies, Less, Still drawing nothing) and `layout` (E23 at all seven
viewports: steady, asleep, the sheet, fading and a live end with the sleeping Mallow above the card). Review 3
added: Moonlight beside Quiet (E3), a Timer change deep in the fade (E13), the fade beginning under a held chip
(E4), a turn of the phone as the live realm settles (E6), back from the end view (E19), tapped controls and chrome
sleep (E24), the Light's sprites (E9) and Done's pill (E23). The visual QA pass added `sigh` (the fade's sigh on
the desktop: only wisps, adding ≤ 0.1 when drawn alone, gone within 0.9 s of rig time, each rising ≥ 0.35 body
heights; `nightlight-desktop-sigh.jpg`), the resting end card's text ≥ 3:1 (`theme`), and in `layout` no sheet label
or control cut by the Done strip at rest, the five mode chips fitting at 390, 375, 320 and 412 px, and the Mallow centred beside
the side panel. Every night
world is also shot at the default and the minimum brightness (`nightlight-phone-<mallow>[-min].jpg`), and each mode
once (`nightlight-phone-mode-<mode>.jpg`). Each block's header in the file maps it to its brief line. Software GL
runs slowly, so every wait is on state.

Phase 4 (the Phase 3 follow-ups): `fadeout` (new, on 320 × 568 through the sheet: a Timer change still restarts; Fade
out Off then On before the fade keep the end time in the clock, "Ends at", "Until" and the record; Off half way
through the fade keeps it, the session is steady again and the light eases back up; On again with about 3 min left (less than the
400 s fade) starts the fade now, ends at the same time, announced, with no jump down; a reload resumes the same end and fade;
still fading just before the end, the end view after it); `sheet` (the disclosure: closed, `aria-expanded` / `aria-controls`,
named and described, Enter opens it in place with focus kept and Speed scrolled into view, Tab goes on into Speed,
remembered when the sheet opens again; Fade out folded into the Timer row; all eight settings present; Fade out Off
keeps the end time); `motion` and `theme` through the disclosure (its rows audited for contrast too); `layout` at all
seven viewports: on phones a calm sheet (the everyday rows in view at rest, ≤ 1.7 sheet heights of rows, one-line
sub-labels), no sub-label or the disclosure cut by Done at rest, the disclosure open (every control ≥ 40 px, the
disclosure ≥ 48 px, nothing sideways, Done and the last row reachable; `nightlight-<vp>-sheet-more.jpg`).
The review of the follow-ups added: in `sheet`, every `aria-describedby`, `aria-labelledby` and `aria-controls` ID in
the sheet resolves (disclosure closed and open), and "Fade out now" then Fade out Off keeps that 12 s fade (same start
and end, still fading, said once, the row "Easing down until …"); in `layout`, the reveal scroll stops with Done's
strip in a gap at every viewport, and at 568 × 320 the narrow side panel (≥ 300 px, the Timer an even 3 × 2 grid, the
sliders and Fade out beside their labels, one-line sub-labels).

---

## 10. Known limits and device checks

Simulated input proves state, not feel. These need a real iPhone (Safari) and a real Android phone (Chrome),
and nothing here counts as tested on a phone until it has been tried there:

1. **Lock and unlock**: lock mid-session for 2 min, and across the end. No bright frame on unlock; the level
   matches the clock; the end view appears quietly.
2. **Audio after unlock**: it resumes, or the chip appears and one tap brings it back; after a phone call; with
   the iPhone silent switch (Web Audio follows it and it cannot be detected).
3. **Keep screen on**: it holds, then lets go at the end; Low Power Mode and Doze. Without it, phones lock on their
   own timer (often 30 s), which ends the visible nightlight early; the sheet says so.
4. **Battery**: a 30-minute session per mode at default settings, compared with the home screen idle. Report only
   measured values.
5. **A dark room at minimum screen brightness**: the chrome and the end card are readable; true black on OLED;
   the colour temperature on the art; each night world at default and minimum brightness (reviewed in
   simulation: spark-festival "after closing" now keeps about half its lanterns lit, heaviness 0.58; the calmed
   static-storm keeps Glitzi's dimmed glitch lines; `NIGHT_SCENES[id].ok = false` maps a world to moonmilk-cove).
6. **Landscape on a bedside stand**, the side-panel sheet, VoiceOver and TalkBack, and an older Android phone on
   the low tier (caps, Drift without a live window).
7. **The night bed's level**: it is quiet by design (peak 0.035 × the 50 % trim); listen at night volume on a phone
   speaker before tuning it (Loomi's pad root is low and carries mostly through its overtone).
8. **Leaving at night** in the light theme returns to a bright home screen; this is outside the Nightlight.
9. **The settings sheet on a real small phone** (Phase 4, pending): the disclosure and the folded Fade out with
   VoiceOver and TalkBack (the expanded state is announced; the rows it reveals are read in order), the sliders'
   one label column with a larger system text size, and the Fade out change during a real locked-phone session.

Known behaviour, by design: a Fade out switched on late gives a shorter fade that still ends on time; "A little
longer" afterwards moves the end and that fade by ten minutes and keeps its (shorter) length, as it keeps the 12 s
fade of "Fade out now". No production file was needed for the Phase 4 follow-ups (none was changed).
