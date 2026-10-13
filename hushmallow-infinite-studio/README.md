# hushmallow Infinite Studio — Phase 1: Video 1

**"My Brain at 2 AM"**: 15 s · 1080 × 1920 (9:16) · 30 fps · H.264 + AAC

This folder holds **one** fully rendered short and the source that reproduces it
exactly. It is the approval gate before any generator is built. There is no
dashboard, no batch mode and no "infinite engine" here yet.

| File | What it is |
|---|---|
| `output/my-brain-at-2am.mp4` | **The deliverable**: H.264 High 4.2, yuv420p, BT.709, 1080×1920, 30 fps, 450 frames, 15.000 s; AAC 48 kHz stereo 192 kb/s; faststart; −16 LUFS integrated, −1.8 dBTP true peak; the source commit is stamped in its metadata |
| `output/poster.jpg` | A still from 5.0 s (the three thoughts) |
| `output/my-brain-at-2am.soundtrack.wav` | The mixed soundtrack (48 kHz / 24-bit) |
| `output/cues.json` | Every timed story event plus the per-frame curves the soundtrack is built from |
| `output/qa/` | `verify.json` (delivery spec, all checks pass), `audio-report.json` (loudness and per-cue sync: every hit within 6.6 ms of its frame), `audio-waveform.png`, `storyboard-contact-sheet.jpg` |

## What you're looking at

Nothing in the video is a stock animation or a generic character:

* **Noomi is the app's own living Mallow rig** (`hushmallow/src/mallows/rig.js`),
  drawn from the approved artwork (`hushmallow/assets/mallows/noomi.png` and the
  face-cleaned `assets/rig/noomi-body.png`). Its eyes, lids, brows, mouth and
  cheeks are animated by the rig's spring system. Its soft body squashes,
  stretches, bulges and wobbles through the rig's strip-warp physics. Whenever
  the face is at rest, the rig cross-fades back to the untouched approved art.
* **The world is Noomi's own realm, the Moonmilk Cove**
  (`hushmallow/src/world/realms/moonmilk-cove.js`): moon, lighthouse, tide,
  clouds, aurora and dream bubbles. Its mood axes (agitation, heaviness,
  clarity, warmth) and its "transform" are driven by the story.
* **The sound is the app's own procedural audio engine**
  (`hushmallow/src/engine/audio.js`): Noomi's sound kit plus the Moonmilk Cove
  ambience, rendered offline and layered with original synthesised textures.
  No samples, no music library, no paid services.
* **Type** is Fredoka, the app's display face (SIL OFL, `hushmallow/assets/fonts`).
  The **logo** is the approved wordmark, untouched, on a soft light "pillow"
  plate. The approved file is black-on-white and no reversed version exists, so
  it isn't inverted.

The live app is **not modified**. Every engine file is imported read-only from
`../hushmallow/`, and nothing in this folder ships with the Pages deploy (it
only publishes `hushmallow/`).

## Regenerate it

Requirements: Node 22+, ffmpeg 6+ (with libx264 and AAC). Chromium comes with Playwright.

```bash
cd hushmallow-infinite-studio
npm install                      # Playwright 1.56.1
npx playwright install chromium  # skip if a matching Chromium is already installed
node render/render.mjs           # → output/my-brain-at-2am.mp4  (≈5 min on 4 cores)
```

Useful variations:

```bash
node render/render.mjs --stills 0,54,3.5s,10s   # PNG stills only → output/stills/
node render/render.mjs --dry                    # cue log only → output/cues.json
node render/render.mjs --no-audio               # video track only
node render/render.mjs --remux                  # new soundtrack from cues.json, muxed onto the existing video pass (~6 s)
node render/verify.mjs output/my-brain-at-2am.mp4   # spec + playback + loudness + freshness checks
node audio/soundtrack.mjs output/cues.json output/my-brain-at-2am.soundtrack.wav
node render/serve.mjs                           # open the stage in a browser (add &play=1)
```

Renders are deterministic: the same seed (`--seed`, default `20261013`) gives
the same frames.

## How it works

