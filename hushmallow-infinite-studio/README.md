# hushmallow Infinite Studio — Phase 1: Video 1

**"My Brain at 2 AM"**: 15 s · 1080 × 1920 (9:16) · 30 fps · H.264 + AAC

This folder holds **one** fully rendered short and the source that reproduces it
exactly. It is the approval gate before any generator is built. There is no
dashboard, no batch mode and no "infinite engine" here yet.

| File | What it is |
|---|---|
| `output/my-brain-at-2am.mp4` | **The deliverable**: H.264 High, yuv420p, BT.709, AAC 48 kHz stereo, faststart |
| `output/cues.json` | Every timed story event plus the per-frame audio curves the soundtrack is built from |
| `output/my-brain-at-2am.soundtrack.wav` | The mixed soundtrack (48 kHz / 24-bit) |

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

## Beat sheet

| Time | Beat |
|---|---|
| 0–1.8 s | Sleepy Noomi on the moonlit shore (approved face, slow breathing, a drifting "z"); **ME TRYING TO SLEEP AT 2 AM...** |
| 1.48 s | A tiny twinkle: the memory arrives |
| 1.80 s | **Eyes snap wide open**: jolt and stretch, "!", camera punch-in with shake |
| 2.30 / 2.47 s | Comedic double blink, then a suspicious side-glance |
| 3.05–4.6 s | Three thoughts pop out of Noomi's head (tail dots first). Noomi's eyes chase each one. Worry, then sweat |
| 5.0–7.0 s | The minis join. The thoughts orbit faster and faster. Eyes dart, the body trembles, the camera rolls, the cove gets agitated, the vignette closes in |
| 7.0 s | Noomi closes its eyes |
| 7.2–8.7 s | **One huge inhale**: stretches tall and rises, brows lift. The thoughts slow down and drift away |
| 8.7–9.0 s | Puffed-cheek pause (a beat, not a breath-hold cue) |
| 9.0–10.2 s | **Long exhale**: squishes wide with jelly wobble. A circle of calm rolls out, the tide ripples, the thoughts dissolve into glowing dust. The cove stills, the aurora unfurls, the light turns warm |
| 10.3 / 10.48 s | **Squash-and-release**: flat squish, tall stretch, elastic settle |
| 11.3 s | Eyes open halfway with a tiny peaceful smile |
| 12.3 s | Small sleepy blink. **Give your feelings somewhere soft to land.** |
| 13.4 s | Logo pillow and **hushmallow.com** land |
| 13.95–15 s | Noomi drifts back to sleep. The final pose matches frame 0, so the clip loops softly |
