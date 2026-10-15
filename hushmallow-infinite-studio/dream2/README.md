# dream2/ — the Cinematic Emotion Engine stage (v2)

The stage behind **"Feel Something?" v2** (`videos/feel-something-v2.js`). It renders a
projected, layered Hushfold world with all seven Mallows acting. `dream/` (v1) is kept
unchanged, so the approved v1 sample still re-renders identically.

| File | What it is |
|---|---|
| `camera.js` | Pinhole camera over the mirror lake (`project`, `onWater`): every layer and character sits at a real depth, so camera moves give true parallax |
| `glsl.js` | Sky (gradient, aurora curtains, moon, two lit cloud banks, light shafts, pearl hills), lake (mirror reflections, swell, ripple rings, glitter path, mist), Mallow mesh shader (relit approved art, soft focus by depth, haze, feeling-light spill, reflection pass), compose |
| `renderer.js` | Per frame: sky (½ res) → reflections (½ res) → lake → refraction source → sub-frames of the moving foreground → compose → bloom → approved v2 post + type |
| `living.js` | The six companions through the app's own approved rig (`hushmallow/src/mallows/rig.js`): their real faces and the app's expression presets filtered by each personality, driven deterministically by time (expression timelines, gaze, blinks, Zuzu's spiral spin) |
| `stage.js`, `main.js`, `index.html` | The page and frame model (sub-frame motion blur; `preview=1`; `motion=reduced`) |

## Render

```bash
# fast preview: half resolution, ≤ 2 motion-blur samples
node tools/render-dream.mjs --stage dream2 --direction feel-something-v2 --preview --scale 0.5 --crf 23 --out <dir>
# final: full resolution, adaptive motion blur (2–10 samples)
node tools/render-dream.mjs --stage dream2 --direction feel-something-v2 --workers 2 --crf 16 --out <dir>
# reduced-motion cut (a third of the camera travel, slower drift, smaller hops)
node tools/render-dream.mjs --stage dream2 --direction feel-something-v2 --motion reduced --workers 2 --out <dir2>
# stills / cue log
node tools/render-dream.mjs --stage dream2 --direction feel-something-v2 --stills 0,8.8s --out <dir>
node tools/render-dream.mjs --stage dream2 --direction feel-something-v2 --dry --out <dir>
```

## Score (synthesised in code; no samples, no paid services)

```bash
node audio/score-feel-v2.mjs <dir>/cues.json <dir>     # → score.wav + stems/{music,rhythm,sfx,bed}.wav
python3 -I tools/audio-review.py <dir> <dir>/cues.json  # objective review: arc, bands, stereo, harmony, sync
```

## Finish and QA

```bash
python3 -I tools/qa-dream2.py <dir> feel-something-v2 --reduced <dir2>   # mux + mobile spec, decode, audio, loop, localised flash, motion gates
node tools/playback-check.mjs <dir>/feel-something-v2.proxy.webm out.json # real browser playback on an emulated phone (VP9/Opus proxy)
node tools/determinism-dream2.mjs out.json 0.5                          # same frames, opposite render orders → identical pixels
```

Python dependencies: `requirements-python.txt`.

## Determinism

Every state is a pure function of time. The rig's springs, timers and random blinks are
bypassed; Noomi's face uses `Face.render()` (scratch canvas cleared each time); the mirrored
orbs refract this frame's sky. `tools/determinism-dream2.mjs` checks this.

## v3 additions (feel-something-v3; all opt-in, v2 renders pixel-identical)

- **Hi-res companions** — `new LivingMallow(id, { q: 2.5, hires: true })` paints the rig from
  `assets/companions/<id>/` (made by `tools/derive_companions_hires.py` from the owner-supplied
  1254 px art, registered onto the rig's frame). Each hi-res image reports its rig-frame size as
  `width`/`height`, so the rig's sprite maths is untouched; the skin context draws a two-argument
  `drawImage` of one at that logical size. Loomi's painting has a different resting face from the
  rig's, so the rest-pose cross-fade is off for Loomi. Check: `dream2/dev/rig-sheet-hires.html`
  (`node tools/shot.mjs hushmallow-infinite-studio/dream2/dev/rig-sheet-hires.html out.png 3000 1800`).
- **Depth of field** — `post.bgDof` (0..1) mixes the softened background (the ¼-res blur the orbs
  already refract) under the characters in close shots.
- **Per-frame acting** — `LivingMallow.mod = (t, P) => …` adjusts the rig parameters on top of the
  expression timeline (Blubi talking); still a pure function of t.

```bash
node tools/render-dream.mjs --stage dream2 --direction feel-something-v3 --scale 0.5 --preview --out <dir>   # draft (~8 min)
node tools/render-dream.mjs --stage dream2 --direction feel-something-v3 --out <dir>                         # final
node audio/score-feel-v3.mjs <dir>/cues.json <out> --treatment t1|t2|t3    # → score.wav + stems/{pads,lead,rhythm,sfx,bed}.wav
python3 -I tools/audio-review.py <out> <dir>/cues.json --profile v3         # arc, bands, stereo, harmony, sync, phone speaker
```