```
render/render.mjs
  ├─ render/serve.mjs              static server rooted at the repo (engines load read-only)
  ├─ headless Chromium → stage/index.html?video=my-brain-at-2am
  │    stage/components/clock.js   virtual time, seeded randomness, parked rAF (load first)
  │    stage/stage.js              per frame: direct → simulate → compose → PNG
  │      ├─ realm-backdrop.js      Moonmilk Cove, stepped with realm.debug.frame(dt)
  │      ├─ mallow-actor.js        MallowRig subclass: hi-res face skin, directed gaze/blinks,
  │      │                         pose() raw params, impulse() soft-body kicks, anchors
  │      ├─ thought-bubbles.js     pop → read → accelerating orbit → dissolve into star dust
  │      ├─ captions.js            Fredoka captions, ink outline, gentle reveals
  │      ├─ endcard.js             approved logo on a pillow plate + hushmallow.com
  │      ├─ bokeh.js               foreground out-of-focus orbs (parallax depth)
  │      └─ grade.js               bloom, scene grade, moon glow, vignette, grain
  │    videos/my-brain-at-2am.js   the direction: beats, poses, gaze, camera, grade, cues
  ├─ ffmpeg  PNG frames → libx264 (CRF 17, yuv420p, BT.709)
  ├─ audio/soundtrack.mjs          cues.json → offline Web Audio render → loudness-normalised WAV
  └─ ffmpeg  mux → AAC 192 kb/s, faststart
```

The stage, the components and the cue-driven soundtrack are written to be
reused. A new video is a new file in `videos/` with its own `meta`, `setup`,
`direct` and `substep`. Turning that into an automated generator is Phase 2,
pending approval.

## Sound

All sound is original and procedural: Noomi's own sound kit and the Moonmilk
Cove ambience from the app's audio engine, rendered offline. A few synthesised
textures are layered on top. There's no music bed, only story sound:

* night ambience (waves, a warm hum), soft crickets, and a quiet wooden
  tick-tock that comes back during the overthinking and speeds up with it
* a delicate music-box twinkle when the memory arrives, a "pip?" when one eye
  cracks open, then the comedic take: a cartoon eye-pop, Noomi's surprise
  glide and a tiny boing, with "bip… bip" for the double blink
* thought-bubble "bloops" (tail-dot blips first), higher blips for the minis,
  and a swirl that follows the actual orbit, panned with each passing thought
* one deep breath: Noomi's breathe-in, then a longer breathe-out with a sigh
* glassy chimes and star-dust sparkles as the thoughts dissolve, under a warm
  pad that opens with the light
* a satisfying squish (a squelch and the squeeze glide) and an elastic release
  (a stretch pop, a jelly boing and the release glide)
* a content glide when the eyes open, a celesta tink for the sleepy blink, and
  Noomi's success chime as the logo lands, fading to silence at 15.0 s

## Beat sheet

| Time | Beat |
|---|---|
| 0–1 s | Sleepy Noomi on the moonlit shore (the approved face, slow visible breathing, a drifting "z"); **ME TRYING TO SLEEP AT 2 AM...** is already on the cover frame |
| 0.97 s | A tiny twinkle above Noomi's head: the memory arrives |
| 1.09 s | Still asleep, the smile falls and the brows knit |
| 1.27 s | One eye cracks open |
| 1.55 s | **Eyes snap wide open**: a gasp, a jolt and stretch, a big "!", camera punch-in with shake |
| 1.9–2.75 s | Deadpan stare, then a comic "blink… blink" and a suspicious side-glance |
| 3.05–4.4 s | Three thoughts pop out of Noomi's head (tail dots first, words after the bubble lands). Eyes chase each one, flinches, sweat drop |
| 4.35 s | The hook caption clears for the spiral |
| 5.0–7.0 s | Glyph minis join. The thoughts spiral faster and faster. Eye darts, panting, a soft-body shiver, a wide wobbly grimace. Camera roll, a darker and colder grade, the cove's mist rolls in |
| 7.0 s | Noomi closes its eyes |
| 7.15–8.35 s | **One deep inhale**: fills with air, stretches tall, brows lift, the camera leans in, the thoughts slow and drift away |
| 8.55–10.35 s | **A long sighing exhale**: squishes wide, the camera opens out. A ring of calm rolls out and blows each thought into glowing dust as it reaches it. The tide ripples and stills, the aurora unfurls, the moonlight turns warm |
| 10.35–10.95 s | **Squeeze-and-release**: a soft squash, then an elastic stretch and jelly settle |
| 11.45 s | The approved face dissolves into open eyes: soft happy crescents and a tiny smile |
| 12.05 s | Slow sleepy blink. **Give your feelings somewhere soft to land.** |
| 12.95 s | The hushmallow logo pillow and **hushmallow.com** land and hold to the end |
| 13.6–15 s | A drowsy droop, then Noomi falls back asleep. The final framing and pose match frame 0, so the clip loops |

## Review process

The render went through a six-lens review panel (character fidelity,
animation craft, typography and brand, cinematography, story and comedy,
technical artifacts). Every finding was checked against cited frames and
fixed in the source. The soundtrack went through its own build, adversarial
QA and refine pass. `render/verify.mjs` re-checks the delivery spec on every
render and refuses a file that is older than its sources.
