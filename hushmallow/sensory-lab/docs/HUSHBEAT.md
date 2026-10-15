# Hushbeat Symphony (`#hushbeat`)

Make music by touching a Mallow. The Mallow is the instrument: each of the seven has its own
timbre, meter, melodic habits and way of moving to the music. A touch is always answered at once,
and the music stays in tune however fast you play. A second Mallow can join for a duet.

This page is the feature's reference: what it does, how it is built, the public APIs of its
modules, and how it is tested. Shared engine APIs (stage-screen, Environment, effects, sound
engine, Comfort DNA) are in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. The experience

1. **Listening.** The screen fades up in the Mallow's own realm, silent. The Mallow breathes inside a faint
   ring whose swell is the tempo, so the beat is visible before anything sounds.
2. **First note.** The first touch plays a note from the Mallow's scale; the Mallow answers in character.
   The hint fades.
3. **Exploring.** Each gesture has its own musical role, so layers build: notes on top, a bass underneath,
   a hum around them, phrases across.
4. **Groove.** While music plays the Mallow sings (its mouth follows its own notes), moves on the beat in its
   own way, glows with a hum and puffs its cheeks with the bass. The realm warms and clears with the music.
5. **Sharing and resting.** Replay has the Mallow sing the take back, proudly. ★ Keep saves the tune. Friend
   invites a second Mallow. Close resolves the music home with a short cadence and a goodbye in character.
   After 40 s untouched the Mallow rests (its own resting face, a dimmer ring) until the next touch.

### Gestures and their music

| Input | Music | Light and movement | Without touch |
|---|---|---|---|
| Touch on the body | one note, **at contact** (no added delay); height sets the register, x the pan | a bead rises from the finger (a key's or chip's note, with no finger, from just above the head); the mouth opens | — |
| Tap | the contact note rings (re-struck if audio was still locked) | the usual tap reaction | Enter/Space, **Note**, digits 1–7 |
| Double tap | the note rolls into a chord on the next 16ths | three beads in an arc | D, **Chord** |
| Hold | the note blooms into a hum (the chord, 0.8 s attack), breathing with the clock | glow, the ring brightens, the realm transforms | H held, **Hum** |
| Squeeze / press down / wheel | a warm bass on the chord root (the note ducks under it) | squash, cheeks puff, the floor glow widens, one ripple a bar | S held, **Bass** |
| Stroke | a phrase on the Mallow's grid while the finger moves | a trail behind the finger (a dark rim, a colour core, a white light: readable on any body); P and Tune draw theirs across the forehead | P, **Tune** |
| Drag up | the note bends up to +2 scale steps, then snaps to a scale tone | the bead stretches | T |
| Still press off the body (300 ms) | leads the breath: the in-breath opens the hums; the measured breath sets the tempo from the next bar (≤ 8 % a bar); a lead let go within 0.6 s was a tap and measures nothing | the ring follows you | B held, **Breathe** |
| Duet | the friend plays in the lead's key: notes within 400 ms harmonise (3rds/6ths, else 5ths/octaves), two hums bloom into one chord, two basses sit a 5th or an octave apart, strokes run in parallel, a phrase or chord gets an answer | an arc of light between the heads; they glance, blush and lean in | **Both** target, G, Tab between stages |

Keys act on the stage that has keyboard focus (Tab moves between the two stages in a duet). R replays or
stops, K keeps, G plays both together, Escape leaves (a second Escape leaves at once; an open sheet closes first).
With Ctrl, Alt or Cmd, digits, H and S stay the browser's (tab switching, history).

**Layers build.** A held **Hum** or **Bass** (the chip, H or S) is a layer beside the touch, not a touch: taps,
strokes, holds and the Note, Chord and Tune chips keep playing over it (the engine keeps them consonant), and no
touch ends it. A hold on the body under a held hum rings its note inside it; a pinch under a held bass ducks
its note and sets the amount (no second bass). A layer a finger and a chip both hold ends when the last lets go.
A quick tap on Hum or Bass still plays a short layer (1.2 s: a hum needs time to swell). The held chips carry a
small ring that fills while held, and their names say "hold". Held keys let go when the window loses focus or a
sheet opens.

**Two hands.** A breath lead off the body and a touch on it stay two things: a finger landing on the body
cancels a still, pending off-body pointer on that stage (the breath router still claims it at 300 ms), and an
off-body pointer landing while that Mallow is being touched never reaches its stage. A pinch whose first finger
lands just outside the outline therefore plays as a single touch (the hit test is generous).

### Screen

- **Top bar:** Close · *Hushbeat* and the subtitle (`Boppo`, `Boppo & Loomi`, plus ` · Visual only`) · **♪**
  (opens *Sound and pace*) · Mute.
- **Bottom:** the hint (with a tight halo in the world's ink; hidden on short landscape screens and while the
  tray is open; at ≤ 360 px wide only the bold words, one line; each cue stays whole and two lines balance), the gesture tray (behind **Buttons**; in a duet it starts with the target **[Lead | Both | Friend]**),
  and one row: **Play it** (a kept tune opened from home; the row's only solid fill),
  **Buttons**, **Replay ⇄ Stop**, **★ Keep ⇄ Kept**, **Friend** (a pressed toggle is outlined). Replay and Keep
  appear once a take has three events; the row only grows wider, so the Mallow is never re-framed.
- **Phones:** the hand chip is icon-only at ≤ 440 px wide; Keep and Friend too at ≤ 360 px (and on screens
  ≤ 360 px tall). In portrait up to 520 px wide the tray is an even grid, nothing scrolled out of sight: Note,
  Chord, Tune (what you tap) above Bass, Hum, Breathe (what you hold), with a duet's target on its own row
  above. In short landscape the tray and the row share a line (the tray as wide as its chips, scrolling with
  edge fades when a duet's does not fit at 568×320); with the tray open the row is icon-only, so at 844×390 a
  duet's six actions are all in view.
- **Duet:** two half-width stages (on desktop a centred pair of `min(50%, 440px)`; in short landscape
  `min(50%, 240px)`, so the two stand close around the world's middle at the same size), one floor. A friend
  arriving or leaving cross-fades the stages (out 160 ms, re-lay out, in 280 ms: opacity only).

### Sheets (open inside the screen, so they take the realm's chrome tones)

**Sound and pace** (♪):
- *Volume*: the lab's own volume (`prefs.volume`, "Same as in Settings").
- *Sound*: **Music | Visual only** (`prefs.musicVisualOnly`): the identical music as light and movement, no sound.
- *Breath pace*: **Slower | Natural | Livelier**, for this visit (default from Comfort DNA `animationSpeed`); Keep saves it.
- *Friend answers*: **On | Off** (duet only).
- *Your tunes*: the newest six kept tunes (`describeTune` plus the place in the list: "· newest", "· 2nd"…, so
  two takes never read alike; the buttons say "Play tune 2 of 3: …"), each with **Play** and **Remove**. Play
  plays it at once (with its own lead the tune's friend joins first; another Mallow's tune reopens Hushbeat with
  that Mallow through `ctx.openTune`, for this visit only); Remove updates the list in place and keeps focus in it.
- *Lab settings*: **Open** closes this sheet and opens the lab's Settings.
- Footnote: "Music plays even with the Mallow voice off. Use Mute or Visual only for quiet."

**Who joins Boppo?** (Friend): the six other Mallows, each with its colour and the two words for its
instrument (*glitchy chirps, water drops, spiral glides, springy boings, spark bells, soft pads, music box*);
**Play alone** in a duet. The friend is for this visit only and never changes the favourite Mallow.

---

## 2. Per-Mallow character

Roots and scales come from `VOICES` (core/sound-engine.js, mirroring the production kits). Everything else
is `MUSIC` (core/music-theory.js) and `TRAITS` (features/hushbeat/performer.js).

| Mallow | Meter · bpm | Grid | Progression | Phrase style | Instrument | Groove | Entrance · proud · leave |
|---|---|---|---|---|---|---|---|
| Boppo | 4/4 · 96 | 8ths | I vi ii V | bouncy arpeggio | scooping triangle | hop every 2 beats | hop · success · nod |
| Pipzi | 4/4 · 96 | 16ths | I V vi iii | sparkly runs, a flourish | spark bell | bounce, downbeat hop | doubleTap · celebrate · nod |
| Blubi | 3/4 · 72 | 8ths legato | vi ii I V | cascading droplets | droplet sine | sways bar by bar | doubleTap · comfort (wet) · comfort |
| Glitzi | 4/4 · 96 | 16ths | i VII iv III | staircase, stutters | bit-crushed chirp | bobs behind the beat | glitchBurst · tap (caught out) · tap |
| Zuzu | 3/4 · 72 (swing) | dotted 8ths | i VI i v | rising and falling spiral | vibrato triangle | tilts on alternate beats | doubleTap · doubleTap · nod |
| Loomi | 3/4 · 72 | quarters | I I vi V | two or three long glides | soft sine + octave | leans every 2 bars, floats | nod · nod · nod |
| Noomi | 3/4 · 72 | 8ths | I iii vi V | falling lullaby | music box | slow drift, floats | yawn · nod (sleepy smile) · yawn |

A breath is four bars, one turn of the four-chord loop: a natural breath (4 s in, 6 s out) gives 96 bpm in
4/4 and 72 in 3/4. Every chord is built from scale tones only (no IV or V), so nothing ever clashes; Zuzu's
scale (the one with semitones) has a guard. In a duet the friend takes the lead's key and progression,
moved by whole octaves into its own register, and keeps its own timbre, walk, phrase style and dance.

---

## 3. Architecture

Music is data with two renderers: the engine emits plain events (once per musical event, never per
frame) to the audio sink and to the light and movement.

```
features/hushbeat.js ──▶ features/stage-screen (s.env, setPartner, keys, onGesture, onLayout)
   │                 ──▶ core/pointer-router (watchPresses: the breath lead)
   │                 ──▶ core/effects (EffectsLayer, FlashGate, clearGlowSprites)
   ├─▶ features/hushbeat/player.js     gestures → Part calls            (pure)
   ├─▶ features/hushbeat/performer.js  Performer, Scene, Cue, TRAITS   ──▶ core/music-fx, core/expression-engine (FaceMixer), core/personality (softened)
   ├─▶ features/hushbeat/sheet.js      the two sheets + pure helpers   ──▶ lab-ui, core/comfort-dna (describeTune)
   ├─▶ features/hushbeat/copy.js       every user-facing string (linted)
   ├─▶ core/music-engine.js            the conductor                   ──▶ core/music-theory, core/music-time   (pure)
   └─▶ core/music-audio.js             the sink                        ──▶ core/music-kits ──▶ core/sound-engine (_voice, _room, bus)
```

Node-safe (no DOM or Web Audio at import, unit-tested in Node): music-theory, music-time, music-engine,
music-kits, music-fx (draws only when asked), player, performer, copy and the helpers in sheet.js.

### Per frame (no extra rAF)

The screen's per-frame work is the **first item of its one EffectsLayer**; the **Scene** is the second.
Each frame: `clock.at(t, cs)` (reused object), `audio.frame(level)`, reconcile held layers after unmute,
player watchdogs, the cue (scheduled events shown when heard), the duet (the friend's entrance once its body
is ready; the idle Mallow watches the one being played), the session state, performers (face, groove,
inflation) and the scene (ring, floor glow, realm mood ≤ every 500 ms, transform, pulses). Quality and
surface tone are polled once a second. Nothing allocates per frame.

### Timing

- Musical time is `performance.now() / 1000`. A touch sounds at `ctx.currentTime + 0.005`; continuations
  (phrase notes 2+, the roll, bass throbs, chord changes, answers, replay, cadence) are scheduled on the grid
  through a 25 ms `setTimeout` chain with a 120 ms look-ahead, mapped to audio time by a smoothed offset.
  Events more than 50 ms late are dropped, never played late (a tune waits for a joining friend's body to be
  built, which would otherwise stall the main thread past that). A replay's notes carry their own tolerance,
  `REPLAY_LATE` 250 ms: one caught by a long frame still sounds, at once, so the tune keeps every note.
  A replayed note is soft-quantised 75 % toward its Mallow's grid; one that would land within 70 ms of the note
  before it takes a finer grid, else follows that note by the rate limit's gap (never before it: it would only
  be a ghost; two quick notes used to lose one in the replay).
- A touch is seen in the same frame; a scheduled event at `ev.t + outputLatency` when audible, else at `ev.t`.

### States

`listening → playing` on the first music, back after 8 s of quiet; `listening → resting` after 40 s
untouched; `replaying` while the take is sung back (live play stays allowed); `leaving` (the cadence ≤ 0.8 s,
a fade from 300 ms over 420 ms, then home). A hidden page stops the scheduler, releases every layer, cancels
the replay and the breath lead, lets a resting face go, and returns to listening; nothing resumes on its own (a
friend arriving meanwhile enters without its hello; a tune waiting for it is dropped and Play it comes back).

---

## 4. Module APIs

### `core/music-theory.js` (pure)
`SHAPES`, `CHORDS`, `MUSIC[id]` (meter, grid, swing, prog, tap window, walk, phrase, decay, send, peak,
repeatMax, shape, shimmer), `LAYER_PEAK {pad, bass}`, `SUM_PEAK` 0.45, `HARMONY_S` 0.4, `BASS_RANGE`.
`voiceFor(id, keyId)` → V (the friend plays in the lead's key), `degSemi`, `nearestDeg`, `degOf`, `hz`
(folds above 2400 Hz), `bassHz` ([65, 131) Hz), `chordAt(V, bar)`, `chordWith`, `ic`, `consonant`,
`strongBeat`, `guardDeg`/`guard`, `pickNote(V, st, …)`, `harmoniseDeg`/`harmonise`, `velocity({…})`,
`foldDeg`, `voicePad`, `leadPad`.

### `core/music-time.js` (pure; clock and timers injected)
- `BreathClock({ inhale, exhale, meter, now })`: `setTiming`, `setMeter`, `lead('in'|'out', t)`, `unlead`,
  `at(t, out)` → `{ beat, bar, beatInBar, beatPhase, bpm, level, phase, leading }`, `nextGrid(t, div, swing)`,
  `nearest(t)`, `beatTime`, `barTime`, `barOf`; getters `bpm`, `beatS`, `barS`, `cycle`, `target`, `leading`.
  Tempo changes only at bar lines, ≤ 8 % a bar, beat-continuous; 48–120 bpm, cycles 7–15 s.
- `Scheduler({ now, setTimer, clearTimer, lookahead, interval, late })`: `at(t, fn, tag, drop, late)` (late: this
  event's own tolerance),
  `cancel(id | tag)`, `has`, `clear`, `stop`; `running`, `pending`. Auto-starts and auto-stops.
- `Take({ maxEvents, maxBeats, gapS })`: `add`, `touch`, `cut`, `best()`, `load`, `clear`, `length`.
- `softQuantise(beat, div, strength)`, `encodeMotif(events)` / `decodeMotif(str)` (matches
  `HUSHBEAT_MOTIF_RE` from core/comfort-dna.js; uppercase kinds are the friend's).

### `core/music-engine.js` (pure)
`MusicEngine({ clock, scheduler, now, sink, onEvent, quality, gentle, rand })`:
`part(slot, mallowId, { pan })` → Part (slot 0 sets the key), `removePart(slot)` (layers fade over 0.6 s),
`parts`, `take`, `setQuality`, `setGentle`, `setAnswers`, `together()`, `replay(events)` → `{ stop() }`,
`replaying`, `holding`, `releaseAll()`, `cadence()` → seconds, `stats(t)` (reused object), `layers()`,
`lastMusicT`, `dispose()`.
Part: `strike({ y01, x01, deg, src, vel })` → id | null (a ghost), `ring`, `chord`, `bloom`, `padStart`,
`padBright`, `padEnd`, `bendStart`, `bend`, `bendEnd({ fling, handoff })`, `duck`, `bassStart`, `bassAmount`,
`bassEnd`, `phraseStart`, `phraseMove`, `phraseEnd`, `hello()`, `cadence()`, `state`, `lastOnset()`.
Limits: 70 ms per Mallow, 14 onsets/s overall (the rest are visual-only ghosts), voices per tier
(`CAPS` 6/16, 5/13, 4/10), density-scaled velocity and a 0.45 summed-peak limiter.

**Events** (each has `kind`, `slot`, `t`): `note` (id, semi, deg, hz, vel, dur, ring, src: live | phrase |
chord | answer | replay | hello | cadence | shimmer, x01, y01, immediate, ghost, …), `noteOff`, `bend`,
`duck`, `bassOn`/`bassSet`/`bassBeat`/`bassOff`, `padOn`/`padSet`/`padOff`, `harmony {a, b, interval}`,
`bloom {on}`, `phraseEnd`, `replay {on, done?, stopped?}`.
**Sink contract:** `{ ready, event(ev) → heard }`; no sink or not ready gives the identical event stream.

### `core/music-kits.js` and `core/music-audio.js` (Web Audio, nothing at import)
`KITS[id]` = `{ send, peak, note, shimmer, held, bass, pad }` on `graph(ac, out, track)`; `setTier(q)`,
`warmNoise(ac)`, `SOUND_WORDS`.
`MusicAudio(sound, { quality, now })`: `ready`, `setAttached(b)` (Visual only), `setPart(slot, part)`,
`event(ev)`, `reconcile(layers)`, `frame(level)`, `outputLatency()`, `voices`, `setQuality`, `stopAll`,
`debug()`, `dispose()`. Every voice is `sound._room()` then `sound._voice(dur, { pan, dest: musicBus, send,
keep })` (keep for bass, pad and glide); the music bus feeds `sound.bus`, so the master chain, volume, mute
and the hidden-page suspend apply.

### `core/music-fx.js` (EffectsLayer items; cached sprites, no per-frame allocation)
`NoteBead`/`BeadPool` (`POOL` 12/8/5, 3 reduced), `BeatGlow` (alpha ≤ `GLOW_MAX` 0.18), `PhraseRibbon`
(`RIBBON` 48/32/20), `HarmonyArc` (`ARC` 32/24/16, up to 3× that in glow dots 3 px apart, each dimmed by the
overlap: one continuous thread of light; `pulse`, `hold`), `BreathHalo`. Bright beads pass the
screen's one `FlashGate`. The ribbon draws three passes on every world (a dark rim ≤ 0.25, a colour core ≤ 0.58 and
3–8 px wide, a thin white light), painted over: it crosses the body, whose colour decides the contrast.

### `features/hushbeat/player.js` (pure)
`Player(part, { geo, now })`: `gesture(type, d)` (the touch state machine), `layer('pad' | 'bass', on)` (a chip's
or key's held layer beside the touch; the bass swells to 0.7 in `watchdog`), `holds(kind)`, `btn`, `degree(n)`,
`watchdog(t, busy)`, `reset()` (chip and key layers too), `state`; `bodyPoint(geo, x, y)` → `{ y01, x01 }`. Notes
from buttons and keys carry `tip: false` (the engine copies it onto the event; a chord's roll keeps it).

### `features/hushbeat/performer.js`
- `TRAITS[id]`, `grooveStep(style, cs, k, { gentle })` (pure).
- `musicFilter(profile, out, gesture, d)` (pure): the personality as an instrument. Each Performer sets it as
  its Mallow's `persona.setFilter` and clears it (only its own) in `destroy()`. From the profile's tickle point
  a run of taps answers with the Mallow's own groove face and no reaction burst, so playing a fast run never
  makes it giggly, grumpy, pretend-annoyed or dizzy; every other response passes unchanged.
- `Performer({ companion, slot, pool, off, color, reduced, tuning, now })`: `apply(ev, at, due)`,
  `frame(t, dt, cs, { playing, resting, onsets1s, barS, beatCs })` (`beatCs`: the clock when the beat is heard,
  now − output latency: the groove moves on the beats you hear), `suppress(ms)`, `react`, `enter`, `leave`, `proud`,
  `rest(on)`, `listen(pt)` (watch the other Mallow while idle, nod on bar lines), `glance(pt)`, `leanIn(dir)`
  (a bloom: `{calm .6, loved .4}` and a lean, no lean in reduced motion), `hush`, `setReduced`, `setTuning`,
  `setStrong`, `debug`, `destroy`. Face writes go through one shared `FaceMixer`; the groove through `rig.nudge`.
- `Scene({ env, gate, tone, reduced, quality, now })`: `setPerformers([{ performer, off, color, accent }])`
  (the arc appears with a friend and takes its light; the lead keeps its own), `stroke`, `apply(ev)`,
  `frame(t, dt, cs, stats, { state, groove, beatCs })` (the floor glow swells on the heard beat), `setStrong`, `setReduced`, `setQuality`, `setTone`, `hush`,
  `debug`, `destroy`. It is itself an EffectsLayer item.
- `Cue(n)`: a fixed ring of events waiting for their moment (`push`, `drain`, `clear`, `pending`).

### `features/hushbeat/sheet.js`
- `openMusicSheet(root, ctx, { pace, setPace, duet, answers, setAnswers, tunes, playTune, removeTune, onClosed })`
  and `openFriendPicker(root, ctx, { lead, friend, onPick, onClosed })` → `{ el, close(), open }` (`onClosed` once,
  through `openSheet`'s `onClose`).
- Pure: `friendChoices(lead)`, `yourTunes(favourites)`, `tuneItem({ lead, friend, takeFriend, pace, events })`
  (a kept duet keeps its friend even after it left, if the take has its notes), `TIER_BELOW`, `tierBelow(q)`.

### `features/hushbeat.js`
`meta = { id: 'hushbeat', title: 'Hushbeat Symphony' }`; `mount(root, ctx, { handoff })` → `{ unmount }`.
`handoff` is a kept tune from home "For you" (`{ mallow, friend?, pace, motif }`): its friend joins (no hello),
its pace is set, its notes wait for **Play it** (`play: true` from `ctx.openTune`: it plays once its friend is on
stage). Play it hands keyboard focus to Stop (or the stage), never to the page. A replay queued for an arriving
friend runs once and only while still asked for: Replay or Stop tapped meanwhile, or a hidden page, drops it
(Play it comes back).

---

## 5. The duet

- **Joining** (`setFriend(id)`): `s.setPartner(id, { quality: tierBelow(q), tier: tierBelow })` (the friend's
  rig runs one tier lower, kept so by lab.js), `engine.part(1, id, { pan: 0.22 })` (the lead moves to −0.22),
  a Player, a Performer and its light in the Scene. When its body is ready it makes its entrance, the two
  glance at each other, and with the Mallow voice on it sings a quiet two-note hello. The realm runs at `low`
  in a duet below the high tier. The subtitle, both stage labels (adding G and Tab) and the tray's target
  follow; the feedback says "Loomi joins".
- **Playing:** harmonies within 400 ms; two hums bloom (≥ 3 pitch classes) and the two lean in; two basses
  sit a 5th or an octave apart; a phrase or a chord on one gets an answer from the other when it is idle
  (≤ 1 per 2 bars, cancelled by any strike; Friend answers can switch this off). The idle Mallow watches the
  one being played and nods on bar lines.
- **Both and G:** with the tray's target on **Both** every chip plays on both (the friend's note harmonises
  with the lead's); G does the same for a tap. Holds end on the Mallows they started on.
- **Leaving** (Play alone, a new friend, or Close): the friend's layers fade over 0.6 s, its performer,
  light, Part and stage go. `favouriteMallow` and the lab's Mallow never change.

---

## 6. Comfort DNA

- Reads `favouriteMallow` (the lead), `tuning()` (gentle: no hops, groove ×0.6, velocity ×0.8; playful: groove
  ×1.2), `breathTiming()`/`BREATH` (pace), `palette()` (the light's colours), `environment('moment', lead)`
  (the realm), `voice` (off: no hello and no cadence; the instrument still plays, as the footnote says).
  Touch sounds do not silence the music (SHARED C7): Mute, Volume and Visual only do.
- **Keep** saves `{ kind: 'hushbeat', mallow, friend?, pace, motif }`; a second tap removes it. Hidden while
  personalisation is off. At six tunes Keep refuses ("Six tunes kept. Remove one in Sound and pace."), so
  nothing kept is dropped silently. Kept tunes appear in *Your tunes*, on the Comfort DNA screen and in home
  "For you". Nothing about what was played is stored unless Keep is tapped.

---

## 7. Accessibility, motion and light

- Every gesture has a chip and a key; digits 1–7 play exact scale degrees; Both and G give duet harmony with
  one finger; Tab moves between the stages. Targets are ≥ 40 px (the sheets' controls included). Holds use
  `holdButton` (keyboard and pointer). Replay and Keep use `aria-pressed`; the volume slider is labelled;
  sheets trap focus, and focus returns to the button that opened them.
- **Focus:** the Tab order is stage (then the friend's stage) → Close → ♪ → Mute → the tray (its target is one
  stop; arrow keys move it) → Buttons → Replay → Keep → Friend. Keys reach the stage from the page too, so the
  stage takes focus on arrival only when a person brought the lab here (`navigator.userActivation.hasBeenActive`):
  a link opened directly starts without a ring framing the world. A focused stage shows the lab's soft rounded
  frame around the band where the Mallows stand (between the bars), not a hard frame over the realm and the controls.
- Announcements go through the feedback chip (`role=status`): a role word the first time it is used; while
  nothing is audible, every role every time, first uses included, at most one caption per 1.5 s; "Kept", "Removed", "Replaying", "Replay finished",
  "Loomi joins", "Playing alone", "Sound off: playing with light". Single notes are never announced.
- **Reduced motion** (live): no groove, hops, sways or leans; beads fade in place; the ribbon is shorter; half
  the inflation; reactions mapped as for gentle; the floor glow carries the beat. The music is unchanged.
- **Light:** one `FlashGate` per screen (≤ 3 bright events a second: bright beads, arc pulses and the realm's
  pulses together); every brightening rises over ≥ 0.3 s; floor glow ≤ 0.18; beads ≤ 14 px and alpha ≤ 0.5;
  one ripple a bar and one success pulse per replay. Light backdrops draw over with a soft rim, dark ones add.

---

## 8. Performance and cleanup

- Budgets (SHARED C25; targets, not claims): solo ≤ 2.5/2.0/1.5 ms of feature JS per frame (high/medium/low),
  duet ≤ 3.0/2.5/2.0 ms. Effects canvas DPR 1.5/1.25/1. Pools shrink with the tier, never grow.
- **Unmount:** timers; the open sheet; the scheduler; `engine.dispose()`; `audio.dispose()` (ringing notes and
  the cadence ring out, ≤ 2.5 s; held layers end over 150 ms); cue; performers (face override and inflation
  restored); scene and effects; glow sprites; the breath router; listeners; prefs and DNA subscriptions; the
  partner; the debug handle; the stage. `sound.live.size` returns to 0 within 3.5 s, mid-duet and mid-replay
  included.

---

## 9. Debug handle

`globalThis.__lab.hushbeat` (set on mount, cleared on unmount if still ours): `state`, `engine`, `clock`,
`scheduler`, `audio`, `players`, `performers`, `scene`, `flash`, `log` (the last 128 engine events with
`heard`, `audioT`, `ctxNow`), `router`; `debug()` (state, bpm, bar, beat, chord, pace, breath, scheduler,
players, voices, live, audible, visualOnly, muted, friend, answers, target, sheet, take, best, replaying,
flash1s, groove, quality, idle, latency, performers, scene, cue, controls, duet); `replay()`, `stop()`,
`keep()`, `playIt()`, `setPace(p)`, `setVisualOnly(b)`, `setFriend(id, { greet, instant })`,
`setAnswers(b)`, `together()`, `openMusic()`, `openFriends()`, `setRestAfter(s)` (test seam).

---

## 10. Tests

```
node --test hushmallow/sensory-lab/tests/hushbeat.test.mjs                 # U1–U19, ~3 s
node hushmallow/sensory-lab/tests/e2e-phase3-hushbeat.cjs [outDir]          # all browser blocks (~40 min on software GL)
PART=hushbeat:duet node hushmallow/sensory-lab/tests/e2e-phase3-hushbeat.cjs   # one block
LAYOUT_VPS=small,land PART=hushbeat:layout node …                          # some viewports
HB_MERGE=1 PART=hushbeat:a11y node … [outDir]                              # re-run blocks into an existing report
```

The report's `brief` field maps every check to the brief line it proves (spec §13 E1–E24, `BRIEF` in the
suite): a check that names its E number counts for it, the rest count for their block's lines.

Serve the repository root first (`python3 -m http.server 8000`). Reports go to
`docs/phase3/hushbeat/e2e-phase3-hushbeat.json`, screenshots to `docs/phase3/hushbeat/hushbeat-<vp>-<state>.jpg`.
A full run writes about 70 screenshots, so pass a scratch folder and copy the ones worth keeping; the folder
holds the last committed full report (585/585; the review-fix round ran all 627 checks in a scratch folder: one full run, then the blocks fixed after it re-run green) and 43 curated screenshots (every viewport's solo, tray, row, picker,
duet, sheet; every Mallow in its own world; the dark sheets; the bloom; replay; Play it; keyboard focus).
Screenshots are taken as a touch user sees them: a stage the feature focused on arrival is blurred first, and CSS
transitions are suspended for the capture (a slow software-GL page can leave a 140 ms transition pending for
seconds). Capturing also stalls such a page for hundreds of ms, so none is taken during a checked replay.

| Unit | Proves |
|---|---|
| U1–U3 | voices match the production kits; chords from scale tones only; note choice per Mallow |
| U4–U5 | seeded fuzz (solo × 7, duet × 42, bursts of 20/s): nothing clashes, all in key; rate, caps, softer when dense |
| U6–U8 | the gesture state machine; chip and key layers beside the touch (U6b); timing on the grid; hums voice-lead at bar lines |
| U9–U12 | breath clock (a tapped lead measures nothing, U9b); duet harmony, bloom, answers, together; scheduler; take and motif codec |
| U13–U14 | Comfort DNA tunes (clean, key, cap without eviction); visual-only gives the identical music |
| U15 | kits and MusicAudio on fake audio: tagged voices, timing, pitch, caps, cleanup |
| U16 | the light and the FlashGate; TRAITS and grooves; performer; beads with no fingertip above the head, the groove and floor glow on the heard beat, the trail's three passes; the personality as an instrument (a run never tickles or dizzies, all seven); scene; cue |
| U17–U18 | no network or media; copy lint; shared contracts |
| U19 | friend choices, tier, newest six tunes, the take as a tune (with its friend); glance, lean in, the arc's light; each tune's place in the list (U19b) |

| Browser block | Proves |
|---|---|
| open, quiet | E1–E3, E5: opens; nothing before a gesture (quiet browser); first tap heard; no stale burst |
| gestures, keys, mallows | E4, E6, E7: onset at contact; every gesture, chip and key; every Mallow |
| layers | E6, E7, E8: a held Hum, H or S under clicks, Enter and digits (touch: a tap and a long press over the held chip); two hands in both orders, a pinch still squeezes; blur lets held keys go; Ctrl/Alt/Cmd + digit; quick taps on Hum, Bass (≥ 1.1 s) and Breathe (no tempo change); the held chips' names and ring |
| breath, offline | E8, E10: breath leads the tempo; real-DSP renders of every kit |
| rapid | E9: 40 taps in 2 s, solo and in a duet (Zuzu leads Pipzi), and two thumbs on two Mallows at once (20 two-finger bursts, CDP touch): caps, in key, harmonies, no clash |
| quietmode, hidden, exit | E12, E13, E19, E20: mute (beads go on) and unmute, Visual only (role captions ≤ 1 per 1.5 s, the singing mouth, a silent replay, Keep), hidden page (resting; a friend's hello and a queued Play it never start on return; Replay during the arrival plays once), leaving and leaks |
| scene, replay, keep, rest | E3, E14, E15, E17, E18: light and singing in sync (a key's bead above the head), replay, Keep and Play it (by keyboard: focus to Stop; the only solid chip), resting |
| duet | E16, E21: picker, two stages, hello, harmony, bloom and arc, answers on/off, G, Tab, Keep with the friend, the kept duet from home, motion and quality on both rigs, Play alone, leaving mid-duet |
| sheet | E11, E13, E23: Volume (master gain; light at 0), Visual only, pace, Your tunes (place in the list) Play/Remove, another Mallow's tune through `ctx.openTune`, Lab settings, Escape |
| layout | E22: seven viewports (390×844, 375×812, 320×568, 412×915, 1280×860, 844×390, 568×320) × solo, tray, row, picker, duet + tray, duet, sheet; the hint (short at 320, none in short landscape); short landscape duets (stages close in, icon-only row, all six actions at 844×390) |
| looks | E22 (visual QA): every Mallow in its own world mid-hum at phone size, its layout, text tones that follow the backdrop, the hint's halo, the sheet over the four dark worlds |
| a11y | E23: the Tab order (solo, with a take and the tray, in a duet) with names and a focus ring; Buttons, a held chip, the picker and a pill by keyboard alone; focus back on the opener; every request same-origin, none while playing; no microphone, fetch, XHR, WebSocket, beacon or media element |
| scroll | E24: presses, stretches, strokes, pulls and flings, pinches on and off the bodies, the tray and a two-finger duet: never a scroll or a zoom |
| isolation | E21: after a Visual only duet (livelier pace, answers off, a tune kept) TouchTalk still pokes with sound, its switches, Mallow and favourite unchanged, nothing of Hushbeat left; back in Hushbeat the visit's choices are gone and Visual only (a device setting) stays |

Isolation with the other features: `PART=shared,hushbeat node tests/e2e-phase3.cjs [outDir]` (the lead's shared
blocks, the isolation loop included, then this whole suite).

---

## 11. Known limits and device checks

Simulation proves state, not feel. Not verified on real devices:
1. Tap-to-sound feel on phone speakers, wired and Bluetooth (latency cannot be removed; the engine adds none).
2. The iPhone silent switch (it mutes Web Audio silently; the visuals must carry the experience).
3. Warm bass on phone speakers (the band-energy check is a proxy).
4. Locking mid-hum, a call, an app switch: nothing restarts on its own.
5. Two thumbs on two Mallows; a pinch on a ~100 px duet body at 320 px (press-down, S and Bass are equivalent).
6. A low-end Android on the low tier: duet frame rate and replay steadiness (two soft bodies and a realm).
7. VoiceOver and TalkBack: labels, how much is announced, sheet focus.
8. A listening pass per Mallow, especially Zuzu duets, stretch and press-down.

Change requests to the lead (scratchpad `cr-hushbeat.md`): CR-H1–H5 landed (`ctx.openTune`, `openSheet`'s
`onClose`, the closing scrim, the Done band, the shared stage focus frame); Hushbeat's shims for them are gone.
CR-H6 and CR-H7 landed too: stage-screen lets a held H or S go on a window blur, and keys with Ctrl, Alt or Cmd
(Escape aside) never reach a screen's keys or the built-ins. Open for a later phase: the gesture engine should start
a squeeze only when the second finger is on the body (CR-H8; Hushbeat handles it itself), and an optional height
for the automatic stroke (CR-H9).
